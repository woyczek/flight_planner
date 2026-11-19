// V3 cadre — le jugement pur d'un posé de précision (SOG-0507 : les paliers, dans Missions ; SOG-0516, lot A : ici, pour que Missions et le compte rendu lisent les MÊMES). Fichier d'Affectation ; V3 Frame relit le diff.
// Pur à l'import : ni page, ni stockage, ni réseau ; il n'importe que crossing.js et untrusted.js. Jamais d'exception.
//
// LA RÈGLE : un carnet (`pilot/<TRI>/missions/<ID>.json`) et tout ce qu'il porte sont NON FIABLES (écrits par un pilote). Le palier est donc TOUJOURS
// RECALCULÉ du relevé `to` sur la règle d'atterrissage de la MISSION (landTier), jamais lu : le `tier` et la `distNm` écrits dans le carnet sont
// ignorés ici. Toute lecture du carnet est bornée (own / plain de untrusted.js) : une valeur absente ou mal typée ne lève rien, elle est omise.
//
// API :
//   PRECISION, TIERS, tierOf(distNm)   les paliers du posé de précision (excellent ≤ 0,05 NM, parfait ≤ 0,1, réussi ≤ 0,2, partiel ≤ 0,5), bornes comprises ; tierOf rend '' au-delà ou pour une distance non finie ou négative.
//   TIER_TEXT                          les quatre mots des paliers en quatre langues, [fr, en, de, es] (l'écran de Missions les lit ici).
//   AD_NM, FIX_PERIOD_SEC              la tolérance d'un terrain de la route (1 NM) ; la période d'un relevé du simulateur (5 s).
//   landRule(rule)                     ce que le vol juge d'une condition « atterrissage » : { at, radiusNm, speedMaxKt, onGround, durationSec, maxGapSec, tiered } ou null (illisible, mot de confirmation demandé…).
//   landTier(rule, fix)                { tier, distNm } : la distance du relevé au point visé de la règle et son palier ; { tier: '', distNm: null } quand la règle est illisible, quand c'est un atterrissage au terrain (point ORIGIN ou DESTINATION), quand le relevé est illisible ou au-delà de 0,5 NM.
//   precisionLandings(drawers, book)   [{ id, tier, distNm, at }] : les posés de précision DU PILOTE, un par constat d'atterrissage du carnet (le constat d'un tiroir dont la clé est un atterrissage hors terrain, et chaque preuve « landing » d'une suite, appariée à la règle de l'étape de même rang), dans l'ordre de `at`, au plus 12 tiroirs de 10 preuves ; une ligne sans palier recalculé est omise.
//   msOf, isoOf, fixOf, spotOf         les petites lectures bornées qu'elles partagent avec le carnet de Missions (un instant, un texte ISO, un relevé gardé, un point).
// Utilisateurs : modules/missions (drawers.js, drawers_view.js), modules/report (le compte rendu : results.precisionLandings).

import {
  arrived,
  fixOf as fixRead
} from './crossing.js'; // le service de franchissement du cadre : sa distance (`arrived().distNm`), aucune nouvelle formule
import {
  own,
  plain
} from './untrusted.js'; // lire ce qui vient d'un fichier sans lui faire confiance

/** Les paliers d'un posé de précision sur un point géographique, du meilleur au plus large : distance au point visé, bornes COMPRISES.
 *  Au-delà du dernier : manqué. Les mots sont des identifiants de données ; leur texte à l'écran se traduit (TIER_TEXT). */
export const PRECISION = Object.freeze([{
  tier: 'excellent',
  nm: 0.05
}, {
  tier: 'parfait',
  nm: 0.1
}, {
  tier: 'réussi',
  nm: 0.2
}, {
  tier: 'partiel',
  nm: 0.5
}].map(Object.freeze));
/** Les identifiants des paliers, du meilleur au plus large. */
export const TIERS = ['excellent', 'parfait', 'réussi', 'partiel'];
/** Le palier d'une distance au point visé (milles marins), ou '' au-delà du dernier palier ; '' aussi pour une distance non finie ou
 *  négative. Les bornes sont comprises : exactement 0,2 NM, c'est « réussi ». */
