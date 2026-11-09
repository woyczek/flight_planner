// V3 data — les paquets de pays de la couverture (SPEC § 5.10, V3_SPECIFICATION § 10.42, SOG-0065) : une rangée par paquet régional (nom, nombre de pays, taille, ce qui est déjà dans la couverture, « Ajouter tout ») et, pour les paquets thématiques, un FILTRE (les zones qui touchent
// l'objet : il en montre, il n'en ajoute aucune de lui-même ; chaque ajout est un geste). Rien n'est construit ni publié par un paquet : « Ajouter tout » écrit la couverture du poste comme « Ajouter un pays » (une zone déjà là n'est jamais dupliquée). Invisible sans `ctx.aerodb.packs()`.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  count,
  esc,
  frozen,
  lang,
  li,
  S,
  tt
} from './state.js';
import {
  addZones,
  removeZones
} from './screen.js';
import {
  renderBuild
} from './panels.js';

/** Le nom d'un paquet dans la langue (index li). */
const nameOf = p => p.names[li()] || p.names[0];
/** La taille d'un ensemble de zones en texte (« 78,0 Mo », « + » si une taille manque) ; '' sans aucune taille. */
function sizeOf(st) {
  return st.size.known ? `${M.fmtBytes(st.size.kb * 1024, lang())}${st.size.known < st.known.length ? '+' : ''}` : '';
}
/** La phrase d'un paquet vide : la raison que dit AeroDB (code court), à défaut une phrase générale. */
const emptyText = p => tt(M.own(TX.packs.emptyWhy, p.empty) || TX.packs.emptyWhy.unknown);
/** Les mentions d'un paquet sous son nom : zones inconnues de la suite (ignorées) et pays « en partie ». */
function notesHtml(p, st) {
  return `${st.partial ? `<span class="f-muted" data-pack-partial>${esc(tt(TX.packs.partial, { n: st.partial }))}</span> ` : ''}${st.unknown.length ? `<span class="f-muted" data-pack-unknown>${esc(tt(TX.packs.unknown, { n: st.unknown.length }))}</span>` : ''}`;
}
/** Les zones d'un paquet que la suite connaît, en attribut de la rangée : la surbrillance de la carte les lit (survol ou appui). */
const zonesAttr = st => ` data-zones="${esc(st.known.join(','))}"`;
/** Le bouton « Ajouter tout » d'un paquet (les filtres thématiques) : gris (sa raison dite) quand tout est déjà dans la couverture ou pendant une marche. */
function addAllHtml(p, st) {
  const none = !st.toAdd.length;
  return `<button type="button" data-act="pack-add" data-pack="${esc(p.id)}"${none || frozen() ? ' disabled' : ''}>${esc(none ? tt(TX.packs.allIn) : tt(TX.packs.addAll, { n: st.toAdd.length }))}</button>`;
}
/** La rangée d'un paquet régional : UN INTERRUPTEUR « tout le paquet dans la couverture » (coché quand toutes ses zones y sont, « à moitié » quand une partie y est) : l'allumer ajoute les zones qui manquent, l'éteindre retire toutes ses
 *  zones de la couverture après une confirmation qui nomme ce qui sera décoché (jamais purgé). Le survol ou l'appui de la rangée surligne ses zones sur la carte. */
