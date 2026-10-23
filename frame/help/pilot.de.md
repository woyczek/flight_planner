<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilot — Handbuch

Die App Pilot vereint die Werkzeuge, um einen Flug vorzubereiten und zu verfolgen: Kraftstoff und Flugfläche, Karte,
Bericht, meine Flüge, Übergabe an die Website der Fluggesellschaft. Sie funktioniert auf einem Telefon wie auf einem
Computer, mit oder ohne Netz.

## Erster Start

- **Die Verben.** Jedes Werkzeug ist ein Verb des Menüs (☰ auf einem Telefon, linke Spalte auf einem Bildschirm). Die
  Adresse eines Werkzeugs (`#fuel`, `#report`…) genügt, um zu ihm zurückzukehren.
- **Ihre Identität.** Stellen Sie unter ⚙ Einstellungen Ihr Kürzel und Ihre IVAO-, VATSIM- und SimBrief-IDs ein: Die
  Werkzeuge nutzen sie zum Vorausfüllen.
- **Die Stufe.** Ebenfalls in den Einstellungen wählt „Stufe“, was das Menü zeigt: Einstieg, Alltag oder Vollständig.
  Ein ausgeblendetes Werkzeug bleibt über seine Adresse erreichbar.
- **Die Hilfe.** Jedes Werkzeug hat oben einen eingeklappten Bereich „So geht’s“; die Schaltfläche ? öffnet dieses
  Handbuch beim Kapitel des Werkzeugs.

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

<!-- fr: c6ffb9983705 -->
