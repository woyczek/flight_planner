// V3 missions — la carte de l'atelier (SOG-0444, lot P2, première brique ; EDITOR.md § 2 et § 7 undecies) : la mission de la séance
// dessinée sur le SOCLE DE CARTE de la suite (modules/maps/lib/map_base.js : MapLibre à la demande, le fond, l'abandon) et sur les
// couches de l'auteur du socle d'édition (modules/maps/lib/map_edit.js, SOG-0446) — aucun geste ni aucune couche écrits ici.
//
// Deux parts :
//   - le CALCUL PUR, mapFeatures(rows, { zones, adPos, path, run }) → { points, lines, polygons, box } : ce que la carte dessine des
//     lignes des Lieux de la séance (ED.placesOf, ou les lignes retouchées) — les lieux situés (départ, arrivée, cible, points, rendez-vous, objets), les zones (un rond par son centre et son
//     rayon, un contour par ses sommets, lus dans les zones du fichier), la route du départ (en tireté), et pendant un essai des clés la
//     trace et l'avion. Les lignes et le fichier sont des entrées NON FIABLES : tout nombre est borné (jamais ramené dans ses bornes : hors bornes, l'élément n'est pas dessiné),
//     les libellés ne vont que dans des propriétés de MapLibre (jamais dans la page).
//   - les GESTES (deuxième brique) : en Sélection, un lieu touché est choisi (il dit son nom), un lieu situé se déplace par sa poignée,
//     le rayon d'une zone ronde choisie par la sienne ; avec un outil de pose, un toucher de la carte nue rend une position. Chaque
//     lieu porte son identifiant écrit sur la carte (un marqueur de MapLibre, pas une police du fond). Tout
//     passe par le socle d'édition (tapPosition, dragHandles, previewLayer) ; ce fichier ne fait que dire quelles poignées existent
//     et rendre le geste fini à l'écran (onPick, onMove, onRadius, onPose), qui seul retouche les lignes.
//   - les REPÈRES de la base aéronautique (aerodromes, balises, points, points VFR du cadre de la vue) : la couche de référence du
//     socle (referenceLayer), sous les éléments de l'auteur ; refData(listes) les borne ; un repère touché est rendu à l'écran
//     (onRef), il n'est jamais créé par le toucher.
//   - la carte EN VIE (une seule : l'atelier d'une mission à la fois) : show(slot, feats, options) la démarre dans un hôte à elle,
//     gardé d'un dessin à l'autre (l'écran est redessiné par innerHTML : l'hôte est reposé dans l'emplacement neuf), fit() recadre,
//     focus(i) cadre la vue sur une zone, stop() la retire avec son contexte WebGL. Sans tuiles — et HORS LIGNE, sans rien demander
//     (le socle dessine un style local hors ligne depuis SOG-0446) —, un fond uni (MapLibre sur un style local) ; sans MapLibre ni WebGL : rien —
//     l'écran garde son croquis.
// Le BLOC « carte de mission » (SOG-0456 ; EDITOR.md § 7 sexvicies) : ce fichier est le même code en édition (l'atelier) et en
// lecture seule (mission_map.js : le Brief, la liseuse). Son fond — « Rapide » (le fond de la suite, sinon le fond uni) ou
// « Relief » (le fond topographique du socle) — et sa couche « Espaces » (zones R, D, P et RTBA de la base aéronautique, par la
// couche de zones du socle, sous la mission ; éteinte d'office, lue à la demande par le cadre de la vue) sont des options de
// show() ; aucun hôte ni aucun style n'y vient d'un fichier.
import {
  START_VIEW,
  isOwnResize,
  mapSize,
  startTiles,
  styleFor,
  zonesLayer
} from '../maps/lib/map_base.js';
import {
  authorLayers,
  dragHandles,
  previewLayer,
  referenceLayer,
  tapPosition
} from '../maps/lib/map_edit.js';
import * as ED from './editor.js';

/** Les bornes du dessin : le rayon d'une zone ronde (km : celles du lecteur), le nombre de côtés d'un rond, la marge du cadre (degrés,
 *  au moins), l'attente des tuiles puis du fond uni (ms), la marge du cadrage (px). */
export const MAPB = Object.freeze({
  radiusKm: Object.freeze([0.05, 500]),
  ring: 64,
  margin: 0.02,
  wait: 6000,
  waitPlain: 4000,
  padding: 36,
  refZoom: 7, // les repères de la base ne se montrent et ne se demandent qu'à partir de ce zoom
  refMax: 300, // par sorte, au plus
  seekMax: 5, // « Chercher un repère » : candidats montrés, au plus
  seekZoom: 10, // … et le zoom de la vue centrée sur le repère trouvé, au moins (au-delà du zoom des repères : il est dessiné)
  seekBox: 0.02, // … et la demi-largeur (degrés) du cadre où la base doit le confirmer
  spacesZoom: 5, // « Espaces » (SOG-0456) : les espaces du cadre ne sont demandés et dessinés qu'à partir de ce zoom
  spacesMax: 400, // … espaces dessinés, au plus
  spaceRings: 8, // … anneaux d'un espace, au plus
  spaceRing: 2000, // … sommets d'un anneau, au plus (au-delà l'anneau n'est pas dessiné)
  spaceFill: 0.04, // … l'opacité du remplissage d'un espace (des contours, pas des aplats)
  reliefErrors: 4 // « Relief » : tuiles refusées sans qu'aucune soit venue avant de repartir en « Rapide »
});
/** Les règles de style que le bloc porte partout où il est posé (l'atelier, la lecture seule — mission_map.js) : son hôte, les
 *  étiquettes des lieux, la rangée « Fond / Espaces » et sa ligne. */
export const MAP_CSS = `[data-module="missions"] .ms-atmaphost{width:100%;height:100%}
[data-module="missions"] .ms-atmaplbl{pointer-events:none;background:color-mix(in srgb,var(--sog-bg,#fff) 82%,transparent);color:var(--sog-fg,#222);padding:0 4px;font-size:.78em;line-height:1.5;white-space:nowrap;max-width:16em;overflow:hidden;text-overflow:ellipsis}
[data-module="missions"] .ms-atmaplbl[data-mapsel]{background:var(--sog-bg,#fff);border:1px solid var(--sog-accent);padding:1px 6px;font-size:.85em;z-index:1}
[data-module="missions"] .ms-atlook{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 0}
[data-module="missions"] .ms-atlook button,[data-module="missions"] .ms-atlook label{min-height:44px}
[data-module="missions"] .ms-atlook button[aria-pressed="true"]{border-color:var(--sog-accent);box-shadow:inset 0 0 0 1px var(--sog-accent)}
[data-module="missions"] .ms-atlook label{display:flex;align-items:center;gap:8px;margin:0 0 0 8px}
[data-module="missions"] .ms-atlook input{width:20px;height:20px;flex:0 0 auto}
[data-module="missions"] .ms-atlooksaid{flex:1 1 100%}
[data-module="missions"] .ms-atlooksaid:empty{display:none}
`;
/** Les couleurs du design telles que MapLibre les lit (il ne lit pas les variables CSS) : la valeur calculée de chaque jeton de `names`,
 *  lue dans `el`, en UN recalcul de style (SOG-0468) — une sonde par jeton, toutes posées ensemble dans une enveloppe, puis lues, puis
 *  retirées ; un recalcul forcé par jeton coûtait le quart d'un dessin de l'écran. → { jeton: couleur }. */
