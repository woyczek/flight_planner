// V3 maps — points de report VFR d'un terrain (modules/maps/SPEC.md § 16) : survol d'un terrain (souris) : aperçu de ses
// points de report et de ses séquences ; toucher : épinglé, son contenu dans la feuille (points, séquences en texte, consignes
// des VAC repliées par page), jusqu'à ✕, Échap ou un autre terrain ; en mode VFR, départ et arrivée montrés d'office (dessin
// seul). Données : aerodb.vrp (base publiée) et aerodb.vfrRoutes (sia/vfr/<OACI>.json, candidats tirés des VAC, toujours en
// tirets et marqués « à vérifier »).

import {
  S,
  esc,
  tt,
  dLon,
  nmTxt
} from './state.js';
import {
  unwrapLons
} from '../../frame/lib/geo.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  openData,
  endData
} from './sheet_view.js';
import {
  cardHtml
} from './procs.js';
import {
  covCard
} from './coverage.js';
import {
  hideTips,
  followTip,
  hoverHtml,
  linger,
  stay
} from './tips.js';

// Survol d'un terrain (souris) : aperçu de ses points de report et de ses séquences ; toucher : épinglé, avec son contenu dans le bloc de données
// (séquences en texte, consignes des VAC repliées par page), jusqu'à ✕, Échap ou un autre terrain ; en mode VFR, départ et
// arrivée épinglés d'office (dessin seul). Données : aerodb.vfrRoutes (sia/vfr/<OACI>.json), candidats tirés des VAC,
// toujours en tirets et marqués « à vérifier », jamais un itinéraire publié ni un sens de parcours.
const VFR_COL = '#00897b'; // séquences et tracés tirés des VAC (les points de report : MapsRender.vrpColor)
/** Terrain dessiné sous (x, y), à 22 px près (une cible de doigt) ; null sinon. */
export function adAt(x, y) {
  let best = null,
    bd = 22;
  for (const h of S.adHits || []) {
    const d = Math.hypot(h.x - x, h.y - y);
    if (d <= bd && h.a?.icao) {
      bd = d;
      best = h.a;
    }
  }
  return best;
}
/** Point de report sous (x, y), à 22 px près, plus proche qu'un terrain : { ad (le terrain à épingler, ou null), code,
 *  name, id } ; null sinon. Points surlignés d'un terrain (leur terrain est connu), puis ceux de la couche des VRP (le
 *  terrain de leur préfixe, « BD- » pour LFBD, à 30 NM au plus, sinon le plus proche à 5 NM). */
function vrpAt(x, y) {
  const d = h => Math.hypot(h.x - x, h.y - y),
    a = adAt(x, y),
    da = a ? d((S.adHits || []).find(h => h.a === a)) : Infinity,
    hl = (S.vfrHits || []).filter(h => d(h) <= 22).sort((p, q) => d(p) - d(q))[0],
    ly = (S.vrpHits || []).filter(h => d(h) <= 22).sort((p, q) => d(p) - d(q))[0],
    best = [hl && [d(hl), hl], ly && [d(ly), ly]].filter(Boolean).sort((p, q) => p[0] - q[0])[0];
  if (!best || best[0] >= da) return null;
  const h = best[1];
  if (h.icao) return {
    ad: h.icao,
    id: h.p.id,
    code: h.p.code,
    name: h.p.name
  };
  const v = h.v,
    nm = (p, q) => Math.hypot(+p.lat - +q.lat, dLon(+p.lon, +q.lon) * Math.cos(+p.lat * Math.PI / 180)) * 60,
    ads = [...(S.adHits || []).map(x => x.a), ...(S.data?.data?.aerodromes || [])].filter(x => /^[A-Z]{4}$/.test(x?.icao || '')),
    pre = String(v.id).split('-')[0],
    own = ads.filter(x => x.icao.slice(2) === pre && nm(x, v) <= 30).sort((p, q) => nm(p, v) - nm(q, v))[0],
    near = ads.filter(x => nm(x, v) <= 5).sort((p, q) => nm(p, v) - nm(q, v))[0],
    ad = own || near;
  return {
    ad: ad?.icao || null,
    adRec: ad || null,
    id: v.id,
    code: String(v.id).startsWith(`${pre}-`) ? String(v.id).slice(pre.length + 1).replace(/^H-/, '') : v.id,
    name: v.name || ''
  };
}
/** Toucher d'un point de report : son terrain épinglé (le point en tête de sa liste), ou, sans terrain, l'infobulle du
 *  point seul. Vrai si traité. */
