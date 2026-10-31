# Karte

Ihren Flug auf einer Luftfahrtkarte und in seinem Vertikalprofil sehen, oder die Karten einer Mission: Lufträume,
Flugplätze, Funkfeuer, Luftstraßen, Mindesthöhen. Die Route des Flugs lässt sich auch auf der Karte ändern.

## So geht’s

**Der geplante Flug.** Die Karte zeigt den in Kraftstoff vorbereiteten Flug: Abflug, Routenpunkte, Ankunft, und den
Ausweichflugplatz grau gestrichelt. Die in Kraftstoff gewählten Piste, SID, STAR und Anflugverfahren werden über der Route gezeichnet (SID grün, STAR orange, Anflug blau), mit Namen („SID ROYAN6P“). Seine Zusammenfassung (Flugfläche, Entfernung, geplant oder im Flug) steht nicht über der Zeichnung (die Zeichnung zeigt sie): der Tooltip des Griffs des Datenblocks unter der Karte nennt sie, mit Abflug und Ankunft, Ausweichflugplatz und Luftfahrzeugtyp. Ändert sich der Flug in Kraftstoff, folgt die Karte von selbst.

**Die Karte und was sie zeigt.** Rund um die Route: die Lufträume, die sie durchquert oder streift (Flugbeschränkungs-,
Gefahren- und Sperrgebiete, kontrollierte Lufträume), die unteren oder oberen Luftstraßen je nach Ihrer Flugfläche, die
Flugplätze und die Funkfeuer, und in jedem Ein-Grad-Feld die Mindestsicherheitshöhe (die braune Zahl, in Tausenden und
Hunderten Fuß: „3⁵“ bedeutet 3 500 ft). Die kleinen violetten Zahlen entlang der Route sind die Entfernungen ab dem
Abflug, in nautischen Meilen. Verschieben Sie die Karte mit einem Finger, spreizen Sie zwei Finger zum Zoomen (während der Geste behält die Karte nur ihre Linien — Lufträume,
Luftstraßen, Route, Flugplätze als kleine Quadrate — und ihre Namen kommen zurück, sobald sie stillsteht);
„Zentrieren“ (das Zielsymbol oben rechts auf der Karte) kehrt zur ganzen Route zurück. Die Karte bleibt, wo Sie sie hingelegt haben, auch wenn sich die Route
ändert: nur „Zentrieren“ (oder ein anderer Flug) richtet sie neu aus. Kehren Sie zur Karte zurück (aus Kraftstoff oder nach „Fertig“),
finden Sie Ihren Ausschnitt wieder, solange Route und gewählte Verfahren unverändert sind; sonst wird der Flug samt Verfahren neu
eingepasst. Solange „Nur rund um den Flug“ (Ebenen) angehakt
ist, werden Lufträume und Luftstraßen von weitem nur nahe dem Flug gelesen; entfernen Sie den Haken oder zoomen Sie hinein,
um alles zu sehen.

<a id="maps-procs"></a>**Gewählte Piste und Verfahren.** Was Sie in Kraftstoff gewählt haben (Piste, SID, STAR, Anflug), wird über der Route gezeichnet: die SID grün, die STAR orange, der Anflug und sein Fehlanflug blau, von der Schwelle der Abflugpiste bis zum ersten Punkt der Route und vom letzten Punkt der Route bis zur Schwelle der Landepiste. Übergänge und das Fehlanflugverfahren sind gestrichelt; ein Abschnitt ohne Punkt (zum Beispiel ein Steigflug auf einem Kurs) ist ein kurzer Strich entlang seines Kurses, dann eine Strichlinie bis zum nächsten Punkt; eine Kurve mit konstantem Radius ist ein Bogen. Erreicht die SID keinen Punkt der Route, verbindet eine gestrichelte Gerade sie mit der Route (ebenso bei der STAR). Ein nicht gewähltes Verfahren wird nie gezeichnet, und die Ebenenliste hat kein Kästchen dafür. Der Name des Verfahrens steht auf seiner Linie, gefolgt von der Herkunft seiner Daten, wenn sie von X-Plane oder Little Navmap stammen („X-Plane, lokal“) dann vom Zeichen ⌛ (grau), wenn sie unter einem früheren Zyklus gelesen wurden; die Legende (Chip „i“) erinnert daran. Ab der regionalen Ansicht (auf der Seite der Schwellen einstellbar) trägt jeder Punkt seine Beschränkungen; der Name des Verfahrens steht in jedem Maßstab, über allem anderen, wie auf Verfahrenskarten: eine **unterstrichene** Höhe heißt „mindestens“, eine **überstrichene** „höchstens“, beides „genau“, „5000–7000“ „dazwischen“; „≤ 220 kt“ ist die nicht zu überschreitende Geschwindigkeit. Das Vertikalprofil folgt demselben Weg und zeigt diese Beschränkungen als Stufen (Pfeil nach oben: mindestens, nach unten: höchstens, Punkt: genau, Balken: zwischen zwei Höhen); ihr Text nimmt einen freien Platz oder keinen, nie über dem Namen eines Luftraums, TOC / TOD oder einer Stufe; Entfernungen, geschätzte Zeiten und der Cursor werden entlang dieses Wegs gemessen. Die Karte ändert diese Wahl nie: Tippen Sie auf einen Flugplatz der Route, seine Karte nennt die gewählte Piste und die Verfahren, mit einer Schaltfläche „Ändern“, die Kraftstoff bei der zu ändernden Zeile öffnet; ein Link „Quelle“ öffnet die veröffentlichte Seite des Verfahrens (eAIP des SIA) in einem neuen Tab, und bei einem anderswo gelesenen Verfahren erscheint der Name seines Dokuments beim Überfahren der Zeile.

