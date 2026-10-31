// V3 missions — les missions de la compagnie (modules/missions/SPEC.md § 1–4, lot 2 réduit du 31 octobre 2026) : la liste des missions
// communes du dépôt par famille, une recherche et un filtre de famille, « Choisir » (un résumé plat de la mission), « Tirer au sort »
// parmi celles que le pilote n'a pas encore volées, et « Préparer ce vol » par la porte de Carburant (#fuel?mission=<id>). Le module lit,
// n'écrit rien : les missions ont un seul auteur (le CPCO de la V2), le vol est écrit par Carburant. Pas encore : l'enveloppe, le lecteur
// page à page, l'affectation (§ 5–6).
import * as MS from '../../frame/lib/mission.js';

export const meta = {
  id: 'missions',
  apps: ['pilot'],
  level: 1,
  title: ['Missions', 'Missions', 'Missionen', 'Misiones'],
  files: ['../../frame/lib/mission.js', '../../frame/lib/js-yaml.min.js'],
  reads: ['missions/', 'cr/'], // les missions et leur registre ; les comptes rendus (« volée le … »)
  writes: []
};

const REGISTRY = 'missions/mission_registry.yaml',
  ROWS = 7; // lignes montrées avant « N autres » (sept éléments au plus par écran)

const TX = {
  search: ['Rechercher (id, titre, terrain, type)', 'Search (id, title, aerodrome, type)', 'Suchen (ID, Titel, Flugplatz, Typ)',
    'Buscar (id, título, aeródromo, tipo)'
  ],
  allFamilies: ['Toutes les familles', 'All families', 'Alle Familien', 'Todas las familias'],
  draw: ['Tirer au sort', 'Draw at random', 'Zufällig ziehen', 'Sortear'],
  drawAgain: ['Tirer encore', 'Draw again', 'Erneut ziehen', 'Sortear otra'],
  prepare: ['Préparer ce vol', 'Prepare this flight', 'Diesen Flug vorbereiten', 'Preparar este vuelo'],
  back: ['Retour', 'Back', 'Zurück', 'Volver'],
  more: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  count: ['{n} missions', '{n} missions', '{n} Missionen', '{n} misiones'],
  none: ['Aucune mission dans le dépôt (missions/mission_registry.yaml).',
    'No mission in the repository (missions/mission_registry.yaml).',
    'Keine Mission im Repository (missions/mission_registry.yaml).',
    'Ninguna misión en el repositorio (missions/mission_registry.yaml).'
  ],
  noHit: ['Aucune mission ne correspond.', 'No mission matches.', 'Keine Mission passt.', 'Ninguna misión coincide.'],
  allFlown: ['Toutes les missions de ce filtre sont déjà volées.', 'Every mission of this filter has been flown.',
    'Alle Missionen dieses Filters wurden bereits geflogen.', 'Todas las misiones de este filtro ya se han volado.'
  ],
  flown: ['volée le {d}', 'flown on {d}', 'geflogen am {d}', 'volada el {d}'],
  drawn: ['Tirée au sort', 'Drawn at random', 'Zufällig gezogen', 'Sorteada'],
  route: ['Trajet', 'Route', 'Strecke', 'Trayecto'],
  aircraft: ['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
  block: ['Bloc estimé', 'Estimated block', 'Geschätzte Blockzeit', 'Bloque estimado'],
  operation: ['Opération', 'Operation', 'Operation', 'Operación'],
  notes: ['Notes', 'Notes', 'Hinweise', 'Notas'],
  unread: ['Le fichier de la mission ne se lit pas : seul le registre est montré.',
    'The mission file cannot be read: only the registry is shown.',
    'Die Missionsdatei ist nicht lesbar: nur das Register wird gezeigt.',
    'El archivo de la misión no se lee: solo se muestra el registro.'
  ]
};

let S = null;

/** Échappe un texte pour du HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));
/** Des minutes en « h:mm ». */
const hmm = m => Number.isFinite(+m) && m > 0 ? `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}` : '';
/** Un texte YAML lu par le lecteur du cadre (js-yaml, chargé une fois) ; null s'il ne se lit pas. */
async function yaml(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    return globalThis.jsyaml.load(text);
  } catch {
    return null;
  }
}

