// V3 data — les trois blocs repliés sous « Publier » (SOG-0262, lot C), dans cet ordre : « Cycle suivant » (ce que Téléchargements a déjà pour le cycle suivant, ce qui reste à aller chercher à la main, ce que le poste prendra seul quand il sera en vigueur), « Quand ça change » (ce qui bouge en dehors du cycle
// AIRAC : X-Plane, Little Navmap, openAIP, GeoNames, MORA, les routes NAT, en information — chacun avec sa dernière date et, quand cela existe, le geste pour le rafraîchir) et « Vu par le poste, pas encore lu par la suite » (ce qui est dans Téléchargements et que la suite ne lit pas : rien à faire). Les deux
// premiers se lisent dans la liste du cycle (base/cycle : `next`, `unread`), lue une fois à l'ouverture par countries.js — aucun appel de plus. La validité des routes NAT se lit à l'ouverture du bloc « Quand ça change » (natState, information seulement : la donnée est du jour,
// elle se lit à l'étape Route d'un vol transatlantique, SOG-0352). Tout ce que dit le lanceur est une entrée non fiable : le modèle (model_countries.js) l'a borné, tout est échappé ici.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  fmtDateZ
} from '../../frame/lib/time.js'; // heures en UTC (« 16:30Z »)
import {
  busyNow,
  catSource,
  count,
  esc,
  lang,
  li,
  S,
  serial,
  tt
} from './state.js';
import {
  gateOf,
  greyOnce
} from './panels.js';
import {
  dateOf
} from './countries.js';
import {
  regInit,
  registryBody,
  registryPill
} from './registry.js';
import {
  toursBody,
  toursInit,
  toursPill
} from './tours.js';
import {
  startOp
} from './follow.js';
import {
  busyCardHtml,
  showBusy
} from './busy.js';

/** L'état propre à ces blocs, créé avec celui de la carte : les plis ouverts à la main (retenus d'un dessin à l'autre) et la lecture des routes NAT. */
export const lcInit = () => ({
  open: {},
  reg: regInit(), // le pli du registre français des aéronefs (registry.js)
  tours: toursInit(), // le pli des tours de piste VFR de l'extracteur de l'utilisateur (tours.js)
  revealUntil: 0,
  reveal: '', // un pli à ouvrir et à amener dans la vue au prochain dessin (l'adresse #data?registry=1)
  nat: {
    phase: 'idle',
    state: null
  }
});
/** Ce que la liste du cycle a donné (lue) : null tant qu'elle ne l'est pas. */
const cycleData = () => S.cw?.todo?.state === 'ready' ? S.cw.todo.data : null;
/** Le nom court d'une source : celui du catalogue, à défaut celui de la liste du cycle, à défaut son identifiant. */
const srcName = (id, data) => String(catSource(id)?.n?.[li()] || data?.items?.[id]?.label?.[li()] || id).replace(/\s*\(.*\)\s*$/, '');
/** Un pli : son titre et son contenu ; l'état ouvert / fermé est retenu à la main. */
const fold = (id, title, body, pill = '') => `<details class="d-lc" data-lc-fold="${id}"${S.cw.lc.open[id] ? ' open' : ''}><summary><span class="d-lct">${esc(title)}</span>${pill ? ` <span class="d-pill" data-lc-pill>${esc(pill)}</span>` : ''}<i class="d-chev" aria-hidden="true"></i></summary>${body}</details>`;