<a id="maps-rwy"></a>**Die Pisten.** Aus der Nähe wird jede Piste jedes gezeichneten Flugplatzes als kurzer Vektor von ihrer Schwelle gezeichnet, und der Flugplatz zeigt seinen Namen neben dem Code („LFPO Paris-Orly“); jeder Vektor verläuft in Pistenrichtung, ihre Nummer am Ende hinter der Schwelle: die in Kraftstoff gewählte Piste fett in der Farbe ihrer Seite, die anderen dünn. Sie erscheinen erst ab der von der Fluggesellschaft eingestellten Zoomstufe (Einstellungen › Verwaltung, „Zoomstufe der Pistenschwellen“, ohne Einstellung 11); darunter nichts. In „Auf der Karte wählen“ werden alle Pisten des Flugplatzes so gezeichnet, die gewählte fett; die Zeichnungen der Wahl liegen über den abgeblendeten Beschriftungen des Hintergrunds.

<a id="maps-choose"></a>**Auf der Karte wählen.** Die Schaltfläche „Auf der Karte“ einer Seite im Kraftstoff (Abflug oder Ankunft) öffnet die Karte auf diesem Flugplatz — ebenso „Auf der Karte wählen“ auf der Karte des Abflug- oder Ankunftsflugplatzes (tippen Sie auf sein Symbol; auf einem Telefon in voller Breite): Hintergrundkarte und Ebenen werden abgeblendet, das Blatt öffnet sich ausgeklappt („Fertig“ bleibt unten, immer sichtbar), die Ansicht passt sich dem Flugplatz und seinen zu Ihrer Wahl passenden Verfahren im Umkreis von 40 NM an (ferne Einflugpunkte bleiben außerhalb; ein gewähltes Verfahren, das die Ansicht verlässt, erweitert sie nur um sich selbst). Oben im Datenblock Ihre Auswahl, eine Zeile pro Familie („Piste 31 · ↑ 12 kt“, „OKRI5L“, „I31 über IAF1“), jede mit ✕, um sie auf „Keine“ zurückzusetzen; ein Tippen auf den Namen einer Familie („Piste“, „STAR“, „Anflug“) führt zu ihrer Gruppe und klappt sie auf. Darunter die drei Familien auf einmal — die Piste, die SID (Abflug) oder die STAR, der Anflug (Ankunft) — in engen Zeilen: drei Tipper in beliebiger Reihenfolge. Jede Wahl schränkt die beiden anderen Familien auf das Passende ein; der Rest ist unter einer dünnen Zeile „N weitere · Alle“ eingeklappt, die ihn mit ⚠ markiert aufklappt (er bleibt wählbar). SIDs, die auf der eingegebenen Route enden, und STARs, die auf ihr beginnen, kommen zuerst, unter „Zu Ihrer Route“; die anderen folgen, markiert „Ausgang LACOU“ oder „Eintritt OKRIX“. Auf einer Direktroute (kein Punkt und keine Luftstraße zwischen den beiden Flugplätzen) nichts dergleichen: Sie ordnen sich nach ihrer Richtung zum anderen Flugplatz, „Richtung LFPO“ über den am besten ausgerichteten (unter 60°), ein kleiner Pfeil in Flugrichtung auf jeder Zeile. „Keine“ ist immer die erste Zeile. Verfahren, die sich nur durch die Piste unterscheiden (OKRI5L, OKRI5R), bilden eine Zeile „OKRI5“ mit ihren Pisten als kleine Etiketten: ein Tippen wählt die Familie und schränkt die Pisten ein, ein Tippen auf eine Piste wählt das Verfahren. Anflüge tragen ihre Kurzbezeichnung („ILS 06“, „RNP 06“, ohne Pistenetikett, da die Bezeichnung sie nennt, dieselbe auf der Karte; der veröffentlichte Name beim Überfahren); unter dem gewählten Anflug „Ohne Übergang“, dann seine Übergänge, darunter die Anfangsanflugsegmente, die der SIA für die ganze Piste veröffentlicht („via ODILO 1A“), im Farbton ihres Endanflugs; eine gewählte STAR lässt nur die Übergänge, die an einem ihrer Punkte beginnen (sonst geht der Übergang auf „Keine“ zurück); ein Übergang ohne gemeinsamen Punkt mit dem Endanflug wird gestrichelt angeschlossen. Jedes Verfahren hat seinen Farbton (acht, im Wechsel), gleich auf seiner Zeile, seiner Beschriftung und seiner Spur; auf der Karte eine kleine Beschriftung pro Familie und Punkt („NIMER 9“), und das überfahrene oder angetippte Verfahren liegt über allem, mit seinem vollen Namen; das Überfahren einer Zeile jeder Familie hebt ihre Spur hervor, das Überfahren einer Spur ihre Zeile; ⌛ (grau): unter einem früheren Zyklus gelesen. Der Code des Flugplatzes bleibt über den Verfahren geschrieben; Pistennummern nehmen ihren Platz vor den Funkfeuern ein, die ihnen weichen; eine Nummer, die auf ein Etikett fiele, wird nicht geschrieben (der Pfeil bleibt). Jede Piste trägt den Wind des bereits bekannten METAR: „↓ 12 kt“ Gegenwind, „↑“ Rückenwind, dann der Seitenwind (← Wind von rechts, → Wind von links: der Pfeil zeigt, wohin er weht, die Piste nach oben gezeichnet, wie in Kraftstoff), grün, orange oder rot nach Rücken- und Seitenwind; ohne METAR nichts. Ein Tippen auf eine Zeile oder eine Spur fügt diese Wahl hinzu und lässt sie auf der Karte (die Piste fett, das Verfahren in seinem Farbton, die anderen seiner Familie abgeblendet); noch wird nichts geschrieben. Ein Verfahren, das nur eine Piste bedient, setzt sie, wenn keine gewählt ist; sonst bietet eine Zeile unter der Gruppe die Korrektur mit einem Tippen an: „OPAL2E bedient 25 — Auf 25 wechseln“ oder „OKRIX5A bedient 07 nicht — OKRIX5B wählen“. „Fertig“, das Kreuz ✕ oder Esc bringen Sie mit allem Gewählten zurück zu Kraftstoff; Kraftstoff schreibt es und sagt, was sich geändert hat; die Karte schreibt nichts. Zum Verzichten, ohne etwas zurückzugeben: „← Kraftstoff“ oben.

