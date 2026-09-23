(() => {
  'use strict';
  // Mission Report Core — statistiques (§20). Statistiques communes à toutes les familles,
  // puis statistiques spécialisées déclarées par la famille :
  //   family.stats = [{ id, label:[fr,en,de,es], value: missions => nombre | texte,
  //                     format?: 'duration' | 'number' | (v => texte), sub?: missions => texte }]
  // Utilisées par le reporting de famille et le reporting général (étape 2c).
  const M = window.MissionModel, L = window.MissionVocab.L;
  const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const duration = v => { v = Math.round(v || 0); return v >= 60 ? `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}` : `${v} min`; };
  const sumBy = (list, fn) => list.reduce((acc, item) => acc + n(fn(item)), 0);

  // Une mission sans étape détaillée compte pour une sortie.
  const sorties = m => Math.max(1, (m.legs || []).filter(l => l.from || l.to || l.takeoff).length);
  function common(missions) {
    const st = missions.map(m => ({ m, s: M.computeStatistics(m) }));
    const fuel = {}; st.forEach(({ m, s }) => { if (s.fuelUsed != null) { const u = m.fuel?.unit || ''; fuel[u] = (fuel[u] || 0) + s.fuelUsed; } });
    return {
      missions: missions.length,
      sorties: sumBy(missions, sorties),
      flightMinutes: sumBy(st, x => x.s.flightMinutes),
      blockMinutes: sumBy(st, x => x.s.blockMinutes),
      missionMinutes: sumBy(st, x => x.s.missionMinutes),
      timeOnStationMinutes: sumBy(st, x => x.s.timeOnStationMinutes),
      distanceNm: sumBy(missions, m => m.navigation?.distanceNm),
      fuel, // par unité (kg, lb, L…) : jamais additionnées entre unités différentes
      personnel: sumBy(missions, m => sumBy(m.legs || [], l => l.pax)),
      cargoKg: sumBy(missions, m => sumBy(m.legs || [], l => l.cargoKg)),
      success: missions.filter(m => m.results?.outcome === 'SUCCESS').length
    };
  }

  const LABELS = {
    missions: L('Missions', 'Missions', 'Einsätze', 'Misiones'), sorties: L('Sorties', 'Sorties', 'Einsätze (Flüge)', 'Salidas'),
    success: L('Réussies', 'Successful', 'Erfolgreich', 'Con éxito'), flight: L('Heures de vol', 'Flight hours', 'Flugstunden', 'Horas de vuelo'),
    block: L('Heures bloc', 'Block hours', 'Blockstunden', 'Horas calzo a calzo'), mission: L('Heures de mission', 'Mission hours', 'Missionsstunden', 'Horas de misión'),
    station: L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona'), distance: L('Distance (NM)', 'Distance (NM)', 'Entfernung (NM)', 'Distancia (NM)'),
    fuel: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'), personnel: L('Personnes transportées', 'Personnel transported', 'Beförderte Personen', 'Personas transportadas'),
    cargo: L('Fret transporté (kg)', 'Cargo transported (kg)', 'Beförderte Fracht (kg)', 'Carga transportada (kg)'), average: L('Moyenne', 'Average', 'Durchschnitt', 'Media')
  };
  // Cartes à afficher : communes (valeurs non nulles, sauf « missions ») + spécifiques famille.
  function cards(missions, family) {
    // « Moyenne » : texte composé, produit directement dans la langue d'affichage.
    const idx = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
    const c = common(missions), avg = total => missions.length ? `${LABELS.average[idx]} ${duration(total / missions.length)}` : '';
    const list = [
      { label: LABELS.missions, value: c.missions, always: true },
      { label: LABELS.success, value: c.success, sub: c.missions ? `${Math.round(c.success * 100 / c.missions)} %` : '', always: true },
      { label: LABELS.sorties, value: c.sorties, show: c.sorties > c.missions },
      { label: LABELS.flight, value: duration(c.flightMinutes), sub: avg(c.flightMinutes), always: true },
      { label: LABELS.block, value: duration(c.blockMinutes), show: c.blockMinutes },
      { label: LABELS.mission, value: duration(c.missionMinutes), show: c.missionMinutes },
      { label: LABELS.station, value: duration(c.timeOnStationMinutes), show: c.timeOnStationMinutes },
      { label: LABELS.distance, value: Math.round(c.distanceNm), show: c.distanceNm },
      ...Object.entries(c.fuel).map(([unit, total]) => ({ label: LABELS.fuel, value: `${Math.round(total)} ${unit}`, show: total })),
      { label: LABELS.personnel, value: c.personnel, show: c.personnel },
      { label: LABELS.cargo, value: Math.round(c.cargoKg), show: c.cargoKg }
    ].filter(card => card.always || card.show);
    const specific = (family?.stats || []).map(def => {
      const raw = def.value(missions);
      const value = typeof def.format === 'function' ? def.format(raw) : def.format === 'duration' ? duration(raw) : raw;
      return { label: def.label, value, sub: def.sub ? def.sub(missions) : '', specific: true };
    });
    return list.concat(specific);
  }

  window.MissionStats = { common, cards, sorties, duration, sumBy, LABELS };
})();
