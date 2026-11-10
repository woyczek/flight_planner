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
  routeMidpoint
} from '../../frame/lib/flight_path.js';
import {
  TX
} from './texts.js';
import {
  WORLD_NM
} from './data.js';
import {
  openData
} from './sheet_view.js';
import {
  schedule
} from './draw.js';
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
async function loadWeather(key, fetchNow = false, gesture = null) {
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
      state: 'none',
      err: fetchNow ? {
        why: pts.length < 2 ? 'points' : 'level'
      } : null
    };
    // le point qui choisit le modèle : le même qu'Atmosphère (flight_path.js routeMidpoint, mi-longueur de la route)
    const mid = routeMidpoint(pts),
      places = Sx.sectionPlaces(pts),
      dep = depTime(f),
      model = await S.ctx.weather.modelFor(mid.lat, mid.lon), // ctx.weather est asynchrone (INTEGRATION § 14.1)
      ask = cacheOnly => S.ctx.weather.grid(places, dep, Sx.sectionVars(levelFt, pts), {
        model: model?.id,
        cacheOnly,
        ...(cacheOnly || !gesture ? {} :
        { // la lecture du geste : elle s'arrête d'attendre quand le délai est passé ou qu'une autre la remplace
          stale: () => gesture.stale(),
          onWait: n => gesture.waiting(n)
        })
      });
    let r = await ask(true).catch(() => null),
      err = null;
    // « Météo de la route » (SOG-0139) : un seul geste, la prévision gardée d'abord, lue sinon (le clic est la demande ; ctx.weather
    // ne demande que ce qui manque)
    if (!r?.locs?.length && fetchNow) {
      let timer = 0;
      // un délai : la lecture ne reste jamais « en cours » sans fin ; passé WX_DEADLINE_MS, elle est dite trop longue (la source ou le
      // lanceur est lent ou occupé) et ce qu'elle écrira ensuite restera dans la réserve pour « Réessayer »
      const late = new Promise((_, no) => {
        timer = setTimeout(() => no({
          timeout: true
        }), S.wxDeadline || WX_DEADLINE_MS); // (S.wxDeadline : le délai des essais)
      });
      r = await Promise.race([ask(false), late]).catch(e => {
        err = e || {};
        return null;
      });
      clearTimeout(timer);
      if (err?.timeout && gesture) gesture.late = true;
    }
    if (!r?.locs?.length) return {
      key,
      state: 'none',
      err: fetchNow ? {
        offline: !!err?.offline,
        quota: !!err?.quota,
        timeout: !!(err?.timeout || err?.stale),
        status: Number.isFinite(+err?.status) ? +err.status : 0,
        why: err ? 'failed' : 'empty'
      } : null
    };
    await pause(); // « Lecture… » est affichée avant le calcul du modèle de la coupe (le gros morceau)
    const o = {
      route: pts,
      levelFt,
      // le profil de Carburant n'est repris que s'il est de Carburant (écrit par la carte, il est périmé : taux par défaut)
      profile: f?.by === 'maps' ? null : f?.profile || null, // périmé après une modification sur la carte seulement
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
    const run = Number.isFinite(+r.run) ? new Date(+r.run * 1000).getUTCHours() : null,
      name = String(model?.short || model?.name || r.model?.short || r.model?.name || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 16);
    return {
      key,
      state: 'ok',
      modelId: model?.id || '',
      modelName: name,
      label: name ? `${name}${run != null ? ` ${run} h` : ''}` : '', // « AROME 12 h » : le modèle choisi par le milieu de la route, dit après coup
      draw: Sx.drawSection,
      legend: Sx.sectionLegend,
      o
    };
  } catch {
    return {
      key,
      state: 'none',
      err: fetchNow ? {
        why: 'failed'
      } : null
    };
  }
}
/** Rend la main au navigateur (un tour de la boucle d'événements) : l'affichage, les gestes et la lecture de la page restent vivants
 *  entre deux gros calculs. */
