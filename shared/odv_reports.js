(() => {
  'use strict';
  // Tableau (ODV) : lien entre les plaquettes de vol, le registre des missions et les CR (lot L5).
  // Missions ravitailleur liées à une mission (plaquette AAR = vol d'une mission tanker du registre) :
  //   tankersFor(id) → [{ id, title, type, callsigns, aircraftTypes, track, folder, lien: "operation" | "axe" }]
  //     · « operation » : mission de la même opération (même préfixe A-001 de A-001A, ou operation.id) au rôle tanker
  //       (air_refueling.role, registre : aarRole) ; une mission AAR de l'opération sans rôle connu (registre lu avant
  //       ce champ : relire le dossier des missions) compte aussi ;
  //     · « axe » : autre mission tanker sur le même axe (air_refueling.track), d'une autre opération.
  //   receiversFor(id) → même forme, missions receveuses de l'opération d'une mission tanker.
  // CR → plaquette (le CR fait foi : mission → ordre de vol → exécution → CR) :
  //   etatFromLedger(vol, { delaiH = 48, now, reports }) → { etat, cr, partiel, causes, motif, crId, outcome, source }
  //   ou null (rien à changer) :
  //     · CR de la mission du vol (n° CR<mission>-<n>, même date que le vol si le CR en porte une ; le plus récent) :
  //       SUCCESS → ME (fait) ; PARTIAL_SUCCESS → MNE partielle (fait, partiel) ; CANCELLED → BACHE (annulé) ;
  //       autres résultats (ABORTED, DIVERTED, WEATHER…) → MNE (non fait) ; causes : cases « Causes » du CR
  //       (results.causes, MissionVocab.mneCauses), sinon celle que porte le résultat (WEATHER, TECHNICAL,
  //       OPERATIONAL), sinon OTHER ; motif : motif d'interruption du CR ; source « cr » ;
  //     · sans CR, delaiH heures après la fin du vol (date + debut + duree, UTC ; crDelaiHeures de la config ODV)
  //       → MNE, cause NO_REPORT, source « delai » ; vol bâché par le planificateur (etat annule), vol sans mission,
  //       ou délai pas encore écoulé : null ;
  //   etatsFromLedger(vols, options) → Map id du vol → résultat (CR lus une fois) ;
  //   outcomeOf(code, causes) → { etat, cr, partiel, causes } ; CAUSES : causes de MNE { code: [fr, en, de, es] }
  //   (celles du CR, plus NO_REPORT) ;
  //   reports() → CR du registre (ReportIndex, sinon copie du navigateur missionCoreLedger:v2) ;
  //   missionFor({ indicatif, date }) → identifiant de mission de l'affectation (indicatif, décollage ce jour-là) ou '' ;
  //   trackOf(id) → axe de ravitaillement de la mission (air_refueling.track, yaml lu dans son dossier, gardé en mémoire ;
  //   registre : aarTrack s'il est rempli) ou ''.
  if (window.OdvReports) return;
  const SCRIPT = document.currentScript?.src || location.href;
  /** Missions du registre : MissionIndex une fois prêt, sinon copie du navigateur (missionRegistry:v1), sinon []. */
  const registry = async () => {
    await window.MissionIndex?.ready;
    if (window.MissionIndex) return window.MissionIndex.all();
    try {
      return JSON.parse(localStorage.getItem('missionRegistry:v1') || 'null')?.missions || [];
    } catch {
      return [];
    }
  };
  /** Normalise un identifiant, un indicatif ou un code pour comparaison (texte, sans espaces aux bords, majuscules). */
  const norm = v => String(v || '').trim().toUpperCase();
  /** Opération d'une mission : operation.id, sinon l'identifiant sans sa lettre d'équipe (A-001A → A-001). */
  const opOf = m => norm(m.operation?.id) || norm(m.id).replace(/^([A-Z]-\d{3})[A-Z]$/, '$1');
  /** Mission au rôle ravitailleur : aarRole « tanker », ou, sans rôle au registre, mission AAR de type AAR ou R-xxx. */
  const isTanker = m => m.aarRole === 'tanker' || (!m.aarRole && m.aar && (/^AAR$/i.test(m.type || '') || /^R-/.test(norm(m.id))));
  /** Mission receveuse : aarRole « receiver », ou, rôle absent, mission AAR qui n'est pas ravitailleur. */
  const isReceiver = m => m.aarRole === 'receiver' || (!m.aarRole && m.aar && !isTanker(m));
  /** Mission liée telle que renvoyée par tankersFor / receiversFor, lien « operation » ou « axe ». */
  const view = (m, lien) => ({
    id: m.id,
    title: m.title || '',
    type: m.type || '',
    callsigns: m.callsigns || [],
    aircraftTypes: m.aircraftTypes || [],
    track: m.aarTrack || '',
    folder: m.folder || '',
    lien
  });
  /**
   *  Missions liées à la mission id et retenues par want : celles de la même opération, plus, pour les
   *  ravitailleurs, les missions tanker d'autres opérations sur le même axe (aarTrack). Mission inconnue : [].
   */
  async function linked(id, want) {
    const all = await registry(),
      me = all.find(m => norm(m.id) === norm(id));
    if (!me) return [];
    const op = opOf(me),
      out = all.filter(m => m !== me && opOf(m) === op && want(m)).map(m => view(m, 'operation'));
    if (me.aarTrack && want === isTanker)
      for (const m of all)
        if (m !== me && opOf(m) !== op && isTanker(m) && m.aarTrack === me.aarTrack) out.push(view(m, 'axe'));
    return out;
  }

  // ---- CR → plaquette
  // MissionVocab (shared/mission_core/vocab.js) peut être chargé après ce module : liste lue à l'usage
  const causes = () => Object.assign(Object.fromEntries((window.MissionVocab?.mneCauses || []).map(o => [o.value, o.label])), {
    NO_REPORT: ['Pas de CR dans le délai', 'No report within the deadline', 'Kein Bericht innerhalb der Frist',
      'Sin informe en el plazo'
    ],
    OTHER: window.MissionVocab?.mneCauses?.find(o => o.value === 'OTHER')?.label || ['Autre', 'Other', 'Andere', 'Otro']
  });
  // résultats du CR qui sont aussi une cause
  const OUTCOME_CAUSE = {
    WEATHER: 'WEATHER',
    TECHNICAL: 'TECHNICAL',
    OPERATIONAL: 'OPERATIONAL'
  };
  /**
   *  Traduit le résultat d'un CR (results.outcome) en état de plaquette : SUCCESS → ME, CANCELLED → BACHE,
   *  PARTIAL_SUCCESS → MNE partielle faite, tout autre code → MNE non faite ; causes du CR, sinon celle
   *  du résultat, sinon OTHER. Code vide : null.
   */
  function outcomeOf(code, causes = []) {
    const c = norm(code),
      own = [...new Set((Array.isArray(causes) ? causes : []).map(norm).filter(Boolean))];
    if (c === 'SUCCESS') return {
      etat: 'fait',
      cr: 'ME',
      partiel: false,
      causes: []
    };
    if (c === 'CANCELLED') return {
      etat: 'annule',
      cr: 'BACHE',
      partiel: false,
      causes: own
    };
    if (!c) return null;
    return {
      etat: c === 'PARTIAL_SUCCESS' ? 'fait' : 'non_fait',
      cr: 'MNE',
      partiel: c === 'PARTIAL_SUCCESS',
      causes: own.length ? own : [OUTCOME_CAUSE[c] || 'OTHER']
    };
  }
  /** CR du registre : index ReportIndex, sinon registre YAML copié dans le navigateur (missionCoreLedger:v2). */
  async function reports() {
    const i = await window.ReportIndex?.load?.().catch(() => null);
    if (i) return i.missions || [];
    try {
      return window.jsyaml?.load(JSON.parse(localStorage.getItem('missionCoreLedger:v2') || 'null')?.text || '')?.missions || [];
    } catch {
      return [];
    }
  }
  /** Mission d'un CR : tirée du n° CR<mission>-<n> (MissionVocab.parseCrId), sinon metadata.missionNumber. */
  const crMission = r => window.MissionVocab?.parseCrId?.(r?.metadata?.missionId)?.mission || norm(r?.metadata?.missionNumber);
  /** Date du CR (AAAA-MM-JJ) ou '' s'il n'en porte pas. */
  const crDate = r => String(r?.metadata?.date || '').slice(0, 10);
  /** Fin du vol (ms UTC) : date + debut + duree (minutes). */
  const endOf = v => {
    const t0 = Date.parse(`${v.date}T${v.debut || '00:00'}:00Z`);
    return Number.isFinite(t0) ? t0 + (Number(v.duree) || 0) * 6e4 : NaN;
  };
  /**
   *  État d'un vol d'après une liste de CR déjà lue (cœur d'etatFromLedger) : CR le plus récent de la mission
   *  du vol et du même jour, sinon MNE NO_REPORT passé delaiH heures après la fin du vol, sinon null (cf. en-tête).
   */
  function fromReports(vol, list, {
    delaiH = 48,
    now = Date.now()
  } = {}) {
    const m = norm(vol?.mission);
    if (!m) return null;
    const mine = list.filter(r => crMission(r) === m && (!crDate(r) || !vol.date || crDate(r) === vol.date));
    const r = mine.sort((a, b) => String(crDate(b) || b?.metadata?.missionId || '').localeCompare(String(crDate(a) || a?.metadata
      ?.missionId || '')))[0];
    if (r) {
      const o = outcomeOf(r.results?.outcome, r.results?.causes);
      // CR sans résultat renseigné : vol fait (le CR existe), résultat à compléter dans le CR
      return {
        ...(o || {
          etat: 'fait',
          cr: null,
          partiel: false,
          causes: []
        }),
        motif: String(r.results?.interruptionReason || ''),
        crId: String(r.metadata?.missionId || ''),
        outcome: norm(r.results?.outcome),
        source: 'cr'
      };
    }
    // bâché par le planificateur (sans CR) : son état reste
    if (vol.etat === 'annule') return null;
    const end = endOf(vol);
    if (Number.isFinite(end) && now > end + delaiH * 36e5) return {
      etat: 'non_fait',
      cr: 'MNE',
      partiel: false,
      causes: ['NO_REPORT'],
      motif: '',
      crId: '',
      outcome: '',
      source: 'delai'
    };
    return null;
  }
  /** État d'un vol d'après le registre des CR (opts.reports évite de relire le registre). */
  async function etatFromLedger(vol, opts = {}) {
    return fromReports(vol, opts.reports || await reports(), opts);
  }
  /** États de plusieurs vols, CR lus une seule fois : Map id du vol → résultat ou null. */
  async function etatsFromLedger(vols, opts = {}) {
    const list = opts.reports || await reports();
    return new Map((vols || []).map(v => [v.id, fromReports(v, list, opts)]));
  }
  /**
   *  Mission d'une affectation (MissionAssignments) par indicatif, espaces ignorés, hors affectations annulées
   *  et, si date est donnée, décollant ce jour-là ; '' si aucune.
   */
  async function missionFor({
    indicatif,
    date
  } = {}) {
    const cs = norm(indicatif).replace(/\s+/g, '');
    if (!cs) return '';
    const idx = await window.MissionAssignments?.index?.().catch(() => null);
    const a = (idx?.assignments || []).find(x => norm(x.callsign).replace(/\s+/g, '') === cs && x.status !== 'annulée' && (!date ||
      String(x.takeoff || '').slice(0, 10) === date));
    return a ? String(a.mission || '') : '';
  }

  const tracks = new Map();
  /**
   *  Axe de ravitaillement d'une mission : aarTrack du registre, sinon air_refueling.track du yaml de son dossier
   *  (js-yaml chargé à la demande) ; la promesse est gardée dans tracks pour ne lire le dossier qu'une fois.
   */
  async function trackOf(id) {
    const key = norm(id);
    if (!key) return '';
    if (tracks.has(key)) return tracks.get(key);
    const p = (async () => {
      const m = (await registry()).find(x => norm(x.id) === key);
      if (m?.aarTrack) return m.aarTrack;
      const A = window.MissionAssignments;
      if (!m?.folder || !A?.missionFirst) return '';
      if (!window.jsyaml) await new Promise(res => {
        const sc = document.createElement('script');
        sc.src = new URL('mission_core/vendor/js-yaml.min.js', SCRIPT).href;
        sc.onload = sc.onerror = res;
        document.head.append(sc);
      });
      const bare = key.replace('-', ''),
        f = await A.missionFirst(m.folder, [...(m.files || []).filter(n => /\.ya?ml$/i.test(n)), `mission${key}.yaml`, `mission${bare}.yaml`]).catch(() =>
          null);
      try {
        return f && window.jsyaml ? norm(window.jsyaml.load(f.value.replace(/^#.*\n/, ''))?.air_refueling?.track) : '';
      } catch {
        return '';
      }
    })();
    tracks.set(key, p);
    return p;
  }

  // API publique (voir l'en-tête) ; CAUSES est un accesseur pour suivre MissionVocab chargé après ce module
  window.OdvReports = {
    trackOf,
    tankersFor: id => linked(id, isTanker),
    receiversFor: id => linked(id, isReceiver),
    get CAUSES() {
      return causes();
    },
    outcomeOf,
    reports,
    etatFromLedger,
    etatsFromLedger,
    missionFor
  };
})();
