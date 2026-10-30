// V3 aircraft — les appareils de la compagnie dans l'application Maintenance (V3_SPECIFICATION § 10.34, lot A2 ; SPEC.md) :
// la flotte (airline/fleet.json) en liste avec ajouter / modifier / retirer, et les fiches de performances (sheets.js, déplacé
// de Fuel). Le registre en lecture suit dans son étape (SPEC.md § 8).
//
// Deux vues en onglets (le dernier choix gardé dans cache/aircraft/ui.json), une à la fois. Flotte : la liste (recherche, sept
// lignes puis « N autres », « Ajouter ») ou l'éditeur d'un appareil (deux groupes de champs, les changements dits avant
// l'écriture, « Enregistrer », « Retirer », « Retour »). Fiches : la liste par famille ou l'éditeur d'une fiche (#aircraft?sheet=<id>
// l'ouvre). Chaque écriture de la flotte relit le fichier juste avant et ne change qu'un appareil (fleet.js) : le module Site
// (collage de la page Flotte) écrit le même fichier, règle « record » des deux côtés (frame/INTEGRATION.md § 3, préfixe
// partagé). Une ligne d'état (cache/aircraft/status.json, frame/INTEGRATION.md § 10.0) dit le nombre d'appareils et de fiches.
import * as FL from './fleet.js';
import {
  createSheetsView,
  SHEETS_STYLE
} from './sheets.js';

export const meta = {
  id: 'aircraft',
  apps: ['maintenance'],
  level: 3,
  title: ['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves'],
  files: ['fleet.js', 'sheets.js', 'sheets_texts.js', 'perf_prompt.js', '../../frame/lib/clipboard.js', '../../frame/lib/dom.js'],
  reads: ['airline/', 'cache/aircraft/'],
  writes: [{
    prefix: 'airline/fleet.json',
    merge: 'record'
  }, {
    prefix: 'cache/aircraft/',
    policy: 'cache'
  }]
};

const FLEET = 'airline/fleet.json',
  UI = 'cache/aircraft/ui.json', // la vue choisie, gardée sur cet appareil
  STATUS = 'cache/aircraft/status.json'; // la ligne d'état lue par le cadre (frame/INTEGRATION.md § 10.0)
/** Lignes de la liste montrées avant « N autres » (au plus sept éléments par écran). */
const ROWS = 7;

