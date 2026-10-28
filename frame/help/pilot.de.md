<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilot — Handbuch

Die App Pilot vereint die Werkzeuge, um einen Flug vorzubereiten und zu verfolgen: Kraftstoff und Flugfläche, Karte,
Bericht, meine Flüge, Übergabe an die Website der Fluggesellschaft. Sie funktioniert auf einem Telefon wie auf einem
Computer, mit oder ohne Netz.

## Erster Start

- **Die Verben.** Auf einem Telefon bietet die untere Leiste fünf Einträge: Vorbereiten, Karte, Bericht, Flüge, Wetter.
  Tippen Sie einen bereits gewählten Reiter, der mehrere Bildschirme bündelt, noch einmal an: Darüber öffnet sich eine kleine
  Liste (Vorbereiten: Kraftstoff und Leistungsdatenblätter). Auf einem Bildschirm ist jedes Werkzeug ein Verb der linken
  Spalte. Die Adresse eines Werkzeugs (`#fuel`, `#report`…) genügt, um zu ihm zurückzukehren. Die Einstellungen sind die
  Schaltfläche ⚙ der Kopfzeile.
- **Ihre Identität.** Stellen Sie unter ⚙ Einstellungen Ihr Kürzel und Ihre IVAO-, VATSIM- und SimBrief-IDs ein: Die
  Werkzeuge nutzen sie zum Vorausfüllen.
- **Die Stufe.** Ebenfalls in den Einstellungen wählt „Stufe“, was das Menü zeigt: Einstieg, Alltag oder Vollständig.
  Ein ausgeblendetes Werkzeug bleibt über seine Adresse erreichbar.
- **Die Hilfe.** Jedes Werkzeug hat oben einen eingeklappten Bereich „So geht’s“; die Schaltfläche ? der Kopfzeile (auf
  einem Telefon wie auf einem Bildschirm) öffnet dieses Handbuch beim Kapitel des Bildschirms, auf dem Sie sind.
- **Der Status auf der Schaltfläche ⚙.** In der Kopfzeile trägt die Schaltfläche ⚙ einen Punkt: grün, wenn etwas auf Sie
  wartet (ein gestarteter Flug, ein zu schreibender Bericht), orange (auf einem Telefon), wenn etwas Aufmerksamkeit braucht:
  kein Kürzel, ausstehende Schreibvorgänge, Konflikte, ein Synchronisationsfehler, offline. Die Einstellungen öffnen sich mit
  dem Block „Status“, der die Einzelheiten nennt: der laufende Flug (antippen, um zur Karte zu gehen), die noch zu
  schreibenden Berichte zu Ihren vergangenen Flügen (antippen, um den vorausgefüllten Bericht zu öffnen), das fehlende Kürzel
  (antippen, um es einzustellen), der Zustand der Daten (letzte Synchronisation, ausstehende Schreibvorgänge, genutzter
  Austauschweg), die Luftfahrtdatenbank, solange sie nicht bereit ist, der Starter, „Offline“, wenn kein Netz da ist, die Zahl der Wetterabrufe des Tages (Open-Meteo-Vorhersagen,
  10.000 pro Tag erlaubt), das Ende des AIRAC-Zyklus, wenn die veröffentlichte Luftfahrtdatenbank oder die Verfahren hinter
  dem gültigen Zyklus zurückliegen, und
  auf einem Telefon die Quelle der Position während eines Flugs. Auf einem Telefon besteht die Kopfzeile nur aus Name,
  Schaltfläche ? und Schaltfläche ⚙.
- **Vollbild.** Auf der Karte (Werkzeuge mit fester Ansicht) blendet eine runde Schaltfläche am Ende der Schaltflächenspalte
  über der Karte die Kopfzeile und die untere Leiste aus, damit die Karte den ganzen Platz hat; dieselbe Schaltfläche oder Esc bringen sie zurück.
- **Telefon im Querformat.** Seitlich gedreht, legt das Telefon die untere Leiste als Symbolleiste an den linken Rand (dieselben
  fünf Einträge; ein zweites Tippen auf Vorbereiten öffnet seine Werkzeuge rechts neben der Leiste), behält die Kopfzeile, stellt
  den Datenblock der Karte als Spalte nach rechts (die erste Zeile antippen oder nach links ziehen, um sie zu verbreitern oder
  zu verschmälern) und gibt der Karte die ganze verbleibende Höhe. Im Vollbild bleibt die Spalte.

## Daten und Synchronisation

- **Zuerst offline.** Alles, was Sie tun, bleibt auf dem Gerät und funktioniert ohne Netz.
- **Allein auf diesem Gerät.** Ist in den Einstellungen kein Austausch angekreuzt, geht nichts anderswohin: Exportieren
  Sie ab und zu die Sicherung des Geräts (eine Datei), sie ist die einzige Kopie.
- **Mehrere Geräte oder mehrere Nutzer.** Kreuzen Sie die Nutzung in den Einstellungen an und stellen Sie den Zugang ein
  (GitHub-Repository und persönliches Token oder der Starter eines Rechners). Ihre Änderungen gehen gemeinsam bei der
  Synchronisation hinaus: beim Start, alle 10 Minuten online oder über die Statusschaltfläche oben am Bildschirm.
- **Konflikte.** Eine hier und anderswo gleichzeitig geänderte Datei behält ihre neueste Version; die andere bleibt
  einsehbar (Statusschaltfläche, dann „Konflikte“) und kann zurückgenommen werden.

<!-- chapter: fuel -->
# Kraftstoff und Flugfläche

Den Kraftstoff eines Flugs vorbereiten und seine Flugfläche wählen: ein Luftfahrzeug, eine Route, eine Flugfläche, und
die Berechnung steht — Rollen, Streckenkraftstoff, Reserve, Blockkraftstoff, Flugzeit und Sinkflugbeginn.

## So geht’s

<a id="fuel-quote"></a>Die Vorbereitung folgt fünf Schritten, in der Reihenfolge, in der man einen Flug vorbereitet:
**1 Flug, 2 Route, 3 Wetter, 4 Ergebnis, 5 Abflug**. Auf einem Telefon zeigt die obere Leiste jeweils einen Schritt
(tippen Sie auf eine Nummer, um dorthin zu gehen, „Weiter“ unten in jedem Schritt); auf einem breiten Bildschirm stehen
die fünf Schritte untereinander. Bei jeder Änderung wird alles neu berechnet: Korrigieren Sie die Route, und Wetter,
Berechnung und Wind folgen, ohne dass eine Schaltfläche zu drücken ist. Das Ergebnis (Blockkraftstoff,
Streckenkraftstoff, Zeit, Sinkflugbeginn) bleibt bei jedem Schritt unten im Bildschirm sichtbar, mit der Herkunft des
Winds („Wind: METAR LFRS“, „Wind: ICON-Vorhersage FL060“, „Wind eingegeben“). Auf einem Telefon braucht diese Leiste drei Zeilen: den Kontext
(„Block · FL060→090→110→070 · Wind ARPEGE FL060“, vollständig beim Berühren), den Blockkraftstoff, dann drei Kacheln
„Reise“, „Zeit“ und „TOD“ (Sinkflugbeginn). Der Bildschirm öffnet sich immer mit dem Reiter „Berechnung“; die Datenblätter
öffnen sich über den Reiter „Datenblätter“. Ein ✓ markiert einen ausgefüllten Schritt.
Flugflächen werden überall gleich geschrieben: als FL ab 5000 ft (FL060), darunter in Fuß (3500 ft).

<a id="fuel-step-1"></a>**1 Flug.** Abflug, Ankunft und Ausweichflugplatz (ICAO-Codes), das Flugdatum, wenn Sie die Vorhersage (TAF) statt der
Beobachtung wollen, das Luftfahrzeug und die Reiseflugfläche (FL). Das Flugdatum (in der Ortszeit des Geräts eingegeben) ist ein einziger Wert, im aktuellen Flug gespeichert: Das Wetter der Kalkulation (TAF der Flugplätze, Höhenwinde und -temperaturen) wird für dieses Datum gelesen, die ETA der Karte geht davon aus, solange der Flug nicht gestartet ist, und der Schieberegler der Atmosphäre geht von ihm aus; leer heißt jetzt. Das Luftfahrzeug passt auf eine Zeile: das gewählte
Luftfahrzeug, sein Kennzeichen, sein Rufzeichen und woher es stammt. Ein neuer Flug übernimmt das zuletzt auf diesem Gerät
gewählte Luftfahrzeug; ohne Wahl wartet die Kalkulation. Die Lupe öffnet die Suche (das zuletzt gewählte zuerst): Tippen Sie ein
Datenblatt, ein Kennzeichen, ein Rufzeichen oder einen Typ. Die Ergebnisse kommen in dieser Reihenfolge: Ihre
Leistungsdatenblätter, die Luftfahrzeuge der Fluggesellschaft (ihre Flotte, dann die aus ihrem Flugbuch bekannten), die
veröffentlichten Typen und zuletzt der Code so, wie er getippt wurde. Ein Luftfahrzeug der Fluggesellschaft nimmt sein
eigenes Datenblatt, wenn es eines hat, sonst das seines Typs, sonst eine Schätzung des Typs — die Berechnung markiert es
dann „ungefähr“. Das gewählte Kennzeichen und Rufzeichen begleiten den Flug bis zum Bericht. Die Zeile „Reiseflug“ sagt,
woher der Verbrauch stammt.

Neben dem Datum legt die Uhr „+30“ den Flug 30 Min. in die Zukunft (auf 5 Min. gerundet; jedes Tippen fügt 30 Min.
hinzu), und „Jetzt“ kehrt zur aktuellen Uhrzeit zurück: Flugplatzwetter (die TAF, wenn sie diese Uhrzeit abdeckt) und
Höhenwinde werden sofort neu gelesen.

<a id="fuel-step-2"></a>**2 Route.** Tippen Sie die Route in das stets sichtbare Feld „Route“ (die Eingabetaste bestätigt sie): die Punkte, die
Luftstraßen und die Flugflächen, wie in einem Flugplan („LFBO TOU UN460 NTS/F280 LFRN“). Sie können dort auch einen
ICAO-Flugplan oder die Liste eines OFP einfügen. Wenn Sie das Feld verlassen, wird die Route bereinigt: in
Großbuchstaben auf einer Zeile, ohne DCT und ohne Geschwindigkeits-Flugflächen-Gruppen, Abflug und Ankunft an den Enden,
ein Flugflächenwechsel als „/F280“ nach dem Punkt, an dem er beginnt. Luftstraßen bleiben geschrieben (die Berechnung
folgt den Punkten). Unbekannte Punkte bleiben an ihrer Stelle und werden direkt darunter gemeldet; Koordinaten schreibt
man nach ICAO-Art („4530N00030E“). Die nächste Zeile gibt Entfernung und rechtweisenden Kurs an und woher sie stammen
(die Route, der SimBrief-OFP). Lässt sich die Route nicht auflösen, öffnet „Von Hand eingeben“ die beiden Felder. Mit
eingestellter SimBrief-ID (⚙) übernimmt „Letzter SimBrief-OFP“ Route, Flugfläche, mittleren Wind und Luftfahrzeug Ihres
letzten Plans auf einmal.

Die Schaltfläche „Auto“ neben dem Feld „Route“ trägt die Luftstraßen zwischen den Punkten ein: Für jedes Paar benannter
Punkte, die ohne Luftstraße aufeinander folgen, sucht sie den kürzesten Weg über die Luftstraßen der veröffentlichten
Datenbank, die auf der geplanten Flugfläche offen sind (Untergrenze und Obergrenze jedes Abschnitts, auf 100 ft genau; ohne
geplante Flugfläche 6 500 ft, eine Meldung sagt es), mit direktem Einflug und Ausflug bis 60 NM und ohne Umweg über 40 %.
Der Text wird zu „LFRS TSA01 UT460 TSA05 LFML“; die Zwischenpunkte der Luftstraße, die der Text nicht schreibt, bleiben in den
Punkten (Entfernung, Karte und Profil folgen ihnen). Eine Meldung nennt das Ergebnis („3 Luftstraßen eingetragen, 254 NM“)
oder „Keine nutzbare Luftstraße zwischen X und Y“. Grenzen: Die Luftstraßen gelten in beiden Richtungen (die Datenbank kennt
noch keine Einbahnstraßen), ohne feine Flugflächenbeschränkungen und ohne SID / STAR; die Route bleibt zu prüfen.

