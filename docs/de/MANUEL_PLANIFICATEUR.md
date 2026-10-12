# Handbuch des Planers

Dieses Handbuch beschreibt die Seiten des **Zentrums**, die Missionen vorbereiten und verfolgen: Missionsgenerator,
Kartenstudio, Missionsregister, ODV-Planung und Einsatztafel; ein Kapitel pro Seite, ein Abschnitt pro Reiter oder Block.
In der Suite öffnet der Eintrag **„Hilfe“** der Seitenleiste dieses Handbuch beim Kapitel der aktuellen Seite. Die
Seiten der Piloten beschreibt das [Pilotenhandbuch](MANUEL_UTILISATEUR.md); Zugang zum Zentrum, Einstellungen und
Daten das [Administratorhandbuch](MANUEL_ADMINISTRATEUR.md).

## Missionsgenerator
<!-- page: apps/cpco/mission_editor.html -->

Der Generator bereitet die Unterlagen einer Mission vor: Identifikation, Briefingtexte, Übung, geschätzte Dauer, zu aktivierende Gebiete, danach die PDFs für die Besatzungen. Er dient auch dazu, eine Mission bei ChatGPT zu bestellen und die Antwort zu empfangen.
Zugang: Seitenleiste „Missionen“, Reiter „Generator“ (Stufe Gestaltung, 3), oder ☰ › „Missionsgenerator (SIA)“. Im Register öffnet „Eine Mission erzeugen“ den leeren Generator, und „Im Generator öffnen“ lädt die gewählte Mission.
Siehe auch [Prompt des Generators](../technique/PROMPT_GENERATEUR_MISSIONS.md).
Je nach Nutzungsstufe: Die Seite wird ab der Stufe Gestaltung (3) angeboten. Auf dieser Stufe zeigt sie sieben Blöcke: Mission, Identifikation, Geschätzte Dauer, Zu aktivierende Gebiete, Missionstexte, Karten des Endpakets und Dokumente (dazu Operation und Übung, wenn die Mission dazugehört). Entwürfe, „Alle YAML-Daten“ und die Einstellungen der Routenberechnung gehören zur Stufe Experte (4).

### Tutorial: eine Mission von Anfang bis Ende vorbereiten

Vom Bestellformular bis zum PDF-Briefing in neun Schritten; die Schritte 10 bis 12 machen aus einer Einzelmission eine koordinierte Übung. Die Namen in Anführungszeichen sind Schaltflächen.
1. **Generator öffnen**: Seitenleiste „Missionen“, Reiter „Generator“ (Stufe Gestaltung), oder „Eine Mission erzeugen“ im Register.
2. **Bestellung einstellen**: „Bei ChatGPT bestellen…“ klappt das Formular auf. Wählen Sie „Typ“, „Untertyp“, „Schauplatz“, „Besatzungen im Flug“, „Bodenteams“ und „Dauer“; unter „Weitere Optionen“ „Treffpunkt“, „Luftbetankung“, „Koordinierte Übung“ und bei Bedarf das Luftfahrzeug jedes Teams (leer = ein Luftfahrzeug der Flotte).
3. **Mission erstellen**, nach Wahl. Mit ChatGPT: „Bestellen: Prompt kopieren und ChatGPT öffnen“, den Prompt in ChatGPT einfügen und senden, dann die Antwort (`mission<ID>.yaml` und `summary<ID>.md`) unter „YAML und/oder Markdown“ laden, oder „oder Inhalt einfügen…“ und „Mission lesen“. Ohne ChatGPT: „Gerüst hier erstellen“ erstellt sofort die Mission(en), ohne Erzählung.
4. **Ergänzen**: „Identifikation“ (Titel), „Missionstexte“ („Zusammenfassung“, „Ausführliche Beschreibung“, dann „Textabschnitt hinzufügen“: Hauptziel, Risiken, Treffpunkt…). Gepunktet umrahmte Felder sind noch leer; die Zeile „Gerüst: …“ zählt die zu setzenden Punkte und die zu schreibenden Texte. Punkte ohne Koordinaten (Start, Ziel, Wendepunkte, Treffpunkte, Zone) werden im Studio gesetzt, Schritt 6; auf der Stufe Experte lassen sich `lat` und `lon` auch im Block „Alle YAML-Daten“ in Dezimalgrad eingeben. Eine Operation mit mehreren Teams wird mit ◀ ▶ oben auf der Seite durchlaufen.
5. **Prüfen**: „Geschätzte Dauer“ (wahrscheinliche Route, Hinflug, Zeit im Gebiet, Rückflug) und „Zu aktivierende Gebiete“ (zu stellende Aktivierungsanträge).
6. **Karten erzeugen**: „Im Studio öffnen“ (oder der Reiter „Kartenstudio“), die Mission kommt mit. Bleiben Punkte ohne Koordinaten, listet sie das Feld „Zu setzende Punkte (n)“ im Block Route: „Karte anklicken“, dann ein Klick auf die Kontrollkarte, oder ein Flugplatz, ein Funkfeuer, ein Punkt, gesucht nach Code oder Name; ein gesetzter Punkt wird durch Ziehen verschoben, eine Zone erhält einen Radius in km. Unter „Zu erstellende Karten“ eine Zeile je erwarteter Karte: Profil wählen, in der Kontrollkarte einrahmen und „Diesen Ausschnitt behalten“, dann „Karten und ZIP erzeugen“ („Die n Missionen erzeugen“ für eine Operation). Die PNG liegen in `cartes/` des Missionsordners.
7. **Speichern**: „Im Ordner speichern“ im Studio (Karteneinstellungen), dann im Generator; die Mission wird im Register eingetragen („Im Missionsordner ablegen…“, wenn die Seite danach fragt).
8. **Unterlagen übergeben**: im Generator muss „Karten des Endpakets“ für jede Karte „bereit für das PDF“ zeigen; „Dokumente“ › „Briefing der Besatzung (PDF)“, oder „Alle Unterlagen der Übung“ für eine Operation.
9. **Danach**: im Register übergibt „Zuweisen…“ die Mission an Piloten; „Duplizieren“ beginnt neu ab einer bestehenden Mission (nächste Kennung, Titel „(copie)“).

**Vom Einzelflug zur koordinierten Übung** (Wege 1, 4 und 6 aus „Sechs Wege von Hand“):
10. **Eigenständige Mission**: Legen Sie die Mission mit einer einzigen Besatzung an (Schritte 2 und 3, oder „Neue Mission“); die Zeile Operation des Blocks Mission zeigt „Eigenständige Mission (keine Operation)“. Bei Bedarf nimmt der Textabschnitt „Zeitablauf“ die zeitlichen Ereignisse des Flugs auf.
11. **Besatzung hinzufügen**: „Besatzung hinzufügen…“ in der Zeile Operation. Die Seite sagt, was sie anlegen wird; dann wird die Mission M-016 zur Besatzung A (M-016A) und die Mission M-016B wird mit demselben Kontext (Familie, Einsatzgebiet, Abflug, Ankunft, Zielobjekt, Zonen, Treffpunkte), dem nächsten Rufzeichen und einem eigenen Briefing angelegt. Schreiben Sie dieses Briefing, setzen Sie ihre Punkte im Studio, dann „Im Ordner speichern“ für jede der beiden Missionen.
12. **Übungsleitung anlegen**: „Übungsleitung anlegen…“ in der Zeile Operation legt M-016Z an (Stunde H, aus den Missionen übernommene Teilnehmer, vorgeschlagenes allgemeines Briefing). Stellen Sie Stunde H, Übungsziele und Zeitablauf im Block Übung ein; von einer Besatzung aus führt „Übungsleitung öffnen“ dorthin zurück. „Dokumente“ › „Alle Übungsdokumente (ein PDF pro Empfänger)“ übergibt die Briefings, die versiegelten Umschläge und das Dossier der Übungsleitung.

### Reiter „Missionsgenerator“ und „Kartenstudio“

Beide Seiten teilen sich einen Reiter am Kopf und arbeiten an **derselben Mission**.
- Wechseln Sie von einem Reiter zum anderen: Die aktuelle Mission kommt mit, einschließlich der Änderungen.
- Jede Änderung wird in diesem Browser gespeichert und sofort von der anderen geöffneten Seite übernommen (zum Beispiel Ausdehnungen, im Studio hinzugefügte oder gelöschte Karten). Der Generator zeigt dann „Mission vom Kartenstudio aktualisiert“.

Der Kopf bietet außerdem:
- „Bericht erstellen →“: öffnet einen neuen Bericht der zum Missionstyp passenden Familie, mit der Mission vorausgefüllt;
- wenn eine Operation mehrere Missionen umfasst: ◀ und ▶ („Vorherige Mission“, „Nächste Mission“) und eine Liste, um die Mission des Pakets zu wechseln;
- nach dem Öffnen aus dem Register: „← Register (M-016)“, um dorthin zurückzukehren.

### Mission

Dieser Block zeigt die geladene Mission und vereint Speichern und Import.

| Schaltfläche | Wirkung |
|---|---|
| „Neue Mission“ | Leert das Formular (heutiges Datum) |
| „Bei ChatGPT bestellen…“ | Klappt das Bestellformular auf (siehe unten) |
| „Im Ordner speichern“ | Schreibt das geänderte YAML nach `data/missions/<lettre>_<FAMILLE>/<ID>/`; die alte Version wird ersetzt, der Verlauf bleibt im YAML erhalten |
| „Änderungen verwerfen“ | Aktiv, wenn die Mission ungespeicherte Änderungen hat: kehrt nach Bestätigung zur zuletzt im Ordner gespeicherten Version (oder zur geladenen Version) zurück; das Studio folgt |
| „Duplizieren“ | Kopie der geladenen Mission, bereit zum Bearbeiten: nächste freie Kennung und Serie derselben Familie (Teambuchstabe bleibt), Verweise auf die alte Kennung nachgeführt (erwartete Karten, Erzählung), Titel „… (copie)“, `meta.duplicated_from`; Operation auf die Kopie reduziert; Karten und Darstellungen im Studio neu erstellen. Die Kopie öffnet sich hier; „Im Ordner speichern“, um sie zu behalten |
| „Entwurf speichern“ / „Entwurf neu laden“ (Stufe Experte) | Behält oder liest den Text der Mission in diesem Browser (die Bilder sind neu auszuwählen) |

Unter den Schaltflächen stehen immer zwei Zeilen:
- **Statuszeile** mit farbigem Punkt: „Im Ordner gespeichert (vor n Min.)“, „Wie die Version im Ordner (geladen …)“, „Noch nicht im Ordner gespeichert“ (Gerüst, Kopie, neue Mission) oder „Ungespeicherte Änderungen seit 14:32 (n Feld(er))“. „Im Ordner speichern“ ist die Bestätigung: Hauptschaltfläche, solange etwas ungespeichert ist. Generator und Studio teilen die Mission sofort (gemeinsamer Arbeitsentwurf, in diesem Browser gespeichert): Die Zeile ist auf beiden Seiten gleich, ihr Tooltip erinnert daran.
- **Zeile Operation**: „Eigenständige Mission (keine Operation)“ oder was die Mission in ihrer Operation ist — „Operation BOXING GLOVES (A-001): Besatzung B von 5 · Übungsleitung A-001Z · Stunde H 10:00“ („noch keine Übungsleitung“, solange die Übung keine hat, mit der Schaltfläche „Übungsleitung anlegen…“; für die Mission …Z: „Übungsleitung, n Besatzung(en)“). Ihre Aktionen — „Besatzung hinzufügen…“, „Diese Besatzung entfernen…“, „Übungsleitung anlegen…“, „Übungsleitung öffnen“ — beschreibt „Sechs Wege von Hand“.

