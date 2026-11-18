// V3 missions — « Affecter… » dans la fiche d'une mission (SOG-0443) : l'écran et ses gestes. Le calcul est dans assign.js (pur) ; ce
// fichier lit et écrit par le cadre (ctx.data) UN document, missions/affectations.json — relu à chaque écriture, la ligne de SA clé
// remplacée ou ajoutée, toutes les autres gardées telles quelles. Il lit aussi la liste des chemins de pilot/ (les trigrammes qui ont
// un dossier de pilote), jamais un fichier de pilote.
//
// L'écran (la maquette acceptée du 18/11, aux deux retouches près : pas de ligne d'aide sous un champ ; trigrammes, date et heure,
// notifications par les blocs déjà là) :
//   · « Affecter… » : un bouton posé PAR LE DOM dans la place [data-actslot] de la rangée des actions de la fiche, en queue (après
//     « Demander la suite » s'il y est), pour TOUTE mission lue, au niveau Courant et au-delà (ctx.level ≥ 2) ; retiré par stop() ;
//     hors d'une fiche (pas de .ms-sheet ni de place) : rien ;
//   · « Affecter cette mission » prend la place de la fiche (l'attribut data-assigning sur .ms-sheet : la première page cachée au
//     téléphone, le détail à côté d'elle sur un module large) : en tête les affectations NON annulées de cette mission (« Retirer »),
//     puis Pilote, Indicatif, Décollage (UTC), Aéronef, « Affecter » et « Annuler » — sept éléments au plus ;
//     « ← Fiche » (au téléphone) et « Annuler » le referment ;
//   · un conflit (le même pilote sur une autre mission à moins de deux heures) est DIT au premier « Affecter » par une notification
//     flottante « warn » (aucun encadré dans la page : la règle des avertissements), jamais bloquant : un
//     second « Affecter » écrit.
// Celui qui affecte ne voit de la mission que sa partie VISIBLE (pilotView, mine: false) : rien d'un tiroir n'entre dans le formulaire
// ni dans la ligne écrite (titre, terrain de départ, types de la mission).
//
// API : show(host, { ctx, id, mission }) — host : l'élément [data-drawers] de la fiche (drawers_view.js show l'appelle à chaque dessin,
//   pour toute mission lue) ; stop() — la fiche se ferme, le module se démonte (drawers_view.js stop). TX : les textes, quatre langues.

import * as A from './assign.js';
import {
  fmtZ
} from '../../frame/lib/time.js'; // l'heure de la suite, « 20:00Z »
import {
  pilotView
} from '../../frame/lib/mission.js'; // la partie visible de la mission (SOG-0448) : la règle du lecteur, écrite une fois

