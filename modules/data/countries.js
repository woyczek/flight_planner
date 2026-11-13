// V3 data — la carte du monde, les paquets de pays et la fiche d'un pays (SOG-0262) : l'entrée de la base. La carte dessine les contours des pays (ceux d'aerodb : ctx.aerodb.zoneOutlines) en SVG, cadrée sur la couverture ; les paquets sont la liste principale,
// chacun avec son état résumé, un seul ouvert à la fois ; un toucher sur un pays (de la carte ou d'un paquet) ouvre sa fiche (à droite de la carte en large, en plein écran au téléphone). Lot A : la fiche se lit (les faits du pays — construit, publié —, puis pour chaque
// source son « téléchargé » et l'inventaire de ses fichiers). Lot B : la fiche est l'endroit où l'on agit — « Mettre à jour ce pays », « Prendre le fichier téléchargé » (geste principal quand un fichier est vu dans Téléchargements) et « Choisir le fichier… » —, et « ce qui reste à faire
// ce mois-ci » (todo.js) se lit sous la carte. Rien ici n'écrit dans data/ ; les lectures du lanceur (base/cycle, base/coverage) sont des travaux en lecture seule, passés l'un après l'autre (state.js : serial), à l'ouverture et après chaque opération.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  fmtDateZ
} from '../../frame/lib/time.js'; // heures en UTC (« 16:30Z »)
import {
  busyNow,
  catSource,
  count,
  esc,
  frozen,
  kind,
  lang,
  li,
  pickSource,
  ROUTE,
  S,
  serial,
  tt
} from './state.js';
import {
  buildZones,
  cardAreaHtml,
  gateOf,
  greyOnce,
  opAreaHtml,
  personalPicked,
  renderBuild,
  sourcesWhy
} from './panels.js';
import {
  progressHtml,
  progressOn,
  threadHtml
} from './zoneop.js';
import {
  nasrHint,
  refreshStatus,
  statusKnown,
  zoneMsgHtml,
  zoneReasons,
  zoneStateHtml
} from './status.js';
import {
  loadOutlines
} from './zonemap.js';
import {
  framesOf
} from './mapview.js';
import {
  packUpdateHtml
} from './packs.js';
import {
  updateGate
} from './update.js';
import {
  uploadHtml,
  uploadOff
} from './upload.js';
import {
  DIRCAM_MEMBER,
  DIRCAM_SOURCE
} from './zipmember.js';
import {
  todoHtml
} from './todo.js';
import {
  lcInit,
  natOpen
} from './later.js';
import {
  forgetSetStates,
  setStatesIdle,
  wantSetStates
} from './setstate.js';
import {
  forgetPlan,
  planKnown,
  publishGate,
  publishReason,
  wantPlan
} from './publish.js';
import {
  addZones,
  refreshFoldStates,
  removeZones
} from './screen.js';
import {
  busyCardHtml
} from './busy.js';
import {
  selBarHtml
} from './select.js';

