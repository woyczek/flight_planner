// V3 missions — les missions de la compagnie (modules/missions/SPEC.md § 1–4, lot 2 réduit du 31 octobre 2026) : la liste des missions
// communes du dépôt par famille, une recherche et un filtre de famille, « Choisir » (un résumé plat de la mission), « Tirer au sort »
// parmi celles que le pilote n'a pas encore volées, et « Préparer ce vol » par la porte de Carburant (#fuel?mission=<id>). Le module lit,
// n'écrit rien : les missions ont un seul auteur (le CPCO de la V2), le vol est écrit par Carburant. Pas encore : l'enveloppe, le lecteur
// page à page, l'affectation (§ 5–6).
import * as MS from '../../frame/lib/mission.js';
import * as MC from '../../frame/lib/mission_categories.js'; // les catégories de la compagnie (SOG-0041, § 10.38)
import {
  familyParts,
  familyText
} from '../report/vocab.js'; // une famille : son sigle d'abord, puis son nom long (SOG-0179, une seule source avec le compte rendu)

export const meta = {
  id: 'missions',
  apps: ['company'], // l'application Compagnie (?app=company), seule (décision de l'utilisateur, 1er nov. 2026)
  level: 1,
  title: ['Missions', 'Missions', 'Missionen', 'Misiones'],
  files: ['../../frame/lib/mission.js', '../../frame/lib/js-yaml.min.js', '../../frame/lib/mission_categories.js', '../report/vocab.js'],
  reads: ['missions/', 'cr/',
    'airline/'
  ], // les missions et leur registre ; les comptes rendus (« volée le … ») ; les catégories de la compagnie
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

// la fiche en deux niveaux (§ 10.45) : un écran après l'autre sur un module étroit ; côte à côte (première page à gauche, détail au
// centre) sur un module large, sans « Détail » ni « Retour » du détail
const STYLE = `[data-module="missions"] .ms-detail{display:none}
[data-module="missions"] .ms-sheet[data-detail] .ms-first{display:none}
[data-module="missions"] .ms-sheet[data-detail] .ms-detail{display:block}
[data-module="missions"] .ms-lines{margin:.2em 0 .4em;padding-left:1.1em}
[data-module="missions"] [data-famlong]{font-weight:400}
[data-module="missions"] .ms-fam{display:block;font-size:.72em;margin-top:.15em} /* la famille sous le titre de la fiche : « SAR · Récupération de personnel » (SOG-0187) */ /* le sigle en gras, le nom long en clair (SOG-0179) */
[data-module="missions"] .ms-summary{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;margin:.2em 0 .4em} /* le résumé, deux lignes au plus avec « … » (SOG-0051) */
[data-module="missions"] .ms-lines li{margin:.15em 0}
[data-module="missions"] .ms-route{border-collapse:collapse;width:100%}
[data-module="missions"] .ms-route td{padding:.2em .4em;border-bottom:1px solid var(--sog-border);vertical-align:top}
[data-module="missions"] .ms-sec{border-top:1px solid var(--sog-border)} /* une section du détail : un filet, pas une carte dans la carte */
[data-module="missions"] a[data-zonemap],[data-module="missions"] a[data-maplink]{display:inline-flex;align-items:center;min-height:44px} /* cible de 44 px */
[data-module="missions"] .ms-png{display:block;max-width:100%;height:auto;margin:.4em 0}
[data-module="missions"] .ms-sec>summary{min-height:44px;display:flex;align-items:center}
@container (min-width: 900px){
  [data-module="missions"] .ms-sheet{display:grid;grid-template-columns:minmax(16em,24em) minmax(0,1fr);gap:16px;align-items:start}
  [data-module="missions"] .ms-sheet .ms-first,[data-module="missions"] .ms-sheet .ms-detail{display:block}
  [data-module="missions"] .ms-todetail,[data-module="missions"] .ms-tofirst{display:none}
}`;

const REGISTRY = 'missions/mission_registry.yaml',
  ROWS = 7; // lignes montrées avant « N autres » (sept éléments au plus par écran)

const TX = {
  // la fiche en deux niveaux (§ 10.45, SOG-0051)
  detail: ['Détail', 'Detail', 'Details', 'Detalle'],
  risks: ['Risques', 'Risks', 'Risiken', 'Riesgos'],
  noRisk: ['Aucun risque déclaré', 'No risk declared', 'Kein Risiko angegeben', 'Ningún riesgo declarado'],
  teams: ['Équipes', 'Teams', 'Teams', 'Equipos'],
  zonesCount: ['{n} zone(s)', '{n} zone(s)', '{n} Zone(n)', '{n} zona(s)'],
  flownOn: ['Volée le {d}', 'Flown on {d}', 'Geflogen am {d}', 'Volada el {d}'],
  secDesc: ['Description', 'Description', 'Beschreibung', 'Descripción'],
  secObj: ['Objectifs', 'Objectives', 'Ziele', 'Objetivos'],
  objPrimary: ['Principal :', 'Primary:', 'Hauptziel:', 'Principal:'],
  secZones: ['Zones à activer', 'Zones to activate', 'Zu aktivierende Zonen', 'Zonas que activar'],
  secRdv: ['Rendez-vous', 'Rendezvous', 'Treffpunkte', 'Encuentros'],
  secRoute: ['Route fournie', 'Route provided', 'Vorgegebene Route', 'Ruta facilitada'],
  routeNm: ['{n} NM au total', '{n} NM in all', '{n} NM insgesamt', '{n} NM en total'],
  secMaps: ['Cartes fournies', 'Maps provided', 'Mitgelieferte Karten', 'Mapas facilitados'],
  secPayload: ['Charge et appareils', 'Payload and aircraft', 'Zuladung und Luftfahrzeuge', 'Carga y aeronaves'],
  payload: ['Charge', 'Payload', 'Zuladung', 'Carga'],
  massKg: ['Masse (kg)', 'Mass (kg)', 'Masse (kg)', 'Masa (kg)'],
  pax: ['Passagers', 'Passengers', 'Passagiere', 'Pasajeros'],
  onMap: ['Voir sur la Carte', 'See on the Map', 'Auf der Karte zeigen', 'Ver en el Mapa'],
  polygon: ['polygone', 'polygon', 'Polygon', 'polígono'],
  minutes: ['{n} min', '{n} min', '{n} min', '{n} min'],
  allCategories: ['Toutes les catégories', 'All categories', 'Alle Kategorien', 'Todas las categorías'],
  category: ['Catégorie', 'Category', 'Kategorie', 'Categoría'],
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
  count1: ['{n} mission', '{n} mission', '{n} Mission', '{n} misión'], // le singulier : fr 0 et 1, en / de / es 1 (frame/lib/plural.js)
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
  // une erreur de YAML dite à sa ligne (SOG-0212 : « fichier illisible » sans raison) ; la raison est celle de js-yaml, en anglais
  yamlAt: ['ligne {l} : {r}', 'line {l}: {r}', 'Zeile {l}: {r}', 'línea {l}: {r}'],
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
    const line = Number.isInteger(e?.mark?.line) ? e.mark.line + 1 : 0,
      reason = String(e?.reason || e?.message || e).split('\n')[0].slice(0, 120);
    return {
      why: 'unreadable',
      err: line ? S?.tt(TX.yamlAt, {
        l: line,
        r: reason
      }) ?? `${line}: ${reason}` : String(e?.message || e).split('\n')[0].slice(0, 120)
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
    category: '', // SOG-0041 : le filtre de catégorie ('' : toutes)
    cats: MC.forAirline(null, null), // les catégories de la compagnie courante (relues avec elle)
    all: false,
    open: null, // { row, mission, drawn, why, err } : la mission choisie
    regWhy: {
      why: 'loading'
    } // le registre pas encore lu, en retard ou illisible ; null une fois lu
  };
  el.onclick = e => onClick(s, e);
  el.oninput = e => onInput(s, e);
  el.onchange = e => onInput(s, e);
  // § 10.38 : la liste suit la compagnie courante, et la relit quand elle change (Réglages › Compagnie)
  s.co = await airlineOf();
  s.cats = await categoriesOf(ctx, s.co.a);
  if (S !== s) return;
  s.onAirline = async () => {
    const co = await airlineOf(),
      cats = await categoriesOf(ctx, co.a);
    if (S !== s) return;
    s.co = co;
    s.cats = cats;
    s.category = '';
    s.all = false;
    if (!s.open) draw(s);
  };
  window.addEventListener('frame-data-airline', s.onAirline);
  // le retour du navigateur (même adresse : popstate sans hashchange, le module n'est pas remonté) : le détail revient à la première
  // page, la première page à la liste
  s.onPop = () => {
    if (S !== s || !s.open) return;
    if (s.open.detail) s.open.detail = false;
    else s.open = null;
    draw(s);
  };
  window.addEventListener('popstate', s.onPop);
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
  await unlisted(s, got.doc);
  if (S !== s) return;
  s.flown = await flownOf(s);
  if (S === s && !s.open) results(s);
}

const UNLISTED_MAX = 500; // fichiers de mission hors registre lus à un affichage, au plus (un dépôt hors norme ne bloque pas l'écran)

/** Le registre est une vue dérivée des fichiers (SOG-0036) : les fichiers de mission du dépôt (missions/<famille>/<ID>/mission<ID>.yaml)
 *  qu'aucune ligne du registre ne nomme — arrivés par la synchronisation sans le registre qui va avec — sont lus et ajoutés à la liste,
 *  à chaque affichage, sans bouton (seuls ceux-là sont lus : sur le poste du 06/11, 0 sur 102 dossiers). Un fichier illisible, ou qui
 *  n'est pas une mission de son dossier, est laissé de côté ; une organisation (…Z) n'est jamais listée. */
async function unlisted(s, reg) {
  const paths = await Promise.resolve().then(() => s.ctx.data.list('missions/')).catch(() => null);
  if (S !== s || !Array.isArray(paths)) return;
  const named = new Set(s.rows.map(r => `missions/${r.folder}/${r.file}`)),
    ids = new Set(MS.readRegistry(reg).map(r => r.id)),
    todo = paths.map(p => [p, MS.missionPath(p)]).filter(([p, w]) => w && !named.has(p) && !ids.has(w.id)).slice(0, UNLISTED_MAX),
    found = [];
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(todo.slice(i, i + 8).map(async ([p]) => {
      let got = await yamlFile(s.ctx, p);
      if (got.why === 'late') got = await got.later;
      const row = got.doc ? MS.rowOfMission(got.doc, p) : null;
      if (row && !row.organisation && !ids.has(row.id)) {
        ids.add(row.id);
        found.push(row);
      }
    }));
    if (S !== s) return;
  }
  if (!found.length) return;
  s.rows = [...s.rows, ...found].sort((a, b) => b.id.localeCompare(a.id));
  if (!s.open) s.rows.length === found.length ? draw(s) : results(s);
}