/** Monte l'écran : le registre lu (les organisations …Z écartées : jamais un vol), mes missions volées, la liste dessinée. */
export async function mount(el, ctx) {
  const s = S = {
    el,
    ctx,
    tt: (row, v) => ctx.t(row, v),
    rows: [],
    flown: new Map(), // id de mission → date du compte rendu (le mien, ou sans auteur)
    q: '',
    family: '',
    all: false,
    open: null // { row, mission, drawn } : la mission choisie
  };
  el.onclick = e => onClick(s, e);
  el.oninput = e => onInput(s, e);
  el.onchange = e => onInput(s, e);
  const reg = MS.readRegistry(await yaml(await Promise.resolve(ctx.data.get(REGISTRY)).catch(() => null)));
  if (S !== s) return;
  s.rows = reg.filter(r => !r.organisation).sort((a, b) => b.id.localeCompare(a.id)); // les séries récentes d'abord
  draw(s);
  s.flown = await flownOf(s);
  if (S === s && !s.open) results(s);
}

/** Démonte : rien n'est suivi. */
export function unmount() {
  S = null;
}

/** Les missions que ce pilote a volées : les comptes rendus (cr/reports/) qui nomment une mission, les miens ou sans auteur. */
async function flownOf(s) {
  const out = new Map(),
    me = String(s.ctx.identity?.trigram || '').toUpperCase();
  for (const p of ((await Promise.resolve(s.ctx.data.list('cr/reports/')).catch(() => null)) || []).filter(x => x.endsWith('.json'))) {
    const m = await Promise.resolve(s.ctx.data.get(p)).catch(() => null),
      id = String(m?.metadata?.missionId || m?.mission || '').trim(),
      by = String(m?.by || m?.metadata?.reportedBy || '').toUpperCase();
    if (id && (!me || !by || by === me) && !out.has(id)) out.set(id, String(m?.metadata?.date || '').slice(0, 10));
  }
  return out;
}

/** Les lignes retenues par la recherche et le filtre de famille. */
const filtered = s => s.rows.filter(r => (!s.family || r.family === s.family) && (!s.q || [r.id, r.title, r.operation, r.origin, r
  .destination, ...r.types
].some(v => String(v).toUpperCase().includes(s.q.toUpperCase()))));

/** Dessine la liste, ou la mission choisie. */
function draw(s) {
  s.ctx.helpAnchor?.(() => s.open ? 'missions-open' : 'missions-list');
  s.el.innerHTML = `<h1>${esc(s.tt(meta.title))}</h1>${s.open ? missionHtml(s) : listHtml(s)}`;
}

/** La date d'un compte rendu en « jj/mm/aaaa ». */
const day = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('/') : d;

