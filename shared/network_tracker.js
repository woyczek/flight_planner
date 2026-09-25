(() => {
  'use strict';
  // « Récupérer les infos » (suivi réseau) pour les générateurs de CR HEMS / GAAR.
  //
  // Ce qu'un navigateur peut réellement faire depuis une page statique :
  // - EN DIRECT : les flux publics IVAO (api.ivao.aero/v2/tracker/now/pilots/summary)
  //   et VATSIM (data.vatsim.net/v3/vatsim-data.json) sont lisibles (CORS ouvert).
  //   La page les interroge pendant le vol et en déduit mise en route, décollage,
  //   atterrissage et fin de mission — à condition de rester ouverte.
  // - APRÈS LE VOL : l'historique VATSIM (connexions, plans de vol) est public mais
  //   api.vatsim.net n'envoie aucun en-tête CORS : il s'ouvre dans un onglet, le pilote
  //   le copie et la page lit le presse-papiers à son retour. L'historique IVAO exige une
  //   authentification OAuth/API : le pilote, connecté sur tracker.ivao.aero, y lit
  //   les heures. Une page ne peut ni lire une autre page ni réutiliser sa session
  //   (règle de même origine) : pas d'« habillage » possible des trackers.
  // CR HEMS / FIRE (#missionForm) ou page du Mission Report Core (#missionCoreForm, champs
  // exposés sous les mêmes noms grâce aux alias des blocs communs).
  const form = document.getElementById('missionForm') || document.getElementById('missionCoreForm');
  if (!form) return;
  const KIND = document.body.dataset.family ? document.body.dataset.family.toLowerCase() : location.pathname.includes('/FIRE/') ? 'gaar' : 'hems';
  const STORE = `networkWatch:v1:${KIND}`;
  const POLL_MS = 20000,
    MAX_AGE_MS = 14 * 3600 * 1000;
  const FEEDS = {
    IVAO: 'https://api.ivao.aero/v2/tracker/now/pilots/summary',
    VATSIM: 'https://data.vatsim.net/v3/vatsim-data.json'
  };
  const HISTORY = {
    vatsimConnections: cid => `https://api.vatsim.net/v2/members/${encodeURIComponent(cid)}/history?limit=50`,
    vatsimStats: cid => `https://stats.vatsim.net/stats/${encodeURIComponent(cid)}`,
    statsimFlights: cid => `https://statsim.net/flights/vatsimid/${encodeURIComponent(cid)}`,
    ivaoTracker: vid => `https://tracker.ivao.aero/?userId=${encodeURIComponent(vid)}`
  };

  const L = {
    fr: {
      title: 'Récupérer les infos (suivi réseau)',
      intro: 'Suivi en direct : lancez-le avant la mise en route et gardez cette page ouverte jusqu’à l’arrêt moteur. Elle interroge les données publiques IVAO / VATSIM toutes les 20 s et remplit mise en route, décollage, atterrissage et fin de mission. Quitter ou fermer la page arrête le suivi (une alerte vous prévient). Après le vol : VATSIM publie l’historique des connexions ; IVAO et statsim n’affichent le détail du vol que si vous êtes connecté sur leur site — ouvrez le lien, puis reportez ou collez les informations ici.',
      start: 'Démarrer le suivi en direct',
      stop: 'Arrêter le suivi',
      history: 'Récupérer l’historique VATSIM',
      ivao: 'Ouvrir mon tracker IVAO (connexion requise)',
      statsim: 'Ouvrir mes vols statsim (connexion requise)',
      paste: 'Coller ici le contenu de la page d’historique VATSIM, puis « Analyser »',
      parse: 'Analyser',
      askId: 'Renseignez votre ID IVAO ou VATSIM (Identification ou menu ☰ › Profil pilote).',
      waiting: 'Suivi actif ({net} {id}) — pas encore connecté au réseau. Dernière vérification : {t}.',
      active: 'Suivi actif ({net} {id}, {cs}) — {state}. Dernière vérification : {t}.',
      stopped: 'Suivi arrêté.',
      feedError: 'Flux {net} indisponible ({err}) ; nouvel essai dans 20 s.',
      leave: 'Le suivi réseau est en cours : quitter la page l’arrête. Quitter quand même ?',
      corsBlocked: 'VATSIM n’autorise pas la lecture directe par une autre page : l’historique s’ouvre dans un nouvel onglet. Copiez tout son contenu (Ctrl+A puis Ctrl+C) et revenez ici : il est analysé automatiquement. Sinon, « Coller et analyser » ou Ctrl+V dans la zone ci-dessous.',
      vatsimStats: 'Ouvrir mes stats VATSIM',
      clip: 'Coller et analyser',
      clipDenied: 'Lecture du presse-papiers refusée : collez le contenu dans la zone (Ctrl+V).',
      noSession: 'Aucune connexion VATSIM trouvée le {date}{cs}.',
      filled: 'Heures renseignées depuis {src} : {list}.',
      approx: 'Connexion/déconnexion VATSIM ≈ mise en route / fin de mission (heures du réseau, à vérifier).',
      f_engineStart: 'mise en route',
      f_engineStop: 'fin de mission',
      resumed: 'Suivi en direct repris après rechargement de la page.',
      log: 'Journal du suivi'
    },
    en: {
      title: 'Retrieve flight info (network tracking)',
      intro: 'Live tracking: start it before engine start and keep this page open until shutdown. It polls the public IVAO / VATSIM data every 20 s and fills engine start, take-off, landing and mission end. Leaving or closing the page stops tracking (you will be warned). After the flight: VATSIM publishes connection history; IVAO and statsim only show flight details when you are logged in on their site — open the link, then copy or paste the information here.',
      start: 'Start live tracking',
      stop: 'Stop tracking',
      history: 'Retrieve VATSIM history',
      ivao: 'Open my IVAO tracker (login required)',
      statsim: 'Open my statsim flights (login required)',
      paste: 'Paste the VATSIM history page content here, then “Analyse”',
      parse: 'Analyse',
      askId: 'Enter your IVAO or VATSIM ID (Identification or menu ☰ › Pilot profile).',
      waiting: 'Tracking ({net} {id}) — not connected to the network yet. Last check: {t}.',
      active: 'Tracking ({net} {id}, {cs}) — {state}. Last check: {t}.',
      stopped: 'Tracking stopped.',
      feedError: '{net} feed unavailable ({err}); retrying in 20 s.',
      leave: 'Network tracking is running: leaving the page stops it. Leave anyway?',
      corsBlocked: 'VATSIM does not allow other pages to read it directly: the history opens in a new tab. Copy all of it (Ctrl+A then Ctrl+C) and come back here: it is analysed automatically. Otherwise use “Paste and analyse” or Ctrl+V in the box below.',
      vatsimStats: 'Open my VATSIM stats',
      clip: 'Paste and analyse',
      clipDenied: 'Clipboard access denied: paste the content into the box (Ctrl+V).',
      noSession: 'No VATSIM connection found on {date}{cs}.',
      filled: 'Times filled from {src}: {list}.',
      approx: 'VATSIM connection/disconnection ≈ engine start / mission end (network times, please check).',
      f_engineStart: 'engine start',
      f_engineStop: 'mission end',
      resumed: 'Live tracking resumed after page reload.',
      log: 'Tracking log'
    },
    de: {
      title: 'Flugdaten abrufen (Netzwerk-Tracking)',
      intro: 'Live-Tracking: vor dem Anlassen starten und diese Seite bis zum Abstellen geöffnet lassen. Sie fragt alle 20 s die öffentlichen IVAO-/VATSIM-Daten ab und füllt Anlassen, Start, Landung und Einsatzende. Verlassen oder Schließen der Seite beendet das Tracking (mit Warnung). Nach dem Flug: VATSIM veröffentlicht die Verbindungshistorie; IVAO und statsim zeigen Flugdetails nur bei Anmeldung auf ihrer Seite — Link öffnen und die Angaben hier übernehmen oder einfügen.',
      start: 'Live-Tracking starten',
      stop: 'Tracking beenden',
      history: 'VATSIM-Historie abrufen',
      ivao: 'Mein IVAO-Tracker (Anmeldung nötig)',
      statsim: 'Meine statsim-Flüge (Anmeldung nötig)',
      paste: 'Inhalt der VATSIM-Historienseite hier einfügen, dann „Auswerten“',
      parse: 'Auswerten',
      askId: 'IVAO- oder VATSIM-ID eingeben (Identifikation oder Menü ☰ › Pilotenprofil).',
      waiting: 'Tracking ({net} {id}) — noch nicht mit dem Netzwerk verbunden. Letzte Prüfung: {t}.',
      active: 'Tracking ({net} {id}, {cs}) — {state}. Letzte Prüfung: {t}.',
      stopped: 'Tracking beendet.',
      feedError: '{net}-Feed nicht verfügbar ({err}); neuer Versuch in 20 s.',
      leave: 'Das Netzwerk-Tracking läuft: Verlassen der Seite beendet es. Trotzdem verlassen?',
      corsBlocked: 'VATSIM erlaubt anderen Seiten kein direktes Lesen: die Historie öffnet sich in einem neuen Tab. Alles kopieren (Strg+A, dann Strg+C) und hierher zurückkehren: sie wird automatisch ausgewertet. Sonst „Einfügen und auswerten“ oder Strg+V im Feld unten.',
      vatsimStats: 'Meine VATSIM-Statistik öffnen',
      clip: 'Einfügen und auswerten',
      clipDenied: 'Zugriff auf die Zwischenablage verweigert: Inhalt ins Feld einfügen (Strg+V).',
      noSession: 'Keine VATSIM-Verbindung am {date}{cs} gefunden.',
      filled: 'Zeiten aus {src} übernommen: {list}.',
      approx: 'VATSIM-Verbindung/Trennung ≈ Anlassen / Einsatzende (Netzwerkzeiten, bitte prüfen).',
      f_engineStart: 'Anlassen',
      f_engineStop: 'Einsatzende',
      resumed: 'Live-Tracking nach Neuladen fortgesetzt.',
      log: 'Tracking-Protokoll'
    },
    es: {
      title: 'Recuperar datos del vuelo (seguimiento de red)',
      intro: 'Seguimiento en directo: inícielo antes de la puesta en marcha y mantenga esta página abierta hasta la parada de motores. Consulta cada 20 s los datos públicos de IVAO / VATSIM y rellena puesta en marcha, despegue, aterrizaje y fin de misión. Salir o cerrar la página detiene el seguimiento (se le avisará). Después del vuelo: VATSIM publica el historial de conexiones; IVAO y statsim solo muestran el detalle si ha iniciado sesión en su sitio — abra el enlace y copie o pegue aquí la información.',
      start: 'Iniciar seguimiento en directo',
      stop: 'Detener seguimiento',
      history: 'Recuperar historial VATSIM',
      ivao: 'Abrir mi tracker IVAO (requiere sesión)',
      statsim: 'Abrir mis vuelos statsim (requiere sesión)',
      paste: 'Pegue aquí el contenido de la página de historial VATSIM y pulse «Analizar»',
      parse: 'Analizar',
      askId: 'Indique su ID IVAO o VATSIM (Identificación o menú ☰ › Perfil de piloto).',
      waiting: 'Seguimiento ({net} {id}) — aún no conectado a la red. Última comprobación: {t}.',
      active: 'Seguimiento ({net} {id}, {cs}) — {state}. Última comprobación: {t}.',
      stopped: 'Seguimiento detenido.',
      feedError: 'Datos {net} no disponibles ({err}); nuevo intento en 20 s.',
      leave: 'El seguimiento de red está activo: salir de la página lo detiene. ¿Salir de todos modos?',
      corsBlocked: 'VATSIM no permite que otras páginas lo lean directamente: el historial se abre en una nueva pestaña. Copie todo (Ctrl+A y luego Ctrl+C) y vuelva aquí: se analiza automáticamente. Si no, use «Pegar y analizar» o Ctrl+V en el cuadro de abajo.',
      vatsimStats: 'Abrir mis estadísticas VATSIM',
      clip: 'Pegar y analizar',
      clipDenied: 'Acceso al portapapeles denegado: pegue el contenido en el cuadro (Ctrl+V).',
      noSession: 'No se encontró ninguna conexión VATSIM el {date}{cs}.',
      filled: 'Horas rellenadas desde {src}: {list}.',
      approx: 'Conexión/desconexión VATSIM ≈ puesta en marcha / fin de misión (horas de red, a verificar).',
      f_engineStart: 'puesta en marcha',
      f_engineStop: 'fin de misión',
      resumed: 'Seguimiento en directo reanudado tras recargar la página.',
      log: 'Registro del seguimiento'
    }
  };
  /** Texte de l'interface du suivi réseau dans la langue de la page, variables {x} remplacées. */
  const t = (key, vars = {}) => {
    const lang = window.RepositoryNav?.getLanguage?.() || 'fr';
    return String((L[lang] || L.fr)[key] || L.fr[key]).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  };
  /** Champ du formulaire de CR par son nom. */
  const field = name => form.querySelector(`[name="${name}"]`);
  /** Valeur (texte sans blancs de bord) d'un champ du formulaire. */
  const value = name => String(field(name)?.value || '').trim();
  /** Heure locale « HH:MM » d'une date. */
  const hhmm = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  /** Échappe un texte pour HTML. */
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  } [c]));

  // ------------------------------------------------------------------ état du suivi
  /** Suivi en cours mémorisé pour cet onglet et cette famille (abandonné au-delà de 14 h). */
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE) || 'null');
    } catch {
      return null;
    }
  };
  /** Mémorise l'état du suivi (reprise après rechargement de la page). */
  const save = () => {
    try {
      if (watch) localStorage.setItem(STORE, JSON.stringify(watch));
      else localStorage.removeItem(STORE);
    } catch {
      /* quota */ }
  };
  let watch = load(),
    timer = null;
  if (watch && (!watch.active || Date.now() - watch.startedAt > MAX_AGE_MS)) {
    watch = null;
    save();
  }

  /** Réseau, identifiant et indicatif à suivre, lus dans le CR : réseau choisi, sinon déduit des ID IVAO / VATSIM renseignés ; indicatif sous sa forme plan de vol (celle du réseau). */
  function identity() {
    let network = value('onlineNetwork').toUpperCase();
    const ivao = value('ivaoId'),
      vatsim = value('vatsimId');
    if (!network) network = ivao && !vatsim ? 'IVAO' : vatsim && !ivao ? 'VATSIM' : ivao ? 'IVAO' : '';
    return {
      network,
      id: network === 'IVAO' ? ivao : network === 'VATSIM' ? vatsim : '',
      callsign: (value('callsignFpl') || value('callsign')).toUpperCase().replace(/\s+/g, '')
    }; // forme plan de vol = indicatif réseau
  }

  // Écrit un horaire : champ vide, ou déjà rempli par ce suivi (jamais une saisie du pilote).
  function fill(name, date, source) {
    const input = field(name);
    if (!input || !date) return false;
    const time = hhmm(date),
      mine = watch?.filled?.[name] ?? input.dataset.networkFilled;
    if (input.value && input.value !== mine) return false;
    if (input.value === time) return false;
    input.value = time;
    input.dataset.networkFilled = time;
    input.title = `${source} — ${date.toLocaleString()}`;
    if (watch)(watch.filled ||= {})[name] = time;
    input.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    return true;
  }

  /** Ajoute une ligne horodatée au journal du suivi. */
  function logLine(text) {
    if (!watch) return;
    (watch.log ||= []).push(`${hhmm(new Date())} ${text}`);
    if (watch.log.length > 60) watch.log.shift();
  }

  // Échantillon normalisé { connected, onGround, state, gs, alt, callsign }.
  async function sample(network, id, callsign) {
    const data = await (await fetch(FEEDS[network], {
      cache: 'no-store'
    })).json();
    if (network === 'IVAO') {
      const pilot = (Array.isArray(data) ? data : []).find(p => String(p.userId) === id) || (callsign && data.find(p => String(p.callsign).toUpperCase() === callsign));
      if (!pilot) return {
        connected: false
      };
      const track = pilot.lastTrack || {};
      return {
        connected: true,
        onGround: track.onGround,
        state: track.state || '',
        gs: track.groundSpeed ?? 0,
        alt: track.altitude ?? 0,
        callsign: pilot.callsign
      };
    }
    const pilot = (data.pilots || []).find(p => String(p.cid) === id) || (callsign && data.pilots.find(p => String(p.callsign).toUpperCase() === callsign));
    if (!pilot) return {
      connected: false
    };
    // VATSIM ne publie pas d'état sol/vol : estimation par l'altitude au-dessus du
    // niveau relevé à l'arrêt, ou une vitesse sol de vol.
    return {
      connected: true,
      onGround: null,
      state: '',
      gs: pilot.groundspeed ?? 0,
      alt: pilot.altitude ?? 0,
      callsign: pilot.callsign
    };
  }

  // Transitions → horaires. Décollage = premier envol ; atterrissage = dernier posé
  // (plusieurs posés possibles en HEMS) ; fin de mission = « On Blocks » ou déconnexion.
  function analyse(s, now) {
    const prev = watch.last || {
      connected: false
    };
    const source = `${watch.network} ${watch.id}`;
    if (s.connected && !prev.connected) logLine(`${source} : connecté (${s.callsign})`);
    if (!s.connected) {
      if (prev.connected) {
        logLine(`${source} : déconnecté`);
        if (watch.flown) fill('engineStop', now, source);
      }
      watch.last = s;
      return;
    }
    let airborne;
    if (s.onGround === true || s.onGround === false) airborne = !s.onGround;
    else {
      if (s.gs < 5 && (watch.groundAlt == null || s.alt < watch.groundAlt)) watch.groundAlt = s.alt;
      airborne = watch.groundAlt != null ? (s.alt > watch.groundAlt + 150 || s.gs > 70) : s.gs > 70;
    }
    const moving = s.gs >= 3 || /Departing|Initial Climb|En Route|Approach/i.test(s.state);
    if (moving && !watch.moved) {
      watch.moved = true;
      logLine(`mise en route / roulage (${s.state || s.gs + ' kt'})`);
      fill('engineStart', now, source);
    }
    if (airborne && prev.airborne === false) {
      logLine('décollage');
      if (!watch.flown) fill('takeoff', now, source);
      watch.flown = true;
    }
    if (!airborne && prev.airborne === true) {
      logLine('atterrissage');
      fill('landing', now, source);
    }
    if (/On Blocks/i.test(s.state) && watch.flown && !/On Blocks/i.test(prev.state || '')) {
      logLine('sur cales (On Blocks)');
      fill('engineStop', now, source);
    }
    watch.last = {
      ...s,
      airborne
    };
  }

  /** Un relevé du flux public du réseau : analyse (mise en route, décollage, posés, fin), indicatif repris s'il manque, message d'état, puis relevé suivant dans POLL_MS (20 s). */
  async function poll() {
    if (!watch?.active) return;
    const now = new Date();
    try {
      const s = await sample(watch.network, watch.id, watch.callsign);
      analyse(s, now);
      if (s.connected && !value('callsign') && s.callsign) {
        field('callsign').value = s.callsign;
        field('callsign').dispatchEvent(new Event('change', {
          bubbles: true
        }));
      }
      status(s.connected ? t('active', {
        net: watch.network,
        id: watch.id,
        cs: s.callsign,
        state: s.state || (watch.last.airborne ? 'en vol' : 'au sol'),
        t: hhmm(now)
      }) : t('waiting', {
        net: watch.network,
        id: watch.id,
        t: hhmm(now)
      }));
    } catch (error) {
      status(t('feedError', {
        net: watch.network,
        err: error.message
      }));
    }
    save();
    paintLog();
    timer = setTimeout(poll, POLL_MS);
  }

  /** Démarre le suivi réseau (réseau et ID requis) : état initial, premier relevé immédiat. */
  function start() {
    const who = identity();
    if (!who.network || !who.id) {
      status(t('askId'));
      (field('ivaoId') || field('vatsimId'))?.focus();
      return;
    }
    watch = {
      active: true,
      network: who.network,
      id: who.id,
      callsign: who.callsign,
      startedAt: Date.now(),
      filled: {},
      log: []
    };
    if (field('onlineNetwork') && !value('onlineNetwork')) {
      field('onlineNetwork').value = who.network;
      field('onlineNetwork').dispatchEvent(new Event('change', {
        bubbles: true
      }));
    }
    const tracker = field('trackerUrl');
    if (tracker && !tracker.value) tracker.value = who.network === 'IVAO' ? HISTORY.ivaoTracker(who.id) : HISTORY.vatsimStats(who.id);
    logLine(`démarrage ${who.network} ${who.id}${who.callsign ? ' ' + who.callsign : ''}`);
    save();
    paint();
    clearTimeout(timer);
    resumed = true;
    poll();
  }

  /** Arrête le suivi réseau et le mémorise. */
  function stop() {
    clearTimeout(timer);
    if (watch) {
      watch.active = false;
      logLine('arrêt');
    }
    save();
    watch = null;
    save();
    paint();
    status(t('stopped'));
  }

  // --------------------------------------------------------- historique VATSIM
  function applyVatsimHistory(text, silent = false) {
    let data;
    try {
      data = JSON.parse(String(text).trim());
    } catch {
      if (!silent) status(t('noSession', {
        date: value('date'),
        cs: ''
      }));
      return false;
    }
    const sessions = (data?.items || data?.results || (Array.isArray(data) ? data : [])).filter(s => s && s.start);
    if (silent && !sessions.length) return false;
    const date = value('date'),
      callsign = value('callsign').toUpperCase().replace(/\s+/g, '');
    const utc = s => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z');
    const localDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let day = sessions.filter(s => Number(s.type ?? 1) === 1 && (!date || localDay(utc(s.start)) === date));
    if (callsign && day.some(s => String(s.callsign).toUpperCase() === callsign)) day = day.filter(s => String(s.callsign).toUpperCase() === callsign);
    if (!day.length) {
      status(t('noSession', {
        date: date || '—',
        cs: callsign ? ` (${callsign})` : ''
      }));
      return true;
    }
    const first = day.reduce((a, b) => utc(a.start) < utc(b.start) ? a : b),
      last = day.reduce((a, b) => utc(a.end || a.start) > utc(b.end || b.start) ? a : b);
    const source = `VATSIM ${value('vatsimId')}`,
      done = [];
    if (fill('engineStart', utc(first.start), source)) done.push(t('f_engineStart'));
    if (last.end && fill('engineStop', utc(last.end), source)) done.push(t('f_engineStop'));
    if (!callsign && first.callsign && field('callsign')) {
      field('callsign').value = first.callsign;
      field('callsign').dispatchEvent(new Event('change', {
        bubbles: true
      }));
    }
    if (field('onlineNetwork') && !value('onlineNetwork')) field('onlineNetwork').value = 'VATSIM';
    status(`${t('filled', { src: 'VATSIM', list: done.join(', ') || '—' })} ${t('approx')}`);
    const box = panel.querySelector('.nt-paste');
    if (box) {
      box.hidden = true;
      box.querySelector('textarea').value = '';
    }
    return true;
  }

  /** Historique VATSIM après le vol : ouvre les connexions du pilote dans un onglet (l'API n'autorise pas la lecture directe, CORS) ; au retour, le presse-papiers copié là-bas est lu. */
  function fetchVatsimHistory() {
    const cid = value('vatsimId');
    if (!cid) {
      status(t('askId'));
      field('vatsimId')?.focus();
      return;
    }
    // api.vatsim.net ne renvoie aucun en-tête CORS : une page tierce ne peut pas lire la
    // réponse. On ouvre l'historique (JSON) dans un onglet ; au retour sur cette page, le
    // presse-papiers est lu automatiquement (après Ctrl+A / Ctrl+C dans l'onglet).
    window.open(HISTORY.vatsimConnections(cid), '_blank', 'noopener');
    panel.querySelector('.nt-paste').hidden = false;
    status(t('corsBlocked'));
    awaitingClipboard = true;
  }
  // Presse-papiers : une lecture à la fois ; au retour sur la page, lecture seulement si
  // l'autorisation est déjà accordée (la demande de Chrome fait perdre / reprendre le focus :
  // une lecture automatique qui la déclencherait tournerait en boucle).
  let awaitingClipboard = false,
    clipBusy = false;
  /** Lit le presse-papiers (une lecture à la fois) et y cherche l'historique VATSIM copié ; silent : sans message d'erreur. */
  async function readClipboard(silent) {
    if (clipBusy) return;
    clipBusy = true;
    try {
      const text = await navigator.clipboard.readText();
      if (applyVatsimHistory(text, silent)) awaitingClipboard = false;
    } catch {
      if (!silent) status(t('clipDenied'));
    } finally {
      clipBusy = false;
    }
  }
  /** Vrai si la lecture du presse-papiers est déjà autorisée (évite une demande qui ferait perdre le focus en boucle). */
  const clipGranted = async () => {
    try {
      return (await navigator.permissions.query({
        name: 'clipboard-read'
      })).state === 'granted';
    } catch {
      return false;
    }
  };
  window.addEventListener('focus', async () => {
    if (awaitingClipboard && !clipBusy && await clipGranted()) readClipboard(true);
  });

  // ------------------------------------------------------------------------ UI
  const panel = document.createElement('div');
  panel.id = 'networkTrackerPanel';
  panel.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px dashed var(--line,#d1d5db)';
  // Mode compact (barre d'outils de l'en-tête des pages du Core) : boutons seuls, mode
  // d'emploi en infobulle (survol du « ? » et du bouton principal).
  const compact = () => panel.parentElement?.id === 'mc-header-tracker';

  /** Rafraîchit le panneau de suivi : bouton démarrer / arrêter, champs, aide. */
  function paint() {
    const on = !!watch?.active;
    if (compact()) {
      panel.style.cssText = '';
      panel.innerHTML = `<div class="nt-row"><span class="mc-header-label">${esc(t('title'))}</span><span class="nt-help" title="${esc(t('intro'))}">?</span>
        <button type="button" class="${on ? 'danger' : ''} nt-toggle" title="${esc(t('intro'))}">${esc(t(on ? 'stop' : 'start'))}</button>
        <button type="button" class="nt-history" title="${esc(t('corsBlocked'))}">${esc(t('history'))}</button>
        <a class="nt-link" data-kind="ivao" target="_blank" rel="noopener">${esc(t('ivao'))}</a>
        <a class="nt-link" data-kind="vatsim" target="_blank" rel="noopener">${esc(t('vatsimStats'))}</a>
        <a class="nt-link" data-kind="statsim" target="_blank" rel="noopener">${esc(t('statsim'))}</a>
        <span class="nt-status"></span></div>
        <div class="nt-paste" hidden><label class="small">${esc(t('paste'))}</label><br><textarea rows="3"></textarea><div class="nt-row"><button type="button" class="primary nt-clip">${esc(t('clip'))}</button><button type="button" class="nt-parse">${esc(t('parse'))}</button></div></div>
        <details class="nt-logbox"${watch?.log?.length ? '' : ' hidden'}><summary>${esc(t('log'))}</summary><pre class="nt-log" style="white-space:pre-wrap;margin:4px 0 0"></pre></details>`;
      bind();
      return;
    }
    panel.innerHTML = `<h3 style="margin:0 0 6px;font-size:15px">${esc(t('title'))}</h3><p class="small">${esc(t('intro'))}</p>
      <div class="row" style="margin-top:8px"><button type="button" class="${on ? 'danger' : 'primary'} nt-toggle">${esc(t(on ? 'stop' : 'start'))}</button>
      <button type="button" class="secondary nt-history">${esc(t('history'))}</button>
      <a class="secondary nt-link" data-kind="ivao" target="_blank" rel="noopener">${esc(t('ivao'))}</a>
      <a class="secondary nt-link" data-kind="vatsim" target="_blank" rel="noopener">${esc(t('vatsimStats'))}</a>
      <a class="secondary nt-link" data-kind="statsim" target="_blank" rel="noopener">${esc(t('statsim'))}</a></div>
      <div class="nt-paste" hidden style="margin-top:8px"><label>${esc(t('paste'))}</label><textarea rows="4" style="width:100%"></textarea><div class="row" style="margin-top:6px"><button type="button" class="primary nt-clip">${esc(t('clip'))}</button><button type="button" class="secondary nt-parse">${esc(t('parse'))}</button></div></div>
      <p class="small nt-status" style="margin-top:8px"></p><details class="nt-logbox"${watch?.log?.length ? '' : ' hidden'}><summary class="small">${esc(t('log'))}</summary><pre class="small nt-log" style="white-space:pre-wrap;margin:6px 0 0"></pre></details>`;
    panel.querySelectorAll('.nt-link').forEach(link => link.style.cssText = 'display:inline-block;padding:9px 12px;border-radius:9px;text-decoration:none;color:inherit');
    bind();
  }

  /** Branche les boutons du panneau (suivi, historique VATSIM, copier-coller). */
  function bind() {
    panel.querySelector('.nt-toggle').onclick = () => (watch?.active ? stop() : start());
    panel.querySelector('.nt-history').onclick = fetchVatsimHistory;
    panel.querySelector('.nt-parse').onclick = () => applyVatsimHistory(panel.querySelector('.nt-paste textarea').value);
    // Zone de copier-coller : « × », « Fermer », bouton désactivé si vide (framework FileAccess).
    const box = panel.querySelector('.nt-paste'),
      attach = () => window.FileAccess?.pastePanel({
        root: box,
        area: box.querySelector('textarea'),
        run: box.querySelector('.nt-parse'),
        close: () => {
          box.hidden = true;
        },
        runLabel: () => t('parse')
      });
    if (window.FileAccess) attach();
    else window.addEventListener('load', attach, {
      once: true
    });
    panel.querySelector('.nt-clip').onclick = () => readClipboard(false);
    // Ctrl+V dans la zone : analyse immédiate.
    panel.querySelector('.nt-paste textarea').addEventListener('paste', event => setTimeout(() => applyVatsimHistory(event.target.value)));
    panel.querySelectorAll('.nt-link').forEach(link => link.onclick = event => {
      const kind = link.dataset.kind,
        id = kind === 'ivao' ? value('ivaoId') : value('vatsimId');
      if (!id) {
        event.preventDefault();
        status(t('askId'));
        return;
      }
      link.href = kind === 'ivao' ? HISTORY.ivaoTracker(id) : kind === 'vatsim' ? HISTORY.vatsimStats(id) : HISTORY.statsimFlights(id);
    });
    paintLog();
  }

  /** Message d'état du panneau de suivi. */
  function status(text) {
    const el = panel.querySelector('.nt-status');
    if (el) el.textContent = text;
  }

  /** Affiche le journal du suivi (dernières lignes). */
  function paintLog() {
    const box = panel.querySelector('.nt-logbox'),
      pre = panel.querySelector('.nt-log');
    if (!box || !pre) return;
    box.hidden = !watch?.log?.length;
    pre.textContent = (watch?.log || []).join('\n');
  }

  let resumed = false;

  /** Rattache le panneau de suivi à la page (en-tête du Core ou section du CR historique) ; vrai si rattaché. */
  function mount() {
    if (panel.isConnected) return true;
    // Hôtes : section des anciens CR, barre d'outils de l'en-tête (Core), bloc « Trace réseau ».
    const host = document.getElementById('networkTracking') || document.getElementById('mc-header-tracker') || document.getElementById('mc-network');
    if (!host) return false;
    host.append(panel);
    paint();
    // Reprise du suivi une seule fois (la section peut être recréée par la page).
    if (watch?.active && !resumed) {
      resumed = true;
      status(t('resumed'));
      poll();
    }
    return true;
  }
  // Section « Trace réseau » : créée par mission_extensions.js (CR HEMS / FIRE, chargé
  // dynamiquement) ou par le Mission Report Core, qui peut la recréer (re-rendu) : le
  // panneau est rattaché à chaque fois.
  const tryMount = () => {
    mount();
    new MutationObserver(() => {
      if (!panel.isConnected) mount();
    }).observe(form, {
      childList: true,
      subtree: true
    });
  };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
  window.addEventListener('repository-language-change', () => {
    if (panel.isConnected) paint();
  });
  // Quitter la page arrête le suivi : avertissement tant qu'il est actif.
  window.addEventListener('beforeunload', event => {
    if (watch?.active) {
      event.preventDefault();
      event.returnValue = t('leave');
    }
  });

  window.NetworkTracker = {
    start,
    stop,
    applyVatsimHistory,
    pollNow() {
      clearTimeout(timer);
      return poll();
    },
    get state() {
      return watch;
    }
  };
})();
