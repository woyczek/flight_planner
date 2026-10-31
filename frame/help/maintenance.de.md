<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Wartung — Handbuch

Die Anwendung Wartung ist für den Administrator der Fluggesellschaft: die Daten, die sie für die Piloten veröffentlicht
(Modul Daten), die Flotte und ihre Leistungsdatenblätter (Modul Luftfahrzeuge) und die Verwaltung der Suite
(Einstellungen, Karte Verwaltung). Sie öffnet sich auf der Stufe Vollständig. Mit dem Starter des Rechners schreibt sie;
ohne Starter oder von einem gekoppelten Gerät aus ist sie nur lesbar.

## Erster Start

- **Die Einträge.** Auf einem Telefon bietet die untere Leiste Daten, Verwaltung und Hilfe: Die Kopfzeile wiederholt sie
  nicht. Auf einem Bildschirm sind es die Einträge der linken Spalte, mit den Dienstseiten des Rechners (Token der
  Piloten, Geräte, Wartungsseite V2). Der Name der Anwendung oben links öffnet die Liste der Anwendungen: Ein Tippen
  wechselt zu Pilot.
- **Die Hilfe.** Sie öffnet sich beim Kapitel des angezeigten Bildschirms; dieses Handbuch behandelt nur Wartung, das von
  Pilot bleibt in Pilot.
- **Der Status der Anwendung.** Der Punkt am Eintrag Verwaltung (grün: etwas Neues; orange: etwas braucht Ihre
  Aufmerksamkeit) führt zum Block „Status“ oben in den Einstellungen.

<!-- chapter: data -->
# Daten

Was die Fluggesellschaft für die App veröffentlicht — die Luftfahrtdatenbank, die Verfahren, die Luftfahrzeuge, das Wetter — und der Stand jedes Datensatzes. Dieser Bildschirm dient dem Lesen und bietet Aktionen für jede Gruppe: die Quellen herunterladen, aufbauen, bereinigen, dann veröffentlichen.

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

<a id="data-zone-map"></a>**Die Karte der anzukreuzenden Zonen.** Über der Liste der Zonen (Basisfeld) und der Staaten (Verfahrensfeld: Frankreich und die Vereinigten Staaten) zeichnet eine Karte die Umrisse: Antippen einer Zone kreuzt sie an oder ab, genau wie ihr Kästchen in der Liste (eine einzige Auswahl: Karte und Liste werden beide aus ihr neu gezeichnet). Mit der Tastatur erreicht Tab jede Zone, Leertaste oder Eingabe kreuzt sie an. Jede Zone nennt Namen und Zustand in Worten („Frankreich — Zyklus überholt oder fehlend, angekreuzt“); die Farbe folgt dem Zustand (aktuell, Zyklus überholt oder fehlend, läuft, nicht in der Abdeckung: die Legende unter der Karte nennt sie), steht aber nie allein: eine angekreuzte Zone hat einen dicken Rand und eine volle Tönung. Wäre eine Zone bei der Bildschirmbreite zu klein für den Finger (unter 44 px), wie oft auf einem Telefon, wird die Karte nicht gezeichnet und die Liste bleibt allein; ebenso, wenn der Rahmen die Umrisse nicht liefert. Während eines Vorgangs ist die Karte wie die Liste eingefroren. Ein Umriss, der nur der Rahmen der Zone ist, wird gestrichelt gezeichnet und nennt sich „ungefährer Umriss“; die Legende erinnert daran.

