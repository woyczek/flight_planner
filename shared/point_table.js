(() => {
  'use strict';
  // « Coller un tableau de points » (générateur : étape Lieux du pas à pas, éditeur des données YAML) : un tableau collé
  // (tableur, Markdown, texte) devient des lieux de la mission, après un aperçu.
  //   · séparateur détecté : tabulation, « | » (tableau Markdown compris), « ; », sinon « , » ;
  //   · en-tête reconnu s'il est là (nom / name, lat / latitude, lon / longitude, coordonnées, type / rôle, temps /
  //     time_on_task, id), sinon colonnes dans l'ordre : nom, lat, lon, rôle ;
  //   · coordonnées : décimal (« 48.768 », « -1,734 »), DMS (« 48°46'05"N »), degrés et minutes (« N48 46.1 »,
  //     « E007 12.3 »), ou les deux dans une cellule (« 48°46'05"N 7°12'18"E ») ;
  //   · ligne sans coordonnées : nom cherché dans les lieux communs (PlaceSearch, correspondance exacte), sinon « à
  //     placer » (le lieu arrive sans coordonnées et compte dans les points à placer) ;
  //   · type ou rôle « cible », « zone », « rdv / rendez-vous » range la ligne à sa place, sinon point tournant ;
  //   · l'ordre des lignes devient l'ordre de route entre ORIGIN et DESTINATION (les autres lieux de la route suivent).
  // API (window.PointTable) : parse(texte) → { rows, sep, header } ; resolve(rows) → Promise ; apply(yaml, rows) →
  //   { added, ids } ; run(hôte, { yaml: () => objet YAML, onAdded(n) }) : saisie (AppFramework.askText), aperçu dans
  //   l'hôte, « Ajouter n points ».
  if (window.PointTable) return;
  const K = window.RepositoryKit,
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? ''),
    E = s => String(s ?? '').replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    } [c])),
    arr = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v],
    fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // ---- coordonnées
  /** Angle d'un texte : décimal, DMS ou degrés-minutes, hémisphère N S E W (O = ouest) devant ou derrière ; null sinon.
   *  axis : 'lat' ou 'lon' (hémisphère attendu), '' (indifférent). */
  function angle(text, axis = '') {
    let s = String(text ?? '').trim().toUpperCase().replace(/[’′]/g, "'").replace(/[”″]/g, '"').replace(/''/g, '"');
    if (!s) return null;
    let sign = 1,
      hemi = '';
    const h = /^([NSEWO])\s*|\s*([NSEWO])$/.exec(s);
    if (h) {
      hemi = h[1] || h[2];
      s = s.replace(/^[NSEWO]\s*|\s*[NSEWO]$/g, '').trim();
    }
    if (hemi === 'S' || hemi === 'W' || hemi === 'O') sign = -1;
    if (axis === 'lat' && /[EWO]/.test(hemi) || axis === 'lon' && /[NS]/.test(hemi)) return null;
    if (/^-/.test(s)) {
      sign = -sign;
      s = s.slice(1);
    }
    const nums = s.replace(/,/g, '.').split(/[°'"\s:]+/).filter(Boolean).map(Number);
    if (!nums.length || nums.some(n => !Number.isFinite(n))) return null;
    const v = nums[0] + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600;
    const max = axis === 'lat' || /[NS]/.test(hemi) ? 90 : 180;
    return v <= max ? +(sign * v).toFixed(6) : null;
  }
  /** Paire de coordonnées dans une cellule (« 48°46'05"N 7°12'18"E », « N48 46.1 E007 12.3 », « 48.77, 7.2 ») ; null. */
  function pair(text) {
    const s = String(text ?? '').trim().toUpperCase();
    if (!s) return null;
    let m = /^(.*?[NS])\s*[,;/]?\s*(.*[EWO])$/.exec(s) || /^([NS].*?)\s*[,;/]?\s*([EWO].*)$/.exec(s);
    if (m) {
      const la = angle(m[1], 'lat'),
        lo = angle(m[2], 'lon');
      if (la != null && lo != null) return {
        lat: la,
        lon: lo
      };
    }
    m = /^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/.exec(s);
    if (m) {
      const la = angle(m[1], 'lat'),
        lo = angle(m[2], 'lon');
      if (la != null && lo != null) return {
        lat: la,
        lon: lo
      };
    }
    return null;
  }

  // ---- tableau
  const HEAD = [
    ['id', /^(id|code|ident|identifiant)$/],
    ['name', /^(nom|name|libelle|lieu|point|place|nombre|ort)$/],
    ['lat', /^(lat|latitude|breite)$/],
    ['lon', /^(lon|lng|long|longitude|lange|laenge)$/],
    ['coord', /^(coord|coords|coordonnees|coordinates|position|coordenadas|koordinaten)$/],
    ['kind', /^(type|role|kind|categorie|tipo|typ|rolle)$/],
    ['task', /^(temps|time|time_on_task|time_on_task_min|duree|tot|minutes|min|tiempo|zeit)$/]
  ];
  /** Rangement d'une ligne d'après son type ou rôle : target, zone, rdv, sinon point. */
  const kindOf = v => {
    const k = fold(v);
    return /cible|target|objectif|ziel/.test(k) ? 'target' : /zone|area|zona/.test(k) ? 'zone' : /rdv|rendez|rendezvous|encuentro|treff/
      .test(k) ? 'rdv' : 'point';
  };
  /** Analyse un tableau collé : { rows: [{ id, name, lat, lon, kind, role, task, found }], sep, header }. */
  function parse(text) {
    let lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
    const md = lines.length && lines.every(l => l.startsWith('|'));
    if (md) lines = lines.map(l => l.replace(/^\||\|$/g, '')); // tableau Markdown : bords retirés
    lines = lines.filter(l => !/^[\s|:-]+$/.test(l));
    const sample = lines.slice(0, 5).join('\n'),
      sep = md || /\|/.test(sample) ? '|' : /\t/.test(sample) ? '\t' : /;/.test(sample) ? ';' : ',';
    const cells = lines.map(l => l.split(sep).map(c => c.trim()));
    // en-tête : une majorité de cellules reconnues dans la première ligne
    const first = cells[0] || [],
      map = first.map(c => HEAD.find(([, rx]) => rx.test(fold(c).replace(/[^a-z_]/g, '')))?.[0] || ''),
      header = map.filter(Boolean).length >= 2;
    const cols = header ? map : ['name', 'lat', 'lon', 'kind'];
    const rows = (header ? cells.slice(1) : cells).map(c => {
      const get = k => c[cols.indexOf(k)] ?? '';
      let lat = null,
        lon = null;
      const pc = pair(get('coord')) || pair(`${get('lat')} ${get('lon')}`) || pair(get('lat'));
      if (pc)({
        lat,
        lon
      } = pc);
      else {
        lat = angle(get('lat'), 'lat');
        lon = angle(get('lon'), 'lon');
        if (lat == null || lon == null) lat = lon = null;
      }
      // sans en-tête : une cellule de coordonnées seule à la place de lat (nom, « 48°46'N 7°12'E », rôle)
      let role = get('kind');
      if (!header && pair(get('lat')) && angle(get('lon'), 'lon') == null) role = get('lon') || role;
      return {
        id: String(get('id') || '').toUpperCase(),
        name: get('name'),
        lat,
        lon,
        kind: kindOf(role),
        role,
        task: Number.isFinite(parseFloat(get('task'))) ? parseFloat(get('task')) : null,
        found: lat != null ? 'table' : ''
      };
    }).filter(r => r.name || r.lat != null);
    return {
      rows,
      sep,
      header
    };
  }
  /** Lignes sans coordonnées : nom cherché dans les lieux communs (correspondance exacte seulement). */
  async function resolve(rows) {
    for (const r of rows) {
      if (r.lat != null || !r.name || !window.PlaceSearch) continue;
      const p = await window.PlaceSearch.lookup(r.name, {
        strict: true
      }).catch(() => null);
      if (p) {
        r.lat = +(+p.lat).toFixed(6);
        r.lon = +(+p.lon).toFixed(6);
        r.found = 'search';
      }
    }
    return rows;
  }
  /** Identifiant libre de préfixe prefix parmi used (PT3, ZONE-2, RDV-1…). */
  function freeId(prefix, used, dash = false) {
    for (let n = 1; n < 999; n++) {
      const id = `${prefix}${dash ? '-' : ''}${n}`;
      if (!used.has(id)) {
        used.add(id);
        return id;
      }
    }
    return prefix;
  }
  /** Ajoute les lignes à la mission (en place) ; l'ordre des lignes devient l'ordre de route. { added, ids }. */
  function apply(y, rows) {
    const used = new Set([y.target?.id, ...arr(y.turning_points).map(p => p.id), ...arr(y.zones).map(z => z.id), ...arr(y.rendezvous).map(
        r => r.id)].filter(Boolean).map(v => String(v).toUpperCase())),
      ids = [],
      pos = r => r.lat != null ? {
        lat: r.lat,
        lon: r.lon
      } : {
        lat: null,
        lon: null
      },
      cs = y.aircraft?.[0]?.callsign;
    let targetDone = false;
    for (const r of rows) {
      if (r.kind === 'target' && !targetDone) {
        targetDone = true;
        y.target = {
          ...(y.target || {}),
          id: y.target?.id || 'TARGET',
          name: r.name,
          ...pos(r),
          time_on_task_min: r.task ?? y.target?.time_on_task_min ?? 20
        };
        ids.push(y.target.id);
      } else if (r.kind === 'zone') {
        const id = r.id && !used.has(r.id) ? (used.add(r.id), r.id) : freeId('ZONE', used, true);
        y.zones = [...arr(y.zones), {
          id,
          name: r.name,
          kind: 'mission',
          centre: pos(r),
          radius_km: 10,
          role: r.role || 'zone de travail',
          time_on_task_min: r.task ?? 30
        }];
        ids.push(id);
      } else if (r.kind === 'rdv') {
        const id = r.id && !used.has(r.id) ? (used.add(r.id), r.id) : freeId('RDV', used, true);
        y.rendezvous = [...arr(y.rendezvous), {
          id,
          name: r.name,
          ...pos(r),
          participants: cs ? [cs] : [],
          role: r.role || 'jonction',
          time_on_task_min: r.task ?? 10
        }];
        ids.push(id);
      } else {
        const id = r.id && !used.has(r.id) ? (used.add(r.id), r.id) : freeId('PT', used);
        y.turning_points = [...arr(y.turning_points), {
          id,
          name: r.name,
          ...pos(r),
          role: r.role || '',
          time_on_task_min: r.task ?? 0
        }];
        ids.push(id);
      }
    }
    const middle = arr(y.route_order).map(v => String(v).toUpperCase()).filter(v => v !== 'ORIGIN' && v !== 'DESTINATION' && !ids
      .includes(
        v));
    y.route_order = ['ORIGIN', ...ids, ...middle, 'DESTINATION'];
    return {
      added: ids.length,
      ids
    };
  }
  const KIND = {
    target: ['cible', 'target', 'Zielobjekt', 'objetivo'],
    zone: ['zone', 'zone', 'Zone', 'zona'],
    rdv: ['rendez-vous', 'rendezvous', 'Treffpunkt', 'encuentro'],
    point: ['point tournant', 'turning point', 'Wendepunkt', 'punto de viraje']
  };
  /** Saisie (fenêtre du socle), aperçu dans host, puis ajout sur « Ajouter n points » (onAdded(n) ensuite). */
  async function run(host, {
    yaml,
    onAdded
  } = {}) {
    const text = await window.AppFramework?.askText?.(t([
      'Collez le tableau (tableur, Markdown ou texte) : une ligne par lieu ; colonnes nom, lat, lon, type (cible, zone, rdv, point) ou un en-tête.',
      'Paste the table (spreadsheet, Markdown or text): one line per place; columns name, lat, lon, type (target, zone, rdv, point) or a header.',
      'Tabelle einfügen (Tabellenkalkulation, Markdown oder Text): eine Zeile pro Ort; Spalten Name, Breite, Länge, Typ (Ziel, Zone, Treffpunkt, Punkt) oder eine Kopfzeile.',
      'Pegue la tabla (hoja de cálculo, Markdown o texto): una línea por lugar; columnas nombre, lat, lon, tipo (objetivo, zona, encuentro, punto) o un encabezado.'
    ]), {
      multiline: true,
      placeholder: 'Pont-Réan\t47.998\t-1.787\tpoint',
      ok: t(['Analyser', 'Analyse', 'Analysieren', 'Analizar'])
    });
    if (!text || !host) return;
    const {
      rows
    } = parse(text);
    await resolve(rows);
    const unresolved = rows.filter(r => r.lat == null).length;
    host.innerHTML = rows.length ? `<table class="mg-table pt-preview"><thead><tr><th>${E(t(['Nom', 'Name', 'Name', 'Nombre']))}</th><th>${E(t(['Coordonnées trouvées', 'Coordinates found', 'Gefundene Koordinaten', 'Coordenadas encontradas']))}</th><th>${E(t(['Rangé comme', 'Filed as', 'Abgelegt als', 'Clasificado como']))}</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${E(r.name || '—')}</td><td>${r.lat != null ? `${r.lat}, ${r.lon}${r.found === 'search' ? ` <small>(${E(t(['lieu connu', 'known place', 'bekannter Ort', 'lugar conocido']))})</small>` : ''}` : '—'}</td><td>${E(t(KIND[r.kind]))}</td><td>${r.lat == null ? `<b>${E(t(['à placer', 'to place', 'zu setzen', 'por colocar']))}</b>` : ''}</td></tr>`).join('')}</tbody></table>
      <p class="small">${E(t(['L’ordre des lignes devient l’ordre de route entre le départ et l’arrivée.', 'The order of the lines becomes the route order between departure and arrival.', 'Die Reihenfolge der Zeilen wird zur Routenreihenfolge zwischen Abflug und Ankunft.', 'El orden de las líneas pasa a ser el orden de ruta entre la salida y la llegada.']))}${unresolved ? ' ' + E(tf(['{n} lieu(x) sans coordonnées : ajouté(s) à placer (studio, ou nom à préciser).', '{n} place(s) without coordinates: added to place (studio, or name to refine).', '{n} Ort(e) ohne Koordinaten: zum Setzen hinzugefügt (Studio oder Namen präzisieren).', '{n} lugar(es) sin coordenadas: añadido(s) por colocar (estudio, o nombre por precisar).'], { n: unresolved })) : ''}</p>
      <p class="mg-row"><button type="button" class="primary" data-pt-add>${E(tf(['Ajouter {n} points', 'Add {n} points', '{n} Punkte hinzufügen', 'Añadir {n} puntos'], { n: rows.length }))}</button> <button type="button" class="secondary" data-pt-cancel>${E(t(['Annuler', 'Cancel', 'Abbrechen', 'Cancelar']))}</button></p>` : `<p class="mg-warn">${E(t(['Aucune ligne reconnue : une ligne par lieu, au moins un nom ou des coordonnées.', 'No line recognised: one line per place, at least a name or coordinates.', 'Keine Zeile erkannt: eine Zeile pro Ort, mindestens ein Name oder Koordinaten.', 'Ninguna línea reconocida: una línea por lugar, al menos un nombre o coordenadas.']))}</p>`;
    host.querySelector('[data-pt-cancel]')?.addEventListener('click', () => {
      host.innerHTML = '';
    });
    host.querySelector('[data-pt-add]')?.addEventListener('click', () => {
      const y = yaml?.();
      if (!y) return;
      const r = apply(y, rows);
      host.innerHTML = '';
      onAdded?.(r.added, unresolved);
    });
  }
  window.PointTable = {
    angle,
    pair,
    parse,
    resolve,
    apply,
    run
  };
})();
