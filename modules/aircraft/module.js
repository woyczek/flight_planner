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
  createSuggestList
} from '../fuel/suggest.js'; // la liste de propositions sous un champ (celle des terrains de Carburant)
import {
  createSheetsView,
  SHEETS_STYLE
} from './sheets.js';
import * as MC from '../../frame/lib/mission_categories.js'; // la compagnie dite comme Réglages la dit (SOG-0190, même source que SOG-0181)

export const meta = {
  id: 'aircraft',
  // SOG-0231 (l'utilisateur, 10 nov. : « 2 entrées » de Compagnie) : la Flotte s'ouvre aussi depuis Compagnie (#aircraft?view=fleet),
  // les Fiches restent dans Maintenance (#aircraft?view=sheets) ; les entrées sont celles du cadre (frame/app.js APPS)
  apps: ['maintenance', 'company'],
  level: 3,
  title: ['Aéronefs', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves'],
  files: ['fleet.js', 'sheets.js', 'sheets_texts.js', 'perf_prompt.js', '../fuel/suggest.js', '../../frame/lib/clipboard.js',
    '../../frame/lib/dom.js', '../../frame/lib/fuel_units.js', '../stats/phases.js', '../stats/journals.js',
    '../../frame/lib/mission_categories.js', '../../frame/lib/airline.js'
  ],
  // titre lisible d'un document en attente de synchronisation (la carte Synchronisation des Réglages, Simplification 1er nov. 2026) :
  // une fiche (aircraft/sheets/<id>.json) ou la flotte ; [fr, en, de, es], ou null (valeur absente ou illisible) ; pur, sans lecture
  titleOf: (path, v) => {
    const m = /^aircraft\/sheets\/([^/]+)\.json$/.exec(path);
    if (m) {
      if (!v || typeof v !== 'object') return null;
      const n = String(v.name || v.id || m[1]);
      return [`Fiche ${n}`, `Sheet ${n}`, `Datenblatt ${n}`, `Ficha ${n}`];
    }
    // la flotte de la compagnie courante (§ 10.38) : airline/fleet.json, airline/<code>/fleet.json ou celle de « personnel »
    if (!/^(airline\/([a-z0-9]{2,8}\/)?|pilot\/[^/]+\/airline\/perso\/)fleet\.json$/.test(path) || !Array.isArray(v?.aircraft))
      return null;
    const n = v.aircraft.length;
    return [`Flotte de la compagnie (${n} aéronefs)`, `Airline fleet (${n} aircraft)`, `Flotte der Gesellschaft (${n} Luftfahrzeuge)`,
      `Flota de la compañía (${n} aeronaves)`
    ];
  },
  reads: ['airline/', 'pilot/', 'cache/aircraft/'],
  // « Depuis le dossier Output » (SOG-0052 étape 2) : le travail stats/output d'AeroDB (status, set, clear, read), comme fetchProcedures
  launcher: {
    routes: ['regen/job', 'regen/job/cancel'],
    read: []
  },
  // la flotte de la compagnie courante (§ 10.38) : airline/<code>/fleet.json, ou pilot/<trigramme>/airline/perso/fleet.json pour
  // « personnel » ; mêmes préfixes et même fusion que Réglages (airline/) et Carburant (pilot/)
  writes: [{
    prefix: 'airline/',
    merge: 'record'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/aircraft/',
    policy: 'cache'
  }]
};

const FLEET = 'airline/fleet.json', // la flotte d'avant § 10.38 (sans index des compagnies) ; sinon fleetPathOf()
  UI = 'cache/aircraft/ui.json', // la vue choisie, gardée sur cet appareil
  STATUS = 'cache/aircraft/status.json'; // la ligne d'état lue par le cadre (frame/INTEGRATION.md § 10.0)
/** Lignes de la liste montrées avant « N autres » (au plus sept éléments par écran). */
const ROWS = 7;

const TX = {
  fleet: ['Flotte', 'Fleet', 'Flotte', 'Flota'],
  fleetOf: ['Flotte de {a}', 'Fleet of {a}', 'Flotte von {a}', 'Flota de {a}'], // SOG-0190 : « Flotte de SO Group · Escadrille SO »
  sheets: ['Fiches', 'Sheets', 'Datenblätter', 'Fichas'],
  statusCount: ['{n} aéronefs, {m} fiches', '{n} aircraft, {m} sheets', '{n} Luftfahrzeuge, {m} Datenblätter',
    '{n} aeronaves, {m} fichas'
  ],
  statusTodo: ['{k} types de la flotte sans fiche', '{k} fleet types without a sheet', '{k} Flottentypen ohne Datenblatt',
    '{k} tipos de la flota sin ficha'
  ],
  search: ['Rechercher (immatriculation, type, indicatif, base)', 'Search (registration, type, callsign, base)',
    'Suchen (Kennzeichen, Typ, Rufzeichen, Basis)', 'Buscar (matrícula, tipo, indicativo, base)'
  ],
  add: ['Ajouter', 'Add', 'Hinzufügen', 'Añadir'],
  none: ['Aucun aéronef dans la flotte.', 'No aircraft in the fleet.', 'Kein Luftfahrzeug in der Flotte.',
    'Ninguna aeronave en la flota.'
  ],
  noHit: ['Aucun aéronef ne correspond.', 'No aircraft matches.', 'Kein Luftfahrzeug passt.', 'Ninguna aeronave coincide.'],
  // SOG-0269 : « Créer F-BHHH » sous « Aucun aéronef ne correspond » ; SOG-0271 : la recherche chez un tiers, un lien qui ouvre un onglet
  createReg: ['Créer {reg}', 'Create {reg}', '{reg} anlegen', 'Crear {reg}'],
  searchRz: ['Rechercher sur rzjets.net', 'Search on rzjets.net', 'Auf rzjets.net suchen', 'Buscar en rzjets.net'],
  searchRzHint: ['Ouvre le site dans un nouvel onglet ; revenez saisir le type.',
    'Opens the site in a new tab; come back to enter the type.',
    'Öffnet die Seite in einem neuen Tab; kommen Sie zurück, um den Typ einzugeben.',
    'Abre el sitio en una pestaña nueva; vuelva para escribir el tipo.'
  ],
  more: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  count: ['{n} aéronefs', '{n} aircraft', '{n} Luftfahrzeuge', '{n} aeronaves'],
  count1: ['{n} aéronef', '{n} aircraft', '{n} Luftfahrzeug',
    '{n} aeronave'
  ], // au singulier : 0 et 1 en français, 1 ailleurs (countText)
  out: ['hors service', 'out of service', 'außer Dienst', 'fuera de servicio'],
  identity: ['Identité', 'Identity', 'Identität', 'Identidad'],
  operation: ['En vol', 'In flight', 'Im Flug',
    'En vuelo'
  ], // SOG-0268 : « Exploitation » ne disait rien (et ressemblait à « Exploitant »)
  registration: ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
  type: ['Type (code OACI)', 'Type (ICAO code)', 'Typ (ICAO-Code)', 'Tipo (código OACI)'],
  variant: ['Variante', 'Variant', 'Variante', 'Variante'],
  operator: ['Propriétaire ou exploitant', 'Owner or operator', 'Eigentümer oder Betreiber', 'Propietario u operador'],
  operatorHint: ['Celui qui exploite l’aéronef : une compagnie, un aéroclub, un particulier.',
    'Who operates the aircraft: an airline, a flying club, a private owner.',
    'Wer das Luftfahrzeug betreibt: eine Fluggesellschaft, ein Fliegerclub, eine Privatperson.',
    'Quien explota la aeronave: una compañía, un aeroclub, un particular.'
  ],
  callsignsHint: ['Les indicatifs sous lesquels cet aéronef vole (par exemple AFR1234, SAMU66) : ils servent à retrouver ses vols.',
    'The callsigns this aircraft flies under (for example AFR1234, SAMU66): they are used to find its flights.',
    'Die Rufzeichen, unter denen dieses Luftfahrzeug fliegt (zum Beispiel AFR1234, SAMU66): Sie dienen dazu, seine Flüge zu finden.',
    'Los indicativos con los que vuela esta aeronave (por ejemplo AFR1234, SAMU66): sirven para encontrar sus vuelos.'
  ],
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
  // complétion du type (Simplification, 1er nov. : « aucune complétion sur le type ») : la base des types et les fiches
  typeSheet: ['fiche {id}', 'sheet {id}', 'Datenblatt {id}', 'ficha {id}'],
  typeList: ['Types proposés', 'Suggested types', 'Vorgeschlagene Typen', 'Tipos propuestos'],
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
  retired: ['{r} retiré de la flotte.', '{r} retired from the fleet.', '{r} aus der Flotte genommen.', '{r} retirado de la flota.'],
  // SOG-0270 : le registre français des immatriculations (verbe aircraft/registry d'AeroDB, lu sur ce poste ; aucun nom de personne)
  regLine: ['{reg} : {type} (registre français, données du {date})', '{reg}: {type} (French register, data of {date})',
    '{reg}: {type} (französisches Register, Stand {date})', '{reg}: {type} (registro francés, datos del {date})'
  ],
  regNoMaker: ['{model} · constructeur non précisé', '{model} · maker not given', '{model} · Hersteller nicht angegeben',
    '{model} · fabricante no indicado'
  ],
  regBase: ['attaché à {b}', 'based at {b}', 'Heimatflugplatz {b}', 'con base en {b}'],
  regSug: ['Type proposé : {t} — suggestion d’après le libellé du registre, à vérifier.',
    'Proposed type: {t} — a suggestion from the register\'s label, to check.',
    'Vorgeschlagener Typ: {t} — Vorschlag nach der Bezeichnung im Register, zu prüfen.',
    'Tipo propuesto: {t} — sugerencia según la denominación del registro, a comprobar.'
  ],
  regNoType: ['Type du registre non reconnu dans la base des types : à choisir.',
    'Register type not recognised in the type database: to choose.',
    'Typ des Registers in der Typendatenbank nicht erkannt: bitte wählen.',
    'Tipo del registro no reconocido en la base de tipos: a elegir.'
  ],
  regFrom: ['Registre français : {label}.', 'French register: {label}.', 'Französisches Register: {label}.',
    'Registro francés: {label}.'
  ],
  regSame: ['Créer à l’identique', 'Create as registered', 'Wie im Register anlegen', 'Crear igual que en el registro'],
  regAbsent: ['Registre français non déposé sur ce poste.', 'French register not deposited on this workstation.',
    'Französisches Register auf diesem Rechner nicht hinterlegt.', 'Registro francés no depositado en este equipo.'
  ],
  regDataLink: ['Le déposer dans Données', 'Deposit it in Data', 'In Daten hinterlegen', 'Depositarlo en Datos'],
  regSearch: ['Chercher dans le registre français (constructeur et modèle)', 'Search the French register (maker and model)',
    'Im französischen Register suchen (Hersteller und Modell)', 'Buscar en el registro francés (fabricante y modelo)'
  ],
  regNone: ['Aucune immatriculation de ce type au registre.', 'No registration of this type in the register.',
    'Kein Kennzeichen dieses Typs im Register.', 'Ninguna matrícula de este tipo en el registro.'
  ],
  regSource: ['{source}, données du {date}', '{source}, data of {date}', '{source}, Stand {date}', '{source}, datos del {date}'],
  regMore: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  regMorePlus: ['plus de {n} autres', 'more than {n} more', 'mehr als {n} weitere', 'más de {n} más']
};

/** Le style du module (aucune feuille globale : les jetons et les classes du cadre, ces quelques règles en plus). */
const STYLE = `[data-module="aircraft"] .ac-head{align-items:center;gap:8px}
[data-module="aircraft"] .ac-head{flex-wrap:wrap} /* « Ajouter » suit l'en-tête dans son flux, jamais seul à droite (SOG-0190) */
[data-module="aircraft"] .ac-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;width:100%;min-height:44px;text-align:left}
[data-module="aircraft"] .ac-group{position:relative;border:0;padding:0;margin:0 0 12px;display:grid;gap:4px}
[data-module="aircraft"] .ac-sug{position:absolute;left:0;right:0;max-width:26em;z-index:30;display:grid;gap:0;margin:0;background:var(--sog-surface);border:1px solid var(--sog-border);border-radius:var(--sog-radius);box-shadow:var(--sog-shadow)}
[data-module="aircraft"] .fu-sugitem{display:block;width:100%;min-height:44px;text-align:left;border-width:0 0 1px;border-radius:0;background:transparent}
[data-module="aircraft"] .fu-sugitem:last-child{border-bottom-width:0}
[data-module="aircraft"] .fu-sugitem[aria-selected="true"]{background:var(--sog-surface-2);box-shadow:inset 3px 0 0 var(--sog-accent)}
[data-module="aircraft"] .ac-group>legend{font-weight:600;padding:0;margin-bottom:4px}
[data-module="aircraft"] .ac-regline{display:grid;gap:4px;margin:8px 0}
[data-module="aircraft"] .ac-regline p{margin:0}
[data-module="aircraft"] .ac-regline>button{justify-self:start}
[data-module="aircraft"] .ac-regsearch{margin:0 0 12px;padding-bottom:12px;border-bottom:1px solid var(--sog-border)}
[data-module="aircraft"] .ac-regsearch .f-list{margin-top:4px}`;

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
    edit: null, // { was: immatriculation d'origine ('' pour un ajout), draft, rq (recherche du registre), rall, note }
    regs: new Map() // SOG-0270 : les réponses du registre de la séance, par question ({ wait } pendant l'appel)
  };
  s.sv = createSheetsView({
    ctx,
    body: () => S === s && s.view === 'sheets' ? s.el.querySelector('[data-sheets]') : null,
    gone: () => S !== s,
    back: () => {}, // retour à la liste des fiches : rien d'autre à refaire ici (l'aide suit l'état de la vue)
    changed: () => publishStatus(s) // fiches ou types de la flotte changés : la ligne d'état suit
  });
  s.fleetPath = await fleetPathOf();
  if (S !== s) return;
  const [fleet, ui] = await Promise.all([ctx.data.get(s.fleetPath), Promise.resolve(ctx.data.get(UI)).catch(() => null)]);
  if (S !== s) return;
  s.fleet = fleet;
  // une fiche demandée par l'adresse (prise une fois, retirée de l'adresse par le cadre) ouvre les Fiches sur son éditeur
  // et la vue demandée par l'entrée du cadre (SOG-0231 : ?view=fleet depuis Compagnie, ?view=sheets depuis Maintenance) : le module
  // n'en montre alors qu'une, sans la barre des deux vues ; sans elle (une ancienne adresse), comme avant
  const q = ctx.consume?.('sheet', 'view') || {};
  s.openSheet = String(q.sheet || '').trim();
  s.only = !s.openSheet && ['fleet', 'sheets'].includes(q.view) ? q.view : '';
  s.view = s.openSheet ? 'sheets' : s.only || (ui?.view === 'sheets' ? 'sheets' : 'fleet');
  // complétion du champ Type de l'éditeur : un choix écrit le code du type, puis rend au champ l'évènement input d'une frappe
  s.TS = createSuggestList({
    body: () => S === s ? s.el : null,
    box: '[data-typesug]',
    attr: 'code',
    idPrefix: 'ac-sug',
    fields: () => [s.el.querySelector('[data-f="type"]')],
    owns: x => x?.dataset?.f === 'type',
    write: (input, v) => {
      input.value = v;
      return true;
    }
  });
  el.addEventListener('keydown', e => s.view === 'fleet' && s.TS.onKey(e));
  el.addEventListener('focusout', e => s.TS.onFocusOut(e));
  for (const type of ['pointerdown', 'mousedown']) el.addEventListener(type, e => s.TS.onPointerDown(e));
  el.onclick = e => onClick(s, e);
  el.oninput = e => s.view === 'sheets' ? s.sv.onInput(e) : onInput(s, e);
  el.onchange = e => s.view === 'sheets' && s.sv.onChange(e);
  draw(s);
  coOf(s).then(() => S === s && s.view === 'fleet' && !s.edit && draw(s)); // la compagnie de la flotte, dans l'en-tête (SOG-0190)
  s.sv.load().catch(() => {});
  watchFleet(s);
  // § 10.38 : la compagnie courante change (Réglages › Compagnie) : sa flotte est relue et suivie, l'écran redessiné
  s.onAirline = async () => {
    if (S !== s) return;
    await coOf(s); // le nom ou le genre a pu changer sans changer de dossier
    if (S !== s) return;
    if (s.view === 'fleet' && !s.edit) draw(s);
    const path = await fleetPathOf();
    if (S !== s || path === s.fleetPath) return;
    s.unwatch?.();
    s.fleetPath = path;
    s.fleet = await ctx.data.get(path);
    if (S !== s) return;
    s.edit = null;
    watchFleet(s);
    publishStatus(s);
    if (s.view === 'fleet') draw(s);
  };
  window.addEventListener('frame-data-airline', s.onAirline);
}
/** Suit le fichier de flotte de la compagnie courante (relu et redessiné quand il change). */
function watchFleet(s) {
  const path = s.fleetPath;
  s.unwatch = s.ctx.data.watch?.(path, async () => {
    if (S !== s || s.fleetPath !== path) return;
    s.fleet = await s.ctx.data.get(path);
    if (S !== s) return;
    publishStatus(s);
    if (s.view === 'fleet' && !s.edit) draw(s); // l'éditeur ouvert garde sa saisie : l'écriture relira le fichier
  });
}
/** La compagnie de la flotte affichée, dite comme Réglages la dit (SOG-0190) : « SO Group · Escadrille SO », « Personnel » ; gardée
 *  dans s.co ('' sans FrameData.airline). */