Der aufklappbare Bereich „Punkte“ listet die erkannten Punkte auf, vom Abflug bis zur Ankunft. Die Pfeile schieben einen
Punkt in der Liste nach oben oder unten, das Kreuz entfernt ihn; das Feld unten fügt einen vor der Ankunft hinzu: eine
Kennung (Funkfeuer, Wegpunkt, Flugplatz) oder „NAME Breite Länge“. Jeder Zwischenpunkt hat ein freiwilliges Feld für die
Flugfläche, in FL: Das ist die Flugfläche, die ab diesem Punkt gehalten wird, für einen Stufensteigflug oder -sinkflug.
Ein Punkt ohne Flugfläche setzt die vorige fort (grau angezeigt); der Flug beginnt auf der Flugfläche des Plans. Die
Berechnung zählt jede Stufe (ihren Steig- oder Sinkflug, dann den Reiseflug auf dieser Flugfläche), das Ergebnis zeigt
die Folge der Flugflächen (FL100 → FL120), und der Sinkflug beginnt auf der letzten Flugfläche. Jede Änderung schreibt
das Feld „Route“ neu und wird sofort an die Karte weitergegeben; eine getippte Luftstraße bleibt geschrieben, solange
die beiden Punkte, die sie einrahmen, benachbart und an ihrer Stelle bleiben.

„Karte zeigen“ zeigt den Flug auf der Karte: Auf einem Telefon öffnet sich die Karte (die Schaltfläche in der Kopfzeile
führt hierher zurück); auf einem breiten Bildschirm öffnet sie sich daneben und folgt jeder Änderung. „Route bearbeiten“
auf der Karte führt zu diesem Schritt zurück, das Routenfeld bereit zur Eingabe.

<a id="fuel-step-3"></a>**3 Wetter.** Der Wind (Richtung und Stärke) und die ISA-Abweichung. Ohne Richtung oder ganz ohne Wind wird der
Blockkraftstoff als Spanne angegeben. „Flugplatzwetter lesen“ zeigt Abflug, Ankunft, Ausweichflugplatz und die
Flugplätze entlang der Route: alle, die weniger als 10 NM beiderseits der Route liegen (Radius in den Einstellungen der
Berechnung einstellbar) und ein METAR oder eine TAF haben; die anderen werden übergangen. Jeder Flugplatz nennt seine
Entfernung vom Abflug (der Ausweichflugplatz: von der Ankunft); sind es mehr als zwei, werden die Zwischenflugplätze
unter Abflug, Ankunft und Ausweichflugplatz zugeklappt. Für jeden, was für den Flug zählt: die Kategorie (VFR, MVFR,
IFR, LIFR, farbig), den Wind und seine Gegen- und Seitenwindkomponente auf der Hauptpiste des Flugplatzes (die Richtung,
die dem Wind am nächsten liegt), die Wolkenuntergrenze, die Sicht, die Temperatur und das QNH sowie eine Warnung, wenn
CB oder TCU gemeldet sind; die Rohmeldung ist zugeklappt. Mit einem Flugdatum antwortet die TAF, wenn sie diese Uhrzeit
abdeckt (samt ihren vorübergehenden Änderungen), sonst das METAR. Setzen Sie das Häkchen bei „Echtes Wetter“, damit der
Wind der Berechnung zum Mittel der Winde der Flugplätze der Route wird (Abflug, Zwischenflugplätze, Ankunft), Abschnitt
für Abschnitt und nach dessen Länge gewichtet — eine Näherung aus dem Bodenwind, unter den Feldern vermerkt. Ohne Netz
bleiben die zuletzt gelesenen Werte mit ihrer Uhrzeit angezeigt.

„ISA ±“ ist die Temperaturabweichung von der Standardatmosphäre, in °C: Sie verändert die verfügbare Leistung, die wahre
Fluggeschwindigkeit und die Gipfelhöhe. Sobald das Wetter gelesen ist, berechnet die Zeile darunter sie aus dem METAR
des Abflugs — dessen Temperatur minus die Standardtemperatur des Flugplatzes (15 − 1,98 × Flugplatzhöhe in tausend Fuß)
— und „ISA … verwenden“ überträgt sie in das Feld. Die gewählte Abweichung bleibt in Ihren Einstellungen gespeichert:
Der nächste Flug beginnt mit derselben. Sobald die Höhenvorhersage gelesen ist, schlägt eine zweite Zeile die Abweichung
auf der geplanten Flugfläche vor, gemittelt entlang der Route („ISA −5 auf FL060 laut ARPEGE-Vorhersage“); mit „Echtes
Wetter“ übernimmt die Berechnung diese, wie den Wind. „Flugplatzwetter lesen“ zeigt „Wird gelesen…“ während der Abrufe.

„Flugplatzwetter lesen“ liest auch die Höhenvorhersage (Open-Meteo, ohne Schlüssel, mit oder ohne Starter) an den
Punkten der Route: Die Karte „Höhenwinde und -temperaturen“ gibt für jeden Punkt die geplante Flugfläche (samt ihren
Stufen), den Wind, die Temperatur und die ISA-Abweichung auf dieser Flugfläche an, mit dem Modell (Météo-France AROME /
ARPEGE über Frankreich, ICON im übrigen Europa, GFS darüber hinaus), der Zielzeit (das Flugdatum, sonst jetzt) und der
Uhrzeit des Modelllaufs. Mit „Echtes Wetter“ wird der Wind der Berechnung zum Mittel dieser Winde auf der geplanten
Flugfläche entlang der Route, anstelle des Bodenwinds der METAR; die Zeile unter den Feldern sagt es. Dieselben Winde
gehen an die Karte, die sie als Pfeile zeichnet. Ohne Netz bleibt die zuletzt gelesene Vorhersage. Ändern sich Route
oder Uhrzeit, bleibt der bisherige Höhenwind, markiert mit „Vorhersage wird geladen…“, bis zur neuen Vorhersage; kommt
sie nicht, übernimmt der Bodenwind der METAR, und das wird gesagt („Höhenvorhersage nicht verfügbar“).

<a id="fuel-step-4"></a>**4 Ergebnis.** Die Zeichnung zeigt für jede Flugfläche den Streckenkraftstoff (durchgezogene Linie) und die Dauer
(gestrichelt). Der grüne Punkt markiert die sparsamste Flugfläche, das orange Quadrat die schnellste; der graue Bereich
die Flugflächen, die auf dieser Strecke nicht zu halten sind. Jede Flugfläche wird wie die Kalkulation gerechnet, mit dem vorhergesagten Wind auf dieser
Höhe, wenn das echte Wetter gewählt ist: auf der gewählten Flugfläche zeigen Kurve und Kalkulation dieselbe Zahl. Auf einer Strecke mit Stufen ist jeder Punkt der Kurve ein Horizontalflug auf seiner Flugfläche, ohne die Stufen: Die schwarze Raute markiert die echte Kalkulation des Plans (mit den Stufen der Strecke und dem Planwind), unter der Zeichnung angegeben („Plan: FL160, 856 kg, 0:54“); ihr Abstand zur Kurve sind die Kosten der Stufen. Die Kraftstoffachse folgt der gewählten Einheit (kg oder lb). Tippen Sie auf die Kurve, um eine Flugfläche zu wählen,
oder nutzen Sie die beiden Schaltflächen. „Steigflug“ wählt die Art zu steigen: sparsam, bestes Steigen, schnell, mit
der Geschwindigkeit des Datenblatts oder manuell (Sie geben Geschwindigkeit und Steigrate an).

Der aufklappbare Bereich „Dichtehöhe“ zeigt, mit der ISA-Abweichung auf der waagerechten Achse, die Dichtehöhe jeder
Druckhöhe (eine Gerade je tausend Fuß): Das ist die Höhe, die Rotor, Propeller und Triebwerk „spüren“. Die senkrechte
Linie ist die Abweichung des Flugs, die waagerechte die Gipfelhöhe des Datenblatts; ihr Schnittpunkt sagt, auf welcher
Druckhöhe das Luftfahrzeug an diesem Tag seine Gipfelhöhe erreicht (fett gezeichnete Gerade). Ein Punkt markiert den
Abflug laut METAR (Temperatur und QNH). Wichtig für Hubschrauber: Bei großer Hitze oder in der Höhe kann die
tatsächliche Gipfelhöhe weit unter die des Datenblatts fallen.

Unter dem Diagramm zeigt „Echte Atmosphäre am Abflug“ die vorhergesagte Temperatur in jeder Höhe über dem Abflug
(durchgezogene Linie) gegenüber der Standardatmosphäre (gestrichelt): Wo die Kurve davon abweicht, ändert sich die
ISA-Abweichung mit der Höhe, und Inversionsschichten (die Temperatur steigt mit der Höhe) werden hervorgehoben und
darunter genannt. Die Ablesezeile gibt auf der geplanten Flugfläche die tatsächliche Temperatur, ISA-Abweichung und
Dichtehöhe an.

Klappen Sie „Steigflug-Vorgaben“ auf, um dem Steigflug bis zur Flugfläche zu folgen: Leistung, Drehzahl,
Geschwindigkeit, Steigrate, Durchfluss, Mach, Zeit und Kraftstoff kumuliert an den Stufen, mit gezeichnetem Profil. Das
Ergebnis gibt Blockkraftstoff, Streckenkraftstoff, Flugzeit und Entfernung des Sinkflugbeginns vor der Ankunft an.
„Einzelheiten“ schlüsselt es Phase für Phase auf.

„Öffnen in“ bereitet denselben Flug anderswo vor, in einem neuen Tab: SimBrief (Flugoptionen vorausgefüllt,
SimBrief-Anmeldung nötig), SkyVector (die Route gezeichnet, mit Geschwindigkeit und Flugfläche), Navigraph und ChartFox
(die Karten von Abflug- und Zielflugplatz, Anmeldung nötig). Ein ausgegrauter Eintrag sagt, was ihm fehlt (Flugplatz,
Luftfahrzeugtyp). Es wird nichts gesendet, was nicht schon im Flug steht. Die Einstellungen der Berechnung (Rollen,
Reserve, Zusatzmenge, Wetterkorridor, Einheiten) stehen im letzten aufklappbaren Bereich.

<a id="fuel-step-5"></a>**5 Abflug.** Eine Zusammenfassung auf einer Seite: das Luftfahrzeug, die Route, wie sie aufgegeben wird, die Flugfläche
(und ihre Stufen), der Wind und seine Quelle, der Blockkraftstoff. „Flug starten“ startet den Flugplan (Anlassen,
Zurückstoßen, Rollen…). Die Vorbereitung kann mehrere Tage alt sein: Deshalb wird zuerst alles auf die tatsächliche
Uhrzeit gebracht — das Flugdatum springt auf jetzt zurück, Flugplatzwetter und Höhenwinde werden neu gelesen, die
Berechnung wird neu erstellt — und in einer Zeile gesagt, was sich geändert hat („Wind 273°/35 kt → 284°/44 kt · Block
684 → 644 kg · geplante Ankunft 15:03Z (17:03)“); offline wird das gesagt und mit der letzten Berechnung gestartet. Danach wird
die Abflugzeit eingetragen, die zur Anlasszeit des Berichts wird. Auf einem Telefon öffnet es die Karte, auf einem
großen Bildschirm bleibt es hier mit der Karte rechts. Den Abflugplatz danach zu ändern heißt, einen anderen Flug
vorzubereiten: Die Abflugzeit wird gelöscht. Die Ankunft nach dem Abflug zu ändern ist eine Umleitung: Die Zeit bleibt
erhalten, und die Umleitung wird vermerkt.

