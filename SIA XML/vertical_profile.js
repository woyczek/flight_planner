// Profil vertical (coupe) le long d'un cheminement : relief, obstacles, espaces aériens traversés
// (plancher → plafond, planchers ASFC suivant le relief), points du cheminement et altitude prévue.
// Partagé par le studio cartographique et le planificateur de performances : sélection des espaces
// d'un profil d'affichage, noms des points (brief, aérodromes, balises, points RNAV, radiale /
// distance), relief (tuiles Terrarium), lecture de la base SIA mémorisée par le studio.
// Exposé : window.SiaProfile = { parseRoute, build, draw, zones, selectAirspaces, resolver,
// destination, terrainSampler, loadStudio, opt }.
(() => {
  const NM = 1852, FT = 3.28084, R = 6371000, rad = d => d * Math.PI / 180;
  const dist = (a, b) => { const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon), h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); };
  const lerp = (a, b, t) => ({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });

  // « LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT » (virgules, points-virgules ou lignes) :
  // point de la mission (id ou nom), aérodrome (OACI), balise, « lat lon » ou « NOM lat lon » décimaux ;
  // « /altitude » facultatif (ft AMSL ou FL). resolve(nom) → {name, lat, lon} ou null.
  function parseRoute(text, resolve) {
    const out = [], unknown = [];
    for (const raw of String(text || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)) {
      const [spec, altRaw] = raw.split('/').map(x => x.trim());
      let alt = null;
      if (altRaw) { const m = /^(FL)?\s*(\d+)/i.exec(altRaw); if (m) alt = m[1] ? +m[2] * 100 : +m[2]; }
      const c = /^(?:(\S*[A-Za-z]\S*)\s+)?(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/.exec(spec);
      const p = c ? { name: c[1] || spec, lat: +c[2], lon: +c[3] } : resolve(spec);
      if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) out.push({ ...p, alt }); else unknown.push(spec);
    }
    return { points: out, unknown };
  }

  // Échantillonnage : ~4 points par NM (100 à 800), relief = maximum sur la ligne et ± corridorM de part
  // et d'autre ; elevation(lat, lon) → mètres (promesse). Obstacles à moins de corridorNm du trajet.
  async function build({ points, elevation, airspaces = [], obstacles = [], corridorM = 1000, corridorNm = 1 }) {
    if (points.length < 2) throw Error('Cheminement : au moins deux points.');
    const legs = []; let total = 0;
    for (let i = 1; i < points.length; i++) { const d = dist(points[i - 1], points[i]); legs.push({ a: points[i - 1], b: points[i], from: total, d }); total += d; }
    if (!total) throw Error('Cheminement de longueur nulle.');
    const n = Math.max(100, Math.min(800, Math.round(total / NM * 4))), samples = [];
    for (let i = 0; i <= n; i++) {
      const s = total * i / n, leg = legs.find(l => s <= l.from + l.d + 1e-6) || legs[legs.length - 1], t = leg.d ? (s - leg.from) / leg.d : 0, p = lerp(leg.a, leg.b, t);
      // décalage latéral perpendiculaire au segment (approximation locale plane)
      const k = Math.cos(rad(p.lat)), dx = (leg.b.lon - leg.a.lon) * k, dy = leg.b.lat - leg.a.lat, len = Math.hypot(dx, dy) || 1, off = corridorM / 111320;
      const side = [{ lat: p.lat + dx / len * off, lon: p.lon - dy / len * off / k }, { lat: p.lat - dx / len * off, lon: p.lon + dy / len * off / k }];
      samples.push({ s, ...p, side });
    }
    await Promise.all(samples.map(async q => { const h = await Promise.all([q, ...q.side].map(x => elevation(x.lat, x.lon).catch(() => NaN))); q.terrain = Math.max(0, ...h.filter(Number.isFinite)) * FT; q.center = (Number.isFinite(h[0]) ? h[0] : 0) * FT; }));
    // espaces traversés : intervalles d'échantillons à l'intérieur d'un anneau
    const box = { s: Math.min(...points.map(p => p.lat)) - .5, n: Math.max(...points.map(p => p.lat)) + .5, w: Math.min(...points.map(p => p.lon)) - .7, e: Math.max(...points.map(p => p.lon)) + .7 };
    const inRing = (lat, lon, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [yi, xi] = ring[i], [yj, xj] = ring[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } return c; };
    const crossed = [];
    for (const a of airspaces) {
      const rings = (a.rings || []).filter(r => r.length >= 3 && r.some(([la, lo]) => la > box.s && la < box.n && lo > box.w && lo < box.e));
      if (!rings.length) continue;
      let start = -1;
      for (let i = 0; i <= n + 1; i++) {
        const inside = i <= n && rings.some(r => inRing(samples[i].lat, samples[i].lon, r));
        if (inside && start < 0) start = i;
        if (!inside && start >= 0) { crossed.push({ a, i0: start, i1: i - 1 }); start = -1; }
      }
    }
    // obstacles proches : distance au segment le plus proche (approximation plane locale)
    const near = [];
    for (const o of obstacles) {
      if (o.lat < box.s || o.lat > box.n || o.lon < box.w || o.lon > box.e) continue;
      for (const l of legs) {
        const k = Math.cos(rad(o.lat)), ax = l.a.lon * k, ay = l.a.lat, bx = l.b.lon * k, by = l.b.lat, px = o.lon * k, py = o.lat;
        const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (((bx - ax) ** 2 + (by - ay) ** 2) || 1)));
        const dm = Math.hypot(px - (ax + (bx - ax) * t), py - (ay + (by - ay) * t)) * 111320;
        if (dm <= corridorNm * NM) { near.push({ ...o, s: l.from + l.d * t }); break; }
      }
    }
    const marks = [0, ...legs.map(l => l.from + l.d)].map((s, i) => ({ s, name: points[i].name, alt: points[i].alt }));
    return { total, samples, crossed, obstacles: near, marks };
  }

  const COLORS = { R: '#d32f2f', P: '#b71c1c', D: '#ef6c00', TRA: '#ef6c00', CTR: '#1565c0', TMA: '#1565c0', CTA: '#3949ab', SIV: '#2e7d32', RMZ: '#555', TMZ: '#555' };
  // Coupe : axe des distances (NM) et des altitudes (ft AMSL), espaces derrière le relief, puis
  // obstacles, points et altitude prévue ; libellés d'espaces sans recouvrement.
  function draw(ctx, data, { W, H, ceiling = 0, floor = 0, scale = 1, limitFt, title = '', abbrev = false } = {}) {
    const f = 11 * scale, padL = 58 * scale, padR = 16 * scale, padT = (title ? 34 : 18) * scale, padB = 64 * scale;
    const terrainMax = Math.max(0, ...data.samples.map(q => q.terrain)), obsMax = Math.max(0, ...data.obstacles.map(o => o.elev || 0)), altMax = Math.max(0, ...data.marks.map(m => m.alt || 0));
    const rel = t => /ASFC|AGL|SFC/i.test(t || '') && !/AMSL/i.test(t || '');
    const floorOf = c => { const mid = Math.round((c.i0 + c.i1) / 2); return (rel(c.a.lower) ? data.samples[mid].center : 0) + limitFt(c.a.lower, false); };
    const zoneMax = Math.max(0, ...data.crossed.map(floorOf).filter(v => v <= 19500).map(v => v + 1500));
    const top = ceiling > 0 ? ceiling : Math.ceil((Math.max(terrainMax + 3000, obsMax + 1500, altMax + 1500, zoneMax, 5000)) / 1000) * 1000;
    const bottom = Math.max(0, Math.min(+floor || 0, top - 1000)), X = s => padL + (W - padL - padR) * s / data.total, Y = ft => padT + (H - padT - padB) * (1 - (Math.min(Math.max(ft, bottom), top) - bottom) / (top - bottom));
    ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.font = `${f}px Arial, sans-serif`; ctx.textBaseline = 'middle';
    if (title) { ctx.fillStyle = '#17202a'; ctx.font = `bold ${f * 1.3}px Arial, sans-serif`; ctx.fillText(title, padL, 16 * scale); ctx.font = `${f}px Arial, sans-serif`; }
    // grille des altitudes
    const span = top - bottom, step = span > 20000 ? 5000 : span > 8000 ? 2000 : 1000;
    ctx.strokeStyle = '#e3e8ec'; ctx.lineWidth = 1; ctx.fillStyle = '#56626b'; ctx.textAlign = 'right';
    for (let a = Math.ceil(bottom / step) * step; a <= top; a += step) { const y = Y(a); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.fillText(a >= 10000 && a % 1000 === 0 ? `FL ${a / 100}` : `${a} ft`, padL - 6 * scale, y); }
    // espaces : bande plancher → plafond (plancher / plafond ASFC suivant le relief)
    const labels = [], taken = [], free = r => !taken.some(q => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
    for (const c of data.crossed) {
      const a = c.a, col = COLORS[a.type] || '#6d4c41';
      const lo = i => (rel(a.lower) ? data.samples[i].center : 0) + limitFt(a.lower, false), hi = i => { const v = limitFt(a.upper, true); return Number.isFinite(v) ? (rel(a.upper) ? data.samples[i].center : 0) + v : top; };
      let seen = false; for (let i = c.i0; i <= c.i1; i++) if (lo(i) < top && hi(i) > bottom) { seen = true; break; }
      if (!seen) continue; // espace entièrement au-dessus du plafond ou au-dessous du plancher de la coupe
      ctx.beginPath();
      for (let i = c.i0; i <= c.i1; i++) { const x = X(data.samples[i].s), y = Y(hi(i)); i === c.i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      for (let i = c.i1; i >= c.i0; i--) ctx.lineTo(X(data.samples[i].s), Y(lo(i)));
      ctx.closePath(); ctx.globalAlpha = .13; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 1.2 * scale; ctx.stroke();
      const mid = Math.round((c.i0 + c.i1) / 2); labels.push({ col, x: X(data.samples[mid].s), y0: Y(hi(mid)), y1: Y(lo(mid)), text: abbrev ? a.name : `${a.type} ${a.name}`, sub: `${a.lower || 'SFC'} – ${a.upper || 'UNL'}`, xa: X(data.samples[c.i0].s), xb: X(data.samples[c.i1].s), w: X(data.samples[c.i1].s) - X(data.samples[c.i0].s) });
    }
    // relief (profil maximal du corridor)
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); for (const q of data.samples) ctx.lineTo(X(q.s), Y(q.terrain)); ctx.lineTo(X(data.total), Y(0)); ctx.closePath();
    const g = ctx.createLinearGradient(0, Y(terrainMax), 0, Y(0)); g.addColorStop(0, '#b08a5a'); g.addColorStop(1, '#d9c7a3'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7a5a32'; ctx.lineWidth = 1.2 * scale; ctx.stroke();
    // obstacles : trait vertical et cote AMSL des plus hauts
    ctx.strokeStyle = '#c62828'; ctx.fillStyle = '#c62828'; ctx.textAlign = 'center';
    const tall = [...data.obstacles].sort((a, b) => (b.elev || 0) - (a.elev || 0)).slice(0, 12);
    for (const o of data.obstacles) { const x = X(o.s), yT = Y(o.elev || 0), yB = Y(Math.max(0, (o.elev || 0) - (o.hgt || 0))); ctx.lineWidth = Math.max(1, 1.4 * scale); ctx.beginPath(); ctx.moveTo(x, yB); ctx.lineTo(x, yT); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 3 * scale, yT + 4 * scale); ctx.lineTo(x, yT); ctx.lineTo(x + 3 * scale, yT + 4 * scale); ctx.stroke(); }
    for (const o of tall) { const x = X(o.s), y = Y(o.elev || 0) - 9 * scale, r = { x0: x - 18 * scale, y0: y - f / 2, x1: x + 18 * scale, y1: y + f / 2 }; if (free(r)) { taken.push(r); ctx.fillText(String(Math.round(o.elev || 0)), x, y); } }
    // libellés de TOUS les espaces traversés (visibles dans la coupe) : dans la bande, au-dessus, en
    // dessous, puis première place libre en balayant la coupe (trait de rappel vers la bande) ; faute de
    // place, posé quand même dans la bande.
    ctx.textAlign = 'center';
    const iL = padL, iR = W - padR, iT = padT, iB = H - padB;
    for (const l of labels.sort((a, b) => b.w - a.w)) {
      const w = Math.max(ctx.measureText(l.text).width, ctx.measureText(l.sub).width) + 8 * scale, hgt = f * 2.3;
      const cx = x => Math.min(iR - w / 2, Math.max(iL + w / 2, x)), rect = (x, y) => ({ x0: x - w / 2, y0: y - hgt / 2, x1: x + w / 2, y1: y + hgt / 2, x, y });
      const ok = r => r.y0 >= iT - 2 && r.y1 <= iB && r.x0 >= iL - 1 && r.x1 <= iR + 1 && free(r);
      const cands = [rect(cx(l.x), Math.max(iT + hgt / 2, (Math.max(l.y0, iT) + l.y1) / 2)), rect(cx(l.x), l.y0 - hgt / 2 - 2 * scale), rect(cx(l.x), l.y1 + hgt / 2 + 2 * scale)];
      const xs = [l.x, (l.xa + l.x) / 2, (l.x + l.xb) / 2, l.xa + w / 2, l.xb - w / 2, l.x - w, l.x + w, l.x - 2 * w, l.x + 2 * w].map(cx);
      for (let y = iT + hgt / 2; y <= iB - hgt / 2; y += hgt / 2) for (const x of xs) cands.push(rect(x, y));
      const r = cands.find(ok) || cands[0]; taken.push(r);
      if (r.y1 < l.y0 || r.y0 > l.y1 || r.x < l.xa || r.x > l.xb) { // trait de rappel vers la bande
        const bx = Math.min(l.xb, Math.max(l.xa, r.x)), by = Math.min(l.y1, Math.max(Math.max(l.y0, iT), r.y));
        ctx.strokeStyle = l.col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r.x, r.y < by ? r.y1 : r.y0); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(r.x0, r.y0, w, hgt); ctx.strokeStyle = l.col; ctx.lineWidth = .8; ctx.strokeRect(r.x0, r.y0, w, hgt); ctx.fillStyle = l.col;
      ctx.font = `bold ${f}px Arial, sans-serif`; ctx.fillText(l.text, r.x, r.y - f * .55); ctx.font = `${f * .9}px Arial, sans-serif`; ctx.fillText(l.sub, r.x, r.y + f * .6); ctx.font = `${f}px Arial, sans-serif`;
    }
    // points du cheminement et distances cumulées ; noms décalés sur une seconde ligne s'ils se chevauchent
    ctx.textAlign = 'center';
    const rowEnd = [-Infinity, -Infinity];
    for (const m of data.marks) {
      const x = X(m.s); ctx.strokeStyle = '#17202a'; ctx.setLineDash([4 * scale, 3 * scale]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `bold ${f}px Arial, sans-serif`;
      const dist = `${(m.s / NM).toFixed(m.s / NM < 10 ? 1 : 0)} NM`, w = Math.max(ctx.measureText(m.name).width, ctx.measureText(dist).width) + 8 * scale;
      const tx = Math.min(W - padR - w / 2, Math.max(padL + w / 2, x)), row = tx - w / 2 >= rowEnd[0] ? 0 : tx - w / 2 >= rowEnd[1] ? 1 : (rowEnd[0] <= rowEnd[1] ? 0 : 1);
      rowEnd[row] = tx + w / 2; const y = H - padB + (12 + row * 28) * scale;
      if (row) { ctx.strokeStyle = '#9aa5ad'; ctx.beginPath(); ctx.moveTo(x, H - padB); ctx.lineTo(tx, y - f * .7); ctx.stroke(); }
      ctx.fillStyle = '#17202a'; ctx.fillText(m.name, tx, y);
      ctx.font = `${f * .9}px Arial, sans-serif`; ctx.fillStyle = '#56626b'; ctx.fillText(dist, tx, y + 13 * scale); ctx.font = `${f}px Arial, sans-serif`;
    }
    // altitude prévue (points avec « /altitude », interpolée entre eux)
    const planned = data.marks.filter(m => Number.isFinite(m.alt));
    if (planned.length >= 2) { ctx.strokeStyle = '#6a1b9a'; ctx.lineWidth = 2.2 * scale; ctx.beginPath(); planned.forEach((m, i) => { const x = X(m.s), y = Y(m.alt); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.fillStyle = '#6a1b9a'; for (const m of planned) { ctx.beginPath(); ctx.arc(X(m.s), Y(m.alt), 3 * scale, 0, Math.PI * 2); ctx.fill(); } }
    ctx.strokeStyle = '#17202a'; ctx.lineWidth = 1; ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    ctx.restore();
  }

  // ===== Espaces d'un profil d'affichage (mêmes règles que les cartes du studio) =====
  const zNorm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const zCore = name => { const n = String(name || '').trim(), d = /^(\d+)/.exec(n); if (d) return d[1]; const w = /^(.*\D)\s+\d+\S*$/.exec(n); return w ? w[1].trim() : n; };
  const zFamily = (types, t) => types.has(t) || (t === 'RMZ-TMZ' && (types.has('RMZ') || types.has('TMZ')));
  const zAlias = (q, aliases) => /^@/.test(String(q).trim()) ? Object.keys(aliases || {}).find(k => zNorm(k) === zNorm(q)) : null;
  // Une entrée de liste désigne-t-elle cet espace ? « @ALIAS » (groupe), « R 166* » (toutes les parties),
  // fragment de nom ou d'identifiant.
  function zHit(a, q, aliases, depth = 0) {
    const alias = zAlias(q, aliases); if (alias) return depth < 1 && (aliases[alias] || []).some(m => zHit(a, m, aliases, depth + 1));
    if (/\*\s*$/.test(q)) { const base = zNorm(q), core = zCore(a.name); return !!base && [a.type + core, 'LF' + a.type + core].some(v => zNorm(v) === base); }
    const n = zNorm(q); return !!n && [a.name, a.key, a.type + a.name].some(v => zNorm(v).includes(n));
  }
  const zoneList = p => Array.isArray(p?.zoneList) ? p.zoneList : (p?.allZones === false ? String(p?.zoneList || '').split(/\r?\n|,/).map(x => x.trim()).filter(Boolean) : []);
  // Valeur d'un réglage d'élément d'un profil (défaut si absent).
  const opt = (profile, id, def) => { const v = profile?.elements?.[id]; return v === undefined || v === '' ? def : v; };
  function selectAirspaces(profile, airspaces, { aliases = {}, limitFt } = {}) {
    const types = new Set(profile?.zones || []), list = zoneList(profile), lo = parseFloat(opt(profile, 'zoneFloor', '')), hi = parseFloat(opt(profile, 'zoneCeil', ''));
    if (!types.size) return [];
    return (airspaces || []).filter(a => zFamily(types, a.type) && (!(lo > 0) || limitFt(a.upper, true) > lo) && (!(hi > 0) || limitFt(a.lower, false) < hi)
      && (!list.length || (profile.zoneMode === 'black' ? !list.some(q => zHit(a, q, aliases)) : list.some(q => zHit(a, q, aliases)))));
  }

  // ===== Noms des points =====
  // Point à une distance (NM) et un relèvement vrai (°) d'un autre (grand cercle).
  function destination(p, brgDeg, nm) {
    const d = nm / 3440.065, t = rad(brgDeg), f1 = rad(p.lat), l1 = rad(p.lon), f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
    return { lat: f2 * 180 / Math.PI, lon: (l2 * 180 / Math.PI + 540) % 360 - 180 };
  }
  // Résolution : points connus (brief : Map NOM → point), aérodromes (OACI), balises (VOR > TACAN > NDB >
  // DME), points RNAV (AIXM), « REN300010 » = balise REN, radiale magnétique 300 (déclinaison de
  // l'aérodrome le plus proche), 10 NM. Homonymes : le plus proche du point précédent (ou de ref).
  function resolver({ brief = new Map(), aero = {}, ref = { lat: 46.5, lon: 2.5 } } = {}) {
    const NAV_PREF = { VOR: 0, TACAN: 1, NDB: 2, DME: 3 }; let last = null;
    const near = list => { const r = last || ref; let b = null, d = Infinity; for (const x of list) { const e = (x.lat - r.lat) ** 2 + (x.lon - r.lon) ** 2; if (e < d) { d = e; b = x; } } return b; };
    const magVarAt = (lat, lon) => { let best = 0, d = Infinity; for (const a of aero.aerodromes || []) { if (!a.magVar) continue; const e = (a.lat - lat) ** 2 + ((a.lon - lon) * Math.cos(rad(lat))) ** 2; if (e < d) { d = e; best = a.magVar; } } return best; };
    const navaid = k => { const c = (aero.navaids || []).filter(n => String(n.id || '').toUpperCase() === k && n.kind in NAV_PREF); if (!c.length) return null; const best = Math.min(...c.map(n => NAV_PREF[n.kind])); return near(c.filter(n => NAV_PREF[n.kind] === best)); };
    const find = k => {
      if (brief.has(k)) return brief.get(k);
      const ad = (aero.aerodromes || []).find(a => String(a.icao || '').toUpperCase() === k); if (ad) return { name: ad.icao, lat: ad.lat, lon: ad.lon };
      const nv = navaid(k); if (nv) return { name: nv.id, lat: nv.lat, lon: nv.lon };
      const rn = near((aero.points || []).filter(p => String(p.id).toUpperCase() === k)); if (rn) return { name: rn.id, lat: rn.lat, lon: rn.lon };
      const m = /^([A-Z]{2,3})(\d{3})(\d{3})$/.exec(k); if (m) { const b = navaid(m[1]); if (b) return { name: k, ...destination(b, +m[2] + magVarAt(b.lat, b.lon), +m[3]) }; }
      return null;
    };
    return name => { const p = find(String(name).trim().toUpperCase()); if (p) last = p; return p; };
  }

  // ===== Relief : tuiles d'altitude Terrarium (AWS), z10 ≈ 150 m, gardées en mémoire =====
  function terrainSampler(z = 10) {
    const tiles = new Map();
    const tile = (x, y) => { const key = `${x}/${y}`; if (!tiles.has(key)) tiles.set(key, (async () => {
      const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`); if (!r.ok) throw Error(`Tuile de relief ${z}/${x}/${y} : ${r.status}`);
      const img = await createImageBitmap(await r.blob()), c = new OffscreenCanvas(256, 256), g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, 256, 256).data;
    })().catch(e => { tiles.delete(key); throw e; })); return tiles.get(key); };
    return async (lat, lon) => {
      const n = 2 ** z, xf = (lon + 180) / 360 * n, r = rad(lat), yf = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n, x = Math.floor(xf), y = Math.floor(yf);
      const d = await tile(x, y), px = Math.min(255, Math.floor((xf - x) * 256)), py = Math.min(255, Math.floor((yf - y) * 256)), i = (py * 256 + px) * 4;
      return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
    };
  }

  // ===== Données mémorisées par le studio (même navigateur) =====
  // Base SIA (IndexedDB 'sia-map-parser' : espaces, aérodromes, balises, obstacles, points RNAV), profils
  // d'affichage, alias de zones, et profil choisi pour le profil vertical dans la mission partagée.
  async function loadStudio() {
    const base = await new Promise(ok => { try { const r = indexedDB.open('sia-map-parser', 1); r.onupgradeneeded = () => r.result.createObjectStore('cache'); r.onerror = () => ok(null);
      r.onsuccess = () => { try { const q = r.result.transaction('cache').objectStore('cache').get('base'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); } catch { ok(null); } }; } catch { ok(null); } });
    const json = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
    const profiles = json('siaDisplayProfiles', []), mission = json('siaMissionShared:v1', null), vp = mission?.yaml?.vertical_profile || {};
    return { base, profiles, aliases: json('siaZoneAliases', {}), profileId: vp.profile || 'vprof', vertical: vp };
  }

  window.SiaProfile = { parseRoute, build, draw, zones: { norm: zNorm, core: zCore, family: zFamily, hit: zHit, list: zoneList }, selectAirspaces, resolver, destination, terrainSampler, loadStudio, opt };
})();
