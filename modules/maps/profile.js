(() => {
  'use strict';
  // V3 maps — profil vertical du vol prévu (modules/maps/SPEC.md § 4 bis) : coupe de la route par SiaProfile (copie du
  // studio, lib/vertical_profile.js : échantillons, relief, espaces traversés, dessin) avec la trajectoire du vol :
  // montée et descente données par Carburant (profile : vario, vitesse, tocNm, todNm), sinon calculées par SiaProfile
  // aux taux reçus ou par défaut ; relief des tuiles Terrarium, ou, sans elles (hors ligne), les MORA des cases traversées.
  // Aucun texte d'interface : codes, niveaux et distances seulement.
  // API : window.MapsProfile = { build(points, { levelFt, profile, path, airspaces, elevation, mora }) → coupe,
  //   draw(ctx, coupe, { W, H, scale, window }) → géométrie, xOf(geo, s), sOf(geo, x), at(coupe, s) → { lat, lon, s, nm, alt,
  //   terrain, mora, zones }, posAt(coupe, s) → { lat, lon }, nearest(coupe, toC, x, y, maxPx) → s | null }.
  // Fenêtre (V3_SPECIFICATION § 7.1 règle 20) : `window` { from, to } en NM depuis le départ ; seule cette portion est dessinée,
  // l'axe vertical se recale sur ce qui y est visible. La géométrie rendue porte la fenêtre (w0, w1 en mètres) : xOf et sOf la
  // lisent, donc le curseur, les marques et la lecture des espaces (at, project, nearest travaillent en distance s et n'en dépendent
  // pas) restent justes sans que l'appelant s'en soucie.
  if (window.MapsProfile) return;
  const NM = 1852;
  const P = () => window.SiaProfile;

  /** Trajectoire de Carburant : montée de l'altitude de départ au niveau sur tocNm, palier, descente sur todNm jusqu'à
   *  l'altitude d'arrivée ; même forme que celle de SiaProfile (alt par échantillon, toc, tod, top, levels). */
  function fuelPlan(samples, total, level, tocNm, todNm) {
    const n = samples.length - 1,
      start = samples[0].center,
      end = samples[n].center,
      toc = Math.min(total, tocNm * NM),
      tod = Math.max(toc, total - todNm * NM),
      alt = samples.map(q => q.s <= toc ? start + (level - start) * (toc ? q.s / toc : 1) : q.s < tod ? level : level - (level - end) * (
        total > tod ? (q.s - tod) / (total - tod) : 1));
    return {
      alt,
      toc: {
        s: toc,
        alt: level
      },
      tod: {
        s: tod,
        alt: level
      },
      top: level,
      levels: [{
        s: (toc + tod) / 2,
        alt: level
      }],
      fuel: true
    };
  }

  /** Trajectoire que Carburant a calculée sous les contraintes des procédures (profile.path [{ nm, ft }], V3_SPECIFICATION
   *  § 10.20) : l'altitude de chaque échantillon est lue sur la polyligne du plan ; TOC / TOD = début et fin du plus haut palier
   *  (TOC : la première fois qu'il est atteint), paliers nommés comme ceux de planPath. Même forme que fuelPlan. */
  function pathPlan(samples, total, path) {
    const at = nm => {
      if (nm <= path[0].nm) return path[0].ft;
      for (let k = 1; k < path.length; k++) {
        if (nm <= path[k].nm) {
          const a = path[k - 1],
            b = path[k];
          return b.nm > a.nm ? a.ft + (b.ft - a.ft) * (nm - a.nm) / (b.nm - a.nm) : b.ft;
        }
      }
      return path[path.length - 1].ft;
    };
    const alt = samples.map(q => at(q.s / NM)),
      n = samples.length - 1,
      top = Math.max(...alt),
      start = alt[0],
      eps = 1;
    let iToc = alt.findIndex(v => v >= top - eps),
      iTod = alt.length - 1 - [...alt].reverse().findIndex(v => v >= top - eps);
    if (iToc < 0) iToc = 0;
    if (iTod < iToc) iTod = iToc;
    const levels = [];
    let run = 0;
    for (let i = 1; i <= n + 1; i++) {
      if (i <= n && Math.abs(alt[i] - alt[i - 1]) < eps) continue;
      if (samples[Math.min(i, n)].s - samples[run].s > total * .02 && alt[run] > start + 100) levels.push({
        s: (samples[run].s + samples[Math.min(i - 1, n)].s) / 2,
        alt: alt[run]
      });
      run = i;
    }
    return {
      alt,
      toc: {
        s: samples[iToc].s,
        alt: alt[iToc]
      },
      tod: {
        s: samples[iTod].s,
        alt: alt[iTod]
      },
      top,
      levels,
      fuel: true,
      path: true
    };
  }
  /** profile.path utilisable : au moins deux { nm, ft } finis, nm croissants, qui couvrent la distance du vol (à 3 NM ou 3 % près :
   *  un chemin périmé, d'une autre route, est écarté) ; sinon null. */
  function validPath(path, totalNm) {
    if (!Array.isArray(path) || path.length < 2) return null;
    const p = path.map(x => ({
      nm: x?.nm,
      ft: x?.ft
    }));
    if (!p.every((x, i) => typeof x.nm === 'number' && typeof x.ft === 'number' && Number.isFinite(x.nm) && Number.isFinite(x.ft) && (!
        i || x
        .nm >= p[i - 1].nm))) return null;
    return Math.abs(p[p.length - 1].nm - totalNm) <= Math.max(3, totalNm * .03) ? p : null;
  }

  /** Coupe de la route : points [{ id, lat, lon, noMark? }] (noMark : un point de procédure, sans nom sous la coupe), levelFt
   *  (niveau de croisière), profile (Carburant), path (profile.path de Carburant : la trajectoire sous les contraintes, quand il
   *  existe), airspaces (déjà choisis), elevation(lat, lon) → mètres (promesse ; rejet : relief inconnu), mora(lat, lon) → ft | null. */
  async function build(points, {
    levelFt = 0,
    profile = null,
    path = null,
    airspaces = [],
    elevation = null,
    mora = null
  } = {}) {
    // niveaux des points (cheminement d'une mission : lvl, alt) ; sinon le niveau de croisière au départ
    const own = points.some(p => p.lvl || Number.isFinite(p.alt)),
      pts = points.map((p, i) => ({
        name: p.id || p.name || '',
        lat: p.lat,
        lon: p.lon,
        ...(Number.isFinite(p.alt) ? {
          alt: p.alt
        } : {}),
        ...(p.lvl ? {
          lvl: p.lvl
        } : i === 0 && levelFt > 0 && !own ? {
          lvl: {
            ft: levelFt
          }
        } : {})
      }));
    let terrainOk = !!elevation;
    // relief : une sonde d'abord ; en échec (hors ligne, hôte refusé), coupe sans relief et MORA à la place
    if (elevation) try {
      const h = await elevation(pts[0].lat, pts[0].lon);
      if (!Number.isFinite(h)) terrainOk = false;
    } catch {
      terrainOk = false;
    }
    const rate = (fpm, kt) => +fpm > 0 && +kt > 0 ? {
      fpm: +fpm,
      kt: +kt
    } : undefined;
    const data = await P().build({
      points: pts,
      elevation: terrainOk ? elevation : async () => NaN,
      airspaces,
      obstacles: [],
      climb: rate(profile?.climbFpm, profile?.climbKt),
      descent: rate(profile?.descentFpm, profile?.descentKt)
    });
    // trajectoire de Carburant sous les contraintes des procédures (profile.path), sinon son plan à un seul niveau ; pas quand
    // les points portent leurs altitudes (paliers par tronçon)
    const planned = validPath(path, data.total / NM);
    if (planned) data.plan = pathPlan(data.samples, data.total, planned);
    else if (!own && levelFt > 0 && +profile?.tocNm > 0 && +profile?.todNm > 0) data.plan = fuelPlan(data.samples, data.total, levelFt,
      +
      profile
      .tocNm, +profile.todNm);
    // les points de procédure tracent la coupe sans se nommer sous elle (les noms et distances sont ceux de la route)
    if (points.some(p => p.noMark)) data.marks = data.marks.filter((m, i) => !points[i].noMark);
    data.terrainOk = terrainOk;
    // règle d'affichage du 25 octobre : pas d'espace de la surface au plafond (SIV, FIR, UIR, secteurs sans limites, SFC → UNL)
    data.crossed = data.crossed.filter(c => !window.SiaAero.surfaceToCeiling(c.a));
    // espaces gardés : ceux où entre la trajectoire prévue (limites ASFC au-dessus du relief) ; sur un téléphone, les
    // autres (au-dessus ou au-dessous du vol) rendent la coupe illisible ; sans trajectoire (pas de niveau) : tous
    const alt = data.plan?.alt,
      lim = window.SiaAero.limitFt,
      rel = t => window.SiaAero.limitRead(t).rel;
    if (alt && lim) data.crossed = data.crossed.filter(c => {
      for (let i = c.i0; i <= c.i1; i++) {
        const a = alt[i],
          q = data.samples[i];
        if (a == null) continue;
        const lo = (rel(c.a.lower) ? q.center : 0) + (lim(c.a.lower, false) || 0),
          up = lim(c.a.upper, true),
          hi = Number.isFinite(up) ? (rel(c.a.upper) ? q.center : 0) + up : Infinity;
        if (a >= lo && a <= hi) return true;
      }
      return false;
    });
    // MORA des cases traversées (sans relief) : une valeur par échantillon
    if (!terrainOk && mora) {
      const memo = new Map();
      for (const q of data.samples) {
        const k = `${Math.floor(q.lat)}|${Math.floor(q.lon)}`;
        if (!memo.has(k)) memo.set(k, await mora(q.lat, q.lon).catch(() => null));
        q.mora = memo.get(k);
      }
    }
    return data;
  }

  /** Dessin de la coupe (SiaProfile.draw), puis, sans relief, les MORA en marches tiretées ; rend la géométrie. */
  function draw(ctx, data, {
    W,
    H,
    scale = .8,
    window: win = null
  }) {
    const geo = P().draw(ctx, data, {
      W,
      H,
      scale,
      win: win && Number.isFinite(win.from) && Number.isFinite(win.to) ? {
        s0: win.from * NM,
        s1: win.to * NM
      } : null,
      limitFt: window.SiaAero.limitFt,
      abbrev: true,
      limits: false,
      strictLabels: true,
      reserveBottom: 18 * scale // marques NM posées par module.js au bas de la coupe
    });
    geo.drawn.terrain = !!data.terrainOk;
    geo.drawn.mora = !data.terrainOk && data.samples.some(q => Number.isFinite(q.mora));
    if (!data.terrainOk && data.samples.some(q => Number.isFinite(q.mora))) {
      const X = s => xOf(geo, s),
        Y = ft => geo.padT + (geo.H - geo.padT - geo.padB) * (1 - (Math.min(Math.max(ft, geo.bottom), geo.top) - geo.bottom) / (geo.top -
          geo
          .bottom));
      ctx.save();
      if (geo.zoomed) { // fenêtre : les marches de MORA sont rognées au cadre
        ctx.beginPath();
        ctx.rect(geo.padL, geo.padT, geo.W - geo.padL - geo.padR, geo.H - geo.padT - geo.padB);
        ctx.clip();
      }
      ctx.strokeStyle = '#8b2d18';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      let pen = false;
      for (const q of data.samples) {
        if (!Number.isFinite(q.mora)) {
          pen = false;
          continue;
        }
        const x = X(q.s),
          y = Y(q.mora);
        pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
      ctx.restore();
    }
    return geo;
  }
  /** Abscisse de la distance s (mètres) et distance de l'abscisse x ; la fenêtre dessinée (g.w0 .. g.w1), tout le vol sans elle. */
  const xOf = (g, s) => g.padL + (g.W - g.padL - g.padR) * (s - (g.w0 || 0)) / ((g.w1 ?? g.total) - (g.w0 || 0));
  const sOf = (g, x) => {
    const a = g.w0 || 0,
      b = g.w1 ?? g.total;
    return Math.max(a, Math.min(b, a + (x - g.padL) / (g.W - g.padL - g.padR) * (b - a)));
  };
  /** Échantillon le plus proche de la distance s (mètres). */
  const sampleAt = (data, s) => {
    const n = data.samples.length - 1,
      i = Math.max(0, Math.min(n, Math.round(s / data.total * n)));
    return [i, data.samples[i]];
  };
  const posAt = (data, s) => {
    const [, q] = sampleAt(data, s);
    return {
      lat: q.lat,
      lon: q.lon
    };
  };
  /** Ce qui est sous le curseur à la distance s : position, distance (NM), altitude prévue, relief, MORA, espaces
   *  traversés (nom, type, limites). */
  function at(data, s) {
    const [i, q] = sampleAt(data, s);
    return {
      s: q.s,
      nm: q.s / NM,
      lat: q.lat,
      lon: q.lon,
      alt: data.plan?.alt?.[i] ?? null,
      terrain: data.terrainOk ? q.terrain : null,
      mora: q.mora ?? null,
      zones: data.crossed.filter(c => i >= c.i0 && i <= c.i1).map(c => ({
        type: c.a.type,
        name: c.a.name,
        lower: c.a.lower || 'SFC',
        upper: c.a.upper || 'UNL',
        cls: c.a.cls || '',
        act: c.a.act || '',
        info: c.a.info || ''
      }))
    };
  }
  /** Place d'un point sur la route : { s (mètres depuis le départ), offNm (écart à la route) } de l'échantillon le plus
   *  proche. */
  function project(data, lat, lon) {
    let best = null,
      d = Infinity;
    const k = Math.cos(lat * Math.PI / 180);
    for (const q of data.samples) {
      const dl = q.lon -
        lon, // modulo 360 : les échantillons sont sur la route déroulée (un point de l'autre côté de la ligne de changement de date)
        e = Math.hypot(q.lat - lat, (dl - 360 * Math.round(dl / 360)) * k);
      if (e < d) {
        d = e;
        best = q.s;
      }
    }
    return {
      s: best,
      offNm: d * 60
    };
  }
  /** Distance (mètres) de l'échantillon le plus proche du point d'écran (x, y), à moins de maxPx ; null sinon. */
  function nearest(data, toC, x, y, maxPx = 32) {
    let best = null,
      d = maxPx;
    for (const q of data.samples) {
      const p = toC(q.lat, q.lon),
        e = Math.hypot(p.x - x, p.y - y);
      if (e < d) {
        d = e;
        best = q.s;
      }
    }
    return best;
  }

  window.MapsProfile = {
    build,
    draw,
    xOf,
    sOf,
    at,
    posAt,
    nearest,
    project
  };
})();