Sobald der Flug gestartet ist, zeigt das Ergebnis unten im Bildschirm „Flug gestartet um 11:14Z (13:14) · seit 1 h 10“. Die Zeiten sind UTC („Z“);
die Uhrzeit des Geräts steht in Klammern bei Abflug, geplantem Start und geplanter Ankunft. Ein
gestarteter Flug endet mit dem Schreiben seines Berichts: Beim Speichern kehrt Kraftstoff zur Vorbereitung zurück, und
Meine Flüge entfernt „laufend“. Um ohne Bericht zur Vorbereitung zurückzukehren: „Start abbrechen“ (nach Bestätigung).
Die Karte „Geplanter Fortschritt“ zeigt, wo der Flug theoretisch sein sollte: die geplante Überflugzeit an jedem Punkt
(Rollen, Steigflug, Reiseflug Abschnitt für Abschnitt mit seinem Wind, Sinkflug), den nächsten Punkt hervorgehoben, die
zurückgelegte und die verbleibende Entfernung und den geplanten Restkraftstoff. Sie folgt der Uhr, Minute für Minute,
bis zum Bericht oder zum Abbruch, und geht mit dem Flug an die Karte. Der hier vorbereitete Flug — Luftfahrzeug, Route,
Flugfläche, Steig- und Sinkprofil — wird geteilt: Karte und Bericht haben ihn schon.

## Leistungsdatenblätter <a id="fuel-sheets"></a>

Die Registerkarte „Datenblätter“ versammelt die Datenblätter der Fluggesellschaft, geteilt mit all ihren Geräten. Sie
sind nach Kategorie geordnet (Hubschrauber, Turboprops, Strahlflugzeuge, Kolbenmotoren, andere); jeder Typ, den die
Fluggesellschaft nutzt (Flotte, Referenz) und der noch kein Datenblatt hat, steht ebenfalls dort, „Leistungen
einzutragen“, mit „Datenblatt anlegen“.

- **Importieren**: eine Datei (Leistungs-CSV, JSON, `.lnmperf` von Little Navmap, SimBrief-OFP) oder eingefügter Text
  (dasselbe oder die Antwort von ChatGPT). Ein aus einem OFP gewonnenes Datenblatt wird an dessen echten Zeiten und
  Verbrauch kalibriert.
- **Nichts wird ohne Sie geschrieben**: Jede Änderung eines Datenblatts geht über eine Vorschau, eine Zeile pro Wert,
  vorher und nachher. Entfernen Sie das Häkchen bei dem, was Sie nicht übernehmen wollen, dann „Auswahl übernehmen“.
  Eine Zeile der Leistungstabelle, die entfernt würde, steht auch dort: ohne Häkchen bleibt sie.
- **Ein Datenblatt ergänzen**: „Ergänzen (EUROCONTROL)“ schlägt die bekannten Werte des Typs vor; solche, die einen
  bereits eingegebenen Wert ersetzen würden, kommen ohne Häkchen. „Aus anderem Datenblatt ergänzen“ füllt nur leere
  Felder.
- **ChatGPT**: „ChatGPT-Anfrage kopieren“ bereitet die Frage für den Typ vor (oder nur für die leeren Felder); fügen Sie
  sie in ChatGPT ein, dann dessen Antwort unverändert in das vorgesehene Feld, und „Lesen“.
- **Bearbeiten, exportieren**: Der Editor zeigt die Felder nach Gruppen. Auf einem Computerbildschirm wird die Tabelle
  Leistung / Durchfluss Zeile für Zeile bearbeitet; auf einem Telefon ist sie nur lesbar. Exporte `.lnmperf` und JSON;
  Löschen nach Bestätigung.

## Einstellungen und Einheiten

Unter „Einstellungen“ der Berechnung: Minuten für Rollen und Reserve, Prozentsatz der Zusatzmenge und ein
Reiseflugverbrauch nur für diesen Flug (er ersetzt den des Datenblatts). „Angezeigte Einheiten“ ändert Kraftstoff (kg
oder lb), Geschwindigkeit, Höhen und Entfernungen am Bildschirm; Flugflächen bleiben Flugflächen, und in den
Datenblättern ändert sich nichts.

## Sonderfälle

- **Ohne Datenblatt**: Die Berechnung beruht auf einer Schätzung des Typs, markiert „ungefähr“; importieren oder
  erstellen Sie so bald wie möglich ein Datenblatt.
- **Ohne bekannten Verbrauch**: Die Berechnung sagt es, statt eine irreführende Null anzuzeigen.
- **Unbekannte Route**: Die nicht erkannten Punkte werden aufgelistet; Entfernung und rechtweisender Kurs werden von
  Hand getippt.
- **Offline**: Alles wird auf dem Gerät berechnet, aus den bereits empfangenen Datenblättern. Nur SimBrief und das
  Wetter warten auf das Netz; der letzte OFP und das letzte Wetter bleiben auf dem Gerät gespeichert.
- **Wetter ohne Starter** (ein Telefon, ein Tablet): Die METAR kommen dann von metar.vatsim.net, ohne dass etwas
  einzustellen ist. Die TAF (nützlich, wenn Sie ein Flugdatum angeben) kommen von avwx.rest, mit Ihrem persönlichen
  Wetterschlüssel, einmal auf dem Gerät in den Einstellungen, Karte „Wetterschlüssel (TAF, avwx.rest)“, eingegeben; ohne
  Schlüssel sagt es die Karte, und das METAR antwortet stattdessen. Die Wetterkarte sagt, woher die Meldungen stammen.
  Ganz ohne Netz zeigt sie das zuletzt gespeicherte Wetter mit seiner Uhrzeit.

<!-- fr: f2764e9c409c -->

<!-- chapter: maps -->
# Karte

Ihren Flug auf einer Luftfahrtkarte und in seinem Vertikalprofil sehen, oder die Karten einer Mission: Lufträume,
Flugplätze, Funkfeuer, Luftstraßen, Mindesthöhen. Die Route des Flugs lässt sich auch auf der Karte ändern.

## So geht’s

**Der geplante Flug.** Die Karte zeigt den in Kraftstoff vorbereiteten Flug: Abflug, Routenpunkte, Ankunft, und den
Ausweichflugplatz grau gestrichelt. Hat das SimBrief-OFP eine SID oder eine STAR eingereicht, werden sie violett über der Route gezeichnet, mit Namen („SID ROYAN6P“). Seine Zusammenfassung (Flugfläche, Entfernung, geplant oder im Flug) steht nicht über der Zeichnung (die Zeichnung zeigt sie): der Tooltip des Griffs des Datenblocks unter der Karte nennt sie, mit Abflug und Ankunft, Ausweichflugplatz und Luftfahrzeugtyp. Ändert sich der Flug in Kraftstoff, folgt die Karte von selbst.

**Die Karte und was sie zeigt.** Rund um die Route: die Lufträume, die sie durchquert oder streift (Flugbeschränkungs-,
Gefahren- und Sperrgebiete, kontrollierte Lufträume), die unteren oder oberen Luftstraßen je nach Ihrer Flugfläche, die
Flugplätze und die Funkfeuer, und in jedem Ein-Grad-Feld die Mindestsicherheitshöhe (die braune Zahl, in Tausenden und
Hunderten Fuß: „3⁵“ bedeutet 3 500 ft). Die kleinen violetten Zahlen entlang der Route sind die Entfernungen ab dem
Abflug, in nautischen Meilen. Verschieben Sie die Karte mit einem Finger, spreizen Sie zwei Finger zum Zoomen;
„Zentrieren“ (das Zielsymbol oben rechts auf der Karte) kehrt zur ganzen Route zurück. Die Karte bleibt, wo Sie sie hingelegt haben, auch wenn sich die Route
ändert: nur „Zentrieren“ (oder ein anderer Flug) richtet sie neu aus. Von weitem gesehen zeigt die Karte nur, was nahe
der Route liegt; zoomen Sie hinein, um alles zu sehen.

<a id="maps-weather"></a>**Profil und Cursor.** Im Datenblock unter der Karte schneidet das Vertikalprofil die Route von Anfang bis Ende: das Gelände, die
Lufträume, in die Sie auf der geplanten Höhe einfliegen, und die Flugbahn in Violett. Fahren Sie mit dem Finger über das
Profil: Ein blauer Cursor folgt ihm, und derselbe Cursor stellt sich auf der Karte ein. Tippen Sie auf die Route auf der
Karte, um ihn dorthin zu setzen. Die Zeile unter dem Profil sagt, was unter dem Cursor liegt: Entfernung ab dem Abflug,
geplante Höhe, Geländehöhe und der Luftraum, in dem Sie sich an dieser Stelle befinden. Unter der Karte zeigt dieser
Datenblock das Profil; die Liste der Lufträume an einem Punkt oder die Meldepunkte eines Flugplatzes öffnen sich an
seiner Stelle, wenn Sie sie verlangen, und das Profil kommt beim Schließen zurück. Der Wolkenchip, (die drei Chips — Profil, Wolke, „i“ — stehen immer in der obersten Zeile rechts; einer ohne Inhalt ist nur ausgegraut), ersetzt es (der Profilchip bringt es zurück) durch den
Wetterschnitt entlang der Route (Wind, Temperatur, Wolken, Vereisung) auf der Flughöhe; der Schnitt folgt demselben Cursor, und ein Tippen darauf
verschiebt ihn. Er zeigt nur die Vorhersage, die Atmosphäre schon geladen hat: ohne sie führt die Zeile „Keine Vorhersage geladen“ zu Wetter unter Vorbereiten. Der letzte Chip „i“ (ausgegraut, solange die Zeichnung keine Legende hat) öffnet über dem Profil seine Legende (was jede Linie, Fläche und Marke ist); ein Wischen über den Wetterschnitt bewegt den Cursor wie beim Profil. Profil und Schnitt werden auf die genaue Höhe des Blocks gezeichnet, ihre Entfernungsachse bleibt immer sichtbar: in einem niedrigen Block entfallen Höhenbeschriftungen, nie die Achse.

<a id="maps-profile-zoom"></a>**Profil zoomen.** Um das Profil genau zu lesen, zoomen Sie auf einen Teil des Fluges: mit zwei Fingern spreizen oder zusammenziehen (die Mitte der Finger bleibt an ihrem Platz) und mit zwei Fingern ziehen, um das Fenster zu verschieben; ein einzelner Finger bleibt der Lese-Cursor. Die Höhenskala passt sich an das an, was das Fenster zeigt (daher kommt die Genauigkeit), die Entfernungsmarken (NM) rücken mit zusammen, und Punkte außerhalb des Fensters werden nicht gezeichnet. Ein Doppeltipp führt zum ganzen Flug zurück, ebenso die Schaltfläche „Ganzer Flug“, die in der obersten Zeile erscheint, solange das Profil gezoomt ist. Am Bildschirm: Strg + Mausrad zoomt um den Zeiger, Ziehen verschiebt das Fenster, ein Doppelklick führt zum ganzen Flug zurück. Der Zoom bleibt, solange die Seite geöffnet ist und die Route sich nicht ändert; er wird nie gespeichert. Der Wetterschnitt wird genauso gezoomt (dieselben Gesten, dieselbe Schaltfläche „Ganzer Flug“), und das Fenster ist für beide dasselbe: zoomen Sie in einem, wechseln Sie mit dem Chip zum anderen, und Sie finden denselben Flugabschnitt; der Schnitt passt auch seine Höhenskala an das an, was er zeigt.

**Ein feststehender Bildschirm.** Nichts zwischen Kopfzeile und Karte: die Karte und der Datenblock füllen den Bildschirm, und nichts scrollt außer dem Inhalt des Blocks. Die Schaltflächen liegen auf der Karte: rechts von oben „Route bearbeiten“ (der Stift), „Zentrieren“, der Kartenmodus, „Auf der Karte bearbeiten“ (die vier Pfeile) und zuletzt der Vollbildmodus (Esc verlässt ihn); links „Ebenen“. Der Block ist ein Blatt: Ziehen Sie seine obere Zeile (den kleinen Balken; in normaler Höhe trägt die Zeile über einem Profil oder Schnitt keinen Titel, nur die drei Chips) nach oben, um ihn zu vergrößern, nach unten, um ihn auf diese Zeile zu verkleinern, was der Karte die ganze Höhe
lässt; ein Tippen auf die Zeile klappt ihn ein oder bringt ihn auf seine normale Höhe zurück.

