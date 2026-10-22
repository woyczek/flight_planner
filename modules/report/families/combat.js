// V3 report — famille COMBAT, recopiée de la V2 (shared/mission_core/families/combat.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille COMBAT / ENTRAÎNEMENT AU COMBAT AÉRIEN : BFM (combat rapproché), ACM (combat aérien manœuvrant), DACT
// (adversaire dissemblable), interceptions d'entraînement. Dispositif et zone (bloc d'altitude, plancher de sécurité,
// adversaire, contrôle), engagements en collection (situation de départ, tirs simulés, issue), bilan de la séance.
// La police du ciel réelle (QRA, MASA) reste en COMMAND / AIR_POLICING, le ravitaillement en AAR.
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
const P = 'missionData.combat.',
  I = 'missionData.combat.intercept.';
/** Nombre d'une saisie (0 si vide ou invalide). */
const num = v => Number(v) || 0;

// Sous-type « interception » : bloc de l'interception (cible, guidage, détection, identification).
const intercepting = ctx => ctx.series === 'INTERCEPT';
const areaKinds = [
  opt('TSA', L('TSA (zone temporairement ségréguée)', 'TSA (temporary segregated area)', 'TSA (zeitweilig reserviertes Gebiet)',
    'TSA (zona segregada temporal)')),
  opt('CBA', L('CBA (zone transfrontalière)', 'CBA (cross-border area)', 'CBA (grenzüberschreitendes Gebiet)',
    'CBA (zona transfronteriza)')),
  opt('D', L('Zone dangereuse (D)', 'Danger area (D)', 'Gefahrengebiet (D)', 'Zona peligrosa (D)')),
  opt('R', L('Zone réglementée (R)', 'Restricted area (R)', 'Flugbeschränkungsgebiet (R)', 'Zona restringida (R)')),
  opt('SEA', L('Zone au-dessus de la mer', 'Over-water area', 'Gebiet über See', 'Zona sobre el mar')),
  opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
];
const control = [
  opt('GCI', L('Contrôle au sol (GCI / CDC)', 'Ground control (GCI)', 'Bodenleitstelle (GCI)', 'Control desde tierra (GCI)')),
  opt('AWACS', L('Contrôle aéroporté (AWACS)', 'Airborne control (AWACS)', 'Luftgestützte Führung (AWACS)',
    'Control aerotransportado (AWACS)')),
  opt('AUTONOMOUS', L('Autonome (sans contrôle)', 'Autonomous (no control)', 'Autonom (ohne Führung)', 'Autónomo (sin control)'))
];
const setups = [
  opt('OFFENSIVE', L('Offensif (en arrière de l’adversaire)', 'Offensive (behind the bandit)', 'Offensiv (hinter dem Gegner)',
    'Ofensivo (detrás del adversario)')),
  opt('DEFENSIVE', L('Défensif (adversaire en arrière)', 'Defensive (bandit behind)', 'Defensiv (Gegner hinten)',
    'Defensivo (adversario detrás)')),
  opt('NEUTRAL', L('Neutre / croisement de face', 'Neutral / head-on pass', 'Neutral / Frontalbegegnung',
    'Neutro / cruce de frente')),
  opt('BEAM', L('Travers (perpendiculaire)', 'Beam (perpendicular)', 'Querab (senkrecht)', 'Través (perpendicular)')),
  opt('BVR', L('Au-delà de la portée visuelle (BVR)', 'Beyond visual range (BVR)', 'Jenseits Sichtweite (BVR)',
    'Más allá del alcance visual (BVR)'))
];
const outcomes = [
  opt('WIN', L('Victoire (tir valide)', 'Win (valid shot)', 'Sieg (gültiger Schuss)', 'Victoria (disparo válido)')),
  opt('LOSS', L('Défaite (abattu)', 'Loss (shot down)', 'Niederlage (abgeschossen)', 'Derrota (derribado)')),
  opt('DRAW', L('Nul / séparation', 'Draw / separation', 'Unentschieden / Trennung', 'Empate / separación')),
  opt('KIO', L('Arrêt de sécurité (knock-it-off)', 'Knock-it-off (safety stop)', 'Abbruch aus Sicherheitsgründen (knock-it-off)',
    'Interrupción de seguridad (knock-it-off)'))
];
const weapons = [
  opt('GUN', L('Canon', 'Gun', 'Bordkanone', 'Cañón')),
  opt('IR', L('Missile infrarouge (Fox 2)', 'IR missile (Fox 2)', 'IR-Flugkörper (Fox 2)', 'Misil infrarrojo (Fox 2)')),
  opt('RADAR', L('Missile électromagnétique (Fox 3)', 'Radar missile (Fox 3)', 'Radar-Flugkörper (Fox 3)', 'Misil radar (Fox 3)')),
  opt('NONE', L('Aucun tir', 'No shot', 'Kein Schuss', 'Sin disparo'))
];
const geometries = [
  opt('STERN', L('Conversion arrière (stern)', 'Stern conversion', 'Heckumkehr (Stern)', 'Conversión trasera (stern)')),
  opt('FRONT', L('Secteur avant', 'Front quarter', 'Frontsektor', 'Sector frontal')),
  opt('BEAM', L('Travers', 'Beam', 'Querab', 'Través')),
  opt('SHADOW', L('Filature / accompagnement', 'Shadowing', 'Beschattung', 'Seguimiento'))
];
const achieved = [
  opt('FULL', L('Objectifs atteints', 'Objectives met', 'Ziele erreicht', 'Objetivos alcanzados')),
  opt('PARTIAL', L('Partiellement atteints', 'Partially met', 'Teilweise erreicht', 'Parcialmente alcanzados')),
  opt('NOT_MET', L('Non atteints', 'Not met', 'Nicht erreicht', 'No alcanzados'))
];
const combat = m => m.missionData?.combat || {};
const engagements = m => (combat(m).engagements || []).filter(e => e.setup || e.outcome || e.time);
const count = (m, outcome) => engagements(m).filter(e => e.outcome === outcome).length;
const validShots = m => engagements(m).reduce((a, e) => a + num(e.validShots), 0);

