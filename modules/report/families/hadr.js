// V3 report — famille HADR, recopiée de la V2 (shared/mission_core/families/hadr.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille HADR / EVACUATION (§12) : aide humanitaire et secours en cas de catastrophe,
// évacuations (NEO, civiles), désenclavement, ravitaillement par largage. Les rotations
// passent par le bloc commun « Étapes / sorties / rotations ».
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
const P = 'missionData.hadr.';
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => Number(v) || 0;
const pointKinds = [opt('PICKUP', L('Point d’enlèvement', 'Pickup location', 'Aufnahmeort', 'Punto de recogida')), opt('EVAC_POINT', L(
  'Point d’évacuation', 'Evacuation point', 'Evakuierungspunkt', 'Punto de evacuación')), opt('SHELTER', L('Abri / hébergement',
  'Shelter', 'Notunterkunft', 'Refugio')), opt('DESTINATION', L('Destination', 'Destination', 'Ziel', 'Destino')), opt('DROP_ZONE',
  L('Zone de largage', 'Drop zone', 'Abwurfzone', 'Zona de lanzamiento'))];
const relief = m => {
  const r = m.missionData?.hadr || {};
  return num(r.waterKg) + num(r.foodKg) + num(r.medicalKg) + num(r.otherCargoKg);
};