Der Bereich „Andere Mission importieren: Dateien, eingefügter Text, ChatGPT-Bestellung“ ist geöffnet, wenn keine Mission geladen ist:
- „YAML und/oder Markdown“: Wählen Sie `mission<ID>.yaml` und `summary<ID>.md` gemeinsam aus, oder klicken Sie auf „oder Inhalt einfügen…“ und dann auf „Mission lesen“;
- „Karten oder vom Generator geliefertes ZIP“: Wählen Sie direkt das ZIP des Studios; die PNGs und die Übersichtskarte werden automatisch zugeordnet;
- „Mission bei ChatGPT bestellen“: dasselbe Formular wie im Register (Typ, Untertyp, Einsatzgebiet, Serie, Teams, Luftfahrzeuge…). „Bestellen: Prompt kopieren und ChatGPT öffnen“ kopiert den Prompt, öffnet ChatGPT in einem neuen Tab und trägt die Bestellung ins Register ein („bestellt“). Auf der Stufe Gestaltung erscheint dieser Bereich nur, wenn der Knopf „Bei ChatGPT bestellen…“ ihn öffnet; auf der Stufe Experte steht er auch zugeklappt im Bereich. **„Gerüst hier erstellen“** (nur im Generator, neben dem Bestellknopf) macht dasselbe ohne ChatGPT: Mit denselben Einstellungen erstellt es die vollständige(n) Mission(en) ohne Erzählung — eine je fliegendem Team (Luftfahrzeug und Rufzeichen gewählt oder aus der Flotte: Luftfahrzeuge der Prompt-Kategorien, die zur Familie passen; Betankung: ein Tanker, dann Empfänger; nichts Passendes: Luftfahrzeug zu ergänzen), Start- und Zielflugplatz an der Basis des Luftfahrzeugs, Ziel, Wendepunkte, ein Treffpunkt je Team, wenn „Treffpunkt“ auf „mit“ steht, Arbeitsgebiet, geplante Betankung mit einer AAR-Strecke (ARIP, ARCP) bei „ja“, Zeitplan aus der Dauer, erwartete Karten mit Beschreibung, leeres Hauptziel, Risiken, Einleitung und Zeitablauf; mit „Koordinierte Übung: ja“ die Leitungsmission …Z (Stunde H, Teilnehmer, Ereignisse H, H+15 min…). Die Missionen öffnen sich als Stapel; die Zeile „Gerüst: n Punkt(e) zu setzen, m Text(e) zu schreiben — dann das Studio für die Karten“ zählt, was bleibt, jedes leere Feld ist umrahmt, bis es ausgefüllt ist, und „Im Studio öffnen“ wechselt ins Kartenstudio, um die Punkte zu setzen und die Karten zu erzeugen.

Eine empfangene Mission wird ins Register eingetragen und in ihrem Ordner abgelegt, wenn der Missionsordner erlaubt ist; andernfalls klicken Sie auf „Im Missionsordner ablegen…“. Link „Register öffnen ↗“.
Der empfangene Text wird in `recu/` aufbewahrt; erneut empfangen, ersetzt eine Mission die vorige nur, wenn sich ihre Daten ändern: Die alte kommt nach `versions/`, die Studio-Einstellungen gleichnamiger Karten werden übernommen. Das Einfügen nimmt die ganze Antwort von ChatGPT an (mehrere Missionen: ein Stapel); Begleitdateien einer Serie (VALIDATION.txt, Manifest) werden ausgesondert und gemeldet.

### Operation

Block sichtbar, wenn die Operation mehrere Missionen oder eine Übungsleitung hat (eine Einzelmission beschreibt die Zeile Operation des Blocks Mission). Seine erste Zeile verwendet dieselben Worte: „Operation BOXING GLOVES (A-001): 5 Besatzung(en) · Übungsleitung A-001Z · Stunde H 10:00“.
- Jede Mission der Operation ist eine Schaltfläche: Kennung, Rufzeichen oder „Übungsleitung“, Startzeit. Klicken Sie, um sie anzuzeigen. „nicht geladen“ oder „anzulegen“ kennzeichnet eine Mission, die im Paket fehlt.
- „Übungsleitung anlegen“ erstellt die Mission …Z (allgemeines Briefing, Stunde H, Teilnehmer, Übungsziele, Zeitablauf) und übernimmt dabei die Spuren und Einspielungen der Missionen im alten Format.
- „Missionen der gespielten Ziele anlegen (n)“: Jedes gespielte Übungsziel wird eine Mission der Operation (Basis der ersten Besatzung, Route der Spur, berechneter Start). Prüfen Sie danach Luftfahrzeug, Basis und Uhrzeit, öffnen Sie jede im Studio, dann „Im Ordner speichern“.

### Sechs Wege von Hand

Alles lässt sich von Hand anlegen; jeder Fall hat seinen Weg, und seine Aktionen stehen in der Zeile Operation des Blocks Mission. Eine *Mission* ist ein Luftfahrzeug mit seiner Besatzung; eine *Operation* fasst die Missionen mit demselben Kennungsstamm zusammen (Buchstaben A, B…); die *Übungsleitung* (Buchstabe Z) trägt die Übung: Stunde H, Teilnehmer, Übungsziele, Zeitablauf.

| Fall | Weg | Zeile Operation |
|---|---|---|
| 1 — Eigenständige Mission, ein Luftfahrzeug | „Neue Mission“, oder „Gerüst hier erstellen“ mit einer Besatzung und „Koordinierte Übung“ nein, oder ChatGPT | „Eigenständige Mission (keine Operation)“ · „Besatzung hinzufügen…“ |
| 2 — Eigenständige Mission, mehrere Luftfahrzeuge (je eine Mission und ein Briefing) | Gerüst mit n Besatzungen, Übung nein; oder Fall 1, dann „Besatzung hinzufügen…“ (n − 1 Mal) | „Operation X-016: Besatzung A von 2 · noch keine Übungsleitung“ · „Besatzung hinzufügen…“, „Diese Besatzung entfernen…“, „Übungsleitung anlegen…“ |
| 3 — Eigenständige Mission, ein Luftfahrzeug, zeitliche Ereignisse und Wendepunkte | Fall 1, dann der Textabschnitt „Zeitablauf“: Ereignisse bei H+n (H = geplanter Start) an einem Wendepunkt, Treffpunkt oder einer Zone der Mission, oder als freier Text; die Wendepunkte behalten ihre Zeit im Zielgebiet | Wie Fall 1 |
| 4 — Eigenständige Mission, die koordiniert wird, mehrere Luftfahrzeuge | „Besatzung hinzufügen…“: Die Mission wird Besatzung A (M-016 → M-016A), Mission B übernimmt den gemeinsamen Kontext und hat ein eigenes Briefing; wiederholen für C… | „Operation M-016: Besatzung A von 2 · noch keine Übungsleitung“ |
| 5 — Koordinierte Übung von Anfang an | Gerüst mit n Besatzungen und „Koordinierte Übung“ ja (Missionen A… und Z), oder ChatGPT | „Operation X-016: Besatzung A von 3 · Übungsleitung X-016Z · Stunde H 10:00“ · „Übungsleitung öffnen“ |
| 6 — Koordinierte Missionen, die eine Operation mit Übungsleitung werden | „Übungsleitung anlegen…“: Mission Z mit Stunde H, aus den Missionen übernommenen Teilnehmern, leeren Übungszielen und leerem Zeitablauf, vorgeschlagenem allgemeinem Briefing | Wie Fall 5 |

Jede Aktion sagt zuerst, was sie anlegt oder entfernt, Kennungen inbegriffen. „Diese Besatzung entfernen…“ nimmt die Mission aus dem Stapel und aus den Listen der Operation; bleibt nur eine Besatzung ohne Übungsleitung übrig, wird sie wieder eine eigenständige Mission (M-016A → M-016). Eine bereits abgelegte Mission wird im Register gelöscht („Löschen…“). Das Studio folgt dem Stapel. Nach einer Änderung der Operation jede geänderte Mission speichern.

### Identifikation

| Feld | Inhalt |
|---|---|
| „Titel“ | Titel der Mission |
| „Familie“ | Missionsfamilie (Liste des Einsatzbefehls) |
| „Untertyp“ | Vorschläge je nach Familie, freie Eingabe möglich |
| „Kennung“ | Buchstabe der Familie, Bindestrich, dreistellige Nummer, dann Teambuchstabe (A, B…) oder Z für die Übungsleitung: M-016, S-002A, I-001Z |
| „Erzeugungsserie“ | Erzeugungspaket innerhalb der Familie (eine ChatGPT-Bestellung = eine Serie) |
| „Autor“, „Dokumentdatum“ | Signatur der Unterlagen |

Die nächste freie Kennung und die nächste Serie erscheinen grau in den leeren Feldern: Das sind Hinweise, keine Werte. Eine Warnung erscheint, wenn die Kennung nicht mit dem Buchstaben der Familie beginnt.
Das Ändern der Kennung einer Mission, auf die andere verweisen (Operation, Karten, Texte), öffnet eine Bestätigung: Bestätigen Sie, um das ganze Paket zu migrieren (die alte Kennung bleibt in `mission.former_id` erhalten), oder lehnen Sie ab, um die alte zu behalten.

### Geschätzte Dauer

Schätzung des Flugs anhand der wahrscheinlichen Route und des Luftfahrzeugs; bei jeder Änderung neu berechnet. Bei einer Mission der Übungsleitung ausgeblendet.
- „Transit“: „automatisch (nach Luftfahrzeug und Höhe)“, „Luftstraßen (IFR)“, „RTBA (Tiefflug)“ oder „direkt“. Die Wahl wird in die Mission geschrieben.
- „Einstellungen der Routenberechnung (für alle Missionen)“ (Stufe Experte): dieselben Felder wie unter Einstellungen › Zentrum, mit „Standardwerte“.
- Anzeige: „geschätzter Flug“, „Block“, Hinflug / im Gebiet / Rückflug, Entfernung; gegebenenfalls Rückflugoptionen und aufeinanderfolgende Briefings.
- Die **erprobten Zeiten** (Berichte von Missionen mit gleichem Abflugort und gleichen Punkten) ersetzen die Berechnung, wenn es sie gibt.
- Eine Tabelle vergleicht die Schätzung mit den bereits erstellten Berichten der Mission (tatsächlicher Flug, Abweichung).
- Kästchen „Wahrscheinliche Route anzeigen“: Skizze und Tabelle der Teilstrecken.

Grenze: Ohne SIA-Datenbank im Browser bleiben die Routen direkt; eine Warnung fordert dazu auf, den SIA-Ordner neu zu lesen.

### Zu aktivierende Gebiete