<a id="maps-coverage"></a>**Abdeckung.** Die Ebene „Abdeckung“ (in der Ebenenliste, anfangs aus, nur über ihr Kästchen eingeschaltet) färbt die Flugplätze danach, was dieses Gerät von ihren Verfahren liefern kann: **grün**, sie liegen vor (veröffentlicht, von Hand erfasst oder auf diesem Rechner gelesen); **orange**, sie liegen vor, sind aber nur teilweise gelesen (Seiten nicht gelesen, Verfahren zu prüfen: die Karte des Flugplatzes sagt, wie viele), oder sie werden auf Anfrage gelesen (Frankreich über das eAIP des SIA, ein Staat mit lesbaren Tabellen, ein Flugplatz der lokalen Little-Navmap-Datenbank); **rot**, nichts Lesbares (nur Bilder, Fließtext, nichts auf diesem Rechner). Die Legende (die „i“-Schaltfläche des Datenblocks) zeigt eine Zeile pro Farbe, solange die Ebene sichtbar ist. Nur die sichtbaren Flugplätze werden abgefragt. Berühren Sie einen Flugplatz: Seine Karte ergänzt eine Zeile mit Punkt, Stufe und Grund (⌛, wenn die vorliegenden Verfahren aus einem früheren Zyklus stammen, dann die Zahl der vorliegenden SID, STAR und Anflüge). Kann das Gerät diese Auskunft nicht geben, wird die Ebene nicht angeboten.

