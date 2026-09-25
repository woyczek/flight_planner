(() => {
  'use strict';
  // Famille HEMS / MEDEVAC reconstruite sur le Mission Report Core (étape 2a) : mêmes
  // champs que le CR HEMS historique (HEMS/hems_medevac_cr.html), plus le modèle commun.
  // legacy.fromRecord convertit une ligne de l'ancien registre CSV ou un ancien JSON
  // (valeurs françaises historiques comprises) vers le modèle commun.
  const V = window.MissionVocab,
    L = V.L,
    opt = V.opt;
  /** Définition d'un champ de la famille : chemin dans la mission, libellé [fr, en, de, es], type, options (extra). */
  const f = (path, label, type = 'text', extra = {}) => ({
    path,
    label,
    type,
    ...extra
  });
  const P = 'missionData.hems.';
  /** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
  const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
  const services = [opt('SAMU / SMUR', L('SAMU / SMUR', 'SAMU / SMUR')), opt('Civil Security', L('Sécurité civile', 'Civil Security', 'Zivilschutz', 'Protección Civil')), opt('Private HEMS', L('HEMS privé', 'Private HEMS', 'Privater HEMS', 'HEMS privado')), opt('Gendarmerie / rescue', L('Gendarmerie / secours', 'Gendarmerie / rescue', 'Gendarmerie / Rettung', 'Gendarmería / rescate')), opt('Other', L('Autre', 'Other', 'Andere', 'Otro'))];
  const outcomes = [opt('Completed', L('Terminée', 'Completed', 'Abgeschlossen', 'Finalizada')), opt('Patient transported', L('Patient transporté', 'Patient transported', 'Patient transportiert', 'Paciente transportado')), opt('Mission cancelled', L('Mission annulée', 'Mission cancelled', 'Einsatz abgebrochen', 'Misión cancelada')), opt('Not dispatched', L('Non engagement', 'Not dispatched', 'Nicht eingesetzt', 'Sin activación')), opt('Diverted', L('Déroutée', 'Diverted', 'Umgeleitet', 'Desviada')), opt('Interrupted', L('Interrompue', 'Interrupted', 'Unterbrochen', 'Interrumpida'))];
  const medicalization = [opt('Physician-staffed', L('Médicalisée', 'Physician-staffed', 'Ärztlich besetzt', 'Medicalizada')), opt('Paramedic-staffed', L('Paramédicalisée', 'Paramedic-staffed', 'Rettungsdienstlich besetzt', 'Paramedicalizada')), opt('Not medically staffed', L('Non médicalisée', 'Not medically staffed', 'Nicht medizinisch besetzt', 'No medicalizada')), opt('Not applicable', L('Non applicable', 'Not applicable', 'Nicht zutreffend', 'No aplicable'))];
  // Anciennes valeurs françaises des listes HEMS → valeurs de référence (cf. mission_values.js).
  const LEGACY = {
    'Sécurité civile': 'Civil Security',
    'HEMS privé': 'Private HEMS',
    'Gendarmerie / secours': 'Gendarmerie / rescue',
    'Autre': 'Other',
    'HEMS primaire': 'Primary HEMS',
    'Transfert interhospitalier (MEDEVAC)': 'Interhospital transfer (MEDEVAC)',
    'Secours / sauvetage': 'Rescue',
    'Recherche / évacuation': 'Search / evacuation',
    'Transport spécialisé': 'Specialized transport',
    'Entraînement': 'Training',
    'Terminée': 'Completed',
    'Patient transporté': 'Patient transported',
    'Mission annulée': 'Mission cancelled',
    'Non engagement': 'Not dispatched',
    'Déroutée': 'Diverted',
    'Interrompue': 'Interrupted',
    'Médicalisée': 'Physician-staffed',
    'Paramédicalisée': 'Paramedic-staffed',
    'Non médicalisée': 'Not medically staffed',
    'Non applicable': 'Not applicable',
    'Déclenchement': 'Dispatch',
    'Décollage': 'Take-off',
    'Arrivée zone': 'On-scene arrival',
    'Pose': 'Touchdown',
    'Treuil': 'Winch',
    'Prise en charge': 'Patient contact',
    'Départ zone': 'Scene departure',
    'Arrivée destination': 'Destination arrival',
    'Annulation': 'Cancellation',
    'Anomalie': 'Issue'
  };
  /** Valeur de référence d'une ancienne valeur française (anciens registres CSV / JSON). */
  const norm = v => LEGACY[String(v ?? '').trim()] ?? String(v ?? '').trim();
  const OUTCOME = {
    'Completed': 'SUCCESS',
    'Patient transported': 'SUCCESS',
    'Mission cancelled': 'CANCELLED',
    'Not dispatched': 'CANCELLED',
    'Diverted': 'DIVERTED',
    'Interrupted': 'ABORTED'
  };
  const EVENT = {
    'Dispatch': 'DISPATCH',
    'Take-off': 'TAKEOFF',
    'On-scene arrival': 'ON_TASK',
    'Touchdown': 'LANDING',
    'Winch': 'HOIST',
    'Patient contact': 'PATIENT_CONTACT',
    'Scene departure': 'OFF_TASK',
    'Destination arrival': 'DESTINATION_ARRIVAL',
    'Cancellation': 'ABORT',
    'Issue': 'TECHNICAL',
    'Engine start': 'ENGINE_START',
    'Final landing': 'LANDING',
    'Mission end / engine shutdown': 'SHUTDOWN'
  };
  const hems = m => m.missionData?.hems || {};
  const between = window.MissionModel.between;

  window.MissionCore.registerFamily({
    id: 'HEMS',
    idPrefix: 'HEMS',
    defaultCategory: 'rotary',
    // Étapes génériques inutiles (destinations HEMS dédiées).
    hide: ['legs'],
    pages: {
      cr: 'hems_core_cr.html',
      reporting: 'hems_core_reporting.html'
    },
    title: L('HEMS / MEDEVAC', 'HEMS / MEDEVAC'),
    series: [{
      value: 'Primary HEMS',
      label: L('HEMS primaire', 'Primary HEMS', 'Primärer HEMS-Einsatz', 'HEMS primario')
    }, {
      value: 'Interhospital transfer (MEDEVAC)',
      label: L('Transfert interhospitalier (MEDEVAC)', 'Interhospital transfer (MEDEVAC)', 'Interhospitaltransfer (MEDEVAC)', 'Traslado interhospitalario (MEDEVAC)')
    }, {
      value: 'Rescue',
      label: L('Secours / sauvetage', 'Rescue', 'Rettung', 'Socorro / rescate')
    }, {
      value: 'Search / evacuation',
      label: L('Recherche / évacuation', 'Search / evacuation', 'Suche / Evakuierung', 'Búsqueda / evacuación')
    }, {
      value: 'Specialized transport',
      label: L('Transport spécialisé', 'Specialized transport', 'Spezialtransport', 'Transporte especializado')
    }, {
      value: 'Training',
      label: L('Entraînement', 'Training', 'Training', 'Entrenamiento')
    }],
    crewRoles: ['PIC', 'COPILOT', 'DOCTOR', 'NURSE', 'WINCH_OPERATOR', 'RESCUE_SWIMMER', 'TECHNICIAN', 'OBSERVER', 'OTHER'],
    events: [
      opt('DISPATCH', L('Déclenchement', 'Dispatch', 'Alarmierung', 'Activación')), opt('ENGINE_START', L('Mise en route', 'Engine start', 'Anlassen', 'Puesta en marcha')),
      opt('PATIENT_CONTACT', L('Prise en charge', 'Patient contact', 'Patientenübernahme', 'Atención al paciente')), opt('DESTINATION_ARRIVAL', L('Arrivée destination', 'Destination arrival', 'Ankunft Zielort', 'Llegada a destino')),
      opt('SHUTDOWN', L('Fin mission / arrêt moteurs', 'Mission end / engine shutdown', 'Einsatzende / Triebwerksstopp', 'Fin de misión / parada de motores'))
    ],
    blocks: [{
      id: 'hems-service',
      title: L('Service et statut', 'Service and status', 'Dienst und Status', 'Servicio y estado'),
      fields: [
        f(P + 'service', L('Organisme / service', 'Organisation / service', 'Organisation / Dienst', 'Organismo / servicio'), 'select', {
          options: services,
          blank: true
        }),
        f(P + 'outcome', L('Statut mission', 'Mission status', 'Einsatzstatus', 'Estado de la misión'), 'select', {
          options: outcomes,
          blank: true
        }),
        f(P + 'resources', L('Équipes / vecteurs engagés', 'Teams / assets engaged', 'Eingesetzte Teams / Mittel', 'Equipos / medios desplegados'), 'text', {
          full: true
        })
      ]
    }, {
      id: 'hems-medical',
      title: L('Mission médicale', 'Medical mission', 'Medizinischer Einsatz', 'Misión médica'),
      fields: [
        f(P + 'incidentType', L('Nature de l’intervention', 'Incident type', 'Einsatzart', 'Tipo de intervención')), f(P + 'patientProfile', L('Patient / victime (anonymisé)', 'Patient / victim (anonymised)', 'Patient / Opfer (anonymisiert)', 'Paciente / víctima (anonimizado)')),
        f(P + 'medicalization', L('Médicalisation', 'Medical staffing', 'Medizinische Besetzung', 'Medicalización'), 'select', {
          options: medicalization,
          blank: true
        }),
        f(P + 'patients', L('Victimes transportées', 'Casualties transported', 'Beförderte Patienten', 'Víctimas transportadas'), 'number'),
        f(P + 'sceneLocation', L('Lieu / zone', 'Scene location', 'Einsatzort', 'Lugar / zona')), f(P + 'coordinates', L('Coordonnées', 'Coordinates', 'Koordinaten', 'Coordenadas')),
        f(P + 'conditions', L('Conditions opérationnelles', 'Operational conditions', 'Einsatzbedingungen', 'Condiciones operativas')), f(P + 'weatherRemarks', L('Conditions météo / visibilité', 'Weather / visibility', 'Wetter / Sicht', 'Meteorología / visibilidad')),
        f(P + 'densityAltitude', L('Altitude-densité', 'Density altitude', 'Dichtehöhe', 'Altitud de densidad')),
        f(P + 'medicalNotes', L('Événements médicaux (anonymisés)', 'Medical events (anonymised)', 'Medizinische Ereignisse (anonymisiert)', 'Eventos médicos (anonimizados)'), 'textarea', {
          full: true
        })
      ]
    }, {
      id: 'hems-times',
      title: L('Horaires HEMS', 'HEMS times', 'HEMS-Zeiten', 'Horarios HEMS'),
      fields: [
        f(P + 'alert', L('Alerte', 'Alert', 'Alarm', 'Alerta'), 'time'), f(P + 'patientContact', L('Prise en charge', 'Patient contact', 'Patientenübernahme', 'Atención al paciente'), 'time'),
        f(P + 'destinationArrival', L('Arrivée destination', 'Destination arrival', 'Ankunft Zielort', 'Llegada a destino'), 'time')
      ]
    }, {
      id: 'hems-destinations',
      title: L('Destinations / étapes', 'Destinations / stops', 'Ziele / Zwischenstopps', 'Destinos / escalas'),
      collection: {
        path: P + 'destinations',
        min: 0,
        compact: true,
        item: L('Destination', 'Destination', 'Ziel', 'Destino'),
        add: L('+ Ajouter une destination', '+ Add destination', '+ Ziel hinzufügen', '+ Añadir destino'),
        empty: () => ({
          name: '',
          arrival: '',
          departure: '',
          note: ''
        }),
        fields: [f('name', L('Destination', 'Destination', 'Ziel', 'Destino')), f('arrival', L('Arrivée', 'Arrival', 'Ankunft', 'Llegada'), 'time'), f('departure', L('Départ', 'Departure', 'Abflug', 'Salida'), 'time'), f('note', L('Remarque', 'Note', 'Bemerkung', 'Observación'))]
      }
    }],
    stats: [{
      id: 'patients',
      label: L('Patients transportés', 'Patients transported', 'Transportierte Patienten', 'Pacientes transportados'),
      value: ms => ms.reduce((a, m) => a + (num(hems(m).patients) || 0), 0)
    }, {
      id: 'completed',
      label: L('Missions terminées', 'Missions completed', 'Abgeschlossene Einsätze', 'Misiones finalizadas'),
      value: ms => ms.filter(m => ['Completed', 'Patient transported'].includes(hems(m).outcome)).length
    }, {
      id: 'alertTakeoff',
      label: L('Alerte → décollage (moyenne)', 'Alert → take-off (average)', 'Alarm → Start (Mittel)', 'Alerta → despegue (media)'),
      format: 'duration',
      value: ms => {
        const v = ms.map(m => between(hems(m).alert, m.timeline?.takeoff)).filter(x => x != null);
        return v.length ? Math.round(v.reduce((a, x) => a + x, 0) / v.length) : 0;
      }
    }, {
      id: 'within15',
      label: L('Alerte → décollage ≤ 15 min', 'Alert → take-off ≤ 15 min', 'Alarm → Start ≤ 15 min', 'Alerta → despegue ≤ 15 min'),
      value: ms => ms.filter(m => {
        const d = between(hems(m).alert, m.timeline?.takeoff);
        return d != null && d <= 15;
      }).length
    }],
    summary: (() => {
      /** Modèle du résumé automatique (§22) : w = mots de liaison d'une langue, h = outils du résumé (MissionReport.helpers : mission, statistiques, appareils, listes, dates) → texte du résumé ; les morceaux dont une donnée manque sont omis. */
      const build = w => h => {
        const m = h.mission,
          d = hems(m),
          s = h.stats,
          delay = between(d.alert, m.timeline?.takeoff),
          dest = (d.destinations || []).map(x => x.name).filter(Boolean);
        const status = h.pick(outcomes.find(o => o.value === d.outcome)?.label);
        return h.sentence(
          `${h.series || 'HEMS'}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, h.lead.baseDeparture && `${w.from} ${h.lead.baseDeparture}`, '.',
          delay != null && `${w.delay} ${h.duration(delay)}.`, d.sceneLocation && `${w.scene} ${d.sceneLocation}${s.timeOnStationMinutes != null ? ` (${h.duration(s.timeOnStationMinutes)})` : ''}.`,
          num(d.patients) && `${w.patients(num(d.patients))}${dest.length ? ` ${w.to} ${dest.join(', ')}` : ''}.`,
          s.flightMinutes != null && `${w.flight} ${h.duration(s.flightMinutes)}.`, status && `${w.status} ${String(status).toLowerCase()}.`);
      };
      return {
        fr: build({
          on: 'du',
          by: 'réalisée par',
          and: 'et',
          from: 'depuis',
          delay: 'Délai alerte → décollage',
          scene: 'Intervention sur',
          patients: n => `${n} victime(s) transportée(s)`,
          to: 'vers',
          flight: 'Temps de vol',
          status: 'Mission'
        }),
        en: build({
          on: 'on',
          by: 'flown by',
          and: 'and',
          from: 'from',
          delay: 'Alert → take-off',
          scene: 'On scene at',
          patients: n => `${n} casualty(ies) transported`,
          to: 'to',
          flight: 'Flight time',
          status: 'Mission'
        }),
        de: build({
          on: 'am',
          by: 'durchgeführt mit',
          and: 'und',
          from: 'ab',
          delay: 'Alarm → Start',
          scene: 'Einsatz in',
          patients: n => `${n} Patient(en) transportiert`,
          to: 'nach',
          flight: 'Flugzeit',
          status: 'Einsatz'
        }),
        es: build({
          on: 'del',
          by: 'realizada por',
          and: 'y',
          from: 'desde',
          delay: 'Alerta → despegue',
          scene: 'Intervención en',
          patients: n => `${n} víctima(s) transportada(s)`,
          to: 'a',
          flight: 'Tiempo de vuelo',
          status: 'Misión'
        })
      };
    })(),
    // Ancien registre CSV (copie navigateur « ledgerName ») et anciens JSON du CR HEMS.
    legacy: {
      configKey: 'ledgerName',
      label: L('Importer l’ancien registre HEMS (CSV)', 'Import legacy HEMS ledger (CSV)', 'Altes HEMS-Register importieren (CSV)', 'Importar el registro HEMS antiguo (CSV)'),
      fromRecord(r, {
        emptyMission,
        set
      }) {
        const m = emptyMission('HEMS'),
          d = {};
        m.metadata.missionId = r.missionId || '';
        m.metadata.date = r.date || '';
        m.series = norm(r.missionType);
        m.aircraft[0] = {
          ...m.aircraft[0],
          type: String(r.aircraft || '').toUpperCase(),
          registration: String(r.registration || '').toUpperCase(),
          callsign: String(r.callsign || '').toUpperCase(),
          baseDeparture: String(r.baseDeparture || '').toUpperCase(),
          category: 'rotary'
        };
        [
          ['captain', 'PIC'],
          ['fo', 'COPILOT'],
          ['doctor', 'DOCTOR'],
          ['nurse', 'NURSE'],
          ['rescuer', 'WINCH_OPERATOR']
        ].forEach(([k, role]) => {
          if (r[k]) m.crew.push({
            role,
            name: r[k],
            aircraft: 1,
            notes: ''
          });
        });
        Object.assign(m.timeline, {
          engineStart: r.engineStart || '',
          takeoff: r.takeoff || '',
          zoneEntry: r.onScene || '',
          zoneExit: r.sceneDeparture || '',
          landing: r.landing || '',
          shutdown: r.engineStop || ''
        });
        Object.assign(m.fuel, {
          unit: r.fuelUnit || 'kg',
          start: num(r.fuelStart),
          landing: num(r.fuelEnd)
        });
        Object.assign(d, {
          service: norm(r.service),
          outcome: norm(r.outcome),
          resources: r.resources || '',
          incidentType: r.incidentType || '',
          patientProfile: r.patientProfile || '',
          medicalization: norm(r.medicalization),
          patients: num(r.patients),
          sceneLocation: r.sceneLocation || '',
          coordinates: r.coordinates || '',
          conditions: r.conditions || '',
          weatherRemarks: r.weather || '',
          densityAltitude: r.densityAltitude || '',
          medicalNotes: r.medicalNotes || '',
          alert: r.alert || '',
          patientContact: r.patientContact || '',
          destinationArrival: r.destinationArrival || '',
          destinations: r.destination ? [{
            name: r.destination,
            arrival: r.destinationArrival || '',
            departure: '',
            note: ''
          }] : []
        });
        m.missionData.hems = d;
        m.results.outcome = OUTCOME[d.outcome] || '';
        m.results.anomalies = r.techNotes || '';
        m.remarks = {
          observations: r.opsNotes || '',
          lessonsLearned: r.lessons || ''
        };
        m.network = {
          onlineNetwork: r.onlineNetwork || '',
          ivaoId: r.ivaoId || '',
          vatsimId: r.vatsimId || '',
          trackerUrl: r.trackerUrl || ''
        };
        if (Array.isArray(r.events)) m.events = r.events.map(e => ({
          timeLocal: e.time || '',
          timeUtc: '',
          type: EVENT[norm(e.type)] || 'OTHER',
          position: e.position || '',
          altitude: null,
          speed: null,
          heading: null,
          fuel: null,
          description: e.note || '',
          result: ''
        }));
        return m;
      }
    }
  });
})();
