// V3 report — famille LE, recopiée de la V2 (shared/mission_core/families/law_enforcement.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille LAW ENFORCEMENT (§7) : observation police / gendarmerie, frontières, douane,
// trafic, poursuite, personne disparue, appui tactique, sécurité d'événement.
// Les champs marqués `sensitive` (objectif, fréquences, positions de suivi…) sont
// retirés de la « version publique » du CR et de son export (MissionModel.redact).
const V = Vocab,
  L = V.L,
  opt = V.opt;
/** Définition d'un champ de la famille : chemin dans la mission, libellé [fr, en, de, es], type, options (extra). */
const f = (path, label, type = 'text', extra = {}) => ({
  path,
  label,
  type,
  ...extra
});
const P = 'missionData.le.';
const S = {
  sensitive: true
};
const objectiveTypes = [opt('PERSON', L('Personne', 'Person', 'Person', 'Persona')), opt('VEHICLE', L('Véhicule', 'Vehicle', 'Fahrzeug',
  'Vehículo')), opt('VESSEL', L('Navire / embarcation', 'Vessel', 'Schiff / Boot', 'Buque / embarcación')), opt('AIRCRAFT', L(
  'Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave')), opt('GROUP', L('Groupe', 'Group', 'Gruppe', 'Grupo')), opt('AREA', L(
  'Zone / site', 'Area / site', 'Gebiet / Objekt', 'Zona / sitio'))];
const identification = [opt('POSITIVE', L('Positive', 'Positive', 'Positiv', 'Positiva')), opt('PROBABLE', L('Probable', 'Probable',
  'Wahrscheinlich', 'Probable')), opt('NEGATIVE', L('Négative', 'Negative', 'Negativ', 'Negativa')), opt('NOT_ACHIEVED', L(
  'Non obtenue', 'Not achieved', 'Nicht erreicht', 'No obtenida'))];
const le = m => m.missionData?.le || {};
const track = m => (le(m).track || []).filter(p => p.time || p.position);
const between = M.between;