async function coOf(s) {
  try {
    const a = typeof window.FrameData?.airline === 'function' ? await window.FrameData.airline() : null;
    s.co = a?.code ? MC.airlineText({
      code: String(a.code),
      name: typeof a.name === 'string' ? a.name.slice(0, 60) : '',
      kind: MC.kindOf(a)
    }, s.ctx.lang?.() || 'fr') : '';
  } catch {
    s.co = '';
  }
}
/** Le fichier de flotte de la compagnie courante (§ 10.38 étape 1) : le dossier que FrameData.airline() donne (« airline/ »,
 *  « airline/<code>/ » ou celui de « personnel ») ; airline/fleet.json sans FrameData.airline ou pour un dossier d'une autre forme
 *  (une entrée non fiable n'invente jamais un chemin). */
async function fleetPathOf() {
  try {
    const a = typeof window.FrameData?.airline === 'function' ? await window.FrameData.airline() : null,
      root = String(a?.root || '');
    return /^(airline\/([a-z0-9]{2,8}\/)?|pilot\/[A-Za-z0-9_-]{1,32}\/airline\/perso\/)$/.test(root) ? `${root}fleet.json` : FLEET;
  } catch {
    return FLEET;
  }
}

/** Démonte : la flotte et les fiches ne sont plus suivies. */
export function unmount() {
  S?.unwatch?.();
  if (S?.onAirline) window.removeEventListener('frame-data-airline', S.onAirline);
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
    tabs = s.edit || s.only ? '' : `<div class="f-tabs" role="group" aria-label="${esc(s.tt(meta.title))}">${tab('fleet', TX.fleet)}${tab('sheets', TX.sheets)}</div>`,
    // une seule vue (l'entrée du cadre l'a demandée) : son nom en titre
    title = s.only ? TX[s.only] : meta.title;
  s.el.innerHTML = `<style>${STYLE}${SHEETS_STYLE}</style><h1>${esc(s.tt(title))}</h1>${tabs}${s.view === 'sheets' ? '<div data-sheets></div>' : s.edit ? editorHtml(s) : listHtml(s)}`;
  if (s.view === 'sheets') {
    const id = s.openSheet;
    s.openSheet = '';
    s.sv.render(id);
  } else if (s.edit) refreshEditor(s);
}

