// Le vol de l'écran Météo (SPEC.md § 3.1) : le vol courant partagé (pilot/<trigramme>/current_flight.json, schéma 1 de
// modules/fuel/INTEGRATION.md § 3, lu seulement), ou pour la visite l'exemple du schéma, un fichier de même forme, un
// texte de route. Calculs purs, sauf la résolution des noms d'un texte (ctx.aerodb.coords).

import * as A from './atmo.js';
import {
  tokenize
} from '../../frame/lib/route_text.js';

/** Vol d'exemple : celui du schéma du vol courant (modules/fuel/INTEGRATION.md § 3). */
export const EXAMPLE = {
  route: {
    text: 'LFRS LUGEN/F290 LFML',
    dep: 'LFRS',
    arr: 'LFML',
    altn: 'LFMN',
    points: [{
      id: 'LFRS',
      lat: 47.1569,
      lon: -1.6078
    }, {
      id: 'LUGEN',
      lat: 46.5833,
      lon: -1.2,
      alt_ft: 29000
    }, {
      id: 'LFML',
      lat: 43.4367,
      lon: 5.215
    }]
  },
  level: {
    ft: 27000
  },
  profile: {
    climbFpm: 1230,
    climbKt: 196,
    descentFpm: 1500,
    descentKt: 253,
    tocNm: 48.2,
    todNm: 56.1
  },
  aircraft: {
    type: 'C30J',
    registration: 'F-RAJA'
  },
  by: 'exemple'
};
/** Texte de route proposé la première fois (coordonnées : lisible sans la base aéronautique). */
export const ROUTE_TEXT = 'LFRS 47.1569 -1.6078\nLUGEN 46.5833 -1.2000/F290\nMEN 44.6050 3.1600\nLFML 43.4367 5.2150';

/** Points lisibles d'une route : identifiant, latitude, longitude, palier (ft) ; longitudes rendues continues. */
const pointsOf = list => A.unwrapLons(list.filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
  id: String(p.id || p.name || ''),
  lat: +p.lat,
  lon: +p.lon,
  alt_ft: +p.alt_ft || 0
})));

/** Enregistrement de la forme du vol courant → vol de l'écran { points, levelFt, profile, dep, arr, altn, text, when,
 *  aircraft, updated, from } ; when : la date du vol (planned_at, la seule depuis Carburant du 28 octobre), en ms ISO ou
 *  null. err : le message d'une route de moins de deux points. */
export function fromRecord(rec, from, err) {
  const pts = pointsOf(rec?.route?.points || []);
  if (pts.length < 2) throw new Error(err);
  return {
    points: pts,
    levelFt: +rec.level?.ft || +rec.quote?.levelFt || 0,
    profile: rec.profile || null,
    dep: rec.route.dep || pts[0].id,
    arr: rec.route.arr || pts.at(-1).id,
    altn: rec.route.altn || '',
    text: rec.route.text || '',
    when: rec.planned_at || null,
    aircraft: rec.aircraft || null,
    updated: rec.updated_at || null,
    from
  };
}

/** Texte de route → vol : coordonnées, ou noms résolus par aerodb (terrains, balises, points) ; « /F270 » après un point
 *  pour un palier. { flight, skipped } : les noms inconnus sont écartés et rendus ; moins de deux points : erreur err. */
export async function fromText(text, ctx, {
  err,
  from
}) {
  const pts = [],
    skipped = [];
  let firstAlt = 0;
  for (const t of tokenize(text)) {
    if (t.kind === 'group' && t.alt_ft) firstAlt = firstAlt || t.alt_ft;
    if (t.kind === 'coord') pts.push({
      id: t.id,
      lat: t.lat,
      lon: t.lon,
      alt_ft: t.alt_ft || 0
    });
    else if (t.kind === 'name' && !t.airway) {
      const c = await Promise.resolve(ctx.aerodb?.coords?.(t.id)).catch(() => null);
      if (c && Number.isFinite(+c.lat)) pts.push({
        id: t.id,
        lat: +c.lat,
        lon: +c.lon,
        alt_ft: t.alt_ft || 0
      });
      else skipped.push(t.id);
    }
  }
  if (pts.length < 2) throw new Error(err);
  // départ et arrivée au sol
  pts[0].alt_ft = 0;
  pts.at(-1).alt_ft = 0;
  return {
    skipped,
    flight: {
      points: A.unwrapLons(pts),
      levelFt: firstAlt,
      profile: null,
      dep: pts[0].id,
      arr: pts.at(-1).id,
      altn: '',
      text,
      when: null,
      aircraft: null,
      updated: null,
      from
    }
  };
}

/** Ce qui, dans le vol courant, change ce que montre l'écran (route, niveau, profil, date du vol). */
export const flightSig = r => JSON.stringify([r?.route?.points, r?.level, r?.profile, r?.planned_at]);
