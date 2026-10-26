(() => {
  'use strict';
  // V3 aerodb — « Laboratoire données » (écran du cadre #datalab, TEMPORAIRE : frame/aerodb/SPEC.md § « Laboratoire »).
  // Un écran d'administration, niveau Complet (bouton de la carte Administration des réglages, frame/settings/admin_links.js),
  // qui MESURE sur l'appareil de l'utilisateur ce que le projet « Données » (docs/technique/V3_APP_DONNEES.md) suppose :
  //   1. une ligne par source (lab_sources.js) : « Tester l'adresse » (fetch cronométré, diagnostic CORS / CSP) et « Depuis un
  //      fichier » (sélecteur ; sur un poste avec lanceur, « Depuis Téléchargements » par la route existante
  //      GET /__setup/downloads) ;
  //   2. la chaîne du ZIP du SIA en trois modes mesurés à part (lab_measure.js, lab_run.js) : a fil principal comme V2
  //      (DOMParser), b Worker sans DOMParser (ZIP en mémoire), c Worker tout en flux ;
  //   3. la publication d'un essai par le transport GitHub du cadre (lab/essai-….json puis un bloc de la taille d'une zone) et
  //      son nettoyage, seulement sur le bouton ;
  //   4. le rapport (lab_report.js), copiable, gardé dans cache/lab/report.json (politique cache, jamais synchronisé).
  // Il n'écrit rien d'autre : rien n'entre dans la base ni dans les modules. Contexte (frame/app.js) : { t, lang, notify, ask,
  // data (adaptateur : lit sia/base/ et écrit cache/lab/), aerodb, github() (transport ou null : le jeton reste dans le
  // cadre), githubInfo() ({ repo, branch } ou null), launcher() (relevé du lanceur ou null), level() }.
  const BASE = document.currentScript.src;
  const ROOT = new URL('../../', BASE).href;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const REPORT = 'cache/lab/report.json';

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
      '« Tester l’adresse » appelle l’adresse depuis cette page (c’est la mesure principale : le serveur autorise-t-il cette page à lire sa réponse ?). « Depuis un fichier » donne un fichier que vous avez obtenu vous-même à la même chaîne.',
      '“Test the address” calls the address from this page (the main measure: does the server let this page read its answer?). “From a file” feeds a file you obtained yourself to the same chain.',
      '„Adresse testen“ ruft die Adresse von dieser Seite aus auf (die Hauptmessung: erlaubt der Server dieser Seite, die Antwort zu lesen?). „Aus einer Datei“ führt eine selbst beschaffte Datei durch dieselbe Kette.',
      '«Probar la dirección» llama a la dirección desde esta página (la medida principal: ¿el servidor permite a esta página leer su respuesta?). «Desde un archivo» da a la misma cadena un archivo obtenido por usted.'
    ],
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
      'Écrit lab/essai-….json (petit) puis un bloc de remplissage de la taille choisie dans le dépôt des données, avec le jeton de cet appareil (le laboratoire ne le lit ni ne l’affiche), et mesure le temps et les erreurs de l’API. Rien n’est publié sans le bouton. « Nettoyer » supprime ces fichiers.',
      'Writes lab/essai-….json (small) then a filler block of the chosen size to the data repository, with this device’s token (the laboratory neither reads nor shows it), and measures the API’s time and errors. Nothing is published without the button. “Clean” removes those files.',
      'Schreibt lab/essai-….json (klein) und dann einen Füllblock der gewählten Größe ins Datenrepository, mit dem Token dieses Geräts (das Labor liest und zeigt es nicht), und misst Zeit und Fehler der API. Ohne die Taste wird nichts veröffentlicht. „Aufräumen“ löscht diese Dateien.',
      'Escribe lab/essai-….json (pequeño) y luego un bloque de relleno del tamaño elegido en el repositorio de datos, con el token de este dispositivo (el laboratorio no lo lee ni lo muestra), y mide el tiempo y los errores de la API. Nada se publica sin el botón. «Limpiar» borra esos archivos.'
    ],
    size: ['Taille du bloc', 'Block size', 'Blockgröße', 'Tamaño del bloque'],
    pub: ['Publier un essai', 'Publish a trial', 'Test veröffentlichen', 'Publicar una prueba'],
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
    cleanOk: ['Nettoyé : {n} fichier(s) supprimé(s).', 'Cleaned: {n} file(s) removed.', 'Aufgeräumt: {n} Datei(en) gelöscht.',
      'Limpiado: {n} archivo(s) eliminado(s).'
    ],
    cleanFail: ['Nettoyage impossible : {e}', 'Cleaning failed: {e}', 'Aufräumen fehlgeschlagen: {e}', 'Limpieza imposible: {e}'],
    report: ['Rapport', 'Report', 'Bericht', 'Informe'],
    reportHint: [
      'Tout ce qui est mesuré s’accumule ici (en anglais, pour être collé tel quel), gardé sur cet appareil et rechargé à l’ouverture.',
      'Everything measured accumulates here (in English, to be pasted as is), kept on this device and reloaded on opening.',
      'Alles Gemessene sammelt sich hier (auf Englisch, zum unveränderten Einfügen), auf diesem Gerät gespeichert und beim Öffnen neu geladen.',
      'Todo lo medido se acumula aquí (en inglés, para pegarlo tal cual), guardado en este dispositivo y recargado al abrir.'
    ],
    copy: ['Copier le rapport', 'Copy the report', 'Bericht kopieren', 'Copiar el informe'],
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

    const sourceRow = s => {
      const url = S.urlOf(s, cycle);
      const dl = s.downloads && launcher ? `<button type="button" data-act="downloads" data-src="${s.id}">${esc(t(T.fromDownloads))}</button>` : '';
      return `<li class="lab-src" data-src="${s.id}"><h3>${s.no}. ${esc(t(s.n))}</h3>
        <p class="lab-addr"><span class="f-muted">${esc(t(T.address))}</span> <code data-addr>${esc(url)}</code></p>
        <p class="f-muted">${esc(t(T.meta, { s: mb(s.size), l: s.lic }))}</p>
        ${s.human ? `<p class="f-warn">${esc(t(s.human))}${s.name ? ` <code>${esc(s.nameText)}</code>` : ''}</p>` : ''}
        <div class="f-row"><button type="button" data-act="test" data-src="${s.id}">${esc(t(T.test))}</button>
        <button type="button" data-act="file" data-src="${s.id}">${esc(t(T.fromFile))}</button>${dl}</div>
        <p class="f-muted lab-res" data-res aria-live="polite"></p></li>`;
    };
    box.innerHTML = `<h1>${esc(t(T.title))}</h1>
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
      <div class="f-card" data-lab="publish"><h2>${esc(t(T.publish))}</h2><p class="f-muted">${esc(t(T.publishHint))}</p>
        <p class="f-muted" data-repo></p>
        <label class="f-field">${esc(t(T.size))}<select data-size><option value="524288">0,5 ${lang === 'fr' ? 'Mo' : 'MB'}</option><option value="2097152" selected>2 ${lang === 'fr' ? 'Mo' : 'MB'}</option>
          <option value="5560000">5,3 ${lang === 'fr' ? 'Mo' : 'MB'}</option><option value="10485760">10 ${lang === 'fr' ? 'Mo' : 'MB'}</option></select></label>
        <div class="f-row"><button type="button" data-act="pub">${esc(t(T.pub))}</button><button type="button" data-act="clean">${esc(t(T.clean))}</button></div>
        <p class="f-muted" data-why></p><p class="f-muted lab-res" data-pubres aria-live="polite"></p></div>
      <div class="f-card" data-lab="report"><h2>${esc(t(T.report))}</h2><p class="f-muted">${esc(t(T.reportHint))}</p>
        <div class="f-row"><button type="button" data-act="copy">${esc(t(T.copy))}</button><button type="button" data-act="clear">${esc(t(T.clear))}</button></div>
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
        cycle: S.cycleOf().id
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
        if (!['test', 'file', 'downloads', 'mode', 'pub', 'clean'].includes(a)) continue;
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
      const chainOn = !!s.chain && (s.chain === 'html' || !s.asPage);
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
          const c = await M.chainOf(s.chain, r.blob, {});
          extra = [`chain ${s.chain}: ${chainText(s.chain, c)}`];
          if (c.steps) extra.push(...c.steps.map(x => `  ${x.name}: ${secs(x.ms)}`));
          if (c.peak != null) extra.push(`  peak heap seen ${R.fmt.heap(c.peak)}`);
          line += ' · ' + t(T.chainDone, {
            x: chainText(s.chain, c)
          });
        } catch (e) {
          extra = [`chain ${s.chain} failed: ${e.message}`];
          line += ' · ' + t(T.chainFail, {
            e: e.message
          });
        } else if (r.ok && s.chain === 'html' && r.truncated) extra = ['(page truncated by the cap: links not counted)'];
        setText(res, line);
        res.dataset.kind = r.ok ? 'ok' : 'err';
        add(R.ofProbe(s, r, extra));
      } finally {
        stop.remove();
        M.guard.end();
        setBusy(null);
      }
    }
    const guardStart = label => M.guard.start(label);

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
            add(R.entry('mode', `SIA zip, mode ${m}`, [`FAILED: ${e && e.message || e}`]));
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

    // ---- publication d'un essai
    async function publishTrial() {
      const info = access(),
        tr = info && ctx.github();
      if (!tr) return;
      const size = +$('[data-size]').value;
      if (!await ctx.ask(t(T.askPub, {
          r: info.repo,
          s: mb(size)
        }))) return;
      setBusy({
        ctl: new AbortController()
      });
      const out = $('[data-pubres]'),
        stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
        p1 = `lab/essai-${stamp}.json`,
        p2 = `lab/essai-${stamp}-bloc.json`;
      try {
        setText(out, t(T.pubStep, {
          s: p1
        }));
        const small = JSON.stringify({
          schema: 1,
          kind: 'lab-trial',
          at: new Date().toISOString(),
          note: 'temporary lab file, safe to delete'
        });
        const r1 = await M.publish(tr, [{
          path: p1,
          text: small
        }], 'lab: essai (petit fichier)');
        add(R.ofPublish('small file', {
          ...r1,
          paths: [p1]
        }));
        if (!r1.ok) return setText(out, t(T.pubFail, {
          e: r1.error
        }));
        setText(out, t(T.pubStep, {
          s: `${p2} (${mb(size)})`
        }));
        const r2 = await M.publish(tr, [{
          path: p2,
          text: M.filler(size)
        }], `lab: essai (${mb(size)})`);
        add(R.ofPublish(`block of ${R.fmt.mb(size)}`, {
          ...r2,
          paths: [p2]
        }));
        setText(out, r2.ok ? t(T.pubOk, {
          b: mb(r2.bytes),
          t: secs(r2.ms)
        }) : t(T.pubFail, {
          e: r2.error
        }));
      } finally {
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
        setText($('[data-pubres]'), r.ok ? t(T.cleanOk, {
          n: r.listed
        }) : t(T.cleanFail, {
          e: r.error
        }));
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
        for (const s of S.SOURCES) setText($(`[data-src="${s.id}"] [data-addr]`), S.urlOf(s, cycle));
      }
    });
    box.addEventListener('click', async e => {
      const b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      const s = S.byId(b.dataset.src);
      switch (b.dataset.act) {
        case 'test':
          return testSource(s);
        case 'file':
          return pick(s);
        case 'downloads':
          return fromDownloads(s);
        case 'mode':
          return runModes(b.dataset.mode);
        case 'pub':
          return publishTrial();
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
