<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Wartung — Handbuch

Die Anwendung Wartung ist für den Administrator der Fluggesellschaft: die Daten, die sie für die Piloten veröffentlicht
(Modul Daten), die Flotte und ihre Leistungsdatenblätter (Modul Luftfahrzeuge) und die Verwaltung der Suite
(Einstellungen, Karte Verwaltung). Sie öffnet sich auf der Stufe Vollständig. Mit dem Starter des Rechners schreibt sie;
ohne Starter oder von einem gekoppelten Gerät aus ist sie nur lesbar.

## Erster Start

- **Die Einträge.** Auf einem Telefon trägt die untere Leiste die Module von Wartung: Daten, und Luftfahrzeuge auf der
  Stufe, die es öffnet. Oben rechts öffnet wie in Pilot „?“ diese Hilfe und ⚙ die Einstellungen, samt Karte Verwaltung.
  Auf einem Bildschirm sind es die Einträge der linken Spalte, mit Verwaltung und den Dienstseiten des Rechners
  (Token der Piloten, Geräte, Wartungsseite V2). Der Name der Anwendung oben links öffnet die Liste der Anwendungen: Ein
  Tippen wechselt zu Pilot.
- **Die Hilfe.** Eine einzige Tür, das „?“: Sie öffnet sich beim Kapitel des angezeigten Bildschirms, oben mit dem
  Inhalt und „Gesamte Hilfe“ (die Handbücher und Tutorials); dieses Handbuch behandelt nur Wartung, das von
  Pilot bleibt in Pilot.
- **Der Status der Anwendung.** Der Punkt am ⚙ (grün: etwas Neues; orange: etwas braucht Ihre Aufmerksamkeit) führt zum
  Block „Status“ oben in den Einstellungen.

<!-- chapter: data -->
# Daten

Was die Fluggesellschaft für die App veröffentlicht — die Luftfahrtdatenbank, die Verfahren, die Luftfahrzeuge, das Wetter — und der Stand jedes Datensatzes. Dieser Bildschirm dient dem Lesen und bietet Aktionen für jede Gruppe: die Quellen herunterladen, aufbauen, bereinigen, dann veröffentlichen.

## So geht's

<a id="data-cycle"></a>**Der gültige Zyklus.** Oben der aktuelle AIRAC-Zyklus (zum Beispiel 2610), seine Daten und die Zahl der Tage bis zum nächsten. Darunter sagt „Starter dieses Rechners“ oder „Ohne Starter: nur Lesen“, ob dieser Computer einen Starter hat.

<a id="data-coverage"></a>**Die Abdeckung.** Die Liste der Zonen (Länder, Regionen), die dieser Rechner verfolgt. Beim ersten Öffnen sind es alle Zonen, die die Gesellschaft veröffentlicht; die Liste bleibt auf diesem Gerät. „Land hinzufügen“ nimmt eine Zone, die die Suite kennt, in die Abdeckung auf, auch wenn sie noch niemand veröffentlicht: Sie wird für „Erstellen“ angekreuzt.

<a id="data-packs"></a>**Länderpakete.** Neben der Karte, mit der Zonenliste (auf dem Telefon darunter), wenn AeroDB Pakete liefert: eine Zeile je Regionalpaket (Westeuropa, Asien …) mit Länderzahl und Größe. Die Zeile ist ein **Schalter „das ganze Paket in der Abdeckung“**: an, alle Zonen sind in der Abdeckung (angekreuzt); halb, ein Teil ist es; Einschalten fügt die fehlenden hinzu; **Ausschalten entfernt alle Zonen des Pakets aus der Abdeckung**, nach einer Frage, die sie nennt: Sie werden abgewählt und verschwinden aus der Liste dieses Rechners, **nichts wird gelöscht** (die Dateien bleiben). Mit der Maus über eine Zeile fahren oder sie auf dem Telefon drücken **hebt ihre Zonen auf der Karte hervor**. Unter dem Schalter listet eine eingeklappte Falte **„Länder (n)“** die Länder des Pakets mit je einem Kästchen (angekreuzt = in der Abdeckung): ein Land anzukreuzen fügt nur dieses hinzu, nichts wird heruntergeladen oder gebaut; aufgeklappt scrollt sie in sich. Ein leeres Paket sagt warum („heute weder Zone noch Quelle“). Regionen und **Themen** (Inseln, Wüsten …) stehen in einem Block mit zwei Tabs, „Regionen“ und „Themen“. Ein Thema ist eine Falte, die ihre Länder **im selben Raster wie die Zonenliste** zeigt: ein Häkchen je Land (angekreuzt = in der Abdeckung), der Name; ein Land anzukreuzen fügt es der Abdeckung hinzu, das Häkchen zu entfernen nimmt es nach einer Frage heraus (nichts wird gelöscht); am Kopf des Rasters ein Schalter „Das ganze Thema“. Keine Schaltfläche in einer Zeile.

<a id="data-states"></a>**Die Staaten.** Unter der Abdeckung sind die Staaten nach Farbe geordnet: grün, Verfahren sind bereits veröffentlicht; orange, sie sind auf Anfrage lesbar; rot, nichts ist lesbar. Der Grund steht in jeder Zeile, die Farbe steht nie allein. Ab sieben Zeilen klappt „n weitere“ den Rest auf.

<a id="data-group-base"></a>**Luftfahrtdatenbank.** Eine Zeile pro Quelle, die eine Zone der Abdeckung versorgt: ihr Zyklus, ihr Alter („vor 3 Tagen veröffentlicht“), die Zahl der veröffentlichten Zonen und eine Statusmarke. Tippen Sie auf eine Zeile, um den Link der Quelle mit seiner Adresse, ihre Lizenz, die versorgten Zonen und das zu sehen, was jede Zone veröffentlicht hat.

<a id="data-group-proc"></a>**Verfahren.** Die Verfahren Frankreichs (eAIP des SIA) und der Vereinigten Staaten (CIFP der FAA), mit der Zahl der veröffentlichten Flugplätze. Jede Staatszeile nennt auch die Flugplätze, deren Verfahren schon da sind („Frankreich — 3.069 Flugplätze, Zyklus 2611“; „n Flugplätze gelesen“ für die anderen Staaten).

<a id="data-group-aircraft"></a>**Luftfahrzeuge.** Die Luftfahrzeugmuster und ihre Leistungen: das Datum der Ausgabe, die Zahl der Muster und der Dateien. Nach 28 Tagen wird die Marke orange.

<a id="data-group-weather"></a>**Wetter.** Das Weltwetter und die NAT-Routen werden mit der Website veröffentlicht: Diese Zeilen haben weder Zyklus noch Marke.