const pause = () => new Promise(r => setTimeout(r, 0));
/** Délai de la lecture du geste « Météo de la route » (SOG-0139) : au-delà, elle est dite trop longue, avec « Réessayer ». */
const WX_DEADLINE_MS = 20000;
/** Constructeur du contenu « weather » pour openData : dessine dans la zone, ou rend une ligne (lecture, rien dans le cache,
 *  fichiers indisponibles). */
const weatherBuild = key => (w, h, el) => {
  const wx = S.wx?.key === key ? S.wx : null;
  S.wxGeo = null;
  if (!wx) return S.wxRun?.key === key ? `<p class="f-muted mp-wxmsg" role="status">${esc(tt(TX.wxGetting))} <span class="mp-wxel">${esc(runText())}</span></p>` :
    `<p class="f-muted mp-wxmsg">${esc(tt(TX.wxReading))}</p>`;
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
  // pas de prévision gardée : le geste est là, un seul, nommé par ce que veut le pilote ; une lecture refusée dit pourquoi
  if (!wx.err) return `<p class="mp-wxmsg"><button type="button" class="f-btn primary mp-wxget" data-wxget>${esc(tt(TX.wxTitle))}</button> <span class="f-muted">${esc(tt(TX.wxGetHint))}</span></p>`;
  const E = wx.err,
    why = E.offline ? TX.wxEOffline : E.quota ? TX.wxEQuota : E.timeout ? TX.wxETimeout : E.why === 'level' ? TX.wxELevel : E.why ===
    'points' ? TX.wxEPoints :
    E.why === 'empty' ? TX.wxEEmpty : TX.wxEFail2,
    again = E.why !== 'level' && E.why !== 'points'; // un vol sans niveau ou sans deux points ne se règle pas en réessayant
  return `<p class="f-muted mp-wxmsg" role="alert">${esc(tt(why))}${E.status ? ` (HTTP ${E.status})` : ''}${again ? ` <button type="button" class="f-btn mp-wxget" data-wxget>${esc(tt(TX.wxRetry))}</button>` : ''}</p><a class="mp-wxlink" href="#atmosphere">${esc(name ? tt(TX.wxNoneFor, {
    f: name
  }) : tt(TX.wxNone))}&nbsp;<span>${esc(tt(TX.wxOpen))}</span></a>`;
};
/** Montre la coupe dans la feuille (la prévision est lue si elle ne l'est pas encore pour ce vol ; force : relue même si elle
 *  manquait, Atmosphère ayant pu la charger depuis). Même clé : seulement redessinée. */
