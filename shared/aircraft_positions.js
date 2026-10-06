(() => {
  'use strict';
  // Terrain actuel des appareils de la flotte. Règle : il ne change que
  //   · par la mise à jour depuis le site : colonne « Emplacement » de la page Flotte (data/references/aircraft_fleet.js :
  //     location, locationAt = date à laquelle l'emplacement a changé sur le site ; AircraftDB/update_fleet.py, collage) ;
  //   · par un CR issu d'un ordre de mission (metadata.orderRef, posé quand le CR est ouvert depuis « Mes missions ») avec
  //     un terrain d'atterrissage réel (aircraft[].landingAd, jamais prérempli) : missions/aircraft_positions.json du pool
  //     { schema: 1, updated_at, positions: { IMMAT: { registration, ad, at, orderRef, cr } } }.
  // Le plus récent des deux l'emporte ; sans l'un ni l'autre, la base de l'appareil. Un CR hors ordre de mission ou un
  // landing report ne déplace jamais l'appareil.
  // Chargé par repository_nav.js sur toutes les pages (après assignments.js : MissionAssignments.readData / writeData).
  // API (window.AircraftPositions) : FILE, load({ fresh }) → positions, whereIs(appareil | immatriculation) → { ad, source
  //   'om' | 'site' | 'base', at, orderRef? }, adOf(appareil) → terrain, recordFromCr(mission) → positions écrites.
  if (window.AircraftPositions) return;
  const FILE = 'missions/aircraft_positions.json';
  const keyOf = r => String(r || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const A = () => window.MissionAssignments;
  let cache = null,
    loading = null;
  /** MissionAssignments, chargé par repository_nav.js : attendu un instant. */
  async function assignments() {
    for (let i = 0; i < 50 && !A()?.readData; i++) await new Promise(r => setTimeout(r, 100));
    return A()?.readData ? A() : null;
  }
  async function load({
    fresh = false
  } = {}) {
    if (cache && !fresh) return cache;
    if (loading && !fresh) return loading;
    loading = (async () => {
      const M = await assignments(),
        d = M ? await M.readData(FILE, {
          fresh
        }).catch(() => null) : null;
      cache = d?.positions && typeof d.positions === 'object' ? d.positions : {};
      loading = null;
      return cache;
    })();
    return loading;
  }
  /** Terrain actuel d'un appareil (ligne de la flotte ou immatriculation) ; positions lues d'avance (load). */
  function whereIs(plane) {
    if (typeof plane === 'string') plane = (window.DEFA_FLEET || []).find(f => keyOf(f.registration) === keyOf(plane)) || {
      registration: plane
    };
    const om = cache?.[keyOf(plane?.registration)],
      site = plane?.location ? {
        ad: String(plane.location).toUpperCase(),
        source: 'site',
        at: plane.locationAt || ''
      } : null;
    if (om?.ad && (!site || String(om.at || '') > String(site.at || ''))) return {
      ad: om.ad,
      source: 'om',
      at: om.at,
      orderRef: om.orderRef
    };
    return site || {
      ad: String(plane?.base || '').toUpperCase(),
      source: 'base',
      at: ''
    };
  }
  const adOf = plane => whereIs(plane).ad;
  /** CR enregistré : s'il est issu d'un ordre de mission, ses appareils au terrain d'atterrissage réel saisi (un
   *  appareil n'est jamais ramené en arrière par un CR plus ancien que sa position). */
  async function recordFromCr(mission) {
    const ref = mission?.metadata?.orderRef,
      date = String(mission?.metadata?.date || '').slice(0, 10);
    if (!ref || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 0;
    const time = /^\d{2}:\d{2}/.test(mission.metadata.timeUtc || '') ? mission.metadata.timeUtc.slice(0, 5) : '00:00',
      at = `${date}T${time}:00Z`;
    const marks = (mission.aircraft || []).map(a => ({
      a,
      k: keyOf(a.registration),
      ad: String(a.landingAd || '').toUpperCase().trim()
    })).filter(x => x.k && /^[A-Z]{4}$/.test(x.ad));
    if (!marks.length) return 0;
    const M = await assignments();
    if (!M?.writeData) return 0;
    const cur = {
      ...(await load({
        fresh: true
      }))
    };
    let n = 0;
    for (const {
        a,
        k,
        ad
      } of marks) {
      if (cur[k]?.at && cur[k].at > at) continue;
      cur[k] = {
        registration: String(a.registration).toUpperCase().trim(),
        ad,
        at,
        orderRef: ref,
        cr: mission.metadata.missionId || ''
      };
      n++;
    }
    if (!n) return 0;
    await M.writeData(FILE, {
      schema: 1,
      updated_at: new Date().toISOString(),
      positions: cur
    });
    cache = cur;
    return n;
  }
  window.AircraftPositions = {
    FILE,
    load,
    whereIs,
    adOf,
    recordFromCr
  };
  load();
})();
