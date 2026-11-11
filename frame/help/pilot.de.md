<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilot — Handbuch

Die App Pilot vereint die Werkzeuge, um einen Flug vorzubereiten und zu verfolgen: Kraftstoff und Flugfläche, Karte,
Bericht, meine Flüge, Übergabe an die Website der Fluggesellschaft. Sie funktioniert auf einem Telefon wie auf einem
Computer, mit oder ohne Netz.

## Erster Start

- **Die Verben.** Auf einem Telefon bietet die untere Leiste fünf Einträge: Vorbereiten, Karte, Wetter, Bericht, Flüge.
  Tippen Sie einen bereits gewählten Reiter, der mehrere Bildschirme bündelt, noch einmal an: Darüber öffnet sich eine kleine
  Liste (Vorbereiten: Kraftstoff und Leistungsdatenblätter). Auf einem Bildschirm ist jedes Werkzeug ein Verb der linken
  Spalte. Die Adresse eines Werkzeugs (`#fuel`, `#report`…) genügt, um zu ihm zurückzukehren. Die Einstellungen sind die
  Schaltfläche ⚙ der Kopfzeile. Der Name der Anwendung oben links öffnet die Liste der Anwendungen: Pilot, Gesellschaft (die Missionen der Fluggesellschaft) und, auf der Stufe Vollständig,
  Wartung (dasselbe Flugzeug in Rot); ein Tippen wechselt dorthin.
- **Ihre Identität.** Stellen Sie unter ⚙ Einstellungen Ihr Kürzel und Ihre IVAO-, VATSIM- und SimBrief-IDs ein: Die
  Werkzeuge nutzen sie zum Vorausfüllen.
- **Die Stufe.** Ebenfalls in den Einstellungen wählt „Stufe“, was das Menü zeigt: Einstieg, Alltag oder Vollständig.
  Ein ausgeblendetes Werkzeug bleibt über seine Adresse erreichbar.
- **Die Hilfe.** Jedes Werkzeug hat unter seinem Inhalt einen eingeklappten Bereich „So geht’s“; die Schaltfläche ? der Kopfzeile (auf
  einem Telefon wie auf einem Bildschirm) öffnet dieses Handbuch beim Kapitel des Bildschirms, auf dem Sie sind.
- **Der Status auf der Schaltfläche ⚙.** In der Kopfzeile trägt die Schaltfläche ⚙ einen Punkt: grün, wenn etwas auf Sie
  wartet (ein gestarteter Flug, ein zu schreibender Bericht), orange (auf einem Telefon), wenn etwas Aufmerksamkeit braucht:
  kein Kürzel, ausstehende Schreibvorgänge, Konflikte, ein Synchronisationsfehler, offline. Die Einstellungen öffnen sich mit
  dem Block „Status“, der die Einzelheiten nennt: der laufende Flug (antippen, um zur Karte zu gehen), die noch zu
  schreibenden Berichte zu Ihren vergangenen Flügen (antippen, um den vorausgefüllten Bericht zu öffnen), das fehlende Kürzel
  (antippen, um es einzustellen), der Zustand der Daten (letzte Synchronisation, ausstehende Schreibvorgänge, genutzter
  Austauschweg), die Luftfahrtdatenbank, solange sie nicht bereit ist, der Starter, „Offline“, wenn kein Netz da ist, die Zahl der Wetterabrufe des Tages (Open-Meteo-Vorhersagen,
  10.000 pro Tag erlaubt), das Ende des AIRAC-Zyklus, wenn die veröffentlichte Luftfahrtdatenbank oder die Verfahren hinter
  dem gültigen Zyklus zurückliegen, und
  auf einem Telefon die Quelle der Position während eines Flugs. Auf einem Telefon besteht die Kopfzeile nur aus Name,
  Schaltfläche ? und Schaltfläche ⚙.
- **Vollbild.** Auf der Karte (Werkzeuge mit fester Ansicht) blendet eine runde Schaltfläche am Ende der Schaltflächenspalte
  über der Karte die Kopfzeile und die untere Leiste aus, damit die Karte den ganzen Platz hat; dieselbe Schaltfläche oder Esc bringen sie zurück.
- **Telefon im Querformat.** Seitlich gedreht, legt das Telefon die untere Leiste als Symbolleiste an den linken Rand (dieselben
  fünf Einträge; ein zweites Tippen auf Vorbereiten öffnet seine Werkzeuge rechts neben der Leiste), behält die Kopfzeile, stellt
  den Datenblock der Karte als Spalte nach rechts (die erste Zeile antippen oder nach links ziehen, um sie zu verbreitern oder
  zu verschmälern) und gibt der Karte die ganze verbleibende Höhe. Im Vollbild bleibt die Spalte.

## Daten und Synchronisation

- **Position und Spur des Flugs.** Bei der Nutzung „mit mehreren“ werden die tatsächliche Position und die Spur Ihres laufenden
  Flugs (ein Punkt je Seemeile oder je Minute, auf etwa 100 m genau) mit der Gruppe geteilt und bleiben in der Historie des
  Repositorys; sie gehen nie ohne Ihr Zutun an einen externen Dienst.
- **Zuerst offline.** Alles, was Sie tun, bleibt auf dem Gerät und funktioniert ohne Netz.
- **Allein auf diesem Gerät.** Ist in den Einstellungen kein Austausch angekreuzt, geht nichts anderswohin: Exportieren
  Sie ab und zu die Sicherung des Geräts (eine Datei), sie ist die einzige Kopie.
- **Mehrere Geräte oder mehrere Nutzer.** Kreuzen Sie die Nutzung in den Einstellungen an und stellen Sie den Zugang ein
  (GitHub-Repository und persönliches Token oder der Starter eines Rechners). Ihre Änderungen gehen gemeinsam bei der
  Synchronisation hinaus: beim Start, alle 10 Minuten online oder über die Statusschaltfläche oben am Bildschirm.
- **Konflikte.** Eine hier und anderswo gleichzeitig geänderte Datei behält ihre neueste Version; die andere bleibt
  einsehbar (Statusschaltfläche, dann „Konflikte“) und kann zurückgenommen werden; „Gesehen“ nimmt einen Konflikt aus der Liste und
  der Zählung, „Alle als gesehen markieren“ tut das für alle auf einmal.

<!-- chapter: fuel -->
# Kraftstoff und Flugfläche

Den Kraftstoff eines Flugs vorbereiten und seine Flugfläche wählen: ein Luftfahrzeug, eine Route, eine Flugfläche, und
die Berechnung steht — Rollen, Streckenkraftstoff, Reserve, Blockkraftstoff, Flugzeit und Sinkflugbeginn.

## So geht’s

<a id="fuel-quote"></a>Die Vorbereitung folgt fünf Schritten, in der Reihenfolge, in der man einen Flug vorbereitet:
**1 Flug, 2 Route, 3 Wetter, 4 Ergebnis, 5 Abflug**. Auf einem Telefon zeigt die obere Leiste jeweils einen Schritt
(tippen Sie auf eine Nummer, um dorthin zu gehen, „Weiter“ unten in jedem Schritt); auf einem breiten Bildschirm stehen
die fünf Schritte untereinander. Bei jeder Änderung wird alles neu berechnet: Korrigieren Sie die Route, und Wetter,
Berechnung und Wind folgen, ohne dass eine Schaltfläche zu drücken ist. Das Ergebnis (Blockkraftstoff,
Streckenkraftstoff, Zeit, Sinkflugbeginn) bleibt bei jedem Schritt unten im Bildschirm sichtbar, mit der Herkunft des
Winds („Wind: METAR LFRS“, „Wind: ICON-Vorhersage FL060“, „Wind eingegeben“). Auf einem Telefon braucht diese Leiste drei Zeilen: den Kontext
(„FA50 · F-GXXX · Block · FL060→090→110→070 · Wind ARPEGE FL060“: zuerst das Luftfahrzeug der Berechnung, „Typschätzung“, wenn kein Datenblatt dient, und ein Tippen darauf öffnet die Wahl des Luftfahrzeugs; dann die Kraftstoffeinheit, „lb · lb/h“; vollständig beim Berühren der Zeile), den Blockkraftstoff, dann drei Kacheln
„Reise“, „Zeit“ und „TOD“ (Sinkflugbeginn). Der Bildschirm öffnet sich immer mit dem Reiter „Berechnung“; die Datenblätter
öffnen sich über den Reiter „Datenblätter“. Ein ✓ markiert einen ausgefüllten Schritt.
Flugflächen werden überall gleich geschrieben: als FL ab 5000 ft (FL060), darunter in Fuß (3500 ft).

**Der Einsatz.** Ein aus einem Einsatz vorbereiteter Flug trägt oben im Bildschirm den Chip „Einsatz <ID>“: er öffnet das Einsatzblatt über dem Schritt (zuerst die Risiken, dann Zusammenfassung, Ziele, Teams und Zonen, jede auf der Karte), ohne den Schritt zu verlassen; das Kreuz schließt es.

**Von der Mission vorgegebene Punkte.** Treffpunkte, Ziel und Quelle (Wasseraufnahme) einer Mission sind vorgegebene Punkte der Route: In der Punkteliste tragen sie „von der Mission vorgegeben“ und lassen sich weder nach oben oder unten schieben noch entfernen; verliert der Routentext einen davon, wird er beim Verlassen des Feldes wieder eingesetzt. Die anderen Punkte (Transit) gehören Ihnen: Fügen Sie Ihre eigenen frei dazwischen ein oder entfernen Sie sie.

**Neuer Flug.** Die Schaltfläche „Neuer Flug“ oben im Bildschirm löscht den vorbereiteten Flug (Abflug, Ankunft, Strecke, Verfahren, Flugfläche, OFP), nach einer Frage, wenn er schon etwas enthält oder gestartet ist; das Luftfahrzeug bleibt. Ein Flugplatz, der durch einen mehr als 150 NM entfernten ersetzt wird, oder geänderter Abflug und Ankunft ergeben ebenfalls ein neues Paar: Strecke, Verfahren und OFP des vorigen Flugs werden gelöscht, und der Bildschirm sagt es. Ein naher Flugplatz (eine Korrektur) ersetzt nur den alten in der Strecke.

<a id="fuel-step-1"></a>**1 Flug.** Abflug, Ankunft und Ausweichflugplatz (ICAO-Codes), das Flugdatum, wenn Sie die Vorhersage (TAF) statt der
Beobachtung wollen, das Luftfahrzeug und die Reiseflugfläche (FL); „Auto“ neben der Flugfläche nimmt unter den Flugflächen der Halbkreisregel (bis zur Dienstgipfelhöhe des Datenblatts) die mit dem geringsten Verbrauch auf der Route, zeigt „auto“ und die Flugzeit unter dem Feld und folgt, wenn sich Route, Luftfahrzeug oder Wind ändern — bis Sie eine Flugfläche eingeben. Unter jedem Code gibt eine feste Zeile den Namen des Flugplatzes zur Kontrolle an („LFPO — Paris-Orly“; „unbekannt“, wenn der Code zu nichts passt). „⇄“ zwischen Abflug und Ankunft tauscht beide: Das ist ein neues Flugplatzpaar, Strecke, Verfahren und OFP des Hinflugs werden gelöscht. Ab zwei Zeichen, einem Code, dem Anfang eines Namens, einer Stadt oder einem Land („LFP“, „orly“, „stockholm“, „schweden“, „usa“), schlägt das Feld höchstens sieben Flugplätze vor: ↑ ↓ zum Wählen, Eingabe zum Bestätigen, Esc zum Schließen oder ein Antippen; die Liste schließt sich, wenn Sie das Feld verlassen, und den ganzen Code von Hand zu tippen funktioniert immer. Der Name kann ganz getippt werden („toulouse“): nur ein gewählter oder getippter Code kommt in die Route, und ein ohne Wahl verlassenes Feld kehrt zum gespeicherten Flugplatz zurück. Das Flugdatum (in der Ortszeit des Geräts eingegeben) ist ein einziger Wert, im aktuellen Flug gespeichert: Das Wetter der Kalkulation (TAF der Flugplätze, Höhenwinde und -temperaturen) wird für dieses Datum gelesen, die ETA der Karte geht davon aus, solange der Flug nicht gestartet ist, und der Schieberegler von Wetter geht von ihm aus; leer heißt jetzt. Das Luftfahrzeug passt auf eine Zeile: das gewählte
Luftfahrzeug, sein Kennzeichen, sein Rufzeichen und woher es stammt. Ein neuer Flug übernimmt das zuletzt auf diesem Gerät
gewählte Luftfahrzeug; ohne Wahl wartet die Kalkulation. „Wechseln“ direkt nach dem Luftfahrzeug öffnet die Suche (das zuletzt gewählte zuerst): Tippen Sie ein
Datenblatt, ein Kennzeichen, ein Rufzeichen oder einen Typ. Die Ergebnisse kommen in dieser Reihenfolge: Ihre
Leistungsdatenblätter, die Luftfahrzeuge der Fluggesellschaft (ihre Flotte, dann die aus ihrem Flugbuch bekannten), die
veröffentlichten Typen und zuletzt der Code so, wie er getippt wurde. Ein Luftfahrzeug der Fluggesellschaft nimmt sein
eigenes Datenblatt, wenn es eines hat, sonst das seines Typs, sonst eine Schätzung des Typs — die Berechnung markiert es
dann „ungefähr“. Das gewählte Kennzeichen und Rufzeichen begleiten den Flug bis zum Bericht. Die Zeile „Reiseflug“ sagt,
woher der Verbrauch stammt; aus der Drehzahl-/Verbrauchstabelle des Datenblatts gelesen, nennt sie die zwei Drehzahlzeilen und, wenn die Tabelle mehrere Höhen hat, die zwei Kurven, zwischen denen die Flughöhe interpoliert wird („2400 U/min zwischen 2300 und 2500 U/min, zwischen den Kurven 4000 und 8000 ft“). Die Tabelle zählt nur, wenn zwei ihrer Zeilen mit Verbrauch die Reiseflugdrehzahl einrahmen (oder eine Zeile bei dieser Drehzahl liegt): sonst zählt der im Datenblatt eingegebene Reiseverbrauch, nie die nächste Zeile verlängert.

Neben dem Datum legt die Uhr „+30“ den Flug 30 Min. in die Zukunft (auf 5 Min. gerundet; jedes Tippen fügt 30 Min.
hinzu), und „Jetzt“ kehrt zur aktuellen Uhrzeit zurück: Flugplatzwetter (die TAF, wenn sie diese Uhrzeit abdeckt) und
Höhenwinde werden sofort neu gelesen.

<a id="fuel-theme"></a>**Familie und Serie.** Unter dem Datum sagen „Familie“ und „Serie“, was Sie vorhaben: ein Fracht-, Passagier- oder Erprobungsflug, eine SAR-Mission… Sie sind freiwillig, werden von der vorbereiteten Mission ausgefüllt und bieten nur die Familien Ihrer Gesellschaft an (eine kommerzielle Gesellschaft: CAT · Gewerblicher Luftverkehr). Der Bericht übernimmt sie und kann sie ändern: hier vergessen, dort gewählt.

<a id="fuel-step-2"></a>**2 Route.** Tippen Sie die Route in das stets sichtbare Feld „Route“ (die Eingabetaste bestätigt sie): die Punkte, die
Luftstraßen und die Flugflächen, wie in einem Flugplan („LFBO TOU UN460 NTS/F280 LFRN“). Sie können dort auch einen
ICAO-Flugplan oder die Liste eines OFP einfügen. Wenn Sie das Feld verlassen, wird die Route bereinigt: in
Großbuchstaben auf einer Zeile, ohne DCT und ohne Geschwindigkeits-Flugflächen-Gruppen, Abflug und Ankunft an den Enden,
ein Flugflächenwechsel als „/F280“ nach dem Punkt, an dem er beginnt. Luftstraßen bleiben geschrieben (die Berechnung
folgt den Punkten). Unbekannte Punkte bleiben an ihrer Stelle und werden direkt darunter gemeldet; Koordinaten schreibt
man nach ICAO-Art („4530N00030E“). Die nächste Zeile gibt Entfernung und rechtweisenden Kurs an und woher sie stammen
(die Route, der SimBrief-OFP). Lässt sich die Route nicht auflösen, öffnet „Von Hand eingeben“ die beiden Felder. Mit
eingestellter SimBrief-ID (⚙) übernimmt „Letzter SimBrief-OFP“ Route, Flugfläche, mittleren Wind und Luftfahrzeug Ihres
letzten Plans auf einmal.

**Route berechnen und prüfen.** An einem Arbeitsplatz, dessen Launcher die Routenberechnung trägt, erscheinen unter dem Feld zwei Schaltflächen (ist der Launcher inzwischen gestoppt, sagt es das Tippen, „Mit dem Launcher des Arbeitsplatzes verfügbar (er antwortet nicht)“, mit „Erneut versuchen“): „A → B berechnen“ schlägt Routen von einem Flugplatz zum anderen vor (die getippten Punkte sind vorgeschriebene Überflüge), mit Länge, gehaltener Flugfläche und Anzahl der Regelabweichungen; ein Tippen auf eine Route zeigt sie (hier und auf der Karte hervorgehoben, ihr Detail aufgeklappt), ohne sie zu übernehmen; „Auswählen“ schreibt ihre Strecke, SID und STAR. „Prüfen“ analysiert die getippte Route so, wie sie ist: fehlerhafte Abschnitte werden in der Punkteliste rot, mit ihrem Grund (RAD, FRA, Untergrenze, Obergrenze …), und ihre Anzahl erscheint in der Ergebnisleiste; „N Regelabweichungen“ klappt zu einer Zeile je Abweichung auf: der Abschnitt, die Regel (die RAD- oder FRA-Kennung) und der Satz der Berechnung. Eine Route, deren Prüfung mangels Daten unvollständig ist, ist als „unvollständige Prüfung“ markiert: weder bestätigt noch abweichend. Jede Route nennt auch ihren geprüften Anteil: „geprüft 22 % · unvollständig 65 % · Ersatz 14 %“ („Ersatz“: ein Abschnitt, den die Berechnung verbunden hat, ohne ihn prüfen zu können), und eine Klappe listet ihre Abschnitte nach Ebene (SID, FRA, Luftstraßen, STAR). Lässt sich keine Route berechnen, kommt, was die Berechnung gefunden hat, getrennt unter „Nicht bestätigte Vorschläge“: nie als geprüft bezeichnet, zu prüfen, wenn Sie einen übernehmen. Jeder Abschnitt nennt seine Art mit dem Strich der Karte: Luftstraße (durchgezogen), DCT (gestrichelt), FRA (gepunktet), SID, STAR, Anflug; „Legende“ unter der Liste zeigt sie alle. Die Routen werden auf der Karte gezeichnet: neben dem Kraftstoff auf einem großen Bildschirm oder über „Auf der Karte“; eine berührte Linie wird ebenfalls gezeigt, die Liste bleibt. Ihre Eingabe wird nie ohne „Auswählen“ ersetzt. Ist auf dem Arbeitsplatz kein RAD importiert, führt ein Link zu seiner Zeile in Daten, um es zu importieren. Es ist eine Simulations-Vorprüfung, keine IFPS-Validierung.

