(() => {
  'use strict';
  // Mission Report Core — reporting général (apps/cr/mission_operations_reporting.html).
  // Source : registre unique data/cr/missions.yaml (toutes familles, ledger.js).
  // Période partagée (TimePeriod), filtre par famille (couleurs), indicateurs, graphiques
  // par période (jour / semaine / mois / trimestre / année) et répartitions, synthèses par
  // famille / appareil / équipage, tableau des missions (clic = CR en modification).
  const M = window.MissionModel,
    V = window.MissionVocab,
    L = V.L,
    C = window.MissionCharts;
  /** Échappe un texte pour HTML. */
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  /** Nombre d'une valeur ; 0 si invalide. */
  const n = v => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  /** Minutes → « 1h05 ». */
  const duration = v => {
    v = Math.round(v || 0);
    return v >= 60 ? `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}` : `${v} min`;
  };
  /** Minutes → heures « 12,5 h ». */
  const hours = v => {
    const h = (v || 0) / 60;
    return h >= 100 ? `${Math.round(h)} h` : `${h.toFixed(h >= 10 ? 0 : 1).replace('.', ',')} h`;
  };
  /** Langue de la page. */
  const lang = () => window.RepositoryNav?.getLanguage?.() || 'fr';
  /** Rang (0–3) de la langue de la page. */
  const idx = () => Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(lang()));

  // Couleur de chaque famille (graphiques, étiquettes, filtres).
  const COLORS = {
    HEMS: '#ef4444',
    FIRE: '#f97316',
    SAR: '#eab308',
    AIRLIFT: '#3b82f6',
    AAR: '#0f766e',
    MARITIME: '#06b6d4',
    HADR: '#22c55e',
    AIRBORNE: '#84cc16',
    FI: '#a855f7',
    SURVEY: '#14b8a6',
    LE: '#6366f1',
    ISR: '#94a3b8',
    COMMAND: '#0ea5e9',
    COMBAT: '#b45309',
    SOF: '#a8a29e',
    SPECIAL: '#ec4899'
  };
  /** Couleur d'une famille (graphiques, puces). */
  const tint = c => window.RepositoryNav?.chartColor?.(c) ?? c; // couleurs accordées au design (matières)
  const colorOf = id => tint(COLORS[id] || '#67b6ff');
  const OUTCOME_COLORS = {
    SUCCESS: '#22c55e',
    PARTIAL_SUCCESS: '#eab308',
    DIVERTED: '#f59e0b',
    ABORTED: '#ef4444',
    CANCELLED: '#94a3b8',
    NO_CONTACT: '#f97316',
    TARGET_NOT_FOUND: '#f97316',
    WEATHER: '#38bdf8',
    TECHNICAL: '#e879f9',
    OPERATIONAL: '#fb7185',
    OTHER: '#a8a29e'
  };
  const PALETTE = ['#67b6ff', '#bb8cff', '#65d394', '#fbbf24', '#f472b6', '#2dd4bf', '#fb923c', '#a3e635', '#818cf8', '#f87171'];

  const UI = {
    title: L('Reporting missions — CR DEFA', 'Mission reporting — CR DEFA', 'Einsatzauswertung — CR DEFA', 'Informe de misiones — CR DEFA'),
    subtitle: L('Toutes les familles de missions · registre unique data/cr/missions.yaml', 'All mission families · single ledger data/cr/missions.yaml', 'Alle Einsatzfamilien · zentrales Register data/cr/missions.yaml', 'Todas las familias de misiones · registro único data/cr/missions.yaml'),
    newReport: L('Nouveau compte rendu', 'New report', 'Neuer Bericht', 'Nuevo informe'),
    period: L('Période et filtres', 'Period and filters', 'Zeitraum und Filter', 'Periodo y filtros'),
    families: L('Familles', 'Families', 'Familien', 'Familias'),
    all: L('Toutes', 'All', 'Alle', 'Todas'),
    unit: L('Regroupement', 'Grouping', 'Gruppierung', 'Agrupación'),
    metric: L('Mesure', 'Measure', 'Messgröße', 'Medida'),
    auto: L('Automatique', 'Automatic', 'Automatisch', 'Automático'),
    day: L('Jour', 'Day', 'Tag', 'Día'),
    week: L('Semaine', 'Week', 'Woche', 'Semana'),
    month: L('Mois', 'Month', 'Monat', 'Mes'),
    quarter: L('Trimestre', 'Quarter', 'Quartal', 'Trimestre'),
    year: L('Année', 'Year', 'Jahr', 'Año'),
    missions: L('Missions', 'Missions', 'Einsätze', 'Misiones'),
    flight: L('Heures de vol', 'Flight hours', 'Flugstunden', 'Horas de vuelo'),
    block: L('Heures bloc', 'Block hours', 'Blockstunden', 'Horas calzo a calzo'),
    station: L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona'),
    missionTime: L('Heures de mission', 'Mission hours', 'Missionsstunden', 'Horas de misión'),
    sorties: L('Sorties', 'Sorties', 'Einsätze (Flüge)', 'Salidas'),
    distance: L('Distance (NM)', 'Distance (NM)', 'Entfernung (NM)', 'Distancia (NM)'),
    success: L('Réussite', 'Success rate', 'Erfolgsquote', 'Tasa de éxito'),
    fuel: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'),
    people: L('Personnes / fret', 'People / cargo', 'Personen / Fracht', 'Personas / carga'),
    night: L('Vols de nuit / crépuscule', 'Night / twilight flights', 'Nacht- / Dämmerungsflüge', 'Vuelos nocturnos / crepúsculo'),
    online: L('En réseau', 'Online', 'Online', 'En red'),
    real: L('Opérations réelles', 'Real operations', 'Reale Einsätze', 'Operaciones reales'),
    fleet: L('Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves'),
    crew: L('Équipage', 'Crew', 'Besatzung', 'Tripulación'),
    average: L('moyenne', 'average', 'Durchschnitt', 'media'),
    exercise: L('exercice', 'exercise', 'Übung', 'ejercicio'),
    activity: L('Activité par période', 'Activity by period', 'Aktivität nach Zeitraum', 'Actividad por periodo'),
    byFamily: L('Répartition par famille', 'By family', 'Nach Familie', 'Por familia'),
    byOutcome: L('Résultats', 'Outcomes', 'Ergebnisse', 'Resultados'),
    byType: L('Types d’appareil', 'Aircraft types', 'Luftfahrzeugmuster', 'Tipos de aeronave'),
    byCapability: L('Capacités employées', 'Capabilities used', 'Eingesetzte Fähigkeiten', 'Capacidades empleadas'),
    byDayNight: L('Jour / nuit', 'Day / night', 'Tag / Nacht', 'Día / noche'),
    byNetwork: L('Réseau', 'Network', 'Netzwerk', 'Red'),
    byAerodrome: L('Terrains de départ', 'Departure aerodromes', 'Startflugplätze', 'Aeródromos de salida'),
    bySeries: L('Séries (types de mission)', 'Series (mission types)', 'Serien (Einsatzarten)', 'Series (tipos de misión)'),
    byContext: L('Exercice / opération réelle', 'Exercise / real operation', 'Übung / realer Einsatz', 'Ejercicio / operación real'),
    familyTable: L('Synthèse par famille', 'Summary by family', 'Übersicht nach Familie', 'Resumen por familia'),
    aircraftTable: L('Synthèse par appareil', 'Summary by aircraft', 'Übersicht nach Luftfahrzeug', 'Resumen por aeronave'),
    crewTable: L('Synthèse par membre d’équipage', 'Summary by crew member', 'Übersicht nach Besatzungsmitglied', 'Resumen por tripulante'),
    missionsTable: L('Missions (tri, clic pour modifier, suppression)', 'Missions (sort, click to edit, delete)', 'Einsätze (sortieren, zum Bearbeiten klicken, löschen)', 'Misiones (ordenar, clic para modificar, eliminar)'),
    ledger: L('Registre des missions', 'Mission ledger', 'Einsatzregister', 'Registro de misiones'),
    exportYaml: L('Exporter le registre (YAML)', 'Export ledger (YAML)', 'Register exportieren (YAML)', 'Exportar registro (YAML)'),
    exportCsv: L('Exporter en CSV (tableur)', 'Export CSV (spreadsheet)', 'CSV exportieren (Tabelle)', 'Exportar CSV (hoja de cálculo)'),
    folder: L('Dossier du registre…', 'Ledger folder…', 'Registerordner…', 'Carpeta del registro…'),
    print: L('PDF / Imprimer', 'PDF / Print', 'PDF / Drucken', 'PDF / Imprimir'),
    legacy: L('Importer un ancien registre CSV', 'Import a legacy CSV ledger', 'Altes CSV-Register importieren', 'Importar un registro CSV antiguo'),
    legacyDone: L('missions importées ; déjà présentes :', 'missions imported; already present:', 'Einsätze importiert; bereits vorhanden:', 'misiones importadas; ya presentes:'),
    saved: L('Registre enregistré', 'Ledger saved', 'Register gespeichert', 'Registro guardado'),
    browserOnly: L('navigateur uniquement', 'browser only', 'nur Browser', 'solo navegador'),
    folderLabel: L('Dossier', 'Folder', 'Ordner', 'Carpeta'),
    unavailable: L('registre illisible (serveur ou fichier indisponible) — rechargez la page.', 'ledger unreadable (server or file unavailable) — reload the page.', 'Register nicht lesbar (Server oder Datei nicht verfügbar) — Seite neu laden.', 'registro ilegible (servidor o archivo no disponible) — recargue la página.'),
    empty: L('Aucune mission pour la période et les familles sélectionnées.', 'No mission for the selected period and families.', 'Kein Einsatz für den gewählten Zeitraum und die gewählten Familien.', 'Ninguna misión para el periodo y las familias seleccionados.'),
    none: L('Non renseigné', 'Not provided', 'Nicht angegeben', 'No indicado'),
    offline: L('Hors réseau', 'Offline', 'Offline', 'Fuera de red'),
    confirmDelete: L('Supprimer définitivement cette mission du registre ?', 'Permanently delete this mission from the ledger?', 'Diesen Einsatz endgültig aus dem Register löschen?', '¿Eliminar definitivamente esta misión del registro?'),
    rowTitle: L('Cliquer pour modifier la mission', 'Click to edit the mission', 'Klicken, um den Einsatz zu bearbeiten', 'Clic para modificar la misión'),
    // Colonnes
    colFamily: L('Famille', 'Family', 'Familie', 'Familia'),
    colId: L('N° mission', 'Mission ID', 'Einsatz-ID', 'ID de misión'),
    colDate: L('Date', 'Date', 'Datum', 'Fecha'),
    colSeries: L('Série', 'Series', 'Serie', 'Serie'),
    colType: L('Type', 'Type', 'Muster', 'Tipo'),
    colReg: L('Immat.', 'Reg.', 'Kennz.', 'Matr.'),
    colCallsign: L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'),
    colRoute: L('Départ → arrivée', 'Departure → arrival', 'Abflug → Ankunft', 'Salida → llegada'),
    colOutcome: L('Résultat', 'Outcome', 'Ergebnis', 'Resultado'),
    colFlight: L('Vol', 'Flight', 'Flug', 'Vuelo'),
    colBlock: L('Bloc', 'Block', 'Block', 'Calzo'),
    colStation: L('Sur zone', 'On station', 'Im Einsatz', 'En zona'),
    colDayNight: L('J / N', 'D / N', 'T / N', 'D / N'),
    colTrace: L('Trace', 'Track', 'Spur', 'Traza'),
    colMissions: L('Missions', 'Missions', 'Einsätze', 'Misiones'),
    colSuccess: L('Réussite (%)', 'Success (%)', 'Erfolg (%)', 'Éxito (%)'),
    colFlightAvg: L('Vol moyen', 'Average flight', 'Mittlerer Flug', 'Vuelo medio'),
    colSpecific: L('Indicateurs de la famille', 'Family indicators', 'Familienkennzahlen', 'Indicadores de la familia'),
    colLast: L('Dernière mission', 'Last mission', 'Letzter Einsatz', 'Última misión'),
    colName: L('Nom', 'Name', 'Name', 'Nombre'),
    colRoles: L('Fonctions', 'Roles', 'Funktionen', 'Funciones'),
    colReporting: L('Reporting', 'Reporting', 'Auswertung', 'Informe'),
    openFamily: L('Cliquer pour ouvrir le reporting de la famille', 'Click to open the family reporting', 'Klicken, um die Familienauswertung zu öffnen', 'Clic para abrir el informe de la familia'),
    openAircraft: L('Cliquer pour ouvrir la fiche de l’appareil', 'Click to open the aircraft sheet', 'Klicken, um das Luftfahrzeugblatt zu öffnen', 'Clic para abrir la ficha de la aeronave'),
    openCrew: L('Cliquer pour ouvrir la fiche du membre d’équipage', 'Click to open the crew member sheet', 'Klicken, um das Besatzungsblatt zu öffnen', 'Clic para abrir la ficha del tripulante'),
    before: L('avant la période', 'before the period', 'vor dem Zeitraum', 'antes del periodo'),
    after: L('après la période', 'after the period', 'nach dem Zeitraum', 'después del periodo'),
    checks: L('Contrôle des données', 'Data checks', 'Datenprüfung', 'Control de datos'),
    checksSub: L('missions à corriger (clic pour ouvrir le CR)', 'missions to correct (click to open the report)', 'zu korrigierende Einsätze (Klick öffnet den Bericht)', 'misiones por corregir (clic para abrir el informe)'),
    colIssues: L('Anomalies', 'Issues', 'Auffälligkeiten', 'Anomalías')
  };
  const METRICS = [{
    id: 'missions',
    label: UI.missions,
    value: () => 1,
    format: v => String(Math.round(v))
  }, {
    id: 'flight',
    label: UI.flight,
    value: (m, s) => s.flightMinutes,
    format: hours,
    duration: true
  }, {
    id: 'block',
    label: UI.block,
    value: (m, s) => s.blockMinutes,
    format: hours,
    duration: true
  }, {
    id: 'station',
    label: UI.station,
    value: (m, s) => s.timeOnStationMinutes,
    format: hours,
    duration: true
  }, {
    id: 'missionTime',
    label: UI.missionTime,
    value: (m, s) => s.missionMinutes,
    format: hours,
    duration: true
  }, {
    id: 'sorties',
    label: UI.sorties,
    value: m => window.MissionStats.sorties(m),
    format: v => String(Math.round(v))
  }, {
    id: 'distance',
    label: UI.distance,
    value: m => n(m.navigation?.distanceNm),
    format: v => String(Math.round(v))
  }];
  const UNITS = ['auto', 'day', 'week', 'month', 'quarter', 'year'];
  const PREFS = 'missionGlobalReporting:v1';
  /** Préférences du reporting général : familles masquées, unité de période, indicateur (missions par défaut). */
  const readPrefs = () => {
    try {
      return {
        hidden: [],
        unit: 'auto',
        metric: 'missions',
        ...JSON.parse(localStorage.getItem(PREFS) || '{}')
      };
    } catch {
      return {
        hidden: [],
        unit: 'auto',
        metric: 'missions'
      };
    }
  };
  /** Mémorise les préférences du reporting général. */
  const writePrefs = p => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(p));
    } catch {
      /* stockage indisponible */
    }
  };

  /** Reporting général (toutes familles) : période, puces de familles, cartes, graphiques d'activité, répartitions, tableau des missions (modifiable dans le tableau), source (registre ou journal DEFA), reprise des anciens registres. */
  function mount(root) {
    const rows = new Map(),
      tr = row => {
        rows.set(row[0], row);
        return row[idx()] || row[0];
      };
    // Texte de la page en français (clé de traduction) ; les textes composés sont produits
    // directement dans la langue courante.
    const t = key => {
      const row = UI[key];
      rows.set(row[0], row);
      return row[0];
    };
    /** Libellé d'une valeur de liste. */
    const opt = (list, value) => {
      const o = list.find(x => x.value === value);
      return o ? tr(o.label) : value;
    };
    /** Définition d'une famille enregistrée ; null sinon. */
    const familyInfo = id => window.MissionCore.families.get(id) || null;
    /** Nom d'une famille dans la langue de la page. */
    const familyName = id => {
      const f = familyInfo(id),
        vocab = V.families.find(x => x.id === id);
      return f?.title ? tr(f.title) : vocab?.labels ? vocab.labels[Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'))] || vocab.label : vocab?.label || id;
    };
    /** Nom court d'une famille (puces, tableau). */
    const familyShort = id => id === 'FI' ? 'FI' : id;
    /** Pages de CR et de reporting d'une famille. */
    const pagesOf = id => {
      const f = familyInfo(id),
        vocab = V.families.find(x => x.id === id);
      return {
        cr: f?.pages?.cr && vocab ? vocab.cr.replace(/[^/]+$/, f.pages.cr) : vocab?.cr || '',
        reporting: f?.pages?.reporting && vocab ? vocab.reporting.replace(/[^/]+$/, f.pages.reporting) : vocab?.reporting || ''
      };
    };
    /** Pastille colorée d'une famille (nom complet en infobulle). */
    const tag = id => `<span class="mcg-tag" style="--c:${colorOf(id)}" title="${esc(familyName(id))}">${esc(familyShort(id))}</span>`;
    const prefs = readPrefs();
    /** Clé d'immatriculation. */
    const A = reg => String(reg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    // ---- en-tête de page
    document.title = UI.title[0];
    // Période (composant TimePeriod : préréglages, dates, ◀ zoom − ▶) et filtres dans l'en-tête
    // collé en haut de page ; le titre, la langue et le menu ☰ (repository_nav) restent en place.
    const header = document.querySelector('header');
    const bar = document.createElement('div');
    bar.className = 'mcg-header-tools';
    bar.innerHTML = `<div class="mcg-header-row"><a class="mcg-new mc-button primary" data-icon="plus" href="mission_cr.html"><span>${t('newReport')}</span></a><div id="periodPicker"></div></div>
      <div class="mcg-header-row"><div class="mcg-chips"><span class="mcg-label">${t('families')}</span><div class="mcg-chip-list"></div></div>
        <label class="mcg-inline">${t('unit')}<select data-pref="unit">${UNITS.map(u => `<option value="${u}">${t(u)}</option>`).join('')}</select></label>
        <label class="mcg-inline">${t('metric')}<select data-pref="metric">${METRICS.map(m => `<option value="${m.id}">${esc(m.label[0])}</option>`).join('')}</select></label></div>`;
    (header || root.parentElement).append(bar);

    root.innerHTML = `
      <section class="cards mcg-cards" id="mcgCards"></section>
      <section class="section mcg-wide mcg-checks" data-icon="alert" hidden><h2>${t('checks')} <span class="mcg-sub" id="mcgChecksSub"></span></h2><div class="inside" id="mcgChecks"></div></section>
      <section class="section mcg-wide" data-icon="calendar" data-deco-bg="activity"><h2>${t('activity')} <span class="mcg-sub" id="mcgActivitySub"></span></h2><div class="inside"><div id="mcgActivity"></div><div class="mcg-series-legend" id="mcgActivityLegend"></div></div></section>
      <div class="mcg-grid">
        <section class="section" data-icon="layers" data-deco-bg="families"><h2>${t('byFamily')}</h2><div class="inside" id="mcgFamilies"></div></section>
        <section class="section" data-icon="check" data-deco-bg="outcomes"><h2>${t('byOutcome')}</h2><div class="inside" id="mcgOutcomes"></div></section>
        <section class="section" data-icon="hash" data-deco-bg="series"><h2>${t('bySeries')}</h2><div class="inside" id="mcgSeries"></div></section>
        <section class="section" data-icon="box" data-deco-bg="aircraft"><h2>${t('byType')}</h2><div class="inside" id="mcgTypes"></div></section>
        <section class="section" data-icon="wrench" data-deco-bg="capabilities"><h2>${t('byCapability')}</h2><div class="inside" id="mcgCapabilities"></div></section>
        <section class="section" data-icon="pin" data-deco-bg="aerodromes"><h2>${t('byAerodrome')}</h2><div class="inside" id="mcgAerodromes"></div></section>
        <section class="section" data-icon="clock" data-deco-bg="daynight"><h2>${t('byDayNight')}</h2><div class="inside" id="mcgDayNight"></div></section>
        <section class="section" data-icon="send" data-deco-bg="network"><h2>${t('byNetwork')}</h2><div class="inside" id="mcgNetwork"></div></section>
        <section class="section" data-icon="globe" data-deco-bg="context"><h2>${t('byContext')}</h2><div class="inside" id="mcgContext"></div></section>
      </div>
      <section class="section mcg-wide" data-icon="layers"><h2>${t('familyTable')}</h2><div class="inside" id="mcgFamilyTable"></div></section>
      <section class="section mcg-wide" data-icon="plane"><h2>${t('aircraftTable')}</h2><div class="inside" id="mcgAircraftTable"></div></section>
      <section class="section mcg-wide" data-icon="users"><h2>${t('crewTable')}</h2><div class="inside" id="mcgCrewTable"></div></section>
      <section class="section mcg-wide" data-icon="list"><h2>${t('missionsTable')}<button type="button" class="ge-toggle" data-grid-edit></button></h2><div class="inside"><div id="mcgMissions"></div><div id="mcgEdges" hidden></div></div></section>
      <section class="panel mcg-ledger" data-icon="database"><h2>${t('ledger')}</h2><div class="row">
        <button type="button" data-action="yaml" data-icon="download">${t('exportYaml')}</button><button type="button" data-action="csv" data-icon="download">${t('exportCsv')}</button>
        <button type="button" data-action="folder" data-icon="folder">${t('folder')}</button><button type="button" data-action="print" data-icon="printer">${t('print')}</button>
        <label class="mcg-legacy">${t('legacy')}<select data-legacy><option value=""></option></select></label><input type="file" accept=".csv,text/csv" hidden></div>
        <p class="note mcg-ledger-info"></p><p class="note mcg-status"></p></section>`;
    const $ = sel => root.querySelector(sel) || bar.querySelector(sel),
      status = $('.mcg-status');
    $('[data-pref="unit"]').value = UNITS.includes(prefs.unit) ? prefs.unit : 'auto';
    $('[data-pref="metric"]').value = METRICS.some(m => m.id === prefs.metric) ? prefs.metric : 'missions';
    bar.querySelectorAll('[data-pref]').forEach(select => select.onchange = () => {
      prefs[select.dataset.pref] = select.value;
      writePrefs(prefs);
      render();
    });

    // ---- données
    const L2 = window.MissionLedger;
    // Modification dans le tableau (MissionGridEdit) : même registre pour tous les reportings.
    const GE = {
      toggle: L('✎ Modifier dans le tableau', '✎ Edit in the table', '✎ In der Tabelle bearbeiten', '✎ Modificar en la tabla'),
      done: L('✓ Terminer', '✓ Done', '✓ Fertig', '✓ Terminar'),
      saved: L('Mission modifiée et enregistrée', 'Mission changed and saved', 'Einsatz geändert und gespeichert', 'Misión modificada y guardada'),
      declared: L('durée déclarée (sans heures)', 'declared duration (no times)', 'angegebene Dauer (ohne Uhrzeiten)', 'duración declarada (sin horas)'),
      error: L('Valeur refusée', 'Value rejected', 'Wert abgelehnt', 'Valor rechazado')
    };
    let editMode = false,
      uidSeq = 0;
    const byUid = new Map();
    /** Cellule du tableau : champ éditable en mode « modifier dans le tableau », sinon texte. */
    const editable = (field, r, fallback) => {
      if (!editMode) return fallback;
      const html = window.MissionGridEdit?.input(field, r.mission, r.uid, {
        series: familyInfo(r.family)?.series || [],
        outcomes: V.outcomes,
        label: o => tr(o.label)
      });
      return html ?? fallback;
    };
    /** Ligne du tableau d'une mission : famille, statistiques, résultat, anomalies. */
    const toRow = (mission, index) => {
      const s = M.computeStatistics(mission),
        a = mission.aircraft?.[0] || {},
        uid = ++uidSeq;
      const row = {
        uid,
        mission,
        s,
        index,
        family: mission.family || '',
        missionId: mission.metadata?.missionId || '',
        date: mission.metadata?.date || '',
        series: mission.series || '',
        type: a.type || '',
        registration: a.registration || '',
        callsign: a.callsign || '',
        dep: mission.navigation?.dep || a.baseDeparture || '',
        arr: mission.navigation?.arr || a.baseReturn || '',
        outcome: mission.results?.outcome || '',
        flight: s.flightMinutes,
        block: s.blockMinutes,
        station: s.timeOnStationMinutes,
        dayNight: mission.environment?.dayNight || '',
        network: mission.network || {}
      };
      byUid.set(uid, row);
      return row;
    };
    // Position de la mission dans sa famille (adresse de modification du CR).
    // Données des reportings : registre des missions (défaut) ou journal DEFA (vols réalisés,
    // chargé dans Paramétrage › Base DEFA ; lecture seule). Choix commun à tous les reportings.
    const SRC = {
      label: L('Données', 'Data', 'Daten', 'Datos'),
      ledger: L('Mes missions (registre)', 'My missions (ledger)', 'Meine Einsätze (Register)', 'Mis misiones (registro)'),
      defa: L('Journal DEFA (vols réalisés)', 'DEFA log (flights flown)', 'DEFA-Journal (durchgeführte Flüge)', 'Diario DEFA (vuelos realizados)'),
      readOnly: L('Vol du journal DEFA : lecture seule (pas de CR à modifier).', 'DEFA log flight: read-only (no report to edit).', 'Flug aus dem DEFA-Journal: nur lesbar.', 'Vuelo del diario DEFA: solo lectura.')
    };
    let logMissions = null;
    /** Vrai si le reporting lit le journal DEFA. */
    const logSource = () => window.DefaFlightLog?.source?.() === 'defa';
    /** Missions du journal DEFA (converties une fois), ou null si la source est le registre. */
    const sourceMissions = () => logSource() ? (logMissions ||= window.DefaFlightLog.toMissions()) : null;
    window.addEventListener('defa-log-change', () => {
      logMissions = null;
    });
    // Menu « Données » toujours visible : registre, journal DEFA (s'il est chargé) et chargement /
    // mise à jour du journal (page DEFA copiée ou enregistrée) sans passer par le Paramétrage.
    const SRC_LOAD = L('Charger / mettre à jour le journal DEFA…', 'Load / update the DEFA log…', 'DEFA-Journal laden / aktualisieren…', 'Cargar / actualizar el diario DEFA…');

    /** Choix de la source (registre / journal DEFA) et chargement du journal. */
    function sourcePicker(host) {
      if (!host || !window.DefaFlightLog) return;
      const label = document.createElement('label');
      label.className = 'mc-source';
      const paint = () => {
        const n = window.DefaFlightLog.records().length,
          dates = n ? window.DefaFlightLog.records().map(r => r.date).sort() : [];
        label.innerHTML = `<span>${esc(tr(SRC.label))}</span><select><option value="ledger">${esc(tr(SRC.ledger))}</option>${n ? `<option value="defa">${esc(tr(SRC.defa))} — ${n} (${esc(dates[0])} → ${esc(dates[n - 1])})</option>` : ''}<option value="load">${esc(tr(SRC_LOAD))}</option></select>`;
        const select = label.querySelector('select');
        select.value = logSource() ? 'defa' : 'ledger';
        select.onchange = () => {
          if (select.value === 'load') {
            select.value = logSource() ? 'defa' : 'ledger';
            window.DefaFlightLog.loaderDialog({
              onLoaded: () => {
                logMissions = null;
                window.DefaFlightLog.setSource('defa');
                paint();
              }
            });
            return;
          }
          window.DefaFlightLog.setSource(select.value);
        };
      };
      paint();
      window.addEventListener('mission-source-change', () => {
        paint();
        render();
      });
      window.addEventListener('defa-log-change', () => {
        logMissions = null;
        paint();
      });
      host.append(label);
    }
    /** Lignes de toutes les missions de la source (journal DEFA ou registre), avec leur rang dans leur famille. */
    const allRows = () => {
      const seen = {};
      return (sourceMissions() || L2.store.missions).map(m => toRow(m, (seen[m.family] = (seen[m.family] ?? -1) + 1)));
    };
    sourcePicker(bar.querySelector('.mcg-header-row'));

    // ---- filtres par famille (puces colorées, état mémorisé)
    /** Puces de filtre par famille (couleur, nombre de missions), état mémorisé. */
    function chips(all) {
      const counts = {};
      all.forEach(r => {
        counts[r.family] = (counts[r.family] || 0) + 1;
      });
      const ids = [...new Set(V.families.map(f => f.id).concat(Object.keys(counts)))].filter(id => counts[id]);
      const host = $('.mcg-chip-list'),
        hidden = new Set(prefs.hidden);
      host.innerHTML = `<button type="button" class="mcg-chip mcg-all" data-all>${t('all')}</button>` + ids.map(id => `<button type="button" class="mcg-chip${hidden.has(id) ? ' off' : ''}" data-family="${esc(id)}" style="--c:${colorOf(id)}" title="${esc(familyName(id))}"><i></i>${esc(familyShort(id))} <em>${counts[id]}</em></button>`).join('');
      host.querySelector('[data-all]').onclick = () => {
        prefs.hidden = prefs.hidden.length ? [] : ids.slice();
        writePrefs(prefs);
        render();
      };
      host.querySelectorAll('[data-family]').forEach(b => b.onclick = event => {
        const id = b.dataset.family;
        // Ctrl / ⌘ + clic : cette famille seule.
        if (event.ctrlKey || event.metaKey) prefs.hidden = ids.filter(x => x !== id);
        else prefs.hidden = hidden.has(id) ? prefs.hidden.filter(x => x !== id) : prefs.hidden.concat(id);
        writePrefs(prefs);
        render();
      });
    }

    // ---- rendu
    let missionsTable = null;
    const tables = {};
    /** Tableau triable (SortedTable) créé une fois, puis mis à jour. */
    const table = (id, rowsList, columns, sortKey, dir = -1, onRowClick = null, rowTitle = '') => {
      if (tables[id]) tables[id].setRows(rowsList);
      else tables[id] = window.SortedTable.render($(`#${id}`), {
        rows: rowsList,
        columns,
        defaultSortKey: sortKey,
        defaultDir: dir,
        emptyText: tr(UI.empty),
        onRowClick,
        rowTitle
      });
    };

    /** Rendu pour la période et les familles choisies : cartes, graphiques, répartitions, classements, tableau. */
    function render() {
      const all = allRows();
      chips(all);
      const dates = all.filter(r => !new Set(prefs.hidden).has(r.family)).map(r => r.date).filter(Boolean).sort();
      const hidden = new Set(prefs.hidden);
      const visible = window.TimePeriod.filterRows(all, 'date').filter(r => !hidden.has(r.family));
      const missions = visible.map(r => r.mission),
        metric = METRICS.find(m => m.id === prefs.metric) || METRICS[0];
      const familyIds = [...new Set(visible.map(r => r.family))].sort((a, b) => V.families.findIndex(f => f.id === a) - V.families.findIndex(f => f.id === b));
      /** Valeur de l'indicateur choisi (missions, heures de vol, bloc, sur zone…) pour une ligne. */
      const metricOf = r => n(metric.value(r.mission, r.s));
      const emptyText = tr(UI.empty);

      // Indicateurs
      const c = window.MissionStats.common(missions);
      const night = visible.filter(r => r.dayNight === 'NIGHT' || r.dayNight === 'TWILIGHT').length;
      const online = visible.filter(r => r.network.onlineNetwork).length,
        ivao = visible.filter(r => r.network.onlineNetwork === 'IVAO').length;
      const real = visible.filter(r => r.mission.metadata?.context === 'REAL').length;
      const regs = new Set(visible.map(r => A(r.registration)).filter(Boolean)),
        crew = new Set(missions.flatMap(m => (m.crew || []).map(x => String(x.name || '').trim().toUpperCase()).filter(Boolean)));
      // Moyenne sur les missions renseignées (pas de 0 pour les missions sans heure sur zone…).
      const avg = (total, k) => {
        const count = visible.filter(r => r.s[k] != null).length;
        return count ? `${tr(UI.average)} ${duration(total / count)}` : '';
      };
      /** Carte de synthèse (libellé, valeur, sous-titre, couleur). */
      const card = (key, value, sub = '', color = '') => `<div class="card"${color ? ` style="--c:${tint(color)}"` : ''}><div class="label">${esc(tr(UI[key]))}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`;
      $('#mcgCards').innerHTML = [
        card('missions', c.missions, familyIds.map(familyShort).join(' · '), '#67b6ff'),
        card('success', c.missions ? `${Math.round(c.success * 100 / c.missions)} %` : '—', `${c.success} / ${c.missions}`, '#22c55e'),
        card('flight', hours(c.flightMinutes), avg(c.flightMinutes, 'flightMinutes'), '#bb8cff'),
        c.blockMinutes ? card('block', hours(c.blockMinutes), avg(c.blockMinutes, 'blockMinutes'), '#a78bfa') : '',
        c.timeOnStationMinutes ? card('station', hours(c.timeOnStationMinutes), avg(c.timeOnStationMinutes, 'timeOnStationMinutes'), '#f472b6') : '',
        c.sorties > c.missions ? card('sorties', c.sorties, '', '#2dd4bf') : '',
        c.distanceNm ? card('distance', Math.round(c.distanceNm).toLocaleString(), '', '#38bdf8') : '',
        ...Object.entries(c.fuel).filter(([, v]) => v).map(([u, v]) => card('fuel', `${Math.round(v).toLocaleString()} ${u}`, '', '#fbbf24')),
        c.personnel || c.cargoKg ? card('people', `${c.personnel} · ${Math.round(c.cargoKg).toLocaleString()} kg`, '', '#fb923c') : '',
        card('night', night, missions.length ? `${Math.round(night * 100 / missions.length)} %` : '', '#818cf8'),
        card('online', online, `IVAO ${ivao} · VATSIM ${online - ivao}`, '#65d394'),
        card('real', real, `${missions.length - real} ${tr(UI.exercise)}`, '#f87171'),
        card('fleet', regs.size, [...new Set(visible.map(r => r.type).filter(Boolean))].length + ' types', '#94a3b8'),
        card('crew', crew.size, '', '#a8a29e')
      ].join('');

      // Activité par période (barres empilées par famille)
      const range = window.TimePeriod.range();
      const b = C.buckets(visible.map(r => r.date), {
        start: range.start || '',
        end: range.end || '',
        unit: prefs.unit,
        lang: lang()
      });
      const grid = {};
      visible.forEach(r => {
        if (!r.date) return;
        const k = b.keyOf(r.date);
        (grid[k] ||= {})[r.family] = (grid[k]?.[r.family] || 0) + metricOf(r);
      });
      periodCtrl?.setBounds(dates[0] || null, dates[dates.length - 1] || null);
      $('#mcgActivity').innerHTML = C.stackedBars({
        buckets: b.list,
        series: familyIds.map(id => ({
          id,
          label: familyShort(id),
          color: colorOf(id)
        })),
        value: (k, id) => grid[k]?.[id] || 0,
        format: metric.format,
        empty: emptyText
      });
      C.enableZoom($('#mcgActivity'));
      $('#mcgActivitySub').textContent = `${tr(metric.label)} · ${tr(UI[b.unit] || UI.month)}`;
      $('#mcgActivityLegend').innerHTML = familyIds.map(id => `<span><i style="background:${colorOf(id)}"></i>${esc(familyName(id))}</span>`).join('');

      // Répartitions
      /** Totaux de l'indicateur par clé (répartitions). */
      const sumBy = (list, keyFn, colorFn = () => '') => {
        const acc = new Map();
        list.forEach(r => [].concat(keyFn(r)).forEach(k => {
          if (k == null) return;
          const e = acc.get(k) || {
            value: 0,
            color: colorFn(r, k)
          };
          e.value += metricOf(r);
          acc.set(k, e);
        }));
        return acc;
      };
      /** Éléments d'un graphique (libellé, valeur, couleur) à partir de totaux. */
      const items = (map, labelFn = k => k, colorFn) => [...map].map(([k, e], i) => ({
        label: labelFn(k),
        value: e.value,
        color: colorFn ? colorFn(k, i) : e.color || PALETTE[i % PALETTE.length]
      }));
      const fmt = metric.format;
      $('#mcgFamilies').innerHTML = C.donut(items(sumBy(visible, r => r.family), familyName, k => colorOf(k)), {
        format: fmt,
        empty: emptyText
      });
      $('#mcgOutcomes').innerHTML = C.hbars(items(sumBy(visible, r => r.outcome || '__none'), k => k === '__none' ? tr(UI.none) : opt(V.outcomes, k), k => OUTCOME_COLORS[k] || '#64748b'), {
        format: fmt,
        empty: emptyText
      });
      $('#mcgSeries').innerHTML = C.hbars(items(sumBy(visible, r => `${r.family}|${r.series}`), k => {
        const [fam, s] = k.split('|'), f = familyInfo(fam), o = (f?.series || []).find(x => x.value === s);
        return `${familyShort(fam)} · ${o ? tr(o.label) : s || tr(UI.none)}`;
      }, k => colorOf(k.split('|')[0])), {
        format: fmt,
        empty: emptyText
      });
      $('#mcgTypes').innerHTML = C.hbars(items(sumBy(visible, r => r.type || tr(UI.none))), {
        format: fmt,
        empty: emptyText
      });
      $('#mcgCapabilities').innerHTML = C.hbars(items(sumBy(visible, r => r.mission.capabilities || [])), {
        format: fmt,
        empty: emptyText
      });
      $('#mcgAerodromes').innerHTML = C.hbars(items(sumBy(visible, r => r.dep || null)), {
        format: fmt,
        empty: emptyText
      });
      const DN = {
        DAY: '#fbbf24',
        TWILIGHT: '#f97316',
        NIGHT: '#6366f1',
        '': '#475569'
      };
      $('#mcgDayNight').innerHTML = C.donut(items(sumBy(visible, r => r.dayNight), k => k ? opt(V.dayNight, k) : tr(UI.none), k => DN[k] || '#475569'), {
        format: fmt,
        empty: emptyText
      });
      const NET = {
        IVAO: '#0ea5e9',
        VATSIM: '#22c55e',
        '': '#475569'
      };
      $('#mcgNetwork').innerHTML = C.donut(items(sumBy(visible, r => r.network.onlineNetwork || ''), k => k || tr(UI.offline), k => NET[k] || '#475569'), {
        format: fmt,
        empty: emptyText
      });
      const CTX = {
        REAL: '#ef4444',
        EXERCISE: '#67b6ff',
        '': '#475569'
      };
      $('#mcgContext').innerHTML = C.donut(items(sumBy(visible, r => r.mission.metadata?.context || ''), k => k ? opt(V.context, k) : tr(UI.none), k => CTX[k] || '#475569'), {
        format: fmt,
        empty: emptyText
      });

      // Synthèse par famille (statistiques communes + indicateurs propres à la famille)
      const byFamily = familyIds.map(id => {
        const list = visible.filter(r => r.family === id),
          ms = list.map(r => r.mission),
          cc = window.MissionStats.common(ms),
          f = familyInfo(id);
        const specific = (f?.stats || []).map(def => {
          const v = def.value(ms);
          return v ? `${tr(def.label)} ${typeof v === 'number' ? Math.round(v).toLocaleString() : v}` : '';
        }).filter(Boolean).join(' · ');
        return {
          family: id,
          name: familyName(id),
          missions: cc.missions,
          sorties: cc.sorties,
          success: Math.round(cc.success * 100 / cc.missions),
          flight: cc.flightMinutes,
          flightAvg: cc.flightMinutes / cc.missions,
          block: cc.blockMinutes,
          station: cc.timeOnStationMinutes,
          distance: Math.round(cc.distanceNm),
          fuel: Object.entries(cc.fuel).map(([u, v]) => `${Math.round(v)} ${u}`).join(' + '),
          specific,
          reporting: pagesOf(id).reporting
        };
      });
      table('mcgFamilyTable', byFamily, [{
        key: 'family',
        label: t('colFamily'),
        html: (v, r) => `${tag(v)} ${esc(r.name)}`
      }, {
        key: 'missions',
        label: t('colMissions'),
        type: 'number'
      }, {
        key: 'sorties',
        label: t('sorties'),
        type: 'number'
      }, {
        key: 'success',
        label: t('colSuccess'),
        type: 'number'
      }, {
        key: 'flight',
        label: t('flight'),
        type: 'number',
        format: duration
      }, {
        key: 'flightAvg',
        label: t('colFlightAvg'),
        type: 'number',
        format: duration
      }, {
        key: 'block',
        label: t('block'),
        type: 'number',
        format: v => v ? duration(v) : '—'
      }, {
        key: 'station',
        label: t('station'),
        type: 'number',
        format: v => v ? duration(v) : '—'
      }, {
        key: 'distance',
        label: t('distance'),
        type: 'number',
        format: v => v || '—'
      }, {
        key: 'fuel',
        label: t('fuel'),
        format: v => v || '—'
      }, {
        key: 'specific',
        label: t('colSpecific'),
        format: v => v || '—'
      }, {
        key: 'reporting',
        label: t('colReporting'),
        html: v => v ? `<a href="${esc(v)}">↗</a>` : ''
      }], 'missions', -1, r => {
        if (r.reporting) location.href = r.reporting;
      }, tr(UI.openFamily));

      // Synthèse par appareil (immatriculation, sinon type)
      const aircraft = new Map();
      visible.forEach(r => {
        const key = A(r.registration) || `#${r.type || '?'}`,
          e = aircraft.get(key) || {
            registration: r.registration || '—',
            type: r.type,
            callsigns: new Set(),
            families: new Set(),
            missions: 0,
            flight: 0,
            block: 0,
            last: ''
          };
        e.missions++;
        e.flight += n(r.flight);
        e.block += n(r.block);
        if (r.callsign) e.callsigns.add(String(r.callsign).replace(/\s+/g, ''));
        e.families.add(r.family);
        if (r.date > e.last) e.last = r.date;
        if (!e.type) e.type = r.type;
        aircraft.set(key, e);
      });
      table('mcgAircraftTable', [...aircraft.values()].map(e => ({
        ...e,
        callsigns: [...e.callsigns].join(', '),
        families: [...e.families]
      })), [{
        key: 'registration',
        label: t('colReg')
      }, {
        key: 'type',
        label: t('colType')
      }, {
        key: 'callsigns',
        label: t('colCallsign'),
        format: v => v || '—'
      }, {
        key: 'families',
        label: t('colFamily'),
        html: v => v.map(tag).join(' '),
        sortValue: r => r.families.join(' ')
      }, {
        key: 'missions',
        label: t('colMissions'),
        type: 'number'
      }, {
        key: 'flight',
        label: t('flight'),
        type: 'number',
        format: duration
      }, {
        key: 'block',
        label: t('block'),
        type: 'number',
        format: v => v ? duration(v) : '—'
      }, {
        key: 'last',
        label: t('colLast')
      }], 'missions', -1, r => {
        if (r.registration && r.registration !== '—') location.href = `appareil.html?reg=${encodeURIComponent(r.registration)}`;
      }, tr(UI.openAircraft));

      // Synthèse par membre d'équipage
      const people = new Map();
      visible.forEach(r => (r.mission.crew || []).forEach(x => {
        const name = String(x.name || '').trim().toUpperCase();
        if (!name) return;
        const e = people.get(name) || {
          name,
          roles: new Set(),
          families: new Set(),
          missions: 0,
          flight: 0,
          last: ''
        };
        e.missions++;
        e.flight += n(r.flight);
        if (x.role) e.roles.add(opt(V.crewRoles || [], x.role));
        e.families.add(r.family);
        if (r.date > e.last) e.last = r.date;
        people.set(name, e);
      }));
      table('mcgCrewTable', [...people.values()].map(e => ({
        ...e,
        roles: [...e.roles].join(', '),
        families: [...e.families]
      })), [{
        key: 'name',
        label: t('colName')
      }, {
        key: 'roles',
        label: t('colRoles'),
        format: v => v || '—'
      }, {
        key: 'families',
        label: t('colFamily'),
        html: v => v.map(tag).join(' '),
        sortValue: r => r.families.join(' ')
      }, {
        key: 'missions',
        label: t('colMissions'),
        type: 'number'
      }, {
        key: 'flight',
        label: t('flight'),
        type: 'number',
        format: duration
      }, {
        key: 'last',
        label: t('colLast')
      }], 'missions', -1, r => {
        location.href = `equipage.html?name=${encodeURIComponent(r.name)}`;
      }, tr(UI.openCrew));

      // Contrôle des données : chronologie inversée, heure invalide, carburant incohérent.
      const flawed = visible.map(r => ({
        ...r,
        issues: M.checkMission(r.mission)
      })).filter(r => r.issues.length);
      $('.mcg-checks').hidden = !flawed.length;
      $('#mcgChecksSub').textContent = `${flawed.length} ${tr(UI.checksSub)}`;
      if (flawed.length || tables.mcgChecks) {
        const rowsList = flawed.map(r => ({
          ...r,
          text: r.issues.map(x => window.MissionBlocks.describeIssue(x, idx())).join(' · ')
        }));
        if (tables.mcgChecks) tables.mcgChecks.setRows(rowsList);
        else tables.mcgChecks = window.SortedTable.render($('#mcgChecks'), {
          rows: rowsList,
          columns: [{
            key: 'family',
            label: t('colFamily'),
            html: v => tag(v)
          }, {
            key: 'missionId',
            label: t('colId')
          }, {
            key: 'date',
            label: t('colDate')
          }, {
            key: 'text',
            label: t('colIssues'),
            html: v => `<span class="mcg-issue">⚠ ${esc(v)}</span>`
          }],
          defaultSortKey: 'date',
          defaultDir: -1,
          rowTitle: tr(UI.rowTitle),
          onRowClick: r => {
            const cr = pagesOf(r.family).cr;
            if (cr) location.href = `${cr}?edit=${r.index}&id=${encodeURIComponent(r.missionId)}`;
          }
        });
      }

      // Missions
      // Durée déclarée (sans heures) : « ≈ ».
      const dur = (v, r, k) => v == null ? '—' : `${r.mission.timeline?.declared?.[k] != null ? '≈ ' : ''}${duration(v)}`;
      const columns = [{
        key: 'family',
        label: t('colFamily'),
        html: v => tag(v)
      }, {
        key: 'missionId',
        label: t('colId'),
        html: (v, r) => editable('missionId', r, esc(v))
      }, {
        key: 'date',
        label: t('colDate'),
        html: (v, r) => editable('date', r, esc(v))
      }, {
        key: 'series',
        label: t('colSeries'),
        html: (v, r) => editable('series', r, esc((() => {
          const o = (familyInfo(r.family)?.series || []).find(x => x.value === v);
          return o ? tr(o.label) : v || '—';
        })()))
      }, {
        key: 'type',
        label: t('colType')
      }, {
        key: 'registration',
        label: t('colReg'),
        html: (v, r) => editable('registration', r, esc(v))
      }, {
        key: 'callsign',
        label: t('colCallsign'),
        html: (v, r) => editable('callsign', r, esc(v))
      }, {
        key: 'dep',
        label: t('colRoute'),
        html: (v, r) => editMode && !r.mission.__readOnly ? `<span class="ge-route">${editable('dep', r, '')}→${editable('arr', r, '')}</span>` : esc(v || r.arr ? `${v || '…'} → ${r.arr || '…'}` : '—')
      }, {
        key: 'outcome',
        label: t('colOutcome'),
        html: (v, r) => editable('outcome', r, v ? `<span class="mcg-pill" style="--c:${tint(OUTCOME_COLORS[v] || '#64748b')}">${esc(opt(V.outcomes, v))}</span>` : '—')
      }, {
        key: 'flight',
        label: t('colFlight'),
        type: 'number',
        html: (v, r) => editable('flight', r, esc(dur(v, r, 'flightMinutes')))
      }, {
        key: 'block',
        label: t('colBlock'),
        type: 'number',
        html: (v, r) => editable('block', r, esc(dur(v, r, 'blockMinutes')))
      }, {
        key: 'station',
        label: t('colStation'),
        type: 'number',
        format: v => v == null ? '—' : duration(v)
      }, {
        key: 'dayNight',
        label: t('colDayNight'),
        format: v => v ? opt(V.dayNight, v) : '—'
      }, {
        key: 'trace',
        label: t('colTrace'),
        html: (_, r) => window.MissionReportingConfig?.traceLink?.(r.network) || '—'
      }];
      if (!missionsTable) missionsTable = window.SortedTable.render($('#mcgMissions'), {
        rows: visible,
        columns,
        defaultSortKey: 'date',
        defaultDir: -1,
        emptyText,
        rowTitle: tr(UI.rowTitle),
        onRowClick: r => {
          if (editMode) return;
          if (r.mission.__readOnly) {
            status.textContent = tr(SRC.readOnly);
            return;
          }
          const cr = pagesOf(r.family).cr;
          if (cr) location.href = `${cr}?edit=${r.index}&id=${encodeURIComponent(r.missionId)}`;
        },
        deleteMessage: r => `${r.family} ${r.missionId} — ${r.date}\n${tr(UI.confirmDelete)}`,
        onDelete: r => {
          if (r.mission.__readOnly) {
            status.textContent = tr(SRC.readOnly);
            return false;
          }
          const k = L2.store.missions.indexOf(r.mission);
          if (k >= 0) {
            L2.store.missions.splice(k, 1);
            persist().then(render);
          }
          return false;
        }
      });
      else missionsTable.setRows(visible);
      window.TimePeriod.edges?.($('#mcgEdges'), all.filter(r => !hidden.has(r.family)));

      if (L2.store.source === 'unavailable') status.textContent = `${L2.FILE} : ${tr(UI.unavailable)}`;
      $('.mcg-ledger-info').textContent = logSource() ? `${tr(SRC.defa)} · ${window.DefaFlightLog.records().length} ${tr(UI.missions).toLowerCase()} · ${window.DefaFlightLog.load().source || ''}` : `${L2.FILE} · ${L2.store.missions.length} ${tr(UI.missions).toLowerCase()} · ${tr(UI.folderLabel)} : ${L2.store.folder || tr(UI.browserOnly)}${L2.store.updatedAt ? ` · ${new Date(L2.store.updatedAt).toLocaleString()}` : ''}`;
      if (window.RepositoryContentI18n) {
        window.RepositoryContentI18n([...rows.values()]);
      }
    }

    // Mode « modifier dans le tableau » : bascule, puis enregistrement de chaque cellule modifiée.
    const toggle = root.querySelector('[data-grid-edit]');
    /** Libellé du bouton « modifier dans le tableau » / « terminé ». */
    const paintToggle = () => {
      toggle.textContent = tr(editMode ? GE.done : GE.toggle);
      toggle.classList.toggle('on', editMode);
    };
    toggle.onclick = () => {
      editMode = !editMode;
      paintToggle();
      missionsTable = null;
      $('#mcgMissions').innerHTML = '';
      render();
    };
    paintToggle();
    $('#mcgMissions').addEventListener('change', async event => {
      const el = event.target.closest('[data-edit]');
      if (!el) return;
      const row = byUid.get(Number(el.dataset.uid));
      if (!row) return;
      const result = window.MissionGridEdit.apply(row.mission, el.dataset.edit, el.value);
      if (result.error) {
        status.textContent = `${tr(GE.error)} : ${el.value}`;
        el.focus();
        return;
      }
      if (!result.changed) return;
      await persist();
      status.textContent = `${tr(GE.saved)} : ${row.mission.metadata?.missionId || ''}${result.note === 'declared' ? ` — ${tr(GE.declared)}` : ''}`;
      render();
    });

    /** Enregistre le registre après une modification dans le tableau et affiche le résultat. */
    async function persist() {
      const result = await L2.save();
      status.textContent = `${tr(UI.saved)}${result.written ? ` (${L2.FILE})` : ` — ${tr(UI.browserOnly)}`}`;
      return result;
    }
    $('[data-action="yaml"]').onclick = () => L2.downloadAll();
    $('[data-action="csv"]').onclick = () => L2.downloadAllCsv();
    $('[data-action="print"]').onclick = () => print();
    const folderButton = $('[data-action="folder"]');
    window.FileAccess?.decorate(folderButton, '__ledger');
    window.addEventListener('load', () => window.FileAccess?.decorate(folderButton, '__ledger'));
    $('[data-action="folder"]').onclick = async () => {
      try {
        await L2.chooseFolder();
        await L2.load(true);
        await persist();
        render();
      } catch (error) {
        status.textContent = error.message;
      }
    };

    // Anciens registres CSV (HEMS, FIRE / GAAR) → registre unique, sans doublon (n° + date).
    const legacySelect = $('[data-legacy]'),
      picker = root.querySelector('input[type="file"]');
    const legacyFamilies = [...window.MissionCore.families.values()].filter(f => f.legacy);
    legacySelect.insertAdjacentHTML('beforeend', legacyFamilies.map(f => `<option value="${esc(f.id)}">${esc(tr(f.legacy.label))}</option>`).join(''));
    legacySelect.closest('label').hidden = !legacyFamilies.length;
    /** Reprend dans le registre unique les missions d'un ancien registre de famille (sans doublon). */
    async function importLegacy(family, text) {
      const view = L2.open(family),
        key = m => `${String(m.metadata?.missionId || '').trim().toUpperCase()}|${m.metadata?.date || ''}`;
      const known = new Set(view.missions.map(key));
      let added = 0,
        skipped = 0;
      M.parseCsv(text).forEach(record => {
        const mission = M.migrate(record, family.id);
        if (known.has(key(mission))) {
          skipped++;
          return;
        }
        known.add(key(mission));
        view.add(mission);
        added++;
      });
      if (added) await persist();
      status.textContent = `${family.id} : ${added} ${tr(UI.legacyDone)} ${skipped}`;
      render();
    }
    legacySelect.onchange = async () => {
      const family = legacyFamilies.find(f => f.id === legacySelect.value);
      legacySelect.value = '';
      if (!family) return;
      const cached = window.MissionReportingConfig?.cached?.(family.legacy.configKey);
      picker.dataset.family = family.id;
      if (cached?.text && await window.AppFramework.ask(`${cached.name || family.legacy.configKey} — OK : ${family.id} ; ${tr(UI.legacy)} ?`)) importLegacy(family, cached.text);
      else picker.click();
    };
    picker.onchange = async () => {
      const file = picker.files[0],
        family = legacyFamilies.find(f => f.id === picker.dataset.family);
      if (file && family) await importLegacy(family, await file.text());
      picker.value = '';
    };

    let periodCtrl = null;
    periodCtrl = window.TimePeriod.mount($('#periodPicker'), {
      onChange: () => render()
    });
    window.addEventListener('repository-language-change', () => setTimeout(render));
    window.addEventListener('repository-design-change', () => setTimeout(render)); // palette, style des graphiques
    window.addEventListener('local-store-restored', () => L2.load(true).then(render));
    const ready = L2.load().then(render).catch(error => {
      status.textContent = error.message;
      render();
    });
    return {
      ready,
      render
    };
  }

  window.MissionGlobalReporting = {
    mount,
    COLORS
  };
})();
