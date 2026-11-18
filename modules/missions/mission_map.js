// V3 missions — le bloc « carte de mission » en LECTURE SEULE (SOG-0456 ; EDITOR.md § 7 sexvicies) : la carte de l'atelier
// (editor_map.js, sur le socle de carte de la suite — pas un second moteur) posée dans un autre écran du module, pour LIRE une
// mission : le Brief (module.js) et la liseuse (Affectation des missions). Elle ne dessine que la mission, et seulement ce que le
// pilote peut voir (frame/lib/mission.js `pilotView` : rien d'un tiroir fermé) ; on la déplace et on change son échelle, rien ne
// s'y choisit ni ne s'y pose, rien n'est écrit — ni dans la mission, ni sur l'appareil.
//
// LE CONTRAT (ce que l'écran appelant fait, et rien de plus) :
//   1. il laisse dans son HTML un emplacement vide, à lui : `<div data-msmap></div>` (dans le module Missions) ;
//   2. APRÈS CHAQUE dessin de son écran il appelle readMap(emplacement, { doc, opened, mine, owner, ctx, tt, alive }) :
//        doc    — le document de la mission (le YAML lu, tel quel : une entrée non fiable, bornée ici) ;
//        opened — le NOMBRE de tiroirs ouverts (les n premiers : ils s'ouvrent dans l'ordre) ; 0 au départ, pour le Brief ;
//        mine   — vrai, STRICTEMENT (le booléen), si la mission est la mienne (affectée ou jouée) ; sans lui (absent, « true » en texte, 1,
//                 null) aucun tiroir n'est tenu pour ouvert, quel que soit opened : échec fermé ;
//        owner  — un objet qui dit de quel écran et de quelle mission il s'agit (un autre objet : une carte neuve) ;
//        ctx    — le contexte du module (aerodb pour « Espaces » et les terrains non situés) ; tt — son traducteur ;
//        alive  — () → faux dès que l'écran n'est plus celui-là (la carte en cours de démarrage est abandonnée) ;
//      → vrai si la mission a de quoi être dessinée ; faux sinon (l'emplacement est laissé vide : l'appelant cache sa rubrique) ;
//   3. il appelle stopMap() en quittant l'écran (et au démontage du module) : la carte et son contexte WebGL sont rendus.
//   Le bloc apporte son cadre (300 px de haut ; `--ms-mm-h` sur l'emplacement pour une autre hauteur), son style, sa rangée
//   « Fond : Rapide | Relief », « Espaces » et « Recentrer », et la ligne qui dit ce qui manque. Le fond et la couche de départ
//   sont ceux que l'AUTEUR a choisis (`mission_map` du fichier ; inconnu : Rapide, sans Espaces) ; le pilote les change pour la
//   séance, sur cet écran seulement. Une seule carte de mission vit à la fois dans le module (l'atelier ouvert la remplace).
//   « Ouvrir dans la Carte » n'est PAS dans le bloc : c'est le geste de l'écran appelant.
import * as MS from '../../frame/lib/mission.js';
import * as ED from './editor.js';
import * as EM from './editor_map.js';
import * as TR from './editor_trial.js';
import {
  EDTX
} from './editor_texts.js';

/** Le style du bloc posé hors de l'atelier : son cadre (le filet, la hauteur), puis les règles communes du bloc. */
const READ_CSS = `[data-module="missions"] .ms-mm .ms-atmapframe{position:relative;height:var(--ms-mm-h,300px);overflow:hidden;box-sizing:border-box;border:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-mm .ms-atmapslot{position:absolute;inset:0}
[data-module="missions"] .ms-mm .ms-mmnone{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;margin:0;padding:12px;text-align:center;background:var(--sog-bg,#fff)}
[data-module="missions"] .ms-mm .ms-mmnone[hidden]{display:none}
[data-module="missions"] .ms-mm .ms-atlook .ms-mmfit{margin-left:auto}
${EM.MAP_CSS}`;

let READ = null; // le bloc en lecture posé : { owner, root, o, doc, opened, feats, want, said, tok, ad }

/** Un élément de la page, ses attributs et son texte (jamais de HTML : tout texte passe par textContent). */
function el(tag, attrs = {}, text = '') {
  const x = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, v);
  if (text) x.textContent = text;
  return x;
}

/** Le cadre du bloc et sa rangée, construits une fois par carte ; ses deux écoutes (un toucher, une case) sont les siennes : aucun
 *  de ses boutons ne porte `data-do`, l'écran appelant n'en reçoit rien. */
