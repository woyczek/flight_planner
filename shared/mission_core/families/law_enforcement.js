(() => {
  'use strict';
  // Famille LAW ENFORCEMENT (§7) : observation police / gendarmerie, frontières, douane,
  // trafic, poursuite, personne disparue, appui tactique, sécurité d'événement.
  // Les champs marqués `sensitive` (objectif, fréquences, positions de suivi…) sont
  // retirés de la « version publique » du CR et de son export (MissionModel.redact).
  const V = window.MissionVocab, L = V.L, opt = V.opt;
  const f = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });
  const P = 'missionData.le.';
  const S = { sensitive: true };
  const objectiveTypes = [opt('PERSON', L('Personne', 'Person', 'Person', 'Persona')), opt('VEHICLE', L('Véhicule', 'Vehicle', 'Fahrzeug', 'Vehículo')), opt('VESSEL', L('Navire / embarcation', 'Vessel', 'Schiff / Boot', 'Buque / embarcación')), opt('AIRCRAFT', L('Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave')), opt('GROUP', L('Groupe', 'Group', 'Gruppe', 'Grupo')), opt('AREA', L('Zone / site', 'Area / site', 'Gebiet / Objekt', 'Zona / sitio'))];
  const identification = [opt('POSITIVE', L('Positive', 'Positive', 'Positiv', 'Positiva')), opt('PROBABLE', L('Probable', 'Probable', 'Wahrscheinlich', 'Probable')), opt('NEGATIVE', L('Négative', 'Negative', 'Negativ', 'Negativa')), opt('NOT_ACHIEVED', L('Non obtenue', 'Not achieved', 'Nicht erreicht', 'No obtenida'))];
  const le = m => m.missionData?.le || {};
  const track = m => (le(m).track || []).filter(p => p.time || p.position);
  const between = window.MissionModel.between;

  window.MissionCore.registerFamily({
    id: 'LE', idPrefix: 'LE',
    pages: { cr: 'le_cr.html', reporting: 'le_reporting.html' },
    title: L('Missions de police / sécurité', 'Law enforcement', 'Polizei / Sicherheit', 'Misiones policiales / seguridad'),
    series: [
      { value: 'POLICE_OBSERVATION', label: L('Observation police', 'Police observation', 'Polizeiliche Beobachtung', 'Observación policial') }, { value: 'GENDARMERIE', label: L('Gendarmerie', 'Gendarmerie', 'Gendarmerie', 'Gendarmería') },
      { value: 'BORDER', label: L('Surveillance des frontières', 'Border surveillance', 'Grenzüberwachung', 'Vigilancia de fronteras') }, { value: 'CUSTOMS', label: L('Douane', 'Customs', 'Zoll', 'Aduana') },
      { value: 'TRAFFIC', label: L('Circulation routière', 'Traffic', 'Verkehrsüberwachung', 'Tráfico') }, { value: 'PURSUIT', label: L('Poursuite', 'Pursuit', 'Verfolgung', 'Persecución') },
      { value: 'MISSING_PERSON', label: L('Personne disparue', 'Missing person', 'Vermisste Person', 'Persona desaparecida') }, { value: 'TACTICAL_SUPPORT', label: L('Appui tactique', 'Tactical support', 'Taktische Unterstützung', 'Apoyo táctico') },
      { value: 'EVENT_SECURITY', label: L('Sécurité d’événement', 'Event security', 'Veranstaltungsschutz', 'Seguridad de eventos') }
    ],
    events: [opt('ACQUISITION', L('Acquisition de l’objectif', 'Target acquired', 'Ziel erfasst', 'Objetivo adquirido')), opt('CONTACT_LOST', L('Perte de contact', 'Contact lost', 'Kontakt verloren', 'Contacto perdido')), opt('HANDOVER', L('Passage de relais au sol', 'Handover to ground units', 'Übergabe an Bodenkräfte', 'Relevo a unidades de tierra'))],
    blocks: [
      {
        id: 'le-tasking', title: L('Autorité et coordination', 'Authority and coordination', 'Behörde und Koordination', 'Autoridad y coordinación'),
        fields: [
          f(P + 'authority', L('Autorité requérante', 'Requesting authority', 'Anfordernde Behörde', 'Autoridad solicitante')), f(P + 'groundUnit', L('Unité au sol', 'Ground unit', 'Bodeneinheit', 'Unidad en tierra')),
          f(P + 'caseNumber', L('Numéro de mission / affaire', 'Mission / case number', 'Einsatz- / Aktenzeichen', 'Número de misión / caso'), 'text', { upper: true, ...S }),
          f(P + 'groundContact', L('Contact sol (indicatif)', 'Ground contact (callsign)', 'Bodenkontakt (Rufzeichen)', 'Contacto en tierra (indicativo)'), 'text', { upper: true, ...S }),
          f(P + 'frequency', L('Fréquence', 'Frequency', 'Frequenz', 'Frecuencia'), 'text', S),
          f(P + 'coordination', L('Coordination avec les unités sol', 'Coordination with ground units', 'Koordination mit Bodenkräften', 'Coordinación con unidades de tierra'), 'textarea', { full: true, ...S })
        ]
      },
      {
        id: 'le-objective', title: L('Objectif', 'Objective', 'Ziel', 'Objetivo'),
        fields: [
          f(P + 'objectiveType', L('Type d’objectif', 'Objective type', 'Zielart', 'Tipo de objetivo'), 'select', { options: objectiveTypes, blank: true }),
          f(P + 'objectiveDescription', L('Description de l’objectif', 'Objective description', 'Zielbeschreibung', 'Descripción del objetivo'), 'textarea', { full: true, ...S }),
          f(P + 'zone', L('Zone', 'Area', 'Gebiet', 'Zona')), f(P + 'initialPoint', L('Point initial', 'Initial point', 'Ausgangspunkt', 'Punto inicial'), 'text', S),
          f(P + 'acquisitionTime', L('Heure d’acquisition', 'Acquisition time', 'Erfassungszeit', 'Hora de adquisición'), 'time'), f(P + 'lossTime', L('Heure de perte de contact', 'Contact lost time', 'Kontaktverlust', 'Hora de pérdida de contacto'), 'time'),
          f(P + 'identification', L('Identification', 'Identification', 'Identifizierung', 'Identificación'), 'select', { options: identification, blank: true })
        ]
      },
      {
        id: 'le-track', title: L('Positions successives', 'Successive positions', 'Aufeinanderfolgende Positionen', 'Posiciones sucesivas'),
        collection: {
          path: P + 'track', min: 0, compact: true, item: L('Position', 'Position', 'Position', 'Posición'), add: L('+ Ajouter une position', '+ Add position', '+ Position hinzufügen', '+ Añadir posición'),
          empty: () => ({ time: '', position: '', heading: null, speed: null, remark: '' }),
          fields: [f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('position', L('Position', 'Position', 'Position', 'Posición'), 'text', S), f('heading', L('Cap', 'Heading', 'Kurs', 'Rumbo'), 'number'), f('speed', L('Vitesse', 'Speed', 'Geschwindigkeit', 'Velocidad'), 'number'), f('remark', L('Remarque', 'Remark', 'Bemerkung', 'Observación'), 'text', S)]
        }
      }
    ],
    stats: [
      { id: 'trackings', label: L('Suivis', 'Trackings', 'Verfolgungen', 'Seguimientos'), value: ms => ms.filter(m => le(m).acquisitionTime).length },
      { id: 'trackTime', label: L('Durée de suivi', 'Tracking time', 'Verfolgungsdauer', 'Duración del seguimiento'), format: 'duration', value: ms => ms.reduce((a, m) => a + (between(le(m).acquisitionTime, le(m).lossTime) || 0), 0) },
      { id: 'identified', label: L('Identifications positives', 'Positive identifications', 'Positive Identifizierungen', 'Identificaciones positivas'), value: ms => ms.filter(m => le(m).identification === 'POSITIVE').length }
    ],
    // Résumé : ne cite aucune donnée sensible (description, positions, fréquences).
    summary: (() => {
      const build = w => h => {
        const m = h.mission, d = le(m), s = h.stats, dur = between(d.acquisitionTime, d.lossTime), idf = h.pick(identification.find(o => o.value === d.identification)?.label);
        const obj = h.pick(objectiveTypes.find(o => o.value === d.objectiveType)?.label);
        return h.sentence(
          `${h.series || w.mission}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, d.authority && `${w.for} ${d.authority}`, d.zone && `${w.over} ${d.zone}`, '.',
          obj && `${w.objective} ${String(obj).toLowerCase()}.`, d.acquisitionTime && `${w.acquired} ${d.acquisitionTime}${dur != null ? `, ${w.tracked} ${h.duration(dur)}` : ''}.`,
          idf && `${w.identification} ${String(idf).toLowerCase()}.`, track(m).length && `${w.positions(track(m).length)}.`,
          s.flightMinutes != null && `${w.flight} ${h.duration(s.flightMinutes)}.`, h.outcome && `${w.outcome} ${h.outcome}.`);
      };
      return {
        fr: build({ mission: 'Mission de police', on: 'du', by: 'réalisée par', and: 'et', for: 'au profit de', over: 'sur', objective: 'Objectif :', acquired: 'Acquisition à', tracked: 'suivi pendant', identification: 'Identification', positions: n => `${n} position(s) transmise(s)`, flight: 'Temps de vol', outcome: 'Résultat :' }),
        en: build({ mission: 'Law enforcement mission', on: 'on', by: 'flown by', and: 'and', for: 'for', over: 'over', objective: 'Objective:', acquired: 'Acquired at', tracked: 'tracked for', identification: 'Identification', positions: n => `${n} position(s) reported`, flight: 'Flight time', outcome: 'Outcome:' }),
        de: build({ mission: 'Polizeieinsatz', on: 'am', by: 'durchgeführt mit', and: 'und', for: 'für', over: 'über', objective: 'Ziel:', acquired: 'Erfassung um', tracked: 'verfolgt während', identification: 'Identifizierung', positions: n => `${n} Position(en) gemeldet`, flight: 'Flugzeit', outcome: 'Ergebnis:' }),
        es: build({ mission: 'Misión policial', on: 'del', by: 'realizada por', and: 'y', for: 'para', over: 'sobre', objective: 'Objetivo:', acquired: 'Adquisición a las', tracked: 'seguido durante', identification: 'Identificación', positions: n => `${n} posición(es) transmitida(s)`, flight: 'Tiempo de vuelo', outcome: 'Resultado:' })
      };
    })()
  });
})();