export function vrpTap(x, y) {
  const t = vrpAt(x, y);
  if (!t) return false;
  const a = t.adRec || (S.adHits || []).find(h => h.a.icao === t.ad)?.a || (S.data?.data?.aerodromes || []).find(x => x.icao === t.ad) || (
    t.ad ? {
      icao: t.ad,
      ...adPos(t.ad)
    } : null);
  if (!a || !Number.isFinite(+a.lat)) {
    stay('map');
    followTip(S.tipEl, S.box, x, y, hoverHtml([t.code, t.name].filter(Boolean).join(' '), ''));
    linger('map');
    return true;
  }
  pinAd(a, t.id);
  return true;
}
/** Position d'un terrain : celle de la carte (terrains dessinés, données lues), sinon celle des points de la route. */
function adPos(icao) {
  const a = (S.adHits || []).find(h => h.a.icao === icao)?.a || (S.data?.data?.aerodromes || []).find(x => x.icao === icao) || (S.route
    ?.points || []).find(p => p.id === icao);
  return a && Number.isFinite(+a.lat) && Number.isFinite(+a.lon) ? {
    lat: +a.lat,
    lon: +a.lon,
    name: a.name || ''
  } : null;
}
/** Points de report de la base publiée pour un terrain (aerodb.vrp) : ceux dont l'identifiant porte son préfixe
 *  (« MN- » pour LFMN), à 30 NM au plus ; à défaut, ceux à moins de 15 NM. Lus une fois par terrain ; [{ id, code, name,
 *  lat, lon }] ; undefined pendant la lecture. */
