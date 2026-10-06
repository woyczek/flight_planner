// Ordres de vols (ODV) : espaces et axes tirés de la base aéronautique (shared/sia_base.js), pour les plaquettes de zone,
// la bande LL / RTBA du jour et les espaces à éviter. Chargé en option par la page des ordres de vols : rien ne casse si ce
// module ou la base manquent. API (window.OdvAirspace), toutes asynchrones :
//   zones(dateISO, { ll })  → [{ id, nom, type, act, info, admin, plancher, plafond, azba, creneaux }] ; creneaux : liste
//                             [{ debut, fin }] (HH:MM UTC) tirée du repli ll de data/odv/config.json
//                             ([{ nom, debut, fin, jours: [1..7], sia? }], 1 = lundi), sinon null (activité sur AZBA,
//                             NOTAM ou inconnue : act en texte)
//   aarTracks()             → [{ id, nom, kind, heading, lengthNm, ip, cp }] (MILAIP ENR 5.7)
//   zonesToAvoid(dep, arr)  → { dep: { icao, ctr: [noms], tma: [noms], note? }, arr: { … } }
//   match(nom)              → id de la base pour un nom local (« T43 », « LF-R 45 A »…), ou ''
// Base absente, ou zone France inactive (Paramètres › Maintenance › Données aéronautiques) : { missing: true, raison, url }.
(() => {
  'use strict';
  if (window.OdvAirspace) return;
  const SCRIPT = document.currentScript?.src || location.href;
  // espaces activables (R, D, zones temporaires, militaires d'ailleurs) ; les zones du RTBA sont repérées par azba
  const TYPES = new Set(['R', 'D', 'TRA', 'TSA', 'MOA', 'W', 'A']);
  const settingsUrl = () => window.RepositoryNav?.settingsUrl?.('sia', 'mt-aero-base') || new URL('../apps/settings/maintenance.html?m=sia#mt-aero-base', SCRIPT).href;
  const missing = raison => ({
    missing: true,
    raison,
    url: settingsUrl()
  });

  // base lue une fois, relue si elle change (relecture ici ou dans un autre onglet : siaBaseInfo:v1)
  let baseLoad = null;
  const base = () => baseLoad ||= (async () => {
    try {
      return await window.SiaBase?.get?.({
        any: true
      }) || null;
    } catch {
      return null;
    }
  })();
  window.addEventListener('storage', e => {
    if (e.key === 'siaBaseInfo:v1') baseLoad = null;
  });
  /** Base utilisable pour la France (RTBA, axes ENR 5.7), ou { missing }. */
  async function frBase() {
    const b = await base();
    if (!b) return missing('base');
    const zones = b.sources?.zones;
    if (Array.isArray(zones) && !zones.includes('fr')) return missing('zone-fr');
    return b;
  }

  const norm = s => String(s || '').toUpperCase().replace(/^LF[-\s]*/, '').replace(/[^A-Z0-9]/g, '');
  /** Id (clé AIXM) de l'espace qui porte ce nom local : clé ou nom exacts, puis forme réduite (« T43 » ↔ « LF-T43 »). */
  function matchIn(list, nom) {
    const n = String(nom || '').trim().toUpperCase();
    if (!n) return '';
    const exact = list.find(a => String(a.key || '').toUpperCase() === n || String(a.name || '').toUpperCase() === n);
    if (exact) return exact.key || exact.name;
    const r = norm(n),
      near = list.find(a => norm(a.key) === r || norm(a.name) === r);
    return near ? near.key || near.name : '';
  }
  const activables = b => {
    const seen = new Set;
    return (b.airspaces || []).filter(a => {
      if (!(a.azba || TYPES.has(a.type))) return false;
      const k = a.key || a.name;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  /** Jour ISO (1 = lundi … 7 = dimanche) d'une date AAAA-MM-JJ. */
  const isoDay = d => {
    const w = new Date(`${d}T12:00:00Z`).getUTCDay();
    return w === 0 ? 7 : w;
  };

  async function zones(dateISO, {
    ll = []
  } = {}) {
    const b = await frBase();
    if (b.missing) return b;
    const list = activables(b),
      day = dateISO ? isoDay(dateISO) : 0;
    // repli de la config : créneau rattaché par son id de base (sia), sinon par son nom
    const slots = new Map;
    for (const s of ll || []) {
      if (day && Array.isArray(s.jours) && s.jours.length && !s.jours.includes(day)) continue;
      const id = s.sia || matchIn(list, s.nom);
      if (!id) continue;
      if (!slots.has(id)) slots.set(id, []);
      slots.get(id).push({
        debut: s.debut,
        fin: s.fin
      });
    }
    return list.map(a => {
      const id = a.key || a.name;
      return {
        id,
        nom: a.name || id,
        type: a.azba ? 'RTBA' : a.type,
        act: a.act || (a.azba ? 'AZBA' : ''),
        info: a.info || '',
        admin: a.admin || '',
        plancher: a.lower || '',
        plafond: a.upper || '',
        azba: !!a.azba,
        creneaux: slots.get(id) || null
      };
    });
  }

  const loadScript = src => new Promise(res => {
    const sc = document.createElement('script');
    sc.src = new URL(src, SCRIPT).href;
    sc.onload = () => res(true);
    sc.onerror = () => res(false);
    document.head.append(sc);
  });
  async function aarTracks() {
    const b = await frBase();
    if (b.missing) return b;
    if (!window.AarTracks) await loadScript('aar_tracks.js');
    if (!window.AarTracks || !b.aarXml) return [];
    return window.AarTracks.parseTrackXml(b.aarXml).filter(t => t.kind === 'track' && t.ip && t.cp).map(t => ({
      id: t.name,
      nom: t.name,
      kind: t.kind,
      heading: t.heading,
      lengthNm: t.lengthNm,
      ip: t.ip,
      cp: t.cp
    }));
  }

  async function zonesToAvoid(dep, arr) {
    const b = await base();
    if (!b) return missing('base');
    const inR = window.SiaBase.inRing,
      ads = b.aero?.aerodromes || [];
    const one = code => {
      const icao = String(code || '').toUpperCase().trim();
      if (!icao) return null;
      const ad = ads.find(a => String(a.icao || '').toUpperCase() === icao);
      if (!ad) return {
        icao,
        ctr: [],
        tma: [],
        note: `terrain ${icao} inconnu de la base aéronautique`
      };
      const hit = t => (b.airspaces || []).filter(a => a.type === t && (a.rings || []).some(r => inR(r, ad.lat, ad.lon))).map(a => a.name || a.key);
      return {
        icao,
        ctr: hit('CTR'),
        tma: hit('TMA')
      };
    };
    return {
      dep: one(dep),
      arr: one(arr)
    };
  }

  async function match(nom) {
    const b = await base();
    return b ? matchIn(activables(b), nom) : '';
  }

  window.OdvAirspace = {
    zones,
    aarTracks,
    zonesToAvoid,
    match
  };
})();