/** Démonte : la compagnie n'est plus suivie. */
export function unmount() {
  if (S?.onAirline) window.removeEventListener('frame-data-airline', S.onAirline);
  if (S?.onPop) window.removeEventListener('popstate', S.onPop);
  for (const u of S?.urls || []) URL.revokeObjectURL(u);
  S = null;
}

/** La compagnie courante pour la liste (§ 10.38 étape 1) : { code, filter, a } — code : celle de l'appareil (« perso » : les missions
 *  personnelles, celles sans champ airline) ; filter : faux sans index (code « default », ou un cadre sans FrameData.airline) : toutes
 *  les missions, comme avant la migration. */
async function airlineOf() {
  try {
    const FD = window.FrameData;
    if (typeof FD?.airline !== 'function' || typeof FD?.airlines !== 'function') return {
      code: '',
      first: '',
      filter: false
    };
    const a = await FD.airline(),
      code = String(a?.code || '');
    return {
      code,
      filter: !!code && code !== 'default',
      a
    };
  } catch {
    return {
      code: '',
      first: '',
      filter: false
    };
  }
}
/** Les catégories de la compagnie (SOG-0041, § 10.38) : son categories.json (airline().root, une entrée non fiable filtrée par
 *  forAirline), à défaut la base commune ; les groupes actifs pour son genre. */