export async function showWeather(force = false) {
  const key = wxKey(),
    open = () => openData('weather', key, wxName(), weatherBuild(key), tt(TX.wxLabel));
  if (S.wxRun?.key === key)
    return open(); // une lecture est en cours pour ce vol : un appui de plus ne la relance pas (dix appuis = une lecture)
  if (force && S.wx?.key === key && S.wx.state !== 'ok') S.wx = null; // un geste : la lecture est refaite, et dite
  const seq = S.wxSeq = (S.wxSeq || 0) + 1,
    run = force && !(S.wx?.key === key) ? {
      key,
      t0: Date.now(),
      n: 0, // secondes d'attente de la limite par minute de la source, quand elle en demande
      late: false,
      stale: () => run.late || !S || S.wxSeq !== seq,
      waiting: n => {
        run.n = n;
        runPaint();
      }
    } : null;
  if (
    run
  ) { // le retour est immédiat : le bouton de la coupe est occupé (il n'est pas relancé), la feuille dit ce qui se passe et depuis combien de temps
    S.wxRun = run;
    runBusy(true);
    S.wxTick = setInterval(runPaint, 1000); // l'horloge de la lecture : seule la durée affichée change, rien d'autre n'est réécrit
  }
  open();
  if (S.wx?.key === key && !(force && S.wx.state !== 'ok')) {
    if (force) fillGaps();
    return;
  }
  let st;
  try {
    st = await loadWeather(key, force, run);
  } finally {
    if (run && S?.wxRun === run) { // la fin, quelle qu'elle soit : l'horloge s'arrête, le bouton se libère
      S.wxRun = null;
      clearInterval(S.wxTick);
      runBusy(false);
    }
  }
  if (!S || S.wxSeq !== seq) return;
  S.wx = st;
  if (S.dpanel === 'weather' && S.dkey === key) open();
  if (force) {
    if (st.state === 'ok' && !gridWinds()) { // la lecture vient d'arriver : les barbules d'abord, puis leurs trous
      await pause();
      try {
        S.wxWinds = {
          key,
          list: await windsOf(st)
        };
        schedule();
      } catch {
        /* les barbules de Carburant restent */
      }
    }
    fillGaps();
  }
}
/** Ce que dit la feuille pendant la lecture : depuis combien de secondes, et l'attente de la limite par minute quand la source en impose une. */
const runText = () => {
  const r = S?.wxRun;
  if (!r) return '';
  const s = Math.max(0, Math.round((Date.now() - r.t0) / 1000));
  return r.n ? `${s} s · ${tt(TX.wxWait, {
    n: r.n
  })}` : `${s} s`;
};
/** Réécrit la durée dans la ligne de lecture, seulement si elle change. */
function runPaint() {
  const el = S?.wxRun && S.dbodyEl?.querySelector('.mp-wxel'),
    t = runText();
  if (el && el.textContent !== t) el.textContent = t;
}
/** Le bouton « Météo de la route » est occupé pendant la lecture (écrit seulement s'il change). */
function runBusy(on) {
  const b = S?.segEl?.querySelector('.mp-chip[data-view="weather"]');
  if (b && b.getAttribute('aria-busy') !== String(on)) b.setAttribute('aria-busy', String(on));
}
/** Distance entre deux barbules de la carte (NM), comme pour les vents de Carburant. */
const WIND_STEP_NM = 50;
/** Les barbules de la carte lues dans la grille que la coupe lit (SOG-0148 : si la coupe a du vent, la carte en a ; aucune lecture de
 *  plus), une tous les 50 NM le long de la trajectoire. Hors de la couverture du modèle choisi (le milieu de la route le choisit), la
 *  case de la même grille n'est pas lue : un lieu sans vent (`gap`, pas de flèche, dit « pas de vent ici (hors ARPEGE) » dans
 *  l'infobulle) ; le modèle qui couvre le lieu n'est pris que s'il a déjà ses cases en réserve (cacheOnly), segment par segment, et il est
 *  dit. Jamais une même flèche répétée (SOG-0141). Rend [{ lat, lon, dirDeg, kt, tempC, levelFt, at, model, between? | gap, model }]. */
async function windsOf(st, fetchNow = false) {
  const [Sx, A] = await Promise.all([import('../atmosphere/section.js'), import('../atmosphere/atmo.js')]),
    M = st.o.model,
    levelFt = st.o.levelFt,
    out = [],
    along = M.along || [],
    picks = along.filter((e, i) => e.nm % WIND_STEP_NM === 0 || i === along.length - 1);
  for (const e of picks) {
    const t = st.o.depTime + M.traj.minutesAt(Math.min(e.nm, M.traj.total)) * 60,
      at = new Date(t * 1000).toISOString(),
      own = await S.ctx.weather.modelFor(e.lat, e.lon);
    let x = null,
      model = st.modelName;
    if (!own?.id || own.id === st.modelId) x = e.x && !e.x.below && e.x.dirDeg != null ? e.x : null;
    else {
      model = own.short || own.name || own.id;
      try { // un autre modèle couvre ce lieu : ses cases ne sont lues que si elles sont déjà en réserve
        const r = await S.ctx.weather.grid([{
          lat: e.lat,
          lon: e.lon
        }], t, Sx.sectionVars(levelFt, st.o.route), {
          model: own.id,
          cacheOnly: !fetchNow // le geste « Météo de la route » lit le modèle qui couvre ; sinon seulement ce qui est déjà en réserve
        }).catch(() => null);
        const loc = r?.locs?.length ? A.locations(r.locs)[0] : null,
          col = loc ? A.column(loc, A.hourIndex(loc.times, t)) : null,
          y = col ? A.at(col, e.ft ?? levelFt) : null;
        x = y && !y.below && y.dirDeg != null ? y : null;
      } catch {
        x = null;
      }
    }
    out.push(x ? {
      lat: e.lat,
      lon: e.lon,
      dirDeg: x.dirDeg,
      kt: x.kt,
      tempC: Number.isFinite(+x.tC) ? +x.tC : null,
      levelFt,
      at,
      model,
      other: model !== st.modelName // lu d'un autre modèle que celui de la coupe : dit par segment dans l'infobulle
    } : {
      lat: e.lat,
      lon: e.lon,
      gap: true,
      model: st.modelName
    });
  }
  return out;
}
/** Le geste « Météo de la route » comble les trous des barbules (SOG-0141) : le modèle qui couvre est lu (GFS par Open-Meteo), jamais en
 *  silence ailleurs ; chaque barbule dit son modèle. Sans trou nommé par un modèle, rien n'est demandé. */
