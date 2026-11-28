// Meta du module missions (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'missions',
  apps: ['company'], // l'application Compagnie (?app=company), seule (décision de l'utilisateur, 1er nov. 2026)
  level: 1,
  title: ['Missions', 'Missions', 'Missionen', 'Misiones'],
  files: ['meta.js', 'add.js', 'move.js', 'registry.js', 'search.js', 'choice.js', 'paste.js', 'editor.js', 'editor_texts.js',
    'editor_view.js',
    'draft.js',
    'editor_drawers.js', 'catalog.js', 'catalog.yaml', 'editor_trial.js', 'editor_map.js', 'assigned.js',
    'editor_flow.js', 'editor_flow_view.js',
    'editor_flow_texts.js', // SOG-0620 lot 2 : le déroulé de l'atelier (Création), importé par editor_view.js
    'assign.js', 'assign_view.js', // SOG-0443 : « Affecter… » — le calcul pur et l'écran
    'reader.js',
    'reader_view.js', // l'enveloppe et la liseuse de MA mission (SOG-0441, lot T3), à la session « Affectation des missions »
    'drawers.js', 'drawers_view.js',
    'drawers_run.js', // SOG-0617 : le juge des tiroirs (Création), importé par drawers_view.js
    'planned.js', // SOG-0620 lot 3 : le bloc « Prévu » du pilote (Création), importé par drawers_view.js
    'watch.js', // SOG-0617 : le veilleur de la mission en vol (meta.watch)
    '../../frame/lib/time.js', '../../frame/lib/clipboard.js',
    '../../frame/lib/mission.js', '../../frame/lib/mission_events.js', // mission_events.js : importé par mission.js (SOG-0620 ; I26)
    '../../frame/lib/ad_field.js', '../../frame/lib/adnames.js',
    '../../frame/lib/text.js', // text.js : importé par ad_field.js et search.js (SOG-0468 (2))
    '../../frame/lib/callsign_field.js', // SOG-0488 : le champ d'indicatif (Équipes)
    '../../frame/lib/icons.js', // l'atelier (editor_view.js) l'importe : demandé par Création (I26)
    '../../frame/lib/suggest_list.js', // SOG-0465 (adnames.js : importé par ad_field.js) : le champ de terrain de l'atelier (Départ, Arrivée), celui de Carburant
    '../../frame/lib/crossing.js', '../../frame/lib/untrusted.js', // SOG-0468 (c) : importé par crossing.js
    '../../frame/lib/precision.js', // SOG-0516 : les paliers d'un posé de précision, importés par drawers.js (il importe crossing.js et untrusted.js, déjà là)
    '../../frame/lib/geo.js', // SOG-0468 (2) : gcNm, que crossing.js importera (V3 Frame ; cas I26)
    '../../frame/lib/sortlist.js', // SOG-0487 : le tableau triable du registre (il importe untrusted.js, déjà là)
    '../../frame/lib/reorder.js', // SOG-0482 (lot 3) : le bloc des flèches « ↑ Plus tôt » / « ↓ Plus tard » (V3 Frame, pur, sans import), importé par editor_view.js
    '../../frame/lib/fold.js', // SOG-0508 : les plis de la fenêtre des briques, importés par editor_view.js (pur, sans import)
    '../maps/lib/map_base.js?v=0', '../maps/lib/map_edit.js?v=0',
    '../maps/render.js?v=0', // la carte de l'atelier (SOG-0444, lot P2) : le socle de carte, son édition, son rendu
    // SOG-0464 : le profil vertical de la Carte sous la carte de l'atelier (modules/maps/lib/profile_embed.js, de BUGS SOG) et les scripts
    // qu'il charge (render.js est déjà ci-dessus)
    '../maps/lib/profile_embed.js?v=0', '../maps/lib/aero_symbols.js?v=0', '../maps/lib/vertical_profile.js?v=0',
    '../maps/profile.js?v=0',
    '../../frame/lib/js-yaml.min.js',
    '../../frame/lib/mission_categories.js',
    '../../frame/lib/mission_themes.js', '../../frame/lib/airline.js', '../report/vocab.js'
  ],
  // la carte de l'atelier : MapLibre, chargé à la demande par le socle de carte (comme Données et Météo) ; ses tuiles, appelées par lui
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0'],
  // SOG-0464 : le relief du profil, l'entrée EXACTE de la Carte (modules/maps/module.js) — la CSP effective ne change pas (N145) ; lu par
  // ctx.net.fetch, que l'atelier passe à drawProfile
  net: ['tiles.openfreemap.org', 's3.amazonaws.com/elevation-tiles-prod'],
  reads: ['missions/', 'cr/',
    'airline/', 'pilot/',
    'cache/missions/' // SOG-0441 : les carnets des pilotes de la mission, le vol courant ; ce que l'appareil a vu ouvert
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
  // dérivée des fichiers, SOG-0036 : les fichiers hors registre sont listés à l'affichage suivant) ; et missions/affectations.json,
  // écrit par « Affecter… » (SOG-0443, assign_view.js)
  writes: [{
    prefix: 'missions/affectations.json',
    merge: 'keyed:assignments:mission+pilot+role' // SOG-0443 : fusion ligne par ligne, la même clé que tools/data_sync.py
  }, {
    prefix: 'missions/',
    merge: 'record'
  }, {
    prefix: 'pilot/', // SOG-0441 : le carnet de CE pilote (pilot/<TRI>/missions/<ID>.json), écrit par drawers_view.js seulement
    merge: 'record'
  }, {
    prefix: 'cache/missions/', // sur l'appareil seul : les ouvertures des autres déjà vues
    policy: 'cache'
  }, {
    prefix: 'cache/sort/', // SOG-0487 : le tri du registre, gardé sur l'appareil (sortlist.js : cache/sort/registry.json)
    policy: 'cache'
  }]
};