async function categoriesOf(ctx, a) {
  const doc = a?.root ? await Promise.resolve().then(() => ctx.data.get(`${a.root}categories.json`)).catch(() => null) : null;
  return MC.forAirline(doc, a || null);
}
/** La catégorie d'une ligne, si la compagnie la connaît ({ id, names, load? }) ; null sinon (une catégorie inconnue est ignorée). */
const catOf = (s, r) => r.category ? s.cats.all.find(c => c.id === r.category) || null : null;
/** Une mission de la compagnie courante : celle que nomme son champ airline, personnelle sans lui (MS.ownerOf) ; toutes sans index. */
const ofAirline = (s, r) => !s.co?.filter || MS.ownerOf(r) === s.co.code;

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
const filtered = s => s.rows.filter(r => ofAirline(s, r) && (!s.family || r.family === s.family) && (!s.category || catOf(s, r)?.id === s
  .category) && (!s.q || [r.id, r.title, r.operation, r
  .family, r.kind,
  r.subtype, ...r.callsigns, ...r.words, r.originIcao, r.destinationIcao, r.origin, r
  .destination, ...r.types
].some(v => String(v).toUpperCase().includes(s.q.toUpperCase()))));

/** Dessine la liste, ou la mission choisie. */
function draw(s) {
  s.ctx.helpAnchor?.(() => s.open ? 'missions-open' : 'missions-list');
  for (const u of s.urls || []) URL.revokeObjectURL(u);
  s.urls = [];
  s.el.innerHTML = `<style>${STYLE}</style><h1>${esc(s.tt(meta.title))}</h1>${s.open ? missionHtml(s) : listHtml(s)}`;
  if (s.open?.mission && !s.open.mission.hasCoords) legacyPngs(s);
}

