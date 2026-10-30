# Daten

Was die Fluggesellschaft für die App veröffentlicht — die Luftfahrtdatenbank, die Verfahren, die Luftfahrzeuge, das Wetter — und der Stand jedes Datensatzes. Dieser Bildschirm dient dem Lesen und bietet Aktionen für die Luftfahrtdatenbank: ihre Quellen herunterladen, sie aufbauen, die Quellen bereinigen, dann veröffentlichen.

## So geht's

<a id="data-cycle"></a>**Der gültige Zyklus.** Oben der aktuelle AIRAC-Zyklus (zum Beispiel 2610), seine Daten und die Zahl der Tage bis zum nächsten. Darunter sagt „Starter dieses Rechners“ oder „Ohne Starter: nur Lesen“, ob dieser Computer einen Starter hat.

<a id="data-coverage"></a>**Die Abdeckung.** Die Liste der Zonen (Länder, Regionen), die dieser Rechner verfolgt. Beim ersten Öffnen sind es alle Zonen, die die Gesellschaft veröffentlicht; die Liste bleibt auf diesem Gerät. „Land hinzufügen“ nimmt eine Zone, die die Suite kennt, in die Abdeckung auf, auch wenn sie noch niemand veröffentlicht: Sie wird für „Erstellen“ angekreuzt.

<a id="data-states"></a>**Die Staaten.** Unter der Abdeckung sind die Staaten nach Farbe geordnet: grün, Verfahren sind bereits veröffentlicht; orange, sie sind auf Anfrage lesbar; rot, nichts ist lesbar. Der Grund steht in jeder Zeile, die Farbe steht nie allein. Ab sieben Zeilen klappt „n weitere“ den Rest auf.

<a id="data-group-base"></a>**Luftfahrtdatenbank.** Eine Zeile pro Quelle, die eine Zone der Abdeckung versorgt: ihr Zyklus, ihr Alter („vor 3 Tagen veröffentlicht“), die Zahl der veröffentlichten Zonen und eine Statusmarke. Tippen Sie auf eine Zeile, um den Link der Quelle mit seiner Adresse, ihre Lizenz, die versorgten Zonen und das zu sehen, was jede Zone veröffentlicht hat.

<a id="data-group-proc"></a>**Verfahren.** Die Verfahren Frankreichs (eAIP des SIA) und der Vereinigten Staaten (CIFP der FAA), mit der Zahl der veröffentlichten Flugplätze.

<a id="data-group-aircraft"></a>**Luftfahrzeuge.** Die Luftfahrzeugmuster und ihre Leistungen: das Datum der Ausgabe, die Zahl der Muster und der Dateien. Nach 28 Tagen wird die Marke orange.

<a id="data-group-weather"></a>**Wetter.** Das Weltwetter und die NAT-Routen werden mit der Website veröffentlicht: Diese Zeilen haben weder Zyklus noch Marke.

<a id="data-states-pill"></a>**Die Marken.** „Aktuell“: nichts zu tun. „Zyklus überholt“: Der veröffentlichte Zyklus ist älter als der gültige (orange, nach einer Woche rot). „Alter Parser“: von einer älteren Version der Ersteller veröffentlicht. „Über 28 Tage alt“: ein Datensatz ohne Zyklus, vor mehr als 28 Tagen veröffentlicht. „Nicht im Repository“: nichts ist veröffentlicht. Eine Gruppe öffnet sich von selbst, wenn eine ihrer Zeilen Aufmerksamkeit verlangt.

<a id="data-more"></a>**Die weiteren Datensätze.** Höchstens sieben Zeilen pro Gruppe; „n weitere Datensätze“ klappt den Rest und die nur erwogenen oder zurückgestellten Quellen auf (ihr Link, ihre Lizenz, ihr Status).

