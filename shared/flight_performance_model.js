// Modèle de performances du Flight Performance & Fuel Planner : mécanique du vol simplifiée mais cohérente,
// calibrée sur le profil avion (et donc sur les OFP SimBrief qui l'alimentent), indépendante du niveau du plan.
//
// - Atmosphère type (ISA).
// - Polaire : traînée / poids = a·Ve² + b / Ve² (Ve = vitesse équivalente ≈ Badin) ; finesse max L/D et
//   vitesse de traînée mini Ve_md, calée sur le Badin de montée (réacteur : montée économique ≈ 1,38 Ve_md,
//   « green dot » ; hélice : Vy ≈ 1 à 1,1 Ve_md), sinon sur le point de croisière (≈ k × Ve_md, valeur type).
// - Réacteur : débit = K·√θ·(1 + 0,8 M)·poussée ; turbopropulseur / piston : débit = K·puissance, rendement
//   d'hélice relatif à la croisière (≈ 0,87 à Ve_md).
// - Poussée ou puissance disponibles (régime de montée) : valeur au sol × loi de densité (réacteur σ^0,75
//   puis ∝ σ au-dessus de la tropopause, turbopropulseur σ^0,7, piston atmosphérique 1,132σ − 0,132).
// - Calibration : K par le point de croisière (altitude de référence, TAS, débit) ; poussée / puissance au
//   sol par le vario moyen de montée jusqu'à l'altitude de référence ; facteur de débit en montée par le
//   débit de montée du profil (mélange riche, régime) ; plafond = celui du modèle (vario 300 ft/min,
//   100 pour un piston) limité par le plafond du profil (limite de certification le plus souvent). Altitude de référence : profil (calibration OFP), sinon Badin / TAS, sinon celle qui rend le
//   débit de montée du profil cohérent, sinon valeur type de la classe (signalée) — jamais le niveau du plan.
//
// Exposé : window.FlightPerfModel = { create, isa, kindOf }.
(() => {
  'use strict';
  const KT_FPM = 101.269; // 1 kt de vitesse verticale = 101,27 ft/min
  function isa(h) {
    const T0 = 288.15, h1 = 36089.24, T = h <= h1 ? T0 - 0.0019812 * h : 216.65, theta = T / T0;
    const delta = h <= h1 ? Math.pow(theta, 5.25588) : Math.pow(216.65 / T0, 5.25588) * Math.exp(-(h - h1) / 20805.7);
    return { theta, delta, sigma: delta / theta, a: 38.9679 * Math.sqrt(T) };
  }
  const altFromSigma = s => { if (s >= 1) return 0; let lo = 0, hi = 80000; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; isa(m).sigma > s ? lo = m : hi = m; } return (lo + hi) / 2; };
  const S_TROP = 0.29707, LAPSE = { jet: s => s >= S_TROP ? Math.pow(s, 0.75) : Math.pow(S_TROP, 0.75) * s / S_TROP, turboprop: s => Math.pow(s, 0.7), piston: s => Math.max(0, 1.132 * s - 0.132) };
  // Valeurs types par classe : k = Ve croisière / Ve_md, finesse max, altitude de croisière, plafond, vario au sol.
  const CLASS = {
    jet: { k: 1.2, climb: 1.38, ld: 17, href: 35000, ceil: 41000, roc: 2500, label: 'réacteur' },
    turboprop: { k: 1.25, climb: 1.1, ld: 14, href: 20000, ceil: 30000, roc: 1500, label: 'turbopropulseur' },
    piston: { k: 1.3, climb: 1, ld: 10, href: 7500, ceil: 14000, roc: 700, label: 'piston' }
  };
  const bisect = (f, lo, hi, n = 60) => { let flo = f(lo); for (let i = 0; i < n; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm > 0) === (flo > 0)) { lo = m; flo = fm; } else hi = m; } return (lo + hi) / 2; };
  const golden = (f, lo, hi, n = 50) => { const g = (Math.sqrt(5) - 1) / 2; let c = hi - g * (hi - lo), d = lo + g * (hi - lo); for (let i = 0; i < n; i++) { if (f(c) > f(d)) hi = d; else lo = c; c = hi - g * (hi - lo); d = lo + g * (hi - lo); } return (lo + hi) / 2; };

  // Classe de motorisation : champ du profil, sinon base OACI (3e lettre de la description : J / T / P).
  function kindOf(profile, db) {
    if (CLASS[profile?.engineType]) return profile.engineType;
    const code = String(profile?.type || profile?.icao || profile?.id || '').toUpperCase(), row = db?.[code] || db?.[db?.__aliases?.[code]];
    const e = String(row?.description || '')[2];
    if (e === 'J') return 'jet'; if (e === 'T') return 'turboprop'; if (e === 'P') return 'piston';
    const tas = +profile?.cruise?.tasKt || 0; return profile?.jetFuel ? (tas > 320 ? 'jet' : 'turboprop') : 'piston';
  }

  function create(profile, { db } = {}) {
    const kind = kindOf(profile, db), C = CLASS[kind], lapse = LAPSE[kind], jet = kind === 'jet', notes = [];
    const num = v => v === null || v === undefined || v === '' ? NaN : +v;
    const cr = profile.cruise || {}, cl = profile.climb || {}, de = profile.descent || {};
    const tasRef = num(cr.tasKt), ffRef = num(cr.fuelFlowPerHour);
    if (!(tasRef > 0) || !(ffRef > 0)) throw Error('Profil incomplet : TAS et fuel flow de croisière nécessaires.');
    const ceilGiven = num(cr.ceilingFt) > 0 ? num(cr.ceilingFt) : null, rocAvg = Math.abs(num(cl.rateFpm)) > 0 ? Math.abs(num(cl.rateFpm)) : null;
    const climbFFProfile = num(cl.fuelFlowPerHour) > 0 ? num(cl.fuelFlowPerHour) : null;

    // Modèle pour une altitude de référence, une finesse et une poussée / puissance au sol données.
    function make(hRef, ld, p0) {
      const aR = isa(hRef), veRef = tasRef * Math.sqrt(aR.sigma), veMd = num(cl.iasKt) > 0 ? num(cl.iasKt) / C.climb : veRef / C.k;
      const a = 1 / (2 * ld * veMd * veMd), b = veMd * veMd / (2 * ld), dw = ve => a * ve * ve + b / (ve * ve);
      const tasOf = (h, ve) => ve / Math.sqrt(isa(h).sigma);
      const sfc = (h, tas) => { const at = isa(h); return Math.sqrt(at.theta) * (1 + .8 * tas / at.a); }, eta = ve => Math.min(1, .55 + .45 * ve / (1.4 * veMd));
      const K = jet ? ffRef / (sfc(hRef, tasRef) * dw(veRef)) : ffRef / (dw(veRef) * tasRef);
      const avail = h => p0 * lapse(isa(h).sigma);
      const roc = (h, ve, frac = 1) => { const tas = tasOf(h, ve); return jet ? KT_FPM * tas * (frac * avail(h) - dw(ve)) : KT_FPM * (frac * avail(h) * eta(ve) - dw(ve) * tas); };
      const ffAt = (h, frac = 1, tas = tasOf(h, veMd * 1.4)) => jet ? K * sfc(h, tas) * frac * avail(h) : K * frac * avail(h);
      const vy = (h, frac = 1) => { const ve = golden(v => roc(h, v, frac), .8 * veMd, 2.6 * veMd); return { ve, tas: tasOf(h, ve), roc: roc(h, ve, frac) }; };
      const vx = h => golden(v => roc(h, v) / tasOf(h, v), .8 * veMd, 2.6 * veMd);
      return { hRef, ld, p0, aR, veRef, veMd, dw, tasOf, K, sfc, eta, avail, roc, ffAt, vy, vx, mRef: tasRef / aR.a, pRef: dw(veRef) * tasRef };
    }
    const climbVe = (m, h) => num(cl.iasKt) > 0 ? num(cl.iasKt) : num(cl.tasKt) > 0 ? num(cl.tasKt) * Math.sqrt(isa(m.hRef / 2).sigma) : m.vy(h).ve;
    // Montée intégrée de 0 à hTop (vitesse de montée du profil, ou Vy) : temps, distance air, carburant.
    function climbWith(m, hTop, { speed = 'profile', frac = 1 } = {}) {
      let t = 0, d = 0, f = 0; const dh = Math.max(100, hTop / 150);
      for (let h = 0; h < hTop - 1e-6; h += dh) {
        const step = Math.min(dh, hTop - h), hm = h + step / 2, ve = speed === 'vy' ? m.vy(hm, frac).ve : climbVe(m, hm), r = m.roc(hm, ve, frac);
        if (!(r > 50)) return null;
        const tas = m.tasOf(hm, ve), dt = step / r; t += dt; d += tas * dt / 60; f += m.ffAt(hm, frac, tas) * (m.climbFactor || 1) * dt / 60;
      }
      return { minutes: t, nm: d, fuel: f, ffAvg: t ? f / (t / 60) : 0 };
    }
    // Poussée / puissance au sol telle que le vario moyen jusqu'à hRef soit celui du profil.
    function calibrateP0(hRef, ld) {
      const base = make(hRef, ld, 1), need = jet ? base.dw(base.veMd) : base.dw(base.veMd) * base.veMd;
      if (!rocAvg) { const ve = num(cl.iasKt) > 0 || num(cl.tasKt) > 0 ? climbVe(base, 0) : 1.3 * base.veMd; return jet ? C.roc / (KT_FPM * ve) + base.dw(ve) : (C.roc / KT_FPM + base.dw(ve) * ve) / base.eta(ve); } // vario type au sol
      const avg = p0 => { const c = climbWith(make(hRef, ld, p0), hRef); return c ? hRef / c.minutes : 0; };
      return bisect(p0 => avg(p0) - rocAvg, need * 1.01, need * 60);
    }
    // Plafond pratique du modèle : vario max = 300 ft/min (réacteur, turbopropulseur) ou 100 ft/min (piston).
    const rocCeil = kind === 'piston' ? 100 : 300;
    const ceilingOf = m => { if (m.vy(0).roc < rocCeil) return 0; return bisect(h => m.vy(h).roc - rocCeil, 0, 70000, 40); };
    const calibrate = hRef => make(hRef, C.ld, calibrateP0(hRef, C.ld));

    // Altitude de référence du point de croisière.
    let hRef = num(cr.refAltFt), refSrc = 'profil (altitude de référence)';
    if (!(hRef > 0) && num(cr.iasKt) > 0 && tasRef > num(cr.iasKt)) { hRef = altFromSigma((num(cr.iasKt) / tasRef) ** 2); refSrc = 'déduite du Badin et de la TAS de croisière'; }
    if (!(hRef > 0) && climbFFProfile && rocAvg) {
      // celle pour laquelle le débit moyen de montée du modèle égale celui du profil
      let best = null; const top = Math.min(ceilGiven || C.ceil * 1.2, 51000);
      for (let h = 2000; h <= top; h += 1000) { const m = make(h, C.ld, calibrateP0(h, C.ld)), c = climbWith(m, h); if (!c) continue; const e = Math.abs(c.ffAvg / climbFFProfile - 1); if (!best || e < best.e) best = { h, e }; }
      if (best && best.e < .15) { hRef = best.h; refSrc = `déduite de la cohérence montée / croisière (écart ${Math.round(best.e * 100)} %)`; }
    }
    if (!(hRef > 0)) { hRef = ceilGiven ? Math.min(C.href, ceilGiven * .85) : C.href; refSrc = `estimée (valeur type ${C.label}) — renseigne « Altitude de référence (ft) » ou calibre sur un OFP SimBrief`; }
    const M = calibrate(hRef), modelCeil = ceilingOf(M), ceiling = ceilGiven ? Math.min(modelCeil, ceilGiven) : modelCeil;
    if (ceilGiven && ceilGiven < modelCeil) notes.push(`Plafond limité par le profil : ${Math.round(ceilGiven)} ft (le modèle atteindrait ${Math.round(modelCeil)} ft à ${rocCeil} ft/min).`);
    if (ceilGiven && ceilGiven > modelCeil + 1000) notes.push(`Plafond du profil (${Math.round(ceilGiven)} ft) au-dessus du plafond de performance du modèle (${Math.round(modelCeil)} ft à ${rocCeil} ft/min).`);
    // Facteur de débit en montée : débit moyen de montée du profil / débit du modèle (borné 0,5–2).
    let climbFactor = 1; M.climbFactor = 1; { const c = climbFFProfile ? climbWith(M, Math.min(hRef, ceiling)) : null; if (c?.ffAvg > 0) { climbFactor = M.climbFactor = Math.min(2, Math.max(.5, climbFFProfile / c.ffAvg)); if (Math.abs(climbFactor - 1) > .05) notes.push(`Débit de montée recalé sur le profil (× ${climbFactor.toFixed(2)}).`); } }

    // Croisière à l'altitude h : régime « eco » (distance max : Ve = 3^¼·Ve_md réacteur, Ve_md hélice) ou
    // « normal » (réacteur : Mach du profil, Badin plafonné ; hélice : puissance du profil, plein gaz au-dessus).
    const mmo = M.mRef + .04, veCap = Math.max(M.veRef, 290);
    function powerSpeed(h, P) { const s = Math.sqrt(isa(h).sigma), g = ve => M.dw(ve) * ve / s - P, vmp = Math.pow(3, -.25) * M.veMd; if (g(vmp) > 0) return null; return bisect(g, vmp, 6 * M.veMd); }
    function cruise(h, mode = 'normal') {
      if (h > ceiling + 1) return { h, ok: false, reason: 'ceiling' };
      const at = isa(h), s = Math.sqrt(at.sigma); let ve;
      if (mode === 'eco') ve = jet ? Math.pow(3, .25) * M.veMd : M.veMd;
      else if (jet) ve = Math.min(M.mRef * at.a * s, veCap);
      else ve = powerSpeed(h, Math.min(M.pRef, .98 * M.avail(h)));
      if (!ve) return { h, ok: false, reason: 'thrust' };
      let tas = ve / s; if (jet && tas > mmo * at.a) { tas = mmo * at.a; ve = tas * s; }
      const need = jet ? M.dw(ve) : M.dw(ve) * tas;
      if (!(need <= M.avail(h) * (jet ? .92 : .98) * 1.001)) return { h, ok: false, reason: 'thrust' };
      const ff = jet ? M.K * M.sfc(h, tas) * M.dw(ve) : M.K * need;
      return { h, ok: true, mode, tas, ias: ve, mach: tas / at.a, ff, sr: tas / ff, powerPct: jet ? need / M.avail(h) * 100 : need / M.avail(0) * 100 };
    }
    // Descente : vario, TAS et débit du profil (sinon valeurs types).
    const desc = { rate: Math.abs(num(de.rateFpm)) || (jet ? 2000 : 700), tas: num(de.tasKt) || tasRef * .85, ff: num(de.fuelFlowPerHour) || ffRef * (jet ? .3 : .5) };
    function trip(h, D, wc = 0, mode = 'normal', climbSpeed = 'profile') {
      const c = h > 0 ? climbWith(M, h, { speed: climbSpeed }) : { minutes: 0, nm: 0, fuel: 0 };
      if (!c) return { h, ok: false, reason: 'ceiling' };
      const k = cruise(h, mode); if (!k.ok) return { h, ok: false, reason: 'thrust' };
      const td = h / desc.rate, dd = desc.tas * td / 60, fd = desc.ff * td / 60, dcr = D - c.nm - dd;
      if (dcr < 0) return { h, ok: false, reason: 'short' };
      const gs = Math.max(60, k.tas + wc), tcr = dcr / gs * 60, fuel = c.fuel + fd + k.ff * tcr / 60;
      return { h, ok: true, mode, fuel, minutes: c.minutes + td + tcr, eff: D / fuel, tas: k.tas, ias: k.ias, mach: k.mach, ff: k.ff, gs, climb: c, cruiseNm: dcr };
    }
    // Montée optimale à l'altitude h : Vy (vario max), Vx (pente max), débit, carburant par 1000 ft.
    function climbPoint(h) { const y = M.vy(h), xve = M.vx(h), ff = M.ffAt(h, 1, y.tas) * climbFactor; return { h, vyIas: y.ve, vyTas: y.tas, roc: y.roc, vxIas: xve, ff, fuelPer1000: y.roc > 0 ? ff / y.roc * 1000 / 60 : Infinity, profileRoc: M.roc(h, climbVe(M, h)) }; }
    // Régimes de la table RPM / N1 : poussée / puissance correspondant au débit de la ligne, vario à Vy et
    // carburant par 1000 ft à l'altitude h (au-delà du disponible : plein gaz).
    function settingAt(ffRow, h) { const full = M.ffAt(h, 1, M.vy(h).tas) * climbFactor, frac = Math.min(1, ffRow / full), y = M.vy(h, frac), ff = full * frac; return { frac, roc: y.roc, ias: y.ve, ff, fuelPer1000: y.roc > 20 ? ff / y.roc * 1000 / 60 : Infinity }; }

    return { kind, label: C.label, hRef, refSrc, estimatedRef: /estimée/.test(refSrc), ceiling, modelCeiling: modelCeil, ceilingGiven: ceilGiven, climbFactor, ld: M.ld, veMd: M.veMd, mRef: M.mRef, notes,
      cruise, trip, climbPoint, climbTo: (h, o) => climbWith(M, h, o), settingAt, desc, isa,
      // Vario et TAS au Badin de montée du profil à l'altitude h (profil vertical du studio et du planificateur).
      climbAt: h => { if (h > ceiling) return { roc: 0, tas: 0 }; const ve = climbVe(M, h); return { roc: M.roc(h, ve), tas: M.tasOf(h, ve) }; } };
  }
  window.FlightPerfModel = { create, isa, kindOf };
})();
