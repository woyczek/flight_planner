// V3 report — le compte rendu de mission de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ;
// modules/report/SPEC.md, INTEGRATION.md). Trois pas, Vol · Mission · Résultat (un à la fois sur téléphone, côte à côte
// sur écran large), un bouton d'enregistrement collant en bas ; rien d'obligatoire : ce qui manque est dit au Résultat.
// Un CR = un enregistrement JSON, cr/reports/<année>/<n° de CR>.json (fusion record) : l'entrée du registre V2
// (shared/mission_core/model.js, schéma 2) plus schema, updated_at et by ; le pont du lanceur le rejoue dans
// cr/missions.yaml pour la V2 et CPCO. Brouillon sur l'appareil (cache/report/draft.json). Vocabulaire, modèle et
// famille recopiés de la V2 (vocab.js, model.js, families/*.js) ; ici seulement l'écran et ctx.
import * as V from './vocab.js';
import * as M from './model.js';
import * as T from './text_import.js';
import * as Fpl from './fpl.js';
import * as LF from '../../frame/lib/last_flight.js';
import * as CF from '../../frame/lib/current_flight.js';
import {
  formatLevel
} from '../../frame/lib/route_text.js';
import * as Site from '../../frame/lib/website.js';
import {
  copyText
} from '../../frame/lib/clipboard.js'; // marche aussi en http (tablette servie par le poste)
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  fmtZ,
  fmtZLocal,
  fmtDateZ
} from '../../frame/lib/time.js'; // heures en UTC, l'heure locale seulement à la mise en route
import AAR from './families/aar.js';
import AIRBORNE from './families/airborne.js';
import AIRLIFT from './families/airlift.js';
import COMBAT from './families/combat.js';
import COMMAND from './families/command.js';
import FIRE from './families/fire.js';
import FI from './families/flight_inspection.js';
import HADR from './families/hadr.js';
import HEMS from './families/hems.js';
import ISR from './families/isr.js';
import LE from './families/law_enforcement.js';
import MARITIME from './families/maritime.js';
import SAR from './families/sar.js';
import SOF from './families/sof.js';
import SPECIAL from './families/special.js';
import SURVEY from './families/survey.js';

export const meta = {
  id: 'report',
  apps: ['pilot'],
  level: 1,
  reads: ['cr/', 'pilot/', 'cache/report/'],
  writes: [{
    prefix: 'cr/reports/',
    merge: 'record'
  }, {
    prefix: 'pilot/', // le vol courant : started et progress remis à null quand le CR d'un vol démarré est enregistré
    merge: 'record'
  }, {
    prefix: 'cache/report/',
    policy: 'cache'
  }, {
    prefix: 'pilot/handoff.json',
    policy: 'cache'
  }],
  files: ['vocab.js', 'model.js', 'fpl.js', 'text_import.js', '../../frame/lib/last_flight.js', '../../frame/lib/current_flight.js',
    '../../frame/lib/route_text.js',
    '../../frame/lib/website.js',
    'families/aar.js',
    'families/airborne.js', 'families/airlift.js', 'families/combat.js', 'families/command.js', 'families/fire.js',
    'families/flight_inspection.js', 'families/hadr.js', 'families/hems.js', 'families/isr.js', 'families/law_enforcement.js',
    'families/maritime.js', 'families/sar.js', 'families/sof.js', 'families/special.js', 'families/survey.js', '../../frame/lib/dom.js',
    '../../frame/lib/clipboard.js', '../../frame/lib/time.js'
  ]
};

const FAMILIES = {
    AAR,
    AIRBORNE,
    AIRLIFT,
    COMBAT,
    COMMAND,
    FIRE,
    FI,
    HADR,
    HEMS,
    ISR,
    LE,
    MARITIME,
    SAR,
    SOF,
    SPECIAL,
    SURVEY
  },
  PREFS = 'cache/report/prefs.json',
  DRAFT = 'cache/report/draft.json',
  LAST = 'cache/report/last_flights.json',
  STARTED = 'cache/report/started.json', // vols démarrés déjà rapportés : { done: [started.at, …] }
  HANDOFF = 'pilot/handoff.json',
  SCHEMA = 'sog-report/1';

