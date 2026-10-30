(() => {
  'use strict';
  // V3 maps — espaces aériens (choix le long de la route, formes et libellés), voies aériennes, AAR et NAT, lecture des
  // espaces et des voies au point : partie du rendu sortie de render.js le 29 octobre 2026 (SPEC § 1 : aucun fichier du
  // module au-delà de 60 Ko). Script classique chargé après render.js : il lit les aides du noyau dans
  // window.MapsRender.kit, y range ses dessins (draw() les appelle par K) et ses fonctions publiques dans
  // window.MapsRender. Le code est celui de render.js, déplacé tel quel.
  const R = window.MapsRender;
  if (!R?.kit || R.parts?.airspace) return;
  const {
    A,
    PT,
    deg3,
    el,
    gc,
    halo,
    inBox,
    on,
    rad,
    trackOf,
    withAlpha,
    wrapLon,
    cartouche
  } = R.kit;

  // ---------------------------------------------------------------- choix des espaces le long de la route
  // « TMA LYON », « TMA BARCELONA AREA 1 » : le type une fois, même quand le nom le porte déjà (bases étrangères)
  const typed = a => {
    const t = String(a.type || ''),
      n = String(a.name || '');
    return t && !n.toUpperCase().startsWith(`${t.toUpperCase()} `) ? [t, n].filter(Boolean).join(' ') : n || t;
  };
  const family = (types, t) => types.has(t) || (t === 'RMZ-TMZ' && (types.has('RMZ') || types.has('TMZ')));
  // emprise des anneaux d'un espace, gardée à part : les fiches d'aerodb sont gelées (couche de données, références partagées) et une
  // propriété posée sur elles lève une TypeError qui vidait la lecture du couloir (utilisateur, 30 octobre : tout invisible en vue
  // générale) ; une WeakMap accepte une fiche gelée et la lâche avec elle
  const boxes = new WeakMap(),
    ringBox = a => {
      let b = boxes.get(a);
      if (!b) boxes.set(a, b = ringBoxOf(a));
      return b;
    },
    ringBoxOf = a => {
      let s = 90,
        n = -90,
        w = 180,
        e = -180;
      for (const r of a.rings || [])
        for (const [la, lo] of r) {
          s = Math.min(s, la);
          n = Math.max(n, la);
          w = Math.min(w, lo);
          e = Math.max(e, lo);
        }
      return {
        s,
        n,
        w,
        e
      };
    };
  /** Échantillons de la route (un tous les 2 NM environ). */
  function samples(points) {
    const out = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        n = Math.max(1, Math.ceil(gc(a, b) / 2));
      // les espaces d'aerodb sont en [-180, 180[ : les échantillons (route déroulée) y sont ramenés
      for (let k = 0; k < n; k++) out.push([a.lat + (b.lat - a.lat) * k / n, wrapLon(a.lon + (b.lon - a.lon) * k / n)]);
    }
    if (points.length) out.push([points[points.length - 1].lat, wrapLon(points[points.length - 1].lon)]);
    return out;
  }
  /** Vrai si l'espace est à moins de nm NM des échantillons de la route (un échantillon dedans ou un bord proche). */
  function nearRoute(a, smp, nm) {
    const b = ringBox(a),
      m = nm / 60;
    if (!smp.some(([la, lo]) => la >= b.s - m && la <= b.n + m && lo >= b.w - m * 2 && lo <= b.e + m * 2)) return false;
    const seg = (la, lo, p, q) => {
      const k = Math.cos(rad(la)),
        ax = (p[1] - lo) * 60 * k,
        ay = (p[0] - la) * 60,
        bx = (q[1] - lo) * 60 * k,
        by = (q[0] - la) * 60,
        dx = bx - ax,
        dy = by - ay,
        t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
      return Math.hypot(ax + t * dx, ay + t * dy);
    };
    const inside = (la, lo, ring) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [yi, xi] = ring[i],
          [yj, xj] = ring[j];
        if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    return smp.some(([la, lo]) => a.rings.some(r => inside(la, lo, r) || r.some((p, i) => i && seg(la, lo, r[i - 1], p) <= nm)));
  }
  /** Espaces à dessiner selon le profil : familles cochées, plancher / plafond, liste blanche ou noire (nom ou clé),
   *  couloir autour de la route (corridorNm). */
  function selectAirspaces(list, profile, route = []) {
    const types = new Set(profile?.zones || []),
      lo = parseFloat(el(profile, 'zoneFloor')),
      hi = parseFloat(el(profile, 'zoneCeil')),
      names = (profile?.zoneList || []).map(x => String(x).toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean),
      hit = a => names.some(q => [a.name, a.key, a.type + a.name].some(v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
        .includes(q))),
      lim = A()?.limitFt;
    if (!types.size) return [];
    let out = (list || []).filter(a => family(types, a.type) && (!(lo > 0) || !lim || lim(a.upper, true) > lo) && (!(hi > 0) || !lim ||
      lim(a.lower, false) < hi) && (!names.length || (profile.zoneMode === 'black' ? !hit(a) : hit(a))));
    const nm = +profile?.corridorNm || 0,
      pts = route.filter(p => Number.isFinite(p?.lat));
    if (nm > 0 && pts.length >= 2) {
      const smp = samples(pts);
      out = out.filter(a => nearRoute(a, smp, nm));
    }
    return out;
  }

  // ---------------------------------------------------------------- dessin des espaces et des voies
  /** Espaces : formes (part 'shapes') ou libellés (part 'labels'). Les libellés sont posés un espace à la fois, dans
   *  l'ordre du studio (plus grande emprise d'abord), pour relever le cadre de chacun : rend [{ x0, y0, x1, y1, a }]
   *  (infobulle au survol du libellé). */
  function drawZones(ctx, zones, toC, W, H, scale, pl, profile, part) {
    const showLabels = on(profile, 'zoneLabelsShow');
    if (part === 'labels' && !showLabels) return [];
    const opts = {
      W,
      H,
      scale,
      font: +el(profile, 'zoneFont') * PT * scale,
      limits: on(profile, 'zoneLimitsShow'),
      alpha: (+el(profile, 'zoneOpacity') || 50) / 100,
      abbrev: on(profile, 'zoneAbbrev'),
      smallCross: on(profile, 'zoneSmallCross'),
      placer: pl,
      shapes: part !== 'labels',
      labels: part !== 'shapes' && showLabels
    };
    if (part !== 'labels') {
      A().drawAirspaces(ctx, zones, toC, opts);
      return [];
    }
    const area = a => {
        let x0 = Infinity,
          y0 = Infinity,
          x1 = -Infinity,
          y1 = -Infinity;
        for (const r of a.rings || [])
          for (const [lat, lon] of r) {
            const q = toC(lat, lon);
            if (q.x < x0) x0 = q.x;
            if (q.x > x1) x1 = q.x;
            if (q.y < y0) y0 = q.y;
            if (q.y > y1) y1 = q.y;
          }
        return x1 > x0 ? (x1 - x0) * (y1 - y0) : 0;
      },
      hits = [];
    let cur = null;
    // placeur partagé, vu au travers : chaque cadre réservé pendant le libellé d'un espace lui est attribué
    const seen = pl ? new Proxy(pl, {
      get(o, p) {
        if (p === 'take') return r => {
          const ok = o.take(r);
          if (ok && cur) hits.push({
            x0: r.x0,
            y0: r.y0,
            x1: r.x1,
            y1: r.y1,
            a: cur
          });
          return ok;
        };
        const v = o[p];
        return typeof v === 'function' ? v.bind(o) : v;
      }
    }) : pl;
    for (const {
        a
      }
      of zones.map(a => ({
        a,
        k: area(a)
      })).sort((x, y) => y.k - x.k)) {
      cur = a;
      A().drawAirspaces(ctx, [a], toC, {
        ...opts,
        placer: seen
      });
    }
    return hits;
  }

  /** Voies aériennes : basses (trait bleu) et hautes (tireté violet), selon le profil ; étiquettes comme les cartes en
   *  route : nom de la voie dans un cartouche couché le long du tronçon, niveau minimal dessous (F195) ; de près, la
   *  distance du tronçon (NM) et les routes vraies à chaque bout. Rend les bouts des tronçons dessinés (leurs points). */
  function drawAirways(ctx, airways, toC, scale, b, pl, profile, tier = 'near', onRoute = new Set(), env) {
    const lo = on(profile, 'airwaysLow'),
      hi = on(profile, 'airwaysHigh'),
      ends = new Map();
    ends.later = []; // étiquettes à poser après les points des voies
    ends.hits = []; // cartouches posés (centre, rayon, tronçon) : infobulle des voies
    ends.over = []; // cartouches des voies que suit la route : peints après le trait de la route, par-dessus
    if (!(lo || hi) || !airways?.length) return ends;
    // un seul élément (§ 10.29 g) : la case « Noms des voies » des Couches (awLabels) commande le cartouche du nom, et avec lui
    // la distance et les routes du tronçon
    const lab = el(profile, 'awLabels') !== false,
      t = {
        s: b.s - .3,
        n: b.n + .3,
        w: b.w - .5,
        e: b.e + .5
      },
      seen = new Set(),
      named = [], // tronçons à nommer, dans l'ordre des traits
      f = 8.5 * PT * scale * .8;
    ctx.save();
    ctx.lineCap = 'round';
    // un tronçon une seule fois (V3 maps, 30 octobre : « toujours ce recouvrement ») : lu par plusieurs boîtes du couloir, le même
    // tronçon arrivait en objets distincts ; le second, trouvant le milieu pris, glissait son étiquette plus loin sur le même trait
    const once = new Set(),
      endKey = e => e?.id || `${(+e?.lat).toFixed(4)},${(+e?.lon).toFixed(4)}`;
    for (const g of airways) {
      const k = [g.route, ...[endKey(g.a), endKey(g.b)].sort()].join('|');
      if (once.has(k)) continue;
      once.add(k);
      const high = (+g.lower || 0) >= 19500 || /^U/.test(g.route);
      if (high ? !hi : !lo) continue;
      if (!inBox(t, g.a.lat, g.a.lon) && !inBox(t, g.b.lat, g.b.lon)) continue;
      const P = toC(g.a.lat, g.a.lon),
        Q = toC(g.b.lat, g.b.lon),
        col = high ? env.pal.airwayHigh : env.pal.airwayLow,
        len = Math.hypot(Q.x - P.x, Q.y - P.y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = .75;
      ctx.lineWidth = (high ? 1 : 1.2) * scale;
      ctx.setLineDash(high ? [6 * scale, 4 * scale] : []);
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(Q.x, Q.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const e of [g.a, g.b])
        if (e?.id) ends.set(`${e.id}|${e.lat.toFixed(3)}|${e.lon.toFixed(3)}`, e);
      if (lab && len >= 60 * scale) named.push({
        g,
        P,
        Q,
        col,
        len
      });
    }
    // les noms après TOUS les traits (V3 maps, 24 Oct : « les noms des AWY au-dessus des traits, pas l'inverse ») : posés dans la
    // boucle des traits, ils étaient barrés par les voies tracées ensuite ; les plus longs tronçons d'abord (deux étiquettes voisines
    // qui se recouvriraient : celle du plus long reste)
    named.sort((x, y) => y.len - x.len);
    for (const {
        g,
        P,
        Q,
        col,
        len
      }
      of named) {
      // cartouche couché sur le tronçon (texte toujours lisible de gauche à droite), en son milieu ; s'il couvrirait un libellé
      // déjà posé (les libellés de la route sont réservés les premiers), il glisse le long du trait, jamais à côté. Sur une
      // branche de la route il est peint après le trait de la route, par-dessus, fond plein : la route y est interrompue
      // (convention des cartes en route) ; sa place ne dépend pas de la route
      let ang = Math.atan2(Q.y - P.y, Q.x - P.x);
      if (ang > Math.PI / 2) ang -= Math.PI;
      if (ang < -Math.PI / 2) ang += Math.PI;
      const along = onRoute.has(`${g.a?.id}|${g.b?.id}`),
        lvl = +g.lower >= 1000 ? `F${String(Math.round(+g.lower / 100)).padStart(3, '0')}` : '',
        nm = el(profile, 'awLabels') !== false && Number.isFinite(+g.nm) ? String(Math.round(+g.nm)) : '',
        sub = [nm, tier !== 'far' ? lvl : ''].filter(Boolean),
        w = g.route.length * f * .62 + 6 * scale,
        ws = sub.join(' · ').length * f * .85 * .6,
        r = Math.max(w, ws, f * 3) / 2 + 2,
        at = u => ({
          x: P.x + (Q.x - P.x) * u,
          y: P.y + (Q.y - P.y) * u
        }),
        box = c => ({
          x0: c.x - r,
          y0: c.y - r,
          x1: c.x + r,
          y1: c.y + r
        }),
        // le milieu, puis de part et d'autre, sans sortir du tronçon (un demi-cartouche des bouts)
        lim = Math.min(.45, Math.max(0, .5 - (r + 4) / Math.max(1, len))),
        spots = [0, .1, -.1, .2, -.2, .3, -.3, .4, -.4].filter(d => Math.abs(d) <= lim).map(d => at(.5 + d)),
        c = pl ? spots.find(q => !seen.has(`${g.route}|${Math.round(q.x / 90)}|${Math.round(q.y / 90)}`) && pl.take(box(q))) : spots[0];
      if (!c || len < 2 * r) continue; // le tronçon plus court que son étiquette : pas d'étiquette (le trait reste)
      const {
        x,
        y
      } = c;
      seen.add(`${g.route}|${Math.round(x / 90)}|${Math.round(y / 90)}`);
      ends.hits.push({
        x,
        y,
        r,
        g
      });
      // la cartouche de la voie (la primitive du noyau, R-M5) : son nom en blanc sur sa couleur, tournée le long du tronçon ; la route
      // interrompue : un liseré du fond autour ; une seule ligne sous elle : la distance (couleur de la voie), puis le niveau minimal
      // (rouge), « 22 · F065 »
      const paint = () => {
        const small = `700 ${f * .85}px Arial,sans-serif`,
          parts = !sub.length ? [] : nm && sub.length > 1 ? [
            [nm, col],
            [' · ', col],
            [sub[1], env.pal.airwayLevel]
          ] : [
            [sub[0], nm ? col : env.pal.airwayLevel]
          ];
        cartouche(ctx, {
          x0: -w / 2,
          y0: -f * .7,
          x1: w / 2,
          y1: f * .7
        }, {
          at: {
            x,
            y,
            angle: ang
          },
          margin: along ? {
            px: 2 * scale,
            color: env.theme.bg
          } : null,
          fill: col,
          rows: [{
            center: true,
            y: 0,
            runs: [{
              t: g.route,
              color: env.theme.bg,
              font: `700 ${f}px Arial,sans-serif`
            }]
          }, ...(parts.length ? [{
            center: true,
            y: f * 1.35,
            runs: parts.map(([t, cl]) => ({
              t,
              color: cl,
              font: small
            }))
          }] : [])]
        });
      };
      if (along) ends.over.push(paint);
      else paint();
      if (el(profile, 'awLabels') !== false && len > 140 * scale) {
        // routes vraies près de chaque bout (comme « 097° » sur les cartes)
        for (const [A, B, from] of [
            [P, Q, g.a],
            [Q, P, g.b]
          ]) {
          const d = Math.hypot(B.x - A.x, B.y - A.y),
            u = 26 * scale / d,
            px = A.x + (B.x - A.x) * u,
            py = A.y + (B.y - A.y) * u,
            to = from === g.a ? g.b : g.a,
            tw = 4 * f * .8 * .62;
          // posées après les points des voies (leurs noms passent d'abord)
          ends.later.push(() => {
            if (!pl || pl.take({
                x0: px - tw / 2,
                y0: py - 7 * scale - f * .5,
                x1: px + tw / 2,
                y1: py - 7 * scale + f * .5
              })) halo(ctx, deg3(trackOf(from, to)), px, py - 7 * scale, f * .8, col, 'center');
          });
        }
      }
    }
    ctx.restore();
    return ends;
  }
  /** Points des voies dessinées qui ne sont pas des balises (fixes, intersections) : triangle et nom. */
  /** Trait fléché de a vers b (points du canevas). */
  function arrowLine(ctx, a, b, scale) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x),
      h = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - h * Math.cos(ang - .4), b.y - h * Math.sin(ang - .4));
    ctx.lineTo(b.x - h * Math.cos(ang + .4), b.y - h * Math.sin(ang + .4));
    ctx.closePath();
    ctx.fill();
  }
  /** Axes de ravitaillement en vol (aerodb.aarTracks) : hippodrome vert sombre légèrement teinté, branche aller fléchée
   *  IP → CP et nom de l'axe ; axes lourds : leurs deux branches fléchées. */
  function drawAar(ctx, tracks, toC, scale, b, pl, env) {
    if (!tracks?.length) return;
    const col = env.pal.aar,
      t = {
        s: b.s - 1,
        n: b.n + 1,
        w: b.w - 1.5,
        e: b.e + 1.5
      },
      f = 10 * scale;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = col;
    for (const tr of tracks) {
      const legs = tr.ring ? [
        [tr.ip, tr.cp]
      ] : tr.legs || [];
      if (!legs.length || ![...(tr.ring || []), ...legs.flat()].some(p => inBox(t, p.lat, p.lon))) continue;
      if (tr.ring) {
        ctx.beginPath();
        tr.ring.forEach((p, i) => {
          const q = toC(p.lat, p.lon);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.closePath();
        ctx.fillStyle = withAlpha(col, .08);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.lineWidth = 1.4 * scale;
        ctx.setLineDash([5 * scale, 3 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.lineWidth = 2 * scale;
      for (const [a, c] of legs) arrowLine(ctx, toC(a.lat, a.lon), toC(c.lat, c.lon), scale);
      const [a, c] = legs[0],
        m = toC((a.lat + c.lat) / 2, (a.lon + c.lon) / 2),
        w = tr.name.length * f * .62;
      if (!pl || pl.take({
          x0: m.x + 4 * scale,
          y0: m.y - f * .7,
          x1: m.x + 6 * scale + w,
          y1: m.y + f * .7
        })) halo(ctx, tr.name, m.x + 5 * scale, m.y, f, col, 'left');
    }
    ctx.restore();
  }
  /** Tracks NAT du jour (aerodb.natTracks) : tireté ardoise par les points de la track, « NAT A FL350–400 » au premier
   *  point. */
  function drawNat(ctx, tracks, toC, scale, b, pl, env) {
    if (!tracks?.length) return;
    const col = env.pal.nat,
      f = 10 * scale;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = col;
    ctx.lineWidth = 1.6 * scale;
    for (const tr of tracks) {
      const pts = (tr.points || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
      if (pts.length < 2) continue;
      ctx.setLineDash([8 * scale, 4 * scale]);
      ctx.beginPath();
      pts.forEach((p, i) => {
        const q = toC(p.lat, p.lon);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      const lv = [...(tr.west || []), ...(tr.east || [])].map(Number).filter(Number.isFinite),
        text = `NAT ${tr.id}${lv.length ? ` FL${Math.min(...lv)}–${Math.max(...lv)}` : ''}`,
        q = toC(pts[0].lat, pts[0].lon),
        w = text.length * f * .62;
      if (!pl || pl.take({
          x0: q.x + 4 * scale,
          y0: q.y - f * 1.6,
          x1: q.x + 6 * scale + w,
          y1: q.y - f * .2
        })) halo(ctx, text, q.x + 5 * scale, q.y - f * .9, f, col, 'left');
    }
    ctx.restore();
  }
  /** Notation SIA d'un espace : « TMA AQUITAINE 8 2000|FL145 D » — type, nom, plancher | plafond (ft AMSL sans
   *  unité, ASFC précisé, SFC, FL, UNL), classe ; activation et informations sur une seconde ligne si elles sont
   *  connues. Rend [ligne principale, ligne secondaire]. */
  function siaLimit(v) {
    const t = String(v ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!t || /^(SFC|GND)$/.test(t)) return 'SFC';
    if (/UNL/.test(t) || /^FL\s*999/.test(t)) return 'UNL';
    let m = /^FL\s*(\d+)/.exec(t);
    if (m) return `FL${m[1].padStart(3, '0')}`;
    m = /^(\d+)\s*(FT|M)?\s*(AMSL|MSL|ASFC|AGL|SFC)?/.exec(t);
    if (m) return m[3] && /ASFC|AGL|SFC/.test(m[3]) ? `${m[1]} ASFC` : m[1];
    return t;
  }
  const sia = a => [
    // limites omises quand l'espace n'en porte aucune (FIR, UTA de la base : rien plutôt que « SFC|SFC »)
    typed(a) + (a.lower == null && a.upper == null ? '' : ` ${siaLimit(a.lower)}|${siaLimit(a.upper)}`) +
    (a.cls ? ` ${a.cls}` : ''),
    [a.act, a.info].filter(Boolean).join(' · ')
  ];
  /** Niveau d'une voie (pieds) en notation SIA : FL au-dessus de 5000 ft, UNL au plafond ouvert. */
  const awLimit = ft => {
    const v = +ft;
    if (!Number.isFinite(v) || v <= 0) return 'SFC';
    if (v >= 66000) return 'UNL';
    return v >= 5000 ? `FL${String(Math.round(v / 100)).padStart(3, '0')}` : String(Math.round(v));
  };
  /** Tronçons dont le cartouche est sous (x, y) (pixels du canevas), le plus proche d'abord. */
  const airwaysAt = (hits, x, y) => (hits || []).map(h => ({
    h,
    d: Math.hypot(h.x - x, h.y - y)
  })).filter(o => o.d <= o.h.r + 4).sort((a, b) => a.d - b.d).map(o => o.h.g);
  /** L'ordre de lecture des espaces d'un point (mot de l'utilisateur, 26 octobre : « le plus haut en haut, le plus bas en bas »), écrit
   *  ici une seule fois : la feuille « n espaces sur ce point » (liste et colonnes du graphique), l'infobulle et la ligne du curseur du
   *  profil le prennent. Tri sur place et rendu : plafond décroissant (UNL le plus haut), puis plancher décroissant, puis le nom. Les
   *  hauteurs ASFC sont comptées depuis 0, comme le graphique. Plafond vide, illisible ou sous le plancher : classé avec son plancher
   *  (comme si le plafond le valait), après les plafonds connus de même valeur. Fonctionne sur tout objet { type, name, lower, upper }. */
  function sortAirspacesTopDown(list) {
    const read = A()?.limitRead;
    const key = a => {
      const l = read ? read(a.lower, false) : {},
        u = read ? read(a.upper, true) : {},
        lo = l.ok && Number.isFinite(l.ft) ? Math.max(0, l.ft) : 0,
        known = !!(u.ok && (u.unl || Number.isFinite(u.ft) && u.ft > lo));
      return {
        up: u.ok && u.unl ? Infinity : known ? u.ft : lo,
        unk: known ? 0 : 1,
        lo,
        name: typed(a)
      };
    };
    const k = new Map((list || []).map(a => [a, key(a)]));
    return (list || []).sort((x, y) => {
      const a = k.get(x),
        b = k.get(y);
      return a.up === b.up ? a.unk - b.unk || b.lo - a.lo || a.name.localeCompare(b.name) : b.up > a.up ? 1 : -1;
    });
  }
  /** Espaces de la liste qui contiennent le point (lat, lon) : `shown`, du plus haut au plus bas (`sortAirspacesTopDown`), sans ceux qui vont de la
   *  surface au plafond (règle d'affichage du 25 octobre : SiaAero.surfaceToCeiling), et `also`, les noms de ces espaces écartés
   *  (« FIR PARIS », « SIV POITIERS »), sans doublon, FIR, UIR, SIV d'abord puis les autres par nom : la ligne « Aussi ici » de la
   *  feuille et de l'infobulle (règle 21 amendée, 26 octobre : le SIV ou la FIR à appeler se lit, jamais en colonne). `more` : espaces
   *  de la même lecture que le choix des couches a écartés (la FIR décochée reste un service à appeler) ; seuls les écartés par la
   *  règle y sont repris. */
  function airspacesAround(list, lat, lon, more = []) {
    lon = wrapLon(lon); // un toucher sur la carte de l'autre côté de la ligne de changement de date : 195° → 165° W
    const inRing = r => {
      let c = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [yi, xi] = r[i],
          [yj, xj] = r[j];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const flat = A()?.surfaceToCeiling || (() => false),
      shown = [],
      skipped = [];
    for (const a of list || []) {
      if (!(a.rings || []).some(inRing)) continue;
      (flat(a) ? skipped : shown).push(a);
    }
    for (const a of more || [])
      if (flat(a) && (a.rings || []).some(inRing)) skipped.push(a); // lus mais écartés par le choix des couches
    sortAirspacesTopDown(shown);
    const rank = a => ['FIR', 'UIR', 'SIV'].indexOf(String(a.type || '').toUpperCase()),
      key = a => {
        const r = rank(a);
        return r < 0 ? 3 : r;
      },
      name = a => typed(a);
    skipped.sort((x, y) => key(x) - key(y) || name(x).localeCompare(name(y)));
    return {
      shown,
      also: [...new Set(skipped.map(name).filter(Boolean))]
    };
  }
  /** Espaces à dessiner au point (lat, lon) : `airspacesAround(...).shown`. */
  const airspacesAt = (list, lat, lon) => airspacesAround(list, lat, lon).shown;

  // son espace de noms, gelé (§ 10.29 e) : le noyau l'appelle par MapsRender.parts.airspace ; rien n'est rangé dans le kit
  Object.defineProperty(R.parts, 'airspace', {
    value: Object.freeze({
      drawZones,
      drawAirways,
      drawAar,
      drawNat
    }),
    enumerable: true
  });
  Object.assign(R, {
    selectAirspaces,
    sia,
    siaLimit,
    airspacesAt,
    airspacesAround,
    sortAirspacesTopDown,
    airwaysAt,
    awLimit
  });
})();
