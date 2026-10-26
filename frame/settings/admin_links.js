(() => {
  'use strict';
  // V3 — pages d'administration (carte « Administration » des réglages, niveau Complet ; frame/settings/SPEC.md § 6) :
  // une liste déclarée, sans dépendance à aucun module ; la carte montre UN BOUTON par entrée (règle 18 de
  // docs/technique/V3_SPECIFICATION.md § 7.1), rien de l'administrateur n'est sur les autres cartes. Chaque entrée :
  // { id, href (adresse de l'appli « #… », ou chemin relatif à la racine de la suite), act (action de la carte, au lieu
  // d'une adresse), panel (le bouton déplie un volet de la carte, écrit par settings.js : edge, cfg), primary (bouton
  // d'une page de réglage de l'administrateur), where (app : partout ; bench : un banc ou une démonstration, bouton actif
  // seulement sur un poste avec lanceur ; v2 : page V2 du poste, montrée seulement si un lanceur sert la page), title,
  // text } — textes en quatre langues [fr, en, de, es].
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
    id: 'datalab',
    href: '#datalab',
    where: 'app',
    title: ['Laboratoire données', 'Data laboratory', 'Daten-Labor', 'Laboratorio de datos'],
    text: [
      'Temporaire : mesure sur cet appareil si la base aéronautique peut être récupérée, analysée, compilée et publiée depuis un téléphone (adresses des sources, ZIP du SIA en trois modes, publication d’un essai) ; le rapport se copie.',
      'Temporary: measures on this device whether the aeronautical base can be fetched, parsed, compiled and published from a phone (source addresses, the SIA ZIP in three modes, a trial publication); the report can be copied.',
      'Temporär: misst auf diesem Gerät, ob die Luftfahrtbasis von einem Telefon aus geholt, analysiert, kompiliert und veröffentlicht werden kann (Quelladressen, SIA-ZIP in drei Modi, Testveröffentlichung); der Bericht ist kopierbar.',
      'Temporal: mide en este dispositivo si la base aeronáutica puede obtenerse, analizarse, compilarse y publicarse desde un teléfono (direcciones de las fuentes, ZIP del SIA en tres modos, publicación de prueba); el informe se copia.'
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