export const TX = {
  open: ['Affecter…', 'Assign…', 'Zuweisen…', 'Asignar…'],
  head: ['Affecter cette mission', 'Assign this mission', 'Diese Mission zuweisen', 'Asignar esta misión'],
  listHead: ['Affectations de cette mission', 'Assignments of this mission', 'Zuweisungen dieser Mission', 'Asignaciones de esta misión'],
  pilot: ['Pilote', 'Pilot', 'Pilot', 'Piloto'],
  callsign: ['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'],
  takeoff: ['Décollage (UTC)', 'Take-off (UTC)', 'Start (UTC)', 'Despegue (UTC)'],
  date: ['Date du décollage (UTC)', 'Take-off date (UTC)', 'Startdatum (UTC)', 'Fecha del despegue (UTC)'],
  time: ['Heure du décollage (UTC)', 'Take-off time (UTC)', 'Startzeit (UTC)', 'Hora del despegue (UTC)'],
  aircraft: ['Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
  type: ['Type de l\'aéronef', 'Aircraft type', 'Luftfahrzeugmuster', 'Tipo de aeronave'],
  registration: ['immatriculation (facultative)', 'registration (optional)', 'Kennzeichen (optional)', 'matrícula (opcional)'],
  go: ['Affecter', 'Assign', 'Zuweisen', 'Asignar'],
  cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
  remove: ['Retirer', 'Remove', 'Entfernen', 'Retirar'],
  back: ['← Fiche', '← Sheet', '← Blatt', '← Ficha'],
  more: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  lineOff: ['décollage {t}', 'take-off {t}', 'Start {t}', 'despegue {t}'],
  // un conflit dit par une notification « warn », jamais bloquant
  conflict: ['{p} a déjà une mission à cette heure : {m}, décollage {t}. Vous pouvez affecter quand même.',
    '{p} already has a mission at this time: {m}, take-off {t}. You can assign anyway.',
    '{p} hat zu dieser Zeit bereits eine Mission: {m}, Start {t}. Sie können trotzdem zuweisen.',
    '{p} ya tiene una misión a esta hora: {m}, despegue {t}. Puede asignar de todos modos.'
  ],
  // les notifications flottantes
  done: ['{p} est affecté à {m}, décollage {t}.', '{p} is assigned to {m}, take-off {t}.', '{p} ist {m} zugewiesen, Start {t}.',
    '{p} está asignado a {m}, despegue {t}.'
  ],
  updated: ['{p} : affectation mise à jour', '{p}: assignment updated', '{p}: Zuweisung aktualisiert', '{p}: asignación actualizada'],
  removed: ['{p} n\'est plus affecté à {m}.', '{p} is no longer assigned to {m}.', '{p} ist {m} nicht mehr zugewiesen.',
    '{p} ya no está asignado a {m}.'
  ],
  // ce que dit « Affecter » d'un champ vide ou refusé (une notification « warn »)
  badPilot: ['Pilote : un trigramme de trois lettres.', 'Pilot: a trigram of three letters.', 'Pilot: ein Trigramm aus drei Buchstaben.',
    'Piloto: un trigrama de tres letras.'
  ],
  badCallsign: ['Indicatif : de 2 à 12 lettres, chiffres ou tirets.', 'Callsign: 2 to 12 letters, digits or hyphens.',
    'Rufzeichen: 2 bis 12 Buchstaben, Ziffern oder Bindestriche.', 'Indicativo: de 2 a 12 letras, cifras o guiones.'
  ],
  badTakeoff: ['Décollage : une date et une heure UTC.', 'Take-off: a date and a UTC time.', 'Start: ein Datum und eine UTC-Uhrzeit.',
    'Despegue: una fecha y una hora UTC.'
  ],
  badType: ['Aéronef : un type de la mission.', 'Aircraft: a type of the mission.', 'Luftfahrzeug: ein Muster der Mission.',
    'Aeronave: un tipo de la misión.'
  ],
  badRegistration: ['Immatriculation : jusqu\'à 10 lettres, chiffres ou tirets.', 'Registration: up to 10 letters, digits or hyphens.',
    'Kennzeichen: bis zu 10 Buchstaben, Ziffern oder Bindestriche.', 'Matrícula: hasta 10 letras, cifras o guiones.'
  ],
  // le fichier ne se réécrit pas (une notification « err ») : rien n'est écrit
  badFile: ['Le fichier des affectations est illisible : rien n\'a été écrit.',
    'The assignments file cannot be read: nothing was written.',
    'Die Datei der Zuweisungen ist unlesbar: nichts wurde geschrieben.',
    'El archivo de asignaciones es ilegible: no se ha escrito nada.'
  ],
  bigFile: ['Le fichier des affectations a plus de 2 000 lignes : rien n\'a été écrit.',
    'The assignments file has more than 2,000 lines: nothing was written.',
    'Die Datei der Zuweisungen hat mehr als 2 000 Zeilen: nichts wurde geschrieben.',
    'El archivo de asignaciones tiene más de 2 000 líneas: no se ha escrito nada.'
  ],
  gone: ['Cette affectation n\'est plus dans le fichier.', 'This assignment is no longer in the file.',
    'Diese Zuweisung ist nicht mehr in der Datei.', 'Esta asignación ya no está en el archivo.'
  ],
  noWrite: ['L\'affectation n\'a pas pu être enregistrée : {e}', 'The assignment could not be saved: {e}',
    'Die Zuweisung konnte nicht gespeichert werden: {e}', 'No se pudo guardar la asignación: {e}'
  ],
  noTrigram: ['Aucun trigramme sur cet appareil : rien n\'a été écrit.', 'No trigram on this device: nothing was written.',
    'Kein Trigramm auf diesem Gerät: nichts wurde geschrieben.', 'Ningún trigrama en este dispositivo: no se ha escrito nada.'
  ]
};

// le formulaire prend la place de la fiche : au téléphone la première page (et le Détail) cachés ; sur un module large (le seuil de la
// fiche, 850 px) la première page reste à gauche et le formulaire prend la colonne du Détail. « [data-pane] » : plus précis que les
// règles de la fiche (module.js STYLE, posé après ce style dans la page)
const STYLE = `[data-module="missions"] [data-pane="mission"].ms-sheet[data-assigning] .ms-first,
[data-module="missions"] [data-pane="mission"].ms-sheet[data-assigning] .ms-detail{display:none}
[data-as-open]{min-height:var(--sog-touch,44px);white-space:nowrap}
[data-module="missions"] .ms-assign{min-width:0}
[data-module="missions"] .ms-asbar{display:flex;align-items:center;gap:8px;min-height:44px;border-bottom:1px solid var(--sog-border);margin:0 0 8px}
[data-module="missions"] .ms-asbar>b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="missions"] .ms-assign>h2{font-size:1rem;margin:4px 0 8px}
[data-module="missions"] .ms-aslist{border-top:1px solid var(--sog-border);padding:6px 0 0;margin:0 0 6px}
[data-module="missions"] .ms-aslist>h3{font-size:var(--sog-size-s,.875rem);margin:0 0 2px}
[data-module="missions"] .ms-asline{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:var(--sog-size-s,.875rem)}
[data-module="missions"] .ms-asline>span{min-width:0;overflow-wrap:anywhere}
[data-module="missions"] .ms-asfields{display:grid;column-gap:14px}
[data-module="missions"] .ms-asrow{display:flex;gap:8px}
[data-module="missions"] .ms-asrow>*{flex:1 1 0;min-width:0}
[data-module="missions"] .ms-asrow>input[type="time"]{flex:0 0 7em}
[data-module="missions"] .ms-asrow>select{flex:0 0 7em} /* le type (« EC25 ») étroit : l'immatriculation et son texte indicatif ont la place */
[data-module="missions"] [data-as="registration"]::placeholder{font-size:var(--sog-size-s,.875rem)}
[data-module="missions"] .ms-asacts{margin:4px 0 0}
@container (min-width: 850px){
  [data-module="missions"] [data-pane="mission"].ms-sheet[data-assigning] .ms-first{display:block}
  [data-module="missions"] .ms-asbar{display:none}
  [data-module="missions"] .ms-asfields{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  [data-module="missions"] .ms-asfields>.f-field:last-child{grid-column:1/-1} /* l'Aéronef sur toute la largeur : « immatriculation (facultative) » entière */
}`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`),
  PATH = 'missions/affectations.json', // le seul document écrit
  SEVEN = 7; // lignes d'affectation montrées avant « {n} autres »
const TYPE = /^[A-Z0-9]{2,8}$/; // un type d'aéronef de la mission (la règle de assigned.js)
const BAD = {
  pilot: TX.badPilot,
  callsign: TX.badCallsign,
  takeoff: TX.badTakeoff,
  type: TX.badType,
  registration: TX.badRegistration
};
let W = null; // le formulaire d'une fiche : une à la fois

/** Ce que celui qui affecte voit de la mission : sa partie VISIBLE (pilotView, mine: false) — l'identifiant de la fiche, le titre, le
 *  terrain de départ (son OACI) et les types d'aéronef, rien d'un tiroir. null pour une mission illisible. */
function visibleOf(id, mission) {
  const v = pilotView(mission, [], {
    mine: false
  });
  if (!v || typeof id !== 'string') return null;
  const types = [];
  for (const a of (Array.isArray(v.aircraft) ? v.aircraft : []).slice(0, 20)) {
    const t = typeof a?.type === 'string' ? a.type.trim().toUpperCase() : '';
    if (TYPE.test(t) && !types.includes(t)) types.push(t);
  }
  return {
    id,
    title: typeof v.title === 'string' ? v.title : '',
    departure: typeof v.origin?.icao === 'string' ? v.origin.icao : '',
    types
  };
}

/** La fiche se ferme ou le module se démonte : le bouton et le formulaire retirés, la fiche rendue à elle-même. */
export function stop() {
  if (!W) return;
  W.btn?.remove();
  W.box?.remove();
  W.sheet?.removeAttribute('data-assigning');
  W = null;
}

/** Pose « Affecter… » dans la rangée de la fiche (et le formulaire s'il était ouvert) : à chaque dessin de la fiche (voir l'en-tête). */
export function show(host, {
  ctx,
  id,
  mission
} = {}) {
  const sheet = host?.closest?.('.ms-sheet') || null,
    slot = sheet?.querySelector('[data-actslot]') || null,
    vis = ctx && sheet && slot && Number(ctx.level) >= 2 ? visibleOf(id, mission) : null;
  if (!vis) return stop();
  if (!W || W.id !== vis.id || W.ctx !== ctx) {
    stop();
    W = {
      ctx,
      id: vis.id,
      open: false,
      vals: null, // les valeurs des champs, gardées d'un dessin à l'autre
      lines: [], // les affectations listées (listOf)
      pilots: [], // les trigrammes proposés
      warned: '', // « pilote|décollage » du conflit déjà dit : un second « Affecter » écrit
      busy: false
    };
  }
  W.mission = vis;
  W.sheet = sheet;
  W.tt = (row, v) => ctx.t(row, v);
  if (!document.getElementById('asStyle')) {
    const st = document.createElement('style');
    st.id = 'asStyle';
    st.textContent = STYLE;
    document.head.append(st);
  }
  let b = slot.querySelector(':scope > [data-as-open]');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-as-open', '');
  }
  slot.append(b); // en queue de la place, après « Demander la suite » (posé en tête par drawers_view.js)
  if (W.btn && W.btn !== b) W.btn.remove();
  W.btn = b;
  b.textContent = W.tt(TX.open);
  b.onclick = onOpen;
  b.setAttribute('aria-expanded', W.open ? 'true' : 'false');
  if (W.open) paint(true);
}

/** Les valeurs des champs du formulaire posé (un formulaire déjà retiré de la page se lit encore). */
function readForm(box) {
  const v = k => box?.querySelector(`[data-as="${k}"]`)?.value ?? '';
  return {
    pilot: v('pilot'),
    callsign: v('callsign'),
    date: v('date'),
    time: v('time'),
    type: v('type'),
    registration: v('registration')
  };
}

/** Les champs vides, le type gardé (après « Affecter ») ; à l'ouverture, aujourd'hui à l'heure ronde suivante (UTC), le premier type. */
const fresh = (w, keepType = null) => ({
  pilot: '',
  callsign: '',
  ...(keepType === null ? A.defaultTakeoff(Date.now()) : {
    date: '',
    time: ''
  }),
  type: keepType ?? w.mission.types[0] ?? '',
  registration: ''
});

/** « Affecter… » touché : le formulaire prend la place de la fiche ; les affectations de la mission et les trigrammes sont lus. */
function onOpen(e) {
  const w = W;
  e?.stopPropagation?.();
  if (!w) return;
  Object.assign(w, {
    open: true,
    vals: fresh(w),
    warned: ''
  });
  w.btn?.setAttribute('aria-expanded', 'true');
  paint(false);
  w.sheet.scrollIntoView?.({
    block: 'start'
  });
  refresh(w);
}

/** Referme le formulaire (« ← Fiche », « Annuler ») : la fiche revient, rien n'est écrit. */
function close(w) {
  w.open = false;
  w.box?.remove();
  w.box = null;
  w.sheet?.removeAttribute('data-assigning');
  w.btn?.setAttribute('aria-expanded', 'false');
  w.btn?.focus?.();
}

/** Relit le fichier des affectations (les lignes de la mission) et la liste des dossiers de pilote, puis redessine. */
async function refresh(w) {
  const data = w.ctx.data,
    [doc, paths] = await Promise.all([Promise.resolve().then(() => data.get(PATH)).catch(() => null),
      Promise.resolve().then(() => data.list?.('pilot/')).catch(() => null)
    ]);
  if (W !== w || !w.open) return;
  w.lines = A.listOf(doc, w.id);
  w.pilots = A.trigramsOf(paths);
  paint(true);
}

/** Le texte d'une affectation listée : « ABC · TEST31 · décollage 20:00Z · EC25 F-TEST ». */
function lineText(w, l) {
  return [l.tri, l.callsign, l.takeoff ? w.tt(TX.lineOff, {
    t: fmtZ(l.takeoff)
  }) : '', [l.type, l.registration].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}

/** Le formulaire (voir l'en-tête) ; tout texte venu du fichier ou de la mission passe par esc. */
function formHtml(w) {
  const v = w.vals || fresh(w),
    tt = w.tt,
    row = (l, i) => `<div class="ms-asline" data-as-line="${i}"><span>${esc(lineText(w, l))}</span><button type="button" class="f-linkbtn" data-as-remove="${i}">${esc(tt(TX.remove))}</button></div>`,
    rows = w.lines.map(row),
    list = rows.length ? `<div class="ms-aslist" data-as-list><h3>${esc(tt(TX.listHead))}</h3>${rows.slice(0, SEVEN).join('')}${rows.length > SEVEN ? `<details class="ms-more"><summary class="f-muted">${esc(tt(TX.more, { n: rows.length - SEVEN }))}</summary>${rows.slice(SEVEN).join('')}</details>` : ''}</div>` : '',
    types = w.mission.types.length ? w.mission.types.map(t => `<option value="${esc(t)}"${t === v.type ? ' selected' : ''}>${esc(t)}</option>`).join('') : '<option value="">—</option>';
  return `<div class="ms-asbar"><button type="button" class="f-linkbtn" data-as-back>${esc(tt(TX.back))}</button><b>${esc([w.id, w.mission.title].filter(Boolean).join(' '))}</b></div>
    <h2>${esc(tt(TX.head))}</h2>${list}
    <div class="ms-asfields">
    <label class="f-field"><span>${esc(tt(TX.pilot))}</span><input data-as="pilot" list="asPilots" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(v.pilot)}"></label>
    <label class="f-field"><span>${esc(tt(TX.callsign))}</span><input data-as="callsign" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(v.callsign)}"></label>
    <div class="f-field" role="group" aria-label="${esc(tt(TX.takeoff))}"><span>${esc(tt(TX.takeoff))}</span><div class="ms-asrow"><input type="date" data-as="date" aria-label="${esc(tt(TX.date))}" value="${esc(v.date)}"><input type="time" data-as="time" aria-label="${esc(tt(TX.time))}" value="${esc(v.time)}"></div></div>
    <div class="f-field" role="group" aria-label="${esc(tt(TX.aircraft))}"><span>${esc(tt(TX.aircraft))}</span><div class="ms-asrow"><select data-as="type" aria-label="${esc(tt(TX.type))}">${types}</select><input data-as="registration" maxlength="10" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(tt(TX.registration))}" aria-label="${esc(tt(TX.registration))}" value="${esc(v.registration)}"></div></div>
    </div><datalist id="asPilots">${w.pilots.map(p => `<option value="${esc(p)}"></option>`).join('')}</datalist>
    <div class="f-row ms-asacts"><button type="button" class="primary" data-as-go>${esc(tt(TX.go))}</button><button type="button" data-as-cancel>${esc(tt(TX.cancel))}</button></div>`;
}

/** Pose (ou repose) le formulaire dans la fiche ; `keep` : les valeurs tapées sont relues avant (un dessin ne les efface pas). */
function paint(keep) {
  const w = W;
  if (!w?.open || !w.sheet) return;
  if (keep && w.box) w.vals = readForm(w.box);
  const box = document.createElement('section');
  box.className = 'ms-assign';
  box.setAttribute('data-assign', '');
  box.innerHTML = formHtml(w);
  box.addEventListener('click', onClick);
  w.box?.remove();
  w.box = box;
  w.sheet.append(box);
  w.sheet.setAttribute('data-assigning', '');
}

/** Les gestes du formulaire : « ← Fiche », « Annuler », « Affecter », « Retirer ». */
function onClick(e) {
  const w = W,
    b = e.target.closest?.('[data-as-back],[data-as-cancel],[data-as-go],[data-as-remove]');
  if (!w || !b || !w.box?.contains(b)) return;
  e.stopPropagation();
  if (b.hasAttribute('data-as-go')) return void submit(w);
  if (b.hasAttribute('data-as-remove')) return void withdraw(w, +b.dataset.asRemove);
  close(w);
}

/** Relit le fichier pour une écriture : { doc } ou rien (la raison dite par une notification « err »). */
async function reread(w) {
  let doc;
  try {
    doc = await w.ctx.data.get(PATH);
  } catch (e) {
    w.ctx.notify?.(w.tt(TX.noWrite, {
      e: String(e?.message || e).slice(0, 120)
    }), 'err');
    return null;
  }
  const r = A.readIndex(doc);
  if (!r.ok) {
    w.ctx.notify?.(w.tt(r.why === 'size' ? TX.bigFile : TX.badFile), 'err');
    return null;
  }
  return {
    doc
  };
}

/** Écrit le fichier par le cadre ; faux (et une notification « err ») si l'écriture est refusée. */
async function put(w, doc) {
  try {
    await w.ctx.data.put(PATH, doc);
    // les autres appareils (le pilote affecté) le liront à leur synchronisation : un passage demandé tout de suite (drawers_view.js)
    Promise.resolve().then(() => w.ctx.data.sync?.()).catch(() => {});
    return true;
  } catch (e) {
    w.ctx.notify?.(w.tt(TX.noWrite, {
      e: String(e?.message || e).slice(0, 120)
    }), 'err');
    return false;
  }
}

/** « Affecter » : la saisie validée (sinon une notification « warn » dit le champ), le fichier relu, le conflit dit une fois, puis la
 *  ligne de SA clé écrite ; la liste se met à jour, les champs se vident (le type gardé), une notification « ok ». */
async function submit(w) {
  if (w.busy) return;
  const c = A.check(readForm(w.box), {
    types: w.mission.types
  });
  if (!c.ok) return void w.ctx.notify?.(w.tt(BAD[c.why]), 'warn');
  const by = A.meOf(w.ctx.identity?.trigram);
  if (!by) return void w.ctx.notify?.(w.tt(TX.noTrigram), 'err');
  w.busy = true;
  try {
    const got = await reread(w);
    if (!got || W !== w) return;
    const v = c.value,
      sig = `${v.pilot}|${v.takeoff}`,
      conf = A.conflictOf(got.doc, {
        mission: w.id,
        pilot: v.pilot,
        takeoff: v.takeoff
      });
    if (conf && w.warned !== sig) { // dit par une notification « warn », jamais bloquant : le second « Affecter » écrit
      w.warned = sig;
      return void w.ctx.notify?.(w.tt(TX.conflict, {
        p: v.pilot,
        m: conf.mission,
        t: fmtZ(conf.takeoff)
      }), 'warn');
    }
    const now = Date.now(),
      line = A.lineOf(w.mission, v, {
        by,
        now
      }),
      out = line ? A.withLine(got.doc, line, now) : {
        error: 'line'
      };
    if (out.error) return void w.ctx.notify?.(w.tt(out.error === 'size' ? TX.bigFile : out.error === 'shape' ? TX.badFile : TX.noWrite, {
      e: out.error
    }), 'err');
    if (!await put(w, out.doc) || W !== w) return;
    Object.assign(w, {
      warned: '',
      lines: A.listOf(out.doc, w.id),
      vals: fresh(w, v.type)
    });
    paint(false);
    w.ctx.notify?.(out.updated ? w.tt(TX.updated, {
      p: v.pilot
    }) : w.tt(TX.done, {
      p: v.pilot,
      m: w.id,
      t: fmtZ(v.takeoff)
    }), 'ok');
  } finally {
    w.busy = false;
  }
}

/** « Retirer » : la ligne de cette clé passée « annulée » (jamais supprimée), le fichier relu avant ; elle quitte la liste. */
async function withdraw(w, i) {
  const ref = w.lines[i],
    by = A.meOf(w.ctx.identity?.trigram); // celui qui retire : écrit dans la ligne (Sécurisation, 18/11)
  if (w.busy || !ref) return;
  if (!by) return void w.ctx.notify?.(w.tt(TX.noTrigram), 'err');
  w.busy = true;
  try {
    const got = await reread(w);
    if (!got || W !== w) return;
    const out = A.withdrawn(got.doc, ref, {
      by,
      now: Date.now()
    });
    if (out.error) {
      w.ctx.notify?.(w.tt(out.error === 'gone' ? TX.gone : out.error === 'size' ? TX.bigFile : TX.badFile), out.error === 'gone' ?
        'warn' :
        'err');
      if (out.error === 'gone') {
        w.lines = A.listOf(got.doc, w.id);
        paint(true);
      }
      return;
    }
    if (!await put(w, out.doc) || W !== w) return;
    w.lines = A.listOf(out.doc, w.id);
    paint(true);
    w.ctx.notify?.(w.tt(TX.removed, {
      p: ref.tri,
      m: w.id
    }), 'ok');
  } finally {
    w.busy = false;
  }
}
