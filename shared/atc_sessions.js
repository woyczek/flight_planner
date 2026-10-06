(() => {
  'use strict';
  // Sessions ATC des réseaux (VATSIM, IVAO) : trainings, examens, événements, réservations de positions, par semaine ISO.
  //   · fichier du pool synchronisé data/atc/<AAAA>-W<nn>.json (MissionAssignments.readData / writeData : même chemin
  //     de lecture et d'écriture que les disponibilités) { schema: 1, va, semaine, updated_at, sessions: [{ id, date
  //     "AAAA-MM-JJ", debut "HH:MM", fin "HH:MM" (UTC), position "LFBO_APP", reseau "VATSIM" | "IVAO", type "training" |
  //     "examen" | "evenement" | "reservation", texte, source "manuel" | "vatsim" }] } ;
  //   · saisie à la main (Planning ODV) ; VATSIM récupéré par le lanceur (tools/launch.py, /__setup/vatsim-bookings :
  //     l'API publique n'autorise pas la lecture directe depuis une page), positions de France métropolitaine ; IVAO :
  //     API sous authentification, saisie à la main.
  // API (window.SuiteAtc) : TYPES, NETWORKS, typeLabel(type), weekId(ms), read(semaine, { fresh }), save(semaine,
  //   sessions), fetchVatsim(semaine), franceMetro(position), toPlan(sessions, dates, heures des créneaux).
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
  /** Position de France métropolitaine : indicatif LFxx (hors Saint-Pierre-et-Miquelon, LFV…), suffixe de position. */
  const franceMetro = pos => /^LF(?!V)[A-Z]{2}(_[A-Z0-9]+)*_(DEL|GND|TWR|APP|DEP|CTR|FSS|RMP|ATIS)$/.test(String(pos || '').toUpperCase());

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
  /** Réservations VATSIM de France métropolitaine tombant dans la semaine (par le lanceur). */
  async function fetchVatsim(week) {
    let r;
    try {
      r = await (await fetch(new URL('__setup/vatsim-bookings', ROOT).href, {
        headers: {
          'X-SOG-Setup': '1'
        },
        cache: 'no-store'
      })).json();
    } catch {
      throw new Error(t(['Récupération impossible : la suite doit être ouverte par son lanceur (tools/launch.py, relancé depuis cette version).', 'Cannot fetch: the suite must be opened through its launcher (tools/launch.py, restarted since this version).', 'Abruf nicht möglich: Die Suite muss über ihren Starter geöffnet werden (tools/launch.py, seit dieser Version neu gestartet).', 'No se puede recuperar: la suite debe abrirse con su lanzador (tools/launch.py, reiniciado desde esta versión).']));
    }
    if (!Array.isArray(r?.bookings)) throw new Error(tf(['VATSIM injoignable : {e}', 'VATSIM unreachable: {e}', 'VATSIM nicht erreichbar: {e}', 'VATSIM inaccesible: {e}'], {
      e: r?.error || '?'
    }));
    return r.bookings.filter(b => franceMetro(b.callsign)).map(b => {
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
    }) => {
      const d = new Date(s),
        f = new Date(e),
        sameDay = f.toISOString().slice(0, 10) === d.toISOString().slice(0, 10);
      return {
        id: `vatsim-${b.id}`,
        date: d.toISOString().slice(0, 10),
        debut: d.toISOString().slice(11, 16),
        fin: sameDay ? f.toISOString().slice(11, 16) : '24:00',
        position: String(b.callsign).toUpperCase(),
        reseau: 'VATSIM',
        type: VATSIM_TYPE[b.type] || 'reservation',
        texte: '',
        source: 'vatsim'
      };
    });
  }
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
          source: s.source === 'vatsim' ? 'VATSIM' : 'manuel',
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
    franceMetro,
    toPlan
  };
})();
