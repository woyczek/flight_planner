# Einstellungen

Die Einstellungen dieses Geräts (⚙ oben am Bildschirm): Ihre Identität, was die App Ihnen zeigt, wie Daten ausgetauscht
werden und was das Gerät offline behält. Sie bleiben auf dem Gerät, nie synchronisiert.

## So geht’s

**Ihre Identität.** Tippen Sie unter „Identität“ Ihr Kürzel und Ihre IVAO-VID, VATSIM-CID und SimBrief-ID, dann
„Speichern“. Die Werkzeuge nutzen sie zum Vorausfüllen; mit mehreren Nutzern ist das Kürzel nötig.

**Die Stufe.** „Stufe“ wählt, was das Menü zeigt: Einstieg, Alltag oder Vollständig, mit einem Tippen. Unter jeder Wahl
sagt die Zeile „Menü:“, welche Werkzeuge sie zeigt; ein ausgeblendetes Werkzeug bleibt über seine Adresse erreichbar.

**Die Nutzungen.** Der Satz oben in „Nutzungen“ sagt, wie Daten ausgetauscht werden. Ohne angekreuztes Kästchen sind Sie
„Allein auf diesem Gerät“: Nichts geht anderswohin. Kreuzen Sie „Allein, auf mehreren Geräten“ oder „Mehrere Nutzer
(Git-Datenrepository)“ an, um auszutauschen.

**Der Datenzugang.** Auf einem Telefon oder auf der Website stellen Sie unter „Datenzugang“ das Repository
(Konto/Repository), den Zweig und Ihr persönliches Token ein, dann „Testen“ und „Speichern“. Auf einem vom Starter
bedienten Rechner ist nichts einzustellen: Der Starter übernimmt das.

**Ohne Zugang und ohne Starter keine Basen.** Ein Gerät ohne eingestellten Zugang und ohne Starter — etwa die Website,
zum ersten Mal auf einem Telefon geöffnet — hat weder die Luftfahrtdatenbasis (Lufträume, Flugplätze, Funkfeuer) noch
die Flugzeugbasis: „Offline-Daten“ sagt es. Zwei Wege: Stellen Sie den Zugang zum Datenrepository ein, auch ohne
Austausch anzukreuzen (er liest dann nur die Basen); oder veröffentlichen Sie auf einem Rechner mit Starter die Basen im
Repository (V2: Einstellungen › Wartung › Luftfahrtdaten und Luftfahrzeugtypen), dann synchronisieren.

**Die Synchronisation.** Mit angekreuztem Austausch zeigt die Karte „Synchronisation“ den letzten Erfolg, die
ausstehenden Änderungen und das Netz; „Jetzt synchronisieren“ sendet und empfängt sofort. Sonst läuft sie von selbst
beim Start, alle 10 Minuten online und bei Rückkehr des Netzes.

**Die Sicherung.** Allein auf diesem Gerät bewahrt „Exportieren (eine Datei)“ alle Ihre Daten in einer Datei auf: Sie
ist die einzige Kopie. „Importieren (zusammenführen)…“ übernimmt sie, ohne hier etwas zu verlieren; „Durch eine Datei
ersetzen…“ löscht zuerst, was auf dem Gerät ist.

**Die Offline-Daten.** Jede veröffentlichte Zone hat ihre Zeile: ihren Status auf diesem Gerät, ihren Zyklus und ihre
Größe. „Offline behalten“ lädt sie ganz herunter (am besten im WLAN); „Freigeben“ gibt den Platz zurück.

## Die Schlüssel des Starters

Auf einem vom Starter bedienten Rechner stellt „Schlüssel des Starters“ den IVAO-API-Schlüssel ein: Er bleibt im Ordner
`secrets/` des Starters, nie im Browser oder in den Daten. „Testen“ prüft, ob IVAO antwortet; „Löschen“ entfernt ihn.

## Gut zu wissen

- **Das Token**: ein feingranulares Token von github.com, nur für das Datenrepository, „Contents“ lesen und schreiben,
  höchstens 90 Tage. Es wird nie wieder angezeigt; fügen Sie es in keine Nachricht ein.
- **Zugang trennen**: löscht das Token von diesem Gerät; ausstehende Änderungen bleiben und gehen hinaus, sobald der
  Zugang wieder eingestellt ist. Telefon verloren oder gestohlen: Löschen Sie das Token auch auf github.com.
- **V2-Einstellungen**: Wurde dieser Browser schon für V2 benutzt, bietet die Karte „V2-Einstellungen gefunden“ einmal
  an, Ihre Identität und Ihren Zugang zu übernehmen.
- **Diagnose**: unten am Bildschirm eingeklappt; „Kopieren“ legt sie in die Zwischenablage, um ein Problem zu melden. Das
  Token steht nie darin.

<!-- fr: 69c8dc337c1f -->