function tokens(el, names) {
  const box = document.createElement('i'),
    probes = names.map(name => {
      const probe = document.createElement('i');
      probe.style.color = `var(${name})`;
      return probe;
    });
  box.style.display = 'none';
  box.append(...probes);
  el.append(box);
  const out = {};
  names.forEach((name, i) => out[name] = getComputedStyle(probes[i]).color);
  box.remove();
  return out;
}

/** Les jetons que lookOf lit (ceux du design que la carte reprend). */
const LOOK_TOKENS = ['--sog-chart-bg', '--sog-accent', '--sog-muted', '--sog-bg', '--sog-warn', '--sog-err', '--sog-ok', '--sog-fg'];

/** Ce qui fait changer les jetons du design : sa marque, son ton et sa classe sur <html>, le ton de l'appareil (ton « auto »), les
 *  feuilles de style chargées. Deux dessins de même clé lisent les mêmes couleurs : lookOf n'est refait que si la clé change (SOG-0468). */
export function lookKey() {
  const h = document.documentElement;
  let dark = '';
  try {
    dark = String(matchMedia('(prefers-color-scheme: dark)').matches);
  } catch {
    /* sans matchMedia : la clé ne dépend pas du ton de l'appareil */
  }
  return [h.getAttribute('class'), h.getAttribute('data-design'), h.getAttribute('data-tone'), dark, document.styleSheets.length].join('|');
}

/** L'allure de la carte, lue du design à l'endroit où le bloc est posé (`el` : un élément du module) : sombre ou non (le fond des
 *  graphiques, comme le module Données), la couleur de chaque sorte de lieu (celles du croquis), du trait et des zones, le fond uni,
 *  les tons de la couche « Espaces ». → { dark, colors: { bg, preview, spaces, tokens } } pour show(). */
export function lookOf(el) {
  const v = tokens(el, LOOK_TOKENS),
    t = n => v[n],
    bg = t('--sog-chart-bg'),
    [r, g, b] = (bg.match(/[\d.]+/g) || [255, 255, 255]).slice(0, 3).map(Number),
    accent = t('--sog-accent'),
    muted = t('--sog-muted');
  return {
    key: lookKey(),
    dark: 0.2126 * r + 0.7152 * g + 0.0722 * b < 110,
    colors: {
      bg,
      preview: {
        accent,
        bg: t('--sog-bg'),
        snap: t('--sog-warn')
      },
      // la couche « Espaces » (les tons de la couche de zones du socle) : le RTBA et les zones P, les zones R, les zones D
      spaces: {
        err: t('--sog-err'),
        warn: t('--sog-warn'),
        muted,
        ok: t('--sog-ok'),
        line: muted
      },
      tokens: {
        handle: t('--sog-warn'),
        vertex: accent,
        mid: muted,
        default: muted,
        line: accent,
        fill: t('--sog-ok'),
        dep: accent,
        arr: accent,
        plane: accent,
        target: t('--sog-err'),
        rdv: t('--sog-warn'),
        zone: t('--sog-ok'),
        object: t('--sog-fg'),
        pt: muted
      }
    }
  };
}

/** Les fonds du bloc (SOG-0456) : « Rapide » — le fond de la suite, sinon le fond uni ; il marche hors ligne — et « Relief », le fond
 *  topographique du socle. Toute autre valeur se lit « Rapide ». */
export const BASES = Object.freeze(['fast', 'relief']);
export const baseOf = v => v === 'relief' ? 'relief' : 'fast';
/** Les sortes de lieu qu'une poignée déplace (celles de ED.MOVABLE : ni le départ ni l'arrivée, ni l'avion de l'essai). */
const MOVABLE = Object.freeze(['target', 'zone', 'pt', 'rdv', 'object']);

const RAD = Math.PI / 180,
  EARTH_KM = 6371.0088;

/** Un nombre écrit (texte d'une ligne de lieu, nombre du fichier) dans ses bornes, sinon null — jamais ramené dans ses bornes. */
function within(v, lo, hi) {
  if (typeof v !== 'number' && typeof v !== 'string') return null; // ni objet ni tableau : « [] » ne vaut pas 0
  const t = typeof v === 'string' ? v.trim().replace(',', '.') : v;
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

/** Une position { lat, lon } bornée, ou null. */
function posOf(lat, lon) {
  const a = within(lat, -90, 90),
    b = within(lon, -180, 180);
  return a === null || b === null ? null : {
    lat: a,
    lon: b
  };
}

/** Le rond d'une zone, en sommets (un cercle de la sphère autour de son centre) : pour le dessin seulement — le franchissement se juge
 *  ailleurs (frame/lib/crossing.js). Les longitudes ne sont pas ramenées à ±180 : l'anneau reste d'un seul tenant. */
export function circleRing(c, km, n = MAPB.ring) {
  const d = km / EARTH_KM,
    la = c.lat * RAD,
    out = [];
  for (let i = 0; i < n; i++) {
    const t = 2 * Math.PI * i / n,
      la2 = Math.asin(Math.min(1, Math.max(-1, Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t)))),
      lo2 = c.lon * RAD + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    out.push({
      lat: +(la2 / RAD).toFixed(6),
      lon: +(lo2 / RAD).toFixed(6)
    });
  }
  return out;
}

/** Les sources dont une position ne va jamais dans un fichier du dépôt de données (SOG-0153, Q-0061) : X-Plane, Eurocontrol, Little
 *  Navmap — un repère qui en vient (sa `source` ou sa `zone`), ou qui se dit `local`, n'est ni dessiné ni ajoutable. */
const LOCAL_SOURCES = Object.freeze(['xplane', 'eurocontrol', 'eurocontrol_rad', 'lnm']);
/** Ce repère porte-t-il un marqueur local ? */
const isLocal = x => !!x.local || [x.source, x.zone].some(v => typeof v === 'string' && LOCAL_SOURCES.includes(v.trim().toLowerCase()));

/** SOG-0506 (Sécurisation, règle du 18 nov., SOG-0153 / Q-0061) : une position venue de ce lieu de la base peut-elle aller dans un fichier
 *  de mission ? Faux pour ce qui n'est pas un objet, et pour un lieu qui porte un marqueur local (isLocal) — lui, ou l'enregistrement
 *  `item` qu'il enveloppe (aerodb.coordsAll : { kind, item, zone… }). LA garde de tous les chemins qui écrivent ou verrouillent une position
 *  de la base (l'atelier : adPosOf, edPlaceFromBase, edNameBase, edPtSrc ; ici : refData, seekRows). Pur. */
export function publishable(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x) || isLocal(x)) return false;
  const item = x.item;
  return !(item && typeof item === 'object' && isLocal(item));
}

/** Les repères de la base aéronautique d'un cadre, tels que la couche du socle les prend (referenceLayer : { aerodromes [{ icao, lat,
 *  lon }], navaids, points, vrp [{ id, lat, lon }] }), bornés : une position dans ses bornes, un identifiant de vingt-quatre signes
 *  au plus, trois cents par sorte ; le reste de ce que la base rend n'est pas gardé. **Un repère qui porte un marqueur local est
 *  écarté** (Sécurisation, 18 nov. 2026 : « Ajouter comme point » écrit sa position dans un fichier de mission, qui part dans le dépôt
 *  partagé — les listes d'aerodb lisent la base publiée, mais on ne le suppose pas). Pur. */
