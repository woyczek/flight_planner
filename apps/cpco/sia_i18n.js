// Traductions (fr / en / de / es) des pages Missions SIA : générateur de mission (mission_editor.html)
// et studio cartographique (map_parser.html). Une ligne par texte affiché (y compris les morceaux de
// phrase coupés par un lien ou un champ) ; appliquées par RepositoryContentI18n (shared/content_i18n.js).
(() => {
  if (!window.RepositoryContentI18n) return;
  window.RepositoryContentI18n([
    // ---- générateur de mission
    // squelette sans ChatGPT (générateur) ; points à placer (studio)
    ["Points à placer", "Points to place", "Zu setzende Punkte", "Puntos que colocar"],
    ["Cliquer la carte, ou chercher un terrain, une balise, un point de la base SIA ou une ville (code ou nom) ; un point posé se déplace en le glissant sur la carte.",
      "Click the map, or search an airfield, a beacon, a point of the SIA base or a town (code or name); a placed point moves by dragging it on the map.",
      "Karte anklicken oder einen Flugplatz, ein Funkfeuer, einen Punkt der SIA-Datenbank oder einen Ort suchen (Code oder Name); ein gesetzter Punkt wird durch Ziehen auf der Karte verschoben.",
      "Pulse el mapa, o busque un aeródromo, una radiobaliza, un punto de la base SIA o una ciudad (código o nombre); un punto colocado se mueve arrastrándolo en el mapa."
    ],
    ["Tout est placé. ", "Everything is placed. ", "Alles gesetzt. ", "Todo está colocado. "],
    ["Ouvrir au studio", "Open in the studio", "Im Studio öffnen", "Abrir en el estudio"],
    // ligne d'état et « Annuler les modifications » (générateur, studio)
    ["Annuler les modifications", "Undo changes", "Änderungen verwerfen", "Deshacer los cambios"],
    ["Revenir à la dernière version enregistrée dans le dossier (ou à la version chargée), après confirmation",
      "Go back to the last version saved to the folder (or to the loaded version), after confirmation",
      "Zur zuletzt im Ordner gespeicherten Version (oder zur geladenen Version) zurückkehren, nach Bestätigung",
      "Volver a la última versión guardada en la carpeta (o a la versión cargada), tras confirmación"
    ],
    // « Dupliquer » (générateur)
    ["Résumé", "Summary", "Zusammenfassung", "Resumen"],
    ["Copie de la mission chargée, prête à modifier : identifiant et série suivants de la même famille, titre « (copie) » ; cartes et rendus à refaire au studio",
      "Copy of the loaded mission, ready to edit: next identifier and series of the same family, title “(copy)”; maps and renders to redo in the studio",
      "Kopie der geladenen Mission, bereit zum Bearbeiten: nächste Kennung und Serie derselben Familie, Titel „(Kopie)“; Karten und Darstellungen im Studio neu erstellen",
      "Copia de la misión cargada, lista para modificar: identificador y serie siguientes de la misma familia, título «(copia)»; mapas y renders a rehacer en el estudio"
    ],
    // rubriques textuelles nommées (générateur)
    ["Résumé, description détaillée, puis les rubriques que le brief place à leur rang : objectifs, risques et notes vont dans le YAML, les autres complètent la section du même nom.",
      "Summary, detailed description, then the sections the brief places in order: objectives, risks and notes go into the YAML, the others complete the section of the same name.",
      "Zusammenfassung, ausführliche Beschreibung, dann die Abschnitte, die das Briefing an ihre Stelle setzt: Ziele, Risiken und Notizen gehen ins YAML, die anderen ergänzen den gleichnamigen Abschnitt.",
      "Resumen, descripción detallada y después las secciones que el brief coloca en su sitio: objetivos, riesgos y notas van al YAML, las demás completan la sección del mismo nombre."
    ],
    ["Introduction", "Introduction", "Einleitung", "Introducción"],
    ["Brief : sous l’en-tête (type, aéronef, départ, destination).",
      "Brief: under the header (type, aircraft, departure, destination).",
      "Briefing: unter dem Kopf (Typ, Luftfahrzeug, Abflug, Ziel).", "Brief: bajo la cabecera (tipo, aeronave, salida, destino)."
    ],
    ["Contexte, situation, ce qui amène la mission.", "Context, situation, what leads to the mission.",
      "Kontext, Lage, was zur Mission führt.", "Contexto, situación, lo que motiva la misión."
    ],
    ["Objectif principal", "Main objective", "Hauptziel", "Objetivo principal"],
    ["YAML objectives.primary ; brief et CR.", "YAML objectives.primary; brief and report.",
      "YAML objectives.primary; Briefing und Bericht.", "YAML objectives.primary; brief e informe."
    ],
    ["Ce que l’équipage doit avoir accompli, en une ou deux phrases.", "What the crew must have achieved, in one or two sentences.",
      "Was die Besatzung erreicht haben muss, in ein oder zwei Sätzen.",
      "Lo que la tripulación debe haber logrado, en una o dos frases."
    ],
    ["Objectifs secondaires", "Secondary objectives", "Nebenziele", "Objetivos secundarios"],
    ["YAML objectives.secondary ; brief et CR.", "YAML objectives.secondary; brief and report.",
      "YAML objectives.secondary; Briefing und Bericht.", "YAML objectives.secondary; brief e informe."
    ],
    ["Ce qui est souhaité en plus, un objectif par ligne.", "What is wanted in addition, one objective per line.",
      "Was zusätzlich gewünscht ist, ein Ziel pro Zeile.", "Lo que se desea además, un objetivo por línea."
    ],
    ["Équipes engagées", "Teams involved", "Beteiligte Teams", "Equipos implicados"],
    ["Brief : sous le tableau des équipes.", "Brief: under the team table.", "Briefing: unter der Teamtabelle.",
      "Brief: bajo la tabla de equipos."
    ],
    ["Rôle de chaque équipe, liaisons, consignes communes.", "Role of each team, links, common instructions.",
      "Rolle jedes Teams, Verbindungen, gemeinsame Anweisungen.", "Papel de cada equipo, enlaces, consignas comunes."
    ],
    ["Points tournants", "Turning points", "Wendepunkte", "Puntos de viraje"],
    ["Brief : sous le tableau des points.", "Brief: under the point table.", "Briefing: unter der Punktetabelle.",
      "Brief: bajo la tabla de puntos."
    ],
    ["Ce qu’il faut faire ou observer à chaque point.", "What to do or observe at each point.",
      "Was an jedem Punkt zu tun oder zu beobachten ist.", "Qué hacer u observar en cada punto."
    ],
    ["Brief : sous la liste des rendez-vous.", "Brief: under the rendezvous list.", "Briefing: unter der Treffpunktliste.",
      "Brief: bajo la lista de encuentros."
    ],
    ["Procédure de jonction, fréquences, signes de reconnaissance.", "Joining procedure, frequencies, recognition signals.",
      "Treffverfahren, Frequenzen, Erkennungszeichen.", "Procedimiento de reunión, frecuencias, señales de reconocimiento."
    ],
    ["Ravitaillement en vol", "Air refuelling", "Luftbetankung", "Reabastecimiento en vuelo"],
    ["Brief : sous les données du ravitaillement.", "Brief: under the refuelling data.", "Briefing: unter den Betankungsdaten.",
      "Brief: bajo los datos del reabastecimiento."
    ],
    ["Procédure, quantités, consignes du ravitailleur.", "Procedure, quantities, tanker instructions.",
      "Verfahren, Mengen, Anweisungen des Tankers.", "Procedimiento, cantidades, consignas del cisterna."
    ],
    ["Risques à prendre en compte", "Risks to consider", "Zu berücksichtigende Risiken", "Riesgos a tener en cuenta"],
    ["YAML risks ; brief, PDF et CR.", "YAML risks; brief, PDF and report.", "YAML risks; Briefing, PDF und Bericht.",
      "YAML risks; brief, PDF e informe."
    ],
    ["Un risque par ligne : danger — conséquence — mesure.", "One risk per line: hazard — consequence — measure.",
      "Ein Risiko pro Zeile: Gefahr — Folge — Maßnahme.", "Un riesgo por línea: peligro — consecuencia — medida."
    ],
    ["Charge / personnel", "Load / personnel", "Ladung / Personal", "Carga / personal"],
    ["Brief : sous la charge transportée.", "Brief: under the carried load.", "Briefing: unter der beförderten Ladung.",
      "Brief: bajo la carga transportada."
    ],
    ["Ce qui est à bord, contraintes de chargement ou de personnel.", "What is on board, loading or personnel constraints.",
      "Was an Bord ist, Lade- oder Personalbeschränkungen.", "Lo que va a bordo, restricciones de carga o de personal."
    ],
    ["Coordination", "Coordination", "Koordinierung", "Coordinación"],
    ["Brief : avec la coordination de l’opération, sinon section seule.",
      "Brief: with the operation’s coordination, otherwise on its own.",
      "Briefing: bei der Koordinierung der Operation, sonst eigener Abschnitt.",
      "Brief: con la coordinación de la operación, si no, sección propia."
    ],
    ["Qui parle à qui, quand, sur quelle fréquence.", "Who talks to whom, when, on which frequency.",
      "Wer mit wem spricht, wann, auf welcher Frequenz.", "Quién habla con quién, cuándo, en qué frecuencia."
    ],
    ["Chronologie", "Timeline", "Zeitablauf", "Cronología"],
    ["Brief : sous la chronologie de l’exercice, sinon section seule.", "Brief: under the exercise timeline, otherwise on its own.",
      "Briefing: unter dem Übungsablauf, sonst eigener Abschnitt.", "Brief: bajo la cronología del ejercicio, si no, sección propia."
    ],
    ["Horaires prévus : décollage, arrivée sur zone, rendez-vous, retour.",
      "Planned times: take-off, arrival on area, rendezvous, return.",
      "Geplante Zeiten: Start, Ankunft im Gebiet, Treffpunkt, Rückkehr.",
      "Horarios previstos: despegue, llegada a la zona, encuentro, regreso."
    ],
    ["Cartographie prévue", "Planned maps", "Vorgesehene Karten", "Cartografía prevista"],
    ["Brief : sous la liste des cartes.", "Brief: under the map list.", "Briefing: unter der Kartenliste.",
      "Brief: bajo la lista de mapas."
    ],
    ["Ce que chaque carte doit montrer, au besoin.", "What each map must show, if needed.", "Was jede Karte bei Bedarf zeigen soll.",
      "Lo que cada mapa debe mostrar, si hace falta."
    ],
    ["Notes", "Notes", "Notizen", "Notas"],
    ["YAML notes ; brief et CR.", "YAML notes; brief and report.", "YAML notes; Briefing und Bericht.",
      "YAML notes; brief e informe."
    ],
    ["Remarques diverses, une par ligne.", "Miscellaneous remarks, one per line.", "Verschiedene Bemerkungen, eine pro Zeile.",
      "Observaciones diversas, una por línea."
    ],
    ["Autre rubrique…", "Other section…", "Anderer Abschnitt…", "Otra sección…"],
    ["Titre libre ; brief seulement, à la fin.", "Free title; brief only, at the end.", "Freier Titel; nur im Briefing, am Ende.",
      "Título libre; solo en el brief, al final."
    ],
    ["Autre rubrique : brief seulement, à la fin.", "Other section: brief only, at the end.",
      "Anderer Abschnitt: nur im Briefing, am Ende.", "Otra sección: solo en el brief, al final."
    ],
    ["Autre rubrique", "Other section", "Anderer Abschnitt", "Otra sección"],
    // identification
    ["Titre, famille et sous-type, identifiant (famille, numéro de l’opération, équipe), série de génération, auteur et date.",
      "Title, family and subtype, identifier (family, operation number, team), generation series, author and date.",
      "Titel, Familie und Untertyp, Kennung (Familie, Operationsnummer, Team), Erzeugungsserie, Autor und Datum.",
      "Título, familia y subtipo, identificador (familia, número de operación, equipo), serie de generación, autor y fecha."
    ],
    ["Famille", "Family", "Familie", "Familia"],
    ["Identifiant", "Identifier", "Kennung", "Identificador"],
    ["Série de génération", "Generation series", "Erzeugungsserie", "Serie de generación"],
    ["Format des fichiers : ", "File format: ", "Dateiformat: ", "Formato de archivo: "],
    // Centre de planification et de conduite des opérations (CPCO)
    ["Centre de planification et de conduite des opérations", "Planning and operations command centre",
      "Einsatzplanungs- und Führungszentrum", "Centro de planificación y conducción de operaciones"
    ],
    ["Générateur de mission", "Mission generator", "Missionsgenerator", "Generador de misiones"],
    ["Studio cartographique", "Map studio", "Kartenstudio", "Estudio cartográfico"],
    ["Registre des missions", "Mission registry", "Missionsregister", "Registro de misiones"],
    ["Séries générées, choix par type, rendez-vous et équipes, commande de nouvelles missions",
      "Generated series, choice by type, rendezvous and teams, ordering new missions",
      "Erzeugte Serien, Auswahl nach Typ, Treffpunkten und Teams, Bestellung neuer Missionen",
      "Series generadas, elección por tipo, encuentros y equipos, encargo de nuevas misiones"
    ],
    // zones à activer
    ["Zones à activer", "Areas to activate", "Zu aktivierende Gebiete", "Zonas que activar"],
    ["Zones R, D, TRA et du RTBA recoupées par la route probable et les zones de travail, par gestionnaire : demandes d’activation.",
      "R, D, TRA and RTBA areas crossed by the probable route and the work areas, by administrator: activation requests.",
      "Von der wahrscheinlichen Route und den Arbeitsgebieten berührte R-, D-, TRA- und RTBA-Gebiete, nach Verwalter: Aktivierungsanträge.",
      "Zonas R, D, TRA y RTBA cruzadas por la ruta probable y las zonas de trabajo, por gestor: solicitudes de activación."
    ],
    ["Gestionnaire", "Administrator", "Verwalter", "Gestor"],
    ["Zone", "Area", "Gebiet", "Zona"],
    ["Limites", "Limits", "Grenzen", "Límites"],
    ["Activation", "Activation", "Aktivierung", "Activación"],
    ["Recoupée par", "Crossed by", "Berührt von", "Cruzada por"],
    // studio : blocs réorganisés
    ["Mission partagée avec le générateur ; ouvrir ou coller une autre mission.",
      "Mission shared with the generator; open or paste another mission.",
      "Mit dem Generator geteilte Mission; eine andere Mission öffnen oder einfügen.",
      "Misión compartida con el generador; abrir o pegar otra misión."
    ],
    ["Ouvrir une autre mission : fichier Markdown / YAML ou texte collé", "Open another mission: Markdown / YAML file or pasted text",
      "Andere Mission öffnen: Markdown-/YAML-Datei oder eingefügter Text", "Abrir otra misión: archivo Markdown / YAML o texto pegado"
    ],
    ["Cartes et cadrage", "Maps and framing", "Karten und Ausschnitt", "Mapas y encuadre"],
    ["Cartes de la mission, cadrage de chacune et profil d’affichage (fond, espaces, symboles, éléments).",
      "Mission maps, framing of each and display profile (base map, airspaces, symbols, elements).",
      "Karten der Mission, Ausschnitt jeder Karte und Anzeigeprofil (Hintergrund, Lufträume, Symbole, Elemente).",
      "Mapas de la misión, encuadre de cada uno y perfil de visualización (fondo, espacios, símbolos, elementos)."
    ],
    ["Cartes de la mission", "Mission maps", "Karten der Mission", "Mapas de la misión"],
    ["clic : afficher · profil d’affichage · tracé · destinataire (exercice) · ZIP",
      "click: show · display profile · route · recipient (exercise) · ZIP",
      "Klick: anzeigen · Anzeigeprofil · Route · Empfänger (Übung) · ZIP",
      "clic: mostrar · perfil · trazado · destinatario (ejercicio) · ZIP"
    ],
    ["Réglages du profil ", "Settings of profile ", "Einstellungen des Profils ", "Ajustes del perfil "],
    [" : fond de carte, zones, symboles OACI, éléments", ": base map, airspaces, ICAO symbols, elements",
      ": Hintergrund, Lufträume, ICAO-Symbole, Elemente", ": fondo, espacios, símbolos OACI, elementos"
    ],
    ["Actualiser", "Refresh", "Aktualisieren", "Actualizar"],
    ["Garder ce cadrage", "Keep this framing", "Diesen Ausschnitt behalten", "Mantener este encuadre"],
    ["Recentrer", "Recentre", "Zentrieren", "Recentrar"],
    ["Cadrage automatique", "Automatic framing", "Automatischer Ausschnitt", "Encuadre automático"],
    ["⧉ Fenêtre", "⧉ Window", "⧉ Fenster", "⧉ Ventana"],
    ["⤢ Agrandir", "⤢ Enlarge", "⤢ Vergrößern", "⤢ Ampliar"],
    ["Coupe verticale le long du cheminement : relief, espaces traversés, obstacles.",
      "Vertical cross-section along the route: terrain, airspaces crossed, obstacles.",
      "Vertikalschnitt entlang der Route: Gelände, durchflogene Lufträume, Hindernisse.",
      "Corte vertical a lo largo de la ruta: relieve, espacios atravesados, obstáculos."
    ],
    ["Aperçus et génération", "Previews and generation", "Vorschauen und Erzeugung", "Vistas previas y generación"],
    ["Aperçus de toutes les cartes, génération des cartes et du ZIP.", "Previews of all maps, generation of the maps and the ZIP.",
      "Vorschauen aller Karten, Erzeugung der Karten und des ZIP.",
      "Vistas previas de todos los mapas, generación de los mapas y del ZIP."
    ],
    ["Grille MORA (calcul), sources des villes et du relief.", "MORA grid (calculation), sources of cities and terrain.",
      "MORA-Raster (Berechnung), Quellen der Städte und des Geländes.", "Cuadrícula MORA (cálculo), fuentes de ciudades y relieve."
    ],
    // bloc Mission (import replié, commande ChatGPT)
    ["Commander à ChatGPT…", "Order from ChatGPT…", "Bei ChatGPT bestellen…", "Encargar a ChatGPT…"],
    ["Mission chargée, enregistrement et brouillon ; importer une autre mission ou en commander une à ChatGPT.",
      "Loaded mission, saving and draft; import another mission or order one from ChatGPT.",
      "Geladene Mission, Speichern und Entwurf; eine andere Mission importieren oder bei ChatGPT bestellen.",
      "Misión cargada, guardado y borrador; importar otra misión o encargar una a ChatGPT."
    ],
    ["Importer une autre mission : fichiers, texte collé, commande ChatGPT",
      "Import another mission: files, pasted text, ChatGPT order",
      "Andere Mission importieren: Dateien, eingefügter Text, ChatGPT-Bestellung",
      "Importar otra misión: archivos, texto pegado, encargo a ChatGPT"
    ],
    ["Commander une mission à ChatGPT", "Order a mission from ChatGPT", "Mission bei ChatGPT bestellen",
      "Encargar una misión a ChatGPT"
    ],
    ["type, théâtre, équipes, aéronefs : le prompt est copié et ChatGPT s’ouvre",
      "type, theatre, teams, aircraft: the prompt is copied and ChatGPT opens",
      "Typ, Schauplatz, Teams, Luftfahrzeuge: der Prompt wird kopiert und ChatGPT geöffnet",
      "tipo, teatro, equipos, aeronaves: se copia el prompt y se abre ChatGPT"
    ],
    // opération, exercice, documents
    ["Opération", "Operation", "Operation", "Operación"],
    ["Missions de l’opération et organisation de l’exercice : cliquer une mission pour l’afficher.",
      "Missions of the operation and exercise organisation: click a mission to show it.",
      "Missionen der Operation und Übungsleitung: eine Mission anklicken, um sie anzuzeigen.",
      "Misiones de la operación y organización del ejercicio: pulse una misión para mostrarla."
    ],
    ["Exercice", "Exercise", "Übung", "Ejercicio"],
    ["Exercice : ce que reçoit cet équipage", "Exercise: what this crew receives", "Übung: was diese Besatzung erhält",
      "Ejercicio: lo que recibe esta tripulación"
    ],
    ["Plis scellés à ouvrir et messages radio attendus, d’après la chronologie de l’organisation de l’exercice.",
      "Sealed envelopes to open and radio messages to expect, from the exercise organisation’s timeline.",
      "Zu öffnende versiegelte Umschläge und erwartete Funksprüche, nach dem Ablauf der Übungsleitung.",
      "Sobres sellados que abrir y mensajes de radio esperados, según la cronología de la organización del ejercicio."
    ],
    ["Heure H et participants, chiffons, chronologie des messages radio et des plis scellés, et ce que reçoit chacun.",
      "H hour and participants, exercise targets, timeline of radio messages and sealed envelopes, and what each one receives.",
      "Stunde H und Teilnehmer, Übungsziele, Ablauf der Funksprüche und versiegelten Umschläge, und was jeder erhält.",
      "Hora H y participantes, blancos, cronología de los mensajes de radio y sobres sellados, y lo que recibe cada uno."
    ],
    ["Brief général", "General brief", "Allgemeines Briefing", "Briefing general"],
    ["Brief de la coordination, remis à tous : situation, objectifs communs, créneaux, critères de fin.",
      "Coordination brief, given to all: situation, common objectives, slots, end criteria.",
      "Briefing der Koordination, an alle: Lage, gemeinsame Ziele, Zeitfenster, Endkriterien.",
      "Briefing de la coordinación, entregado a todos: situación, objetivos comunes, franjas, criterios de fin."
    ],
    ["Créer l’organisation de l’exercice", "Create the exercise organisation", "Übungsleitung anlegen",
      "Crear la organización del ejercicio"
    ],
    ["Créer les missions des chiffons joués", "Create the missions of the played targets", "Missionen der gespielten Ziele anlegen",
      "Crear las misiones de los blancos jugados"
    ],
    ["Chaque chiffon joué devient une mission de l’opération, affectée et volée comme les autres : départ de la base du premier équipage, route de la piste, consignes, décollage calculé d’après son heure de départ.",
      "Each played target becomes a mission of the operation, assigned and flown like the others: departure from the first crew's base, the track's route, instructions, take-off computed from its start time.",
      "Jedes gespielte Ziel wird eine Mission der Operation, zugewiesen und geflogen wie die anderen: Start an der Basis der ersten Besatzung, Route der Spur, Anweisungen, Startzeit aus ihrer Beginnzeit berechnet.",
      "Cada blanco jugado se convierte en una misión de la operación, asignada y volada como las demás: salida desde la base de la primera tripulación, ruta de la pista, consignas, despegue calculado según su hora de inicio."
    ],
    ["Missions de chiffon créées", "Target missions created", "Zielmissionen angelegt", "Misiones de blanco creadas"],
    ["Organisation", "Organisation", "Übungsleitung", "Organización"],
    ["brief général, chiffons, chronologie", "general brief, exercise targets, timeline", "allgemeines Briefing, Übungsziele, Ablauf",
      "briefing general, blancos, cronología"
    ],
    ["à créer", "to create", "anzulegen", "por crear"],
    ["non chargée", "not loaded", "nicht geladen", "no cargada"],
    ["Documents", "Documents", "Dokumente", "Documentos"],
    ["Documents à remettre à chacun : brief de l’équipage (avec ses plis scellés), dossier de l’organisation, fiches des chiffons joués ; exports des données.",
      "Documents for each recipient: crew brief (with its sealed envelopes), organisation file, sheets of the played exercise targets; data exports.",
      "Dokumente für jeden Empfänger: Briefing der Besatzung (mit ihren versiegelten Umschlägen), Mappe der Übungsleitung, Blätter der gespielten Übungsziele; Datenexporte.",
      "Documentos para cada destinatario: briefing de la tripulación (con sus sobres sellados), dossier de la organización, fichas de los blancos jugados; exportación de datos."
    ],
    ["Cette mission", "This mission", "Diese Mission", "Esta misión"],
    ["Organisation de l’exercice", "Exercise organisation", "Übungsleitung", "Organización del ejercicio"],
    ["Toute l’opération", "Whole operation", "Gesamte Operation", "Toda la operación"],
    ["Données", "Data", "Daten", "Datos"],
    ["Brief de l’équipage (PDF)", "Crew brief (PDF)", "Briefing der Besatzung (PDF)", "Briefing de la tripulación (PDF)"],
    ["Dossier organisation (PDF)", "Organisation file (PDF)", "Mappe der Übungsleitung (PDF)", "Dossier de la organización (PDF)"],
    ["Fiches des chiffons joués (un PDF chacun)", "Sheets of the played exercise targets (one PDF each)",
      "Blätter der gespielten Übungsziele (je ein PDF)", "Fichas de los blancos jugados (un PDF cada una)"
    ],
    ["Tous les documents de l’exercice (un PDF par destinataire)", "All exercise documents (one PDF per recipient)",
      "Alle Übungsdokumente (ein PDF pro Empfänger)", "Todos los documentos del ejercicio (un PDF por destinatario)"
    ],
    // studio : cartes par destinataire
    ["Sans pistes (brief)", "No tracks (brief)", "Ohne Übungsziele (Briefing)", "Sin blancos (briefing)"],
    ["Sans pistes", "No tracks", "Ohne Übungsziele", "Sin blancos"],
    ["Organisation : toutes les pistes et les routes", "Organisation: all tracks and routes",
      "Übungsleitung: alle Übungsziele und Routen", "Organización: todos los blancos y rutas"
    ],
    ["Importer une mission", "Import a mission", "Mission importieren", "Importar una misión"],
    ["Choisissez vos fichiers, collez une réponse ou générez une mission avec ChatGPT.",
      "Choose your files, paste a reply or generate a mission with ChatGPT.",
      "Dateien wählen, eine Antwort einfügen oder eine Mission mit ChatGPT erzeugen.",
      "Elija sus archivos, pegue una respuesta o genere una misión con ChatGPT."
    ],
    ["Identification", "Identification", "Identifikation", "Identificación"],
    ["Titre, numéro, série, type, auteur et date de la mission.", "Mission title, number, series, type, author and date.",
      "Titel, Nummer, Serie, Typ, Autor und Datum der Mission.", "Título, número, serie, tipo, autor y fecha de la misión."
    ],
    ["Textes de mission", "Mission texts", "Missionstexte", "Textos de la misión"],
    ["Résumé, description détaillée et rubriques du brief.", "Summary, detailed description and sections of the brief.",
      "Zusammenfassung, ausführliche Beschreibung und Rubriken des Briefings.",
      "Resumen, descripción detallada y apartados del briefing."
    ],
    ["Toutes les données YAML", "All YAML data", "Alle YAML-Daten", "Todos los datos YAML"],
    ["Éditeur libre de toutes les clés du YAML de la mission.", "Free editor for every key of the mission YAML.",
      "Freier Editor für alle Schlüssel des Missions-YAML.", "Editor libre de todas las claves del YAML de la misión."
    ],
    ["Cartes du dossier final", "Maps of the final package", "Karten des Endpakets", "Mapas del dosier final"],
    ["Cartes jointes au PDF, dans l’ordre du dossier.", "Maps attached to the PDF, in the order of the file.",
      "Dem PDF beigefügte Karten, in der Reihenfolge des Dossiers.", "Mapas adjuntos al PDF, en el orden del dossier."
    ],
    ["Mission", "Mission", "Mission", "Misión"],
    ["Ouvrir, coller ou reprendre la mission partagée avec le générateur.",
      "Open, paste or reuse the mission shared with the generator.",
      "Die mit dem Generator geteilte Mission öffnen, einfügen oder übernehmen.",
      "Abrir, pegar o retomar la misión compartida con el generador."
    ],
    ["Profils d’affichage", "Display profiles", "Anzeigeprofile", "Perfiles de visualización"],
    ["Fond de carte, espaces, symboles et éléments de chaque carte.", "Base map, airspace, symbols and elements of each map.",
      "Kartengrund, Lufträume, Symbole und Elemente jeder Karte.", "Fondo, espacios, símbolos y elementos de cada mapa."
    ],
    ["Cartes", "Maps", "Karten", "Mapas"],
    ["Cartes de la mission, aperçus et génération du ZIP.", "Mission maps, previews and ZIP generation.",
      "Karten der Mission, Vorschauen und ZIP-Erzeugung.", "Mapas de la misión, vistas previas y generación del ZIP."
    ],
    ["Base de données SIA", "SIA database", "SIA-Datenbank", "Base de datos SIA"],
    ["Dossier SIA (AIXM) lu et gardé dans le navigateur.", "SIA folder (AIXM) read and kept in the browser.",
      "SIA-Ordner (AIXM), gelesen und im Browser gespeichert.", "Carpeta SIA (AIXM) leída y guardada en el navegador."
    ],
    ["Données complémentaires", "Additional data", "Ergänzende Daten", "Datos complementarios"],
    ["Villes, grille MORA, relief et autres couches.", "Cities, MORA grid, terrain and other layers.",
      "Städte, MORA-Raster, Gelände und weitere Ebenen.", "Ciudades, cuadrícula MORA, relieve y otras capas."
    ],
    ["Générateur complet de mission", "Complete mission generator", "Vollständiger Missionsgenerator",
      "Generador completo de misiones"
    ],
    ["Créer le CR →", "Create the report →", "Bericht erstellen →", "Crear el informe →"],
    ["1. Importer une mission", "1. Import a mission", "1. Mission importieren", "1. Importar una misión"],
    ["YAML et/ou Markdown", "YAML and/or Markdown", "YAML und/oder Markdown", "YAML y/o Markdown"],
    ["Cartes ou ZIP livré par le générateur", "Maps or ZIP delivered by the generator", "Karten oder vom Generator geliefertes ZIP",
      "Mapas o ZIP entregado por el generador"
    ],
    ["Tu peux sélectionner le YAML et le Markdown ensemble. Pour les cartes, sélectionne directement le ZIP produit par le générateur : les PNG, dont la carte d’assemblage, seront extraits et associés automatiquement.",
      "You can select the YAML and the Markdown together. For maps, select the ZIP produced by the generator directly: the PNGs, including the index map, are extracted and matched automatically.",
      "YAML und Markdown können zusammen gewählt werden. Für die Karten direkt das vom Generator erzeugte ZIP wählen: die PNG, einschließlich der Übersichtskarte, werden automatisch entpackt und zugeordnet.",
      "Puede seleccionar el YAML y el Markdown juntos. Para los mapas, seleccione directamente el ZIP producido por el generador: los PNG, incluido el mapa de conjunto, se extraen y asocian automáticamente."
    ],
    ["Nouvelle mission", "New mission", "Neue Mission", "Nueva misión"],
    ["Mémoriser le brouillon", "Save draft", "Entwurf speichern", "Guardar borrador"],
    ["Recharger le brouillon", "Reload draft", "Entwurf neu laden", "Recargar borrador"],
    ["Aucune mission chargée.", "No mission loaded.", "Keine Mission geladen.", "Ninguna misión cargada."],
    ["Aucune mission chargée", "No mission loaded", "Keine Mission geladen", "Ninguna misión cargada"],
    ["2. Identification", "2. Identification", "2. Identifikation", "2. Identificación"],
    ["Titre", "Title", "Titel", "Título"],
    ["Numéro / ID", "Number / ID", "Nummer / ID", "Número / ID"],
    ["Numéro dans la série", "Number in the series", "Nummer in der Serie", "Número en la serie"],
    ["Série", "Series", "Serie", "Serie"],
    ["Type", "Type", "Typ", "Tipo"],
    ["Sous-type", "Subtype", "Untertyp", "Subtipo"],
    ["Auteur", "Author", "Autor", "Autor"],
    ["Date du document", "Document date", "Dokumentdatum", "Fecha del documento"],
    ["Schéma", "Schema", "Schema", "Esquema"],
    ["Version du schéma", "Schema version", "Schemaversion", "Versión del esquema"],
    ["3. Textes de mission", "3. Mission texts", "3. Missionstexte", "3. Textos de la misión"],
    ["Description détaillée", "Detailed description", "Ausführliche Beschreibung", "Descripción detallada"],
    ["Ajouter une rubrique textuelle", "Add a text section", "Textabschnitt hinzufügen", "Añadir una sección de texto"],
    ["4. Toutes les données YAML", "4. All YAML data", "4. Alle YAML-Daten", "4. Todos los datos YAML"],
    ["Cet éditeur est sans schéma imposé : les champs supplémentaires présents dans tes exemples sont conservés et restent modifiables.",
      "This editor has no fixed schema: extra fields found in your examples are kept and remain editable.",
      "Dieser Editor hat kein festes Schema: zusätzliche Felder aus den Beispielen bleiben erhalten und bearbeitbar.",
      "Este editor no impone esquema: los campos adicionales de sus ejemplos se conservan y siguen siendo editables."
    ],
    ["liste vide", "empty list", "leere Liste", "lista vacía"],
    ["Ajouter un élément", "Add an item", "Element hinzufügen", "Añadir un elemento"],
    ["Ajouter", "Add", "Hinzufügen", "Añadir"],
    ["5. Cartes du dossier final", "5. Maps of the final package", "5. Karten des Endpakets", "5. Mapas del dosier final"],
    ["Aucune carte déclarée dans le YAML.", "No map declared in the YAML.", "Keine Karte im YAML angegeben.",
      "Ningún mapa declarado en el YAML."
    ],
    ["La carte d’assemblage est intégrée au package cartographique et placée en première position dans le PDF, avant les autres cartes.",
      "The index map is part of the map package and placed first in the PDF, before the other maps.",
      "Die Übersichtskarte gehört zum Kartenpaket und steht im PDF an erster Stelle, vor den anderen Karten.",
      "El mapa de conjunto forma parte del paquete cartográfico y va en primer lugar en el PDF, antes de los demás mapas."
    ],
    ["Exporter YAML", "Export YAML", "YAML exportieren", "Exportar YAML"],
    ["Exporter Markdown", "Export Markdown", "Markdown exportieren", "Exportar Markdown"],
    ["Exporter le PDF final", "Export the final PDF", "End-PDF exportieren", "Exportar el PDF final"],
    ["Exporter tous les PDF", "Export all PDFs", "Alle PDFs exportieren", "Exportar todos los PDF"],
    ["Dossier d’opération (un PDF)", "Operation file (one PDF)", "Operationsmappe (ein PDF)", "Dossier de operación (un PDF)"],
    ["Nouveau compte rendu CR pré-rempli (famille d’après le type de mission)",
      "New pre-filled report (family from the mission type)", "Neuer vorausgefüllter Bericht (Familie nach Missionstyp)",
      "Nuevo informe prerrellenado (familia según el tipo de misión)"
    ],
    ["Nom de l’auteur", "Author name", "Name des Autors", "Nombre del autor"],
    ["Nom d’un nouveau champ racine", "Name of a new root field", "Name eines neuen Stammfelds", "Nombre de un nuevo campo raíz"],
    ["Changelog / notes de version", "Changelog / release notes", "Änderungsprotokoll / Versionshinweise",
      "Registro de cambios / notas de versión"
    ],
    // ---- studio cartographique : en-tête, mission
    ["Studio cartographique aéronautique SIA", "SIA aeronautical map studio", "SIA-Luftfahrtkartenstudio",
      "Estudio cartográfico aeronáutico SIA"
    ],
    ["1. Mission", "1. Mission", "1. Mission", "1. Misión"],
    ["Ouvrir une mission Markdown ou YAML", "Open a Markdown or YAML mission", "Markdown- oder YAML-Mission öffnen",
      "Abrir una misión Markdown o YAML"
    ],
    ["ou coller son contenu…", "or paste its content…", "oder Inhalt einfügen…", "o pegar su contenido…"],
    ["Coller le contenu Markdown ou YAML de la mission", "Paste the mission’s Markdown or YAML content",
      "Markdown- oder YAML-Inhalt der Mission einfügen", "Pegar el contenido Markdown o YAML de la misión"
    ],
    ["Lire la mission", "Read the mission", "Mission lesen", "Leer la misión"],
    ["Formats acceptés : Markdown, YAML", "Accepted formats: Markdown, YAML", "Akzeptierte Formate: Markdown, YAML",
      "Formatos aceptados: Markdown, YAML"
    ],
    ["Afficher toutes les cartes", "Show all maps", "Alle Karten anzeigen", "Mostrar todos los mapas"],
    ["Générer les cartes et le ZIP", "Generate the maps and the ZIP", "Karten und ZIP erzeugen", "Generar los mapas y el ZIP"],
    ["Sorties : PNG 1600 px — carte d’assemblage toujours incluse (réglage : menu ☰).",
      "Outputs: PNG 1600 px — index map always included (setting: ☰ menu).",
      "Ausgaben: PNG 1600 px — Übersichtskarte immer enthalten (Einstellung: Menü ☰).",
      "Salidas: PNG 1600 px — mapa de conjunto siempre incluido (ajuste: menú ☰)."
    ],
    ["Colle ici le contenu Markdown ou YAML de la mission…", "Paste the mission’s Markdown or YAML content here…",
      "Markdown- oder YAML-Inhalt der Mission hier einfügen…", "Pegue aquí el contenido Markdown o YAML de la misión…"
    ],
    ["Fermer", "Close", "Schließen", "Cerrar"],
    // ---- profils d'affichage : onglets
    ["2. Profils d’affichage", "2. Display profiles", "2. Anzeigeprofile", "2. Perfiles de visualización"],
    ["Fond de carte", "Base map", "Hintergrundkarte", "Mapa de fondo"],
    ["Zones", "Airspaces", "Lufträume", "Espacios"],
    ["Symboles OACI", "ICAO symbols", "ICAO-Symbole", "Símbolos OACI"],
    ["Éléments", "Elements", "Elemente", "Elementos"],
    ["Couches OSM", "OSM layers", "OSM-Ebenen", "Capas OSM"],
    ["Sol", "Land", "Boden", "Suelo"],
    ["Hydrographie", "Water", "Gewässer", "Hidrografía"],
    ["Routes / rail", "Roads / rail", "Straßen / Bahn", "Carreteras / ferrocarril"],
    ["Bâtiments", "Buildings", "Gebäude", "Edificios"],
    ["Frontières", "Borders", "Grenzen", "Fronteras"],
    ["Relief ombré", "Hillshade", "Schummerung", "Relieve sombreado"],
    ["Courbes de niveau", "Contour lines", "Höhenlinien", "Curvas de nivel"],
    ["Sommets et labels", "Peaks and labels", "Gipfel und Beschriftungen", "Cumbres y etiquetas"],
    ["Libellés des sommets :", "Peak labels:", "Gipfelbeschriftungen:", "Etiquetas de cumbres:"],
    ["Villes et agglomérations", "Cities and urban areas", "Städte und Ballungsräume", "Ciudades y aglomeraciones"],
    ["Villes en symboles OACI", "Cities as ICAO symbols", "Städte als ICAO-Symbole", "Ciudades con símbolos OACI"],
    ["hab.", "inhab.", "Einw.", "hab."],
    ["Grande ville (≥ 100 000 hab.) tache orange, ville (≥ 20 000) jaune cerclée d’orange, localité point jaune.",
      "Large city (≥ 100,000 inhab.) orange patch, town (≥ 20,000) yellow ringed in orange, village yellow dot.",
      "Großstadt (≥ 100 000 Einw.) orange Fläche, Stadt (≥ 20 000) gelb mit orangem Rand, Ortschaft gelber Punkt.",
      "Gran ciudad (≥ 100 000 hab.) mancha naranja, ciudad (≥ 20 000) amarilla con borde naranja, localidad punto amarillo."
    ],
    ["Libellés de villes", "City labels", "Städtenamen", "Nombres de ciudades"],
    ["Surfaces bâties", "Built-up areas", "Bebaute Flächen", "Zonas edificadas"],
    ["aucune", "none", "keine", "ninguna"],
    ["contour", "outline", "Umriss", "contorno"],
    ["remplissage", "fill", "Füllung", "relleno"],
    ["contour + remplissage", "outline + fill", "Umriss + Füllung", "contorno + relleno"],
    ["villes ≥", "cities ≥", "Städte ≥", "ciudades ≥"],
    ["Contour orange (villes ≥ 100 000 hab.) ou jaune (autres), remplissage jaune (OACI) : surfaces bâties OpenMapTiles (OSM) autour des villes assez peuplées ; les fichiers du SIA ne donnent pas de contour d’agglomération.",
      "Orange outline (cities ≥ 100,000 inhab.) or yellow (others), yellow fill (ICAO): OpenMapTiles (OSM) built-up areas around sufficiently populated cities; SIA files give no urban-area outlines.",
      "Oranger Umriss (Städte ≥ 100 000 Einw.) oder gelb (andere), gelbe Füllung (ICAO): bebaute Flächen aus OpenMapTiles (OSM) um ausreichend große Städte; die SIA-Dateien enthalten keine Ortsumrisse.",
      "Contorno naranja (ciudades ≥ 100 000 hab.) o amarillo (otras), relleno amarillo (OACI): zonas edificadas OpenMapTiles (OSM) alrededor de ciudades suficientemente pobladas; los archivos del SIA no dan contornos de aglomeración."
    ],
    ["Profils communs à toutes les missions et mémorisés dans le navigateur. Fond topographique :",
      "Profiles shared by all missions and stored in the browser. Topographic background:",
      "Profile für alle Missionen, im Browser gespeichert. Topografischer Hintergrund:",
      "Perfiles comunes a todas las misiones y guardados en el navegador. Fondo topográfico:"
    ],
    ["(OSM + SRTM). Sommets : données OSM interrogées par", "(OSM + SRTM). Peaks: OSM data queried through",
      "(OSM + SRTM). Gipfel: OSM-Daten abgefragt über", "(OSM + SRTM). Cumbres: datos OSM consultados mediante"
    ],
    ["Couleur des sommets", "Peak colour", "Gipfelfarbe", "Color de las cumbres"],
    // ---- zones
    ["toutes", "all", "alle", "todas"],
    ["tous", "all", "alle", "todos"],
    ["Tous", "All", "Alle", "Todos"],
    ["R — réglementées", "R — restricted", "R — Flugbeschränkungsgebiete", "R — restringidas"],
    ["D — dangereuses", "D — danger", "D — Gefahrengebiete", "D — peligrosas"],
    ["P — interdites", "P — prohibited", "P — Sperrgebiete", "P — prohibidas"],
    ["Contrôlés", "Controlled", "Kontrolliert", "Controlados"],
    ["Autres", "Others", "Andere", "Otros"],
    ["PJE — parachutage", "PJE — parachuting", "PJE — Fallschirmsprung", "PJE — paracaidismo"],
    ["Symbologie des cartes OACI", "ICAO chart symbology", "ICAO-Kartensymbolik", "Simbología de cartas OACI"],
    ["— classes (A rouge, B/C/D bleu, E bleu clair), hachures R / D / P, RTBA, croix des petites zones, cartouches plafond / plancher",
      "— classes (A red, B/C/D blue, E light blue), R / D / P hatching, RTBA, crosses for small zones, ceiling / floor labels",
      "— Klassen (A rot, B/C/D blau, E hellblau), Schraffur R / D / P, RTBA, Kreuze kleiner Gebiete, Ober-/Untergrenzen",
      "— clases (A rojo, B/C/D azul, E azul claro), sombreado R / D / P, RTBA, cruces de zonas pequeñas, rótulos techo / suelo"
    ],
    ["Tranche affichée (ft)", "Displayed band (ft)", "Angezeigtes Höhenband (ft)", "Franja mostrada (ft)"],
    ["Zones et espaces dont les limites recoupent la tranche (FL × 100 ; ASFC compté comme une altitude).",
      "Airspaces whose limits overlap the band (FL × 100; ASFC counted as an altitude).",
      "Lufträume, deren Grenzen das Band schneiden (FL × 100; ASFC als Höhe gezählt).",
      "Espacios cuyos límites cortan la franja (FL × 100; ASFC contado como altitud)."
    ],
    ["plancher : SFC", "floor: SFC", "Untergrenze: SFC", "suelo: SFC"],
    ["plafond : UNL", "ceiling: UNL", "Obergrenze: UNL", "techo: UNL"],
    ["Libellés des espaces :", "Airspace labels:", "Luftraumbeschriftungen:", "Etiquetas de espacios:"],
    ["Libellés des espaces", "Airspace labels", "Luftraumbeschriftungen", "Etiquetas de espacios"],
    ["Noms abrégés (nom seul, sans le type de zone)", "Short names (name only, without airspace type)",
      "Kurznamen (nur Name, ohne Luftraumart)", "Nombres abreviados (solo nombre, sin tipo de zona)"
    ],
    ["Afficher les altitudes (plafond / plancher)", "Show altitudes (ceiling / floor)", "Höhen anzeigen (Ober-/Untergrenze)",
      "Mostrar altitudes (techo / suelo)"
    ],
    ["Opacité des espaces :", "Airspace opacity:", "Luftraumdeckkraft:", "Opacidad de los espacios:"],
    ["Croix rouge pour les zones trop petites à l’échelle (style OACI)", "Red cross for zones too small at this scale (ICAO style)",
      "Rotes Kreuz für in diesem Maßstab zu kleine Gebiete (ICAO-Stil)",
      "Cruz roja para zonas demasiado pequeñas a esta escala (estilo OACI)"
    ],
    ["Zones, aérodromes et balises limités au territoire de la mission (outre-mer exclu d’une mission en métropole).",
      "Airspaces, aerodromes and navaids limited to the mission territory (overseas excluded from a mainland mission).",
      "Lufträume, Flugplätze und Funkfeuer auf das Missionsgebiet begrenzt (Überseegebiete bei einer Mission im Mutterland ausgeschlossen).",
      "Espacios, aeródromos y radioayudas limitados al territorio de la misión (ultramar excluido de una misión metropolitana)."
    ],
    ["Sélection des zones", "Airspace selection", "Luftraumauswahl", "Selección de espacios"],
    ["Liste blanche", "Whitelist", "Positivliste", "Lista blanca"],
    ["Liste noire", "Blacklist", "Negativliste", "Lista negra"],
    ["Liste vide : toutes les zones des familles cochées.", "Empty list: all airspaces of the ticked families.",
      "Leere Liste: alle Lufträume der angehakten Familien.", "Lista vacía: todos los espacios de las familias marcadas."
    ],
    ["Coller une liste…", "Paste a list…", "Liste einfügen…", "Pegar una lista…"],
    ["Tout supprimer", "Remove all", "Alle entfernen", "Eliminar todo"],
    ["Une zone par ligne", "One airspace per line", "Ein Luftraum pro Zeile", "Un espacio por línea"],
    ["Ajouter les lignes", "Add the lines", "Zeilen hinzufügen", "Añadir las líneas"],
    ["Alias (groupes nommés, communs à tous les profils)", "Aliases (named groups, shared by all profiles)",
      "Aliasse (benannte Gruppen, für alle Profile)", "Alias (grupos con nombre, comunes a todos los perfiles)"
    ],
    ["Créer", "Create", "Erstellen", "Crear"],
    ["Une zone par ligne (mêmes formes que ci-dessus). L’alias RTBA est proposé d’après la base SIA (zones publiées sur les cartes AZBA) ; il reste modifiable.",
      "One airspace per line (same forms as above). The RTBA alias is suggested from the SIA database (zones published on the AZBA charts); it remains editable.",
      "Ein Luftraum pro Zeile (gleiche Formen wie oben). Der Alias RTBA wird aus der SIA-Datenbank vorgeschlagen (auf den AZBA-Karten veröffentlichte Gebiete); er bleibt bearbeitbar.",
      "Un espacio por línea (mismas formas que arriba). El alias RTBA se propone a partir de la base SIA (zonas publicadas en las cartas AZBA); sigue siendo editable."
    ],
    ["Zones retenues : 0 (base SIA non chargée)", "Selected airspaces: 0 (SIA database not loaded)",
      "Ausgewählte Lufträume: 0 (SIA-Datenbank nicht geladen)", "Espacios seleccionados: 0 (base SIA no cargada)"
    ],
    ["Mode d’emploi", "How to use", "Anleitung", "Modo de empleo"],
    ["coche les familles voulues, puis ajoute des zones (complétion sur les noms de la base). Liste blanche : seules les zones de la liste sont tracées (liste vide : toutes les zones des familles cochées). Liste noire : toutes sauf celles de la liste. Espaces, tirets et accents sont ignorés ; un fragment (« R 45 ») retient toutes les zones qui le contiennent. La liste indique les zones à tracer, pas leur activation NOTAM.",
      "tick the families you want, then add airspaces (completion on the database names). Whitelist: only the listed airspaces are drawn (empty list: all airspaces of the ticked families). Blacklist: all except those in the list. Spaces, dashes and accents are ignored; a fragment (“R 45”) keeps every airspace containing it. The list says which airspaces to draw, not their NOTAM activation.",
      "gewünschte Familien anhaken, dann Lufträume hinzufügen (Vervollständigung aus den Namen der Datenbank). Positivliste: nur die gelisteten Lufträume werden gezeichnet (leere Liste: alle Lufträume der angehakten Familien). Negativliste: alle außer den gelisteten. Leerzeichen, Bindestriche und Akzente werden ignoriert; ein Fragment („R 45“) behält alle Lufträume, die es enthalten. Die Liste gibt die zu zeichnenden Lufträume an, nicht ihre NOTAM-Aktivierung.",
      "marque las familias deseadas y añada espacios (autocompletado con los nombres de la base). Lista blanca: solo se trazan los espacios de la lista (lista vacía: todos los de las familias marcadas). Lista negra: todos salvo los de la lista. Se ignoran espacios, guiones y acentos; un fragmento («R 45») conserva todos los espacios que lo contienen. La lista indica qué espacios trazar, no su activación por NOTAM."
    ],
    ["Couleur des libellés (style simple)", "Label colour (simple style)", "Beschriftungsfarbe (einfacher Stil)",
      "Color de las etiquetas (estilo simple)"
    ],
    ["Changer le mode de sélection", "Change the selection mode", "Auswahlmodus wechseln", "Cambiar el modo de selección"],
    ["Nom du nouvel alias (ex. SECTEUR EST)", "Name of the new alias (e.g. EAST SECTOR)", "Name des neuen Alias (z. B. SEKTOR OST)",
      "Nombre del nuevo alias (p. ej. SECTOR ESTE)"
    ],
    ["Vider la liste", "Clear the list", "Liste leeren", "Vaciar la lista"],
    ["R 45 A, R 166 (toutes), @RTBA, PARIS…", "R 45 A, R 166 (all), @RTBA, PARIS…", "R 45 A, R 166 (alle), @RTBA, PARIS…",
      "R 45 A, R 166 (todas), @RTBA, PARIS…"
    ],
    // ---- symboles OACI
    ["Aérodromes", "Aerodromes", "Flugplätze", "Aeródromos"],
    ["Libellés (OACI)", "Labels (ICAO)", "Beschriftungen (ICAO)", "Etiquetas (OACI)"],
    ["Civils ouverts à la CAP", "Civil, open to public air traffic", "Zivil, für öffentlichen Luftverkehr",
      "Civiles abiertos a la aviación pública"
    ],
    ["Restreints / agréés", "Restricted / approved", "Beschränkt / zugelassen", "Restringidos / autorizados"],
    ["État / militaires", "State / military", "Staatlich / militärisch", "Estado / militares"],
    ["Hélistations", "Heliports", "Hubschrauberlandeplätze", "Helipuertos"],
    ["Bandes, ULM", "Strips, microlights", "Pisten, UL", "Pistas, ULM"],
    ["Contrôle", "Control", "Kontrolle", "Control"],
    ["Contrôlés (TWR)", "Controlled (TWR)", "Kontrolliert (TWR)", "Controlados (TWR)"],
    ["Non contrôlés", "Uncontrolled", "Unkontrolliert", "No controlados"],
    ["Liste vide : tous (catégories cochées).", "Empty list: all (ticked categories).", "Leere Liste: alle (angehakte Kategorien).",
      "Lista vacía: todos (categorías marcadas)."
    ],
    ["Symboles de la carte : piste en dur > 2300 m (orientée), 1000–2300 m, < 1000 m, bande, hélistation ; ouvert à la CAP (bleu plein), restreint (clair), État (rouge).",
      "Chart symbols: hard runway > 2300 m (oriented), 1000–2300 m, < 1000 m, strip, heliport; open to public traffic (solid blue), restricted (light), State (red).",
      "Kartensymbole: befestigte Piste > 2300 m (ausgerichtet), 1000–2300 m, < 1000 m, Graspiste, Hubschrauberlandeplatz; öffentlich (blau gefüllt), beschränkt (hell), staatlich (rot).",
      "Símbolos del mapa: pista pavimentada > 2300 m (orientada), 1000–2300 m, < 1000 m, pista, helipuerto; abierto a la aviación pública (azul lleno), restringido (claro), Estado (rojo)."
    ],
    ["Radionavigation", "Radio navigation", "Funknavigation", "Radionavegación"],
    ["Libellés (indicatif, fréquence)", "Labels (ident, frequency)", "Beschriftungen (Kennung, Frequenz)",
      "Etiquetas (indicativo, frecuencia)"
    ],
    ["Rose des VOR : ×", "VOR rose: ×", "VOR-Rose: ×", "Rosa de los VOR: ×"],
    ["VOR, VOR-DME, VOR-TACAN, TACAN, DME, NDB ; cartouche indicatif / fréquence, rose au nord magnétique en vue détaillée.",
      "VOR, VOR-DME, VOR-TACAN, TACAN, DME, NDB; ident / frequency box, magnetic-north rose in detailed view.",
      "VOR, VOR-DME, VOR-TACAN, TACAN, DME, NDB; Kennung / Frequenz, Rose nach missweisend Nord in der Detailansicht.",
      "VOR, VOR-DME, VOR-TACAN, TACAN, DME, NDB; rótulo indicativo / frecuencia, rosa al norte magnético en vista detallada."
    ],
    ["0 = sans rose", "0 = no rose", "0 = keine Rose", "0 = sin rosa"],
    ["Indicatif : CX, AVD, LFOJ…", "Ident: CX, AVD, LFOJ…", "Kennung: CX, AVD, LFOJ…", "Indicativo: CX, AVD, LFOJ…"],
    ["Survol interdit", "No overflight", "Überflugverbot", "Sobrevuelo prohibido"],
    ["Installations portant une marque distinctive — survol interdit au-dessous de 1000 m (3300 ft) ; contour et symbole ⊗ rouges, symboles non superposés (AIXM : SUR).",
      "Sites bearing a distinctive mark — no overflight below 1000 m (3300 ft); red outline and ⊗ symbol, non-overlapping symbols (AIXM: SUR).",
      "Anlagen mit besonderer Kennzeichnung — Überflugverbot unter 1000 m (3300 ft); roter Umriss und Symbol ⊗, nicht überlappende Symbole (AIXM: SUR).",
      "Instalaciones con marca distintiva — sobrevuelo prohibido por debajo de 1000 m (3300 ft); contorno y símbolo ⊗ rojos, símbolos sin superposición (AIXM: SUR)."
    ],
    ["Parcs et réserves naturels", "Nature parks and reserves", "Naturparks und -schutzgebiete", "Parques y reservas naturales"],
    ["Survol réglementé : contour vert, ou symbole vert quand l’AIXM ne donne qu’un point.",
      "Regulated overflight: green outline, or green symbol when the AIXM gives only a point.",
      "Geregelter Überflug: grüner Umriss oder grünes Symbol, wenn die AIXM nur einen Punkt angibt.",
      "Sobrevuelo regulado: contorno verde, o símbolo verde cuando el AIXM solo da un punto."
    ],
    ["Obstacles (AIXM SIA)", "Obstacles (SIA AIXM)", "Hindernisse (SIA-AIXM)", "Obstáculos (AIXM SIA)"],
    ["Hauteur minimale", "Minimum height", "Mindesthöhe", "Altura mínima"],
    ["≥ 300 ft AGL (carte 1 : 500 000)", "≥ 300 ft AGL (1:500,000 chart)", "≥ 300 ft AGL (Karte 1:500 000)",
      "≥ 300 ft AGL (carta 1:500 000)"
    ],
    ["≥ 500 ft AGL (élevés)", "≥ 500 ft AGL (high)", "≥ 500 ft AGL (hoch)", "≥ 500 ft AGL (elevados)"],
    ["Balisés de nuit, groupes, éoliennes ; cote AMSL et (hauteur) en vue détaillée ; en vue générale, obstacles élevés seulement.",
      "Night-lit, groups, wind turbines; AMSL elevation and (height) in detailed view; in general view, high obstacles only.",
      "Nachtkennzeichnung, Gruppen, Windräder; Höhe AMSL und (Höhe über Grund) in der Detailansicht; in der Übersicht nur hohe Hindernisse.",
      "Balizados de noche, grupos, aerogeneradores; cota AMSL y (altura) en vista detallada; en vista general, solo obstáculos elevados."
    ],
    // ---- éléments
    ["Points tournants", "Turning points", "Wendepunkte", "Puntos de viraje"],
    ["Libellés :", "Labels:", "Beschriftungen:", "Etiquetas:"],
    ["Taille des points :", "Point size:", "Punktgröße:", "Tamaño de los puntos:"],
    ["Méridiens et parallèles", "Meridians and parallels", "Meridiane und Breitenkreise", "Meridianos y paralelos"],
    ["Libellés en bordure (degrés, minutes)", "Edge labels (degrees, minutes)", "Randbeschriftung (Grad, Minuten)",
      "Etiquetas en el borde (grados, minutos)"
    ],
    ["Grille MORA", "MORA grid", "MORA-Gitter", "Cuadrícula MORA"],
    ["Valeurs :", "Values:", "Werte:", "Valores:"],
    ["Opacité :", "Opacity:", "Deckkraft:", "Opacidad:"],
    ["Espacement minimal :", "Minimum spacing:", "Mindestabstand:", "Espaciado mínimo:"],
    ["Libellés des villes", "City labels", "Städtenamen", "Nombres de ciudades"],
    ["Villes :", "Cities:", "Städte:", "Ciudades:"],
    ["Hippodrome de ravitaillement (ENR 5.7)", "Refuelling track (ENR 5.7)", "Betankungs-Racetrack (ENR 5.7)",
      "Circuito de reabastecimiento (ENR 5.7)"
    ],
    ["Aucun hippodrome", "No track", "Kein Racetrack", "Ningún circuito"],
    ["Automatique (aucun axe détecté)", "Automatic (no track detected)", "Automatisch (kein Racetrack erkannt)",
      "Automático (ningún circuito detectado)"
    ],
    ["Aucun axe à proximité des points de la mission.", "No track near the mission points.",
      "Kein Racetrack in der Nähe der Missionspunkte.", "Ningún circuito cerca de los puntos de la misión."
    ],
    ["Cercle de la zone de mission", "Mission area circle", "Kreis des Missionsgebiets", "Círculo de la zona de misión"],
    ["Zones de mission et de recherche", "Mission and search areas", "Einsatz- und Suchgebiete", "Zonas de misión y de búsqueda"],
    ["Tailles en points : elles suivent la dimension de sortie, quel que soit le zoom géographique (7 pt minimum).",
      "Sizes in points: they follow the output size, whatever the geographic zoom (7 pt minimum).",
      "Größen in Punkt: sie folgen der Ausgabegröße, unabhängig vom geografischen Zoom (mindestens 7 pt).",
      "Tamaños en puntos: siguen la dimensión de salida, sea cual sea el zoom geográfico (7 pt mínimo)."
    ],
    ["Couleur des points", "Point colour", "Punktfarbe", "Color de los puntos"],
    ["Couleur du quadrillage", "Grid colour", "Gitterfarbe", "Color de la cuadrícula"],
    ["Couleur des valeurs MORA", "MORA value colour", "Farbe der MORA-Werte", "Color de los valores MORA"],
    ["En dessous, les cellules sont fusionnées par 2 × 2 (valeur la plus haute), puis 4 × 4…",
      "Below that, cells are merged 2 × 2 (highest value), then 4 × 4…",
      "Darunter werden Zellen 2 × 2 zusammengefasst (höchster Wert), dann 4 × 4…",
      "Por debajo, las celdas se fusionan de 2 × 2 (valor más alto), luego 4 × 4…"
    ],
    ["Couleur des villes", "City colour", "Städtefarbe", "Color de las ciudades"],
    // ---- aperçu, cartes, profils
    ["Reprendre le cadre", "Take the frame", "Rahmen übernehmen", "Tomar el encuadre"],
    ["Rétablir", "Reset", "Zurücksetzen", "Restablecer"],
    ["Appliquer", "Apply", "Anwenden", "Aplicar"],
    ["Aucune carte : ajoute-en une ci-dessous.", "No map: add one below.", "Keine Karte: unten eine hinzufügen.",
      "Ningún mapa: añada uno abajo."
    ],
    ["générale", "general", "Übersicht", "general"],
    ["cible", "target", "Ziel", "objetivo"],
    ["détail", "detail", "Detail", "detalle"],
    ["+ Carte", "+ Map", "+ Karte", "+ Mapa"],
    ["Profil de la carte choisie", "Profile of the selected map", "Profil der gewählten Karte", "Perfil del mapa elegido"],
    ["Profil", "Profile", "Profil", "Perfil"],
    ["VFR détaillé", "VFR detailed", "VFR detailliert", "VFR detallado"],
    ["VFR simplifié", "VFR simplified", "VFR vereinfacht", "VFR simplificado"],
    ["Profil vertical", "Vertical profile", "Vertikalprofil", "Perfil vertical"],
    ["Nom du profil", "Profile name", "Profilname", "Nombre del perfil"],
    ["Fond local PNG", "Local PNG background", "Lokaler PNG-Hintergrund", "Fondo local PNG"],
    ["OSM standard", "OSM standard", "OSM Standard", "OSM estándar"],
    ["OpenTopoMap — relief et courbes", "OpenTopoMap — terrain and contours", "OpenTopoMap — Relief und Höhenlinien",
      "OpenTopoMap — relieve y curvas"
    ],
    ["OSM Shortbread — couches réglables", "OSM Shortbread — adjustable layers", "OSM Shortbread — einstellbare Ebenen",
      "OSM Shortbread — capas ajustables"
    ],
    ["OpenFreeMap Positron (clair)", "OpenFreeMap Positron (light)", "OpenFreeMap Positron (hell)", "OpenFreeMap Positron (claro)"],
    ["VersaTiles Graybeard (gris)", "VersaTiles Graybeard (grey)", "VersaTiles Graybeard (grau)", "VersaTiles Graybeard (gris)"],
    ["VersaTiles Shadow (gris neutre)", "VersaTiles Shadow (neutral grey)", "VersaTiles Shadow (neutralgrau)",
      "VersaTiles Shadow (gris neutro)"
    ],
    ["VersaTiles Eclipse (sombre)", "VersaTiles Eclipse (dark)", "VersaTiles Eclipse (dunkel)", "VersaTiles Eclipse (oscuro)"],
    ["Sauvegarder", "Save", "Speichern", "Guardar"],
    ["Nouveau", "New", "Neu", "Nuevo"],
    ["Dupliquer", "Duplicate", "Duplizieren", "Duplicar"],
    ["Supprimer", "Delete", "Löschen", "Eliminar"],
    ["Second théâtre", "Second theatre", "Zweites Einsatzgebiet", "Segundo teatro"],
    ["Facultatif : second théâtre relié par la mission (acheminement, relève, évacuation…)",
      "Optional: second theatre linked by the mission (transfer, relief, evacuation…)",
      "Optional: zweites, durch die Mission verbundenes Einsatzgebiet (Überführung, Ablösung, Evakuierung…)",
      "Opcional: segundo teatro unido por la misión (traslado, relevo, evacuación…)"
    ],
    ["Créer une mission avec ChatGPT", "Create a mission with ChatGPT", "Mission mit ChatGPT erstellen",
      "Crear una misión con ChatGPT"
    ],
    ["Théâtre", "Theatre", "Einsatzgebiet", "Teatro"],
    ["Aléatoire", "Random", "Zufällig", "Aleatorio"],
    ["Métropole", "Mainland France", "Frankreich (Festland)", "Francia metropolitana"],
    ["Série", "Series", "Serie", "Serie"],
    ["Équipes en vol", "Flight crews", "Flugbesatzungen", "Tripulaciones en vuelo"],
    ["Aéronefs en vol ; les équipes sol (VSAV, CROSS, commandement…) s’ajoutent selon la mission",
      "Aircraft in flight; ground teams (fire rescue, CROSS, command…) are added as the mission requires",
      "Luftfahrzeuge im Flug; Bodenteams (Rettungsdienst, CROSS, Führung…) kommen je nach Mission hinzu",
      "Aeronaves en vuelo; los equipos de tierra (bomberos, CROSS, mando…) se añaden según la misión"
    ],
    ["Le prompt (une mission) est copié, puis ChatGPT s’ouvre dans un nouvel onglet : coller et envoyer. Les équipes sol s’ajoutent selon la mission.",
      "The prompt (one mission) is copied, then ChatGPT opens in a new tab: paste and send. Ground teams are added as the mission requires.",
      "Der Prompt (eine Mission) wird kopiert, dann öffnet sich ChatGPT in einem neuen Tab: einfügen und senden. Bodenteams kommen je nach Mission hinzu.",
      "El prompt (una misión) se copia y ChatGPT se abre en una pestaña nueva: pegar y enviar. Los equipos de tierra se añaden según la misión."
    ],
    ["Mettre cette carte dans le ZIP (décocher pour ne pas la générer)", "Put this map in the ZIP (uncheck to skip it)",
      "Diese Karte ins ZIP aufnehmen (abwählen, um sie auszulassen)", "Incluir este mapa en el ZIP (desmarcar para omitirlo)"
    ],
    ["Carte choisie, dessinée avec le profil en cours de modification ; actualisée à chaque réglage.",
      "Selected map, drawn with the profile being edited; refreshed on every setting.",
      "Gewählte Karte, mit dem bearbeiteten Profil gezeichnet; bei jeder Einstellung aktualisiert.",
      "Mapa elegido, dibujado con el perfil en edición; actualizado con cada ajuste."
    ],
    ["Glisser pour redimensionner (double-clic : 60 / 40)", "Drag to resize (double-click: 60 / 40)",
      "Ziehen zum Ändern der Größe (Doppelklick: 60 / 40)", "Arrastrar para redimensionar (doble clic: 60 / 40)"
    ],
    ["Prendre comme emprise le cadre affiché (zoomé / déplacé à la souris)",
      "Use the displayed frame as extent (zoomed / moved with the mouse)",
      "Angezeigten Ausschnitt als Ausdehnung übernehmen (mit der Maus gezoomt / verschoben)",
      "Tomar como extensión el encuadre mostrado (zoom / desplazamiento con el ratón)"
    ],
    ["Revenir à la position définie (mission ou emprise modifiée)", "Back to the defined position (mission or edited extent)",
      "Zurück zur festgelegten Position (Mission oder geänderte Ausdehnung)",
      "Volver a la posición definida (misión o extensión modificada)"
    ],
    ["Revenir à l’emprise de la mission", "Back to the mission extent", "Zurück zur Ausdehnung der Mission",
      "Volver a la extensión de la misión"
    ],
    ["Écrire cette emprise dans la mission partagée (générateur, export YAML / Markdown)",
      "Write this extent into the shared mission (generator, YAML / Markdown export)",
      "Diese Ausdehnung in die gemeinsame Mission schreiben (Generator, YAML-/Markdown-Export)",
      "Escribir esta extensión en la misión compartida (generador, exportación YAML / Markdown)"
    ],
    ["Ouvrir la carte dans une fenêtre séparée, synchronisée avec les réglages",
      "Open the map in a separate window, synchronised with the settings",
      "Karte in einem separaten, mit den Einstellungen synchronisierten Fenster öffnen",
      "Abrir el mapa en una ventana aparte, sincronizada con los ajustes"
    ],
    ["Agrandir la carte (Échap pour revenir)", "Enlarge the map (Esc to return)", "Karte vergrößern (Esc zum Zurückkehren)",
      "Ampliar el mapa (Esc para volver)"
    ],
    ["Ajouter une carte à la mission (emprise : vue affichée)", "Add a map to the mission (extent: displayed view)",
      "Karte zur Mission hinzufügen (Ausdehnung: angezeigte Ansicht)", "Añadir un mapa a la misión (extensión: vista mostrada)"
    ],
    // ---- profil vertical
    ["Cheminement", "Route", "Route", "Ruta"],
    ["Points du brief (id ou nom), aérodromes (OACI), balises, points RNAV, « REN300010 » (radiale / distance) ou « lat lon » ; « /3000 » ou « /FL65 » : altitude à atteindre au point ; « N0450F350 » : niveau de croisière (groupe vitesse / niveau) ; « FL105 » ou « 5500 ft » seul sur une ligne : montée ou descente vers ce niveau après le point précédent ; « VFR » : pas de niveau. La case 15 d’un plan de vol (séparée par des espaces) est acceptée.",
      "Brief points (id or name), aerodromes (ICAO), navaids, RNAV points, “REN300010” (radial / distance) or “lat lon”; “/3000” or “/FL65”: altitude to reach at the point; “N0450F350”: cruise level (speed / level group); “FL105” or “5500 ft” alone on a line: climb or descend to that level after the previous point; “VFR”: no level. Flight plan item 15 (space-separated) is accepted.",
      "Punkte des Briefings (ID oder Name), Flugplätze (ICAO), Funkfeuer, RNAV-Punkte, „REN300010“ (Radial / Entfernung) oder „lat lon“; „/3000“ oder „/FL65“: am Punkt zu erreichende Höhe; „N0450F350“: Reiseflughöhe (Geschwindigkeits-/Höhengruppe); „FL105“ oder „5500 ft“ allein in einer Zeile: Steig- oder Sinkflug auf diese Höhe nach dem vorigen Punkt; „VFR“: keine Flughöhe. Feld 15 eines Flugplans (durch Leerzeichen getrennt) wird akzeptiert.",
      "Puntos del briefing (id o nombre), aeródromos (OACI), radioayudas, puntos RNAV, «REN300010» (radial / distancia) o «lat lon»; «/3000» o «/FL65»: altitud a alcanzar en el punto; «N0450F350»: nivel de crucero (grupo velocidad / nivel); «FL105» o «5500 ft» solo en una línea: ascenso o descenso a ese nivel tras el punto anterior; «VFR»: sin nivel. Se acepta la casilla 15 de un plan de vuelo (separada por espacios)."
    ],
    ["Plancher de la coupe (ft)", "Section floor (ft)", "Schnitt-Untergrenze (ft)", "Suelo del corte (ft)"],
    ["Plafond de la coupe (ft, 0 = auto)", "Section ceiling (ft, 0 = auto)", "Schnitt-Obergrenze (ft, 0 = auto)",
      "Techo del corte (ft, 0 = auto)"
    ],
    ["Appareil (profils du planificateur)", "Aircraft (planner profiles)", "Flugzeug (Planerprofile)",
      "Avión (perfiles del planificador)"
    ],
    ["— taux ci-dessous —", "— rates below —", "— Raten unten —", "— regímenes abajo —"],
    ["Montée (ft/min · kt)", "Climb (ft/min · kt)", "Steigflug (ft/min · kt)", "Ascenso (ft/min · kt)"],
    ["Descente (ft/min · kt)", "Descent (ft/min · kt)", "Sinkflug (ft/min · kt)", "Descenso (ft/min · kt)"],
    ["Image", "Image", "Bild", "Imagen"],
    ["dans les sorties", "in the outputs", "in den Ausgaben", "en las salidas"],
    ["Tracer le cheminement sur les cartes", "Draw the route on the maps", "Route auf den Karten zeichnen",
      "Trazar la ruta en los mapas"
    ],
    ["Tracer le profil", "Draw the profile", "Profil zeichnen", "Trazar el perfil"],
    ["Relief (tuiles d’altitude, ± 1 km) ; espaces et obstacles (à moins de 1 NM) selon le profil d’affichage de",
      "Terrain (elevation tiles, ± 1 km); airspaces and obstacles (within 1 NM) according to the display profile of",
      "Gelände (Höhenkacheln, ± 1 km); Lufträume und Hindernisse (innerhalb 1 NM) nach dem Anzeigeprofil von",
      "Relieve (teselas de altitud, ± 1 km); espacios y obstáculos (a menos de 1 NM) según el perfil de visualización de"
    ],
    ["(liste des cartes).", "(map list).", "(Kartenliste).", "(lista de mapas)."],
    ["Points de la mission (clic : ajouter au cheminement) :", "Mission points (click: add to the route):",
      "Punkte der Mission (Klick: zur Route hinzufügen):", "Puntos de la misión (clic: añadir a la ruta):"
    ],
    ["Trajectoire non tracée : ni niveau de croisière, ni altitude dans le cheminement (« /3000 », « /FL65 » ou « N0450F350 »).",
      "Trajectory not drawn: no cruise level and no altitude in the route (“/3000”, “/FL65” or “N0450F350”).",
      "Flugbahn nicht gezeichnet: weder Reiseflughöhe noch Höhe in der Route („/3000“, „/FL65“ oder „N0450F350“).",
      "Trayectoria no dibujada: ni nivel de crucero ni altitud en la ruta («/3000», «/FL65» o «N0450F350»)."
    ],
    ["Niveau de croisière (FL65 ou 6500)", "Cruise level (FL65 or 6500)", "Reiseflughöhe (FL65 oder 6500)",
      "Nivel de crucero (FL65 o 6500)"
    ],
    ["Vide : origine, points tournants et destination de la mission. Ex. : LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT",
      "Empty: mission origin, turning points and destination. E.g.: LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT",
      "Leer: Start, Wendepunkte und Ziel der Mission. Bsp.: LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT",
      "Vacío: origen, puntos de viraje y destino de la misión. Ej.: LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT"
    ],
    ["Vide : points tournants de la mission dans l’ordre. Ex. : LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT",
      "Empty: mission turning points in order. E.g.: LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT",
      "Leer: Wendepunkte der Mission der Reihe nach. Bsp.: LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT",
      "Vacío: puntos de viraje de la misión en orden. Ej.: LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT"
    ],
    // ---- cartes, base SIA, données complémentaires
    ["3. Cartes", "3. Maps", "3. Karten", "3. Mapas"],
    ["Les aperçus ne créent aucun fichier.", "Previews create no file.", "Vorschauen erzeugen keine Datei.",
      "Las vistas previas no crean ningún archivo."
    ],
    ["Carte d’assemblage", "Index map", "Übersichtskarte", "Mapa de conjunto"],
    ["Elle s’affichera automatiquement dès que le fond et la mission seront disponibles.",
      "It will show automatically as soon as the background and the mission are available.",
      "Sie wird automatisch angezeigt, sobald Hintergrund und Mission verfügbar sind.",
      "Se mostrará automáticamente en cuanto el fondo y la misión estén disponibles."
    ],
    ["4. Base de données SIA", "4. SIA database", "4. SIA-Datenbank", "4. Base de datos SIA"],
    ["Dossier SIA XML : …", "SIA XML folder: …", "SIA-XML-Ordner: …", "Carpeta SIA XML: …"],
    ["Relire le dossier", "Re-read the folder", "Ordner neu lesen", "Releer la carpeta"],
    ["Choisir le dossier SIA XML", "Choose the SIA XML folder", "SIA-XML-Ordner wählen", "Elegir la carpeta SIA XML"],
    ["Le dossier choisi est mémorisé (comme les autres dossiers de la suite) : « Relire le dossier » après une mise à jour AIRAC. La page recherche automatiquement le fond",
      "The chosen folder is remembered (like the suite’s other folders): “Re-read the folder” after an AIRAC update. The page automatically looks for the background",
      "Der gewählte Ordner wird gespeichert (wie die anderen Ordner der Suite): nach einem AIRAC-Update „Ordner neu lesen“. Die Seite sucht automatisch den Hintergrund",
      "La carpeta elegida se recuerda (como las demás carpetas de la suite): «Releer la carpeta» tras una actualización AIRAC. La página busca automáticamente el fondo"
    ],
    [", le catalogue de villes et analyse chaque fichier XML du dossier. Les données de mission restent séparées.",
      ", the city catalogue and analyses every XML file of the folder. Mission data stay separate.",
      ", den Städtekatalog und analysiert jede XML-Datei des Ordners. Missionsdaten bleiben getrennt.",
      ", el catálogo de ciudades y analiza cada archivo XML de la carpeta. Los datos de misión permanecen separados."
    ],
    ["Recharger la base mémorisée", "Reload the stored database", "Gespeicherte Datenbank neu laden", "Recargar la base guardada"],
    ["Aucun dossier mémorisé.", "No folder remembered.", "Kein Ordner gespeichert.", "Ninguna carpeta guardada."],
    ["Choisis le dossier de base ; aucun XML particulier n'est demandé.", "Choose the base folder; no specific XML is required.",
      "Basisordner wählen; keine bestimmte XML-Datei erforderlich.", "Elija la carpeta base; no se requiere ningún XML concreto."
    ],
    ["5. Données complémentaires", "5. Additional data", "5. Ergänzende Daten", "5. Datos complementarios"],
    ["Catalogue et grille MORA", "Catalogue and MORA grid", "Katalog und MORA-Gitter", "Catálogo y cuadrícula MORA"],
    ["Calculer la grille MORA", "Compute the MORA grid", "MORA-Gitter berechnen", "Calcular la cuadrícula MORA"],
    ["Grille de 1° × 1° : point le plus haut (relief, sommets OSM, obstacles de l’AIXM SIA) + 1000 ft (2000 ft au-delà de 5000 ft). Valeurs calculées, non certifiées.",
      "1° × 1° grid: highest point (terrain, OSM peaks, SIA AIXM obstacles) + 1000 ft (2000 ft above 5000 ft). Computed values, not certified.",
      "Gitter 1° × 1°: höchster Punkt (Gelände, OSM-Gipfel, SIA-AIXM-Hindernisse) + 1000 ft (2000 ft über 5000 ft). Berechnete, nicht zertifizierte Werte.",
      "Cuadrícula de 1° × 1°: punto más alto (relieve, cumbres OSM, obstáculos del AIXM SIA) + 1000 ft (2000 ft por encima de 5000 ft). Valores calculados, no certificados."
    ],
    ["MORA publiée :", "Published MORA:", "Veröffentlichte MORA:", "MORA publicada:"],
    ["SIA eAIP, cartes ENR 6", "SIA eAIP, ENR 6 charts", "SIA eAIP, ENR-6-Karten", "SIA eAIP, cartas ENR 6"],
    ["Terrain de calcul possible :", "Possible computation terrain:", "Mögliches Rechengelände:", "Terreno de cálculo posible:"],
    [". Le terrain seul ne constitue pas une MORA certifiée.", ". Terrain alone is not a certified MORA.",
      ". Das Gelände allein ist keine zertifizierte MORA.", ". El terreno por sí solo no constituye una MORA certificada."
    ],
    ["Ouest", "West", "West", "Oeste"],
    ["Sud", "South", "Süd", "Sur"],
    ["Est", "East", "Ost", "Este"],
    ["Nord", "North", "Nord", "Norte"],
    // ---- passe de traduction du 2 octobre 2026 (générateur, studio, cartes du vol)
    ["Enregistrer dans le dossier", "Save to the folder", "Im Ordner speichern", "Guardar en la carpeta"],
    ["Ranger dans le dossier des missions…", "File in the missions folder…", "Im Missionsordner ablegen…",
      "Archivar en la carpeta de misiones…"
    ],
    ["Équipes au sol", "Ground teams", "Bodenteams", "Equipos en tierra"],
    ["Durée", "Duration", "Dauer", "Duración"],
    ["Commander : copier le prompt et ouvrir ChatGPT", "Order: copy the prompt and open ChatGPT",
      "Bestellen: Prompt kopieren und ChatGPT öffnen", "Encargar: copiar el prompt y abrir ChatGPT"
    ],
    ["Durée estimée", "Estimated duration", "Geschätzte Dauer", "Duración estimada"],
    ["Route probable et durée du vol (aller, sur zone, retour), options de retour, comparaison avec les CR de la mission.",
      "Probable route and flight duration (outbound, on station, return), return options, comparison with the mission’s reports.",
      "Wahrscheinliche Route und Flugdauer (Hinflug, im Einsatzraum, Rückflug), Rückkehroptionen, Vergleich mit den Berichten der Mission.",
      "Ruta probable y duración del vuelo (ida, en zona, regreso), opciones de regreso, comparación con los informes de la misión."
    ],
    ["Paramètres du calcul des routes (communs à toutes les missions)", "Route calculation settings (common to all missions)",
      "Einstellungen der Routenberechnung (für alle Missionen)", "Parámetros del cálculo de rutas (comunes a todas las misiones)"
    ],
    ["Tronçon routé à partir de (NM)", "Routed leg from (NM)", "Geroutete Teilstrecke ab (NM)", "Tramo enrutado a partir de (NM)"],
    ["Voies aériennes à partir de (ft)", "Airways from (ft)", "Luftstraßen ab (ft)", "Aerovías a partir de (ft)"],
    ["Basse hauteur jusqu’à (ft)", "Low level up to (ft)", "Tiefflug bis (ft)", "Baja altura hasta (ft)"],
    ["Entrée / sortie des voies (NM)", "Airway entry / exit (NM)", "Ein- / Ausflug Luftstraßen (NM)",
      "Entrada / salida de aerovías (NM)"
    ],
    ["Entrée / sortie du RTBA (NM)", "RTBA entry / exit (NM)", "Ein- / Ausflug RTBA (NM)", "Entrada / salida de la RTBA (NM)"],
    ["Détour admis, voies (%)", "Allowed detour, airways (%)", "Zulässiger Umweg, Luftstraßen (%)", "Desvío admitido, aerovías (%)"],
    ["Détour admis, RTBA (%)", "Allowed detour, RTBA (%)", "Zulässiger Umweg, RTBA (%)", "Desvío admitido, RTBA (%)"],
    ["Valeurs par défaut", "Default values", "Standardwerte", "Valores por defecto"],
    ["Plan de vol, carte et coupe verticale liés : survol commun, points déplaçables sur la carte et dans la coupe.",
      "Flight plan, map and vertical section linked: common hover, points draggable on the map and in the section.",
      "Flugplan, Karte und Vertikalschnitt verknüpft: gemeinsames Überfahren, verschiebbare Punkte auf der Karte und im Schnitt.",
      "Plan de vuelo, mapa y corte vertical vinculados: paso común, puntos desplazables en el mapa y en el corte."
    ],
    ["Syntaxe et utilisation", "Syntax and use", "Syntax und Verwendung", "Sintaxis y uso"],
    ["Hautes (au-dessus du FL195)", "High (above FL195)", "Obere (über FL195)", "Altas (por encima del FL195)"],
    ["Réglages du profil : coupe, appareil, vario, sorties", "Profile settings: section, aircraft, climb rate, outputs",
      "Profileinstellungen: Schnitt, Luftfahrzeug, Steigrate, Ausgaben", "Ajustes del perfil: corte, aeronave, variómetro, salidas"
    ],
    ["Par défaut, tracer le cheminement sur les cartes (réglable carte par carte)",
      "By default, draw the routing on the maps (adjustable map by map)",
      "Standardmäßig den Streckenverlauf auf den Karten zeichnen (pro Karte einstellbar)",
      "Por defecto, trazar el recorrido en los mapas (ajustable mapa por mapa)"
    ],
    ["Cartes à produire", "Maps to produce", "Zu erstellende Karten", "Mapas que producir"],
    ["Purger le cache", "Purge the cache", "Cache leeren", "Vaciar la caché"],
    ["Choisir le dossier SIA…", "Choose the SIA folder…", "SIA-Ordner wählen…", "Elegir la carpeta SIA…"],
    ["Fichiers analysés", "Files analysed", "Analysierte Dateien", "Archivos analizados"],
    ["Cartes du vol", "Flight maps", "Flugkarten", "Mapas del vuelo"],
    ["Rendez-vous facultatif et cartes à produire d’après la route du bloc « Route ».",
      "Optional rendezvous and maps to produce from the route of the “Route” block.",
      "Optionaler Treffpunkt und zu erstellende Karten nach der Route des Blocks „Route“.",
      "Encuentro opcional y mapas que producir según la ruta del bloque «Ruta»."
    ],
    ["Créer les cartes", "Create the maps", "Karten erstellen", "Crear los mapas"],
    ["Générer les", "Generate the", "Erzeugen:", "Generar las"],
    ["Calibration du fond entier, WGS84.", "Whole-background calibration, WGS84.", "Kalibrierung des gesamten Hintergrunds, WGS84.",
      "Calibración del fondo completo, WGS84."
    ],
    ["Ouvrir le registre ↗", "Open the registry ↗", "Register öffnen ↗", "Abrir el registro ↗"],
    ["aléatoire", "random", "zufällig", "aleatorio"],
    ["feux de forêt / GAAR", "forest fires / GAAR", "Waldbrände / GAAR", "incendios forestales / GAAR"],
    ["recherche et sauvetage", "search and rescue", "Suche und Rettung", "búsqueda y salvamento"],
    ["transport aérien", "air transport", "Lufttransport", "transporte aéreo"],
    ["largage / aéroporté", "airdrop / airborne", "Absetzen / Luftlande", "lanzamiento / aerotransportado"],
    ["contrôle en vol", "flight inspection", "Flugvermessung", "inspección en vuelo"],
    ["levés / scientifique", "survey / scientific", "Vermessung / Wissenschaft", "levantamientos / científico"],
    ["police / douane", "police / customs", "Polizei / Zoll", "policía / aduanas"],
    ["combat aérien / chasse", "air combat / fighters", "Luftkampf / Jagd", "combate aéreo / caza"],
    ["opérations spéciales", "special operations", "Spezialoperationen", "operaciones especiales"],
    ["métropole", "mainland France", "französisches Festland", "Francia metropolitana"],
    ["Réunion", "Réunion", "Réunion", "Reunión"],
    ["Nouvelle-Calédonie", "New Caledonia", "Neukaledonien", "Nueva Caledonia"],
    ["Polynésie", "French Polynesia", "Französisch-Polynesien", "Polinesia Francesa"],
    ["Saint-Pierre-et-Miquelon", "Saint Pierre and Miquelon", "Saint-Pierre und Miquelon", "San Pedro y Miquelón"],
    ["Wallis-et-Futuna", "Wallis and Futuna", "Wallis und Futuna", "Wallis y Futuna"],
    ["étranger", "abroad", "Ausland", "extranjero"],
    ["avec", "with", "mit", "con"],
    ["oui", "yes", "ja", "sí"],
    ["non", "no", "nein", "no"],
    ["Aéronef de chaque équipe en vol", "Aircraft of each flying team", "Luftfahrzeug jedes fliegenden Teams",
      "Aeronave de cada equipo en vuelo"
    ],
    ["Laisser vide = automatique (le générateur choisit un appareil adapté à la mission). Saisir ou choisir dans la liste : types courants et appareils de la flotte avec leur indicatif ; un même type peut servir à plusieurs équipes (indicatifs différents).",
      "Leave empty = automatic (the generator picks an aircraft suited to the mission). Type or choose from the list: common types and fleet aircraft with their callsign; one type can serve several teams (different callsigns).",
      "Leer lassen = automatisch (der Generator wählt ein passendes Luftfahrzeug). Eingeben oder aus der Liste wählen: gängige Typen und Luftfahrzeuge der Flotte mit Rufzeichen; ein Typ kann mehreren Teams dienen (verschiedene Rufzeichen).",
      "Vacío = automático (el generador elige una aeronave adecuada). Escribir o elegir en la lista: tipos habituales y aeronaves de la flota con su indicativo; un mismo tipo puede servir a varios equipos (indicativos distintos)."
    ],
    ["Équipe A", "Team A", "Team A", "Equipo A"],
    ["Équipe B", "Team B", "Team B", "Equipo B"],
    ["Équipe C", "Team C", "Team C", "Equipo C"],
    ["Équipe D", "Team D", "Team D", "Equipo D"],
    ["Équipe E", "Team E", "Team E", "Equipo E"],
    ["Équipe F", "Team F", "Team F", "Equipo F"],
    ["Équipe G", "Team G", "Team G", "Equipo G"],
    ["Équipe H", "Team H", "Team H", "Equipo H"],
    ["Le prompt (une mission) est copié, puis ChatGPT s’ouvre dans un nouvel onglet : coller et envoyer. Charger ou coller ensuite les fichiers mission<ID>.yaml et summary<ID>.md (ex. missionM-016.yaml) ; la commande figure au registre des missions (« commandée »).",
      "The prompt (one mission) is copied, then ChatGPT opens in a new tab: paste and send. Then load or paste the files mission<ID>.yaml and summary<ID>.md (e.g. missionM-016.yaml); the order appears in the mission registry (“ordered”).",
      "Der Prompt (eine Mission) wird kopiert, dann öffnet sich ChatGPT in einem neuen Tab: einfügen und senden. Danach die Dateien mission<ID>.yaml und summary<ID>.md laden oder einfügen (z. B. missionM-016.yaml); die Bestellung steht im Missionsregister („bestellt“).",
      "Se copia el prompt (una misión) y ChatGPT se abre en una pestaña nueva: pegar y enviar. Después cargar o pegar los archivos mission<ID>.yaml y summary<ID>.md (p. ej. missionM-016.yaml); el pedido figura en el registro de misiones («pedida»)."
    ],
    ["automatique (selon l’appareil et le niveau)", "automatic (by aircraft and level)", "automatisch (nach Luftfahrzeug und Höhe)",
      "automático (según aeronave y nivel)"
    ],
    ["voies aériennes (IFR)", "airways (IFR)", "Luftstraßen (IFR)", "aerovías (IFR)"],
    ["Voies aériennes", "Airways", "Luftstraßen", "Aerovías"],
    ["Base SIA sans voies aériennes : relire le dossier SIA (studio ou Maintenance) pour calculer les routes.",
      "SIA base without airways: re-read the SIA folder (studio or Maintenance) to compute routes.",
      "SIA-Basis ohne Luftstraßen: SIA-Ordner neu lesen (Studio oder Wartung), um Routen zu berechnen.",
      "Base SIA sin aerovías: releer la carpeta SIA (estudio o Mantenimiento) para calcular las rutas."
    ],
    ["Voies aériennes : plus court chemin sur les voies de l’AIXM ouvertes au niveau de croisière ; RTBA : chaînage des zones raccordées ; au-delà du détour admis, ou sans chemin, le tronçon reste direct.",
      "Airways: shortest path on the AIXM airways open at cruise level; RTBA: chaining of connected areas; beyond the allowed detour, or without a path, the leg stays direct.",
      "Luftstraßen: kürzester Weg auf den bei Reiseflughöhe offenen AIXM-Luftstraßen; RTBA: Verkettung verbundener Gebiete; jenseits des zulässigen Umwegs oder ohne Weg bleibt der Abschnitt direkt.",
      "Aerovías: camino más corto por las aerovías AIXM abiertas al nivel de crucero; RTBA: encadenamiento de zonas conectadas; más allá del rodeo admitido, o sin camino, el tramo queda directo."
    ],
    ["Pas d’estimation : départ ou points sans coordonnées.", "No estimate: departure or points without coordinates.",
      "Keine Schätzung: Start oder Punkte ohne Koordinaten.", "Sin estimación: salida o puntos sin coordenadas."
    ],
    ["Mission précédente", "Previous mission", "Vorherige Mission", "Misión anterior"],
    ["Mission suivante", "Next mission", "Nächste Mission", "Misión siguiente"],
    ["Mission du lot", "Mission of the batch", "Mission des Stapels", "Misión del lote"],
    ["Ouvrir le formulaire de commande : type, théâtre, équipes, aéronefs ; le prompt est copié et ChatGPT s’ouvre",
      "Open the order form: type, theatre, teams, aircraft; the prompt is copied and ChatGPT opens",
      "Bestellformular öffnen: Typ, Schauplatz, Teams, Luftfahrzeuge; der Prompt wird kopiert und ChatGPT öffnet sich",
      "Abrir el formulario de pedido: tipo, teatro, equipos, aeronaves; se copia el prompt y se abre ChatGPT"
    ],
    ["Enregistrer le YAML de la mission (modifications comprises) dans son dossier : data/missions/<lettre>_<FAMILLE>/<ID>/",
      "Save the mission YAML (changes included) in its folder: data/missions/<letter>_<FAMILY>/<ID>/",
      "Missions-YAML (mit Änderungen) in seinem Ordner speichern: data/missions/<Buchstabe>_<FAMILIE>/<ID>/",
      "Guardar el YAML de la misión (cambios incluidos) en su carpeta: data/missions/<letra>_<FAMILIA>/<ID>/"
    ],
    ["Série dans la famille ; vide = la suivante d’après le registre des missions",
      "Series within the family; empty = the next one according to the mission registry",
      "Serie in der Familie; leer = die nächste laut Missionsregister",
      "Serie en la familia; vacío = la siguiente según el registro de misiones"
    ],
    ["Lettre de la famille + numéro suivant de la famille (registre) ; type aléatoire : selon la famille choisie par le générateur",
      "Family letter + next number of the family (registry); random type: according to the family chosen by the generator",
      "Familienbuchstabe + nächste Nummer der Familie (Register); zufälliger Typ: nach der vom Generator gewählten Familie",
      "Letra de la familia + número siguiente de la familia (registro); tipo aleatorio: según la familia elegida por el generador"
    ],
    ["Aéronefs en vol ; les équipes au sol (VSAV, CROSS, commandement…) se règlent à part",
      "Aircraft in flight; ground teams (ambulances, CROSS, command…) are set separately",
      "Luftfahrzeuge im Flug; Bodenteams (Rettungswagen, CROSS, Führung…) werden separat eingestellt",
      "Aeronaves en vuelo; los equipos de tierra (ambulancias, CROSS, mando…) se ajustan aparte"
    ],
    ["Durée de l’opération, du premier décollage au dernier atterrissage des équipes : repère pour le générateur, pas une borne stricte",
      "Duration of the operation, from the first take-off to the last landing of the teams: a guide for the generator, not a strict limit",
      "Dauer der Operation vom ersten Start bis zur letzten Landung der Teams: Richtwert für den Generator, keine feste Grenze",
      "Duración de la operación, del primer despegue al último aterrizaje de los equipos: referencia para el generador, no un límite estricto"
    ],
    ["Langues du brief traduit dans le YAML (bloc i18n), en plus du français : les pilotes le lisent dans leur langue",
      "Languages of the translated brief in the YAML (i18n block), besides French: pilots read it in their language",
      "Sprachen des übersetzten Briefings im YAML (i18n-Block), zusätzlich zum Französischen: Piloten lesen es in ihrer Sprache",
      "Idiomas del brief traducido en el YAML (bloque i18n), además del francés: los pilotos lo leen en su idioma"
    ],
    ["Lettre de la famille, tiret, numéro de l’opération sur 3 chiffres, puis la lettre de l’équipe (A, B…) quand l’opération en a plusieurs, ou Z pour l’organisation d’un exercice : M-016, S-002A, I-001Z",
      "Family letter, dash, 3-digit operation number, then the team letter (A, B…) when the operation has several, or Z for the organisation of an exercise: M-016, S-002A, I-001Z",
      "Familienbuchstabe, Bindestrich, dreistellige Operationsnummer, dann der Teambuchstabe (A, B…) bei mehreren Teams, oder Z für die Übungsleitung: M-016, S-002A, I-001Z",
      "Letra de la familia, guion, número de operación de 3 cifras, luego la letra del equipo (A, B…) si hay varios, o Z para la organización de un ejercicio: M-016, S-002A, I-001Z"
    ],
    ["lettre-numéro, ex. M-016", "letter-number, e.g. M-016", "Buchstabe-Nummer, z. B. M-016", "letra-número, p. ej. M-016"],
    ["Lot de génération dans la famille (une commande ChatGPT = une série) ; sert au registre et au rapprochement des commandes",
      "Generation batch within the family (one ChatGPT order = one series); used by the registry and to match orders",
      "Erzeugungsstapel in der Familie (eine ChatGPT-Bestellung = eine Serie); für das Register und den Abgleich der Bestellungen",
      "Lote de generación en la familia (un pedido ChatGPT = una serie); sirve al registro y a la conciliación de pedidos"
    ],
    ["Base SIA : absente de ce navigateur — la lire dans le bloc « Base de données SIA » (Afficher) ou dans",
      "SIA base: missing from this browser — read it in the “SIA database” block (Show) or in",
      "SIA-Basis: fehlt in diesem Browser — im Block „SIA-Datenbank“ (Anzeigen) lesen oder in",
      "Base SIA: ausente en este navegador — leerla en el bloque «Base de datos SIA» (Mostrar) o en"
    ],
    ["Paramètres › Maintenance › Données aéronautiques", "Settings › Maintenance › Aeronautical data",
      "Einstellungen › Wartung › Luftfahrtdaten", "Ajustes › Mantenimiento › Datos aeronáuticos"
    ],
    ["Paramètres › Maintenance › Mise à jour SIA", "Settings › Maintenance › SIA update",
      "Einstellungen › Wartung › SIA-Aktualisierung", "Ajustes › Mantenimiento › Actualización SIA"
    ],
    ["Settings › Maintenance › Données aéronautiques", "Settings › Maintenance › Aeronautical data",
      "Einstellungen › Wartung › Luftfahrtdaten", "Ajustes › Mantenimiento › Datos aeronáuticos"
    ],
    ["Settings › Maintenance › Mise à jour SIA", "Settings › Maintenance › SIA update",
      "Einstellungen › Wartung › SIA-Aktualisierung", "Ajustes › Mantenimiento › Actualización SIA"
    ],
    ["Carte", "Map", "Karte", "Mapa"],
    ["Aucune carte", "No map", "Keine Karte", "Ningún mapa"],
    ["Basses (jusqu’au FL195)", "Low (up to FL195)", "Untere (bis FL195)", "Bajas (hasta FL195)"],
    ["Libellés (désignation)", "Labels (designation)", "Beschriftungen (Bezeichnung)", "Etiquetas (designación)"],
    ["Libellés (identifiant)", "Labels (identifier)", "Beschriftungen (Kennung)", "Etiquetas (identificador)"],
    ["Points RNAV en route (OACI)", "En-route RNAV points (ICAO)", "RNAV-Streckenpunkte (ICAO)", "Puntos RNAV en ruta (OACI)"],
    ["Tracks NAT du jour (Atlantique Nord)", "Today’s NAT tracks (North Atlantic)", "NAT-Tracks des Tages (Nordatlantik)",
      "Tracks NAT del día (Atlántico Norte)"
    ],
    ["Tracks NAT : zone « Atlantique Nord (océanique, NAT) » active, tracks téléchargés dans Paramètres › Maintenance ; tireté magenta, « NAT A »…",
      "NAT tracks: “North Atlantic (oceanic, NAT)” zone active, tracks downloaded in Settings › Maintenance; magenta dashes, “NAT A”…",
      "NAT-Tracks: Zone „Nordatlantik (ozeanisch, NAT)“ aktiv, Tracks unter Einstellungen › Wartung heruntergeladen; magenta gestrichelt, „NAT A“…",
      "Tracks NAT: zona «Atlántico Norte (oceánico, NAT)» activa, tracks descargados en Ajustes › Mantenimiento; trazos magenta, «NAT A»…"
    ],
    ["Points RNAV : points désignés en route de la base aéronautique (SIA, autres pays, X-Plane), triangle bleu.",
      "RNAV points: en-route designated points of the aeronautical database (SIA, other countries, X-Plane), blue triangle.",
      "RNAV-Punkte: benannte Streckenpunkte der Luftfahrtdatenbank (SIA, andere Länder, X-Plane), blaues Dreieck.",
      "Puntos RNAV: puntos designados en ruta de la base aeronáutica (SIA, otros países, X-Plane), triángulo azul."
    ],
    ["Base SIA : segments de routes ATS (AIXM) ; bleu : basses, violet pointillé : hautes.",
      "SIA base: ATS route segments (AIXM); blue: low, dotted purple: high.",
      "SIA-Basis: ATS-Streckensegmente (AIXM); blau: untere, violett gepunktet: obere.",
      "Base SIA: segmentos de rutas ATS (AIXM); azul: bajas, violeta punteado: altas."
    ],
    ["Base SIA (XML_SIA, points « VFR ») : relire le dossier SIA s’ils n’apparaissent pas.",
      "SIA base (XML_SIA, “VFR” points): re-read the SIA folder if they do not appear.",
      "SIA-Basis (XML_SIA, „VFR“-Punkte): SIA-Ordner neu lesen, falls sie nicht erscheinen.",
      "Base SIA (XML_SIA, puntos «VFR»): releer la carpeta SIA si no aparecen."
    ],
    ["+ Cartes d’exercice", "+ Exercise maps", "+ Übungskarten", "+ Mapas de ejercicio"],
    ["Base SIA absente de ce navigateur : la lire dans le bloc « Base de données SIA » ou dans Paramètres › Maintenance.",
      "SIA base missing from this browser: read it in the “SIA database” block or in Settings › Maintenance.",
      "SIA-Basis fehlt in diesem Browser: im Block „SIA-Datenbank“ oder unter Einstellungen › Wartung lesen.",
      "Base SIA ausente en este navegador: leerla en el bloque «Base de datos SIA» o en Ajustes › Mantenimiento."
    ],
    ["Enregistrer la mission et les réglages du studio (profil et emprise de chaque carte, tracés, pistes) dans son dossier : data/missions/…/mission<ID>.yaml",
      "Save the mission and the studio settings (profile and extent of each map, drawings, tracks) in its folder: data/missions/…/mission<ID>.yaml",
      "Mission und Studio-Einstellungen (Profil und Ausschnitt jeder Karte, Zeichnungen, Spuren) in ihrem Ordner speichern: data/missions/…/mission<ID>.yaml",
      "Guardar la misión y los ajustes del estudio (perfil y extensión de cada mapa, trazados, pistas) en su carpeta: data/missions/…/mission<ID>.yaml"
    ],
    ["LFBO N0160A055 DCT TOU UN460 NTS DCT 4419N00316E/A035 DCT LFRN — vide : route de la mission",
      "LFBO N0160A055 DCT TOU UN460 NTS DCT 4419N00316E/A035 DCT LFRN — empty: mission route",
      "LFBO N0160A055 DCT TOU UN460 NTS DCT 4419N00316E/A035 DCT LFRN — leer: Route der Mission",
      "LFBO N0160A055 DCT TOU UN460 NTS DCT 4419N00316E/A035 DCT LFRN — vacío: ruta de la misión"
    ],
    ["Niveau de croisière (profil vertical, recherche de route, cartes) : FL65 ou 6500",
      "Cruise level (vertical profile, route search, maps): FL65 or 6500",
      "Reiseflughöhe (Vertikalprofil, Routensuche, Karten): FL65 oder 6500",
      "Nivel de crucero (perfil vertical, búsqueda de ruta, mapas): FL65 o 6500"
    ],
    ["Réseau de la recherche de route", "Network for the route search", "Netz der Routensuche", "Red de la búsqueda de ruta"],
    ["Chercher une route entre les points du champ par ce réseau ; le résultat remplace la route",
      "Search a route between the points of the field over this network; the result replaces the route",
      "Route zwischen den Punkten des Feldes über dieses Netz suchen; das Ergebnis ersetzt die Route",
      "Buscar una ruta entre los puntos del campo por esta red; el resultado reemplaza la ruta"
    ],
    ["Reprendre la route du dernier OFP SimBrief (identifiant : ☰ › Profil pilote)",
      "Take the route of the latest SimBrief OFP (identifier: ☰ › Pilot profile)",
      "Route des letzten SimBrief-OFP übernehmen (Kennung: ☰ › Pilotenprofil)",
      "Tomar la ruta del último OFP de SimBrief (identificador: ☰ › Perfil de piloto)"
    ],
    ["Remplacer la route par la route probable de la mission (ordre donné par la mission, sinon calculé), retour base compris",
      "Replace the route with the mission’s likely route (order given by the mission, otherwise computed), return to base included",
      "Route durch die wahrscheinliche Route der Mission ersetzen (Reihenfolge der Mission, sonst berechnet), Rückkehr zur Basis eingeschlossen",
      "Reemplazar la ruta por la ruta probable de la misión (orden dado por la misión, si no calculado), regreso a base incluido"
    ],
    ["Tracer la coupe verticale de la route", "Draw the vertical section of the route", "Vertikalschnitt der Route zeichnen",
      "Trazar el corte vertical de la ruta"
    ],
    ["Ouvrir le planificateur carburant avec cette route (plan de vol OACI, distance, niveau, route vraie, appareil)",
      "Open the fuel planner with this route (ICAO flight plan, distance, level, true course, aircraft)",
      "Kraftstoffplaner mit dieser Route öffnen (ICAO-Flugplan, Distanz, Höhe, wahrer Kurs, Luftfahrzeug)",
      "Abrir el planificador de combustible con esta ruta (plan de vuelo OACI, distancia, nivel, rumbo verdadero, aeronave)"
    ],
    ["Copier le plan de vol OACI strict : points non publiés en coordonnées, altitudes en groupes vitesse / niveau",
      "Copy the strict ICAO flight plan: unpublished points as coordinates, altitudes as speed / level groups",
      "Strikten ICAO-Flugplan kopieren: nicht veröffentlichte Punkte als Koordinaten, Höhen als Geschwindigkeits-/Höhengruppen",
      "Copiar el plan de vuelo OACI estricto: puntos no publicados en coordenadas, altitudes en grupos velocidad / nivel"
    ],
    ["Carte affichée (par défaut : la carte générale de la route)", "Map shown (default: the general route map)",
      "Angezeigte Karte (Standard: Übersichtskarte der Route)", "Mapa mostrado (por defecto: el mapa general de la ruta)"
    ],
    ["Profil d’affichage de cette carte (même réglage que dans « Cartes à produire »)",
      "Display profile of this map (same setting as in “Maps to produce”)",
      "Anzeigeprofil dieser Karte (gleiche Einstellung wie in „Zu erstellende Karten“)",
      "Perfil de visualización de este mapa (mismo ajuste que en «Mapas a producir»)"
    ],
    ["Couleur des libellés et du contour des points", "Colour of labels and point outlines",
      "Farbe der Beschriftungen und Punktumrisse", "Color de las etiquetas y del contorno de los puntos"
    ],
    ["Couleur de remplissage des points", "Point fill colour", "Füllfarbe der Punkte", "Color de relleno de los puntos"],
    ["Redessiner l’aperçu avec les réglages en cours", "Redraw the preview with the current settings",
      "Vorschau mit den aktuellen Einstellungen neu zeichnen", "Redibujar la vista previa con los ajustes actuales"
    ],
    ["La carte générée reprendra exactement le cadre affiché (zoom et déplacement à la souris) ; écrit dans la mission",
      "The generated map will use exactly the frame shown (zoom and pan with the mouse); written into the mission",
      "Die erzeugte Karte übernimmt genau den angezeigten Ausschnitt (Zoom und Verschieben mit der Maus); in der Mission gespeichert",
      "El mapa generado retomará exactamente el encuadre mostrado (zoom y desplazamiento con el ratón); escrito en la misión"
    ],
    ["Revenir au cadrage enregistré de cette carte", "Back to this map’s saved framing",
      "Zum gespeicherten Ausschnitt dieser Karte zurück", "Volver al encuadre guardado de este mapa"
    ],
    ["Oublier le cadrage enregistré : cadre calculé d’après la mission (points, zones, pistes) et le type de carte",
      "Forget the saved framing: frame computed from the mission (points, areas, tracks) and the map type",
      "Gespeicherten Ausschnitt verwerfen: aus der Mission (Punkte, Zonen, Spuren) und dem Kartentyp berechnet",
      "Olvidar el encuadre guardado: encuadre calculado a partir de la misión (puntos, zonas, pistas) y del tipo de mapa"
    ],
    ["Organisation d’un exercice (…Z) : carte organisation et une carte par chiffon joué ; équipage : une carte par message ou pli qui lui révèle des pistes",
      "Exercise organisation (…Z): organisation map and one map per played target; crew: one map per message or envelope revealing tracks to it",
      "Übungsleitung (…Z): Leitungskarte und eine Karte je gespieltem Ziel; Besatzung: eine Karte je Nachricht oder Umschlag, der ihr Spuren enthüllt",
      "Organización de un ejercicio (…Z): mapa de organización y un mapa por blanco jugado; tripulación: un mapa por mensaje o sobre que le revela pistas"
    ],
    ["carte organisation et une carte par chiffon joué ; équipage : une carte par message ou pli qui lui révèle des pistes",
      "organisation map and one map per played target; crew: one map per message or envelope revealing tracks to it",
      "Leitungskarte und eine Karte je gespieltem Ziel; Besatzung: eine Karte je Nachricht oder Umschlag, der ihr Spuren enthüllt",
      "mapa de organización y un mapa por blanco jugado; tripulación: un mapa por mensaje o sobre que le revela pistas"
    ],
    ["Durée est.", "Est. time", "Gesch. Dauer", "Duración est."],
    ["Cartes de vol", "Flight maps", "Flugkarten", "Mapas de vuelo"],
    ["Route, cartes topographiques, approche, rendez-vous et destination, profil vertical — pour sa propre préparation",
      "Route, topographic maps, approach, rendezvous and destination, vertical profile — for your own preparation",
      "Route, topografische Karten, Anflug, Treffpunkt und Ziel, Vertikalprofil — für die eigene Vorbereitung",
      "Ruta, mapas topográficos, aproximación, encuentro y destino, perfil vertical — para la propia preparación"
    ],
    ["Case 15 du plan de vol OACI (séparée par des espaces) ou liste à virgules. Points : terrains (OACI), balises, points RNAV, points de report VFR (« MM-CV »), points de la mission (ORIGIN, TARGET…), « REN300010 » (radiale / distance), coordonnées « 4330N00125E » ou « lat lon » ; voies aériennes entre deux points (« TOU UN460 NTS ») suivies point par point ; « DCT » : direct. Niveaux : « N0450F350 » groupe vitesse / niveau (au départ ou après un point : « NTS/N0440F370 »), « FL105 » ou « 5500 ft » seul : montée ou descente après le point précédent, « /A035 », « /F065 » ou « /3000 » après un point : altitude à atteindre au point, « VFR » : pas de niveau. Le même plan de vol est repris par le planificateur carburant (Cartes de vol).",
      "Item 15 of the ICAO flight plan (space-separated) or comma list. Points: aerodromes (ICAO), beacons, RNAV points, VFR reporting points (“MM-CV”), mission points (ORIGIN, TARGET…), “REN300010” (radial / distance), coordinates “4330N00125E” or “lat lon”; airways between two points (“TOU UN460 NTS”) followed point by point; “DCT”: direct. Levels: “N0450F350” speed / level group (at departure or after a point: “NTS/N0440F370”), “FL105” or “5500 ft” alone: climb or descent after the previous point, “/A035”, “/F065” or “/3000” after a point: altitude to reach at the point, “VFR”: no level. The same flight plan is used by the fuel planner (Flight maps).",
      "Feld 15 des ICAO-Flugplans (durch Leerzeichen getrennt) oder Kommaliste. Punkte: Flugplätze (ICAO), Funkfeuer, RNAV-Punkte, VFR-Meldepunkte („MM-CV“), Punkte der Mission (ORIGIN, TARGET…), „REN300010“ (Radial / Distanz), Koordinaten „4330N00125E“ oder „lat lon“; Luftstraßen zwischen zwei Punkten („TOU UN460 NTS“) Punkt für Punkt verfolgt; „DCT“: direkt. Höhen: „N0450F350“ Geschwindigkeits-/Höhengruppe (beim Start oder nach einem Punkt: „NTS/N0440F370“), „FL105“ oder „5500 ft“ allein: Steig- oder Sinkflug nach dem vorherigen Punkt, „/A035“, „/F065“ oder „/3000“ nach einem Punkt: am Punkt zu erreichende Höhe, „VFR“: keine Höhe. Derselbe Flugplan wird vom Kraftstoffplaner übernommen (Flugkarten).",
      "Casilla 15 del plan de vuelo OACI (separada por espacios) o lista con comas. Puntos: aeródromos (OACI), radiobalizas, puntos RNAV, puntos de notificación VFR («MM-CV»), puntos de la misión (ORIGIN, TARGET…), «REN300010» (radial / distancia), coordenadas «4330N00125E» o «lat lon»; aerovías entre dos puntos («TOU UN460 NTS») seguidas punto por punto; «DCT»: directo. Niveles: «N0450F350» grupo velocidad / nivel (en la salida o tras un punto: «NTS/N0440F370»), «FL105» o «5500 ft» solo: ascenso o descenso tras el punto anterior, «/A035», «/F065» o «/3000» tras un punto: altitud a alcanzar en el punto, «VFR»: sin nivel. El planificador de combustible retoma el mismo plan de vuelo (Mapas de vuelo)."
    ],
    ["Survol d’un point du texte, de la carte ou de la coupe : les deux autres s’illuminent. Carte : glisser un point (aimanté sur balises, points de report, terrains), clic sur la route pour insérer un point, clic droit pour supprimer un point (double-clic : un point ajouté). Coupe : clic pour un point à cette altitude, glisser pour l’altitude, clic droit pour supprimer.",
      "Hovering a point in the text, the map or the section lights up the other two. Map: drag a point (snaps to beacons, reporting points, aerodromes), click the route to insert a point, right-click to delete a point (double-click: an added point). Section: click for a point at that altitude, drag for the altitude, right-click to delete.",
      "Das Überfahren eines Punktes im Text, auf der Karte oder im Schnitt hebt die beiden anderen hervor. Karte: Punkt ziehen (rastet an Funkfeuern, Meldepunkten, Flugplätzen ein), Klick auf die Route fügt einen Punkt ein, Rechtsklick löscht einen Punkt (Doppelklick: ein hinzugefügter Punkt). Schnitt: Klick für einen Punkt in dieser Höhe, Ziehen für die Höhe, Rechtsklick zum Löschen.",
      "Pasar sobre un punto del texto, del mapa o del corte ilumina los otros dos. Mapa: arrastrar un punto (se ajusta a radiobalizas, puntos de notificación, aeródromos), clic en la ruta para insertar un punto, clic derecho para borrar un punto (doble clic: un punto añadido). Corte: clic para un punto a esa altitud, arrastrar para la altitud, clic derecho para borrar."
    ],
    ["Organisation de l’exercice (…Z) : carte organisation et une carte par chiffon joué ; équipage : une carte par message ou pli qui lui révèle des pistes",
      "Exercise organisation (…Z): organisation map and one map per played target; crew: one map per message or envelope revealing tracks to it",
      "Übungsleitung (…Z): Leitungskarte und eine Karte je gespieltem Ziel; Besatzung: eine Karte je Nachricht oder Umschlag, der ihr Spuren enthüllt",
      "Organización del ejercicio (…Z): mapa de organización y un mapa por blanco jugado; tripulación: un mapa por mensaje o sobre que le revela pistas"
    ],
  ]);
})();