function baseVrpOf(icao) {
  const m = S.vrpBase ||= new Map();
  if (m.has(icao)) return m.get(icao);
  const at = adPos(icao);
  if (!at) return [];
  m.set(icao, undefined);
  Promise.resolve(S.ctx.aerodb?.vrp?.({
    lat: at.lat,
    lon: at.lon,
    radiusNm: 30
  })).then(list => {
    if (!S) return;
    const pre = `${icao.slice(2)}-`,
      nm = v => Math.hypot(+v.lat - at.lat, dLon(+v.lon, at.lon) * Math.cos(at.lat * Math.PI / 180)) * 60,
      all = MapsRender.dedupeVrp((list || []).filter(v => v?.id)),
      own = all.filter(v => v.id.startsWith(pre)),
      rows = (own.length ? own : all.filter(v => nm(v) <= 15)).map(v => ({
        id: v.id,
        // code tel que l'écrit la VAC : « HE » pour MN-H-HE (la couleur dit l'hélicoptère)
        code: (v.id.startsWith(pre) ? v.id.slice(pre.length) : MapsRender.vrpCode(v.id)).replace(/^H-/, ''),
        name: v.name || '',
        lat: +v.lat,
        lon: +v.lon
      })).sort((x, y) => x.code.localeCompare(y.code));
    m.set(icao, rows);
    schedule();
    if (S.vfrPin === icao && S.vfrCard) pinView(icao);
  }, () => S && m.set(icao, []));
  return undefined;
}
/** Compilation VAC d'un terrain (aerodb.vfrRoutes ; lue une fois par terrain ; null sans import) ; redessin à l'arrivée. */
function vfrOf(icao) {
  const m = S.vfr ||= new Map();
  if (!m.has(icao)) {
    m.set(icao, undefined);
    Promise.resolve(S.ctx.aerodb?.vfrRoutes?.(icao)).then(v => {
      if (!S) return;
      m.set(icao, v || null);
      schedule();
      if (S.vfrPin === icao && S.vfrCard) pinView(icao);
    }, () => S && m.set(icao, null));
  }
  return m.get(icao);
}
/** Séquences d'un terrain, une fois chacune (même suite, même page : tableau bilingue, plusieurs pistes). */
const seqsOf = v => [...new Map((v?.routes || []).map(r => [`${r.key || ''}|${r.codes.join('-')}|${pagesOf(r).join(',')}`, r])).values()];
/** Pages de la VAC d'une séquence (format 2 : pages ; format 1 : page). */
const pagesOf = r => Array.isArray(r.pages) ? r.pages : r.page ? [r.page] : [];
/** Points de report de la compilation (sans le point de référence du terrain ni les sommets de tracé de l'analyse). */
const reportOf = v => (v?.points || []).filter(p => !p.role || p.role === 'reporting_point');
/** Points de report d'un terrain à montrer, une ligne par code (sans casse ni espaces) : ceux de la base, puis ceux des
 *  VAC qui n'y sont pas ; chacun avec ses restrictions lues dans les VAC. [{ id, code, name, lat, lon, restrictions,
 *  vacNm }]. « Bug LFQN. Points de report VFR doublonnés » (25 octobre 2026) : la base SIA publiait chaque point deux fois
 *  (« QT-N » décrit, « N » nu : dedupeVrp, à la lecture de la base) et rien ne rapprochait un point des VAC dont le code
 *  est le même mais la position un peu différente.
 *  Ordre de préférence quand une source double l'autre : la description la plus riche (celle qui n'est pas égale au code :
 *  la base ; les VAC n'en ont pas), la position de la base SIA (publiée) sur celle des VAC (lue sur une carte, à vérifier),
 *  l'identifiant préfixé de la base (couleur avion / hélicoptère). Si la position des VAC en diffère de plus de 0,5 NM,
 *  la ligne le dit (vacNm), sans seconde ligne ni seconde étiquette sur la carte. */