Liste der Gebiete R, D, TRA und des RTBA, die von der wahrscheinlichen Route und den Arbeitsgebieten geschnitten werden, mit verwaltender Stelle, Grenzen, Aktivierungsart und Schnittpunkt. Die P-Gebiete werden als „zu meiden“ gekennzeichnet.
- Mission der Übungsleitung: Gebiete aller Missionen der Besatzungen (Anträge durch die Übungsleitung).
- Mission einer koordinierten Übung: Liste nur zur Information.
- Einzelmission: Anträge durch die Besatzung; die Liste wird ins Briefing-PDF übernommen.

Grenze: Die Berechnung ist ein Richtwert und ersetzt weder die AZBA-Karten noch die NOTAM. Ohne SIA-Datenbank gibt der Block an, wo sie zu lesen ist (Studio, Block „SIA-Datenbank“, oder Einstellungen › Wartung › Luftfahrtdaten).

### Übung

Block für eine Übungsmission.

Auf der Mission der Übungsleitung (…Z) ein vollständiger Editor:
- „Stunde H und Teilnehmer“: „Stunde H (Bezeichnung oder Uhrzeit)“, dann eine Zeile pro Teilnehmer („Rufzeichen“, „Mission“, „Start (H-20mn, H+1h)“, „Rolle“); „+ Teilnehmer“, „Missionen der Operation übernehmen“.
- „Übungsziele“: zu erkennende, abzufangende oder zu begleitende Spuren (Name, „Gespielt“, Rufzeichen, Abflugort, Art, Punkte, Höhe, Geschwindigkeit, was die Besatzungen feststellen sollen, Anweisungen); „+ Ziel“, „Markdown-Tabelle der Spuren importieren“.
- „Zeitablauf“: ein Ereignis pro Karte („Auslöser“: Uhrzeit oder Überflug eines Punkts; „Form“: Funkspruch oder versiegelter Umschlag; „Absender“, „Titel“, „Empfänger“, „Aufgedeckte Spuren“, Text); „+ Funkspruch“, „+ Versiegelter Umschlag“, „Dieses Ereignis entfernen“.
- „Was jeder erhält“: Zusammenfassung pro Empfänger.

Auf einer Besatzungsmission heißt der Block „Übung: was diese Besatzung erhält“ und ist nur lesbar. Die Zeile „Übungskarten“ nennt die geladenen oder im Studio zu erzeugenden Karten.

### Missionstexte

„Zusammenfassung“, „Ausführliche Beschreibung“, dann die Abschnitte: „Textabschnitt hinzufügen“ bietet die Typen an, die Briefing und Bericht einordnen können (Einleitung, Hauptziel, Nebenziele, Beteiligte Teams, Wendepunkte, Treffpunkte, Luftbetankung, Zu berücksichtigende Risiken, Ladung / Personal, Koordinierung, Zeitablauf, Vorgesehene Karten, Notizen), jeweils mit einer Zeile, wo er erscheint und was hineingehört, dann „Freier Text“. Jeder Abschnitt trägt seinen Typ, aus einer Liste gewählt und nachträglich änderbar (der Inhalt folgt); ein Typ dient nur einmal (schon vergeben: ausgegraut), außer „Freier Text“, der einen einzugebenden Titel hat, beliebig oft hinzugefügt werden kann und ans Ende des Briefings kommt. Ziele, Risiken und Notizen werden im YAML unter ihrem Schlüssel gespeichert (`objectives.primary`, `objectives.secondary`, `risks`, `notes`; ein Wert pro Zeile bei Listen); die anderen ergänzen im Briefing den gleichnamigen Abschnitt. Das abgelegte Briefing (`summary<ID>.md`) ist eine Darstellung des YAML: Mit dem YAML erneut gelesen, liefert es nur diese Abschnitte zurück (in der Datei durch einen unsichtbaren Kommentar markiert), nie die Abschnitte, die es aus dem YAML zieht; eine `.md`-Datei allein bleibt eine vollständige Quelle, aus der das YAML erstellt wird. Jeder Abschnitt hat „Inhalt“ und „Löschen“.
Hat die empfangene Datei weder Zusammenfassung noch Beschreibung, werden sie aus den Daten vorgeschlagen: Lesen Sie sie gegen.
Auf einer Mission der Übungsleitung wird der Block zu „Allgemeines Briefing“: Lage, gemeinsame Ziele, Zeitfenster, Endkriterien, für alle.

Der Abschnitt „Zeitablauf“ („Textabschnitt hinzufügen“) enthält auch die zeitlichen Ereignisse der Mission, über seinem freien Text: Zeit (H+30mn; H = geplanter Start), Ort der Mission (Abflug, Wendepunkt, Treffpunkt, Zone, Zielobjekt, Ankunft) oder freier Text, was geschieht; „+ Ereignis“ fügt eine Zeile hinzu. Das Briefing druckt sie am Anfang des Abschnitts Zeitablauf, nach Zeit geordnet. Mission der Übungsleitung: Der Zeitablauf der Übung wird im Block Übung eingestellt.

### Alle YAML-Daten

Block der Stufe Experte, standardmäßig ausgeblendet: Klicken Sie in seinem Kopf auf „Anzeigen“.
- Editor ohne vorgegebenes Schema: Jeder Schlüssel des YAML ist änderbar, unbekannte Felder bleiben erhalten.
- Listen: „Element hinzufügen“, × zum Entfernen eines Elements.
- „Name eines neuen Stammfelds“ und dann „Hinzufügen“ legt einen Schlüssel der ersten Ebene an.

Nur für Korrekturen verwenden, die die anderen Blöcke nicht erlauben.

### Karten des Endpakets

Liste der dem PDF beigefügten Karten, in der Reihenfolge der Unterlagen: die im YAML angegebenen, die Übersichtskarte am Anfang, das Vertikalprofil am Ende.
Jede Karte zeigt ihren Zustand: „bereit für das PDF“ (Abmessungen in Pixeln) oder „Bild nicht geladen“.
Um die Bilder zu laden, verwenden Sie das ZIP des Studios im Block Mission. Eine aus dem Register geöffnete Mission liest die in ihrem Ordner abgelegten Karten direkt.

### Dokumente

| Gruppe | Schaltflächen |
|---|---|
| „Diese Mission“ (oder „Übungsleitung“) | „Briefing der Besatzung (PDF)“ oder „Mappe der Übungsleitung (PDF)“, „Mappe der Übungsleitung (PDF)“ aus einer Besatzungsmission, „Blätter der gespielten Übungsziele (je ein PDF)“ |
| „Gesamte Operation“ (Paket aus mehreren Missionen) | „Alle Übungsdokumente (ein PDF pro Empfänger)“, „Alle PDFs exportieren“, „Operationsmappe (ein PDF)“ |
| „Daten“ | „YAML exportieren“, „Markdown exportieren“ |

Das Briefing der Besatzung enthält ihre versiegelten Umschläge und die Karten; die Statuszeile listet die nicht beigefügten Karten. Laden Sie die Karten vor dem Export.
Jeder versiegelte Umschlag belegt eine Seite nach den Karten, gefolgt von seiner Übungskarte; die Karte einer Funkmeldung hat ihre eigene Seite „bei Eingang der Meldung zu übergeben“.

## Kartenstudio
<!-- page: apps/cpco/map_parser.html -->

Das Studio erstellt die Karten der Missionsunterlagen aus den Daten des SIA (AIRAC-Zyklus): Route, Vertikalschnitt, Karten als PNG oder SVG, ZIP und Übersichtskarte.
Zugang: Seitenleiste „Missionen“, Reiter „Kartenstudio“ (Stufe Experte, 4), ☰ › „Kartenstudio (SIA)“, oder „Im Kartenstudio öffnen“ im Register.
Es arbeitet an der mit dem Generator geteilten Mission. Technische Details: [Missionen und Karten](../technique/FRAMEWORK.md).

### Mission

- Statuszeile der geladenen Mission und Schaltfläche „Im Ordner speichern“: schreibt die Mission und die Einstellungen des Studios (Profil und Ausschnitt jeder Karte, Linien, Spuren) in `mission<ID>.yaml`. Das Ergebnis erscheint neben der Schaltfläche und als Benachrichtigung. Darunter dieselbe Statuszeile wie im Generator, mit „Änderungen verwerfen“.
- Zeile „SIA-Datenbank“: AIRAC-Zyklus, Anzahl der Lufträume und der MORA-Zellen, Link zu Einstellungen › Wartung › Luftfahrtdaten.
- „Andere Mission öffnen: Markdown-/YAML-Datei oder eingefügter Text“ (eingeklappt, wenn eine Mission geladen ist): Wählen Sie eine Datei, oder „oder Inhalt einfügen…“ und dann „Mission lesen“.

Die hier geöffnete Mission wird zur mit dem Generator geteilten Mission. Bei einer Übungsmission werden fehlende Übungskarten automatisch hinzugefügt: Speichern Sie die Mission, um sie zu behalten.

### Route

Flugplan, Kontrollkarte und Vertikalschnitt sind verknüpft: Fahren Sie in einem davon über einen Punkt, leuchtet er in den beiden anderen auf.
- Routenfeld: Feld 15 des ICAO-Flugplans oder kommagetrennte Liste; leer = Route der Mission. „Syntax und Verwendung“ erläutert die Formate.
- „Höhe“: Reiseflughöhe (FL65 oder 6500).
- Liste „Luftstraßen“ / „RTBA (Tiefflug)“, dann „Suchen“: sucht eine Route zwischen den Punkten und ersetzt den Text.
- „SimBrief“: übernimmt den letzten OFP (SimBrief-Kennung: Einstellungen › Mein Profil › Identität und Netzwerke); „↺ Wahrscheinliche Route“: übernimmt die wahrscheinliche Route, einschließlich Rückflug zur Basis.
- „Zeichnen“ (Vertikalschnitt), „Kraftstoff“ (öffnet den Planer mit dieser Route), „ICAO kopieren“ (strikter Flugplan).
- „Punkte der Mission“: Klicken Sie auf einen Punkt, um ihn zur Route hinzuzufügen.

Kontrollkarte: Listen „Karte“ und „Profil“, Kästchen „ZIP“, „Aktualisieren“, „Diesen Ausschnitt behalten“ (die erzeugte Karte übernimmt den angezeigten Rahmen), „Zentrieren“, „Automatischer Ausschnitt“, „⧉ Fenster“ (separates, synchronisiertes Fenster), „⤢ Vergrößern“ (Esc zum Zurückkehren). Auf der Karte: Ziehen Sie einen Punkt, klicken Sie auf die Route, um einzufügen, Rechtsklick zum Löschen.
„Profileinstellungen: Schnitt, Luftfahrzeug, Steigrate, Ausgaben“: Unter- und Obergrenze des Schnitts, Luftfahrzeug, Steig- und Sinkflug, Bild `profil_vertical.png` in den Ausgaben, Standardlinie der Route.

### Zu setzende Punkte

Eine Mission ohne Koordinaten (Gerüst des Generators) zeigt im Block Route das Feld „Zu setzende Punkte (n)“: Start, Ziel, Wendepunkte, Treffpunkte, Zonenmittelpunkte und Flugplätze ohne Position, in der Reihenfolge der Route.
- „Karte anklicken“: Die Zeile ist gewählt, der Mauszeiger wird zum Kreuz; ein Klick auf die Kontrollkarte setzt den Punkt (Esc bricht ab).
- Suchfeld: Flugplatz, Funkfeuer, Wegpunkt, VFR-Punkt oder AAR-Strecke („LFLY“, „OLIVIA ARIP“) der SIA-Datenbank, nach Code oder Name, oder Koordinaten „45.72, 4.94“.
- Ein gesetzter Punkt wird durch Ziehen auf der Karte verschoben; eine Zone erhält einen Radius in km. Gleicher Start- und Zielflugplatz werden zusammen gesetzt.
- Die Koordinaten gehen in die gemeinsame Mission: Der Generator sieht seine Zahl „zu setzende Punkte“ sinken. Alles gesetzt: „Karten und ZIP erzeugen“.

