(() => {
  'use strict';
  // V3 — la recette de la suite (écran #recette du cadre ; frame/help/SPEC.md § 5 bis, SOG-0167) : la liste des tests fonctionnels des fiches livrées, un par fiche, avec « Validé », « Refusé » et un commentaire (obligatoire
  // pour un refus). Source : frame/help/recette.json (schéma sog-recette/1, généré par tools/recette_build.py : { apps, tests: [{ id, app, title, test, since, state: todo | known | ok | ko, comment?, at? }] }) ; les verdicts
  // sont écrits par le lanceur (recette/verdict → organisation/RECETTE.json, même forme que roadmap/priorities), sinon l'appareil les garde, « non envoyé ». De haut en bas : un résumé, le filtre par application, « Tests du jour »
  // (livrés depuis la dernière recette), « Plus anciens », « En cours : ne pas retester » (un bug connu, dit sur son test : jamais remonté deux fois), « Déjà vus » ; sept tests visibles par section, puis « Voir les n autres ».
  // Contexte donné par frame/app.js : { t, lang, own, root, notify, launcher }. Le fichier et la réponse du lanceur sont des entrées non fiables : tout est échappé, borné et filtré.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const STORE = 'device/recette.json';
  const ID = /^SOG-\d{4}$/;
  const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  const DELIVERED = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/; // la date de livraison d'une fiche : UTC, à la seconde
  const MAX_ITEMS = 1000,
    MAX_COMMENT = 2000, // SOG-0303 : 600 avant ; le lanceur (tools/regen/recette.py) et tools/recette_build.py disent la même limite
    COUNT_FROM = 1800, // le compteur discret apparaît à partir de là
    ROWS_MIN = 4,
    ROWS_MAX = 12,
    SEVEN = 7,
    SECTIONS = ['today', 'older', 'known', 'seen'];
  const T = {
    title: ['Recette', 'Acceptance', 'Abnahme', 'Recepción'],
    intro: [
      'Un test fonctionnel par fiche livrée : où aller, quoi faire, quoi voir. « Validé » ou « Refusé » (un refus demande un commentaire) : l’ergonome lit vos verdicts à chaque tour.',
      'One functional test per delivered card: where to go, what to do, what to see. “Passed” or “Failed” (a failure needs a comment): the ergonomist reads your verdicts every round.',
      'Ein Funktionstest je gelieferte Karte: wohin, was tun, was sehen. „Bestanden“ oder „Abgelehnt“ (eine Ablehnung braucht einen Kommentar): Die Ergonomie liest Ihre Urteile in jeder Runde.',
      'Una prueba funcional por ficha entregada: adónde ir, qué hacer, qué ver. «Válido» o «Rechazado» (un rechazo pide un comentario): la ergonomía lee sus veredictos en cada ronda.'
    ],
    summary: ['{a} à valider · {b} validés · {c} refusés · {d} en cours', '{a} to check · {b} passed · {c} failed · {d} in progress',
      '{a} zu prüfen · {b} bestanden · {c} abgelehnt · {d} in Arbeit',
      '{a} por comprobar · {b} válidos · {c} rechazados · {d} en curso'
    ],
    all: ['Toutes', 'All', 'Alle', 'Todas'],
    app: {
      pilote: ['Pilote', 'Pilot', 'Pilot', 'Piloto'],
      compagnie: ['Compagnie', 'Company', 'Gesellschaft', 'Compañía'],
      maintenance: ['Maintenance', 'Maintenance', 'Wartung', 'Mantenimiento'],
      stats: ['Stats', 'Stats', 'Statistik', 'Estadísticas']
    },
    section: {
      today: ['Tests du jour', 'Today’s tests', 'Tests von heute', 'Pruebas de hoy'],
      older: ['Plus anciens', 'Older', 'Ältere', 'Más antiguas'],
      known: ['En cours : ne pas retester', 'In progress: do not retest', 'In Arbeit: nicht erneut testen',
        'En curso: no volver a probar'
      ],
      seen: ['Déjà vus', 'Already seen', 'Bereits gesehen', 'Ya vistas']
    },
    knownLine: ['En cours, ne pas retester : ce défaut est connu.', 'In progress, do not retest: this defect is known.',
      'In Arbeit, nicht erneut testen: Dieser Fehler ist bekannt.',
      'En curso, no volver a probar: este defecto es conocido.'
    ],
    since: ['livrée le {d}', 'delivered on {d}', 'geliefert am {d}', 'entregada el {d}'],
    comment: ['Commentaire', 'Comment', 'Kommentar', 'Comentario'],
    ok: ['Validé', 'Passed', 'Bestanden', 'Válido'],
    ko: ['Refusé', 'Failed', 'Abgelehnt', 'Rechazado'],
    redo: ['Remettre à tester', 'Test again', 'Erneut testen', 'Volver a probar'],
    // un test livré de nouveau depuis son verdict : il revient à tester, et la ligne dit pourquoi (SOG-0167)
    redelivered: {
      koBare: ['Relivré depuis votre refus du {d}', 'Delivered again since your failure of {d}',
        'Erneut geliefert seit Ihrer Ablehnung vom {d}',
        'Entregada de nuevo desde su rechazo del {d}'
      ],
      ko: ['Relivré depuis votre refus du {d} : « {c} »', 'Delivered again since your failure of {d}: “{c}”',
        'Erneut geliefert seit Ihrer Ablehnung vom {d}: „{c}“', 'Entregada de nuevo desde su rechazo del {d}: «{c}»'
      ],
      ok: ['Relivré depuis votre validation du {d}', 'Delivered again since your pass of {d}',
        'Erneut geliefert seit Ihrer Bestätigung vom {d}',
        'Entregada de nuevo desde su validación del {d}'
      ]
    },
    need: ['Un refus demande un commentaire : dites ce qui ne va pas.', 'A failure needs a comment: say what is wrong.',
      'Eine Ablehnung braucht einen Kommentar: Sagen Sie, was nicht stimmt.',
      'Un rechazo pide un comentario: diga qué falla.'
    ],
    more: ['Voir les {n} autres', 'Show the other {n}', 'Die anderen {n} zeigen', 'Ver las otras {n}'],
    less: ['Réduire', 'Show fewer', 'Weniger zeigen', 'Reducir'],
    unsent: ['non envoyé', 'not sent', 'nicht gesendet', 'no enviado'],
    noOrg: ['Pas de dossier « organisation » sur ce poste : les verdicts restent sur cet appareil.',
      'No “organisation” folder on this computer: the verdicts stay on this device.',
      'Auf diesem Rechner gibt es keinen Ordner „organisation“: Die Urteile bleiben auf diesem Gerät.',
      'No hay carpeta «organisation» en este equipo: los veredictos se quedan en este dispositivo.'
    ],
    noWrite: ['Le lanceur n’a pas pu écrire les verdicts : ils restent sur cet appareil.',
      'The launcher could not write the verdicts: they stay on this device.',
      'Der Launcher konnte die Urteile nicht schreiben: Sie bleiben auf diesem Gerät.',
      'El lanzador no pudo escribir los veredictos: se quedan en este dispositivo.'
    ],
    nothing: ['Aucun test à montrer avec ce choix.', 'No test to show with this choice.', 'Kein Test mit dieser Auswahl.',
      'Ninguna prueba con esta opción.'
    ],
    missing: ['La recette n’est pas encore disponible sur cet appareil (hors ligne à la première visite ?).',
      'The acceptance list is not available on this device yet (offline at the first visit?).',
      'Die Abnahmeliste ist auf diesem Gerät noch nicht verfügbar (beim ersten Besuch offline?).',
      'La lista de recepción aún no está disponible en este dispositivo (¿sin conexión en la primera visita?).'
    ]
  };
  // ---- l'onglet « À trancher » (SOG-0241) : les points que l'ergonome soumet à l'utilisateur, en QCM et choix libre ; même boucle que les verdicts (recette/decision → organisation/DECISIONS_REPONSES.json)
  T.tabTests = ['Tests', 'Tests', 'Tests', 'Pruebas'];
  T.tabDecide = ['À trancher ({n})', 'To decide ({n})', 'Zu entscheiden ({n})', 'Por decidir ({n})'];
  T.dIntro = ['Les points à trancher, un par carte : cochez une réponse, ou écrivez la vôtre. L’ergonome lit vos réponses à chaque tour.',
    'The points to decide, one per card: tick an answer, or write your own. The ergonomist reads your answers every round.',
    'Die zu entscheidenden Punkte, einer je Karte: Kreuzen Sie eine Antwort an oder schreiben Sie Ihre eigene. Die Ergonomie liest Ihre Antworten in jeder Runde.',
    'Los puntos por decidir, uno por tarjeta: marque una respuesta o escriba la suya. La ergonomía lee sus respuestas en cada ronda.'
  ];
  T.dProposed = ['proposé par l’ergonome', 'proposed by the ergonomist', 'von der Ergonomie vorgeschlagen', 'propuesta por la ergonomía'];
  T.dFree = ['Votre réponse libre (facultatif)', 'Your own answer (optional)', 'Ihre eigene Antwort (optional)',
    'Su propia respuesta (opcional)'
  ];
  T.count = ['{n} / {max} signes', '{n} / {max} characters', '{n} / {max} Zeichen', '{n} / {max} caracteres'];
  T.dAnswer = ['Répondre', 'Answer', 'Antworten', 'Responder'];
  T.dModify = ['Modifier', 'Change', 'Ändern', 'Modificar'];
  T.dYours = ['Votre réponse', 'Your answer', 'Ihre Antwort', 'Su respuesta'];
  T.dNeed = ['Cochez une réponse ou écrivez la vôtre.', 'Tick an answer or write your own.',
    'Kreuzen Sie eine Antwort an oder schreiben Sie Ihre eigene.', 'Marque una respuesta o escriba la suya.'
  ];
  T.dNone = ['Rien à trancher pour l’instant.', 'Nothing to decide for now.', 'Im Moment nichts zu entscheiden.',
    'Nada que decidir por ahora.'
  ];
  T.dCopy = ['Copier l’identifiant', 'Copy the identifier', 'Kennung kopieren', 'Copiar el identificador'];
  T.dKept = ['{n} réponse(s) gardée(s) sur cet appareil, pas encore envoyée(s).', '{n} answer(s) kept on this device, not sent yet.',
    '{n} Antwort(en) auf diesem Gerät behalten, noch nicht gesendet.',
    '{n} respuesta(s) guardada(s) en este dispositivo, aún no enviada(s).'
  ];
  T.dUnknown = ['Non envoyé : le lanceur de ce poste ne connaît pas encore ce geste, relancez-le.',
    'Not sent: this workstation’s launcher does not know this gesture yet, restart it.',
    'Nicht gesendet: Der Starter dieses Arbeitsplatzes kennt diese Funktion noch nicht, starten Sie ihn neu.',
    'No enviado: el lanzador de este puesto aún no conoce este gesto, reinícielo.'
  ];
  T.dNoLauncher = ['Non envoyé : aucun lanceur ne répond sur ce poste.', 'Not sent: no launcher answers on this workstation.',
    'Nicht gesendet: Auf diesem Arbeitsplatz antwortet kein Starter.',
    'No enviado: ningún lanzador responde en este puesto.'
  ];
  T.dNoWrite = ['Le lanceur n’a pas pu écrire les réponses : elles restent sur cet appareil.',
    'The launcher could not write the answers: they stay on this device.',
    'Der Launcher konnte die Antworten nicht schreiben: Sie bleiben auf diesem Gerät.',
    'El lanzador no pudo escribir las respuestas: se quedan en este dispositivo.'
  ];
  /** Ligne [fr, en, de, es] d'un texte du fichier ({ fr, en, de, es }) ; une langue absente reprend l'anglais, puis le français. */
  const row = o => {
    if (typeof o === 'string') return o;
    const en = o?.en || o?.fr || '';
    return [o?.fr || en, en, o?.de || en, o?.es || en];
  };
  /** Un texte borné, sans caractère de commande. */
  const text = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '';
  /** Un verdict lu d'ailleurs (le fichier du lanceur, le magasin de l'appareil, le fichier généré) : { verdict, comment?, at? } aux règles, sinon null ; un refus sans commentaire n'est pas un verdict. */
  const entryOf = v => {
    if (!v || typeof v !== 'object' || (v.verdict !== 'ok' && v.verdict !== 'ko')) return null;
    const e = {
        verdict: v.verdict
      },
      c = text(v.comment, MAX_COMMENT);
    if (c) e.comment = c;
    if (typeof v.at === 'string' && AT.test(v.at)) e.at = v.at;
    return v.verdict === 'ko' && !e.comment ? null : e;
  };
  /** Le verdict qu'une nouvelle livraison a remplacé (donné par le générateur) : { verdict, comment?, at? } aux règles, sinon null ; contrairement à
   *  entryOf, un refus sans commentaire reste dicible (« Relivré depuis votre refus du … »). */
  const previousEntry = v => {
    if (!v || typeof v !== 'object' || (v.verdict !== 'ok' && v.verdict !== 'ko')) return null;
    const e = {
        verdict: v.verdict
      },
      c = text(v.comment, MAX_COMMENT);
    if (c) e.comment = c;
    if (typeof v.at === 'string' && AT.test(v.at)) e.at = v.at;
    return e;
  };
  /** Une carte de verdicts lue d'ailleurs : seules les entrées aux règles (identifiant SOG-nnnn), 1000 au plus. */
  const cleanMap = m => {
    const out = {};
    if (!m || typeof m !== 'object' || Array.isArray(m)) return out;
    let n = 0;
    for (const k of Object.keys(m)) {
      const e = ID.test(k) && n < MAX_ITEMS ? entryOf(m[k]) : null;
      if (e) {
        out[k] = e;
        n++;
      }
    }
    return out;
  };
  /** Le magasin de l'appareil (device/recette.json) : { pending (id → verdict, ou null : à retirer), unsent, open (sections dépliées) }. */
  const readStore = async c => {
    let s = null;
    try {
      s = await c.own?.get(STORE);
    } catch {
      s = null;
    }
    const pending = {};
    if (s?.pending && typeof s.pending === 'object' && !Array.isArray(s.pending))
      for (const k of Object.keys(s.pending).slice(0, MAX_ITEMS)) {
        if (!ID.test(k)) continue;
        if (s.pending[k] === null) pending[k] = null;
        else if (entryOf(s.pending[k])) pending[k] = entryOf(s.pending[k]);
      }
    return {
      pending,
      unsent: (Array.isArray(s?.unsent) ? s.unsent : []).filter(k => typeof k === 'string' && Object.hasOwn(pending, k)),
      open: Object.fromEntries(SECTIONS.map(k => [k, s?.open?.[k] === true]))
    };
  };
  const saveStore = async (c, part) => {
    try {
      const s = (await c.own?.get(STORE).catch(() => null)) || {};
      await c.own?.put(STORE, {
        ...s,
        ...part
      });
    } catch {
      /* le choix vaut pour cet affichage seulement */
    }
  };
  const QID = /^Q-\d{4}$/;
  const MAX_Q = 200;
  /** Une réponse lue d'ailleurs (le fichier du lanceur, le magasin de l'appareil, le fichier généré) : { choice: 0 à 9 | null, text, at? } aux règles, sinon null (au moins un choix ou un texte). */
  const answerOf = v => {
    if (!v || typeof v !== 'object') return null;
    const choice = Number.isInteger(v.choice) && v.choice >= 0 && v.choice <= 9 ? v.choice : null,
      tx = text(v.text, MAX_COMMENT);
    if (choice === null && !tx) return null;
    return {
      choice,
      text: tx,
      ...(typeof v.at === 'string' && AT.test(v.at) ? {
        at: v.at
      } : {})
    };
  };
  const answerMap = m => {
    const out = {};
    if (!m || typeof m !== 'object' || Array.isArray(m)) return out;
    let n = 0;
    for (const k of Object.keys(m)) {
      const a = QID.test(k) && n < MAX_ITEMS ? answerOf(m[k]) : null;
      if (a) {
        out[k] = a;
        n++;
      }
    }
    return out;
  };
  /** Les questions du fichier (non fiable) : identifiant Q-nnnn, fiche SOG-nnnn, textes bornés, 2 à 6 réponses, 200 au plus. */
  const questionsOf = list => (Array.isArray(list) ? list : []).filter(q => q && typeof q === 'object' && QID.test(q.id)).slice(0, MAX_Q)
    .map(q => {
      const options = (Array.isArray(q.options) ? q.options : []).map(o => text(typeof o === 'string' ? o : o?.text, 200)).filter(
        Boolean).slice(0, 6);
      return {
        id: q.id,
        fiche: typeof q.fiche === 'string' && ID.test(q.fiche) ? q.fiche : '',
        app: typeof q.app === 'string' ? q.app.slice(0, 20) : '',
        question: text(q.question, 300),
        context: text(q.context, 500),
        options,
        recommended: Number.isInteger(q.recommended) && q.recommended >= 0 && q.recommended < options.length ? q.recommended : null,
        since: /^\d{4}-\d{2}-\d{2}$/.test(String(q.since)) ? q.since : '',
        gen: q.state === 'answered' ? answerOf({
          choice: q.choice,
          text: q.text,
          at: q.at
        }) : null
      };
    }).filter(q => q.question && q.options.length >= 2);
  /** Le magasin des réponses (même fichier device/recette.json) : { dpending (id → réponse, ou null : à retirer), dunsent, tab }. */
  const readStoreD = async c => {
    let s = null;
    try {
      s = await c.own?.get(STORE);
    } catch {
      s = null;
    }
    const dpending = {};
    if (s?.dpending && typeof s.dpending === 'object' && !Array.isArray(s.dpending))
      for (const k of Object.keys(s.dpending).slice(0, MAX_Q)) {
        if (!QID.test(k)) continue;
        if (s.dpending[k] === null) dpending[k] = null;
        else if (answerOf(s.dpending[k])) dpending[k] = answerOf(s.dpending[k]);
      }
    return {
      dpending,
      dunsent: (Array.isArray(s?.dunsent) ? s.dunsent : []).filter(k => typeof k === 'string' && Object.hasOwn(dpending, k)),
      tab: s?.tab === 'decisions' ? 'decisions' : 'tests'
    };
  };
  let docP = null;
  /** La liste des tests (JSON) ; null si elle est introuvable. */
  const load = c => docP ||= fetch(new URL('frame/help/recette.json', c.root), {
    cache: 'no-cache'
  }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => (d || (docP = null), d));

  /** Dessine l'écran de la recette dans view. */
  async function screen(view, c) {
    const {
      t
    } = c;
    const d = await load(c);
    if (!d || !Array.isArray(d.tests)) {
      view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-card">${esc(t(T.missing))}</p>`;
      return;
    }
    const tests = d.tests.filter(x => x && typeof x === 'object' && ID.test(x.id)).slice(0, MAX_ITEMS).map(x => ({
      id: x.id,
      app: typeof x.app === 'string' ? x.app.slice(0, 20) : '',
      title: x.title,
      test: text(x.test, 700),
      since: /^\d{4}-\d{2}-\d{2}$/.test(String(x.since)) ? x.since : '',
      state: ['todo', 'known', 'ok', 'ko'].includes(x.state) ? x.state : 'todo',
      // la date de la dernière livraison de la fiche (UTC, « AAAA-MM-JJThh:mm:ssZ ») et le verdict qu'elle a remplacé : lus comme des entrées non fiables
      delivered: typeof x.delivered === 'string' && DELIVERED.test(x.delivered) ? x.delivered : '',
      previous: previousEntry(x.previous),
      gen: x.state === 'ok' || x.state === 'ko' ? entryOf({
        verdict: x.state,
        comment: x.comment,
        at: x.at
      }) : null
    }));
    const apps = (Array.isArray(d.apps) ? d.apps : []).filter(a => typeof a === 'string' && tests.some(x => x.app === a));
    const saved = await readStore(c);
    const savedD = await readStoreD(c);
    const ui = {
      app: '',
      file: {},
      // les verdicts écrits par le lanceur
      fileRead: false,
      local: saved.pending,
      // ceux de cet appareil, pas encore envoyés (null : à retirer)
      unsent: new Set(saved.unsent),
      open: saved.open,
      more: {},
      draft: {},
      need: '',
      // l'onglet « À trancher » (SOG-0241)
      tab: savedD.tab,
      dlocal: savedD.dpending,
      dunsent: new Set(savedD.dunsent),
      dfile: {},
      dfileRead: false,
      dedit: new Set(),
      ddraft: {},
      dneed: '',
      dwhy: '' // pourquoi la dernière réponse n'est pas partie : unknown (le lanceur n'a pas ce verbe), offline, failed
    };
    // ---- ce que dit un test : son verdict en vigueur (l'appareil, puis le lanceur, puis le fichier généré), ou rien
    const rawVerdict = x => Object.hasOwn(ui.local, x.id) ? ui.local[x.id] : ui.fileRead ? ui.file[x.id] || null : x.gen;
    // un verdict plus ancien que la dernière livraison de la fiche n'est plus en vigueur : le test revient à tester (comparaison des instants, jamais du texte)
    const superseded = (x, v) => !!(v?.at && x.delivered && Date.parse(v.at) < Date.parse(x.delivered));
    const verdictOf = x => {
      const v = rawVerdict(x);
      return superseded(x, v) ? null : v;
    };
    /** Le verdict que la dernière livraison a remplacé : celui qui est lu du lanceur ou de l'appareil, à défaut ce que le générateur en dit ; null sinon. */
    const previousOf = x => {
      const v = rawVerdict(x);
      return superseded(x, v) ? v : x.previous;
    };
    const known = x => x.state === 'known';
    // la dernière recette : le jour du dernier verdict d'avant aujourd'hui ; « du jour » = livré depuis (tout, sans verdict encore)
    let lastDay = '';
    const setLastDay = () => {
      const today = new Date().toISOString().slice(0, 10),
        days = tests.map(x => (ui.fileRead ? ui.file[x.id] : x.gen)).filter((v, i) => v && !superseded(tests[i], v)).map(v => v.at
          ?.slice(0, 10)).filter(d => d && d < today)
        .sort(); // les verdicts d'aujourd'hui ne font pas de la recette d'hier
      lastDay = days[days.length - 1] || '';
    };
    setLastDay();
    const sectionOf = x => known(x) ? 'known' : verdictOf(x) ? 'seen' : previousOf(x) || !lastDay || x.since > lastDay ? 'today' :
      'older';
    const shownTests = () => tests.filter(x => !ui.app || x.app === ui.app);
    const appName = a => T.app[a] ? t(T.app[a]) : a;
    // SOG-0303 : le champ de saisie grandit avec le texte (quatre lignes au départ, douze au plus, puis il défile) ; un compteur discret à partir de COUNT_FROM signes
    const counter = v => {
      const n = String(v ?? '').length;
      return `<small class="f-muted f-rc-count" data-count${n >= COUNT_FROM ? '' : ' hidden'}>${esc(t(T.count, { n, max: MAX_COMMENT }))}</small>`;
    };
    /** Hauteur du champ selon son texte, bornée à ROWS_MAX lignes ; sans effet sur un champ caché (un volet fermé : on le recalcule à l'ouverture). */
    const fit = ta => {
      if (!ta.offsetParent) return;
      const cs = getComputedStyle(ta),
        lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4,
        edge = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth),
        cap = ROWS_MAX * lh + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + edge;
      ta.style.height = 'auto'; // la mesure : la hauteur naturelle des quatre lignes, puis celle du texte
      const h = `${Math.round(Math.min(Math.max(ta.scrollHeight + edge, ta.offsetHeight), cap))}px`;
      if (ta.style.height !== h) ta.style.height = h;
    };
    const fitAll = root => root.querySelectorAll('textarea[data-comment], textarea[data-dtext]').forEach(fit);
    /** Le compteur du champ : écrit seulement si sa valeur change. */
    const count = ta => {
      const el = ta.parentElement?.querySelector('[data-count]');
      if (!el) return;
      const n = ta.value.length,
        txt = t(T.count, {
          n,
          max: MAX_COMMENT
        });
      if (el.textContent !== txt) el.textContent = txt;
      if (el.hidden !== (n < COUNT_FROM)) el.hidden = n < COUNT_FROM;
    };
    const item = x => {
      const v = verdictOf(x);
      const head = `<p><span class="f-rm-id">${esc(x.id)}</span> <b>${esc(t(row(x.title)))}</b>${x.since ? ` <small class="f-muted">${esc(t(T.since, { d: x.since }))}</small>` : ''}${ui.unsent.has(x.id) ? ` <small class="f-rm-unsent" data-unsent>${esc(t(T.unsent))}</small>` : ''}</p>
        <p class="f-rc-test" lang="fr" data-test>${esc(x.test)}</p>`;
      if (known(x)) return `<li class="f-rc-item" data-id="${esc(x.id)}" data-state="known">${head}<p class="f-muted" data-known>${esc(t(T.knownLine))}</p></li>`;
      if (v) return `<li class="f-rc-item" data-id="${esc(x.id)}" data-state="${v.verdict}">${head}<p data-verdict="${v.verdict}"><b>${esc(t(T[v.verdict]))}</b>${v.at ? ` <small class="f-muted">${esc(v.at.slice(0, 10))}</small>` : ''}${v.comment ? ` — ${esc(v.comment)}` : ''}</p>
        <div class="f-row"><button type="button" data-redo="${esc(x.id)}">${esc(t(T.redo))}</button></div></li>`;
      const p = previousOf(x),
        why = p ? `<p class="f-muted" data-redelivered="${p.verdict}">${esc(t(T.redelivered[p.verdict === 'ko' && !p.comment ? 'koBare' : p.verdict], { d: (p.at || x.delivered || '').slice(0, 10), c: p.comment || '' }))}</p>` : '';
      return `<li class="f-rc-item" data-id="${esc(x.id)}" data-state="todo">${head}${why}
        <label class="f-field">${esc(t(T.comment))}<textarea data-comment="${esc(x.id)}" rows="${ROWS_MIN}" maxlength="${MAX_COMMENT}">${esc(ui.draft[x.id] || '')}</textarea>${counter(ui.draft[x.id])}</label>
        ${ui.need === x.id ? `<p class="f-warn" data-need>${esc(t(T.need))}</p>` : ''}
        <div class="f-row"><button type="button" class="primary" data-ok="${esc(x.id)}">${esc(t(T.ok))}</button><button type="button" data-ko="${esc(x.id)}">${esc(t(T.ko))}</button></div></li>`;
    };
    /** Une section : ses tests par application, sept visibles puis « Voir les n autres » ; hors « Tests du jour » elle est repliée jusqu'à un toucher sur son titre. */
    const sectionHtml = (k, list) => {
      if (!list.length) return '';
      // d'une application, les tests relivrés d'abord (ils reviennent après un verdict), puis les plus récents
      const sorted = [...list].sort((a, b) => apps.indexOf(a.app) - apps.indexOf(b.app) || (previousOf(b) ? 1 : 0) - (previousOf(a) ?
        1 : 0) || (b.since || '').localeCompare(a.since ||
        '') || a.id.localeCompare(b.id));
      const all = ui.more[k],
        vis = all ? sorted : sorted.slice(0, SEVEN),
        rest = sorted.length - vis.length;
      let last = null;
      const body = vis.map(x => {
        const h = x.app !== last ? `${last === null ? '' : '</ul>'}<h3 data-app-title>${esc(appName(x.app))}</h3><ul class="f-rc-list">` : '';
        last = x.app;
        return h + item(x);
      }).join('') + (last === null ? '' : '</ul>');
      const more = rest > 0 ? `<p><button type="button" data-more="${k}">${esc(t(T.more, { n: rest }))}</button></p>` : all && sorted.length > SEVEN ? `<p><button type="button" data-more="${k}">${esc(t(T.less))}</button></p>` : '';
      const title = `${esc(t(T.section[k]))} <span class="f-muted" data-count>(${sorted.length})</span>`;
      return k === 'today' ? `<section class="f-rc-sec" data-section="${k}"><h2>${title}</h2>${body}${more}</section>` :
        `<details class="f-rc-sec" data-section="${k}"${ui.open[k] ? ' open' : ''}><summary><b>${title}</b></summary>${body}${more}</details>`;
    };
    // ---- l'onglet « À trancher » : une carte par question, les non répondues d'abord
    const questions = questionsOf(d.decisions);
    const answerNow = q => Object.hasOwn(ui.dlocal, q.id) ? ui.dlocal[q.id] : ui.dfileRead ? ui.dfile[q.id] || null : q.gen;
    const undecided = () => questions.filter(q => !answerNow(q)).length;
    const decisionItem = q => {
      const a = answerNow(q),
        editing = !a || ui.dedit.has(q.id),
        head = `<p><button type="button" class="f-rm-id" data-copy="${esc(q.fiche || q.id)}" title="${esc(t(T.dCopy))}">${esc(q.fiche || q.id)}</button> <small class="f-muted">${esc(q.id)}${q.app ? ` · ${esc(appName(q.app))}` : ''}</small>${Object.hasOwn(ui.dlocal, q.id) ? ` <small class="f-warn" data-unsent>${esc(t(ui.dwhy === 'unknown' ? T.dUnknown : T.unsent))}</small>` : ''}</p>
        <p><b>${esc(q.question)}</b></p>${q.context ? `<p class="f-muted" data-context>${esc(q.context)}</p>` : ''}`;
      if (!editing) return `<li class="f-rc-item" data-q="${esc(q.id)}" data-state="answered">${head}<p data-answer><b>${esc(t(T.dYours))}</b> : ${a.choice !== null && q.options[a.choice] ? esc(q.options[a.choice]) : ''}${a.choice !== null && a.text ? ' · ' : ''}${esc(a.text)}${a.at ? ` <small class="f-muted">${esc(a.at.slice(0, 10))}</small>` : ''}</p>
        <div class="f-row"><button type="button" data-dmod="${esc(q.id)}">${esc(t(T.dModify))}</button></div></li>`;
      const dr = ui.ddraft[q.id] || {
        choice: a?.choice ?? null,
        text: a?.text || ''
      };
      return `<li class="f-rc-item" data-q="${esc(q.id)}" data-state="todo">${head}
        <div role="radiogroup" aria-label="${esc(q.question)}">${q.options.map((o, i) => `<label class="f-rc-opt"><input type="radio" name="dq-${esc(q.id)}" value="${i}" data-dchoice="${esc(q.id)}"${dr.choice === i ? ' checked' : ''}> ${esc(o)}${q.recommended === i ? ` <small class="f-muted" data-proposed>(${esc(t(T.dProposed))})</small>` : ''}</label>`).join('')}</div>
        <label class="f-field">${esc(t(T.dFree))}<textarea data-dtext="${esc(q.id)}" rows="${ROWS_MIN}" maxlength="${MAX_COMMENT}">${esc(dr.text)}</textarea>${counter(dr.text)}</label>
        ${ui.dneed === q.id ? `<p class="f-warn" data-need>${esc(t(T.dNeed))}</p>` : ''}
        <div class="f-row"><button type="button" class="primary" data-dok="${esc(q.id)}">${esc(t(T.dAnswer))}</button></div></li>`;
    };
    const decisionsPanel = () => {
      const sorted = [...questions].sort((a, b) => (answerNow(a) ? 1 : 0) - (answerNow(b) ? 1 : 0) || (b.since || '').localeCompare(a
        .since || '') || a.id.localeCompare(b.id));
      const kept = Object.values(ui.dlocal).filter(Boolean).length,
        banner = kept ? `<p class="f-warn" data-dbanner role="status">${esc(t(T.dKept, { n: kept }))}${ui.dwhy === 'unknown' ? ` ${esc(t(T.dUnknown))}` : ui.dwhy === 'offline' ? ` ${esc(t(T.dNoLauncher))}` : ''}</p>` : '';
      return `${banner}<p class="f-muted">${esc(t(T.dIntro))}</p>${sorted.length ? `<ul class="f-rc-list" data-decisions>${sorted.map(decisionItem).join('')}</ul>` : `<p class="f-muted" data-nothing>${esc(t(T.dNone))}</p>`}`;
    };
    const draw = focus => {
      // un redessin (réponse du lanceur, retour du lanceur…) ne coupe pas la frappe : le champ où l'on écrit reprend le focus et la position du curseur (SOG-0241)
      const ae = document.activeElement,
        typing = ae && view.contains(ae) && ae.tagName === 'TEXTAREA' ? {
          sel: ae.hasAttribute('data-dtext') ? 'data-dtext' : ae.hasAttribute('data-comment') ? 'data-comment' : '',
          id: ae.getAttribute('data-dtext') ?? ae.getAttribute('data-comment'),
          from: ae.selectionStart,
          to: ae.selectionEnd
        } : null;
      const mine = shownTests();
      const by = Object.fromEntries(SECTIONS.map(k => [k, mine.filter(x => sectionOf(x) === k)]));
      const n = k => by[k].length,
        verdictN = v => mine.filter(x => !known(x) && verdictOf(x)?.verdict === v).length;
      const tabs = questions.length ? `<div class="f-rm-bar" role="tablist" data-tabs>${['tests', 'decisions'].map(k => `<button type="button" class="f-rm-btn" data-tab="${k}" aria-pressed="${ui.tab === k}">${esc(k === 'tests' ? t(T.tabTests) : t(T.tabDecide, { n: undecided() }))}</button>`).join('')}</div>` : '';
      view.innerHTML = `<h1>${esc(t(T.title))}</h1>${tabs}${ui.tab === 'decisions' && questions.length ? decisionsPanel() : `        <p class="f-muted">${esc(t(T.intro))}</p>
        <p data-summary>${esc(t(T.summary, { a: n('today') + n('older'), b: verdictN('ok'), c: verdictN('ko'), d: n('known') }))}</p>
        <div class="f-rm-bar" data-apps>${[''].concat(apps).map(a => `<button type="button" class="f-rm-btn" data-app="${esc(a)}" aria-pressed="${ui.app === a}">${esc(a ? appName(a) : t(T.all))}</button>`).join('')}</div>
        ${mine.length ? SECTIONS.map(k => sectionHtml(k, by[k])).join('') : `<p class="f-muted" data-nothing>${esc(t(T.nothing))}</p>`}`}`;
      fitAll(view);
      if (focus) view.querySelector(focus)?.focus();
      else if (typing?.sel) {
        const ta = view.querySelector(`textarea[${typing.sel}="${CSS.escape(typing.id)}"]`);
        if (ta) {
          ta.focus();
          ta.setSelectionRange(typing.from, typing.to);
        }
      }
    };

    // ---- les verdicts : écrits par le lanceur (recette/verdict), sinon gardés sur l'appareil, « non envoyé »
    const launcher = () => {
      try {
        return c.launcher?.() || null;
      } catch {
        return null;
      }
    };
    /** Appel du verbe recette/verdict du lanceur : son résultat, ou null (pas de lanceur, lanceur sans ce verbe, travail en échec). */
    const callRec = async args => {
      const L = launcher();
      if (!L) return null;
      const r = await L.job('regen/job', {
        set: 'recette',
        verb: 'verdict',
        args
      }).catch(() => null);
      return r?.ok && r.result && typeof r.result === 'object' ? r.result : null;
    };
    let sending = Promise.resolve(); // les envois se suivent : jamais deux à la fois
    let pulling = Promise.resolve();
    /** Les verdicts du fichier avec ceux de l'appareil (un retrait : `null`) ; vrai si le lanceur les a écrits (les « non envoyé » disparaissent), faux sinon (avec la raison dite). */
    const send = quiet => sending = sending.then(async () => {
      await pulling; // ce que le fichier porte déjà est lu avant d'écrire
      if (!ui
        .fileRead
      ) { // la lecture a échoué (lanceur occupé, redémarré) : on la refait ; jamais d'envoi sans avoir lu (le lanceur fusionne, mais un lanceur plus ancien remplace)
        const g = await callRec({
          action: 'get'
        });
        if (g?.ok) {
          ui.file = cleanMap(g.items);
          ui.fileRead = true;
        }
      }
      if (!ui.fileRead) return notSent(quiet, null);
      const mine = {
          ...ui.local
        },
        all = {
          ...ui.file
        },
        drop = [];
      for (const [k, v] of Object.entries(mine)) {
        if (v) all[k] = v;
        else {
          delete all[k];
          drop.push(k); // une entrée ne sort du fichier que reprise par l'utilisateur
        }
      }
      const r = await callRec({
        action: 'set',
        items: Object.fromEntries(Object.entries(all).slice(0, MAX_ITEMS)),
        ...(drop.length ? {
          drop
        } : {})
      });
      if (r?.ok) {
        ui.file = cleanMap(all);
        ui.fileRead = true;
        for (const k of Object.keys(mine)) {
          if (!Object.hasOwn(ui.local, k) || JSON.stringify(ui.local[k]) === JSON.stringify(mine[k])) delete ui.local[k];
          if (!Object.hasOwn(ui.local, k)) ui.unsent.delete(k);
        }
        await saveStore(c, {
          pending: ui.local,
          unsent: [...ui.unsent]
        });
        return true;
      }
      return notSent(quiet, r);
    });
    const notSent = (quiet, r) => {
      if (!quiet && launcher()) c.notify?.(t(r?.reason === 'no-organisation' ? T.noOrg : T.noWrite), 'warn');
      return false;
    };
    pulling = (async () => {
      const r = await callRec({
        action: 'get'
      });
      if (!r?.ok) return;
      ui.file = cleanMap(r.items);
      ui.fileRead = true;
      setLastDay();
      draw();
    })();
    pulling.then(() => Object.keys(ui.local).length ? send(true).then(ok => ok && draw()) : null);
    /** Garde le verdict d'un test (`null` : le retirer) : sur l'appareil d'abord, puis on tente l'envoi. */
    const commit = async (id, e) => {
      ui.local[id] = e;
      ui.unsent.add(id);
      delete ui.draft[id];
      ui.need = '';
      await saveStore(c, {
        pending: ui.local,
        unsent: [...ui.unsent]
      });
      draw();
      if (await send(false)) draw();
    };
    // ---- les réponses : écrites par le lanceur (recette/decision), sinon gardées sur l'appareil, « non envoyé » (comme les verdicts)
    const callDec = async args => {
      const L = launcher();
      if (!L) {
        ui.dwhy = 'offline';
        return null;
      }
      const r = await L.job('regen/job', {
        set: 'recette',
        verb: 'decision',
        args
      }).catch(() => null);
      ui.dwhy = r?.ok ? '' : r?.offline ? 'offline' : r?.status === 400 && /unknown operation/.test(String(r.message || '')) ?
        'unknown' : 'failed';
      return r?.ok && r.result && typeof r.result === 'object' ? r.result : null;
    };
    let dsending = Promise.resolve();
    let dpulling = Promise.resolve();
    const sendDec = quiet => dsending = dsending.then(async () => {
      await dpulling; // ce que le fichier porte déjà est lu avant d'écrire
      if (!ui
        .dfileRead
      ) { // la lecture a échoué (lanceur occupé, redémarré, ou aucune question ouverte) : on la refait ; jamais d'envoi sans avoir lu — SOG-0241 : 14 réponses du matin perdues
        const g = await callDec({
          action: 'get'
        });
        if (g?.ok) {
          ui.dfile = answerMap(g.items);
          ui.dfileRead = true;
        }
      }
      if (!ui.dfileRead) {
        draw();
        if (!quiet && launcher()) c.notify?.(t(ui.dwhy === 'unknown' ? T.dUnknown : T.dNoWrite), 'warn');
        return false;
      }
      const mine = {
          ...ui.dlocal
        },
        all = {
          ...ui.dfile
        },
        drop = [];
      for (const [k, v] of Object.entries(mine)) {
        if (v) all[k] = v;
        else {
          delete all[k];
          drop.push(k);
        }
      }
      const r = await callDec({
        action: 'set',
        items: Object.fromEntries(Object.entries(all).slice(0, MAX_ITEMS)),
        ...(drop.length ? {
          drop
        } : {})
      });
      if (r?.ok) {
        ui.dfile = answerMap(all);
        ui.dfileRead = true;
        for (const k of Object.keys(mine)) {
          if (!Object.hasOwn(ui.dlocal, k) || JSON.stringify(ui.dlocal[k]) === JSON.stringify(mine[k])) delete ui.dlocal[k];
          if (!Object.hasOwn(ui.dlocal, k)) ui.dunsent.delete(k);
        }
        await saveStore(c, {
          dpending: ui.dlocal,
          dunsent: [...ui.dunsent]
        });
        return true;
      }
      if (!quiet && launcher()) c.notify?.(t(r?.reason === 'no-organisation' ? T.noOrg : ui.dwhy === 'unknown' ? T.dUnknown : T
        .dNoWrite), 'warn');
      draw(); // la raison se dit sur les cartes et en tête de l'onglet
      return false;
    });
    /** Lit les réponses du fichier du lanceur, puis envoie celles que cet appareil garde : à l'ouverture, et au retour du lanceur (le verbe peut être connu depuis un redémarrage). */
    const syncDec = () => {
      dpulling = !questions.length ? Promise.resolve() : (async () => { // pas de question : le lanceur n'est pas interrogé
        const r = await callDec({
          action: 'get'
        });
        if (!r?.ok) return;
        ui.dfile = answerMap(r.items);
        ui.dfileRead = true;
        draw();
      })();
      return dpulling.then(() => Object.keys(ui.dlocal).length ? sendDec(true).then(ok => ok && draw()) : null);
    };
    syncDec();
    const onLauncher = e => {
      if (!view.isConnected) return window.removeEventListener('frame-launcher', onLauncher);
      if (e.detail?.state === 'up' && questions.length) syncDec();
    };
    window.addEventListener('frame-launcher', onLauncher);
    /** Garde la réponse d'une question (`null` : la retirer) : sur l'appareil d'abord, puis on tente l'envoi. */
    const commitDec = async (id, a) => {
      ui.dlocal[id] = a;
      ui.dunsent.add(id);
      delete ui.ddraft[id];
      ui.dedit.delete(id);
      ui.dneed = '';
      await saveStore(c, {
        dpending: ui.dlocal,
        dunsent: [...ui.dunsent]
      });
      draw();
      if (await sendDec(false)) draw();
    };
    const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    view.onclick = e => {
      const b = e.target.closest?.('button');
      if (!b || !view.contains(b)) return;
      if (b.dataset.tab) {
        ui.tab = b.dataset.tab === 'decisions' ? 'decisions' : 'tests';
        saveStore(c, {
          tab: ui.tab
        });
        return draw(`[data-tab="${ui.tab}"]`);
      }
      if (b.dataset.copy) return void(c.copy ? c.copy(b.dataset.copy) : navigator.clipboard?.writeText(b.dataset.copy).catch(
        () => {}));
      if (b.dataset.dmod && QID.test(b.dataset.dmod)) {
        ui.dedit.add(b.dataset.dmod);
        return draw(`[data-dtext="${CSS.escape(b.dataset.dmod)}"]`);
      }
      if (b.dataset.dok && QID.test(b.dataset.dok)) {
        const id = b.dataset.dok,
          q = questions.find(x => x.id === id),
          dr = ui.ddraft[id] || {},
          choice = Number.isInteger(dr.choice) ? dr.choice : Number(view.querySelector(`input[name="dq-${CSS.escape(id)}"]:checked`)?.value ?? NaN),
          a = answerOf({
            choice: Number.isInteger(choice) && q && choice < q.options.length ? choice : null,
            text: dr.text ?? view.querySelector(`[data-dtext="${CSS.escape(id)}"]`)?.value,
            at: now()
          });
        if (!a) { // ni choix ni texte : on le dit, on garde la place
          ui.dneed = id;
          return draw(`[data-dok="${CSS.escape(id)}"]`);
        }
        return commitDec(id, a);
      }
      if (b.dataset.app !== undefined) {
        ui.app = b.dataset.app;
        return draw(`[data-app="${CSS.escape(ui.app)}"]`);
      }
      if (b.dataset.more) {
        ui.more[b.dataset.more] = !ui.more[b.dataset.more];
        return draw(`[data-more="${CSS.escape(b.dataset.more)}"]`);
      }
      if (b.dataset.redo) return commit(b.dataset.redo, null);
      const id = b.dataset.ok || b.dataset.ko;
      if (!id || !ID.test(id)) return;
      const comment = text(ui.draft[id] ?? view.querySelector(`[data-comment="${CSS.escape(id)}"]`)?.value, MAX_COMMENT);
      if (b.dataset.ko && !comment) { // un refus sans commentaire : on le dit, on garde la place
        ui.need = id;
        return draw(`[data-comment="${CSS.escape(id)}"]`);
      }
      return commit(id, {
        verdict: b.dataset.ok ? 'ok' : 'ko',
        ...(comment ? {
          comment
        } : {}),
        at: now()
      });
    };
    view.onchange = e => {
      const r = e.target.closest?.('input[data-dchoice]');
      if (!r || !QID.test(r.dataset.dchoice)) return;
      ui.ddraft[r.dataset.dchoice] = {
        ...(ui.ddraft[r.dataset.dchoice] || {}),
        choice: Number(r.value)
      };
      if (ui.dneed === r.dataset.dchoice) {
        ui.dneed = '';
        r.closest('li')?.querySelector('[data-need]')?.remove();
      }
    };
    view.oninput = e => {
      const dt = e.target.closest?.('textarea[data-dtext]');
      if (dt && QID.test(dt.dataset.dtext)) {
        ui.ddraft[dt.dataset.dtext] = {
          ...(ui.ddraft[dt.dataset.dtext] || {}),
          text: dt.value
        };
        fit(dt);
        count(dt);
        if (ui.dneed === dt.dataset.dtext && dt.value.trim()) {
          ui.dneed = '';
          dt.closest('li')?.querySelector('[data-need]')?.remove();
        }
        return;
      }
      const ta = e.target.closest?.('textarea[data-comment]');
      if (!ta || !ID.test(ta.dataset.comment)) return;
      ui.draft[ta.dataset.comment] = ta.value;
      fit(ta);
      count(ta);
      if (ui.need === ta.dataset.comment && ta.value.trim()) {
        ui.need = '';
        ta.closest('li')?.querySelector('[data-need]')?.remove();
      }
    };
    view.addEventListener('toggle', e => {
      const sec = e.target.closest?.('details[data-section]');
      if (!sec || !SECTIONS.includes(sec.dataset.section) || ui.open[sec.dataset.section] === sec.open) return;
      ui.open[sec.dataset.section] = sec.open;
      if (sec.open) fitAll(sec);
      saveStore(c, {
        open: ui.open
      });
    }, true);
    draw();
  }

  window.SogRecette = {
    screen,
    T
  };
})();
