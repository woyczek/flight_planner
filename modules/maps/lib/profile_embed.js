// V3 maps — le profil vertical de la Carte, appelable HORS de la Carte (modules/maps/INTEGRATION.md § 7 ter, SOG-0464) : le relief sous une
// route — une suite de positions { lat, lon } — dessiné dans un <canvas>. Rien n'est recopié : c'est le profil de la Carte (SiaProfile, lib/vertical_profile.js ;
// MapsProfile, profile.js), chargé ici sans l'écran de la Carte. L'appelant donne `load(url)` → Blob (la Carte : tileLoader(ctx) de state.js, ctx.net.fetch) : la
// brique n'appelle jamais fetch, aucun hôte n'est ajouté ici ; son module déclare lui-même s3.amazonaws.com/elevation-tiles-prod dans son `net`.
// Pur de l'état d'un module : aucune globale à soi, aucune écriture hors du canvas donné et de la ligne de la marge sur le relief posée juste après lui (clearLine).
//   import { loadProfile, drawProfile, clearance, clearSay, paintClear, clearLine } from '../maps/lib/profile_embed.js';

/** Les bibliothèques du profil (scripts classiques, une fois par page) : [variable globale, fichier du dossier du module], dans l'ordre. */
const LIBS = [
  ['SiaAero', '../lib/aero_symbols.js'],
  ['MapsRender', '../render.js'],
  ['SiaProfile', '../lib/vertical_profile.js'],
  ['MapsProfile', '../profile.js']
];
let libsP = null;
/** Charge les bibliothèques du profil (une fois) ; rend { SiaProfile, MapsProfile }, ou null si l'une ne vient pas (la demande suivante réessaie). */
export function loadProfile() {
  return libsP ||= (async () => {
    try {
      for (const [glob, file] of LIBS)
        if (!window[glob]) await import(new URL(`${file}?v=0`, import.meta.url).href);
      return window.SiaProfile && window.MapsProfile ? {
        SiaProfile: window.SiaProfile,
        MapsProfile: window.MapsProfile
      } : null;
    } catch {
      return null;
    } finally {
      if (!window.SiaProfile || !window.MapsProfile) libsP = null;
    }
  })();
}
/** Un échantillonneur de relief par chargeur : les tuiles lues sont gardées d'un dessin à l'autre (déplacer un lieu ne relit pas les mêmes tuiles). */
const samplers = new WeakMap();
const NM = 1852;
/** La croisière contre le relief (SOG-0502) : UN seuil, 500 ft, jusqu'à ce que les règles de vol (SOG-0534) le donnent. Une marge sous 0 est ROUGE, de 0 à 499 ft ORANGE, au-delà rien. */
export const CLEAR_ORANGE_FT = 500;
/** La teinte de la marge (en pieds, arrondie comme elle est écrite) : 'red' | 'orange' | '' ; `cruise` faux (la trajectoire ne se stabilise jamais : le niveau est hors d'atteinte) : une marge mince est celle d'une montée, normale, seule la marge négative est dite. */
export const clearLevel = (ft, cruise = true) => !Number.isFinite(ft) ? '' : ft < 0 ? 'red' : cruise && ft < CLEAR_ORANGE_FT ? 'orange' :
  '';