function build(R) {
  const tt = R.o.tt,
    root = el('div', {
      class: 'ms-mm',
      'data-mm': ''
    }),
    frame = el('div', {
      class: 'ms-atmapframe'
    }),
    look = el('div', {
      class: 'ms-atlook',
      'data-maplook': ''
    }),
    label = el('label'),
    box = el('input', {
      type: 'checkbox',
      'data-mm': 'spaces'
    });
  frame.append(el('div', {
    class: 'ms-atmapslot',
    'data-mmslot': ''
  }), el('p', {
    class: 'f-muted ms-mmnone',
    'data-mmnone': '',
    hidden: ''
  }, tt(EDTX.mmNone)));
  label.append(box, el('span', {}, tt(EDTX.atSpaces)));
  look.append(el('span', {
    class: 'f-muted'
  }, tt(EDTX.atBase)), ...EM.BASES.map(b => el('button', {
    type: 'button',
    'data-mm': 'base',
    'data-base': b
  }, tt(EDTX[`atBase_${b}`]))), label, el('button', {
    type: 'button',
    class: 'ms-mmfit',
    'data-mm': 'fit'
  }, tt(EDTX.atMapFit)), el('small', {
    class: 'f-muted ms-atlooksaid',
    'data-maplooksaid': ''
  }));
  root.append(el('style', {}, READ_CSS), frame, look);
  root.addEventListener('click', ev => {
    const b = ev.target.closest?.('button[data-mm]');
    if (!b || READ !== R) return;
    if (b.dataset.mm === 'fit') return EM.fit();
    if (b.dataset.mm !== 'base') return;
    R.want = {
      ...R.want,
      base: EM.baseOf(b.dataset.base)
    };
    paint(R);
  });
  root.addEventListener('change', ev => {
    if (READ !== R || ev.target.dataset?.mm !== 'spaces') return;
    R.want = {
      ...R.want,
      airspaces: ev.target.checked === true
    };
    R.said = null;
    paint(R);
  });
  return root;
}

/** Ce que le pilote voit de la mission, en éléments de la carte : les lieux que `pilotView` garde avec les `opened` premiers tiroirs
 *  ouverts, la route du départ, la suite de route du dernier tiroir ouvert ; un terrain que le fichier ne situe pas l'est par la
 *  base de la suite quand elle le connaît. */
function featsOf(R) {
  const rows = ED.placesOf(R.doc);
  let mission = null,
    view = null;
  try {
    mission = MS.readMission(R.doc);
    const ids = (mission?.drawers || []).slice(0, R.opened).map(d => d.id);
    view = mission ? MS.pilotView(mission, ids) : null;
  } catch {
    return null; // un fichier que le lecteur refuse : pas de carte
  }
  if (!view) return null;
  const last = (view.drawers || []).filter(Boolean).at(-1); // la vue ne rend que les tiroirs ouverts (SOG-0459)
  return EM.mapFeatures(ED.pilotRows(R.doc, rows, R.opened), {
    zones: R.doc?.zones,
    adPos: name => adPos(R, ED.adCodeOf(name)), // le code d'un terrain quelle que soit la casse écrite (SOG-0469)
    path: TR.pathOf(view),
    onward: (Array.isArray(last?.route) ? last.route : []).map(p => String(p?.id ?? '')).filter(Boolean)
  });
}

/** La position d'un terrain que le fichier ne situe pas, demandée une fois à la base de la suite (bornée) ; à sa réponse la carte
 *  est redessinée. → { lat, lon } ou null. */