<a id="data-world"></a>**Welt-Synoptik (GFS).** In der Gruppe Wetter eine Zeile für die synoptische Weltvorhersage der Atmosphärenkarte: ihr Zustand („Nicht auf diesem Rechner“, solange keine veröffentlicht ist, „Über 12 Std. alt“, wenn sie altert), der GFS-Lauf, die Zahl der Schritte, ihre Größe und ihr Alter. „Aufbauen“ erstellt sie auf dem Rechner (etwa 2 Minuten beim ersten Mal; wenige Sekunden, wenn der Lauf schon da ist, er wird dann wiederverwendet). Sie wird **lokal** in data/local/weather/world/ veröffentlicht: nie synchronisiert oder committet. Ein Fehlschlag nennt seinen Grund (kein Lauf veröffentlicht oder NOAA nicht erreichbar, ungültiger Ordner, Zeit überschritten); die alte Veröffentlichung bleibt.

<a id="data-zone-link"></a>**Verweise auf eine Zone.** `#data?zone=<id>` öffnet die Basis, kreuzt nur diese Zone an und führt zu „Aktualisieren“; eine Zone außerhalb der Abdeckung wird genannt, mit „Land hinzufügen“. Auch die Gründe einer neu zu bauenden Zone zählen: Datei des Zyklus fehlt, gebaut bevor die Datei einer Quelle da war, Datei vorhanden aber Feld „persönlich“ nicht angekreuzt (mit dem Feld neu erstellen), Datei abzulegen. Ein **Hinweis** („Zone ohne Punkte und Strecken: die Quelle enthält sie nicht“) macht die Zone nicht veraltet.

<a id="data-states-pill"></a>**Die Marken.** „Aktuell“: nichts zu tun. „Zyklus überholt“: Der veröffentlichte Zyklus ist älter als der gültige (orange, nach einer Woche rot). „Alter Parser“: von einer älteren Version der Ersteller veröffentlicht. „Über 28 Tage alt“: ein Datensatz ohne Zyklus, vor mehr als 28 Tagen veröffentlicht. „Nicht im Repository“: nichts ist veröffentlicht. Eine Gruppe öffnet sich von selbst, wenn eine ihrer Zeilen Aufmerksamkeit verlangt.

<a id="data-more"></a>**Die weiteren Datensätze.** Höchstens sieben Zeilen pro Gruppe; „n weitere Datensätze“ klappt den Rest und die nur erwogenen oder zurückgestellten Quellen auf (ihr Link, ihre Lizenz, ihr Status).

<a id="data-build"></a>**Die Basis aufbauen.** Am Anfang der Gruppe Luftfahrtdatenbank wirkt das Feld „Basis aktualisieren“ auf die angekreuzten Zonen, mit drei Schaltflächen in dieser Reihenfolge: Herunterladen · Aufbauen · Bereinigen. „Aufbauen“ baut die Basis der angekreuzten Zonen auf dem Starter dieses Rechners neu auf: Ein Browser ohne Fenster (Edge, sonst Chrome) erstellt die Zonen nacheinander, jede wird im Datenrepository gespeichert, sobald sie fertig ist. Zu Beginn sind alle Zonen der Abdeckung angekreuzt; wählen Sie die ab, die Sie nicht neu erstellen wollen. Die drei Schaltflächen sind zusammen grau, der Grund steht nur einmal darunter: „Der Starter des Rechners wird benötigt“, „Ein anderer Vorgang läuft“, „Mindestens eine Zone ankreuzen“, „Offline“.

<a id="data-build-personal"></a>**Quellen mit persönlicher Lizenz.** ENAIRE (Spanien), NATS (Vereinigtes Königreich), AirNav (Irland) und die X-Plane-Daten werden aufgelistet, wenn eine angekreuzte Zone sie nutzt. **Ein einziges Häkchen** schaltet alle frei: „Ich bestätige, die Daten für meinen persönlichen Gebrauch zu nutzen“ (nie vorab angekreuzt: nur ankreuzen, wenn das Datenrepository nur von Ihnen genutzt wird). Angekreuzt wird es an diesem Rechner gemerkt, bei jedem Öffnen von Daten wieder angekreuzt und geht mit jedem „Herunterladen“, „Aufbauen“ und „Aktualisieren“ mit (alle Quellen zur persönlichen Nutzung der angekreuzten Zonen); nur sein eigenes Kästchen hebt es auf. Was proprietär ist (X-Plane, EUROCONTROL), wird **nur auf diesem Rechner gelesen**: nie in der veröffentlichten Basis noch in einem Export, mit oder ohne Häkchen. Der Link „Quellen und Lizenzen“ öffnet die Seite, die jede Quelle aufführt (Herausgeber, Lizenz, Quellenangabe, Datum). Ein früheres angekreuztes Kästchen einer Quelle wird zum einen Häkchen.

<a id="data-build-run"></a>**Während des Aufbaus.** Ein Balken, „n von m Zonen“, der Schritt und die vergangene Zeit; eine Zeile je Zone sagt: wartet, wird erstellt (n / m Quellen), erstellt, fehlgeschlagen mit Grund oder abgebrochen. „Anhalten“ fordert den Stopp an: Die laufende Zone wird beendet, bereits erstellte Zonen bleiben erhalten. Sie können den Bildschirm verlassen: Der Aufbau läuft im Starter weiter und wird bei Ihrer Rückkehr wiedergefunden. Wurde der Starter unterwegs beendet, steht „Aufbau unterbrochen“ mit dem letzten Stand jeder Zone da: Starten Sie neu und wählen Sie bei Bedarf die fertigen Zonen ab.

<a id="data-build-end"></a>**Am Ende.** Eine Benachrichtigung nennt die Zahlen („Basis erstellt: 3 Zonen; 1 fehlgeschlagen (gb)“), und die Zusammenfassung bleibt im Feld stehen, mit dem, was zu tun ist: eine fehlgeschlagene Zone (der Grund steht in ihrer Zeile: Browser ohne Fenster, Zeitlimit, ungültige Ausgabe, Schreiben nicht möglich…), ein angehaltener Aufbau, kein Browser gefunden („Auf diesem Rechner wurden weder Edge noch Chrome gefunden: installieren Sie einen der beiden.“). Danach wird der Stand der Zeilen neu gelesen. Ist eine Quelle der Basis von einem vergangenen Zyklus (die SIA im Zyklus 2610, während 2611 gilt), nennt eine orangefarbene Zeile sie einmal, mit ihrer Seite und der Datei, die zu holen ist: „Aufbauen“ würde den alten Zyklus neu bauen. Eine Zone ohne datierte Quelle (openAIP, GeoNames, Gelände) gilt nie als überholt. Fehlt der geltende Zyklus einer Quelle, die von Hand zu holen ist, sagt es eine orangefarbene Zeile unter den Schaltflächen („SIA Frankreich 2611 fehlt: Laden Sie export_xml_bd_SIA_<Datum>-v<nn>.zip von der SIA-Website herunter“); „Heruntergeladene Datei übernehmen“ wird dann zur Hauptschaltfläche und „Aufbauen“ verliert sie. Diese Zeile stammt vom letzten Download oder Aufbau (das Journal behält sie): zum Lesen wird nichts gestartet, und „Zyklus X überholt“ nennt die verantwortliche Quelle.