### Zu erstellende Karten

„Karten der Mission“: eine Zeile pro Karte.
- Klick auf den Namen: zeigt die Karte in der Kontrollkarte (✎ = Ausschnitt geändert).
- Anzeigeprofil, oder „Deaktiviert“ (Karte weder erzeugt noch in der Vorschau noch auf der Übersicht).
- Linie: „Ohne Linie“, „Briefing: Route“, „Übungsleitung: wahrscheinliche Route“, „Route + wahrscheinliche Route“.
- Übungsempfänger (wenn die Übung Spuren hat): ohne Spuren, Übungsleitung, ein Übungsziel, oder eine Besatzung nach einem bestimmten Funkspruch oder Umschlag.
- Kästchen „ZIP“ (nicht angehakt: Karte nicht erzeugt; Wahl nicht in der Mission gespeichert) und × zum Löschen.

Hinzufügen: Name, Typ („Übersicht“, „Ziel“, „Detail“, „Gebiet“), dann „+ Karte“ (Ausdehnung = angezeigte Ansicht); „+ Übungskarten“ fügt die Karten der Übungsleitung, der gespielten Übungsziele oder der Besatzung hinzu.
„Einstellungen des Profils …“ (eingeklappt): „Profilname“, „Hintergrundkarte“, „Speichern“, „Neu“, „Duplizieren“, „Löschen“, dann vier Reiter: „Hintergrundkarte“, „Lufträume“, „ICAO-Symbole“, „Elemente“. Geändert wird immer das Profil der gewählten Karte; die Profile gelten für alle Missionen und bleiben in diesem Browser. Die Vorschlagslisten der Eingabefelder (Zonen, Flugplätze, Funkfeuer: bis zu 13 000 Einträge aus der SIA-Datenbank) werden erst gefüllt, wenn Sie in das betreffende Feld klicken, nicht beim Öffnen der Seite.

### Vorschauen und Erzeugung

- „Alle Karten anzeigen“: Vorschauen aller Karten; sie erzeugen keine Datei.
- „Karten und ZIP erzeugen“ (auch in der Fußleiste): erstellt jede mit „ZIP“ angehakte Karte, die Übersichtskarte und, wenn die Option angehakt ist, das Vertikalprofil, und lädt dann das ZIP herunter.
- Die PNGs werden in `cartes/` des Missionsordners abgelegt (im Register sichtbar). Andernfalls verwenden Sie „Karten im Ordner ablegen“ in der Fußleiste.
- Eine fehlgeschlagene Karte hält die anderen nicht auf: Das ZIP enthält `rapport_generation.txt`, und „Einzeln wiederholen“ startet die Karte erneut. „Hintergrund unvollständig“ meldet eine langsame Hintergrundkarte.
- Hintergrundkarte mit Fehler: Die Kontrollkarte erklärt die Ursache, wechselt auf Standard-OSM und bietet „Fehlerbericht kopieren“ an (technisches Detail zur Weitergabe).
- Paket aus mehreren Missionen: „Die n Missionen erzeugen“ erstellt ein einziges ZIP, einen Ordner pro Mission, mit der Karte der Operation.
- „Abbrechen“ (Fortschrittsbalken, bei Vorschauen wie bei der Erzeugung): Die laufende Karte wird fertiggestellt, die folgenden werden nicht erstellt. Eine abgebrochene Erzeugung lädt kein ZIP herunter und legt nichts im Missionsordner ab; ein abgebrochener Stapel nennt, wie viele Missionen fertig sind (ihre Karten liegen bereits in ihrem Ordner); die bereits angezeigten Vorschauen bleiben.

Ausgabeart (PNG, bearbeitbares SVG) und Breite der PNGs: Menü ☰ › „Kartenausgaben“. Die Übersichtskarte ist immer enthalten; sie erscheint unten im Block.

### SIA-Datenbank

Block standardmäßig ausgeblendet: Klicken Sie in seinem Kopf auf „Anzeigen“.
- Ordner `data/sia`, gespeichert wie die anderen Ordner der Suite.
- „Luftfahrtdatenbank neu aufbauen“ nach jeder AIRAC-Aktualisierung; „Abbrechen“ unterbricht, ohne die gespeicherte Datenbank zu ändern.
- „Cache leeren“ löscht die in diesem Browser gespeicherte Datenbank (danach neu einzulesen).
- Die Statuszeile zeigt die gespeicherte Datenbank (Ordner, AIRAC-Zyklus, Datum); „Analysierte Dateien“ listet die gelesenen XML.

Enthält der Ordner mehrere Zyklen, wird nur der neueste gelesen; die anderen werden gemeldet und sind zu archivieren. Es ist derselbe Block wie unter Einstellungen › Wartung › Luftfahrtdaten („Luftfahrtdatenbank neu aufbauen“), der die aktiven Zonen und ihre angehakten Quellen liest.

## Missionsregister
<!-- page: apps/cpco/mission_registry.html -->

Das Register erfasst alle erzeugten oder bestellten Missionen mit ihrer Verfolgung durch das Zentrum: Status, Flugdatum, Notizen, Berichte.
Es dient dazu, eine Mission auszuwählen, sie im Generator oder im Studio zu öffnen, sie Piloten zuzuweisen, ihren Bericht zu erstellen und neue Missionen zu bestellen.
Zugang: Seitenleiste „Missionen“, die sich auf dem Register öffnet (Reiter „Register“), oder ☰ › „Missionsregister (SIA)“. Oben öffnet „Eine Mission erzeugen“ den Generator, um eine zu erstellen.
Je nach Nutzungsstufe: Die Seite wird ab der Stufe Gestaltung (3) angeboten, mit dem Wesentlichen: „Dateien hinzufügen…“ und „Ordner neu lesen“, vier Filter und „Weitere Filter“, eine Tabelle mit sieben Spalten, ein Blatt ohne das Kartenstudio und das vereinfachte Bestellformular. Der Rest gehört zur Stufe Experte (4), wie unten angegeben.

### Missionen des Registers

Am Kopf: Anzahl der Missionen, Verteilung nach Status und Aktualisierungsdatum.

| Schaltfläche | Wirkung |
|---|---|
| „Missionsordner: …“ (Stufe Experte) | Wählt den Ordner `data/missions` und liest ihn dann neu |
| „Ordner neu lesen“ | Liest alle Missionen des Ordners neu; fragt nach ihm, wenn er noch nicht freigegeben ist |
| „Dateien hinzufügen…“ | Fügt `mission<ID>.yaml` / `summary<ID>.md` hinzu (jeder Browser) |
| „mission_registry.yaml schreiben“ (Stufe Experte) | Schreibt das Register in den Missionsordner |
| „Register bereinigen (n)“ (Stufe Experte) | Entfernt die Missionen „Datei fehlt“ nach dem Neueinlesen |

Der Ordner wird beim Öffnen automatisch neu gelesen, wenn er bereits erlaubt ist. Das Lesen zeigt einen Fortschrittsbalken mit „Abbrechen“: Das Register bleibt unverändert.
Beim Bereinigen gehen Status, Notizen und Flugdatum auf die Mission über, die eine umnummerierte Mission ersetzt.

### Mission wählen

Filter: „Typ“, „Status“, „Schauplatz“, „Suche“; die übrigen („Untertyp“, „Treffpunkt“, „Beteiligte Teams“ (min – max), „Team- / Luftfahrzeugtyp“, „Luftbetankung“) liegen unter „Weitere Filter“, geöffnet auf der Stufe Experte oder wenn einer von ihnen aktiv ist. Sie werden gespeichert.
- „Zufällig wählen (n)“ wählt eine Mission unter denen, die die Filter passieren.
- „Filter löschen“, „CSV“ (Export der Auswahl).
- Tabelle nach Spalte sortierbar: Mission, Typ, Titel, Teams, RDV, AAR, Schauplatz, Status, „Gesch. Dauer“, Berichte (Anzahl der Flüge), „Erzeugt“. Die Leiste unter der Tabelle regelt ihre Höhe (Doppelklick: Standardhöhe). Die Spalten Teams, RDV, AAR und Schauplatz erscheinen nur auf der Stufe Experte.
- ✕ entfernt eine Mission aus dem Register, ohne ihre Dateien zu löschen.

Klicken Sie auf eine Zeile, um das unten beschriebene Missionsblatt zu öffnen. Der Link `?mission=M-016` öffnet das Blatt direkt.

### Missionsblatt

Das Blatt zeigt Status, Streckenführung, Teams und Rufzeichen, danach:
- bei einer Operation: ihre Mitglieder (klicken Sie, um sie anzuzeigen); „Öffnen“ lädt die ganze Operation in den Generator oder das Studio;
- „Dateien der Mission“: YAML, „Markdown (lesbar)“, „PDF (Generator)“, „Bearbeiten (Generator)“, „Karten (Studio)“ (Stufe Experte), Miniaturen der Karten, frühere Versionen und empfangene Texte;
- Zustand der Karten: „vollständig“, „teilweise: Karten zu ergänzen“ oder „teilweise: Karten nicht erzeugt (wiedererzeugbar)“;
- „Geschätzte Dauer“ mit dem Vergleich zu den Berichten.

Schaltflächen: „Im Generator öffnen“, „Duplizieren“ (Kopie der Mission, nächste Kennung, im Generator geöffnet; siehe Generator), „Im Kartenstudio öffnen“, „Zuweisen…“ (außer Übungsleitung …Z; siehe [Zuweisung der Missionen](../technique/AFFECTATION_MISSIONS.md)), „Bericht erstellen“ oder „Neuer Bericht (Flug n)“, und „Prompt erneut kopieren“ für eine bestellte Mission. „Im Kartenstudio öffnen“ und „Prompt erneut kopieren“ gehören zur Stufe Experte.

### Verfolgung durch das Zentrum: Status, Flugdatum, Notizen

Der Rahmen unten im Blatt enthält drei Felder: „Status“, „Geflogen am“, „Notizen“.

| Status | Wann |
|---|---|
| bestellt | Bestellung an ChatGPT aufgegeben |
| erzeugt | Dateien empfangen |
| geplant | Mission aus dem Register im Generator oder im Studio geöffnet |
| geflogen | Flugdatum eingegeben, oder Bericht aus dem Blatt erstellt |
| Bericht erstellt | Ein Bericht des Berichtsregisters nennt die Mission (automatisch) |
| aufgegeben | Manuelle Wahl |

Die Verfolgung wird in `suivi.yaml` im Missionsordner geschrieben; sie wird mit den anderen Rechnern geteilt. Ändern zwei Rechner gleichzeitig dasselbe Feld, wird Ihre Eingabe behalten und eine Warnung meldet es.

### Verbindung zu den Berichten

