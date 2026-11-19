// V3 missions — l'enveloppe et la liseuse de MA mission (SOG-0441, lot T3) : l'écran et ses gestes. Les pages sont calculées par
// reader.js (pur) ; ce fichier ne lit ni n'écrit aucun document : drawers_view.js lui donne ce qu'il montre (la mission passée par
// pilotView, les états des tiroirs, ma ligne d'affectation) et le geste « lu » (onRead, qui écrit `read_at` dans MON carnet).
//
// L'écran suit la maquette acceptée par l'ergonome le 18/11 (notes partagées, affectation_T3_maquette_liseuse.html) :
//   · « Lire la mission » dans la rangée des actions de la fiche, à côté de « Préparer ce vol » (posé ici dans .ms-actions : la rangée
//     est dessinée par module.js, qui n'a rien à savoir de la liseuse) ;
//   · l'ENVELOPPE, une fois, pour une mission AFFECTÉE pas encore lue : « Ouvrir l'enveloppe » la note comme lue ;
//   · la LISEUSE à la place de la fiche et du détail : une page à la fois sur un écran étroit, deux côte à côte sur un module large
//     (850 px, le seuil de la fiche) ; « ‹ Page n sur N › », les flèches du clavier, le glissé ; « ← Fiche » y revient.
// Un tiroir fermé n'a ni page, ni titre, ni compte ; la page d'un tiroir ouvert n'a que son titre, jamais son rang (SOG-0459, § 7.4). Quand un tiroir s'ouvre
// pendant la lecture, sa page s'ajoute à la fin (la fiche est redessinée, attach est rappelé).
//
// API : attach(sheet, { ctx, id, view, states, line, unread, how, routeNm, onRead }) — à rappeler à chaque dessin de la fiche de MA
//   mission (sheet : l'élément .ms-sheet) ; how(state, drawer) → « ouvert …, à … » (drawers_view.js describe) ; onRead() → promesse,
//   vraie quand « lu » est écrit. detach() — la fiche se ferme ou la mission n'est pas la mienne. TX : les textes, quatre langues.

import * as R from './reader.js';
import {
  fmtZ
} from '../../frame/lib/time.js';