export function refData(lists) {
  const l = lists && typeof lists === 'object' ? lists : {},
    take = (list, idOf) => {
      const out = [];
      for (const x of Array.isArray(list) ? list.slice(0, 5000) : []) {
        const at = publishable(x) ? posOf(x.lat, x.lon) : null,
          raw = at ? idOf(x) : '',
          id = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim().slice(0, 24) : '';
        if (id && out.length < MAPB.refMax) out.push({
          id,
          lat: at.lat,
          lon: at.lon
        });
      }
      return out;
    };
  return {
    aerodromes: take(l.aerodromes, x => x.icao || x.id).map(a => ({
      icao: a.id,
      lat: a.lat,
      lon: a.lon
    })),
    navaids: take(l.navaids, x => x.id),
    points: take(l.points, x => x.id),
    vrp: take(l.vrp, x => x.id || x.name)
  };
}

/** « Chercher un repère » : la sorte d'un lieu de la base → celle d'un repère de la carte, et la liste de la base qui le confirme. */
const SEEK_KINDS = Object.freeze({
  aerodrome: 'aerodrome',
  navaid: 'navaid',
  point: 'fix',
  fix: 'fix',
  vrp: 'vrp'
});
export const SEEK_LISTS = Object.freeze({
  aerodrome: 'aerodromes',
  navaid: 'navaids',
  fix: 'points',
  vrp: 'vrp'
});

/** Les candidats d'une recherche de repère par son nom, tels que l'écran les propose : [{ id, kind, lat, lon, label }], cinq au plus,
 *  sans doublon. `exact` : les lieux qui portent ce code (aerodb.coordsAll : [{ kind, item, local?, source?, zone? }], le plus proche
 *  d'abord) ; `found` : les lieux qui répondent au texte (aerodb.find : [{ kind, code, name, lat, lon }]) — les villes n'en sont pas.
 *  Tout est borné : une sorte connue, une position dans ses bornes, un identifiant de vingt-quatre signes, un libellé de soixante ;
 *  **un lieu qui porte un marqueur local est écarté** (comme refData). Deux candidats de même libellé disent leur position. Ces
 *  candidats ne sont PAS encore des repères : la base doit confirmer chacun (seekBox, seekKeep). Pur. */
export function seekRows(exact, found) {
  const out = [],
    seen = new Set(),
    list = v => Array.isArray(v) ? v.slice(0, 50) : [],
    text = (v, n) => typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, n) : '',
    add = (kindIn, idIn, nameIn, lat, lon) => {
      const kind = typeof kindIn === 'string' && Object.hasOwn(SEEK_KINDS, kindIn) ? SEEK_KINDS[kindIn] : '',
        at = kind ? posOf(lat, lon) : null,
        name = text(nameIn, 40),
        id = at ? text(idIn, 24) || name.slice(0, 24) : '',
        key = `${kind}|${id.toUpperCase()}|${at?.lat.toFixed(2)}|${at?.lon.toFixed(2)}`;
      if (!id || seen.has(key) || out.length >= MAPB.seekMax) return;
      seen.add(key);
      out.push({
        id,
        kind,
        lat: at.lat,
        lon: at.lon,
        label: (name && name.toUpperCase() !== id.toUpperCase() ? `${id} — ${name}` : id).slice(0, 60)
      });
    };
  for (const x of list(exact)) {
    const item = x && typeof x === 'object' && x.item && typeof x.item === 'object' ? x.item : null;
    if (item && publishable(x)) add(x.kind, item.icao || item.id || item.name, item.name, item.lat, item.lon);
  }
  for (const x of list(found))
    if (publishable(x)) add(x.kind, x.code || x.name, x.name, x.lat, x.lon);
  return out.map(r => out.filter(q => q.label === r.label).length > 1 ? {
    ...r,
    label: `${r.label} · ${r.lat.toFixed(2)}, ${r.lon.toFixed(2)}`
  } : r);
}

/** Le cadre [ouest, sud, est, nord] où la base doit confirmer un candidat : un petit carré autour de sa position. Pur. */
export function seekBox(row) {
  const d = MAPB.seekBox;
  return [row.lon - d, row.lat - d, row.lon + d, row.lat + d].map(v => +v.toFixed(4));
}

/** Un candidat confirmé par la base : `lists` est ce qu'elle rend pour son cadre (seekBox) dans la liste de sa sorte (SEEK_LISTS) ;
 *  le candidat n'est gardé que s'il est parmi les repères que la carte dessinerait (refData : bornés, **sans marqueur local**) — même
 *  identifiant, même endroit ; sa position est alors celle de la base. Sinon null : la recherche ne cercle jamais qu'un repère de
 *  la carte. Pur. */
export function seekKeep(row, lists) {
  if (!row || typeof row !== 'object' || !Object.hasOwn(SEEK_LISTS, row.kind)) return null;
  const d = refData(lists),
    all = row.kind === 'aerodrome' ? d.aerodromes.map(a => ({
      id: a.icao,
      lat: a.lat,
      lon: a.lon
    })) : d[SEEK_LISTS[row.kind]],
    id = String(row.id).toUpperCase(),
    hit = all.find(x => x.id.toUpperCase() === id && Math.abs(x.lat - row.lat) <= MAPB.seekBox && Math.abs(x.lon - row.lon) <= MAPB
      .seekBox);
  return hit ? {
    ...row,
    lat: hit.lat,
    lon: hit.lon
  } : null;
}

/** Le contour d'une ligne de zone : ses sommets ({ lat, lon }), lus bornés par ED.ringOf (3 à 100, tous situés) ; null sans contour
 *  retouchable (une zone ronde, ou un contour que le fichier garde tel quel). */
function contourOf(row) {
  const ring = ED.ringOf(row);
  return ring ? ring.map(([lat, lon]) => ({
    lat,
    lon
  })) : null;
}

/** Le DERNIER CADRE VU dans l'atelier pendant la séance (SOG-0469) : la vue de la carte en vie, gardée quand elle s'arrête de bouger
 *  et quand elle est retirée ; en mémoire du module seulement, écrite nulle part. null tant que l'atelier n'a rien montré. */
let LAST = null;

/** Garde la vue de la carte de l'atelier comme dernier cadre vu (une vue que MapLibre ne sait pas dire, ou hors bornes : ignorée). */
function keepView(L) {
  if (!L?.map || !L.cb?.edit) return;
  try {
    const b = L.map.getBounds(),
      v = {
        w: +b.getWest().toFixed(6),
        s: +Math.max(-85, b.getSouth()).toFixed(6),
        e: +b.getEast().toFixed(6),
        n: +Math.min(85, b.getNorth()).toFixed(6)
      };
    if ([v.w, v.s, v.e, v.n].every(Number.isFinite) && v.w >= -180 && v.e <= 180 && v.w < v.e && v.s < v.n) LAST = v;
  } catch {
    /* la vue d'avant reste le dernier cadre vu */
  }
}

/** Ce que la carte dessine d'une mission (voir l'en-tête). Le cadre `box` est TOUJOURS rendu (SOG-0469) : celui des éléments situés ;
 *  sans aucun, le dernier cadre vu dans l'atelier, sinon la vue de départ de la Carte (START_VIEW, modules/maps/lib/map_base.js), et `wide: true` — la carte s'ouvre
 *  alors quand même, et un outil y pose le premier lieu ;
 *  la lecture seule (mission_map.js), elle, ne montre pas une carte sur le cadre large. `rows` : les lignes des Lieux que l'écran montre (une zone en contour y
 *  porte ses sommets : `ring`) ; `adPos(nom)` : la position que la base donne à un terrain dont le fichier ne dit pas la position (départ, arrivée), ou
 *  null ; `path` : la route du départ ([{ lat, lon }…], celle de l'essai) ; `run` : l'essai des clés en cours (sa trace, son avion).
 *  L'identifiant d'un élément est « place:i », i étant le rang de sa ligne dans la liste des Lieux : toucher l'élément mène à elle.
 *  Une zone ronde est aussi un point en son centre (c'est par lui qu'elle se déplace) ; `sel` : le rang du lieu choisi — une zone
 *  ronde choisie montre la poignée de son rayon (« radius:i », à l'est de son rond) ; une zone en contour est un point en son milieu,
 *  et choisie elle montre ses sommets (« vertex:i:k ») et le milieu de chaque côté (« mid:i:k » : il ajoute un sommet après le
 *  sommet k). Un point qu'une poignée déplace porte `movable` — jamais un lieu `locked` (SOG-0506 : un point nommé de la base, à la
 *  position de la base ; l'auteur le libère en effaçant son code). `onward` : les jetons de la suite de route du tiroir choisi — elle est
 *  dessinée par ses lieux situés (« onward »).
 *  `labels` [{ id, lat, lon, text }] : l'étiquette de chaque lieu dessiné — son identifiant (à défaut le début de son nom : le code
 *  d'un terrain), vingt-quatre signes au plus —, sur son point, ou au milieu de son contour. */