function regionRow(p) {
  const st = M.packState(p, S.d.zones, S.d.cov.ids);
  if (p.empty || !p.zones.length) return `<li data-pack="${esc(p.id)}" data-empty><b>${esc(nameOf(p))}</b> <span class="f-muted" data-pack-empty>${esc(emptyText(p))}</span></li>`;
  const all = st.known.length > 0 && !st.toAdd.length,
    some = st.inCoverage.length > 0 && st.toAdd.length > 0;
  return `<li data-pack="${esc(p.id)}" data-kind="region"${zonesAttr(st)}><label class="d-opt"><input type="checkbox" role="switch" data-pack-switch="${esc(p.id)}"${all ? ' checked' : ''}${some ? ' data-mixed' : ''}${frozen() ? ' disabled' : ''}><span><b>${esc(nameOf(p))}</b> <span class="f-muted">${esc([count('country', st.known.length), sizeOf(st)].filter(Boolean).join(' · '))}${some ? ` · ${esc(tt(TX.packs.some, { n: st.inCoverage.length }))}` : ''}</span></span></label>
    ${notesHtml(p, st)}</li>`;
}
/** Le filtre d'un paquet thématique : un pli qui montre ses zones (déjà dans la couverture, ou « Ajouter » une à une) ; rien n'est ajouté tant qu'on ne touche pas. */
function themeRow(p) {
  const st = M.packState(p, S.d.zones, S.d.cov.ids);
  if (p.empty || !p.zones.length) return `<li data-pack="${esc(p.id)}" data-empty><b>${esc(nameOf(p))}</b> <span class="f-muted" data-pack-empty>${esc(emptyText(p))}</span></li>`;
  const cov = new Set(S.d.cov.ids);
  return `<li data-pack="${esc(p.id)}" data-kind="theme"${zonesAttr(st)}><details class="d-pack" data-pack-theme="${esc(p.id)}"${S.packOpen.has(p.id) ? ' open' : ''}>
    <summary><b>${esc(nameOf(p))}</b> <span class="f-muted">${esc(tt(TX.packs.themeCount, { n: count('country', st.known.length), m: st.toAdd.length }))}</span></summary>
    <ul>${st.known.map(z => `<li data-pack-zone="${esc(z)}">${esc(M.zoneName(S.d.zones, z, li()))} ${cov.has(z) ? `<span class="f-muted">${esc(tt(TX.packs.inCoverage))}</span>` : `<button type="button" data-act="pack-add-zone" data-zone="${esc(z)}"${frozen() ? ' disabled' : ''}>${esc(tt(TX.packs.addOne))}</button>`}</li>`).join('')}</ul>
    ${notesHtml(p, st)}${st.toAdd.length > 1 ? addAllHtml(p, st) : ''}</details></li>`;
}
/** Le bloc des paquets (dans la carte de la couverture) : les paquets régionaux puis les filtres thématiques ; '' sans `packs()` ou sans paquet lisible. */
export function packsHtml() {
  const packs = S.d?.packs;
  if (!Array.isArray(packs) || !packs.length || !Array.isArray(S.d.zones)) return '';
  const regions = packs.filter(p => p.kind === 'region'),
    themes = packs.filter(p => p.kind === 'theme');
  return `<div data-packs><h3>${esc(tt(TX.packs.title))}</h3>
    ${regions.length ? `<ul class="d-packs" data-pack-regions>${regions.map(regionRow).join('')}</ul>` : ''}
    ${themes.length ? `<h4>${esc(tt(TX.packs.themes))}</h4><p class="f-muted">${esc(tt(TX.packs.themesHint))}</p><ul class="d-packs" data-pack-themes>${themes.map(themeRow).join('')}</ul>` : ''}</div>`;
}
/** « Ajouter tout » : les zones du paquet connues de la suite et pas encore dans la couverture y entrent (cochées, écrites d'un coup) ; une phrase dit combien. Jamais de doublon, jamais une construction. */
export function addPack(id) {
  const p = (S.d?.packs || []).find(x => x.id === id);
  if (!p || frozen()) return;
  const n = addZones(M.packState(p, S.d.zones, S.d.cov.ids).toAdd);
  if (n) S.ctx.notify(tt(TX.packs.added, {
    n: count('zone', n),
    p: nameOf(p)
  }), 'ok');
}
/** Le « Ajouter » d'une zone d'un filtre thématique : la même route que « Ajouter un pays ». */
export function addPackZone(id) {
  addZones([id]);
}
/** Les interrupteurs « à moitié » (aucun attribut HTML ne le dit) : posés après chaque dessin. */
export function syncPackSwitches(root = S?.body) {
  for (const el of root?.querySelectorAll('input[data-pack-switch]') || []) el.indeterminate = el.hasAttribute('data-mixed');
}
/** Le mot d'un paquet à propos de ses zones : leurs noms dans la langue, cinq au plus puis « … » (la confirmation d'un retrait les nomme). */
function namesOf(ids) {
  const names = ids.map(z => M.zoneName(S.d.zones, z, li()));
  return names.slice(0, 12).join(', ') + (names.length > 12 ? ` … (+${names.length - 12})` : '');
}
/** L'interrupteur d'un paquet régional : allumé, « Ajouter tout » ; éteint, une question qui nomme les zones retirées (décochées de la sélection, retirées de la couverture de ce poste, JAMAIS purgées : leurs fichiers restent), puis le retrait ; sans réponse oui, l'interrupteur revient. */
export async function togglePack(id, on) {
  const p = (S.d?.packs || []).find(x => x.id === id),
    me = S;
  if (!p || frozen()) return renderBuild();
  const st = M.packState(p, S.d.zones, S.d.cov.ids);
  if (on) return addPack(id);
  if (!st.inCoverage.length) return renderBuild();
  const yes = await S.ctx.ask(tt(TX.packs.removeAsk, {
    n: count('zone', st.inCoverage.length),
    p: nameOf(p),
    z: namesOf(st.inCoverage)
  }), {
    ok: tt(TX.packs.remove)
  });
  if (S !== me) return;
  if (!yes) return renderBuild();
  const n = removeZones(st.inCoverage);
  if (n) S.ctx.notify(tt(TX.packs.removed, {
    n: count('zone', n),
    p: nameOf(p)
  }), 'ok');
}
