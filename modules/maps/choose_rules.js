// V3 maps — les règles du « choisir sur la carte », troisième version (SOG-0654, décision de l'ergonome du 26 novembre ; contrat :
// modules/maps/maquette/choisir_v3.html). Calcul pur : ni page, ni texte, ni état de la Carte ; choose.js les branche. Un toucher CHOISIT
// (plus de case à cocher, plus de « Choisir », plus de plafond de huit) ; chaque candidate a son NUMÉRO dès l'ouverture, qui ne change plus.
//
//   numbering(model) → Map id → numéro (1, 2, 3 …) : les lignes de procédure de toutes les familles du modèle, dans l'ordre des familles (arrivées, puis approches ;
//     départs) et de leur liste, au moment de l'ouverture ; la teinte est celle de (numéro − 1) modulo huit (le neuvième reprend celle du premier : le numéro fait l'identité).
//   dropsFor(model, rwy) → [{ fam, p }] : les procédures choisies qui ne desservent pas la piste rwy (« Changer de piste garde les choix qui desservent la nouvelle
//     piste et retire les autres ») ; p : leur nom. « Aucune » (null) dessert tout et reste.
//   withoutChoice(state, fams) → l'état sans le choix de ces familles (ni choisies ni « Aucune » : sel[f] = undefined).
//   forReturn(state) → l'état pour le retour à Carburant : un choix retiré (undefined) s'écrit « Aucune » (paneReturn : « none »), sinon la procédure d'avant, que le vol portait
//     encore, resterait en place.
import * as PR from '../../frame/lib/procedures.js';
import {
  FAMS
} from '../../frame/lib/pane_model.js';

const PROCS = ['sid', 'star', 'app'];
export function numbering(model, side = 'arr') {
  const out = new Map();
  let n = 0;
  for (const f of FAMS[side].filter(f => PROCS.includes(f)))
    for (const it of model.groups[f]?.rows || []) out.set(it.id, ++n);
  return out;
}
/** La fiche choisie d'une ligne (une famille de SID ou de STAR : celle de ses fiches qui est choisie ; aucune quand la famille n'est que posée avant sa piste : le modèle la résout). */
const recOf = it => it.members ? it.members.find(m => m.chosen)?.rec : it.rec;
export function dropsFor(model, rwy) {
  const r = PR.rwNum(rwy);
  if (!r) return [];
  const out = [];
  for (const f of PROCS) {
    const it = (model.groups[f]?.rows || []).find(x => x.chosen),
      rec = it && recOf(it);
    if (rec && !PR.servesRwy(rec, r)) out.push({
      fam: f,
      p: it.family || PR.nameOf(rec, rec.id) || it.id
    });
  }
  return out;
}
export const withoutChoice = (state, fams) => fams.length ? {
  ...state,
  sel: {
    ...state.sel,
    ...Object.fromEntries(fams.map(f => [f, undefined]))
  }
} : state;
export const forReturn = state => ({
  ...state,
  sel: Object.fromEntries(Object.entries(state.sel).map(([f, v]) => [f, v === undefined ? null : v]))
});