/** L'état propre à cet écran, créé au montage : le pays survolé, le paquet ouvert, la fiche ouverte (et d'où), la vue du monde, la légende dépliée, les chemins SVG gardés, les lectures du lanceur (la liste du cycle d'un pays, celle de tout le cycle, les procédures), la source du dernier geste de fichier de chaque pays. */
export const cwInit = () => ({
  lc: lcInit(), // les blocs repliés sous « Publier » : plis ouverts et lecture des routes NAT (later.js)
  hover: null,
  sel: new Set(), // les pays choisis sur la carte (select.js) : Maj + clic, rectangle ; vidée après le geste
  rect: null, // le rectangle de sélection en cours (select.js)
  grp: null,
  home: false, // « Recentrer sur ma couverture » touché : la carte montre la couverture même si un groupe est ouvert (rouvrir un groupe le cadre de nouveau)
  view: null, // le zoom et le déplacement de la carte : { box, key } (mapview.js), null : le cadre de départ
  thread: new Map(), // le fil de la dernière opération de chaque pays (zoneop.js) : identifiant → { state, steps, bilan, why }
  todoOpen: false, // le bloc « À faire ce mois-ci » : replié d'origine
  sheet: null,
  opener: '',
  world: false,
  legend: false,
  doneOpen: false,
  hand: new Map(),
  recv: new Map(), // les fichiers que le lanceur vient de recevoir par « Choisir le fichier… » : « zone/source » → { name, size, at } ; la ligne du fichier dit « reçu » jusqu'à ce que la lecture suivante du pays dise autre chose (le fichier n'y est plus vu)
  paths: new Map(),
  pathsFor: null,
  cycle: null,
  todo: null,
  last: null, // le journal du lanceur (base/last) : { state ('loading' | 'ready' | 'busy' | 'unread' | 'none'), data (M.lastOf), dirty } : le fil de la dernière opération d'un pays y est lu
  proc: null
});
/** Les paquets régionaux lisibles, ceux qui ont au moins un pays connu de la suite : [{ pack, known, state }]. */
function packList() {
  const d = S.d;
  if (!Array.isArray(d?.packs) || !Array.isArray(d.zones)) return [];
  return d.packs.filter(p => p.kind === 'region' && !p.empty && p.zones.length).map(p => ({
    pack: p,
    state: M.packState(p, d.zones, d.cov.ids)
  })).filter(x => x.state.known.length);
}
/** La fiche ouverte voit-elle l'avancement d'un travail en place de son bouton ? */
/** Un identifiant de pays sûr (le lanceur et le dépôt de données sont des entrées non fiables). */
const ZONE_ID = /^[a-z0-9_-]{2,12}$/;
const progressHere = () => !!S.cw?.sheet && progressOn(S.cw.sheet);
/** La raison pour laquelle le choix d'un fichier est grisé : pas de lanceur, sinon une opération (la nôtre, dont l'avancement est sur la fiche, ou un envoi). */
const uploadWhy = () => !S.ctx.launcher ? 'no-launcher' : 'busy';
/** La raison écrite À CÔTÉ d'un bouton gris de la fiche (jamais un bouton gris seul) ; '' quand la carte de l'opération en cours, dans la fiche, la dit déjà. */
function sheetGrey(reason) {
  if (!reason || reason === 'busy' && busyCardHtml('base', 'sheet')) return '';
  return ` <span class="f-muted" data-grey="${esc(reason)}">${esc(tt(reason === 'busy' && progressHere() ? TX.zx.greyBusy : M.own(TX.greyReason, reason) || TX.greyReason.busy))}</span>`;
}
/** Le nom d'un pays dans la langue : celui de zones() d'aerodb, à défaut celui de son contour, à défaut son identifiant. */
export function nameOf(id) {
  const z = (S.d?.zones || []).find(x => x.id === id);
  return z ? M.zoneName(S.d.zones, id, li()) : M.own(S.outlines, id)?.name?.[li()] || id;
}
/** La teinte d'un pays : celle de l'état du lanceur ; sans état lu, celle de la publication (un cycle en vigueur, daté ou non) ; 'muted' hors de la couverture. */
function tone(id) {
  const inCov = S.d.cov.ids.includes(id),
    running = !!S.run && S.run.set === 'base' && S.run.verb !== 'purge' && S.ids.includes(id),
    t = M.toneOf(S.status, id, inCov, running);
  if (t) return t;
  if (inCov && S.ctx.launcher && statusKnown())
    return 'unread'; // l'état de la base n'est pas encore lu (ou la lecture a échoué) : neutre, jamais une teinte de défaut (SOG-0260)
  const pub = S.d.pub,
    b = M.baseOf(pub?.base, [id]),
    cycle = b ? b.cycle : null,
    mt = M.mapTone({
      inCoverage: true,
      running,
      published: b ? b.published > 0 : !!cycle,
      stale: !!cycle && S.airac && M.staleLevel(S.airac, cycle, S.now) !== null
    });
  return mt === 'accent' ? 'warn' : mt;
}
/** Le contour d'un pays pour le dessin : { id, d (le chemin), box, approx } ; gardé tant que les contours sont les mêmes. null sans contour. */
function pathInfo(id) {
  const c = S.cw;
  if (c.pathsFor !== S.outlines) {
    c.paths = new Map();
    c.pathsFor = S.outlines;
  }
  if (c.paths.has(id)) return c.paths.get(id);
  const o = M.own(S.outlines, id);
  let out = null;
  if (o && Array.isArray(o.box) && o.box.length === 4 && o.box.every(Number.isFinite)) {
    const rings = o.framed || o.rings || [],
      d = M.pathOf(rings, o.box);
    const main = M.mainBox(rings, o
      .box
    ); // le cadre du pays sans son outre-mer (les anneaux à plus de 3° du plus grand : les Açores, les Canaries, la Guyane ; `parts` d'aerodb les réunit à moins de FRAME_GAP, trop large pour cadrer un groupe)
    out = d ? {
      id,
      d,
      box: o.box,
      main,
      approx: M.isApproxOutline({
        ...o,
        rings
      })
    } : null;
  }
  c.paths.set(id, out);
  return out;
}
/** Le cadre [ouest, sud, est, nord] d'un pays SANS son outre-mer (le groupe d'anneaux principal) : celui qui cadre un groupe de pays et celui que touche un rectangle de sélection ; null sans contour. */
export function mainBoxOf(id) {
  return S.outlines && S.outlines !== 'loading' ? pathInfo(id)?.main || null : null;
}
/** Les pays que la carte dessine : ceux de la couverture et ceux que la suite connaît (dans l'ordre des zones), avec un contour. */
function drawn() {
  const ids = M.orderZones([...new Set([...buildZones().ids, ...(S.d.zones || []).map(z => z.id)])], S.d.zones);
  return ids.map(pathInfo).filter(Boolean);
}
/** Le nom d'un état en mot : celui de la teinte (à jour, à faire, en échec), « hors couverture » ou « état inconnu ». */
const word = t => tt(TX.cw.word[M.own(TX.cw.word, t) ? t : 'none']);
/** La carte : un SVG cadré sur la couverture, un chemin par pays (la teinte de son état, ses procédures en hachure, la bordure bleue du paquet ouvert, le plein du pays survolé) puis la légende et « Voir le monde entier » ; '' sans contours. */
function mapHtml() {
  loadOutlines();
  if (!S.outlines || S.outlines === 'loading') return '';
  const all = drawn();
  if (!all.length) return '';
  const cov = new Set(buildZones().ids),
    open = S.cw.grp ? new Set(packList().find(x => x.pack.id === S.cw.grp)?.state.known || []) : new Set(),
    procs = S.cw.proc?.zones || {},
    covBoxes = all.filter(p => cov.has(p.id)).map(p => p.box),
    grpBoxes = all.filter(p => open.has(p.id)).map(p => p
      .main), // un groupe ouvert cadre la carte sur LUI, sans l'outre-mer de ses pays (teintés quand même, visibles en dézoomant)
    frame = S.cw.world ? M.worldFrame() : (grpBoxes.length && !S.cw.home ? M.frameOf(grpBoxes) : null) || (covBoxes.length ? M.frameOf(
        covBoxes) :
      null) || M.frameOf(all.map(p => p.box)),
    rank = p => open.has(p.id) ? 2 : cov.has(p.id) ? 1 : 0,
    list = [...all].sort((a, b) => rank(a) - rank(b)),
    fr = framesOf(frame), // la vue (le zoom et le déplacement gardés), le cadre de départ et le monde (mapview.js)
    cell = Math.max(frame[2] / 110, .3);
  let unread = 0;
  const paths = list.map(p => {
    const t = tone(p.id);
    if (t === 'unread') unread++;
    const code = S.status?.zones?.[p.id]?.reasons?.[0]?.code,
      why = t === 'warn' || t === 'err' ? (M.own(TX.sn, `r_${code}`) ? tt(TX.sn[`r_${code}`]) : zoneReasons(p.id)[0]) :
      '', // l'infobulle dit pourquoi une zone n'est pas verte
      label = `${nameOf(p.id)} : ${word(t)}${why ? ` (${why})` : ''}${procs[p.id] ? `, ${tt(TX.cw.procYes, { s: procs[p.id].map(procName).join(', ') })}` : ''}`;
    return `<path class="d-wz" d="${p.d}" data-zone="${esc(p.id)}" data-hz="${esc(p.id)}" data-tone="${esc(t)}" data-act="open-country" tabindex="-1" role="button" aria-label="${esc(label)}"${p.approx ? ' data-approx' : ''}${open.has(p.id) ? ' data-grp' : ''}${S.cw.hover === p.id ? ' data-hover' : ''}${S.packHl?.has(p.id) ? ' data-hl' : ''}${S.cw.sel.has(p.id) ? ' data-sel' : ''}><title>${esc(label)}</title></path>`;
  }).join('');
  const hatch = list.filter(p => procs[p.id]).map(p => `<path class="d-wh" d="${p.d}" data-proc="${esc(p.id)}"></path>`).join('');
  const sw = t => `<span class="d-sw" data-tone="${t}"></span>`,
    gp = S.cw.grp ? packList().find(x => x.pack.id === S.cw.grp)?.pack : null,
    gname = gp ? gp.names[li()] || gp.names[0] : '';
  return `<section class="d-wmapbox d-mapsec" data-world-map><h3 class="d-sh">${esc(tt(TX.d2.mapTitle))} <small>${esc(tt(TX.d2.mapHelp))}</small></h3>
    <div class="d-mapbar"><span class="d-maptitle" data-map-title>${gname ? esc(tt(TX.d2.mapOpen, { g: '\u0001' })).replace('\u0001', () => `<b>${esc(gname)}</b>`) : esc(tt(TX.d2.mapNone))}</span>
      <span class="d-maplinks" data-map-links><button type="button" class="d-link" data-act="world-toggle" aria-pressed="${S.cw.world}">${esc(tt(TX.zx.mvWorld))}</button> <button type="button" class="d-link" data-act="map-home" aria-pressed="${!S.cw.world}">${esc(tt(TX.zx.mvHome))}</button></span></div>
    <div class="d-mapframe"><svg class="d-wmap" data-wmap viewBox="${fr.view.join(' ')}" data-base="${frame.join(' ')}" data-world="${fr.world.join(' ')}" preserveAspectRatio="xMidYMid meet" style="aspect-ratio:${(frame[2] / frame[3]).toFixed(3)}" role="group" aria-label="${esc(tt(TX.cw.mapLabel))}"><defs><pattern id="d-hatch" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${cell.toFixed(2)}" stroke="currentColor" stroke-width="${(cell * .3).toFixed(2)}"></line></pattern></defs><g data-wz>${paths}</g><g class="d-whg" data-wh>${hatch}</g></svg>
</div>
    <p class="d-lgd" data-cw-legend><span class="d-lgl">${['ok', 'warn', 'err'].map(t => `<span class="d-lgi">${sw(t)}${esc(tt(TX.mapLegendBase[t]))}</span>`).join('')}${unread ? `<span class="d-lgi">${sw('unread')}${esc(tt(TX.cw.word.unread))}</span>` : ''}<span class="d-lgi">${sw('muted')}${esc(tt(TX.cw.outside))}</span></span><span class="d-zoom" data-map-controls><button type="button" data-act="map-zoom" data-dir="in" aria-label="${esc(tt(TX.zx.mvIn))}" title="${esc(tt(TX.zx.mvIn))}">+</button><button type="button" data-act="map-zoom" data-dir="out" aria-label="${esc(tt(TX.zx.mvOut))}" title="${esc(tt(TX.zx.mvOut))}">\u2212</button></span><button type="button" class="d-lg" data-act="legend-more" aria-expanded="${S.cw.legend}" aria-label="${esc(tt(TX.cwb.legendMore))}" title="${esc(tt(TX.cwb.legendMore))}">?</button></p>
    ${S.cw.legend ? `<p class="f-muted" data-cw-legend-more><span class="d-sw" data-hatch></span>${esc(tt(TX.cw.hatch))} · <span class="d-sw" data-grp></span>${esc(tt(TX.cw.border))}${all.some(p => p.approx) ? ` · ${esc(tt(TX.mapLegendApprox))}` : ''} · ${esc(tt(TX.d2.mapTouch))} · ${esc(tt(TX.d4.selHelp))}</p>` : ''}${selBarHtml()}</section>`;
}
/** Le nom d'une origine de procédures (CIFP, eAIP, EAD) ; le code tel quel pour une autre. */
const procName = s => tt(M.own(TX.cw.procSource, s) || [s, s, s, s]);
/** La phrase du bilan d'un paquet : « 12 sur 14 à jour · 2 à faire · 1 en échec », puis les pays sans état et ceux hors de la couverture ; sans état lu, le nombre de pays de la couverture et « état non lu ». */
export function groupSummary(tl) {
  return groupParts(tl).map(x => x[0]).join(' · ');
}
/** Les morceaux du bilan d'un paquet, chacun avec sa teinte : [[texte, teinte]] (la phrase du paquet est leur mise bout à bout). */
function groupParts(tl) {
  const T = TX.cw;
  if (!tl.inCov) return [
    [tt(T.sumNoCov), 'muted'], ...(tl.out ? [
      [tt(T.sumOut, {
        n: tl.out
      }), 'muted']
    ] : [])
  ];
  if (!(S.status && statusKnown())) return [
    [tt(T.sumUnread, {
      m: tl.inCov
    }), 'muted'], ...(tl.out ? [
      [tt(T.sumOut, {
        n: tl.out
      }), 'muted']
    ] : [])
  ];
  const parts = [
    [tt(T.sumOk, {
      n: tl.ok,
      m: tl.inCov
    }), 'ok']
  ];
  if (tl.warn) parts.push([tt(T.sumTodo, {
    n: tl.warn
  }), 'warn']);
  if (tl.err) parts.push([tt(T.sumErr, {
    n: tl.err
  }), 'err']);
  if (tl.none) parts.push([tt(T.sumNone, {
    n: tl.none
  }), 'muted']);
  if (tl.out) parts.push([tt(T.sumOut, {
    n: tl.out
  }), 'muted']);
  return parts;
}
/** Le même bilan, une teinte par morceau (le texte est celui de groupSummary). */
function groupSummaryHtml(tl) {
  return groupParts(tl).map(([t, k]) => `<span data-sum-tone="${k}">${esc(t)}</span>`).join(' · ');
}
/** Le signe d'un état sur une tuile de pays (jamais la couleur seule : le mot suit). */
const SIGN_OF = {
  ok: '✓',
  warn: '!',
  err: '✗',
  muted: '–',
  unread: '?'
};
/** Les paquets : une ligne par paquet (nom, état résumé, chevron), un seul ouvert ; ouvert, ses pays (nom et état en mot, chacun ouvre sa fiche) puis le « Mettre à jour » du paquet. '' sans paquet. */
function groupsHtml() {
  const packs = packList();
  if (!packs.length) return '';
  const cov = S.d.cov.ids,
    // l'ordre : ceux où il y a quelque chose à faire, puis ceux à jour, puis ceux sans aucun pays de la couverture (estompés, à la fin) ; à égalité l'ordre des paquets
    rank = x => !x.tl.inCov ? 2 : x.tl.warn + x.tl.err > 0 ? 0 : 1,
    ordered = packs.map(x => ({
      ...x,
      tl: M.tally(x.state.known, cov, tone)
    })).map((x, i) => ({
      ...x,
      i
    })).sort((a, b) => rank(a) - rank(b) || a.i - b.i),
    items = ordered.map(({
      pack,
      state,
      tl
    }) => {
      const open = S.cw.grp === pack.id,
        name = pack.names[li()] || pack.names[0];
      return `<li class="d-gp" data-group-id="${esc(pack.id)}" data-zones="${esc(state.known.filter(z => ZONE_ID.test(z)).join(','))}" data-open="${open}"${tl.inCov ? '' : ' data-nocov'}><button type="button" class="d-gh" data-act="grp-toggle" data-gid="${esc(pack.id)}" aria-expanded="${open}" aria-controls="d-gb-${esc(pack.id)}"><span class="d-gname"><span class="d-gtitle"><b>${esc(name)}</b> <span class="f-muted d-gcount">${esc(count('country', state.known.length))}</span></span> <span class="d-gsum" data-group-sum>${groupSummaryHtml(tl)}</span></span><i class="d-chev" aria-hidden="true"></i></button>${open ? `<div class="d-gb" id="d-gb-${esc(pack.id)}" data-group-body>
        <ul class="d-gc">${state.known.map(z => {
          const t = tone(z);
          return `<li><button type="button" class="d-gcb" data-act="open-country" data-zone="${esc(z)}" data-hz="${esc(z)}" data-tone="${esc(t)}"${S.cw.hover === z ? ' data-hover' : ''}${S.cw.sheet === z ? ' aria-current="true"' : ''}><span class="d-gcn">${esc(nameOf(z))}</span> <span class="d-gw"><b aria-hidden="true">${M.own(SIGN_OF, t) || ''}</b> ${esc(word(t))}${S.cw.proc?.zones?.[z] ? ` <span class="d-gproc" data-has-proc><i class="d-sw" data-hatch aria-hidden="true"></i>${esc(tt(TX.d2.procShort))}</span>` : ''}</span></button></li>`;
        }).join('')}</ul>
        <p class="d-gup">${packUpdateHtml(pack, state)}</p>${opAreaHtml('base', 'group')}</div>` : ''}</li>`;
    });
  return `<section class="d-groups" data-cw-groups><h3 class="d-sh">${esc(tt(TX.cw.groupsTitle))} (${packs.length}) <small>${esc(tt(TX.d2.groupsHelp, { n: count('country', new Set(packs.flatMap(x => x.state.known)).size) }))}</small></h3><ul class="d-gl">${items.join('')}</ul></section>`;
}
/** Un lien https en texte sûr (nouvel onglet, sans référent) ; sans adresse en https, le libellé seul. */
const link = (url, label) => M.isHttps(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
/** La date (AAAA-MM-JJ) d'un instant ISO, écrite dans la langue ; '' sans. */
export const dateOf = iso => iso ? M.dateText(String(iso).slice(0, 10), lang()) : '';
/** Une coche posée par l'outil, UN des quatre signes (jamais la couleur ou la forme seule : le mot les accompagne) : ✓ fait (vert), ○ à faire (cercle vide, ton neutre), ✗ en échec (rouge : un vrai échec, avec sa raison, seulement), — sans objet ou pas encore possible (gris).
 *  `ok` : 'yes' | 'todo' | 'no' | 'na'. */
export function tickHtml(key, ok, detail) {
  const sign = M.SIGNS.includes(ok) ? ok : 'na',
    word = tt(TX.zx[{
      yes: 'twYes',
      todo: 'twTodo',
      no: 'twNo',
      na: 'twNa'
    } [sign]]);
  return `<li data-tick="${key}" data-ok="${sign}"><span class="d-tk" aria-hidden="true">${M.SIGN[sign]}</span> <b>${esc(tt(TX.cw.tick[{ download: 'dlTick', build: 'buildTick', publish: 'pubTick' }[key]]))}</b> <span class="d-tkw" data-tick-word>(${esc(word)})</span> : <span data-tick-text>${esc(detail)}</span></li>`;
}
/** Une date « jj/mm » (« 05/10 ») : le mot court d'une cellule de la fiche ; '' sans date lisible. */
export function shortDate(iso) {
  const d = new Date(iso);
  return !iso || Number.isNaN(+d) ? '' : new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : String(lang()), {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC'
  }).format(d);
}
/** « 2026-11-10T06:00 » (le run de la météo, tel que le lanceur le dit) écrit « 10 nov. 2026 06:00Z » ; un texte d'une autre forme est rendu tel quel (borné par le modèle). */
const runText = run => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(run) ? `${M.dateText(run.slice(0, 10), lang())} ${run.slice(11, 16)}Z` : run;
/** La date utile d'un jeu que le lanceur dit (`datasets`, K207), en mots : les routes NAT « valides jusqu'au … » (« périmées depuis le … » une fois finies), la météo « prévision du … » (le run), les procédures « cycle 2611 · 3 069 terrains » (le cycle de la ligne CIFP la plus récente
 *  et les terrains lus : les nombres au format de la langue) ; '' pour un jeu qui n'en dit pas (la date de son fichier suffit). Rien n'est lu au-delà de ce que le lanceur a dit. */
