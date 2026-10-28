(() => {
  'use strict';
  // V3 aerodb — lecteur XML par balises, en flux, SANS DOMParser (absent d'un Worker) : brique gardée du laboratoire des
  // données (mesures P0 de docs/technique/V3_APP_DONNEES.md, 26-28 octobre 2026) pour le futur module Données (D5), qui
  // construira la base sur le téléphone ; frame/aerodb/SPEC.md § 5 sexies. Banc : test/xml_stream.html. Ce n'est PAS un analyseur XML
  // complet : une machine d'états qui suit la profondeur des balises (commentaires, instructions, CDATA sautés), compte
  // les éléments au niveau des enregistrements et ne fait lire en entier que les blocs utiles, avec les
  // mêmes règles que les lecteurs de la page :
  //   · XML_SIA (shared/sia_base.js parseXmlSiaAirspaces, parseXmlSiaVfrPoints) : <Espace> de <EspaceS>, <Partie> de
  //     <PartieS> (contours « lat,lon »), <NavFix> de type VFR de <NavFixS> ; les autres enregistrements sont comptés ;
  //   · AIXM 4.5 (SiaAero.parseAixm, parseAixmObstacles, parseAixmAirspaces) : Ahp (aérodromes), Vor / Dme / Tcn / Ndb /
  //     Ils (balises, fusionnées comme SiaAero), Dpn (points), Obs (obstacles, maximum par cellule de 1°), Ase + Abd
  //     (espaces : sommets et cercles, SANS développer les arcs) ; les autres enregistrements sont comptés.
  // Le texte arrive par tranches (push) : un bloc coupé entre deux tranches est gardé jusqu'à sa fermeture, la mémoire
  // retenue est celle du plus grand bloc, pas celle du fichier.
  // API : AeroXmlStream.create(kind) → { push(texte), end() → résultat, stats() } ; kind : 'sia' (XML_SIA) ou 'aixm' ;
  //   AeroXmlStream.sniff(octets) → encodage déclaré ; AeroXmlStream.pump(flux d'octets, lecteur, { encoding, onBytes, signal }).
  const tag = (b, t) => {
    const i = b.indexOf(`<${t}>`);
    if (i < 0) return '';
    const s = i + t.length + 2,
      e = b.indexOf(`</${t}>`, s);
    return e < 0 ? '' : b.slice(s, e).trim();
  };
  /** Contenu jusqu'au chevron suivant de la première balise <t> du bloc (comme `val` de parseXmlSiaAirspaces). */
  const val = (b, t) => {
    const i = b.indexOf(`<${t}>`);
    if (i < 0) return '';
    return b.slice(i + t.length + 2, b.indexOf('<', i + t.length + 2)).trim();
  };
  /** Coordonnée AIXM « 481530N » ou décimale « 47.46654728N » (SiaAero) → degrés. */
  function dms(v) {
    v = String(v || '').trim();
    if (!v) return NaN;
    const h = v.slice(-1).toUpperCase(),
      raw = v.slice(0, -1),
      deg = h === 'E' || h === 'W' ? 3 : 2;
    let x;
    if (raw.split('.')[0].length <= deg) x = +raw;
    else x = +raw.slice(0, deg) + +raw.slice(deg, deg + 2) / 60 + +raw.slice(deg + 2) / 3600;
    return h === 'S' || h === 'W' ? -x : x;
  }
  /** Coordonnée AIXM de parseAixmAirspaces / parseAixmObstacles (sia_base.js aixmDms : NaN pour la forme décimale). */
  function aixmDms(value, isLat) {
    value = (value || '').trim();
    if (!value) return NaN;
    const hemi = value.slice(-1).toUpperCase(),
      parts = value.slice(0, -1).split('.'),
      digits = parts[0],
      degLen = isLat ? 2 : 3;
    if (digits.length < degLen + 4) return NaN;
    const deg = +digits.slice(0, degLen),
      min = +digits.slice(degLen, degLen + 2),
      sec = +digits.slice(degLen + 2, degLen + 4) + (parts[1] ? +('0.' + parts[1]) : 0);
    return (hemi === 'S' || hemi === 'W' ? -1 : 1) * (deg + min / 60 + sec / 3600);
  }
  const geo = b => ({
    lat: dms(tag(b, 'geoLat')),
    lon: dms(tag(b, 'geoLong'))
  });
  const noOrg = b => b.replace(/<OrgUid[\s\S]*?<\/OrgUid>/, '');
  /** Nombre de points qu'ajoute le développement d'un arc (expandAixmArc de shared/sia_base.js, sans les construire). */
  function arcPoints(start, end, center, clockwise) {
    const cos = Math.cos(center[0] * Math.PI / 180),
      angle = p => Math.atan2(p[0] - center[0], (p[1] - center[1]) * cos);
    let delta = angle(end) - angle(start);
    if (clockwise) {
      while (delta >= 0) delta -= Math.PI * 2;
    } else
      while (delta <= 0) delta += Math.PI * 2;
    return Math.max(3, Math.ceil(Math.abs(delta) * 12)) - 1;
  }
  const AIXM_TYPES = new Set(['R', 'D', 'P', 'CTR', 'TMA', 'CTA', 'TRA', 'SUR', 'PRN']);

  // ------------------------------------------------------------------------------------------ la machine d'états
  /** Machine : opts.countDepth (profondeur des enregistrements comptés), opts.want(nom, profondeur, parent) → vrai pour
   *  lire le bloc en entier, opts.onBlock(nom, texte), opts.onCount(nom, parent). Racine = profondeur 1. */
  function machine(opts) {
    let buf = '',
      pos = 0,
      depth = 0,
      cap = null,
      tags = 0,
      peak = 0; // plus grand texte retenu
    const stack = [];

    function run() {
      let i = pos;
      for (;;) {
        const lt = buf.indexOf('<', i);
        if (lt < 0) {
          i = buf.length;
          break;
        }
        const c = buf.charCodeAt(lt + 1);
        if (c !== c) { // fin de tranche juste après « < » : la suite arrive
          i = lt;
          break;
        }
        if (c === 33) { // <!-- … -->, <![CDATA[ … ]]>, <!DOCTYPE …>
          let end, len;
          if (buf.startsWith('<!--', lt)) {
            end = buf.indexOf('-->', lt + 4);
            len = 3;
          } else if (buf.startsWith('<![CDATA[', lt)) {
            end = buf.indexOf(']]>', lt + 9);
            len = 3;
          } else {
            end = buf.indexOf('>', lt + 2);
            len = 1;
          }
          if (end < 0) {
            i = lt;
            break;
          }
          i = end + len;
          continue;
        }
        if (c === 63) { // <? … ?>
          const end = buf.indexOf('?>', lt + 2);
          if (end < 0) {
            i = lt;
            break;
          }
          i = end + 2;
          continue;
        }
        const gt = buf.indexOf('>', lt + 1);
        if (gt < 0) {
          i = lt;
          break;
        }
        if (c === 47) { // fermeture
          if (cap && depth === cap.depth) {
            const name = stack[stack.length - 1];
            const text = buf.slice(cap.start, gt + 1);
            cap = null;
            opts.onBlock(name, text);
          }
          depth--;
          stack.pop();
          i = gt + 1;
          continue;
        }
        let ne = lt + 1;
        while (ne < gt) {
          const ch = buf.charCodeAt(ne);
          if (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 47) break;
          ne++;
        }
        const name = buf.slice(lt + 1, ne),
          selfClosed = buf.charCodeAt(gt - 1) === 47,
          parent = stack[stack.length - 1] || '';
        depth++;
        tags++;
        if (depth === opts.countDepth) opts.onCount(name, parent);
        if (!cap && opts.want(name, depth, parent)) {
          if (selfClosed) opts.onBlock(name, buf.slice(lt, gt + 1));
          else cap = {
            depth,
            start: lt
          };
        }
        if (selfClosed) depth--;
        else stack.push(name);
        i = gt + 1;
      }
      pos = i;
      const keep = cap ? Math.min(cap.start, pos) : pos;
      if (keep > 0) {
        buf = buf.slice(keep);
        pos -= keep;
        if (cap) cap.start -= keep;
      }
      if (buf.length > peak) peak = buf.length;
    }
    return {
      push(chunk) {
        buf += chunk;
        run();
      },
      stats: () => ({
        tags,
        peakChars: peak,
        depth
      })
    };
  }

  // ------------------------------------------------------------------------------------------ XML_SIA
  function siaReader() {
    const esp = new Map,
      parts = [],
      vrp = [],
      counts = {};
    const m = machine({
      countDepth: 4,
      want: (name, depth, parent) => depth === 4 && (name === 'Espace' && parent === 'EspaceS' || name === 'Partie' && parent ===
        'PartieS' || name === 'NavFix' && parent === 'NavFixS'),
      onCount: name => void(counts[name] = (counts[name] || 0) + 1),
      onBlock(name, b) {
        if (name === 'Espace') {
          const k = /<Espace pk="(\d+)" lk="([^"]*)">/.exec(b);
          if (k) esp.set(k[1], {
            type: val(b, 'TypeEspace').toUpperCase(),
            name: val(b, 'Nom'),
            key: k[2]
          });
        } else if (name === 'Partie') {
          const i = b.indexOf('<Espace pk="');
          if (i < 0) return;
          const pk = b.slice(i + 12, b.indexOf('"', i + 12)),
            g = val(b, 'Geometrie');
          if (!g) return;
          const ring = [];
          for (const p of g.split(/\s+/)) {
            const k = p.indexOf(','),
              lat = +p.slice(0, k),
              lon = +p.slice(k + 1);
            if (k > 0 && Number.isFinite(lat) && Number.isFinite(lon)) ring.push([lat, lon]);
          }
          if (ring.length >= 2) parts.push([pk, ring]);
        } else if (name === 'NavFix') {
          if (!/<NavType>\s*VFR\s*<\/NavType>/.test(b)) return;
          const t = n => (new RegExp(`<${n}>([^<]*)</${n}>`).exec(b) || [])[1] || '',
            lat = parseFloat(t('Latitude')),
            lon = parseFloat(t('Longitude'));
          if (Number.isFinite(lat) && Number.isFinite(lon)) vrp.push({
            id: t('Ident').trim(),
            name: t('Description').trim().replace(/^VRP-\s*/i, ''),
            lat,
            lon
          });
        }
      }
    });
    return {
      push: m.push,
      stats: m.stats,
      end() {
        const out = new Map;
        for (const [pk, ring] of parts) {
          const e = esp.get(pk);
          if (!e) continue;
          (out.get(pk) || out.set(pk, {
            ...e,
            rings: []
          }).get(pk)).rings.push(ring);
        }
        return {
          kind: 'sia',
          airspaces: [...out.values()],
          vrp,
          counts
        };
      }
    };
  }

  // ------------------------------------------------------------------------------------------ AIXM 4.5
  function aixmReader() {
    const aerodromes = [],
      vors = [],
      dmes = [],
      tcns = [],
      ndbs = [],
      ils = [],
      counts = {},
      cells = {},
      ase = new Map,
      abd = [];
    let points = 0,
      obstacles = 0;
    const WANT = new Set(['Ahp', 'Vor', 'Dme', 'Tcn', 'Ndb', 'Ils', 'Obs', 'Dpn', 'Ase', 'Abd']);
    const uidId = (b, t) => new RegExp(`<${t}[^>]*>\\s*<codeId>([^<]+)`).exec(b)?.[1] || '';
    /** codeId de l'AseUid d'un bloc (DOM : txt(uid, 'codeId'), où qu'il soit dans l'AseUid). */
    const aseId = b => {
      const i = b.indexOf('<AseUid');
      return i < 0 ? '' : tag(b.slice(i, b.indexOf('</AseUid>', i)), 'codeId');
    };
    const m = machine({
      countDepth: 2,
      want: (name, depth) => depth === 2 && WANT.has(name),
      onCount: name => void(counts[name] = (counts[name] || 0) + 1),
      onBlock(name, raw) {
        const b = name === 'Abd' || name === 'Ase' ? raw : noOrg(raw);
        if (name === 'Ahp') {
          const nm = tag(b, 'txtName'),
            p = geo(b);
          if (Number.isFinite(p.lat) && !/CLOSED|FICTI/i.test(nm + tag(b, 'txtDescrRefPt') + tag(b, 'txtRmk'))) aerodromes.push({
            id: uidId(b, 'AhpUid'),
            icao: tag(b, 'codeIcao'),
            name: nm,
            ...p,
            elev: +tag(b, 'valElev') || 0,
            magVar: +tag(b, 'valMagVar') || 0
          });
        } else if (name === 'Vor') {
          const p = geo(b);
          if (Number.isFinite(p.lat)) vors.push({
            kind: 'VOR',
            mid: /<VorUid mid="(\d+)"/.exec(b)?.[1],
            id: uidId(b, 'VorUid'),
            name: tag(b, 'txtName'),
            ...p
          });
        } else if (name === 'Dme') {
          const p = geo(b);
          if (Number.isFinite(p.lat)) dmes.push({
            vor: /<VorUid mid="(\d+)"/.exec(b)?.[1],
            id: uidId(b, 'DmeUid'),
            ...p
          });
        } else if (name === 'Tcn') {
          const p = geo(b);
          if (Number.isFinite(p.lat)) tcns.push({
            id: uidId(b, 'TcnUid'),
            ...p
          });
        } else if (name === 'Ndb') {
          const p = geo(b);
          if (Number.isFinite(p.lat)) ndbs.push({
            kind: 'NDB',
            id: uidId(b, 'NdbUid'),
            ...p
          });
        } else if (name === 'Ils') {
          const z = /<Ilz>([\s\S]*?)<\/Ilz>/.exec(b)?.[1];
          if (z && Number.isFinite(geo(z).lat)) ils.push({
            kind: 'ILS',
            dme: /<DmeUid/.test(b)
          });
        } else if (name === 'Dpn') {
          if (Number.isFinite(geo(b).lat)) points++;
        } else if (name === 'Obs') {
          if (Number.isFinite(geo(b).lat)) obstacles++;
          const la = /<geoLat>([^<]+)<\/geoLat>/.exec(b),
            lo = /<geoLong>([^<]+)<\/geoLong>/.exec(b),
            el = /<valElev>([\d.]+)<\/valElev>/.exec(b),
            uom = /<uomDistVer>(\w+)<\/uomDistVer>/.exec(b);
          if (la && lo && el) {
            const lat = aixmDms(la[1], true),
              lon = aixmDms(lo[1], false),
              ft = +el[1] * (uom && /^M$/i.test(uom[1]) ? 3.28084 : 1);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              const k = Math.floor(lat) + '|' + Math.floor(lon);
              if (!(ft <= cells[k])) cells[k] = ft;
            }
          }
        } else if (name === 'Ase') {
          const mid = /<AseUid mid="([^"]*)"/.exec(b)?.[1];
          if (!mid) return;
          const raw = tag(b, 'codeType').toUpperCase(),
            local = tag(b, 'txtLocalType').toUpperCase();
          ase.set(mid, {
            type: raw === 'D-OTHER' && /SIV|FIS/.test(local) ? 'SIV' : raw === 'D-OTHER' && /^(SUR|PRN)$/.test(local) ? local :
              raw,
            name: tag(b, 'txtName') || aseId(b),
            key: aseId(b) || mid
          });
        } else if (name === 'Abd') {
          const mid = /<AseUid mid="([^"]*)"/.exec(b)?.[1];
          if (!mid) return;
          const vx = [];
          for (const a of b.matchAll(/<Avx>([\s\S]*?)<\/Avx>/g)) {
            const la = aixmDms(tag(a[1], 'geoLat'), true),
              lo = aixmDms(tag(a[1], 'geoLong'), false);
            if (Number.isFinite(la) && Number.isFinite(lo)) vx.push({
              pt: [la, lo],
              kind: tag(a[1], 'codeType').toUpperCase(),
              center: [aixmDms(tag(a[1], 'geoLatArc'), true), aixmDms(tag(a[1], 'geoLongArc'), false)]
            });
          }
          // points du contour : sommets + points des arcs (CWA / CCA, comme expandAixmArc, dont seul le nombre est calculé ici)
          let ringPoints = 0;
          vx.forEach((v, i) => {
            ringPoints++;
            if ((v.kind === 'CWA' || v.kind === 'CCA') && vx.length > 1 && Number.isFinite(v.center[0]) && Number.isFinite(v
                .center[1]))
              ringPoints += arcPoints(v.pt, vx[(i + 1) % vx.length].pt, v.center, v.kind === 'CWA');
          });
          let circle = 0;
          const c = /<Circle>([\s\S]*?)<\/Circle>/.exec(b)?.[1];
          if (c && !vx.length && Number.isFinite(aixmDms(tag(c, 'geoLatCen'), true)) && Number.isFinite(aixmDms(tag(c, 'geoLongCen'),
              false)) &&
            +tag(c, 'valRadius') > 0) circle = 72; // le cercle de parseAixmAirspaces : 72 points
          abd.push({
            mid,
            type: tag(b, 'codeType').toUpperCase(),
            codeId: aseId(b),
            n: ringPoints + circle,
            vertices: vx.length
          });
        }
      }
    });
    return {
      push: m.push,
      stats: m.stats,
      end() {
        // balises comme SiaAero.parseAixm : VOR, DME propres (un DME d'un VOR le marque), TACAN propres, NDB, ILS
        const byMid = new Map(vors.filter(v => v.mid).map(v => [v.mid, v])),
          near = (a, c) => Math.abs(a.lat - c.lat) < .02 && Math.abs(a.lon - c.lon) < .03,
          navaids = [...vors];
        for (const d of dmes) {
          const v = byMid.get(d.vor);
          if (v) v.dme = true;
          else navaids.push({
            kind: 'DME',
            ...d
          });
        }
        for (const t of tcns) {
          const v = navaids.find(n => n.kind === 'VOR' && n.id === t.id && near(n, t));
          if (v) v.tacan = true;
          else navaids.push({
            kind: 'TACAN',
            ...t
          });
        }
        navaids.push(...ndbs, ...ils);
        // espaces comme parseAixmAirspaces (types gardés, au moins 3 points ; arcs non développés)
        const grouped = new Map;
        for (const a of abd) {
          const meta = ase.get(a.mid) || {
            type: a.type,
            name: a.codeId,
            key: a.codeId || a.mid
          };
          if (!AIXM_TYPES.has(meta.type)) continue;
          if (a.n < 3 && !(/^(SUR|PRN)$/.test(meta.type) && a.n)) continue;
          const key = meta.type + '|' + a.mid;
          (grouped.get(key) || grouped.set(key, {
            ...meta,
            parts: 0,
            points: 0
          }).get(key)).parts++;
          grouped.get(key).points += a.n;
        }
        return {
          kind: 'aixm',
          aerodromes,
          navaids,
          points,
          obstacles,
          obstacleCells: cells,
          airspaces: [...grouped.values()],
          counts
        };
      }
    };
  }

  const create = kind => kind === 'aixm' ? aixmReader() : siaReader();
  /** Encodage déclaré par le prologue (« <?xml … encoding="ISO-8859-1"?> »), UTF-8 sinon. */
  function sniff(bytes) {
    const head = new TextDecoder('iso-8859-1').decode(bytes.subarray(0, 200)),
      m = /encoding\s*=\s*["']([\w.-]+)["']/i.exec(head);
    return m ? m[1].toLowerCase() : 'utf-8';
  }
  /** Lit un flux d'octets (ReadableStream) dans un lecteur, par tranches décodées en flux (un caractère coupé entre deux
   *  tranches est gardé par le décodeur). Retourne { bytes, chunks, encoding }. */
  async function pump(stream, reader, {
    encoding,
    onBytes,
    signal
  } = {}) {
    const rd = stream.getReader();
    let dec = null,
      bytes = 0,
      chunks = 0;
    for (;;) {
      if (signal?.aborted) {
        rd.cancel().catch(() => {});
        throw new DOMException('aborted', 'AbortError');
      }
      const {
        done,
        value
      } = await rd.read();
      if (done) break;
      if (!dec) {
        encoding = encoding || sniff(value);
        dec = new TextDecoder(encoding);
      }
      bytes += value.byteLength;
      chunks++;
      reader.push(dec.decode(value, {
        stream: true
      }));
      onBytes?.(bytes);
    }
    if (dec) reader.push(dec.decode());
    return {
      bytes,
      chunks,
      encoding
    };
  }
  const api = {
    create,
    sniff,
    pump,
    machine,
    dms,
    aixmDms
  };
  if (typeof window !== 'undefined') window.AeroXmlStream = api;
  else self.AeroXmlStream = api;
})();
