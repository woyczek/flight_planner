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

## Das Tablet neben dem Simulator

Sie fliegen am Rechner (X-Plane) und möchten die Karte auf einem Tablet oder Telefon: Auf dem Rechner, den der
Starter bedient, öffnet „Zugang des Rechners“ die Pilot-App für Geräte im selben lokalen Netz (oder starten Sie
`lancer.cmd --lan`).

1. **Für Geräte im lokalen Netz öffnen**: Die Karte zeigt die auf dem Gerät zu öffnende Adresse, ihren QR-Code und
   einen 6-stelligen Kopplungscode. Windows fragt eventuell, ob Python erlaubt werden soll: nur für private
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
Ihnen gegeben hat; das Token wird nur an diese Instanz gesendet.

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
  entziehen; kann IVAO das nicht, sagt Ihnen die Suite, ihn in Ihrem IVAO-Konto zu entziehen. Zum Ausprobieren am
  Arbeitsplatz ohne Relais: Die in der IVAO-Anwendung der Fluggesellschaft anzugebende Rückkehradresse ist
  `http://127.0.0.1:<port>/__relay/ivao/callback` (der Port des Starters).
- **Geräte des Relais**: Läuft der Starter als Relais der Fluggesellschaft (hinter dem Reverse-Proxy des NAS, in
  https), koppelt ein Pilot jedes Gerät einmal mit einem 8-stelligen Code, den der Administrator in Maintenance › „Geräte
  des Relais“ für sein Kürzel anfordert (einmal, 10 Minuten); seine Änderungen tragen dieses Kürzel. Ein verlorenes Gerät
  oder alle eines Piloten, der geht, werden dort widerrufen.
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

<!-- fr: c49c76673bd9 -->