<a id="maps-weather"></a>**Profil und Cursor.** Im Datenblock unter der Karte schneidet das Vertikalprofil die Route von Anfang bis Ende: das Gelände, die
Lufträume, in die Sie auf der geplanten Höhe einfliegen, und die Flugbahn in Violett. Fahren Sie mit dem Finger über das
Profil: Ein blauer Cursor folgt ihm, und derselbe Cursor stellt sich auf der Karte ein. Tippen Sie auf die Route auf der
Karte, um ihn dorthin zu setzen. Die Zeile unter dem Profil sagt, was unter dem Cursor liegt: Entfernung ab dem Abflug,
geplante Höhe, Geländehöhe und der Luftraum, in dem Sie sich an dieser Stelle befinden. Unter der Karte zeigt dieser
Datenblock das Profil; die Liste der Lufträume an einem Punkt oder die Meldepunkte eines Flugplatzes öffnen sich an
seiner Stelle, wenn Sie sie verlangen, und das Profil kommt beim Schließen zurück. Der Wolkenchip, (die drei Chips — Profil, Wolke, „i“ — stehen immer in der obersten Zeile rechts; einer ohne Inhalt ist nur ausgegraut), ersetzt es (der Profilchip bringt es zurück) durch den
Wetterschnitt entlang der Route (Wind, Temperatur, Wolken, Vereisung) auf der Flughöhe; der Schnitt folgt demselben Cursor, und ein Tippen darauf
verschiebt ihn. Er zeigt nur die Vorhersage, die Wetter schon geladen hat: ohne sie führt die Zeile „Keine Vorhersage geladen“ zu Wetter unter Vorbereiten. Der letzte Chip „i“ (ausgegraut, solange die Zeichnung keine Legende hat) öffnet über dem Profil seine Legende (was jede Linie, Fläche und Marke ist); ein Wischen über den Wetterschnitt bewegt den Cursor wie beim Profil. Profil und Schnitt werden auf die genaue Höhe des Blocks gezeichnet, ihre Entfernungsachse bleibt immer sichtbar: in einem niedrigen Block entfallen Höhenbeschriftungen, nie die Achse.

<a id="maps-profile-spaces"></a>**Die Lufträume des Profils.** Das Profil zeigt nur die Lufträume, in die der geplante Vertikalweg eintritt (auf 500 ft genau); sich überlappende Sektoren einer Familie (die CTAs von Dublin) bilden dort eine Hülle, nach der Familie benannt; Free-Route-Luftraum (FRA) und W- oder Wetterforschungsgebiete erscheinen nur bei eingeschalteter Ebene „Andere Lufträume“; höchstens sieben Lufträume werden benannt, die übrigen in der Liste darunter.

<a id="maps-profile-zoom"></a>**Profil zoomen.** Um das Profil genau zu lesen, zoomen Sie auf einen Teil des Fluges: mit zwei Fingern spreizen oder zusammenziehen (die Mitte der Finger bleibt an ihrem Platz) und mit zwei Fingern ziehen, um das Fenster zu verschieben; ein einzelner Finger bleibt der Lese-Cursor. Die Höhenskala passt sich an das an, was das Fenster zeigt (daher kommt die Genauigkeit), die Entfernungsmarken (NM) rücken mit zusammen, und Punkte außerhalb des Fensters werden nicht gezeichnet. Ein Doppeltipp führt zum ganzen Flug zurück, ebenso die Schaltfläche „Ganzer Flug“, die in der obersten Zeile erscheint, solange das Profil gezoomt ist. Am Bildschirm: Strg + Mausrad zoomt um den Zeiger, Ziehen verschiebt das Fenster, ein Doppelklick führt zum ganzen Flug zurück. Der Zoom bleibt, solange die Seite geöffnet ist und die Route sich nicht ändert; er wird nie gespeichert. Der Wetterschnitt wird genauso gezoomt (dieselben Gesten, dieselbe Schaltfläche „Ganzer Flug“), und das Fenster ist für beide dasselbe: zoomen Sie in einem, wechseln Sie mit dem Chip zum anderen, und Sie finden denselben Flugabschnitt; der Schnitt passt auch seine Höhenskala an das an, was er zeigt.

**Ein feststehender Bildschirm.** Nichts zwischen Kopfzeile und Karte: die Karte und der Datenblock füllen den Bildschirm, und nichts scrollt außer dem Inhalt des Blocks. Die Schaltflächen liegen auf der Karte: rechts von oben „Route bearbeiten“ (der Stift), „Zentrieren“, der Kartenmodus, „Auf der Karte bearbeiten“ (die vier Pfeile) und zuletzt der Vollbildmodus (Esc verlässt ihn). „Ebenen“ sitzt auf der Zeile des Blatts, links von seinem Griff, neben dem, was es öffnet; ohne etwas zu zeichnen besteht das Blatt nur aus dieser Zeile. Der Block ist ein Blatt: Ziehen Sie seine obere Zeile (den kleinen Balken; in normaler Höhe trägt die Zeile über einem Profil oder Schnitt keinen Titel, nur die drei Chips) nach oben, um ihn zu vergrößern, nach unten, um ihn auf diese Zeile zu verkleinern, was der Karte die ganze Höhe
lässt; ein Tippen auf die Zeile klappt ihn ein oder bringt ihn auf seine normale Höhe zurück.