// ------------------------------------------------------------------------------------------------ Cycle suivant
/** « Cycle suivant (2612) » : trois listes — déjà dans Téléchargements (par les noms de fichiers), à aller chercher à la main, que le poste prendra seul quand il sera en vigueur — puis, à part, ce que l'éditeur n'offre plus ; '' tant que la liste du cycle n'est pas lue. */
function nextHtml() {
  const data = cycleData(),
    n = data?.later;
  if (!n) return '';
  const line = it => `<li data-later-item="${esc(it.id)}" data-later-state="${esc(it.state)}"><b>${esc(srcName(it.id, data))}</b>${it.files.length ? ` : ${esc(it.files.join(', '))}` : ''}</li>`,
    part = st => {
      const list = n.items.filter(it => it.state === st);
      return list.length ? `<h4 data-later-title="${st}">${esc(tt(TX.lc.laterState[st]))}</h4><ul class="d-lcl" data-later-list="${st}">${list.map(line).join('')}</ul>` : '';
    },
    gone = n.items.filter(it => it.state === 'unavailable'),
    body = ['in-downloads', 'to-take', 'will-be-taken'].map(part).join('') + (gone.length ? `<h4 class="f-muted" data-later-gone-title>${esc(tt(TX.cw.unavailableTitle))}</h4><ul class="d-lcl" data-later-gone>${gone.map(it => `<li data-later-item="${esc(it.id)}" data-later-state="unavailable"><b>${esc(srcName(it.id, data))}</b></li>`).join('')}</ul>` : '');
  return fold('later', n.id ? tt(TX.lc.laterTitle, {
    c: n.id
  }) : tt(TX.lc.laterTitleNo), body || `<p class="f-muted" data-later-none>${esc(tt(TX.lc.laterNone))}</p>`, n.items.some(it => it.state === 'in-downloads') ? `${count('file', n.items.filter(it => it.state === 'in-downloads').length)} ${tt(TX.d2.pillHere)}` : '');
}

// ------------------------------------------------------------------------------------------------ Quand ça change
/** Ce qui change en dehors du cycle, dans l'ordre de l'écran : l'identifiant, la source de la liste du cycle qui en donne la date (`cyc`) et le geste que cet écran offre déjà (`act` : 'build' = « Recalculer » la base d'après ce que ce poste lit, 'fetch' = relancer le téléchargement des sources automatiques,
 *  'nat' = la reprise à l'ouverture du pli, null = aucun geste ici : la ligne dit sa date seule). */