export const tierOf = distNm => {
  if (typeof distNm !== 'number' || !Number.isFinite(distNm) || distNm < 0) return '';
  const p = PRECISION.find(x => distNm <= x.nm);
  return p ? p.tier : '';
};
/** Les mots des quatre paliers, par palier : [fr, en, de, es]. */
export const TIER_TEXT = {
  excellent: ['excellent', 'excellent', 'ausgezeichnet', 'excelente'],
  parfait: ['parfait', 'perfect', 'perfekt', 'perfecto'],
  réussi: ['réussi', 'good', 'gelungen', 'logrado'],
  partiel: ['partiel', 'partial', 'teilweise', 'parcial']
};
/** Une arrivée posée sur un terrain est « dans la zone » à cette distance, en milles marins, quel que soit `key.radiusNm` (la vitesse et
 *  le sol restent les règles de la clé) ; un posé de précision sur un terrain de la route (ORIGIN, DESTINATION) l'a aussi, sans palier. */
export const AD_NM = 1;
/** La période d'un relevé du simulateur, en secondes (LIVE_SIM de frame/app.js) : un écart permis plus court (`maxGapSec`) ne peut
 *  jamais être tenu. */
export const FIX_PERIOD_SEC = 5;
/** Une distance de constat arrondie au millième de mille. */
const roundNm = d => Math.round(d * 1000) / 1000;

/** Un instant en millisecondes d'un texte ISO borné, sinon null. */
export const msOf = v => {
  const t = typeof v === 'string' && v.length <= 40 ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};
/** Le texte ISO d'un instant, '' sans instant. */
export const isoOf = ms => Number.isFinite(ms) ? new Date(ms).toISOString() : '';
/** Un relevé de position gardé dans un carnet : { at, lat, lon, altFt, aglFt, onGround, gsKt } à PLEINE précision, relu borné par le
 *  service du cadre (fixOf de crossing.js : la porte d'un relevé venu d'un fichier) ; null s'il est illisible, ou à 0°, 0°. Un champ
 *  inconnu est absent. */
export function fixOf(v) {
  const f = fixRead(v);
  if (!f || (f.lat === 0 && f.lon === 0)) return null;
  const out = {
    lat: f.lat,
    lon: f.lon
  };
  if (f.t !== null) out.at = isoOf(f.t);
  for (const k of ['altFt', 'aglFt', 'onGround', 'gsKt'])
    if (f[k] !== null && f[k] !== undefined) out[k] = f[k];
  return out;
}
/** Un point { lat, lon } lisible (nombres dans leurs bornes), ou null. */
export const spotOf = p => {
  const lat = own(p, 'lat'),
    lon = own(p, 'lon');
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180 ? {
    lat,
    lon
  } : null;
};

/** Ce que le vol juge d'une condition « atterrissage » (`rule`, la règle elle-même) : { at, radiusNm, speedMaxKt, onGround: true, durationSec, maxGapSec, tiered },
 *  ou null quand elle ne se juge pas ici : pas un atterrissage, ni point lisible ni objet immobile, un mot de confirmation demandé par
 *  l'auteur (pas encore jugé, par prudence), un écart permis sous la période d'un relevé, un nombre illisible.
 *  LES TOLÉRANCES DE L'UTILISATEUR PRIMENT sur le rayon du fichier (`radiusM`, plus lu ; SOG-0507, l'utilisateur, 19/11) : un posé de
 *  précision sur un point géographique se juge par PALIERS, « posé » dès le dernier (0,5 NM : radiusNm) ; quand le point visé est un
 *  terrain de la route (`rule.point` : ORIGIN, DESTINATION), c'est la tolérance du terrain, AD_NM, sans palier. `tiered` : vrai hors
 *  terrain (le constat porte alors son palier et sa distance). */
