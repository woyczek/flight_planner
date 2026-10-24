(() => {
  'use strict';
  // V3 fuel — décision du niveau de vol et consignes de montée, en calcul pur (modules/fuel/SPEC.md § 7). Repris de
  // shared/flight_perf_view.js de la V2 (extendSeries, rpmRows, rpmForFF, ffForRpm, ensureManual, manualLaw, goalLaw,
  // tripLaw, climbGuide, decisionSeries, buildCache, minDistance) sans la mise en page : ce que la vue lisait dans son
  // état (S.manual, profil actif, objectif mémorisé) est passé en entrée. Ni DOM, ni stockage, ni texte.
  // Modèle m : FlightPerfModel.create (modules/fuel/performance_model.js), via FuelModel.perfModel.
  // API (window.FuelLevels) : GOALS, TRIP_KEYS, extendSeries, rpmRows(curve, h), rpmForFF, ffForRpm,
  //   manualSettings(m, sheet, prev), manualLaw(m, q), goalLaw(m, goal, kC, o), tripLaw(m, goal, o),
  //   climbGuide(m, levelFt, goal, o), decisionSeries(m, flight, goal, o), requoteSeries(D, quoteAt, plan),
  //   levelCurves(m, flight), minDistance(m, h, law).
  //   o = { profileIas (Badin de montée de la fiche complétée, modelSheet), manual (manualSettings), curve (table RPM) }.
  if (window.FuelLevels) return;
  /** Objectifs de montée : économe, meilleur vario, rapide, Badin de la fiche, réglage manuel. */
  const GOALS = ['eco', 'vy', 'fast', 'prof', 'man'];
  /** Grandeurs d'un trajet prolongées au-delà du plafond. */
  const TRIP_KEYS = ['fuel', 'minutes', 'tas', 'ias', 'mach', 'gs', 'ff'];

  /** Prolonge une série au-delà du plafond ceil : un point non calculable y est remplacé par l'extrapolation linéaire
   *  des deux derniers points valides (valeurs keys, bornées à 0 ; extrap: true). Sous le plafond : inchangée. */
  function extendSeries(list, ceil, keys = TRIP_KEYS) {
    const out = [],
      valid = [];
    for (const r of list) {
      if (r?.ok || !r || r.h <= ceil || valid.length < 2) {
        out.push(r);
        if (r?.ok) valid.push(r);
        continue;
      }
      const a = valid[valid.length - 2],
        b = valid[valid.length - 1],
        t = (r.h - b.h) / ((b.h - a.h) || 1),
        o = {
          ...b,
          h: r.h,
          ok: true,
          extrap: true
        };
      for (const k of keys)
        if (Number.isFinite(a[k]) && Number.isFinite(b[k])) o[k] = Math.max(0, b[k] + (b[k] - a[k]) * t);
      out.push(o);
      valid.push(o);
    }
    return out;
  }

  /** Lignes valides d'une table RPM ramenée à l'altitude h (FlightPerfModel.mapAt ; h absent : telle quelle), triées
   *  par régime : [{ rpm, ff }] (unité de la fiche). */
  const rpmRows = (curve, h) => (h == null || !window.FlightPerfModel?.mapAt ? curve || [] : window.FlightPerfModel.mapAt(curve || [], h))
    .map(r => ({
      rpm: +r.rpm,
      ff: Number.isFinite(+r.fuelFlowPerHour) && r.fuelFlowPerHour !== null && r.fuelFlowPerHour !== '' ? +r.fuelFlowPerHour : (+r
        .fuelFlowMin + +r.fuelFlowMax) / 2
    })).filter(r => r.rpm > 0 && r.ff > 0).sort((a, b) => a.rpm - b.rpm);
  /** Régime de la table pour un débit ff (interpolation linéaire entre deux lignes) ; null hors de la table. */
  const rpmForFF = (rows, ff) => {
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1],
        b = rows[i];
      if ((ff - a.ff) * (ff - b.ff) <= 0 && a.ff !== b.ff) return a.rpm + (ff - a.ff) / (b.ff - a.ff) * (b.rpm - a.rpm);
    }
    return null;
  };
  /** Débit de la table pour un régime rpm (interpolation linéaire, borné aux lignes extrêmes) ; NaN sans table. */
  const ffForRpm = (rows, rpm) => {
    if (!rows.length) return NaN;
    if (rpm <= rows[0].rpm) return rows[0].ff;
    for (let i = 1; i < rows.length; i++)
      if (rpm <= rows[i].rpm) {
        const a = rows[i - 1],
          b = rows[i];
        return a.ff + (rpm - a.rpm) / ((b.rpm - a.rpm) || 1) * (b.ff - a.ff);
      }
    return rows.at(-1).ff;
  };

  /** Réglages de la montée manuelle (ensureManual de la V2) : bornes du Badin et du vario du modèle m, valeurs de départ
   *  tirées de la fiche (Badin et vario de montée) ; prev gardé s'il vaut pour la même fiche et les mêmes bornes. */
  function manualSettings(m, sheet, prev = null) {
    const p0 = m.climbPoint(0),
      iMin = Math.round(.8 * m.veMd / 5) * 5,
      iMax = Math.round(Math.min(2.6 * m.veMd, m.kind === 'jet' ? 360 : 2.6 * m.veMd) / 5) * 5,
      vMax = Math.max(200, Math.ceil(p0.roc / 100) * 100),
      pid = `${sheet?.id}|${iMin}|${iMax}|${vMax}`;
    if (prev?.pid === pid) return prev;
    const ias = +sheet?.climb?.iasKt || Math.round(p0.vyIas),
      vs = Math.abs(+sheet?.climb?.rateFpm || 0);
    return {
      pid,
      iMin,
      iMax,
      vMax,
      ias: Math.min(iMax, Math.max(iMin, Math.round(ias))),
      vs: vs ? Math.min(vMax, vs) : vMax,
      full: !vs || vs >= vMax,
      frac: 1,
      calc: 'rpm',
      fixed: ['ias', 'vs'],
      unreach: false
    };
  }
  /** Loi h → { ve, frac } des réglages manuels q (Badin et vario : gaz réduits pour tenir le vario ; régime fixé : gaz
   *  constants q.frac) ; null sans modèle ou sans réglages. */
  function manualLaw(m, q) {
    if (!q || !m) return null;
    if (q.calc === 'rpm') return m.manualLaw(q.ias, q.full ? 0 : q.vs);
    const base = m.manualLaw(q.ias, 0),
      fr = Math.min(1, Math.max(.05, q.frac));
    return h => ({
      ve: base(h).ve,
      frac: fr
    });
  }
  /** Loi h → { ve, frac } d'un objectif pour le modèle m, croisière visée kC ; null si l'objectif n'est pas disponible
   *  (« prof » sans Badin de montée, « man » sans réglages). */
  function goalLaw(m, goal, kC, {
    profileIas = 0,
    manual = null
  } = {}) {
    if (goal === 'man') return manualLaw(m, manual);
    if (goal === 'prof') return profileIas > 0 ? m.manualLaw(profileIas, 0) : null;
    return m.climbLaw({
      eco: 'fuel',
      vy: 'vy',
      fast: 'time'
    } [goal], kC);
  }
  /** Objectif retenu : « prof » sans Badin de montée devient « vy » (goalNow de la V2). */
  const goalNow = (goal, profileIas) => goal === 'prof' && !(profileIas > 0) ? 'vy' : (GOALS.includes(goal) ? goal : 'prof');
  /** Loi de montée d'un objectif au format de m.trip (« fuel », « time », « vy » ou loi h → { ve, frac }). */
  function tripLaw(m, goal, {
    profileIas = 0,
    manual = null
  } = {}) {
    if (goal === 'eco') return 'fuel';
    if (goal === 'fast') return 'time';
    if (goal === 'vy') return 'vy';
    if (goal === 'man') return manualLaw(m, manual) || 'profile';
    return profileIas > 0 ? m.manualLaw(profileIas, 0) : 'profile';
  }

  /** Consignes de montée d'un objectif jusqu'au niveau levelFt (borné au plafond, arrondi à 100 ft) : intégration par pas
   *  (point milieu) et relevé aux tranches (sol, 2 000, 5 000, 10 000 ft puis tous les 5 000 ft, niveau) : gaz, régime
   *  de la table RPM à cette altitude, Badin, vario, débit, Mach, temps et carburant cumulés. Sortie : { top, rows,
   *  reached, minutes, fuel, law } ou null (pas de niveau, objectif indisponible). */
  function climbGuide(m, levelFt, goal, o = {}) {
    const top = Math.round(Math.min(+levelFt || 0, Math.floor(m.ceiling / 100) * 100) / 100) * 100;
    if (!(top > 0)) return null;
    const law = goalLaw(m, goal, m.cruise(top, 'normal'), o);
    if (!law) return null;
    const marks = [0, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000].filter(h => h < top - 250).concat(top),
      dh = Math.max(100, Math.min(500, top / 60));
    /** Relevé de la loi à l'altitude h ; t, f : temps (min) et carburant cumulés depuis le sol. */
    const row = (h, t, f) => {
      const p = m.manualPoint(h, law),
        rows = rpmRows(o.curve, h);
      return {
        h,
        frac: p.frac,
        ias: p.ias,
        roc: p.roc,
        ff: p.ff,
        mach: p.tas / m.atm(h).a,
        rpm: rows.length >= 2 ? rpmForFF(rows, p.ff) : null,
        t,
        f
      };
    };
    const rows = [row(0, 0, 0)];
    let h = 0,
      t = 0,
      f = 0,
      k = 1,
      reached = true;
    while (k < marks.length && h < top - 1e-6) {
      const st = Math.min(dh, marks[k] - h),
        p = m.manualPoint(h + st / 2, law);
      if (!(p.roc > 20)) {
        reached = false;
        break;
      }
      const dt = st / p.roc;
      t += dt;
      f += p.ff * dt / 60;
      h += st;
      if (Math.abs(h - marks[k]) < 1e-6) {
        h = marks[k];
        rows.push(row(h, t, f));
        k++;
      }
    }
    return {
      top,
      rows,
      reached,
      minutes: t,
      fuel: f,
      law
    };
  }

  /** Décision du niveau : trajet entier (distanceNm, composante de vent wc) à chaque niveau (pas de 500 ft, 1 000 ft
   *  au-delà de 20 000 ft de plafond) avec la loi de montée de l'objectif, prolongé au-delà du plafond. Sortie : { step,
   *  xmax, law, rows (tracé), real (tenables), all (niveaux ≤ plafond, résultats de m.trip), gap ({ from, reason } :
   *  niveaux non tenables sous le plafond), lo, hi, best (le moins de carburant), fast (le plus court) } ou null. */
  function decisionSeries(m, {
    distanceNm,
    wc = 0
  }, goal, o = {}) {
    const step = m.ceiling > 20000 ? 1000 : 500,
      xmax = Math.max(step * 2, Math.ceil(m.ceiling * 1.1 / step) * step),
      law = tripLaw(m, goal, o),
      raw = [];
    for (let h = step; h <= xmax; h += step) raw.push(h > m.ceiling ? m.unbounded(() => m.trip(h, distanceNm, wc, 'normal', law)) : m
      .trip(h,
        distanceNm, wc, 'normal', law));
    const rows = extendSeries(raw, m.ceiling, TRIP_KEYS),
      real = rows.filter(r => r?.ok && !r.extrap && r.h <= m.ceiling && r.h >= 1000);
    if (!real.length) return null;
    // série coupée au-dessus du dernier niveau tenable s'il est nettement sous le plafond (trajet court, poussée)
    const top = real.at(-1).h,
      cutRows = top < m.ceiling - step ? rows.map(r => r && r.h > top ? null : r) : rows,
      all = raw.filter(r => r && r.h >= 1000 && r.h <= m.ceiling),
      gapAt = all.find(r => r.h > top && !r.ok);
    return {
      step,
      xmax,
      law,
      rows: cutRows,
      real,
      all,
      gap: gapAt ? {
        from: top,
        reason: gapAt.reason || 'thrust'
      } : null,
      lo: real[0].h,
      hi: all.at(-1).h,
      best: real.reduce((a, b) => b.fuel < a.fuel ? b : a),
      fast: real.reduce((a, b) => b.minutes < a.minutes ? b : a)
    };
  }

  /** Courbe de décision chiffrée comme le devis (23-24 oct. 2026) : chaque niveau tenable (sous le plafond, non extrapolé)
   *  reprend le délestage (fuel) et la durée (minutes) du devis `quoteAt(h)` (M.quote) à ce niveau. UNE SEULE BASE pour
   *  tous les points : `quoteAt` doit rendre le vol à plat à ce niveau, le niveau du plan compris ; un point calculé
   *  autrement que ses voisins (paliers de la route) fait un pic à ce niveau et de faux optimums. Le devis réel du plan
   *  (paliers de la route, vent du plan) est un repère à part : plan = { h, quote } donne D.plan = { h, fuel, minutes,
   *  stepped } (null sans devis chiffré). Le moins de carburant et le plus court sont relus de la série à plat. Les
   *  points au-delà du plafond gardent le prolongement du modèle. Modifie et rend D. */
  function requoteSeries(D, quoteAt, plan = null) {
    if (!D) return D;
    const memo = new Map(),
      ok = x => x?.hasFuel && Number.isFinite(x.trip) && Number.isFinite(x.minutes),
      fix = r => {
        if (!r || !r.ok || r.extrap || r.h > D.hi) return r;
        if (!memo.has(r.h)) memo.set(r.h, quoteAt(r.h));
        const x = memo.get(r.h);
        return ok(x) ? {
          ...r,
          fuel: x.trip,
          minutes: x.minutes
        } : r;
      };
    D.rows = D.rows.map(fix);
    D.real = D.real.map(fix);
    D.all = D.all.map(fix);
    D.best = D.real.reduce((a, b) => b.fuel < a.fuel ? b : a);
    D.fast = D.real.reduce((a, b) => b.minutes < a.minutes ? b : a);
    D.plan = plan && ok(plan.quote) && plan.h > 0 ? {
      h: plan.h,
      fuel: plan.quote.trip,
      minutes: plan.quote.minutes,
      stepped: !!plan.quote.steps
    } : null;
    return D;
  }

  /** Courbes de niveau de la vue détaillée (buildCache de la V2) : trajets « normal » et « éco » de 0 au plafond (+10 %),
   *  fourchette de vent, plus haut niveau tenable et sa cause, optimums (carburant, éco, temps), croisières tenables,
   *  trajet au niveau du plan. flight : { distanceNm, wc, windKnown, low, high, levelFt }. */
  function levelCurves(m, {
    distanceNm,
    wc = 0,
    windKnown = true,
    low = 0,
    high = 0,
    levelFt = 0
  }) {
    const step = 500,
      top = Math.floor(m.ceiling / step) * step,
      topX = Math.max(top, Math.ceil(m.ceiling * 1.1 / step) * step),
      hs = [];
    for (let h = 0; h <= topX; h += step) hs.push(h);
    const ok = r => r && r.ok,
      trips = (mode, w) => hs.map(h => h > m.ceiling ? m.unbounded(() => m.trip(h, distanceNm, w, mode)) : m.trip(h, distanceNm, w,
        mode)),
      ext = l => extendSeries(l, m.ceiling, TRIP_KEYS),
      lastOk = l => l.reduce((a, r) => r?.ok && r.h <= m.ceiling && r.h > a ? r.h : a, -1),
      cut = l => {
        const t = lastOk(l);
        return t >= 0 && t < m.ceiling - step ? l.map(r => r && r.h > t ? null : r) : l;
      };
    const normRaw = ext(trips('normal', wc)),
      eco = cut(ext(trips('eco', wc))),
      norm = cut(normRaw),
      bands = !windKnown && (low || high) ? [cut(ext(trips('normal', low))), cut(ext(trips('normal', high)))] : [],
      reachTop = Math.max(lastOk(eco), lastOk(norm)),
      stopReason = normRaw.find(r => r && !r.ok && r.h > reachTop && r.h <= m.ceiling)?.reason || '',
      usable = r => ok(r) && r.h >= 1000 && r.h <= m.ceiling,
      minBy = (l, k) => l.filter(usable).reduce((a, b) => !a || b[k] < a[k] ? b : a, null),
      bestProf = minBy(norm, 'fuel'),
      bestEco = minBy(eco, 'fuel'),
      fastest = minBy(norm, 'minutes'),
      cr = mode => hs.filter(h => h <= m.ceiling).map(h => m.cruise(h, mode)).filter(ok).filter(r => r.h >= 1000);
    return {
      step,
      top,
      topX,
      hs,
      eco,
      norm,
      bands,
      reachTop,
      stopReason,
      bestProf,
      bestEco,
      fastest,
      bestFuel: bestProf || bestEco,
      crN: cr('normal'),
      crE: cr('eco'),
      plan: m.trip(levelFt, distanceNm, wc, 'normal')
    };
  }

  /** Distance minimale (NM) pour monter au niveau h et en redescendre (loi « profile », « time », « fuel » ou loi
   *  h → { ve, frac }) ; null si la croisière n'y est pas tenable. */
  function minDistance(m, h, law = 'profile') {
    const k = m.cruise(h, 'normal');
    if (!k.ok) return null;
    const sp = law === 'time' || law === 'fuel' ? m.climbLaw(law, k) : law,
      cl = h > 0 ? m.climbTo(h, {
        speed: sp
      }) : {
        nm: 0
      };
    return cl ? cl.nm + m.desc.tas * h / m.desc.rate / 60 : null;
  }

  window.FuelLevels = {
    GOALS,
    TRIP_KEYS,
    extendSeries,
    rpmRows,
    rpmForFF,
    ffForRpm,
    manualSettings,
    manualLaw,
    goalLaw,
    goalNow,
    tripLaw,
    climbGuide,
    decisionSeries,
    requoteSeries,
    levelCurves,
    minDistance
  };
})();
