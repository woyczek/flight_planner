(() => {
  'use strict';
  // Espaces à activer d'une mission (MissionAirspaces) : zones R, D, TRA, zones du RTBA (AZBA) et zones P recoupées par la
  // route probable (shared/mission_estimate.js, niveau de chaque tronçon, montée au départ et descente à l'arrivée) et
  // par les zones de travail de la mission (cercle ou polygone). Espaces lus dans la base SIA du navigateur
  // (shared/sia_base.js : rings [[lat, lon]], lower / upper en texte, admin et act tirés des remarques AIXM).
  // Calcul indicatif : il ne remplace ni la consultation des cartes AZBA ni les NOTAM.

  const TYPES = new Set(['R', 'D', 'TRA', 'P']);
  /** Limite verticale en ft (« SFC », « FL 65 », « 1500 ft AMSL », « 300 m ASFC ») ; null si inconnue. */
  function levelFt(v) {
    const s = String(v ?? '').trim().toUpperCase();
    if (!s) return null;
    if (/^(SFC|GND)/.test(s)) return 0;
    if (/UNL/.test(s)) return 99999;
    let m = /^FL\s*(\d+)/.exec(s);
    if (m) return +m[1] * 100;
    m = /^(\d+(?:[.,]\d+)?)\s*(M|FT)?/.exec(s);
    return m ? +m[1].replace(',', '.') * (m[2] === 'M' ? 3.28084 : 1) : null;
  }
  /** Point dans un anneau [[lat, lon]…] (lancer de rayon). */
  function inRing(lat, lon, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [yi, xi] = ring[i], [yj, xj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const km = (a, b) => Math.hypot((a.lat - b.lat) * 111.32, (a.lon - b.lon) * 111.32 * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180));
  /** Boîte englobante d'un espace (tri rapide). */
  function boxOf(a) {
    if (a._box) return a._box;
    let s = 90, n = -90, w = 180, e = -180;
    for (const r of a.rings || []) for (const [la, lo] of r) { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo); }
    return (a._box = { s, n, w, e });
  }
  const inBox = (b, p) => p.lat >= b.s && p.lat <= b.n && p.lon >= b.w && p.lon <= b.e;
  const inside = (a, p) => inBox(boxOf(a), p) && (a.rings || []).some(r => r.length > 2 && inRing(p.lat, p.lon, r));

  /** Échantillons de la route probable (tous les ~2 km) avec leur niveau (ft) : montée au départ, descente à l'arrivée. */
  function routeSamples(y) {
    const est = window.MissionEstimate?.estimate?.(y);
    if (!est?.ok) return [];
    const out = [], legs = est.legs || [];
    legs.forEach((l, i) => {
      const d = km(l.from, l.to), n = Math.max(1, Math.ceil(d / 2));
      for (let k = 0; k <= n; k++) {
        const f = k / n, p = { lat: l.from.lat + (l.to.lat - l.from.lat) * f, lon: l.from.lon + (l.to.lon - l.from.lon) * f };
        let ft = l.alt;
        if (i === 0 && f < .3) ft = l.alt * f / .3;                        // montée après le décollage
        if (i === legs.length - 1 && f > .7) ft = l.alt * (1 - f) / .3;    // descente vers l'arrivée
        out.push({ ...p, ft, leg: `${l.from.id || l.from.name || ''} → ${l.to.id || l.to.name || ''}` });
      }
    });
    return out;
  }
  /** Points d'une zone de travail (sommets, centre, pourtour d'un cercle). */
  function zoneSamples(z) {
    const c = z.centre || z.center || z, pts = [];
    if (Number.isFinite(+c?.lat) && Number.isFinite(+c?.lon)) pts.push({ lat: +c.lat, lon: +c.lon });
    for (const q of Array.isArray(z.points) ? z.points : []) if (Number.isFinite(+q?.lat) && Number.isFinite(+q?.lon)) pts.push({ lat: +q.lat, lon: +q.lon });
    const r = +z.radius_km;
    if (r > 0 && pts.length) for (let k = 0; k < 16; k++) { const t = k / 16 * 2 * Math.PI; pts.push({ lat: pts[0].lat + r / 111.32 * Math.cos(t), lon: pts[0].lon + r / (111.32 * Math.cos(pts[0].lat * Math.PI / 180)) * Math.sin(t) }); }
    return pts;
  }
  /** Niveau de travail d'une mission (ft) : croisière de l'appareil, sinon profil vertical, sinon estimation. */
  function workFt(y) {
    const ac = (Array.isArray(y.aircraft) ? y.aircraft : [y.aircraft]).find(Boolean) || {};
    return levelFt(ac.cruise_level) ?? levelFt(y.vertical_profile?.cruise) ?? window.MissionEstimate?.estimate?.(y)?.aircraft?.alt ?? 3000;
  }

  /** Espaces recoupés par une mission : [{ key, name, type, lower, upper, admin, act, info, azba, where: [texte] }]. */
  function crossed(y, airspaces) {
    y = y?.yaml || y || {};
    const list = (airspaces || []).filter(a => TYPES.has(a.type) || a.azba), hits = new Map;
    const hit = (a, where) => { const k = `${a.type}|${a.key || a.name}`; if (!hits.has(k)) hits.set(k, { key: a.key || a.name, name: a.name, type: a.azba ? 'RTBA' : a.type, lower: a.lower, upper: a.upper, admin: a.admin || (a.azba ? 'CDPGE Athis-Mons' : ''), act: a.act || (a.azba ? 'AZBA' : ''), info: a.info || '', azba: !!a.azba, where: [] }); const h = hits.get(k); if (!h.where.includes(where)) h.where.push(where); };
    const band = a => [levelFt(a.lower) ?? 0, levelFt(a.upper) ?? 99999];
    for (const p of routeSamples(y)) for (const a of list) { const [lo, hi] = band(a); if (p.ft >= lo - 100 && p.ft <= hi + 100 && inside(a, p)) hit(a, `route ${p.leg}`); }
    const top = workFt(y);
    for (const z of Array.isArray(y.zones) ? y.zones : []) {
      const pts = zoneSamples(z);
      for (const a of list) { const [lo] = band(a); if (lo <= top && pts.some(p => inside(a, p))) hit(a, `zone ${z.name || z.id || ''}`.trim()); }
    }
    return [...hits.values()].sort((a, b) => (a.type === 'P') - (b.type === 'P') || String(a.admin).localeCompare(String(b.admin)) || String(a.name).localeCompare(String(b.name), 'fr', { numeric: true }));
  }
  /** Espaces de plusieurs missions (opération) : même forme, avec by (identifiants des missions). */
  function crossedAll(docs, airspaces) {
    const out = new Map;
    for (const d of docs || []) {
      const y = d?.yaml || d, id = String(y?.mission?.id || ''), cs = String((Array.isArray(y?.aircraft) ? y.aircraft[0] : y?.aircraft)?.callsign || id);
      for (const h of crossed(y, airspaces)) { const k = `${h.type}|${h.key}`; if (!out.has(k)) out.set(k, { ...h, where: [], by: [] }); const o = out.get(k); if (!o.by.includes(cs)) o.by.push(cs); for (const w of h.where) o.where.push(`${cs} : ${w}`); }
    }
    return [...out.values()];
  }
  /** Regroupement par gestionnaire (demande d'activation) ; zones P à part (interdites : à éviter). */
  function byAdmin(list) {
    const groups = new Map;
    for (const h of list) { const k = h.type === 'P' ? 'P' : (h.admin || '—'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(h); }
    return [...groups.entries()].map(([admin, zones]) => ({ admin, prohibited: admin === 'P', zones }));
  }
  /** Texte du brief : une ligne par gestionnaire (« CDPGE Athis-Mons (AZBA) : R 45 A (SFC – FL 65), … »). */
  function text(list) {
    if (!list.length) return '';
    return byAdmin(list).map(g => g.prohibited
      ? `Zones interdites à éviter : ${g.zones.map(z => `${z.name} (${z.lower || '?'} – ${z.upper || '?'})`).join(', ')}`
      : `${g.admin === '—' ? 'Gestionnaire non indiqué' : g.admin}${g.zones.some(z => z.act) ? ` (${[...new Set(g.zones.map(z => z.act).filter(Boolean))].join(', ')})` : ''} : ${g.zones.map(z => `${z.type === 'RTBA' ? 'RTBA ' : ''}${z.name} (${z.lower || '?'} – ${z.upper || '?'})${z.by ? ' — ' + z.by.join(', ') : ''}`).join(', ')}`).join('\n');
  }
  /** Base SIA du navigateur (SiaBase), n'importe quelle version ; null si absente. */
  async function airspacesOfBase() {
    try { const b = await window.SiaBase?.get?.({ any: true }); return b?.airspaces || null; } catch { return null; }
  }

  window.MissionAirspaces = { crossed, crossedAll, byAdmin, text, levelFt, airspacesOfBase };
})();