**Sechs Kartenmodi.** Die Modus-Schaltfläche rechts auf der Karte zeigt den gewählten Modus; tippen Sie darauf, um die
sechs Modi zu sehen. „IFR unten“: untere Flugwege, Lufträume, Mindesthöhen und Funkfeuer. „IFR oben“: obere Flugwege
(UN…, UM…), Lufträume über FL195. „VFR“: topografischer Hintergrund mit Städten, den für VFR wichtigen Lufträumen,
Meldepunkten und Hindernissen. „Topo“: das Gelände und, aus der Nähe, die Höhenlinien (alle 500 ft oder 100 m je nach
Ihrer Einheit, die Zähllinien beschriftet), nur mit Flugplätzen, Städten und Hindernissen. „OAT“: Militärflug, das IFR
Ihrer Flughöhe plus die Luftbetankungsstrecken, die NAT-Tracks des Tages, die Gebiete R, D, P, TSA, TRA, CBA und das
Tiefflugnetz in allen Höhen. „Auto“ wählt nach der Flugfläche Ihres Flugs (IFR oben ab FL195). Der Modus bleibt auf
diesem Gerät erhalten.

**Je näher Sie zoomen, desto mehr zeigt sie.** Von weitem zeigt die Karte nur die großen Flugplätze, die Flugwege und
ihre Namen. Näher: die Punkte der Flugwege (Dreiecke und Funkfeuer), die Mindestflugfläche jedes Flugwegs („F195“), dann
die Länge des Abschnitts, sein Kurs („097°“), die Meldepunkte und die Hindernisse. Aus der Nähe trägt jedes Hindernis
seine Höhe über Grund und die Höhe seiner Spitze in Klammern („434 AGL (771)“).

<a id="maps-layers"></a>**Ebenen.** Die Ebenen-Schaltfläche links auf der Karte öffnet im Datenblock, anstelle des Profils, die Liste dessen, was die Karte zeichnet (das ✕ bringt das Profil zurück). Zuerst, unter der Flugauswahl, der Regler „Komplexität“: Er wirkt, als wäre der Zoom ein anderer, eine Zoomstufe pro Raststellung (−4 bis +4) — nach links weniger, nach rechts mehr Details. Was jeder Zoom zeigt, legt der Administrator fest (Einstellungen, Karte „Verwaltung“). Dann die
Luftraumfamilien (TMA / CTR, D / R / P, FIR, andere), untere und obere Flugwege, Funkfeuer, Flugwegpunkte,
VFR-Meldepunkte, Hindernisse, Mindesthöhen, Städte, Gradnetz, Ausweichflugplatz, Namen der Lufträume, Namen der
Flugwege. Haken setzen oder entfernen: die Karte folgt, und Ihre Wahl bleibt für diese Einstellung auf diesem Gerät
erhalten. „Alles zurücksetzen“ kehrt zur ursprünglichen Wahl zurück. Ganz oben beschränkt „Nur rund um den
Flug (schneller)“, in IFR vorgewählt, Lufträume und Flugwege auf die Umgebung des Flugs: Der Titel des Bereichs endet dann
mit „rund um den Flug“, und der Chip „i“ sagt, dass außerhalb des Korridors nichts gelesen wird; ohne Haken („sonst die
ganze Ansicht“) wird die ganze Ansicht gelesen, überall gleich dicht, nur nach der Komplexität gefiltert — außer bei einer
Ansicht von mehr als 600 NM Breite, die trotzdem rund um den Flug gelesen wird (der Chip „i“ sagt es). Aus der Nähe wird
ohnehin alles gezeichnet. Jedes Element der Karte hat seinen Zoombereich: VFR-Meldepunkte
erscheinen erst ganz nah, CTR aus der Nähe, TMA in mittlerer Ansicht, FIR von weitem. Auch die Größe der Karte zählt: In
einem kleinen Rahmen (Telefon, Fenster der Doppelansicht) zeigt sie bei gleichem Zoom weniger Elemente als in einem
großen, als wären Sie weiter weg (der Zoom wird um den Mittelwert aus Höhe und Breite des Rahmens korrigiert, 900 px
bedeuten keine Korrektur).

