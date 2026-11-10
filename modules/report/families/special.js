// V3 report — famille SPECIAL, recopiée de la V2 (shared/mission_core/families/special.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as MT from '../../../frame/lib/mission_themes.js'; // les séries : la table unique des thèmes (SOG-0202 T1)
import * as M from '../model.js';
// Famille SPECIAL TRANSPORT / TEST / TRAINING (§17) : missions spécialisées sans moteur
// propre. Quatre sous-modules affichés selon le groupe de la série : VIP / gouvernement,
// convoyage (ferry), essais en vol, formation.
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
const P = 'missionData.special.';
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => Number(v) || 0;
const group = series => String(series || '').split('-')[0];
const inGroup = g => ctx => group(ctx.series) === g;
const yesNo = [opt('', L('—', '—')), opt('YES', L('Oui', 'Yes', 'Ja', 'Sí')), opt('NO', L('Non', 'No', 'Nein', 'No'))];
const passFail = [opt('PASS', L('Conforme', 'Pass', 'Bestanden', 'Conforme')), opt('FAIL', L('Non conforme', 'Fail', 'Nicht bestanden',
  'No conforme')), opt('NOT_FLOWN', L('Non réalisé', 'Not flown', 'Nicht geflogen', 'No realizado'))];
const completion = [opt('COMPLETED', L('Réalisé', 'Completed', 'Absolviert', 'Completado')), opt('PARTIAL', L('Partiel', 'Partial',
  'Teilweise', 'Parcial')), opt('NOT_COMPLETED', L('Non réalisé', 'Not completed', 'Nicht absolviert', 'No completado'))];
const sp = m => m.missionData?.special || {};
const points = m => (sp(m).testPoints || []).filter(p => p.id || p.result);
const exercises = m => (sp(m).exercises || []).filter(e => e.exercise || e.completed);
const s = (value, fr, en, de, es) => ({
  value,
  label: L(fr, en, de, es)
});