/** La date d'un compte rendu en « jj/mm/aaaa ». */
const day = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('/') : d;

/** La liste : « Tirer au sort », recherche, famille, puis les résultats (resultsHtml). */
function listHtml(s) {
  const w = s.regWhy;
  if (!s.rows.length) return `<div class="f-card"><p class="f-muted" data-why="${esc(w?.why || 'none')}">${esc(w?.why === 'loading' ? s.tt(TX.regLoading) : w?.why === 'late' ? s.tt(TX.regLate) : w?.why === 'unreadable' ? s.tt(TX.regUnreadable, { e: w.err }) : s.tt(TX.none))}</p></div>`;
  const families = [...new Set(s.rows.filter(r => ofAirline(s, r)).map(r => r.family).filter(Boolean))].sort(),
    // les catégories connues de la compagnie que ses missions portent, dans l'ordre de sa liste ; sans elles, pas de filtre
    held = new Set(s.rows.filter(r => ofAirline(s, r)).map(r => catOf(s, r)?.id).filter(Boolean)),
    cats = s.cats.all.filter(c => held.has(c.id)),
    lang = s.ctx.lang?.() || 'fr';
  return `<div class="f-card" data-pane="list"><div class="f-row"><button type="button" class="primary" data-do="draw">${esc(s.tt(TX.draw))}</button></div>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.search))}</span><input type="search" data-k="q" value="${esc(s.q)}" placeholder="${esc(s.tt(TX.search))}" autocomplete="off"><small class="f-muted" data-searchhint>${esc(s.tt(TX.searchHint))}</small></label>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.allFamilies))}</span><select data-k="family"><option value="">${esc(s.tt(TX.allFamilies))}</option>${families.map(f => `<option value="${esc(f)}"${s.family === f ? ' selected' : ''}>${esc(familyText(f, s.ctx.lang?.() || 'fr'))}</option>`).join('')}</select></label>
    ${cats.length ? `<label class="f-field"><span class="f-sr">${esc(s.tt(TX.allCategories))}</span><select data-k="category"><option value="">${esc(s.tt(TX.allCategories))}</option>${cats.map(c => `<option value="${esc(c.id)}"${s.category === c.id ? ' selected' : ''}>${esc(MC.nameOf(s.cats, c.id, lang))}</option>`).join('')}</select></label>` : ''}
    <div data-results>${resultsHtml(s)}</div></div>`;
}