<a id="maps-airspaces"></a>**Antippen oder darüberfahren für mehr.** Tippen, klicken oder fahren Sie über den Namen eines Flugwegs, die
Beschriftung eines Luftraums oder eine Windfieder: eine kleine Blase nennt das Wesentliche in zwei Zeilen — für einen
Flugweg den Abschnitt (Punkt → Punkt), seine Länge, seine Kurse, Unter- und Obergrenze; für einen Luftraum seinen Namen
und seine Grenzen in AIP-Schreibweise („TMA 8 AQUITAINE 2000|FL145 D“). Anderswo in einem Luftraum angetippt, zeigt der
Datenblock unter der Karte die Lufträume unter Ihrem Finger, einen oder mehrere, anstelle des Profils: ein Diagramm der
Höhen wie das Vertikalprofil (eine nummerierte Säule je Luftraum, von der Untergrenze bis zur Obergrenze), dann die
nummerierte Liste mit ihren Grenzen, gelesen wie die senkrechte Achse: das Höchste oben (Nummer 1 ist der Luftraum mit der höchsten Obergrenze, links im Diagramm), das Niedrigste unten. FIR, UIR, SIV und Kontrollsektoren ohne Grenzen, wie jeder Luftraum von der Oberfläche bis zur Obergrenze, werden weder gezeichnet noch gezählt (man durchfliegt sie nicht): ihre Namen stehen in einer eingeklappten Zeile „Auch hier (n)“ unter der Liste und in einer letzten grauen Zeile der Hinweisblase („Auch hier: FIR PARIS · SIV POITIERS“), die FIR oder das SIV, das man ruft, ohne Säule. Das ✕, Escape oder ein Tippen auf eine leere Stelle der Karte schließen ihn und das
Profil kommt zurück, ein weiteres Tippen auf Lufträume ersetzt ihn; die Karte zu bewegen lässt ihn stehen. Die Karte
bewegt sich nicht und ändert ihre Größe nicht. Die Hinweisblase beim Darüberfahren folgt dem Zeiger, bleibt 5 Sekunden,
macht der nächsten Platz und schließt sich mit einem Tippen woanders oder einer Kartenbewegung. Über einer
Funkfeuer-Anlage nennt die Blase Art, Kennung und Frequenz; wo mehrere Anlagen am selben Ort stehen, behält die Karte
die nützlichste (VOR, TACAN oder DME, dann NDB, dann ILS) und die Blase nennt die anderen („auch hier: ILS 25L BG
109.9“). Auf dem Profil geben Finger oder Maus ebenso die durchflogenen Lufträume an.

<a id="maps-vfr"></a>**Die VFR-Meldepunkte eines Flugplatzes.** Fahren Sie mit der Maus über einen Flugplatz: seine Meldepunkte und die
Abläufe aus seinen VAC-Karten leuchten auf (benannte Kreise, Striche zwischen den Punkten). Auf der Karte trägt ein
Meldepunkt nur sein Kurzzeichen („NA“, „E“, „SE“ …), damit die Karte lesbar bleibt; der lange Name steht in der Blase
und in der Liste. Tippen Sie den Flugplatz an: Die Karte zoomt auf seine Punkte, wenn sie gedrängt sind, und der
Datenblock unter der Karte gibt anstelle des Profils die Liste der Punkte (Kurzzeichen, langer Name, Einschränkungen),
die Abläufe (mit der VAC-Seite), dann die Anweisungen der VAC, seitenweise eingeklappt; er scrollt, wenn der Inhalt lang
ist. Er bleibt offen, während Sie die Karte bewegen: das ✕ oder Escape schließen ihn und das Profil kommt zurück, ein
anderer Flugplatz ersetzt ihn. Das Antippen eines Meldepunkts öffnet ebenso den Inhalt seines Flugplatzes, dieser Punkt
zuerst. Im VFR-Modus werden die Punkte des Abflug- und des Ankunftsflugplatzes automatisch gezeigt. Diese Daten werden
automatisch aus den VAC extrahiert: Sie sind mit „zu prüfen“ gekennzeichnet und nicht die veröffentlichte Route; die
VAC-Karte hat Vorrang. Wurde der Flugplatz von Hand analysiert, sagt der Block es, die Routen tragen ihren Namen, ihre
Bahnen und Bedingungen, eine geprüfte Spur folgt der VAC-Karte (lange Striche) und ein Pfeil kennzeichnet eine
Einbahnroute. Die Meldepunkte der Datenbank sind immer da, schwarz für Flugzeuge und grün für Hubschrauber; die Abläufe
und Anweisungen der VAC kommen hinzu, sobald der Administrator sie importiert hat (Einstellungen › Wartung). Ein Meldepunkt ist eine einzige Zeile in der Liste und eine einzige Beschriftung auf der Karte, auch wenn Datenbank und
VAC-Karte ihn beide nennen: die Zeile behält die Beschreibung und die veröffentlichte Position der Datenbank und sagt „VAC-Position 1,2 NM entfernt“,
wenn die VAC-Karte ihn mehr als eine halbe Meile davon setzt.

