// V3 data — « Données » de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/data/SPEC.md, INTEGRATION.md) : le point d'entrée du module (SPEC § 11). `meta`, le montage et
// le démontage, les gestionnaires d'événements (clic, changement, saisie, touche, aerodb) et l'opération qu'un clic désigne (opOf). Ne dessine rien et ne contient aucune règle : tout vient des
// autres fichiers du module (état, écran, panneaux, carte, suivi, publication, chaîne), le calcul pur de model.js et les textes de texts.js.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  ask,
  esc,
  frozen,
  JOURNAL,
  S,
  setState,
  tt
} from './state.js';
import {
  addZone,
  journalWrite,
  load,
  readVerbs,
  statesHtml,
  STYLE
} from './screen.js';
import {
  panelId,
  renderBuild
} from './panels.js';
import {
  mapWidth,
  toggleMapZone
} from './zonemap.js';
import {
  follow,
  startOp,
  startPickup,
  stopTimer
} from './follow.js';
import {
  startPublish
} from './publish.js';
import {
  stopChain,
  updateAll
} from './chain.js';

export const meta = {
  id: 'data',
  title: TX.title, // en-tête du téléphone (règle 16)
  apps: ['pilot'],
  level: 3,
  // la construction de la base est un travail du lanceur (regen/job) ; regen/verbs : les opérations que ce lanceur connaît ; aucune lecture de data/ par le lanceur
  launcher: {
    // regen/job couvre aussi son annulation regen/job/cancel (cadre, f70eba426) ; sync-status : l'état de data/ avant la
    // question de « Publier » (GET, jamais de POST /__setup/sync : la publication passe par ctx.data.sync)
    routes: ['regen/job', 'regen/verbs', 'sync-status'],
    read: []
  },
  files: ['model.js', 'texts.js', 'state.js', 'screen.js', 'panels.js', 'zonemap.js', 'follow.js', 'publish.js', 'chain.js',
    '../../frame/lib/dom.js', '../../frame/lib/time.js'
  ],
  reads: ['cache/data/'],
  writes: [{
    prefix: 'cache/data/',
    policy: 'cache'
  }]
};
/** Espace ou Entrée sur une zone de la carte la coche ou la décoche, comme un toucher. */
function onKey(e) {
  const mz = e.target.closest?.('[data-map-zone]');
  if (!mz || (e.key !== ' ' && e.key !== 'Enter')) return;
  e.preventDefault();
  toggleMapZone(mz);
}
/** aerodb annonce un changement avec { coverage: true } (la table de couverture a bougé) : la liste des États est redemandée, et
 *  elle seule est redessinée (un changement en rafale est regroupé en un seul rappel). */
function onAerodbChange(e) {
  if (!e?.coverage || !S) return;
  clearTimeout(S.again);
  S.again = setTimeout(async () => {
    const me = S;
    const byState = await ask('coverageByState');
    const box = me === S && S.body?.querySelector('[data-states-box]');
    if (!box || !S.d) return;
    const open = box.querySelector('[data-more]')?.open;
    S.d.byState = byState;
    keepScroll(S.body, () => {
      box.innerHTML = statesHtml();
      if (open) box.querySelector('[data-more]')?.setAttribute('open', '');
    });
    renderBuild(); // les États que le panneau des procédures propose suivent la table de couverture
  }, 150);
}
/** Le verbe du lanceur d'un bouton de l'écran, par son panneau (celui de la base compris) : [jeu, verbe] ou null (« Arrêter », « Publier » la base : traités à part). */
function opOf(v) {
  const box = v.closest('[data-build], [data-set-panel]'),
    panel = box && panelId(box),
    verb = {
      download: 'fetch',
      build: 'build',
      purge: 'purge'
    } [v.dataset.verb];
  if (panel === 'sheets') return v.dataset.verb === 'publish-sheets' ? [M.SHEETS.set, M.SHEETS.verb] : null;
  return panel && verb ? [panel, verb] : null;
}
/** Retient le groupe touché en dernier (le « ? » du cadre ouvre l'aide au paragraphe du groupe ouvert), puis le geste d'un bouton. */
function onClick(e) {
  const mz = e.target.closest?.('[data-map-zone]');
  if (mz) return toggleMapZone(mz);
  const g = e.target.closest?.('details.f-group > summary')?.parentElement;
  if (g) S.focus = g.dataset.group;
  const v = e.target.closest?.('button[data-verb]');
  if (!v || v.disabled) return;
  if (v.dataset.verb === 'stop') return S.run?.ctrl.abort();
  if (v.dataset.verb === 'all') return updateAll();
  if (v.dataset.verb === 'pickup' || v.dataset.verb === 'pickup-replan') return startPickup(v.dataset.zones);
  if (v.dataset.verb === 'stop-chain') return stopChain();
  const op = opOf(v);
  if (op) startOp(...op);
  else if (v.dataset.verb === 'publish') startPublish();
}
/** Une case des panneaux (zone, source sous licence personnelle, État des procédures) change : le choix est retenu, le panneau redessiné
 *  (les sources proposées suivent les zones cochées). */
