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
import * as SE from './search.js'; // la recherche dans le contenu des missions (SOG-0288) : le calcul pur
import * as ED from './editor.js'; // l'éditeur de missions (SOG-0287) : le calcul pur
import * as AS from './assigned.js'; // « Mes missions affectées » (SOG-0114 (A)) : le calcul pur
import {
  copyText
} from '../../frame/lib/clipboard.js';
import *
as MT from '../../frame/lib/mission_themes.js'; // le thème d'une ancienne catégorie (SOG-0202 T2) // changer la compagnie d'une mission : le champ airline retouché dans le texte (SOG-0223)
import * as MC from '../../frame/lib/mission_categories.js'; // les catégories de la compagnie (SOG-0041, § 10.38)
import {
  familyLetters,
  familyParts,
  familyText
} from '../report/vocab.js'; // une famille : son sigle d'abord, puis son nom long (SOG-0179, une seule source avec le compte rendu)

export const meta = {
  id: 'missions',
  apps: ['company'], // l'application Compagnie (?app=company), seule (décision de l'utilisateur, 1er nov. 2026)
  level: 1,
  title: ['Missions', 'Missions', 'Missionen', 'Misiones'],
  files: ['add.js', 'move.js', 'registry.js', 'search.js', 'editor.js', 'assigned.js', '../../frame/lib/clipboard.js',
    '../../frame/lib/mission.js',
    '../../frame/lib/js-yaml.min.js',
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
[data-module="missions"] .ms-assignedbox{margin:0 0 12px} /* SOG-0114 (A) : « Mes missions affectées », en tête */
[data-module="missions"] .ms-asshead{font-size:1rem;margin:4px 0 8px}
[data-module="missions"] .ms-assigned>span>small{display:block;margin-top:2px}
[data-module="missions"] .ms-meets{display:block}
[data-module="missions"] .ms-meet{display:flex;align-items:center;gap:8px;min-height:44px} /* un canal par ligne, son geste à 44 px */
[data-module="missions"] .ms-meet>.f-linkbtn{display:inline-flex;align-items:center}
[data-module="missions"] .ms-sheet[data-detail] .ms-first{display:none}
[data-module="missions"] .ms-sheet[data-detail] .ms-detail{display:block}
[data-module="missions"] .ms-lines{margin:.2em 0 .4em;padding-left:1.1em}
[data-module="missions"] [data-famlong]{font-weight:400}
[data-module="missions"] .f-linkbtn{min-height:44px;padding:0 4px;border:0;border-radius:0;background:none;box-shadow:none;text-shadow:none;color:var(--sog-link);text-decoration:underline;font:inherit;cursor:pointer} /* « Changer », « N autres » : des liens dans le texte (SOG-0223) */
[data-module="missions"] .ms-fam{display:block;font-size:.72em;margin-top:.15em} /* la famille sous le titre de la fiche : « SAR · Récupération de personnel » (SOG-0187) */ /* le sigle en gras, le nom long en clair (SOG-0179) */
[data-module="missions"] .ms-summary{margin:.2em 0 .4em} /* le résumé EN ENTIER sous son nom (SOG-0291 : coupé à deux lignes, il se lisait comme un extrait) */
[data-module="missions"] .ms-summary>h3{margin:0 0 .15em}
[data-module="missions"] .ms-summary>p{margin:0}
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
[data-module="missions"] .ms-reghead>.ms-famrow{flex:2 1 24em;margin:0}
[data-module="missions"] .ms-famrow{gap:0 .75em;flex-wrap:wrap} /* la famille et, choisie, son sous-type sur une ligne (SOG-0292) */
[data-module="missions"] .ms-famrow>.f-field{flex:1 1 12em;min-width:0}
[data-module="missions"] .ms-famrow select{max-width:100%}
/* l'éditeur (SOG-0287, la maquette est le contrat) : téléphone, une étape à la fois, pastilles qui défilent, barre du bas ; large,
   étapes à gauche, formulaire au centre, aperçu et « À compléter » à droite */
[data-module="missions"] .ms-crumb{margin:0 0 .2em}
[data-module="missions"] .ms-ed>h2{margin:.1em 0 .3em;font-size:1.4em}
[data-module="missions"] .ms-edpend{display:inline-block;margin:0 0 .6em}
[data-module="missions"] .ms-steps{display:flex;gap:8px;overflow-x:auto;padding:2px 0 8px;margin:0 0 4px}
[data-module="missions"] .ms-steps>button{flex:0 0 auto;border-radius:999px;min-height:44px;white-space:nowrap}
[data-module="missions"] .ms-steps>button[aria-current=step]{outline:2px solid var(--accent,#1a73e8)}
[data-module="missions"] .ms-stepmark{display:inline-block;width:1.6em;height:1.6em;line-height:1.6em;border-radius:50%;text-align:center;background:color-mix(in srgb,currentColor 14%,transparent)}
[data-module="missions"] .ms-tlabel{display:block;font-size:.85em}
[data-module="missions"] .ms-stepmark[data-kind=ok]{color:var(--ok,#1e7e34)}
[data-module="missions"] .ms-stepmark[data-kind=warn]{color:var(--warn,#b06f00)}
[data-module="missions"] .ms-edform{min-width:0}
[data-module="missions"] .ms-edform .f-row{align-items:flex-start}
[data-module="missions"] .ms-edform .f-row>.f-field{flex:1 1 10em;min-width:0}
[data-module="missions"] .ms-edaside{display:none}
[data-module="missions"] .ms-edbar{position:sticky;bottom:var(--f-tab-space,0px);display:flex;gap:8px;align-items:center;padding:8px 0;background:var(--sog-bg,#fff);z-index:2} /* au-dessus de la barre d'onglets du téléphone, comme rp-dock */
[data-module="missions"] .ms-edbar>.ms-edcancel{margin-left:auto}
[data-module="missions"] .ms-edteam{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:4px 8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-edteam>.f-field{margin:0;min-width:0}
[data-module="missions"] .ms-edthead{display:none}
[data-module="missions"] .ms-plrow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-plbadge{font-size:.8em;font-weight:700;padding:.35em .5em;border-radius:4px;background:color-mix(in srgb,currentColor 8%,transparent);min-width:3.4em;text-align:center}
[data-module="missions"] .ms-plbody{display:flex;flex-direction:column;min-width:0}
[data-module="missions"] .ms-plbody>*{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-module="missions"] .ms-plform{grid-column:1 / -1;padding:4px 0 8px}
[data-module="missions"] .ms-pladd{flex-wrap:wrap;align-items:center;margin-top:8px}
[data-module="missions"] .ms-rkrow{grid-template-columns:minmax(0,1fr) auto}
[data-module="missions"] .ms-evrow{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}
[data-module="missions"] .ms-evrow>.ms-evtext{grid-column:1 / span 2}
@container (min-width: 850px){
  [data-module="missions"] .ms-evrow{grid-template-columns:minmax(0,.6fr) minmax(0,1fr) minmax(0,2fr) auto}
  [data-module="missions"] .ms-evrow>.ms-evtext{grid-column:auto}
}
[data-module="missions"] .ms-edform textarea{width:100%;box-sizing:border-box;resize:vertical;font:inherit}
[data-module="missions"] .ms-stload>.f-field:first-child{flex:3 1 14em}
[data-module="missions"] [data-stcount][data-over="1"]{color:var(--sog-warn,#b06f00)} /* au-delà de 600 : la synthèse coupera (jamais l'écriture) */
[data-module="missions"] .ms-edteam>.ms-edtdel{grid-column:3;grid-row:1 / span 2;min-width:44px;min-height:44px}
@container (min-width: 850px){
  [data-module="missions"] .ms-edteam{grid-template-columns:minmax(0,1fr) minmax(0,.7fr) minmax(0,1.2fr) minmax(0,1.2fr) auto}
  [data-module="missions"] .ms-edteam>.ms-edtdel{grid-column:auto;grid-row:auto}
  [data-module="missions"] .ms-edthead{display:grid;padding:0;border:0;font-size:.9em}
  [data-module="missions"] .ms-tlabel{display:none}
}
@container (min-width: 850px){
  [data-module="missions"] .ms-edgrid{display:grid;grid-template-columns:minmax(12em,16em) minmax(0,1fr) minmax(14em,20em);gap:16px;align-items:start}
  [data-module="missions"] .ms-steps{flex-direction:column;overflow:visible}
  [data-module="missions"] .ms-steps>button{border-radius:6px;text-align:left;border-color:transparent;background:none}
  [data-module="missions"] .ms-steps>button[aria-current=step]{outline:none;background:var(--accent-bg,#e8f0fe)}
  [data-module="missions"] .ms-edaside{display:block}
  /* la barre d'actions en bas de l'écran, alignée sur le formulaire (la maquette) : l'éditeur occupe la hauteur, la barre colle en bas */
  [data-module="missions"] .ms-ed{display:flex;flex-direction:column;min-height:calc(100dvh - 160px)}
  [data-module="missions"] .ms-edbar{margin-top:auto;display:grid;grid-template-columns:minmax(12em,16em) auto auto minmax(0,1fr);column-gap:8px;border-top:1px solid var(--sog-line,#ddd)}
  [data-module="missions"] .ms-edbar>:first-child{grid-column:2;margin-left:8px}
  [data-module="missions"] .ms-edbar>.ms-edcancel{justify-self:end}
  [data-module="missions"] .ms-edaside>.f-card{margin:0 0 12px}
}
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
@container (min-width: 850px){
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
  // le résumé (champ summary), sous son nom ; au-delà de SUM_MAX signes, coupé avec « Lire la suite » vers le Détail (SOG-0291)
  sumTitle: ['Résumé', 'Summary', 'Kurzbeschreibung', 'Resumen'],
  // la seconde liste d'un filtre de famille (SOG-0292) : les sous-types de la famille choisie
  allSubtypes: ['Tous les sous-types', 'All subtypes', 'Alle Untertypen', 'Todos los subtipos'],
  readMore: ['Lire la suite', 'Read more', 'Weiterlesen', 'Seguir leyendo'],
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
  searchHint: [
    'Identifiant, titre, contenu de la mission (résumé, description, risques, lieux…), terrain (code OACI), type d’aéronef, indicatif (SAMU66), activité (MEDEVAC, HEMS, SAMU…).',
    'Id, title, content of the mission (summary, description, risks, places…), aerodrome (ICAO code), aircraft type, callsign (SAMU66), activity (MEDEVAC, HEMS, SAMU…).',
    'ID, Titel, Inhalt der Mission (Kurzbeschreibung, Beschreibung, Risiken, Orte …), Flugplatz (ICAO-Code), Luftfahrzeugtyp, Rufzeichen (SAMU66), Tätigkeit (MEDEVAC, HEMS, SAMU…).',
    'Id, título, contenido de la misión (resumen, descripción, riesgos, lugares…), aeródromo (código OACI), tipo de aeronave, indicativo (SAMU66), actividad (MEDEVAC, HEMS, SAMU…).'
  ],
  // la recherche dans le contenu (SOG-0288) : où le mot a été trouvé quand ce n'est pas le titre ; les missions cherchées sur leur ligne seule
  foundIn: ['dans : {w}', 'in: {w}', 'in: {w}', 'en: {w}'],
  unreadN: ['{n} mission(s) non lue(s) sur cet appareil : cherchée(s) sur la ligne du registre seulement',
    '{n} mission(s) not read on this device: searched on the registry line only',
    '{n} Mission(en) auf diesem Gerät nicht gelesen: nur in der Registerzeile gesucht',
    '{n} misión(es) no leída(s) en este dispositivo: buscada(s) solo en la línea del registro'
  ],
  inSummary: ['résumé', 'summary', 'Kurzbeschreibung', 'resumen'],
  inDescription: ['description', 'description', 'Beschreibung', 'descripción'],
  inObjectives: ['objectifs', 'objectives', 'Ziele', 'objetivos'],
  inRisks: ['risques', 'risks', 'Risiken', 'riesgos'],
  inPlaces: ['lieux', 'places', 'Orte', 'lugares'],
  inNotes: ['notes', 'notes', 'Notizen', 'notas'],
  inCallsigns: ['indicatifs', 'callsigns', 'Rufzeichen', 'indicativos'],
  inTypes: ['types', 'types', 'Typen', 'tipos'],
  inLine: ['ligne du registre', 'registry line', 'Registerzeile', 'línea del registro'],
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
  // audit 186 : un document à ancres YAML n'est jamais réécrit (le dépliage figerait l'écriture) ; dire comment l'ôter
  why_alias: ['alias YAML (« &… », « *… ») : écrivez l\'objet répété en entier à chaque endroit',
    'YAML aliases (« &… », « *… »): write the repeated object out in full at each place',
    'YAML-Aliasse („&…“, „*…“): das wiederholte Objekt an jeder Stelle ausschreiben',
    'alias YAML («&…», «*…»): escriba el objeto repetido entero en cada lugar'
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
  // SOG-0114 (A) : les missions qu'une affectation de la compagnie donne à ce pilote
  assignedHead: ['Mes missions affectées', 'My assigned missions', 'Meine zugewiesenen Missionen', 'Mis misiones asignadas'],
  assignedOff: ['décollage {ad} {t}', 'take-off {ad} {t}', 'Start {ad} {t}', 'despegue {ad} {t}'],
  assignedFerry: ['convoyage', 'ferry', 'Überführung', 'traslado'],
  assignedRdv: ['rendez-vous {t}', 'rendezvous {t}', 'Treffpunkt {t}', 'encuentro {t}'],
  meetOpen: ['Ouvrir', 'Open', 'Öffnen', 'Abrir'],
  meetCopy: ['Copier', 'Copy', 'Kopieren', 'Copiar'],
  meetCopied: ['Copié : {v}', 'Copied: {v}', 'Kopiert: {v}', 'Copiado: {v}'],
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
  regEdit: ['Corriger', 'Correct', 'Korrigieren', 'Corregir'],
  // l'éditeur de missions (SOG-0287, maquette validée le 13 nov. : modules/missions/maquette/)
  edCreate: ['Créer une mission', 'Create a mission', 'Mission anlegen', 'Crear una misión'],
  edModify: ['Modifier', 'Edit', 'Bearbeiten', 'Modificar'],
  edDup: ['Dupliquer', 'Duplicate', 'Duplizieren', 'Duplicar'],
  edCrumbNew: ['Missions › Registre › Créer', 'Missions › Registry › Create', 'Missionen › Register › Anlegen',
    'Misiones › Registro › Crear'
  ],
  edCrumbEdit: ['Missions › Registre › Modifier', 'Missions › Registry › Edit', 'Missionen › Register › Bearbeiten',
    'Misiones › Registro › Modificar'
  ],
  edCrumbDup: ['Missions › Registre › Dupliquer', 'Missions › Registry › Duplicate', 'Missionen › Register › Duplizieren',
    'Misiones › Registro › Duplicar'
  ],
  edNewTitle: ['Nouvelle mission', 'New mission', 'Neue Mission', 'Nueva misión'],
  edPending: ['modifiée sur cet appareil — pas encore envoyée', 'changed on this device — not sent yet',
    'auf diesem Gerät geändert — noch nicht gesendet',
    'modificada en este dispositivo — aún no enviada'
  ],
  stepCadre: ['Cadre', 'Frame', 'Rahmen', 'Marco'],
  stepTeams: ['Équipes', 'Teams', 'Teams', 'Equipos'],
  stepPlaces: ['Lieux', 'Places', 'Orte', 'Lugares'],
  stepStory: ['Récit', 'Story', 'Erzählung', 'Relato'],
  stepRisks: ['Risques', 'Risks', 'Risiken', 'Riesgos'],
  stepTimeline: ['Chronologie et cartes', 'Timeline and maps', 'Ablauf und Karten', 'Cronología y mapas'],
  edCadreHint: ['Ce qui range la mission : sa famille, sa série, son identifiant, d\'où elle part et où elle arrive.',
    'What files the mission: its family, its series, its identifier, where it leaves from and where it arrives.',
    'Was die Mission einordnet: Familie, Serie, Kennung, Abflug und Ankunft.',
    'Lo que clasifica la misión: su familia, su serie, su identificador, de dónde sale y adónde llega.'
  ],
  edLater: ['Cette étape arrive dans un prochain lot ; d\'ici là, elle se remplit dans la V2.',
    'This step comes in a next lot; until then, it is filled in the V2.',
    'Dieser Schritt kommt in einem nächsten Los; bis dahin wird er in der V2 ausgefüllt.',
    'Este paso llega en un próximo lote; hasta entonces, se rellena en la V2.'
  ],
  edFamily: ['Famille', 'Family', 'Familie', 'Familia'],
  edSubtype: ['Sous-type', 'Subtype', 'Untertyp', 'Subtipo'],
  edSeries: ['Série', 'Series', 'Serie', 'Serie'],
  edId: ['Identifiant', 'Identifier', 'Kennung', 'Identificador'],
  edTitle: ['Titre', 'Title', 'Titel', 'Título'],
  edTheatre: ['Théâtre', 'Theatre', 'Einsatzgebiet', 'Teatro'],
  edDep: ['Départ', 'Departure', 'Abflug', 'Salida'],
  edArr: ['Arrivée', 'Arrival', 'Ankunft', 'Llegada'],
  edNextSeries: ['suivante : {n}', 'next: {n}', 'nächste: {n}', 'siguiente: {n}'],
  edIdKept: ['l\'ancien est gardé', 'the former one is kept', 'die frühere bleibt erhalten', 'el anterior se conserva'],
  edIdNext: ['le suivant de la famille', 'the next of the family', 'die nächste der Familie', 'el siguiente de la familia'],
  edPlaceHint: ['code OACI · nom', 'ICAO code · name', 'ICAO-Code · Name', 'código OACI · nombre'],
  edSave: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  edNext: ['Suivante', 'Next', 'Weiter', 'Siguiente'],
  edPreview: ['Aperçu de la fiche', 'Preview of the sheet', 'Vorschau des Blatts', 'Vista previa de la ficha'],
  edTodo: ['À compléter', 'To complete', 'Zu ergänzen', 'Por completar'],
  edNothing: ['rien', 'nothing', 'nichts', 'nada'],
  edSeriesN: ['série {n}', 'series {n}', 'Serie {n}', 'serie {n}'],
  edSaved: ['Mission enregistrée sur cet appareil ; elle part avec le prochain envoi.',
    'Mission saved on this device; it goes with the next send.',
    'Mission auf diesem Gerät gespeichert; sie geht mit dem nächsten Senden.',
    'Misión guardada en este dispositivo; sale con el próximo envío.'
  ],
  edFailed: ['Mission non enregistrée : {e}', 'Mission not saved: {e}', 'Mission nicht gespeichert: {e}', 'Misión no guardada: {e}'],
  edUnreadable: ['Fichier de mission illisible : {e}', 'Mission file unreadable: {e}', 'Missionsdatei unlesbar: {e}',
    'Archivo de misión ilegible: {e}'
  ],
  // audit 182 : un fichier que l'éditeur ne réécrirait pas sans risque est refusé à l'ouverture ; rien de changé, rien d'écrit
  edAlias: [
    'ce fichier emploie des alias YAML (« &… », « *… ») : écrivez l\'objet répété en entier à chaque endroit, ou modifiez-le dans la V2',
    'this file uses YAML aliases (« &… », « *… »): write the repeated object out in full at each place, or edit it in the V2',
    'diese Datei verwendet YAML-Aliasse („&…“, „*…“): das wiederholte Objekt an jeder Stelle ausschreiben oder in der V2 bearbeiten',
    'este archivo usa alias YAML («&…», «*…»): escriba el objeto repetido entero en cada lugar, o modifíquelo en la V2'
  ],
  edHuge: ['ce fichier est trop gros pour l\'éditeur : il se modifie dans la V2',
    'this file is too large for the editor: edit it in the V2',
    'diese Datei ist zu groß für den Editor: in der V2 bearbeiten',
    'este archivo es demasiado grande para el editor: se modifica en la V2'
  ],
  edSame: ['Rien à enregistrer : la mission n\'a pas changé.', 'Nothing to save: the mission has not changed.',
    'Nichts zu speichern: die Mission hat sich nicht geändert.', 'Nada que guardar: la misión no ha cambiado.'
  ],
  edRegLater: ['Le fichier est enregistré ; le registre n\'a pas pu être retouché ({e}) : « Mettre à jour le registre » l\'ajoutera.',
    'The file is saved; the registry could not be updated ({e}): « Update the registry » will add it.',
    'Die Datei ist gespeichert; das Register konnte nicht angepasst werden ({e}): „Register aktualisieren“ fügt sie hinzu.',
    'El archivo está guardado; el registro no pudo actualizarse ({e}): «Actualizar el registro» lo añadirá.'
  ],
  edBlock_family: ['Choisissez une famille.', 'Choose a family.', 'Wählen Sie eine Familie.', 'Elija una familia.'],
  edBlock_idForm: ['L\'identifiant a la forme « T-086 » : une lettre, un tiret, trois chiffres (une lettre d\'équipe permise).',
    'The identifier has the form « T-086 »: a letter, a hyphen, three digits (a team letter allowed).',
    'Die Kennung hat die Form „T-086“: ein Buchstabe, ein Bindestrich, drei Ziffern (ein Teambuchstabe erlaubt).',
    'El identificador tiene la forma «T-086»: una letra, un guion, tres cifras (se admite una letra de equipo).'
  ],
  edBlock_idLetter: ['L\'identifiant commence par la lettre de la famille ({l}).',
    'The identifier begins with the letter of the family ({l}).',
    'Die Kennung beginnt mit dem Buchstaben der Familie ({l}).', 'El identificador empieza por la letra de la familia ({l}).'
  ],
  edBlock_idTaken: ['Cet identifiant est déjà dans le registre.', 'This identifier is already in the registry.',
    'Diese Kennung steht schon im Register.',
    'Este identificador ya está en el registro.'
  ],
  edTeamsHint: ['Les équipages et services engagés : une ligne par équipe.', 'The crews and services engaged: one row per team.',
    'Die eingesetzten Besatzungen und Dienste: eine Zeile pro Team.', 'Las tripulaciones y servicios implicados: una fila por equipo.'
  ],
  edTeamName: ['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'],
  edTeamService: ['Service', 'Service', 'Dienst', 'Servicio'],
  edTeamType: ['Type', 'Type', 'Typ', 'Tipo'],
  edTeamRole: ['Rôle', 'Role', 'Rolle', 'Función'],
  edTeamAdd: ['+ Équipe', '+ Team', '+ Team', '+ Equipo'],
  edTeamDel: ['Retirer cette équipe', 'Remove this team', 'Dieses Team entfernen', 'Quitar este equipo'],
  edTeamNone: ['Aucune équipe : « + Équipe » en ajoute une.', 'No team: « + Team » adds one.', 'Kein Team: „+ Team“ fügt eines hinzu.',
    'Ningún equipo: «+ Equipo» añade uno.'
  ],
  edPlacesHint: ['Cible, zones, points tournants et rendez-vous. Une ligne par lieu ; « Modifier » en ouvre les champs.',
    'Target, zones, turning points and rendezvous. One row per place; « Edit » opens its fields.',
    'Ziel, Zonen, Wendepunkte und Treffpunkte. Eine Zeile pro Ort; „Bearbeiten“ öffnet seine Felder.',
    'Objetivo, zonas, puntos de giro y encuentros. Una fila por lugar; «Modificar» abre sus campos.'
  ],
  plDep: ['DÉP', 'DEP', 'ABF', 'SAL'],
  plArr: ['ARR', 'ARR', 'ANK', 'LLE'],
  plTarget: ['CIBLE', 'TARGET', 'ZIEL', 'OBJ'],
  plZone: ['ZONE', 'ZONE', 'ZONE', 'ZONA'],
  plPt: ['PT', 'PT', 'WP', 'PG'],
  plRdv: ['RDV', 'RDV', 'TP', 'ENC'],
  plAddZone: ['+ Zone', '+ Zone', '+ Zone', '+ Zona'],
  plAddPt: ['+ Point tournant', '+ Turning point', '+ Wendepunkt', '+ Punto de giro'],
  plAddRdv: ['+ Rendez-vous', '+ Rendezvous', '+ Treffpunkt', '+ Encuentro'],
  plAddTarget: ['+ Cible', '+ Target', '+ Ziel', '+ Objetivo'],
  plOnMap: ['Sur la carte', 'On the map', 'Auf der Karte', 'En el mapa'],
  plUnplaced: ['à placer', 'to place', 'zu platzieren', 'por situar'],
  plPoly: ['{n} points', '{n} points', '{n} Punkte', '{n} puntos'],
  plCircle: ['cercle {r} km', 'circle {r} km', 'Kreis {r} km', 'círculo {r} km'],
  plTot: ['{n} min sur zone', '{n} min on station', '{n} min im Gebiet', '{n} min en zona'],
  plId: ['Identifiant', 'Identifier', 'Kennung', 'Identificador'],
  plName: ['Nom', 'Name', 'Name', 'Nombre'],
  plRole: ['Rôle', 'Role', 'Rolle', 'Función'],
  plLat: ['Latitude (°, décimale)', 'Latitude (°, decimal)', 'Breite (°, dezimal)', 'Latitud (°, decimal)'],
  plLon: ['Longitude (°, décimale)', 'Longitude (°, decimal)', 'Länge (°, dezimal)', 'Longitud (°, decimal)'],
  plKind: ['Sorte', 'Kind', 'Art', 'Tipo'],
  // les sortes de zone du générateur (docs/technique/PROMPT_GENERATEUR_MISSIONS.md, modules/maps/mission.js), dites en clair
  zk_search: ['recherche', 'search', 'Suche', 'búsqueda'],
  zk_mission: ['travail', 'work', 'Einsatz', 'trabajo'],
  zk_exclusion: ['à éviter', 'to avoid', 'zu meiden', 'a evitar'],
  plRadius: ['Rayon (km)', 'Radius (km)', 'Radius (km)', 'Radio (km)'],
  plTotF: ['Temps sur zone (min)', 'Time on station (min)', 'Zeit im Gebiet (min)', 'Tiempo en zona (min)'],
  plParticipants: ['Participants (indicatifs, séparés par des virgules)', 'Participants (callsigns, comma separated)',
    'Teilnehmer (Rufzeichen, durch Kommas getrennt)', 'Participantes (indicativos, separados por comas)'
  ],
  plPolyKept: ['Le polygone garde ses {n} points (ils se déplacent dans la V2 pour l\'instant).',
    'The polygon keeps its {n} points (they are moved in the V2 for now).',
    'Das Polygon behält seine {n} Punkte (sie werden vorerst in der V2 verschoben).',
    'El polígono conserva sus {n} puntos (por ahora se mueven en la V2).'
  ],
  plDone: ['OK', 'OK', 'OK', 'OK'],
  plRemove: ['Retirer', 'Remove', 'Entfernen', 'Quitar'],
  todo_unplaced: ['lieux à placer', 'places to place', 'Orte zu platzieren', 'lugares por situar'],
  edStoryHint: [
    'Ce que lit le pilote : le résumé (la synthèse le montre entier jusqu\'à 600 signes), la description, les objectifs, la charge.',
    'What the pilot reads: the summary (the sheet shows it whole up to 600 signs), the description, the objectives, the load.',
    'Was der Pilot liest: die Kurzbeschreibung (das Blatt zeigt sie bis 600 Zeichen ganz), die Beschreibung, die Ziele, die Zuladung.',
    'Lo que lee el piloto: el resumen (la ficha lo muestra entero hasta 600 signos), la descripción, los objetivos, la carga.'
  ],
  stSummary: ['Résumé', 'Summary', 'Kurzbeschreibung', 'Resumen'],
  stCount: ['{n} / {m} signes', '{n} / {m} signs', '{n} / {m} Zeichen', '{n} / {m} signos'],
  stDescription: ['Description (un paragraphe par ligne vide)', 'Description (one paragraph per blank line)',
    'Beschreibung (ein Absatz pro Leerzeile)',
    'Descripción (un párrafo por línea en blanco)'
  ],
  stPrimary: ['Objectif principal', 'Main objective', 'Hauptziel', 'Objetivo principal'],
  stSecondary: ['Objectifs secondaires (un par ligne)', 'Secondary objectives (one per line)', 'Nebenziele (eins pro Zeile)',
    'Objetivos secundarios (uno por línea)'
  ],
  stPayload: ['Charge', 'Load', 'Zuladung', 'Carga'],
  stMass: ['Masse (kg)', 'Mass (kg)', 'Masse (kg)', 'Masa (kg)'],
  stPax: ['Passagers', 'Passengers', 'Passagiere', 'Pasajeros'],
  edRisksHint: ['Une ligne par risque : le danger, sa conséquence, la parade. La fiche en montre trois sur sa première page.',
    'One row per risk: the hazard, its consequence, the mitigation. The sheet shows three on its first page.',
    'Eine Zeile pro Risiko: die Gefahr, ihre Folge, die Gegenmaßnahme. Das Blatt zeigt drei auf seiner ersten Seite.',
    'Una fila por riesgo: el peligro, su consecuencia, la medida. La ficha muestra tres en su primera página.'
  ],
  rkHazard: ['Danger', 'Hazard', 'Gefahr', 'Peligro'],
  rkConsequence: ['Conséquence', 'Consequence', 'Folge', 'Consecuencia'],
  rkMitigation: ['Parade', 'Mitigation', 'Gegenmaßnahme', 'Medida'],
  rkAdd: ['+ Risque', '+ Risk', '+ Risiko', '+ Riesgo'],
  rkNone: ['Aucun risque : « + Risque » en ajoute un.', 'No risk: « + Risk » adds one.', 'Kein Risiko: „+ Risiko“ fügt eines hinzu.',
    'Ningún riesgo: «+ Riesgo» añade uno.'
  ],
  rkNoHazard: ['danger à dire', 'hazard to state', 'Gefahr angeben', 'peligro por indicar'],
  edTimelineHint: [
    'H = décollage prévu. Un événement par ligne : l\'heure (H+30mn, H+1h05mn), un lieu de la mission ou rien, ce qui se passe.',
    'H = planned take-off. One event per row: the time (H+30mn, H+1h05mn), a place of the mission or none, what happens.',
    'H = geplanter Start. Ein Ereignis pro Zeile: die Zeit (H+30mn, H+1h05mn), ein Ort der Mission oder keiner, was geschieht.',
    'H = despegue previsto. Un evento por fila: la hora (H+30mn, H+1h05mn), un lugar de la misión o ninguno, lo que ocurre.'
  ],
  evAt: ['Heure', 'Time', 'Zeit', 'Hora'],
  evPlace: ['Lieu', 'Place', 'Ort', 'Lugar'],
  evFree: ['(aucun lieu)', '(no place)', '(kein Ort)', '(ningún lugar)'],
  evText: ['Ce qui se passe', 'What happens', 'Was geschieht', 'Lo que ocurre'],
  evAdd: ['+ Événement', '+ Event', '+ Ereignis', '+ Evento'],
  evDel: ['Retirer cet événement', 'Remove this event', 'Dieses Ereignis entfernen', 'Quitar este evento'],
  // audit 194 : la chronologie du fichier est un texte (timeline et chronology nues) : rien n'y est écrit
  evNoHome: ['La chronologie de ce fichier est un texte : elle n’est pas modifiée ici.',
    'This file’s timeline is a text: it is not edited here.',
    'Die Chronologie dieser Datei ist ein Text: sie wird hier nicht bearbeitet.',
    'La cronología de este archivo es un texto: no se edita aquí.'
  ],
  evNone: ['Aucun événement : « + Événement » en ajoute un.', 'No event: « + Event » adds one.',
    'Kein Ereignis: „+ Ereignis“ fügt eines hinzu.',
    'Ningún evento: «+ Evento» añade uno.'
  ],
  mpTitle: ['Cartes', 'Maps', 'Karten', 'Mapas'],
  // les sortes de cartes du générateur (apps/cpco/mission_guide.js proposedMaps), dites en clair (relecture du 13 nov.)
  mt_general: ['générale', 'general', 'Übersicht', 'general'],
  mt_target: ['cible', 'target', 'Ziel', 'objetivo'],
  mt_detail: ['détail', 'detail', 'Detail', 'detalle'],
  mt_detail_rdv: ['détail du rendez-vous', 'rendezvous detail', 'Treffpunkt-Detail', 'detalle del encuentro'],
  mt_zone: ['zone', 'zone', 'Zone', 'zona'],
  mpNone: ['Aucune carte déclarée.', 'No map declared.', 'Keine Karte angegeben.', 'Ningún mapa declarado.'],
  mpPropose: ['Proposer les cartes depuis les lieux ({n})', 'Propose maps from the places ({n})',
    'Karten aus den Orten vorschlagen ({n})',
    'Proponer los mapas a partir de los lugares ({n})'
  ],
  mpUnplaced: ['centre à placer (Lieux)', 'centre to place (Places)', 'Mitte zu platzieren (Orte)', 'centro por situar (Lugares)'],
  mpStudio: ['Les images des cartes se font au studio cartographique de la V2.', 'The map images are made in the V2 map studio.',
    'Die Kartenbilder entstehen im Kartenstudio der V2.', 'Las imágenes de los mapas se hacen en el estudio cartográfico de la V2.'
  ],
  todo_mapUnplaced: ['carte centrée sur un lieu sans position', 'map centred on a place without position',
    'Karte auf einen Ort ohne Position zentriert',
    'mapa centrado en un lugar sin posición'
  ],
  edLiaisonHint: ['Une liaison : le départ, l\'arrivée, la compagnie, la charge et l\'aéronef ; le titre se propose seul.',
    'A link flight: the departure, the arrival, the airline, the load and the aircraft; the title is proposed by itself.',
    'Eine Verbindung: Abflug, Ankunft, Fluggesellschaft, Zuladung und Luftfahrzeug; der Titel wird von selbst vorgeschlagen.',
    'Un enlace: la salida, la llegada, la compañía, la carga y la aeronave; el título se propone solo.'
  ],
  edCharge: ['Charge', 'Load', 'Zuladung', 'Carga'],
  edAirline: ['Compagnie', 'Airline', 'Fluggesellschaft', 'Compañía'],
  edAircraft: ['Aéronef (type OACI)', 'Aircraft (ICAO type)', 'Luftfahrzeug (ICAO-Typ)', 'Aeronave (tipo OACI)'],
  edTitleAuto: ['proposé d\'après le départ et l\'arrivée', 'proposed from the departure and the arrival',
    'aus Abflug und Ankunft vorgeschlagen',
    'propuesto a partir de la salida y la llegada'
  ],
  todo_aircraft: ['aéronef', 'aircraft', 'Luftfahrzeug', 'aeronave'],
  todo_title: ['titre', 'title', 'Titel', 'título'],
  todo_theatre: ['théâtre', 'theatre', 'Einsatzgebiet', 'teatro'],
  todo_dep: ['départ', 'departure', 'Abflug', 'salida'],
  todo_arr: ['arrivée', 'arrival', 'Ankunft', 'llegada'],
  todo_teams: ['aucune équipe', 'no team', 'kein Team', 'ningún equipo'],
  todo_origin: ['position du départ', 'position of the departure', 'Position des Abflugs', 'posición de la salida'],
  todo_destination: ['position de l\'arrivée', 'position of the arrival', 'Position der Ankunft', 'posición de la llegada'],
  todo_summary: ['résumé', 'summary', 'Kurzbeschreibung', 'resumen'],
  todo_description: ['description', 'description', 'Beschreibung', 'descripción'],
  todo_risks: ['aucun risque', 'no risk', 'kein Risiko', 'ningún riesgo'],
  todo_timeline: ['aucun événement', 'no event', 'kein Ereignis', 'ningún evento'],
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
    })).then(r => r ? r.value ?? r.text ?? null : null).then(t => parse(t, path === REGISTRY ? MS.REGISTRY_NODES_MAX : MS.NODES_MAX), e =>
      ({
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
async function parse(text, max = MS.NODES_MAX) {
  if (text && typeof text === 'object') return {
    doc: text
  };
  if (typeof text !== 'string' || !text.trim()) return {
    why: 'missing'
  };
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    const doc = globalThis.jsyaml.load(text);
    // audit 186 : un registre ou une mission à ancres YAML (n'importe quel pilote écrit le dépôt) se dit illisible, et n'est donc jamais
    // réécrit (le registre ne se réécrit pas quand il ne se lit pas : regPut, edRegister)
    if (MS.shapeOf(doc, max)) return {
      why: 'unreadable',
      err: S?.tt(TX.why_alias) ?? 'YAML aliases'
    };
    return {
      doc
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
  s.idx = null; // l'index de la recherche se rebâtit à la prochaine frappe sur ces lignes (SOG-0288)
  if (!s.open && !s.reg) draw(s);
  await unlisted(s, got.doc);
  if (S !== s) return;
  s.flown = await flownOf(s);
  if (S === s && !s.open) results(s);
  // SOG-0114 (A) : les affectations de ce pilote, lues une fois ; le groupe posé à sa place sans redessiner la liste
  const idx = await Promise.resolve().then(() => s.ctx.data.get('missions/affectations.json')).catch(() => null);
  if (S !== s) return;
  s.assigned = AS.mine(idx, s.ctx.identity?.trigram);
  assignedPaint(s);
}
/** SOG-0114 (A) : « Mes missions affectées » en tête de la liste — dès qu'une affectation porte mon trigramme, et seulement alors
 *  (pas de drapeau d'usage) ; chaque ligne : la mission, le décollage (terrain, heure Z), l'aéronef et l'indicatif, le rendez-vous et
 *  les canaux quand l'affectation les porte, « Préparer ce vol » en un geste. Jamais le tirage au sort. */
function assignedPaint(s) {
  const box = s.el?.querySelector('[data-assigned]');
  if (!box) return;
  const list = s.assigned || [],
    z = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}Z` : '',
    meet = m => `<span class="ms-meet" data-meet="${esc(m.kind)}">${esc(m.label)}${m.url ? ` <a class="f-linkbtn" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer" data-meetopen>${esc(s.tt(TX.meetOpen))}</a>` : ''}${m.value ? ` <code>${esc(m.value)}</code> <button type="button" class="f-linkbtn" data-do="meetcopy" data-v="${esc(m.value)}">${esc(s.tt(TX.meetCopy))}</button>` : ''}</span>`,
    row = a => `<div class="f-item ms-assigned" data-assigned-id="${esc(a.mission)}"><span><b>${esc(a.mission)}</b> ${esc(a.title)}<small class="f-muted">${esc([a.ferry ? s.tt(TX.assignedFerry) : '', a.departure || a.takeoff ? s.tt(TX.assignedOff, { ad: a.departure, t: z(a.takeoff) }).replace(/\s+/g, ' ').trim() : '', [a.registration, a.type].filter(Boolean).join(' '), a.callsign].filter(Boolean).join(' · '))}</small>${a.rdv ? `<small data-rdv>${esc(s.tt(TX.assignedRdv, { t: a.rdv.startsWith('H') ? a.rdv : z(a.rdv) }))}</small>` : ''}${a.meet.length ? `<small class="ms-meets">${a.meet.map(meet).join('')}</small>` : ''}</span><a class="f-btn primary" data-do="prepare" href="#fuel?mission=${encodeURIComponent(a.mission)}">${esc(s.tt(TX.prepare))}</a></div>`;
  box.hidden = !list.length;
  box.innerHTML = list.length ? `<h2 class="ms-asshead">${esc(s.tt(TX.assignedHead))}</h2><div class="f-list">${list.map(row).join('')}</div>` : '';
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
  s.idx = null;
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
const filtered = s => s.rows.filter(r => ofAirline(s, r) && (!s.family || r.family === s.family) && (!s.subtype || r.subtype === s
  .subtype) && (!s.category || catOf(s, r)?.id === s
  .category) && (!s.q || qWhere(s, r, s.q) !== null));

/** Dessine la liste, ou la mission choisie. */
function draw(s) {
  s.ctx.helpAnchor?.(() => s.ed ? 'missions-editor' : s.open ? 'missions-open' : s.reg ? 'missions-registry' : 'missions-list');
  for (const u of s.urls || []) URL.revokeObjectURL(u);
  s.urls = [];
  s.el.innerHTML = `<style>${STYLE}</style><h1>${esc(s.tt(meta.title))}</h1>${s.ed ? edHtml(s) : s.open ? missionHtml(s) : s.add ? addHtml(s) : s.move ? moveHtml(s) : s.reg ? regHtml(s) : listHtml(s)}`;
  if (s.open?.mission && !s.open.mission.hasCoords) legacyPngs(s);
}

/** La date d'un compte rendu en « jj/mm/aaaa ». */
const day = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('/') : d;

/** La liste : « Tirer au sort », recherche, famille, puis les résultats (resultsHtml). */
function listHtml(s) {
  const w = s.regWhy;
  if (!s.rows.length) return `<div class="f-card"><div class="f-row"><button type="button" data-do="add">${esc(s.tt(TX.add))}</button><button type="button" data-do="regopen">${esc(s.tt(TX.reg))}</button></div><p class="f-muted" data-why="${esc(w?.why || 'none')}">${esc(w?.why === 'loading' ? s.tt(TX.regLoading) : w?.why === 'late' ? s.tt(TX.regLate) : w?.why === 'unreadable' ? s.tt(TX.regUnreadable, { e: w.err }) : s.tt(TX.none))}</p></div>`;
  const mine = s.rows.filter(r => ofAirline(s, r)),
    // les catégories connues de la compagnie que ses missions portent, dans l'ordre de sa liste ; sans elles, pas de filtre
    held = new Set(s.rows.filter(r => ofAirline(s, r)).map(r => catOf(s, r)?.id).filter(Boolean)),
    cats = s.cats.all.filter(c => held.has(c.id)),
    lang = s.ctx.lang?.() || 'fr';
  return `<div class="f-card" data-pane="list"><div class="f-row"><button type="button" class="primary" data-do="draw">${esc(s.tt(TX.draw))}</button><button type="button" data-do="add">${esc(s.tt(TX.add))}</button><button type="button" data-do="regopen">${esc(s.tt(TX.reg))}</button>${s.co?.filter ? `<button type="button" data-do="moveall">${esc(s.tt(TX.moveAll))}</button>` : ''}</div>
    <section class="ms-assignedbox" data-assigned hidden></section>
    ${scopeHtml(s)}
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.search))}</span><input type="search" data-k="q" value="${esc(s.q)}" placeholder="${esc(s.tt(TX.search))}" autocomplete="off"><small class="f-muted" data-searchhint>${esc(s.tt(TX.searchHint))}</small></label>
    ${famFilterHtml(s, 'family', 'subtype', mine, s.family, s.subtype)}
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
      return `<button type="button" class="f-item" data-id="${esc(r.id)}"><span><b>${esc(r.id)}</b> ${esc(r.title)}${co ? ` <span class="f-badge" data-co>${esc(co)}</span>` : ''}</span><span class="f-muted">${esc([r.originIcao && r.destinationIcao ? `${r.originIcao} → ${r.destinationIcao}` : r.originIcao, r.types[0], hmm(r.blockMin)].filter(Boolean).join(' · '))}${whereHtml(s, r, s.q)}${f !== undefined ? ` <span class="f-badge" data-kind="ok" data-flown>${esc(s.tt(TX.flown, { d: day(f) }))}</span>` : ''}</span></button>`;
    };
  let fam = '',
    body = '';
  for (const r of shown) {
    if (r.family !== fam) body += `<h3 class="f-muted" data-family="${esc(fam = r.family)}">${famHtml(s, fam)}</h3>`;
    body += row(r);
  }
  return `<p class="f-muted" data-count${s.q && s.idx?.ready ? ' data-indexed' : ''}>${esc(s.tt(one(s, hits.length) ? TX.count1 : TX.count, { n: hits.length }))}</p>${unreadHtml(s, s.q)}
    <div class="f-list" data-list>${hits.length ? body : `<p class="f-muted">${esc(s.tt(TX.noHit))}</p>`}</div>
    ${hits.length > shown.length ? `<button type="button" class="f-linkbtn" data-do="more">${esc(s.tt(TX.more, { n: hits.length - shown.length }))}</button>` : ''}`;
}

/** Le chemin du fichier d'une ligne du registre (« missions/<dossier>/<fichier> ») ; '' sans dossier ou fichier sûrs. */
const rowPath = r => r?.folder && r?.file ? `missions/${r.folder}/${r.file}` : '';
/** L'index de la recherche dans le contenu (SOG-0288), en mémoire seulement, bâti à la première frappe : les fichiers de mission DÉJÀ
 *  sur l'appareil (data.cached, sans réseau), lus sans attente ; une mission dont le fichier n'y est pas est cherchée sur sa ligne du
 *  registre et comptée « non lue ». Rien n'est écrit. Redessine la liste ou le registre quand il est prêt. */
function ensureIndex(s) {
  if (s.idx) return;
  const idx = s.idx = {
    map: new Map(),
    ready: false
  };
  (async () => {
    const have = new Set(((await Promise.resolve().then(() => s.ctx.data.cached?.('missions/')).catch(() => null)) || []).map(d => d
        .path)),
      rows = [...s.rows, ...(s.reg?.lines || []).map(e => e.row)],
      paths = [...new Set(rows.map(rowPath).filter(p => p && have.has(p)))];
    for (let i = 0; i < paths.length; i += 8)
      await Promise.all(paths.slice(i, i + 8).map(async p => {
        const v = await Promise.resolve().then(() => s.ctx.data.read(p)).catch(() => null),
          g = v ? await parse(v.value ?? v.text ?? null) : null,
          m = g?.doc ? MS.readMission(g.doc) : null;
        if (m) idx.map.set(p, SE.missionFields(m));
      }));
    idx.ready = true;
    if (S !== s || s.idx !== idx) return;
    s.qMemo = null;
    if (s.reg) {
      const box = s.el.querySelector('[data-regrows]');
      if (box && s.reg.q) box.innerHTML = regListHtml(s);
    } else if (s.q && !s.open) results(s);
  })();
}
/** Les champs où la recherche `q` se trouve pour une ligne : [] trouvée sur l'identifiant ou le titre, [clés] ailleurs, null pas trouvée ;
 *  mémorisé par recherche (la liste et le tirage au sort filtrent plusieurs fois les mêmes lignes). */
function qWhere(s, r, q) {
  const qf = SE.fold(q);
  if (!qf) return [];
  ensureIndex(s);
  if (!s.qMemo || s.qMemo.q !== qf || s.qMemo.ready !== s.idx.ready) s.qMemo = {
    q: qf,
    ready: s.idx.ready,
    m: new Map()
  };
  const key = `${r.id}\u0000${rowPath(r)}`;
  if (s.qMemo.m.has(key)) return s.qMemo.m.get(key);
  const keys = SE.where([...SE.rowFields(r), ...(s.idx.map.get(rowPath(r)) || [])], qf),
    out = !keys.length ? null : keys.includes('id') || keys.includes('title') ? [] : keys;
  s.qMemo.m.set(key, out);
  return out;
}
/** « dans : risques » quand la recherche n'est pas dans l'identifiant ni le titre (SOG-0288) ; '' sinon. */
function whereHtml(s, r, q) {
  const w = q ? qWhere(s, r, q) : null;
  if (!w?.length) return '';
  const word = k => s.tt(TX[`in${k.charAt(0).toUpperCase()}${k.slice(1)}`] || TX.inLine);
  return ` · <span class="ms-where" data-where="${esc(w.join(' '))}">${esc(s.tt(TX.foundIn, { w: w.slice(0, 3).map(word).join(', ') }))}</span>`;
}
/** « n missions non lues sur cet appareil » pendant une recherche, une fois l'index prêt (SOG-0288) ; '' sinon. */
function unreadHtml(s, q) {
  if (!q || !s.idx?.ready) return '';
  const n = new Set([...s.rows, ...(s.reg?.lines || []).map(e => e.row)].map(rowPath).filter(p => p && !s.idx.map.has(p))).size;
  return n ? `<p class="f-muted" data-unread="${n}">${esc(s.tt(TX.unreadN, { n }))}</p>` : '';
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
/** La lettre d'une famille (SOG-0292) : celle de la table des thèmes (AIRLIFT → T), sinon la plus fréquente des identifiants de ses
 *  missions (« X-001A » → X) ; '' sinon. `ids` : les identifiants des lignes de la famille. */
function famLetter(code, ids) {
  const known = familyLetters[String(code || '').toUpperCase()];
  if (known) return known;
  const n = new Map();
  for (const id of ids) {
    const m = /^([A-Z])-\d/.exec(id);
    if (m) n.set(m[1], (n.get(m[1]) || 0) + 1);
  }
  return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
}
/** Les familles d'une liste de choix (SOG-0292) : « T · AIRLIFT · Transport aérien / logistique » (la lettre, puis familyText), triées
 *  par lettre ; sans lettre, en dernier, par code. `rows` : [{ id, family }]. → [{ code, label }] */
function famChoices(rows, lang) {
  const ids = new Map();
  for (const r of rows)
    if (r.family) {
      if (!ids.has(r.family)) ids.set(r.family, []);
      ids.get(r.family).push(r.id);
    }
  return [...ids].map(([code, list]) => ({
    code,
    letter: famLetter(code, list),
    text: familyText(code, lang)
  })).sort((a, b) => (a.letter ? 0 : 1) - (b.letter ? 0 : 1) || a.letter.localeCompare(b.letter) || a.code.localeCompare(b.code)).map(f =>
    ({
      code: f.code,
      label: [f.letter, f.text].filter(Boolean).join(' · ')
    }));
}
/** Les sous-types d'une famille (SOG-0292) : ceux de ses lignes, dits par la série du thème quand elle est connue (STRATEGIC →
 *  « Transport stratégique »), sinon tels quels (bornés à l'affichage). `rows` : [{ family, subtype }]. → [{ code, label }] */
function subChoices(rows, fam, lang) {
  const series = MT.themeOf(fam)?.series || [],
    li = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(lang));
  return [...new Set(rows.filter(r => r.family === fam).map(r => String(r.subtype || '')).filter(Boolean))].sort().map(code => ({
    code,
    label: series.find(x => x.value === code)?.labels[li] || code.slice(0, 60)
  }));
}
/** Le filtre de famille et, quand une famille de deux sous-types au moins est choisie, la liste « Sous-type » à côté (SOG-0292). */
function famFilterHtml(s, kFam, kSub, rows, fam, sub) {
  const lang = s.ctx.lang?.() || 'fr',
    subs = fam ? subChoices(rows, fam, lang) : [],
    sel = (k, all, list, v) => `<label class="f-field"><span class="f-sr">${esc(s.tt(all))}</span><select data-k="${k}"><option value="">${esc(s.tt(all))}</option>${list.map(f => `<option value="${esc(f.code)}"${v === f.code ? ' selected' : ''}>${esc(f.label)}</option>`).join('')}</select></label>`;
  return `<div class="f-row ms-famrow" data-famrow>${sel(kFam, TX.allFamilies, famChoices(rows, lang), fam)}${subs.length >= 2 ? sel(kSub, TX.allSubtypes, subs, sub) : ''}</div>`;
}
/** Une famille dans notre rendu (SOG-0179) : le sigle en gras, puis son nom long ; le sigle seul pour un code inconnu. */
function famHtml(s, code) {
  const p = familyParts(code, s.ctx.lang?.() || 'fr');
  return `<b data-famshort>${esc(p.short)}</b>${p.long ? ` · <span data-famlong>${esc(p.long)}</span>` : ''}`;
}
/** Au-delà de ce nombre de signes, le résumé de la première page est coupé et « Lire la suite » ouvre le Détail, qui l'a en entier. */
const SUM_MAX = 600;
/** Le résumé coupé à SUM_MAX signes, à la fin d'un mot, suivi de « … » ; tel quel s'il tient. */
function sumCut(t) {
  if (t.length <= SUM_MAX) return t;
  const head = t.slice(0, SUM_MAX),
    sp = head.lastIndexOf(' ');
  return `${(sp > SUM_MAX * 0.8 ? head.slice(0, sp) : head).trimEnd()}…`;
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
    ${m?.summary ? `<div class="ms-summary" data-summary><h3>${esc(s.tt(TX.sumTitle))}</h3><p data-sumtext>${esc(sumCut(m.summary))}</p>${m.summary.length > SUM_MAX ? `<button type="button" class="f-linkbtn" data-do="detail" data-readmore>${esc(s.tt(TX.readMore))}</button>` : ''}</div>` : ''}
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
  // « Description » ne porte que la description détaillée (SOG-0291) ; le résumé n'a sa section ici que s'il est coupé sur la première page
  const sum = m.summary && m.summary.length > SUM_MAX ? `<p data-sumfull>${esc(m.summary)}</p>` : '',
    desc = [...m.details.map(p => `<p>${esc(p)}</p>`), m.notes?.length ? `<ul class="ms-lines">${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''].filter(Boolean),
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
    ${sec('sum', TX.sumTitle, sum, true)}${sec('desc', TX.secDesc, desc.join(''), true)}${sec('obj', TX.secObj, obj)}${sec('zones', TX.secZones, zones)}${sec('rdv', TX.secRdv, rdv)}${sec('route', TX.secRoute, route)}${sec('maps', TX.secMaps, maps)}${sec('payload', TX.secPayload, load)}`;
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
    // une mission lue à l'ouverture rejoint l'index de la recherche s'il est bâti (elle n'est plus « non lue », SOG-0288)
    if (mission && s.idx?.ready && rowPath(row)) {
      s.idx.map.set(rowPath(row), SE.missionFields(mission));
      s.qMemo = null;
    }
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
  if (s.ed) return edInput(s, e);
  if (s.reg) {
    // l'écran Registre : la recherche et le filtre de famille redessinent les lignes seules (le champ garde son curseur)
    const rk = e.target?.dataset?.k;
    if ((rk === 'rq' && e.type === 'input') || ((rk === 'rfam' || rk === 'rsub') && e
        .type === 'change'
      )) { // « change » de la recherche (à la perte du focus) ne redessine pas : il mangerait le toucher qui la provoque
      if (rk === 'rq') s.reg.q = e.target.value;
      else if (rk === 'rsub') s.reg.sub = e.target.value;
      else {
        s.reg.fam = e.target.value;
        s.reg.sub = ''; // une autre famille : son sous-type tombe, la seconde liste se redessine (SOG-0292)
        const row = s.el.querySelector('[data-famrow]');
        if (row) row.outerHTML = regFamHtml(s);
      }
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
    s.subtype = '';
    s.category = '';
    s.all = false;
    return draw(s);
  }
  if (k !== 'q' && k !== 'family' && k !== 'subtype' && k !== 'category') return;
  s[k] = e.target.value;
  s.all = false;
  if (k === 'family') { // une autre famille : son sous-type tombe, la liste « Sous-type » se redessine avec elle (SOG-0292)
    s.subtype = '';
    const row = s.el.querySelector('[data-famrow]');
    if (row) row.outerHTML = famFilterHtml(s, 'family', 'subtype', s.rows.filter(r => ofAirline(s, r)), s.family, s.subtype);
  }
  results(s);
}

/** Gestes : une ligne (Choisir), « Tirer au sort » / « Tirer encore », « N autres », « Retour ». */
function onClick(s, e) {
  const row = !s.open && e.target.closest('[data-id]');
  if (row) return openMission(s, s.rows.find(r => r.id === row.dataset.id));
  const b = e.target.closest('[data-do]');
  if (!b) return;
  if (b.dataset.do.startsWith('ed') && (s.ed || s.reg)) return edClick(s, b);
  switch (b.dataset.do) {
    case 'meetcopy': // SOG-0114 (A) : un canal à copier (serveur, fréquence, code) ; le pilote ne le tape jamais
      return copyText(String(b.dataset.v || '').slice(0, 80), {
        near: b
      }).then(how => how !== 'shown' && s.ctx.notify(s.tt(TX.meetCopied, {
        v: String(b.dataset.v || '').slice(0, 80)
      }), 'ok'));
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
        const entry = f.doc ? RG.entryOfMission(f.doc, path, undefined, RG.seriesRows(r.lines)) : null; // SOG-0036 : sa série
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
    // la recherche : la même fonction que la liste (SOG-0288) pour une ligne ; l'identifiant et le titre pour une mission hors registre
    hit = (id, title, fam, sub, row) => (!q || (row ? qWhere(s, row, r.q) !== null : SE.fold(`${id} ${title}`).includes(SE.fold(r.q)))) && (!r
      .fam ||
      fam === r.fam) && (!r.sub || String(sub || '') === r.sub),
    rows = [
      ...r.found.filter(f => hit(f.entry.id, f.entry.title, f.entry.family, f.entry.subtype)).sort((a, b) => b.entry.id.localeCompare(a
        .entry.id)).map(f =>
        ({
          kind: 'found',
          f
        })),
      ...r.lines.filter(e => hit(e.row.id, e.row.title, e.row.family, e.row.subtype, e.row)).map(e => ({
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
function regSumHtml(s, k, word, id, title, fam, series, from, to, warn, where = '') {
  const kind = warn ? 'warn' : k === 'ok' ? 'ok' : k === 'checking' || k === 'notread' ? 'info' : 'warn',
    has = v => v !== undefined && v !== null && v !== '',
    second = [
      [familyParts(fam, s.ctx.lang?.() || 'fr').short, has(series) ? cut(series, 8) : ''].filter(Boolean).join(' · '),
      from || to ? `${from || '?'} → ${to || '?'}` : ''
    ].filter(Boolean).join(' · ');
  // l'identifiant raccourci à l'AFFICHAGE seul (12 signes, entier en infobulle) : l'identité garde ses 40 signes (audit 176)
  const shown = id.length > 12 ? `${id.slice(0, 11)}…` : id;
  return `<summary><span><span class="ms-rsign" data-kind="${kind}" data-rstate="${k}" title="${esc(word)}" aria-label="${esc(word)}">${SIGN[k] && !warn ? SIGN[k] : '!'}</span><b title="${esc(id)}">${esc(shown)}</b> ${esc(title)}</span><span class="f-muted">${esc(second)}${where}</span></summary>`;
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
  return `<details class="ms-rrow" data-rid="${e.idx}" data-rowid="${esc(row.id)}"${r.edit === e.idx ? ' open' : ''}>${regSumHtml(s, k, word, row.id, row.title, row.family, e.raw.series, row.originIcao || cut(row.origin, 12), row.destinationIcao || cut(row.destination, 12), dup || former, whereHtml(s, row, r.q))}
    <div class="ms-rbody"><span>${badges}</span><span class="f-muted">${esc(detail)}</span>${path ? `<span class="f-muted" data-rpath>${esc(path)}</span>` : ''}${r.edit === e.idx ? regEditHtml(s, e) : `<span class="f-row"><button type="button" data-do="edmodify" data-rid="${e.idx}">${esc(s.tt(TX.edModify))}</button><button type="button" data-do="eddup" data-rid="${e.idx}">${esc(s.tt(TX.edDup))}</button><button type="button" data-do="regedit" data-rid="${e.idx}">${esc(s.tt(TX.regEdit))}</button><button type="button" data-do="regremove" data-rid="${e.idx}">${esc(s.tt(TX.regRemove))}</button></span>`}</div></details>`;
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
  return `${unreadHtml(s, r.q)}<div class="f-list" data-reglist>${rows.length ? shown.map(item).join('') : `<p class="f-muted">${esc(s.tt(TX.regNone))}</p>`}</div>
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

/** Le filtre de famille du Registre et sa liste « Sous-type » (SOG-0292) : les lignes et les missions hors registre. */
const regFamHtml = s => famFilterHtml(s, 'rfam', 'rsub', [...s.reg.lines.map(e => e.row), ...s.reg.found.map(f => ({
  id: f.entry.id,
  family: f.entry.family,
  subtype: f.entry.subtype
}))], s.reg.fam, s.reg.sub || '');
/** L'écran « Registre des missions ». */
function regHtml(s) {
  const r = s.reg,
    n = r.lines.length,
    // les familles des lignes et des missions hors registre : le filtre en tête, comme le « Type » de la V2 (SOG-0286) ; regFamHtml
    broken = r.why === 'unreadable',
    // l'en-tête tient en deux lignes (SOG-0286 : vingt missions vues sans défiler à 1 280) : le titre (l'explication en infobulle et
    // dans l'aide), puis « Mettre à jour le registre », « Retour » et le compte sur la même ligne
    count = r.why === 'loading' || broken ? '' : `<span class="f-muted" data-regcount>${esc(s.tt(TX.regCount, { n }))}${r.found.length ? ` · ${esc(s.tt(TX.regUnlisted, { n: r.found.length }))}` : ''}${r.checking ? ` · ${esc(s.tt(TX.regChecking))}` : ''}${r.readOf ? ` · <span data-regreadof>${esc(s.tt(TX.regReadOf, r.readOf))}</span>` : ''}</span>`,
    head = `<div class="f-card" data-pane="registry"><h2 title="${esc(s.tt(TX.regHint))}">${esc(s.tt(TX.regTitle))}</h2>
    <div class="f-row ms-regbar"><button type="button" class="primary" data-do="regplan"${r.checking || broken ? ' disabled' : ''}>${esc(s.tt(TX.regUpdate))}</button><button type="button" data-do="edcreate">${esc(s.tt(TX.edCreate))}</button><button type="button" data-do="regback">${esc(s.tt(TX.back))}</button>${count}</div>`;
  if (r.why === 'loading') return `${head}<p class="f-muted" data-why="loading">${esc(s.tt(TX.regLoading))}</p></div>`;
  if (broken) return `${head}<p class="f-warn" data-why="unreadable">${esc(s.tt(TX.regUnreadable, { e: r.err }))}</p></div>`;
  return `${head}${r.why === 'missing' ? `<p class="f-muted" data-why="missing">${esc(s.tt(TX.none))}</p>` : ''}
    ${r.plan ? regPlanHtml(s) : ''}
    <div class="ms-reghead">${regFamHtml(s)}
    <label class="f-field"><span class="f-sr">${esc(s.tt(TX.regSearch))}</span><input type="search" data-k="rq" value="${esc(r.q)}" placeholder="${esc(s.tt(TX.regSearch))}" autocomplete="off"></label></div>
    <div data-regrows>${regListHtml(s)}</div></div>`;
}

// ---------------------------------------------------------------- l'éditeur de missions (SOG-0287)
/** Les lignes connues (liste et registre) : la numérotation, les familles et l'unicité de l'identifiant les lisent. */
const allRows = s => [...s.rows, ...(s.reg?.lines || []).map(e => ({
  ...e.row,
  series: e.raw?.series
}))];
/** La lettre d'une famille pour l'éditeur (famLetter, les identifiants des lignes de la famille). */
const edLetter = (s, fam) => famLetter(fam, allRows(s).filter(r => r.family === fam).map(r => r.id));
/** Les familles de l'éditeur : celles des thèmes et celles des lignes, « T · AIRLIFT · … » (SOG-0292). La famille commerciale attend la
 *  décision de l'ergonome sur son Cadre réduit (SOG-0287, ajout du 13 nov.). */
const edFamilies = (s, lang) => famChoices([...MT.THEMES.map(t => ({
  id: '',
  family: t.id
})), ...allRows(s)], lang);
/** Les sous-types de l'éditeur : la liste de la famille (les séries du thème, comme la V2), puis ceux des lignes. */
function edSubtypes(s, fam, lang) {
  const li = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(lang)),
    theme = (MT.themeOf(fam)?.series || []).map(x => ({
      code: x.value,
      label: x.labels[li] || x.value
    }));
  const all = [...theme, ...subChoices(allRows(s), fam, lang).filter(x => !theme.some(t => t.code === x.code))],
    cur = s.ed?.cadre.subtype;
  // le sous-type du fichier, même hors de la liste de la famille, reste montré et choisi (jamais effacé en silence)
  return cur && !all.some(x => x.code === cur) ? [...all, {
    code: cur,
    label: cur.slice(0, 60)
  }] : all;
}

/** Lit le fichier d'une mission pour l'éditeur : le texte en schéma CORE (les dates restent des textes) ; { doc, pending } ou { err }. */
async function edRead(s, path) {
  if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
  const r = await Promise.resolve().then(() => s.ctx.data.read(path, {
      wait: true
    })).catch(e => ({
      err: e
    })),
    v = r?.value ?? r?.text ?? null;
  if (r?.err || v === null) return {
    err: String(r?.err?.message || r?.err || s.tt(TX.regUnread)).slice(0, 120)
  };
  if (typeof v === 'string' && v.length > ADD.LIMITS.bytes) return {
    err: 'size'
  };
  try {
    const doc = typeof v === 'string' ? globalThis.jsyaml.load(v, {
      schema: globalThis.jsyaml.CORE_SCHEMA
    }) : structuredClone(v);
    const shape = doc && typeof doc === 'object' ? ED.shapeOf(doc) : '';
    if (shape) return {
      err: s.tt(shape === 'alias' ? TX.edAlias : TX.edHuge)
    };
    return doc && typeof doc === 'object' && !Array.isArray(doc) ? {
      doc,
      pending: !!r.pending
    } : {
      err: s.tt(TX.regUnread)
    };
  } catch (e) {
    return {
      err: String(e?.message || e).split('\n')[0].slice(0, 120)
    };
  }
}

/** Ouvre l'éditeur : « new » (Créer), « edit » (Modifier) ou « dup » (Dupliquer) une ligne du registre. */
async function edOpen(s, mode, line = null) {
  if (mode === 'new') {
    s.ed = {
      mode,
      step: 'cadre',
      base: ED.blank(),
      cadre: ED.cadreOf(ED.blank()),
      path: '',
      regIdx: -1,
      regId: '',
      origId: '',
      pending: false
    };
    return draw(s);
  }
  const path = RG.pathOf(line?.row);
  if (!path) return s.ctx.notify(s.tt(TX.edUnreadable, {
    e: s.tt(TX.regRefused)
  }), 'warn');
  const got = await edRead(s, path);
  if (S !== s) return;
  if (got.err) return s.ctx.notify(s.tt(TX.edUnreadable, {
    e: got.err
  }), 'warn');
  const base = mode === 'dup' ? ED.duplicate(got.doc) : got.doc,
    cadre = ED.cadreOf(base);
  // audit 182 : rien n'est prérempli d'ailleurs que du fichier (sinon « Enregistrer » sans rien toucher l'écrirait) ; la série du
  // registre, quand le fichier n'en porte pas, n'est montrée qu'en indication dans le champ ; la famille de la ligne sert à la copie seule
  const regSeries = /^\d{1,5}$/.test(String(line.raw?.series ?? '')) ? String(line.raw.series) : '';
  if (mode === 'dup' && !cadre.family) cadre.family = line.row.family;
  if (mode === 'dup') cadre.id = ED.numbering(allRows(s), cadre.family, edLetter(s, cadre.family)).id;
  s.ed = {
    mode,
    step: 'cadre',
    base,
    cadre,
    path: mode === 'edit' ? path : '',
    regIdx: mode === 'edit' ? line.idx : -1,
    regId: mode === 'edit' ? cut(line.raw?.id, 40) : '',
    origId: mode === 'edit' ? line.row.id : '',
    pending: mode === 'edit' && got.pending,
    regSeries
  };
  draw(s);
}

/** Les pastilles des six étapes : l'état de chacune (✓ ou !), seule l'étape Cadre s'ouvre dans ce lot. */
function edStepsHtml(s, doc) {
  const names = {
      cadre: TX.stepCadre,
      teams: TX.stepTeams,
      places: TX.stepPlaces,
      story: TX.stepStory,
      risks: TX.stepRisks,
      timeline: TX.stepTimeline
    },
    open = ED.OPEN;
  return `<nav class="ms-steps" data-steps>${ED.STEPS.map((k, i) => {
    const ok = ED.stepState(doc, k) === 'ok';
    return `<button type="button" data-do="edstep" data-step="${k}"${s.ed.step === k ? ' aria-current="step"' : ''}${open.includes(k) ? '' : ` disabled title="${esc(s.tt(TX.edLater))}"`}><span class="ms-stepmark" data-kind="${ok ? 'ok' : 'warn'}" aria-hidden="true">${ok ? '✓' : '!'}</span> ${i + 1}. ${esc(s.tt(names[k]))}</button>`;
  }).join('')}</nav>`;
}

/** L'étape Cadre (sept éléments au plus : famille et sous-type, série et identifiant, titre, théâtre, départ et arrivée). */
function edCadreHtml(s) {
  const e = s.ed,
    c = e.cadre,
    lang = s.ctx.lang?.() || 'fr',
    letter = edLetter(s, c.family),
    num = ED.numbering(allRows(s), c.family, letter),
    subs = c.family ? edSubtypes(s, c.family, lang) : [],
    theatres = [...new Set([...ED.THEATRES, c.theatre].filter(Boolean))],
    field = (k, label, input, hint = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span>${input}${hint ? `<small class="f-muted" data-hint="${k}">${esc(hint)}</small>` : ''}</label>`,
    text = (k, v, extra = '') => `<input data-k="${k}" value="${esc(v)}" autocomplete="off"${extra}>`,
    sel = (k, list, v, empty = true) => `<select data-k="${k}">${empty ? '<option value=""></option>' : ''}${list.map(x => `<option value="${esc(x.code)}"${x.code === v ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`,
    idHint = e.mode === 'edit' ? c.id.toUpperCase() !== e.origId ? s.tt(TX.edIdKept) : '' : c.id === num.id ? s.tt(TX.edIdNext) : '';
  if (ED.liaison(c.family)) // une liaison (famille commerciale) : le Cadre réduit (décision du 13 nov.), six éléments
    return `<h3>1. ${esc(s.tt(TX.stepCadre))}</h3><p class="f-muted" data-liaison>${esc(s.tt(TX.edLiaisonHint))}</p>
    <div class="f-row">${field('edfam', TX.edFamily, sel('edfam', edFamilies(s, lang), c.family))}${subs.length ? field('edsub', TX.edCharge, sel('edsub', subs, c.subtype)) : ''}</div>
    <div class="f-row">${field('eddep', TX.edDep, text('eddep', c.dep, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}${field('edarr', TX.edArr, text('edarr', c.arr, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}</div>
    <div class="f-row">${field('edco', TX.edAirline, coSelect(s, 'edco', c.airline || MS.PERSONAL))}${field('edac', TX.edAircraft, text('edac', c.aircraft, ' maxlength="12" autocapitalize="characters" placeholder="A320"'))}</div>
    ${field('edtitle', TX.edTitle, text('edtitle', c.title, ' maxlength="200"'), c.title && c.title === ED.liaisonTitle(c.dep, c.arr) ? s.tt(TX.edTitleAuto) : '')}
    <div class="f-row">${field('edid', TX.edId, text('edid', c.id, ' maxlength="5" autocapitalize="characters"'), idHint)}${field('edser', TX.edSeries, text('edser', c.series, ` inputmode="numeric" maxlength="5"${e.regSeries ? ` placeholder="${esc(e.regSeries)}"` : ''}`), s.tt(TX.edNextSeries, { n: num.nextSeries }))}</div>`;
  return `<h3>1. ${esc(s.tt(TX.stepCadre))}</h3><p class="f-muted">${esc(s.tt(TX.edCadreHint))}</p>
    <div class="f-row">${field('edfam', TX.edFamily, sel('edfam', edFamilies(s, lang), c.family))}${subs.length ? field('edsub', TX.edSubtype, sel('edsub', subs, c.subtype)) : ''}</div>
    <div class="f-row">${field('edser', TX.edSeries, text('edser', c.series, ` inputmode="numeric" maxlength="5"${e.regSeries ? ` placeholder="${esc(e.regSeries)}"` : ''}`), s.tt(TX.edNextSeries, { n: num.nextSeries }))}${field('edid', TX.edId, text('edid', c.id, ' maxlength="5" autocapitalize="characters"'), idHint)}</div>
    ${field('edtitle', TX.edTitle, text('edtitle', c.title, ' maxlength="200"'))}
    ${field('edth', TX.edTheatre, sel('edth', theatres.map(t => ({ code: t, label: t })), c.theatre))}
    <div class="f-row">${field('eddep', TX.edDep, text('eddep', c.dep, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}${field('edarr', TX.edArr, text('edarr', c.arr, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}</div>`;
}

/** La colonne de droite : l'aperçu de la fiche (titre, famille · série, résumé, trois risques) et « À compléter ». */
function edAsideHtml(s, doc) {
  const m = MS.readMission(doc),
    c = s.ed.cadre,
    names = {
      cadre: TX.stepCadre,
      teams: TX.stepTeams,
      places: TX.stepPlaces,
      story: TX.stepStory,
      risks: TX.stepRisks,
      timeline: TX.stepTimeline
    },
    todo = ED.todo(doc),
    sum = m?.summary || '';
  return `<div class="f-card" data-edpreview><p class="f-muted">${esc(s.tt(TX.edPreview))}</p><h3>${esc(c.title || s.tt(TX.edNewTitle))}</h3>
      <p class="f-muted">${c.family ? famHtml(s, c.family) : ''}${c.series !== '' ? ` · ${esc(s.tt(TX.edSeriesN, { n: c.series }))}` : ''}</p>
      ${sum ? `<p>${esc(sum.length > 160 ? `${sum.slice(0, 159)}…` : sum)}</p>` : ''}
      ${m?.risks.length ? `<ul class="ms-lines">${m.risks.slice(0, 3).map(x => `<li>${esc(x.hazard)}${x.mitigation ? ` → ${esc(x.mitigation)}` : ''}</li>`).join('')}</ul>` : ''}</div>
    <div class="f-card" data-edtodo><p class="f-muted">${esc(s.tt(TX.edTodo))}</p>${todo.length ? `<ul class="ms-lines">${todo.slice(0, 7).map(t => `<li data-todo="${t.key}">${esc(s.tt(names[t.step]))} : ${esc(s.tt(TX[`todo_${t.key}`]))}</li>`).join('')}</ul>${todo.length > 7 ? `<p class="f-muted">${esc(s.tt(TX.more, { n: todo.length - 7 }))}</p>` : ''}` : `<p>${esc(s.tt(TX.edNothing))}</p>`}</div>`;
}

/** Le document en cours d'édition : le fichier lu, puis le cadre, les équipes et les lieux retouchés (une étape jamais ouverte ne
 *  retouche rien ; les lieux après le cadre : le nom du départ vient du Cadre, sa position des Lieux). */
function edDoc(e, cadre = e.cadre) {
  let d = ED.withCadre(e.base, cadre);
  if (e.teams) d = ED.withTeams(d, e.teams);
  if (e.places) d = ED.withPlaces(d, e.places);
  if (e.story) d = ED.withStory(d, e.story);
  if (e.risks) d = ED.withRisks(d, e.risks);
  if (e.events) d = ED.withEvents(d, e.events);
  if (e.mapsAdd?.length) d = ED.withMaps(d, e.mapsAdd);
  return d;
}

/** L'étape Équipes : une ligne par équipe (indicatif, service, type OACI, rôle), « Retirer » ; « + Équipe » ajoute une ligne. */
function edTeamsHtml(s) {
  const rows = s.ed.teams || [],
    inp = (i, f, v, label, extra = '') => `<label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(label))}</span><input data-k="edteam" data-i="${i}" data-f="${f}" value="${esc(v)}" placeholder="${esc(s.tt(label))}" autocomplete="off"${extra}></label>`;
  return `<h3>2. ${esc(s.tt(TX.stepTeams))}</h3><p class="f-muted">${esc(s.tt(TX.edTeamsHint))}</p>
    <div class="f-list" data-edteams>${rows.length ? `<div class="ms-edteam ms-edthead f-muted" aria-hidden="true">${[TX.edTeamName, TX.edTeamType, TX.edTeamService, TX.edTeamRole].map(l => `<span>${esc(s.tt(l))}</span>`).join('')}<span></span></div>` : ''}${rows.length ? rows.map((r, i) => `<div class="ms-edteam" data-team="${i}">${inp(i, 'name', r.name, TX.edTeamName, ' maxlength="80"')}${inp(i, 'type', r.type, TX.edTeamType, ' maxlength="60" autocapitalize="characters"')}${inp(i, 'service', r.service, TX.edTeamService, ' maxlength="120"')}${inp(i, 'role', r.role, TX.edTeamRole, ' maxlength="200"')}<button type="button" class="ms-edtdel" data-do="edteamdel" data-i="${i}" title="${esc(s.tt(TX.edTeamDel))}" aria-label="${esc(s.tt(TX.edTeamDel))}">✕</button></div>`).join('') : `<p class="f-muted" data-noteam>${esc(s.tt(TX.edTeamNone))}</p>`}</div>
    ${rows.length < ED.TEAMS_MAX ? `<button type="button" data-do="edteamadd">${esc(s.tt(TX.edTeamAdd))}</button>` : ''}`;
}

/** Une coordonnée en degrés et minutes : « 44°36′N 1°24′E » ; « à placer » sans position. */
function dms(s, lat, lon) {
  // la saisie telle quelle (« 44,9 » : la virgule décimale), hors bornes ou illisible : « à placer », comme à l'écriture (withPlaces)
  const num = (v, max) => {
      const n = Number(String(v ?? '').trim().replace(',', '.'));
      return String(v ?? '').trim() !== '' && Number.isFinite(n) && Math.abs(n) <= max ? n : null;
    },
    la = num(lat, 90),
    lo = num(lon, 180);
  if (la === null || lo === null) return s.tt(TX.plUnplaced);
  lat = la;
  lon = lo;
  const f = (v, p, n) => {
    const a = Math.abs(+v),
      d = Math.floor(a),
      m = Math.round((a - d) * 60);
    return `${m === 60 ? d + 1 : d}°${String(m === 60 ? 0 : m).padStart(2, '0')}′${+v < 0 ? n : p}`;
  };
  return `${f(lat, 'N', 'S')} ${f(lon, 'E', 'W')}`;
}

/** L'étape Lieux (la maquette editeur_lieux_*.png) : une ligne par lieu, « Modifier » en ouvre les champs sur place ; « + Zone »,
 *  « + Point tournant », « + Rendez-vous » (et « + Cible » sans cible) ; « Sur la carte » montre la mission dans la Carte. */
function edPlacesHtml(s) {
  const e = s.ed,
    rows = e.places || [],
    badge = {
      dep: TX.plDep,
      arr: TX.plArr,
      target: TX.plTarget,
      zone: TX.plZone,
      pt: TX.plPt,
      rdv: TX.plRdv
    },
    zk = v => TX[`zk_${v}`] ? s.tt(TX[`zk_${v}`]) : v,
    detail = r => [r.kind === 'zone' ? zk(r.zkind) : '', r.role, r.kind === 'zone' && r.poly ? s.tt(TX.plPoly, {
      n: r.poly
    }) : r.kind === 'zone' && r.radius ? s.tt(TX.plCircle, {
      r: r.radius
    }) : '', r.kind === 'zone' && r.tot ? s.tt(TX.plTot, {
      n: r.tot
    }) : '', r.kind === 'rdv' ? r.participants : '', r.kind === 'zone' && r.poly ? '' : dms(s, r.lat, r.lon)].filter(Boolean).join(' · '),
    field = (i, f, label, v, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="edplace" data-i="${i}" data-f="${f}" value="${esc(v ?? '')}" autocomplete="off"${extra}></label>`,
    form = (r, i) => {
      const fixed = r.kind === 'dep' || r.kind === 'arr',
        num = ' inputmode="decimal" maxlength="12"';
      return `<div class="ms-plform" data-plform="${i}">${fixed ? '' : `<div class="f-row">${field(i, 'id', TX.plId, r.id, ' maxlength="40"')}${field(i, 'name', TX.plName, r.name, ' maxlength="120"')}</div>`}
        ${r.kind === 'zone' ? `<div class="f-row"><label class="f-field"><span>${esc(s.tt(TX.plKind))}</span><select data-k="edplace" data-i="${i}" data-f="zkind"><option value=""></option>${[...new Set(['search', 'mission', 'exclusion', r.zkind].filter(Boolean))].map(v => `<option value="${esc(v)}"${v === r.zkind ? ' selected' : ''}>${esc(zk(v))}</option>`).join('')}</select></label>${field(i, 'role', TX.plRole, r.role, ' maxlength="200"')}</div>` : fixed ? '' : field(i, 'role', TX.plRole, r.role, ' maxlength="200"')}
        ${r.kind === 'zone' && r.poly ? `<p class="f-muted">${esc(s.tt(TX.plPolyKept, { n: r.poly }))}</p>` : `<div class="f-row">${field(i, 'lat', TX.plLat, r.lat, num)}${field(i, 'lon', TX.plLon, r.lon, num)}</div>`}
        ${r.kind === 'zone' ? `<div class="f-row">${r.poly ? '' : field(i, 'radius', TX.plRadius, r.radius, num)}${field(i, 'tot', TX.plTotF, r.tot, ' inputmode="numeric" maxlength="5"')}</div>` : ''}
        ${r.kind === 'rdv' ? field(i, 'participants', TX.plParticipants, r.participants, ' maxlength="400"') : ''}
        <div class="f-row"><button type="button" data-do="edplaceok">${esc(s.tt(TX.plDone))}</button>${fixed ? '' : `<button type="button" data-do="edplacedel" data-i="${i}">${esc(s.tt(TX.plRemove))}</button>`}</div></div>`;
    },
    id = e.cadre.id.trim().toUpperCase();
  return `<h3>3. ${esc(s.tt(TX.stepPlaces))}</h3><p class="f-muted">${esc(s.tt(TX.edPlacesHint))}</p>
    <div class="f-list" data-edplaces>${rows.map((r, i) => `<div class="ms-plrow" data-place="${i}" data-kind="${r.kind}"><span class="ms-plbadge">${esc(s.tt(badge[r.kind]))}</span><span class="ms-plbody"><b>${esc([r.id, r.name].filter(Boolean).join(' · ') || s.tt(TX.plUnplaced))}</b><span class="f-muted">${esc(detail(r))}</span></span><button type="button" class="f-linkbtn" data-do="edplace" data-i="${i}">${esc(s.tt(TX.edModify))}</button>${e.placeEdit === i ? form(r, i) : ''}</div>`).join('')}</div>
    <div class="f-row ms-pladd">${rows.some(r => r.kind === 'target') ? '' : `<button type="button" data-do="edplaceadd" data-kind="target">${esc(s.tt(TX.plAddTarget))}</button>`}<button type="button" data-do="edplaceadd" data-kind="zone">${esc(s.tt(TX.plAddZone))}</button><button type="button" data-do="edplaceadd" data-kind="pt">${esc(s.tt(TX.plAddPt))}</button><button type="button" data-do="edplaceadd" data-kind="rdv">${esc(s.tt(TX.plAddRdv))}</button>${e.mode === 'edit' && id ? `<a class="f-linkbtn" data-plmap href="${esc(mapHref({ id }, {}))}">${esc(s.tt(TX.plOnMap))}</a>` : ''}</div>`;
}

/** L'étape Récit (cinq éléments : résumé, description, objectif principal, objectifs secondaires, charge). */
function edStoryHtml(s) {
  const t = s.ed.story || {},
    area = (f, label, v, rows, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><textarea data-k="edstory" data-f="${f}" rows="${rows}"${extra}>${esc(v)}</textarea>${f === 'summary' ? `<small class="f-muted" data-stcount>${esc(s.tt(TX.stCount, { n: String(v).length, m: ED.SUMMARY_MAX }))}</small>` : ''}</label>`,
    inp = (f, label, v, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="edstory" data-f="${f}" value="${esc(v)}" autocomplete="off"${extra}></label>`;
  return `<h3>4. ${esc(s.tt(TX.stepStory))}</h3><p class="f-muted">${esc(s.tt(TX.edStoryHint))}</p>
    ${area('summary', TX.stSummary, t.summary, 4)}
    ${area('description', TX.stDescription, t.description, 8, ` maxlength="${ED.TEXT_MAX}"`)}
    ${area('primary', TX.stPrimary, t.primary, 2, ' maxlength="2000"')}
    ${area('secondary', TX.stSecondary, t.secondary, 3)}
    <div class="f-row ms-stload">${inp('payload', TX.stPayload, t.payload, ' maxlength="2000"')}${inp('mass', TX.stMass, t.mass, ' inputmode="decimal" maxlength="7"')}${inp('pax', TX.stPax, t.pax, ' inputmode="numeric" maxlength="4"')}</div>`;
}

/** L'étape Risques : une ligne « danger → parade » par risque, « Modifier » en ouvre les champs sur place ; « + Risque ». */
function edRisksHtml(s) {
  const e = s.ed,
    rows = e.risks || [],
    field = (i, f, label, v) => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="edrisk" data-i="${i}" data-f="${f}" value="${esc(v ?? '')}" maxlength="300" autocomplete="off"></label>`;
  return `<h3>5. ${esc(s.tt(TX.stepRisks))}</h3><p class="f-muted">${esc(s.tt(TX.edRisksHint))}</p>
    <div class="f-list" data-edrisks>${rows.length ? rows.map((r, i) => `<div class="ms-plrow ms-rkrow" data-risk="${i}"><span class="ms-plbody"><b>${esc(r.hazard || s.tt(TX.rkNoHazard))}${r.mitigation ? ` → ${esc(r.mitigation)}` : ''}</b>${r.consequence ? `<span class="f-muted">${esc(r.consequence)}</span>` : ''}</span><button type="button" class="f-linkbtn" data-do="edrisk" data-i="${i}">${esc(s.tt(TX.edModify))}</button>${e.riskEdit === i ? `<div class="ms-plform" data-rkform="${i}">${field(i, 'hazard', TX.rkHazard, r.hazard)}${field(i, 'consequence', TX.rkConsequence, r.consequence)}${field(i, 'mitigation', TX.rkMitigation, r.mitigation)}<div class="f-row"><button type="button" data-do="edriskok">${esc(s.tt(TX.plDone))}</button><button type="button" data-do="edriskdel" data-i="${i}">${esc(s.tt(TX.plRemove))}</button></div></div>` : ''}</div>`).join('') : `<p class="f-muted" data-norisk>${esc(s.tt(TX.rkNone))}</p>`}</div>
    ${rows.length < ED.RISKS_MAX ? `<div class="f-row ms-pladd"><button type="button" data-do="edriskadd">${esc(s.tt(TX.rkAdd))}</button></div>` : ''}`;
}

/** L'étape Chronologie et cartes : une ligne par événement (heure, lieu, ce qui se passe), « + Événement » ; puis les cartes déclarées
 *  et « Proposer les cartes depuis les lieux » (des entrées : les images se font au studio de la V2). */
function edTimelineHtml(s) {
  const e = s.ed,
    rows = e.events || [],
    doc = edDoc(e),
    places = ED.placesOf(doc).filter(p => p.id && !['dep', 'arr'].includes(p.kind)),
    maps = ED.mapsOf(doc),
    missing = ED.proposedMaps(doc),
    opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`,
    row = (r, i) => `<div class="ms-edteam ms-evrow" data-event="${i}"><label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evAt))}</span><input data-k="edevent" data-i="${i}" data-f="at" value="${esc(r.at)}" placeholder="H+30mn" maxlength="20" autocomplete="off"></label><label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evPlace))}</span><select data-k="edevent" data-i="${i}" data-f="place">${opt('', s.tt(TX.evFree), r.place)}${[...places.map(p => [p.id.toUpperCase(), `${p.id}${p.name ? ` — ${p.name}` : ''}`]), ...(r.place && !places.some(p => p.id.toUpperCase() === r.place) ? [[r.place, r.place]] : [])].map(([v, l]) => opt(v, l, r.place)).join('')}</select></label><label class="f-field ms-evtext"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evText))}</span><input data-k="edevent" data-i="${i}" data-f="text" value="${esc(r.text)}" maxlength="500" autocomplete="off"></label><button type="button" class="ms-edtdel" data-do="edeventdel" data-i="${i}" title="${esc(s.tt(TX.evDel))}" aria-label="${esc(s.tt(TX.evDel))}">✕</button></div>`;
  return `<h3>6. ${esc(s.tt(TX.stepTimeline))}</h3><p class="f-muted">${esc(s.tt(TX.edTimelineHint))}</p>
    <div class="f-list" data-edevents>${rows.length ? `<div class="ms-edteam ms-evrow ms-edthead f-muted" aria-hidden="true">${[TX.evAt, TX.evPlace, TX.evText].map(l => `<span>${esc(s.tt(l))}</span>`).join('')}<span></span></div>${rows.map(row).join('')}` : `<p class="f-muted" data-noevent>${esc(s.tt(TX.evNone))}</p>`}</div>
    ${!ED.eventsStorable(doc) ? `<p class="f-muted" data-evnohome>${esc(s.tt(TX.evNoHome))}</p>` : rows.length < ED.EVENTS_MAX ? `<div class="f-row ms-pladd"><button type="button" data-do="edeventadd">${esc(s.tt(TX.evAdd))}</button></div>` : ''}
    <h4>${esc(s.tt(TX.mpTitle))}</h4>
    <div class="f-list" data-edmaps>${maps.length ? maps.map(m => `<div class="ms-plrow ms-rkrow" data-map="${esc(m.id)}"><span class="ms-plbody"><b>${esc(TX[`mt_${m.type}`] ? s.tt(TX[`mt_${m.type}`]) : m.type || m.id)}</b><span class="f-muted">${esc([m.description || m.id, m.unplaced ? s.tt(TX.mpUnplaced) : ''].filter(Boolean).join(' · '))}</span></span></div>`).join('') : `<p class="f-muted" data-nomap>${esc(s.tt(TX.mpNone))}</p>`}</div>
    <div class="f-row ms-pladd">${missing.length ? `<button type="button" data-do="edmapspropose">${esc(s.tt(TX.mpPropose, { n: missing.length }))}</button>` : ''}<span class="f-muted">${esc(s.tt(TX.mpStudio))}</span></div>`;
}

/** L'écran de l'éditeur (la maquette : modules/missions/maquette/editeur_cadre_*.png). */
function edHtml(s) {
  const e = s.ed,
    doc = edDoc(e),
    nextStep = ED.OPEN[ED.OPEN.indexOf(e.step) + 1] || '',
    crumb = e.mode === 'new' ? TX.edCrumbNew : e.mode === 'dup' ? TX.edCrumbDup : TX.edCrumbEdit;
  return `<div class="ms-ed" data-pane="editor" data-mode="${e.mode}" data-step="${e.step}"><p class="f-muted ms-crumb">${esc(s.tt(crumb))}</p>
    <h2 data-edhead>${esc([e.cadre.id || s.tt(TX.edNewTitle), e.cadre.title].filter(Boolean).join(' · '))}</h2>
    ${e.pending ? `<span class="f-badge ms-edpend" data-kind="warn" data-edpending>${esc(s.tt(TX.edPending))}</span>` : ''}
    <div class="ms-edgrid">${edStepsHtml(s, doc)}<section class="f-card ms-edform" data-edform>${e.step === 'teams' ? edTeamsHtml(s) : e.step === 'places' ? edPlacesHtml(s) : e.step === 'story' ? edStoryHtml(s) : e.step === 'risks' ? edRisksHtml(s) : e.step === 'timeline' ? edTimelineHtml(s) : edCadreHtml(s)}</section><aside class="ms-edaside" data-edaside>${edAsideHtml(s, doc)}</aside></div>
    <div class="ms-edbar"><button type="button" class="primary" data-do="edsave"${e.busy ? ' disabled' : ''}>${esc(s.tt(TX.edSave))}</button><button type="button" data-do="ednext"${nextStep ? ` data-step="${nextStep}"` : ` disabled title="${esc(s.tt(TX.edLater))}"`}>${esc(s.tt(TX.edNext))}</button><button type="button" class="f-linkbtn ms-edcancel" data-do="edcancel">${esc(s.tt(TX.cancel))}</button></div></div>`;
}

/** Une saisie de l'éditeur : un texte met à jour l'aperçu, les pastilles et l'en-tête seuls (le champ garde son curseur) ; une liste
 *  redessine l'écran (la famille propose son identifiant suivant et sa série à une mission neuve ou dupliquée). */
function edInput(s, ev) {
  const e = s.ed,
    k = ev.target?.dataset?.k;
  if (k === 'edevent') { // un événement : le champ retouché en place (le lieu, une liste, aussi)
    const row = e.events?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (row && ['at', 'place', 'text'].includes(f)) row[f] = f === 'place' ? ev.target.value.toUpperCase() : ev.target.value;
    return edRefresh(s);
  }
  if (k === 'edrisk') { // un risque : le champ retouché en place, la ligne redessinée à « OK »
    const row = e.risks?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (row && ['hazard', 'consequence', 'mitigation'].includes(f)) row[f] = ev.target.value;
    return edRefresh(s);
  }
  if (k === 'edstory') { // le récit : le champ retouché en place ; le compte du résumé suit la frappe
    const f = ev.target.dataset.f;
    if (e.story && ['summary', 'description', 'primary', 'secondary', 'payload', 'mass', 'pax'].includes(f)) e.story[f] = ev.target.value;
    const n = s.el.querySelector('[data-stcount]');
    if (n && f === 'summary') {
      n.textContent = s.tt(TX.stCount, {
        n: ev.target.value.length,
        m: ED.SUMMARY_MAX
      });
      n.dataset.over = ev.target.value.length > ED.SUMMARY_MAX ? '1' : '';
    }
    return edRefresh(s);
  }
  if (k === 'edplace') { // un lieu : le champ retouché en place, la ligne redessinée à « OK »
    const row = e.places?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (row && ['id', 'name', 'role', 'lat', 'lon', 'zkind', 'radius', 'tot', 'participants'].includes(f)) row[f] = ev.target.value;
    return edRefresh(s);
  }
  if (k === 'edteam') { // une équipe : la ligne retouchée en place (le champ garde son curseur)
    const row = e.teams?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (row && ['name', 'service', 'type', 'role'].includes(f)) row[f] = ev.target.value;
    return edRefresh(s);
  }
  const key = {
    edfam: 'family',
    edsub: 'subtype',
    edser: 'series',
    edid: 'id',
    edtitle: 'title',
    edth: 'theatre',
    eddep: 'dep',
    edarr: 'arr',
    edco: 'airline',
    edac: 'aircraft'
  } [k];
  if (!key) return;
  const auto = ED.liaison(e.cadre.family) && (!e.cadre.title || e.cadre.title === ED.liaisonTitle(e.cadre.dep, e.cadre.arr));
  e.cadre[key] = key === 'id' || key === 'aircraft' ? ev.target.value.toUpperCase() : key === 'airline' && ev.target.value === MS.PERSONAL ?
    '' :
    ev.target.value;
  // une liaison : tant que le titre est celui que proposent les deux bouts (ou vide), il les suit (« LFPO → LFRS »)
  if (auto && (key === 'dep' || key === 'arr' || key === 'family')) {
    e.cadre.title = ED.liaisonTitle(e.cadre.dep, e.cadre.arr);
    const t = s.el.querySelector('input[data-k=edtitle]');
    if (t) t.value = e.cadre.title;
  }
  // un départ ou une arrivée retouchés au Cadre : leur ligne des Lieux suit (sa position ne reste que si le code OACI ne change pas)
  if ((key === 'dep' || key === 'arr') && e.places) {
    const fresh = ED.placesOf(ED.withCadre(e.base, e.cadre)).find(r => r.kind === key),
      at = e.places.findIndex(r => r.kind === key);
    if (at >= 0) e.places = fresh ? e.places.map((r, i) => i === at ? fresh : r) : e.places.filter((_, i) => i !== at);
    else if (fresh) e.places = [fresh, ...e.places];
  }
  if (ev.target.tagName === 'SELECT') {
    if (ev.type !== 'change') return;
    if (key === 'family') {
      e.cadre.subtype = '';
      if (e.mode !== 'edit') {
        const n = ED.numbering(allRows(s), e.cadre.family, edLetter(s, e.cadre.family));
        e.cadre.id = n.id;
        e.cadre.series = String(n.series);
      }
    }
    return draw(s);
  }
  if (ev.type !== 'input') return;
  edRefresh(s);
}
/** L'aperçu, les pastilles et l'en-tête redessinés seuls (pendant la frappe). */
function edRefresh(s) {
  const e = s.ed,
    doc = edDoc(e),
    aside = s.el.querySelector('[data-edaside]'),
    steps = s.el.querySelector('[data-steps]'),
    head = s.el.querySelector('[data-edhead]');
  if (aside) aside.innerHTML = edAsideHtml(s, doc);
  if (steps) steps.outerHTML = edStepsHtml(s, doc);
  if (head) head.textContent = [e.cadre.id || s.tt(TX.edNewTitle), e.cadre.title].filter(Boolean).join(' · ');
}

/** Le registre retouché par l'éditeur : relu d'abord (un autre pilote a pu l'écrire), `change(doc)` → { doc } | { error } ; une seule
 *  écriture, sur l'appareil (elle part avec l'envoi groupé, SOG-0279). → '' ou le mot de l'échec. */
async function edRegister(s, change) {
  let got = await yamlFile(s.ctx, REGISTRY);
  if (got.why === 'late') got = await got.later;
  if (got.why && got.why !== 'missing') return got.err || s.tt(TX.regUnread);
  const out = change(got.doc && typeof got.doc === 'object' ? got.doc : {});
  if (out.error) return out.error === 'taken' ? s.tt(TX.edBlock_idTaken) : s.tt(TX.regStale);
  await s.ctx.data.put(REGISTRY, RG.withHeader(out.doc, globalThis.jsyaml), {
    module: 'missions'
  });
  s.rows = MS.readRegistry(out.doc).filter(x => !x.organisation).sort((a, b) => b.id.localeCompare(a.id));
  s.idx = null;
  return '';
}

/** « Enregistrer » : ce qui bloque est dit (famille, identifiant) ; sinon le fichier de la mission puis sa ligne du registre, écrits sur
 *  l'appareil par data.put (bornés aux écritures déclarées du module) ; ils partent avec l'envoi groupé (réponse de l'ergonome, 13 nov.).
 *  Un identifiant changé écrit un nouveau fichier ; l'ancien n'est jamais effacé, la ligne garde l'ancien identifiant (formerId). */
async function edSave(s) {
  const e = s.ed;
  if (!e || e.busy) return;
  const c = {
      ...e.cadre,
      id: e.cadre.id.trim().toUpperCase(),
      family: e.cadre.family.trim().toUpperCase()
    },
    letter = edLetter(s, c.family),
    block = ED.blocking(c, {
      rows: allRows(s),
      letter,
      own: [e.origId, e.regId].filter(Boolean)
    });
  if (block.length) return s.ctx.notify(s.tt(TX[`edBlock_${block[0]}`], {
    l: letter
  }), 'warn');
  // audit 182 : « Enregistrer » sans rien toucher n'écrit rien (le fichier reste identique, octet pour octet)
  if (e.mode === 'edit' && ED.same(edDoc(e, c), e.base)) return s.ctx.notify(s.tt(TX.edSame), 'info');
  const path = e.mode === 'edit' && c.id === e.origId && e.path ? e.path : ED.pathFor(letter, c.family, c.id);
  if (!path) return s.ctx.notify(s.tt(TX.edBlock_idForm), 'warn');
  e.busy = true;
  draw(s);
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    const doc = edDoc(e, c);
    await s.ctx.data.put(path, ED.yamlText(doc, globalThis.jsyaml), {
      module: 'missions'
    });
    const regErr = await edRegister(s, reg => {
      if (e.mode !== 'edit' || !e.regId) return ED.regAdd(reg, RG.entryOfMission(doc, path, undefined, RG.seriesRows(RG.entries(
        reg))));
      const list = Array.isArray(reg.missions) ? reg.missions : [],
        idx = cut(list[e.regIdx]?.id, 40) === e.regId ? e.regIdx : list.findIndex(x => cut(x?.id, 40) === e.regId);
      return ED.regEdit(reg, idx, e.regId, c, path);
    }).catch(x => String(x?.message || x).slice(0, 120));
    if (S !== s || s.ed !== e) return;
    // la mission enregistrée devient celle qu'on modifie (Enregistrer ne ferme pas l'éditeur)
    const line = RG.entries(regErr ? {} : (await yamlFile(s.ctx, REGISTRY)).doc || {}).find(x => x.row.id === c.id);
    Object.assign(e, {
      mode: 'edit',
      base: doc,
      cadre: ED.cadreOf(doc),
      teams: null,
      places: null,
      placeEdit: -1,
      story: null,
      risks: null,
      riskEdit: -1,
      events: null,
      mapsAdd: null,
      path,
      origId: c.id,
      regIdx: line ? line.idx : e.regIdx,
      regId: line ? cut(line.raw.id, 40) : e.regId,
      pending: true
    });
    s.ctx.notify(regErr ? s.tt(TX.edRegLater, {
      e: regErr
    }) : s.tt(TX.edSaved), regErr ? 'warn' : 'ok');
  } catch (x) {
    s.ctx.notify(s.tt(TX.edFailed, {
      e: String(x?.message || x).slice(0, 120)
    }), 'error');
  } finally {
    e.busy = false;
    if (S === s && s.ed === e) draw(s);
  }
}

/** Les gestes de l'éditeur et ses entrées depuis le Registre. */
function edClick(s, b) {
  const r = s.reg,
    idx = Number.isInteger(+b.dataset.rid) ? +b.dataset.rid : -1,
    line = r?.lines.find(x => x.idx === idx);
  switch (b.dataset.do) {
    case 'edcreate':
      return edOpen(s, 'new');
    case 'edmodify':
      return line && edOpen(s, 'edit', line);
    case 'eddup':
      return line && edOpen(s, 'dup', line);
    case 'edsave':
      return edSave(s);
    case 'edstep':
    case 'ednext':
      if (!ED.OPEN.includes(b.dataset.step)) return;
      s.ed.step = b.dataset.step;
      // la première ouverture des Équipes lit celles du fichier ; ensuite, les lignes retouchées sont gardées d'une étape à l'autre
      if (s.ed.step === 'teams' && !s.ed.teams) s.ed.teams = ED.teamsOf(s.ed.base);
      // les lieux lus du document au cadre déjà retouché (le départ et l'arrivée portent le nom saisi au Cadre)
      if (s.ed.step === 'places' && !s.ed.places) s.ed.places = ED.placesOf(edDoc(s.ed));
      if (s.ed.step === 'story' && !s.ed.story) s.ed.story = ED.storyOf(s.ed.base);
      if (s.ed.step === 'risks' && !s.ed.risks) s.ed.risks = ED.risksOf(s.ed.base);
      if (s.ed.step === 'timeline' && !s.ed.events) s.ed.events = ED.eventsOf(s.ed.base);
      draw(s);
      // au téléphone, la pastille de l'étape ouverte vient dans la bande qui défile (sans faire sauter la page)
      return s.el.querySelector('[data-steps] [aria-current]')?.scrollIntoView?.({
        inline: 'nearest',
        block: 'nearest'
      });
    case 'edplace':
      s.ed.placeEdit = s.ed.placeEdit === +b.dataset.i ? -1 : +b.dataset.i;
      return draw(s);
    case 'edeventadd':
      s.ed.events = [...(s.ed.events || ED.eventsOf(s.ed.base)), {
        i: -1,
        at: 'H',
        place: '',
        text: ''
      }].slice(0, ED.EVENTS_MAX);
      draw(s);
      return s.el.querySelector(`[data-event="${s.ed.events.length - 1}"] [data-f=text]`)?.focus();
    case 'edeventdel':
      s.ed.events = (s.ed.events || []).filter((_, i) => i !== +b.dataset.i);
      return draw(s);
    case 'edmapspropose':
      // les cartes attendues d'après les lieux tels qu'ils sont à l'écran (des entrées ; une proposition ne se fait qu'une fois)
      s.ed.mapsAdd = [...(s.ed.mapsAdd || []), ...ED.proposedMaps(edDoc(s.ed))];
      return draw(s);
    case 'edrisk':
      s.ed.riskEdit = s.ed.riskEdit === +b.dataset.i ? -1 : +b.dataset.i;
      return draw(s);
    case 'edriskok':
      s.ed.riskEdit = -1;
      return draw(s);
    case 'edriskdel':
      s.ed.risks = (s.ed.risks || []).filter((_, i) => i !== +b.dataset.i);
      s.ed.riskEdit = -1;
      return draw(s);
    case 'edriskadd':
      s.ed.risks = [...(s.ed.risks || ED.risksOf(s.ed.base)), {
        i: -1,
        hazard: '',
        consequence: '',
        mitigation: ''
      }].slice(0, ED.RISKS_MAX);
      s.ed.riskEdit = s.ed.risks.length - 1;
      draw(s);
      return s.el.querySelector(`[data-rkform="${s.ed.riskEdit}"] input`)?.focus();
    case 'edplaceok':
      s.ed.placeEdit = -1;
      return draw(s);
    case 'edplacedel':
      s.ed.places = (s.ed.places || []).filter((_, i) => i !== +b.dataset.i);
      s.ed.placeEdit = -1;
      return draw(s);
    case 'edplaceadd': {
      const kind = ['target', 'zone', 'pt', 'rdv'].includes(b.dataset.kind) ? b.dataset.kind : 'pt',
        list = s.ed.places || [],
        n = list.filter(r => r.kind === kind).length + 1;
      if (n > ED.PLACES_MAX || (kind === 'target' && n > 1)) return;
      const row = {
        kind,
        i: -1,
        id: kind === 'zone' ? `ZONE-${n}` : kind === 'pt' ? `PT${n}` : kind === 'rdv' ? `RDV-${n}` : 'TARGET',
        name: '',
        role: '',
        lat: '',
        lon: '',
        ...(kind === 'zone' ? {
          zkind: '',
          radius: '',
          tot: '',
          poly: 0
        } : kind === 'rdv' ? {
          participants: ''
        } : {})
      };
      // la nouvelle ligne rejoint les lieux de sa sorte (l'ordre du fichier : cible, zones, points, rendez-vous)
      const order = ['dep', 'arr', 'target', 'zone', 'pt', 'rdv'],
        at = list.findIndex(r => order.indexOf(r.kind) > order.indexOf(kind));
      s.ed.places = at < 0 ? [...list, row] : [...list.slice(0, at), row, ...list.slice(at)];
      s.ed.placeEdit = at < 0 ? s.ed.places.length - 1 : at;
      draw(s);
      return s.el.querySelector(`[data-plform="${s.ed.placeEdit}"] input`)?.focus();
    }
    case 'edteamadd':
      s.ed.teams = [...(s.ed.teams || ED.teamsOf(s.ed.base)), {
        i: -1,
        name: '',
        service: '',
        type: '',
        role: ''
      }].slice(0, ED.TEAMS_MAX);
      draw(s);
      return s.el.querySelector(`[data-team="${s.ed.teams.length - 1}"] input`)?.focus();
    case 'edteamdel':
      s.ed.teams = (s.ed.teams || []).filter((_, i) => i !== +b.dataset.i);
      return draw(s);
    case 'edcancel':
      s.ed = null;
      draw(s);
      if (s.reg) regLoad(s);
      return;
  }
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
    s.idx = null;
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