const TX = {
  fleet: ['Flotte', 'Fleet', 'Flotte', 'Flota'],
  sheets: ['Fiches', 'Sheets', 'Datenblätter', 'Fichas'],
  statusCount: ['{n} appareils, {m} fiches', '{n} aircraft, {m} sheets', '{n} Luftfahrzeuge, {m} Datenblätter',
    '{n} aeronaves, {m} fichas'
  ],
  statusTodo: ['{k} types de la flotte sans fiche', '{k} fleet types without a sheet', '{k} Flottentypen ohne Datenblatt',
    '{k} tipos de la flota sin ficha'
  ],
  search: ['Rechercher (immatriculation, type, indicatif, base)', 'Search (registration, type, callsign, base)',
    'Suchen (Kennzeichen, Typ, Rufzeichen, Basis)', 'Buscar (matrícula, tipo, indicativo, base)'
  ],
  add: ['Ajouter', 'Add', 'Hinzufügen', 'Añadir'],
  none: ['Aucun appareil dans la flotte.', 'No aircraft in the fleet.', 'Kein Luftfahrzeug in der Flotte.',
    'Ninguna aeronave en la flota.'
  ],
  noHit: ['Aucun appareil ne correspond.', 'No aircraft matches.', 'Kein Luftfahrzeug passt.', 'Ninguna aeronave coincide.'],
  more: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  count: ['{n} appareils', '{n} aircraft', '{n} Luftfahrzeuge', '{n} aeronaves'],
  out: ['hors service', 'out of service', 'außer Dienst', 'fuera de servicio'],
  identity: ['Identité', 'Identity', 'Identität', 'Identidad'],
  operation: ['Exploitation', 'Operation', 'Betrieb', 'Operación'],
  registration: ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
  type: ['Type (code OACI)', 'Type (ICAO code)', 'Typ (ICAO-Code)', 'Tipo (código OACI)'],
  variant: ['Variante', 'Variant', 'Variante', 'Variante'],
  operator: ['Exploitant', 'Operator', 'Betreiber', 'Operador'],
  callsigns: ['Indicatifs (séparés par des virgules)', 'Callsigns (comma separated)', 'Rufzeichen (durch Kommas getrennt)',
    'Indicativos (separados por comas)'
  ],
  base: ['Base', 'Base', 'Basis', 'Base'],
  tactical: ['Numéro tactique', 'Tactical number', 'Taktische Nummer', 'Número táctico'],
  operational: ['En service', 'In service', 'In Dienst', 'En servicio'],
  location: ['Position (site) : {l} · {d}', 'Location (site): {l} · {d}', 'Standort (Website): {l} · {d}',
    'Ubicación (sitio): {l} · {d}'
  ],
  typeKnown: ['{t}', '{t}', '{t}', '{t}'],
  typeFree: ['Type absent de la base : gardé tel quel.', 'Type not in the database: kept as typed.',
    'Typ nicht in der Datenbank: so übernommen.', 'Tipo ausente de la base: se guarda tal cual.'
  ],
  changes: ['{n} champs changés : {l}', '{n} fields changed: {l}', '{n} Felder geändert: {l}', '{n} campos cambiados: {l}'],
  change1: ['1 champ changé : {l}', '1 field changed: {l}', '1 Feld geändert: {l}', '1 campo cambiado: {l}'],
  noChange: ['Aucun changement.', 'No change.', 'Keine Änderung.', 'Ningún cambio.'],
  save: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  retire: ['Retirer', 'Retire', 'Ausmustern', 'Retirar'],
  back: ['Retour', 'Back', 'Zurück', 'Volver'],
  needReg: ['Une immatriculation est nécessaire.', 'A registration is needed.', 'Ein Kennzeichen ist nötig.',
    'Se necesita una matrícula.'
  ],
  dupReg: ['{r} est déjà dans la flotte.', '{r} is already in the fleet.', '{r} ist bereits in der Flotte.', '{r} ya está en la flota.'],
  saved: ['{r} enregistré : il partira à la prochaine synchronisation.', '{r} saved: it will leave at the next synchronisation.',
    '{r} gespeichert: geht bei der nächsten Synchronisation hinaus.', '{r} guardado: saldrá en la próxima sincronización.'
  ],
  askRetire: ['Retirer {r} de la flotte ? Sa fiche de performances, s\'il en a une, est gardée.',
    'Retire {r} from the fleet? Its performance sheet, if it has one, is kept.',
    '{r} aus der Flotte nehmen? Sein Leistungsblatt, falls vorhanden, bleibt erhalten.',
    '¿Retirar {r} de la flota? Su ficha de rendimiento, si la tiene, se conserva.'
  ],
  retired: ['{r} retiré de la flotte.', '{r} retired from the fleet.', '{r} aus der Flotte genommen.', '{r} retirado de la flota.']
};

/** Le style du module (aucune feuille globale : les jetons et les classes du cadre, ces quelques règles en plus). */
const STYLE = `[data-module="aircraft"] .ac-head{align-items:center;gap:8px}
[data-module="aircraft"] .ac-head>button{margin-left:auto}
[data-module="aircraft"] .ac-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;width:100%;min-height:44px;text-align:left}
[data-module="aircraft"] .ac-group{border:0;padding:0;margin:0 0 12px;display:grid;gap:4px}
[data-module="aircraft"] .ac-group>legend{font-weight:600;padding:0;margin-bottom:4px}`;

let S = null;

/** Échappe un texte pour du HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));

/** Monte l'écran : la flotte et la vue gardée lues, la vue dessinée, la flotte suivie (un collage du module Site la change) ;
 *  les fiches sont lues en arrière-plan (la ligne d'état en a besoin même sur la vue Flotte). `#aircraft?sheet=<id>` ouvre
 *  l'éditeur de cette fiche. */