const FAMILY = {
  id: 'LE',
  idPrefix: 'LE',
  ownOrder: true, // bloc d'ordre propre : « Tâche / ordre de mission » commun réservé au CR détaillé,
  pages: {
    cr: 'le_cr.html',
    reporting: 'le_reporting.html'
  },
  title: L('Missions de police / sécurité', 'Law enforcement', 'Polizei / Sicherheit', 'Misiones policiales / seguridad'),
  series: [{
    value: 'POLICE_OBSERVATION',
    label: L('Observation police', 'Police observation', 'Polizeiliche Beobachtung', 'Observación policial')
  }, {
    value: 'GENDARMERIE',
    label: L('Gendarmerie', 'Gendarmerie', 'Gendarmerie', 'Gendarmería')
  }, {
    value: 'BORDER',
    label: L('Surveillance des frontières', 'Border surveillance', 'Grenzüberwachung', 'Vigilancia de fronteras')
  }, {
    value: 'CUSTOMS',
    label: L('Douane', 'Customs', 'Zoll', 'Aduana')
  }, {
    value: 'TRAFFIC',
    label: L('Circulation routière', 'Traffic', 'Verkehrsüberwachung', 'Tráfico')
  }, {
    value: 'PURSUIT',
    label: L('Poursuite', 'Pursuit', 'Verfolgung', 'Persecución')
  }, {
    value: 'MISSING_PERSON',
    label: L('Personne disparue', 'Missing person', 'Vermisste Person', 'Persona desaparecida')
  }, {
    value: 'TACTICAL_SUPPORT',
    label: L('Appui tactique', 'Tactical support', 'Taktische Unterstützung', 'Apoyo táctico')
  }, {
    value: 'EVENT_SECURITY',
    label: L('Sécurité d’événement', 'Event security', 'Veranstaltungsschutz', 'Seguridad de eventos')
  }],
  events: [opt('ACQUISITION', L('Acquisition de l’objectif', 'Target acquired', 'Ziel erfasst', 'Objetivo adquirido')), opt(
    'CONTACT_LOST', L('Perte de contact', 'Contact lost', 'Kontakt verloren', 'Contacto perdido')), opt('HANDOVER', L(
    'Passage de relais au sol', 'Handover to ground units', 'Übergabe an Bodenkräfte', 'Relevo a unidades de tierra'))],
  blocks: [{
    id: 'le-tasking',
    title: L('Autorité et coordination', 'Authority and coordination', 'Behörde und Koordination', 'Autoridad y coordinación'),
    fields: [
      f(P + 'authority', L('Autorité requérante', 'Requesting authority', 'Anfordernde Behörde', 'Autoridad solicitante')), f(
        P + 'groundUnit', L('Unité au sol', 'Ground unit', 'Bodeneinheit', 'Unidad en tierra')),
      f(P + 'caseNumber', L('Numéro de mission / affaire', 'Mission / case number', 'Einsatz- / Aktenzeichen',
        'Número de misión / caso'), 'text', {
        upper: true,
        ...S
      }),
      f(P + 'groundContact', L('Contact sol (indicatif)', 'Ground contact (callsign)', 'Bodenkontakt (Rufzeichen)',
        'Contacto en tierra (indicativo)'), 'text', {
        upper: true,
        ...S
      }),
      f(P + 'frequency', L('Fréquence', 'Frequency', 'Frequenz', 'Frecuencia'), 'text', S),
      f(P + 'coordination', L('Coordination avec les unités sol', 'Coordination with ground units',
        'Koordination mit Bodenkräften', 'Coordinación con unidades de tierra'), 'textarea', {
        full: true,
        ...S
      })
    ]
  }, {
    id: 'le-objective',
    title: L('Objectif', 'Objective', 'Ziel', 'Objetivo'),
    fields: [
      f(P + 'objectiveType', L('Type d’objectif', 'Objective type', 'Zielart', 'Tipo de objetivo'), 'select', {
        options: objectiveTypes,
        blank: true
      }),
      f(P + 'objectiveDescription', L('Description de l’objectif', 'Objective description', 'Zielbeschreibung',
        'Descripción del objetivo'), 'textarea', {
        full: true,
        ...S
      }),
      f(P + 'zone', L('Zone', 'Area', 'Gebiet', 'Zona')), f(P + 'initialPoint', L('Point initial', 'Initial point',
        'Ausgangspunkt', 'Punto inicial'), 'text', S),
      f(P + 'acquisitionTime', L('Heure d’acquisition', 'Acquisition time', 'Erfassungszeit', 'Hora de adquisición'), 'time'),
      f(P + 'lossTime', L('Heure de perte de contact', 'Contact lost time', 'Kontaktverlust', 'Hora de pérdida de contacto'),
        'time'),
      f(P + 'identification', L('Identification', 'Identification', 'Identifizierung', 'Identificación'), 'select', {
        options: identification,
        blank: true
      })
    ]
  }, {
    id: 'le-track',
    title: L('Positions successives', 'Successive positions', 'Aufeinanderfolgende Positionen', 'Posiciones sucesivas'),
    collection: {
      path: P + 'track',
      min: 0,
      compact: true,
      item: L('Position', 'Position', 'Position', 'Posición'),
      add: L('+ Ajouter une position', '+ Add position', '+ Position hinzufügen', '+ Añadir posición'),
      empty: () => ({
        time: '',
        position: '',
        heading: null,
        speed: null,
        remark: ''
      }),
      fields: [f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('position', L('Position', 'Position', 'Position',
        'Posición'), 'text', S), f('heading', L('Cap', 'Heading', 'Kurs', 'Rumbo'), 'number'), f('speed', L('Vitesse',
        'Speed', 'Geschwindigkeit', 'Velocidad'), 'number'), f('remark', L('Remarque', 'Remark', 'Bemerkung',
        'Observación'), 'text', S)]
    }
  }]
};

export default FAMILY;
