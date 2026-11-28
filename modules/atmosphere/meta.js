// Meta du module atmosphere (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'atmosphere',
  apps: ['pilot'],
  level: 1,
  // vue fixe plein cadre (frame/INTEGRATION.md § 9.2) : la carte sous tout le module, la feuille par-dessus
  fixed: true,
  help: true,
  // la météo passe par la couche du cadre (ctx.weather, frame/INTEGRATION.md § 14), qui garde sa propre réserve
  reads: ['pilot/', 'cache/atmosphere/', 'airline/map_profiles.json'],
  // le travail weather/world du lanceur de ce poste (SOG-0138 : « Construire » le synoptique monde) ; sans lanceur, ctx.launcher est nul
  launcher: {
    routes: ['regen/job']
  },
  // réglages de l'écran gardés sur l'appareil
  writes: [{
    prefix: 'cache/atmosphere/',
    policy: 'cache'
  }],
  files: ['meta.js?v=0', 'style.js?v=0', 'fmt.js?v=0', 'flight.js?v=0', 'wx.js?v=0', 'screen_map.js?v=0', 'screen_cut.js?v=0',
    'screen_details.js?v=0', 'screen_flight.js?v=0', 'screen_layers.js?v=0',
    'atmo.js?v=0', 'demo.js?v=0', 'world.js?v=0', 'world_build.js?v=0', 'lib/weather_map.js?v=0', 'section.js?v=0', 'texts.js?v=0',
    '../maps/lib/map_base.js?v=0', '../maps/lib/axis_window.js?v=0', '../maps/render.js?v=0',
    '../../frame/lib/sheet.js?v=0', '../../frame/lib/geo.js?v=0', '../../frame/lib/weather_store.js?v=0',
    '../../frame/lib/flight_path.js?v=0', '../../frame/lib/flight_time.js?v=0', '../../frame/lib/icons.js?v=0',
    '../../frame/lib/hit_target.js?v=0', '../../frame/lib/theme.js?v=0',
    '../../frame/lib/route_text.js?v=0', '../../frame/lib/metar.js?v=0', '../fuel/winds.js?v=0', '../fuel/weather.js?v=0'
  ],
  // du module Carte, gardés au premier usage : MapLibre, et les contours des pays du fond uni
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0'],
  // tuiles appelées par MapLibre lui-même (jamais par ctx.net) ; CSP connect-src du cadre
  net: ['tiles.openfreemap.org']
};
