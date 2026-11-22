// V3 data — l'ENR 3.2 de l'AIP de Belgique et du Luxembourg, déposée à la main (SOG-0541) : les phrases de la ligne de Données, JUGÉES À LA DATE DU JOUR (jamais « en vigueur le <date passée> »), et ce qu'un dépôt accepté dit sur la ligne de la zone.
// Le lanceur dit les jeux (`set` de base/cycle : { inForce, next }, chacun lu par setEntryOf) ; cette page n'invente aucune date : elle choisit la phrase. Tout texte vient de TX.be (quatre langues) ; les dates sont écrites comme dans le reste de la suite.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  lang,
  S,
  tt
} from './state.js';

/** L'identifiant de la source dans la liste du cycle et dans la réponse d'un dépôt. */
export const BE_SOURCE = 'aimbe';
/** Le nom de la source de Belgique dans la langue (le catalogue d'aerodb ne la connaît pas) ; '' pour toute autre source : jamais son identifiant en capitales (« AIMBE »). */
export const beName = id => id === BE_SOURCE ? tt(TX.be.name) : '';
/** La date du jour (AAAA-MM-JJ, UTC) d'un instant. */
const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
const dateOf = iso => iso ? M.dateText(String(iso).slice(0, 10), lang()) : '';
/** Le cycle AIRAC d'une date de cycle, écrit comme partout (« 2611 ») ; la date elle-même sans le calendrier AIRAC. */
const cycleOf = iso => iso && S.airac ? M.cycleName(S.airac, iso) : iso || '';
/** Les jeux jugés à la date du jour : { inForce, expired, next } — un jeu « à venir » dont la date est arrivée est en vigueur (la réponse du lanceur peut dater de la veille, l'écran être resté ouvert) ; un jeu en vigueur dont le cycle est fini est périmé. */
export function judge(set, now = Date.now()) {
  const today = dayOf(now);
  let inForce = set?.inForce || null,
    next = set?.next || null;
  if (next && next.effective <= today) {
    if (!inForce || inForce.effective <= next.effective) inForce = {
      ...next,
      state: 'current'
    };
    next = null;
  }
  return {
    inForce,
    expired: !!inForce && (inForce.state === 'expired' || (!!inForce.expires && inForce.expires <= today)),
    next
  };
}
/** Les phrases d'un jeu jugé : la ligne du jeu en vigueur (ou périmé) puis celle du jeu publié à l'avance ; [] sans jeu. */
export function linesOf(set, now) {
  const j = judge(set, now),
    out = [];
  if (j.inForce) out.push(j.expired ? tt(TX.be.expired, {
    exp: dateOf(j.inForce.expires)
  }) : tt(TX.be.current, {
    dep: dateOf(j.inForce.deposited),
    cycle: cycleOf(j.inForce.cycle),
    amd: dateOf(j.inForce.effective)
  }));
  if (j.next) out.push(tt(TX.be.future, {
    dep: dateOf(j.next.deposited),
    amd: dateOf(j.next.effective)
  }));
  return out;
}
/** La coche « téléchargé » de la fiche de la Belgique : { sign ('yes' | 'todo'), text } ; null quand la liste du cycle ne dit aucun jeu (la ligne générique parle alors). « fait » quand un jeu est en vigueur (le fichier déposé est fait ; ce qui reste, la construction, est dit par sa propre coche
 *  « construit »), « à faire » quand le jeu est périmé ou que seul un jeu à venir existe (la page du cycle en cours manque) ; les phrases du jeu périmé puis du jeu à venir sont dites ensemble. Aucune autre date que celles du jeu (dépôt, amendement, périmé). */
export function tickOf(item, now) {
  if (!item?.set || (!item.set.inForce && !item.set.next)) return null;
  const j = judge(item.set, now);
  return {
    sign: j.inForce && !j.expired ? 'yes' : 'todo',
    text: linesOf(item.set, now).join(' ')
  };
}
/** Ce qu'un dépôt ACCEPTÉ dit sur la ligne de la zone : { lines, level, build } — les phrases du jeu déposé (en vigueur, ou à venir), « pas gardé » quand le jeu est plus ancien que les deux gardés (`kept` ne le nomme pas) ; `build` : la construction de la zone peut suivre
 *  (un jeu en vigueur, nouveau et gardé : un jeu à venir dort jusqu'à sa date, un jeu inchangé ne change rien). `entry` : le jeu lu de la réponse (setEntryOf), `kept` : les noms gardés, `replaced` : faux quand le même jeu était déjà là. */
export function dropLines(entry, kept, replaced, name, now) {
  if (!entry) return {
    lines: [],
    level: 'warn',
    build: false,
    kept: true
  };
  // un jeu plus ancien que les deux gardés : le lanceur l'a écrit puis retiré (il répond 200, `kept` ne le nomme pas) ; pour le pilote rien n'a été déposé, la phrase dit le fichier choisi (SOG-0541, décision de l'ergonome)
  if (Array.isArray(kept) && entry.name && !kept.includes(entry.name)) return {
    lines: [tt(TX.be.notKept, {
      name
    })],
    level: 'warn',
    build: false,
    kept: false
  };
  const future = entry.state === 'future';
  return {
    lines: linesOf(future ? {
      inForce: null,
      next: entry
    } : {
      inForce: entry,
      next: null
    }, now),
    level: future ? 'warn' : 'ok',
    build: !future && replaced !== false && entry.state === 'current',
    kept: true
  };
}