const CHANGE = Object.freeze([{
  id: 'xplane',
  cyc: 'xplane',
  act: 'build'
}, {
  id: 'lnm',
  cyc: '',
  act: null
}, {
  id: 'openaip',
  cyc: 'openaip',
  act: 'fetch'
}, {
  id: 'geonames',
  cyc: 'geonames',
  act: null
}, {
  id: 'mora',
  cyc: 'mora',
  act: 'fetch'
}, {
  id: 'nat',
  cyc: '',
  act: 'nat'
}]);
/** La source calculée ou lue sur ce poste que base/cycle dit à part (`local`, K185 : MORA, X-Plane…) : { id, label[4], at, personal, zoneCount } ; null sans. C'est LA source de ces lignes (model_countries.js ramène à la même forme un lanceur qui les laisse encore dans `items`). */
const localOf = (id, data) => data?.local?.find(x => x.id === id) || null;
/** La date de la dernière prise d'une source (celle de la liste du cycle : le jour du fichier, à défaut le jour de son cycle) ; '' sans. */
function lastOf(cyc, data) {
  const d = cyc ? data?.items?.[cyc]?.download : null;
  return d?.at ? dateOf(d.at) : d?.cycle ? M.dateText(d.cycle, lang()) : '';
}
/** La phrase de la validité des routes NAT, en information seulement : en lecture, « valides jusqu'à 19:00Z », « périmées », « aucune route prise », « validité inconnue », puis OÙ elles se lisent (l'étape Route d'un vol transatlantique : la donnée est du jour, cet écran est au rythme du cycle). Rien n'est repris d'ici (SOG-0352). */
export function natText() {
  const n = S.cw.lc.nat,
    T = TX.lc.nat;
  if (n.phase === 'idle') return '';
  if (n.phase === 'reading') return tt(T.reading);
  const s = n.state,
    where = tt(T.where);
  if (!s) return `${tt(T.unknown)} — ${where}`;
  if (!s.present) return `${tt(T.none)} — ${where}`;
  const until = s.validUntil ? fmtDateZ(s.validUntil, lang()) : '',
    head = s.expired === null || !until ? tt(T.unknown) : tt(s.expired ? T.expired : T.valid, {
      d: until
    });
  return `${head}${s.count ? ` · ${tt(T.count, { n: s.count })}` : ''} — ${where}`;
}
/** Une ligne de « Quand ça change » : son nom, sa dernière date (ou la validité des routes NAT), la note de ce que fait son geste, le geste (gris pour sa raison, écrite une fois sous la liste). */
function changeLine(c, data, grey) {
  const name = tt(TX.lc.changeName[c.id]),
    loc = c.act === 'nat' ? null : localOf(c.id, data), // calculée sur ce poste : « calculée le … » et pour combien de pays
    last = c.act === 'nat' ? natText() : loc ? (loc.at ? dateOf(loc.at) : '') : lastOf(c.cyc, data),
    shown = c.act === 'nat' ? last : last ? tt(loc ? TX.d3.changeComputed : TX.lc.changeLast, {
      d: last
    }) : tt(TX.lc.changeNoDate),
    note = M.own(TX.lc.changeNote, c.id) || (c.act === 'build' || c.act === 'fetch' ? TX.lc.changeNote[c.act] : null),
    gate = c.act === 'build' || c.act === 'fetch' ? gateOf('base', S.ticked?.size || 0, [c.act]).verbs[c.act] : null;
  if (gate?.disabled && gate.reason) grey.add(gate.reason);
  return `<li class="d-chg" data-change="${esc(c.id)}"><p><b>${esc(name)}</b> <span class="f-muted" data-change-last>${esc(shown)}</span>${loc?.zoneCount > 0 ? ` <span class="f-muted" data-change-zones>${esc(tt(TX.d3.changeZones, { z: count('country', loc.zoneCount) }))}</span>` : ''}</p>${note ? `<p class="f-muted" data-change-note>${esc(tt(note))}</p>` : ''}${gate ? `<p class="d-verbs"><button type="button" data-act="change-act" data-change="${esc(c.id)}" data-kind="${c.act}"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.lc.changeAct[c.act]))}</button></p>` : ''}</li>`;
}
/** Une source calculée sur ce poste que la page n'a pas dans ses six lignes (`local` en dit plus que CHANGE) : son nom dit par le lanceur (dans la langue), sa date, le nombre de pays ; aucun geste. */
function extraLine(l) {
  const at = l.at ? dateOf(l.at) : '';
  return `<li class="d-chg" data-change="${esc(l.id)}" data-change-extra><p><b>${esc(l.label[li()])}</b> <span class="f-muted" data-change-last>${esc(at ? tt(TX.d3.changeComputed, { d: at }) : tt(TX.lc.changeNoDate))}</span>${l.zoneCount > 0 ? ` <span class="f-muted" data-change-zones>${esc(tt(TX.d3.changeZones, { z: count('country', l.zoneCount) }))}</span>` : ''}</p></li>`;
}
/** « Quand ça change » : les six lignes (et celles des autres sources calculées sur ce poste que le lanceur dit) ; toujours dessiné avec le catalogue (les routes NAT se lisent sans le lanceur de la liste du cycle). */
function changeHtml() {
  if (!S.d?.cat) return '';
  const data = cycleData(),
    grey = new Set(),
    extra = (data?.local || []).filter(l => !CHANGE.some(c => c.id === l.id)),
    lines = CHANGE.map(c => changeLine(c, data, grey)).join('') + extra.map(extraLine).join(''),
    why = [...grey].find(r => greyOnce(r, 'base'));
  return fold('change', tt(TX.lc.changeTitle), `<p class="f-muted">${esc(tt(TX.lc.changeHint))}</p><ul class="d-lcl d-chgl" data-change-list>${lines}</ul>${busyCardHtml('base', 'later')}${why ? `<p class="f-muted" data-change-reason="${esc(why)}">${esc(tt(TX.greyReason[why]))}</p>` : ''}`, tt(TX.d2.pillSources, {
    n: CHANGE.length + extra.length
  }));
}
/** Le geste d'une ligne : « Recalculer » (la construction de la base de la couverture) ou « Télécharger de nouveau » (le téléchargement des sources automatiques) : les verbes de la base que l'écran a déjà, avec leur question et leur marche. */
export function changeAct(kind) {
  if (kind === 'build' || kind === 'fetch') startOp('base', kind);
}

