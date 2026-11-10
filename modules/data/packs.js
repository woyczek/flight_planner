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
import {
  updateGate
} from './update.js';

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
/** Le « Mettre à jour (n) » d'un paquet (SOG-0188) : le parcours de mise à jour sur les seuls pays du paquet qui sont dans la couverture (n), sans toucher à la sélection ; absent quand aucun pays du paquet n'y est ; grisé pour la raison du geste (une opération en cours, pas de lanceur, verbe inconnu). */
function packUpdateHtml(p, st) {
  if (!st.inCoverage.length) return '';
  const off = frozen() || updateGate(st.inCoverage).disabled ? ' disabled' : '';
  return `<button type="button" class="d-link" data-act="update-pack" data-pack="${esc(p.id)}"${off}>${esc(tt(TX.upd.updatePack, { n: st.inCoverage.length }))}</button>`;
}
/** La rangée d'un paquet régional : UN INTERRUPTEUR « tout le paquet dans la couverture » (coché quand toutes ses zones y sont, « à moitié » quand une partie y est) : l'allumer ajoute les zones qui manquent, l'éteindre retire toutes ses
 *  zones de la couverture après une confirmation qui nomme ce qui sera décoché (jamais purgé). Le survol ou l'appui de la rangée surligne ses zones sur la carte. */
function regionRow(p) {
  const st = M.packState(p, S.d.zones, S.d.cov.ids);
  if (p.empty || !p.zones.length) return `<li data-pack="${esc(p.id)}" data-empty><b>${esc(nameOf(p))}</b> <span class="f-muted" data-pack-empty>${esc(emptyText(p))}</span></li>`;
  const all = st.known.length > 0 && !st.toAdd.length,
    some = st.inCoverage.length > 0 && st.toAdd.length > 0;
  const line = `<label class="d-opt d-switch"><input type="checkbox" role="switch" data-pack-switch="${esc(p.id)}"${all ? ' checked' : ''}${some ? ' data-mixed' : ''}${frozen() ? ' disabled' : ''} aria-label="${esc(nameOf(p))}"></label><span class="d-packname"><b>${esc(nameOf(p))}</b> <span class="f-muted">${esc([count('country', st.known.length), sizeOf(st)].filter(Boolean).join(' · '))}${some ? ` · ${esc(tt(TX.packs.some, { n: st.inCoverage.length }))}` : ''}</span></span>${packUpdateHtml(p, st)}`;
  return `<li data-pack="${esc(p.id)}" data-kind="region"${zonesAttr(st)}>${countriesHtml(p, st, line)}${notesHtml(p, st)}</li>`;
}
/** Le pli « Pays (n) » d'une rangée régionale (SOG-0186), replié par défaut : les pays du paquet dans la même grille que la liste des zones, une case chacun (cochée = déjà dans la couverture) ; cocher ajoute ce pays seul, décocher le retire après la
 *  question des thèmes (jamais purgé), sans rien télécharger ni construire. Ouvert, sa hauteur est bornée et il défile en lui-même : les paquets voisins restent à portée. */
function countriesHtml(p, st, line) {
  const cov = new Set(S.d.cov.ids),
    off = frozen() ? ' disabled' : '',
    key = `c:${p.id}`;
  return `<details class="d-pack d-pack-countries" data-pack-fold="${esc(key)}"${S.packOpen.has(key) ? ' open' : ''}><summary class="d-packline">${line}</summary>
    <div class="d-opts" data-pack-zones>${st.known.map(z => `<div class="d-zrow" data-pack-zone-row="${esc(z)}"><label class="d-opt"><input type="checkbox" data-pack-cov="${esc(z)}"${cov.has(z) ? ' checked' : ''}${off}><span>${esc(M.zoneName(S.d.zones, z, li()))}</span></label></div>`).join('')}</div></details>`;
}
/** Un thème : un pli (son nom, le nombre de pays et ce qui reste à ajouter) qui montre ses pays dans la MÊME grille que la liste des zones — une case (dans la couverture ou non), le nom — l'état d'un pays de la couverture est dit une fois, dans la liste des zones — et, en tête, un interrupteur
 *  « tout le thème » ; plus aucun bouton dans une ligne (SOG-0165) : cocher un pays l'ajoute à la couverture, le décocher l'en retire après une question (jamais purgé). */