/** Ce qui a été tapé dans la recherche, mis en forme d'immatriculation quand il en a la forme (« fbhhh » → « F-BHHH ») ; '' sinon. */
function regOfQuery(q) {
  const t = String(q || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,10}$/.test(t)) return '';
  if (t.includes('-') || /^N\d/.test(t)) return t; // déjà écrite ainsi, ou un N américain (sans tiret)
  return /^[A-Z]{5}$/.test(t) ? `${t[0]}-${t.slice(1)}` : t;
}
/** Sous « Aucun aéronef ne correspond » (SOG-0269, SOG-0271) : « Créer F-BHHH » (la fiche neuve, l'immatriculation remplie) et
 *  « Rechercher sur rzjets.net », un lien qui ouvre le site d'un tiers dans un nouvel onglet à l'adresse de l'immatriculation (geste du
 *  pilote ; la suite ne lit jamais ce site : ni lanceur, ni aspiration). '' sans saisie qui ait la forme d'une immatriculation. */
function noHitActions(s) {
  const reg = regOfQuery(s.q);
  if (!reg) return '';
  const url = `https://rzjets.net/aircraft/?registry=${encodeURIComponent(reg.replace(/-/g, ''))}`;
  regAsk(s, {
    reg
  });
  const line = regLineHtml(s, reg);
  return `${line}<div class="f-row ac-nohit"><button type="button"${line.includes('data-do="addreg"') ? '' : ' class="primary"'} data-do="addq" data-newreg="${esc(reg)}">${esc(s.tt(TX.createReg, { reg }))}</button><a class="f-linkbtn" data-rzjets href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.tt(TX.searchRzHint))}">${esc(s.tt(TX.searchRz))}</a></div>`;
}