export function datasetUseful(d) {
  const T = TX.d6,
    unit = n => tt(TX.unit.aerodrome[n === 1 ? 0 : 1]),
    num = n => `${n.toLocaleString(lang())} ${unit(n)}`;
  if (d.id === 'nat' && d.validUntil) return tt(d.why === 'expired' ? T.natExpired : T.natValid, {
    d: fmtDateZ(d.validUntil, lang())
  });
  if (d.id === 'weather' && d.run) return tt(T.run, {
    d: runText(d.run)
  });
  if (d.id === 'procedures') {
    const at = d.cycle ? Date.parse(`${d.cycle}T12:00:00Z`) : NaN,
      id = S.airac && Number.isFinite(at) ? S.airac.cycleOf(at)?.id : '',
      c = d.counts || {},
      n = c.cifp > 0 && c.eaip > 0 ? `${num(c.cifp)} CIFP · ${num(c.eaip)} eAIP` : c.cifp > 0 ? num(c.cifp) : c.eaip > 0 ? num(c.eaip) : '';
    return [id ? tt(T.procCycle, {
      c: id
    }) : d.cycle ? dateOf(d.cycle) : '', n].filter(Boolean).join(' · ');
  }
  return '';
}
/** Une cellule d'état de la fiche (construit, publié) :le signe, le MOT court (« à faire », « à jour », « le 05/10 ») et, à part, la phrase longue qui va sur sa propre ligne, sous les trois cellules (une phrase entière ne tient pas dans une cellule étroite). Rend { li, note }. */
function factCell(key, ok, word, short, long) {
  const sign = M.SIGNS.includes(ok) ? ok : 'na',
    label = tt(TX.cw.tick[{
      build: 'buildTick',
      publish: 'pubTick'
    } [key]]);
  return {
    li: `<li data-tick="${key}" data-ok="${sign}"><span class="d-tk" aria-hidden="true">${M.SIGN[sign]}</span> <b>${esc(label)}</b> <span class="d-tkw" data-tick-word>(${esc(word)})</span>${short ? ` <span data-tick-text>${esc(short)}</span>` : ''}</li>`,
    note: long ? `<p class="d-cellnote" data-cell-note="${key}" data-ok="${sign}"><b>${esc(label)}</b> ${esc(long)}</p>` : ''
  };
}
/** La cellule « construit » du pays : à jour, la date en mot court (la phrase longue ne garde que le cycle) ; sinon « à faire » et, sur sa ligne, pourquoi pas et la dernière construction. */
function buildFact(id, z) {
  const T = TX.cw,
    word = k => tt(TX.zx[k]);
  if (!z) return factCell('build', 'na', word('twNa'), tt(T.dlUnread), '');
  const last = builtDetail(z);
  if (z.state === 'up-to-date') return factCell('build', 'yes', tt(TX.d4.cellOk), z.builtAt ? tt(T.on, {
    d: shortDate(z.builtAt)
  }) : '', z.builtCycle && S.airac ? tt(T.cycleOf, {
    c: M.cycleName(S.airac, z.builtCycle)
  }) : '');
  return factCell('build', z.state === 'failed' ? 'no' : 'todo', word(z.state === 'failed' ? 'twNo' : 'twTodo'), '', tt(T.buildNot, {
    r: zoneReasons(id)[0] || tt(TX.zst[z.state])
  }) + (last ? ` · ${tt(T.buildLast, { b: last })}` : ''));
}
/** La cellule « publié » : seulement quand le lanceur le dit ; null sinon (un état inconnu ne dit rien). */
function publishFact(z) {
  const p = z?.publish;
  if (!p || p.state === 'unknown') return null;
  const word = k => tt(TX.zx[k]);
  if (z.state !== 'up-to-date') return factCell('publish', 'na', word('twNa'), '', tt(TX.zx.pubWaitBuild));
  return p.state === 'published' ? factCell('publish', 'yes', word('twYes'), p.at ? tt(TX.cw.on, {
    d: shortDate(p.at)
  }) : '', '') : factCell('publish', 'todo', word('twTodo'), '', tt(TX.cw.pubNo));
}
/** Les parties du territoire d'un pays quand aerodb les NOMME (`AeroCatalogue.partNamesOf(zone)` : [[fr, en, de, es], …] dans l'ordre d'affichage, ou null) : « 3 zones : continent, Madère, Açores » ; '' sans noms (rien n'est inventé : un pays d'un seul tenant, ou dont les parties ne sont pas nommées, n'a pas de sous-titre de zones). */
function partsText(id) {
  const parts = typeof S.d?.cat?.partNamesOf === 'function' ? S.d.cat.partNamesOf(id) : null,
    names = (Array.isArray(parts) ? parts : []).slice(0, 12).map(n => Array.isArray(n) ? String(n[li()] ?? n[0] ?? '').replace(
      /[\p{Cc}]/gu, ' ').trim().slice(0, 40) : '').filter(Boolean);
  return names.length > 1 ? tt(TX.d4.subZones, {
    n: names.length,
    z: names.join(', ')
  }) : '';
}
/** La coche « téléchargé » d'une source pour ce pays : d'abord la liste du cycle (l'état du fichier, sa date, son édition), à défaut ce que base/status dit des sources que le lanceur télécharge, sinon « non lu ». */
export function downloadTick(id, item, z) {
  const T = TX.cw,
    d = item?.download;
  if (d?.state) {
    const cyc = d.cycle && S.airac ? tt(T.cycleOf, {
      c: M.cycleName(S.airac, d.cycle)
    }) : '';
    if (d.state === 'done') return tickHtml('download', 'yes', [d.at ? tt(T.on, {
      d: dateOf(d.at)
    }) : '', d.edition ? tt(T.edition, {
      e: d.edition
    }) : cyc].filter(Boolean).join(' · ') || '—');
    if (d.state === 'late') return tickHtml('download', 'todo', d.cycle && S.airac ? tt(T.dlLate, {
      c: M.cycleName(S.airac, d.cycle)
    }) : tt(M.own(T.why, 'older-than-cycle')));
    if (d.state === 'n/a') return tickHtml('download', 'na', tt(T.dlNone));
    return tickHtml('download', d.state === 'failed' ? 'no' : 'todo', tt(d.state === 'waiting' ? T.dlWaiting : M.own(T.why, item.why) || T
      .dlMissing));
  }
  const auto = z?.download?.list?.[id];
  if (auto) return auto.present ? tickHtml('download', 'yes', auto.at ? tt(T.on, {
    d: dateOf(auto.at)
  }) : '—') : tickHtml('download', 'todo', tt(T.dlNot));
  return tickHtml('download', 'na', tt(T.dlUnread));
}
/** Le détail d'une construction : la date et le cycle (« le 5 oct. · cycle 2610 ») ; '' quand le pays n'a jamais été construit sur ce poste. */
function builtDetail(z) {
  const T = TX.cw;
  return [z?.builtAt ? tt(T.on, {
    d: dateOf(z.builtAt)
  }) : '', z?.builtCycle && S.airac ? tt(T.cycleOf, {
    c: M.cycleName(S.airac, z.builtCycle)
  }) : ''].filter(Boolean).join(' · ');
}
/** La lecture de la liste du cycle pour la fiche ouverte : { state ('loading' | 'ready' | 'busy' | 'unread' | 'none'), data, zv (la vue par zone du lanceur, K182) } ; la lecture d'un autre pays n'est pas la sienne. */
function cycleOf(id) {
  const c = S.cw.cycle;
  return c && c.zone === id ? {
    state: c.state,
    data: c.data || null,
    zv: c.data?.zoneView?.zone === id ? c.data.zoneView : null
  } : {
    state: null,
    data: null,
    zv: null
  };
}
/** Où trouver un fichier, une seule ligne : « Où : <chemin rubrique par rubrique> — <lien> », puis « (chemin à vérifier) » en fin de ligne quand le catalogue ne l'a pas vérifié. UN seul lien, dont le mot dit ce que l'adresse ouvre : « télécharger le fichier » quand c'est le fichier lui-même
 *  (`url`, sans `link`), « ouvrir la page » sinon (la page de CE fichier `link`, à défaut celle de la source, à défaut l'accueil du site). Jamais une adresse inventée : seulement ce que le catalogue ou le lanceur donne. */
function whereHtml(f, steps, hand) {
  const T = TX.cw,
    path = Array.isArray(f.where) ? String(f.where[li()] ?? f.where[0] ?? '').slice(0, 400) : '',
    check = path && f.verified === false ? (S.d?.cat?.PATH_TO_CHECK?.[li()] || tt(T.pathCheck)) : '',
    href = [f.link, f.url, steps?.page?.url, hand?.link, steps?.page?.home].find(M.isHttps),
    a = href ? link(href, tt(href === f.url && href !== f.link ? T.fileLink : T.pageLink)) : '';
  if (!path && !a) return '';
  const body = [path ? `<span data-file-path>${esc(path)}</span>` : '', a ? `<span data-file-link>${a}</span>` : ''].filter(Boolean).join(' — ');
  return `<span class="d-fl" data-file-where>${esc(tt(T.wherePath, { p: '\u0001' })).replace('\u0001', () => body)}${check ? ` <em data-path-check>(${esc(check)})</em>` : ''}</span>`;
}
/** L'identifiant de la source dans le catalogue d'aerodb (le NASR de la FAA s'y nomme `adds`, le lanceur le dit `faa`). */
const catId = id => id === 'faa' ? 'adds' : id;
/** Les fichiers à prendre d'une source à la main : ceux du catalogue (`stepsOf`), à défaut les noms que le lanceur attend ; huit au plus. */
function filesOf(id, item) {
  const stepsOf = typeof S.d?.cat?.stepsOf === 'function' ? S.d.cat.stepsOf : null,
    steps = stepsOf ? stepsOf(catId(id), S.cycleId) : null;
  return {
    steps,
    files: (steps && Array.isArray(steps.files) && steps.files.length ? steps.files : (item?.hand?.expected || []).map(name => ({
      name
    }))).slice(0, 8)
  };
}
/** L'inventaire des fichiers d'une source prise à la main, UNE fiche de trois lignes par fichier : ce que c'est en mots de pilote (le titre), « Où : … — <lien> (chemin à vérifier) », « Fichier : <nom> — vu dans Téléchargements / manquant » (le lanceur dit ce qu'il y voit). */
function inventoryHtml(id, item, cy, zone = '') {
  const T = TX.cw,
    got = S.cw.recv.get(`${zone}/${id}`) || null, // ce que le lanceur a reçu de cette source à l'instant
    {
      steps,
      files
    } = filesOf(id, item),
    hand = item?.hand || null,
    ready = cy.state === 'ready' && !!hand;
  if (!files.length) return '';
  const isGot = f => !!got && got.name === f.name,
    nSeen = files.filter(f => isGot(f) || ready && (M.fileSeen(f.name, hand.inDownloads) || M.fileSeen(String(f.file || f.name), hand
      .inDownloads))).length;
  return `<div data-inventory="${esc(id)}"><p class="d-invh d-sh d-sh2"><b>${esc(tt(T.inventory))}</b>${ready || nSeen ? ` <small data-inventory-count>${esc(tt(TX.d2.invSeen, { n: nSeen }))} · ${esc(tt(TX.d2.invMiss, { n: files.length - nSeen }))}</small>` : ''}</p>${!ready ? `<p class="f-muted" data-inventory-state="${esc(cy.state || 'none')}">${esc(tt(M.own(T.cycleState, cy.state) || T.inDlUnread))}</p>` : ''}<ul class="d-inv">${files.map(f => {
    const shown = String(f.file || f.name),
      recv = isGot(f),
      seen = recv ? true : ready ? M.fileSeen(f.name, hand.inDownloads) || M.fileSeen(shown, hand.inDownloads) : null,
      what = Array.isArray(f.what) ? f.what : f.gives;
    return `<li data-file="${esc(f.name)}"${seen === null ? '' : ` data-seen="${seen}"`}>${Array.isArray(what) ? `<b data-file-what>${esc(String(what[li()] ?? what[0] ?? ''))}</b>` : ''}
      ${whereHtml(f, steps, hand)}
      <span class="d-fl" data-file-name>${esc(tt(T.name, { n: '\u0001' })).replace('\u0001', () => `<code>${esc(shown)}</code>`)}${seen === null ? '' : ` — <span class="d-fs" data-file-state="${recv ? 'received' : seen ? 'seen' : 'missing'}">${seen ? '✓' : '○'} ${esc(recv ? tt(TX.cwb.zip.recvLine, { name: got.name, b: M.fmtBytes(got.size, lang()), d: dateOf(got.at) }) : tt(seen ? T.seen : T.missing))}</span>`}</span></li>`;
  }).join('')}</ul></div>`;
}
/** Le régime d'une source : celui de la liste du cycle, à défaut celui que le catalogue dit (un fichier pris à la main, lu sur ce poste, pris par le lanceur) ; '' sans. */
export function regimeOf(id, item) {
  const s = catSource(id);
  // une source que le lanceur lit sur le site (`auto`) mais dont le catalogue dit que le fichier se PREND À LA MAIN (`fetch.pick` : le disque ISO du Portugal) est une source à la main pour l'écran : « Prise seule par le lanceur : rien à déposer » serait faux quand un fichier attend dans Téléchargements (SOG-0318)
  if (item?.regime && !(item.regime === 'auto' && (s?.fetch?.how === 'pick' || s?.fetch?.pick))) return item.regime;
  return !s ? '' : (s.fetch?.how === 'pick' || s.fetch?.pick) ? 'hand' : s.localOnly ? 'local' : s.fetch ? 'auto' : '';
}
/** La source n'est-elle plus offerte par son éditeur ? { since, note } d'après la liste du cycle (`unavailable`, ou l'état `unavailable` du téléchargement) et le catalogue (`stepsOf(id).unavailable`) ; null sinon. Rien n'est inventé : la note est celle du catalogue. */
export function unavailableOf(id, item) {
  const stepsOf = typeof S.d?.cat?.stepsOf === 'function' ? S.d.cat.stepsOf : null,
    cat = stepsOf ? stepsOf(id, S.cycleId)?.unavailable : null;
  if (!item?.unavailable && item?.download?.state !== 'unavailable' && !cat) return null;
  const since = item?.unavailable?.since || (typeof cat?.since === 'string' ? cat.since.slice(0, 10) : ''),
    note = Array.isArray(cat?.note) ? String(cat.note[li()] ?? cat.note[0] ?? '').slice(0, 400) : '';
  return {
    since,
    note
  };
}
/** Une source indisponible chez son éditeur, dite à part : son nom, depuis quand, la note du catalogue ; ni coche, ni inventaire, ni « en retard ». */
function unavailableHtml(id, item, un) {
  const name = (catSource(id)?.n?.[li()] || item?.label?.[li()] || id).replace(/\s*\(.*\)\s*$/, '');
  return `<section class="d-src" data-sheet-source="${esc(id)}" data-unavailable><h4>${esc(name)}</h4><p class="f-muted" data-unavailable-line>${esc(tt(TX.cw.unavailable, { d: un.since || '?' }))}${un.note ? ` ${esc(un.note)}` : ''}</p></section>`;
}
/** Un fichier de cette source est-il VU dans Téléchargements ? La liste du cycle (`hand.inDownloads` non vide) ou le statut du lanceur (`pickup-waiting` avec son zip) le dit. */
function handSeen(sid, z, item, cy) {
  return (cy.state === 'ready' && !!item?.hand?.inDownloads?.length) || (z?.reasons || []).some(r => r.code === 'pickup-waiting' && !!r
    .zip && (!r.source || r.source === sid));
}
/** Ce que la ligne DIRCAM dit du fichier à choisir, en mots : l'archive du SIA (son nom d'après le catalogue, `files[].file`, jamais un nom inventé), lue sur cet appareil, dont seul le PDF de l'ENR 5.7 part au lanceur ; '' pour toute autre source. */
function chooseHintHtml(sid) {
  if (sid !== DIRCAM_SOURCE) return '';
  const f = filesOf(sid, null).files[0],
    arc = typeof f?.file === 'string' && f.file !== f.name ? ` (${f.file.replace(/[\p{Cc}]/gu, ' ').slice(0, 80)})` : '';
  return `<p class="f-muted" data-choose-hint="${esc(sid)}">${esc(tt(TX.cwb.zip.hint, { f: arc, p: DIRCAM_MEMBER.split('/').pop() }))}</p>`;
}
/** Les gestes d'une source prise à la main, UN seul but : un fichier vu dans Téléchargements — « Prendre le fichier téléchargé » est le geste principal (il lance la prise de ce pays) et « Choisir un autre fichier… » un lien dessous ; rien de vu — « Choisir le fichier… » seul.
 *  Le bouton de choix dit sa source (`data-source`) : la ligne DIRCAM lit l'ENR 5.7 dans l'archive du SIA (upload.js). `msg` : l'avancement de l'envoi et ce que le dernier geste a dit (reçu, manquant, refusé) restent sur le bloc de la source du dernier geste. */