export function mapFeatures(rows, {
  adPos = null,
  path = [],
  run = null,
  sel = -1,
  onward = []
} = {}) {
  const points = [],
    lines = [],
    polygons = [],
    labels = [],
    all = [],
    spot = new Map(), // la position de chaque lieu par son jeton de route (« ORIGIN », « DESTINATION », son identifiant)
    // l'étiquette d'un lieu : son identifiant ; à défaut le début de son nom (« XTST · Base Test » : le code du terrain)
    tag = r => String(r.id || String(r.name || '').split(' · ')[0] || '').slice(0, 24),
    middle = ring => ({
      lat: +(ring.reduce((t, p) => t + p.lat, 0) / ring.length).toFixed(6),
      lon: +(ring.reduce((t, p) => t + p.lon, 0) / ring.length).toFixed(6)
    });
  (Array.isArray(rows) ? rows : []).slice(0, 400).forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const id = `place:${i}`,
      label = String(r.id || r.name || '').slice(0, 60);
    let at = posOf(r.lat, r.lon);
    if (!at && (r.kind === 'dep' || r.kind === 'arr') && adPos) {
      const q = adPos(r.name);
      at = q ? posOf(q.lat, q.lon) : null;
    }
    const token = ED.routeToken(r);
    if (r.kind === 'zone') {
      const km = within(r.radius, ...MAPB.radiusKm),
        contour = r.poly ? contourOf(r) : null,
        ring = contour || (!r.poly && at && km !== null ? circleRing(at, km) : null);
      if (ring) {
        polygons.push({
          id,
          rings: [ring]
        });
        all.push(...ring);
      }
      if (contour) {
        // un contour : il se déplace d'un bloc par son milieu, où il porte son étiquette ; choisi, il montre ses sommets (des
        // poignées) et, au milieu de chaque côté, le point qui en ajoute un
        const mid = middle(contour);
        if (token) spot.set(token, mid);
        points.push({
          id,
          ...mid,
          label,
          kind: 'zone',
          movable: true
        });
        if (tag(r)) labels.push({
          id,
          ...mid,
          text: tag(r)
        });
        if (sel === i) contour.forEach((v, k) => {
          const w = contour[(k + 1) % contour.length];
          points.push({
            id: `mid:${i}:${k}`,
            lat: +((v.lat + w.lat) / 2).toFixed(6),
            lon: +((v.lon + w.lon) / 2).toFixed(6),
            label: '',
            kind: 'mid'
          }, {
            id: `vertex:${i}:${k}`,
            lat: v.lat,
            lon: v.lon,
            label: '',
            kind: 'vertex'
          });
        });
        return;
      }
      if (ring && sel === i) points.push({
        id: `radius:${i}`,
        lat: ring[ring.length / 4].lat,
        lon: ring[ring.length / 4].lon,
        label: '',
        kind: 'handle',
        center: at
      });
    }
    if (!at) return;
    if (token) spot.set(token, at);
    points.push({
      id,
      lat: at.lat,
      lon: at.lon,
      label,
      kind: r.kind,
      ...(MOVABLE.includes(r.kind) && r.locked !== true ? { // SOG-0506 : un point verrouillé par la base n'a pas de poignée
        movable: true
      } : {})
    });
    if (tag(r)) labels.push({
      id,
      lat: at.lat,
      lon: at.lon,
      text: tag(r)
    });
    all.push(at);
  });
  const route = (Array.isArray(path) ? path : []).map(p => posOf(p?.lat, p?.lon)).filter(Boolean);
  if (route.length > 1) {
    lines.push({
      id: 'route',
      points: route,
      dash: true
    });
    all.push(...route);
  }
  // la suite de route du tiroir choisi : ses lieux situés, dans l'ordre (une deuxième ligne en tireté)
  const next = (Array.isArray(onward) ? onward : []).slice(0, 60).map(t => typeof t === 'string' ? spot.get(t) : null).filter(Boolean);
  if (next.length > 1) lines.push({
    id: 'onward',
    points: next,
    dash: true
  });
  if (run?.ok && Array.isArray(run.trail)) {
    const trail = run.trail.map(p => Array.isArray(p) ? posOf(p[0], p[1]) : null).filter(Boolean);
    if (trail.length > 1) lines.push({
      id: 'trail',
      points: trail
    });
    if (trail.length) {
      const last = trail[trail.length - 1];
      points.push({
        id: 'plane',
        lat: last.lat,
        lon: last.lon,
        label: '',
        kind: 'plane'
      });
      all.push(...trail);
    }
  }
  if (!all.length) return {
    points,
    lines,
    polygons,
    labels,
    box: {
      ...(LAST || START_VIEW)
    },
    wide: true
  };
  const lats = all.map(p => p.lat),
    lons = all.map(p => p.lon),
    m = MAPB.margin;
  return {
    points,
    lines,
    polygons,
    labels,
    box: {
      w: +(Math.min(...lons) - m).toFixed(6),
      s: +Math.max(-85, Math.min(...lats) - m).toFixed(6),
      e: +(Math.max(...lons) + m).toFixed(6),
      n: +Math.min(85, Math.max(...lats) + m).toFixed(6)
    }
  };
}

/** Ce qui fait changer le dessin : les éléments eux-mêmes. */
const signature = f => JSON.stringify([f.points, f.lines, f.polygons, f.labels]);
/** Le cadre de la vue pour MapLibre : [[ouest, sud], [est, nord]]. */
const boundsOf = b => [
  [b.w, b.s],
  [b.e, b.n]
];
/** Le fond uni : un style local de MapLibre, sans rien à aller chercher. */
const plainStyle = bg => ({
  version: 8,
  sources: {},
  layers: [{
    id: 'bg',
    type: 'background',
    paint: {
      'background-color': bg || '#eef2f5'
    }
  }]
});

/** Les espaces que la couche « Espaces » dessine (SOG-0456) : les zones réglementées, dangereuses et interdites, et le RTBA. */
const SPACE_TYPES = Object.freeze(['R', 'D', 'P']);

/** Les espaces de la base aéronautique (ctx.aerodb.airspaces : { type, azba, rings en [lat, lon] }) en entités de la couche de zones
 *  du socle (zonesLayer : MultiPolygon en [lon, lat], { id, tone }) — le RTBA (`azba`) et les zones P au ton « err », les zones R au
 *  ton « warn », les zones D au ton « muted » ; tout autre type n'est pas dessiné. La base est une entrée bornée comme une autre :
 *  un anneau dont un sommet est hors bornes, trop court ou trop long n'est pas dessiné ; quatre cents espaces au plus. Aucun nom ne
 *  va sur la carte. */