<a id="maps-started"></a>**Im Flug.** Sobald der Flug in Kraftstoff gestartet ist, zeigt die Karte, wo Sie sein sollten (hohles Flugzeug,
„geplant 14:32Z“), und wo Sie sind (volles Flugzeug, nach Ihrem Kurs gedreht, mit der gepunkteten geflogenen Spur seit dem
Abflug, die ein Wechsel des Tabs nicht verliert). In den Notizen des Datenblocks, unter dem Profil, nennt eine Zeile die Abweichung: voraus oder verspätet (Minuten und NM), wie viele NM neben der
Route, und Ihre Höhe gegenüber der geplanten; das Profil zeigt beide Höhen. Aus der Nähe trägt jeder Punkt seine
voraussichtliche Zeit (ETA) unter seinem Namen, nie über einem Flugplatz, in UTC („14:52Z“), die Ortszeit in Klammern bei Abflug und Ankunft. „Folgen“ hält die Karte auf Ihrer Position; ein Verschieben der Karte beendet es. Ohne
Position (GPS oder Netz nicht aktiviert) sagt es eine Benachrichtigung einmal, die Zeile bleibt in den Notizen, mit einer Schaltfläche „Position aktivieren“; eine Position, die älter als 2
Minuten ist, erscheint grau. Die Zeile endet mit der Quelle der Position: GPS, Netz, IVAO, VATSIM, X-Plane oder Little
Navmap. Die voraussichtlichen Zeiten erscheinen auch für einen in Kraftstoff datierten Flug, vor dem Abflug. Nach der Ankunft ersetzt die Notiz „Angekommen“ die Zeile und „Folgen“ verschwindet; eine Ausweichlandung wird in den Notizen genannt.

**Höhenwinde.** Hat Kraftstoff die Windvorhersage in der Flughöhe, zeigt die Karte sie als Windfiedern entlang der
Route: an jedem Punkt und alle 50 NM zwischen zwei Punkten. Der Schaft zeigt, woher der Wind kommt; ein Wimpel steht für
50 kt, eine Fieder für 10 kt, eine halbe Fieder für 5 kt. Tippen Sie eine Fieder an (oder fahren Sie mit der Maus
darüber): die Blase nennt Richtung, Stärke, Temperatur, Flughöhe und die Stunde der Vorhersage. Die Ebene „Höhenwinde“
blendet sie aus.

**Stufen.** Legt die Route in Kraftstoff an einigen Punkten eine Flugfläche fest, zeichnet das Profil die Stufen:
Steigflug, Reiseflug, neuer Steig- oder Sinkflug, mit neu berechnetem Ende des Steigflugs und Beginn des Sinkflugs.
Die Wegpunkte der Route sind auch auf dem Profil markiert.

**Steig- und Sinkflug.** Die violetten Rauten markieren das Ende des Steigflugs (TOC) und den Beginn des Sinkflugs
(TOD), auf der Karte wie im Profil. Sie stammen aus der Berechnung in Kraftstoff; ohne sie schätzt die Karte sie mit
üblichen Steig- und Sinkraten. Wenn der Platz knapp ist, schreibt die Karte zuerst den Namen des Flugplatzes, dann die
Pistennummern, die Funkfeuer, die Verfahren, die Route (Namen, Zeiten, TOC / TOD), zuletzt den Rest; eine geschätzte
Zeit oder der Name von TOC / TOD gleitet entlang der Route, bevor sie entfällt (die Raute bleibt).

**Die Missionskarten.** Die Liste unten in den Ebenen (die Ebenen-Schaltfläche) wählt, was die Karte zeigt: den geplanten Flug oder eine Mission der
Fluggesellschaft. Für eine Mission wählt eine zweite Liste unter ihren Karten (Übersicht, Ziel, Detail…). Jede Karte
wird wie im Studio neu gezeichnet: gleicher Rahmen, gleiches Anzeigeprofil, mit den Punkten der Mission, ihren
schraffierten Gebieten und ihrer Route. Das Vertikalprofil zeigt dann das der Mission.

