(() => {
  'use strict';
  // Famille SURVEY / SCIENCE (§16) : photographie aérienne, cartographie, LiDAR,
  // photogrammétrie, géophysique, atmosphère, reconnaissance météo, volcans, faune,
  // environnement, glaces, océanographie. Lignes de levé et points de mesure en collections.
  const V = window.MissionVocab,
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

  window.MissionCore.registerFamily({
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
    }],
    stats: [{
      id: 'surveyHours',
      label: L('Heures de levé', 'Survey hours', 'Messstunden', 'Horas de levantamiento'),
      format: 'duration',
      value: ms => ms.reduce((a, m) => a + (window.MissionModel.computeStatistics(m).timeOnStationMinutes || 0), 0)
    }, {
      id: 'lines',
      label: L('Lignes réalisées', 'Lines completed', 'Abgeschlossene Linien', 'Líneas completadas'),
      value: ms => ms.reduce((a, m) => a + lines(m).filter(l => l.status === 'COMPLETED').length, 0)
    }, {
      id: 'area',
      label: L('Surface couverte (km²)', 'Area covered (km²)', 'Abgedeckte Fläche (km²)', 'Superficie cubierta (km²)'),
      value: ms => ms.reduce((a, m) => a + num(sv(m).areaKm2), 0)
    }, {
      id: 'datasets',
      label: L('Jeux de données', 'Datasets', 'Datensätze', 'Conjuntos de datos'),
      value: ms => ms.filter(m => num(sv(m).dataGb) > 0 || sv(m).recordingStart).length
    }],
    summary: (() => {
      /** Modèle du résumé automatique (§22) : w = mots de liaison d'une langue, h = outils du résumé (MissionReport.helpers : mission, statistiques, appareils, listes, dates) → texte du résumé ; les morceaux dont une donnée manque sont omis. */
      const build = w => h => {
        const m = h.mission,
          d = sv(m),
          s = h.stats,
          ls = lines(m),
          done = ls.filter(l => l.status === 'COMPLETED').length,
          redo = ls.filter(l => l.status === 'REPEAT' || l.status === 'MISSED').length;
        const q = h.pick(quality.find(o => o.value === d.dataQuality)?.label),
          points = (d.weatherPoints || []).filter(p => p.time || p.pressureHpa != null).length;
        return h.sentence(
          `${h.series || w.survey}${d.project ? ` (${d.project})` : ''}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, d.area && `${w.over} ${d.area}`, '.',
          ls.length && `${w.lines(done, ls.length)}${redo ? `, ${w.redo(redo)}` : ''}.`,
          d.coveragePct != null && d.coveragePct !== '' && `${w.coverage} ${h.number(d.coveragePct)} %${d.areaKm2 ? ` (${h.number(d.areaKm2)} km²)` : ''}.`,
          d.dataGb && `${w.data(h.number(d.dataGb, 1))}${q ? ` (${w.quality} ${String(q).toLowerCase()})` : ''}.`,
          h.visible('survey-weather') && points && `${w.points(points)}.`,
          s.timeOnStationMinutes != null && `${w.station} ${h.duration(s.timeOnStationMinutes)}${s.flightMinutes != null ? `, ${w.flight} ${h.duration(s.flightMinutes)}` : ''}.`);
      };
      return {
        fr: build({
          survey: 'Levé',
          on: 'du',
          by: 'réalisé par',
          and: 'et',
          over: 'sur',
          lines: (d, t) => `${d} ligne(s) réalisée(s) sur ${t}`,
          redo: n => `${n} à refaire`,
          coverage: 'Couverture',
          data: v => `${v} Go de données`,
          quality: 'qualité',
          points: n => `${n} point(s) de mesure météo`,
          station: 'Temps de levé',
          flight: 'temps de vol'
        }),
        en: build({
          survey: 'Survey',
          on: 'on',
          by: 'flown by',
          and: 'and',
          over: 'over',
          lines: (d, t) => `${d} of ${t} line(s) completed`,
          redo: n => `${n} to be repeated`,
          coverage: 'Coverage',
          data: v => `${v} GB of data`,
          quality: 'quality',
          points: n => `${n} weather measurement point(s)`,
          station: 'Survey time',
          flight: 'flight time'
        }),
        de: build({
          survey: 'Vermessung',
          on: 'am',
          by: 'durchgeführt mit',
          and: 'und',
          over: 'über',
          lines: (d, t) => `${d} von ${t} Linie(n) abgeschlossen`,
          redo: n => `${n} zu wiederholen`,
          coverage: 'Abdeckung',
          data: v => `${v} GB Daten`,
          quality: 'Qualität',
          points: n => `${n} Wettermesspunkt(e)`,
          station: 'Messzeit',
          flight: 'Flugzeit'
        }),
        es: build({
          survey: 'Levantamiento',
          on: 'del',
          by: 'realizado por',
          and: 'y',
          over: 'sobre',
          lines: (d, t) => `${d} de ${t} línea(s) completada(s)`,
          redo: n => `${n} a repetir`,
          coverage: 'Cobertura',
          data: v => `${v} GB de datos`,
          quality: 'calidad',
          points: n => `${n} punto(s) de medición meteorológica`,
          station: 'Tiempo de levantamiento',
          flight: 'tiempo de vuelo'
        })
      };
    })()
  });
})();
