// V3 maps — la coupe météo dans la feuille (modules/maps/SPEC.md § 9, INTEGRATION § 8) : le rendu pur d'Atmosphère
// (modules/atmosphere/section.js, chargé au premier « Météo ») sur la prévision que la couche météo du cadre garde déjà
// (ctx.weather.grid en cacheOnly, frame/INTEGRATION.md § 14) : la Carte ne demande jamais rien à Open-Meteo et n'écrit aucun
// fichier météo. Même curseur et même fenêtre que le profil ; la légende est celle que la coupe rend.

import {
  S,
  esc,
  tt,
  setData,
  FT_NM,
  onMission,
  level
} from './state.js';
import {
  createAxisWindow
} from './lib/axis_window.js';
import {
  isStarted
} from '../../frame/lib/current_flight.js';
import {
  TX
} from './texts.js';
import {
  openData
} from './sheet_view.js';
import {
  setCursor,
  windowNm,
  onWindow
} from './profile_view.js';

/** Les séries que la coupe dessine : les mêmes pour drawSection (o.layers) et pour sa légende (sectionLegend). */
const WX_LAYERS = {
  cloud: true,
  iso: true,
  inv: true,
  ice: true,
  wind: true,
  cu: true
};
/** La coupe peut-elle être dessinée : la couche météo du cadre, un vol à deux points au moins, pas une carte de mission. */
export const canWeather = () => !!S?.ctx.weather?.grid && !onMission() && S.route.points.length >= 2;
/** Identité de la coupe : la version du vol montrée (une nouvelle version refait la coupe). */
const wxKey = () => `wx:${S.route.updated || ''}`;
/** Points de la route comme la coupe les lit (route.points, alt_ft : niveau tenu à partir du point). */
const wxPoints = f => (f?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
  id: String(p.id || p.name || ''),
  lat: +p.lat,
  lon: +p.lon,
  alt_ft: +p.alt_ft || 0
}));
/** Heure de départ (secondes) : started.at d'un vol démarré, sinon planned_at, sinon maintenant (SPEC § 9). */
function depTime(f) {
  const t = Date.parse((isStarted(f) ? f.started.at : f?.planned_at) || '');
  return Number.isFinite(t) ? t / 1000 : Math.ceil(Date.now() / 36e5) * 3600;
}

/** Lit la prévision gardée pour le vol montré et prépare le dessin : { key, state: 'ok' | 'none' | 'fail', draw, legend, o } ;
 *  none : rien (ou pas assez) dans le cache pour ce vol ; fail : les fichiers d'Atmosphère n'ont pas pu être chargés. */
async function loadWeather(key) {
  let Sx, A;
  try {
    [Sx, A] = await Promise.all([import('../atmosphere/section.js'), import('../atmosphere/atmo.js')]);
  } catch {
    return {
      key,
      state: 'fail'
    };
  }
  try {
    const f = S.route.flight,
      pts = wxPoints(f),
      levelFt = S.route.levelFt || +f?.quote?.levelFt || 0;
    if (pts.length < 2 || !levelFt) return {
      key,
      state: 'none'
    };
    const mid = pts[Math.floor(pts.length / 2)],
      places = Sx.sectionPlaces(pts),
      dep = depTime(f),
      r = await S.ctx.weather.grid(places, dep, Sx.sectionVars(levelFt, pts), {
        model: S.ctx.weather.modelFor(mid.lat, mid.lon).id,
        cacheOnly: true
      }).catch(() => null);
    if (!r?.locs?.length) return {
      key,
      state: 'none'
    };
    const o = {
      route: pts,
      levelFt,
      // le profil de Carburant n'est repris que s'il est de Carburant (écrit par la carte, il est périmé : taux par défaut)
      profile: f?.by && f.by !== 'fuel' ? null : f?.profile || null,
      profileLevelFt: levelFt,
      depTime: dep,
      cruiseKt: A.cruiseKtOf(f?.route?.text) || 200,
      locs: A.locations(r.locs),
      id: 'mp-wx',
      fmtLvl: level,
      labels: {
        strips: TX.wxStrips.map(row => tt(row))
      }
    };
    // le modèle (trajectoire, colonnes, champ) est calculé une fois : le dessin le reprend à chaque taille et à chaque curseur
    o.model = Sx.sectionModel({
      points: pts,
      levelFt,
      profile: o.profile,
      profileLevelFt: levelFt,
      depTime: o.depTime,
      cruiseKt: o.cruiseKt,
      samples: places,
      locs: o.locs
    });
    return {
      key,
      state: 'ok',
      draw: Sx.drawSection,
      legend: Sx.sectionLegend,
      o
    };
  } catch {
    return {
      key,
      state: 'none'
    };
  }
}
/** Constructeur du contenu « weather » pour openData : dessine dans la zone, ou rend une ligne (lecture, rien dans le cache,
 *  fichiers indisponibles). */
