# Administratorhandbuch

Dieses Handbuch beschreibt die Suite SO Group Virtual (Virtual Special Operation Group) für das **Zentrum** (Planung und Führung der Operationen) und für die
**Administratoren** der Suite: ein Kapitel pro Seite, ein Abschnitt pro Reiter, Rubrik oder Block, danach die
Synchronisierung der Daten und der Starter. In der Suite öffnet der Eintrag **„Hilfe“** der Seitenleiste dieses Handbuch
beim Kapitel der aktuellen Seite (Seiten des Zentrums und der Einstellungen). Die Seiten der Piloten beschreibt das
[Benutzerhandbuch](MANUEL_UTILISATEUR.md); den Betrieb im Detail (Daten, Sicherungen, Fehlerbehebung, Veröffentlichung)
das [Betriebshandbuch](../MANUEL_EXPLOITATION.md). Verzeichnis der gesamten Dokumentation:
[Dokumentationsverzeichnis](../README.md).

## Zugang zum Zentrum

Das Zentrum für Planung und Führung der Operationen (CPCO) umfasst den Missionsgenerator, das Kartenstudio, das Missionsregister und die ODV-Planung. Es ist den Administratoren der Suite vorbehalten.
Zwei unabhängige Schutzmechanismen gelten: die **Sperre des Zentrums**, die für jeden Browser eigen ist, und die **Benutzerrechte** (Rollen, Modus develop oder production), die für die ganze Gesellschaft gelten.
Die Einstellungen finden Sie unter ☰ › Einstellungen, Reiter „Zentrum“.

### Sperre des Zentrums

Die Sperre blendet das Zentrum aus, solange es in diesem Browser nicht aktiviert wurde.

- Zentrum gesperrt: Seitenleiste, Menü ☰ und Startseite folgen der Nutzungsstufe, nicht der Sperre; eine ohne Zentrum geöffnete Seite des Zentrums zeigt den Hinweis „Zugang beschränkt“, außer der Einsatztafel (Eintrag „Planung“), schreibgeschützt einsehbar.
- Eine direkt geöffnete Seite des Zentrums (Lesezeichen, Link) wird von einem Hinweis „Zugang beschränkt“ mit den Links „Zentrum aktivieren…“ und „Startseite“ überdeckt.
- Unter Einstellungen › Zentrum bleibt nur die Rubrik „Zugang zum Zentrum und Einstellungen“ sichtbar; die anderen („Benutzer und Rechte“, „Verfügbarkeitskategorien“, „ODV-Planung“, „Berichtsversand (Webdienst)“) sind ausgeblendet.
- Die Aktivierung wird nur in diesem Browser gespeichert: Sie ist auf jedem Rechner und nach dem Löschen der Websitedaten erneut vorzunehmen.

Grenze: Dies ist eine Nutzungssperre, keine Sicherheitsmaßnahme. Das Passwort steht im Klartext in `data/config/centre.json`, wird mit den Daten geteilt (`DEFA` voreingestellt) und neben dem Knopf „Zentrum aktivieren“ angezeigt: Das ist der **eigenständige Modus**. Der Gruppenmodus (signiertes Register, Zugang über die Administratorrolle) folgt ([Konzept](../technique/COMPTES_SIGNES.md)).

### Zentrum aktivieren oder sperren

1. Öffnen Sie ☰ › Einstellungen, Reiter „Zentrum“, Rubrik „Zugang zum Zentrum und Einstellungen“.
2. Geben Sie das neben dem Knopf angezeigte Passwort („Passwort: DEFA“ voreingestellt) in „Passwort des Zentrums“ ein (Groß- und Kleinschreibung egal).
3. Klicken Sie auf „Zentrum aktivieren“ oder drücken Sie die Eingabetaste. Die Statuszeile zeigt „Zentrum in diesem Browser aktiviert“.

Die Einträge des Zentrums erscheinen sofort, ohne die Seite neu zu laden. Die Rubrik zeigt dann „Modus und Zugang“ (Modus des Zentrums; „Passwort des Zentrums (mit den Daten geteilt)“ und „Passwort speichern“: in `data/config/centre.json` geschrieben, geht es beim nächsten „Synchronisieren“ hinaus), dann die Einstellungen „Berechnung der Transitrouten“:

| Feld | Funktion |
|---|---|
| „Geroutete Teilstrecke ab (NM)“ | Mindestlänge eines Transits, damit er geroutet wird |
| „Luftstraßen ab (ft)“ | Höhe, ab der ein Luftfahrzeug den Luftstraßen folgt |
| „Tiefflug bis (ft)“ | Obergrenze des Routings über das RTBA |
| „Ein- / Ausflug Luftstraßen (NM)“, „Ein- / Ausflug RTBA (NM)“ | Höchstabstand, um das Netz zu erreichen oder zu verlassen |
| „Zulässiger Umweg, Luftstraßen (%)“, „Zulässiger Umweg, RTBA (%)“ | Darüber bleibt die Teilstrecke direkt |

Schaltflächen: „Speichern“, „Standardwerte“ und „Zentrum sperren“. Diese Einstellungen bleiben in diesem Browser; es sind dieselben wie im Block „Geschätzte Dauer“ des Generators.

### Rollen „admin_centre“ und „utilisateur“

Jeder Benutzer hat ein gemeinsames Datenblatt (`data/utilisateurs/<TRI>.json`, synchronisiert): Kürzel, Anzeigename, Rolle, Status aktiv, Passwort (als Hash gespeichert, nie im Klartext).

| Rolle | Angezeigte Bezeichnung | Rechte |
|---|---|---|
| `admin_centre` | Administrator des Zentrums | Zugang zum Zentrum im Modus production, Benutzerverwaltung, Identitätsübernahme, Moduswechsel |
| `utilisateur` | Benutzer | Pilotenseiten („Meine Missionen“, Verfügbarkeiten) |

Verwaltung unter Einstellungen › Zentrum › „Benutzer und Rechte“:
- Die Tabelle listet die Datenblätter; „Anzeigename“, „Rolle“ und „Aktiv“ werden in der Zeile geändert und sofort gespeichert;
- „Zurücksetzen…“ öffnet „Passwort von TRI zurücksetzen“: Geben Sie ein vorläufiges Passwort ein (mindestens 8 Zeichen), das der Benutzer bei seiner nächsten Anmeldung ändern muss;
- „Benutzer hinzufügen“: Kürzel, Anzeigename, Rolle, dann „Hinzufügen“.

Tipp: Ist der Benutzerordner leer, legt die Rubrik ein Datenblatt pro Pilot der Referenz an.

### Modus develop und Modus production

Der Modus gilt für die ganze Gesellschaft (`data/config/suite.json`). Er wird unter „Benutzer und Rechte“ eingestellt, Rahmen „Modus der Gesellschaft“, Liste „Modus“.

| Modus | Wirkung |
|---|---|
| develop (Standard) | Sicherheit getestet, nicht erzwungen: Kürzel frei, Anmeldung freiwillig. Ein Datenblatt ohne Passwort meldet sich ohne Passwort an. |
| production | Anmeldung erforderlich für „Meine Missionen“ und für das Zentrum; Kürzel durch die Anmeldung festgelegt (in Mein Profil nicht änderbar). |

Im Modus production zeigt eine Seite des Zentrums (oder Einstellungen › Zentrum) ohne angemeldeten Administrator ein Fenster „Anmeldung“ (Kürzel, Passwort, „Anmelden“). Ein Konto ohne die Rolle `admin_centre` wird abgewiesen: „Konto ohne Administrationsrechte für das Zentrum“.

Für den Wechsel in den Modus production braucht es mindestens einen aktiven Administrator des Zentrums mit Passwort. Im Modus production kann nur ein angemeldeter `admin_centre` zu develop zurückkehren.

Grenze: Die Prüfungen erfolgen im Browser; sie schützen nicht wirklich, solange die Überprüfung nicht über einen Server läuft. Die Sperre des Zentrums bleibt vom Modus unabhängig: Sie muss ebenfalls auf jedem Rechner aktiviert werden.

### Einen Benutzer übernehmen

Ein Administrator kann anstelle eines anderen Benutzers handeln, zum Beispiel um dessen Verfügbarkeiten oder Missionen zu korrigieren.

1. Klicken Sie unter „Benutzer und Rechte“ in der Zeile des Benutzers auf „Übernehmen“.
2. Eine Benachrichtigung bestätigt „Sie handeln als TRI“.
3. Auf allen Seiten erscheint ein Banner: „Identitätsübernahme: Benutzer TOTO (durch ADM, Schreibvorgänge signiert „ADM pour TOTO“)“.
4. Zum Beenden klicken Sie im Banner auf „Übernahme beenden“ (oder auf „Übernehmen“ in Ihrer eigenen Zeile).

Während der Übernahme ist das Arbeitskürzel das des übernommenen Benutzers, und jeder Schreibvorgang wird mit „ADM pour TOTO“ signiert. Im Modus production erfordert die Übernahme einen angemeldeten `admin_centre`; in develop genügt ein eingestelltes Kürzel. Während einer Übernahme ist kein Passwortwechsel möglich.

## Missionsgenerator
<!-- page: apps/cpco/mission_editor.html -->

