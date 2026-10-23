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

**Öffnen in.** Unter dem Ergebnis bereitet „Öffnen in ▾“ denselben Flug anderswo vor, in einem neuen Tab: SimBrief
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

<!-- fr: f362e323f497 -->

<!-- chapter: maps -->
# Karte

Ihren Flug auf einer Luftfahrtkarte und in seinem Vertikalprofil sehen, oder die Karten einer Mission: Lufträume,
Flugplätze, Funkfeuer, Luftstraßen, Mindesthöhen. Die Karte dient nur zum Ansehen: Sie ändert nichts.

## So geht’s

**Der geplante Flug.** Die Karte zeigt den in Kraftstoff vorbereiteten Flug: Abflug, Routenpunkte, Ankunft, und den
Ausweichflugplatz grau gestrichelt. Oben fasst eine Zeile ihn zusammen: Abflug und Ankunft, Ausweichflugplatz,
Flugfläche, Entfernung, Luftfahrzeugtyp. Ändert sich der Flug in Kraftstoff, folgt die Karte von selbst.

**Die Karte und was sie zeigt.** Rund um die Route: die Lufträume, die sie durchquert oder streift (Flugbeschränkungs-,
Gefahren- und Sperrgebiete, kontrollierte Lufträume), die unteren oder oberen Luftstraßen je nach Ihrer Flugfläche,
die Flugplätze und die Funkfeuer, und in jedem Ein-Grad-Feld die Mindestsicherheitshöhe (die braune Zahl, in
Tausenden und Hunderten Fuß: „3⁵“ bedeutet 3 500 ft). Die kleinen violetten Zahlen entlang der Route sind die
Entfernungen ab dem Abflug, in nautischen Meilen. Verschieben Sie die Karte mit einem Finger, spreizen Sie zwei Finger
zum Zoomen; „Zentrieren“ kehrt zur ganzen Route zurück. Von weitem gesehen zeigt die Karte nur, was nahe der Route
liegt; zoomen Sie hinein, um alles zu sehen.

**Profil und Cursor.** Unter der Karte schneidet das Vertikalprofil die Route von Anfang bis Ende: das Gelände, die
Lufträume, in die Sie auf der geplanten Höhe einfliegen, und die Flugbahn in Violett. Fahren Sie mit dem Finger über
das Profil: Ein blauer Cursor folgt ihm, und derselbe Cursor stellt sich auf der Karte ein. Tippen Sie auf die Route
auf der Karte, um ihn dorthin zu setzen. Die Zeile unter dem Profil sagt, was unter dem Cursor liegt: Entfernung ab dem
Abflug, geplante Höhe, Geländehöhe und der Luftraum, in dem Sie sich an dieser Stelle befinden.

**Steig- und Sinkflug.** Die violetten Rauten markieren das Ende des Steigflugs (TOC) und den Beginn des Sinkflugs
(TOD), auf der Karte wie im Profil. Sie stammen aus der Berechnung in Kraftstoff; ohne sie schätzt die Karte sie mit
üblichen Steig- und Sinkraten.

**Die Missionskarten.** Die erste Liste oben wählt, was die Karte zeigt: den geplanten Flug oder eine Mission der
Fluggesellschaft. Für eine Mission wählt eine zweite Liste unter ihren Karten (Übersicht, Ziel, Detail…). Jede Karte
wird wie im Studio neu gezeichnet: gleicher Rahmen, gleiches Anzeigeprofil, mit den Punkten der Mission, ihren
schraffierten Gebieten und ihrer Route. Das Vertikalprofil zeigt dann das der Mission.

**Die Route ändern.** Die Karte ändert die Route nicht: „Route bearbeiten“ öffnet Kraftstoff, wo Sie sie
überarbeiten. Zurück auf der Karte ist der neue Flug schon da.

## Ohne Netz

**Was ohne Netz funktioniert.** Karte, Lufträume, Flugplätze, Funkfeuer und Profil bleiben offline verfügbar für die
bereits angesehenen Gebiete und für die unter Einstellungen › Offline-Daten behaltenen. Behalten Sie dort das Gebiet
Ihres Flugs, bevor Sie losfliegen: Alles ist dann da, auch ohne Netz.