function handHtml(sid, zone, z, item, cy, msg) {
  const busy = busyNow(),
    seen = handSeen(sid, z, item, cy),
    choose = (cls, label) => `<button type="button"${cls} data-act="zone-upload" data-zone="${esc(zone)}" data-source="${esc(sid)}"${uploadOff() ? ' disabled' : ''}>${esc(tt(label))}</button>${uploadOff() ? sheetGrey(uploadWhy()) : ''}`,
    hint = chooseHintHtml(sid);
  if (!seen) return `<div class="d-hand" data-hand="${esc(sid)}" data-hand-state="none"><p class="d-zact">${choose('', TX.up.choose)}</p>${hint}${msg ? uploadHtml(zone) + zoneMsgHtml(zone) : ''}</div>`;
  const g = gateOf('base', 1, [M.PICKUP.verb]).verbs[M.PICKUP.verb],
    off = busy || g.disabled,
    grey = greyOnce(busy ? 'busy' : g.reason, 'base',
      'sheet'); // un bouton gris dit pourquoi, à côté de lui (la carte de l'opération en cours le dit déjà : pas deux fois)
  return `<div class="d-hand" data-hand="${esc(sid)}" data-hand-state="seen"><p class="d-zact"><span class="f-muted" data-hand-seen>${esc(tt(TX.cwb.seenLine))}</span> <button type="button" class="primary" data-verb="pickup" data-zones="${esc(zone)}" data-source="${esc(sid)}"${off ? ' disabled' : ''}>${esc(tt(TX.pickup))}</button>${off && grey ? ` <span class="f-muted" data-hand-grey data-grey="${esc(grey)}">${esc(tt(grey === 'busy' && progressHere() ? TX.zx.greyBusy : TX.greyReason[grey]))}</span>` : ''}</p>
    <p class="d-zact d-zalt" data-hand-alt="${esc(sid)}">${choose(' class="d-link"', TX.up.chooseOther)}</p>${hint}${msg ? uploadHtml(zone) + zoneMsgHtml(zone) : ''}</div>`;
}
/** La source calculée sur ce poste que base/cycle dit à part (`local`, K185) : { id, label[4], at, personal, zoneCount } ; null sans. */
const localSource = (cy, id) => cy.data?.local?.find(x => x.id === id) || null;
/** Une source calculée sur ce poste (MORA, X-Plane…) : un FAIT du pays (« MORA : calculée le 5 oct. »), jamais une ligne à faire ni une coche « téléchargé ». La date : celle de son fichier dans la fiche du pays, à défaut celle de `local`, à défaut la construction du pays. */
function computedHtml(name, item, z, loc) {
  const at = item?.download?.at || loc?.at || z?.builtAt || '';
  return `<p class="f-muted" data-computed-fact>${esc(at ? tt(TX.zx.computed, { s: name, d: dateOf(at) }) : tt(TX.zx.computedHere, { s: name }))}</p>`;
}
/** « Pourquoi à la main » : seulement ce que le catalogue en dit (`steps.why`, une phrase par langue) ; '' sans — jamais un texte inventé. */
function handWhyHtml(id) {
  const w = filesOf(id, null).steps?.why,
    t = Array.isArray(w) ? String(w[li()] ?? w[0] ?? '').replace(/[\p{Cc}]/gu, ' ').trim().slice(0, 400) : '';
  return t ? `<p class="d-why" data-hand-why><b class="d-cl">${esc(tt(TX.d4.whyHand))}</b> ${esc(t)}</p>` : '';
}
/** Une source du pays : son nom, son régime, sa coche « téléchargé » (dans la couverture seulement ; « construit » et « publié » sont des faits du PAYS, en tête de la fiche) et, pour un fichier pris à la main, l'inventaire puis ses gestes. */
function sourceHtml(id, zone, z, inCov, msg) {
  const cy = cycleOf(zone),
    loc = cy.state === 'ready' ? localSource(cy, id) : null,
    item = cy.state === 'ready' ? cy.zv?.sources[id] || cy.data.items[id] || null : null,
    reg = regimeOf(id, item || (loc ? {
      regime: 'local'
    } : null)),
    name = (catSource(id)?.n?.[li()] || item?.label?.[li()] || loc?.label?.[li()] || id).replace(/\s*\(.*\)\s*$/, '');
  const ds = item?.download?.state,
    tone = ds === 'done' ? 'ok' : ds === 'failed' ? 'err' : !ds || ds === 'n/a' || ds === 'unavailable' ? 'muted' :
    'warn'; // la couleur du bord gauche du bloc : l'état de CETTE source
  return `<section class="d-src" data-sheet-source="${esc(id)}" data-src-tone="${tone}"${reg ? ` data-regime="${reg}"` : ''}><div class="d-srch"><h4>${esc(name)}</h4>${reg ? `<p class="f-muted d-regbadge" data-regime-line>${esc(tt(TX.cw.regime[reg]))}</p>` : ''}</div>
    ${inCov && !M.isComputed(reg) ? `<ul class="d-ticks d-cells d-cells1">${downloadTick(id, item, z)}</ul>` : ''}${inCov && M.isComputed(reg) ? computedHtml(name, item, z, loc) : ''}${M.isComputed(reg) ? '' : handWhyHtml(id)}${reg === 'hand' ? inventoryHtml(id, item, cy, zone) : ''}${reg === 'hand' ? handHtml(id, zone, z, item, cy, msg) : ''}</section>`;
}
/** Le geste « Mettre à jour ce pays » : le même chemin que le bouton du haut et celui d'un paquet, pour CE pays seul (il ne fait que ce qui manque : le téléchargement de ce qui n'est pas là, puis la construction du pays) ; la ligne dessous dit ce qu'il va faire ;
 *  gris, il écrit pourquoi (pas de lanceur, ce pays attend un fichier à la main ou la coche d'usage personnel, il est à jour ; l'opération en cours, la carte la dit déjà). `primary` : faux quand un fichier vu dans Téléchargements est le geste principal. */
/** Ce qu'il faut faire MAINTENANT pour un pays, d'après l'état du lanceur : { k: 'fresh' | 'pick' | 'file' | 'tick' | 'update' } (une seule chose) ; null quand rien n'est dit (pas de lanceur, état non lu, geste grisé pour une autre raison). La phrase de tête de la fiche et le bouton « Mettre à jour ce pays » le lisent
 *  tous deux : ils ne peuvent pas se contredire (SOG-0318). `seenAny` : un fichier est vu dans Téléchargements pour une source à la main du pays. */
function nowOf(id, seenAny) {
  const gate = updateGate([id]),
    plan = S.status && statusKnown() ? M.downloadPlan(S.status, [id]) : null;
  if (gate.disabled || !plan) return null;
  if (plan.upToDate.includes(id)) return {
    k: 'fresh'
  };
  if (plan.waiting.includes(id)) return {
    k: seenAny ? 'pick' : 'file'
  };
  if (plan.personal.includes(id)) return {
    k: 'tick'
  };
  return {
    k: 'update'
  };
}
/** La phrase de tête de la fiche d'un pays : UNE chose à faire maintenant (prendre le fichier vu, déposer le fichier attendu, cocher, mettre à jour, rien) ; '' sans lanceur ou sans état lu. */
function nowHtml(id, seenAny) {
  const n = nowOf(id, seenAny);
  return n ? `<p class="d-now" data-sheet-now data-now="${n.k}"><b>${esc(tt(TX.now[n.k]))}</b></p>` : '';
}

