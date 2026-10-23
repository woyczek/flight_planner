// V3 flightlog — « Mes vols » de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/flightlog/SPEC.md,
// INTEGRATION.md). Les vols passés du pilote, une ligne par vol, du plus récent au plus ancien : ses comptes rendus
// (cr/reports/ de V3 et le registre V2 cr/missions.yaml), le journal du site (pilot/<trigramme>/site_log.json, écrit
// par le module website) et ses sessions IVAO / VATSIM (frame/lib/last_flight.js par ctx.net), sans doublon ; trois
// tuiles de totaux, période, recherche, « sans CR » ; un toucher déplie le détail et « Écrire le CR » / « Ouvrir le
// CR » (passage à report par pilot/handoff.json) ; export CSV dans « Plus ». Calcul pur dans model.js.
import * as F from './model.js';
import * as LF from '../../frame/lib/last_flight.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe

export const meta = {
  id: 'flightlog',
  apps: ['pilot'],
  level: 1,
  reads: ['cr/', 'pilot/', 'cache/flightlog/', 'cache/report/'],
  writes: [{
    prefix: 'pilot/handoff.json',
    policy: 'cache'
  }, {
    prefix: 'cache/flightlog/',
    policy: 'cache'
  }],
  files: ['model.js', '../../frame/lib/last_flight.js', '../../frame/lib/js-yaml.min.js', '../../frame/lib/dom.js']
};

const VIEW = 'cache/flightlog/view.json',
  NET = 'cache/flightlog/network.json',
  HANDOFF = 'pilot/handoff.json';