<a id="data-update"></a>**Aktualisieren.** Die Haupttaste des Basis-Panels: Sie lädt die Quellen der angekreuzten Zonen herunter (wie „Herunterladen“) und liest dann den **Zustand jeder Zone** vom Starter; neu gebaut werden nur die, die nicht aktuell sind und die der Aufbau bearbeiten kann. Eine einzige Frage nennt diese Zonen, den Grund jeder einzelnen (ein einziger Satz, wenn es viele sind: „45 Zonen: mit einem älteren Parser erstellt“) und ihre Größe und sagt, dass es dauern kann; ist nichts neu zu bauen, sagt ein Satz es. Zonen, die auf eine Datei aus Downloads warten, werden genannt: zuerst „Heruntergeladene Datei übernehmen“. Lässt sich der Zustand nicht lesen, wird nichts neu gebaut. „Aktualisieren“ ist die einzige sichtbare Schaltfläche; **„Details“** (eingeklappt) enthält „Herunterladen“, „Heruntergeladene Datei übernehmen“ (bleibt sichtbar und hauptsächlich, wenn ein manueller Zyklus fehlt), „Alles neu berechnen“ (der frühere Aufbau über die ganze Auswahl, gleich in welchem Zustand: nach einem Löschen oder im Zweifel) und „Bereinigen“. Über 60 angekreuzten Zonen arbeiten die Verben in Läufen zu 60, nacheinander; „Bereinigen“ plant zuerst jeden Lauf und stellt dann **eine einzige Frage** mit der Summe. Jede Zone der Liste und der Karte nennt ihren Zustand, wie der Starter ihn gibt: **grün** (aktuell), **orange** (neu zu bauen: Tippen Sie auf die Markierung, um den Grund zu lesen — neuere Quelle, Quelldateien geändert, älterer Parser, fehlende Dateien, eine zu übernehmende Datei …), **grau** (nie gebaut), **rot** (letzter Aufbau fehlgeschlagen), **blau** (die Seite baut sie gerade). Der Zustand wird nach jedem Vorgang neu gelesen: Ein orangefarbenes Land wird grün, ohne die Seite neu zu laden. Die Zonen sind **unabhängig**: ein fehlgeschlagener Download oder Lauf von 60 Zonen hält die anderen nicht auf, die fehlgeschlagene Zone ist eine Zeile mit ihrem Grund. Unter der Zeile „Auswahl“ eine **Bilanz in einer Zeile** („58 aktuell · 2 fehlgeschlagen · 1 wartet auf eine Datei“): jede Zahl ist eine Schaltfläche, die nur ihre Zonen zeigt (dieselbe oder „Alle anzeigen“ gibt die Liste zurück). In der Zeile einer fehlgeschlagenen Zone **„Erneut versuchen“** (nur diese Zone bauen); in der Zeile einer Zone, die auf eine Datei wartet, was sie erwartet und **„Heruntergeladene Datei übernehmen“**, das danach den Bau der Zone startet.

<a id="data-select"></a>**Eine Menge von Zonen wählen.** Über der Liste liest „Nur die veralteten“ den Zustand vom Starter und lässt nur die neu zu bauenden Zonen angekreuzt (ist keine dabei, bleibt die Auswahl, wie sie ist), „Alles abwählen“ hebt alles auf, und die Zeile „Auswahl“ nennt die Zahl der angekreuzten Zonen und ihre Größe vor jedem Vorgang. Auf der Karte zeichnet **Umschalt + Ziehen** (Computer) oder **zwei Finger, eine halbe Sekunde gehalten** (Telefon; das Rechteck reicht von einem Finger zum anderen) ein Rechteck, das die Zonen der Abdeckung ankreuzt, die es berührt, mit der Zahl vor dem Loslassen („14 Länder“); ein Rechteck wird der Auswahl hinzugefügt, es ersetzt sie nicht. Das Tippen auf ein Land bleibt wie bisher. Die Auswahl gibt es nur auf dem Bildschirm: Vor einem Vorgang wird nichts geschrieben.

<a id="data-download"></a>**Herunterladen.** Die Schaltfläche „Herunterladen“ holt auf dem Starter dieses Rechners die Rohquellen der angekreuzten Zonen (openAIP, FAA, UK Mil AIP, NAV CANADA, NAT-Tracks des Tages; ENAIRE nur, wenn sie unter den Quellen mit persönlicher Lizenz angekreuzt ist). Eine Zeile pro Zone sagt, wo sie steht („wird heruntergeladen (2 / 3 Quellen)“), darunter eine Zeile pro Quelle: heruntergeladen (n Dateien), unverändert, fehlgeschlagen mit Grund und HTTP-Code („HTTP 404“), übersprungen (Lizenz nicht erklärt) oder manuell. Was sich nicht geändert hat, wird nie neu geschrieben. Am Ende nennt eine Benachrichtigung die Zahlen („Heruntergeladen: 2 Zonen geändert, 1 unverändert; 1 Fehler“); die Quellen, die der Starter nicht herunterlädt (zum Beispiel der SIA), werden mit Namen aufgelistet, mit einem Link nur, wenn ihre Adresse https ist, „von Hand abzulegen“; wurden von git verfolgte Quelldateien geändert, sagt der Bildschirm es („n Quelldateien geändert, außerhalb der synchronisierten Daten“). „Für diese Zonen gibt es nichts herunterzuladen“: keine der angekreuzten Zonen hat eine herunterladbare Quelle. Zwei Downloads dürfen nicht näher als 30 s aufeinander folgen: der Bildschirm sagt „Versuchen Sie es in n s erneut“.