<a id="maps-edit"></a>**Die Route auf der Karte ändern.** Tippen Sie auf „Auf der Karte bearbeiten“ (die vier Pfeile, rechts auf der Karte; beim ersten Mal erscheint eine kurze Hilfe): die Wegpunkte erhalten einen
Kreis. Ziehen Sie einen Punkt auf einen Fix, ein Funkfeuer oder einen Flugplatz: er setzt sich dort (anderswo
losgelassen, wird er ein freier Punkt, nach seinen Koordinaten benannt, etwa 4530N00030E). Um einen Punkt hinzuzufügen,
tippen Sie auf „+“ (in derselben Spalte) und dann auf die gewünschte Stelle (oder halten Sie eine halbe Sekunde gedrückt):
auf einem Fix, einem Funkfeuer oder einem Flugplatz setzt er sich dort, anderswo ist es ein freier Punkt; er wird dem
nächstgelegenen Abschnitt hinzugefügt. Ein einfaches Tippen fügt nichts hinzu: es zeigt die Blase. Tippen Sie einen
Routenpunkt an: seine Karte nennt seine Flughöhe und bietet „Entfernen“ an. Abflug und Ankunft bewegen sich hier nicht.
Auf dem Profil ziehen Sie eine Flughöhe nach oben oder unten: sie ändert sich ab dem Punkt, der diesen Abschnitt
eröffnet, in Schritten von FL10 (auf dem ersten Abschnitt ist es die Flughöhe des Flugs); in der Karte eines Punkts tun
„−“ und „+“ dasselbe. „Rückgängig“ nimmt die letzte Geste zurück. Jede Änderung wird sofort im Flug gespeichert, und
Kraftstoff rechnet neu; das Profil folgt. Erneutes Tippen auf die Schaltfläche (oder Esc) schließt den Modus, und die Karte lässt sich wieder mit dem Finger
verschieben. Um die Route als Text einzugeben, öffnet der Stift oben in der rechten Spalte („Route bearbeiten“) den Schritt Route von Kraftstoff. Solange der Modus aktiv ist, behält die rechte Spalte nur „Auf der Karte bearbeiten“, „+“, „Rückgängig“, „Zentrieren“ und den Vollbildmodus.

## Ohne Netz

**Was ohne Netz funktioniert.** Karte, Lufträume, Flugplätze, Funkfeuer und Profil bleiben offline verfügbar für die
bereits angesehenen Gebiete und für die unter Einstellungen › Offline-Daten behaltenen. Behalten Sie dort das Gebiet
Ihres Flugs, bevor Sie losfliegen: Alles ist dann da, auch ohne Netz.

**Die Hintergrundkarte.** Der Hintergrund (Straßen, Städte, farbiges Gelände) kommt aus dem Internet. Ohne Netz wird
die Karte auf einem einfarbigen Hintergrund mit den Ländergrenzen gezeichnet, und eine Zeile weist darauf hin; alles
andere ist da.

**Das Gelände im Profil.** Das Gelände im Profil kommt ebenfalls aus dem Internet. Ohne Netz zeigt das Profil
stattdessen die Mindestsicherheitshöhe jedes durchquerten Felds (braun gestrichelt), und eine Zeile weist darauf hin.

## Sonderfälle

**Kein Flug.** Ohne vorbereiteten Flug ist die Karte leer und bietet „Kraftstoff öffnen“ an. Die Missionskarten bleiben über die Liste der Ebenen erreichbar.

**Flug über die Datumsgrenze.** Ein Flug über den 180. Längengrad (zum Beispiel von Sibirien nach Alaska) wird in einem Stück gezeichnet: die Karte setzt sich jenseits der Linie fort, Entfernungsmarken, Profil und Wetterschnitt folgen der Route, die mit Längen zwischen −180° und 180° gespeichert bleibt.

**Luftfahrtdatenbank fehlt.** Wurde die Luftfahrtdatenbank noch von keinem Gerät der Fluggesellschaft veröffentlicht,
zeigt die Karte nur die Route und sagt es einmal (Benachrichtigung, dann Notiz im Datenblock).

**Gebiet nicht behalten.** Offline, über einem nie angesehenen und nicht behaltenen Gebiet, hat die Karte nichts zu
zeigen; die Schaltfläche „Offline-Daten“ öffnet die Einstellungen, um es beim nächsten Mal zu behalten.

**Anderer Zyklus.** Jede Missionskarte merkt sich den Datenzyklus, mit dem sie erstellt wurde. Stammt die aktuelle
Datenbank aus einem anderen Zyklus, sagt es eine Zeile: Die Lufträume können sich seitdem geändert haben.

**Alte Mission.** Eine vor dieser Version gespeicherte Mission enthält ihr Anzeigeprofil nicht. Die Karte nimmt dann
das übliche Profil des Kartentyps (detailliert für ein Ziel oder ein Detail, sonst vereinfacht) und weist darauf hin.
Es genügt, die Mission im Studio zu öffnen und zu speichern, damit sie danach ihr eigenes behält.

<!-- fr: 43d7f16e7c74 -->
