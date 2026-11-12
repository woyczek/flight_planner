// V3 missions — les missions de la compagnie (modules/missions/SPEC.md § 1–4, lot 2 réduit du 31 octobre 2026) : la liste des missions
// communes du dépôt par famille, une recherche et un filtre de famille, « Choisir » (un résumé plat de la mission), « Tirer au sort »
// parmi celles que le pilote n'a pas encore volées, et « Préparer ce vol » par la porte de Carburant (#fuel?mission=<id>). Le module
// n'écrit que les missions qu'un pilote ajoute depuis des fichiers YAML (« Ajouter des missions », SOG-0212 b, lecture dans add.js) ;
// le vol est écrit par Carburant. Pas encore : l'enveloppe, le lecteur
// page à page, l'affectation (§ 5–6).
import * as MS from '../../frame/lib/mission.js';
import * as ADD from './add.js'; // « Ajouter des missions » : la lecture des YAML avant toute écriture (SOG-0212 b)
import * as MOVE from './move.js';
import * as RG from './registry.js'; // l'écran « Registre » : le calcul pur (SOG-0021)
import *
as MT from '../../frame/lib/mission_themes.js'; // le thème d'une ancienne catégorie (SOG-0202 T2) // changer la compagnie d'une mission : le champ airline retouché dans le texte (SOG-0223)
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
  files: ['add.js', 'move.js', 'registry.js', '../../frame/lib/mission.js', '../../frame/lib/js-yaml.min.js',
    '../../frame/lib/mission_categories.js',
    '../../frame/lib/mission_themes.js', '../../frame/lib/airline.js', '../report/vocab.js'
  ],
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
  // les missions ajoutées depuis un YAML (SOG-0212 b) : missions/<lettre>_<FAMILLE>/<ID>/mission<ID>.yaml, jamais le registre (une vue
  // dérivée des fichiers, SOG-0036 : les fichiers hors registre sont listés à l'affichage suivant)
  writes: [{
    prefix: 'missions/',
    merge: 'record'
  }]
};