const FAMILY = {
  id: 'HADR',
  idPrefix: 'HADR',
  pages: {
    cr: 'hadr_cr.html',
    reporting: 'hadr_reporting.html'
  },
  title: L('Aide humanitaire / évacuation', 'Humanitarian assistance / evacuation', 'Humanitäre Hilfe / Evakuierung',
    'Ayuda humanitaria / evacuación'),
  series: [{
    value: 'DISASTER_RELIEF',
    label: L('Secours en cas de catastrophe', 'Disaster relief', 'Katastrophenhilfe', 'Socorro en catástrofes')
  }, {
    value: 'FLOOD',
    label: L('Inondation', 'Flood', 'Hochwasser', 'Inundación')
  }, {
    value: 'EARTHQUAKE',
    label: L('Séisme', 'Earthquake', 'Erdbeben', 'Terremoto')
  }, {
    value: 'CYCLONE',
    label: L('Cyclone', 'Cyclone', 'Zyklon', 'Ciclón')
  }, {
    value: 'STORM',
    label: L('Tempête', 'Storm', 'Sturm', 'Tormenta')
  }, {
    value: 'VOLCANO',
    label: L('Éruption volcanique', 'Volcanic eruption', 'Vulkanausbruch', 'Erupción volcánica')
  }, {
    value: 'HUMANITARIAN',
    label: L('Mission humanitaire', 'Humanitarian mission', 'Humanitärer Einsatz', 'Misión humanitaria')
  }, {
    value: 'NEO',
    label: L('Évacuation de ressortissants (NEO)', 'Non-combatant evacuation (NEO)', 'Evakuierung von Staatsangehörigen (NEO)',
      'Evacuación de no combatientes (NEO)')
  }, {
    value: 'CIVIL_EVACUATION',
    label: L('Évacuation civile', 'Civil evacuation', 'Zivile Evakuierung', 'Evacuación civil')
  }, {
    value: 'ISOLATED_COMMUNITY',
    label: L('Désenclavement de population isolée', 'Isolated community support', 'Versorgung isolierter Gemeinden',
      'Apoyo a comunidades aisladas')
  }, {
    value: 'SUPPLY_DROP',
    label: L('Ravitaillement par largage', 'Supply drop', 'Versorgungsabwurf', 'Lanzamiento de suministros')
  }],
  events: [
    opt('EVACUEES_BOARDED', L('Évacués embarqués', 'Evacuees boarded', 'Evakuierte an Bord', 'Evacuados embarcados')), opt(
      'EVACUEES_DELIVERED', L('Évacués débarqués', 'Evacuees delivered', 'Evakuierte abgesetzt', 'Evacuados desembarcados')),
    opt('RELIEF_UNLOADED', L('Fret de secours déchargé', 'Relief cargo unloaded', 'Hilfsgüter entladen',
      'Carga de socorro descargada'))
  ],
  blocks: [{
    id: 'hadr-context',
    title: L('Catastrophe et contexte', 'Disaster and context', 'Katastrophe und Lage', 'Catástrofe y contexto'),
    fields: [
      f(P + 'disaster', L('Événement / catastrophe', 'Event / disaster', 'Ereignis / Katastrophe', 'Evento / catástrofe')), f(
        P + 'affectedArea', L('Zone sinistrée', 'Affected area', 'Betroffenes Gebiet', 'Zona afectada')),
      f(P + 'authority', L('Autorité / organisme coordinateur', 'Coordinating authority', 'Koordinierende Stelle',
        'Autoridad coordinadora')),
      f(P + 'populationAffected', L('Population touchée', 'Population affected', 'Betroffene Bevölkerung',
        'Población afectada'), 'number')
    ]
  }, {
    id: 'hadr-points',
    title: L('Points d’enlèvement, d’évacuation et abris', 'Pickup, evacuation points and shelters',
      'Aufnahme-, Evakuierungspunkte und Unterkünfte', 'Puntos de recogida, evacuación y refugios'),
    collection: {
      path: P + 'points',
      min: 0,
      compact: true,
      item: L('Point', 'Point', 'Punkt', 'Punto'),
      add: L('+ Ajouter un point', '+ Add point', '+ Punkt hinzufügen', '+ Añadir punto'),
      empty: () => ({
        kind: 'PICKUP',
        name: '',
        coordinates: '',
        notes: ''
      }),
      fields: [f('kind', L('Type', 'Type', 'Art', 'Tipo'), 'select', {
        options: pointKinds
      }), f('name', L('Nom', 'Name', 'Name', 'Nombre'), 'text', {
        upper: true
      }), f('coordinates', L('Coordonnées', 'Coordinates', 'Koordinaten', 'Coordenadas')), f('notes', L('Remarque', 'Note',
        'Bemerkung', 'Observación'))]
    }
  }, {
    id: 'hadr-evacuees',
    title: L('Évacués et personnels', 'Evacuees and personnel', 'Evakuierte und Personal', 'Evacuados y personal'),
    fields: [
      f(P + 'evacueesPlanned', L('Évacués prévus', 'Evacuees planned', 'Geplante Evakuierte', 'Evacuados previstos'),
        'number'),
      f(P + 'evacueesTransported', L('Évacués transportés', 'Evacuees transported', 'Beförderte Evakuierte',
        'Evacuados transportados'), 'number'),
      f(P + 'children', L('dont enfants', 'of which children', 'davon Kinder', 'de ellos niños'), 'number'),
      f(P + 'dependent', L('dont personnes dépendantes', 'of which dependent persons', 'davon pflegebedürftige Personen',
        'de ellos personas dependientes'), 'number'),
      f(P + 'medical', L('dont passagers médicaux', 'of which medical passengers', 'davon medizinische Fälle',
        'de ellos pasajeros médicos'), 'number'),
      f(P + 'reliefPersonnel', L('Personnels de secours transportés', 'Relief personnel transported',
        'Beförderte Hilfskräfte', 'Personal de socorro transportado'), 'number')
    ]
  }, {
    id: 'hadr-relief',
    title: L('Fret de secours', 'Relief cargo', 'Hilfsgüter', 'Carga de socorro'),
    fields: [
      f(P + 'waterKg', L('Eau (kg)', 'Water (kg)', 'Wasser (kg)', 'Agua (kg)'), 'number'), f(P + 'foodKg', L('Vivres (kg)',
        'Food (kg)', 'Lebensmittel (kg)', 'Víveres (kg)'), 'number'),
      f(P + 'medicalKg', L('Matériel médical (kg)', 'Medical supplies (kg)', 'Sanitätsmaterial (kg)', 'Material médico (kg)'),
        'number'), f(P + 'shelters', L('Abris / tentes', 'Shelters / tents', 'Unterkünfte / Zelte', 'Refugios / tiendas'),
        'number'),
      f(P + 'commsEquipment', L('Moyens de communication', 'Communications equipment', 'Kommunikationsmittel',
        'Equipos de comunicación'), 'number'), f(P + 'otherCargoKg', L('Autre fret (kg)', 'Other cargo (kg)',
        'Sonstige Fracht (kg)', 'Otra carga (kg)'), 'number')
    ]
  }, {
    id: 'hadr-drop',
    title: L('Largage de ravitaillement', 'Supply drop', 'Versorgungsabwurf', 'Lanzamiento de suministros'),
    when: ctx => ctx.series === 'SUPPLY_DROP' || ctx.capabilities.has('AIRDROP'),
    fields: [f(P + 'drops', L('Largages effectués', 'Drops performed', 'Durchgeführte Abwürfe', 'Lanzamientos efectuados'),
      'number'), f(P + 'dropZone', L('Zone de largage', 'Drop zone', 'Abwurfzone', 'Zona de lanzamiento'), 'text', {
      upper: true
    }), f(P + 'dropResult', L('Résultat du largage', 'Drop result', 'Abwurfergebnis', 'Resultado del lanzamiento'))]
  }]
};

export default FAMILY;
