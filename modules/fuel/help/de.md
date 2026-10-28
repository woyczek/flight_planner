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

**Piste, SID, STAR und Anflug.** Unter den Flugplätzen stehen zwei kurze Zeilen: „Abflug: Piste · SID · Übergang“ und „Ankunft: Piste · STAR · Übergang · Anflug“ (der Anflugübergang erscheint nur, wenn der gewählte Anflug einen hat). Jede Liste kommt aus aerodb: Wer eine Piste wählt, behält nur die Verfahren, die sie bedienen. Die erste Wahl „—“ heißt „nicht gewählt“; „keine“ ist eine echte Wahl (ein direkter Abflug ohne SID). Ein Verfahren aus dem X-Plane-Ersatz des Arbeitsplatzes steht zuletzt, markiert „X-Plane, lokal“; ein von Hand gelesenes Verfahren, dessen Zyklus abgelaufen ist, trägt „veraltet“. Für einen Flugplatz ohne veröffentlichtes Verfahren sagt die Zeile das („kein veröffentlichtes Verfahren“) und bietet „Verfahren von LFXX lesen“ an: ein Flugplatz pro Geste, nie im Stillen. Ein französischer Flugplatz wird aus dem eAIP des SIA gelesen, ohne Konto; ein Staat, dessen AIP Verfahrenstabellen veröffentlicht, aus EAD Basic (Zugangsdaten am Arbeitsplatz eingetragen); für jeden anderen Staat sagt die Meldung, dass keine Tabelle veröffentlicht ist. Ohne Launcher oder auf einem mit dem Arbeitsplatz gekoppelten Gerät geschieht das Lesen am Arbeitsplatz — die Meldung sagt es — und der SimBrief-OFP bleibt die Quelle des Flugs. Sind SID und STAR gewählt, läuft die Berechnung auf dem Weg „Route + Verfahren“ (mit der Strecke von SID und STAR), und die Karte zeichnet sie mit ihren Höhen und Geschwindigkeiten; ihre Höhenbeschränkungen gehen nicht in die Stufen der Berechnung ein, sie stehen im Höhenprofil. „Letzter SimBrief-OFP“ ersetzt die gewählten SID und STAR durch die des OFP und sagt, was sich ändert, eine Zeile pro Seite („Ankunft: STAR ABC1A → ABC2B“).

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

Sobald der Flug gestartet ist, enthält dieser Schritt eine Karte „Verfahren“: Die Ankunftszeile bleibt jederzeit änderbar (Anflug, STAR, Landepiste), die Abflugzeile, solange die SID nicht beflogen ist (beurteilt nach der echten Position, wenn sie jünger als zwei Minuten ist, sonst nach der geplanten; danach bleibt die Zeile schreibgeschützt sichtbar). Eine Änderung rechnet die Berechnung nicht neu: Block-, Strecken- und Reservekraftstoff bleiben die des Abflugs; nur die Zeiten an den Punkten, das Höhenprofil und die Reststrecke folgen dem neuen Weg. Die Schaltfläche „Ändern“ der Karte öffnet Kraftstoff bei der Ankunftszeile (`#fuel?focus=arr`): vor dem Start den Schritt Flug, danach den Schritt Abflug.

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
einzutragen“, mit „Datenblatt anlegen“. Jedes Datenblatt sagt, was fehlt, nach Familien („Zu ergänzen: Drehzahlen,
Geschwindigkeiten, Reiseflug, Rollen, Piste“), oder „vollständig“, wenn nichts fehlt.

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
  Löschen nach Bestätigung. Zelle (Flugzeug, Hubschrauber, Segelflugzeug …) und Antrieb (Kolbenmotor, Turboprop,
  Wellenturbine, Strahltriebwerk …) kommen aus der ICAO-Basis des Typs: „auto“ lassen, außer die Basis irrt sich oder kennt den
  Typ nicht; sie werden dann weder als fehlend gezählt noch bei ChatGPT erfragt.

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

<!-- fr: 4596ab5654ed -->