function reportPoints(icao) {
  const base = baseVrpOf(icao) || [],
    vac = reportOf(vfrOf(icao)),
    ids = new Set(base.map(b => b.id)),
    nm = (a, b) => Math.hypot(+a.lat - +b.lat, dLon(+a.lon, +b.lon) * Math.cos(+a.lat * Math.PI / 180)) * 60,
    key = MapsRender.vrpNorm,
    // points des VAC d'un même code : une fois (le fichier peut porter la table des points et les étiquettes de la carte),
    // les restrictions réunies, le point rapproché de la base (vrp) de préférence
    byCode = new Map();
  for (const p of vac) {
    const k = key(p.code),
      q = byCode.get(k);
    if (!q) byCode.set(k, {
      ...p,
      restrictions: [...(p.restrictions || [])]
    });
    else {
      for (const r of p.restrictions || [])
        if (!q.restrictions.includes(r)) q.restrictions.push(r);
      if (!q.vrp && p.vrp) q.vrp = p.vrp;
    }
  }
  // VRP de la base d'un point VAC : son identifiant rapproché à l'import ; sinon celui de même code, le plus proche, à 5 NM
  // au plus (la VAC et la base placent le point à quelques centaines de mètres l'un de l'autre, et le préfixe de la base
  // n'est pas toujours celui du terrain : LFQN → « QT-N ») ; sinon le plus proche à 0,6 NM au plus, un code écrit autrement
  // (une compilation importée avant le rapprochement des points hélicoptères)
  const near = (p, f, max) => base.filter(f).map(b => [b, nm(b, p)]).filter(([, d]) => d <= max).sort((a, b) => a[1] - b[1])[0]?.[0],
    twin = p => (p.vrp && ids.has(p.vrp) ? base.find(b => b.id === p.vrp) : null) || near(p, b => key(b.code) === key(p.code), 5) || near(p,
      () => true,
      .6),
    byId = new Map(),
    extra = [];
  for (const p of byCode.values()) {
    const t = twin(p);
    if (t && !byId.has(t.id)) byId.set(t.id, p);
    else if (!t) extra.push(p);
  }
  return [...base.map(b => {
    const p = byId.get(b.id),
      d = p ? nm(b, p) : 0;
    return {
      ...b,
      // un nom égal au code n'est pas une description
      name: key(b.name) === key(b.code) ? '' : b.name,
      vacCode: p?.code || '',
      restrictions: p?.restrictions || [],
      vacNm: d > .5 ? Math.round(d * 10) / 10 : 0
    };
  }), ...extra.map(p => ({
    id: p.vrp || `${icao.slice(2)}-${p.code}`,
    code: p.code,
    name: '',
    lat: +p.lat,
    lon: +p.lon,
    restrictions: p.restrictions,
    vacNm: 0
  }))];
}
/** Ligne d'état d'un terrain : ses points de report, et les séquences VAC (ou « non importées »). */
function adCounts(icao) {
  const v = vfrOf(icao),
    n = reportPoints(icao).length;
  return [tt(TX.vfrBaseCount, {
    n
  }), v ? tt(TX.vfrSeqCount, {
    r: seqsOf(v).length
  }) : v === null ? tt(TX.vfrNoVac) : ''].filter(Boolean).join(' · ');
}
/** Aperçu au survol (un terrain, ou null) ; redessin seulement s'il change. */
export function previewAd(icao) {
  if ((S.vfrPreview || null) === icao) return;
  S.vfrPreview = icao;
  if (icao) {
    vfrOf(icao);
    baseVrpOf(icao);
  }
  schedule();
}
/** Infobulle de survol d'un terrain : son code, son nom, ses points de report et ses séquences VAC. */
export function adHover(a, x, y) {
  stay('map');
  followTip(S.tipEl, S.box, x, y, hoverHtml([a.icao, a.name].filter(Boolean).join(' '), tt(TX.vfrHover, {
    c: adCounts(a.icao)
  })));
}
/** Terrain épinglé (toucher) : surbrillance gardée et son contenu dans le bloc de données. */
export function pinAd(a, focus = null) {
  hideTips();
  S.vfrPin = a.icao;
  S.vfrCard = {
    name: a.name || '',
    lat: +a.lat,
    lon: +a.lon,
    focus // identifiant du point de report touché : en tête de la liste, en gras
  };
  vfrOf(a.icao);
  baseVrpOf(a.icao);
  pinView(a.icao);
  schedule();
}
/** Terrain épinglé : la carte se rapproche de ses points de report s'ils sont serrés à l'écran (moins de 160 px ; c'est
 *  le geste de l'utilisateur, la caméra reste ensuite la sienne), et son contenu s'ouvre dans le bloc de données
 *  (« … » tant que la base ou la compilation sont en lecture). */
function pinView(icao) {
  const c = S.vfrCard;
  if (!c) return;
  if (S.vfrZoomed === icao || baseVrpOf(icao) === undefined || vfrOf(icao) === undefined || !S.map) return showAdCard(icao);
  S.vfrZoomed = icao; // une seule fois par épinglage
  // un terrain près de la ligne de changement de date : points d'un seul tenant, sur la copie du monde de la vue
  const un = unwrapLons([...reportPoints(icao), ...(vfrOf(icao)?.points || []).filter(p => p.role === 'intermediate_waypoint'), c].filter(
      p => Number.isFinite(+p.lat) && Number.isFinite(+p.lon))),
    ro = un.length ? 360 * Math.round((S.map.getCenter().lng - un[0].lon) / 360) : 0,
    pts = ro ? un.map(p => ({
      ...p,
      lon: +p.lon + ro
    })) : un;
  if (pts.length < 2) return showAdCard(icao);
  const px = pts.map(p => S.map.project([+p.lon, +p.lat])),
    span = Math.max(Math.max(...px.map(q => q.x)) - Math.min(...px.map(q => q.x)), Math.max(...px.map(q => q.y)) - Math.min(...px.map(q =>
      q.y)));
  if (span >= 160) return showAdCard(icao);
  // le contenu du terrain est dans le bloc de données, sous la carte : le cadrage prend toute la carte (sous les boutons du
  // haut, à droite des modes et des couches)
  showAdCard(icao);
  S.map.fitBounds([
    [Math.min(...pts.map(p => +p.lon)), Math.min(...pts.map(p => +p.lat))],
    [Math.max(...pts.map(p => +p.lon)), Math.max(...pts.map(p => +p.lat))]
  ], {
    padding: {
      top: 56,
      bottom: 40,
      left: 64,
      right: 40
    },
    maxZoom: 11,
    duration: 500
  });
}