**Die Hintergrundkarte.** Der Hintergrund (Straßen, Städte, farbiges Gelände) kommt aus dem Internet. Ohne Netz wird
die Karte auf einem einfarbigen Hintergrund mit den Ländergrenzen gezeichnet, und eine Zeile weist darauf hin; alles
andere ist da.

**Das Gelände im Profil.** Das Gelände im Profil kommt ebenfalls aus dem Internet. Ohne Netz zeigt das Profil
stattdessen die Mindestsicherheitshöhe jedes durchquerten Felds (braun gestrichelt), und eine Zeile weist darauf hin.

## Sonderfälle

**Kein Flug.** Ohne vorbereiteten Flug ist die Karte ausgeblendet und bietet „Kraftstoff öffnen“ an. Die
Missionskarten bleiben über die Liste oben erreichbar.

**Luftfahrtdatenbank fehlt.** Wurde die Luftfahrtdatenbank noch von keinem Gerät der Fluggesellschaft veröffentlicht,
zeigt die Karte nur die Route und sagt es.

**Gebiet nicht behalten.** Offline, über einem nie angesehenen und nicht behaltenen Gebiet, hat die Karte nichts zu
zeigen; die Schaltfläche „Offline-Daten“ öffnet die Einstellungen, um es beim nächsten Mal zu behalten.

**Anderer Zyklus.** Jede Missionskarte merkt sich den Datenzyklus, mit dem sie erstellt wurde. Stammt die aktuelle
Datenbank aus einem anderen Zyklus, sagt es eine Zeile: Die Lufträume können sich seitdem geändert haben.

**Alte Mission.** Eine vor dieser Version gespeicherte Mission enthält ihr Anzeigeprofil nicht. Die Karte nimmt dann
das übliche Profil des Kartentyps (detailliert für ein Ziel oder ein Detail, sonst vereinfacht) und weist darauf hin.
Es genügt, die Mission im Studio zu öffnen und zu speichern, damit sie danach ihr eigenes behält.

<!-- fr: 83aa8c905f0e -->

<!-- chapter: report -->
# Bericht

Den Bericht eines Flugs mit wenigen Berührungen schreiben, mit oder ohne Einsatz: Das Modul übernimmt, was es über
Ihren Flug schon weiß, Sie ergänzen, Sie speichern — und, wenn Sie möchten, wird der Flug im selben Zug auf der Website
der Fluggesellschaft eingetragen.

## So geht’s

**Drei Schritte.** Der Bericht wird in drei Schritten ausgefüllt: Flug, Einsatz, Ergebnis. Auf einem Telefon ein
Schritt nach dem anderen („Weiter“ unten); auf einem Computer alle drei nebeneinander. Nichts ist Pflicht: Was fehlt,
wird im letzten Schritt genannt, ohne das Speichern je zu blockieren.

**Der letzte Flug.** Ist Ihre IVAO- (oder VATSIM-)Kennung eingestellt (⚙) und das Gerät online, schlägt eine Karte
Ihren letzten Flug im Netz vor: „Übernehmen“ füllt Luftfahrzeug, Rufzeichen, Strecke und die aus der Spur gewonnenen
Zeiten aus. Der in Kraftstoff oder Karte vorbereitete Flug wird auf die gleiche Weise vorgeschlagen („Aktueller Flug“).

**Die anderen Quellen.** Klappen Sie „Andere Quellen“ auf, um Ihren letzten IVAO- oder VATSIM-Flug, Ihren
SimBrief-Flugplan oder einen eingefügten Text zu übernehmen: einen ICAO-Flugplan, die Seite eines Flugs aus dem
IVAO-Tracker oder von StatSim, ein METAR. Nur leere Felder werden ausgefüllt; neben jedem steht seine Quelle. Liefert
eine Quelle etwas anderes für bereits ausgefüllte Felder, bietet eine Schaltfläche an, sie zu ersetzen.

