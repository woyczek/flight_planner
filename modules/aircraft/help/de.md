# Luftfahrzeuge

Die Flotte der Gesellschaft, so wie die anderen Bildschirme sie lesen: der Bericht (Kennzeichen → Typ, Rufzeichen), die Karte, das CPCO. Die Leistungsblätter und das Typenregister kommen in denselben Bildschirm.

## So geht's

<a id="aircraft-fleet"></a>**Die Flotte.** Eine Zeile pro Luftfahrzeug: Kennzeichen, Typ, Rufzeichen, Basis, „außer Dienst“, wenn es so ist. Die Suche filtert nach Kennzeichen, Typ, Rufzeichen oder Basis; sieben Zeilen werden gezeigt, „N weitere“ klappt den Rest aus. „Hinzufügen“ öffnet ein leeres Luftfahrzeug.

<a id="aircraft-edit"></a>**Ein Luftfahrzeug ändern.** Ein Tippen auf eine Zeile öffnet es: Identität (Kennzeichen, Typ, Variante, Betreiber) und Betrieb (Rufzeichen durch Kommas getrennt, Basis, taktische Nummer, in Dienst). Unter den Feldern sagt eine Zeile, was sich ändern wird („2 Felder geändert: Basis, Rufzeichen“); „Speichern“ schreibt es. Ein Typ, den die Datenbank nicht kennt, wird so übernommen, und der Bildschirm sagt es. Das Kennzeichen ist der Schlüssel: zwei Luftfahrzeuge können es nicht teilen. Der Standort von der Website bleibt, wie er ist. „Ausmustern“ fragt, dann verlässt das Luftfahrzeug die Flotte; sein Leistungsblatt, falls vorhanden, bleibt erhalten.

## Gut zu wissen

- Das Modul Website aktualisiert die Flotte auch aus der eingefügten Seite „Flotte“ der Website: beide schreiben dieselbe Datei, jedes Speichern liest die Datei kurz vorher und ändert nur ein Luftfahrzeug.
- Nichts geht vor der nächsten Synchronisation hinaus.

<!-- fr: 90fe2925dc92 -->
