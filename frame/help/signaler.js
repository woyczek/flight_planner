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
  // « Mes signalements » (SOG-0410, frame/help/maquette/signalements.md) : la liste par priorité, la recherche, la fiche d'un signalement
  const GRAV = ['blocking', 'annoying', 'minor'],
    FREQ = ['always', 'often', 'rare'],
    GROUPS = ['now', 'next', 'later', 'unrated'];
  const PAGE = 7, // sept lignes au plus par groupe, puis « Voir les n suivants »
    MAX_CM = 2000,
    MAX_ANSWER = 300,
    MAX_LIST = 300,
    MAX_REPORTS = 1000,
    MAX_CARDS = 100,
    Q_MS = 300; // la recherche part 300 ms après la dernière frappe dans le champ de recherche, jamais à chaque signe
  const IMG = /^SIG-[0-9a-f]{10}-[1-3]\.(png|jpe?g|webp)$/,
    COM_ID = /^COM-[0-9a-f]{10}$/;
  let LAST_SIG = '', // la fiche ouverte en dernier : la liste y revient (focus sur sa ligne) au retour
    FROM_LIST = false; // la fiche a été ouverte depuis la liste : « ← Mes signalements » revient en arrière dans l'historique
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
    sendingLbl: ['Envoi…', 'Sending…', 'Wird gesendet…', 'Enviando…'],
    duplicate: [
      'Ce signalement vient déjà de partir (même texte dans la minute) : un seul appui suffit.',
      'This report has just been sent (same text within a minute): one tap is enough.',
      'Diese Meldung wurde gerade gesendet (gleicher Text innerhalb einer Minute): Ein Tippen genügt.',
      'Este informe acaba de enviarse (mismo texto en el último minuto): basta con una pulsación.'
    ],
    whyPost: ['Écrit tout de suite sur ce poste.', 'Written at once on this workstation.', 'Sofort auf diesem Rechner geschrieben.',
      'Escrito de inmediato en este puesto.'
    ],
    whyPilot: [
      'Part dans le dépôt des données avec le prochain envoi groupé (moins de 5 minutes) ; sans réseau, il attend le retour du réseau.',
      'Goes to the data repository with the next grouped send (under 5 minutes); without a network it waits for the network to come back.',
      'Geht mit dem nächsten gebündelten Versand ins Datenarchiv (unter 5 Minuten); ohne Netz wartet es auf die Verbindung.',
      'Sale al repositorio de datos con el próximo envío agrupado (menos de 5 minutos); sin red, espera a que vuelva.'
    ],
    photoInfo: [
      'Une photo est possible : elle est réduite sur cet appareil (1 600 px, 400 Ko ; la position GPS est retirée) et part dans le dépôt des données de la compagnie, lisible par ses pilotes.',
      'A photo is possible: it is reduced on this device (1,600 px, 400 KB; the GPS position is removed) and goes to the company’s data repository, readable by its pilots.',
      'Ein Foto ist möglich: Es wird auf diesem Gerät verkleinert (1 600 px, 400 KB; der GPS-Standort wird entfernt) und geht ins Datenarchiv der Gesellschaft, lesbar für ihre Piloten.',
      'Se puede añadir una foto: se reduce en este dispositivo (1 600 px, 400 KB; se quita la posición GPS) y sale al repositorio de datos de la compañía, legible por sus pilotos.'
    ],
    photoLabel: [
      'Photos ou captures d’écran (trois au plus)',
      'Photos or screenshots (three at most)',
      'Fotos oder Screenshots (höchstens drei)',
      'Fotos o capturas de pantalla (tres como máximo)'
    ],
    photoReducing: ['Réduction de la photo…', 'Reducing the photo…', 'Foto wird verkleinert…', 'Reduciendo la foto…'],
    photoBad: [
      'Photo refusée : {name} (trois photos au plus, des images seulement).',
      'Photo refused: {name} (three photos at most, images only).',
      'Foto abgelehnt: {name} (höchstens drei Fotos, nur Bilder).',
      'Foto rechazada: {name} (tres fotos como máximo, solo imágenes).'
    ],
    photoUnreadable: [
      'Photo illisible : {name} — l’appareil ne sait pas la décoder ({why}).',
      'Unreadable photo: {name} — this device cannot decode it ({why}).',
      'Foto unlesbar: {name} — dieses Gerät kann sie nicht dekodieren ({why}).',
      'Foto ilegible: {name} — este dispositivo no puede decodificarla ({why}).'
    ],
    photoHeavy: [
      'Photo trop lourde : {name} — {kb} Ko atteints au mieux après réduction, 400 Ko au plus.',
      'Photo too heavy: {name} — {kb} KB at best after reduction, 400 KB at most.',
      'Foto zu schwer: {name} — {kb} KB im besten Fall nach der Verkleinerung, höchstens 400 KB.',
      'Foto demasiado pesada: {name} — {kb} KB como mínimo tras la reducción, 400 KB como máximo.'
    ],
    photoSent: [
      ' Photos jointes : {n} (réduites, dans le dépôt des données de la compagnie, lisibles par ses pilotes).',
      ' Photos attached: {n} (reduced, in the company’s data repository, readable by its pilots).',
      ' Fotos angehängt: {n} (verkleinert, im Datenarchiv der Gesellschaft, für ihre Piloten lesbar).',
      ' Fotos adjuntas: {n} (reducidas, en el repositorio de datos de la compañía, legibles por sus pilotos).'
    ],
    photosOf: ['Photos jointes', 'Attached photos', 'Angehängte Fotos', 'Fotos adjuntas'],
    photoRefused: [
      'Photo refusée au contrôle (type, taille ou métadonnées) : non affichée, non reprise.',
      'Photo refused by the check (type, size or metadata): not shown, not taken over.',
      'Foto von der Prüfung abgelehnt (Typ, Größe oder Metadaten): nicht angezeigt, nicht übernommen.',
      'Foto rechazada por el control (tipo, tamaño o metadatos): no se muestra ni se retoma.'
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
    ],
    // ---- « Mes signalements » : la liste, la recherche, la fiche (SOG-0410)
    search: ['Chercher dans les signalements et les fiches', 'Search the reports and the cards', 'In Meldungen und Karten suchen',
      'Buscar en los informes y las fichas'
    ],
    searchMine: ['Chercher dans mes signalements', 'Search my reports', 'In meinen Meldungen suchen', 'Buscar en mis informes'],
    grp: {
      now: ['Maintenant', 'Now', 'Jetzt', 'Ahora'],
      next: ['Ensuite', 'Next', 'Danach', 'Después'],
      later: ['Plus tard', 'Later', 'Später', 'Más tarde'],
      unrated: ['À classer', 'To sort', 'Einzuordnen', 'Por clasificar'],
      found: ['Signalements', 'Reports', 'Meldungen', 'Informes'],
      cards: ['Fiches', 'Cards', 'Karten', 'Fichas']
    },
    moreOne: ['Voir le suivant', 'Show the next one', 'Den nächsten zeigen', 'Ver el siguiente'],
    moreMany: ['Voir les {n} suivants', 'Show the next {n}', 'Die nächsten {n} zeigen', 'Ver los {n} siguientes'],
    stNone: ['Sans fiche', 'No card', 'Ohne Karte', 'Sin ficha'],
    stCard: ['Fiche {f}', 'Card {f}', 'Karte {f}', 'Ficha {f}'],
    stDone: ['Fait · {f}', 'Done · {f}', 'Erledigt · {f}', 'Hecho · {f}'],
    stRefused: ['Refusé', 'Refused', 'Abgelehnt', 'Rechazado'],
    cst: {
      done: ['Fait', 'Done', 'Erledigt', 'Hecho'],
      doing: ['En cours', 'In progress', 'In Arbeit', 'En curso'],
      planned: ['Prévu', 'Planned', 'Geplant', 'Previsto'],
      later: ['Plus tard', 'Later', 'Später', 'Más tarde']
    },
    grav: {
      blocking: ['Bloquant', 'Blocking', 'Blockierend', 'Bloqueante'],
      annoying: ['Gênant', 'Annoying', 'Störend', 'Molesto'],
      minor: ['Mineur', 'Minor', 'Geringfügig', 'Menor']
    },
    freq: {
      always: ['Toujours', 'Always', 'Immer', 'Siempre'],
      often: ['Souvent', 'Often', 'Oft', 'A menudo'],
      rare: ['Rare', 'Rarely', 'Selten', 'Rara vez']
    },
    freqLow: {
      always: ['toujours', 'always', 'immer', 'siempre'],
      often: ['souvent', 'often', 'oft', 'a menudo'],
      rare: ['rare', 'rarely', 'selten', 'rara vez']
    },
    noneFound: ['Aucun signalement ne contient « {q} » ({n} cherchés).', 'No report contains “{q}” ({n} searched).',
      'Keine Meldung enthält „{q}“ ({n} durchsucht).', 'Ningún informe contiene «{q}» ({n} buscados).'
    ],
    noneFoundOne: ['Aucun signalement ne contient « {q} » ({n} cherché).', 'No report contains “{q}” ({n} searched).',
      'Keine Meldung enthält „{q}“ ({n} durchsucht).', 'Ningún informe contiene «{q}» ({n} buscado).'
    ],
    linkedOne: ['{n} signalement', '{n} report', '{n} Meldung', '{n} informe'],
    linkedMany: ['{n} signalements', '{n} reports', '{n} Meldungen', '{n} informes'],
    back: ['← Mes signalements', '← My reports', '← Meine Meldungen', '← Mis informes'],
    atDay: ['{D}/{M}', '{D}/{M}', '{D}.{M}.', '{D}/{M}'],
    atFull: ['{D}/{M} à {h} h {mm}', '{D}/{M} at {hh}:{mm}', '{D}.{M}. um {hh}:{mm}', '{D}/{M} a las {hh}:{mm}'],
    ctxScreen: ['écran {s}', '{s} screen', 'Bildschirm {s}', 'pantalla {s}'],
    ctxDesign: ['design {d}', '{d} design', 'Design {d}', 'diseño {d}'],
    ctxVersion: ['version {v}', 'version {v}', 'Version {v}', 'versión {v}'],
    images: ['Captures : {names}', 'Screenshots: {names}', 'Screenshots: {names}', 'Capturas: {names}'],
    linked: ['Fiche liée', 'Linked card', 'Verknüpfte Karte', 'Ficha vinculada'],
    openRm: ['Ouvrir dans la feuille de route', 'Open in the Roadmap', 'Im Fahrplan öffnen', 'Abrir en la hoja de ruta'],
    answer: ['Réponse :', 'Answer:', 'Antwort:', 'Respuesta:'],
    prio: ['Priorité', 'Priority', 'Priorität', 'Prioridad'],
    gravL: ['Gravité — ce que le défaut empêche', 'Severity — what the fault prevents', 'Schwere — was der Fehler verhindert',
      'Gravedad — lo que el fallo impide'
    ],
    gravA: ['Gravité', 'Severity', 'Schwere', 'Gravedad'],
    freqL: ['Fréquence — à quelle fréquence ça arrive', 'Frequency — how often it happens', 'Häufigkeit — wie oft es vorkommt',
      'Frecuencia — con qué frecuencia ocurre'
    ],
    freqA: ['Fréquence', 'Frequency', 'Häufigkeit', 'Frecuencia'],
    prioFail: ['La priorité n’a pas été enregistrée : le lanceur ne l’a pas écrite. Elle revient à ce qu’elle était.',
      'The priority was not saved: the launcher did not write it. It is back to what it was.',
      'Die Priorität wurde nicht gespeichert: Der Launcher hat sie nicht geschrieben. Sie ist wieder wie vorher.',
      'La prioridad no se ha guardado: el lanzador no la escribió. Vuelve a ser la de antes.'
    ],
    comments: ['Commentaires', 'Comments', 'Kommentare', 'Comentarios'],
    cmNone: ['Aucun commentaire.', 'No comment.', 'Kein Kommentar.', 'Ningún comentario.'],
    you: ['Vous', 'You', 'Sie', 'Usted'],
    cmAdd: ['Ajouter un commentaire', 'Add a comment', 'Einen Kommentar hinzufügen', 'Añadir un comentario'],
    cmHint: ['Votre commentaire (2 000 signes)', 'Your comment (2,000 signs)', 'Ihr Kommentar (2 000 Zeichen)',
      'Su comentario (2000 signos)'
    ],
    add: ['Ajouter', 'Add', 'Hinzufügen', 'Añadir'],
    cmFail: ['Le commentaire n’a pas été ajouté : le lanceur ne l’a pas écrit. Votre texte reste dans le champ.',
      'The comment was not added: the launcher did not write it. Your text stays in the field.',
      'Der Kommentar wurde nicht hinzugefügt: Der Launcher hat ihn nicht geschrieben. Ihr Text bleibt im Feld.',
      'El comentario no se ha añadido: el lanzador no lo escribió. Su texto se queda en el campo.'
    ],
    reading: ['Lecture du signalement…', 'Reading the report…', 'Meldung wird gelesen…', 'Leyendo el informe…'],
    unknown: ['Ce signalement est introuvable, ni sur ce poste ni sur cet appareil.',
      'This report cannot be found, neither on this workstation nor on this device.',
      'Diese Meldung ist nicht auffindbar, weder auf diesem Rechner noch auf diesem Gerät.',
      'Este informe no se encuentra, ni en este puesto ni en este dispositivo.'
    ],
    scr: {
      aircraft: ['Appareils', 'Aircraft', 'Flugzeuge', 'Aeronaves'],
      atmosphere: ['Météo', 'Weather', 'Wetter', 'Meteo'],
      data: ['Données', 'Data', 'Daten', 'Datos'],
      flightlog: ['Mes vols', 'My flights', 'Meine Flüge', 'Mis vuelos'],
      fuel: ['Carburant', 'Fuel', 'Kraftstoff', 'Combustible'],
      hello: ['Accueil', 'Home', 'Start', 'Inicio'],
      maps: ['Carte', 'Map', 'Karte', 'Mapa'],
      missions: ['Missions', 'Missions', 'Missionen', 'Misiones'],
      report: ['Compte rendu', 'Report', 'Bericht', 'Informe'],
      stats: ['Statistiques', 'Statistics', 'Statistik', 'Estadísticas'],
      website: ['Site', 'Website', 'Website', 'Sitio'],
      help: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
      roadmap: ['Roadmap', 'Roadmap', 'Fahrplan', 'Hoja de ruta'],
      recette: ['Recette', 'Acceptance', 'Abnahme', 'Recepción'],
      settings: ['Réglages', 'Settings', 'Einstellungen', 'Ajustes'],
      device: ['Appareil', 'Device', 'Gerät', 'Dispositivo'],
      conflicts: ['Conflits', 'Conflicts', 'Konflikte', 'Conflictos'],
      sources: ['Sources', 'Sources', 'Quellen', 'Fuentes'],
      signaler: ['Signaler', 'Feedback', 'Melden', 'Informar']
    }
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
  let FLUSH =
    null; // SOG-0409 : écrit tout de suite le brouillon en attente du montage en cours (un nouveau montage, avant de lire le brouillon)
  const DRAFT_MS = 800; // SOG-0409 : le brouillon s'écrit 800 ms après la dernière frappe, jamais à chaque signe
  let MOUNTED =
    null; // le montage en cours : un nouveau montage retire les écouteurs du précédent, quel que soit l'élément où il les avait posés
  let SENDING =
    false; // un seul envoi à la fois, quel que soit le nombre de fois que l'écran est monté (un écran qui se redessine ne double rien : SOG-0366)
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
        // le texte et l'écran, gardés depuis SOG-0410 : la liste de l'appareil se cherche et sa fiche se lit sans réseau
        ...(typeof m.text === 'string' && m.text ? {
          text: multi(m.text, MAX_TEXT)
        } : {}),
        ...(SCREENS.includes(m.screen) ? {
          screen: m.screen
        } : {}),
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
        text: multi(d.text, MAX_TEXT),
        id: SG_ID.test(d.id) ? d.id : '' // l'identifiant du signalement, fixé UNE fois à la saisie (SOG-0366)
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

  // ---------------------------------------------------------------- « Mes signalements » : recherche, états, lignes (SOG-0410)
  /** Le texte plié pour chercher : sans accents (NFKD sans les marques combinantes), en minuscules. */
  const fold = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const WORD = /[\p{L}\p{N}]/u;
  /** Les mots d'une recherche : pliés, coupés sur ce qui n'est ni lettre ni chiffre, 8 au plus, 60 signes chacun (les bornes du verbe signalement/lister). */
  const wordsOf = q => [...new Set(fold(String(q || '')).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(w => w.slice(0, 60)))].slice(0, 8);
  /** Le texte plié et, pour chaque signe plié, la plage du signe d'origine : les mots trouvés se marquent sur le texte d'origine, par indices. */
  const folded = s => {
    let out = '',
      i = 0;
    const map = [];
    for (const ch of s) {
      const f = fold(ch);
      for (let k = 0; k < f.length; k++) map.push([i, i + ch.length]);
      out += f;
      i += ch.length;
    }
    return {
      out,
      map
    };
  };
  /** Les plages [début, fin[ du texte d'origine où un mot commence un mot du texte (fusionnées, triées). */
  const spans = (s, words) => {
    const {
      out,
      map
    } = folded(s), got = [];
    for (const w of words)
      for (let p = out.indexOf(w); p >= 0; p = out.indexOf(w, p + 1))
        if (p === 0 || !WORD.test(out[p - 1])) got.push([map[p][0], map[p + w.length - 1][1], w]);
    got.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const g of got) {
      const last = merged[merged.length - 1];
      if (last && g[0] <= last[1]) last[1] = Math.max(last[1], g[1]);
      else merged.push([g[0], g[1]]);
    }
    return {
      merged,
      words: new Set(got.map(g => g[2]))
    };
  };
  /** Chaque mot commence un mot du texte (la règle du verbe signalement/lister, appliquée ici aux signalements de l'appareil et aux fiches). */
  const hits = (s, words) => !words.length || spans(s, words).words.size === words.length;
  /** Le texte échappé, les mots trouvés entourés de <mark> : la marque est posée par indices sur le texte échappé morceau par morceau, jamais tirée du texte. */
  const marks = (s, words) => {
    s = String(s || '');
    if (!words.length) return esc(s);
    let html = '',
      at = 0;
    for (const [a, b] of spans(s, words).merged) {
      html += `${esc(s.slice(at, a))}<mark>${esc(s.slice(a, b))}</mark>`;
      at = b;
    }
    return html + esc(s.slice(at));
  };
  /** Un extrait de 240 signes autour du premier mot trouvé (ou le début) : la même forme que l'`excerpt` du verbe, pour les signalements de l'appareil. */
  const excerptOf = (s, words) => {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    const first = words.length ? spans(s, words).merged[0]?.[0] ?? 0 : 0,
      from = Math.max(0, first - 80);
    return `${from ? '…' : ''}${s.slice(from, from + 240)}${from + 240 < s.length ? '…' : ''}`;
  };
  /** Le groupe d'un signalement par sa priorité (la table du contrat, décision de l'ergonome du 18 nov.) : rien de choisi → À classer ; une seule moitié choisie se lit avec l'autre absente. */
  const groupOf = it => {
    const g = it.gravity,
      f = it.frequency;
    if (!g && !f) return 'unrated';
    if (g === 'blocking' || (g === 'annoying' && f === 'always')) return 'now';
    if ((g === 'annoying' && f === 'often') || (g === 'minor' && f === 'always')) return 'next';
    return 'later';
  };
  /** Une ligne [fr, en, de, es] d'un texte de roadmap.json ({ fr, en, de, es }) : une langue absente reprend l'anglais, puis le français (la règle de roadmap.js). */
  const rowOf = o => {
    const en = text(o?.en, 200) || text(o?.fr, 200);
    return [text(o?.fr, 200) || en, en, text(o?.de, 200) || en, text(o?.es, 200) || en];
  };
  let RM = null;
  /** roadmap.json, lu une fois par page : les fiches (identifiant, titre, état) et la table `reports` (signalement → fiche, réponse, refus) que le générateur y copie. Une entrée mal formée est ignorée. */
  const rmOf = c => RM ||= fetch(new URL('frame/help/roadmap.json', c.root), {
    cache: 'no-cache'
  }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
    const cards = new Map(),
      reports = {};
    if (!d || typeof d !== 'object') {
      RM = null; // pas de fichier (hors ligne à la première visite) : relu au montage suivant
      return {
        cards,
        reports
      };
    }
    for (const l of Array.isArray(d.lanes) ? d.lanes : [])
      for (const it of Array.isArray(l?.items) ? l.items : [])
        if (it && FICHE.test(it.id) && !cards.has(it.id)) cards.set(it.id, {
          id: it.id,
          title: rowOf(it),
          state: ['done', 'doing', 'planned', 'later', 'refused'].includes(it.state) ? it.state : 'planned'
        });
    const src = d.reports && typeof d.reports === 'object' && !Array.isArray(d.reports) ? d.reports : {};
    let n = 0;
    for (const [k, v] of Object.entries(src)) {
      if (n >= MAX_REPORTS) break;
      if (!SG_ID.test(k) || !v || typeof v !== 'object' || !FICHE.test(v.fiche)) continue;
      reports[k] = {
        fiche: v.fiche,
        answer: text(v.answer, MAX_ANSWER),
        refused: v.refused === true
      };
      n++;
    }
    return {
      cards,
      reports
    };
  });
  /** Une ligne du verbe signalement/lister, relue aux règles de la page (entrée non fiable) ; null si elle n'en est pas une. */
  const itemOf = v => {
    if (!v || typeof v !== 'object' || !SG_ID.test(v.id)) return null;
    return {
      id: v.id,
      kind: KINDS.includes(v.kind) ? v.kind : '',
      title: text(v.title, MAX_TITLE) || v.id,
      excerpt: text(v.excerpt, 260),
      screen: SCREENS.includes(v.screen) ? v.screen : '',
      at: AT.test(v.at) ? v.at : '',
      fiche: FICHE.test(v.fiche) ? v.fiche : '',
      answer: text(v.answer, MAX_ANSWER),
      refused: v.refused === true,
      gravity: GRAV.includes(v.gravity) ? v.gravity : '',
      frequency: FREQ.includes(v.frequency) ? v.frequency : '',
      comments: Number.isInteger(v.comments) && v.comments > 0 ? Math.min(v.comments, 200) : 0
    };
  };
  const ctxOf = c => {
    const k = {};
    if (!c || typeof c !== 'object' || Array.isArray(c)) return k;
    if (typeof c.version === 'string' && VERSION.test(c.version)) k.version = c.version;
    if (LANGS.includes(c.lang)) k.lang = c.lang;
    if (DESIGNS.includes(c.design)) k.design = c.design;
    if (['phone', 'tablet', 'desktop'].includes(c.size)) k.size = c.size;
    return k;
  };
  const commentOf = v => v && typeof v === 'object' && COM_ID.test(v.id) && AT.test(v.at) && multi(v.text, MAX_CM) ? {
    id: v.id,
    at: v.at,
    text: multi(v.text, MAX_CM)
  } : null;
  /** La fiche d'un signalement (verbe signalement/detail), relue aux règles de la page ; null si elle n'en est pas une. */
  const detailOf = v => {
    const it = itemOf(v);
    if (!it) return null;
    return {
      ...it,
      text: multi(v.text, MAX_TEXT),
      ctx: ctxOf(v.ctx),
      folder: typeof v.folder === 'string' && TRI.test(v.folder) ? v.folder : '',
      images: (Array.isArray(v.images) ? v.images : []).filter(n => typeof n === 'string' && IMG.test(n)).slice(0, MAX_SHOTS),
      comments: (Array.isArray(v.comments) ? v.comments : []).slice(0, 200).map(commentOf).filter(Boolean)
    };
  };
  /** Les outils communs à la liste et à la fiche : le lanceur, ses verbes, les mots d'un état, d'une date, d'un écran, d'une priorité. */
  const tools = c => {
    const {
      t
    } = c;
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
    const kindLabel = k => KINDS.includes(k) ? t(T.kind[k]) : '';
    const stateLine = m => {
      if (m.via === 'poste') return m.state === 'fiche' ? t(T.state.fiche, {
        f: m.fiche || ''
      }) : m.state === 'read' ? t(T.state.read) : t(T.state.written);
      return m.pending ? t(T.state.inMin, {
        n: m.pending
      }) : t(T.state.sent);
    };
    /** L'état d'un signalement en couleur ET en mots : sans fiche (jaune), fiche prévue, en cours ou plus tard (bleu), faite (vert), refusée (rouge). */
    const pillOf = (rep, rm) => {
      const cd = rep.fiche ? rm?.cards.get(rep.fiche) : null;
      if (rep.refused || cd?.state === 'refused') return {
        k: 'err',
        w: t(T.stRefused)
      };
      if (!rep.fiche) return {
        k: 'warn',
        w: t(T.stNone)
      };
      return cd?.state === 'done' ? {
        k: 'ok',
        w: t(T.stDone, {
          f: rep.fiche
        })
      } : {
        k: 'accent',
        w: t(T.stCard, {
          f: rep.fiche
        })
      };
    };
    const p2 = n => String(n).padStart(2, '0');
    /** Une date du signalement (l'heure locale) : « 14/11 », ou « 14/11 à 11 h 38 » ; '' si elle n'est pas aux règles. */
    const when = (at, full) => {
      const d = AT.test(at || '') ? new Date(at) : null;
      if (!d || Number.isNaN(d.getTime())) return '';
      return t(full ? T.atFull : T.atDay, {
        D: p2(d.getDate()),
        M: p2(d.getMonth() + 1),
        h: d.getHours(),
        hh: p2(d.getHours()),
        mm: p2(d.getMinutes())
      });
    };
    const screenName = s => T.scr[s] ? t(T.scr[s]) : '';
    const prioText = it => [it.gravity && t(T.grav[it.gravity]), it.frequency && t(it.gravity ? T.freqLow[it.frequency] : T.freq[it
      .frequency])].filter(Boolean).join(' · ');
    const badge = p => `<span class="f-badge f-sg-state${p.unsent ? ' f-warn' : ''}"${p.k ? ` data-kind="${p.k}"` : ''} data-st>${esc(p.w)}</span>`;
    return {
      launcher,
      call,
      kindLabel,
      stateLine,
      pillOf,
      when,
      screenName,
      prioText,
      badge
    };
  };

  /** Dessine l'écran dans view ; `query.sig` (#signaler?sig=SIG-…) : la fiche de ce signalement à la place du formulaire et de la liste. */
  async function screen(view, c, query) {
    const {
      t
    } = c;
    // l'écran est monté de nouveau (une page qui se redessine, un retour, un autre élément de vue) : les écouteurs du montage précédent sont retirés, où qu'ils aient été posés — sinon chaque appui sur
    // « Envoyer » les faisait tous partir, chacun avec son état et son identifiant, et chaque saisie réécrivait le brouillon de l'ancien montage (SOG-0366 : un signalement en double ou en triple, même texte, même seconde, identifiants différents)
    await FLUSH?.(); // le brouillon du montage précédent est écrit AVANT de relire le brouillon (SOG-0409)
    MOUNTED?.abort();
    const mount = new AbortController();
    MOUNTED = mount;
    const sig = typeof query?.sig === 'string' && SG_ID.test(query.sig) ? query.sig : '';
    if (sig) {
      FLUSH = null; // la fiche n'a pas de formulaire : le brouillon reste tel que le montage précédent l'a écrit
      return sheet(view, c, sig, mount);
    }
    const K = tools(c);
    const st = await readStore(c);
    if (mount.signal.aborted) return; // un montage plus récent a pris la place pendant la lecture
    const ui = {
      ch: null, // 'poste' | 'poste-off' | 'pilote' | 'old'
      shots: [], // les fichiers choisis (poste)
      pshots: [], // les photos RÉDUITES (un pilote, sans lanceur) : { name, bytes, type, w, h }
      reducing: false,
      note: '', // { kind: 'ok' | 'warn', text }
      sending: false,
      pilots: null, // { items, left, more, refs } | null
      busy: false,
      // « Mes signalements » (SOG-0410)
      src: 'local', // 'poste' : la liste vient du verbe signalement/lister ; 'local' : les signalements de l'appareil (pilote, lanceur absent ou ancien)
      all: [], // les signalements du poste (signalement/lister, sans recherche)
      total: 0,
      q: '', // la recherche affichée
      found: null, // { items, searched } : la réponse du verbe à la recherche `q`
      more: {}, // groupe → nombre de lignes montrées (7, puis 7 de plus à chaque « Voir les n suivants »)
      rm: null, // roadmap.json : fiches et table `reports`
      listHtml: null, // la liste dessinée : réécrite seulement si elle change
      ready: false // la liste est la bonne (celle du poste quand c'est le poste) : la ligne de la fiche quittée peut reprendre le focus
    };
    const {
      launcher,
      call,
      stateLine,
      kindLabel
    } = K;
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
    view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-muted" data-lead></p>
      <form class="f-card f-sg" data-form autocomplete="off">
        <fieldset class="f-sg-kinds"><legend>${esc(t(T.kinds))}</legend>${KINDS.map(k => `<label><input type="radio" name="sg-kind" value="${k}"${st.draft.kind === k ? ' checked' : ''}> ${esc(kindLabel(k))}</label>`).join('')}</fieldset>
        <label class="f-field">${esc(t(T.fTitle))}<input type="text" data-title maxlength="${MAX_TITLE}" placeholder="${esc(t(T.fTitleHint))}" value="${esc(st.draft.title)}"><small class="f-muted f-rc-count" data-tcount></small></label>
        <label class="f-field">${esc(t(T.fText))}<textarea data-text rows="${ROWS_MIN}" maxlength="${MAX_TEXT}" placeholder="${esc(t(T.fTextHint))}">${esc(st.draft.text)}</textarea><small class="f-muted f-rc-count" data-xcount hidden></small></label>
        <div class="f-sg-where" data-where><b class="f-sg-wt">${esc(t(T.noted))}</b><span data-wtext></span>
          <label class="f-check"><input type="checkbox" data-wc checked> ${esc(t(T.notedJoin))}</label></div>
        <div class="f-sg-shots" data-shotsbox hidden><label class="f-field"><span data-shotslabel>${esc(t(T.shots))}</span><input type="file" data-shots accept="image/png,image/jpeg,image/webp" multiple></label><p class="f-muted" data-shotslist></p><p class="f-muted" data-shotsnote>${esc(t(T.shotsNote))}</p></div>
        <p class="f-muted" data-shotsinfo hidden></p>
        <div class="f-row"><button type="submit" class="primary" data-send disabled>${esc(t(T.send))}</button> <span class="f-muted" data-why></span></div>
      </form>
      <div data-note role="status"></div>
      <h2>${esc(t(T.mine))}</h2><input type="search" class="f-sg-q" data-q maxlength="200" autocomplete="off" spellcheck="false" aria-label="${esc(t(T.searchMine))}" placeholder="${esc(t(T.searchMine))}"><div data-mine></div>
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
    let dirty = false,
      saveTimer = 0,
      fitRaf = 0;
    /** Écrit le brouillon en attente (s'il y en a un) ; rend la promesse de l'écriture. */
    const flushDraft = () => {
      clearTimeout(saveTimer);
      saveTimer = 0;
      if (!dirty) return;
      dirty = false;
      st.draft = withId(draft());
      return saveStore(c, st);
    };
    const queueDraft = () => {
      dirty = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flushDraft, DRAFT_MS);
    };
    FLUSH = flushDraft;
    /** La hauteur du champ suit le texte une fois par image, pas à chaque signe (deux mises en page forcées à chaque fois). */
    const fitSoon = () => {
      if (fitRaf) return;
      fitRaf = requestAnimationFrame(() => {
        fitRaf = 0;
        if (!mount.signal.aborted) fitText();
      });
    };
    const on = (type, fn) => view.addEventListener(type, fn, {
      signal: mount.signal
    }); // les écouteurs de CE montage : retirés quand l'écran est monté de nouveau
    const draft = () => ({
      kind: view.querySelector('input[name="sg-kind"]:checked')?.value || 'bug',
      title: $('[data-title]').value,
      text: $('[data-text]').value
    });
    /** Le brouillon avec son identifiant : fixé UNE fois, à la première saisie, gardé avec le brouillon ; un envoi, une reprise, un écran remonté réécrivent le MÊME fichier (SOG-0366 : quatre signalements arrivés en double ou en triple). */
    const withId = d => ({
      ...d,
      id: SG_ID.test(st.draft?.id) ? st.draft.id : d.title.trim() || d.text.trim() ? rid() : ''
    });
    /** Ce que la frappe fait de l'écran (SOG-0409) : les deux compteurs et l'état du bouton Envoyer, écrits seulement s'ils changent ; rien d'autre n'est redessiné à la frappe. */
    const paintTyping = () => {
      if (mount.signal.aborted) return;
      const chk = ui.ch === null,
        d = draft(),
        tc = `${d.title.length} / ${MAX_TITLE}`,
        tn = $('[data-tcount]');
      if (tn.textContent !== tc) tn.textContent = tc;
      const xc = $('[data-xcount]'),
        xt = t(T.count, {
          n: d.text.length,
          max: MAX_TEXT
        });
      if (xc.hidden !== d.text.length < COUNT_FROM) xc.hidden = d.text.length < COUNT_FROM;
      if (xc.textContent !== xt) xc.textContent = xt;
      const can = !chk && ui.ch !== 'old' && !ui.sending && !ui.reducing && d.title.trim() && d.text.trim();
      if ($('[data-send]').disabled !== !can) $('[data-send]').disabled = !can;
    };
    const paint = () => {
      if (mount.signal.aborted) return; // un montage plus récent a pris la place : celui-ci n'écrit plus rien
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
      // le téléphone peut joindre une photo (SOG-0335) : réduite ici, elle part dans le dépôt des données avec le signalement ; l'écran le dit avant l'envoi
      $('[data-shotsbox]').hidden = ui.ch !== 'poste' && ui.ch !== 'pilote';
      const sn = $('[data-shotsnote]');
      if (sn.hidden !== (ui.ch !== 'poste')) sn.hidden = ui.ch !== 'poste';
      const sb = $('[data-shotslabel]'),
        sbText = t(ui.ch === 'pilote' ? T.photoLabel : T.shots);
      if (sb.textContent !== sbText) sb.textContent = sbText;
      const ns = $('[data-shotsinfo]'),
        nsText = ui.ch === 'pilote' ? t(ui.reducing ? T.photoReducing : T.photoInfo) : '';
      if (ns.hidden !== !nsText) ns.hidden = !nsText;
      if (ns.textContent !== nsText) ns.textContent = nsText;
      const sl = $('[data-shotslist]');
      sl.textContent = ui.ch === 'pilote' ? ui.pshots.map(f => `${f.name} (${f.w}×${f.h}, ${Math.max(1, Math.round(f.bytes.length / 1024))} Ko)`).join(' · ') : ui.shots.map(f => f.name).join(' · ');
      paintTyping();
      const sendTxt = t(ui.sending || ui.reducing ? T.sendingLbl : T
        .send); // le bouton est « occupé » pendant l'envoi : un second appui n'a rien à faire
      if ($('[data-send]').textContent !== sendTxt) $('[data-send]').textContent = sendTxt;
      $('[data-why]').textContent = ui.ch === 'pilote' ? t(T.whyPilot) : ui.ch === 'poste' ? t(T.whyPost) : '';
      const n = $('[data-note]');
      const html = ui.note ? `<p class="${ui.note.kind === 'warn' ? 'f-warn' : 'f-card'}" data-kind="${esc(ui.note.kind)}">${esc(ui.note.text)}</p>` : '';
      if (n.innerHTML !== html) n.innerHTML = html;
      paintList();
      paintPilots();
    };

    // ---- « Mes signalements » (SOG-0410) : la liste par priorité (poste), la recherche, les lignes ; écrite seulement quand elle change (la frappe du formulaire n'y touche jamais : SOG-0409)
    /** Les signalements de l'appareil (non envoyés d'abord) : l'état de la table `reports` de roadmap.json quand elle a le signalement, sinon celui d'aujourd'hui. */
    const localItems = () => [...st.unsent.map(u => ({
      ...u,
      unsent: true
    })), ...st.mine].slice(0, MINE_MAX + UNSENT_MAX).map(m => {
      const rep = ui.rm?.reports[m.id];
      return {
        id: m.id,
        kind: m.kind,
        title: m.title,
        text: m.text || '',
        screen: m.screen && m.screen !== 'other' ? m.screen : '',
        at: m.at,
        fiche: rep?.fiche || '',
        answer: rep?.answer || '',
        pill: rep ? K.pillOf(rep, ui.rm) : m.unsent ? {
          k: 'warn',
          w: t(T.state.unsent),
          unsent: true
        } : {
          k: '',
          w: stateLine(m)
        }
      };
    });
    const withPill = it => ({
      ...it,
      pill: K.pillOf(it, ui.rm)
    });
    const hayOf = it => [it.title, it.text || it.excerpt, K.screenName(it.screen), it.fiche, it.answer].filter(Boolean).join('\n');
    const rowHtml = (it, words) => {
      const ex = words.length ? it.excerpt || (it.text ? excerptOf(it.text, words) : '') : '',
        meta = [K.when(it.at), K.screenName(it.screen)].filter(Boolean).map(esc).join(' · '),
        pri = K.prioText(it);
      return `<li data-id="${esc(it.id)}"><a class="f-sg-row" href="#signaler?sig=${esc(it.id)}" data-sig="${esc(it.id)}"><span class="f-sg-l1">${it.kind ? `<span class="f-sg-tag">${esc(kindLabel(it.kind))}</span> ` : ''}<b class="f-sg-t"><bdi>${marks(it.title, words)}</bdi></b></span>${ex ? `<span class="f-sg-ex"><bdi>${marks(ex, words)}</bdi></span>` : ''}<span class="f-sg-meta">${K.badge(it.pill)}${meta ? ` · ${meta}` : ''}${pri ? ` · <span class="f-sg-pri" data-pri>${esc(pri)}</span>` : ''}</span></a></li>`;
    };
    /** Une fiche de roadmap.json trouvée par la recherche : son identifiant, son titre (mots marqués), son état et le nombre de signalements qui y sont liés ; elle s'ouvre dans la Roadmap. */
    const cardHtml = (cd, words) => {
      const n = ui.all.filter(i => i.fiche === cd.id).length,
        p = cd.state === 'refused' ? {
          k: 'err',
          w: t(T.stRefused)
        } : {
          k: cd.state === 'done' ? 'ok' : 'accent',
          w: t(T.cst[cd.state] || T.cst.planned)
        };
      return `<li data-card="${esc(cd.id)}"><a class="f-sg-row" href="#roadmap?fiche=${esc(cd.id)}"><span class="f-sg-l1"><span class="f-sg-tag">${marks(cd.id, words)}</span> <b class="f-sg-t">${marks(t(cd.title), words)}</b></span><span class="f-sg-meta">${K.badge(p)} · ${esc(t(n === 1 ? T.linkedOne : T.linkedMany, { n }))}</span></a></li>`;
    };
    const grpHtml = (key, items, words, row) => {
      const n = ui.more[key] || PAGE,
        left = Math.max(0, items.length - n),
        step = Math.min(PAGE, left);
      return `<section class="f-sg-grp" data-grp="${key}">${key === 'mine' ? '' : `<h3>${esc(t(T.grp[key]))} <small class="f-muted" data-n>${items.length}</small></h3>`}<ul class="f-sg-rows">${items.slice(0, n).map(i => row(i, words)).join('')}</ul>${left ? `<button type="button" class="f-sg-more" data-more="${key}">${esc(t(step === 1 ? T.moreOne : T.moreMany, { n: step }))}</button>` : ''}</section>`;
    };

    function paintList() {
      if (mount.signal.aborted) return;
      const words = wordsOf(ui.q),
        poste = ui.src === 'poste';
      let html = '';
      if (!ui.q) {
        const items = poste ? ui.all.map(withPill) : localItems();
        html = !items.length ? `<p class="f-muted" data-none>${esc(t(T.mineNone))}</p>` : poste ? GROUPS.map(g => [g, items.filter(i =>
          groupOf(i) === g)]).filter(([, l]) => l.length).map(([g, l]) => grpHtml(g, l, words, rowHtml)).join('') : grpHtml('mine',
          items, words, rowHtml);
      } else {
        const local = poste ? null : localItems(),
          found = poste ? (ui.found?.items || []).map(withPill) : local.filter(i => hits(hayOf(i), words)),
          searched = poste ? ui.found?.searched ?? ui.total : local.length,
          cards = poste && words.length ? [...(ui.rm?.cards.values() || [])].filter(cd => hits(`${cd.id} ${t(cd.title)}`, words))
          .slice(0, MAX_CARDS) : [];
        html = (found.length ? grpHtml('found', found, words, rowHtml) : `<p class="f-muted" data-none>${esc(t(searched === 1 ? T.noneFoundOne : T.noneFound, { q: text(ui.q, 60), n: searched }))}</p>`) +
          (cards.length ? grpHtml('cards', cards, words, cardHtml) : '');
      }
      const box = $('[data-mine]');
      if (ui.listHtml !== html) {
        ui.listHtml = html;
        box.innerHTML = html;
      }
      const ph = t(poste ? T.search : T.searchMine),
        q = $('[data-q]');
      if (q.placeholder !== ph) q.placeholder = ph;
      if (q.getAttribute('aria-label') !== ph) q.setAttribute('aria-label', ph);
      // retour d'une fiche : sa ligne reprend le focus (une fois, quand elle est dessinée)
      if (LAST_SIG && !ui.q && ui.ready) {
        const a = box.querySelector(`a[data-sig="${LAST_SIG}"]`);
        if (a) {
          LAST_SIG = '';
          a.focus({
            preventScroll: true
          });
          a.scrollIntoView({
            block: 'center'
          });
        }
      }
    }
    /** Les signalements du poste : UN appel du verbe signalement/lister (au montage, après un envoi) ; un lanceur qui ne le connaît pas laisse la liste de l'appareil. */
    const loadList = async () => {
      const r = await call('lister', {
        limit: MAX_LIST
      });
      if (mount.signal.aborted) return;
      if (r.ok && Array.isArray(r.items)) {
        ui.src = 'poste';
        ui.all = r.items.slice(0, MAX_LIST).map(itemOf).filter(Boolean);
        ui.total = Number.isInteger(r.total) && r.total >= 0 ? r.total : ui.all.length;
      } else ui.src = 'local';
    };
    let qTimer = 0,
      qSeq = 0;
    /** La recherche, 300 ms après la dernière frappe dans son champ : le verbe sur le poste (le texte entier, côté lanceur), les signalements de l'appareil sinon. */
    const runSearch = async () => {
      const q = text($('[data-q]').value, 200),
        seq = ++qSeq;
      if (!q || ui.src !== 'poste') {
        ui.q = q;
        ui.found = null;
        ui.more = {};
        return paintList();
      }
      const r = await call('lister', {
        q,
        limit: MAX_LIST
      });
      if (seq !== qSeq || mount.signal.aborted) return; // une recherche plus récente est partie : celle-ci ne dessine rien
      ui.q = q;
      ui.more = {};
      ui.found = r.ok && Array.isArray(r.items) ? {
        items: r.items.slice(0, MAX_LIST).map(itemOf).filter(Boolean),
        searched: Number.isInteger(r.searched) && r.searched >= 0 ? r.searched : ui.total
      } : { // le verbe ne répond pas : la recherche se fait sur ce que la liste a déjà (titre, extrait, écran, fiche, réponse)
        items: ui.all.filter(i => hits(hayOf(i), wordsOf(q))),
        searched: ui.all.length
      };
      paintList();
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
      box.innerHTML = `<h2>${esc(t(T.pilots))}${left ? ` <small class="f-muted" data-left>${esc(t(T.pilotsLeft, { n: left }))}</small>` : ''}</h2><p class="f-muted">${esc(t(T.pilotsIntro))}</p>${p.items.length ? `<ul class="f-sg-list" data-plist>${p.items.map(i => `<li data-p="${esc(i.folder)}/${esc(i.id)}">${i.report ? `<span class="f-sg-tag">${esc(kindLabel(i.report.kind))}</span> <span class="f-sg-t">${esc(i.report.title)}</span><div class="f-muted">${esc(t(T.pilotsFrom, { tri: i.folder }))}</div><div class="f-sg-body">${esc(i.report.text)}</div>${i.images?.length ? `<div class="f-sg-imgs" data-pimgs><small class="f-muted">${esc(t(T.photosOf))}</small><div>${i.images.map(m => `<img src="${esc(m.url)}" alt="" width="${m.w > m.h ? 120 : Math.round(120 * m.w / m.h)}" height="${m.w > m.h ? Math.round(120 * m.h / m.w) : 120}">`).join('')}</div></div>` : ''}${i.refused ? `<div class="f-warn" data-pimg-refused>${esc(t(T.photoRefused))}</div>` : ''}${i.taken ? `<span class="f-sg-state">${esc(t(T.taken))}</span>` : `<button type="button" data-take="${esc(i.folder)}/${esc(i.id)}">${esc(t(T.take))}</button>`}` : `<span class="f-muted">${esc(t(T.invalid))}</span>`}</li>`).join('')}</ul>` : `<p class="f-muted" data-pnone>${esc(t(T.pilotsNone))}</p>`}${p.more ? `<p class="f-muted">${esc(t(T.pilotsMore, { n: p.more }))}</p>` : ''}`;
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
      // les photos jointes : le texte est borné avant d'être analysé, puis les MÊMES contrôles qu'à l'écriture (signature des octets, base64 vérifié avant décodage, dimensions, pas d'EXIF) ;
      // une photo qui échoue est dite et n'est ni affichée ni reprise ; l'image est un blob du type RECONNU, montré par <img>, jamais du HTML
      const readPhotos = async (f, want) => {
        const SI = await import(new URL('frame/lib/signal_image.js', c.root).href),
          images = [];
        let refused = 0;
        for (let n = 1; n <= want; n++) {
          let doc = null;
          try {
            const r = await Promise.race([Promise.resolve(c.data.read(`pilot/${f.folder}/signalements/${f.id}/${n}.json`, {
              wait: true
            })), new Promise(res => setTimeout(() => res(null), 4000))]);
            const raw = r?.value ?? r?.text ?? null;
            if (typeof raw === 'string' && raw.length <= SI.LIMITS.doc) doc = JSON.parse(raw);
            else if (raw && typeof raw === 'object' && JSON.stringify(raw).length <= SI.LIMITS.doc) doc = raw;
          } catch {
            doc = null;
          }
          const k = SI.checkDoc(doc, {
            id: f.id,
            n
          });
          if (k.ok) images.push({
            n,
            b64: doc.b64,
            w: k.w,
            h: k.h,
            url: URL.createObjectURL(new Blob([k.bytes], {
              type: `image/${k.type}`
            }))
          });
          else refused++;
        }
        return {
          images,
          refused
        };
      };
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
        const report = reportOf(doc),
          want = report && Number.isInteger(doc?.shots) && doc.shots >= 1 && doc.shots <= MAX_SHOTS ? doc.shots : 0;
        return {
          ...f,
          report,
          taken: taken.has(`${f.folder}/${f.id}`),
          ...(want ? await readPhotos(f, want) : {})
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
      ui.ready = ui.ch !== 'poste'; // la liste est celle de l'appareil : prête ; le poste attend la sienne
      paint();
      if (ui.ch === 'poste') {
        await refreshStates();
        await flush();
        await loadList(); // SOG-0410 : la liste du poste, un appel au montage
        ui.ready = true;
        paint();
        loadPilots(r.refs || []);
      } else if (ui.ch === 'pilote') {
        await queueLeft();
        await flush();
        paint();
      }
    };
    /** Ce que l'appareil garde, « non envoyé » : renvoyé quand le canal répond. */
    // SOG-0335 : un appui sur « Envoyer » fait UN signalement. Le même texte (sorte, titre, texte) dans la minute n'en fait pas un second, et ce qui attend « non envoyé » en plusieurs
    // exemplaires identiques ne part qu'une fois
    const sigOf = r => [r.kind, r.title, r.text].join('\u0001'),
      DUP_MS = 60000;
    const isDup = r => {
      const k = sigOf(r);
      return (ui.lastSent && ui.lastSent.sig === k && Date.now() - ui.lastSent.at < DUP_MS) || st.unsent.some(u => sigOf(u) === k &&
        Date.now() - Date.parse(u.at) < DUP_MS);
    };
    const flush = async () => {
      if (!st.unsent.length || (ui.ch !== 'poste' && ui.ch !== 'pilote')) return;
      const seen = new Set();
      st.unsent = st.unsent.filter(u => {
        const k = `${u.via}|${sigOf(u)}`;
        return seen.has(k) ? false : (seen.add(k), true);
      });
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
          text: r.text,
          screen: r.screen,
          at: AT.test(res.at) ? res.at : now(),
          via: 'poste',
          state: 'written'
        });
        st.mine = st.mine.slice(0, MINE_MAX);
        await saveStore(c, st);
        if (ui.src === 'poste') await loadList(); // la liste du poste suit : le signalement écrit y entre
        return res.id;
      }
      ui.refusal = res;
      return false;
    };
    const sendPilot = async (r, photos = []) => {
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
        const SI = photos.length ? await import(new URL('frame/lib/signal_image.js', c.root).href) : null;
        // les photos d'abord (un document chacune, à côté du signalement), le signalement ensuite : il ne dit « n photos » qu'une fois celles-ci écrites
        for (let k = 0; k < photos.length && k < MAX_SHOTS; k++) {
          const doc = {
            schema: SI.SCHEMA,
            id,
            n: k + 1,
            b64: SI.toB64(photos[k].bytes)
          };
          if (!SI.checkDoc(doc, {
              id,
              n: k + 1
            }).ok) throw new Error('photo');
          await c.data.put(`pilot/${tri}/signalements/${id}/${k + 1}.json`, doc);
        }
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
          ...(photos.length ? {
            shots: Math.min(photos.length, MAX_SHOTS)
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
        text: r.text,
        screen: r.screen,
        at,
        via: 'pilote'
      });
      st.mine = st.mine.slice(0, MINE_MAX);
      await saveStore(c, st);
      await queueLeft();
      return id;
    };
    const submit = async () => {
      if (ui.sending || SENDING || mount.signal.aborted) return;
      clearTimeout(saveTimer); // le brouillon en attente ne se réécrit pas après l'envoi (il serait celui qui vient de partir)
      saveTimer = 0;
      dirty = false;
      const d = withId(draft());
      const r = reportOf({
        ...d,
        screen: screenNow(),
        ...($('[data-wc]').checked ? {
          ctx: ctxNow()
        } : {})
      });
      if (!r) return;
      if (isDup(r)) {
        ui.note = {
          kind: 'warn',
          text: t(T.duplicate)
        };
        paint();
        return;
      }
      r.id = d.id; // l'identifiant fixé à la saisie : une reprise réécrit le même fichier
      ui.sending = true;
      SENDING = true;
      ui.refusal = null;
      ui.lastSent = {
        sig: sigOf(r),
        at: Date.now()
      };
      paint();
      let id = false;
      try {
        if (ui.ch === 'poste') id = await sendPost(r, ui.shots);
        else if (ui.ch === 'pilote') id = await sendPilot(r, ui.pshots);
        else if (ui.ch === 'poste-off') ui.refusal = {
          offline: true
        };
      } finally {
        // le verrou se rend toujours, même si une lecture de capture ou une écriture lève (Sécurisation : sinon « Envoyer » resterait mort jusqu'au rechargement)
        ui.sending = false;
        SENDING = false;
      }
      if (!id && !ui.refusal?.offline && ui.ch !== 'poste-off' && ui.refusal?.reason !== 'no-write') ui.lastSent =
        null; // refusé net : le même texte peut être renvoyé
      if (id) {
        ui.note = {
          kind: 'ok',
          text: t(ui.ch === 'pilote' ? T.sentPilot : T.sentPost, {
            id,
            path: `pilot/${c.trigram?.() || ''}/signalements/${id}.json`
          }) + (ui.ch === 'pilote' && ui.pshots.length ? t(T.photoSent, {
            n: ui.pshots.length
          }) : '')
        };
        st.draft = {
          kind: d.kind,
          title: '',
          text: '',
          id: '' // le signalement suivant aura le sien
        };
        $('[data-title]').value = '';
        $('[data-text]').value = '';
        ui.shots = [];
        ui.pshots = [];
        $('[data-shots]').value = '';
        fitText();
        await saveStore(c, st);
        c.notify?.(ui.note.text, 'ok');
      } else {
        const why = ui.refusal?.reason,
          keepUnsent = async via => {
            st.unsent.unshift({
              ...r,
              id: SG_ID.test(r.id) ? r.id : rid(), // le même identifiant : sa reprise réécrira le même fichier
              at: now(),
              via
            });
            st.draft = {
              kind: d.kind,
              title: '',
              text: '',
              id: ''
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
        ...(it.images?.length ? {
          images: it.images.map(m => ({
            data: m.b64
          }))
        } : {}),
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
    /** Les photos d'un appareil sans lanceur : chacune est RÉDUITE ici (canvas : l'EXIF part avec) avant tout ; une photo illisible ou trop lourde même réduite est dite. */
    const pickPhotos = async (files, input) => {
      ui.pshots = [];
      ui.note = '';
      const tooMany = files.length > MAX_SHOTS,
        bad = files.find(f => !/^image\//.test(f.type) || f.size > 30e6 || f.size < 1);
      if (tooMany || bad) {
        ui.note = {
          kind: 'warn',
          text: t(T.photoBad, {
            name: bad ? text(bad.name, 60) : `> ${MAX_SHOTS}`
          })
        };
        input.value = '';
        paint();
        return;
      }
      ui.reducing = true;
      paint();
      const SI = await import(new URL('frame/lib/signal_image.js', c.root).href);
      for (const f of files) {
        const r = await SI.reduce(f).catch(e => ({
          why: 'unreadable',
          detail: String(e?.name || 'error').slice(0, 40)
        }));
        if (r.why) {
          ui.pshots = [];
          // LAQUELLE des deux causes, et avec quoi : illisible (l'erreur du navigateur) ou trop lourde (le poids atteint au mieux)
          ui.note = {
            kind: 'warn',
            text: r.why === 'too-big' ? t(T.photoHeavy, {
              name: text(f.name, 60),
              kb: Math.round(r.bytes / 1024)
            }) : t(T.photoUnreadable, {
              name: text(f.name, 60),
              why: r.detail || '?'
            })
          };
          input.value = '';
          break;
        }
        ui.pshots.push({
          name: text(f.name, 60),
          bytes: r.bytes,
          type: r.type,
          w: r.w,
          h: r.h
        });
      }
      ui.reducing = false;
      paint();
    };
    // SOG-0409 : la frappe ne touche que la mémoire (le brouillon, les compteurs, la hauteur du champ à la cadence de l'image) ; le brouillon s'écrit 800 ms après la dernière frappe, au départ
    // de l'écran (nouveau montage), au passage en arrière-plan et à l'envoi — avant, chaque signe écrivait device/signaler.json, ce qui relançait tout le chargement de l'appareil
    on('input', e => {
      if (e.target.matches('[data-title],[data-text]')) {
        fitSoon();
        st.draft = withId(draft());
        paintTyping();
        queueDraft();
      } else if (e.target.matches(
          '[data-q]'
        )) { // SOG-0410 : la recherche part 300 ms après la dernière frappe dans SON champ ; le formulaire n'en déclenche aucune
        clearTimeout(qTimer);
        qTimer = setTimeout(runSearch, Q_MS);
      }
    });
    on('change', e => {
      if (e.target.matches('input[name="sg-kind"]')) {
        st.draft = withId(draft());
        saveStore(c, st);
      } else if (e.target.matches('[data-shots]')) {
        const files = [...e.target.files];
        if (ui.ch === 'pilote') {
          pickPhotos(files, e.target);
          return;
        }
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
    on('submit', e => {
      e.preventDefault();
      submit();
    });
    on('click', e => {
      const b = e.target.closest('[data-take]');
      if (b) take(b.dataset.take);
      const more = e.target.closest('[data-more]');
      if (more && GROUPS.concat('found', 'cards', 'mine').includes(more.dataset
          .more)) { // « Voir les n suivants » : sept lignes de plus, ici seulement
        const g = more.dataset.more,
          was = ui.more[g] || PAGE;
        ui.more[g] = was + PAGE;
        paintList();
        $(`[data-grp="${g}"] .f-sg-rows > li:nth-child(${was + 1}) a`)?.focus();
      }
      if (e.target.closest('a[data-sig]')) FROM_LIST =
        true; // la fiche s'ouvre par son adresse (#signaler?sig=…) : « ← Mes signalements » reviendra en arrière
    });
    mount.signal.addEventListener('abort', () => clearTimeout(qTimer));
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void flushDraft(), {
      signal: mount.signal
    });
    addEventListener('pagehide', () => void flushDraft(), {
      signal: mount.signal
    });
    fitText();
    paint();
    rmOf(c).then(rm => { // roadmap.json : les fiches liées et la table `reports` ; la liste est redessinée seulement si elle change
      ui.rm = rm;
      paintList();
    });
    check();
  }
  /** La fiche d'un signalement (#signaler?sig=SIG-…, SOG-0410), dans le même écran : sorte, état, titre, contexte noté, texte, captures (leurs noms), fiche liée et réponse ;
   *  sur le poste (verbe signalement/detail), la priorité (deux rangées de trois boutons, signalement/noter) et les commentaires (signalement/commenter). Un pilote : ce que
   *  l'appareil garde, et la table `reports` de roadmap.json. Le brouillon du formulaire n'est pas touché. Tout texte d'un signalement est une donnée : échappé, isolé (<bdi>), jamais un lien. */
  async function sheet(view, c, sig, mount) {
    const {
      t
    } = c;
    const K = tools(c);
    LAST_SIG = sig;
    view.innerHTML = `<p class="f-sg-backp"><a href="#signaler" class="f-sg-back" data-back>${esc(t(T.back))}</a></p><div data-sheet="${esc(sig)}" aria-busy="true"><p class="f-muted" data-reading>${esc(t(T.reading))}</p></div>`;
    const $ = s => view.querySelector(s);
    const on = (type, fn) => view.addEventListener(type, fn, {
      signal: mount.signal
    });
    on('click', e => {
      // ouverte depuis la liste : le retour est celui du navigateur (la liste revient telle qu'elle était, sa ligne au focus) ; sinon l'adresse de la liste
      if (e.target.closest('[data-back]') && FROM_LIST && history.length > 1) {
        e.preventDefault();
        FROM_LIST = false;
        history.back();
      }
    });
    const [rm, r] = await Promise.all([rmOf(c), K.launcher() ? K.call('detail', {
      id: sig
    }) : {
      offline: true
    }]);
    if (mount.signal.aborted) return;
    let it = r.ok ? detailOf(r.item) : null;
    const poste = !!it && it.id === sig;
    if (poste) it.pill = K.pillOf(it, rm);
    else {
      it = null;
      const st = await readStore(c);
      if (mount.signal.aborted) return;
      const u = st.unsent.find(x => x.id === sig),
        m = u ? {
          ...u,
          unsent: true
        } : st.mine.find(x => x.id === sig),
        rep = rm.reports[sig];
      if (m) it = {
        id: sig,
        kind: m.kind,
        title: m.title,
        text: m.text || '',
        screen: m.screen && m.screen !== 'other' ? m.screen : '',
        at: m.at,
        ctx: ctxOf(m.ctx),
        folder: '',
        images: [],
        comments: [],
        fiche: rep?.fiche || '',
        answer: rep?.answer || '',
        refused: rep?.refused === true,
        pill: rep ? K.pillOf(rep, rm) : m.unsent ? {
          k: 'warn',
          w: t(T.state.unsent),
          unsent: true
        } : {
          k: '',
          w: K.stateLine(m)
        }
      };
    }
    const box = $('[data-sheet]');
    box.removeAttribute('aria-busy');
    if (!it) {
      box.innerHTML = `<p class="f-card" data-unknown>${esc(t(T.unknown))}</p>`;
      return;
    }
    const ctx = it.ctx || {},
      line = [K.when(it.at, true), T.scr[it.screen] && t(T.ctxScreen, {
        s: K.screenName(it.screen)
      }), ctx.size && t(T.size[ctx.size]), ctx.design && t(T.ctxDesign, {
        d: ctx.design
      }), ctx.lang && T.langName[ctx.lang], ctx.version && t(T.ctxVersion, {
        v: ctx.version
      })].filter(Boolean).join(' · ');
    // la fiche liée : trouvée par son SOG-nnnn dans roadmap.json, son titre vient de là (jamais du signalement) ; son adresse est faite de l'identifiant vérifié
    const cd = it.fiche ? rm.cards.get(it.fiche) : null,
      cdState = cd ? cd.state === 'refused' ? t(T.stRefused) : t(T.cst[cd.state] || T.cst.planned) : '',
      fiche = it.fiche || it.answer ? `<section class="f-card f-sg-fiche" data-fiche="${esc(it.fiche)}"${it.pill.k ? ` data-kind="${it.pill.k}"` : ''}><h2>${esc(t(T.linked))}</h2>${it.fiche ? `<p data-ftitle><b>${esc(it.fiche)}</b>${cd ? ` — ${esc(t(cd.title))}` : ''}</p>` : ''}${cdState ? `<p class="f-muted" data-fstate>${esc(cdState)}</p>` : ''}${it.answer ? `<p class="f-sg-ans" data-answer><span class="f-muted">${esc(t(T.answer))}</span> <bdi>${esc(it.answer)}</bdi></p>` : ''}${it.fiche ? `<p><a class="f-sg-open" href="#roadmap?fiche=${esc(it.fiche)}" data-open-rm>${esc(t(T.openRm))}</a></p>` : ''}</section>` : '';
    const cmLi = cm => `<li data-cm="${esc(cm.id)}"><div class="f-muted f-sg-who">${esc(t(T.you))} · ${esc(K.when(cm.at, true))}</div><div class="f-sg-body"><bdi>${esc(cm.text)}</bdi></div></li>`;
    const side = !poste ? '' : `<div class="f-sg-side"><section class="f-card f-sg-prio" data-prio><h2>${esc(t(T.prio))}</h2>
      <p class="f-muted f-sg-axis">${esc(t(T.gravL))}</p><div class="f-sg-seg" role="group" aria-label="${esc(t(T.gravA))}">${GRAV.map(g => `<button type="button" class="f-pill" data-grav="${g}" aria-pressed="${it.gravity === g}">${esc(t(T.grav[g]))}</button>`).join('')}</div>
      <p class="f-muted f-sg-axis">${esc(t(T.freqL))}</p><div class="f-sg-seg" role="group" aria-label="${esc(t(T.freqA))}">${FREQ.map(f => `<button type="button" class="f-pill" data-freq="${f}" aria-pressed="${it.frequency === f}">${esc(t(T.freq[f]))}</button>`).join('')}</div>
      <p class="f-sg-gname" data-gname role="status"><b>${esc(t(T.grp[groupOf(it)]))}</b></p></section>
      <section class="f-card f-sg-cms" data-cms><h2>${esc(t(T.comments))} <small class="f-muted" data-cmn>${it.comments.length}</small></h2>${it.comments.length ? '' : `<p class="f-muted" data-cmnone>${esc(t(T.cmNone))}</p>`}<ol class="f-sg-cmlist" data-cmlist>${it.comments.map(cmLi).join('')}</ol>
      <label class="f-field">${esc(t(T.cmAdd))}<textarea data-cm-text rows="3" maxlength="${MAX_CM}" placeholder="${esc(t(T.cmHint))}"></textarea><small class="f-muted f-rc-count" data-cmcount hidden></small></label>
      <div class="f-row"><button type="button" class="primary" data-cmadd disabled>${esc(t(T.add))}</button></div></section></div>`;
    box.innerHTML = `<div class="f-sg-sheet"${poste ? ' data-poste' : ''}><div class="f-sg-main"><p class="f-sg-l1">${it.kind ? `<span class="f-sg-tag">${esc(K.kindLabel(it.kind))}</span> ` : ''}${K.badge(it.pill)}</p><h1 tabindex="-1" data-sheet-title><bdi>${esc(it.title)}</bdi></h1>${line ? `<p class="f-muted f-sg-ctx" data-ctx>${esc(line)}</p>` : ''}${it.folder ? `<p class="f-muted" data-folder>${esc(t(T.pilotsFrom, { tri: it.folder }))}</p>` : ''}${it.text ? `<p class="f-sg-body" data-body><bdi>${esc(it.text)}</bdi></p>` : ''}${it.images.length ? `<p class="f-muted" data-imgs>${esc(t(T.images, { names: it.images.join(', ') }))}</p>` : ''}${fiche}</div>${side}</div>`;
    $('[data-sheet-title]').focus();
    if (!poste) return;
    // ---- la priorité : la mise à jour se voit tout de suite, le verbe l'écrit ; un refus la remet comme avant et le dit
    let chain = Promise.resolve(),
      cmBusy = false;
    const paintPrio = () => {
      for (const b of view.querySelectorAll('[data-grav],[data-freq]')) {
        const on = String(b.dataset.grav ? it.gravity === b.dataset.grav : it.frequency === b.dataset.freq);
        if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
      }
      const g = t(T.grp[groupOf(it)]),
        n = $('[data-gname] b');
      if (n.textContent !== g) n.textContent = g;
    };
    const setPrio = (axis, val) => {
      if (it[axis] === val) return;
      const before = {
        gravity: it.gravity,
        frequency: it.frequency
      };
      it[axis] = val;
      paintPrio();
      chain = chain.then(async () => {
        const res = await K.call('noter', {
          id: sig,
          [axis]: val
        });
        if (mount.signal.aborted) return;
        if (res.ok) {
          if (GRAV.includes(res.gravity)) it.gravity = res.gravity;
          if (FREQ.includes(res.frequency)) it.frequency = res.frequency;
        } else {
          it.gravity = before.gravity;
          it.frequency = before.frequency;
          c.notify?.(t(T.prioFail), 'warn');
        }
        paintPrio();
      });
    };
    // ---- les commentaires : 2 000 signes (le compteur du formulaire), « Ajouter » écrit par le verbe ; un refus garde le texte dans le champ
    const paintCm = () => {
      const x = $('[data-cm-text]'),
        n = x.value.length,
        cc = $('[data-cmcount]'),
        ct = t(T.count, {
          n,
          max: MAX_CM
        });
      if (cc.hidden !== n < COUNT_FROM) cc.hidden = n < COUNT_FROM;
      if (cc.textContent !== ct) cc.textContent = ct;
      const off = cmBusy || !x.value.trim(),
        b = $('[data-cmadd]');
      if (b.disabled !== off) b.disabled = off;
    };
    const addCm = async () => {
      const x = $('[data-cm-text]'),
        body = multi(x.value, MAX_CM);
      if (!body || cmBusy) return;
      cmBusy = true;
      paintCm();
      const res = await K.call('commenter', {
        id: sig,
        text: body
      });
      if (mount.signal.aborted) return;
      cmBusy = false;
      const cm = res.ok ? commentOf(res.comment) : null;
      if (cm) {
        it.comments.push(cm);
        $('[data-cmlist]').insertAdjacentHTML('beforeend', cmLi(cm));
        $('[data-cmnone]')?.remove();
        $('[data-cmn]').textContent = String(it.comments.length);
        x.value = '';
      } else c.notify?.(t(T.cmFail), 'warn');
      paintCm();
    };
    on('input', e => e.target.matches('[data-cm-text]') && paintCm());
    on('click', e => {
      const p = e.target.closest('[data-grav],[data-freq]');
      if (p && GRAV.concat(FREQ).includes(p.dataset.grav || p.dataset.freq)) setPrio(p.dataset.grav ? 'gravity' : 'frequency', p
        .dataset.grav || p.dataset.freq);
      else if (e.target.closest('[data-cmadd]')) addCm();
    });
  }
  window.SogSignaler = {
    screen,
    T
  };
})();
