# Kraftstoff und Flugfläche

Den Kraftstoff eines Flugs vorbereiten und seine Flugfläche wählen: ein Luftfahrzeug, eine Route, eine Flugfläche, und
die Berechnung steht — Rollen, Streckenkraftstoff, Reserve, Blockkraftstoff, Flugzeit und Sinkflugbeginn.

## So geht’s

Die Vorbereitung folgt fünf Schritten, in der Reihenfolge, in der man einen Flug vorbereitet:
**1 Flug, 2 Route, 3 Wetter, 4 Kalkulation, 5 Abflug**. Auf einem Telefon zeigt die obere Leiste jeweils einen Schritt
(tippen Sie auf eine Nummer, um dorthin zu gehen, „Weiter“ unten in jedem Schritt); auf einem breiten Bildschirm stehen
die fünf Schritte untereinander. Bei jeder Änderung wird alles neu berechnet: Korrigieren Sie die Route, und Wetter,
Berechnung und Wind folgen, ohne dass eine Schaltfläche zu drücken ist. Das Ergebnis (Blockkraftstoff,
Streckenkraftstoff, Zeit, Sinkflugbeginn) bleibt bei jedem Schritt unten im Bildschirm sichtbar, mit der Herkunft des
Winds („Wind: METAR LFRS“, „Wind: ICON-Vorhersage FL060“, „Wind eingegeben“). Ein ✓ markiert einen ausgefüllten Schritt.
Flugflächen werden überall gleich geschrieben: als FL ab 5000 ft (FL060), darunter in Fuß (3500 ft).

**1 Flug.** Abflug, Ankunft und Ausweichflugplatz (ICAO-Codes), das Flugdatum, wenn Sie die Vorhersage (TAF) statt der
Beobachtung wollen, das Luftfahrzeug und die Reiseflugfläche (FL). Das Luftfahrzeug passt auf eine Zeile: das gewählte
Luftfahrzeug, sein Kennzeichen, sein Rufzeichen und woher es stammt. Die Lupe öffnet die Suche: Tippen Sie ein
Datenblatt, ein Kennzeichen, ein Rufzeichen oder einen Typ. Die Ergebnisse kommen in dieser Reihenfolge: Ihre
Leistungsdatenblätter, die Luftfahrzeuge der Fluggesellschaft (ihre Flotte, dann die aus ihrem Flugbuch bekannten), die
veröffentlichten Typen und zuletzt der Code so, wie er getippt wurde. Ein Luftfahrzeug der Fluggesellschaft nimmt sein
eigenes Datenblatt, wenn es eines hat, sonst das seines Typs, sonst eine Schätzung des Typs — die Berechnung markiert es
dann „ungefähr“. Das gewählte Kennzeichen und Rufzeichen begleiten den Flug bis zum Bericht. Die Zeile „Reiseflug“ sagt,
woher der Verbrauch stammt.

**2 Route.** Tippen Sie die Route in das stets sichtbare Feld „Route“ (die Eingabetaste bestätigt sie): die Punkte, die
Luftstraßen und die Flugflächen, wie in einem Flugplan („LFBO TOU UN460 NTS/F280 LFRN“). Sie können dort auch einen
ICAO-Flugplan oder die Liste eines OFP einfügen. Wenn Sie das Feld verlassen, wird die Route bereinigt: in
Großbuchstaben auf einer Zeile, ohne DCT und ohne Geschwindigkeits-Flugflächen-Gruppen, Abflug und Ankunft an den Enden,
ein Flugflächenwechsel als „/F280“ nach dem Punkt, an dem er beginnt. Luftstraßen bleiben geschrieben (die Berechnung
folgt den Punkten). Unbekannte Punkte bleiben an ihrer Stelle und werden direkt darunter gemeldet; Koordinaten schreibt
man nach ICAO-Art („4530N00030E“). Die nächste Zeile gibt Entfernung und rechtweisenden Kurs an und woher sie stammen
(die Route, der SimBrief-OFP). Lässt sich die Route nicht auflösen, öffnet „Von Hand eingeben“ die beiden Felder. Mit
eingestellter SimBrief-ID (⚙) übernimmt „Letzter SimBrief-OFP“ Route, Flugfläche, mittleren Wind und Luftfahrzeug Ihres
letzten Plans auf einmal.

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

**3 Wetter.** Der Wind (Richtung und Stärke) und die ISA-Abweichung. Ohne Richtung oder ganz ohne Wind wird der
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
gehen an die Karte, die sie als Pfeile zeichnet. Ohne Netz bleibt die zuletzt gelesene Vorhersage.

**4 Kalkulation.** Die Zeichnung zeigt für jede Flugfläche den Streckenkraftstoff (durchgezogene Linie) und die Dauer
(gestrichelt). Der grüne Punkt markiert die sparsamste Flugfläche, das orange Quadrat die schnellste; der graue Bereich
die Flugflächen, die auf dieser Strecke nicht zu halten sind. Tippen Sie auf die Kurve, um eine Flugfläche zu wählen,
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

**5 Abflug.** Eine Zusammenfassung auf einer Seite: das Luftfahrzeug, die Route, wie sie aufgegeben wird, die Flugfläche
(und ihre Stufen), der Wind und seine Quelle, der Blockkraftstoff. „Flug starten“ trägt die Abflugzeit in den Flug ein;
auf einem Telefon öffnet es die Karte, auf einem großen Bildschirm bleibt es hier mit der Karte rechts. Der Bericht
übernimmt diesen Flug. Den Abflugplatz danach zu ändern heißt, einen anderen Flug vorzubereiten: Die Abflugzeit wird
gelöscht. Die Ankunft nach dem Abflug zu ändern ist eine Umleitung: Die Zeit bleibt erhalten, und die Umleitung wird
vermerkt. Der hier vorbereitete Flug — Luftfahrzeug, Route, Flugfläche, Steig- und Sinkprofil — wird geteilt: Karte und
Bericht haben ihn schon.

## Leistungsdatenblätter

Die Registerkarte „Datenblätter“ versammelt die Datenblätter der Fluggesellschaft, geteilt mit all ihren Geräten.

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
  Wetterschlüssel, einmal auf dem Gerät unter Einstellungen › Schlüssel eingegeben; ohne Schlüssel sagt es die Karte,
  und das METAR antwortet stattdessen. Die Wetterkarte sagt, woher die Meldungen stammen. Ganz ohne Netz zeigt sie das
  zuletzt gespeicherte Wetter mit seiner Uhrzeit.

<!-- fr: 6f53b81be10a -->