<a id="data-zone-map"></a>**Die Karte der anzukreuzenden Zonen.** Über der Liste der Zonen (Panel der Basis) und der Staaten (Panel der Verfahren: Frankreich und die Vereinigten Staaten) zeichnet eine echte Karte (die gemeinsame Kartenbasis der Anwendung, wie die Karte und das Wetter sie nutzen) die Zonen in der Tönung ihres Zustands: Sie verschieben und zoomen sie mit dem Finger, und die Schaltfläche „Neu zentrieren“ bringt die Ansicht auf alle Zonen zurück. Ein Tippen auf eine Zone kreuzt sie an oder ab, genau wie ihr Kästchen in der Liste (eine einzige Auswahl: Karte und Liste werden beide daraus neu gezeichnet); Ziehen oder Zoomen der Karte kreuzt nichts an. Ein Land, das die Suite kennt, aber nicht in Ihrer Abdeckung liegt, ist grau gezeichnet („nicht in der Abdeckung“): Ein Tippen fügt es der Abdeckung hinzu und kreuzt es an, wie „Land hinzufügen“; ein weiteres Tippen kreuzt es ab. Ein Land der Abdeckung wird nur an- oder abgekreuzt: Ein Tippen entfernt es nie. Mit der Tastatur ist die Liste der Weg: ihre Kästchen werden mit der Leertaste angekreuzt. Die Farbe folgt dem Zustand (aktuell, Zyklus überholt oder fehlend, läuft, nicht in der Abdeckung: die Legende unter der Karte nennt sie in Worten), steht aber nie allein: Eine angekreuzte Zone hat einen dicken Rand und eine vollere Tönung. Während einer Operation ist die Karte wie die Liste eingefroren. Ein Umriss, der nur der Rahmen der Zone ist, ist gestrichelt; die Legende erinnert daran. Kann die Karte nicht kommen (offline ohne Kartenhintergrund im Speicher, kein WebGL oder der Rahmen liefert die Umrisse nicht), bleibt die Liste allein, ohne Fehlermeldung. Ist die Karte genug herangezoomt (Karte der Staaten), erscheinen die Flugplätze, deren Verfahren schon da sind, als Punkte: grün, wenn aktuell, orange, wenn von einem vergangenen Zyklus; ein Tippen auf einen Punkt nennt seinen Code und seinen Zyklus, ohne den Staat anzukreuzen. Weiter weg bleibt nur die Anzahl in der Zeile des Staates. Es ist eine Lesung der Basis dieses Geräts: Nichts wird heruntergeladen oder geschrieben.

<a id="data-route"></a>**Strecke (RAD, FRA-Punkte).** In der Gruppe Verfahren eine Zeile mehr: die EUROCONTROL-Arbeitsmappen der Streckenberechnung. Sie nennt die auf diesem Rechner vorhandenen Zyklen („RAD vom … · FRA-Punkte vom … · vor n Tagen importiert“) und trägt die Markierung der anderen Datensätze: „Nicht im Repository“ ohne Import, „Zyklus überholt“, wenn das letzte RAD vor dem gültigen Zyklus liegt, sonst „Aktuell“. „Aus Downloads importieren“ sucht zuerst, ohne etwas zu schreiben, die Arbeitsmappen `RAD_<cycle>_v….xlsx` und `eurocontrol-airac-<cycle>-fra-points-….xlsx` in Ihrem Download-Ordner und stellt dann eine Frage, die sie nennt (Art, Zyklus, Größe) und an die Lizenz erinnert: EUROCONTROL-Network-Manager-Dokumente, Nutzung durch die Gesellschaft, nur in ihrem privaten Repository veröffentlicht. Nach „Importieren“ werden nur die gezeigten Arbeitsmappen in `data/route/` kompiliert (ein Zyklus ersetzt denselben Zyklus, die anderen bleiben) und ein Commit erstellt; die Zeile nennt dann die vorhandenen Zyklen. Ohne Arbeitsmappe in Downloads sagt sie das und fragt nichts.

<a id="data-pickup"></a>**Heruntergeladene Datei übernehmen.** Manche Quellen laden sich nicht von selbst herunter (der SIA für Frankreich, NATS für das Vereinigte Königreich): Sie laden sie in Ihrem Browser herunter, dann sucht „Heruntergeladene Datei übernehmen“ (die zweite Schaltfläche des Basisfelds und unter der Zeile „von Hand abzulegen“ eines Downloads) im Ordner Downloads des Rechners das neueste Zip mit dem erwarteten Namen (zum Beispiel EG_*_DS_*_XML.zip). Zuerst der Plan und eine einzige Frage: für jede Zone das gefundene Zip (Name, Anzahl der Dateien, Größe), was fehlt (mit dem erwarteten Namen), wohin die Dateien kommen (data/sia/, data/sia/zones/gb/); es sind Rohquellen dieses Rechners, nie committet. Nichts gefunden: keine Frage, der Bildschirm sagt, was fehlt. Der Plan sendet auch das Feld „persönlich“: Sind die NATS-Datensätze schon da, das Feld nennt NATS aber nicht, sagt der Bildschirm „n NATS-Datensatz/-Datensätze bereits übernommen: nichts Neues zu übernehmen“ (nicht „Nichts zum Übernehmen“) und dann „n NATS-Datensätze vorhanden: das Feld „persönlich“ nennt NATS nicht“: Feld ankreuzen, dann liest „Aktualisieren“ sie. Am Ende: „Übernommen: n Dateien (x MB)“, die Fehler benannt (Zip zu groß, nichts Brauchbares im Zip …) und „Starten Sie jetzt Aufbauen“. „Alle aktualisieren“ startet diese Übernahme nie: sie bleibt ein Handgriff. Die Schaltfläche ist mit ihrem Grund ausgegraut, wenn der Starter dieses Rechners den Vorgang noch nicht kennt. Die Übernahme nimmt nur das vom Plan gezeigte Zip (Name und Größe): ist während der Frage ein anderes Zip eingetroffen, wird diese Quelle abgelehnt („die Datei hat sich seit dem Plan geändert“) und für sie nichts übernommen; „Plan erneut ausführen“ zeigt ihn neu. Ein Zip, dessen Name gegen die Regel verstößt (Buchstaben, Ziffern, Punkt, Bindestrich, Unterstrich, Leerzeichen, Klammern), wird vom Plan gezeigt, aber nie übernommen: seine Zeile sagt „Dateiname umbenennen: Buchstaben, Ziffern, . _ -“; bleibt nichts anderes zu übernehmen, wird keine Frage gestellt. Die openAIP-Exporte (in Downloads abgelegte GeoJSON- oder JSON-Dateien) sind kein Zip: Der Plan zeigt die Dateien einzeln („n Dateien (x KB), davon n von JSON nach GeoJSON umgewandelt“) und die Übernahme schickt genau zurück, was der Plan gezeigt hat. Ein Export, den die Suite nicht liest, wird genannt, nie übernommen: ein XML („wird nicht gelesen (XML-Format): exportieren Sie es auf openaip.net als GeoJSON oder JSON“) oder die „hot“-Ebene („wird nicht verwendet“). Bleibt nur das, wird keine Frage gestellt.