**Sechs Kartenmodi.** Die Modus-Schaltfläche rechts auf der Karte zeigt den gewählten Modus; tippen Sie darauf, um die
sechs Modi zu sehen. „IFR unten“: untere Flugwege, Lufträume, Mindesthöhen und Funkfeuer. „IFR oben“: obere Flugwege
(UN…, UM…), Lufträume über FL195. „VFR“: topografischer Hintergrund mit Städten, den für VFR wichtigen Lufträumen,
Meldepunkten und Hindernissen. „Topo“: das Gelände und, aus der Nähe, die Höhenlinien (alle 500 ft oder 100 m je nach
Ihrer Einheit, die Zähllinien beschriftet), nur mit Flugplätzen, Städten und Hindernissen. „OAT“: Militärflug, das IFR
Ihrer Flughöhe plus die Luftbetankungsstrecken, die NAT-Tracks des Tages, die Gebiete R, D, P, TSA, TRA, CBA und das
Tiefflugnetz in allen Höhen. „Auto“ wählt nach der Flugfläche Ihres Flugs (IFR oben ab FL195). Der Modus bleibt auf
diesem Gerät erhalten.

**Je näher Sie zoomen, desto mehr zeigt sie.** Von weitem zeigt die Karte nur die großen Flugplätze, die Flugwege und
ihre Namen. Näher: die Punkte der Flugwege (Dreiecke und Funkfeuer), die Mindestflugfläche jedes Flugwegs („F195“), dann
die Länge des Abschnitts, sein Kurs („097°“), die Meldepunkte und die Hindernisse. Aus der Nähe trägt jedes Hindernis
seine Höhe über Grund und die Höhe seiner Spitze in Klammern („434 AGL (771)“).

<a id="maps-layers"></a>**Ebenen.** Die Ebenen-Schaltfläche links auf der Karte öffnet im Datenblock, anstelle des Profils, die Liste dessen, was die Karte zeichnet (das ✕ bringt das Profil zurück). Zuerst, unter der Flugauswahl, der Regler „Komplexität“: Er wirkt, als wäre der Zoom ein anderer, eine Zoomstufe pro Raststellung (−4 bis +4) — nach links weniger, nach rechts mehr Details. Was jeder Zoom zeigt, legt der Administrator fest (Einstellungen, Karte „Verwaltung“). Dann die
Luftraumfamilien (TMA / CTR, D / R / P, FIR, andere), untere und obere Flugwege, Funkfeuer, Flugwegpunkte,
VFR-Meldepunkte, Hindernisse, Mindesthöhen, Städte, Gradnetz, Ausweichflugplatz, Namen der Lufträume, Namen der
Flugwege. Haken setzen oder entfernen: die Karte folgt, und Ihre Wahl bleibt für diese Einstellung auf diesem Gerät
erhalten. „Alles zurücksetzen“ kehrt zur ursprünglichen Wahl zurück. „Nur entlang der Route“, in IFR vorgewählt,
beschränkt Lufträume und Flugwege auf die Umgebung der Route; ohne Haken wird die ganze sichtbare Karte gezeichnet, um
anderswo zu schauen. Aus der Nähe wird ohnehin alles gezeichnet. Jedes Element der Karte hat seinen Zoombereich: VFR-Meldepunkte
erscheinen erst ganz nah, CTR aus der Nähe, TMA in mittlerer Ansicht, FIR von weitem. Auch die Größe der Karte zählt: In
einem kleinen Rahmen (Telefon, Fenster der Doppelansicht) zeigt sie bei gleichem Zoom weniger Elemente als in einem
großen, als wären Sie weiter weg (der Zoom wird um den Mittelwert aus Höhe und Breite des Rahmens korrigiert, 900 px
bedeuten keine Korrektur).

<a id="maps-airspaces"></a>**Antippen oder darüberfahren für mehr.** Tippen, klicken oder fahren Sie über den Namen eines Flugwegs, die
Beschriftung eines Luftraums oder eine Windfieder: eine kleine Blase nennt das Wesentliche in zwei Zeilen — für einen
Flugweg den Abschnitt (Punkt → Punkt), seine Länge, seine Kurse, Unter- und Obergrenze; für einen Luftraum seinen Namen
und seine Grenzen in AIP-Schreibweise („TMA 8 AQUITAINE 2000|FL145 D“). Anderswo in einem Luftraum angetippt, zeigt der
Datenblock unter der Karte die Lufträume unter Ihrem Finger, einen oder mehrere, anstelle des Profils: ein Diagramm der
Höhen wie das Vertikalprofil (eine nummerierte Säule je Luftraum, von der Untergrenze bis zur Obergrenze), dann die
nummerierte Liste mit ihren Grenzen, gelesen wie die senkrechte Achse: das Höchste oben (Nummer 1 ist der Luftraum mit der höchsten Obergrenze, links im Diagramm), das Niedrigste unten. FIR, UIR, SIV und Kontrollsektoren ohne Grenzen, wie jeder Luftraum von der Oberfläche bis zur Obergrenze, werden weder gezeichnet noch gezählt (man durchfliegt sie nicht): ihre Namen stehen in einer eingeklappten Zeile „Auch hier (n)“ unter der Liste und in einer letzten grauen Zeile der Hinweisblase („Auch hier: FIR PARIS · SIV POITIERS“), die FIR oder das SIV, das man ruft, ohne Säule. Das ✕, Escape oder ein Tippen auf eine leere Stelle der Karte schließen ihn und das
Profil kommt zurück, ein weiteres Tippen auf Lufträume ersetzt ihn; die Karte zu bewegen lässt ihn stehen. Die Karte
bewegt sich nicht und ändert ihre Größe nicht. Die Hinweisblase beim Darüberfahren folgt dem Zeiger, bleibt 5 Sekunden,
macht der nächsten Platz und schließt sich mit einem Tippen woanders oder einer Kartenbewegung. Über einer
Funkfeuer-Anlage nennt die Blase Art, Kennung und Frequenz; wo mehrere Anlagen am selben Ort stehen, behält die Karte
die nützlichste (VOR, TACAN oder DME, dann NDB, dann ILS) und die Blase nennt die anderen („auch hier: ILS 25L BG
109.9“). Auf dem Profil geben Finger oder Maus ebenso die durchflogenen Lufträume an.

<a id="maps-vfr"></a>**Die VFR-Meldepunkte eines Flugplatzes.** Fahren Sie mit der Maus über einen Flugplatz: seine Meldepunkte und die
Abläufe aus seinen VAC-Karten leuchten auf (benannte Kreise, Striche zwischen den Punkten). Auf der Karte trägt ein
Meldepunkt nur sein Kurzzeichen („NA“, „E“, „SE“ …), damit die Karte lesbar bleibt; der lange Name steht in der Blase
und in der Liste. Tippen Sie den Flugplatz an: Die Karte zoomt auf seine Punkte, wenn sie gedrängt sind, und der
Datenblock unter der Karte gibt anstelle des Profils die Liste der Punkte (Kurzzeichen, langer Name, Einschränkungen),
die Abläufe (mit der VAC-Seite), dann die Anweisungen der VAC, seitenweise eingeklappt; er scrollt, wenn der Inhalt lang
ist. Er bleibt offen, während Sie die Karte bewegen: das ✕ oder Escape schließen ihn und das Profil kommt zurück, ein
anderer Flugplatz ersetzt ihn. Das Antippen eines Meldepunkts öffnet ebenso den Inhalt seines Flugplatzes, dieser Punkt
zuerst. Im VFR-Modus werden die Punkte des Abflug- und des Ankunftsflugplatzes automatisch gezeigt. Diese Daten werden
automatisch aus den VAC extrahiert: Sie sind mit „zu prüfen“ gekennzeichnet und nicht die veröffentlichte Route; die
VAC-Karte hat Vorrang. Wurde der Flugplatz von Hand analysiert, sagt der Block es, die Routen tragen ihren Namen, ihre
Bahnen und Bedingungen, eine geprüfte Spur folgt der VAC-Karte (lange Striche) und ein Pfeil kennzeichnet eine
Einbahnroute. Die Meldepunkte der Datenbank sind immer da, schwarz für Flugzeuge und grün für Hubschrauber; die Abläufe
und Anweisungen der VAC kommen hinzu, sobald der Administrator sie importiert hat (Einstellungen › Wartung). Ein Meldepunkt ist eine einzige Zeile in der Liste und eine einzige Beschriftung auf der Karte, auch wenn Datenbank und
VAC-Karte ihn beide nennen: die Zeile behält die Beschreibung und die veröffentlichte Position der Datenbank und sagt „VAC-Position 1,2 NM entfernt“,
wenn die VAC-Karte ihn mehr als eine halbe Meile davon setzt.

<a id="maps-started"></a>**Im Flug.** Sobald der Flug in Kraftstoff gestartet ist, zeigt die Karte, wo Sie sein sollten (hohles Flugzeug,
„geplant 14:32Z“), und wo Sie sind (volles Flugzeug, nach Ihrem Kurs gedreht, mit der gepunkteten Spur der letzten 30
Minuten). In den Notizen des Datenblocks, unter dem Profil, nennt eine Zeile die Abweichung: voraus oder verspätet (Minuten und NM), wie viele NM neben der
Route, und Ihre Höhe gegenüber der geplanten; das Profil zeigt beide Höhen. Aus der Nähe trägt jeder Punkt seine
voraussichtliche Zeit (ETA) unter seinem Namen, nie über einem Flugplatz, in UTC („14:52Z“), die Ortszeit in Klammern bei Abflug und Ankunft. „Folgen“ hält die Karte auf Ihrer Position; ein Verschieben der Karte beendet es. Ohne
Position (GPS oder Netz nicht aktiviert) sagt es eine Benachrichtigung einmal, die Zeile bleibt in den Notizen, mit einer Schaltfläche „Position aktivieren“; eine Position, die älter als 2
Minuten ist, erscheint grau. Die Zeile endet mit der Quelle der Position: GPS, Netz, IVAO, VATSIM, X-Plane oder Little
Navmap. Die voraussichtlichen Zeiten erscheinen auch für einen in Kraftstoff datierten Flug, vor dem Abflug. Nach der Ankunft ersetzt die Notiz „Angekommen“ die Zeile und „Folgen“ verschwindet; eine Ausweichlandung wird in den Notizen genannt.

**Höhenwinde.** Hat Kraftstoff die Windvorhersage in der Flughöhe, zeigt die Karte sie als Windfiedern entlang der
Route: an jedem Punkt und alle 50 NM zwischen zwei Punkten. Der Schaft zeigt, woher der Wind kommt; ein Wimpel steht für
50 kt, eine Fieder für 10 kt, eine halbe Fieder für 5 kt. Tippen Sie eine Fieder an (oder fahren Sie mit der Maus
darüber): die Blase nennt Richtung, Stärke, Temperatur, Flughöhe und die Stunde der Vorhersage. Die Ebene „Höhenwinde“
blendet sie aus.

**Stufen.** Legt die Route in Kraftstoff an einigen Punkten eine Flugfläche fest, zeichnet das Profil die Stufen:
Steigflug, Reiseflug, neuer Steig- oder Sinkflug, mit neu berechnetem Ende des Steigflugs und Beginn des Sinkflugs.
Die Wegpunkte der Route sind auch auf dem Profil markiert.

**Steig- und Sinkflug.** Die violetten Rauten markieren das Ende des Steigflugs (TOC) und den Beginn des Sinkflugs
(TOD), auf der Karte wie im Profil. Sie stammen aus der Berechnung in Kraftstoff; ohne sie schätzt die Karte sie mit
üblichen Steig- und Sinkraten.

**Die Missionskarten.** Die Liste unten in den Ebenen (die Ebenen-Schaltfläche) wählt, was die Karte zeigt: den geplanten Flug oder eine Mission der
Fluggesellschaft. Für eine Mission wählt eine zweite Liste unter ihren Karten (Übersicht, Ziel, Detail…). Jede Karte
wird wie im Studio neu gezeichnet: gleicher Rahmen, gleiches Anzeigeprofil, mit den Punkten der Mission, ihren
schraffierten Gebieten und ihrer Route. Das Vertikalprofil zeigt dann das der Mission.

