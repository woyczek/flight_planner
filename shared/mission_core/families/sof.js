(() => {
  'use strict';
  // Famille SOF / TACTICAL OPS (§10) — niveau compte rendu de simulation uniquement :
  // unité appuyée, zones (PZ / LZ / DZ), méthodes d'insertion / d'extraction, personnels.
  // Aucune procédure tactique détaillée ; coordonnées, itinéraires et identité de l'équipe
  // sont sensibles (retirés de la version publique).
  const V = window.MissionVocab, L = V.L, opt = V.opt;
  const f = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });
  const P = 'missionData.sof.';
  const S = { sensitive: true };
  const num = v => Number(v) || 0;
  const zoneKinds = [opt('PZ', L('PZ (zone d’embarquement)', 'PZ (pickup zone)', 'PZ (Aufnahmezone)', 'PZ (zona de embarque)')), opt('LZ', L('LZ (zone de poser)', 'LZ (landing zone)', 'LZ (Landezone)', 'LZ (zona de aterrizaje)')), opt('DZ', L('DZ (zone de largage)', 'DZ (drop zone)', 'DZ (Absetzzone)', 'DZ (zona de lanzamiento)'))];
  const methods = [opt('LANDING', L('Posé', 'Landing', 'Landung', 'Aterrizaje')), opt('FAST_ROPE', L('Corde lisse', 'Fast rope', 'Fast Rope', 'Cuerda rápida')), opt('RAPPEL', L('Rappel', 'Rappel', 'Abseilen', 'Rápel')), opt('HOVER_EXIT', L('Sortie en stationnaire', 'Hover exit', 'Ausstieg im Schwebeflug', 'Salida en estacionario')), opt('HOIST', L('Treuil', 'Hoist', 'Winde', 'Grúa')), opt('PARACHUTE', L('Parachute', 'Parachute', 'Fallschirm', 'Paracaídas')), opt('SHIP', L('Pont de navire', 'Ship deck', 'Schiffsdeck', 'Cubierta de buque'))];
  const lighting = [opt('DAY', L('Jour', 'Day', 'Tag', 'Día')), opt('NIGHT_NVG', L('Nuit sous NVG', 'Night under NVG', 'Nacht mit NVG', 'Noche con NVG')), opt('NIGHT_LIGHTS', L('Nuit, feux allumés', 'Night, lights on', 'Nacht, Licht an', 'Noche, luces encendidas')), opt('LOW_LIGHT', L('Faible luminosité', 'Low light', 'Wenig Licht', 'Poca luz'))];
  const sof = m => m.missionData?.sof || {};
  const zones = m => (sof(m).zones || []).filter(z => z.kind || z.name);

  window.MissionCore.registerFamily({
    id: 'SOF', idPrefix: 'SOF',
    pages: { cr: 'sof_cr.html', reporting: 'sof_reporting.html' },
    title: L('Opérations spéciales / tactiques', 'SOF / tactical operations', 'Spezialkräfte / taktische Einsätze', 'Operaciones especiales / tácticas'),
    series: [
      { value: 'INSERTION', label: L('Insertion', 'Insertion', 'Absetzen', 'Inserción') }, { value: 'EXTRACTION', label: L('Extraction', 'Extraction', 'Aufnahme', 'Extracción') },
      { value: 'INFILTRATION', label: L('Infiltration', 'Infiltration', 'Infiltration', 'Infiltración') }, { value: 'EXFILTRATION', label: L('Exfiltration', 'Exfiltration', 'Exfiltration', 'Exfiltración') },
      { value: 'TACTICAL_TRANSPORT', label: L('Transport tactique', 'Tactical transport', 'Taktischer Transport', 'Transporte táctico') }, { value: 'SR_SUPPORT', label: L('Appui reconnaissance spéciale', 'Special reconnaissance support', 'Unterstützung Spezialaufklärung', 'Apoyo a reconocimiento especial') },
      { value: 'FAST_ROPE', label: L('Corde lisse', 'Fast rope', 'Fast Rope', 'Cuerda rápida') }, { value: 'RAPPEL', label: L('Rappel', 'Rappel', 'Abseilen', 'Rápel') },
      { value: 'PARACHUTE_INSERTION', label: L('Insertion par parachute', 'Parachute insertion', 'Fallschirmabsetzen', 'Inserción en paracaídas') }, { value: 'LZ_INSERTION', label: L('Insertion sur LZ', 'Landing zone insertion', 'Absetzen in LZ', 'Inserción en LZ') },
      { value: 'SHIP_INSERTION', label: L('Insertion sur navire', 'Ship insertion', 'Absetzen auf Schiff', 'Inserción en buque') }
    ],
    flags: mission => ({ maritime: mission.series === 'SHIP_INSERTION' }),
    events: [opt('TOT', L('Heure sur objectif (TOT)', 'Time on target (TOT)', 'Zeit über Ziel (TOT)', 'Hora sobre objetivo (TOT)')), opt('TEAM_DELIVERED', L('Équipe déposée', 'Team delivered', 'Team abgesetzt', 'Equipo desplegado')), opt('TEAM_RECOVERED', L('Équipe récupérée', 'Team recovered', 'Team aufgenommen', 'Equipo recuperado'))],
    blocks: [
      {
        id: 'sof-unit', title: L('Unité appuyée', 'Supported unit', 'Unterstützte Einheit', 'Unidad apoyada'),
        fields: [
          f(P + 'supportedUnit', L('Unité appuyée', 'Supported unit', 'Unterstützte Einheit', 'Unidad apoyada')), f(P + 'team', L('Équipe', 'Team', 'Team', 'Equipo'), 'text', S),
          f(P + 'personnelCount', L('Effectif de l’équipe', 'Team size', 'Teamstärke', 'Efectivo del equipo'), 'number'), f(P + 'equipment', L('Matériel transporté (général)', 'Equipment carried (general)', 'Mitgeführtes Material (allgemein)', 'Material transportado (general)'))
        ]
      },
      {
        id: 'sof-zones', title: L('Zones (PZ / LZ / DZ)', 'Zones (PZ / LZ / DZ)', 'Zonen (PZ / LZ / DZ)', 'Zonas (PZ / LZ / DZ)'),
        collection: {
          path: P + 'zones', min: 0, compact: true, item: L('Zone', 'Zone', 'Zone', 'Zona'), add: L('+ Ajouter une zone', '+ Add zone', '+ Zone hinzufügen', '+ Añadir zona'),
          empty: () => ({ kind: 'LZ', name: '', coordinates: '', tot: '', notes: '' }),
          fields: [f('kind', L('Type', 'Type', 'Art', 'Tipo'), 'select', { options: zoneKinds }), f('name', L('Nom', 'Name', 'Name', 'Nombre'), 'text', { upper: true }), f('coordinates', L('Coordonnées', 'Coordinates', 'Koordinaten', 'Coordenadas'), 'text', S), f('tot', L('TOT', 'TOT'), 'time'), f('notes', L('Remarque', 'Note', 'Bemerkung', 'Observación'))]
        }
      },
      {
        id: 'sof-execution', title: L('Profil et méthodes', 'Profile and methods', 'Profil und Verfahren', 'Perfil y métodos'),
        fields: [
          f(P + 'ingress', L('Itinéraire aller (ingress)', 'Ingress route', 'Hinweg (Ingress)', 'Ruta de ida (ingress)'), 'text', S), f(P + 'egress', L('Itinéraire retour (egress)', 'Egress route', 'Rückweg (Egress)', 'Ruta de vuelta (egress)'), 'text', S),
          f(P + 'altitude', L('Altitude / hauteur de vol', 'Flight altitude / height', 'Flughöhe', 'Altitud de vuelo')), f(P + 'profile', L('Profil de vol', 'Flight profile', 'Flugprofil', 'Perfil de vuelo')),
          f(P + 'lighting', L('Éclairage', 'Lighting', 'Beleuchtung', 'Iluminación'), 'select', { options: lighting, blank: true }),
          f(P + 'insertionMethod', L('Méthode d’insertion', 'Insertion method', 'Absetzverfahren', 'Método de inserción'), 'select', { options: methods, blank: true }),
          f(P + 'extractionMethod', L('Méthode d’extraction', 'Extraction method', 'Aufnahmeverfahren', 'Método de extracción'), 'select', { options: methods, blank: true })
        ]
      },
      {
        id: 'sof-personnel', title: L('Personnels', 'Personnel', 'Personal', 'Personal'),
        fields: [
          f(P + 'embarked', L('Personnels embarqués', 'Personnel embarked', 'Aufgenommenes Personal', 'Personal embarcado'), 'number'),
          f(P + 'delivered', L('Personnels déposés', 'Personnel delivered', 'Abgesetztes Personal', 'Personal desplegado'), 'number'),
          f(P + 'recovered', L('Personnels récupérés', 'Personnel recovered', 'Aufgenommenes Personal (Rückführung)', 'Personal recuperado'), 'number')
        ]
      }
    ],
    stats: [
      { id: 'delivered', label: L('Personnels déposés', 'Personnel delivered', 'Abgesetztes Personal', 'Personal desplegado'), value: ms => ms.reduce((a, m) => a + num(sof(m).delivered), 0) },
      { id: 'recovered', label: L('Personnels récupérés', 'Personnel recovered', 'Aufgenommenes Personal', 'Personal recuperado'), value: ms => ms.reduce((a, m) => a + num(sof(m).recovered), 0) },
      { id: 'zones', label: L('Zones utilisées', 'Zones used', 'Genutzte Zonen', 'Zonas utilizadas'), value: ms => ms.reduce((a, m) => a + zones(m).length, 0) },
      { id: 'night', label: L('Missions de nuit sous NVG', 'Night NVG missions', 'Nachteinsätze mit NVG', 'Misiones nocturnas con NVG'), value: ms => ms.filter(m => sof(m).lighting === 'NIGHT_NVG' || (m.capabilities || []).includes('NVG')).length }
    ],
    // Résumé sans donnée sensible (ni équipe, ni coordonnées, ni itinéraires).
    summary: (() => {
      const build = w => h => {
        const m = h.mission, d = sof(m), s = h.stats, zs = zones(m), ins = h.pick(methods.find(o => o.value === d.insertionMethod)?.label), ext = h.pick(methods.find(o => o.value === d.extractionMethod)?.label);
        const nvg = d.lighting === 'NIGHT_NVG' || (m.capabilities || []).includes('NVG');
        return h.sentence(
          `${h.series || 'SOF'}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, d.supportedUnit && `${w.for} ${d.supportedUnit}`, nvg && w.nvg, '.',
          zs.length && `${w.zones(zs.map(z => z.kind).join(', '))}.`, ins && `${w.insertion} ${String(ins).toLowerCase()}${ext ? `, ${w.extraction} ${String(ext).toLowerCase()}` : ''}.`,
          (d.delivered || d.recovered) && `${w.personnel(num(d.delivered), num(d.recovered))}.`,
          s.flightMinutes != null && `${w.flight} ${h.duration(s.flightMinutes)}.`, h.outcome && `${w.outcome} ${h.outcome}.`);
      };
      return {
        fr: build({ on: 'du', by: 'réalisée par', and: 'et', for: 'au profit de', nvg: 'de nuit sous NVG', zones: z => `Zones : ${z}`, insertion: 'Insertion :', extraction: 'extraction :', personnel: (d, r) => `${d} personnel(s) déposé(s), ${r} récupéré(s)`, flight: 'Temps de vol', outcome: 'Résultat :' }),
        en: build({ on: 'on', by: 'flown by', and: 'and', for: 'for', nvg: 'at night under NVG', zones: z => `Zones: ${z}`, insertion: 'Insertion:', extraction: 'extraction:', personnel: (d, r) => `${d} personnel delivered, ${r} recovered`, flight: 'Flight time', outcome: 'Outcome:' }),
        de: build({ on: 'am', by: 'durchgeführt mit', and: 'und', for: 'für', nvg: 'nachts mit NVG', zones: z => `Zonen: ${z}`, insertion: 'Absetzen:', extraction: 'Aufnahme:', personnel: (d, r) => `${d} Personen abgesetzt, ${r} aufgenommen`, flight: 'Flugzeit', outcome: 'Ergebnis:' }),
        es: build({ on: 'del', by: 'realizada por', and: 'y', for: 'para', nvg: 'de noche con NVG', zones: z => `Zonas: ${z}`, insertion: 'Inserción:', extraction: 'extracción:', personnel: (d, r) => `${d} persona(s) desplegada(s), ${r} recuperada(s)`, flight: 'Tiempo de vuelo', outcome: 'Resultado:' })
      };
    })()
  });
})();
