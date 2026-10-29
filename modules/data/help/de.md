# Daten

Was die Fluggesellschaft für die App veröffentlicht — die Luftfahrtdatenbank, die Verfahren, die Luftfahrzeuge, das Wetter — und der Stand jedes Datensatzes. Dieser Bildschirm ist nur lesbar: Er lädt nichts herunter, erstellt nichts und veröffentlicht nichts.

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

## Sonderfälle

- **Ohne Starter**: Der Bildschirm wird genauso gelesen; er zeigt, was veröffentlicht ist.
- **Ein Lesevorgang schlägt fehl**: Der Abschnitt sagt es in einer Zeile, der Rest des Bildschirms wird gezeichnet.

<!-- fr: 71da719b10a1 -->
