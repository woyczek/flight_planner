/* aerodb — procédures (SID, STAR, approches) : schéma commun, lecture d'un OFP SimBrief, fusion des sources.
   Code pur (ni DOM, ni réseau, ni texte d'interface) ; aerodb.js le charge à la première demande et lui donne les
   fichiers à lire (SPEC § 5 quinquies). Définit window.AeroDBProcedures. */
(() => {
  'use strict';
  if (window.AeroDBProcedures) return;
  /** Précédence des statuts : officiel > à vérifier > vu dans un OFP (source secondaire, jamais prioritaire) > repli X-Plane
   *  (proc/local/, le poste seulement) > lecture douteuse (`doubt` : sans nom, point répété, zigzag, ligne non lue, géométrie… ; la raison est
   *  un code dans `doubt`, SPEC § 5 quinquies) : jamais devant une autre lecture, et servie seulement sur demande (`{ doubt: true }`). */
  const RANK = {
      official: 0,
      check: 1,
      ofp: 2,
      xplane: 3,
      lnm: 3,
      doubt: 4
    },
    KINDS = ['SID', 'STAR', 'APP'],
    // SimBrief écrit {} (objet vide) pour un champ absent : seule une chaîne ou un nombre compte
    str = v => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').trim(),
    num = v => (v === '' || v == null || !Number.isFinite(+v) ? null : +v),
    /** Nom comparable : majuscules, sans espace ni tiret. */
    norm = v => str(v).toUpperCase().replace(/[\s-]+/g, ''),
    /** « 23 », « RW23L », « 05R » → « 23 », « 23L », « 05R » ; '' sans piste. */
    runwayOf = v => str(v).toUpperCase().replace(/^RW(Y)?\s*/, '').replace(/\s+/g, '');
  const arr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);

  /** Identifiant stable d'une procédure : OACI.TYPE.NOM.PISTE.TRANSITION (RWALL sans piste). */
  function idOf(icao, kind, name, runways, transition) {
    const r = runways && runways.length === 1 ? `RW${runways[0]}` : 'RWALL';
    return [icao, kind, norm(name) || 'NONAME', r, norm(transition)].join('.').replace(/\.$/, '');
  }

  /** Procédure d'un OFP SimBrief (une SID ou une STAR) : points du navlog marqués is_sid_star, nom et transition de
   *  `general`, piste du plan. null sans point. */
  function recordOfOfp(ofp, kind, fixes) {
    const g = ofp.general || {},
      end = kind === 'SID' ? ofp.origin : ofp.destination,
      icao = str(end?.icao_code).toUpperCase(),
      name = str(kind === 'SID' ? g.sid_ident : g.star_ident),
      trans = str(kind === 'SID' ? g.sid_trans : g.star_trans),
      rw = runwayOf(end?.plan_rwy),
      runways = rw ? [rw] : [],
      points = [];
    if (!/^[A-Z0-9]{3,4}$/.test(icao)) return null;
    fixes.forEach(f => {
      const lat = num(f.pos_lat),
        lon = num(f.pos_long),
        id = str(f.ident).toUpperCase();
      if (!id || lat == null || lon == null || points.length && points[points.length - 1].id === id) return;
      points.push({
        seq: points.length + 1,
        id,
        lat,
        lon,
        alt: null,
        planned: num(f.altitude_feet),
        via: str(f.via_airway) || null
      });
    });
    if (!points.length) return null;
    return {
      id: idOf(icao, kind, name, runways, trans),
      icao,
      kind,
      name: name || null,
      runways,
      transition: trans || null,
      points,
      source: {
        kind: 'simbrief',
        ref: str(ofp.params?.request_id || ofp.params?.time_generated) || null,
        cycle: str(ofp.params?.airac || g.airac) || null,
        at: new Date(num(ofp.params?.time_generated) ? +ofp.params.time_generated * 1000 : Date.now()).toISOString()
      },
      status: 'ofp'
    };
  }

  /** { sid, star } d'un OFP SimBrief (json=v2) : le départ avant le premier point en route, l'arrivée après le dernier ;
   *  sans point en route (vol court), selon l'étape CLB / DSC. TOC, TOD et aérodromes sont écartés. */
  function fromOfp(ofp) {
    const fixes = arr(ofp?.navlog?.fix).filter(f => f && !/^(TOC|TOD)$/i.test(str(f.ident)) && str(f.type) !== 'apt'),
      flagged = f => str(f.is_sid_star) === '1',
      enr = fixes.map((f, i) => (flagged(f) ? -1 : i)).filter(i => i >= 0),
      first = enr.length ? enr[0] : -1,
      last = enr.length ? enr[enr.length - 1] : -1,
      sid = [],
      star = [];
    fixes.forEach((f, i) => {
      if (!flagged(f)) return;
      if (first >= 0 ? i < first : /^CLB$/i.test(str(f.stage))) sid.push(f);
      else if (last >= 0 ? i > last : true) star.push(f);
    });
    return {
      sid: ofp ? recordOfOfp(ofp, 'SID', sid) : null,
      star: ofp ? recordOfOfp(ofp, 'STAR', star) : null
    };
  }

  const sameRunways = (a, b) => !(a.runways || []).length || !(b.runways || []).length || a.runways.some(r => b.runways.includes(r));

  /** Fusion de listes de procédures : une fiche par procédure (même type, même nom, même transition, pistes
   *  compatibles), la géométrie du meilleur statut ; `sources` garde toutes les sources, la meilleure d'abord. */
  function merge(...lists) {
    const groups = [];
    lists.flat().filter(p => p && KINDS.includes(p.kind) && Array.isArray(p.points) && p.points.length).forEach(p => {
      const g = groups.find(x => x.kind === p.kind && norm(x.name) === norm(p.name) && norm(x.transition) === norm(p.transition) &&
        sameRunways(x, p));
      if (g) g.items.push(p);
      else groups.push({
        kind: p.kind,
        name: p.name,
        transition: p.transition,
        runways: p.runways,
        items: [p]
      });
    });
    return groups.map(g => {
      // le meilleur statut d'abord ; à statut égal, une procédure non périmée (outdated) avant une périmée
      const items = g.items.slice().sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || !!a.outdated - !!b.outdated),
        best = items[0];
      return {
        ...best,
        sources: items.map(x => ({
          ...x.source,
          status: x.status
        }))
      };
    });
  }

  /** Fiche servie : chaque tronçon avec sa phase (`main` | `trans` | `missed`, § 10.20). Les fichiers d'avant la phase en ont
   *  une par défaut : `trans` pour une transition en route d'une SID ou d'une STAR (sa fiche ne porte qu'elle), `main` sinon ; un
   *  tronçon déjà marqué `missed` le reste. Copie : le cache du lecteur n'est pas modifié. */
  function withPhases(rec) {
    const dflt = rec.transition && rec.kind !== 'APP' ? 'trans' : 'main';
    return rec.points.every(p => p.phase) ? rec : {
      ...rec,
      points: rec.points.map(p => p.phase ? p : {
        ...p,
        phase: dflt
      })
    };
  }

  /** Distance orthodromique en milles marins (haversine) : de quoi trouver le point le plus proche d'un seuil. */
  const gcNm = (a, b) => {
    const r = Math.PI / 180,
      h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
    return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const placedPt = p => p && num(p.lat) !== null && num(p.lon) !== null;

  /** Une approche dont l'approche interrompue n'est pas marquée (§ 10.29, h) : au moins deux points, aucun de phase `missed`. */
  const lacksMissed = rec => rec?.kind === 'APP' && Array.isArray(rec.points) && rec.points.length > 1 && !rec.points.some(p => p
    ?.phase === 'missed');

  /** Seuils d'atterrissage des pistes que nomme l'approche, tirés de la table des pistes d'aerodb (`runways(icao)`) : le seuil
   *  décalé (`dthr`) quand il y en a un, sinon lat / lon ; une piste sans position est ignorée. [] sans piste nommée ni position. */
  function landingRefs(rec, runways) {
    // « 16B » : les deux parallèles
    const want = new Set((rec?.runways || []).map(runwayOf).filter(Boolean).flatMap(n => /B$/.test(n) ? [n.replace(/B$/, 'L'), n.replace(
      /B$/, 'R')] : [n]));
    return arr(runways).filter(r => r && want.has(runwayOf(r.id))).map(r => placedPt(r.dthr) ? r.dthr : r).filter(placedPt).map(r => ({
      lat: +r.lat,
      lon: +r.lon
    }));
  }

  /** Approche interrompue devinée (§ 10.29, h) : une approche finale ne s'éloigne jamais de la piste avant le point d'approche
   *  interrompue. Les points de l'approche après celui le plus proche d'un des seuils `refs` ([{ lat, lon }]) passent en phase
   *  `missed`, et la fiche porte `guessed: ['missed']` (clé optionnelle : ce que le lecteur a déduit au lieu de le lire). La fiche
   *  est rendue telle quelle (même objet) quand elle marque déjà sa phase, quand ce point est le dernier, sans seuil ou sans point
   *  placé. Copie : la fiche reçue n'est pas modifiée. */
  function markMissed(rec, refs) {
    if (!lacksMissed(rec) || !arr(refs).length) return rec;
    let best = -1,
      dBest = Infinity;
    rec.points.forEach((p, i) => {
      if (!placedPt(p)) return;
      for (const ref of refs) {
        const d = gcNm(ref, {
          lat: +p.lat,
          lon: +p.lon
        });
        if (d < dBest)[best, dBest] = [i, d];
      }
    });
    if (best < 0 || best === rec.points.length - 1) return rec;
    return {
      ...rec,
      points: rec.points.map((p, i) => i > best ? {
        ...p,
        phase: 'missed'
      } : p),
      guessed: [...new Set([...arr(rec.guessed), 'missed'])]
    };
  }

  /** Filtre d'une liste par { kind, runway, name, transition, doubt }. Une procédure de statut `doubt` (lecture douteuse) n'est rendue
   *  que si `q.doubt === true` ; fusionnée avec une autre lecture de la même procédure, c'est l'autre qui la représente (merge). */
  function filter(list, q = {}) {
    const rw = runwayOf(q.runway),
      nm = norm(q.name),
      tr = norm(q.transition);
    return list.filter(p => (q.doubt === true || p.status !== 'doubt') && (!q.kind || p.kind === String(q.kind).toUpperCase()) && (!rw ||
        !(p.runways || []).length || p.runways
        .includes(rw)) &&
      (!nm || norm(p.name) === nm) && (!tr || norm(p.transition) === tr));
  }

  /** Fusion des écritures d'un même fichier « vu dans un OFP » (poste et dépôt) : par identifiant, la plus récente. */
  function mergeSeen(base, local, remote) {
    const byId = new Map();
    [base, remote, local].forEach(v => arr(v?.procedures).forEach(p => {
      const old = byId.get(p.id);
      if (!old || String(old.source?.at) <= String(p.source?.at)) byId.set(p.id, p);
    }));
    const icao = local?.icao || remote?.icao || base?.icao;
    return {
      value: {
        schema: 1,
        icao,
        updated_at: new Date().toISOString(),
        procedures: [...byId.values()]
      },
      lost: null // la plus récente gagne : une procédure revue dans un OFP remplace la précédente, ce n'est pas un conflit
    };
  }

  // ---- la carte officielle d'une procédure (SOG-0045, V3 § 10.39) : le choix du PDF dans la liste des cartes du fichier du terrain (`charts.items`), sans rien composer.
  /** Mots qui ne désignent pas une procédure dans le nom d'une carte (« SID_RWY20_RNAV_SOUTH_INSTR_01 ») : jamais pris pour le nom d'un départ ou d'une arrivée. */
  const CHART_WORDS = new Set(['RNAV', 'RNP', 'SID', 'STAR', 'INI', 'INSTR', 'EAST', 'WEST', 'NORTH', 'SOUTH', 'CONV', 'DEP', 'VPE',
    'VPT', 'ALL', 'ILS', 'LOC', 'VOR', 'GNSS', 'HLDGCONV', 'POGO'
  ]);
  /** Les pistes et les autres mots du nom d'une carte ou d'une page DATA du SIA : « AD_2_LFPO_SID_RWY06-07_RNAV_EAST.pdf » → { runways ['06','07'], words ['RNAV','EAST'] } ;
   *  « …_IAC_RWY17L_17R_INA_RNAV.pdf » → { ['17L','17R'], ['INA','RNAV'] } ; « …_RWY_EAST_INA_RNAV_MOLBA.pdf » → aucune piste (le sens, pas un numéro) ; le type (SID, IAC, DATA…), CODE et le numéro de page en sont retirés. */
  function chartWords(path) {
    const parts = String(path || '').split('/').pop().replace(/\.pdf$/i, '').replace(/^AD_2_[A-Z0-9]{4}_/, '').split('_'),
      runways = [],
      words = [];
    let inRunways = false;
    parts.forEach((t, i) => {
      if (i === 0 && /^(SID|STAR|IAC|DATA|ADC|VAC|APDC|AOC|PATC|GMC|MIA|MVA)$/.test(t)) return;
      const m = /^RWY((?:\d{2}[LRC]?(?:-\d{2}[LRC]?)*)?)$/.exec(t);
      if (m) {
        inRunways = true;
        runways.push(...m[1].split('-').filter(Boolean));
      } else if (inRunways && /^\d{2}[LRC]?(?:-\d{2}[LRC]?)*$/.test(t)) runways.push(...t.split('-'));
      else {
        inRunways = false;
        if (t !== 'CODE' && !/^\d{2}$/.test(t) && t !== 'GNSS') words.push(t);
      }
    });
    return {
      runways,
      words
    };
  }

  /** Le PDF de la carte d'une procédure parmi les cartes d'un terrain (`items` : charts.items du fichier, { path, kind }), ou null : la carte n'est choisie que si UNE SEULE convient,
   *  jamais devinée. Une approche : la carte IAC de ses pistes dont le nom porte les mots de sa page DATA (« …DATA_RWY14L_FNA_ILS_Z_LOC_Z_CODE » → « …IAC_RWY14L_FNA_ILS_Z_LOC_Z »), départagée au
   *  besoin par le premier mot de sa transition ; un départ ou une arrivée : la carte SID / STAR de ses pistes dont le nom porte le sien (« …SID_RWY06-07_RNAV_OLZOM_MONOT_DORDI » pour
   *  OLZOM 2F) : les autres cartes d'une piste (« …_SOUTH_INSTR_01 ») ne disent pas quels départs elles portent, le nom n'est que dans le dessin. La piste (`kind` 'RWY', sans fiche) :
   *  la carte d'aérodrome (ADC), la première. */
  function chartFor(proc, items) {
    const list = arr(items).filter(i => i && typeof i.path === 'string' && /^Cartes\/[A-Z0-9]{4}\/[A-Za-z0-9._ -]+\.pdf$/.test(i.path)),
      icao = str(proc?.icao).toUpperCase(),
      own = list.filter(i => i.path.startsWith(`Cartes/${icao}/`)),
      kind = str(proc?.kind).toUpperCase(),
      runways = arr(proc?.runways).map(runwayOf).filter(Boolean),
      one = c => (c.length === 1 ? c[0].path : null);
    if (!icao) return null;
    if (kind === 'RWY') return one(own.filter(i => i.kind === 'ADC').sort((a, b) => (a.path < b.path ? -1 : 1)).slice(0, 1));
    if (!runways.length) return null;
    const onRunway = i => {
      const w = chartWords(i.path);
      return runways.every(r => w.runways.includes(r));
    };
    if (kind === 'APP') {
      const src = str(proc.source?.file || proc.source?.ref);
      if (!/\.pdf$/i.test(src)) return null;
      const want = chartWords(src).words;
      if (!want.length) return null;
      const cand = own.filter(i => i.kind === 'IAC' && onRunway(i) && want.every(w => chartWords(i.path).words.includes(w)));
      if (cand.length === 1) return cand[0].path;
      const tr = str(proc.transition).toUpperCase().split(/\s+/)[0];
      return tr ? one(cand.filter(i => chartWords(i.path).words.includes(tr))) : null;
    }
    if (kind === 'SID' || kind === 'STAR') {
      const name = str(proc.name).toUpperCase().split(/\s+/)[0];
      if (name.length < 3 || CHART_WORDS.has(name)) return null;
      return one(own.filter(i => i.kind === kind && onRunway(i) && chartWords(i.path).words.includes(name)));
    }
    return null;
  }

  // ---- les branches en arc (RF, SOG-0248) : l'arc est DÉVELOPPÉ en points (centre, rayon, sens du virage), jamais une corde droite ; même géométrie que tools/proc_arc.py
  const R_NM = 3440.065;
  const bearingNm = (a, b) => {
    const rad = Math.PI / 180,
      la1 = a.lat * rad,
      la2 = b.lat * rad,
      dl = (b.lon - a.lon) * rad,
      y = Math.sin(dl) * Math.cos(la2),
      x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dl),
      h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dl / 2) ** 2;
    return [(Math.atan2(y, x) / rad + 360) % 360, 2 * R_NM * Math.asin(Math.sqrt(h))];
  };
  const destination = (a, bearing, nm) => {
    const rad = Math.PI / 180,
      la1 = a.lat * rad,
      th = bearing * rad,
      d = nm / R_NM,
      la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(th)),
      lo2 = a.lon * rad + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
    return {
      lat: la2 / rad,
      lon: ((lo2 / rad + 540) % 360) - 180
    };
  };
  /** L'arc de `start` à `end` autour de `center` ({ lat, lon } chacun), `turn` 'L' | 'R' : { points (intermédiaires), radius, sweep, arcNm, gaps } ou null (sens ou position manquants). `radiusNm` et `printedNm` : ce que la page imprime ;
   *  un écart (rayon 0,3 NM, longueur d'arc 0,3 NM) est dit dans `gaps`, le tracé est rendu quand même. */
  function developArc(center, start, end, turn, radiusNm, printedNm) {
    const ok = x => x && Number.isFinite(x.lat) && Number.isFinite(x.lon);
    if (!['L', 'R'].includes(turn) || !ok(center) || !ok(start) || !ok(end)) return null;
    const [bs, rs] = bearingNm(center, start),
      [be, re] = bearingNm(center, end),
      sweep = turn === 'R' ? (be - bs + 360) % 360 : (bs - be + 360) % 360,
      radius = (rs + re) / 2,
      arcNm = radius * sweep * Math.PI / 180,
      gaps = [];
    if (Number.isFinite(radiusNm) && (Math.abs(rs - radiusNm) > 0.3 || Math.abs(re - radiusNm) > 0.3)) gaps.push(`rayon calculé ${rs.toFixed(2)} / ${re.toFixed(2)} NM pour ${radiusNm} imprimés`);
    if (Number.isFinite(printedNm) && Math.abs(arcNm - printedNm) > 0.3) gaps.push(`longueur d'arc calculée ${arcNm.toFixed(2)} NM pour ${printedNm} imprimés`);
    const n = Math.max(1, Math.ceil(sweep / 5)),
      sign = turn === 'R' ? 1 : -1,
      points = [];
    for (let k = 1; k < n; k++) points.push(destination(center, (bs + sign * sweep * k / n + 720) % 360, radius));
    return {
      points,
      radius,
      sweep,
      arcNm,
      gaps
    };
  }

  /** Les POINTS DE ROUTE d'une procédure (les fixes nommés : liste des points, verrous, temps sur zone, export FMS / PLN) : jamais un point d'arc (`arc: true`, `id` null, SOG-0248) ni un point sans nom. */
  const fixesOf = points => arr(points).filter(p => p && p.id && !p.arc);
  /** Le TRACÉ d'une procédure (la Carte, le profil, les distances) : TOUS les points positionnés dans l'ordre de vol, arcs développés compris. */
  const pathOf = points => arr(points).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));

  window.AeroDBProcedures = {
    fixesOf,
    pathOf,
    developArc,
    chartFor,
    chartWords,
    RANK,
    KINDS,
    idOf,
    fromOfp,
    merge,
    withPhases,
    lacksMissed,
    landingRefs,
    markMissed,
    filter,
    mergeSeen
  };
})();
