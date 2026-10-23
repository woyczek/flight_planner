// V3 report — famille ISR, recopiée de la V2 (shared/mission_core/families/isr.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille ISR / RECON / INTELLIGENCE (§9), niveau compte rendu de simulation : tâche de
// collecte, capteurs, contacts / pistes, émetteurs (SIGINT / ELINT / COMINT), couverture.
// Mode générique non classifié : références d'objectif, positions, fréquences et
// observations sont marquées sensibles (retirées de la version publique).
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
const P = 'missionData.isr.';
const S = {
  sensitive: true
};
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => Number(v) || 0;
const confidence = [opt('HIGH', L('Élevée', 'High', 'Hoch', 'Alta')), opt('MEDIUM', L('Moyenne', 'Medium', 'Mittel', 'Media')), opt(
  'LOW', L('Faible', 'Low', 'Niedrig', 'Baja'))];
const sensors = V.capabilityGroups.find(g => g.id === 'sensors').items;
const isr = m => m.missionData?.isr || {};
const contacts = m => (isr(m).contacts || []).filter(c => c.time || c.contactId || c.trackId);

const FAMILY = {
  id: 'ISR',
  idPrefix: 'ISR',
  ownOrder: true, // bloc d'ordre propre : « Tâche / ordre de mission » commun réservé au CR détaillé,
  pages: {
    cr: 'isr_cr.html',
    reporting: 'isr_reporting.html'
  },
  title: L('Renseignement / reconnaissance', 'ISR / reconnaissance', 'Aufklärung', 'Inteligencia / reconocimiento'),
  series: [{
    value: 'ISR',
    label: L('ISR', 'ISR')
  }, {
    value: 'RECON',
    label: L('Reconnaissance', 'Reconnaissance', 'Aufklärung', 'Reconocimiento')
  }, {
    value: 'EO_IR',
    label: L('EO/IR', 'EO/IR')
  }, {
    value: 'IMINT',
    label: L('IMINT (imagerie)', 'IMINT (imagery)', 'IMINT (Bildaufklärung)', 'IMINT (imágenes)')
  }, {
    value: 'SIGINT',
    label: L('SIGINT', 'SIGINT')
  }, {
    value: 'ELINT',
    label: L('ELINT', 'ELINT')
  }, {
    value: 'COMINT',
    label: L('COMINT', 'COMINT')
  }, {
    value: 'BORDER_ISR',
    label: L('ISR frontalier', 'Border ISR', 'Grenzaufklärung', 'ISR fronterizo')
  }, {
    value: 'MARITIME_ISR',
    label: L('ISR maritime', 'Maritime ISR', 'Seeaufklärung', 'ISR marítimo')
  }, {
    value: 'INFRASTRUCTURE_ISR',
    label: L('ISR infrastructures', 'Infrastructure ISR', 'Infrastrukturaufklärung', 'ISR de infraestructuras')
  }],
  flags: mission => ({
    maritime: mission.series === 'MARITIME_ISR'
  }),
  events: [opt('ON_STATION', L('Sur station', 'On station', 'Im Einsatzraum', 'En estación')), opt('SENSOR_ON', L('Capteur actif',
    'Sensor on', 'Sensor aktiv', 'Sensor activo')), opt('TRACK_INITIATED', L('Piste créée', 'Track initiated', 'Spur angelegt',
    'Traza iniciada')), opt('TRACK_LOST', L('Piste perdue', 'Track lost', 'Spur verloren', 'Traza perdida'))],
  blocks: [{
    id: 'isr-tasking',
    title: L('Tâche de collecte', 'Collection task', 'Aufklärungsauftrag', 'Tarea de obtención'),
    fields: [
      f(P + 'task', L('Tâche de collecte', 'Collection task', 'Aufklärungsauftrag', 'Tarea de obtención'), 'text', {
        full: true,
        ...S
      }),
      f(P + 'zone', L('Zone', 'Area', 'Gebiet', 'Zona')), f(P + 'target', L('Objectif / référence', 'Target / reference',
        'Ziel / Referenz', 'Objetivo / referencia'), 'text', S),
      f(P + 'orbit', L('Orbite', 'Orbit', 'Orbit', 'Órbita')), f(P + 'altitudeFt', L('Altitude (ft)', 'Altitude (ft)',
        'Höhe (ft)', 'Altitud (ft)'), 'number'),
      f(P + 'standoffNm', L('Distance de stand-off (NM)', 'Stand-off distance (NM)', 'Abstand (NM)',
        'Distancia de stand-off (NM)'), 'number')
    ]
  }, {
    id: 'isr-sensors',
    title: L('Capteurs employés', 'Sensors employed', 'Eingesetzte Sensoren', 'Sensores empleados'),
    collection: {
      path: P + 'sensors',
      min: 0,
      compact: true,
      item: L('Capteur', 'Sensor', 'Sensor', 'Sensor'),
      add: L('+ Ajouter un capteur', '+ Add sensor', '+ Sensor hinzufügen', '+ Añadir sensor'),
      empty: () => ({
        sensor: '',
        mode: '',
        start: '',
        end: '',
        recordingMinutes: null,
        images: null
      }),
      fields: [
        f('sensor', L('Capteur', 'Sensor', 'Sensor', 'Sensor'), 'select', {
          options: sensors,
          blank: true
        }), f('mode', L('Mode', 'Mode', 'Modus', 'Modo')),
        f('start', L('Début', 'Start', 'Beginn', 'Inicio'), 'time'), f('end', L('Fin', 'End', 'Ende', 'Fin'), 'time'),
        f('recordingMinutes', L('Enregistrement (min)', 'Recording (min)', 'Aufzeichnung (min)', 'Grabación (min)'),
          'number'), f('images', L('Images collectées', 'Imagery collected', 'Erfasste Bilder', 'Imágenes obtenidas'),
          'number')
      ]
    }
  }, {
    id: 'isr-contacts',
    title: L('Contacts / pistes', 'Contacts / tracks', 'Kontakte / Spuren', 'Contactos / trazas'),
    collection: {
      path: P + 'contacts',
      min: 0,
      compact: true,
      item: L('Contact', 'Contact', 'Kontakt', 'Contacto'),
      add: L('+ Ajouter un contact', '+ Add contact', '+ Kontakt hinzufügen', '+ Añadir contacto'),
      empty: () => ({
        time: '',
        contactId: '',
        trackId: '',
        position: '',
        confidence: '',
        observation: ''
      }),
      fields: [
        f('time', L('Heure d’acquisition', 'Acquisition time', 'Erfassungszeit', 'Hora de adquisición'), 'time'), f(
          'contactId', L('ID contact', 'Contact ID', 'Kontakt-ID', 'ID de contacto'), 'text', {
            upper: true
          }),
        f('trackId', L('ID piste', 'Track ID', 'Spur-ID', 'ID de traza'), 'text', {
          upper: true
        }), f('position', L('Position', 'Position', 'Position', 'Posición'), 'text', S),
        f('confidence', L('Confiance', 'Confidence', 'Vertrauen', 'Confianza'), 'select', {
          options: confidence,
          blank: true
        }), f('observation', L('Observation', 'Observation', 'Beobachtung', 'Observación'), 'text', {
          full: true,
          ...S
        })
      ]
    }
  }, {
    id: 'isr-emitters',
    title: L('Observations émetteurs / communications', 'Emitter / communication observations', 'Emitter- / Funkbeobachtungen',
      'Observaciones de emisores / comunicaciones'),
    when: ctx => ['SIGINT', 'ELINT', 'COMINT'].includes(ctx.series),
    collection: {
      path: P + 'emitters',
      min: 0,
      compact: true,
      item: L('Émetteur', 'Emitter', 'Emitter', 'Emisor'),
      add: L('+ Ajouter un émetteur', '+ Add emitter', '+ Emitter hinzufügen', '+ Añadir emisor'),
      empty: () => ({
        time: '',
        type: '',
        band: '',
        bearing: null,
        observation: ''
      }),
      fields: [f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('type', L('Type', 'Type', 'Typ', 'Tipo')), f('band', L(
        'Bande / fréquence', 'Band / frequency', 'Band / Frequenz', 'Banda / frecuencia'), 'text', S), f('bearing', L(
        'Relèvement (°)', 'Bearing (°)', 'Peilung (°)', 'Marcación (°)'), 'number'), f('observation', L('Observation',
        'Observation', 'Beobachtung', 'Observación'), 'text', {
        full: true,
        ...S
      })]
    }
  }, {
    id: 'isr-coverage',
    title: L('Couverture et diffusion', 'Coverage and dissemination', 'Abdeckung und Verteilung', 'Cobertura y difusión'),
    fields: [
      f(P + 'coveragePct', L('Couverture de la mission (%)', 'Mission coverage (%)', 'Auftragsabdeckung (%)',
        'Cobertura de la misión (%)'), 'number'),
      f(P + 'gaps', L('Lacunes', 'Gaps', 'Lücken', 'Lagunas')), f(P + 'dissemination', L('Diffusion', 'Dissemination',
        'Verteilung', 'Difusión'), 'text', S)
    ]
  }]
};

export default FAMILY;
