// Meta du module fuel (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'fuel',
  title: ['Carburant et niveau', 'Fuel and level', 'Kraftstoff und Flugfläche', 'Combustible y nivel'], // en-tête du téléphone (règle 16)
  apps: ['pilot'],
  level: 1,
  // titre lisible d'un document de Carburant en attente de synchronisation (la carte Synchronisation des Réglages, Simplification
  // 1er nov. 2026) : [fr, en, de, es], ou null (valeur absente ou illisible : le chemin en repli) ; pur, sans lecture
  titleOf: (path, v) => {
    if (/^pilot\/[^/]+\/fuel\.json$/.test(path)) return ['Réglages du devis', 'Quote settings', 'Einstellungen der Berechnung',
      'Ajustes del cálculo'
    ];
    if (!/^pilot\/[^/]+\/current_flight\.json$/.test(path) || !v || typeof v !== 'object') return null;
    const leg = [v.route?.dep, v.route?.arr].filter(x => typeof x === 'string' && x).join(' → ');
    if (!leg) return null;
    const ms = Date.parse(v.planned_at || v.updated_at || ''),
      d = Number.isFinite(ms) ? `${new Date(ms).getUTCDate()}/${new Date(ms).getUTCMonth() + 1}` : '';
    return d ? [`Vol ${leg} du ${d}`, `Flight ${leg} of ${d}`, `Flug ${leg} vom ${d}`, `Vuelo ${leg} del ${d}`] : [`Vol ${leg}`, `Flight ${leg}`,
      `Flug ${leg}`, `Vuelo ${leg}`
    ];
  },
  // missions/ : « Préparer ce vol » du module Missions (#fuel?mission=<id>) ; cache/data/personal.json : la coche « usage personnel »
  // de ce poste (module Données), lue seulement avant « Lire depuis Little Navmap » (SOG-0210)
  reads: ['pilot/', 'cache/fuel/', 'missions/', 'cache/data/personal.json'],
  // « Calculer A → B » et « Contrôler » (SOG-0080) : le travail route/compute du lanceur (AeroDB, RouteSim), détecté par regen/verbs
  launcher: {
    routes: ['regen/job', 'regen/job/cancel', 'regen/verbs', 'folders'],
    read: []
  },
  // fiches, flotte et référence : par aerodb (aircraft()), qui seul écrit aircraft/sheets/ et le miroir V2
  writes: [{
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/fuel/',
    policy: 'cache'
  }],
  // gardés hors ligne dès la première visite (service worker du cadre) ; ../data/model_sets.js et model_kit.js : la règle de la coche
  // « usage personnel » du module Données (SOG-0210)
  files: ['meta.js', 'performance_model.js', 'model.js', 'levels.js', 'weather.js', 'winds.js', 'progress.js', 'procedures.js',
    'procedures_texts.js', 'atis.js', 'direct.js', '../data/model_sets.js', '../data/model_kit.js', 'adnames.js', 'routecomplete.js',
    'suggest.js',
    '../../frame/lib/weather_store.js', '../../frame/lib/fuel_units.js', 'route_engine.js', 'route_reasons.js', 'zone_gap.js', 'fpl.js',
    'altn_check.js', 'mission_chip.js', 'proc_text.js', 'route_lines.js', 'route_limits.js', 'ceiling.js', 'simbrief_fetch.js',
    'route_refused.js',
    'altn_wx.js', 'auto_limits.js', 'proc_partial.js', 'route_bounds.js',
    // SOG-0617 : le bloc « Suite de la mission » de Missions et ce qu'il importe
    '../../frame/lib/crossing.js', '../../frame/lib/precision.js', '../missions/assign.js', '../missions/assign_view.js',
    '../missions/assigned.js', '../missions/drawers.js', '../missions/drawers_run.js', '../missions/drawers_view.js',
    '../missions/reader.js', '../missions/reader_view.js', '../missions/planned.js',
    '../../frame/lib/route_text.js', '../../frame/lib/current_flight.js', '../../frame/lib/flight_time.js',
    '../../frame/lib/flight_path.js', '../../frame/lib/procedures.js', '../../frame/lib/routing.js', '../../frame/lib/fms.js',
    '../../frame/lib/route_alts.js',
    '../../frame/lib/external_links.js', '../../frame/lib/icons.js', '../../frame/lib/dom.js', '../../frame/lib/clipboard.js',
    '../../frame/lib/time.js', '../../frame/lib/geo.js', '../../frame/lib/mission_themes.js', '../../frame/lib/airline.js',
    '../../frame/lib/plural.js', // SOG-0468
    '../../frame/lib/untrusted.js', // SOG-0468 (c) : importé par route_engine.js et par ../data/model_sets.js
    // importés depuis (R-F1, R-F4a, § 10.27, la météo du cadre) : gardés hors ligne eux aussi dès l’installation
    '../../frame/lib/wind.js', '../../frame/lib/route_model.js', '../../frame/lib/adnames.js', '../../frame/lib/ad_field.js',
    '../../frame/lib/text.js', '../../frame/lib/fold.js', '../../frame/lib/altn_sign.js', // SOG-0713, SOG-0690 (b)
    '../../frame/lib/suggest_list.js', '../../frame/lib/metar.js', '../../frame/lib/mission_events.js',
    '../../frame/lib/mission.js', '../../frame/lib/js-yaml.min.js', '../../frame/lib/route_legend.js', '../../frame/lib/theme.js'
  ]
};
