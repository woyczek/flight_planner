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
- **Der Starter fragt, bevor er etwas Löschendes sendet.** Auf dem Rechner des Starters hält ein Durchgang an und fragt Sie, wenn er das **Löschen** einer verfolgten Datei oder **mehr als zwanzig von Hand geänderte Dateien** senden würde: Ein Fenster listet die Dateien auf, mit „Senden“ (sie gehen an alle Piloten, auch die Löschungen), „Wie im Repository wiederherstellen“ (die verfolgten Dateien erhalten ihren Stand im Repository zurück; eine neue Datei wird nie gelöscht) oder „Später“ (nichts wird gesendet, die Liste wird erst wieder gefragt, wenn sie sich ändert). Hinzufügungen und Änderungen gehen wie bisher von allein. Unter den drei Schaltflächen setzt „Alles verwerfen und das Repository übernehmen“ alle verfolgten Dateien wie im Repository zurück, nachdem es Ihnen gezeigt hat, was verloren ginge; es löscht oder überschreibt nie eine nicht verfolgte Datei, und der alte Stand bleibt im lokalen Repository des Rechners erhalten. Ein gekoppeltes Gerät wird nie gefragt: die Antwort gehört dem Rechner. „Wie im Repository wiederherstellen“ sichert Ihre Änderungen zuvor im lokalen Repository des Rechners. Bei der Geste „Synchronisieren“ löst auch der Neuaufbau einer ganzen Zone der Luftfahrtdatenbank (mehr als zwanzig Dateien) die Frage aus.

## Ein Problem melden oder einen Wunsch äußern

In der Hilfe unter „Ein Problem melden oder einen Wunsch äußern“: Wählen Sie eine Art (Fehler, Regression, Ergonomie, Leistung, Wunsch), schreiben Sie einen Titel und was passiert ist (2.000 Zeichen); der Bildschirm, von dem Sie kamen, die Größe, das Design, die Sprache und die Version werden automatisch vermerkt (nie Flugdaten oder Schlüssel) und lassen sich abwählen. Auf dem Rechner der Ergonomie wird die Meldung sofort in die Meldungsdatei der Suite geschrieben, mit bis zu drei Screenshots (sie bleiben auf diesem Rechner, nichts wird veröffentlicht); auf jedem anderen Gerät geht sie mit dem nächsten gebündelten Versand an das Repository der Gesellschaft, ohne E-Mail. „Meine Meldungen“ unter dem Formular ist die Liste: ein einziges Suchfeld (Akzente und Großschreibung egal, jedes Wort als Anfang eines Wortes; gefundene Wörter werden hervorgehoben), dann auf dem Rechner der Ergonomie die Gruppen Jetzt, Danach, Später und Einzuordnen, je sieben Zeilen („Die nächsten n zeigen“ für den Rest); die Suche zeigt dort auch die passenden Karten des Fahrplans mit der Zahl der verknüpften Meldungen. Eine Zeile nennt die Art, den Titel, den Zustand in Farbe und in Worten („Ohne Karte“ gelb, „Karte SOG-nnnn“ blau, „Erledigt · SOG-nnnn“ grün, „Abgelehnt“ rot), das Datum, den Bildschirm und die Priorität. Eine Zeile öffnet die Meldung im selben Bildschirm („← Meine Meldungen“ oder Zurück im Browser führen zur Liste, der Entwurf des Formulars bleibt erhalten): der vermerkte Kontext, der Text, die verknüpfte Karte („Im Fahrplan öffnen“) und die Antwort der Ergonomie; auf dem Rechner die Priorität — die Schwere (Blockierend, Störend, Geringfügig) und die Häufigkeit (Immer, Oft, Selten), Ihre eigene Wahl, aus der die Gruppe folgt: Jetzt = Blockierend, oder Störend und Immer; Danach = Störend und Oft, oder Geringfügig und Immer; Später = der Rest — und die Kommentare (2 000 Zeichen, „Hinzufügen“). Ein Pilot sieht die letzten zehn Meldungen dieses Geräts, ihren Zustand, die verknüpfte Karte und die Antwort, ohne Priorität und ohne Kommentar. Ohne Zugriff bleibt die Meldung auf dem Gerät („nicht gesendet“) und geht, sobald der Zugriff zurück ist.
