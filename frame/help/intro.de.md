# Pilot — Handbuch

Die App Pilot vereint die Werkzeuge, um einen Flug vorzubereiten und zu verfolgen: Kraftstoff und Flugfläche, Karte,
Bericht, meine Flüge, Übergabe an die Website der Fluggesellschaft. Sie funktioniert auf einem Telefon wie auf einem
Computer, mit oder ohne Netz.

## Erster Start

- **Die Verben.** Auf einem Telefon bietet die untere Leiste fünf Einträge: Vorbereiten, Karte, Bericht, Flüge,
  Einstellungen (Vorbereiten fasst mehrere Werkzeuge zusammen: Tippen Sie den bereits gewählten Reiter noch einmal an, öffnet sich darüber
  eine kleine Liste zum Wechseln); auf
  einem Bildschirm ist jedes Werkzeug ein Verb der linken Spalte. Die Adresse eines Werkzeugs (`#fuel`, `#report`…)
  genügt, um zu ihm zurückzukehren.
- **Ihre Identität.** Stellen Sie unter ⚙ Einstellungen Ihr Kürzel und Ihre IVAO-, VATSIM- und SimBrief-IDs ein: Die
  Werkzeuge nutzen sie zum Vorausfüllen.
- **Die Stufe.** Ebenfalls in den Einstellungen wählt „Stufe“, was das Menü zeigt: Einstieg, Alltag oder Vollständig.
  Ein ausgeblendetes Werkzeug bleibt über seine Adresse erreichbar.
- **Die Hilfe.** Jedes Werkzeug hat oben einen eingeklappten Bereich „So geht’s“; die Schaltfläche ? (auf einem Telefon die
  letzte Zeile des Blatts der Schaltfläche i, „Hilfe zu diesem Bildschirm“) öffnet dieses Handbuch beim Kapitel des
  Werkzeugs.
- **Die Schaltfläche i.** In der Kopfzeile, neben ⚙ (und ? auf einem Bildschirm): ein grüner Punkt, wenn etwas auf Sie
  wartet, ein oranger (auf einem Telefon), wenn etwas Aufmerksamkeit braucht: kein Kürzel, ausstehende Schreibvorgänge,
  Konflikte, ein Synchronisationsfehler, offline. Sie öffnet ein Statusblatt: der laufende Flug (antippen, um zur Karte zu
  gehen), die noch zu schreibenden Berichte zu Ihren vergangenen Flügen (antippen, um den vorausgefüllten Bericht zu
  öffnen), das fehlende Kürzel (antippen, um es einzustellen), der Zustand der Daten (letzte Synchronisation, ausstehende
  Schreibvorgänge, genutzter Austauschweg), „Offline“, wenn kein Netz da ist, und auf einem Telefon die Quelle der Position
  während eines Flugs und „Hilfe zu diesem Bildschirm“. Esc oder ✕ schließt es. Auf einem Telefon besteht die Kopfzeile nur
  aus Name, Schaltfläche i und ⚙.
- **Vollbild.** Auf der Karte (Werkzeuge mit fester Ansicht) blendet eine runde Schaltfläche am Ende der Schaltflächenspalte
  über der Karte die Kopfzeile und die untere Leiste aus, damit die Karte den ganzen Platz hat; die Eckschaltfläche oben
  rechts, dieselbe Schaltfläche oder Esc bringen sie zurück.

## Daten und Synchronisation

- **Zuerst offline.** Alles, was Sie tun, bleibt auf dem Gerät und funktioniert ohne Netz.
- **Allein auf diesem Gerät.** Ist in den Einstellungen kein Austausch angekreuzt, geht nichts anderswohin: Exportieren
  Sie ab und zu die Sicherung des Geräts (eine Datei), sie ist die einzige Kopie.
- **Mehrere Geräte oder mehrere Nutzer.** Kreuzen Sie die Nutzung in den Einstellungen an und stellen Sie den Zugang ein
  (GitHub-Repository und persönliches Token oder der Starter eines Rechners). Ihre Änderungen gehen gemeinsam bei der
  Synchronisation hinaus: beim Start, alle 10 Minuten online oder über die Statusschaltfläche oben am Bildschirm.
- **Konflikte.** Eine hier und anderswo gleichzeitig geänderte Datei behält ihre neueste Version; die andere bleibt
  einsehbar (Statusschaltfläche, dann „Konflikte“) und kann zurückgenommen werden.