<a id="maps-edit"></a>**Die Route auf der Karte ändern.** Tippen Sie auf „Auf der Karte bearbeiten“ (die vier Pfeile, rechts auf der Karte; beim ersten Mal erscheint eine kurze Hilfe): die Wegpunkte erhalten einen
Kreis. Ziehen Sie einen Punkt auf einen Fix, ein Funkfeuer oder einen Flugplatz: er setzt sich dort (anderswo
losgelassen, wird er ein freier Punkt, nach seinen Koordinaten benannt, etwa 4530N00030E). Um einen Punkt hinzuzufügen,
tippen Sie auf „+“ (in derselben Spalte) und dann auf die gewünschte Stelle (oder halten Sie eine halbe Sekunde gedrückt):
auf einem Fix, einem Funkfeuer oder einem Flugplatz setzt er sich dort, anderswo ist es ein freier Punkt; er wird dem
nächstgelegenen Abschnitt hinzugefügt. Ein einfaches Tippen fügt nichts hinzu: es zeigt die Blase. Tippen Sie einen
Routenpunkt an: seine Karte nennt seine Flughöhe und bietet „Entfernen“ an. Abflug und Ankunft bewegen sich hier nicht.
Auf dem Profil ziehen Sie eine Flughöhe nach oben oder unten: sie ändert sich ab dem Punkt, der diesen Abschnitt
eröffnet, in Schritten von FL10 (auf dem ersten Abschnitt ist es die Flughöhe des Flugs); in der Karte eines Punkts tun
„−“ und „+“ dasselbe. „Rückgängig“ nimmt die letzte Geste zurück. Jede Änderung wird sofort im Flug gespeichert, und
Kraftstoff rechnet neu; das Profil folgt. Erneutes Tippen auf die Schaltfläche (oder Esc) schließt den Modus, und die Karte lässt sich wieder mit dem Finger
verschieben. Um die Route als Text einzugeben, öffnet der Stift oben in der rechten Spalte („Route bearbeiten“) den Schritt Route von Kraftstoff. Solange der Modus aktiv ist, behält die rechte Spalte nur „Auf der Karte bearbeiten“, „+“, „Rückgängig“, „Zentrieren“ und den Vollbildmodus.

## Ohne Netz

**Was ohne Netz funktioniert.** Karte, Lufträume, Flugplätze, Funkfeuer und Profil bleiben offline verfügbar für die
bereits angesehenen Gebiete und für die unter Einstellungen › Offline-Daten behaltenen. Behalten Sie dort das Gebiet
Ihres Flugs, bevor Sie losfliegen: Alles ist dann da, auch ohne Netz.

**Die Hintergrundkarte.** Der Hintergrund (Straßen, Städte, farbiges Gelände) kommt aus dem Internet. Ohne Netz wird
die Karte auf einem einfarbigen Hintergrund mit den Ländergrenzen gezeichnet, und eine Zeile weist darauf hin; alles
andere ist da.

**Das Gelände im Profil.** Das Gelände im Profil kommt ebenfalls aus dem Internet. Ohne Netz zeigt das Profil
stattdessen die Mindestsicherheitshöhe jedes durchquerten Felds (braun gestrichelt), und eine Zeile weist darauf hin.

## Sonderfälle

**Kein Flug.** Ohne vorbereiteten Flug ist die Karte leer und bietet „Kraftstoff öffnen“ an. Die Missionskarten bleiben über die Liste der Ebenen erreichbar.

**Flug über die Datumsgrenze.** Ein Flug über den 180. Längengrad (zum Beispiel von Sibirien nach Alaska) wird in einem Stück gezeichnet: die Karte setzt sich jenseits der Linie fort, Entfernungsmarken, Profil und Wetterschnitt folgen der Route, die mit Längen zwischen −180° und 180° gespeichert bleibt.

**Luftfahrtdatenbank fehlt.** Wurde die Luftfahrtdatenbank noch von keinem Gerät der Fluggesellschaft veröffentlicht,
zeigt die Karte nur die Route und sagt es einmal (Benachrichtigung, dann Notiz im Datenblock).

**Gebiet nicht behalten.** Offline, über einem nie angesehenen und nicht behaltenen Gebiet, hat die Karte nichts zu
zeigen; die Schaltfläche „Offline-Daten“ öffnet die Einstellungen, um es beim nächsten Mal zu behalten.

**Anderer Zyklus.** Jede Missionskarte merkt sich den Datenzyklus, mit dem sie erstellt wurde. Stammt die aktuelle
Datenbank aus einem anderen Zyklus, sagt es eine Zeile: Die Lufträume können sich seitdem geändert haben.

**Alte Mission.** Eine vor dieser Version gespeicherte Mission enthält ihr Anzeigeprofil nicht. Die Karte nimmt dann
das übliche Profil des Kartentyps (detailliert für ein Ziel oder ein Detail, sonst vereinfacht) und weist darauf hin.
Es genügt, die Mission im Studio zu öffnen und zu speichern, damit sie danach ihr eigenes behält.

<!-- fr: 462716f97b09 -->

<!-- chapter: report -->
# Bericht

Den Bericht eines Flugs mit wenigen Berührungen schreiben, mit oder ohne Einsatz: Das Modul übernimmt, was es über
Ihren Flug schon weiß, Sie ergänzen, Sie speichern — und, wenn Sie möchten, wird der Flug im selben Zug auf der Website
der Fluggesellschaft eingetragen.

## So geht’s

<a id="report-steps"></a>**Drei Schritte.** Der Bericht wird in drei Schritten ausgefüllt: Flug, Einsatz, Ergebnis. Auf einem Telefon ein
Schritt nach dem anderen („Weiter“ unten); auf einem Computer alle drei nebeneinander. Nichts ist Pflicht: Was fehlt,
wird im letzten Schritt genannt, ohne das Speichern je zu blockieren.

<a id="report-step-1"></a>**Der letzte Flug.** Ist Ihre IVAO- (oder VATSIM-)Kennung eingestellt (⚙) und das Gerät online, schlägt eine Karte Ihren
letzten Flug im Netz vor: „Übernehmen“ füllt Luftfahrzeug, Rufzeichen, Strecke und die aus der Spur gewonnenen Zeiten
aus. Der in Kraftstoff oder Karte vorbereitete Flug wird auf die gleiche Weise vorgeschlagen („Aktueller Flug“); wurde
er in Kraftstoff gestartet („Flug starten“), steht er an erster Stelle, „Flug gestartet um hh:mm“. Die Karte nennt in
einer Zeile alles, was übernommen wird, auch das, wofür eine Einsatzart kein Feld hat (Entfernung, Flugfläche).
„Übernehmen“ füllt auch die Anlasszeit (die Abflugzeit in Kraftstoff) und den Kraftstoff beim Start (den Blockkraftstoff
der Kalkulation) aus, alles in der Zeile „Vorausgefüllt aus: …“ unter dem Kartentitel festgehalten. Das Speichern des Berichts beendet den gestarteten Flug:
Kraftstoff kehrt zur Vorbereitung zurück, Meine Flüge entfernt „Laufend“, und der Flug wird nicht mehr vorgeschlagen.

**Die anderen Quellen.** Klappen Sie „Andere Quellen“ auf, um Ihren letzten IVAO- oder VATSIM-Flug, Ihren
SimBrief-Flugplan oder einen eingefügten Text zu übernehmen: einen ICAO-Flugplan, die Seite eines Flugs aus dem
IVAO-Tracker oder von StatSim, ein METAR. Nur leere Felder werden ausgefüllt; die Zeile „Vorausgefüllt aus: …“ unter dem Kartentitel nennt ihre Herkunft. Liefert
eine Quelle etwas anderes für bereits ausgefüllte Felder, bietet eine Schaltfläche an, sie zu ersetzen.

<a id="report-step-2"></a>**Der Einsatz.** Im zweiten Schritt: die Familie (vorgeschlagen nach Ihrem letzten Bericht), die Serie, die Kennung des
Einsatzes, wenn der Flug einem folgt, dann die Blöcke der Familie. Manche Blöcke erscheinen nur für eine Serie (zum
Beispiel VIP oder Überführung bei den Sondereinsätzen). Solange Sie diesen Schritt nicht geöffnet haben, steht dort
„prüfen“ statt ✓: Familie und Serie eines neuen Berichts sind standardmäßig übernommen.

<a id="report-step-3"></a>**Das Ergebnis.** Im letzten Schritt: das Ergebnis, Ihre Beobachtungen, die Besatzung (Sie zuerst, als Kommandant) und
der Kraftstoff beim Start und bei der Landung. Unstimmigkeiten — Zeiten in falscher Reihenfolge, Datum in der Zukunft,
Kraftstoff, der zunimmt — werden gemeldet.

<a id="report-save"></a>**Speichern.** Die Schaltfläche unten speichert den Bericht und gibt ihm beim ersten Speichern seine Nummer. Solange Sie
nicht gespeichert haben, bleibt Ihre Eingabe auf dem Gerät und wird beim nächsten Öffnen wiederhergestellt.

**Auf der Website eintragen.** „Speichern und auf der Website eintragen“ speichert und öffnet im selben Zug das Formular
„Flug hinzufügen“ der Website der Fluggesellschaft mit Ihrem Flug. Melden Sie sich bei Bedarf auf der Website an,
starten Sie das Lesezeichen „→ Vol“: Es füllt das Formular aus, ohne es abzusenden; prüfen Sie, dann senden Sie es auf
der Website ab. Die Schaltfläche ist ausgegraut, solange die Adresse der Website nicht eingestellt ist (Modul Website).

**Meine letzten Berichte.** Eingeklappt am Ende des ersten Schritts, eine Zeile je Bericht: Tippen Sie einen an, um ihn
wieder zu öffnen und zu ändern. „Neuer Bericht“ beginnt mit einem leeren Bericht.

## Das Vorausfüllen im Einzelnen

- **IVAO und VATSIM**: die Flüge der letzten sieben Tage Ihrer Kennung. Ein durch Verbindungsabbrüche unterbrochener
  Flug zählt als ein einziger Flug. Anlassen und Abstellen entsprechen Verbindung und Trennung, wenn die Spur am Boden
  beginnt und endet; Start und Landung stammen aus der Spur.
- **Die Zeiten** sind UTC, mit „(Z)“ an den Feldern; der gestartete Flug und das Netz füllen sie in UTC. Ein älterer
  Bericht, in der Uhrzeit des Geräts eingegeben, wird umgerechnet gezeigt, dazu in der Zeile unter dem Kartentitel die eingegebene Zeit („Start lokal
  eingegeben 18:30“); er wird nur in UTC neu geschrieben, wenn Sie ihn speichern.
- **SimBrief**: Ihr letzter Plan (Kennung in ⚙ eingestellt) — Luftfahrzeug, Route, Flugfläche, Geschwindigkeit,
  geplanter Kraftstoff, METAR und TAF.
- **Aus Meine Flüge**: „Bericht schreiben“ bei einem Flug öffnet einen neuen Bericht, bereits mit diesem Flug und seinem
  Datum ausgefüllt; „Bericht öffnen“ öffnet den vorhandenen wieder.

## Die Berichtsnummern

Mit einer Einsatzkennung folgt die Nummer dem Einsatz und zählt die Versuche (CRM-016-1, CRM-016-2…). Ohne Einsatz hat
jede Familie ihre eigene Folge (CRM-A01-0, CRM-A02-0… für HEMS). Bereits vergebene Nummern, auch die der Berichte der
vollständigen Suite, werden nie wiederverwendet.

## Das Lesezeichen „→ Vol“

Klappen Sie im letzten Schritt „Auf der Website der Fluggesellschaft“ auf und ziehen Sie den Link „→ Vol“ in die
Lesezeichenleiste Ihres Browsers. Es wirkt nur auf der Website: in der Liste der Luftfahrzeuge öffnet es das Ihres
Flugs; auf dessen Seite „Flug hinzufügen“; im Formular füllt es die Felder aus und meldet die Abweichungen. Auf einem
Telefon, wo Lesezeichen umständlich sind, legt „Felder kopieren“ die Zeile des Flugs in die Zwischenablage.

## Sonderfälle

- **Offline**: Alles wird auf dem Gerät geschrieben und gespeichert; der Bericht geht bei der nächsten Synchronisation
  hinaus. Nur die Netzquellen (IVAO, VATSIM, SimBrief) warten auf das Netz.
- **Ohne Starter**: IVAO und VATSIM sind nur über den Starter eines Rechners erreichbar; anderswo fügen Sie die Seite
  des Flugs (IVAO-Tracker, StatSim) in „Andere Quellen“ ein.