function adPos(R, icao) {
  const k = String(icao || '').toUpperCase(),
    a = R.o.ctx?.aerodb;
  if (!/^[A-Z0-9]{4}$/.test(k)) return null;
  if (!R.ad.has(k) && typeof a?.aerodromes === 'function') {
    R.ad.set(k, null);
    Promise.resolve().then(() => a.aerodromes({
      icao: k
    })).then(list => {
      const lat = +list?.[0]?.lat,
        lon = +list?.[0]?.lon;
      if (READ !== R || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
      R.ad.set(k, {
        lat,
        lon
      });
      R.feats = featsOf(R);
      // SOG-0469 : un terrain que seule la base situe — la carte se pose à sa réponse
      if (R.feats?.box && !R.feats.wide && !R.root && R.slot) {
        R.root = build(R);
        R.slot.replaceChildren(R.root);
      }
      paint(R);
    }).catch(() => {});
  }
  return R.ad.get(k) || null;
}

/** Ce que la rangée dit : « Relief » voulu qui n'est pas venu ; pour « Espaces », ce que la vue en montre. */
function saidOf(R) {
  const tt = R.o.tt,
    sp = R.said,
    out = [];
  if (R.want.base === 'relief' && EM.reliefMissing(R.owner)) out.push(tt(EDTX.atReliefOff));
  if (R.want.airspaces && sp) out.push(sp === 'far' ? tt(EDTX.atSpacesFar) : sp === 'nobase' ? tt(EDTX.atSpacesNoBase) : sp.n > 0 ? tt(
    EDTX.atSpacesN, {
      n: sp.n
    }) : tt(EDTX.atSpacesNone));
  return out.join(' ');
}

/** L'état du bloc, dit SUR PLACE (aucun bouton n'est redessiné) : le fond en main, la case, la ligne, la phrase sans carte. */
function mark(R) {
  const q = sel => R.root.querySelector(sel),
    live = EM.stateOf(R.owner),
    said = q('[data-maplooksaid]'),
    text = saidOf(R),
    box = q('input[data-mm=spaces]');
  R.root.dataset.map = live;
  for (const b of R.root.querySelectorAll('button[data-mm=base]')) b.setAttribute('aria-pressed', String(b.dataset.base === R.want.base));
  if (box.checked !== R.want.airspaces) box.checked = R.want.airspaces;
  if (said.textContent !== text) said.textContent = text;
  q('[data-mmnone]').hidden = !R.failed;
  q('button[data-mm=fit]').disabled = !live;
}

/** Les espaces aériens du cadre de la vue (la couche est allumée, la vue vient de s'arrêter) : lus dans la base de la suite par
 *  l'emprise, bornés et triés par le bloc (EM.setSpaces). Une réponse en retard est jetée. */
function spaces(R, v) {
  const a = R.o.ctx?.aerodb,
    tok = R.tok = (R.tok || 0) + 1,
    say = x => {
      R.said = x;
      mark(R);
    };
  if (READ !== R) return;
  if (v?.far) return say('far');
  if (typeof a?.airspaces !== 'function' || !Array.isArray(v?.bbox) || v.bbox.length !== 4) return say('nobase');
  Promise.resolve().then(() => a.airspaces({
    bbox: v.bbox
  })).catch(() => null).then(list => {
    if (READ !== R || R.tok !== tok) return;
    say(Array.isArray(list) ? {
      n: EM.setSpaces(R.owner, list)
    } : 'nobase');
  });
}

/** Pose ou met à jour la carte dans le cadre du bloc : en mode « view » (elle ne fait que montrer), au fond et à la couche voulus. */
function paint(R) {
  if (READ !== R) return;
  R.feats ||= featsOf(R);
  if (R.root && R.feats?.box && !R.feats.wide) { // le cadre large (aucun lieu situé) n'est pas une carte à lire : rien à montrer
    R.look ||= EM.lookOf(R.root);
    EM.show(R.root.querySelector('[data-mmslot]'), R.feats, {
      owner: R.owner,
      dark: R.look.dark,
      colors: R.look.colors,
      mode: 'view',
      base: R.want.base,
      spaces: R.want.airspaces,
      onSpaces: v => spaces(R, v),
      onState: state => {
        if (READ !== R) return;
        R.failed = !state;
        mark(R);
      },
      alive: () => READ === R && R.o.alive()
    });
  }
  mark(R);
}

/** Pose le bloc dans `slot` (voir LE CONTRAT en tête) ; à rappeler après chaque dessin de l'écran ; `o.mine` doit être `true` (le booléen) pour que `o.opened` compte, sinon aucun tiroir n'est ouvert — le bloc déjà posé est remis dans
 *  l'emplacement neuf, la carte n'est pas refaite. → vrai si la mission a de quoi être dessinée. */
export function readMap(slot, o) {
  if (!slot || !o || typeof o.tt !== 'function' || typeof o.alive !== 'function' || !o.owner) return false;
  const opened = o.mine === true && Number.isInteger(o.opened) && o.opened > 0 ? Math.min(o.opened, 12) : 0; // `mine` strict : échec fermé
  if (READ && READ.owner !== o.owner) stopMap();
  const R = READ ||= {
    owner: o.owner,
    o,
    doc: null,
    opened: -1,
    feats: null,
    want: MS.mapLook(o.doc?.mission_map),
    said: null,
    failed: false,
    ad: new Map()
  };
  R.o = o;
  R.slot = slot;
  if (R.doc !== o.doc || R.opened !== opened) {
    R.doc = o.doc;
    R.opened = opened;
    R.feats = null;
  }
  R.feats ||= featsOf(R);
  // aucun lieu situé que le pilote puisse voir (ni la base pour un terrain) : pas de carte, l'emplacement reste vide
  if (!R.feats?.box || R.feats.wide) {
    if (slot.firstChild) slot.replaceChildren();
    return false;
  }
  R.root ||= build(R);
  if (R.root.parentNode !== slot) slot.replaceChildren(R.root);
  paint(R);
  return true;
}

/** Retire le bloc et sa carte (en quittant l'écran, au démontage du module). La carte d'un atelier ouvert entre-temps n'est pas
 *  touchée. */
export function stopMap() {
  const R = READ;
  READ = null;
  if (!R) return;
  if (EM.stateOf(R.owner) || R.root) EM.stop(R.owner);
  R.root?.remove();
}
