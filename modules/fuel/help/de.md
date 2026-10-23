# Kraftstoff und Flugfläche

Den Kraftstoff eines Flugs vorbereiten und seine Flugfläche wählen: ein Luftfahrzeug, eine Route, eine Flugfläche, und
die Berechnung steht — Rollen, Streckenkraftstoff, Reserve, Blockkraftstoff, Flugzeit und Sinkflugbeginn.

## So geht’s

**Das Luftfahrzeug.** Wählen Sie sein Leistungsdatenblatt in der ersten Karte. Ohne Datenblatt nehmen Sie „Anderer Typ
(ICAO-Code)…“ und tippen seinen ICAO-Code (C30J, EC45…): Die Berechnung geht dann von einer Schätzung des Typs aus,
markiert „ungefähr“. Die Zeile „Reiseflug“ sagt, woher der verwendete Verbrauch stammt.

**Die Route.** Tippen Sie Abflug und Ankunft (ICAO-Codes): Entfernung und rechtweisender Kurs werden von selbst
berechnet. Für eine detaillierte Route klappen Sie „Detaillierte Route“ auf und fügen sie ein (ICAO-Flugplan oder eine
Zeile „Punkt Breite Länge“ je Punkt). Wird nichts erkannt, tippen Sie Entfernung und Kurs von Hand. Mit eingestellter
SimBrief-ID (⚙) übernimmt „Letzter SimBrief-OFP“ Route, Flugfläche, mittleren Wind und Luftfahrzeug Ihres letzten
Plans auf einmal.

**Flugfläche und Wind.** Geben Sie die Reiseflugfläche (FL) und den Wind an: Richtung und Stärke. Ohne Richtung oder
ganz ohne Wind wird der Blockkraftstoff als Spanne angegeben. „Steigflug“ wählt die Art zu steigen: sparsam, bestes
Steigen, schnell, mit der Geschwindigkeit des Datenblatts oder manuell (Sie geben Geschwindigkeit und Steigrate an).

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
- **Offline**: Alles wird auf dem Gerät berechnet, aus den bereits empfangenen Datenblättern. Nur der Aufruf von
  SimBrief wartet auf das Netz; der letzte OFP bleibt auf dem Gerät gespeichert.

<!-- fr: cad99988d12f -->