/* ---- SOG-0270 : le registre français des immatriculations (AeroDB, verbe aircraft/registry, lecture seule) ----
 * Le verbe passe par regen/job (déjà déclaré par ce module : rien n'élargit l'accès du lanceur). Il ne rend aucun nom de personne :
 * immatriculation, constructeur, modèle, numéro de série, aérodrome d'attache (vide pour 55 % des lignes). Le type du registre est un
 * LIBELLÉ : rapproché de nos types par la base locale, dit « suggestion », jamais deviné (un type non reconnu se montre tel quel). Rien
 * n'est écrit hormis la fiche que le pilote enregistre lui-même. */

/** Une clé de question au registre ; null si la question n'a pas la forme que le verbe accepte (rien n'est alors demandé). */
function regKey(args) {
  if (args.reg) return /^[A-Z0-9 -]{2,12}$/.test(args.reg) ? `r:${args.reg.replace(/-/g, '')}` : null;
  const t = String(args.type || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return t.length >= 3 && t.length <= 60 && /^[\p{L}\p{N}_ .+/-]+$/u.test(t) ? `t:${t}` : null;
}
/** Un texte du registre, borné (le fichier est déposé par le pilote : une entrée non fiable). */
const regText = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
/** Une ligne du registre, gardée seulement si son immatriculation en a la forme ; les seuls champs du contrat. */
function regRow(r) {
  const reg = regText(r?.reg, 12).toUpperCase();
  if (!/^[A-Z0-9-]{2,12}$/.test(reg) || !regText(r.model, 60)) return null; // une ligne sans modèle ne dit rien d'utile
  return {
    reg,
    maker: regText(r.maker, 60),
    model: regText(r.model, 60),
    base: regText(r.base, 40)
  };
}
/** Demande au registre (une fois par question et par séance, 350 ms après la dernière frappe) ; le dessin suit la réponse. Sans
 *  lanceur, lanceur occupé ou réponse illisible : rien n'est dit (la question pourra être reposée). */
function regAsk(s, args) {
  const key = regKey(args);
  if (!key || s.regs.has(key) || typeof s.ctx.launcher?.job !== 'function') return;
  clearTimeout(s.regTimer);
  s.regTimer = setTimeout(async () => {
    if (S !== s || s.regs.has(key)) return;
    s.regs.set(key, {
      wait: true
    });
    let v = null;
    try {
      const r = await s.ctx.launcher.job('regen/job', {
        set: 'aircraft',
        verb: 'registry',
        args: {
          ...(args.reg ? {
            reg: args.reg
          } : {
            type: key.slice(2)
          }),
          limit: args.reg ? 5 : 50
        }
      });
      const x = r?.result;
      if (x && typeof x === 'object' && x.ok === true) v = x.absent === true ? {
        absent: true,
        rows: []
      } : {
        rows: (Array.isArray(x.rows) ? x.rows : []).slice(0, 200).map(regRow).filter(Boolean),
        source: regText(x.source, 80),
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(x.date || '')) ? x.date : '',
        truncated: x.truncated === true
      };
    } catch {
      v = null;
    }
    if (S !== s) return;
    if (!v) return s.regs.delete(key);
    if (args.reg) {
      const row = v.rows.find(x => x.reg.replace(/-/g, '') === args.reg.replace(/-/g, ''));
      if (row) row.sug = await typeOfRegistry(s, row);
    }
    if (S !== s) return;
    s.regs.set(key, v);
    regRedraw(s);
  }, 350);
}
/** Redessine ce que le registre a répondu, là où l'écran le montre encore (la ligne sous « Aucun aéronef », ou la recherche de
 *  l'éditeur). */