export function spaceFeatures(list) {
  const features = [];
  for (const a of Array.isArray(list) ? list : []) {
    if (features.length >= MAPB.spacesMax) break;
    if (!a || typeof a !== 'object') continue;
    const rtba = a.azba === true,
      type = typeof a.type === 'string' ? a.type : '';
    if (!rtba && !SPACE_TYPES.includes(type)) continue;
    const polys = [];
    for (const ring of (Array.isArray(a.rings) ? a.rings : []).slice(0, MAPB.spaceRings)) {
      if (!Array.isArray(ring) || ring.length < 3 || ring.length > MAPB.spaceRing) continue;
      const pts = ring.map(p => Array.isArray(p) ? posOf(p[0], p[1]) : null);
      if (pts.some(p => !p)) continue;
      const out = pts.map(p => [p.lon, p.lat]);
      if (out[0][0] !== out.at(-1)[0] || out[0][1] !== out.at(-1)[1]) out.push([...out[0]]);
      polys.push([out]);
    }
    if (polys.length) features.push({
      type: 'Feature',
      properties: {
        id: `space:${features.length}`,
        tone: rtba || type === 'P' ? 'err' : type === 'R' ? 'warn' : 'muted'
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: polys
      }
    });
  }
  return {
    type: 'FeatureCollection',
    features
  };
}

let LIVE = null; // la carte en vie : { owner, host, map, auth, pv, drag, tap, labels, mode, sel, cb, state, sig, box, dark, moved, … }

/** Ce que désigne l'identifiant d'un élément : { what: 'place' | 'radius', i } (le rang de la ligne), { what: 'vertex' | 'mid', i, k }
 *  (le rang du sommet) ; null pour tout autre texte. */
function partsOf(id) {
  const m = /^(?:(place|radius):(\d{1,3})|(vertex|mid):(\d{1,3}):(\d{1,3}))$/.exec(String(id || ''));
  return !m ? null : m[1] ? {
    what: m[1],
    i: +m[2]
  } : {
    what: m[3],
    i: +m[4],
    k: +m[5]
  };
}
/** Le rang de la ligne que désigne l'identifiant d'un élément ; -1 sinon. */
const rankOf = id => partsOf(id)?.i ?? -1;

/** Les poignées que le socle d'édition peut saisir (dragHandles), relues à chaque toucher : en Sélection seulement, les points qu'un
 *  geste déplace (une zone ronde par son centre, un contour par son milieu), la poignée du rayon de la zone ronde choisie, les
 *  sommets et les milieux des côtés du contour choisi. */
function handlesOf(L) {
  if (L.mode !== 'select') return [];
  return (L.feats?.points || []).filter(p => p.movable || ['handle', 'vertex', 'mid'].includes(p.kind)).map(p => p.kind === 'handle' ? {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    kind: 'radius',
    center: p.center
  } : p.kind === 'vertex' || p.kind === 'mid' ? {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    kind: 'vertex'
  } : {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    kind: p.kind === 'object' ? 'object' : 'point'
  });
}

/** La largeur de la vue, en km (à la latitude de son centre) : l'écran en tire le rayon d'une zone posée. */
function spanKm(map) {
  try {
    const b = map.getBounds(),
      lat = map.getCenter().lat;
    return Math.abs(b.getEast() - b.getWest()) * 111.32 * Math.max(0.01, Math.cos(lat * RAD));
  } catch {
    return 0;
  }
}

/** Chaque lieu dit son identifiant sur la carte (l'ergonome, 18 nov. 2026 : « une carte de points sans nom ne se lit pas »), et le lieu
 *  choisi son nom complet : des marqueurs de MapLibre — des éléments de la page, leur texte par textContent, qui ne prennent aucun
 *  toucher —, pas une police du fond (un fond n'en porte pas toujours). Un marqueur par étiquette, gardé d'un dessin à l'autre, déplacé,
 *  retiré avec son lieu ; pendant un essai des clés, les étiquettes restent, aucun lieu n'est choisi. Seul ce qui change est touché (texte,
 *  choix, position, pose sur la carte) et l'empilement n'est refait que si une étiquette a bougé (SOG-0468). */
function mark(L) {
  const ml = globalThis.maplibregl,
    want = new Map((L.map && ml?.Marker ? L.feats?.labels || [] : []).map(l => [l.id, l]));
  let moved = false; // une étiquette posée, retirée, déplacée, ou dont le texte ou le choix a changé : alors seulement spread
  L.labels ||= new Map();
  for (const [id, m] of L.labels)
    if (!want.has(id)) {
      m.remove();
      L.labels.delete(id);
      moved = true;
    }
  for (const [id, l] of want) {
    let m = L.labels.get(id);
    if (!m) {
      const el = Object.assign(document.createElement('div'), {
        className: 'ms-atmaplbl'
      });
      el.dataset.maplbl = id;
      m = new ml.Marker({
        element: el,
        anchor: 'bottom-left',
        offset: [7, -7]
      });
      L.labels.set(id, m);
    }
    // ce que l'étiquette est déjà sur CETTE carte : on ne touche que ce qui change (addTo retire puis rattache l'élément : 118 mutations
    // par frappe pour 59 étiquettes, SOG-0468)
    const el = m.getElement(),
      st = LBL.get(m) || {},
      on = st.map === L.map,
      chosen = L.mode === 'select' && id === `place:${L.sel}`,
      text = String((chosen && L.selLabel) || l.text).slice(0, 60);
    if (el.textContent !== text) {
      el.textContent = text;
      moved = true;
    }
    if (chosen !== ('mapsel' in el.dataset)) {
      if (chosen) el.dataset.mapsel = '';
      else delete el.dataset.mapsel;
      moved = true;
    }
    if (!on || st.lon !== l.lon || st.lat !== l.lat) {
      m.setLngLat([l.lon, l.lat]);
      if (!on) m.addTo(L.map);
      LBL.set(m, {
        map: L.map,
        lon: l.lon,
        lat: l.lat
      });
      moved = true;
    }
  }
  if (moved || L.map?.getZoom() !== L.spreadZoom) spread(L); // aussi quand l'échelle n'est plus celle du dernier empilement
}

/** Ce que chaque étiquette (marqueur) a déjà reçu : { map, lon, lat } — la carte où elle est posée et sa position (mark ne retouche que
 *  ce qui change). */
const LBL = new WeakMap();

/** Les étiquettes de lieux voisins s'empilent au lieu de se recouvrir (une zone centrée sur un point, un objet près de la cible) :
 *  chacune monte d'une ligne tant qu'elle en touche une déjà posée — à l'échelle de la vue, donc refait quand une étiquette bouge (mark) et à
 *  chaque changement d'échelle. */
function spread(L) {
  if (!L.map || !L.labels) return;
  L.spreadZoom = L.map.getZoom();
  const step = 16,
    placed = [];
  for (const m of L.labels.values()) {
    let p;
    try {
      p = L.map.project(m.getLngLat());
    } catch {
      continue;
    }
    const w = m.getElement().offsetWidth || 60;
    let k = 0;
    while (k < 6 && placed.some(q => p.x < q.x + q.w && q.x < p.x + w && Math.abs(q.y - (p.y - step * k)) < step - 1)) k++;
    placed.push({
      x: p.x,
      y: p.y - step * k,
      w
    });
    m.setOffset([7, -7 - step * k]);
  }
}