const weatherBuild = key => (w, h, el) => {
  const wx = S.wx?.key === key ? S.wx : null;
  S.wxGeo = null;
  if (!wx) return `<p class="f-muted mp-wxmsg">${esc(tt(TX.wxReading))}</p>`;
  if (wx.state === 'ok') {
    S.wxGeo = wx.draw(el, {
      ...wx.o,
      layers: WX_LAYERS,
      window: windowNm(),
      width: Math.max(80, w),
      height: Math.max(40, Math.floor(h)),
      minHeight: 0,
      cursorM: S.cursor,
      dark: !!S.theme?.dark
    });
    if (S.wxGeo) {
      const svg = el.querySelector('svg'),
        g = S.wxGeo;
      // dit pour les essais et pour qui mesure : l'axe dans le corps, la fenêtre dessinée (NM), le haut de l'échelle, les bandes
      setData(el, 'axis', svg && svg.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 1 ? '1' : '0');
      setData(el, 'window', g.window ? `${g.window.from.toFixed(2)},${g.window.to.toFixed(2)}` : `0,${(S.prof ? S.prof.total / FT_NM : 0).toFixed(2)}`);
      setData(el, 'top', String(Math.round(g.top)));
      setData(el, 'strips', g.strips ? '1' : '0');
      return;
    }
  }
  if (wx.state === 'fail') return `<p class="f-muted mp-wxmsg">${esc(tt(TX.wxFail))}</p>`;
  const r = S.route.flight?.route,
    name = r?.dep && r?.arr ? tt(TX.summary, {
      dep: r.dep,
      arr: r.arr
    }) : '';
  return `<a class="mp-wxlink" href="#atmosphere">${esc(name ? tt(TX.wxNoneFor, {
    f: name
  }) : tt(TX.wxNone))}&nbsp;<span>${esc(tt(TX.wxOpen))}</span></a>`;
};
/** Montre la coupe dans la feuille (la prévision est lue si elle ne l'est pas encore pour ce vol ; force : relue même si elle
 *  manquait, Atmosphère ayant pu la charger depuis). Même clé : seulement redessinée. */
export async function showWeather(force = false) {
  const key = wxKey(),
    open = () => openData('weather', key, tt(TX.wxTitle), weatherBuild(key), tt(TX.wxLabel));
  open();
  if (S.wx?.key === key && !(force && S.wx.state !== 'ok')) return;
  const seq = S.wxSeq = (S.wxSeq || 0) + 1,
    st = await loadWeather(key);
  if (!S || S.wxSeq !== seq) return;
  S.wx = st;
  if (S.dpanel === 'weather' && S.dkey === key) open();
}
/** Coupe redessinée (taille, curseur, design, fenêtre) sans relire la prévision. */
export function redrawWeather() {
  if (S?.dpanel === 'weather') openData('weather', S.dkey, S.dtitle, weatherBuild(S.dkey), S.dlabel);
}
/** Lignes de la légende de la coupe : celles que la coupe expose pour ce qu'elle a dessiné, le symbole tel quel. */
export function legendRows() {
  const wx = S.wx;
  if (wx?.state !== 'ok' || !wx.legend) return [];
  return wx.legend({
    kind: 'cut',
    layers: S.wxGeo?.layers || WX_LAYERS,
    strips: !!S.wxGeo?.strips,
    cloudRgb: wx.o.cloudRgb,
    t: row => tt(row)
  }).map(r => [`<i class="mp-lg-sw mp-lg-svg" data-key="${esc(r.key)}">${r.swatch}</i>`, esc(r.label)]);
}
/** Gestes de la coupe : la fenêtre (une aide sur le corps de la feuille, qui passe la fenêtre au profil), un doigt ou la souris
 *  qui déplace le curseur commun (un tour d'animation au plus), un toucher qui le place. Rend les fonctions d'arrêt. */
export function weatherEvents() {
  const body = S.dbodyEl,
    routeNm = () => S.prof ? S.prof.total / FT_NM : 0;
  // la capture du pointeur est prise pour tous les doigts : le dessin est remplacé à chaque cran, un doigt ne s'y perd pas
  body.addEventListener('pointerdown', e => {
    if (S.dpanel === 'weather' && e.target.closest('svg')) try {
      body.setPointerCapture(e.pointerId);
    } catch {
      /* pas de capture : le geste suit tant qu'il reste sur la coupe */
    }
  }, true);
  S.axx = createAxisWindow(body, {
    total: routeNm,
    min: 5,
    plot: () => {
      const g = S.wxGeo,
        svg = g && body.querySelector('svg');
      if (!svg) return null;
      const dx = svg.getBoundingClientRect().left - body.getBoundingClientRect().left;
      return {
        x0: dx + g.x0,
        x1: dx + g.x0 + g.pw
      };
    },
    enabled: () => S.dpanel === 'weather' && !!S.wxGeo,
    onChange: (f, t) => {
      S.axw.set(f, t, {
        quiet: true
      }); // le profil porte la même fenêtre : c'est la source que lisent les dessins
      onWindow();
    }
  });
  const nmAt = clientX => {
    const svg = S?.dpanel === 'weather' && S.wxGeo && body.querySelector('svg');
    if (!svg) return null;
    const g = S.wxGeo,
      x = Math.min(Math.max(clientX - svg.getBoundingClientRect().left, g.x0), g.x0 + g.pw);
    return Math.round(g.nmOf(x) * FT_NM);
  };
  let raf = 0,
    lastX = 0;
  const move = e => {
    if (S.dpanel !== 'weather' || !S.wxGeo || S.axx.active || (!e.target.closest('svg') && !body.hasPointerCapture?.(e.pointerId)))
      return;
    if (e.type === 'pointermove' && !e.buttons && e.pointerType !== 'mouse') return;
    lastX = e.clientX;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!S || S.axx.active) return;
      const s = nmAt(lastX);
      if (s != null) setCursor(s);
    });
  };
  body.addEventListener('pointerdown', move);
  body.addEventListener('pointermove', move);
  body.addEventListener('click', e => {
    if (S.dpanel !== 'weather' || !S.wxGeo || S.axx.active || !e.target.closest('svg')) return;
    const svg = body.querySelector('svg'),
      x = e.clientX - svg.getBoundingClientRect().left;
    if (x >= S.wxGeo.x0 && x <= S.wxGeo.x0 + S.wxGeo.pw) setCursor(Math.round(S.wxGeo.nmOf(x) * FT_NM));
  });
  return [() => S.axx.stop(), () => raf && cancelAnimationFrame(raf)];
}