function updateBlockHtml(id, primary, seenAny = false) {
  const T = TX.cwb,
    gate = updateGate([id]),
    plan = S.status && statusKnown() ? M.downloadPlan(S.status, [id]) : null;
  if (progressOn(id)) return `<div class="d-upd" data-sheet-update data-running>${progressHtml(id)}</div>`; // le bouton DEVIENT son avancement, sur place : l'étape, « n sur m », la barre, « Arrêter »
  let off = gate.disabled,
    why = gate.disabled && greyOnce(gate.reason, 'base', 'sheet') ? [gate.reason, tt(gate.reason === 'busy' && progressHere() ? TX.zx
      .greyBusy : TX.greyReason[gate.reason])] : null,
    line = '',
    tick = false;
  if (!off && plan) {
    if (plan.upToDate.includes(id))[off, why] = [true, ['up-to-date', tt(T.upToDate)]];
    else if (plan.waiting.includes(id) && seenAny) line = tt(T
      .doLine, { // un fichier est vu dans Téléchargements : le geste le prend, puis construit
        l: [tt(TX.zx.doPick), tt(T.doBuild)].join(', ')
      });
    else if (plan.waiting.includes(id))[off, why] = [true, ['waits-file', tt(T.waitsFile)]];
    else if (plan.personal.includes(id))[off, why, tick] = [true, ['waits-tick', tt(T.waitsTick)], true];
    else line = tt(T.doLine, {
      l: [plan.fetch.includes(id) ? tt(T.doDl) : '', plan.build.includes(id) ? tt(T.doBuild) : ''].filter(Boolean).join(', ')
    });
  }
  return `<div class="d-upd" data-sheet-update><p class="d-verbs"><button type="button"${primary ? ' class="primary"' : ''} data-act="sheet-update" data-zone="${esc(id)}"${off ? ' disabled' : ''}>${esc(tt(T.update))}</button></p>${line ? `<p class="f-muted" data-sheet-update-plan>${esc(line)}</p>` : ''}${why ? `<p class="f-muted" data-sheet-update-reason="${esc(why[0])}" data-grey="${esc(why[0])}">${esc(why[1])}${tick ? ` <button type="button" class="d-link" data-act="zone-certify">${esc(tt(TX.toCertify))}</button>` : ''}</p>` : ''}</div>`;
}
/** Le téléchargement de ce pays qui vient d'échouer (la fin de « Mettre à jour » le dit) : ce que le site a répondu ; le fichier choisi à la main reste le chemin (la FAA : l'abonnement du cycle, UN fichier). '' sans échec. */
function failedHtml(id) {
  const ff = S.result?.set === 'base' && S.result.verb === 'fetch' ? (S.result.out?.failed || []).filter(f => f.zone === id) : [];
  if (!ff.length) return '';
  const nasr = ff.some(f => f.source === 'faa' || f.source === 'faaclass');
  return `<div class="d-src" data-sheet-failed>${S.cw.thread.has(id) ? '' : `<p class="f-warn">${esc(tt(TX.cwb.failedLine, { r: sourcesWhy(ff.map(f => ({ source: f.source, code: f.error, status: f.status ?? null }))) }))}</p>`}${nasr ? `<p class="f-muted" data-nasr-hint>${nasrHint()}</p>` : ''}${nasr || pickSource(id) ? `<p class="d-zact"><button type="button" data-act="zone-upload" data-zone="${esc(id)}" data-source=""${uploadOff() ? ' disabled' : ''}>${esc(tt(TX.up.choose))}</button>${uploadOff() ? sheetGrey(uploadWhy()) : ''}</p>` : ''}</div>`;
}
/** Le nom court d'une source (celui du catalogue, à défaut celui de la liste du cycle ou son identifiant), sans la parenthèse de ses formats. */
const srcName = (id, cy) => String(catSource(id)?.n?.[li()] || cy.data?.items?.[id]?.label?.[li()] || id).replace(/\s*\(.*\)\s*$/, '');
/** « Ajouter à ma couverture » pour un pays qui n'y est pas : ce que cela demandera (base/cycle { zone } : `addWillAsk` — les sources que le lanceur télécharge seul, celles à prendre à la main avec leurs fichiers attendus, celles qui demandent la coche « Je certifie… », celles déposées et pas encore lues), puis le bouton ; ajouter n'écrit que la couverture, rien n'est téléchargé. Le bouton n'est offert que pour un pays que la suite connaît. */
function addHtml(id, cy) {
  const T = TX.lc,
    w = cy.zv?.addWillAsk,
    known = (S.d?.zones || []).some(z => z.id === id);
  if (!w) return cy.state === 'loading' ? `<p class="f-muted" data-add-state="loading">${esc(tt(T.addReading))}</p>` : '';
  const nm = s => srcName(s, cy),
    li4 = (key, attr, text) => `<li data-ask="${key}"${attr}>${esc(text)}</li>`,
    hand = w.hand.map(h => `${nm(h.id)}${h.expected.length ? ` (${h.expected.join(', ')})` : ''}`),
    asks = [w.auto.length ? li4('auto', '', tt(T.addAuto, {
        s: w.auto.map(nm).join(', ')
      })) : '', hand.length ? li4('hand', '', tt(T.addHand, {
        s: hand.join(' ; ')
      })) : '', w.personal.length ? li4('personal', '', tt(T.addPersonal, {
        s: w.personal.map(nm).join(', ')
      })) : '',
      w.noReader.length ? li4('noreader', ' data-sheet-noreader', tt(T.addNoReader, {
        s: w.noReader.map(nm).join(', ')
      })) : ''
    ].filter(Boolean);
  return `<div class="d-addask" data-add-ask><p><b>${esc(tt(T.addTitle))}</b></p><ul>${asks.join('') || li4('nothing', '', tt(T.addNothing))}</ul>${known ? `<p class="d-verbs"><button type="button" class="primary" data-act="add-country" data-zone="${esc(id)}"${frozen() ? ' disabled' : ''}>${esc(tt(T.addBtn))}</button>${frozen() ? sheetGrey('busy') : ''}</p><p class="f-muted">${esc(tt(T.addNote))}</p>` : ''}</div>`;
}
/** « Retirer de ma couverture » au pied de la fiche d'un pays de la couverture : un lien, la question d'abord (ses fichiers ne sont jamais purgés). */
function removeHtml(id) {
  return `<p class="d-zact d-remove" data-sheet-remove><button type="button" class="d-link" data-act="remove-country" data-zone="${esc(id)}"${frozen() ? ' disabled' : ''}>${esc(tt(TX.lc.removeBtn))}</button>${frozen() ? sheetGrey('busy') : ''}</p>`;
}
/** « Publier cette zone… » sur la fiche d'un pays construit et pas encore envoyé : ouvre le même plan, pour cette zone (le lanceur sait établir le plan) ; rien sinon. */
function sheetPublishHtml(id, z) {
  if (!planKnown() || z?.publish?.state !== 'unpublished') return '';
  return `<p class="d-verbs" data-sheet-publish><button type="button" data-act="sheet-publish" data-zone="${esc(id)}"${publishGate().disabled ? ' disabled' : ''}>${esc(tt(TX.lc.sheetPublish))}</button>${publishGate().disabled ? ` <span class="f-muted" data-grey="${esc(publishGate().reason || '')}">${esc(publishReason(publishGate().reason))}</span>` : ''}</p>`;
}
/** La fiche d'un pays : son nom et son état ; les FAITS du pays (construit, publié : une seule fois, jamais sous chaque source) ; « Mettre à jour ce pays » ; la carte de l'opération en cours quand le geste a été refusé et la marche ; ses procédures ; ses sources avec leur « téléchargé »,
 *  l'inventaire de leurs fichiers et leurs gestes de fichier. Un « Fermer » en croix en large, « ← Retour » au téléphone (plein écran) ; '' sans pays ouvert. */
function sheetHtml() {
  const id = S.cw.sheet;
  if (!id) return '';
  const T = TX.cw,
    inCov = S.d.cov.ids.includes(id),
    cy = cycleOf(id),
    z = Object.hasOwn(S.status?.zones || {}, id) ? S.status.zones[id] : inCov && cy.zv?.state ? cy.zv.state :
    null, // l'état du lanceur ; à défaut celui de la vue par pays
    name = nameOf(id),
    procs = S.cw.proc?.zones?.[id],
    ids = M.sourcesOfZone(id, S.d.cat, S.status, cy.state === 'ready' ? cy.data : null),
    split = ids.map(s => {
      const item = cy.state === 'ready' ? cy.zv?.sources[s] || cy.data.items[s] || null : null;
      return {
        id: s,
        item,
        un: unavailableOf(s, item)
      };
    }),
    avail = split.filter(x => !x.un).map(x => x.id), // les sources indisponibles chez leur éditeur sont dites à part
    gone = split.filter(x => x.un),
    noReader = (cy.zv?.addWillAsk.noReader || []).map(x => (catSource(x)?.n?.[li()] || x).replace(/\s*\(.*\)\s*$/, '')),
    hands = avail.filter(s => regimeOf(s, split.find(x => x.id === s)?.item) === 'hand'),
    msgSrc = inCov && hands.length ? hands.includes(S.cw.hand.get(id)) ? S.cw.hand.get(id) : hands[0] :
    null, // la source du dernier geste de fichier garde l'avancement et le message
    seenAny = inCov && hands.some(s => handSeen(s, z, split.find(x => x.id === s)?.item, cy)),
    op = cardAreaHtml('base', 'sheet')
    .trim(); // la carte de l'opération qui a refusé le geste de CETTE fiche ; la fiche ne montre que son pays (son fil), jamais le bilan d'une autre opération ; le fil, la carte et l'avancement de la dernière opération sont SOUS l'état, avant les sources (visibles sans parcourir les inventaires)
  const gp = packList().find(x => x.pack.zones.includes(id))?.pack,
    sub = [id.toUpperCase(), gp ? tt(TX.d2.subGroup, {
      g: gp.names[li()] || gp.names[0]
    }) : '', partsText(id)].filter(Boolean).join(' \u00b7 '),
    facts = inCov ? [buildFact(id, z), publishFact(z)].filter(Boolean) : [],
    tn = tone(id);
  return `<section class="d-sheet" data-sheet="${esc(id)}" role="region" aria-label="${esc(tt(T.sheetLabel, { c: name }))}">
    <header class="d-sheeth"><button type="button" class="d-back" data-act="sheet-close">${esc(tt(T.back))}</button><div class="d-sheett"><h3 data-sheet-name>${esc(name)}</h3><p class="d-sheetsub f-muted" data-sheet-sub>${esc(sub)}</p></div><span class="d-sbadge" data-tone="${esc(tn)}" data-sheet-badge><b aria-hidden="true">${M.own(SIGN_OF, tn) || ''}</b> ${esc(word(tn))}</span><button type="button" class="d-x" data-act="sheet-close" aria-label="${esc(tt(TX.cwb.close))}" title="${esc(tt(TX.cwb.close))}"><span aria-hidden="true">\u2715</span></button></header>
    ${inCov ? `<div class="d-cells3"><div class="d-sheetst d-cell" data-sheet-state><span class="d-cl">${esc(tt(TX.d2.stateCell))}</span>${zoneStateHtml(id) || `<span class="d-st">${esc(word(tn))}</span>`}</div><ul class="d-ticks d-facts d-cells" data-sheet-facts>${facts.map(f => f.li).join('')}</ul></div>${facts.some(f => f.note) ? `<div class="d-cellnotes" data-cell-notes>${facts.map(f => f.note).join('')}</div>` : ''}` : `<p data-sheet-out>${esc(tt(T.notInCoverage, { c: name }))}</p>`}
    ${inCov ? nowHtml(id, seenAny) : ''}
    ${S.cw.proc?.state === 'ready' ? `<p class="f-muted" data-sheet-proc>${esc(procs ? tt(T.procYes, { s: procs.map(procName).join(', ') }) : tt(T.procNo))}</p>` : ''}
    ${noReader.length && inCov ? `<p class="f-warn" data-sheet-noreader>${esc(tt(T.noReader, { s: noReader.join(', ') }))}</p>` : ''}
    ${inCov ? '' : addHtml(id, cy)}
    ${op ? `<div data-sheet-op>${op}</div>` : ''}${inCov ? threadHtml(id) : ''}${inCov ? failedHtml(id) : ''}${inCov && progressOn(id) ? updateBlockHtml(id, !seenAny, seenAny) : ''}
    <h4 class="d-sh">${esc(tt(T.sourcesTitle))}</h4>${ids.length ? `${avail.map(s => sourceHtml(s, id, z, inCov, s === msgSrc)).join('')}${gone.length ? `<h4 data-unavailable-title>${esc(tt(T.unavailableTitle))}</h4>${gone.map(g => unavailableHtml(g.id, g.item, g.un)).join('')}` : ''}` : `<p class="f-muted" data-sheet-nosource>${esc(tt(T.noSources))}</p>`}
    ${inCov ? sheetPublishHtml(id, z) : ''}
    ${inCov && !progressOn(id) ? updateBlockHtml(id, !seenAny, seenAny) : ''}
    ${inCov && !msgSrc ? `<div data-sheet-msg>${uploadHtml(id)}${zoneMsgHtml(id)}</div>` : ''}${inCov ? removeHtml(id) : ''}</section>`;
}
/** Le bloc de la base sous la barre d'état : la carte (et la fiche à sa droite quand un pays est ouvert, en large), puis « ce qui reste à faire ce mois-ci », puis les paquets. */
export function countriesHtml() {
  if (!S.cw || !S.d) return '';
  const map = mapHtml(),
    sheet = sheetHtml(),
    todo = todoHtml(),
    groups = groupsHtml();
  if (!map && !sheet && !groups && !todo) return '';
  return `<div class="d-cw" data-countries><div class="d-cwtop"${sheet ? ' data-sheet-open' : ''}>${map}${sheet || (map ? `<aside class="d-sheetph" data-sheet-empty><b>${esc(tt(TX.d2.emptyTitle))}</b><p class="f-muted">${esc(tt(TX.d2.emptyHint))}</p></aside>` : '')}</div>${todo}${groups}</div>`;
}
/** Le sélecteur qui retrouve l'élément touché après un redessin (le focus lui revient à la fermeture de la fiche). */
function selectorOf(el, zone) {
  const z = CSS.escape(zone);
  return el.closest('[data-wmap]') ? `[data-wmap] [data-zone="${z}"]` : el.closest('[data-todo]') ? `[data-todo] [data-act="open-country"][data-zone="${z}"]` : el.closest('[data-cw-groups]') ? `[data-cw-groups] [data-act="open-country"][data-zone="${z}"]` :
    `[data-act="open-country"][data-zone="${z}"]`;
}
/** Ouvre la fiche d'un pays (toucher sur la carte, dans un paquet ou dans la liste de la phrase d'état) ; sans pays connu, rien. Le focus passe au bouton « Retour ». */
export function openCountry(el) {
  const id = el?.dataset?.zone;
  if (!S.d || !/^[a-z0-9_-]{2,12}$/.test(id || '')) return;
  S.cw.opener = selectorOf(el, id);
  S.cw.sheet = id;
  wantCycle(id);
  renderBuild();
  closeControl()?.focus({
    preventScroll: true
  });
}
/** Le contrôle de fermeture visible de la fiche : la croix « Fermer » en large, « ← Retour » au téléphone (l'autre est masqué par la mise en page). */
function closeControl() {
  return [...(S.body?.querySelectorAll('[data-sheet] [data-act="sheet-close"]') || [])].find(b => b.offsetParent !== null) || null;
}
/** Ouvre la fiche d'un pays par son identifiant (le lien #data?zone=<id>), sans élément touché. */
export function openCountryById(id) {
  if (!S.d || !/^[a-z0-9_-]{2,12}$/.test(id || '')) return;
  S.cw.opener = '';
  S.cw.sheet = id;
  wantCycle(id);
}
/** Ferme la fiche et rend le focus à ce qui l'avait ouverte. */
export function closeSheet() {
  if (!S.cw?.sheet) return;
  const back = S.cw.opener;
  S.cw.sheet = null;
  renderBuild();
  const el = back ? S.body?.querySelector(back) : null;
  (el || S.body?.querySelector('[data-cw-groups] [aria-expanded="true"], [data-wmap]'))?.focus?.({
    preventScroll: true
  });
}
/** Ouvre le paquet touché et ferme les autres (un seul à la fois) ; le même touché le referme. */
export function toggleGroup(id) {
  S.cw.grp = S.cw.grp === id ? null : id;
  S.cw.world = false; // le groupe ouvert cadre la carte, sa fermeture la rend à la couverture
  S.cw.home = false;
  S.cw.view = null;
  renderBuild();
}
/** Le « ? » de la légende : la seconde ligne (hachure, bordure, pointillé) se montre ou se cache. */
export function toggleLegend() {
  S.cw.legend = !S.cw.legend;
  renderBuild();
}
/** « Ajouter à ma couverture » : le pays entre dans la couverture de ce poste (écrite, rien n'est téléchargé : il passe dans « à faire ») ; la fiche, l'état des pays et la liste du mois se relisent. */
export function addCountry(zone) {
  if (!S.d || frozen() || !/^[a-z0-9_-]{2,12}$/.test(zone || '')) return;
  if (!addZones([zone])) return;
  S.ctx.notify(tt(TX.lc.added, {
    c: nameOf(zone)
  }), 'ok');
  forgetReads(false, true);
  renderBuild();
}
/** « Retirer de ma couverture » : une question d'abord (les fichiers du pays restent où ils sont, jamais purgés), puis le pays sort de la couverture de ce poste ; la fiche reste ouverte, comme celle d'un pays hors couverture. */
export async function removeCountry(zone) {
  const me = S;
  if (!S.d || frozen() || !S.d.cov.ids.includes(zone)) return;
  const yes = await S.ctx.ask(tt(TX.lc.removeAsk, {
    c: nameOf(zone)
  }), {
    ok: tt(TX.lc.removeBtn)
  });
  if (S !== me || !yes) return;
  if (!removeZones([zone])) return;
  S.ctx.notify(tt(TX.lc.removed, {
    c: nameOf(zone)
  }), 'ok');
  forgetReads(false, true);
  renderBuild();
}
/** Le pli « Déjà faits » de « ce qui reste à faire » : son état est retenu d'un dessin à l'autre. */
export function toggleDone() {
  S.cw.doneOpen = !S.cw.doneOpen;
}
/** Le pays survolé (souris) : il se remplit seul sur la carte et dans son paquet, les autres gardent leur bordure ; `id` vide : plus rien. Seuls les attributs bougent, rien n'est redessiné. */
export function hoverZone(id) {
  if (!S?.cw || S.cw.hover === (id || null)) return;
  S.cw.hover = id || null;
  for (const el of S.body?.querySelectorAll('[data-hover]') || []) el.removeAttribute('data-hover');
  if (!id) return;
  const sel = `[data-hz="${CSS.escape(id)}"]`,
    path = S.body?.querySelector(`[data-wmap] ${sel}`);
  for (const el of S.body?.querySelectorAll(sel) || []) el.setAttribute('data-hover', '');
  path?.parentNode?.append(path); // le pays survolé passe au-dessus de ses voisins
}
/** Surligne sur la carte les pays d'un paquet de la liste « Ajouter ou retirer » (survol, appui) ; `ids` vide : plus rien. Seuls les attributs bougent. */
export function highlightZones(ids) {
  const set = new Set(ids || []);
  if (set.size === (S.packHl?.size || 0) && [...set].every(z => S.packHl?.has(z))) return;
  S.packHl = set;
  for (const el of S.body?.querySelectorAll('[data-wmap] [data-hl]') || []) el.removeAttribute('data-hl');
  for (const z of set) S.body?.querySelector(`[data-wmap] [data-zone="${CSS.escape(z)}"]`)?.setAttribute('data-hl', '');
}
/** Lit une fois par fiche ouverte (et après chaque opération), sans écrire, la vue du lanceur sur ce pays (base/cycle `{ zone }` : toutes ses sources avec leurs trois étapes, Téléchargements, ce qu'ajouter le pays demandera) : jamais avant l'ouverture, jamais pour un lanceur qui ne
 *  connaît pas le verbe ; refusée tant qu'un autre travail tourne (« occupée », relue dès que l'écran est libre). Pendant la relecture d'une fiche déjà lue, l'ancienne lecture reste affichée (les états « vu » / « manquant » ne clignotent pas). Ne lève jamais. */