// la fiche en deux niveaux (§ 10.45) : un écran après l'autre sur un module étroit ; côte à côte (première page à gauche, détail au
// centre) sur un module large, sans « Détail » ni « Retour » du détail
const STYLE = `[data-module="missions"] .ms-detail{display:none}
[data-module="missions"] .ms-sheet[data-detail] .ms-first{display:none}
[data-module="missions"] .ms-sheet[data-detail] .ms-detail{display:block}
[data-module="missions"] .ms-lines{margin:.2em 0 .4em;padding-left:1.1em}
[data-module="missions"] [data-famlong]{font-weight:400}
[data-module="missions"] .f-linkbtn{min-height:44px;padding:0 4px;border:0;border-radius:0;background:none;box-shadow:none;text-shadow:none;color:var(--sog-link);text-decoration:underline;font:inherit;cursor:pointer} /* « Changer », « N autres » : des liens dans le texte (SOG-0223) */
[data-module="missions"] .ms-fam{display:block;font-size:.72em;margin-top:.15em} /* la famille sous le titre de la fiche : « SAR · Récupération de personnel » (SOG-0187) */ /* le sigle en gras, le nom long en clair (SOG-0179) */
[data-module="missions"] .ms-summary{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;margin:.2em 0 .4em} /* le résumé, deux lignes au plus avec « … » (SOG-0051) */
[data-module="missions"] .ms-lines li{margin:.15em 0}
[data-module="missions"] .ms-rrow{display:block;border-top:1px solid var(--sog-border)} /* une ligne du registre : une mission, repliée (le modèle de la V2, SOG-0286) */
[data-module="missions"] .ms-rrow>summary{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:8px;padding:.3em .75em;min-height:44px;box-sizing:border-box} /* le chevron du cadre à gauche, les deux lignes à droite */
[data-module="missions"] .ms-rrow>summary::before{grid-row:span 2}
[data-module="missions"] .ms-rrow>summary::-webkit-details-marker{display:none}
[data-module="missions"] .ms-rrow>summary>span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} /* deux lignes au plus au téléphone */
[data-module="missions"] .ms-rsign{display:inline-block;min-width:1.3em;font-weight:700;color:var(--sog-warn)}
[data-module="missions"] .ms-rsign[data-kind=ok]{color:var(--sog-ok)}
[data-module="missions"] .ms-rsign[data-kind=info]{color:inherit}
[data-module="missions"] .ms-rbody{padding:0 .75em .6em}
[data-module="missions"] .ms-rbody>span{display:block;margin:.15em 0}
[data-module="missions"] .ms-rrow button + button{margin-left:.5em} /* « Corriger » et « Retirer du registre » ne se touchent pas (retouche de N28) */
[data-module="missions"] .ms-regbar{align-items:center}
[data-module="missions"] .ms-reghead{display:flex;flex-wrap:wrap;gap:0 .75em;align-items:center}
[data-module="missions"] .ms-reghead>.f-field{flex:1 1 12em;margin:0}
@container (min-width: 700px){
  [data-module="missions"] .ms-rrow>summary{display:flex;gap:1em;min-height:0;padding:.1em .75em;line-height:1.3}
  [data-module="missions"] .ms-rrow>summary>span:first-child{flex:1 1 auto;min-width:0}
  [data-module="missions"] .ms-rrow>summary>span+span{flex:0 0 auto}
}
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
  ROWS = 7, // lignes montrées avant « N autres » (sept éléments au plus par écran)
  REG_ROWS = 60; // lignes du Registre montrées avant « N autres » : une ligne par mission, comme le tableau de la V2 (SOG-0286)

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
  secPayload: ['Charge et aéronefs', 'Payload and aircraft', 'Zuladung und Luftfahrzeuge', 'Carga y aeronaves'],
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
  searchHint: ['Identifiant, titre, terrain (code OACI), type d’aéronef, indicatif (SAMU66), activité (MEDEVAC, HEMS, SAMU…).',
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
  // « Ajouter des missions » (SOG-0212 b) : choisir ou coller du YAML, voir ce qui est lu, puis écrire
  add: ['Ajouter des missions', 'Add missions', 'Missionen hinzufügen', 'Añadir misiones'],
  addHint: [
    'Un ou plusieurs fichiers YAML de missions (un fichier peut en porter plusieurs), ou un YAML collé. Rien n’est écrit avant « Ajouter ».',
    'One or more YAML mission files (a file may hold several), or a pasted YAML. Nothing is written before « Add ».',
    'Eine oder mehrere YAML-Missionsdateien (eine Datei kann mehrere enthalten) oder eingefügtes YAML. Vor „Hinzufügen“ wird nichts geschrieben.',
    'Uno o varios archivos YAML de misiones (un archivo puede contener varias), o un YAML pegado. Nada se escribe antes de «Añadir».'
  ],
  addFiles: ['Fichiers YAML', 'YAML files', 'YAML-Dateien', 'Archivos YAML'],
  addPaste: ['ou collez un YAML ici', 'or paste a YAML here', 'oder YAML hier einfügen', 'o pegue un YAML aquí'],
  pasted: ['texte collé', 'pasted text', 'eingefügter Text', 'texto pegado'],
  addRead: ['Lire', 'Read', 'Lesen', 'Leer'],
  addNothing: ['Choisissez un fichier ou collez un YAML.', 'Choose a file or paste a YAML.',
    'Wählen Sie eine Datei oder fügen Sie YAML ein.',
    'Elija un archivo o pegue un YAML.'
  ],
  addFound: ['{n} mission(s) lue(s)', '{n} mission(s) read', '{n} Mission(en) gelesen', 'Misiones leídas: {n}'],
  addRefused: ['Refusées', 'Refused', 'Abgelehnt', 'Rechazadas'],
  addDo: ['Ajouter ({n})', 'Add ({n})', 'Hinzufügen ({n})', 'Añadir ({n})'],
  personal: ['Personnel', 'Personal', 'Persönlich', 'Personal'],
  // la portée de la liste (SOG-0212 c : « possibilité de rechercher une mission dans une compagnie d'à côté »)
  scope: ['Portée', 'Scope', 'Bereich', 'Alcance'],
  scopeMine: ['Ma compagnie', 'My airline', 'Meine Gesellschaft', 'Mi compañía'],
  scopeAll: ['Toutes les compagnies', 'All airlines', 'Alle Gesellschaften', 'Todas las compañías'],
  exists: ['existe déjà : remplacer ?', 'already exists: replace?', 'existiert bereits: ersetzen?', 'ya existe: ¿reemplazar?'],
  // le nombre accordé (SOG-0223, relecture : « 1 mission changée de compagnie : elles partent » → « elle part ») : une forme par nombre
  added1: ['{n} mission ajoutée : elle part à la prochaine synchronisation.', '{n} mission added: it leaves at the next synchronisation.',
    '{n} Mission hinzugefügt: Sie geht bei der nächsten Synchronisierung.', '{n} misión añadida: sale en la próxima sincronización.'
  ],
  added: ['{n} missions ajoutées : elles partent à la prochaine synchronisation.',
    '{n} missions added: they leave at the next synchronisation.',
    '{n} Missionen hinzugefügt: Sie gehen bei der nächsten Synchronisierung.',
    '{n} misiones añadidas: salen en la próxima sincronización.'
  ],
  addedElsewhereIt: ['Elle n’est pas de cette compagnie (Personnel ou une autre) : elle n’est pas dans cette liste.',
    'It is not of this airline (Personal or another): it is not in this list.',
    'Sie gehört nicht zu dieser Gesellschaft (Persönlich oder eine andere): Sie steht nicht in dieser Liste.',
    'No es de esta compañía (Personal u otra): no está en esta lista.'
  ],
  addedElsewhere1: ['L’une d’elles n’est pas de cette compagnie (Personnel ou une autre) : elle n’est pas dans cette liste.',
    'One of them is not of this airline (Personal or another): it is not in this list.',
    'Eine davon gehört nicht zu dieser Gesellschaft (Persönlich oder eine andere): Sie steht nicht in dieser Liste.',
    'Una de ellas no es de esta compañía (Personal u otra): no está en esta lista.'
  ],
  addedElsewhere: ['{n} d’entre elles ne sont pas de cette compagnie (Personnel ou une autre) : elles ne sont pas dans cette liste.',
    '{n} of them are not of this airline (Personal or another): they are not in this list.',
    '{n} davon gehören nicht zu dieser Gesellschaft (Persönlich oder eine andere): Sie stehen nicht in dieser Liste.',
    '{n} de ellas no son de esta compañía (Personal u otra): no están en esta lista.'
  ],
  addFailed: ['Écriture refusée ({e}) : rien d’autre n’est écrit.', 'Write refused ({e}): nothing else is written.',
    'Schreiben abgelehnt ({e}): nichts weiter wird geschrieben.', 'Escritura rechazada ({e}): no se escribe nada más.'
  ],
  // les raisons d'un refus (add.js)
  why_tooMany: ['trop de fichiers ou de missions à la fois (20 fichiers, 200 missions)',
    'too many files or missions at once (20 files, 200 missions)',
    'zu viele Dateien oder Missionen auf einmal (20 Dateien, 200 Missionen)',
    'demasiados archivos o misiones a la vez (20 archivos, 200 misiones)'
  ],
  why_tooBig: ['fichier trop gros (1 Mo au plus)', 'file too big (1 MB at most)', 'Datei zu groß (höchstens 1 MB)',
    'archivo demasiado grande (1 MB como máximo)'
  ],
  why_yaml: ['YAML illisible, ligne {l} : {m}', 'unreadable YAML, line {l}: {m}', 'YAML unlesbar, Zeile {l}: {m}',
    'YAML ilegible, línea {l}: {m}'
  ],
  why_noMission: ['pas une mission (mission.id et mission.type attendus)', 'not a mission (mission.id and mission.type expected)',
    'keine Mission (mission.id und mission.type erwartet)', 'no es una misión (se esperan mission.id y mission.type)'
  ],
  why_badId: ['identifiant hors règle (« A-001A » : une lettre, trois chiffres, une lettre ou rien)',
    'id outside the rule (« A-001A »: a letter, three digits, a letter or nothing)',
    'Kennung außerhalb der Regel („A-001A“: ein Buchstabe, drei Ziffern, ein Buchstabe oder nichts)',
    'identificador fuera de la regla («A-001A»: una letra, tres cifras, una letra o nada)'
  ],
  why_badFamily: ['famille (mission.type) hors règle : des majuscules, comme COMBAT',
    'family (mission.type) outside the rule: capitals, like COMBAT',
    'Familie (mission.type) außerhalb der Regel: Großbuchstaben, wie COMBAT',
    'familia (mission.type) fuera de la regla: mayúsculas, como COMBAT'
  ],
  why_organisation: ['organisation d’exercice (…Z) : pas un vol', 'exercise organisation (…Z): not a flight',
    'Übungsorganisation (…Z): kein Flug',
    'organización de ejercicio (…Z): no es un vuelo'
  ],
  // changer la compagnie d'une mission (SOG-0223) : sur sa fiche, en lot, à l'ajout
  coLine: ['Compagnie : {c}', 'Airline: {c}', 'Gesellschaft: {c}', 'Compañía: {c}'],
  change: ['Changer', 'Change', 'Ändern', 'Cambiar'],
  moveTo: ['Passer à', 'Move to', 'Wechseln zu', 'Pasar a'],
  moveSay: ['{id} passe de {a} à {b}.', '{id} moves from {a} to {b}.', '{id} wechselt von {a} zu {b}.', '{id} pasa de {a} a {b}.'],
  write: ['Écrire', 'Write', 'Schreiben', 'Escribir'],
  cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
  moveAll: ['Attribuer à une compagnie…', 'Assign to an airline…', 'Einer Gesellschaft zuordnen…', 'Asignar a una compañía…'],
  moveHint: ['Les missions de la liste affichée (portée, famille, recherche) ; décochez celles à laisser.',
    'The missions of the list shown (scope, family, search); untick those to leave.',
    'Die Missionen der angezeigten Liste (Bereich, Familie, Suche); entfernen Sie den Haken bei denen, die bleiben sollen.',
    'Las misiones de la lista mostrada (alcance, familia, búsqueda); desmarque las que deban quedarse.'
  ],
  moveReading: ['Lecture des fichiers…', 'Reading the files…', 'Dateien werden gelesen…', 'Leyendo los archivos…'],
  moveCount1: ['{n} mission passe à {b}.', '{n} mission moves to {b}.', '{n} Mission wechselt zu {b}.', '{n} misión pasa a {b}.'],
  moveCount: ['{n} missions passent à {b}.', '{n} missions move to {b}.', '{n} Missionen wechseln zu {b}.', '{n} misiones pasan a {b}.'],
  moveUnread: ['Illisibles, laissées telles quelles : {l}', 'Unreadable, left as they are: {l}', 'Unlesbar, unverändert gelassen: {l}',
    'Ilegibles, se dejan tal cual: {l}'
  ],
  moveDo: ['Écrire ({n})', 'Write ({n})', 'Schreiben ({n})', 'Escribir ({n})'],
  moved1: ['{n} mission changée de compagnie : elle part à la prochaine synchronisation.',
    '{n} mission moved to another airline: it leaves at the next synchronisation.',
    '{n} Mission einer anderen Gesellschaft zugeordnet: Sie geht bei der nächsten Synchronisierung.',
    '{n} misión cambiada de compañía: sale en la próxima sincronización.'
  ],
  moved: ['{n} missions changées de compagnie : elles partent à la prochaine synchronisation.',
    '{n} missions moved to another airline: they leave at the next synchronisation.',
    '{n} Missionen einer anderen Gesellschaft zugeordnet: Sie gehen bei der nächsten Synchronisierung.',
    '{n} misiones cambiadas de compañía: salen en la próxima sincronización.'
  ],
  addAs: ['Ajouter ces missions à', 'Add these missions to', 'Diese Missionen hinzufügen zu', 'Añadir estas misiones a'],
  asInFile: ['la compagnie dite dans le fichier', 'the airline the file says', 'die Gesellschaft laut Datei',
    'la compañía que indica el archivo'
  ],
  refusedLine: ['{w} : {r}', '{w}: {r}', '{w}: {r}', '{w}: {r}'],
  why_twice: ['en double dans ce qui est lu', 'twice in what is read', 'doppelt im Gelesenen', 'duplicada en lo leído'],
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
  aircraft: ['Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
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
  ],
  // « Registre des missions » (SOG-0021) : une ligne par mission du registre, son fichier, la mise à jour, la correction à la main
  reg: ['Registre', 'Registry', 'Register', 'Registro'],
  regTitle: ['Registre des missions', 'Mission registry', 'Missionsregister', 'Registro de misiones'],
  regHint: [
    'Une ligne par mission telle que le registre l’écrit, avec l’état de son fichier. Le registre est la liste des missions de la compagnie ; « Mettre à jour » le remet d’accord avec les fichiers du dépôt.',
    'One line per mission as the registry writes it, with the state of its file. The registry is the airline’s list of missions; “Update” brings it back in line with the files of the repository.',
    'Eine Zeile je Mission, wie das Register sie schreibt, mit dem Zustand ihrer Datei. Das Register ist die Missionsliste der Gesellschaft; „Aktualisieren“ gleicht es mit den Dateien des Depots ab.',
    'Una línea por misión tal como la escribe el registro, con el estado de su archivo. El registro es la lista de misiones de la compañía; «Actualizar» lo pone de acuerdo con los archivos del depósito.'
  ],
  regCount: ['{n} ligne(s) dans le registre', '{n} line(s) in the registry', '{n} Zeile(n) im Register', '{n} línea(s) en el registro'],
  regUnlisted: ['{n} mission(s) du dépôt que le registre ne connaît pas',
    '{n} mission(s) in the repository that the registry does not know',
    '{n} Mission(en) im Depot, die das Register nicht kennt', '{n} misión(es) del depósito que el registro no conoce'
  ],
  regChecking: ['Lecture des fichiers…', 'Reading the files…', 'Dateien werden gelesen…', 'Leyendo los archivos…'],
  regOk: ['fichier là', 'file there', 'Datei da', 'archivo presente'],
  regMissing: ['fichier manquant', 'file missing', 'Datei fehlt', 'archivo ausente'],
  regUnread: ['fichier illisible', 'file unreadable', 'Datei unlesbar', 'archivo ilegible'],
  regRefused: ['chemin refusé', 'path refused', 'Pfad abgelehnt', 'ruta rechazada'],
  // au-delà des REG_READ_MAX premiers fichiers : pas lu, dit (audit 174) ; jamais « fichier là » sans l'avoir lu
  regNotRead: ['fichier non lu (au-delà des {m} premiers)', 'file not read (beyond the first {m})',
    'Datei nicht gelesen (nach den ersten {m})',
    'archivo no leído (más allá de los {m} primeros)'
  ],
  regReadOf: ['{r} fichiers lus sur {n}', '{r} files read of {n}', '{r} Dateien von {n} gelesen', '{r} archivos leídos de {n}'],
  regNotYet: ['pas dans le registre', 'not in the registry', 'nicht im Register', 'no está en el registro'],
  regDup: ['identifiant en double', 'duplicate identifier', 'doppelte Kennung', 'identificador duplicado'],
  regFormer: ['ancien identifiant : {f}', 'former identifier: {f}', 'frühere Kennung: {f}', 'identificador anterior: {f}'],
  regUpdate: ['Mettre à jour le registre', 'Update the registry', 'Register aktualisieren', 'Actualizar el registro'],
  regPlanHead: ['Mettre à jour le registre ferait ceci :', 'Updating the registry would do this:',
    'Die Aktualisierung würde Folgendes tun:',
    'Actualizar el registro haría esto:'
  ],
  regPlanAdd: ['{n} mission(s) à ajouter', '{n} mission(s) to add', '{n} Mission(en) hinzuzufügen', '{n} misión(es) por añadir'],
  regPlanNoFile: ['{n} ligne(s) sans fichier lisible : gardées (à retirer à la main)',
    '{n} line(s) without a readable file: kept (remove by hand)', '{n} Zeile(n) ohne lesbare Datei: bleiben (von Hand entfernen)',
    '{n} línea(s) sin archivo legible: se conservan (retirar a mano)'
  ],
  regPlanDup: ['{n} identifiant(s) en double : une seule ligne gardée', '{n} duplicate identifier(s): only one line kept',
    '{n} doppelte Kennung(en): nur eine Zeile bleibt', '{n} identificador(es) duplicado(s): se conserva una sola línea'
  ],
  regPlanFormer: ['{n} ancien(s) identifiant(s) remplacé(s) par celui du dossier', '{n} former identifier(s) replaced by the folder’s',
    '{n} frühere Kennung(en) durch die des Ordners ersetzt', '{n} identificador(es) anterior(es) sustituido(s) por el de la carpeta'
  ],
  regPlanNothing: ['Le registre est déjà d’accord avec les fichiers.', 'The registry already matches the files.',
    'Das Register stimmt bereits mit den Dateien überein.', 'El registro ya coincide con los archivos.'
  ],
  regWrite: ['Écrire le registre', 'Write the registry', 'Register schreiben', 'Escribir el registro'],
  regWritten: ['Registre mis à jour : il part à la prochaine synchronisation.',
    'Registry updated: it leaves at the next synchronisation.',
    'Register aktualisiert: es geht bei der nächsten Synchronisierung.', 'Registro actualizado: sale en la próxima sincronización.'
  ],
  regFailed: ['Registre non écrit : {e}', 'Registry not written: {e}', 'Register nicht geschrieben: {e}', 'Registro no escrito: {e}'],
  regStale: ['Le registre a changé entre-temps : il est relu, recommencez.',
    'The registry changed meanwhile: it is read again, try again.',
    'Das Register hat sich inzwischen geändert: es wird neu gelesen, bitte erneut versuchen.',
    'El registro cambió entretanto: se vuelve a leer, inténtelo de nuevo.'
  ],
  regEdit: ['Corriger', 'Edit', 'Bearbeiten', 'Corregir'],
  regTitleF: ['Titre', 'Title', 'Titel', 'Título'],
  regSeries: ['Série', 'Series', 'Serie', 'Serie'],
  regNumber: ['Numéro', 'Number', 'Nummer', 'Número'],
  regOperation: ['Opération', 'Operation', 'Operation', 'Operación'],
  regSave: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  regBadNumber: ['Série et numéro : un nombre entier, ou rien.', 'Series and number: a whole number, or nothing.',
    'Serie und Nummer: eine ganze Zahl oder nichts.', 'Serie y número: un número entero, o nada.'
  ],
  regRemove: ['Retirer du registre', 'Remove from the registry', 'Aus dem Register entfernen', 'Quitar del registro'],
  regRemoveAsk: ['Retirer {id} du registre ? Le fichier de la mission reste dans le dépôt.',
    'Remove {id} from the registry? The mission file stays in the repository.',
    '{id} aus dem Register entfernen? Die Missionsdatei bleibt im Depot.',
    '¿Quitar {id} del registro? El archivo de la misión permanece en el depósito.'
  ],
  regRemoved: ['{id} retirée du registre ; son fichier reste dans le dépôt.',
    '{id} removed from the registry; its file stays in the repository.',
    '{id} aus dem Register entfernt; die Datei bleibt im Depot.', '{id} quitada del registro; su archivo permanece en el depósito.'
  ],
  regSearch: ['Chercher dans le registre', 'Search the registry', 'Im Register suchen', 'Buscar en el registro'],
  regNone: ['Aucune ligne.', 'No line.', 'Keine Zeile.', 'Ninguna línea.']
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
    }, // le registre pas encore lu, en retard ou illisible ; null une fois lu
    add: null // « Ajouter des missions » ouvert : { items, refused, replace: Set } (items null : le choix des fichiers)
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
    s.scope = 'mine';
    s.all = false;
    if (!s.open && !s.reg) draw(s);
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
  if (ctx.query?.view === 'registry') regOpen(s); // l'écran Registre par l'adresse (#missions?view=registry, Compagnie › Registre)
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
  if (!s.open && !s.reg) draw(s);
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
  if (!s.open && !s.reg) s.rows.length === found.length ? draw(s) : results(s);
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
      filter: false,
      names: new Map()
    };
    const [a, list] = await Promise.all([FD.airline(), Promise.resolve(FD.airlines()).catch(() => [])]),
      code = String(a?.code || '');
    return {
      code,
      filter: !!code && code !== 'default',
      a,
      // les noms des compagnies de l'index, pour dire celle d'une mission d'à côté (SOG-0212 c) ; textes à échapper
      names: new Map((Array.isArray(list) ? list : []).map(x => [String(x?.code || ''), String(x?.name || x?.code || '').slice(0, 60)])),
      list: Array.isArray(list) ? list : []
    };
  } catch {
    return {
      code: '',
      filter: false,
      names: new Map()
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
/** Une mission de la portée choisie (SOG-0212 c) : « Ma compagnie » (celle que nomme son champ airline, personnelle sans lui :
 *  MS.ownerOf), « Personnel », ou toutes ; toutes sans index. */
const ofAirline = (s, r) => !s.co?.filter || s.scope === 'all' || MS.ownerOf(r) === (s.scope === 'perso' ? MS.PERSONAL : s.co.code);
/** Le nom de la compagnie d'une mission qui n'est pas de la compagnie courante (« Delta Air », « Personnel ») ; '' pour la sienne. */
const coName = (s, r) => {
  const o = MS.ownerOf(r);
  return !s.co?.filter || o === s.co.code ? '' : o === MS.PERSONAL ? s.tt(TX.personal) : s.co.names?.get(o) || o;
};
/** Le choix de la portée : ma compagnie, Personnel (sauf si c'est la compagnie courante), toutes ; rien sans index. */
function scopeHtml(s) {
  if (!s.co?.filter) return '';
  const opts = [
    ['mine', s.tt(TX.scopeMine)], ...(s.co.code === MS.PERSONAL ? [] : [
      ['perso', s.tt(TX.personal)]
    ]), ['all', s.tt(TX.scopeAll)]
  ];
  return `<label class="f-field"><span class="f-sr">${esc(s.tt(TX.scope))}</span><select data-k="scope" aria-label="${esc(s.tt(TX.scope))}">${opts.map(([v, l]) => `<option value="${v}"${(s.scope || 'mine') === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
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
const filtered = s => s.rows.filter(r => ofAirline(s, r) && (!s.family || r.family === s.family) && (!s.category || catOf(s, r)?.id === s
  .category) && (!s.q || [r.id, r.formerId, r.title, r.operation, r
  .family, r.kind,
  r.subtype, ...r.callsigns, ...r.words, r.originIcao, r.destinationIcao, r.origin, r
  .destination, ...r.types
].some(v => String(v).toUpperCase().includes(s.q.toUpperCase()))));

/** Dessine la liste, ou la mission choisie. */
function draw(s) {
  s.ctx.helpAnchor?.(() => s.open ? 'missions-open' : s.reg ? 'missions-registry' : 'missions-list');
  for (const u of s.urls || []) URL.revokeObjectURL(u);
  s.urls = [];
  s.el.innerHTML = `<style>${STYLE}</style><h1>${esc(s.tt(meta.title))}</h1>${s.open ? missionHtml(s) : s.add ? addHtml(s) : s.move ? moveHtml(s) : s.reg ? regHtml(s) : listHtml(s)}`;
  if (s.open?.mission && !s.open.mission.hasCoords) legacyPngs(s);
}

/** La date d'un compte rendu en « jj/mm/aaaa ». */
const day = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('/') : d;

/** La liste : « Tirer au sort », recherche, famille, puis les résultats (resultsHtml). */
function listHtml(s) {
  const w = s.regWhy;
  if (!s.rows.length) return `<div class="f-card"><div class="f-row"><button type="button" data-do="add">${esc(s.tt(TX.add))}</button><button type="button" data-do="regopen">${esc(s.tt(TX.reg))}</button></div><p class="f-muted" data-why="${esc(w?.why || 'none')}">${esc(w?.why === 'loading' ? s.tt(TX.regLoading) : w?.why === 'late' ? s.tt(TX.regLate) : w?.why === 'unreadable' ? s.tt(TX.regUnreadable, { e: w.err }) : s.tt(TX.none))}</p></div>`;
  const families = [...new Set(s.rows.filter(r => ofAirline(s, r)).map(r => r.family).filter(Boolean))].sort(),
    // les catégories connues de la compagnie que ses missions portent, dans l'ordre de sa liste ; sans elles, pas de filtre
    held = new Set(s.rows.filter(r => ofAirline(s, r)).map(r => catOf(s, r)?.id).filter(Boolean)),
    cats = s.cats.all.filter(c => held.has(c.id)),
    lang = s.ctx.lang?.() || 'fr';
  return `<div class="f-card" data-pane="list"><div class="f-row"><button type="button" class="primary" data-do="draw">${esc(s.tt(TX.draw))}</button><button type="button" data-do="add">${esc(s.tt(TX.add))}</button><button type="button" data-do="regopen">${esc(s.tt(TX.reg))}</button>${s.co?.filter ? `<button type="button" data-do="moveall">${esc(s.tt(TX.moveAll))}</button>` : ''}</div>
    ${scopeHtml(s)}
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
      const f = s.flown.get(r.id) ?? (r.formerId ? s.flown.get(r.formerId) : undefined),
        co = coName(s, r);
      return `<button type="button" class="f-item" data-id="${esc(r.id)}"><span><b>${esc(r.id)}</b> ${esc(r.title)}${co ? ` <span class="f-badge" data-co>${esc(co)}</span>` : ''}</span><span class="f-muted">${esc([r.originIcao && r.destinationIcao ? `${r.originIcao} → ${r.destinationIcao}` : r.originIcao, r.types[0], hmm(r.blockMin)].filter(Boolean).join(' · '))}${f !== undefined ? ` <span class="f-badge" data-kind="ok" data-flown>${esc(s.tt(TX.flown, { d: day(f) }))}</span>` : ''}</span></button>`;
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
  else if (!s.open && !s.reg) draw(s);
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
    mig = MT.fromCategory(cat), // SOG-0202 T2 : une ancienne catégorie dite par son thème et sa série (« fret » → CAT · Fret)
    catName = mig ? [familyText(mig.theme, lang), MT.themeOf(mig.theme)?.series.find(x => x.value === mig.series)?.labels[Math.max(0, ['fr',
      'en', 'de', 'es'
    ].indexOf(lang))]].filter(Boolean).join(' · ') : catOf(s, {
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
    ${s.co?.filter ? coHtml(s, r) : ''}
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
  if (s.reg) {
    // l'écran Registre : la recherche et le filtre de famille redessinent les lignes seules (le champ garde son curseur)
    const rk = e.target?.dataset?.k;
    if ((rk === 'rq' && e.type === 'input') || (rk === 'rfam' && e
        .type === 'change'
      )) { // « change » de la recherche (à la perte du focus) ne redessine pas : il mangerait le toucher qui la provoque
      if (rk === 'rq') s.reg.q = e.target.value;
      else s.reg.fam = e.target.value;
      s.reg.all = false;
      const box = s.el.querySelector('[data-regrows]');
      if (box) box.innerHTML = regListHtml(s);
    }
    return;
  }
  if (e.target?.dataset?.k === 'moveone' && s.open?.move) {
    s.open.move.to = e.target.value;
    return draw(s);
  }
  if (s.move && (e.target?.dataset?.k === 'moveto' || e.target?.dataset?.movebox)) {
    if (e.target.dataset.k === 'moveto') s.move.to = e.target.value;
    else e.target.checked ? s.move.sel.add(e.target.dataset.movebox) : s.move.sel.delete(e.target.dataset.movebox);
    return draw(s);
  }
  if (s.add?.items && e.target?.dataset?.k === 'addas') {
    s.add.as = e.target.value;
    return;
  }
  if (s.add?.items && e.target?.dataset?.replace) {
    e.target.checked ? s.add.replace.add(e.target.dataset.replace) : s.add.replace.delete(e.target.dataset.replace);
    const b = s.el.querySelector('[data-do=addwrite]');
    if (b) {
      const n = toWrite(s).length;
      b.textContent = s.tt(TX.addDo, {
        n
      });
      b.disabled = !n;
    }
    return;
  }
  const k = e.target?.dataset?.k;
  if (k === 'scope') {
    s.scope = ['perso', 'all'].includes(e.target.value) ? e.target.value : 'mine';
    s.family = '';
    s.category = '';
    s.all = false;
    return draw(s);
  }
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
    case 'regopen':
      return regOpen(s);
    case 'add':
      s.add = {
        items: null,
        refused: [],
        replace: new Set()
      };
      return draw(s);
    case 'addcancel':
      s.add = null;
      return draw(s);
    case 'addread':
      return addRead(s);
    case 'addwrite':
      return addWrite(s);
    case 'moveone':
      s.open.move = {
        to: MS.ownerOf(s.open.row)
      };
      return draw(s);
    case 'moveonecancel':
      s.open.move = null;
      return draw(s);
    case 'moveonewrite':
      return moveWrite(s, [s.open.row], s.open.move.to);
    case 'moveall':
      return moveOpen(s);
    case 'movecancel':
      s.move = null;
      return draw(s);
    case 'movewrite':
      return moveWrite(s, s.move.rows.filter(r => s.move.sel.has(r.id) && !s.move.bad.has(r.id)), s.move.to);
    default:
      if (b.dataset.do.startsWith('reg') && s.reg) return regClick(s, b);
  }
}

// ---------------------------------------------------------------- changer de compagnie (SOG-0223)
/** Le nom d'une compagnie pour l'œil (« Personnel » pour perso). */
const coText = (s, code) => code === MS.PERSONAL ? s.tt(TX.personal) : s.co?.names?.get(code) || code;
/** Les compagnies proposées : celles de l'index, puis Personnel (jamais un code tapé). */
const coChoices = s => MOVE.choices(s.co?.list, s.tt(TX.personal));
/** Une liste de choix de compagnie. */
const coSelect = (s, k, value, extra = '') => `<select data-k="${k}">${extra}${coChoices(s).map(c => `<option value="${esc(c.code)}"${c.code === value ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
/** Sur la fiche : « Compagnie : X · Changer », puis le choix et ce qui sera écrit, avant d'écrire. */
function coHtml(s, r) {
  const own = MS.ownerOf(r),
    mv = s.open.move;
  if (!mv) return `<p class="f-muted" data-coline>${esc(s.tt(TX.coLine, { c: coText(s, own) }))} · <button type="button" class="f-linkbtn" data-do="moveone">${esc(s.tt(TX.change))}</button></p>`;
  return `<div class="f-row" data-comove><label class="f-field"><span>${esc(s.tt(TX.moveTo))}</span>${coSelect(s, 'moveone', mv.to)}</label></div>
    ${mv.to !== own ? `<p data-movesay>${esc(s.tt(TX.moveSay, { id: r.id, a: coText(s, own), b: coText(s, mv.to) }))}</p>` : ''}
    <div class="f-row"><button type="button" class="primary" data-do="moveonewrite"${mv.to !== own ? '' : ' disabled'}>${esc(s.tt(TX.write))}</button><button type="button" data-do="moveonecancel">${esc(s.tt(TX.cancel))}</button></div>`;
}
/** Le texte d'une mission tel que le dépôt le garde (file d'attente comprise) ; null s'il n'est pas lisible. */
async function missionText(s, r) {
  if (!r.folder || !r.file) return null;
  const v = await Promise.resolve().then(() => s.ctx.data.read(`missions/${r.folder}/${r.file}`, {
    wait: true
  })).then(x => x ? x.value ?? x.text ?? null : null).catch(() => null);
  return typeof v === 'string' && v.trim() ? v : null;
}
/** En lot : les missions de la liste affichée, leurs fichiers lus d'abord (les illisibles dites et laissées). */
async function moveOpen(s) {
  const rows = filtered(s),
    first = coChoices(s).find(c => c.code !== s.co.code)?.code || MS.PERSONAL;
  s.move = {
    rows,
    sel: new Set(rows.map(r => r.id)),
    bad: new Set(),
    texts: new Map(),
    to: first,
    reading: true
  };
  draw(s);
  if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
  const mv = s.move;
  for (let i = 0; i < rows.length; i += 8) {
    await Promise.all(rows.slice(i, i + 8).map(async r => {
      const t = await missionText(s, r),
        ok = t !== null && MOVE.withAirline(t, MS.PERSONAL, globalThis.jsyaml) !== null;
      if (ok) mv.texts.set(r.id, t);
      else mv.bad.add(r.id);
    }));
    if (S !== s || s.move !== mv) return;
  }
  mv.reading = false;
  draw(s);
}
/** L'écran du lot : la compagnie visée, les missions (cases), ce qui change et ce qui ne peut pas, avant d'écrire. */
function moveHtml(s) {
  const mv = s.move,
    go = mv.rows.filter(r => mv.sel.has(r.id) && !mv.bad.has(r.id) && MS.ownerOf(r) !== mv.to),
    bad = mv.rows.filter(r => mv.bad.has(r.id)).map(r => r.id);
  return `<div class="f-card" data-pane="move"><h2>${esc(s.tt(TX.moveAll))}</h2><p class="f-muted">${esc(s.tt(TX.moveHint))}</p>
    <label class="f-field"><span>${esc(s.tt(TX.moveTo))}</span>${coSelect(s, 'moveto', mv.to)}</label>
    ${mv.reading ? `<p class="f-muted" data-movereading>${esc(s.tt(TX.moveReading))}</p>` : `<p data-movecount>${esc(s.tt(go.length === 1 || (s.ctx.lang?.() || 'fr') === 'fr' && go.length < 2 ? TX.moveCount1 : TX.moveCount, { n: go.length, b: coText(s, mv.to) }))}</p>`}
    ${bad.length ? `<p class="f-warn" data-moveunread>${esc(s.tt(TX.moveUnread, { l: bad.join(', ') }))}</p>` : ''}
    <div class="f-list" data-movelist>${mv.rows.map(r => `<label class="f-check" data-moverow="${esc(r.id)}"><input type="checkbox" data-movebox="${esc(r.id)}"${mv.sel.has(r.id) && !mv.bad.has(r.id) ? ' checked' : ''}${mv.bad.has(r.id) ? ' disabled' : ''}> <b>${esc(r.id)}</b> ${esc(r.title)} <span class="f-muted">${esc(coText(s, MS.ownerOf(r)))}</span></label>`).join('')}</div>
    <div class="f-row"><button type="button" class="primary" data-do="movewrite"${!mv.reading && go.length ? '' : ' disabled'}>${esc(s.tt(TX.moveDo, { n: go.length }))}</button><button type="button" data-do="movecancel">${esc(s.tt(TX.cancel))}</button></div></div>`;
}
/** Écrit la compagnie `to` dans chaque mission (une écriture par mission ; le cadre les envoie en un passage) ; la liste suit. */
async function moveWrite(s, rows, to) {
  if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
  let done = 0;
  for (const r of rows.filter(x => MS.ownerOf(x) !== to)) {
    const t = s.move?.texts.get(r.id) ?? await missionText(s, r),
      out = t !== null ? MOVE.withAirline(t, to, globalThis.jsyaml) : null;
    if (!out) continue;
    try {
      await s.ctx.data.put(`missions/${r.folder}/${r.file}`, out.text, {
        module: 'missions'
      });
    } catch (e) {
      s.ctx.notify(s.tt(TX.addFailed, {
        e: String(e?.message || e).slice(0, 120)
      }), 'error');
      break;
    }
    done++;
    const airline = to === MS.PERSONAL ? '' : to;
    s.rows = s.rows.map(x => x.id === r.id ? {
      ...x,
      airline
    } : x);
    if (s.open?.row?.id === r.id) s.open.row = {
      ...s.open.row,
      airline
    };
  }
  if (S !== s) return;
  if (done) s.ctx.notify(s.tt(one(s, done) ? TX.moved1 : TX.moved, {
    n: done
  }), 'ok');
  s.move = null;
  if (s.open) s.open.move = null;
  draw(s);
}

// ---------------------------------------------------------------- « Ajouter des missions » (SOG-0212 b)
/** Les missions lues qui seront écrites : les nouvelles, et celles qui existent quand « remplacer » est coché. */
const toWrite = s => (s.add?.items || []).filter(i => !i.exists || s.add.replace.has(i.id));
/** L'écran : le choix (fichiers, texte collé), puis ce qui est lu avant d'écrire. */
function addHtml(s) {
  const a = s.add,
    head = `<h2>${esc(s.tt(TX.add))}</h2>`;
  if (!a.items) return `<div class="f-card" data-pane="add">${head}<p class="f-muted">${esc(s.tt(TX.addHint))}</p>
    <label class="f-field"><span>${esc(s.tt(TX.addFiles))}</span><input type="file" data-k="addfiles" accept=".yaml,.yml,text/yaml,application/yaml" multiple></label>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.addPaste))}</span><textarea data-k="addtext" rows="8" spellcheck="false" placeholder="${esc(s.tt(TX.addPaste))}"></textarea></label>
    <div class="f-row"><button type="button" class="primary" data-do="addread">${esc(s.tt(TX.addRead))}</button><button type="button" data-do="addcancel">${esc(s.tt(TX.back))}</button></div></div>`;
  const lang = s.ctx.lang?.() || 'fr',
    n = toWrite(s).length,
    item = i => `<div class="f-item" data-add="${esc(i.id)}"><span><b>${esc(i.id)}</b> ${esc(i.title)}</span><span class="f-muted">${esc([familyText(i.family, lang), i.series, i.airline || s.tt(TX.personal)].filter(Boolean).join(' · '))}</span>${i.exists ? `<label class="f-check"><input type="checkbox" data-replace="${esc(i.id)}"${a.replace.has(i.id) ? ' checked' : ''}> ${esc(s.tt(TX.exists))}</label>` : ''}</div>`,
    why = r => s.tt(TX[`why_${r.reason}`] || TX.why_noMission, {
      l: r.line || '?',
      m: r.msg || ''
    });
  return `<div class="f-card" data-pane="add">${head}<p class="f-muted" data-found>${esc(s.tt(TX.addFound, { n: a.items.length }))}</p>
    <div class="f-list" data-addlist>${a.items.map(item).join('')}</div>
    ${s.co?.filter && a.items.length ? `<label class="f-field"><span>${esc(s.tt(TX.addAs))}</span>${coSelect(s, 'addas', a.as || '', `<option value=""${a.as ? '' : ' selected'}>${esc(s.tt(TX.asInFile))}</option>`)}</label>` : ''}
    ${a.refused.length ? `<h3 class="f-muted">${esc(s.tt(TX.addRefused))}</h3><ul data-refused>${a.refused.map(r => `<li data-reason="${esc(r.reason)}">${esc(s.tt(TX.refusedLine, { w: [r.name, r.id].filter(Boolean).join(' · '), r: why(r) }))}</li>`).join('')}</ul>` : ''}
    <div class="f-row"><button type="button" class="primary" data-do="addwrite"${n ? '' : ' disabled'}>${esc(s.tt(TX.addDo, { n }))}</button><button type="button" data-do="addcancel">${esc(s.tt(TX.back))}</button></div></div>`;
}
/** « Lire » : les fichiers choisis et le texte collé, lus par add.js ; rien n'est écrit. */
async function addRead(s) {
  const files = [...(s.el.querySelector('[data-k=addfiles]')?.files || [])],
    pasted = s.el.querySelector('[data-k=addtext]')?.value || '',
    sources = [];
  for (const f of files.slice(0, ADD.LIMITS.files + 1)) sources.push({
    name: f.name,
    // un fichier trop gros n'est pas lu en entier : add.js le refuse à sa taille
    text: f.size > ADD.LIMITS.bytes ? ' '.repeat(ADD.LIMITS.bytes + 1) : await f.text().catch(() => '')
  });
  if (pasted.trim()) sources.push({
    name: s.tt(TX.pasted),
    text: pasted
  });
  if (!sources.length) return s.ctx.notify(s.tt(TX.addNothing), 'warn');
  if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
  const paths = new Set(await Promise.resolve().then(() => s.ctx.data.list('missions/')).catch(() => null) || []),
    known = new Map(s.rows.map(r => [r.id, r]));
  if (S !== s || !s.add) return;
  const got = ADD.read(sources, {
    yaml: globalThis.jsyaml,
    known,
    paths
  });
  s.add = {
    ...got,
    replace: new Set()
  };
  draw(s);
}
/** « Ajouter (n) » : chaque mission à sa place ; la liste les montre aussitôt (celles de la compagnie courante). */
async function addWrite(s) {
  const list = toWrite(s);
  if (!list.length) return;
  let done = 0;
  const as = s.add.as || '';
  for (const i of list) {
    // « Ajouter ces missions à » : la compagnie choisie écrite dans chaque mission (SOG-0223), sinon celle du fichier
    if (as) {
      const out = MOVE.withAirline(i.text, as, globalThis.jsyaml);
      if (out) {
        i.text = out.text;
        i.doc = globalThis.jsyaml.load(out.text);
        i.airline = as === MS.PERSONAL ? '' : as;
      }
    }
    try {
      await s.ctx.data.put(i.path, i.text, {
        module: 'missions'
      });
    } catch (e) {
      s.ctx.notify(s.tt(TX.addFailed, {
        e: String(e?.message || e).slice(0, 120)
      }), 'error');
      break;
    }
    done++;
    const row = MS.rowOfMission(i.doc, i.path);
    if (row) s.rows = [...s.rows.filter(r => r.id !== i.id), row].sort((a, b) => b.id.localeCompare(a.id));
  }
  if (S !== s) return;
  const away = list.slice(0, done).filter(i => s.co?.filter && MS.ownerOf(i) !== s.co.code).length;
  if (done) s.ctx.notify(`${s.tt(one(s, done) ? TX.added1 : TX.added, { n: done })}${away ? ` ${s.tt(away === done && done === 1 ? TX.addedElsewhereIt : away === 1 ? TX.addedElsewhere1 : TX.addedElsewhere, { n: away })}` : ''}`, 'ok');
  s.add = null;
  draw(s);
}

/** Un texte nettoyé et borné. */
const cut = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// ---------------------------------------------------------------- « Registre des missions » (SOG-0021, CONCEPTION § 2 bis)
const REG_READ_MAX = 500; // fichiers lus à l'ouverture de l'écran, au plus (un dépôt hors norme ne bloque pas l'écran)

/** Ouvre l'écran : le registre et les fichiers du dépôt lus, l'état de chaque ligne dit au fur et à mesure. */
async function regOpen(s) {
  s.reg = {
    q: '',
    fam: '', // le filtre de famille ('' : toutes), en tête comme dans la V2 (SOG-0286)
    all: false,
    doc: null,
    why: 'loading',
    err: '',
    lines: [],
    status: new Map(), // place de la ligne → 'ok' | 'missing' | 'unreadable' | 'refused' (absent : lecture en cours)
    found: [], // [{ path, entry }] les missions du dépôt que le registre ne connaît pas
    checking: true,
    plan: null, // le plan montré avant d'écrire
    edit: null // la place de la ligne en correction
  };
  draw(s);
  await regLoad(s);
}

/** Lit le registre, puis chaque fichier de mission (huit à la fois) : les lignes d'abord, leur état ensuite. */
async function regLoad(s) {
  const r = s.reg;
  if (!r) return;
  const live = () => S === s && s.reg === r;
  let got = await yamlFile(s.ctx, REGISTRY);
  if (got.why === 'late') got = await got.later;
  if (!live()) return;
  r.doc = got.doc && typeof got.doc === 'object' ? got.doc : null;
  r.why = got.why || '';
  r.err = got.err || '';
  r.lines = RG.entries(r.doc);
  r.status = new Map();
  r.readOf = null;
  r.found = [];
  r.plan = null;
  r.edit = null;
  r.checking = true;
  draw(s);
  const set = new Set(await Promise.resolve().then(() => s.ctx.data.list('missions/')).catch(() => null) || []);
  if (!live()) return;
  const todo = [];
  for (const e of r.lines) {
    const p = RG.pathOf(e.row);
    if (!p) r.status.set(e.idx, 'refused');
    else if (!set.has(p)) r.status.set(e.idx, 'missing');
    else todo.push(e);
  }
  const named = new Set(r.lines.map(e => RG.pathOf(e.row))),
    ids = new Set(r.lines.flatMap(e => [e.row.id, e.row.formerId].filter(Boolean))),
    extra = [...set].map(p => [p, MS.missionPath(p)]).filter(([p, w]) => w && !named.has(p) && !ids.has(w.id));
  draw(s);
  const jobs = [...todo.slice(0, REG_READ_MAX).map(e => ({
    e
  })), ...extra.slice(0, REG_READ_MAX).map(([p]) => ({
    p
  }))];
  for (let i = 0; i < jobs.length; i += 8) {
    await Promise.all(jobs.slice(i, i + 8).map(async j => {
      const path = j.e ? RG.pathOf(j.e.row) : j.p;
      let f = await yamlFile(s.ctx, path);
      if (f.why === 'late') f = await f.later;
      if (j.e) r.status.set(j.e.idx, f.why === 'missing' ? 'missing' : f.doc && MS.readMission(f.doc) ? 'ok' : 'unreadable');
      else {
        const entry = f.doc ? RG.entryOfMission(f.doc, path) : null;
        if (entry && !ids.has(entry.id)) {
          ids.add(entry.id);
          r.found.push({
            path,
            entry
          });
        }
      }
    }));
    if (!live()) return;
  }
  // au-delà de la limite : « non lu », dit sur la ligne et au compte (« 500 fichiers lus sur N ») ; jamais « là » sans l'avoir lu (audit 174)
  for (const e of todo.slice(REG_READ_MAX)) r.status.set(e.idx, 'notread');
  r.readOf = todo.length > REG_READ_MAX ? {
    r: REG_READ_MAX,
    n: todo.length
  } : null;
  r.checking = false;
  draw(s);
}

/** La signature d'un document de registre (places et identifiants) : le même écran refuse d'écrire sur un registre qui a changé. */
const regSig = doc => JSON.stringify(RG.entries(doc).map(e => [e.idx, e.row.id]));

/** L'état d'une ligne pour l'œil : [clé, texte]. */
function regState(s, idx) {
  const k = s.reg.status.get(idx);
  return k ? [k, k === 'notread' ? s.tt(TX.regNotRead, {
    m: REG_READ_MAX
  }) : s.tt(k === 'ok' ? TX.regOk : k === 'missing' ? TX.regMissing : k === 'refused' ? TX.regRefused : TX.regUnread)] : [
    'checking', s.tt(TX.regChecking)
  ];
}

/** Les lignes de l'écran, dans l'ordre : les missions que le registre ne connaît pas, les lignes à problème, les autres ; chaque groupe
 *  par série puis identifiant, l'ordre du tableau de la V2 (SOG-0286) ; la recherche filtre sur l'identifiant et le titre, le filtre
 *  sur la famille. */
function regRows(s) {
  const r = s.reg,
    plan = RG.planOf(r.doc, r.status, r.found),
    bad = new Set([...plan.dup, ...plan.former]),
    serOf = e => Number.isFinite(+e.raw.series) && e.raw.series !== '' && e.raw.series !== null ? +e.raw.series : 1e9,
    q = r.q.trim().toUpperCase(),
    hit = (id, title, fam) => (!q || `${id} ${title}`.toUpperCase().includes(q)) && (!r.fam || fam === r.fam),
    rows = [
      ...r.found.filter(f => hit(f.entry.id, f.entry.title, f.entry.family)).sort((a, b) => b.entry.id.localeCompare(a.entry.id)).map(f =>
        ({
          kind: 'found',
          f
        })),
      ...r.lines.filter(e => hit(e.row.id, e.row.title, e.row.family)).map(e => ({
        kind: 'line',
        e,
        rank: r.status.get(e.idx) === 'notread' ? 2 : r.status.get(e.idx) === 'ok' && !bad.has(e.idx) ? 1 : 0 // les non lues en dernier
      })).sort((a, b) => a.rank - b.rank || serOf(a.e) - serOf(b.e) || a.e.row.id.localeCompare(b.e.row.id))
    ];
  return {
    rows,
    plan
  };
}

/** Le signe d'état d'une ligne repliée (le mot entier en infobulle, et au dépli) : ✓ fichier là, … lecture, + pas dans le registre,
 *  ! tout le reste (manquant, illisible, chemin refusé, double, ancien identifiant). */
const SIGN = {
  ok: '✓',
  checking: '…',
  notread: '?',
  notyet: '+'
};

/** La ligne repliée d'une mission (le modèle du tableau de la V2, SOG-0286) : le signe d'état, l'identifiant, le titre ; puis famille ·
 *  série et origine → destination. Deux lignes de texte au plus au téléphone, une seule sur un écran large. */
function regSumHtml(s, k, word, id, title, fam, series, from, to, warn) {
  const kind = warn ? 'warn' : k === 'ok' ? 'ok' : k === 'checking' || k === 'notread' ? 'info' : 'warn',
    has = v => v !== undefined && v !== null && v !== '',
    second = [
      [familyParts(fam, s.ctx.lang?.() || 'fr').short, has(series) ? cut(series, 8) : ''].filter(Boolean).join(' · '),
      from || to ? `${from || '?'} → ${to || '?'}` : ''
    ].filter(Boolean).join(' · ');
  return `<summary><span><span class="ms-rsign" data-kind="${kind}" data-rstate="${k}" title="${esc(word)}" aria-label="${esc(word)}">${SIGN[k] && !warn ? SIGN[k] : '!'}</span><b>${esc(id)}</b> ${esc(title)}</span><span class="f-muted">${esc(second)}</span></summary>`;
}

/** Une ligne du registre : repliée, le signe d'état, l'identifiant, le titre, famille · série, origine → destination ; au dépli, l'état
 *  du fichier en toutes lettres, famille · série · numéro · opération, le chemin, « Corriger » / « Retirer ». */
function regLineHtml(s, e, plan) {
  const r = s.reg,
    row = e.row,
    [k, st] = regState(s, e.idx),
    lang = s.ctx.lang?.() || 'fr',
    dup = plan.dup.includes(e.idx),
    former = plan.former.includes(e.idx),
    badges = [`<span class="f-badge" data-kind="${k === 'ok' ? 'ok' : k === 'checking' || k === 'notread' ? 'info' : 'warn'}">${esc(st)}</span>`,
      dup ? `<span class="f-badge" data-kind="warn" data-rdup>${esc(s.tt(TX.regDup))}</span>` : '',
      former ? `<span class="f-badge" data-kind="info" data-rformer>${esc(s.tt(TX.regFormer, { f: cut(e.raw.id, 40) }))}</span>` : ''
    ].join(' '),
    has = v => v !== undefined && v !== null && v !== '',
    detail = [familyText(row.family, lang), has(e.raw.series) ? `${s.tt(TX.regSeries)} ${cut(e.raw.series, 8)}` : '',
      has(e.raw.number) ? `${s.tt(TX.regNumber)} ${cut(e.raw.number, 8)}` : '', row.operation
    ].filter(Boolean).join(' · '),
    path = RG.pathOf(row),
    word = [st, dup ? s.tt(TX.regDup) : '', former ? s.tt(TX.regFormer, {
      f: cut(e.raw.id, 40)
    }) : ''].filter(Boolean).join(' · ');
  return `<details class="ms-rrow" data-rid="${e.idx}" data-rowid="${esc(row.id)}"${r.edit === e.idx ? ' open' : ''}>${regSumHtml(s, k, word, row.id, row.title, row.family, e.raw.series, row.originIcao || cut(row.origin, 12), row.destinationIcao || cut(row.destination, 12), dup || former)}
    <div class="ms-rbody"><span>${badges}</span><span class="f-muted">${esc(detail)}</span>${path ? `<span class="f-muted" data-rpath>${esc(path)}</span>` : ''}${r.edit === e.idx ? regEditHtml(s, e) : `<span class="f-row"><button type="button" data-do="regedit" data-rid="${e.idx}">${esc(s.tt(TX.regEdit))}</button><button type="button" data-do="regremove" data-rid="${e.idx}">${esc(s.tt(TX.regRemove))}</button></span>`}</div></details>`;
}

/** Le formulaire de correction d'une ligne : titre, série, numéro, opération. */
function regEditHtml(s, e) {
  const f = (k, label, v, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="${k}" value="${esc(v)}" autocomplete="off"${extra}></label>`;
  return `<div data-redit>${f('rtitle', TX.regTitleF, e.row.title, ' maxlength="200"')}${f('rseries', TX.regSeries, e.raw.series ?? '', ' inputmode="numeric" maxlength="5"')}${f('rnumber', TX.regNumber, e.raw.number ?? '', ' inputmode="numeric" maxlength="5"')}${f('rop', TX.regOperation, e.row.operation, ' maxlength="120"')}
    <div class="f-row"><button type="button" class="primary" data-do="regsave" data-rid="${e.idx}">${esc(s.tt(TX.regSave))}</button><button type="button" data-do="regeditcancel">${esc(s.tt(TX.cancel))}</button></div></div>`;
}

/** Les lignes (une par mission, soixante puis « N autres », SOG-0286) : redessinées seules à la frappe et au filtre de famille. */
function regListHtml(s) {
  const r = s.reg,
    {
      rows,
      plan
    } = regRows(s),
    shown = r.all ? rows : rows.slice(0, REG_ROWS),
    found = f => `<details class="ms-rrow" data-rid="new" data-rowid="${esc(f.entry.id)}">${regSumHtml(s, 'notyet', s.tt(TX.regNotYet), f.entry.id, f.entry.title, f.entry.family, f.entry.series, '', '', false)}
      <div class="ms-rbody"><span><span class="f-badge" data-kind="warn">${esc(s.tt(TX.regNotYet))}</span></span><span class="f-muted">${esc([familyText(f.entry.family, s.ctx.lang?.() || 'fr'), f.entry.operation?.name].filter(Boolean).join(' · '))}</span><span class="f-muted" data-rpath>${esc(f.path)}</span></div></details>`,
    item = x => x.kind === 'found' ? found(x.f) : regLineHtml(s, x.e, plan);
  return `<div class="f-list" data-reglist>${rows.length ? shown.map(item).join('') : `<p class="f-muted">${esc(s.tt(TX.regNone))}</p>`}</div>
    ${rows.length > shown.length ? `<button type="button" class="f-linkbtn" data-do="regmore">${esc(s.tt(TX.more, { n: rows.length - shown.length }))}</button>` : ''}`;
}

/** Le plan montré avant d'écrire (CONCEPTION § 2 bis : « il montre d'abord ce qu'il ferait »). */
function regPlanHtml(s) {
  const p = s.reg.plan,
    n = (key, v) => v ? `<li data-plan="${key}">${esc(s.tt(TX[`regPlan${key}`], { n: v }))}</li>` : '',
    any = p.add.length || p.dup.length || p.former.length;
  return `<div class="f-card" data-regplan><p><b>${esc(s.tt(TX.regPlanHead))}</b></p><ul>${n('Add', p.add.length)}${n('Dup', p.dup.length)}${n('Former', p.former.length)}${n('NoFile', p.noFile.length)}</ul>
    ${any ? '' : `<p class="f-muted" data-plan="nothing">${esc(s.tt(TX.regPlanNothing))}</p>`}
    <div class="f-row"><button type="button" class="primary" data-do="regwrite"${any ? '' : ' disabled'}>${esc(s.tt(TX.regWrite))}</button><button type="button" data-do="regplancancel">${esc(s.tt(TX.cancel))}</button></div></div>`;
}

/** L'écran « Registre des missions ». */
function regHtml(s) {
  const r = s.reg,
    n = r.lines.length,
    lang = s.ctx.lang?.() || 'fr',
    // les familles des lignes et des missions hors registre : le filtre en tête, comme le « Type » de la V2 (SOG-0286)
    fams = [...new Set([...r.lines.map(e => e.row.family), ...r.found.map(f => f.entry.family)].filter(Boolean))].sort(),
    broken = r.why === 'unreadable',
    // l'en-tête tient en deux lignes (SOG-0286 : vingt missions vues sans défiler à 1 280) : le titre (l'explication en infobulle et
    // dans l'aide), puis « Mettre à jour le registre », « Retour » et le compte sur la même ligne
    count = r.why === 'loading' || broken ? '' : `<span class="f-muted" data-regcount>${esc(s.tt(TX.regCount, { n }))}${r.found.length ? ` · ${esc(s.tt(TX.regUnlisted, { n: r.found.length }))}` : ''}${r.checking ? ` · ${esc(s.tt(TX.regChecking))}` : ''}${r.readOf ? ` · <span data-regreadof>${esc(s.tt(TX.regReadOf, r.readOf))}</span>` : ''}</span>`,
    head = `<div class="f-card" data-pane="registry"><h2 title="${esc(s.tt(TX.regHint))}">${esc(s.tt(TX.regTitle))}</h2>
    <div class="f-row ms-regbar"><button type="button" class="primary" data-do="regplan"${r.checking || broken ? ' disabled' : ''}>${esc(s.tt(TX.regUpdate))}</button><button type="button" data-do="regback">${esc(s.tt(TX.back))}</button>${count}</div>`;
  if (r.why === 'loading') return `${head}<p class="f-muted" data-why="loading">${esc(s.tt(TX.regLoading))}</p></div>`;
  if (broken) return `${head}<p class="f-warn" data-why="unreadable">${esc(s.tt(TX.regUnreadable, { e: r.err }))}</p></div>`;
  return `${head}${r.why === 'missing' ? `<p class="f-muted" data-why="missing">${esc(s.tt(TX.none))}</p>` : ''}
    ${r.plan ? regPlanHtml(s) : ''}
    <div class="ms-reghead"><label class="f-field"><span class="f-sr">${esc(s.tt(TX.allFamilies))}</span><select data-k="rfam"><option value="">${esc(s.tt(TX.allFamilies))}</option>${fams.map(f => `<option value="${esc(f)}"${r.fam === f ? ' selected' : ''}>${esc(familyText(f, lang))}</option>`).join('')}</select></label>
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.regSearch))}</span><input type="search" data-k="rq" value="${esc(r.q)}" placeholder="${esc(s.tt(TX.regSearch))}" autocomplete="off"></label></div>
    <div data-regrows>${regListHtml(s)}</div></div>`;
}

/** Écrit le registre : relu d'abord (un autre pilote a pu l'écrire), la retouche faite sur ce qui vient d'être lu, refusée si la ligne
 *  visée n'est plus la même (« stale ») ; YAML dumpé, une seule écriture ; les lignes sont relues ensuite. `change(doc)` → { doc } | { error }. */
async function regPut(s, change, done) {
  const r = s.reg;
  if (!r || r.busy) return;
  r.busy = true;
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    let got = await yamlFile(s.ctx, REGISTRY);
    if (got.why === 'late') got = await got.later;
    if (S !== s || s.reg !== r) return;
    // un registre qui ne se lit pas n'est jamais réécrit ; un registre absent se crée
    if (got.why && got.why !== 'missing') return s.ctx.notify(s.tt(TX.regFailed, {
      e: got.err || s.tt(TX.regUnread)
    }), 'error');
    const fresh = got.doc && typeof got.doc === 'object' ? got.doc : {};
    if (r.doc && regSig(fresh) !== regSig(r.doc)) {
      s.ctx.notify(s.tt(TX.regStale), 'warn');
      r.busy = false;
      return regLoad(s);
    }
    const out = change(fresh);
    if (out.error === 'stale') {
      s.ctx.notify(s.tt(TX.regStale), 'warn');
      r.busy = false;
      return regLoad(s);
    }
    if (out.error) return s.ctx.notify(s.tt(TX.regBadNumber), 'warn');
    await s.ctx.data.put(REGISTRY, RG.withHeader(out.doc, globalThis.jsyaml), {
      module: 'missions'
    });
    s.rows = MS.readRegistry(out.doc).filter(x => !x.organisation).sort((a, b) => b.id.localeCompare(a.id));
    done?.();
    r.busy = false;
    await regLoad(s);
  } catch (e) {
    s.ctx.notify(s.tt(TX.regFailed, {
      e: String(e?.message || e).slice(0, 120)
    }), 'error');
  } finally {
    r.busy = false;
  }
}

/** Les gestes de l'écran Registre (retourne vrai quand le geste est le sien). */
async function regClick(s, b) {
  const r = s.reg,
    idx = Number.isInteger(+b.dataset.rid) ? +b.dataset.rid : -1,
    line = r.lines.find(e => e.idx === idx);
  switch (b.dataset.do) {
    case 'regback':
      s.reg = null;
      return draw(s);
    case 'regplan':
      r.plan = RG.planOf(r.doc, r.status, r.found);
      return draw(s);
    case 'regplancancel':
      r.plan = null;
      return draw(s);
    case 'regwrite': {
      const plan = r.plan;
      return regPut(s, doc => ({
        doc: RG.applyPlan(doc, plan)
      }), () => s.ctx.notify(s.tt(TX.regWritten), 'ok'));
    }
    case 'regmore':
      r.all = true;
      return draw(s);
    case 'regedit':
      r.edit = idx;
      return draw(s);
    case 'regeditcancel':
      r.edit = null;
      return draw(s);
    case 'regsave': {
      if (!line) return;
      const v = k => s.el.querySelector(`[data-redit] [data-k=${k}]`)?.value ?? '';
      return regPut(s, doc => RG.editEntry(doc, idx, line.row.id, {
        title: v('rtitle'),
        series: v('rseries'),
        number: v('rnumber'),
        operation: v('rop')
      }));
    }
    case 'regremove': {
      if (!line) return;
      if (!await s.ctx.ask(s.tt(TX.regRemoveAsk, {
          id: line.row.id
        }), {
          ok: s.tt(TX.regRemove)
        })) return;
      return regPut(s, doc => RG.removeEntry(doc, idx, line.row.id), () => s.ctx.notify(s.tt(TX.regRemoved, {
        id: line.row.id
      }), 'ok'));
    }
  }
}