- Das Blatt listet „Berichte des Einsatzes (n)“, vom neuesten zum ältesten; jeder Link öffnet seinen Bericht.
- „Bericht erstellen“ öffnet einen vorausgefüllten Bericht der passenden Familie. Für eine bereits geflogene Mission übernimmt „Neuer Bericht (Flug n)“ die nächste Flugnummer (wiederkehrende Missionen).
- Im Bericht führt unter dem Missionsfeld der Link „Einsatz im Register ansehen ↗“ zum Blatt zurück, mit der geschätzten Dauer und der Abweichung des Flugs.
- Sobald ein Bericht die Mission nennt, wechselt der Status zu „Bericht erstellt“, außer die Mission ist aufgegeben.

### Mission bestellen

Gemeinsames Formular mit dem Generator und den Flugbefehlen.
1. Stellen Sie „Typ“, „Untertyp“, „Einsatzgebiet“ („Land“ für das Ausland), „Flugbesatzungen“, „Bodenteams“ und „Dauer“ (XS bis XL) ein.
2. Klappen Sie bei Bedarf „Weitere Optionen“ auf: „Zweites Einsatzgebiet“ („Land“ für das Ausland), „Serie“ (leer = die nächste), „Kennung“ (berechnet, nur lesbar), „Treffpunkt“, „Übersetzungen“, „Luftbetankung“, „Koordinierte Übung“ (ja: Leitungsmission …Z; nein: nie; frei: je nach Szenario) und das Luftfahrzeug jedes fliegenden Teams A, B… (leer = automatisch). Dieser Bereich ist auf der Stufe Experte geöffnet; auf den anderen Stufen öffnet er sich von selbst, wenn eine seiner Einstellungen vom Standard abweicht.
3. Klicken Sie auf „Bestellen: Prompt kopieren und ChatGPT öffnen“, fügen Sie in ChatGPT ein (Strg+V) und senden Sie ab.

Die Mission erscheint im Register mit dem Status „bestellt“. Speichern Sie dann die Dateien im Missionsordner und klicken Sie auf „Ordner neu lesen“: Die Bestellung wird der erzeugten Mission zugeordnet (gleiche Serie). Die Einstellungen werden gespeichert.

## ODV-Planung
<!-- page: apps/cpco/odv_planning.html -->

Die Seite ODV-Planung vereint die Verfügbarkeiten der Woche, die gemeinsamen Zeitfenster, die wahrscheinlichen Missionen und die Zuweisungen. Das Zentrum (CPCO) plant damit die Missionen und vergibt sie an freie Piloten.
Zum Öffnen: Link „Vollständige ODV-Seite: Arbeitsmappe, Raster, Export…“ im Block „Wahrscheinliche Missionen“ der Einsatztafel (Stufe Experte) oder Menü ☰ (Seiten des Zentrums); die Seite hat keinen Reiter und gehört zur Nutzungsstufe Planung (2). Die Seite gehört zum Zentrum: Solange das Zentrum gesperrt ist, verweist ein Hinweis auf Einstellungen › Zentrum (siehe nächstes Kapitel). Im Modus production ist außerdem eine Anmeldung mit der Rolle `admin_centre` nötig.
Die Excel-Arbeitsmappe der Staffel ist freiwillig: Ohne sie wird die Woche aus den von den Piloten in Meine Missionen angegebenen Verfügbarkeiten und den bereits gespeicherten Zuweisungen aufgebaut.
Jeder Block kann verschoben (Griff ↕) oder ausgeblendet („Ausblenden“ / „Anzeigen“) werden; die Anordnung wird für die Seite gespeichert.
Die Blöcke „Gemeinsame Zeitfenster“ und „Wahrscheinliche Missionen“ stehen auch in der Einsatztafel, auf der Stufe Experte, abgestimmt auf die dort angezeigte Woche (siehe nächstes Kapitel).

### ODV-Arbeitsmappe

Dieser Block lädt die Wochenarbeitsmappe der Staffel (`.xlsx`). Er ist **standardmäßig ausgeblendet**: Klicken Sie in seinem Kopf auf „Anzeigen“, um ihn einzublenden.
- Wählen Sie die Datei, oder legen Sie sie auf dem Dateifeld ab. Sie wird im Browser gelesen, nichts wird ins Netz gesendet.
- Beim Aufruf der Seite öffnet die Suite selbst die neueste `.xlsx`-Arbeitsmappe aus dem „Ordner der ODV-Arbeitsmappe“, wenn er erlaubt ist (Einstellungen › Installation › Quellen und Ordner). Andernfalls öffnet sie die in diesem Browser gespeicherte Kopie der zuletzt gewählten Arbeitsmappe.
- Von Hand gewählt, zeigt die Arbeitsmappe direkt ihre eigene Woche.
- Nach dem Lesen der Datei erscheint eine Zusammenfassung: „Datei“, „Woche“, „Diensthabender Offizier“, „Thema der Woche“, „Piloten“, „Blatt FLOTTE“, „Zeitleiste“, „Lesen“. Der „Lesebericht (n)“ listet die Warnungen (⚠) und die Bemerkungen. Er ist aufgeklappt, wenn er mindestens eine Warnung enthält.
- Auffälligkeiten (Code außerhalb der Legende, doppeltes Kürzel, verschobenes Datum der Zeitleiste…) werden als schwebende Benachrichtigungen gemeldet, ohne das Lesen je zu blockieren.
- Behalten Sie die Arbeitsmappe im Excel-Format: Von LibreOffice oder Google Sheets neu gespeichert, kann sie ihre Textfelder und damit ihre Kürzel verlieren (gemeldet).
- Hat ein Pilot der Arbeitsmappe noch keine Präferenzen für Missionsarten, legt die Suite sie anhand seiner Codes an (C → Jagd, T → Transport…) und schreibt sie in sein Benutzerdatenblatt.
- „Daten löschen“ leert die Seite. Die Schaltfläche bleibt ausgegraut, solange keine Arbeitsmappe geladen ist.
- Der Link „Einstellungen › Zentrum › ODV-Planung“ führt zu den Einstellungen der Zeitfenster und des Lesens der Arbeitsmappe.
- Personenbezogene Daten: Veröffentlichen Sie die Exporte nicht. Format der Arbeitsmappe und Leseregeln: [Leseregeln der Arbeitsmappe](../technique/ODV_ORDRES.md).

### Verfügbarkeitsraster

Das Raster kreuzt die Piloten mit den Tagen der Woche und den drei Zeitfenstern jedes Tages (M = Morgen, A = Nachmittag, S = Abend).
- **Wahl der Woche**: „◀ Vorherige Woche“, „Nächste Woche ▶“, „Diese Woche“, und „Woche der Arbeitsmappe“, wenn eine Arbeitsmappe einer anderen Woche geladen ist. Die angezeigte Quelle ist entweder „Arbeitsmappe …“ oder „Pilotenangaben und Zuweisungen (keine Arbeitsmappe für diese Woche)“.
- **Filter**, in diesem Browser gespeichert: „Leere Raster ausblenden“, „Farbe des Kürzels“ (Farbe der Form in der Arbeitsmappe, ohne Wirkung auf die Regeln), „Rolle (Blatt FLOTTE)“ oder ohne Arbeitsmappe „Rolle (angegebene Luftfahrzeuge)“, „Simulator“.
- **Legende**: Codes der Arbeitsmappe mit ihrer Anzahl Felder, dann der Block „Pilotenangaben“, identisch mit dem von Meine Missionen.
- **Lesen eines Felds**: Der Code der Arbeitsmappe steht zuerst, dann die Angabe des Piloten. Ein roter Rahmen kennzeichnet einen verfügbaren, nicht zugewiesenen Piloten. Eine Missionsnummer kennzeichnet einen zugewiesenen Piloten.
- **Tooltips**: Der Kommentar des Felds erscheint beim Überfahren, ohne den Namen seines Verfassers; Rollen, Simulatoren und die Zeile der Arbeitsmappe erscheinen beim Überfahren des Kürzels.
- Die Spalte „Verf.“ zählt die verfügbaren Zeitfenster des Piloten, klein dahinter die Anzahl der Fluglotsen-Zeitfenster (+n).
- **Klick auf eine Angabe**: öffnet das Fenster „Freie Piloten zuweisen“ des Zeitfensters, mit diesem Piloten hervorgehoben (siehe „Gemeinsame Zeitfenster“).

#### Diese Woche zugewiesene Missionen

Unter dem Raster listet die Tabelle „Diese Woche zugewiesene Missionen (n)“ die Zuweisungen der angezeigten Woche.

| Spalte | Inhalt |
|---|---|
| Start | Datum und Uhrzeit Z |
| Zeitfenster | drei Felder M / A / S, das des Zeitfensters hervorgehoben |
| Mission, Pilot, Rufzeichen, Luftfahrzeug, Flugplatz | Mission (Nummer und Titel), Pilot („zuzuweisen“, wenn niemand), Rufzeichen, Muster und Kennzeichen, Abflugplatz |
| Rolle | „Mission“, „Mission (Überführung ab …Z)“ oder „Überführung für …“ |

Klicken Sie auf eine Zeile, um die vollständige Zuweisung wieder zu öffnen und zu ändern. Dazu muss das Zentrum aktiviert sein und die Mission im Register dieses Browsers stehen. Andernfalls öffnet sich das Fenster des Zeitfensters oder eine Warnung erscheint. Ohne Zuweisung erscheint die Meldung „Diese Woche keine Mission zugewiesen.“.

#### Stundenplanung

Diese Planung zeigt einen Tag der Woche im Detail.
- Die Reiter am Kopf zeigen nur die Tage mit Missionen, mit deren Anzahl in Klammern. Standardmäßig öffnet die Planung auf heute, sonst auf den nächsten Tag mit Missionen.
- Jede Zeile entspricht einem Piloten; eine Zeile „zuzuweisen“ fasst die Positionen ohne Piloten zusammen.
- Jede Mission bildet einen farbigen Block mit dem Rufzeichen. Eine Überführung ist mit „⇢“ markiert.
- Im Hintergrund sind die drei Zeitfenster eingezeichnet; ein Strich markiert die aktuelle Uhrzeit.
- Klicken Sie auf einen Block (oder drücken Sie die Eingabetaste), um die Zuweisung zu ändern.
- Weiter unten klappt „Zuweisungsprotokoll (n)“ auf und zeigt die letzten 30 Vorgänge.

### ATC-Sitzungen der Netzwerke

