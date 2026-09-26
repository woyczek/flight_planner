(() => {
  'use strict';
  // Mission Report Core — page de reporting d'une famille (registre YAML de la famille).
  // Mêmes fonctions que les reportings HEMS / FIRE : période partagée, synthèse,
  // répartitions, tableau triable (clic = modification dans le CR, suppression),
  // lien de trace réseau, export du registre (YAML) et CSV simplifié, bascule vers le CR.
  const M = window.MissionModel,
    V = window.MissionVocab,
    L = V.L;
  /** Échappe un texte pour HTML. */
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  } [c]));
  /** Minutes → « 1h05 ». */
  const duration = n => {
    n = Math.round(n || 0);
    return n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}` : `${n} min`;
  };
  const UI = {
    period: L('Période analysée', 'Analysed period', 'Analysezeitraum', 'Periodo analizado'),
    data: L('Registre des missions', 'Mission ledger', 'Einsatzregister', 'Registro de misiones'),
    summary: L('Synthèse', 'Summary', 'Übersicht', 'Resumen'),
    breakdowns: L('Répartition détaillée', 'Detailed breakdown', 'Detaillierte Aufschlüsselung', 'Desglose detallado'),
    missionsTitle: L('Missions (tri, clic pour modifier, suppression)', 'Missions (sort, click to edit, delete)', 'Einsätze (sortieren, zum Bearbeiten klicken, löschen)', 'Misiones (ordenar, clic para modificar, eliminar)'),
    newReport: L('Nouveau compte rendu', 'New report', 'Neuer Bericht', 'Nuevo informe'),
    exportYaml: L('Exporter le registre (YAML)', 'Export ledger (YAML)', 'Register exportieren (YAML)', 'Exportar registro (YAML)'),
    exportCsv: L('Exporter en CSV (tableur)', 'Export CSV (spreadsheet)', 'CSV exportieren (Tabelle)', 'Exportar CSV (hoja de cálculo)'),
    importYaml: L('Importer des missions (YAML)', 'Import missions (YAML)', 'Einsätze importieren (YAML)', 'Importar misiones (YAML)'),
    folder: L('Dossier du registre…', 'Ledger folder…', 'Registerordner…', 'Carpeta del registro…'),
    print: L('PDF / Imprimer', 'PDF / Print', 'PDF / Drucken', 'PDF / Imprimir'),
    missions: L('Missions', 'Missions', 'Einsätze', 'Misiones'),
    flight: L('Temps de vol', 'Flight time', 'Flugzeit', 'Tiempo de vuelo'),
    block: L('Temps bloc', 'Block time', 'Blockzeit', 'Tiempo calzo a calzo'),
    onStation: L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona'),
    fuel: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'),
    success: L('Réussies', 'Successful', 'Erfolgreich', 'Con éxito'),
    average: L('Moyenne', 'Average', 'Durchschnitt', 'Media'),
    bySeries: L('Par série', 'By series', 'Nach Serie', 'Por serie'),
    byOutcome: L('Par résultat', 'By outcome', 'Nach Ergebnis', 'Por resultado'),
    byType: L('Par type d’appareil', 'By aircraft type', 'Nach Muster', 'Por tipo de aeronave'),
    byCapability: L('Par capacité employée', 'By capability used', 'Nach eingesetzter Fähigkeit', 'Por capacidad empleada'),
    colId: L('N° mission', 'Mission ID', 'Einsatz-ID', 'ID de misión'),
    colDate: L('Date', 'Date', 'Datum', 'Fecha'),
    colSeries: L('Série', 'Series', 'Serie', 'Serie'),
    colType: L('Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'),
    colReg: L('Immat.', 'Reg.', 'Kennz.', 'Matr.'),
    colCallsign: L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'),
    colOutcome: L('Résultat', 'Outcome', 'Ergebnis', 'Resultado'),
    colFlight: L('Vol', 'Flight', 'Flug', 'Vuelo'),
    colBlock: L('Bloc', 'Block', 'Block', 'Calzo'),
    colStation: L('Sur zone', 'On station', 'Im Einsatz', 'En zona'),
    colTrace: L('Trace', 'Track', 'Spur', 'Traza'),
    empty: L('Aucune mission pour la période sélectionnée.', 'No mission for the selected period.', 'Kein Einsatz im gewählten Zeitraum.', 'Ninguna misión en el periodo seleccionado.'),
    confirmDelete: L('Supprimer définitivement cette mission du registre ?', 'Permanently delete this mission from the ledger?', 'Diesen Einsatz endgültig aus dem Register löschen?', '¿Eliminar definitivamente esta misión del registro?'),
    rowTitle: L('Cliquer pour modifier la mission', 'Click to edit the mission', 'Klicken, um den Einsatz zu bearbeiten', 'Clic para modificar la misión'),
    saved: L('Registre enregistré', 'Ledger saved', 'Register gespeichert', 'Registro guardado'),
    browserOnly: L('enregistré dans le navigateur (choisir le dossier pour écrire le fichier)', 'saved in the browser (choose the folder to write the file)', 'im Browser gespeichert (Ordner wählen, um die Datei zu schreiben)', 'guardado en el navegador (elija la carpeta para escribir el archivo)'),
    importedN: L('missions importées', 'missions imported', 'Einsätze importiert', 'misiones importadas'),
    folderLabel: L('Dossier', 'Folder', 'Ordner', 'Carpeta'),
    browser: L('navigateur uniquement', 'browser only', 'nur Browser', 'solo navegador'),
    none: L('Non renseigné', 'Not provided', 'Nicht angegeben', 'No indicado'),
    activity: L('Activité par période', 'Activity by period', 'Aktivität nach Zeitraum', 'Actividad por periodo'),
    unit: L('Regroupement', 'Grouping', 'Gruppierung', 'Agrupación'),
    metric: L('Mesure', 'Measure', 'Messgröße', 'Medida'),
    auto: L('Automatique', 'Automatic', 'Automatisch', 'Automático'),
    day: L('Jour', 'Day', 'Tag', 'Día'),
    week: L('Semaine', 'Week', 'Woche', 'Semana'),
    month: L('Mois', 'Month', 'Monat', 'Mes'),
    quarter: L('Trimestre', 'Quarter', 'Quartal', 'Trimestre'),
    year: L('Année', 'Year', 'Jahr', 'Año'),
    colIssues: L('Contrôle', 'Check', 'Prüfung', 'Control'),
    legacyUseCache: L('Utiliser l’ancien registre déjà chargé dans le navigateur ? (Annuler pour choisir un fichier CSV)', 'Use the legacy ledger already loaded in the browser? (Cancel to choose a CSV file)', 'Das bereits im Browser geladene alte Register verwenden? (Abbrechen, um eine CSV-Datei zu wählen)', '¿Usar el registro antiguo ya cargado en el navegador? (Cancelar para elegir un archivo CSV)'),
    legacyDone: L('missions importées de l’ancien registre ; déjà présentes (même n° et date) :', 'missions imported from the legacy ledger; already present (same ID and date):', 'Einsätze aus dem alten Register importiert; bereits vorhanden (gleiche ID und Datum):', 'misiones importadas del registro antiguo; ya presentes (mismo ID y fecha):')
  };

  /** Page de reporting d'une famille : période, statistiques, graphiques, tableau des missions (modifiable dans le tableau), import / export, source (registre ou journal DEFA). */
  function mount({
    family: familyId,
    root
  }) {
    window.MissionVocab.describeHeader?.(familyId);
    const family = window.MissionCore.families.get(familyId);
    if (!family) throw new Error(`Famille inconnue : ${familyId}`);
    document.body.dataset.family = family.id;
    try {
      if (family.id !== 'DEMO') localStorage.setItem('missionCoreLastFamily:v1', family.id);
    } catch {
      /* stockage indisponible */ }
    const ledger = window.MissionLedger.open(family);
    const rows = new Map();
    /** Texte source (français) d'un libellé de l'interface, ligne enregistrée pour le traducteur commun. */
    const t = key => {
      rows.set(UI[key][0], UI[key]);
      return UI[key][0];
    };
    /** Libellé d'une valeur de liste (vocabulaire). */
    const label = (list, value) => {
      const o = list.find(x => x.value === value);
      if (o) rows.set(o.label[0], o.label);
      return o ? o.label[0] : value || t('none');
    };

    root.classList.add('mc-reporting');
    // En-tête collé : nouveau CR, période (◀ zoom − ▶, composant TimePeriod), regroupement et
    // mesure du graphique ; la famille / série reste dans la popup d'en-tête.
    const pageHeader = document.querySelector('header.mc-header');
    const tools = document.createElement('div');
    tools.className = 'mc-report-tools';
    tools.innerHTML = `<a class="mc-header-new" href="${esc(family.pages.cr || '../mission_cr.html')}">+&nbsp;<span>${t('newReport')}</span></a><div id="mcPeriod"></div>
      <label>${t('unit')}<select data-pref="unit">${['auto', 'day', 'week', 'month', 'quarter', 'year'].map(u => `<option value="${u}">${t(u)}</option>`).join('')}</select></label>
      <label>${t('metric')}<select data-pref="metric"><option value="missions">${t('missions')}</option><option value="flight">${t('flight')}</option><option value="block">${t('block')}</option><option value="station">${t('onStation')}</option></select></label>`;
    if (pageHeader) pageHeader.append(tools);
    else root.before(tools);
    root.innerHTML = `
      <section data-icon="database"><h2>${t('data')}</h2><div class="row">
        <button type="button" class="secondary" data-action="yaml" data-icon="download">${t('exportYaml')}</button>
        <button type="button" class="secondary" data-action="csv" data-icon="download">${t('exportCsv')}</button>
        <button type="button" class="secondary" data-action="import" data-icon="upload">${t('importYaml')}</button>
        <button type="button" class="secondary" data-action="folder" data-icon="folder">${t('folder')}</button>
        <button type="button" class="secondary" data-action="print" data-icon="printer">${t('print')}</button>
        <button type="button" class="secondary" data-action="legacy" hidden></button><input type="file" accept=".csv,text/csv" data-legacy hidden>
        <input type="file" accept=".yaml,.yml,text/yaml" multiple hidden></div><p class="small mc-ledger-info"></p><p class="small mc-status"></p></section>
      <section data-icon="chart"><h2>${t('summary')}</h2><div class="mc-cards" id="mcCards"></div></section>
      <section data-icon="calendar"><h2>${t('activity')}</h2>
        <div id="mcActivity"></div><div class="mcg-series-legend" id="mcActivityLegend"></div></section>
      <section data-icon="layers"><h2>${t('breakdowns')}</h2><div class="mc-breakdowns" id="mcBreakdowns"></div></section>
      <section data-icon="list"><h2>${t('missionsTitle')}<button type="button" class="ge-toggle" data-grid-edit></button></h2><div id="mcTable"></div><div id="mcEdges" hidden></div></section>`;
    const $a = action => root.querySelector(`[data-action="${action}"]`),
      status = root.querySelector('.mc-status');
    // Regroupement et mesure du graphique : préférences partagées avec le reporting général.
    const PREFS = 'missionGlobalReporting:v1';
    /** Préférences d'affichage des graphiques (unité de période, indicateur : missions ou heures), mémorisées (missionGlobalReporting:v1). */
    const prefs = (() => {
      try {
        return {
          unit: 'auto',
          metric: 'missions',
          ...JSON.parse(localStorage.getItem(PREFS) || '{}')
        };
      } catch {
        return {
          unit: 'auto',
          metric: 'missions'
        };
      }
    })();
    tools.querySelectorAll('[data-pref]').forEach(select => {
      if ([...select.options].some(o => o.value === prefs[select.dataset.pref])) select.value = prefs[select.dataset.pref];
      select.onchange = () => {
        prefs[select.dataset.pref] = select.value;
        try {
          localStorage.setItem(PREFS, JSON.stringify(prefs));
        } catch {
          /* stockage indisponible */ }
        render();
      };
    });
    const PALETTE = ['#67b6ff', '#bb8cff', '#65d394', '#fbbf24', '#f472b6', '#2dd4bf', '#fb923c', '#a3e635', '#818cf8', '#f87171'];

    // Cellules éditables en mode « modifier dans le tableau » ; durée déclarée (sans heures) : « ≈ ».
    const dur = (v, r, k) => v == null ? '—' : `${r.mission.timeline?.declared?.[k] != null ? '≈ ' : ''}${duration(v)}`;
    const columns = [{
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
        html: (v, r) => editable('series', r, esc(label(family.series || [], v)))
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
        key: 'outcome',
        label: t('colOutcome'),
        html: (v, r) => editable('outcome', r, esc(v ? label(V.outcomes, v) : '—'))
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
        key: 'trace',
        label: t('colTrace'),
        html: (_, row) => window.MissionReportingConfig?.traceLink?.(row.network) || '—'
      },
      // Contrôle de cohérence (chronologie, heures, carburant) : détail au survol.
      {
        key: 'issues',
        label: t('colIssues'),
        type: 'number',
        html: (v, row) => v ? `<span class="mc-issue-flag" title="${esc(row.issueText)}">⚠ ${v}</span>` : '✓'
      }
    ];
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
        series: family.series || [],
        outcomes: V.outcomes,
        label: o => tr(o.label)
      });
      return html ?? fallback;
    };
    /** Ligne du tableau d'une mission : statistiques, résultat, anomalies de cohérence. */
    const toRow = (mission, index) => {
      const s = M.computeStatistics(mission),
        a = mission.aircraft?.[0] || {},
        uid = ++uidSeq;
      const issues = M.checkMission(mission),
        lang = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
      const row = {
        uid,
        issues: issues.length,
        issueText: issues.map(x => window.MissionBlocks.describeIssue(x, lang)).join('\n'),
        index,
        mission,
        missionId: mission.metadata?.missionId,
        date: mission.metadata?.date,
        series: mission.series,
        type: a.type,
        registration: a.registration,
        callsign: a.callsign,
        outcome: mission.results?.outcome,
        flight: s.flightMinutes,
        block: s.blockMinutes,
        station: s.timeOnStationMinutes,
        network: mission.network || {}
      };
      byUid.set(uid, row);
      return row;
    };
    let table = null,
      seriesFilter = '';
    // En-tête : famille (autre reporting) et sous-type (filtre des statistiques et du tableau).
    const coreUi = key => {
      const row = window.MissionCore.UI[key];
      rows.set(row[0], row);
      return row[0];
    };
    (family.series || []).forEach(s => {
      if (Array.isArray(s.label)) rows.set(s.label[0], s.label);
    });
    window.MissionCore.headerSwitch({
      family,
      kind: 'reporting',
      t: coreUi,
      all: true,
      get: () => seriesFilter,
      set: value => {
        seriesFilter = value;
        render();
      }
    });
    const switchBox = pageHeader?.querySelector('.mc-switch');
    if (switchBox) tools.prepend(switchBox); // famille · série en tête de la barre
    /** Texte d'une ligne [fr, en, de, es] dans la langue de la page. */
    const tr = row => row[Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'))] || row[0];
    // Données des reportings : registre des missions (défaut) ou journal DEFA (vols réalisés,
    // chargé dans Paramétrage › Base DEFA ; lecture seule). Choix commun à tous les reportings.
    const SRC = {
      label: L('Données', 'Data', 'Daten', 'Datos'),
      ledger: L('Mes missions (registre)', 'My missions (ledger)', 'Meine Einsätze (Register)', 'Mis misiones (registro)'),
      defa: L('Journal DEFA (vols réalisés)', 'DEFA log (flights flown)', 'DEFA-Journal (durchgeführte Flüge)', 'Diario DEFA (vuelos realizados)'),
      readOnly: L('Vol du journal DEFA : lecture seule (pas de CR à modifier).', 'DEFA log flight: read-only (no report to edit).', 'Flug aus dem DEFA-Journal: nur lesbar.', 'Vuelo del diario DEFA: solo lectura.')
    };
    let logMissions = null;
    /** Vrai si les reportings lisent le journal DEFA. */
    const logSource = () => window.DefaFlightLog?.source?.() === 'defa';
    /** Missions du journal DEFA (converties une fois), ou null si la source est le registre. */
    const sourceMissions = () => logSource() ? (logMissions ||= window.DefaFlightLog.toMissions()) : null;
    window.addEventListener('defa-log-change', () => {
      logMissions = null;
    });
    // Menu « Données » toujours visible : registre, journal DEFA (s'il est chargé) et chargement /
    // mise à jour du journal (page DEFA copiée ou enregistrée) sans passer par le Paramétrage.
    const SRC_LOAD = L('Charger / mettre à jour le journal DEFA…', 'Load / update the DEFA log…', 'DEFA-Journal laden / aktualisieren…', 'Cargar / actualizar el diario DEFA…');

    /** Choix de la source des reportings (registre / journal DEFA) et chargement du journal. */
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
    sourcePicker(tools);

    /** Rendu du reporting pour la période et le sous-type : cartes, graphiques, répartitions, tableau. */
    function render() {
      const source = sourceMissions(),
        all = (source ? source.filter(m => m.family === family.id) : ledger.missions).map(toRow).filter(r => !seriesFilter || r.series === seriesFilter);
      const visible = window.TimePeriod ? window.TimePeriod.filterRows(all, 'date') : all;
      // Statistiques communes (§20) + statistiques spécialisées de la famille (stats.js).
      root.querySelector('#mcCards').innerHTML = window.MissionStats.cards(visible.map(r => r.mission), family).map(card => {
        rows.set(card.label[0], card.label);
        return `<div class="card${card.specific ? ' specific' : ''}"><span class="small">${esc(card.label[0])}</span><b>${esc(card.value)}</b><span class="small">${esc(card.sub || '')}</span></div>`;
      }).join('');
      // Activité par période, empilée par série (sous-type) de la famille.
      if (window.MissionCharts) {
        const C = window.MissionCharts,
          range = window.TimePeriod ? window.TimePeriod.range() : {};
        const value = r => prefs.metric === 'missions' ? 1 : Number(r[prefs.metric === 'onStation' ? 'station' : prefs.metric]) || 0;
        const hours = v => `${(v / 60).toFixed(v >= 600 ? 0 : 1).replace('.', ',')} h`,
          format = prefs.metric === 'missions' ? v => String(Math.round(v)) : hours;
        const b = C.buckets(visible.map(r => r.date), {
          start: range.start || '',
          end: range.end || '',
          unit: prefs.unit,
          lang: window.RepositoryNav?.getLanguage?.() || 'fr'
        });
        const seriesIds = [...new Set(visible.map(r => r.series || ''))],
          grid = {};
        visible.forEach(r => {
          if (!r.date) return;
          const k = b.keyOf(r.date);
          (grid[k] ||= {})[r.series || ''] = (grid[k]?.[r.series || ''] || 0) + value(r);
        });
        const series = seriesIds.map((id, i) => ({
          id,
          label: label(family.series || [], id),
          color: PALETTE[i % PALETTE.length]
        }));
        const dates = all.map(r => r.date).filter(Boolean).sort();
        periodCtrl?.setBounds(dates[0] || null, dates[dates.length - 1] || null);
        root.querySelector('#mcActivity').innerHTML = C.stackedBars({
          buckets: b.list,
          series,
          value: (k, id) => grid[k]?.[id] || 0,
          format,
          height: 220,
          empty: t('empty')
        });
        C.enableZoom(root.querySelector('#mcActivity'));
        root.querySelector('#mcActivityLegend').innerHTML = series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('');
      }
      /** Répartition des missions par valeur (barres horizontales). */
      const groups = (titleKey, values) => {
        const counts = {};
        values.forEach(v => {
          counts[v] = (counts[v] || 0) + 1;
        });
        const data = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8),
          max = Math.max(1, ...data.map(d => d[1]));
        return `<div><h3>${esc(t(titleKey))}</h3>${data.map(([name, count]) => `<div class="barrow"><span>${esc(name)}</span><span>${count}</span><span class="track"><span class="bar" style="width:${count * 100 / max}%"></span></span></div>`).join('') || '<p class="small">—</p>'}</div>`;
      };
      root.querySelector('#mcBreakdowns').innerHTML = groups('bySeries', visible.map(r => label(family.series || [], r.series))) +
        groups('byOutcome', visible.map(r => r.outcome ? label(V.outcomes, r.outcome) : t('none'))) +
        groups('byType', visible.map(r => r.type || t('none'))) +
        groups('byCapability', visible.flatMap(r => r.mission.capabilities || []));
      if (!table) table = window.SortedTable.render(root.querySelector('#mcTable'), {
        rows: visible,
        columns,
        defaultSortKey: 'date',
        defaultDir: -1,
        emptyText: t('empty'),
        rowTitle: t('rowTitle'),
        onRowClick: row => {
          if (editMode) return;
          if (row.mission.__readOnly) {
            status.textContent = tr(SRC.readOnly);
            return;
          }
          location.href = `${family.pages.cr}?edit=${row.index}&id=${encodeURIComponent(row.missionId || '')}`;
        },
        deleteMessage: row => `${row.missionId || ''} — ${row.date || ''}\n${t('confirmDelete')}`,
        onDelete: row => {
          if (row.mission.__readOnly) {
            status.textContent = tr(SRC.readOnly);
            return false;
          }
          ledger.remove(row.index);
          persist().then(render);
          return false;
        }
      });
      else table.setRows(visible);
      window.TimePeriod?.edges?.(root.querySelector('#mcEdges'), all);
      // un morceau traduisible par élément (la couche de traduction remplace des nœuds de texte entiers)
      root.querySelector('.mc-ledger-info').innerHTML = `${esc(ledger.filename)} · ${ledger.missions.length} <span>${esc(t('missions'))}</span> · <span>${esc(t('folderLabel'))}</span> : ${ledger.state.folder ? esc(ledger.state.folder) : `<span>${esc(t('browser'))}</span>`}`;
      if (window.RepositoryContentI18n) {
        window.RepositoryContentI18n([...rows.values()]);
        rows.clear();
      }
    }
    // Mode « modifier dans le tableau » (même registre que le reporting général).
    const toggle = root.querySelector('[data-grid-edit]');
    /** Libellé du bouton « modifier dans le tableau » / « terminé ». */
    const paintToggle = () => {
      toggle.textContent = tr(editMode ? GE.done : GE.toggle);
      toggle.classList.toggle('on', editMode);
    };
    toggle.onclick = () => {
      editMode = !editMode;
      paintToggle();
      table = null;
      root.querySelector('#mcTable').innerHTML = '';
      render();
    };
    paintToggle();
    root.querySelector('#mcTable').addEventListener('change', async event => {
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
      const result = await ledger.save();
      status.textContent = result.written ? `${t('saved')} (${ledger.filename})` : `${t('saved')} — ${t('browserOnly')}`;
      return result;
    }

    $a('yaml').onclick = () => ledger.downloadYaml();
    $a('csv').onclick = () => ledger.downloadCsv();
    $a('print').onclick = () => print();
    window.FileAccess?.decorate($a('folder'), '__ledger');
    window.addEventListener('load', () => window.FileAccess?.decorate($a('folder'), '__ledger'));
    $a('folder').onclick = async () => {
      try {
        await ledger.chooseFolder();
        await ledger.load();
        await persist();
        render();
      } catch (error) {
        status.textContent = error.message;
      }
    };
    // Ancien registre CSV (HEMS / FIRE) → missions du Core, sans doublon (n° + date).
    if (family.legacy) {
      const button = $a('legacy'),
        legacyPicker = root.querySelector('[data-legacy]');
      button.hidden = false;
      button.textContent = family.legacy.label[0];
      rows.set(family.legacy.label[0], family.legacy.label);
      /** Importe des missions (YAML / JSON) dans le registre de la famille, sans doublon (n° + date). */
      const importText = async text => {
        const key = m => `${String(m.metadata?.missionId || '').trim().toUpperCase()}|${m.metadata?.date || ''}`;
        const known = new Set(ledger.missions.map(key));
        let added = 0,
          skipped = 0;
        M.parseCsv(text).forEach(record => {
          const mission = M.migrate(record, family.id);
          if (known.has(key(mission))) {
            skipped++;
            return;
          }
          known.add(key(mission));
          ledger.add(mission);
          added++;
        });
        if (added) await persist();
        status.textContent = `${added} ${t('legacyDone')} ${skipped}`;
        render();
      };
      button.onclick = () => {
        const cached = window.MissionReportingConfig?.cached?.(family.legacy.configKey);
        if (cached?.text && confirm(t('legacyUseCache'))) importText(cached.text);
        else legacyPicker.click();
      };
      legacyPicker.onchange = async () => {
        const file = legacyPicker.files[0];
        if (file) await importText(await file.text());
        legacyPicker.value = '';
      };
    }
    const picker = root.querySelector('input[type="file"]:not([data-legacy])');
    $a('import').onclick = () => picker.click();
    picker.onchange = async () => {
      let count = 0;
      for (const file of picker.files) {
        try {
          count += await ledger.importFile(await file.text());
        } catch (error) {
          status.textContent = `${file.name} : ${error.message}`;
        }
      }
      picker.value = '';
      if (count) {
        await persist();
        status.textContent += ` · ${count} ${t('importedN')}`;
        render();
      }
    };
    let periodCtrl = null;
    periodCtrl = window.TimePeriod?.mount(tools.querySelector('#mcPeriod'), {
      onChange: () => render()
    }) || null;
    window.addEventListener('repository-language-change', () => setTimeout(render));
    window.addEventListener('load', () => window.RepositoryNav?.addAction?.(`${t('newReport')} ${family.id}`, () => {
      location.href = family.pages.cr;
    }));
    const ready = ledger.load().then(render);
    window.addEventListener('local-store-restored', () => ledger.load(true).then(render));
    return {
      family,
      ledger,
      ready,
      render
    };
  }

  window.MissionReporting = {
    mount
  };
})();
