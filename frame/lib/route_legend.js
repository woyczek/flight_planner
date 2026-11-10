// V3 — la légende commune des itinéraires (SOG-0134, refus de recette du 10 nov. : « on ne voit ni les points ni les awy, ni si c'est
// du DCT, du FRA… même couleur, très gros, sans légende »). UNE seule source des natures d'un tronçon, de leurs mots dans les quatre
// langues et de leurs traits : la Carte la lit pour dessiner les itinéraires (modules/maps, BUGS SOG), l'écran Route de Carburant pour
// sa légende et la nature de chaque tronçon. Écrite par Features SOG seul (une demande de changement de mot ou de motif passe par lui).
// Pur : ni page, ni stockage, ni réseau.
//
//   NATURES            [{ id, label: [fr, en, de, es], hint?: [fr, en, de, es], dash: [px…] (vide = plein), tint }]
//                      id : awy (voie publiée, plein + son nom), dct (direct, tirets), fra (route libre, pointillé), sid, star, app
//                      (teintes des procédures), fault (écart aux règles, rouge) ; tint : route | sid | star | app | err
//   natureOf(via, layer)   la nature d'un tronçon d'après le moteur (segments[].via : UN10, DCT, nom de procédure… ;
//                      segments[].layer : SID | LOW | HIGH | FRA | STAR | APP) ; '' si rien n'est dit. Un écart ne change pas la
//                      nature (le trait garde son motif, la teinte rouge dit l'écart).
//   viaOf(via, layer)  ce que route_alts.json porte par tronçon (INTEGRATION de Carburant § 3 bis) : l'identifiant de la voie, DCT, FRA
//                      (un direct de la couche FRA) ou '' ; seize signes au plus, majuscules.
//   labelOf(id, lang)  le mot d'une nature ; legendHtml(lang, ids?) la rangée « trait + mot » (SVG en ligne, sans script).
export const LANGS = ['fr', 'en', 'de', 'es'];
export const LAYERS = ['SID', 'LOW', 'HIGH', 'FRA', 'STAR', 'APP'];
export const NATURES = Object.freeze([{
  id: 'awy',
  label: ['Voie', 'Airway', 'Luftstraße', 'Aerovía'],
  hint: ['nom le long du trait', 'named along the line', 'Name entlang der Linie', 'nombre a lo largo del trazo'],
  dash: [],
  tint: 'route'
}, {
  id: 'dct',
  label: ['DCT (direct)', 'DCT (direct)', 'DCT (direkt)', 'DCT (directo)'],
  dash: [8, 5],
  tint: 'route'
}, {
  id: 'fra',
  label: ['FRA (route libre)', 'FRA (free route)', 'FRA (freie Streckenführung)', 'FRA (ruta libre)'],
  dash: [2, 4],
  tint: 'route'
}, {
  id: 'sid',
  label: ['SID', 'SID', 'SID', 'SID'],
  dash: [],
  tint: 'sid'
}, {
  id: 'star',
  label: ['STAR', 'STAR', 'STAR', 'STAR'],
  dash: [],
  tint: 'star'
}, {
  id: 'app',
  label: ['Approche', 'Approach', 'Anflug', 'Aproximación'],
  dash: [],
  tint: 'app'
}, {
  id: 'fault',
  label: ['Écart aux règles', 'Rule deviation', 'Regelabweichung', 'Desviación de las reglas'],
  dash: [],
  tint: 'err'
}].map(n => Object.freeze({
  ...n,
  dash: Object.freeze(n.dash)
})));
const AIRWAY = /^[A-Z0-9]{1,16}$/;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
const at = lang => Math.max(0, LANGS.indexOf(lang));
/** La nature d'un tronçon (voir l'en-tête). */
export function natureOf(via, layer) {
  const v = String(via ?? '').trim().toUpperCase(),
    l = String(layer ?? '').trim().toUpperCase();
  if (l === 'SID') return 'sid';
  if (l === 'STAR') return 'star';
  if (l === 'APP') return 'app';
  if (l === 'FRA' || v === 'FRA') return 'fra';
  if (v === 'DCT') return 'dct';
  return AIRWAY.test(v) ? 'awy' : '';
}
/** Ce que route_alts.json porte par tronçon (voir l'en-tête). */
export function viaOf(via, layer) {
  const v = String(via ?? '').trim().toUpperCase().slice(0, 16),
    l = String(layer ?? '').trim().toUpperCase();
  if (l === 'FRA' && (!v || v === 'DCT')) return 'FRA';
  return AIRWAY.test(v) ? v : '';
}
/** Le mot d'une nature dans la langue ; '' pour une nature inconnue. */
export function labelOf(id, lang) {
  const n = NATURES.find(x => x.id === id);
  return n ? n.label[at(lang)] : '';
}
/** La rangée de la légende : pour chaque nature (toutes, ou `ids`), un trait de 28 px à son motif (classe rl-<tint> : la couleur est
 *  celle de l'hôte, currentColor) puis son mot ; data-nature pour qui la lit. `hint: false` : sans la précision entre parenthèses (une
 *  ligne de tronçon). */
export function legendHtml(lang, ids, {
  hint = true
} = {}) {
  const want = (Array.isArray(ids) ? NATURES.filter(n => ids.includes(n.id)) : NATURES).map(n => hint ? n : {
    ...n,
    hint: null
  });
  return `<span class="rl-legend" data-legend>${want.map(n => `<span class="rl-item" data-nature="${n.id}"><svg class="rl-${n.tint}" width="28" height="8" viewBox="0 0 28 8" aria-hidden="true"><line x1="1" y1="4" x2="27" y2="4" stroke="currentColor" stroke-width="3"${n.dash.length ? ` stroke-dasharray="${n.dash.join(' ')}"` : ''}/></svg>${esc(n.label[at(lang)])}${n.hint ? ` <span class="rl-hint">(${esc(n.hint[at(lang)])})</span>` : ''}</span>`).join('')}</span>`;
}