/** Le singulier pour n (la règle de frame/lib/plural.js : fr 0 et 1, sinon 1 seul). */
const one = (s, n) => (s.ctx.lang?.() || 'fr') === 'fr' ? n < 2 : n === 1;

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
    if (r.family !== fam) body += `<h3 class="f-muted" data-family="${esc(fam = r.family)}">${famHtml(s, fam)}</h3>`;
    body += row(r);
  }
  return `<p class="f-muted" data-count>${esc(s.tt(one(s, hits.length) ? TX.count1 : TX.count, { n: hits.length }))}</p>
    <div class="f-list" data-list>${hits.length ? body : `<p class="f-muted">${esc(s.tt(TX.noHit))}</p>`}</div>
    ${hits.length > shown.length ? `<button type="button" class="f-linkbtn" data-do="more">${esc(s.tt(TX.more, { n: hits.length - shown.length }))}</button>` : ''}`;
}

/** Redessine les résultats seuls (frappe, famille, « N autres », comptes rendus lus) ; la liste entière si elle n'est pas là. */
function results(s) {
  const box = s.el.querySelector('[data-results]');
  if (box) box.innerHTML = resultsHtml(s);
  else if (!s.open) draw(s);
}

/** La fiche d'une mission en deux niveaux (§ 10.45, SOG-0051). Première page (sept éléments, règle 13) : titre, catégorie (et l'état
 *  « Volée le … »), résumé, risques, équipes, zones, actions ; le détail en sections repliables de sept éléments chacune. Téléphone : deux écrans (« Détail », le
 *  retour du navigateur revient) ; module large : la première page à gauche, le détail au centre (CSS @container). */