Dieser Block sammelt die Trainings, Prüfungen, Events und Buchungen von VATSIM / IVAO der angezeigten Woche. Sie werden im gemeinsamen Datenpool gespeichert (`data/atc/<année>-W<semaine>.json`).
- **Sitzung erfassen**: Geben Sie Tag, Beginn und Ende (UTC-Zeiten, in 15-Minuten-Schritten), Position (z. B. `LFBO_APP`, `LFMN_TWR`), Netzwerk (VATSIM oder IVAO), Art (Training, Prüfung, Event, Buchung) und einen optionalen Kommentar ein. Klicken Sie dann auf „Hinzufügen“.
- Beide Zeiten müssen auf denselben Tag fallen: Das Ende muss nach dem Beginn liegen.
- „VATSIM abrufen (bevorzugtes Land)“ importiert die VATSIM-Buchungen der Woche. Bereits abgerufene Sitzungen werden ersetzt (einschließlich Stornierungen); manuelle Eingaben bleiben erhalten. Nur Positionen des bevorzugten Landes werden importiert (Einstellungen › Zentrum › ODV-Planung; standardmäßig Frankreich, Mutterland); die Schaltfläche trägt seinen Namen.
- „IVAO abrufen (bevorzugtes Land)“ importiert ebenso die IVAO-Trainings, -Prüfungen und -Buchungen der Woche, mit dem IVAO-API-Schlüssel der Installation (Einstellungen › Installation). Diese beiden Schaltflächen sind der mit der Einsatztafel gemeinsame Import: eine Datei, dieselben Sitzungen auf beiden Seiten.
- Die Schaltfläche „×“ einer Zeile entfernt die Sitzung. Die Spalte „Quelle“ zeigt „abgerufen“ oder „eingegeben“. Die Tabelle zeigt zuerst Trainings, Prüfungen und Veranstaltungen (Prüfung und Training am Rand markiert); einfache Positionsbuchungen, nach dem Import zahlreich, sind unter „n Positionsbuchung(en)“ eingeklappt.
- **Wirkung auf die Planung**: Eine Sitzung wird in ihrem Zeitfenster gezählt (★). Ein Training oder eine Prüfung macht die CTR des Flugplatzes für die Missionen dieses Zeitfensters unverfügbar; die TMA, die den Flugplatz enthalten, sind möglichst zu meiden.
- Ein „TRAINING“ oder „EXAMEN“, gefolgt von einer Position („EXAMEN LFMN_TWR“), in einer DIVERS-Spur der Zeitleiste der Arbeitsmappe oder im Kommentar eines Lotsen notiert, zählt genauso.

### Gebietsaktivierungen nach Netzwerk

Dieser Block ist der der Einsatztafel (siehe „Gebiete“): RTBA-, R-, D-, TRA-Aktivierungen… der angezeigten Woche, VATSIM und IVAO nebeneinander, dieselben Daten. Bearbeitung wie bei der Einsatztafel beschränkt (Centre aktiviert; im Produktivbetrieb Administrator).

### Gemeinsame Zeitfenster

Diese Tabelle umfasst 7 Tage × 3 Zeitfenster. Jedes Feld nennt die Zahl der **freien Piloten**, also verfügbar und noch nicht zugewiesen.
- Die Markierungen des Felds: „+n ctrl“ (Fluglotsen), „✎“ (Mission bereits zugewiesen), „★“ (Event oder ATC-Sitzung). Der Tooltip nennt auch die Besetzung vor den Zuweisungen.
- Filter: „Mindestens N Pilot(en)“, von 1 bis 20 (standardmäßig 2), und „Gemeinsamer Simulator“ („beliebig“ oder ein Simulator). Sie werden mit den ODV-Einstellungen gespeichert. Ein Feld unter dem Schwellenwert wird abgeschwächt.
- Berücksichtigte Piloten: Codes O, SC, C, T, N, S; Fluglotsen: AT, AM. Ein leeres Feld wird nicht gezählt.
- **Klick auf ein Feld**: öffnet das Fenster „… — freie Piloten zuweisen“. Es erlaubt, die im Zeitfenster bereits zugewiesenen Missionen zu ändern oder weitere zu planen.

#### Fenster „Freie Piloten zuweisen“

Voraussetzungen zum Öffnen: Zentrum aktiviert und Missionsregister in diesem Browser vorhanden (andernfalls öffnen Sie das Register des Zentrums und lesen den Missionsordner neu).
1. **Der Tag in drei Blöcken** (Morgen, Nachmittag, Abend) belegt den oberen Teil des Fensters. Jeder Block nennt seine Uhrzeiten, die Zahl der freien Piloten und der Missionen, und „laufend“ für das aktuelle Zeitfenster. Das Zeitfenster des Fensters ist hervorgehoben. Ein Klick auf einen anderen Block öffnet dieses Zeitfenster; bleiben ungespeicherte Auswahlen, wird eine Bestätigung verlangt. Das Fenster bleibt geöffnet und wechselt zu diesem Zeitfenster.
2. Die freien Piloten werden mit den von ihnen angegebenen Luftfahrzeugtypen aufgelistet (fett: beherrscht). Wählen Sie eine „Familie“ („alle“; „(vorgeschlagen)“ kennzeichnet die für das Zeitfenster vorgeschlagene Familie). Die Zeile „Zu meiden:“ erinnert an die durch eine ATC-Sitzung geschlossenen CTR und TMA.
3. Haken Sie in der Matrix eine Mission an (Spalte „Planen“). Wählen Sie dann das „Luftfahrzeug“: Die Liste reicht vom nächstgelegenen bis zum entferntesten vom Abflugort und zeigt „vor Ort“ oder die Überführungsdauer. Wählen Sie schließlich den „Pilot“: Zuerst kommen die Piloten „Bis zum Ende frei, mit dem Luftfahrzeug“.
4. Ist das Luftfahrzeug anderswo stationiert, erscheint eine Zeile „Überführung“. Wählen Sie, wer überführt („durch“): ein freier Pilot, der Pilot selbst (die Mission verschiebt sich dann entsprechend) oder „zuzuweisen (Überführungsmission)“.
5. Stellen Sie bei Bedarf die Uhrzeit für „Start“ ein (oder die „Stunde H“ einer Operation mit mehreren Missionen). „+ Flügelmann“ fügt einer Rotte eine Position mit dem nächsten Rufzeichen hinzu. „✎ Details“ öffnet den vollständigen Zuweisungsdialog; sein Ergebnis kehrt in die Matrix zurück.
6. Prüfen Sie die Spalte „Status“: doppelter Pilot, doppeltes oder bereits eingesetztes Luftfahrzeug, Pilot nicht über den ganzen Zeitraum frei.
   Unter jeder Mission meldet eine rote Marke eine Route durch eine zu meidende CTR, eine orange Marke eine TMA (SIA-Datenbank des Browsers).
7. Klicken Sie auf „Speichern (n)“. „Änderungen verwerfen“ kehrt zum Zustand beim Öffnen zurück; „Schließen“ verlangt eine Bestätigung, wenn noch Auswahlen ausstehen.

Unter der Matrix:
- „Zuzuweisende Überführungen (n)“ erlaubt, eine offen gebliebene Überführung zu vergeben: Wählen Sie den Überführungspiloten, dann „Übertragen“.
- „Ausstehend (n)“ listet die noch nicht gespeicherten Auswahlen.
- „In diesem Zeitfenster gespeichert“ bietet „Ändern…“ für jede Mission.

Grenzen:
- Das Fenster schließt sich selbst, wenn alle freien Piloten zugewiesen sind.
- Bereits zugewiesene Missionen (diese Woche oder früher) werden ausgeblendet.
- Ein Pilot erhält nur eine Mission pro Zeitfenster.
- Zum Speichern muss der Missionsordner erlaubt sein (Einstellungen › Installation › Quellen und Ordner).
Ausführliche Regeln: [Zuweisung der Missionen](../technique/AFFECTATION_MISSIONS.md).

### Wahrscheinliche Missionen

Dieser Block schlägt für jedes Zeitfenster, das den Schwellenwert „Mindestens N Pilot(en)“ erreicht, die besten Missionsfamilien vor, die die freien Piloten spielen können.

| Spalte | Inhalt |
|---|---|
| Zeitfenster | Tag, Datum, M / A / S; Rang des Vorschlags hochgestellt |
| Familie | SAR, FIRE, HEMS, MARITIME, AAR, ISR, SPECIAL, AIRBORNE, AIRLIFT, TRAINING |
| Vorgeschlagene Zuweisung, + | Piloten und ausgeübte Rolle; mögliche Verstärkungen |
| Gemeinsame Simulatoren, Punktzahl, Regel | geteilte Simulatoren; Punktzahl (ausführliche Berechnung beim Überfahren); Regel der Familie |
| Planen (Missionen des Registers) | „Planen“ oder „Ändern“: öffnet das Fenster des Zeitfensters, gefiltert auf die Familie |

- Klicken Sie auf eine Zeile (außerhalb der Schaltfläche), um ihre Zusammenfassung aufzuklappen: Zeitfenster, vorgeschlagene Besatzung, Verstärkungen, Regel, Punktzahl, Kontext (ATC-Sitzungen, Fluglotsen, Events), Simulatoren, bereits zugewiesene Missionen. Das Dreieck ▸ bewirkt dasselbe; es ist immer nur eine Zeile aufgeklappt.
- „Regeln der Familien und der Punktzahl“ klappt unter der Tabelle auf. Punktzahl = Anzahl der Teilnehmer, + 2 pro Pilot mit eingeschränktem Code, der in seinem Bereich eingesetzt wird, + 1 pro Fluglotse online bei TRAINING (höchstens 2). Eine oft gespielte Familie fällt etwas zurück (je nach Anzahl der Berichte im Register), damit die Missionen abwechseln.
- Die Anzahl der pro Zeitfenster gezeigten Missionen und die Vorzugsreihenfolge bei gleicher Punktzahl werden unter Einstellungen › Zentrum › ODV-Planung eingestellt.
- Die Tabelle ist nach Spalte sortierbar. Die aus dem Blatt FLOTTE übernommenen Rollen bleiben Richtwerte: Der Planer entscheidet.

### Export

Dieser Block speichert Dateien auf diesem Computer. Sie enthalten personenbezogene Daten: Veröffentlichen Sie sie nicht. Die Schaltflächen bleiben ausgegraut, solange keine Arbeitsmappe geladen ist.

| Schaltfläche | Ergebnis |
|---|---|
| „Raster (CSV)“ | `<classeur>_grille.csv`: eine Zeile pro Pilot, Tag und Zeitfenster |
| „Alle Daten (JSON)“ | `<classeur>_planning.json`: Einstellungen, Piloten, Raster, Events, Flüge, Zeitfenster, Missionen, Auffälligkeiten |
| „Textzusammenfassung“ | füllt das Textfeld: DISPO MATIN / APREM / SOIR pro Tag |
| „Kopieren“ | kopiert diesen Text in die Zwischenablage (zum Beispiel für Discord); aktiv, sobald die Zusammenfassung erstellt ist |
| „Zusammenfassung (.txt)“ | `<classeur>_dispo.txt` |

Verweigert der Browser das automatische Kopieren, wird der Text markiert: Kopieren Sie ihn mit Strg+C.

## Einsatztafel
<!-- page: apps/cpco/odv_orders.html -->

Die Seite Einsatztafel erstellt den Flugbefehl der Woche: Flugstreifen, Lotsendienst, Sonstiges und Notizen auf einer Zeitleiste, mit Verfügbarkeits- und Gebietskonflikten.
Zum Öffnen: Seitenleiste › „Planung“ (Reiter „Einsatztafel“). Anders als das übrige Zentrum ist sie ohne es einsehbar: auf Nutzungsstufe 1 oder ohne aktiviertes Zentrum (oder im Produktionsmodus ohne Anmeldung mit der Rolle `admin_centre`) öffnet sie sich schreibgeschützt: nur der Block „Tagesbefehl“, mit der Zeitleiste des Tages und ihren Zeilen Flüge, Lotsendienst, Sonstiges und Notizen — ohne Palette, Gebiete, ATC, gemeinsame Verfügbarkeit, Probleme, Protokoll, ohne Ziehen und Ablegen oder Missionsbefehl; ohne Zentrum erinnert ein schwebender Hinweis daran. Änderungen erfordern das aktivierte Zentrum und, im Produktionsmodus oder sobald ein Benutzer angemeldet ist, die Rolle `admin_centre` (ein Konto `utilisateur` bleibt auch bei geöffnetem Zentrum schreibgeschützt; ebenso in der ODV-Planung: ATC-Sitzungen, Aktivierungen, Zuweisungen).

