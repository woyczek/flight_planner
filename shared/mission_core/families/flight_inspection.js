(() => {
  'use strict';
  // Famille FLIGHT INSPECTION (§15) : contrôle en vol des moyens de radionavigation, des
  // aides visuelles et validation de procédures. Blocs affichés selon la série (ILS,
  // VOR / DME / TACAN / NDB, procédures RNAV, balisage) ; plusieurs passes par mission.
  const V = window.MissionVocab, L = V.L, opt = V.opt;
  const f = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });
  const P = 'missionData.fi.';
  const is = (...series) => ctx => series.includes(ctx.series);
  const inspectionTypes = [opt('COMMISSIONING', L('Mise en service', 'Commissioning', 'Inbetriebnahme', 'Puesta en servicio')), opt('PERIODIC', L('Périodique', 'Periodic', 'Periodisch', 'Periódica')), opt('SPECIAL', L('Spéciale', 'Special', 'Sonderprüfung', 'Especial')), opt('POST_MAINTENANCE', L('Après maintenance', 'Post-maintenance', 'Nach Wartung', 'Tras mantenimiento'))];
  const tolerance = [opt('IN_TOLERANCE', L('Dans les tolérances', 'In tolerance', 'Innerhalb der Toleranz', 'Dentro de tolerancias')), opt('MARGINAL', L('Limite', 'Marginal', 'Grenzwertig', 'Marginal')), opt('OUT_OF_TOLERANCE', L('Hors tolérances', 'Out of tolerance', 'Außerhalb der Toleranz', 'Fuera de tolerancias')), opt('NOT_ASSESSED', L('Non évalué', 'Not assessed', 'Nicht bewertet', 'No evaluado'))];
  const passKinds = [opt('APPROACH', L('Approche', 'Approach', 'Anflug', 'Aproximación')), opt('LEVEL_RUN', L('Palier', 'Level run', 'Horizontalflug', 'Pasada nivelada')), opt('ORBIT', L('Orbite', 'Orbit', 'Orbit', 'Órbita')), opt('RADIAL', L('Radiale', 'Radial', 'Radial', 'Radial')), opt('ARC', L('Arc DME', 'DME arc', 'DME-Bogen', 'Arco DME')), opt('SEGMENT', L('Segment de procédure', 'Procedure segment', 'Verfahrenssegment', 'Segmento de procedimiento')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))];
  const flyability = [opt('FLYABLE', L('Volable', 'Flyable', 'Fliegbar', 'Volable')), opt('FLYABLE_REMARKS', L('Volable avec remarques', 'Flyable with remarks', 'Fliegbar mit Anmerkungen', 'Volable con observaciones')), opt('NOT_FLYABLE', L('Non volable', 'Not flyable', 'Nicht fliegbar', 'No volable'))];
  const status = [opt('SERVICEABLE', L('En service', 'Serviceable', 'Betriebsbereit', 'En servicio')), opt('RESTRICTED', L('En service avec restrictions', 'Restricted', 'Eingeschränkt', 'En servicio con restricciones')), opt('UNSERVICEABLE', L('Hors service', 'Unserviceable', 'Außer Betrieb', 'Fuera de servicio'))];
  const passes = m => (m.missionData?.fi?.passes || []).filter(p => p.kind || p.time || p.result);
  const fi = m => m.missionData?.fi || {};

  window.MissionCore.registerFamily({
    id: 'FI', idPrefix: 'FI', defaultCategory: 'fixed',
    pages: { cr: 'fi_cr.html', reporting: 'fi_reporting.html' },
    title: L('Contrôle en vol', 'Flight inspection', 'Flugvermessung', 'Inspección en vuelo'),
    series: [
      { value: 'ILS', label: L('ILS', 'ILS') }, { value: 'LOC', label: L('Localiser (LOC)', 'Localizer (LOC)', 'Landekurssender (LOC)', 'Localizador (LOC)') },
      { value: 'GLIDE_PATH', label: L('Glide path', 'Glide path', 'Gleitweg', 'Senda de planeo') }, { value: 'VOR', label: L('VOR', 'VOR') }, { value: 'DME', label: L('DME', 'DME') },
      { value: 'NDB', label: L('NDB', 'NDB') }, { value: 'TACAN', label: L('TACAN', 'TACAN') }, { value: 'RADAR', label: L('Radar', 'Radar') },
      { value: 'PAPI_VASI', label: L('PAPI / VASI', 'PAPI / VASI') }, { value: 'RNAV_GNSS', label: L('RNAV / GNSS', 'RNAV / GNSS') },
      { value: 'PROCEDURE_VALIDATION', label: L('Validation de procédure', 'Procedure validation', 'Verfahrensvalidierung', 'Validación de procedimiento') },
      { value: 'AIRPORT_LIGHTING', label: L('Balisage aéroportuaire', 'Airport lighting', 'Flughafenbefeuerung', 'Balizamiento de aeropuerto') }
    ],
    events: [opt('PASS_START', L('Début de passe', 'Pass start', 'Anflugbeginn', 'Inicio de pasada')), opt('PASS_END', L('Fin de passe', 'Pass end', 'Anflugende', 'Fin de pasada')), opt('FACILITY_ADJUSTED', L('Réglage de l’installation', 'Facility adjusted', 'Anlage justiert', 'Instalación ajustada'))],
    blocks: [
      {
        id: 'fi-facility', title: L('Installation contrôlée', 'Facility inspected', 'Geprüfte Anlage', 'Instalación inspeccionada'),
        fields: [
          f(P + 'airport', L('Aérodrome', 'Airport', 'Flugplatz', 'Aeródromo')), f(P + 'icao', L('Code OACI', 'ICAO code', 'ICAO-Code', 'Código OACI'), 'text', { upper: true }),
          f(P + 'runway', L('Piste', 'Runway', 'Piste', 'Pista'), 'text', { upper: true }), f(P + 'facility', L('Installation', 'Facility', 'Anlage', 'Instalación')),
          f(P + 'facilityId', L('Identifiant', 'Facility ID', 'Kennung', 'Identificador'), 'text', { upper: true }), f(P + 'frequency', L('Fréquence', 'Frequency', 'Frequenz', 'Frecuencia')),
          f(P + 'channel', L('Canal', 'Channel', 'Kanal', 'Canal')), f(P + 'procedure', L('Procédure publiée', 'Published procedure', 'Veröffentlichtes Verfahren', 'Procedimiento publicado'), 'text', { upper: true }),
          f(P + 'inspectionType', L('Type de contrôle', 'Inspection type', 'Prüfart', 'Tipo de inspección'), 'select', { options: inspectionTypes, blank: true })
        ]
      },
      {
        id: 'fi-passes', title: L('Passes / runs', 'Passes / runs', 'Anflüge / Messflüge', 'Pasadas'),
        collection: {
          path: P + 'passes', min: 0, compact: true, item: L('Passe', 'Pass', 'Anflug', 'Pasada'), add: L('+ Ajouter une passe', '+ Add pass', '+ Anflug hinzufügen', '+ Añadir pasada'),
          empty: () => ({ time: '', kind: '', altitudeFt: null, distanceNm: null, radial: null, course: null, result: '', anomaly: '' }),
          fields: [
            f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('kind', L('Type de passe', 'Pass type', 'Anflugart', 'Tipo de pasada'), 'select', { options: passKinds, blank: true }),
            f('altitudeFt', L('Altitude (ft)', 'Altitude (ft)', 'Höhe (ft)', 'Altitud (ft)'), 'number'), f('distanceNm', L('Distance (NM)', 'Distance (NM)', 'Entfernung (NM)', 'Distancia (NM)'), 'number'),
            f('radial', L('Radiale (°)', 'Radial (°)', 'Radial (°)', 'Radial (°)'), 'number'), f('course', L('Route / axe (°)', 'Course (°)', 'Kurs (°)', 'Rumbo (°)'), 'number'),
            f('result', L('Résultat', 'Result', 'Ergebnis', 'Resultado'), 'select', { options: tolerance, blank: true }), f('anomaly', L('Anomalie', 'Anomaly', 'Abweichung', 'Anomalía'), 'text', { full: true })
          ]
        }
      },
      {
        id: 'fi-ils', title: L('ILS', 'ILS'), when: is('ILS', 'LOC', 'GLIDE_PATH'),
        fields: [
          f(P + 'ils.locFrequency', L('Fréquence LOC', 'LOC frequency', 'LOC-Frequenz', 'Frecuencia LOC')), f(P + 'ils.course', L('Axe LOC (°)', 'LOC course (°)', 'LOC-Kurs (°)', 'Rumbo LOC (°)'), 'number'),
          f(P + 'ils.gpAngle', L('Angle glide (°)', 'Glide path angle (°)', 'Gleitwinkel (°)', 'Ángulo de senda (°)'), 'number'), f(P + 'ils.interceptAltFt', L('Altitude d’interception (ft)', 'Intercept altitude (ft)', 'Abfanghöhe (ft)', 'Altitud de interceptación (ft)'), 'number'),
          f(P + 'ils.direction', L('Sens d’approche', 'Approach direction', 'Anflugrichtung', 'Sentido de aproximación'), 'text', { upper: true }),
          f(P + 'ils.locResult', L('Résultat LOC', 'LOC result', 'LOC-Ergebnis', 'Resultado LOC'), 'select', { options: tolerance, blank: true }),
          f(P + 'ils.gpResult', L('Résultat glide', 'GP result', 'GP-Ergebnis', 'Resultado GP'), 'select', { options: tolerance, blank: true }),
          f(P + 'ils.dmeResult', L('Résultat DME', 'DME result', 'DME-Ergebnis', 'Resultado DME'), 'select', { options: tolerance, blank: true }),
          f(P + 'ils.coverage', L('Couverture', 'Coverage', 'Abdeckung', 'Cobertura'))
        ]
      },
      {
        id: 'fi-vor', title: L('VOR / DME / TACAN / NDB', 'VOR / DME / TACAN / NDB'), when: is('VOR', 'DME', 'TACAN', 'NDB'),
        fields: [
          f(P + 'nav.station', L('Station', 'Station', 'Station', 'Estación'), 'text', { upper: true }), f(P + 'nav.radial', L('Radiale contrôlée (°)', 'Radial checked (°)', 'Geprüftes Radial (°)', 'Radial comprobado (°)'), 'number'),
          f(P + 'nav.altitudeFt', L('Altitude (ft)', 'Altitude (ft)', 'Höhe (ft)', 'Altitud (ft)'), 'number'), f(P + 'nav.distanceNm', L('Distance (NM)', 'Distance (NM)', 'Entfernung (NM)', 'Distancia (NM)'), 'number'),
          f(P + 'nav.orbit', L('Orbite', 'Orbit', 'Orbit', 'Órbita')), f(P + 'nav.coverage', L('Couverture du signal', 'Signal coverage', 'Signalabdeckung', 'Cobertura de la señal')),
          f(P + 'nav.bearingError', L('Erreur de relèvement (°)', 'Bearing error (°)', 'Peilfehler (°)', 'Error de marcación (°)'), 'number'),
          f(P + 'nav.distanceError', L('Erreur de distance (NM)', 'Distance error (NM)', 'Entfernungsfehler (NM)', 'Error de distancia (NM)'), 'number')
        ]
      },
      {
        id: 'fi-procedure', title: L('Validation de procédure', 'Procedure validation', 'Verfahrensvalidierung', 'Validación de procedimiento'), when: is('PROCEDURE_VALIDATION', 'RNAV_GNSS'),
        fields: [
          f(P + 'proc.segment', L('Segment', 'Segment', 'Segment', 'Segmento')), f(P + 'proc.waypoint', L('Point de cheminement', 'Waypoint', 'Wegpunkt', 'Punto de ruta'), 'text', { upper: true }),
          f(P + 'proc.altitude', L('Altitude', 'Altitude', 'Höhe', 'Altitud')), f(P + 'proc.track', L('Route (°)', 'Track (°)', 'Kurs über Grund (°)', 'Derrota (°)'), 'number'),
          f(P + 'proc.flyability', L('Volabilité', 'Flyability', 'Fliegbarkeit', 'Volabilidad'), 'select', { options: flyability, blank: true }),
          f(P + 'proc.obstacles', L('Observation obstacles', 'Obstacle observation', 'Hindernisbeobachtung', 'Observación de obstáculos'), 'text', { full: true }),
          f(P + 'proc.coding', L('Observation codage', 'Coding observation', 'Codierungsbeobachtung', 'Observación de codificación'), 'text', { full: true })
        ]
      },
      {
        id: 'fi-lighting', title: L('Aides visuelles / balisage', 'Visual aids / lighting', 'Sichthilfen / Befeuerung', 'Ayudas visuales / balizamiento'), when: is('PAPI_VASI', 'AIRPORT_LIGHTING'),
        fields: [
          f(P + 'light.system', L('Système', 'System', 'System', 'Sistema')), f(P + 'light.angle', L('Calage (°)', 'Angle setting (°)', 'Einstellwinkel (°)', 'Ángulo de reglaje (°)'), 'number'),
          f(P + 'light.result', L('Résultat', 'Result', 'Ergebnis', 'Resultado'), 'select', { options: tolerance, blank: true })
        ]
      },
      {
        id: 'fi-conclusion', title: L('Conclusion du contrôle', 'Inspection conclusion', 'Prüfergebnis', 'Conclusión de la inspección'),
        fields: [
          f(P + 'facilityStatus', L('État de l’installation', 'Facility status', 'Anlagenstatus', 'Estado de la instalación'), 'select', { options: status, blank: true }),
          f(P + 'restrictions', L('Restrictions', 'Restrictions', 'Einschränkungen', 'Restricciones'), 'text', { when: ctx => ctx.mission.missionData?.fi?.facilityStatus === 'RESTRICTED' }),
          f(P + 'nextInspection', L('Prochain contrôle', 'Next inspection', 'Nächste Prüfung', 'Próxima inspección'), 'date')
        ]
      }
    ],
    stats: [
      { id: 'facilities', label: L('Installations contrôlées', 'Facilities inspected', 'Geprüfte Anlagen', 'Instalaciones inspeccionadas'), value: ms => new Set(ms.map(m => fi(m).facilityId || fi(m).facility).filter(Boolean)).size },
      { id: 'passes', label: L('Passes', 'Passes', 'Anflüge', 'Pasadas'), value: ms => ms.reduce((a, m) => a + passes(m).length, 0) },
      { id: 'anomalies', label: L('Anomalies / hors tolérances', 'Anomalies / out of tolerance', 'Abweichungen / außer Toleranz', 'Anomalías / fuera de tolerancias'), value: ms => ms.reduce((a, m) => a + passes(m).filter(p => p.result === 'OUT_OF_TOLERANCE' || p.anomaly).length, 0) },
      { id: 'serviceable', label: L('En service', 'Serviceable', 'Betriebsbereit', 'En servicio'), value: ms => ms.filter(m => fi(m).facilityStatus === 'SERVICEABLE').length },
      { id: 'unserviceable', label: L('Hors service', 'Unserviceable', 'Außer Betrieb', 'Fuera de servicio'), value: ms => ms.filter(m => fi(m).facilityStatus === 'UNSERVICEABLE').length }
    ],
    summary: (() => {
      const build = w => h => {
        const m = h.mission, d = fi(m), s = h.stats, ps = passes(m), out = ps.filter(p => p.result === 'OUT_OF_TOLERANCE').length;
        const type = h.pick(inspectionTypes.find(o => o.value === d.inspectionType)?.label), st = h.pick(status.find(o => o.value === d.facilityStatus)?.label);
        const target = [d.facility || h.series, d.facilityId && `(${d.facilityId}${d.frequency ? ` ${d.frequency}` : ''})`, d.runway && `${w.runway} ${d.runway}`, (d.icao || d.airport) && `${w.at} ${d.icao || d.airport}`].filter(Boolean).join(' ');
        return h.sentence(
          `${w.inspection}${type ? ` ${String(type).toLowerCase()}` : ''} ${target}`, h.date && `${w.on} ${h.date}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, '.',
          ps.length && `${w.passes(ps.length, out)}.`, st && `${w.status} ${String(st).toLowerCase()}${d.restrictions && d.facilityStatus === 'RESTRICTED' ? ` (${d.restrictions})` : ''}.`,
          d.nextInspection && `${w.next} ${h.formatDate(d.nextInspection)}.`, s.flightMinutes != null && `${w.flight} ${h.duration(s.flightMinutes)}.`);
      };
      return {
        fr: build({ inspection: 'Contrôle en vol', on: 'du', by: 'réalisé par', and: 'et', runway: 'piste', at: 'à', passes: (n, o) => `${n} passe(s), ${o} hors tolérances`, status: 'Installation déclarée', next: 'Prochain contrôle le', flight: 'Temps de vol' }),
        en: build({ inspection: 'Flight inspection', on: 'on', by: 'flown by', and: 'and', runway: 'runway', at: 'at', passes: (n, o) => `${n} pass(es), ${o} out of tolerance`, status: 'Facility declared', next: 'Next inspection on', flight: 'Flight time' }),
        de: build({ inspection: 'Flugvermessung', on: 'am', by: 'durchgeführt mit', and: 'und', runway: 'Piste', at: 'in', passes: (n, o) => `${n} Anflug/Anflüge, ${o} außerhalb der Toleranz`, status: 'Anlage erklärt als', next: 'Nächste Prüfung am', flight: 'Flugzeit' }),
        es: build({ inspection: 'Inspección en vuelo', on: 'del', by: 'realizada por', and: 'y', runway: 'pista', at: 'en', passes: (n, o) => `${n} pasada(s), ${o} fuera de tolerancias`, status: 'Instalación declarada', next: 'Próxima inspección el', flight: 'Tiempo de vuelo' })
      };
    })()
  });
})();