**Der Einsatz.** Im zweiten Schritt: die Familie (vorgeschlagen nach Ihrem letzten Bericht), die Serie, die Kennung des
Einsatzes, wenn der Flug einem folgt, dann die Blöcke der Familie. Manche Blöcke erscheinen nur für eine Serie (zum
Beispiel VIP oder Überführung bei den Sondereinsätzen).

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

<!-- fr: b8fc73c91418 -->

<!-- chapter: flightlog -->
# Meine Flüge

Alle Ihre vergangenen Flüge an einem Ort, eine Zeile pro Flug, vom neuesten zum ältesten: Ihre Berichte, das Flugbuch
der Website der Fluggesellschaft und Ihre IVAO- oder VATSIM-Verbindungen, ohne Doppelungen.

## So geht’s

**Die Summen.** Oben drei Felder: die Anzahl der Flüge, die Blockstunden und die Flüge, die noch keinen Bericht haben,
für den gewählten Zeitraum. Direkt darunter die drei Muster, die Sie am meisten geflogen sind.

**Die Filter.** Wählen Sie den Zeitraum (7 Tage, 31 Tage, 1 Jahr, alle), suchen Sie nach einem Rufzeichen, einem
Muster, einem Kennzeichen, einem Flugplatz, einem Einsatz oder einer Berichtsnummer, oder setzen Sie das Häkchen bei
„Ohne Bericht“, um nur die Flüge zu sehen, die auf einen warten. Ihre Auswahl bleibt auf dem Gerät.

**Die Liste.** Eine Zeile pro Flug: Datum, Rufzeichen, Route und Blockzeit. Ein orangefarbener Punkt markiert einen Flug
ohne Bericht. Auf einem Computer zeigt die Zeile auch das Luftfahrzeug und die Nummer des Berichts.

**Die Einzelheiten eines Flugs.** Tippen Sie auf eine Zeile, um sie aufzuklappen: woher der Flug stammt (Bericht,
Website-Flugbuch, IVAO- oder VATSIM-Netz), seine Uhrzeit, das Luftfahrzeug, der Einsatz und die Bemerkungen.

**Den Bericht schreiben oder öffnen.** Bei einem Flug ohne Bericht öffnet „Bericht schreiben“ einen neuen Bericht,
bereits mit diesem Flug ausgefüllt — Datum, Luftfahrzeug, Rufzeichen, Flugplätze — und mit einer vorgeschlagenen
Einsatzart. Bei einem Flug mit Bericht öffnet „Bericht öffnen“ ihn erneut zum Bearbeiten.

**Mehr.** Klappen Sie „Mehr“ auf, um die gefilterte Liste als CSV (Tabellenkalkulation) zu exportieren oder Ihre IVAO-
und VATSIM-Verbindungen neu zu lesen.

## Woher die Flüge kommen

- **Ihre Berichte**: die, die Sie geschrieben haben, einschließlich derer aus der vollständigen Suite. Ein Bericht der
  vollständigen Suite öffnet sich in der vollständigen Suite.
- **Das Website-Flugbuch**: Ihre Zeilen im „Log des vols“ der Fluggesellschaft, übernommen vom Modul Website (Einfügen
  oder Lesen durch den Starter).
- **Das Netz**: Ihre IVAO- und VATSIM-Verbindungen der letzten sieben Tage (Kennungen eingestellt unter ⚙). Sie werden
  angezeigt, nie als Flüge gespeichert.
- **Ohne Doppelungen**: Derselbe Flug (gleiches Datum, gleiches Rufzeichen, gleiches Kennzeichen) erscheint nur einmal.
  Der Bericht geht vor dem Flugbuch, das Flugbuch vor dem Netz; ein Bericht ohne Stunden übernimmt die Blockzeit aus
  dem Flugbuch.

## Sonderfälle