<a id="data-pickup"></a>**Heruntergeladene Datei übernehmen.** Manche Quellen laden sich nicht von selbst herunter (der SIA für Frankreich, NATS für das Vereinigte Königreich): Sie laden sie in Ihrem Browser herunter, dann sucht „Heruntergeladene Datei übernehmen“ (die zweite Schaltfläche des Basisfelds und unter der Zeile „von Hand abzulegen“ eines Downloads) im Ordner Downloads des Rechners das neueste Zip mit dem erwarteten Namen (zum Beispiel EG_*_DS_*_XML.zip). Zuerst der Plan und eine einzige Frage: für jede Zone das gefundene Zip (Name, Anzahl der Dateien, Größe), was fehlt (mit dem erwarteten Namen), wohin die Dateien kommen (data/sia/, data/sia/zones/gb/); es sind Rohquellen dieses Rechners, nie committet. Nichts gefunden: keine Frage, der Bildschirm sagt, was fehlt. Am Ende: „Übernommen: n Dateien (x MB)“, die Fehler benannt (Zip zu groß, nichts Brauchbares im Zip …) und „Starten Sie jetzt Aufbauen“. „Alle aktualisieren“ startet diese Übernahme nie: sie bleibt ein Handgriff. Die Schaltfläche ist mit ihrem Grund ausgegraut, wenn der Starter dieses Rechners den Vorgang noch nicht kennt. Die Übernahme nimmt nur das vom Plan gezeigte Zip (Name und Größe): ist während der Frage ein anderes Zip eingetroffen, wird diese Quelle abgelehnt („die Datei hat sich seit dem Plan geändert“) und für sie nichts übernommen; „Plan erneut ausführen“ zeigt ihn neu. Ein Zip, dessen Name gegen die Regel verstößt (Buchstaben, Ziffern, Punkt, Bindestrich, Unterstrich, Leerzeichen, Klammern), wird vom Plan gezeigt, aber nie übernommen: seine Zeile sagt „Dateiname umbenennen: Buchstaben, Ziffern, . _ -“; bleibt nichts anderes zu übernehmen, wird keine Frage gestellt.

<a id="data-purge"></a>**Bereinigen.** Die Schaltfläche „Bereinigen“ entfernt vom Rechner die Rohquellen der angekreuzten Zonen (die man erneut herunterlädt) und ihre Zwischenspeicher. Sie berechnet zuerst den Plan, ohne etwas zu löschen, und stellt dann eine einzige Frage: „15 Dateien (14,3 MB) aus den Quellen von Spanien, Frankreich bereinigen?“. Gehören die SIA-Dateien (Frankreich) dazu, erinnert die Frage daran, dass sie beim Aufbau auch die Umrisse der anderen Zonen liefern; von git verfolgte Dateien bleiben immer erhalten und werden gezählt. Nein: nichts wird entfernt. Ja: das Bereinigen läuft und der Bildschirm sagt „Bereinigt: n Dateien, x MB“, mit den abgelehnten Pfaden (an Ort und Stelle belassen). Nichts zu entfernen: „Nichts zu bereinigen“, ohne Frage.

<a id="data-publish"></a>**Basis veröffentlichen.** Unter „Aufbauen“ sendet das Feld „Basis veröffentlichen“ das, was auf diesem Rechner erstellt wurde, an das Datenrepository. Eine erstellte Zone wird auf dem Rechner vollständig eingecheckt und geht auch bei der nächsten Synchronisation hinaus: „Veröffentlichen“ sendet sie sofort. Es sagt zuerst, wo der Rechner steht: „3 Dateien geändert · 2 Commits zu senden“, das Datum des letzten Durchlaufs und, falls vorhanden, die in data/ wartende Zusammenführung (die Veröffentlichung schließt sie zuerst ab). Tippen Sie auf „Veröffentlichen“: eine einzige Frage nennt die Dateien und die Commits, dann läuft der Durchlauf; ein endloser Balken zeigt, dass er arbeitet. Währenddessen sind die Schaltflächen des Feldes „Herunterladen, aufbauen, bereinigen“ ausgegraut, und „Veröffentlichen“ ist es während jedes Vorgangs dieses Feldes: ein Vorgang nach dem anderen.

<a id="data-publish-end"></a>**Am Ende der Veröffentlichung.** Eine Benachrichtigung nennt die Zahlen, und das Ergebnis bleibt im Feld: was gesendet wurde (eingecheckte Dateien, empfangene Dateien); die Dateien der Basis, die auf dem Rechner bleiben, weil ein Aufbau lief; die Konflikte (die neueste Fassung bleibt, siehe Einstellungen › Konflikte); die abgelehnten Dateien, weil sie nicht das Format einer Datendatei haben. Ein Fehler wird in einem Satz gesagt, mit der Antwort des Starters: nichts geht verloren, die Dateien bleiben auf dem Rechner. Die Schaltfläche ist ausgegraut, ihr Grund steht darunter: „Der Starter des Rechners wird benötigt“, „Ein Aufbau läuft: veröffentlichen Sie, wenn er fertig ist“, „Nichts zu veröffentlichen“, „Der Rahmen kann die Basis noch nicht veröffentlichen: aktualisieren Sie die App“, „Offline“.

