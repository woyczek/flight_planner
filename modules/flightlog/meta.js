// Meta du module flightlog (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'flightlog',
  title: ['Mes vols', 'My flights', 'Meine Flüge', 'Mis vuelos'], // en-tête du téléphone (règle 16)
  apps: ['pilot'],
  level: 1,
  reads: ['cr/', 'pilot/', 'cache/flightlog/', 'cache/report/'],
  writes: [{
    prefix: 'pilot/handoff.json',
    policy: 'cache'
  }, {
    prefix: 'cache/flightlog/',
    policy: 'cache'
  }],
  files: ['meta.js', 'model.js', '../../frame/lib/last_flight.js', '../../frame/lib/js-yaml.min.js', '../../frame/lib/dom.js',
    '../../frame/lib/time.js', '../../frame/lib/mission_categories.js', '../../frame/lib/airline.js',
    '../../frame/lib/geo.js' // SOG-0468 (2) : importé par last_flight.js (gcNm ; cas I26)
  ]
};
