(() => {
  'use strict';
  // Mission Report Core — page de reporting d'une famille (registre YAML de la famille).
  // Mêmes fonctions que les reportings HEMS / FIRE : période partagée, synthèse,
  // répartitions, tableau triable (clic = modification dans le CR, suppression),
  // lien de trace réseau, export du registre (YAML) et CSV simplifié, bascule vers le CR.
  const M = window.MissionModel, V = window.MissionVocab, L = V.L;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const duration = n => { n = Math.round(n || 0); return n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}` : `${n} min`; };
  const UI = {
    period: L('Période analysée', 'Analysed period', 'Analysezeitraum', 'Periodo analizado'),
    data: L('Registre des missions', 'Mission ledger', 'Einsatzregister', 'Registro de misiones'),
    summary: L('Synthèse', 'Summary', 'Übersicht', 'Resumen'), breakdowns: L('Répartition détaillée', 'Detailed breakdown', 'Detaillierte Aufschlüsselung', 'Desglose detallado'),
    missionsTitle: L('Missions (tri, clic pour modifier, suppression)', 'Missions (sort, click to edit, delete)', 'Einsätze (sortieren, zum Bearbeiten klicken, löschen)', 'Misiones (ordenar, clic para modificar, eliminar)'),
    newReport: L('Nouveau compte rendu', 'New report', 'Neuer Bericht', 'Nuevo informe'), exportYaml: L('Exporter le registre (YAML)', 'Export ledger (YAML)', 'Register exportieren (YAML)', 'Exportar registro (YAML)'),
    exportCsv: L('Exporter en CSV (tableur)', 'Export CSV (spreadsheet)', 'CSV exportieren (Tabelle)', 'Exportar CSV (hoja de cálculo)'), importYaml: L('Importer des missions (YAML)', 'Import missions (YAML)', 'Einsätze importieren (YAML)', 'Importar misiones (YAML)'),
    folder: L('Dossier du registre…', 'Ledger folder…', 'Registerordner…', 'Carpeta del registro…'), print: L('PDF / Imprimer', 'PDF / Print', 'PDF / Drucken', 'PDF / Imprimir'),
    missions: L('Missions', 'Missions', 'Einsätze', 'Misiones'), flight: L('Temps de vol', 'Flight time', 'Flugzeit', 'Tiempo de vuelo'), block: L('Temps bloc', 'Block time', 'Blockzeit', 'Tiempo calzo a calzo'),
    onStation: L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona'), fuel: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'),
    success: L('Réussies', 'Successful', 'Erfolgreich', 'Con éxito'), average: L('Moyenne', 'Average', 'Durchschnitt', 'Media'),
    bySeries: L('Par série', 'By series', 'Nach Serie', 'Por serie'), byOutcome: L('Par résultat', 'By outcome', 'Nach Ergebnis', 'Por resultado'),
    byType: L('Par type d’appareil', 'By aircraft type', 'Nach Muster', 'Por tipo de aeronave'), byCapability: L('Par capacité employée', 'By capability used', 'Nach eingesetzter Fähigkeit', 'Por capacidad empleada'),
    colId: L('N° mission', 'Mission ID', 'Einsatz-ID', 'ID de misión'), colDate: L('Date', 'Date', 'Datum', 'Fecha'), colSeries: L('Série', 'Series', 'Serie', 'Serie'),
    colType: L('Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'), colReg: L('Immat.', 'Reg.', 'Kennz.', 'Matr.'), colCallsign: L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'),
    colOutcome: L('Résultat', 'Outcome', 'Ergebnis', 'Resultado'), colFlight: L('Vol', 'Flight', 'Flug', 'Vuelo'), colBlock: L('Bloc', 'Block', 'Block', 'Calzo'),
    colStation: L('Sur zone', 'On station', 'Im Einsatz', 'En zona'), colTrace: L('Trace', 'Track', 'Spur', 'Traza'),
    empty: L('Aucune mission pour la période sélectionnée.', 'No mission for the selected period.', 'Kein Einsatz im gewählten Zeitraum.', 'Ninguna misión en el periodo seleccionado.'),
    confirmDelete: L('Supprimer définitivement cette mission du registre ?', 'Permanently delete this mission from the ledger?', 'Diesen Einsatz endgültig aus dem Register löschen?', '¿Eliminar definitivamente esta misión del registro?'),
    rowTitle: L('Cliquer pour modifier la mission', 'Click to edit the mission', 'Klicken, um den Einsatz zu bearbeiten', 'Clic para modificar la misión'),
    saved: L('Registre enregistré', 'Ledger saved', 'Register gespeichert', 'Registro guardado'), browserOnly: L('enregistré dans le navigateur (choisir le dossier pour écrire le fichier)', 'saved in the browser (choose the folder to write the file)', 'im Browser gespeichert (Ordner wählen, um die Datei zu schreiben)', 'guardado en el navegador (elija la carpeta para escribir el archivo)'),
    importedN: L('missions importées', 'missions imported', 'Einsätze importiert', 'misiones importadas'), folderLabel: L('Dossier', 'Folder', 'Ordner', 'Carpeta'), browser: L('navigateur uniquement', 'browser only', 'nur Browser', 'solo navegador'),
    none: L('Non renseigné', 'Not provided', 'Nicht angegeben', 'No indicado')
  };

  function mount({ family: familyId, root }) {
    const family = window.MissionCore.families.get(familyId);
    if (!family) throw new Error(`Famille inconnue : ${familyId}`);
    document.body.dataset.family = family.id;
    const ledger = window.MissionLedger.open(family);
    const rows = new Map(); const t = key => { rows.set(UI[key][0], UI[key]); return UI[key][0]; };
    const label = (list, value) => { const o = list.find(x => x.value === value); if (o) rows.set(o.label[0], o.label); return o ? o.label[0] : value || t('none'); };

    root.classList.add('mc-reporting');
    root.innerHTML = `<section><h2>${t('period')}</h2><div id="mcPeriod"></div></section>
      <section><h2>${t('data')}</h2><div class="row">
        <a class="primary mc-button" data-action="new">${t('newReport')}</a>
        <button type="button" class="secondary" data-action="yaml">${t('exportYaml')}</button>
        <button type="button" class="secondary" data-action="csv">${t('exportCsv')}</button>
        <button type="button" class="secondary" data-action="import">${t('importYaml')}</button>
        <button type="button" class="secondary" data-action="folder">${t('folder')}</button>
        <button type="button" class="secondary" data-action="print">${t('print')}</button>
        <input type="file" accept=".yaml,.yml,text/yaml" multiple hidden></div><p class="small mc-ledger-info"></p><p class="small mc-status"></p></section>
      <section><h2>${t('summary')}</h2><div class="mc-cards" id="mcCards"></div></section>
      <section><h2>${t('breakdowns')}</h2><div class="mc-breakdowns" id="mcBreakdowns"></div></section>
      <section><h2>${t('missionsTitle')}</h2><div id="mcTable"></div></section>`;
    const $a = action => root.querySelector(`[data-action="${action}"]`), status = root.querySelector('.mc-status');
    $a('new').href = family.pages.cr || '#';

    const columns = [
      { key: 'missionId', label: t('colId') }, { key: 'date', label: t('colDate') }, { key: 'series', label: t('colSeries'), format: v => label(family.series || [], v) },
      { key: 'type', label: t('colType') }, { key: 'registration', label: t('colReg') }, { key: 'callsign', label: t('colCallsign') },
      { key: 'outcome', label: t('colOutcome'), format: v => v ? label(V.outcomes, v) : '—' },
      { key: 'flight', label: t('colFlight'), type: 'number', format: v => v == null ? '—' : duration(v) },
      { key: 'block', label: t('colBlock'), type: 'number', format: v => v == null ? '—' : duration(v) },
      { key: 'station', label: t('colStation'), type: 'number', format: v => v == null ? '—' : duration(v) },
      { key: 'trace', label: t('colTrace'), html: (_, row) => window.MissionReportingConfig?.traceLink?.(row.network) || '—' }
    ];
    const toRow = (mission, index) => {
      const s = M.computeStatistics(mission), a = mission.aircraft?.[0] || {};
      return { index, mission, missionId: mission.metadata?.missionId, date: mission.metadata?.date, series: mission.series, type: a.type, registration: a.registration, callsign: a.callsign, outcome: mission.results?.outcome, flight: s.flightMinutes, block: s.blockMinutes, station: s.timeOnStationMinutes, network: mission.network || {} };
    };
    let table = null;
    function render() {
      const all = ledger.missions.map(toRow);
      const visible = window.TimePeriod ? window.TimePeriod.filterRows(all, 'date') : all;
      const sum = key => visible.reduce((acc, r) => acc + (r[key] || 0), 0);
      const card = (key, value, sub = '') => `<div class="card"><span class="small">${esc(t(key))}</span><b>${esc(value)}</b><span class="small">${esc(sub)}</span></div>`;
      const ok = visible.filter(r => r.outcome === 'SUCCESS').length;
      root.querySelector('#mcCards').innerHTML = card('missions', visible.length) + card('success', ok, visible.length ? `${Math.round(ok * 100 / visible.length)} %` : '')
        + card('flight', duration(sum('flight')), visible.length ? `${t('average')} ${duration(sum('flight') / visible.length)}` : '')
        + card('block', duration(sum('block'))) + card('onStation', duration(sum('station')));
      const groups = (titleKey, values) => {
        const counts = {}; values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        const data = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8), max = Math.max(1, ...data.map(d => d[1]));
        return `<div><h3>${esc(t(titleKey))}</h3>${data.map(([name, count]) => `<div class="barrow"><span>${esc(name)}</span><span>${count}</span><span class="track"><span class="bar" style="width:${count * 100 / max}%"></span></span></div>`).join('') || '<p class="small">—</p>'}</div>`;
      };
      root.querySelector('#mcBreakdowns').innerHTML = groups('bySeries', visible.map(r => label(family.series || [], r.series)))
        + groups('byOutcome', visible.map(r => r.outcome ? label(V.outcomes, r.outcome) : t('none')))
        + groups('byType', visible.map(r => r.type || t('none')))
        + groups('byCapability', visible.flatMap(r => r.mission.capabilities || []));
      if (!table) table = window.SortedTable.render(root.querySelector('#mcTable'), {
        rows: visible, columns, defaultSortKey: 'date', defaultDir: -1, emptyText: t('empty'), rowTitle: t('rowTitle'),
        onRowClick: row => { location.href = `${family.pages.cr}?edit=${row.index}&id=${encodeURIComponent(row.missionId || '')}`; },
        deleteMessage: row => `${row.missionId || ''} — ${row.date || ''}\n${t('confirmDelete')}`,
        onDelete: row => { ledger.remove(row.index); persist().then(render); return false; }
      });
      else table.setRows(visible);
      root.querySelector('.mc-ledger-info').textContent = `${ledger.filename} · ${ledger.missions.length} ${t('missions').toLowerCase()} · ${t('folderLabel')} : ${ledger.state.folder || t('browser')}`;
      if (window.RepositoryContentI18n) { window.RepositoryContentI18n([...rows.values()]); rows.clear(); }
    }
    async function persist() {
      const result = await ledger.save();
      status.textContent = result.written ? `${t('saved')} (${ledger.filename})` : `${t('saved')} — ${t('browserOnly')}`;
      return result;
    }

    $a('yaml').onclick = () => ledger.downloadYaml();
    $a('csv').onclick = () => ledger.downloadCsv();
    $a('print').onclick = () => print();
    $a('folder').onclick = async () => { try { await ledger.chooseFolder(); await ledger.load(); await persist(); render(); } catch (error) { status.textContent = error.message; } };
    const picker = root.querySelector('input[type="file"]');
    $a('import').onclick = () => picker.click();
    picker.onchange = async () => {
      let count = 0;
      for (const file of picker.files) { try { count += await ledger.importFile(await file.text()); } catch (error) { status.textContent = `${file.name} : ${error.message}`; } }
      picker.value = '';
      if (count) { await persist(); status.textContent += ` · ${count} ${t('importedN')}`; render(); }
    };
    window.TimePeriod?.mount(root.querySelector('#mcPeriod'), { onChange: render });
    window.addEventListener('load', () => window.RepositoryNav?.addAction?.(`${t('newReport')} ${family.id}`, () => { location.href = family.pages.cr; }));
    const ready = ledger.load().then(render);
    return { family, ledger, ready, render };
  }

  window.MissionReporting = { mount };
})();
