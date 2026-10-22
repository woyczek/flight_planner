// V3 report — famille SURVEY, recopiée de la V2 (shared/mission_core/families/survey.js) le 23/10/2026 par
// tools d'extraction : listes, aides et définition (séries, rôles, événements, blocs, conditions when) telles quelles ;
// statistiques, résumé et import des anciens registres restent à la V2 (reporting, CPCO).
import * as Vocab from '../vocab.js';
import * as M from '../model.js';
// Famille SURVEY / SCIENCE (§16) : photographie aérienne, cartographie, LiDAR,
// photogrammétrie, géophysique, atmosphère, reconnaissance météo, volcans, faune,
// environnement, glaces, océanographie. Lignes de levé et points de mesure en collections.
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
const P = 'missionData.survey.';
/** Nombre d'une saisie (0, ou null selon la famille, si vide ou invalide). */
const num = v => Number(v) || 0;
const lineStatus = [opt('COMPLETED', L('Réalisée', 'Completed', 'Abgeschlossen', 'Completada')), opt('PARTIAL', L('Partielle',
  'Partial', 'Teilweise', 'Parcial')), opt('MISSED', L('Manquée', 'Missed', 'Ausgefallen', 'Fallida')), opt('REPEAT', L('À refaire',
  'Repeat required', 'Wiederholung nötig', 'A repetir'))];
const quality = [opt('GOOD', L('Bonne', 'Good', 'Gut', 'Buena')), opt('ACCEPTABLE', L('Acceptable', 'Acceptable', 'Akzeptabel',
  'Aceptable')), opt('POOR', L('Médiocre', 'Poor', 'Schlecht', 'Deficiente'))];
const yesNo = [opt('', L('—', '—')), opt('YES', L('Oui', 'Yes', 'Ja', 'Sí')), opt('NO', L('Non', 'No', 'Nein', 'No'))];
const lines = m => (m.missionData?.survey?.lines || []).filter(l => l.number || l.status || l.start);
const sv = m => m.missionData?.survey || {};

