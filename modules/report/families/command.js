// V3 report — famille COMMAND, recopiée de la V2 (shared/mission_core/families/command.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille COMMAND / AEW / RELAY (§14) : poste de commandement aéroporté, guet aérien,
// coordination aérienne, relais radio (y compris catastrophes, feux, SAR). Unités
// coordonnées et journal de coordination en collections dynamiques.
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
const P = 'missionData.c2.',
  I = 'missionData.c2.intercept.';
// Sous-type « police du ciel » : bloc de l'interception (aéronef intercepté, motif, mesures prises).
const policing = ctx => ctx.series === 'AIR_POLICING';
const reasons = [
  opt('NORDO', L('Perte de contact radio (NORDO)', 'Loss of radio contact (NORDO)', 'Funkausfall (NORDO)',
    'Pérdida de contacto radio (NORDO)')),
  opt('AIRSPACE', L('Violation d’espace (zone interdite, restreinte…)', 'Airspace infringement (prohibited, restricted…)',
    'Luftraumverletzung (Sperr-, Flugbeschränkungsgebiet…)', 'Violación de espacio (zona prohibida, restringida…)')),
  opt('TRANSPONDER', L('Transpondeur (7500 / 7600 / 7700, absent)', 'Transponder (7500 / 7600 / 7700, none)',
    'Transponder (7500 / 7600 / 7700, keiner)', 'Transpondedor (7500 / 7600 / 7700, sin)')),
  opt('DEVIATION', L('Écart de route / comportement anormal', 'Route deviation / abnormal behaviour',
    'Kursabweichung / auffälliges Verhalten', 'Desvío de ruta / comportamiento anómalo')),
  opt('ASSISTANCE', L('Assistance à un aéronef en difficulté', 'Assistance to an aircraft in distress',
    'Hilfe für ein Luftfahrzeug in Not', 'Asistencia a una aeronave en dificultad')),
  opt('EXERCISE', L('Exercice', 'Exercise', 'Übung', 'Ejercicio')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
];
const measures = [
  opt('IDENTIFICATION', L('Identification visuelle', 'Visual identification', 'Sichtidentifizierung', 'Identificación visual')), opt(
    'ESCORT', L('Accompagnement', 'Escort / shadowing', 'Begleitung', 'Acompañamiento')),
  opt('DIVERSION', L('Déroutement imposé', 'Enforced diversion', 'Erzwungene Umleitung', 'Desvío impuesto')), opt('LANDING', L(
    'Atterrissage imposé', 'Enforced landing', 'Erzwungene Landung', 'Aterrizaje impuesto')),
  opt('RADIO_RESTORED', L('Contact radio rétabli', 'Radio contact restored', 'Funkkontakt wiederhergestellt',
    'Contacto radio restablecido')), opt('WARNING', L('Signaux d’avertissement', 'Warning signals', 'Warnsignale',
    'Señales de advertencia'))
];
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => Number(v) || 0;
const unitTypes = [opt('AIRCRAFT', L('Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave')), opt('HELICOPTER', L('Hélicoptère',
  'Helicopter', 'Hubschrauber', 'Helicóptero')), opt('GROUND', L('Unité au sol', 'Ground unit', 'Bodeneinheit',
  'Unidad de tierra')), opt('SHIP', L('Navire', 'Ship', 'Schiff', 'Buque')), opt('CENTRE', L('Centre / PC', 'Centre / command post',
  'Zentrale / Gefechtsstand', 'Centro / puesto de mando')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))];
const logKinds = [opt('HANDOVER', L('Passage de relais', 'Handover', 'Übergabe', 'Relevo')), opt('COORDINATION', L('Coordination',
    'Coordination', 'Koordination', 'Coordinación')), opt('RELAY', L('Relais radio', 'Radio relay', 'Funkrelais', 'Retransmisión')),
  opt('CONTACT', L('Contact', 'Contact', 'Kontakt', 'Contacto')), opt('OUTAGE', L('Coupure de communication', 'Communication outage',
    'Kommunikationsausfall', 'Corte de comunicación'))
];
const effectiveness = [opt('FULL', L('Pleinement efficace', 'Fully effective', 'Voll wirksam', 'Plenamente eficaz')), opt('PARTIAL', L(
  'Partiellement efficace', 'Partially effective', 'Teilweise wirksam', 'Parcialmente eficaz')), opt('DEGRADED', L('Dégradée',
  'Degraded', 'Eingeschränkt', 'Degradada'))];