export async function wantCycle(zone) {
  const L = S?.ctx?.launcher,
    c = S?.cw?.cycle;
  if (!zone || (c && c.zone === zone && (c.reading || (!c.dirty && (c.state === 'loading' || c.state === 'ready' || c.state ===
      'none'))))) return;
  if (!L || !S.known?.includes('base/cycle')) {
    S.cw.cycle = {
      zone,
      state: 'none'
    };
    return;
  }
  const me = S,
    keep = c && c.zone === zone && c.state === 'ready' ? c.data : null,
    mine = S.cw.cycle = keep ? {
      zone,
      state: 'ready',
      data: keep,
      reading: true
    } : {
      zone,
      state: 'loading',
      reading: true
    };
  if (S.statusP) await S.statusP.catch(() => null);
  if (S !== me) return;
  const final = await readJob('cycle', {
    zone,
    personal: personalPicked(buildZones().ids)
  });
  if (S !== me || S.cw.cycle !== mine) return; // un autre pays a été ouvert pendant la lecture : sa lecture est la sienne
  const data = M.cycleRead(final);
  S.cw.cycle = data ? {
    zone,
    state: 'ready',
    data
  } : final?.status === 409 ? keep ? {
    zone,
    state: 'ready',
    data: keep,
    dirty: true,
    at: Date.now(),
    tries: (c?.tries || 0) + 1
  } : {
    zone,
    state: 'busy',
    at: Date.now(),
    tries: (c?.tries || 0) + 1
  } : {
    zone,
    state: 'unread'
  };
  if (data)
    for (const k of [...S.cw.recv.keys()]) { // la lecture du pays fait foi : un fichier reçu qu'elle ne voit plus n'est plus dit « reçu »
      const [z, src] = k.split('/'),
        r = S.cw.recv.get(k),
        it = z === zone ? data.zoneView?.sources?.[src] || data.items?.[src] : null;
      if (z === zone && !M.fileSeen(r.name, it?.hand?.inDownloads)) S.cw.recv.delete(k);
    }
  renderBuild();
}
/** Lit, sans écrire, le journal du lanceur (base/last, K191) : la dernière opération de la prise, du téléchargement, de la construction et de la mise à jour, qui survit au rechargement de la page ; la fiche d'un pays en tire le fil de sa dernière opération (zoneop.js : threadOf).
 *  Lue une fois à l'ouverture de l'écran et après chaque fin d'opération, par la file de l'écran (serial) comme les autres lectures ; un lanceur qui n'a pas le verbe n'est pas interrogé (le fil reste celui que la page tient en mémoire). L'ancienne lecture reste affichée pendant la relecture. Ne lève jamais. */