// ------------------------------------------------------------------------------------------------ Vu par le poste, pas encore lu
/** « Vu par le poste, pas encore lu par la suite » : une ligne par fichier-source vu dans Téléchargements que la suite ne lit pas — ses noms de fichiers, sa raison en mots (« pas de lecteur », « format non reconnu ») et la note du lanceur (un nom EK_ peut être du Danemark OU des Féroé). Rien n'est un geste. ''
 *  tant que la liste n'est pas lue ou quand rien n'est dans ce cas. */
function unreadHtml() {
  const u = cycleData()?.unread;
  if (!u?.length) return '';
  const line = it => `<li data-unread="${esc(it.id)}" data-unread-reason="${esc(it.reason)}"><b>${esc(M.own(TX.lc.unreadName, it.id) ? tt(TX.lc.unreadName[it.id]) : srcName(it.id, null))}</b>${it.files.length ? ` : ${esc(it.files.join(', '))}` : ''} — <span data-unread-why>${esc(tt(TX.lc.unreadReason[it.reason]))}</span>${it.note ? `<br><span class="f-muted" data-unread-note>${esc(it.note)}</span>` : ''}</li>`;
  return fold('unread', tt(TX.lc.unreadTitle), `<p class="f-muted">${esc(tt(TX.lc.unreadHint))}</p><ul class="d-lcl" data-unread-list>${u.map(line).join('')}</ul>`, count('file', u.length));
}

