# Daten

Was die Fluggesellschaft für die App veröffentlicht — die Luftfahrtdatenbank, die Verfahren, die Luftfahrzeuge, das Wetter — und der Stand jedes Datensatzes. Dieser Bildschirm dient dem Lesen und bietet eine einzige Aktion: die Luftfahrtdatenbank aufbauen; er lädt nichts herunter und veröffentlicht nichts.

## So geht's

<a id="data-cycle"></a>**Der gültige Zyklus.** Oben der aktuelle AIRAC-Zyklus (zum Beispiel 2610), seine Daten und die Zahl der Tage bis zum nächsten. Darunter sagt „Starter dieses Rechners“ oder „Ohne Starter: nur Lesen“, ob dieser Computer einen Starter hat.

<a id="data-coverage"></a>**Die Abdeckung.** Die Liste der Zonen (Länder, Regionen), die dieser Rechner verfolgt. Beim ersten Öffnen sind es alle Zonen, die die Gesellschaft veröffentlicht; die Liste bleibt auf diesem Gerät.

<a id="data-states"></a>**Die Staaten.** Unter der Abdeckung sind die Staaten nach Farbe geordnet: grün, Verfahren sind bereits veröffentlicht; orange, sie sind auf Anfrage lesbar; rot, nichts ist lesbar. Der Grund steht in jeder Zeile, die Farbe steht nie allein. Ab sieben Zeilen klappt „n weitere“ den Rest auf.

<a id="data-group-base"></a>**Luftfahrtdatenbank.** Eine Zeile pro Quelle, die eine Zone der Abdeckung versorgt: ihr Zyklus, ihr Alter („vor 3 Tagen veröffentlicht“), die Zahl der veröffentlichten Zonen und eine Statusmarke. Tippen Sie auf eine Zeile, um den Link der Quelle mit seiner Adresse, ihre Lizenz, die versorgten Zonen und das zu sehen, was jede Zone veröffentlicht hat.

<a id="data-group-proc"></a>**Verfahren.** Die Verfahren Frankreichs (eAIP des SIA) und der Vereinigten Staaten (CIFP der FAA), mit der Zahl der veröffentlichten Flugplätze.

<a id="data-group-aircraft"></a>**Luftfahrzeuge.** Die Luftfahrzeugmuster und ihre Leistungen: das Datum der Ausgabe, die Zahl der Muster und der Dateien. Nach 28 Tagen wird die Marke orange.

<a id="data-group-weather"></a>**Wetter.** Das Weltwetter und die NAT-Routen werden mit der Website veröffentlicht: Diese Zeilen haben weder Zyklus noch Marke.

<a id="data-states-pill"></a>**Die Marken.** „Aktuell“: nichts zu tun. „Zyklus überholt“: Der veröffentlichte Zyklus ist älter als der gültige (orange, nach einer Woche rot). „Alter Parser“: von einer älteren Version der Ersteller veröffentlicht. „Über 28 Tage alt“: ein Datensatz ohne Zyklus, vor mehr als 28 Tagen veröffentlicht. „Nicht im Repository“: nichts ist veröffentlicht. Eine Gruppe öffnet sich von selbst, wenn eine ihrer Zeilen Aufmerksamkeit verlangt.

<a id="data-more"></a>**Die weiteren Datensätze.** Höchstens sieben Zeilen pro Gruppe; „n weitere Datensätze“ klappt den Rest und die nur erwogenen oder zurückgestellten Quellen auf (ihr Link, ihre Lizenz, ihr Status).

<a id="data-build"></a>**Die Basis aufbauen.** Am Anfang der Gruppe Luftfahrtdatenbank baut das Feld „Basis aufbauen“ die Basis der angekreuzten Zonen auf dem Starter dieses Rechners neu auf: Ein Browser ohne Fenster (Edge, sonst Chrome) erstellt die Zonen nacheinander, jede wird im Datenrepository gespeichert, sobald sie fertig ist. Zu Beginn sind alle Zonen der Abdeckung angekreuzt; wählen Sie die ab, die Sie nicht neu erstellen wollen. Die Schaltfläche ist grau, der Grund steht darunter: „Der Starter des Rechners wird benötigt“, „Ein anderer Vorgang läuft“, „Mindestens eine Zone ankreuzen“, „Offline“.

<a id="data-build-personal"></a>**Quellen mit persönlicher Lizenz.** ENAIRE (Spanien), NATS (Vereinigtes Königreich) und die X-Plane-Daten werden nur angeboten, wenn eine angekreuzte Zone sie nutzt, und sind nie vorab angekreuzt: Kreuzen Sie sie nur an, wenn das Datenrepository nur von Ihnen genutzt wird. Ist X-Plane angekreuzt, läuft der Aufbau in der Seite, was hier noch nicht möglich ist: Er endet mit diesem Grund.

<a id="data-build-run"></a>**Während des Aufbaus.** Ein Balken, „n von m Zonen“, der Schritt und die vergangene Zeit; eine Zeile je Zone sagt: wartet, wird erstellt (n / m Quellen), erstellt, fehlgeschlagen mit Grund oder abgebrochen. „Anhalten“ fordert den Stopp an: Die laufende Zone wird beendet, bereits erstellte Zonen bleiben erhalten. Sie können den Bildschirm verlassen: Der Aufbau läuft im Starter weiter und wird bei Ihrer Rückkehr wiedergefunden. Wurde der Starter unterwegs beendet, steht „Aufbau unterbrochen“ mit dem letzten Stand jeder Zone da: Starten Sie neu und wählen Sie bei Bedarf die fertigen Zonen ab.

<a id="data-build-end"></a>**Am Ende.** Eine Benachrichtigung nennt die Zahlen („Basis erstellt: 3 Zonen; 1 fehlgeschlagen (gb)“), und die Zusammenfassung bleibt im Feld stehen, mit dem, was zu tun ist: eine fehlgeschlagene Zone (der Grund steht in ihrer Zeile: Browser ohne Fenster, Zeitlimit, ungültige Ausgabe, Schreiben nicht möglich…), ein angehaltener Aufbau, kein Browser gefunden („Auf diesem Rechner wurden weder Edge noch Chrome gefunden: installieren Sie einen der beiden.“). Danach wird der Stand der Zeilen neu gelesen.

<a id="data-journal"></a>**Das Protokoll.** Am Ende des Bildschirms die letzten 50 Vorgänge dieses Geräts: UTC-Zeit, Verb, Zonen, Ergebnis.

## Sonderfälle

- **Ohne Starter**: Der Bildschirm wird genauso gelesen; er zeigt, was veröffentlicht ist.
- **Ein Lesevorgang schlägt fehl**: Der Abschnitt sagt es in einer Zeile, der Rest des Bildschirms wird gezeichnet.

<!-- fr: 9746437814d3 -->
