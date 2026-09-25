(() => {
  'use strict';
  // Famille de démonstration (étape 1a) : valide le moteur sans préjuger des vraies
  // familles. Illustre les règles d'affichage du §23 : ROTARY + HOIST → bloc treuil,
  // FIXED WING + AIRDROP → bloc largage.
  const L = window.MissionVocab.L;
  const f = (path, label, type = 'text', extra = {}) => ({
    path,
    label,
    type,
    ...extra
  });
  const DEMO = window.MissionCore.registerFamily({
    id: 'DEMO',
    idPrefix: 'DEMO',
    pages: {
      cr: 'demo_cr.html',
      reporting: 'demo_reporting.html'
    },
    title: L('Démonstration du moteur', 'Engine demonstration', 'Demonstration des Kerns', 'Demostración del motor'),
    series: [{
      value: 'DEMO-ROTARY',
      label: L('Démo voilure tournante', 'Rotary-wing demo', 'Drehflügler-Demo', 'Demo ala rotatoria'),
      subtypes: [L('Treuillage', 'Hoist'), L('Transport', 'Transport')]
    }, {
      value: 'DEMO-FIXED',
      label: L('Démo voilure fixe', 'Fixed-wing demo', 'Starrflügler-Demo', 'Demo ala fija'),
      subtypes: [L('Largage', 'Airdrop'), L('Surveillance', 'Surveillance')]
    }],
    // Résumé automatique (§22), propre à la famille, dans chaque langue. h = helpers du
    // Core (série, date, appareils, capacités, statistiques, durée, résultat, sentence…).
    summary: {
      fr: h => {
        const t = h.mission.timeline,
          s = h.stats,
          hoist = h.mission.missionData?.hoist;
        return h.sentence(
          `${h.series || 'Mission de démonstration'}${h.date ? ` du ${h.date}` : ''}`, h.aircraft.length && `réalisée par ${h.list(h.aircraft, 'et')}`, h.lead.baseDeparture && `depuis ${h.lead.baseDeparture}`, '.',
          h.caps.length && `Capacités employées : ${h.caps.join(', ')}.`,
          h.visible('demo-hoist') && hoist?.personsHoisted && `${hoist.personsHoisted} personne(s) treuillée(s) en ${hoist.cycles || '?'} cycle(s).`,
          t.takeoff && `Décollage ${t.takeoff}${t.landing ? `, atterrissage ${t.landing}` : ''}.`,
          s.flightMinutes != null && `Temps de vol ${h.duration(s.flightMinutes)}${s.timeOnStationMinutes != null ? `, temps sur zone ${h.duration(s.timeOnStationMinutes)}` : ''}.`,
          h.outcome && `Résultat : ${h.outcome}.`);
      },
      en: h => {
        const t = h.mission.timeline,
          s = h.stats,
          hoist = h.mission.missionData?.hoist;
        return h.sentence(
          `${h.series || 'Demonstration mission'}${h.date ? ` on ${h.date}` : ''}`, h.aircraft.length && `flown by ${h.list(h.aircraft, 'and')}`, h.lead.baseDeparture && `from ${h.lead.baseDeparture}`, '.',
          h.caps.length && `Capabilities used: ${h.caps.join(', ')}.`,
          h.visible('demo-hoist') && hoist?.personsHoisted && `${hoist.personsHoisted} person(s) hoisted in ${hoist.cycles || '?'} cycle(s).`,
          t.takeoff && `Take-off ${t.takeoff}${t.landing ? `, landing ${t.landing}` : ''}.`,
          s.flightMinutes != null && `Flight time ${h.duration(s.flightMinutes)}${s.timeOnStationMinutes != null ? `, time on station ${h.duration(s.timeOnStationMinutes)}` : ''}.`,
          h.outcome && `Outcome: ${h.outcome}.`);
      },
      de: h => {
        const t = h.mission.timeline,
          s = h.stats,
          hoist = h.mission.missionData?.hoist;
        return h.sentence(
          `${h.series || 'Demonstrationseinsatz'}${h.date ? ` am ${h.date}` : ''}`, h.aircraft.length && `durchgeführt mit ${h.list(h.aircraft, 'und')}`, h.lead.baseDeparture && `ab ${h.lead.baseDeparture}`, '.',
          h.caps.length && `Eingesetzte Fähigkeiten: ${h.caps.join(', ')}.`,
          h.visible('demo-hoist') && hoist?.personsHoisted && `${hoist.personsHoisted} Person(en) in ${hoist.cycles || '?'} Zyklus/Zyklen gewindet.`,
          t.takeoff && `Start ${t.takeoff}${t.landing ? `, Landung ${t.landing}` : ''}.`,
          s.flightMinutes != null && `Flugzeit ${h.duration(s.flightMinutes)}${s.timeOnStationMinutes != null ? `, Zeit im Einsatzraum ${h.duration(s.timeOnStationMinutes)}` : ''}.`,
          h.outcome && `Ergebnis: ${h.outcome}.`);
      },
      es: h => {
        const t = h.mission.timeline,
          s = h.stats,
          hoist = h.mission.missionData?.hoist;
        return h.sentence(
          `${h.series || 'Misión de demostración'}${h.date ? ` del ${h.date}` : ''}`, h.aircraft.length && `realizada por ${h.list(h.aircraft, 'y')}`, h.lead.baseDeparture && `desde ${h.lead.baseDeparture}`, '.',
          h.caps.length && `Capacidades empleadas: ${h.caps.join(', ')}.`,
          h.visible('demo-hoist') && hoist?.personsHoisted && `${hoist.personsHoisted} persona(s) izada(s) en ${hoist.cycles || '?'} ciclo(s).`,
          t.takeoff && `Despegue ${t.takeoff}${t.landing ? `, aterrizaje ${t.landing}` : ''}.`,
          s.flightMinutes != null && `Tiempo de vuelo ${h.duration(s.flightMinutes)}${s.timeOnStationMinutes != null ? `, tiempo en zona ${h.duration(s.timeOnStationMinutes)}` : ''}.`,
          h.outcome && `Resultado: ${h.outcome}.`);
      }
    },
    // Statistiques spécialisées (§20), affichées après les statistiques communes.
    stats: [{
      id: 'hoistCycles',
      label: L('Cycles de treuil', 'Hoist cycles', 'Windenzyklen', 'Ciclos de grúa'),
      value: ms => ms.reduce((a, m) => a + (window.MissionModel.blockVisible(m, DEMO, 'demo-hoist') ? Number(m.missionData?.hoist?.cycles) || 0 : 0), 0)
    }, {
      id: 'personsHoisted',
      label: L('Personnes treuillées', 'Persons hoisted', 'Gewindete Personen', 'Personas izadas'),
      value: ms => ms.reduce((a, m) => a + (window.MissionModel.blockVisible(m, DEMO, 'demo-hoist') ? Number(m.missionData?.hoist?.personsHoisted) || 0 : 0), 0)
    }, {
      id: 'airdropKg',
      label: L('Charge larguée (kg)', 'Load dropped (kg)', 'Abgeworfene Last (kg)', 'Carga lanzada (kg)'),
      value: ms => ms.reduce((a, m) => a + (window.MissionModel.blockVisible(m, DEMO, 'demo-airdrop') ? Number(m.missionData?.airdrop?.loadKg) || 0 : 0), 0)
    }],
    blocks: [{
      id: 'demo-hoist',
      title: L('Treuillage', 'Hoist operations', 'Windeneinsatz', 'Operaciones de grúa'),
      when: ctx => ctx.categories.has('rotary') && ctx.capabilities.has('HOIST'),
      fields: [
        f('missionData.hoist.cycles', L('Cycles de treuil', 'Hoist cycles', 'Windenzyklen', 'Ciclos de grúa'), 'number'),
        f('missionData.hoist.personsHoisted', L('Personnes treuillées', 'Persons hoisted', 'Gewindete Personen', 'Personas izadas'), 'number'),
        f('missionData.hoist.maxHeightFt', L('Hauteur max. (ft)', 'Max. height (ft)', 'Max. Höhe (ft)', 'Altura máx. (ft)'), 'number'),
        f('missionData.hoist.notes', L('Observations treuil', 'Hoist remarks', 'Bemerkungen Winde', 'Observaciones de grúa'), 'textarea', {
          full: true
        })
      ]
    }, {
      id: 'demo-airdrop',
      title: L('Largage', 'Airdrop', 'Abwurf', 'Lanzamiento'),
      when: ctx => (ctx.categories.has('fixed') || ctx.categories.has('amphibious')) && ctx.capabilities.has('AIRDROP'),
      fields: [
        f('missionData.airdrop.dz', L('Zone de largage (DZ)', 'Drop zone (DZ)', 'Absetzzone (DZ)', 'Zona de lanzamiento (DZ)')),
        f('missionData.airdrop.loadKg', L('Charge larguée (kg)', 'Load dropped (kg)', 'Abgeworfene Last (kg)', 'Carga lanzada (kg)'), 'number'),
        f('missionData.airdrop.passes', L('Passages', 'Passes', 'Überflüge', 'Pasadas'), 'number')
      ]
    }]
  });
})();