<a id="data-set-panels"></a>**Dieselben Schaltflächen für jede Gruppe.** Jede Gruppe hat ihr Feld „Herunterladen · Aufbauen · Bereinigen": die Luftfahrtdatenbank, die Verfahren, die VFR-Punkte der VAC-Karten (in der Gruppe Luftfahrtdatenbank, unter „Veröffentlichen") und die Luftfahrzeuge. Das Prinzip ist überall gleich: ein Vorgang zugleich, über alle Felder hinweg (er wird beim erneuten Öffnen wiedergefunden); eine Zeile je Element während des Laufs, ein Schlusssatz und eine Benachrichtigung, eine Zeile im Protokoll; „Bereinigen" berechnet zuerst einen Plan, ohne etwas zu löschen, und stellt dann eine einzige Frage. Verfahren: die Staaten ankreuzen, die gesammelt gelesen werden, Frankreich (eAIP des SIA) und die Vereinigten Staaten (CIFP der FAA); keiner ist vorab angekreuzt. Über EAD Basic gelesene Staaten werden nie gesammelt gelesen: ein Flugplatz nach dem anderen, mit „Erneut lesen“ in Treibstoff oder auf der Karte. VFR-Punkte: der gültige Zyklus, kein Kästchen; „Herunterladen“ holt die VAC-Karten des Zyklus („n Karten noch nicht veröffentlicht“ ist kein Fehler); „Aufbauen“ braucht zuerst die Frankreich-Basis dieses Zyklus, die heruntergeladenen Karten und pypdf (der Assistent der Ersteinrichtung installiert es) und meldet, wenn mangels Kürzel nichts committet wurde; „Bereinigen“ leert den Karten-Cache aller Zyklen. Luftfahrzeuge: ICAO-Muster, durch Kommas oder Leerzeichen getrennt (2 bis 4 Buchstaben oder Ziffern); ein abgelehnter Code wird gemeldet und nichts wird gesendet, ein leeres Feld bedeutet die Muster der Flotte; die Zeilen des Laufs sind die drei Schritte (Muster, Leistungsdaten, SimBrief-Profile). Das Wetter hat kein Feld: es wird mit der Website veröffentlicht. Eine ausgegraute Schaltfläche mit „Der Starter dieses Rechners kennt diesen Vorgang noch nicht": der Starter dieses Rechners ist älter als die App, aktualisieren Sie ihn. „Herunterladen" und „Bereinigen" committen nichts. „Aufbauen" committet seine Ergebnisse auf dem Rechner, außer bei den Luftfahrzeugen: der Ordner AircraftDB/ dieses Rechners ist nicht versioniert, gesendet wird über „Veröffentlichte Datenblätter". Solange in data/ eine Zusammenführung wartet, schreibt kein Aufbau und keine Veröffentlichung von Datenblättern etwas: der Bildschirm meldet „In data/ wartet eine Zusammenführung: synchronisieren Sie zuerst (Einstellungen › Synchronisierung)“. Während einer Aktualisierung der Suite startet kein Vorgang (Basis, andere Datensätze, Kette, Dateiübernahme, Datenblätter): der Bildschirm sagt „Aktualisierung der Suite läuft: versuchen Sie es nach dem Neustart des Starters erneut“; Zustand und Verfolgung eines bereits laufenden Auftrags gehen weiter.

<a id="data-aircraft-sheets"></a>**Die veröffentlichten Datenblätter der Fluggesellschaft.** Unter den Luftfahrzeugen kopiert „Veröffentlichen" die Datenblätter der Fluggesellschaft in das Datenrepository. Es berechnet zuerst einen Plan, ohne etwas zu ändern, und stellt dann eine einzige Frage (zu kopierende Datenblätter, zu entfernende Datenblätter, Gesamtgröße); wenn Sie zustimmen, geschehen Kopieren, Commit und Senden in einem Zug. Es braucht Ihr Kürzel (Einstellungen › Identität); ohne es meldet der Bildschirm das und nichts wird gesendet. Gibt es nichts zu kopieren oder zu entfernen: „Nichts zu veröffentlichen".