/** Un geste sur une poignée, rendu à l'écran — LE SEUL chemin de toutes les poignées (SOG-0478) : un lieu touché est choisi, déplacé
 *  s'il a bougé ; la poignée d'un rayon le règle ; un sommet touché est choisi (l'écran propose « Retirer ce sommet »), déplacé s'il a
 *  bougé ; le milieu d'un côté, touché ou tiré, pose un sommet là où le geste finit. `drag` (vrai) : le geste n'est pas fini, l'écran
 *  redessine aussitôt ce qui dépend de la poignée (le centre d'une zone, un sommet, un objet, le rayon) comme le doigt la porte — sans
 *  rien garder ; un milieu de côté n'attend que la fin (poser un sommet change les poignées). */
function done(L, id, moved, at, drag = false) {
  const t = partsOf(id),
    cb = L.cb;
  if (!t) return;
  if (t.what === 'mid') return drag ? undefined : cb?.onInsert?.({
    i: t.i,
    k: t.k,
    lat: at.lat,
    lon: at.lon
  });
  if (t.what === 'vertex') return moved ? cb?.onVertex?.({
    i: t.i,
    k: t.k,
    lat: at.lat,
    lon: at.lon,
    drag
  }) : cb?.onVertexPick?.({
    i: t.i,
    k: t.k
  });
  if (!moved) return cb?.onPick?.(t.i);
  if (t.what === 'radius') return cb?.onRadius?.({
    i: t.i,
    km: at.meters / 1000,
    drag
  });
  cb?.onMove?.({
    i: t.i,
    lat: at.lat,
    lon: at.lon,
    drag
  });
}

/** Le repère de la base sous un pixel (à dix pixels près) : { id, kind, lat, lon } bornés, ou null — lu des couches de référence du
 *  socle (« me-ref-… »). */
function refAt(L, x, y) {
  let f = null;
  try {
    f = L.map.queryRenderedFeatures([
      [x - 10, y - 10],
      [x + 10, y + 10]
    ]).find(q => String(q.layer?.id || '').startsWith('me-ref-'));
  } catch {
    return null;
  }
  const at = f?.geometry?.type === 'Point' ? posOf(f.geometry.coordinates[1], f.geometry.coordinates[0]) : null,
    id = String(f?.properties?.rid ?? '').slice(0, 24),
    kind = ['aerodrome', 'navaid', 'fix', 'vrp'].includes(f?.properties?.kind) ? f.properties.kind : 'fix';
  return at && id ? {
    id,
    kind,
    lat: at.lat,
    lon: at.lon
  } : null;
}

/** Dit à l'écran le cadre de la vue, au repos (une fois le mouvement fini), à partir du zoom des repères : l'écran demande alors à la
 *  base aéronautique les repères de ce cadre et les rend par setRefs. */
function viewed(L) {
  clearTimeout(L.viewTimer);
  L.viewTimer = setTimeout(() => {
    if (LIVE !== L || !L.map) return;
    let b, zoom;
    try {
      b = L.map.getBounds();
      zoom = L.map.getZoom();
    } catch {
      return;
    }
    const box = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => +(+v).toFixed(4)),
      sig = JSON.stringify(box);
    if (!box.every(Number.isFinite)) return;
    spacesView(L, box, zoom, sig);
    if (zoom >= MAPB.refZoom && sig !== L.viewSig) {
      L.viewSig = sig;
      L.cb?.onView?.({
        bbox: box,
        zoom
      });
    }
  }, 300);
}

/** La couche « Espaces » suit la vue au repos (SOG-0456) : allumée, au zoom des espaces et au-delà, l'écran est prié de lire ceux du
 *  cadre (onSpaces({ bbox, zoom }) ; il les rend par setSpaces) ; en deçà la couche est vidée et l'écran le sait
 *  (onSpaces({ far: true })). Éteinte : rien n'est demandé — c'est ce qui garde la carte rapide. */
function spacesView(L, box, zoom, sig) {
  if (!L.spaces) return;
  const far = zoom < MAPB.spacesZoom,
    key = far ? 'far' : sig;
  if (key === L.spSig) return;
  L.spSig = key;
  if (far) L.zl?.update(null);
  L.cb?.onSpaces?.(far ? {
    far: true
  } : {
    bbox: box,
    zoom
  });
}

/** Les espaces du cadre de la vue (la réponse à onSpaces), posés SOUS les éléments de la mission ; → le nombre d'espaces dessinés
 *  (0 quand la couche est éteinte ou la carte absente). */
export function setSpaces(owner, list) {
  if (!LIVE || LIVE.owner !== owner || !LIVE.zl || !LIVE.spaces) return 0;
  const fc = spaceFeatures(list);
  LIVE.zl.update(fc);
  return fc.features.length;
}

/** Les repères de la base du cadre de la vue (refData), posés sur la couche de référence du socle : sous les éléments de l'auteur. */
export function setRefs(owner, data) {
  if (!LIVE || LIVE.owner !== owner || !LIVE.ref) return;
  LIVE.ref.update(data || {});
}

/** Branche les gestes du socle d'édition sur la carte en vie (une fois, au démarrage) : le retour pendant un glisser, le geste fini
 *  rendu à l'écran. Rien n'est retouché ici. */
function gestures(L, map, o) {
  const ignore = '.maplibregl-ctrl';
  L.pv = previewLayer(map, 'mission', {
    tokens: o.colors?.preview
  });
  // les repères de la base aéronautique : une couche du socle, sous les éléments de l'auteur ; le toucher passe par tapPosition (refAt)
  L.ref = referenceLayer(map, {
    data: {},
    minzoom: MAPB.refZoom
  });
  map.on('moveend', () => viewed(L));
  viewed(L);
  L.drag = dragHandles(map, L.host, {
    handles: () => handlesOf(L),
    ignore,
    // à chaque image du geste : l'écran redessine aussitôt (done, drag) ; avant les six pixels, c'est encore un toucher
    onMove: m => m.moved && done(L, m.id, true, m, true),
    onEnd: m => {
      L.pv.clear();
      done(L, m.id, m.moved, m);
    },
    onTap: h => done(L, h.id, false, h),
    onCancel: () => {
      L.pv.clear();
      L.cb?.onDragCancel?.(); // un geste lâché (la poignée a disparu, le doigt est parti) : l'écran rend ce qu'il montrait avant lui
    }
  });
  L.tap = tapPosition(map, L.host, {
    ignore,
    onTap: p => {
      if (L.mode === 'select') {
        // en Sélection : l'élément sous le doigt est choisi (un terrain, un contour, le rond d'une zone) ; sinon un repère de la base
        // dit ce qu'il est (il n'est pas créé) ; la carte nue ne choisit rien
        // (un trait — la route, la trace — ne se choisit pas : sous le doigt, il ne masque pas un repère)
        const i = rankOf(L.auth?.at(p.x, p.y)?.id),
          r = i < 0 ? refAt(L, p.x, p.y) : null;
        return r ? L.cb?.onRef?.(r) : L.cb?.onPick?.(i);
      }
      if (L.mode === 'view') return; // pendant un essai des clés la carte ne fait que montrer
      if (L.mode === 'put') return L.cb?.onPut?.({ // « Placer l'avion ici » : le toucher rend la position où poser l'avion de l'essai
        lat: p.lat,
        lon: p.lon
      });
      if (L.mode === 'route') {
        // Tracé : le lieu sous le doigt rejoint la route choisie ; la carte nue ne fait rien
        const t = partsOf(L.auth?.at(p.x, p.y)?.id);
        return t?.what === 'place' ? L.cb?.onRoute?.(t.i) : undefined;
      }
      L.cb?.onPose?.({
        lat: p.lat,
        lon: p.lon,
        spanKm: spanKm(map)
      });
    }
  });
}

/** L'état de la carte en vie pour l'écran : 'relief' (le fond topographique), 'tiles' (le fond de la suite), 'plain' (le fond uni),
 *  '' (pas de carte : le croquis). */