- **Offline**: Die bereits empfangenen Berichte und das Flugbuch werden angezeigt; das Netz wartet auf die Verbindung.
- **Ohne Starter**: IVAO und VATSIM lassen sich nur über den Starter eines Rechners neu lesen.
- **Ohne Kürzel**: Stellen Sie es ein (⚙); es wählt Ihre Berichte und Ihre Zeilen im Flugbuch aus.

<!-- fr: 99d023557d9a -->

<!-- chapter: website -->
# Website der Fluggesellschaft

Die Verbindung zwischen der App und der Website der Fluggesellschaft, die keine Schnittstelle für Anwendungen hat: Ihr
Flugbuch und ihre Flotte kommen per Kopieren und Einfügen (oder über den Starter eines Rechners), und die Adresse der
Website wird hier eingestellt, einmal für die ganze Fluggesellschaft.

## So geht’s

**Mein Flugbuch.** Öffnen Sie auf der Website die Seite „Log des vols“ (der Link „Seite öffnen“ führt dorthin), alles
markieren, kopieren, dann in das Feld der Karte einfügen und „Lesen“. Nur Ihre Zeilen, die Ihres Trigramms, werden
behalten; sie speisen Meine Flüge.

**Flotte der Fluggesellschaft.** Derselbe Handgriff mit der Seite „Flotte“ der Website: die Luftfahrzeuge, ihre
Rufzeichen, ihre Basis und ihr Standort. Bericht und Karte nutzen sie.

**Nichts wird ohne Sie geschrieben.** Nach „Lesen“ sagt eine Vorschau, was sich ändert: neue, geänderte, unveränderte
Zeilen oder Luftfahrzeuge (und beim Flugbuch die Zeilen der anderen Piloten, ignoriert). „Speichern“ schreibt,
„Abbrechen“ lässt alles wie zuvor.

**Über den Starter lesen.** Auf einem Rechner, auf dem die App vom Starter bereitgestellt wird, holt „Über den Starter
lesen“ die Seite der Website für Sie, ohne Einfügen, und zeigt dann dieselbe Vorschau. Wo die Website nicht erreichbar
ist (Telefon ohne Starter), verschwindet die Schaltfläche und das Einfügen bleibt der Weg.

**Die Fluggesellschaft.** Die Karte Fluggesellschaft gibt den Namen, die Adresse der Website und den Pfad ihrer Seiten
an („Flug eintragen“, Flugbuch, Flotte, Seite eines Luftfahrzeugs). Sie wird an einem Computerbildschirm
bearbeitet und auf einem Telefon nur angezeigt. Diese Einstellung gilt für die ganze Fluggesellschaft; sie schaltet im
Bericht „Speichern und auf der Website eintragen“ frei.

## Gut zu wissen

- **Die App schreibt nie auf die Website** und kennt Ihr Passwort nie: Sie melden sich selbst auf der Website an, und
  das Lesezeichen „→ Vol“ des Berichts füllt das Formular aus, ohne es abzusenden.
- **HTML einfügen**: Wer die Seite aus dem Browser kopiert, behält die Links der Luftfahrzeuge; „Aus der Zwischenablage
  einfügen“ liest sie direkt, wenn der Browser es erlaubt.
- **Das Flugbuch wird ergänzt**: Die Zeilen, die die Seite der Website nicht mehr zeigt (frühere Seiten), bleiben
  erhalten.
- **Die Flotte wird zusammengeführt**: Ein Luftfahrzeug der Seite ersetzt das schon bekannte (seine zusätzlichen
  Rufzeichen bleiben erhalten); die nicht auf der Seite stehen, bleiben.

## Sonderfälle

- **Ohne Trigramm**: Das Flugbuch kann Ihre Zeilen nicht auswählen; stellen Sie es ein (⚙).
- **Adresse nicht eingestellt**: Die Links zu den Seiten und das Eintragen des Flugs warten auf die Karte
  Fluggesellschaft.
- **Offline**: Das Einfügen funktioniert immer; was gespeichert ist, geht bei der nächsten Synchronisierung hinaus.

<!-- fr: cfdf162727aa -->

<!-- chapter: settings -->
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