Die Schaltfläche „Auto“ neben dem Feld „Route“ trägt die Luftstraßen zwischen den Punkten ein: Für jedes Paar benannter
Punkte, die ohne Luftstraße aufeinander folgen, sucht sie den kürzesten Weg über die Luftstraßen der veröffentlichten
Datenbank, die auf der geplanten Flugfläche offen sind (Untergrenze und Obergrenze jedes Abschnitts, auf 100 ft genau; ohne
geplante Flugfläche 6 500 ft, eine Meldung sagt es), mit direktem Einflug und Ausflug bis 60 NM und ohne Umweg über 40 %.
Der Text wird zu „LFRS TSA01 UT460 TSA05 LFML“; die Zwischenpunkte der Luftstraße, die der Text nicht schreibt, bleiben in den
Punkten (Entfernung, Karte und Profil folgen ihnen). Eine Meldung nennt das Ergebnis („3 Luftstraßen eingetragen, 254 NM“)
oder „Keine nutzbare Luftstraße zwischen X und Y“. Grenzen: Die Luftstraßen gelten in beiden Richtungen (die Datenbank kennt
noch keine Einbahnstraßen), ohne feine Flugflächenbeschränkungen und ohne SID / STAR; die Route bleibt zu prüfen. „Auto“ geht immer von den gesetzten Punkten aus — Abflug, Ausgang der gewählten SID, die von Ihnen getippten Punkte, Eingang der STAR, Ankunft — und ersetzt, was ein vorheriges „Auto“ geschrieben hat: zweimal „Auto“ hintereinander ergibt denselben Text, nie eine Route, die in Schleifen wächst. Ein Abschnitt, der einen Punkt zweimal überfliegen oder das Ganze zu sehr verlängern würde, bleibt direkt, und die Benachrichtigung sagt warum („keine Luftstraße nahe LACOU“, „Umweg von mehr als 40 %“). Steht der Name der SID im Text, wird ihr Ausgang danach geschrieben („LFBO LACOU7B LACOU …“) und der Abschnitt vom Ausgang zum ersten Punkt wird geroutet. Eine Luftstraße, die Sie zwischen zwei Punkten tippen („GILUX A3 MOTAL“), wird immer als Luftstraße gelesen, nie als gleichnamiger Punkt anderswo; ihr wird nur gefolgt, wenn sie diese beiden Punkte wirklich verbindet, sonst bleibt der Abschnitt direkt und eine Zeile sagt es („A3 verbindet GILUX nicht mit MOTAL: direkter Abschnitt“). Der Routentext folgt Ihren Verfahren, in ICAO-Form: der Name der SID und ihr Ausgang nach dem Abflug, der Eingang und der Name der STAR vor der Ankunft, „DCT“ zwischen zwei Punkten ohne Luftstraße („LFRS NTS1A NT102 DCT LUGEN … MEN01 MEN1A LFML“); der Anflug steht nie darin. Liegt der Ausgang der SID nicht auf Ihrer Route, sagt eine Zeile, dass sie direkt angeschlossen wird („NTS1A endet bei NT102: NT102 DCT LUGEN“). Umgekehrt wird der Text gelesen: den Namen einer SID des Abflugs oder einer STAR der Ankunft tippen wählt sie, ihn löschen hebt die Wahl auf. In der Liste „Punkte (N)“ ist jedes gewählte Verfahren eine einzige eingeklappte Zeile in seiner Kartenfarbe („SID NTS1A · 2 Punkte“, „STAR MEN1A via NEPIX · 4 Punkte“): seine Fixpunkte erscheinen mit einem Tippen, nie auf der Ebene der von Ihnen getippten Punkte; die Zahl zählt Ihre Punkte und diese Zeilen. Verbindet eine Luftstraße zwei Punkte, ist aber auf der Höhe des Abschnitts nicht offen, nennt die Zeile sie mit ihrem offenen Band, damit Sie entscheiden („A34 verbindet LACOU mit LMG, gesperrt auf FL260 (offen von 6 500 ft bis FL195): direkter Abschnitt“); „Auto“ folgt ihr nie trotzdem. Beim Tippen im Feld schlägt eine Liste ab zwei Zeichen des Wortes unter dem Cursor (höchstens sieben) die SIDs des Abflugs und die STARs der Ankunft vor, die Luftstraßen um den vorigen Punkt, die Punkte und Funkfeuer der Basis: ↑ ↓ und Eingabe oder ein Tippen schreiben das Wort an den Cursor; Escape schließt die Liste. Die Listen des Schritts bleiben, für Tastatur und Bildschirmleser.

Der aufklappbare Bereich „Punkte“ listet die erkannten Punkte auf, vom Abflug bis zur Ankunft. Die Pfeile schieben einen
Punkt in der Liste nach oben oder unten, das Kreuz entfernt ihn; das Feld unten fügt einen vor der Ankunft hinzu: eine
Kennung (Funkfeuer, Wegpunkt, Flugplatz) oder „NAME Breite Länge“. Jeder Zwischenpunkt hat ein freiwilliges Feld für die
Flugfläche, in FL: Das ist die Flugfläche, die ab diesem Punkt gehalten wird, für einen Stufensteigflug oder -sinkflug.
Ein Punkt ohne Flugfläche setzt die vorige fort (grau angezeigt); der Flug beginnt auf der Flugfläche des Plans. Die
Berechnung zählt jede Stufe (ihren Steig- oder Sinkflug, dann den Reiseflug auf dieser Flugfläche), das Ergebnis zeigt
die Folge der Flugflächen (FL100 → FL120), und der Sinkflug beginnt auf der letzten Flugfläche. Jede Änderung schreibt
das Feld „Route“ neu und wird sofort an die Karte weitergegeben; eine getippte Luftstraße bleibt geschrieben, solange
die beiden Punkte, die sie einrahmen, benachbart und an ihrer Stelle bleiben.

„Karte zeigen“ zeigt den Flug auf der Karte: Auf einem Telefon öffnet sich die Karte (die Schaltfläche in der Kopfzeile
führt hierher zurück); auf einem breiten Bildschirm öffnet sie sich daneben und folgt jeder Änderung. „Route bearbeiten“
auf der Karte führt zu diesem Schritt zurück, das Routenfeld bereit zur Eingabe.

**Piste, SID, STAR und Anflug.** Am Ende des Schritts Route steht eine Karte „Verfahren“ mit einer Abflug- und einer Ankunftsseite. Jede hat einen Titel („Abflug LFPO Paris-Orly“, mit „Auf der Karte“: die Karte öffnet sich auf den Verfahren des Flugplatzes; was dort gewählt wird — Piste, Verfahren, Anflug —, kommt in einem Zug hierher zurück, angewandt wie eine hier getroffene Wahl und in einer einzigen Zeile gemeldet; eine Familie, die die Karte nicht berührt, bleibt, wie sie war), eine einzige dezente Zeile („gelesen am 29/10 16:53Z · Neu lesen · 3 nicht gelesen“, dann „Karten“: die Seite des Flugplatzes im amtlichen AIP seines Staates — eAIP des SIA, ENAIRE, AirNav Ireland —, wo seine Karten sind, in einem neuen Tab; nichts für einen Staat, dessen AIP die Datenbank nicht kennt; kennt die Datenbank die amtliche Karte einer Wahl, öffnet ein Link „Karte 13R“, „Karte SID“, „Karte STAR“ oder „Karte APP“ ihr PDF in einem neuen Tab, und „Karten“ bleibt, solange eine Wahl keine bekannte Karte hat; dieselbe Zeile nach dem Start des Flugs, im Schritt Abflug) und ein festes Raster, auf beiden Seiten gleich: Piste · SID · Übergang beim Abflug; Piste · STAR · Übergang bei der Ankunft, darunter Anflug · Anflugübergang (ein Übergang erscheint nur, wenn das gewählte Verfahren einen hat). Auf einem Telefon eine einzige Spalte; keine Bezeichnung wird abgeschnitten. Jede Liste kommt aus aerodb und zeigt alle Verfahren des Flugplatzes in einer einzigen Liste, nach Piste und dann nach Namen geordnet (die Piste steht im Text nur, wenn keine Piste gewählt ist und das Verfahren nur eine bedient: „OPALE 2E“, sobald die Piste gewählt ist). Nichts ist verboten: Ein Verfahren im Konflikt mit Ihrer Wahl ist mit ⚠ markiert (eine SID, STAR oder ein Anflug, die die gewählte Piste nicht bedienen; ohne gewählte Piste eine STAR, die keine Piste des gewählten Anflugs bedient; der Grund steht im Tooltip — eine STAR, die den Anflug nicht erreicht, ist kein Konflikt: die Karte verbindet gestrichelt), und Sie können es trotzdem wählen — das ⚠ und der Tooltip genügen, keine Meldung wiederholt es. ⌛ (grau) heißt veraltet, ⚠ (orange) im Konflikt. In jeder Liste steht, was mit Ihrer Wahl vereinbar ist, vorn, die ⚠-Einträge danach; in der Pistenliste kommen zuerst die Pisten der bereits gewählten SID oder des gewählten Anflugs. Ein Verfahren, das die Quelle nicht richtig lesen konnte (ohne Namen oder zweifelhaft), wird nie angeboten: Die dezente Zeile der Seite sagt, wie viele nicht gelesen sind („3 nicht gelesen“: die nicht gelesenen Seiten und die zu prüfenden Verfahren der gelesenen Datei). Tragen die Daten des Flugplatzes keinen Pistensatz, sind die angebotenen Pisten die, die seine Verfahren nennen. Jede Piste trägt den Wind des bekannten METAR des Flugplatzes (den des Schritts Abflug): „13R — ↓ 12 kt · ← 6 kt“: der Pfeil zeigt, wohin der Wind weht, die Piste nach oben gesehen wie im Endanflug (↓ Gegenwind, ↑ Rückenwind, ← Wind von rechts, → Wind von links). Grün ein Gegenwind; orange ein Rückenwind bis 5 kt oder ein Seitenwind über 10 kt; rot ein Rückenwind über 5 kt oder ein Seitenwind über 20 kt (oder über der Grenze des Datenblatts des Luftfahrzeugs, wenn es eine hat); der Grund im Tooltip. Ohne METAR wird nichts angezeigt. Der Titel jeder Seite endet mit der Zusammenfassung der Wahl, demselben Text wie im Bereich der Karte: „13R · ↑ 12 kt“, „MEN1A via NEPIX“, „I13R“ („SID keine“ für einen Abflug ohne SID). Wer eine STAR oder einen Anflug wählt, die nur eine Piste bedienen, setzt diese Piste; eine STAR bietet ihre Übergänge an, ein Anflug seine Anflugübergänge. Ein Anflug liest sich kurz, Art und Piste („ILS 06“, „RNP 06“; der veröffentlichte Name im Tooltip). Ein ILS-Anflug nennt unter der Liste die Anlage, die die Datenbank führt: „ILS 25 · DO 109.35 · Kurs 246° · DME“ (Kennung, Frequenz, Kurs); nichts, wenn die Datenbank sie nicht führt; die eingeklappte Zusammenfassung der Ankunft behält Kennung und Frequenz („I13R · TST 110.30“). Die Anfangsanflugsegmente, die der SIA getrennt veröffentlicht („INA RNAV RWY 06“), sind nie Zeilen: Sie sind die Übergänge aller Endanflüge ihrer Piste, „via ODILO 1A“ (der IAF, dann der veröffentlichte Name), und „—“ bleibt der Direktflug zum IF. Die erste Wahl „—“ heißt „nicht gewählt“; „keine“ ist eine echte Wahl (ein direkter Abflug ohne SID). Ein Verfahren aus dem X-Plane-Ersatz des Arbeitsplatzes steht zuletzt, markiert „X-Plane, lokal“; ein unter einem früheren Zyklus gelesenes Verfahren trägt ⌛ (neu lesen). Für einen Flugplatz ohne veröffentlichtes Verfahren sagt die dezente Zeile das („kein veröffentlichtes Verfahren · Verfahren von LFXX lesen“): ein Flugplatz pro Geste, nie im Stillen. Veröffentlicht der Staat seine Verfahren nicht als Tabellen (Bilder, nur Beschriftungen …), sagt es die Zeile und bietet Navigraph und ChartFox statt eines aussichtslosen Lesens an; ein auf Anfrage lesbarer Staat bietet „Auf Anfrage lesen“. Fehlt die Zone der Datenbank (nicht installiert, neu aufzubauen oder ohne Punkte und Luftstraßen), sagt es dieselbe Zeile, bietet „Hinzufügen“ oder „Aktualisieren“ in Daten an und nennt die Ausweichwege dieses Rechners: Little Navmap, falls vorhanden, Navigraph, ChartFox. Ein Flugplatz, der schon Verfahren hat, zeigt auf derselben Zeile das Datum seines letzten Lesens („gelesen am 29/10 16:53Z“, ⌛ wenn es aus einem früheren Zyklus stammt), dann „Neu lesen“: dieselbe Geste, die die gelesene Datei ersetzt. Dieselbe Zeile sagt, wie es um den Boden des Flugplatzes steht (Rollwege und Abstellplätze, mit seinen Verfahren für die Karte gelesen): „Boden wird gelesen…“, „Boden gelesen“ oder „Boden nicht gelesen“ und warum, mit „Erneut versuchen“, das nur den Boden neu liest; es sind die Worte des Bodenfelds der Karte. Ein französischer Flugplatz wird aus dem eAIP des SIA gelesen, ohne Konto; ein Staat, dessen AIP Verfahrenstabellen veröffentlicht, aus EAD Basic (Zugangsdaten am Arbeitsplatz eingetragen); für jeden anderen Staat sagt die Meldung, dass keine Tabelle veröffentlicht ist. Ohne Launcher oder auf einem mit dem Arbeitsplatz gekoppelten Gerät geschieht das Lesen am Arbeitsplatz — die Meldung sagt es — und der SimBrief-OFP bleibt die Quelle des Flugs. Sind SID und STAR gewählt, läuft die Berechnung auf dem Weg „Route + Verfahren“ (mit der Strecke von SID und STAR), und die Karte zeichnet sie mit ihren Höhen und Geschwindigkeiten; ihre Höhenbeschränkungen gehen nicht in die Stufen der Berechnung ein, sie stehen im Höhenprofil, das den Reiseflug hält, bis der Sinkflug beginnen muss, und danach nicht mehr steigt. „Letzter SimBrief-OFP“ schlägt seine SID und STAR nur für die Seiten vor, die Sie noch nicht gewählt haben („keine“ ist eine Wahl): Er ersetzt nie Ihre Wahl und sagt, was er ausgefüllt hat, eine Zeile pro Seite („Ankunft: STAR — → LERG1R“). Nacheinander getroffene Entscheidungen werden einmal geschrieben, kurz nach der letzten. Die Karte öffnet sich eingeklappt, damit man sie ohne Scrollen liest: eine Zusammenfassungszeile pro Seite („Abflug LFRS · 03 · NTS1A“, mit „Auf der Karte“); ein Tippen auf die Zeile oder auf ▸ klappt ihre Listen und ihre Nebenzeile („Neu lesen“, „Karten“) aus, eine Seite nach der anderen. Eine Seite ohne Verfahren bleibt ausgeklappt: ihre Zeile bietet das Lesen an.

**Zu prüfende Anflüge.** Ein Anflug, dessen Lesung zweifelhaft ist (Zeilen der Codiertabelle nicht gelesen, Geometrie passt nicht…), wird trotzdem angeboten, markiert „⚑ zu prüfen“, sein Grund im Tooltip: Sie können ihn von Hand wählen, nichts wählt ihn für Sie. Die Anflüge, die das AIP nur als Karte gibt (ohne Codiertabelle), stehen unter den Listen, „Nur als Karte im AIP“, jeder mit seiner Karte. Gewählt, nennt ein zu prüfender Anflug seinen Grund in einer Zeile unter der Liste, und die eingeklappte Zusammenfassung der Ankunft trägt „⚑“.

**Aus Little Navmap gelesene Verfahren.** Ein in der Little-Navmap-Datenbank dieses Geräts gelesenes Verfahren trägt „Little Navmap, auf diesem Gerät gelesen“. Es bleibt auf diesem Gerät: Der Flug behält nur seinen Namen, keinen seiner Punkte, und die Dateien für X-Plane und MSFS lassen es weg (eine Zeile sagt es beim Export).

**Aus Little Navmap lesen.** Für einen Flugplatz, für den die Basis kein Verfahren hat (zum Beispiel KDEN), auf einem Gerät, auf dem der Launcher eine Little-Navmap-Datenbank gefunden hat, liest „Aus Little Navmap lesen“ seine Verfahren in dieser Datenbank, über den Launcher. Zuvor muss die persönliche Nutzung in Daten › Quellen mit persönlicher Lizenz angekreuzt sein; sonst erinnert eine Zeile daran und nichts wird gelesen.

**Flugflächen und Verfahrenspunkte.** Tragen die Punkte der Route eine Flugfläche („/F180“) und der Plan eine andere, sagt es eine Zeile unter der Flugfläche, mit dem Steig- und Reiseflug, der daraus folgt („Punkte auf FL180, Plan auf FL320: 0:36 Steigflug für 0:09 Reiseflug“); „Punkte an den Plan angleichen“ entfernt die Flugflächen der Punkte. In der Punkteliste hat jeder Punkt einer gewählten SID, STAR oder eines Anflugs sein Feld für die Flugfläche: eine gesetzte Flugfläche folgt das Profil (und die Karte); über der Dienstgipfelhöhe des Datenblatts oder zu steil, um erreicht zu werden, wird sie abgelehnt und der Bildschirm sagt warum. Ein Name der Route, den keine Datenbank kennt, den aber das gewählte Verfahren trägt (BEPAN der BEPA4E), nimmt die Position des Verfahrens; bleibt er nahe einem Flugplatz unbekannt, um den die Datenbank keinen veröffentlichten Punkt hat, sagt es die Zeile. Ein Name, den mehrere Punkte tragen (Namensgleiche), nimmt den dem vorigen Punkt nächsten (ein Flugplatzcode bleibt der Flugplatz), und die Zeile unter der Route sagt es, ebenso einen Sprung von mehr als 1 000 NM von einem Punkt zum nächsten. Ein Name, dessen einziger bekannter Ort sehr weit von der Route liegt (mehr als die doppelte Direktentfernung plus 400 NM), wird nicht gesetzt: die Zeile sagt es, und die Basis seiner Zone ist vielleicht unvollständig. Ein unbekannter Punkt nennt den Zustand seiner Zone: Datenbank nicht installiert („Hinzufügen“), Datei des Zyklus fehlt („Aktualisieren“) oder eine Quelle ohne Punkte und Luftstraßen. Eine pro Piste veröffentlichte STAR folgt der gewählten Piste.

**Ein Flugplatz ist nie ein Punkt der Route.** Beginnt der Routentext nach einem Flugplatzwechsel noch mit dem alten Abflugplatz (oder endet er mit der alten Ankunft), wird dieser Flugplatz weder aufgeführt noch von „Auto“ geroutet noch zurückgeschrieben: der Flug startet immer an seinem Abflugplatz. Ein anderer Flugplatz mitten in der Route bleibt (eine VFR-Route kann einen passieren). In der Punkteliste bleibt ein Name der Route, den keine Datenbank kennt, an seiner Stelle, ohne Position, mit seinem Grund („der Datenbank unbekannt“ oder „kein veröffentlichter Punkt um EIDW“, wenn die Zone fehlt): die Liste zeigt die ganze Route, nie weniger.

<a id="fuel-step-3"></a>**3 Wetter.** Der Wind (Richtung und Stärke) und die ISA-Abweichung. Ohne Richtung oder ganz ohne Wind wird der
Blockkraftstoff als Spanne angegeben. „Flugplatzwetter lesen“ zeigt Abflug, Ankunft, Ausweichflugplatz und die
Flugplätze entlang der Route: alle, die weniger als 10 NM beiderseits der Route liegen (Radius in den Einstellungen der
Berechnung einstellbar) und ein METAR oder eine TAF haben; die anderen werden übergangen. Jeder Flugplatz nennt seine
Entfernung vom Abflug (der Ausweichflugplatz: von der Ankunft); sind es mehr als zwei, werden die Zwischenflugplätze
unter Abflug, Ankunft und Ausweichflugplatz zugeklappt. Für jeden, was für den Flug zählt: die Kategorie (VFR, MVFR,
IFR, LIFR, farbig), den Wind und seine Gegen- und Seitenwindkomponente auf der Hauptpiste des Flugplatzes (die Richtung,
die dem Wind am nächsten liegt), die Wolkenuntergrenze, die Sicht, die Temperatur und das QNH sowie eine Warnung, wenn
CB oder TCU gemeldet sind; die Rohmeldung ist zugeklappt. Mit einem Flugdatum antwortet die TAF, wenn sie diese Uhrzeit
abdeckt (samt ihren vorübergehenden Änderungen), sonst das METAR. Setzen Sie das Häkchen bei „Echtes Wetter“, damit der
Wind der Berechnung zum Mittel der Winde der Flugplätze der Route wird (Abflug, Zwischenflugplätze, Ankunft), Abschnitt
für Abschnitt und nach dessen Länge gewichtet — eine Näherung aus dem Bodenwind, unter den Feldern vermerkt. Ohne Netz
bleiben die zuletzt gelesenen Werte mit ihrer Uhrzeit angezeigt.