function regRedraw(s) {
  if (s.view !== 'fleet') return;
  if (!s.edit) {
    const reg = regOfQuery(s.q),
      line = s.el.querySelector('[data-regline]');
    if (reg && line) line.outerHTML = regLineHtml(s, reg);
    // le registre connaît l'immatriculation : « Créer à l'identique » est le geste premier, « Créer F-BHHH » (vide) passe en second
    s.el.querySelector('[data-do="addq"]')?.classList.toggle('primary', !s.el.querySelector('[data-do="addreg"]'));
    return;
  }
  const res = s.el.querySelector('[data-regres]');
  if (res) res.innerHTML = regResHtml(s);
}
/** La date du registre dite à la façon de la langue (« 01/10/2026 »), ou telle quelle. */
function regDate(s, d) {
  if (!d) return '?';
  try {
    return new Date(`${d}T00:00:00Z`).toLocaleDateString(s.ctx.lang?.() || 'fr', {
      timeZone: 'UTC'
    });
  } catch {
    return d;
  }
}
/** « CESSNA 172 S », le libellé du registre tel quel ; sans constructeur (le lecteur le vide quand moins de dix aéronefs le portent :
 *  un constructeur amateur est une personne), « RV-7 · constructeur non précisé » : jamais un libellé du constructeur seul. */