<a id="data-update-all"></a>**Alle aktualisieren.** Unter der Abdeckung macht die Schaltfläche „Alle aktualisieren (n Datensätze)“ in einem Zug neu, was die Felder gewählt haben: für jeden Datensatz, in der veröffentlichten Reihenfolge (die Luftfahrtdatenbank, die Verfahren, die VFR-Punkte, die Luftfahrzeuge), „Herunterladen“ und dann „Aufbauen“; nie eine Bereinigung, nie die veröffentlichten Datenblätter. Zuerst ein Plan und eine einzige Frage: der AIRAC-Zyklus, die Datensätze mit dem, was jeder berührt (Zonen, Staaten, Zyklus, Muster oder die Muster der Flotte), die Größe der Downloads (vorab nicht bekannt); ein Datensatz ohne Auswahl, mit abgelehnten Mustern oder dessen Vorgänge der Starter nicht kennt, wird mit seinem Grund übersprungen. Dann nennt eine Kettenzeile den Datensatz und den laufenden Schritt („2 / 4 Datensätze“) mit einem einzigen „Anhalten“ für die ganze Kette; die übrigen Schaltflächen sind ausgegraut. Die Kette hält beim ersten Fehler an (auch einem teilweisen), beim verlangten Anhalten oder wenn in data/ eine Zusammenführung wartet: was bereits erstellt ist, bleibt auf dem Rechner eingecheckt, nichts wird veröffentlicht, und der Bildschirm sagt, welcher Datensatz und warum. Ein Download ohne Neues („nichts herunterzuladen“, Karten noch nicht veröffentlicht) hält sie nicht an. Ist alles gelungen, geht eine einzige Veröffentlichung hinaus, ohne andere Frage als den Plan; ist sie unmöglich (der Rahmen kann nicht veröffentlichen, nichts zu senden), sagt es die Kette. Das Protokoll hält eine Zeile für die ganze Kette mit dem Ergebnis jedes Datensatzes; eine einzige Benachrichtigung am Ende. Wird die Seite unterwegs neu geladen, wird der laufende Auftrag des Starters wiedergefunden, die Kette aber läuft nicht weiter: „Kette durch das Neuladen unterbrochen: starten Sie „Alle aktualisieren“ erneut“. Ein Aufmerksamkeitspunkt markiert „Aufbauen“ der Basis und „Alle aktualisieren“, wenn der veröffentlichte Zyklus älter ist als der gültige („Zyklus 2610 überholt, für 2611 neu aufbauen“).

<a id="data-journal"></a>**Das Protokoll.** Am Ende des Bildschirms die letzten 50 Vorgänge dieses Geräts: UTC-Zeit, Verb, Zonen, Ergebnis.

## Sonderfälle

- **Ohne Starter**: Der Bildschirm wird genauso gelesen; er zeigt, was veröffentlicht ist.
- **Ein Lesevorgang schlägt fehl**: Der Abschnitt sagt es in einer Zeile, der Rest des Bildschirms wird gezeichnet.

<!-- fr: d9a8353e329c -->

<!-- chapter: aircraft -->
# Luftfahrzeuge

Die Flotte der Gesellschaft, so wie die anderen Bildschirme sie lesen: der Bericht (Kennzeichen → Typ, Rufzeichen), die Karte, das CPCO. Die Leistungsblätter sind im selben Bildschirm (Reiter „Datenblätter“); das Typenregister kommt noch.

## So geht's

<a id="aircraft-fleet"></a>**Die Flotte.** Eine Zeile pro Luftfahrzeug: Kennzeichen, Typ, Rufzeichen, Basis, „außer Dienst“, wenn es so ist. Die Suche filtert nach Kennzeichen, Typ, Rufzeichen oder Basis; sieben Zeilen werden gezeigt, „N weitere“ klappt den Rest aus. „Hinzufügen“ öffnet ein leeres Luftfahrzeug.

<a id="aircraft-edit"></a>**Ein Luftfahrzeug ändern.** Ein Tippen auf eine Zeile öffnet es: Identität (Kennzeichen, Typ, Variante, Betreiber) und Betrieb (Rufzeichen durch Kommas getrennt, Basis, taktische Nummer, in Dienst). Unter den Feldern sagt eine Zeile, was sich ändern wird („2 Felder geändert: Basis, Rufzeichen“); „Speichern“ schreibt es. Ein Typ, den die Datenbank nicht kennt, wird so übernommen, und der Bildschirm sagt es. Das Kennzeichen ist der Schlüssel: zwei Luftfahrzeuge können es nicht teilen. Der Standort von der Website bleibt, wie er ist. „Ausmustern“ fragt, dann verlässt das Luftfahrzeug die Flotte; sein Leistungsblatt, falls vorhanden, bleibt erhalten.