Die Seite hat sechs Blöcke, ohne Wahl der Ansicht. Was jeder zeigt, hängt von der Nutzungsstufe ab (Mein Profil › „Nutzungsstufe“):

| Block | Inhalt | Stufe |
|---|---|---|
| „Tagesbefehl“ | Wochenleiste, dann die Zeitleiste des Tages (einziger Block im schreibgeschützten Modus) | 1 |
| „Besatzung der Woche“ | Verfügbarkeiten der Mitglieder Tag für Tag, DLO und Fristen, Verfügbarkeitsänderungen | 2 |
| „Gebiete“ | Gebietsaktivierungen nach Netzwerk, dann Reservierungsanträge | 2 |
| „Gemeinsame Zeitfenster“ | Zeitfenster, in denen mehrere Piloten verfügbar sind; ein Klick öffnet das Fenster des Zeitfensters | 4 (Experte) |
| „Wahrscheinliche Missionen“ | passende Missionsfamilien je Zeitfenster, Link zur ODV-Seite | 4 (Experte) |
| „Statistik“ | Flüge der Woche und Auslastung der Mitglieder | 2 |

- **Nicht verfügbare Piloten ausblenden** (Kästchen der Palette und des Blocks „Besatzung der Woche“, von der ODV-Seite übernommen): nur Mitglieder, die ein an diesem Tag angegebener Zeitraum für einen Flug zuweisbar macht, bleiben (gleiche Regel wie die Konflikte: Boden, Ausgleich, Lotsendienst außerhalb SOG oder nur Lotsendienst zählen nicht) (Woche: mindestens ein Tag); in diesem Browser gespeichert.
Alles wird im gemeinsamen Datenpool gespeichert: der Befehl der Woche in `data/odv/<Jahr>-W<Woche>.json`, die Einstellungen in `data/config/odv.json`. Die Verfügbarkeiten bleiben die der Piloten, die Besatzung eines Missionsflugs die der Zuweisungen.
Die Zeiten sind in z (UTC). Datenmodell: [Einsatztafel](../technique/ODV_ORDRES.md).

### Tagesbefehl: Wochenleiste

- „◀“ und „▶“ wechseln die Woche, „Diese Woche“ kehrt zur laufenden Woche zurück.
- Die Tagesreiter zeigen in Rot die Zahl der Elemente im Konflikt an diesem Tag.
- „Dienst“ bestimmt den Diensthabenden der Woche.
- „↶ Rückgängig“ (oder Strg+Z): nimmt die letzten zehn Änderungen des Flugbefehls zurück (Streifen verschoben, Element gesetzt oder geändert…), Neuausgaben und Speichern inbegriffen; beim Wochenwechsel geleert.
- „Briefing“ (oder die Taste F) zeigt den Tagesbefehl im Vollbild; die Pfeile ← und → wechseln den Tag.
- Die Statuszeile zeigt „Gespeichert“ oder „In diesem Browser gespeichert“, wenn der Datenordner nicht freigegeben ist.

### Tagesbefehl

Links die Palette: Vorlagen für Flüge, Lotsendienst und Sonstiges, die Notiz, dann die Mitglieder (Stab, dann Mitglieder) mit dem Balken ihrer Verfügbarkeit an diesem Tag. Rechts die Zeitleiste:
- gepunktete Linien: Zeitfenster Morgen, Nachmittag und Abend der ODV-Planung; rote Linie: aktuelle Uhrzeit; dunkle Bereiche: Luftfahrtnacht am eingestellten Flugplatz;
- „RTBA · LL“: Aktivitätszeitfenster des RTBA (eingegebene oder importierte Aktivierungen, sonst die Zeitfenster der Einstellungen);
- „Gebiete“: von jedem Flug benötigte Gebiete (die seiner Mission oder die für einen Übungsflug eingegebenen), grün wenn im Netzwerk des Flugs aktiv, orange wenn beantragt, sonst rot;
- „ATC“: ATC-Sitzungen des Tages im Bereich (Land aus Einstellungen › Zentrum › ODV-Planung, beim Überfahren der Beschriftung): Trainings und Prüfungen violett, Veranstaltungen blau, Buchungen blass; eine Sitzung wird rot umrandet, wenn sie einen Missionsflug behindert (sein Abflug- oder Zielflugplatz während des Flugs);
- „Gemeinsam verfügbar“: Zeiträume, in denen mindestens zwei Mitglieder für einen Flug einsetzbar sind;
- Abschnitte „Flüge“, „Lotsendienst“, „Sonstiges“, „Notizen“: die Elemente stapeln sich von selbst.

Bedienung:
- eine Vorlage auf ihren Abschnitt ziehen: das Element wird zur Ablagezeit (in 5-Minuten-Schritten) angelegt und sein Fenster öffnet sich;
- eine Karte der Palette doppelt anklicken, um sie automatisch zu setzen: zum Synchronzeitpunkt bei einer weiteren Besatzung einer Mission mit mehreren Besatzungen (Versatz der Übung der Operation gegenüber H, sonst Zeit der bereits gesetzten verbundenen Rotte; Tanker: 30 min vor der Betankung oder vor der Rotte, die er versorgt), sonst ins erste stimmige Zeitfenster des Tages (Dienstzeiten, nicht vor der aktuellen Uhrzeit, Besatzung einsetzbar und frei, oder genug gemeinsam verfügbare Mitglieder);
- ein Mitglied aus der Palette auf einen Streifen ziehen, um es hinzuzufügen, oder ein Trigramm von einem Streifen auf einen anderen, um es zu verschieben;
- einen Streifen ziehen, um seine Uhrzeit zu ändern, seinen rechten Rand, um seine Dauer zu ändern; ein einfacher Klick öffnet sein Fenster;
- in der Palette behält „Flugvorrat“ die von der Zeitleiste genommenen Streifen (auf die Palette gezogen oder „↩ Vorrat“ in ihrem Fenster), und „Formationen der Missionen“ bietet an, was die gesetzten Missionsflüge verlangen: Rotten der anderen Missionen der Formation, Tanker, die sie versorgen, Chiffons der Operation;
- „Zoom“ stellt den Maßstab der Zeitleiste ein.

Auf einem Streifen: „⚠ n“ zählt seine Konflikte, „P“ zeigt an, dass in den 90 Minuten vor dem Flug kein Besatzungsmitglied verfügbar ist, „↻“ eine Wiederholung; ein grüner (erledigt) oder oranger (nicht erledigt) Balken unterstreicht den Status; ein abgesagter Streifen ist durchgestrichen. Unter der Zeitleiste listet „Einteilungsprobleme“ die Konflikte des Tages: ein Klick zeigt den Streifen.

### Fenster eines Elements