<a id="data-purge"></a>**Bereinigen.** Die Schaltfläche „Bereinigen“ entfernt vom Rechner die Rohquellen der angekreuzten Zonen (die man erneut herunterlädt) und ihre Zwischenspeicher. Sie berechnet zuerst den Plan, ohne etwas zu löschen, und stellt dann eine einzige Frage: „15 Dateien (14,3 MB) aus den Quellen von Spanien, Frankreich bereinigen?“. Gehören die SIA-Dateien (Frankreich) dazu, erinnert die Frage daran, dass sie beim Aufbau auch die Umrisse der anderen Zonen liefern; von git verfolgte Dateien bleiben immer erhalten und werden gezählt. Nein: nichts wird entfernt. Ja: das Bereinigen läuft und der Bildschirm sagt „Bereinigt: n Dateien, x MB“, mit den abgelehnten Pfaden (an Ort und Stelle belassen). Nichts zu entfernen: „Nichts zu bereinigen“, ohne Frage.

<a id="data-publish"></a>**Basis veröffentlichen.** Unter „Aufbauen“ sendet das Feld „Basis veröffentlichen“ das, was auf diesem Rechner erstellt wurde, an das Datenrepository. Eine erstellte Zone wird auf dem Rechner vollständig eingecheckt und geht auch bei der nächsten Synchronisation hinaus: „Veröffentlichen“ sendet sie sofort. Es sagt zuerst, wo der Rechner steht: „3 Dateien geändert · 2 Commits zu senden“, das Datum des letzten Durchlaufs und, falls vorhanden, die in data/ wartende Zusammenführung (die Veröffentlichung schließt sie zuerst ab). Tippen Sie auf „Veröffentlichen“: eine einzige Frage nennt die Dateien und die Commits, dann läuft der Durchlauf; ein endloser Balken zeigt, dass er arbeitet. Währenddessen sind die Schaltflächen des Feldes „Herunterladen, aufbauen, bereinigen“ ausgegraut, und „Veröffentlichen“ ist es während jedes Vorgangs dieses Feldes: ein Vorgang nach dem anderen. Schlägt die Veröffentlichung fehl, nennt der Bildschirm den Grund in den Worten des Piloten und den Schritt („Die Veröffentlichung ist fehlgeschlagen: der Server hat das Senden abgelehnt: eine Regel des Repositorys oder eine zu große Datei (Schritt Senden)“); nichts geht verloren, die Dateien bleiben auf dem Rechner. Gründe: Ablehnung durch den Server, inzwischen geändertes entferntes Repository, Git LFS, Anmeldung abgelehnt, Server nicht erreichbar, Konflikt, belegtes Repository, Zeitüberschreitung, Fehler des Starters; bei einem älteren Starter sagt der Bildschirm das, statt zu raten.

<a id="data-publish-end"></a>**Am Ende der Veröffentlichung.** Eine Benachrichtigung nennt die Zahlen, und das Ergebnis bleibt im Feld: was gesendet wurde (eingecheckte Dateien, empfangene Dateien); die Dateien der Basis, die auf dem Rechner bleiben, weil ein Aufbau lief; die Konflikte (die neueste Fassung bleibt, siehe Einstellungen › Konflikte); die abgelehnten Dateien, weil sie nicht das Format einer Datendatei haben. Ein Fehler wird in einem Satz gesagt, mit der Antwort des Starters: nichts geht verloren, die Dateien bleiben auf dem Rechner. Die Schaltfläche ist ausgegraut, ihr Grund steht darunter: „Der Starter des Rechners wird benötigt“, „Ein Aufbau läuft: veröffentlichen Sie, wenn er fertig ist“, „Nichts zu veröffentlichen“, „Der Rahmen kann die Basis noch nicht veröffentlichen: aktualisieren Sie die App“, „Offline“.

<a id="data-set-panels"></a>**Dieselben Schaltflächen für jede Gruppe.** Jede Gruppe hat ihr Feld „Herunterladen · Aufbauen · Bereinigen": die Luftfahrtdatenbank, die Verfahren, die VFR-Punkte der VAC-Karten (in der Gruppe Luftfahrtdatenbank, unter „Veröffentlichen") und die Luftfahrzeuge. Das Prinzip ist überall gleich: ein Vorgang zugleich, über alle Felder hinweg (er wird beim erneuten Öffnen wiedergefunden); eine Zeile je Element während des Laufs, ein Schlusssatz und eine Benachrichtigung, eine Zeile im Protokoll; „Bereinigen" berechnet zuerst einen Plan, ohne etwas zu löschen, und stellt dann eine einzige Frage. Verfahren: die Staaten ankreuzen, die gesammelt gelesen werden, Frankreich (eAIP des SIA) und die Vereinigten Staaten (CIFP der FAA); keiner ist vorab angekreuzt. Über EAD Basic gelesene Staaten werden nie gesammelt gelesen: ein Flugplatz nach dem anderen, mit „Erneut lesen“ in Treibstoff oder auf der Karte. VFR-Punkte: der gültige Zyklus, kein Kästchen; „Herunterladen“ holt die VAC-Karten des Zyklus („n Karten noch nicht veröffentlicht“ ist kein Fehler); „Aufbauen“ braucht zuerst die Frankreich-Basis dieses Zyklus, die heruntergeladenen Karten und pypdf (der Assistent der Ersteinrichtung installiert es) und meldet, wenn mangels Kürzel nichts committet wurde; „Bereinigen“ leert den Karten-Cache aller Zyklen. Luftfahrzeuge: ICAO-Muster, durch Kommas oder Leerzeichen getrennt (2 bis 4 Buchstaben oder Ziffern); ein abgelehnter Code wird gemeldet und nichts wird gesendet, ein leeres Feld bedeutet die Muster der Flotte; die Zeilen des Laufs sind die drei Schritte (Muster, Leistungsdaten, SimBrief-Profile). Das Wetter hat kein Feld: es wird mit der Website veröffentlicht. Eine ausgegraute Schaltfläche mit „Der Starter dieses Rechners kennt diesen Vorgang noch nicht": der Starter dieses Rechners ist älter als die App, aktualisieren Sie ihn. „Herunterladen" und „Bereinigen" committen nichts. „Aufbauen" committet seine Ergebnisse auf dem Rechner, außer bei den Luftfahrzeugen: der Ordner AircraftDB/ dieses Rechners ist nicht versioniert, gesendet wird über „Veröffentlichte Datenblätter". Solange in data/ eine Zusammenführung wartet, schreibt kein Aufbau und keine Veröffentlichung von Datenblättern etwas: der Bildschirm meldet „In data/ wartet eine Zusammenführung: synchronisieren Sie zuerst (Einstellungen › Synchronisierung)“. Während einer Aktualisierung der Suite startet kein Vorgang (Basis, andere Datensätze, Kette, Dateiübernahme, Datenblätter): der Bildschirm sagt „Aktualisierung der Suite läuft: versuchen Sie es nach dem Neustart des Starters erneut“; Zustand und Verfolgung eines bereits laufenden Auftrags gehen weiter.