function onChange(e) {
  const t = e.target;
  if (t instanceof HTMLSelectElement && t.matches('[data-add-zone]')) return t.value && addZone(t.value);
  if (!(t instanceof HTMLInputElement) || frozen()) return;
  const set = t.dataset.buildZone ? S.ticked : t.dataset.personal ? S.personal : t.dataset.item ? S.picked : null,
    id = t.dataset.buildZone || t.dataset.personal || t.dataset.item;
  if (!set) return;
  if (t.checked) set.add(id);
  else set.delete(id);
  renderBuild();
}
/** Le champ des types OACI est tapé : le texte est retenu (sans redessin : la frappe n'est pas dérangée) et l'avertissement des codes refusés
 *  disparaît ; le bouton reste actif, le refus se fait au geste. */
function onInput(e) {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || t.dataset.f !== 'codes') return;
  S.codes = t.value;
  if (S.codesBad.length) {
    S.codesBad = [];
    t.closest('.d-codes')?.querySelector('[data-codes-error]')?.remove();
  }
}
/** Retient les groupes ouverts ou fermés à la main, d'un dessin à l'autre. */
function onToggle(e) {
  const g = e.target;
  if (g instanceof HTMLDetailsElement && g.matches('details.f-group') && g.isConnected) S.manual[g.dataset.group] = g.open;
  else if (g instanceof HTMLDetailsElement && g.matches('details.d-journal') && g.isConnected) S.journalOpen = g.open;
}
/** Identifiant du groupe dont l'aide s'ouvre : le dernier touché s'il est encore ouvert, sinon le premier ouvert ; '' sans. */
function helpGroup() {
  const g = S?.body?.querySelector(`details.f-group[data-group="${S.focus}"][open]`) || S?.body?.querySelector('details.f-group[open]');
  return g?.dataset.group || '';
}
/** Monte l'écran dans el : le titre, les écouteurs, le « ? » de l'aide, puis la lecture et le dessin. */
export async function mount(el, ctx) {
  setState({
    el,
    ctx,
    d: null,
    manual: {},
    focus: null,
    stops: [],
    again: 0,
    ticked: null, // zones cochées pour la construction (toutes à la première lecture)
    personal: new Set(), // sources sous licence personnelle cochées (aucune par défaut)
    chain: null, // « Tout mettre à jour » en cours : { phase: 'asking' | 'running' | 'stopping' | 'publishing', runs, i, verb, stopped, rows, t0, job }
    chainEnd: null, // la fin de la dernière chaîne : { result, text, rows }
    chainNote: false, // un repère de chaîne sans fin a été trouvé à l'ouverture
    lastOp: null, // la fin de la dernière opération suivie : { set, verb, out, text } (la chaîne la lit)
    groups: null, // les groupes de l'écran (buildGroups), calculés à chaque dessin
    attn: {}, // les groupes dont le cycle publié est dépassé : { base, proc } (le cycle « AANN » ou null)
    outlines: null, // les contours des zones (ctx.aerodb.zoneOutlines) : null (pas demandés), 'loading', l'objet, ou false (sans réponse : la liste seule)
    pickupBlocked: null, // les zips du plan montré que la prise réelle n'a pas lancés (nom hors de la règle) : dits à la fin
    pickupPlan: null, // le plan d'une prise montré dans la question : { zones, zips } (la prise réelle est construite de lui seul)
    mapW: 0, // la largeur pour laquelle la carte a été calculée
    rz: 0, // l'image d'animation en attente du recalcul à la taille de la fenêtre
    picked: new Set(), // États des procédures cochés (aucun par défaut)
    codes: '', // le champ des types OACI des appareils (vide : les types de la flotte)
    codesBad: [], // les types refusés au dernier geste (dits dans le panneau, aucun appel)
    known: M.knownVerbs(null), // les verbes du lanceur (regen/verbs), lus au montage
    run: null, // le travail suivi, de n'importe quel jeu : { phase: 'running' | 'stopping', t0, ctrl, set, verb ('build' | 'fetch' | 'purge' | 'publish'), dry, args }
    asking: false, // la question d'une purge ou d'une publication de fiches est posée : les boutons restent gris
    view: null, // la dernière vue du travail du lanceur
    ids: [], // les éléments du travail en cours ou du dernier (zones, États, cycle, types)
    result: null, // la fin du dernier : { set, verb, out } (plan vide : nothing) ou { set, verb, refused }
    other: null, // la vue d'une autre opération du lanceur, tant qu'elle tourne
    pub: {
      status: null,
      phase: null,
      result: null
    }, // « Publier » : sync-status lu, 'asking' | 'running' | null, la fin { out } ou { unread }
    journal: [],
    journalOpen: false,
    timer: 0
  });
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(tt(TX.title))}</h1><div data-body></div>`;
  // titre : sur un téléphone l'en-tête du cadre porte celui du module (ctx.titled) ; le h1 reste alors pour les lecteurs
  // d'écran seulement (f-sr), et suit « frame-titled » (frame/INTEGRATION.md § 6)
  S.srTitle = () => el.querySelector(':scope > h1')?.classList.toggle('f-sr', !!ctx.titled);
  S.srTitle();
  window.addEventListener('frame-titled', S.srTitle);
  S.body = el.querySelector('[data-body]');
  // « ? » de l'en-tête : le chapitre au paragraphe du groupe ouvert, sinon à celui du cycle
  ctx.helpAnchor?.(() => helpGroup() ? `data-group-${helpGroup()}` : 'data-cycle');
  S.body.addEventListener('click', onClick);
  S.body.addEventListener('change', onChange);
  S.body.addEventListener('input', onInput);
  S.body.addEventListener('keydown', onKey);
  S.onResize = () => { // la carte des zones se recalcule quand la largeur change (une seule écoute, retirée au démontage)
    cancelAnimationFrame(S.rz);
    S.rz = requestAnimationFrame(() => {
      if (S?.body && S.outlines && S.outlines !== 'loading' && mapWidth() !== S.mapW) renderBuild();
    });
  };
  window.addEventListener('resize', S.onResize);
  S.onNet = () => renderBuild(); // « hors ligne » : la raison du bouton suit le réseau
  window.addEventListener('online', S.onNet);
  window.addEventListener('offline', S.onNet);
  S.body.addEventListener('toggle', onToggle, true);
  // la couverture par État dépend de la table de couverture d'aerodb : redemandée quand il annonce { coverage: true }
  if (ctx.aerodb?.on) S.stops.push(ctx.aerodb.on('change', onAerodbChange));
  const me = S;
  const [journal, known] = await Promise.all([ctx.data.get(JOURNAL).catch(() => null), readVerbs()]);
  if (S !== me) return; // démonté pendant la lecture
  S.journal = M.journalList(journal);
  S.known = known;
  const open = M.openChain(S.journal); // un repère de chaîne sans fin : la page a été rechargée en route, la chaîne ne survit pas
  if (open) {
    journalWrite({
      ...open,
      result: 'interrupted'
    }, true);
    S.chainNote = true;
  }
  await load();
  if (open) S.ctx.notify(tt(TX.chainReload), 'warn');
  follow(); // un travail de la base en cours sur le lanceur (page rechargée) se suit ; le dernier terminé dit sa fin
}
/** Démonte : retire les écouteurs et l'abonnement à aerodb, arrête le minuteur ; une lecture encore en cours ne dessine plus rien.
 *  Le suivi du travail est arrêté par le cadre, sans l'annuler (il continue sur le lanceur). */
export function unmount() {
  if (!S) return;
  window.removeEventListener('frame-titled', S.srTitle);
  window.removeEventListener('online', S.onNet);
  window.removeEventListener('offline', S.onNet);
  window.removeEventListener('resize', S.onResize);
  cancelAnimationFrame(S.rz);
  clearTimeout(S.again);
  stopTimer(); // le suivi s'arrête de lui-même au démontage (le cadre) : le travail, lui, continue sur le lanceur
  for (const f of S.stops) f?.();
  S.body = null;
  setState(null);
}