„ISA ±“ ist die Temperaturabweichung von der Standardatmosphäre, in °C: Sie verändert die verfügbare Leistung, die wahre
Fluggeschwindigkeit und die Gipfelhöhe. Sobald das Wetter gelesen ist, berechnet die Zeile darunter sie aus dem METAR
des Abflugs — dessen Temperatur minus die Standardtemperatur des Flugplatzes (15 − 1,98 × Flugplatzhöhe in tausend Fuß)
— und „ISA … verwenden“ überträgt sie in das Feld. Die gewählte Abweichung bleibt in Ihren Einstellungen gespeichert:
Der nächste Flug beginnt mit derselben. Sobald die Höhenvorhersage gelesen ist, schlägt eine zweite Zeile die Abweichung
auf der geplanten Flugfläche vor, gemittelt entlang der Route („ISA −5 auf FL060 laut ARPEGE-Vorhersage“); mit „Echtes
Wetter“ übernimmt die Berechnung diese, wie den Wind. „Flugplatzwetter lesen“ zeigt „Wird gelesen…“ während der Abrufe.

„Flugplatzwetter lesen“ liest auch die Höhenvorhersage (Open-Meteo, ohne Schlüssel, mit oder ohne Starter) an den
Punkten der Route: Die Karte „Höhenwinde und -temperaturen“ gibt für jeden Punkt die geplante Flugfläche (samt ihren
Stufen), den Wind, die Temperatur und die ISA-Abweichung auf dieser Flugfläche an, mit dem Modell (Météo-France AROME /
ARPEGE über Frankreich, ICON im übrigen Europa, GFS darüber hinaus), der Zielzeit (das Flugdatum, sonst jetzt) und der
Uhrzeit des Modelllaufs. Mit „Echtes Wetter“ wird der Wind der Berechnung zum Mittel dieser Winde auf der geplanten
Flugfläche entlang der Route, anstelle des Bodenwinds der METAR; die Zeile unter den Feldern sagt es. Dieselben Winde
gehen an die Karte, die sie als Pfeile zeichnet. Ohne Netz bleibt die zuletzt gelesene Vorhersage. Ändern sich Route
oder Uhrzeit, bleibt der bisherige Höhenwind, markiert mit „Vorhersage wird geladen…“, bis zur neuen Vorhersage; kommt
sie nicht, übernimmt der Bodenwind der METAR, und das wird gesagt („Höhenvorhersage nicht verfügbar“).

<a id="fuel-step-4"></a>**4 Ergebnis.** Die Zeichnung zeigt für jede Flugfläche den Streckenkraftstoff (durchgezogene Linie) und die Dauer
(gestrichelt). Der grüne Punkt markiert die sparsamste Flugfläche, das orange Quadrat die schnellste; der graue Bereich
die Flugflächen, die auf dieser Strecke nicht zu halten sind. Jede Flugfläche wird wie die Kalkulation gerechnet, mit dem vorhergesagten Wind auf dieser
Höhe, wenn das echte Wetter gewählt ist: auf der gewählten Flugfläche zeigen Kurve und Kalkulation dieselbe Zahl. Auf einer Strecke mit Stufen ist jeder Punkt der Kurve ein Horizontalflug auf seiner Flugfläche, ohne die Stufen: Die schwarze Raute markiert die echte Kalkulation des Plans (mit den Stufen der Strecke und dem Planwind), unter der Zeichnung angegeben („Plan: FL160, 856 kg, 0:54“); ihr Abstand zur Kurve sind die Kosten der Stufen. Die Kraftstoffachse folgt der gewählten Einheit (kg oder lb). Tippen Sie auf die Kurve, um eine Flugfläche zu wählen,
oder nutzen Sie die beiden Schaltflächen. „Steigflug“ wählt die Art zu steigen: sparsam, bestes Steigen, schnell, mit
der Geschwindigkeit des Datenblatts oder manuell (Sie geben Geschwindigkeit und Steigrate an).

Der aufklappbare Bereich „Dichtehöhe“ zeigt, mit der ISA-Abweichung auf der waagerechten Achse, die Dichtehöhe jeder
Druckhöhe (eine Gerade je tausend Fuß): Das ist die Höhe, die Rotor, Propeller und Triebwerk „spüren“. Die senkrechte
Linie ist die Abweichung des Flugs, die waagerechte die Gipfelhöhe des Datenblatts; ihr Schnittpunkt sagt, auf welcher
Druckhöhe das Luftfahrzeug an diesem Tag seine Gipfelhöhe erreicht (fett gezeichnete Gerade). Ein Punkt markiert den
Abflug laut METAR (Temperatur und QNH). Wichtig für Hubschrauber: Bei großer Hitze oder in der Höhe kann die
tatsächliche Gipfelhöhe weit unter die des Datenblatts fallen.

Unter dem Diagramm zeigt „Echte Atmosphäre am Abflug“ die vorhergesagte Temperatur in jeder Höhe über dem Abflug
(durchgezogene Linie) gegenüber der Standardatmosphäre (gestrichelt): Wo die Kurve davon abweicht, ändert sich die
ISA-Abweichung mit der Höhe, und Inversionsschichten (die Temperatur steigt mit der Höhe) werden hervorgehoben und
darunter genannt. Die Ablesezeile gibt auf der geplanten Flugfläche die tatsächliche Temperatur, ISA-Abweichung und
Dichtehöhe an.

Der Titel von „Steigflug-Vorgaben“ nennt die Steigflugdrehzahl des Datenblatts („Steigflug: 8000 U/min“), wenn es eine hat. Klappen Sie sie auf, um dem Steigflug bis zur Flugfläche zu folgen: Leistung, Drehzahl,
Geschwindigkeit, Steigrate, Durchfluss, Mach, Zeit und Kraftstoff kumuliert an den Stufen, mit gezeichnetem Profil. Das
Ergebnis gibt Blockkraftstoff, Streckenkraftstoff, Flugzeit und Entfernung des Sinkflugbeginns vor der Ankunft an.
„Einzelheiten“ schlüsselt es Phase für Phase auf.

„Öffnen in“ bereitet denselben Flug anderswo vor, in einem neuen Tab: SimBrief (Flugoptionen vorausgefüllt,
SimBrief-Anmeldung nötig), SkyVector (die Route gezeichnet, mit Geschwindigkeit und Flugfläche), Navigraph und ChartFox
(die Karten von Abflug- und Zielflugplatz, Anmeldung nötig). Ein ausgegrauter Eintrag sagt, was ihm fehlt (Flugplatz,
Luftfahrzeugtyp). Es wird nichts gesendet, was nicht schon im Flug steht. Die Einstellungen der Berechnung (Rollen,
Reserve, Zusatzmenge, Wetterkorridor, Einheiten, Verbrauch dieses Flugs) sind der erste aufklappbare Bereich des Schritts Ergebnis, eingeklappt; sein Titel nennt die Kraftstoffeinheit („Einstellungen · lb/h“).

<a id="fuel-alternate"></a>**Ausweichkraftstoff.** Der Blockkraftstoff zählt jetzt den Ausweichflugplatz mit: Rollen + Strecke + Reserve für Unvorhergesehenes + Ausweich + Endreserve. Seine Zeile im „Detail des Kostenvoranschlags“ nennt die Entfernung von der Ankunft zum Ausweichflugplatz, die Flugfläche, woher die Zahl kommt (Ausweichverbrauch des Datenblatts oder Modell der Strecke) und den Wind (der Route nahe der Ankunft, oder „Wind unbekannt“). Ohne eingegebenen Ausweichflugplatz oder ohne seine Position sagt es die Zeile, und nichts wird hinzugefügt. Der Block eines Flugs mit Ausweichflugplatz ist daher höher als zuvor: das ist gewollt.

<a id="fuel-step-5"></a>**5 Abflug.** Eine Zusammenfassung auf einer Seite: das Luftfahrzeug, die Route, wie sie aufgegeben wird, die Flugfläche

**Funknavigationshilfen.** Unter der Zusammenfassung zeigt „Funknavigationshilfen“ auf einen Blick das ILS des gewählten Anflugs (Piste, Kennung, Frequenz, Kurs, DME), dann, eingeklappt, die VOR / DME der Route in der Reihenfolge des Flugs, jedes mit seiner Frequenz und dem Abschnitt, auf dem es dient. Nichts wird erfunden: ohne Hilfe in der Basis sagt es die Karte.
(und ihre Stufen), der Wind und seine Quelle, der Blockkraftstoff. „Flug starten“ startet den Flugplan (Anlassen,
Zurückstoßen, Rollen…). Die Vorbereitung kann mehrere Tage alt sein: Deshalb wird zuerst alles auf die tatsächliche
Uhrzeit gebracht — das Flugdatum springt auf jetzt zurück, Flugplatzwetter und Höhenwinde werden neu gelesen, die
Berechnung wird neu erstellt — und in einer Zeile gesagt, was sich geändert hat („Wind 273°/35 kt → 284°/44 kt · Block
684 → 644 kg · geplante Ankunft 15:03Z (17:03)“); offline wird das gesagt und mit der letzten Berechnung gestartet. Danach wird
die Abflugzeit eingetragen, die zur Anlasszeit des Berichts wird. Auf einem Telefon öffnet es die Karte, auf einem
großen Bildschirm bleibt es hier mit der Karte rechts. Den Abflugplatz danach zu ändern heißt, einen anderen Flug
vorzubereiten: Die Abflugzeit wird gelöscht. Die Ankunft nach dem Abflug zu ändern ist eine Umleitung: Die Zeit bleibt
erhalten, und die Umleitung wird vermerkt.

Flugplan für den Simulator: Unter der Zusammenfassung laden drei Schaltflächen — „.fms (XP 11/12)“, „.fms (XP 10)“ und „.pln (MSFS)“ — die Route und die gewählten Verfahren (Piste, SID, STAR, Anflug und ihre Übergänge) für X-Plane oder Microsoft Flight Simulator herunter, in einer Datei namens „LFPO-EIDW_2026-10-30.fms“. Die Route braucht mindestens zwei gesetzte Punkte. Kopieren Sie die Datei dann in den Ordner „Output/FMS plans“ von X-Plane (das direkte Senden kommt mit dem Launcher).

Sobald der Flug gestartet ist, enthält dieser Schritt eine Karte „Verfahren“: Nichts ist gesperrt: Abflug- und Ankunftsseite bleiben jederzeit änderbar (ein anderer Abflug ist ein neuer Abflug). Eine Änderung rechnet die Berechnung nicht neu: Block-, Strecken- und Reservekraftstoff bleiben die des Abflugs; nur die Zeiten an den Punkten, das Höhenprofil und die Reststrecke folgen dem neuen Weg. Die Schaltfläche „Ändern“ der Karte öffnet Kraftstoff bei der Ankunftszeile (`#fuel?focus=arr`): vor dem Start den Schritt Route, danach den Schritt Abflug.

Sobald der Flug gestartet ist, zeigt das Ergebnis unten im Bildschirm „Flug gestartet um 11:14Z (13:14) · seit 1 h 10“. Die Zeiten sind UTC („Z“);
die Uhrzeit des Geräts steht in Klammern bei Abflug, geplantem Start und geplanter Ankunft. Ein
gestarteter Flug endet mit dem Schreiben seines Berichts: Beim Speichern kehrt Kraftstoff zur Vorbereitung zurück, und
Meine Flüge entfernt „laufend“. Um ohne Bericht zur Vorbereitung zurückzukehren: „Start abbrechen“ (nach Bestätigung).
Die Karte „Geplanter Fortschritt“ zeigt, wo der Flug theoretisch sein sollte: die geplante Überflugzeit an jedem Punkt
(Rollen, Steigflug, Reiseflug Abschnitt für Abschnitt mit seinem Wind, Sinkflug), den nächsten Punkt hervorgehoben, die
zurückgelegte und die verbleibende Entfernung und den geplanten Restkraftstoff. Sie folgt der Uhr, Minute für Minute,
bis zum Bericht oder zum Abbruch, und geht mit dem Flug an die Karte. Der hier vorbereitete Flug — Luftfahrzeug, Route,
Flugfläche, Steig- und Sinkprofil — wird geteilt: Karte und Bericht haben ihn schon.

## Leistungsdatenblätter <a id="fuel-sheets"></a>

Der Reiter „Datenblätter“ beginnt mit derselben Luftfahrzeugsuche wie der Schritt Flug (das Feld „Datenblatt, Kennzeichen, Rufzeichen oder Typ“: ein angetipptes Ergebnis wird das Luftfahrzeug des Flugs). Danach listet er die Datenblätter der Gesellschaft (zuerst die der Typen der Flotte der aktuellen Gesellschaft, die übrigen eingeklappt unter „Weitere Datenblätter“; auch die Suche nennt ihre Kennzeichen zuerst), geteilt mit allen ihren Geräten, **nur lesbar**: Sie
werden in Wartung › Luftfahrzeuge, Reiter „Datenblätter“ bearbeitet. Sie sind nach Kategorie sortiert (Hubschrauber,
Turboprops, Strahlflugzeuge, Kolbenmotoren, Andere); jeder von der Gesellschaft genutzte Typ (Flotte, Referenz) ohne
Datenblatt steht ebenfalls dort, „Leistungen einzutragen“, mit „In der Wartung anlegen“. Jedes Datenblatt sagt, was fehlt,
nach Familie („Zu ergänzen: Drehzahlen, Geschwindigkeiten, Reiseflug, Rollen, Piste“); „vollständig“, wenn nichts fehlt;
das Blatt des Fluges trägt „für diesen Flug verwendet“.

- **Verwenden**: wählt dieses Datenblatt für den Flug und kehrt zur Berechnung zurück.
- **In der Wartung bearbeiten**: Der Name des Datenblatts und diese Schaltfläche öffnen den Editor im selben Reiter. Dort
  finden der Import (Datei, eingefügter Text, ChatGPT-Antwort), die EUROCONTROL-Ergänzungen, die Vorschau Feld für Feld vor
  jedem Schreiben, Herkunft und Datum jedes Feldes, die Exporte `.lnmperf` und JSON und das Löschen statt.

## Einstellungen und Einheiten

