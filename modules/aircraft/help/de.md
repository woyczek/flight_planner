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