<a id="aircraft-sheets"></a>**Die Datenblätter.** Der Reiter „Datenblätter“ listet die Leistungsblätter nach Familie (Hubschrauber, Turboprops, Strahlflugzeuge, Kolbenmotoren, Andere); die Suche filtert nach Name, Typ oder Kennzeichen. Jede Zeile sagt, woher das Blatt kommt, was ihm fehlt und sein Datum; ein Flottentyp ohne Datenblatt wird „zu ergänzen“ angeboten. „Datei importieren“ liest eine CSV, eine JSON, eine .lnmperf oder ein SimBrief-OFP; „Text einfügen“ liest einen eingefügten Text, auch eine ChatGPT-Antwort; „Neues Datenblatt“ fragt nach dem Typcode. Nichts wird sofort geschrieben: Ein Import zeigt zuerst Feld für Feld, was sich ändern würde; Abwählen, was Sie behalten, dann „Auswahl übernehmen“. Der gewählte Reiter bleibt auf dem Gerät gespeichert, und der Link `#aircraft?sheet=<id>` öffnet direkt den Editor eines Datenblatts.

<a id="aircraft-sheet-edit"></a>**Ein Datenblatt ändern.** „Bearbeiten“ öffnet den Editor: die Felder nach Gruppen (Identität, Kraftstoff, Piste und Ausweichflughafen, Steigflug, Reiseflug, Sinkflug, Drehzahl), die Tabelle Drehzahl / Verbrauch auf einem großen Bildschirm und die Ergänzung durch EUROCONTROL, „aus anderem Datenblatt ergänzen“ oder die Anfrage an ChatGPT für die leeren Felder. Unter jedem ausgefüllten Feld nennt eine graue Zeile Herkunft und Datum („lnmperf · 28.10.“, „bearbeitet · 30.10.“); darüberfahren zeigt die verworfenen Werte. „Speichern“ öffnet die Vorschau der Änderungen, die erst nach „Auswahl übernehmen“ geschrieben werden; jedes geänderte Feld behält so seine Quelle, und der alte Wert bleibt erhalten. „.lnmperf exportieren“ und „JSON exportieren“ laden das Datenblatt herunter; „Löschen“ fragt, bevor das Datenblatt aus der gemeinsamen Datenbank entfernt wird.

## Gut zu wissen

- Das Modul Website aktualisiert die Flotte auch aus der eingefügten Seite „Flotte“ der Website: beide schreiben dieselbe Datei, jedes Speichern liest die Datei kurz vorher und ändert nur ein Luftfahrzeug.
- Nichts geht vor der nächsten Synchronisation hinaus.

<!-- fr: 6c68e01d8018 -->

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
für data/“).

**Ohne Zugang und ohne Starter keine Basen.** Ein Gerät ohne eingestellten Zugang und ohne Starter — etwa die Website,
zum ersten Mal auf einem Telefon geöffnet — hat weder die Luftfahrtdatenbasis (Lufträume, Flugplätze, Funkfeuer) noch
die Flugzeugbasis: „Offline-Daten“ sagt es. Zwei Wege: Stellen Sie den Zugang zum Datenrepository ein, auch ohne
Austausch anzukreuzen (er liest dann nur die Basen); oder veröffentlichen Sie auf einem Rechner mit Starter die Basen im
Repository (V2: Einstellungen › Wartung › Luftfahrtdaten und Luftfahrzeugtypen), dann synchronisieren. Drei getrennte Zustände, wenn die Basis fehlt: „Luftfahrtdatenbank wird geladen…“ (das Lesen ist nicht beendet: warten), „Datenzugriff auf diesem Gerät nicht eingerichtet“ (Zugang oben einrichten; eine zum Home-Bildschirm hinzugefügte App hat ihren eigenen Speicher, nichts aus Safari ist dort) und „Luftfahrtdatenbank nicht veröffentlicht“ (der Zugang funktioniert, im Repository ist nichts veröffentlicht).

