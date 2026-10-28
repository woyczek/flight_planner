// Les données météo de l'écran (SPEC.md § 3.2) : la couche météo du cadre (ctx.weather, frame/INTEGRATION.md § 14) et
// rien d'autre — jamais d'appel à Open-Meteo, aviationweather.gov, metar.vatsim.net ni avwx.rest d'ici, jamais d'écriture
// dans cache/weather/, jamais de décompte : la couche garde, regroupe, compte. La démonstration hors ligne (demo.js) répond
// à la même forme, sans réseau et sans rien écrire.

import * as A from './atmo.js';
import * as Demo from './demo.js';
import {
  clamp
} from './fmt.js';
import {
  decodeMetars
} from '../../frame/lib/metar.js';

/** Premier jour lu (ms) : aujourd'hui, ou le jour du départ d'un vol daté d'avant aujourd'hui (fromSec, s), 92 jours
 *  en arrière au plus — Open-Meteo sert les jours passés (utilisateur, 29 octobre : « pas de météo avant H+56 » sur un
 *  vol du 26). */
export const firstDay = fromSec => {
  const today = Date.parse(new Date().toISOString().slice(0, 10)),
    dep = Number.isFinite(fromSec) ? Date.parse(new Date(fromSec * 1000).toISOString().slice(0, 10)) : today;
  return Math.max(today - 92 * 864e5, Math.min(today, dep));
};
/** Jours UTC de prévision, depuis le premier jour lu, qui couvrent un instant (s) et dix heures de vol après lui : deux
 *  au moins, seize au plus après aujourd'hui (Open-Meteo compte les lieux et les variables, pas les jours). */
export const daysUntil = (sec, first = firstDay()) => {
  const today = Date.parse(new Date().toISOString().slice(0, 10));
  return clamp(Math.ceil(((sec + 10 * 3600) * 1000 - first) / 864e5), 2, 16 + Math.round((today - first) / 864e5));
};

/** Accès aux données : ctx (weather, t), T (texts.js), demo() → vrai en démonstration. */
export function createWx(ctx, T, demo) {
  const W = ctx.weather;

  /** Prévision horaire de lieux [{ lat, lon }] pour des variables d'Open-Meteo : { locs (atmo.locations), weight, run } ;
   *  null en cacheOnly s'il manque quelque chose sur l'appareil. opts : model (id), until (s : le dernier instant voulu),
   *  from (s : le départ, quand il est passé les jours sont lus depuis le sien), cacheOnly, stale, onWait. */
  async function forecast(places, vars, {
    model,
    until,
    from = null,
    cacheOnly = false,
    stale,
    onWait
  }) {
    const first = firstDay(from),
      days = daysUntil(until, first);
    if (demo()) return {
      locs: A.locations(Demo.forecast(places, vars, Math.min(Date.now(), first), days * 24)),
      weight: 0,
      run: null
    };
    const r = await W.grid(places, until, vars, {
      model,
      days,
      from: first < Date.parse(new Date().toISOString().slice(0, 10)) ? first : null,
      cacheOnly,
      stale,
      onWait
    });
    return r && {
      locs: A.locations(r.locs),
      weight: r.weight || 0,
      run: r.run || null
    };
  }

  /** METAR et TAF des terrains du vol (départ, arrivée, dégagement) : { ids, metars (forme JSON d'aviationweather), tafs
   *  { OACI: TAF }, note } ; cacheOnly : seulement ce que l'appareil garde (30 min). */
  async function aerodromes(f, cacheOnly = false) {
    const ids = [f.dep, f.arr, f.altn].filter(x => /^[A-Z]{4}$/.test(x || '')).filter((x, i, a) => a.indexOf(x) === i);
    if (!ids.length) return {
      ids,
      metars: [],
      tafs: {},
      note: T('noIcao')
    };
    if (demo()) return {
      ids,
      metars: decodeMetars(Demo.metars(ids, ids.map(id => id === f.dep ? f.points[0] : f.points.at(-1)))),
      tafs: {},
      note: T('demoMetars')
    };
    const [m, t] = await Promise.all([W.metar(ids, {
      cacheOnly
    }).catch(() => null), W.taf(ids, {
      cacheOnly
    }).catch(() => null)]);
    const metars = Object.values(m?.items || {}),
      tafs = t?.items || {},
      src = (r, direct) => r.source === 'launcher' ? 'aviationweather.gov' : r.source === 'direct' ? direct : T('obsCache'),
      note = [metars.length ? T('metarSrc', {
          src: src(m, 'metar.vatsim.net')
        }) : T('metarNone'),
        Object.keys(tafs).length ? T('tafSrc', {
          src: src(t, 'avwx.rest')
        }) : t?.noTaf ? T('tafNoKey') : cacheOnly ? T('tafLoad') : T('tafNone')
      ];
    return {
      ids,
      metars,
      tafs,
      note: note.join(' · ')
    };
  }

  /** Raison d'un échec, dans les mots de l'écran (marques de la couche météo : quota, offline, unreachable, incomplete,
   *  status). */
  const why = e => e?.quota ? T('quotaDay') : e?.status === 429 || /limit exceeded/i.test(e?.message || '') ? T('quotaIp') :
    e?.offline || e?.unreachable ? T('offline') : e?.incomplete ? T('incomplete') : String(e?.message || e);

  return {
    forecast,
    aerodromes,
    why,
    /** Run du modèle (s) ou null ; rien en démonstration. */
    run: model => demo() ? Promise.resolve(null) : W.run(model).catch(() => null),
    /** Appels pondérés du jour UTC sur cet appareil ; 0 en démonstration. */
    spentToday: () => demo() ? Promise.resolve(0) : W.spentToday().catch(() => 0)
  };
}