<a id="data-aircraft-sheets"></a>**Die veröffentlichten Datenblätter der Fluggesellschaft.** Unter den Luftfahrzeugen kopiert „Veröffentlichen" die Datenblätter der Fluggesellschaft in das Datenrepository. Es berechnet zuerst einen Plan, ohne etwas zu ändern, und stellt dann eine einzige Frage (zu kopierende Datenblätter, zu entfernende Datenblätter, Gesamtgröße); wenn Sie zustimmen, geschehen Kopieren, Commit und Senden in einem Zug. Es braucht Ihr Kürzel (Einstellungen › Identität); ohne es meldet der Bildschirm das und nichts wird gesendet. Gibt es nichts zu kopieren oder zu entfernen: „Nichts zu veröffentlichen".

<a id="data-update-all"></a>**Alle aktualisieren.** Unter der Abdeckung macht die Schaltfläche „Alle aktualisieren (n Datensätze)“ in einem Zug neu, was die Felder gewählt haben: für jeden Datensatz, in der veröffentlichten Reihenfolge (die Luftfahrtdatenbank, die Verfahren, die VFR-Punkte, die Luftfahrzeuge), „Herunterladen“ und dann „Aufbauen“; nie eine Bereinigung, nie die veröffentlichten Datenblätter. Zuerst ein Plan und eine einzige Frage: der AIRAC-Zyklus, die Datensätze mit dem, was jeder berührt (Zonen, Staaten, Zyklus, Muster oder die Muster der Flotte), die Größe der Downloads (vorab nicht bekannt); ein Datensatz ohne Auswahl, mit abgelehnten Mustern oder dessen Vorgänge der Starter nicht kennt, wird mit seinem Grund übersprungen. Dann nennt eine Kettenzeile den Datensatz und den laufenden Schritt („2 / 4 Datensätze“) mit einem einzigen „Anhalten“ für die ganze Kette; die übrigen Schaltflächen sind ausgegraut. Die Kette hält beim ersten Fehler an (auch einem teilweisen), beim verlangten Anhalten oder wenn in data/ eine Zusammenführung wartet: was bereits erstellt ist, bleibt auf dem Rechner eingecheckt, nichts wird veröffentlicht, und der Bildschirm sagt, welcher Datensatz und warum. Ein Download ohne Neues („nichts herunterzuladen“, Karten noch nicht veröffentlicht) hält sie nicht an. Ist alles gelungen, geht eine einzige Veröffentlichung hinaus, ohne andere Frage als den Plan; ist sie unmöglich (der Rahmen kann nicht veröffentlichen, nichts zu senden), sagt es die Kette. Das Protokoll hält eine Zeile für die ganze Kette mit dem Ergebnis jedes Datensatzes; eine einzige Benachrichtigung am Ende. Wird die Seite unterwegs neu geladen, wird der laufende Auftrag des Starters wiedergefunden, die Kette aber läuft nicht weiter: „Kette durch das Neuladen unterbrochen: starten Sie „Alle aktualisieren“ erneut“. Ein Aufmerksamkeitspunkt markiert „Aufbauen“ der Basis und „Alle aktualisieren“, wenn der veröffentlichte Zyklus älter ist als der gültige („Zyklus 2610 überholt, für 2611 neu aufbauen“).

<a id="data-inventory"></a>**Das Dateninventar.** Unter den Gruppen sagt ein eingeklappter Block „Dateninventar“, was „data“ auf diesem Rechner umfasst: sieben Zeilen (das Datenrepository, der Ordner lokal am Rechner, die SIA-Rohquellen, die Kopie dieses Geräts, die Arbeitsordner der Suite, Downloads, die hinterlassenen Sicherungen), jede mit ihrer Größe, „verfolgt“, „lokal“ oder „außerhalb des Repositorys“ und wer sie schreibt. Er wird nur gelesen, wenn Sie ihn öffnen. Er liest keine Datei, verschiebt nichts, schreibt nichts; ohne Starter oder mit einem alten sagt er „Inventar nicht lesbar“. Mit einem Starter, der das kann, bietet er auch „Rohquellen ablegen“ an: Die rohen SIA-XML-Dateien aus data/sia/ kommen nach data/local/sources/sia/<cycle>/. Zuerst kommt der Plan (die Dateien und ihre Größe, nie ein Pfad), und nichts wird vor Ihrer Bestätigung verschoben; jede Datei wird kopiert, geprüft, dann die alte entfernt (behalten, wenn git sie verfolgt, nie für alle Rechner gelöscht). Das Ergebnis nennt die verschobenen, bereits vorhandenen, behaltenen und mit Grund abgelehnten Dateien; „Zurücklegen“ macht die Ablage auf demselben Weg rückgängig. Nichts geschieht, solange ein anderer Vorgang läuft oder eine Zusammenführung aussteht, noch von einem gekoppelten Gerät aus.

<a id="data-journal"></a>**Das Protokoll.** Am Ende des Bildschirms die letzten 50 Vorgänge dieses Geräts: UTC-Zeit, Verb, Zonen, Ergebnis.

## Sonderfälle

- **Ohne Starter**: Der Bildschirm wird genauso gelesen; er zeigt, was veröffentlicht ist.
- **Ein Lesevorgang schlägt fehl**: Der Abschnitt sagt es in einer Zeile, der Rest des Bildschirms wird gezeichnet.

<!-- fr: fff214fd28ba -->

<!-- chapter: aircraft -->
# Luftfahrzeuge

Die Flotte der Gesellschaft, so wie die anderen Bildschirme sie lesen: der Bericht (Kennzeichen → Typ, Rufzeichen), die Karte, das CPCO. Die Leistungsblätter sind im selben Bildschirm (Reiter „Datenblätter“); das Typenregister kommt noch.

## So geht's

<a id="aircraft-fleet"></a>**Die Flotte.** Eine Zeile pro Luftfahrzeug: Kennzeichen, Typ, Rufzeichen, Basis, „außer Dienst“, wenn es so ist. Die Suche filtert nach Kennzeichen, Typ, Rufzeichen oder Basis; sieben Zeilen werden gezeigt, „N weitere“ klappt den Rest aus. „Hinzufügen“ öffnet ein leeres Luftfahrzeug. Die Flotte ist die der unter Einstellungen › Fluggesellschaft gewählten Gesellschaft; ein Wechsel der Gesellschaft ändert die Liste, und ein hinzugefügtes Luftfahrzeug kommt in die Flotte dieser Gesellschaft.