/** La liste : « Tirer au sort », recherche, famille, puis les résultats (resultsHtml). */
function listHtml(s) {
  if (!s.rows.length) return `<div class="f-card"><p class="f-muted">${esc(s.tt(TX.none))}</p></div>`;
  const families = [...new Set(s.rows.map(r => r.family).filter(Boolean))].sort();
  return `<div class="f-card" data-pane="list"><div class="f-row"><button type="button" class="primary" data-do="draw">${esc(s.tt(TX.draw))}</button></div>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.search))}</span><input type="search" data-k="q" value="${esc(s.q)}" placeholder="${esc(s.tt(TX.search))}" autocomplete="off"></label>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.allFamilies))}</span><select data-k="family"><option value="">${esc(s.tt(TX.allFamilies))}</option>${families.map(f => `<option value="${esc(f)}"${s.family === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
    <div data-results>${resultsHtml(s)}</div></div>`;
}

/** Les résultats : leur nombre, les missions groupées par famille, sept lignes puis « N autres » ; seuls redessinés pendant la
 *  frappe (le champ de recherche reste en place, avec son curseur). */
function resultsHtml(s) {
  const hits = filtered(s),
    shown = s.all ? hits : hits.slice(0, ROWS),
    row = r => {
      const f = s.flown.get(r.id);
      return `<button type="button" class="f-item" data-id="${esc(r.id)}"><span><b>${esc(r.id)}</b> ${esc(r.title)}</span><span class="f-muted">${esc([r.originIcao && r.destinationIcao ? `${r.originIcao} → ${r.destinationIcao}` : r.originIcao, r.types[0], hmm(r.blockMin)].filter(Boolean).join(' · '))}${f !== undefined ? ` <span class="f-badge" data-kind="ok" data-flown>${esc(s.tt(TX.flown, { d: day(f) }))}</span>` : ''}</span></button>`;
    };
  let fam = '',
    body = '';
  for (const r of shown) {
    if (r.family !== fam) body += `<h3 class="f-muted" data-family="${esc(fam = r.family)}">${esc(fam)}</h3>`;
    body += row(r);
  }
  return `<p class="f-muted" data-count>${esc(s.tt(TX.count, { n: hits.length }))}</p>
    <div class="f-list" data-list>${hits.length ? body : `<p class="f-muted">${esc(s.tt(TX.noHit))}</p>`}</div>
    ${hits.length > shown.length ? `<button type="button" class="f-linkbtn" data-do="more">${esc(s.tt(TX.more, { n: hits.length - shown.length }))}</button>` : ''}`;
}

/** Redessine les résultats seuls (frappe, famille, « N autres », comptes rendus lus) ; la liste entière si elle n'est pas là. */
function results(s) {
  const box = s.el.querySelector('[data-results]');
  if (box) box.innerHTML = resultsHtml(s);
  else if (!s.open) draw(s);
}

/** La mission choisie : un résumé plat (titre, trajet, appareil, bloc estimé, résumé, notes), « Préparer ce vol », « Retour ». */
function missionHtml(s) {
  const {
    row: r,
    mission: m,
    drawn
  } = s.open,
    dl = (k, v) => v ? `<dt>${esc(s.tt(k))}</dt><dd>${esc(v)}</dd>` : '',
    dep = m?.origin?.name || r.origin,
    arr = m?.destination?.name || r.destination;
  return `<div class="f-card" data-pane="mission" data-id="${esc(r.id)}">${drawn ? `<p class="f-badge" data-kind="accent" data-drawn>${esc(s.tt(TX.drawn))}</p>` : ''}
    <h2><b>${esc(r.id)}</b> ${esc(m?.title || r.title)}</h2>
    <dl class="f-dl">${dl(TX.operation, r.operation)}${dl(TX.route, [dep, arr].filter(Boolean).join(' → '))}${dl(TX.aircraft, (m?.aircraft || []).map(a => a.type).filter(Boolean).join(', ') || r.types.join(', '))}${dl(TX.block, hmm(m?.estimate?.blockMin || r.blockMin))}</dl>
    ${m === null ? `<p class="f-muted">${esc(s.tt(TX.unread))}</p>` : ''}
    ${m?.summary ? `<p data-summary>${esc(m.summary)}</p>` : ''}
    ${m?.notes?.length ? `<h3>${esc(s.tt(TX.notes))}</h3><ul>${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <div class="f-row"><a class="f-btn primary" data-do="prepare" href="#fuel?mission=${encodeURIComponent(r.id)}">${esc(s.tt(TX.prepare))}</a>${drawn ? `<button type="button" data-do="draw">${esc(s.tt(TX.drawAgain))}</button>` : ''}<button type="button" data-do="back">${esc(s.tt(TX.back))}</button></div></div>`;
}

/** Ouvre une mission : son fichier lu (le registre suffit s'il ne se lit pas). */
async function openMission(s, row, drawn = false) {
  const doc = await yaml(await Promise.resolve(s.ctx.data.get(`missions/${row.folder}/${row.file}`)).catch(() => null));
  if (S !== s) return;
  s.open = {
    row,
    mission: MS.readMission(doc),
    drawn
  };
  draw(s);
}

/** Saisie : la recherche et la famille filtrent la liste. */
function onInput(s, e) {
  const k = e.target?.dataset?.k;
  if (k !== 'q' && k !== 'family') return;
  s[k === 'q' ? 'q' : 'family'] = e.target.value;
  s.all = false;
  results(s);
}

/** Gestes : une ligne (Choisir), « Tirer au sort » / « Tirer encore », « N autres », « Retour ». */
function onClick(s, e) {
  const row = !s.open && e.target.closest('[data-id]');
  if (row) return openMission(s, s.rows.find(r => r.id === row.dataset.id));
  const b = e.target.closest('[data-do]');
  if (!b) return;
  switch (b.dataset.do) {
    case 'draw': {
      // parmi les missions du filtre que ce pilote n'a pas volées, au hasard, sans poids ; jamais un départ silencieux
      const pool = filtered(s).filter(r => !s.flown.has(r.id));
      if (!pool.length) return s.ctx.notify(s.tt(TX.allFlown), 'warn');
      return openMission(s, pool[Math.floor(Math.random() * pool.length)], true);
    }
    case 'more':
      s.all = true;
      return results(s);
    case 'back':
      s.open = null;
      return draw(s);
  }
}
