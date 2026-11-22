(() => {
  'use strict';
  // V3 — la recette de la suite (écran #recette du cadre ; frame/help/SPEC.md § 5 bis, SOG-0167) : la liste des tests fonctionnels des fiches livrées, un par fiche, avec « Validé », « Refusé » et un commentaire (obligatoire
  // pour un refus). Source : frame/help/recette.json (schéma sog-recette/1, généré par tools/recette_build.py : { apps, tests: [{ id, app, title, test, since, state: todo | known | ok | ko, comment?, at? }] }) ; les verdicts
  // sont écrits par le lanceur (recette/verdict → organisation/RECETTE.json, même forme que roadmap/priorities), sinon l'appareil les garde, « non envoyé ». De haut en bas : un résumé, le filtre par application, « Tests du jour »
  // (livrés depuis la dernière recette), « Plus anciens », « En cours : ne pas retester » (un bug connu, dit sur son test : jamais remonté deux fois), « Déjà vus » ; sept tests visibles par section, puis « Voir les n autres ».
  // Contexte donné par frame/app.js : { t, lang, own, root, notify, launcher }. Le fichier et la réponse du lanceur sont des entrées non fiables : tout est échappé, borné et filtré.
  // SOG-0497 : ce qui est en vigueur pour une fiche ou une question est la plus récente des entrées (le magasin de l'appareil d'abord, puis le fichier du lanceur, le dépôt, la liste générée) ;
  // les travaux de l'écran au lanceur passent un par un (il n'en fait tourner qu'un qui écrit) et ce qui est refusé « occupé » ou sans réponse se retente seul ; un geste = un verdict.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const STORE = 'device/recette.json';
  const ID = /^SOG-\d{4}$/;
  const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  const DELIVERED = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/; // la date de livraison d'une fiche : UTC, à la seconde
  const VERDICTS = ['ok', 'ko',
      'reserve'
    ], // SOG-0329 : « accepter avec réserves (pas de retest) » compte comme validé et ne revient pas en recette
    NEEDS_COMMENT = ['ko', 'reserve']; // un refus et des réserves se disent
  const MAX_ITEMS = 1000,
    MAX_COMMENT = 2000, // SOG-0303 : 600 avant ; le lanceur (tools/regen/recette.py) et tools/recette_build.py disent la même limite
    COUNT_FROM = 1800, // le compteur discret apparaît à partir de là
    ROWS_MIN = 4,
    ROWS_MAX = 12,
    SEVEN = 7,
    HIST_MAX = 20, // SOG-0351 : l'historique d'une fiche (tools/regen/recette.py dit la même limite)
    SECTIONS = ['today', 'older', 'known', 'seen'];
  /** Le bouton « Signaler » de la barre d'en-tête (SOG-0316 : « pas trouvé le bug report »). */
  /** Un morceau du résumé : le nombre dit avec la forme du singulier ou du pluriel de la langue. */
  const sumPart = (t, k, n) => t(T.sum[k].map(f => f[n === 1 ? 0 : 1])).replace('{n}', n);
  const reportBtn = t => `<a class="f-report" href="#signaler" data-report title="${esc(t(T.report))}">${esc(t(T.reportShort))}</a>`;
  const T = {
    report: ['Signaler un problème ou une demande', 'Report a problem or make a request', 'Ein Problem melden oder einen Wunsch äußern',
      'Informar de un problema o hacer una petición'
    ],
    reportShort: ['Signaler', 'Feedback', 'Melden', 'Informar'],
    title: ['Recette', 'Acceptance', 'Abnahme', 'Recepción'],
    intro: [
      'Un test fonctionnel par fiche livrée : où aller, quoi faire, quoi voir. « Validé », « Accepter avec réserves » ou « Refusé » (des réserves ou un refus demandent un commentaire ; des réserves ne demandent pas de nouveau test, un refus oui) : l’ergonome lit vos verdicts à chaque tour.',
      'One functional test per delivered card: where to go, what to do, what to see. “Passed”, “Accept with reservations” or “Failed” (reservations or a failure need a comment; reservations need no retest, a failure does): the ergonomist reads your verdicts every round.',
      'Ein Funktionstest je gelieferte Karte: wohin, was tun, was sehen. „Bestanden“, „Mit Vorbehalten akzeptieren“ oder „Abgelehnt“ (Vorbehalte oder eine Ablehnung brauchen einen Kommentar; Vorbehalte brauchen keinen neuen Test, eine Ablehnung schon): Die Ergonomie liest Ihre Urteile in jeder Runde.',
      'Una prueba funcional por ficha entregada: adónde ir, qué hacer, qué ver. «Válido», «Aceptar con reservas» o «Rechazado» (las reservas o un rechazo piden un comentario; las reservas no piden otra prueba, un rechazo sí): la ergonomía lee sus veredictos en cada ronda.'
    ],
    // le résumé (SOG-0329) : « 2 validés (dont 1 avec réserves) · 1 refusé » — la réserve après les validés, le singulier quand il n'y en a qu'un ; un morceau par état, [une, plusieurs]
    sum: {
      todo: [
        ['{n} à valider', '{n} à valider'],
        ['{n} to check', '{n} to check'],
        ['{n} zu prüfen', '{n} zu prüfen'],
        ['{n} por comprobar', '{n} por comprobar']
      ],
      ok: [
        ['{n} validé', '{n} validés'],
        ['{n} passed', '{n} passed'],
        ['{n} bestanden', '{n} bestanden'],
        ['{n} válido', '{n} válidos']
      ],
      ko: [
        ['{n} refusé', '{n} refusés'],
        ['{n} failed', '{n} failed'],
        ['{n} abgelehnt', '{n} abgelehnt'],
        ['{n} rechazado', '{n} rechazados']
      ],
      known: [
        ['{n} en cours', '{n} en cours'],
        ['{n} in progress', '{n} in progress'],
        ['{n} in Arbeit', '{n} in Arbeit'],
        ['{n} en curso', '{n} en curso']
      ]
    },
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
    reserve: ['Accepté avec réserves', 'Accepted with reservations', 'Mit Vorbehalten akzeptiert', 'Aceptado con reservas'],
    reserveBtn: ['Accepter avec réserves', 'Accept with reservations', 'Mit Vorbehalten akzeptieren', 'Aceptar con reservas'],
    withReserves: ['dont {r} avec réserves', 'including {r} with reservations', 'davon {r} mit Vorbehalten',
      'de ellos {r} con reservas'
    ],
    redo: ['Remettre à tester', 'Test again', 'Erneut testen', 'Volver a probar'],
    // SOG-0351 : la note qui NOMME la fiche après un verdict (et offre « Annuler »), le dernier commentaire gardé sous le test, le champ qui dit sa fiche
    noted: {
      ok: ['{id} validée — {title}', '{id} passed — {title}', '{id} bestanden — {title}', '{id} válida — {title}'],
      reserve: ['{id} acceptée avec réserves — {title}', '{id} accepted with reservations — {title}',
        '{id} mit Vorbehalten akzeptiert — {title}',
        '{id} aceptada con reservas — {title}'
      ],
      ko: ['{id} refusée — {title}', '{id} failed — {title}', '{id} abgelehnt — {title}', '{id} rechazada — {title}'],
      redo: ['{id} remise à tester — {title}', '{id} put back to test — {title}', '{id} erneut zu testen — {title}',
        '{id} puesta de nuevo a prueba — {title}'
      ]
    },
    undo: ['Annuler', 'Undo', 'Rückgängig', 'Deshacer'],
    lastNote: {
      ok: ['Dernier verdict ({d}) : validée', 'Last verdict ({d}): passed', 'Letztes Urteil ({d}): bestanden',
        'Último veredicto ({d}): válida'
      ],
      reserve: ['Dernier verdict ({d}) : réserves — {c}', 'Last verdict ({d}): reservations — {c}',
        'Letztes Urteil ({d}): Vorbehalte — {c}', 'Último veredicto ({d}): reservas — {c}'
      ],
      ko: ['Dernier verdict ({d}) : refusée — {c}', 'Last verdict ({d}): failed — {c}', 'Letztes Urteil ({d}): abgelehnt — {c}',
        'Último veredicto ({d}): rechazada — {c}'
      ]
    },
    commentFor: ['{id} — {title} : votre commentaire', '{id} — {title}: your comment', '{id} — {title}: Ihr Kommentar',
      '{id} — {title}: su comentario'
    ],
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
      ],
      reserve: ['Relivré depuis vos réserves du {d} : « {c} »', 'Delivered again since your reservations of {d}: “{c}”',
        'Erneut geliefert seit Ihren Vorbehalten vom {d}: „{c}“', 'Entregada de nuevo desde sus reservas del {d}: «{c}»'
      ]
    },
    needReserve: ['Des réserves demandent un commentaire : dites lesquelles.', 'Reservations need a comment: say which.',
      'Vorbehalte brauchen einen Kommentar: Sagen Sie, welche.',
      'Las reservas piden un comentario: diga cuáles.'
    ],
    need: ['Un refus demande un commentaire : dites ce qui ne va pas.', 'A failure needs a comment: say what is wrong.',
      'Eine Ablehnung braucht einen Kommentar: Sagen Sie, was nicht stimmt.',
      'Un rechazo pide un comentario: diga qué falla.'
    ],
    more: ['Voir les {n} autres', 'Show the other {n}', 'Die anderen {n} zeigen', 'Ver las otras {n}'],
    less: ['Réduire', 'Show fewer', 'Weniger zeigen', 'Reducir'],
    unsent: ['pas encore envoyé', 'not sent yet', 'noch nicht gesendet', 'aún no enviado'],
    sent: ['envoyé', 'sent', 'gesendet', 'enviado'],
    // SOG-0357 (note de Sécurisation) : un verdict lu du DÉPÔT porte son origine ; il ne passe pas pour un verdict donné sur ce poste (l'auteur du fichier du dépôt n'est pas signé)
    fromRepo: ['du téléphone', 'from the phone', 'vom Telefon', 'del teléfono'],
    noRepo: ['Le dépôt des données n’a pas reçu les verdicts : ils restent sur cet appareil et repartiront.',
      'The data repository did not get the verdicts: they stay on this device and will leave again.',
      'Das Datenarchiv hat die Urteile nicht erhalten: Sie bleiben auf diesem Gerät und gehen erneut.',
      'El repositorio de datos no recibió los veredictos: se quedan en este dispositivo y volverán a salir.'
    ],
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
    // SOG-0497 : un verdict que le lanceur n'a pas écrit ne se dit jamais « validée » tout court — la note dit qu'il n'est pas enregistré, et pourquoi ; il part de lui-même plus tard
    unrecorded: ['{note} — pas encore enregistrée. {why}', '{note} — not recorded yet. {why}', '{note} — noch nicht gespeichert. {why}',
      '{note} — aún no registrada. {why}'
    ],
    busy: ['Le lanceur est occupé par un autre travail : le verdict reste sur cet appareil et partira dès qu’il sera libre.',
      'The launcher is busy with another job: the verdict stays on this device and will leave as soon as it is free.',
      'Der Launcher ist mit einer anderen Aufgabe beschäftigt: Das Urteil bleibt auf diesem Gerät und geht, sobald er frei ist.',
      'El lanzador está ocupado con otro trabajo: el veredicto se queda en este dispositivo y saldrá en cuanto esté libre.'
    ],
    down: ['Le lanceur ne répond pas : le verdict reste sur cet appareil et partira à son retour.',
      'The launcher does not answer: the verdict stays on this device and will leave when it is back.',
      'Der Launcher antwortet nicht: Das Urteil bleibt auf diesem Gerät und geht, wenn er zurück ist.',
      'El lanzador no responde: el veredicto se queda en este dispositivo y saldrá cuando vuelva.'
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
  T.dCopied = ['Identifiant copié.', 'Identifier copied.', 'Kennung kopiert.', 'Identificador copiado.'];
  T.dCopyManual = ['Copie impossible ici : l’identifiant est sélectionné sous la carte, copiez-le à la main.',
    'Could not copy here: the identifier is selected under the card, copy it by hand.',
    'Kopieren ist hier nicht möglich: Die Kennung ist unter der Karte markiert, kopieren Sie sie von Hand.',
    'No se puede copiar aquí: el identificador está seleccionado bajo la tarjeta, cópielo a mano.'
  ];
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
  // ---- les chemins de test (frame/lib/recette_paths.js ; décision de l'ergonome, Q4 du 21 nov. 2026) : quelques parcours qui valident beaucoup de fiches d'un coup, avant les essais isolés
  T.pathsTitle = ['Chemins de test', 'Test paths', 'Testpfade', 'Rutas de prueba'];
  T.majorsTitle = ['À voir en premier', 'To see first', 'Zuerst ansehen', 'Para ver primero'];
  T.restTitle = ['Les tests qu’aucun chemin ne couvre', 'The tests no path covers', 'Die Tests, die kein Pfad abdeckt',
    'Las pruebas que ninguna ruta cubre'
  ];
  T.noTestTitle = ['Sans test', 'No test', 'Ohne Test', 'Sin prueba'];
  T.covered = [
    ['{n} test couvert', '{n} tests couverts'],
    ['{n} test covered', '{n} tests covered'],
    ['{n} Test abgedeckt', '{n} Tests abgedeckt'],
    ['{n} prueba cubierta', '{n} pruebas cubiertas']
  ];
  T.stepsDone = ['{k} étape(s) jouée(s) sur {n}', '{k} of {n} step(s) played', '{k} von {n} Schritt(e) gespielt',
    '{k} de {n} paso(s) probado(s)'
  ]; // « 3 étapes jouées sur 4 » : les marques (s) sont accordées par le cadre (plural.js)
  T.stepOk = ['Bon', 'Good', 'Gut', 'Bien'];
  T.stepKo = ['Mauvais', 'Bad', 'Schlecht', 'Mal'];
  T.stepSkip = ['Non jouée', 'Not played', 'Nicht gespielt', 'No probado'];
  T.stepNeed = ['Dites ce qui ne va pas.', 'Say what is wrong.', 'Sagen Sie, was nicht stimmt.',
    'Diga qué falla.'
  ]; // sous un « Mauvais » sans mots : il n'y a pas de refus ici
  T.optional = ['si l’occasion se présente', 'if the opportunity arises', 'wenn sich die Gelegenheit bietet',
    'si se presenta la ocasión'
  ];
  T.pathAll = ['Tout le chemin est bon', 'The whole path is good', 'Der ganze Pfad ist gut', 'Todo el recorrido está bien'];
  T.pathRest = ['Les autres étapes sont bonnes', 'The other steps are good', 'Die anderen Schritte sind gut',
    'Los demás pasos están bien'
  ]; // dès qu’un pas est mauvais, le bouton reste actif et change de nom : il joue les pas sans verdict, jamais le mauvais
  T.stepResult = ['Résultat de l’étape {n}', 'Result of step {n}', 'Ergebnis von Schritt {n}', 'Resultado del paso {n}'];
  T.stepCommentFor = ['{p}, étape {n} : ce qui ne va pas', '{p}, step {n}: what is wrong', '{p}, Schritt {n}: was nicht stimmt',
    '{p}, paso {n}: qué falla'
  ];
  T.pathNoted = {
    ok: ['Chemin {p} : {n} fiche(s) validée(s)', 'Path {p}: {n} card(s) passed', 'Pfad {p}: {n} Karte(n) bestanden',
      'Ruta {p}: {n} ficha(s) válida(s)'
    ],
    ko: ['Chemin {p} : {n} fiche(s) refusée(s)', 'Path {p}: {n} card(s) failed', 'Pfad {p}: {n} Karte(n) abgelehnt',
      'Ruta {p}: {n} ficha(s) rechazada(s)'
    ]
  };
  /** Ligne [fr, en, de, es] d'un texte du fichier ({ fr, en, de, es }) ; une langue absente reprend l'anglais, puis le français. */
  const row = o => {
    if (typeof o === 'string') return o;
    const en = o?.en || o?.fr || '';
    return [o?.fr || en, en, o?.de || en, o?.es || en];
  };
  /** Un texte borné, sans caractère de commande. */
  const text = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '';
  /** Un verdict lu d'ailleurs (le fichier du lanceur, le magasin de l'appareil, le fichier généré) : { verdict, comment?, at? } aux règles, sinon null ; un refus sans commentaire n'est pas un verdict. */
  // les règles d'une entrée (un verdict, son historique, une fiche remise à tester) sont celles de frame/lib/recette_verdicts.js — les mêmes que celles de l'adaptateur qui écrit le fichier du dépôt (SOG-0357) ;
  // la bibliothèque est chargée au début de l'écran
  let R = null,
    TM = null,
    PA = null;
  const histItem = v => R.histItem(v);
  const histOf = h => R.histOf(h);
  const entryOf = v => R.entryOf(v);
  /** Le verdict qu'une nouvelle livraison a remplacé (donné par le générateur) : { verdict, comment?, at? } aux règles, sinon null ; contrairement à
   *  entryOf, un refus sans commentaire reste dicible (« Relivré depuis votre refus du … »). */
  const previousEntry = v => {
    if (!v || typeof v !== 'object' || !VERDICTS.includes(v.verdict)) return null;
    const e = {
        verdict: v.verdict
      },
      c = text(v.comment, MAX_COMMENT);
    if (c) e.comment = c;
    if (typeof v.at === 'string' && AT.test(v.at)) e.at = v.at;
    return e;
  };
  /** Une carte de verdicts lue d'ailleurs : seules les entrées aux règles (identifiant SOG-nnnn), 1000 au plus. */
  const cleanMap = m => R.cleanMap(m);
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
      open: Object.fromEntries(SECTIONS.map(k => [k, s?.open?.[k] === true])),
      popen: s?.popen && typeof s.popen === 'object' && !Array.isArray(s.popen) ? s.popen :
      {}, // les chemins dépliés ou repliés (recette_paths.js)
      steps: s?.steps ?? null // les états de pas de l'appareil, relus par PA.stepsOf
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
  // SOG-0323 (Q-0048 : « truncated by design ») : 300 / 500 / 200 avant ; la question, son contexte et chaque réponse s'affichent en entier (tools/recette_build.py dit les mêmes bornes)
  const MAX_QUESTION = 2000,
    MAX_OPT = 600;
  /** Un texte de la feuille pour l'écran : échappé, et une adresse http(s) écrite dedans devient un lien qui s'ouvre dans un autre onglet (rien d'autre ne devient lien : ni javascript:, ni balise). */
  const rich = s => {
    s = String(s ?? '');
    let out = '',
      i = 0;
    for (const m of s.matchAll(/https?:\/\/[^\s<>"'`]+/g)) {
      const u = m[0].replace(/[.,;:!?)\]]+$/, '');
      try {
        new URL(u);
      } catch {
        continue;
      }
      out += `${esc(s.slice(i, m.index))}<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`;
      i = m.index + u.length;
    }
    return out + esc(s.slice(i));
  };
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
      const options = (Array.isArray(q.options) ? q.options : []).map(o => text(typeof o === 'string' ? o : o?.text, MAX_OPT)).filter(
        Boolean).slice(0, 6);
      return {
        id: q.id,
        fiche: typeof q.fiche === 'string' && ID.test(q.fiche) ? q.fiche : '',
        app: typeof q.app === 'string' ? q.app.slice(0, 20) : '',
        question: text(q.question, MAX_QUESTION),
        context: text(q.context, MAX_QUESTION),
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
    R ||= await import(new URL('frame/lib/recette_verdicts.js', c.root).href);
    TM ||= await import(new URL('frame/lib/time.js', c.root).href).catch(() => null);
    PA ||= await import(new URL('frame/lib/recette_paths.js', c.root).href).catch(() =>
      null); // sans elle : pas de chemins, la liste d'avant
    const d = await load(c);
    if (!d || !Array.isArray(d.tests)) {
      view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-card">${esc(t(T.missing))}</p>`;
      return;
    }
    const P = PA ? PA.pathsOf(d.paths) : null; // les chemins de test : une entrée non fiable, relue ici
    const noTestIds = new Set(P?.noTest.map(n => n.id) || []); // sortis de la liste, avec leur raison
    const tests = d.tests.filter(x => x && typeof x === 'object' && ID.test(x.id)).slice(0, MAX_ITEMS).map(x => ({
      id: x.id,
      app: typeof x.app === 'string' ? x.app.slice(0, 20) : '',
      title: x.title,
      test: text(x.test, 700),
      since: /^\d{4}-\d{2}-\d{2}$/.test(String(x.since)) ? x.since : '',
      state: ['todo', 'known', ...VERDICTS].includes(x.state) ? x.state : 'todo',
      // la date de la dernière livraison de la fiche (UTC, « AAAA-MM-JJThh:mm:ssZ ») et le verdict qu'elle a remplacé : lus comme des entrées non fiables
      delivered: typeof x.delivered === 'string' && DELIVERED.test(x.delivered) ? x.delivered : '',
      previous: previousEntry(x.previous),
      history: histOf(x.history),
      gen: VERDICTS.includes(x.state) ? entryOf({
        verdict: x.state,
        comment: x.comment,
        at: x.at,
        history: x.history
      }) : null
    })).filter(x => !noTestIds.has(x.id));
    const apps = (Array.isArray(d.apps) ? d.apps : []).filter(a => typeof a === 'string' && tests.some(x => x.app === a));
    const saved = await readStore(c);
    const savedD = await readStoreD(c);
    const ui = {
      app: '',
      file: {},
      // les verdicts écrits par le lanceur
      fileRead: false,
      repo: {}, // SOG-0357 : les verdicts du fichier du dépôt (pilot/<trigramme>/recette/verdicts.json), entrée non fiable
      repoRead: false,
      local: saved.pending,
      // ceux de cet appareil, pas encore envoyés (null : à retirer)
      unsent: new Set(saved.unsent),
      lastGesture: '', // la fiche (ou la question) du dernier geste, tant qu'aucun autre bouton de geste n'a été touché (SOG-0497)
      why: '', // pourquoi le dernier verdict n'est pas parti (SOG-0497) : busy, offline, unknown, failed, ou la raison du lanceur (no-organisation…)
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
      dwhy: '', // pourquoi la dernière réponse n'est pas partie : unknown (le lanceur n'a pas ce verbe), offline, failed
      // les chemins de test : les états de pas (clé « C1:3 »), le pas dont on écrit les mots, les chemins repliés ou dépliés, les replis ouverts (le temps de l'écran)
      steps: PA && P ? PA.stepsOf(saved.steps, P.paths) : {},
      sdraft: {},
      sko: '',
      sneed: '',
      popen: Object.fromEntries(Object.entries(saved.popen).filter(([k, v]) => PA?.PID.test(k) && typeof v === 'boolean').slice(0,
        30)),
      copen: {}
    };
    // ---- ce que dit un test : son verdict en vigueur (l'appareil, puis le lanceur, puis le fichier généré), ou rien
    /** L'entrée en vigueur d'une fiche dans les FICHIERS : la plus récente, par son heure, de celle du lanceur (organisation/RECETTE.json) et de celle du dépôt (le téléphone) — SOG-0357. */
    // SOG-0497 : la liste générée entre aussi dans le départage — la plus récente des trois l'emporte (le fichier du lanceur d'abord à heure égale) ; un fichier lu ne fait jamais reculer un verdict plus récent
    const fileEntry = x => R.latest(ui.fileRead ? ui.file[x.id] : null, ui.repoRead ? ui.repo[x.id] : null, x.gen) || null;
    const rawEntry = x => Object.hasOwn(ui.local, x.id) ? ui.local[x.id] : fileEntry(x);
    /** Le verdict en vigueur vient-il du fichier du DÉPÔT (le téléphone), sur un poste qui a son propre fichier (un lanceur) ? Il le dit : « du téléphone » — il ne passe pas pour un verdict donné ici. */
    const fromRepoOf = x => !!launcher() && !Object.hasOwn(ui.local, x.id) && !!ui.repo[x.id] && rawEntry(x) === ui.repo[x.id];
    const rawVerdict = x => {
      const e = rawEntry(x);
      return e && e.verdict ? e : null; // une fiche remise à tester n'a plus de verdict en vigueur (SOG-0351)
    };
    /** L'historique d'une fiche : les verdicts qu'elle a remplacés ou qu'on a remis à tester, jamais effacés (SOG-0351). */
    const historyOf = x => rawEntry(x)?.history || x.history || [];
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
        days = tests.map(x => fileEntry(x)).filter((v, i) => v && v.verdict && !superseded(tests[i], v)).map(
          v => v.at
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
    const fitAll = root => root.querySelectorAll('textarea[data-comment], textarea[data-dtext], textarea[data-step-comment]').forEach(
      fit);
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
    const item = (x, flat = false) => {
      const v = verdictOf(x);
      const head = `<p><span class="f-rm-id">${esc(x.id)}</span> <b>${esc(t(row(x.title)))}</b>${x.since ? ` <small class="f-muted">${esc(t(T.since, { d: x.since }))}</small>` : ''}${ui.unsent.has(x.id) ? ` <small class="f-rm-unsent" data-unsent>${esc(t(T.unsent))}</small>` : ''}</p>
        <p class="f-rc-test" lang="fr" data-test>${esc(x.test)}</p>`;
      if (known(x)) return `<li class="f-rc-item" data-id="${esc(x.id)}" data-state="known">${head}<p class="f-muted" data-known>${esc(t(T.knownLine))}</p></li>`;
      if (v) return `<li class="f-rc-item" data-id="${esc(x.id)}" data-state="${v.verdict}">${head}<p data-verdict="${v.verdict}">${flat ? `<span class="f-rc-apptag" data-app-tag>${esc(appName(x.app))}</span> ` : ''}<b>${esc(t(T[v.verdict]))}</b>${v.at ? ` <small class="f-muted" data-verdict-at title="${esc(v.at)}">${esc(TM?.fmtMoment ? TM.fmtMoment(v.at, c.lang?.() || 'fr') : `${v.at.slice(0, 10)} ${v.at.slice(11, 16)}Z`)}</small>` : ''}${fromRepoOf(x) ? ` <small class="f-rm-origin" data-origin>${esc(t(T.fromRepo))}</small>` : ''}${ui.unsent.has(x.id) ? '' : ` <small class="f-rm-sent" data-sent>${esc(t(T.sent))}</small>`}${v.comment ? ` — ${esc(v.comment)}` : ''}</p>
        <div class="f-row"><button type="button" data-redo="${esc(x.id)}">${esc(t(T.redo))}</button></div></li>`;
      const p = previousOf(x),
        why = p ? `<p class="f-muted" data-redelivered="${p.verdict}">${esc(t(T.redelivered[p.verdict === 'ko' && !p.comment ? 'koBare' : p.verdict === 'reserve' && !p.comment ? 'ok' : p.verdict], { d: (p.at || x.delivered || '').slice(0, 10), c: p.comment || '' }))}</p>` : '';
      const hist = historyOf(x),
        last = hist[hist.length - 1],
        // le dernier verdict gardé de la fiche, en gris sous le test (SOG-0351) : ce que l'utilisateur a écrit n'est jamais perdu en remettant à tester
        lastLine = last && !(p && p.comment === last.comment && p.verdict === last.verdict) ? `<p class="f-muted" data-last-note="${last.verdict}">${esc(t(T.lastNote[last.verdict], { d: (last.at || '').slice(0, 10), c: last.comment || '' }))}</p>` : '',
        who = t(T.commentFor, {
          id: x.id,
          title: t(row(x.title))
        });
      return `<li class="f-rc-item" data-id="${esc(x.id)}" data-state="todo">${head}${why}${lastLine}
        <label class="f-field"><span data-comment-for>${esc(who)}</span><textarea data-comment="${esc(x.id)}" aria-label="${esc(who)}" placeholder="${esc(x.id)}" rows="${ROWS_MIN}" maxlength="${MAX_COMMENT}">${esc(ui.draft[x.id] || '')}</textarea>${counter(ui.draft[x.id])}</label>
        ${ui.need === x.id ? `<p class="f-warn" data-need>${esc(t(ui.needKind === 'reserve' ? T.needReserve : T.need))}</p>` : ''}
        <div class="f-row"><button type="button" class="primary" data-ok="${esc(x.id)}">${esc(t(T.ok))}</button><button type="button" data-reserve="${esc(x.id)}">${esc(t(T.reserveBtn))}</button><button type="button" data-ko="${esc(x.id)}">${esc(t(T.ko))}</button></div></li>`;
    };
    // ---- les chemins de test (frame/lib/recette_paths.js) : les pas, leurs trois états (bon, mauvais, non jouée) et le verdict de leurs fiches (la règle : derive)
    const cites = P ? PA.citesOf(P.paths) : new Map();
    const cover = P ? PA.coverage(P.paths, tests.filter(x => !known(x)).map(x => x.id)) :
      new Map(); // essai → le premier chemin qui le couvre : jamais listé deux fois
    const stepAt = new Map();
    for (const p of P?.paths || []) p.steps.forEach((s, i) => stepAt.set(PA.stepKey(p.id, i), {
      p,
      s,
      i
    }));
    const stepState = k => ui.steps[k]?.s || null;
    const usePaths = () => !!P && !ui.app; // filtré par application, la liste est celle d'avant : tous les essais de l'application
    const pathOpen = p => Object.hasOwn(ui.popen, p.id) ? ui.popen[p.id] : !p.folded;
    const cnt = (forms, n) => t(forms.map(f => f[n === 1 ? 0 : 1])).replace('{n}', n);
    const stepHtml = (p, s, i) => {
      const k = PA.stepKey(p.id, i),
        st = stepState(k),
        e = ui.steps[k],
        asking = ui.sko === k,
        who = t(T.stepCommentFor, {
          p: p.id,
          n: i + 1
        }),
        btn = (kind, label) => `<button type="button" data-sbtn="${kind}" data-skey="${esc(k)}" aria-pressed="${st === kind || (kind === 'skip' && !st)}">${esc(label)}</button>`;
      return `<li class="f-rc-item f-rc-step" data-step="${esc(k)}" data-state="${st || 'todo'}"${s.optional ? ' data-optional' : ''}>
        <p class="f-rc-gesture"><b class="f-rm-id">${i + 1}.</b> <span lang="fr" data-gesture>${esc(s.gesture)}</span>${s.optional ? ` <small class="f-muted" data-optional-tag>${esc(t(T.optional))}</small>` : ''}</p>
        ${s.expect ? `<p class="f-rc-test" lang="fr" data-expect>${esc(s.expect)}</p>` : ''}
        ${st === 'ko' && e.c && !asking ? `<p data-step-note>${esc(e.c)}</p>` : ''}
        ${asking ? `<label class="f-field"><span data-comment-for>${esc(who)}</span><textarea data-step-comment="${esc(k)}" aria-label="${esc(who)}" rows="${ROWS_MIN}" maxlength="${MAX_COMMENT}">${esc(ui.sdraft[k] ?? e?.c ?? '')}</textarea>${counter(ui.sdraft[k] ?? e?.c)}</label>${ui.sneed === k ? `<p class="f-warn" data-need>${esc(t(T.stepNeed))}</p>` : ''}` : ''}
        <div class="f-row" role="group" aria-label="${esc(t(T.stepResult, { n: i + 1 }))}">${btn('ok', t(T.stepOk))}${btn('ko', t(T.stepKo))}${btn('skip', t(T.stepSkip))}</div></li>`;
    };
    const pathHtml = p => {
      const played = p.steps.filter((s, i) => stepState(PA.stepKey(p.id, i))).length,
        mineT = tests.filter(x => cover.get(x.id) === p.id).sort((a, b) => a.id.localeCompare(b.id)),
        todoN = mineT.filter(x => !verdictOf(x)).length,
        toPlay = p.steps.some((s, i) => !s.optional && !stepState(PA.stepKey(p.id, i))),
        anyBad = p.steps.some((s, i) => stepState(PA.stepKey(p.id, i)) === 'ko');
      return `<details class="f-rc-sec f-rc-path" data-path="${esc(p.id)}"${pathOpen(p) ? ' open' : ''}><summary><b><span class="f-rm-id">${esc(p.id)}</span> <span lang="fr">${esc(p.title)}</span></b>${p.where ? ` <small class="f-muted" lang="fr" data-where>${esc(p.where)}</small>` : ''}${p.steps.length ? ` <small class="f-muted" data-progress>${esc(t(T.stepsDone, { k: played, n: p.steps.length }))}</small>` : ''}${p.note ? ` <small class="f-muted" lang="fr" data-summary-note>${esc(p.note)}</small>` : ''}</summary>
        ${p.note || p.ref ? `<p class="f-muted" data-path-note>${p.note ? `<span lang="fr">${esc(p.note)}</span>` : ''}${p.ref ? ` <span class="f-rm-id">${esc(p.ref)}</span>` : ''}</p>` : ''}
        ${p.steps.length ? `<ol class="f-rc-list" data-steps>${p.steps.map((s, i) => stepHtml(p, s, i)).join('')}</ol>` : ''}
        ${toPlay ? `<div class="f-row"><button type="button" class="primary" data-path-all="${esc(p.id)}">${esc(t(anyBad ? T.pathRest : T.pathAll))}</button></div>` : ''}
        ${mineT.length ? `<details class="f-rc-covered" data-covered="${esc(p.id)}"${ui.copen[p.id] ? ' open' : ''}><summary>${esc(cnt(T.covered, mineT.length))}${todoN ? ` · ${esc(sumPart(t, 'todo', todoN))}` : ''}</summary><ul class="f-rc-list">${mineT.map(x => item(x)).join('')}</ul></details>` : ''}</details>`;
    };
    /** Change l'état de pas ([{ key, state: 'ok' | 'ko' | null, comment? }]) et écrit le verdict de leurs fiches d'après tous les pas qui les citent (derive) : UN enregistrement, UNE note, UN « Annuler ». */
    const applySteps = async (changes, focus) => {
      const before = {
          steps: {},
          fich: {}
        },
        stamp = now();
      for (const ch of changes) {
        before.steps[ch.key] = ui.steps[ch.key] ?? null;
        if (ch.state) ui.steps[ch.key] = {
          s: ch.state,
          g: PA.gist(stepAt.get(ch.key).s.gesture),
          ...(ch.comment ? {
            c: ch.comment
          } : {}),
          at: stamp
        };
        else delete ui.steps[ch.key];
        delete ui.sdraft[ch.key];
      }
      ui.sko = '';
      ui.sneed = '';
      let n = 0,
        bad = false;
      for (const f of new Set(changes.filter(ch => ch.state).flatMap(ch => stepAt.get(ch.key).s.fiches))) {
        const x = tests.find(y => y.id === f),
          e = x && !known(x) ? PA.derive(cites.get(f), ui.steps) : null,
          cur = x ? verdictOf(x) : null;
        if (!e || (cur && cur.verdict === e.verdict && (e.verdict === 'ok' || cur.comment === e.comment))) continue;
        const prev = snapshot(f),
          hist = keepHistory(prev);
        before.fich[f] = prev;
        ui.local[f] = {
          ...e,
          at: stamp,
          ...(hist.length ? {
            history: hist
          } : {})
        };
        ui.unsent.add(f);
        delete ui.draft[f];
        n++;
        bad ||= e.verdict === 'ko';
      }
      await saveStore(c, {
        pending: ui.local,
        unsent: [...ui.unsent],
        steps: ui.steps
      });
      draw(focus);
      if (!n) return; // aucun verdict n'est écrit (« Non jouée », ou des pas encore à jouer) : l'état du pas est gardé, sans note
      const sent = await send(true);
      draw(focus);
      const note = t(T.pathNoted[bad ? 'ko' : 'ok'], {
        p: stepAt.get(changes[0].key).p.id,
        n
      });
      c.notify?.(sent ? note : t(T.unrecorded, {
        note,
        why: whyText()
      }), bad || !sent ? 'warn' : 'ok', {
        key: 'recette-undo',
        ms: 15000,
        action: {
          label: t(T.undo),
          run: async () => {
            for (const [k, v] of Object.entries(before.steps)) {
              if (v) ui.steps[k] = v;
              else delete ui.steps[k];
            }
            for (const [f, v] of Object.entries(before.fich)) {
              ui.local[f] = v; // l'état d'avant (null : la fiche n'avait aucune entrée)
              ui.unsent.add(f);
            }
            await saveStore(c, {
              pending: ui.local,
              unsent: [...ui.unsent],
              steps: ui.steps
            });
            draw();
            if (await send(false)) draw();
          }
        }
      });
    };
    /** Un toucher sur « Bon », « Mauvais » ou « Non jouée » d'un pas : « Mauvais » ouvre le champ des mots (obligatoires) puis enregistre ; « Non jouée » n'écrit rien. */
    const stepGesture = async (key, kind) => {
      if (!stepAt.has(key)) return;
      const sel = `[data-skey="${CSS.escape(key)}"][data-sbtn="${kind}"]`;
      if (kind === 'ko') {
        const ta = `[data-step-comment="${CSS.escape(key)}"]`;
        if (ui.sko !==
          key
        ) { // premier toucher : le champ s'ouvre, et dit qu'il faut des mots (un pas déjà mauvais s'ouvre rempli, sans reproche)
          ui.sko = key;
          ui.sneed = ui.steps[key]?.s === 'ko' ? '' : key;
          return draw(ta);
        }
        const comment = text(ui.sdraft[key] ?? view.querySelector(ta)?.value ?? ui.steps[key]?.c, MAX_COMMENT);
        if (!comment) {
          ui.sneed = key;
          return draw(ta);
        }
        return applySteps([{
          key,
          state: 'ko',
          comment
        }], sel);
      }
      if (kind === 'skip') {
        ui.sko = '';
        ui.sneed = '';
        delete ui.steps[key];
        delete ui.sdraft[key];
        await saveStore(c, {
          steps: ui.steps
        });
        return draw(sel);
      }
      return applySteps([{
        key,
        state: 'ok'
      }], sel);
    };
    const pathAll = pid => {
      const p = P?.paths.find(q => q.id === pid);
      if (!p) return;
      const changes = p.steps.map((s, i) => ({
        key: PA.stepKey(p.id, i),
        s
      })).filter(({
        key,
        s
      }) => !s.optional && !stepState(key)).map(({
        key
      }) => ({
        key,
        state: 'ok'
      }));
      if (changes.length) applySteps(changes, `[data-path="${CSS.escape(pid)}"] summary`);
    };
    /** Une section : ses tests par application, sept visibles puis « Voir les n autres » ; hors « Tests du jour » elle est repliée jusqu'à un toucher sur son titre. */
    const sectionHtml = (k, list) => {
      if (!list.length) return '';
      if (k ===
        'seen'
      ) { // SOG-0355 : UNE suite, sans groupe par application, le dernier verdict en tête, l'application en étiquette et l'heure du verdict sur chaque ligne
        const flat = [...list].sort((a, b) => String(verdictOf(b)?.at || '').localeCompare(String(verdictOf(a)?.at || '')) || a.id
            .localeCompare(b.id)),
          all = ui.more[k],
          vis = all ? flat : flat.slice(0, SEVEN),
          rest = flat.length - vis.length;
        const more = rest > 0 ? `<p><button type="button" data-more="${k}">${esc(t(T.more, { n: rest }))}</button></p>` : all && flat.length > SEVEN ? `<p><button type="button" data-more="${k}">${esc(t(T.less))}</button></p>` : '';
        return `<details class="f-rc-sec" data-section="${k}"${ui.open[k] ? ' open' : ''}><summary><b>${esc(t(T.section[k]))} <span class="f-muted" data-count>(${flat.length})</span></b></summary><ul class="f-rc-list" data-seen-list>${vis.map(x => item(x, true)).join('')}</ul>${more}</details>`;
      }
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
    // SOG-0497 : la réponse du fichier du lanceur et celle de la liste générée se départagent par l'heure (la plus récente) ; la liste n'est recompilée qu'à l'intégration
    const answerNow = q => Object.hasOwn(ui.dlocal, q.id) ? ui.dlocal[q.id] : R.latest(ui.dfileRead ? ui.dfile[q.id] : null, q.gen) ||
      null;
    const undecided = () => questions.filter(q => !answerNow(q)).length;
    const decisionItem = q => {
      const a = answerNow(q),
        editing = !a || ui.dedit.has(q.id),
        head = `<p><button type="button" class="f-rm-id" data-copy="${esc(q.fiche || q.id)}" title="${esc(t(T.dCopy))}">${esc(q.fiche || q.id)}</button> <small class="f-muted">${esc(q.id)}${q.app ? ` · ${esc(appName(q.app))}` : ''}</small>${Object.hasOwn(ui.dlocal, q.id) ? ` <small class="f-warn" data-unsent>${esc(t(ui.dwhy === 'unknown' ? T.dUnknown : T.unsent))}</small>` : ''}</p>
        <p><b>${rich(q.question)}</b></p>${q.context ? `<p class="f-muted" data-context>${rich(q.context)}</p>` : ''}`;
      if (!editing) return `<li class="f-rc-item" data-q="${esc(q.id)}" data-state="answered">${head}<p data-answer><b>${esc(t(T.dYours))}</b> : ${a.choice !== null && q.options[a.choice] ? rich(q.options[a.choice]) : ''}${a.choice !== null && a.text ? ' · ' : ''}${esc(a.text)}${a.at ? ` <small class="f-muted">${esc(a.at.slice(0, 10))}</small>` : ''}</p>
        <div class="f-row"><button type="button" data-dmod="${esc(q.id)}">${esc(t(T.dModify))}</button></div></li>`;
      const dr = ui.ddraft[q.id] || {
        choice: a?.choice ?? null,
        text: a?.text || ''
      };
      return `<li class="f-rc-item" data-q="${esc(q.id)}" data-state="todo">${head}
        <div role="radiogroup" aria-label="${esc(q.question)}">${q.options.map((o, i) => `<label class="f-rc-opt"><input type="radio" name="dq-${esc(q.id)}" value="${i}" data-dchoice="${esc(q.id)}"${dr.choice === i ? ' checked' : ''}> ${rich(o)}${q.recommended === i ? ` <small class="f-muted" data-proposed>(${esc(t(T.dProposed))})</small>` : ''}</label>`).join('')}</div>
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
          sel: ae.hasAttribute('data-dtext') ? 'data-dtext' : ae.hasAttribute('data-comment') ? 'data-comment' : ae.hasAttribute(
            'data-step-comment') ? 'data-step-comment' : '',
          id: ae.getAttribute('data-dtext') ?? ae.getAttribute('data-comment') ?? ae.getAttribute('data-step-comment'),
          from: ae.selectionStart,
          to: ae.selectionEnd
        } : null;
      const mine = shownTests();
      const by = Object.fromEntries(SECTIONS.map(k => [k, mine.filter(x => sectionOf(x) === k)]));
      const n = k => by[k].length,
        verdictN = v => mine.filter(x => !known(x) && verdictOf(x)?.verdict === v).length;
      // les chemins d'abord, puis « À voir en premier » (les essais majeurs qu'aucun chemin ne couvre), puis les autres essais ; un essai couvert est sous son chemin, jamais deux fois
      const withPaths = usePaths();
      const majors = withPaths ? mine.filter(x => P.majors.includes(x.id) && !cover.has(x.id) && !known(x) && ['today', 'older']
        .includes(sectionOf(x))) : [];
      const shown = Object.fromEntries(SECTIONS.map(k => [k, withPaths ? by[k].filter(x => !cover.has(x.id) && !majors.includes(x)) :
        by[k]
      ]));
      const pathsPart = !withPaths ? '' : `${P.paths.length ? `<section class="f-rc-paths" data-paths><h2>${esc(t(T.pathsTitle))}</h2>${P.preamble ? `<p class="f-muted" lang="fr" data-preamble>${esc(P.preamble)}</p>` : ''}${P.paths.map(pathHtml).join('')}</section>` : ''}${majors.length || SECTIONS.some(k => shown[k].length) ? `<h2 class="f-rc-rest" data-rest>${esc(t(T.restTitle))}</h2>` : ''}${majors.length ? `<section class="f-rc-sec" data-majors><h3>${esc(t(T.majorsTitle))} <span class="f-muted" data-count>(${majors.length})</span></h3><ul class="f-rc-list">${majors.map(x => item(x)).join('')}</ul></section>` : ''}`;
      const noTestPart = withPaths && P.noTest.length ? `<details class="f-rc-sec f-rc-covered" data-covered="notest"${ui.copen.notest ? ' open' : ''}><summary><b>${esc(t(T.noTestTitle))} <span class="f-muted" data-count>(${P.noTest.length})</span></b></summary><ul class="f-rc-list">${P.noTest.map(n => `<li class="f-rc-item" data-id="${esc(n.id)}" data-state="notest"><p><span class="f-rm-id">${esc(n.id)}</span> <b>${esc(t(row(n.title)))}</b></p><p class="f-muted" lang="fr">${esc(n.reason)}</p></li>`).join('')}</ul></details>` : '';
      const tabs = questions.length ? `<div class="f-rm-bar" role="tablist" data-tabs>${['tests', 'decisions'].map(k => `<button type="button" class="f-rm-btn" data-tab="${k}" aria-pressed="${ui.tab === k}">${esc(k === 'tests' ? t(T.tabTests) : t(T.tabDecide, { n: undecided() }))}</button>`).join('')}</div>` : '';
      view.innerHTML = `<div class="f-docbar"><h1>${esc(t(T.title))}</h1>${reportBtn(t)}</div>${tabs}${ui.tab === 'decisions' && questions.length ? decisionsPanel() : `        <p class="f-muted">${esc(t(T.intro))}</p>
        <p data-summary>${esc([sumPart(t, 'todo', n('today') + n('older')), sumPart(t, 'ok', verdictN('ok') + verdictN('reserve')) + (verdictN('reserve') ? ` (${t(T.withReserves, { r: verdictN('reserve') })})` : ''), sumPart(t, 'ko', verdictN('ko')), sumPart(t, 'known', n('known'))].join(' · '))}</p>
        <div class="f-rm-bar" data-apps>${[''].concat(apps).map(a => `<button type="button" class="f-rm-btn" data-app="${esc(a)}" aria-pressed="${ui.app === a}">${esc(a ? appName(a) : t(T.all))}</button>`).join('')}</div>
        ${pathsPart}${mine.length ? SECTIONS.map(k => sectionHtml(k, shown[k])).join('') : !pathsPart ? `<p class="f-muted" data-nothing>${esc(t(T.nothing))}</p>` : ''}${noTestPart}`}`;
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
    // SOG-0497 : le lanceur ne fait tourner qu'UN travail qui écrit à la fois (tools/regen_jobs.py) et recette/verdict, recette/decision en sont : lancés ensemble (les deux lectures de
    // l'ouverture), le second était refusé « occupé » (409) et l'écran retombait sur la liste générée — les réponses et les verdicts du jour « revenaient » après un rafraîchissement.
    // Les travaux de cet écran passent donc l'un après l'autre ; un refus « occupé » ou un lanceur muet se retente plus tard (heal).
    let jobs = Promise.resolve();
    const job = (verb, args) => {
      const L = launcher();
      if (!L) return Promise.resolve(null);
      const p = jobs.then(() => L.job('regen/job', {
        set: 'recette',
        verb,
        args
      })).catch(() => null);
      jobs = p.then(() => {}, () => {});
      return p;
    };
    /** La raison d'un travail refusé : busy (un autre travail tient la place), offline (le lanceur ne répond pas), unknown (verbe inconnu d'un lanceur plus ancien), failed (le reste). */
    const whyOf = r => r?.offline || !r ? 'offline' : r.status === 409 ? 'busy' : r.status === 400 && /unknown operation/.test(String(r
      .message || '')) ? 'unknown' : 'failed';
    /** Appel du verbe recette/verdict du lanceur : son résultat, ou null (pas de lanceur, lanceur sans ce verbe, travail en échec ; la raison dans ui.why). */
    const callRec = async args => {
      if (!launcher()) return null;
      const r = await job('verdict', args);
      ui.why = r?.ok ? r.result?.ok === false ? String(r.result.reason || 'failed') : '' : whyOf(r);
      return r?.ok && r.result && typeof r.result === 'object' ? r.result : null;
    };
    let sending = Promise.resolve(); // les envois se suivent : jamais deux à la fois
    let pulling = Promise.resolve();
    /** Les verdicts du fichier avec ceux de l'appareil (un retrait : `null`) ; vrai si le lanceur les a écrits (les « non envoyé » disparaissent), faux sinon (avec la raison dite). */
    const send = quiet => sending = sending.then(async () => {
      await pulling; // ce que le fichier porte déjà est lu avant d'écrire
      if (!launcher()) return sendRepo(
        quiet); // SOG-0357 : sans lanceur, le verdict part dans le dépôt des données, dans le fichier du trigramme de l'appareil
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
    /** Le fichier du dépôt pour cet appareil : `pilot/<trigramme>/recette/verdicts.json`, ou '' sans trigramme. */
    const repoPath = () => R.pathOf(c.trigram?.() || '');
    /** Relit le fichier du dépôt (entrée non fiable : aux règles, borné) ; les verdicts qu'il porte sont ceux de tout appareil de ce trigramme. */
    const readRepo = async () => {
      const path = repoPath();
      if (!path || !c.recData?.read) return false;
      try {
        const r = await Promise.race([Promise.resolve(c.recData.read(path, {
          wait: true
        })), new Promise(res => setTimeout(() => res(null), 4000))]);
        const doc = R.readDoc(r?.value ?? r?.text ?? null);
        ui.repo = doc.items;
        ui.repoRead = true;
        return true;
      } catch {
        return false;
      }
    };
    /** Sans lanceur : les verdicts du dépôt avec ceux de l'appareil (un retrait : `null`), écrits dans le fichier du trigramme, envoyés tout de suite (sendNow, borné à cette écriture) ; vrai si partis. */
    const sendRepo = async quiet => {
      const path = repoPath();
      if (!path || !c.recData?.put) return quiet ? false : (c.notify?.(t(T.noRepo), 'warn'), false);
      await readRepo();
      const mine = {
          ...ui.local
        },
        all = {
          ...ui.repo
        };
      for (const [k, v] of Object.entries(mine)) {
        if (v) all[k] = v;
        else delete all[k];
      }
      const doc = R.docOf(all, now());
      if (!doc) return quiet ? false : (c.notify?.(t(T.noRepo), 'warn'), false);
      try {
        await c.recData.put(path, doc, {
          force: true
        });
        const r = await c.recData.sendNow?.([path]);
        if (r && r.ok === false) throw new Error(r.error || 'send');
      } catch {
        if (!quiet) c.notify?.(t(T.noRepo), 'warn');
        return false;
      }
      ui.repo = R.cleanMap(all);
      ui.repoRead = true;
      for (const k of Object.keys(mine)) {
        if (!Object.hasOwn(ui.local, k) || JSON.stringify(ui.local[k]) === JSON.stringify(mine[k])) delete ui.local[k];
        if (!Object.hasOwn(ui.local, k)) ui.unsent.delete(k);
      }
      await saveStore(c, {
        pending: ui.local,
        unsent: [...ui.unsent]
      });
      return true;
    };
    /** Ce qu'on dit d'un verdict que le lanceur n'a pas écrit (SOG-0497 : jamais rien). */
    const whyText = () => t(!launcher() ? T.noRepo : ui.why === 'no-organisation' ? T.noOrg : ui.why === 'busy' ? T.busy : ui.why ===
      'offline' ? T.down : T.noWrite);
    const notSent = (quiet, r) => {
      if (r?.reason) ui.why = String(r.reason);
      if (!quiet && launcher()) c.notify?.(whyText(), 'warn');
      heal();
      return false;
    };
    const pullRec = async () => {
      const r = await callRec({
        action: 'get'
      });
      if (!r?.ok) return heal();
      ui.file = cleanMap(r.items);
      ui.fileRead = true;
      setLastDay();
      draw();
    };
    // ---- SOG-0497 : ce qui n'a pas pu être lu ou écrit (le lanceur occupé ou muet) se retente de lui-même, toutes les HEAL_MS, HEAL_MAX fois au plus tant que l'écran est là ; le retour
    // du lanceur (frame-launcher up) relance aussi tout, verdicts et réponses
    const HEAL_MS = 4000,
      HEAL_MAX = 30;
    let healT = 0,
      healN = 0;
    const transient = w => w === 'busy' || w === 'offline';
    const owed = () => !ui.fileRead || (questions.length && !ui.dfileRead) || Object.keys(ui.local).length || Object.keys(ui.dlocal)
      .length;

    function heal() {
      if (healT || healN >= HEAL_MAX || !view.isConnected || !launcher() || !(transient(ui.why) || transient(ui.dwhy)) || !owed())
        return;
      healT = setTimeout(() => {
        healT = 0;
        healN++;
        if (view.isConnected) resync();
      }, HEAL_MS);
    }
    /** Relit ce qui n'a pas été lu, puis envoie ce que l'appareil garde (verdicts et réponses). */
    async function resync() {
      if (!launcher()) return;
      if (!ui.fileRead) await (pulling = pulling.then(pullRec));
      if (questions.length && !ui.dfileRead) await syncDec();
      else if (Object.keys(ui.dlocal).length && await sendDec(true)) draw();
      if (Object.keys(ui.local).length && await send(true)) draw();
    }
    pulling = pullRec();
    // le fichier du dépôt est lu à l'ouverture, et à chaque fois qu'il change (un autre appareil de ce trigramme y a écrit)
    const repoLoad = async () => {
      if (await readRepo()) {
        setLastDay();
        draw();
      }
    };
    pulling = pulling.then(repoLoad);
    try {
      const dir = repoPath().replace(/verdicts\.json$/, '');
      if (dir && c.recData?.watch) {
        const off = c.recData.watch(dir, () => view.isConnected ? repoLoad() : off?.());
      }
    } catch {
      /* sans observation : la lecture de l'ouverture suffit */
    }
    pulling.then(() => Object.keys(ui.local).length ? send(true).then(ok => ok && draw()) : null);
    /** Garde le verdict d'un test (`null` : le retirer) : sur l'appareil d'abord, puis on tente l'envoi. */
    /** Le verdict qui était là (ou la fiche remise à tester), avant un geste : de quoi « Annuler ». */
    const snapshot = id => {
      const x = tests.find(y => y.id === id);
      const e = x ? rawEntry(x) : null;
      return e ? JSON.parse(JSON.stringify(e)) : null;
    };
    /** L'historique qu'un geste conserve : celui d'avant, plus le verdict qu'il remplace (jamais en double), vingt au plus. */
    const keepHistory = old => {
      const hist = [...(old?.history || [])];
      if (old?.verdict) {
        const prior = histItem(old);
        if (prior && !hist.some(h => JSON.stringify(h) === JSON.stringify(prior))) hist.push(prior);
      }
      return hist.slice(-HIST_MAX);
    };
    /** Un geste de verdict : gardé avec son historique, puis la note NOMME la fiche et offre « Annuler » (l'état d'avant, le texte remis dans le champ). kind : ok | reserve | ko | redo. */
    const gesture = async (id, kind, e, typed) => {
      const before = snapshot(id),
        hist = keepHistory(before),
        x = tests.find(y => y.id === id);
      const sent = await commit(id, e === null ? {
        history: hist,
        at: now()
      } : {
        ...e,
        ...(hist.length ? {
          history: hist
        } : {})
      });
      const title = x ? String(t(row(x.title))).slice(0, 70) : '',
        note = t(T.noted[kind], {
          id,
          title
        });
      // SOG-0497 : une seule note par geste ; si rien n'est enregistré, elle le dit (alerte) avec la raison, au lieu d'un « validée » trompeur
      c.notify?.(sent ? note : t(T.unrecorded, {
        note,
        why: whyText()
      }), kind === 'ko' || !sent ? 'warn' : 'ok', {
        key: 'recette-undo',
        ms: 15000, // l'occasion d'annuler dure quinze secondes, puis la note s'efface (sur un téléphone elle recouvre le bas de l'écran)
        action: {
          label: t(T.undo),
          run: async () => {
            ui.local[id] = before; // l'état d'avant (null : la fiche n'avait aucune entrée)
            ui.unsent.add(id);
            if (typed) ui.draft[id] = typed;
            await saveStore(c, {
              pending: ui.local,
              unsent: [...ui.unsent]
            });
            draw(typed ? `[data-comment="${CSS.escape(id)}"]` : '');
            if (await send(false)) draw();
          }
        }
      });
    };
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
      const ok = await send(true); // la note du geste dit le résultat (une seule note)
      draw();
      return ok;
    };
    // ---- les réponses : écrites par le lanceur (recette/decision), sinon gardées sur l'appareil, « non envoyé » (comme les verdicts)
    const callDec = async args => {
      const L = launcher();
      if (!L) {
        ui.dwhy = 'offline';
        return null;
      }
      const r = await job('decision', args);
      ui.dwhy = r?.ok ? '' : whyOf(r);
      if (!r?.ok) heal();
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
      if (e.detail?.state !== 'up') return;
      // le lanceur revient : les verdicts aussi repartent (SOG-0497 ; avant, seules les réponses), et les relances reprennent leur compte
      healN = 0;
      resync();
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
    /** Copie l'identifiant d'une carte et le dit (SOG-0468 (1)) : copyAndTell de frame/lib/clipboard.js (presse-papiers, puis execCommand, puis l'identifiant montré
     *  sélectionné sous la ligne near) ; la copie n'avait pas de repli et se taisait quand elle échouait. */
    const copyId = async (text, near) => {
      const say = {
        ok: t(T.dCopied),
        manual: t(T.dCopyManual),
        near
      };
      try {
        await (await import(new URL('frame/lib/clipboard.js', c.root).href)).copyAndTell(c, text, say);
      } catch {
        // la bibliothèque n'a pas pu être chargée (hors ligne, pas encore gardée) : le presse-papiers seul, et le dire
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch {
          ok = false;
        }
        if (!ok && near) { // montré sélectionné sous la ligne, comme la bibliothèque
          const f = near.nextElementSibling?.matches?.('input.sog-copybox') ? near.nextElementSibling : near.insertAdjacentElement(
            'afterend', Object.assign(document
              .createElement('input'), {
                className: 'sog-copybox',
                readOnly: true
              }));
          f.value = text;
          f.hidden = false;
          f.select();
        }
        c.notify?.(ok ? say.ok : say.manual, ok ? 'ok' : 'warn');
      }
    };
    const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    view.onclick = e => {
      const b = e.target.closest?.('button');
      // un toucher ailleurs (une réponse cochée, un champ) clôt la rafale du geste (SOG-0497)
      if (!b || !view.contains(b)) return void(ui.lastGesture = '');
      if (b.dataset.tab) {
        ui.tab = b.dataset.tab === 'decisions' ? 'decisions' : 'tests';
        saveStore(c, {
          tab: ui.tab
        });
        return draw(`[data-tab="${ui.tab}"]`);
      }
      if (b.dataset.copy) return void copyId(b.dataset.copy, b.closest('p') || b);
      // SOG-0497 (« Je valide SOG-0474. les deux sont validées d'un seul coup ») : un geste redessine la liste, la fiche quitte sa place et la suivante (SOG-0475) remonte SOUS le
      // pointeur ; le second clic d'un double clic tombait sur son « Validé ». Un geste = un verdict : le clic suivant d'une même rafale (detail > 1) qui tombe sur une AUTRE fiche que
      // celle du geste n'en fait pas un second (un second toucher sur le même bouton, après un refus sans commentaire par exemple, reste un geste)
      const target = b.dataset.ok || b.dataset.ko || b.dataset.reserve || b.dataset.redo || b.dataset.dok;
      if (target && e.detail > 1 && ui.lastGesture && ui.lastGesture !== target) return;
      if (target) ui.lastGesture = '';
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
        ui.lastGesture = id;
        return commitDec(id, a);
      }
      if (b.dataset.sbtn && b.dataset.skey) return void stepGesture(b.dataset.skey, b.dataset.sbtn);
      if (b.dataset.pathAll) return void pathAll(b.dataset.pathAll);
      if (b.dataset.app !== undefined) {
        ui.app = b.dataset.app;
        return draw(`[data-app="${CSS.escape(ui.app)}"]`);
      }
      if (b.dataset.more) {
        ui.more[b.dataset.more] = !ui.more[b.dataset.more];
        return draw(`[data-more="${CSS.escape(b.dataset.more)}"]`);
      }
      if (b.dataset.redo) return (ui.lastGesture = b.dataset.redo), gesture(b.dataset.redo, 'redo', null, '');
      const id = b.dataset.ok || b.dataset.ko || b.dataset.reserve;
      if (!id || !ID.test(id)) return;
      const comment = text(ui.draft[id] ?? view.querySelector(`[data-comment="${CSS.escape(id)}"]`)?.value, MAX_COMMENT);
      if ((b.dataset.ko || b.dataset.reserve) && !
        comment) { // un refus ou des réserves sans commentaire : on le dit, on garde la place
        ui.need = id;
        ui.needKind = b.dataset.reserve ? 'reserve' : 'ko';
        return draw(`[data-comment="${CSS.escape(id)}"]`);
      }
      ui.lastGesture = id;
      return gesture(id, b.dataset.ok ? 'ok' : b.dataset.reserve ? 'reserve' : 'ko', {
        verdict: b.dataset.ok ? 'ok' : b.dataset.reserve ? 'reserve' : 'ko',
        ...(comment ? {
          comment
        } : {}),
        at: now()
      }, comment);
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
      const st = e.target.closest?.('textarea[data-step-comment]');
      if (st && stepAt.has(st.dataset.stepComment)) {
        ui.sdraft[st.dataset.stepComment] = st.value;
        fit(st);
        count(st);
        if (ui.sneed === st.dataset.stepComment && st.value.trim()) {
          ui.sneed = '';
          st.closest('li')?.querySelector('[data-need]')?.remove();
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
      const pd = e.target.matches?.('details[data-path]') ? e.target :
        null, // la cible elle-même : un repli couvert est DANS un chemin
        cd = e.target.matches?.('details[data-covered]') ? e.target : null;
      if (pd || cd) { // un chemin (retenu sur l'appareil) ou un repli de ses tests couverts (le temps de l'écran)
        const p = pd && P?.paths.find(q => q.id === pd.dataset.path);
        if (p && pathOpen(p) !== pd.open) {
          ui.popen[p.id] = pd.open;
          saveStore(c, {
            popen: ui.popen
          });
        } else if (cd) ui.copen[cd.dataset.covered] = cd.open;
        if ((pd || cd).open) fitAll(pd || cd);
        return;
      }
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
