# Benutzerhandbuch

Dieses Handbuch beschreibt die Suite SO Group Virtual (Virtual Special Operation Group) für **Piloten**: ein Kapitel pro Seite, ein Abschnitt pro Registerkarte
oder Block, in der Reihenfolge, in der sie erscheinen. In der Suite öffnet der Eintrag **„Hilfe“** der Seitenleiste dieses
Handbuch beim Kapitel der aktuellen Seite. Das Zentrum und die Verwaltung der Suite sind im
[Administratorhandbuch](MANUEL_ADMINISTRATEUR.md) beschrieben; für einen ersten Bericht Schritt für Schritt siehe das
[Tutorial](../TUTORIAL.md). Verzeichnis der gesamten Dokumentation: [Dokumentationsverzeichnis](../README.md).

## Erste Schritte
<!-- page: index.html -->

Die Suite „SO Group Virtual“ vereint im Browser alles, was der Pilot braucht: vom Zentrum zugewiesene Missionen, Verfügbarkeit, Flugkarten, Kraftstoff, Berichte, Landungen und Auswertungen.
Alle Seiten haben dieselben Orientierungspunkte: links eine Seitenleiste, oben eine Kopfzeile, manchmal Registerkarten, dann Blöcke.
Dieses Kapitel beschreibt diese gemeinsamen Elemente; die folgenden Kapitel erklären jede Seite im Detail.
Die Startseite (`index.html`) listet die Anwendungen als Karten auf und zeigt die Version der Suite.
Öffnen Sie die Suite über den Starter oder ein Lesezeichen: Eine Seite der Suite, die über einen Link einer anderen Website (Webmail, Forum…) geöffnet wird, wird abgelehnt, damit diese Website darin nichts lesen oder auslösen kann.

### Die Seitenleiste

Die linke Spalte führt zu den Anwendungen. Der Eintrag der angezeigten Seite ist hervorgehoben.

Was sie zeigt, hängt von Ihrer **Nutzungsstufe** ab (Mein Profil › „Nutzungsstufe“): höchstens sieben Einträge, nie mehr, als Ihre Nutzung braucht.

| Eintrag | Was er öffnet | Stufe |
|---|---|---|
| „Heute“ | Nächste Mission, zu schreibende Berichte, Woche; erster Eintrag auf jeder Stufe | 1 |
| „Meine Missionen“ | Vom Zentrum zugewiesene Missionen und Verfügbarkeit (roter Punkt: ungelesene Missionen) | 1 |
| „Bericht“ | Eingabe eines Missionsberichts | 1 |
| „Planung“ | Befehlsplanung der Woche (Einsatztafel, auf Stufe 1 oder ohne Zentrum schreibgeschützt); auf Stufe 4 gemeinsame Zeitfenster und wahrscheinliche Missionen der ODV-Seite | 1 |
| „Missionen“ | Missionsgenerator und Register, als Registerkarten; Kartenstudio auf Stufe 4 | 3 |
| „Werkzeuge“ | Flugkarten, Kraftstoff, Landungen, Missionsanalyse (in Mein Profil angehakte Werkzeuge, auf Stufe 4 alle) | 1 bis 4 |

- Die Stufe ordnet die Oberfläche, sie gewährt keine Rechte: die Seiten des Zentrums (Missionen, ODV-Planung, Ändern der Einsatztafel) erfordern weiterhin das aktivierte Zentrum.
- Unten in der Spalte: „Einstellungen“ (Mein Profil, Darstellung, Zentrum, Installation, Wartung, Erststart, als Registerkarten) und **„Hilfe“**. Diese beiden Einträge bleiben unten am Bildschirm fixiert: nur die obere Liste rollt, wenn es zu viele Symbole gibt (Fenster unter 460 px Höhe: die ganze Leiste rollt).
- „Hilfe“ öffnet die Dokumentation in einem Fenster über der aktuellen Seite, direkt beim Kapitel dieser Seite. Das Fenster schließt sich mit ✕, Esc oder einem Klick daneben; erneut geöffnet, setzt es dort fort, wo Sie waren. „↗“ öffnet sie als ganze Seite (Strg-Klick auf „Hilfe“: in einem neuen Tab). Sie ersetzt den früheren Eintrag „Menü“. Sie funktioniert auch, wenn die Suite ohne Starter direkt von der Festplatte geöffnet wird: Die Dokumente sind in die Seite eingebaut.
- Das Logo oben in der Spalte öffnet die Website der virtuellen Fluggesellschaft in einem neuen Tab.
- Die Leiste ist auf einem schmalen Bildschirm (unter 760 px) und beim Drucken ausgeblendet. Man kann sie ausblenden oder immer anzeigen: Darstellung › Symbole › „Seitenleiste“.

### Die Kopfzeile

Die Kopfzeile trägt den Titel der Seite und ihren Untertitel. Rechts befinden sich die Werkzeuge, die nur erscheinen, wenn sie gebraucht werden:

| Element | Funktion |
|---|---|
| Versiegelter Umschlag (roter Umschlag mit einer Zahl) | Ihnen zugewiesene Missionen sind noch nicht gelesen. Ein Klick öffnet „Meine Missionen“. |
| „Synchronisieren (n)“ | Tauscht die gemeinsamen Daten mit dem gemeinsamen Repository aus. N = zu sendende Änderungen + zu empfangende Aktualisierungen. Auf den Stufen 1 und 2 ersetzt ein Punkt die Zahl (sie steht weiterhin am Anfang des Tooltips); der Zähler „(n)“ erscheint auf den Stufen 3 und 4. |
| „Im Ordner sichern (n) · letzte: …“ (roter Knopf) | Erinnerung an die Sicherung der lokalen Daten, angezeigt ab 10 nicht gesicherten Änderungen. |
| „⚠ n“ | Bereits vom Bildschirm verschwundene Warnungen der Seite: ein Klick zeigt sie wieder an. |
| Flagge „Sprache“ | Wahl der Sprache: „Auto“ (Sprache des Browsers), Français, English, Deutsch, Español. |
| ☰ | Vollständiges Menü der Suite. |

**„Synchronisieren“** gibt es nur, wenn die Suite mit dem Starter geöffnet ist und der Ordner `data/` ein Git-Repository ist.
- Ein Klick schreibt zuerst die im Browser gehaltenen Dateien, sendet dann Ihre Änderungen (mit Ihrem Kürzel signiert), holt die der anderen und führt sie zusammen.
- Bei einem Konflikt auf demselben Eintrag wird die neueste Version behalten; die andere wird nach `_conflits/` kopiert und eine Benachrichtigung weist darauf hin.
- Der Tooltip zeigt die Einzelheiten (zu sendende Änderungen, zu empfangende Elemente, letzte Synchronisierung). Die Schaltfläche zeigt den letzten bekannten Zustand; er wird in der unter Einstellungen › Wartung › Versionen und Synchronisation eingestellten Häufigkeit neu geprüft (standardmäßig alle 30 Minuten; auch auf jeder Seite, 3-mal am Tag oder einmal am Tag, und „Jetzt prüfen“).
- Ohne eingestelltes Kürzel startet die Synchronisierung nicht: stellen Sie es unter Einstellungen › Mein Profil ein. Siehe [die Architektur der Synchronisierung](../technique/SYNCHRONISATION.md).

**„Im Ordner sichern“** kopiert alle vom Browser gehaltenen Daten (Entwürfe, Profil, Einstellungen…) in die Datei `defa_local_store.yaml` des Sicherungsordners.
- Beim ersten Klick wählen Sie diesen Ordner; ist kein Ordner möglich, wird die Sicherung heruntergeladen.
- Ist der Ordner freigegeben, erfolgt die Sicherung auch automatisch beim Verlassen der Seite und alle 5 Minuten.
- Die Anzeigeeinstellungen (Design, Sprache, Anordnung der Blöcke…) werden gesichert, zählen aber nicht für die Erinnerung.

**Das Menü ☰** enthält von oben nach unten:
- die Knöpfe „Darstellung“ und „Einstellungen“;
- die Liste der Seiten der Suite, dann die Einstellungsseiten (Mein Profil, Zentrum, Installation, Wartung, Darstellung, Erststart);
- die Gruppe „Pilotenprofil“ (Kürzel, IVAO-ID, VATSIM-ID, SimBrief), die alle Seiten übernehmen;
- die Gruppe „Lokale Daten“: „Im Ordner sichern“, „Wiederherstellen / abgleichen“, „Sicherungsordner…“, „Sicherung herunterladen“, „Aus Datei wiederherstellen…“ und das Datum der letzten Sicherung;
- die Gruppe „Seite“, wenn die Seite eigene Aktionen anbietet.

Die Wiederherstellung führt zusammen: Für jedes Datum gewinnt das neueste. Sie dient auch dazu, seine Daten in einem anderen Browser oder auf einem anderen Rechner wiederzufinden.

### Die Registerkarten oben auf der Seite

Manche Einträge der Seitenleiste fassen mehrere verwandte Seiten zusammen, die als Registerkarten unter der Kopfzeile erscheinen:

| Eintrag | Registerkarten |
|---|---|
| „Meine Missionen“ | „Meine Missionen“, „Meine Verfügbarkeit“ |
| „Einstellungen“ | „Mein Profil“, „Darstellung“, „Erststart“ (ab Stufe 1); „Zentrum“, „Installation“ (Stufe 2); „Wartung“ (Stufe 4) |
| „Missionen“ (Zentrum) | „Missionsgenerator“, „Kartenstudio“ |

Ein Klick auf eine Registerkarte öffnet die entsprechende Seite. Ein Klick mit Strg (oder Umschalt) öffnet sie in einem neuen Tab des Browsers. Die Registerkarten folgen der Nutzungsstufe (Mein Profil › „Nutzungsstufe“); eine direkte Adresse zu einem Abschnitt öffnet ihn immer.

### Die Blöcke

Der Inhalt der Seiten ist in Blöcke mit Titel aufgeteilt. Jeder Blocktitel trägt zwei Bedienelemente:
1. „Ausblenden“ / „Anzeigen“: klappt den Block zu oder auf (in den Material-Designs ist nur das Symbol sichtbar; die Beschriftung erscheint als Tooltip).
2. ↕ „Verschieben“: Fassen Sie diesen Griff und ziehen Sie den Block auf einen anderen: auf dessen obere Hälfte losgelassen, kommt er davor, auf die untere Hälfte, danach; er kann die Spalte wechseln. Der Zielblock leuchtet auf, und die Seite scrollt, wenn Sie sich dem unteren Fensterrand oder der Kopfzeile nähern.

Die Anordnung (Reihenfolge, ausgeblendete Blöcke) wird **pro Seite und pro Browser** gespeichert. Sie wird bei jedem Besuch übernommen. Menü ☰ › „Blockreihenfolge zurücksetzen“ stellt die ursprüngliche Reihenfolge der Seite wieder her (ausgeblendete Blöcke bleiben ausgeblendet).
Manche Blöcke sind von vornherein ausgeblendet, solange Sie sie nicht einmal angezeigt haben. Textfelder (Route, Bemerkungen…) wachsen mit ihrem Inhalt, bis zu drei Fünfteln des Bildschirms (Chrome und Edge).

### Die schwebenden Benachrichtigungen

Die Meldungen der Suite (Erfolg, Warnungen, Fehler) erscheinen unten in der Mitte des Bildschirms in kleinen Blasen.
- Sie verschwinden von selbst: etwa 5 s für eine Information, 8 s für eine Warnung, 12 s für einen Fehler.
- Liegt der Mauszeiger darauf, wird das Ausblenden angehalten; das Kreuz „×“ schließt die Blase sofort.
- Höchstens vier Meldungen bleiben auf dem Bildschirm.
- Eine sich wiederholende Erinnerung (zum Beispiel „SIA-Datenbank fehlt in diesem Browser…“ im Kartenstudio und bei den Flugkarten) erscheint nur **einmal pro Sitzung** des Browsers. Manche Meldungen sind höheren Nutzungsstufen vorbehalten: Darunter werden sie nicht angezeigt, Warnungen und Fehler bleiben aber im Protokoll der Anzeige „⚠ n“.
- Ausgeblendete Warnungen und Fehler bleiben über die Anzeige „⚠ n“ der Kopfzeile abrufbar: „OK“ bestätigt eine Warnung, „Alle bestätigen“ bestätigt alle, „Leeren“ löscht die Liste. Dieses Protokoll geht beim Seitenwechsel verloren.
- Eine lange Aufgabe (Lesen, Erzeugen…) zeigt einen Fortschrittsbalken im selben Stapel. Das Verlassen der Seite während der Aufgabe erfordert eine Bestätigung. Lässt sich die Aufgabe unterbrechen, trägt der Balken einen Knopf **„Abbrechen“**: Der laufende Schritt wird beendet, die folgenden werden nicht gestartet, dann meldet die Blase „Abgebrochen.“. Den Knopf gibt es für die Erzeugung und die Vorschauen der Karten (Kartenstudio und Flugkarten: Halt zwischen zwei Karten), die MORA-Berechnung (einer Zone, des vollständigen Rasters oder blockweise), den Import der MILAIP ENR 5.7 und das Einrichten der Zonen (Wartung) sowie das Lesen des Missionsordners (Register).
- Eine angehaltene Aufgabe sagt, was nur teilweise vorliegt. Karten: Eine abgebrochene Erzeugung lädt kein ZIP herunter und legt nichts im Missionsordner ab (ein Stapel aus mehreren Missionen nennt, wie viele fertig sind); die bereits angezeigten Vorschauen bleiben. Blockweise MORA (Knopf „Anhalten (später fortsetzen)“): Die bereits berechneten Blöcke werden in `mora.csv` geschrieben (Teilraster), „Vollständige Berechnung fortsetzen…“ führt sie später fort. MORA einer Zone, MORA-Raster und MILAIP-Import: Es wird nichts geschrieben. Lesen des Missionsordners: Das Register bleibt unverändert.
- Fehlermeldungen sagen, was fehlgeschlagen ist und was zu tun ist, statt nur eines Codes. Beispiele: „der Server antwortet nicht — prüfen, dass die Suite über den Starter geöffnet ist (lancer.cmd / lancer.sh), ihn bei Bedarf neu starten und es erneut versuchen“; „Datei fehlt — prüfen, ob sie im erwarteten Ordner liegt (oder neu erstellen), und es erneut versuchen“; „Browserspeicher voll — Platz schaffen (Einstellungen › Wartung › Speicherplatz) und es erneut versuchen“. Weitere Fälle: Online-Dienst antwortet nicht, Serverfehler, vom Browser verweigerter Zugriff, Zeitüberschreitung; ein unerwarteter Fehler erscheint als „fehlgeschlagen“ mit dem technischen Detail in Klammern.
- Fragen („Löschen… ?“) öffnen sich in einem kleinen Fenster mit „Bestätigen“ und „Abbrechen“.

### Anmeldung, develop- oder Produktionsmodus, Identitätsübernahme

Die Fluggesellschaft arbeitet in einem dieser beiden Modi, den ein Administrator des Zentrums einstellt:

| Modus | Wirkung für den Piloten |
|---|---|
| develop (Standard) | Freies Kürzel (das des Pilotenprofils), Anmeldung optional. |
| production | Anmeldung erforderlich für „Meine Missionen“ und „Meine Verfügbarkeit“; das Kürzel ist das der Anmeldung und lässt sich nicht mehr ändern. |

- Im Produktionsmodus zeigen diese Seiten „Produktionsmodus: anmelden, um Ihre Missionen zu sehen.“ mit den Feldern „Kürzel“ und „Passwort“ und dem Knopf „Anmelden“.
- Ein vorläufiges Passwort (von einem Administrator vergeben) muss geändert werden: Einstellungen › Mein Profil › „Anmeldung und Passwort“.
- Ein Administrator kann anstelle eines Piloten handeln (Identitätsübernahme). Ein Banner weist auf allen Seiten darauf hin: „Identitätsübernahme: Benutzer … (durch …, Schreibvorgänge signiert „… pour …“)“, mit dem Knopf „Übernahme beenden“.
- Die Prüfungen erfolgen im Browser: Sie ersetzen keine echte Prüfung durch einen Server.

### Die Designs

Die Suite bietet mehrere Designs. Sie ändern die Form der Seiten, nicht die Informationen.

| Design | Kurz gesagt |
|---|---|
| Standard, Aero, Operativ, Konsole | „Flache“ Designs: Ecken, Dichte, Titel, Seitenleiste. |
| Kabinett, Flugbuch, Robust, Aqua, Taktisch | Material-Designs (Leder, Holz, Messing, Aluminium, Stahl, Glas); Taktisch: Nacht, Rauchglas, Cyan-Akzent, Orbitron-Titel, ohne Bilder. Aqua ist das Design einer neuen Installation. |