export async function mount(el, ctx) {
  const s = S = {
    el,
    ctx,
    tt: (row, v) => ctx.t(row, v),
    fleet: null,
    view: 'fleet',
    q: '',
    all: false,
    edit: null // { was: immatriculation d'origine ('' pour un ajout), draft }
  };
  s.sv = createSheetsView({
    ctx,
    body: () => S === s && s.view === 'sheets' ? s.el.querySelector('[data-sheets]') : null,
    gone: () => S !== s,
    back: () => {}, // retour à la liste des fiches : rien d'autre à refaire ici (l'aide suit l'état de la vue)
    changed: () => publishStatus(s) // fiches ou types de la flotte changés : la ligne d'état suit
  });
  const [fleet, ui] = await Promise.all([ctx.data.get(FLEET), Promise.resolve(ctx.data.get(UI)).catch(() => null)]);
  if (S !== s) return;
  s.fleet = fleet;
  // une fiche demandée par l'adresse (prise une fois, retirée de l'adresse par le cadre) ouvre les Fiches sur son éditeur
  s.openSheet = String(ctx.consume?.('sheet')?.sheet || '').trim();
  s.view = s.openSheet || ui?.view === 'sheets' ? 'sheets' : 'fleet';
  el.onclick = e => onClick(s, e);
  el.oninput = e => s.view === 'sheets' ? s.sv.onInput(e) : onInput(s, e);
  el.onchange = e => s.view === 'sheets' && s.sv.onChange(e);
  draw(s);
  s.sv.load().catch(() => {});
  s.stop = ctx.data.watch?.(FLEET, async () => {
    if (S !== s) return;
    s.fleet = await ctx.data.get(FLEET);
    if (S !== s) return;
    publishStatus(s);
    if (s.view === 'fleet' && !s.edit) draw(s); // l'éditeur ouvert garde sa saisie : l'écriture relira le fichier
  });
}

/** Démonte : la flotte et les fiches ne sont plus suivies. */
export function unmount() {
  S?.stop?.();
  S?.sv?.stop();
  S = null;
}

/** Publie la ligne d'état « N appareils, M fiches[, K types de la flotte sans fiche] » dans cache/aircraft/status.json (lue
 *  et montrée telle quelle par le cadre, frame/INTEGRATION.md § 10.0) ; rien tant que les fiches ne sont pas lues, rien d'écrit
 *  si la ligne n'a pas changé. Les écritures sont mises à la file. */
function publishStatus(s) {
  const c = s.sv.counts();
  if (!c.ready || S !== s) return;
  const v = {
      n: listOf(s).length,
      m: c.sheets,
      k: c.todo
    },
    fill = row => row.map(x => x.replace(/\{(\w+)\}/g, (_, k) => v[k])),
    count = fill(TX.statusCount),
    todo = fill(TX.statusTodo),
    lines = [{
      text: count.map((x, i) => c.todo ? `${x}, ${todo[i]}` : x),
      go: '#aircraft'
    }],
    json = JSON.stringify(lines);
  s.pub = (s.pub || Promise.resolve()).then(async () => {
    if (s.pubJson === json) return;
    s.pubJson = json;
    await s.ctx.data.put(STATUS, {
      schema: 1,
      updated_at: new Date().toISOString().slice(0, 19) + 'Z',
      lines
    }, {
      policy: 'cache'
    });
  }).catch(() => {
    s.pubJson = undefined; // écriture manquée : le prochain changement réécrit
  });
}

/** Passe d'une vue à l'autre (Flotte, Fiches) ; le choix est gardé sur cet appareil. */
function showView(s, view) {
  if (s.view === view) return;
  s.view = view;
  s.edit = null;
  Promise.resolve(s.ctx.data.put(UI, {
    view
  }, {
    policy: 'cache'
  })).catch(() => {});
  draw(s);
}

/** Les appareils de la flotte lue, triés par immatriculation. */
const listOf = s => [...(s.fleet?.aircraft || [])].filter(a => a?.registration).sort((a, b) => String(a.registration).localeCompare(String(
  b.registration)));

/** Dessine la vue en cours : les onglets, puis la liste ou l'éditeur de la flotte, ou les Fiches (dessinées par sheets.js). */
function draw(s) {
  s.ctx.helpAnchor?.(() => s.view === 'sheets' ? s.sv.editing() ? 'aircraft-sheet-edit' : 'aircraft-sheets' : s.edit ? 'aircraft-edit' :
    'aircraft-fleet');
  const tab = (v, label) => `<button type="button" data-view="${v}" aria-pressed="${s.view === v}">${esc(s.tt(label))}</button>`,
    tabs = s.edit ? '' : `<div class="f-tabs" role="group" aria-label="${esc(s.tt(meta.title))}">${tab('fleet', TX.fleet)}${tab('sheets', TX.sheets)}</div>`;
  s.el.innerHTML = `<style>${STYLE}${SHEETS_STYLE}</style><h1>${esc(s.tt(meta.title))}</h1>${tabs}${s.view === 'sheets' ? '<div data-sheets></div>' : s.edit ? editorHtml(s) : listHtml(s)}`;
  if (s.view === 'sheets') {
    const id = s.openSheet;
    s.openSheet = '';
    s.sv.render(id);
  } else if (s.edit) refreshEditor(s);
}