const regLabel = (s, row) => row.maker ? `${row.maker} ${row.model}`.trim() : s.tt(TX.regNoMaker, {
  model: row.model || '?'
});
/** Le type proposé pour une ligne du registre : le code de la base locale des types dont un mot du modèle (« 172 », « PA-28 »)
 *  est EXACTEMENT un mot du libellé du registre, et dont le nom porte le constructeur du registre ; un seul candidat, sinon '' (non
 *  reconnu : jamais deviné ; « SR22 » ne devient pas « SR22T »). */
async function typeOfRegistry(s, row) {
  const A = await Promise.resolve().then(() => s.ctx.aerodb?.aircraft?.()).catch(() => null);
  if (typeof A?.searchTypes !== 'function') return '';
  const fold = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    // les mots d'un libellé : chacun, et ses morceaux joints par leurs tirets (« PA-28-181 » → PA, PA28, PA28181)
    words = text => new Set(String(text || '').split(/[\s/]+/).flatMap(w => {
      const parts = w.split('-').filter(Boolean);
      return parts.map((_, i) => fold(parts.slice(0, i + 1).join('')));
    }).filter(w => /\d/.test(w) && w.length >= 2)),
    mine = words(row.model),
    maker = fold(String(row.maker || '').split(/\s+/)[0]), // un filtre seulement : le type se lit toujours dans le MODÈLE
    asks = [...new Set(String(row.model || '').split(/[\s/-]+/).map(fold).filter(w => /\d/.test(w) && w.length >= 2))],
    found = new Set();
  for (const q of asks) {
    const hits = await Promise.resolve().then(() => A.searchTypes(q, 20)).catch(() => []) || [];
    for (const h of Array.isArray(hits) ? hits : []) {
      const code = String(h?.code || '').toUpperCase(),
        label = String(h?.label || '').replace(/\s*\([A-Z0-9]{2,4}\)\s*$/, '');
      if (code && [...words(label)].some(w => mine.has(w)) && (!maker || maker.length < 3 || fold(label).includes(maker))) found.add(
        code);
    }
  }
  return found.size === 1 ? [...found][0] : '';
}
/** La ligne du registre sous « Aucun aéronef ne correspond » : « F-BHHH : CESSNA 172 S (registre français, données du …) », l'aérodrome
 *  d'attache seulement s'il est au registre, le type proposé (suggestion) ou « non reconnu », et « Créer à l'identique » ; « registre
 *  non déposé sur ce poste » et le lien vers Données quand le registre manque ; rien sinon. */
function regLineHtml(s, reg) {
  const v = s.regs.get(regKey({
    reg
  }));
  if (!v || v.wait) return '<div data-regline hidden></div>';
  if (v.absent) return `<p class="f-muted ac-regline" data-regline data-absent>${esc(s.tt(TX.regAbsent))} <a href="#data">${esc(s.tt(TX.regDataLink))}</a></p>`;
  const row = v.rows.find(x => x.reg.replace(/-/g, '') === reg.replace(/-/g, ''));
  if (!row) return '<div data-regline hidden></div>';
  const head = s.tt(TX.regLine, {
    reg: regOfQuery(row.reg) || row.reg,
    type: regLabel(s, row),
    date: regDate(s, v.date)
  }) + (row.base ? ` · ${s.tt(TX.regBase, { b: row.base })}` : '');
  return `<div class="ac-regline" data-regline title="${esc([v.source, v.date].filter(Boolean).join(', '))}"><p data-regsays>${esc(head)}</p><p class="f-muted" data-regsug>${esc(row.sug ? s.tt(TX.regSug, { t: row.sug }) : s.tt(TX.regNoType))}</p><button type="button" class="primary" data-do="addreg" data-newreg="${esc(reg)}">${esc(s.tt(TX.regSame))}</button></div>`;
}
/** Les immatriculations d'un type au registre (la recherche de l'éditeur d'un nouvel aéronef) : la source citée, sept lignes puis
 *  « n autres » ; « registre non déposé » ou « aucune » sinon. */
function regResHtml(s) {
  const key = regKey({
      type: s.edit?.rq || ''
    }),
    v = key ? s.regs.get(key) : null;
  if (!v || v.wait) return '';
  if (v.absent) return `<p class="f-muted" data-absent>${esc(s.tt(TX.regAbsent))} <a href="#data">${esc(s.tt(TX.regDataLink))}</a></p>`;
  if (!v.rows.length) return `<p class="f-muted" data-regnone>${esc(s.tt(TX.regNone))}</p>`;
  const shown = s.edit.rall ? v.rows : v.rows.slice(0, ROWS),
    rest = v.rows.length - shown.length,
    more = rest > 0 ? `<button type="button" class="f-linkbtn" data-do="regmore">${esc(s.tt(v.truncated ? TX.regMorePlus : TX.regMore, { n: rest }))}</button>` : '';
  return `<p class="f-muted" data-regsource>${esc(s.tt(TX.regSource, { source: v.source || '', date: regDate(s, v.date) }))}</p><div class="f-list">${shown.map((r, i) => `<button type="button" class="f-item ac-row" data-regpick="${i}"><span><b>${esc(r.reg)}</b> ${esc(regLabel(s, r))}</span><span class="f-muted">${esc(r.base)}</span></button>`).join('')}</div>${more}`;
}
/** Une fiche neuve remplie d'après une ligne du registre : l'immatriculation, le type proposé (vide s'il n'est pas reconnu), l'aérodrome
 *  d'attache s'il a la forme d'un indicateur OACI ; la note dit d'où cela vient. Rien n'est enregistré avant « Enregistrer ». */