<a id="data-build"></a>**Die Basis aufbauen.** Am Anfang der Gruppe Luftfahrtdatenbank wirkt das Feld „Herunterladen, aufbauen, bereinigen“ auf die angekreuzten Zonen, mit drei Schaltflächen in dieser Reihenfolge: Herunterladen · Aufbauen · Bereinigen. „Aufbauen“ baut die Basis der angekreuzten Zonen auf dem Starter dieses Rechners neu auf: Ein Browser ohne Fenster (Edge, sonst Chrome) erstellt die Zonen nacheinander, jede wird im Datenrepository gespeichert, sobald sie fertig ist. Zu Beginn sind alle Zonen der Abdeckung angekreuzt; wählen Sie die ab, die Sie nicht neu erstellen wollen. Die drei Schaltflächen sind zusammen grau, der Grund steht nur einmal darunter: „Der Starter des Rechners wird benötigt“, „Ein anderer Vorgang läuft“, „Mindestens eine Zone ankreuzen“, „Offline“.

<a id="data-build-personal"></a>**Quellen mit persönlicher Lizenz.** ENAIRE (Spanien), NATS (Vereinigtes Königreich) und die X-Plane-Daten werden nur angeboten, wenn eine angekreuzte Zone sie nutzt, und sind nie vorab angekreuzt: Kreuzen Sie sie nur an, wenn das Datenrepository nur von Ihnen genutzt wird. Ist X-Plane angekreuzt, läuft der Aufbau in der Seite, was hier noch nicht möglich ist: Er endet mit diesem Grund.

<a id="data-build-run"></a>**Während des Aufbaus.** Ein Balken, „n von m Zonen“, der Schritt und die vergangene Zeit; eine Zeile je Zone sagt: wartet, wird erstellt (n / m Quellen), erstellt, fehlgeschlagen mit Grund oder abgebrochen. „Anhalten“ fordert den Stopp an: Die laufende Zone wird beendet, bereits erstellte Zonen bleiben erhalten. Sie können den Bildschirm verlassen: Der Aufbau läuft im Starter weiter und wird bei Ihrer Rückkehr wiedergefunden. Wurde der Starter unterwegs beendet, steht „Aufbau unterbrochen“ mit dem letzten Stand jeder Zone da: Starten Sie neu und wählen Sie bei Bedarf die fertigen Zonen ab.

<a id="data-build-end"></a>**Am Ende.** Eine Benachrichtigung nennt die Zahlen („Basis erstellt: 3 Zonen; 1 fehlgeschlagen (gb)“), und die Zusammenfassung bleibt im Feld stehen, mit dem, was zu tun ist: eine fehlgeschlagene Zone (der Grund steht in ihrer Zeile: Browser ohne Fenster, Zeitlimit, ungültige Ausgabe, Schreiben nicht möglich…), ein angehaltener Aufbau, kein Browser gefunden („Auf diesem Rechner wurden weder Edge noch Chrome gefunden: installieren Sie einen der beiden.“). Danach wird der Stand der Zeilen neu gelesen.

<a id="data-download"></a>**Herunterladen.** Die Schaltfläche „Herunterladen“ holt auf dem Starter dieses Rechners die Rohquellen der angekreuzten Zonen (openAIP, FAA, UK Mil AIP, NAV CANADA, NAT-Tracks des Tages; ENAIRE nur, wenn sie unter den Quellen mit persönlicher Lizenz angekreuzt ist). Eine Zeile pro Zone sagt, wo sie steht („wird heruntergeladen (2 / 3 Quellen)“), darunter eine Zeile pro Quelle: heruntergeladen (n Dateien), unverändert, fehlgeschlagen mit Grund und HTTP-Code („HTTP 404“), übersprungen (Lizenz nicht erklärt) oder manuell. Was sich nicht geändert hat, wird nie neu geschrieben. Am Ende nennt eine Benachrichtigung die Zahlen („Heruntergeladen: 2 Zonen geändert, 1 unverändert; 1 Fehler“); die Quellen, die der Starter nicht herunterlädt (zum Beispiel der SIA), werden mit Namen aufgelistet, mit einem Link nur, wenn ihre Adresse https ist, „von Hand abzulegen“; wurden von git verfolgte Quelldateien geändert, sagt der Bildschirm es („n Quelldateien geändert, außerhalb der synchronisierten Daten“). „Für diese Zonen gibt es nichts herunterzuladen“: keine der angekreuzten Zonen hat eine herunterladbare Quelle. Zwei Downloads dürfen nicht näher als 30 s aufeinander folgen: der Bildschirm sagt „Versuchen Sie es in n s erneut“.

