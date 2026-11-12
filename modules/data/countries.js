// V3 data — la carte du monde, les paquets de pays et la fiche d'un pays (SOG-0262) : l'entrée de la base. La carte dessine les contours des pays (ceux d'aerodb : ctx.aerodb.zoneOutlines) en SVG, cadrée sur la couverture ; les paquets sont la liste principale,
// chacun avec son état résumé, un seul ouvert à la fois ; un toucher sur un pays (de la carte ou d'un paquet) ouvre sa fiche (à droite de la carte en large, en plein écran au téléphone). Lot A : la fiche se lit (les faits du pays — construit, publié —, puis pour chaque
// source son « téléchargé » et l'inventaire de ses fichiers). Lot B : la fiche est l'endroit où l'on agit — « Mettre à jour ce pays », « Prendre le fichier téléchargé » (geste principal quand un fichier est vu dans Téléchargements) et « Choisir le fichier… » —, et « ce qui reste à faire
// ce mois-ci » (todo.js) se lit sous la carte. Rien ici n'écrit dans data/ ; les lectures du lanceur (base/cycle, base/coverage) sont des travaux en lecture seule, passés l'un après l'autre (state.js : serial), à l'ouverture et après chaque opération.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  busyNow,
  catSource,
  esc,
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
  gateOf,
  greyOnce,
  opAreaHtml,
  personalPicked,
  renderBuild,
  sourcesWhy
} from './panels.js';
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
  todoHtml
} from './todo.js';