function themeRow(p) {
  const st = M.packState(p, S.d.zones, S.d.cov.ids);
  if (p.empty || !p.zones.length) return `<li data-pack="${esc(p.id)}" data-empty><b>${esc(nameOf(p))}</b> <span class="f-muted" data-pack-empty>${esc(emptyText(p))}</span></li>`;
  const cov = new Set(S.d.cov.ids),
    all = st.known.length > 0 && !st.toAdd.length,
    some = st.inCoverage.length > 0 && st.toAdd.length > 0,
    off = frozen() ? ' disabled' : '';
  return `<li data-pack="${esc(p.id)}" data-kind="theme"${zonesAttr(st)}><details class="d-pack" data-pack-theme="${esc(p.id)}"${S.packOpen.has(p.id) ? ' open' : ''}>
    <summary><b>${esc(nameOf(p))}</b> <span class="f-muted">${esc(tt(TX.packs.themeCount, { n: count('country', st.known.length), m: st.toAdd.length }))}</span>${packUpdateHtml(p, st)}</summary>
    <div class="d-opts" data-pack-zones>
      <div class="d-zrow"><label class="d-opt"><input type="checkbox" role="switch" data-pack-switch="${esc(p.id)}"${all ? ' checked' : ''}${some ? ' data-mixed' : ''}${off}><span><b>${esc(tt(TX.packs.themeAll))}</b></span></label></div>
      ${st.known.map(z => `<div class="d-zrow" data-pack-zone-row="${esc(z)}"><label class="d-opt"><input type="checkbox" data-pack-cov="${esc(z)}"${cov.has(z) ? ' checked' : ''}${off}><span>${esc(M.zoneName(S.d.zones, z, li()))}</span></label></div>`).join('')}
    </div>
    ${notesHtml(p, st)}</details></li>`;
}
/** Le bloc des paquets (dans la carte de la couverture) : les paquets régionaux puis les filtres thématiques ; '' sans `packs()` ou sans paquet lisible. */
export function packsHtml() {
  const packs = S.d?.packs;
  if (!Array.isArray(packs) || !packs.length || !Array.isArray(S.d.zones)) return '';
  const regions = packs.filter(p => p.kind === 'region'),
    themes = packs.filter(p => p.kind === 'theme'),
    tab = (S.packTab === 'themes' && themes.length) || !regions.length ? 'themes' : 'regions',
    btn = (k, n) => `<button type="button" data-pack-tab="${k}" aria-pressed="${tab === k}">${esc(tt(k === 'regions' ? TX.packs.regions : TX.packs.themes))} (${n})</button>`;
  return `<details class="d-packs-fold" data-packs-fold${S.packsOpen ? ' open' : ''}><summary><h3>${esc(tt(TX.packs.title))}</h3></summary><div data-packs>
    ${regions.length && themes.length ? `<div class="d-tabs" data-pack-tabs>${btn('regions', regions.length)}${btn('themes', themes.length)}</div>` : ''}
    ${regions.length ? `<ul class="d-packs" data-pack-regions${tab === 'regions' ? '' : ' hidden'}>${regions.map(regionRow).join('')}</ul>` : ''}
    ${themes.length ? `<div data-pack-themes-box${tab === 'themes' ? '' : ' hidden'}><p class="f-muted">${esc(tt(TX.packs.themesHint))}</p><ul class="d-packs" data-pack-themes>${themes.map(themeRow).join('')}</ul></div>` : ''}</div></details>`;
}
/** L'onglet des paquets (Régions | Thèmes) : le choix tient d'un dessin à l'autre. */
export function setPackTab(tab) {
  S.packTab = tab === 'themes' ? 'themes' : 'regions';
  renderBuild();
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
/** La case d'un pays d'un thème : cochée, le pays entre dans la couverture (la même route que « Ajouter un pays ») ; décochée, une question (la zone sort de la couverture de ce poste, JAMAIS purgée), puis le retrait ; sans réponse oui,
 *  la case revient. `packId` : le thème, dont le nom est dit dans la question. */
export async function togglePackZone(id, on, packId) {
  const me = S;
  if (frozen() || !S.d || !S.d.zones.some(z => z.id === id)) return renderBuild();
  if (on) return void addZones([id]);
  if (!S.d.cov.ids.includes(id)) return renderBuild();
  const p = (S.d.packs || []).find(x => x.id === packId);
  const yes = await S.ctx.ask(tt(TX.packs.removeAsk, {
    n: count('zone', 1),
    p: p ? nameOf(p) : '',
    z: M.zoneName(S.d.zones, id, li())
  }), {
    ok: tt(TX.packs.remove)
  });
  if (S !== me) return;
  if (!yes) return renderBuild();
  if (removeZones([id])) S.ctx.notify(tt(TX.packs.removed, {
    n: count('zone', 1),
    p: p ? nameOf(p) : ''
  }), 'ok');
}
