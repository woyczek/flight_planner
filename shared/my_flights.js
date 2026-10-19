/* Mes vols — sources de vols du pilote, partagées par la page « Mes vols » et le compte rendu (« Préremplir ›
 * Nouveau CR depuis… »). Chaque source rend des vols { source, date, time, callsign, type, reg, dep, arr, block,
 * mission, family, crUrl, crId, notes, log } ; collect() les fusionne (un vol couvert par un CR n'est gardé qu'une
 * fois, le CR). Sources de base : 'cr' (registre des CR, il faut shared/mission_core/ledger.js) et 'log' (journal des
 * vols de la compagnie, il faut shared/mission_core/defa_log.js). */
(() => {
  'use strict';
  if (window.MyFlights) return;
  const PROFILE = 'missionReportingConfig:v1'; // profil pilote : trigramme
  /** Lit un JSON du stockage local (socle commun s'il est chargé). */
  const json = (k, d) => {
    if (window.RepositoryKit?.store?.json) return window.RepositoryKit.store.json(k, d);
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d
    } catch {
      return d
    }
  };
  /** Racine de la suite (bandeau commun, sinon deux dossiers au-dessus de la page). */
  const root = () => window.RepositoryNav?.root || new URL('../../', location.href).href;
  /** Trigramme du pilote (socle des affectations, sinon profil pilote) ; vide s'il n'est pas réglé. */
  const trigram = () => String(window.MissionAssignments?.trigram?.() || json(PROFILE, {})?.trigram || '').trim().toUpperCase();
  const up = v => String(v ?? '').trim().toUpperCase();
  /** Clé de rapprochement d'un vol : date, indicatif et immatriculation sans séparateurs. */
  const keyOf = f => [f.date, up(f.callsign).replace(/[^A-Z0-9]/g, ''), up(f.reg).replace(/[^A-Z0-9]/g, '')].join('|');

  const SOURCES = [];
  /** Comptes rendus du registre (toutes familles) rédigés par le pilote (sans auteur noté : gardés) ; lien ?edit= vers
   *  la page de CR de la famille (rang parmi les CR de la même famille). */
  SOURCES.push(['cr', async () => {
    const L = window.MissionLedger,
      M = window.MissionModel;
    if (!L) return [];
    await L.load().catch(() => null);
    const all = L.store?.missions || [],
      tri = trigram(),
      fams = window.MissionVocab?.families || [];
    return all.map((m, i) => ({
      m,
      index: all.slice(0, i).filter(x => x.family === m.family).length
    })).filter(({
      m
    }) => !tri || !m.metadata?.reportedBy || up(m.metadata.reportedBy) === tri).map(({
      m,
      index
    }) => {
      const a = (m.aircraft || [])[0] || {},
        tl = m.timeline || {},
        nav = m.navigation || {},
        st = M?.computeStatistics?.(m) || {},
        fam = fams.find(f => f.id === m.family);
      return {
        source: 'cr',
        date: String(m.metadata?.date || ''),
        time: tl.offBlock || tl.takeoff || m.metadata?.timeUtc || '',
        callsign: up(a.callsign || [a.callsignPrefix, a.callsignNumber].filter(Boolean).join(' ')),
        type: up(a.type),
        reg: up(a.registration),
        dep: up(nav.dep || a.baseDeparture),
        arr: up(a.landingAd || nav.arr || a.baseReturn),
        block: st.blockMinutes ?? st.flightMinutes ?? null,
        mission: [m.family, m.subtype, m.metadata?.operationName].filter(Boolean).join(' · '),
        family: m.family,
        crId: m.metadata?.missionId || '',
        crUrl: fam ? `${new URL(`apps/cr/${fam.cr}`, root()).href}?edit=${index}&id=${encodeURIComponent(m.metadata?.missionId || '')}` : '',
        notes: [m.results?.detail, m.results?.incidents].filter(Boolean).join(' · ')
      }
    })
  }]);
  /** Journal des vols de la compagnie importé du site (ce navigateur), filtré sur le trigramme du pilote. */
  SOURCES.push(['log', async () => {
    const D = window.DefaFlightLog,
      tri = trigram();
    if (!D || !tri) return [];
    return D.records().filter(r => up(r.trigram) === tri).map(r => ({
      source: 'log',
      date: r.date,
      time: r.time,
      callsign: up(r.callsign),
      type: up(r.type),
      reg: up(r.registration),
      dep: up(r.dep),
      arr: up(r.arr),
      block: Number.isFinite(r.durationMin) ? r.durationMin : null,
      mission: up(r.mission),
      family: D.familyOf(r),
      crId: '',
      crUrl: '',
      notes: '',
      log: r
    }))
  }]);

  let flights = []; // vols fusionnés, du plus récent au plus ancien
  /** Lit toutes les sources et fusionne : un vol déjà couvert par un CR (même clé) n'est gardé qu'une fois, le CR. */
  async function collect() {
    const lists = await Promise.all(SOURCES.map(([, fn]) => fn().catch(() => [])));
    const out = new Map();
    for (const list of lists)
      for (const f of list) {
        if (!f.date) continue;
        const k = keyOf(f),
          had = out.get(k);
        if (!had || (had.source !== 'cr' && f.source === 'cr')) out.set(k, f)
      }
    flights = [...out.values()].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    return flights
  }

  /** Ouvre le CR prérempli par un vol sans CR : même passerelle que l'ordre de mission (siaMissionToCr:v1, ?from=sia)
   *  — titre, appareil, indicatif, immatriculation, départ et arrivée, date et durée du vol (__flight). */
  function writeReport(f) {
    const fams = window.MissionVocab?.families || [],
      fam = fams.find(x => x.id === f.family) || fams.find(x => x.id === 'SPECIAL');
    if (!fam) return false;
    localStorage.setItem('siaMissionToCr:v1', JSON.stringify({
      title: f.mission || '',
      origin: f.dep ? {
        name: `(${f.dep})`
      } : null,
      destination: f.arr ? {
        name: `(${f.arr})`
      } : null,
      aircraft: [{
        type: f.type,
        callsign: f.callsign,
        registration: f.reg
      }],
      __flight: {
        date: f.date,
        time: f.time,
        blockMinutes: f.block
      }
    }));
    location.href = `${new URL(`apps/cr/${fam.cr}`, root()).href}?from=sia`;
    return true
  }

  window.MyFlights = {
    PROFILE,
    root,
    trigram,
    keyOf,
    collect,
    writeReport,
    /** Ajoute une source de vols (nom, fonction asynchrone rendant des vols au format ci-dessus) ; la page « Mes vols »
     *  relit ses vols (événement my-flights-sources). */
    addSource(name, fn) {
      SOURCES.push([name, fn]);
      window.dispatchEvent(new CustomEvent('my-flights-sources', {
        detail: {
          name
        }
      }))
    },
    /** Vols du dernier collect(), du plus récent au plus ancien. */
    get flights() {
      return flights
    },
    /** Les n vols les plus récents sans CR (journal de la compagnie et sources ajoutées). */
    async withoutReport(n = 7) {
      return (await collect()).filter(f => f.source !== 'cr').slice(0, n)
    }
  };
})();
