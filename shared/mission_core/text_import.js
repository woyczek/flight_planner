(() => {
  'use strict';
  // Mission Report Core — analyse d'un texte collé (champ « Analyser / importer » de l'en-tête).
  //
  // Reconnaît :
  // - un message de plan de vol OACI « (FPL-…) » (cases 7 à 19) ;
  // - une page « détails » du tracker IVAO copiée (Ctrl+A, Ctrl+C) : plan de vol (dernière
  //   révision), connexion / déconnexion, table des positions (heure, lat, lon, altitude,
  //   vitesse sol) → décollage, atterrissage, distance, altitude maximale ;
  // - la liste des connexions du tracker IVAO (callsign, trajet, début, fin) ;
  // - la page d'un vol StatSim (VATSIM, statsim.net) : indicatif, appareil, route, départ /
  //   arrivée (décollage / atterrissage), table des positions → mêmes calculs que le tracker IVAO ;
  // - l'historique des connexions VATSIM (JSON de api.vatsim.net) → délégué au suivi réseau ;
  // - un METAR.
  // Une page d'un autre site ne peut pas être lue par la page du CR (règle de même origine) :
  // copier-coller, ou favori « → CR » (BOOKMARKLET) qui copie la page du tracker.
  const M = window.MissionModel;
  /** Texte en majuscules sans blancs de bord. */
  const up = v => String(v ?? '').trim().toUpperCase();
  // Espaces normalisés ; « | » du tracker IVAO (« 2026-07-07 | 12:59:42 ») traité comme un séparateur.
  const flat = text => String(text || '').replace(/[\u00a0|]/g, ' ').replace(/\s+/g, ' ').trim();
  /** Nombre sur deux chiffres. */
  const pad = n => String(n).padStart(2, '0');

  // ---------------------------------------------------------------- plan de vol OACI
  function parseFpl(text) {
    const m = /\(FPL-([\s\S]*?)\)/.exec(text);
    if (!m) return null;
    const parts = flat(m[1]).split(/\s*-\s*(?=\S)/);
    const [callsign, rulesType, item9, item10, item13, item15, item16, ...rest] = parts;
    if (!callsign || !item13) return null;
    const i9 = /^(?:(\d+)\/)?([A-Z0-9]{2,4})\/([LMHJ])$/.exec(up(item9)) || [];
    const [equip = '', transponder = ''] = up(item10).split('/');
    const dep = up(item13).slice(0, 4),
      eobt = up(item13).slice(4, 8);
    const route15 = up(item15).split(' '),
      first = route15.shift() || '';
    const sl = /^([NKM]\d{3,4})(F\d{3}|A\d{3}|S\d{4}|M\d{4}|VFR)$/.exec(first) || [];
    const d16 = up(item16).split(' ');
    // Case 18 : indicateurs XXX/… jusqu'au suivant ; case 19 (E/, P/…) après un tiret.
    const text18 = rest.join(' - ');
    const item18 = {};
    (text18.match(/[A-Z]{2,4}\/.*?(?=\s[A-Z]{2,4}\/|$)/g) || []).forEach(token => {
      const i = token.indexOf('/');
      item18[token.slice(0, i)] = token.slice(i + 1).trim();
    });
    const endurance = /(?:^|\s)E\/(\d{4})/.exec(text18),
      persons = /(?:^|\s)P\/(\d{1,3})/.exec(text18);
    const dof = /^(\d{2})(\d{2})(\d{2})$/.exec(item18.DOF || '');
    /** Heure « HHMM » → « HH:MM ». */
    const hm = v => /^\d{4}$/.test(v || '') ? `${v.slice(0, 2)}:${v.slice(2)}` : '';
    /** Durée « HHMM » → minutes. */
    const minutes = v => /^\d{4}$/.test(v || '') ? Number(v.slice(0, 2)) * 60 + Number(v.slice(2)) : null;
    const rules = up(rulesType).charAt(0);
    return {
      source: 'FPL',
      callsign: up(callsign),
      rules,
      flightType: up(rulesType).charAt(1),
      type: i9[2] || up(item9).split('/')[0],
      wake: i9[3] || '',
      count: Number(i9[1] || 1),
      equipment: window.MissionFpl?.equipmentCodes(equip, transponder, rules) || [],
      dep: dep === 'ZZZZ' ? up(item18.DEP) : dep,
      eobt: hm(eobt),
      speed: sl[1] ? (sl[1][0] === 'K' ? Math.round(Number(sl[1].slice(1)) / 1.852) : sl[1][0] === 'N' ? Number(sl[1].slice(1)) : null) : null,
      altitude: sl[2] ? window.MissionFpl?.level(sl[2]) || sl[2] : '',
      route: route15.join(' '),
      waypoints: [...new Set(window.MissionAssist?.routePoints(route15.join(' ')) || [])],
      arr: d16[0] ? (d16[0].slice(0, 4) === 'ZZZZ' ? up(item18.DEST) : d16[0].slice(0, 4)) : '',
      eet: minutes(d16[0]?.slice(4)),
      altn: d16[1] || '',
      altn2: d16[2] || '',
      registration: item18.REG || '',
      operatorCode: item18.OPR || '',
      date: dof ? `20${dof[1]}-${dof[2]}-${dof[3]}` : '',
      remarks: item18.RMK || '',
      item18,
      endurance: endurance ? minutes(endurance[1]) : null,
      pob: persons ? Number(persons[1]) : null
    };
  }

  // ------------------------------------------------------------------ tracker IVAO
  /** Instant UTC d'une date et d'une heure. */
  const utc = (date, time) => new Date(`${date}T${time}Z`);

  /** Détails d'un vol copiés depuis le tracker IVAO (page « flight details ») : indicatif, appareil, départ, arrivée, heures, trace. */
  function parseIvaoDetails(text) {
    const t = flat(text);
    // Page reconnue à sa structure (le texte copié ne contient pas forcément « IVAO ») ;
    // intitulés en majuscules ou non selon la copie.
    if (!/Tracks Table|Flight Plans|Tracks Map|\bConnected\b/i.test(t)) return null;
    const samples = [];
    const re = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+) ?ft (\d+) ?knots/g;
    let m;
    while ((m = re.exec(t))) samples.push({
      time: utc(m[1], m[2]),
      lat: Number(m[3]),
      lon: Number(m[4]),
      alt: Number(m[5]),
      gs: Number(m[6])
    });
    const con = /\bConnected (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) Disconnected (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/i.exec(t) ||
      /\bOn (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) Off (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/i.exec(t);
    const leg = /\bLeg ([A-Z0-9]{3,4}) ?- ?([A-Z0-9]{3,4})\b/i.exec(t),
      flight = /\bFlight (?!plans\b)([A-Z0-9]{2,10})\b/i.exec(t);
    if (!samples.length && !con) return null;
    return {
      source: 'IVAO',
      callsign: up(flight?.[1]),
      dep: up(leg?.[1]),
      arr: up(leg?.[2]),
      // Table des positions absente : sections repliées lors d'un copier-coller manuel.
      tracksMissing: !samples.length && /Tracks Table/i.test(t),
      connected: con ? utc(con[1], con[2]) : null,
      disconnected: con ? utc(con[3], con[4]) : null,
      samples,
      fpl: parseFpl(text)
    };
  }
  // ------------------------------------------------------------------ StatSim (VATSIM)
  // Page d'un vol (statsim.net) : « Flight info » (indicatif, temps de vol, altitude, route,
  // appareil au format plan de vol), départ / arrivée (heure et terrain), table des positions
  // (heure, lat, lon, altitude, vitesse, cap). Heures UTC.
  function parseStatsimFlight(text) {
    const t = flat(text);
    if (!/Flight info/i.test(t) || !/\bCallsign\b/i.test(t)) return null;
    const samples = [];
    const re = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+) ?ft (\d+) ?kts?\b/g;
    let m;
    while ((m = re.exec(t))) samples.push({
      time: utc(m[1], m[2].length === 5 ? `${m[2]}:00` : m[2]),
      lat: Number(m[3]),
      lon: Number(m[4]),
      alt: Number(m[5]),
      gs: Number(m[6])
    });
    /** Valeur d'une rubrique de la page copiée (texte entre label et la rubrique suivante). */
    const field = (label, next) => new RegExp(`\\b${label} (.+?) (?=${next}\\b)`, 'i').exec(t)?.[1]?.trim() || '';
    const callsign = up(/\bCallsign ([A-Z0-9]{2,10})\b/i.exec(t)?.[1]);
    /** Départ ou arrivée d'une page copiée : heure, terrain, code OACI. */
    const point = label => {
      const x = new RegExp(`\\b${label} Time (\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}) Airport (.+?) \\(([A-Z0-9]{3,4})\\)`, 'i').exec(t);
      return x ? {
        time: utc(x[1], `${x[2]}:00`),
        name: x[3],
        icao: up(x[4])
      } : null;
    };
    const departure = point('Departure'),
      arrival = point('Arrival');
    const aircraftText = field('Aircraft', 'Departure'),
      route = field('Route', 'Aircraft'),
      altitude = /\bAltitude (\d{3,5})\b/i.exec(t)?.[1] || '';
    if (!callsign && !samples.length) return null;
    const ac = window.MissionFpl?.splitAircraft(aircraftText) || {};
    const leg = /\b[A-Z0-9]{2,10} ([A-Z0-9]{4})-([A-Z0-9]{4})\b/.exec(t);
    const dep = departure?.icao || leg?.[1] || '',
      arr = arrival?.icao || leg?.[2] || '';
    return {
      source: 'StatSim',
      network: 'VATSIM',
      callsign,
      dep,
      arr,
      samples,
      connected: samples[0]?.time || null,
      disconnected: samples[samples.length - 1]?.time || null,
      takeoffTime: departure?.time || null,
      landingTime: arrival?.time || null,
      fpl: {
        source: 'StatSim',
        callsign,
        type: ac.type || '',
        equipment: window.MissionFpl?.equipmentCodes(ac.equip, ac.transponder, '') || [],
        dep,
        arr,
        route: up(route),
        waypoints: [...new Set(window.MissionAssist?.routePoints(route) || [])],
        altitude: altitude ? window.MissionFpl?.level(altitude) : '',
        network: 'VATSIM'
      }
    };
  }

  /** Liste de sessions copiée depuis le tracker IVAO : vols reconnus (indicatif, pilote, trajet, début, fin, durée). */
  function parseIvaoList(text) {
    const t = flat(text); // lignes reconnues à leur forme (indicatif, pilote (VID), trajet, début, fin, durée)
    const re = /\b([A-Z0-9]{2,10}) ([^()\d]{2,40}?) \((\d{3,8})\) ([A-Z0-9]{3,4}) ?- ?([A-Z0-9]{3,4}) (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (\d{2}:\d{2})\b/g;
    const out = [];
    let m;
    while ((m = re.exec(t))) out.push({
      callsign: m[1],
      user: m[2],
      vid: m[3],
      dep: m[4],
      arr: m[5],
      start: utc(m[6], m[7]),
      end: utc(m[8], m[9])
    });
    return out;
  }

  // Analyse de la trace : sol / vol (vitesse sol et altitude), décollage, atterrissage, distance.
  function analyseTrack(samples, rotary = false) {
    if (samples.length < 2) return null;
    const minAlt = Math.min(...samples.map(s => s.alt));
    /** Vrai si un point de trace est au sol (vitesse et hauteur basses ; seuils hélicoptère plus bas). */
    const onGround = s => rotary ? s.gs < 15 && s.alt <= minAlt + 150 : s.gs < 40 && s.alt <= minAlt + 300;
    let takeoff = null,
      landing = null,
      nm = 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1],
        b = samples[i];
      if (onGround(a) && !onGround(b) && !takeoff) takeoff = b.time;
      if (!onGround(a) && onGround(b)) landing = b.time;
      const rad = Math.PI / 180,
        dLat = (b.lat - a.lat) * rad,
        dLon = (b.lon - a.lon) * rad;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
      nm += 3440.065 * 2 * Math.asin(Math.sqrt(h));
    }
    return {
      takeoff,
      landing,
      distanceNm: Math.round(nm),
      maxAlt: Math.max(...samples.map(s => s.alt)),
      startsOnGround: onGround(samples[0]),
      endsOnGround: onGround(samples[samples.length - 1]),
      first: samples[0].time,
      last: samples[samples.length - 1].time
    };
  }

  // ------------------------------------------------------------------- détection
  function analyse(text) {
    const raw = String(text || '').trim();
    if (!raw) return {
      kind: 'empty'
    };
    if (/^[[{]/.test(raw)) {
      try {
        const data = JSON.parse(raw);
        const list = data?.items || data?.results || (Array.isArray(data) ? data : null);
        if (list?.some?.(s => s?.start)) return {
          kind: 'vatsim-history',
          text: raw
        };
      } catch {
        /* pas du JSON */
      }
    }
    // Adresse exacte de la trace (session) du tracker IVAO : copiée par le favori, ou collée seule.
    const session = /https?:\/\/tracker\.ivao\.aero\/sessions\/\d+/.exec(raw)?.[0] || '';
    const details = parseIvaoDetails(raw);
    if (details && (details.samples.length || details.connected)) return {
      kind: 'ivao-details',
      trackerUrl: session,
      ...details
    };
    if (session && raw.replace(session, '').trim().length < 3) return {
      kind: 'tracker-url',
      trackerUrl: session
    };
    // Page d'un vol StatSim (VATSIM) : adresse du vol copiée par le favori.
    const statsimUrl = /https?:\/\/(?:www\.)?statsim\.net\/\S+/.exec(raw)?.[0] || '';
    const statsim = parseStatsimFlight(raw);
    if (statsim) return {
      kind: 'statsim-flight',
      trackerUrl: statsimUrl,
      ...statsim
    };
    const list = parseIvaoList(raw);
    if (list.length) return {
      kind: 'ivao-list',
      sessions: list
    };
    const fpl = parseFpl(raw);
    if (fpl) return {
      kind: 'fpl',
      fpl
    };
    const metar = /\b([A-Z]{4} \d{6}Z .+?)(?:=|$)/m.exec(raw);
    if (metar) return {
      kind: 'metar',
      metar: flat(metar[1])
    };
    return {
      kind: 'unknown'
    };
  }

  // Heure locale (HH:MM) d'un instant UTC dans le fuseau du terrain (sinon UTC).
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
  /** Date locale (AAAA-MM-JJ) d'un instant UTC dans le fuseau du terrain (sinon UTC). */
  const day = (date, tz) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  };

  // Remplit les champs vides de la mission. options : { tz, rotary, today }. Renvoie
  // { done: [chemins], notes: [textes] }.
  function apply(mission, result, {
    tz = '',
    rotary = false,
    today = new Date().toISOString().slice(0, 10)
  } = {}) {
    const done = [],
      notes = [];
    const set = (path, value, {
      force = false
    } = {}) => {
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) return;
      const cur = M.get(mission, path);
      if (!force && cur != null && cur !== '' && !(Array.isArray(cur) && !cur.length)) return;
      M.set(mission, path, value);
      done.push(path);
    };
    // La date du jour proposée par défaut est remplacée par celle du vol (DOF / tracker).
    const setDate = date => {
      if (date && (!mission.metadata.date || mission.metadata.date === today) && mission.metadata.date !== date) {
        mission.metadata.date = date;
        done.push('metadata.date');
      }
    };
    /** Recopie un plan de vol OACI analysé dans les champs vides de la mission (terrains, route, niveau, appareil, équipements, heures). */
    const applyFpl = fpl => {
      if (!fpl) return;
      done.push(...(window.MissionFpl?.apply(mission, fpl) || []));
      setDate(fpl.date);
      set('metadata.timeUtc', fpl.eobt);
      set('aircraft.0.enduranceMinutes', fpl.endurance);
      if (fpl.rules) {
        const caps = new Set(mission.capabilities || []),
          before = caps.size;
        ({
          I: ['IFR'],
          V: ['VFR'],
          Y: ['IFR', 'VFR'],
          Z: ['VFR', 'IFR']
        } [fpl.rules] || []).forEach(c => caps.add(c));
        if (caps.size !== before) {
          mission.capabilities = [...caps];
          done.push('capabilities');
        }
      }
      set('remarks.observations', fpl.remarks);
      if (fpl.altn2) notes.push(`2e dégagement : ${fpl.altn2}`);
      if (fpl.eet != null) notes.push(`EET ${pad(Math.floor(fpl.eet / 60))}h${pad(fpl.eet % 60)}`);
    };
    if (result.kind === 'fpl') applyFpl(result.fpl);
    if (result.kind === 'metar') set('environment.metar', result.metar);
    // URL de la trace : celle de la session remplace une adresse générique du tracker.
    if (result.trackerUrl) {
      const current = mission.network?.trackerUrl || '';
      if (!current || !/\/sessions\/\d+|flightid=|\/flights?\/\d/.test(current)) {
        M.set(mission, 'network.trackerUrl', result.trackerUrl);
        done.push('network.trackerUrl');
      }
      set('network.onlineNetwork', result.network || 'IVAO');
    }
    // Page de vol : tracker IVAO (détails) ou StatSim (VATSIM) — même traitement de la trace.
    if (result.kind === 'ivao-details' || result.kind === 'statsim-flight') {
      applyFpl(result.fpl);
      set('aircraft.0.callsign', result.callsign);
      set('navigation.dep', result.dep);
      set('navigation.arr', result.arr);
      set('network.onlineNetwork', result.network || 'IVAO');
      // Heures de départ / arrivée calculées par StatSim : décollage / atterrissage.
      if (result.takeoffTime) set('timeline.takeoff', clock(result.takeoffTime, tz));
      if (result.landingTime) set('timeline.landing', clock(result.landingTime, tz));
      const track = analyseTrack(result.samples, rotary);
      if (result.tracksMissing) notes.push('table des positions absente (section « Tracks Table » repliée) : utilisez le favori « → CR », qui déplie tout, ou dépliez « Tracks Table » avant de copier');
      if (result.connected) setDate(day(result.connected, tz));
      // Début / fin de mission ≈ connexion / déconnexion (période volée sur le réseau).
      if (result.connected) set('timeline.missionStart', clock(result.connected, tz));
      if (result.disconnected) set('timeline.missionEnd', clock(result.disconnected, tz));
      if (track) {
        // Mise en route / arrêt ≈ connexion / déconnexion, seulement si la trace commence / finit au sol.
        if (track.startsOnGround && result.connected) set('timeline.engineStart', clock(result.connected, tz));
        else notes.push('connexion en vol : décollage et mise en route absents de la trace');
        if (track.takeoff) set('timeline.takeoff', clock(track.takeoff, tz));
        if (track.landing) set('timeline.landing', clock(track.landing, tz));
        if (track.endsOnGround && result.disconnected) set('timeline.shutdown', clock(result.disconnected, tz));
        else notes.push('déconnexion en vol : atterrissage et arrêt absents de la trace');
        set('navigation.distanceNm', track.distanceNm);
        notes.push(`trace : ${result.samples.length} points, ${clock(track.first, tz)}–${clock(track.last, tz)}, ${track.distanceNm} NM, altitude max ${track.maxAlt} ft`);
      } else if (result.connected) {
        set('timeline.engineStart', clock(result.connected, tz));
        set('timeline.shutdown', clock(result.disconnected, tz));
        notes.push('connexion / déconnexion ≈ mise en route / fin de mission (heures du réseau)');
      }
      if (result.connected) set('metadata.timeUtc', `${pad(result.connected.getUTCHours())}:${pad(result.connected.getUTCMinutes())}`);
    }
    if (result.kind === 'ivao-list') {
      // Connexion du jour de la mission (même indicatif de préférence), sinon la plus récente.
      const date = mission.metadata.date,
        callsign = up(mission.aircraft?.[0]?.callsignFpl || mission.aircraft?.[0]?.callsign).replace(/\s+/g, '');
      let sessions = result.sessions.filter(s => day(s.start, tz) === date);
      if (callsign && sessions.some(s => s.callsign === callsign)) sessions = sessions.filter(s => s.callsign === callsign);
      if (!sessions.length) {
        sessions = [result.sessions[0]];
        setDate(day(sessions[0].start, tz));
        notes.push(`aucune connexion le ${date} : dernière connexion reprise`);
      }
      const first = sessions.reduce((a, b) => a.start < b.start ? a : b),
        last = sessions.reduce((a, b) => a.end > b.end ? a : b);
      set('aircraft.0.callsign', first.callsign);
      set('navigation.dep', first.dep === 'ZZZZ' ? '' : first.dep);
      set('navigation.arr', last.arr === 'ZZZZ' ? '' : last.arr);
      set('timeline.engineStart', clock(first.start, tz));
      set('timeline.shutdown', clock(last.end, tz));
      set('network.onlineNetwork', 'IVAO');
      set('network.ivaoId', first.vid);
      notes.push(`${sessions.length} connexion(s) IVAO : ${clock(first.start, tz)}–${clock(last.end, tz)} ≈ mise en route / fin de mission (heures du réseau). Pour les heures de vol : copier la page « détails » du vol.`);
    }
    return {
      done: [...new Set(done)],
      notes
    };
  }

  // Favori (bookmarklet) à glisser dans la barre des favoris. Sur la page « détails » du
  // tracker IVAO : déplie les sections repliées (révisions, « Tracks Table »), fait défiler la
  // table des positions jusqu'au bout (chargement progressif), puis copie le texte de TOUTE
  // la page, sections masquées comprises, un élément par ligne (un Ctrl+A / Ctrl+C ne copie que
  // ce qui est affiché). La page du CR l'analyse au retour. Pas de commentaire de ligne ni de
  // « % » dans cette fonction : elle devient une adresse javascript: sur une seule ligne.
  async function trackerCopy() {
    /** Attente de ms millisecondes. */
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    document.querySelectorAll('.card-header button, .accordion button').forEach(button => {
      const card = button.closest('.card'),
        collapse = card && card.querySelector('.collapse');
      if (collapse && !collapse.classList.contains('show')) button.click();
    });
    await sleep(700);
    let last = -1;
    for (let i = 0; i < 40; i++) {
      document.querySelectorAll('.infinite-scroll-component, .list_table_scroll').forEach(el => {
        el.scrollTop = el.scrollHeight;
        if (el.parentElement) el.parentElement.scrollTop = el.parentElement.scrollHeight;
      });
      await sleep(350);
      const count = document.body.getElementsByTagName('*').length;
      if (count === last) break;
      last = count;
    }
    const lines = [];
    /** Parcourt la page du tracker et en extrait le texte visible. */
    const walk = node => {
      if (node.nodeType === 3) {
        const text = node.nodeValue.trim();
        if (text) lines.push(text);
        return;
      }
      if (/^(SCRIPT|STYLE|NOSCRIPT|SVG)$/i.test(node.nodeName)) return;
      node.childNodes.forEach(walk);
    };
    walk(document.body);
    lines.unshift(location.href);
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('CR : page copiée (' + lines.length + ' éléments). Revenez sur le compte rendu.');
    } catch (error) {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      alert(ok ? 'CR : page copiée. Revenez sur le compte rendu.' : 'CR : copie impossible (' + error.message + ').');
    }
  }
  const BOOKMARKLET = 'javascript:(' + trackerCopy.toString().replace(/\s*\n\s*/g, ' ') + ')()';

  window.MissionTextImport = {
    analyse,
    apply,
    parseFpl,
    parseIvaoDetails,
    parseIvaoList,
    analyseTrack,
    BOOKMARKLET
  };
})();