export const TX = {
  read: ['Lire la mission', 'Read the mission', 'Mission lesen', 'Leer la misión'],
  back: ['← Fiche', '← Sheet', '← Blatt', '← Ficha'],
  // l'enveloppe
  envelope: ['Enveloppe de la mission, fermée', 'Mission envelope, closed', 'Umschlag der Mission, geschlossen',
    'Sobre de la misión, cerrado'
  ],
  envFor: ['Pour {who}', 'For {who}', 'Für {who}', 'Para {who}'],
  envOff: ['décollage {t}', 'take-off {t}', 'Start {t}', 'despegue {t}'],
  envOpen: ['Ouvrir l\'enveloppe', 'Open the envelope', 'Umschlag öffnen', 'Abrir el sobre'],
  envNote: ['Votre ordre de mission. L\'ouvrir le note comme lu dans votre carnet de mission.',
    'Your mission order. Opening it marks it as read in your mission record.',
    'Ihr Missionsauftrag. Das Öffnen vermerkt ihn in Ihrem Missionsheft als gelesen.',
    'Su orden de misión. Abrirla la marca como leída en su cuaderno de misión.'
  ],
  // les pages
  kOrder: ['Ordre de mission', 'Mission order', 'Missionsauftrag', 'Orden de misión'],
  kBrief: ['Description et objectifs', 'Description and objectives', 'Beschreibung und Ziele', 'Descripción y objetivos'],
  kRoute: ['Route fournie', 'Provided route', 'Vorgegebene Route', 'Ruta proporcionada'],
  mission: ['Mission', 'Mission', 'Mission', 'Misión'],
  pilot: ['Pour', 'For', 'Für', 'Para'],
  takeoff: ['Décollage', 'Take-off', 'Start', 'Despegue'],
  departure: ['Départ', 'Departure', 'Abflug', 'Salida'],
  arrival: ['Arrivée', 'Arrival', 'Ankunft', 'Llegada'],
  aircraft: ['Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
  level: ['Niveau', 'Level', 'Flughöhe', 'Nivel'],
  speed: ['Vitesse', 'Speed', 'Geschwindigkeit', 'Velocidad'],
  distance: ['Distance', 'Distance', 'Strecke', 'Distancia'],
  points: ['Points', 'Points', 'Punkte', 'Puntos'],
  objPrimary: ['Objectif principal', 'Primary objective', 'Hauptziel', 'Objetivo principal'],
  objSecondary: ['Objectifs secondaires', 'Secondary objectives', 'Nebenziele', 'Objetivos secundarios'],
  onward: ['Suite de route : {r}', 'Onward route: {r}', 'Weitere Route: {r}', 'Continuación de la ruta: {r}'],
  onMap: ['Voir sur la Carte', 'See on the Map', 'Auf der Karte ansehen', 'Ver en el Mapa'],
  prepare: ['Préparer ce vol', 'Prepare this flight', 'Diesen Flug vorbereiten', 'Preparar este vuelo'],
  // le pied : « Page 1 sur 4 », « Pages 3 et 4 sur 4 »
  page: ['Page {a} sur {n}', 'Page {a} of {n}', 'Seite {a} von {n}', 'Página {a} de {n}'],
  pages: ['Pages {a} et {b} sur {n}', 'Pages {a} and {b} of {n}', 'Seiten {a} und {b} von {n}', 'Páginas {a} y {b} de {n}'],
  prev: ['Page précédente', 'Previous page', 'Vorherige Seite', 'Página anterior'],
  next: ['Page suivante', 'Next page', 'Nächste Seite', 'Página siguiente']
};

const STYLE = `[data-module="missions"] .ms-sheet[data-reading]{display:block}
[data-module="missions"] .ms-sheet[data-reading]>.ms-first,[data-module="missions"] .ms-sheet[data-reading]>.ms-detail{display:none}
[data-reader]{display:flex;flex-direction:column;gap:12px;outline:0}
[data-reader] .rd-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
[data-reader] .rd-t{flex:1;min-width:0;overflow-wrap:anywhere}
[data-reader] .rd-envwrap{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:24px 0}
[data-reader] .rd-env{position:relative;width:min(300px,100%);height:190px;border:1px solid var(--sog-border);background:var(--sog-bg)}
[data-reader] .rd-env::before{content:"";position:absolute;inset:0;background:linear-gradient(to bottom right,transparent calc(50% - 1px),var(--sog-border) 50%,transparent calc(50% + 1px)) top left/50% 55% no-repeat,linear-gradient(to bottom left,transparent calc(50% - 1px),var(--sog-border) 50%,transparent calc(50% + 1px)) top right/50% 55% no-repeat}
[data-reader] .rd-seal{position:absolute;left:50%;top:55%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:var(--sog-accent)}
[data-reader] .rd-lab{position:absolute;left:14px;right:14px;bottom:10px;text-align:left;font-size:var(--sog-size-s);overflow-wrap:anywhere}
[data-reader] .rd-lab b{display:block}
[data-reader] .rd-envwrap small{max-width:300px}
[data-reader] .rd-pages{display:flex;justify-content:center;touch-action:pan-y}
[data-reader] .rd-page{flex:1;min-width:0;max-width:36em;min-height:22em;max-height:calc(100dvh - 15em);overflow:auto;display:flex;flex-direction:column;padding:18px 18px 12px;border:1px solid var(--sog-border);background:var(--sog-bg)}
[data-reader] .rd-page+.rd-page{border-left:0}
[data-reader] .rd-kick{font-size:var(--sog-size-xs);font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sog-muted)}
[data-reader] .rd-page h3{margin:2px 0 10px;overflow-wrap:anywhere}
[data-reader] .rd-page p{margin:0 0 10px;white-space:pre-wrap;overflow-wrap:anywhere}
[data-reader] .rd-page ul,[data-reader] .rd-page ol{margin:0 0 10px;padding-left:1.3em}
[data-reader] .rd-msg{border-left:3px solid var(--sog-border);padding-left:10px}
[data-reader] .rd-page dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;margin:0 0 10px}
[data-reader] .rd-page dt{color:var(--sog-muted)}
[data-reader] .rd-page dd{margin:0;overflow-wrap:anywhere}
[data-reader] .rd-links{display:flex;flex-wrap:wrap;gap:6px 16px}
[data-reader] .rd-foot{margin-top:auto;padding-top:8px;display:flex;justify-content:space-between;gap:12px;font-size:var(--sog-size-s);color:var(--sog-muted)}
[data-reader] .rd-pager{display:flex;align-items:center;justify-content:center;gap:14px}
[data-reader] .rd-pager button{min-width:48px;min-height:var(--sog-touch,44px)}`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`),
  WIDE = 850, // deux pages côte à côte à partir de cette largeur du module (le seuil de la fiche en deux colonnes)
  SWIPE = 50, // un glissé horizontal d'au moins 50 px tourne la page
  LAST = new Map(); // la dernière page lue par mission, tant que la page de la suite reste ouverte (en mémoire seulement)
let A = null; // ce qui est posé : { sheet, o (les options d'attach), on, env, page, pages, closed, ro }

/** La liseuse se ferme, ou la mission n'est pas la mienne : le bouton et la liseuse sont retirés, l'écoute de la largeur arrêtée. */
export function detach() {
  if (!A) return;
  A.ro?.disconnect();
  A.sheet?.querySelector('[data-rd-read]')?.remove();
  A.sheet?.querySelector('[data-reader]')?.remove();
  A.sheet?.removeAttribute('data-reading');
  A = null;
}

/** Pose « Lire la mission » dans la rangée des actions de la fiche et, si elle est ouverte, la liseuse à la place de la fiche (voir
 *  l'en-tête). À rappeler à chaque dessin : l'élément de la fiche est neuf, l'état (ouverte, la page) est gardé pour la même mission. */
export function attach(sheet, o = {}) {
  if (!sheet || !o.ctx || !o.id) return detach();
  const same = !!A && A.o.id === o.id;
  if (A && A.sheet !== sheet) A.ro?.disconnect();
  A = {
    sheet,
    o,
    on: same ? A.on : false,
    env: same ? A.env : false,
    page: same ? A.page : LAST.get(o.id) || 0,
    busy: false,
    html: A && A.sheet === sheet && same ? A.html : '', // ce qui est déjà dessiné dans cette fiche : redessiné seulement s'il change
    ro: A && A.sheet === sheet ? A.ro : null
  };
  if (!document.getElementById('rdStyle')) {
    const st = document.createElement('style');
    st.id = 'rdStyle';
    st.textContent = STYLE;
    document.head.append(st);
  }
  if (!sheet.dataset.rdBound) {
    sheet.dataset.rdBound = '1';
    sheet.addEventListener('click', onClick);
    sheet.addEventListener('keydown', onKey);
    sheet.addEventListener('touchstart', onTouch, {
      passive: true
    });
    sheet.addEventListener('touchend', onTouch, {
      passive: true
    });
  }
  // « Lire la mission » : à côté de « Préparer ce vol », une fois par dessin de la fiche
  const row = sheet.querySelector('.ms-actions'),
    slot = sheet.querySelector('[data-actslot]'),
    first = row?.querySelector('[data-do="prepare"]');
  if (row && !row.querySelector('[data-rd-read]')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.rdRead =
      ''; // sans identifiant : la fiche d'une mission sans tiroir et celle d'une mission aux tiroirs fermés ont le même HTML
    b.textContent = tt(TX.read);
    if (slot) slot.prepend(b); // la place que module.js donne aux gestes de la section : « Lire la mission » en tête
    else if (first) first.after(b);
    else row.prepend(b);
  }
  const rb = slot?.querySelector(':scope > [data-rd-read]');
  if (rb && slot.firstElementChild !== rb) slot.prepend(rb); // toujours en tête, même si « Demander la suite » est arrivé après

  // la largeur du module décide d'une ou de deux pages : redessinée quand elle passe le seuil
  if (!A.ro && typeof ResizeObserver === 'function') {
    const a = A;
    a.ro = new ResizeObserver(() => A === a && a.on && !a.env && two(a) !== a.two && paint());
    a.ro.observe(sheet);
  }
  paint();
}

/** Un texte de TX dans la langue du cadre. */
const tt = (row, vars) => A.o.ctx.t(row, vars);
/** Deux pages côte à côte ? La largeur du module (celle que mesure la requête de conteneur de la fiche). */
const two = a => (a.sheet.closest('[data-module]') || a.sheet).clientWidth >= WIDE;

/** Une ligne de liste de définitions, rien sans valeur. */
const dl = (k, v) => v ? `<dt>${esc(tt(k))}</dt><dd>${esc(v)}</dd>` : '';
/** Un nombre écrit dans la langue du cadre (« 1 500 »). */
const num = n => {
  try {
    return new Intl.NumberFormat(A.o.ctx.lang?.() || 'fr').format(n);
  } catch {
    return String(n);
  }
};

/** Le corps d'une page (voir reader.js pour ce qu'elle porte). Tout texte de la mission passe par esc. */
function bodyHtml(p) {
  if (p.kind === 'order') return `<span class="rd-kick">${esc(tt(TX.kOrder))}</span><h3>${esc(p.title)}</h3>
    <dl>${dl(TX.mission, p.mission.join(' · '))}${dl(TX.pilot, p.pilot.join(' · '))}${p.takeoff ? dl(TX.takeoff, [fmtZ(p.takeoff), p.departure].filter(Boolean).join(', ')) : dl(TX.departure, p.departure)}${dl(TX.arrival, p.arrival)}${dl(TX.aircraft, p.aircraft.join(', '))}</dl>
    ${p.summary ? `<p data-rd-summary>${esc(p.summary)}</p>` : ''}`;
  if (p.kind === 'brief') return `<span class="rd-kick">${esc(tt(TX.kBrief))}</span>
    ${p.details.map(x => `<p>${esc(x)}</p>`).join('')}${p.notes.length ? `<ul>${p.notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${p.primary ? `<p><b>${esc(tt(TX.objPrimary))}</b><br>${esc(p.primary)}</p>` : ''}
    ${p.secondary.length ? `<p><b>${esc(tt(TX.objSecondary))}</b></p><ul>${p.secondary.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
  if (p.kind === 'route') return `<span class="rd-kick">${esc(tt(TX.kRoute))}</span><h3>${esc([p.departure, p.arrival].filter(Boolean).join(' → '))}</h3>
    <dl>${dl(TX.departure, p.departure)}${dl(TX.arrival, p.arrival)}${dl(TX.level, p.levelFt ? `${num(p.levelFt)} ft` : '')}${dl(TX.speed, p.speedKt ? `${num(p.speedKt)} kt` : '')}${dl(TX.distance, p.nm ? `${num(Math.round(p.nm))} NM` : '')}</dl>
    ${p.turns.length ? `<p><b>${esc(tt(TX.points))}</b></p><ol data-rd-turns>${p.turns.map(x => `<li>${esc([x.id, x.name].filter(Boolean).join(' · '))}</li>`).join('')}</ol>` : ''}
    <p class="rd-links"><a class="f-linkbtn" data-rd-map href="?app=pilot#maps?mission=${encodeURIComponent(A.o.id)}">${esc(tt(TX.onMap))}</a><a class="f-linkbtn" data-rd-prepare href="#fuel?mission=${encodeURIComponent(A.o.id)}">${esc(tt(TX.prepare))}</a></p>`;
  const how = A.o.how?.(p.state, p) || '';
  return `<h3>${esc(p.title)}</h3>
    ${how ? `<p class="f-muted" data-rd-how>${esc(how)}</p>` : ''}
    ${p.message ? `<p class="rd-msg" data-rd-msg>${esc(p.message)}</p>` : ''}
    ${p.brief ? `<p data-rd-brief>${esc(p.brief)}</p>` : ''}
    ${p.onward.length ? `<p class="f-muted" data-rd-onward>${esc(tt(TX.onward, { r: p.onward.join(' → ') }))}</p>` : ''}`;
}

/** Redessine la liseuse (ou la retire) dans la fiche posée. */
function paint() {
  const a = A;
  if (!a?.sheet) return;
  const old = a.sheet.querySelector('[data-reader]');
  a.sheet.toggleAttribute('data-reading', a.on);
  if (!a.on) {
    old?.remove();
    a.html = '';
    return;
  }
  const o = a.o,
    head = `<div class="rd-top"><button type="button" class="f-linkbtn" data-rd-back>${esc(tt(TX.back))}</button><b class="rd-t">${esc([o.id, o.view?.title].filter(Boolean).join(' '))}</b></div>`,
    box = document.createElement('section');
  let html;
  box.className = 'rd';
  box.dataset.reader = o.id;
  box.tabIndex = -1;
  if (a.env) {
    // l'enveloppe : la mission, pour qui, quand — rien de son contenu
    const l = o.line || {},
      who = [l.pilot, l.callsign].filter(Boolean).join(' · '),
      sub = [who ? tt(TX.envFor, {
        who
      }) : '', l.takeoff ? tt(TX.envOff, {
        t: fmtZ(l.takeoff)
      }) : ''].filter(Boolean).join(' · ');
    html = `${head}<div class="rd-envwrap" data-rd-env><div class="rd-env" role="img" aria-label="${esc(tt(TX.envelope))}"><span class="rd-seal"></span><div class="rd-lab"><b>${esc([o.id, o.view?.title].filter(Boolean).join(' · '))}</b>${esc(sub)}</div></div>
      <button type="button" class="primary" data-rd-open>${esc(tt(TX.envOpen))}</button><small class="f-muted">${esc(tt(TX.envNote))}</small></div>`;
  } else {
    const {
      pages,
      closed
    } = R.pagesOf(o.view, o), n = pages.length;
    a.two = two(a);
    const sp = R.spreadOf(a.page, n, a.two);
    a.page = sp.from;
    a.count = n;
    LAST.set(o.id, a.page);
    const shown = pages.slice(sp.from, sp.to + 1),
      where = sp.to > sp.from ? tt(TX.pages, {
        a: sp.from + 1,
        b: sp.to + 1,
        n
      }) : tt(TX.page, {
        a: sp.from + 1,
        n
      });
    box.toggleAttribute('data-rd-two', a.two);
    // aucun compte des tiroirs fermés : même le fait qu'il y en ait est caché (SOG-0459)
    html = `${head}<div class="rd-pages" data-rd-pages>${shown.map((p, i) => `<article class="rd-page" data-rd-page="${p.kind}"${p.kind === 'drawer' ? ` data-rd-drawer="${esc(p.id)}"` : ''}>${bodyHtml(p)}
      <div class="rd-foot"><span data-rd-n>${sp.from + i + 1} / ${n}</span></div></article>`).join('')}</div>
      <div class="rd-pager"><button type="button" data-rd-prev aria-label="${esc(tt(TX.prev))}"${sp.prev === null ? ' disabled' : ''}>‹</button><span data-rd-where>${esc(where)}</span><button type="button" data-rd-next aria-label="${esc(tt(TX.next))}"${sp.next === null ? ' disabled' : ''}>›</button></div>`;
    a.prev = sp.prev;
    a.next = sp.next;
  }
  // la même page qu'au dessin d'avant, dans la même fiche : rien n'est touché (le défilement d'une longue page et le focus restent)
  if (old && a.html === html) return;
  old?.remove();
  a.html = html;
  box.innerHTML = html;
  a.sheet.append(box);
}

/** Tourne la page : -1 la précédente, +1 la suivante ; rien au bout. */
function turn(dir) {
  const a = A,
    to = a && a.on && !a.env ? (dir < 0 ? a.prev : a.next) : null;
  if (to === null || to === undefined) return;
  a.page = to;
  paint();
  a.sheet.querySelector('[data-reader]')?.focus({
    preventScroll: true
  });
}

/** Les gestes : « Lire la mission », « Ouvrir l'enveloppe », « ← Fiche », les flèches du pied. */
async function onClick(e) {
  const a = A,
    b = e.target.closest?.('[data-rd-read],[data-rd-open],[data-rd-back],[data-rd-prev],[data-rd-next]');
  if (!a || !b || !a.sheet.contains(b)) return;
  e.stopPropagation();
  if (b.dataset.rdRead !== undefined) {
    a.on = true;
    a.env = !!a.o.unread; // une mission affectée pas encore lue : son enveloppe d'abord
    paint();
    return void a.sheet.querySelector('[data-reader]')?.focus({
      preventScroll: true
    });
  }
  if (b.dataset.rdBack !== undefined) {
    a.on = false;
    a.env = false;
    return paint();
  }
  if (b.dataset.rdOpen !== undefined) {
    if (a.busy) return;
    a.busy = true;
    // « lu » s'écrit dans MON carnet ; un refus est dit par celui qui écrit, l'enveloppe reste fermée
    const ok = await Promise.resolve().then(() => a.o.onRead?.()).catch(() => false);
    if (A?.o.id !== a.o.id) return;
    A.busy = false;
    if (!ok) return;
    A.env = false;
    A.page = 0;
    paint();
    return void A.sheet.querySelector('[data-reader]')?.focus({
      preventScroll: true
    });
  }
  turn(b.dataset.rdPrev !== undefined ? -1 : 1);
}

/** Les flèches du clavier tournent la page quand la liseuse a le focus. */
function onKey(e) {
  if (!A?.on || A.env || !e.target.closest?.('[data-reader]') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    turn(e.key === 'ArrowLeft' ? -1 : 1);
  }
}

/** Le glissé horizontal sur les pages tourne la page (vers la gauche : la suivante). */
function onTouch(e) {
  const a = A,
    t = e.changedTouches?.[0];
  if (!a?.on || a.env || !t || !e.target.closest?.('[data-rd-pages]')) return;
  if (e.type === 'touchstart') {
    a.touch = {
      x: t.clientX,
      y: t.clientY
    };
    return;
  }
  const s = a.touch;
  a.touch = null;
  if (!s) return;
  const dx = t.clientX - s.x,
    dy = t.clientY - s.y;
  if (Math.abs(dx) >= SWIPE && Math.abs(dx) > 2 * Math.abs(dy)) turn(dx < 0 ? 1 : -1);
}
