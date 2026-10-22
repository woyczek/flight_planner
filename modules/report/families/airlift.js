// V3 report — famille AIRLIFT, recopiée de la V2 (shared/mission_core/families/airlift.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille AIRLIFT / LOGISTICS (§11) : transport stratégique, tactique, isolé, offshore,
// polaire, humanitaire, personnel, fret et mixte. Les rotations utilisent le bloc commun
// « Étapes / sorties / rotations » ; la famille ajoute manifeste, piste et livraison.
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
const P = 'missionData.airlift.';
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => Number(v) || 0;

const cargoTypes = [
  opt('GENERAL', L('Fret général', 'General cargo', 'Stückgut', 'Carga general')), opt('PALLETS', L('Palettes', 'Pallets', 'Paletten',
    'Palés')),
  opt('VEHICLES', L('Véhicules', 'Vehicles', 'Fahrzeuge', 'Vehículos')), opt('MEDICAL', L('Médical', 'Medical', 'Medizinisch',
    'Médico')),
  opt('HUMANITARIAN', L('Humanitaire', 'Humanitarian', 'Humanitär', 'Humanitaria')), opt('FUEL', L('Carburant / liquides',
    'Fuel / liquids', 'Kraftstoff / Flüssigkeiten', 'Combustible / líquidos')),
  opt('MAIL', L('Courrier', 'Mail', 'Post', 'Correo')), opt('EQUIPMENT', L('Matériel technique', 'Technical equipment',
    'Technisches Gerät', 'Material técnico')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
];
const yesNo = [opt('NO', L('Non', 'No', 'Nein', 'No')), opt('YES', L('Oui', 'Yes', 'Ja', 'Sí'))];
const runwayTypes = [
  opt('PAVED', L('Revêtue', 'Paved', 'Befestigt', 'Pavimentada')), opt('GRAVEL', L('Gravier', 'Gravel', 'Schotter', 'Grava')), opt(
    'GRASS', L('Herbe', 'Grass', 'Gras', 'Hierba')),
  opt('SAND', L('Sable / terre', 'Sand / dirt', 'Sand / Erde', 'Arena / tierra')), opt('SNOW', L('Neige / glace', 'Snow / ice',
    'Schnee / Eis', 'Nieve / hielo')),
  opt('HELIPAD', L('Hélisurface / DZ', 'Helipad / landing site', 'Hubschrauberlandeplatz', 'Helipuerto / zona de aterrizaje')), opt(
    'DECK', L('Plateforme / pont', 'Platform / deck', 'Plattform / Deck', 'Plataforma / cubierta'))
];
const unpaved = ctx => ctx.capabilities.has('UNPREPARED_STRIP') || ctx.capabilities.has('ROUGH_FIELD') || !['', 'PAVED', 'HELIPAD',
  'DECK', undefined
].includes(ctx.mission.missionData?.airlift?.runwayType);
const manifest = m => m.missionData?.airlift?.manifest || [];
const cargoKg = m => manifest(m).reduce((a, c) => a + num(c.weightKg), 0) || m.legs?.reduce((a, l) => a + num(l.cargoKg), 0) || 0;
const passengers = m => num(m.missionData?.airlift?.passengers) || (m.legs || []).reduce((a, l) => a + num(l.pax), 0);

const FAMILY = {
  id: 'AIRLIFT',
  idPrefix: 'AIRLIFT',
  pages: {
    cr: 'airlift_cr.html',
    reporting: 'airlift_reporting.html'
  },
  title: L('Transport aérien / logistique', 'Airlift / logistics', 'Lufttransport / Logistik', 'Transporte aéreo / logística'),
  series: [{
    value: 'STRATEGIC',
    label: L('Transport stratégique', 'Strategic airlift', 'Strategischer Lufttransport', 'Transporte estratégico')
  }, {
    value: 'TACTICAL',
    label: L('Transport tactique', 'Tactical airlift', 'Taktischer Lufttransport', 'Transporte táctico')
  }, {
    value: 'REMOTE',
    label: L('Desserte isolée', 'Remote airlift', 'Versorgung abgelegener Orte', 'Transporte a zonas aisladas')
  }, {
    value: 'OFFSHORE',
    label: L('Logistique offshore', 'Offshore logistics', 'Offshore-Logistik', 'Logística offshore')
  }, {
    value: 'POLAR',
    label: L('Antarctique / polaire', 'Antarctic / polar', 'Antarktis / Polar', 'Antártida / polar')
  }, {
    value: 'HUMANITARIAN',
    label: L('Logistique humanitaire', 'Humanitarian logistics', 'Humanitäre Logistik', 'Logística humanitaria')
  }, {
    value: 'PERSONNEL',
    label: L('Transport de personnel', 'Personnel transport', 'Personentransport', 'Transporte de personal')
  }, {
    value: 'CARGO',
    label: L('Fret', 'Cargo', 'Fracht', 'Carga')
  }, {
    value: 'COMBI',
    label: L('Mixte passagers / fret', 'Combi (passengers / cargo)', 'Kombi (Passagiere / Fracht)', 'Mixto (pasajeros / carga)')
  }],
  flags: mission => ({
    maritime: mission.series === 'OFFSHORE'
  }),
  events: [
    opt('LOADING', L('Chargement', 'Loading', 'Beladung', 'Carga')), opt('UNLOADING', L('Déchargement', 'Unloading', 'Entladung',
      'Descarga')),
    opt('PAX_BOARDING', L('Embarquement passagers', 'Passenger boarding', 'Einsteigen der Passagiere', 'Embarque de pasajeros')),
    opt('DELAY', L('Retard', 'Delay', 'Verspätung', 'Retraso'))
  ],
  blocks: [{
    id: 'airlift-route',
    title: L('Origine, destination et escales', 'Origin, destination and stops', 'Start, Ziel und Zwischenlandungen',
      'Origen, destino y escalas'),
    fields: [
      f(P + 'origin', L('Origine', 'Origin', 'Start', 'Origen'), 'text', {
        upper: true
      }),
      f(P + 'destination', L('Destination', 'Destination', 'Ziel', 'Destino'), 'text', {
        upper: true
      }),
      f(P + 'stops', L('Escales intermédiaires', 'Intermediate stops', 'Zwischenlandungen', 'Escalas intermedias'), 'text', {
        upper: true,
        placeholder: L('LFMI, LFKJ…', 'LFMI, LFKJ…')
      })
    ]
  }, {
    id: 'airlift-manifest',
    title: L('Manifeste de fret', 'Cargo manifest', 'Frachtmanifest', 'Manifiesto de carga'),
    collection: {
      path: P + 'manifest',
      min: 0,
      compact: true,
      item: L('Lot', 'Item', 'Position', 'Partida'),
      add: L('+ Ajouter un lot', '+ Add item', '+ Position hinzufügen', '+ Añadir partida'),
      empty: () => ({
        description: '',
        type: 'GENERAL',
        weightKg: null,
        volumeM3: null,
        pallets: null,
        dangerousGoods: 'NO'
      }),
      fields: [
        f('description', L('Désignation', 'Description', 'Bezeichnung', 'Descripción')), f('type', L('Nature', 'Type', 'Art',
          'Tipo'), 'select', {
          options: cargoTypes
        }),
        f('weightKg', L('Masse (kg)', 'Weight (kg)', 'Gewicht (kg)', 'Peso (kg)'), 'number'), f('volumeM3', L('Volume (m³)',
          'Volume (m³)', 'Volumen (m³)', 'Volumen (m³)'), 'number'),
        f('pallets', L('Palettes', 'Pallets', 'Paletten', 'Palés'), 'number'), f('dangerousGoods', L(
          'Marchandises dangereuses', 'Dangerous goods', 'Gefahrgut', 'Mercancías peligrosas'), 'select', {
          options: yesNo
        })
      ]
    }
  }, {
    id: 'airlift-pax',
    title: L('Passagers et chargements particuliers', 'Passengers and special loads', 'Passagiere und Sonderladungen',
      'Pasajeros y cargas especiales'),
    fields: [
      f(P + 'passengers', L('Passagers', 'Passengers', 'Passagiere', 'Pasajeros'), 'number'),
      f(P + 'passengerDetail', L('Détail passagers (anonymisé)', 'Passenger detail (anonymised)',
        'Passagierdetails (anonymisiert)', 'Detalle de pasajeros (anonimizado)')),
      f(P + 'specialCargo', L('Chargement particulier', 'Special cargo', 'Sonderladung', 'Carga especial'), 'textarea', {
        full: true
      })
    ]
  }, {
    id: 'airlift-ground',
    title: L('Piste et opérations au sol', 'Runway and ground operations', 'Piste und Bodenbetrieb',
      'Pista y operaciones en tierra'),
    fields: [
      f(P + 'runwayType', L('Type de piste', 'Runway type', 'Pistenart', 'Tipo de pista'), 'select', {
        options: runwayTypes,
        blank: true
      }),
      f(P + 'runwayLengthM', L('Longueur de piste (m)', 'Runway length (m)', 'Pistenlänge (m)', 'Longitud de pista (m)'),
        'number'),
      f(P + 'surfaceCondition', L('État de surface', 'Surface condition', 'Oberflächenzustand', 'Estado de la superficie'),
        'text', {
          when: unpaved
        }),
      f(P + 'loadingMinutes', L('Durée de chargement (min)', 'Loading time (min)', 'Beladedauer (min)',
        'Tiempo de carga (min)'), 'number'),
      f(P + 'unloadingMinutes', L('Durée de déchargement (min)', 'Unloading time (min)', 'Entladedauer (min)',
        'Tiempo de descarga (min)'), 'number'),
      f(P + 'turnaroundMinutes', L('Rotation au sol (min)', 'Turnaround (min)', 'Bodenzeit (min)', 'Tiempo de escala (min)'),
        'number')
    ]
  }, {
    id: 'airlift-delivery',
    title: L('Livraison', 'Delivery', 'Auslieferung', 'Entrega'),
    fields: [
      f(P + 'deliveredKg', L('Charge livrée (kg)', 'Payload delivered (kg)', 'Ausgelieferte Nutzlast (kg)',
        'Carga entregada (kg)'), 'number'),
      f(P + 'returnedKg', L('Charge ramenée (kg)', 'Payload returned (kg)', 'Zurückgebrachte Nutzlast (kg)',
        'Carga devuelta (kg)'), 'number'),
      f(P + 'delays', L('Retards (motif, durée)', 'Delays (reason, duration)', 'Verspätungen (Grund, Dauer)',
        'Retrasos (motivo, duración)'), 'textarea', {
        full: true
      })
    ]
  }]
};

export default FAMILY;
