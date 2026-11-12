(() => {
  'use strict';
  // V3 — « Anciennes pages (V2) » (frame/SPEC.md § 3.1, V3_SPECIFICATION § 7.1 règle 23, SOG-0166) : l'écran du cadre #legacy, la dernière entrée
  // de la colonne de chaque application, qui range les pages de la V2 (apps/…) par groupe. Aucune page de la V2 n'est ailleurs dans la
  // navigation. La liste vient de ce fichier (pas de la configuration) : { id, label [fr, en, de, es], pages: [{ path (relatif à la racine de la
  // suite), label, launcher (la page ne marche qu'avec le lanceur du poste) }] } ; chaque page s'ouvre dans un nouvel onglet.
  const L = (fr, en, de, es) => [fr, en, de, es];
  // les familles de missions du cœur de comptes rendus de la V2 (apps/cr/<FAMILLE>/ : un compte rendu et un rapport des opérations chacune ; FIRE est dans le groupe Missions) : une page par famille et par sorte, ouverte comme les autres (SOG-0278 : toutes les pages de la V2 sont accessibles)
  const FAMILIES = [
    ['AAR', 'aar', 'AAR / ravitaillement en vol'],
    ['AIRBORNE', 'airborne', 'Airborne / airdrop'],
    ['AIRLIFT', 'airlift', 'Airlift / logistics'],
    ['COMBAT', 'combat', 'Combat / ACM'],
    ['COMMAND', 'command', 'Command / AEW / relay'],
    ['FLIGHTINSPECTION', 'fi', 'Flight inspection'],
    ['HADR', 'hadr', 'HADR / evacuation'],
    ['HEMS', 'hems_medevac', 'HEMS / medevac'],
    ['ISR', 'isr', 'ISR / recon'],
    ['LE', 'le', 'Law enforcement'],
    ['MARITIME', 'maritime', 'Maritime'],
    ['SAR', 'sar', 'SAR / PR'],
    ['SOF', 'sof', 'SOF / tactical'],
    ['SPECIAL', 'special', 'Special / test / training'],
    ['SURVEY', 'survey', 'Survey / science']
  ];
  const familyPages = FAMILIES.flatMap(([dir, base, name]) => [{
    path: `apps/cr/${dir}/${base}_cr.html`,
    label: L(`${name} : compte rendu`, `${name}: report`, `${name}: Bericht`, `${name}: informe`)
  }, {
    path: `apps/cr/${dir}/${base}_reporting.html`,
    label: L(`${name} : rapport des opérations`, `${name}: operations reporting`, `${name}: Einsatzbericht`, `${name}: informe de operaciones`)
  }]);
  const GROUPS = Object.freeze([{
    id: 'fuel',
    label: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'),
    pages: [{
      // le moniteur des phases de vol d'après les performances de carburant (le « parser des performances de carburant » de la V2, SOG-0249), gardé tel quel à la racine du dépôt
      path: 'FuelDashboard/index.html',
      label: L('Moniteur des phases de carburant (lecture des performances)', 'Fuel phase monitor (performance reading)',
        'Kraftstoff-Phasenmonitor (Leistungsauswertung)', 'Monitor de fases de combustible (lectura de rendimiento)')
    }, {
      path: 'apps/planner/flight_performance_planner.html',
      label: L('Planificateur de vol et performances', 'Flight and performance planner', 'Flug- und Leistungsplaner',
        'Planificador de vuelo y rendimiento')
    }, {
      path: 'apps/planner/performance_sheets.html',
      label: L('Fiches de performances', 'Performance sheets', 'Leistungsdatenblätter', 'Fichas de rendimiento')
    }]
  }, {
    id: 'missions',
    label: L('Missions', 'Missions', 'Missionen', 'Misiones'),
    pages: [{
      path: 'apps/cpco/mission_registry.html',
      label: L('Registre des missions', 'Mission registry', 'Missionsregister', 'Registro de misiones')
    }, {
      path: 'apps/cpco/mission_editor.html',
      label: L('Éditeur de missions', 'Mission editor', 'Missionseditor', 'Editor de misiones')
    }, {
      path: 'apps/cpco/odv_orders.html',
      label: L('Ordres de vols', 'Flight orders', 'Flugaufträge', 'Órdenes de vuelo')
    }, {
      path: 'apps/cpco/odv_planning.html',
      label: L('Planning des ordres de vols', 'Flight orders planning', 'Planung der Flugaufträge',
        'Planificación de órdenes de vuelo')
    }, {
      path: 'apps/pilot/mes_missions.html',
      label: L('Mes missions', 'My missions', 'Meine Missionen', 'Mis misiones')
    }, {
      path: 'apps/pilot/aujourdhui.html',
      label: L('Aujourd’hui', 'Today', 'Heute', 'Hoy')
    }, {
      path: 'apps/pilot/disponibilites.html',
      label: L('Disponibilités', 'Availability', 'Verfügbarkeit', 'Disponibilidad')
    }, {
      path: 'apps/cr/mission_cr.html',
      label: L('Compte rendu de mission', 'Mission report', 'Missionsbericht', 'Informe de misión')
    }, {
      path: 'apps/cr/mission_operations_reporting.html',
      label: L('Rapport des opérations', 'Operations reporting', 'Einsatzberichterstattung', 'Informe de operaciones')
    }, {
      path: 'apps/cr/FIRE/fire_cr.html',
      label: L('Compte rendu de feu', 'Fire report', 'Brandbericht', 'Informe de incendio')
    }, {
      path: 'apps/cr/FIRE/fire_reporting.html',
      label: L('Rapport des opérations de feu', 'Fire operations reporting', 'Brandeinsatzbericht',
        'Informe de operaciones de incendio')
    }]
  }, {
    id: 'families',
    label: L('Comptes rendus par famille de mission', 'Reports by mission family', 'Berichte nach Missionsfamilie',
      'Informes por familia de misión'),
    pages: familyPages
  }, {
    id: 'maintenance',
    label: L('Maintenance', 'Maintenance', 'Wartung', 'Mantenimiento'),
    pages: [{
      path: 'apps/aide/aide.html',
      label: L('Aide de la V2', 'Help of V2', 'Hilfe der V2', 'Ayuda de la V2')
    }, {
      path: 'apps/settings/maintenance.html',
      launcher: true,
      label: L('Page de maintenance', 'Maintenance page', 'Wartungsseite', 'Página de mantenimiento')
    }, {
      path: 'apps/settings/premier_lancement.html',
      label: L('Premier lancement', 'First launch', 'Erster Start', 'Primer inicio')
    }, {
      path: 'apps/settings/parametrage.html',
      label: L('Paramétrage', 'Setup', 'Einrichtung', 'Parametrización')
    }, {
      path: 'apps/settings/profil.html',
      label: L('Profil', 'Profile', 'Profil', 'Perfil')
    }, {
      path: 'apps/settings/apparence.html',
      label: L('Apparence', 'Appearance', 'Darstellung', 'Apariencia')
    }, {
      path: 'apps/settings/centre.html',
      label: L('Centre', 'Centre', 'Zentrum', 'Centro')
    }, {
      path: 'apps/settings/installation.html',
      label: L('Installation', 'Installation', 'Installation', 'Instalación')
    }, {
      path: 'apps/cr/flotte.html',
      label: L('Flotte', 'Fleet', 'Flotte', 'Flota')
    }, {
      path: 'apps/cr/appareil.html',
      label: L('Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave')
    }, {
      path: 'apps/cr/equipage.html',
      label: L('Équipage', 'Crew', 'Besatzung', 'Tripulación')
    }]
  }, {
    id: 'route',
    label: L('Route', 'Route', 'Route', 'Ruta'),
    pages: [{
      path: 'apps/planner/map_planner.html',
      label: L('Planificateur cartographique', 'Map planner', 'Kartenplaner', 'Planificador cartográfico')
    }, {
      path: 'apps/cpco/map_parser.html',
      label: L('Studio cartographique', 'Map studio', 'Kartenstudio', 'Estudio cartográfico')
    }]
  }, {
    id: 'stats',
    label: L('Statistiques', 'Statistics', 'Statistik', 'Estadísticas'),
    pages: [{
      path: 'apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html',
      label: L('Statistiques d’atterrissage', 'Landing statistics', 'Landestatistik', 'Estadísticas de aterrizaje')
    }, {
      path: 'apps/pilot/mes_vols.html',
      label: L('Statistiques de vol (Mes vols)', 'Flight statistics (My flights)', 'Flugstatistik (Meine Flüge)',
        'Estadísticas de vuelo (Mis vuelos)')
    }]
  }, {
    // l'outil de l'utilisateur (SOG-0083) : positionner les pélicandromes sur une carte et en extraire le YAML ; les comptes rendus de feu
    // sont sous Missions
    id: 'canadair',
    label: L('Canadair et pélicandromes', 'Canadair and pelican sites', 'Canadair und Löschwasserstellen',
      'Canadair y helipuertos de carga'),
    pages: [{
      path: 'apps/outils/pelicandromes/index.html',
      label: L('Positionner les pélicandromes (export YAML)', 'Place the pelican sites (YAML export)',
        'Löschwasserstellen positionieren (YAML-Export)',
        'Posicionar los puntos de carga de agua (exportación YAML)')
    }, {
      path: 'apps/outils/pelicandromes/original.html',
      label: L('Pélicandromes : vérification GPS (version d’origine)', 'Pelican sites: GPS check (original version)',
        'Löschwasserstellen: GPS-Prüfung (Originalversion)', 'Puntos de carga de agua: verificación GPS (versión original)')
    }]
  }]);
  const T = {
    title: L('Anciennes pages (V2)', 'Old pages (V2)', 'Alte Seiten (V2)', 'Páginas antiguas (V2)'),
    intro: L('Ces pages de la version 2 ne font pas partie de la V3 : chacune s’ouvre dans un nouvel onglet.',
      'These version 2 pages are not part of V3: each one opens in a new tab.',
      'Diese Seiten der Version 2 gehören nicht zu V3: jede öffnet sich in einem neuen Tab.',
      'Estas páginas de la versión 2 no forman parte de la V3: cada una se abre en una pestaña nueva.'),
    launcher: L('avec le lanceur du poste', 'with the workstation’s launcher', 'mit dem Starter des Arbeitsplatzes',
      'con el lanzador del puesto')
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
  /** L'écran : les groupes, chacun une carte et ses pages (liens vers la V2, nouvel onglet) ; une page qui ne marche qu'avec le lanceur n'est un lien
   *  que sur un poste qui en a un, sinon une ligne grisée qui le dit. */
  function screen(view, ctx) {
    const li = ['fr', 'en', 'de', 'es'].indexOf(ctx.lang ? ctx.lang() : 'fr'),
      pick = a => a[li < 0 ? 0 : li],
      lau = ctx.launcher?.(),
      hasLauncher = !!lau && !lau.lan;
    view.dataset.screen = 'legacy';
    view.innerHTML = `<h1>${esc(pick(T.title))}</h1><p class="f-muted">${esc(pick(T.intro))}</p>` + GROUPS.map(g => `<div class="f-card" data-group="${esc(g.id)}"><h2>${esc(pick(g.label))}</h2><ul class="f-legacy-list">` +
      g.pages.map(p => p.launcher && !hasLauncher ? `<li class="f-muted" data-legacy-off="${esc(p.path)}">${esc(pick(p.label))} <small>(${esc(pick(T.launcher))})</small></li>` :
        `<li><a href="${esc(new URL(`../${p.path}`, location.href).href)}" target="_blank" rel="noopener noreferrer" data-legacy="${esc(p.path)}">${esc(pick(p.label))}</a></li>`).join('') +
      '</ul></div>').join('');
  }
  window.SogLegacy = Object.freeze({
    GROUPS,
    T,
    screen
  });
  (window.SogScreens ||= {}).legacy = window.SogLegacy;
})();
