// Planificateur de performances : bloc « Profil vertical ». Coupe le long d'une route (saisie, ou reprise
// de l'OFP SimBrief importé par le bouton d'en-tête) avec le module du studio SIA
// (shared/carto/vertical_profile.js) : relief, espaces et obstacles selon un profil d'affichage du studio (par
// défaut celui choisi dans le studio pour le profil vertical), base SIA mémorisée par le studio (même
// navigateur), trajectoire prévue selon le modèle de performances de l'avion actif (TOC, TOD).
(() => {
  const $ = id => document.getElementById(id);
  if (!$('vpDraw') || !window.SiaProfile) return;
  const tl = (...r) => r[Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'))] || r[
    0]; // texte dans la langue de la page
  const KEY = 'flightPerfVerticalProfile',
    esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    })[c]);
  const ALL_ZONES = {
    id: 'vprof',
    get name() {
      return tl('Profil vertical (toutes les zones)', 'Vertical profile (all airspaces)', 'Vertikalprofil (alle Lufträume)',
        'Perfil vertical (todos los espacios)');
    },
    zones: ['R', 'D', 'P', 'CTR', 'TMA', 'CTA', 'SIV', 'TRA', 'RMZ', 'TMZ', 'PJE'],
    elements: {}
  };
  let studio = null,
    terrain = null;
  /** Réglages mémorisés du bloc Profil vertical (route saisie, profil d'affichage, options). */
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  })();
  /** Mémorise les réglages du bloc Profil vertical. */
  // Plan de vol partagé avec les Cartes de vol (apps/planner/map_planner.html) : un seul FPL, le plus récent l'emporte.
  const FPL_KEY = 'flightPlanShared:v1';
  const readFpl = () => {
    try {
      return JSON.parse(localStorage.getItem(FPL_KEY) || 'null');
    } catch {
      return null;
    }
  };
  /** Vol en cours partagé avec les Cartes de vol : route, niveau (FL du devis), fiche de l'appareil actif, dégagement ;
   *  écrit seulement s'il change (date « at » : le plus récent l'emporte). Le dégagement vient du dernier OFP SimBrief
   *  quand il porte le même trajet (lu ensuite, sans retarder l'écriture). */
  const writeFpl = route => {
    const put = next => {
      try {
        const cur = readFpl() || {};
        if (Object.keys(next).some(k => String(cur[k] || '') !== String(next[k] || ''))) localStorage.setItem(FPL_KEY, JSON
          .stringify({
            ...cur,
            ...next,
            at: Date.now(),
            by: 'planner'
          }));
      } catch {
        /* stockage indisponible */
      }
    };
    const cur = readFpl() || {},
      next = {
        route,
        fl: String(document.getElementById('fl')?.value || '').trim(),
        aircraft: (typeof active !== 'undefined' && active?.id) || '',
        altn: cur.route === route ? cur.altn || '' : ''
      };
    put(next);
    // départ et arrivée : premier mot du premier et du dernier point (« LFBO 43.6290 1.3640, …, LFRN 48.0690 -1.7340 »
    // ou case 15 « LFBO DCT TOU … LFRN ») ; groupes vitesse / niveau écartés
    const pts = route.toUpperCase().split(/[,\n]+/).map(t => t.trim()).filter(t => t && !/^[NKM]\d{3,4}[FASM]\d{3,4}$/.test(t)),
      words = route.toUpperCase().split(/[\s,]+/).filter(Boolean),
      dep = (pts.length > 1 ? pts[0] : words[0] || '').split(/\s+/)[0],
      arr = (pts.length > 1 ? pts[pts.length - 1] : words[words.length - 1] || '').split(/\s+/)[0];
    if (typeof loadOFP === 'function') loadOFP().then(o => {
      const raw = o?.raw,
        altn = [].concat(raw?.alternate || [])[0]?.icao_code;
      if (raw?.origin?.icao_code === dep && raw?.destination?.icao_code === arr && altn) put({
        ...next,
        altn
      });
    }, () => {});
  };
  const store = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        route: $('vpRoute').value,
        floor: +$('vpFloor').value || 0,
        ceiling: +$('vpCeil').value || 0,
        at: Date.now()
      }));
    } catch {
      /* préférence seulement */
    }
    if ($('vpRoute').value.trim()) writeFpl($('vpRoute').value.trim());
  };
  {
    const shared = readFpl();
    $('vpRoute').value = shared?.route && (shared.at || 0) > (saved.at || 0) ? shared.route : saved.route || '';
  }
  $('vpFloor').value = saved.floor || 0;
  $('vpCeil').value = saved.ceiling || 0;
  /** Message d'état du bloc (err : en erreur), typographie de la langue appliquée. */
  const status = (text, err) => {
    text = (window.RepositoryNav?.getLanguage?.() || 'fr') === 'fr' ? text : String(text).replace(/ ([:;])/g, '$1');
    $('vpStatus').innerHTML = err ? `<span style="color:#ff8a80">${esc(text)}</span>` : esc(text);
  };

  // Base SIA et profils du studio ; profil proposé = dernière sélection du studio pour le profil vertical.
  async function loadData() {
    studio = await SiaProfile.loadStudio();
    studio.list = studio.profiles.length ? studio.profiles : [ALL_ZONES];
    const sel = $('vpProfile'),
      keep = sel.value;
    sel.innerHTML = studio.list.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    const want = keep || studio.profileId;
    sel.value = studio.list.some(p => p.id === want) ? want : studio.list[0].id;
    const b = studio.base;
    const n = [b?.airspaces?.length || 0, b?.aero?.aerodromes?.length || 0, b?.aero?.navaids?.length || 0, b?.aero?.points?.length ||
      0
    ];
    status(b ? tl(`Base SIA du studio : ${n[0]} espaces, ${n[1]} aérodromes, ${n[2]} balises, ${n[3]} points RNAV.`, `Studio SIA database: ${n[0]} airspaces, ${n[1]} aerodromes, ${n[2]} navaids, ${n[3]} RNAV points.`, `SIA-Datenbank des Studios: ${n[0]} Lufträume, ${n[1]} Flugplätze, ${n[2]} Funkfeuer, ${n[3]} RNAV-Punkte.`, `Base SIA del estudio: ${n[0]} espacios, ${n[1]} aeródromos, ${n[2]} radioayudas, ${n[3]} puntos RNAV.`) :
      tl(
        'Base SIA absente : ouvrir le studio cartographique (Missions SIA) dans ce navigateur et y charger le dossier SIA une fois. Sans elle, route en coordonnées ou SimBrief, sans espaces aériens.',
        'No SIA database: open the map studio (SIA missions) in this browser and load the SIA folder once. Without it, routes in coordinates or from SimBrief only, with no airspaces.',
        'Keine SIA-Datenbank: das Kartenstudio (SIA-Missionen) in diesem Browser öffnen und den SIA-Ordner einmal laden. Ohne sie nur Routen in Koordinaten oder aus SimBrief, ohne Lufträume.',
        'Sin base SIA: abra el estudio cartográfico (misiones SIA) en este navegador y cargue la carpeta SIA una vez. Sin ella, solo rutas en coordenadas o de SimBrief, sin espacios aéreos.'
      ));
  }

  // Route d'un OFP SimBrief : départ, groupe vitesse / niveau initial (TAS de croisière, niveau initial),
  // points du navlog en coordonnées (TOC / TOD recalculés ici, donc écartés), paliers de croisière
  // (changement d'altitude en phase CRZ → nouveau groupe au point), arrivée.
  function routeFromOfp(raw) {
    const fixes = findNavlog(raw) || [],
      num = v => parseFloat(v),
      items = [],
      gen = raw.general || {};
    const tas = Math.round(num(gen.cruise_tas) || num(active?.cruise?.tasKt) || 0),
      group = ft => tas > 0 && ft > 0 ? `N${String(tas).padStart(4, '0')}F${String(Math.round(ft / 100)).padStart(3, '0')}` : '';
    let level = num(gen.initial_altitude) || 0,
      lastId = '';
    /** Point de route (identifiant, position) pour la coupe. */
    const point = (id, lat, lon) => {
      lat = num(lat);
      lon = num(lon);
      id = String(id || 'WPT').replace(/[\s,;/]+/g, '') || 'WPT';
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || id === lastId) return false;
      lastId = id;
      items.push(`${id} ${lat.toFixed(4)} ${lon.toFixed(4)}`);
      return true;
    };
    const org = raw.origin,
      dst = raw.destination;
    if (org && point(org.icao_code, org.pos_lat, org.pos_long) && group(level)) items.push(group(level));
    for (const f of fixes) {
      if (!f || typeof f !== 'object' || /^(TOC|TOD)$/i.test(f.ident || '')) continue;
      if (!point(f.ident || f.name, f.pos_lat, f.pos_long)) continue;
      const alt = num(f.altitude_feet);
      if (/CRZ/i.test(f.stage || '') && level && alt && Math.abs(alt - level) >= 500) {
        level = alt;
        items[items.length - 1] += '/' + group(level);
      }
    }
    if (dst) point(dst.icao_code, dst.pos_lat, dst.pos_long);
    if (items.filter(x => !/^N\d{4}F/.test(x)).length < 2) throw Error(tl('OFP sans points de navigation exploitables.',
      'OFP without usable navigation points.', 'OFP ohne verwertbare Navigationspunkte.',
      'OFP sin puntos de navegación utilizables.'));
    return items.join(',\n');
  }

  // Taux recommandés du profil avion actif (sinon valeurs par défaut du module).
  // Montée : modèle de performances de l'avion actif (vario et TAS selon l'altitude), sinon ses taux constants.
  const rates = () => {
    const a = typeof active !== 'undefined' ? active : null,
      descent = {
        fpm: Math.abs(+a?.descent?.rateFpm),
        kt: +a?.descent?.tasKt
      };
    try {
      if (a && window.FlightPerfModel) {
        const m = FlightPerfModel.create(a, {
          db: window.AIRCRAFT_DB
        });
        return {
          climb: {
            at: m.climbAt,
            name: a.name || a.icao,
            ceiling: m.ceiling
          },
          descent
        };
      }
    } catch {
      /* profil incomplet : taux constants */
    }
    return {
      climb: {
        fpm: +a?.climb?.rateFpm,
        kt: +a?.climb?.tasKt
      },
      descent
    };
  };

  /** Dessine la coupe verticale : route saisie ou issue de l'OFP, espaces aériens traversés (base SIA du studio), relief, plan de vol (montée / croisière / descente selon le modèle de l'avion actif). */
  async function draw() {
    if (!studio) await loadData();
    const base = studio.base || {},
      aero = base.aero || {},
      profile = studio.list.find(p => p.id === $('vpProfile').value) || studio.list[0];
    const {
      points,
      unknown
    } = SiaProfile.parseRoute($('vpRoute').value, SiaProfile.resolver({
      aero
    }));
    if (unknown.length) throw Error(tl('Point(s) inconnu(s) : ', 'Unknown point(s): ', 'Unbekannte(r) Punkt(e): ',
      'Punto(s) desconocido(s): ') + unknown.join(', ') + (studio.base ? '' : tl(
      ' (base SIA absente : seuls les points en coordonnées sont reconnus)',
      ' (no SIA database: only coordinate points are recognised)',
      ' (keine SIA-Datenbank: nur Koordinatenpunkte werden erkannt)', ' (sin base SIA: solo se reconocen puntos en coordenadas)'
    )));
    terrain ??= SiaProfile.terrainSampler();
    status(tl('Calcul du profil (relief, espaces, obstacles, trajectoire)…',
      'Computing the profile (terrain, airspaces, obstacles, trajectory)…',
      'Profil wird berechnet (Gelände, Lufträume, Hindernisse, Flugbahn)…',
      'Calculando el perfil (relieve, espacios, obstáculos, trayectoria)…'));
    const obstacles = SiaProfile.opt(profile, 'obstacles', false) ? (aero.obstacles || []).filter(o => (o.hgt || 0) >= (+SiaProfile.opt(
      profile, 'obstacleMin', 300) || 0)) : [];
    const r = rates(),
      data = await SiaProfile.build({
        points,
        elevation: terrain,
        ...r,
        airspaces: SiaProfile.selectAirspaces(profile, base.airspaces || [], {
          aliases: studio.aliases,
          limitFt: SiaAero.limitFt
        }),
        obstacles
      });
    const W = 1600,
      H = 576,
      c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    SiaProfile.draw(c.getContext('2d'), data, {
      W,
      H,
      scale: W / 1200,
      ceiling: +$('vpCeil').value || 0,
      floor: +$('vpFloor').value || 0,
      limitFt: SiaAero.limitFt,
      abbrev: !!SiaProfile.opt(profile, 'zoneAbbrev', false),
      limits: SiaProfile.opt(profile, 'zoneLimitsShow', true) !== false,
      title: `${tl('Profil vertical', 'Vertical profile', 'Vertikalprofil', 'Perfil vertical')} — ${points[0].name} → ${points[points.length - 1].name} (${(data.total / 1852).toFixed(0)} NM)`
    });
    $('vpImg').src = c.toDataURL('image/png');
    $('vpImg').hidden = false;
    const p = data.plan,
      nm = m => (m / 1852).toFixed(0),
      d = (data.total / 1852).toFixed(1),
      prof = profile.name;
    const climb = p ? (p.climb.at ? tl(`montée selon le modèle de performances de ${p.climb.name}`, `climb according to the performance model of ${p.climb.name}`, `Steigflug nach dem Leistungsmodell von ${p.climb.name}`, `ascenso según el modelo de rendimiento de ${p.climb.name}`) :
      tl(`montée ${p.climb.fpm} ft/min à ${p.climb.kt} kt`, `climb ${p.climb.fpm} ft/min at ${p.climb.kt} kt`, `Steigflug ${p.climb.fpm} ft/min mit ${p.climb.kt} kt`, `ascenso ${p.climb.fpm} ft/min a ${p.climb.kt} kt`) + (r.climb.fpm > 0 ? '' : tl(' (valeurs par défaut : profil avion incomplet)',
        ' (default values: incomplete aircraft profile)', ' (Standardwerte: Flugzeugprofil unvollständig)',
        ' (valores por defecto: perfil de avión incompleto)'))) : '';
    status(tl(`${d} NM, ${data.crossed.length} traversée(s) d’espace, ${data.obstacles.length} obstacle(s) — profil « ${prof} »`, `${d} NM, ${data.crossed.length} airspace crossing(s), ${data.obstacles.length} obstacle(s) — profile “${prof}”`, `${d} NM, ${data.crossed.length} Luftraumdurchquerung(en), ${data.obstacles.length} Hindernis(se) — Profil „${prof}“`, `${d} NM, ${data.crossed.length} cruce(s) de espacio, ${data.obstacles.length} obstáculo(s) — perfil «${prof}»`) +
      (p ? ` ; ${climb}, ${tl('descente', 'descent', 'Sinkflug', 'descenso')} ${p.descent.fpm} ft/min ${tl('à', 'at', 'mit', 'a')} ${p.descent.kt} kt ; TOC ${nm(p.toc.s)} NM, TOD ${nm(p.tod.s)} NM.` :
        tl(' ; pas de niveau indiqué (VFR) : trajectoire non tracée.', '; no level given (VFR): no trajectory drawn.',
          '; keine Flughöhe angegeben (VFR): keine Flugbahn gezeichnet.', '; sin nivel indicado (VFR): trayectoria no trazada.')));
  }

  // L'OFP importé par le bouton d'en-tête (« Récupérer dernier FPL SimBrief ») ou le fichier OFP donne la
  // route : storeOFP (enregistrement de l'OFP par la page) est complété pour la reprendre et tracer.
  if (typeof storeOFP === 'function') {
    const original = storeOFP;
    /** Accroche sur l'enregistrement d'un OFP : la route du nouvel OFP est reprise et la coupe redessinée. */
    storeOFP = async function(raw, ...rest) {
      const out = await original.call(this, raw, ...rest);
      try {
        $('vpRoute').value = routeFromOfp(raw);
        store();
        await draw();
      } catch (e) {
        status(e.message, true);
      }
      return out;
    };
  }
  $('vpDraw').onclick = () => {
    store();
    draw().catch(e => status(e.message, true));
  };
  for (const id of ['vpRoute', 'vpFloor', 'vpCeil']) $(id).addEventListener('change', store);

  /** Plan de vol → devis : distance (somme des tronçons), route vraie (départ → arrivée), niveau du premier groupe
   *  vitesse / niveau ; devis recalculé. Sans base SIA, seuls les points en coordonnées sont reconnus. */
  async function applyRoute() {
    const text = $('vpRoute').value.trim(),
      info = $('fplInfo');
    if (!text) {
      if (info) info.textContent = '';
      return;
    }
    if (!studio) {
      try {
        await loadData();
      } catch {
        /* base absente */
      }
    }
    const {
      points,
      unknown
    } = SiaProfile.parseRoute(text, SiaProfile.resolver({
      aero: studio?.base?.aero || {}
    }));
    if (points.length < 2) {
      if (info) info.textContent = unknown.length ? tl(`Point(s) inconnu(s) : ${unknown.join(', ')}`, `Unknown point(s): ${unknown.join(', ')}`) : '';
      return;
    }
    const r = Math.PI / 180,
      nm = (a, b) => 2 * 3440.065 * Math.asin(Math.sqrt(Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat *
        r) * Math.sin((b.lon - a.lon) * r / 2) ** 2));
    let d = 0;
    for (let i = 1; i < points.length; i++) d += nm(points[i - 1], points[i]);
    const a = points[0],
      b = points[points.length - 1],
      trk = (Math.atan2(Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r), Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a
        .lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r)) / r + 360) % 360;
    const lvl = points.find(p => p.lvl?.ft)?.lvl?.ft;
    $('dist').value = Math.round(d);
    $('trk').value = Math.round(trk);
    if (lvl > 0) {
      $('fl').value = Math.round(lvl / 100);
      $('fl').dispatchEvent(new Event('input'));
    }
    if (info) info.textContent = tl(`${Math.round(d)} NM, route vraie ${Math.round(trk)}°${lvl ? `, niveau ${Math.round(lvl / 100)}` : ''}${unknown.length ? ` — inconnu(s) : ${unknown.join(', ')}` : ''}`, `${Math.round(d)} NM, true track ${Math.round(trk)}°${lvl ? `, level ${Math.round(lvl / 100)}` : ''}`);
    try {
      if (window.active !== null) window.planQuote?.();
    } catch {
      /* devis au prochain calcul */
    }
  }
  $('vpRoute').addEventListener('change', () => applyRoute());
  // niveau du devis changé : vol en cours partagé mis à jour (Cartes de vol)
  document.getElementById('fl')?.addEventListener('change', () => {
    const route = $('vpRoute').value.trim();
    if (route) writeFpl(route);
  });
  // vers les Cartes de vol : même plan de vol (partagé), carte, profil vertical et cartes
  $('fplToMaps')?.addEventListener('click', () => {
    store();
    window.open(new URL('map_planner.html?fpl=1', location.href).href, '_blank');
  });
  window.addEventListener('repository-language-change', () => setTimeout(() => {
    if (!$('vpImg').hidden) draw().catch(e => status(e.message, true));
    else if (studio) loadData();
  }));
  /** Route transmise par le studio cartographique ou les Cartes de vol (« Planificateur carburant » :
   *  plannerHandoff:v1, ?handoff=1) : route OACI, distance, niveau, route vraie ; calcul et profil relancés. */
  function takeHandoff() {
    if (!new URLSearchParams(location.search).has('handoff')) return false;
    history.replaceState(null, '', location.pathname + location.search.replace(/([?&])handoff=1&?/, '$1').replace(/[?&]$/, '') + location
      .hash);
    let h = null;
    try {
      h = JSON.parse(localStorage.getItem('plannerHandoff:v1') || 'null');
    } catch {
      /* illisible */
    }
    if (!h?.route || Date.now() - (h.at || 0) > 36e5) return false;
    $('vpRoute').value = h.route;
    if (h.distNm > 0 && $('dist')) $('dist').value = Math.round(h.distNm);
    if (h.cruiseFt > 0 && $('fl')) {
      $('fl').value = Math.round(h.cruiseFt / 100);
      $('fl').dispatchEvent(new Event('input'));
    }
    if (Number.isFinite(h.trackDeg) && $('trk')) $('trk').value = Math.round(h.trackDeg);
    store();
    try {
      window.calculate?.();
    } catch {
      /* calcul relancé à la prochaine saisie */
    }
    window.AppFramework?.notify?.(tl(`Route reprise${h.from ? ` de « ${h.from} »` : ''} : ${Math.round(h.distNm || 0)} NM${h.cruiseFt ? `, niveau ${Math.round(h.cruiseFt / 100)}` : ''}.`, `Route taken${h.from ? ` from “${h.from}”` : ''}: ${Math.round(h.distNm || 0)} NM.`), 'ok');
    return true;
  }
  loadData().then(async () => {
    if (takeHandoff()) {
      await draw();
      return;
    }
    if ($('vpRoute').value.trim()) {
      await applyRoute();
      return;
    } // plan de vol (partagé) : distance, route vraie, niveau
    const o = await loadOFP();
    if (o) {
      $('vpRoute').value = routeFromOfp(o.raw || o);
      store();
    }
  }).catch(e => status(e.message, true));
})();