- **Ohne Trigramm**: Der Bericht wird trotzdem geschrieben; stellen Sie Ihr Trigramm ein (⚙), damit er auf Ihren Namen
  lautet.

<!-- fr: 7c1d42bd47bd -->

<!-- chapter: flightlog -->
# Meine Flüge

Alle Ihre vergangenen Flüge an einem Ort, eine Zeile pro Flug, vom neuesten zum ältesten: Ihre Berichte, das Flugbuch
der Website der Fluggesellschaft und Ihre IVAO- oder VATSIM-Verbindungen, ohne Doppelungen.

## So geht’s

<a id="flightlog-totals"></a>**Die Summen.** Oben drei Felder: die Anzahl der Flüge, die Blockstunden und die Flüge, die noch keinen Bericht haben,
für den gewählten Zeitraum. Direkt darunter die drei Muster, die Sie am meisten geflogen sind.

<a id="flightlog-filters"></a>**Die Filter.** Wählen Sie den Zeitraum (7 Tage, 31 Tage, 1 Jahr, alle), suchen Sie nach einem Rufzeichen, einem
Muster, einem Kennzeichen, einem Flugplatz, einem Einsatz oder einer Berichtsnummer, oder setzen Sie das Häkchen bei
„Ohne Bericht“, um nur die Flüge zu sehen, die auf einen warten. Ihre Auswahl bleibt auf dem Gerät: Beim nächsten
Besuch erinnert ein Chip daran („1 Jahr · LFRS ✕“) und entfernt sie mit einem Tippen. Ein „—“ statt der Blockzeit:
ein Bericht ohne Zeiten.

<a id="flightlog-list"></a>**Die Liste.** Eine Zeile pro Flug: Datum, Rufzeichen, Route und Blockzeit. Ein orangefarbener Punkt markiert einen Flug
ohne Bericht. Auf einem Computer zeigt die Zeile auch das Luftfahrzeug und die Nummer des Berichts.

<a id="flightlog-detail"></a>**Die Einzelheiten eines Flugs.** Tippen Sie auf eine Zeile, um sie aufzuklappen: woher der Flug stammt (Bericht,
Website-Flugbuch, IVAO- oder VATSIM-Netz), seine Uhrzeit, das Luftfahrzeug, der Einsatz und die Bemerkungen.

<a id="flightlog-report"></a>**Den Bericht schreiben oder öffnen.** Bei einem Flug ohne Bericht öffnet „Bericht schreiben“ einen neuen Bericht,
bereits mit diesem Flug ausgefüllt — Datum, Luftfahrzeug, Rufzeichen, Flugplätze — und mit einer vorgeschlagenen
Einsatzart. Bei einem Flug mit Bericht öffnet „Bericht öffnen“ ihn erneut zum Bearbeiten.

<a id="flightlog-current"></a>**Der laufende Flug.** Ein in Kraftstoff gestarteter („Flug starten“) und noch nicht berichteter Flug erscheint oben,
„Laufend — gestartet um hh:mm“ (eine Ausweichlandung wird angezeigt), noch bevor das Website-Flugbuch ihn kennt.
„Bericht schreiben“ öffnet den Bericht, der diesen Flug zuerst vorschlägt; sobald der Bericht gespeichert ist,
verschwindet die Zeile.

<a id="flightlog-more"></a>**Mehr.** Klappen Sie „Mehr“ auf, um die gefilterte Liste als CSV (Tabellenkalkulation) zu exportieren oder Ihre IVAO-
und VATSIM-Verbindungen neu zu lesen.

## Woher die Flüge kommen

- **Ihre Berichte**: die, die Sie geschrieben haben, einschließlich derer aus der vollständigen Suite. Ein Bericht der
  vollständigen Suite öffnet sich in der vollständigen Suite.
- **Das Website-Flugbuch**: Ihre Zeilen im „Log des vols“ der Fluggesellschaft, übernommen vom Modul Website (Einfügen
  oder Lesen durch den Starter).
- **Das Netz**: Ihre IVAO- und VATSIM-Verbindungen der letzten sieben Tage (Kennungen eingestellt unter ⚙). Sie werden
  angezeigt, nie als Flüge gespeichert.
- **Ohne Doppelungen**: Derselbe Flug (gleiches Datum, gleiches Rufzeichen, gleiches Kennzeichen) erscheint nur einmal.
  Der Bericht geht vor dem Flugbuch, das Flugbuch vor dem Netz; ein Bericht ohne Stunden übernimmt die Blockzeit aus
  dem Flugbuch.

## Sonderfälle

- **Offline**: Die bereits empfangenen Berichte und das Flugbuch werden angezeigt; das Netz wartet auf die Verbindung.
- **Ohne Starter**: IVAO und VATSIM lassen sich nur über den Starter eines Rechners neu lesen.
- **Ohne Kürzel**: Stellen Sie es ein (⚙); es wählt Ihre Berichte und Ihre Zeilen im Flugbuch aus.

<!-- fr: ec2aee8de0eb -->

<!-- chapter: website -->
# Website der Fluggesellschaft

Die Verbindung zwischen der App und der Website der Fluggesellschaft, die keine Schnittstelle für Anwendungen hat: Ihr
Flugbuch und ihre Flotte kommen per Kopieren und Einfügen (oder über den Starter eines Rechners), und die Adresse der
Website wird hier eingestellt, einmal für die ganze Fluggesellschaft.

## So geht’s

**Mein Flugbuch.** Öffnen Sie auf der Website die Seite „Log des vols“ (der Link „Seite öffnen“ führt dorthin), alles
markieren, kopieren, dann in das Feld der Karte einfügen und „Lesen“. Nur Ihre Zeilen, die Ihres Trigramms, werden
behalten; sie speisen Meine Flüge.

**Flotte der Fluggesellschaft.** Derselbe Handgriff mit der Seite „Flotte“ der Website: die Luftfahrzeuge, ihre
Rufzeichen, ihre Basis und ihr Standort. Bericht und Karte nutzen sie.

**Nichts wird ohne Sie geschrieben.** Nach „Lesen“ sagt eine Vorschau, was sich ändert: neue, geänderte, unveränderte
Zeilen oder Luftfahrzeuge (und beim Flugbuch die Zeilen der anderen Piloten, ignoriert). „Speichern“ schreibt,
„Abbrechen“ lässt alles wie zuvor.

**Über den Starter lesen.** Auf einem Rechner, auf dem die App vom Starter bereitgestellt wird, holt „Über den Starter
lesen“ die Seite der Website für Sie, ohne Einfügen, und zeigt dann dieselbe Vorschau. Wo die Website nicht erreichbar
ist (Telefon ohne Starter), verschwindet die Schaltfläche und das Einfügen bleibt der Weg.

**Die Fluggesellschaft.** Die Karte Fluggesellschaft gibt den Namen, die Adresse der Website und den Pfad ihrer Seiten
an („Flug eintragen“, Flugbuch, Flotte, Seite eines Luftfahrzeugs). Sie wird an einem Computerbildschirm
bearbeitet und auf einem Telefon nur angezeigt. Diese Einstellung gilt für die ganze Fluggesellschaft; sie schaltet im
Bericht „Speichern und auf der Website eintragen“ frei.

## Gut zu wissen

- **Die App schreibt nie auf die Website** und kennt Ihr Passwort nie: Sie melden sich selbst auf der Website an, und
  das Lesezeichen „→ Vol“ des Berichts füllt das Formular aus, ohne es abzusenden.
- **HTML einfügen**: Wer die Seite aus dem Browser kopiert, behält die Links der Luftfahrzeuge; „Aus der Zwischenablage
  einfügen“ liest sie direkt, wenn der Browser es erlaubt.
- **Das Flugbuch wird ergänzt**: Die Zeilen, die die Seite der Website nicht mehr zeigt (frühere Seiten), bleiben
  erhalten.
- **Die Flotte wird zusammengeführt**: Ein Luftfahrzeug der Seite ersetzt das schon bekannte (seine zusätzlichen
  Rufzeichen bleiben erhalten); die nicht auf der Seite stehen, bleiben.

## Sonderfälle

- **Ohne Trigramm**: Das Flugbuch kann Ihre Zeilen nicht auswählen; stellen Sie es ein (⚙).
- **Adresse nicht eingestellt**: Die Links zu den Seiten und das Eintragen des Flugs warten auf die Karte
  Fluggesellschaft.
- **Offline**: Das Einfügen funktioniert immer; was gespeichert ist, geht bei der nächsten Synchronisierung hinaus.

<!-- fr: cfdf162727aa -->

<!-- chapter: atmosphere -->
# Wetter

Die Atmosphäre entlang des in Kraftstoff vorbereiteten Flugs: eine Wetterkarte in der gewählten Höhe, der senkrechte
Schnitt der Route, der Schnitt eines Punkts, zur Abflugzeit oder später.

## So geht's

**Der Flug.** Wetter zeigt immer den in Kraftstoff vorbereiteten Flug (Route, Höhe, Flugdatum). Ohne geplanten Flug
sagt die Seite es und führt zu Kraftstoff; „Beispiel ansehen" zeigt einen Vorführflug, im Griff als solcher markiert.

**Die Vorhersage laden.** Die Ladeschaltfläche (der Pfeil nach unten, rechts auf der Karte) liest die Vorhersage entlang
der Route und um sie herum. Beim Öffnen wird nichts abgefragt: die Seite zeigt, was das Gerät schon gespeichert hat.
Außerhalb des Fluggebiets zeigt die Karte die mit der Anwendung veröffentlichte Weltsynoptik, ohne etwas abzufragen.