Der Generator bereitet die Unterlagen einer Mission vor: Identifikation, Briefingtexte, Übung, geschätzte Dauer, zu aktivierende Gebiete, danach die PDFs für die Besatzungen. Er dient auch dazu, eine Mission bei ChatGPT zu bestellen und die Antwort zu empfangen.
Zugang: Seitenleiste „Missionen“, Reiter „Generator“ (Stufe Gestaltung, 3), oder ☰ › „Missionsgenerator (SIA)“. Im Register öffnet „Eine Mission erzeugen“ den leeren Generator, und „Im Generator öffnen“ lädt die gewählte Mission.
Siehe auch [SIA-Missionen](../SIA_MISSIONS.md) und [Prompt des Generators](../technique/PROMPT_GENERATEUR_MISSIONS.md).
Je nach Nutzungsstufe: Die Seite wird ab der Stufe Gestaltung (3) angeboten. Auf dieser Stufe zeigt sie sieben Blöcke: Mission, Identifikation, Geschätzte Dauer, Zu aktivierende Gebiete, Missionstexte, Karten des Endpakets und Dokumente (dazu Operation und Übung, wenn die Mission dazugehört). Entwürfe, „Alle YAML-Daten“ und die Einstellungen der Routenberechnung gehören zur Stufe Experte (4).

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
| „Entwurf speichern“ / „Entwurf neu laden“ (Stufe Experte) | Behält oder liest den Text der Mission in diesem Browser (die Bilder sind neu auszuwählen) |

Der Bereich „Andere Mission importieren: Dateien, eingefügter Text, ChatGPT-Bestellung“ ist geöffnet, wenn keine Mission geladen ist:
- „YAML und/oder Markdown“: Wählen Sie `mission<ID>.yaml` und `summary<ID>.md` gemeinsam aus, oder klicken Sie auf „oder Inhalt einfügen…“ und dann auf „Mission lesen“;
- „Karten oder vom Generator geliefertes ZIP“: Wählen Sie direkt das ZIP des Studios; die PNGs und die Übersichtskarte werden automatisch zugeordnet;
- „Mission bei ChatGPT bestellen“: dasselbe Formular wie im Register (Typ, Untertyp, Einsatzgebiet, Serie, Teams, Luftfahrzeuge…). „Bestellen: Prompt kopieren und ChatGPT öffnen“ kopiert den Prompt, öffnet ChatGPT in einem neuen Tab und trägt die Bestellung ins Register ein („bestellt“). Auf der Stufe Gestaltung erscheint dieser Bereich nur, wenn der Knopf „Bei ChatGPT bestellen…“ ihn öffnet; auf der Stufe Experte steht er auch zugeklappt im Bereich.

Eine empfangene Mission wird ins Register eingetragen und in ihrem Ordner abgelegt, wenn der Missionsordner erlaubt ist; andernfalls klicken Sie auf „Im Missionsordner ablegen…“. Link „Register öffnen ↗“.

### Operation

Block nur sichtbar, wenn die Mission zu einer Operation gehört (`operation` im YAML).
- Jede Mission der Operation ist eine Schaltfläche: Kennung, Rufzeichen oder „Übungsleitung“, Startzeit. Klicken Sie, um sie anzuzeigen. „nicht geladen“ oder „anzulegen“ kennzeichnet eine Mission, die im Paket fehlt.
- „Übungsleitung anlegen“ erstellt die Mission …Z (allgemeines Briefing, Stunde H, Teilnehmer, Übungsziele, Zeitablauf) und übernimmt dabei die Spuren und Einspielungen der Missionen im alten Format.
- Einzelmission: Eine unauffällige Zeile bietet „Übungsleitung hinzufügen…“ an.
- „Missionen der gespielten Ziele anlegen (n)“: Jedes gespielte Übungsziel wird eine Mission der Operation (Basis der ersten Besatzung, Route der Spur, berechneter Start). Prüfen Sie danach Luftfahrzeug, Basis und Uhrzeit, öffnen Sie jede im Studio, dann „Im Ordner speichern“.

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

„Summary“ (Zusammenfassung), „Ausführliche Beschreibung“, dann freie Rubriken: „Textabschnitt hinzufügen“, jeweils mit „Abschnittstitel“, „Inhalt“ und „Löschen“.
Hat die empfangene Datei weder Zusammenfassung noch Beschreibung, werden sie aus den Daten vorgeschlagen: Lesen Sie sie gegen.
Auf einer Mission der Übungsleitung wird der Block zu „Allgemeines Briefing“: Lage, gemeinsame Ziele, Zeitfenster, Endkriterien, für alle.

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

## Kartenstudio
<!-- page: apps/cpco/map_parser.html -->

Das Studio erstellt die Karten der Missionsunterlagen aus den Daten des SIA (AIRAC-Zyklus): Route, Vertikalschnitt, Karten als PNG oder SVG, ZIP und Übersichtskarte.
Zugang: Seitenleiste „Missionen“, Reiter „Kartenstudio“ (Stufe Experte, 4), ☰ › „Kartenstudio (SIA)“, oder „Im Kartenstudio öffnen“ im Register.
Es arbeitet an der mit dem Generator geteilten Mission. Technische Details: [SIA-Missionen](../SIA_MISSIONS.md).

### Mission

- Statuszeile der geladenen Mission und Schaltfläche „Im Ordner speichern“: schreibt die Mission und die Einstellungen des Studios (Profil und Ausschnitt jeder Karte, Linien, Spuren) in `mission<ID>.yaml`. Das Ergebnis erscheint neben der Schaltfläche und als Benachrichtigung.
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

Schaltflächen: „Im Generator öffnen“, „Im Kartenstudio öffnen“, „Zuweisen…“ (außer Übungsleitung …Z; siehe [Zuweisung der Missionen](../technique/AFFECTATION_MISSIONS.md)), „Bericht erstellen“ oder „Neuer Bericht (Flug n)“, und „Prompt erneut kopieren“ für eine bestellte Mission. „Im Kartenstudio öffnen“ und „Prompt erneut kopieren“ gehören zur Stufe Experte.

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
2. Klappen Sie bei Bedarf „Weitere Optionen“ auf: „Zweites Einsatzgebiet“ („Land“ für das Ausland), „Serie“ (leer = die nächste), „Kennung“ (berechnet, nur lesbar), „Treffpunkt“, „Übersetzungen“, „Luftbetankung“ und das Luftfahrzeug jedes fliegenden Teams A, B… (leer = automatisch). Dieser Bereich ist auf der Stufe Experte geöffnet; auf den anderen Stufen öffnet er sich von selbst, wenn eine seiner Einstellungen vom Standard abweicht.
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
- Hat ein Pilot der Arbeitsmappe noch keine Präferenzen für Missionsarten, legt die Suite sie anhand seiner Codes an (C → Jagd, T → Transport…) und schreibt sie in sein Benutzerdatenblatt.
- „Daten löschen“ leert die Seite. Die Schaltfläche bleibt ausgegraut, solange keine Arbeitsmappe geladen ist.
- Der Link „Einstellungen › Zentrum › ODV-Planung“ führt zu den Einstellungen der Zeitfenster und des Lesens der Arbeitsmappe.
- Personenbezogene Daten: Veröffentlichen Sie die Exporte nicht. Format der Arbeitsmappe und Leseregeln: [ODV-Planung](../ODV_PLANNING.md).

### Verfügbarkeitsraster

Das Raster kreuzt die Piloten mit den Tagen der Woche und den drei Zeitfenstern jedes Tages (M = Morgen, A = Nachmittag, S = Abend).
- **Wahl der Woche**: „◀ Vorherige Woche“, „Nächste Woche ▶“, „Diese Woche“, und „Woche der Arbeitsmappe“, wenn eine Arbeitsmappe einer anderen Woche geladen ist. Die angezeigte Quelle ist entweder „Arbeitsmappe …“ oder „Pilotenangaben und Zuweisungen (keine Arbeitsmappe für diese Woche)“.
- **Filter**, in diesem Browser gespeichert: „Leere Raster ausblenden“, „Farbe des Kürzels“ (Farbe der Form in der Arbeitsmappe), „Rolle (Blatt FLOTTE)“ oder ohne Arbeitsmappe „Rolle (angegebene Luftfahrzeuge)“, „Simulator“.
- **Legende**: Codes der Arbeitsmappe mit ihrer Anzahl Felder, dann der Block „Pilotenangaben“, identisch mit dem von Meine Missionen.
- **Lesen eines Felds**: Der Code der Arbeitsmappe steht zuerst, dann die Angabe des Piloten. Ein roter Rahmen kennzeichnet einen verfügbaren, nicht zugewiesenen Piloten. Eine Missionsnummer kennzeichnet einen zugewiesenen Piloten.
- **Tooltips**: Der Kommentar des Felds erscheint beim Überfahren; Rollen, Simulatoren und die Zeile der Arbeitsmappe erscheinen beim Überfahren des Kürzels.
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

### Gebietsaktivierungen nach Netzwerk

Dieser Block ist der der Einsatztafel (siehe „Gebiete“): RTBA-, R-, D-, TRA-Aktivierungen… der angezeigten Woche, VATSIM und IVAO nebeneinander, dieselben Daten. Bearbeitung wie bei der Einsatztafel beschränkt (Centre aktiviert; im Produktivbetrieb Administrator).

### Gemeinsame Zeitfenster

Diese Tabelle umfasst 7 Tage × 3 Zeitfenster. Jedes Feld nennt die Zahl der **freien Piloten**, also verfügbar und noch nicht zugewiesen.
- Die Markierungen des Felds: „+n ctrl“ (Fluglotsen), „✎“ (Mission bereits zugewiesen), „★“ (Event oder ATC-Sitzung). Der Tooltip nennt auch die Besetzung vor den Zuweisungen.
- Filter: „Mindestens N Pilot(en)“, von 1 bis 20, und „Gemeinsamer Simulator“ („beliebig“ oder ein Simulator). Sie werden mit den ODV-Einstellungen gespeichert. Ein Feld unter dem Schwellenwert wird abgeschwächt.
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