// ---------------------------------------------------------------- textes [fr, en, de, es]
const L = V.L;
const TX = {
  title: L('Compte rendu', 'Mission report', 'Einsatzbericht', 'Informe de misión'),
  steps: [L('Vol', 'Flight', 'Flug', 'Vuelo'), L('Mission', 'Mission', 'Einsatz', 'Misión'), L('Résultat', 'Result', 'Ergebnis',
    'Resultado')],
  next: L('Suivant →', 'Next →', 'Weiter →', 'Siguiente →'),
  save: L('Enregistrer', 'Save', 'Speichern', 'Guardar'),
  saveEdit: L('Enregistrer les modifications', 'Save changes', 'Änderungen speichern', 'Guardar cambios'),
  saved: L('CR {id} enregistré : il partira à la prochaine synchronisation.',
    'Report {id} saved: it will leave at the next synchronisation.',
    'Bericht {id} gespeichert: er geht bei der nächsten Synchronisation hinaus.',
    'Informe {id} guardado: saldrá en la próxima sincronización.'),
  newReport: L('Nouveau CR', 'New report', 'Neuer Bericht', 'Nuevo informe'),
  recent: L('Mes derniers CR', 'My last reports', 'Meine letzten Berichte', 'Mis últimos informes'),
  noRecent: L('Aucun CR enregistré.', 'No report saved.', 'Kein Bericht gespeichert.', 'Ningún informe guardado.'),
  editing: L('Modification de {id}', 'Editing {id}', 'Bearbeitung von {id}', 'Edición de {id}'),
  draft: L('Brouillon repris ({d}).', 'Draft restored ({d}).', 'Entwurf wiederhergestellt ({d}).', 'Borrador recuperado ({d}).'),
  current: L('Vol en cours (carburant / carte)', 'Current flight (fuel / maps)', 'Aktueller Flug (Kraftstoff / Karte)',
    'Vuelo actual (combustible / mapa)'),
  use: L('Utiliser', 'Use', 'Übernehmen', 'Usar'),
  prefilledFrom: L('Prérempli depuis : {s}', 'Prefilled from: {s}', 'Vorausgefüllt aus: {s}', 'Rellenado desde: {s}'),
  enteredLocal: L('saisi {t} locale', 'entered {t} local', 'lokal eingegeben {t}', 'introducido {t} local'),
  startedAt: L('Vol démarré à {t}', 'Flight started at {t}', 'Flug gestartet um {t}', 'Vuelo iniciado a las {t}'),
  takenBlock: L('carburant bloc {f}', 'block fuel {f}', 'Blockkraftstoff {f}', 'combustible bloque {f}'),
  takenAltn: L('dégagement {a}', 'alternate {a}', 'Ausweich {a}', 'alternativo {a}'),
  srcStarted: L('Vol démarré (carburant)', 'Flight started (fuel)', 'Flug gestartet (Kraftstoff)', 'Vuelo iniciado (combustible)'),
  srcQuote: L('Devis carburant', 'Fuel quote', 'Kraftstoffkalkulation', 'Cálculo de combustible'),
  filled: L('{n} champ(s) rempli(s) depuis {s}.', '{n} field(s) filled from {s}.', '{n} Feld(er) aus {s} ausgefüllt.',
    '{n} campo(s) rellenado(s) desde {s}.'),
  nothing: L('Rien à reprendre : les champs sont déjà remplis.', 'Nothing to take: the fields are already filled.',
    'Nichts zu übernehmen: die Felder sind schon ausgefüllt.', 'Nada que tomar: los campos ya están rellenados.'),
  more: L('Plus de champs', 'More fields', 'Weitere Felder', 'Más campos'),
  dep: L('Départ (OACI)', 'Departure (ICAO)', 'Abflug (ICAO)', 'Salida (OACI)'),
  arr: L('Arrivée (OACI)', 'Arrival (ICAO)', 'Ankunft (ICAO)', 'Llegada (OACI)'),
  family: L('Famille', 'Family', 'Familie', 'Familia'),
  tasking: L('Tâche / ordre de mission', 'Task / mission order', 'Auftrag / Einsatzbefehl', 'Tarea / orden de misión'),
  crew: L('Équipage', 'Crew', 'Besatzung', 'Tripulación'),
  addCrew: L('+ Membre', '+ Member', '+ Mitglied', '+ Miembro'),
  remove: L('Retirer', 'Remove', 'Entfernen', 'Quitar'),
  fuel: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'),
  missing: L('À compléter (non bloquant) : {l}.', 'To complete (not blocking): {l}.', 'Zu ergänzen (nicht blockierend): {l}.',
    'Por completar (no bloqueante): {l}.'),
  complete: L('Rien ne manque.', 'Nothing is missing.', 'Nichts fehlt.', 'No falta nada.'),
  issues: {
    dateInvalid: L('date invalide', 'invalid date', 'ungültiges Datum', 'fecha no válida'),
    future: L('date dans le futur', 'date in the future', 'Datum in der Zukunft', 'fecha futura'),
    invalid: L('heure invalide ({v})', 'invalid time ({v})', 'ungültige Uhrzeit ({v})', 'hora no válida ({v})'),
    order: L('heures dans le désordre ({v} avant {o})', 'times out of order ({v} before {o})',
      'Zeiten in falscher Reihenfolge ({v} vor {o})',
      'horas desordenadas ({v} antes de {o})'),
    span: L('chronologie de plus de 20 h', 'timeline longer than 20 h', 'Zeitleiste länger als 20 h', 'cronología de más de 20 h'),
    fuel: L('carburant final supérieur au départ', 'final fuel above the start', 'Endkraftstoff über dem Start',
      'combustible final superior al inicial')
  },
  need: {
    reg: L('immatriculation', 'registration', 'Kennzeichen', 'matrícula'),
    times: L('décollage et atterrissage', 'take-off and landing', 'Start und Landung', 'despegue y aterrizaje'),
    crew: L('équipage', 'crew', 'Besatzung', 'tripulación'),
    fuel: L('carburant départ et arrivée', 'fuel at start and landing', 'Kraftstoff Start und Landung', 'combustible inicial y final'),
    outcome: L('résultat', 'outcome', 'Ergebnis', 'resultado'),
    mission: L('mission (famille et série reprises par défaut, pas encore vues)',
      'mission (family and series taken by default, not seen yet)',
      'Mission (Familie und Serie standardmäßig übernommen, noch nicht angesehen)',
      'misión (familia y serie tomadas por defecto, aún no vistas)')
  },
  toSee: L('à voir', 'to check', 'prüfen', 'por ver'),
  warnings: L('Vérifier : {l}.', 'Check: {l}.', 'Prüfen: {l}.', 'Comprobar: {l}.'),
  // sources du préremplissage
  sources: L('Autres sources', 'Other sources', 'Andere Quellen', 'Otras fuentes'),
  lastIvao: L('Mon dernier vol IVAO', 'My last IVAO flight', 'Mein letzter IVAO-Flug', 'Mi último vuelo IVAO'),
  lastVatsim: L('Mon dernier vol VATSIM', 'My last VATSIM flight', 'Mein letzter VATSIM-Flug', 'Mi último vuelo VATSIM'),
  simbrief: L('Plan de vol SimBrief', 'SimBrief flight plan', 'SimBrief-Flugplan', 'Plan de vuelo SimBrief'),
  paste: L('Coller un plan de vol, une page du tracker ou un METAR', 'Paste a flight plan, a tracker page or a METAR',
    'Flugplan, Tracker-Seite oder METAR einfügen', 'Pegar un plan de vuelo, una página del tracker o un METAR'),
  analyse: L('Analyser', 'Analyse', 'Auswerten', 'Analizar'),
  lastOn: L('Dernier vol {net}', 'Last flight on {net}', 'Letzter Flug auf {net}', 'Último vuelo en {net}'),
  choose: L('Plusieurs vols ces 7 jours : lequel ?', 'Several flights in the last 7 days: which one?',
    'Mehrere Flüge in den letzten 7 Tagen: welcher?',
    'Varios vuelos en los últimos 7 días: ¿cuál?'),
  none: L('Aucun vol {net} ces 7 derniers jours ({id}).', 'No {net} flight in the last 7 days ({id}).',
    'Kein {net}-Flug in den letzten 7 Tagen ({id}).',
    'Ningún vuelo {net} en los últimos 7 días ({id}).'),
  offline: L('Hors ligne : rien n’a été demandé.', 'Offline: nothing was requested.', 'Offline: nichts wurde angefragt.',
    'Sin conexión: no se pidió nada.'),
  needRelay: L('{net} n’est joignable que par le lanceur (clé, relais) : collez plutôt la page du vol.',
    '{net} can only be reached through the launcher (key, relay): paste the flight page instead.',
    '{net} ist nur über den Starter erreichbar (Schlüssel, Relais): stattdessen die Flugseite einfügen.',
    '{net} solo es accesible a través del lanzador (clave, relé): pegue la página del vuelo.'),
  netError: L('{net} n’a pas répondu ({e}).', '{net} did not answer ({e}).', '{net} hat nicht geantwortet ({e}).',
    '{net} no respondió ({e}).'),
  unknown: L('Texte non reconnu (plan de vol OACI, page du tracker IVAO ou StatSim, METAR).',
    'Text not recognised (ICAO flight plan, IVAO tracker or StatSim page, METAR).',
    'Text nicht erkannt (ICAO-Flugplan, IVAO-Tracker- oder StatSim-Seite, METAR).',
    'Texto no reconocido (plan de vuelo OACI, página del tracker IVAO o StatSim, METAR).'),
  replace: L('Remplacer les {n} champs déjà saisis', 'Replace the {n} fields already filled',
    'Die {n} bereits ausgefüllten Felder ersetzen',
    'Sustituir los {n} campos ya rellenados'),
  noId: L('Identifiant {net} à régler (⚙).', '{net} identifier to set (⚙).', '{net}-Kennung einstellen (⚙).',
    'Identificador {net} por ajustar (⚙).'),
  handoff: L('Repris de {s}', 'Taken from {s}', 'Übernommen aus {s}', 'Tomado de {s}'),
  // site de la compagnie
  saveSite: L('Enregistrer et inscrire sur le site', 'Save and record on the website', 'Speichern und auf der Website eintragen',
    'Guardar y registrar en el sitio'),
  siteUnset: L('adresse du site non réglée', 'website address not set', 'Website-Adresse nicht eingestellt',
    'dirección del sitio no ajustada'),
  onSite: L('Sur le site de la compagnie', 'On the airline website', 'Auf der Website der Fluggesellschaft',
    'En el sitio de la aerolínea'),
  siteHelp: L(
    '« Enregistrer et inscrire sur le site » ouvre le formulaire « Ajouter un vol » du site avec ce vol ; connectez-vous au besoin, puis lancez le favori « → Vol » : il remplit le formulaire sans le valider. Relisez, puis « Valider » sur le site.',
    '“Save and record on the website” opens the website’s “Add a flight” form with this flight; log in if needed, then run the “→ Vol” bookmark: it fills the form without submitting it. Check, then “Valider” on the website.',
    '„Speichern und auf der Website eintragen“ öffnet das Formular „Flug hinzufügen“ der Website mit diesem Flug; bei Bedarf anmelden, dann das Lesezeichen „→ Vol“ starten: es füllt das Formular aus, ohne es abzusenden. Prüfen, dann auf der Website „Valider“.',
    '«Guardar y registrar en el sitio» abre el formulario «Añadir un vuelo» del sitio con este vuelo; inicie sesión si hace falta y lance el marcador «→ Vol»: rellena el formulario sin enviarlo. Revise y pulse «Valider» en el sitio.'
  ),
  bookmark: L('Favori « → Vol » : glissez-le dans la barre des favoris.', 'Bookmark “→ Vol”: drag it to the bookmarks bar.',
    'Lesezeichen „→ Vol“: in die Lesezeichenleiste ziehen.', 'Marcador «→ Vol»: arrástrelo a la barra de marcadores.'),
  bookmarkClick: L('À lancer depuis la barre des favoris, sur le site.', 'Run it from the bookmarks bar, on the website.',
    'Auf der Website aus der Lesezeichenleiste starten.', 'Láncelo desde la barra de marcadores, en el sitio.'),
  copyFields: L('Copier les champs', 'Copy the fields', 'Felder kopieren', 'Copiar los campos'),
  copied: L('Champs copiés : {l}', 'Fields copied: {l}', 'Felder kopiert: {l}', 'Campos copiados: {l}'),
  copyManual: L('Copie impossible ici : la ligne est sélectionnée sous le bouton, copiez-la (Ctrl+C ou appui long).',
    'Copying is not possible here: the line is selected under the button, copy it (Ctrl+C or long press).',
    'Kopieren ist hier nicht möglich: Die Zeile ist unter der Schaltfläche markiert, kopieren Sie sie (Strg+C oder lange drücken).',
    'Aquí no se puede copiar: la línea está seleccionada bajo el botón, cópiela (Ctrl+C o pulsación larga).')
};
// champs communs du CR court (libellés de shared/mission_core/blocks.js)
const f = (path, label, type = 'text', extra = {}) => ({
  path,
  label,
  type,
  ...extra
});
const FIELDS = {
  date: f('metadata.date', L('Date', 'Date', 'Datum', 'Fecha'), 'date'),
  registration: f('aircraft.0.registration', L('Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'), 'text', {
    code: true
  }),
  type: f('aircraft.0.type', L('Type (OACI)', 'Type (ICAO)', 'Muster (ICAO)', 'Tipo (OACI)'), 'text', {
    code: true
  }),
  callsign: f('aircraft.0.callsign', L('Indicatif complet', 'Full callsign', 'Vollständiges Rufzeichen', 'Indicativo completo'), 'text', {
    code: true
  }),
  dep: f('navigation.dep', TX.dep, 'text', {
    code: true
  }),
  arr: f('navigation.arr', TX.arr, 'text', {
    code: true
  }),
  engineStart: f('timeline.engineStart', L('Mise en route', 'Engine start', 'Anlassen', 'Puesta en marcha'), 'time'),
  takeoff: f('timeline.takeoff', L('Décollage', 'Take-off', 'Start', 'Despegue'), 'time'),
  landing: f('timeline.landing', L('Atterrissage', 'Landing', 'Landung', 'Aterrizaje'), 'time'),
  shutdown: f('timeline.shutdown', L('Arrêt moteurs', 'Shutdown', 'Abstellen', 'Parada de motores'), 'time'),
  callsignPrefix: f('aircraft.0.callsignPrefix', L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'), 'text', {
    code: true
  }),
  callsignNumber: f('aircraft.0.callsignNumber', L('Numéro', 'Number', 'Nummer', 'Número')),
  callsignFpl: f('aircraft.0.callsignFpl', L('Indicatif plan de vol (7 car. max)', 'Flight plan callsign (7 chars max)',
    'Flugplan-Rufzeichen (max. 7 Zeichen)', 'Indicativo plan de vuelo (máx. 7 car.)'), 'text', {
    code: true
  }),
  baseDeparture: f('aircraft.0.baseDeparture', L('Base de départ', 'Departure base', 'Startbasis', 'Base de salida'), 'text', {
    code: true
  }),
  baseReturn: f('aircraft.0.baseReturn', L('Base de retour', 'Return base', 'Rückkehrbasis', 'Base de regreso'), 'text', {
    code: true
  }),
  landingAd: f('aircraft.0.landingAd', L('Terrain d’atterrissage réel (OACI)', 'Actual landing aerodrome (ICAO)',
    'Tatsächlicher Landeflugplatz (ICAO)', 'Aeródromo de aterrizaje real (OACI)'), 'text', {
    code: true
  }),
  altn: f('navigation.altn', L('Dégagement (ALTN)', 'Alternate (ALTN)', 'Ausweichflugplatz (ALTN)', 'Alternativo (ALTN)'), 'text', {
    code: true
  }),
  series: f('series', L('Série', 'Series', 'Serie', 'Serie'), 'select'),
  missionNumber: f('metadata.missionNumber', L('Mission (identifiant)', 'Mission (identifier)', 'Einsatz (Kennung)',
    'Misión (identificador)'), 'text', {
    code: true
  }),
  objective: f('tasking.objective', L('Objectif', 'Objective', 'Ziel', 'Objetivo'), 'textarea'),
  instructions: f('tasking.instructions', L('Instructions particulières', 'Special instructions', 'Besondere Anweisungen',
    'Instrucciones especiales'), 'textarea'),
  priority: f('tasking.priority', L('Priorité', 'Priority', 'Priorität', 'Prioridad')),
  outcome: f('results.outcome', L('Résultat', 'Outcome', 'Ergebnis', 'Resultado'), 'select', {
    options: V.outcomes,
    blank: true
  }),
  observations: f('remarks.observations', L('Observations', 'Observations', 'Beobachtungen', 'Observaciones'), 'textarea'),
  fuelUnit: f('fuel.unit', L('Unité', 'Unit', 'Einheit', 'Unidad'), 'select', {
    options: V.fuelUnits
  }),
  fuelStart: f('fuel.start', L('FOB départ', 'FOB start', 'FOB Start', 'FOB inicial'), 'number'),
  fuelLanding: f('fuel.landing', L('À l’atterrissage', 'At landing', 'Bei der Landung', 'Al aterrizaje'), 'number')
};