Unter „Einstellungen“ der Berechnung: Minuten für Rollen und Reserve, Prozentsatz der Zusatzmenge und ein
Reiseflugverbrauch nur für diesen Flug (er ersetzt den des Datenblatts), in der Einheit der Berechnung eingegeben, die seine Beschriftung nennt („lb/h“). „Angezeigte Einheiten“ ändert Kraftstoff (kg
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
- **Wetter ohne Starter** (ein Telefon, ein Tablet): Die METAR kommen dann von metar.vatsim.net, ohne dass etwas
  einzustellen ist. Die TAF (nützlich, wenn Sie ein Flugdatum angeben) kommen von avwx.rest, mit Ihrem persönlichen
  Wetterschlüssel, einmal auf dem Gerät in den Einstellungen, Karte „Wetterschlüssel (TAF, avwx.rest)“, eingegeben; ohne
  Schlüssel sagt es die Karte, und das METAR antwortet stattdessen. Die Wetterkarte sagt, woher die Meldungen stammen.
  Ganz ohne Netz zeigt sie das zuletzt gespeicherte Wetter mit seiner Uhrzeit.

<!-- fr: ddf7571d1e89 -->

<!-- chapter: maps -->
# Karte

Ihren Flug auf einer Luftfahrtkarte und in seinem Vertikalprofil sehen, oder die Karten einer Mission: Lufträume,
Flugplätze, Funkfeuer, Luftstraßen, Mindesthöhen. Die Route des Flugs lässt sich auch auf der Karte ändern.

## So geht’s

**Der geplante Flug.** Die Karte zeigt den in Kraftstoff vorbereiteten Flug: Abflug, Routenpunkte, Ankunft, und den
Ausweichflugplatz grau gestrichelt. Die in Kraftstoff gewählten Piste, SID, STAR und Anflugverfahren werden über der Route gezeichnet (SID grün, STAR orange, Anflug blau), benannt wie in Kraftstoff („ROYAN6P“, „ILS 06“). Seine Zusammenfassung (Flugfläche, Entfernung, geplant oder im Flug) steht nicht über der Zeichnung (die Zeichnung zeigt sie): der Tooltip des Griffs des Datenblocks unter der Karte nennt sie, mit Abflug und Ankunft, Ausweichflugplatz und Luftfahrzeugtyp. Ändert sich der Flug in Kraftstoff, folgt die Karte von selbst.

**Die Karte und was sie zeigt.** Rund um die Route: die Lufträume, die sie durchquert oder streift (Flugbeschränkungs-,
Gefahren- und Sperrgebiete, kontrollierte Lufträume), die unteren oder oberen Luftstraßen je nach Ihrer Flugfläche, die
Flugplätze und die Funkfeuer, und in jedem Ein-Grad-Feld die Mindestsicherheitshöhe (die braune Zahl, in Tausenden und
Hunderten Fuß: „3⁵“ bedeutet 3 500 ft). Die kleinen violetten Zahlen entlang der Route sind die Entfernungen ab dem
Abflug, in nautischen Meilen. Verschieben Sie die Karte mit einem Finger, spreizen Sie zwei Finger zum Zoomen (während der Geste behält die Karte nur ihre Linien — Lufträume,
Luftstraßen, Route mit der gewählten SID und STAR, Flugplätze und Funkfeuer als kleine Ringe, dieselben wie im Stillstand — und ihre Namen kommen zurück, sobald sie stillsteht);
„Zentrieren“ (das Zielsymbol oben rechts auf der Karte) kehrt zur ganzen Route zurück. Die Karte bleibt, wo Sie sie hingelegt haben, auch wenn sich die Route
ändert: nur „Zentrieren“ (oder ein anderer Flug) richtet sie neu aus. Kehren Sie zur Karte zurück (aus Kraftstoff oder nach „Fertig“),
finden Sie Ihren Ausschnitt wieder, solange Route und gewählte Verfahren unverändert sind; sonst wird der Flug samt Verfahren neu
eingepasst. Solange „Nur rund um den Flug“ (Ebenen) angehakt
ist, werden Lufträume und Luftstraßen von weitem nur nahe dem Flug gelesen; entfernen Sie den Haken oder zoomen Sie hinein,
um alles zu sehen.

**Die Orthodrome.** Sobald Abflug und Ankunft bekannt sind, zeichnet die Karte den kürzesten Weg zwischen ihnen (den Großkreis) als feine Punktlinie in der gedämpften Farbe der Route und unter ihr: der Abstand zu Ihrer Route ist auf einen Blick zu sehen. Fahren Sie mit der Maus über die Punktlinie oder tippen Sie sie an: die Blase nennt ihre Länge in NM.

**Die vorgeschlagenen Routen.** Berechnet oder prüft Kraftstoff eine Route („A → B berechnen“, „Prüfen“), zeichnet die Karte die vorgeschlagenen Routen: die gewählte durchgezogen, die anderen abgeblendet, die in der Liste überfahrene dicker, die fehlerhaften Abschnitte rot. Tippen Sie eine Linie an (oder ihre Zeile in der kleinen Liste, auf einer einzelnen Karte), um sie zu nehmen: Kraftstoff übernimmt sie wie mit seiner Schaltfläche „Übernehmen“. Die Karte eines anderen Flugs zeichnet nichts. Sagt die Berechnung, was sie von einem Abschnitt geprüft hat, zeigt die Linie es: durchgezogen = geprüft, gestrichelt = unvollständig, gepunktet = Ersatz, rot = Fehler; die kleine Liste nennt die Legende. Die Linie hat die Breite der Flugroute: die gewählte durchgezogen, die anderen abgeschwächt. Sie sagt die Art des Abschnitts, wenn Kraftstoff sie liefert: eine Luftstraße durchgezogen mit ihrem Namen entlang der Linie, ein Direkt (DCT) gestrichelt, eine freie Streckenführung (FRA) gepunktet, SID, STAR oder Anflug in der Farbe der Verfahren, ein Fehler rot, und eine dünnere Linie, wenn der Abschnitt nicht vollständig geprüft ist. Die Punkte der gewählten Route sind markiert und benannt (Eintritt, Austritt und Wechsel der Luftstraße immer, die anderen wenn Platz ist). Eine einklappbare Legende steht in der Liste und in der Kartenlegende; das Überfahren einer Linie auf der Karte hebt sie hervor.

<a id="maps-procs"></a>**Gewählte Piste und Verfahren.** Was Sie in Kraftstoff gewählt haben (Piste, SID, STAR, Anflug), wird über der Route gezeichnet: die SID grün, die STAR orange, der Anflug und sein Fehlanflug blau, von der Schwelle der Abflugpiste bis zum ersten Punkt der Route und vom letzten Punkt der Route bis zur Schwelle der Landepiste. Übergänge und das Fehlanflugverfahren sind gestrichelt; ein Abschnitt ohne Punkt (zum Beispiel ein Steigflug auf einem Kurs) ist ein kurzer Strich entlang seines Kurses, dann eine Strichlinie bis zum nächsten Punkt; eine Kurve mit konstantem Radius ist ein Bogen. Erreicht die SID keinen Punkt der Route, verbindet eine gestrichelte Gerade sie mit der Route (ebenso bei der STAR). Ein nicht gewähltes Verfahren wird nie gezeichnet, und die Ebenenliste hat kein Kästchen dafür. Der Name des Verfahrens steht auf seiner Linie, gefolgt von der Herkunft seiner Daten, wenn sie von X-Plane oder Little Navmap stammen („X-Plane, lokal“) dann vom Zeichen ⌛ (grau), wenn sie unter einem früheren Zyklus gelesen wurden; die Legende (Chip „i“) erinnert daran. Ab der regionalen Ansicht (auf der Seite der Schwellen einstellbar) trägt jeder Punkt seine Beschränkungen; der Name des Verfahrens steht in jedem Maßstab, über allem anderen, wie auf Verfahrenskarten: eine **unterstrichene** Höhe heißt „mindestens“, eine **überstrichene** „höchstens“, beides „genau“, „5000–7000“ „dazwischen“; „≤ 220 kt“ ist die nicht zu überschreitende Geschwindigkeit. Das Vertikalprofil folgt demselben Weg und zeigt diese Beschränkungen als Stufen (Pfeil nach oben: mindestens, nach unten: höchstens, Punkt: genau, Balken: zwischen zwei Höhen); ihr Text nimmt einen freien Platz oder keinen, nie über dem Namen eines Luftraums, TOC / TOD oder einer Stufe; Entfernungen, geschätzte Zeiten und der Cursor werden entlang dieses Wegs gemessen. Die Karte ändert diese Wahl nie: Tippen Sie auf einen Flugplatz der Route, seine Karte nennt die gewählte Piste und die Verfahren, mit einer Schaltfläche „Ändern“, die Kraftstoff bei der zu ändernden Zeile öffnet; ein Link „Quelle“ öffnet die veröffentlichte Seite des Verfahrens (eAIP des SIA) in einem neuen Tab, und bei einem anderswo gelesenen Verfahren erscheint der Name seines Dokuments beim Überfahren der Zeile.

<a id="maps-rwy"></a>**Die Pisten.** Aus der Nähe wird jede Piste jedes gezeichneten Flugplatzes als kurzer Vektor von ihrer Schwelle gezeichnet, und der Flugplatz zeigt seinen Namen neben dem Code („LFPO Paris-Orly“); jeder Vektor verläuft in Pistenrichtung, ihre Nummer am Ende hinter der Schwelle: die in Kraftstoff gewählte Piste fett in der Farbe ihrer Seite, die anderen dünn. Sie erscheinen erst ab der von der Fluggesellschaft eingestellten Zoomstufe (Einstellungen › Verwaltung, „Zoomstufe der Pistenschwellen“, ohne Einstellung 11); darunter nichts. In „Auf der Karte wählen“ werden alle Pisten des Flugplatzes so gezeichnet, die gewählte fett; die Zeichnungen der Wahl liegen über den abgeblendeten Beschriftungen des Hintergrunds.

**Die Richtung einer Flugstrecke.** Ein Abschnitt einer Flugstrecke mit Einbahnverkehr trägt ab einem mittleren Zoom einen kleinen Pfeil in der erlaubten Richtung (neben dem Namen der Strecke); ein Abschnitt mit Verkehr in beide Richtungen oder ohne Angabe der Quelle trägt keinen. Der Hinweis zum Namen der Strecke sagt „Einbahn LMG → NEPIX“ oder „beide Richtungen“.

<a id="maps-choose"></a>**Auf der Karte wählen.** Die Schaltfläche „Auf der Karte“ einer Seite im Kraftstoff (Abflug oder Ankunft) öffnet die Karte auf diesem Flugplatz — ebenso „Auf der Karte wählen“ auf der Karte des Abflug- oder Ankunftsflugplatzes (tippen Sie auf sein Symbol; auf einem Telefon in voller Breite): Hintergrundkarte und Ebenen werden abgeblendet, das Blatt öffnet sich ausgeklappt („Fertig“ bleibt unten, immer sichtbar), die Ansicht passt sich dem Flugplatz und seinen zu Ihrer Wahl passenden Verfahren im Umkreis von 40 NM an, der Flugplatz in der Mitte (ferne Einflugpunkte bleiben außerhalb; ein gewähltes Verfahren, das die Ansicht verlässt, erweitert sie nur um sich selbst); von Anfang an sind die passenden Verfahren der ersten Familie blass gezeichnet: tippen Sie eines auf der Karte an, um es wie seine Zeile zu wählen. Oben im Datenblock Ihre Auswahl, eine Zeile pro Familie („Piste 31 · ↑ 12 kt“, „OKRI5L“, „I31 über IAF1“), jede mit ✕, um sie auf „Keine“ zurückzusetzen; ein Tippen auf den Namen einer Familie („Piste“, „STAR“, „Anflug“) führt zu ihrer Gruppe und klappt sie auf. Darunter die drei Familien auf einmal — die Piste, die SID (Abflug) oder die STAR, der Anflug (Ankunft) — in engen Zeilen: drei Tipper in beliebiger Reihenfolge. Jede Wahl schränkt die beiden anderen Familien auf das Passende ein; der Rest ist unter einer dünnen Zeile „N weitere · Alle“ eingeklappt, die ihn mit ⚠ markiert aufklappt (er bleibt wählbar). SIDs, die auf der eingegebenen Route enden, und STARs, die auf ihr beginnen, kommen zuerst, unter „Zu Ihrer Route“; die anderen folgen, markiert „Ausgang LACOU“ oder „Eintritt OKRIX“. Auf einer Direktroute (kein Punkt und keine Luftstraße zwischen den beiden Flugplätzen) nichts dergleichen: Sie ordnen sich nach ihrer Richtung zum anderen Flugplatz, „Richtung LFPO“ über den am besten ausgerichteten (unter 60°), ein kleiner Pfeil in Flugrichtung auf jeder Zeile. „Keine“ ist immer die erste Zeile. Verfahren, die sich nur durch die Piste unterscheiden (OKRI5L, OKRI5R), bilden eine Zeile „OKRI5“ mit ihren Pisten als kleine Etiketten: ein Tippen wählt die Familie und schränkt die Pisten ein, ein Tippen auf eine Piste wählt das Verfahren. Anflüge tragen ihre Kurzbezeichnung („ILS 06“, „RNP 06“, ohne Pistenetikett, da die Bezeichnung sie nennt, dieselbe auf der Karte; der veröffentlichte Name beim Überfahren); unter dem gewählten Anflug „Ohne Übergang“, dann seine Übergänge, darunter die Anfangsanflugsegmente, die der SIA für die ganze Piste veröffentlicht („via ODILO 1A“), im Farbton ihres Endanflugs; eine gewählte STAR lässt nur die Übergänge, die an einem ihrer Punkte beginnen (sonst geht der Übergang auf „Keine“ zurück); ein Übergang ohne gemeinsamen Punkt mit dem Endanflug wird gestrichelt angeschlossen. Jedes Verfahren hat seinen Farbton (acht, im Wechsel), gleich auf seiner Zeile, seiner Beschriftung und seiner Spur; auf der Karte eine kleine Beschriftung pro Familie und Punkt („NIMER 9“), und das überfahrene oder angetippte Verfahren liegt über allem, mit seinem vollen Namen; das Überfahren einer Zeile jeder Familie hebt ihre Spur hervor, das Überfahren einer Spur ihre Zeile; ⌛ (grau): unter einem früheren Zyklus gelesen. Der Code des Flugplatzes bleibt über den Verfahren geschrieben; Pistennummern nehmen ihren Platz vor den Funkfeuern ein, die ihnen weichen; eine Nummer, die auf ein Etikett fiele, wird nicht geschrieben (der Pfeil bleibt). Jede Piste trägt den Wind des bereits bekannten METAR: „↓ 12 kt“ Gegenwind, „↑“ Rückenwind, dann der Seitenwind (← Wind von rechts, → Wind von links: der Pfeil zeigt, wohin er weht, die Piste nach oben gezeichnet, wie in Kraftstoff), grün, orange oder rot nach Rücken- und Seitenwind; ohne METAR nichts. Ein Tippen auf eine Zeile oder eine Spur fügt diese Wahl hinzu und lässt sie auf der Karte (die Piste fett, das Verfahren in seinem Farbton, die anderen seiner Familie abgeblendet); noch wird nichts geschrieben. Ein Verfahren, das nur eine Piste bedient, setzt sie, wenn keine gewählt ist; sonst bietet eine Zeile unter der Gruppe die Korrektur mit einem Tippen an: „OPAL2E bedient 25 — Auf 25 wechseln“ oder „OKRIX5A bedient 07 nicht — OKRIX5B wählen“. „Fertig“, das Kreuz ✕ oder Esc bringen Sie mit allem Gewählten zurück zu Kraftstoff; Kraftstoff schreibt es und sagt, was sich geändert hat; die Karte schreibt nichts. Zum Verzichten, ohne etwas zurückzugeben: „← Kraftstoff“ oben.

<a id="maps-ground"></a>**Der Boden eines Flugplatzes.** Die Schaltfläche „Boden“ der Flugplatzkarte öffnet die Liste seiner Rollwege, Standplätze und Wartepunkte: ein Feld filtert nach Namen (ohne Groß-/Kleinschreibung und Akzente), Chips wählen die Art, und Darüberfahren oder Antippen einer Zeile hebt sie auf der Karte hervor (das Antippen stellt sie ein). Auf der Karte öffnet das Antippen eines Rollwegs oder Standplatzes seine Zeile. Die Ebene wird nahe gezeichnet (Rollwege ab Zoom 13, ihre Namen ab 15, Standplätze und Wartepunkte ab 16); ein Name ohne Platz ist in der Liste als „nicht gezeichnet“ markiert. Der Boden wird mit den Verfahren des Flugplatzes gelesen: solange sie nicht gelesen sind, sagt das Fenster es und verweist auf die Verfahren; danach zeigt es das Lesedatum. Daten © OpenStreetMap-Mitwirkende, ODbL. Konnte der Boden nicht gelesen werden, sagt das Fenster es mit dem Grund und bietet „Erneut versuchen“ an (nur der Boden, ohne die Verfahren neu zu lesen).

<a id="maps-coverage"></a>**Abdeckung.** Die Ebene „Abdeckung“ (in der Ebenenliste, anfangs aus, nur über ihr Kästchen eingeschaltet) färbt die Flugplätze danach, was dieses Gerät von ihren Verfahren liefern kann: **grün**, sie liegen vor (veröffentlicht, von Hand erfasst oder auf diesem Rechner gelesen); **orange**, sie liegen vor, sind aber nur teilweise gelesen (Seiten nicht gelesen, Verfahren zu prüfen: die Karte des Flugplatzes sagt, wie viele), oder sie werden auf Anfrage gelesen (Frankreich über das eAIP des SIA, ein Staat mit lesbaren Tabellen, ein Flugplatz der lokalen Little-Navmap-Datenbank); **rot**, nichts Lesbares (nur Bilder, Fließtext, nichts auf diesem Rechner). Die Legende (die „i“-Schaltfläche des Datenblocks) zeigt eine Zeile pro Farbe, solange die Ebene sichtbar ist. Nur die sichtbaren Flugplätze werden abgefragt. Berühren Sie einen Flugplatz: Seine Karte ergänzt eine Zeile mit Punkt, Stufe und Grund (⌛, wenn die vorliegenden Verfahren aus einem früheren Zyklus stammen, dann die Zahl der vorliegenden SID, STAR und Anflüge). Kann das Gerät diese Auskunft nicht geben, wird die Ebene nicht angeboten.

<a id="maps-weather"></a>**Profil und Cursor.** Im Datenblock unter der Karte schneidet das Vertikalprofil die Route von Anfang bis Ende: das Gelände, die
Lufträume, in die Sie auf der geplanten Höhe einfliegen, und die Flugbahn in Violett. Fahren Sie mit dem Finger über das
Profil: Ein blauer Cursor folgt ihm, und derselbe Cursor stellt sich auf der Karte ein. Tippen Sie auf die Route auf der
Karte, um ihn dorthin zu setzen. Die Zeile unter dem Profil sagt, was unter dem Cursor liegt: Entfernung ab dem Abflug,
geplante Höhe und Geländehöhe (beide über dem Meeresspiegel, AMSL), Höhe über Grund (ihre Differenz) und der Luftraum, in dem Sie sich an dieser Stelle befinden. Unter der Karte zeigt dieser
Datenblock das Profil; die Liste der Lufträume an einem Punkt oder die Meldepunkte eines Flugplatzes öffnen sich an
seiner Stelle, wenn Sie sie verlangen, und das Profil kommt beim Schließen zurück. Der Wolkenchip, (die drei Chips — Profil, Wolke, „i“ — stehen immer in der obersten Zeile rechts; einer ohne Inhalt ist nur ausgegraut), ersetzt es (der Profilchip bringt es zurück) durch den
Wetterschnitt entlang der Route (Wind, Temperatur, Wolken, Vereisung) auf der Flughöhe; der Schnitt folgt demselben Cursor, und ein Tippen darauf
verschiebt ihn. Die Schaltfläche „Streckenwetter“ ist die einzige Aktion: sie zeigt die bereits gespeicherte Vorhersage, liest sie sonst und nennt dann das über die Streckenmitte gewählte Modell („Streckenwetter · AROME 12 h“); ab dem Antippen sagt das Blatt „Streckenwetter wird gelesen…“ mit den verstrichenen Sekunden und die Schaltfläche ist belegt (zehn Antippen sind ein Lesen); das Lesen endet nach 20 s; das Ende wird immer gesagt: der Schnitt oder der Grund (offline, Tageslimit, über 20 s, HTTP-Antwort, nichts erhalten, Flug ohne Höhe) mit „Erneut versuchen“. Der letzte Chip „i“ (ausgegraut, solange die Zeichnung keine Legende hat) öffnet über dem Profil seine Legende (was jede Linie, Fläche und Marke ist); ein Wischen über den Wetterschnitt bewegt den Cursor wie beim Profil. Profil und Schnitt werden auf die genaue Höhe des Blocks gezeichnet, ihre Entfernungsachse bleibt immer sichtbar: in einem niedrigen Block entfallen Höhenbeschriftungen, nie die Achse.

<a id="maps-profile-spaces"></a>**Die Lufträume des Profils.** Das Profil zeigt nur die Lufträume, in die der geplante Vertikalweg eintritt (auf 500 ft genau); sich überlappende Sektoren einer Familie (die CTAs von Dublin) bilden dort eine Hülle, nach der Familie benannt; Free-Route-Luftraum (FRA) und W- oder Wetterforschungsgebiete erscheinen nur bei eingeschalteter Ebene „Andere Lufträume“; höchstens sieben Lufträume werden benannt, die übrigen in der Liste darunter. Die Luftstraßen, denen die Route folgt, sind dort benannte Blöcke („UN460“, Untergrenze – Obergrenze): Wo ein Luftraum höherer Klasse (A bis D) sie überdeckt, wird dieser gezeichnet, nicht die Luftstraße; ein Luftraum der Klasse F überdeckt nichts. Lufträume der Klassen E, F und G werden hell hinterlegt und zuletzt benannt, damit sie nichts verdecken.

**Die Lufträume nach Zoom und Komplexität.** Die Anzeige hängt nur vom Zoom und von der Komplexitätsstufe ab: die großen Familien (FIR und UIR, TMA und CTA, CTR) werden auf der ganzen Ansicht gelesen; R, D, P, TSA und die übrigen im Korridor des Flugs, solange „Nur rund um den Flug“ angehakt ist (die Hinweise sagen es und wie man mehr sieht); jede Familie erscheint bei ihrer Zoomschwelle, die eine Komplexitätsstufe um eine Stufe verschiebt. Die Größe des Blatts ändert nichts. FIR gibt es in den veröffentlichten Datenbanken nur für Frankreich.

**Das Blatt eines Luftraums.** Tippen Sie einen Luftraum an — seinen Block im Profil oder seine Zeile in der Liste der Lufträume an einem Kartenpunkt (kein Überfahren: ein Finger hat keines, und Bedingungen reichen über mehrere Zeilen) — und sein Blatt öffnet sich: Name und Art (ein P sagt „verboten“), Grenzen, die veröffentlichte Aktivierung (AZBA, NOTAM), Zeiten und AIP-Bedingungen, wenn die Datenbank sie führt, Stelle und Frequenz, Quelle und Datum. Für R-, D-, TSA- und TRA-Gebiete bleibt eine offene Zeile: „tatsächliche Aktivität unbekannt: nur veröffentlichte Zeiten (weder NOTAM noch AZBA gelesen)“. Sieben Zeilen, dann „n weitere“. Die aktuelle SIA-Datenbank führt die Zeiten und Bemerkungen noch nicht: das Blatt sagt es. Im Profil wählt ein erstes Antippen eines Blocks ihn aus (er wird hervorgehoben, sein Name und seine Grenzen erscheinen über dem Profil mit einer Schaltfläche „Blatt“); ein zweites Antippen dieses Blocks oder die Schaltfläche öffnet das Blatt; ein Antippen anderswo wählt nichts: das Profil wird nie ohne ausdrückliche Geste ersetzt. Das Blatt behält den Stapel der Lufträume des Punkts: Blöcke Untergrenze → Obergrenze auf der Höhenskala, auf ihre Grenzen zugeschnitten (nie leer), der gewählte hervorgehoben; ein Antippen eines Blocks wechselt das Blatt. Es steht in breiter Ansicht neben dem Stapel, am Telefon darunter, wo der Stapel oben bleibt, während das Blatt scrollt.

<a id="maps-profile-zoom"></a>**Profil zoomen.** Um das Profil genau zu lesen, zoomen Sie auf einen Teil des Fluges: mit zwei Fingern spreizen oder zusammenziehen (die Mitte der Finger bleibt an ihrem Platz) und mit zwei Fingern ziehen, um das Fenster zu verschieben; ein einzelner Finger bleibt der Lese-Cursor. Die Höhenskala passt sich an das an, was das Fenster zeigt (daher kommt die Genauigkeit), die Entfernungsmarken (NM) rücken mit zusammen, und Punkte außerhalb des Fensters werden nicht gezeichnet. Ein Doppeltipp führt zum ganzen Flug zurück, ebenso die Schaltfläche „Ganzer Flug“, die in der obersten Zeile erscheint, solange das Profil gezoomt ist. Am Bildschirm: das Mausrad zoomt um den Zeiger (mit Strg immer; ohne Strg, außer das Profil scrollt mit der Seite; das seitliche Feld von Kraftstoff bleibt an seinem Platz, das Mausrad zoomt dort auch), das horizontale Mausrad verschiebt das verengte Fenster, Ziehen auch (beim ganzen Flug ist das Ziehen der Lesecursor), Umschalt + Ziehen zeichnet ein Rechteck über die Entfernungen und zoomt es, ein Doppelklick führt zum ganzen Flug zurück. Der Zoom bleibt, solange die Seite geöffnet ist und die Route sich nicht ändert; er wird nie gespeichert. Der Wetterschnitt wird genauso gezoomt (dieselben Gesten, dieselbe Schaltfläche „Ganzer Flug“), und das Fenster ist für beide dasselbe: zoomen Sie in einem, wechseln Sie mit dem Chip zum anderen, und Sie finden denselben Flugabschnitt; der Schnitt passt auch seine Höhenskala an das an, was er zeigt.

**Ein feststehender Bildschirm.** Nichts zwischen Kopfzeile und Karte: die Karte und der Datenblock füllen den Bildschirm, und nichts scrollt außer dem Inhalt des Blocks. Die Schaltflächen liegen auf der Karte: rechts von oben „Route bearbeiten“ (der Stift), „Zentrieren“, der Kartenmodus, „Auf der Karte bearbeiten“ (die vier Pfeile) und zuletzt der Vollbildmodus (Esc verlässt ihn). „Ebenen“ sitzt auf der Zeile des Blatts, links von seinem Griff, neben dem, was es öffnet; ohne etwas zu zeichnen besteht das Blatt nur aus dieser Zeile. Der Block ist ein Blatt: Ziehen Sie seine obere Zeile (den kleinen Balken; in normaler Höhe trägt die Zeile über einem Profil oder Schnitt keinen Titel, nur die drei Chips) nach oben, um ihn zu vergrößern, nach unten, um ihn auf diese Zeile zu verkleinern, was der Karte die ganze Höhe
lässt; ein Tippen auf die Zeile klappt ihn ein oder bringt ihn auf seine normale Höhe zurück.

**Sechs Kartenmodi.** Die Modus-Schaltfläche rechts auf der Karte zeigt den gewählten Modus; tippen Sie darauf, um die
sechs Modi zu sehen. „IFR unten“: untere Flugwege, Lufträume, Mindesthöhen und Funkfeuer. „IFR oben“: obere Flugwege
(UN…, UM…), Lufträume über FL195. „VFR“: topografischer Hintergrund mit Städten, den für VFR wichtigen Lufträumen,
Meldepunkten und Hindernissen. „Topo“: das Gelände und, aus der Nähe, die Höhenlinien (alle 500 ft oder 100 m je nach
Ihrer Einheit, die Zähllinien beschriftet), nur mit Flugplätzen, Städten und Hindernissen. „OAT“: Militärflug, das IFR
Ihrer Flughöhe plus die Luftbetankungsstrecken, die NAT-Tracks des Tages, die Gebiete R, D, P, TSA, TRA, CBA und das
Tiefflugnetz in allen Höhen. „Auto“ wählt nach der Flugfläche Ihres Flugs (IFR oben ab FL195). Der Modus bleibt auf
diesem Gerät erhalten.

**Je näher Sie zoomen, desto mehr zeigt sie.** Von weitem zeigt die Karte nur die großen Flugplätze, die Flugwege und
ihre Namen. Näher: die Punkte der Flugwege (Dreiecke und Funkfeuer), die Mindestflugfläche jedes Flugwegs („F195“), dann
die Länge des Abschnitts, sein Kurs („097°“), die Meldepunkte und die Hindernisse. Aus der Nähe trägt jedes Hindernis
seine Höhe über Grund und die Höhe seiner Spitze in Klammern („434 AGL (771)“).

<a id="maps-layers"></a>**Ebenen.** Die Ebenen-Schaltfläche links auf der Karte öffnet im Datenblock, anstelle des Profils, die Liste dessen, was die Karte zeichnet (das ✕ bringt das Profil zurück). Zuerst, unter der Flugauswahl, der Regler „Komplexität“: Er wirkt, als wäre der Zoom ein anderer, eine Zoomstufe pro Raststellung (−4 bis +4) — nach links weniger, nach rechts mehr Details. Was jeder Zoom zeigt, legt der Administrator fest (Einstellungen, Karte „Verwaltung“). Dann die
Luftraumfamilien (TMA / CTR, D / R / P, FIR, andere), untere und obere Flugwege, Funkfeuer, Flugwegpunkte,
VFR-Meldepunkte, Hindernisse, Mindesthöhen, Städte, Gradnetz, Ausweichflugplatz, Namen der Lufträume, Namen der
Flugwege. Haken setzen oder entfernen: die Karte folgt, und Ihre Wahl bleibt für diese Einstellung auf diesem Gerät
erhalten. „Alles zurücksetzen“ kehrt zur ursprünglichen Wahl zurück. Ganz oben beschränkt „Nur rund um den
Flug (schneller)“, in IFR vorgewählt, Lufträume und Flugwege auf die Umgebung des Flugs: Der Titel des Bereichs endet dann
mit „rund um den Flug“, und der Chip „i“ sagt, dass außerhalb des Korridors nichts gelesen wird; ohne Haken („sonst die
ganze Ansicht“) wird die ganze Ansicht gelesen, überall gleich dicht, nur nach der Komplexität gefiltert — außer bei einer
Ansicht von mehr als 600 NM Breite, die trotzdem rund um den Flug gelesen wird (der Chip „i“ sagt es). Aus der Nähe wird
ohnehin alles gezeichnet. Jedes Element der Karte hat seinen Zoombereich: VFR-Meldepunkte
erscheinen erst ganz nah, CTR aus der Nähe, TMA in mittlerer Ansicht, FIR von weitem. Auch die Größe der Karte zählt: In
einem kleinen Rahmen (Telefon, Fenster der Doppelansicht) zeigt sie bei gleichem Zoom weniger Elemente als in einem
großen, als wären Sie weiter weg (der Zoom wird um den Mittelwert aus Höhe und Breite des Rahmens korrigiert, 900 px
bedeuten keine Korrektur).

<a id="maps-airspaces"></a>**Antippen oder darüberfahren für mehr.** Tippen, klicken oder fahren Sie über den Namen eines Flugwegs, die
Beschriftung eines Luftraums oder eine Windfieder: eine kleine Blase nennt das Wesentliche in zwei Zeilen — für einen
Flugweg den Abschnitt (Punkt → Punkt), seine Länge, seine Kurse, Unter- und Obergrenze; für einen Luftraum seinen Namen
und seine Grenzen in AIP-Schreibweise („TMA 8 AQUITAINE 2000|FL145 D“). Anderswo in einem Luftraum angetippt, zeigt der
Datenblock unter der Karte die Lufträume unter Ihrem Finger, einen oder mehrere, anstelle des Profils: ein Diagramm der
Höhen wie das Vertikalprofil (eine nummerierte Säule je Luftraum, von der Untergrenze bis zur Obergrenze), dann die
nummerierte Liste mit ihren Grenzen, gelesen wie die senkrechte Achse: das Höchste oben (Nummer 1 ist der Luftraum mit der höchsten Obergrenze, links im Diagramm), das Niedrigste unten. FIR, UIR, SIV und Kontrollsektoren ohne Grenzen, wie jeder Luftraum von der Oberfläche bis zur Obergrenze, werden weder gezeichnet noch gezählt (man durchfliegt sie nicht): ihre Namen stehen in einer eingeklappten Zeile „Auch hier (n)“ unter der Liste und in einer letzten grauen Zeile der Hinweisblase („Auch hier: FIR PARIS · SIV POITIERS“), die FIR oder das SIV, das man ruft, ohne Säule. Das ✕, Escape oder ein Tippen auf eine leere Stelle der Karte schließen ihn und das
Profil kommt zurück, ein weiteres Tippen auf Lufträume ersetzt ihn; die Karte zu bewegen lässt ihn stehen. Die Karte
bewegt sich nicht und ändert ihre Größe nicht. Die Hinweisblase beim Darüberfahren folgt dem Zeiger, bleibt 5 Sekunden,
macht der nächsten Platz und schließt sich mit einem Tippen woanders oder einer Kartenbewegung. Über einer
Funkfeuer-Anlage nennt die Blase Art, Kennung und Frequenz; wo mehrere Anlagen am selben Ort stehen, behält die Karte
die nützlichste (VOR, TACAN oder DME, dann NDB, dann ILS) und die Blase nennt die anderen („auch hier: ILS 25L BG
109.9“). Auf dem Profil geben Finger oder Maus ebenso die durchflogenen Lufträume an.

<a id="maps-vfr"></a>**Die VFR-Meldepunkte eines Flugplatzes.** Fahren Sie mit der Maus über einen Flugplatz: seine Meldepunkte und die
Abläufe aus seinen VAC-Karten leuchten auf (benannte Kreise, Striche zwischen den Punkten). Auf der Karte trägt ein
Meldepunkt nur sein Kurzzeichen („NA“, „E“, „SE“ …), damit die Karte lesbar bleibt; der lange Name steht in der Blase
und in der Liste. Tippen Sie den Flugplatz an: Die Karte zoomt auf seine Punkte, wenn sie gedrängt sind, und der
Datenblock unter der Karte gibt anstelle des Profils die Liste der Punkte (Kurzzeichen, langer Name, Einschränkungen),
die Abläufe (mit der VAC-Seite), dann die Anweisungen der VAC, seitenweise eingeklappt; er scrollt, wenn der Inhalt lang
ist. Er bleibt offen, während Sie die Karte bewegen: das ✕ oder Escape schließen ihn und das Profil kommt zurück, ein
anderer Flugplatz ersetzt ihn. Das Antippen eines Meldepunkts öffnet ebenso den Inhalt seines Flugplatzes, dieser Punkt
zuerst. Im VFR-Modus werden die Punkte des Abflug- und des Ankunftsflugplatzes automatisch gezeigt. Diese Daten werden
automatisch aus den VAC extrahiert: Sie sind mit „zu prüfen“ gekennzeichnet und nicht die veröffentlichte Route; die
VAC-Karte hat Vorrang. Wurde der Flugplatz von Hand analysiert, sagt der Block es, die Routen tragen ihren Namen, ihre
Bahnen und Bedingungen, eine geprüfte Spur folgt der VAC-Karte (lange Striche) und ein Pfeil kennzeichnet eine
Einbahnroute. Die Meldepunkte der Datenbank sind immer da, schwarz für Flugzeuge und grün für Hubschrauber; die Abläufe
und Anweisungen der VAC kommen hinzu, sobald der Administrator sie importiert hat (Einstellungen › Wartung). Ein Meldepunkt ist eine einzige Zeile in der Liste und eine einzige Beschriftung auf der Karte, auch wenn Datenbank und
VAC-Karte ihn beide nennen: die Zeile behält die Beschreibung und die veröffentlichte Position der Datenbank und sagt „VAC-Position 1,2 NM entfernt“,
wenn die VAC-Karte ihn mehr als eine halbe Meile davon setzt.

<a id="maps-started"></a>**Im Flug.** Sobald der Flug in Kraftstoff gestartet ist, zeigt die Karte, wo Sie sein sollten (hohles Flugzeug,
„geplant 14:32Z“), und wo Sie sind (volles Flugzeug, nach Ihrem Kurs gedreht, mit der gepunkteten geflogenen Spur seit dem
Abflug, die ein Wechsel des Tabs nicht verliert). In den Notizen des Datenblocks, unter dem Profil, nennt eine Zeile die Abweichung: voraus oder verspätet (Minuten und NM), wie viele NM neben der
Route, und Ihre Höhe gegenüber der geplanten; das Profil zeigt beide Höhen. Aus der Nähe trägt jeder Punkt seine
voraussichtliche Zeit (ETA) unter seinem Namen, nie über einem Flugplatz, in UTC („14:52Z“), die Ortszeit in Klammern bei Abflug und Ankunft. „Folgen“ hält die Karte auf Ihrer Position; ein Verschieben der Karte beendet es. Ohne
Position (GPS oder Netz nicht aktiviert) sagt es eine Benachrichtigung einmal, die Zeile bleibt in den Notizen, mit einer Schaltfläche „Position aktivieren“; eine Position, die älter als 2
Minuten ist, erscheint grau. Die Zeile endet mit der Quelle der Position: GPS, Netz, IVAO, VATSIM, X-Plane oder Little
Navmap. Die voraussichtlichen Zeiten erscheinen auch für einen in Kraftstoff datierten Flug, vor dem Abflug. Nach der Ankunft ersetzt die Notiz „Angekommen“ die Zeile und „Folgen“ verschwindet; eine Ausweichlandung wird in den Notizen genannt.

**Höhenwinde.** Hat Kraftstoff die Windvorhersage in der Flughöhe, zeigt die Karte sie als Windfiedern entlang der
Route: an jedem Punkt und alle 50 NM zwischen zwei Punkten. Der Schaft zeigt, woher der Wind kommt; ein Wimpel steht für
50 kt, eine Fieder für 10 kt, eine halbe Fieder für 5 kt. Tippen Sie eine Fieder an (oder fahren Sie mit der Maus
darüber): die Blase nennt Richtung, Stärke, Temperatur, Flughöhe und die Stunde der Vorhersage. Die Ebene „Höhenwinde“
blendet sie aus.
Die Windfiedern werden aus derselben Vorhersage wie der Wetterschnitt gelesen (nichts weiter wird abgefragt): hat der Schnitt Wind, hat ihn die Karte. Wo das gewählte Modell die Route nicht abdeckt (die Streckenmitte wählt es), gibt es keinen Pfeil: die Blase sagt „Hier kein Wind (außerhalb ARPEGE)“; nie derselbe Pfeil wiederholt. Die Aktion „Streckenwetter“ liest dann das abdeckende Modell (GFS) für diese Lücken, und jede Windfieder nennt ihr Modell in der Blase. Auf einer Ansicht von mehr als 3 000 NM Breite (eine Route auf einen anderen Kontinent) sind die Windfiedern ausgeblendet und die Hinweise sagen es: zoomen Sie hinein, um sie zu sehen.

**Stufen.** Legt die Route in Kraftstoff an einigen Punkten eine Flugfläche fest, zeichnet das Profil die Stufen:
Steigflug, Reiseflug, neuer Steig- oder Sinkflug, mit neu berechnetem Ende des Steigflugs und Beginn des Sinkflugs.
Die Wegpunkte der Route sind auch auf dem Profil markiert.

**Steig- und Sinkflug.** Die violetten Rauten markieren das Ende des Steigflugs (TOC) und den Beginn des Sinkflugs
(TOD), auf der Karte wie im Profil. Sie stammen aus der Berechnung in Kraftstoff; ohne sie schätzt die Karte sie mit
üblichen Steig- und Sinkraten. Wenn der Platz knapp ist, schreibt die Karte zuerst den Namen des Flugplatzes, dann die
Pistennummern, die Funkfeuer, die Verfahren, die Route (Namen, Zeiten, TOC / TOD), zuletzt den Rest; eine geschätzte
Zeit oder der Name von TOC / TOD gleitet entlang der Route, bevor sie entfällt (die Raute bleibt).

**Ein Flug, der eine Mission nennt.** Die Karte bleibt die des Flugs, mit allem, was sie kann (Wetter, Verfahren, Routenbearbeitung, Ebenen-Felder, vorgeschlagene Routen); die Mission wird darübergelegt: ihre Gebiete, ihre Punkte mit Rolle (Abflug, Ankunft, Ziel …) und oben links ein Fenster mit Titel, Kennung, Familie und zwei Listen: „Mitgelieferte Karte“ („Flug“ zuerst, dann die Karten der Mission: eine zu wählen zeigt sie an Ort und Stelle, Kraftstoff bleibt daneben, „Flug“ kehrt zum Flug zurück) und „Ansicht“.

**Die Missionskarten.** Eine Mission öffnet sich aus Missionen („Auf der Karte ansehen“) oder aus dem Fenster eines Flugs, der sie nennt; ein Fenster oben links auf der Karte ist der einzige Ort, um Mission, mitgelieferte Karte (Übersicht, Ziel, Detail…) und Ansicht zu wählen; die Ebenen stellen nur ein, was angezeigt wird.
Jede Karte
wird wie im Studio neu gezeichnet: gleicher Rahmen, gleiches Anzeigeprofil, mit den Punkten der Mission, ihren
schraffierten Gebieten und ihrer Route. Das Vertikalprofil zeigt dann das der Mission.
Eine mitgelieferte Karte (im Fenster eines Flugs gewählt oder „Auf der Karte ansehen“ in Missionen) zeigt: eine Leiste oben nennt Titel, Kennung, Familie, die gezeigte mitgelieferte Karte und, wenn es mehrere gibt, deren Auswahl (höchstens sieben). Gebiete sind eine leichte Fläche mit ihrem Namen, Punkte tragen ihre Rolle (Abflug, Ankunft, Ziel …), und die Legende („i“) benennt sie. Das Kreuz der Leiste entfernt sie: zurück zum Flug mit allen seinen Ebenen; eine andere Mission wählt man in der Ebenenliste. Die Karte öffnet sich in der Ansicht ihres Zwecks: das Profil im YAML der Karte hat Vorrang; sonst öffnen sich Ziel-, Detail-, Treffpunkt- und Zonenkarten einer operativen Mission (SAR, MEDEVAC, FIRE, LE, ISR, COMBAT, MARITIME, AAR, AIRLIFT, COMMAND: alles außer kommerziell) in VFR Topo (Relief, Hindernisse, VRP, VFR-Flugplätze, untere Lufträume), die Übersichtskarte und eine kommerzielle Mission behalten die Ansicht des Fluges. Das Banner bietet „Ansicht“: VFR Topo, IFR oder Nur Hintergrund; die Wahl wird für diese Karte auf dem Gerät gemerkt, und das Entfernen des Banners gibt die Ansicht des Fluges zurück.

<a id="maps-edit"></a>**Die Route auf der Karte ändern.** Tippen Sie auf „Auf der Karte bearbeiten“ (die vier Pfeile, rechts auf der Karte; beim ersten Mal erscheint eine kurze Hilfe): die Wegpunkte erhalten einen
Kreis. Ziehen Sie einen Punkt auf einen Fix, ein Funkfeuer oder einen Flugplatz: er setzt sich dort (anderswo
losgelassen, wird er ein freier Punkt, nach seinen Koordinaten benannt, etwa 4530N00030E). Um einen Punkt hinzuzufügen,
tippen Sie auf „+“ (in derselben Spalte) und dann auf die gewünschte Stelle (oder halten Sie eine halbe Sekunde gedrückt):
auf einem Fix, einem Funkfeuer oder einem Flugplatz setzt er sich dort, anderswo ist es ein freier Punkt; er wird dem
nächstgelegenen Abschnitt hinzugefügt. Ein einfaches Tippen fügt nichts hinzu: es zeigt die Blase. Tippen Sie einen
Routenpunkt an: seine Karte nennt seine Flughöhe und bietet „Entfernen“ an. Ein Punkt, den die Mission vorgibt (Treffpunkt, Ziel, Quelle; gefülltes Quadrat, „von der Mission vorgegeben“ auf seiner Karte), wird weder verschoben noch entfernt: die übrigen Punkte bleiben dem Piloten. Abflug und Ankunft bewegen sich hier nicht.
Auf dem Profil ziehen Sie eine Flughöhe nach oben oder unten: sie ändert sich ab dem Punkt, der diesen Abschnitt
eröffnet, in Schritten von FL10 (auf dem ersten Abschnitt ist es die Flughöhe des Flugs); in der Karte eines Punkts tun
„−“ und „+“ dasselbe. „Rückgängig“ nimmt die letzte Geste zurück. Jede Änderung wird sofort im Flug gespeichert, und
Kraftstoff rechnet neu; das Profil folgt. Erneutes Tippen auf die Schaltfläche (oder Esc) schließt den Modus, und die Karte lässt sich wieder mit dem Finger
verschieben. Um die Route als Text einzugeben, öffnet der Stift oben in der rechten Spalte („Route bearbeiten“) den Schritt Route von Kraftstoff. Solange der Modus aktiv ist, behält die rechte Spalte nur „Auf der Karte bearbeiten“, „+“, „Rückgängig“, „Zentrieren“ und den Vollbildmodus.

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

**Kein Flug.** Ohne vorbereiteten Flug ist die Karte leer und bietet „Kraftstoff öffnen“ an. Die Missionskarten bleiben über die Liste der Ebenen erreichbar.

**Flug über die Datumsgrenze.** Ein Flug über den 180. Längengrad (zum Beispiel von Sibirien nach Alaska) wird in einem Stück gezeichnet: die Karte setzt sich jenseits der Linie fort, Entfernungsmarken, Profil und Wetterschnitt folgen der Route, die mit Längen zwischen −180° und 180° gespeichert bleibt.

**Luftfahrtdatenbank fehlt.** Wurde die Luftfahrtdatenbank noch von keinem Gerät der Fluggesellschaft veröffentlicht,
zeigt die Karte nur die Route und sagt es einmal (Benachrichtigung, dann Notiz im Datenblock).

**Gebiet nicht behalten.** Offline, über einem nie angesehenen und nicht behaltenen Gebiet, hat die Karte nichts zu
zeigen; die Schaltfläche „Offline-Daten“ öffnet die Einstellungen, um es beim nächsten Mal zu behalten.

**Anderer Zyklus.** Jede Missionskarte merkt sich den Datenzyklus, mit dem sie erstellt wurde. Stammt die aktuelle
Datenbank aus einem anderen Zyklus, sagt es eine Zeile: Die Lufträume können sich seitdem geändert haben.

**Alte Mission.** Eine vor dieser Version gespeicherte Mission enthält ihr Anzeigeprofil nicht. Die Karte nimmt dann
das übliche Profil des Kartentyps (detailliert für ein Ziel oder ein Detail, sonst vereinfacht) und weist darauf hin.
Es genügt, die Mission im Studio zu öffnen und zu speichern, damit sie danach ihr eigenes behält.

<!-- fr: 8fdd30cdbb88 -->

<!-- chapter: atmosphere -->
# Wetter

Die Atmosphäre entlang des in Kraftstoff vorbereiteten Flugs: eine Wetterkarte in der gewählten Höhe, der senkrechte
Schnitt der Route, der Schnitt eines Punkts, zur Abflugzeit oder später.

## So geht's

<a id="atmosphere-flight"></a>**Der Flug.** Wetter zeigt immer den in Kraftstoff vorbereiteten Flug (Route, Höhe, Flugdatum). Ohne geplanten Flug
sagt die Seite es und führt zu Kraftstoff; „Beispiel ansehen" zeigt einen Vorführflug, im Griff als solcher markiert.

<a id="atmosphere-load"></a>**Die Vorhersage laden.** Die Ladeschaltfläche (der Pfeil nach unten, rechts auf der Karte) liest die Vorhersage entlang
der Route und um sie herum. Beim Öffnen wird nichts abgefragt: die Seite zeigt, was das Gerät schon gespeichert hat, und die Schaltfläche sagt
vorher, was das Laden kosten würde („Laden (≈ 120 Abrufe)“ oder „schon auf dem Gerät“).
Außerhalb des Fluggebiets zeigt die Karte die mit der Anwendung veröffentlichte Weltsynoptik, ohne etwas abzufragen.

<a id="atmosphere-map"></a>**Die Wetterkarte.** Isobaren, Isothermen, Wolken, Wind, Jetstream und Konvektion in der mit dem Höhenchip gewählten
Höhe („Boden", die angeforderte Höhe, die berechnete Bahn oder eine feste Höhe). Der Ebenen-Chip links vom Griff des Blatts
öffnet ein Feld über der Karte, direkt über dem Blatt: Es wählt, was auf der Karte und im Profil gezeichnet wird, und der Schnitt bleibt unten
sichtbar und wird bei jedem Kästchen neu gezeichnet; das Kreuz oder Esc schließt es. Tippen Sie auf einen Punkt der Karte, um seinen Schnitt zu öffnen.

<a id="atmosphere-zones"></a>**Das Fluggebiet und die Welt.** Eine dünne Linie umgibt das Fluggebiet: innen die für den Flug geladene feine Vorhersage
(Météo-France AROME 1,3 km und ARPEGE 0,1° über Frankreich, ICON in Europa); außen die Weltsynoptik (NOAA GFS, mit
einem 5°-Raster veröffentlicht). Die beiden Modelle sagen nicht ganz dasselbe: ein Sprung der Linien an der Grenzlinie
ist normal. Das Ebenen-Feld nennt beide Modelle und ihr Raster. Ohne Weltsynoptik oder mit einer, die älter als 12 h ist, sagt die erste Zeile des unteren Blatts das und bietet „Erstellen (2 Min.)“ an: der Launcher dieses Rechners berechnet sie (NOAA GFS, ohne Schlüssel) und die Ebene erscheint auf der Karte; ohne Launcher sagt die Zeile, wo es geht.

<a id="atmosphere-date"></a>**Das Flugdatum.** Der Regler unter dem Griff verschiebt die Zeit von 0 bis 72 Stunden nach dem geplanten Abflug: Karte,
Schnitt und Punktschnitte folgen. Liegt ein Teil des Reglers außerhalb der gelesenen Vorhersage (ein geplanter Abflug in
der Vergangenheit, noch nicht geladene Tage), zeigt ein Band unter dem Regler die abgedeckten Stunden; sonst wird die
nächste Stunde gezeigt, ⚠ sagt es in der Zeile des Reglers und im Griff, und eine Warnung erscheint.

<a id="atmosphere-cut"></a>**Der Schnitt und die Punktschnitte.** Unter der Karte zeigt der Schnitt die Route von Anfang bis Ende, vom Boden bis
über die Flughöhe. Tippen Sie darauf, um den Schnitt des nächsten Punkts zu öffnen (das senkrechte Profil der
Atmosphäre dort); ◀ und ▶ wechseln zum Nachbarschnitt, ✕ kehrt zum Schnitt zurück. Die Zeichnung passt immer in den
Block, ihre Entfernungsachse sichtbar; vergrößern Sie den Block für mehr Einzelheiten.

<a id="atmosphere-zoom"></a>**Den Schnitt zoomen.** Ziehen Sie den Schnitt mit zwei Fingern auf (oder Strg + Mausrad), um nur einen Teil zu zeigen,
und verschieben Sie ihn mit zwei Fingern; Entfernungen, Punkte, Winde und die Höhenskala folgen dem gezeigten Teil. Ein
einzelner Finger behält seine Rolle (Punktschnitt öffnen, Block verschieben). „Ganzer Flug" in der Griffzeile, ein
Doppeltipp oder ein Doppelklick kehren zur ganzen Route zurück; eine Routenänderung ebenfalls.

<a id="atmosphere-details"></a>**Die Details.** Die Listen-Schaltfläche rechts auf der Karte zeigt im Block die Zusammenfassung
des Flugs (Entfernung, Profil, Steigflug, mittlerer Wind und Abweichung von der Normatmosphäre im Reiseflug,
0-°C-Isotherme), die Flugplätze (METAR und TAF) und die Tabelle entlang der berechneten Bahn; tippen Sie auf eine Zeile der
Tabelle, um den Schnitt dieses Orts zu öffnen.

<a id="atmosphere-settings"></a>**Flug und Einstellungen.** Die Flugzeug-Schaltfläche rechts auf der Karte öffnet den
gezeigten Flug: seine Quelle (der aktuelle Flug aus Kraftstoff, das Beispiel, eine Datei `current_flight.json` oder eine
eingegebene Route), den Abflug (UTC), die angeforderte Höhe, die Reisegeschwindigkeit, die Daten (Open-Meteo-Vorhersage
oder Offline-Vorführung) und das Raster der Karte. Ein zweites Tippen auf die Schaltfläche kehrt zum Schnitt zurück.

<a id="atmosphere-legend"></a>**Die Legende.** Der Chip „i" in der Griffzeile rechts (nach ◀ und ▶) zeigt die Legende des Gezeichneten; ein Tippen auf
die Legende, den Chip oder Escape schließt sie.

- Schnitt: berechnete Bahn (durchgezogen: Steigflug, Reiseflug, Sinkflug), geplante Höhe (gestrichelt), angeforderte
  Höhe (gepunktet), Steigflugende und Sinkflugbeginn (TOC, TOD), Wolken (grau, dunkler: mehr Bedeckung), Isothermen
  alle 5 °C (0 °C dick blau), Inversionen und Vereisung (Schraffur), Wind (Fiedern: halb 5 kt, voll 10, Wimpel 50),
  geschätzte Cumulus-Basis (grau gepunktet), Gelände, Routenpunkte (senkrechte Linien); bei einem hohen Block die
  Bänder unten: tiefe, mittlere, hohe Bewölkung, Niederschlag, Sicht unter 8 km.
- Punktschnitt: Temperatur (rot), Taupunkt (grün), Normatmosphäre (gestrichelt), die drei Höhen des Flugs an diesem
  Ort, Inversionen, Wolken (Spalte rechts), Wind, Gelände.

## Gut zu wissen

- Die Vorhersage kommt von Open-Meteo (Météo-France AROME und ARPEGE über Frankreich, ICON in Europa, GFS anderswo);
  die Weltsynoptik kommt von GFS (NOAA), alle 3 Stunden bis 72 Stunden.
- Das Geladene bleibt auf dem Gerät und dient offline, im Wetterspeicher, den Kraftstoff, Karte und Wetter teilen;
  die Karte übernimmt seinen Wetterschnitt. Die Aufrufe des Tages bei Open-Meteo werden im Statusblock der
  Einstellungen gezählt.

<!-- fr: 730918eb6af9 -->

<!-- chapter: report -->
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

<a id="report-load"></a>**Zuladung.** „Verwenden“ übernimmt Familie und Serie des Flugs; Sie können sie ändern, der Bericht hat das letzte Wort. Eine Serie, die etwas befördert (Fracht, Passagiere, VIP), fügt im letzten Schritt die Karte „Zuladung“ mit einem einzigen Feld hinzu: die beförderte Fracht in kg oder die Zahl der Passagiere. Jede andere Serie fügt nichts hinzu.

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

<!-- chapter: flightlog -->
# Meine Flüge

Alle Ihre vergangenen Flüge an einem Ort, eine Zeile pro Flug, vom neuesten zum ältesten: Ihre Berichte, das Flugbuch
der Website der Fluggesellschaft und Ihre IVAO- oder VATSIM-Verbindungen, ohne Doppelungen.

## So geht’s

<a id="flightlog-totals"></a>**Die Summen.** Oben drei Felder: die Anzahl der Flüge, die Blockstunden und die Flüge, die noch keinen Bericht haben,
für den gewählten Zeitraum. Direkt darunter die drei Muster, die Sie am meisten geflogen sind.

<a id="flightlog-filters"></a>**Die Filter.** Wählen Sie den Zeitraum (7 Tage, 31 Tage, 1 Jahr, alle), suchen Sie nach einem Rufzeichen, einem
Muster, einem Kennzeichen, einem Flugplatz, einem Einsatz oder einer Berichtsnummer, oder setzen Sie das Häkchen bei
„Ohne Bericht“, um nur die Flüge zu sehen, die auf einen warten. Ihre Auswahl bleibt auf dem Gerät: Beim nächsten
Besuch erinnert ein Chip daran („1 Jahr · LFRS ✕“) und entfernt sie mit einem Tippen. Ein „—“ statt der Blockzeit:
ein Bericht ohne Zeiten.

<a id="flightlog-list"></a>**Die Liste.** Eine Zeile pro Flug: Datum, Rufzeichen, Route und Blockzeit; wenn Sie für mehr als eine Fluggesellschaft fliegen, die Fluggesellschaft jedes Berichts. Ein orangefarbener Punkt markiert einen Flug
ohne Bericht. Auf einem Computer zeigt die Zeile auch das Luftfahrzeug und die Nummer des Berichts.

<a id="flightlog-detail"></a>**Die Einzelheiten eines Flugs.** Tippen Sie auf eine Zeile, um sie aufzuklappen: woher der Flug stammt (Bericht,
Website-Flugbuch, IVAO- oder VATSIM-Netz), seine Uhrzeit, das Luftfahrzeug, der Einsatz und die Bemerkungen.

<a id="flightlog-report"></a>**Den Bericht schreiben oder öffnen.** Bei einem Flug ohne Bericht öffnet „Bericht schreiben“ einen neuen Bericht,
bereits mit diesem Flug ausgefüllt — Datum, Luftfahrzeug, Rufzeichen, Flugplätze — und mit einer vorgeschlagenen
Einsatzart. Bei einem Flug mit Bericht öffnet „Bericht öffnen“ ihn erneut zum Bearbeiten.

<a id="flightlog-current"></a>**Der laufende Flug.** Ein in Kraftstoff gestarteter („Flug starten“) und noch nicht berichteter Flug erscheint oben,
„Laufend — gestartet um hh:mm“ (eine Ausweichlandung wird angezeigt), noch bevor das Website-Flugbuch ihn kennt.
„Bericht schreiben“ öffnet den Bericht, der diesen Flug zuerst vorschlägt; sobald der Bericht gespeichert ist,
verschwindet die Zeile.

<a id="flightlog-more"></a>**Mehr.** Klappen Sie „Mehr“ auf, um die gefilterte Liste als CSV (Tabellenkalkulation) zu exportieren oder Ihre IVAO-
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

<!-- fr: 7b729c25101f -->

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

**Der Status.** Der Bildschirm öffnet sich mit dem Block „Status“, mit demselben Punkt wie die Schaltfläche ⚙ der Kopfzeile
(grün: etwas Neues; orange: Aufmerksamkeit). Eine Zeile pro Sache, zum Handeln antippen: der laufende Flug (zur Karte), die zu
schreibenden Berichte (zum vorausgefüllten Bericht), das fehlende Kürzel (zu „Identität“), die Luftfahrtdatenbank, solange
sie nicht bereit ist (zu „Datenzugang“), der Zustand der Daten und der genutzte Austauschweg (zu „Synchronisation“ oder zu den
Konflikten), der Starter, „Offline“ und auf einem Telefon die Position während eines Flugs.

**Die Gruppen.** Auf der Stufe Einstieg zeigt der Bildschirm höchstens sieben Karten untereinander: Identität,
Datenzugang, Synchronisation (wenn sie gebraucht wird), Nutzungen, Stufe, Design und Über. Die Sicherung, die
Offline-Daten, der Wetterschlüssel, die Little-Navmap-Profile und der Zugang des Rechners kommen ab der Stufe Alltag.
Auf den Stufen Alltag und Vollständig sind die Karten unter sieben Titeln geordnet, in der Reihenfolge, in der man die
Dinge einstellt: Identität, Zugang, Daten, Gerät, Anzeige, Verwaltung (Stufe Vollständig) und Hilfe. Jeder Titel ist
eingeklappt; tippen Sie ihn an, um ihn zu öffnen. Eine Gruppe, die Aufmerksamkeit braucht (eine Warnung, ein Fehler oder
die Karte, zu der eine orange Statuszeile führt), öffnet sich von selbst, mit einem orangen Punkt; eine Zeile des Blocks
„Status“ öffnet die Gruppe ihrer Karte. Eine von Hand geöffnete Gruppe bleibt offen, solange die Seite offen ist. Die
Karten des Augenblicks (gefundene V2-Einstellungen, erhaltene Konfiguration, Fortsetzung des Beitritts) stehen auf jeder
Stufe oben und verschwinden, sobald sie erledigt sind. Eine über ihre Adresse geöffnete Karte (etwa die Schaltfläche
„Offline-Daten“ des Assistenten „Der Fluggesellschaft beitreten“) wird allein gezeigt, auf jeder Stufe; „← Einstellungen“
führt zur Liste zurück.

**Ihre Identität.** Tippen Sie unter „Identität“ Ihr Kürzel und Ihre IVAO-VID, VATSIM-CID und SimBrief-ID, dann
„Speichern“. Die Werkzeuge nutzen sie zum Vorausfüllen; mit mehreren Nutzern ist das Kürzel nötig.

**Die Stufe.** „Stufe“ wählt, was das Menü zeigt: Einstieg, Alltag oder Vollständig, mit einem Tippen. Unter jeder Wahl
sagt die Zeile „Menü:“, welche Werkzeuge sie zeigt; ein ausgeblendetes Werkzeug bleibt über seine Adresse erreichbar.

**Das Design.** „Design“ zeigt eine Vorschau je Aussehen — Standard, Kabinett, Robust — und den Ton: Automatisch (wie
das System), Tag oder Nacht. Ein Tippen wendet es sofort an, nur auf diesem Gerät. Ein dem Computer vorbehaltenes
Design gilt nicht auf einem Telefon: Die Karte sagt, welches stattdessen gezeigt wird, und seine Vorschau ist markiert;
ein Tippen auf eine Vorschau ersetzt diese Wahl.

**Die Nutzungen.** Der Satz oben in „Nutzungen“ sagt, wie Daten ausgetauscht werden. Ohne angekreuztes Kästchen sind Sie
„Allein auf diesem Gerät“: Nichts geht anderswohin. Kreuzen Sie „Allein, auf mehreren Geräten“ oder „Mehrere Nutzer
(Git-Datenrepository)“ an, um auszutauschen. Auf einem vom Starter bedienten Rechner liest und schreibt die App bereits
den Ordner `data/` des Starters, auch ohne angekreuztes Kästchen; eine Austauschnutzung teilt ihn zusätzlich über git.

**Der Datenzugang.** Auf einem Telefon oder auf der Website stellen Sie unter „Datenzugang“ das Repository
(Konto/Repository), den Zweig und Ihr persönliches Token ein, dann „Testen“ und „Speichern“. Auf einem vom Starter
bedienten Rechner gibt es kein Token; solange `data/` kein Git-Repository ist, öffnet die Karte den Weg, es zu holen
oder zu übernehmen; sein entferntes Repository wird in der Karte „Verwaltung“ eingestellt (siehe „Ein Git-Repository
für data/“). Auf dem Rechner des Starters beginnt die Karte „Datenzugriff“ mit der Zeile „Datenrepository:“, die Adresse und Zweig des entfernten Repositorys nennt: Der Bildschirm wartet nicht darauf (der Starter braucht zum Lesen mitunter mehrere Sekunden), die Zeile zeigt „…“ und dann ihren Wert, ohne sich zu bewegen; was vom Repository abhängt (zum Beispiel das Feld „Entferntes Repository“ der Administration), erscheint bei seinem Eintreffen.

**Ohne Zugang und ohne Starter keine Basen.** Ein Gerät ohne eingestellten Zugang und ohne Starter — etwa die Website,
zum ersten Mal auf einem Telefon geöffnet — hat weder die Luftfahrtdatenbasis (Lufträume, Flugplätze, Funkfeuer) noch
die Flugzeugbasis: „Offline-Daten“ sagt es. Zwei Wege: Stellen Sie den Zugang zum Datenrepository ein, auch ohne
Austausch anzukreuzen (er liest dann nur die Basen); oder veröffentlichen Sie auf einem Rechner mit Starter die Basen im
Repository (V2: Einstellungen › Wartung › Luftfahrtdaten und Luftfahrzeugtypen), dann synchronisieren. Drei getrennte Zustände, wenn die Basis fehlt: „Luftfahrtdatenbank wird geladen…“ (das Lesen ist nicht beendet: warten), „Datenzugriff auf diesem Gerät nicht eingerichtet“ (Zugang oben einrichten; eine zum Home-Bildschirm hinzugefügte App hat ihren eigenen Speicher, nichts aus Safari ist dort) und „Luftfahrtdatenbank nicht veröffentlicht“ (der Zugang funktioniert, im Repository ist nichts veröffentlicht).

**Die Synchronisation.** Die Karte „Synchronisation“ ist die Übersicht dessen, was noch nicht gesendet ist: oben ein Zähler je Art (Flugzeug-Datenblätter, Missionen, Flüge, Flotte; „Weitere“ nur,
wenn es etwas gibt), dann der letzte Erfolg, das Netz und der letzte Fehler. Eine eingeklappte Liste je Art zeigt, was wartet: den lesbaren Titel (zum Beispiel „Datenblatt A320 Navy“, „Flug LFPO → LFBO vom 3/11“),
das Datum, ✕ für eine Löschung und, falls es einen gibt, den Fehler, der die Warteschlange hält; höchstens sieben Einträge sichtbar, „… und n weitere“ für den Rest. Mit dem Starter des Arbeitsplatzes kommen
„hier geändert“ (noch nicht in den Daten gespeichert) und „zu senden“ (gespeichert, noch nicht gesendet) hinzu. „Alles senden“ sendet und empfängt sofort; sonst läuft die Synchronisation von selbst beim
Start, alle 10 Minuten online und bei Rückkehr des Netzes. Die Karte erscheint, sobald ein Austausch angekreuzt ist oder etwas wartet. Darunter sagt eine Zeile, was gerade gesendet wurde („Gesendet um 18:04: Flugzeug-Datenblätter: 2 · Missionen: 1“, mit „davon 1 abgelehnt“, falls es welche gibt); aufgeklappt nennt sie die Dateien einzeln mit ihrem lesbaren Titel, die abgelehnten zuerst mit dem vom Transport genannten Grund, höchstens sieben. Es ist die letzte Synchronisation, die etwas gesendet hat: Ein Durchlauf ohne Sendung lässt sie unverändert, und vor dem ersten Senden wird nichts gesagt. Auf einem Rechner mit Starter sagen zwei Zeilen, **wie lange die Synchronisation gedauert hat**: die letzte und **die längste von heute** (auf diesem Gerät gespeichert), in Sekunden, Schritt für Schritt (Abgleich, Commit, Empfang, Senden …), mit der Zahl der Git-Befehle und dem Gesendeten („8 s — Commit 1 s · Empfang 2 s · Senden 4 s · 12 Git-Befehle (1 s) · 38 Ko gesendet“); ein kürzerer Durchlauf ersetzt die längste nicht, ein anderer Tag löscht sie.

**Die Sicherung.** Allein auf diesem Gerät bewahrt „Exportieren (eine Datei)“ alle Ihre Daten in einer Datei auf: Sie
ist die einzige Kopie. „Importieren (zusammenführen)…“ übernimmt sie, ohne hier etwas zu verlieren; „Durch eine Datei
ersetzen…“ löscht zuerst, was auf dem Gerät ist.

**Die Offline-Daten.** Jede veröffentlichte Zone hat ihre Zeile: ihren Status auf diesem Gerät, ihren Zyklus und ihre
Größe. „Offline behalten“ lädt sie ganz herunter (am besten im WLAN); „Freigeben“ gibt den Platz zurück.

## Der Wetterschlüssel

METAR funktioniert ohne Schlüssel. TAF braucht auf einem Gerät ohne Starter (Telefon, Website) einen persönlichen und
kostenlosen avwx.rest-Schlüssel: „Schlüssel auf avwx.rest erstellen ↗“ öffnet die Seite des Anbieters. Fügen Sie ihn
unter „Wetterschlüssel (TAF, avwx.rest)“ ein, dann „Speichern“; „Testen“ fragt das TAF eines Flugplatzes ab, „Löschen“
entfernt ihn. Der Schlüssel bleibt nur auf diesem Gerät (zusammen mit Ihrer Identität gespeichert: Er überlebt das Schließen des Browsers), nie im Repository oder in einer Sicherung, und wird nie wieder
angezeigt. Auf einem vom Starter bedienten Rechner ist er unnötig: Der Starter liefert das TAF.

## Little-Navmap-Profile

Auf einem vom Starter bedienten Rechner verbindet die Karte „Little-Navmap-Profile (.lnmperf)“ Ihre Leistungsprofile
in beide Richtungen mit den .lnmperf-Dateien eines Ordners. Wählen Sie den Ordner (der von Little Navmap wird
vorgeschlagen, wenn er gefunden wird) und dann „Speichern“. Danach ist nichts zu tun: ein in Kraftstoff geändertes
Profil schreibt seine Datei neu, eine in Little Navmap geänderte Datei aktualisiert das Profil, eine neue Datei wird
ein Profil. Hat sich derselbe Wert auf beiden Seiten geändert, gewinnt der neueste, der andere bleibt im Profil
erhalten; die Abgleich-Schaltfläche meldet es. Eine Datei wird nie gelöscht: die Datei eines entfernten Profils kommt
in den Unterordner `_removed`. „Jetzt abgleichen“ macht den Durchgang sofort, „Beenden“ trennt die Verbindung. Profile,
denen ein von Little Navmap verlangter Wert fehlt, werden aufgeführt und nicht geschrieben. Auf einem Telefon lädt
Kraftstoff das Profil als .lnmperf-Datei herunter.

## Die API-Schlüssel der Fluggesellschaft

Auf einem vom Starter bedienten Rechner klappt auf der Stufe Vollständig die Schaltfläche „API-Schlüssel der
Fluggesellschaft (IVAO, EAD Basic)“ der Karte „Verwaltung“ die Einstellung des IVAO-API-Schlüssels auf: Er bleibt im Ordner
`secrets/` des Starters, nie im Browser oder in den Daten. „Testen“ prüft, ob IVAO antwortet; „Löschen“ entfernt ihn.

Unter dem IVAO-Schlüssel nimmt der Block „EAD Basic (EUROCONTROL)“ Benutzername und Passwort Ihres EAD-Basic-Kontos auf: Sie geben sie einmal dem Starter dieses Rechners (Ordner `secrets/`), der sie verwahrt; die Seite zeigt sie nie wieder an, sie sagt nur, ob und wann sie gespeichert sind. Sie dienen zum „Flugplatz aus EAD lesen“ (ein Flugplatz pro Geste). EAD Basic ist ein Demonstrationswerkzeug mit nicht operativen Daten, nur für die Simulation zu verwenden (der Hinweis bleibt angezeigt). „Löschen“ entfernt sie aus dem Starter.

<a id="settings-ivao-app"></a>Unter dem Block EAD Basic führt ein Link zum Assistenten „IVAO-Anwendung (Anmeldung der Piloten)“ (die gleichnamige Karte, Gruppe „Verwaltung“, oder `#settings?card=ivaoapp`). Er ermöglicht den Piloten, sich über das Relais der Fluggesellschaft oder über diesen Rechner bei IVAO anzumelden: Er führt Sie durch IVAO (`https://developers.ivao.aero/create`: Name = Name der Fluggesellschaft, App Type = Third Party, Active = Enabled), listet die mit „+ Add Redirect URL“ zu deklarierenden Rücksprungadressen auf (die dieses Rechners und, wenn seine öffentliche Adresse eingerichtet ist, die des Relais; „Kopieren“ liefert sie unverändert) und nimmt dann die von IVAO angezeigte Client ID und das Client Secret entgegen. Der Starter schreibt sie nach `secrets/ivao_oauth.json`: Sie bearbeiten keine Datei, und die Seite zeigt sie nie wieder an (sie sagt nur, ob und wann die Anwendung gespeichert ist). „Testen“ erreicht das OpenID-Discovery-Dokument von IVAO; „Löschen“ entfernt die Anwendung. Der API-Schlüssel der Anwendung (`secrets/ivao.json`) ist eine andere Einstellung: Der Schlüssel einer neuen Anwendung wird unter „IVAO-Schlüssel“ übernommen.

## Das Tablet neben dem Simulator

Sie fliegen am Rechner (X-Plane) und möchten die Karte auf einem Tablet oder Telefon: Auf dem Rechner, den der
Starter bedient, öffnet „Zugang des Rechners“ die Pilot-App für Geräte im selben lokalen Netz (oder starten Sie
`lancer.cmd --lan`).

1. **Für Geräte im lokalen Netz öffnen**: Die Karte zeigt die auf dem Gerät zu öffnende Adresse, ihren QR-Code und
   einen 8-stelligen Kopplungscode (bis zum 30. Oktober 2026 6-stellig). Windows fragt eventuell, ob Python erlaubt werden soll: nur für private
   Netzwerke zulassen.
2. Scannen Sie auf dem Tablet den QR-Code mit der Kamera (oder tippen Sie die Adresse), dann geben Sie den Code ein.
   Er wird nur **einmal pro Gerät** abgefragt.
3. Das Tablet sieht dann die Daten des Rechners, die Position des Simulators im Flugabzeichen und oben „Starter auf
   <Rechner>“.

- **Nur in einem vertrauenswürdigen Netz**: Alles läuft über http, unverschlüsselt. Zu Hause ja; in einem
  öffentlichen oder Hotel-WLAN nie.
- Der Zugang schließt sich mit dem Starter oder mit „Zugang schließen“. Ein gekoppeltes Gerät bleibt gekoppelt;
  „Geräte vergessen“ verlangt von allen erneut einen Code (zum Beispiel bei einem verlorenen Tablet).
- Auf dem Tablet funktioniert die App nicht offline und nutzt nicht sein GPS: Der Browser gewährt beides nur über
  https. Die Position kommt vom Simulator des Rechners.
- Ein Code gilt nur einmal und 10 Minuten: „Neuer Code“ gibt einen anderen. 5 falsche Codes von einem Gerät: eine
  Minute Wartezeit; 30 in einer Stunde: Die Kopplung schließt sich bis zum nächsten „Neuer Code“. „Vergessen“ neben
  einem Gerät (mit seinem Kopplungsdatum, in UTC) entfernt nur dieses.
- Nur die Hauptadresse des Rechners wird geöffnet; die anderen (VPN, virtuelle Maschinen) nur über „Auch öffnen“. Eine
  Adresse, die sich nicht öffnen lässt, wird in der Karte genannt; das Fenster des Starters sagt, warum.

## Ein Git-Repository für data/

**GitHub oder GitLab?** Das ist keine Einstellung: Der Anbieter wird aus der Adresse des entfernten Repositorys gelesen und oben in „Verwaltung › Entferntes Repository von data/“ angezeigt; die Karte „Datenzugang“ führt dorthin.

Auf einem vom Starter bedienten Rechner zeigt auf der Stufe Vollständig die Schaltfläche „Entferntes Repository von
data/“ der Karte „Verwaltung“ das entfernte Repository von `data/`: seine Adresse und seinen Zweig. Um es einzustellen oder zu ändern, tippen Sie die Adresse (`git@host:konto/repo.git` oder `https://…`,
ohne Passwort oder Token darin): „Prüfen“ sagt, ob das Repository antwortet, „Speichern“ stellt es ein. Für eine andere Adresse als die der Konfiguration öffnet sich ein Ja-/Nein-Fenster auf dem Computer, nicht auf der Seite: Die Karte sagt es vor dem Klick; beantworten Sie es (es kann hinter anderen Fenstern liegen), dann kehren Sie zurück. Abgelehnt, geschlossen oder schon geöffnet: Die Karte nennt den Grund, und `data/` bleibt, wie es ist. Das ist gewollt: Eine präparierte Seite darf Ihre Daten nicht anderswohin senden können. Nichts blockiert: Ein
Repository, das nicht antwortet, wird nur gemeldet.

- **Der Zugang zum Repository** wird auf dem Computer eingestellt: ein SSH-Schlüssel für eine Adresse `git@…`, in Git
  gespeicherte Zugangsdaten für eine Adresse `https://…`.
- **Der Anbieter** einer Konfiguration wird gewählt (github oder gitlab), nie erraten; der Bereich liest nur die Adresse des entfernten Repositorys (GitHub, gitlab.com, framagit.org oder ein selbst gehostetes GitLab, das die Konfiguration des Geräts mit demselben Host nennt; sonst „Anbieter nicht erkannt“). Oben im Bereich steht „Anbieter: GitLab · Projekt Gruppe/Projekt“ (das Projekt ist ein Link zu seiner Seite); bei GitLab führt der Link „Token der Piloten“ zur Erstellung der Aufnahme-Tokens; bei GitHub schlägt der Bereich vor, die Adresse eines GitLab-Projekts einzugeben, denn die Aufnahme per Projekt-Token setzt eines voraus. Die Seite schlägt nur vor: Ein Repository-Wechsel läuft wie immer über das Ja-/Nein-Fenster des Starters. Die exportierte Konfiguration trägt immer den Anbieter (github oder gitlab; ein unbekanntes Repository wird abgelehnt, nie als „other“ exportiert), und die Seite des Piloten öffnet sich darauf. Eine alte Konfiguration ohne Anbieter wird nur für github.com akzeptiert. Ohne Starter wird eine GitLab-Konfiguration auf dem Gerät wie eine GitHub-Konfiguration angewendet.
- **Mehrere Nutzer über git** brauchen dieses entfernte Repository: Ohne es führt das Kästchen „Mehrere Nutzer“ nirgends
  hin, und die Karte „Nutzungen“ erinnert daran.
- **data/ fehlt oder ohne git**: Die Karte „Datenzugang“ öffnet einen Weg, auf jeder Stufe. `data/` ist ein vom Code-Repository ignorierter Ordner;
  er wird ein eigenes Git-Repository, verbunden mit dem Datenrepository (kein Submodul). Tippen Sie die Adresse des
  Datenrepositorys und bei Bedarf einen Benutzernamen und ein Passwort oder Token (nie von der Seite gespeichert;
  „Merken“ überlässt sie Git auf diesem Computer). Ohne `data/` klont „Daten holen“ es; bei einem `data/` ohne git
  (Beispieldaten oder Archiv) verbindet „data/ in dieses Repository übernehmen“ es mit dem Repository. Die Karte verfolgt
  die Arbeit und liest den Zustand am Ende neu; ein Fehlschlag wird erklärt, nichts geht verloren.
- **Neu geschriebene Historie des Repositorys** (etwa um große Dateien daraus zu entfernen): Die Synchronisation
  dieses Rechners verweigert dann jede Zusammenführung und sagt es; nichts geht verloren. Hier zeigt „Neue Historie
  übernehmen“ zuerst, was hinausgeht (Ihre Commits, die übertragenen Datendateien), fragt nach, bewahrt den alten Stand
  in einer lokalen Referenz, überträgt Ihre Datendateien auf die neue Historie und synchronisiert dann. Eine Datei
  außerhalb der synchronisierten Daten wird nie erneut gesendet.

## Einen Piloten einrichten

**Die Konfiguration vorbereiten (Administrator).** In der Karte „Verwaltung“ (Stufe „Vollständig“) bereitet „Piloten hinzufügen“ die Konfiguration eines Piloten vor (siehe „Piloten hinzufügen (Administrator)“ weiter unten). Sie gibt **drei Formen derselben Konfiguration**: die Datei sog-config-<TRI>.json, den Link und seinen QR-Code; senden Sie, welche Sie möchten. Der Pilot scannt den QR-Code mit der Kamera seines Telefons: Er öffnet den Link, der zum Assistenten führt. Sie enthalten die Fluggesellschaft, das Datenrepository, das Kürzel und die Token-Anleitung, nie ein Token oder ein Geheimnis; der Eigentümer des Repositorys (Benutzer oder Organisation) ist dort vermerkt, er entscheidet, welches Token zu erstellen ist. Für ein GitHub-Repository laden Sie zuerst den GitHub-Namen des Piloten mit dem Recht Write auf das Repository ein (der Link führt zur Mitarbeiterseite des Repositorys).

**Der Fluggesellschaft beitreten (Pilot).** Der QR-Code (mit der Kamera des Telefons gescannt: Er öffnet den Link), der Link, „Der Fluggesellschaft beitreten…“ (Karte „Datenzugang“: Der Assistent ohne Konfiguration bittet, den erhaltenen Link einzufügen oder die Datei zu wählen) und die Begrüßungskarte beim ersten Öffnen öffnen den Assistenten
„Der Fluggesellschaft beitreten“, ein Bildschirm pro Schritt: die erhaltene Konfiguration; das Konto (bei Bedarf mit dem
Registrierungslink erstellen) und der Benutzername; die anzunehmende Einladung; das Token, Schritt für Schritt
(klassisch für das Repository eines Benutzers, feingranular für das einer Organisation); das eingefügte und getestete
Token; die Netzwerk-IDs; zuletzt „Abschließen und synchronisieren“, dann die Offline-Daten. Angekreuzte Kästchen bleiben
auf dem Gerät: Eine Karte der Einstellungen bietet an, dort fortzusetzen, wo Sie waren. Das Tutorial „Der
Fluggesellschaft beitreten“ folgt denselben Schritten.

**Beitritt zu einem GitLab-Projekt (Pilot).** Ist die empfangene Konfiguration ein GitLab-Projekt, erstellen Sie nichts: kein Konto, keine Einladung, kein Token. Der Assistent hat nur drei Bildschirme: die gelesene Konfiguration (Fluggesellschaft, Projekt), dann „Das Token einfügen“ — fügen Sie das Token ein, das der Administrator Ihnen getrennt gesendet hat (nie im Link); Ihr Kürzel wird aus der Konfiguration gelesen, Sie tippen es nicht — dann „Beenden und synchronisieren“. Ihre VID-, CID- und SimBrief-Kennungen tragen Sie später unter Einstellungen › Identität ein. Bevor das Token angenommen wird, fragt die App GitLab, um welches Token es sich handelt. Ein persönliches Token (es gilt für alle Ihre Projekte) löst eine Frage aus: Bevorzugen Sie das Projekt-Token vom Administrator; antworten Sie „Nein“, wird nichts gespeichert. Ein Token ohne Ablaufdatum (oder mit mehr als einem Jahr) oder mit mehr Rechten als nötig wird mit einer Warnzeile gemeldet, ohne Sie zu blockieren. Die Karte „Zugang zu den Daten“ sagt dasselbe über ein persönliches Token, ohne Frage: Allein mit Ihrem eigenen Repository ist ein persönliches Token das richtige.

**Nicht mehr als die Datei.** Nur was die Konfiguration enthält, wird eingerichtet, und der Zugang wird erst
gespeichert, wenn das Token getestet ist; „Testen“ sagt, was nicht stimmt: Einladung noch nicht angenommen, Token falsch
kopiert oder abgelaufen, Token ohne Recht auf den Inhalt. Ein klassisches Token öffnet alle Repositorys des Kontos: Für
das Repository eines Benutzers wird ein eigenes GitHub-Konto nur für das Fliegen empfohlen. Eine Datei in einem anderen
Format wird mit einer Meldung abgelehnt. Die Fluggesellschaft wird nur ins Repository geschrieben, wenn es noch keine
hat. Auf einem Rechner, dessen data/ diesem Repository bereits folgt, überspringt der Assistent Konto und Token. Ohne
Starter erreicht die App ein GitHub-Repository oder ein Projekt auf einer GitLab-Instanz (gitlab.com): Fügen
Sie die Adresse des Projekts (https://gitlab.com/gruppe/projekt) und das Projektzugangstoken ein, das der Administrator
Ihnen gegeben hat; das Token wird nur an diese Instanz gesendet. Ist die empfangene Konfiguration oder der Zugang des Geräts ein GitLab-Projekt, erwartet die Karte „Datenzugang“ die Adresse des Projekts und beschreibt das Projekt-Token (Rolle Developer, `write_repository`).

## Verwaltung

**Die Verwaltungsseiten.** Auf der Stufe „Vollständig“ (Karte „Stufe“) sammelt die Karte „Verwaltung“ unter „Über“ die
Verwaltungs- und Testseiten, **eine Schaltfläche pro Seite**, jede mit einem Satz; auf den anderen Stufen erscheint sie nicht, und nichts vom Administrator steht auf den anderen Karten. In der App: die Schaltfläche
„Abstimmung der Kartenschwellen“ (`#maps?tune=1`, auf einem Telefon nur lesbar; sie öffnet die Abstimmungsseite: für jedes Kartenelement und jeden Modus die Zoomstufen, in denen es erscheint, für die Fluggesellschaft gespeichert, `airline/map_profiles.json`; ein Modus, den Sie nie gespeichert haben, übernimmt die Schwellen eines abgestimmten Modus, die Seite sagt es; der Regler „Komplexität“ der Karte verschiebt nur den Zoom), zurück mit dem Zurück-Pfeil; die Schaltfläche „Grenze der Flugzone“, die ein Kästchen
„Linie der Flugzonengrenze anzeigen“ aufklappt (sofort für die Fluggesellschaft gespeichert, mit den Schwellen, in `airline/map_profiles.json`,
Schlüssel `edge`; die Linie wird angezeigt, bis Sie etwas einstellen); die Schaltfläche „Pistenschwellen auf der Karte“, die eine Liste von 8 bis 16 aufklappt: die Zoomstufe, ab der die Karte die Pistenschwellen zeichnet (sofort für die Fluggesellschaft gespeichert, dieselbe Datei, Schlüssel `runwayZoom`; 11, bis Sie etwas einstellen); die Schaltfläche „Piloten hinzufügen“ (siehe weiter unten); auf einem vom
Starter bedienten Rechner die Schaltflächen „Entferntes Repository von data/“ und „API-Schlüssel der Fluggesellschaft
(IVAO, EAD Basic)“, die ihre Einstellung aufklappen (siehe „Ein Git-Repository für data/“ und „Die API-Schlüssel der
Fluggesellschaft“);
der Fahrplan (`#roadmap`, der sich auf „Prioritäten“ öffnet: drei Spalten, In Integration, In Entwicklung, Backlog, in die die Karten gezogen werden; „Nach Thema“ zeigt sie nach Bereich); die Abnahme (`#recette`): ein Funktionstest je gelieferte Karte mit „Bestanden“, „Abgelehnt“ und einem Kommentar (bei einer Ablehnung Pflicht), vom Starter in `organisation/RECETTE.json` geschrieben; ein bereits bekannter Fehler sagt „in Arbeit, nicht erneut testen“; ein zweiter Reiter „Zu entscheiden (n)“ stellt die zu entscheidenden Punkte als Multiple-Choice mit freiem Feld (Antworten vom Starter in `organisation/DECISIONS_REPONSES.json` geschrieben); und die Diagnose der Karte „Über“.

**Der Assistent des Administrators.** Die Schaltfläche „Assistent des Administrators“ (Karte „Verwaltung“ oder die Adresse `#settings?card=assistant`) nimmt den Administrator an die Hand: sechs Schritte, der Reihe nach, jeder mit seinem an der Installation gelesenen Zustand (erledigt, zu tun, optional, unbekannt), einem Satz und einer Schaltfläche zur Karte, die den Schritt einstellt. Der erste offene Schritt hat die farbige Schaltfläche. Das Datenrepository (ein Remote-Repository für data/ und, bei GitLab, Ihr Administrator-Token auf diesem Rechner), die Fluggesellschaft (ihr Name, im Modul Website; Ihr Kürzel steht unter Einstellungen › Identität), die Luftfahrtbasis (mindestens eine veröffentlichte Zone), der erste Pilot („Piloten hinzufügen“), dann, optional, die Geräte und die Schlüssel (IVAO, EAD). Der Zustand der Installation, wie der Rahmen ihn gibt, steht unten. Der Assistent schreibt nichts: Jede Schaltfläche öffnet die schon vorhandene Karte.

**Piloten hinzufügen (Administrator).** Auf der Stufe „Vollständig“ bereitet die Schaltfläche „Piloten hinzufügen“ der Karte „Verwaltung“ (wo der Export möglich ist) alles für einen Piloten vor, der noch nichts hat. Tippen Sie sein Kürzel, seinen Namen, wenn Sie ihn anreden wollen, die Sprache der Nachricht und die Adresse der veröffentlichten App, dann „Vorbereiten“: Sie erhalten Datei, Link und QR-Code (drei Formen derselben Konfiguration), Ihre Schritte und eine Nachricht zum Kopieren in der gewählten Sprache. Für ein GitLab-Repository sind Ihre Schritte: das Projekt-Token des Piloten erstellen (eines pro Pilot, Name = sein Kürzel, Rolle Developer, Bereich `api`, Ablaufdatum 90 Tage empfohlen und höchstens 365, nie ohne Datum), es sofort kopieren (GitLab zeigt es nur einmal), prüfen, dass der Datenzweig Developers pushen lässt, und wissen, wie man widerruft (Settings › Access tokens › Revoke). Mit dem Starter öffnet „Token erstellen“ den Bildschirm „Token der Piloten“ mit dem bereits eingetippten Kürzel: Der Starter erstellt das Token mit dem des Administrators; die Schritte von Hand bleiben darunter eingeklappt. Ohne Starter sind sie offen. **Senden Sie das Token getrennt von der Nachricht** (anderer Kanal, oder fügen Sie es vor dem Piloten ein): Es steht nie im Link und nie in der Nachricht. Für ein GitHub-Repository sind die Schritte die des Exports.

<a id="settings-sources"></a>**Datenquellen.** Die Taste „Datenquellen“ (`#sources`, Stufe Vollständig) listet die Quellen der Luftfahrtdaten, die die Suite nutzt, erwägt oder zurückgestellt hat: für jede, was sie liefert, ihre Lizenz, ihren Status und einen Link, der sich in einem neuen Tab öffnet; für die, die sich mit jedem AIRAC-Zyklus ändern (SIA, VAC, eAIP, CIFP), ist der Link der des gültigen Zyklus, oben auf dem Bildschirm angegeben. Der Bildschirm lädt nichts herunter. Unter der Taste der Verwaltungskarte die absolute Adresse des Bildschirms, zum Öffnen oder als Lesezeichen („Link kopieren“). Er ersetzt das Daten-Labor, das am 28. Oktober 2026 entfernt wurde.

**Die Prüfstände, auf einem Rechner.** Vom Starter bedient, öffnen sie sich nur auf einem Rechner mit Starter (anderswo
werden sie ohne Link genannt); Pfade relativ zur Wurzel der Suite: `labs/design_primitives.html` (Primitive und
Designs), `frame/aerodb/bench.html` und `frame/aerodb/offline_bench.html` (Luftfahrtbasis, online und offline),
`frame/store/test/` (Datenschicht, gegen das falsche GitHub) und `modules/maps/test/render.html` (Kartendarstellung).

**Die V2-Seiten.** Keine Schaltfläche mehr in dieser Karte: Alle Seiten der alten Version (Einstellungen › Wartung, Erster Start, Kartenstudio …) liegen im Bildschirm „Alte Seiten (V2)“ (`#legacy`), dem letzten Eintrag der Navigationsspalte jeder Anwendung.

## Gut zu wissen

- **IVAO-Konto**: Die Karte „IVAO-Konto“ verbindet dieses Gerät über das Relais der Fluggesellschaft (oder den
  Starter des Arbeitsplatzes) mit Ihrem IVAO-Konto: „Bei IVAO anmelden“ öffnet die Seite von IVAO und kehrt dann hierher
  zurück. Das Relais verwahrt das Geheimnis der Anwendung der Fluggesellschaft; Ihr Token bleibt auf diesem Gerät, wird
  von selbst erneuert, nie in einer Sicherung. „Trennen“ löscht es und bittet IVAO, den Zugriff zu
  entziehen; kann IVAO das nicht, sagt Ihnen die Suite, ihn in Ihrem IVAO-Konto zu entziehen. Ohne eingerichtete
  IVAO-Anwendung ist die Schaltfläche aus und die Karte sagt, wo sie fehlt: auf diesem Arbeitsplatz richtet Verwaltung ›
  „IVAO-Anwendung“ sie ein (sie nennt die bei IVAO anzugebende Rückkehradresse); auf dem Relais richtet der Administrator
  sie ein.
- **Geräte**: ein einziger Bildschirm, Wartung › „Geräte“, für alle Geräte der Piloten, ob sie aus dem lokalen Netz oder
  über das Relais der Fluggesellschaft kommen (wenn der Starter als Relais läuft, hinter dem Reverse-Proxy des NAS, in
  https). Ein Pilot koppelt jedes Gerät einmal mit einem 8-stelligen Code, den der Administrator dort für sein Kürzel
  anfordert (einmal, 10 Minuten, auf dem einen oder anderen Kanal); seine Änderungen tragen dieses Kürzel. Jede Zeile
  nennt den Kanal des Geräts; ein mit dem Konsolencode gekoppeltes Gerät zeigt „Konsolencode“, und „Benennen“ gibt ihm ein
  Kürzel. Ein verlorenes Gerät oder alle eines Piloten, der geht, werden dort widerrufen.
- **Suite aktualisieren** (Verwaltung, mit dem Starter): einen Kanal wählen — stabil, Vorabversionen oder Entwicklungsstand —,
  „Prüfen“ sagt, was sich ändern würde, ohne etwas anzurühren, dann „Aktualisieren“ (nach einer Frage). Nie ein Schritt zurück;
  abgelehnt, wenn Dateien der Suite auf diesem Rechner geändert wurden, und während ein Auftrag des Moduls Daten oder eine
  Synchronisierung läuft (erneut versuchen, wenn er beendet ist). Die Daten bleiben unberührt. Genommen wird die Version, die
  das Repository der Suite angibt: Seine Tags sind nicht signiert, das Vertrauen ist dasselbe wie bei einer Aktualisierung von
  Hand mit git. Es ist die Version, die „Prüfen“ gezeigt hat: Hat sich der Kanal inzwischen geändert, wird nichts
  geschrieben und der Bereich bittet, erneut zu prüfen.
  Danach das Fenster des Starters schließen und lancer.cmd erneut starten.
- **Ordner dieses Rechners** (Verwaltung, mit dem Starter): wo die Suite, die Daten, die Downloads, die Datenbanken und
  Blätter von Little Navmap auf diesem Rechner liegen, der Pfad nur lesbar und woher er kommt; „Öffnen“ zeigt den Ordner im
  Dateiexplorer. Ein Pfad wird dort geändert, wo es angegeben ist, nie hier; X-Plane ist dem Starter unbekannt.
- **Token der Piloten (GitLab)**: In der Anwendung Maintenance erstellt „Token der Piloten“ auf dem Rechner des Starters
  ein Projektzugangstoken je Pilot (nach seinem Kürzel benannt, Rolle Developer, höchstens ein Jahr) und widerruft es.
  Nach „Token erstellen“ zeigt der Bildschirm nur dieses Token, oben: Kopieren Sie es sofort (es wird nicht wieder
  angezeigt), mit dem, was dem Piloten zu sagen ist, und dem Link zu seiner Nachricht („Pilot hinzufügen“); die Liste
  „Vorhandene Token“ ist darunter eingeklappt, das neue steht dort als „gerade erstellt“. Der Starter verwendet dafür das Token des Administrators, das er nie zeigt: ein persönliches
  Zugangstoken Ihres GitLab-Kontos (Preferences › Access tokens), Bereich api, mit Ablaufdatum (höchstens ein Jahr),
  wobei dieses Konto Maintainer oder Owner des Projekts ist. Fügen Sie es unter „Token des Administrators“ unter der
  Liste ein; „Token des Administrators testen“ nennt das Konto, seine Rolle, seine Bereiche und sein Ablaufdatum; der Titel des Blocks sagt, ob ein Token gesetzt ist
  (sein Datum, die Instanz, das Projekt, die Uhrzeit des letzten Tests), nie seinen Wert. Eine
  Ablehnung durch GitLab wird mit ihrem Grund angegeben: Token abgelehnt (fehlt, abgelaufen oder ohne api), Konto ist
  nicht Maintainer, Projekt nicht gefunden. Der Datenzweig muss geschützt, für die Rolle Developer offen
  und ohne erzwungenes Pushen sein (auf gitlab.com ist der Standardzweig Maintainern vorbehalten): Der Bildschirm prüft es, und „Zweig für Developer öffnen“
  erledigt es nach einer Frage, die auch vor dem ersten Token gestellt wird. Ein Pilot, dessen Token beim Schreiben
  abgelehnt wird, liest „Der Zweig main des Projekts ist nicht für Developer offen“.
- **Das Token**: auf github.com ein feingranulares Token, nur für das Datenrepository, „Contents“ lesen und schreiben,
  höchstens 90 Tage; auf GitLab ein Projektzugangstoken (eines je Pilot, nach seinem Kürzel benannt), vom Administrator
  erstellt. Es wird nie wieder angezeigt; fügen Sie es in keine Nachricht ein.
- **Ihre Einstellungen bleiben nach dem Schließen des Browsers**: Identität, Token und Wetterschlüssel liegen am selben Ort
  des Geräts, nie synchronisiert und nie in einer Sicherung. Hat Safari sie Ihnen trotzdem genommen (er löscht den Speicher
  einer kaum genutzten Seite), fügen Sie die App dem Home-Bildschirm hinzu: Dort ist sie besser geschützt. Die Diagnose
  („Kopieren“) sagt, ob der Browser versprochen hat, nicht zu löschen (`storage.persisted`).
- **Zugang trennen**: löscht das Token von diesem Gerät; ausstehende Änderungen bleiben und gehen hinaus, sobald der
  Zugang wieder eingestellt ist. Telefon verloren oder gestohlen: Löschen Sie das Token auch beim Anbieter (github.com, gitlab.com…).
- **V2-Einstellungen**: Wurde dieser Browser schon für V2 benutzt, bietet die Karte „V2-Einstellungen gefunden“ einmal
  an, Ihre Identität und Ihren Zugang zu übernehmen.
- **Über**: Links zu dieser Hilfe und zum Fahrplan (was geliefert, in Arbeit, geplant ist), dann die Diagnose,
  eingeklappt: Transport, letzte Synchronisation, Fehler, Repository-Baum, Referenzbasen und Luftfahrtbasis, Zeile
  für Zeile; „Kopieren“ legt alles in die Zwischenablage, zum Einfügen in Ihre Nachricht, um ein Problem zu melden. Das
  Token steht nie darin.

<!-- fr: c75cd2a9eb9f -->

**Die Fluggesellschaft.** Auf der Stufe „Vollständig“ (oder über #settings?card=company) listet die Karte „Fluggesellschaft“ die Gesellschaften aus data/airline/index.json und „Persönlich“: Name, Code, Netzwerke (IVAO, VATSIM, offline) und Zahl der Luftfahrzeuge der Flotte. Die Karte heißt „Fluggesellschaft dieses Geräts“: eine Liste mit Optionsfeldern, eine Zeile je Gesellschaft (Name, Code, die Art in Worten — „Kommerziell“, „SO-Staffel“ oder „Persönlich“ —, Netzwerke und Flotte). Ein Tippen auf eine Zeile macht sie zur aktuellen Gesellschaft dieses Geräts (die Wahl gilt pro Gerät): nur die Optionsfelder ändern sich, die Liste wird nicht neu gezeichnet. Solange der Rahmen diese Wahl noch nicht speichern kann, sind die Felder grau, und die Karte sagt es. Darunter das Blatt der gewählten Gesellschaft (die anderen haben keins), aufgeklappt: die **Art** (zwei Optionsfelder, je ein Satz) und die **Missionsfamilien** (ein Feld je Familie: das Kürzel und der Name), vom Typ vorab angekreuzt, solange nichts angekreuzt wurde; Ankreuzen oder Abwählen schreibt themes.json, mindestens eine Familie bleibt angekreuzt. **Familie hinzufügen** (ein Kürzel aus 2 bis 8 Buchstaben oder Ziffern, ein Name von 1 bis 40 Zeichen; höchstens acht) und **Serie hinzufügen** (eine Familie der Liste, ein Name; zwanzig je Familie): der in der Sprache des Bildschirms eingegebene Name wird in die vier Sprachen kopiert; Familie oder Serie entfernen Sie mit „Entfernen“. Danach drei Handgriffe in dieser Reihenfolge: „Fluggesellschaft anlegen“ öffnet einen **Assistenten auf demselben Bildschirm**: der Schritt **Identität** (der Name; der Code, nach dem Namen vorgeschlagen und änderbar, 2 bis 8 Kleinbuchstaben oder Ziffern, nie schon vergeben; die **Art**, Kommerziell oder SO-Staffel, Kommerziell vorgewählt; die Netzwerke), dann der Schritt **Flugfamilien** (die der Art, vorab angekreuzt: entfernen Sie, was Sie nicht fliegen; für die Familien wird nichts geschrieben, wenn Sie nichts anfassen), dann der Schritt **Flotte** („Flotte · 2 Luftfahrzeuge“: einen Typ in der Datenblatt-Basis suchen, das Kennzeichen tippen, „Luftfahrzeug hinzufügen“; „Entfernen“; „Später“, wenn Sie die Luftfahrzeuge lieber unter Luftfahrzeuge hinzufügen), dann die **Zusammenfassung** in Worten („Rennes Motoculture · Kommerziell · IVAO · 1 Familie · 2 Luftfahrzeuge“). „Zurück“ behält alles Eingegebene. **Vor „Fluggesellschaft anlegen“ wird nichts geschrieben**: dann die Einstellungen, die (leere) Flotte und zuletzt der Eintrag in der Liste (eine Gesellschaft steht nur vollständig in der Liste); eine vorhandene Datei wird nie überschrieben. Wird das Anlegen unterbrochen, sagt die Meldung, was erledigt ist, und „Fortsetzen“ beendet es, ohne etwas zu überschreiben. Am Ende wählt „Für diese Gesellschaft fliegen“ sie aus und öffnet Missionen. Hat der eingegebene Code schon seinen Ordner, die Gesellschaft fehlt aber in der Liste, sagt der Assistent das und bietet **„Diese Gesellschaft übernehmen“** an: sie kommt zurück in die Liste, sonst wird nichts geschrieben. Höchstens zwanzig Gesellschaften; alles, was aus data/airline/ gelesen wird, gilt als nicht vertrauenswürdiger Text. „Einer Fluggesellschaft beitreten“ öffnet einen weiteren Assistenten: Fügen Sie die Seite „Flotte“ der Webseite der Gesellschaft ein (oder „Zwischenablage lesen“), dann „Seite lesen“; der Bildschirm zeigt **was gelesen wurde** („4 Luftfahrzeuge · 3 Betreiber“), den vorgeschlagenen Namen und Code, die Art („SO-Staffel“ vorgewählt), die Netzwerke und die Adresse der Webseite (optional, https), **bevor etwas geschrieben wird**; „Beitreten“ schreibt dann die Einstellungen, die gelesene Flotte und zuletzt den Eintrag in der Liste. Der Schritt „Was gelesen wurde“ sagt auch, **wie viele Missionen des Registers schon diesen Code haben** („Register: 2 Missionen schon mit diesem Code“), und folgt dem eingegebenen Code. Eine Gesellschaft, die schon in der Liste steht, wird nicht erneut aufgenommen: ihre Flotte wird durch das Einfügen im Bildschirm der Webseite der Gesellschaft aktualisiert. Auf dem Rechner des Launchers bietet die Karte, solange Ihre Gesellschaft noch im Stammordner von data/airline/ liegt, die **Migration** an: ein optionaler Code (nach dem Namen vorgeschlagen), „Anzeigen, was geschähe“ (der Name, der Ordner data/airline/<code>/, die Dateien und ihre Größe, die dort leere Flotte), dann „Nach „<code>“ migrieren“. Nichts wird gelöscht oder überschrieben: Die jetzigen Dateien bleiben als Kopie liegen. Im Blatt: Ohne Art sind alle Familien vorab angekreuzt und das Blatt bittet, die Art zu wählen; eine kommerzielle Gesellschaft hat die Familie Kommerziell (Fracht, Passagiere, Leerflug, VIP, Training, Transit, Testflüge), eine Staffel die sechzehn militärischen Familien. „Persönlich“ (alle Familien) hat nichts einzustellen.
