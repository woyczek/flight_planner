// V3 missions — les missions de la compagnie (modules/missions/SPEC.md § 1–4, lot 2 réduit du 31 octobre 2026) : la liste des missions
// communes du dépôt par famille, une recherche et un filtre de famille, « Choisir » (un résumé plat de la mission), « Tirer au sort »
// parmi celles que le pilote n'a pas encore volées, et « Préparer ce vol » par la porte de Carburant (#fuel?mission=<id>). Le module lit,
// n'écrit rien : les missions ont un seul auteur (le CPCO de la V2), le vol est écrit par Carburant. Pas encore : l'enveloppe, le lecteur
// page à page, l'affectation (§ 5–6).
import * as MS from '../../frame/lib/mission.js';

export const meta = {
  id: 'missions',
  apps: ['company'], // l'application Compagnie (?app=company), seule (décision de l'utilisateur, 1er nov. 2026)
  level: 1,
  title: ['Missions', 'Missions', 'Missionen', 'Misiones'],
  files: ['../../frame/lib/mission.js', '../../frame/lib/js-yaml.min.js'],
  reads: ['missions/', 'cr/'], // les missions et leur registre ; les comptes rendus (« volée le … »)
  // titre lisible d'un fichier de mission en attente de synchronisation (la carte Synchronisation des Réglages, Simplification 1er nov.
  // 2026) : « A-001A Titre » (le titre lu dans le texte YAML, sans le lire en entier) ; [fr, en, de, es], ou null ; pur, sans lecture
  titleOf: (path, v) => {
    const m = /^missions\/.+\/mission([A-Za-z0-9-]+)\.yaml$/.exec(path);
    if (!m || typeof v !== 'string') return null;
    const t = /^title:\s*["']?(.*?)["']?\s*$/m.exec(v)?.[1] || '',
      s = `${m[1]}${t ? ` ${t}` : ''}`;
    return [s, s, s, s];
  },
  writes: []
};

const REGISTRY = 'missions/mission_registry.yaml',
  ROWS = 7; // lignes montrées avant « N autres » (sept éléments au plus par écran)

const TX = {
  search: ['Rechercher une mission', 'Search a mission', 'Mission suchen', 'Buscar una misión'],
  // ce que la recherche lit, écrit sous le champ (SOG-0009)
  searchHint: ['Identifiant, titre, terrain (code OACI), type d’appareil, indicatif (SAMU66), activité (MEDEVAC, HEMS, SAMU…).',
    'Id, title, aerodrome (ICAO code), aircraft type, callsign (SAMU66), activity (MEDEVAC, HEMS, SAMU…).',
    'ID, Titel, Flugplatz (ICAO-Code), Luftfahrzeugtyp, Rufzeichen (SAMU66), Tätigkeit (MEDEVAC, HEMS, SAMU…).',
    'Id, título, aeródromo (código OACI), tipo de aeronave, indicativo (SAMU66), actividad (MEDEVAC, HEMS, SAMU…).'
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
  // le fichier d'une mission qui ne donne pas la mission, par cause (Simplification, 1er nov. : « beaucoup de missions sans fichiers ») ;
  // seul le registre est alors montré
  missing: ['Fichier de la mission introuvable ({p}) : seul le registre est montré.',
    'Mission file not found ({p}): only the registry is shown.',
    'Missionsdatei nicht gefunden ({p}): nur das Register wird gezeigt.',
    'Archivo de la misión no encontrado ({p}): solo se muestra el registro.'
  ],
  late: [
    'Fichier de la mission pas encore sur l’appareil (synchronisation) : seul le registre est montré, la mission s’affiche dès qu’il arrive.',
    'Mission file not on this device yet (synchronisation): only the registry is shown, the mission appears as soon as it arrives.',
    'Missionsdatei noch nicht auf dem Gerät (Synchronisierung): nur das Register wird gezeigt, die Mission erscheint, sobald sie ankommt.',
    'Archivo de la misión aún no está en el dispositivo (sincronización): solo se muestra el registro; la misión aparece en cuanto llegue.'
  ],
  unreadable: ['Fichier de la mission illisible ({e}) : seul le registre est montré.',
    'Mission file unreadable ({e}): only the registry is shown.',
    'Missionsdatei unlesbar ({e}): nur das Register wird gezeigt.',
    'Archivo de la misión ilegible ({e}): solo se muestra el registro.'
  ],
  badPath: ['chemin refusé dans le registre', 'path refused in the registry', 'Pfad im Register abgelehnt',
    'ruta rechazada en el registro'
  ],
  noIdType: ['mission.id ou mission.type absent', 'mission.id or mission.type missing', 'mission.id oder mission.type fehlt',
    'falta mission.id o mission.type'
  ],
  regLate: ['Registre des missions pas encore sur l’appareil (synchronisation) : la liste s’affiche dès qu’il arrive.',
    'Mission registry not on this device yet (synchronisation): the list appears as soon as it arrives.',
    'Missionsregister noch nicht auf dem Gerät (Synchronisierung): die Liste erscheint, sobald es ankommt.',
    'Registro de misiones aún no está en el dispositivo (sincronización): la lista aparece en cuanto llegue.'
  ],
  regLoading: ['Lecture du registre des missions…', 'Reading the mission registry…', 'Missionsregister wird gelesen…',
    'Leyendo el registro de misiones…'
  ],
  regUnreadable: ['Registre des missions illisible ({e}).', 'Mission registry unreadable ({e}).', 'Missionsregister unlesbar ({e}).',
    'Registro de misiones ilegible ({e}).'
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
const WAIT_MS = 8000; // attente d'un fichier pas encore sur l'appareil, au-delà : « pas encore sur l'appareil », la lecture continue

/** Un fichier YAML du dépôt, lu en attendant le réseau s'il n'est pas encore sur l'appareil (data.get rendait null tout de suite :
 *  la plupart des missions se disaient « illisibles » sur un appareil neuf) : { doc } ; sinon { why: 'missing' } (le dépôt ne l'a
 *  pas), { why: 'unreadable', err } (YAML invalide), ou { why: 'late', later } au-delà de WAIT_MS (later : la même réponse, à
 *  l'arrivée du fichier). */
async function yamlFile(ctx, path) {
  const job = Promise.resolve().then(() => ctx.data.read(path, {
      wait: true
    })).then(r => r ? r.value ?? r.text ?? null : null).then(parse, e => ({
      why: 'unreadable',
      err: String(e?.message || e)
    })),
    late = Symbol('late'),
    first = await Promise.race([job, new Promise(res => setTimeout(() => res(late), WAIT_MS))]);
  return first === late ? {
    why: 'late',
    later: job
  } : first;
}
/** Le document d'un texte YAML (js-yaml du cadre, chargé une fois) : { doc }, { why: 'missing' } sans texte, { why: 'unreadable', err }. */
async function parse(text) {
  if (text && typeof text === 'object') return {
    doc: text
  };
  if (typeof text !== 'string' || !text.trim()) return {
    why: 'missing'
  };
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    return {
      doc: globalThis.jsyaml.load(text)
    };
  } catch (e) {
    return {
      why: 'unreadable',
      err: String(e?.message || e).split('\n')[0].slice(0, 120)
    };
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
    open: null, // { row, mission, drawn, why, err } : la mission choisie
    regWhy: {
      why: 'loading'
    } // le registre pas encore lu, en retard ou illisible ; null une fois lu
  };
  el.onclick = e => onClick(s, e);
  el.oninput = e => onInput(s, e);
  el.onchange = e => onInput(s, e);
  draw(s);
  let got = await yamlFile(ctx, REGISTRY);
  if (S !== s) return;
  if (got.why === 'late') {
    s.regWhy = got;
    draw(s);
    got = await got.later; // le registre arrivé : la liste
    if (S !== s) return;
  }
  s.regWhy = got.why ? got : null;
  s.rows = MS.readRegistry(got.doc).filter(r => !r.organisation).sort((a, b) => b.id.localeCompare(a.id)); // les séries récentes d'abord
  if (!s.open) draw(s);
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
const filtered = s => s.rows.filter(r => (!s.family || r.family === s.family) && (!s.q || [r.id, r.title, r.operation, r.family, r.kind,
  r.subtype, ...r.callsigns, ...r.words, r.originIcao, r.destinationIcao, r.origin, r
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
  const w = s.regWhy;
  if (!s.rows.length) return `<div class="f-card"><p class="f-muted" data-why="${esc(w?.why || 'none')}">${esc(w?.why === 'loading' ? s.tt(TX.regLoading) : w?.why === 'late' ? s.tt(TX.regLate) : w?.why === 'unreadable' ? s.tt(TX.regUnreadable, { e: w.err }) : s.tt(TX.none))}</p></div>`;
  const families = [...new Set(s.rows.map(r => r.family).filter(Boolean))].sort();
  return `<div class="f-card" data-pane="list"><div class="f-row"><button type="button" class="primary" data-do="draw">${esc(s.tt(TX.draw))}</button></div>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.search))}</span><input type="search" data-k="q" value="${esc(s.q)}" placeholder="${esc(s.tt(TX.search))}" autocomplete="off"><small class="f-muted" data-searchhint>${esc(s.tt(TX.searchHint))}</small></label>
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
    ${s.open.why ? `<p class="f-muted" data-why="${esc(s.open.why)}">${esc(s.open.why === 'late' ? s.tt(TX.late) : s.open.why === 'missing' ? s.tt(TX.missing, { p: `missions/${r.folder}/${r.file}` }) : s.tt(TX.unreadable, { e: s.open.err || s.tt(TX.noIdType) }))}</p>` : ''}
    ${m?.summary ? `<p data-summary>${esc(m.summary)}</p>` : ''}
    ${m?.notes?.length ? `<h3>${esc(s.tt(TX.notes))}</h3><ul>${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <div class="f-row"><a class="f-btn primary" data-do="prepare" href="#fuel?mission=${encodeURIComponent(r.id)}">${esc(s.tt(TX.prepare))}</a>${drawn ? `<button type="button" data-do="draw">${esc(s.tt(TX.drawAgain))}</button>` : ''}<button type="button" data-do="back">${esc(s.tt(TX.back))}</button></div></div>`;
}

/** Ouvre une mission : son fichier lu (le registre suffit s'il ne vient pas, la cause dite) ; un fichier en retard est repris
 *  à son arrivée si la mission est encore ouverte. */
async function openMission(s, row, drawn = false) {
  // un chemin que le registre donnait pas sûr (readRegistry l'a vidé) : jamais lu, dit
  const got = row.folder && row.file ? await yamlFile(s.ctx, `missions/${row.folder}/${row.file}`) : {
    why: 'unreadable',
    err: s.tt(TX.badPath)
  };
  if (S !== s) return;
  const show = g => {
    const mission = g.doc ? MS.readMission(g.doc) : null;
    s.open = {
      row,
      mission,
      drawn,
      why: g.why || (mission ? '' : 'unreadable'), // un YAML lu sans mission.id ni mission.type : illisible, sans autre message
      err: g.err || ''
    };
    draw(s);
  };
  show(got);
  if (got.why === 'late') got.later.then(g => S === s && s.open?.row === row && show(g));
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