<a id="data-purge"></a>**Bereinigen.** Die Schaltfläche „Bereinigen“ entfernt vom Rechner die Rohquellen der angekreuzten Zonen (die man erneut herunterlädt) und ihre Zwischenspeicher. Sie berechnet zuerst den Plan, ohne etwas zu löschen, und stellt dann eine einzige Frage: „15 Dateien (14,3 MB) aus den Quellen von Spanien, Frankreich bereinigen?“. Gehören die SIA-Dateien (Frankreich) dazu, erinnert die Frage daran, dass sie beim Aufbau auch die Umrisse der anderen Zonen liefern; von git verfolgte Dateien bleiben immer erhalten und werden gezählt. Nein: nichts wird entfernt. Ja: das Bereinigen läuft und der Bildschirm sagt „Bereinigt: n Dateien, x MB“, mit den abgelehnten Pfaden (an Ort und Stelle belassen). Nichts zu entfernen: „Nichts zu bereinigen“, ohne Frage.

<a id="data-publish"></a>**Basis veröffentlichen.** Unter „Aufbauen“ sendet das Feld „Basis veröffentlichen“ das, was auf diesem Rechner erstellt wurde, an das Datenrepository. Eine erstellte Zone wird auf dem Rechner vollständig eingecheckt und geht auch bei der nächsten Synchronisation hinaus: „Veröffentlichen“ sendet sie sofort. Es sagt zuerst, wo der Rechner steht: „3 Dateien geändert · 2 Commits zu senden“, das Datum des letzten Durchlaufs und, falls vorhanden, die in data/ wartende Zusammenführung (die Veröffentlichung schließt sie zuerst ab). Tippen Sie auf „Veröffentlichen“: eine einzige Frage nennt die Dateien und die Commits, dann läuft der Durchlauf; ein endloser Balken zeigt, dass er arbeitet. Währenddessen sind die Schaltflächen des Feldes „Herunterladen, aufbauen, bereinigen“ ausgegraut, und „Veröffentlichen“ ist es während jedes Vorgangs dieses Feldes: ein Vorgang nach dem anderen.

<a id="data-publish-end"></a>**Am Ende der Veröffentlichung.** Eine Benachrichtigung nennt die Zahlen, und das Ergebnis bleibt im Feld: was gesendet wurde (eingecheckte Dateien, empfangene Dateien); die Dateien der Basis, die auf dem Rechner bleiben, weil ein Aufbau lief; die Konflikte (die neueste Fassung bleibt, siehe Einstellungen › Konflikte); die abgelehnten Dateien, weil sie nicht das Format einer Datendatei haben. Ein Fehler wird in einem Satz gesagt, mit der Antwort des Starters: nichts geht verloren, die Dateien bleiben auf dem Rechner. Die Schaltfläche ist ausgegraut, ihr Grund steht darunter: „Der Starter des Rechners wird benötigt“, „Ein Aufbau läuft: veröffentlichen Sie, wenn er fertig ist“, „Nichts zu veröffentlichen“, „Der Rahmen kann die Basis noch nicht veröffentlichen: aktualisieren Sie die App“, „Offline“.

<a id="data-journal"></a>**Das Protokoll.** Am Ende des Bildschirms die letzten 50 Vorgänge dieses Geräts: UTC-Zeit, Verb, Zonen, Ergebnis.

## Sonderfälle

- **Ohne Starter**: Der Bildschirm wird genauso gelesen; er zeigt, was veröffentlicht ist.
- **Ein Lesevorgang schlägt fehl**: Der Abschnitt sagt es in einer Zeile, der Rest des Bildschirms wird gezeichnet.

<!-- fr: 116007677a97 -->
