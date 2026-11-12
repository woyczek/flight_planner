// V3 maps — la couche « Météo » de la Carte (SOG-0092, voie « Carte » de la feuille de route) : le vent et les nuages du vol au niveau de croisière et à l'heure de son passage à
// mi-route, avec, en trait fin, le bord de la zone que couvre la prévision. Éteinte d'origine. Le dessin est celui de la bibliothèque de Météo (modules/atmosphere/lib/weather_map.js,
// attach : son canevas dans la carte MapLibre, sous la surcouche de la Carte) ; ce fichier ne fait que la poser et la retirer, et dire dans « Couches » ce qu'elle montre.
// LA CARTE NE DEMANDE RIEN : la grille du vol est lue dans la réserve de l'appareil (ctx.weather.grid en cacheOnly), le synoptique monde n'est pas lu (le bord de la prévision doit
// dire où la donnée s'arrête, pas être prolongé par un autre modèle) ; sans prévision gardée, la case le dit et mène à Météo, qui la charge. Pas de précipitations : la réserve n'en
// garde pas pour une zone (seulement le long de la route, pour la coupe).
import {
  S,
  esc,
  tt,
  onMission
} from './state.js';
import {
  TX
} from './texts.js';
import {
  layersNow
} from './layers.js';
import {
  etaOf
} from '../../frame/lib/current_flight.js';
import {
  fmtZ
} from '../../frame/lib/time.js';
import {
  formatLevel
} from '../../frame/lib/route_text.js';
import {
  wxPoints,
  depTime
} from './weather.js';

/** Ce que la couche dessine : le vent et les nuages, rien d'autre (ni isobares, ni isothermes, ni courant-jet, ni convection). */
const LAYERS = {
  isobar: false,
  isotherm: false,
  cloud: true,
  wind: true,
  tfill: false,
  jet: false,
  conv: false
};
let loading = null;
/** La bibliothèque de Météo, chargée au premier allumage seulement (null hors ligne sans elle). */
const lib = () => loading ||= import('../atmosphere/lib/weather_map.js').catch(() => {
  loading = null;
  return null;
});
/** Ce que la bibliothèque voit de l'appareil : la réserve seulement (la grille, toujours en cacheOnly) et pas de synoptique monde. */
const facade = ctx => ({
  t: (...a) => ctx.t(...a),
  lang: () => ctx.lang?.(),
  weather: {
    grid: (places, time, vars, o) => ctx.weather.grid(places, time, vars, {
      ...o,
      cacheOnly: true
    }),
    world: async () => null
  }
});
/** L'heure (secondes) où le vol est à mi-route : celle de son horaire (frame/lib/flight_time.js), sinon son départ. */
function passage(f) {
  const eta = etaOf(f, Date.now());
  if (eta?.length > 1) {
    const a = Date.parse(eta[0].at),
      b = Date.parse(eta[eta.length - 1].at);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.round((a + b) / 2e3);
  }
  return depTime(f);
}
/** La couche peut-elle montrer quelque chose : '' oui ; 'flight' (pas de vol de deux points et d'un niveau, ou une carte de mission) ; 'plain' (fond uni : pas de carte MapLibre). */
function why() {
  const f = S.route?.flight;
  if (onMission() || wxPoints(f).length < 2 || !(S.route.levelFt || +f?.quote?.levelFt)) return 'flight';
  return S.map ? '' : 'plain';
}
/** Retire le dessin (case décochée, vol sans prévision possible, démontage). */
export function wxOff() {
  const x = S?.wxm;
  if (!x) return;
  S.wxm = null;
  try {
    x.wm.detach();
  } catch {
    /* déjà retirée avec la carte */
  }
}
/** À chaque dessin complet : la couche allumée est posée (une fois) et tenue à jour quand le vol, son niveau ou l'heure changent ; éteinte, rien n'est gardé. */
export function wxSync() {
  if (!S) return;
  if (!layersNow().wx || why()) {
    wxOff();
    return void wxNote();
  }
  const f = S.route.flight,
    pts = wxPoints(f),
    levelFt = S.route.levelFt || +f?.quote?.levelFt || 0,
    time = passage(f),
    key = JSON.stringify([pts.map(p => [p.lat, p.lon, p.alt_ft]), levelFt, time]);
  if (S.wxm) {
    if (S.wxm.key !== key) {
      S.wxm.key = key;
      S.wxm.levelFt = levelFt;
      S.wxm.time = time;
      S.wxm.wm.update({
        flight: {
          points: pts,
          levelFt
        },
        levelFt,
        time
      });
    }
    return;
  }
  if (S.wxLoading) return;
  const me = S;
  me.wxLoading = true;
  lib().then(L => {
    me.wxLoading = false;
    if (S !== me || !L || me.wxm || !layersNow().wx || !me.map) return;
    const wm = L.attach(me.map, {
      ctx: facade(me.ctx),
      flight: {
        points: pts,
        levelFt
      },
      levelFt,
      time,
      layers: LAYERS,
      onChange: () => S === me && wxNote()
    });
    me.wxm = {
      wm,
      key,
      levelFt,
      time
    };
    wxNote();
  });
}
/** La ligne sous la case : ce que la couche montre, ou pourquoi elle ne montre rien ; écrite seulement si elle change. */
export function wxNote() {
  const el = S?.layersEl?.querySelector('.mp-wx-note');
  if (!el) return;
  let k = '',
    html = '';
  if (layersNow().wx) {
    const w = why(),
      x = S.wxm;
    if (w) {
      k = w;
      html = esc(tt(w === 'plain' ? TX.wxLayerPlain : TX.wxLayerFlight));
    } else if (x && !x.wm.info().reading) {
      if (x.wm.state === 'ok') {
        const t = fmtZ(new Date(x.time * 1000).toISOString());
        k = `ok:${x.levelFt}:${t}`;
        html = esc(tt(TX.wxLayerOk, {
          l: formatLevel(Math.round(x.levelFt / 100) * 100),
          t
        }));
      } else {
        k = 'none';
        html = `${esc(tt(TX.wxNone))} <a href="#atmosphere">${esc(tt(TX.wxOpen))}</a>`;
      }
    }
  }
  if (el.dataset.k === k) return;
  el.dataset.k = k;
  el.innerHTML = html;
  el.hidden = !k;
}