// ------------------------------------------------------------------------------------------------ l'ensemble
/** « Registre français des aéronefs » (SOG-0315) : le dépôt du fichier d'immatriculations ; plié, avec l'état du fichier dans la pastille. */
function registryHtml() {
  if (!S.d?.cat) return '';
  return fold('registry', tt(TX.regs.title), registryBody(), registryPill());
}
/** « Tours de piste VFR » (SOG-0253) : le dépôt du XML de l'extracteur de l'utilisateur ; plié, avec ce que le lanceur en a lu dans la pastille. */
function toursHtml() {
  if (!S.d?.cat) return '';
  return fold('tours', tt(TX.trk.title), toursBody(), toursPill());
}
/** Les blocs repliés, dans l'ordre : cycle suivant, quand ça change, vu par le poste pas encore lu, registre français des aéronefs. */
export function laterHtml() {
  if (!S.cw?.lc) return '';
  if (S.cw.lc.reveal) S.cw.lc.open[S.cw.lc.reveal] = true; // l'adresse a demandé ce pli : il s'ouvre
  return `<div class="d-later" data-later-blocks>${nextHtml()}${changeHtml()}${unreadHtml()}${registryHtml()}${toursHtml()}</div>`;
}
/** Redessine les trois blocs seuls (la lecture des routes NAT avance sans toucher le reste de l'écran). */
export function renderLater() {
  const el = S?.body?.querySelector('[data-later-blocks]');
  if (el && S.d) keepScroll(S.body, () => {
    el.outerHTML = laterHtml();
  });
  const lc = S?.cw?.lc;
  if (lc?.reveal && lc.revealUntil && Date.now() > lc.revealUntil) lc.reveal = '';
  else if (lc?.reveal) holdReveal(lc.reveal);
}
/** L'adresse a demandé un pli (« #data?registry=1 ») : il vient dans la vue et y reste pendant ses premières secondes, même quand l'écran se complète au-dessus de lui (la carte, la liste du mois) ou que le cadre remet la page en haut ; l'utilisateur qui défile, touche ou tape reprend la main. */
function holdReveal(id) {
  const lc = S.cw.lc;
  if (lc.iv || !S.body?.querySelector(`[data-lc-fold="${CSS.escape(id)}"]`)) return; // déjà en route, ou le pli n'est pas encore dessiné (le catalogue arrive)
  lc.revealUntil ||= Date.now() + 15000; // les quinze secondes partent de sa première apparition
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'],
    stop = () => {
      lc.reveal = '';
      clearInterval(lc.iv);
      lc.iv = 0;
      for (const ev of events) window.removeEventListener(ev, stop, true);
    },
    go = () => {
      const f = S?.body?.querySelector(`[data-lc-fold="${CSS.escape(id)}"]`);
      if (!f || lc.reveal !== id || Date.now() > lc.revealUntil) return stop();
      const top = f.getBoundingClientRect().top;
      if (top < 24 || top > 140) f.scrollIntoView({
        block: 'start'
      }); // sous l'en-tête du cadre (scroll-margin-top du pli)
    };
  go();
  lc.iv = setInterval(go, 250);
  for (const ev of events) window.addEventListener(ev, stop, true);
}
/** L'ouverture d'un pli : l'état est retenu ; celui de « Quand ça change » lit la validité des routes NAT (information seulement). */
export function toggleLc(id, open) {
  const was = !!S.cw.lc.open[id];
  S.cw.lc.open[id] = open;
  if (open && !was && id === 'change')
    natRead(); // un pli redessiné déjà ouvert rejoue l'événement toggle : seule l'ouverture à la main lit les routes
}
/** Lit la validité des routes NAT (aerodb.natState, rien demandé au réseau) pour la ligne d'information de « Quand ça change » ; rien n'est repris d'ici : la lecture du jour se fait à l'étape Route (SOG-0352). */
export async function natRead() {
  const n = S.cw.lc.nat,
    ab = S.ctx.aerodb,
    me = S;
  if (n.phase === 'reading') return;
  if (typeof ab?.natState !== 'function') {
    n.phase = 'ready';
    n.state = null;
    return renderLater();
  }
  n.phase = 'reading';
  renderLater();
  let s = null;
  try {
    s = await ab.natState();
  } catch {
    s = null;
  }
  if (S !== me) return;
  n.state = s;
  n.phase = 'ready';
  renderLater();
}
/** La mise en page de ces blocs (à côté de TODO_STYLE) : chaque pli a un titre de la taille d'un doigt, ses listes sans puce, les boutons à 44 px. */
export const LATER_STYLE = `
[data-module="data"] .d-later{display:grid;gap:8px;margin:12px 0;min-width:0}
[data-module="data"] details.d-lc{scroll-margin-top:72px;border:1px solid var(--sog-border);background:var(--sog-surface);padding:0 12px;min-width:0}
[data-module="data"] details.d-lc>summary{min-height:var(--sog-touch);display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700}
[data-module="data"] details.d-lc>summary>.d-lct{min-width:0;overflow-wrap:anywhere}
[data-module="data"] details.d-lc>summary>.d-chev{margin-left:auto;flex:none}
[data-module="data"] details.d-lc[open]>summary>.d-chev{transform:rotate(180deg)}
[data-module="data"] .d-pill{padding:3px 6px;border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);background:color-mix(in srgb,var(--sog-muted) 9%,var(--sog-surface));color:var(--sog-muted);font-size:.78em;font-weight:600;line-height:1;white-space:nowrap}
[data-module="data"] details.d-lc[open]>summary{border-bottom:1px dashed var(--sog-border);margin-bottom:8px}
[data-module="data"] details.d-lc h4{margin:10px 0 4px}
[data-module="data"] .d-lcl{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:8px}
[data-module="data"] .d-lcl li{overflow-wrap:anywhere}
[data-module="data"] .d-lcl p{margin:2px 0}
[data-module="data"] .d-chg .d-verbs{margin:4px 0 0}
[data-module="data"] .d-chg [data-act="change-act"]{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] details.d-mycov{margin:12px 0}
[data-module="data"] details.d-mycov>summary{min-height:var(--sog-touch);display:flex;align-items:center;cursor:pointer}
[data-module="data"] details.d-mycov>summary h3{margin:0}
[data-module="data"] .d-addask{margin:8px 0}
[data-module="data"] .d-addask ul{margin:4px 0 8px;padding-left:1.1em}
[data-module="data"] .d-addask li{overflow-wrap:anywhere}
[data-module="data"] .d-addask [data-act="add-country"],[data-module="data"] [data-sheet-publish] button{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] .d-remove .d-link{margin-left:0}
`;