function regFill(s, row, base = {}) {
  s.edit = {
    was: '',
    rq: s.edit?.rq || '',
    draft: FL.normalize({
      ...base,
      registration: regOfQuery(row.reg) || row.reg,
      type: row.sug || '',
      ...(/^[A-Z]{4}$/.test(row.base) ? {
        base: row.base
      } : {})
    }),
    note: {
      label: regLabel(s, row),
      sug: row.sug || ''
    }
  };
  draw(s);
  s.el.querySelector('[data-f="type"]')?.focus();
}
/** « 1 aéronef », « 0 aéronef », « 2 aéronefs » : le nombre et son nom, au singulier pour 0 et 1 en français, pour 1 seulement en
 *  anglais, en allemand et en espagnol (jamais « 0 aéronefs »). */
function countText(s, n) {
  const fr = (s.ctx.lang?.() || 'fr') === 'fr';
  return (fr ? n < 2 : n === 1) ? s.tt(TX.count1, {
    n
  }) : s.tt(TX.count, {
    n
  });
}
/** La liste : recherche, « Ajouter », sept lignes puis « N autres ». */
function listHtml(s) {
  const all = listOf(s),
    hits = all.filter(a => FL.matches(a, s.q)),
    shown = s.all ? hits : hits.slice(0, ROWS),
    row = a => `<button type="button" class="f-item ac-row" data-reg="${esc(a.registration)}"><span><b>${esc(a.registration)}</b> ${esc(a.type || '')}${a.variant ? ` <span class="f-muted">${esc(a.variant)}</span>` : ''}</span><span class="f-muted">${esc([(a.callsigns || []).join(' '), a.base].filter(Boolean).join(' · '))}${a.operational === false ? ` <span class="f-badge" data-kind="warn">${esc(s.tt(TX.out))}</span>` : ''}</span></button>`;
  return `<div class="f-card" data-pane="fleet"><div class="f-row ac-head"><b data-fleetof>${esc(s.co ? s.tt(TX.fleetOf, { a: s.co }) : s.tt(TX.fleet))}</b> <span class="f-muted" data-count>${esc(countText(s, all.length))}</span><button type="button" class="primary" data-do="add">${esc(s.tt(TX.add))}</button></div>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.search))}</span><input type="search" data-k="q" value="${esc(s.q)}" placeholder="${esc(s.tt(TX.search))}" autocomplete="off"></label>
    <div class="f-list" data-list>${!all.length ? `<p class="f-muted">${esc(s.tt(TX.none))}</p>${noHitActions(s)}` : !hits.length ? `<p class="f-muted">${esc(s.tt(TX.noHit))}</p>${noHitActions(s)}` : shown.map(row).join('')}</div>
    ${hits.length > shown.length ? `<button type="button" class="f-linkbtn" data-do="more">${esc(s.tt(TX.more, { n: hits.length - shown.length }))}</button>` : ''}</div>`;
}

