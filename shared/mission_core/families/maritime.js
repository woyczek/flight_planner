(() => {
  'use strict';
  // Famille MARITIME (§8) : patrouille maritime, pêches, douane, pollution, surveillance
  // du trafic, glaces, identification de navires, offshore. Plusieurs contacts navires et
  // plusieurs pollutions par mission (collections dynamiques).
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
  const P = 'missionData.maritime.';
  const yesNo = [opt('', L('—', '—')), opt('YES', L('Oui', 'Yes', 'Ja', 'Sí')), opt('NO', L('Non', 'No', 'Nein', 'No'))];
  const vesselTypes = [
    opt('FISHING', L('Pêche', 'Fishing', 'Fischerei', 'Pesca')), opt('CARGO', L('Cargo', 'Cargo', 'Frachter', 'Carguero')), opt('TANKER', L('Pétrolier / chimiquier', 'Tanker', 'Tanker', 'Petrolero / químico')),
    opt('PASSENGER', L('Passagers', 'Passenger', 'Passagierschiff', 'Pasaje')), opt('PLEASURE', L('Plaisance', 'Pleasure craft', 'Sportboot', 'Recreo')), opt('MILITARY', L('Militaire / État', 'Military / state', 'Militär / Staat', 'Militar / estatal')),
    opt('RESEARCH', L('Recherche', 'Research', 'Forschung', 'Investigación')), opt('OFFSHORE', L('Offshore / servitude', 'Offshore / supply', 'Offshore / Versorger', 'Offshore / suministro')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
  ];
  const idResult = [opt('POSITIVE', L('Identifié', 'Identified', 'Identifiziert', 'Identificado')), opt('UNCONFIRMED', L('Non confirmé', 'Unconfirmed', 'Unbestätigt', 'No confirmado')), opt('NOT_IDENTIFIED', L('Non identifié', 'Not identified', 'Nicht identifiziert', 'No identificado'))];
  const pollutionTypes = [opt('OIL', L('Hydrocarbures', 'Oil', 'Öl', 'Hidrocarburos')), opt('CHEMICAL', L('Produit chimique', 'Chemical', 'Chemikalie', 'Químico')), opt('WASTE', L('Déchets flottants', 'Floating waste', 'Treibgut', 'Residuos flotantes')), opt('ALGAE', L('Algues', 'Algae', 'Algen', 'Algas')), opt('UNKNOWN', L('Indéterminée', 'Unknown', 'Unbekannt', 'Indeterminada'))];
  const vessels = m => (m.missionData?.maritime?.vessels || []).filter(v => v.name || v.mmsi || v.imo || v.type || v.position);
  const pollutions = m => (m.missionData?.maritime?.pollution || []).filter(p => p.nature || p.position);

  window.MissionCore.registerFamily({
    id: 'MARITIME',
    idPrefix: 'MAR',
    pages: {
      cr: 'maritime_cr.html',
      reporting: 'maritime_reporting.html'
    },
    title: L('Surveillance maritime', 'Maritime surveillance', 'Seeraumüberwachung', 'Vigilancia marítima'),
    series: [{
      value: 'MARPAT',
      label: L('Patrouille maritime (MARPAT)', 'Maritime patrol (MARPAT)', 'Seefernaufklärung (MARPAT)', 'Patrulla marítima (MARPAT)')
    }, {
      value: 'FISHERY',
      label: L('Police des pêches', 'Fishery patrol', 'Fischereiaufsicht', 'Vigilancia pesquera')
    }, {
      value: 'CUSTOMS',
      label: L('Douane maritime', 'Maritime customs', 'Seezoll', 'Aduana marítima')
    }, {
      value: 'POLLUTION',
      label: L('Surveillance des pollutions', 'Pollution surveillance', 'Verschmutzungsüberwachung', 'Vigilancia de la contaminación')
    }, {
      value: 'SHIPPING',
      label: L('Surveillance du trafic', 'Shipping surveillance', 'Verkehrsüberwachung', 'Vigilancia del tráfico')
    }, {
      value: 'ICE',
      label: L('Patrouille des glaces', 'Ice patrol', 'Eisbeobachtung', 'Patrulla de hielos')
    }, {
      value: 'SHIP_ID',
      label: L('Identification de navires', 'Ship identification', 'Schiffsidentifizierung', 'Identificación de buques')
    }, {
      value: 'ANTI_POLLUTION',
      label: L('Lutte antipollution', 'Anti-pollution', 'Ölbekämpfung', 'Lucha anticontaminación')
    }, {
      value: 'OFFSHORE',
      label: L('Surveillance offshore', 'Offshore surveillance', 'Offshore-Überwachung', 'Vigilancia offshore')
    }],
    flags: {
      maritime: true
    },
    events: [
      opt('VESSEL_DETECTED', L('Navire détecté', 'Vessel detected', 'Schiff erfasst', 'Buque detectado')), opt('VESSEL_IDENTIFIED', L('Navire identifié', 'Vessel identified', 'Schiff identifiziert', 'Buque identificado')),
      opt('POLLUTION_SIGHTED', L('Pollution observée', 'Pollution sighted', 'Verschmutzung gesichtet', 'Contaminación observada')), opt('REPORT_SENT', L('Compte rendu transmis', 'Report sent', 'Meldung abgesetzt', 'Informe transmitido'))
    ],
    blocks: [{
      id: 'maritime-area',
      title: L('Zone maritime et conditions', 'Maritime area and conditions', 'Seegebiet und Bedingungen', 'Zona marítima y condiciones'),
      fields: [
        f(P + 'seaArea', L('Zone maritime', 'Maritime area', 'Seegebiet', 'Zona marítima')), f(P + 'sector', L('Secteur', 'Sector', 'Sektor', 'Sector')),
        f(P + 'waveHeightM', L('Hauteur des vagues (m)', 'Wave height (m)', 'Wellenhöhe (m)', 'Altura de las olas (m)'), 'number'),
        f(P + 'surfaceWind', L('Vent de surface', 'Surface wind', 'Bodenwind', 'Viento en superficie'))
      ]
    }, {
      id: 'maritime-vessels',
      title: L('Contacts navires', 'Vessel contacts', 'Schiffskontakte', 'Contactos de buques'),
      collection: {
        path: P + 'vessels',
        min: 0,
        compact: true,
        item: L('Navire', 'Vessel', 'Schiff', 'Buque'),
        add: L('+ Ajouter un navire', '+ Add vessel', '+ Schiff hinzufügen', '+ Añadir buque'),
        empty: () => ({
          time: '',
          name: '',
          imo: '',
          mmsi: '',
          callsign: '',
          flag: '',
          type: '',
          course: null,
          speedKt: null,
          position: '',
          ais: '',
          radar: '',
          visual: '',
          identification: 'UNCONFIRMED',
          photo: '',
          behaviour: '',
          anomaly: ''
        }),
        fields: [
          f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('name', L('Nom', 'Name', 'Name', 'Nombre'), 'text', {
            upper: true
          }),
          f('imo', L('IMO', 'IMO'), 'text', {
            upper: true
          }), f('mmsi', L('MMSI', 'MMSI')), f('callsign', L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'), 'text', {
            upper: true
          }),
          f('flag', L('Pavillon', 'Flag', 'Flagge', 'Pabellón'), 'text', {
            upper: true
          }), f('type', L('Type', 'Type', 'Typ', 'Tipo'), 'select', {
            options: vesselTypes,
            blank: true
          }),
          f('course', L('Cap', 'Course', 'Kurs', 'Rumbo'), 'number'), f('speedKt', L('Vitesse (kt)', 'Speed (kt)', 'Geschwindigkeit (kt)', 'Velocidad (kt)'), 'number'),
          f('position', L('Position', 'Position', 'Position', 'Posición')), f('ais', L('AIS', 'AIS'), 'select', {
            options: yesNo
          }), f('radar', L('Contact radar', 'Radar contact', 'Radarkontakt', 'Contacto radar'), 'select', {
            options: yesNo
          }),
          f('visual', L('Contact visuel', 'Visual contact', 'Sichtkontakt', 'Contacto visual'), 'select', {
            options: yesNo
          }), f('identification', L('Identification', 'Identification', 'Identifizierung', 'Identificación'), 'select', {
            options: idResult
          }),
          f('photo', L('Photographie', 'Photograph', 'Foto', 'Fotografía'), 'select', {
            options: yesNo
          }), f('behaviour', L('Comportement', 'Behaviour', 'Verhalten', 'Comportamiento')),
          f('anomaly', L('Anomalie', 'Anomaly', 'Auffälligkeit', 'Anomalía'), 'text', {
            full: true
          })
        ]
      }
    }, {
      id: 'maritime-pollution',
      title: L('Pollutions observées', 'Pollution observed', 'Beobachtete Verschmutzungen', 'Contaminación observada'),
      collection: {
        path: P + 'pollution',
        min: 0,
        compact: true,
        item: L('Pollution', 'Pollution', 'Verschmutzung', 'Contaminación'),
        add: L('+ Ajouter une pollution', '+ Add pollution', '+ Verschmutzung hinzufügen', '+ Añadir contaminación'),
        empty: () => ({
          time: '',
          position: '',
          nature: '',
          lengthM: null,
          widthM: null,
          areaKm2: null,
          drift: '',
          source: ''
        }),
        fields: [
          f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('position', L('Position', 'Position', 'Position', 'Posición')),
          f('nature', L('Nature', 'Type', 'Art', 'Naturaleza'), 'select', {
            options: pollutionTypes,
            blank: true
          }), f('lengthM', L('Longueur (m)', 'Length (m)', 'Länge (m)', 'Longitud (m)'), 'number'),
          f('widthM', L('Largeur (m)', 'Width (m)', 'Breite (m)', 'Anchura (m)'), 'number'), f('areaKm2', L('Surface (km²)', 'Area (km²)', 'Fläche (km²)', 'Superficie (km²)'), 'number'),
          f('drift', L('Dérive', 'Drift', 'Drift', 'Deriva')), f('source', L('Source présumée', 'Suspected source', 'Vermutete Quelle', 'Fuente presunta'))
        ]
      }
    }, {
      id: 'maritime-report',
      title: L('Transmission du compte rendu', 'Report transmission', 'Meldungsweitergabe', 'Transmisión del informe'),
      fields: [
        f(P + 'reportedTo', L('Compte rendu transmis à', 'Report sent to', 'Meldung an', 'Informe transmitido a')),
        f(P + 'reportTime', L('Heure de transmission', 'Transmission time', 'Übermittlungszeit', 'Hora de transmisión'), 'time'),
        f(P + 'reportMeans', L('Moyen (radio, datalink…)', 'Means (radio, datalink…)', 'Mittel (Funk, Datalink…)', 'Medio (radio, enlace de datos…)'))
      ]
    }],
    stats: [{
      id: 'detected',
      label: L('Navires détectés', 'Vessels detected', 'Erfasste Schiffe', 'Buques detectados'),
      value: ms => ms.reduce((a, m) => a + vessels(m).length, 0)
    }, {
      id: 'identified',
      label: L('Navires identifiés', 'Vessels identified', 'Identifizierte Schiffe', 'Buques identificados'),
      value: ms => ms.reduce((a, m) => a + vessels(m).filter(v => v.identification === 'POSITIVE').length, 0)
    }, {
      id: 'anomalies',
      label: L('Anomalies', 'Anomalies', 'Auffälligkeiten', 'Anomalías'),
      value: ms => ms.reduce((a, m) => a + vessels(m).filter(v => v.anomaly).length, 0)
    }, {
      id: 'pollution',
      label: L('Pollutions observées', 'Pollution events', 'Verschmutzungen', 'Contaminaciones'),
      value: ms => ms.reduce((a, m) => a + pollutions(m).length, 0)
    }],
    summary: (() => {
      /** Modèle du résumé automatique (§22) : w = mots de liaison d'une langue, h = outils du résumé (MissionReport.helpers : mission, statistiques, appareils, listes, dates) → texte du résumé ; les morceaux dont une donnée manque sont omis. */
      const build = w => h => {
        const m = h.mission,
          d = m.missionData?.maritime || {},
          s = h.stats,
          vs = vessels(m),
          ids = vs.filter(v => v.identification === 'POSITIVE').length;
        const anomalies = vs.filter(v => v.anomaly).length,
          pols = pollutions(m).length,
          area = [d.seaArea, d.sector].filter(Boolean).join(' / ') || m.navigation?.area;
        return h.sentence(
          `${h.series || w.patrol}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, h.lead.baseDeparture && `${w.from} ${h.lead.baseDeparture}`, area && `${w.over} ${area}`, '.',
          `${w.vessels(vs.length, ids)}${anomalies ? `, ${w.anomalies(anomalies)}` : ''}.`,
          pols && `${w.pollution(pols)}.`, d.reportedTo && `${w.reported} ${d.reportedTo}${d.reportTime ? ` ${w.at} ${d.reportTime}` : ''}.`,
          s.timeOnStationMinutes != null && `${w.station} ${h.duration(s.timeOnStationMinutes)}${s.flightMinutes != null ? `, ${w.flight} ${h.duration(s.flightMinutes)}` : ''}.`,
          h.outcome && `${w.outcome} ${h.outcome}.`);
      };
      const n = (x, one, many) => `${x} ${x > 1 ? many : one}`;
      return {
        fr: build({
          patrol: 'Surveillance maritime',
          on: 'du',
          by: 'réalisée par',
          and: 'et',
          from: 'depuis',
          over: 'sur',
          vessels: (t, i) => `${n(t, 'navire détecté', 'navires détectés')} dont ${i} identifié(s)`,
          anomalies: x => n(x, 'anomalie', 'anomalies'),
          pollution: x => n(x, 'pollution observée', 'pollutions observées'),
          reported: 'Compte rendu transmis à',
          at: 'à',
          station: 'Temps sur zone',
          flight: 'temps de vol',
          outcome: 'Résultat :'
        }),
        en: build({
          patrol: 'Maritime surveillance',
          on: 'on',
          by: 'flown by',
          and: 'and',
          from: 'from',
          over: 'over',
          vessels: (t, i) => `${n(t, 'vessel detected', 'vessels detected')}, ${i} identified`,
          anomalies: x => n(x, 'anomaly', 'anomalies'),
          pollution: x => n(x, 'pollution event', 'pollution events'),
          reported: 'Report sent to',
          at: 'at',
          station: 'Time on station',
          flight: 'flight time',
          outcome: 'Outcome:'
        }),
        de: build({
          patrol: 'Seeraumüberwachung',
          on: 'am',
          by: 'durchgeführt mit',
          and: 'und',
          from: 'ab',
          over: 'über',
          vessels: (t, i) => `${n(t, 'Schiff erfasst', 'Schiffe erfasst')}, davon ${i} identifiziert`,
          anomalies: x => n(x, 'Auffälligkeit', 'Auffälligkeiten'),
          pollution: x => n(x, 'Verschmutzung beobachtet', 'Verschmutzungen beobachtet'),
          reported: 'Meldung an',
          at: 'um',
          station: 'Zeit im Einsatzraum',
          flight: 'Flugzeit',
          outcome: 'Ergebnis:'
        }),
        es: build({
          patrol: 'Vigilancia marítima',
          on: 'del',
          by: 'realizada por',
          and: 'y',
          from: 'desde',
          over: 'sobre',
          vessels: (t, i) => `${n(t, 'buque detectado', 'buques detectados')}, ${i} identificado(s)`,
          anomalies: x => n(x, 'anomalía', 'anomalías'),
          pollution: x => n(x, 'contaminación observada', 'contaminaciones observadas'),
          reported: 'Informe transmitido a',
          at: 'a las',
          station: 'Tiempo en zona',
          flight: 'tiempo de vuelo',
          outcome: 'Resultado:'
        })
      };
    })()
  });
})();