export const stateOf = owner => LIVE && LIVE.owner === owner && LIVE.map ? LIVE.state : '';
/** Vrai quand la carte en vie est celle de l'atelier (posée avec `edit: true`), pas celle d'un bloc en lecture. */
export const editing = () => !!LIVE?.cb?.edit;
/** Vrai quand « Relief » est voulu et n'est pas venu (hors ligne, ou l'hôte des tuiles ne répond pas) : la carte est en « Rapide »,
 *  l'écran le dit. */
export const reliefMissing = owner => !!(LIVE && LIVE.owner === owner && LIVE.map && LIVE.base === 'relief' && LIVE.state !== 'relief');

/** « Relief » qui ne vient pas alors que l'appareil se dit en ligne : quelques tuiles refusées sans qu'aucune soit venue, et la
 *  carte repart en « Rapide » (la chaîne des fonds, sans « Relief ») ; l'écran le sait par onState. */
function reliefWatch(L, map) {
  let bad = 0,
    ok = false;
  map.on('sourcedata', e => {
    if (e?.sourceId === 'otm' && e.tile) ok = true;
  });
  map.on('error', e => {
    if (e?.sourceId !== 'otm' || ok || LIVE !== L || L.map !== map || ++bad < MAPB.reliefErrors) return;
    L.reliefOff = true;
    restart(L);
  });
}

/** Retire la carte de son hôte — ses couches, ses gestes, ses étiquettes, son contexte WebGL — sans retirer l'hôte. */
function unmap(L) {
  clearTimeout(L.timer);
  clearTimeout(L.viewTimer);
  L.ro?.disconnect();
  try {
    for (const m of L.labels?.values() || []) m.remove();
    L.ref?.stop();
    L.tap?.stop();
    L.drag?.stop();
    L.pv?.remove();
    L.zl?.remove();
    L.auth?.remove();
    L.map?.remove();
  } catch {
    /* déjà retirée */
  }
  L.labels = L.ref = L.tap = L.drag = L.pv = L.zl = L.auth = L.map = L.ro = null;
  L.viewSig = L.spSig = '';
}

/** Refait la carte dans le même hôte (le fond voulu a changé, ou « Relief » ne vient pas) : la chaîne des fonds repart du début —
 *  le même repli qu'au premier démarrage — ; la vue est gardée si l'auteur l'avait déplacée. */
function restart(L) {
  if (L.starting) return;
  L.camera = null;
  if (L.map && L.moved) try {
    const c = L.map.getCenter();
    L.camera = {
      center: [c.lng, c.lat],
      zoom: L.map.getZoom()
    };
  } catch {
    /* la vue reviendra au cadre de la mission */
  }
  unmap(L);
  L.state = '';
  start(L, L.cb);
}

/** Recadre la vue sur la mission (le premier cadre), sans animation ; ce n'est pas un geste de l'auteur. */
function frame(L) {
  if (!L.map || !L.box) return;
  L.fitting = true;
  try {
    L.map.fitBounds(boundsOf(L.box), {
      padding: L.feats?.wide ? 0 : MAPB.padding, // un cadre large est une vue déjà cadrée : rien n'est ajouté autour
      animate: false,
      maxZoom: 13
    });
  } catch {
    /* un cadre que MapLibre refuse : la vue reste où elle est */
  }
  L.fitting = false;
}

/** Démarre la carte dans son hôte : « Relief » d'abord quand il est voulu, puis le fond de la suite, sinon le fond uni — hors ligne le socle rend null AUSSITÔT pour le fond de
 *  la suite (rien n'est demandé) et dessine le fond uni, un style local ; puis les couches de l'auteur et le premier cadre. Sans
 *  carte (pas de WebGL, MapLibre absent) : `onState('')`, l'écran garde son croquis. */
async function start(L, o) {
  L.starting = true;
  const alive = () => LIVE === L && o.alive(),
    common = {
      // la vue gardée d'une carte refaite (restart), sinon le cadre de la mission
      ...(L.camera ? L.camera : {
        bounds: boundsOf(L.box),
        padding: L.feats?.wide ? 0 : MAPB.padding
      }),
      attributionControl: {
        compact: true
      },
      alive
    },
    built = L.base,
    // la chaîne des fonds : « Relief » quand il est voulu (et n'a pas déjà manqué), le fond de la suite, le fond uni
    chain = [
      ...(built === 'relief' && !L.reliefOff ? [
        ['relief', styleFor({
          base: 'otm-topo'
        }), MAPB.wait]
      ] : []),
      ['tiles', styleFor({
        dark: L.dark
      }), MAPB.wait],
      ['plain', plainStyle(o.colors?.bg), MAPB.waitPlain]
    ];
  let map = null,
    state = '';
  for (const [name, style, wait] of chain) {
    map = await startTiles(L.host, {
      ...common,
      style,
      wait,
      ...(name === 'plain' ? {
        attributionControl: false
      } : {})
    });
    state = name;
    if (map || !alive()) break;
  }
  L.camera = null;
  L.starting = false;
  if (!alive()) {
    try {
      map?.remove();
    } catch {
      /* déjà retirée */
    }
    return;
  }
  if (!map) {
    L.failed = true;
    return o.onState('');
  }
  L.map = map;
  L.state = state;
  L.built = built;
  // « Espaces » : la couche de zones du socle, posée AVANT celles de l'auteur — donc dessous, et de nouveau dessous après un
  // changement de style (les couches reviennent dans l'ordre où elles ont été posées) ; vide tant que la couche est éteinte
  L.zl = zonesLayer(map, null, {
    colors: o.colors?.spaces,
    fill: MAPB.spaceFill // des contours : le remplissage léger, demandé au socle (sans l'option, celui du socle)
  });
  if (state === 'relief') reliefWatch(L, map);
  L.auth = authorLayers(map, {
    id: 'mission',
    tokens: o.colors?.tokens
  });
  L.auth.setFeatures(L.feats);
  gestures(L, map, o);
  mark(L);
  map.on('movestart', () => {
    if (!L.fitting && !isOwnResize(map)) L.moved = true; // l'auteur a déplacé la vue : elle ne se recadre plus seule
  });
  map.on('zoomend', () => spread(L)); // les étiquettes voisines s'empilent à l'échelle de la vue
  map.on('moveend', () => keepView(L)); // le dernier cadre vu de la séance (SOG-0469)
  mapSize(map, L.host);
  if (!L.moved) frame(L);
  // MapLibre ne suit pas seul la taille de son cadre (le socle) : la fenêtre change de taille, l'appareil tourne, la carte se déplie —
  // la taille est reprise une fois arrêtée, et la vue recadrée tant que l'auteur ne l'a pas déplacée
  if (typeof ResizeObserver === 'function') {
    L.ro = new ResizeObserver(() => {
      clearTimeout(L.timer);
      L.timer = setTimeout(() => {
        if (LIVE === L && L.host.clientWidth > 0 && mapSize(map, L.host) && !L.moved) frame(L);
      }, 120);
    });
    L.ro.observe(L.host);
  }
  o.onState(state);
  if (L.base !== built) restart(L); // le fond voulu a changé pendant le démarrage
}

