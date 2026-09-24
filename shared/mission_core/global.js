(() => {
  'use strict';
  // Mission Report Core — intégration des familles du Core au reporting général
  // (mission_operations_reporting.html) : chargement des registres YAML de chaque famille,
  // synthèse par famille (statistiques communes, stats.js) et lignes de missions pour le
  // tableau général (clic = CR de la famille en modification, suppression dans son registre).
  const M = window.MissionModel, L = window.MissionVocab.L;
  const entries = []; // { family, ledger, folder }
  const T = {
    family: L('Famille', 'Family', 'Familie', 'Familia'), missions: L('Missions', 'Missions', 'Einsätze', 'Misiones'),
    success: L('Réussies (%)', 'Successful (%)', 'Erfolgreich (%)', 'Con éxito (%)'), flight: L('Temps de vol', 'Flight time', 'Flugzeit', 'Tiempo de vuelo'),
    block: L('Temps bloc', 'Block time', 'Blockzeit', 'Tiempo calzo a calzo'), station: L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona'),
    fuel: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'), sorties: L('Sorties', 'Sorties', 'Einsätze (Flüge)', 'Salidas'),
    title: L('Autres familles (Mission Report Core)', 'Other families (Mission Report Core)', 'Weitere Familien (Mission Report Core)', 'Otras familias (Mission Report Core)'),
    empty: L('Aucune mission enregistrée dans les autres familles pour la période sélectionnée.', 'No mission recorded in the other families for the selected period.', 'Keine Einsätze der weiteren Familien im gewählten Zeitraum.', 'Ninguna misión registrada en las otras familias en el periodo seleccionado.')
  };
  const rows = () => Object.values(T).concat([...window.MissionCore.families.values()].map(f => f.title).filter(Boolean));

  // Racine du site d'après l'adresse de ce fichier (shared/mission_core/global.js) : connue dès
  // le chargement, même si le bandeau commun (chargé plus bas dans la page) n'est pas encore prêt.
  const SITE_ROOT = document.currentScript?.src ? new URL('../../', document.currentScript.src) : null;
  // Dossier de la famille d'après repository_tree (page dont le chemin se termine par la page CR),
  // en adresse absolue : juste quelle que soit la page appelante (l'application est dans « CR DEFA/ »).
  const folderOf = family => {
    const page = (window.REPOSITORY_TREE?.pages || []).find(p => p.path.endsWith('/' + family.pages.cr));
    if (!page) return '';
    const folder = page.path.slice(0, page.path.lastIndexOf('/') + 1), root = window.RepositoryNav?.root || SITE_ROOT;
    return root ? new URL(folder, root).href : folder;
  };
  async function load() {
    entries.length = 0;
    for (const family of window.MissionCore.families.values()) {
      if (family.id === 'DEMO' || !family.pages?.cr) continue;
      const folder = folderOf(family); if (!folder) continue;
      const ledger = window.MissionLedger.open(family, { base: folder });
      try { await ledger.load(); } catch { /* registre illisible : famille ignorée */ }
      entries.push({ family, ledger, folder });
    }
    if (window.RepositoryContentI18n) window.RepositoryContentI18n(rows());
    return entries;
  }
  const inPeriod = (missions, filter) => filter ? filter(missions.map(m => ({ m, date: m.metadata?.date }))).map(x => x.m) : missions;

  // Lignes de synthèse (une par famille ayant au moins une mission sur la période).
  function summary(filter) {
    return entries.map(({ family, ledger }) => {
      const ms = inPeriod(ledger.missions, filter); if (!ms.length) return null;
      const c = window.MissionStats.common(ms);
      return { family: family.title?.[0] || family.id, code: family.id, missions: c.missions, sorties: c.sorties, success: Math.round(c.success * 100 / c.missions), flight: c.flightMinutes, block: c.blockMinutes, station: c.timeOnStationMinutes, fuel: Object.entries(c.fuel).map(([u, v]) => `${Math.round(v)} ${u}`).join(' + ') };
    }).filter(Boolean);
  }
  // Lignes pour le tableau des missions du reporting général.
  function missionRows(filter) {
    return entries.flatMap(({ family, ledger, folder }) => inPeriod(ledger.missions, filter).map(m => {
      const index = ledger.missions.indexOf(m), s = M.computeStatistics(m), a = m.aircraft?.[0] || {};
      const series = (family.series || []).find(x => x.value === m.series);
      return { origin: family.id, coreFamily: family.id, index, missionId: m.metadata?.missionId || '', date: m.metadata?.date || '', aircraft: a.type || '', registration: a.registration || '', missionType: series?.label?.[0] || m.series || '', flightMinutes: s.flightMinutes ?? '', blockMinutes: s.blockMinutes ?? '', fuelUsed: s.fuelUsed ?? '', patients: '', drops: '', editUrl: `${folder}${family.pages.cr}?edit=${index}&id=${encodeURIComponent(m.metadata?.missionId || '')}` };
    }));
  }
  async function remove(row) {
    const entry = entries.find(e => e.family.id === row.coreFamily); if (!entry) return false;
    const target = entry.ledger.missions[row.index];
    if (!target || String(target.metadata?.missionId || '') !== row.missionId) return false;
    entry.ledger.remove(row.index); await entry.ledger.save(); return true;
  }
  const columns = duration => [
    { key: 'family', label: T.family[0] }, { key: 'missions', label: T.missions[0], type: 'number' }, { key: 'sorties', label: T.sorties[0], type: 'number' },
    { key: 'success', label: T.success[0], type: 'number' }, { key: 'flight', label: T.flight[0], type: 'number', format: duration },
    { key: 'block', label: T.block[0], type: 'number', format: duration }, { key: 'station', label: T.station[0], type: 'number', format: duration }, { key: 'fuel', label: T.fuel[0] }
  ];

  window.MissionCoreGlobal = { load, summary, missionRows, remove, columns, entries, T };
})();