/** L'éditeur d'un appareil : deux groupes de champs, la ligne des changements, les gestes. */
function editorHtml(s) {
  const d = s.edit.draft,
    field = (k, label, extra = '') => `<label class="f-field">${esc(s.tt(label))}<input data-f="${k}" value="${esc(k === 'callsigns' ? (d.callsigns || []).join(', ') : d[k] ?? '')}"${extra} autocomplete="off"></label>`,
    old = s.edit.was ? listOf(s).find(a => a.registration === s.edit.was) : null;
  const note = s.edit.note ? `<small class="f-muted" data-regnote>${esc(`${s.tt(TX.regFrom, { label: s.edit.note.label })} ${s.edit.note.sug ? s.tt(TX.regSug, { t: s.edit.note.sug }) : s.tt(TX.regNoType)}`)}</small>` : '',
    search = s.edit.was || typeof s.ctx.launcher?.job !== 'function' ? '' : `<div class="ac-regsearch" data-regsearch><label class="f-field">${esc(s.tt(TX.regSearch))}<input type="search" data-k="rq" value="${esc(s.edit.rq || '')}" placeholder="cessna 172" autocomplete="off" spellcheck="false"></label><div data-regres>${regResHtml(s)}</div></div>`;
  return `<div class="f-card" data-pane="edit">${search}<fieldset class="ac-group"><legend>${esc(s.tt(TX.identity))}</legend>
      ${field('registration', TX.registration, ' autocapitalize="characters" spellcheck="false"')}
      ${field('type', TX.type, ' autocapitalize="characters" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ac-typesug"')}<small class="f-muted" data-typeinfo></small>${note}
      <div class="ac-sug" id="ac-typesug" data-typesug role="listbox" aria-label="${esc(s.tt(TX.typeList))}" hidden></div>
      ${field('variant', TX.variant)}${field('operator', TX.operator)}<small class="f-muted" data-hint="operator">${esc(s.tt(TX.operatorHint))}</small></fieldset>
    <fieldset class="ac-group"><legend>${esc(s.tt(TX.operation))}</legend>
      ${field('callsigns', TX.callsigns, ' autocapitalize="characters" spellcheck="false"')}<small class="f-muted" data-hint="callsigns">${esc(s.tt(TX.callsignsHint))}</small>${field('base', TX.base)}${field('tacticalNumber', TX.tactical)}
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
  if (e.target.dataset.k === 'rq' && s.edit) { // SOG-0270 : les immatriculations d'un type au registre
    s.edit.rq = e.target.value;
    s.edit.rall = false;
    const res = s.el.querySelector('[data-regres]');
    if (res) res.innerHTML = regResHtml(s);
    return regAsk(s, {
      type: e.target.value
    });
  }
  if (e.target.dataset.f === 'type' && s.edit && !s.TS.picking()) typeSuggest(s, e.target);
  if (e.target.dataset.f && s.edit) refreshEditor(s);
}

/** Propositions du champ Type (deux caractères au moins, sans casse) : les types de la base (code, nom) qui commencent par le texte,
 *  chacun avec sa fiche s'il en a une, puis les fiches dont l'identifiant, le nom ou le type le contient ; sept au plus. Le choix
 *  écrit le code du type seul (la flotte au schéma 1 n'a pas de champ de fiche). */
async function typeSuggest(s, input) {
  const t = s.TS.ticket(),
    q = input.value.trim();
  if (q.length < 2) return s.TS.close();
  const A = await Promise.resolve().then(() => s.ctx.aerodb?.aircraft?.()).catch(() => null),
    [types, sheets] = await Promise.all([Promise.resolve().then(() => A?.searchTypes?.(q, ROWS)).catch(() => []),
      Promise.resolve().then(() => A?.sheets?.list?.()).catch(() => [])
    ]);
  if (!s.TS.live(t) || S !== s) return;
  const Q = q.toUpperCase(),
    code = sh => String(sh?.icao || sh?.type || '').toUpperCase(),
    list = Array.isArray(sheets) ? sheets : [],
    sheetOf = c => list.find(sh => code(sh) === c),
    hits = (Array.isArray(types) ? types : []).filter(x => x?.code).map(x => {
      const sh = sheetOf(String(x.code).toUpperCase());
      return {
        value: String(x.code).toUpperCase(),
        label: [x.label && x.label !== x.code ? x.label : '', sh ? s.tt(TX.typeSheet, {
          id: sh.id
        }) : ''].filter(Boolean).join(' · ')
      };
    });
  for (const sh of list)
    if (code(sh) && !hits.some(h => h.value === code(sh)) && [sh.id, sh.name, code(sh)].some(v => String(v || '').toUpperCase().includes(
        Q)))
      hits.push({
        value: code(sh),
        label: [sh.name && sh.name !== code(sh) ? sh.name : '', s.tt(TX.typeSheet, {
          id: sh.id
        })].filter(Boolean).join(' · ')
      });
  s.TS.show(input, hits.slice(0, ROWS));
}

/** Gestes : ouvrir une ligne, ajouter, « N autres », enregistrer, retirer, revenir. */
async function onClick(s, e) {
  if (s.view === 'fleet' && s.TS?.onClick(e)) return; // une proposition du champ Type
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
  const pick = e.target.closest('[data-regpick]');
  if (pick && s.edit) { // SOG-0270 : une immatriculation du registre choisie : la fiche se remplit (le type, une suggestion)
    const v = s.regs.get(regKey({
        type: s.edit.rq || ''
      })),
      row = v?.rows?.[Number(pick.dataset.regpick)];
    if (!row) return;
    const base = readForm(s),
      sug = await typeOfRegistry(s, row);
    if (S !== s || !s.edit) return;
    return regFill(s, {
      ...row,
      sug
    }, base);
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
    case 'addq': // SOG-0269 : « Créer F-BHHH » : la fiche neuve, l'immatriculation tapée remplie
      s.edit = {
        was: '',
        draft: FL.normalize({
          registration: regOfQuery(b.dataset.newreg)
        })
      };
      draw(s);
      return s.el.querySelector('[data-f="type"]')?.focus();
    case 'addreg': { // SOG-0270 : « Créer à l'identique » : la fiche neuve d'après la ligne du registre
      const reg = b.dataset.newreg,
        v = s.regs.get(regKey({
          reg
        })),
        row = v?.rows?.find(x => x.reg.replace(/-/g, '') === reg.replace(/-/g, ''));
      return row && regFill(s, row);
    }
    case 'regmore':
      s.edit.rall = true;
      return regRedraw(s);
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
  const file = await s.ctx.data.get(s.fleetPath),
    taken = (file?.aircraft || []).some(a => String(a?.registration || '').toUpperCase() === d.registration);
  if (taken && d.registration !== s.edit.was) return s.ctx.notify(s.tt(TX.dupReg, {
    r: d.registration
  }), 'warn');
  const next = FL.upsert(file, d, {
    was: s.edit.was,
    by
  });
  await s.ctx.data.put(s.fleetPath, next);
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
  const next = FL.retire(await s.ctx.data.get(s.fleetPath), r, {
    by: s.ctx.identity?.trigram || ''
  });
  await s.ctx.data.put(s.fleetPath, next);
  if (S !== s) return;
  s.fleet = next;
  s.edit = null;
  draw(s);
  publishStatus(s);
  s.ctx.notify(s.tt(TX.retired, {
    r
  }), 'ok');
}