function missionHtml(s) {
  const {
    row: r,
    mission: m,
    drawn
  } = s.open,
    why = s.open.why ? `<p class="f-muted" data-why="${esc(s.open.why)}">${esc(s.open.why === 'late' ? s.tt(TX.late) : s.open.why === 'missing' ? s.tt(TX.missing, { p: `missions/${r.folder}/${r.file}` }) : s.tt(TX.unreadable, { e: s.open.err || s.tt(TX.noIdType) }))}</p>` : '';
  return `<div class="f-card ms-sheet" data-pane="mission" data-id="${esc(r.id)}"${s.open.detail ? ' data-detail' : ''}>
    <section class="ms-first" data-first>${firstHtml(s, r, m, drawn, why)}</section>
    <section class="ms-detail" data-detailpane>${m ? detailHtml(s, r, m) : ''}</section></div>`;
}
/** Sept lignes au plus, puis « N autres » replié (la règle 13 dans une section). */
function seven(s, items) {
  return items.length > 7 ? `${items.slice(0, 7).join('')}<details class="ms-more"><summary class="f-muted">${esc(s.tt(TX.more, { n: items.length - 7 }))}</summary>${items.slice(7).join('')}</details>` : items.join('');
}
/** Une famille dans notre rendu (SOG-0179) : le sigle en gras, puis son nom long ; le sigle seul pour un code inconnu. */
function famHtml(s, code) {
  const p = familyParts(code, s.ctx.lang?.() || 'fr');
  return `<b data-famshort>${esc(p.short)}</b>${p.long ? ` · <span data-famlong>${esc(p.long)}</span>` : ''}`;
}
/** La première page (voir missionHtml). */
function firstHtml(s, r, m, drawn, why) {
  const lang = s.ctx.lang?.() || 'fr',
    cat = m?.category || r.category,
    catName = catOf(s, {
      category: cat
    }) ? MC.nameOf(s.cats, cat, lang) : '',
    risks = m?.risks || [],
    teams = m?.teams || [],
    zones = m?.zones || [],
    flown = s.flown.get(r.id),
    kindLine = [m?.type || r.kind, m?.subtype || r.subtype, catName].filter(
      Boolean); // 2 la catégorie : activité, sous-type, catégorie de la compagnie
  // 1 le titre, l'id et la famille
  // 2 bis l'état (« Volée le … ») rejoint la ligne de catégorie : la première page garde sept éléments avec le résumé (refus de recette
  // de SOG-0051, 10 nov. : « la description courte, avant les risques »)
  const flownBadge = flown ? `<span class="f-badge" data-kind="ok" data-flown>${esc(s.tt(TX.flownOn, { d: day(flown) }))}</span>` : '';
  // la famille : son sigle en gras puis son nom long (SOG-0187, comme au compte rendu et dans la liste ; familyParts)
  return `<h2><b>${esc(r.id)}</b> ${esc(m?.title || r.title)} <span class="f-muted ms-fam" data-family-of="${esc(r.family)}">${famHtml(s, r.family)}</span>${drawn ? ` <span class="f-badge" data-kind="accent" data-drawn>${esc(s.tt(TX.drawn))}</span>` : ''}</h2>
    ${kindLine.length || flownBadge ? `<p class="f-muted" data-cat>${esc(kindLine.join(' · '))}${kindLine.length && flownBadge ? ' ' : ''}${flownBadge}</p>` : ''}
    ${m?.summary ? `<p class="ms-summary" data-summary title="${esc(m.summary)}">${esc(m.summary)}</p>` : ''}
    ${m ? risks.length ? `<div data-risks><h3>${esc(s.tt(TX.risks))}</h3><ul class="ms-lines">${risks.slice(0, 3).map(x => `<li data-risk>${esc(x.hazard)}${x.mitigation ? ` → ${esc(x.mitigation)}` : ''}</li>`).join('')}</ul>${risks.length > 3 ? `<details class="ms-more" data-riskmore><summary class="f-muted">${esc(s.tt(TX.more, { n: risks.length - 3 }))}</summary><ul class="ms-lines">${risks.slice(3).map(x => `<li data-risk>${esc(x.hazard)}${x.mitigation ? ` → ${esc(x.mitigation)}` : ''}</li>`).join('')}</ul></details>` : ''}</div>` :
    `<div data-risks><p class="f-muted" data-norisk>${esc(s.tt(TX.noRisk))}</p></div>` : ''}
    ${teams.length ? `<div data-teams><h3>${esc(s.tt(TX.teams))}</h3><ul class="ms-lines">${seven(s, teams.map(t => `<li data-team>${esc(t.name)}${t.role ? ` <span class="f-muted">${esc(t.role)}</span>` : ''}</li>`))}</ul></div>` : ''}
    ${zones.length ? `<p data-zones>${esc(s.tt(TX.zonesCount, { n: zones.length }))} : ${esc(zones.slice(0, 7).map(z => [z.id, z.name].filter(Boolean).join(' ')).join(', '))}${zones.length > 7 ? '…' : ''}</p>` : ''}
    ${why}
    <div class="f-row ms-actions"><a class="f-btn primary" data-do="prepare" href="#fuel?mission=${encodeURIComponent(r.id)}">${esc(s.tt(TX.prepare))}</a>${m ? `<button type="button" class="ms-todetail" data-do="detail">${esc(s.tt(TX.detail))}</button>` : ''}${drawn ? `<button type="button" data-do="draw">${esc(s.tt(TX.drawAgain))}</button>` : ''}<button type="button" data-do="back">${esc(s.tt(TX.back))}</button></div>`;
}
/** Une adresse de la Carte pour cette mission (l'application Pilote : la Carte n'est pas dans Compagnie) ; `extra` : map, zone. */
const mapHref = (r, extra) => `?app=pilot#maps?mission=${encodeURIComponent(r.id)}${Object.entries(extra).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('')}`;
/** Le détail (voir missionHtml) : description, objectifs, zones à activer, rendez-vous, route fournie, cartes fournies, charge et
 *  appareils ; une section vide n'est pas montrée. */