**Die Synchronisation.** Mit angekreuztem Austausch zeigt die Karte „Synchronisation“ den letzten Erfolg, die
ausstehenden Änderungen und das Netz; „Jetzt synchronisieren“ sendet und empfängt sofort. Sonst läuft sie von selbst
beim Start, alle 10 Minuten online und bei Rückkehr des Netzes. Solange Änderungen ausstehen, listet die Karte sie auf,
die neuesten zuerst: Pfad, Modul und Uhrzeit, ✕ für eine Löschung, mit dem letzten Fehler, falls es einen gibt.

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

**Die Konfiguration vorbereiten (Administrator).** Tippen Sie auf einem vom Starter bedienten Rechner oder auf einem
für GitHub eingerichteten Gerät auf der Stufe „Vollständig“ in der Karte „Verwaltung“ auf „Konfiguration für einen Piloten exportieren“: Sie nennt
Ihre Schritte der Reihe nach. Laden Sie zuerst den GitHub-Namen des Piloten mit der Rolle Write in das Repository ein
(der Link führt zur Seite der Mitwirkenden des Repositorys). Geben Sie dann sein Kürzel und die Adresse der
veröffentlichten App ein, dann „Datei und Link erstellen“: Die Datei sog-config-<TRI>.json wird gespeichert, der Link
und sein QR-Code werden angezeigt. Sie enthalten die Fluggesellschaft, das Datenrepository, das Kürzel und die Anleitung
für das Token, nie ein Token oder Geheimnis; der Eigentümer des Repositorys (Benutzer oder Organisation) ist darin
vermerkt und bestimmt, welches Token zu erstellen ist. Senden Sie den Link oder die Datei, oder lassen Sie das Telefon
des Piloten den QR-Code scannen.

**Der Fluggesellschaft beitreten (Pilot).** Der Link, der QR-Code, „Konfiguration importieren…“ oder „Der
Fluggesellschaft beitreten…“ (Karte „Datenzugang“) und die Begrüßungskarte beim ersten Öffnen öffnen den Assistenten
„Der Fluggesellschaft beitreten“, ein Bildschirm pro Schritt: die erhaltene Konfiguration; das Konto (bei Bedarf mit dem
Registrierungslink erstellen) und der Benutzername; die anzunehmende Einladung; das Token, Schritt für Schritt
(klassisch für das Repository eines Benutzers, feingranular für das einer Organisation); das eingefügte und getestete
Token; die Netzwerk-IDs; zuletzt „Abschließen und synchronisieren“, dann die Offline-Daten. Angekreuzte Kästchen bleiben
auf dem Gerät: Eine Karte der Einstellungen bietet an, dort fortzusetzen, wo Sie waren. Das Tutorial „Der
Fluggesellschaft beitreten“ folgt denselben Schritten.

