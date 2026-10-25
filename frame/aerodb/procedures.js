/* aerodb — procédures (SID, STAR, approches) : schéma commun, lecture d'un OFP SimBrief, fusion des sources.
   Code pur (ni DOM, ni réseau, ni texte d'interface) ; aerodb.js le charge à la première demande et lui donne les
   fichiers à lire (SPEC § 5 quinquies). Définit window.AeroDBProcedures. */
(() => {
  'use strict';
  if (window.AeroDBProcedures) return;
  /** Précédence des statuts : officiel > à vérifier > vu dans un OFP (source secondaire, jamais prioritaire). */
  const RANK = {
      official: 0,
      check: 1,
      ofp: 2
    },
    KINDS = ['SID', 'STAR', 'APP'],
    str = v => (v == null ? '' : String(v)).trim(),
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
      const items = g.items.slice().sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9)),
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

  /** Filtre d'une liste par { kind, runway, name, transition }. */
  function filter(list, q = {}) {
    const rw = runwayOf(q.runway),
      nm = norm(q.name),
      tr = norm(q.transition);
    return list.filter(p => (!q.kind || p.kind === String(q.kind).toUpperCase()) && (!rw || !(p.runways || []).length || p.runways
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

  window.AeroDBProcedures = {
    RANK,
    KINDS,
    idOf,
    fromOfp,
    merge,
    filter,
    mergeSeen
  };
})();