// ---------------------------------------------------------------- textes [fr, en, de, es]
const TX = {
  title: ['Mes vols', 'My flights', 'Meine Flüge', 'Mis vuelos'],
  period: ['Période', 'Period', 'Zeitraum', 'Período'],
  periods: {
    7: ['7 jours', '7 days', '7 Tage', '7 días'],
    31: ['31 jours', '31 days', '31 Tage', '31 días'],
    365: ['1 an', '1 year', '1 Jahr', '1 año'],
    0: ['Tout', 'All', 'Alle', 'Todo']
  },
  find: ['Rechercher', 'Search', 'Suchen', 'Buscar'],
  noReport: ['Sans CR', 'Without report', 'Ohne Bericht', 'Sin informe'],
  noTimes: ['CR sans heures', 'Report without times', 'Bericht ohne Zeiten', 'Informe sin horas'],
  filtersKept: ['Filtres de la dernière visite : {l} — les retirer', 'Filters from the last visit: {l} — remove them',
    'Filter des letzten Besuchs: {l} — entfernen', 'Filtros de la última visita: {l} — quitarlos'
  ],
  tFlights: ['vols', 'flights', 'Flüge', 'vuelos'],
  tBlock: ['heures de bloc', 'block hours', 'Blockstunden', 'horas bloque'],
  tNoCr: ['sans CR', 'without report', 'ohne Bericht', 'sin informe'],
  types: ['Types : {l}', 'Types: {l}', 'Muster: {l}', 'Tipos: {l}'],
  empty: ['Aucun vol sur cette période.', 'No flight in this period.', 'Kein Flug in diesem Zeitraum.', 'Ningún vuelo en este período.'],
  more: ['Plus', 'More', 'Mehr', 'Más'],
  csv: ['Exporter (CSV)', 'Export (CSV)', 'Exportieren (CSV)', 'Exportar (CSV)'],
  refresh: ['Relire IVAO / VATSIM', 'Read IVAO / VATSIM again', 'IVAO / VATSIM neu lesen', 'Releer IVAO / VATSIM'],
  write: ['Écrire le CR', 'Write the report', 'Bericht schreiben', 'Escribir el informe'],
  open: ['Ouvrir le CR', 'Open the report', 'Bericht öffnen', 'Abrir el informe'],
  v2report: ['CR de la V2 (registre) : à ouvrir dans la suite complète.', 'V2 report (registry): open it in the full suite.',
    'V2-Bericht (Register): in der vollständigen Suite öffnen.', 'Informe V2 (registro): ábralo en la suite completa.'
  ],
  source: ['Source', 'Source', 'Quelle', 'Fuente'],
  sources: {
    cr: ['compte rendu', 'report', 'Bericht', 'informe'],
    log: ['journal du site', 'website log', 'Website-Flugbuch', 'diario del sitio'],
    net: ['réseau {n}', '{n} network', '{n}-Netz', 'red {n}']
  },
  time: ['Heure', 'Time', 'Uhrzeit', 'Hora'],
  aircraft: ['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
  mission: ['Mission', 'Mission', 'Einsatz', 'Misión'],
  notes: ['Remarques', 'Notes', 'Bemerkungen', 'Observaciones'],
  inFlight: ['en cours', 'in progress', 'laufend', 'en curso'],
  startedNow: ['En cours — démarré à {t}', 'In progress — started at {t}', 'Laufend — gestartet um {t}', 'En curso — iniciado a las {t}'],
  diverted: [' (déroutement)', ' (diverted)', ' (Ausweichlandung)', ' (desviado)'],
  cols: [
    ['Date', 'Date', 'Datum', 'Fecha'],
    ['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'],
    ['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
    ['Route', 'Route', 'Route', 'Ruta'],
    ['Bloc', 'Block', 'Block', 'Bloque'],
    ['Mission', 'Mission', 'Einsatz', 'Misión'],
    ['CR', 'Report', 'Bericht', 'Informe']
  ],
  noCr: ['sans CR', 'no report', 'kein Bericht', 'sin informe'],
  offline: ['Hors ligne : le réseau n’a pas été relu.', 'Offline: the network was not read again.',
    'Offline: das Netz wurde nicht neu gelesen.',
    'Sin conexión: la red no se releyó.'
  ],
  relay: ['{n} n’est joignable que par le lanceur.', '{n} can only be reached through the launcher.',
    '{n} ist nur über den Starter erreichbar.',
    '{n} solo es accesible a través del lanzador.'
  ]
};

let S = null;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Texte d'une ligne [fr, en, de, es]. */
const tt = (row, v) => S.ctx.t(row, v);
/** Majuscules. */
const up = v => String(v ?? '').trim().toUpperCase();
/** Trigramme de l'identité (vide sans identité). */
const tri = () => up(S.ctx.identity.trigram);

// ---------------------------------------------------------------- sources
/** Mes comptes rendus V3 (cr/reports/**.json) : auteur = moi, ou sans auteur noté. */
async function reportsV3() {
  const out = [];
  for (const p of ((await S.ctx.data.list('cr/reports/')) || []).filter(x => x.endsWith('.json'))) {
    const r = await S.ctx.data.get(p);
    if (!r?.metadata) continue;
    const f = F.fromReport(r, p);
    if (!tri() || !f.by || f.by === tri()) out.push(f);
  }
  return out;
}
/** Mes comptes rendus du registre V2 (cr/missions.yaml, lu comme texte puis par js-yaml), tant que le pont du lanceur
 *  n'y a pas tout versé : auteur = moi, ou sans auteur noté. */
async function reportsV2() {
  const text = await S.ctx.data.get('cr/missions.yaml');
  if (typeof text !== 'string' || !text.trim()) return [];
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    const doc = globalThis.jsyaml.load(text);
    return (doc?.missions || []).map(m => F.fromReport(m)).filter(f => !tri() || !f.by || f.by === tri());
  } catch {
    return [];
  }
}
/** Lignes du journal du site (pilot/<trigramme>/site_log.json, écrit par website) ; aucune sans trigramme. */
async function siteLog() {
  if (!tri()) return [];
  const doc = await S.ctx.data.get(`pilot/${tri()}/site_log.json`);
  return (doc?.entries || []).map(F.fromLog);
}
/** JSON d'une adresse par ctx.net ; erreur { code } : offline, relay (lanceur nécessaire), http. */
async function getJson(url) {
  const r = await S.ctx.net.fetch(url, {
      headers: {
        accept: 'application/json'
      }
    }),
    fail = code => Object.assign(new Error(code), {
      code
    });
  if (r.headers.get('x-sog-offline')) throw fail('offline');
  if (r.headers.get('x-sog-unreachable') || r.status === 401 || r.status === 403) throw fail('relay');
  if (!r.ok) throw fail('http');
  return r.json();
}
/** Sessions IVAO et VATSIM des 7 derniers jours (identifiants de l'identité), gardées deux minutes sur l'appareil ;
 *  loud : les échecs sont dits. */
async function network(loud = false) {
  const kept = (await S.ctx.data.get(NET)) || {},
    out = [];
  for (const [net, id, list] of [
      ['IVAO', S.ctx.identity.ivao, LF.ivaoFlights],
      ['VATSIM', S.ctx.identity.vatsim, LF.vatsimFlights]
    ]) {
    const vid = String(id || '').trim();
    if (!vid) continue;
    let got = kept[net]?.id === vid && Date.now() - Date.parse(kept[net].at) < 120000 && !loud ? kept[net].list : null;
    if (!got && S.ctx.net?.online?.() !== false) try {
      got = await list(getJson, vid);
      kept[net] = {
        id: vid,
        at: new Date().toISOString(),
        list: got
      };
    } catch (e) {
      if (loud) S.ctx.notify(e.code === 'offline' ? tt(TX.offline) : e.code === 'relay' ? tt(TX.relay, {
        n: net
      }) : `${net} : ${e.message}`, 'warn');
      got = kept[net]?.id === vid ? kept[net].list : null;
    }
    for (const fl of got?.flights || []) out.push(F.fromNetwork(fl, net));
  }
  await S.ctx.data.put(NET, kept, {
    policy: 'cache'
  });
  return out;
}
/** Vol démarré dans le carburant (current_flight.started) et pas encore rapporté (cache/report/started.json, écrit par
 *  le compte rendu à l'enregistrement) : { at, diverted, reg, callsign, type, dep, arr } ou null. */
async function startedFlight() {
  const cf = await S.ctx.data.get(`pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`).catch(() => null),
    at = cf?.started?.at;
  if (!at) return null;
  const done = (await S.ctx.data.get('cache/report/started.json').catch(() => null))?.done || [];
  if (done.includes(at)) return null;
  const a = cf.aircraft || {},
    r = cf.route || {};
  return {
    at,
    diverted: !!cf.started.diverted,
    reg: a.registration || '',
    callsign: a.callsign || '',
    type: a.type || '',
    dep: r.dep || '',
    arr: r.arr || ''
  };
}
/** Lit les sources du device (CR, journal) puis le réseau ; la liste se redessine à chaque étape. */
async function load(loud = false) {
  const s = S,
    started = await startedFlight();
  if (S !== s) return;
  S.started = started;
  const [v3, v2, log] = await Promise.all([reportsV3(), reportsV2(), siteLog()]);
  S.base = [v3, v2, log];
  S.flights = F.merge(...S.base, S.net || []);
  render();
  S.net = await network(loud);
  if (!S?.body) return;
  S.flights = F.merge(...S.base, S.net);
  render();
}

// ---------------------------------------------------------------- écran
// placement seulement (primitives et jetons du cadre : frame/design/INTEGRATION.md) : trois tuiles sur une rangée,
// recherche qui prend la place, colonnes d'une ligne de vol (téléphone, puis écran large), détail sous sa ligne
const STYLE = `
[data-module="flightlog"] .f-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}
[data-module="flightlog"] .fl-chip{min-height:44px;border:1px solid var(--sog-accent);color:var(--sog-accent);background:transparent} /* filtres repris */
[data-module="flightlog"] .f-tools input[type=search]{flex:1;min-width:8em}
[data-module="flightlog"] .f-list .f-item{grid-template-columns:5.5em minmax(0,1fr) auto}
[data-module="flightlog"] .fl-mid{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="flightlog"] .fl-detail{margin:0}
[data-module="flightlog"] .f-dot{margin-right:6px}
[data-module="flightlog"] .fl-now{display:flex;gap:10px;align-items:center;justify-content:space-between}
@container (min-width: 900px){ /* largeur du module (volet de la vue double compris), pas de la fenêtre */
  [data-module="flightlog"] .f-list .f-item{grid-template-columns:7em 9em 10em minmax(0,1fr) 5em minmax(0,1fr)}
}`;

/** Dessine la liste sans bouger le défilement (relectures des CR, du journal et du réseau). */
function render() {
  if (!S?.body) return;
  keepScroll(S.body, renderBody);
}
/** Dessine les tuiles, les filtres, la liste et « Plus ». */
function renderBody() {
  const v = S.view,
    list = F.filter(S.flights || [], {
      days: +v.days,
      find: v.find,
      noReport: v.noReport
    }),
    tot = F.totals(list),
    wide = matchMedia('(min-width: 980px)').matches;
  S.shown = list;
  const row = f => {
    const k = F.keyOf(f),
      open = S.open === k,
      route = [f.dep, f.arr].filter(Boolean).join(' → ') || '—',
      dot = f.source === 'cr' ? '' : '<span class="f-dot" data-kind="warn" aria-hidden="true"></span>';
    return `<div data-key="${esc(k)}">
      <button type="button" class="f-item" aria-expanded="${open}">${wide ? `<span>${dot}${esc(f.date)}</span><span>${esc(f.callsign || '—')}</span><span>${esc([f.type, f.reg].filter(Boolean).join(' ') || '—')}</span><span class="fl-mid">${esc(route)}</span>${blockCell(f)}<span class="fl-mid">${esc(f.crId || f.mission || '')}</span>` : `<span>${dot}${esc(f.date.slice(5))}</span><span class="fl-mid">${esc(f.callsign || '—')} · ${esc(route)}</span>${blockCell(f)}`}</button>
      ${open ? `<div class="f-card fl-detail"><dl class="f-dl">
        <dt>${esc(tt(TX.source))}</dt><dd>${esc(tt(TX.sources[f.source], { n: f.network || '' }))}${f.open ? ` (${esc(tt(TX.inFlight))})` : ''}</dd>
        <dt>${esc(tt(TX.time))}</dt><dd>${esc(f.date)} ${esc(f.time)}</dd>
        <dt>${esc(tt(TX.aircraft))}</dt><dd>${esc([f.type, f.reg].filter(Boolean).join(' ') || '—')}</dd>
        <dt>${esc(tt(TX.mission))}</dt><dd>${esc(f.mission || f.family || '—')}</dd>
        ${f.notes ? `<dt>${esc(tt(TX.notes))}</dt><dd>${esc(f.notes)}</dd>` : ''}
        ${f.crId ? `<dt>${esc(tt(TX.cols[6]))}</dt><dd>${esc(f.crId)}</dd>` : ''}</dl>
        ${f.source === 'cr' ? f.path ? `<button type="button" class="primary" data-do="open">${esc(tt(TX.open))}</button>` : `<p class="f-muted">${esc(tt(TX.v2report))}</p>` : `<button type="button" class="primary" data-do="write">${esc(tt(TX.write))}</button>`}
      </div>` : ''}</div>`;
  };
  S.body.innerHTML = `
    <div class="f-tiles"><div><b>${tot.flights}</b><span>${esc(tt(TX.tFlights))}</span></div><div><b>${F.hm(tot.blockMinutes)}</b><span>${esc(tt(TX.tBlock))}</span></div><div><b>${tot.noReport}</b><span>${esc(tt(TX.tNoCr))}</span></div></div>
    ${tot.types.length ? `<p class="f-muted">${esc(tt(TX.types, { l: tot.types.map(([k, n]) => `${k} ×${n}`).join(', ') }))}</p>` : ''}
    ${S.kept ? `<div class="f-row"><button type="button" class="fl-chip" data-do="clearfilters" aria-label="${esc(tt(TX.filtersKept, { l: keptFilters() }))}" title="${esc(tt(TX.filtersKept, { l: keptFilters() }))}">${esc(keptFilters())} ✕</button></div>` : ''}
    <div class="f-tools"><select data-k="days" aria-label="${esc(tt(TX.period))}">${[7, 31, 365, 0].map(d => `<option value="${d}"${+v.days === d ? ' selected' : ''}>${esc(tt(TX.periods[d]))}</option>`).join('')}</select>
      <input type="search" data-k="find" value="${esc(v.find)}" placeholder="${esc(tt(TX.find))}" aria-label="${esc(tt(TX.find))}">
      <label class="f-check"><input type="checkbox" data-k="noReport"${v.noReport ? ' checked' : ''}>${esc(tt(TX.noReport))}</label></div>
    ${S.started ? `<div class="f-card f-accent fl-now"><div><b>${esc(tt(TX.startedNow, { t: new Date(S.started.at).toLocaleTimeString(S.ctx.lang(), { hour: '2-digit', minute: '2-digit' }) }))}${S.started.diverted ? esc(tt(TX.diverted)) : ''}</b>
      <div class="f-muted">${esc([S.started.callsign, [S.started.type, S.started.reg].filter(Boolean).join(' '), [S.started.dep, S.started.arr].filter(Boolean).join(' → ')].filter(Boolean).join(' · '))}</div></div>
      <button type="button" class="primary" data-do="writeNow">${esc(tt(TX.write))}</button></div>` : ''}
    <div class="f-list">${list.map(row).join('') || `<p class="f-card f-muted">${esc(tt(TX.empty))}</p>`}</div>
    <details class="f-card"><summary>${esc(tt(TX.more))}</summary><div class="f-row">
      <button type="button" data-do="csv">${esc(tt(TX.csv))}</button><button type="button" data-do="refresh">${esc(tt(TX.refresh))}</button></div></details>`;
}
/** Case du bloc : sa durée, ou « — » (un CR sans heures le dit en infobulle). */
function blockCell(f) {
  if (f.block != null) return `<span class="f-num">${F.hm(f.block)}</span>`;
  const t = f.source === 'cr' ? tt(TX.noTimes) : '';
  return `<span class="f-num"${t ? ` title="${esc(t)}" aria-label="${esc(t)}"` : ''}>—</span>`;
}
/** Défauts des filtres (une visite neuve). */
const VIEW_DEFAULT = {
  days: 365,
  find: '',
  noReport: false
};
/** Filtres actifs repris d'une visite précédente : « 1 an · LFRS · Sans CR » ; vide s'ils sont ceux par défaut. */
function keptFilters() {
  const v = S.view;
  if (+v.days === VIEW_DEFAULT.days && !String(v.find || '').trim() && !v.noReport) return '';
  return [tt(TX.periods[+v.days] || TX.periods[365]), String(v.find || '').trim(), v.noReport ? tt(TX.noReport) : ''].filter(Boolean)
    .join(' · ');
}
/** Filtres : gardés sur l'appareil, liste redessinée. */
function onInput(e) {
  const k = e.target.dataset?.k;
  if (!k) return;
  S.kept = false; // filtres touchés dans cette visite : la puce des filtres repris s'en va
  S.view[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  S.ctx.data.put(VIEW, S.view, {
    policy: 'cache'
  });
  render();
}
/** Gestes : déplier un vol, écrire ou ouvrir le CR, CSV, relire le réseau. */
async function onClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const rowEl = b.closest('[data-key]'),
    f = rowEl && (S.flights || []).find(x => F.keyOf(x) === rowEl.dataset.key);
  if (rowEl && b.parentElement === rowEl) {
    S.open = S.open === rowEl.dataset.key ? null : rowEl.dataset.key;
    return render();
  }
  switch (b.dataset.do) {
    case 'clearfilters': // puce des filtres repris : retour aux filtres par défaut
      S.view = {
        ...VIEW_DEFAULT
      };
      S.kept = false;
      S.ctx.data.put(VIEW, S.view, {
        policy: 'cache'
      });
      return render();
    case 'writeNow': // le compte rendu propose d'abord le vol démarré (« Vol démarré à hh:mm »)
      location.hash = '#report?from=flightlog';
      return;
    case 'write':
      await S.ctx.data.put(HANDOFF, {
        to: 'report',
        from: 'flightlog',
        source: tt(TX.title),
        at: new Date().toISOString(),
        fresh: true,
        family: f.family,
        values: F.reportValues(f)
      }, {
        policy: 'cache'
      });
      location.hash = '#report';
      return;
    case 'open':
      await S.ctx.data.put(HANDOFF, {
        to: 'report',
        from: 'flightlog',
        at: new Date().toISOString(),
        open: f.path
      }, {
        policy: 'cache'
      });
      location.hash = '#report';
      return;
    case 'csv': {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([F.csv(S.shown, TX.cols.map(c => tt(c)), tt(TX.noCr))], {
        type: 'text/csv;charset=utf-8'
      }));
      a.download = `my_flights_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    case 'refresh':
      return load(true);
  }
}

export async function mount(el, ctx) {
  S = {
    el,
    ctx,
    flights: [],
    view: {
      ...VIEW_DEFAULT,
      ...((await ctx.data.get(VIEW)) || {})
    }
  };
  S.kept = !!keptFilters(); // filtres d'une visite précédente : dits par une puce qui les retire
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(tt(TX.title))}</h1><div data-body></div>`;
  S.body = el.querySelector('[data-body]');
  S.body.addEventListener('input', onInput);
  S.body.addEventListener('change', onInput);
  S.body.addEventListener('click', onClick);
  // CR enregistrés ici ou reçus, journal du site réécrit par website : liste relue
  S.stops = [ctx.data.watch('cr/', () => load()), ctx.data.watch(`pilot/${tri() || 'ANON'}/site_log.json`, () => load())];
  render();
  await load();
}

export function unmount() {
  if (!S) return;
  for (const f of S.stops || []) f?.();
  S.body = null;
  S = null;
}