export async function wantLast() {
  const L = S?.ctx?.launcher,
    c = S?.cw?.last;
  if (c && (c.reading || (!c.dirty && (c.state === 'loading' || c.state === 'ready' || c.state === 'none')))) return;
  if (!L || !S.known?.includes('base/last')) {
    S.cw.last = {
      state: 'none'
    };
    return;
  }
  const me = S,
    keep = c && c.state === 'ready' ? c.data : null,
    mine = S.cw.last = keep ? {
      state: 'ready',
      data: keep,
      reading: true
    } : {
      state: 'loading',
      reading: true
    };
  if (S.statusP) await S.statusP.catch(() => null);
  if (S !== me) return;
  const final = await readJob('last', {});
  if (S !== me || S.cw.last !== mine) return;
  const data = M.lastOf(final);
  S.cw.last = data ? {
    state: 'ready',
    data
  } : final?.status === 409 ? keep ? {
    state: 'ready',
    data: keep,
    dirty: true,
    at: Date.now(),
    tries: (c?.tries || 0) + 1
  } : {
    state: 'busy',
    at: Date.now(),
    tries: (c?.tries || 0) + 1
  } : {
    state: 'unread'
  };
  renderBuild();
}
/** Un travail du lanceur en lecture seule (le verbe `base/<verb>`), passé à la file de l'écran ; refusé (`{ status: 409 }`, sans appel) quand une opération tourne à l'instant du départ ; null si le lanceur n'a pas répondu. Ne lève jamais. */
async function readJob(verb, args) {
  const L = S?.ctx?.launcher;
  try {
    return await serial(() => busyNow() ? {
      status: 409
    } : L.job(ROUTE, {
      set: 'base',
      verb,
      args
    }, {
      onProgress: () => {},
      signal: new AbortController().signal
    }));
  } catch {
    return null;
  }
}
/** Lit « ce qui reste à faire ce mois-ci » : la liste du cycle (base/cycle sans pays) lue une fois à l'ouverture de l'écran, puis après chaque opération ; sans lanceur ni verbe, rien n'est lu (le bloc n'est pas dessiné). L'ancienne liste reste affichée pendant la relecture. Ne lève jamais. */
export async function wantTodo() {
  const L = S?.ctx?.launcher,
    c = S?.cw?.todo;
  if (c && (c.reading || (!c.dirty && (c.state === 'loading' || c.state === 'ready' || c.state === 'none')))) return;
  if (!L || !S.known?.includes('base/cycle')) {
    S.cw.todo = {
      state: 'none'
    };
    return;
  }
  const me = S,
    keep = c && c.state === 'ready' ? c.data : null,
    mine = S.cw.todo = keep ? {
      state: 'ready',
      data: keep,
      reading: true
    } : {
      state: 'loading',
      reading: true
    };
  if (!keep) renderBuild();
  if (S.statusP) await S.statusP.catch(() => null);
  if (S !== me) return;
  const final = await readJob('cycle', {
    personal: personalPicked(buildZones().ids)
  });
  if (S !== me || S.cw.todo !== mine) return;
  const data = M.cycleRead(final);
  S.cw.todo = data ? {
    state: 'ready',
    data
  } : final?.status === 409 ? keep ? {
    state: 'ready',
    data: keep,
    dirty: true,
    at: Date.now(),
    tries: (c?.tries || 0) + 1
  } : {
    state: 'busy',
    at: Date.now(),
    tries: (c?.tries || 0) + 1
  } : {
    state: 'unread'
  };
  renderBuild();
  refreshFoldStates(); // les plis des autres jeux disent ce que la liste du cycle vient d'en lire (`datasets`)
}
/** Lit une fois, sans écrire, d'où viennent les procédures de chaque pays (base/coverage : `procSources`, SOG-0264) pour la hachure de la carte ; pas de lecture sans lanceur ni sans le verbe, ni pendant un autre travail (relue au prochain dessin). Ne lève jamais. */
export async function wantProc() {
  const L = S?.ctx?.launcher;
  if (!L || !S.known?.includes('base/coverage') || S.cw.proc?.state === 'loading' || S.cw.proc?.state === 'ready') return;
  const me = S;
  if (S.cov?.rows) { // le tableau de couverture a déjà lu la même chose
    S.cw.proc = {
      state: 'ready',
      zones: M.procZonesOf(S.cov.rows)
    };
    return renderBuild();
  }
  const cw = S.cw;
  cw.proc = {
    state: 'loading',
    zones: {}
  };
  cw.procP = new Promise(done => {
    cw.procDone = done; // le tableau « Couverture par pays » qui s'ouvre pendant la lecture l'attend (covtable.js)
  });
  try {
    if (S.statusP) await S.statusP.catch(() => null);
    if (S !== me) return;
    if (busyNow()) {
      cw.proc = null;
      return;
    }
    const final = await readJob('coverage', {});
    if (S !== me) return;
    const rows = final?.status === 409 ? null : M.coverageOf(final);
    cw.proc = {
      state: rows ? 'ready' : 'unread',
      zones: rows ? M.procZonesOf(rows) : {}
    };
    cw.procRows = rows; // le tableau « Couverture par pays » reprend cette lecture à sa première ouverture (une seule lecture)
    if (rows) renderBuild();
  } finally {
    cw.procDone();
    cw.procP = null;
  }
}
/** Ce qui se lit après un dessin complet de l'écran : les procédures par pays (la hachure), la liste du cycle (« ce qui reste à faire ») et, si une fiche est ouverte, la vue de son pays. */
export function afterDraw() {
  if (!S?.cw) return;
  wantSetStates(); // l'état des autres jeux, dit par les verbes d'état du lanceur (SOG-0119)
  wantProc();
  wantTodo();
  wantLast();
  wantPlan(); // ce que « Publier » emporterait (base/publish à blanc)
  if (S.cw.sheet) wantCycle(S.cw.sheet);
}
/** Les lectures à refaire (une opération vient de finir, un fichier a été envoyé : les fichiers ont bougé). La liste du cycle et la vue du pays ouvert sont marquées « à relire » (elles restent affichées jusqu'à la réponse) ; `all` : les procédures aussi (après un rechargement des données). */
export function forgetReads(all = true, status = false) {
  if (!S?.cw) return;
  if (S.cw.cycle) S.cw.cycle.dirty = true;
  if (S.cw.todo) S.cw.todo.dirty = true;
  if (S.cw.last) S.cw.last.dirty = true;
  forgetSetStates();
  forgetPlan();
  if (all && S.cw.proc?.state !== 'loading') S.cw.proc = null;
  if (status) S.cw.statusDirty =
    true; // un fichier a bougé sans rechargement des données (une prise, un envoi, un plan) : l'état des pays se relit aussi
}
/** Quand l'écran est libre (aucune opération) : relit ce qui est « à relire » ou qu'une opération avait refusé — appelée à chaque redessin des panneaux, ne relit jamais une lecture qui a échoué (pas de boucle). */
export function readsIdle() {
  const c = S?.cw;
  if (!c || !S.d || busyNow()) return;
  if (c.statusDirty) {
    c.statusDirty = false;
    refreshStatus(S.d.cov.ids); // les lectures qui suivent attendent celle-ci (S.statusP)
  }
  // une lecture que le lanceur a refusée (une autre opération tourne chez lui sans que la page la connaisse) est retentée tout de suite deux fois (la fin d'une opération la débloque), puis au plus toutes les 4 s : chaque relecture redessine l'écran, qui rappelle readsIdle, et le lanceur occupé faisait tourner la page en boucle
  const due = r => !!r && (r.dirty || r.state === 'busy') && !(r.tries >= 3 && Date.now() - r.at < 4000);
  if (c.sheet && due(c.cycle)) wantCycle(c.sheet);
  if (due(c.todo)) wantTodo();
  if (due(c.last)) wantLast();
  if (c.lc?.nat?.deferred && c.lc.open.change)
    natOpen(); // la reprise des routes NAT, reportée pour cause d'opération en cours, repart quand l'écran est libre
  setStatesIdle(); // l'état des autres jeux : relu quand il est « à relire » ou qu'un refus l'a laissé en attente
  wantPlan(); // le plan de « Publier » : lu dès que l'état des zones l'est, relu quand il est « à relire »
}
/** La mise en page propre à la carte, aux paquets et à la fiche (à côté de STYLE, jetons du cadre). En large la fiche est à droite de la carte ; au téléphone elle recouvre l'écran (position fixe, son propre défilement). */
export const CW_STYLE = `
[data-module="data"]{--d-ok-bg:color-mix(in srgb,var(--sog-ok) 12%,var(--sog-surface));--d-warn-bg:color-mix(in srgb,var(--sog-warn) 13%,var(--sog-surface));--d-err-bg:color-mix(in srgb,var(--sog-err) 11%,var(--sog-surface));--d-soft:color-mix(in srgb,var(--sog-muted) 9%,var(--sog-surface));--d-acc-bg:color-mix(in srgb,var(--sog-accent) 9%,var(--sog-surface));--d-sea:color-mix(in srgb,var(--sog-accent) 7%,var(--sog-surface));--d-ok-line:color-mix(in srgb,var(--sog-ok) 40%,var(--sog-surface));--d-err-line:color-mix(in srgb,var(--sog-err) 40%,var(--sog-surface));--d-warn-line:color-mix(in srgb,var(--sog-warn) 45%,var(--sog-surface))}
/* l'en-tête du cycle : le titre, sa barre, la phrase d'état en légende, le bouton et, à côté, ce qu'il fait (la forme de la maquette validée, lot D2) */
[data-module="data"] [data-data-head]{border:0;background:none;box-shadow:none;padding:0;margin:0 0 6px}
[data-module="data"] [data-data-head] p{margin:2px 0}
[data-module="data"] .d-title{margin:6px 0 6px;font-size:1.25rem;font-weight:700;line-height:1.25}
[data-module="data"] .d-title-ok{color:var(--sog-ok)}
[data-module="data"] .d-cbar{height:8px;background:var(--d-soft);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);overflow:hidden}
[data-module="data"] .d-cbar>i{display:block;height:100%;background:var(--sog-ok)}
[data-module="data"] .d-cap{margin:6px 0 2px;color:var(--sog-muted);font-size:var(--sog-size-xs,.8rem);line-height:1.4}
[data-module="data"] .d-cap button{min-height:var(--sog-touch);padding:0 2px;border:0;background:none;color:var(--sog-link);text-decoration:underline;font:inherit}
[data-module="data"] .d-cap button[aria-expanded="true"]{font-weight:700;outline:0}
[data-module="data"] .d-go{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center;margin:4px 0}
[data-module="data"] .d-go>.d-verbs{margin:0}
[data-module="data"] .d-go>[data-update-reason]{flex:1 1 100%;margin:0}
[data-module="data"] .d-go [data-verb="update"]{min-width:230px;font-weight:600}
[data-module="data"] .d-what{flex:1 1 260px;min-width:0;font-size:.85rem}
[data-module="data"] .d-what p{margin:2px 0}
/* la page : une colonne ; en large, deux (la fiche d'un pays est une carte collante à droite, tout le reste à gauche) */
[data-module="data"] .d-page{min-width:0}
[data-module="data"] .d-page>.f-card{margin-bottom:var(--sog-gap)}
[data-module="data"] .d-cw{display:grid;gap:12px;margin:4px 0 12px;min-width:0}
[data-module="data"] .d-cwtop{display:grid;gap:12px;min-width:0}
/* les titres de section : petites capitales, leur aide sur la même ligne */
[data-module="data"] .d-sh{margin:18px 0 8px;padding:0 0 6px;border-bottom:1px solid var(--sog-border);font-size:.8em;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sog-muted);line-height:1.4}
[data-module="data"] .d-sh small{font-size:1em;font-weight:400;letter-spacing:0;text-transform:none}
[data-module="data"] .d-sh2{margin:12px 0 4px;padding:0;border:0}
/* la carte */
[data-module="data"] .d-wmapbox{margin:0;min-width:0}
[data-module="data"] .d-mapbar{display:flex;flex-wrap:wrap;gap:0 12px;align-items:center;justify-content:space-between;min-height:var(--sog-touch)}
[data-module="data"] .d-maplinks{display:inline-flex;flex-wrap:wrap;gap:0 12px}
[data-module="data"] .d-maplinks .d-link{margin-left:0}
[data-module="data"] .d-mapframe{position:relative;border:1px solid var(--sog-border);background:var(--d-sea);overflow:hidden}
[data-module="data"] .d-wmap{display:block;width:100%;height:auto;max-height:clamp(240px,calc(100vh - 480px),380px);margin:0 auto;border:0;background:none;touch-action:pan-y;cursor:grab;user-select:none}
[data-module="data"] .d-zoom{flex:none;display:inline-flex;gap:4px}
[data-module="data"] .d-zoom button{min-width:var(--sog-touch);min-height:var(--sog-touch);padding:0;font-size:1.2rem;font-weight:700}
[data-module="data"] .d-wz{stroke-width:1.1px;vector-effect:non-scaling-stroke;fill-opacity:.3;cursor:pointer;stroke:var(--sog-muted);fill:var(--sog-muted);outline:none}
[data-module="data"] .d-wz[data-tone=ok]{stroke:var(--sog-ok);fill:var(--sog-ok)}
[data-module="data"] .d-wz[data-tone=warn]{stroke:var(--sog-warn);fill:var(--sog-warn)}
[data-module="data"] .d-wz[data-tone=err]{stroke:var(--sog-err);fill:var(--sog-err)}
[data-module="data"] .d-wz[data-tone=muted]{fill-opacity:.1}
[data-module="data"] .d-wz[data-tone=unread]{fill-opacity:.12;stroke-dasharray:3 2}
[data-module="data"] .d-now{margin:10px 0 4px;padding:8px 10px;border-left:4px solid var(--sog-accent);background:var(--d-acc-bg)}
[data-module="data"] .d-now[data-now=fresh]{border-left-color:var(--sog-ok)}
[data-module="data"] .d-wz[data-approx]{stroke-dasharray:4 3}
[data-module="data"] .d-wz[data-grp],[data-module="data"] .d-wz[data-hl],[data-module="data"] .d-wz[data-sel]{stroke:var(--sog-accent);stroke-width:2.6px;stroke-dasharray:none}
[data-module="data"] .d-wz[data-sel]{fill-opacity:.7}
[data-module="data"] .d-wz[data-hover]{fill-opacity:1}
[data-module="data"] .d-wz:focus-visible{stroke:var(--sog-text,currentColor);stroke-width:3px}
[data-module="data"] .d-whg{pointer-events:none;color:var(--sog-text,currentColor)}
[data-module="data"] .d-wh{fill:url(#d-hatch);stroke:none;pointer-events:none}
[data-module="data"] .d-sw[data-hatch]{background:repeating-linear-gradient(45deg,var(--sog-text,currentColor) 0 1px,transparent 1px 4px);border-color:var(--sog-muted)}
[data-module="data"] .d-sw[data-grp]{background:transparent;border:2px solid var(--sog-accent)}
[data-module="data"] .d-lgd{display:flex;align-items:center;gap:8px;margin:4px 0 0}
[data-module="data"] .d-lgl{flex:1;min-width:0}
[data-module="data"] .d-lgl{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:.85em}
[data-module="data"] .d-lgi{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
[data-module="data"] .d-lgd .d-sw,[data-module="data"] [data-cw-legend-more] .d-sw{margin:0 4px 0 0;border-radius:50%;width:12px;height:12px}
[data-module="data"] .d-lg{flex:none;min-width:var(--sog-touch);min-height:var(--sog-touch);padding:0;border-radius:50%}
[data-module="data"] [data-cw-legend-more]{margin:2px 0 0}
/* la page suit SA largeur (celle de l'écran, que la barre ou le rail du cadre fait varier), pas celle de la fenêtre : requêtes de conteneur sur l'enveloppe de l'écran */
[data-module="data"] [data-body]{container:data / inline-size}
/* les groupes de pays : des cartes en deux colonnes ; le groupe ouvert, encadré de bleu sur toute la largeur, ses pays en tuiles */
[data-module="data"] .d-groups{min-width:0}
[data-module="data"] .d-gl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:6px;border:0}
[data-module="data"] .d-gp{min-width:0;border:1px solid var(--sog-border);background:var(--sog-surface);border-radius:var(--sog-radius-s)}
[data-module="data"] .d-gp[data-open=true]{grid-column:1/-1;border:2px solid var(--sog-accent);background:var(--d-acc-bg)}
[data-module="data"] .d-gh{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:5px 12px;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer}
[data-module="data"] .d-gname{flex:1;min-width:0;display:grid;gap:1px;overflow-wrap:anywhere}
[data-module="data"] .d-gtitle b{font-weight:700}
[data-module="data"] .d-gcount{margin-left:6px}
[data-module="data"] .d-gsum{font-size:.88em}
[data-module="data"] [data-sum-tone=ok]{color:var(--sog-ok)}
[data-module="data"] [data-sum-tone=warn]{color:var(--sog-warn);font-weight:600}
[data-module="data"] [data-sum-tone=err]{color:var(--sog-err);font-weight:600}
[data-module="data"] [data-sum-tone=muted]{color:var(--sog-muted)}
[data-module="data"] .d-gh .d-chev{order:-1;flex:none;width:7px;height:7px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(-45deg);margin:0 4px 0 2px}
[data-module="data"] .d-gh[aria-expanded=true] .d-chev{transform:rotate(45deg)}
[data-module="data"] .d-gb{padding:0 10px 10px}
[data-module="data"] .d-gc{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
[data-module="data"] .d-gcb{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:0;width:100%;height:100%;min-height:48px;padding:4px 8px 4px 10px;background:var(--sog-surface);border:1px solid var(--sog-border);border-left:6px solid var(--d-c,var(--sog-muted));border-radius:var(--sog-radius-s);color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0}
[data-module="data"] .d-gcb[data-tone=ok]{--d-c:var(--sog-ok)}
[data-module="data"] .d-gcb[data-tone=warn]{--d-c:var(--sog-warn)}
[data-module="data"] .d-gcb[data-tone=err]{--d-c:var(--sog-err)}
[data-module="data"] .d-gcb[data-hover]{background:var(--d-acc-bg)}
[data-module="data"] .d-gcb[aria-current=true]{outline:3px solid var(--sog-fg);outline-offset:-1px}
[data-module="data"] .d-gcn{font-weight:600;font-size:.93em;line-height:1.2;overflow-wrap:anywhere}
[data-module="data"] .d-gw{display:block;font-size:.8em;line-height:1.25;color:var(--sog-muted);white-space:normal}
[data-module="data"] .d-gproc{white-space:nowrap}
[data-module="data"] .d-gproc .d-sw{margin:0 3px 0 0;width:10px;height:10px;vertical-align:-1px}
[data-module="data"] .d-gup{margin:6px 0 0}
/* la fiche d'un pays : une carte (cadre, ombre) ; un bloc par source, bord gauche à la couleur de son état ; les étapes en cellules sur fond teinté ; les gestes en bas, pleine largeur */
[data-module="data"] .d-sheet,[data-module="data"] .d-sheetph{min-width:0;box-sizing:border-box;border:1px solid var(--sog-border);background:var(--sog-surface);box-shadow:var(--sog-shadow);border-radius:var(--sog-radius-s)}
[data-module="data"] .d-sheet{display:flex;flex-direction:column;padding:0 12px 12px}
[data-module="data"] .d-sheetph{padding:14px;border-style:dashed;box-shadow:none;background:var(--d-soft);display:none}
[data-module="data"] .d-sheetph p{margin:4px 0 0}
[data-module="data"] .d-sheeth{display:flex;align-items:flex-start;gap:8px;padding:10px 0 6px}
[data-module="data"] .d-sheett{flex:1;min-width:0}
[data-module="data"] .d-sheett h3{margin:0;font-size:1.3rem;line-height:1.2;overflow-wrap:anywhere}
[data-module="data"] .d-sheetsub{margin:2px 0 0}
[data-module="data"] .d-sbadge{flex:none;margin-top:3px;padding:4px 6px;border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);background:var(--d-soft);color:var(--sog-muted);font-size:.78em;font-weight:700;line-height:1;white-space:nowrap}
[data-module="data"] .d-sbadge[data-tone=ok]{background:var(--d-ok-bg);border-color:var(--d-ok-line);color:var(--sog-ok)}
[data-module="data"] .d-sbadge[data-tone=warn]{background:var(--d-warn-bg);border-color:var(--d-warn-line);color:var(--sog-warn)}
[data-module="data"] .d-sbadge[data-tone=err]{background:var(--d-err-bg);border-color:var(--d-err-line);color:var(--sog-err)}
[data-module="data"] .d-back{min-height:var(--sog-touch);min-width:var(--sog-touch)}
[data-module="data"] .d-x{flex:none;margin:-6px -8px 0 0;min-width:var(--sog-touch);min-height:var(--sog-touch);padding:0;display:none;border:0;background:none;font-size:1.4rem;color:var(--sog-muted)}
[data-module="data"] .d-sheet p{margin:4px 0}
[data-module="data"] .d-sheet h4{margin:12px 0 4px}
[data-module="data"] .d-sheet .d-sh{margin:14px 0 4px}
[data-module="data"] .d-cells3{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:6px;margin:8px 0}
[data-module="data"] .d-cells3>.d-cells{display:contents}
[data-module="data"] .d-cells1{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;margin:4px 0}
[data-module="data"] .d-cells{list-style:none;margin:0;padding:0}
[data-module="data"] .d-cells>li,[data-module="data"] .d-cell{display:flex;flex-wrap:wrap;align-content:flex-start;gap:1px 4px;min-width:0;padding:6px 7px;border:1px solid var(--sog-border);background:var(--d-soft);font-size:0;line-height:1.3;overflow-wrap:anywhere}
[data-module="data"] .d-cell{font-size:.85rem}
[data-module="data"] .d-cells>li>b,[data-module="data"] .d-cl{order:0;flex:1 1 100%;font-size:.7rem;font-weight:400;letter-spacing:.03em;text-transform:uppercase;color:var(--sog-muted)}
[data-module="data"] .d-cells>li>.d-tk{order:1;width:auto;font-size:.85rem}
[data-module="data"] .d-cells>li>.d-tkw{order:2;font-size:.85rem;font-weight:700;color:var(--sog-muted)}
[data-module="data"] .d-cells>li>[data-tick-text]{order:3;flex:1 1 100%;font-size:.75rem;color:var(--sog-fg)}
[data-module="data"] .d-cells>li[data-ok=yes]{background:var(--d-ok-bg);border-color:var(--d-ok-line)}
[data-module="data"] .d-cells>li[data-ok=yes] .d-tkw{color:var(--sog-ok)}
[data-module="data"] .d-cells>li[data-ok=no]{background:var(--d-err-bg);border-color:var(--d-err-line)}
[data-module="data"] .d-cells>li[data-ok=no] .d-tkw{color:var(--sog-err)}
[data-module="data"] .d-cells>li[data-ok=todo]{background:var(--sog-surface)}
[data-module="data"] .d-cells1>li{grid-column:1/-1}
[data-module="data"] .d-cell .d-st{display:flex;flex-wrap:wrap;gap:2px 6px;min-height:0;padding:0;justify-content:flex-start;white-space:normal;text-align:left;overflow-wrap:normal;word-break:normal}
[data-module="data"] .d-cell .d-whyhint{flex:1 1 100%}
[data-module="data"] .d-src{margin:10px 0 0;padding:10px;border:1px solid var(--sog-border);border-left:5px solid var(--d-c,var(--sog-border));background:var(--sog-surface)}
[data-module="data"] .d-src[data-src-tone=ok]{--d-c:var(--sog-ok)}
[data-module="data"] .d-src[data-src-tone=warn]{--d-c:var(--sog-warn)}
[data-module="data"] .d-src[data-src-tone=err]{--d-c:var(--sog-err)}
[data-module="data"] .d-srch{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin-bottom:6px}
[data-module="data"] .d-srch h4{flex:1 1 140px;margin:0}
[data-module="data"] .d-regbadge{flex:none;margin:0;padding:3px 6px;border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);background:var(--d-soft);font-size:.78em;line-height:1;white-space:nowrap}
[data-module="data"] .d-ticks,[data-module="data"] .d-inv{list-style:none;margin:4px 0;padding:0;display:grid;gap:4px}
[data-module="data"] .d-ticks li,[data-module="data"] .d-inv li{overflow-wrap:anywhere}
[data-module="data"] .d-tk{display:inline-block;width:1.2em;text-align:center;font-weight:700}
[data-module="data"] .d-ticks li[data-ok=yes] .d-tk{color:var(--sog-ok)}
[data-module="data"] .d-ticks li[data-ok=no] .d-tk,[data-module="data"] .d-thr li[data-ok=no] .d-tk{color:var(--sog-err)}
[data-module="data"] .d-ticks li[data-ok=todo] .d-tk,[data-module="data"] .d-ticks li[data-ok=na] .d-tk,[data-module="data"] .d-thr li[data-ok=todo] .d-tk{color:var(--sog-muted)}
[data-module="data"] .d-thr li[data-ok=yes] .d-tk{color:var(--sog-ok)}
[data-module="data"] .d-tkw{font-size:var(--sog-size-s);color:var(--sog-muted)}
[data-module="data"] .d-thr{list-style:none;margin:4px 0;padding:0;display:grid;gap:4px}
[data-module="data"] .d-thr li{overflow-wrap:anywhere}
[data-module="data"] .d-prog p{margin:4px 0}
[data-module="data"] .d-thread{border-top:1px solid var(--sog-border);margin-top:8px;padding-top:4px}
[data-module="data"] .d-inv li{display:grid;gap:2px;padding:6px 0;border-top:1px solid var(--sog-border)}
[data-module="data"] .d-inv li:first-child{border-top:0}
[data-module="data"] .d-fl{font-size:var(--sog-size-s)}
[data-module="data"] .d-fl code{padding:1px 5px;border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);background:var(--d-soft);font:.9em var(--sog-font-mono);overflow-wrap:anywhere}
[data-module="data"] .d-fs{white-space:normal;font-weight:700}
[data-module="data"] .d-fs[data-file-state=seen]{color:var(--sog-ok)}
[data-module="data"] .d-fs[data-file-state=missing]{color:var(--sog-muted)}
[data-module="data"] .d-src .d-hand{margin:8px 0 0}
[data-module="data"] .d-src .d-zact{display:flex;flex-direction:column;align-items:stretch;gap:2px;margin:0 0 4px}
[data-module="data"] .d-src .d-hand button:not(.d-link),[data-module="data"] [data-sheet-update] button:not(.d-link){width:100%}
[data-module="data"] .d-src .d-hand .d-link,[data-module="data"] [data-sheet-update] .d-link{align-self:flex-start}
[data-module="data"] .d-facts{margin:0}
[data-module="data"] .d-hand{margin-top:6px}
[data-module="data"] .d-zalt{margin:2px 0}
[data-module="data"] .d-upd{margin:8px 0 0}
[data-module="data"] .d-upd p{margin:4px 0}
[data-module="data"] .d-lg{min-width:var(--sog-touch)}
/* « Publier » : un bloc encadré, son bouton sur toute la largeur */
[data-module="data"] .f-card[data-publish]{margin:20px 0 var(--sog-gap);padding:12px;border:1px solid var(--sog-fg)}
[data-module="data"] [data-publish] h2{margin:0 0 6px;font-size:1.1rem}
[data-module="data"] [data-publish] [data-verb="publish"]{display:block;width:100%}
@media (pointer:fine){
[data-module="data"] .d-cap button,[data-module="data"] .d-mapbar{min-height:32px}
[data-module="data"] .d-lg,[data-module="data"] .d-zoom button{min-width:32px;min-height:32px}
}
@container data (min-width:640px){
[data-module="data"] .d-gl{grid-template-columns:repeat(2,minmax(0,1fr))}
[data-module="data"] .d-gc{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@container data (min-width:900px){
[data-module="data"] .d-back{display:none}
[data-module="data"] .d-x{display:inline-flex;align-items:center;justify-content:center}
[data-module="data"] .d-page{display:grid;grid-template-columns:minmax(0,3fr) minmax(300px,2fr);column-gap:24px;row-gap:0;align-items:start}
[data-module="data"] .d-page>[data-build],[data-module="data"] .d-cw,[data-module="data"] .d-cwtop{display:contents}
[data-module="data"] .d-page>*,[data-module="data"] .d-page>[data-build]>*,[data-module="data"] .d-cw>*,[data-module="data"] .d-cwtop>*{grid-column:1;min-width:0}
[data-module="data"] .d-page>[data-build]>*{margin-bottom:var(--sog-gap)}
[data-module="data"] .d-cw>*{margin-bottom:calc(var(--sog-gap) / 2)}
[data-module="data"] .d-cwtop>.d-sheet,[data-module="data"] .d-cwtop>.d-sheetph{display:flex;grid-column:2;grid-row:1/span 80;position:sticky;top:8px;align-self:start;margin:0;max-height:calc(100vh - 24px);overflow:auto}
[data-module="data"] .d-cwtop>.d-sheetph{display:block}
}
@container data (max-width:899px){
[data-module="data"] .d-sheet{position:fixed;inset:0;z-index:15;overflow:auto;overscroll-behavior:contain;padding:0 16px 24px;border:0;border-radius:0;background:var(--sog-bg,var(--sog-surface))}
[data-module="data"] .d-wmap{max-height:min(40vh,300px)}
}
`;
