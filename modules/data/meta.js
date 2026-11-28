// Meta du module data (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'data',
  title: ['Données', 'Data', 'Daten', 'Datos'], // en-tête du téléphone (règle 16) ; texts.js (TX.title) le prend ici
  apps: ['pilot'],
  level: 3,
  // la construction de la base est un travail du lanceur (regen/job) ; regen/verbs : les opérations que ce lanceur connaît ; aucune lecture de data/ par le lanceur
  launcher: {
    // regen/job couvre aussi son annulation regen/job/cancel (cadre, f70eba426) ; sync-status : l'état de data/ avant la
    // question de « Publier » (GET, jamais de POST /__setup/sync : la publication passe par ctx.data.sync)
    routes: ['regen/job', 'regen/job/release', 'regen/verbs', 'sync-status', 'data/inventory', 'base/upload', 'personal', 'xplane'],
    read: []
  },
  files: ['meta.js', 'model.js', 'model_screen.js', 'model_sets.js', 'model_results.js', 'model_chain.js', 'model_map.js',
    'model_publish.js',
    'model_kit.js', 'model_inventory.js', 'texts.js', 'state.js', 'screen.js', 'panels.js', 'zonemap.js', 'follow.js', 'publish.js',
    'chain.js', 'inventory.js', 'model_route.js', 'model_update.js', 'model_status.js', 'model_packs.js', 'route.js', 'update.js',
    'status.js', 'packs.js', 'model_world.js', 'world.js', 'model_coverage.js', 'covtable.js', 'upload.js', 'model_busy.js', 'busy.js',
    'model_countries.js', 'countries.js', 'model_todo.js', 'todo.js', 'later.js', 'registry.js', 'tours.js', 'model_tours.js',
    'model_setstate.js', 'setstate.js', 'xplane.js',
    'zipmember.js', 'belgium.js', 'model_mapview.js',
    'mapview.js',
    'model_thread.js',
    'zoneop.js', 'select.js',
    '../../frame/lib/plural.js', '../../frame/lib/untrusted.js', // SOG-0468 (c) : importé par model_sets.js
    '../../frame/lib/sortlist.js', // SOG-0498 : le tri du tableau de couverture (covtable.js)
    '../../frame/lib/fold.js', // SOG-0468 (3) : le pli (fold) et son écouteur (wireFolds) : screen.js, packs.js, panels.js, later.js, todo.js, covtable.js, inventory.js, module.js
    '../maps/lib/map_base.js?v=0', '../maps/render.js?v=0', '../../frame/lib/dom.js', '../../frame/lib/time.js',
    '../../frame/lib/busy.js' // SOG-0658 : les mots du cadre (SETS, VERBS) pour le nom de l'opération en cours (busy.js)
  ],
  // la carte des zones : MapLibre et les contours, chargés à la demande par le socle de carte (comme la Météo) ; les tuiles, appelées par MapLibre lui-même
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0'],
  net: ['tiles.openfreemap.org'],
  reads: ['cache/data/',
    'cache/sort/'
  ], // cache/sort/ : l'ordre gardé du tableau de couverture est LU par loadState (SOG-0498), pas seulement écrit
  writes: [{
    prefix: 'cache/data/',
    policy: 'cache'
  }, {
    prefix: 'cache/sort/', // l'ordre choisi du tableau de couverture (frame/lib/sortlist.js, SOG-0498)
    policy: 'cache'
  }]
};