- In den Material-Designs wird die Missionsmappe von „Meine Missionen“ zu einem richtigen Buch, mit seinen Animationen.
- Die Wahl erfolgt unter Darstellung: Jedes Design wird dort als Vorschaubild gezeigt und sofort angewendet. Siehe das Kapitel [Darstellung](#darstellung).

## Heute
<!-- page: apps/pilot/aujourdhui.html -->

Diese Seite ist der erste Eintrag der Seitenleiste, auf jeder Nutzungsstufe. Sie beantwortet drei Fragen, ohne dass Sie suchen müssen: Wie lautet meine nächste Mission, welche Berichte sind noch zu schreiben, was steht diese Woche an.
Jeder Block bietet nur eine Aktion. Die Daten stammen aus den Zuweisungen des Zentrums (siehe „Meine Missionen“) und aus dem Berichtsregister: Nichts muss erneut eingegeben werden. Die Seite liest sich von selbst neu, wenn Sie Sprache, Kürzel oder Sitzung wechseln.
Die Startseite bietet sie außerdem an erster Stelle von „Meine Aufgaben“ an.

### Meine nächste Mission

- Die nächste Ihnen zugewiesene Mission (anstehend oder vor weniger als sechs Stunden gestartet): Zeit in UTC, Mission und Titel, Luftfahrzeug (Typ und Kennzeichen), Flugplatz, Rufzeichen; gegebenenfalls „Überführung“ oder „Bereitschaft, bereit um …“ sowie „● neu“, solange Sie sie nicht geöffnet haben.
- Aktion: **„Mappe öffnen“** öffnet die Mission in „Meine Missionen“.
- Ohne eingestelltes Kürzel fragt dieser Block direkt danach: das Feld „Kürzel“ (zwei bis vier Buchstaben) und der Knopf „Speichern“. Das Kürzel wird im Pilotenprofil gespeichert und die drei Blöcke lesen sich sofort neu, ohne Umweg über Einstellungen › Mein Profil. Im Produktionsmodus oder während einer Identitätsübernahme ist es das Kürzel der Anmeldung: Der Block zeigt „Kein Kürzel: anmelden, um Ihre Missionen zu sehen.“
- Ohne anstehende Mission sagt der Block es: „Keine anstehende Mission ist … zugewiesen.“.

### Zu schreibende Berichte

- Die Ihnen zugewiesenen Missionen, die vor weniger als 21 Tagen gestartet sind und für die das Berichtsregister keinen Bericht enthält. Die jüngste steht oben; höchstens sieben Zeilen.
- Ein Bericht gilt als bekannt, wenn er aus einem Einsatzbefehl stammt: Das Register (`missions.yaml`) ordnet ihn der Zuweisung über seine Befehlsreferenz zu (Mission, Pilot, Start). Ein anders begonnener Bericht, mit von Hand gewählter Familie, zählt nicht: Die Mission bleibt in der Liste.
- Jede Zeile nennt die Mission, ihren Titel, die Zeit, das Luftfahrzeug und den Flugplatz, mit zwei Knöpfen.
- **„Bericht schreiben“** öffnet die Missionsmappe in „Meine Missionen“ und beginnt den Bericht in der Familie der Mission, aus dem Einsatzbefehl vorausgefüllt (Adresse `?mission=…&do=cr`).
- **„Kein Bericht“** nimmt die Mission aus der Liste (abgesagte, nicht geflogene Mission…). Die Wahl wird nur in diesem Browser gemerkt; das Register bleibt unberührt.
- Ist alles berichtet, sagt der Block „Nichts offen: Ihre vergangenen Missionen haben ihren Bericht.“ Ohne Kürzel verweist er auf das Feld des ersten Blocks („Kürzel oben eingeben.“).

### Meine Woche

- Sieben Spalten, Montag bis Sonntag der laufenden Woche (Tage in UTC); der aktuelle Tag ist umrandet.
- Ihre Missionen erscheinen dort als Kacheln: Zeit und Missionsnummer oder „Bereitschaft“.
- Aktion: Ein Klick auf eine Kachel öffnet die Missionsmappe in „Meine Missionen“. Ohne Kürzel sagt der Block „Ohne Kürzel bleibt die Woche leer.“

## Meine Missionen
<!-- page: apps/pilot/mes_missions.html -->

Diese Seite vereint die Missionen, die Ihnen das Zentrum zuweist, die Mappe jeder Mission, Ihre Verfügbarkeit und Ihr Kürzel.
Sie erreichen sie über den Eintrag „Meine Missionen“ der Seitenleiste, über den versiegelten Umschlag der Kopfzeile oder über die Registerkarte „Meine Missionen“.
Aufbau: die Liste der Missionen und die geöffnete Mappe nebeneinander (die Mappe nimmt zwei Drittel der Breite ein), „Meine Verfügbarkeit“ darunter, über die ganze Breite. Ohne geöffnete Mappe nimmt die Liste die ganze Breite ein. Auf einem schmalen Bildschirm (unter 1100 px) steht alles in einer einzigen Spalte: Missionen, Mappe, Verfügbarkeit.
Im Produktionsmodus verlangt die Seite zuerst eine Anmeldung.
Je nach Nutzungsstufe (Mein Profil › „Nutzungsstufe“) zeigt die Missionsmappe mehr oder weniger Abschnitte (siehe „Mission“); einige Knöpfe und Links erscheinen erst ab der Stufe Planung (2) oder auf der Stufe Experte (4).

### Meine Missionen der Woche

Die Liste der Missionen, die Ihnen für die angezeigte Woche zugewiesen sind, sortiert nach Startzeit (UTC).

- **Wochenleiste**: „‹“ vorherige Woche, Datumsfeld (springt zur Woche eines Datums), „›“ nächste Woche, „⟲“ zurück zur aktuellen Woche (sichtbar außerhalb der aktuellen Woche). Sie gilt für die Liste und die Verfügbarkeit gemeinsam: Ein Wochenwechsel hier ändert beide Blöcke.
- **Spalten**: „Start (UTC)“ (oder „Bereitschaft“ und die Uhrzeit, zu der Sie bereit sein müssen), „Mission“, „Titel“, „Luftfahrzeug“, „Flugplatz“, „Rufzeichen“.
- Ein Punkt ● am Zeilenanfang kennzeichnet eine **neue, noch nicht geöffnete** Mission.
- Der Vermerk „Überführung“ zeigt, dass Sie ein Luftfahrzeug für einen anderen Piloten überführen: Sie erhalten nur den Überführungsbefehl, nicht das Briefing der Mission.
- Ein Klick auf eine Zeile öffnet die Mission im Block „Mission“.
- Kästchen „auch vergangene Missionen anzeigen“: Standardmäßig verschwindet eine Mission einige Stunden nach ihrem Start. Die Wahl wird gespeichert.
- Ohne eingestelltes Kürzel erscheint das Eingabefeld für das Kürzel unter der Liste (Feld „Kürzel“, Knopf „Speichern“): Nach dem Speichern werden die Liste und die Verfügbarkeit neu gelesen. Im Produktionsmodus oder während einer Identitätsübernahme ist es das Kürzel der Anmeldung.
- Eine Adresse `?mission=…` aus „Heute“ oder aus „Neuer Bericht“ zeigt die Woche dieser Mission (vergangene Missionen bei Bedarf eingeblendet); mit `?do=cr` beginnt der Bericht gleich beim Öffnen der Mappe.
- **Pilot**, **Beherrschte Luftfahrzeuge**, **Simulatoren**: drei Knöpfe unter der Liste, zu Einstellungen › Mein Profil (Abschnitt „Identität und Netzwerke“ für das Kürzel; Abschnitt „Luftfahrzeuge und Simulatoren“, bei der Karte der Luftfahrzeuge oder der Simulatoren). Der Knopf „Pilot“ zeigt das Kürzel, mit dem Ihre Missionen und Ihre Verfügbarkeit gefunden werden. Im Produktionsmodus oder während einer Identitätsübernahme ist es das Kürzel der Anmeldung.
- Diese drei Knöpfe erscheinen ab der Stufe Planung (2). Auf der Stufe Besatzung (1) erscheint nur „Pilot“, solange das Kürzel nicht eingestellt ist.

### Mission

Die Mappe der gewählten Mission, nur lesbar. Dieser Block erscheint erst nach einem Klick auf eine Mission.

**Umschlag und Siegel**
- Eine ungelesene Mission kommt versiegelt an: geschlossener Umschlag mit dem Etikett „VERTRAULICH“ (Nummer, Titel, Luftfahrzeug, Rufzeichen, Start).
- Zum Öffnen: Klicken Sie auf den Umschlag oder auf „Mission öffnen“ („Siegel brechen“). Die Mission gilt dann als gelesen: Der Punkt ● der Liste, der Hinweis in der Seitenleiste und der Umschlag in der Kopfzeile werden aktualisiert.
- Eine bereits gelesene Mission erscheint geschlossen mit „Mappe öffnen“ oder direkt geöffnet.
- Solange die Mission versiegelt ist, bleiben die Aktionsknöpfe ausgegraut.

**Inhalt der Mappe** (in dieser Reihenfolge):
1. Der Missionsauftrag: „Zugewiesenes Luftfahrzeug“, „Rufzeichen“, „Abflugplatz“, „Angeforderter Start“ (oder „Bereit um“ bei Bereitschaft), gegebenenfalls Überführung, „Status“, Mitflieger („Mit“), Einleitung und Zusammenfassung.
2. Die Einzelheiten: „Ziel / Sektor“, „Ausführliche Beschreibung“, „Risiken und Hinweise“, „Eingesetzte Teams“, „Gelieferte Route“ (Tabelle der Punkte und Plan).
3. Der Teil „Gelieferte Karten“: Ein Klick vergrößert eine Karte in einem Betrachter (Schließen mit dem Kreuz oder Esc).
4. Der Schluss: „Ziele“, „Bemerkungen“, „Technisches Blatt“, „Zuweisungsverlauf“ und die Unterschrift des Zentrums.
5. Der Teil „Umschläge und Funksprüche im Flug“, falls vorhanden (siehe unten).

**Je nach Nutzungsstufe**:
- Besatzung (1): der Missionsauftrag, die Zusammenfassung, die gelieferte Route, die Karten, die Ziele, die Unterschrift und die Umschläge;
- Planung (2): zusätzlich die Einleitung, „Ziel / Sektor“, die ausführliche Beschreibung, die Risiken, die eingesetzten Teams, die Bemerkungen und die übrigen Abschnitte der Zusammenfassung;
- Gestaltung (3): zusätzlich das technische Blatt und der Zuweisungsverlauf;
- Experte (4): die ganze Mappe; auf dem Aktualisierungskanal develop versiegelt „Neu versiegeln“ die Mission wieder (ungelesen).

**Das Buch** (Designs Kabinett, Flugbuch, Aqua und Robust, Bildschirm von mindestens 760 px)
- Die geöffnete Mappe erscheint als Doppelseite. Zu langer Inhalt geht auf die nächste Seite über; die Karten liegen zu zweit auf einer Seite.
- Zum Blättern: die Eselsohr-Ecke unten rechts (nächste Seite) oder unten links (vorherige Seite). Ein Klick auf die Seite bewirkt dasselbe.
- Auf der ersten Doppelseite schließt die linke Ecke die Mappe.
- Das **Lesezeichen** springt zum Ende der Mappe; von dort öffnet es die versiegelten Umschläge (falls vorhanden), sonst kehrt es zum Anfang zurück.
- Eine Seite „Diese Seite wurde absichtlich leer gelassen“ kann erscheinen: Sie ist gewollt, damit das Ende der Mappe links liegt.
- Die Umschläge liegen hinter dem Lesezeichen, nach einer Seite „Ergänzende Informationen“.
- In den anderen Designs oder auf schmalem Bildschirm erscheint die Mappe in gewöhnlicher Darstellung, einspaltig.

**Versiegelte Übungsumschläge**
- In einer Übung dürfen manche Umschläge oder Nachrichten erst zu einer bestimmten Uhrzeit gelesen werden. Jeder wird als Umschlag dargestellt: „Versiegelter Umschlag“, „Erwarteter Funkspruch“ oder „Zu übermittelnde Nachricht“, mit dem Vermerk „Zu öffnen:“ gefolgt von der Uhrzeit (UTC) und dem vorgesehenen Zeitpunkt.
- Zur angegebenen Zeit öffnet sich der Umschlag von selbst; eine Benachrichtigung kündigt es an („… : Öffnungszeit erreicht.“).
- Vor der Zeit verlangt „Siegel brechen“ eine Bestätigung: Der Knopf wird 5 Sekunden lang zu „Bestätigen: vor der Zeit öffnen“.
- Ein geöffneter Umschlag kann mit „Neu versiegeln“ wieder verschlossen werden.
- Jeder Vorgang (Öffnen zur Zeit, vor der Zeit, neu versiegelt) wird protokolliert; der Bericht nutzt dies.

**Knöpfe unter der Mappe**

| Knopf | Wirkung |
|---|---|
| „In den Flugkarten öffnen“ | Öffnet die Flugkarten mit dieser Mission (zugewiesenes Luftfahrzeug an erster Stelle). |
| „Kraftstoff (Planer)“ | Öffnet den Kraftstoffplaner in einem neuen Tab, mit Route, Distanz, Reiseflughöhe und Luftfahrzeug. |
| „Bericht erstellen“ | Öffnet den Bericht der Familie der Mission, vorausgefüllt. |
| „Mappe schließen“ | Schließt die Mappe (die Mission bleibt gelesen). |

Diese Knöpfe sind ausgegraut, wenn die Mission nicht das Nötige liefert (Missionsdatei fehlt, Route zu kurz).
„In den Flugkarten öffnen“ und „Kraftstoff (Planer)“ erscheinen nur, wenn das entsprechende Werkzeug in Mein Profil › „Nutzungsstufe“ angekreuzt ist (auf der Stufe Experte immer). Ohne die Flugkarten wird „Bericht erstellen“ zum Hauptknopf.
Der Knopf „⤢ Volle Breite“ im Blocktitel breitet die Mappe über die ganze Breite aus, oberhalb der Liste; „⇥ Neben der Liste“ setzt sie wieder daneben. Die Wahl wird gespeichert.

**Animationen** (deaktiviert, wenn das System weniger Animationen verlangt)
- Kabinett: Das Aktenbündel kommt aus der Ablage, die sich öffnet, dann wird die Seite umgeblättert.
- Flugbuch: Das Heft kommt aus seinem Umschlag und öffnet sich dann wie ein Buch.
- Aqua: Die Mappe wächst zu einem Buch.
- Robust: Der Verschluss leistet Widerstand, dann gibt er nach; der Deckel öffnet sich schwerfällig.
- Andere Designs: einfaches Überblenden.
- Missionswechsel: Die geöffnete Mappe schließt sich, verschwindet nach links, die neue kommt von rechts und öffnet sich, wenn die vorherige geöffnet war.

**Sprache**: Ist die Seite nicht auf Französisch und bringt die Mission keine Übersetzung mit, kann der Inhalt vom Browser übersetzt werden (aktuelles Chrome oder Edge), mit dem Hinweis „mit Vorsicht lesen“. Sonst bleibt er auf Französisch.

### Meine Verfügbarkeit

Ihre Verfügbarkeit in der angezeigten Woche, in UTC-Stunden. Das Zentrum nutzt sie, um Ihnen Missionen zuzuweisen. Es ist derselbe Editor wie auf der Seite Meine Verfügbarkeit (nächstes Kapitel); hier ist die Woche die der Wochenleiste der Liste.
Je nach Nutzungsstufe: Die eigene Wochenleiste des Blocks, das alte Stundenraster und der Link „Verfügbarkeitseingabe einzeln öffnen“ erscheinen nur auf der Stufe Experte; auf den anderen Stufen wechselt man die Woche über die Leiste der Liste.

**Palette**: Die Kategorien sind nach Gruppen geordnet („Verfügbar“, „SOG-Übung“, „Beschäftigt“, „Nicht verfügbar“). Jeder Farbpunkt trägt den ODV-Codebuchstaben und eine kurze Beschriftung; der Tooltip zeigt die vollständige Beschriftung. Die gewählte Kategorie wird gespeichert.

Standardkategorien (das Zentrum kann diese Liste ändern):

| Gruppe | Kategorien (ODV-Code) |
|---|---|
| Verfügbar | Für alles verfügbar (O), Verfügbar Zivilschutz (SC), Verfügbar Verteidigung (D+), Zivilschutz nach Wahl (SC-), Verteidigung nach Wahl (D-) |
| SOG-Übung | Flug in SOG-Übung (S), SOG-Lotsendienst (AM) |
| Beschäftigt | Flug außerhalb SOG (IVAO / VATSIM) (G), DCS (DC), Lotsendienst außerhalb SOG (IVAO / VATSIM) (AT) |
| Nicht verfügbar | Nicht verfügbar (IN), Urlaub (V), Ausgleich (Q), Termin im echten Leben (IR) |

**Stundenraster**: eine Zeile pro Tag (heute hervorgehoben), eine Spalte pro Stunde von 0 bis 23 UTC.
1. Wählen Sie eine Kategorie in der Palette.
2. Klicken Sie auf ein Feld oder ziehen Sie bei gedrückter Maustaste ein Rechteck: Die Felder nehmen Farbe und Buchstaben der Kategorie an.
3. Ein erneuter Klick (oder ein Rechteck), der auf einem Feld dieser Kategorie beginnt, löscht sie.

Ein Feld, das sich mehrere Kategorien teilen, ist schraffiert; eine teilweise belegte Stunde (Eingabe auf die Viertelstunde) ist blasser. Jede Änderung wird sofort gespeichert.

**„Genauer Zeitraum“** (auf die Viertelstunde, zugeklappt: Ein Klick auf den Titel öffnet ihn; auf der Stufe Experte von Anfang an offen): „Gruppe“, „Kategorie“, Kästchen der Tage (Mo bis So), „von“ und „bis“ (UTC), dann „Hinzufügen“. Leere Uhrzeiten = ganzer Tag. Unter dem Formular zeigt eine Zeile die Missionsthemen, die die Kategorie öffnet; bei einer Kategorie nach Wahl führt der Link „Meine Missionsarten…“ zu den Einstellungen in Mein Profil.

**Weitere Knöpfe**
- „⧉ Vorherige Woche“: übernimmt die Zeiträume der vorherigen Woche (ersetzt die angezeigte Woche, nach Bestätigung).
- „Alles löschen“: leert die angezeigte Woche (nach Bestätigung).
- „In den Datenordner schreiben (n)“: erscheint nur, wenn Wochen im Browser geblieben sind; schreibt sie in den gemeinsamen Ordner.

Die Meldung unter dem Block zeigt, wohin die Eingabe gegangen ist: „Im Datenordner gespeichert.“ oder „In diesem Browser behalten, das Zentrum sieht es nicht: …“, wenn der Datenordner nicht freigegeben ist (siehe [Erststart](#erststart), Schritt 3).
Ein vorhandenes altes Stundenraster wird automatisch in die Woche übernommen.
Der Link „Verfügbarkeitseingabe einzeln öffnen“ führt zur Seite Meine Verfügbarkeit. Dieser Link erscheint nur auf der Stufe Experte.

## Meine Verfügbarkeit
<!-- page: apps/pilot/disponibilites.html -->

Diese Seite zeigt nur den Verfügbarkeitseditor, in größerem Format. Sie dient dazu, schnell mehrere Wochen einzugeben.
Sie erreichen sie über die Registerkarte „Meine Verfügbarkeit“ (unter dem Eintrag „Meine Missionen“ der Seitenleiste) oder über den Link „Verfügbarkeitseingabe einzeln öffnen“ in Meine Missionen. Dieser Link erscheint nur auf der Stufe Experte.
Der Pilot ist der des Arbeitskürzels (Pilotenprofil, Anmeldung oder Identitätsübernahme). Im Produktionsmodus verlangt die Seite zuerst eine Anmeldung.

### Meine Verfügbarkeit

Der einzige Block der Seite. Er funktioniert genau wie der gleichnamige Block in Meine Missionen (vorheriges Kapitel): Palette, Stundenraster, „Genauer Zeitraum“ (zugeklappt, auf der Stufe Experte von Anfang an offen), „⧉ Vorherige Woche“, „Alles löschen“.

**Wochennavigation** (nur auf dieser Seite):
- „‹“ und „›“: vorherige oder nächste Woche;
- Datumsfeld: springt zur Woche, die dieses Datum enthält;
- „Aktuelle Woche“: sichtbar außerhalb der aktuellen Woche, führt dorthin zurück.

Tipps und Grenzen:
- Alle Uhrzeiten sind in UTC. Das Raster arbeitet stundenweise, „Genauer Zeitraum“ auf die Viertelstunde.
- Jede Änderung wird sofort gespeichert: Es gibt keinen Knopf „Speichern“.
- Ohne Kürzel zeigt der Block „Kürzel nicht gesetzt: unter Einstellungen › Mein Profil (oder ☰ › Pilotenprofil) festlegen.“
- Eine Adresse der Form `disponibilites.html?semaine=2026-W41` öffnet direkt eine bestimmte Woche.
- Wird die Woche noch gelesen, wird eine Änderung mit „Woche wird noch gelesen: gleich noch einmal versuchen.“ abgelehnt.

Wie das Zentrum diese Angaben nutzt, siehe [Verfügbarkeit und Neuorganisation](../technique/DISPOS_ET_REORGANISATION.md).

## Mein Profil
<!-- page: apps/settings/profil.html -->

Diese Seite vereint die Einstellungen jedes Piloten: Identität, Anmeldung, Missionseinstellungen, Luftfahrzeuge und Simulatoren, Höhe ohne Sauerstoff.
Sie erreichen sie über den Eintrag „Einstellungen“ der Seitenleiste (erste Registerkarte, „Mein Profil“) oder über ☰ › „Einstellungen“.
Die linke Spalte listet die Abschnitte nach Gruppen; ein Klick zeigt einen davon rechts an, mit Titel, Beschreibung, Knöpfen und einer Statusmeldung.
Enthält ein Abschnitt nicht gespeicherte Änderungen, erfordert das Wechseln des Abschnitts oder das Verlassen der Seite eine Bestätigung.
Je nach Nutzungsstufe: „Meine Luftfahrzeuge (Reporting)“ erscheint ab der Stufe Planung (2); „Höhe ohne Sauerstoff“ nur, wenn das Werkzeug Kraftstoff angekreuzt ist (auf der Stufe Experte immer); in „Identität und Netzwerke“ gehören die Karten „IVAO — OAuth-Client“ und „Sprache“ zur Stufe Experte.

### Nutzungsstufe

Was die Suite Ihnen zeigt, je nach Nutzung. Vier Karten, eine pro Stufe (Nummer und Name, was die Stufe zeigt, „Erfordert das Zentrum“ für die Stufen 2 bis 4); die gewählte Karte ist hervorgehoben, und die Zeile „Aktuelle Stufe“ nennt sie. Ein Klick genügt: die Seite wird neu geladen und die Seitenleiste folgt.

| Stufe | Für | Was hinzukommt |
|---|---|---|
| 1 · Besatzung | jeden Piloten | Meine Missionen, Bericht, Planung (nur lesen) |
| 2 · Planung | Diensthabender | Befehle planen: änderbare Einsatztafel, ODV-Planung (Zentrum aktiviert) |
| 3 · Gestaltung | Missionsautor | Missionen: Generator und Register (Zentrum aktiviert) |
| 4 · Experte | Kartograf, Analyst | alle Werkzeuge, Kartenstudio |

„Optionale Werkzeuge“: Flugkarten (Route, topografische Karten, Anflug), Kraftstoff (Flugleistungen und Kraftstoffberechnung), Landungen (Übersicht der Landungen), Missionsanalyse (Auswertung der Einsatzberichte); sie werden auf jeder Stufe angekreuzt und in der Seitenleiste unter „Werkzeuge“ gruppiert; auf Stufe 4 „Auf Stufe Experte alle enthalten“. Standard: Stufe 4, wenn das Zentrum in diesem Browser aktiviert ist, sonst Stufe 1. Die Stufe gewährt keine Rechte: das Zentrum behält seinen Zugang.

### Identität und Netzwerke

Ihre Identität in der Suite, die alle Seiten übernehmen (☰ › Pilotenprofil, Berichte, Auswertungen).

| Karte | Felder |
|---|---|
| „Pilot“ | „Kürzel“, „VATSIM-ID (CID)“, „IVAO-ID (VID)“, „SimBrief (Benutzer oder ID)“ |
| „Website der Fluggesellschaft“ | „Kennung“, „Passwort“ |
| „IVAO — OAuth-Client (persönlich)“ (Stufe Experte) | „Client-ID“, „Client-Geheimnis“, „Bei IVAO anzugebende Weiterleitungsadresse“ (auf developers.ivao.aero einzutragen); Schaltfläche „IVAO-Client speichern“: vom Starter dieses Rechners gehalten, das Geheimnis wird nie wieder angezeigt |
| „Sprache“ (Stufe Experte) | „Sprache der Suite“: Automatisch (Browsersprache), Français, English, Deutsch, Español |

1. Füllen Sie die Felder aus.
2. Klicken Sie auf „Speichern“. Die Statusmeldung bestätigt „Profil in diesem Browser gespeichert“.

- Das Kürzel hat 2 bis 4 Buchstaben oder Ziffern; damit werden Ihre zugewiesenen Missionen gefunden.
- Die Zugangsdaten der Website der Fluggesellschaft bleiben nur in diesem Browser: Sie werden nie in eine Datei oder eine Sicherung geschrieben.
- Die Sprache wird gewöhnlich über die Flagge „Sprache“ der Kopfzeile gewählt; die Karte „Sprache“ (Stufe Experte) gilt, sobald sie gewählt ist, ohne „Speichern“.
- Im Produktionsmodus ist das Kürzel das des angemeldeten Benutzers und lässt sich hier nicht ändern.

### Anmeldung und Passwort

Ihr gemeinsamer Benutzereintrag: Rolle und Passwort (als Hashwert gespeichert, nie im Klartext).

- Oben der Modus der Fluggesellschaft (develop oder production) und Ihr Status: „Angemeldet: … (Rolle)“ oder „Nicht angemeldet.“.
- **Nicht angemeldet**: Karte „Anmelden“ mit „Kürzel“, „Passwort“ und dem Knopf „Anmelden“. Im develop-Modus meldet sich ein Eintrag ohne Passwort ohne Passwort an: Legen Sie danach eines fest.
- **Angemeldet**: Karte „Passwort ändern“ mit „Aktuelles Passwort“, „Neues Passwort (mindestens 8 Zeichen)“, „Bestätigung“, dann „Passwort ändern“.
- Der Knopf „Abmelden“ erscheint nach der Anmeldung.
- Ein vorläufiges Passwort wird angezeigt („vorläufiges Passwort, zu ändern“): Ändern Sie es gleich bei der ersten Anmeldung.
- Passwort vergessen: Bitten Sie einen Administrator des Zentrums um ein Zurücksetzen.

### Missionsarten

Dieser Abschnitt legt die Missionsthemen fest, die Ihre Verfügbarkeitskategorien **nach Wahl** öffnen („Zivilschutz nach Wahl“, „Verteidigung nach Wahl“).

Für jeden Bereich („Zivilschutz“, „Verteidigung“):
1. Wählen Sie einen Modus: „Alle Themen des Bereichs“, „Positivliste: nur diese Themen“ oder „Negativliste: alle außer diesen Themen“.
2. Kreuzen Sie die betreffenden Themen an (zum Beispiel HEMS, SAR, FIRE… oder COMBAT, ISR, AAR…).
3. Die untere Zeile zeigt sofort das Ergebnis: „„Zivilschutz nach Wahl“ öffnet: …“.
4. Klicken Sie auf „Speichern“.

Die Einstellungen werden in Ihrem Benutzereintrag gespeichert und durch die Synchronisierung mit dem Zentrum geteilt. Ohne Kürzel verlangt der Abschnitt, es zuerst unter „Identität und Netzwerke“ einzustellen.

### Luftfahrzeuge und Simulatoren

Die Typen der Flotte, die Sie besitzen und beherrschen, und Ihre Simulatoren. Das Zentrum nutzt dies, um Ihnen ein Luftfahrzeug zuzuweisen und Piloten auf einem gemeinsamen Simulator zusammenzubringen. (Diese Einstellungen befanden sich früher in Meine Missionen.)

**Karte „Luftfahrzeuge“**: eine Zusammenfassung („… Typ(en) beherrscht, … besessen von … Flottentypen.“), dann eine Unterkarte pro Luftfahrzeugkategorie, mit einer Tabelle:

| Spalte | Inhalt |
|---|---|
| „Typ“ | Modell und ICAO-Kennung |
| „Flottenvarianten“ | In der Flotte vorhandene Varianten |
| „Luftfahrzeuge“ | Anzahl der Luftfahrzeuge im Dienst (von der Gesamtzahl) und ihre Basen |
| „Besessen“ | Sie haben diesen Typ in Ihrem Simulator |
| „Beherrscht“ | Sie fliegen ihn sicher |

- Das Ankreuzen von „Beherrscht“ kreuzt auch „Besessen“ an; das Abwählen von „Besessen“ wählt „Beherrscht“ ab.

**Karte „Simulatoren“**: Kreuzen Sie die installierten Simulatoren und Werkzeuge an.

Es gibt keinen Knopf „Speichern“: Jedes Häkchen wird sofort in diesem Browser gespeichert und dann in Ihre bereits angegebenen Verfügbarkeitswochen übernommen, ab der aktuellen Woche. Die Meldung unten zeigt, wie viele Wochen aktualisiert wurden.

### Höhe ohne Sauerstoff (Flugzeuge ohne Druckkabine)

Dieser Abschnitt (Gruppe „Kraftstoffplaner“) legt die Schwelle fest, oberhalb der das Diagramm der optimalen Flughöhe des Planers „Sauerstoff erforderlich“ für ein Flugzeug ohne Druckkabine anzeigt. Er erscheint nur, wenn das Werkzeug Kraftstoff in „Nutzungsstufe“ angekreuzt ist (auf der Stufe Experte immer).

1. Geben Sie „Maximale Höhe ohne Sauerstoff (ft)“ ein: zwischen 1.000 und 30.000 ft, in Schritten von 500.
2. Klicken Sie auf „Speichern“.
3. „Standardwert (10.000 ft)“ stellt den ursprünglichen Wert wieder her.

Unter dem Feld angezeigte Richtwerte: 10.000 ft (übliche Praxis, EASA NCO), 12.500 ft (FAA, Besatzung über 30 Minuten), 14.000 ft (FAA, Besatzung ständig).
Dies ist nur ein Hinweis: Die Berechnung wird nicht begrenzt. Die Einstellung wird in diesem Browser gespeichert.

### Meine Luftfahrzeuge (Reporting)

Die Luftfahrzeuge, die Sie geflogen oder berichtet haben: die der Berichte mit Ihrem Kürzel in der Besatzung oder die Sie verfasst haben (seit dieser Version gespeicherte Berichte) (das Luftfahrzeug Ihres Platzes, wenn der Bericht es angibt), mit Typ, Variante, Rufzeichen, Betreiber, Anzahl der Flüge und letztem Flug. Das graue Kästchen „Flotte“ zeigt, ob das Luftfahrzeug zur Flotte gehört (angehakt) oder nicht (nicht angehakt, Rufzeichen inbegriffen); es lässt sich hier nicht ändern. Die vollständige Liste mit dem Kästchen „Privat“ steht unter Einstellungen › Zentrum › Flotte (dem Zentrum vorbehalten). Oben die Zählung des Journals: Berichte insgesamt, Ihre Berichte, Berichte ohne erfasste Besatzung (sie zählen für niemanden). Abschnitt ab der Stufe Planung (2) sichtbar.

## Darstellung
<!-- page: apps/settings/apparence.html -->

Diese Seite stellt das Aussehen der ganzen Suite ein: Design, Diagramme, Symbole, Seitenleiste und Farben.
Der Eintrag „Darstellung“ der Seitenleiste (oder der Knopf „Darstellung“ im Menü ☰) öffnet sie in einem Fenster über der aktuellen Seite: Sie sehen die Wirkung sofort. Schließen: „✕“, Esc oder Klick außerhalb des Fensters.
Dieselbe Oberfläche gibt es als ganze Seite (☰ › Liste der Einstellungsseiten › „Darstellung“).
Die Einstellungen werden in diesem Browser gespeichert und gelten für alle Seiten; sie zählen nicht für die Sicherungserinnerung.
Je nach Nutzungsstufe: Auf den Stufen 1 bis 3 zeigt die Seite das Design, den aktuellen Symbolsatz, die Seitenleiste, die Symbolgröße und „Alles zurücksetzen“; Dekor, Aqua-Farbe, Anzeige der Leiste, die übrigen Symbolsätze, Diagramme, Themenfarben und „Vollständige Demo“ kommen auf der Stufe Experte hinzu.

### Design

Die Form der Seiten: Ecken, Dichte, Titel, Seitenleiste.

- Jedes Design wird durch ein in seinem Stil gezeichnetes Vorschaubild dargestellt, mit Name und Beschreibung: Standard, Aero, Operativ, Konsole, Kabinett, Flugbuch, Robust, Aqua, Taktisch.
- Sechs Vorschaubilder erscheinen sofort (dazu das aktuelle Design, falls es nicht darunter ist); die übrigen liegen zum Aufklappen unter „Weitere Designs“.
- Ein Klick auf ein Vorschaubild wendet das Design sofort an. Das gewählte Vorschaubild ist umrahmt.
- Kabinett, Flugbuch, Robust und Aqua bringen ihre Materialien mit, Taktisch sein Rauchglas auf Nachthintergrund; die Informationsfarben bleiben die des Themas (Taktisch: Kante oben an den Blöcken).

**„Dekor (Material-Designs)“** (Stufe Experte):
- „Vollständig“ (Standard): illustrierte Blockflächen, Registerblätter, Schrauben, Radar;
- „Schlicht“: nur Materialien und Schilder, auf allen Seiten.

**„Aqua-Farbe“** (Stufe Experte): Farbe der Knöpfe und Symbole des Aqua-Designs (Blau, Türkis, Grün, Graphit, Violett, Orange, Rot, Rosa) oder „Farbe jeder Anwendung“. Die Statussymbole behalten ihre ursprünglichen Farben.

### Diagramme

Farbpalette und Stil der Diagramme (Auswertungen, Kennzahlen). Abschnitt der Stufe Experte.

- Paletten: „Automatisch“ (folgt dem Design), „Kräftig (Seitenfarben)“, „Schiefer“, „Messing und Leder“, „Khaki und Oliv“. Jede Zeile zeigt ein Farbmuster.
- „Stil“: „Automatisch“, „Flach“ oder „Relief“.

Die Wahl gilt sofort für die Diagramme der Seiten.

### Symbole

Die Strichstärke der Symbole oder gar keine Symbole. Jede Zeile zeigt eine Vorschau des Satzes. Auf den Stufen 1 bis 3 wird nur der aktuelle Satz angeboten; alle Sätze auf der Stufe Experte.

| Wahl | Darstellung |
|---|---|
| „Je nach Design“ | Der vom gewählten Design vorgesehene Satz |
| „Dünne Linie“, „Normale Linie“, „Dicke Linie“ | Liniensymbole |
| „Messing (Medaillons)“, „Stahl (Platten)“, „Gel (Blasen)“, „Avionik (Instrumente)“ | Material-Sätze |
| „Keine Symbole“ | Keine Symbole |

**„Seitenleiste“**: „Je nach Design“, „Immer“ oder „Nie“. Standardmäßig wird sie immer angezeigt (außer bei schmalem Bildschirm und beim Drucken). „Symbolgröße“: „Klein“, „Mittel“ (Standard) oder „Groß“. „Anzeige“ (Stufe Experte): „Symbol und Beschriftung“ (Standard), „Nur Symbol“ (schmalere Leiste, Name des Eintrags als Tooltip) oder „Nur Beschriftung“.

### Themenfarben

Jede Seite der Suite hat ein Farbthema (Leiste, Text der Leiste, Akzent). Für jedes Thema wählen Sie eine Farbfamilie und einen Ton; daraus werden die Farben berechnet, mit einer Lesbarkeitsprüfung. Abschnitt der Stufe Experte.

Die Themen werden als Karten dargestellt, in zwei Gruppen: „Anwendungen“ (Kraftstoff, Landungen, Zentrum, Bericht) und „Berichtsfamilien“.

Auf jeder Karte:
1. Die Vorschau zeigt einen „Titel“ auf der Leiste, eine „Schaltfläche“ und einen „Link, Symbol“.
2. Die Farbpunkte wählen die Familie (Rot, Ziegel, Orange… Schiefer, Graphit); „↺“ kehrt zu den ursprünglichen Farben zurück.
3. Der Schieberegler „Ton“ (von dunkel bis hell) stellt die Helligkeit ein. Bei den ursprünglichen Farben ist er inaktiv.
4. Die Kontrastanzeigen zeigen ✓ oder ✗ für „Text / Leiste“ und „Akzent / Seite“ (mindestens 4,5:1) und für „Akzent / Karte“ (mindestens 3:1).
5. „Auf dieser Seite zeigen“ leiht der aktuellen Seite die Farben des Themas, um sie zu beurteilen; ein zweiter Klick (oder das Schließen des Fensters) hebt es auf.

Jede Änderung wird sofort gespeichert.

**Unten auf der Seite**:
- „Vollständige Demo“ (Stufe Experte) öffnet ein Modell: Generator, Symbolkatalog und Kontraste aller Themen.
- „Alles zurücksetzen“ stellt alle Darstellungseinstellungen auf die Standardwerte zurück (Design Aqua, Symbole des Designs, Seitenleiste immer angezeigt, vollständiges Dekor, ursprüngliche Farben).

## Erststart
<!-- page: apps/settings/premier_lancement.html -->

Diese Seite richtet ein, was die Suite zum Arbeiten braucht. Der Starter (`lancer.cmd` unter Windows, `sh lancer.sh` unter macOS oder Linux) öffnet sie von selbst; jederzeit erreichbar über Einstellungen › Registerkarte „Erststart“ oder die Karte „Erststart“ der Startseite, die angezeigt wird, solange noch etwas einzustellen ist.
Vom Starter geöffnet, leitet die Seite nur dann zur Startseite weiter, wenn „Abschließen“ für diese Installation erfolgt ist (derselbe Suite-Ordner) und nichts Verpflichtendes fehlt. Eine neue Installation unter derselben Adresse zeigt daher den Erststart, und die Startseite kündigt ihn als Banner an.

Oben zeigt eine **Leiste der sechs Schritte** (1 Ordner · 2 Daten · 3 Unternehmen · 4 Profil · 5 Luftfahrtdaten und Typen · 6 Zentrum) den Stand jedes Schritts: ✓ erledigt, ○ zu erledigen, – optional, 🔒 ohne Schritt 1 gesperrt, ✗ zu wiederholen; der aktuelle Schritt ist eingekreist, ein Klick öffnet einen Schritt. Die ausführliche Bilanz, **„Stand der Suite“**, steht in einem zugeklappten Bereich: jede Zeile führt zu ihrem Schritt (✓ eingestellt, ○ zu erledigen, – optional, ? unbekannt: kein Starter).
- Für alle: Daten, Git-Synchronisierungs-Repository (optional), Anwendungsordner, Fluggesellschaft und Website, IVAO-API-Schlüssel (optional), Pilot (Kürzel und mindestens ein Netzwerk), Zugangsdaten der Website, Luftfahrtdaten.
- Zentrum: Aktivierung (Administratoren); ist das Zentrum aktiviert, Flotte und Flugbuch der Website, Missionen des Registers, Benutzer und Rechte (mindestens ein Administrator), Berichtsversand (optional).

Über der Übersicht öffnet „📘 Installationsanleitung, Schritt für Schritt“ die [Installationsanleitung](../tutorial/installation.en.md) in der Hilfe, in der Sprache der Suite (sonst Englisch).

Derselbe Stand steht als Plakette im Titel jedes Schritts (die Nummer wird grün, wenn er erledigt ist), darunter eine Zeile „✓ Erledigt: …“ oder „○ Zu erledigen: …“. Der aktuelle Schritt ist geöffnet, die anderen zugeklappt; jeder Schritt endet mit „Weiter →“.

### 1 Ordner

Der Browser verlangt, jeden Ordner einmal anzugeben; danach merkt er ihn sich.

- **„Anwendungsordner“**: „Anwendungsordner wählen“, dann geben Sie den Ordner an, der `lancer.cmd` und `lancer.sh` enthält. Die anderen Ordner (Daten, Register, Missionen, SIA, Leistungen, lokale Sicherung) werden daraus abgeleitet; die Meldung zeigt, wie viele eingestellt wurden.
- Der Ordner muss der der vom Starter bereitgestellten Suite sein: gehört er zu einer anderen Kopie der Suite, bleibt der Schritt offen (✗ in der Übersicht) mit der Meldung „Suite gestartet aus …, angegebener Ordner …“; wählen Sie den richtigen Ordner neu.
- **„ODV-Arbeitsmappe (optional)“**: „OneDrive-Ordner…“ gibt den synchronisierten Ordner an, in dem die Staffel die Arbeitsmappe ablegt (die ODV-Planung öffnet die neueste). Ohne OneDrive: „oder die Excel-Datei…“, in diesem Browser gespeichert.

Dieser Schritt ist wichtig: Ohne freigegebenen Datenordner bleibt Ihre Verfügbarkeit im Browser und das Zentrum sieht sie nicht.

### 2 Daten

Dieser Schritt installiert die Daten der Fluggesellschaft (Missionen, Referenzen…). Er läuft über den Starter: Ohne ihn zeigt die Seite „Öffnen Sie für diesen Schritt die Suite mit dem Starter…“.

Solange der Anwendungsordner (Schritt 1) nicht gewählt ist oder zu einer anderen Kopie der Suite gehört, sind dieser Schritt und die folgenden (Fluggesellschaft, Profil, Luftfahrtdaten, Zentrum) ausgegraut und inaktiv, mit dem Grund oben in jedem, ebenso „Abschließen“; die Übersicht bleibt lesbar.

Drei Möglichkeiten:

| Karte | Vorgehen |
|---|---|
| „Testdatensatz“ | „Testdaten installieren“: fiktive Daten, mit der Suite geliefert (Missionen mit einer Übung, Piloten, Flotte, Verfügbarkeit und Zuweisungen der laufenden Woche), um die Suite kennenzulernen; später durch die Daten der Fluggesellschaft zu ersetzen. Abgelehnt, wenn bereits Daten vorhanden sind. |
| „Daten-Repository“ | Geben Sie „Repository-Adresse“ ein (von Ihrer Fluggesellschaft: `https://…` oder `git@…`), bei Bedarf „Kennung (optional)“ und „Passwort oder Token (optional)“, haken Sie bei Bedarf „im Anmeldeinformations-Manager von Git speichern“ an, dann „Daten abrufen“. Das erste Herunterladen dauert einige Minuten. |
| „Ich habe die Daten per E-Mail erhalten“ | „Datenarchiv…“: Wählen Sie das erhaltene `.zip`-Archiv (es enthält `data_tree.js`). |
- Keine Adresse ist vorausgefüllt. Privates Repository über HTTPS: Kennung und Passwort, oder ein Lese-Zugriffstoken bei Zwei-Faktor-Authentifizierung; über SSH (`git@…`) der SSH-Schlüssel des Rechners.
- Ist Git nicht installiert: Testdatensatz oder Archiv (oder installieren Sie Git und starten Sie neu).
- **„Git-Repository zur Datensynchronisierung (optional)“**: die Adresse des entfernten Repositorys von `data/`, das die Daten
  zwischen den Rechnern teilt (Knopf „Synchronisieren“). SSH-Adresse `git@hôte:compte/dépôt.git` (SSH-Schlüssel des Computers) oder
  HTTPS `https://hôte/compte/dépôt.git` (in Git gespeicherte Zugangsdaten). Die Karte zeigt das aktuelle Repository;
  „Prüfen“ sagt, ob es von diesem Rechner aus antwortet (höchstens 30 s), „Speichern“ macht es zum entfernten Repository von `data/`
  (sind noch keine Daten vorhanden, dient die Adresse dazu, sie zu holen). Nichts ist blockierend: Ein Repository, das nicht antwortet, wird gemeldet,
  Für ein anderes Repository als das aktuelle öffnet der Starter ein Bestätigungsfenster auf dem Computer (aktuelle und neue
  Adresse, „Nein“ voreingestellt): mit „Ja“ antworten, um zu wechseln; keine Seite kann an Ihrer Stelle antworten. Nie ein Passwort oder Token in der Adresse.
  die Suite funktioniert ohne Teilen. Einzelheiten: [Synchronisierung](../technique/SYNCHRONISATION.md).
- Sind die Daten vorhanden, bietet die optionale Karte „Flugbuch“ den Knopf „Journal (.html)…“: Die gespeicherte Seite „Log des vols“ der Website der Fluggesellschaft füllt die Piloten und Luftfahrzeuge der Referenz (Eingabehilfe).

### 3 Fluggesellschaft

Die virtuelle Fluggesellschaft, deren Namen die Suite trägt, und die Adresse ihrer Website (Links, Flotte, Flugbuch); Einstellung dieses Browsers.

1. Karte „Virtuelle Fluggesellschaft“: „Name“, „Kürzel“, „Vollständiger Name“, „Website der Fluggesellschaft“ (`https://…`).
2. Karte „IVAO-API-Schlüssel (optional)“: der Schlüssel der Installation (Gebietsaktivierungen und IVAO-ATC-Sitzungen der Einsatztafel und der ODV-Planung). Er wird beim Starter gespeichert und nie wieder angezeigt: Die Karte sagt nur, dass ein Schlüssel gespeichert ist.
3. „Fluggesellschaft speichern“.

Die übrigen Felder (Zentrum, Seiten der Website, externe Quellen) stehen unter Einstellungen › Installation › Quellen und Ordner.

### 4 Profil und Zugangsdaten

1. Karte „Pilot“: „Kürzel“, „IVAO-ID (VID)“, „VATSIM-ID (CID)“, „SimBrief“. Im Produktionsmodus ist das Kürzel fest (es kommt vom Konto).
2. Karte „Website der Fluggesellschaft“: „Kennung“ und „Passwort“ Ihres Kontos auf der Website, nur in diesem Browser gespeichert (nie in einer Datei oder Sicherung).
3. „Profil speichern“.

Die Suite fragt nie nach Ihren IVAO- oder VATSIM-Passwörtern: Ihre Kennungen (VID, CID) genügen. Das Konto der Suite (Passwort, Produktionsmodus), der persönliche IVAO-Client und die Einstellungen werden in [Mein Profil](#mein-profil) eingestellt.

### 5 Luftfahrtdaten und Luftfahrzeugtypen

Karten, Missionen und Planung nutzen die Luftfahrtdaten (AIRAC) und die Datenbank der Luftfahrzeugtypen. Der Schritt zeigt dieselben Blöcke wie Einstellungen › Installation:

1. ① Zuerst „Luftfahrzeugtypen“, mit einer Statuszeile davor („✓ 34 bekannte Typen, 18 mit Leistungen“, „○ n Typen zu ergänzen“): „Automatisch ergänzen“ lädt die Typen (ICAO) und ihre Leistungen (EUROCONTROL) herunter und meldet dann „✓ Fertig: …“ (Typen ohne EUROCONTROL-Leistungen sind bei Militärflugzeugen und Hubschraubern normal).
2. ② „Luftfahrtdaten“, mit ihren Statuszeilen davor (Datenbank: AIRAC, Lufträume, Erstellungsdatum; MORA; X-Plane, optional): Frankreich ist standardmäßig aktiv, ein Klick auf die Karte wählt weitere Zonen, jede Quelle behält ihre Schaltfläche (SIA-ZIP: Link zum Shop, kostenloses Konto, Zyklusprodukt zu 0 €, dann „Heruntergeladene ZIP abrufen“; MORA; MILAIP-PDF; Datensätze anderer Länder). Eine einzige Hauptschaltfläche, **„Alles installieren für <Zonen>“**, verkettet das Ergänzen der Typen und dann die Aktivierung der Zonen, wartet das Ende jeder Aufgabe ab und sagt, was bleibt; bereits Installiertes wird nicht wiederholt. Die Expertenkarten (Luftfahrtdatenbank, MORA, Kohärenz) sind unter „Erweiterte Werkzeuge“ zugeklappt (auch unter Einstellungen › Wartung).

### 6 Zentrum (Administratoren)

Nur für Administratoren der SO Group: Piloten überspringen diesen Schritt und klicken „Abschließen“. Jeder Link des Schritts sagt, was man dort tut, und öffnet sich in einem neuen Tab.
- Karte „Zentrum aktivieren“: „Passwort des Zentrums“ (neben dem Knopf angezeigt, `DEFA` voreingestellt), dann „Zentrum aktivieren“. Die Übersicht zeigt den Modus des Zentrums (eigenständig: Passwort).
- Ist das Zentrum aktiviert:
  - „Flotte und Flugbuch“: letztes Lesen der Website durch den Starter (Flotte, Standort der Luftfahrzeuge, Flugbuch), „Jetzt aktualisieren“ und der Link zur Flotte (Einstellungen › Zentrum).
  - „Missionen“: „✓ n Missionen im Register: nichts zu tun“, sonst ihre Herkunft (Daten aus Schritt 2, sonst Zentrum › Missionsgenerator), und der Link zum Register.
  - „Einstellungen der SO Group“: Links zu den Rubriken unter Einstellungen › Zentrum — Benutzer und Rechte (Anzahl, Administratoren, Modus), Verfügbarkeitskategorien, ODV-Planung, Einsatztafel, Berichtsversand, Routenberechnung.

„Abschließen“ ist erst aktiv, wenn die Schritte 1 bis 5 erledigt sind (sonst sagt es, was fehlt); es vermerkt die Suite als „eingerichtet“ und öffnet die Startseite. Der Link „Start“ führt ohne Abschluss dorthin zurück.

### Neu beginnen

Um den Erststart von vorn zu beginnen, und nur in diesem Fall. Der Block ist standardmäßig zugeklappt.

- „Bereinigen und neu beginnen…“ löscht **in diesem Browser** die gespeicherten Ordner (Anwendung, Daten, Register, Missionen, SIA, ODV, X-Plane, Leistungen, lokale Sicherung), die Kopie der ODV-Arbeitsmappe, die Zugangsdaten der Website der Fluggesellschaft, das Profil (Kürzel, IVAO, VATSIM, SimBrief) und den Vermerk „Suite eingerichtet“.
- Eine Bestätigung wird verlangt, dann lädt die Seite neu bei Schritt 1.
- Die Dateien auf der Festplatte werden nicht berührt: Ordner `data/`, Register, Sicherung `defa_local_store.yaml`.

## Neuer Bericht
<!-- page: apps/cr/mission_cr.html -->

Diese Seite ist der Einstieg für jeden Missionsbericht: Sie wählen hier die Familie der
Mission, dann öffnet sich die Berichtsseite dieser Familie. Sie richtet sich an alle Piloten.
Zugang: Seitenleiste › **Bericht** oder der Knopf „Neuer Bericht“ in der Kopfzeile der
allgemeinen Auswertung. Ein Bericht kann sich auch direkt und bereits ausgefüllt öffnen, aus einer Mission, die Ihnen
zugewiesen wurde (siehe unten). Vollständige Schritt-für-Schritt-Anleitung: [Tutorial](../TUTORIAL.md).

### Meine zu berichtenden Missionen

Erster Block der Seite: die Ihnen zugewiesenen Missionen, die schon vergangen sind (höchstens 21 Tage) und keinen Bericht im Register haben, wie im Block „Zu schreibende Berichte“ der Seite „Heute“ (höchstens sieben Zeilen).

- **„Bericht schreiben“** öffnet die Missionsmappe in „Meine Missionen“ und beginnt den Bericht in der Familie der Mission, aus dem Einsatzbefehl ausgefüllt (siehe „Zugewiesene Mission übernehmen“).
- **„Kein Bericht“** nimmt die Mission aus der Liste (in diesem Browser gemerkt).
- Ohne eingestelltes Kürzel fragt der Block direkt danach (Feld „Kürzel“, Knopf „Speichern“). Die Wahl der Familie weiter unten bleibt für eine Mission außerhalb Ihrer Zuweisungen.

### Einsatzfamilie

Der Block zeigt eine Kachel pro Familie (16 Familien: HEMS, FIRE, SAR, AIRLIFT, AAR, MARITIME, HADR,
AIRBORNE, FI, SURVEY, LE, ISR, COMMAND, COMBAT, SOF, SPECIAL). Jede Kachel trägt den Code der Familie
und ihren Namen; beim Überfahren erscheint ihre Beschreibung.

1. Suchen Sie die Familie Ihrer Mission.
2. Klicken Sie auf ihre Kachel: Die Berichtsseite der Familie öffnet sich mit einer leeren Mission.

Tipps:

- die zuletzt verwendete Familie erscheint immer an erster Stelle, umrahmt, mit dem Vermerk „Weiter mit“;
- Sie können die Familie später wechseln, über den Hinweis „Familie · Untertyp ▾“ in der Kopfzeile
  der Berichtsseite;
- die Seite erscheint jedes Mal: Sie leitet Sie nicht automatisch zur letzten Familie weiter.

### Familie anhand der Mission suchen

Das Suchfeld (angezeigtes Beispiel: „Hubschrauber-Medevac“, „Luftbetankung“,
„Fallschirmabwurf“…) findet die Familie anhand einer freien Beschreibung.

1. Tippen Sie einige Wörter: Missionsart, Luftfahrzeug, Organisation („Waldbrand“, „Canadair“,
   „Fallschirmjäger“…). Akzente und Wortanfänge genügen („Luftbetank“, „Fallschirm“).
2. Die Familien werden geordnet: Die beste ist umrahmt, die nicht passenden sind abgeblendet.
   Unter dem Feld zeigt „Vorschlag (Eingabe zum Öffnen):“ die vorgeschlagene Familie.
3. Drücken Sie **Eingabe**, um die erste zu öffnen, oder klicken Sie auf eine andere Kachel.

Passt nichts, erscheint die Meldung „Keine passende Familie: SPECIAL deckt andere Einsätze ab.“:
SPECIAL (Sondertransport, Erprobung, Ausbildung) nimmt alle anderen Missionen auf.

### Zugewiesene Mission übernehmen

Hat Ihnen das Zentrum eine Mission zugewiesen, ist die Wahl der Familie unnötig: Der Bericht
öffnet sich direkt in der richtigen Familie, bereits ausgefüllt.

| Woher | Knopf |
|---|---|
| **Meine Missionen** (Missionsmappe geöffnet) | „Bericht erstellen“ (ausgegraut, wenn die Mission keine Missionsdatei hat) |
| **Register** der Missionen (Zentrum) | „Bericht erstellen“ oder „Neuer Bericht (Flug n)“, wenn die Mission bereits Berichte hat |
| **Missionsgenerator** (Zentrum) | Knopf der Kopfzeile „Bericht erstellen →“ |

Was übernommen wird: Name der Übung / Operation (Titel der Mission), Kennung der Mission (Feld
„Mission“), Ziel und Anweisungen (Block Auftrag), Abflug- und Zielflugplatz, Wegpunkte und
Koordinaten, Gebiet, Luftfahrzeuge (ICAO-Typ, Kennzeichen, Rufzeichen), Organisation sowie ein Hinweis auf die Mission und die Zuladung
in den Bemerkungen. Danach gelten die üblichen Hilfen (bekanntes Luftfahrzeug, Flugplatz, Wetter).

- Die Familie wird aus der Missionsart abgeleitet (MEDEVAC → HEMS, TRAINING → SPECIAL…).
- Ist in dieser Familie ein Entwurf in Arbeit, fragt die Seite „Aktuellen Entwurf durch die generierte Mission
  (SIA XML) ersetzen?“.
- Aus dem Register geht eine Mission im Zustand „erzeugt“ oder „geplant“ in den Zustand „geflogen“ über.
- Die Berichtsnummer wird aus der Mission berechnet: `CRM-016-1`, dann `CRM-016-2`, wenn die Mission erneut geflogen wird.

## Bericht einer Familie
<!-- page: apps/cr/AAR/aar_cr.html -->
<!-- page: apps/cr/AIRBORNE/airborne_cr.html -->
<!-- page: apps/cr/AIRLIFT/airlift_cr.html -->
<!-- page: apps/cr/COMBAT/combat_cr.html -->
<!-- page: apps/cr/COMMAND/command_cr.html -->
<!-- page: apps/cr/FIRE/fire_cr.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_cr.html -->
<!-- page: apps/cr/HADR/hadr_cr.html -->
<!-- page: apps/cr/HEMS/hems_medevac_cr.html -->
<!-- page: apps/cr/ISR/isr_cr.html -->
<!-- page: apps/cr/LE/le_cr.html -->
<!-- page: apps/cr/MARITIME/maritime_cr.html -->
<!-- page: apps/cr/SAR/sar_cr.html -->
<!-- page: apps/cr/SOF/sof_cr.html -->
<!-- page: apps/cr/SPECIAL/special_cr.html -->
<!-- page: apps/cr/SURVEY/survey_cr.html -->

Alle Familien teilen dieselbe Eingabeseite: dieselben gemeinsamen Blöcke, dazu einige Blöcke, die der
Familie eigen sind. Sie verfassen hier den Bericht eines durchgeführten Flugs und speichern ihn dann im Einsatzregister.
Sie erreichen sie über die Seite „Neuer Bericht“, über eine zugewiesene Mission oder durch Klick auf eine Mission
in einer Auswertung oder einem Blatt (die Mission öffnet sich dann zur Bearbeitung).

**Je nach Nutzungsstufe: kurzer oder ausführlicher Bericht.** Auf den Stufen 1 (Besatzung) und 2 (Planung) zeigt das Formular nur das Wesentliche des Berichts:
- Identifikation (Mission, Berichtsnummer, Datum, Serie) und Ergebnis;
- Luftfahrzeug (Kennzeichen, Typ, Rufzeichen, Flugplätze; ein bekanntes Luftfahrzeug füllt den Rest aus) und Besatzung;
- vier Uhrzeiten (Anlassen, Start, Landung, Abstellen der Triebwerke), Kraftstoff beim Abflug und bei der Landung;
- die familieneigenen Blöcke und Bemerkungen.

Der Knopf „Ausführlicher Bericht“ der Leiste zeigt das ganze Formular, ohne die Stufe zu wechseln (Wahl im Browser gespeichert); „Kurzer Bericht“ kehrt zum verkürzten Formular zurück. Werte, die bereits in ausgeblendeten Feldern stehen (Import, Flugplan, Netzwerk-Tracking), bleiben im Bericht. Auf den Stufen 3 und 4 ist das Formular immer vollständig, und dieser Knopf fehlt.

### Kopfzeile und Werkzeugleiste

Die Kopfzeile bleibt oben auf der Seite fixiert. Von links nach rechts:

| Eintrag | Funktion |
|---|---|
| „SAR · SAR an Land ▾“ (Familie · Untertyp) | Popup „Einsatzfamilie“ (öffnet die Seite der anderen Familie) und „Einsatz-Untertyp“ |
| „Ins Register aufnehmen“ / „Änderungen speichern“ | legt die Mission im Register ab |
| „Bericht senden“ | übermittelt den Bericht an den Webservice der (gestrichelt, solange er nicht eingerichtet ist) |
| „Auswerten / importieren…“ ▾ | einen Flugplan, eine Tracker-Seite, ein METAR einfügen; eine Datei importieren |
| „Netzwerk-Tracking“ ▾ | Live-Verfolgung IVAO / VATSIM, VATSIM-Historie |
| „Einsatz“ ▾ | „Neue Mission“, „Einsatz exportieren (YAML)“, „Diesen Einsatz löschen“ (bei Bearbeitung) |
| „Einsatzregister“ ▾ | „Auswertung anzeigen“, „Registerordner…“, „Berichtversand einrichten (Webservice)…“, „Einstellungen — Datenbanken…“ |
| „Ausführlicher Bericht“ / „Kurzer Bericht“ | nur Stufen 1 und 2: zeigt das ganze Formular oder kehrt zum kurzen Bericht zurück (siehe oben) |

Rechts zeigt eine Statusmeldung die letzte Speicherung („Entwurf im Browser gespeichert
· Uhrzeit“). Jeder Block hat in seinem Titel **↕** (ziehen zum Verschieben) und **Ausblenden /
Anzeigen**; die Anordnung wird gespeichert. Blöcke, die eine Liste enthalten, haben ein **+** in ihrem
Titel, um ein Element hinzuzufügen.

Auf den Stufen 1 und 2 erscheinen „Auswerten / importieren…“, „Einsatz“ und „Einsatzregister“ nicht (sie kommen auf Stufe 3): Eine neue Mission öffnet man über ☰ › Missionen › „Neuer Bericht“.

### Bearbeitung eines Registereinsatzes

Dieses Banner erscheint nur, wenn Sie eine bereits gespeicherte Mission bearbeiten (geöffnet aus einer Auswertung,
einem Blatt oder direkt nach „Ins Register aufnehmen“). Es zeigt die Berichtsnummer und ihren Platz im Register
(z. B. `CRS-004-1 — missions.yaml #12`).

- Der Hauptknopf wird zu „Änderungen speichern“.
- „Einsatz ▾ › Diesen Einsatz löschen“ erscheint (Bestätigung: „Diesen Einsatz endgültig aus dem
  Register löschen?“), danach kehrt die Seite zur Auswertung der Familie zurück.
- Wurde die Mission inzwischen verschoben oder gelöscht, meldet die Seite dies und öffnet eine neue Mission.

### Identifikation & Organisation

Nummern, Datum, Serie, Übung oder realer Einsatz, Organisation.

| Feld | Gut zu wissen |
|---|---|
| „Einsatz (Kennung)“ | Kennung der geflogenen Mission (`M-016`, `S-002A`); leer: Bericht ohne Mission. Ein Link „Einsatz im Register ansehen ↗“ erscheint darunter, mit der Anzahl der Berichte dieser Mission und der Abweichung vom geschätzten Flug |
| „Bericht-Nr.“ | berechnet, nicht änderbar: `CRM-016-1`, `CRM-016-2` bei erneutem Flug; ohne Mission: `CRM-A01-0` |
| „Serie“ / „Untertyp“ | Missionsart der Familie; die Serie steht auch im Hinweis der Kopfzeile |
| „Datum“, „Ortszeit“, „UTC-Zeit“ | standardmäßig das heutige Datum; die Ortszeit füllt die UTC-Zeit und umgekehrt; die Briefing-Zeit füllt sie, wenn sie leer sind |
| „Übung / realer Einsatz“ | „Übung / Simulation“ oder „Realer Einsatz“ |
| „Name der Übung / Operation“, „Organisation“, „Einheit“ | Ihre bereits eingegebenen Werte werden vorgeschlagen |
| „Anfordernde Stelle“, „Führende Stelle“ | übernommen aus der letzten Mission desselben Rufzeichens oder derselben Organisation |

Je nach Familie kommen weitere Felder hinzu oder fallen weg: „Seriennummer“, „Einstufung“
(nicht zivile Familien), „Auftragsreferenz“, „Abteilung“. Ein Datum in der Zukunft wird
gemeldet: Ein Bericht betrifft einen durchgeführten Flug.

### Ergebnis

Ergebnis der Mission und Folgemaßnahmen (Block an 2. Stelle für das Lesen des Berichts).

1. Wählen Sie das „Ergebnis“: Erfolgreich, Teilweise erfolgreich, Abgebrochen, Storniert, Umgeleitet, Kein Kontakt,
   Ziel nicht gefunden, Wetter, Technisch, Operativ, Andere.
2. Bei jedem Ergebnis außer Erfolgreich oder Andere erscheinen die Felder „Abbruchgrund“ und „Ursachen“; alle Ursachen ankreuzen (Wetter, Technik, Simulator, Pilot fehlt, keine Flugsicherung, Netz, Luftraum nicht aktiviert, Tanker fehlt, Zeitmangel…): sie erscheinen auf der Kachel des Flugbefehls (MNE).
3. Ergänzen Sie bei Bedarf „Detailliertes Ergebnis“, „Vorfälle“ und „Technische Störungen“.

Dieses Ergebnis speist die Erfolgsquote und das Diagramm „Ergebnisse“ der Auswertungen.

### Luftfahrzeug(e) +

Eine Karte pro eingesetztem Luftfahrzeug; es gibt immer mindestens eines. Das „+“ im Titel fügt ein Luftfahrzeug hinzu.

1. Tippen Sie das Kennzeichen (`F-ZB…`): Die bekannten Luftfahrzeuge werden mit Typ, Rufzeichen, Betreiber
   und Basis vorgeschlagen. Wählen Sie eines: Typ, Kategorie, Rufzeichen, ICAO-Betreiber, Basis und Ausrüstung werden
   ausgefüllt.
2. Oder gehen Sie vom Rufzeichen aus: `ctm58` in „Rufzeichen“ ergibt Serie, Nummer, vollständiges Rufzeichen
   und das „Flugplan-Rufzeichen (max. 7 Zeichen)“.

| Knopf / Feld | Funktion |
|---|---|
| „Luftfahrzeugblatt ↗“ | öffnet das Blatt des Luftfahrzeugs (sobald das Kennzeichen eingegeben ist) |
| „⟲ Leeren“ | leert das Luftfahrzeug, um die Suche neu zu starten (falsches Luftfahrzeug oder falscher Typ) |
| „ICAO-Betreiber (OPR/, Feld 18)“ | abgeleitet aus der Organisation oder dem bekannten Luftfahrzeug |
| „Startbasis“, „Rückkehrbasis“, Massen, „Verfügbare Flugdauer (min)“, „Missionskonfiguration“ | bei Bedarf ergänzen |
| „Tatsächlicher Landeflugplatz (ICAO)“ | Flugplatz, auf dem das Luftfahrzeug wirklich gelandet ist, nie vorausgefüllt; in einem aus „Meine Missionen“ geöffneten Bericht (Missions- oder Überführungsbefehl) setzt er das Luftfahrzeug für die folgenden Überführungen auf diesen Flugplatz. Ein Bericht ohne Missionsbefehl verschiebt das Luftfahrzeug nicht |
| „Ausrüstung / technische Fähigkeiten“ | zugeklappt; übernommen vom bekannten Luftfahrzeug oder aus dem Flugplan |

Die Felder filtern sich gegenseitig (Bauart, Typ, Serie). Die Wahl eines anderen Luftfahrzeugs ersetzt, was
automatisch übernommen worden war, nie das, was Sie eingegeben haben. Ein unbekannter Typ wird beim Speichern
in die lokale Datenbank aufgenommen.

### Besatzung +

Besatzungsmitglieder und ihre Funktionen; es gibt immer mindestens eine Zeile. Das „+“ im Titel fügt ein
Mitglied hinzu, das Kreuz „ד am Zeilenende entfernt es.

| Spalte | Inhalt |
|---|---|
| „Rolle“ | Funktion an Bord, familienspezifische Liste |
| „Name / Rufzeichen“ | Kürzel oder Name; bereits eingegebene Namen werden vorgeschlagen |
| „Luftfahrzeug Nr.“ | Nummer der Luftfahrzeugkarte (standardmäßig 1) |
| „Bemerkung“ | freier Text |

Der eingegebene Name dient als Schlüssel für das [Besatzungsblatt](#besatzungsblatt): Schreiben Sie ihn immer gleich.

### Auftrag

Ziel und Anweisungen der Mission: „Ziel“, „Besondere Anweisungen“, „Priorität“.
Bei einer zugewiesenen Mission sind Ziel und Anweisungen bereits aus der Mission ausgefüllt. Diese
Texte erscheinen im Abschnitt „5. Auftrag“ des Berichts.

### Fähigkeiten / Verfahren

Im Flug eingesetzte Verfahren und Mittel, in Gruppen anzukreuzen (Winde, Abwurf, NVG, Nachtflug…).

- Dieser Block ist **standardmäßig ausgeblendet**: Klicken Sie in seinem Titel auf „Anzeigen“, um ihn zu öffnen.
- Beim Anlegen einer Mission werden die Kästchen aus der letzten Mission derselben Serie übernommen: Es
  genügt, sie einmal einzustellen.
- Die angekreuzten Fähigkeiten lassen bestimmte familienspezifische Blöcke erscheinen (z. B. SAR: Windeneinsatz, wenn
  das Luftfahrzeug ein Hubschrauber ist und die Winde angekreuzt ist).

### Zeitablauf

Schlüsselzeiten des Flugs, von Block zu Block, in Ortszeit (HH:MM): „Briefing“, „Anlassen“, „Off-Block“,
„Start“, „Einflug Gebiet“, „Missionsbeginn“, „Missionsende“, „Ausflug Gebiet“,
„Landung“, „On-Block“, „Abstellen“.

1. Geben Sie die Zeiten ein oder klicken Sie auf den Knopf „jetzt“ neben dem Feld (Ortszeit des
   Abflugplatzes; ersatzweise Pariser Zeit).
2. Die Dauern berechnen sich von selbst in „Automatische Berechnungen“.

Jede Uhrzeit erzeugt das entsprechende Ereignis mit Zeitstempel und hält es aktuell. Eine unstimmige Uhrzeit (Ausflug aus dem
Gebiet vor dem Einflug, ungültige Uhrzeit, Zeitablauf von mehr als 20 h) wird hervorgehoben und unter den
Berechnungen aufgeführt. Das Netzwerk-Tracking und der Import einer Tracker-Seite füllen diese Zeiten ebenfalls.

### Kraftstoff (Führungsluftfahrzeug)

Getankter, verbrauchter und verbleibender Kraftstoff des Luftfahrzeugs Nr. 1.

- Wählen Sie die „Einheit“ (kg, lb, L, US gal) und geben Sie dann „FOB Start“, „Rollen“, „Beim
  Start“, „Bei der Landung“, „Bei On-Block“, „Reserve“, „Ausweichkraftstoff“ ein.
- Für Familien, die in einem Einsatzraum arbeiten: „Ankunft im Einsatz“, „Kraftstoff im Einsatzraum“, „Verlassen des
  Einsatzes“.
- „Kraftstoffverbrauch“ und „Kraftstoff im Einsatzraum“ werden in der rechten Spalte berechnet.
- Ein Endkraftstoff über dem Startkraftstoff wird gemeldet.

### Blöcke der Familie

Sie stehen nach dem Kraftstoff und vor den Ereignissen. Ihre Liste steht in der Tabelle
[Spezifische Blöcke jeder Familie](#spezifische-blöcke-jeder-familie). Manche erscheinen nur bei einer
Serie, einer Luftfahrzeugkategorie oder einer angekreuzten Fähigkeit: Die Zeile „Anzeigekontext“ unter den
Berechnungen zeigt die berücksichtigte Serie, Luftfahrzeugtypen und Fähigkeiten.

### Ereignisse mit Zeitstempel +

Bemerkenswerte Ereignisse mit ihrer Uhrzeit, in einer kompakten Tabelle (eine Zeile pro Ereignis, die Beschreibung in
einer 2. Zeile).

1. „+“ im Titel („+ Ereignis hinzufügen“) fügt eine Zeile hinzu.
2. Füllen Sie „Ortszeit“ aus (die Zeit „UTC“ wird berechnet), „Typ“, „Position“, dann bei Bedarf
   „Höhe“, „Geschwindigkeit“, „Steuerkurs“, „Kraftstoff“, „Beschreibung“, „Ergebnis“.
3. „ד am Zeilenende entfernt das Ereignis.

Die vorgeschlagenen Typen umfassen die gemeinsamen Ereignisse (Start, Umleitung…) und die der Familie
(SAR: Beginn / Ende der Suche, Bake erkannt, Überlebender geortet, Überlebender geborgen, SAR-Kit
abgeworfen…). Die vom Zeitablauf erzeugten Ereignisse folgen dessen Uhrzeiten; ein von Hand ergänztes Ereignis
wird nie entfernt.

### Etappen / Einsätze / Umläufe +

Etappen, Einsätze und Umläufe des Flugs, je eine Zeile: „Von“, „Nach“, „Start“, „Landung“,
„Passagiere“, „Fracht (kg)“, „Bemerkung“. Das „+“ im Titel fügt eine Etappe hinzu.

- Die Flugplätze werden aus der Flugplatzdatenbank vorgeschlagen.
- Die Etappen zählen bei den Einsätzen, Passagieren und der Fracht der Auswertungen.
- Die Familie HEMS hat diesen Block nicht: Sie hat ihren eigenen Block „Ziele / Zwischenstopps“.

### Bemerkungen

Freie Beobachtungen und Erkenntnisse: „Beobachtungen“ und „Erkenntnisse (Lessons Learned)“. Sie
bilden die Abschnitte „13. Bemerkungen“ und „14. Erkenntnisse“ des Berichts. Eine zugewiesene Mission
legt hier einen Hinweis auf die ursprüngliche Mission und ihre Zuladung ab.

### IVAO-/VATSIM-Netzwerkspur

Spur des Flugs auf IVAO oder VATSIM.

| Feld | Funktion |
|---|---|
| „Netzwerk“ | „Offline / nicht angegeben“, IVAO oder VATSIM |
| „IVAO-ID (VID)“, „VATSIM-ID (CID)“ | übernommen aus Ihrem Pilotenprofil (Menü ☰ › Pilotenprofil) |
| „URL der Spur“ | Link zur Spur; er erscheint im Bericht („Spur öffnen“) und in den Auswertungen |

Das angegebene Netzwerk speist das Diagramm „Netzwerk“ und die Kennzahl „Online“ der Auswertung.

### Navigation

Flugplätze, Route, Punkte und Arbeitsgebiet. Der Block beginnt mit der Leiste **Aufgegebener Flugplan**:

| Knopf | Quelle |
|---|---|
| „Letzter SimBrief-OFP“ | Ihre SimBrief-Kennung aus dem Pilotenprofil |
| „IVAO-Flugplan (laufender Flug)“ | Ihre VID |
| „VATSIM-Flugplan (laufend oder vorab)“ | Ihre CID |

Diese Knöpfe füllen **nur die leeren Felder**: Luftfahrzeug, ICAO-Ausrüstung, Route, Wegpunkte,
Höhen, Flugplätze, METAR / TAF sowie geplante Massen und Kraftstoff (SimBrief).

Felder: „Abflug (ADEP)“, „Ziel (ADES)“, „Ausweichflugplatz (ALTN)“, „Route“ (nur die bereits für dieselbe Strecke
verwendeten Routen werden vorgeschlagen), „Wegpunkte (einer pro Zeile)“,
„Koordinaten“, „Höhe / FL“, „Mindesthöhe“, „Geschwindigkeit (kt)“, „Distanz (NM)“. Je nach
Familie: „Einsatzgebiet“, „Radius (NM)“, „Korridor“, „Warteschleife / Orbit“.

### Umgebung / Wetter

Angetroffene Wetter- und Umgebungsbedingungen. In der Regel ist **nichts zu tun**: Sobald der Abflugplatz,
das Datum und die Uhrzeit bekannt sind, berechnet die Seite ein METAR zur Flugzeit (Modell Open-Meteo), den
Wind, die Temperatur, das QNH, die Sicht, die Wolkenuntergrenze, die „Dichtehöhe (ft)“, Sonnenaufgang und
Sonnenuntergang sowie die Angabe „Tag / Nacht“.

- Was Sie selbst eingeben, wird nie ersetzt.
- Die Knöpfe „Aktuelles METAR des Startflugplatzes (VATSIM)“, „Berechnetes METAR zur Flugzeit
  (Open-Meteo)“ und „Sonnenauf-/-untergang berechnen“ wiederholen die Berechnung auf Wunsch.
- Ein in „METAR“ eingefügtes METAR wird ausgewertet (Wind, T°, QNH, Sicht, Wolkenuntergrenze).
- „Seegang“ erscheint nur bei einer Seemission, einer Mission an Bord oder mit Amphibienflugzeug;
  „Beleuchtung (Mond…)“ nur bei einem Nachtflug oder unter NVG.

### Automatische Berechnungen

Rechte Spalte, während der Eingabe aktualisiert: „Blockzeit“, „Flugzeit“, „Anflug“,
„Zeit im Einsatzraum“, „Rückflug“, „Missionszeit“, „Kraftstoffverbrauch“, „Kraftstoff im Einsatzraum“.

- Darunter beginnen eventuelle Unstimmigkeiten mit ⚠ (ungültige Uhrzeit, Uhrzeit vor der vorherigen Etappe,
  Zeitablauf von mehr als 20 h, Datum in der Zukunft, unstimmiger Kraftstoff). Ein Klick führt zum betreffenden Feld.
- „Anzeigekontext“ zeigt Familie, Serie, Luftfahrzeugtypen und Fähigkeiten, die
  über die angezeigten Blöcke entscheiden.
- Auf den Stufen 1 und 2 (kurzer Bericht) nur drei Berechnungen: „Blockzeit“, „Flugzeit“, „Kraftstoffverbrauch“; „Anzeigekontext“ und die Berechnungen zu Einsatzraum und Mission kommen auf Stufe 3 oder mit „Ausführlicher Bericht“. Ein Klick auf eine Unstimmigkeit in einem ausgeblendeten Feld zeigt den ausführlichen Bericht.

### Bericht

Vorschau des Berichts, unter den Berechnungen, während der Eingabe und bei jedem Sprachwechsel aktualisiert.
Er umfasst 14 Abschnitte (Identifikation, automatisch verfasste Zusammenfassung, Luftfahrzeuge, Besatzung, Auftrag,
Wetter, Zeitablauf, Durchführung, spezifische Daten, Ergebnisse, Kraftstoff, Vorfälle, Bemerkungen,
Erkenntnisse).

| Knopf | Funktion |
|---|---|
| „Bericht erzeugen / aktualisieren“ | erneuert die Vorschau auf Wunsch |
| „PDF / Drucken“ | druckt **nur** den Bericht (oder speichert ihn als PDF) |
| „Öffentliche Fassung (sensible Daten ausgeblendet: Bericht, Druck, Export)“ | Kästchen sichtbar bei Familien mit sensiblen Daten (COMMAND, ISR, LE, SOF, SPECIAL) |

Die öffentliche Fassung gilt auch für den YAML-Export (Datei mit dem Suffix `_public`) und für den Versand.

### Auswerten / importieren…

Menü der Kopfzeile, um den Bericht aus einem eingefügten Text zu füllen. **Nur leere Felder werden gefüllt.**

1. Öffnen Sie das Menü und fügen Sie dann (Strg+V) in das Feld ein: Die Auswertung erfolgt sofort. Oder klicken Sie auf „Aus
   Zwischenablage einfügen“ (Chrome fragt einmal nach der Erlaubnis).
2. Erkannte Texte: ICAO-Flugplan „(FPL-…)“, Seite des IVAO-Trackers (Einzelheiten eines Flugs oder Liste der
   Verbindungen), Seite eines StatSim-Flugs (VATSIM), VATSIM-Historie (JSON), METAR.
3. Das Ergebnis zeigt die erkannte Quelle und die gefüllten Felder; der Knopf wird zu „✓ Übernehmen“.

Die Links „↗ IVAO-Tracker (meine Verbindungen)“ und „↗ Meine StatSim-Flüge (VATSIM)“ öffnen Ihre Seiten. Der
Link „→ Bericht“, in die Lesezeichenleiste gezogen, kopiert die Tracker-Seite mit einem Klick. Unten
lädt „Importieren (YAML / altes JSON)“ eine Missionsdatei. Einzelheiten: [Tutorial](../TUTORIAL.md), § 6.

### Netzwerk-Tracking

Menü der Kopfzeile, um die Uhrzeiten während des Flugs zu erfassen.

- „Live-Tracking starten“ vor dem Anlassen, dann **lassen Sie die Seite geöffnet** bis zum
  Abstellen der Triebwerke. Alle 20 s liest die Seite die öffentlichen Daten von IVAO / VATSIM und füllt Anlassen,
  Start, Landung und Missionsende. „Tracking beenden“ unterbricht es.
- Nach einem VATSIM-Flug ohne Tracking: „VATSIM-Historie abrufen“ öffnet die Historie in einem Tab;
  kopieren Sie alles (Strg+A, Strg+C) und kehren Sie zurück: Die Verbindungszeiten werden übernommen (zu prüfen).
- Sie brauchen Ihre IVAO- oder VATSIM-ID (Block Netzwerkspur oder Pilotenprofil).

### Entwurf, Register und Export

**Entwurf.** Jede Eingabe wird im Browser gehalten („Entwurf im Browser gespeichert“). Sie können
die Seite schließen und zurückkehren: Der Entwurf der Familie wird wieder geöffnet. Das Verlassen
ohne Speichern im Register zeigt eine Warnung.

**Im Register speichern.**

1. Beim ersten Mal: „Einsatzregister ▾ › Registerordner…“ und wählen Sie den Ordner
   `data/cr` der Daten (Erlaubnis des Browsers, gültig für alle Familien).
2. Klicken Sie auf „Ins Register aufnehmen“: Die Mission wird in das einzige Register `missions.yaml` geschrieben
   (alle Familien). Gibt es diese Berichtsnummer schon, bietet die Seite an, sie trotzdem hinzuzufügen (Doppel) oder
   zum Korrigieren abzubrechen.
3. Die Seite wechselt in die Bearbeitung: „Änderungen speichern“ speichert die folgenden Korrekturen.

Ohne freigegebenen Ordner wird die Mission nur im Browser gespeichert; „Register herunterladen
(YAML)“ erscheint dann im Menü „Einsatzregister“. Das Menü zeigt die Datei, die
Anzahl der Missionen der Familie und den Ordner.

**Weitere Aktionen.**

| Aktion | Wirkung |
|---|---|
| „Einsatz ▾ › Neue Mission“ | beginnt mit einem leeren Bericht neu (Bestätigung, wenn der Entwurf nicht gespeichert ist) |
| „Einsatz ▾ › Einsatz exportieren (YAML)“ | lädt eine Datei nur dieser Mission herunter |
| „Bericht senden“ | sendet Mission, Bericht (HTML und Text) und Berechnungen an den Webservice; die Blase des Knopfs zeigt den letzten Versand. Eine nicht gespeicherte Mission verlangt eine Bestätigung |
| „Einsatzregister ▾ › Auswertung anzeigen“ | öffnet die Auswertung der Familie |

Solange der Webservice nicht eingestellt ist, bietet „Bericht senden“ an, seine Einrichtung zu öffnen
(„Berichtversand einrichten (Webservice)…“).

### Spezifische Blöcke jeder Familie

Die bedingten Blöcke erscheinen nur, wenn die angegebene Bedingung erfüllt ist. Die letzte Spalte
nennt die Kennzahlen der Familie, die in die Auswertungen übernommen werden.

| Familie | Spezifische Blöcke (in der Reihenfolge der Seite) | Kennzahlen der Familie |
|---|---|---|
| HEMS | Dienst und Status · Medizinische Mission · HEMS-Zeiten · Ziele / Zwischenstopps (ersetzt „Etappen / Einsätze / Umläufe“) | beförderte Patienten, abgeschlossene Missionen, Alarm → Start (Mittelwert, ≤ 15 min) |
| FIRE | Flugauftrag · Waldbrand-Zeiten · Abwürfe und Nachladungen | Löschabwürfe, Nachladungen / Wasseraufnahmen, mittlerer Verbrauch (/h) |
| SAR | SAR-Alarm und Koordination · Gesuchte Personen · Suchgebiete und Suchmuster · Erkannte Kontakte · Ortung und Bergung · Windeneinsatz (Hubschrauber + Winde angekreuzt) · Abwurf eines SAR-Kits (Flugzeug oder Amphibienflugzeug + Abwurf angekreuzt) | Suchgebiete, geortete Personen, gerettete Personen, Windeneinsätze, abgeworfene SAR-Kits |
| AIRLIFT | Herkunft, Ziel und Zwischenlandungen · Frachtmanifest · Passagiere und besondere Ladungen · Piste und Bodenbetrieb · Auslieferung | Passagiere, Fracht (t), ausgelieferte Last (t), Umläufe |
| AAR | Rolle, Gebiet und Treffpunkt · Betankte und übergebener Kraftstoff · Kraftstoffbilanz und Vorfälle | Betankte, übergebener Kraftstoff (t), Kontakte, Breakaways |
| MARITIME | Seegebiet und Bedingungen · Schiffskontakte · Beobachtete Verschmutzungen · Übermittlung der Meldung | erkannte Schiffe, identifizierte Schiffe, Auffälligkeiten, beobachtete Verschmutzungen |
| HADR | Katastrophe und Kontext · Aufnahme-, Evakuierungspunkte und Unterkünfte · Evakuierte und Personal · Hilfsfracht · Versorgungsabwurf (Serie „Versorgungsabwurf“ oder Abwurf angekreuzt) | Evakuierte, Hilfspersonal, Hilfsfracht (t), Hilfseinsätze |
| AIRBORNE | Absetzzone (DZ) · Absetzanflüge | Fallschirmspringer, Abwürfe, abgeworfene Last (kg), Abwürfe über DZ |
| FI | Geprüfte Anlage · Überflüge / Runs · ILS (Serien ILS, LOC, Glide path) · VOR / DME / TACAN / NDB (entsprechende Serien) · Verfahrensvalidierung (Serien „Verfahrensvalidierung“, RNAV / GNSS) · Sichthilfen / Befeuerung (Serien PAPI / VASI, „Flughafenbefeuerung“) · Abschluss der Prüfung | geprüfte Anlagen, Überflüge, Auffälligkeiten / außerhalb der Toleranz, in Betrieb, außer Betrieb |
| SURVEY | Projekt und Vermessungsgebiet · Vermessungslinien · Erfassung und Daten · Wettermesspunkte (Serien „Wettererkundung“ und „Atmosphärenforschung“) | Vermessungsstunden, geflogene Linien, abgedeckte Fläche (km²), Datensätze |
| LE | Behörde und Koordination · Zielobjekt · Aufeinanderfolgende Positionen | Verfolgungen, Verfolgungsdauer, positive Identifizierungen |
| ISR | Erfassungsauftrag · Eingesetzte Sensoren · Kontakte / Spuren · Beobachtungen von Sendern / Kommunikation (Serien SIGINT, ELINT, COMINT) · Abdeckung und Verbreitung | Kontakte, erfasste Bilder, Aufzeichnung, mittlere Abdeckung (%) |
| COMMAND | Abfangen (Serie „Luftpolizeidienst / Abfangen (QRA)“) · Station und Behörde · Koordinierte Einheiten · Frequenzen und Netze · Koordinationsprotokoll · Wirksamkeit der Mission | Zeit auf Station, koordinierte Einheiten, Relais, Kommunikationsausfälle |
| COMBAT | Aufstellung und Gebiet · Abfangen (Serie „Abfangen / Identifizierung (VID)“) · Gefechte · Bilanz der Übung | Gefechte, Abschüsse, gültige Schüsse, Sicherheitsabbrüche (KIO) |
| SOF | Unterstützte Einheit · Zonen (PZ / LZ / DZ) · Profil und Methoden · Personal | abgesetztes Personal, aufgenommenes Personal, genutzte Zonen, Nachtmissionen unter NVG |
| SPECIAL | VIP- / Regierungstransport (VIP-Serien) · Überführung (Überführungsserien) · Flugerprobung und Testpunkte (Erprobungsserien) · Ausbildung und Übungen (Ausbildungsserien) | VIP-Passagiere, Überführungen, konforme / durchgeführte Testpunkte, durchgeführte Übungen |

Die Familien HEMS und FIRE können ihr altes CSV-Register übernehmen: siehe
[Auswertung einer Familie](#auswertung-einer-familie).

## Luftfahrzeugblatt
<!-- page: apps/cr/appareil.html -->

Das Blatt vereint alles, was über ein Luftfahrzeug bekannt ist, erkannt an seinem Kennzeichen: Identität,
Status, Aktivität, Lebenslauf, Leistung und Missionen. Es dient Piloten und Zentrum, um ein
Luftfahrzeug zu verfolgen. Man öffnet es durch Klick auf eine Zeile von „Übersicht nach Luftfahrzeug“ der allgemeinen Auswertung, über den Link
„Luftfahrzeugblatt ↗“ einer Luftfahrzeugkarte des Berichts, über ein Kennzeichen in einem Besatzungsblatt oder aus
dem Flight Planner. Nichts ist Pflicht: Das Blatt füllt sich mit den Berichten.

### Kopfzeile: Status und Position

Der Titel zeigt Kennzeichen, Typ und Modell. Darunter drei Hinweise:

- der **Status** (Verfügbar, Nicht verfügbar, In Wartung, Außer Dienst gestellt), farbig;
- „📍 Derzeit in“: letzter bekannter Flugplatz (Ankunft der letzten Mission oder des letzten Flugs des
  Journals);
- „🏠 Heimatflugplatz“.

Die **Zeitraum**-Leiste der Auswertungen (Voreinstellungen, Daten, ◀ − ▶) steht in der Kopfzeile: Aktivität,
Diagramm und Tabelle folgen ihr. Ein in den Datenbanken unbekanntes Luftfahrzeug zeigt „In den Datenbanken unbekannt: das
Blatt füllt sich mit den Berichten“.

### Identität

| Element | Änderbar | Inhalt |
|---|---|---|
| „Status“ | ja | Liste oben |
| „Heimatflugplatz“ | ja | ICAO-Code, in Großbuchstaben |
| „In Dienst gestellt“ | ja | Datum |
| „Muster“, „Variante“, „Flügel“, „Wirbelschleppe“, „Betreiber“ | nein | übernommen aus der Flotte und der Typendatenbank |
| „Flottenblatt“ | nein | Link zum Blatt des Luftfahrzeugs auf der Flotten-Website |
| „Verwendete Rufzeichen“, „Ausrüstung“ | nein | aus den Missionen erfasst, mit ihrer Anzahl |
| „Notizen“ | ja | freier Text |

Klicken Sie auf „Blatt speichern“: Das Blatt wird **in diesem Browser** gespeichert (in der lokalen Sicherung
enthalten). Die Identität wird über den gesamten Verlauf berechnet, unabhängig vom Zeitraum.

„Zusammenführen mit… / umbenennen“: Wählen Sie ein anderes Kennzeichen und dann „Zusammenführen“. Die Missionen des
Registers mit dem alten Wert erhalten den neuen (nach Bestätigung, mit einem Vermerk in
jeder Mission); das Blatt ergänzt das des Ziels.

### Aktivität

Karten des Zeitraums: „Einsätze / Flüge“, „Flugstunden“, „Blockstunden“, „Erster Flug“,
„Letzter Flug“. Darunter ein Diagramm der Flugstunden pro Zeitraum, nach Familie gestapelt.

- Ziehen Sie über das Diagramm oder klicken Sie auf einen Balken, um auf diesen Zeitraum zu zoomen.
- Doppelklicken Sie, um herauszuzoomen.

### Lebenslauf (Wartung, Inspektionen, Vorfälle…) +

Protokoll der Ereignisse des Luftfahrzeugs.

1. Das „+“ im Titel fügt oben eine Zeile hinzu, mit dem heutigen Datum, der Art MAINTENANCE, am aktuellen Flugplatz.
2. Korrigieren Sie „Datum“, „Art“ (MAINTENANCE, INSPECTION, INCIDENT, MODIFICATION, CONVOYAGE, AUTRE),
   „Flugplatz“ und „Beschreibung“.
3. „ד löscht die Zeile.

Jede Änderung wird sofort im Browser gespeichert.

### Leistung und Verbrauch (Flight Planner)

Leistungsprofil des Flight Planner für diesen Luftfahrzeugtyp.

- Karten „Steigflug“, „Reiseflug“, „Sinkflug“: stündlicher Verbrauch und wahre Geschwindigkeit (und
  Steigrate), dazu „Reserve“, wenn bekannt.
- Kurve Drehzahl / Leistung → Verbrauch, wenn das Profil eine enthält (Überfahren für die Werte).
- „Im Flight Planner öffnen ↗“ öffnet den Planer mit diesem Typ.

Ohne Profil zeigt der Block „Noch kein Leistungsprofil für dieses Muster: im
Flight Planner anlegen.“

### Einsätze und Flüge

Tabelle der Missionen und Flüge des Luftfahrzeugs im Zeitraum: Datum, Familie, Nr., Rufzeichen, Abflug →
Ankunft, Besatzung, Flugstunden, Quelle („Register“ oder „Flugbuch“).

- Klicken Sie auf einen Spaltentitel, um zu sortieren.
- Klicken Sie auf eine Mission des Registers, um ihren Bericht zur Bearbeitung zu öffnen; die Flüge des Journals sind
  nur lesbar.
- Unter der Tabelle, wenn ein Zeitraum gewählt ist: Knöpfe, um die Missionen vor oder nach dem
  Zeitraum zu sehen, und Zoom − / +.

## Besatzungsblatt
<!-- page: apps/cr/equipage.html -->

Das Blatt eines Besatzungsmitglieds, erkannt am Namen oder Kürzel, das in den Berichten eingegeben wurde: Identität,
Qualifikationen, Aktivität und Missionen. Man öffnet es durch Klick auf eine Zeile von „Übersicht nach Besatzungsmitglied“
der allgemeinen Auswertung (Adresse: `equipage.html?name=PLN`). Der Zeitraum der Auswertungen steht
in der Kopfzeile, wie beim Luftfahrzeugblatt.

### Identität

| Element | Änderbar | Inhalt |
|---|---|---|
| „Name“ | ja | vollständiger Name, dem Titel des Blatts hinzugefügt |
| „Heimatflugplatz“ | ja | Basis des Piloten |
| „Ausgeübte Funktionen“ | nein | in den Berichten ausgeübte Rollen, mit ihrer Anzahl |
| „Qualifikationen (eine pro Zeile)“ | ja | freier Text |
| „Notizen“ | ja | freier Text |

„Blatt speichern“ speichert es in diesem Browser. „Zusammenführen mit… / umbenennen“ vereint zwei
Schreibweisen desselben Piloten (z. B. GRR → RBR): Die Missionen des Registers erhalten den neuen Wert, mit
einem Vermerk, nach Bestätigung.

### Aktivität

Karten des Zeitraums: „Einsätze / Flüge“, „Flugstunden“, „Erster Flug“, „Letzter Flug“. Dann
„Nach Muster“: Flugstunden pro Luftfahrzeugtyp. Das Diagramm stapelt die Stunden nach Familie; Ziehen
oder Klicken zoomt, Doppelklicken zoomt heraus.

Für einen Piloten ohne Mission im Register stammen die Zahlen aus der Referenz, wenn sie ihn kennt.

### Einsätze und Flüge

Dieselbe Tabelle wie beim Luftfahrzeugblatt, zusätzlich mit der Spalte „Kennz.“ (Link zum Blatt des
Luftfahrzeugs) und dem Typ. Sortieren über den Spaltentitel; Klick auf eine Mission des Registers: Bericht zur
Bearbeitung; Flüge des Journals nur lesbar.

## Auswertung
<!-- page: apps/cr/mission_operations_reporting.html -->

Die allgemeine Auswertung zeigt die Aktivität **aller Familien** aus dem einzigen Register
`data/cr/missions.yaml`: Kennzahlen, Diagramme, Übersichten und Tabelle der Missionen. Sie dient den Piloten
für ihre Bilanz und dem Zentrum für die Verfolgung. Zugang: Seitenleiste › **Werkzeuge**, Reiter „Missionsanalyse“ (optionales Werkzeug, in Mein Profil angekreuzt).

### Familien und Zeitraum

Erster Block der Seite (die Kopfzeile behält nur Titel und Untertitel): er klappt zu und lässt sich verschieben wie die anderen; beim Drucken erscheint nur der Zeitraum.

| Element | Funktion |
|---|---|
| „Neuer Bericht“ | öffnet die Seite zur Wahl der Familie |
| Zeitraum | Voreinstellung (Alle Daten, Heute, Letzte 7 Tage, Letzte 30 Tage, Aktueller Monat, Aktuelles Jahr, Benutzerdefinierter Zeitraum), Anfangs- und Enddatum, ◀ zurück, − herauszoomen ×2, ▶ vor |
| „Familien“ | ein farbiger Chip pro Familie: Klick zum Aus- / Einblenden, Strg + Klick, um nur eine zu behalten, „Alle“, um alles umzuschalten |
| „Gruppierung“ | Automatisch, Tag, Woche, Monat, Quartal, Jahr |
| „Messgröße“ | Einsätze, Flugstunden, Blockstunden, Zeit im Einsatzraum, Missionsstunden, Einsätze (Flüge), Distanz (NM) |
| „Daten“ | „Meine Einsätze (Register)“, „Journal (durchgeführte Flüge)“ (nur lesbar) oder „Journal laden / aktualisieren…“ |

Der Zeitraum wird mit den Familienauswertungen und den Blättern geteilt. Familien, Gruppierung und Messgröße
werden gespeichert.

### Kennzahlkarten

Oben auf der Seite: Missionen, Erfolg (%), Flug-, Block- und Einsatzraumstunden (mit dem Mittelwert über die
ausgefüllten Missionen), Einsätze, Distanz, Kraftstoff pro Einheit, Personen / Fracht, Nacht- /
Dämmerungsflüge, online (IVAO / VATSIM), reale Einsätze (und Übungen), Luftfahrzeuge (und Typen),
Besatzung. Eine Karte ohne Daten wird nicht angezeigt.

### Datenprüfung

Dieser Block erscheint nur, wenn es Missionen zu korrigieren gibt. Er listet Familie, Missionsnummer, Datum
und Unstimmigkeiten auf (⚠ ungültige Uhrzeit, umgekehrter Zeitablauf, mehr als 20 h, Datum in der Zukunft, unstimmiger
Kraftstoff, angegebene Dauer ohne Uhrzeiten). Klicken Sie auf eine Zeile, um den Bericht zu öffnen und zu korrigieren.

### Aktivität nach Zeitraum

Nach Familie gestapelte Balken, gemäß gewählter Gruppierung und Messgröße (neben dem Titel angezeigt).

- Fahren Sie über einen Balken für die Einzelheiten.
- Ziehen Sie über mehrere Balken oder klicken Sie auf einen Balken, um nur diesen Zeitraum zu behalten: Die ganze
  Auswertung folgt.
- Doppelklicken Sie, um herauszuzoomen.

### Aufschlüsselungen

Neun Diagramme, alle nach der gewählten Messgröße berechnet (Überfahren für die Einzelheiten):

| Block | Inhalt |
|---|---|
| „Nach Familie“ | Ring, eine Farbe pro Familie |
| „Ergebnisse“ | erfolgreich, abgebrochen, umgeleitet… |
| „Serien (Einsatzarten)“ | Familie · Serie |
| „Luftfahrzeugarten“ | ICAO-Typ des Führungsluftfahrzeugs |
| „Eingesetzte Fähigkeiten“ | in den Berichten angekreuzte Kästchen |
| „Startflugplätze“ | ADEP oder Startbasis |
| „Tag / Nacht“ | Tag, Nacht, Dämmerung, nicht angegeben |
| „Netzwerk“ | IVAO, VATSIM, offline |
| „Übung / realer Einsatz“ | Übung / Simulation, realer Einsatz |

### Übersicht nach Familie

Eine Tabelle, eine Zeile pro Familie: Missionen, Einsätze, Erfolg (%), Flugstunden, mittlerer Flug, Block, im
Einsatzraum, Distanz, Kraftstoff, „Familienkennzahlen“ (Abwürfe, gerettete Personen, Alarm →
Start…). Klicken Sie auf eine Zeile, um die Auswertung der Familie zu öffnen; die Spalte „Auswertung“ trägt
denselben Link (↗).

### Übersicht nach Luftfahrzeug

Eine Zeile pro Kennzeichen: Typ, Rufzeichen, Familien, Missionen, Flugstunden, Block, letzte
Mission. Klicken Sie auf eine Zeile, um das [Luftfahrzeugblatt](#luftfahrzeugblatt) zu öffnen. Sortieren über den Spaltentitel.

### Übersicht nach Besatzungsmitglied

Eine Zeile pro Name: Funktionen, Familien, Missionen, Flugstunden, letzte Mission. Klicken Sie auf eine Zeile,
um das [Besatzungsblatt](#besatzungsblatt) zu öffnen.

### Einsätze (sortieren, zum Bearbeiten klicken, löschen)

Tabelle aller berücksichtigten Missionen: Familie, Missionsnummer, Datum, Serie, Typ, Kennzeichen,
Rufzeichen, Abflug → Ankunft, Ergebnis, Flug, Block, im Einsatzraum, Tag / Nacht, Netzwerkspur.

1. Klicken Sie auf einen Spaltentitel, um zu sortieren.
2. Klicken Sie auf eine Zeile: Der Bericht öffnet sich zur Bearbeitung auf der Seite seiner Familie.
3. „Löschen“ am Zeilenende entfernt die Mission aus dem Register (mit Bestätigung).

**„✎ In der Tabelle bearbeiten“** (im Titel) macht Datum, Missionsnummer, Serie,
Kennzeichen, Rufzeichen, Abflug / Ankunft, Ergebnis, Flug und Block änderbar. Jede Zelle wird
sofort im Register gespeichert, mit einem Vermerk in der Mission; „✓ Fertig“ kehrt zur normalen Anzeige zurück.
Eine ohne Uhrzeiten eingegebene Dauer gilt als „angegeben“ (≈), wird gezählt und in der Datenprüfung gemeldet, bis
die Uhrzeiten im Bericht eingegeben sind.

Unter der Tabelle, wenn ein Zeitraum gewählt ist: „◀ n vor dem Zeitraum“, „− / +“, „m nach dem
Zeitraum ▶“. Die Flüge des Journals sind nur lesbar.

### Einsatzregister

| Knopf | Wirkung |
|---|---|
| „Register exportieren (YAML)“ | lädt das ganze Register herunter |
| „CSV exportieren (Tabellenkalkulation)“ | Export für eine Tabellenkalkulation |
| „Registerordner…“ | wählt den Ordner `data/cr`, in den `missions.yaml` geschrieben wird |
| „PDF / Drucken“ | druckt die Seite |
| „Altes CSV-Register importieren“ | übernimmt ein altes HEMS- oder FIRE- / GAAR-Register, ohne Doppel (gleiche Nr. und gleiches Datum) |

Die Informationszeile zeigt die Datei, die Anzahl der Missionen und den Ordner (oder „nur
Browser“).

## Auswertung einer Familie
<!-- page: apps/cr/AAR/aar_reporting.html -->
<!-- page: apps/cr/AIRBORNE/airborne_reporting.html -->
<!-- page: apps/cr/AIRLIFT/airlift_reporting.html -->
<!-- page: apps/cr/COMBAT/combat_reporting.html -->
<!-- page: apps/cr/COMMAND/command_reporting.html -->
<!-- page: apps/cr/FIRE/fire_reporting.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_reporting.html -->
<!-- page: apps/cr/HADR/hadr_reporting.html -->
<!-- page: apps/cr/HEMS/hems_medevac_reporting.html -->
<!-- page: apps/cr/ISR/isr_reporting.html -->
<!-- page: apps/cr/LE/le_reporting.html -->
<!-- page: apps/cr/MARITIME/maritime_reporting.html -->
<!-- page: apps/cr/SAR/sar_reporting.html -->
<!-- page: apps/cr/SOF/sof_reporting.html -->
<!-- page: apps/cr/SPECIAL/special_reporting.html -->
<!-- page: apps/cr/SURVEY/survey_reporting.html -->

Die Auswertung einer Familie zeigt nur die Missionen dieser Familie, mit ihren eigenen Kennzahlen.
Sie erreichen sie über „Einsatzregister ▾ › Auswertung anzeigen“ in einem Bericht, über eine Zeile von „Übersicht
nach Familie“ der allgemeinen Auswertung oder über das Menü „Familie · Untertyp“ des Blocks „Familie und Zeitraum“ einer anderen Auswertungsseite.

### Familie und Zeitraum

| Element | Funktion |
|---|---|
| „Familie · Untertyp ▾“ | wechselt die Familie (öffnet ihre Auswertung) oder filtert nach einem Untertyp (standardmäßig „Alle Untertypen“) |
| „+ Neuer Bericht“ | öffnet direkt die Berichtsseite der Familie |
| Zeitraum | dieselbe Komponente und derselbe Zeitraum wie in der allgemeinen Auswertung |
| „Gruppierung“, „Messgröße“ | Einstellungen des Aktivitätsdiagramms (Einsätze, Flugzeit, Blockzeit, Zeit im Einsatzraum), mit der allgemeinen Auswertung geteilt |
| „Daten“ | Register oder Journal, wie in der allgemeinen Auswertung |

### Einsatzregister

| Knopf | Wirkung |
|---|---|
| „Register exportieren (YAML)“ | lädt die Missionen herunter |
| „CSV exportieren (Tabellenkalkulation)“ | Export für eine Tabellenkalkulation |
| „Einsätze importieren (YAML)“ | fügt dem Register eine oder mehrere exportierte Missionen hinzu |
| „Registerordner…“ | wählt den Ordner `data/cr` |
| „PDF / Drucken“ | druckt die Seite |
| „Altes HEMS-Register importieren (CSV)“ / „Altes FIRE / GAAR-Register importieren (CSV)“ | nur HEMS und FIRE: übernimmt das alte Register, ohne Doppel (gleiche Nr. und gleiches Datum) |

Die Informationszeile zeigt die Datei, die Anzahl der Missionen und den Ordner.

### Übersicht

Karten des gewählten Zeitraums und Untertyps: Missionen, Einsätze, erfolgreiche, Flugstunden, Block-,
Missionsstunden, Zeit im Einsatzraum, Distanz, Kraftstoff, beförderte Personen und Fracht, dann die **Kennzahlen
der Familie** (siehe Tabelle [Spezifische Blöcke jeder Familie](#spezifische-blöcke-jeder-familie)).

### Aktivität nach Zeitraum

Nach **Untertyp** der Familie gestapelte Balken, gemäß Gruppierung und Messgröße. Derselbe Zoom wie in der
allgemeinen Auswertung: Ziehen oder Klicken zum Zoomen, Doppelklick zum Herauszoomen.

### Detaillierte Aufschlüsselung

Vier Balkenlisten (die 8 ersten Werte): „Nach Serie“, „Nach Ergebnis“, „Nach
Muster“, „Nach eingesetzter Fähigkeit“.

### Einsätze (sortieren, zum Bearbeiten klicken, löschen)

Spalten: Missionsnummer, Datum, Serie, Luftfahrzeug, Kennzeichen, Rufzeichen, Ergebnis, Flug, Block, im
Einsatzraum, Spur, „Prüfung“ (⚠ Anzahl der Unstimmigkeiten, Einzelheiten beim Überfahren).

- Klick auf einen Spaltentitel: Sortieren.
- Klick auf eine Zeile: Der Bericht öffnet sich zur Bearbeitung.
- „Löschen“ am Zeilenende, mit Bestätigung.
- „✎ In der Tabelle bearbeiten“: dieselben Regeln wie in der allgemeinen Auswertung.

## Flugkarten
<!-- page: apps/planner/map_planner.html -->

Diese Seite dient zur Vorbereitung Ihrer eigenen Flugkarten: Route, Streckenkarte, Anflug, Treffpunkt, Zielflugplatz und Vertikalprofil.
Sie steht allen Piloten offen. Zugang: Seitenleiste „Werkzeuge“, Reiter „Flugkarten“, Knopf „In den Flugkarten öffnen“ einer Mission in Meine Missionen oder Knopf „Flugkarten“ des Kraftstoffplaners.
Sie nutzt die Engine des Kartenstudios des Zentrums, arbeitet aber in einem eigenen Bereich Ihres Browsers: Ihre Einstellungen ändern nie die Mission des Zentrums.
Jeder Block lässt sich zuklappen („Ausblenden“ / „Anzeigen“) und verschieben (Griff ↕). Die SIA-Datenbank muss einmal in diesem Browser gelesen werden (siehe letzter Block).
Auf den Stufen 1 bis 3 (Mein Profil › „Nutzungsstufe“) beschränkt sich die Seite auf zwei Blöcke: „Route“ (Routenfeld, „Höhe“, „SimBrief“, Kontrollkarte mit „⤢ Vergrößern“) und „Karten“ mit seinem einzigen Knopf „Karten und ZIP erzeugen“. Die übrigen unten beschriebenen Bedienelemente erscheinen nur auf Stufe 4 (Experte).

### Empfang einer Mission („In den Flugkarten öffnen“)

Die Seite zeigt keinen Block „Mission“: Die Mission kommt von selbst aus Meine Missionen.

1. Öffnen Sie in Meine Missionen die Mappe der Mission.
2. Klicken Sie auf „In den Flugkarten öffnen“. Das Ihnen zugewiesene Luftfahrzeug wird an die Spitze der Mission gesetzt.
3. Die Seite öffnet sich mit der Route und der Flughöhe der Mission im Block „Route“ und mit allen von der Mission vorgesehenen Karten in „Zu erstellende Karten“ (dazu `profil_vertical.png`). Die Liste „Zu erstellende Karten“ ist nur auf der Stufe Experte sichtbar.
4. Stellen Sie bei Bedarf jede Karte ein (Stufe Experte) und klicken Sie dann auf „Karten und ZIP erzeugen“: im Block „Karten“ auf den Stufen 1 bis 3, in der Fußzeile auf der Stufe Experte.

Die Fußzeile zeigt die Anzahl der Karten im ZIP („… Karte(n) im ZIP + Übersichtskarte“) oder „Keine Mission geladen“.
Empfangene Mission: „Zeichnen“ und „Kraftstoff“ arbeiten mit der geladenen Mission, ohne sie zu ersetzen. Auf den Stufen 1 bis 3 erzeugt „Karten und ZIP erzeugen“ ihre Karten unverändert. Auf der Stufe Experte fragt „Karten vorbereiten“ nach einer Bestätigung, bevor sie durch einen freien Flug „Flug Abflug → Ziel“ aus der Route ersetzt wird; ohne geladene Mission werden die Karten direkt erstellt.

### Route

Dieser Block verbindet drei Ansichten: den Flugplan (Text), die Karte und den Vertikalschnitt. Das Überfahren eines Punkts in einer davon hebt ihn in den beiden anderen hervor. Einige Meldungen der Seite nennen diesen Block „Route“.

- Routenfeld: Feld 15 des ICAO-Flugplans oder Kommaliste (zum Beispiel `LFBO N0160A055 DCT TOU UN460 NTS DCT LFRN`). Leer: Route der Mission.
- „Höhe“: Reiseflughöhe („FL65“ oder „6500“).
- Menü „Luftstraßen“ / „RTBA (Tiefflug)“, dann „Suchen“: berechnet eine Route zwischen den Punkten des Feldes. Das Ergebnis ersetzt das Feld.
- „SimBrief“: übernimmt die Route des letzten OFP. Die SimBrief-Kennung wird in ☰ › Pilotenprofil eingegeben.
- „Zeichnen“: zeichnet den Vertikalschnitt. „Kraftstoff“: öffnet den Kraftstoffplaner mit dieser Route (Distanz, Flughöhe, rechtweisender Kurs, Luftfahrzeug).
- „ICAO kopieren“: kopiert den strikten ICAO-Flugplan (nicht veröffentlichte Punkte als Koordinaten).
- „Syntax und Verwendung“: Überblick über die akzeptierten Formen (Funkfeuer, VFR-Meldepunkte „MM-CV“, „REN300010“, Koordinaten „4330N00125E“, Höhen „/A035“, „VFR“…).
- Auf den Stufen 1 bis 3 bleiben das Routenfeld, „Höhe“, „SimBrief“ und „Syntax und Verwendung“; das Menü „Luftstraßen“ / „RTBA“, „Suchen“, „Zeichnen“, „Kraftstoff“ und „ICAO kopieren“ gehören zur Stufe Experte.

Auf der Karte: Ziehen Sie einen Punkt, um ihn zu verschieben (er rastet an Funkfeuern, Meldepunkten und Flugplätzen ein), klicken Sie auf die Route, um einen Punkt einzufügen, Rechtsklick, um einen zu löschen. Im Schnitt: Klick, um einen Punkt in dieser Höhe hinzuzufügen, Ziehen, um die Höhe zu ändern, Rechtsklick zum Löschen.

### Kontrollkarte und Ausschnitt (Block Route)

Unter dem Routenfeld zeigt eine Kontrollkarte die gewählte Karte mit ihrem Anzeigeprofil. Sie wird bei jeder Einstellung neu gezeichnet. Auf den Stufen 1 bis 3 wird nur „⤢ Vergrößern“ angeboten; die übrigen Bedienelemente der Tabelle und die „Profileinstellungen: Schnitt, Luftfahrzeug, Steigrate, Ausgaben“ gehören zur Stufe Experte.

| Bedienelement | Wirkung |
|---|---|
| „Karte“ | Angezeigte Karte (standardmäßig: die Übersichtskarte der Route). |
| „Profil“ | Anzeigeprofil dieser Karte (dieselbe Einstellung wie in „Zu erstellende Karten“). |
| „ZIP“ | Diese Karte ins ZIP aufnehmen oder nicht. |
| „Aktualisieren“ | Die Vorschau neu zeichnen. |
| „Diesen Ausschnitt behalten“ | Die erzeugte Karte übernimmt genau den angezeigten Rahmen (Zoom und Verschieben mit der Maus). |
| „Zentrieren“ / „Automatischer Ausschnitt“ | Zum gespeicherten Ausschnitt zurückkehren / ihn vergessen zugunsten eines aus der Mission berechneten Rahmens. |
| „⧉ Fenster“ / „⤢ Vergrößern“ | Die Karte in einem eigenen Fenster öffnen / sie vergrößern (Esc zum Zurückkehren). |

„Profileinstellungen: Schnitt, Luftfahrzeug, Steigrate, Ausgaben“ stellt den Vertikalschnitt ein: Unter- und Obergrenze (0 = auto), Luftfahrzeug (Profile des Kraftstoffplaners) oder Steig- und Sinkrate, Bild `profil_vertical.png` in den Ausgaben, Zeichnen der Route auf den Karten.

### Profileinstellungen: Hintergrundkarte, Lufträume, ICAO-Symbole, Elemente

Dieses aufklappbare Feld unter der Kontrollkarte stellt das Anzeigeprofil der gewählten Karte ein. Die Profile (IFR, IFR vereinfacht, VFR detailliert, VFR vereinfacht, AIRWAYS…) gelten für alle Ihre Missionen und werden im Browser gespeichert. Standardprofil einer Karte: AIRWAYS für die Routenkarte der Flugkarten; IFR vereinfacht für die Hauptkarte einer Mission und die Übersichtskarten; VFR detailliert für Ziel-, Detail- und Treffpunktkarten; VFR vereinfacht für den Anflug. Feld der Stufe Experte.

- Oben: „Profilname“, „Hintergrundkarte“ (OSM Standard, OpenTopoMap, Vektorhintergründe…), Knöpfe „Speichern“, „Neu“, „Duplizieren“, „Löschen“.
- Registerkarte „Hintergrundkarte“: OSM-Ebenen (Boden, Gewässer, Straßen, Relief, Höhenlinien, Gipfel…), Städte als ICAO-Symbole und Einwohnerschwelle, Städtenamen, bebaute Flächen.
- Registerkarte „Lufträume“: Luftraumfamilien (R / D / P, CTR, TMA, CTA, SIV, TRA, RMZ, TMZ, PJE), ICAO-Symbolik, angezeigter Höhenbereich, Deckkraft. „Luftraumauswahl“: Positiv- oder Negativliste (Knopf „Positivliste“ zum Umschalten), Eingabe mit Vervollständigung („R 45 A“, „@RTBA“…), „Liste einfügen…“, „Alle entfernen“. „Ausgewählte Lufträume“ zeigt das Ergebnis.
- Registerkarte „ICAO-Symbole“: Flugplätze (nach Kategorie, kontrolliert oder nicht, Positivliste), Funknavigation, untere und obere Luftstraßen, NAT-Tracks des Tages (magenta gestrichelt, „NAT A“; Zone Nordatlantik aktiv), VFR-Meldepunkte und RNAV-Streckenpunkte (blaues Dreieck), Überflugverbot, Parks und Schutzgebiete, Hindernisse.
- Registerkarte „Elemente“: Wegpunkte, Meridiane und Breitenkreise, MORA-Gitter, Städtenamen, Betankungs-Racetrack, Missions- und Suchgebiete.

Denken Sie daran, auf „Speichern“ zu klicken, um ein geändertes Profil zu behalten. Die Vorschlagslisten der Eingabefelder (Zonen, Flugplätze, Funkfeuer) werden erst gefüllt, wenn Sie in das betreffende Feld klicken: Die Seite öffnet sich so schneller, und die Liste erscheint beim Klick oder beim ersten Tastenanschlag.

### Karten

Dieser Block erstellt die Karten eines Flugs aus der Route, ohne Mission des Zentrums; auf den Stufen 1 bis 3 erzeugt er sie auch.

1. Geben Sie Route und Flughöhe im Block „Route“ ein (mindestens ein Abflug und ein Ziel, die der SIA-Datenbank bekannt sind).
2. Optional: „Treffpunkt (optional)“, ein Punkt oder Koordinaten „44.2, 0.6“.
3. Kreuzen Sie die gewünschten Karten an: „Route (Übersicht, IFR)“, „Anflug“, „Treffpunkt“, „Ziel“.
4. Klicken Sie auf „Karten und ZIP erzeugen“ (Stufen 1 bis 3): Die Karten werden erstellt und dann erzeugt, Fortschritt (mit „Abbrechen“) und Bericht erscheinen direkt darunter, und das ZIP wird heruntergeladen. Auf der Stufe Experte erstellt „Karten vorbereiten“ sie nur: Einstellungen unter „Zu erstellende Karten“, Erzeugung in der Fußzeile.

Die Seite erzeugt eine Mission „Flug Abflug → Ziel“ mit den angekreuzten Karten und dem Vertikalprofil. Die Treffpunktkarte wird nur erstellt, wenn ein Treffpunkt eingegeben ist.
Auf den Stufen 1 bis 3 hat die Seite weder Fußzeile noch Block „Vorschauen und Erzeugung“: Alles geht vom Knopf dieses Blocks aus.
Danach aktualisiert jede Änderung der Route, der Flughöhe oder des Treffpunkts die Karten automatisch.
Ankunft aus dem Kraftstoffplaner (Knopf „Flugkarten“): Die Karten werden von selbst erstellt, sobald die SIA-Datenbank geladen ist.
Mögliche Fehlermeldungen: „SIA-Basis fehlt in diesem Browser“, „Route: unbekannt in der SIA-Datenbank“, „Keine Karte gewählt“.

### Zu erstellende Karten

Block der Stufe Experte. Die Liste „Karten der Mission“ hat eine Zeile pro Karte:

| Element der Zeile | Verwendung |
|---|---|
| Dateiname | Klick: die Karte in der Kontrollkarte anzeigen (✎: eigener Ausschnitt). |
| Profil | Anzeigeprofil der Karte oder „Deaktiviert“. |
| Linie | „Ohne Linie“, „Briefing: Route“, „Organisation: wahrscheinliche Route“, „Route + wahrscheinliche Route“. |
| Empfänger | Nur bei Übungsmissionen: Briefing, Organisation, Übungsziel oder Besatzung. |
| „ZIP“ | Abwählen, um die Karte nicht zu erzeugen. |
| „ד | Die Karte aus der Mission löschen. |

Um eine Karte hinzuzufügen: Geben Sie einen Namen ein („nouvelle_carte.png“), wählen Sie den Typ (Übersicht, Ziel, Detail, Gebiet), dann „+ Karte“. Ihr Ausschnitt ist die angezeigte Ansicht.
Ohne Mission und ohne erstellte Karten zeigt die Liste „Keine Karte: unten eine hinzufügen.“

### Vorschauen und Erzeugung

Block der Stufe Experte; auf den Stufen 1 bis 3 erscheint der Bericht der Erzeugung (erzeugte Karten, Fehlschläge und „Einzeln erneut versuchen“) unter dem Knopf des Blocks „Karten“.

1. „Alle Karten anzeigen“: zeichnet eine Vorschau jeder Karte mit ihrem Profil. Die Vorschauen erzeugen keine Datei. Klick auf eine Vorschau: Vergrößerung.
2. Jede Vorschau behält ihr Kästchen „ZIP“.
3. „Karten und ZIP erzeugen“ (Knopf der Fußzeile): lädt ein ZIP herunter mit jeder Karte, der Übersichtskarte und `profil_vertical.png`, wenn diese Ausgabe angekreuzt ist.

Die „Übersichtskarte“ erscheint von selbst unter den Vorschauen; sie übernimmt das Profil der Übersichtskarte der Route.
Formate: Menü ☰ › Kartenausgaben (PNG, bearbeitbares SVG, PNG-Breite von 400 bis 5000 px; standardmäßig 1600 px).
Schlägt eine Karte fehl (Hintergrund nicht verfügbar, Zeitüberschreitung), enthält das ZIP `rapport_generation.txt` und die Liste bietet „Einzeln erneut versuchen“ an.
Die Knöpfe bleiben ausgegraut, solange keine Karte zu erstellen ist. Während der Vorschauen und der Erzeugung trägt der Fortschrittsbalken einen Knopf „Abbrechen“: Die laufende Karte wird fertiggestellt, die folgenden werden nicht erstellt. Eine abgebrochene Erzeugung lädt kein ZIP herunter (es wäre unvollständig); die bereits angezeigten Vorschauen bleiben. Starten Sie „Karten und ZIP erzeugen“ erneut für alle Karten.

### SIA-Datenbank

Dieser Block gehört zur Stufe Experte und ist standardmäßig ausgeblendet: Klicken Sie auf „Anzeigen“. Fehlt die Datenbank in diesem Browser, öffnet er sich von selbst, gleich auf welcher Stufe. Er liest den SIA-Ordner (AIXM) und hält ihn im Browser. Ohne ihn erkennt die Seite weder Flugplätze noch Funkfeuer noch Lufträume.

- Knopf „SIA-Ordner: …“: den Ordner `data/sia` wählen (der Browser fragt nach dem Zugriff), dann Lesen.
- „Luftfahrtdatenbank neu aufbauen“: nach jeder AIRAC-Aktualisierung auszuführen; liest die aktiven Zonen unter Einstellungen › Wartung › Luftfahrtdaten. Eine Anzeige verfolgt das Lesen; „Abbrechen“ unterbricht es, ohne die gespeicherte Datenbank zu berühren.
- „Cache leeren“: löscht die gespeicherte Datenbank (sie wird beim nächsten Neulesen wieder aufgebaut).
- Die Statuszeile zeigt die gespeicherte Datenbank, ihren AIRAC-Zyklus und ihr Datum; „Zyklus veraltet“ erscheint, wenn ein neuerer Zyklus gilt. „Analysierte Dateien“ listet die gelesenen Dateien.
- Ohne Datenbank meldet die Seite: „SIA-Datenbank fehlt in diesem Browser: Block ‚SIA-Datenbank‘, ‚Luftfahrtdatenbank neu aufbauen‘ oder Einstellungen › Wartung.“

Es ist derselbe Block wie unter Einstellungen › Wartung › Luftfahrtdaten. Dieselbe Datenbank dient dem Vertikalprofil des Kraftstoffplaners. Einzelheiten: [SIA-Missionen](../SIA_MISSIONS.md).

## Kraftstoff
<!-- page: apps/planner/flight_performance_planner.html -->

Der Kraftstoffplaner (Titel „Kraftstoff“) berechnet den Kraftstoff eines Flugs aus dem Leistungsprofil Ihres Luftfahrzeugs. Er zeichnet auch die optimalen Flughöhen und Steiggesetze.
Zugang: Seitenleiste „Werkzeuge“, Reiter „Kraftstoff“, Knopf „Kraftstoff (Planer)“ einer Mission in Meine Missionen oder Knopf „Kraftstoff“ der Flugkarten. Route, Distanz, Flughöhe und Luftfahrzeug werden dann übernommen.
Kopfzeile: Menü „Flugzeug“, Knopf „Letzten SimBrief-FPL abrufen“, „Einheiten: kg / lbs“. Importe und Exporte befinden sich im Menü ☰. Technische Einzelheiten: [Planer](../FLIGHT_PLANNER.md).
Je nach Nutzungsstufe: Auf den Stufen 1 bis 3 (Besatzung, Planung, Gestaltung) zeigt die Seite das Flugzeug, den Flugplan (und „Letzten SimBrief-FPL abrufen“), den aufklappbaren Bereich „Flugparameter“, „Berechnen“ und das Ergebnis in zwei Spalten; das Menü ☰ behält dort nur Export und Import der Einstellungen. Kurven, Felder, Instrumente, Profilblöcke, Statusleiste und die Profilaktionen des Menüs ☰ kommen auf der Stufe Experte hinzu, wo die Seite vollständig ist.

### Flugzeug wählen und Profil speichern

1. Klicken Sie auf den Flugzeugknopf der Kopfzeile (anfangs „Kein Flugzeug“).
2. Wählen Sie ein Profil in der Liste, nach Kategorie gruppiert (Hubschrauber, Jets, einmotorige, Turboprops…).
3. Ein als „Flotte, ohne Profil“ markierter Typ erzeugt ein leeres Profil: Seine Leistungsdaten sind einzutragen.

Die Leiste unten auf der Seite zeigt „Profil gespeichert — …“ oder „Nicht gespeicherte Änderungen — …“. Sie trägt „Lokale Datenbank neu laden“, „Profil speichern“ und „Dieses Flugzeug löschen“. Diese Leiste erscheint nur auf der Stufe Experte.
Wechseln Sie das Flugzeug mit nicht gespeicherten Änderungen, bietet die Seite „Bleiben“, „Verwerfen und wechseln“ oder „Speichern und wechseln“ an.
Menü ☰: Profile / CSV / JSON importieren (darunter `.lnmperf` von Little Navmap), ein SimBrief-Airframe importieren, den Leistungsordner wählen, das Profil als `.lnmperf` oder JSON exportieren, die lokale Datenbank speichern, die vorherige Sicherung wiederherstellen, die Einstellungen exportieren oder importieren. Diese Aktionen gehören zur Stufe Experte, außer Export und Import der Einstellungen.

### Kraftstoffplanung

1. „Flugplan (Feld 15)“: Geben Sie die Route ein. Es ist derselbe Plan wie in den Flugkarten (der neueste gewinnt). Distanz, rechtweisender Kurs und Flughöhe werden daraus abgeleitet.
2. Ergänzen oder korrigieren Sie die Felder im aufklappbaren Bereich „Flugparameter“ (auf der Stufe Experte von Anfang an aufgeklappt, sonst zugeklappt; für eine schnelle Planung genügen die Standardwerte): „Distanz (NM)“, „Flugfläche (FL)“, „Rechtweisender Kurs (°)“, „Rollen (min)“, „Wind aus (°)“, „Wind (kt)“, „Reserve (min)“, „Unvorhergesehenes (%)“.
3. Optional, im selben Bereich: „Geplante Startmasse“, verglichen mit der MTOW des Typs; „ISA-Abweichung (°C)“ oder „Bodentemperatur (°C)“ mit „Platzhöhe (ft)“ oder „Temperatur auf Flughöhe (°C)“.
4. Klicken Sie auf „Berechnen“.

Wind leer gelassen: Die Seite weist darauf hin („Wind unbekannt: Bereich ±25 kt…“) und gibt den Kraftstoff als Bereich an.
Der Knopf „Flugkarten“ (Stufe Experte) öffnet die Flugkarten mit diesem Flugplan; Karten und Profil werden dort bei der Ankunft erstellt.
„Flugplan-Syntax“ zeigt die akzeptierten Formen. Ohne SIA-Datenbank im Browser werden nur Punkte in Koordinaten erkannt.

### Kurven der Kraftstoffplanung (optimale Flughöhe und optimaler Steigflug)

Auf der Stufe Experte zeigt der Block „Kraftstoffplanung“ nach „Berechnen“ in dieser Reihenfolge:

| Titel | Was er zeigt |
|---|---|
| „Optimale Flughöhe — Kraftstoff und Geschwindigkeit“ | Gesamte Strecke auf jeder Höhe geflogen: Je höher die Kurve, desto weniger Verbrauch pro Meile. |
| „Optimaler Steigflug — Steigrate und Kraftstoff“ | Verfügbare Steigrate und Kraftstoff pro 1000 ft nach Höhe. |
| „Steiggeschwindigkeiten — IAS und TAS nach Höhe“ | Vy, schneller Steigflug, wirtschaftlicher Steigflug, eingestelltes Gesetz, Vx. |
| „TAS nach Flughöhe — Reise- und Steigflug“ | Wahre Geschwindigkeit im Reise- und im Steigflug. |
| „Vergleich der Steiggesetze“ | Dauer, Distanz und Kraftstoff jedes Gesetzes; ★: Bester der Spalte. |
| „Steigflug nach Höhe — RPM-/N1-Einstellungen“ | Tabelle bei Vy mit Summen ab dem Boden. |

Fahren Sie über eine Kurve, um die Werte in dieser Höhe abzulesen; klicken Sie, um eine Höhe anzuheften (weiße Linie auf allen Kurven). Die Planung wird dann auf dieser Höhe berechnet.
Die beiden senkrechten Schieberegler (Steigrate links, IAS rechts) stellen Ihr eigenes Steiggesetz ein („eingestelltes Gesetz“).
Der grau hinterlegte Bereich „unerreichbar“ liegt über der Gipfelhöhe des Luftfahrzeugs.

### Ergebnis

Dieser Block in der rechten Spalte folgt der Seite, während Sie durch die Kurven scrollen.

- „Block fuel“ (als Bereich, wenn der Wind unbekannt ist), „Flugzeit“, „TOD“.
- Berechnungsgrundlage: gewählte Flughöhe und gewähltes Steiggesetz.
- Einzelheiten: Rollen, Steigflug, Reiseflug, Sinkflug, Unvorhergesehenes, Reserve; geplante Startmasse und MTOW, wenn Sie sie eingegeben haben (rot, wenn sie überschritten ist).
- Karte des Cursors (⌖ beim Überfahren, 📌 angeheftet): Kraftstoff und Zeit der Strecke auf dieser Höhe, maximale Steigrate, Steiggeschwindigkeiten; „lösen“ entfernt die Anheftung.
- Aufklappbare Gruppe „Flugphasen — Profil ↔ Kennfeld“ (Stufe Experte): IAS, Steigrate, Triebwerksdrehzahl und Durchfluss pro Phase, verglichen mit dem Triebwerkskennfeld. Sie enthält auch das Feld „SimBrief Airframe Internal ID“ und die Links zu den Blättern der Luftfahrzeuge dieses Typs.

„Anheften“ behält den ganzen Block, wenn er der Seite folgt; sonst klappt er zusammen. Auf der Stufe Experte gibt unter dem Block ein Feld pro Kurve die Optima, die Grenzen (Gipfelhöhe, angeforderte Flughöhe) und eine Lesehilfe an. Eine Instrumentenspalte (Stufe Experte) zeigt IAS, Steigrate, Höhe, Kraftstoff und Flugzeit.

### Triebwerksleistung — Drehzahl / Leistung / Verbrauch

Dieser Block (ursprünglicher Titel „Fiche performance moteur“) gibt den Verbrauch für eine Triebwerksdrehzahl an. Block der Stufe Experte.

1. Geben Sie „RPM / N1“ ein. Die Felder „Höhe (ft)“ und „Phase“ ergänzen das Blatt.
2. Klicken Sie auf „Interpolieren“.
3. Lesen Sie den „Gesamtverbrauch“ und seinen Bereich Min.–Max. ab (lineare Interpolation in der Tabelle).

Unter dem Blatt zeichnet die „Drehzahl-/Leistungs-/Verbrauchskurve“ die minimalen, nominalen und maximalen Durchflüsse nach Drehzahl. Fahren Sie darüber, um die Werte bei einer bestimmten Drehzahl abzulesen. Der interpolierte Punkt ist darauf markiert.
Ohne RPM-Tabelle im Profil zeigt die Seite „RPM-Kurve fehlt im Profil.“ oder „Keine bezifferte Kennlinie“.

### Tabelle Drehzahl / Leistung → Verbrauch

Diese Tabelle listet die Punkte des Triebwerkskennfelds des aktiven Profils auf: „RPM / N1“, „Min.“, „Nennwert“, „Max.“, „Flugphase“, „Kommentar“. Block der Stufe Experte.
Klicken Sie auf einen Spaltentitel (↕), um zu sortieren.
Sie ist nur lesbar: Um sie zu ändern, verwenden Sie den Block „Motorkennfeld — Drehzahl / Leistung → Verbrauch bearbeiten“.
Ohne Daten zeigt sie „Keine Drehzahlkurve in diesem Profil.“

### Profildaten — JSON ⇄ Little Navmap

Dieser Block zeigt alle Felder des Profils, die unverändert in die Datei `.lnmperf` von Little Navmap exportiert werden. Block der Stufe Experte.

- Gruppen: „Identität und Format“, „Kraftstoff und Betrieb“, „Piste und Ausweichflugplatz“, „Steigflug“, „Reiseflug“, „Sinkflug“, „Leistungseinstellung und Verbrauch“.
- Der Kraftstoff erscheint in der gewählten Einheit (kg oder lbs).
- Hat der Typ ein EUROCONTROL-APD-Blatt, erscheint neben den vergleichbaren Feldern ein Etikett „APD …“: Ein Klick übernimmt diesen Wert. Ohne Klick wird nichts geschrieben. Sonst: „Keine EUROCONTROL-APD-Daten für diesen Typ“.

Ein leeres Feld bleibt leer und blockiert den Export als `.lnmperf`: Kein Wert wird erfunden.
Klicken Sie nach einer Änderung in der unteren Leiste auf „Profil speichern“.

### Motorkennfeld — Drehzahl / Leistung → Verbrauch bearbeiten

Dieser Block dient dazu, die Tabelle Drehzahl → Verbrauch Punkt für Punkt einzugeben oder zu korrigieren. Block der Stufe Experte.

1. „Punkt hinzufügen“ erzeugt eine Zeile.
2. Füllen Sie „RPM / N1“, „Min.“, „Nennwert“, „Max.“, „Flugphase“ und „Kommentar“ aus.
3. Speichern Sie das Profil (untere Leiste).

Tipp: Ein im Kommentar geschriebener Bereich, zum Beispiel „1 000–1 300 kg/h total“, füllt beim Speichern Min., Nennwert und Max.
Ohne gewähltes Flugzeug zeigt der Block „Profil wählen oder importieren.“

### SimBrief-Kalibrierung aus OFP

Dieser Block gleicht das aktive Profil mit einem echten SimBrief-Flugplan ab. Block der Stufe Experte.

1. Klicken Sie auf „Letzten SimBrief-FPL abrufen“ (Kopfzeile). Die Kennung wird in ☰ › Pilotenprofil eingegeben. Ersatzweise laden Sie das OFP-JSON auf simbrief.com herunter und verwenden „OFP-JSON importieren“.
2. Das OFP füllt die Planung und den Flugplan; das Profil des Luftfahrzeugs wird erstellt und kalibriert. Die Meldung zeigt eine vollständige oder teilweise Kalibrierung (messbare Phasen) an.
3. „Aktives Profil kalibrieren“ wendet die Kalibrierung des letzten OFP auf das gewählte Profil an.
4. „Prüfbericht als JSON exportieren“ lädt den Prüfbericht herunter.

„Kalibrierungsnachweis“ (in diesem Block) zeigt die zuletzt angewandte Kalibrierung; sonst „Keine OFP-Kalibrierung“.

### Vertikalprofil

Dieser Block zeichnet einen Schnitt entlang des Flugplans der Planung: Gelände, Lufträume, Hindernisse, Flugbahn (TOC, TOD). Block der Stufe Experte.

1. Prüfen Sie den Flugplan in „Kraftstoffplanung“.
2. Wählen Sie das „Anzeigeprofil (Studio)“: Es sind dieselben Profile wie in den Flugkarten.
3. Stellen Sie „Untergrenze (ft)“ und „Obergrenze (ft, 0 = auto)“ ein.
4. Klicken Sie auf „Profil zeichnen“.

Der Steigflug folgt dem Leistungsmodell des aktiven Flugzeugs; der Sinkflug folgt seiner Sinkrate. Ein Plan ohne Flughöhe (VFR) hat keine Flugbahn.
Ein importiertes SimBrief-OFP füllt die Route und zeichnet das Profil von selbst.
Sie brauchen die SIA-Datenbank dieses Browsers, gelesen in den Flugkarten (Block „SIA-Datenbank“) oder unter Einstellungen › Wartung. Ohne sie werden nur Punkte in Koordinaten erkannt, ohne Lufträume.

### OFP-Prüfung — Roh- und berechnete Werte

Diese Tabelle vergleicht Phase für Phase die im OFP gelesenen und die neu berechneten Werte: „Zeit“, „Distanz“, „Kraftstoff“, „Berechneter Verbrauch“, „TAS / GS“, „Variometer“. Block der Stufe Experte.
Sie füllt sich nach einem OFP-Import („Letzten SimBrief-FPL abrufen“ oder „OFP-JSON importieren“).
Ohne OFP: „Keine OFP-Daten.“
Nützlich, um eine teilweise Kalibrierung oder eine Abweichung zu SimBrief zu verstehen.

### Importiertes JSON / SimBrief

Dieser Block zeigt den Rohinhalt der zuletzt importierten Datei (SimBrief-OFP oder JSON). Block der Stufe Experte.
- „JSON kopieren“: kopiert den Inhalt in die Zwischenablage.
- „Leeren“: leert die Anzeige (das Profil wird nicht berührt).

Ohne Import: „Kein JSON geladen.“

## Landungen
<!-- page: apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html -->

Diese Übersicht (Titel „Landing Performance — Übersicht“) analysiert die Qualität Ihrer Landungen anhand der vom Simulator exportierten Dateien: Score, Sinkrate, G, pro Luftfahrzeug und im Zeitverlauf.
Zugang: Seitenleiste „Werkzeuge“, Reiter „Landungen“. Die Datei wird im Browser gelesen; nichts wird gesendet.
Die zuletzt geladene Datei wird gespeichert und beim Öffnen neu geladen. Ihre Luftfahrzeuge werden auch im Menü „Flugzeug“ des Kraftstoffplaners vorgeschlagen. Einzelheiten: [Landungsübersicht](../LANDING_DASHBOARD.md).

### Datei laden

1. Klicken Sie auf „Datei auswählen“ („Datendatei“) oder auf ☰ › „CSV- / LOG-Dateien wählen“. Sie können die Dateien auch auf die Seite ziehen.
2. Wählen Sie eine oder mehrere CSV- oder LOG-Dateien (oder legen Sie sie zusammen ab): Sie werden zu einem Datensatz „erste.csv + n“ zusammengeführt; die Spalten werden über ihren Namen zugeordnet, und eine Landung, die in zwei Dateien vorkommt, wird nur einmal gezählt.
3. Die Seite zeigt das erkannte Format an: „Detailliertes Format erkannt“ (Score, FPM, G, Geschwindigkeit über Grund…) oder „Reduziertes historisches Format erkannt“ (geschätzter Fortschritt ohne Score und ohne End-G).

Vor jeder Datei zeigt die Seite „CSV- oder LOG-Datei auswählen oder hier ablegen.“
Die Statuszeile zeigt die Datei, die Anzahl der verwendeten Messungen, das Luftfahrzeug, die aktiven Filter und den Zeitraum.

### Kopfzeile: Luftfahrzeug, Zeitraum, Trend

- „Flugzeug“: „Alle“ oder ein Typ (mit seinem Symbol).
- „Zeitraum“: „Alle Daten“, „Heute“, „Letzte 7 Tage“, „Letzte 30 Tage“, „Aktueller Monat“, „Aktuelles Jahr“, „Benutzerdefinierter Zeitraum“, mit Knöpfen zum Zurückgehen, Erweitern oder Vorgehen. Der Zeitraum wird für jede Datei gespeichert.
- „Trendmethode“: „Absolut / Asymptote“, „Erste 25 % ↔ Letzte 25 %“ oder „Gleitender Mittelwert“ (mit „Glättung“: 5 oder 10).
- „Drucken / PDF“: druckt die Seite.

Optionen der Analyse (Menü ☰): „offensichtlich unplausible Messwerte ausschließen“, „95P — die stärksten 5 % Unfall-/Crashwerte ausschließen“, „Crash — ausgelöste Landungen ausschließen“ (Schwellen FPM ≤ und G ≥, Logik „FPM oder G“, „FPM und G“, „nur FPM“, „nur G“), „Geschätzte fehlende Felder verwenden“.

### Übersicht des Zeitraums

Oben in der Übersicht geben Karten die Schlüsselzahlen an: „Landungen“, „Durchschnittlicher Score“, „Score Min / Max“, „Durchschnitt FPM“, „FPM Min / Max“, „Durchschnitt G“, „G Min / Max“, „Butter / Very Good“.
Die Knöpfe „−“ und „+“ ändern die Größe dieser Karten.
Darunter das Trendfazit: wahrscheinlicher Fortschritt oder Rückschritt, leicht, „Kein klarer Fortschritt“ oder „zu wenig Daten“ (es braucht mindestens vier verwertbare Messungen).
Der Text erklärt die gewählte Methode (zum Beispiel geschätzte Asymptote und verbleibender Gewinn).

### Entwicklung

Dieser Block zeichnet die Kennzahlen im Zeitverlauf, mit ihrem Trend: Score, Sinkrate beim Aufsetzen (FPM), G-Kraft, Drehgeschwindigkeit der Nase und die Punktwolke „FPM × G — Verteilung der Landungen“. Im reduzierten Format: relativer technischer Index, roher Landing Rate, Float.

- Fahren Sie über einen Punkt: Datum, Luftfahrzeug, Score, Bewertung, Abfangen.
- Ziehen Sie waagerecht über ein Diagramm, um einen Zeitraum auszuwählen.
- Das Band „Gesamtverlauf — ziehen zum Auswählen“ unter jedem Diagramm erlaubt die Wahl eines Zeitraums über den gesamten Verlauf.

Der gewählte Zeitraum erscheint in der Kopfzeile; mit seinen Knöpfen können Sie zurückgehen.
Der relative technische Index ist kein offizieller Score.

### Übersicht nach Luftfahrzeug

Diese Tabelle hat eine Zeile pro Luftfahrzeug: „Flugzeug“, „Typ“, „N“ (Anzahl der Landungen), „P95 Score“, „σ Score“, „Min“, „Max“, „P95 FPM“, „σ FPM“, „P95 G“, „σ G“, „Score-Steigung“, „ρ“, „Fazit“.
Klicken Sie auf einen Spaltentitel, um zu sortieren (▲ / ↕).
Die Spalte „Fazit“ übernimmt den Trend jedes Luftfahrzeugs.
Wählen Sie ein Luftfahrzeug in der Kopfzeile, um nur dieses zu analysieren.

### Datenqualität

Dieser Block zeigt, was die Filter behalten oder ausgeschlossen haben:

| Zeile | Bedeutung |
|---|---|
| „Messungen gesamt“ | In der Datei gelesene Zeilen. |
| „Als plausibel bewertet“ | Vom Plausibilitätsfilter behaltene Messungen. |
| „Teilweise / geschätzt“ | Durch Schätzung ergänzte Messungen. |
| „Als unplausibel markiert“ | Physikalisch unmögliche Messungen. |
| „Als Crash ausgeschlossen“ | Vom Crash-Filter ausgeschlossene Landungen (wenn er aktiv ist). |

Die angewandten Regeln werden darunter angezeigt (zum Beispiel Geschwindigkeit über Grund < 25 oder > 250 kt, |FPM| > 5000, G < 0,10 oder > 12).

### Landungen

Diese Tabelle zeigt jede berücksichtigte Landung im Detail: „Datum“, „Flugzeug“, „Score“, „Bewertung“, „FPM“, „G“, „Groundspeed kt“, „Float s“, „Nase °/s“, „Abfangen“, „Nicklage“, „Querneigung“, Werte „Log geschätzt“, „Quelle“, „Geschätzte Felder“, „Datenqualität“.
Klicken Sie auf einen Spaltentitel, um zu sortieren. Standardmäßig ist die Tabelle nach Datum sortiert.
Die Tabelle scrollt in ihrem Rahmen, wenn die Liste lang ist.
Sie folgt dem gewählten Luftfahrzeug, dem Zeitraum und den Filtern.