/** La liste : recherche, « Ajouter », sept lignes puis « N autres ». */
function listHtml(s) {
  const all = listOf(s),
    hits = all.filter(a => FL.matches(a, s.q)),
    shown = s.all ? hits : hits.slice(0, ROWS),
    row = a => `<button type="button" class="f-item ac-row" data-reg="${esc(a.registration)}"><span><b>${esc(a.registration)}</b> ${esc(a.type || '')}${a.variant ? ` <span class="f-muted">${esc(a.variant)}</span>` : ''}</span><span class="f-muted">${esc([(a.callsigns || []).join(' '), a.base].filter(Boolean).join(' · '))}${a.operational === false ? ` <span class="f-badge" data-kind="warn">${esc(s.tt(TX.out))}</span>` : ''}</span></button>`;
  return `<div class="f-card" data-pane="fleet"><div class="f-row ac-head"><b>${esc(s.tt(TX.fleet))}</b> <span class="f-muted" data-count>${esc(s.tt(TX.count, { n: all.length }))}</span><button type="button" class="primary" data-do="add">${esc(s.tt(TX.add))}</button></div>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.search))}</span><input type="search" data-k="q" value="${esc(s.q)}" placeholder="${esc(s.tt(TX.search))}" autocomplete="off"></label>
    <div class="f-list" data-list>${!all.length ? `<p class="f-muted">${esc(s.tt(TX.none))}</p>` : !hits.length ? `<p class="f-muted">${esc(s.tt(TX.noHit))}</p>` : shown.map(row).join('')}</div>
    ${hits.length > shown.length ? `<button type="button" class="f-linkbtn" data-do="more">${esc(s.tt(TX.more, { n: hits.length - shown.length }))}</button>` : ''}</div>`;
}

/** L'éditeur d'un appareil : deux groupes de champs, la ligne des changements, les gestes. */
function editorHtml(s) {
  const d = s.edit.draft,
    field = (k, label, extra = '') => `<label class="f-field">${esc(s.tt(label))}<input data-f="${k}" value="${esc(k === 'callsigns' ? (d.callsigns || []).join(', ') : d[k] ?? '')}"${extra} autocomplete="off"></label>`,
    old = s.edit.was ? listOf(s).find(a => a.registration === s.edit.was) : null;
  return `<div class="f-card" data-pane="edit"><fieldset class="ac-group"><legend>${esc(s.tt(TX.identity))}</legend>
      ${field('registration', TX.registration, ' autocapitalize="characters" spellcheck="false"')}
      ${field('type', TX.type, ' autocapitalize="characters" spellcheck="false"')}<small class="f-muted" data-typeinfo></small>
      ${field('variant', TX.variant)}${field('operator', TX.operator)}</fieldset>
    <fieldset class="ac-group"><legend>${esc(s.tt(TX.operation))}</legend>
      ${field('callsigns', TX.callsigns, ' autocapitalize="characters" spellcheck="false"')}${field('base', TX.base)}${field('tacticalNumber', TX.tactical)}
      <label class="f-check"><input type="checkbox" data-f="operational"${d.operational === false ? '' : ' checked'}>${esc(s.tt(TX.operational))}</label>
      ${old?.location ? `<p class="f-muted">${esc(s.tt(TX.location, { l: old.location, d: old.locationAt ? String(old.locationAt).slice(0, 10) : '' }))}</p>` : ''}</fieldset>
    <p class="f-muted" data-changes aria-live="polite"></p>
    <div class="f-row"><button type="button" class="primary" data-do="save">${esc(s.tt(TX.save))}</button>${s.edit.was ? `<button type="button" data-do="retire">${esc(s.tt(TX.retire))}</button>` : ''}<button type="button" data-do="back">${esc(s.tt(TX.back))}</button></div></div>`;
}

/** Les libellés des champs, pour la ligne des changements. */
const LABELS = {
  registration: TX.registration,
  type: TX.type,
  variant: TX.variant,
  operator: TX.operator,
  callsigns: TX.callsigns,
  base: TX.base,
  tacticalNumber: TX.tactical,
  operational: TX.operational
};