const FAMILY = {
  id: 'SURVEY',
  idPrefix: 'SRV',
  pages: {
    cr: 'survey_cr.html',
    reporting: 'survey_reporting.html'
  },
  title: L('Levés / missions scientifiques', 'Survey / science', 'Vermessung / Wissenschaft', 'Levantamientos / ciencia'),
  series: [{
    value: 'AERIAL_PHOTO',
    label: L('Photographie aérienne', 'Aerial photography', 'Luftbildaufnahme', 'Fotografía aérea')
  }, {
    value: 'MAPPING',
    label: L('Cartographie', 'Mapping', 'Kartierung', 'Cartografía')
  }, {
    value: 'LIDAR',
    label: L('LiDAR', 'LiDAR')
  }, {
    value: 'PHOTOGRAMMETRY',
    label: L('Photogrammétrie', 'Photogrammetry', 'Photogrammetrie', 'Fotogrametría')
  }, {
    value: 'GEOPHYSICS',
    label: L('Géophysique', 'Geophysics', 'Geophysik', 'Geofísica')
  }, {
    value: 'ATMOSPHERIC',
    label: L('Recherche atmosphérique', 'Atmospheric research', 'Atmosphärenforschung', 'Investigación atmosférica')
  }, {
    value: 'WEATHER_RECON',
    label: L('Reconnaissance météo', 'Weather reconnaissance', 'Wettererkundung', 'Reconocimiento meteorológico')
  }, {
    value: 'VOLCANO',
    label: L('Surveillance volcanique', 'Volcano monitoring', 'Vulkanüberwachung', 'Vigilancia volcánica')
  }, {
    value: 'WILDLIFE',
    label: L('Faune', 'Wildlife', 'Tierwelt', 'Fauna')
  }, {
    value: 'ENVIRONMENT',
    label: L('Environnement', 'Environment', 'Umwelt', 'Medio ambiente')
  }, {
    value: 'ICE',
    label: L('Glaces', 'Ice', 'Eis', 'Hielo')
  }, {
    value: 'OCEANOGRAPHIC',
    label: L('Océanographie', 'Oceanographic', 'Ozeanographie', 'Oceanografía')
  }],
  flags: mission => ({
    maritime: ['OCEANOGRAPHIC', 'ICE'].includes(mission.series)
  }),
  events: [opt('LINE_START', L('Début de ligne', 'Line start', 'Linienbeginn', 'Inicio de línea')), opt('LINE_END', L(
      'Fin de ligne', 'Line end', 'Linienende', 'Fin de línea')), opt('SAMPLE', L('Prélèvement', 'Sample', 'Probe', 'Muestra')),
    opt('DROPSONDE', L('Largage de sonde', 'Dropsonde release', 'Fallsonde abgeworfen', 'Lanzamiento de sonda'))
  ],
  blocks: [{
    id: 'survey-project',
    title: L('Projet et zone de levé', 'Project and survey area', 'Projekt und Messgebiet', 'Proyecto y zona de levantamiento'),
    fields: [
      f(P + 'project', L('Projet', 'Project', 'Projekt', 'Proyecto')), f(P + 'organisation', L('Organisme scientifique',
        'Scientific organisation', 'Wissenschaftliche Einrichtung', 'Organismo científico')),
      f(P + 'principalInvestigator', L('Responsable scientifique', 'Principal investigator', 'Projektleitung',
        'Investigador principal')), f(P + 'area', L('Zone de levé', 'Survey area', 'Messgebiet', 'Zona de levantamiento')),
      f(P + 'polygon', L('Polygone (coordonnées)', 'Polygon (coordinates)', 'Polygon (Koordinaten)',
        'Polígono (coordenadas)'), 'textarea', {
        full: true
      }),
      f(P + 'payload', L('Charge utile scientifique', 'Scientific payload', 'Wissenschaftliche Nutzlast',
        'Carga útil científica'), 'text', {
        full: true
      })
    ]
  }, {
    id: 'survey-lines',
    title: L('Lignes de levé', 'Survey lines', 'Messlinien', 'Líneas de levantamiento'),
    collection: {
      path: P + 'lines',
      min: 0,
      compact: true,
      item: L('Ligne', 'Line', 'Linie', 'Línea'),
      add: L('+ Ajouter une ligne', '+ Add line', '+ Linie hinzufügen', '+ Añadir línea'),
      empty: () => ({
        number: '',
        plannedAltFt: null,
        actualAltFt: null,
        plannedSpeedKt: null,
        actualSpeedKt: null,
        start: '',
        end: '',
        status: '',
        notes: ''
      }),
      fields: [
        f('number', L('N° de ligne', 'Line no.', 'Linien-Nr.', 'N.º de línea'), 'text', {
          upper: true
        }), f('status', L('État', 'Status', 'Status', 'Estado'), 'select', {
          options: lineStatus,
          blank: true
        }),
        f('plannedAltFt', L('Altitude prévue (ft)', 'Planned altitude (ft)', 'Geplante Höhe (ft)', 'Altitud prevista (ft)'),
          'number'), f('actualAltFt', L('Altitude réelle (ft)', 'Actual altitude (ft)', 'Tatsächliche Höhe (ft)',
          'Altitud real (ft)'), 'number'),
        f('plannedSpeedKt', L('Vitesse prévue (kt)', 'Planned speed (kt)', 'Geplante Geschwindigkeit (kt)',
          'Velocidad prevista (kt)'), 'number'), f('actualSpeedKt', L('Vitesse réelle (kt)', 'Actual speed (kt)',
          'Tatsächliche Geschwindigkeit (kt)', 'Velocidad real (kt)'), 'number'),
        f('start', L('Début', 'Start', 'Beginn', 'Inicio'), 'time'), f('end', L('Fin', 'End', 'Ende', 'Fin'), 'time'), f(
          'notes', L('Remarque', 'Note', 'Bemerkung', 'Observación'), 'text', {
            full: true
          })
      ]
    }
  }, {
    id: 'survey-data',
    title: L('Acquisition et données', 'Acquisition and data', 'Erfassung und Daten', 'Adquisición y datos'),
    fields: [
      f(P + 'sensor', L('Capteur', 'Sensor', 'Sensor', 'Sensor')), f(P + 'recordingStart', L('Début d’enregistrement',
        'Recording start', 'Aufzeichnungsbeginn', 'Inicio de grabación'), 'time'),
      f(P + 'recordingEnd', L('Fin d’enregistrement', 'Recording end', 'Aufzeichnungsende', 'Fin de grabación'), 'time'), f(
        P + 'dataGb', L('Volume de données (Go)', 'Data volume (GB)', 'Datenmenge (GB)', 'Volumen de datos (GB)'), 'number'),
      f(P + 'coveragePct', L('Couverture (%)', 'Coverage (%)', 'Abdeckung (%)', 'Cobertura (%)'), 'number'), f(P + 'areaKm2',
        L('Surface couverte (km²)', 'Area covered (km²)', 'Abgedeckte Fläche (km²)', 'Superficie cubierta (km²)'), 'number'),
      f(P + 'samples', L('Échantillons', 'Samples', 'Proben', 'Muestras'), 'number'), f(P + 'repeatRequired', L(
        'Reprise nécessaire', 'Repeat required', 'Wiederholung nötig', 'Repetición necesaria'), 'select', {
        options: yesNo
      }),
      f(P + 'dataQuality', L('Qualité des données', 'Data quality', 'Datenqualität', 'Calidad de los datos'), 'select', {
        options: quality,
        blank: true
      }),
      f(P + 'observations', L('Observations scientifiques', 'Scientific observations', 'Wissenschaftliche Beobachtungen',
        'Observaciones científicas'), 'textarea', {
        full: true
      })
    ]
  }, {
    // Reconnaissance météo / recherche atmosphérique : points de mesure (§16).
    id: 'survey-weather',
    title: L('Points de mesure météo', 'Weather measurement points', 'Wettermesspunkte', 'Puntos de medición meteorológica'),
    when: ctx => ['WEATHER_RECON', 'ATMOSPHERIC'].includes(ctx.series),
    collection: {
      path: P + 'weatherPoints',
      min: 0,
      compact: true,
      item: L('Point', 'Point', 'Punkt', 'Punto'),
      add: L('+ Ajouter un point de mesure', '+ Add measurement point', '+ Messpunkt hinzufügen', '+ Añadir punto de medición'),
      empty: () => ({
        time: '',
        position: '',
        altitudeFt: null,
        pressureHpa: null,
        temperatureC: null,
        humidityPct: null,
        wind: '',
        turbulence: '',
        icing: '',
        cloudLayers: '',
        dropsonde: ''
      }),
      fields: [
        f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('position', L('Position', 'Position', 'Position',
          'Posición')),
        f('altitudeFt', L('Altitude de mesure (ft)', 'Measurement altitude (ft)', 'Messhöhe (ft)',
          'Altitud de medición (ft)'), 'number'), f('pressureHpa', L('Pression (hPa)', 'Pressure (hPa)', 'Luftdruck (hPa)',
          'Presión (hPa)'), 'number'),
        f('temperatureC', L('Température (°C)', 'Temperature (°C)', 'Temperatur (°C)', 'Temperatura (°C)'), 'number'), f(
          'humidityPct', L('Humidité (%)', 'Humidity (%)', 'Feuchte (%)', 'Humedad (%)'), 'number'),
        f('wind', L('Vent', 'Wind', 'Wind', 'Viento')), f('turbulence', L('Turbulence', 'Turbulence', 'Turbulenz',
          'Turbulencia')), f('icing', L('Givrage', 'Icing', 'Vereisung', 'Engelamiento')),
        f('cloudLayers', L('Couches nuageuses', 'Cloud layers', 'Wolkenschichten', 'Capas de nubes')), f('dropsonde', L(
          'Sonde larguée', 'Dropsonde', 'Fallsonde', 'Sonda lanzada'), 'select', {
          options: yesNo
        })
      ]
    }
  }]
};

export default FAMILY;
