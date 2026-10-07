// Traductions de la page « Premier lancement » (fr, en, de, es) : textes fixes, y compris les morceaux de phrase coupés
// par un nom de fichier ou de dossier ; appliquées par la couche commune (shared/content_i18n.js).
RepositoryContentI18n([
  ['Données', 'Data', 'Daten', 'Datos'],
  ['Pour cette étape, ouvrez la suite avec le lanceur (lancer.cmd sous Windows, sh lancer.sh sous macOS / Linux).',
    'For this step, open the suite with the launcher (lancer.cmd on Windows, sh lancer.sh on macOS / Linux).',
    'Öffnen Sie für diesen Schritt die Suite mit dem Starter (lancer.cmd unter Windows, sh lancer.sh unter macOS / Linux).',
    'Para este paso, abra la suite con el lanzador (lancer.cmd en Windows, sh lancer.sh en macOS / Linux).'
  ],
  ['Jeu d’essai', 'Sample data set', 'Testdatensatz', 'Conjunto de prueba'],
  ['Données fictives livrées avec la suite, pour la découvrir : missions (dont un exercice), pilotes, flotte, disponibilités et affectations de la semaine en cours. À remplacer plus tard par les données de votre compagnie.',
    'Fictitious data shipped with the suite, to discover it: missions (including an exercise), pilots, fleet, availability and assignments for the current week. To be replaced later by your airline’s data.',
    'Fiktive Daten, mit der Suite geliefert, um sie kennenzulernen: Missionen (darunter eine Übung), Piloten, Flotte, Verfügbarkeit und Zuweisungen der laufenden Woche. Später durch die Daten Ihrer Fluggesellschaft zu ersetzen.',
    'Datos ficticios entregados con la suite, para descubrirla: misiones (incluido un ejercicio), pilotos, flota, disponibilidad y asignaciones de la semana en curso. Para sustituir más adelante por los datos de su aerolínea.'
  ],
  ['Installer le jeu d’essai', 'Install the sample data', 'Testdaten installieren', 'Instalar el conjunto de prueba'],
  ['Installation du jeu d’essai…', 'Installing the sample data…', 'Testdaten werden installiert…', 'Instalando el conjunto de prueba…'],
  ['Dépôt de données', 'Data repository', 'Daten-Repository', 'Repositorio de datos'],
  ['Adresse du dépôt', 'Repository address', 'Repository-Adresse', 'Dirección del repositorio'],
  ['Identifiant (facultatif)', 'Login (optional)', 'Kennung (optional)', 'Identificador (opcional)'],
  ['Mot de passe ou jeton (facultatif)', 'Password or token (optional)', 'Passwort oder Token (optional)',
    'Contraseña o token (opcional)'
  ],
  ['Adresse HTTPS', 'HTTPS address', 'HTTPS-Adresse', 'Dirección HTTPS'],
  ['ou SSH', 'or SSH', 'oder SSH', 'o SSH'],
  [', donnée par votre compagnie. Dépôt privé en HTTPS : identifiant et mot de passe, ou un jeton d’accès en lecture si le compte a la double authentification. En SSH : la clé SSH de cet ordinateur. Les identifiants servent au téléchargement, sur cet ordinateur seulement.',
    ', given by your airline. Private repository over HTTPS: login and password, or a read access token if the account uses two-factor authentication. Over SSH: this computer’s SSH key. The credentials are used for the download, on this computer only.',
    ', von Ihrer Fluggesellschaft angegeben. Privates Repository über HTTPS: Kennung und Passwort, oder ein Lese-Zugriffstoken bei Zwei-Faktor-Authentifizierung. Über SSH: der SSH-Schlüssel dieses Rechners. Die Zugangsdaten dienen nur dem Herunterladen, nur auf diesem Rechner.',
    ', facilitada por su aerolínea. Repositorio privado por HTTPS: identificador y contraseña, o un token de acceso de lectura si la cuenta tiene doble autenticación. Por SSH: la clave SSH de este equipo. Las credenciales solo sirven para la descarga, solo en este equipo.'
  ],
  ['Pas encore de données : jeu d’essai, dépôt de données de votre compagnie, ou archive reçue par mail.',
    'No data yet: sample data set, your airline’s data repository, or archive received by e-mail.',
    'Noch keine Daten: Testdatensatz, Daten-Repository Ihrer Fluggesellschaft oder per E-Mail erhaltenes Archiv.',
    'Todavía no hay datos: conjunto de prueba, repositorio de datos de su aerolínea o archivo recibido por correo.'
  ],
  ['Pas encore de données : jeu d’essai, ou archive reçue par mail (Git n’est pas installé : pour un dépôt de données, installer Git, puis relancer).',
    'No data yet: sample data set, or archive received by e-mail (Git is not installed: for a data repository, install Git, then restart).',
    'Noch keine Daten: Testdatensatz oder per E-Mail erhaltenes Archiv (Git ist nicht installiert: für ein Daten-Repository Git installieren und neu starten).',
    'Todavía no hay datos: conjunto de prueba o archivo recibido por correo (Git no está instalado: para un repositorio de datos, instale Git y vuelva a iniciar).'
  ],
  ['Adresse du dépôt de données à préciser (https://… ou git@…).', 'Data repository address to be given (https://… or git@…).',
    'Adresse des Daten-Repositorys angeben (https://… oder git@…).',
    'Indique la dirección del repositorio de datos (https://… o git@…).'
  ],
  ['Identifiant et mot de passe (ou jeton) : les deux, ou aucun (dépôt public, clé SSH, identifiants déjà connus de Git).',
    'Login and password (or token): both, or neither (public repository, SSH key, credentials already known to Git).',
    'Kennung und Passwort (oder Token): beides oder keines (öffentliches Repository, SSH-Schlüssel, Git bereits bekannte Zugangsdaten).',
    'Identificador y contraseña (o token): ambos o ninguno (repositorio público, clave SSH, credenciales ya conocidas por Git).'
  ],
  ['data/ n’est pas encore un dépôt git : les données récupérées depuis un dépôt (carte « Dépôt de données ») en gardent l’adresse.',
    'data/ is not a git repository yet: data fetched from a repository (“Data repository” card) keep its address.',
    'data/ ist noch kein Git-Repository: aus einem Repository abgerufene Daten (Karte „Daten-Repository“) behalten dessen Adresse.',
    'data/ todavía no es un repositorio git: los datos obtenidos de un repositorio (tarjeta «Repositorio de datos») conservan su dirección.'
  ],
  ['Mot de passe ou jeton', 'Password or token', 'Passwort oder Token', 'Contraseña o token'],
  ['mémoriser dans le gestionnaire d’identifiants de Git', 'remember in Git’s credential manager',
    'im Anmeldeinformations-Manager von Git speichern', 'recordar en el gestor de credenciales de Git'
  ],
  ['Récupérer les données', 'Fetch the data', 'Daten abrufen', 'Obtener los datos'],
  ['ce dont la suite a besoin pour travailler, étape par étape', 'what the suite needs to work, step by step',
    'was die Suite zum Arbeiten braucht, Schritt für Schritt', 'lo que la suite necesita para trabajar, paso a paso'
  ],
  ['Données présentes (dépôt git : reçu à chaque lancement, envoyé et partagé par le bouton « Synchroniser » de l’en-tête).',
    'Data present (git repository: received at each launch, sent and shared with the “Synchronise” button in the header).',
    'Daten vorhanden (Git-Repository: bei jedem Start empfangen, mit der Schaltfläche „Synchronisieren“ in der Kopfzeile gesendet und geteilt).',
    'Datos presentes (repositorio git: recibidos en cada inicio, enviados y compartidos con el botón «Sincronizar» del encabezado).'
  ],
  ['Données présentes.', 'Data present.', 'Daten vorhanden.', 'Datos presentes.'],
  ['Pilote', 'Pilot', 'Pilot', 'Piloto'],
  ['Profil', 'Profile', 'Profil', 'Perfil'],
  ['Dossiers', 'Folders', 'Ordner', 'Carpetas'],
  ['Recommencer', 'Start again', 'Neu beginnen', 'Empezar de nuevo'],
  ['Trigramme', 'Trigram', 'Kürzel', 'Trigrama'],
  ['ID IVAO (VID)', 'IVAO ID (VID)', 'IVAO-ID (VID)', 'ID IVAO (VID)'],
  ['ID VATSIM (CID)', 'VATSIM ID (CID)', 'VATSIM-ID (CID)', 'ID VATSIM (CID)'],
  ['Dossier OneDrive…', 'OneDrive folder…', 'OneDrive-Ordner…', 'Carpeta OneDrive…'],
  ['J’ai reçu les données par mail', 'I received the data by e-mail', 'Ich habe die Daten per E-Mail erhalten',
    'He recibido los datos por correo'
  ],
  ['du jeu de données (elle contient', 'of the data set (it contains', 'des Datensatzes (es enthält',
    'del conjunto de datos (contiene'
  ],
  ['Archive des données…', 'Data archive…', 'Datenarchiv…', 'Archivo de datos…'],
  ['Journal des vols (facultatif)', 'Flight log (optional)', 'Flugbuch (optional)', 'Registro de vuelos (opcional)'],
  ['La page « Log des vols » du site de la compagnie enregistrée (', 'The “Log des vols” page of the airline site, saved (',
    'Die gespeicherte Seite „Log des vols“ der Website der Fluggesellschaft (',
    'La página «Log des vols» del sitio de la aerolínea guardada ('
  ],
  ['): pilotes et appareils de la référence (aide à la saisie).', '): pilots and aircraft of the reference (input help).',
    '): Piloten und Luftfahrzeuge der Referenz (Eingabehilfe).', '): pilotos y aeronaves de la referencia (ayuda a la introducción).'
  ],
  ['Repris par toutes les pages (☰ › Profil pilote). Les identifiants du site de la compagnie, le mot de passe et les préférences se règlent ensuite dans',
    'Used by every page (☰ › Pilot profile). airline website credentials, password and preferences are then set in',
    'Von allen Seiten verwendet (☰ › Pilotenprofil). Zugangsdaten der Website der Fluggesellschaft, Passwort und Einstellungen werden danach festgelegt in',
    'Usado por todas las páginas (☰ › Perfil de piloto). Las credenciales del sitio de la aerolínea, la contraseña y las preferencias se ajustan luego en'
  ],
  ['Paramètres › Mon profil', 'Settings › My profile', 'Einstellungen › Mein Profil', 'Ajustes › Mi perfil'],
  ['Mot de passe', 'Password', 'Passwort', 'Contraseña'],
  ['Enregistrer le profil', 'Save the profile', 'Profil speichern', 'Guardar el perfil'],
  ['Le navigateur demande de désigner chaque dossier une fois (il le mémorise).',
    'The browser asks you to point to each folder once (it remembers it).',
    'Der Browser fragt einmal nach jedem Ordner (er merkt ihn sich).', 'El navegador pide designar cada carpeta una vez (la recuerda).'
  ],
  ['Dossier de l’application', 'Application folder', 'Anwendungsordner', 'Carpeta de la aplicación'],
  ['Le dossier qui contient', 'The folder that contains', 'Der Ordner, der', 'La carpeta que contiene'],
  ['et', 'and', 'und', 'y'],
  [': données, registre, missions, SIA, performances et sauvegarde locale en sont déduits.',
    ': data, registry, missions, SIA, performance and local backup are derived from it.',
    ' enthält: Daten, Register, Missionen, SIA, Leistungen und lokale Sicherung werden daraus abgeleitet.',
    ': de ella se deducen datos, registro, misiones, SIA, prestaciones y copia local.'
  ],
  ['Choisir le dossier de l’application', 'Choose the application folder', 'Anwendungsordner wählen',
    'Elegir la carpeta de la aplicación'
  ],
  ['Le dossier OneDrive (synchronisé) où l’escadrille dépose le classeur : le Planning ODV ouvre le plus récent. Sans OneDrive : choisir le fichier Excel, gardé dans ce navigateur.',
    'The (synced) OneDrive folder where the squadron drops the workbook: the ODV planning opens the most recent one. Without OneDrive: choose the Excel file, kept in this browser.',
    'Der (synchronisierte) OneDrive-Ordner, in dem die Staffel die Arbeitsmappe ablegt: die ODV-Planung öffnet die neueste. Ohne OneDrive: die Excel-Datei wählen, in diesem Browser gespeichert.',
    'La carpeta OneDrive (sincronizada) donde el escuadrón deja el libro: la planificación ODV abre el más reciente. Sin OneDrive: elegir el archivo Excel, guardado en este navegador.'
  ],
  ['ou le fichier Excel…', 'or the Excel file…', 'oder die Excel-Datei…', 'o el archivo Excel…'],
  ['Données aéronautiques et types d’aéronefs', 'Aeronautical data and aircraft types', 'Luftfahrtdaten und Luftfahrzeugtypen',
    'Datos aeronáuticos y tipos de aeronave'
  ],
  ["Cartes, missions et planification utilisent les données aéronautiques (AIRAC) et la base des types d’aéronefs. Ci-dessous, les mêmes blocs que dans Paramètres › Installation : choisir les zones (France active par défaut) et, pour chacune, le bouton de chaque source (ZIP du SIA : lien vers la boutique, compte gratuit, produit du cycle à 0 €, puis « Récupérer le ZIP téléchargé » ; MORA ; axes de ravitaillement : PDF MILAIP ; autres pays) — la base se construit seule ; puis « Compléter les types… » pour les types d’aéronefs et leurs performances.",
    "Maps, missions and planning use the aeronautical data (AIRAC) and the aircraft type database. Below, the same blocks as in Settings › Installation: choose the zones (France active by default) and, for each one, the button of each source (SIA ZIP: link to the shop, free account, cycle product at 0 €, then “Fetch the downloaded ZIP”; MORA; refuelling tracks: MILAIP PDF; other countries) — the database builds itself; then “Complete the types…” for aircraft types and their performance.",
    "Karten, Missionen und Planung nutzen die Luftfahrtdaten (AIRAC) und die Datenbank der Luftfahrzeugtypen. Unten dieselben Blöcke wie unter Einstellungen › Installation: die Zonen wählen (Frankreich standardmäßig aktiv) und für jede die Schaltfläche jeder Quelle (SIA-ZIP: Link zum Shop, kostenloses Konto, Zyklusprodukt zu 0 €, dann „Heruntergeladene ZIP abrufen“; MORA; Betankungsstrecken: MILAIP-PDF; andere Länder) — die Datenbank baut sich selbst auf; dann „Typen ergänzen…“ für die Luftfahrzeugtypen und ihre Leistungen.",
    "Mapas, misiones y planificación usan los datos aeronáuticos (AIRAC) y la base de tipos de aeronave. Abajo, los mismos bloques que en Ajustes › Instalación: elegir las zonas (Francia activa por defecto) y, para cada una, el botón de cada fuente (ZIP del SIA: enlace a la tienda, cuenta gratuita, producto del ciclo a 0 €, luego «Obtener el ZIP descargado»; MORA; ejes de reabastecimiento: PDF MILAIP; otros países) — la base se construye sola; luego «Completar los tipos…» para los tipos de aeronave y sus rendimientos."
  ],
  ['Terminer', 'Finish', 'Abschließen', 'Terminar'],
  ['⚠ Nettoyer efface les réglages de ce navigateur', '⚠ Cleaning erases this browser’s settings',
    '⚠ Bereinigen löscht die Einstellungen dieses Browsers', '⚠ Limpiar borra los ajustes de este navegador'
  ],
  [': dossiers mémorisés (application, données, registre, missions, SIA, ODV, X-Plane, performances, sauvegarde locale), copie du classeur ODV, identifiants du site de la compagnie, profil (trigramme, IVAO, VATSIM, SimBrief) et l’indicateur « suite réglée ». Les fichiers sur le disque — dossier',
    ': remembered folders (application, data, registry, missions, SIA, ODV, X-Plane, performance, local backup), copy of the ODV workbook, airline site credentials, profile (trigram, IVAO, VATSIM, SimBrief) and the “suite set up” flag. Files on disk — folder',
    ': gespeicherte Ordner (Anwendung, Daten, Register, Missionen, SIA, ODV, X-Plane, Leistungen, lokale Sicherung), Kopie der ODV-Arbeitsmappe, Zugangsdaten der Website der Fluggesellschaft, Profil (Kürzel, IVAO, VATSIM, SimBrief) und das Kennzeichen „Suite eingerichtet“. Die Dateien auf der Festplatte — Ordner',
    ': carpetas recordadas (aplicación, datos, registro, misiones, SIA, ODV, X-Plane, prestaciones, copia local), copia del libro ODV, credenciales del sitio de la aerolínea, perfil (trigrama, IVAO, VATSIM, SimBrief) y el indicador «suite configurada». Los archivos del disco — carpeta'
  ],
  ['— ne sont pas touchés. À faire seulement pour reprendre le premier lancement de zéro.',
    '— are not touched. Only to start the first launch again from scratch.',
    '— bleiben unberührt. Nur, um den ersten Start von vorn zu beginnen.',
    '— no se tocan. Solo para retomar el primer arranque desde cero.'
  ],
  ['Nettoyer et recommencer…', 'Clean and start again…', 'Bereinigen und neu beginnen…', 'Limpiar y empezar de nuevo…'],
  ['Dépôt git de synchronisation des données (facultatif)', 'Git repository for data synchronisation (optional)',
    'Git-Repository zur Datensynchronisierung (optional)', 'Repositorio git de sincronización de datos (opcional)'
  ],
  ['Classeur ODV (facultatif)', 'ODV workbook (optional)', 'ODV-Arbeitsmappe (optional)', 'Libro ODV (opcional)'],
  ['Dépôt distant du dossier', 'Remote repository of the folder', 'Remote-Repository des Ordners', 'Repositorio remoto de la carpeta'],
  [' : il partage les données entre les postes (bouton « Synchroniser » de l’en-tête). Adresse SSH',
    ': it shares the data between computers (“Synchronise” button in the header). SSH address',
    ': Es teilt die Daten zwischen den Rechnern (Schaltfläche „Synchronisieren“ in der Kopfzeile). SSH-Adresse',
    ': comparte los datos entre equipos (botón «Sincronizar» del encabezado). Dirección SSH'
  ],
  ['(clé SSH de cet ordinateur) ou HTTPS', '(SSH key of this computer) or HTTPS', '(SSH-Schlüssel dieses Rechners) oder HTTPS',
    '(clave SSH de este equipo) o HTTPS'
  ],
  ['(identifiants enregistrés dans Git). Facultatif et jamais bloquant : sans dépôt qui répond, la suite fonctionne, sans partage.',
    '(credentials stored in Git). Optional and never blocking: without a responding repository, the suite works, without sharing.',
    '(in Git gespeicherte Zugangsdaten). Optional und nie blockierend: Ohne antwortendes Repository funktioniert die Suite, ohne Teilen.',
    '(credenciales guardadas en Git). Opcional y nunca bloqueante: sin un repositorio que responda, la suite funciona, sin compartir.'
  ],
  ['Adresse du dépôt', 'Repository address', 'Repository-Adresse', 'Dirección del repositorio'],
  ['Vérifier', 'Check', 'Prüfen', 'Comprobar'],
  ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  ['data/ est un dépôt git sans dépôt distant : rien n’est partagé tant qu’aucune adresse n’est enregistrée.',
    'data/ is a git repository without a remote: nothing is shared until an address is saved.',
    'data/ ist ein Git-Repository ohne Remote: Nichts wird geteilt, solange keine Adresse gespeichert ist.',
    'data/ es un repositorio git sin remoto: no se comparte nada hasta que se guarde una dirección.'
  ],
  ['Adresse du dépôt à préciser (git@… ou https://…).', 'Repository address to specify (git@… or https://…).',
    'Repository-Adresse angeben (git@… oder https://…).', 'Indique la dirección del repositorio (git@… o https://…).'
  ],
  ['Où en est la suite', 'Where the suite stands', 'Stand der Suite', 'Estado de la suite'],
  ['À reprendre à tout moment : Paramètres › Premier lancement. Chaque ligne mène à son étape.',
    'Can be resumed at any time: Settings › First run. Each line leads to its step.',
    'Jederzeit wieder aufrufbar: Einstellungen › Erststart. Jede Zeile führt zu ihrem Schritt.',
    'Se puede retomar en cualquier momento: Ajustes › Primer arranque. Cada línea lleva a su paso.'
  ],
  ['Compagnie', 'Airline', 'Fluggesellschaft', 'Aerolínea'],
  ['La compagnie virtuelle dont la suite porte le nom, et l’adresse de son site (liens, flotte, journal des vols). Réglage de ce navigateur ; tous les champs (centre, pages du site, sources externes) :',
    'The virtual airline whose name the suite bears, and its website address (links, fleet, flight log). Setting of this browser; all fields (centre, website pages, external sources):',
    'Die virtuelle Fluggesellschaft, deren Namen die Suite trägt, und die Adresse ihrer Website (Links, Flotte, Flugbuch). Einstellung dieses Browsers; alle Felder (Zentrum, Seiten der Website, externe Quellen):',
    'La aerolínea virtual cuyo nombre lleva la suite, y la dirección de su sitio (enlaces, flota, registro de vuelos). Ajuste de este navegador; todos los campos (centro, páginas del sitio, fuentes externas):'
  ],
  ['Paramètres › Installation › Sources et dossiers', 'Settings › Installation › Sources and folders',
    'Einstellungen › Installation › Quellen und Ordner', 'Ajustes › Instalación › Fuentes y carpetas'
  ],
  ['Compagnie virtuelle', 'Virtual airline', 'Virtuelle Fluggesellschaft', 'Aerolínea virtual'],
  ['Nom', 'Name', 'Name', 'Nombre'],
  ['Sigle', 'Short name', 'Kürzel', 'Sigla'],
  ['Nom long', 'Full name', 'Vollständiger Name', 'Nombre completo'],
  ['Site de la compagnie', 'Airline website', 'Website der Fluggesellschaft', 'Sitio de la aerolínea'],
  ['Clé d’API IVAO (facultatif)', 'IVAO API key (optional)', 'IVAO-API-Schlüssel (optional)', 'Clave de API IVAO (opcional)'],
  ['Pour toute l’installation : activations des zones et sessions ATC IVAO (trainings, examens, réservations) du Tableau et du Planning ODV. Gardée par le lanceur, jamais renvoyée à la page.',
    'For the whole installation: area activations and IVAO ATC sessions (trainings, exams, bookings) of the Board and the ODV planning. Kept by the launcher, never sent back to the page.',
    'Für die ganze Installation: Gebietsaktivierungen und IVAO-ATC-Sitzungen (Trainings, Prüfungen, Buchungen) der Einsatztafel und der ODV-Planung. Beim Starter gespeichert, nie an die Seite zurückgegeben.',
    'Para toda la instalación: activaciones de zonas y sesiones ATC IVAO (entrenamientos, exámenes, reservas) del Tablero y de la planificación ODV. Guardada por el lanzador, nunca devuelta a la página.'
  ],
  ['Clé', 'Key', 'Schlüssel', 'Clave'],
  ['Enregistrer la compagnie', 'Save the airline', 'Fluggesellschaft speichern', 'Guardar la aerolínea'],
  ['Profil et identifiants', 'Profile and credentials', 'Profil und Zugangsdaten', 'Perfil y credenciales'],
  ['Repris par toutes les pages (☰ › Profil pilote). La suite ne demande jamais vos mots de passe IVAO ni VATSIM : vos identifiants (VID, CID) suffisent. Compte de la suite (mot de passe, mode production), client IVAO personnel et préférences :',
    'Used by every page (☰ › Pilot profile). The suite never asks for your IVAO or VATSIM passwords: your IDs (VID, CID) are enough. Suite account (password, production mode), personal IVAO client and preferences:',
    'Von allen Seiten verwendet (☰ › Pilotenprofil). Die Suite fragt nie nach Ihren IVAO- oder VATSIM-Passwörtern: Ihre Kennungen (VID, CID) genügen. Konto der Suite (Passwort, Produktionsmodus), persönlicher IVAO-Client und Einstellungen:',
    'Usado por todas las páginas (☰ › Perfil de piloto). La suite nunca pide sus contraseñas IVAO ni VATSIM: sus identificadores (VID, CID) bastan. Cuenta de la suite (contraseña, modo producción), cliente IVAO personal y preferencias:'
  ],
  ['Identifiants de votre compte sur le site de la compagnie, gardés dans ce navigateur seulement (jamais dans un fichier ni une sauvegarde).',
    'Credentials of your account on the airline website, kept in this browser only (never in a file or a backup).',
    'Zugangsdaten Ihres Kontos auf der Website der Fluggesellschaft, nur in diesem Browser gespeichert (nie in einer Datei oder Sicherung).',
    'Credenciales de su cuenta en el sitio de la aerolínea, guardadas solo en este navegador (nunca en un archivo ni en una copia).'
  ],
  ['Identifiant', 'Login', 'Kennung', 'Identificador'],
  ['Centre (administrateurs)', 'Centre (administrators)', 'Zentrum (Administratoren)', 'Centro (administradores)'],
  ['Réservé aux administrateurs du SO Group : les pilotes passent cette étape.',
    'For SO Group administrators only: pilots skip this step.',
    'Nur für Administratoren der SO Group: Piloten überspringen diesen Schritt.',
    'Reservado a los administradores del SO Group: los pilotos se saltan este paso.'
  ],
  ['Activer le Centre', 'Enable the Centre', 'Zentrum aktivieren', 'Activar el Centro'],
  ['Mot de passe du Centre', 'Centre password', 'Passwort des Zentrums', 'Contraseña del Centro'],
  ['Flotte et journal des vols', 'Fleet and flight log', 'Flotte und Flugbuch', 'Flota y registro de vuelos'],
  ['Lus sur le site de la compagnie par le lanceur (une fois par jour, et à la demande) : flotte, emplacement des appareils, journal des vols ; types inconnus complétés ensuite.',
    'Read from the airline website by the launcher (once a day, and on demand): fleet, aircraft location, flight log; unknown types completed afterwards.',
    'Vom Starter auf der Website der Fluggesellschaft gelesen (einmal täglich und auf Anforderung): Flotte, Standort der Luftfahrzeuge, Flugbuch; unbekannte Typen danach ergänzt.',
    'Leídos del sitio de la aerolínea por el lanzador (una vez al día y a petición): flota, ubicación de las aeronaves, registro de vuelos; tipos desconocidos completados después.'
  ],
  ['Mettre à jour maintenant', 'Update now', 'Jetzt aktualisieren', 'Actualizar ahora'],
  ['Flotte', 'Fleet', 'Flotte', 'Flota'],
  ['Missions', 'Missions', 'Missionen', 'Misiones'],
  ['Les missions arrivent avec les données (étape 2, registre', 'Missions come with the data (step 2, registry',
    'Die Missionen kommen mit den Daten (Schritt 2, Register', 'Las misiones llegan con los datos (paso 2, registro'
  ],
  [') ; le registre se relit depuis sa page.', '); the registry is reread from its page.',
    '); das Register wird auf seiner Seite neu gelesen.', '); el registro se relee desde su página.'
  ],
  ['Registre des missions', 'Mission registry', 'Missionsregister', 'Registro de misiones'],
  ['Réglages du SO Group', 'SO Group settings', 'Einstellungen der SO Group', 'Ajustes del SO Group'],
  ['Accueil', 'Home', 'Startseite', 'Inicio'],
  ['https://hôte/compte/dépôt.git', 'https://host/account/repository.git', 'https://host/konto/repository.git',
    'https://host/cuenta/repositorio.git'
  ],
  ['git@hôte:compte/dépôt.git', 'git@host:account/repository.git', 'git@host:konto/repository.git', 'git@host:cuenta/repositorio.git']
]);
