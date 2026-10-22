// V3 report — famille AIRBORNE, recopiée de la V2 (shared/mission_core/families/airborne.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille AIRBORNE / AIRDROP (§13) : largage de personnel et de matériel, ravitaillement,
// largage humanitaire, kit SAR, largages d'entraînement. Chaque passage sur la DZ est
// une ligne de la collection « passages de largage » (prévu / réel, dispersion…).
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
const P = 'missionData.airborne.';
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => Number(v) || 0;
const dropTypes = [opt('PERSONNEL', L('Personnel', 'Personnel', 'Personal', 'Personal')), opt('CARGO', L('Matériel', 'Cargo',
  'Material', 'Carga')), opt('MIXED', L('Mixte', 'Mixed', 'Gemischt', 'Mixto'))];
const results = [opt('ON_DZ', L('Sur la DZ', 'On DZ', 'In der DZ', 'En la DZ')), opt('OFF_DZ', L('Hors DZ', 'Off DZ',
    'Außerhalb der DZ', 'Fuera de la DZ')), opt('NOT_OBSERVED', L('Non observé', 'Not observed', 'Nicht beobachtet', 'No observado')),
  opt('NO_DROP', L('Pas de largage (passage à vide)', 'No drop (dry pass)', 'Kein Abwurf (Leeranflug)',
    'Sin lanzamiento (pasada en seco)'))
];
const recovered = [opt('', L('—', '—')), opt('YES', L('Récupéré', 'Recovered', 'Geborgen', 'Recuperado')), opt('NO', L('Non récupéré',
  'Not recovered', 'Nicht geborgen', 'No recuperado')), opt('NOT_OBSERVED', L('Non observé', 'Not observed', 'Nicht beobachtet',
  'No observado'))];
const passes = m => (m.missionData?.airborne?.passes || []).filter(p => p.time || p.jumpers || p.loadKg || p.result);
const dropped = p => p.result !== 'NO_DROP';

