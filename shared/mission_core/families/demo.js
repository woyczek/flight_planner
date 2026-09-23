(() => {
  'use strict';
  // Famille de démonstration (étape 1a) : valide le moteur sans préjuger des vraies
  // familles. Illustre les règles d'affichage du §23 : ROTARY + HOIST → bloc treuil,
  // FIXED WING + AIRDROP → bloc largage.
  const L = window.MissionVocab.L;
  const f = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });
  window.MissionCore.registerFamily({
    id: 'DEMO', idPrefix: 'DEMO',
    title: L('Démonstration du moteur', 'Engine demonstration', 'Demonstration des Kerns', 'Demostración del motor'),
    series: [
      { value: 'DEMO-ROTARY', label: L('Démo voilure tournante', 'Rotary-wing demo', 'Drehflügler-Demo', 'Demo ala rotatoria'), subtypes: [L('Treuillage', 'Hoist'), L('Transport', 'Transport')] },
      { value: 'DEMO-FIXED', label: L('Démo voilure fixe', 'Fixed-wing demo', 'Starrflügler-Demo', 'Demo ala fija'), subtypes: [L('Largage', 'Airdrop'), L('Surveillance', 'Surveillance')] }
    ],
    blocks: [
      {
        id: 'demo-hoist', title: L('Treuillage', 'Hoist operations', 'Windeneinsatz', 'Operaciones de grúa'),
        when: ctx => ctx.categories.has('rotary') && ctx.capabilities.has('HOIST'),
        fields: [
          f('missionData.hoist.cycles', L('Cycles de treuil', 'Hoist cycles', 'Windenzyklen', 'Ciclos de grúa'), 'number'),
          f('missionData.hoist.personsHoisted', L('Personnes treuillées', 'Persons hoisted', 'Gewindete Personen', 'Personas izadas'), 'number'),
          f('missionData.hoist.maxHeightFt', L('Hauteur max. (ft)', 'Max. height (ft)', 'Max. Höhe (ft)', 'Altura máx. (ft)'), 'number'),
          f('missionData.hoist.notes', L('Observations treuil', 'Hoist remarks', 'Bemerkungen Winde', 'Observaciones de grúa'), 'textarea', { full: true })
        ]
      },
      {
        id: 'demo-airdrop', title: L('Largage', 'Airdrop', 'Abwurf', 'Lanzamiento'),
        when: ctx => (ctx.categories.has('fixed') || ctx.categories.has('amphibious')) && ctx.capabilities.has('AIRDROP'),
        fields: [
          f('missionData.airdrop.dz', L('Zone de largage (DZ)', 'Drop zone (DZ)', 'Absetzzone (DZ)', 'Zona de lanzamiento (DZ)')),
          f('missionData.airdrop.loadKg', L('Charge larguée (kg)', 'Load dropped (kg)', 'Abgeworfene Last (kg)', 'Carga lanzada (kg)'), 'number'),
          f('missionData.airdrop.passes', L('Passages', 'Passes', 'Überflüge', 'Pasadas'), 'number')
        ]
      }
    ]
  });
})();
