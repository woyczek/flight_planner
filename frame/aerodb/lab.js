(() => {
  'use strict';
  // V3 aerodb — « Laboratoire données » (écran du cadre #datalab, TEMPORAIRE : frame/aerodb/SPEC.md § « Laboratoire »).
  // Un écran d'administration, niveau Complet (bouton de la carte Administration des réglages, frame/settings/admin_links.js),
  // qui MESURE sur l'appareil de l'utilisateur ce que le projet « Données » (docs/technique/V3_APP_DONNEES.md) suppose :
  //   1. une ligne par source (lab_sources.js) : « Tester l'adresse » (fetch cronométré, diagnostic CORS / CSP), un lien direct
  //      « Ouvrir / Télécharger » (<a href target=_blank rel=noopener> : jamais d'adresse à recopier ; l'aide d'appui long se
  //      déplie et « Depuis un fichier » passe en avant quand le test a dit « bloqué par CORS ») et « Depuis un fichier »
  //      (sélecteur ; sur un poste avec lanceur, « Depuis Téléchargements » par la route existante GET /__setup/downloads) ;
  //   2. la chaîne du ZIP du SIA en trois modes mesurés à part (lab_measure.js, lab_run.js) : a fil principal comme V2
  //      (DOMParser), b Worker sans DOMParser (ZIP en mémoire), c Worker tout en flux ;
  //   3. la publication d'un essai par le transport GitHub du cadre, un bouton par taille (0,5 / 2 / 5,3 / 10 Mo : un bloc
  //      lab/essai-….json), chacun avec son résultat ou son erreur dans le rapport, même sans réponse (délai de 120 s), et le
  //      nettoyage qui liste ce qu'il supprime, seulement sur les boutons ;
  //   4. le rapport (lab_report.js), un résumé de dix lignes en tête, copiable et partageable, gardé dans cache/lab/report.json
  //      (politique cache, jamais synchronisé).
  // Il n'écrit rien d'autre : rien n'entre dans la base ni dans les modules. Contexte (frame/app.js) : { t, lang, notify, ask,
  // data (adaptateur : lit sia/base/ et écrit cache/lab/), aerodb, github() (transport ou null : le jeton reste dans le
  // cadre), githubInfo() ({ repo, branch } ou null), launcher() (relevé du lanceur ou null), level() }.
  const BASE = document.currentScript.src;
  const ROOT = new URL('../../', BASE).href;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const REPORT = 'cache/lab/report.json';
  const PUB_SIZES = [524288, 2097152, 5560000, 10485760]; // 0,5 / 2 / 5,3 (la zone fr) / 10 Mo
  const pubMs = () => { // délai sans réponse de la publication (essais : localStorage « sogLab:pubTimeoutMs »)
    try {
      return +localStorage.getItem('sogLab:pubTimeoutMs') || 120000;
    } catch {
      return 120000;
    }
  };

  const T = {
    title: ['Laboratoire données', 'Data laboratory', 'Daten-Labor', 'Laboratorio de datos'],
    intro: [
      'Mesure, sur cet appareil, si la base aéronautique peut être récupérée, analysée, compilée et publiée depuis un téléphone. Écran temporaire d’administration : rien n’entre dans la base ni dans les modules ; seuls le rapport (sur cet appareil) et les fichiers d’essai que vous publiez par le bouton sont écrits.',
      'Measures, on this device, whether the aeronautical base can be fetched, parsed, compiled and published from a phone. A temporary administration screen: nothing enters the base or the modules; only the report (on this device) and the trial files you publish with the button are written.',
      'Misst auf diesem Gerät, ob die Luftfahrtbasis von einem Telefon aus geholt, analysiert, kompiliert und veröffentlicht werden kann. Temporärer Verwaltungsbildschirm: nichts gelangt in die Basis oder die Module; nur der Bericht (auf diesem Gerät) und die per Taste veröffentlichten Testdateien werden geschrieben.',
      'Mide, en este dispositivo, si la base aeronáutica puede obtenerse, analizarse, compilarse y publicarse desde un teléfono. Pantalla temporal de administración: nada entra en la base ni en los módulos; solo se escriben el informe (en este dispositivo) y los archivos de prueba que usted publique con el botón.'
    ],
    level: ['Cet écran est réservé au niveau Complet (Réglages › Niveau).', 'This screen is for the Full level (Settings › Level).',
      'Dieser Bildschirm ist für die Stufe Vollständig (Einstellungen › Stufe).',
      'Esta pantalla es para el nivel Completo (Ajustes › Nivel).'
    ],
    cycle: ['Cycle AIRAC', 'AIRAC cycle', 'AIRAC-Zyklus', 'Ciclo AIRAC'],
    cycleCur: ['{id} (en vigueur depuis le {d})', '{id} (in force since {d})', '{id} (gültig seit {d})',
      '{id} (en vigor desde el {d})'
    ],
    cycleNext: ['{id} (suivant, le {d})', '{id} (next, on {d})', '{id} (nächster, am {d})', '{id} (siguiente, el {d})'],
    device: ['Cet appareil', 'This device', 'Dieses Gerät', 'Este dispositivo'],
    deviceLine: ['{app} · écran {w} px · {c} cœurs · mémoire déclarée {m} · tas JS {h}',
      '{app} · screen {w} px · {c} cores · declared memory {m} · JS heap {h}',
      '{app} · Bildschirm {w} px · {c} Kerne · deklarierter Speicher {m} · JS-Heap {h}',
      '{app} · pantalla {w} px · {c} núcleos · memoria declarada {m} · heap JS {h}'
    ],
    appMode: ['appli sur l’écran d’accueil', 'home-screen app', 'App vom Home-Bildschirm', 'app en la pantalla de inicio'],
    tabMode: ['onglet du navigateur', 'browser tab', 'Browser-Tab', 'pestaña del navegador'],
    unknown: ['non exposée', 'not exposed', 'nicht verfügbar', 'no expuesta'],
    crash: [
      'L’essai « {l} » commencé à {a} ne s’est pas terminé (dernière étape : {s}) : la page a été rechargée ou l’onglet tué, sans doute faute de mémoire. C’est noté dans le rapport.',
      'The run “{l}” started at {a} did not finish (last step: {s}): the page was reloaded or the tab was killed, probably for lack of memory. It is noted in the report.',
      'Der Lauf „{l}“, gestartet um {a}, wurde nicht beendet (letzter Schritt: {s}): die Seite wurde neu geladen oder der Tab beendet, wohl wegen Speichermangels. Im Bericht vermerkt.',
      'La prueba «{l}» iniciada a las {a} no terminó (último paso: {s}): la página se recargó o la pestaña se cerró, probablemente por falta de memoria. Queda anotado en el informe.'
    ],
    sources: ['Sources et adresses', 'Sources and addresses', 'Quellen und Adressen', 'Fuentes y direcciones'],
    sourcesHint: [
      '« Tester l’adresse » appelle l’adresse depuis cette page (c’est la mesure principale : le serveur autorise-t-il cette page à lire sa réponse ?). Quand il refuse (« bloqué par CORS »), le lien « Ouvrir / Télécharger » ouvre l’adresse elle-même : enregistrez le fichier (appui long), puis « Depuis un fichier » le donne à la même chaîne. Aucune adresse à recopier.',
      '“Test the address” calls the address from this page (the main measure: does the server let this page read its answer?). When it refuses (“blocked by CORS”), the “Open / Download” link opens the address itself: save the file (long press), then “From a file” feeds it to the same chain. No address to copy.',
      '„Adresse testen“ ruft die Adresse von dieser Seite aus auf (die Hauptmessung: erlaubt der Server dieser Seite, die Antwort zu lesen?). Lehnt er ab („durch CORS blockiert“), öffnet der Link „Öffnen / Herunterladen“ die Adresse selbst: Datei speichern (langes Drücken), dann führt „Aus einer Datei“ sie durch dieselbe Kette. Keine Adresse zu kopieren.',
      '«Probar la dirección» llama a la dirección desde esta página (la medida principal: ¿el servidor permite a esta página leer su respuesta?). Si lo rechaza («bloqueado por CORS»), el enlace «Abrir / Descargar» abre la propia dirección: guarde el archivo (pulsación larga) y «Desde un archivo» se lo da a la misma cadena. Ninguna dirección que copiar.'
    ],
    back: ['Réglages › Administration', 'Settings › Administration', 'Einstellungen › Verwaltung', 'Ajustes › Administración'],
    link: ['Ouvrir / Télécharger', 'Open / Download', 'Öffnen / Herunterladen', 'Abrir / Descargar'],
    helpTitle: ['Comment l’enregistrer sur iPhone', 'How to save it on iPhone', 'So speichern Sie es auf dem iPhone',
      'Cómo guardarlo en iPhone'
    ],
    helpPhone: [
      'Sur iPhone : appui long sur le lien, puis « Télécharger le fichier lié » ; le fichier arrive dans Fichiers › Téléchargements ; ensuite « Depuis un fichier ».',
      'On iPhone: long-press the link, then “Download Linked File”; the file lands in Files › Downloads; then “From a file”.',
      'Auf dem iPhone: den Link lange drücken, dann „Verknüpfte Datei laden“; die Datei erscheint in Dateien › Downloads; danach „Aus einer Datei“.',
      'En iPhone: mantenga pulsado el enlace y elija «Descargar archivo enlazado»; el archivo llega a Archivos › Descargas; después «Desde un archivo».'
    ],
    helpJson: [
      'Si Safari affiche le texte au lieu de l’enregistrer (JSON, GeoJSON) : même geste, l’appui long enregistre le fichier tel quel.',
      'If Safari shows the text instead of saving it (JSON, GeoJSON): same gesture, the long press saves the file as it is.',
      'Zeigt Safari den Text statt ihn zu speichern (JSON, GeoJSON): dieselbe Geste, das lange Drücken speichert die Datei unverändert.',
      'Si Safari muestra el texto en lugar de guardarlo (JSON, GeoJSON): el mismo gesto, la pulsación larga guarda el archivo tal cual.'
    ],
    login: ['Tester la connexion (à vide)', 'Test the login call (empty)', 'Anmeldeaufruf testen (leer)', 'Probar la conexión (vacía)'],
    shareFile: ['Enregistrer le résultat', 'Save the result', 'Ergebnis speichern', 'Guardar el resultado'],
    shareDone: ['Partage ouvert pour {n}.', 'Share sheet opened for {n}.', 'Teilen-Dialog für {n} geöffnet.',
      'Hoja de compartir abierta para {n}.'
    ],
    reportShared: ['Partage du rapport ouvert.', 'Share sheet opened for the report.', 'Teilen-Dialog für den Bericht geöffnet.',
      'Hoja de compartir abierta para el informe.'
    ],
    shareCancel: ['Partage annulé.', 'Share cancelled.', 'Teilen abgebrochen.', 'Compartir cancelado.'],
    shareFail: ['Partage impossible : {e}', 'Sharing failed: {e}', 'Teilen fehlgeschlagen: {e}', 'No se pudo compartir: {e}'],
    test: ['Tester l’adresse', 'Test the address', 'Adresse testen', 'Probar la dirección'],
    fromFile: ['Depuis un fichier', 'From a file', 'Aus einer Datei', 'Desde un archivo'],
    fromDownloads: ['Depuis Téléchargements', 'From Downloads', 'Aus Downloads', 'Desde Descargas'],
    stop: ['Arrêter', 'Stop', 'Stopp', 'Detener'],
    address: ['Adresse', 'Address', 'Adresse', 'Dirección'],
    meta: ['taille attendue ≈ {s} · licence : {l}', 'expected size ≈ {s} · licence: {l}', 'erwartete Größe ≈ {s} · Lizenz: {l}',
      'tamaño esperado ≈ {s} · licencia: {l}'
    ],
    wait: ['… {s}', '… {s}', '… {s}', '… {s}'],
    testing: ['Appel en cours…', 'Calling…', 'Aufruf läuft…', 'Llamando…'],
    ok: ['OK · HTTP {c} · {b} · {t} ({r})', 'OK · HTTP {c} · {b} · {t} ({r})', 'OK · HTTP {c} · {b} · {t} ({r})',
      'OK · HTTP {c} · {b} · {t} ({r})'
    ],
    okCut: ['OK · HTTP {c} · {b} lus (limite de lecture) · {t}', 'OK · HTTP {c} · {b} read (read cap) · {t}',
      'OK · HTTP {c} · {b} gelesen (Lesegrenze) · {t}',
      'OK · HTTP {c} · {b} leídos (límite de lectura) · {t}'
    ],
    http: ['Le serveur répond HTTP {c} · {t}', 'The server answers HTTP {c} · {t}', 'Der Server antwortet HTTP {c} · {t}',
      'El servidor responde HTTP {c} · {t}'
    ],
    cors: [
      'BLOQUÉ PAR CORS : le serveur répond, mais n’autorise pas cette page à lire sa réponse. Une appli native (HTTP natif) passerait ; Safari sur GitHub Pages, non.',
      'BLOCKED BY CORS: the server answers, but does not let this page read its answer. A native app (native HTTP) would get through; Safari on GitHub Pages would not.',
      'DURCH CORS BLOCKIERT: Der Server antwortet, erlaubt dieser Seite aber nicht, die Antwort zu lesen. Eine native App (natives HTTP) käme durch; Safari auf GitHub Pages nicht.',
      'BLOQUEADO POR CORS: el servidor responde, pero no permite a esta página leer su respuesta. Una app nativa (HTTP nativo) pasaría; Safari en GitHub Pages, no.'
    ],
    csp: ['BLOQUÉ PAR LA POLITIQUE DE LA PAGE (connect-src) : cet hôte n’y figure pas.',
      'BLOCKED BY THE PAGE POLICY (connect-src): this host is not listed.',
      'DURCH DIE SEITENRICHTLINIE BLOCKIERT (connect-src): Dieser Host ist nicht aufgeführt.',
      'BLOQUEADO POR LA POLÍTICA DE LA PÁGINA (connect-src): este host no figura en ella.'
    ],
    offline: ['Hors ligne.', 'Offline.', 'Offline.', 'Sin conexión.'],
    unreachable: ['INJOIGNABLE : aucune réponse (réseau, DNS, pare-feu, ou l’hôte refuse).',
      'UNREACHABLE: no answer (network, DNS, firewall, or the host refuses).',
      'NICHT ERREICHBAR: keine Antwort (Netz, DNS, Firewall oder der Host lehnt ab).',
      'INALCANZABLE: sin respuesta (red, DNS, cortafuegos, o el host rechaza).'
    ],
    timeout: ['Délai dépassé.', 'Timed out.', 'Zeitüberschreitung.', 'Tiempo agotado.'],
    aborted: ['Arrêté.', 'Stopped.', 'Gestoppt.', 'Detenido.'],
    chainDone: ['Chaîne : {x}', 'Chain: {x}', 'Kette: {x}', 'Cadena: {x}'],
    chainFail: ['Chaîne en échec : {e}', 'Chain failed: {e}', 'Kette fehlgeschlagen: {e}', 'Cadena fallida: {e}'],
    fileRead: ['{n} · {b} · lu en flux {s} (ArrayBuffer {a})', '{n} · {b} · read as a stream {s} (ArrayBuffer {a})',
      '{n} · {b} · als Stream gelesen {s} (ArrayBuffer {a})',
      '{n} · {b} · leído en flujo {s} (ArrayBuffer {a})'
    ],
    nameBad: ['Nom inattendu : « {n} » (attendu : {e}). Le fichier est mesuré quand même.',
      'Unexpected name: “{n}” (expected: {e}). The file is measured anyway.',
      'Unerwarteter Name: „{n}“ (erwartet: {e}). Die Datei wird trotzdem gemessen.',
      'Nombre inesperado: «{n}» (esperado: {e}). El archivo se mide igualmente.'
    ],
    nameCycle: ['Cycle lu dans le nom : {c} (du {d}).', 'Cycle read from the name: {c} (of {d}).',
      'Aus dem Namen gelesener Zyklus: {c} (vom {d}).', 'Ciclo leído del nombre: {c} (del {d}).'
    ],
    dlFound: ['Trouvé dans Téléchargements : {n} ({d}).', 'Found in Downloads: {n} ({d}).', 'In Downloads gefunden: {n} ({d}).',
      'Encontrado en Descargas: {n} ({d}).'
    ],
    dlNone: ['Aucun fichier de ce nom dans Téléchargements.', 'No file of that name in Downloads.',
      'Keine Datei dieses Namens in Downloads.', 'Ningún archivo con ese nombre en Descargas.'
    ],
    dlFail: ['Téléchargements illisible : {e}', 'Downloads unreadable: {e}', 'Downloads nicht lesbar: {e}', 'Descargas ilegible: {e}'],
    ios: ['Sur iPhone, le sélecteur n’ouvre pas un dossier donné : choisissez Fichiers › Téléchargements.',
      'On iPhone, the picker cannot open a given folder: choose Files › Downloads.',
      'Auf dem iPhone kann die Auswahl keinen vorgegebenen Ordner öffnen: wählen Sie Dateien › Downloads.',
      'En iPhone, el selector no abre una carpeta dada: elija Archivos › Descargas.'
    ],
    zip: ['ZIP du SIA : parsing et compilation', 'SIA ZIP: parsing and compilation', 'SIA-ZIP: Parsing und Kompilierung',
      'ZIP del SIA: análisis y compilación'
    ],
    zipHint: [
      'Trois modes mesurés séparément sur le même fichier : a) fil principal comme V2 (DOMParser sur l’AIXM) ; b) Worker sans DOMParser, ZIP en mémoire, lecteur XML par balises ; c) Worker, tout en flux (ni l’archive ni une entrée en mémoire). L’ordre est c, b, a : le plus gourmand en dernier, pour que les mesures déjà prises survivent à un plantage.',
      'Three modes measured separately on the same file: a) main thread as V2 (DOMParser on the AIXM); b) Worker without DOMParser, ZIP in memory, tag-based XML reader; c) Worker, all streamed (neither the archive nor an entry in memory). The order is c, b, a: the hungriest last, so that measures already taken survive a crash.',
      'Drei getrennt gemessene Modi an derselben Datei: a) Hauptthread wie V2 (DOMParser auf dem AIXM); b) Worker ohne DOMParser, ZIP im Speicher, Tag-basierter XML-Leser; c) Worker, alles im Stream (weder Archiv noch Eintrag im Speicher). Reihenfolge c, b, a: das Gefräßigste zuletzt, damit schon erfolgte Messungen einen Absturz überleben.',
      'Tres modos medidos por separado sobre el mismo archivo: a) hilo principal como V2 (DOMParser sobre el AIXM); b) Worker sin DOMParser, ZIP en memoria, lector XML por etiquetas; c) Worker, todo en flujo (ni el archivo ni una entrada en memoria). El orden es c, b, a: el más voraz al final, para que las medidas ya tomadas sobrevivan a un fallo.'
    ],
    zipNone: ['Aucun ZIP du SIA choisi : « Depuis un fichier » sur la ligne SIA France.',
      'No SIA ZIP chosen: “From a file” on the SIA France row.',
      'Kein SIA-ZIP gewählt: „Aus einer Datei“ in der Zeile SIA Frankreich.',
      'Ningún ZIP del SIA elegido: «Desde un archivo» en la fila SIA Francia.'
    ],
    zipHave: ['Fichier : {n} · {b}', 'File: {n} · {b}', 'Datei: {n} · {b}', 'Archivo: {n} · {b}'],
    modeAll: ['Les trois modes (c, b, a)', 'The three modes (c, b, a)', 'Alle drei Modi (c, b, a)', 'Los tres modos (c, b, a)'],
    modeA: ['Mode a : fil principal', 'Mode a: main thread', 'Modus a: Hauptthread', 'Modo a: hilo principal'],
    modeB: ['Mode b : Worker, ZIP en mémoire', 'Mode b: Worker, ZIP in memory', 'Modus b: Worker, ZIP im Speicher',
      'Modo b: Worker, ZIP en memoria'
    ],
    modeC: ['Mode c : Worker, en flux', 'Mode c: Worker, streamed', 'Modus c: Worker, Stream', 'Modo c: Worker, en flujo'],
    modeRun: ['Mode {m} : {s}', 'Mode {m}: {s}', 'Modus {m}: {s}', 'Modo {m}: {s}'],
    modeEnd: ['Mode {m} terminé : {t}, tas vu au plus {h}.', 'Mode {m} finished: {t}, heap seen at most {h}.',
      'Modus {m} beendet: {t}, Heap höchstens {h}.',
      'Modo {m} terminado: {t}, heap visto como máximo {h}.'
    ],
    modeFail: ['Mode {m} en échec : {e}', 'Mode {m} failed: {e}', 'Modus {m} fehlgeschlagen: {e}', 'Modo {m} fallido: {e}'],
    heapNo: ['non mesurable sur ce navigateur', 'not measurable on this browser', 'auf diesem Browser nicht messbar',
      'no medible en este navegador'
    ],
    publish: ['Publication d’un essai', 'Trial publication', 'Testveröffentlichung', 'Publicación de prueba'],
    publishHint: [
      'Chaque bouton écrit dans le dépôt des données un bloc de remplissage de cette taille (lab/essai-….json), avec le jeton de cet appareil (le laboratoire ne le lit ni ne l’affiche), et note dans le rapport le temps ou l’erreur de l’API, même si l’API ne répond jamais (délai de {s} s). Rien n’est publié sans un bouton. « Nettoyer » liste puis supprime ces fichiers.',
      'Each button writes a filler block of that size (lab/essai-….json) to the data repository, with this device’s token (the laboratory neither reads nor shows it), and writes the API’s time or error in the report, even if the API never answers (timeout {s} s). Nothing is published without a button. “Clean” lists then removes those files.',
      'Jede Taste schreibt einen Füllblock dieser Größe (lab/essai-….json) ins Datenrepository, mit dem Token dieses Geräts (das Labor liest und zeigt es nicht), und vermerkt Zeit oder Fehler der API im Bericht, auch wenn die API nie antwortet (Zeitlimit {s} s). Ohne eine Taste wird nichts veröffentlicht. „Aufräumen“ listet und löscht diese Dateien.',
      'Cada botón escribe en el repositorio de datos un bloque de relleno de ese tamaño (lab/essai-….json), con el token de este dispositivo (el laboratorio no lo lee ni lo muestra), y anota en el informe el tiempo o el error de la API, aunque la API no responda nunca (límite de {s} s). Nada se publica sin un botón. «Limpiar» lista y luego borra esos archivos.'
    ],
    pubN: ['Publier {s}', 'Publish {s}', '{s} veröffentlichen', 'Publicar {s}'],
    pubTimeout: [
      'Sans réponse après {s} s. Le transfert n’a, à ce jour, ni réussi ni échoué : le rapport le note, et « Nettoyer » retire le fichier s’il arrive après coup.',
      'No answer after {s} s. The transfer has neither succeeded nor failed so far: the report notes it, and “Clean” removes the file if it arrives later.',
      'Keine Antwort nach {s} s. Die Übertragung ist bisher weder gelungen noch gescheitert: der Bericht vermerkt es, und „Aufräumen“ entfernt die Datei, falls sie später ankommt.',
      'Sin respuesta tras {s} s. La transferencia no ha tenido éxito ni ha fallado hasta ahora: el informe lo anota, y «Limpiar» retira el archivo si llega después.'
    ],
    clean: ['Nettoyer', 'Clean', 'Aufräumen', 'Limpiar'],
    repo: ['Dépôt : {r} (branche {b})', 'Repository: {r} (branch {b})', 'Repository: {r} (Zweig {b})', 'Repositorio: {r} (rama {b})'],
    noAccess: ['Grisé : aucun dépôt ni jeton réglés sur cet appareil (Réglages › Accès).',
      'Greyed: no repository or token set on this device (Settings › Access).',
      'Ausgegraut: auf diesem Gerät sind weder Repository noch Token eingestellt (Einstellungen › Zugang).',
      'Atenuado: ningún repositorio ni token ajustados en este dispositivo (Ajustes › Acceso).'
    ],
    askPub: ['Écrire dans le dépôt {r} : lab/essai-….json puis un bloc de {s} ?',
      'Write to the repository {r}: lab/essai-….json then a block of {s}?',
      'Ins Repository {r} schreiben: lab/essai-….json und dann ein Block von {s}?',
      '¿Escribir en el repositorio {r}: lab/essai-….json y luego un bloque de {s}?'
    ],
    pubStep: ['Publication : {s}', 'Publishing: {s}', 'Veröffentlichung: {s}', 'Publicación: {s}'],
    pubOk: ['Publié : {b} en {t}.', 'Published: {b} in {t}.', 'Veröffentlicht: {b} in {t}.', 'Publicado: {b} en {t}.'],
    pubFail: ['Publication refusée : {e}', 'Publication refused: {e}', 'Veröffentlichung abgelehnt: {e}', 'Publicación rechazada: {e}'],
    cleanOk: ['Nettoyé : {n} fichier(s) supprimé(s) : {l}.', 'Cleaned: {n} file(s) removed: {l}.',
      'Aufgeräumt: {n} Datei(en) gelöscht: {l}.',
      'Limpiado: {n} archivo(s) eliminado(s): {l}.'
    ],
    cleanNone: ['Rien à nettoyer : aucun fichier lab/essai-… dans le dépôt.',
      'Nothing to clean: no lab/essai-… file in the repository.',
      'Nichts aufzuräumen: keine Datei lab/essai-… im Repository.', 'Nada que limpiar: ningún archivo lab/essai-… en el repositorio.'
    ],
    cleanFail: ['Nettoyage impossible : {e}', 'Cleaning failed: {e}', 'Aufräumen fehlgeschlagen: {e}', 'Limpieza imposible: {e}'],
    report: ['Rapport', 'Report', 'Bericht', 'Informe'],
    reportHint: [
      'Tout ce qui est mesuré s’accumule ici (en anglais, pour être collé tel quel), gardé sur cet appareil et rechargé à l’ouverture. Un résumé de dix lignes au plus ouvre le rapport : parsing, publication, sources permises, bloquées, injoignables ; le détail suit.',
      'Everything measured accumulates here (in English, to be pasted as is), kept on this device and reloaded on opening. A summary of ten lines at most opens the report: parsing, publication, sources allowed, blocked, unreachable; the detail follows.',
      'Alles Gemessene sammelt sich hier (auf Englisch, zum unveränderten Einfügen), auf diesem Gerät gespeichert und beim Öffnen neu geladen. Eine Zusammenfassung von höchstens zehn Zeilen eröffnet den Bericht: Parsing, Veröffentlichung, erlaubte, blockierte, unerreichbare Quellen; die Einzelheiten folgen.',
      'Todo lo medido se acumula aquí (en inglés, para pegarlo tal cual), guardado en este dispositivo y recargado al abrir. Un resumen de diez líneas como máximo abre el informe: análisis, publicación, fuentes permitidas, bloqueadas, inalcanzables; el detalle sigue.'
    ],
    copy: ['Copier le rapport', 'Copy the report', 'Bericht kopieren', 'Copiar el informe'],
    shareReport: ['Partager le rapport', 'Share the report', 'Bericht teilen', 'Compartir el informe'],
    clear: ['Effacer le rapport', 'Clear the report', 'Bericht löschen', 'Borrar el informe'],
    copied: ['Rapport copié ({n} lignes).', 'Report copied ({n} lines).', 'Bericht kopiert ({n} Zeilen).',
      'Informe copiado ({n} líneas).'
    ],
    copyShown: ['Copie impossible ici : le texte est sélectionné, copiez-le à la main.',
      'Cannot copy here: the text is selected, copy it by hand.',
      'Kopieren hier nicht möglich: der Text ist markiert, kopieren Sie ihn von Hand.',
      'No se puede copiar aquí: el texto está seleccionado, cópielo a mano.'
    ],
    cleared: ['Rapport effacé.', 'Report cleared.', 'Bericht gelöscht.', 'Informe borrado.'],
    askClear: ['Effacer tout le rapport de cet appareil ?', 'Clear the whole report on this device?',
      'Den ganzen Bericht dieses Geräts löschen?', '¿Borrar todo el informe de este dispositivo?'
    ],
    busy: ['Une mesure est en cours.', 'A measure is running.', 'Eine Messung läuft.', 'Hay una medida en curso.']
  };

  /** Une écriture dans le DOM seulement si la valeur change. */
  const setText = (el, s) => {
    if (el && el.textContent !== s) el.textContent = s;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let cssDone = false;

  function css() {
    if (cssDone) return;
    cssDone = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = new URL('lab.css?v=0', BASE).href;
    document.head.append(l);
  }
  const loadedScripts = new Map;
  const need = p => loadedScripts.get(p) || loadedScripts.set(p, new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL(p, BASE).href;
    s.onload = res;
    s.onerror = () => {
      loadedScripts.delete(p);
      s.remove();
      rej(new Error(p.split('?')[0]));
    };
    document.head.append(s);
  })).get(p);

  async function screen(box, ctx) {
    css();
    const t = ctx.t,
      lang = ctx.lang ? ctx.lang() : 'fr';
    box.dataset.screen = 'datalab';
    if (ctx.level && ctx.level() < 3) {
      box.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-muted" data-lab="level">${esc(t(T.level))}</p>`;
      return;
    }
    const nf = new Intl.NumberFormat(lang, {
      maximumFractionDigits: 1
    });
    const mb = n => n == null ? '?' : n >= 1048576 ? `${nf.format(n / 1048576)} ${lang === 'fr' ? 'Mo' : 'MB'}` : n >= 1024 ? `${Math.round(n / 1024)} ${lang === 'fr' ? 'Ko' : 'KB'}` : `${n} B`;
    const mbs = n => `${nf.format(n / 1048576)} ${lang === 'fr' ? 'Mo' : 'MB'}`; // toujours en Mo (0,5 Mo), pour les tailles des blocs
    const secs = ms => ms == null ? '?' : ms >= 1000 ? `${nf.format(ms / 1000)} s` : `${Math.round(ms)} ms`;
    try {
      for (const p of ['lab_sources.js?v=0', 'lab_report.js?v=0', 'lab_measure.js?v=0']) await need(p);
    } catch (e) {
      box.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-err">${esc(e.message)}</p>`;
      return;
    }
    if (!box.isConnected) return;
    const S = window.AeroLabSources,
      M = window.AeroLabMeasure,
      R = window.AeroLabReport;
    const cyc = S.cycleOf();
    let cycle = cyc.id,
      busy = null, // { ctl: AbortController } pendant une mesure
      sia = null, // File du ZIP du SIA choisi
      entries = [],
      dev = M.device(),
      store = {};
    const launcher = ctx.launcher ? ctx.launcher() : null;
    // ---- le rapport, rechargé
    try {
      const saved = await ctx.data.get(REPORT);
      if (saved && Array.isArray(saved.entries)) entries = saved.entries;
    } catch {
      /* rapport illisible : on repart d'un rapport vide */
    }
    // ce que les essais d'adresse ont dit (par adresse, et par source : le dernier), relu du rapport gardé : l'aide d'appui long
    // et l'ordre des boutons suivent le dernier test, même après un rechargement
    const seen = new Map, // adresse → { ok, diag, status }
      lastDiag = new Map, // source → 'ok' | 'cors' | 'unreachable' | …
      shared = new Map; // source → File prêt pour navigator.share({ files }) (JSON lu par un test permis)
    for (const e of entries)
      if (e.kind === 'probe' && e.data && e.data.id && e.data.url && S.byId(e.data.id)) {
        seen.set(e.data.url, {
          ok: !!e.data.ok,
          diag: e.data.diag || null,
          status: e.data.status || null
        });
        lastDiag.set(e.data.id, e.data.ok ? 'ok' : e.data.diag || 'http');
      }
    const crashed = M.guard.check();
    if (crashed) entries.push(R.ofCrash(crashed));
    const save = () => {
      if (entries.length > R.MAX) entries.splice(0, entries.length - R.MAX);
      return ctx.data.put(REPORT, {
        schema: 1,
        entries,
        updated_at: new Date().toISOString()
      }).catch(() => {});
    };
    if (crashed) save();
    M.storage().then(s => (store = s, paintReport()));

    // les boutons et liens d'une ligne : « Tester l'adresse » d'abord ; si le dernier test a dit « bloqué par CORS », le lien puis
    // l'import passent devant (le test ne peut plus rien lire) ; le lien du cycle suivant vient quand il est demandé ou lu
    const actionsHtml = s => {
      const blocked = lastDiag.get(s.id) === 'cors',
        btn = (act, label, cls = '') => `<button type="button" data-act="${act}" data-src="${s.id}"${cls ? ` class="${cls}"` : ''}>${esc(label)}</button>`,
        links = S.linkSet(s, seen, cyc, cycle).map(l => `<a class="f-btn lab-link" data-act="link" data-src="${s.id}"${l.cycle ? ` data-cycle-of="${l.cycle}"` : ''} href="${esc(l.url)}" target="_blank" rel="noopener">${esc(t(T.link))}${l.cycle ? ` · ${l.cycle}` : ''}</a>`),
        test = btn('test', t(T.test)),
        login = s.login ? btn('login', t(T.login)) : '',
        file = btn('file', t(T.fromFile), blocked ? 'primary' : ''),
        dl = s.downloads && launcher ? btn('downloads', t(T.fromDownloads)) : '',
        share = shared.has(s.id) ? btn('share', t(T.shareFile)) : '';
      return (blocked ? [...links, file, dl, test, login, share] : [test, login, ...links, file, dl, share]).join('');
    };
    // l'aide d'appui long (repliée ; dépliée par un test « bloqué par CORS ») ; pour une page, d'abord ce qu'il faut y télécharger
    const helpHtml = s => `<details class="lab-help" data-help data-kind="${s.get ? 'page' : s.chain === 'json' ? 'json' : 'file'}"><summary>${esc(t(T.helpTitle))}</summary>${
      [s.get ? t(s.get) : '', t(T.helpPhone), !s.get && s.chain === 'json' ? t(T.helpJson) : '', s.note ? t(s.note) : ''].filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('')}</details>`;
    const sigs = new Map; // source → dernier HTML des boutons posé (une écriture dans le DOM seulement si elle change)
    const sourceRow = s => {
      const url = S.urlOf(s, cycle),
        acts = actionsHtml(s);
      sigs.set(s.id, acts);
      return `<li class="lab-src" data-src="${s.id}"><h3>${s.no}. ${esc(t(s.n))}</h3>
        <p class="lab-addr"><span class="f-muted">${esc(t(T.address))}</span> <code data-addr>${esc(url)}</code></p>
        <p class="f-muted">${esc(t(T.meta, { s: mb(s.size), l: s.lic }))}</p>
        ${s.human ? `<p class="f-warn">${esc(t(s.human))}${s.name ? ` <code>${esc(s.nameText)}</code>` : ''}</p>` : ''}
        <div class="f-row" data-actions>${acts}</div>${helpHtml(s)}
        <p class="f-muted lab-res" data-res aria-live="polite"></p></li>`;
    };
    box.innerHTML = `<p><a class="lab-back" data-lab="back" href="#settings">${esc(t(T.back))}</a></p><h1>${esc(t(T.title))}</h1>
      <div class="f-card" data-lab="head"><p>${esc(t(T.intro))}</p>
        <label class="f-field">${esc(t(T.cycle))}<select data-cycle>
          <option value="${cyc.id}">${esc(t(T.cycleCur, { id: cyc.id, d: cyc.date }))}</option>
          <option value="${cyc.next.id}">${esc(t(T.cycleNext, { id: cyc.next.id, d: cyc.next.date }))}</option></select></label>
        <p class="f-muted" data-device></p><p class="f-warn" data-crash hidden></p></div>
      <div class="f-card" data-lab="sources"><h2>${esc(t(T.sources))}</h2><p class="f-muted">${esc(t(T.sourcesHint))}</p>
        <ul class="lab-list">${S.SOURCES.map(sourceRow).join('')}</ul>
        <input type="file" data-picker hidden></div>
      <div class="f-card" data-lab="zip"><h2>${esc(t(T.zip))}</h2><p class="f-muted">${esc(t(T.zipHint))}</p>
        <p data-zipfile class="lab-res"></p>
        <div class="f-row"><button type="button" data-act="mode" data-mode="all">${esc(t(T.modeAll))}</button>
        <button type="button" data-act="mode" data-mode="c">${esc(t(T.modeC))}</button>
        <button type="button" data-act="mode" data-mode="b">${esc(t(T.modeB))}</button>
        <button type="button" data-act="mode" data-mode="a">${esc(t(T.modeA))}</button></div>
        <p class="f-muted lab-res" data-live aria-live="polite"></p></div>
      <div class="f-card" data-lab="publish"><h2>${esc(t(T.publish))}</h2><p class="f-muted">${esc(t(T.publishHint, { s: pubMs() / 1000 }))}</p>
        <p class="f-muted" data-repo></p>
        <div class="f-row" data-pubs>${PUB_SIZES.map(z => `<button type="button" data-act="pub" data-size="${z}">${esc(t(T.pubN, { s: mbs(z) }))}</button>`).join('')}
        <button type="button" data-act="clean">${esc(t(T.clean))}</button></div>
        <p class="f-muted" data-why></p><p class="f-muted lab-res" data-pubres aria-live="polite"></p></div>
      <div class="f-card" data-lab="report"><h2>${esc(t(T.report))}</h2><p class="f-muted">${esc(t(T.reportHint))}</p>
        <div class="f-row"><button type="button" data-act="copy">${esc(t(T.copy))}</button>${typeof navigator.share === 'function' ? `<button type="button" data-act="shareReport">${esc(t(T.shareReport))}</button>` : ''}<button type="button" data-act="clear">${esc(t(T.clear))}</button></div>
        <p class="f-msg" data-msg></p><pre data-report tabindex="0"></pre></div>`;
    const $ = s => box.querySelector(s),
      $$ = s => [...box.querySelectorAll(s)];

    const heapNow = () => window.performance && performance.memory ? mb(performance.memory.usedJSHeapSize) : t(T.heapNo);
    setText($('[data-device]'), `${t(T.device)} : ${t(T.deviceLine, {
      app: dev.standalone ? t(T.appMode) : t(T.tabMode),
      w: innerWidth,
      c: dev.cores ?? '?',
      m: dev.deviceMemoryGB == null ? t(T.unknown) : `${dev.deviceMemoryGB} GB`,
      h: heapNow()
    })}`);
    if (crashed) {
      const c = $('[data-crash]');
      c.hidden = false;
      setText(c, t(T.crash, {
        l: crashed.label,
        a: crashed.at.slice(11, 19),
        s: crashed.step
      }));
    }

    function paintReport() {
      const txt = R.format({
        at: new Date().toISOString(),
        device: dev,
        storage: store,
        entries,
        cycle: S.cycleOf().id,
        total: S.SOURCES.length
      });
      const pre = $('[data-report]');
      if (pre) setText(pre, txt);
      return txt;
    }
    const add = e => {
      entries.push(e);
      paintReport();
      save();
    };
    // ---- boutons : une mesure à la fois ; la publication est grisée avec sa raison
    const access = () => {
      const info = ctx.githubInfo ? ctx.githubInfo() : null;
      return info && ctx.github && ctx.github() ? info : null;
    };
    const reason = () => !access() ? t(T.noAccess) : !navigator.onLine ? t(T.offline) : '';

    function paintPublish() {
      const info = access();
      setText($('[data-why]'), reason());
      setText($('[data-repo]'), info ? t(T.repo, {
        r: info.repo,
        b: info.branch
      }) : '');
    }

    function paintButtons() {
      for (const b of $$('button[data-act]')) {
        const a = b.dataset.act;
        if (!['test', 'login', 'file', 'downloads', 'share', 'mode', 'pub', 'clean'].includes(a)) continue;
        const dis = !!busy || a === 'mode' && !sia || (a === 'pub' || a === 'clean') && !!reason();
        if (b.disabled !== dis) b.disabled = dis;
        if (dis && !busy && (a === 'pub' || a === 'clean')) b.setAttribute('aria-disabled', 'true');
        else if (b.hasAttribute('aria-disabled')) b.removeAttribute('aria-disabled');
      }
      for (const el of $$('select')) {
        if (el.disabled !== !!busy) el.disabled = !!busy;
      }
      paintPublish();
    }
    /** Repose les boutons et liens d'une ligne si le dernier test les a changés ; `reveal` (après un test) déplie l'aide d'appui
     *  long quand le test a dit « bloqué par CORS ». */
    function paintRow(s, reveal = false) {
      const li = $(`li[data-src="${s.id}"]`),
        acts = li && li.querySelector('[data-actions]');
      if (!acts) return;
      const html = actionsHtml(s);
      if (sigs.get(s.id) !== html) {
        sigs.set(s.id, html);
        acts.innerHTML = html;
        paintButtons();
      }
      const d = li.querySelector('[data-help]');
      if (reveal && d && lastDiag.get(s.id) === 'cors' && !d.open) d.open = true;
    }
    const setBusy = v => {
      busy = v;
      paintButtons();
    };
    paintButtons();

    // ---- helpers d'affichage
    const resOf = id => $(`[data-src="${id}"] [data-res]`);
    const probeText = (r, s) => {
      if (r.diag && r.diag !== 'http') return t(T[r.diag] || T.unreachable);
      if (r.diag === 'http') return t(T.http, {
        c: r.status,
        t: secs(r.ms)
      });
      return r.truncated ? t(T.okCut, {
        c: r.status,
        b: mb(r.bytes),
        t: secs(r.ms)
      }) : t(T.ok, {
        c: r.status,
        b: mb(r.bytes),
        t: secs(r.ms),
        r: R.fmt.rate(r.bytes, r.ms)
      });
    };
    const chainText = (chain, c) => {
      if (chain === 'cifp') return `${c.records} records, ${c.airports} PA (airports), ${secs(c.steps.reduce((n, x) => n + x.ms, 0))}`;
      if (chain === 'json') return `${c.shape}, read ${secs(c.readMs)}, JSON.parse ${secs(c.parseMs)}`;
      if (chain === 'html') return `“${c.title}”, ${c.links} links (${c.pdfLinks} PDF, ${c.zipLinks} ZIP)`;
      if (chain === 'zip' || chain === 'sia') return `${c.entries} entries, ${c.inflatedMB} MB inflated`;
      return `${c.magic}${c.pdfText ? ' — ' + c.pdfText : ''}`;
    };
    const live = s => setText($('[data-live]'), s);

    // ---- tester une adresse
    async function testSource(s) {
      const res = resOf(s.id);
      const ctl = new AbortController();
      setBusy({
        ctl
      });
      guardStart(`test ${s.id}`);
      setText(res, t(T.testing));
      const stop = document.createElement('button');
      stop.type = 'button';
      stop.dataset.act = 'stop';
      stop.textContent = t(T.stop);
      res.after(stop);
      stop.onclick = () => ctl.abort();
      const url = S.urlOf(s, cycle);
      // la chaîne tourne sur le corps entier d'un fichier, ou sur une page lue pour ses liens ; pas sur la page de commande du ZIP du
      // SIA ou de NATS (asPage : l'adresse est une page, le fichier vient d'un geste)
      const tc = s.pageChain || s
        .chain, // la chaîne de l'adresse testée (EAD : la page de connexion se lit en HTML, le fichier importé en PDF)
        chainOn = !!tc && (tc === 'html' || !s.asPage);
      try {
        const r = await M.probe(url, {
          cap: s.cap || 0,
          keep: chainOn,
          signal: ctl.signal,
          onProgress: n => setText(res, t(T.wait, {
            s: mb(n)
          }))
        });
        let extra = [],
          line = probeText(r, s);
        if (r.ok && r.blob && !r.truncated) try {
          const c = await M.chainOf(tc, r.blob, {});
          extra = [`chain ${tc}: ${chainText(tc, c)}`];
          if (c.steps) extra.push(...c.steps.map(x => `  ${x.name}: ${secs(x.ms)}`));
          if (c.peak != null) extra.push(`  peak heap seen ${R.fmt.heap(c.peak)}`);
          line += ' · ' + t(T.chainDone, {
            x: chainText(tc, c)
          });
        } catch (e) {
          extra = [`chain ${tc} failed: ${e.message}`];
          line += ' · ' + t(T.chainFail, {
            e: e.message
          });
        } else if (r.ok && tc === 'html' && r.truncated) extra = ['(page truncated by the cap: links not counted)'];
        setText(res, line);
        res.dataset.kind = r.ok ? 'ok' : 'err';
        add(R.ofProbe(s, r, extra));
        // ce que le test a dit : l'aide d'appui long, l'ordre des boutons, le lien du cycle suivant, « Enregistrer le résultat »
        seen.set(url, {
          ok: r.ok,
          diag: r.diag || null,
          status: r.status || null
        });
        lastDiag.set(s.id, r.ok ? 'ok' : r.diag || 'http');
        shared.delete(s.id);
        if (r.ok && r.blob && !r.truncated && s.chain === 'json') prepareShare(s, r.blob);
        paintRow(s, true);
      } finally {
        stop.remove();
        M.guard.end();
        setBusy(null);
      }
    }
    const guardStart = label => M.guard.start(label);
    /** Le résultat d'un test permis (JSON) devient un File prêt pour « Enregistrer le résultat » (Web Share niveau 2) si
     *  l'appareil sait partager ce fichier : sinon rien (le lien direct reste le geste). */
    function prepareShare(s, blob) {
      try {
        const f = new File([blob], `${s.id}${(s.accept || '.json').split(',')[0]}`, {
          type: blob.type || 'application/json'
        });
        if (typeof navigator.canShare === 'function' && navigator.canShare({
            files: [f]
          })) shared.set(s.id, f);
      } catch {
        /* pas de partage de fichiers sur cet appareil */
      }
    }
    // appelée directement par le geste (l'activation du toucher ne survit pas à une attente sur iOS)
    function shareResult(s) {
      const f = shared.get(s.id),
        res = resOf(s.id);
      if (!f) return;
      navigator.share({
        files: [f],
        title: f.name
      }).then(() => {
        setText(res, t(T.shareDone, {
          n: f.name
        }));
        add(R.entry('share', s.id, [`navigator.share({ files }) accepted for ${f.name} (${R.fmt.mb(f.size)})`]));
      }, e => {
        const gone = e && e.name === 'AbortError';
        setText(res, gone ? t(T.shareCancel) : t(T.shareFail, {
          e: e && e.message || e
        }));
        add(R.entry('share', s.id, [gone ? 'share sheet closed by the user' : `navigator.share failed: ${e && e.name}: ${e && e.message}`]));
      });
    }

    function shareReport() {
      const txt = paintReport(),
        msg = $('[data-msg]');
      navigator.share({
        title: 'SOG data lab report',
        text: txt
      }).then(() => {
        msg.dataset.kind = 'ok';
        setText(msg, t(T.reportShared));
      }, e => {
        msg.dataset.kind = e && e.name === 'AbortError' ? 'warn' : 'err';
        setText(msg, e && e.name === 'AbortError' ? t(T.shareCancel) : t(T.shareFail, {
          e: e && e.message || e
        }));
      });
    }
    // ---- tester l'appel de connexion d'EAD Basic : le formulaire de la page, CHAMPS VIDES, rien d'autre (jamais d'identifiant,
    // de mot de passe ni de cookie : credentials omis) ; dit si la page peut seulement l'appeler (CORS), s'il refuse ou s'il répond
    async function testLogin(s) {
      const res = resOf(s.id),
        ctl = new AbortController();
      setBusy({
        ctl
      });
      guardStart(`login call ${s.id}`);
      setText(res, t(T.testing));
      const stop = document.createElement('button');
      stop.type = 'button';
      stop.dataset.act = 'stop';
      stop.textContent = t(T.stop);
      res.after(stop);
      stop.onclick = () => ctl.abort();
      try {
        const r = await M.probe(S.loginOf(s), {
          method: 'POST',
          body: 'j_username=&j_password=',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          cap: 65536,
          keep: true,
          signal: ctl.signal
        });
        let line = probeText(r, s),
          extra = [];
        if (r.ok && r.blob) { // de la réponse, seulement : est-ce du JSON, et la valeur booléenne loggedIn (jamais un autre champ)
          try {
            const v = JSON.parse(await r.blob.text());
            r.jsonNote = `JSON answer${v && typeof v.loggedIn === 'boolean' ? `, loggedIn=${v.loggedIn}` : ''}`;
          } catch {
            r.jsonNote = 'answer is not JSON';
          }
          extra = [`answer: ${r.jsonNote}`];
          line += ' · ' + t(T.chainDone, {
            x: r.jsonNote
          });
        }
        setText(res, line);
        res.dataset.kind = r.ok ? 'ok' : 'err';
        add(R.ofProbe({
          id: 'ead-login',
          n: s.n
        }, r, extra));
      } finally {
        stop.remove();
        M.guard.end();
        setBusy(null);
      }
    }

    // ---- un fichier (sélecteur ou Téléchargements)
    function pick(s) {
      const inp = $('[data-picker]');
      inp.accept = s.accept || '';
      inp.value = '';
      inp.onchange = () => inp.files[0] && fromFile(s, inp.files[0]);
      inp.click();
    }
    async function fromFile(s, file, note = []) {
      const res = resOf(s.id);
      setBusy({
        ctl: new AbortController()
      });
      guardStart(`file ${s.id}`);
      const lines = [];
      try {
        setText(res, t(T.testing));
        const f = await M.readFile(file);
        let msg = t(T.fileRead, {
          n: file.name,
          b: mb(file.size),
          s: secs(f.streamMs),
          a: f.bufferError ? '—' : secs(f.bufferMs)
        });
        if (s.name) {
          const info = s.id === 'cifp' ? S.cifpFileInfo(file.name) : S.siaFileInfo(file.name);
          if (s.name.test(file.name)) {
            if (info.ok) {
              const m = t(T.nameCycle, {
                c: info.cycle,
                d: info.date
              });
              msg += ' · ' + m;
              lines.push(`name check: ok · cycle ${info.cycle} (${info.date})`);
            } else lines.push('name check: matches the pattern, cycle not readable');
          } else {
            msg += ' · ' + t(T.nameBad, {
              n: file.name,
              e: s.nameText
            });
            lines.push(`name check: UNEXPECTED name (expected ${s.nameText})`);
          }
        }
        if (s.id === 'sia') {
          sia = file;
          paintZip();
        }
        setText(res, msg);
        add(R.ofFile(s, f, [...note, ...lines]));
        if (s.id === 'sia') {
          M.guard.end();
          await runModes('all');
        } else if (s.chain && s.chain !== 'sia') {
          const c = await M.chainOf(s.chain, file, {});
          setText(res, `${msg} · ${t(T.chainDone, { x: chainText(s.chain, c) })}`);
          add(R.ofChain(s, s.chain, c));
        }
      } catch (e) {
        setText(res, t(T.chainFail, {
          e: e.message || e
        }));
        add(R.entry('error', `${s.id} file`, [String(e && e.message || e)]));
      } finally {
        M.guard.end();
        setBusy(null);
      }
    }
    // ---- Téléchargements (poste avec lanceur) : route existante GET /__setup/downloads
    async function fromDownloads(s) {
      const res = resOf(s.id),
        head = {
          'X-SOG-Setup': '1'
        };
      try {
        const q = `${ROOT}__setup/downloads?glob=${encodeURIComponent(s.downloads)}`;
        const j = await (await fetch(`${q}&info`, {
          headers: head,
          cache: 'no-store'
        })).json();
        if (!j.files) throw new Error(j.error || 'no list');
        const info = n => s.id === 'cifp' ? S.cifpFileInfo(n) : S.siaFileInfo(n);
        // le plus récent : la date du nom d'abord (cycle, puis version), sinon la date du fichier
        const best = [...j.files].sort((a, b) => (info(b.name).date || '').localeCompare(info(a.name).date || '') ||
          (info(b.name).version || 0) - (info(a.name).version || 0) || b.mtime - a.mtime)[0];
        if (!best) return setText(res, t(T.dlNone));
        setText(res, t(T.dlFound, {
          n: best.name,
          d: new Date(best.mtime * 1000).toISOString().slice(0, 10)
        }));
        const r = await fetch(`${q}&name=${encodeURIComponent(best.name)}`, {
          headers: head,
          cache: 'no-store'
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await fromFile(s, new File([await r.blob()], best.name), [`picked from Downloads by the launcher (${(j.where || []).join(', ')})`]);
      } catch (e) {
        setText(res, t(T.dlFail, {
          e: e.message || e
        }));
      }
    }

    // ---- les trois modes du ZIP du SIA
    function paintZip() {
      setText($('[data-zipfile]'), sia ? t(T.zipHave, {
        n: sia.name,
        b: mb(sia.size)
      }) : t(T.zipNone));
      paintButtons();
    }
    paintZip();
    async function runModes(which) {
      if (!sia) return;
      const order = which === 'all' ? ['c', 'b', 'a'] : [which],
        results = [];
      setBusy({
        ctl: new AbortController()
      });
      try {
        for (const m of order) {
          M.guard.start(`SIA zip mode ${m} (${sia.name}, ${mb(sia.size)})`);
          const emit = ev => {
            if (ev.type === 'step-start') {
              M.guard.step(ev.name);
              live(t(T.modeRun, {
                m,
                s: ev.name
              }));
            }
          };
          try {
            const r = m === 'a' ? await M.modeA(sia, {
              emit
            }) : await M.modeWorker(m, sia, {
              emit
            });
            results.push(r);
            const total = r.steps.reduce((n, x) => n + x.ms, 0);
            live(t(T.modeEnd, {
              m,
              t: secs(total),
              h: r.peak != null ? mb(r.peak) : t(T.heapNo)
            }));
            add(R.ofMode(r));
          } catch (e) {
            live(t(T.modeFail, {
              m,
              e: e.message || e
            }));
            add(R.entry('mode', `SIA zip, mode ${m}`, [`FAILED: ${e && e.message || e}`], {
              mode: m,
              failed: true
            }));
          }
          M.guard.end();
          await sleep(30);
        }
        if (results.length) {
          let published = null;
          try {
            const man = await ctx.data.read('sia/base/index.json', {
              policy: 'reference',
              wait: true
            });
            const z = man && man.value;
            const cy = z && z.zones && z.zones.fr && z.zones.fr.cycle;
            if (cy) {
              const ix = await ctx.data.read(`sia/base/fr/${cy}/aeroindex.json`, {
                policy: 'reference',
                wait: true
              });
              const v = ix && ix.value;
              published = {
                cycle: cy,
                rows: v && v.data && v.data.rows ? v.data.rows.length : null
              };
            }
          } catch {
            /* base publiée non lisible ici */
          }
          add(R.ofCompare(results, published));
        }
      } finally {
        setBusy(null);
        paintZip();
      }
    }

    // ---- publication d'un essai : un bouton par taille, un bloc de remplissage par bouton ; le résultat ou l'erreur va dans le
    // rapport, y compris quand la promesse ne revient jamais (délai : « sans réponse après 120 s », puis la réponse tardive
    // si elle vient) ; le garde de lancement note l'onglet tué
    async function publishTrial(size) {
      const info = access(),
        tr = info && ctx.github();
      if (!tr) return;
      if (!await ctx.ask(t(T.askPub, {
          r: info.repo,
          s: mbs(size)
        }))) return;
      setBusy({
        ctl: new AbortController()
      });
      const out = $('[data-pubres]'),
        ms = pubMs(),
        stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
        path = `lab/essai-${stamp}-bloc-${Math.round(size / 1024)}k.json`,
        label = `block of ${R.fmt.mbf(size)}`;
      M.guard.start(`publication of a ${R.fmt.mb(size)} block`);
      try {
        setText(out, t(T.pubStep, {
          s: `${path} (${mbs(size)})`
        }));
        const text = M.filler(size),
          pending = M.publish(tr, [{
            path,
            text
          }], `lab: essai (${mbs(size)})`);
        M.guard.step('waiting for the GitHub API');
        let timer;
        const r = await Promise.race([pending, new Promise(res => {
          timer = setTimeout(() => res(null), ms);
        })]);
        clearTimeout(timer);
        if (r) {
          add(R.ofPublish(label, {
            ...r,
            paths: [path]
          }, size));
          setText(out, r.ok ? t(T.pubOk, {
            b: mb(r.bytes),
            t: secs(r.ms)
          }) : t(T.pubFail, {
            e: r.error
          }));
        } else {
          const secsText = +(ms / 1000).toFixed(1);
          add(R.ofPublish(label, {
            ok: false,
            timedOut: true,
            files: 1,
            bytes: new TextEncoder().encode(text).length,
            ms,
            error: `no answer after ${secsText} s`,
            paths: [path]
          }, size));
          setText(out, t(T.pubTimeout, {
            s: secsText
          }));
          // la réponse, si elle vient après coup, est notée à son tour (l'écriture a pu réussir malgré le silence)
          pending.then(late => add(R.ofPublish(`${label} (late answer)`, {
            ...late,
            late: true,
            paths: [path]
          }, size)));
        }
      } finally {
        M.guard.end();
        setBusy(null);
      }
    }
    async function cleanTrial() {
      const tr = ctx.github();
      if (!tr) return;
      setBusy({
        ctl: new AbortController()
      });
      try {
        const r = await M.clean(tr);
        add(R.ofClean(r));
        setText($('[data-pubres]'), !r.ok ? t(T.cleanFail, {
          e: r.error
        }) : r.listed ? t(T.cleanOk, {
          n: r.listed,
          l: r.paths.join(', ')
        }) : t(T.cleanNone));
      } finally {
        setBusy(null);
      }
    }
    // ---- rapport : copier, effacer
    // le module de copie est chargé dès l'ouverture : sur iPhone, l'écriture dans le presse-papiers doit suivre le toucher sans attente
    let copyText = null;
    import(new URL('frame/lib/clipboard.js', ROOT).href).then(m => void(copyText = m.copyText), () => {});
    async function copyReport() {
      const txt = paintReport(),
        msg = $('[data-msg]');
      let how = 'shown';
      try {
        how = copyText ? await copyText(txt, {
          near: $('[data-act="copy"]')
        }) : 'shown';
      } catch {
        how = 'shown';
      }
      msg.dataset.kind = how === 'shown' ? 'warn' : 'ok';
      setText(msg, how === 'shown' ? t(T.copyShown) : t(T.copied, {
        n: txt.split('\n').length
      }));
    }

    // ---- événements
    box.addEventListener('change', e => {
      if (e.target.matches('[data-cycle]')) {
        cycle = e.target.value;
        for (const s of S.SOURCES) {
          setText($(`[data-src="${s.id}"] [data-addr]`), S.urlOf(s, cycle));
          paintRow(s); // le lien du cycle suivant vient quand on le demande
        }
      }
    });
    box.addEventListener('click', async e => {
      const b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      const s = S.byId(b.dataset.src);
      switch (b.dataset.act) {
        case 'test':
          return testSource(s);
        case 'login':
          return testLogin(s);
        case 'share':
          return shareResult(s);
        case 'shareReport':
          return shareReport();
        case 'file':
          return pick(s);
        case 'downloads':
          return fromDownloads(s);
        case 'mode':
          return runModes(b.dataset.mode);
        case 'pub':
          return publishTrial(+b.dataset.size);
        case 'clean':
          return cleanTrial();
        case 'copy':
          return copyReport();
        case 'clear':
          if (await ctx.ask(t(T.askClear))) {
            entries = [];
            await save();
            paintReport();
            ctx.notify(t(T.cleared), 'ok');
          }
      }
    });
    window.addEventListener('online', paintButtons);
    window.addEventListener('offline', paintButtons);
    paintReport();
    // le test et la dérivation de l'adresse d'un fichier donné sont en test sans passer par le sélecteur
    box.__lab = {
      fromFile,
      testSource,
      runModes,
      get entries() {
        return entries;
      },
      get busy() {
        return !!busy;
      }
    };
  }
  window.AeroLab = {
    screen,
    T
  };
})();