// ---------------------------------------------------------------- état (un montage à la fois)
let S = null;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Texte d'une ligne [fr, en, de, es] dans la langue de l'appli. */
const tt = (row, v) => S.ctx.t(row, v);
/** Aujourd'hui, AAAA-MM-JJ (heure locale). */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Aujourd'hui en UTC, AAAA-MM-JJ : le jour d'un CR aux heures UTC (timeline.tz = 'Z'). */
const todayZ = () => new Date().toISOString().slice(0, 10);
/** Heures de la frise (timeline.*) : en UTC dans un CR marqué timeline.tz = 'Z'. */
const TIME_KEYS = ['briefing', 'engineStart', 'offBlock', 'takeoff', 'zoneEntry', 'missionStart', 'missionEnd', 'zoneExit',
  'landing', 'onBlock', 'shutdown'
];
/** « HH:MM » UTC d'un instant (ISO, nombre ou Date) ; vide s'il est illisible. */
const hhmmZ = iso => fmtZ(iso).slice(0, 5);
/** CR sans le marqueur timeline.tz (V2, anciens V3) : ses heures sont celles de l'appareil ; converties en UTC en
 *  mémoire (le jour du CR comme date), le marqueur posé. Le jour du CR ne bouge pas, même si la première heure tombe
 *  la veille en UTC : il fait partie de la clé du registre V2 (famille | n° | date), le pont créerait un doublon.
 *  S.tzOrigin garde ce qui a été saisi, pour « saisi 18:30 locale ». Rien n'est écrit : le CR n'est réécrit (en UTC,
 *  marqué) que s'il est enregistré. */
function toZ(m) {
  S.tzOrigin = {};
  const t = m.timeline || (m.timeline = {});
  if (t.tz === 'Z') return m;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(m.metadata?.date || '') ? m.metadata.date : today();
  for (const k of TIME_KEYS) {
    const v = String(t[k] || '');
    if (!/^\d{2}:\d{2}$/.test(v)) continue;
    const d = new Date(`${day}T${v}:00`); // heure de l'appareil, ce jour-là (heure d'été comprise)
    if (!Number.isFinite(d.getTime())) continue;
    S.tzOrigin[`timeline.${k}`] = v;
    t[k] = hhmmZ(d);
  }
  t.tz = 'Z';
  return m;
}
/** Valeur vide (chaîne vide, null, indéfinie) ? */
const empty = v => v === undefined || v === null || v === '';