## Einstellungen › Zentrum
<!-- page: apps/settings/centre.html -->

Diese Seite vereint die laufenden Einstellungen des Zentrums: Zugang, Benutzer, Verfügbarkeitskategorien, ODV-Planung und Berichtsversand. Sie richtet sich an die Administratoren des Zentrums.
Zum Öffnen: Seitenleiste › „Einstellungen“, dann der Reiter „Zentrum“. Die Rubriken erscheinen im Seitenmenü, Gruppe „Zentrum (CPCO)“.
Solange das Zentrum gesperrt ist, ist nur die Zugangsrubrik sichtbar. Im Modus production verlangt die Seite zusätzlich eine Anmeldung als `admin_centre`.

### Zugang zum Zentrum und Einstellungen

Diese Rubrik aktiviert das Zentrum in diesem Browser: Missionsgenerator, Kartenstudio, Register und ODV-Planung.
1. Geben Sie das „Passwort des Zentrums“ ein, das neben dem Knopf angezeigt wird (`DEFA` voreingestellt; Groß- und Kleinschreibung egal).
2. Klicken Sie auf „Zentrum aktivieren“ oder drücken Sie die Eingabetaste. Die Meldung „Zentrum in diesem Browser aktiviert“ bestätigt die Aktivierung.

Ist das Zentrum aktiviert, zeigt die Rubrik „Modus und Zugang“ (Modus, Änderung des geteilten Passworts), dann „Berechnung der Transitrouten“:

| Feld | Funktion |
|---|---|
| Geroutete Teilstrecke ab (NM) | Entfernung, ab der eine Teilstrecke geroutet wird |
| Luftstraßen ab (ft) | Höhe, ab der die Luftstraßen genutzt werden |
| Tiefflug bis (ft) | Obergrenze des Tiefflugs |
| Ein- / Ausflug Luftstraßen (NM), Ein- / Ausflug RTBA (NM) | Höchstabstand, um die Luftstraßen oder das RTBA zu erreichen |
| Zulässiger Umweg, Luftstraßen (%), Zulässiger Umweg, RTBA (%) | tolerierter Umweg |

Ein leeres Feld übernimmt den Standardwert, der grau angezeigt wird. Schaltflächen: „Speichern“, „Standardwerte“, „Zentrum sperren“. Diese Einstellungen bleiben in diesem Browser.

### Benutzer und Rechte

Diese Rubrik verwaltet die Datenblätter der Benutzer. Es gibt ein Datenblatt pro Benutzer (`data/utilisateurs/<TRI>.json`), synchronisiert mit dem Datenpool.
- **Modus der Gesellschaft**: `develop` (Sicherheit getestet, aber nicht erzwungen: Kürzel frei, Anmeldung freiwillig) oder `production` (Anmeldung erforderlich für Meine Missionen und das Zentrum, Kürzel durch die Anmeldung festgelegt). Diese Einstellung gilt für die ganze Gesellschaft (`data/config/suite.json`).
- Grenze: Die Prüfungen erfolgen im Browser. Sie schützen erst wirklich, wenn die Überprüfung von einem Server (Webdienst) übernommen wird.
- **Tabelle**: „Kürzel“, „Anzeigename“, „Rolle“ („Administrator des Zentrums“ oder „Benutzer“), „Aktiv“, „Passwort“ (gesetzt, vorläufig oder keins). Jede Änderung einer Zeile wird sofort geschrieben.
- **„Zurücksetzen…“**: Geben Sie ein vorläufiges Passwort ein (mindestens 8 Zeichen), dann „Passwort zurücksetzen“. Der Benutzer muss es bei seiner nächsten Anmeldung ändern.
- **„Übernehmen“**: Sie handeln im Namen des Benutzers. Ein Banner erinnert auf allen Seiten daran, jeder Schreibvorgang wird mit „ADM pour TOTO“ signiert, und die Schaltfläche „Übernahme beenden“ beendet sie.
- **„Benutzer hinzufügen“**: Kürzel, Anzeigename, Rolle, dann „Hinzufügen“.
- Ist der Ordner leer, wird für jeden Piloten der Referenz ein Datenblatt angelegt.
- Konnten Dateien noch nicht in den Datenordner geschrieben werden, klicken Sie auf „In den Datenordner schreiben“.
- Im Modus production sind das Zurücksetzen eines Passworts, die Identitätsübernahme und der Moduswechsel einem angemeldeten
  `admin_centre` vorbehalten; das Hinzufügen eines Benutzers und die Änderung einer Zeile (Rolle, aktiv) sind nur durch
  die Sperre des Zentrums geschützt (siehe [technische Schuld](../technique/DETTE_TECHNIQUE.md)).

### Verfügbarkeitskategorien

Diese Rubrik legt fest, was die Piloten als Verfügbarkeiten angeben können (`data/config/disponibilites.json`, synchronisiert).

| Spalte | Verwendung |
|---|---|
| id | Kennung, nach dem Speichern der Kategorie fest; bei einer neuen Kategorie einzugeben |
| Gruppe | in der ODV angezeigte Gruppe (Verfügbar, SOG-Übung, Belegt, Nicht verfügbar…) |
| Bezeichnung, Farbe | Bezeichnung **nur auf Französisch**, Farbe des Felds |
| Offene Themen | „alle Themen“, „keins“, „Bereich …“, „… nach Präferenzen, aus …“, oder „Themenliste“ (freies Feld, Themen durch Leerzeichen getrennt) |
| Typ | verfügbar, Fluglotse, belegt, nicht verfügbar |
| ODV-Codes | Codes der Arbeitsmappe, die beim Import als diese Kategorie gelesen werden, durch Leerzeichen getrennt; der erste erscheint im Raster |
| Zurückgezogen | Kontrollkästchen: Die Kategorie wird in den Listen ausgeblendet, bleibt aber für den Verlauf erhalten |

- Eine bereits verwendete Kategorie wird nicht gelöscht: Sie wird **zurückgezogen**. Nur eine neue, noch nicht gespeicherte Kategorie kann mit „✕“ gelöscht werden.
- „Kategorie hinzufügen“, dann „Speichern“. Das Speichern wird abgelehnt, wenn eine Kennung leer oder doppelt ist oder eine französische Bezeichnung fehlt.
- Weiter unten: „Gruppen (ODV)“ (Bezeichnung, Farbe) und „Themen je Bereich“ (Missionsfamilien durch Leerzeichen getrennt).
- Übersetzungen: Ändern Sie eine französische Bezeichnung, verliert sie ihre englische, deutsche und spanische Übersetzung bis zum nächsten Übersetzungsaudit (`tools/audit_i18n.html`).
- „Standardwerte“ stellt die ursprünglichen Kategorien wieder her. Hinzugefügte Kategorien bleiben erhalten, werden aber zurückgezogen.
Siehe auch [Verfügbarkeiten und Umorganisation](../technique/DISPOS_ET_REORGANISATION.md).

### ODV-Planung

Diese Rubrik enthält die spezifischen Einstellungen der Seite ODV-Planung. Sie bleiben in diesem Browser und werden nicht synchronisiert. Eine in einem anderen Tab geöffnete ODV-Seite übernimmt sie sofort.

| Einstellung | Standard |
|---|---|
| Zeitfenster (Uhrzeit z): Morgen, Nachmittag, Abend | 8 bis 12, 12 bis 18, 18 bis 23 (in halben Stunden; das Ende muss nach dem Beginn liegen) |
| Bevorzugtes Land (ATC-Bereich) | „Frankreich (Mutterland)“; ATC-Sitzungen (Trainings, Prüfungen, Buchungen) nur für dieses Land importiert und gezeigt, ODV-Planung und Einsatztafel (ICAO-Kennungen des Landes: LF außer LFV für Frankreich) |
| Daten der Woche | „ISO-Woche (Wochennummer der Datei)“; sonst „Auf der Zeitleiste eingetragenes Datum“ |
| Leeres Feld | „Nicht ausgefüllt“ (nie als verfügbar gezählt); sonst „Nicht verfügbar“ |
| Für die Rollen berücksichtigte FLOTTE-Typen | „Alle außer rot (nicht beherrscht)“; „Nur grün (beherrscht)“; „Alle“ |
| Pro Zeitfenster gezeigte Missionen | 3 (von 1 bis 10) |
| Vorzugsreihenfolge bei gleicher Punktzahl | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (unbekannte Familien werden mit einer Warnung ignoriert) |
| Eingeschränkter Code (SC, C, T, N): nur Rollen seines Bereichs | angehakt |
| Eine an allen 7 Tagen eines Zeitfensters gefärbte Gruppenzeile ignorieren (Gestaltung) | angehakt |

Jede Änderung wird sofort gespeichert. „Standardeinstellungen“ stellt alle obigen Werte wieder her.

### Einsatztafel

Diese Rubrik stellt die Seite Einsatztafel ein (`data/config/odv.json`, synchronisiert).