<a id="aircraft-edit"></a>**Ein Luftfahrzeug ändern.** Ein Tippen auf eine Zeile öffnet es: Identität (Kennzeichen, Typ, Variante, Betreiber) und Betrieb (Rufzeichen durch Kommas getrennt, Basis, taktische Nummer, in Dienst). Unter den Feldern sagt eine Zeile, was sich ändern wird („2 Felder geändert: Basis, Rufzeichen“); „Speichern“ schreibt es. Ab zwei Zeichen (groß oder klein) schlägt das Feld Typ die Typen der Datenbank und die passenden Datenblätter vor („H145 · Airbus H145 · Datenblatt H145“); ein Tippen oder ↓ und dann Enter schreibt den Typcode. Ein Typ, den die Datenbank nicht kennt, wird so übernommen, und der Bildschirm sagt es. Das Kennzeichen ist der Schlüssel: zwei Luftfahrzeuge können es nicht teilen. Der Standort von der Website bleibt, wie er ist. „Ausmustern“ fragt, dann verlässt das Luftfahrzeug die Flotte; sein Leistungsblatt, falls vorhanden, bleibt erhalten.

<a id="aircraft-sheets"></a>**Die Datenblätter.** Der Reiter „Datenblätter“ listet die Leistungsblätter nach Familie (Hubschrauber, Turboprops, Strahlflugzeuge, Kolbenmotoren, Andere); die Suche filtert nach Name, Typ oder Kennzeichen. Jede Zeile sagt, woher das Blatt kommt, was ihm fehlt und sein Datum; ein Flottentyp ohne Datenblatt wird „zu ergänzen“ angeboten. „Datei importieren“ liest eine CSV, eine JSON, eine .lnmperf oder ein SimBrief-OFP; „Text einfügen“ liest einen eingefügten Text, auch eine ChatGPT-Antwort; „Neues Datenblatt“ fragt nach dem Typcode. Nichts wird sofort geschrieben: Ein Import zeigt zuerst Feld für Feld, was sich ändern würde; Abwählen, was Sie behalten, dann „Auswahl übernehmen“. Mehrere Datenblätter auf einmal: jede Vorschau nennt ihr Datenblatt und seinen Rang („3 / 13“), ein Datenblatt ohne Änderung wird von selbst übersprungen, „Dieses Datenblatt überspringen“ geht zum nächsten, ohne etwas zu schreiben, und am Ende steht die Bilanz; eine bereits geschriebene Notiz wird nur ersetzt, wenn Sie sie ankreuzen. Der gewählte Reiter bleibt auf dem Gerät gespeichert, und der Link `#aircraft?sheet=<id>` öffnet direkt den Editor eines Datenblatts.

<a id="aircraft-sheet-edit"></a>**Ein Datenblatt ändern.** „Bearbeiten“ öffnet den Editor: die Felder nach Gruppen (Identität, Kraftstoff, Piste und Ausweichflughafen, Steigflug, Reiseflug, Sinkflug, Drehzahl), die Tabelle Drehzahl / Verbrauch auf einem großen Bildschirm und die Ergänzung durch EUROCONTROL, „Aus anderem Datenblatt ergänzen…“ (eine Schaltfläche, die die Suche der Datenblätter öffnet, nichts im Voraus gewählt) oder „Mit ChatGPT vervollständigen“, das die Anfrage kopiert und ChatGPT in einem neuen Tab öffnet: dort die Anfrage einfügen, falls sie fehlt, dann die Antwort unter der Schaltfläche einfügen. „Kraftstoff als Volumen“ und „Kraftstoffdichte“ sind unter dem Feld erklärt; eine Dichte außerhalb von 0,5 bis 1,0 wird abgelehnt. Eine Tabelle Drehzahl / Verbrauch, deren Verbrauch sinkt, während die Drehzahl steigt, wird gemeldet (die Zeile orange, „Spanne falsch gelesen?“); nichts wird ohne Sie korrigiert. Ein Punkt „•“ am Ende der Beschriftung eines ausgefüllten Felds nennt beim Darüberfahren oder Antippen Herkunft und Datum („lnmperf · 28.10.“, „bearbeitet · 30.10.“) mit den verworfenen Werten; der Titel jeder Karte nennt ihre Quellen einmal („Quellen: V2-Basis · 28.10., bearbeitet · 30.10.“). „Speichern“ öffnet die Vorschau der Änderungen, die erst nach „Auswahl übernehmen“ geschrieben werden; jedes geänderte Feld behält so seine Quelle, und der alte Wert bleibt erhalten. „.lnmperf exportieren“ und „JSON exportieren“ laden das Datenblatt herunter; „Löschen“ fragt, bevor das Datenblatt aus der gemeinsamen Datenbank entfernt wird. Eine Höhe in der Spalte „ft“ ergibt eine eigene Kurve: die Zeilen dieser Höhe; sinkt ihr Verbrauch, während die Drehzahl steigt, sagt es eine Zeile mit der Höhe („… in 8000 ft: Spanne falsch gelesen?“) und markiert die Zeile, ohne etwas zu korrigieren. Unter der Tabelle liest „Aus den Messungen vorschlagen“ ein oder mehrere Fuel-Phase-Monitor-Protokolle (.csv, .csv.gz), die auf dem Gerät gewählt werden (sie werden weder behalten noch gesendet): die stabilen Reiseflugstufen des Typs des Datenblatts werden nach Höhe und Drehzahl aufgeführt, mit der Abweichung von der Kurve derselben Höhe („Datenblatt 40, Abweichung -5 %“) oder „neue Zeile“; die zu behaltenden ankreuzen, „Angekreuzte Zeilen in den Entwurf übernehmen“, dann „Speichern“ und „Anwenden“ wie bei jeder Änderung. Bei mehreren Höhen ist die Tabelle eine aufklappbare Gruppe je Höhe („8000 ft · 4 Drehzahlen“); jede Zeile hat außerdem eine optionale TAS (kt), die Kraftstoff liest, wenn zwei Zeilen die Reiseflugdrehzahl einrahmen. Am Arbeitsplatz listet „Aus dem Output-Ordner“ die Protokolle des Output-Ordners von X-Plane (einmal über „Output-Ordner festlegen“ eingestellt): ankreuzen, „Angekreuzte Protokolle lesen“, und die Stufen erscheinen ebenso. Am Kopf der Tabelle zeichnet „Kurven“ den Verbrauch über der Drehzahl, eine Farbe je Höhe mit Legende; die gemessenen Stufen kommen als Quadrate hinzu. Gemessener Steig- und Sinkflug haben dort je eine Zeile (Drehzahl, Verbrauch, Rate, Geschwindigkeit, Leistungshebel und der aktuelle Wert des Datenblatts): angekreuzt füllt sie den Steig- oder Sinkflug des Entwurfs. Die oberste Zeile des Editors bleibt sichtbar: der Name des Datenblatts und seine Einheit („lb · lb/h“); ein Tippen auf die Einheit führt zu ihrer Wahl. Die Stufen werden auf markante Flughöhen gelegt (bis 5.000 ft in 1.000er-Schritten, dann FL100, 150, 200 … 450: ein FL181 zählt als FL200); eine Höhe ohne Messung zwischen zwei gemessenen wird berechnet, ausgegraut und „extrapoliert“ genannt. Die übernommenen Messungen bleiben für eine spätere Berechnung auf dem Gerät, nie veröffentlicht.

