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