| Einstellung | Verwendung |
|---|---|
| Flugplatz (ICAO) | Luftfahrttag und -nacht auf der Zeitleiste |
| Standardnetzwerk der Flüge | IVAO oder VATSIM, für den Status der Gebietsaktivierungen |
| Frist ohne Bericht bis MNE (Stunden) | standardmäßig 48 |
| Angezeigte Tage, Dienstzeiten | 7 Tage, 06:00 bis 23:00 z; für Zeitleiste und Statistik |
| Vorlagen für Flüge, Sonstiges, Lotsendienst | Bezeichnung, Dauer, Farbe, gefüllt; „Farbe des Rufzeichens“: der Streifen nimmt die Farbe seines Rufzeichens an |
| Farben der Rufzeichen | Präfix (das längste im Rufzeichen enthaltene gewinnt), Füllung, Rahmen |
| Luftfahrzeugkonfigurationen | Text (KNON, TALIOS…), Farbe; in der Luftfahrzeugtabelle eines Flugs vorgeschlagen |
| LL-/RTBA-Zeitfenster (Ersatz) | Name, Beginn, Ende, Tage, Farbe, Gebiet der Datenbank |
| Personal | Gruppe Stab oder Mitglieder, Farbe, Reihenfolge in der Palette |
| Wiederholungen | wiederholte Elemente; „✕“ beendet eine Wiederholung |

„Speichern“ schreibt die Einstellungen; „Standardwerte“ stellt die ursprünglichen Einstellungen wieder her, außer Personal, Rufzeichenfarben, LL-Zeitfenstern und Wiederholungen.

### Berichtsversand (Webdienst)