/** Le brouillon de l'éditeur, lu des champs. */
function readForm(s) {
  const d = {
    ...s.edit.draft
  };
  for (const el of s.el.querySelectorAll('[data-f]')) d[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
  return FL.normalize(d);
}

/** La ligne des changements et ce que la base dit du type (son nom, ou « absent de la base » : gardé, jamais refusé). */
async function refreshEditor(s) {
  const d = readForm(s),
    old = s.edit.was ? listOf(s).find(a => a.registration === s.edit.was) : {},
    ch = FL.changed(old || {}, d),
    line = s.el.querySelector('[data-changes]'),
    short = k => s.tt(LABELS[k]).replace(/\s*\(.*\)$/, '');
  if (line) line.textContent = !ch.length ? s.tt(TX.noChange) : s.tt(ch.length === 1 ? TX.change1 : TX.changes, {
    n: ch.length,
    l: ch.map(short).join(', ')
  });
  const info = s.el.querySelector('[data-typeinfo]');
  if (!info) return;
  if (!d.type) return info.textContent = '';
  const A = await Promise.resolve().then(() => s.ctx.aerodb?.aircraft?.()).catch(() => null),
    hit = A?.searchTypes ? (await Promise.resolve(A.searchTypes(d.type, 5)).catch(() => []) || []).find(x => String(x.code || x.type || x
      .icao ||
      '').toUpperCase() === d.type) : null,
    label = hit ? String(A.label?.(d.type) || hit.name || hit.label || d.type) : '';
  if (S !== s || !s.edit || readForm(s).type !== d.type) return;
  info.textContent = hit ? s.tt(TX.typeKnown, {
    t: label
  }) : s.tt(TX.typeFree);
}

/** Saisie : la recherche de la liste, ou un champ de l'éditeur (la ligne des changements suit). */
function onInput(s, e) {
  if (e.target.dataset.k === 'q') {
    s.q = e.target.value;
    s.all = false;
    const box = s.el.querySelector('[data-pane="fleet"]'),
      at = e.target.selectionStart;
    if (box) box.outerHTML = listHtml(s);
    const q = s.el.querySelector('[data-k="q"]');
    q?.focus();
    q?.setSelectionRange(at, at);
    return;
  }
  if (e.target.dataset.f && s.edit) refreshEditor(s);
}

/** Gestes : ouvrir une ligne, ajouter, « N autres », enregistrer, retirer, revenir. */
async function onClick(s, e) {
  const tab = e.target.closest('[data-view]');
  if (tab) return showView(s, tab.dataset.view);
  if (s.view === 'sheets') return s.sv.onClick(e);
  const row = e.target.closest('[data-reg]');
  if (row && !s.edit) {
    const a = listOf(s).find(x => x.registration === row.dataset.reg);
    s.edit = {
      was: a.registration,
      draft: FL.normalize(a)
    };
    return draw(s);
  }
  const b = e.target.closest('[data-do]');
  if (!b) return;
  switch (b.dataset.do) {
    case 'add':
      s.edit = {
        was: '',
        draft: FL.normalize({})
      };
      draw(s);
      return s.el.querySelector('[data-f="registration"]')?.focus();
    case 'more':
      s.all = true;
      return draw(s);
    case 'back':
      s.edit = null;
      return draw(s);
    case 'save':
      return save(s);
    case 'retire':
      return retire(s);
  }
}

/** Enregistre l'appareil de l'éditeur : immatriculation exigée et unique, fichier relu juste avant, un seul appareil changé. */
async function save(s) {
  const d = readForm(s),
    by = s.ctx.identity?.trigram || '';
  if (!d.registration) return s.ctx.notify(s.tt(TX.needReg), 'warn');
  const file = await s.ctx.data.get(FLEET),
    taken = (file?.aircraft || []).some(a => String(a?.registration || '').toUpperCase() === d.registration);
  if (taken && d.registration !== s.edit.was) return s.ctx.notify(s.tt(TX.dupReg, {
    r: d.registration
  }), 'warn');
  const next = FL.upsert(file, d, {
    was: s.edit.was,
    by
  });
  await s.ctx.data.put(FLEET, next);
  if (S !== s) return;
  s.fleet = next;
  s.edit = null;
  draw(s);
  publishStatus(s);
  s.ctx.notify(s.tt(TX.saved, {
    r: d.registration
  }), 'ok');
}

/** Retire l'appareil de l'éditeur, après la question (sa fiche, s'il en a une, est gardée). */
async function retire(s) {
  const r = s.edit.was;
  if (!r || !await s.ctx.ask(s.tt(TX.askRetire, {
      r
    }), {
      ok: s.tt(TX.retire)
    })) return;
  const next = FL.retire(await s.ctx.data.get(FLEET), r, {
    by: s.ctx.identity?.trigram || ''
  });
  await s.ctx.data.put(FLEET, next);
  if (S !== s) return;
  s.fleet = next;
  s.edit = null;
  draw(s);
  publishStatus(s);
  s.ctx.notify(s.tt(TX.retired, {
    r
  }), 'ok');
}
