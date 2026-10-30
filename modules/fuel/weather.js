// V3 fuel — météo des terrains en calcul pur (modules/fuel/SPEC.md § 10) : lecture des METAR et TAF au format JSON
// d'aviationweather.gov (api/data/metar, api/data/taf), groupe du TAF valable à une heure donnée, plafond, visibilité et
// catégorie de vol (VFR, MVFR, IFR, LIFR), cumulonimbus et cumulus bourgeonnants, composantes du vent sur la piste la
// plus proche du vent (axe de la piste principale du terrain, base aéronautique), et vent moyen le long de la route
// (moyenne des vecteurs, pondérée par la longueur des segments : approximation assumée, vent de surface). Ni page, ni
// stockage, ni réseau.

/** Visibilité du JSON (« 6+ » ou nombre, en milles terrestres) → { sm, plus } ; null sans valeur. */
export function visibility(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v),
    sm = parseFloat(s);
  return Number.isFinite(sm) ? {
    sm,
    plus: s.includes('+')
  } : null;
}
/** Plafond (ft) : base de la plus basse couche BKN ou OVC, sinon visibilité verticale ; null sans plafond. */
export function ceiling(clouds = [], vertVis = null) {
  const c = (clouds || []).filter(x => /^(BKN|OVC|OVX)$/.test(x?.cover) && Number.isFinite(+x.base)).map(x => +x.base);
  if (c.length) return Math.min(...c);
  return Number.isFinite(+vertVis) && vertVis !== null ? +vertVis : null;
}
/** Catégorie de vol de la FAA : LIFR (plafond < 500 ft ou visibilité < 1 SM), IFR (< 1 000 ft ou < 3 SM), MVFR
 *  (≤ 3 000 ft ou ≤ 5 SM), sinon VFR ; '' sans aucune donnée. */
export function category(ceilFt, vis) {
  const sm = vis?.sm;
  if (ceilFt == null && sm == null) return '';
  if ((ceilFt != null && ceilFt < 500) || (sm != null && sm < 1)) return 'LIFR';
  if ((ceilFt != null && ceilFt < 1000) || (sm != null && sm < 3)) return 'IFR';
  if ((ceilFt != null && ceilFt <= 3000) || (sm != null && sm <= 5 && !vis.plus)) return 'MVFR';
  return 'VFR';
}
/** Cumulonimbus ou cumulus bourgeonnants annoncés (type de couche, ou texte brut). */
export const convective = (clouds = [], raw = '') => (clouds || []).some(c => /^(CB|TCU)$/.test(c?.type || '')) ||
  /\b(?:\d{3}|\/{3})?(CB|TCU)\b/.test(String(raw));
/** Groupes du TAF valables à l'instant t (secondes) : base (le dernier groupe sans changement, BECMG ou FM qui couvre t)
 *  et temporaires (TEMPO, PROB qui couvrent t) ; null si t est hors de la validité du TAF. */
export function tafAt(taf, t) {
  if (!taf || !(t >= taf.validTimeFrom && t < taf.validTimeTo)) return null;
  const cover = f => t >= f.timeFrom && t < f.timeTo,
    groups = (taf.fcsts || []).filter(cover),
    base = groups.filter(f => !f.fcstChange || /^(BECMG|FM)$/.test(f.fcstChange)).at(-1) || (taf.fcsts || [])[0] || null;
  return {
    base,
    temp: groups.filter(f => /^(TEMPO|PROB)/.test(f.fcstChange || '') || f.probability)
  };
}
/** Résumé d'un terrain : METAR, ou TAF si une heure de vol tombe dans sa validité. Sortie : { source ('METAR' | 'TAF'),
 *  at (secondes : heure du METAR ou heure visée), wdir, wspd, wgst, vis, ceil, cat, temp, qnh, convective, raw,
 *  tempo [{ change, wdir, wspd, wgst, vis, ceil, cat, wx }] } ; null sans donnée. */
export function station(metar, taf, t = null) {
  const tg = t != null ? tafAt(taf, t) : null;
  if (tg?.base) {
    const b = tg.base,
      vis = visibility(b.visib),
      ceil = ceiling(b.clouds, b.vertVis);
    return {
      source: 'TAF',
      at: t,
      wdir: b.wdir,
      wspd: b.wspd,
      wgst: b.wgst,
      vis,
      ceil,
      cat: category(ceil, vis),
      temp: null,
      qnh: b.altim ?? null,
      wx: b.wxString || '',
      convective: [b, ...tg.temp].some(g => convective(g.clouds)),
      raw: taf.rawTAF || '',
      tempo: tg.temp.map(g => {
        const v = visibility(g.visib),
          c = ceiling(g.clouds, g.vertVis);
        return {
          change: g.fcstChange || (g.probability ? `PROB${g.probability}` : ''),
          wdir: g.wdir,
          wspd: g.wspd,
          wgst: g.wgst,
          vis: v,
          ceil: c,
          cat: category(c, v),
          wx: g.wxString || ''
        };
      })
    };
  }
  if (!metar) return null;
  const vis = visibility(metar.visib),
    ceil = ceiling(metar.clouds, metar.vertVis);
  return {
    source: 'METAR',
    at: metar.obsTime,
    wdir: metar.wdir,
    wspd: metar.wspd,
    wgst: metar.wgst ?? null,
    vis,
    ceil,
    cat: metar.fltCat || category(ceil, vis),
    temp: metar.temp ?? null,
    qnh: metar.altim ?? null,
    wx: metar.wxString || '',
    convective: convective(metar.clouds, metar.rawOb),
    raw: metar.rawOb || '',
    tempo: []
  };
}
/** Un nombre lu, ou faux : null, absent ou vide ne sont pas 0 (Number(null) vaudrait 0). */
const isNum = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);
/** Le terrain a-t-il un vent dirigé : une direction et une vitesse lues ; 00000KT en est un (0°, 0 kt), VRB et une direction absente
 *  non (écart du 30 octobre : une direction null était lue 0°). */
export const hasWind = st => isNum(st?.wdir) && isNum(st?.wspd);
/** Vent moyen le long de la route : terrains [{ wdir, wspd }] dans l'ordre (départ, intermédiaire facultatif,
 *  arrivée) et longueurs des segments entre eux (NM) ; chaque segment prend la moyenne vectorielle de ses deux terrains,
 *  pondérée par sa longueur. Sortie : { dirDeg, speedKt } ; null s'il manque un vent (hasWind), ou sous deux terrains. */
export function routeWind(winds, legs) {
  if (winds.length < 2 || !winds.every(hasWind)) return null;
  const vec = w => {
      const r = w.wdir * Math.PI / 180;
      return [w.wspd * Math.sin(r), w.wspd * Math.cos(r)];
    },
    v = [0, 0];
  let total = 0;
  for (let i = 1; i < winds.length; i++) {
    const a = vec(winds[i - 1]),
      b = vec(winds[i]),
      len = Math.max(+legs[i - 1] || 0, 0) || 1;
    v[0] += (a[0] + b[0]) / 2 * len;
    v[1] += (a[1] + b[1]) / 2 * len;
    total += len;
  }
  const x = v[0] / total,
    y = v[1] / total;
  return {
    dirDeg: Math.round((Math.atan2(x, y) * 180 / Math.PI + 360) % 360),
    speedKt: Math.round(Math.hypot(x, y))
  };
}
