# Bericht

Den Bericht eines Flugs mit wenigen Berührungen schreiben, mit oder ohne Einsatz: Das Modul übernimmt, was es über
Ihren Flug schon weiß, Sie ergänzen, Sie speichern — und, wenn Sie möchten, wird der Flug im selben Zug auf der Website
der Fluggesellschaft eingetragen.

## So geht’s

**Drei Schritte.** Der Bericht wird in drei Schritten ausgefüllt: Flug, Einsatz, Ergebnis. Auf einem Telefon ein
Schritt nach dem anderen („Weiter“ unten); auf einem Computer alle drei nebeneinander. Nichts ist Pflicht: Was fehlt,
wird im letzten Schritt genannt, ohne das Speichern je zu blockieren.

**Der letzte Flug.** Ist Ihre IVAO- (oder VATSIM-)Kennung eingestellt (⚙) und das Gerät online, schlägt eine Karte Ihren
letzten Flug im Netz vor: „Übernehmen“ füllt Luftfahrzeug, Rufzeichen, Strecke und die aus der Spur gewonnenen Zeiten
aus. Der in Kraftstoff oder Karte vorbereitete Flug wird auf die gleiche Weise vorgeschlagen („Aktueller Flug“); wurde
er in Kraftstoff gestartet („Flug starten“), steht er an erster Stelle, „Flug gestartet um hh:mm“. Die Karte nennt in
einer Zeile alles, was übernommen wird, auch das, wofür eine Einsatzart kein Feld hat (Entfernung, Flugfläche).
„Übernehmen“ füllt auch die Anlasszeit (die Abflugzeit in Kraftstoff) und den Kraftstoff beim Start (den Blockkraftstoff
der Kalkulation) aus, jeweils mit ihrer Quelle gekennzeichnet. Das Speichern des Berichts beendet den gestarteten Flug:
Kraftstoff kehrt zur Vorbereitung zurück, Meine Flüge entfernt „Laufend“, und der Flug wird nicht mehr vorgeschlagen.

**Die anderen Quellen.** Klappen Sie „Andere Quellen“ auf, um Ihren letzten IVAO- oder VATSIM-Flug, Ihren
SimBrief-Flugplan oder einen eingefügten Text zu übernehmen: einen ICAO-Flugplan, die Seite eines Flugs aus dem
IVAO-Tracker oder von StatSim, ein METAR. Nur leere Felder werden ausgefüllt; neben jedem steht seine Quelle. Liefert
eine Quelle etwas anderes für bereits ausgefüllte Felder, bietet eine Schaltfläche an, sie zu ersetzen.

**Der Einsatz.** Im zweiten Schritt: die Familie (vorgeschlagen nach Ihrem letzten Bericht), die Serie, die Kennung des
Einsatzes, wenn der Flug einem folgt, dann die Blöcke der Familie. Manche Blöcke erscheinen nur für eine Serie (zum
Beispiel VIP oder Überführung bei den Sondereinsätzen). Solange Sie diesen Schritt nicht geöffnet haben, steht dort
„prüfen“ statt ✓: Familie und Serie eines neuen Berichts sind standardmäßig übernommen.

**Das Ergebnis.** Im letzten Schritt: das Ergebnis, Ihre Beobachtungen, die Besatzung (Sie zuerst, als Kommandant) und
der Kraftstoff beim Start und bei der Landung. Unstimmigkeiten — Zeiten in falscher Reihenfolge, Datum in der Zukunft,
Kraftstoff, der zunimmt — werden gemeldet.

**Speichern.** Die Schaltfläche unten speichert den Bericht und gibt ihm beim ersten Speichern seine Nummer. Solange Sie
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
- **Die Zeiten** werden in der Uhrzeit Ihres Geräts geschrieben.
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

<!-- fr: 5bd862ad5bb7 -->