**Nicht mehr als die Datei.** Nur was die Konfiguration enthält, wird eingerichtet, und der Zugang wird erst
gespeichert, wenn das Token getestet ist; „Testen“ sagt, was nicht stimmt: Einladung noch nicht angenommen, Token falsch
kopiert oder abgelaufen, Token ohne Recht auf den Inhalt. Ein klassisches Token öffnet alle Repositorys des Kontos: Für
das Repository eines Benutzers wird ein eigenes GitHub-Konto nur für das Fliegen empfohlen. Eine Datei in einem anderen
Format wird mit einer Meldung abgelehnt. Die Fluggesellschaft wird nur ins Repository geschrieben, wenn es noch keine
hat. Auf einem Rechner, dessen data/ diesem Repository bereits folgt, überspringt der Assistent Konto und Token. Ohne
Starter erreicht die App ein GitHub-Repository oder ein Projekt auf einer GitLab-Instanz (gitlab.com, framagit…): Fügen
Sie die Adresse des Projekts (https://gitlab.com/gruppe/projekt) und das Projektzugangstoken ein, das der Administrator
Ihnen gegeben hat; das Token wird nur an diese Instanz gesendet. Ist die empfangene Konfiguration oder der Zugang des Geräts ein GitLab-Projekt, erwartet die Karte „Datenzugang“ die Adresse des Projekts und beschreibt das Projekt-Token (Rolle Developer, `write_repository`).

## Verwaltung

**Die Verwaltungsseiten.** Auf der Stufe „Vollständig“ (Karte „Stufe“) sammelt die Karte „Verwaltung“ unter „Über“ die
Verwaltungs- und Testseiten, **eine Schaltfläche pro Seite**, jede mit einem Satz; auf den anderen Stufen erscheint sie nicht, und nichts vom Administrator steht auf den anderen Karten. In der App: die Schaltfläche
„Abstimmung der Kartenschwellen“ (`#maps?tune=1`, auf einem Telefon nur lesbar; sie öffnet die Abstimmungsseite: für jedes Kartenelement und jeden Modus die Zoomstufen, in denen es erscheint, für die Fluggesellschaft gespeichert, `airline/map_profiles.json`; ein Modus, den Sie nie gespeichert haben, übernimmt die Schwellen eines abgestimmten Modus, die Seite sagt es; der Regler „Komplexität“ der Karte verschiebt nur den Zoom), zurück mit dem Zurück-Pfeil; die Schaltfläche „Grenze der Flugzone“, die ein Kästchen
„Linie der Flugzonengrenze anzeigen“ aufklappt (sofort für die Fluggesellschaft gespeichert, mit den Schwellen, in `airline/map_profiles.json`,
Schlüssel `edge`; die Linie wird angezeigt, bis Sie etwas einstellen); die Schaltfläche „Pistenschwellen auf der Karte“, die eine Liste von 8 bis 16 aufklappt: die Zoomstufe, ab der die Karte die Pistenschwellen zeichnet (sofort für die Fluggesellschaft gespeichert, dieselbe Datei, Schlüssel `runwayZoom`; 11, bis Sie etwas einstellen); die Schaltfläche „Konfiguration für einen Piloten exportieren“ (siehe „Einen Piloten einrichten“); auf einem vom
Starter bedienten Rechner die Schaltflächen „Entferntes Repository von data/“ und „API-Schlüssel der Fluggesellschaft
(IVAO, EAD Basic)“, die ihre Einstellung aufklappen (siehe „Ein Git-Repository für data/“ und „Die API-Schlüssel der
Fluggesellschaft“);
der Fahrplan (`#roadmap`) und die Diagnose der Karte „Über“.

<a id="settings-sources"></a>**Datenquellen.** Die Taste „Datenquellen“ (`#sources`, Stufe Vollständig) listet die Quellen der Luftfahrtdaten, die die Suite nutzt, erwägt oder zurückgestellt hat: für jede, was sie liefert, ihre Lizenz, ihren Status und einen Link, der sich in einem neuen Tab öffnet; für die, die sich mit jedem AIRAC-Zyklus ändern (SIA, VAC, eAIP, CIFP), ist der Link der des gültigen Zyklus, oben auf dem Bildschirm angegeben. Der Bildschirm lädt nichts herunter. Unter der Taste der Verwaltungskarte die absolute Adresse des Bildschirms, zum Öffnen oder als Lesezeichen („Link kopieren“). Er ersetzt das Daten-Labor, das am 28. Oktober 2026 entfernt wurde.

**Die Prüfstände, auf einem Rechner.** Vom Starter bedient, öffnen sie sich nur auf einem Rechner mit Starter (anderswo
werden sie ohne Link genannt); Pfade relativ zur Wurzel der Suite: `labs/design_primitives.html` (Primitive und
Designs), `frame/aerodb/bench.html` und `frame/aerodb/offline_bench.html` (Luftfahrtbasis, online und offline),
`frame/store/test/` (Datenschicht, gegen das falsche GitHub) und `modules/maps/test/render.html` (Kartendarstellung).

**Die V2-Seiten des Rechners.** Nur gezeigt, wenn ein Starter die Seite bedient: Einstellungen › Wartung
(`apps/settings/maintenance.html`), Erster Start (`apps/settings/premier_lancement.html`) und das Kartenstudio
(`apps/cpco/map_parser.html`).

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
  ein Projektzugangstoken je Pilot (nach seinem Kürzel benannt, Rolle Developer, höchstens ein Jahr), zeigt es nur einmal
  und widerruft es. Der Starter verwendet dafür das Token des Administrators (secrets/gitlab.json), das er nie zeigt.
  Stellen Sie den Datenzweig so ein, dass die Rolle Developer dorthin pushen darf.
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

<!-- fr: d5070361a48e -->