async function fillGaps() {
  const key = wxKey(),
    now = gridWinds();
  if (!S || !S.wx || S.wx.state !== 'ok' || S.wx.key !== key || !now?.some(w => w.gap && w.model)) return;
  let list = null;
  try {
    list = await windsOf(S.wx, true);
  } catch {
    return;
  }
  if (!S || wxKey() !== key) return;
  S.wxWinds = {
    key,
    list
  };
  schedule();
}
/** Les barbules lues dans la grille, pour ce vol (null : pas encore lues, ou rien en réserve). */
export const gridWinds = () => S?.wxWinds?.key === wxKey() ? S.wxWinds.list : null;
/** Demande, une fois par version du vol, les barbules de la grille en réserve (aucune lecture réseau) ; le dessin est redemandé. */
export async function ensureWinds() {
  if (!S || !canWeather()) return;
  const key = wxKey();
  if (S.wxWindsKey === key) return;
  if (S.prof && S.prof.total / FT_NM >
    WORLD_NM) { // une route de plus de WORLD_NM : pas de modèle de coupe lu pour des barbules qui ne se dessinent pas (SOG-0156)
    S.wxWindsKey = key;
    return;
  }
  S.wxWindsKey = key;
  let list = null;
  try {
    // le modèle de la coupe pèse (champ 200 × 120) : il passe après le profil et le premier dessin, au repos du navigateur (ce n'est
    // pas un rattrapage de page : rien n'est écrit tant qu'il n'est pas prêt, la carte se dessine d'abord avec ce que Carburant a écrit)
    await new Promise(r => typeof requestIdleCallback === 'function' ? requestIdleCallback(r, {
      timeout: 1500
    }) : setTimeout(r, 300));
    if (!S || S.wxWindsKey !== key) return;
    const st = S.wx?.key === key ? S.wx : await loadWeather(key);
    if (!S || S.wxWindsKey !== key) return;
    if (S.wx?.key !== key) S.wx = st; // la coupe, ouverte plus tard, ne relit pas ce qui l'a été
    if (st.state === 'ok') list = await windsOf(st);
  } catch {
    list = null;
  }
  if (!S || S.wxWindsKey !== key) return;
  S.wxWinds = {
    key,
    list
  };
  schedule();
}
/** Le nom de la coupe : « Météo de la route », puis « · AROME 12 h » une fois la prévision lue (titre de la poignée et du bouton). */
export const wxName = () => S?.wx?.state === 'ok' && S.wx.label ? `${tt(TX.wxTitle)} · ${S.wx.label}` : tt(TX.wxTitle);
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
  body.addEventListener('click', e => {
    if (e.target.closest('[data-wxget]') && S.dpanel === 'weather') showWeather(true);
  });
  body.addEventListener('pointerdown', move);
  body.addEventListener('pointermove', move);
  body.addEventListener('click', e => {
    if (S.dpanel !== 'weather' || !S.wxGeo || S.axx.active || !e.target.closest('svg')) return;
    const svg = body.querySelector('svg'),
      x = e.clientX - svg.getBoundingClientRect().left;
    if (x >= S.wxGeo.x0 && x <= S.wxGeo.x0 + S.wxGeo.pw) setCursor(Math.round(S.wxGeo.nmOf(x) * FT_NM));
  });
  return [() => S.axx.stop(), () => raf && cancelAnimationFrame(raf), () => clearInterval(S.wxTick)];
}
