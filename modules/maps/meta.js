// Meta du module maps (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'maps',
  apps: ['pilot'],
  level: 1,
  // vue fixe (frame/INTEGRATION.md § 9.2) : la racine est une colonne pleine hauteur, carte puis feuille ; les boutons de la
  // carte sont dans la couche de superposition du cadre
  fixed: true,
  // missions/ : lu à la demande seulement (dossiers lourds), jamais tiré d'avance ; airline/ : profils des modes de la
  // compagnie (map_profiles.json) ; pilot/ : vol courant et unités du pilote
  reads: ['pilot/', {
    prefix: 'missions/',
    policy: 'reference'
  }, 'cache/maps/', 'cache/fuel/display.json', 'cache/missions/', 'airline/'],
  // les tours de piste VFR de l'extracteur de l'utilisateur (SOG-0253) : le verbe `vfr/circuits` du lanceur, LECTURE SEULE (circuits.js ; sans lanceur, rien n'est dessiné)
  launcher: {
    routes: ['regen/job'],
    read: []
  },
  // SPEC § 2.2 : réglages de l'appareil, vol courant modifié sur la carte, seuils de la compagnie (page de réglage)
  writes: [{
    prefix: 'cache/maps/',
    policy: 'cache'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'airline/map_profiles.json',
    merge: 'record'
  }],
  // gardés à l'installation (hors ligne dès la première visite)
  files: ['meta.js?v=0', 'atc.js?v=0', 'state.js?v=0', 'texts.js?v=0', 'style.js?v=0', 'screen.js?v=0', 'draw.js?v=0', 'alts.js?v=0',
    'altn.js?v=0',
    'canvas_scale.js?v=0',
    'data.js?v=0',
    'layers.js?v=0',
    'sheet_view.js?v=0', 'profile_view.js?v=0', 'procs.js?v=0', 'choose.js?v=0', 'choose_rules.js?v=0', 'ground.js?v=0',
    'coverage.js?v=0', 'tips.js?v=0',
    'lv.js?v=0',
    'vfr.js?v=0', 'circuits.js?v=0', 'follow.js?v=0', 'light.js?v=0', 'view_state.js?v=0',
    'flight_time.js?v=0',
    'mission_view.js?v=0', 'pilot.js?v=0', 'lib/safe_text.js?v=0', '../../frame/lib/text.js?v=0', '../missions/drawers.js?v=0',
    '../../frame/lib/crossing.js?v=0',
    '../../frame/lib/hit_target.js?v=0', // (a1) : importé par choose.js (cible commune du doigt)
    '../../frame/lib/untrusted.js?v=0', '../../frame/lib/altn_sign.js?v=0', '../../frame/lib/theme.js?v=0',
    '../fuel/mission_chip.js?v=0', // SOG-0617 : la puce « Mission <ID> » de la ligne d'en-tête, celle de Carburant
    '../../frame/lib/precision.js?v=0', // SOG-0516 : importé par missions/drawers.js
    '../../frame/lib/mission.js?v=0', '../../frame/lib/mission_events.js?v=0',
    'weather.js?v=0',
    'render.js?v=0', 'render_airspace.js?v=0', 'render_route.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'contours.js?v=0',
    'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/profiles.js?v=0', 'lib/map_base.js?v=0', 'lib/axis_window.js?v=0', 'lib/profile_embed.js?v=0',
    '../../frame/lib/js-yaml.min.js?v=0',
    '../../frame/lib/route_text.js?v=0', '../../frame/lib/current_flight.js?v=0',
    '../../frame/lib/route_legend.js?v=0', '../../frame/lib/route_alts.js?v=0', '../../frame/lib/fms.js?v=0',
    '../../frame/lib/flight_time.js?v=0', '../../frame/lib/flight_path.js?v=0',
    '../../frame/lib/procedures.js?v=0',
    '../../frame/lib/trail.js?v=0',
    '../../frame/lib/adnames.js?v=0',
    '../../frame/lib/time.js?v=0',
    '../../frame/lib/sheet.js?v=0', '../../frame/lib/geo.js?v=0', '../../frame/lib/icons.js?v=0',
    '../../frame/lib/wind.js?v=0', '../../frame/lib/metar.js?v=0', '../../frame/lib/weather_store.js?v=0',
    '../../frame/lib/pane_model.js?v=0'
  ],
  // gardés au premier usage : le mode Édition et la page de réglage ; MapLibre (1 Mo, inutile sans tuiles) ; le rendu de la coupe
  // météo d'Atmosphère (au premier « Météo ») ; les contours des pays du fond uni viennent d'aerodb (zoneOutlines, le cadre), la
  // copie lib/outlines.js n'existe plus (SOG-0468) : Atmosphère passe aussi par aerodb
  lazy: ['edit.js?v=0', 'find.js?v=0', '../../frame/lib/suggest_list.js?v=0', 'lib/map_edit.js?v=0', 'tune.js?v=0',
    'lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0',
    '../atmosphere/section.js?v=0', '../atmosphere/atmo.js?v=0', '../atmosphere/texts.js?v=0', '../fuel/winds.js?v=0'
  ],
  // hôtes publics appelés directement par MapLibre (tuiles) et par le relief ombré ; CSP connect-src du cadre
  net: ['tiles.openfreemap.org', 'tiles.versatiles.org', 's3.amazonaws.com/elevation-tiles-prod', 'a.tile.opentopomap.org',
    'b.tile.opentopomap.org', 'c.tile.opentopomap.org'
  ] // OpenTopoMap (SOG-0300) : les trois hôtes que tools/csp_policy.py CONNECT permet déjà, la politique effective ne change pas
};
