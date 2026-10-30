(() => {
  'use strict';
  // V3 — pages d'administration (carte « Administration » des réglages, niveau Complet ; frame/settings/SPEC.md § 6) :
  // une liste déclarée, sans dépendance à aucun module ; la carte montre UN BOUTON par entrée (règle 18 de
  // docs/technique/V3_SPECIFICATION.md § 7.1), rien de l'administrateur n'est sur les autres cartes. Chaque entrée :
  // { id, href (adresse de l'appli « #… », ou chemin relatif à la racine de la suite ; same : ouvert dans le même onglet,
  // pour une autre application du cadre « frame/?app=… »), act (action de la carte, au lieu
  // d'une adresse), panel (le bouton déplie un volet de la carte, écrit par settings.js : edge, cfg, remote, keys), primary
  // (bouton d'une page de réglage de l'administrateur), where (app : partout ; bench : un banc ou une démonstration, bouton
  // actif seulement sur un poste avec lanceur ; v2 : page V2 du poste, montrée seulement si un lanceur sert la page ;
  // launcher : réglage du lanceur de ce poste, montré seulement si un lanceur sert la page), title,
  // text, copyLink (sous le lien : l'adresse absolue de la page et « Copier le lien ») } — textes en quatre langues [fr, en, de, es].
  window.SogAdminLinks = Object.freeze([{
    id: 'tune',
    href: '#maps?tune=1',
    where: 'app',
    primary: true,
    title: ['Réglage des seuils de la carte', 'Map threshold tuning',
      'Abstimmung der Kartenschwellen', 'Ajuste de los umbrales del mapa'
    ],
    text: [
      'Ce que la carte montre à chaque zoom, élément par élément et mode par mode, pour toute la compagnie (le curseur « Complexité » de la carte ne fait que décaler le zoom) ; en lecture seule sur un téléphone.',
      'What the map shows at each zoom, element by element and mode by mode, for the whole airline (the map’s “Complexity” slider only shifts the zoom); read only on a phone.',
      'Was die Karte bei jedem Zoom zeigt, Element für Element und Modus für Modus, für die ganze Fluggesellschaft (der Regler „Komplexität“ der Karte verschiebt nur den Zoom); auf einem Telefon nur lesbar.',
      'Lo que muestra el mapa en cada zoom, elemento por elemento y modo por modo, para toda la aerolínea (el control «Complejidad» del mapa solo desplaza el zoom); solo lectura en un teléfono.'
    ]
  }, {
    id: 'edge',
    panel: 'edge',
    where: 'app',
    primary: true,
    title: ['Limite de la zone du vol', 'Flight zone limit', 'Grenze der Flugzone', 'Límite de la zona del vuelo'],
    text: [
      'Le filet qui borde la zone du vol sur la carte : affiché (par défaut) ou masqué, pour toute la compagnie ; enregistré avec les seuils de la carte.',
      'The edge line around the flight zone on the map: shown (the default) or hidden, for the whole airline; saved with the map thresholds.',
      'Die Linie um die Flugzone auf der Karte: angezeigt (Standard) oder ausgeblendet, für die ganze Fluggesellschaft; zusammen mit den Kartenschwellen gespeichert.',
      'La línea que bordea la zona del vuelo en el mapa: mostrada (por omisión) u oculta, para toda la aerolínea; guardada con los umbrales del mapa.'
    ]
  }, {
    id: 'runwayZoom',
    panel: 'runway',
    where: 'app',
    primary: true,
    title: ['Seuils de piste sur la carte', 'Runway thresholds on the map', 'Pistenschwellen auf der Karte',
      'Umbrales de pista en el mapa'
    ],
    text: [
      'Le zoom à partir duquel la carte dessine les seuils de piste (petit vecteur et numéro), pour toute la compagnie ; en dessous, rien n’est dessiné.',
      'The zoom from which the map draws the runway thresholds (small vector and designator), for the whole airline; below it, nothing is drawn.',
      'Die Zoomstufe, ab der die Karte die Pistenschwellen zeichnet (kleiner Vektor und Bezeichnung), für die ganze Fluggesellschaft; darunter wird nichts gezeichnet.',
      'El zoom a partir del cual el mapa dibuja los umbrales de pista (pequeño vector y designador), para toda la aerolínea; por debajo, no se dibuja nada.'
    ]
  }, {
    id: 'cfg',
    panel: 'cfg',
    where: 'app',
    primary: true,
    title: ['Exporter une configuration pour un pilote', 'Export a configuration for a pilot',
      'Konfiguration für einen Piloten exportieren', 'Exportar una configuración para un piloto'
    ],
    text: [
      'Un fichier et un lien qui règlent l’appli d’un pilote : la compagnie, le dépôt des données, son trigramme et le mode d’emploi du jeton. Jamais de jeton ni de secret.',
      'A file and a link that set up a pilot’s app: the airline, the data repository, their trigram and how to create the token. Never a token or a secret.',
      'Eine Datei und ein Link, die die App eines Piloten einrichten: die Fluggesellschaft, das Datenrepository, sein Kürzel und die Anleitung für das Token. Nie ein Token oder Geheimnis.',
      'Un archivo y un enlace que configuran la app de un piloto: la aerolínea, el repositorio de datos, su trigrama y cómo crear el token. Nunca un token ni un secreto.'
    ]
  }, {
    id: 'remote',
    panel: 'remote',
    where: 'launcher',
    primary: true,
    title: ['Dépôt distant de data/', 'Remote repository of data/', 'Entferntes Repository von data/',
      'Repositorio remoto de data/'
    ],
    text: [
      'Où le lanceur de ce poste envoie et reçoit les données de la compagnie ; une autre adresse se confirme dans une fenêtre sur l’ordinateur.',
      'Where this computer’s launcher sends and receives the airline’s data; another address is confirmed in a window on the computer.',
      'Wohin der Starter dieses Rechners die Daten der Fluggesellschaft sendet und woher er sie empfängt; eine andere Adresse wird in einem Fenster auf dem Computer bestätigt.',
      'Adónde envía y de dónde recibe el lanzador de este equipo los datos de la aerolínea; otra dirección se confirma en una ventana del ordenador.'
    ]
  }, {
    id: 'keys',
    panel: 'keys',
    where: 'launcher',
    primary: true,
    title: ['Clés d’API de la compagnie (IVAO, EAD Basic)', 'Airline API keys (IVAO, EAD Basic)',
      'API-Schlüssel der Fluggesellschaft (IVAO, EAD Basic)',
      'Claves API de la aerolínea (IVAO, EAD Basic)'
    ],
    text: [
      'La clé IVAO et les identifiants EAD Basic, gardés par le lanceur de ce poste (dossier secrets/), jamais par le navigateur ni dans les données.',
      'The IVAO key and the EAD Basic credentials, kept by this computer’s launcher (secrets/ folder), never by the browser nor in the data.',
      'Der IVAO-Schlüssel und die EAD-Basic-Zugangsdaten, vom Starter dieses Rechners verwahrt (Ordner secrets/), nie vom Browser und nie in den Daten.',
      'La clave IVAO y las credenciales de EAD Basic, guardadas por el lanzador de este equipo (carpeta secrets/), nunca por el navegador ni en los datos.'
    ]
  }, {
    id: 'data',
    href: 'frame/?app=maintenance#data',
    same: true, // une autre application du même cadre : dans le même onglet
    // l'application Maintenance (décision de l'utilisateur, 29 oct 2026 : les réglages d'administration des données hors de
    // Pilote) : la ligne l'ouvre sur son module Données
    copyLink: true, // l'adresse à copier : à ouvrir sur un téléphone, en lecture seule
    where: 'app',
    title: ['Maintenance', 'Maintenance', 'Wartung', 'Mantenimiento'],
    text: [
      'Les données de la compagnie : la couverture par pays et par État, et l’état de chaque jeu de données (cycle, âge, parseur) ; sur un téléphone, en lecture seule.',
      'The airline’s data: the coverage by country and by State, and the state of each data set (cycle, age, parser); read only on a phone.',
      'Die Daten der Fluggesellschaft: die Abdeckung nach Land und Staat und der Zustand jedes Datensatzes (Zyklus, Alter, Parser); auf einem Telefon nur lesbar.',
      'Los datos de la aerolínea: la cobertura por país y por Estado, y el estado de cada conjunto de datos (ciclo, antigüedad, analizador); solo lectura en un teléfono.'
    ]
  }, {
    id: 'sources',
    href: '#sources',
    copyLink: true, // sous le lien, l'adresse absolue publiée (depuis location) et « Copier le lien » : à ouvrir sur le téléphone
    where: 'app',
    title: ['Sources des données', 'Data sources', 'Datenquellen', 'Fuentes de datos'],
    text: [
      'Les sources des données aéronautiques que la suite utilise, envisage ou a écartées : un lien par source, ce qu’elle donne, sa licence, le cycle AIRAC en vigueur.',
      'The sources of aeronautical data the suite uses, considers or has set aside: one link per source, what it gives, its licence, the AIRAC cycle in force.',
      'Die Quellen der Luftfahrtdaten, die die Suite nutzt, erwägt oder zurückgestellt hat: ein Link pro Quelle, was sie liefert, ihre Lizenz, der gültige AIRAC-Zyklus.',
      'Las fuentes de datos aeronáuticos que la suite utiliza, considera o ha descartado: un enlace por fuente, lo que da, su licencia, el ciclo AIRAC vigente.'
    ]
  }, {
    id: 'roadmap',
    href: '#roadmap',
    where: 'app',
    title: ['Feuille de route', 'Roadmap', 'Fahrplan', 'Hoja de ruta'],
    text: ['Ce qui est livré, en cours, prévu, module par module.', 'What is delivered, in progress, planned, module by module.',
      'Was geliefert, in Arbeit, geplant ist, Modul für Modul.', 'Lo entregado, en curso, previsto, módulo por módulo.'
    ]
  }, {
    id: 'diag',
    act: 'diagOpen',
    where: 'app',
    title: ['Diagnostic', 'Diagnostics', 'Diagnose', 'Diagnóstico'],
    text: ['L’état de la synchronisation et des bases, ligne par ligne, à copier pour signaler un problème (carte À propos).',
      'The state of synchronisation and bases, line by line, to copy to report a problem (About card).',
      'Der Zustand von Synchronisation und Basen, Zeile für Zeile, zum Kopieren für eine Fehlermeldung (Karte Über).',
      'El estado de la sincronización y de las bases, línea por línea, para copiar al señalar un problema (tarjeta Acerca de).'
    ]
  }, {
    id: 'primitives',
    href: 'labs/design_primitives.html',
    where: 'bench',
    title: ['Primitives et designs', 'Primitives and designs', 'Primitive und Designs', 'Primitivas y diseños'],
    text: ['Démonstration : chaque composant commun du cadre dans chaque design, jour et nuit.',
      'Demonstration: each common component of the frame in each design, day and night.',
      'Demonstration: jede gemeinsame Komponente des Rahmens in jedem Design, Tag und Nacht.',
      'Demostración: cada componente común del marco en cada diseño, de día y de noche.'
    ]
  }, {
    id: 'aerodbBench',
    href: 'frame/aerodb/bench.html',
    where: 'bench',
    title: ['Banc de la base aéronautique', 'Aeronautical base bench', 'Prüfstand der Luftfahrtbasis',
      'Banco de la base aeronáutica'
    ],
    text: ['Lecture des bases publiées (zones, types) et de leurs recherches.',
      'Reading of the published bases (zones, types) and their searches.',
      'Lesen der veröffentlichten Basen (Zonen, Typen) und ihrer Suchen.',
      'Lectura de las bases publicadas (zonas, tipos) y sus búsquedas.'
    ]
  }, {
    id: 'offlineBench',
    href: 'frame/aerodb/offline_bench.html',
    where: 'bench',
    title: ['Banc hors ligne de la base aéronautique', 'Aeronautical base offline bench', 'Offline-Prüfstand der Luftfahrtbasis',
      'Banco sin conexión de la base aeronáutica'
    ],
    text: ['Zones gardées hors ligne sur la couche de données réelle du cadre.',
      'Zones kept offline on the frame’s real data layer.',
      'Offline gehaltene Zonen auf der echten Datenschicht des Rahmens.',
      'Zonas guardadas sin conexión sobre la capa de datos real del marco.'
    ]
  }, {
    id: 'storeTests',
    href: 'frame/store/test/',
    where: 'bench',
    title: ['Essais de la couche de données', 'Data layer tests', 'Tests der Datenschicht', 'Pruebas de la capa de datos'],
    text: ['Synchronisation, conflits et file d’attente, contre le faux GitHub (frame/store/test/fake_github.py).',
      'Synchronisation, conflicts and queue, against the fake GitHub (frame/store/test/fake_github.py).',
      'Synchronisation, Konflikte und Warteschlange, gegen das falsche GitHub (frame/store/test/fake_github.py).',
      'Sincronización, conflictos y cola, contra el GitHub falso (frame/store/test/fake_github.py).'
    ]
  }, {
    id: 'mapsRender',
    href: 'modules/maps/test/render.html',
    where: 'bench',
    title: ['Banc du rendu de la carte', 'Map rendering bench', 'Prüfstand der Kartendarstellung',
      'Banco del renderizado del mapa'
    ],
    text: ['Rendu de la carte et des symboles sur des données d’essai, sans base ni lanceur.',
      'Rendering of the map and its symbols on test data, without base or launcher.',
      'Darstellung der Karte und ihrer Symbole mit Testdaten, ohne Basis und Starter.',
      'Renderizado del mapa y sus símbolos con datos de prueba, sin base ni lanzador.'
    ]
  }, {
    id: 'maintenance',
    href: 'apps/settings/maintenance.html',
    where: 'v2',
    title: ['Paramètres › Maintenance (V2)', 'Settings › Maintenance (V2)', 'Einstellungen › Wartung (V2)',
      'Ajustes › Mantenimiento (V2)'
    ],
    text: ['Bases de données, sources et dossiers, mises à jour de la suite sur ce poste.',
      'Databases, sources and folders, updates of the suite on this workstation.',
      'Datenbanken, Quellen und Ordner, Aktualisierungen der Suite auf diesem Rechner.',
      'Bases de datos, fuentes y carpetas, actualizaciones de la suite en este puesto.'
    ]
  }, {
    id: 'firstLaunch',
    href: 'apps/settings/premier_lancement.html',
    where: 'v2',
    title: ['Premier lancement (V2)', 'First launch (V2)', 'Erster Start (V2)', 'Primer inicio (V2)'],
    text: ['L’assistant d’installation du poste : dossier des données, dépôt, profil.',
      'The workstation’s setup assistant: data folder, repository, profile.',
      'Der Einrichtungsassistent des Rechners: Datenordner, Repository, Profil.',
      'El asistente de instalación del puesto: carpeta de datos, repositorio, perfil.'
    ]
  }, {
    id: 'mapStudio',
    href: 'apps/cpco/map_parser.html',
    where: 'v2',
    title: ['Studio cartographique (V2)', 'Map studio (V2)', 'Kartenstudio (V2)', 'Estudio cartográfico (V2)'],
    text: ['Les cartes des missions et leurs profils d’affichage.', 'The mission maps and their display profiles.',
      'Die Missionskarten und ihre Anzeigeprofile.', 'Los mapas de las misiones y sus perfiles de visualización.'
    ]
  }]);
})();