**Die Wetterkarte.** Isobaren, Isothermen, Wolken, Wind, Jetstream und Konvektion in der mit dem Höhenchip gewählten
Höhe („Boden", die angeforderte Höhe, die berechnete Bahn oder eine feste Höhe). Die Ebenen-Schaltfläche (oben links)
wählt, was gezeichnet wird. Tippen Sie auf einen Punkt der Karte, um seinen Schnitt zu öffnen.

**Das Fluggebiet und die Welt.** Eine dünne Linie umgibt das Fluggebiet: innen die für den Flug geladene feine Vorhersage
(Météo-France AROME 1,3 km und ARPEGE 0,1° über Frankreich, ICON in Europa); außen die Weltsynoptik (NOAA GFS, mit
einem 5°-Raster veröffentlicht). Die beiden Modelle sagen nicht ganz dasselbe: ein Sprung der Linien an der Grenzlinie
ist normal. Das Ebenen-Feld nennt beide Modelle und ihr Raster.

**Das Flugdatum.** Der Regler unter dem Griff verschiebt die Zeit von 0 bis 72 Stunden nach dem geplanten Abflug: Karte,
Schnitt und Punktschnitte folgen.

**Der Schnitt und die Punktschnitte.** Unter der Karte zeigt der Schnitt die Route von Anfang bis Ende, vom Boden bis
über die Flughöhe. Tippen Sie darauf, um den Schnitt des nächsten Punkts zu öffnen (das senkrechte Profil der
Atmosphäre dort); ◀ und ▶ wechseln zum Nachbarschnitt, ✕ kehrt zum Schnitt zurück. Die Zeichnung passt immer in den
Block, ihre Entfernungsachse sichtbar; vergrößern Sie den Block für mehr Einzelheiten.

**Den Schnitt zoomen.** Ziehen Sie den Schnitt mit zwei Fingern auf (oder Strg + Mausrad), um nur einen Teil zu zeigen,
und verschieben Sie ihn mit zwei Fingern; Entfernungen, Punkte, Winde und die Höhenskala folgen dem gezeigten Teil. Ein
einzelner Finger behält seine Rolle (Punktschnitt öffnen, Block verschieben). „Ganzer Flug" in der Griffzeile, ein
Doppeltipp oder ein Doppelklick kehren zur ganzen Route zurück; eine Routenänderung ebenfalls.

**Die Legende.** Der Chip „i" in der Griffzeile rechts (nach ◀ und ▶) zeigt die Legende des Gezeichneten; ein Tippen auf
die Legende, den Chip oder Escape schließt sie.

- Schnitt: berechnete Bahn (durchgezogen: Steigflug, Reiseflug, Sinkflug), geplante Höhe (gestrichelt), angeforderte
  Höhe (gepunktet), Steigflugende und Sinkflugbeginn (TOC, TOD), Wolken (grau, dunkler: mehr Bedeckung), Isothermen
  alle 5 °C (0 °C dick blau), Inversionen und Vereisung (Schraffur), Wind (Fiedern: halb 5 kt, voll 10, Wimpel 50),
  geschätzte Cumulus-Basis (grau gepunktet), Gelände, Routenpunkte (senkrechte Linien); bei einem hohen Block die
  Bänder unten: tiefe, mittlere, hohe Bewölkung, Niederschlag, Sicht unter 8 km.
- Punktschnitt: Temperatur (rot), Taupunkt (grün), Normatmosphäre (gestrichelt), die drei Höhen des Flugs an diesem
  Ort, Inversionen, Wolken (Spalte rechts), Wind, Gelände.

## Gut zu wissen

- Die Vorhersage kommt von Open-Meteo (Météo-France AROME und ARPEGE über Frankreich, ICON in Europa, GFS anderswo);
  die Weltsynoptik kommt von GFS (NOAA), alle 3 Stunden bis 72 Stunden.
- Das Geladene bleibt auf dem Gerät und dient offline; die Karte übernimmt seinen Wetterschnitt.

<!-- fr: 0d64bc05e5c1 -->

<!-- chapter: settings -->
# Einstellungen

Die Einstellungen dieses Geräts (⚙ oben am Bildschirm): Ihre Identität, was die App Ihnen zeigt, wie Daten ausgetauscht
werden und was das Gerät offline behält. Sie bleiben auf dem Gerät, nie synchronisiert.

## So geht’s

**Der Status.** Der Bildschirm öffnet sich mit dem Block „Status“, mit demselben Punkt wie die Schaltfläche ⚙ der Kopfzeile
(grün: etwas Neues; orange: Aufmerksamkeit). Eine Zeile pro Sache, zum Handeln antippen: der laufende Flug (zur Karte), die zu
schreibenden Berichte (zum vorausgefüllten Bericht), das fehlende Kürzel (zu „Identität“), die Luftfahrtdatenbank, solange
sie nicht bereit ist (zu „Datenzugang“), der Zustand der Daten und der genutzte Austauschweg (zu „Synchronisation“ oder zu den
Konflikten), der Starter, „Offline“ und auf einem Telefon die Position während eines Flugs.

**Die Gruppen.** Auf der Stufe Einstieg zeigt der Bildschirm höchstens sieben Karten untereinander: Identität,
Datenzugang, Synchronisation (wenn sie gebraucht wird), Nutzungen, Stufe, Design und Über. Die Sicherung, die
Offline-Daten, der Wetterschlüssel, die Little-Navmap-Profile und der Zugang des Rechners kommen ab der Stufe Alltag.
Auf den Stufen Alltag und Vollständig sind die Karten unter sieben Titeln geordnet, in der Reihenfolge, in der man die
Dinge einstellt: Identität, Zugang, Daten, Gerät, Anzeige, Verwaltung (Stufe Vollständig) und Hilfe. Jeder Titel ist
eingeklappt; tippen Sie ihn an, um ihn zu öffnen. Eine Gruppe, die Aufmerksamkeit braucht (eine Warnung, ein Fehler oder
die Karte, zu der eine orange Statuszeile führt), öffnet sich von selbst, mit einem orangen Punkt; eine Zeile des Blocks
„Status“ öffnet die Gruppe ihrer Karte. Eine von Hand geöffnete Gruppe bleibt offen, solange die Seite offen ist. Die
Karten des Augenblicks (gefundene V2-Einstellungen, erhaltene Konfiguration, Fortsetzung des Beitritts) stehen auf jeder
Stufe oben und verschwinden, sobald sie erledigt sind. Eine über ihre Adresse geöffnete Karte (etwa die Schaltfläche
„Offline-Daten“ des Assistenten „Der Fluggesellschaft beitreten“) wird allein gezeigt, auf jeder Stufe; „← Einstellungen“
führt zur Liste zurück.

**Ihre Identität.** Tippen Sie unter „Identität“ Ihr Kürzel und Ihre IVAO-VID, VATSIM-CID und SimBrief-ID, dann
„Speichern“. Die Werkzeuge nutzen sie zum Vorausfüllen; mit mehreren Nutzern ist das Kürzel nötig.

**Die Stufe.** „Stufe“ wählt, was das Menü zeigt: Einstieg, Alltag oder Vollständig, mit einem Tippen. Unter jeder Wahl
sagt die Zeile „Menü:“, welche Werkzeuge sie zeigt; ein ausgeblendetes Werkzeug bleibt über seine Adresse erreichbar.

**Das Design.** „Design“ zeigt eine Vorschau je Aussehen — Standard, Kabinett, Robust — und den Ton: Automatisch (wie
das System), Tag oder Nacht. Ein Tippen wendet es sofort an, nur auf diesem Gerät. Ein dem Computer vorbehaltenes
Design gilt nicht auf einem Telefon: Die Karte sagt, welches stattdessen gezeigt wird, und seine Vorschau ist markiert;
ein Tippen auf eine Vorschau ersetzt diese Wahl.

**Die Nutzungen.** Der Satz oben in „Nutzungen“ sagt, wie Daten ausgetauscht werden. Ohne angekreuztes Kästchen sind Sie
„Allein auf diesem Gerät“: Nichts geht anderswohin. Kreuzen Sie „Allein, auf mehreren Geräten“ oder „Mehrere Nutzer
(Git-Datenrepository)“ an, um auszutauschen. Auf einem vom Starter bedienten Rechner liest und schreibt die App bereits
den Ordner `data/` des Starters, auch ohne angekreuztes Kästchen; eine Austauschnutzung teilt ihn zusätzlich über git.

**Der Datenzugang.** Auf einem Telefon oder auf der Website stellen Sie unter „Datenzugang“ das Repository
(Konto/Repository), den Zweig und Ihr persönliches Token ein, dann „Testen“ und „Speichern“. Auf einem vom Starter
bedienten Rechner gibt es kein Token; solange `data/` kein Git-Repository ist, öffnet die Karte den Weg, es zu holen
oder zu übernehmen; sein entferntes Repository wird in der Karte „Verwaltung“ eingestellt (siehe „Ein Git-Repository
für data/“).

**Ohne Zugang und ohne Starter keine Basen.** Ein Gerät ohne eingestellten Zugang und ohne Starter — etwa die Website,
zum ersten Mal auf einem Telefon geöffnet — hat weder die Luftfahrtdatenbasis (Lufträume, Flugplätze, Funkfeuer) noch
die Flugzeugbasis: „Offline-Daten“ sagt es. Zwei Wege: Stellen Sie den Zugang zum Datenrepository ein, auch ohne
Austausch anzukreuzen (er liest dann nur die Basen); oder veröffentlichen Sie auf einem Rechner mit Starter die Basen im
Repository (V2: Einstellungen › Wartung › Luftfahrtdaten und Luftfahrzeugtypen), dann synchronisieren. Drei getrennte Zustände, wenn die Basis fehlt: „Luftfahrtdatenbank wird geladen…“ (das Lesen ist nicht beendet: warten), „Datenzugriff auf diesem Gerät nicht eingerichtet“ (Zugang oben einrichten; eine zum Home-Bildschirm hinzugefügte App hat ihren eigenen Speicher, nichts aus Safari ist dort) und „Luftfahrtdatenbank nicht veröffentlicht“ (der Zugang funktioniert, im Repository ist nichts veröffentlicht).

**Die Synchronisation.** Mit angekreuztem Austausch zeigt die Karte „Synchronisation“ den letzten Erfolg, die
ausstehenden Änderungen und das Netz; „Jetzt synchronisieren“ sendet und empfängt sofort. Sonst läuft sie von selbst
beim Start, alle 10 Minuten online und bei Rückkehr des Netzes. Solange Änderungen ausstehen, listet die Karte sie auf,
die neuesten zuerst: Pfad, Modul und Uhrzeit, ✕ für eine Löschung, mit dem letzten Fehler, falls es einen gibt.

**Die Sicherung.** Allein auf diesem Gerät bewahrt „Exportieren (eine Datei)“ alle Ihre Daten in einer Datei auf: Sie
ist die einzige Kopie. „Importieren (zusammenführen)…“ übernimmt sie, ohne hier etwas zu verlieren; „Durch eine Datei
ersetzen…“ löscht zuerst, was auf dem Gerät ist.

**Die Offline-Daten.** Jede veröffentlichte Zone hat ihre Zeile: ihren Status auf diesem Gerät, ihren Zyklus und ihre
Größe. „Offline behalten“ lädt sie ganz herunter (am besten im WLAN); „Freigeben“ gibt den Platz zurück.

## Der Wetterschlüssel

METAR funktioniert ohne Schlüssel. TAF braucht auf einem Gerät ohne Starter (Telefon, Website) einen persönlichen und
kostenlosen avwx.rest-Schlüssel: „Schlüssel auf avwx.rest erstellen ↗“ öffnet die Seite des Anbieters. Fügen Sie ihn
unter „Wetterschlüssel (TAF, avwx.rest)“ ein, dann „Speichern“; „Testen“ fragt das TAF eines Flugplatzes ab, „Löschen“
entfernt ihn. Der Schlüssel bleibt nur auf diesem Gerät (zusammen mit Ihrer Identität gespeichert: Er überlebt das Schließen des Browsers), nie im Repository oder in einer Sicherung, und wird nie wieder
angezeigt. Auf einem vom Starter bedienten Rechner ist er unnötig: Der Starter liefert das TAF.

## Little-Navmap-Profile

Auf einem vom Starter bedienten Rechner verbindet die Karte „Little-Navmap-Profile (.lnmperf)“ Ihre Leistungsprofile
in beide Richtungen mit den .lnmperf-Dateien eines Ordners. Wählen Sie den Ordner (der von Little Navmap wird
vorgeschlagen, wenn er gefunden wird) und dann „Speichern“. Danach ist nichts zu tun: ein in Kraftstoff geändertes
Profil schreibt seine Datei neu, eine in Little Navmap geänderte Datei aktualisiert das Profil, eine neue Datei wird
ein Profil. Hat sich derselbe Wert auf beiden Seiten geändert, gewinnt der neueste, der andere bleibt im Profil
erhalten; die Abgleich-Schaltfläche meldet es. Eine Datei wird nie gelöscht: die Datei eines entfernten Profils kommt
in den Unterordner `_removed`. „Jetzt abgleichen“ macht den Durchgang sofort, „Beenden“ trennt die Verbindung. Profile,
denen ein von Little Navmap verlangter Wert fehlt, werden aufgeführt und nicht geschrieben. Auf einem Telefon lädt
Kraftstoff das Profil als .lnmperf-Datei herunter.

## Die API-Schlüssel der Fluggesellschaft

Auf einem vom Starter bedienten Rechner klappt auf der Stufe Vollständig die Schaltfläche „API-Schlüssel der
Fluggesellschaft (IVAO)“ der Karte „Verwaltung“ die Einstellung des IVAO-API-Schlüssels auf: Er bleibt im Ordner
`secrets/` des Starters, nie im Browser oder in den Daten. „Testen“ prüft, ob IVAO antwortet; „Löschen“ entfernt ihn.

## Das Tablet neben dem Simulator

Sie fliegen am Rechner (X-Plane) und möchten die Karte auf einem Tablet oder Telefon: Auf dem Rechner, den der
Starter bedient, öffnet „Zugang des Rechners“ die Pilot-App für Geräte im selben lokalen Netz (oder starten Sie
`lancer.cmd --lan`).

1. **Für Geräte im lokalen Netz öffnen**: Die Karte zeigt die auf dem Gerät zu öffnende Adresse, ihren QR-Code und
   einen 6-stelligen Kopplungscode. Windows fragt eventuell, ob Python erlaubt werden soll: nur für private
   Netzwerke zulassen.
2. Scannen Sie auf dem Tablet den QR-Code mit der Kamera (oder tippen Sie die Adresse), dann geben Sie den Code ein.
   Er wird nur **einmal pro Gerät** abgefragt.
3. Das Tablet sieht dann die Daten des Rechners, die Position des Simulators im Flugabzeichen und oben „Starter auf
   <Rechner>“.

- **Nur in einem vertrauenswürdigen Netz**: Alles läuft über http, unverschlüsselt. Zu Hause ja; in einem
  öffentlichen oder Hotel-WLAN nie.
- Der Zugang schließt sich mit dem Starter oder mit „Zugang schließen“. Ein gekoppeltes Gerät bleibt gekoppelt;
  „Geräte vergessen“ verlangt von allen erneut einen Code (zum Beispiel bei einem verlorenen Tablet).
- Auf dem Tablet funktioniert die App nicht offline und nutzt nicht sein GPS: Der Browser gewährt beides nur über
  https. Die Position kommt vom Simulator des Rechners.
- Ein Code gilt nur einmal und 10 Minuten: „Neuer Code“ gibt einen anderen. 5 falsche Codes von einem Gerät: eine
  Minute Wartezeit; 30 in einer Stunde: Die Kopplung schließt sich bis zum nächsten „Neuer Code“. „Vergessen“ neben
  einem Gerät (mit seinem Kopplungsdatum, in UTC) entfernt nur dieses.
- Nur die Hauptadresse des Rechners wird geöffnet; die anderen (VPN, virtuelle Maschinen) nur über „Auch öffnen“. Eine
  Adresse, die sich nicht öffnen lässt, wird in der Karte genannt; das Fenster des Starters sagt, warum.

## Ein Git-Repository für data/

Auf einem vom Starter bedienten Rechner zeigt auf der Stufe Vollständig die Schaltfläche „Entferntes Repository von
data/“ der Karte „Verwaltung“ das entfernte Repository von `data/`: seine Adresse und seinen Zweig. Um es einzustellen oder zu ändern, tippen Sie die Adresse (`git@host:konto/repo.git` oder `https://…`,
ohne Passwort oder Token darin): „Prüfen“ sagt, ob das Repository antwortet, „Speichern“ stellt es ein. Für eine andere Adresse als die der Konfiguration öffnet sich ein Ja-/Nein-Fenster auf dem Computer, nicht auf der Seite: Die Karte sagt es vor dem Klick; beantworten Sie es (es kann hinter anderen Fenstern liegen), dann kehren Sie zurück. Abgelehnt, geschlossen oder schon geöffnet: Die Karte nennt den Grund, und `data/` bleibt, wie es ist. Das ist gewollt: Eine präparierte Seite darf Ihre Daten nicht anderswohin senden können. Nichts blockiert: Ein
Repository, das nicht antwortet, wird nur gemeldet.

- **Der Zugang zum Repository** wird auf dem Computer eingestellt: ein SSH-Schlüssel für eine Adresse `git@…`, in Git
  gespeicherte Zugangsdaten für eine Adresse `https://…`.
- **Mehrere Nutzer über git** brauchen dieses entfernte Repository: Ohne es führt das Kästchen „Mehrere Nutzer“ nirgends
  hin, und die Karte „Nutzungen“ erinnert daran.
- **data/ fehlt oder ohne git**: Die Karte „Datenzugang“ öffnet einen Weg, auf jeder Stufe. `data/` ist ein vom Code-Repository ignorierter Ordner;
  er wird ein eigenes Git-Repository, verbunden mit dem Datenrepository (kein Submodul). Tippen Sie die Adresse des
  Datenrepositorys und bei Bedarf einen Benutzernamen und ein Passwort oder Token (nie von der Seite gespeichert;
  „Merken“ überlässt sie Git auf diesem Computer). Ohne `data/` klont „Daten holen“ es; bei einem `data/` ohne git
  (Beispieldaten oder Archiv) verbindet „data/ in dieses Repository übernehmen“ es mit dem Repository. Die Karte verfolgt
  die Arbeit und liest den Zustand am Ende neu; ein Fehlschlag wird erklärt, nichts geht verloren.

## Einen Piloten einrichten

**Die Konfiguration vorbereiten (Administrator).** Tippen Sie auf einem vom Starter bedienten Rechner oder auf einem
für GitHub eingerichteten Gerät auf der Stufe „Vollständig“ in der Karte „Verwaltung“ auf „Konfiguration für einen Piloten exportieren“: Sie nennt
Ihre Schritte der Reihe nach. Laden Sie zuerst den GitHub-Namen des Piloten mit der Rolle Write in das Repository ein
(der Link führt zur Seite der Mitwirkenden des Repositorys). Geben Sie dann sein Kürzel und die Adresse der
veröffentlichten App ein, dann „Datei und Link erstellen“: Die Datei sog-config-<TRI>.json wird gespeichert, der Link
und sein QR-Code werden angezeigt. Sie enthalten die Fluggesellschaft, das Datenrepository, das Kürzel und die Anleitung
für das Token, nie ein Token oder Geheimnis; der Eigentümer des Repositorys (Benutzer oder Organisation) ist darin
vermerkt und bestimmt, welches Token zu erstellen ist. Senden Sie den Link oder die Datei, oder lassen Sie das Telefon
des Piloten den QR-Code scannen.

**Der Fluggesellschaft beitreten (Pilot).** Der Link, der QR-Code, „Konfiguration importieren…“ oder „Der
Fluggesellschaft beitreten…“ (Karte „Datenzugang“) und die Begrüßungskarte beim ersten Öffnen öffnen den Assistenten
„Der Fluggesellschaft beitreten“, ein Bildschirm pro Schritt: die erhaltene Konfiguration; das Konto (bei Bedarf mit dem
Registrierungslink erstellen) und der Benutzername; die anzunehmende Einladung; das Token, Schritt für Schritt
(klassisch für das Repository eines Benutzers, feingranular für das einer Organisation); das eingefügte und getestete
Token; die Netzwerk-IDs; zuletzt „Abschließen und synchronisieren“, dann die Offline-Daten. Angekreuzte Kästchen bleiben
auf dem Gerät: Eine Karte der Einstellungen bietet an, dort fortzusetzen, wo Sie waren. Das Tutorial „Der
Fluggesellschaft beitreten“ folgt denselben Schritten.

**Nicht mehr als die Datei.** Nur was die Konfiguration enthält, wird eingerichtet, und der Zugang wird erst
gespeichert, wenn das Token getestet ist; „Testen“ sagt, was nicht stimmt: Einladung noch nicht angenommen, Token falsch
kopiert oder abgelaufen, Token ohne Recht auf den Inhalt. Ein klassisches Token öffnet alle Repositorys des Kontos: Für
das Repository eines Benutzers wird ein eigenes GitHub-Konto nur für das Fliegen empfohlen. Eine Datei in einem anderen
Format wird mit einer Meldung abgelehnt. Die Fluggesellschaft wird nur ins Repository geschrieben, wenn es noch keine
hat. Auf einem Rechner, dessen data/ diesem Repository bereits folgt, überspringt der Assistent Konto und Token. Ohne
Starter erreicht die App nur ein GitHub-Repository: Richten Sie den Zugang für ein Repository auf framagit oder GitLab
auf einem Rechner mit Starter ein.

## Verwaltung

**Die Verwaltungsseiten.** Auf der Stufe „Vollständig“ (Karte „Stufe“) sammelt die Karte „Verwaltung“ unter „Über“ die
Verwaltungs- und Testseiten, **eine Schaltfläche pro Seite**, jede mit einem Satz; auf den anderen Stufen erscheint sie nicht, und nichts vom Administrator steht auf den anderen Karten. In der App: die Schaltfläche
„Abstimmung der Kartenschwellen“ (`#maps?tune=1`, auf einem Telefon nur lesbar; sie öffnet die Abstimmungsseite: für jedes Kartenelement und jeden Modus die Zoomstufen, in denen es erscheint, für die Fluggesellschaft gespeichert, `airline/map_profiles.json`; ein Modus, den Sie nie gespeichert haben, übernimmt die Schwellen eines abgestimmten Modus, die Seite sagt es; der Regler „Komplexität“ der Karte verschiebt nur den Zoom), zurück mit dem Zurück-Pfeil; die Schaltfläche „Grenze der Flugzone“, die ein Kästchen
„Linie der Flugzonengrenze anzeigen“ aufklappt (sofort für die Fluggesellschaft gespeichert, mit den Schwellen, in `airline/map_profiles.json`,
Schlüssel `edge`; die Linie wird angezeigt, bis Sie etwas einstellen); die Schaltfläche „Konfiguration für einen Piloten exportieren“ (siehe „Einen Piloten einrichten“); auf einem vom
Starter bedienten Rechner die Schaltflächen „Entferntes Repository von data/“ und „API-Schlüssel der Fluggesellschaft
(IVAO)“, die ihre Einstellung aufklappen (siehe „Ein Git-Repository für data/“ und „Die API-Schlüssel der
Fluggesellschaft“);
der Fahrplan (`#roadmap`) und die Diagnose der Karte „Über“.

<a id="settings-sources"></a>**Datenquellen.** Die Taste „Datenquellen“ (`#sources`, Stufe Vollständig) listet die Quellen der Luftfahrtdaten, die die Suite nutzt, erwägt oder zurückgestellt hat: für jede, was sie liefert, ihre Lizenz, ihren Status und einen Link, der sich in einem neuen Tab öffnet; für die, die sich mit jedem AIRAC-Zyklus ändern (SIA, VAC, eAIP, CIFP), ist der Link der des gültigen Zyklus, oben auf dem Bildschirm angegeben. Der Bildschirm lädt nichts herunter. Unter der Taste der Verwaltungskarte die absolute Adresse des Bildschirms, zum Öffnen oder als Lesezeichen („Link kopieren“). Er ersetzt das Daten-Labor, das am 28. Oktober 2026 entfernt wurde.

**Die Prüfstände, auf einem Rechner.** Vom Starter bedient, öffnen sie sich nur auf einem Rechner mit Starter (anderswo
werden sie ohne Link genannt); Pfade relativ zur Wurzel der Suite: `labs/design_primitives.html` (Primitive und
Designs), `frame/aerodb/bench.html` und `frame/aerodb/offline_bench.html` (Luftfahrtbasis, online und offline),
`frame/store/test/` (Datenschicht, gegen das falsche GitHub) und `modules/maps/test/render.html` (Kartendarstellung).

**Die V2-Seiten des Rechners.** Nur gezeigt, wenn ein Starter die Seite bedient: Einstellungen › Wartung
(`apps/settings/maintenance.html`), Erster Start (`apps/settings/premier_lancement.html`) und das Kartenstudio
(`apps/cpco/map_parser.html`).

## Gut zu wissen

- **Das Token**: ein feingranulares Token von github.com, nur für das Datenrepository, „Contents“ lesen und schreiben,
  höchstens 90 Tage. Es wird nie wieder angezeigt; fügen Sie es in keine Nachricht ein.
- **Ihre Einstellungen bleiben nach dem Schließen des Browsers**: Identität, Token und Wetterschlüssel liegen am selben Ort
  des Geräts, nie synchronisiert und nie in einer Sicherung. Hat Safari sie Ihnen trotzdem genommen (er löscht den Speicher
  einer kaum genutzten Seite), fügen Sie die App dem Home-Bildschirm hinzu: Dort ist sie besser geschützt. Die Diagnose
  („Kopieren“) sagt, ob der Browser versprochen hat, nicht zu löschen (`storage.persisted`).
- **Zugang trennen**: löscht das Token von diesem Gerät; ausstehende Änderungen bleiben und gehen hinaus, sobald der
  Zugang wieder eingestellt ist. Telefon verloren oder gestohlen: Löschen Sie das Token auch auf github.com.
- **V2-Einstellungen**: Wurde dieser Browser schon für V2 benutzt, bietet die Karte „V2-Einstellungen gefunden“ einmal
  an, Ihre Identität und Ihren Zugang zu übernehmen.
- **Über**: Links zu dieser Hilfe und zum Fahrplan (was geliefert, in Arbeit, geplant ist), dann die Diagnose,
  eingeklappt: Transport, letzte Synchronisation, Fehler, Repository-Baum, Referenzbasen und Luftfahrtbasis, Zeile
  für Zeile; „Kopieren“ legt alles in die Zwischenablage, zum Einfügen in Ihre Nachricht, um ein Problem zu melden. Das
  Token steht nie darin.

<!-- fr: 47f9199a8ffd -->