- **Flug**: Bezeichnung, Rufzeichen, Mission des Registers (leer: Übung), Netzwerk, Beginn, Dauer, Farbe, Gebiete eines Übungsflugs, Strecke und Abgabe eines Tankerflugs, Tanker und Betankungszeit, Luftfahrzeuge (Pilot, Navigator, abgesagt; höchstens acht), Aufgaben (eine pro Zeile, „Name = TRI“), Infos, Status, Grund, Bericht (ME, Bâché, MNE), teilweise, MNE-Ursachen.
- Ein eingegebenes Rufzeichen schlägt die Mission der Zuweisung vor, die dieses Rufzeichen an diesem Tag trägt.
- „Mission des Registers und Team“: eine Zeile je fliegendem Team jeder Mission (Rufzeichen, Luftfahrzeug, Rolle, Familie, Flugplätze, Operation, geschätzte Dauer), nach Dauer sortiert; „⚠“ und eine Benachrichtigung melden eine geschätzte Dauer, die von der gewünschten abweicht (mehr als 15 min oder 15 %). „Übung (ohne Mission)“ lässt den Streifen ohne Mission.
- „Betankung“: eine Tankermission (die der gleichen Operation oder der gleichen Strecke zuerst), deren Streifen an diesem Tag gesetzt wird, falls noch nicht vorhanden, oder ein bereits gesetzter Tankerflug; die Betankungszeit wird daneben eingestellt.
- **PTA** (principal training audience): Mitglieder, die das Element vorrangig trainiert, in der Luftfahrzeugtabelle (Flug) oder in der PTA-Liste (Lotsendienst, Sonstiges) angekreuzt; sie sind auf dem Streifen eingekreist. **Konfiguration**: auf dem Luftfahrzeug geladene Konfigurationen (KNON = Kanone, TALIOS = Pod…), aus den Einstellungen vorgeschlagen. **DLO** (desired learning objectives): Ziele jedes Mitglieds für das Element, eine Zeile pro Mitglied „TRI = Ziele“; „◎“ am Trigramm, Ziele beim Überfahren.
- **Luftfahrzeuge**: zu Beginn zwei Plätze („+ Flügelmann“ fügt weitere hinzu, höchstens acht); für jeden das Luftfahrzeug (Typ der Mission vorgeschlagen ★, nicht vorgeschrieben, oder ein Luftfahrzeug der Flotte), der Pilot und der Navigator. Vorgeschlagen wird das Rufzeichen der Mission, sonst die der Rufzeichentabelle für diesen Typ; es folgt der Mission, wenn sie es ändert. **Betankung**: Strecke wählen, dann eine Tankermission dieser Strecke; ist ihr Streifen nicht gesetzt, kommt er in die Palette, und der Flug hängt sich beim Setzen an ihn. Der Streifen zeigt die Mission (Titel, Familie, Flugplatz), die von einem Tanker gehaltene Strecke und für einen Empfänger „⛽ Tanker Strecke Zeit“.
- **Posten und Luftfahrzeuge** (wie in der ODV-Planung): für einen Missionsflug eine Zeile je Posten der Mission (Rufzeichen, Typ); der nächste Flügelmann erhält das nächste Rufzeichen. Die Luftfahrzeugliste bietet die passenden Luftfahrzeuge an, vor Ort zuerst, dann vom nächsten zum entferntesten („Überführung x h xx“); bereits während des Flugs belegte sind ausgegraut. Ein auf einem anderen Flugplatz als dem Abflug stationiertes Luftfahrzeug lässt einen Überführungsstreifen „⇢“ erscheinen (Luftfahrzeug, Flugplätze, „zuzuweisen“), Ankunft 30 min vor dem Start, folgt dem Flug: den Überführungspiloten darauf ziehen. **Bereitschaft**: Vorlauf und Ende, in den Missionsbefehl übernommen. Der Strich unter einem Trigramm zeigt seine Qualifikation auf dem Typ (grün: beherrscht; orange: besessen oder bekannt; rot: nein); nur ein Hinweis.
- **Wahl einer Mission**: die Liste beschränkt sich auf das eingegebene Rufzeichen oder die Bezeichnung („SAMU“ → SAMU-Missionen); nach der Wahl öffnet sich das Auswahlfenster der ODV, und seine Zeilen (Posten, Luftfahrzeuge, Piloten, Rufzeichen, Überführungspilot) füllen den Streifen; verfügbare und auf dem Typ qualifizierte Piloten werden zuerst angeboten. Der Streifen übernimmt die Startzeit der Zuweisung (Warnung bei Abweichung); „Missionsbefehl der Operation (n)…“ verkettet die Missionsbefehle der an diesem Tag gesetzten Streifen der Operation; ein aus dem Vorrat oder den Formationen zurückgenommener Streifen wird an seinen Synchronzeitpunkt gesetzt. **Betankung**: die gewählte Strecke beschränkt die Liste auf ihre Tanker; „Keine bestimmte Mission“ legt einen allgemeinen Tanker auf der Strecke in den Vorrat. Eine von Hand verschobene Überführung behält ihren Platz (sie folgt dem Flug um denselben Abstand, wenn er sich verschiebt), von Hand verlängert oder verkürzt behält sie ihre Dauer, solange die Strecke gleich bleibt; sie wird nur entfernt, wenn der Flug sie nicht mehr braucht (Flug gelöscht, Luftfahrzeug geändert oder schon am Abflugplatz) — Mission vorübergehend nicht im Register oder Flugplatz ohne Koordinaten: der Streifen bleibt, wie er ist, Überführungspilot inklusive; kommt sie weniger als 30 min vor dem Start an, wird sie gemeldet. Eine Verfügbarkeit, deren Kategorie die Missionsfamilie nicht öffnet, und eine ATC-Prüfung oder ein -Training am Abflug- oder Zielflugplatz während des Flugs werden gemeldet. Unter der Zeitleiste zeigt „Zuweisungsprotokoll“ die letzten 30 Vorgänge.
- **Zuweisungen und Missionsbefehle**: eine anderswo (ODV-Planung, Register) zugewiesene Mission erscheint automatisch als Streifen auf der Zeitleiste, zu ihrem Start, mit Luftfahrzeugen, Piloten, Bereitschaft und Überführung. Umgekehrt wird ein Missionsflug mit Besatzung, aber ohne Zuweisung als „Missionsbefehl nicht erteilt“ gemeldet (der Pilot sieht nichts in Meine Missionen), und eine von den Zuweisungen abweichende Besatzung als „Missionsbefehl neu erteilen“. Wird der Streifen eines Flugs mit Missionsbefehl verschoben (Tag, Uhrzeit, Dauer), wird dieser automatisch ohne Fenster neu erteilt: dieselben Piloten, Luftfahrzeuge, Rufzeichen und Überführungspiloten zur neuen Zeit; ein bereits geöffneter Umschlag wird neu versiegelt, damit der Pilot die Änderung sieht. Bei einem Zuweisungskonflikt (Pilot, Überführungspilot oder Luftfahrzeug anderweitig belegt) oder wenn der Missionsordner nicht freigegeben ist, wird der Befehl nicht neu erteilt: der Streifen meldet es („Missionsbefehl nicht neu erteilt“, mit Grund) und behält seine neue Zeit; „Missionsbefehl…“ bleibt der Weg, Piloten oder Luftfahrzeuge zu ändern.
- **Überführungsbefehl**: „Überführungsbefehl…“ auf einem Überführungsstreifen öffnet den Missionsbefehl des versorgten Flugs mit Überführung (Zeit und Dauer des Streifens, auch von Hand verschoben); ein anderer Überführungspilot als der Missionspilot oder eine zuzuweisende Überführung erhält seinen Überführungsbefehl in Meine Missionen; vom Missionspiloten geflogen, ist die Überführung eine Zeile seines Missionsbefehls.
- Missionsflug: die Besatzung kommt aus den Zuweisungen der Mission; „Missionsbefehl…“ öffnet das Zuweisungsfenster des Zentrums, vorausgefüllt mit den Luftfahrzeugen des Streifens (Pilot, Kennzeichen, Rufzeichen der Rotte): die gespeicherten Zuweisungen sind der Missionsbefehl, den die Piloten in Meine Missionen erhalten (Kennzeichen „OM“ auf dem Streifen). „Mission bestellen…“ öffnet das Bestellformular des Generators, nach dem Streifen voreingestellt (Teams, Luftfahrzeugtypen, Dauer, Betankung). Der Missionsbericht ist maßgeblich: beim Öffnen der Woche werden Status und Bericht daraus übernommen; ohne Bericht nach der eingestellten Frist wird der Flug MNE (Ursache „kein Bericht“).
- **Lotsendienst**, **Sonstiges**: Bezeichnung, Position (Lotsendienst), Beginn, Dauer, Farbe, Status, Grund, Besatzung (Kästchen der Mitglieder), Notizen (Sonstiges).
- **Notiz**: freier Text.
- „Wiederholen“ (täglich, wöchentlich, alle zwei Wochen) und „Bis“ setzen das Element beim ersten Öffnen der folgenden Wochen ein, nie vor seinem Datum.
- „Löschen“ entfernt das Element.

### Konflikte

| Konflikt | Bedeutung |
|---|---|
| Woche nicht angegeben | das Mitglied hat seine Verfügbarkeiten der Woche nicht angegeben |
| nicht für die ganze Dauer verfügbar | kein Zeitraum deckt das ganze Element ab |
| nicht einsetzbar (Kategorie) | ein Zeitraum einer Kategorie, die diese Art Element nicht öffnet, überschneidet das Element |
| zu dieser Zeit schon eingeteilt | das Mitglied ist zur selben Zeit auf einem anderen Element |
| zweimal im Element | dasselbe Mitglied belegt zwei Plätze |
| Gebiet nicht aktiviert, beantragt, verboten | benötigtes Gebiet ohne „aktive“ Aktivierung seines Netzwerks über den ganzen Flug, oder P-Gebiet |

Ein Flug verlangt eine verfügbare Kategorie; ein Lotsendienst eine verfügbare Kategorie oder „SOG-Lotsendienst“; Sonstiges akzeptiert auch „Nur am Boden verfügbar“. Lotsendienst und Flug außerhalb SOG, DCS, nicht verfügbar und Ausgleich sind nie einsetzbar.

### Besatzung der Woche

Block der Stufe 2: eine Zeile pro Mitglied, eine Zelle pro Tag mit dem Balken der angegebenen Verfügbarkeiten und der Zahl der Elemente, auf denen es steht. Ein Klick auf eine Zelle öffnet seine Zeiträume des Tages: Kategorie, Beginn, Ende und „Ausgleich ab“, der einen Ausgleich bis Mitternacht setzt. Die Zeiträume werden in die Angabe des Piloten geschrieben.
- **DLO und Fristen** (Tabelle über ihr Dreieck ein- oder ausgeklappt, Zustand in diesem Browser gespeichert): dauerhafte Ziele jedes Mitglieds („＋“ zum Hinzufügen, Klick zum Ändern), mit optionaler Frist (rot bei höchstens 3 Arbeitstagen, gelb bei höchstens 10); eine DLO wird durch einen erledigten Flug, der sie enthält (DLO des Elements, Bezeichnung, Mission), mit dem Mitglied in der Besatzung automatisch geschlossen. Die Palette zeigt „◎n“ offene DLO je Mitglied, und das Fenster eines Elements erinnert an die der Besatzung.
- „Verfügbarkeitsänderungen“ listet die seit ihrer letzten Berücksichtigung geänderten Angaben; „Berücksichtigt“ und „Alle berücksichtigen“ markieren sie in diesem Browser.

### Gebiete

Block der Stufe 2, in zwei Teilen: Gebietsaktivierungen nach Netzwerk, dann Reservierungsanträge.

**Gebietsaktivierungen nach Netzwerk**: Der erste Teil erfasst die Gebietsaktivierungen der Woche (`data/atc/activations/<Jahr>-W<Woche>.json`) in zwei Spalten nebeneinander, VATSIM und IVAO: Tag, Gebiet, Status (aktiv, beantragt, abgelehnt), Beginn, Ende, Bemerkung, Netzwerk. Eine Aktivierung „beide Netze“ erscheint in beiden Spalten; ein Wechsel des Netzwerks verschiebt sie. VATSIM veröffentlicht keine Aktivierungen: Seine Spalte wird von Hand erfasst. In der IVAO-Spalte übernimmt „Von IVAO importieren“ die von IVAO veröffentlichten Zeiten (API-Schlüssel der Installation), unter der Liste eingeklappt, sowie die IVAO-Trainings, -Prüfungen und -Buchungen der Woche (ATC-Sitzungen); manuelle Eingaben bleiben. IVAO-Sitzungen werden beim Öffnen einer Woche auch automatisch importiert, höchstens einmal pro Stunde, wenn die Seite schreiben darf. Eine Änderung berechnet die Gebiete der Flüge sofort neu. Die ODV-Planung zeigt denselben Block mit denselben Daten.

**Reservierungsanträge**: Der zweite Teil listet die von den Missionsflügen der Woche durchflogenen Gebiete (geplante Route und Arbeitsgebiete der Mission, für einen Übungsflug eingegebene Gebiete) ohne „aktive“ Aktivierung ihres Netzwerks: Tag, Gebiet, Netzwerk, Zeitfenster, Flüge, Status. „Als beantragt eintragen“ (oder „Alle als beantragt eintragen“) fügt sie den gemeinsamen Aktivierungen hinzu; der Antrag selbst wird auf der Seite des Netzwerks gestellt („Liste kopieren“, Link zu den IVAO-Aktivierungsanträgen). Ein P-Gebiet wird als „meiden“ gemeldet. Beim Öffnen einer Woche importiert die Seite die IVAO-ATC-Sitzungen (Trainings, Prüfungen, Buchungen) automatisch, höchstens einmal pro Stunde, mit dem gemeinsamen Import der ODV-Planung. „Antrag zurückziehen“: Ein irrtümlich als beantragt eingetragenes Gebiet wird wieder „fehlend“.

### Gemeinsame Zeitfenster

Block der Stufe Experte, von der ODV-Seite übernommen und auf die von der Einsatztafel angezeigte Woche abgestimmt: die 7 Tage × 3 Zeitfenster, mit der Zahl der freien Piloten je Feld und den Filtern „Mindestens N Pilot(en)“ und „Gemeinsamer Simulator“. Ein Klick auf ein Feld öffnet das Fenster des Zeitfensters (Matrix Missionen × Posten). Einzelheiten: Kapitel ODV-Planung, „Gemeinsame Zeitfenster“ und „Fenster ‚Freie Piloten zuweisen‘“.

### Wahrscheinliche Missionen

Block der Stufe Experte, ebenfalls auf die Woche der Einsatztafel abgestimmt: passende Missionsfamilien je Zeitfenster, mit der Tabelle und den Regeln der ODV-Seite (siehe ODV-Planung, „Wahrscheinliche Missionen“). Unten öffnet der Link „Vollständige ODV-Seite: Arbeitsmappe, Raster, Export…“ die ODV-Seite, die keinen Reiter hat.

### Statistik

Block der Stufe 2: geplante Flüge, Gesamtdauer, erledigt, nicht erledigt, abgesagt, AAR, ME, Bâchés, MNE; je Mitglied: verfügbare Zeit in den Dienstzeiten, Flugzeit, Auslastung (orange über 70 %, rot über 100 % oder ohne Verfügbarkeit).
