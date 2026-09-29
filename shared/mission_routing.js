(() => {
  'use strict';
  // Calcul des routes de transit (MissionRouting), d'après la base SIA du navigateur (shared/sia_base.js) :
  //   · avion en IFR (croisière ≥ 6500 ft) : plus court chemin sur les voies aériennes (AIXM Rsg) ouvertes à son niveau,
  //     entrée et sortie directes (≤ 60 NM, comme un départ et une arrivée omnidirectionnels) ; direct si le détour
  //     dépasse 40 % ;
  //   · avion de combat ou de transport tactique à basse hauteur (croisière ≤ 1500 ft) : chaînage des zones du RTBA
  //     (zones AZBA contiguës), entrée et sortie directes ;
  //   · hélicoptère, VFR : direct.
  // Seuls les tronçons de transit longs (> 40 NM) sont routés ; le travail sur zone reste direct. Utilisé par
  // shared/mission_estimate.js (route probable, durées) et, par elle, par le studio, le registre et les zones à activer.
  // Calcul local, indicatif : pas de SID / STAR, pas de sens unique des voies, pas de restrictions de niveau fines.

  const rad = d => d * Math.PI / 180;
  /** Distance orthodromique (NM). */
  function nm(a, b) {
    const f1 = rad(a.lat), f2 = rad(b.lat), df = f2 - f1, dl = rad(b.lon - a.lon);
    const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  let data = { airways: [], airspaces: [] }, awGraph = null, rtbaGraph = null;

  /** Données de la base SIA : { airways (aero.airways), airspaces } ; graphes reconstruits à la demande. */
  function setData(d) { data = { airways: d?.airways || [], airspaces: d?.airspaces || [] }; awGraph = null; rtbaGraph = null; }
  const ready = () => data.airways.length > 0 || data.airspaces.some(a => a.azba);

  // ---- graphe des voies aériennes : nœuds = points (identifiant + position), arêtes = segments (deux sens)
  function airwayGraph() {
    if (awGraph) return awGraph;
    const nodes = new Map(), key = p => `${p.id}|${p.lat.toFixed(3)}|${p.lon.toFixed(3)}`, node = p => { const k = key(p); if (!nodes.has(k)) nodes.set(k, { k, id: p.id, lat: p.lat, lon: p.lon, out: [] }); return nodes.get(k); };
    for (const s of data.airways) {
      const a = node(s.a), b = node(s.b), d = s.nm || nm(a, b), lo = s.lower ?? 0, hi = s.upper ?? 99999;
      a.out.push({ to: b, d, route: s.route, lo, hi });
      b.out.push({ to: a, d, route: s.route, lo, hi });
    }
    return (awGraph = { nodes: [...nodes.values()] });
  }
  // ---- graphe du RTBA : un nœud par zone AZBA (barycentre), arête entre zones qui se touchent
  function rtbaNetwork() {
    if (rtbaGraph) return rtbaGraph;
    const zones = data.airspaces.filter(a => a.azba && a.rings?.[0]?.length > 2).map(a => {
      const r = a.rings[0], lat = r.reduce((s, p) => s + p[0], 0) / r.length, lon = r.reduce((s, p) => s + p[1], 0) / r.length;
      return { k: `${a.type}|${a.key || a.name}`, id: `R ${a.name}`, lat, lon, ring: r, out: [] };
    });
    // tronçons raccordés bord à bord : un sommet de l'un à moins de GAP NM d'un côté de l'autre (raccord court toléré)
    const GAP = 5, KM = GAP * 1.852;
    for (const z of zones) { const la = z.ring.map(p => p[0]), lo = z.ring.map(p => p[1]); z.box = { s: Math.min(...la), n: Math.max(...la), w: Math.min(...lo), e: Math.max(...lo) }; }
    const segDist = (p, a, b, k) => {          // distance (km) du point p au segment ab, projection plate locale
      const ax = a[1] * k, ay = a[0] * 111.32, bx = b[1] * k, by = b[0] * 111.32, px = p[1] * k, py = p[0] * 111.32, dx = bx - ax, dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
      return Math.hypot(px - ax - t * dx, py - ay - t * dy);
    };
    const near = (a, b) => {
      const pad = GAP / 60 * 1.5;
      if (a.box.n + pad < b.box.s || b.box.n + pad < a.box.s || a.box.e + pad < b.box.w || b.box.e + pad < a.box.w) return false;
      const k = 111.32 * Math.cos(rad((a.lat + b.lat) / 2));
      const close = (x, y) => x.ring.some(p => p[0] >= y.box.s - pad && p[0] <= y.box.n + pad && p[1] >= y.box.w - pad && p[1] <= y.box.e + pad && y.ring.some((q, i) => segDist(p, q, y.ring[(i + 1) % y.ring.length], k) < KM));
      return close(a, b) || close(b, a);
    };
    for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i], b = zones[j];
      if (nm(a, b) > 150 || !near(a, b)) continue;
      const d = nm(a, b);
      a.out.push({ to: b, d, route: 'RTBA', lo: 0, hi: 99999 });
      b.out.push({ to: a, d, route: 'RTBA', lo: 0, hi: 99999 });
    }
    return (rtbaGraph = { nodes: zones });
  }
  /** Plus court chemin de a à b par le graphe : entrée et sortie directes vers les nœuds proches ; null sinon. */
  function shortest(graph, a, b, alt, reach = 60) {
    // entrée / sortie : nœuds proches portant au moins une voie ouverte à ce niveau
    const usable = n => n.out.some(e => alt >= e.lo - 100 && alt <= e.hi + 100);
    const near = p => graph.nodes.filter(usable).map(n => [n, nm(p, n)]).filter(([, d]) => d <= reach).sort((x, y) => x[1] - y[1]).slice(0, 8);
    const starts = near(a), ends = new Map(near(b).map(([n, d]) => [n.k, d]));
    if (!starts.length || !ends.size) return null;
    const dist = new Map(), prev = new Map(), done = new Set(), queue = [];
    const push = (n, d, from, route) => { if (d < (dist.get(n.k) ?? Infinity)) { dist.set(n.k, d); prev.set(n.k, { from, route, n }); queue.push([d, n]); } };
    for (const [n, d] of starts) push(n, d, null, 'DCT');
    let best = null, bestCost = Infinity;
    while (queue.length) {
      let i = 0;
      for (let k = 1; k < queue.length; k++) if (queue[k][0] < queue[i][0]) i = k;
      const [d, n] = queue.splice(i, 1)[0];
      if (done.has(n.k) || d > bestCost) continue;
      done.add(n.k);
      if (ends.has(n.k) && d + ends.get(n.k) < bestCost) { bestCost = d + ends.get(n.k); best = n; }
      for (const e of n.out) if (alt >= e.lo - 100 && alt <= e.hi + 100 && !done.has(e.to.k)) push(e.to, d + e.d, n, e.route);
    }
    if (!best) return null;
    const path = [];
    for (let k = best.k; k;) { const p = prev.get(k); path.unshift({ id: p.n.id, lat: p.n.lat, lon: p.n.lon, via: p.route }); k = p.from?.k; }
    return { pts: path, nm: bestCost };
  }

  /** Mode de transit d'un appareil (P : performances de mission_estimate) : airways | rtba | direct. */
  function modeOf(P) {
    if (!P || P.cls === 'heli') return 'direct';
    if (P.alt <= 1500 && (P.cls === 'jet' || P.cls === 'turboprop')) return 'rtba';
    if (P.alt >= 6500) return 'airways';
    return 'direct';
  }
  /** Points intermédiaires d'un tronçon a → b : { pts: [{ id, lat, lon, via }], mode, routes } ; pts vide = direct. */
  function leg(a, b, P) {
    const direct = nm(a, b), mode = modeOf(P);
    if (direct <= 40 || mode === 'direct' || !ready()) return { pts: [], mode: 'direct', routes: [] };
    const r = mode === 'airways' ? shortest(airwayGraph(), a, b, P.alt, 60) : shortest(rtbaNetwork(), a, b, 0, 150);
    const routes = r ? [...new Set(r.pts.map(p => p.via).filter(v => v && v !== 'DCT'))] : [];
    // détour excessif, ou chemin sans aucun segment du réseau (entrée et sortie directes par un même point) : direct
    if (!r || !routes.length || r.nm > direct * (mode === 'airways' ? 1.4 : 1.8)) return { pts: [], mode: 'direct', routes: [] };
    return { pts: r.pts, mode, routes };
  }
  /** Chaîne de points (départ, points, arrivée) avec les points de transit insérés (kind : 'via'). { chain, how }. */
  function expand(chain, P) {
    if (!ready() || modeOf(P) === 'direct') return { chain, how: '' };
    const out = [chain[0]], used = new Set();
    let mode = '';
    for (let i = 0; i < chain.length - 1; i++) {
      const r = leg(chain[i], chain[i + 1], P);
      if (r.pts.length) { mode = r.mode; r.routes.forEach(x => used.add(x)); for (const p of r.pts) out.push({ id: p.id, name: p.id, lat: p.lat, lon: p.lon, kind: 'via', task: 0, via: p.via }); }
      out.push(chain[i + 1]);
    }
    const how = !mode ? '' : mode === 'airways' ? `transit par les voies aériennes (${[...used].slice(0, 6).join(', ')}${used.size > 6 ? '…' : ''})` : `transit à basse hauteur par le RTBA (${out.filter(p => p.kind === 'via').map(p => p.id).slice(0, 6).join(' → ')}${out.filter(p => p.kind === 'via').length > 6 ? '…' : ''})`;
    return { chain: out, how };
  }
  /** Charge les voies aériennes et les espaces de la base SIA du navigateur (toute version) ; vrai si chargés. */
  async function loadFromBase() {
    try { const b = await window.SiaBase?.get?.({ any: true }); if (b) setData({ airways: b.aero?.airways, airspaces: b.airspaces }); return !!b; } catch { return false; }
  }

  window.MissionRouting = { setData, ready, modeOf, leg, expand, loadFromBase, nm };
})();
