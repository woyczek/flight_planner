(() => {
  'use strict';
  // Mission Report Core — aides à la saisie de la page de CR.
  //
  // - Valeurs déjà connues : chaque champ texte propose les valeurs saisies dans les
  //   missions des registres (famille courante et autres familles du Core en cache),
  //   les plus récentes d'abord. Réserves partagées (pool) : aérodromes, personnes,
  //   organismes, points tournants, altitudes…
  // - Appareils : immatriculation, indicatif, type OACI et variante se filtrent
  //   mutuellement (pas de « DRAGON » ni de « F-Z… » pour un A20N) ; dès qu'il ne reste
  //   qu'une possibilité, les champs vides sont remplis.
  // - Aérodromes : base mondiale (OACI, nom, coordonnées, fuseau horaire) chargée à la
  //   demande depuis jsDelivr (github.com/mwgg/Airports, licence MIT), terrains utilisés
  //   gardés en cache local.
  // - Météo : analyse du METAR (vent, température, QNH, visibilité, plafond, phénomènes),
  //   METAR actuel (metar.vatsim.net) ou météo archivée à l'heure du vol (Open-Meteo).
  // - Soleil : lever / coucher (heure locale du terrain) et phase jour / nuit calculés à
  //   partir de la date et des coordonnées du terrain de départ.
  const M = window.MissionModel,
    A = window.MissionAircraft,
    L = window.MissionVocab.L;
  /** Valeur JSON d'une clé du localStorage ; null sinon. */
  const read = key => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  /** Écrit une valeur JSON dans le localStorage (quota plein : ignoré). */
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota */ }
  };
  /** Texte en majuscules sans blancs de bord. */
  const up = v => String(v ?? '').trim().toUpperCase();
  /** Nombre complété de zéros (w chiffres). */
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  // ------------------------------------------------------------ valeurs connues
  /** Chemin générique d'un champ (indices remplacés par *) : clé de réserve des valeurs connues. */
  const keyOf = path => String(path).replace(/\.\d+(?=\.|$)/g, '.*');
  // Réserves partagées : chemin générique → pool (en plus du pool déclaré par le champ).
  const POOL_OF = {
    'aircraft.*.baseDeparture': 'aerodrome',
    'aircraft.*.baseReturn': 'aerodrome',
    'navigation.dep': 'aerodrome',
    'navigation.arr': 'aerodrome',
    'navigation.altn': 'aerodrome',
    'legs.*.from': 'aerodrome',
    'legs.*.to': 'aerodrome',
    'crew.*.name': 'person',
    'organisation.organisation': 'organisation',
    'organisation.unit': 'unit',
    'organisation.detachment': 'unit',
    'organisation.requestingAuthority': 'authority',
    'organisation.controllingAuthority': 'authority',
    'metadata.operationName': 'operation',
    'navigation.altitude': 'altitude',
    'navigation.minAltitude': 'altitude',
    'navigation.area': 'area',
    'events.*.position': 'waypoint'
  };
  const AIRWAY = /^(?:[A-Z]{1,2}\d{1,4}[A-Z]?|DCT|SID|STAR)$/,
    PROCEDURE = /^[A-Z]{3,6}\d[A-Z]?$/;
  // Points d'une route : sans voies aériennes, procédures ni vitesses / niveaux.
  const routePoints = route => String(route || '').toUpperCase().split(/\s+/).map(t => t.split('/')[0]).filter(t => t && !AIRWAY.test(t) && !PROCEDURE.test(t) && /^[A-Z0-9]{2,11}$/.test(t));

  /** Réserves de valeurs connues tirées des missions (par champ ou réserve partagée) : pour chaque valeur, nombre d'emplois et date la plus récente. */
  function collect(missions) {
    const pools = new Map(); // pool → Map(valeur → { n, date })
    /** Ajoute une valeur à une réserve (compte, date la plus récente). */
    const add = (pool, value, date) => {
      const v = String(value ?? '').trim();
      if (!v || v.length > 120) return;
      const map = pools.get(pool) || new Map();
      pools.set(pool, map);
      const cur = map.get(v) || {
        n: 0,
        date: ''
      };
      cur.n++;
      if (date > cur.date) cur.date = date;
      map.set(v, cur);
    };
    missions.forEach(m => {
      const date = m?.metadata?.date || '';
      /** Parcourt une mission et verse chaque valeur dans la réserve de son champ. */
      const walk = (value, path) => {
        if (value == null) return;
        if (Array.isArray(value)) {
          value.forEach((v, i) => walk(v, path ? `${path}.${i}` : String(i)));
          return;
        }
        if (typeof value === 'object') {
          Object.entries(value).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
          return;
        }
        if (typeof value === 'boolean') return;
        const key = keyOf(path);
        if (key === 'navigation.waypoints') {
          String(value).split('\n').forEach(line => add('waypoint', up(line), date));
          return;
        }
        if (key === 'navigation.route') {
          add(key, value, date);
          routePoints(value).forEach(p => add('waypoint', p, date));
          return;
        }
        add(key, value, date);
        if (POOL_OF[key]) add(POOL_OF[key], value, date);
      };
      walk(m, '');
    });
    // Référence DEFA anonymisée (committée) : trigrammes des pilotes, terrains des appareils.
    (window.DEFA_REFERENCE?.pilots || []).forEach(p => add('person', p.trigram, p.last || ''));
    (window.DEFA_REFERENCE?.aircraft || []).forEach(a => {
      add('aerodrome', a.homeAd, a.last || '');
      add('aerodrome', a.lastAd, a.last || '');
    });
    // Base DEFA (journal des vols) : trigrammes des pilotes, terrains de départ / arrivée.
    try {
      ((JSON.parse(localStorage.getItem('defaFlightLog:v1') || 'null') || {}).records || []).forEach(r => {
        add('person', r.trigram, r.date);
        add('aerodrome', r.dep, r.date);
        add('aerodrome', r.arr, r.date);
      });
    } catch {
      /* base illisible : ignorée */ }
    return pools;
  }
  // Missions des autres familles du Core (copies navigateur des registres).
  function otherMissions(familyId) {
    // Registre unique : missions des autres familles ; anciens registres par famille à défaut.
    const store = window.MissionLedger?.store?.missions;
    if (store?.length) return store.filter(m => m.family !== familyId);
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('missionCoreLedger:v1:') || key.endsWith(':' + familyId)) continue;
      try {
        const data = window.jsyaml.load(JSON.parse(localStorage.getItem(key)).text, {
          schema: window.jsyaml.CORE_SCHEMA
        });
        (data?.missions || []).forEach(m => out.push(m));
      } catch {
        /* registre illisible */ }
    }
    return out;
  }
  /** Valeurs d'une réserve, des plus récentes et fréquentes aux autres. */
  const ranked = map => [...(map || new Map()).entries()].sort((a, b) => b[1].date.localeCompare(a[1].date) || b[1].n - a[1].n).map(([value]) => value);

  // ------------------------------------------------------------------ aérodromes
  const AIRPORTS_URL = 'https://cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json';
  const AP_KEY = 'missionAirports:v1';
  let airportDb = null,
    airportLoad = null;
  /** Base mondiale des aérodromes (chargée une fois, à la demande). */
  const loadAirports = () => airportLoad ||= fetch(AIRPORTS_URL).then(r => r.ok ? r.json() : null).then(data => (airportDb = data)).catch(() => null);
  /** Aérodrome réduit aux champs utiles (OACI, nom, ville, pays, position, altitude, fuseau). */
  const slim = a => a && {
    icao: a.icao,
    name: a.name,
    city: a.city,
    country: a.country,
    lat: Number(a.lat),
    lon: Number(a.lon),
    elevation: a.elevation,
    tz: a.tz
  };
  // Terrain connu : cache local, sinon base mondiale (chargée si nécessaire).
  async function airport(code, {
    load = true
  } = {}) {
    const icao = up(code);
    if (!/^[A-Z0-9]{3,4}$/.test(icao)) return null;
    const cache = read(AP_KEY) || {};
    if (cache[icao]?.tz) return cache[icao];
    if (!airportDb && load) await loadAirports();
    const found = slim(airportDb?.[icao]);
    if (!found) return cache[icao] || null; // terrain importé d'un OFP, hors base
    cache[icao] = {
      ...cache[icao],
      ...found
    };
    write(AP_KEY, cache);
    return cache[icao];
  }
  /** Aérodrome mémorisé ou de la base déjà chargée ; null sinon (sans chargement). */
  const cachedAirport = code => (read(AP_KEY) || {})[up(code)] || slim(airportDb?.[up(code)]) || null;
  // (ville non affichée : peu fiable dans la base mondiale)
  const airportLabel = a => a ? [a.name, a.country].filter(Boolean).join(', ') : '';

  /** Mémorise un aérodrome (cache local des terrains utilisés). */
  function remember(entry) {
    if (!entry?.icao) return;
    const cache = read(AP_KEY) || {};
    cache[entry.icao] = {
      ...(cache[entry.icao] || {}),
      ...entry
    };
    write(AP_KEY, cache);
  }

  // ---------------------------------------------------------------------- METAR
  const WX = {
    DZ: 'bruine',
    RA: 'pluie',
    SN: 'neige',
    SG: 'neige en grains',
    PL: 'granules de glace',
    GR: 'grêle',
    GS: 'grésil',
    UP: 'précipitations',
    BR: 'brume',
    FG: 'brouillard',
    HZ: 'brume sèche',
    FU: 'fumée',
    TS: 'orage',
    SQ: 'grains',
    FC: 'trombe',
    DS: 'tempête de poussière',
    SS: 'tempête de sable',
    VA: 'cendres'
  };

  /** Champs d'un METAR : vent, visibilité, nuages, température, point de rosée, QNH. */
  function parseMetar(text) {
    const out = {};
    const tokens = up(text).replace(/=$/, '').split(/\s+/).filter(Boolean);
    const wx = [];
    for (const t of tokens) {
      if (t === 'RMK' || t === 'TEMPO' || t === 'BECMG' || t === 'NOSIG') break;
      let m;
      if (!out.wind && (m = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/.exec(t))) out.wind = t;
      else if (t === 'CAVOK') {
        out.visibility = '≥ 10 km';
        out.ceiling = 'CAVOK';
      } else if (!out.visibility && /^\d{4}$/.test(t)) out.visibility = t === '9999' ? '≥ 10 km' : `${Number(t)} m`;
      else if (!out.visibility && (m = /^(\d+(?:\/\d+)?)SM$/.exec(t))) out.visibility = `${m[1]} SM`;
      else if ((m = /^(M?\d{2})\/(M?\d{2})?$/.exec(t))) out.temperature = Number(m[1].replace('M', '-'));
      else if ((m = /^Q(\d{4})$/.exec(t))) out.qnh = Number(m[1]);
      else if ((m = /^A(\d{4})$/.exec(t))) out.qnh = Math.round(Number(m[1]) / 100 * 33.8639);
      else if (!out.ceiling && (m = /^(BKN|OVC|VV)(\d{3})/.exec(t))) out.ceiling = `${m[1]} ${Number(m[2]) * 100} ft`;
      else if (/^(NSC|SKC|CLR|NCD)$/.test(t) && !out.ceiling) out.ceiling = t;
      else if ((m = /^(\+|-|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|PL|GR|GS|UP|BR|FG|HZ|FU|TS|SQ|FC|DS|SS|VA)+)?$/.exec(t)) && (m[2] || m[3])) {
        const kinds = (m[3] || '').match(/../g) || [];
        const what = `${m[2] === 'SH' ? 'averses de ' : m[2] === 'FZ' ? 'verglaçant(e) : ' : m[2] === 'TS' && kinds.length ? 'orage avec ' : ''}${kinds.map(k => WX[k] || k).join(', ') || WX[m[2]] || m[2]}`;
        wx.push(`${what}${m[1] === '+' ? ' (fort)' : m[1] === '-' ? ' (faible)' : m[1] === 'VC' ? ' (au voisinage)' : ''}`);
      }
    }
    if (wx.length) out.precipitation = wx.join(' ; ');
    return out;
  }

  // ---------------------------------------------------------------------- soleil
  // Équation du lever du soleil (NOAA simplifiée) : heures UTC du lever / coucher pour une
  // hauteur du soleil donnée (-0,833° : lever apparent ; -6° : crépuscule civil).
  function sunTimes(dateText, lat, lon, altitude = -0.833) {
    const rad = Math.PI / 180,
      day = Date.parse(`${dateText}T12:00:00Z`);
    if (!Number.isFinite(day) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const n = Math.round(day / 86400000 + 2440587.5 - 2451545.0 + 0.0008);
    const Js = n - lon / 360,
      Mdeg = (357.5291 + 0.98560028 * Js) % 360,
      Mr = Mdeg * rad;
    const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
    const lambda = ((Mdeg + C + 180 + 102.9372) % 360) * rad;
    const transit = 2451545 + Js + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambda);
    const dec = Math.asin(Math.sin(lambda) * Math.sin(23.4397 * rad));
    const cosW = (Math.sin(altitude * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    if (cosW < -1 || cosW > 1) return {
      polar: cosW < -1 ? 'day' : 'night'
    };
    const w = Math.acos(cosW) / rad / 360,
      toDate = j => new Date((j - 2440587.5) * 86400000);
    return {
      rise: toDate(transit - w),
      set: toDate(transit + w)
    };
  }
  /** Heure locale « HH:MM » d'un instant dans un fuseau. */
  const clock = (date, tz) => {
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: tz || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).format(date);
    } catch {
      return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    }
  };

  // ------------------------------------------------------------------- météo web
  async function currentMetar(icao) {
    const response = await fetch(`https://metar.vatsim.net/metar.php?id=${encodeURIComponent(up(icao))}`, {
      cache: 'no-store'
    });
    const text = (await response.text()).trim();
    return /^[A-Z0-9]{4}\s+\d{6}Z/.test(text) ? text : '';
  }
  const WMO = {
    0: 'ciel clair',
    1: 'peu nuageux',
    2: 'partiellement nuageux',
    3: 'couvert',
    45: 'brouillard',
    48: 'brouillard givrant',
    51: 'faible bruine',
    53: 'bruine',
    55: 'forte bruine',
    56: 'bruine verglaçante',
    57: 'bruine verglaçante',
    61: 'faible pluie',
    63: 'pluie',
    65: 'forte pluie',
    66: 'pluie verglaçante',
    67: 'pluie verglaçante',
    71: 'faible neige',
    73: 'neige',
    75: 'forte neige',
    77: 'neige en grains',
    80: 'averses',
    81: 'averses',
    82: 'fortes averses',
    85: 'averses de neige',
    86: 'averses de neige',
    95: 'orage',
    96: 'orage avec grêle',
    99: 'orage avec grêle'
  };
  // Météo horaire (modèles / réanalyse) à l'heure et au lieu donnés : prévision ou passé
  // récent (api.open-meteo.com), sinon archive (archive-api.open-meteo.com).
  async function archivedWeather(lat, lon, date, hour, icao = '') {
    const vars = 'temperature_2m,dew_point_2m,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code';
    const q = `latitude=${lat}&longitude=${lon}&hourly=${vars}&daily=sunrise,sunset&wind_speed_unit=kn&timezone=auto&start_date=${date}&end_date=${date}`;
    let data = null;
    for (const base of ['https://api.open-meteo.com/v1/forecast', 'https://archive-api.open-meteo.com/v1/archive']) {
      try {
        const r = await fetch(`${base}?${q}`);
        if (r.ok) {
          const json = await r.json();
          if (json?.hourly?.temperature_2m?.some(v => v != null)) {
            data = json;
            break;
          }
        } /* valeurs nulles : source suivante */
      } catch {
        /* source suivante */ }
    }
    const h = data?.hourly;
    if (!h?.time?.length) return null;
    const i = Math.max(0, h.time.findIndex(t => Number(t.slice(11, 13)) === hour));
    /** Valeur horaire d'une variable météo à l'heure du vol. */
    const pick = k => h[k]?.[i];
    const dir = pick('wind_direction_10m'),
      speed = pick('wind_speed_10m'),
      gust = pick('wind_gusts_10m'),
      vis = pick('visibility');
    const raw = {
      dir,
      speed,
      gust,
      vis,
      temp: pick('temperature_2m'),
      dew: pick('dew_point_2m'),
      qnh: pick('pressure_msl'),
      code: pick('weather_code'),
      low: pick('cloud_cover_low'),
      mid: pick('cloud_cover_mid'),
      high: pick('cloud_cover_high')
    };
    // Heure locale du terrain → heure UTC du METAR (décalage renvoyé par Open-Meteo).
    const utc = new Date(Date.parse(`${h.time[i]}:00Z`) - (data.utc_offset_seconds || 0) * 1000);
    const metar = icao ? buildMetar(icao, utc, raw) : '';
    /** Heure « HH:MM » d'une date ISO. */
    const hhmm = v => (typeof v === 'string' && v.length >= 16 ? v.slice(11, 16) : '');
    return {
      time: h.time[i],
      metar,
      sunrise: hhmm(data.daily?.sunrise?.[0]),
      sunset: hhmm(data.daily?.sunset?.[0]),
      wind: dir != null && speed != null ? `${pad(Math.round(dir / 10) * 10 % 360 || 360, 3)}${pad(Math.round(speed))}${gust != null && gust - speed >= 10 ? `G${pad(Math.round(gust))}` : ''}KT` : '',
      temperature: pick('temperature_2m') != null ? Math.round(pick('temperature_2m')) : null,
      qnh: pick('pressure_msl') != null ? Math.round(pick('pressure_msl')) : null,
      visibility: vis == null ? '' : vis >= 10000 ? '≥ 10 km' : vis >= 1000 ? `${Math.round(vis / 100) / 10} km` : `${Math.round(vis)} m`,
      ceiling: (metar && parseMetar(metar).ceiling) || (pick('cloud_cover_low') > 0 ? `nuages bas ${pick('cloud_cover_low')} %` : ''),
      precipitation: WMO[pick('weather_code')] || ''
    };
  }
  // METAR calculé à partir des valeurs du modèle (heure du vol) : vent, visibilité, temps
  // présent (code WMO), nuages (couverture par étage ; base des nuages bas estimée par
  // l'écart température / point de rosée, ≈ 400 ft par °C), T° / Td, QNH.
  // Marqué « RMK CALC OPEN-METEO » : ce n'est pas une observation.
  const WMO_METAR = {
    45: 'FG',
    48: 'FZFG',
    51: '-DZ',
    53: 'DZ',
    55: '+DZ',
    56: '-FZDZ',
    57: 'FZDZ',
    61: '-RA',
    63: 'RA',
    65: '+RA',
    66: '-FZRA',
    67: 'FZRA',
    71: '-SN',
    73: 'SN',
    75: '+SN',
    77: 'SG',
    80: '-SHRA',
    81: 'SHRA',
    82: '+SHRA',
    85: '-SHSN',
    86: '+SHSN',
    95: 'TSRA',
    96: 'TSGR',
    99: '+TSGR'
  };

  /** METAR reconstitué à partir de données météo horaires (vent, visibilité, nuages, température, QNH), pour une mission passée. */
  function buildMetar(icao, utc, w) {
    const parts = [up(icao), `${pad(utc.getUTCDate())}${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}Z`];
    if (w.dir != null && w.speed != null) {
      const speed = Math.round(w.speed),
        dir = speed < 1 ? 0 : Math.round(w.dir / 10) * 10 % 360 || 360;
      parts.push(`${pad(dir, 3)}${pad(speed)}${w.gust != null && w.gust - w.speed >= 10 ? `G${pad(Math.round(w.gust))}` : ''}KT`);
    }
    // Visibilité absente (archive) : ≥ 10 km s'il n'y a ni brouillard ni précipitations.
    const seen = w.vis ?? (w.code != null && w.code < 45 ? 10000 : null);
    const vis = seen == null ? null : seen >= 10000 ? 9999 : seen >= 5000 ? Math.floor(seen / 1000) * 1000 : Math.floor(seen / 100) * 100;
    let wx = WMO_METAR[w.code] || '';
    if (/FG$/.test(wx) && vis != null && vis >= 1000) wx = 'BR'; // brouillard du modèle, visibilité ≥ 1 km : brume
    /** Couverture nuageuse (%) → FEW / SCT / BKN / OVC. */
    const octas = c => c == null || c < 12.5 ? '' : c <= 25 ? 'FEW' : c <= 50 ? 'SCT' : c <= 87.5 ? 'BKN' : 'OVC';
    const spread = w.temp != null && w.dew != null ? Math.max(0, w.temp - w.dew) : null;
    const lowBase = Math.min(6000, Math.max(200, Math.round((spread == null ? 2500 : spread * 400) / 100) * 100));
    const layers = [
        [octas(w.low), lowBase],
        [octas(w.mid), Math.max(lowBase + 1000, 10000)],
        [octas(w.high), 25000]
      ]
      .filter(([cover]) => cover).map(([cover, base]) => `${cover}${pad(Math.round(base / 100), 3)}${/TS/.test(wx) && base === lowBase ? 'CB' : ''}`);
    const lowest = layers.length ? Number(layers[0].slice(3, 6)) * 100 : Infinity;
    if (vis === 9999 && !wx && lowest >= 5000) parts.push('CAVOK');
    else {
      if (vis != null) parts.push(pad(vis, 4));
      if (wx) parts.push(wx);
      parts.push(...(layers.length ? layers : ['NSC']));
    }
    /** Température au format METAR (M05 sous zéro). */
    const temp = v => (Math.round(v) < 0 ? `M${pad(-Math.round(v))}` : pad(Math.round(v)));
    if (w.temp != null) parts.push(`${temp(w.temp)}/${w.dew != null ? temp(w.dew) : ''}`);
    if (w.qnh != null) parts.push(`Q${pad(Math.round(w.qnh), 4)}`);
    return `${parts.join(' ')} RMK CALC OPEN-METEO`;
  }

  // ---------------------------------------------------------------------- page
  const T = {
    unique: L('Seul appareil connu correspondant : champs complétés', 'Only matching known aircraft: fields completed', 'Einziges passendes bekanntes Luftfahrzeug: Felder ergänzt', 'Única aeronave conocida coincidente: campos completados'),
    matches: L('appareils connus correspondants', 'matching known aircraft', 'passende bekannte Luftfahrzeuge', 'aeronaves conocidas coincidentes'),
    noMatch: L('Aucun appareil connu ne correspond (nouvel appareil : il sera mémorisé à l’enregistrement)', 'No known aircraft matches (new aircraft: it will be remembered when saved)', 'Kein bekanntes Luftfahrzeug passt (neues Luftfahrzeug: wird beim Speichern gemerkt)', 'Ninguna aeronave conocida coincide (nueva aeronave: se memorizará al guardar)'),
    unknownAd: L('Terrain inconnu de la base mondiale', 'Aerodrome not in the world database', 'Flugplatz nicht in der Weltdatenbank', 'Aeródromo no incluido en la base mundial'),
    weatherTitle: L('Sources météo et soleil', 'Weather and sun sources', 'Wetter- und Sonnenquellen', 'Fuentes de meteorología y sol'),
    metarNow: L('METAR actuel du terrain de départ (VATSIM)', 'Current departure METAR (VATSIM)', 'Aktuelles METAR des Startflugplatzes (VATSIM)', 'METAR actual del aeródromo de salida (VATSIM)'),
    archive: L('METAR calculé à l’heure du vol (Open-Meteo)', 'Computed METAR at flight time (Open-Meteo)', 'Berechnetes METAR zur Flugzeit (Open-Meteo)', 'METAR calculado a la hora del vuelo (Open-Meteo)'),
    auto: L('Météo et soleil renseignés automatiquement (terrain de départ, date, heure)', 'Weather and sun filled automatically (departure aerodrome, date, time)', 'Wetter und Sonne automatisch ausgefüllt (Startflugplatz, Datum, Uhrzeit)', 'Meteorología y sol completados automáticamente (aeródromo de salida, fecha, hora)'),
    sun: L('Calculer lever / coucher du soleil', 'Compute sunrise / sunset', 'Sonnenauf-/-untergang berechnen', 'Calcular salida / puesta del sol'),
    needAd: L('Renseignez le terrain de départ (ADEP ou base de départ).', 'Enter the departure aerodrome (ADEP or departure base).', 'Startflugplatz angeben (ADEP oder Startbasis).', 'Indique el aeródromo de salida (ADEP o base de salida).'),
    noCoords: L('Coordonnées du terrain introuvables (base mondiale indisponible ou terrain inconnu).', 'Aerodrome coordinates not found (world database unavailable or unknown aerodrome).', 'Flugplatzkoordinaten nicht gefunden (Weltdatenbank nicht verfügbar oder Flugplatz unbekannt).', 'Coordenadas del aeródromo no encontradas (base mundial no disponible o aeródromo desconocido).'),
    noMetar: L('Aucun METAR disponible pour ce terrain.', 'No METAR available for this aerodrome.', 'Kein METAR für diesen Flugplatz verfügbar.', 'Ningún METAR disponible para este aeródromo.'),
    notToday: L('METAR actuel : la mission n’est pas datée d’aujourd’hui, préférez la météo à l’heure du vol.', 'Current METAR: the mission is not dated today, prefer the weather at flight time.', 'Aktuelles METAR: Einsatz nicht von heute, besser Wetter zur Flugzeit verwenden.', 'METAR actual: la misión no es de hoy, mejor la meteorología a la hora del vuelo.'),
    filled: L('Renseigné', 'Filled', 'Ausgefüllt', 'Rellenado'),
    nothing: L('rien à compléter (champs déjà remplis)', 'nothing to fill (fields already set)', 'nichts zu ergänzen (Felder bereits ausgefüllt)', 'nada que completar (campos ya rellenados)'),
    local: L('heure locale', 'local time', 'Ortszeit', 'hora local'),
    sunNote: L('Soleil calculé pour', 'Sun computed for', 'Sonne berechnet für', 'Sol calculado para'),
    polar: L('jour ou nuit polaire', 'polar day or night', 'Polartag oder -nacht', 'día o noche polar'),
    weatherFor: L('Météo modèle Open-Meteo', 'Open-Meteo model weather', 'Open-Meteo-Modellwetter', 'Meteorología modelo Open-Meteo'),
    error: L('Échec', 'Failed', 'Fehlgeschlagen', 'Error')
  };

  // options : { family, form, view, getMission, ledgerMissions(), onChange(path), t(row) }
  function create({
    family,
    form,
    view,
    getMission,
    ledgerMissions,
    onChange,
    t
  }) {
    let pools = null;
    /** Recalcule les valeurs connues (registre de la famille + autres familles). */
    const refreshPools = () => {
      pools = collect(ledgerMissions().concat(otherMissions(family.id)));
    };
    /** Texte d'une ligne [fr, en, de, es] dans la langue de la page. */
    const tr = row => t(row);

    // ---- appareils : filtrage croisé
    // Organismes comparés sans tenir compte de la casse (champs saisis en majuscules).
    const hasOperator = (series, operator) => [...series.operators].some(o => up(o) === up(operator));
    const ITEM = /^aircraft\.(\d+)\.(registration|callsign|callsignPrefix|callsignNumber|type|variant|tacticalNumber)$/;
    const split = M.splitCallsign;
    // Indicatif complet comparé seulement s'il porte un numéro ; sinon, l'indicatif seul
    // (série) filtre. Variante égale au modèle générique du type (déduite du type OACI) :
    // pas un filtre.
    // Catégorie choisie : voilure tournante → ni avions ni hydravions ; voilure fixe /
    // amphibie → pas d'hélicoptères.
    const sameCategory = (wanted, category) => !wanted || !category || (wanted === 'rotary' ? category === 'rotary' : category !== 'rotary');
    const matchesOf = (item, skip, generic = item.type && A.lookupType(item.type)?.model) => A.known().filter(a =>
      (skip === 'category' || sameCategory(item.category, a.category || A.lookupType(a.type)?.category)) &&
      (skip === 'registration' || !item.registration || A.regKey(a.registration) === A.regKey(item.registration))
      // Formes complète et plan de vol équivalentes (DRAGON76 = DRAGO76).
      &&
      (['callsign', 'callsignPrefix', 'callsignNumber'].includes(skip) || !item.callsign || !item.callsignNumber || a.callsigns.some(c => A.canonicalCallsign(c) === A.canonicalCallsign(item.callsign))) &&
      (['callsign', 'callsignPrefix'].includes(skip) || !item.callsignPrefix || a.callsigns.some(c => A.canonicalPrefix(split(c).prefix) === A.canonicalPrefix(item.callsignPrefix)))
      // Type / variante inconnus pour un appareil connu : ils ne l'excluent pas.
      &&
      (skip === 'type' || !item.type || !a.type || A.typeKey(a.type) === A.typeKey(item.type)) &&
      (skip === 'variant' || !item.variant || item.variant === generic || !a.variant || String(a.variant).toLowerCase() === String(item.variant).toLowerCase()));

    /** Suggestions pour un champ de l'appareil index (immatriculation, indicatif, série, numéro, type, variante), filtrées par ce qui est déjà saisi (organisme, catégorie, type). */
    function aircraftSuggest(index, field) {
      const item = getMission().aircraft?.[index] || {},
        matches = matchesOf(item, field);
      const history = ranked(pools.get(`aircraft.*.${field}`));
      if (field === 'registration') return matches.map(a => ({
        value: a.registration,
        label: [a.type, a.variant, a.callsigns.join(' / '), a.tacticalNumber, a.operator, a.base].filter(Boolean).join(' — ')
      }));
      // Indicatif (série) : ceux des appareils compatibles (type, immatriculation), l'opérateur
      // de la mission en tête ; numéro : ceux de la série pour ce type.
      if (field === 'callsignPrefix') {
        const operator = getMission().organisation?.organisation || '',
          out = new Map();
        const allowed = new Set(matches.flatMap(a => a.callsigns.map(c => A.canonicalPrefix(split(c).prefix))));
        // Séries de la table de correspondance compatibles avec le type saisi (ou génériques).
        const type = item.type && A.typeKey(item.type);
        A.callsignSeries().forEach(s => {
          if (s.table && !item.registration && (!type || !s.table.types.length || s.types.has(type))) allowed.add(s.prefix);
        });
        A.callsignSeries().filter(s => allowed.has(s.prefix))
          .sort((a, b) => Number(hasOperator(b, operator)) - Number(hasOperator(a, operator)) || b.numbers.length - a.numbers.length)
          .forEach(s => out.set(s.prefix, [s.table?.telephony, s.abbreviations.size ? `plan de vol : ${[...s.abbreviations].join(', ')}` : '', s.table?.note, [...s.types].join(', '), [...s.operators].join(', ')].filter(Boolean).join(' — ')));
        if (!item.registration) ledgerMissions().forEach(m => (m.aircraft || []).forEach(a => {
          const p = a.callsignPrefix || split(a.callsign).prefix;
          if (p && (!item.type || A.typeKey(a.type) === A.typeKey(item.type)) && !out.has(up(p))) out.set(up(p), a.type || '');
        }));
        return [...out].map(([value, label]) => ({
          value,
          label
        }));
      }
      if (field === 'callsignNumber') {
        const out = new Map();
        const wanted = item.callsignPrefix && A.canonicalPrefix(item.callsignPrefix);
        matches.forEach(a => a.callsigns.forEach(c => {
          const s = split(c),
            prefix = A.canonicalPrefix(s.prefix);
          if (!wanted || prefix === wanted) out.set(s.number, [prefix + s.number, a.registration, a.type].filter(Boolean).join(' — '));
        }));
        out.delete('');
        return [...out].sort((a, b) => a[0].localeCompare(b[0], undefined, {
          numeric: true
        })).map(([value, label]) => ({
          value,
          label
        }));
      }
      if (field === 'callsign') {
        const out = new Map();
        matches.forEach(a => a.callsigns.forEach(c => out.set(c, [a.registration, a.type].filter(Boolean).join(' — '))));
        // Indicatifs déjà utilisés avec ce type (appareils non immatriculés dans la base).
        if (!item.registration) ledgerMissions().forEach(m => (m.aircraft || []).forEach(a => {
          if (a.callsign && (!item.type || up(a.type) === up(item.type)) && !out.has(up(a.callsign))) out.set(up(a.callsign), a.type || '');
        }));
        return [...out].map(([value, label]) => ({
          value,
          label
        }));
      }
      if (field === 'type') {
        const constrained = item.registration || item.callsign || item.variant;
        if (constrained) return [...new Set(matches.map(a => up(a.type)).filter(v => /^[A-Z][A-Z0-9]{1,3}$/.test(v)))].map(value => ({
          value,
          label: A.lookupType(value)?.model || ''
        }));
        const typed = up(item.type),
          known = [...new Set(A.known().map(a => up(a.type)).concat(history.map(up)))].filter(v => /^[A-Z][A-Z0-9]{1,3}$/.test(v));
        const all = known.map(value => ({
          value,
          label: A.lookupType(value)?.model || ''
        }));
        if (typed.length >= 1) A.listTypes().filter(ty => ty.tdesig.startsWith(typed) && !known.includes(ty.tdesig) && sameCategory(item.category, ty.category)).slice(0, 60).forEach(ty => all.push({
          value: ty.tdesig,
          label: ty.model
        }));
        return all.filter(ty => sameCategory(item.category, A.lookupType(ty.value)?.category));
      }
      if (field === 'variant') {
        const values = new Set(matches.map(a => a.variant).filter(Boolean));
        const model = item.type && A.lookupType(item.type)?.model;
        if (model) values.add(model);
        ledgerMissions().forEach(m => (m.aircraft || []).forEach(a => {
          if (a.variant && (!item.type || up(a.type) === up(item.type))) values.add(a.variant);
        }));
        return [...values].map(value => ({
          value
        }));
      }
      if (field === 'tacticalNumber') return [...new Set(matches.map(a => a.tacticalNumber).filter(Boolean).concat(history))].map(value => ({
        value
      }));
      return [];
    }
    // Remplit les champs vides quand toutes les possibilités restantes concordent.
    /** Remplit les champs vides de l'appareil quand toutes les possibilités restantes concordent. */
    function aircraftCommit(index) {
      const item = getMission().aircraft?.[index];
      if (!item) return null;
      if (!['registration', 'callsign', 'type', 'variant'].some(k => item[k])) return null;
      const matches = matchesOf(item);
      if (!matches.length) return {
        none: true
      };
      if (matches.length === 1) return {
        known: matches[0]
      };
      const common = {};
      ['type', 'variant', 'category'].forEach(k => {
        const values = new Set(matches.map(a => a[k] || ''));
        if (values.size === 1 && [...values][0] && !item[k]) common[k] = [...values][0];
      });
      return {
        common,
        count: matches.length
      };
    }

    // ---- suggestions (appel par form.js)
    /** Suggestions d'un champ (appel par form.js) : valeurs connues, appareils, terrains ; typed : texte saisi ; append : ajout à la liste existante. */
    async function suggest(path, field, typed, append) {
      if (!pools) refreshPools();
      const m = ITEM.exec(path);
      if (m && !append) return aircraftSuggest(Number(m[1]), m[2]);
      const pool = field.pool || POOL_OF[keyOf(path)] || keyOf(path);
      const values = ranked(pools.get(pool));
      if (pool === 'aerodrome') {
        const text = up(typed),
          out = values.filter(v => !text || v.startsWith(text)).map(value => ({
            value,
            label: airportLabel(cachedAirport(value))
          }));
        if (text.length >= 2) {
          const db = airportDb || await loadAirports();
          if (db) {
            let n = 0;
            for (const code in db) {
              if (n >= 40) break;
              if (code.startsWith(text) && !out.some(o => o.value === code)) {
                out.push({
                  value: code,
                  label: airportLabel(slim(db[code]))
                });
                n++;
              }
            }
          }
        }
        return out;
      }
      // Route : seulement l'historique du même trajet — départ → destination, ou tout couple
      // de terrains dans l'ordre des étapes saisies (LFTW-LFBD-LFRN-LFRD : LFTW→LFRD,
      // LFTW→LFRN, LFBD→LFRD…).
      if (keyOf(path) === 'navigation.route') {
        const m = getMission(),
          seq = [m.navigation?.dep || m.aircraft?.[0]?.baseDeparture, ...(m.legs || []).flatMap(l => [l.from, l.to]), m.navigation?.arr].map(up).filter(Boolean).filter((v, i, a) => a[i - 1] !== v);
        const pairs = new Set();
        seq.forEach((a, i) => seq.slice(i + 1).forEach(b => {
          if (a !== b) pairs.add(`${a}>${b}`);
        }));
        if (!pairs.size) return [];
        const found = new Map(),
          text = up(typed);
        ledgerMissions().concat(otherMissions(family.id)).filter(x => x !== m).forEach(x => {
          const r = up(x.navigation?.route).replace(/\s+/g, ' '),
            d = up(x.navigation?.dep || x.aircraft?.[0]?.baseDeparture),
            ar = up(x.navigation?.arr);
          if (!r || !pairs.has(`${d}>${ar}`) || (text && !r.startsWith(text))) return;
          const e = found.get(r) || {
            n: 0,
            date: '',
            d,
            ar
          };
          e.n++;
          if ((x.metadata?.date || '') > e.date) e.date = x.metadata?.date || '';
          found.set(r, e);
        });
        return [...found].sort((a, b) => b[1].n - a[1].n || b[1].date.localeCompare(a[1].date)).map(([value, e]) => ({
          value,
          label: `${e.d} → ${e.ar}`
        }));
      }
      if (pool === 'waypoint' && append) {
        // Points de la route saisie, puis points déjà utilisés.
        const route = routePoints(getMission().navigation?.route),
          current = new Set(String(getMission().navigation?.waypoints || '').split('\n').map(up));
        return [...new Set(route.concat(values))].filter(v => !current.has(v)).map(value => ({
          value
        }));
      }
      return values.map(value => ({
        value
      }));
    }

    // ---- terrains : nom en aide, coordonnées mémorisées
    /** Nom du terrain en aide sous un champ OACI ; coordonnées mémorisées pour les calculs (soleil, météo). */
    async function aerodromeHint(path, value) {
      if (!value) {
        view.hint(path, '');
        return;
      }
      const ad = await airport(value);
      view.hint(path, ad ? `${airportLabel(ad)}${ad.tz ? ` · ${ad.tz}` : ''}` : tr(T.unknownAd));
    }

    // ---- météo, soleil
    /** Code OACI du terrain de départ de la mission. */
    const departure = () => {
      const m = getMission();
      return up(m.navigation?.dep || m.aircraft?.[0]?.baseDeparture || '');
    };
    // Écrit un champ vide ou déjà rempli automatiquement (jamais une saisie du pilote).
    const auto = new Map();
    /** Écrit une valeur dans un champ vide de la mission et le note comme rempli. */
    const setIfEmpty = (path, value, done) => {
      if (value == null || value === '') return;
      const cur = M.get(getMission(), path);
      if (cur === value || (cur != null && cur !== '' && cur !== auto.get(path))) return;
      M.set(getMission(), path, value);
      auto.set(path, value);
      done.push(path);
    };

    /** Remplit les champs météo vides à partir d'un METAR. */
    function applyMetar(text, done = []) {
      const w = parseMetar(text);
      ['wind', 'temperature', 'qnh', 'visibility', 'ceiling', 'precipitation'].forEach(k => setIfEmpty(`environment.${k}`, w[k], done));
      return done;
    }
    /** Lever / coucher du soleil et crépuscules au terrain de départ, à la date de la mission. */
    async function sun(done = [], quiet = false) {
      const m = getMission(),
        icao = departure();
      if (!icao) {
        if (!quiet) status(tr(T.needAd));
        return done;
      }
      const ad = await airport(icao);
      if (!ad || !Number.isFinite(ad.lat)) {
        if (!quiet) status(tr(T.noCoords));
        return done;
      }
      const s = sunTimes(m.metadata?.date || new Date().toISOString().slice(0, 10), ad.lat, ad.lon);
      if (!s) return done;
      if (s.polar) {
        if (!quiet) status(`${tr(T.sunNote)} ${icao} : ${tr(T.polar)}`);
        return done;
      }
      setIfEmpty('environment.sunrise', clock(s.rise, ad.tz), done);
      setIfEmpty('environment.sunset', clock(s.set, ad.tz), done);
      // Phase jour / nuit au décollage (heures de la mission = heure locale du terrain).
      const takeoff = M.minutes(m.timeline?.takeoff || m.timeline?.engineStart);
      if (takeoff != null) {
        const civil = sunTimes(m.metadata.date, ad.lat, ad.lon, -6),
          mins = d => M.minutes(clock(d, ad.tz));
        const phase = takeoff >= mins(s.rise) && takeoff <= mins(s.set) ? 'DAY' : civil && !civil.polar && takeoff >= mins(civil.rise) && takeoff <= mins(civil.set) ? 'TWILIGHT' : 'NIGHT';
        setIfEmpty('environment.dayNight', phase, done);
      }
      if (!quiet) status(`${tr(T.sunNote)} ${icao} (${ad.tz || 'UTC'}, ${tr(T.local)}) — ${report(done)}`);
      return done;
    }
    /** METAR actuel du terrain de départ (VATSIM) appliqué aux champs météo vides. */
    async function metarNow() {
      const icao = departure();
      if (!icao) {
        status(tr(T.needAd));
        return;
      }
      try {
        const text = await currentMetar(icao);
        if (!text) {
          status(tr(T.noMetar));
          return;
        }
        const done = [];
        setIfEmpty('environment.metar', text, done);
        applyMetar(text, done);
        const today = new Date().toISOString().slice(0, 10);
        commit(done);
        status(`${text} — ${report(done)}${getMission().metadata?.date !== today ? ` · ${tr(T.notToday)}` : ''}`);
      } catch (error) {
        status(`${tr(T.error)} : ${error.message}`);
      }
    }
    /** Heure du vol (décollage, mise en route ou heure de la mission) en minutes. */
    const flightMinutes = m => M.minutes(m.timeline?.takeoff || m.timeline?.engineStart || m.metadata?.timeLocal);
    /** Météo passée à l'heure du vol (Open-Meteo, archive ou prévision récente), METAR reconstitué et champs remplis. */
    async function archive(quiet = false) {
      const icao = departure();
      if (!icao) {
        if (!quiet) status(tr(T.needAd));
        return;
      }
      const ad = await airport(icao);
      if (!ad || !Number.isFinite(ad.lat)) {
        if (!quiet) status(tr(T.noCoords));
        return;
      }
      const m = getMission(),
        time = flightMinutes(m),
        date = m.metadata?.date || new Date().toISOString().slice(0, 10);
      const w = await archivedWeather(ad.lat, ad.lon, date, time == null ? 12 : Math.floor(time / 60), icao);
      if (!w) {
        if (!quiet) status(`${tr(T.error)} (Open-Meteo)`);
        return;
      }
      const done = [];
      // Vol du jour, à moins d'une heure de maintenant : METAR réel (VATSIM) plutôt que calculé.
      let metar = w.metar;
      const now = new Date(),
        today = now.toISOString().slice(0, 10),
        nowMin = M.minutes(clock(now, ad.tz));
      if (date === today && (time == null || Math.abs(time - nowMin) <= 60)) {
        try {
          metar = (await currentMetar(icao)) || metar;
        } catch {
          /* METAR calculé */ }
      }
      setIfEmpty('environment.metar', metar, done);
      if (metar !== w.metar) applyMetar(metar, done);
      ['wind', 'temperature', 'qnh', 'visibility', 'ceiling', 'precipitation'].forEach(k => setIfEmpty(`environment.${k}`, w[k], done));
      // Lever / coucher : calcul local (et phase jour / nuit), puis valeurs Open-Meteo si disponibles.
      await sun(done, true);
      await densityAltitude(done);
      setIfEmpty('environment.sunrise', w.sunrise, done);
      setIfEmpty('environment.sunset', w.sunset, done);
      commit([...new Set(done)], quiet);
      status(`${quiet ? `${tr(T.auto)} · ` : ''}${tr(T.weatherFor)} ${icao} ${w.time.replace('T', ' ')} (${tr(T.local)}) — ${report(done)}`);
    }
    // Renseignement automatique dès que le terrain de départ, la date ou l'heure du vol
    // changent (saisie, appareil connu, import) : champs vides ou déjà remplis automatiquement.
    let envSig = null,
      envTimer = null;
    // mode 'reset' : mission (ré)ouverte, état de référence sans requête ;
    // 'now' : nouvelle mission (terrain de départ par défaut) renseignée tout de suite.
    function autoEnvironment(mode = '') {
      const m = getMission(),
        time = flightMinutes(m);
      const sig = [departure(), m.metadata?.date || '', time == null ? '' : Math.floor(time / 60)].join('|');
      if (mode === 'reset' || (envSig === null && mode !== 'now')) {
        envSig = sig;
        clearTimeout(envTimer);
        return;
      }
      if (sig === envSig && mode !== 'now') return;
      envSig = sig;
      clearTimeout(envTimer);
      if (!departure() || !m.metadata?.date) return;
      envTimer = setTimeout(() => archive(true).catch(() => {}), 1200);
    }
    // Altitude densité (ft) au terrain de départ : altitude pression = altitude terrain +
    // (1013,25 − QNH) × 27 ft ; ISA = 15 − 1,98 °C / 1000 ft ; AD = AP + 118,8 × (T − ISA).
    async function densityAltitude(done = []) {
      const env = getMission().environment || {},
        t = Number(env.temperature),
        q = Number(env.qnh);
      if (env.temperature === '' || env.temperature == null || !Number.isFinite(t) || !(q > 800)) return done;
      const ad = departure() ? await airport(departure()) : null,
        elev = Number(ad?.elevation);
      if (!Number.isFinite(elev)) return done;
      const pa = elev + (1013.25 - q) * 27,
        isa = 15 - 1.98 * pa / 1000;
      setIfEmpty('environment.densityAltitude', Math.round((pa + 118.8 * (t - isa)) / 10) * 10, done);
      return done;
    }
    /** Message « rempli : champs… » ou « rien à remplir ». */
    const report = done => done.length ? `${tr(T.filled)} : ${done.map(p => p.split('.').pop()).join(', ')}` : tr(T.nothing);
    // auto : remplissage automatique, qui ne rend pas « modifiée » une mission non touchée.
    const commit = (done, auto = false) => {
      if (!done.length) return;
      view.sync();
      view.refresh();
      onChange(done[0], auto);
    };

    // Barre d'outils du bloc météo (recréée à chaque rendu du formulaire).
    let statusEl = null;
    /** Message d'état du bloc Environnement. */
    const status = text => {
      if (statusEl) statusEl.textContent = text;
    };

    /** Ajoute au bloc Environnement ses boutons (METAR actuel, météo passée, soleil) et son message d'état. */
    function decorate() {
      const section = form.querySelector('#mc-environment');
      if (!section || section.querySelector('.mc-tools')) return;
      const bar = document.createElement('div');
      bar.className = 'mc-tools';
      bar.innerHTML = `<div class="row"><button type="button" class="secondary" data-tool="metar"></button><button type="button" class="secondary" data-tool="archive"></button><button type="button" class="secondary" data-tool="sun"></button></div><p class="small mc-tools-status"></p>`;
      bar.querySelector('[data-tool="metar"]').textContent = tr(T.metarNow);
      bar.querySelector('[data-tool="archive"]').textContent = tr(T.archive);
      bar.querySelector('[data-tool="sun"]').textContent = tr(T.sun);
      bar.querySelector('[data-tool="metar"]').onclick = metarNow;
      bar.querySelector('[data-tool="archive"]').onclick = () => archive();
      bar.querySelector('[data-tool="sun"]').onclick = async () => commit(await sun());
      section.querySelector('h2').after(bar);
      statusEl = bar.querySelector('.mc-tools-status');
    }

    // ---- saisie validée (change) : appareils, terrains, METAR, soleil automatique
    const AERODROME = new Set(['aircraft.*.baseDeparture', 'aircraft.*.baseReturn', 'navigation.dep', 'navigation.arr', 'navigation.altn']);
    /** Après une saisie validée : valeurs connues à recalculer ; terrain → aide et, au départ, lever / coucher du soleil ; date ou décollage → soleil ; METAR → champs météo ; METAR, température, QNH ou départ → altitude densité. */
    async function onCommit(path, value) {
      pools = null; // valeurs connues recalculées au prochain focus
      const key = keyOf(path);
      if (AERODROME.has(key) || key === 'legs.*.from' || key === 'legs.*.to') {
        aerodromeHint(path, value);
        // Lever / coucher calculés automatiquement dès que le terrain de départ est connu.
        if ((key === 'navigation.dep' || path === 'aircraft.0.baseDeparture') && value) {
          const done = await sun([], true);
          commit(done);
        }
      }
      if (key === 'metadata.date' || key === 'timeline.takeoff') {
        const done = await sun([], true);
        commit(done);
      }
      if (path === 'environment.metar' && value) commit(applyMetar(value));
      if (['environment.metar', 'environment.temperature', 'environment.qnh', 'navigation.dep', 'aircraft.0.baseDeparture'].includes(path)) commit(await densityAltitude([]));
    }
    // Indicatif de la série quand il n'en reste qu'un pour ce type (et cet opérateur) :
    // Sécurité civile + H145 → DRAGON ; SAMU + H145 → SAMU.
    function seriesPrefix(index) {
      const item = getMission().aircraft?.[index];
      if (!item?.type) return '';
      const operator = index === 0 ? getMission().organisation?.organisation || '' : '',
        type = A.typeKey(item.type);
      // Appareils de ce type (et de cet opérateur) par indicatif de série.
      let entries = A.callsignSeries().flatMap(s => s.numbers.filter(n => n.type === type).map(n => ({
        ...n,
        prefix: s.prefix
      })));
      // Opérateur renseigné : seuls ses appareils comptent (à défaut, la table décide).
      if (operator) entries = entries.filter(n => up(n.operator) === up(operator));
      const counts = new Map();
      entries.forEach(n => counts.set(n.prefix, (counts.get(n.prefix) || 0) + 1));
      // Série unique, ou largement majoritaire (≥ 80 % : une coquille isolée ne bloque pas).
      const [best] = [...counts].sort((a, b) => b[1] - a[1]);
      if (best) return best[1] / entries.length >= 0.8 ? best[0] : '';
      // Aucun appareil connu : table de correspondance (Sécurité civile + BE20 → BENGALE),
      // hors indicatifs de fonction (ICARE) et désignateurs génériques.
      const rows = A.table().filter(e => !e.role && !e.generic && e.types.some(t => A.typeKey(t) === type) && (!operator || up(e.operator) === up(operator)));
      return rows.length === 1 ? rows[0].prefix : '';
    }
    return {
      suggest,
      aircraftCommit,
      seriesPrefix,
      onCommit,
      decorate,
      airport,
      cachedAirport,
      remember,
      applyMetar,
      sun,
      autoEnvironment,
      status: text => status(text),
      T
    };
  }

  window.MissionAssist = {
    create,
    parseMetar,
    buildMetar,
    sunTimes,
    routePoints,
    airport,
    remember,
    loadAirports,
    T
  };
})();