const FAMILY = {
  id: 'SPECIAL',
  idPrefix: 'SPC',
  pages: {
    cr: 'special_cr.html',
    reporting: 'special_reporting.html'
  },
  title: L('Transport spécial / essais / formation', 'Special transport / test / training',
    'Sondertransport / Erprobung / Ausbildung', 'Transporte especial / ensayos / formación'),
  series: MT.seriesOf('SPECIAL'),
  flags: mission => ({
    maritime: mission.series === 'TRAINING-SHIPBOARD'
  }),
  blocks: [{
    id: 'special-vip',
    title: L('Transport VIP / gouvernemental', 'VIP / government transport', 'VIP- / Regierungstransport',
      'Transporte VIP / gubernamental'),
    when: inGroup('VIP'),
    fields: [
      f(P + 'passengers', L('Passagers', 'Passengers', 'Passagiere', 'Pasajeros'), 'number'), f(P + 'authority', L('Autorité',
        'Authority', 'Behörde', 'Autoridad')),
      f(P + 'passengerDetail', L('Délégation (détail)', 'Delegation (detail)', 'Delegation (Details)',
        'Delegación (detalle)'), 'text', {
        sensitive: true
      }),
      f(P + 'origin', L('Origine', 'Origin', 'Start', 'Origen'), 'text', {
        upper: true
      }), f(P + 'destination', L('Destination', 'Destination', 'Ziel', 'Destino'), 'text', {
        upper: true
      }),
      f(P + 'schedule', L('Horaire prévu', 'Planned schedule', 'Geplanter Zeitplan', 'Horario previsto')), f(P +
        'delayMinutes', L('Retard (min)', 'Delay (min)', 'Verspätung (min)', 'Retraso (min)'), 'number'),
      f(P + 'diversions', L('Déroutements', 'Diversions', 'Umleitungen', 'Desvíos')), f(P + 'handling', L(
        'Traitement particulier / protocole', 'Special handling / protocol', 'Sonderbehandlung / Protokoll',
        'Tratamiento especial / protocolo'), 'text', {
        full: true,
        sensitive: true
      })
    ]
  }, {
    id: 'special-ferry',
    title: L('Convoyage', 'Ferry flight', 'Überführungsflug', 'Vuelo de traslado'),
    when: inGroup('FERRY'),
    fields: [
      f(P + 'origin', L('Origine', 'Origin', 'Start', 'Origen'), 'text', {
        upper: true
      }), f(P + 'destination', L('Destination', 'Destination', 'Ziel', 'Destino'), 'text', {
        upper: true
      }),
      f(P + 'reason', L('Motif', 'Reason', 'Grund', 'Motivo')), f(P + 'technicalStatus', L('État technique',
        'Technical status', 'Technischer Zustand', 'Estado técnico')),
      f(P + 'stops', L('Escales', 'Stops', 'Zwischenlandungen', 'Escalas'), 'text', {
        upper: true
      }), f(P + 'defects', L('Défauts constatés', 'Defects found', 'Festgestellte Mängel', 'Defectos detectados'),
        'textarea', {
          full: true
        })
    ]
  }, {
    id: 'special-test',
    title: L('Essai en vol', 'Flight test', 'Flugerprobung', 'Ensayo en vuelo'),
    when: inGroup('TEST'),
    fields: [
      f(P + 'testCard', L('Carte d’essai', 'Test card', 'Testkarte', 'Tarjeta de ensayo'), 'text', {
        upper: true
      }), f(P + 'configuration', L('Configuration', 'Configuration', 'Konfiguration', 'Configuración')),
      f(P + 'repeatRequired', L('Reprise nécessaire', 'Repeat required', 'Wiederholung nötig', 'Repetición necesaria'),
        'select', {
          options: yesNo
        })
    ]
  }, {
    id: 'special-points',
    title: L('Points d’essai', 'Test points', 'Testpunkte', 'Puntos de ensayo'),
    when: inGroup('TEST'),
    collection: {
      path: P + 'testPoints',
      min: 0,
      compact: true,
      item: L('Point d’essai', 'Test point', 'Testpunkt', 'Punto de ensayo'),
      add: L('+ Ajouter un point d’essai', '+ Add test point', '+ Testpunkt hinzufügen', '+ Añadir punto de ensayo'),
      empty: () => ({
        id: '',
        altitudeFt: null,
        speedKt: null,
        config: '',
        result: '',
        pass: '',
        anomaly: ''
      }),
      fields: [f('id', L('Point', 'Point', 'Punkt', 'Punto'), 'text', {
        upper: true
      }), f('altitudeFt', L('Altitude (ft)', 'Altitude (ft)', 'Höhe (ft)', 'Altitud (ft)'), 'number'), f('speedKt', L(
        'Vitesse (kt)', 'Speed (kt)', 'Geschwindigkeit (kt)', 'Velocidad (kt)'), 'number'), f('config', L('Configuration',
        'Configuration', 'Konfiguration', 'Configuración')), f('pass', L('Résultat', 'Result', 'Ergebnis', 'Resultado'),
        'select', {
          options: passFail,
          blank: true
        }), f('result', L('Mesure / observation', 'Measurement / observation', 'Messung / Beobachtung',
        'Medida / observación')), f('anomaly', L('Anomalie', 'Anomaly', 'Abweichung', 'Anomalía'), 'text', {
        full: true
      })]
    }
  }, {
    id: 'special-training',
    title: L('Formation', 'Training', 'Ausbildung', 'Formación'),
    when: inGroup('TRAINING'),
    fields: [
      f(P + 'instructor', L('Instructeur', 'Instructor', 'Lehrer', 'Instructor')), f(P + 'trainee', L('Stagiaire', 'Trainee',
        'Schüler', 'Alumno')),
      f(P + 'grading', L('Évaluation globale', 'Overall grading', 'Gesamtbewertung', 'Evaluación global'))
    ]
  }, {
    id: 'special-exercises',
    title: L('Exercices', 'Exercises', 'Übungen', 'Ejercicios'),
    when: inGroup('TRAINING'),
    collection: {
      path: P + 'exercises',
      min: 0,
      compact: true,
      item: L('Exercice', 'Exercise', 'Übung', 'Ejercicio'),
      add: L('+ Ajouter un exercice', '+ Add exercise', '+ Übung hinzufügen', '+ Añadir ejercicio'),
      empty: () => ({
        exercise: '',
        objective: '',
        repetitions: null,
        completed: '',
        grade: '',
        observations: ''
      }),
      fields: [f('exercise', L('Exercice', 'Exercise', 'Übung', 'Ejercicio')), f('objective', L('Objectif', 'Objective', 'Ziel',
        'Objetivo')), f('repetitions', L('Répétitions', 'Repetitions', 'Wiederholungen', 'Repeticiones'), 'number'), f(
        'completed', L('Réalisation', 'Completion', 'Durchführung', 'Realización'), 'select', {
          options: completion,
          blank: true
        }), f('grade', L('Note', 'Grade', 'Note', 'Nota')), f('observations', L('Observations', 'Observations',
        'Beobachtungen', 'Observaciones'), 'text', {
        full: true
      })]
    }
  }]
};

export default FAMILY;