function detailHtml(s, r, m) {
  const sec = (id, title, body, open = false) => body ? `<details class="ms-sec" data-sec="${id}"${open ? ' open' : ''}><summary>${esc(s.tt(title))}</summary>${body}</details>` : '',
    km = v => `${Math.round(v * 10) / 10} km`,
    // une carte fournie centrée sur une zone (son centre_ref) : la Carte l'ouvre à cette carte
    zoneMap = z => m.maps.find(x => x.file && x.centreRef && x.centreRef.toUpperCase() === z.id.toUpperCase())?.file || '',
    nm = MS.routeNm(m),
    lines = a => a.length ? `<ul class="ms-lines">${seven(s, a)}</ul>` : '';
  const desc = [m.summary ? `<p data-summary>${esc(m.summary)}</p>` : '', ...m.details.map(p => `<p>${esc(p)}</p>`), m.notes?.length ? `<ul class="ms-lines">${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''].filter(Boolean),
    obj = [m.objectives.primary ? `<p><b>${esc(s.tt(TX.objPrimary))}</b> ${esc(m.objectives.primary)}</p>` : '', lines(m.objectives.secondary.map(x => `<li>${esc(x)}</li>`))].join(''),
    zones = lines(m.zones.map(z => `<li data-zone="${esc(z.id)}"><b>${esc(z.name || z.id)}</b> <span class="f-muted">${esc([z.kind, z.radiusKm !== null ? km(z.radiusKm) : z.polygon ? s.tt(TX.polygon) : '', z.role, z.timeMin !== null ? s.tt(TX.minutes, { n: z.timeMin }) : ''].filter(Boolean).join(' · '))}</span>${z.lat !== null && z.lon !== null ? ` <a class="f-linkbtn" data-zonemap href="${esc(mapHref(r, { map: zoneMap(z), zone: z.id }))}">${esc(s.tt(TX.onMap))}</a>` : ''}</li>`)),
    rdv = lines(m.rendezvous.map(p => `<li data-rdv><b>${esc(p.name || p.id)}</b> <span class="f-muted">${esc([p.participants.join(', '), p.role].filter(Boolean).join(' · '))}</span></li>`)),
    route = m.turns.length ? `<table class="ms-route" data-routetable><tbody>${m.turns.slice(0, 60).map(p => `<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td class="f-muted">${esc(p.role)}</td></tr>`).join('')}</tbody></table>${nm !== null ? `<p class="f-muted" data-routenm>${esc(s.tt(TX.routeNm, { n: nm }))}</p>` : ''}` : '',
    // les cartes fournies : un lien vers la Carte quand la mission a des coordonnées (jamais l'image) ; l'image du dossier sinon
    maps = lines(m.maps.filter(x => x.file || x.description).map((x, i) => `<li data-map="${i}"><b>${esc(x.type || x.id || x.file)}</b> <span class="f-muted">${esc(x.description)}</span>${m.hasCoords ? x.file ? ` <a class="f-linkbtn" data-maplink href="${esc(mapHref(r, { map: x.file }))}">${esc(s.tt(TX.onMap))}</a>` : '' : x.file ? `<img class="ms-png" data-png="${esc(x.file)}" alt="${esc(x.description || x.file)}" hidden>` : ''}</li>`)),
    ac = (m.aircraft || []).map(a => a.type).filter(Boolean).join(', ') || r.types.join(', '),
    dep = m.origin?.name || r.origin,
    arr = m.destination?.name || r.destination,
    dl = (k, v) => v ? `<dt>${esc(s.tt(k))}</dt><dd>${esc(v)}</dd>` : '',
    load = `<dl class="f-dl">${dl(TX.operation, r.operation)}${dl(TX.route, [dep, arr].filter(Boolean).join(' → '))}${dl(TX.aircraft, ac)}${dl(TX.block, hmm(m.estimate?.blockMin || r.blockMin))}${dl(TX.payload, m.payload.description)}${dl(TX.massKg, m.payload.massKg !== null ? String(m.payload.massKg) : '')}${dl(TX.pax, m.payload.passengers !== null ? String(m.payload.passengers) : '')}</dl>${m.constraints?.length ? `<ul class="ms-lines">${m.constraints.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
  // la place du bouton documentation (SOG-0084, § 10.46) et l'historique des affectations (lot 5) viendront après la charge
  return `<button type="button" class="ms-tofirst" data-do="first">${esc(s.tt(TX.back))}</button>
    ${sec('desc', TX.secDesc, desc.join(''), true)}${sec('obj', TX.secObj, obj)}${sec('zones', TX.secZones, zones)}${sec('rdv', TX.secRdv, rdv)}${sec('route', TX.secRoute, route)}${sec('maps', TX.secMaps, maps)}${sec('payload', TX.secPayload, load)}`;
}
/** Les images héritées d'une mission sans coordonnées (le dossier de la mission, un nom de fichier vérifié par le lecteur) : lues en
 *  octets, montrées si ce sont des PNG ; rien sinon. */
async function legacyPngs(s) {
  const o = s.open,
    imgs = [...s.el.querySelectorAll('img[data-png]')];
  for (const img of imgs) {
    const file = img.dataset.png,
      buf = o?.row?.folder ? await Promise.resolve().then(() => window.FrameData?.readBytes?.(`missions/${o.row.folder}/${file}`, {
        max: 8e6
      })).catch(() => null) : null;
    if (S !== s || s.open !== o) return;
    const b = buf ? new Uint8Array(buf.slice(0, 4)) : null;
    if (!b || b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) continue; // pas un PNG : rien
    const url = URL.createObjectURL(new Blob([buf], {
      type: 'image/png'
    }));
    (s.urls ||= []).push(url);
    img.src = url;
    img.hidden = false;
  }
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
    const pushed = s.open ? s.open.pushed : (history.pushState({
      missions: 'open'
    }, '', location.href), true); // le retour du navigateur revient à la liste
    s.open = {
      row,
      mission,
      drawn,
      pushed,
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
  if (k !== 'q' && k !== 'family' && k !== 'category') return;
  s[k] = e.target.value;
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
      // la mission ouverte par un toucher a une entrée d'historique : le retour la referme (popstate), comme le geste du navigateur
      if (s.open?.pushed) return history.back();
      s.open = null;
      return draw(s);
    case 'detail':
      s.open.detail = true;
      history.pushState({
        missions: 'detail'
      }, '', location.href); // le retour du navigateur revient à la première page (popstate, sans changer l'adresse)
      draw(s);
      return s.el.querySelector('[data-detailpane]')?.scrollIntoView?.({
        block: 'start'
      });
    case 'first':
      return history.back();
  }
}
