# Missionen

Die Missionen der Gesellschaft, in der Anwendung Gesellschaft: die des gemeinsamen Repositorys (mit dem CPCO geschrieben): eine auswählen oder zufällig ziehen und dann in Kraftstoff vorbereiten.

## So geht's

<a id="missions-list"></a>**Die Liste.** Die Missionen der neuesten Serien zuerst, nach Familie gruppiert. Jede Zeile nennt die ID, den Titel, die Strecke, den Luftfahrzeugtyp und die geschätzte Blockzeit; „geflogen am …“ kennzeichnet eine Mission, deren Bericht Sie geschrieben haben. Die Suche filtert nach ID, Titel, Flugplatz (ICAO-Code), Luftfahrzeugtyp, Rufzeichen (SAMU66) oder Tätigkeit (MEDEVAC, HEMS, SAMU…); die Auswahlliste behält eine Familie. Sieben Zeilen werden gezeigt, „N weitere“ klappt den Rest auf. Die Organisationsmissionen einer Übung (die auf Z enden) sind keine Flüge und erscheinen nicht. Nur die Missionen der unter Einstellungen › Fluggesellschaft gewählten Gesellschaft werden aufgeführt; eine Mission ohne Gesellschaft ist persönlich: Sie steht unter „Personnel“. Hat die Fluggesellschaft Kategorien (Fracht, Passagiere …), behält eine zweite Auswahlliste eine Kategorie, und die geöffnete Mission nennt ihre.

<a id="missions-open"></a>**Auswählen oder zufällig ziehen.** Ein Tippen auf eine Zeile öffnet das Missionsblatt: Kategorie, Kurzbeschreibung in zwei Zeilen, Risiken (die ersten drei, „Gefahr → Gegenmaßnahme“, die übrigen eingeklappt, oder „Kein Risiko angegeben“), die eingesetzten Teams und die Zonen. „Details“ zeigt den Rest in aufklappbaren Abschnitten: Beschreibung, Ziele, zu aktivierende Zonen, Treffpunkte, vorgegebene Route, mitgelieferte Karten, Zuladung und Luftfahrzeuge; „Auf der Karte zeigen“ öffnet die Karte auf einer Zone oder einer Karte der Mission (aus ihren Koordinaten gezeichnet). Auf dem Telefon führt „Zurück“ des Browsers von den Details zum Blatt und dann zur Liste; auf einem großen Bildschirm stehen Blatt und Details nebeneinander. „Zufällig ziehen“ nimmt eine der Missionen der gefilterten Liste, die Sie noch nicht geflogen sind; „Erneut ziehen“ nimmt eine andere. Nichts startet von selbst: „Diesen Flug vorbereiten“ öffnet Kraftstoff, in der Anwendung Pilot, mit Abflug, Ankunft, den Punkten der Mission (als Koordinaten), der Flugfläche und dem Luftfahrzeugtyp; Piste, Verfahren, Kraftstoff und Wetter werden danach wie bei jedem Flug vorbereitet.

<a id="missions-add"></a>**Missionen hinzufügen.** „Missionen hinzufügen“ neben „Zufällig ziehen“ liest eine oder mehrere YAML-Missionsdateien (eine Datei kann mehrere enthalten, getrennt durch „---“ oder in einer Liste `missions:`) oder eingefügtes YAML. Vor dem Schreiben zeigt der Bildschirm, was gelesen wurde (Kennung, Titel, Familie, Serie, Gesellschaft) und was abgelehnt wird, mit dem Grund (Kennung außerhalb der Regel, Übungsorganisation, Duplikat, YAML in einer Zeile unlesbar). „Hinzufügen (n)“ schreibt jede Mission an ihren Platz, `missions/<Buchstabe>_<FAMILIE>/<ID>/mission<ID>.yaml`; eine bereits vorhandene Mission wird nur ersetzt, wenn „ersetzen?“ angekreuzt ist. Eine Mission ohne Gesellschaft ist persönlich. Sie gehen bei der nächsten Synchronisierung.

## Gut zu wissen

- Das Modul liest die Missionen und ändert sie nie; sie werden im CPCO geschrieben.
- Eine Mission, deren Datei nicht kommt, sagt es: „nicht gefunden“ (das Repository hat sie nicht), „noch nicht auf dem Gerät“ (die Synchronisierung bringt sie, die Mission erscheint bei ihrer Ankunft) oder „unlesbar“ (mit dem Grund). Dann wird nur das Register gezeigt.
- Eine Mission, die mit der Synchronisation ohne das Register kam, das sie nennt, wird trotzdem aufgeführt, aus ihrer Datei gelesen, bei der nächsten Anzeige; kein Knopf zu drücken.
- Ein Flug in Vorbereitung wird erst nach einer Frage ersetzt; ein gestarteter Flug nie (erst den Start abbrechen oder den Flug beenden).
- Der Umschlag, der seitenweise Leser und die Zuweisungen kommen später.

<!-- fr: e786600425be -->
