# Kraftstoff und Flugfläche

Den Kraftstoff eines Flugs vorbereiten und seine Flugfläche wählen: ein Luftfahrzeug, eine Route, eine Flugfläche, und
die Berechnung steht — Rollen, Streckenkraftstoff, Reserve, Blockkraftstoff, Flugzeit und Sinkflugbeginn.

## So geht’s

**Das Luftfahrzeug.** Eine einzige Zeile oben: das gewählte Luftfahrzeug, sein Kennzeichen, sein Rufzeichen und woher es
stammt. Die Lupe öffnet die Suche: Tippen Sie ein Datenblatt, ein Kennzeichen, ein Rufzeichen oder einen Typ. Die
Ergebnisse kommen in dieser Reihenfolge: Ihre Leistungsdatenblätter, die Luftfahrzeuge der Fluggesellschaft (ihre Flotte,
dann die aus ihrem Flugbuch bekannten), die veröffentlichten Typen und zuletzt der Code so, wie er getippt wurde. Ein
Luftfahrzeug der Fluggesellschaft nimmt sein eigenes Datenblatt, wenn es eines hat, sonst das seines Typs, sonst eine
Schätzung des Typs — die Berechnung markiert es dann „ungefähr“. Das gewählte Kennzeichen und Rufzeichen begleiten den
Flug bis zum Bericht. Die Zeile „Reiseflug“ sagt, woher der Verbrauch stammt.

**Die Route.** Tippen Sie Abflug, Ankunft und Ausweichflugplatz (ICAO-Codes), dann die Route in das stets sichtbare
Feld „Route“: die Punkte, die Luftstraßen und die Flugflächen, wie in einem Flugplan („LFBO TOU UN460 NTS/F280 LFRN“).
Sie können dort auch einen ICAO-Flugplan oder die Liste eines OFP einfügen. Wenn Sie das Feld verlassen, wird die Route
bereinigt: in Großbuchstaben auf einer Zeile, ohne DCT und ohne Geschwindigkeits-Flugflächen-Gruppen, Abflug und
Ankunft an den Enden, ein Flugflächenwechsel als „/F280“ nach dem Punkt, an dem er beginnt. Luftstraßen bleiben
geschrieben (die Berechnung folgt den Punkten). Unbekannte Punkte bleiben an ihrer Stelle und werden direkt darunter
gemeldet; Koordinaten schreibt man nach ICAO-Art („4530N00030E“). Die nächste Zeile gibt Entfernung und rechtweisenden
Kurs an und woher sie stammen (die Route, der SimBrief-OFP). Lässt sich die Route nicht auflösen, öffnet „Von Hand
eingeben“ die beiden Felder. Mit eingestellter SimBrief-ID (⚙) übernimmt „Letzter SimBrief-OFP“ Route, Flugfläche,
mittleren Wind und Luftfahrzeug Ihres letzten Plans auf einmal.

Der aufklappbare Bereich „Punkte“ listet die erkannten Punkte auf, vom Abflug bis zur Ankunft. Die Pfeile schieben
einen Punkt in der Liste nach oben oder unten, das Kreuz entfernt ihn; das Feld unten fügt einen vor der Ankunft hinzu:
eine Kennung (Funkfeuer, Wegpunkt, Flugplatz) oder „NAME Breite Länge“. Jeder Zwischenpunkt hat ein freiwilliges Feld
für die Flugfläche, in FL: Das ist die Flugfläche, die ab diesem Punkt gehalten wird, für einen Stufensteigflug oder
-sinkflug. Ein Punkt ohne Flugfläche setzt die vorige fort (grau angezeigt); der Flug beginnt auf der Flugfläche des
Plans. Die Berechnung zählt jede Stufe (ihren Steig- oder Sinkflug, dann den Reiseflug auf dieser Flugfläche), das
Ergebnis zeigt die Folge der Flugflächen (FL100 → FL120), und der Sinkflug beginnt auf der letzten Flugfläche. Jede
Änderung schreibt das Feld „Route“ neu (nur die Punkte) und wird sofort an die Karte weitergegeben.

**Flugfläche und Wind.** Geben Sie die Reiseflugfläche (FL) und den Wind an: Richtung und Stärke. Ohne Richtung oder
ganz ohne Wind wird der Blockkraftstoff als Spanne angegeben. „Steigflug“ wählt die Art zu steigen: sparsam, bestes
Steigen, schnell, mit der Geschwindigkeit des Datenblatts oder manuell (Sie geben Geschwindigkeit und Steigrate an).

„ISA ±“ ist die Temperaturabweichung von der Standardatmosphäre, in °C: Sie verändert die verfügbare Leistung, die
wahre Fluggeschwindigkeit und die Gipfelhöhe. Sobald das Wetter gelesen ist, berechnet die Zeile darunter sie aus dem
METAR des Abflugs — dessen Temperatur minus die Standardtemperatur des Flugplatzes (15 − 1,98 × Flugplatzhöhe in
tausend Fuß) — und „ISA … verwenden“ überträgt sie in das Feld. Die gewählte Abweichung bleibt in Ihren Einstellungen
gespeichert: Der nächste Flug beginnt mit derselben.