/** LA phrase, écrite ICI une seule fois (la Carte et l'atelier la reçoivent) : une ligne par teinte, quatre langues ; `after` est le bout « après {point} » (absent quand aucun point nommé ne précède). */
const CLEAR_TX = {
  red: ['Croisière sous le relief : {ft} ft trop bas, à {nm} NM{after}', 'Cruise below the terrain: {ft} ft too low, at {nm} NM{after}',
    'Reiseflug unter dem Gelände: {ft} ft zu niedrig, bei {nm} NM{after}',
    'Crucero bajo el relieve: {ft} ft demasiado bajo, a {nm} NM{after}'
  ],
  orange: ['Croisière à {ft} ft seulement au-dessus du relief, à {nm} NM{after}',
    'Cruise only {ft} ft above the terrain, at {nm} NM{after}',
    'Reiseflug nur {ft} ft über dem Gelände, bei {nm} NM{after}', 'Crucero a solo {ft} ft sobre el relieve, a {nm} NM{after}'
  ],
  after: [' après {point}', ' after {point}', ' nach {point}', ' después de {point}']
};
/** Les marges de la CROISIÈRE sur le relief lu : { list: [{ i, m, s }] (pieds, par échantillon), best } ; null sans relief lu ni altitude prévue.
 *  Dans la croisière seulement (du TOC au TOD ; sinon sans les 5 % de chaque bout) : au départ et à l'arrivée l'altitude prévue est celle du terrain, la marge y est nulle par construction. */
function margins(data) {
  const alt = data?.plan?.alt,
    toc = data?.plan?.toc?.s,
    tod = data?.plan?.tod?.s,
    both = Number.isFinite(toc) && Number.isFinite(tod) && tod > toc,
    from = both ? toc : data?.total * .05,
    to = both ? tod : data?.total * .95,
    list = [];
  if (!data?.terrainOk || !Array.isArray(alt) || !Array.isArray(data.samples)) return null;
  let best = null;
  for (let i = 0; i < data.samples.length; i++) {
    const q = data.samples[i],
      a = alt[i];
    if (a == null || !Number.isFinite(a) || !Number.isFinite(q.terrain) || q.s < from || q.s > to) continue;
    const e = {
      i,
      m: a - q.terrain,
      s: q.s
    };
    list.push(e);
    if (!best || e.m < best.m) best = e;
  }
  return best ? {
    list,
    best,
    cruise: both
  } : null;
}
/** La marge de la croisière sur le relief : { minFt, atNm, afterNm, below, level, after } (le plus bas point : sa marge en pieds, sa distance du départ en NM, sa distance après le point nommé `after` en NM, sous le relief ou non, sa teinte, le dernier point NOMMÉ avant lui) ; null sans relief lu ou sans altitude prévue. */
export function clearance(data) {
  const k = margins(data);
  if (!k) return null;
  const minFt = Math.round(k.best.m);
  let after = '',
    from = 0;
  for (const m of data.marks || [])
    if (m && typeof m.name === 'string' && m.name && Number.isFinite(m.s) && m.s <= k.best.s + 1) {
      after = m.name;
      from = m.s;
    }
  const atNm = Math.round(k.best.s / NM * 10) / 10;
  return {
    minFt,
    atNm,
    afterNm: after ? Math.round(Math.max(0, k.best.s - from) / NM * 10) / 10 :
    atNm, // les NM comptés APRÈS le point nommé (la phrase dit « à 5 NM après P2 ») ; sans point nommé, depuis le départ
    below: minFt < 0,
    level: clearLevel(minFt, k.cruise),
    after
  };
}
/** La phrase de la marge dans la langue de l'appelant : `t(ligne, variables)` est son traducteur (ctx.t), `fmt` { nm, ft } ses écritures des nombres (sinon tels quels) ; '' quand il n'y a rien à dire. */
export function clearSay(clear, t, fmt = {}) {
  const lv = clearLevel(clear?.minFt);
  if (!lv || !Number.isFinite(clear.atNm) || typeof t !== 'function') return '';
  return t(CLEAR_TX[lv], {
    ft: (fmt.ft || String)(Math.abs(Math.round(clear.minFt))),
    nm: (fmt.nm || String)(Number.isFinite(clear.afterNm) ? clear.afterNm : clear.atNm),
    after: clear.after ? t(CLEAR_TX.after, {
      point: clear.after
    }) : ''
  });
}
/** Peint sur la coupe déjà dessinée (`geo` : ce que MapsProfile.draw a rendu) la part fautive de la ligne de croisière, dans la teinte de la marge (jetons du cadre err et warn), et une marque au point le plus bas qui porte son
 *  chiffre : « −120 ft » sous le relief, « 380 ft » au-dessus ; jamais la teinte seule. Rien si la marge est large. opts : scale (comme le dessin), err et warn (sinon les jetons de la Carte). */