const c2 = m => m.missionData?.c2 || {};
const units = m => (c2(m).units || []).filter(u => u.callsign || u.type);
const log = m => (c2(m).log || []).filter(e => e.time || e.kind);
const stationMinutes = m => M.between(c2(m).stationStart, c2(m).stationEnd) ?? M.computeStatistics(
  m).timeOnStationMinutes ?? 0;

const FAMILY = {
  id: 'COMMAND',
  idPrefix: 'C2',
  pages: {
    cr: 'command_cr.html',
    reporting: 'command_reporting.html'
  },
  title: L('Commandement / police du ciel / guet aérien', 'Command / air policing / early warning',
    'Führung / Luftpolizeidienst / Frühwarnung', 'Mando / policía aérea / alerta temprana'),
  series: [{
    value: 'AIR_POLICING',
    label: L('Police du ciel / interception (QRA, MASA)', 'Air policing / interception (QRA)',
      'Luftpolizeidienst / Abfangen (QRA)', 'Policía aérea / interceptación (QRA)')
  }, {
    value: 'AIRBORNE_COMMAND',
    label: L('Poste de commandement aéroporté', 'Airborne command', 'Luftgestützte Führung', 'Mando aerotransportado')
  }, {
    value: 'AEW',
    label: L('Guet aérien avancé (AEW)', 'Airborne early warning (AEW)', 'Luftgestützte Frühwarnung (AEW)',
      'Alerta temprana aérea (AEW)')
  }, {
    value: 'AIR_COORDINATION',
    label: L('Coordination aérienne', 'Air coordination', 'Luftkoordination', 'Coordinación aérea')
  }, {
    value: 'COMM_RELAY',
    label: L('Relais de communications', 'Communications relay', 'Kommunikationsrelais', 'Retransmisión de comunicaciones')
  }, {
    value: 'DISASTER_RELAY',
    label: L('Relais catastrophe', 'Disaster relay', 'Katastrophenrelais', 'Retransmisión en catástrofes')
  }, {
    value: 'FIRE_COORDINATION',
    label: L('Coordination feux de forêt', 'Fire coordination', 'Waldbrandkoordination', 'Coordinación de incendios')
  }, {
    value: 'SAR_COORDINATION',
    label: L('Coordination SAR', 'SAR coordination', 'SAR-Koordination', 'Coordinación SAR')
  }],
  events: [opt('SCRAMBLE', L('Décollage sur alerte (scramble)', 'Scramble', 'Alarmstart (Scramble)',
    'Despegue de alerta (scramble)')), opt('INTERCEPT', L('Interception', 'Interception', 'Abfangen', 'Interceptación')), opt(
    'IDENTIFIED', L('Identification', 'Identification', 'Identifizierung', 'Identificación')), opt('ON_STATION', L(
    'Sur station', 'On station', 'Im Einsatzraum', 'En estación')), opt('OFF_STATION', L('Fin de station', 'Off station',
    'Einsatzraum verlassen', 'Fin de estación')), opt('HANDOVER', L('Passage de relais', 'Handover', 'Übergabe', 'Relevo'))],
  blocks: [{
    id: 'c2-intercept',
    title: L('Interception', 'Interception', 'Abfangen', 'Interceptación'),
    when: policing,
    fields: [
      f(I + 'target', L('Aéronef intercepté (type, immatriculation / indicatif)',
        'Intercepted aircraft (type, registration / callsign)',
        'Abgefangenes Luftfahrzeug (Muster, Kennzeichen / Rufzeichen)',
        'Aeronave interceptada (tipo, matrícula / indicativo)'), 'text', {
        upper: true
      }),
      f(I + 'reason', L('Motif', 'Reason', 'Grund', 'Motivo'), 'select', {
        options: reasons,
        blank: true
      }),
      f(I + 'alertMinutes', L('Délai alerte → décollage (min)', 'Alert to take-off (min)', 'Alarm bis Start (min)',
        'Alerta a despegue (min)'), 'number'),
      f(I + 'interceptTime', L('Heure d’interception', 'Interception time', 'Abfangzeit', 'Hora de interceptación'), 'time'),
      f(I + 'measure', L('Mesure principale', 'Main measure', 'Hauptmaßnahme', 'Medida principal'), 'select', {
        options: measures,
        blank: true
      }),
      f(I + 'landedAt', L('Posé à (si dérouté)', 'Landed at (if diverted)', 'Gelandet in (bei Umleitung)',
        'Aterrizó en (si desviado)'), 'text', {
        upper: true
      }),
      f(I + 'notes', L('Déroulement', 'Narrative', 'Ablauf', 'Desarrollo'), 'textarea', {
        full: true
      })
    ]
  }, {
    id: 'c2-station',
    title: L('Station et autorité', 'Station and authority', 'Station und Führung', 'Estación y autoridad'),
    fields: [
      f(P + 'authority', L('Autorité de commandement', 'Command authority', 'Führungsstelle', 'Autoridad de mando')), f(P +
        'orbit', L('Orbite / hippodrome', 'Orbit / racetrack', 'Orbit / Racetrack', 'Órbita / hipódromo')),
      f(P + 'altitudeFt', L('Altitude (ft)', 'Altitude (ft)', 'Höhe (ft)', 'Altitud (ft)'), 'number'), f(P + 'stationStart',
        L('Début de station', 'On station', 'Beginn im Einsatzraum', 'Inicio en estación'), 'time'),
      f(P + 'stationEnd', L('Fin de station', 'Off station', 'Ende im Einsatzraum', 'Fin en estación'), 'time'), f(P +
        'coverage', L('Couverture assurée', 'Coverage provided', 'Bereitgestellte Abdeckung', 'Cobertura proporcionada'))
    ]
  }, {
    id: 'c2-units',
    title: L('Unités coordonnées', 'Units coordinated', 'Koordinierte Einheiten', 'Unidades coordinadas'),
    collection: {
      path: P + 'units',
      min: 0,
      compact: true,
      item: L('Unité', 'Unit', 'Einheit', 'Unidad'),
      add: L('+ Ajouter une unité', '+ Add unit', '+ Einheit hinzufügen', '+ Añadir unidad'),
      empty: () => ({
        callsign: '',
        type: '',
        role: '',
        from: '',
        to: '',
        notes: ''
      }),
      fields: [f('callsign', L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'), 'text', {
        upper: true
      }), f('type', L('Type', 'Type', 'Typ', 'Tipo'), 'select', {
        options: unitTypes,
        blank: true
      }), f('role', L('Rôle', 'Role', 'Rolle', 'Función')), f('from', L('De', 'From', 'Von', 'Desde'), 'time'), f('to', L(
        'À', 'To', 'Bis', 'Hasta'), 'time'), f('notes', L('Remarque', 'Note', 'Bemerkung', 'Observación'))]
    }
  }, {
    id: 'c2-comms',
    title: L('Fréquences et réseaux', 'Frequencies and networks', 'Frequenzen und Netze', 'Frecuencias y redes'),
    fields: [f(P + 'frequencies', L('Fréquences', 'Frequencies', 'Frequenzen', 'Frecuencias'), 'text', {
      full: true,
      sensitive: true
    }), f(P + 'networks', L('Réseaux de communication', 'Communication networks', 'Kommunikationsnetze',
      'Redes de comunicación'), 'text', {
      full: true
    })]
  }, {
    id: 'c2-log',
    title: L('Journal de coordination', 'Coordination log', 'Koordinationsprotokoll', 'Registro de coordinación'),
    collection: {
      path: P + 'log',
      min: 0,
      compact: true,
      item: L('Entrée', 'Entry', 'Eintrag', 'Entrada'),
      add: L('+ Ajouter une entrée', '+ Add entry', '+ Eintrag hinzufügen', '+ Añadir entrada'),
      empty: () => ({
        time: '',
        kind: '',
        description: '',
        durationMin: null
      }),
      fields: [f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('kind', L('Nature', 'Kind', 'Art', 'Tipo'), 'select', {
        options: logKinds,
        blank: true
      }), f('durationMin', L('Durée (min)', 'Duration (min)', 'Dauer (min)', 'Duración (min)'), 'number'), f('description',
        L('Description', 'Description', 'Beschreibung', 'Descripción'), 'text', {
          full: true
        })]
    }
  }, {
    id: 'c2-effect',
    title: L('Efficacité de la mission', 'Mission effectiveness', 'Einsatzwirksamkeit', 'Eficacia de la misión'),
    fields: [f(P + 'effectiveness', L('Efficacité', 'Effectiveness', 'Wirksamkeit', 'Eficacia'), 'select', {
      options: effectiveness,
      blank: true
    }), f(P + 'effectRemarks', L('Commentaire', 'Comment', 'Kommentar', 'Comentario'), 'textarea', {
      full: true
    })]
  }]
};

export default FAMILY;
