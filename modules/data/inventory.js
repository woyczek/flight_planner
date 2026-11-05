// V3 data — la carte « Inventaire des données » (SOG-0010, lot E2 ; SPEC § 12) : ce que « data » recouvre sur ce poste, en sept lignes,
// lu du lanceur (GET data/inventory), en lecture seule. Dessine et lit à l'ouverture ; n'écrit rien, ne déplace rien, ne lance aucun
// travail, et ne reprend jamais un chemin de fichier : des noms d'emplacements, des tailles, un état de suivi.
import * as M from './model.js';
import * as I from './model_inventory.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  esc,
  lang,
  S,
  tt
} from './state.js';

/** La route du lanceur (déclarée dans meta.launcher.routes de module.js) : l'inventaire des sept emplacements, ce poste seulement. */
const INVENTORY_ROUTE = 'data/inventory';

/** La phrase d'un état (suivi / local / hors dépôt / inconnu) dans la langue ; le code tel quel pour un état que le texte ne connaît pas. */
const stateWord = s => tt(M.own(TX.inventory.state, s) || TX.inventory.state.unknown);

/** La taille d'une ligne : « 479 Mo », « au moins 5 Go » quand le parcours a été borné, « — » pour un emplacement absent. */
function sizeWord(r) {
  if (!r.present) return tt(TX.inventory.absent);
  const n = M.fmtBytes(r.bytes, lang());
  return r.truncated ? tt(TX.inventory.atLeast, {
    n
  }) : n;
}

/** Les lignes de la carte, d'après la réponse du lanceur : sept <li>, chacune avec le nom de l'emplacement, sa taille, son état de
 *  suivi et son écrivain. Rien (null) sans réponse lisible : la carte le dit plus haut. Aucune valeur du lanceur n'entre sans esc(). */
function rowsHtml(rows) {
  return rows.map(r => `<li data-place="${esc(r.id)}" data-state="${esc(r.state)}" data-present="${r.present}">
    <b>${esc(tt(M.own(TX.inventory.place, r.id)))}</b>
    <span data-size>${esc(sizeWord(r))}</span>
    <span class="f-muted" data-track>${esc(stateWord(r.state))} · ${esc(tt(M.own(TX.inventory.writer, r.writer) || TX.inventory.writer.other))}${r.id === 'backup' && r.count > 1 ? ` (${r.count})` : ''}</span></li>`).join('');
}

/** Le bloc replié « Inventaire des données » : fermé au départ (aucune lecture tant qu'on ne l'ouvre pas), la liste des sept lignes dedans.
 *  Sans lanceur la carte n'existe pas : l'inventaire est celui de ce poste. */
export function inventoryHtml() {
  if (!S?.ctx?.launcher) return '';
  const inv = S.inventory;
  return `<details class="d-inventory" data-inventory${inv?.open ? ' open' : ''}><summary>${esc(tt(TX.inventory.title))}</summary>
    <p class="f-muted">${esc(tt(TX.inventory.intro))}</p>
    ${inv?.state === 'loading' ? `<p class="f-muted" data-inv-state="loading">${esc(tt(TX.inventory.loading))}</p>` : ''}
    ${inv?.state === 'unread' ? `<p class="f-warn" data-inv-state="unread">${esc(tt(TX.inventory.unread))}</p>` : ''}
    ${inv?.rows ? `<ul class="d-inv" data-inventory-list>${rowsHtml(inv.rows)}</ul>
      <p class="f-muted" data-inv-total>${esc(tt(TX.inventory.total, { n: M.fmtBytes(I.inventoryTotal(inv.rows), lang()) }))}</p>` : ''}</details>`;
}

/** Redessine le seul bloc d'inventaire (comme le journal), sans toucher aux autres ni au défilement. */
function redraw() {
  const el = S?.body?.querySelector('[data-inventory]');
  if (el && S.d) keepScroll(S.body, () => el.outerHTML = inventoryHtml());
}
/** Lit l'inventaire une fois, à l'ouverture du bloc (GET data/inventory), et le garde jusqu'à sa fermeture ; une réponse refusée ou
 *  illisible : « unread », rien n'est inventé. Le redessin du bloc fait redéclencher « toggle » (le nouvel élément naît ouvert) : une
 *  lecture déjà faite (réussie ou non) ou en cours ne se refait donc jamais d'elle-même, seulement après une fermeture. */
export async function openInventory() {
  const L = S?.ctx?.launcher;
  if (!L || S.inventory) return;
  const me = S;
  S.inventory = {
    open: true,
    state: 'loading'
  };
  redraw();
  let rows = null;
  try {
    const r = await L.call(INVENTORY_ROUTE);
    rows = I.inventoryRows(r && r.ok !== false ? r : null);
  } catch {
    rows = null;
  }
  if (S !== me || !S.inventory) return; // l'écran a changé, ou le bloc a été fermé pendant la lecture
  S.inventory = {
    open: true,
    state: rows ? 'ready' : 'unread',
    rows
  };
  redraw();
}