/** Montre la carte de la mission dans `slot` (l'emplacement du dessin courant) : la démarre au premier appel, repose son hôte après
 *  chaque dessin, met ses éléments à jour s'ils ont changé, la recadre tant que l'auteur n'a pas déplacé la vue. `feats` : mapFeatures ;
 *  options : owner (la séance : une autre séance repart d'une carte neuve), dark, colors ({ tokens, bg, preview, spaces } : lookOf),
 *  onState(état), base ('fast' | 'relief' : le fond voulu ; changé, la carte est refaite dans le même hôte), spaces (la couche
 *  « Espaces » allumée) avec onSpaces({ bbox, zoom } | { far: true }) — l'écran lit les espaces du cadre et les rend par setSpaces —,
 *  edit (vrai : la carte de l'atelier),
 *  alive() ; mode ('select' : la Sélection ; 'point', 'zone', 'object' : un outil de pose ; 'route' : Tracé — un lieu touché est
 *  rendu par onRoute(rang) ; 'view' : la carte ne fait que montrer ; 'put' : pendant un essai, un toucher rend la position où
 *  poser l'avion — onPut({ lat, lon })),
 *  sel (le rang du lieu choisi, -1 sinon), selLabel (son nom), ref (le repère de la base touché, marqué sur la carte) ; les gestes finis : onPick(rang | -1), onMove({ i, lat, lon }),
 *  onRadius({ i, km }), onPose({ lat, lon, spanKm }), et pour un contour onVertex({ i, k, lat, lon }), onInsert({ i, k, lat, lon }) —
 *  onMove, onRadius et onVertex rendent aussi chaque image d'un geste en cours (`drag: true` : redessiner aussitôt, rien à garder), et
 *  onDragCancel() un geste lâché sans fin —,
 *  onVertexPick({ i, k }) ; onRoute(rang) en Tracé ; les repères de la base : onView({ bbox, zoom }) quand la vue s'arrête (l'écran
 *  les demande et les rend par setRefs), onRef({ id, kind, lat, lon }) quand un repère est touché en Sélection. Sans élément situé :
 *  la carte s'ouvre sur le cadre large de mapFeatures (SOG-0469) ; sans cadre du tout (une entrée qui n'est pas de mapFeatures) :
 *  pas de carte. */
export function show(slot, feats, o) {
  if (LIVE && LIVE.owner !== o.owner) stop();
  if (!slot || !feats?.box) return;
  const L = LIVE ||= {
      owner: o.owner,
      host: Object.assign(document.createElement('div'), {
        className: 'ms-atmaphost'
      }),
      map: null,
      auth: null,
      state: '',
      sig: '',
      box: null,
      dark: !!o.dark,
      moved: false,
      fitting: false,
      starting: false,
      failed: false,
      base: 'fast',
      spaces: false,
      reliefOff: false
    },
    base = baseOf(o.base),
    spaces = o.spaces === true,
    sig = signature(feats),
    boxSig = JSON.stringify(feats.box),
    held = !!L.drag?.dragging?.(), // un geste en cours : la vue ne bouge pas sous le doigt (le cadre est repris à la fin du geste)
    reframed = boxSig !== JSON.stringify(L.box);
  L.cb = o;
  L.mode = ['select', 'point', 'route', 'zone', 'object', 'view', 'put'].includes(o.mode) ? o.mode : 'select';
  L.sel = Number.isInteger(o.sel) ? o.sel : -1;
  L.selLabel = o.selLabel || '';
  L.feats = feats;
  if (!held) L.box = feats.box;
  if (base !== L.base) L.reliefOff = false; // un fond redemandé est réessayé
  L.base = base;
  if (spaces !== L.spaces) {
    L.spaces = spaces;
    L.spSig = '';
    if (!spaces) L.zl?.update(null);
    else if (L.map) viewed(L);
  }
  if (L.host.parentNode !== slot) slot.replaceChildren(L.host);
  if (L.map && L.built !== base) return restart(L); // le fond voulu a changé : la carte est refaite dans le même hôte
  if (!L.map) {
    L.sig = sig;
    if (!L.starting && !L.failed && L.host.clientWidth > 0) start(L, o); // repliée (sans taille), elle démarre à son ouverture
    return;
  }
  if (!!o.dark !== L.dark && L.state === 'tiles') L.map.setStyle(styleFor({
    dark: !!o.dark
  })); // le design a changé de ton : le fond suit, les couches du socle reviennent seules
  L.dark = !!o.dark;
  if (sig !== L.sig) L.auth.setFeatures(feats);
  L.sig = sig;
  L.drag?.refresh(); // un geste dont la poignée a disparu est lâché
  mark(L);
  // le repère de la base que la ligne de l'outil dit est marqué sur la carte (la marque d'accroche du retour de geste), hors d'un geste
  const ref = o.ref ? posOf(o.ref.lat, o.ref.lon) : null;
  if (!L.drag?.dragging?.()) {
    if (ref) L.pv?.set({
      snap: ref
    });
    else L.pv?.clear();
  }
  const resized = mapSize(L.map, L.host);
  if ((reframed || resized) && !L.moved && !held) frame(L);
}

/** Cadre la vue sur une zone (le rang de sa ligne), avec une marge : ses sommets ne s'attrapent pas quand elle est petite dans une
 *  mission étendue (l'ergonome, 18 nov. 2026). La vue ne se recadre alors plus seule sur la mission : « Recentrer » y revient. Sans
 *  carte, ou si la ligne n'est pas une zone dessinée : rien. */
export function focus(i) {
  const L = LIVE,
    ring = L?.map ? (L.feats?.polygons || []).find(p => p.id === `place:${i}`)?.rings?.[0] : null;
  if (!ring?.length) return;
  const lats = ring.map(p => p.lat),
    lons = ring.map(p => p.lon);
  L.fitting = true;
  try {
    mapSize(L.map, L.host);
    L.map.fitBounds([
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)]
    ], {
      padding: 70,
      animate: false,
      maxZoom: 15
    });
  } catch {
    /* un cadre que MapLibre refuse : la vue reste où elle est */
  }
  L.fitting = false;
  L.moved = true;
  spread(L);
}

/** Le centre de la vue ({ lat, lon }), pour chercher un repère près de ce que l'auteur regarde ; null sans carte. */
export function centreOf(owner) {
  if (!LIVE || LIVE.owner !== owner || !LIVE.map) return null;
  try {
    const c = LIVE.map.getCenter();
    return posOf(c.lat, c.lng);
  } catch {
    return null;
  }
}

/** Centre la vue sur un repère trouvé par son nom, au zoom des repères au moins (il est alors dessiné, et la base du cadre demandée).
 *  La vue ne se recadre alors plus seule sur la mission : « Recentrer » y revient. → vrai si la vue a bougé. */
export function centre(lat, lon) {
  const L = LIVE,
    at = posOf(lat, lon);
  if (!L?.map || !at) return false;
  L.fitting = true;
  try {
    mapSize(L.map, L.host);
    L.map.jumpTo({
      center: [at.lon, at.lat],
      zoom: Math.max(L.map.getZoom(), MAPB.seekZoom)
    });
  } catch {
    L.fitting = false;
    return false; // une vue que MapLibre refuse : elle reste où elle est
  }
  L.fitting = false;
  L.moved = true;
  spread(L);
  return true;
}

/** « Recentrer » : la vue revient au cadre de la mission, et se recadre de nouveau seule. */
export function fit() {
  if (!LIVE?.map) return;
  LIVE.moved = false;
  mapSize(LIVE.map, LIVE.host);
  frame(LIVE);
}

/** Retire la carte en vie (en quittant l'atelier, au démontage ; `owner` : seulement si c'est la sienne) : ses couches, la carte et son contexte WebGL, son hôte. */
export function stop(owner = null) {
  const L = LIVE;
  if (!L || (owner && L.owner !== owner)) return; // la carte d'une autre séance n'est pas touchée
  LIVE = null;
  keepView(L);
  unmap(L);
  L.host.remove();
}