const FAMILY = {
  id: 'COMBAT',
  idPrefix: 'ACM',
  pages: {
    cr: 'combat_cr.html',
    reporting: 'combat_reporting.html'
  },
  title: L('Combat aérien / entraînement chasse', 'Air combat / fighter training', 'Luftkampf / Jagdflugausbildung',
    'Combate aéreo / entrenamiento de caza'),
  series: [{
    value: 'BFM',
    label: L('BFM — combat rapproché (manœuvres de base)', 'BFM — basic fighter manoeuvres',
      'BFM — Grundmanöver des Luftkampfs', 'BFM — maniobras básicas de caza')
  }, {
    value: 'ACM',
    label: L('ACM — combat aérien manœuvrant', 'ACM — air combat manoeuvring', 'ACM — Luftkampfmanöver',
      'ACM — maniobras de combate aéreo')
  }, {
    value: 'DACT',
    label: L('DACT — adversaire dissemblable', 'DACT — dissimilar air combat training',
      'DACT — Luftkampf gegen ungleiches Muster', 'DACT — combate aéreo disimilar')
  }, {
    value: 'INTERCEPT',
    label: L('Interception / identification (VID)', 'Interception / identification (VID)', 'Abfangen / Identifizierung (VID)',
      'Interceptación / identificación (VID)')
  }],
  events: [
    opt('COMMIT', L('Engagement (commit)', 'Commit', 'Commit', 'Commit')), opt('FIGHTS_ON', L('« Fight’s on »', '“Fight’s on”',
      '„Fight’s on“', '«Fight’s on»')),
    opt('KILL', L('Tir valide / « splash »', 'Valid shot / “splash”', 'Gültiger Schuss / „Splash“', 'Disparo válido / «splash»')),
    opt('KNOCK_IT_OFF', L('Knock-it-off', 'Knock-it-off', 'Knock-it-off', 'Knock-it-off')),
    opt('VID', L('Identification visuelle (VID)', 'Visual identification (VID)', 'Sichtidentifizierung (VID)',
      'Identificación visual (VID)')), opt('BINGO', L('Bingo carburant', 'Bingo fuel', 'Bingo-Kraftstoff', 'Bingo combustible'))
  ],
  blocks: [{
    id: 'combat-setup',
    title: L('Dispositif et zone', 'Setup and area', 'Aufstellung und Gebiet', 'Dispositivo y zona'),
    fields: [
      f(P + 'areaKind', L('Type de zone', 'Area type', 'Gebietsart', 'Tipo de zona'), 'select', {
        options: areaKinds,
        blank: true
      }),
      f(P + 'area', L('Zone (nom)', 'Area (name)', 'Gebiet (Name)', 'Zona (nombre)'), 'text', {
        upper: true,
        pool: 'area'
      }),
      f(P + 'floor', L('Plancher du bloc', 'Block floor', 'Blockuntergrenze', 'Suelo del bloque'), 'text', {
        upper: true,
        pool: 'altitude'
      }),
      f(P + 'ceiling', L('Plafond du bloc', 'Block ceiling', 'Blockobergrenze', 'Techo del bloque'), 'text', {
        upper: true,
        pool: 'altitude'
      }),
      f(P + 'hardDeckFt', L('Plancher de sécurité (hard deck, ft)', 'Hard deck (ft)',
        'Sicherheitsuntergrenze (Hard Deck, ft)', 'Suelo de seguridad (hard deck, ft)'), 'number'),
      f(P + 'format', L('Format (ex. 1v1, 2v2, 2v1)', 'Format (e.g. 1v1, 2v2, 2v1)', 'Format (z. B. 1v1, 2v2, 2v1)',
        'Formato (p. ej. 1v1, 2v2, 2v1)'), 'text', {
        upper: true
      }),
      f(P + 'adversary', L('Adversaire (type, indicatif, unité)', 'Adversary (type, callsign, unit)',
        'Gegner (Muster, Rufzeichen, Einheit)', 'Adversario (tipo, indicativo, unidad)'), 'text', {
        upper: true
      }),
      f(P + 'control', L('Contrôle', 'Control', 'Führung', 'Control'), 'select', {
        options: control,
        blank: true
      }),
      f(P + 'controller', L('Contrôleur (indicatif)', 'Controller (callsign)', 'Leitstelle (Rufzeichen)',
        'Controlador (indicativo)'), 'text', {
        upper: true
      }),
      f(P + 'jokerKg', L('Joker (kg)', 'Joker (kg)', 'Joker (kg)', 'Joker (kg)'), 'number'),
      f(P + 'bingoKg', L('Bingo (kg)', 'Bingo (kg)', 'Bingo (kg)', 'Bingo (kg)'), 'number'),
      f(P + 'trainingRules', L('Règles d’entraînement particulières', 'Specific training rules', 'Besondere Übungsregeln',
        'Reglas de entrenamiento específicas'), 'textarea', {
        full: true
      })
    ]
  }, {
    id: 'combat-intercept',
    title: L('Interception', 'Interception', 'Abfangen', 'Interceptación'),
    when: intercepting,
    fields: [
      f(I + 'target', L('Cible (type, indicatif)', 'Target (type, callsign)', 'Ziel (Muster, Rufzeichen)',
        'Blanco (tipo, indicativo)'), 'text', {
        upper: true
      }),
      f(I + 'detectionNm', L('Détection radar (NM)', 'Radar detection (NM)', 'Radarerfassung (NM)', 'Detección radar (NM)'),
        'number'),
      f(I + 'geometry', L('Géométrie', 'Geometry', 'Geometrie', 'Geometría'), 'select', {
        options: geometries,
        blank: true
      }),
      f(I + 'vidTime', L('Heure de l’identification (VID)', 'VID time', 'Zeit der Identifizierung (VID)',
        'Hora de la identificación (VID)'), 'time'),
      f(I + 'count', L('Nombre d’interceptions', 'Number of intercepts', 'Anzahl der Abfangvorgänge',
        'Número de interceptaciones'), 'number'),
      f(I + 'notes', L('Déroulement', 'Narrative', 'Ablauf', 'Desarrollo'), 'textarea', {
        full: true
      })
    ]
  }, {
    id: 'combat-engagements',
    title: L('Engagements', 'Engagements', 'Gefechte', 'Enfrentamientos'),
    collection: {
      path: P + 'engagements',
      min: 0,
      compact: true,
      item: L('Engagement', 'Engagement', 'Gefecht', 'Enfrentamiento'),
      add: L('+ Ajouter un engagement', '+ Add engagement', '+ Gefecht hinzufügen', '+ Añadir enfrentamiento'),
      empty: () => ({
        time: '',
        setup: '',
        startNm: null,
        weapon: '',
        validShots: null,
        outcome: '',
        durationMin: null,
        notes: ''
      }),
      fields: [f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('setup', L('Situation de départ', 'Start setup',
        'Ausgangslage', 'Situación inicial'), 'select', {
        options: setups,
        blank: true
      }), f('startNm', L('Distance de départ (NM)', 'Start range (NM)', 'Anfangsabstand (NM)', 'Distancia inicial (NM)'),
        'number'), f('weapon', L('Armement simulé', 'Simulated weapon', 'Simulierte Waffe', 'Arma simulada'), 'select', {
        options: weapons,
        blank: true
      }), f('validShots', L('Tirs valides', 'Valid shots', 'Gültige Schüsse', 'Disparos válidos'), 'number'), f('outcome',
        L('Issue', 'Outcome', 'Ergebnis', 'Resultado'), 'select', {
          options: outcomes,
          blank: true
        }), f('durationMin', L('Durée (min)', 'Duration (min)', 'Dauer (min)', 'Duración (min)'), 'number'), f('notes', L(
        'Remarque', 'Note', 'Bemerkung', 'Observación'), 'text', {
        full: true
      })]
    }
  }, {
    id: 'combat-debrief',
    title: L('Bilan de la séance', 'Session debrief', 'Nachbesprechung', 'Balance de la sesión'),
    fields: [f(P + 'achieved', L('Objectifs d’entraînement', 'Training objectives', 'Ausbildungsziele',
      'Objetivos de entrenamiento'), 'select', {
      options: achieved,
      blank: true
    }), f(P + 'hardDeckBusts', L('Franchissements du plancher de sécurité', 'Hard deck busts',
      'Unterschreitungen des Hard Deck', 'Violaciones del suelo de seguridad'), 'number'), f(P + 'lessons', L(
      'Enseignements', 'Lessons learned', 'Erkenntnisse', 'Lecciones aprendidas'), 'textarea', {
      full: true
    })]
  }]
};

export default FAMILY;
