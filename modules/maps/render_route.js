(() => {
  'use strict';
  // V3 maps — libellés de la route (réservés avant tout le reste) et son tracé : partie du rendu sortie de render.js le
  // 29 octobre 2026 (SPEC § 1 : aucun fichier du module au-delà de 60 Ko). Script classique chargé après render.js : il lit
  // les aides du noyau dans window.MapsRender.kit et y range ses dessins (draw() les appelle par K). Le code est celui de
  // render.js, déplacé tel quel.
  const R = window.MapsRender;
  if (!R?.kit || R.parts?.route) return;
  const {
    halo
  } = R.kit;

  /** Branches de la route (paires d'identifiants consécutifs, dans les deux sens) : le cartouche d'une voie qui en suit une est
   *  dessiné au-dessus du trait de la route (qui le couvrirait sinon), toujours posé sur son tronçon. */
  const routeLegs = route => {
    const s = new Set();
    for (let i = 1; i < (route || []).length; i++) {
      const a = String(route[i - 1]?.id || ''),
        b = String(route[i]?.id || '');
      if (a && b) s.add(`${a}|${b}`).add(`${b}|${a}`);
    }
    return s;
  };
  /** Libellés de la route (points : identifiant et niveau ; marques NM) réservés dans le placeur avant tout le reste :
   *  [{ text, x, y, size, align }] ; les extrémités sont toujours écrites. */
  function routeLabels(route, toC, scale, pl, mk = [], level = null, env) {
    const pts = (route || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon)),
      f0 = 12 * scale,
      out = [];
    if (pts.length < 2) return out;
    for (const [i, p] of pts.entries()) {
      const q = toC(p.lat, p.lon),
        end = i === 0 || i === pts.length - 1,
        // altitude à atteindre au point (alt), sinon niveau tenu à partir du point (lvl ; pas au départ, déjà en tête)
        h = Number.isFinite(p.alt) ? p.alt : i > 0 && !end && +p.lvl?.ft > 0 ? +p.lvl.ft : NaN,
        // niveau écrit comme dans toute la suite (formatLevel de frame/lib/route_text.js, donné par l'écran)
        alt = Number.isFinite(h) ? level ? level(h) : h >= 10000 ? `FL${Math.round(h / 100)}` : `${h} ft` : '',
        text = [p.id || p.name || '', alt].filter(Boolean).join(' · ');
      if (!text) continue;
      const f = end ? 13 * scale : f0,
        r = {
          x0: q.x + 7 * scale,
          y0: q.y + 2 * scale,
          x1: q.x + 9 * scale + text.length * f * .6,
          y1: q.y + 4 * scale + f * 1.2
        };
      // les deux bouts toujours écrits (sans place : quand même, sans la réserver)
      R.kit.ask(pl, {
        layer: 'routeLabels',
        rank: 'route',
        key: `${p.id || p.name}@${(+p.lat).toFixed(4)},${(+p.lon).toFixed(4)}`,
        anchor: q,
        force: end ? 'paint' : false,
        boxes: [r],
        paint: () => out.push({
          text,
          x: r.x0,
          y: q.y + 3 * scale + f * .6,
          size: f,
          align: 'left'
        })
      });
      // heure estimée du point (vol démarré, de près : p.eta, posé par l'écran) : sous son nom, sinon au-dessus du point,
      // sinon à sa gauche ; réservée avec les libellés de la route, avant les terrains (jamais sur « LFBD »)
      if (p.eta) {
        const fe = f * .85,
          we = p.eta.length * fe * .6,
          spots = [
            [r.x0, r.y1 + 1 * scale, 'left'],
            [q.x + 7 * scale, q.y - 6 * scale - fe * 1.2, 'left'],
            [q.x - 9 * scale - we, q.y + 2 * scale, 'left'],
            [q.x - 9 * scale - we, q.y - 6 * scale - fe * 1.2, 'left']
          ];
        R.kit.ask(pl, {
          layer: 'routeLabels',
          rank: 'route',
          key: `eta:${p.id || p.name}`,
          anchor: q,
          boxes: spots.map(([x, y, align]) => ({
            x0: x,
            y0: y,
            x1: x + we + 2 * scale,
            y1: y + fe * 1.2,
            x,
            y,
            align
          })),
          paint: e => out.push({
            text: p.eta,
            x: e.x,
            y: e.y + fe * .6,
            size: fe,
            align: e.align,
            color: env.theme.accent
          })
        });
      }
    }
    const f = f0;
    for (const m of mk) {
      const q = toC(m.lat, m.lon),
        text = String(m.nm),
        w = text.length * f * .55,
        r = {
          x0: q.x - w / 2 - 1,
          y0: q.y - 4 * scale - f * 1.1,
          x1: q.x + w / 2 + 1,
          y1: q.y - 4 * scale
        };
      R.kit.ask(pl, {
        layer: 'routeLabels',
        rank: 'route',
        key: `nm:${text}@${Math.round(q.x)},${Math.round(q.y)}`,
        anchor: q,
        boxes: [r],
        paint: () => out.push({
          text,
          x: q.x,
          y: q.y - 4 * scale - f * .55,
          size: f * .85,
          align: 'center'
        })
      });
    }
    return out;
  }
  /** Route : trait violet, points, marques de distance (NM), libellés réservés (routeLabels). */
  function drawRoute(ctx, route, toC, scale, labels = [], {
    marks: mk = [],
    color = null,
    lines = null
  } = {}, env) {
    color ||= env.pal.route;
    const pts = (route || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // lines : les suites de points que la route trace (la SID et la STAR choisies dessinent leurs propres tronçons) ; sans elles,
    // tous les points de la route
    const line = () => {
      for (const run of lines || [pts]) {
        ctx.beginPath();
        run.forEach((p, i) => {
          const q = toC(p.lat, p.lon);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.stroke();
      }
    };
    // liseré du fond (détache la route des voies et des limites qu'elle croise), puis le trait : le plus épais de la carte
    ctx.strokeStyle = env.theme.bg;
    ctx.lineWidth = Math.max(5, 7.5 * scale);
    line();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.5, 4 * scale);
    line();
    // marques NM : point plein sur la route
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    for (const m of mk) {
      const q = toC(m.lat, m.lon);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 3 * scale, 0, Math.PI * 2);
      ctx.fillStyle = color; // plein, de la couleur de la route : un point du fond la ferait paraître tiretée
      ctx.fill();
    }
    for (const [i, p] of pts.entries()) {
      const q = toC(p.lat, p.lon),
        end = i === 0 || i === pts.length - 1;
      ctx.beginPath();
      ctx.arc(q.x, q.y, (end ? 6 : 4.5) * scale, 0, Math.PI * 2);
      ctx.fillStyle = env.theme.bg;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, (end ? 2.5 : 2) * scale);
      ctx.stroke();
    }
    for (const l of labels) halo(ctx, l.text, l.x, l.y, l.size, l.color || color, l.align);
    ctx.restore();
  }

  // son espace de noms, gelé (§ 10.29 e) : le noyau l'appelle par MapsRender.parts.route
  Object.defineProperty(R.parts, 'route', {
    value: Object.freeze({
      routeLegs,
      routeLabels,
      drawRoute
    }),
    enumerable: true
  });
})();
