(() => {
  'use strict';
  // V3 fuel — modèle pur du devis carburant (modules/fuel/SPEC.md). Repris de la V2 (apps/planner/flight_planner.js :
  // convertFuel, windComponent, finiteProfileNumber, normalize, interpRange, cruiseSource, modelProfile, calculate) :
  // même arithmétique, mais tout ce que la page V2 lisait dans ses champs (distance, niveau, vent, roulage, réserve,
  // contingence, saisie du vol, base des types, fiche EUROCONTROL) est passé en entrée. Ni DOM, ni stockage, ni texte
  // d'interface : les libellés et les formats sont ceux du module (index.js) et du frame.
  // Dépend de window.FlightPerfModel (modules/fuel/performance_model.js, copie de la V2) pour le modèle calibré.
  // API (window.FuelModel) :
  //   KG_PER_LB, KMH_PER_KT, M_PER_FT, KM_PER_NM, SM_PER_NM, convertFuel(v, from, to), convertSpeed(v, from, to) (kt, kmh),
  //   convertAlt(v, from, to) (ft, m), convertDist(v, from, to) (NM, km, SM), windComponent(track, from, speed), finite(v), normalizeSheet(sheet, name),
  //   interpRange(curve, rpm, altFt), cruiseSource({ sheet, altFt, entryKg, apd, simbrief, estimate, pollSchumann }),
  //   modelSheet(sheet, source, apd), perfModel(sheet, source, { apd, db, dIsa }), quote(input) → devis (voir quote).
  if (window.FuelModel) return;
  const KG_PER_LB = 0.45359237,
    KMH_PER_KT = 1.852, // 1 kt = 1.852 km/h (1 NM = 1.852 km exactly)
    M_PER_FT = 0.3048,
    KM_PER_NM = 1.852,
    SM_PER_NM = 1.150779, // statute miles in a nautical mile
    // quantité de chaque unité pour une unité de base du modèle (kt, ft, NM) ; le modèle garde toujours ces unités,
    // la conversion vers l'unité affichée (et retour, à la saisie) appartient à l'écran
    UNIT_PER_BASE = {
      speed: {
        kt: 1,
        kmh: KMH_PER_KT
      },
      alt: {
        ft: 1,
        m: M_PER_FT
      },
      dist: {
        NM: 1,
        km: KM_PER_NM,
        SM: SM_PER_NM
      }
    };

  /** Convertit une quantité de carburant entre kg et lb (from → to) ; inchangée si l'unité est la même ou absente. */
  function convertFuel(value, from, to) {
    if (!Number.isFinite(value) || !from || !to || from === to) return value;
    return from === 'kg' ? value / KG_PER_LB : value * KG_PER_LB;
  }
  /** Convertit v d'une unité à l'autre d'une grandeur de UNIT_PER_BASE ; inchangé si les unités sont égales, absentes ou
   *  inconnues, ou si v n'est pas un nombre fini. */
  function convertUnit(kind, value, from, to) {
    const t = UNIT_PER_BASE[kind];
    if (!Number.isFinite(value) || !from || !to || from === to || !(from in t) || !(to in t)) return value;
    return value / t[from] * t[to];
  }
  /** Vitesse entre kt et kmh (from → to). */
  const convertSpeed = (value, from, to) => convertUnit('speed', value, from, to);
  /** Altitude (ou hauteur) entre ft et m. */
  const convertAlt = (value, from, to) => convertUnit('alt', value, from, to);
  /** Distance entre NM, km et SM. */
  const convertDist = (value, from, to) => convertUnit('dist', value, from, to);
  /** Composante de vent sur la route (kt ; positive = arrière) : route vraie, direction d'où vient le vent, vitesse. */
  const windComponent = (track, from, speed) => speed * Math.cos((from - track) * Math.PI / 180) * -1;
  /** Vrai si v est un nombre fini non vide (chaîne numérique acceptée). */
  const finite = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));

  /** Fiche normalisée (copie de normalize de la V2) : identifiant, nom, unité, phases, roulage, TOD, table RPM. */
  function normalizeSheet(p, name = 'sheet') {
    p.id = p.id || p.icao || name.replace(/\.[^.]+$/, '');
    p.name = p.name || p.aircraft || p.id;
    p.unit = p.unit || 'kg';
    p.cruise = p.cruise || {};
    p.climb = p.climb || {};
    p.descent = p.descent || {};
    p.taxi = p.taxi || {};
    p.tod = p.tod || {
      gradientFtPerNm: 300,
      bufferNm: 5
    };
    p.rpmFuelCurve = (p.rpmFuelCurve || []).map(x => ({
      ...x,
      _rowId: x._rowId || (globalThis.crypto?.randomUUID?.() || String(Math.random()).slice(2))
    }));
    return p;
  }

  /** Plage de débit { min, nominal, max } lue dans la table RPM au régime rpm (table de l'altitude altFt si la table en
   *  a plusieurs, FlightPerfModel.mapAt) ; null sans table ou sans régime. */
  function interpRange(curve, rpm, h) {
    if (Number.isFinite(h) && window.FlightPerfModel?.mapAt) curve = window.FlightPerfModel.mapAt(curve, h);
    const c = [...curve].filter(p => Number.isFinite(p.rpm) && [p.fuelFlowMin, p.fuelFlowPerHour, p.fuelFlowMax].some(Number.isFinite))
      .sort((a, b) => a.rpm - b.rpm),
      value = (p, k, fallback) => Number.isFinite(p[k]) ? p[k] : p[fallback];
    if (!c.length || !Number.isFinite(rpm)) return null;
    /** Plage de la ligne k, valeurs manquantes complétées par les voisines. */
    const at = k => ({
      min: value(c[k], 'fuelFlowMin', 'fuelFlowPerHour'),
      nominal: value(c[k], 'fuelFlowPerHour', 'fuelFlowMin'),
      max: value(c[k], 'fuelFlowMax', 'fuelFlowPerHour')
    });
    if (rpm <= c[0].rpm) return at(0);
    if (rpm >= c.at(-1).rpm) return at(c.length - 1);
    for (let i = 1; i < c.length; i++)
      if (rpm <= c[i].rpm) {
        const a = c[i - 1],
          b = c[i],
          t = (rpm - a.rpm) / (b.rpm - a.rpm),
          va = at(i - 1),
          vb = at(i);
        return {
          min: va.min + t * (vb.min - va.min),
          nominal: va.nominal + t * (vb.nominal - va.nominal),
          max: va.max + t * (vb.max - va.max)
        };
      }
    return null;
  }

  /** Consommation et TAS de croisière retenues pour une fiche, avec leur origine (cruiseSource de la V2). Entrées :
   *  sheet (fiche normalisée) ; altFt (niveau du plan) ; entryKg (saisie du vol, kg/h, qui remplace la fiche) ; apd
   *  (fiche EUROCONTROL du type, aerodb) ; simbrief (apd.simbrief) ; estimate (aerodb.aircraft().estimate(codes)) ;
   *  pollSchumann(altFt, mach | null, tasKt | null) → { kg, massKg, how, mach } | null (facultatif). Ordre : saisie,
   *  fiche (table RPM au régime de croisière, sinon débit), puis Poll-Schumann, SimBrief (≈ hors précision « high »),
   *  estimation (≈). TAS : fiche, EUROCONTROL, SimBrief, estimation, 300 kt. Sortie : { ff (unité de la fiche) | null,
   *  kind, approx, profileFF, auto, est, tas, tasKind }. */
  function cruiseSource({
    sheet: pr,
    altFt = 0,
    entryKg = 0,
    apd = null,
    simbrief: sb = null,
    estimate: est = null,
    pollSchumann = null
  } = {}) {
    if (!pr) return {
      ff: null,
      kind: null,
      approx: false,
      profileFF: null,
      auto: null,
      est: null,
      tas: null,
      tasKind: null
    };
    const u = pr.unit || 'kg',
      cr = pr.cruise || {},
      alt = Math.max(0, +altFt || 0),
      rpm = finite(cr.rpmNominal) ? Number(cr.rpmNominal) : null,
      map = rpm !== null ? interpRange(pr.rpmFuelCurve || [], rpm, alt) : null,
      own = +cr.fuelFlowPerHour > 0 ? +cr.fuelFlowPerHour : null,
      profileFF = map?.nominal > 0 ? map.nominal : own,
      isaA = h => window.FlightPerfModel.isa(h).a;
    const sbTas = +sb?.speedKt > 0 ? +sb.speedKt : +sb?.mach > 0 ? +sb.mach * isaA(alt) : 0;
    const [tas, tasKind] = +cr.tasKt > 0 ? [+cr.tasKt, 'profile'] : +apd?.cruise?.tasKt > 0 ? [+apd.cruise.tasKt, 'apd'] : sbTas > 0 ? [
      sbTas, 'simbrief'
    ] : est?.tasKt > 0 ? [est.tasKt, 'estimate'] : [300, 'default'];
    let auto = null;
    if (pollSchumann && alt > 0) {
      // Mach tiré de la TAS connue (fiche, EUROCONTROL, SimBrief), sinon Mach de conception du modèle
      const known = ['profile', 'apd', 'simbrief'].includes(tasKind),
        r = pollSchumann(alt, known ? tas / isaA(alt) : null, known ? tas : null);
      if (r) auto = {
        kg: r.kg,
        kind: 'ps',
        approx: false,
        ps: {
          ...r,
          alt
        }
      };
    }
    if (!auto && +sb?.fuelflowKgh > 0) auto = {
      kg: +sb.fuelflowKgh,
      kind: 'simbrief',
      approx: sb.accuracy !== 'high'
    };
    if (!auto && est?.kgPerHour > 0) auto = {
      kg: est.kgPerHour,
      kind: 'estimate',
      approx: true
    };
    if (auto) auto.ff = convertFuel(auto.kg, 'kg', u);
    const [ff, kind, approx] = entryKg > 0 ? [convertFuel(entryKg, 'kg', u), 'entry', false] : profileFF ? [profileFF, map?.nominal > 0 ?
      'map' : 'profile', false
    ] : auto ? [auto.ff, auto.kind, auto.approx] : [null, null, false];
    return {
      ff,
      kind,
      approx,
      profileFF,
      auto,
      est,
      tas,
      tasKind
    };
  }

  /** Fiche passée au modèle de performances (modelProfile de la V2) : croisière complétée par la consommation et la TAS
   *  retenues (source) quand il lui en manque ou qu'une saisie du vol la remplace ; montée et descente complétées par
   *  la fiche EUROCONTROL quand la fiche ne les donne pas. Copie superficielle : la fiche n'est pas modifiée. */
  function modelSheet(sheet, s, apd = null) {
    if (!sheet) return sheet;
    const cr = sheet.cruise || {},
      cl = sheet.climb || {},
      de = sheet.descent || {},
      aCl = apd?.climb150 || apd?.climbInitial || null,
      aDe = apd?.descent || null,
      ownFF = +cr.fuelFlowPerHour > 0,
      ownTas = +cr.tasKt > 0,
      fillCl = !!aCl && (!(+cl.iasKt > 0) || !(Math.abs(+cl.rateFpm) > 0)),
      fillDe = !!aDe && !(Math.abs(+de.rateFpm) > 0);
    if (s?.kind !== 'entry' && ownFF && ownTas && !fillCl && !fillDe) return sheet;
    return {
      ...sheet,
      cruise: {
        ...cr,
        tasKt: ownTas ? +cr.tasKt : s?.tas,
        fuelFlowPerHour: s?.kind === 'entry' || !ownFF ? s?.ff : +cr.fuelFlowPerHour
      },
      climb: fillCl ? {
        ...cl,
        iasKt: +cl.iasKt > 0 ? +cl.iasKt : +aCl.iasKt || cl.iasKt,
        rateFpm: Math.abs(+cl.rateFpm) > 0 ? +cl.rateFpm : +aCl.rocFpm || cl.rateFpm
      } : cl,
      descent: fillDe ? {
        ...de,
        rateFpm: -Math.abs(+aDe.rodFpm || 0) || de.rateFpm,
        iasKt: +de.iasKt > 0 ? +de.iasKt : +aDe.iasKt || de.iasKt
      } : de
    };
  }

  /** Modèle de performances calibré (FlightPerfModel.create) de la fiche complétée ; null s'il ne peut pas être fait
   *  (TAS ou débit de croisière manquants). db : { CODE: { description } } pour la motorisation (aerodb), dIsa : écart
   *  ISA (°C, borné à ±60). */
  function perfModel(sheet, source, {
    apd = null,
    db = null,
    dIsa = 0
  } = {}) {
    try {
      return window.FlightPerfModel.create(modelSheet(sheet, source, apd), {
        db,
        dIsa: Math.max(-60, Math.min(60, +dIsa || 0)),
        apd
      });
    } catch {
      return null;
    }
  }

  /** Devis carburant (calculate de la V2, sans la page). Entrées :
   *  sheet (fiche normalisée), source (cruiseSource), perf (perfModel ou null), apd (EUROCONTROL, pour les varios de
   *  repli et la MTOW), distanceNm, levelFt (niveau retenu, épingle comprise), trackDeg, wind { dirDeg, speedKt }
   *  (direction et vitesse connues : vent connu ; vitesse seule : fourchette ±vitesse ; rien : fourchette
   *  ±sheet.typicalWindKt, 25 kt par défaut), taxiMin, reserveMin, contingencyPct, climbLaw (loi de montée réglée,
   *  perf.manualLaw…, facultative), takeoffMass (unité de la fiche, facultative), mtowKg, steps (paliers facultatifs :
   *  [{ nm, ft }], le niveau pris à nm NM du départ et tenu jusqu'au palier suivant ; le vol part au niveau retenu).
   *  Carburants dans l'unité de la fiche. Sortie : { hasFuel, approx, windKnown, wc, low, high, levelFt, endFt, ceiling,
   *  climb, cruise, descent ({ min, nm, ff, fuel, map }), cruise.fuelLow / fuelHigh, steps ({ min, nm, fuel, levels }
   *  ou null), taxi, trip, contingency, reserve, block, blockLow, blockHigh, minutes, todNm, lawUsed, lawFailed,
   *  landingMass, overMtow }. Sans palier, le devis est celui d'un niveau unique. */
  function quote(input) {
    const {
      sheet,
      source: src = {},
      perf = null,
      apd = null,
      distanceNm = 0,
      levelFt = 0,
      trackDeg = 0,
      wind = null,
      taxiMin = 0,
      reserveMin = 0,
      contingencyPct = 0,
      climbLaw = null,
      takeoffMass = 0,
      mtowKg = 0,
      steps = null
    } = input || {};
    if (!sheet) return null;
    const D = +distanceNm || 0,
      alt = +levelFt || 0,
      hasFuel = src.ff > 0,
      tas = src.tas;
    // vent : connu (direction et vitesse), sinon fourchette sur la composante route
    const windKnown = finite(wind?.dirDeg) && finite(wind?.speedKt);
    let wc = 0,
      low = 0,
      high = 0;
    if (windKnown) {
      wc = windComponent(+trackDeg || 0, +wind.dirDeg, +wind.speedKt);
      low = high = wc;
    } else {
      const band = finite(wind?.speedKt) ? Math.abs(+wind.speedKt) : (sheet.typicalWindKt ?? 25);
      low = -band;
      high = band;
    }
    /** Régime nominal d'une phase et débit lu dans la table RPM ({ rpm, map, ff }), sinon débit de la phase. */
    const mappedPhase = name => {
      const phase = sheet[name] || {},
        rpm = finite(phase.rpmNominal) ? Number(phase.rpmNominal) : null,
        map = rpm !== null ? interpRange(sheet.rpmFuelCurve || [], rpm, name === 'cruise' ? alt : alt / 2) : null;
      return {
        rpm,
        map,
        ff: map?.nominal ?? (+phase.fuelFlowPerHour > 0 ? +phase.fuelFlowPerHour : null)
      };
    };
    const climbPhase = mappedPhase('climb'),
      cruisePhase = mappedPhase('cruise'),
      descentPhase = mappedPhase('descent');
    // montée et croisière : modèle calibré (loi de montée réglée si elle atteint le niveau), sinon valeurs de la fiche
    const lawClimb = perf && climbLaw && alt > 0 ? perf.climbTo(Math.min(alt, perf.ceiling), {
        speed: climbLaw
      }) : null,
      pClimb = lawClimb || (perf && alt > 0 ? perf.climbTo(Math.min(alt, perf.ceiling)) : null);
    // paliers : niveaux successifs { nm (depuis le départ), ft }, le premier au niveau retenu ; seuls les changements
    // comptent, et seulement entre le départ et l'arrivée
    const levels = [{
      nm: 0,
      ft: alt
    }];
    for (const st of (Array.isArray(steps) ? steps : []).filter(x => +x?.nm > 0 && +x.nm < D && +x?.ft > 0).sort((a, b) =>
        a.nm - b.nm))
      if (+st.ft !== levels.at(-1).ft) levels.push({
        nm: +st.nm,
        ft: +st.ft
      });
    const endFt = levels.at(-1).ft;
    const mpf = modelSheet(sheet, src, apd),
      climbRate = Math.abs(+mpf.climb?.rateFpm) || 1200,
      descentRate = Math.abs(+mpf.descent?.rateFpm) || 1500,
      climbTas = +mpf.climb?.tasKt || 220,
      descentTas = +mpf.descent?.tasKt || 250,
      climbMin = pClimb ? pClimb.minutes : alt / climbRate,
      descentMin = endFt / descentRate,
      climbNm = pClimb ? pClimb.nm : climbTas * climbMin / 60,
      descentNm = descentTas * descentMin / 60;
    /** Carburant d'une phase : durée (min) × débit horaire. */
    const phaseFuel = (mins, ff) => mins / 60 * (ff || 0);
    const cruiseFF = hasFuel ? src.ff : 0,
      climbFF = climbPhase.ff ?? cruiseFF,
      descentFF = descentPhase.ff ?? (cruiseFF * .45);
    /** Montée modélisée jusqu'à h (ft), sous le plafond ; null sans modèle. */
    const climbAt = h => perf && h > 0 ? perf.climbTo(Math.min(h, perf.ceiling)) : null;
    // changements de niveau : montée (écart de deux montées du modèle, sinon vario de la fiche) ou descente
    const trans = levels.slice(1).map((l, i) => {
      const a = levels[i].ft,
        b = l.ft;
      if (b > a) {
        const ca = climbAt(a),
          cb = climbAt(b);
        if (ca && cb) return {
          min: cb.minutes - ca.minutes,
          nm: cb.nm - ca.nm,
          fuel: Number.isFinite(cb.fuel) && Number.isFinite(ca.fuel) ? cb.fuel - ca.fuel : phaseFuel(cb.minutes - ca.minutes,
            climbFF)
        };
        const m = (b - a) / climbRate;
        return {
          min: m,
          nm: climbTas * m / 60,
          fuel: phaseFuel(m, climbFF)
        };
      }
      const m = (a - b) / descentRate;
      return {
        min: m,
        nm: descentTas * m / 60,
        fuel: phaseFuel(m, descentFF)
      };
    });
    // tronçons de croisière : longueur moins la montée (premier), le changement de niveau (suivants) et la descente
    // (dernier) ; vitesse vraie et débit du modèle à leur niveau, sinon ceux de la source
    const segs = levels.map((l, i) => {
      const end = levels[i + 1]?.nm ?? D,
        pc = perf ? perf.cruise(l.ft, 'normal') : null,
        used = (i ? trans[i - 1].nm : climbNm) + (i === levels.length - 1 ? descentNm : 0);
      return {
        ft: l.ft,
        nm: Math.max(0, end - l.nm - used),
        tas: pc?.ok ? pc.tas : tas,
        ff: pc?.ok ? pc.ff : cruiseFF
      };
    });
    const climbFuel = pClimb && Number.isFinite(pClimb.fuel) ? pClimb.fuel : phaseFuel(climbMin, climbFF),
      descentFuel = phaseFuel(descentMin, descentFF),
      taxiFuel = phaseFuel(+taxiMin || 0, sheet.taxi?.fuelFlowPerHour || cruiseFF * .25),
      stepMin = trans.reduce((t, x) => t + x.min, 0),
      stepNm = trans.reduce((t, x) => t + x.nm, 0),
      stepFuel = trans.reduce((t, x) => t + x.fuel, 0),
      cruiseNm = segs.reduce((t, g) => t + g.nm, 0);
    /** Carburant de croisière avec une composante de vent w (vitesse sol de 80 kt au moins), tronçon par tronçon. */
    const cruiseFuelFor = w => segs.reduce((t, g) => t + g.nm / Math.max(80, g.tas + w) * g.ff, 0);
    const cNom = cruiseFuelFor(windKnown ? wc : 0),
      cLo = cruiseFuelFor(low),
      cHi = cruiseFuelFor(high),
      reserve = phaseFuel(+reserveMin || 0, sheet.reserveFuelFlowPerHour || cruiseFF * .65),
      cont = (+contingencyPct || 0) / 100,
      trip = climbFuel + cNom + stepFuel + descentFuel,
      contingency = trip * cont,
      block = taxiFuel + trip + contingency + reserve,
      bLo = taxiFuel + (climbFuel + cLo + stepFuel + descentFuel) * (1 + cont) + reserve,
      bHi = taxiFuel + (climbFuel + cHi + stepFuel + descentFuel) * (1 + cont) + reserve,
      cruiseMin = segs.reduce((t, g) => t + g.nm / Math.max(80, g.tas + (windKnown ? wc : 0)) * 60, 0),
      tasAlt = cruiseNm > 0 ? segs.reduce((t, g) => t + g.tas * g.nm, 0) / cruiseNm : segs[0].tas,
      ffAlt = cruiseMin > 0 ? cNom / (cruiseMin / 60) : segs[0].ff,
      todNm = endFt / (sheet.tod?.gradientFtPerNm || 300) + (sheet.tod?.bufferNm || 0);
    const mtow = convertFuel(+mtowKg || 0, 'kg', sheet.unit || 'kg'),
      tow = +takeoffMass || 0;
    return {
      hasFuel,
      approx: !!src.approx,
      windKnown,
      wc: windKnown ? wc : 0,
      low,
      high,
      levelFt: alt,
      endFt,
      ceiling: perf?.ceiling ?? null,
      lawUsed: !!lawClimb,
      lawFailed: !!climbLaw && !lawClimb,
      modelled: !!pClimb,
      climb: {
        min: climbMin,
        nm: climbNm,
        ff: climbFF,
        fuel: climbFuel,
        map: climbPhase.map ? climbPhase : null
      },
      cruise: {
        min: cruiseMin,
        nm: cruiseNm,
        ff: ffAlt,
        tas: tasAlt,
        fuel: cNom,
        fuelLow: cLo,
        fuelHigh: cHi,
        map: cruisePhase.map ? cruisePhase : null
      },
      steps: trans.length ? {
        min: stepMin,
        nm: stepNm,
        fuel: stepFuel,
        levels: segs.map((g, i) => ({
          nm: levels[i].nm,
          ft: g.ft
        }))
      } : null,
      descent: {
        min: descentMin,
        nm: descentNm,
        ff: descentFF,
        fuel: descentFuel,
        map: descentPhase.map ? descentPhase : null
      },
      taxi: taxiFuel,
      trip,
      contingency,
      reserve,
      block,
      blockLow: Math.min(bLo, bHi),
      blockHigh: Math.max(bLo, bHi),
      minutes: climbMin + cruiseMin + stepMin + descentMin,
      todNm,
      landingMass: tow > 0 ? tow - trip : null,
      overMtow: tow > 0 && mtow > 0 && tow > mtow
    };
  }

  window.FuelModel = {
    KG_PER_LB,
    KMH_PER_KT,
    M_PER_FT,
    KM_PER_NM,
    SM_PER_NM,
    convertFuel,
    convertSpeed,
    convertAlt,
    convertDist,
    windComponent,
    finite,
    normalizeSheet,
    interpRange,
    cruiseSource,
    modelSheet,
    perfModel,
    quote
  };
})();