// ---------------------------------------------------------------- données
/** Chemin d'un CR : cr/reports/<année de sa date>/<n° de CR>.json. */
const reportPath = m => `cr/reports/${(m.metadata.date || today()).slice(0, 4)}/${m.metadata.missionId}.json`;
/** Numéros de CR déjà pris : ceux de cr/reports/ (noms de fichiers) et ceux du registre V2 cr/missions.yaml. */
async function knownIds() {
  const ids = ((await S.ctx.data.list('cr/reports/')) || []).map(p => p.split('/').pop().replace(/\.json$/, '')),
    yaml = await S.ctx.data.get('cr/missions.yaml');
  if (typeof yaml === 'string')
    for (const m of yaml.matchAll(/missionId:\s*['"]?(CR[A-Z]-[A-Z0-9]+-\d+)/g)) ids.push(m[1]);
  return ids;
}
/** Mes derniers CR (les dix plus récents de cr/reports/, par nom de chemin : année puis numéro). */
async function recentReports() {
  const paths = ((await S.ctx.data.list('cr/reports/')) || []).filter(p => p.endsWith('.json')).sort().reverse().slice(0, 30),
    out = [];
  for (const p of paths) {
    const r = await S.ctx.data.get(p);
    if (r && (!S.ctx.identity.trigram || !r.by || r.by === S.ctx.identity.trigram)) out.push({
      path: p,
      r
    });
  }
  return out.sort((a, b) => String(b.r.updated_at || '').localeCompare(String(a.r.updated_at || ''))).slice(0, 10);
}
/** CR neuf : mission vide de la famille (première série, date du jour, catégorie de la famille, moi commandant de bord,
 *  identifiants réseau de l'identité) — le fresh() de la V2 sans le registre ni la météo. */
function freshMission(fam = 'HEMS') {
  S.tzOrigin = {};
  const F = FAMILIES[fam],
    m = M.emptyMission(fam);
  m.series = F.series?.[0]?.value || '';
  m.metadata.date = todayZ();
  m.timeline.tz = 'Z'; // heures du CR en UTC (règle de l'appli Pilote)
  m.aircraft[0].category = F.defaultCategory || '';
  const tri = S.ctx.identity.trigram || '';
  if (tri) m.crew = [{
    role: 'PIC',
    name: tri,
    aircraft: 1,
    notes: ''
  }];
  m.network.ivaoId = S.ctx.identity.ivao || '';
  m.network.vatsimId = S.ctx.identity.vatsim || '';
  return m;
}
/** Brouillon écrit sur l'appareil (après un temps calme) : la mission, son chemin s'il est déjà enregistré, les sources. */
function saveDraft() {
  clearTimeout(S.draftTimer);
  const s = S;
  s.draftTimer = setTimeout(() => s.ctx.data.put(DRAFT, {
    at: new Date().toISOString(),
    path: s.path,
    mission: s.m,
    sources: s.sources,
    missionSeen: !!s.missionSeen
  }, {
    policy: 'cache'
  }), 600);
}
/** Enregistre le CR : numéro attribué au premier enregistrement (V2 : crId, toutes familles), statistiques, auteur,
 *  enregistrement JSON daté ; le brouillon est effacé, l'écran passe en modification. */
async function save() {
  const m = S.m,
    tri = S.ctx.identity.trigram || '';
  if (!S.path) {
    m.metadata.missionId = V.crId({
      family: m.family,
      missionNumber: m.metadata.missionNumber,
      crIds: await knownIds()
    });
  }
  m.statistics = M.computeStatistics(m);
  if (tri) m.metadata.reportedBy = tri;
  const path = S.path || reportPath(m),
    prev = S.path ? (await S.ctx.data.get(path)) || {} : {};
  await S.ctx.data.put(path, {
    ...prev,
    ...structuredClone(m),
    schema: SCHEMA,
    updated_at: new Date().toISOString(),
    by: tri || prev.by || ''
  });
  S.path = path;
  await S.ctx.data.remove(DRAFT).catch(() => {});
  if (S.usedStarted) { // vol démarré rapporté : la carte « Vol en cours » ne le repropose plus
    const kept = (await S.ctx.data.get(STARTED).catch(() => null))?.done || [];
    await S.ctx.data.put(STARTED, {
      done: [...new Set([...kept, S.usedStarted])].slice(-20)
    }, {
      policy: 'cache'
    });
    // le compte rendu est la fin normale d'un vol démarré : le vol courant (relu juste avant, started à null et la
    // progression prévue effacée, rien d'autre touché — progress.actual appartient au cadre) repasse en préparation —
    // carburant, Mes vols, carte et cadre le voient
    const cfPath = `pilot/${S.ctx.identity.trigram || 'ANON'}/current_flight.json`,
      cf = await S.ctx.data.get(cfPath).catch(() => null);
    if (cf?.started?.at === S.usedStarted) await S.ctx.data.put(cfPath, CF.merge(cf, {
      started: null,
      progress: null
    }, {
      fields: ['started'],
      progressKeys: CF.FUEL_PROGRESS,
      by: 'report'
    }));
    S.usedStarted = '';
  }
  await S.ctx.data.put(PREFS, {
    family: m.family
  }, {
    policy: 'cache'
  });
  S.tzOrigin = {}; // ancien CR : réécrit en UTC et marqué, les heures saisies n'ont plus à être rappelées
  S.ctx.notify(tt(TX.saved, {
    id: m.metadata.missionId
  }), 'ok');
  render();
}

// ---------------------------------------------------------------- champs
/** Libellé d'une option ou d'un champ. */
const lab = x => Array.isArray(x) ? tt(x) : String(x ?? '');
/** Contrôle HTML d'un champ (définition V2 : path, label, type, options, blank) à la valeur v ; source affichée. */
function control(fd, v, prefix = '') {
  const path = prefix + fd.path,
    common = `data-path="${esc(path)}" aria-label="${esc(lab(fd.label))}"`,
    opts = fd.path === 'series' ? (FAMILIES[S.m.family]?.series || []) : fd.options || [];
  let input;
  if (fd.type === 'select') input = `<select ${common}>${fd.blank ? '<option value=""></option>' : ''}${opts.map(o => `<option value="${esc(o.value)}"${String(v ?? '') === String(o.value) ? ' selected' : ''}>${esc(lab(o.label))}</option>`).join('')}</select>`;
  else if (fd.type === 'textarea') input = `<textarea rows="3" ${common}>${esc(v ?? '')}</textarea>`;
  else input = `<input ${common} type="${fd.type === 'time' ? 'time' : fd.type === 'date' ? 'date' : 'text'}"${fd.type === 'number' ? ' inputmode="decimal"' : ''}${fd.code ? ' class="rp-code" autocapitalize="characters"' : ''} value="${esc(v ?? '')}">`;
  const z = fd.type === 'time' && path.startsWith('timeline.') ? ' (Z)' : '';
  // libellé sur une ligne (ellipse, titre complet) ; d'où vient la valeur se lit dans la ligne de la carte (srcLine)
  return `<label class="f-field${fd.full || fd.type === 'textarea' ? ' f-full' : ''}"><span title="${esc(lab(fd.label) + z)}">${esc(lab(fd.label))}${z}</span>${input}</label>`;
}
/** Une ligne muette sous le titre d'une carte : d'où viennent les champs préremplis (« Prérempli depuis : vol en cours · dernier
 *  CR ») et, pour un ancien CR, les heures saisies en heure de l'appareil. fields : [{ path, label }], chemins complets. Vide
 *  quand rien n'est prérempli : aucun élément n'entre dans la grille des champs. */
function srcLine(fields) {
  const from = [...new Set(fields.map(x => S.sources[x.path]).filter(Boolean))],
    was = fields.filter(x => S.tzOrigin?.[x.path]).map(x => `${lab(x.label)} ${tt(TX.enteredLocal, { t: S.tzOrigin[x.path] })}`),
    parts = [from.length ? tt(TX.prefilledFrom, {
      s: from.join(' · ')
    }) : '', ...was].filter(Boolean);
  return parts.length ? `<p class="rp-src">${esc(parts.join(' · '))}</p>` : '';
}
/** Champs (chemin, libellé) d'une liste de définitions affichées. */
const shownFields = list => list.filter(shown).map(fd => ({
  path: fd.path,
  label: fd.label
}));
/** Grille de champs de la mission, sous la ligne de provenance de ses champs (line : les champs à résumer, par défaut ceux de
 *  la grille ; false pour une carte dont la ligne est déjà posée ailleurs). */
const grid = (list, line = list) => `${line ? srcLine(shownFields(line)) : ''}<div class="f-grid">${list.filter(shown).map(fd => control(fd, M.get(S.m, fd.path))).join('')}</div>`;
/** Bloc ou champ affiché pour la mission (condition when de la V2, contexte M.context : famille, série, capacités,
 *  catégories d'appareil, drapeaux). */
const shown = x => !x.when || !!x.when(M.context(S.m, FAMILIES[S.m.family] || {}));
/** Collection (destinations, équipage) : une ligne de champs par élément, ajout et retrait. */
function collection(col, title) {
  const items = M.get(S.m, col.path) || [];
  return `<div class="rp-col" data-col="${esc(col.path)}">${title ? `<h3>${esc(title)}</h3>` : ''}
    ${srcLine(items.flatMap((_, i) => col.fields.map(fd => ({ path: `${col.path}.${i}.${fd.path}`, label: fd.label }))))}
    ${items.map((it, i) => `<div class="rp-item"><div class="f-grid">${col.fields.map(fd => control(fd, it?.[fd.path], `${col.path}.${i}.`)).join('')}</div><button type="button" data-do="del" data-i="${i}">${esc(tt(TX.remove))}</button></div>`).join('')}
    <button type="button" data-do="add">${esc(col.add ? tt(col.add) : tt(TX.addCrew))}</button></div>`;
}
// équipage (bloc crew de la V2 : rôle, nom ; rôles de la famille)
const crewCol = () => ({
  path: 'crew',
  add: TX.addCrew,
  empty: () => ({
    role: '',
    name: '',
    aircraft: 1,
    notes: ''
  }),
  fields: [f('role', L('Rôle', 'Role', 'Rolle', 'Función'), 'select', {
    blank: true,
    options: V.crewRoles.filter(r => !FAMILIES[S.m.family]?.crewRoles || FAMILIES[S.m.family].crewRoles.includes(r.value))
  }), f('name', L('Nom / indicatif', 'Name / callsign', 'Name / Rufzeichen', 'Nombre / indicativo'), 'text', {
    code: true
  })]
});

// ---------------------------------------------------------------- écran
// placement seulement (primitives et jetons du cadre : frame/design/INTEGRATION.md) : codes en capitales, un pas à
// la fois sur téléphone et les trois côte à côte sur écran (barre des pas et « Suivant » alors masqués), ligne d'une
// collection, boutons de la barre, carte de préremplissage
const STYLE = `
[data-module="report"] .rp-code{text-transform:uppercase}
[data-module="report"] .rp-step[hidden]{display:none}
[data-module="report"] .f-steps>[data-todo]::after{content:" · " attr(data-todo);font-weight:400}
[data-module="report"] .rp-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;margin-bottom:8px}
[data-module="report"] .rp-src{margin:0 0 6px;color:var(--sog-muted);font-size:var(--sog-size-xs);overflow-wrap:anywhere} /* provenance du préremplissage, une ligne muette */
[data-module="report"] .rp-dock{position:sticky;bottom:var(--f-tab-space,0px);z-index:2;background:var(--sog-bg);padding-bottom:var(--sog-gap-s)} /* la barre et sa note restent ensemble en bas */
[data-module="report"] .rp-dock>.f-bar{position:static;margin:0}
[data-module="report"] .rp-unset{margin:var(--sog-gap-s) 0 0}
[data-module="report"] .f-grid{grid-template-columns:repeat(auto-fit,minmax(min(var(--f-min,130px),100%),1fr))}
[data-module="report"] .f-grid>.f-field{min-width:0;align-content:start} /* une cellule ne dépasse jamais sa colonne, ne s'étire pas avec sa voisine */
[data-module="report"] .f-field>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} /* libellé sur une ligne */
[data-module="report"] .rp-prefill>div{min-width:0}
[data-module="report"] .rp-prefill{display:flex;gap:10px;align-items:center;justify-content:space-between}
[data-module="report"] .rp-bar{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding:4px 10px} /* deux lignes de 44 px : 105 px, 112 au plus avec le filet épais de metro */
[data-module="report"] .rp-bar button{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:inherit}
[data-module="report"] .rp-bar .rp-site{background:transparent;border-color:var(--sog-accent);color:var(--sog-link)}
@container (min-width: 700px){
  [data-module="report"] .rp-bar{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@container (min-width: 900px){ /* largeur du module (volet de la vue double compris), pas de la fenêtre */
  [data-module="report"] .f-steps,[data-module="report"] .rp-next{display:none}
  [data-module="report"] .rp-step[hidden]{display:block}
}`;

/** Dessine tout l'écran sans bouger le défilement (sauf au changement de pas, qui remonte exprès en haut). */
function render() {
  return keepScroll(S.body, renderBody);
}
/** Dessine tout l'écran (étapes, champs, barre d'enregistrement). */
function renderBody() {
  const m = S.m,
    F = FAMILIES[m.family] || HEMS,
    step = S.step,
    // pas Mission jamais ouvert (famille et série d'un CR neuf prises par défaut) : « à voir » au lieu du ✓
    stepBtn = (i, ok) => `<button type="button" data-step="${i}"${i === step ? ' aria-current="step"' : ''} ${ok ? ' data-done' : ''}${i === 1 && !S.missionSeen ? ` data-todo="${esc(tt(TX.toSee))}"` : ''}>${i + 1} ${esc(tt(TX.steps[i]))}</button>`,
    done = progress(),
    site = Site.recordPage(S.ctx.airline || {}),
    flightFields = [FIELDS.date, FIELDS.registration, FIELDS.type, FIELDS.callsign, FIELDS.dep, FIELDS.arr],
    timeFields = [FIELDS.engineStart, FIELDS.takeoff, FIELDS.landing, FIELDS.shutdown];
  S.body.innerHTML = `
    <div class="f-row" style="margin-bottom:8px"><span class="f-muted">${S.path ? esc(tt(TX.editing, { id: m.metadata.missionId })) : esc(m.metadata.missionId || '')}</span>
      <button type="button" data-do="new">${esc(tt(TX.newReport))}</button></div>
    <nav class="f-steps">${[0, 1, 2].map(i => stepBtn(i, done[i])).join('')}</nav>
    <div class="f-cols">
      <section class="rp-step" data-s="0"${step === 0 ? '' : ' hidden'}>
        <div data-prefill></div><div data-sources></div>
        <div class="f-card"><h2>${esc(tt(TX.steps[0]))}</h2>
          ${grid(flightFields, [...flightFields, ...timeFields])}
          <h3>${esc(lab(L('Heures', 'Times', 'Zeiten', 'Horas')))}</h3>
          ${grid(timeFields, false)}</div>
        <details class="f-card"><summary>${esc(tt(TX.more))}</summary>${grid([FIELDS.callsignPrefix, FIELDS.callsignNumber, FIELDS.callsignFpl, FIELDS.baseDeparture, FIELDS.baseReturn, FIELDS.landingAd, FIELDS.altn])}</details>
        <details class="f-card" data-recent><summary>${esc(tt(TX.recent))}</summary><div class="f-list" data-recentlist></div></details>
        <div class="f-row rp-next"><button type="button" data-step="1">${esc(tt(TX.next))}</button></div>
      </section>
      <section class="rp-step" data-s="1"${step === 1 ? '' : ' hidden'}>
        <div class="f-card"><h2>${esc(tt(TX.steps[1]))}</h2>
          ${srcLine(shownFields([FIELDS.series, FIELDS.missionNumber]))}
          <div class="f-grid"><label class="f-field"><span>${esc(tt(TX.family))}</span><select data-family>${Object.entries(V.familyLabels).filter(([k]) => FAMILIES[k]).map(([k, l]) => `<option value="${k}"${k === m.family ? ' selected' : ''}>${esc(tt(l))}</option>`).join('')}</select></label>
          ${control(FIELDS.series, m.series)}${control(FIELDS.missionNumber, m.metadata.missionNumber)}</div></div>
        ${F.ownOrder ? '' : `<details class="f-card"><summary>${esc(tt(TX.tasking))}</summary>${grid([FIELDS.objective, FIELDS.instructions, FIELDS.priority])}</details>`}
        ${(F.blocks || []).filter(shown).map((b, i) => `<details class="f-card"${i === 0 ? ' open' : ''}><summary>${esc(tt(b.title))}</summary>${b.collection ? collection(b.collection) : grid(b.fields)}</details>`).join('')}
        <div class="f-row rp-next"><button type="button" data-step="2">${esc(tt(TX.next))}</button></div>
      </section>
      <section class="rp-step" data-s="2"${step === 2 ? '' : ' hidden'}>
        <div class="f-card"><h2>${esc(tt(TX.steps[2]))}</h2>${grid([FIELDS.outcome, FIELDS.observations])}</div>
        <div class="f-card">${collection(crewCol(), tt(TX.crew))}</div>
        <div class="f-card"><h2>${esc(tt(TX.fuel))}</h2>${grid([FIELDS.fuelUnit, FIELDS.fuelStart, FIELDS.fuelLanding])}</div>
        <div class="f-card" data-check></div>
        <details class="f-card"><summary>${esc(tt(TX.onSite))}</summary><p class="f-muted">${esc(tt(TX.siteHelp))}</p>
          <p>${esc(tt(TX.bookmark))} <a class="f-btn" href="${esc(Site.BOOKMARKLET)}" data-mark>→ Vol</a></p>
          <button type="button" data-do="copyfields">${esc(tt(TX.copyFields))}</button></details>
      </section>
    </div>
    <div class="rp-dock"><div class="f-bar rp-bar"><button type="button" class="primary" data-do="save">${esc(tt(S.path ? TX.saveEdit : TX.save))}</button>
      <button type="button" class="rp-site" data-do="savesite" title="${esc(tt(site ? TX.saveSite : TX.siteUnset))}"${site ? '' : ' disabled aria-describedby="rpUnset"'}>${esc(tt(TX.saveSite))}</button></div>
      ${site ? '' : `<p class="rp-src rp-unset" id="rpUnset">${esc(tt(TX.siteUnset))}</p>`}</div>`;
  // module large (tous les pas affichés, sans barre de pas) : le pas Mission est sous les yeux, donc vu
  if (!S.missionSeen && S.body.querySelector('.rp-step[data-s="1"]')?.offsetParent) S.missionSeen = true;
  const mark = S.body.querySelector('[data-mark]');
  if (mark) mark.onclick = e => {
    e.preventDefault(); // depuis la barre des favoris seulement
    S.ctx.notify(tt(TX.bookmarkClick), 'info');
  };
  check();
  prefillCard();
  sourcesCard();
  const rd = S.body.querySelector('[data-recent]');
  rd.ontoggle = () => rd.open && showRecent();
}
/** Avancement des trois pas (repères ✓ de la V2) : vol = immatriculation et décollage + atterrissage ; mission = série ;
 *  résultat = résultat. */
function progress() {
  const m = S.m,
    a = m.aircraft?.[0] || {},
    t = m.timeline || {};
  return [!!(a.registration || a.type && a.callsign) && !!(t.takeoff && t.landing), !!m.series && !!S.missionSeen, !!m.results
    ?.outcome
  ];
}
/** Ce qui manque (non bloquant) et les contrôles de cohérence de la V2, au pas Résultat. */
function check() {
  const box = S.body?.querySelector('[data-check]');
  if (!box) return;
  const m = S.m,
    a = m.aircraft?.[0] || {},
    t = m.timeline || {},
    need = [];
  if (!a.registration) need.push(tt(TX.need.reg));
  if (!t.takeoff || !t.landing) need.push(tt(TX.need.times));
  if (!(m.crew || []).some(c => c.name)) need.push(tt(TX.need.crew));
  if (empty(m.fuel?.start) || empty(m.fuel?.landing)) need.push(tt(TX.need.fuel));
  if (!m.results?.outcome) need.push(tt(TX.need.outcome));
  if (!S.missionSeen) need.push(tt(TX.need.mission));
  const issues = M.checkMission(m).map(i => tt(TX.issues[i.kind] || TX.issues.invalid, {
    v: i.value,
    o: i.other
  }));
  box.innerHTML = `<p class="f-muted">${esc(need.length ? tt(TX.missing, { l: need.join(', ') }) : tt(TX.complete))}</p>${issues.length ? `<p class="f-warn">${esc(tt(TX.warnings, { l: issues.join(' ; ') }))}</p>` : ''}`;
}
/** Carte « Vol en cours » : le vol partagé par carburant et carte (pilot/<trigramme>/current_flight.json), s'il a un
 *  appareil ou une route ; « Utiliser » remplit les champs vides. Un vol démarré dans le carburant (started) est
 *  proposé d'abord, « Vol démarré à hh:mm », avant le dernier vol réseau ; une fois son compte rendu enregistré, il
 *  n'est plus proposé (started.at gardé dans cache/report/started.json). */
async function prefillCard() {
  const box = S.body?.querySelector('[data-prefill]');
  if (!box) return;
  const cf = await S.ctx.data.get(`pilot/${S.ctx.identity.trigram || 'ANON'}/current_flight.json`),
    done = (await S.ctx.data.get(STARTED).catch(() => null))?.done || [],
    started = cf?.started?.at || '';
  S.current = cf && (cf.aircraft?.registration || cf.aircraft?.type || cf.route?.dep) && !(started && done.includes(started)) ? cf :
    null;
  if (!S.current || !S.body) return box.innerHTML = '';
  const a = cf.aircraft || {},
    r = cf.route || {},
    title = started ? tt(TX.startedAt, {
      t: fmtZLocal(started) // mise en route : l'heure UTC et celle de l'appareil
    }) : tt(TX.current);
  const q = cf.quote || {},
    taken = [a.registration, a.callsign, a.type, [r.dep, r.arr].filter(Boolean).join(' → '), r.altn ? tt(TX.takenAltn, {
      a: r.altn
    }) : '', r.distanceNm > 0 ? `${Math.round(r.distanceNm)} NM` : '', cf.level?.ft > 0 ? formatLevel(cf.level.ft) : '', q.block > 0 ? tt(TX.takenBlock, {
      f: `${q.block.toLocaleString(S.ctx.lang())} ${q.unit || 'kg'}`
    }) : ''];
  // ce qui est repris, en une ligne, même ce que la famille n'a pas de champ pour montrer (distance, niveau)
  box.innerHTML = `<div class="f-card f-accent rp-prefill"><div><b>${esc(title)}</b><div class="f-muted">${esc(taken.filter(Boolean).join(' · '))}</div></div>
    <button type="button" class="primary" data-do="current">${esc(tt(TX.use))}</button></div>`;
}
/** Carte des sources : le dernier vol proposé (réseau de l'identité), les autres sources, le collage, le choix d'un vol
 *  parmi plusieurs, « Remplacer les champs déjà saisis » après une reprise. */
function sourcesCard() {
  const box = S.body?.querySelector('[data-sources]');
  if (!box) return;
  const id = S.ctx.identity,
    p = S.proposal,
    when = v => v ? fmtDateZ(v, S.ctx.lang()) : '',
    flight = (net, f) => `${esc(f.callsign)} · ${esc([f.dep, f.arr].filter(Boolean).join(' → ') || '—')} · ${esc(when(f.start))}${f.open ? ' …' : ''}`;
  box.innerHTML = `${p?.flights?.length ? `<div class="f-card f-accent rp-prefill"><div><b>${esc(tt(TX.lastOn, { net: p.label }))}</b><div class="f-muted">${flight(p.net, p.flights[0])}</div></div>
      <button type="button" class="primary" data-do="pick" data-net="${p.net}" data-id="${esc(p.flights[0].id)}">${esc(tt(TX.use))}</button></div>` : ''}
    ${S.choices ? `<div class="f-card"><p class="f-muted">${esc(tt(TX.choose))}</p><div class="f-list">${S.choices.flights.map(f => `<button type="button" class="f-item" data-do="pick" data-net="${S.choices.net}" data-id="${esc(f.id)}">${flight(S.choices.net, f)}</button>`).join('')}</div></div>` : ''}
    ${S.kept ? `<div class="f-row" style="margin-bottom:var(--sog-gap)"><button type="button" data-do="replace">${esc(tt(TX.replace, { n: S.kept.n }))}</button></div>` : ''}
    <details class="f-card"${S.pasteOpen ? ' open' : ''} data-sourcebox><summary>${esc(tt(TX.sources))}</summary>
      <div class="f-row">
        <button type="button" data-do="net" data-net="ivao">${esc(tt(TX.lastIvao))}</button>
        <button type="button" data-do="net" data-net="vatsim">${esc(tt(TX.lastVatsim))}</button>
        <button type="button" data-do="simbrief">${esc(tt(TX.simbrief))}</button>
      </div>
      <label class="f-field"><span>${esc(tt(TX.paste))}</span><textarea rows="4" data-paste></textarea></label>
      <button type="button" data-do="analyse">${esc(tt(TX.analyse))}</button>
    </details>`;
  box.querySelector('[data-sourcebox]').ontoggle = e => S.pasteOpen = e.target.open;
  void id;
}

// ---------------------------------------------------------------- préremplissage par le réseau et le collage
const NETS = {
  ivao: {
    label: 'IVAO',
    id: () => S.ctx.identity.ivao,
    list: LF.ivaoFlights,
    one: (g, id, f) => LF.ivaoFlight(g, f)
  },
  vatsim: {
    label: 'VATSIM',
    id: () => S.ctx.identity.vatsim,
    list: LF.vatsimFlights,
    one: (g, id, f) => LF.vatsimFlight(g, id, f)
  }
};
/** JSON d'une adresse par ctx.net ; erreur { code } : offline (pas de réseau), relay (site joignable seulement par le
 *  lanceur, ou clé refusée), http. */
async function getJson(url) {
  const r = await S.ctx.net.fetch(url, {
      headers: {
        accept: 'application/json'
      }
    }),
    fail = (code, msg) => Object.assign(new Error(msg || code), {
      code
    });
  if (r.headers.get('x-sog-offline')) throw fail('offline');
  if (r.headers.get('x-sog-unreachable') || r.status === 401 || r.status === 403) throw fail('relay');
  if (!r.ok) throw fail('http', `HTTP ${r.status}`);
  return r.json();
}
/** Message d'une erreur réseau pour la source net (libellé). */
function netNotice(e, net) {
  if (e.code === 'offline') return S.ctx.notify(tt(TX.offline), 'warn');
  if (e.code === 'relay') {
    S.pasteOpen = true;
    sourcesCard();
    return S.ctx.notify(tt(TX.needRelay, {
      net
    }), 'warn');
  }
  S.ctx.notify(tt(TX.netError, {
    net,
    e: e.message || e
  }), 'err');
}
/** Vols des 7 derniers jours sur un réseau (gardés deux minutes sur l'appareil) ; null en cas d'échec (dit). */
async function flightsOf(net, quiet = false) {
  const N = NETS[net],
    id = String(N.id() || '').trim();
  if (!id) return quiet ? null : S.ctx.notify(tt(TX.noId, {
    net: N.label
  }), 'warn');
  const kept = await S.ctx.data.get(LAST);
  if (kept?.[net]?.id === id && Date.now() - Date.parse(kept[net].at) < 120000) return kept[net].list;
  try {
    const list = await N.list(getJson, id);
    if (list.flights.length) await S.ctx.data.put(LAST, {
      ...kept,
      [net]: {
        id,
        at: new Date().toISOString(),
        list
      }
    }, {
      policy: 'cache'
    });
    return list;
  } catch (e) {
    if (!quiet) netNotice(e, N.label);
    return null;
  }
}
/** Reprend un résultat analysé (text_import.js) dans les champs vides : heures et jour en UTC, seuils
 *  hélicoptère si l'appareil est à voilure tournante ; source notée par champ ; « Remplacer » proposé pour les champs
 *  déjà saisis qui différaient. replace : remplace aussi les champs déjà saisis. */
function importResult(result, source, replace = false) {
  const res = T.apply(S.m, result, {
    tz: 'UTC', // heures du CR en UTC (timeline.tz = 'Z')
    rotary: (S.m.aircraft?.[0]?.category || FAMILIES[S.m.family]?.defaultCategory) === 'rotary',
    today: todayZ(),
    replace
  });
  for (const path of res.done) S.sources[path] = source;
  S.kept = !replace && res.kept.length ? {
    result,
    source,
    n: res.kept.length
  } : null;
  S.choices = null;
  S.ctx.notify([res.done.length ? tt(TX.filled, {
    n: res.done.length,
    s: source
  }) : tt(TX.nothing), ...res.notes].join(' — '), res.done.length ? 'ok' : 'info');
  saveDraft();
  render();
}
/** Vol choisi (réseau, identifiant de vol) : détail lu puis repris. */
async function pickFlight(net, flightId) {
  const N = NETS[net];
  try {
    const got = await N.one(getJson, String(N.id() || '').trim(), flightId),
      fpl = got.fplText ? T.parseFpl(got.fplText) : null;
    if (fpl && !got.equipKnown) fpl.equipment = [];
    importResult({
      ...got,
      fpl
    }, N.label);
  } catch (e) {
    netNotice(e, N.label);
  }
}
/** Demande des vols d'un réseau : un seul → repris aussitôt, plusieurs → liste à choisir, aucun → dit. */
async function askNetwork(net) {
  const N = NETS[net],
    list = await flightsOf(net);
  if (!list) return;
  if (!list.flights.length) return S.ctx.notify(tt(TX.none, {
    net: N.label,
    id: list.id
  }), 'info');
  if (list.flights.length === 1) return pickFlight(net, list.flights[0].id);
  S.choices = {
    net,
    flights: list.flights
  };
  sourcesCard();
}
/** Proposition du dernier vol au montage : réseau de l'identité (IVAO d'abord), sans message en cas d'échec. */
async function propose() {
  for (const net of ['ivao', 'vatsim']) {
    if (!NETS[net].id() || !S.ctx.net?.online?.()) continue;
    const list = await flightsOf(net, true);
    if (!S?.body) return;
    if (list?.flights?.length) {
      S.proposal = {
        net,
        label: NETS[net].label,
        flights: list.flights
      };
      return sourcesCard();
    }
  }
}
/** Passage d'un autre module (#report?from=…) : pilot/handoff.json destiné à report, repris puis effacé (lu à chaque
 *  montage : l'adresse seule ne suffit pas, le cadre peut ouvrir le module sans elle). */
async function takeHandoff() {
  const h = await S.ctx.data.get(HANDOFF);
  if (!h || h.to !== 'report') return;
  await S.ctx.data.remove(HANDOFF).catch(() => {});
  // { open: chemin } : rouvrir ce CR ; { fresh: true } : nouveau CR (dans la famille proposée), puis les valeurs
  if (h.open) return openReport(h.open);
  if (h.fresh) {
    S.m = freshMission(FAMILIES[h.family] ? h.family : S.m.family);
    S.missionSeen = false;
    S.path = null;
    S.sources = {};
    S.step = 0;
    // la date du jour d'un CR neuf cède à celle du vol passé (V2 : setDate)
    if (h.values?.['metadata.date']) S.m.metadata.date = '';
  }
  if (h.values) fill(h.values, tt(TX.handoff, {
    s: h.source || h.from || ''
  }));
  else render();
}
/** Rouvre un CR enregistré (chemin de cr/reports/) pour modification. */
async function openReport(path) {
  const r = await S.ctx.data.get(path);
  if (!r) return;
  const {
    schema,
    updated_at,
    by,
    ...mission
  } = r;
  S.m = toZ(M.fillDefaults(mission, M.emptyMission(mission.family)));
  S.missionSeen = true; // CR déjà enregistré : sa mission a été choisie
  S.path = path;
  S.sources = {};
  S.step = 0;
  render();
}
/** Remplit les champs vides depuis des valeurs { chemin: valeur } ; source notée par champ ; nombre de champs remplis. */
function fill(values, source, by = {}) {
  let n = 0;
  for (const [path, v] of Object.entries(values)) {
    if (empty(v) || !empty(M.get(S.m, path))) continue;
    M.set(S.m, path, v);
    S.sources[path] = by[path] || source; // source propre d'un champ (heure de départ, devis), sinon celle de la reprise
    n++;
  }
  S.ctx.notify(n ? tt(TX.filled, {
    n,
    s: source
  }) : tt(TX.nothing), n ? 'ok' : 'info');
  saveDraft();
  render();
}
/** Mes derniers CR, à rouvrir pour modification. */
async function showRecent() {
  const box = S.body.querySelector('[data-recentlist]'),
    list = await recentReports();
  box.innerHTML = list.length ? list.map(({
    path,
    r
  }) => `<button type="button" class="f-item" data-open="${esc(path)}">${esc(r.metadata?.missionId || path)} · ${esc(r.metadata?.date || '')} · ${esc(r.aircraft?.[0]?.registration || '')} ${esc(r.family || '')}</button>`).join('') : `<p class="f-muted">${esc(tt(TX.noRecent))}</p>`;
}
/** Définition du champ d'un chemin : champs communs, champs des blocs de la famille, champs de ses collections
 *  (« chemin.<n>.champ »). */
function fieldOf(path) {
  const blocks = FAMILIES[S.m.family]?.blocks || [];
  return Object.values(FIELDS).find(x => x.path === path) || blocks.flatMap(b => b.fields || []).find(x => x.path === path) || blocks
    .map(b => b.collection).filter(Boolean).map(c => path.startsWith(`${c.path}.`) && c.fields.find(x => x.path === path.slice(c.path.length +
      1).replace(/^\d+\./, ''))).find(Boolean);
}
/** Valeur saisie d'un contrôle (nombre pour les champs numériques, majuscules pour les codes). */
function readControl(el) {
  const path = el.dataset.path;
  let v = el.value;
  if (el.classList.contains('rp-code')) v = v.toUpperCase();
  const fd = fieldOf(path);
  if (fd?.type === 'number' || /\.(patients|aircraft)$/.test(path)) v = M.num(v);
  return [path, v];
}
/** Saisie : la mission suit le champ, la source d'un champ retouché s'efface, brouillon et repères mis à jour. */
function onInput(e) {
  const el = e.target;
  if (!S.missionSeen && (el.dataset.family !== undefined || el.closest('.rp-step[data-s="1"]'))) {
    S.missionSeen = true;
    S.body.querySelector('.f-steps [data-todo]')?.removeAttribute('data-todo');
  }
  if (el.dataset.family !== undefined) {
    const fam = el.value;
    if (FAMILIES[fam] && fam !== S.m.family) {
      S.m.family = fam;
      S.m.series = FAMILIES[fam].series?.[0]?.value || '';
      saveDraft();
      render();
    }
    return;
  }
  if (!el.dataset.path) return;
  const [path, v] = readControl(el);
  M.set(S.m, path, v);
  delete S.sources[path];
  saveDraft();
  if (path === 'series' && e.type === 'change') return render();
  check();
  const done = progress();
  S.body.querySelectorAll('.f-steps button').forEach((b, i) => b.toggleAttribute('data-done', !!done[i]));
}
/** Gestes : pas, enregistrement, nouveau CR, vol en cours, collections, CR récent. */
async function onClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.step) {
    S.step = +b.dataset.step;
    if (S.step === 1 && !S.missionSeen) { // pas Mission ouvert : vu
      S.missionSeen = true;
      saveDraft();
    }
    renderBody(); // changement de pas : la page remonte en haut, exprès
    return scrollTo(0, 0);
  }
  if (b.dataset.open) return openReport(b.dataset.open);
  const col = b.closest('[data-col]')?.dataset.col;
  switch (b.dataset.do) {
    case 'save':
      return save();
    case 'savesite': {
      // l'onglet du site s'ouvre dans le geste même (sinon bloqué), puis le CR est enregistré
      const url = Site.recordUrl(S.ctx.airline || {}, Site.flightFields(S.m));
      if (!url) return S.ctx.notify(tt(TX.siteUnset), 'warn');
      window.open(url, '_blank', 'noopener');
      return save();
    }
    case 'copyfields': {
      const line = Site.copyLine(Site.flightFields(S.m));
      // presse-papiers, sinon copie à l'ancienne, sinon la ligne montrée sélectionnée sous le bouton : « copiez-la »
      const how = await copyText(line, {
        near: b
      });
      return how === 'shown' ? S.ctx.notify(tt(TX.copyManual), 'warn') : S.ctx.notify(tt(TX.copied, {
        l: line
      }), 'ok');
    }
    case 'new':
      S.m = freshMission(S.m.family);
      S.missionSeen = false;
      S.path = null;
      S.sources = {};
      S.step = 0;
      await S.ctx.data.remove(DRAFT).catch(() => {});
      return render();
    case 'net':
      return askNetwork(b.dataset.net);
    case 'pick':
      return pickFlight(b.dataset.net, b.dataset.id);
    case 'simbrief': {
      const id = String(S.ctx.identity.simbrief || '').trim();
      if (!id) return S.ctx.notify(tt(TX.noId, {
        net: 'SimBrief'
      }), 'warn');
      try {
        return importResult({
          kind: 'fpl',
          fpl: await Fpl.fromSimbrief(id)
        }, 'SimBrief');
      } catch (err) {
        return netNotice(err, 'SimBrief');
      }
    }
    case 'analyse': {
      const text = S.body.querySelector('[data-paste]').value,
        r = T.analyse(text);
      if (['unknown', 'empty', 'vatsim-history'].includes(r.kind)) return S.ctx.notify(tt(TX.unknown), 'warn');
      return importResult(r, r.source || (r.kind === 'metar' ? 'METAR' : r.kind === 'fpl' ? 'FPL' : 'IVAO'));
    }
    case 'replace':
      return S.kept && importResult(S.kept.result, S.kept.source, true);
    case 'current': {
      const cf = S.current || {},
        a = cf.aircraft || {},
        r = cf.route || {};
      S.usedStarted = cf.started?.at || ''; // ce compte rendu est celui du vol démarré
      return fill({
        'aircraft.0.registration': a.registration,
        'aircraft.0.type': a.type,
        'aircraft.0.callsign': a.callsign,
        'navigation.dep': r.dep,
        'navigation.arr': r.arr,
        'navigation.altn': r.altn,
        'navigation.distanceNm': r.distanceNm,
        'navigation.altitude': cf.level?.ft ? formatLevel(cf.level.ft) : '',
        // heure de départ du carburant (UTC, comme toutes les heures du CR) et carburant bloc du devis
        'timeline.engineStart': cf.started?.at ? hhmmZ(cf.started.at) : '',
        'fuel.unit': cf.quote?.block > 0 ? cf.quote.unit : '',
        'fuel.start': cf.quote?.block > 0 ? cf.quote.block : ''
      }, tt(TX.current), {
        'timeline.engineStart': tt(TX.srcStarted),
        'fuel.unit': tt(TX.srcQuote),
        'fuel.start': tt(TX.srcQuote)
      });
    }
    case 'add': {
      const def = col === 'crew' ? crewCol() : (FAMILIES[S.m.family]?.blocks || []).map(x => x.collection).find(c => c?.path === col);
      const list = M.get(S.m, col) || [];
      list.push(def.empty());
      M.set(S.m, col, list);
      saveDraft();
      return render();
    }
    case 'del': {
      const list = M.get(S.m, col) || [];
      list.splice(+b.dataset.i, 1);
      M.set(S.m, col, list);
      saveDraft();
      return render();
    }
  }
}

export async function mount(el, ctx) {
  S = {
    el,
    ctx,
    step: 0,
    sources: {},
    path: null
  };
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(tt(TX.title))}</h1><div data-body></div>`;
  S.body = el.querySelector('[data-body]');
  const d = await ctx.data.get(DRAFT);
  if (d?.mission?.family && FAMILIES[d.mission.family]) {
    S.m = toZ(M.fillDefaults(d.mission, M.emptyMission(d.mission.family)));
    S.missionSeen = d.missionSeen !== false; // brouillon d'avant ce repère : tenu pour vu
    S.path = d.path || null;
    S.sources = d.sources || {};
    ctx.notify(tt(TX.draft, {
      d: fmtDateZ(d.at, ctx.lang())
    }), 'info');
  } else {
    S.m = freshMission(FAMILIES[(await ctx.data.get(PREFS))?.family] ? (await ctx.data.get(PREFS)).family : 'HEMS');
    S.missionSeen = false;
  }
  S.body.addEventListener('input', onInput);
  S.body.addEventListener('change', onInput);
  S.body.addEventListener('click', onClick);
  // compagnie lue en fond par le cadre (frame INTEGRATION § 6) : arrivée ou changée après le montage, la barre
  // d'enregistrement (« Enregistrer et inscrire sur le site ») est redessinée
  S.onAirline = () => S?.body && render();
  window.addEventListener('frame-airline', S.onAirline);
  // plan de vol : appels par ctx.net ; types d'appareil par aerodb (modèle, voilure tournante)
  const ac = ctx.aerodb?.aircraft ? await ctx.aerodb.aircraft().catch(() => null) : null;
  Fpl.configure({
    getJson,
    aircraft: {
      find: () => null,
      canonicalPrefix: x => String(x ?? '').trim().toUpperCase(),
      lookupType: code => {
        const r = ac?.record?.(code);
        return r ? {
          model: r.model || r.name || '',
          category: /^H/.test(String(r.description || r.desc || '')) ? 'rotary' : 'fixed',
          tdesig: r.tdesig || code
        } : null;
      },
      operatorOfDesignator: () => ''
    }
  });
  render();
  await takeHandoff();
  propose();
}

export function unmount() {
  if (!S) return;
  window.removeEventListener('frame-airline', S.onAirline);
  // un brouillon en attente part quand même (son minuteur garde l'état)
  S.body = null;
  S = null;
}
