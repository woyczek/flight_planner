(() => {
  'use strict';
  // Sessions ATC des réseaux (VATSIM, IVAO) : trainings, examens, événements, réservations de positions, par semaine ISO.
  //   · fichier du pool synchronisé data/atc/<AAAA>-W<nn>.json (MissionAssignments.readData / writeData : même chemin
  //     de lecture et d'écriture que les disponibilités) { schema: 1, va, semaine, updated_at, sessions: [{ id, date
  //     "AAAA-MM-JJ", debut "HH:MM", fin "HH:MM" (UTC), position "LFBO_APP", reseau "VATSIM" | "IVAO", type "training" |
  //     "examen" | "evenement" | "reservation", texte, source "manuel" | "vatsim" | "ivao" }] } ;
  //   · saisie à la main (Planning ODV) ; réservations récupérées par le lanceur, positions du périmètre :
  //     VATSIM (/__setup/vatsim-bookings : l'API publique n'autorise pas la lecture directe depuis une page), IVAO
  //     (/__setup/ivao-bookings : API sous clé, Paramètres › Installation ; trainings, examens et réservations) ;
  //   · un seul import par réseau pour toutes les pages (Planning ODV, Tableau) : importNetwork lit le fichier,
  //     remplace les sessions déjà récupérées de ce réseau (annulations comprises), garde les saisies, enregistre.
  // API (window.SuiteAtc) : TYPES, NETWORKS, typeLabel(type), weekId(ms), read(semaine, { fresh }), save(semaine,
  //   sessions), fetchVatsim(semaine), fetchIvao(semaine), importNetwork(semaine, "VATSIM" | "IVAO") → { sessions,
  //   n, where } ou { error }, autoImport(semaine, réseau, { everyMs = 1 h }) → idem, ou { skipped } si un import de
  //   cette semaine et de ce réseau a été tenté depuis moins d'everyMs dans ce navigateur (échec compris : pas de
  //   relance à chaque ouverture sans clé), PREFIXES, countries() → [{ id, name }], perimeter() → { pays, p, x,
  //   label }, inPerimeter(position, périmètre = perimeter()), franceMetro(position), toPlan(sessions, dates, heures).
  // Périmètre des sessions ATC : pays préféré (Paramètres › Centre › Planning ODV, réglage « pays » d'OdvSettings,
  //   localStorage odvPlanning:v1 ; France par défaut). Un pays = préfixes OACI des indicatifs de terrain (p) moins des
  //   exclusions (x) ; une position « LFBO_APP », « EDGG_CTR » en fait partie si son indicatif (4 caractères) y tombe.
  if (window.SuiteAtc) return;
  const K = window.RepositoryKit;
  const A = () => window.MissionAssignments;
  const t = a => K?.t ? K.t(a) : a[0];
  const tf = (a, v) => K?.tf ? K.tf(a, v) : a[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const TYPES = {
    training: ['Training', 'Training', 'Training', 'Entrenamiento'],
    examen: ['Examen', 'Exam', 'Prüfung', 'Examen'],
    evenement: ['Événement', 'Event', 'Veranstaltung', 'Evento'],
    reservation: ['Réservation', 'Booking', 'Buchung', 'Reserva']
  };
  const NETWORKS = ['VATSIM', 'IVAO'];
  const VATSIM_TYPE = {
    training: 'training',
    exam: 'examen',
    event: 'evenement',
    booking: 'reservation'
  };
  /** Type d'une réservation IVAO (champ training : « training », « exam »… ou null). */
  const ivaoType = v => /exam/i.test(String(v || '')) ? 'examen' : v ? 'training' : 'reservation';
  /** Source des sessions récupérées d'un réseau. */
  const SOURCE = {
    VATSIM: 'vatsim',
    IVAO: 'ivao'
  };
  const fileOf = week => `atc/${week}.json`;
  const ROOT = new URL('../', document.currentScript?.src || location.href).href; // racine de la suite (lanceur)
  const pad = n => String(n).padStart(2, '0');

  /** Semaine ISO (« 2026-W41 ») d'un instant UTC. */
  function weekId(ms) {
    if (window.SuiteDispos?.weekId) return window.SuiteDispos.weekId(ms);
    const d = new Date(ms),
      thu = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7 + 3),
      y = new Date(thu).getUTCFullYear();
    return `${y}-W${pad(1 + Math.floor((thu - Date.UTC(y, 0, 1)) / 6048e5))}`;
  }
  /** Préfixes OACI des indicatifs de terrain par pays (code ISO des zones, shared/aero_zones.js) : table de départ ; un
   *  pays absent n'est pas proposé. France : métropole et Corse (LF), sans Saint-Pierre-et-Miquelon (LFV…). */
  const PREFIXES = {
    fr: {
      p: ['LF'],
      x: ['LFV']
    },
    be: {
      p: ['EB']
    },
    nl: {
      p: ['EH']
    },
    lu: {
      p: ['EL']
    },
    de: {
      p: ['ED', 'ET']
    },
    ch: {
      p: ['LS']
    },
    at: {
      p: ['LO']
    },
    it: {
      p: ['LI']
    },
    es: {
      p: ['LE', 'GC', 'GE']
    },
    pt: {
      p: ['LP']
    },
    gb: {
      p: ['EG']
    },
    ie: {
      p: ['EI']
    },
    dk: {
      p: ['EK']
    },
    no: {
      p: ['EN']
    },
    se: {
      p: ['ES']
    },
    fi: {
      p: ['EF']
    },
    is: {
      p: ['BI']
    },
    pl: {
      p: ['EP']
    },
    cz: {
      p: ['LK']
    },
    sk: {
      p: ['LZ']
    },
    hu: {
      p: ['LH']
    },
    si: {
      p: ['LJ']
    },
    hr: {
      p: ['LD']
    },
    gr: {
      p: ['LG']
    },
    bg: {
      p: ['LB']
    },
    ro: {
      p: ['LR']
    },
    lt: {
      p: ['EY']
    },
    lv: {
      p: ['EV']
    },
    ee: {
      p: ['EE']
    },
    tr: {
      p: ['LT']
    },
    cy: {
      p: ['LC']
    },
    mt: {
      p: ['LM']
    },
    ma: {
      p: ['GM']
    },
    tn: {
      p: ['DT']
    },
    dz: {
      p: ['DA']
    },
    il: {
      p: ['LL']
    },
    us: {
      p: ['K', 'PA', 'PH']
    },
    ca: {
      p: ['C']
    },
    au: {
      p: ['Y']
    },
    nz: {
      p: ['NZ']
    },
    jp: {
      p: ['RJ', 'RO']
    },
    br: {
      p: ['SB', 'SD', 'SI', 'SJ', 'SN', 'SS', 'SW']
    },
    mx: {
      p: ['MM']
    },
    za: {
      p: ['FA']
    }
  };
  const LANG = ['fr', 'en', 'de', 'es'];
  /** Nom d'un pays dans la langue de la page (contours des zones, sinon Intl) ; France : la métropole. */
  function countryName(id) {
    if (id === 'fr') return t(['France métropolitaine', 'metropolitan France', 'Frankreich (Mutterland)', 'Francia metropolitana']);
    const i = K?.langIndex?.() ?? 0;
    const n = window.AERO_ZONES_GEO?.[id]?.n?.[i];
    if (n) return n;
    try {
      return new Intl.DisplayNames([LANG[i] || 'fr'], {
        type: 'region'
      }).of(id.toUpperCase());
    } catch {
      return id.toUpperCase();
    }
  }
  /** Pays proposés pour le périmètre, triés par nom. */
  const countries = () => Object.keys(PREFIXES).map(id => ({
    id,
    name: countryName(id)
  })).sort((a, b) => a.name.localeCompare(b.name));
  /** Périmètre réglé : pays préféré du Planning ODV (France par défaut). */
  function perimeter() {
    let pays = '';
    try {
      pays = window.OdvSettings?.load?.().pays || JSON.parse(localStorage.getItem('odvPlanning:v1') || '{}')?.pays || '';
    } catch {}
    if (!PREFIXES[pays]) pays = 'fr';
    return {
      pays,
      p: PREFIXES[pays].p,
      x: PREFIXES[pays].x || [],
      label: countryName(pays)
    };
  }
  /** Position ATC dans le périmètre : indicatif OACI (4 caractères) d'un préfixe du pays, hors exclusions, suffixe de
   *  position (DEL, GND, TWR, APP, DEP, CTR, FSS, RMP, ATIS). */
  function inPerimeter(pos, per = perimeter()) {
    const m = /^([A-Z0-9]{4})(_[A-Z0-9]+)*_(DEL|GND|TWR|APP|DEP|CTR|FSS|RMP|ATIS)$/.exec(String(pos || '').toUpperCase());
    return !!m && per.p.some(p => m[1].startsWith(p)) && !per.x.some(x => m[1].startsWith(x));
  }
  /** Position de France métropolitaine (ancien nom, gardé) : périmètre France. */
  const franceMetro = pos => inPerimeter(pos, {
    p: PREFIXES.fr.p,
    x: PREFIXES.fr.x
  });

  /** Sessions ATC enregistrées de la semaine (fichier atc/<semaine>.json du pool) ; [] si absent ou illisible.
   *  fresh : relecture sans cache. */
  async function read(week, {
    fresh = false
  } = {}) {
    const d = await A()?.readData?.(fileOf(week), {
      fresh
    }).catch(() => null);
    return Array.isArray(d?.sessions) ? d.sessions : [];
  }
  /** Enregistre les sessions de la semaine ; retour de writeData ({ where: 'folder' | 'local', error }). */
  function save(week, sessions) {
    const list = [...sessions].sort((a, b) => `${a.date} ${a.debut} ${a.position}`.localeCompare(`${b.date} ${b.debut} ${b.position}`));
    return A().writeData(fileOf(week), {
      schema: 1,
      va: window.RepositoryNav?.va?.().short || 'SOG',
      semaine: week,
      updated_at: new Date().toISOString(),
      by: window.SuiteUsers?.by?.() || '',
      sessions: list
    });
  }
  /** Route du lanceur (JSON) ; erreur claire si la suite n'est pas ouverte par lui. */
  async function launcher(path) {
    try {
      return await (await fetch(new URL(path, ROOT).href, {
        headers: {
          'X-SOG-Setup': '1'
        },
        cache: 'no-store'
      })).json();
    } catch {
      throw new Error(t([
        'Récupération impossible : la suite doit être ouverte par son lanceur (tools/launch.py, relancé depuis cette version).',
        'Cannot fetch: the suite must be opened through its launcher (tools/launch.py, restarted since this version).',
        'Abruf nicht möglich: Die Suite muss über ihren Starter geöffnet werden (tools/launch.py, seit dieser Version neu gestartet).',
        'No se puede recuperar: la suite debe abrirse con su lanzador (tools/launch.py, reiniciado desde esta versión).'
      ]));
    }
  }
  /** Lundi (ms, UTC) d'une semaine ISO « AAAA-Www ». */
  function monday(week) {
    if (window.SuiteDispos?.weekMonday) return window.SuiteDispos.weekMonday(week);
    const m = /^(\d{4})-W(\d{2})$/.exec(String(week || ''));
    if (!m) return NaN;
    const jan4 = Date.UTC(+m[1], 0, 4);
    return jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * 864e5 + (+m[2] - 1) * 6048e5;
  }
  /** Session d'une réservation (début et fin en ms UTC) ; fin coupée à minuit le jour du début. */
  function sessionOf(id, s, e, position, reseau, type, source) {
    const d = new Date(s),
      f = new Date(e),
      sameDay = !isNaN(e) && f.toISOString().slice(0, 10) === d.toISOString().slice(0, 10);
    return {
      id,
      date: d.toISOString().slice(0, 10),
      debut: d.toISOString().slice(11, 16),
      fin: sameDay ? f.toISOString().slice(11, 16) : '24:00',
      position: String(position).toUpperCase(),
      reseau,
      type,
      texte: '',
      source
    };
  }
  /** Réservations VATSIM du périmètre tombant dans la semaine (par le lanceur). */
  async function fetchVatsim(week) {
    const per = perimeter();
    const r = await launcher('__setup/vatsim-bookings');
    if (!Array.isArray(r?.bookings)) throw new Error(tf(['VATSIM injoignable : {e}', 'VATSIM unreachable: {e}',
      'VATSIM nicht erreichbar: {e}', 'VATSIM inaccesible: {e}'
    ], {
      e: r?.error || '?'
    }));
    return r.bookings.filter(b => inPerimeter(b.callsign, per)).map(b => {
      const s = Date.parse(`${String(b.start).replace(' ', 'T')}Z`),
        e = Date.parse(`${String(b.end).replace(' ', 'T')}Z`);
      return {
        b,
        s,
        e
      };
    }).filter(x => !isNaN(x.s) && weekId(x.s) === week).map(({
      b,
      s,
      e
    }) => sessionOf(`vatsim-${b.id}`, s, e, b.callsign, 'VATSIM', VATSIM_TYPE[b.type] || 'reservation', 'vatsim'));
  }
  /** Réservations IVAO du périmètre de la semaine (trainings, examens, réservations ; par le lanceur, clé d'API IVAO de
   *  l'installation ; préfixes du pays transmis pour le premier tri). */
  async function fetchIvao(week) {
    const m0 = monday(week);
    if (isNaN(m0)) return [];
    const per = perimeter();
    const day = ms => new Date(ms).toISOString().slice(0, 10);
    const r = await launcher(`__setup/ivao-bookings?from=${day(m0)}&to=${day(m0 + 6 * 864e5)}&pre=${per.p.join(',')}`);
    if (!Array.isArray(r?.bookings)) throw new Error(tf(['IVAO injoignable : {e}', 'IVAO unreachable: {e}',
      'IVAO nicht erreichbar: {e}', 'IVAO inaccesible: {e}'
    ], {
      e: r?.error || '?'
    }));
    const seen = new Set();
    return r.bookings.filter(b => inPerimeter(b.atcPosition, per) && !seen.has(b.id) && seen.add(b.id)).map(b => ({
      b,
      s: Date.parse(b.startDate),
      e: Date.parse(b.endDate)
    })).filter(x => !isNaN(x.s) && weekId(x.s) === week).map(({
      b,
      s,
      e
    }) => sessionOf(`ivao-${b.id}`, s, e, b.atcPosition, 'IVAO', ivaoType(b.training), 'ivao'));
  }
  /** Import d'un réseau dans le fichier de la semaine, commun aux pages : sessions déjà récupérées de ce réseau
   *  remplacées (annulations comprises), saisies gardées ; { sessions, n, where } ou { error } (réseau injoignable). */
  async function importNetwork(week, reseau) {
    const src = SOURCE[reseau];
    if (!src) return {
      error: String(reseau)
    };
    try {
      const got = await (reseau === 'IVAO' ? fetchIvao(week) : fetchVatsim(week));
      const keep = (await read(week, {
        fresh: true
      })).filter(x => x.source !== src);
      const sessions = [...keep, ...got];
      // gardé dans ce navigateur (where « local ») : enregistré quand même, alerte et raison données par writeData
      const w = await save(week, sessions);
      return {
        sessions,
        n: got.length,
        where: w?.where
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  /** Import automatique d'un réseau (ouverture d'une semaine) : au plus une tentative par période, semaine et réseau,
   *  notée dans ce navigateur ; à n'appeler que si la page peut écrire. Sans alerte : l'appelant décide. */
  async function autoImport(week, reseau = 'IVAO', {
    everyMs = 36e5
  } = {}) {
    const key = `suiteAtcAuto:${reseau}:${week}`;
    let last = 0;
    try {
      last = +localStorage.getItem(key) || 0;
    } catch {}
    if (Date.now() - last < everyMs) return {
      skipped: true
    };
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {}
    return importNetwork(week, reseau);
  }
  /** Heure « HH:MM » en heures décimales (« 14:30 » → 14,5) ; vide ou illisible → 0. */
  const hours = hm => {
    const [h, m] = String(hm || '0:0').split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
  };
  /** Sessions de la semaine pour le calcul des créneaux (apps/cpco/odv_core.js, plan) : trainings et examens dans la
   *  frise (texte « TRAINING LFBO_APP » : CTR du terrain à éviter), événements et réservations en événements des
   *  créneaux qu'ils touchent (★, contexte). */
  function toPlan(sessions, dates, slotHours) {
    const frise = [],
      evenements = [];
    for (const s of sessions) {
      const j = dates.indexOf(s.date);
      if (j < 0) continue;
      const h0 = hours(s.debut),
        h1 = Math.max(h0, hours(s.fin) || 24);
      if (s.type === 'training' || s.type === 'examen') frise.push({
        jourIndex: j,
        date: s.date,
        h_debut: h0,
        h_fin: h1,
        debut: s.debut,
        fin: s.fin,
        texte: `${s.type === 'examen' ? 'EXAMEN' : 'TRAINING'} ${s.position} (${s.reseau})${s.texte ? ` ${s.texte}` : ''}`,
        couloir: 'atc'
      });
      else(slotHours || []).forEach(([a, b], k) => {
        if (h0 < b && h1 > a) evenements.push({
          groupe: `${s.reseau} ${s.position}`,
          jourIndex: j,
          date: s.date,
          creneauIndex: k,
          couleur: null,
          commentaire: `${t(TYPES[s.type] || TYPES.reservation)} ${s.debut}-${s.fin}z${s.texte ? ` — ${s.texte}` : ''}`,
          source: SOURCE[s.reseau] === s.source ? s.reseau : 'manuel',
          recurrent: false
        });
      });
    }
    return {
      frise,
      evenements
    };
  }
  window.SuiteAtc = {
    TYPES,
    NETWORKS,
    typeLabel: type => t(TYPES[type] || TYPES.reservation),
    weekId,
    read,
    save,
    fetchVatsim,
    fetchIvao,
    importNetwork,
    autoImport,
    PREFIXES,
    countries,
    perimeter,
    inPerimeter,
    franceMetro,
    toPlan
  };
})();
