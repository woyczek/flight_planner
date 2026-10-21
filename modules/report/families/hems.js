// V3 report — famille HEMS / MEDEVAC, recopiée de la V2 (shared/mission_core/families/hems.js) le 23/10/2026 : séries,
// rôles d'équipage, événements et blocs (service, mission médicale, horaires, destinations), données sous
// missionData.hems. Statistiques, résumé et conversion des anciens registres restent à la V2 (reporting, CPCO).
import {
  L,
  opt
} from '../vocab.js';
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
const services = [opt('SAMU / SMUR', L('SAMU / SMUR', 'SAMU / SMUR')), opt('Civil Security', L('Sécurité civile', 'Civil Security',
    'Zivilschutz', 'Protección Civil')), opt('Private HEMS', L('HEMS privé', 'Private HEMS', 'Privater HEMS', 'HEMS privado')), opt(
    'Gendarmerie / rescue', L('Gendarmerie / secours', 'Gendarmerie / rescue', 'Gendarmerie / Rettung', 'Gendarmería / rescate')),
  opt('Other', L('Autre', 'Other', 'Andere', 'Otro'))
];
const outcomes = [opt('Completed', L('Terminée', 'Completed', 'Abgeschlossen', 'Finalizada')), opt('Patient transported', L(
    'Patient transporté', 'Patient transported', 'Patient transportiert', 'Paciente transportado')), opt('Mission cancelled', L(
    'Mission annulée', 'Mission cancelled', 'Einsatz abgebrochen', 'Misión cancelada')), opt('Not dispatched', L('Non engagement',
    'Not dispatched', 'Nicht eingesetzt', 'Sin activación')), opt('Diverted', L('Déroutée', 'Diverted', 'Umgeleitet', 'Desviada')),
  opt('Interrupted', L('Interrompue', 'Interrupted', 'Unterbrochen', 'Interrumpida'))
];
const medicalization = [opt('Physician-staffed', L('Médicalisée', 'Physician-staffed', 'Ärztlich besetzt', 'Medicalizada')), opt(
  'Paramedic-staffed', L('Paramédicalisée', 'Paramedic-staffed', 'Rettungsdienstlich besetzt', 'Paramedicalizada')), opt(
  'Not medically staffed', L('Non médicalisée', 'Not medically staffed', 'Nicht medizinisch besetzt', 'No medicalizada')), opt(
  'Not applicable', L('Non applicable', 'Not applicable', 'Nicht zutreffend', 'No aplicable'))];

export default {
  id: 'HEMS',
  idPrefix: 'HEMS',
  defaultCategory: 'rotary',
  // Étapes génériques inutiles (destinations HEMS dédiées).
  hide: ['legs'],
  pages: {
    cr: 'hems_medevac_cr.html',
    reporting: 'hems_medevac_reporting.html'
  },
  title: L('HEMS / MEDEVAC', 'HEMS / MEDEVAC'),
  series: [{
    value: 'Primary HEMS',
    label: L('HEMS primaire', 'Primary HEMS', 'Primärer HEMS-Einsatz', 'HEMS primario')
  }, {
    value: 'Interhospital transfer (MEDEVAC)',
    label: L('Transfert interhospitalier (MEDEVAC)', 'Interhospital transfer (MEDEVAC)', 'Interhospitaltransfer (MEDEVAC)',
      'Traslado interhospitalario (MEDEVAC)')
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
    opt('DISPATCH', L('Déclenchement', 'Dispatch', 'Alarmierung', 'Activación')), opt('ENGINE_START', L('Mise en route',
      'Engine start', 'Anlassen', 'Puesta en marcha')),
    opt('PATIENT_CONTACT', L('Prise en charge', 'Patient contact', 'Patientenübernahme', 'Atención al paciente')), opt(
      'DESTINATION_ARRIVAL', L('Arrivée destination', 'Destination arrival', 'Ankunft Zielort', 'Llegada a destino')),
    opt('SHUTDOWN', L('Fin mission / arrêt moteurs', 'Mission end / engine shutdown', 'Einsatzende / Triebwerksstopp',
      'Fin de misión / parada de motores'))
  ],
  blocks: [{
    id: 'hems-service',
    title: L('Service et statut', 'Service and status', 'Dienst und Status', 'Servicio y estado'),
    fields: [
      f(P + 'service', L('Organisme / service', 'Organisation / service', 'Organisation / Dienst', 'Organismo / servicio'),
        'select', {
          options: services,
          blank: true
        }),
      f(P + 'outcome', L('Statut mission', 'Mission status', 'Einsatzstatus', 'Estado de la misión'), 'select', {
        options: outcomes,
        blank: true
      }),
      f(P + 'resources', L('Équipes / vecteurs engagés', 'Teams / assets engaged', 'Eingesetzte Teams / Mittel',
        'Equipos / medios desplegados'), 'text', {
        full: true
      })
    ]
  }, {
    id: 'hems-medical',
    title: L('Mission médicale', 'Medical mission', 'Medizinischer Einsatz', 'Misión médica'),
    fields: [
      f(P + 'incidentType', L('Nature de l’intervention', 'Incident type', 'Einsatzart', 'Tipo de intervención')), f(P +
        'patientProfile', L('Patient / victime (anonymisé)', 'Patient / victim (anonymised)',
          'Patient / Opfer (anonymisiert)', 'Paciente / víctima (anonimizado)')),
      f(P + 'medicalization', L('Médicalisation', 'Medical staffing', 'Medizinische Besetzung', 'Medicalización'), 'select', {
        options: medicalization,
        blank: true
      }),
      f(P + 'patients', L('Victimes transportées', 'Casualties transported', 'Beförderte Patienten',
        'Víctimas transportadas'), 'number'),
      f(P + 'sceneLocation', L('Lieu / zone', 'Scene location', 'Einsatzort', 'Lugar / zona')), f(P + 'coordinates', L(
        'Coordonnées', 'Coordinates', 'Koordinaten', 'Coordenadas')),
      f(P + 'conditions', L('Conditions opérationnelles', 'Operational conditions', 'Einsatzbedingungen',
        'Condiciones operativas')), f(P + 'weatherRemarks', L('Conditions météo / visibilité', 'Weather / visibility',
        'Wetter / Sicht', 'Meteorología / visibilidad')),
      f(P + 'densityAltitude', L('Altitude-densité', 'Density altitude', 'Dichtehöhe', 'Altitud de densidad')),
      f(P + 'medicalNotes', L('Événements médicaux (anonymisés)', 'Medical events (anonymised)',
        'Medizinische Ereignisse (anonymisiert)', 'Eventos médicos (anonimizados)'), 'textarea', {
        full: true
      })
    ]
  }, {
    id: 'hems-times',
    title: L('Horaires HEMS', 'HEMS times', 'HEMS-Zeiten', 'Horarios HEMS'),
    fields: [
      f(P + 'alert', L('Alerte', 'Alert', 'Alarm', 'Alerta'), 'time'), f(P + 'patientContact', L('Prise en charge',
        'Patient contact', 'Patientenübernahme', 'Atención al paciente'), 'time'),
      f(P + 'destinationArrival', L('Arrivée destination', 'Destination arrival', 'Ankunft Zielort', 'Llegada a destino'),
        'time')
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
      fields: [f('name', L('Destination', 'Destination', 'Ziel', 'Destino')), f('arrival', L('Arrivée', 'Arrival', 'Ankunft',
        'Llegada'), 'time'), f('departure', L('Départ', 'Departure', 'Abflug', 'Salida'), 'time'), f('note', L('Remarque',
        'Note', 'Bemerkung', 'Observación'))]
    }
  }]
};
