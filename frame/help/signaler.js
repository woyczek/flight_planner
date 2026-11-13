(() => {
  'use strict';
  // V3 — « Signaler un problème ou une demande » (écran #signaler du cadre, SOG-0316 ; maquette frame/help/maquette/signaler.html, validée par l'utilisateur, Q-0046) : une sorte, un titre, un texte, l'écran d'où l'on vient noté
  // tout seul (formes seulement : écran, taille, design, langue, version ; jamais de donnée de vol, de clé ni de trigramme dans le texte). Deux canaux, sans réglage :
  //   · le POSTE DE L'ERGONOME (le verbe du lanceur signalement/lire répond et le dossier organisation/ existe) : signalement/ajouter écrit organisation/SIGNALEMENTS.json, avec jusqu'à trois captures rangées par le lanceur
  //     dans organisation/images/ (tools/regen/signalement.py) ; ce poste voit aussi les signalements des pilotes (dépôt de données) et les reprend un à un ;
  //   · un PILOTE : un document par signalement, pilot/<trigramme>/signalements/<id>.json, par l'envoi groupé du dépôt de données ; jamais de capture, jamais de courriel ni d'hôte.
  // Un signalement qui ne part pas (lanceur arrêté sur le poste de l'ergonome) reste sur l'appareil, « non envoyé », et part au retour. Contexte donné par frame/app.js : { t, lang, own, data, root, notify, launcher, version, from,
  // trigram }. Tout ce qui vient d'ailleurs (réponse du lanceur, fichiers d'un pilote, magasin de l'appareil) est une entrée non fiable : échappé, borné, filtré par les mêmes règles que le verbe.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const STORE = 'device/signaler.json';
  const KINDS = ['bug', 'regression', 'ergonomics', 'performance', 'request'];
  const SCREENS = ['aircraft', 'atmosphere', 'data', 'flightlog', 'fuel', 'hello', 'maps', 'missions', 'report', 'stats', 'website',
    'help', 'roadmap', 'recette', 'settings', 'device', 'conflicts', 'sources',
    'signaler', 'other'
  ];
  const LANGS = ['fr', 'en', 'de', 'es'],
    DESIGNS = ['standard', 'cabinet', 'field', 'metro', 'swiss', 'cupertino', 'material', 'aqua'];
  const SG_ID = /^SIG-[0-9a-f]{10}$/,
    FICHE = /^SOG-\d{4}$/,
    TRI = /^[A-Za-z0-9]{2,8}$/,
    VERSION = /^[0-9A-Za-z._+-]{1,40}$/;
  const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  const MAX_TITLE = 80,
    MAX_TEXT = 2000,
    COUNT_FROM = 1800,
    ROWS_MIN = 4,
    ROWS_MAX = 12,
    MAX_SHOTS = 3,
    SHOT_MAX = 1572864, // 1,5 Mio : le lanceur contrôle les octets, la page ne fait que refuser avant d'envoyer
    MINE_MAX = 10,
    UNSENT_MAX = 10,
    PILOT_MAX = 60,
    PILOT_FILE_MAX = 8192;
  const T = {
    title: ['Signaler un problème ou une demande', 'Report a problem or make a request', 'Ein Problem melden oder einen Wunsch äußern',
      'Informar de un problema o hacer una petición'
    ],
    leadPost: [
      'Sur votre poste, le signalement est écrit dans le fichier des signalements de la suite (organisation/SIGNALEMENTS.json) : l’ergonome le lit à son prochain tour et en fait une fiche.',
      'On your workstation the report is written to the suite’s reports file (organisation/SIGNALEMENTS.json): the ergonomist reads it next round and makes a card of it.',
      'Auf Ihrem Rechner wird die Meldung in die Meldungsdatei der Suite geschrieben (organisation/SIGNALEMENTS.json): Die Ergonomie liest sie in der nächsten Runde und macht daraus eine Karte.',
      'En su puesto, el informe se escribe en el archivo de informes de la suite (organisation/SIGNALEMENTS.json): la ergonomía lo lee en su próxima ronda y crea una ficha.'
    ],
    leadPilot: [
      'Votre signalement part avec le prochain envoi groupé vers le dépôt de la compagnie ; l’administrateur le voit dans Aide › Signaler. Aucun courriel n’est envoyé.',
      'Your report leaves with the next grouped send to the company repository; the administrator sees it in Help › Report. No e-mail is sent.',
      'Ihre Meldung geht mit dem nächsten gebündelten Versand an das Repository der Gesellschaft; die Administration sieht sie unter Hilfe › Melden. Es wird keine E-Mail gesendet.',
      'Su informe sale con el próximo envío agrupado al repositorio de la compañía; el administrador lo ve en Ayuda › Informar. No se envía ningún correo.'
    ],
    kinds: ['De quoi s’agit-il ?', 'What is it about?', 'Worum geht es?', '¿De qué se trata?'],
    kind: {
      bug: ['Bug', 'Bug', 'Fehler', 'Error'],
      regression: ['Régression', 'Regression', 'Regression', 'Regresión'],
      ergonomics: ['Ergonomie', 'Ergonomics', 'Ergonomie', 'Ergonomía'],
      performance: ['Performance', 'Performance', 'Leistung', 'Rendimiento'],
      request: ['Demande', 'Request', 'Wunsch', 'Petición']
    },
    fTitle: ['Titre', 'Title', 'Titel', 'Título'],
    fTitleHint: ['Une phrase : ce qui ne va pas, ou ce que vous voulez', 'One sentence: what is wrong, or what you want',
      'Ein Satz: was nicht stimmt oder was Sie möchten', 'Una frase: qué falla o qué quiere'
    ],
    fText: ['Ce qui s’est passé, ce que vous attendiez', 'What happened, what you expected', 'Was passiert ist, was Sie erwartet haben',
      'Qué pasó, qué esperaba'
    ],
    fTextHint: ['Les étapes, ce que vous avez vu, ce que vous attendiez.', 'The steps, what you saw, what you expected.',
      'Die Schritte, was Sie gesehen haben, was Sie erwartet haben.', 'Los pasos, lo que vio, lo que esperaba.'
    ],
    count: ['{n} / {max} signes', '{n} / {max} signs', '{n} / {max} Zeichen', '{n} / {max} signos'],
    noted: ['Noté tout seul', 'Noted automatically', 'Automatisch vermerkt', 'Anotado automáticamente'],
    notedLine: ['Écran : {screen} · {size} · design {design} · {lang}{version}',
      'Screen: {screen} · {size} · {design} design · {lang}{version}',
      'Bildschirm: {screen} · {size} · Design {design} · {lang}{version}',
      'Pantalla: {screen} · {size} · diseño {design} · {lang}{version}'
    ],
    notedJoin: ['Joindre ces informations (aucune donnée de vol, aucune clé)', 'Attach this information (no flight data, no key)',
      'Diese Angaben beifügen (keine Flugdaten, kein Schlüssel)',
      'Adjuntar esta información (sin datos de vuelo, sin claves)'
    ],
    screenOther: ['non précisé', 'not specified', 'nicht angegeben', 'sin especificar'],
    langName: {
      fr: 'français',
      en: 'English',
      de: 'Deutsch',
      es: 'español'
    },
    notedVersion: [' · version {v}', ' · version {v}', ' · Version {v}', ' · versión {v}'],
    size: {
      phone: ['téléphone', 'phone', 'Telefon', 'teléfono'],
      tablet: ['tablette', 'tablet', 'Tablet', 'tableta'],
      desktop: ['ordinateur', 'computer', 'Computer', 'ordenador']
    },
    shots: ['Captures d’écran (trois au plus, png, jpeg ou webp, 1,5 Mo chacune)',
      'Screenshots (three at most, png, jpeg or webp, 1.5 MB each)', 'Screenshots (höchstens drei, png, jpeg oder webp, je 1,5 MB)',
      'Capturas de pantalla (tres como máximo, png, jpeg o webp, 1,5 MB cada una)'
    ],
    shotsNote: ['Une capture peut montrer vos données réelles : elle reste dans organisation/images/ sur ce poste, rien n’est publié.',
      'A screenshot may show your real data: it stays in organisation/images/ on this workstation, nothing is published.',
      'Ein Screenshot kann Ihre echten Daten zeigen: Er bleibt in organisation/images/ auf diesem Rechner, nichts wird veröffentlicht.',
      'Una captura puede mostrar sus datos reales: se queda en organisation/images/ en este puesto, no se publica nada.'
    ],
    shotsBad: ['Capture refusée : {name} (png, jpeg ou webp, 1,5 Mo au plus, trois captures au plus).',
      'Screenshot refused: {name} (png, jpeg or webp, 1.5 MB at most, three at most).',
      'Screenshot abgelehnt: {name} (png, jpeg oder webp, höchstens 1,5 MB, höchstens drei).',
      'Captura rechazada: {name} (png, jpeg o webp, 1,5 MB como máximo, tres como máximo).'
    ],
    send: ['Envoyer', 'Send', 'Senden', 'Enviar'],
    whyPost: ['Écrit tout de suite sur ce poste.', 'Written at once on this workstation.', 'Sofort auf diesem Rechner geschrieben.',
      'Escrito de inmediato en este puesto.'
    ],
    whyPilot: [
      'Part dans le dépôt des données avec le prochain envoi groupé (moins de 5 minutes) ; sans réseau, il attend le retour du réseau.',
      'Goes to the data repository with the next grouped send (under 5 minutes); without a network it waits for the network to come back.',
      'Geht mit dem nächsten gebündelten Versand ins Datenarchiv (unter 5 Minuten); ohne Netz wartet es auf die Verbindung.',
      'Sale al repositorio de datos con el próximo envío agrupado (menos de 5 minutos); sin red, espera a que vuelva.'
    ],
    noShots: [
      'Pas de capture d’écran sur ce chemin : le texte et ce qui est noté tout seul (écran, taille, langue, version) partent, rien d’autre.',
      'No screenshot on this path: the text and what is noted by itself (screen, size, language, version) are sent, nothing else.',
      'Kein Screenshot auf diesem Weg: Der Text und die automatisch notierten Angaben (Bildschirm, Größe, Sprache, Version) werden gesendet, sonst nichts.',
      'Sin captura en este camino: se envían el texto y lo que se anota solo (pantalla, tamaño, idioma, versión), nada más.'
    ],
    checking: ['Vérification du poste…', 'Checking the workstation…', 'Rechner wird geprüft…', 'Comprobando el puesto…'],
    sentPost: ['✓ Écrit dans organisation/SIGNALEMENTS.json ({id}). L’ergonome le lira à son prochain tour.',
      '✓ Written to organisation/SIGNALEMENTS.json ({id}). The ergonomist will read it next round.',
      '✓ In organisation/SIGNALEMENTS.json geschrieben ({id}). Die Ergonomie liest es in der nächsten Runde.',
      '✓ Escrito en organisation/SIGNALEMENTS.json ({id}). La ergonomía lo leerá en su próxima ronda.'
    ],
    sentPilot: [
      '✓ Gardé sur cet appareil et envoyé avec le prochain envoi groupé, dans le dépôt des données ({path}). Vous pouvez le suivre ci-dessous.',
      '✓ Kept on this device and sent with the next grouped send, to the data repository ({path}). You can follow it below.',
      '✓ Auf diesem Gerät gespeichert und mit dem nächsten gebündelten Versand ins Datenarchiv gesendet ({path}). Sie können es unten verfolgen.',
      '✓ Guardado en este dispositivo y enviado con el próximo envío agrupado, al repositorio de datos ({path}). Puede seguirlo abajo.'
    ],
    offPost: [
      'Le lanceur de ce poste ne répond pas : le signalement n’est pas perdu, il reste sur cet appareil (« non envoyé ») et part dès que le lanceur revient (les captures, elles, sont à rejoindre).',
      'This workstation’s launcher does not answer: the report is not lost, it stays on this device (“not sent”) and leaves when the launcher is back (screenshots have to be attached again).',
      'Der Launcher dieses Rechners antwortet nicht: Die Meldung geht nicht verloren, sie bleibt auf diesem Gerät („nicht gesendet“) und geht, sobald der Launcher zurück ist (Screenshots müssen erneut beigefügt werden).',
      'El lanzador de este puesto no responde: el informe no se pierde, se queda en este dispositivo («no enviado») y sale cuando vuelva el lanzador (las capturas hay que adjuntarlas de nuevo).'
    ],
    oldLauncher: ['Le lanceur de ce poste ne connaît pas encore les signalements : redémarrez-le (le brouillon est gardé).',
      'This workstation’s launcher does not know reports yet: restart it (the draft is kept).',
      'Der Launcher dieses Rechners kennt Meldungen noch nicht: Starten Sie ihn neu (der Entwurf bleibt erhalten).',
      'El lanzador de este puesto aún no conoce los informes: reinícielo (el borrador se conserva).'
    ],
    noTri: ['Posez d’abord votre trigramme dans Réglages : le signalement est rangé sous votre dossier du dépôt.',
      'Set your trigram in Settings first: the report is filed under your folder of the repository.',
      'Legen Sie zuerst Ihr Kürzel in den Einstellungen fest: Die Meldung wird unter Ihrem Ordner im Repository abgelegt.',
      'Fije primero su trigrama en Ajustes: el informe se archiva bajo su carpeta del repositorio.'
    ],
    noWrite: [
      'Pas d’accès au dépôt de données pour l’instant : le signalement reste sur cet appareil (« non envoyé ») et part avec le prochain envoi réussi.',
      'No access to the data repository for now: the report stays on this device (“not sent”) and leaves with the next successful send.',
      'Derzeit kein Zugriff auf das Datenrepository: Die Meldung bleibt auf diesem Gerät („nicht gesendet“) und geht mit dem nächsten erfolgreichen Versand.',
      'Sin acceso al repositorio de datos por ahora: el informe se queda en este dispositivo («no enviado») y sale con el próximo envío correcto.'
    ],
    refused: {
      'no-images-dir': ['Le dossier organisation/images/ n’existe pas sur ce poste : créez-le, ou envoyez sans capture.',
        'The organisation/images/ folder does not exist on this workstation: create it, or send without a screenshot.',
        'Der Ordner organisation/images/ existiert auf diesem Rechner nicht: Legen Sie ihn an oder senden Sie ohne Screenshot.',
        'La carpeta organisation/images/ no existe en este puesto: créela o envíe sin captura.'
      ],
      'bad-image': ['Une capture n’est pas une image png, jpeg ou webp reconnue.',
        'A screenshot is not a recognised png, jpeg or webp image.', 'Ein Screenshot ist kein erkanntes png-, jpeg- oder webp-Bild.',
        'Una captura no es una imagen png, jpeg o webp reconocida.'
      ],
      'image-too-big': ['Une capture dépasse 1,5 Mo.', 'A screenshot is over 1.5 MB.', 'Ein Screenshot ist größer als 1,5 MB.',
        'Una captura supera 1,5 MB.'
      ],
      'image-dimensions': ['Une capture est trop grande (8 000 × 8 000 points, 40 millions au plus).',
        'A screenshot is too large (8,000 × 8,000 pixels, 40 million at most).',
        'Ein Screenshot ist zu groß (8.000 × 8.000 Pixel, höchstens 40 Millionen).',
        'Una captura es demasiado grande (8000 × 8000 píxeles, 40 millones como máximo).'
      ],
      'reserve-full': ['Le lanceur reçoit déjà d’autres captures : réessayez dans une minute.',
        'The launcher is already receiving other screenshots: try again in a minute.',
        'Der Launcher empfängt bereits andere Screenshots: Versuchen Sie es in einer Minute erneut.',
        'El lanzador ya está recibiendo otras capturas: inténtelo de nuevo en un minuto.'
      ],
      'too-many': ['Le fichier des signalements est plein (1 000) : l’ergonome doit le vider.',
        'The reports file is full (1,000): the ergonomist has to empty it.',
        'Die Meldungsdatei ist voll (1.000): Die Ergonomie muss sie leeren.',
        'El archivo de informes está lleno (1000): la ergonomía debe vaciarlo.'
      ],
      unreadable: ['Le fichier des signalements est illisible : il n’a pas été touché.',
        'The reports file is unreadable: it was not touched.', 'Die Meldungsdatei ist unlesbar: Sie wurde nicht angetastet.',
        'El archivo de informes es ilegible: no se ha tocado.'
      ],
      expired: ['Les captures ont expiré avant d’être écrites : réessayez.', 'The screenshots expired before being written: try again.',
        'Die Screenshots sind abgelaufen, bevor sie geschrieben wurden: Versuchen Sie es erneut.',
        'Las capturas caducaron antes de escribirse: inténtelo de nuevo.'
      ],
      already: ['Ce signalement est déjà repris.', 'This report has already been taken over.', 'Diese Meldung ist bereits übernommen.',
        'Este informe ya se ha retomado.'
      ],
      failed: ['Le lanceur n’a pas pu écrire le signalement : rien n’a été gardé de ce côté.',
        'The launcher could not write the report: nothing was kept on that side.',
        'Der Launcher konnte die Meldung nicht schreiben: Dort wurde nichts gespeichert.',
        'El lanzador no pudo escribir el informe: no se guardó nada de ese lado.'
      ],
      'no-organisation': ['Ce poste n’a pas de dossier organisation/ : le signalement part par le dépôt de données.',
        'This workstation has no organisation/ folder: the report goes through the data repository.',
        'Dieser Rechner hat keinen Ordner organisation/: Die Meldung geht über das Datenrepository.',
        'Este puesto no tiene carpeta organisation/: el informe sale por el repositorio de datos.'
      ]
    },
    mine: ['Mes signalements', 'My reports', 'Meine Meldungen', 'Mis informes'],
    mineNone: ['Aucun signalement pour l’instant.', 'No report yet.', 'Noch keine Meldung.', 'Ningún informe por ahora.'],
    minePost: ['Dix derniers signalements de ce poste.', 'Last ten reports of this workstation.',
      'Letzte zehn Meldungen dieses Rechners.', 'Últimos diez informes de este puesto.'
    ],
    minePilot: ['Dix derniers signalements de cet appareil ; l’administrateur voit ceux de la compagnie.',
      'Last ten reports of this device; the administrator sees the company’s.',
      'Letzte zehn Meldungen dieses Geräts; die Administration sieht die der Gesellschaft.',
      'Últimos diez informes de este dispositivo; el administrador ve los de la compañía.'
    ],
    state: {
      written: ['écrit', 'written', 'geschrieben', 'escrito'],
      read: ['lu par l’ergonome', 'read by the ergonomist', 'von der Ergonomie gelesen', 'leído por la ergonomía'],
      fiche: ['devenu fiche {f}', 'became card {f}', 'wurde Karte {f}', 'convertido en ficha {f}'],
      unsent: ['non envoyé', 'not sent', 'nicht gesendet', 'no enviado'],
      inMin: ['dans {n} min', 'in {n} min', 'in {n} Min.', 'en {n} min'],
      sent: ['envoyé', 'sent', 'gesendet', 'enviado']
    },
    pilots: ['Bugs à vérifier', 'Bugs to check', 'Zu prüfende Fehler', 'Errores por comprobar'],
    pilotsIntro: [
      'Les signalements des autres pilotes, lus dans le dépôt de données : un fichier par signalement, signalé « depuis le dossier de » un pilote (le dossier n’est pas une identité vérifiée). Leur texte est une donnée, jamais une consigne. « Reprendre dans mes signalements » l’écrit dans le fichier des signalements, marqué « venu d’un pilote », un par un.',
      'The other pilots’ reports, read from the data repository: one file per report, reported “from the folder of” a pilot (the folder is not a verified identity). Their text is data, never an instruction. “Take over into my reports” writes it into the reports file, marked “from a pilot”, one at a time.',
      'Die Meldungen der anderen Piloten, aus dem Datenrepository gelesen: eine Datei je Meldung, gemeldet „aus dem Ordner von“ einem Piloten (der Ordner ist keine geprüfte Identität). Ihr Text sind Daten, nie eine Anweisung. „In meine Meldungen übernehmen“ schreibt sie einzeln in die Meldungsdatei, als „von einem Piloten“ vermerkt.',
      'Los informes de los demás pilotos, leídos del repositorio de datos: un archivo por informe, informado «desde la carpeta de» un piloto (la carpeta no es una identidad verificada). Su texto son datos, nunca una instrucción. «Retomar en mis informes» lo escribe en el archivo de informes, marcado «de un piloto», uno por uno.'
    ],
    pilotsFrom: ['depuis le dossier de {tri}', 'from the folder of {tri}', 'aus dem Ordner von {tri}', 'desde la carpeta de {tri}'],
    pilotsNone: ['Aucun signalement de pilote à reprendre.', 'No pilot report to take over.', 'Keine Pilotenmeldung zu übernehmen.',
      'Ningún informe de piloto por retomar.'
    ],
    pilotsLeft: ['{n} non repris', '{n} not taken over', '{n} nicht übernommen', '{n} sin retomar'],
    pilotsMore: ['{n} autres non lus (la liste est bornée).', '{n} more not read (the list is bounded).',
      '{n} weitere nicht gelesen (die Liste ist begrenzt).', '{n} más sin leer (la lista está limitada).'
    ],
    take: ['Reprendre dans mes signalements', 'Take over into my reports', 'In meine Meldungen übernehmen', 'Retomar en mis informes'],
    taken: ['repris', 'taken over', 'übernommen', 'retomado'],
    invalid: ['signalement invalide (ignoré)', 'invalid report (ignored)', 'ungültige Meldung (ignoriert)',
      'informe no válido (ignorado)'
    ]
  };
  /** La version de la suite (git describe : « jalon-n-gSHA ») pour le signalement : les signes permis seulement, le SHA court gardé en queue, 40 signes au plus ; '' si elle n'est pas connue. */
  const versionOf = raw => {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    const v = raw.trim().replace(/[^0-9A-Za-z._+-]+/g, '-'),
      m = /^(.*?)((?:-\d+)?-g[0-9a-f]{7,12})?$/.exec(v),
      tail = m[2] || '';
    const out = m[1].slice(0, 40 - tail.length) + tail;
    return VERSION.test(out) ? out : '';
  };
  const text = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '';
  const multi = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\r\n?/g, '\n').trim()
    .slice(0, n) : '';
  const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const rid = () => {
    const a = new Uint8Array(5);
    crypto.getRandomValues(a);
    return `SIG-${[...a].map(b => b.toString(16).padStart(2, '0')).join('')}`;
  };
  /** Un signalement aux règles du verbe (ou d'un fichier de pilote) : { kind, title, text, screen, ctx? } sinon null ; les champs inconnus (`capture`, `images`…) sont écartés. */
  const reportOf = v => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || !KINDS.includes(v.kind)) return null;
    const title = text(v.title, MAX_TITLE),
      body = multi(v.text, MAX_TEXT);
    if (!title || !body) return null;
    const out = {
      kind: v.kind,
      title,
      text: body,
      screen: SCREENS.includes(v.screen) ? v.screen : 'other'
    };
    const c = v.ctx;
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      const k = {};
      if (typeof c.version === 'string' && VERSION.test(c.version)) k.version = c.version;
      if (LANGS.includes(c.lang)) k.lang = c.lang;
      if (DESIGNS.includes(c.design)) k.design = c.design;
      if (['phone', 'tablet', 'desktop'].includes(c.size)) k.size = c.size;
      if (['day', 'night'].includes(c.tone)) k.tone = c.tone;
      if (Object.keys(k).length) out.ctx = k;
    }
    return out;
  };
  const readStore = async c => {
    let s = null;
    try {
      s = await c.own?.get(STORE);
    } catch {
      s = null;
    }
    const mine = (Array.isArray(s?.mine) ? s.mine : []).filter(m => m && typeof m === 'object' && SG_ID.test(m.id) && KINDS.includes(m
        .kind) && AT.test(m.at) && ['poste', 'pilote'].includes(m.via)).slice(0, MINE_MAX)
      .map(m => ({
        id: m.id,
        kind: m.kind,
        title: text(m.title, MAX_TITLE),
        at: m.at,
        via: m.via,
        ...(typeof m.state === 'string' && ['written', 'read', 'fiche'].includes(m.state) ? {
          state: m.state
        } : {}),
        ...(typeof m.fiche === 'string' && FICHE.test(m.fiche) ? {
          fiche: m.fiche
        } : {})
      }));
    const unsent = (Array.isArray(s?.unsent) ? s.unsent : []).map(u => ({
      ...reportOf(u),
      id: SG_ID.test(u?.id) ? u.id : '',
      at: AT.test(u?.at) ? u.at : now(),
      via: u?.via === 'pilote' ? 'pilote' : 'poste'
    })).filter(u => u.kind && u.id).slice(0, UNSENT_MAX);
    const d = s?.draft && typeof s.draft === 'object' ? s.draft : {};
    return {
      poste: s?.poste === true,
      mine,
      unsent,
      draft: {
        kind: KINDS.includes(d.kind) ? d.kind : 'bug',
        title: text(d.title, MAX_TITLE),
        text: multi(d.text, MAX_TEXT)
      }
    };
  };
  const saveStore = async (c, st) => {
    try {
      await c.own?.put(STORE, {
        poste: st.poste,
        mine: st.mine.slice(0, MINE_MAX),
        unsent: st.unsent.slice(0, UNSENT_MAX),
        draft: st.draft
      });
    } catch {
      /* l'appareil ne garde pas : le signalement est quand même parti ou dit « non envoyé » */
    }
  };
  const readFile = f => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });

  /** Dessine l'écran dans view. */
  async function screen(view, c) {
    const {
      t
    } = c;
    const st = await readStore(c);
    const ui = {
      ch: null, // 'poste' | 'poste-off' | 'pilote' | 'old'
      shots: [], // les fichiers choisis (poste seulement)
      note: '', // { kind: 'ok' | 'warn', text }
      sending: false,
      pilots: null, // { items, left, more, refs } | null
      busy: false
    };
    const launcher = () => {
      try {
        return c.launcher?.() || null;
      } catch {
        return null;
      }
    };
    const call = async (verb, args) => {
      const L = launcher();
      if (!L) return {
        offline: true
      };
      const r = await L.job('regen/job', {
        set: 'signalement',
        verb,
        args
      }).catch(() => null);
      if (!r) return {
        offline: true
      };
      if (r.ok && r.result && typeof r.result === 'object') return r.result;
      if (r.status === 400 && /unknown operation/.test(String(r.message || ''))) return {
        old: true
      };
      return {
        offline: true // le travail n'a pas tourné (lanceur arrêté, occupé, en erreur) : rien n'a été écrit de ce côté
      };
    };
    const langNow = () => typeof c.lang === 'function' ? c.lang() : c.lang; // le cadre donne la langue par une fonction
    const ctxNow = () => {
      const h = document.documentElement,
        w = innerWidth,
        v = c.version?.()?.version;
      const k = {
        lang: LANGS.includes(langNow()) ? langNow() : 'fr',
        design: DESIGNS.includes(h.dataset.design) ? h.dataset.design : 'standard',
        size: w < 600 ? 'phone' : w < 1000 ? 'tablet' : 'desktop',
        tone: h.dataset.tone === 'night' || (h.dataset.tone !== 'day' && matchMedia('(prefers-color-scheme: dark)').matches) ?
          'night' : 'day'
      };
      const ver = versionOf(v);
      if (ver) k.version = ver;
      return k;
    };
    const screenNow = () => {
      const f = c.from?.();
      return SCREENS.includes(f) ? f : 'other';
    };
    const stateLine = m => {
      if (m.via === 'poste') return m.state === 'fiche' ? t(T.state.fiche, {
        f: m.fiche || ''
      }) : m.state === 'read' ? t(T.state.read) : t(T.state.written);
      return m.pending ? t(T.state.inMin, {
        n: m.pending
      }) : t(T.state.sent);
    };
    const kindLabel = k => t(T.kind[k]);
    view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-muted" data-lead></p>
      <form class="f-card f-sg" data-form autocomplete="off">
        <fieldset class="f-sg-kinds"><legend>${esc(t(T.kinds))}</legend>${KINDS.map(k => `<label><input type="radio" name="sg-kind" value="${k}"${st.draft.kind === k ? ' checked' : ''}> ${esc(kindLabel(k))}</label>`).join('')}</fieldset>
        <label class="f-field">${esc(t(T.fTitle))}<input type="text" data-title maxlength="${MAX_TITLE}" placeholder="${esc(t(T.fTitleHint))}" value="${esc(st.draft.title)}"><small class="f-muted f-rc-count" data-tcount></small></label>
        <label class="f-field">${esc(t(T.fText))}<textarea data-text rows="${ROWS_MIN}" maxlength="${MAX_TEXT}" placeholder="${esc(t(T.fTextHint))}">${esc(st.draft.text)}</textarea><small class="f-muted f-rc-count" data-xcount hidden></small></label>
        <div class="f-sg-where" data-where><b class="f-sg-wt">${esc(t(T.noted))}</b><span data-wtext></span>
          <label class="f-check"><input type="checkbox" data-wc checked> ${esc(t(T.notedJoin))}</label></div>
        <div class="f-sg-shots" data-shotsbox hidden><label class="f-field">${esc(t(T.shots))}<input type="file" data-shots accept="image/png,image/jpeg,image/webp" multiple></label><p class="f-muted" data-shotslist></p><p class="f-muted">${esc(t(T.shotsNote))}</p></div>
        <p class="f-muted" data-noshots hidden></p>
        <div class="f-row"><button type="submit" class="primary" data-send disabled>${esc(t(T.send))}</button> <span class="f-muted" data-why></span></div>
      </form>
      <div data-note role="status"></div>
      <h2>${esc(t(T.mine))}</h2><ul class="f-sg-list" data-mine></ul><p class="f-muted" data-foot></p>
      <section data-pilots hidden></section>`;
    const $ = s => view.querySelector(s);
    const fitText = () => {
      const x = $('[data-text]');
      x.rows = ROWS_MIN;
      const lh = parseFloat(getComputedStyle(x).lineHeight) || 20,
        need = Math.ceil((x.scrollHeight - parseFloat(getComputedStyle(x).paddingTop) - parseFloat(getComputedStyle(x)
          .paddingBottom)) / lh);
      x.rows = Math.max(ROWS_MIN, Math.min(ROWS_MAX, need));
    };
    const draft = () => ({
      kind: view.querySelector('input[name="sg-kind"]:checked')?.value || 'bug',
      title: $('[data-title]').value,
      text: $('[data-text]').value
    });
    const paint = () => {
      const chk = ui.ch === null;
      $('[data-lead]').textContent = chk ? t(T.checking) : ui.ch === 'pilote' ? t(T.leadPilot) : t(T.leadPost);
      const k = ctxNow(),
        scr = screenNow();
      $('[data-wtext]').textContent = t(T.notedLine, {
        screen: c.fromLabel?.() || (scr === 'other' ? t(T.screenOther) : scr),
        size: t(T.size[k.size]),
        design: k.design,
        lang: T.langName[k.lang],
        version: k.version ? t(T.notedVersion, {
          v: k.version
        }) : ''
      });
      $('[data-shotsbox]').hidden = ui.ch !== 'poste';
      const ns = $('[data-noshots]'),
        nsText = ui.ch === 'pilote' ? t(T.noShots) : '';
      if (ns.hidden !== !nsText) ns.hidden = !nsText;
      if (ns.textContent !== nsText) ns.textContent = nsText;
      const sl = $('[data-shotslist]');
      sl.textContent = ui.shots.map(f => f.name).join(' · ');
      const d = draft();
      $('[data-tcount]').textContent = `${d.title.length} / ${MAX_TITLE}`;
      const xc = $('[data-xcount]');
      xc.hidden = d.text.length < COUNT_FROM;
      xc.textContent = t(T.count, {
        n: d.text.length,
        max: MAX_TEXT
      });
      const can = !chk && ui.ch !== 'old' && !ui.sending && d.title.trim() && d.text.trim();
      $('[data-send]').disabled = !can;
      $('[data-why]').textContent = ui.ch === 'pilote' ? t(T.whyPilot) : ui.ch === 'poste' ? t(T.whyPost) : '';
      const n = $('[data-note]');
      const html = ui.note ? `<p class="${ui.note.kind === 'warn' ? 'f-warn' : 'f-card'}" data-kind="${esc(ui.note.kind)}">${esc(ui.note.text)}</p>` : '';
      if (n.innerHTML !== html) n.innerHTML = html;
      const rows = [...st.unsent.map(u => ({
        ...u,
        unsent: true
      })), ...st.mine].slice(0, MINE_MAX);
      $('[data-mine]').innerHTML = rows.length ? rows.map(m => `<li data-id="${esc(m.id)}"><span class="f-sg-tag">${esc(kindLabel(m.kind))}</span> <span class="f-sg-t">${esc(m.title)}</span> <span class="f-sg-state${m.unsent ? ' f-warn' : ''}">${esc(m.unsent ? t(T.state.unsent) : stateLine(m))}</span></li>`).join('') :
        `<li class="f-muted" data-none>${esc(t(T.mineNone))}</li>`;
      $('[data-foot]').textContent = ui.ch === 'pilote' ? t(T.minePilot) : t(T.minePost);
      paintPilots();
    };

    function paintPilots() {
      const box = $('[data-pilots]');
      if (ui.ch !== 'poste' || !ui.pilots) {
        box.hidden = true;
        return;
      }
      const p = ui.pilots;
      box.hidden = false;
      const left = p.items.filter(i => i.report && !i.taken).length + p.more;
      box.innerHTML = `<h2>${esc(t(T.pilots))}${left ? ` <small class="f-muted" data-left>${esc(t(T.pilotsLeft, { n: left }))}</small>` : ''}</h2><p class="f-muted">${esc(t(T.pilotsIntro))}</p>${p.items.length ? `<ul class="f-sg-list" data-plist>${p.items.map(i => `<li data-p="${esc(i.folder)}/${esc(i.id)}">${i.report ? `<span class="f-sg-tag">${esc(kindLabel(i.report.kind))}</span> <span class="f-sg-t">${esc(i.report.title)}</span><div class="f-muted">${esc(t(T.pilotsFrom, { tri: i.folder }))}</div><div class="f-sg-body">${esc(i.report.text)}</div>${i.taken ? `<span class="f-sg-state">${esc(t(T.taken))}</span>` : `<button type="button" data-take="${esc(i.folder)}/${esc(i.id)}">${esc(t(T.take))}</button>`}` : `<span class="f-muted">${esc(t(T.invalid))}</span>`}</li>`).join('')}</ul>` : `<p class="f-muted" data-pnone>${esc(t(T.pilotsNone))}</p>`}${p.more ? `<p class="f-muted">${esc(t(T.pilotsMore, { n: p.more }))}</p>` : ''}`;
    }
    /** Les signalements de pilotes du dépôt de données (poste de l'ergonome) : chemins sous pilot/<tri>/signalements/, bornés, relus par les règles du verbe ; la liste des déjà repris vient du fichier. */
    const loadPilots = async refs => {
      let paths = [];
      try {
        paths = (await Promise.resolve(c.data?.list?.('pilot/'))) || [];
      } catch {
        paths = [];
      }
      const found = paths.map(p => /^pilot\/([A-Za-z0-9]{2,8})\/signalements\/(SIG-[0-9a-f]{10})\.json$/.exec(String(p))).filter(
        Boolean).map(m => ({
        folder: m[1],
        id: m[2]
      }));
      const taken = new Set(refs);
      found.sort((a, b) => Number(taken.has(`${a.folder}/${a.id}`)) - Number(taken.has(`${b.folder}/${b.id}`)) || a.id.localeCompare(b.id));
      const readOne = async f => {
        let doc = null;
        try {
          const r = await Promise.race([Promise.resolve(c.data.read(`pilot/${f.folder}/signalements/${f.id}.json`, {
            wait: true
          })), new Promise(res => setTimeout(() => res(null), 4000))]);
          const raw = r?.value ?? r?.text ?? null;
          if (typeof raw === 'string' && raw.length <= PILOT_FILE_MAX) doc = JSON.parse(raw);
          else if (raw && typeof raw === 'object' && JSON.stringify(raw).length <= PILOT_FILE_MAX) doc = raw;
        } catch {
          doc = null;
        }
        return {
          ...f,
          report: reportOf(doc),
          taken: taken.has(`${f.folder}/${f.id}`)
        };
      };
      const items = [],
        todo = found.slice(0, PILOT_MAX);
      for (let i = 0; i < todo.length; i += 6) items.push(...await Promise.all(todo.slice(i, i + 6).map(
        readOne))); // six à la fois : un réseau lent ne coûte pas soixante fois quatre secondes
      ui.pilots = {
        items,
        more: Math.max(0, found.length - PILOT_MAX)
      };
      paintPilots();
    };
    const refreshStates = async () => {
      const ids = st.mine.filter(m => m.via === 'poste').map(m => m.id).slice(0, 20);
      const r = await call('lire', ids.length ? {
        ids
      } : {});
      if (r.ok) {
        for (const m of st.mine)
          if (m.via === 'poste' && r.items?.[m.id]) {
            const s = r.items[m.id];
            m.state = s.state === 'fiche' ? 'fiche' : s.state === 'read' ? 'read' : 'written';
            if (s.state === 'fiche' && FICHE.test(s.fiche)) m.fiche = s.fiche;
          }
        await saveStore(c, st);
      }
      return r;
    };
    const queueLeft = async () => {
      // l'envoi groupé d'un pilote : « dans n min » tant que le document attend, « envoyé » ensuite
      try {
        const s = await c.data?.status?.();
        const q = new Set((s?.queue || []).map(x => x.path));
        const mins = s?.nextSendAt ? Math.max(1, Math.ceil((s.nextSendAt - Date.now()) / 60000)) : 1;
        for (const m of st.mine)
          if (m.via === 'pilote') m.pending = [...q].some(p => String(p).endsWith(`/signalements/${m.id}.json`)) ? mins : 0;
      } catch {
        /* sans état : « envoyé » */
      }
    };
    const check = async () => {
      // SOG-0335 : un appareil SANS lanceur (le téléphone, le site publié, un appareil appairé) ne peut pas être le poste de l'ergonome : le
      // signalement du développeur y prend le chemin d'un pilote, il ne reste pas « non envoyé » en attendant un lanceur qui ne viendra pas
      const r = launcher() ? await call('lire', {}) : {
        offline: true,
        noLauncher: true
      };
      ui.ch = r.noLauncher ? 'pilote' : r.old ? 'old' : r.ok ? 'poste' : r.reason === 'no-organisation' ? 'pilote' : r.offline ? (st
        .poste ? 'poste-off' :
        'pilote') : st.poste ? 'poste-off' : 'pilote';
      if (ui.ch === 'poste' && !st.poste) {
        st.poste = true;
        await saveStore(c, st);
      }
      if (ui.ch === 'pilote' && st.poste && r.reason === 'no-organisation') {
        st.poste = false;
        await saveStore(c, st);
      }
      if (ui.ch === 'old') ui.note = {
        kind: 'warn',
        text: t(T.oldLauncher)
      };
      if (ui.ch === 'poste-off') ui.note = {
        kind: 'warn',
        text: t(T.offPost)
      };
      paint();
      if (ui.ch === 'poste') {
        await refreshStates();
        await flush();
        paint();
        loadPilots(r.refs || []);
      } else if (ui.ch === 'pilote') {
        await queueLeft();
        await flush();
        paint();
      }
    };
    /** Ce que l'appareil garde, « non envoyé » : renvoyé quand le canal répond. */
    const flush = async () => {
      if (!st.unsent.length || (ui.ch !== 'poste' && ui.ch !== 'pilote')) return;
      const keep = [];
      for (const u of st.unsent) {
        const ok = ui.ch === 'poste' ? u.via === 'poste' && await sendPost(u) : u.via === 'pilote' && await sendPilot(u);
        if (!ok) keep.push(u);
      }
      st.unsent = keep;
      await saveStore(c, st);
    };
    const sendPost = async (r, files = []) => {
      const images = [];
      for (const f of files) images.push({
        data: await readFile(f)
      });
      const res = await call('ajouter', {
        kind: r.kind,
        title: r.title,
        text: r.text,
        screen: r.screen,
        ...(r.ctx ? {
          ctx: r.ctx
        } : {}),
        ...(images.length ? {
          images
        } : {})
      });
      if (res.ok && SG_ID.test(res.id)) {
        st.mine.unshift({
          id: res.id,
          kind: r.kind,
          title: r.title,
          at: AT.test(res.at) ? res.at : now(),
          via: 'poste',
          state: 'written'
        });
        st.mine = st.mine.slice(0, MINE_MAX);
        await saveStore(c, st);
        return res.id;
      }
      ui.refusal = res;
      return false;
    };
    const sendPilot = async r => {
      const tri = c.trigram?.() || '';
      if (!TRI.test(tri)) {
        ui.refusal = {
          reason: 'no-tri'
        };
        return false;
      }
      const id = SG_ID.test(r.id) ? r.id : rid(),
        at = AT.test(r.at) ? r.at : now();
      try {
        await c.data.put(`pilot/${tri}/signalements/${id}.json`, {
          schema: 'sog-signalement/1',
          id,
          kind: r.kind,
          title: r.title,
          text: r.text,
          screen: r.screen,
          ...(r.ctx ? {
            ctx: r.ctx
          } : {}),
          at
        });
      } catch {
        ui.refusal = {
          reason: 'no-write'
        };
        return false;
      }
      st.mine.unshift({
        id,
        kind: r.kind,
        title: r.title,
        at,
        via: 'pilote'
      });
      st.mine = st.mine.slice(0, MINE_MAX);
      await saveStore(c, st);
      await queueLeft();
      return id;
    };
    const submit = async () => {
      if (ui.sending) return;
      const d = draft();
      const r = reportOf({
        ...d,
        screen: screenNow(),
        ...($('[data-wc]').checked ? {
          ctx: ctxNow()
        } : {})
      });
      if (!r) return;
      ui.sending = true;
      ui.refusal = null;
      paint();
      let id = false;
      if (ui.ch === 'poste') id = await sendPost(r, ui.shots);
      else if (ui.ch === 'pilote') id = await sendPilot(r);
      else if (ui.ch === 'poste-off') ui.refusal = {
        offline: true
      };
      ui.sending = false;
      if (id) {
        ui.note = {
          kind: 'ok',
          text: t(ui.ch === 'pilote' ? T.sentPilot : T.sentPost, {
            id,
            path: `pilot/${c.trigram?.() || ''}/signalements/${id}.json`
          })
        };
        st.draft = {
          kind: d.kind,
          title: '',
          text: ''
        };
        $('[data-title]').value = '';
        $('[data-text]').value = '';
        ui.shots = [];
        $('[data-shots]').value = '';
        fitText();
        await saveStore(c, st);
        c.notify?.(ui.note.text, 'ok');
      } else {
        const why = ui.refusal?.reason,
          keepUnsent = async via => {
            st.unsent.unshift({
              ...r,
              id: rid(),
              at: now(),
              via
            });
            st.draft = {
              kind: d.kind,
              title: '',
              text: ''
            };
            $('[data-title]').value = '';
            $('[data-text]').value = '';
            fitText();
            await saveStore(c, st);
          };
        if (ui.ch === 'poste-off' || (ui.ch === 'poste' && ui.refusal?.offline)) {
          await keepUnsent('poste'); // le lanceur ne répond pas : le texte reste sur l'appareil, « non envoyé »
          ui.note = {
            kind: 'warn',
            text: t(T.offPost)
          };
        } else if (ui.refusal?.old) ui.note = {
          kind: 'warn',
          text: t(T.oldLauncher)
        };
        else if (why === 'no-tri') ui.note = {
          kind: 'warn',
          text: t(T.noTri)
        };
        else if (why === 'no-write') {
          await keepUnsent('pilote');
          ui.note = {
            kind: 'warn',
            text: t(T.noWrite)
          };
        } else ui.note = {
          kind: 'warn',
          text: t(T.refused[why] || T.refused.failed)
        };
        c.notify?.(ui.note.text, 'warn');
      }
      paint();
    };
    const take = async key => {
      const [folder, id] = key.split('/');
      const it = ui.pilots?.items.find(i => i.folder === folder && i.id === id);
      if (!it?.report || it.taken || ui.busy) return;
      ui.busy = true;
      const res = await call('ajouter', {
        ...it.report,
        origin: {
          folder,
          ref: id
        }
      });
      ui.busy = false;
      if (res.ok || res.reason === 'already') {
        it.taken = true;
        if (res.ok && SG_ID.test(res.id)) await refreshStates();
      } else {
        ui.note = {
          kind: 'warn',
          text: t(T.refused[res.reason] || T.refused.failed)
        };
        c.notify?.(ui.note.text, 'warn');
      }
      paint();
    };
    view.addEventListener('input', e => {
      if (e.target.matches('[data-title],[data-text]')) {
        fitText();
        st.draft = draft();
        paint();
        saveStore(c, st);
      }
    });
    view.addEventListener('change', e => {
      if (e.target.matches('input[name="sg-kind"]')) {
        st.draft = draft();
        saveStore(c, st);
      } else if (e.target.matches('[data-shots]')) {
        const files = [...e.target.files];
        const bad = files.find(f => !/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > SHOT_MAX || f.size < 1);
        if (bad || files.length > MAX_SHOTS) {
          ui.note = {
            kind: 'warn',
            text: t(T.shotsBad, {
              name: bad ? text(bad.name, 60) : `> ${MAX_SHOTS}`
            })
          };
          e.target.value = '';
          ui.shots = [];
        } else {
          ui.shots = files;
          ui.note = '';
        }
        paint();
      } else if (e.target.matches('[data-wc]')) $('[data-wtext]').style.opacity = e.target.checked ? '' : '.4';
    });
    view.addEventListener('submit', e => {
      e.preventDefault();
      submit();
    });
    view.addEventListener('click', e => {
      const b = e.target.closest('[data-take]');
      if (b) take(b.dataset.take);
    });
    fitText();
    paint();
    check();
  }
  window.SogSignaler = {
    screen,
    T
  };
})();
