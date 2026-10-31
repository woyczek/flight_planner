// V3 data — l'état de l'écran monté et la petite trousse que tous les fichiers du module utilisent (SPEC § 11) : `S` (un seul écrivain, setState, appelé au montage et au démontage), les
// constantes (documents gardés, routes du lanceur) et esc / tt / lang / li / count / kind / ask / catSource / busyNow / frozen. Ne dessine rien, ne lance rien.
import {
  TX
} from './texts.js';

export const COVERAGE = 'cache/data/coverage.json'; // { zones: [id], updated_at } : la couverture de ce poste (SPEC § 3.2)
export const JOURNAL = 'cache/data/journal.json'; // { ops: [opération], updated_at } : les 50 dernières opérations de ce poste (SPEC § 7)
export const ROUTE = 'regen/job'; // le travail du lanceur : construction de la base (verbe D5 d'aerodb)
export const VERBS_ROUTE = 'regen/verbs'; // { verbs: ['base/build', …] } : les opérations que ce lanceur connaît (lue une fois au montage)
export const STATUS_ROUTE = 'sync-status?fresh=1'; // l'état de data/ (fichiers modifiés, commits à envoyer, fusion) ; relevé refait
const LANGS = ['fr', 'en', 'de', 'es'];
export let S = null;
/** Échappe un texte pour le HTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Texte d'une ligne [fr, en, de, es] dans la langue de l'appli. */
export const tt = (row, v) => S.ctx.t(row, v);
/** Langue de l'appli (« fr », « en », « de », « es »). */
export const lang = () => S.ctx.lang?.() || 'fr';
/** Rang de la langue de l'appli dans une ligne [fr, en, de, es]. */
export const li = () => Math.max(0, LANGS.indexOf(lang()));
/** « 3 zones » : le nombre et le nom de l'unité, au singulier ou au pluriel (TX.unit). */
export const count = (unit, n) => `${n} ${tt(TX.unit[unit][n === 1 ? 0 : 1])}`;
/** Attribut data-kind d'un badge ou d'un point, absent quand il n'y a pas de couleur. */
export const kind = k => k ? ` data-kind="${esc(k)}"` : '';
/** Un appel d'aerodb qui ne lève jamais : sa réponse, ou null s'il manque, échoue ou ne répond rien. */
export async function ask(name) {
  const ab = S.ctx.aerodb;
  try {
    return typeof ab?.[name] === 'function' ? (await ab[name]()) ?? null : null;
  } catch {
    return null;
  }
}
/** Une opération tourne-t-elle sur ce poste, de n'importe quel jeu ? Le nôtre, un autre travail du lanceur, la question d'une purge ou d'une
 *  publication de fiches, une publication : une opération à la fois, tous panneaux confondus. */
export function busyNow() {
  return !!S.run || !!S.other || !!S.asking || !!S.pub.phase || !!S.chain;
}
/** Les choix des panneaux sont-ils figés ? Pendant une marche et pendant toute la chaîne (y compris entre deux de ses opérations). */
export const frozen = () => !!S.run || !!S.chain;
/** Une source du catalogue d'aerodb par son identifiant (byId, à défaut une recherche dans SOURCES) ; undefined si elle n'y est pas. */
export function catSource(id) {
  const cat = S.d.cat;
  return cat?.byId ? cat.byId(id) : cat?.SOURCES?.find(s => s.id === id);
}
/** Remplace l'état de l'écran monté (`S`) : le seul endroit où `S` change de valeur (au montage, puis `null` au démontage) ; les autres fichiers lisent `S` (une liaison vivante) et écrivent ses champs. */
export function setState(v) {
  S = v;
}