/** Contenu du terrain épinglé refait (une réponse arrivée : couverture des procédures, textes de ses raisons). */
export function refreshAdCard() {
  if (S?.vfrPin && S.vfrCard) pinView(S.vfrPin);
}
/** Terrain relâché (la surbrillance s'arrête) ; le bloc de données n'est pas touché. */
export function releaseAd() {
  if (!S.vfrPin) return;
  S.vfrPin = null;
  S.vfrCard = null;
  S.vfrZoomed = null;
  schedule();
}
/** Contenu du terrain fermé (✕, Échap, un autre contenu) : le terrain est relâché et le profil vertical revient. */
export function unpinAd() {
  endData('ad');
  releaseAd();
}
/** Contenu d'un terrain épinglé, dans le bloc de données (à la place du profil vertical) : ses points de report (base
 *  publiée, couleur avion ou hélicoptère, nom long), puis, si la compilation VAC est importée, l'analyse, les séquences,
 *  les points restreints, les sommets manuels et les consignes repliées par page ; sinon « séquences VAC : non
 *  importées ». */
function showAdCard(icao) {
  const v = vfrOf(icao),
    base = baseVrpOf(icao),
    c = S.vfrCard;
  if (!c) return;
  // en-tête : « LFBD : points de report VFR » (le nom du terrain va en infobulle de l'en-tête, il ferait tronquer le titre sur un téléphone)
  const title = tt(TX.vfrTitle, {
      ad: icao
    }),
    label = tt(TX.vfrTitle, {
      ad: [icao, c.name].filter(Boolean).join(' ')
    }),
    page = p => p ? ` <span class="f-muted">(${esc(tt(TX.vfrPage, { p }))})</span>` : '',
    pts = (l => c.focus ? [...l.filter(p => p.id === c.focus), ...l.filter(p => p.id !== c.focus)] : l)(reportPoints(icao)),
    heli = pts.some(p => MapsRender.vrpRotary(p.id)),
    dot = p => `<i class="mp-vfr-dot" style="background:${MapsRender.vrpColor(p.id)}"></i>`;
  let body = '';
  if (base === undefined || v === undefined) body = '<p class="f-muted">…</p>';
  else {
    body = pts.length ? `<div><b>${esc(tt(TX.vfrPoints, { n: pts.length }))}</b>${heli ? ` <span class="f-muted">${esc(tt(TX.vfrLegend))}</span>` : ''}</div><ul class="mp-vfr-pts">${pts.map(p => `<li${p.id === c.focus ? ' class="mp-vfr-focus"' : ''}>${dot(p)}<b style="color:${MapsRender.vrpColor(p.id)}">${esc(p.code)}</b> ${esc(p.name)}${p.vacNm ? ` <span class="f-muted">(${esc(tt(TX.vfrVacOff, { n: nmTxt(p.vacNm) }))})</span>` : ''}${p.restrictions.length ? ` <span class="mp-vfr-warn">(${esc(p.restrictions.join(' ; '))})</span>` : ''}</li>`).join('')}</ul>` : `<p class="f-muted">${esc(tt(TX.vfrNone))}</p>`;
    if (!v) body += `<p class="f-muted">${esc(tt(TX.vfrNoVac))}</p>`;
    else {
      const pages = ps => ps.length > 1 ? ` <span class="f-muted">(${esc(tt(TX.vfrPages, { p: ps.join(', ') }))})</span>` : page(ps[0]),
        seqs = seqsOf(v),
        part = seqs.some(r => r.fragment),
        A = v.analysis || {},
        st = TX.vfrStatus[A.status],
        // conditions lues par l'analyse : altitude par défaut, visibilité minimale ; le reste est dans les consignes
        cond = r => {
          const k = r.conditions || {},
            a = k.defaultAltitude,
            vis = Array.isArray(k.minVisibilityMByLeg) ? Math.max(...k.minVisibilityMByLeg.filter(Number.isFinite)) : null;
          return [r.runways?.length ? tt(TX.vfrRunways, {
            r: r.runways.join(', ')
          }) : '', a?.value ? tt(TX.vfrAlt, {
            a: `${a.value} ${a.unit || 'ft'} ${a.reference || ''}`.trim()
          }) : '', Number.isFinite(vis) && vis > 0 ? tt(TX.vfrVis, {
            v: vis
          }) : '', r.direction === 'forward' ? tt(TX.vfrOneWay) : ''].filter(Boolean).join(' · ');
        },
        item = r => {
          const k = cond(r);
          return `<li>${r.key ? `<b>${esc(r.key)}</b> : ` : ''}${esc(r.codes.join(' – '))}${pages(pagesOf(r))}${k ? `<br><span>${esc(k)}</span>` : ''}${r.omission ? `<br><span class="f-muted">${esc(r.omission)}</span>` : ''}</li>`;
        },
        manual = (v.points || []).filter(p => p.role === 'intermediate_waypoint'),
        accs = manual.map(p => p.accuracyM).filter(Number.isFinite),
        man = manual.length ? `<p class="f-muted">${esc(accs.length === manual.length ? tt(TX.vfrAccuracy, { n: manual.length, m: Math.max(...accs) }) : tt(TX.vfrManual, { n: manual.length }))}</p>` : '';
      body += `<p class="mp-vfr-warn">${esc(tt(TX.vfrLabel))}</p>${st ? `<p><b>${esc(tt(st, { s: tt(TX.vfrScope[A.scope] || TX.vfrScope.partial) }))}</b></p>` : ''}${A.notes?.length ? `<ul class="mp-vfr-seq">${A.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}${seqs.length ? `<div><b>${esc(tt(TX.vfrSeqCount, { r: seqs.length }))}</b>${part ? ` <span class="f-muted">${esc(tt(TX.vfrPart))}</span>` : ''}</div><ul class="mp-vfr-seq">${seqs.map(item).join('')}</ul>` : ''}${man}${v.notes?.length ? `<div><b>${esc(tt(TX.vfrNotes))}</b></div>${v.notes.map(n => `<details class="mp-vfr-note"><summary>${esc(n.title || tt(TX.vfrPage, { p: n.page }))}${page(n.page)}</summary><div>${esc(n.text)}</div></details>`).join('')}` : ''}`;
    }
  }
  // piste et procédures choisies dans Carburant pour ce terrain (départ ou arrivée du vol), avec « Changer » ; la Carte ne les écrit jamais
  body = cardHtml(icao) + covCard(icao) + body;
  openData('ad', `ad:${icao}`, title, () => body, label);
}
/** VRP de la base que la surbrillance dessine (terrains montrés) : la couche des VRP ne les redessine pas. */
export function vfrVrpIds() {
  const out = new Set();
  for (const icao of vfrShown())
    for (const b of baseVrpOf(icao) || []) out.add(b.id);
  return out;
}
/** Terrains montrés : l'aperçu, l'épinglé, et en mode VFR le départ et l'arrivée. */
function vfrShown() {
  const out = new Set([S.vfrPreview, S.vfrPin].filter(Boolean));
  if (S.preset === 'vfr') {
    const pts = S.route?.points || [];
    for (const p of [pts[0], pts[pts.length - 1]])
      if (/^[A-Z]{4}$/.test(p?.id || '')) out.add(p.id);
  }
  return out;
}
/** Surbrillance des terrains montrés : séquences et tracés VAC en tirets (sarcelle), sommets manuels en petits points,
 *  points de report cerclés et nommés (avions en noir, hélicoptères en vert ; usage restreint : cercle tireté),
 *  « VAC, à vérifier » près du terrain quand la compilation est là. */
export function drawVfr(ctx, toC) {
  const ads = vfrShown();
  S.vfrHits = [];
  if (!ads.size) return;
  ctx.save();
  ctx.lineJoin = 'round';
  for (const icao of ads) {
    const v = vfrOf(icao),
      pts = reportPoints(icao);
    if (v) {
      // points de la compilation ; le terrain lui-même (son code, « AD ») n'est jamais relié : une intégration non
      // numérisée n'est pas remplacée par une droite vers son centre
      const at = new Map(v.points.filter(p => p.role !== 'aerodrome_reference_point' && p.code !== 'AD').map(p => [p.code, p]));
      ctx.strokeStyle = VFR_COL;
      ctx.lineWidth = 1.6;
      for (const r of v.routes) {
        // tracé de l'analyse (tirets longs), sinon tirets courts entre les points de report connus
        const line = r.geometry?.length > 1 ? r.geometry.map(([la, lo]) => toC(la, lo)) : null;
        ctx.setLineDash(line ? [10, 4] : [6, 4]);
        ctx.beginPath();
        let pen = false,
          last = null,
          prev = null;
        for (const q of line || r.codes.map(c => at.get(c)).map(p => p ? toC(+p.lat, +p.lon) : null)) {
          if (!q) {
            pen = false;
            continue;
          }
          pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
          if (pen)[prev, last] = [last, q];
          else last = q;
          pen = true;
        }
        ctx.stroke();
        // sens unique lu par l'analyse : une flèche au bout du tracé
        if (r.direction === 'forward' && prev && last) {
          const a = Math.atan2(last.y - prev.y, last.x - prev.x);
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(last.x - 9 * Math.cos(a - .45), last.y - 9 * Math.sin(a - .45));
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(last.x - 9 * Math.cos(a + .45), last.y - 9 * Math.sin(a + .45));
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      // sommets de tracé de l'analyse : ni points de report, ni noms
      ctx.fillStyle = VFR_COL;
      for (const p of v.points.filter(p => p.role === 'intermediate_waypoint')) {
        const q = toC(+p.lat, +p.lon);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.font = '700 11px Arial,sans-serif';
    ctx.textBaseline = 'middle';
    for (const p of pts) {
      const q = toC(p.lat, p.lon),
        col = MapsRender.vrpColor(p.id),
        name = p.code; // sur la carte, le code court seul (lisibilité) ; le nom long est dans l'infobulle et dans le bloc de données
      ctx.beginPath();
      ctx.arc(q.x, q.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = MapsRender.withAlpha(col, .12);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      if (p.restrictions.length) ctx.setLineDash([3, 2]); // usage restreint : cercle tireté (le bloc de données dit lequel)
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = S.theme.bg;
      ctx.lineWidth = 3;
      ctx.strokeText(name, q.x + 10, q.y);
      ctx.fillStyle = col;
      ctx.fillText(name, q.x + 10, q.y);
      S.vfrHits.push({
        x: q.x,
        y: q.y,
        p,
        icao
      });
    }
    const ad = v && adPos(icao);
    if (ad) {
      const q = toC(ad.lat, ad.lon),
        t = tt(TX.vfrMap);
      ctx.font = 'italic 600 10px Arial,sans-serif';
      ctx.strokeStyle = S.theme.bg;
      ctx.lineWidth = 3;
      ctx.strokeText(t, q.x + 10, q.y + 14);
      ctx.fillStyle = VFR_COL;
      ctx.fillText(t, q.x + 10, q.y + 14);
    }
  }
  ctx.restore();
}