export function paintClear(ctx, geo, data, clear, opts = {}) {
  if (!clear?.level) return;
  const k = margins(data);
  if (!k) return;
  const tok = window.MapsRender?.tokens?.() || {},
    col = {
      red: opts.err || tok.err || '#b3261e',
      orange: opts.warn || tok.warn || '#9a5b00'
    },
    sc = opts.scale || 1,
    w0 = geo.w0 || 0,
    w1 = geo.w1 ?? geo.total,
    X = s => geo.padL + (geo.W - geo.padL - geo.padR) * (s - w0) / (w1 - w0),
    Y = ft => geo.padT + (geo.H - geo.padT - geo.padB) * (1 - (Math.min(Math.max(ft, geo.bottom), geo.top) - geo.bottom) / (geo.top - geo
      .bottom)),
    alt = data.plan.alt,
    step = data.samples.length > 1 ? (data.samples[1].s - data.samples[0].s) / 2 : 0,
    cls = e => clearLevel(Math.round(e.m), k.cruise),
    runs = [];
  for (const e of k.list) {
    const c = cls(e),
      last = runs[runs.length - 1];
    if (!c) continue;
    if (last && last.c === c && last.to === e.i - 1) {
      last.pts.push(e);
      last.to = e.i;
    } else runs.push({
      c,
      to: e.i,
      pts: [e]
    });
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(geo.padL, geo.padT, geo.W - geo.padL - geo.padR, geo.H - geo.padT - geo.padB);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  ctx.lineWidth = 4 * sc;
  for (const r of runs) {
    ctx.strokeStyle = col[r.c];
    ctx.beginPath();
    ctx.moveTo(X(r.pts[0].s - step), Y(alt[r.pts[0].i]));
    for (const e of r.pts) ctx.lineTo(X(e.s), Y(alt[e.i]));
    ctx.lineTo(X(r.pts[r.pts.length - 1].s + step), Y(alt[r.pts[r.pts.length - 1].i]));
    ctx.stroke();
  }
  // la marque au point le plus bas, avec son chiffre
  const x = X(k.best.s),
    y = Y(alt[k.best.i]),
    text = `${clear.minFt < 0 ? '−' : ''}${Math.abs(clear.minFt)} ft`,
    f = 11 * sc;
  ctx.fillStyle = col[clear.level];
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.8 * sc;
  ctx.beginPath();
  ctx.arc(x, y, 5 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `bold ${f}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 6 * sc,
    h = f + 4 * sc,
    lx = Math.min(geo.W - geo.padR - w / 2, Math.max(geo.padL + w / 2, x)),
    ly = y + 17 * sc + h > geo.H - geo.padB ? y - 22 * sc - h / 2 : y + 17 * sc + h /
    2; // sous la ligne, sous le nom de son palier (que la coupe écrit juste sous elle) ; au-dessus quand le bas du cadre manque
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillRect(lx - w / 2, ly - h / 2, w, h);
  ctx.fillStyle = col[clear.level];
  ctx.fillText(text, lx, ly);
  ctx.restore();
}
/** La ligne SOUS la coupe, écrite par le bloc lui-même (la Carte et l'atelier la reçoivent, au même endroit et de la même teinte) : un <p data-clear-line data-clear="red|orange"> posé juste après le canvas (après son
 *  conteneur quand le canvas y est posé en absolu : la Carte) ; sans phrase il est caché. Une écriture seulement si la valeur change. */
export function clearLine(canvas, clear, t, fmt) {
  const anchor = canvas.parentElement && getComputedStyle(canvas).position === 'absolute' ? canvas.parentElement : canvas,
    text = clearSay(clear, t, fmt),
    level = text ? clear.level : '';
  let p = anchor.nextElementSibling;
  if (!p || !p.hasAttribute('data-clear-line')) {
    if (!text) return;
    p = document.createElement('p');
    p.setAttribute('data-clear-line', '');
    p.setAttribute('role', 'status');
    p.style.cssText = 'margin:4px 0 0;font-weight:600;font-size:13px;line-height:1.35';
    p.hidden = true;
    anchor.after(p);
  }
  if (p.textContent !== text) p.textContent = text;
  if ((p.getAttribute('data-clear') || '') !== level) {
    if (level) p.setAttribute('data-clear', level);
    else p.removeAttribute('data-clear');
    p.style.color = level === 'red' ? 'var(--sog-err,#b3261e)' : level ? 'var(--sog-warn,#9a5b00)' : '';
  }
  if (p.hidden === !!text) p.hidden = !text;
}
/** Dessine dans `canvas` le profil de la route `points` ([{ lat, lon, id | name }], deux au moins).
 *  options : load (url → Blob ; sans lui ou hors ligne, la coupe se fait SANS relief), levelFt (niveau de croisière : sans lui, le relief seul), scale (0,8 comme la
 *  Carte), width et height (px CSS ; sinon la taille du canvas dans la page), t et fmt (le traducteur de l'appelant, ctx.t, et ses écritures { nm, ft } des nombres : avec t, la
 *  phrase de la marge de la croisière est écrite SOUS la coupe par clearLine, sans lui rien n'est écrit).
 *  → Promise<{ ok: true, terrain, nm } | { ok: false, stale: true } | null> : `terrain` faux = relief indisponible (hors ligne, tuile refusée : l'appelant le DIT) ;
 *  `nm` la longueur de la route ; null sans deux points, longueur nulle ou bibliothèques absentes ; `stale` quand un dessin plus récent du même canvas a pris la
 *  place (rien n'est peint par celui-là). */
export async function drawProfile(canvas, points, {
  load = null,
  levelFt = 0,
  scale = .8,
  width = 0,
  height = 0,
  t = null,
  fmt = null
} = {}) {
  const mine = canvas.__profileRun = (canvas.__profileRun || 0) + 1,
    pts = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
      ...p,
      lat: +p.lat,
      lon: +p.lon
    }));
  if (pts.length < 2) return null;
  const L = await loadProfile();
  if (!L) return null;
  let elevation = null;
  if (typeof load === 'function' && navigator.onLine !== false) {
    if (!samplers.has(load)) samplers.set(load, L.SiaProfile.terrainSampler(9, load));
    elevation = samplers.get(load);
  }
  let data;
  try {
    data = await L.MapsProfile.build(pts, {
      levelFt: +levelFt > 0 ? +levelFt : 0,
      elevation
    });
  } catch {
    return null; // longueur nulle, ou une coupe qui ne se construit pas
  }
  if (canvas.__profileRun !== mine) return {
    ok: false,
    stale: true
  };
  const W = Math.max(120, Math.round(width || canvas.clientWidth || canvas.width || 600)),
    H = Math.max(80, Math.round(height || canvas.clientHeight || canvas.height || 240)),
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const geo = L.MapsProfile.draw(ctx, data, {
    W,
    H,
    scale
  });
  // la marge du niveau prévu sur le relief (SOG-0464, SOG-0502) : mesurée, peinte sur la coupe (la part fautive de la ligne et son chiffre) et dite sous elle quand l'appelant donne son traducteur `t`
  const clear = clearance(data);
  paintClear(ctx, geo, data, clear, {
    scale
  });
  if (typeof t === 'function') clearLine(canvas, clear, t, fmt || undefined);
  return {
    ok: true,
    terrain: !!data.terrainOk,
    nm: data.total / NM,
    clear
  };
}
