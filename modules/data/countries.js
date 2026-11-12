// V3 data — la carte du monde, les paquets de pays et la fiche d'un pays (SOG-0262, lot A) : l'entrée de la base. La carte dessine les contours des pays (ceux d'aerodb : ctx.aerodb.zoneOutlines) en SVG, cadrée sur la couverture ; les paquets sont la liste principale,
// chacun avec son état résumé, un seul ouvert à la fois ; un toucher sur un pays (de la carte ou d'un paquet) ouvre sa fiche (à droite de la carte en large, en plein écran au téléphone), en lecture : les coches posées par l'outil, l'inventaire des fichiers de chaque
// source. Les gestes de la fiche viennent au lot B. Rien ici n'écrit dans data/ ; les deux lectures du lanceur (base/cycle, base/coverage) sont des travaux en lecture seule, lancés à la demande.
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
  ROUTE,
  S,
  tt
} from './state.js';
import {
  buildZones,
  personalPicked,
  renderBuild
} from './panels.js';
import {
  statusKnown,
  zoneActionHtml,
  zoneReasons,
  zoneStateHtml
} from './status.js';
import {
  loadOutlines
} from './zonemap.js';
import {
  packUpdateHtml
} from './packs.js';

/** L'état propre à cet écran, créé au montage : le pays survolé, le paquet ouvert, la fiche ouverte (et d'où), la vue du monde, les chemins SVG gardés, les deux lectures du lanceur. */
export const cwInit = () => ({
  hover: null,
  grp: null,
  sheet: null,
  opener: '',
  world: false,
  paths: new Map(),
  pathsFor: null,
  cycle: null,
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
function nameOf(id) {
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
    <p class="f-muted" data-cw-legend>${esc(tt(TX.mapLegend))} : ${['ok', 'warn', 'err'].map(t => `${sw(t)}${esc(tt(TX.mapLegendBase[t]))}`).join(' · ')} · ${sw('muted')}${esc(tt(TX.cw.outside))} · <span class="d-sw" data-hatch></span>${esc(tt(TX.cw.hatch))} · <span class="d-sw" data-grp></span>${esc(tt(TX.cw.border))}${all.some(p => p.approx) ? ` · ${esc(tt(TX.mapLegendApprox))}` : ''}</p>
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
const dateOf = iso => iso ? M.dateText(String(iso).slice(0, 10), lang()) : '';
/** Une coche posée par l'outil : la marque (jamais la couleur seule), son nom, ce qu'elle dit. `ok` : 'yes' | 'no' | 'na'. */
function tickHtml(key, ok, detail) {
  return `<li data-tick="${key}" data-ok="${ok}"><span class="d-tk" aria-hidden="true">${ok === 'yes' ? '✓' : ok === 'no' ? '✗' : '–'}</span> <b>${esc(tt(TX.cw.tick[{ download: 'dlTick', build: 'buildTick', publish: 'pubTick' }[key]]))}</b> : <span data-tick-text>${esc(detail)}</span></li>`;
}
/** La coche « téléchargé » d'une source pour ce pays : d'abord la liste du cycle (l'état du fichier, sa date, son édition), à défaut ce que base/status dit des sources que le lanceur télécharge, sinon « non lu ». */
function downloadTick(id, item, z) {
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
/** La coche « construit » du pays : celle de son état (à jour : la date de sa dernière construction), sinon pourquoi pas. */
function buildTick(id, z) {
  const T = TX.cw;
  if (!z) return tickHtml('build', 'na', tt(T.dlUnread));
  if (z.state === 'up-to-date') return tickHtml('build', 'yes', z.builtAt ? tt(T.on, {
    d: dateOf(z.builtAt)
  }) + (z.builtCycle && S.airac ? ` · ${tt(T.cycleOf, { c: M.cycleName(S.airac, z.builtCycle) })}` : '') : '—');
  return tickHtml('build', 'no', tt(T.buildNot, {
    r: zoneReasons(id)[0] || tt(TX.zst[z.state])
  }));
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
/** Où trouver un fichier, en trois temps : le chemin rubrique par rubrique que dit le catalogue (`where`, « › » entre les rubriques ; « chemin à vérifier » à côté quand `verified` est faux), puis le lien de CE fichier (`link`, ou `url` quand il en a un), sinon celui de la page de la source (l'accueil du site en
 *  repli). Jamais une adresse inventée : seulement ce que le catalogue ou le lanceur donne. */
function whereHtml(f, steps, hand) {
  const T = TX.cw,
    page = steps?.page?.url || hand?.link || '',
    home = steps?.page?.home || '',
    path = Array.isArray(f.where) ? String(f.where[li()] ?? f.where[0] ?? '').slice(0, 400) : '',
    check = path && f.verified === false ? (S.d?.cat?.PATH_TO_CHECK?.[li()] || tt(T.pathCheck)) : '',
    links = [f.link ? link(f.link, tt(T.fileLink)) : '', !f.link && f.url ? link(f.url, tt(T.fileLink)) : '', !f.link && !f.url && page ?
      link(page, tt(T.pageLink)) :
      '', !f.link && !f.url && !page && home ? link(home, tt(T.homeLink)) : ''
    ].filter(Boolean);
  return `${path ? `<span data-file-path>${esc(tt(T.wherePath, { p: path }))}${check ? ` <em data-path-check>(${esc(check)})</em>` : ''}</span>` : ''}${links.length ? ` <span data-file-where>${esc(tt(T.where, { l: '\u0001' })).replace('\u0001', () => links.join(' · '))}</span>` : ''}`;
}
/** L'inventaire des fichiers d'une source prise à la main, trois temps pour chacun : ce que c'est en mots de pilote (`what`, à défaut `gives`), où le trouver, le nom attendu ; et « vu dans Téléchargements » ou « manquant » quand le lanceur a dit ce qu'il y voit. */
function inventoryHtml(id, item, cy) {
  const T = TX.cw,
    stepsOf = typeof S.d?.cat?.stepsOf === 'function' ? S.d.cat.stepsOf : null,
    steps = stepsOf ? stepsOf(id, S.cycleId) : null,
    hand = item?.hand || null,
    files = (steps && Array.isArray(steps.files) && steps.files.length ? steps.files : (hand?.expected || []).map(name => ({
      name
    }))).slice(0, 8),
    ready = cy.state === 'ready' && !!hand;
  if (!files.length) return '';
  return `<div data-inventory="${esc(id)}"><p class="d-invh"><b>${esc(tt(T.inventory))}</b></p>${!ready ? `<p class="f-muted" data-inventory-state="${esc(cy.state || 'none')}">${esc(tt(M.own(T.cycleState, cy.state) || T.inDlUnread))}</p>` : ''}<ul class="d-inv">${files.map(f => {
    const shown = String(f.file || f.name),
      seen = ready ? M.fileSeen(f.name, hand.inDownloads) || M.fileSeen(shown, hand.inDownloads) : null,
      what = Array.isArray(f.what) ? f.what : f.gives;
    return `<li data-file="${esc(f.name)}"${seen === null ? '' : ` data-seen="${seen}"`}>${Array.isArray(what) ? `<b data-file-what>${esc(String(what[li()] ?? what[0] ?? ''))}</b>` : ''}
      <span class="d-fl">${whereHtml(f, steps, hand)}</span>
      <span class="d-fl" data-file-name>${esc(tt(T.name, { n: '\u0001' })).replace('\u0001', () => `<code>${esc(shown)}</code>`)}${seen === null ? '' : ` <span class="d-fs" data-file-state="${seen ? 'seen' : 'missing'}">${seen ? '✓' : '✗'} ${esc(tt(seen ? T.seen : T.missing))}</span>`}</span></li>`;
  }).join('')}</ul></div>`;
}
/** Le régime d'une source : celui de la liste du cycle, à défaut celui que le catalogue dit (un fichier pris à la main, lu sur ce poste, pris par le lanceur) ; '' sans. */
function regimeOf(id, item) {
  if (item?.regime) return item.regime;
  const s = catSource(id);
  return !s ? '' : (s.fetch?.how === 'pick' || s.fetch?.pick) ? 'hand' : s.localOnly ? 'local' : s.fetch ? 'auto' : '';
}
/** La source n'est-elle plus offerte par son éditeur ? { since, note } d'après la liste du cycle (`unavailable`, ou l'état `unavailable` du téléchargement) et le catalogue (`stepsOf(id).unavailable`) ; null sinon. Rien n'est inventé : la note est celle du catalogue. */
function unavailableOf(id, item) {
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
/** Une source du pays : son nom, son régime, ses trois coches (dans la couverture seulement) et, pour un fichier pris à la main, l'inventaire. */
function sourceHtml(id, zone, z, inCov) {
  const cy = cycleOf(zone),
    item = cy.state === 'ready' ? cy.zv?.sources[id] || cy.data.items[id] || null : null,
    reg = regimeOf(id, item),
    name = (catSource(id)?.n?.[li()] || item?.label?.[li()] || id).replace(/\s*\(.*\)\s*$/, '');
  return `<section class="d-src" data-sheet-source="${esc(id)}"${reg ? ` data-regime="${reg}"` : ''}><h4>${esc(name)}</h4>${reg ? `<p class="f-muted" data-regime-line>${esc(tt(TX.cw.regime[reg]))}</p>` : ''}
    ${inCov ? `<ul class="d-ticks">${downloadTick(id, item, z)}${buildTick(zone, z)}${publishTick(z)}</ul>` : ''}${reg === 'hand' ? inventoryHtml(id, item, cy) : ''}</section>`;
}
/** La fiche d'un pays (lecture) : son nom et son état, quand il a été construit, ses procédures, ses sources avec leurs coches et leur inventaire, et — dans la couverture — les boutons de fichier de sa ligne d'autrefois ; '' sans pays ouvert. */
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
    built = z?.builtAt && z.builtCycle && S.airac ? tt(T.builtCycleAt, {
      c: M.cycleName(S.airac, z.builtCycle),
      d: dateOf(z.builtAt)
    }) : z?.builtAt ? tt(T.builtAt, {
      d: dateOf(z.builtAt)
    }) : z?.builtCycle && S.airac ? tt(T.builtCycle, {
      c: M.cycleName(S.airac, z.builtCycle)
    }) : tt(T.builtNever);
  return `<section class="d-sheet" data-sheet="${esc(id)}" role="region" aria-label="${esc(tt(T.sheetLabel, { c: name }))}">
    <header class="d-sheeth"><button type="button" class="d-back" data-act="sheet-close">${esc(tt(T.back))}</button><h3 data-sheet-name>${esc(name)}</h3></header>
    ${inCov ? `<div class="d-sheetst" data-sheet-state>${zoneStateHtml(id) || `<span class="d-st">${esc(word(tone(id)))}</span>`}</div><p class="f-muted" data-sheet-built>${esc(built)}</p>` : `<p data-sheet-out>${esc(tt(T.notInCoverage, { c: name }))}</p>`}
    ${S.cw.proc?.state === 'ready' ? `<p class="f-muted" data-sheet-proc>${esc(procs ? tt(T.procYes, { s: procs.map(procName).join(', ') }) : tt(T.procNo))}</p>` : ''}
    ${noReader.length ? `<p class="f-warn" data-sheet-noreader>${esc(tt(T.noReader, { s: noReader.join(', ') }))}</p>` : ''}
    <h4>${esc(tt(T.sourcesTitle))}</h4>${ids.length ? `${avail.map(s => sourceHtml(s, id, z, inCov)).join('')}${gone.length ? `<h4 data-unavailable-title>${esc(tt(T.unavailableTitle))}</h4>${gone.map(g => unavailableHtml(g.id, g.item, g.un)).join('')}` : ''}` : `<p class="f-muted" data-sheet-nosource>${esc(tt(T.noSources))}</p>`}
    ${inCov ? `<div data-sheet-actions>${zoneActionHtml(id)}</div>` : ''}</section>`;
}
/** Le bloc de la base sous la barre d'état : la carte (et la fiche à sa droite quand un pays est ouvert, en large), puis les paquets. */
export function countriesHtml() {
  if (!S.cw || !S.d) return '';
  const map = mapHtml(),
    sheet = sheetHtml(),
    groups = groupsHtml();
  if (!map && !sheet && !groups) return '';
  return `<div class="d-cw" data-countries><div class="d-cwtop"${sheet ? ' data-sheet-open' : ''}>${map ? `<div class="d-cwmap">${map}</div>` : ''}${sheet}</div>${groups}</div>`;
}
/** Le sélecteur qui retrouve l'élément touché après un redessin (le focus lui revient à la fermeture de la fiche). */
function selectorOf(el, zone) {
  const z = CSS.escape(zone);
  return el.closest('[data-wmap]') ? `[data-wmap] [data-zone="${z}"]` : el.closest('[data-cw-groups]') ? `[data-cw-groups] [data-act="open-country"][data-zone="${z}"]` : `[data-act="open-country"][data-zone="${z}"]`;
}
/** Ouvre la fiche d'un pays (toucher sur la carte, dans un paquet ou dans la liste de la phrase d'état) ; sans pays connu, rien. Le focus passe au bouton « Retour ». */
export function openCountry(el) {
  const id = el?.dataset?.zone;
  if (!S.d || !/^[a-z0-9_-]{2,12}$/.test(id || '')) return;
  S.cw.opener = selectorOf(el, id);
  S.cw.sheet = id;
  wantCycle(id);
  renderBuild();
  S.body?.querySelector('[data-sheet] [data-act="sheet-close"]')?.focus({
    preventScroll: true
  });
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
/** Lit une fois par fiche ouverte, sans écrire, la vue du lanceur sur ce pays (base/cycle `{ zone }` : toutes ses sources avec leurs trois étapes, Téléchargements, ce qu'ajouter le pays demandera) : jamais avant l'ouverture, jamais pour un lanceur qui ne connaît pas le verbe ; refusé tant qu'un autre
 *  travail tourne (« occupé », relu à la prochaine ouverture). Ne lève jamais. */
export async function wantCycle(zone) {
  const L = S?.ctx?.launcher,
    c = S?.cw?.cycle;
  if (!zone || (c && c.zone === zone && (c.state === 'loading' || c.state === 'ready' || c.state === 'none'))) return;
  if (!L || !S.known?.includes('base/cycle')) {
    S.cw.cycle = {
      zone,
      state: 'none'
    };
    return;
  }
  const me = S;
  S.cw.cycle = {
    zone,
    state: 'loading'
  };
  if (S.statusP) await S.statusP.catch(() => null);
  if (S !== me) return;
  if (busyNow()) {
    S.cw.cycle = {
      zone,
      state: 'busy'
    };
    return renderBuild();
  }
  let final = null;
  try {
    final = await L.job(ROUTE, {
      set: 'base',
      verb: 'cycle',
      args: {
        zone,
        personal: personalPicked(buildZones().ids)
      }
    }, {
      onProgress: () => {},
      signal: new AbortController().signal
    });
  } catch {
    final = null;
  }
  if (S !== me || S.cw.cycle?.zone !== zone) return; // un autre pays a été ouvert pendant la lecture : sa lecture est la sienne
  const data = M.cycleRead(final);
  S.cw.cycle = data ? {
    zone,
    state: 'ready',
    data
  } : {
    zone,
    state: final?.status === 409 ? 'busy' : 'unread'
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
    let final = null;
    try {
      final = await L.job(ROUTE, {
        set: 'base',
        verb: 'coverage',
        args: {}
      }, {
        onProgress: () => {},
        signal: new AbortController().signal
      });
    } catch {
      final = null;
    }
    if (S !== me) return;
    const rows = M.coverageOf(final);
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
/** Ce qui se lit après un dessin complet de l'écran : les procédures par pays (la hachure) et, si une fiche est ouverte, la liste du cycle. */
export function afterDraw() {
  if (!S?.cw) return;
  wantProc();
  if (S.cw.sheet) wantCycle(S.cw.sheet);
}
/** Les lectures de la fiche sont à refaire (une opération vient de finir : les fichiers ont bougé). */
export function forgetReads() {
  if (!S?.cw) return;
  S.cw.cycle = null;
  if (S.cw.proc?.state !== 'loading') S.cw.proc = null;
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
@media (min-width:900px){
[data-module="data"] .d-cwtop[data-sheet-open]{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}
[data-module="data"] .d-cwtop[data-sheet-open] .d-sheet{position:sticky;top:8px;max-height:calc(100vh - 24px);overflow:auto}
}
@media (max-width:899px){
[data-module="data"] .d-sheet{position:fixed;inset:0;z-index:100;overflow:auto;overscroll-behavior:contain;padding:16px;border:0;background:var(--sog-bg,var(--sog-surface))}
}
`;