export function landRule(rule) {
  const r = plain(rule);
  if (!r || own(r, 'kind') !== 'landing' || own(r, 'confirmation') !== '') return null;
  const object = plain(own(r, 'object')),
    at = own(r, 'at') ? spotOf(own(r, 'at')) : object && !own(object, 'moving') ? spotOf(object) : null,
    num = v => typeof v === 'number' && Number.isFinite(v) ? v : null,
    durationSec = num(own(r, 'durationSec')),
    maxGapSec = num(own(r, 'maxGapSec')),
    speedMaxKt = num(own(r, 'speedMaxKt')),
    point = own(r, 'point'),
    field = point === 'ORIGIN' || point === 'DESTINATION';
  if (!at || !(durationSec > 0) || maxGapSec === null || maxGapSec < FIX_PERIOD_SEC || speedMaxKt === null || speedMaxKt < 0)
    return null;
  return {
    at,
    radiusNm: field ? AD_NM : PRECISION[PRECISION.length - 1].nm,
    speedMaxKt,
    onGround: true,
    durationSec,
    maxGapSec,
    tiered: !field
  };
}

/** Le palier et la distance d'un relevé posé selon la règle d'un posé de précision : { tier, distNm } (distNm arrondie au millième de
 *  mille, par ce que `arrived` rend déjà) ; { tier: '', distNm: null } hors posé de précision (règle illisible, atterrissage au terrain,
 *  relevé illisible) et au-delà du dernier palier. Recalculé à chaque appel : jamais un palier écrit par un autre. Ne lève jamais. */
export function landTier(rule, fix) {
  const none = {
    tier: '',
    distNm: null
  };
  try {
    const spec = landRule(rule);
    if (!spec || spec.tiered !== true) return none;
    const d = arrived(fix, spec).distNm,
      tier = tierOf(d);
    return tier ? {
      tier,
      distNm: roundNm(d)
    } : none;
  } catch {
    return none;
  }
}

const DRAWERS_MAX = 12,
  PROOFS_MAX = 10;
/** L'instant d'un constat d'étape : un nombre (millisecondes) ou un texte ISO, sinon null. */
const proofAt = t => typeof t === 'number' ? (Number.isFinite(t) ? t : null) : msOf(t);

/** Les posés de précision d'un carnet : [{ id, tier, distNm, at (ms) }], dans l'ordre de `at`. `drawers` : la sortie du lecteur de mission
 *  ([{ id, key, … }]) ; `book` : le carnet BRUT. Le palier est recalculé (landTier) du relevé `to` sur la règle de la mission ; un `tier` ou
 *  une `distNm` écrits dans le carnet ne sont jamais lus. Ne lève jamais : un carnet ou une liste illisibles ne rendent rien. */
export function precisionLandings(drawers, book) {
  const out = [];
  try {
    if (!Array.isArray(drawers) || !plain(book)) return out;
    for (let i = 0; i < Math.min(drawers.length, DRAWERS_MAX); i++) {
      try {
        const d = plain(drawers[i]),
          id = d ? own(d, 'id') : null,
          key = d ? plain(own(d, 'key')) : null;
        if (typeof id !== 'string' || !/^[A-Z]$/.test(id) || !key || own(key, 'kind') !== 'condition') continue;
        const e = plain(own(book, `drawer_${id}`)),
          how = e ? own(e, 'how') : null;
        if (!e || own(e, 'state') !== 'open') continue;
        const cond = own(key, 'condition');
        if (cond === 'landing' && how === 'landing') {
          const at = msOf(own(e, 'at')),
            t = landTier(own(key, 'rule'), own(e, 'to'));
          if (at !== null && t.tier) out.push({
            id,
            tier: t.tier,
            distNm: t.distNm,
            at
          });
        } else if (cond === 'sequence' && how === 'sequence') {
          const rules = own(key, 'steps'),
            proofs = own(e, 'steps');
          if (!Array.isArray(rules) || !Array.isArray(proofs)) continue;
          for (let j = 0; j < Math.min(proofs.length, rules.length, PROOFS_MAX); j++) {
            const p = plain(proofs[j]);
            if (!p || own(p, 'how') !== 'landing') continue;
            const at = proofAt(own(p, 'at')),
              t = landTier(rules[j], own(p, 'to'));
            if (at !== null && t.tier) out.push({
              id,
              tier: t.tier,
              distNm: t.distNm,
              at
            });
          }
        }
      } catch {
        // un tiroir illisible est omis, jamais une exception
      }
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => a.at - b.at);
}
