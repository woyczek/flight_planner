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
  // Messages dans la langue de la page (fr, en, de, es).
  const tl = (...r) => r[Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'))] || r[0];

  /** Atmosphère à l'altitude pression h (ft), écart ISA dT (°C, 0 = standard) : { theta (T / T0), delta (p / p0),
   *  sigma (ρ / ρ0), a (vitesse du son, kt) } ; tropopause à 36 089 ft. La pression dépend de l'altitude pression
   *  seule (niveaux de vol) ; l'écart de température change la densité et la vitesse du son. */
  function isa(h, dT = 0) {
    const T0 = 288.15,
      h1 = 36089.24,
      Ts = h <= h1 ? T0 - 0.0019812 * h : 216.65,
      T = Ts + dT,
      theta = T / T0;
    const delta = h <= h1 ? Math.pow(Ts / T0, 5.25588) : Math.pow(216.65 / T0, 5.25588) * Math.exp(-(h - h1) / 20805.7);
    return {
      theta,
      delta,
      sigma: delta / theta,
      a: 38.9679 * Math.sqrt(T)
    };
  }
  /** Altitude ISA (ft) de rapport de densité s (inverse de isa, par dichotomie). */
  const altFromSigma = s => {
    if (s >= 1) return 0;
    let lo = 0,
      hi = 80000;
    for (let i = 0; i < 50; i++) {
      const m = (lo + hi) / 2;
      isa(m).sigma > s ? lo = m : hi = m;
    }
    return (lo + hi) / 2;
  };
  const S_TROP = 0.29707,
    LAPSE = {
      jet: s => s >= S_TROP ? Math.pow(s, 0.75) : Math.pow(S_TROP, 0.75) * s / S_TROP,
      turboprop: s => Math.pow(s, 0.7),
      piston: s => Math.max(0, 1.132 * s - 0.132)
    };
  // Valeurs types par classe : k = Ve croisière / Ve_md, finesse max, altitude de croisière, plafond, vario au sol.
  const CLASS = {
    jet: {
      k: 1.2,
      climb: 1.38,
      ld: 17,
      href: 35000,
      refRange: [18000, 43000],
      ceil: 41000,
      roc: 2500,
      label: ['réacteur', 'jet', 'Strahltriebwerk', 'reactor']
    },
    turboprop: {
      k: 1.25,
      climb: 1.1,
      ld: 14,
      href: 20000,
      refRange: [8000, 31000],
      ceil: 30000,
      roc: 1500,
      label: ['turbopropulseur', 'turboprop', 'Turboprop', 'turbohélice']
    },
    piston: {
      k: 1.3,
      climb: 1,
      ld: 10,
      href: 7500,
      refRange: [2000, 18000],
      ceil: 14000,
      roc: 700,
      label: ['piston', 'piston', 'Kolbenmotor', 'pistón']
    }
  };
  /** Racine de f sur [lo, hi] par dichotomie (n itérations) ; suppose un changement de signe. */
  const bisect = (f, lo, hi, n = 60) => {
    let flo = f(lo);
    for (let i = 0; i < n; i++) {
      const m = (lo + hi) / 2,
        fm = f(m);
      if ((fm > 0) === (flo > 0)) {
        lo = m;
        flo = fm;
      } else hi = m;
    }
    return (lo + hi) / 2;
  };
  /** Maximum de f sur [lo, hi] par section dorée (n itérations) : abscisse du maximum. */
  const golden = (f, lo, hi, n = 50) => {
    const g = (Math.sqrt(5) - 1) / 2;
    let c = hi - g * (hi - lo),
      d = lo + g * (hi - lo);
    for (let i = 0; i < n; i++) {
      if (f(c) > f(d)) hi = d;
      else lo = c;
      c = hi - g * (hi - lo);
      d = lo + g * (hi - lo);
    }
    return (lo + hi) / 2;
  };

  // Classe de motorisation : champ du profil, sinon base OACI (3e lettre de la description : J / T / P).
  function kindOf(profile, db) {
    if (CLASS[profile?.engineType]) return profile.engineType;
    const code = String(profile?.type || profile?.icao || profile?.id || '').toUpperCase(),
      row = db?.[code] || db?.[db?.__aliases?.[code]];
    const e = String(row?.description || '')[2];
    if (e === 'J') return 'jet';
    if (e === 'T') return 'turboprop';
    if (e === 'P') return 'piston';
    const tas = +profile?.cruise?.tasKt || 0;
    return profile?.jetFuel ? (tas > 320 ? 'jet' : 'turboprop') : 'piston';
  }

  /** Modèle de performances calibré sur un profil d'appareil (et la base des types db pour la motorisation) : polaire, poussée / puissance, consommation, plafond. Lève une erreur si la TAS ou le débit de croisière manquent. Retourne les calculs exportés (cruise, trip, climbTo, climbPoint, climbOpt, manualLaw…). */
  function create(profile, {
    db,
    dIsa = 0,
    apd = null
  } = {}) {
    const kind = kindOf(profile, db),
      C = CLASS[kind],
      lapse = LAPSE[kind],
      jet = kind === 'jet',
      notes = [];
    /** Nombre d'un champ du profil ; NaN si vide. */
    const num = v => v === null || v === undefined || v === '' ? NaN : +v;
    const cr = profile.cruise || {},
      cl = profile.climb || {},
      de = profile.descent || {};
    const tasRef = num(cr.tasKt),
      ffRef = num(cr.fuelFlowPerHour);
    if (!(tasRef > 0) || !(ffRef > 0)) throw Object.assign(Error(tl('Profil incomplet : TAS et fuel flow de croisière nécessaires.', 'Incomplete profile: cruise TAS and fuel flow required.', 'Profil unvollständig: Reiseflug-TAS und -Verbrauch erforderlich.', 'Perfil incompleto: se requieren TAS y flujo de crucero.')), { fields: [!(tasRef > 0) && 'cruise.tasKt', !(ffRef > 0) && 'cruise.fuelFlowPerHour'].filter(Boolean) }); // champs manquants (liens de la page)
    // Fiche EUROCONTROL APD du type (AircraftDB/aircraft_perf.js), si fournie : plafond pratique (FL) et Mach de
    // croisière — références quand le profil ne donne ni plafond ni altitude de référence.
    const apdCr = apd?.cruise || {},
      apdCeil = num(apdCr.ceilingFL) > 0 ? num(apdCr.ceilingFL) * 100 : null,
      apdMach = num(apdCr.mach) > 0 ? num(apdCr.mach) : null;
    const ceilGiven = num(cr.ceilingFt) > 0 ? num(cr.ceilingFt) : apdCeil,
      ceilSrc = num(cr.ceilingFt) > 0 ? 'profile' : apdCeil ? 'apd' : null,
      rocAvg = Math.abs(num(cl.rateFpm)) > 0 ? Math.abs(num(cl.rateFpm)) : null;
    const climbFFProfile = num(cl.fuelFlowPerHour) > 0 ? num(cl.fuelFlowPerHour) : null;
    // Météo : écart ISA (°C). Le profil (et son calibrage) est en atmosphère standard ; les calculs de vol
    // utilisent l'atmosphère du jour (atm) : air chaud = moins dense → TAS plus grande à Badin égal, poussée /
    // puissance et plafond plus faibles, consommation spécifique du réacteur plus forte (√θ).
    dIsa = Number.isFinite(+dIsa) ? Math.max(-60, Math.min(60, +dIsa)) : 0;
    const atm = h => isa(h, dIsa);

    // Modèle pour une altitude de référence, une finesse et une poussée / puissance au sol données.
    function make(hRef, ld, p0, A = isa) {
      const aR = isa(hRef),
        veRef = tasRef * Math.sqrt(aR.sigma),
        veMd = num(cl.iasKt) > 0 ? num(cl.iasKt) / C.climb : veRef / C.k;
      const a = 1 / (2 * ld * veMd * veMd),
        b = veMd * veMd / (2 * ld),
        dw = ve => a * ve * ve + b / (ve * ve);
      /** TAS (kt) d'une vitesse équivalente ve à l'altitude h. */
      const tasOf = (h, ve) => ve / Math.sqrt(A(h).sigma);
      /** Consommation spécifique relative d'un réacteur : √θ × (1 + 0,8 M). */
      const sfcIn = at => (h, tas) => {
          const x = at(h);
          return Math.sqrt(x.theta) * (1 + .8 * tas / x.a);
        },
        sfc = sfcIn(A),
        eta = ve => Math.min(1, .55 + .45 * ve / (1.4 * veMd));
      const K = jet ? ffRef / (sfcIn(isa)(hRef, tasRef) * dw(veRef)) : ffRef / (dw(veRef) * tasRef); // calibrage : standard
      /** Poussée (réacteur) ou puissance (hélice) disponible à l'altitude h, gaz à fond. */
      const avail = h => p0 * lapse(A(h).sigma);
      /** Vario (ft/min) à l'altitude h, vitesse équivalente ve, fraction de gaz frac. */
      const roc = (h, ve, frac = 1) => {
        const tas = tasOf(h, ve);
        return jet ? KT_FPM * tas * (frac * avail(h) - dw(ve)) : KT_FPM * (frac * avail(h) * eta(ve) - dw(ve) * tas);
      };
      const ffAt = (h, frac = 1, tas = tasOf(h, veMd * 1.4)) => jet ? K * sfc(h, tas) * frac * avail(h) : K * frac * avail(h);
      /** Vitesse du meilleur taux de montée à l'altitude h : { ve, tas, roc }. */
      const vy = (h, frac = 1) => {
        const ve = golden(v => roc(h, v, frac), .8 * veMd, 2.6 * veMd);
        return {
          ve,
          tas: tasOf(h, ve),
          roc: roc(h, ve, frac)
        };
      };
      /** Vitesse du meilleur angle de montée (Ve) à l'altitude h. */
      const vx = h => golden(v => roc(h, v) / tasOf(h, v), .8 * veMd, 2.6 * veMd);
      return {
        hRef,
        ld,
        p0,
        aR,
        veRef,
        veMd,
        dw,
        tasOf,
        K,
        sfc,
        eta,
        avail,
        roc,
        ffAt,
        vy,
        vx,
        mRef: tasRef / aR.a,
        pRef: dw(veRef) * tasRef
      };
    }
    // Badin de montée du profil ; réacteur : Badin puis Mach au-dessus de l'altitude de conjonction (Mach de montée =
    // Mach de croisière du profil), sans quoi un Badin constant dépasse le Mach critique en altitude.
    const climbVe = (m, h) => {
      const v = num(cl.iasKt) > 0 ? num(cl.iasKt) : num(cl.tasKt) > 0 ? num(cl.tasKt) * Math.sqrt(isa(m.hRef / 2).sigma) : m.vy(h).ve;
      if (!jet || !(m.mRef > 0)) return v;
      const at = atm(h);
      return Math.min(v, m.mRef * at.a * Math.sqrt(at.sigma));
    };
    // Montée intégrée de 0 à hTop (vitesse de montée du profil, ou Vy) : temps, distance air, carburant.
    // speed : 'profile' (Badin du profil), 'vy', ou fonction h → { ve, frac } (loi de montée optimale).
    function climbWith(m, hTop, {
      speed = 'profile',
      frac = 1
    } = {}) {
      let t = 0,
        d = 0,
        f = 0;
      const dh = Math.max(100, hTop / 150);
      for (let h = 0; h < hTop - 1e-6; h += dh) {
        const step = Math.min(dh, hTop - h),
          hm = h + step / 2,
          law = typeof speed === 'function' ? speed(hm) : null,
          fr = law ? law.frac : frac,
          ve = law ? law.ve : speed === 'vy' ? m.vy(hm, fr).ve : climbVe(m, hm),
          r = m.roc(hm, ve, fr);
        if (!(r > 50)) return null;
        const tas = m.tasOf(hm, ve),
          dt = step / r;
        t += dt;
        d += tas * dt / 60;
        f += m.ffAt(hm, fr, tas) * (m.climbFactor || 1) * dt / 60;
      }
      return {
        minutes: t,
        nm: d,
        fuel: f,
        ffAvg: t ? f / (t / 60) : 0
      };
    }
    // Poussée / puissance au sol telle que le vario moyen jusqu'à hRef soit celui du profil.
    function calibrateP0(hRef, ld) {
      const base = make(hRef, ld, 1),
        need = jet ? base.dw(base.veMd) : base.dw(base.veMd) * base.veMd;
      if (!rocAvg) {
        const ve = num(cl.iasKt) > 0 || num(cl.tasKt) > 0 ? climbVe(base, 0) : 1.3 * base.veMd;
        return jet ? C.roc / (KT_FPM * ve) + base.dw(ve) : (C.roc / KT_FPM + base.dw(ve) * ve) / base.eta(ve);
      } // vario type au sol
      /** Vario moyen jusqu'à l'altitude de référence pour une poussée / puissance au sol p0 (calibrage). */
      const avg = p0 => {
        const c = climbWith(make(hRef, ld, p0), hRef);
        return c ? hRef / c.minutes : 0;
      };
      return bisect(p0 => avg(p0) - rocAvg, need * 1.01, need * 60);
    }
    // Plafond pratique du modèle : vario max = 300 ft/min (réacteur, turbopropulseur) ou 100 ft/min (piston).
    const rocCeil = kind === 'piston' ? 100 : 300;
    /** Plafond (ft) d'un modèle : altitude où le vario à Vy tombe au vario résiduel (300 ft/min, 100 pour un piston). */
    const ceilingOf = m => {
      if (m.vy(0).roc < rocCeil) return 0;
      return bisect(h => m.vy(h).roc - rocCeil, 0, 70000, 40);
    };
    /** Modèle calibré pour une altitude de référence (poussée / puissance au sol ajustée sur le vario du profil). */
    const calibrate = hRef => make(hRef, C.ld, calibrateP0(hRef, C.ld));

    // Altitude de référence du point de croisière.
    let estimated = false;
    let hRef = num(cr.refAltFt),
      refSrc = tl('profil (altitude de référence)', 'profile (reference altitude)', 'Profil (Bezugshöhe)', 'perfil (altitud de referencia)');
    if (!(hRef > 0) && num(cr.iasKt) > 0 && tasRef > num(cr.iasKt)) {
      hRef = altFromSigma((num(cr.iasKt) / tasRef) ** 2);
      refSrc = tl('déduite du Badin et de la TAS de croisière', 'derived from cruise IAS and TAS', 'aus Reiseflug-IAS und -TAS abgeleitet', 'deducida de la IAS y la TAS de crucero');
    }
    if (!(hRef > 0) && jet && apdMach) {
      // réacteur : altitude où le Mach de croisière APD donne la TAS de croisière du profil (au-dessus de la
      // tropopause la vitesse du son ne baisse plus : niveau type de la classe, sous le plafond)
      const f = h => apdMach * isa(h).a - tasRef;
      hRef = f(0) < 0 ? C.href : f(36089) > 0 ? Math.min(C.href, (ceilGiven || C.ceil) - 2000) : bisect(f, 0, 36089);
      hRef = Math.round(Math.min(Math.max(hRef, C.refRange[0]), (ceilGiven || C.ceil) - 1000) / 500) * 500;
      refSrc = tl(`déduite du Mach de croisière EUROCONTROL (M${apdMach.toFixed(2)}) et de la TAS du profil`, `derived from the EUROCONTROL cruise Mach (M${apdMach.toFixed(2)}) and the profile TAS`, `aus der EUROCONTROL-Reisemachzahl (M${apdMach.toFixed(2)}) und der Profil-TAS abgeleitet`, `deducida del Mach de crucero EUROCONTROL (M${apdMach.toFixed(2)}) y la TAS del perfil`);
    }
    if (!(hRef > 0) && climbFFProfile && rocAvg) {
      // celle pour laquelle le débit moyen de montée du modèle égale celui du profil
      let best = null;
      const top = Math.min(ceilGiven ? ceilGiven - 1000 : C.ceil * 1.2, C.refRange[1], 51000);
      for (let h = C.refRange[0]; h <= top; h += 1000) {
        const m = make(h, C.ld, calibrateP0(h, C.ld)),
          c = climbWith(m, h);
        if (!c) continue;
        const e = Math.abs(c.ffAvg / climbFFProfile - 1);
        if (!best || e < best.e) best = {
          h,
          e
        };
      }
      // optimum en bord de plage = estimation non concluante (le débit de montée seul ne situe pas la croisière)
      if (best && best.e < .15 && best.h > C.refRange[0] && best.h < top) {
        hRef = best.h;
        refSrc = tl(`déduite de la cohérence montée / croisière (écart ${Math.round(best.e * 100)} %)`, `derived from climb / cruise consistency (deviation ${Math.round(best.e * 100)} %)`, `aus der Stimmigkeit Steigflug / Reiseflug abgeleitet (Abweichung ${Math.round(best.e * 100)} %)`, `deducida de la coherencia ascenso / crucero (desviación ${Math.round(best.e * 100)} %)`);
      }
    }
    if (!(hRef > 0)) {
      hRef = ceilGiven ? Math.min(C.href, ceilGiven * .85) : C.href;
      refSrc = tl(`estimée (valeur type ${tl(...C.label)}) — renseigne « Altitude de référence (ft) » ou calibre sur un OFP SimBrief`, `estimated (typical ${tl(...C.label)} value) — fill in “Reference altitude (ft)” or calibrate on a SimBrief OFP`, `geschätzt (typischer Wert ${tl(...C.label)}) — „Bezugshöhe (ft)“ ausfüllen oder mit einem SimBrief-OFP kalibrieren`, `estimada (valor típico ${tl(...C.label)}) — rellene «Altitud de referencia (ft)» o calibre con un OFP de SimBrief`);
      estimated = true;
    }
    const M0 = calibrate(hRef),
      M = dIsa ? make(hRef, C.ld, M0.p0, atm) : M0,
      modelCeil = ceilingOf(M),
      ceiling = ceilGiven ? Math.min(modelCeil, ceilGiven) : modelCeil;
    if (ceilGiven && ceilGiven < modelCeil) notes.push(ceilSrc === 'apd' ? tl(`Plafond limité au plafond EUROCONTROL du type : ${Math.round(ceilGiven)} ft (le modèle atteindrait ${Math.round(modelCeil)} ft à ${rocCeil} ft/min).`, `Ceiling limited to the type’s EUROCONTROL ceiling: ${Math.round(ceilGiven)} ft (the model would reach ${Math.round(modelCeil)} ft at ${rocCeil} ft/min).`, `Gipfelhöhe auf die EUROCONTROL-Gipfelhöhe des Typs begrenzt: ${Math.round(ceilGiven)} ft (das Modell erreichte ${Math.round(modelCeil)} ft bei ${rocCeil} ft/min).`, `Techo limitado al techo EUROCONTROL del tipo: ${Math.round(ceilGiven)} ft (el modelo alcanzaría ${Math.round(modelCeil)} ft a ${rocCeil} ft/min).`) : tl(`Plafond limité par le profil : ${Math.round(ceilGiven)} ft (le modèle atteindrait ${Math.round(modelCeil)} ft à ${rocCeil} ft/min).`, `Ceiling limited by the profile: ${Math.round(ceilGiven)} ft (the model would reach ${Math.round(modelCeil)} ft at ${rocCeil} ft/min).`, `Gipfelhöhe durch das Profil begrenzt: ${Math.round(ceilGiven)} ft (das Modell erreichte ${Math.round(modelCeil)} ft bei ${rocCeil} ft/min).`, `Techo limitado por el perfil: ${Math.round(ceilGiven)} ft (el modelo alcanzaría ${Math.round(modelCeil)} ft a ${rocCeil} ft/min).`));
    if (ceilGiven && ceilGiven > modelCeil + 1000) notes.push(tl(`Plafond du profil (${Math.round(ceilGiven)} ft) au-dessus du plafond de performance du modèle (${Math.round(modelCeil)} ft à ${rocCeil} ft/min).`, `Profile ceiling (${Math.round(ceilGiven)} ft) above the model’s performance ceiling (${Math.round(modelCeil)} ft at ${rocCeil} ft/min).`, `Gipfelhöhe des Profils (${Math.round(ceilGiven)} ft) über der Leistungsgipfelhöhe des Modells (${Math.round(modelCeil)} ft bei ${rocCeil} ft/min).`, `Techo del perfil (${Math.round(ceilGiven)} ft) por encima del techo de rendimiento del modelo (${Math.round(modelCeil)} ft a ${rocCeil} ft/min).`));
    // Facteur de débit en montée : débit moyen de montée du profil / débit du modèle (borné 0,5–2).
    let climbFactor = 1;
    M.climbFactor = 1;
    {
      const c = climbFFProfile ? climbWith(M, Math.min(hRef, ceiling)) : null;
      if (c?.ffAvg > 0) {
        climbFactor = M.climbFactor = Math.min(2, Math.max(.5, climbFFProfile / c.ffAvg));
        if (Math.abs(climbFactor - 1) > .05) notes.push(tl(`Débit de montée recalé sur le profil (× ${climbFactor.toFixed(2)}).`, `Climb fuel flow adjusted to the profile (× ${climbFactor.toFixed(2)}).`, `Steigflugverbrauch an das Profil angepasst (× ${climbFactor.toFixed(2)}).`, `Flujo de ascenso ajustado al perfil (× ${climbFactor.toFixed(2)}).`));
      }
    }

    // Croisière à l'altitude h : régime « eco » (distance max : Ve = 3^¼·Ve_md réacteur, Ve_md hélice) ou
    // « normal » (réacteur : Mach du profil, Badin plafonné ; hélice : puissance du profil, plein gaz au-dessus).
    const mmo = M.mRef + .04,
      veCap = Math.max(M.veRef, 290);

    /** Vitesse équivalente (au-dessus de la traînée minimale) à laquelle la puissance P équilibre la traînée ; null si P ne suffit pas. */
    function powerSpeed(h, P) {
      const s = Math.sqrt(atm(h).sigma),
        g = ve => M.dw(ve) * ve / s - P,
        vmp = Math.pow(3, -.25) * M.veMd;
      if (g(vmp) > 0) return null;
      return bisect(g, vmp, 6 * M.veMd);
    }

    /** Croisière à l'altitude h : 'normal' (Mach ou puissance du profil ; réacteur limité par la poussée au-dessus) ou 'eco' (distance maximale, jamais plus rapide). Sortie : { ok, tas, ias, mach, ff, sr, limited, powerPct } ou { ok: false, reason: 'ceiling' | 'thrust' }. */
    function cruise(h, mode = 'normal') {
      if (h > ceiling + 1) return {
        h,
        ok: false,
        reason: 'ceiling'
      };
      const at = atm(h),
        s = Math.sqrt(at.sigma);
      let ve;
      if (mode === 'eco') ve = jet ? Math.min(Math.pow(3, .25) * M.veMd, M.mRef * at.a * s, veCap) : M.veMd; // jamais plus rapide que la croisière du profil
      else if (jet) ve = Math.min(M.mRef * at.a * s, veCap);
      else ve = powerSpeed(h, Math.min(M.pRef, .98 * M.avail(h)));
      if (!ve) return {
        h,
        ok: false,
        reason: 'thrust'
      };
      let tas = ve / s;
      if (jet && tas > mmo * at.a) {
        tas = mmo * at.a;
        ve = tas * s;
      }
      // Réacteur : si la vitesse demandée (Mach du profil, ou vitesse de distance max.) n'est pas tenable avec
      // 92 % de la poussée disponible, on vole à la plus grande vitesse tenable (poussée max. croisière), comme un
      // équipage ; le niveau n'est refusé que si même la vitesse de traînée minimale ne l'est pas (plafond de croisière).
      let limited = false;
      if (jet && !(M.dw(ve) <= M.avail(h) * .92)) {
        const cap = M.avail(h) * .92;
        // coin de cercueil : la vitesse de traînée minimale dépasse la vitesse permise (Mach) — ralentir ne ferait
        // qu'augmenter la traînée, accélérer dépasserait le Mach : palier non tenable
        if (M.veMd >= ve) return {
          h,
          ok: false,
          reason: 'thrust'
        };
        if (!(M.dw(M.veMd) <= cap)) return {
          h,
          ok: false,
          reason: 'thrust'
        };
        ve = bisect(v => M.dw(v) - cap, M.veMd, ve);
        tas = ve / s;
        limited = true;
      }
      const need = jet ? M.dw(ve) : M.dw(ve) * tas;
      if (!(need <= M.avail(h) * (jet ? .92 : .98) * 1.001)) return {
        h,
        ok: false,
        reason: 'thrust'
      };
      const ff = jet ? M.K * M.sfc(h, tas) * M.dw(ve) : M.K * need;
      return {
        h,
        ok: true,
        mode,
        limited,
        tas,
        ias: ve,
        mach: tas / at.a,
        ff,
        sr: tas / ff,
        powerPct: jet ? need / M.avail(h) * 100 : need / M.avail(0) * 100
      };
    }
    // Descente : vario, TAS et débit du profil (sinon valeurs types).
    const desc = {
      rate: Math.abs(num(de.rateFpm)) || (jet ? 2000 : 700),
      tas: num(de.tasKt) || tasRef * .85,
      ff: num(de.fuelFlowPerHour) || ffRef * (jet ? .3 : .5)
    };

    /** Trajet entier de D NM au niveau h, vent wc (kt, + arrière) : montée (loi climbSpeed), croisière (mode), descente. Sortie : { ok, fuel, minutes, climb, cruiseNm, tas, ias, mach, ff, gs, limited } ou { ok: false, reason: 'ceiling' | 'thrust' | 'short' }. */
    function trip(h, D, wc = 0, mode = 'normal', climbSpeed = 'profile') {
      const k = cruise(h, mode);
      if (!k.ok) return {
        h,
        ok: false,
        reason: k.reason || 'thrust'
      };
      const law = climbSpeed === 'time' || climbSpeed === 'fuel' ? climbLaw(climbSpeed, k) : climbSpeed;
      const c = h > 0 ? climbWith(M, h, {
        speed: law
      }) : {
        minutes: 0,
        nm: 0,
        fuel: 0
      };
      if (!c) return {
        h,
        ok: false,
        reason: 'ceiling'
      };
      const td = h / desc.rate,
        dd = desc.tas * td / 60,
        fd = desc.ff * td / 60,
        dcr = D - c.nm - dd;
      if (dcr < 0) return {
        h,
        ok: false,
        reason: 'short'
      };
      const gs = Math.max(60, k.tas + wc),
        tcr = dcr / gs * 60,
        fuel = c.fuel + fd + k.ff * tcr / 60;
      return {
        h,
        ok: true,
        mode,
        limited: k.limited,
        fuel,
        minutes: c.minutes + td + tcr,
        eff: D / fuel,
        tas: k.tas,
        ias: k.ias,
        mach: k.mach,
        ff: k.ff,
        gs,
        climb: c,
        cruiseNm: dcr
      };
    }
    // Triangle des optimums de montée à l'altitude h (vitesse Ve et gaz) :
    // - 'vy'   : vario maximal (altitude atteinte au plus tôt) ;
    // - 'time' : temps de bloc minimal — coût d'un pied gagné = (1 − TAS / Vc) / vario, où Vc est la TAS de
    //            croisière : la distance parcourue en montée n'est plus à parcourir en croisière ;
    // - 'fuel' : carburant minimal — coût = (débit − TAS × débit_croisière / Vc) / vario ; pour une hélice,
    //            les gaz sont aussi optimisés (55 à 100 %).
    // Lois « temps » et « carburant » : vario au moins égal à 50 % du vario max (et 300 / 500 ft/min).
    // Badin limité à 250 kt sous 10 000 ft (réacteur) et au Mach de croisière + 0,04.
    /** Point optimal de montée à l'altitude h pour un objectif ('vy' vario, 'time' temps de bloc, 'fuel' carburant), croisière visée k : { ve, ias, tas, frac, roc, ff } ; null au-delà du plafond. */
    function climbOpt(h, objective, k) {
      const vc = k?.tas || tasRef,
        ffc = k?.ff || ffRef,
        at = atm(h),
        s = Math.sqrt(at.sigma);
      const veMax = Math.min(3 * M.veMd, jet ? Math.min(h < 10000 ? 250 : 340, (M.mRef + .04) * at.a * s) : 3 * M.veMd);
      // vario plancher pour les lois « temps » et « carburant » : ≥ 50 % du vario max et ≥ 300 ft/min (500 réacteur),
      // sinon l'optimum dégénère en montée quasi nulle (croisière basse presque aussi rapide pour un avion à hélice)
      // (près du plafond, le plancher fixe est ramené à 90 % du vario max pour que la loi existe toujours)
      const vyRoc = M.vy(h).roc;
      if (!(vyRoc > 20)) return null;
      const rMin = objective === 'vy' ? 20 : Math.max(.5 * vyRoc, Math.min(jet ? 500 : 300, .9 * vyRoc));
      /** Coût d'un pied gagné pour l'objectif (temps ou carburant, distance de montée retranchée de la croisière) ; Infinity si le vario est sous le minimum. */
      const cost = (ve, frac) => {
        const r = M.roc(h, ve, frac);
        if (!(r >= rMin)) return Infinity;
        const tas = M.tasOf(h, ve),
          ff = M.ffAt(h, frac, tas) * climbFactor;
        return objective === 'vy' ? -r : objective === 'time' ? (1 - tas / vc) / r : (ff - tas * ffc / vc) / r;
      };
      const fracs = objective === 'fuel' && !jet ? [.55, .6, .65, .7, .75, .8, .85, .9, .95, 1] : [1];
      let best = null;
      for (const frac of fracs) {
        let ve = golden(v => {
            const c = cost(v, frac);
            return Number.isFinite(c) ? -c : -1e6 + M.roc(h, v, frac);
          }, // hors domaine : pénalité en pente vers le domaine
          .8 * M.veMd, Math.max(.9 * M.veMd, veMax));
        // l'optimum colle souvent à la limite de vario : s'il tombe juste au-delà, revenir vers Vy jusqu'au domaine
        if (!Number.isFinite(cost(ve, frac))) {
          const vyVe = M.vy(h, frac).ve;
          for (let t = .02; t <= 1.001; t += .02) {
            const v2 = ve + (vyVe - ve) * t;
            if (Number.isFinite(cost(v2, frac))) {
              ve = v2;
              break;
            }
          }
        }
        const c = cost(ve, frac);
        if (Number.isFinite(c) && (!best || c < best.c)) best = {
          c,
          ve,
          frac
        };
      }
      if (!best) return null;
      const tas = M.tasOf(h, best.ve);
      return {
        h,
        ve: best.ve,
        ias: best.ve,
        tas,
        frac: best.frac,
        roc: M.roc(h, best.ve, best.frac),
        ff: M.ffAt(h, best.frac, tas) * climbFactor
      };
    }
    // Loi de montée (h → vitesse, gaz) pour un objectif, avec la croisière visée k (TAS, débit).
    const climbLaw = (objective, k) => h => climbOpt(h, objective, k) || {
      ve: M.vy(h).ve,
      frac: 1
    };
    // Montée optimale à l'altitude h : Vy (vario max), Vx (pente max), débit, carburant par 1000 ft.
    function climbPoint(h) {
      const y = M.vy(h),
        xve = M.vx(h),
        ff = M.ffAt(h, 1, y.tas) * climbFactor;
      return {
        h,
        vyIas: y.ve,
        vyTas: y.tas,
        roc: y.roc,
        vxIas: xve,
        ff,
        fuelPer1000: y.roc > 0 ? ff / y.roc * 1000 / 60 : Infinity,
        profileRoc: M.roc(h, climbVe(M, h))
      };
    }
    // Régimes de la table RPM / N1 : poussée / puissance correspondant au débit de la ligne, vario à Vy et
    // carburant par 1000 ft à l'altitude h (au-delà du disponible : plein gaz).
    // Loi de montée réglée par le pilote : Badin constant (réacteur : puis Mach de croisière du profil) et vario
    // visé (vsFpm) ; les gaz sont réduits pour tenir ce vario (le vario est linéaire en gaz), plein gaz dès qu'il n'est
    // plus tenable — le vario baisse alors jusqu'au plafond. vsFpm nul ou absent : plein gaz partout.
    function manualLaw(iasKt, vsFpm) {
      return h => {
        let ve = iasKt;
        if (jet) {
          const at = atm(h);
          ve = Math.min(ve, M.mRef * at.a * Math.sqrt(at.sigma));
        }
        const r0 = M.roc(h, ve, 0),
          r1 = M.roc(h, ve, 1),
          frac = vsFpm > 0 && r1 > r0 ? Math.min(1, Math.max(.05, (vsFpm - r0) / (r1 - r0))) : 1;
        return {
          ve,
          frac
        };
      };
    }
    // Point de la loi réglée à l'altitude h : Badin, TAS, gaz, vario, débit, carburant par 1000 ft.
    function manualPoint(h, law) {
      const {
        ve,
        frac
      } = law(h), tas = M.tasOf(h, ve), roc = M.roc(h, ve, frac), ff = M.ffAt(h, frac, tas) * climbFactor;
      return {
        h,
        ias: ve,
        tas,
        frac,
        roc,
        ff,
        fuelPer1000: roc > 20 ? ff / roc * 1000 / 60 : Infinity
      };
    }

    /** Régime de la table RPM (débit ffRow) à l'altitude h : fraction de gaz, vario, Badin, débit, carburant par 1000 ft (plein gaz au-delà de la puissance disponible). */
    function settingAt(ffRow, h) {
      const full = M.ffAt(h, 1, M.vy(h).tas) * climbFactor,
        frac = Math.min(1, ffRow / full),
        y = M.vy(h, frac),
        ff = full * frac;
      return {
        frac,
        roc: y.roc,
        ias: y.ve,
        ff,
        fuelPer1000: y.roc > 20 ? ff / y.roc * 1000 / 60 : Infinity
      };
    }

    return {
      kind,
      dIsa,
      /** Atmosphère du jour (écart ISA du modèle) à l'altitude pression h. */
      atm,
      label: tl(...C.label),
      hRef,
      refSrc,
      estimatedRef: estimated,
      ceiling,
      modelCeiling: modelCeil,
      ceilingGiven: ceilGiven,
      climbFactor,
      ld: M.ld,
      veMd: M.veMd,
      mRef: M.mRef,
      notes,
      cruise,
      trip,
      climbPoint,
      climbTo: (h, o) => climbWith(M, h, o),
      settingAt,
      desc,
      isa,
      climbOpt,
      climbLaw,
      manualLaw,
      manualPoint,
      // Vario et TAS au Badin de montée du profil à l'altitude h (profil vertical du studio et du planificateur).
      climbAt: h => {
        if (h > ceiling) return {
          roc: 0,
          tas: 0
        };
        const ve = climbVe(M, h);
        return {
          roc: M.roc(h, ve),
          tas: M.tasOf(h, ve)
        };
      }
    };
  }
  window.FlightPerfModel = {
    create,
    isa,
    kindOf
  };
})();