/** L'état propre à cet écran, créé au montage : le pays survolé, le paquet ouvert, la fiche ouverte (et d'où), la vue du monde, la légende dépliée, les chemins SVG gardés, les lectures du lanceur (la liste du cycle d'un pays, celle de tout le cycle, les procédures), la source du dernier geste de fichier de chaque pays. */
export const cwInit = () => ({
  hover: null,
  grp: null,
  sheet: null,
  opener: '',
  world: false,
  legend: false,
  doneOpen: false,
  hand: new Map(),
  paths: new Map(),
  pathsFor: null,
  cycle: null,
  todo: null,
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
    out = d ? {
      id,
      d,
      box: o.box,
      approx: M.isApproxOutline({
        ...o,
        rings
      })
    } : null;
  }
  c.paths.set(id, out);
  return out;
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
    frame = (!S.cw.world && covBoxes.length ? M.frameOf(covBoxes) : null) || (S.cw.world ? M.worldFrame() : M.frameOf(all.map(p => p.box))),
    rank = p => open.has(p.id) ? 2 : cov.has(p.id) ? 1 : 0,
    list = [...all].sort((a, b) => rank(a) - rank(b)),
    cell = Math.max(frame[2] / 110, .3);
  const paths = list.map(p => {
    const t = tone(p.id),
      label = `${nameOf(p.id)} : ${word(t)}${procs[p.id] ? `, ${tt(TX.cw.procYes, { s: procs[p.id].map(procName).join(', ') })}` : ''}`;
    return `<path class="d-wz" d="${p.d}" data-zone="${esc(p.id)}" data-hz="${esc(p.id)}" data-tone="${esc(t)}" data-act="open-country" tabindex="-1" role="button" aria-label="${esc(label)}"${p.approx ? ' data-approx' : ''}${open.has(p.id) ? ' data-grp' : ''}${S.cw.hover === p.id ? ' data-hover' : ''}${S.packHl?.has(p.id) ? ' data-hl' : ''}><title>${esc(label)}</title></path>`;
  }).join('');
  const hatch = list.filter(p => procs[p.id]).map(p => `<path class="d-wh" d="${p.d}" data-proc="${esc(p.id)}"></path>`).join('');
  const sw = t => `<span class="d-sw" data-tone="${t}"></span>`;
  return `<div class="d-wmapbox" data-world-map><svg class="d-wmap" data-wmap viewBox="${frame.join(' ')}" preserveAspectRatio="xMidYMid meet" style="aspect-ratio:${(frame[2] / frame[3]).toFixed(3)}" role="group" aria-label="${esc(tt(TX.cw.mapLabel))}"><defs><pattern id="d-hatch" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${cell.toFixed(2)}" stroke="currentColor" stroke-width="${(cell * .3).toFixed(2)}"></line></pattern></defs><g data-wz>${paths}</g><g class="d-whg" data-wh>${hatch}</g></svg>
    <p class="d-lgd" data-cw-legend><span>${esc(tt(TX.mapLegend))} : ${['ok', 'warn', 'err'].map(t => `${sw(t)}${esc(tt(TX.mapLegendBase[t]))}`).join(' · ')} · ${sw('muted')}${esc(tt(TX.cw.outside))}</span><button type="button" class="d-lg" data-act="legend-more" aria-expanded="${S.cw.legend}" aria-label="${esc(tt(TX.cwb.legendMore))}" title="${esc(tt(TX.cwb.legendMore))}">?</button></p>
    ${S.cw.legend ? `<p class="f-muted" data-cw-legend-more><span class="d-sw" data-hatch></span>${esc(tt(TX.cw.hatch))} · <span class="d-sw" data-grp></span>${esc(tt(TX.cw.border))}${all.some(p => p.approx) ? ` · ${esc(tt(TX.mapLegendApprox))}` : ''}</p>` : ''}
    <p class="d-map-row"><button type="button" data-act="world-toggle" aria-pressed="${S.cw.world}">${esc(tt(S.cw.world ? TX.cw.mine : TX.cw.world))}</button></p></div>`;
}
/** Le nom d'une origine de procédures (CIFP, eAIP, EAD) ; le code tel quel pour une autre. */
const procName = s => tt(M.own(TX.cw.procSource, s) || [s, s, s, s]);
/** La phrase du bilan d'un paquet : « 12 sur 14 à jour · 2 à faire · 1 en échec », puis les pays sans état et ceux hors de la couverture ; sans état lu, le nombre de pays de la couverture et « état non lu ». */
export function groupSummary(tl) {
  const T = TX.cw;
  if (!tl.inCov) return tt(T.sumNoCov) + (tl.out ? ` · ${tt(T.sumOut, { n: tl.out })}` : '');
  const parts = [tt(T.sumOk, {
    n: tl.ok,
    m: tl.inCov
  })];
  if (tl.warn) parts.push(tt(T.sumTodo, {
    n: tl.warn
  }));
  if (tl.err) parts.push(tt(T.sumErr, {
    n: tl.err
  }));
  if (tl.none) parts.push(tt(T.sumNone, {
    n: tl.none
  }));
  if (tl.out) parts.push(tt(T.sumOut, {
    n: tl.out
  }));
  return S.status && statusKnown() ? parts.join(' · ') : [tt(T.sumUnread, {
    m: tl.inCov
  }), tl.out ? tt(T.sumOut, {
    n: tl.out
  }) : ''].filter(Boolean).join(' · ');
}
/** Les paquets : une ligne par paquet (nom, état résumé, chevron), un seul ouvert ; ouvert, ses pays (nom et état en mot, chacun ouvre sa fiche) puis le « Mettre à jour » du paquet. '' sans paquet. */
function groupsHtml() {
  const packs = packList();
  if (!packs.length) return '';
  const cov = S.d.cov.ids,
    items = packs.map(({
      pack,
      state
    }) => {
      const open = S.cw.grp === pack.id,
        tl = M.tally(state.known, cov, tone),
        name = pack.names[li()] || pack.names[0];
      return `<li class="d-gp" data-group-id="${esc(pack.id)}" data-open="${open}"><button type="button" class="d-gh" data-act="grp-toggle" data-gid="${esc(pack.id)}" aria-expanded="${open}" aria-controls="d-gb-${esc(pack.id)}"><span class="d-gname"><b>${esc(name)}</b> <span class="f-muted" data-group-sum>${esc(groupSummary(tl))}</span></span><i class="d-chev" aria-hidden="true"></i></button>${open ? `<div class="d-gb" id="d-gb-${esc(pack.id)}" data-group-body>
        <ul class="d-gc">${state.known.map(z => {
          const t = tone(z);
          return `<li><button type="button" class="d-gcb" data-act="open-country" data-zone="${esc(z)}" data-hz="${esc(z)}" data-tone="${esc(t)}"${S.cw.hover === z ? ' data-hover' : ''}><span>${esc(nameOf(z))}</span> <span class="d-gw"><i class="f-dot"${kind(t === 'muted' ? '' : t)} aria-hidden="true"></i>${esc(word(t))}</span></button></li>`;
        }).join('')}</ul>
        <p class="d-gup">${packUpdateHtml(pack, state)}</p></div>` : ''}</li>`;
    });
  return `<section class="d-groups" data-cw-groups><h3>${esc(tt(TX.cw.groupsTitle))} (${packs.length})</h3><p class="f-muted">${esc(tt(TX.cw.groupsHint))}</p><ul class="d-gl">${items.join('')}</ul></section>`;
}
/** Un lien https en texte sûr (nouvel onglet, sans référent) ; sans adresse en https, le libellé seul. */
const link = (url, label) => M.isHttps(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
/** La date (AAAA-MM-JJ) d'un instant ISO, écrite dans la langue ; '' sans. */
export const dateOf = iso => iso ? M.dateText(String(iso).slice(0, 10), lang()) : '';
/** Une coche posée par l'outil : la marque (jamais la couleur seule), son nom, ce qu'elle dit. `ok` : 'yes' | 'no' | 'na'. */
export function tickHtml(key, ok, detail) {
  return `<li data-tick="${key}" data-ok="${ok}"><span class="d-tk" aria-hidden="true">${ok === 'yes' ? '✓' : ok === 'no' ? '✗' : '–'}</span> <b>${esc(tt(TX.cw.tick[{ download: 'dlTick', build: 'buildTick', publish: 'pubTick' }[key]]))}</b> : <span data-tick-text>${esc(detail)}</span></li>`;
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
    if (d.state === 'late') return tickHtml('download', 'no', d.cycle && S.airac ? tt(T.dlLate, {
      c: M.cycleName(S.airac, d.cycle)
    }) : tt(M.own(T.why, 'older-than-cycle')));
    if (d.state === 'n/a') return tickHtml('download', 'na', tt(T.dlNone));
    return tickHtml('download', 'no', tt(d.state === 'waiting' ? T.dlWaiting : M.own(T.why, item.why) || T.dlMissing));
  }
  const auto = z?.download?.list?.[id];
  if (auto) return auto.present ? tickHtml('download', 'yes', auto.at ? tt(T.on, {
    d: dateOf(auto.at)
  }) : '—') : tickHtml('download', 'no', tt(T.dlNot));
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
/** La coche « construit » du PAYS (un fait du pays, dite une fois en tête de la fiche, jamais sous chaque source) : à jour, la date et le cycle de sa construction ; sinon pourquoi pas, puis la dernière construction. */
function buildTick(id, z) {
  const T = TX.cw;
  if (!z) return tickHtml('build', 'na', tt(T.dlUnread));
  const last = builtDetail(z);
  if (z.state === 'up-to-date') return tickHtml('build', 'yes', last || '—');
  return tickHtml('build', 'no', tt(T.buildNot, {
    r: zoneReasons(id)[0] || tt(TX.zst[z.state])
  }) + (last ? ` · ${tt(T.buildLast, { b: last })}` : ''));
}
/** La coche « publié » : seulement quand le lanceur le dit (publié, pas encore envoyé) ; un état inconnu ne dit rien. */
function publishTick(z) {
  const p = z?.publish;
  if (!p || p.state === 'unknown') return '';
  return p.state === 'published' ? tickHtml('publish', 'yes', p.at ? tt(TX.cw.on, {
    d: dateOf(p.at)
  }) : '—') : tickHtml('publish', 'no', tt(TX.cw.pubNo));
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
function inventoryHtml(id, item, cy) {
  const T = TX.cw,
    {
      steps,
      files
    } = filesOf(id, item),
    hand = item?.hand || null,
    ready = cy.state === 'ready' && !!hand;
  if (!files.length) return '';
  return `<div data-inventory="${esc(id)}"><p class="d-invh"><b>${esc(tt(T.inventory))}</b></p>${!ready ? `<p class="f-muted" data-inventory-state="${esc(cy.state || 'none')}">${esc(tt(M.own(T.cycleState, cy.state) || T.inDlUnread))}</p>` : ''}<ul class="d-inv">${files.map(f => {
    const shown = String(f.file || f.name),
      seen = ready ? M.fileSeen(f.name, hand.inDownloads) || M.fileSeen(shown, hand.inDownloads) : null,
      what = Array.isArray(f.what) ? f.what : f.gives;
    return `<li data-file="${esc(f.name)}"${seen === null ? '' : ` data-seen="${seen}"`}>${Array.isArray(what) ? `<b data-file-what>${esc(String(what[li()] ?? what[0] ?? ''))}</b>` : ''}
      ${whereHtml(f, steps, hand)}
      <span class="d-fl" data-file-name>${esc(tt(T.name, { n: '\u0001' })).replace('\u0001', () => `<code>${esc(shown)}</code>`)}${seen === null ? '' : ` — <span class="d-fs" data-file-state="${seen ? 'seen' : 'missing'}">${seen ? '✓' : '✗'} ${esc(tt(seen ? T.seen : T.missing))}</span>`}</span></li>`;
  }).join('')}</ul></div>`;
}
/** Le régime d'une source : celui de la liste du cycle, à défaut celui que le catalogue dit (un fichier pris à la main, lu sur ce poste, pris par le lanceur) ; '' sans. */
export function regimeOf(id, item) {
  if (item?.regime) return item.regime;
  const s = catSource(id);
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
/** Les gestes d'une source prise à la main, UN seul but : un fichier vu dans Téléchargements — « Prendre le fichier téléchargé » est le geste principal (il lance la prise de ce pays) et « Choisir un autre fichier… » un lien dessous ; rien de vu — « Choisir le fichier… » seul.
 *  Le bouton de choix dit sa source (`data-source`) : la ligne DIRCAM lit l'ENR 5.7 dans l'archive du SIA (upload.js). `msg` : l'avancement de l'envoi et ce que le dernier geste a dit (reçu, manquant, refusé) restent sur le bloc de la source du dernier geste. */
function handHtml(sid, zone, z, item, cy, msg) {
  const busy = busyNow(),
    seen = handSeen(sid, z, item, cy),
    choose = (cls, label) => `<button type="button"${cls} data-act="zone-upload" data-zone="${esc(zone)}" data-source="${esc(sid)}"${uploadOff() ? ' disabled' : ''}>${esc(tt(label))}</button>`;
  if (!seen) return `<div class="d-hand" data-hand="${esc(sid)}" data-hand-state="none"><p class="d-zact">${choose('', TX.up.choose)}</p>${msg ? uploadHtml(zone) + zoneMsgHtml(zone) : ''}</div>`;
  const g = gateOf('base', 1, [M.PICKUP.verb]).verbs[M.PICKUP.verb],
    off = busy || g.disabled,
    grey = greyOnce(busy ? 'busy' : g.reason,
      'base'); // un bouton gris dit pourquoi, à côté de lui (la carte de l'opération en cours le dit déjà : pas deux fois)
  return `<div class="d-hand" data-hand="${esc(sid)}" data-hand-state="seen"><p class="d-zact"><span class="f-muted" data-hand-seen>${esc(tt(TX.cwb.seenLine))}</span> <button type="button" class="primary" data-verb="pickup" data-zones="${esc(zone)}" data-source="${esc(sid)}"${off ? ' disabled' : ''}>${esc(tt(TX.pickup))}</button>${off && grey ? ` <span class="f-muted" data-hand-grey>${esc(tt(TX.greyReason[grey]))}</span>` : ''}</p>
    <p class="d-zact d-zalt" data-hand-alt="${esc(sid)}">${choose(' class="d-link"', TX.up.chooseOther)}</p>${msg ? uploadHtml(zone) + zoneMsgHtml(zone) : ''}</div>`;
}
/** Une source du pays : son nom, son régime, sa coche « téléchargé » (dans la couverture seulement ; « construit » et « publié » sont des faits du PAYS, en tête de la fiche) et, pour un fichier pris à la main, l'inventaire puis ses gestes. */
function sourceHtml(id, zone, z, inCov, msg) {
  const cy = cycleOf(zone),
    item = cy.state === 'ready' ? cy.zv?.sources[id] || cy.data.items[id] || null : null,
    reg = regimeOf(id, item),
    name = (catSource(id)?.n?.[li()] || item?.label?.[li()] || id).replace(/\s*\(.*\)\s*$/, '');
  return `<section class="d-src" data-sheet-source="${esc(id)}"${reg ? ` data-regime="${reg}"` : ''}><h4>${esc(name)}</h4>${reg ? `<p class="f-muted" data-regime-line>${esc(tt(TX.cw.regime[reg]))}</p>` : ''}
    ${inCov ? `<ul class="d-ticks">${downloadTick(id, item, z)}</ul>` : ''}${reg === 'hand' ? inventoryHtml(id, item, cy) : ''}${inCov && reg === 'hand' ? handHtml(id, zone, z, item, cy, msg) : ''}</section>`;
}
/** Le geste « Mettre à jour ce pays » : le même chemin que le bouton du haut et celui d'un paquet, pour CE pays seul (il ne fait que ce qui manque : le téléchargement de ce qui n'est pas là, puis la construction du pays) ; la ligne dessous dit ce qu'il va faire ;
 *  gris, il écrit pourquoi (pas de lanceur, ce pays attend un fichier à la main ou la coche d'usage personnel, il est à jour ; l'opération en cours, la carte la dit déjà). `primary` : faux quand un fichier vu dans Téléchargements est le geste principal. */
function updateBlockHtml(id, primary) {
  const T = TX.cwb,
    gate = updateGate([id]),
    plan = S.status && statusKnown() ? M.downloadPlan(S.status, [id]) : null;
  let off = gate.disabled,
    why = gate.disabled && greyOnce(gate.reason, 'base') ? [gate.reason, tt(TX.greyReason[gate.reason])] : null,
    line = '',
    tick = false;
  if (!off && plan) {
    if (plan.upToDate.includes(id))[off, why] = [true, ['up-to-date', tt(T.upToDate)]];
    else if (plan.waiting.includes(id))[off, why] = [true, ['waits-file', tt(T.waitsFile)]];
    else if (plan.personal.includes(id))[off, why, tick] = [true, ['waits-tick', tt(T.waitsTick)], true];
    else line = tt(T.doLine, {
      l: [plan.fetch.includes(id) ? tt(T.doDl) : '', plan.build.includes(id) ? tt(T.doBuild) : ''].filter(Boolean).join(', ')
    });
  }
  return `<div class="d-upd" data-sheet-update><p class="d-verbs"><button type="button"${primary ? ' class="primary"' : ''} data-act="sheet-update" data-zone="${esc(id)}"${off ? ' disabled' : ''}>${esc(tt(T.update))}</button></p>${line ? `<p class="f-muted" data-sheet-update-plan>${esc(line)}</p>` : ''}${why ? `<p class="f-muted" data-sheet-update-reason="${esc(why[0])}">${esc(why[1])}${tick ? ` <button type="button" class="d-link" data-act="zone-certify">${esc(tt(TX.toCertify))}</button>` : ''}</p>` : ''}</div>`;
}
/** Le téléchargement de ce pays qui vient d'échouer (la fin de « Mettre à jour » le dit) : ce que le site a répondu ; le fichier choisi à la main reste le chemin (la FAA : l'abonnement du cycle, UN fichier). '' sans échec. */
function failedHtml(id) {
  const ff = S.result?.set === 'base' && S.result.verb === 'fetch' ? (S.result.out?.failed || []).filter(f => f.zone === id) : [];
  if (!ff.length) return '';
  const nasr = ff.some(f => f.source === 'faa' || f.source === 'faaclass');
  return `<div class="d-src" data-sheet-failed><p class="f-warn">${esc(tt(TX.cwb.failedLine, { r: sourcesWhy(ff.map(f => ({ source: f.source, code: f.error, status: f.status ?? null }))) }))}</p>${nasr ? `<p class="f-muted" data-nasr-hint>${nasrHint()}</p>` : ''}${nasr || pickSource(id) ? `<p class="d-zact"><button type="button" data-act="zone-upload" data-zone="${esc(id)}" data-source=""${uploadOff() ? ' disabled' : ''}>${esc(tt(TX.up.choose))}</button></p>` : ''}</div>`;
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
    op = opAreaHtml('base').trim();
  return `<section class="d-sheet" data-sheet="${esc(id)}" role="region" aria-label="${esc(tt(T.sheetLabel, { c: name }))}">
    <header class="d-sheeth"><button type="button" class="d-back" data-act="sheet-close">${esc(tt(T.back))}</button><h3 data-sheet-name>${esc(name)}</h3><button type="button" class="d-x" data-act="sheet-close" aria-label="${esc(tt(TX.cwb.close))}" title="${esc(tt(TX.cwb.close))}"><span aria-hidden="true">✕</span></button></header>
    ${inCov ? `<div class="d-sheetst" data-sheet-state>${zoneStateHtml(id) || `<span class="d-st">${esc(word(tone(id)))}</span>`}</div><ul class="d-ticks d-facts" data-sheet-facts>${buildTick(id, z)}${publishTick(z)}</ul>` : `<p data-sheet-out>${esc(tt(T.notInCoverage, { c: name }))}</p>`}
    ${S.cw.proc?.state === 'ready' ? `<p class="f-muted" data-sheet-proc>${esc(procs ? tt(T.procYes, { s: procs.map(procName).join(', ') }) : tt(T.procNo))}</p>` : ''}
    ${noReader.length ? `<p class="f-warn" data-sheet-noreader>${esc(tt(T.noReader, { s: noReader.join(', ') }))}</p>` : ''}
    ${inCov ? updateBlockHtml(id, !seenAny) : ''}${op ? `<div data-sheet-op>${op}</div>` : ''}${inCov ? failedHtml(id) : ''}
    <h4>${esc(tt(T.sourcesTitle))}</h4>${ids.length ? `${avail.map(s => sourceHtml(s, id, z, inCov, s === msgSrc)).join('')}${gone.length ? `<h4 data-unavailable-title>${esc(tt(T.unavailableTitle))}</h4>${gone.map(g => unavailableHtml(g.id, g.item, g.un)).join('')}` : ''}` : `<p class="f-muted" data-sheet-nosource>${esc(tt(T.noSources))}</p>`}
    ${inCov && !msgSrc ? `<div data-sheet-msg>${uploadHtml(id)}${zoneMsgHtml(id)}</div>` : ''}</section>`;
}
/** Le bloc de la base sous la barre d'état : la carte (et la fiche à sa droite quand un pays est ouvert, en large), puis « ce qui reste à faire ce mois-ci », puis les paquets. */
export function countriesHtml() {
  if (!S.cw || !S.d) return '';
  const map = mapHtml(),
    sheet = sheetHtml(),
    todo = todoHtml(),
    groups = groupsHtml();
  if (!map && !sheet && !groups && !todo) return '';
  return `<div class="d-cw" data-countries><div class="d-cwtop"${sheet ? ' data-sheet-open' : ''}>${map ? `<div class="d-cwmap">${map}</div>` : ''}${sheet}</div>${todo}${groups}</div>`;
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
  renderBuild();
}
/** « Voir le monde entier » / « Revenir à ma couverture » : le cadre de la carte. */
export function toggleWorld() {
  S.cw.world = !S.cw.world;
  renderBuild();
}
/** Le « ? » de la légende : la seconde ligne (hachure, bordure, pointillé) se montre ou se cache. */
export function toggleLegend() {
  S.cw.legend = !S.cw.legend;
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
    dirty: true
  } : {
    zone,
    state: 'busy'
  } : {
    zone,
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
    dirty: true
  } : {
    state: 'busy'
  } : {
    state: 'unread'
  };
  renderBuild();
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
  wantProc();
  wantTodo();
  if (S.cw.sheet) wantCycle(S.cw.sheet);
}
/** Les lectures à refaire (une opération vient de finir, un fichier a été envoyé : les fichiers ont bougé). La liste du cycle et la vue du pays ouvert sont marquées « à relire » (elles restent affichées jusqu'à la réponse) ; `all` : les procédures aussi (après un rechargement des données). */
export function forgetReads(all = true, status = false) {
  if (!S?.cw) return;
  if (S.cw.cycle) S.cw.cycle.dirty = true;
  if (S.cw.todo) S.cw.todo.dirty = true;
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
  if (c.sheet && (c.cycle?.dirty || c.cycle?.state === 'busy')) wantCycle(c.sheet);
  if (c.todo?.dirty || c.todo?.state === 'busy') wantTodo();
}
/** La mise en page propre à la carte, aux paquets et à la fiche (à côté de STYLE, jetons du cadre). En large la fiche est à droite de la carte ; au téléphone elle recouvre l'écran (position fixe, son propre défilement). */
export const CW_STYLE = `
[data-module="data"] .d-cw{display:grid;gap:12px;margin:8px 0 12px;min-width:0}
[data-module="data"] .d-cwtop{display:grid;gap:12px;min-width:0}
[data-module="data"] .d-cwmap{min-width:0}
[data-module="data"] .d-wmapbox{margin:0;min-width:0}
[data-module="data"] .d-wmap{display:block;width:100%;height:auto;max-height:70vh;border:1px solid var(--sog-border);background:var(--sog-surface);touch-action:pan-y}
[data-module="data"] .d-wz{stroke-width:1.1px;vector-effect:non-scaling-stroke;fill-opacity:.3;cursor:pointer;stroke:var(--sog-muted);fill:var(--sog-muted);outline:none}
[data-module="data"] .d-wz[data-tone=ok]{stroke:var(--sog-ok);fill:var(--sog-ok)}
[data-module="data"] .d-wz[data-tone=warn]{stroke:var(--sog-warn);fill:var(--sog-warn)}
[data-module="data"] .d-wz[data-tone=err]{stroke:var(--sog-err);fill:var(--sog-err)}
[data-module="data"] .d-wz[data-tone=muted]{fill-opacity:.1}
[data-module="data"] .d-wz[data-approx]{stroke-dasharray:4 3}
[data-module="data"] .d-wz[data-grp],[data-module="data"] .d-wz[data-hl]{stroke:var(--sog-accent);stroke-width:2.6px;stroke-dasharray:none}
[data-module="data"] .d-wz[data-hover]{fill-opacity:1}
[data-module="data"] .d-wz:focus-visible{stroke:var(--sog-text,currentColor);stroke-width:3px}
[data-module="data"] .d-whg{pointer-events:none;color:var(--sog-text,currentColor)}
[data-module="data"] .d-wh{fill:url(#d-hatch);stroke:none;pointer-events:none}
[data-module="data"] .d-sw[data-hatch]{background:repeating-linear-gradient(45deg,var(--sog-text,currentColor) 0 1px,transparent 1px 4px);border-color:var(--sog-muted)}
[data-module="data"] .d-sw[data-grp]{background:transparent;border:2px solid var(--sog-accent)}
[data-module="data"] .d-groups h3{margin:8px 0 4px}
[data-module="data"] .d-groups p{margin:2px 0 6px}
[data-module="data"] .d-gl{list-style:none;margin:0;padding:0;display:grid;gap:0;border-top:1px solid var(--sog-line,var(--sog-border))}
[data-module="data"] .d-gp{border-bottom:1px solid var(--sog-line,var(--sog-border));min-width:0}
[data-module="data"] .d-gh{display:flex;align-items:center;gap:8px;width:100%;min-height:var(--sog-touch);padding:4px 4px;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer}
[data-module="data"] .d-gname{flex:1;min-width:0;overflow-wrap:anywhere}
[data-module="data"] .d-gh[aria-expanded=true] .d-chev{transform:rotate(180deg)}
[data-module="data"] .d-gb{padding:0 0 8px 12px}
[data-module="data"] .d-gc{list-style:none;margin:0;padding:0;display:grid;gap:0}
[data-module="data"] .d-gcb{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;min-height:var(--sog-touch);padding:2px 8px;background:none;border:0;border-bottom:1px solid var(--sog-line,var(--sog-border));color:inherit;font:inherit;text-align:left;cursor:pointer}
[data-module="data"] .d-gcb[data-hover]{background:color-mix(in srgb,var(--sog-accent,#08c) 14%,transparent)}
[data-module="data"] .d-gw{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:var(--sog-size-s)}
[data-module="data"] .d-gup{margin:4px 0 0}
[data-module="data"] .d-sheet{min-width:0;padding:12px;border:1px solid var(--sog-border);background:var(--sog-surface);box-sizing:border-box}
[data-module="data"] .d-sheeth{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
[data-module="data"] .d-sheeth h3{margin:0;flex:1 1 8em;overflow-wrap:anywhere}
[data-module="data"] .d-back{min-height:var(--sog-touch);min-width:var(--sog-touch)}
[data-module="data"] .d-sheet h4{margin:12px 0 4px}
[data-module="data"] .d-sheet p{margin:4px 0}
[data-module="data"] .d-src{border-top:1px solid var(--sog-line,var(--sog-border));margin-top:8px;padding-top:4px}
[data-module="data"] .d-src h4{margin:4px 0}
[data-module="data"] .d-ticks,[data-module="data"] .d-inv{list-style:none;margin:4px 0;padding:0;display:grid;gap:4px}
[data-module="data"] .d-ticks li,[data-module="data"] .d-inv li{overflow-wrap:anywhere}
[data-module="data"] .d-tk{display:inline-block;width:1.2em;text-align:center;font-weight:700}
[data-module="data"] .d-ticks li[data-ok=yes] .d-tk{color:var(--sog-ok)}
[data-module="data"] .d-ticks li[data-ok=no] .d-tk{color:var(--sog-err)}
[data-module="data"] .d-inv li{display:grid;gap:2px;padding:4px 0;border-bottom:1px solid var(--sog-line,var(--sog-border))}
[data-module="data"] .d-fl{font-size:var(--sog-size-s)}
[data-module="data"] .d-fl code{overflow-wrap:anywhere}
[data-module="data"] .d-fs[data-file-state=seen]{color:var(--sog-ok)}
[data-module="data"] .d-fs[data-file-state=missing]{color:var(--sog-err)}
[data-module="data"] .d-lgd{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:6px 0 0}
[data-module="data"] .d-lg{min-width:var(--sog-touch);min-height:var(--sog-touch);padding:0}
[data-module="data"] .d-x{margin-left:auto;min-width:var(--sog-touch);min-height:var(--sog-touch);padding:0;display:none}
[data-module="data"] .d-facts{margin:6px 0}
[data-module="data"] .d-hand{margin-top:6px}
[data-module="data"] .d-zalt{margin:2px 0}
[data-module="data"] .d-upd{margin:8px 0}
[data-module="data"] .d-upd p{margin:4px 0}
[data-module="data"] .d-fs{white-space:normal}
@media (min-width:900px){
[data-module="data"] .d-back{display:none}
[data-module="data"] .d-x{display:inline-flex;align-items:center;justify-content:center}
[data-module="data"] .d-cwtop:not([data-sheet-open]) .d-wmap{max-height:45vh}
[data-module="data"] .d-cwtop[data-sheet-open]{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}
[data-module="data"] .d-cwtop[data-sheet-open] .d-sheet{position:sticky;top:8px;max-height:calc(100vh - 24px);overflow:auto}
}
@media (max-width:899px){
[data-module="data"] .d-sheet{position:fixed;inset:0;z-index:15;overflow:auto;overscroll-behavior:contain;padding:16px;border:0;background:var(--sog-bg,var(--sog-surface))}
}
`;