const FAMILY = {
  id: 'AIRBORNE',
  idPrefix: 'DROP',
  defaultCategory: 'fixed',
  pages: {
    cr: 'airborne_cr.html',
    reporting: 'airborne_reporting.html'
  },
  title: L('Largage / aéroporté', 'Airborne / airdrop', 'Luftlandung / Abwurf', 'Aerotransportado / lanzamiento'),
  series: [{
    value: 'PERSONNEL_PARADROP',
    label: L('Largage de personnel', 'Personnel paradrop', 'Personenabsetzen', 'Lanzamiento de personal')
  }, {
    value: 'CARGO_AIRDROP',
    label: L('Largage de matériel', 'Cargo airdrop', 'Lastenabwurf', 'Lanzamiento de carga')
  }, {
    value: 'RESUPPLY',
    label: L('Ravitaillement', 'Resupply', 'Versorgung', 'Reabastecimiento')
  }, {
    value: 'HUMANITARIAN_AIRDROP',
    label: L('Largage humanitaire', 'Humanitarian airdrop', 'Humanitärer Abwurf', 'Lanzamiento humanitario')
  }, {
    value: 'SAR_KIT_DROP',
    label: L('Largage de kit SAR', 'SAR kit drop', 'SAR-Kit-Abwurf', 'Lanzamiento de kit SAR')
  }, {
    value: 'TRAINING_DROP',
    label: L('Largage d’entraînement', 'Training drop', 'Übungsabwurf', 'Lanzamiento de instrucción')
  }],
  events: [opt('RUN_IN', L('Axe d’approche', 'Run-in', 'Anflug', 'Aproximación')), opt('GREEN_LIGHT', L('Feu vert', 'Green light',
    'Grünes Licht', 'Luz verde')), opt('RELEASE', L('Largage', 'Release', 'Absetzen', 'Lanzamiento'))],
  blocks: [{
    id: 'airborne-dz',
    title: L('Zone de largage (DZ)', 'Drop zone (DZ)', 'Absetzzone (DZ)', 'Zona de lanzamiento (DZ)'),
    fields: [
      f(P + 'dz', L('DZ', 'DZ'), 'text', {
        upper: true
      }), f(P + 'coordinates', L('Coordonnées', 'Coordinates', 'Koordinaten', 'Coordenadas')),
      f(P + 'elevationFt', L('Altitude de la DZ (ft)', 'DZ elevation (ft)', 'DZ-Höhe (ft)', 'Elevación de la DZ (ft)'),
        'number'),
      f(P + 'dimensions', L('Dimensions (m)', 'Dimensions (m)', 'Abmessungen (m)', 'Dimensiones (m)'), 'text', {
        placeholder: L('1200 × 400', '1200 × 400')
      }),
      f(P + 'marking', L('Balisage', 'Marking', 'Markierung', 'Balizamiento')), f(P + 'controller', L(
          'Contrôle DZ (indicatif)', 'DZ controller (callsign)', 'DZ-Kontrolle (Rufzeichen)', 'Control de DZ (indicativo)'),
        'text', {
          upper: true
        })
    ]
  }, {
    id: 'airborne-passes',
    title: L('Passages de largage', 'Drop passes', 'Absetzanflüge', 'Pasadas de lanzamiento'),
    collection: {
      path: P + 'passes',
      min: 0,
      compact: true,
      item: L('Passage', 'Pass', 'Anflug', 'Pasada'),
      add: L('+ Ajouter un passage', '+ Add pass', '+ Anflug hinzufügen', '+ Añadir pasada'),
      empty: () => ({
        time: '',
        dropType: 'PERSONNEL',
        jumpers: null,
        load: '',
        loadKg: null,
        parachute: '',
        plannedAltFt: null,
        actualAltFt: null,
        plannedRunIn: null,
        actualRunIn: null,
        wind: '',
        releasePosition: '',
        result: '',
        landingPosition: '',
        dispersionM: null,
        recovered: ''
      }),
      fields: [
        f('time', L('Heure de largage', 'Release time', 'Absetzzeit', 'Hora de lanzamiento'), 'time'), f('dropType', L(
          'Largage', 'Drop', 'Abwurf', 'Lanzamiento'), 'select', {
          options: dropTypes
        }),
        f('jumpers', L('Parachutistes', 'Jumpers', 'Springer', 'Paracaidistas'), 'number'), f('load', L('Charge', 'Load',
          'Last', 'Carga')),
        f('loadKg', L('Masse (kg)', 'Mass (kg)', 'Masse (kg)', 'Masa (kg)'), 'number'), f('parachute', L('Type de parachute',
          'Parachute type', 'Fallschirmtyp', 'Tipo de paracaídas')),
        f('plannedAltFt', L('Altitude prévue (ft)', 'Planned altitude (ft)', 'Geplante Höhe (ft)', 'Altitud prevista (ft)'),
          'number'), f('actualAltFt', L('Altitude réelle (ft)', 'Actual altitude (ft)', 'Tatsächliche Höhe (ft)',
          'Altitud real (ft)'), 'number'),
        f('plannedRunIn', L('Axe prévu (°)', 'Planned run-in (°)', 'Geplanter Anflug (°)', 'Eje previsto (°)'), 'number'), f(
          'actualRunIn', L('Axe réel (°)', 'Actual run-in (°)', 'Tatsächlicher Anflug (°)', 'Eje real (°)'), 'number'),
        f('wind', L('Vent', 'Wind', 'Wind', 'Viento')), f('releasePosition', L('Point de largage', 'Release position',
          'Absetzpunkt', 'Punto de lanzamiento')),
        f('result', L('Résultat', 'Result', 'Ergebnis', 'Resultado'), 'select', {
          options: results,
          blank: true
        }), f('landingPosition', L('Point d’impact observé', 'Observed landing position', 'Beobachteter Landepunkt',
          'Punto de impacto observado')),
        f('dispersionM', L('Dispersion (m)', 'Dispersion (m)', 'Streuung (m)', 'Dispersión (m)'), 'number'), f('recovered', L(
          'Récupération', 'Recovery', 'Bergung', 'Recuperación'), 'select', {
          options: recovered
        })
      ]
    }
  }]
};

export default FAMILY;
