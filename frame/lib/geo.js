// Géométrie partagée du cadre : les longitudes autour de la ligne de changement de date (antiméridien, ±180°).
//
// Un vol de Sibérie en Alaska (UHMA 177,7° E → PAOM 165,4° W) passe de 177° à −165° : pour une interpolation, un cadrage
// ou un dessin il va de 177° à 195°, pas de 177° à −165° en faisant le tour du monde. Le module qui lit une route la
// déroule (unwrapLons) avant tout calcul et tout dessin ; toute demande à un service ou à un cache (Open-Meteo, aerodb,
// cases de la réserve météo) est ramenée à [-180, 180[ (wrapLon) au moment de la demande. Une comparaison de longitudes
// entre deux sources se fait modulo 360 (nearLon).
//
// Fonctions pures, sans état, sans texte. Même logique que modules/atmosphere/atmo.js (commit 5f45e0b18), à l'identique
// pour que les cases du cache météo restent les mêmes : un lecteur qui passe les points bruts retrouve les mêmes cases.
//   import { wrapLon, nearLon, unwrapLons } from '../../frame/lib/geo.js';
// Les pôles ne sont pas traités : pas d'enroulement en latitude.

/** Longitude ramenée à [-180, 180[. */
export const wrapLon = lon => ((((+lon + 180) % 360) + 360) % 360) - 180;

/** Copie de lon (décalée d'un nombre entier de tours) la plus proche de ref : à moins de 180° de ref. À utiliser pour
 *  comparer ou dessiner une longitude lue ailleurs (une donnée à −170°) sur une carte centrée de l'autre côté de la
 *  ligne (195°). */
export const nearLon = (lon, ref) => +lon + 360 * Math.round((ref - lon) / 360);

// ---------------------------------------------------------------- la loxodromie : le chemin d'un direct (SOG-0243)
// Un direct se vole au compas (cap vrai constant) : c'est la droite de la carte Mercator ; le grand cercle n'est que la comparaison (le pointillé de la Carte).
// UN SEUL chemin pour tout ce qui longe un tronçon direct : le trait, les repères de distance, les lieux où le vent est lu, les barbules, le relief et les espaces du profil, TOC / TOD,
// la position à une distance — tous passent par rhumbAt, jamais par une interpolation de la latitude et de la longitude en degrés (qui n'est ni la loxodromie ni l'orthodromie).
const RHUMB_R = 3440.065,
  mercY = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-89.9, Math.min(89.9, +lat)) * Math.PI / 360)),
  dLonOf = (a, b) => ((((+b.lon - +a.lon + 180) % 360) + 360) % 360) - 180; // l'écart en longitude le plus court, dans [-180, 180[
/** Le point à la fraction f (0 à 1) de la distance de a vers b le long de la loxodromie : { lat, lon } ; la latitude est linéaire en f (la distance d'une loxodromie
 *  est proportionnelle à l'écart en latitude), la longitude suit la projection de Mercator. Longitude continue avec celles de a et de b (route déroulée ; hors de
 *  [-180, 180[ au-delà de la ligne de changement de date : l'appelant la ramène par wrapLon). Même cap, ou parallèle (écart de latitude nul) : interpolation droite.
 *  modules/maps/render.js en tient une copie (script classique) que frame/lib/test/geo.html compare. */
export function rhumbAt(a, b, f) {
  const dPsi = mercY(b.lat) - mercY(a.lat),
    lat = +a.lat + (+b.lat - +a.lat) * f,
    dl = dLonOf(a, b);
  if (Math.abs(dPsi) < 1e-12) return {
    lat,
    lon: +a.lon + dl * f
  };
  return {
    lat,
    lon: +a.lon + dl * (mercY(lat) - mercY(a.lat)) / dPsi
  };
}
/** Distance (NM) de a à b le long de la loxodromie (la route déroulée : l'écart en longitude est le plus court). */
export function rhumbNm(a, b) {
  const r = Math.PI / 180,
    dPhi = (+b.lat - +a.lat) * r,
    dLam = dLonOf(a, b) * r,
    dPsi = mercY(b.lat) - mercY(a.lat),
    q = Math.abs(dPsi) > 1e-12 ? dPhi / dPsi : Math.cos(+a.lat * r);
  return Math.hypot(dPhi, q * dLam) * RHUMB_R;
}
/** Cap vrai constant (degrés, 0 à 360) de la loxodromie de a vers b. */
export function rhumbCourse(a, b) {
  const dPsi = mercY(b.lat) - mercY(a.lat);
  return (Math.atan2(dLonOf(a, b) * Math.PI / 180, dPsi) * 180 / Math.PI + 360) % 360;
}

/** Points d'une route aux longitudes continues : chaque point prend la copie la plus proche du précédent (donc à moins de
 *  180° de lui) ; une route qui passe la ligne de changement de date (177° puis −165°) va de 177° à 195°, sans faire le
 *  tour du monde. Le premier point garde sa longitude ; un point déjà continu est rendu tel quel (même objet).
 *  Accepte des objets { lat, lon } (rendus avec la longitude changée, autres champs gardés) et des paires [lon, lat]
 *  (GeoJSON, rendues en nouveaux tableaux). Une entrée sans longitude lisible est rendue telle quelle et ne sert pas de
 *  repère au point suivant. */
export function unwrapLons(points) {
  let prev = null;
  return (points || []).map(p => {
    const arr = Array.isArray(p),
      raw = arr ? p[0] : p?.lon;
    if (raw == null || raw === '' || !Number.isFinite(+raw)) return p;
    const lon = prev == null ? +raw : nearLon(+raw, prev);
    prev = lon;
    if (lon === +raw) return p;
    return arr ? [lon, ...p.slice(1)] : {
      ...p,
      lon
    };
  });
}
