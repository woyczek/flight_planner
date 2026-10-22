// V3 report — famille FIRE, recopiée de la V2 (shared/mission_core/families/fire.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille FIRE / GAAR reconstruite sur le Mission Report Core (étape 2b) : mêmes champs
// que le CR FIRE historique (FIRE/fire_cr.html), plus le modèle commun. Largages et
// écopages : maximum entre la saisie manuelle et les événements (règle historique).
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
const P = 'missionData.fire.';
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const risks = [opt('Green', L('Vert', 'Green', 'Grün', 'Verde')), opt('Yellow', L('Jaune', 'Yellow', 'Gelb', 'Amarillo')), opt('Orange',
  L('Orange', 'Orange', 'Orange', 'Naranja')), opt('Red', L('Rouge', 'Red', 'Rot', 'Rojo'))];
const LEGACY = {
  'Vert': 'Green',
  'Jaune': 'Yellow',
  'Rouge': 'Red',
  'GAAR avec déroutement': 'GAAR with diversion',
  'Intervention': 'Response',
  'Entraînement': 'Training',
  'Autre': 'Other',
  'Alerte feu': 'Fire alert',
  'Déroutement': 'Diversion',
  'Arrivée secteur': 'Sector arrival',
  'Largage': 'Drop',
  'Rechargement': 'Reload',
  'Écopage': 'Scooping',
  'Retour': 'Return',
  'Anomalie': 'Issue'
};
/** Valeur de référence d'une ancienne valeur française (anciens registres CSV / JSON). */
const norm = v => LEGACY[String(v ?? '').trim()] ?? String(v ?? '').trim();
const EVENT = {
  'Observation': 'OTHER',
  'Fire alert': 'FIRE_ALERT',
  'Diversion': 'DIVERSION',
  'Sector arrival': 'ON_TASK',
  'Drop': 'DROP',
  'Reload': 'RELOAD',
  'Scooping': 'SCOOPING',
  'Return': 'OFF_TASK',
  'Issue': 'TECHNICAL'
};
const fire = m => m.missionData?.fire || {};
const eventCount = (m, types) => (m.events || []).filter(e => types.includes(e.type)).length;
const drops = m => Math.max(num(fire(m).drops) || 0, eventCount(m, ['DROP']));
const reloads = m => Math.max(num(fire(m).reloads) || 0, eventCount(m, ['RELOAD', 'SCOOPING']));

const FAMILY = {
  id: 'FIRE',
  idPrefix: 'GAAR',
  ownOrder: true, // bloc d'ordre propre : « Tâche / ordre de mission » commun réservé au CR détaillé,
  defaultCategory: 'fixed',
  pages: {
    cr: 'fire_cr.html',
    reporting: 'fire_reporting.html'
  },
  title: L('FIRE / GAAR — feux de forêt', 'FIRE / GAAR — wildfires', 'FIRE / GAAR — Waldbrände',
    'FIRE / GAAR — incendios forestales'),
  series: [{
    value: 'GAAR',
    label: L('GAAR', 'GAAR')
  }, {
    value: 'GAAR with diversion',
    label: L('GAAR avec déroutement', 'GAAR with diversion', 'GAAR mit Umleitung', 'GAAR con desvío')
  }, {
    value: 'Response',
    label: L('Intervention', 'Response', 'Einsatz', 'Intervención')
  }, {
    value: 'Training',
    label: L('Entraînement', 'Training', 'Training', 'Entrenamiento')
  }],
  events: [
    opt('FIRE_ALERT', L('Alerte feu', 'Fire alert', 'Brandalarm', 'Alerta de incendio')), opt('RELOAD', L('Rechargement',
      'Reload', 'Nachladen', 'Recarga')), opt('SCOOPING', L('Écopage', 'Scooping', 'Wasseraufnahme', 'Amerizaje'))
  ],
  blocks: [{
    id: 'fire-order',
    title: L('Ordre de vol', 'Flight order', 'Flugauftrag', 'Orden de vuelo'),
    fields: [
      f(P + 'risk', L('Niveau de risque', 'Risk level', 'Gefahrenstufe', 'Nivel de riesgo'), 'select', {
        options: risks,
        blank: true
      }),
      f(P + 'sector', L('Circuit / secteur', 'Circuit / sector', 'Route / Sektor', 'Circuito / sector')),
      f(P + 'reloadBase', L('Base rechargement / écopage', 'Reload / scooping base', 'Nachlade- / Schöpfbasis',
        'Base de recarga / amerizaje'), 'text', {
        upper: true,
        pool: 'aerodrome'
      }),
      f(P + 'fms', L('Fichier FMS', 'FMS file', 'FMS-Datei', 'Archivo FMS')), f(P + 'altitude', L('Altitude prévue',
        'Planned altitude', 'Geplante Höhe', 'Altitud prevista')),
      f(P + 'weatherRemarks', L('Vent / météo synthétique', 'Wind / weather summary', 'Wind / Wetterlage',
        'Viento / meteorología')), f(P + 'load', L('Charge eau / retardant', 'Water / retardant load',
        'Wasser- / Retardantlast', 'Carga de agua / retardante'))
    ]
  }, {
    id: 'fire-times',
    title: L('Horaires feux de forêt', 'Wildfire times', 'Waldbrandzeiten', 'Horarios de incendio'),
    fields: [
      f(P + 'patrolStart', L('Début patrouille', 'Patrol start', 'Patrouillenbeginn', 'Inicio de patrulla'), 'time'), f(P +
        'fireAlert', L('Alerte feu', 'Fire alert', 'Brandalarm', 'Alerta de incendio'), 'time'),
      f(P + 'firstDrop', L('Premier largage', 'First drop', 'Erster Abwurf', 'Primer lanzamiento'), 'time'), f(P +
        'endIntervention', L('Fin intervention', 'End of intervention', 'Einsatzende', 'Fin de la intervención'), 'time')
    ]
  }, {
    id: 'fire-drops',
    title: L('Largages et rechargements', 'Drops and reloads', 'Abwürfe und Nachladungen', 'Lanzamientos y recargas'),
    fields: [
      f(P + 'drops', L('Nb largages (manuel)', 'Drops (manual)', 'Abwürfe (manuell)', 'Lanzamientos (manual)'), 'number'),
      f(P + 'reloads', L('Nb rechargements / écopages (manuel)', 'Reloads / scoopings (manual)',
        'Nachladungen / Schöpfvorgänge (manuell)', 'Recargas / amerizajes (manual)'), 'number'),
      f(P + 'reloadTime', L('Temps moyen rechargement', 'Average reload time', 'Mittlere Nachladezeit',
        'Tiempo medio de recarga'))
    ]
  }]
};

export default FAMILY;