Diese Rubrik stellt die Schaltfläche „Bericht senden“ der Eingabeseiten ein. Sie sendet ein JSON-POST (Mission, Bericht als HTML und als Text, Berechnungen) an die angegebene Adresse.
- Felder: „Adresse des Webdienstes (https://…)“, „Schlüssel-Header“ (standardmäßig `Authorization`), „Präfix (Bearer, leer für den reinen Schlüssel)“, „Schlüssel“.
- Die Adresse muss mit `https://` beginnen, außer `http://localhost` oder `127.0.0.1` für Tests.
- Der Schlüssel bleibt in diesem Browser (`missionSendKey:v1`) und gelangt nicht in die Sicherungen. „Schlüssel vergessen“ löscht ihn.
- Der Dienst muss Aufrufe von der Adresse der Suite annehmen (CORS).
- Die Statuszeile zeigt die Anzahl der von diesem Browser gesendeten Berichte.
Details: [Betriebshandbuch](../MANUEL_EXPLOITATION.md), § 10.

## Einstellungen › Installation
<!-- page: apps/settings/installation.html -->

Diese Seite vereint die einmalig vorzunehmenden Einstellungen: lokale Ordner, externe Quellen, virtuelle Fluggesellschaft, Luftfahrtdaten und Luftfahrzeugtypen.
Zum Öffnen: Seitenleiste › „Einstellungen“, dann der Reiter „Installation“. Dieser Reiter erscheint ab der Nutzungsstufe Planung (2); eine direkte Adresse zu einem seiner Abschnitte öffnet ihn auf jeder Stufe.
Das Seitenmenü hat eine einzige Gruppe, „Ordner und Quellen“: „Quellen und Ordner“ (von Anfang an geöffnet), „Luftfahrtdaten“ und „Luftfahrzeugtypen“.
Der Erststart hat einen eigenen Reiter, „Erststart“, beschrieben im [Benutzerhandbuch](MANUEL_UTILISATEUR.md#erststart); „Bereinigen und neu beginnen…“ steht unten auf jener Seite. Siehe auch [Installation](../INSTALL.md), § 1.
Diese Rubriken werden der Seite durch `config/repository_tree` zugeordnet (Schlüssel `settings.sections`: `sources` → installation; `sia` und `types` → installation,maintenance, also auf beiden Seiten: Einrichtung hier, Aktualisierung unter Wartung, dieselben Blöcke). Alle anderen Wartungsrubriken öffnen sich auf der Seite Wartung.

### Quellen und Ordner

Diese Rubrik ist der einzige Ort, an dem die lokalen Ordner und die Adressen der externen Quellen eingestellt werden.
- **Erststart** (Ankunft aus dem Starter): Ein Kasten bittet darum, die erste Zeile zu wählen, „Repository-Ordner“. Die anderen Ordner werden daraus abgeleitet.
- **Lokale Ordner**: Jede Zeile hat ihre Auswahlschaltfläche und einen Zustand („nicht gewählt“, „erlaubt“, „erneut erlauben“). Eine Prüfung meldet einen Ordner, der nicht der richtige zu sein scheint (Markierungsdatei fehlt). Der Browser speichert die Erlaubnis, kann aber nach einem Neustart eine Bestätigung verlangen.
- **Ordnerhinweis**: Kann die Suite nicht prüfen, ob der freigegebene Datenordner zur ausgelieferten Suite gehört, weist ein einmaliger Hinweis darauf hin (Lesen und Schreiben erfolgen dann in diesem Ordner); bleibt eine Speicherung im Browser, weil sie nicht geschrieben werden kann, nennt der Hinweis den tatsächlichen Grund.

| Ordner | Erwarteter Inhalt |
|---|---|
| Repository-Ordner | Stammverzeichnis der Anwendung (enthält `lancer.cmd`, `config/repository_tree`) |
| Datenordner | `data/` (enthält `data_tree.js`) |
| Registerordner, Missionsordner, Ordner SIA XML | `data/cr`, `data/missions`, `data/sia` (aus dem Datenordner abgeleitet) |
| Ordner der ODV-Arbeitsmappe | synchronisierter Ordner (OneDrive…), in dem die Staffel die `.xlsx` ablegt |
| Ordner X-Plane (Landungen), Ordner Leistungsdaten, Ordner der lokalen Sicherung | CSV-Protokolle, Profile `.lnmperf` / `.json`, `defa_local_store.yaml` |

- **Externe Quellen**: Die Standardadresse wird grau angezeigt. Ein eingegebener Wert gilt nur für diesen Browser; „↺“ kehrt zum Standardwert zurück, und „Öffnen ↗“ öffnet die Adresse.
- **API-Schlüssel (externe Dienste)**: Schlüssel der Suite, für alle ihre Benutzer (IVAO: API-Schlüssel für die Gebietsaktivierungen und die ATC-Sitzungen — Trainings, Prüfungen, Buchungen — der ODV-Planung und der Einsatztafel). „Speichern“ übergibt sie dem Starter (`secrets/` im Anwendungsordner, von Git ausgeschlossen, außerhalb der Daten und Sicherungen); die Seite sieht nur ihren Status und die letzten 4 Zeichen; „Löschen“ entfernt den Schlüssel.
- **Virtuelle Fluggesellschaft**: „Name“, „Vollständiger Name“, „Kürzel“, „Zentrum (Kürzel)“, „Zentrum (voller Name)“, und die Seiten der Website („Startseite“, „Flugbuch“, „Flotte“, „Flugzeugseite“). Ein leeres Feld behält den Standardwert. „Zurück zu SO Group Virtual“ löscht alle diese Einstellungen.
- **Erststart**: „Ersten Start erneut öffnen“. Um bei null anzufangen, steht „Bereinigen und neu beginnen…“ unten auf der Seite des Erststarts (Abschnitt „Neu beginnen“).

## Einstellungen › Wartung
<!-- page: apps/settings/maintenance.html -->

Diese Seite dient der Pflege der Suite: Updates, Versionen, SIA-Daten, Caches, Sicherungen und Referenzdatenbanken.
Zum Öffnen: Seitenleiste › „Einstellungen“, dann der Reiter „Wartung“. Die Seite öffnet sich auf „Updates“. Dieser Reiter erscheint nur auf der Nutzungsstufe Experte (4); eine direkte Adresse zu einem seiner Abschnitte öffnet ihn auf jeder Stufe.
Das Seitenmenü hat drei Teile:
- die Gruppe „Wartung“: Updates, Versionen, Referenzen und Abhängigkeiten, Luftfahrtdaten, Luftfahrzeugtypen;
- die Gruppe „Speicher und Sicherung“: Caches, Speicherplatz, Vollständige Sicherung, Protokoll;
- die Datenbanken, geordnet in den Gruppen „Dateien des Repositorys“, „Datenbank“, „Missionen“ und „Browserdaten“. Diese Gruppen erscheinen nur auf der Stufe Experte.

### Aktualisierungen der Suite

Dieser Block legt fest, woher die Code-Updates kommen und wann die Suite nach ihnen sucht.
- **Kanal**: `master` (stabil, veröffentlichte Versionen) oder `develop` (Early Bird, neueste Entwicklungen vor der Veröffentlichung).
- **Modus**: „Manuell“ (Schaltfläche „Jetzt prüfen“); „Automatisch, regelmäßig“, bei jedem Öffnen, täglich, wöchentlich, bei jedem AIRAC-Zyklus oder monatlich; „Deaktiviert“ (keine Prüfung, kein Hinweis).
- Die Prüfung fragt framagit ab. Gibt es eine Neuerung, erscheint ein Hinweis „Update“ im Kopf aller Seiten.
- **Update anwenden**: Eine Webseite kann das Repository nicht umschreiben. Kopieren Sie die Befehle (Schaltfläche „Kopieren“) und führen Sie sie in einem Terminal im Stammverzeichnis aus: `python tools/update_suite.py channel <canal>`, dann `python tools/update_suite.py update`. Für eine Diagnose: `python tools/update_suite.py doctor`.
- `update` verweigert die Ausführung, wenn verfolgte Dateien geändert sind, geht nur per Fast-Forward vor und protokolliert jeden Vorgang.
- **Lokales Git-Repository**: Wählen Sie den „Repository-Ordner“, dann „Git-Status lesen“. Die Tabelle zeigt Branch, HEAD, origin, Tracking, master / develop, den letzten Fetch und den von Git gespeicherten Kanal. Eine Abweichung vom gewählten Kanal wird gemeldet.
- Eine Installation per ZIP-Archiv hat kein `.git`: Sie wird mit einem neuen Archiv aktualisiert.

### Versionen und Synchronisation

Diese Tabelle nennt Version und Aktualisierungsdatum jedes Elements, mit einem Zustand (✓, ⚠, ✗) und der Quelle oder dem Werkzeug zur Aktualisierung.
- Code: Suite (`repository_tree`), Cache-Version der Skripte, Git, entfernter Kanal.
- SIA / AIRAC: gültiger und nächster Zyklus, Datenbank des Kartenstudios, Ordner SIA XML, `mora.csv`, AAR-Achsen (ENR 5.7).
- Referenzdatenbanken: ICAO-Muster, APD-Leistungsdaten, Flotte, Referenz, Rufzeichen.
- Benutzerdaten: SimBrief-Flugpläne, Profile des Planers, Berichtsregister, Register der erzeugten Missionen, Landeprotokolle, lokale Daten, letzte vollständige Sicherung.
- „Aktualisieren“ liest den Git-Status und den SIA-Ordner neu.
- Eine Warnung erscheint, wenn die lokalen Daten seit mehr als 7 Tagen nicht gesichert wurden oder es seit mehr als 30 Tagen keine vollständige Sicherung gab.

### Referenzen und Abhängigkeiten

Dieser Block beschreibt jede Referenz der Suite:

| Spalte | Inhalt |
|---|---|
| Referenz, Datei | die Referenz und ihre Datei |
| Nachverfolgung | wie die Version nachverfolgt wird |
| Aktualisierung | Aktualisierungsverfahren |
| Abhängige | Daten, die davon abhängen |
| Prüfung | geprüfte Konsistenz |

Verfolgte Referenzen: SIA-XML, analysierte Datenbank des Studios, MORA-Raster, AAR-Achsen, APD-Leistungsdaten, Flotte, Profile des Planers und Missions-Prompt.
Beispiele für Prüfungen: gemischte Zyklen in der SIA-Datenbank, MORA-Hindernisse eines anderen Zyklus, Flottenmuster, die in der ICAO-Datenbank fehlen, neu zu erzeugender Prompt (`python tools/build_mission_prompt.py`).
Die Schaltfläche „Prüfen“ startet die Prüfungen erneut.

### Luftfahrtdaten: Zonen der Welt, Quellen und AIRAC-Zyklen

**Zonenkarte**: eine Zone pro Land (Frankreich umfasst Mutterland und Überseegebiete, Abdeckung des SIA), dazu eine ozeanische Zone, „Nordatlantik (ozeanisch, NAT)“, deren Quellen X-Plane (ozeanische Punkte und Strecken, außerhalb jedes Landes) und die NAT-Tracks des Tages sind. Beim Überfahren erscheinen ihre Quellen im rechten Feld. **Ein Klick fügt das Land der Auswahl hinzu, ein weiterer entfernt es** (gewählte Länder blau, dunkel umrandet); die Leiste unter der Karte führt sie auf (zu aktivieren, zu deaktivieren, „Abbrechen“). **„Aktivieren“** übernimmt die Auswahl und erledigt dann von selbst, für alle gewählten noch unvollständigen Länder, alles, was die Suite allein kann: Downloads ihrer Quellen, neueste ZIPs aus „Downloads“ (SIA, NATS…), ein einziger Neuaufbau der Datenbank, dann die MORA jedes Landes ohne MORA — nur wenn die Datenbank neu aufgebaut wurde (doppelte Anzeige: Schritt und Detail; eine fehlgeschlagene Quelle hält die anderen nicht auf; Zusammenfassung als Benachrichtigung). Das Feld eines Landes behält „Zone aktivieren“ / „Zone deaktivieren“ und, für eine aktive Zone, „Alles abrufen und neu berechnen“. Was von Hand bleibt (Bestellung auf der SIA-Website, zu importierendes PDF, X-Plane-Ordner, abzulegende Dateien…), steht unter der Karte, „Zu erledigen“: eine Zeile pro Quelle, mit Link und Schaltfläche; Downloads und MORA, die „Aktivieren“ erledigt, stehen dort in einer einzigen Zeile „automatisch“.
- Farben: nur Umriss = inaktiv, ohne Daten; grau = inaktiv, mit Daten; orange = aktiv, Daten unvollständig; grün = aktiv, alle Daten der angehakten Quellen; hellblau = überfahrene Zone; blau mit dunkelblauem Rand = gewähltes Land („Aktivieren“ zum Übernehmen).
- Jede Quelle wird für ihre Zone angehakt oder nicht; nur die angehakten Quellen der aktiven Zonen gehen in die Datenbank. Eine „Link“-Quelle (PDF oder Informationsseite) wird von der Suite nicht gelesen. **Die Einrichtung macht nur, was fehlt**: Eine aktuelle Quelle wird nicht erneut heruntergeladen („Alles abrufen und neu berechnen“ prüft sie erneut, ohne etwas neu zu schreiben, wenn der Server nichts Neues hat), eine identische Datei wird nicht neu geschrieben, und die Datenbank wird nur neu gelesen, wenn sich eine Datei, eine Zone oder eine Quelle geändert hat; ohne Neues erneut gestartet, lädt, schreibt und berechnet sie nichts. **„Zone leeren…“** (Zone mit Daten) löscht nach Bestätigung ihre Dateien aus dem SIA-Ordner (für Frankreich: die SIA-XML und die ENR-5.7-Strecken) und ihre Felder aus `mora.csv` (alte Datei in `_archives/`), deaktiviert sie und liest die Datenbank neu; der X-Plane-Ordner wird nicht berührt. Eine neue Aktivierung installiert alles neu.
- Je nach Quelle bietet das Feld:
  - einen direkten Download über den Starter (`tools/aero_fetch.py`): openAIP (jedes Land), ENAIRE (Spanien), FAA (USA: Militärgebiete und -routen, Luftraumklassen), britisches Militär-AIP (ENR 5.2, offizielles PDF, vom Starter gelesen: Tieffluggebiete, VATA, Ausweichgebiet TVAA, Betankungsstrecken AARA zusätzlich zu denen der DIRCAM), NAV CANADA (Designated Airspace Handbook, gültige Ausgabe vom Starter gelesen: Gefahren-, Beschränkungs- und Advisory-Gebiete Kanadas, alle 56 Tage neu herunterzuladen), NAT-Tracks des Tages (Zone Nordatlantik: von der FAA veröffentlichte Meldung von Shanwick und Gander, vor jedem Transatlantikflug neu herunterzuladen, da sich die Tracks zweimal täglich ändern; „alt“ nach 12 Stunden; benannte Punkte nach der X-Plane-Quelle der Zone platziert);
  - eine Bestellung oder Registrierung, mit Link und Anleitung: SIA Frankreich (Bestellung zu 0 €, bei jedem Zyklus erneut), NATS (Vereinigtes Königreich, Datei in `data/sia/zones/gb/` abgelegt);
  - ein PDF, mit Link und Anleitung: DIRCAM / MILAIP ENR 5.7 (Betankungsstrecken);
    DIRCAM: „MILAIP-PDF importieren…“ liest das PDF des Abschnitts ENR 5.7 (pdf.js, Netz beim ersten Import), zeigt die Zahl der Strecken und die gefundenen Auffälligkeiten, dann legt „miam-enr-5-7-tracks.xml schreiben“ die Datei im SIA-Ordner ab (alte in `_archives/`) und aktualisiert die Datenbank („Abbrechen“ während des Lesens: nichts wird behalten oder geschrieben);
  - einen Ordner des Rechners: X-Plane (Funkfeuer, Punkte, Luftstraßen, MORA-Gitter, zugeschnitten auf die aktiven Zonen, die es angehakt haben);
  - eine Berechnung: die MORA der Zone. Eine sehr große Zone (mehr als 1500 Ein-Grad-Felder: Vereinigte Staaten, Kanada…) nimmt standardmäßig die MORA von X-Plane; „Vollständige Berechnung…“ berechnet sie in 10°-Blöcken nach einer Bestätigung, die den Umfang nennt (offene AWS-Reliefkacheln, um 100 m erhöht, ohne OpenStreetMap-Abfrage): Jeder Block wird sofort in `mora.csv` geschrieben, „Anhalten“ zwischen zwei Blöcken, später „Vollständige Berechnung fortsetzen…“.
- SIA Frankreich (Zone Frankreich): „Heruntergeladenes ZIP holen“ (der Starter nimmt es aus dem Download-Ordner), „SIA-Export-ZIP…“, „… entpacken“, wenn es schon im Ordner liegt, „Alte Zyklen archivieren“ (`_archives/`); „Inhalt des SIA-Ordners“ listet die Dateien des Zyklus.
- Der SIA hat Vorrang: in den französischen FIR zählen nur seine Lufträume; anderswo wird ein bereits gelesener Luftraum, Flugplatz oder Funkfeuer nicht doppelt aufgenommen. Außerhalb Frankreichs erscheinen von einer Mission geschnittene R-, D-, TRA-, TSA-, MOA-, W-, A-Gebiete und MTR-Routen in ihren zu aktivierenden Lufträumen.
- Die Website-Adressen (SIA, DIRCAM, NATS, britisches Militär-AIP, NAV CANADA) werden unter Einstellungen › Installation › Quellen und Ordner › Externe Quellen eingestellt; die SIA- und X-Plane-Ordner dort sind dieselben wie hier.

**Luftfahrtdatenbank: Quellen, Zyklen und Neuaufbau**: gültiger Zyklus, nächster Zyklus und Zyklus der Datenbank, dann eine Tabelle aller angehakten Quellen der aktiven Zonen (Zone, Quelle, Dateien, Zyklus oder Datum, Alter, Größe, Status). Ein Klick auf eine Zeile heftet ihre Zone an und aktualisiert die Quelle (Download, SIA-ZIP, MILAIP-PDF-Import, X-Plane-Ordner, MORA der Zone). Oben in der Tabelle: die Zahl der Prüfungen ohne Befund, dann die Probleme (fehlende Quellen) und die Warnungen (alte); „Probleme anzeigen“ behält nur diese. Die Tabelle ist nach Status sortiert (Probleme zuerst) und nach Spalten sortierbar.
„Alles neu berechnen“ baut die Datenbank mit allen aktiven Zonen neu auf (einige Sekunden; der Browser kann nach der Erlaubnis für den Ordner fragen); „Cache leeren“ leert sie. Derselbe Block wie im Kartenstudio.
Status der Tabelle:
- SIA: Zyklus aus den Dateinamen, „alt“, wenn er vor dem gültigen Zyklus liegt;
- X-Plane: Zyklus von „Custom Data“;
- heruntergeladene Dateien: „alt“ nach 28 Tagen (ein AIRAC-Zyklus) seit dem Herunterladen oder der letzten Prüfung ohne Änderung.

**MORA**: mehrere Quellen.
- Das berechnete Gitter (`data/sia/mora.csv`) hat Vorrang. „Einfache Neuberechnung“ übernimmt die Hindernisse des neuen Zyklus (offline); „Vollständige Berechnung“ berechnet Gelände und Gipfel neu (Netz, etwa eine Minute) für Einsatzräume und Missionen; „MORA der Zone berechnen“ (Feld) tut es über die Ausdehnung einer Zone, die übrigen Zellen bleiben.
- Wenn sich Zellen ändern: „mora.csv schreiben (alte archiviert)“, dann das Daten-Repository committen.
- Anderswo ergänzt das MORA-Gitter von X-Plane, wenn die Quelle X-Plane angehakt ist.

**Konsistenz**: „Prüfen“ kontrolliert Lufträume, Luftfahrzeuge, Flotte, Leistungen und Flugplätze der Missionen.
Die AIRAC-XML-Dateien (etwa 80 MB pro Zyklus) bleiben außerhalb des Repositorys, wie die Dateien der anderen Quellen. Die MORA-Werte sind berechnet, nicht zertifiziert.

### Caches

Dieser Block leert die Daten, die die Suite wieder aufbauen kann. Keine Benutzerdaten werden berührt (Register, Entwürfe, Profile, OFP, Sicherungen).

| Cache | Nach „Leeren“ |
|---|---|
| Datenindex (IndexedDB `defaIndex`) | gelöscht, dann beim nächsten Laden der Seiten aus den Dateien neu aufgebaut |
| Verwendete Flugplätze | bei der nächsten Verwendung aus der weltweiten Datenbank neu gelesen |
| Weltweite Flugplatzdatenbank (jsDelivr) | Leerung des CDN angefordert, dann Datei neu geladen |
| Analysierte SIA-Datenbank | aus dem SIA-Ordner neu einzulesen (eine Bestätigung wird verlangt) |
| Update-Prüfung | bei der nächsten Prüfung neu gelesen |
| Dateien der Anwendung (HTTP-Cache) | „Ohne Cache neu laden“: Dateien neu geladen, dann Seite neu geladen |

Leeren Sie den „Datenindex“, wenn eine Seite nach einer außerhalb der Suite, ohne den Starter, vorgenommenen Dateiänderung veraltete Daten anzeigt.
„Alles leeren und neu laden“ führt nach Bestätigung alle Leerungen nacheinander aus.

### Speicherplatz

Dieser Block erscheint nur, wenn das Zentrum aktiviert ist.
- „Belegten Platz berechnen“ misst den Missionsordner (`data/missions`): pro Mission, pro Dateityp und insgesamt. Er zeigt auch den vom Browser belegten Platz.
- „Luftfahrtdaten, nach Zone“: Platz des SIA-Ordners nach Zone (Quellen und Zahl der Dateien; mora.csv zählt für alle Zonen). Eine deaktivierte Zone behält ihre Dateien: zum Freigeben von Hand löschen.
- „Überzählige Karten löschen“ entfernt die Karten, die nicht mehr in der Liste ihrer Mission stehen.
- „Alle erzeugten Karten leeren“ und „PDFs löschen“ schaffen Platz; diese Dateien lassen sich aus dem YAML neu erzeugen.
- Jedes Löschen verlangt eine Bestätigung.
- Frühere Versionen und empfangene Texte bilden den Verlauf: Sie werden hier nie geleert.
- Der Missionsordner muss unter Quellen und Ordner erlaubt sein.

### Vollständige Sicherung

Dieser Block erstellt ein ZIP-Archiv aller lokalen Daten, mit einem Manifest (`manifest.json`, SHA-256-Prüfsummen).
- **Inhalt**:
  - der Browser, immer enthalten;
  - „Datenrepository (data/ …)“;
  - die Landeprotokolle (Ordner X-Plane);
  - die Leistungsprofile;
  - die mit „Ordner hinzufügen…“ hinzugefügten Ordner (ein Name und ein Dateifilter).
- Jede Quelle lässt sich an- oder abhaken. Die Option „schwere Dateien einschließen“ fügt die PNG-Karten, ZIP und PDF sowie die AIRAC-XML hinzu.
- „Vollständige Sicherung erstellen“ schreibt das Archiv in `sauvegardes/` des Ordners der lokalen Sicherung; ist dieser Ordner nicht erlaubt, wird das Archiv heruntergeladen.
- „Änderungen seitdem“ vergleicht die Ordner mit der letzten vollständigen Sicherung.
- **Vollständige Sicherung wieder einlesen**: „Archiv wählen…“. Jede Datei erhält einen Zustand: identisch, fehlt auf der Festplatte, älter oder neuer auf der Festplatte. Haken Sie die gewünschten Dateien an, dann „Auswahl wiederherstellen“.
- Vor dem Ersetzen werden die Dateien in `_avant_restauration/` ihres Ordners kopiert. Die Browserdaten werden zusammengeführt: Der neueste Wert gewinnt.
- Bewusst nicht gesichert: Schlüssel des Webdienstes, laufende Netzwerkverfolgung, analysierte SIA-Datenbank, Ordnerberechtigungen.

### Protokoll der Sicherungen und Wiederherstellungen

Diese Tabelle protokolliert jeden Vorgang an den Daten, mit Datum, Vorgang (und Seite), Herkunft und Ergebnis. Die Details der hinzugefügten (+) oder geänderten (~) Schlüssel lassen sich aufklappen.
Protokollierte Vorgänge:
- Wiedereinlesen der lokalen Daten (☰ › Lokale Daten › Wiederherstellen);
- vollständige Sicherung und Wiederherstellung einer vollständigen Sicherung;
- Entpacken des SIA-Exports und Archivierung der alten Zyklen;
- MORA-Neuberechnung.
Solange keiner dieser Vorgänge stattgefunden hat, ist das Protokoll leer.

### Flotte (bekannte Flugzeuge)

Diese Datenbank (`data/references/aircraft_fleet.js`) listet die in den Berichten angebotenen Flugzeuge: „Betreiber“, „ICAO-Muster“, „Variante“, „Kennzeichen“, „Code“, „Nummer“, „Rufzeichen“ (durch Kommas getrennt), „Basis“, „Einsatzbereit“.
- **„Flottenseite der Website einfügen…“**:
  1. Öffnen Sie die Seite „Virtuelle Flotte“ der Website der Gesellschaft (Link im Fenster);
  2. drücken Sie Strg+A und dann Strg+C, und fügen Sie in das Feld ein (Strg+V); Sie können auch „Zwischenablage lesen“ oder „oder gespeicherte Seite…“ verwenden;
  3. klicken Sie auf „Lesen“.
- Ein Flugzeug der Seite ersetzt das der Datei (gleiches Kennzeichen), behält aber seine zusätzlichen Rufzeichen. Flugzeuge, die auf der Seite fehlen, bleiben erhalten.
- Die Statuszeile nennt die Anzahl der aktualisierten, hinzugefügten und beibehaltenen Flugzeuge. Prüfen Sie, dann „Im Repository speichern“.
- **Gemeinsame Schaltflächen der Repository-Datenbanken**: „In diesem Browser anwenden“ (lokale Änderungen haben Vorrang), „Im Repository speichern“ (schreibt die Datei in den Repository-Ordner, zu committen), „Herunterladen“, „Änderungen verwerfen“, „Zurück zur Repository-Datei“.
- **Automatisch**: Der Starter liest die öffentlichen Seiten Flotte und Flugbuch der Website selbst (ohne Anmeldung), einmal am Tag beim Öffnen einer Seite, nach denselben Regeln wie beim Einfügen; er schreibt `data/references/aircraft_fleet.js` und `defa_reference.js`, die mit „Synchronisieren“ zu senden sind. Einstellung und „Jetzt aktualisieren“: unter der Liste der Luftfahrzeuge im Reporting (unten). Einfügen und Skript (`python AircraftDB/update_fleet.py Flotte.html`) bleiben möglich.
- **Wo**: Einstellungen › Zentrum › „Flotte (bekannte Luftfahrzeuge)“, gesperrt, solange das Zentrum gesperrt ist (vorher unter Wartung).
- **Luftfahrzeuge im Reporting**: unter der Flotte alle Luftfahrzeuge, die im Missionsjournal fliegen (Typ, Rufzeichen, Betreiber, Flüge, letzter Flug). Kästchen „Privat“, standardmäßig angehakt: einzelnes Luftfahrzeug, außerhalb der SOG-Flotte; Abhaken nimmt es in die Flotte auf (es wird zuweisbar), erneutes Anhaken nimmt es wieder heraus. Dann „Im Repository speichern“: Die Flotte und der Index der einzelnen Luftfahrzeuge (`data/references/aircraft_personal.js`) werden zusammen geschrieben. Ein Luftfahrzeug der Flotte-Seite der Website kommt bei der nächsten Aktualisierung in die Flotte zurück.
- **Typen und Leistungen**: „Typen und Leistungen aktualisieren“ ergänzt die in der Datenbank unbekannten Typen (Flotte und Reporting); die tägliche Aktualisierung von der Website tut es ebenfalls, im Hintergrund, für die Flotte, das Flugbuch und die einzelnen Luftfahrzeuge.
- **Flugplatz (Basis) eines Luftfahrzeugs**: Er ändert sich nur durch die Aktualisierung von der Website oder durch einen Bericht aus einem Missionsbefehl mit einem tatsächlichen Landeflugplatz; ein Bericht ohne Missionsbefehl oder ein Landing-Report verschiebt das Luftfahrzeug nicht. Ein aus dem Reporting hinzugefügtes Luftfahrzeug kommt ohne Flugplatz. Der aktuelle Flugplatz ist die Spalte „Standort“ der Flotte-Seite der Website (mit dem Datum ihrer letzten Änderung gespeichert), außer wenn ein neuerer Bericht aus einem Missionsbefehl einen tatsächlichen Landeflugplatz angibt (`missions/aircraft_positions.json`); von dort starten die Überführungen (Zuweisung, ODV-Planung, Einsatztafel, Luftfahrzeugblatt).

### Luftfahrzeugmuster (ICAO-Datenbank)

Diese Datenbank (`AircraftDB/aircraft_db.js`) enthält zwei Tabellen:
- „Muster“: „Kennung“, „Modell“, „ICAO-Beschreibung“, „WTC“, „Flügel“, „Quelle“;
- „Aliasse (Gebrauchsname → Kennung)“.
Die Änderungen werden auch in `aircraft_overrides.json` übertragen. Die Schaltflächen sind die der Repository-Datenbanken.
Das „Vorgehen“ nennt die Befehle des Aktualisierungsskripts, die in `AircraftDB` auszuführen sind: `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. Die Datenbank wird nicht mit der Suite veröffentlicht (Daten von ICAO und EUROCONTROL): Die Karte „Luftfahrzeugtypen und Leistungen“ unter Einstellungen › Wartung › Referenzen und Abhängigkeiten ergänzt sie auf diesem Rechner Typ für Typ, nie alles auf einmal — ein eingegebener Code („Hinzufügen / aktualisieren“), die unbekannten Typen, die Typen der Flotte oder der Missionen (ODV, Register); dafür sind der Starter und das Netz nötig, danach die Seite neu laden (am Ende angeboten). Die Karte steht oben im Block; bei leerer Datenbank ist sie umrandet, eine Benachrichtigung meldet es und „Datenbank ergänzen“ übernimmt mit einem Klick die Typen der Flotte und der Missionen. Die geschriebenen Dateien (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) erfordern nichts: Die Seiten lesen sie; nicht versioniert, werden sie auf jedem Rechner ergänzt oder kopiert.
Grenze: Ein hier gelöschtes Muster kann bei der nächsten Aktualisierung zurückkehren, wenn es zur Grundliste des Skripts gehört.

### Rufzeichen-Zuordnung

Diese Datenbank (`data/references/callsigns.js`) verknüpft das vollständige Rufzeichen (in den Berichten gespeichert) mit seiner Flugplanform (Feld 7) und dem ICAO-Betreiber (OPR/, Feld 18).
- Tabelle „Rufzeichen“: „Vollständiges Rufzeichen“, „Flugplan“, „Andere Formen“, „Organisation“, „OPR/“, „Muster“, „Rolle“, „Allgemein“, „Sprechfunk“, „Notiz“.
- Tabelle „Organisationen → ICAO-Kennung (OPR/)“.
- Es gibt kein Skript: Diese Seite (oder die von Hand bearbeitete Datei) ist die Quelle.
- Zum Befüllen: Die in den Berichten korrigierten Formen landen in „Gelernte Rufzeichen“, und die im Journal gesehenen Serien kommen über „Hinzufügen“ oder „Ergänzen“.

### Referenz (anonymisiert, im Repository)

Diese Datenbank (`data/references/defa_reference.js`) erfasst die Piloten (Kürzel) und die Flugzeuge der, ohne Flüge und Missionen. Sie dient als Eingabehilfe und ist nicht vollständig.
- Tabelle „Flugzeuge“: Kennzeichen, Muster, Variante, Status, Zuordnung (änderbar), letzter bekannter Flugplatz, Indienststellung, verwendete Rufzeichen, erster und letzter Flug, Flüge, Flottenblatt, Notiz.
- Tabelle „Piloten“: Kürzel, erster und letzter Flug, Flüge, Muster, Notiz.
- Aktualisierung:
  1. Laden Sie das Flugbuch (nächste Rubrik);
  2. klicken Sie auf „Referenz aktualisieren (anonymisiert)“: Nichts wird gelöscht, und manuelle Eingaben bleiben erhalten;
  3. „Im Repository speichern“, dann committen.
- Alternative per Skript: `tools/defa_reference.py`.

### Flugbuch (geflogene Flüge)

Diese Datenbank ist vom Missionsregister getrennt. Sie wird nur in diesem Browser gehalten: außerhalb des Repositorys und der lokalen Sicherung, da sie Kürzel enthält.
- „Flugbuch laden / aktualisieren…“ akzeptiert die kopierte oder gespeicherte Seite „Log des vols“ oder einen CSV- / JSON-Export. Die Flüge werden ohne Duplikate zusammengeführt.
- „Rufzeichenserien“: „Hinzufügen“ legt die Zeile in der Rufzeichen-Zuordnung an; „Ergänzen“ fügt dort die gesehenen Formen und Muster hinzu.
- „Flüge“: Volltextfilter, höchstens 300 angezeigte Zeilen.
- Aktionen:
  - „Referenz aktualisieren (anonymisiert)“;
  - „CSV exportieren“;
  - „JSON exportieren (neu ladbar)“;
  - „Datenbank aus diesem Browser löschen“.

### Zusammenführungen und Umbenennungen (Piloten, Flugzeuge)

Diese Tabelle listet die Entsprechungen, die über „Zusammenführen mit… / umbenennen“ aus den Datenblättern angelegt wurden. Spalten: „Typ“ (Pilot oder Flugzeug), „Alt“, „Wird zu“, „Ergebnis“.
Diese Entsprechungen gelten für das neu geladene Journal, die Referenz und den Katalog.
„Löschen“ entfernt eine Entsprechung nach Bestätigung.
Eine Schleife (A → B und B → A) ist hervorgehoben: Sie vertauscht die beiden Namen. Löschen Sie den fehlerhaften Eintrag und führen Sie die Zusammenführung erneut aus dem Datenblatt aus.

### Missionsregister (Einsatzdatenbank)

Das einzige Register `data/cr/missions.yaml` umfasst alle Familien. Es ist die maßgebliche Quelle der Auswertungen.
- Eine Zeile pro Familie, mit der Anzahl der Missionen und den Schaltflächen „Bearbeiten (YAML)“, „YAML“, „CSV“, „Auswertung“.
- „Vollständiges Register bearbeiten (YAML)“ öffnet den Editor; „Prüfen und speichern“ prüft das YAML vor dem Schreiben. Im vollständigen Register muss jede Mission ihre Familie haben.
- „Registerordner…“ wählt den Ordner, in den geschrieben wird. Ohne diesen Ordner bleibt die Speicherung im Browser.
- „Register herunterladen (YAML)“, „CSV exportieren (Tabellenkalkulation)“.
- Um eine einzelne Mission zu korrigieren, gehen Sie besser über ihren Bericht (Klick auf die Zeile der Auswertung).

### Flugzeuge aus erfassten Missionen

Diese Datenbank wird vom Browser gehalten (`missionAircraftRegistry:v1`). Die Flugzeuge werden bei jedem Speichern einer Mission dort gespeichert; die neueste Angabe hat Vorrang vor der Flotte.
Spalten: Kennzeichen, Muster, Variante, Kategorie, Rufzeichen, Code, Betreiber, Datum.
Schaltflächen: „Speichern“ (im Browser) und „Änderungen verwerfen“.

### Lokal hinzugefügte Muster

Diese Datenbank listet die in Missionen eingegebenen unbekannten Muster: Kennung, Modell, Kategorie, Datum des Hinzufügens.
„In die Repository-Datenbank übernehmen“ kopiert diese Muster in „Luftfahrzeugmuster (ICAO-Datenbank)“ und öffnet diese Datenbank. Danach ist sie noch anzuwenden oder im Repository zu speichern.

### Gelernte Rufzeichen (korrigierte Flugplanformen)

Diese Datenbank listet die in den Berichten von Hand korrigierten Flugplanformen: vollständiges Rufzeichen, Flugplan, Datum.
„In die Repository-Datenbank übernehmen“ fügt sie der „Rufzeichen-Zuordnung“ hinzu und öffnet diese Datenbank. Prüfen Sie, dann anwenden oder speichern.

### Verwendete Flugplätze (Cache)

Diese Datenbank speichert die Koordinaten und Zeitzonen der bereits verwendeten Flugplätze, für Sonnenauf- und -untergang und das Wetter: ICAO, Name, Land, Breite, Länge, Höhe (ft), Zeitzone.
Sie lässt sich von Hand korrigieren („Speichern“). Sie wird auch unter „Caches“ geleert: Sie baut sich dann aus der weltweiten Datenbank neu auf.

## Daten synchronisieren

Die gemeinsamen Daten (Verfügbarkeiten, Benutzer, Konfiguration, Missionen und Zuweisungen, Berichte, ATC-Sitzungen) liegen in `data/`. Dieser Ordner ist ein vom Code getrenntes Git-Repository. Die Schaltfläche „Synchronisieren“ im Kopf tauscht ihn mit den anderen Rechnern aus.

### Die Schaltfläche „Synchronisieren (n)“

- Die Schaltfläche erscheint nur, wenn die Suite vom Starter bereitgestellt wird und `data/` ein Git-Repository ist.
- (n) addiert die zu sendenden Änderungen dieses Rechners und die zu empfangenden Commits. Das entfernte Repository wird in der unter Einstellungen › Wartung › Versionen und Synchronisation eingestellten Häufigkeit neu gelesen (standardmäßig alle 30 Minuten; auf jeder Seite, 3-mal am Tag, einmal am Tag); zwischen zwei Prüfungen zeigt die Schaltfläche den letzten bekannten, im Browser gehaltenen Zustand, und der Starter antwortet mit seiner letzten Erhebung. Der Tooltip nennt den Branch und das Datum der letzten Synchronisierung.
- Die Synchronisierung wird von Hand gestartet, mit einem Klick:
  1. Die im Browser gehaltenen Dateien werden zuerst in den Ordner geschrieben;
  2. der Starter committet im Namen des angemeldeten Kürzels (einschließlich übernommenem Benutzer);
  3. er holt und führt die Änderungen der anderen Rechner zusammen und sendet dann.
- Ohne Kürzel wird die Synchronisierung abgelehnt: Stellen Sie es unter Einstellungen › Mein Profil ein.
- Am Ende nennt eine Benachrichtigung die Anzahl der gesendeten und empfangenen Dateien, und die Seiten lesen die geänderten Dateien neu.
- **Abstand zur Sicherung**: Die Schaltfläche wird orange (Änderung seit über 48 h nicht gesendet, 20 oder mehr zu sendende Dateien, 10 zu empfangende Commits, nicht gesendeter Commit, außerhalb der synchronisierten Daten geänderte Datei) oder rot (`data/` ohne Git-Repository oder ohne entferntes Repository, laufende Zusammenführung, hohe Schwellen: 100 Dateien, 7 Tage, 50 Commits); Gründe im Tooltip, Warnung als Benachrichtigung einmal pro Sitzung. Ohne Git-Repository (außer Testdaten) meldet es eine Schaltfläche „⚠ Sicherung“. Schwellen einstellbar: `data/config/suite.json`, Schlüssel `sync`.

### Erste Synchronisierung

Der erste Klick sendet alles, was in `data/` nie committet wurde. Existiert der entfernte Branch nicht, legt er ihn an.
Meldung „Nur lokaler Commit: kein entferntes Repository“: `data/` hat kein entferntes Repository, also wird nichts geteilt.
Die Git-Zugangsdaten sind die des Systems (SSH-Schlüssel, Anmeldeinformationsverwaltung); die Suite speichert keine.

### Mehrere Benutzer, bis der zentrale Server kommt

- Jeder Rechner **empfängt** bei jedem Start (der Starter führt ein `git pull` von `data/` aus) und **sendet** mit der Schaltfläche
  „Synchronisieren“ (Commit, Zusammenführung mit den anderen, Senden).
- Jeder sendende Rechner braucht: Git, die vom Starter geöffnete Suite, ein **Schreibrecht auf das Datenrepository**
  (ein Konto pro Person beim Git-Hoster oder ein gemeinsames Konto) und einen SSH-Schlüssel oder in Git gespeicherte
  HTTPS-Zugangsdaten.
- Die Adresse des Repositorys wird beim Erststart angegeben und geprüft (Schritt 1, Karte „Git-Repository zur
  Datensynchronisierung“): nie blockierend, ein nicht antwortendes Repository wird nur gemeldet.
- Ein Rechner ohne Git oder Schreibrecht kann in einen **gemeinsamen Ordner** (Synology, OneDrive…) schreiben, den ein
  ausgestatteter Rechner synchronisiert. Der zentrale Server wird diese Voraussetzungen beseitigen: Ein Konto wird genügen
  ([Roadmap](../technique/ROADMAP.md), Schritt 2).

### Konflikte und Ordner `_conflits/`

Der Starter löst Konflikte Datenblatt für Datenblatt, ohne je etwas zu verlieren:
- **auf zwei Rechnern geändertes Datenblatt**: Das neueste gewinnt. Die andere Version wird in `<dossier>/_conflits/` aufbewahrt und durch eine Benachrichtigung gemeldet;
- **Zuweisungen**: Zuweisung für Zuweisung zusammengeführt;
- **Zuweisungsprotokoll**: Beide Seiten werden vereint;
- **auf einer Seite gelöschte und auf der anderen geänderte Datei**: Die geänderte Version wird behalten.
Nach einer Konfliktbenachrichtigung:
1. Öffnen Sie die angegebene Kopie in `_conflits/`;
2. übertragen Sie von Hand, was in der behaltenen Datei fehlt;
3. synchronisieren Sie erneut und löschen Sie dann die Kopie.
Das Berichtsregister (`cr/missions.yaml`) wird von Hand zusammengeführt.
Meldung „In data/ läuft ein Merge oder ein Rebase“: Schließen Sie den Git-Vorgang ab oder brechen Sie ihn ab (`git -C data merge --abort`), dann beginnen Sie erneut.
Details, Schemata und risikolose Tests: [Architektur der Synchronisierung](../technique/SYNCHRONISATION.md).

## Starter, Daten und Sicherungen

Die Suite wird von einem kleinen lokalen Server bereitgestellt, der mitgeliefert wird. Die Daten liegen an drei Orten: im Ordner `data/`, im Browser und in der Datei der lokalen Sicherung.

### Suite starten

- **Windows**: Doppelklicken Sie auf `lancer.cmd`. **macOS / Linux**: `sh lancer.sh`. Beide rufen `tools/launch.py` auf, das drei Schritte durchläuft:
  1. **Python**: wird gesucht und bei Bedarf installiert (mindestens Version 3.8).
  2. **Daten**: Ist `data/` vorhanden, wird es aktualisiert (`git pull --ff-only`, ohne bei einem Fehler zu blockieren). Andernfalls wird ein neben dem Starter abgelegtes `.zip`-Archiv entpackt; fehlt auch dieses, wird das Datenrepository geklont.
  3. **Server und Browser**: Der Server startet auf `http://127.0.0.1`, am ersten freien Port ab 8000, dann öffnet sich der Browser. Läuft die Suite bereits, öffnet sich nur der Browser.
- Lassen Sie das Fenster des Starters während der Nutzung offen; schließen Sie es (oder Strg+C), um die Suite zu beenden.
- Optionen: `--port 8010`, `--page apps/…`, `--no-browser`, `--no-data`, und `--data <dossier>`, um eine andere Kopie der Daten unter `/data/` bereitzustellen, ohne Klon oder Aktualisierung. Die Option `--data` dient Tests, zum Beispiel der Synchronisierung.
- Empfohlener Browser: Chrome oder Edge. Für Brave siehe [Installation](../INSTALL.md).

### Der Ordner `data/`

- Anwendung und Daten sind getrennt. `data/` ist ein eigenes, privates Git-Repository im Ordner der Anwendung; das Code-Repository ignoriert es.
- Ohne Zugang zum Datenrepository startet die Suite mit den Beispielen aus `examples/`. Sie können auch ein Datenarchiv per E-Mail anfordern.
- Ein synchronisierter Ordner (Synology Drive, OneDrive…) eignet sich, sofern die **Ordner `.git` von der Synchronisierung ausgeschlossen** sind.
- Die Dateien in `data/` sind maßgeblich: Der Index des Browsers baut sich aus ihnen neu auf (Wartung › Caches › „Datenindex“).

### Sicherungen

- **Browserdaten**: über ☰ › Lokale Daten.
  - „Sicherungsordner…“ wird einmal gewählt, idealerweise in einem synchronisierten Ordner.
  - Die Datei `defa_local_store.yaml` wird danach automatisch geschrieben.
  - „Wiederherstellen / abgleichen“ führt diese Datei mit dem Browser zusammen: Die neueste Angabe gewinnt.
- **Vollständige Sicherung** (Browser und Dateien der erlaubten Ordner): Einstellungen › Wartung › Vollständige Sicherung (siehe oben).
- Versionieren Sie `defa_local_store.yaml` nicht: Die Datei enthält personenbezogene Daten.
- Code-Update: Wartung › Updates, oder `python tools/update_suite.py update`. Ein Code-Update berührt die Daten nicht.
Weiterführend: [Betriebshandbuch](../MANUEL_EXPLOITATION.md), § 2 und § 3; [Installation](../INSTALL.md); [Daten der Suite](../DONNEES.md).