<a id="aircraft-fuel-volume"></a>**Kraftstoff als Volumen.** Angekreuzt: Die Mengen dieses Datenblatts (nutzbar, Rollen, Reserve, Verbrauch) sind Volumen — Liter oder Gallonen, wie der Simulator sie anzeigt —, keine Massen; die Dichte unten rechnet sie in Kilogramm um.

<a id="aircraft-fuel-density"></a>**Dichte.** Kilogramm pro Liter des Kraftstoffs: Jet A-1 etwa 0,80, Avgas etwa 0,72. Sie hängt vom Kraftstoff ab, nicht vom Luftfahrzeug: leer lassen für den Wert der Gesellschaft (Einstellungen), sonst der typische. Zwischen 0,5 und 1,0.

**Kraftstoffeinheiten.** Oben im Editor bietet „Kraftstoff gelesen und eingegeben in“ kg, lb, l oder US gal (und kg/h, lb/h, l/h, gal/h für den Verbrauch); jedes Feld und die Tabelle Drehzahl / Verbrauch tragen die gewählte Einheit. Das Datenblatt behält seine Speichereinheit: eine Zeile nennt sie mit der verwendeten Dichte; ein eingegebener Wert wird beim Speichern umgerechnet, ein unberührter Wert ändert sich nicht.

## Gut zu wissen

- Das Modul Website aktualisiert die Flotte auch aus der eingefügten Seite „Flotte“ der Website: beide schreiben dieselbe Datei, jedes Speichern liest die Datei kurz vorher und ändert nur ein Luftfahrzeug.
- Nichts geht vor der nächsten Synchronisation hinaus.

<!-- fr: 4d2f04af9b1b -->

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
der Fahrplan (`#roadmap`, der sich auf „Prioritäten“ öffnet: drei Spalten, In Integration, In Entwicklung, Backlog, in die die Karten gezogen werden; „Nach Thema“ zeigt sie nach Bereich); die Abnahme (`#recette`): ein Funktionstest je gelieferte Karte mit „Bestanden“, „Abgelehnt“ und einem Kommentar (bei einer Ablehnung Pflicht), vom Starter in `organisation/RECETTE.json` geschrieben; ein bereits bekannter Fehler sagt „in Arbeit, nicht erneut testen“; und die Diagnose der Karte „Über“.

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

**Die Fluggesellschaft.** Auf der Stufe „Vollständig“ (oder über #settings?card=company) listet die Karte „Fluggesellschaft“ die Gesellschaften aus data/airline/index.json und „Persönlich“: Name, Code, Netzwerke (IVAO, VATSIM, offline) und Zahl der Luftfahrzeuge der Flotte. Die Karte heißt „Fluggesellschaft dieses Geräts“: eine Liste mit Optionsfeldern, eine Zeile je Gesellschaft (Name, Code, die Art in Worten — „Kommerziell“, „SO-Staffel“ oder „Persönlich“ —, Netzwerke und Flotte). Ein Tippen auf eine Zeile macht sie zur aktuellen Gesellschaft dieses Geräts (die Wahl gilt pro Gerät): nur die Optionsfelder ändern sich, die Liste wird nicht neu gezeichnet. Solange der Rahmen diese Wahl noch nicht speichern kann, sind die Felder grau, und die Karte sagt es. Darunter das Blatt der gewählten Gesellschaft (die anderen haben keins), aufgeklappt: die **Art** (zwei Optionsfelder, je ein Satz) und die **Missionskategorien**, sichtbar. Danach drei Handgriffe in dieser Reihenfolge: „Fluggesellschaft anlegen“ öffnet einen **Assistenten auf demselben Bildschirm**: der Schritt **Identität** (der Name; der Code, nach dem Namen vorgeschlagen und änderbar, 2 bis 8 Kleinbuchstaben oder Ziffern, nie schon vergeben; die **Art**, Kommerziell oder SO-Staffel, Kommerziell vorgewählt; die Netzwerke), dann der Schritt **Flugkategorien** (die der Art, vorab angekreuzt: entfernen Sie, was Sie nicht fliegen; eigene mit „Kategorie hinzufügen“; für die Kategorien wird nichts geschrieben, wenn Sie nichts anfassen), dann der Schritt **Flotte** („Flotte · 2 Luftfahrzeuge“: einen Typ in der Datenblatt-Basis suchen, das Kennzeichen tippen, „Luftfahrzeug hinzufügen“; „Entfernen“; „Später“, wenn Sie die Luftfahrzeuge lieber unter Luftfahrzeuge hinzufügen), dann die **Zusammenfassung** in Worten („Rennes Motoculture · Kommerziell · IVAO · 7 Kategorien · 2 Luftfahrzeuge“). „Zurück“ behält alles Eingegebene. **Vor „Fluggesellschaft anlegen“ wird nichts geschrieben**: dann die Einstellungen, die (leere) Flotte und zuletzt der Eintrag in der Liste (eine Gesellschaft steht nur vollständig in der Liste); eine vorhandene Datei wird nie überschrieben. Wird das Anlegen unterbrochen, sagt die Meldung, was erledigt ist, und „Fortsetzen“ beendet es, ohne etwas zu überschreiben. Am Ende wählt „Für diese Gesellschaft fliegen“ sie aus und öffnet Missionen. Höchstens zwanzig Gesellschaften; alles, was aus data/airline/ gelesen wird, gilt als nicht vertrauenswürdiger Text. „Einer Fluggesellschaft beitreten“ ist noch nicht verfügbar (es liest die Adresse der Flottenseite). Auf dem Rechner des Launchers bietet die Karte, solange Ihre Gesellschaft noch im Stammordner von data/airline/ liegt, die **Migration** an: ein optionaler Code (nach dem Namen vorgeschlagen), „Anzeigen, was geschähe“ (der Name, der Ordner data/airline/<code>/, die Dateien und ihre Größe, die dort leere Flotte), dann „Nach „<code>“ migrieren“. Nichts wird gelöscht oder überschrieben: Die jetzigen Dateien bleiben als Kopie liegen. Im Blatt: Ohne Art gehört die Gruppe „Kommerziell“ (Fracht, Passagiere, VIP, Training, Transit, Testflüge, Überführung) nicht zu den Kategorien, und das Blatt bittet, die Art zu wählen; eine Staffel hat sie ebenfalls nicht. Mit „Kategorie hinzufügen“ fügen Sie die eigenen Kategorien der Gesellschaft (Gruppe „Ihre Kategorien“) hinzu oder entfernen sie; die Gruppe der Suite lässt sich nicht ändern, ein schon vergebener Name wird abgelehnt. „Persönlich“ (von Natur aus kommerziell) hat nichts einzustellen.
