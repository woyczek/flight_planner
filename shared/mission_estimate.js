(() => {
  'use strict';
  // Composant « MissionEstimate » : route probable et durée estimée d'une mission générée (YAML helo-xp-mission),
  // pour choisir une mission (registre), la préparer (générateur de brief) et la comparer au vol réel (CR).
  //
  //   · Route : origine → points dans l'ordre → retour base. Ordre donné par la mission (route_order, sinon le
  //     cheminement du profil vertical) ; à défaut, les points tournants dans l'ordre et chaque point de travail
  //     (TARGET, rendez-vous, centres de zone) inséré là où il allonge le moins la route. Une mission se termine
  //     toujours par un retour base : destination de la mission, sinon le terrain de départ.
  //   · Appareil : premier désignateur OACI de aircraft[0].type (alias de la base des types : H145 → EC45).
  //     Vitesse et vario : aircraft[].cruise_speed_kt, puis profil du planificateur (flightPerfState), puis fiche
  //     EUROCONTROL APD (AIRCRAFT_PERF), puis valeur type de la classe (hélicoptère, turbopropulseur, réacteur).
  //   · Niveau : aircraft[].cruise_level, sinon vertical_profile.cruise, sinon valeur type de la classe ; un tronçon
  //     trop court pour l'atteindre est volé plus bas (montée et descente comprises).
  //   · Temps sur objectif : time_on_task_min des points (TARGET, points tournants, rendez-vous, zones), sinon
  //     valeur type selon la famille et le rôle (poser, treuillage, recherche, hippodrome de ravitaillement…).
  //   · Phases comme les CR (MissionModel.computeStatistics) : transit aller (décollage → premier point de
  //     travail), sur zone (du premier au dernier point de travail, temps sur objectif compris), transit retour,
  //     vol, bloc (roulage et mise en route : + 15 min, + 5 min hélicoptère).
  //   · Options de retour (return_options : hôpital selon l'état du patient, terrain de dégagement…) : même route
  //     jusqu'au dernier point de travail, puis l'option, puis la base ; fourchette min – max.
  //
  // API : MissionEstimate.estimate(yaml) → { flight, block, transitOut, onStation, transitIn, legs, points,
  //       aircraft, notes, stated } ; MissionEstimate.hm(minutes) → « 1 h 05 » ; compare(estime, reel) → écart.
  const NM = 1852, R = 6371000, rad = d => d * Math.PI / 180;
  const distNm = (a, b) => {
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))) / NM;
  };
  const ok = p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) && !(+p.lat === 0 && +p.lon === 0);
  const pt = (p, kind, id) => ({ id: String(id || p.id || '').toUpperCase(), name: p.name || p.id || id || '', lat: +p.lat, lon: +p.lon, kind, role: String(p.role || ''), task: Number.isFinite(+p.time_on_task_min) && p.time_on_task_min !== '' && p.time_on_task_min != null ? +p.time_on_task_min : null });

  // ---- classes d'appareils : valeurs types (TAS kt, vario de montée et de descente ft/min, niveau de croisière ft)
  const CLASS = {
    heli: { tas: 125, roc: 1000, rod: 800, alt: 1500, taxi: 5, label: 'hélicoptère' },
    piston: { tas: 140, roc: 700, rod: 600, alt: 5500, taxi: 10, label: 'avion à pistons' },
    turboprop: { tas: 260, roc: 1500, rod: 1500, alt: 17000, taxi: 15, label: 'turbopropulseur' },
    jet: { tas: 440, roc: 2200, rod: 2500, alt: 33000, taxi: 15, label: 'réacteur' }
  };
  /** Désignateur OACI d'un texte « A332 A330 MRTT Phénix » ou « H160 » (alias de la base des types). */
  function designator(text) {
    const db = window.AIRCRAFT_DB || {}, al = db.__aliases || {};
    for (const raw of String(text || '').toUpperCase().split(/[\s,/()—-]+/).filter(Boolean)) {
      const k = raw.replace(/[^A-Z0-9]/g, '');
      if (!k) continue;
      if (db[k]) return k;
      if (al[k]) return al[k];
      if (window.AIRCRAFT_PERF?.[k]) return k;
    }
    return '';
  }
  /** Classe d'un type : description OACI (H… hélicoptère, …J réacteur, …T turbopropulseur, …P pistons). */
  function classOf(code, text) {
    const d = String(window.AIRCRAFT_DB?.[code]?.description || '');
    if (d[0] === 'H' || d[0] === 'G' || /hélico|helico|caracal|puma|dauphin|panther|cougar|tigre|NH90|EC1|H1[2-7]\d|H225/i.test(text)) return 'heli';
    if (d[2] === 'J') return 'jet';
    if (d[2] === 'T') return 'turboprop';
    if (d[2] === 'P') return 'piston';
    const tas = +window.AIRCRAFT_PERF?.[code]?.cruise?.tasKt || 0;
    return tas > 330 ? 'jet' : tas > 180 ? 'turboprop' : tas ? 'piston' : 'turboprop';
  }
  /** Profil du planificateur (flightPerfState) pour un type, s'il existe. */
  function plannerProfile(code) {
    if (!code) return null;
    try {
      const all = Object.values(JSON.parse(localStorage.getItem('flightPerfState') || '{}').profiles || {});
      return all.find(p => String(p.icao || p.type || '').toUpperCase() === code) || null;
    } catch { return null; }
  }
  /** Niveau « FL100 », « 1500 ft », 5500 → pieds ; null si illisible. */
  function levelFt(v) {
    if (v == null || v === '') return null;
    const s = String(v).toUpperCase().trim(), fl = /^FL\s*(\d{2,3})$/.exec(s), ft = /^(\d{2,5})\s*(FT)?$/.exec(s.replace(/\s/g, ''));
    return fl ? +fl[1] * 100 : ft ? +ft[1] : null;
  }
  /** Performances retenues pour l'appareil de la mission : { code, cls, tas, roc, rod, alt, taxi, source }. */
  function performance(y) {
    const ac = (Array.isArray(y.aircraft) ? y.aircraft : y.aircraft ? [y.aircraft] : []).filter(Boolean)[0] || {};
    const text = String(ac.type || y.teams?.[0]?.type || ''), code = designator(text), cls = classOf(code, text), C = CLASS[cls];
    const prof = plannerProfile(code), apd = window.AIRCRAFT_PERF?.[code];
    const rocApd = apd ? [apd.climbInitial?.rocFpm, apd.climb150?.rocFpm, apd.climb240?.rocFpm].filter(v => v > 0) : [];
    let tas = C.tas, source = `valeur type ${C.label}`;
    if (+ac.cruise_speed_kt > 0) { tas = +ac.cruise_speed_kt; source = 'vitesse donnée par la mission'; }
    else if (+prof?.cruise?.tasKt > 0) { tas = +prof.cruise.tasKt; source = `profil du planificateur ${prof.name || code}`; }
    else if (+apd?.cruise?.tasKt > 0) { tas = +apd.cruise.tasKt; source = `fiche APD ${code}`; }
    const roc = Math.abs(+prof?.climb?.rateFpm) || (rocApd.length ? rocApd.reduce((a, b) => a + b) / rocApd.length : C.roc);
    const rod = Math.abs(+prof?.descent?.rateFpm) || +apd?.descent?.rodFpm || C.rod;
    const ceil = +apd?.cruise?.ceilingFL > 0 ? apd.cruise.ceilingFL * 100 : null;
    let alt = levelFt(ac.cruise_level) ?? levelFt(y.vertical_profile?.cruise) ?? C.alt;
    if (ceil) alt = Math.min(alt, ceil);
    return { code, text, cls, label: C.label, tas, roc, rod, alt, taxi: C.taxi, source, callsign: ac.callsign || '' };
  }

  // ---- temps sur objectif par défaut (minutes) selon la famille et le rôle du point
  const FAMILY_TASK = { HEMS: 15, MEDEVAC: 15, HADR: 20, FIRE: 30, SAR: 30, AIRLIFT: 20, AAR: 30, AIRBORNE: 10, MARITIME: 45, ISR: 45, LE: 30, COMMAND: 60, SOF: 20, FI: 30, SURVEY: 45, SPECIAL: 15 };
  function defaultTask(p, y) {
    const fam = String(y.mission?.type || '').toUpperCase(), role = `${p.role} ${p.name}`.toLowerCase();
    if (p.kind === 'target') return FAMILY_TASK[fam] ?? 15;
    if (p.kind === 'zone') return /recherche|search|surveill|patrouille/.test(role) ? 45 : /aar|ravitaill|hippodrome/.test(role) ? 30 : 20;
    if (p.kind === 'rdv') return /poser|posé|largage|treuil|héliport|relève|embarq|débarq/.test(role) ? 10 : 5;
    if (/poser|posé|treuil|largage|drop|hélistation|hôpital|chu\b/.test(role)) return 10;
    return 0;
  }

  // ---- route probable
  function routeOf(y) {
    const pts = [], byId = new Map();
    const add = (p, kind, id) => { if (!ok(p)) return null; const q = pt(p, kind, id); pts.push(q); if (q.id) byId.set(q.id, q); return q; };
    const origin = ok(y.origin) ? pt(y.origin, 'origin', 'ORIGIN') : null;
    const dest = ok(y.destination) ? pt(y.destination, 'destination', 'DESTINATION') : origin && { ...origin, kind: 'destination', id: 'DESTINATION' };
    if (origin) byId.set('ORIGIN', origin);
    if (dest) byId.set('DESTINATION', dest);
    const tps = (y.turning_points || []).map(p => add(p, 'turn')).filter(Boolean);
    const target = add(y.target || {}, 'target', 'TARGET');
    const rdvs = (y.rendezvous || []).map(p => add(p, 'rdv')).filter(Boolean);
    const zones = (y.zones || []).map(z => add({ ...z, ...(z.centre || z.center || {}) }, 'zone')).filter(Boolean);
    const work = [target, ...rdvs, ...zones].filter(Boolean);
    // ordre donné par la mission : route_order, sinon cheminement du profil vertical (identifiants connus)
    const given = Array.isArray(y.route_order) ? y.route_order : String(y.vertical_profile?.route || '').split(/[,\n]+/);
    const ids = given.map(s => String(s).trim().split('/')[0].toUpperCase()).filter(s => byId.has(s));
    let order, how;
    if (ids.filter(s => s !== 'ORIGIN' && s !== 'DESTINATION').length >= 2) {
      order = ids.filter(s => s !== 'ORIGIN' && s !== 'DESTINATION').map(s => byId.get(s));
      how = Array.isArray(y.route_order) ? 'ordre donné par la mission (route_order)' : 'cheminement du profil vertical';
    } else {
      // points de travail : juste après le point tournant le plus proche (les points tournants décrivent le transit) ;
      // sans point tournant, dans l'ordre d'éloignement du départ
      order = [...tps];
      const sorted = [...work].sort((p, q) => (origin ? distNm(origin, p) - distNm(origin, q) : 0));
      for (const w of sorted) {
        if (order.some(q => distNm(q, w) < 1)) continue;          // point déjà sur la route
        let at = order.length;
        if (tps.length) {
          const near = tps.reduce((m, q) => distNm(q, w) < distNm(m, w) ? q : m, tps[0]);
          at = order.indexOf(near) + 1;
          while (at < order.length && !tps.includes(order[at])) at++;   // après les points de travail déjà placés là
        }
        order.splice(at, 0, w);
      }
      how = 'points tournants dans l’ordre, chaque point de travail après le point tournant le plus proche';
    }
    // briefs successifs (phases B, C… prévues par le scénariste) : route A jusqu'au point de déclenchement, puis la
    // suite de la partie (route_order à partir de trigger_point) ; points inconnus ignorés
    const reveal = [];
    for (const ph of (Array.isArray(y.phases) ? y.phases : []).filter(p => Array.isArray(p?.route_order))) {
      const trig = String(ph.trigger_point || '').toUpperCase(), next = ph.route_order.map(s => String(s).trim().toUpperCase()).filter(s => byId.has(s));
      if (!next.length) continue;
      let cut = trig === 'ORIGIN' ? 0 : order.findIndex(q => q.id === trig) + 1;
      if (cut <= 0 && trig !== 'ORIGIN') cut = order.length;   // point de déclenchement absent : à la fin de la partie précédente
      order = [...order.slice(0, cut), ...next.filter(s => s !== trig && s !== 'ORIGIN' && s !== 'DESTINATION').map(s => byId.get(s))];
      reveal.push({ id: String(ph.id || '').toUpperCase(), title: String(ph.title || ''), trigger: String(ph.trigger || ''), point: trig, delay: +ph.trigger_delay_min || 0, message: String(ph.message || '') });
      how = `${how}, puis partie ${ph.id || '?'} (${ph.trigger || trig})`;
    }
    return { origin, dest, order, how, work, reveal };
  }

  /** Durée d'un tronçon (minutes) : montée vers alt, palier, descente ; niveau réduit si le tronçon est trop court. */
  function legMinutes(nm, fromFt, toFt, P) {
    const climbKt = P.tas * 0.8, descKt = P.tas * 0.9;
    let alt = Math.max(P.alt, fromFt, toFt);
    const need = a => (a - fromFt) / P.roc / 60 * climbKt + (a - toFt) / P.rod / 60 * descKt;
    if (need(alt) > nm) {                                           // tronçon court : plafond atteignable
      let lo = Math.max(fromFt, toFt), hi = alt;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; need(m) > nm ? hi = m : lo = m; }
      alt = lo;
    }
    const tc = (alt - fromFt) / P.roc, td = (alt - toFt) / P.rod;
    const dc = tc / 60 * climbKt, dd = td / 60 * descKt, cruise = Math.max(0, nm - dc - dd);
    return { min: tc + td + cruise / P.tas * 60, alt };
  }

  /** Tronçons, phases et durées d'une route (départ, points, arrivée). */
  function fly(chain, P, y) {
    const workIdx = chain.map((p, i) => p.kind !== 'return' && (p.kind === 'target' || p.kind === 'rdv' || p.kind === 'zone' || (p.task ?? 0) > 0) && i > 0 && i < chain.length - 1 ? i : -1).filter(i => i >= 0);
    const first = workIdx.length ? workIdx[0] : 1, last = workIdx.length ? workIdx[workIdx.length - 1] : chain.length - 2;
    const mid = P.cls === 'heli' ? 0 : P.alt * 0.3;   // entre deux points de travail, avion : descente partielle
    const legs = [];
    let flight = 0, transitOut = 0, onStation = 0, transitIn = 0;
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i], b = chain[i + 1], nm = distNm(a, b);
      const L = legMinutes(nm, i === 0 ? 0 : a.kind === 'via' ? P.alt : mid, i === chain.length - 2 ? 0 : b.kind === 'via' ? P.alt : mid, P);
      const task = i + 1 < chain.length - 1 ? (b.task ?? defaultTask(b, y)) : 0;
      const phase = i < first ? 'aller' : i < last ? 'sur zone' : 'retour';
      legs.push({ from: a, to: b, nm, min: L.min, alt: L.alt, task, phase });
      flight += L.min + task;
      if (phase === 'aller') transitOut += L.min; else if (phase === 'sur zone') onStation += L.min; else transitIn += L.min;
      if (task) { if (i + 1 <= last) onStation += task; else transitIn += task; }
    }
    const approach = P.cls === 'heli' ? 2 : 5;             // approche et tour de piste
    flight += approach; transitIn += approach;
    return { legs, nm: legs.reduce((s, l) => s + l.nm, 0), flight: Math.round(flight), block: Math.round(flight + P.taxi * 2), transitOut: Math.round(transitOut), onStation: Math.round(onStation), transitIn: Math.round(transitIn) };
  }

  // ---- temps éprouvés (CR) : aller et retour réellement volés, gardés dans le registre du navigateur
  const WORK = new Set(['target', 'rdv', 'zone']);
  /** Aller (départ → premier point de travail) et retour (dernier point de travail → arrivée) réellement volés par
   *  des missions de même départ et mêmes points (± 2 NM), d'après les CR du registre : { out, in } ({ min, n }). */
  function provenTimes(r) {
    let reg = [];
    try { reg = JSON.parse(localStorage.getItem('missionRegistry:v1') || 'null')?.missions || []; } catch { return {}; }
    const work = r.order.filter(p => WORK.has(p.kind)), w0 = work[0], w1 = work[work.length - 1], near = (a, b) => a && b && distNm(a, b) <= 2;
    const outs = [], ins = [];
    for (const m of reg) {
      const pts = m.estimate?.points || [], mw = pts.filter(p => WORK.has(p.kind));
      if (!pts.length || !mw.length) continue;
      for (const c of m.reports || []) {
        if (+c.transitOut > 0 && near(pts[0], r.origin) && near(mw[0], w0)) outs.push(+c.transitOut);
        if (+c.transitIn > 0 && near(pts[pts.length - 1], r.dest) && near(mw[mw.length - 1], w1)) ins.push(+c.transitIn);
      }
    }
    const avg = v => v.length ? { min: Math.round(v.reduce((a, b) => a + b, 0) / v.length), n: v.length } : null;
    return { out: avg(outs), in: avg(ins) };
  }
  /** Remplace l'aller et le retour calculés par les temps éprouvés quand il y en a. */
  function applyProven(t, pv) {
    for (const [k, v] of [['transitOut', pv.out], ['transitIn', pv.in]]) if (v) { const d = v.min - t[k]; t.flight += d; t.block += d; t[k] = v.min; }
    return t;
  }
  /** Chaîne avec points de transit (shared/mission_routing.js), sinon inchangée. */
  const routed = (chain, P, y) => window.MissionRouting?.expand ? window.MissionRouting.expand(chain, P, y) : { chain, how: '', mode: 'direct', reason: 'calcul des routes non chargé' };

  /** Options de retour (return_options) : autre terrain ou hôpital selon l'état du patient, la météo, le carburant…
   *  Chaque option : route jusqu'au dernier point de travail, puis l'option, puis la base (sauf then_base: false). */
  function returnOptions(y, r) {
    const base = r.origin;
    return (Array.isArray(y.return_options) ? y.return_options : []).filter(ok).map((o, k) => {
      const p = { ...pt(o, 'return', o.id || `RET-${k + 1}`), task: Number.isFinite(+o.time_on_task_min) ? +o.time_on_task_min : (/hôpital|hopital|chu|ch\b|hélistation|smur/i.test(`${o.name} ${o.role || ''}`) ? 10 : 0) };
      const toBase = o.then_base !== false && base && distNm(p, base) > 1;
      return { label: o.name || p.id, condition: String(o.condition || o.role || ''), point: p, toBase, chain: [p, ...(toBase ? [{ ...base, kind: 'destination', id: 'BASE' }] : [])] };
    });
  }

  function estimate(y) {
    y = y || {};
    const P = performance(y), r = routeOf(y), notes = [];
    if (!r.origin) return { ok: false, notes: ['départ sans coordonnées : pas d’estimation'], aircraft: P };
    notes.push(`Appareil : ${P.code || P.text || 'inconnu'} (${P.label}), ${Math.round(P.tas)} kt — ${P.source}.`);
    notes.push(`Route : ${r.how} ; retour ${y.destination && ok(y.destination) && distNm(y.destination, y.origin) > 1 ? `à ${y.destination.name || 'la destination'}` : 'à la base de départ'}.`);
    const way = routed([r.origin, ...r.order, r.dest], P, y), pv = provenTimes(r), main = applyProven(fly(way.chain, P, y), pv);
    if (way.how) notes.push(`Transit : ${way.how}.`);
    if (pv.out || pv.in) notes.push(`Temps éprouvés (CR) : ${[pv.out ? `aller ${pv.out.min} min (${pv.out.n} vol${pv.out.n > 1 ? 's' : ''})` : '', pv.in ? `retour ${pv.in.min} min (${pv.in.n} vol${pv.in.n > 1 ? 's' : ''})` : ''].filter(Boolean).join(', ')}.`);
    // heure de remise de chaque partie : temps écoulé depuis le décollage au point de déclenchement + délai
    const at = id => { let tAcc = 0; if (id === 'ORIGIN') return 0; for (const l of main.legs) { tAcc += l.min; if (l.to.id === id) return tAcc; tAcc += l.task; } return null; };
    const phases = r.reveal.map(ph => { const t0 = at(ph.point); return { ...ph, at: t0 == null ? null : Math.round(t0 + ph.delay) }; });
    // variantes de retour : même route jusqu'au dernier point de travail, puis l'option (et la base)
    const keep = [r.origin, ...r.order];
    const options = returnOptions(y, r).map(o => ({ label: o.label, condition: o.condition, toBase: o.toBase, ...applyProven(fly(routed([...keep, ...o.chain], P, y).chain, P, y), { out: pv.out }) }));
    if (options.length) notes.push(`${options.length} option(s) de retour : ${options.map(o => o.label).join(', ')}.`);
    const flights = [main.flight, ...options.map(o => o.flight)];
    const st = y.timing || {};
    return {
      ok: true, aircraft: P, how: way.how ? `${r.how} ; ${way.how}` : r.how, notes, points: way.chain, proven: pv, routing: { mode: way.mode, reason: way.reason, how: way.how },
      ...main, options, phases, min: Math.min(...flights), max: Math.max(...flights),
      stated: { flight: +st.estimated_flight_min || null, block: +st.estimated_block_min || null }
    };
  }
  /** « 1 h 05 » (minutes) ; '—' si vide. */
  const hm = m => !Number.isFinite(+m) || m == null ? '—' : `${Math.floor(Math.round(m) / 60)} h ${String(Math.round(m) % 60).padStart(2, '0')}`;
  /** Écart réel / estimé : { diff (min), pct, text « +15 min (+12 %) » }. */
  const compare = (est, real) => {
    if (!(est > 0) || !(real > 0)) return null;
    const diff = Math.round(real - est), pct = Math.round(diff / est * 100);
    return { diff, pct, text: `${diff >= 0 ? '+' : '−'}${Math.abs(diff)} min (${pct >= 0 ? '+' : '−'}${Math.abs(pct)} %)` };
  };
  /** Résumé compact (registre, stockage) : durées, phases, options, tronçons et points (identifiant, nom, position). */
  const summary = y => {
    const e = estimate(y);
    if (!e.ok) return null;
    const P = p => ({ id: p.id, name: p.name, lat: +(+p.lat).toFixed(4), lon: +(+p.lon).toFixed(4), kind: p.kind });
    const legs = L => L.map(l => ({ from: l.from.id || l.from.name, to: l.to.id || l.to.name, nm: Math.round(l.nm), min: Math.round(l.min), task: l.task, phase: l.phase }));
    return {
      flight: e.flight, block: e.block, transitOut: e.transitOut, onStation: e.onStation, transitIn: e.transitIn, nm: Math.round(e.nm),
      min: e.min, max: e.max, code: e.aircraft.code, label: e.aircraft.label, tas: Math.round(e.aircraft.tas), source: e.aircraft.source, how: e.how,
      points: e.points.map(P), legs: legs(e.legs),
      options: e.options.map(o => ({ label: o.label, condition: o.condition, flight: o.flight, block: o.block, transitIn: o.transitIn, legs: legs(o.legs), points: o.legs.map(l => P(l.to)) })),
      phases: e.phases,
      statedFlight: e.stated.flight, statedBlock: e.stated.block, provenOut: e.proven?.out || null, provenIn: e.proven?.in || null, routing: e.routing || null
    };
  };

  // ---- affichage commun (générateur de brief, registre des missions)
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROUTE_KEY = 'missionEstimateRoute:v1';
  const routeOn = () => { try { return localStorage.getItem(ROUTE_KEY) === '1'; } catch { return false; } };
  /** Croquis de la route (SVG, projection plate) : route principale, options de retour en tireté. */
  function sketch(sum) {
    const all = [...sum.points, ...sum.options.flatMap(o => o.points)];
    if (all.length < 2) return '';
    const lat0 = all.reduce((s, p) => s + p.lat, 0) / all.length, k = Math.cos(rad(lat0));
    const xs = all.map(p => p.lon * k), ys = all.map(p => p.lat);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const W = 520, H = 260, pad = 28, sc = Math.min((W - 2 * pad) / Math.max(x1 - x0, 1e-3), (H - 2 * pad) / Math.max(y1 - y0, 1e-3));
    const X = p => pad + (p.lon * k - x0) * sc + ((W - 2 * pad) - (x1 - x0) * sc) / 2, Y = p => H - pad - (p.lat - y0) * sc - ((H - 2 * pad) - (y1 - y0) * sc) / 2;
    const line = pts => pts.map(p => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
    const last = sum.points.slice(0, -1).filter(p => p.kind !== 'origin').pop() || sum.points[0];
    const opts = sum.options.map(o => `<polyline points="${line([last, ...o.points])}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity=".55"/>`).join('');
    const seen = new Set(), marks = all.filter(p => { const key = `${p.lat},${p.lon}`; if (seen.has(key)) return false; seen.add(key); return true; })
      .map(p => `<circle cx="${X(p).toFixed(1)}" cy="${Y(p).toFixed(1)}" r="${p.kind === 'origin' || p.kind === 'destination' ? 5 : 3.5}" fill="${p.kind === 'target' ? '#d0021b' : p.kind === 'return' ? 'none' : 'currentColor'}" stroke="currentColor"/><text x="${(X(p) + 6).toFixed(1)}" y="${(Y(p) - 6).toFixed(1)}" font-size="11">${esc(p.id === 'ORIGIN' || p.id === 'DESTINATION' || p.kind === 'return' ? String(p.name).replace(/\s*[(–-].*$/, '') : p.id || p.name)}</text>`).join('');
    return `<svg class="me-sketch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Route probable">${opts}<polyline points="${line(sum.points)}" fill="none" stroke="currentColor" stroke-width="2"/>${marks}</svg>`;
  }
  /** Tableau des tronçons d'une route. */
  const legTable = legs => `<table class="me-legs"><thead><tr><th>Tronçon</th><th>Phase</th><th>NM</th><th>Vol</th><th>Sur place</th></tr></thead><tbody>${legs.map(l => `<tr><td>${esc(l.from)} → ${esc(l.to)}</td><td>${esc(l.phase)}</td><td>${l.nm}</td><td>${l.min} min</td><td>${l.task ? l.task + ' min' : ''}</td></tr>`).join('')}</tbody></table>`;
  /** Bloc « durée estimée » dans host : résumé, options de retour, estimation de la mission (timing), comparaison
   *  avec les CR [{ missionId, date, flight, block, transitOut, onStation, transitIn }], route affichable (mémorisé). */
  function panel(host, sum, { reports = [] } = {}) {
    if (!host) return;
    if (!sum) { host.innerHTML = '<p class="small">Pas d’estimation : départ ou points sans coordonnées.</p>'; return; }
    if (!document.getElementById('missionEstimateCss')) {
      const css = document.createElement('style'); css.id = 'missionEstimateCss';
      css.textContent = '.me-box .me-kpi{display:flex;flex-wrap:wrap;gap:6px 14px;margin:4px 0}.me-box .me-kpi span{white-space:nowrap}.me-box .me-kpi b{font-size:1.05em}.me-box table{border-collapse:collapse;font-size:13px;margin:6px 0}.me-box td,.me-box th{padding:2px 8px;border-bottom:1px solid rgba(127,127,127,.25);text-align:left}.me-box .me-sketch{width:100%;max-width:560px;height:auto;display:block;margin:6px 0}.me-box .me-routecols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:4px 16px;align-items:start}.me-box .me-routecols table{width:100%}.me-box .me-small{font-size:12px;opacity:.8}.me-box .me-toggle{display:flex!important;flex-direction:row;gap:6px;align-items:center;justify-content:flex-start;width:auto;margin:6px 0}.me-box .me-toggle input{width:auto;margin:0}.me-box .me-up{color:#b45309}.me-box .me-down{color:#15803d}';
      document.head.append(css);
    }
    const phase = `aller ${hm(sum.transitOut)} · sur zone ${hm(sum.onStation)} · retour ${hm(sum.transitIn)}`;
    const range = sum.options.length ? ` <span class="me-small">(${hm(sum.min)} à ${hm(sum.max)} selon le retour)</span>` : '';
    const cmp = (r, key) => { const c = compare(sum[key], r[key]); return c ? `<span class="${c.diff > 0 ? 'me-up' : 'me-down'}">${esc(c.text)}</span>` : ''; };
    host.classList.add('me-box');
    host.innerHTML = `<div class="me-kpi"><span>Vol estimé <b>${hm(sum.flight)}</b>${range}</span><span>Bloc <b>${hm(sum.block)}</b></span><span>${esc(phase)}</span><span>${sum.nm} NM</span></div>
      <p class="me-small">${esc(sum.code || '?')} (${esc(sum.label || '')}) à ${sum.tas} kt — ${esc(sum.source || '')} ; ${esc(sum.how || '')}.${sum.statedFlight ? ` Durée annoncée par la mission : ${hm(sum.statedFlight)} (ce calcul : ${esc(compare(sum.statedFlight, sum.flight)?.text || '=')}).` : ''}</p>
      ${sum.routing ? `<p class="me-small"><b>Transit</b> : ${esc(sum.routing.how || window.MissionRouting?.LABEL?.[sum.routing.mode] || sum.routing.mode)} — ${esc(sum.routing.reason || '')}.</p>` : ''}
      ${sum.provenOut || sum.provenIn ? `<p class="me-small"><b>Temps éprouvés</b> (CR des missions de même départ et mêmes points) : ${[sum.provenOut ? `aller ${hm(sum.provenOut.min)} (${sum.provenOut.n} vol${sum.provenOut.n > 1 ? 's' : ''})` : '', sum.provenIn ? `retour ${hm(sum.provenIn.min)} (${sum.provenIn.n} vol${sum.provenIn.n > 1 ? 's' : ''})` : ''].filter(Boolean).join(', ')} — repris à la place du calcul.</p>` : ''}
      ${(sum.phases || []).length ? `<p class="me-small"><b>Briefs successifs</b> : ${sum.phases.map(p => `partie ${esc(p.id)}${p.title ? ` « ${esc(p.title)} »` : ''} remise vers T + ${p.at == null ? '?' : hm(p.at)}${p.trigger ? ` (${esc(p.trigger)})` : ''}`).join(' ; ')}.</p>` : ''}
      ${sum.options.length ? `<table><thead><tr><th>Retour</th><th>Condition</th><th>Vol</th><th>Retour</th></tr></thead><tbody><tr><td>${esc(String(sum.points[sum.points.length - 1]?.name || 'Base'))}</td><td class="me-small">principal</td><td>${hm(sum.flight)}</td><td>${hm(sum.transitIn)}</td></tr>${sum.options.map(o => `<tr><td>${esc(o.label)}</td><td class="me-small">${esc(o.condition)}</td><td>${hm(o.flight)}</td><td>${hm(o.transitIn)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${reports.length ? `<table><thead><tr><th>CR</th><th>Date</th><th>Vol réel</th><th>Écart</th><th>Aller</th><th>Sur zone</th><th>Retour</th></tr></thead><tbody>${reports.map(r => `<tr><td>${esc(r.missionId)}</td><td>${esc(r.date || '')}</td><td>${hm(r.flight)}</td><td>${cmp(r, 'flight')}</td><td>${r.transitOut ? hm(r.transitOut) + ' ' + cmp(r, 'transitOut') : ''}</td><td>${r.onStation ? hm(r.onStation) + ' ' + cmp(r, 'onStation') : ''}</td><td>${r.transitIn ? hm(r.transitIn) + ' ' + cmp(r, 'transitIn') : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="me-small">Aucun CR de cette mission pour comparer.</p>'}
      <label class="me-small me-toggle"><input type="checkbox" data-me-route ${routeOn() ? 'checked' : ''}> Afficher la route probable</label>
      <div data-me-routebox ${routeOn() ? '' : 'hidden'}><div class="me-routecols"><div>${sketch(sum)}</div><div>${legTable(sum.legs)}</div></div>${sum.options.map(o => `<p class="me-small"><b>Retour ${esc(o.label)}</b>${o.condition ? ` — ${esc(o.condition)}` : ''}</p>${legTable(o.legs.filter(l => l.phase === 'retour'))}`).join('')}</div>`;
    host.querySelector('[data-me-route]').onchange = e => {
      try { localStorage.setItem(ROUTE_KEY, e.target.checked ? '1' : '0'); } catch { /* stockage indisponible */ }
      host.querySelector('[data-me-routebox]').hidden = !e.target.checked;
    };
  }

  window.MissionEstimate = { estimate, summary, panel, hm, compare, performance, routeOf, distNm, designator };
})();