Der aufklappbare Bereich „Dichtehöhe“ zeigt, mit der ISA-Abweichung auf der waagerechten Achse, die Dichtehöhe jeder
Druckhöhe (eine Gerade je tausend Fuß): Das ist die Höhe, die Rotor, Propeller und Triebwerk „spüren“. Die senkrechte
Linie ist die Abweichung des Flugs, die waagerechte die Gipfelhöhe des Datenblatts; ihr Schnittpunkt sagt, auf welcher
Druckhöhe das Luftfahrzeug an diesem Tag seine Gipfelhöhe erreicht (fett gezeichnete Gerade). Ein Punkt markiert den
Abflug laut METAR (Temperatur und QNH). Wichtig für Hubschrauber: Bei großer Hitze oder in der Höhe kann die
tatsächliche Gipfelhöhe weit unter die des Datenblatts fallen.

**Das Wetter.** Unter „Flugfläche und Wind“ zeigt „Flugplatzwetter lesen“ Abflug, Ankunft, Ausweichflugplatz und
die Flugplätze entlang der Route: alle, die weniger als 10 NM beiderseits der Route liegen (Radius in den
Einstellungen der Berechnung einstellbar) und ein METAR oder eine TAF haben; die anderen werden übergangen. Jeder
Flugplatz nennt seine Entfernung vom Abflug (der Ausweichflugplatz: von der Ankunft); sind es mehr als zwei, werden
die Zwischenflugplätze unter Abflug, Ankunft und Ausweichflugplatz zugeklappt. Für jeden, was für den Flug zählt: die
Kategorie (VFR, MVFR, IFR, LIFR, farbig), den Wind und seine Gegen- und Seitenwindkomponente auf der Hauptpiste des
Flugplatzes (die Richtung, die dem Wind am nächsten liegt), die Wolkenuntergrenze, die Sicht, die Temperatur und das
QNH sowie eine Warnung, wenn CB oder TCU gemeldet sind; die Rohmeldung ist zugeklappt. Mit einem Flugdatum antwortet
die TAF, wenn sie diese Uhrzeit abdeckt (samt ihren vorübergehenden Änderungen), sonst das METAR. Setzen Sie das
Häkchen bei „Echtes Wetter“, damit der Wind der Berechnung zum Mittel der Winde der Flugplätze der Route wird (Abflug,
Zwischenflugplätze, Ankunft), Abschnitt für Abschnitt und nach dessen Länge gewichtet — eine Näherung aus dem
Bodenwind, unter den Feldern vermerkt. Ohne Netz bleiben die zuletzt gelesenen Werte mit ihrer Uhrzeit angezeigt.

**Die Wahl der Flugfläche.** Die Zeichnung zeigt für jede Flugfläche den Streckenkraftstoff (durchgezogene Linie) und
die Dauer (gestrichelt). Der grüne Punkt markiert die sparsamste Flugfläche, das orange Quadrat die schnellste; der
graue Bereich die Flugflächen, die auf dieser Strecke nicht zu halten sind. Tippen Sie auf die Kurve, um eine
Flugfläche zu wählen, oder nutzen Sie die beiden Schaltflächen.

**Das Ergebnis.** Unten im Bildschirm, immer sichtbar: Blockkraftstoff, Streckenkraftstoff, Flugzeit und Entfernung des
Sinkflugbeginns vor der Ankunft. „Einzelheiten“ schlüsselt es Phase für Phase auf.

**Die Steigflug-Vorgaben.** Klappen Sie sie auf, um dem Steigflug bis zur Flugfläche zu folgen: Leistung, Drehzahl,
Geschwindigkeit, Steigrate, Durchfluss, Mach, Zeit und Kraftstoff kumuliert an den Stufen, mit gezeichnetem Profil.

**Öffnen in.** Unter dem Ergebnis bereitet „Öffnen in“ denselben Flug anderswo vor, in einem neuen Tab: SimBrief
(Flugoptionen vorausgefüllt, SimBrief-Anmeldung nötig), SkyVector (die Route gezeichnet, mit Geschwindigkeit und
Flugfläche), Navigraph und ChartFox (die Karten von Abflug- und Zielflugplatz, Anmeldung nötig). Ein ausgegrauter
Eintrag sagt, was ihm fehlt (Flugplatz, Luftfahrzeugtyp). Es wird nichts gesendet, was nicht schon im Flug steht.

**Weiter zu Karte und Bericht.** Der hier vorbereitete Flug — Luftfahrzeug, Route, Flugfläche, Steig- und Sinkprofil —
wird geteilt: Öffnen Sie Karte oder Bericht, er ist schon da.

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
- **Wetter ohne Starter**: Der Wetterdienst ist nur über den Starter eines Rechners erreichbar; anderswo zeigt die Karte
  das zuletzt gespeicherte Wetter oder sagt es.

<!-- fr: 8b3112cf90c8 -->
