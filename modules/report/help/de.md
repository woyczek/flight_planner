# Bericht

Den Bericht eines Flugs mit wenigen Berührungen schreiben, mit oder ohne Einsatz: Das Modul übernimmt, was es über
Ihren Flug schon weiß, Sie ergänzen, Sie speichern — und, wenn Sie möchten, wird der Flug im selben Zug auf der Website
der Fluggesellschaft eingetragen.

## So geht’s

<a id="report-steps"></a>**Drei Schritte.** Unter dem Titel nennt „Bericht für …“ die Fluggesellschaft und ihre Art; solange der Bericht nicht gespeichert ist, bietet „Ändern“ daneben die Gesellschaften und „Persönlich“ an: die Wahl geschieht an Ort und Stelle, der Entwurf bleibt, wie er ist; gespeichert behält er seine, und die Kopfzeile zeigt „AAA ≠ BBB“, wenn die aktuelle Gesellschaft nicht seine ist. Der Bericht wird in drei Schritten ausgefüllt: Flug, Einsatz, Ergebnis. Auf einem Telefon ein
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

<a id="report-step-2"></a>**Der Einsatz.** Im zweiten Schritt: die Familie, mit Kürzel und dann Namen („SAR · Personenbergung“, vorgeschlagen nach Ihrem letzten Bericht), die Serie, die Kennung des
Einsatzes, wenn der Flug einem folgt, dann die Blöcke der Familie. Manche Blöcke erscheinen nur für eine Serie (zum
Beispiel VIP oder Überführung bei den Sondereinsätzen). Solange Sie diesen Schritt nicht geöffnet haben, steht dort
„prüfen“ statt ✓: Familie und Serie eines neuen Berichts sind standardmäßig übernommen.

<a id="report-step-3"></a>**Das Ergebnis.** Im letzten Schritt: das Ergebnis, Ihre Beobachtungen, die Besatzung (Sie zuerst, als Kommandant) und
der Kraftstoff beim Start und bei der Landung. Unstimmigkeiten — Zeiten in falscher Reihenfolge, Datum in der Zukunft,
Kraftstoff, der zunimmt — werden gemeldet.

<a id="report-load"></a>**Zuladung.** „Verwenden“ übernimmt Thema und Unterthema des Flugs (Familie und Serie); Sie können sie ändern, der Bericht hat das letzte Wort. Eine Serie, die etwas befördert (Fracht, Passagiere, VIP), fügt im letzten Schritt die Karte „Zuladung“ mit einem einzigen Feld hinzu: die beförderte Fracht in kg oder die Zahl der Passagiere. Jede andere Serie fügt nichts hinzu.

<a id="report-measures"></a>**Messungen.** Am Ende des letzten Schritts liest „Messungen“ die Protokolle des Fuel Phase Monitor („Protokolle wählen“ oder „Aus dem Output-Ordner“ am Arbeitsplatz) und schlägt den Flug vor, dessen Kennzeichen und UTC-Zeiten diesen Bericht überdecken; „Diesen Flug behalten“ übernimmt seinen Verbrauch, seine Dauer und seine Phasen in den Bericht, mit ihm gespeichert. Sonst wird nichts aus dem Protokoll behalten.

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

<!-- fr: c7defe7f33ab -->
