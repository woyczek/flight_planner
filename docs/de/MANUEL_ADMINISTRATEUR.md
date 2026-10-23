# Administratorhandbuch

Dieses Handbuch beschreibt die Suite SO Group Virtual (Virtual Special Operation Group) für das **Zentrum** (Planung und Führung der Operationen) und für die
**Administratoren** der Suite: ein Kapitel pro Seite, ein Abschnitt pro Reiter, Rubrik oder Block, danach die
Synchronisierung der Daten und der Starter. In der Suite öffnet der Eintrag **„Hilfe“** der Seitenleiste dieses Handbuch
beim Kapitel der aktuellen Seite (Seiten des Zentrums und der Einstellungen). Die Seiten der Piloten beschreibt das
[Benutzerhandbuch](MANUEL_UTILISATEUR.md); den Betrieb im Detail (Daten, Sicherungen, Fehlerbehebung, Veröffentlichung)
das [Betriebshandbuch](../MANUEL_EXPLOITATION.md). Verzeichnis der gesamten Dokumentation:
[Dokumentationsverzeichnis](../README.md).

## Zugang zum Zentrum

Das Zentrum für Planung und Führung der Operationen (CPCO) umfasst den Missionsgenerator, das Kartenstudio, das Missionsregister und die ODV-Planung. Es ist den Administratoren der Suite vorbehalten.
Zwei unabhängige Schutzmechanismen gelten: die **Sperre des Zentrums**, die für jeden Browser eigen ist, und die **Benutzerrechte** (Rollen, Modus develop oder production), die für die ganze Gesellschaft gelten.
Die Einstellungen finden Sie unter ☰ › Einstellungen, Reiter „Zentrum“.

### Sperre des Zentrums

Die Sperre blendet das Zentrum aus, solange es in diesem Browser nicht aktiviert wurde.

- Zentrum gesperrt: Seitenleiste, Menü ☰ und Startseite folgen der Nutzungsstufe, nicht der Sperre; eine ohne Zentrum geöffnete Seite des Zentrums zeigt den Hinweis „Zugang beschränkt“, außer der Einsatztafel (Eintrag „Planung“), schreibgeschützt einsehbar.
- Eine direkt geöffnete Seite des Zentrums (Lesezeichen, Link) wird von einem Hinweis „Zugang beschränkt“ mit den Links „Zentrum aktivieren…“ und „Startseite“ überdeckt.
- Unter Einstellungen › Zentrum bleibt nur die Rubrik „Zugang zum Zentrum und Einstellungen“ sichtbar; die anderen („Benutzer und Rechte“, „Verfügbarkeitskategorien“, „ODV-Planung“, „Berichtsversand (Webdienst)“) sind ausgeblendet.
- Die Aktivierung wird nur in diesem Browser gespeichert: Sie ist auf jedem Rechner und nach dem Löschen der Websitedaten erneut vorzunehmen.

Grenze: Dies ist eine Nutzungssperre, keine Sicherheitsmaßnahme. Das Passwort steht im Klartext in `data/config/centre.json`, wird mit den Daten geteilt (`DEFA` voreingestellt) und neben dem Knopf „Zentrum aktivieren“ angezeigt: Das ist der **eigenständige Modus**. Der Gruppenmodus (signiertes Register, Zugang über die Administratorrolle) wird in der Rubrik „Gruppenmodus (signiertes Register)“ unten eingestellt ([Konzept](../technique/COMPTES_SIGNES.md)).

### Zentrum aktivieren oder sperren

1. Öffnen Sie ☰ › Einstellungen, Reiter „Zentrum“, Rubrik „Zugang zum Zentrum und Einstellungen“.
2. Geben Sie das neben dem Knopf angezeigte Passwort („Passwort: DEFA“ voreingestellt) in „Passwort des Zentrums“ ein (Groß- und Kleinschreibung egal).
3. Klicken Sie auf „Zentrum aktivieren“ oder drücken Sie die Eingabetaste. Die Statuszeile zeigt „Zentrum in diesem Browser aktiviert“.

Die Einträge des Zentrums erscheinen sofort, ohne die Seite neu zu laden. Die Rubrik zeigt dann „Modus und Zugang“ (Modus des Zentrums; „Passwort des Zentrums (mit den Daten geteilt)“ und „Passwort speichern“: in `data/config/centre.json` geschrieben, geht es beim nächsten „Synchronisieren“ hinaus), dann die Einstellungen „Berechnung der Transitrouten“:

| Feld | Funktion |
|---|---|
| „Geroutete Teilstrecke ab (NM)“ | Mindestlänge eines Transits, damit er geroutet wird |
| „Luftstraßen ab (ft)“ | Höhe, ab der ein Luftfahrzeug den Luftstraßen folgt |
| „Tiefflug bis (ft)“ | Obergrenze des Routings über das RTBA |
| „Ein- / Ausflug Luftstraßen (NM)“, „Ein- / Ausflug RTBA (NM)“ | Höchstabstand, um das Netz zu erreichen oder zu verlassen |
| „Zulässiger Umweg, Luftstraßen (%)“, „Zulässiger Umweg, RTBA (%)“ | Darüber bleibt die Teilstrecke direkt |

Schaltflächen: „Speichern“, „Standardwerte“ und „Zentrum sperren“. Diese Einstellungen bleiben in diesem Browser; es sind dieselben wie im Block „Geschätzte Dauer“ des Generators.

### Rollen „admin_centre“ und „utilisateur“

Jeder Benutzer hat ein gemeinsames Datenblatt (`data/utilisateurs/<TRI>.json`, synchronisiert): Kürzel, Anzeigename, Rolle, Status aktiv, Passwort (als Hash gespeichert, nie im Klartext).

| Rolle | Angezeigte Bezeichnung | Rechte |
|---|---|---|
| `admin_centre` | Administrator des Zentrums | Zugang zum Zentrum im Modus production, Benutzerverwaltung, Identitätsübernahme, Moduswechsel |
| `utilisateur` | Benutzer | Pilotenseiten („Meine Missionen“, Verfügbarkeiten) |

Verwaltung unter Einstellungen › Zentrum › „Benutzer und Rechte“:
- Die Tabelle listet die Datenblätter; „Anzeigename“, „Rolle“ und „Aktiv“ werden in der Zeile geändert und sofort gespeichert;
- „Zurücksetzen…“ öffnet „Passwort von TRI zurücksetzen“: Geben Sie ein vorläufiges Passwort ein (mindestens 8 Zeichen), das der Benutzer bei seiner nächsten Anmeldung ändern muss;
- „Benutzer hinzufügen“: Kürzel, Anzeigename, Rolle, dann „Hinzufügen“.

Tipp: Ist der Benutzerordner leer, legt die Rubrik ein Datenblatt pro Pilot der Referenz an.

### Modus develop und Modus production

Der Modus gilt für die ganze Gesellschaft (`data/config/suite.json`). Er wird unter „Benutzer und Rechte“ eingestellt, Rahmen „Modus der Gesellschaft“, Liste „Modus“.

| Modus | Wirkung |
|---|---|
| develop (Standard) | Sicherheit getestet, nicht erzwungen: Kürzel frei, Anmeldung freiwillig. Ein Datenblatt ohne Passwort meldet sich ohne Passwort an. |
| production | Anmeldung erforderlich für „Meine Missionen“ und für das Zentrum; Kürzel durch die Anmeldung festgelegt (in Mein Profil nicht änderbar). |

Im Modus production zeigt eine Seite des Zentrums (oder Einstellungen › Zentrum) ohne angemeldeten Administrator ein Fenster „Anmeldung“ (Kürzel, Passwort, „Anmelden“). Ein Konto ohne die Rolle `admin_centre` wird abgewiesen: „Konto ohne Administrationsrechte für das Zentrum“.

Für den Wechsel in den Modus production braucht es mindestens einen aktiven Administrator des Zentrums mit Passwort. Im Modus production kann nur ein angemeldeter `admin_centre` zu develop zurückkehren.

Grenze: Die Prüfungen erfolgen im Browser; sie schützen nicht wirklich, solange die Überprüfung nicht über einen Server läuft. Die Sperre des Zentrums bleibt vom Modus unabhängig: Sie muss ebenfalls auf jedem Rechner aktiviert werden.

### Einen Benutzer übernehmen

Ein Administrator kann anstelle eines anderen Benutzers handeln, zum Beispiel um dessen Verfügbarkeiten oder Missionen zu korrigieren.

1. Klicken Sie unter „Benutzer und Rechte“ in der Zeile des Benutzers auf „Übernehmen“.
2. Eine Benachrichtigung bestätigt „Sie handeln als TRI“.
3. Auf allen Seiten erscheint ein Banner: „Identitätsübernahme: Benutzer TOTO (durch ADM, Schreibvorgänge signiert „ADM pour TOTO“)“.
4. Zum Beenden klicken Sie im Banner auf „Übernahme beenden“ (oder auf „Übernehmen“ in Ihrer eigenen Zeile).

Während der Übernahme ist das Arbeitskürzel das des übernommenen Benutzers, und jeder Schreibvorgang wird mit „ADM pour TOTO“ signiert. Im Modus production erfordert die Übernahme einen angemeldeten `admin_centre`; in develop genügt ein eingestelltes Kürzel. Während einer Übernahme ist kein Passwortwechsel möglich.

## Einstellungen › Zentrum
<!-- page: apps/settings/centre.html -->

Diese Seite vereint die laufenden Einstellungen des Zentrums: Zugang, Benutzer, Verfügbarkeitskategorien, ODV-Planung und Berichtsversand. Sie richtet sich an die Administratoren des Zentrums.
Zum Öffnen: Seitenleiste › „Einstellungen“, dann der Reiter „Zentrum“. Die Rubriken erscheinen im Seitenmenü, Gruppe „Zentrum (CPCO)“.
Solange das Zentrum gesperrt ist, ist nur die Zugangsrubrik sichtbar. Im Modus production verlangt die Seite zusätzlich eine Anmeldung als `admin_centre`.

### Zugang zum Zentrum und Einstellungen

Diese Rubrik aktiviert das Zentrum in diesem Browser: Missionsgenerator, Kartenstudio, Register und ODV-Planung.
1. Geben Sie das „Passwort des Zentrums“ ein, das neben dem Knopf angezeigt wird (`DEFA` voreingestellt; Groß- und Kleinschreibung egal).
2. Klicken Sie auf „Zentrum aktivieren“ oder drücken Sie die Eingabetaste. Die Meldung „Zentrum in diesem Browser aktiviert“ bestätigt die Aktivierung.

Ist das Zentrum aktiviert, zeigt die Rubrik „Modus und Zugang“ (Modus, Änderung des geteilten Passworts), dann „Berechnung der Transitrouten“:

| Feld | Funktion |
|---|---|
| Geroutete Teilstrecke ab (NM) | Entfernung, ab der eine Teilstrecke geroutet wird |
| Luftstraßen ab (ft) | Höhe, ab der die Luftstraßen genutzt werden |
| Tiefflug bis (ft) | Obergrenze des Tiefflugs |
| Ein- / Ausflug Luftstraßen (NM), Ein- / Ausflug RTBA (NM) | Höchstabstand, um die Luftstraßen oder das RTBA zu erreichen |
| Zulässiger Umweg, Luftstraßen (%), Zulässiger Umweg, RTBA (%) | tolerierter Umweg |

Ein leeres Feld übernimmt den Standardwert, der grau angezeigt wird. Schaltflächen: „Speichern“, „Standardwerte“, „Zentrum sperren“. Diese Einstellungen bleiben in diesem Browser.

### Benutzer und Rechte

Diese Rubrik verwaltet die Datenblätter der Benutzer. Es gibt ein Datenblatt pro Benutzer (`data/utilisateurs/<TRI>.json`), synchronisiert mit dem Datenpool.
- **Modus der Gesellschaft**: `develop` (Sicherheit getestet, aber nicht erzwungen: Kürzel frei, Anmeldung freiwillig) oder `production` (Anmeldung erforderlich für Meine Missionen und das Zentrum, Kürzel durch die Anmeldung festgelegt). Diese Einstellung gilt für die ganze Gesellschaft (`data/config/suite.json`).
- Grenze: Die Prüfungen erfolgen im Browser. Sie schützen erst wirklich, wenn die Überprüfung von einem Server (Webdienst) übernommen wird.
- **Tabelle**: „Kürzel“, „Anzeigename“, „Rolle“ („Administrator des Zentrums“ oder „Benutzer“), „Aktiv“, „Passwort“ (gesetzt, vorläufig oder keins). Jede Änderung einer Zeile wird sofort geschrieben.
- **„Zurücksetzen…“**: Geben Sie ein vorläufiges Passwort ein (mindestens 8 Zeichen), dann „Passwort zurücksetzen“. Der Benutzer muss es bei seiner nächsten Anmeldung ändern.
- **„Übernehmen“**: Sie handeln im Namen des Benutzers. Ein Banner erinnert auf allen Seiten daran, jeder Schreibvorgang wird mit „ADM pour TOTO“ signiert, und die Schaltfläche „Übernahme beenden“ beendet sie.
- **„Benutzer hinzufügen“**: Kürzel, Anzeigename, Rolle, dann „Hinzufügen“.
- Ist der Ordner leer, wird für jeden Piloten der Referenz ein Datenblatt angelegt.
- Konnten Dateien noch nicht in den Datenordner geschrieben werden, klicken Sie auf „In den Datenordner schreiben“.
- Im Modus production sind das Zurücksetzen eines Passworts, die Identitätsübernahme und der Moduswechsel einem angemeldeten
  `admin_centre` vorbehalten; das Hinzufügen eines Benutzers und die Änderung einer Zeile (Rolle, aktiv) sind nur durch
  die Sperre des Zentrums geschützt (siehe [technische Schuld](../technique/DETTE_TECHNIQUE.md)).

### Gruppenmodus (signiertes Register)

Für eine Fluggesellschaft, die `data/` über Git teilt: Rollen, Konten und Passwörter kommen aus dem **signierten
Benutzerregister** (`data/utilisateurs/_registre.json`). Jeder Browser lehnt ab, was nicht von einem Admin signiert ist:
Eine im Repository geänderte Benutzerdatei („ich gebe mir die Admin-Rolle“) hat keine Wirkung mehr. Entwurf:
[signierte Konten](../technique/COMPTES_SIGNES.md).
- **Status**: Modus (autonom, Gruppe im Aufbau, Gruppe aktiv), akzeptierte Registerversion, bestätigter Gründer,
  Admins und Fingerabdrücke ihrer Geräte, Notfallschlüssel, Fingerabdruck dieses Geräts.
- **„In den Gruppenmodus wechseln“** (Zentrum aktiviert, aktueller Starter: seine Sicherheitsrichtlinie ist
  erforderlich): Sie werden der erste Admin mit dem Schlüssel dieses Geräts; die vorhandenen Benutzerdateien gehen in
  Version 1 des Registers ein. Geben Sie das Passwort des **Notfallschlüssels** zweimal ein: Die Datei
  `sog-cle-secours-<Fingerabdruck>.json` wird heruntergeladen, mit diesem Passwort verschlüsselt. Offline aufbewahren
  (USB-Stick), Passwort getrennt. Senden Sie Ihren Fingerabdruck über einen anderen Kanal an die Piloten (Discord, SMS,
  E-Mail).
- **Gruppe im Aufbau**: Solange es keine zwei Admins mit Geräteschlüssel gibt, bleibt das Zentrum per Passwort
  zugänglich. Sobald die Gruppe aktiv ist, geht der Zugang zum Zentrum über den Geräteschlüssel eines Admins.
- **Rolle, Status oder Passwort ändern** (Benutzer und Rechte) veröffentlicht eine neue Version, mit dem Schlüssel
  dieses Geräts signiert: einem Admin des Registers vorbehalten; sonst sagt es die Meldung und nichts wird geschrieben.
- **„Neuer Notfallschlüssel“** (Admin) ersetzt den Notfallschlüssel; **„Zurück zum autonomen Modus“** (Admin): Das
  Register bleibt in den Daten, wird aber nicht mehr gelesen.
- **„Notfallschlüssel verwenden“** (Rubrik auch bei gesperrtem Zentrum offen): Datei, Passwort und Kürzel; dieses
  Kürzel wird Admin mit dem Schlüssel dieses Geräts. Für Admins, die ihr Gerät verloren haben.
- **„Gruppe neu gründen“** (letzter Ausweg, alle Schlüssel verloren): neues Register, neuer Notfallschlüssel; jedes
  andere Gerät muss Ihren Fingerabdruck bestätigen.
- **Abgelehnte Versionen**: Eine schlecht signierte, nicht verkettete oder ältere Version wird abgelehnt; das Gerät
  behält seine, eine Meldung und diese Rubrik sagen es.
- Beim ersten Lesen des Registers zeigt ein Gerät den Fingerabdruck des Gründers mit „Bestätigen“ und „Ablehnen“:
  vor dem Bestätigen mit dem erhaltenen vergleichen.
- **Zugangsanfragen der Geräte**: Ein Pilot beantragt den Zugang unter Mein Profil › Dieses Gerät, auf einem Gerät mit
  Starter wie in der App ohne Starter (Telefon); die Anfrage ist eine mit dem Schlüssel seines Geräts signierte Datei
  (`data/utilisateurs/demandes/`). Die Rubrik zeigt Kürzel, Gerätename, Datum und den von Ihrer Seite neu berechneten
  Fingerabdruck („neuer Benutzer“, wenn das Kürzel noch nicht im Register steht; „ungültige Anfrage“, wenn Signatur
  oder Fingerabdruck nicht stimmen). Vergleichen Sie den Fingerabdruck mit dem, den der Pilot Ihnen über einen anderen
  Kanal gegeben hat, dann **„Genehmigen“** (neue Registerversion mit seinem Schlüssel, Benutzer bei Bedarf mit der
  Benutzerrolle angelegt) oder **„Ablehnen“** (Anfrage entfernt). Eine Anfrage kann von jedem mit Zugang zum Repository
  kommen: Nur der Fingerabdruck beweist das Gerät.
- **Geräteschlüssel**: jeder Schlüssel des Registers, nach Benutzer; **„Widerrufen“** (Admin) veröffentlicht eine
  Version ohne ihn: Seine späteren Signaturen werden abgelehnt, das Gerät muss neu beantragen. Einen Benutzer
  deaktivieren (Benutzer und Rechte) widerruft alle seine Schlüssel. Der letzte Admin mit Schlüssel kann ihn nicht
  verlieren, eine aktive Gruppe nicht unter zwei Admins mit Schlüssel fallen.
- **„Gruppe aktivieren“**: Die Karte erscheint erst, wenn zwei Admins einen Geräteschlüssel haben (ein zweiter Admin:
  Rolle „Administrator des Zentrums“ unter Benutzer und Rechte, dann seine Anfrage genehmigt). Bis dahin ändert sich nichts
  und nichts wird ignoriert. Sobald die Gruppe aktiv ist: Das Zentrum öffnet nur noch per Admin-Schlüssel (das Passwort
  zählt nicht mehr); unsignierte Daten bleiben 30 Tage mit dem Vermerk „unsigniert“ akzeptiert und werden danach
  ignoriert (signierte Zuweisungen: nächstes Paket).
- App ohne Starter (GitHub-Modus): Ein neues Gerät folgt der Registerkette über den Verlauf des Repositorys
  (Commits-API); Anfragen, Genehmigungen und Widerrufe sind dort Commits. In den Gruppenmodus wechseln oder neu gründen
  erfordert ein Gerät mit Starter.

### Verfügbarkeitskategorien

Diese Rubrik legt fest, was die Piloten als Verfügbarkeiten angeben können (`data/config/disponibilites.json`, synchronisiert).

| Spalte | Verwendung |
|---|---|
| id | Kennung, nach dem Speichern der Kategorie fest; bei einer neuen Kategorie einzugeben |
| Gruppe | in der ODV angezeigte Gruppe (Verfügbar, SOG-Übung, Belegt, Nicht verfügbar…) |
| Bezeichnung, Farbe | Bezeichnung **nur auf Französisch**, Farbe des Felds |
| Offene Themen | „alle Themen“, „keins“, „Bereich …“, „… nach Präferenzen, aus …“, oder „Themenliste“ (freies Feld, Themen durch Leerzeichen getrennt) |
| Typ | verfügbar, Fluglotse, belegt, nicht verfügbar |
| ODV-Codes | Codes der Arbeitsmappe, die beim Import als diese Kategorie gelesen werden, durch Leerzeichen getrennt; der erste erscheint im Raster |
| Zurückgezogen | Kontrollkästchen: Die Kategorie wird in den Listen ausgeblendet, bleibt aber für den Verlauf erhalten |

- Eine bereits verwendete Kategorie wird nicht gelöscht: Sie wird **zurückgezogen**. Nur eine neue, noch nicht gespeicherte Kategorie kann mit „✕“ gelöscht werden.
- „Kategorie hinzufügen“, dann „Speichern“. Das Speichern wird abgelehnt, wenn eine Kennung leer oder doppelt ist oder eine französische Bezeichnung fehlt.
- Weiter unten: „Gruppen (ODV)“ (Bezeichnung, Farbe) und „Themen je Bereich“ (Missionsfamilien durch Leerzeichen getrennt).
- Übersetzungen: Ändern Sie eine französische Bezeichnung, verliert sie ihre englische, deutsche und spanische Übersetzung bis zum nächsten Übersetzungsaudit (`tools/audit_i18n.html`).
- „Standardwerte“ stellt die ursprünglichen Kategorien wieder her. Hinzugefügte Kategorien bleiben erhalten, werden aber zurückgezogen.
Siehe auch [Verfügbarkeiten und Umorganisation](../technique/DISPOS_ET_REORGANISATION.md).

### ODV-Planung

Diese Rubrik enthält die spezifischen Einstellungen der Seite ODV-Planung. Sie bleiben in diesem Browser und werden nicht synchronisiert. Eine in einem anderen Tab geöffnete ODV-Seite übernimmt sie sofort.

| Einstellung | Standard |
|---|---|
| Zeitfenster (Uhrzeit z): Morgen, Nachmittag, Abend | 8 bis 12, 12 bis 18, 18 bis 23 (in halben Stunden; das Ende muss nach dem Beginn liegen) |
| Bevorzugtes Land (ATC-Bereich) | „Frankreich (Mutterland)“; ATC-Sitzungen (Trainings, Prüfungen, Buchungen) nur für dieses Land importiert und gezeigt, ODV-Planung und Einsatztafel (ICAO-Kennungen des Landes: LF außer LFV für Frankreich) |
| Daten der Woche | „ISO-Woche (Wochennummer der Datei)“; sonst „Auf der Zeitleiste eingetragenes Datum“ |
| Leeres Feld | „Nicht ausgefüllt“ (nie als verfügbar gezählt); sonst „Nicht verfügbar“ |
| Für die Rollen berücksichtigte FLOTTE-Typen | „Alle außer rot (NQ: besessen, nicht qualifiziert)“; „Nur grün (beherrscht)“; „Alle“ |
| Pro Zeitfenster gezeigte Missionen | 3 (von 1 bis 10) |
| Vorzugsreihenfolge bei gleicher Punktzahl | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (unbekannte Familien werden mit einer Warnung ignoriert) |
| Eingeschränkter Code (SC, C, T, N): nur Rollen seines Bereichs | angehakt |
| Eine an allen 7 Tagen eines Zeitfensters gefärbte Gruppenzeile ignorieren (Gestaltung) | angehakt |

Jede Änderung wird sofort gespeichert. „Standardeinstellungen“ stellt alle obigen Werte wieder her.

### Einsatztafel

Diese Rubrik stellt die Seite Einsatztafel ein (`data/config/odv.json`, synchronisiert).

| Einstellung | Verwendung |
|---|---|
| Flugplatz (ICAO) | Luftfahrttag und -nacht auf der Zeitleiste |
| Standardnetzwerk der Flüge | IVAO oder VATSIM, für den Status der Gebietsaktivierungen |
| Frist ohne Bericht bis MNE (Stunden) | standardmäßig 48 |
| Angezeigte Tage, Dienstzeiten | 7 Tage, 06:00 bis 23:00 z; für Zeitleiste und Statistik |
| Vorlagen für Flüge, Sonstiges, Lotsendienst | Bezeichnung, Dauer, Farbe, gefüllt; „Farbe des Rufzeichens“: der Streifen nimmt die Farbe seines Rufzeichens an |
| Farben der Rufzeichen | Präfix (das längste im Rufzeichen enthaltene gewinnt), Füllung, Rahmen |
| Luftfahrzeugkonfigurationen | Text (KNON, TALIOS…), Farbe; in der Luftfahrzeugtabelle eines Flugs vorgeschlagen |
| LL-/RTBA-Zeitfenster (Ersatz) | Name, Beginn, Ende, Tage, Farbe, Gebiet der Datenbank |
| Personal | Gruppe Stab oder Mitglieder, Farbe, Reihenfolge in der Palette |
| Wiederholungen | wiederholte Elemente; „✕“ beendet eine Wiederholung |

„Speichern“ schreibt die Einstellungen; „Standardwerte“ stellt die ursprünglichen Einstellungen wieder her, außer Personal, Rufzeichenfarben, LL-Zeitfenstern und Wiederholungen.

### Berichtsversand (Webdienst)

Diese Rubrik stellt die Schaltfläche „Bericht senden“ der Eingabeseiten ein. Sie sendet ein JSON-POST (Mission, Bericht als HTML und als Text, Berechnungen) an die angegebene Adresse.
- Felder: „Adresse des Webdienstes (https://…)“, „Schlüssel-Header“ (standardmäßig `Authorization`), „Präfix (Bearer, leer für den reinen Schlüssel)“, „Schlüssel“.
- Die Adresse muss mit `https://` beginnen, außer `http://localhost` oder `127.0.0.1` für Tests.
- Der Schlüssel bleibt in diesem Browser (`missionSendKey:v1`) und gelangt nicht in die Sicherungen. „Schlüssel vergessen“ löscht ihn.
- Der Dienst muss Aufrufe von der Adresse der Suite annehmen (CORS).
- Die Statuszeile zeigt die Anzahl der von diesem Browser gesendeten Berichte.
Details: [Betriebshandbuch](../MANUEL_EXPLOITATION.md), § 10.

## Einstellungen › Installation
<!-- page: apps/settings/installation.html -->

Diese Seite vereint die einmalig vorzunehmenden Einstellungen: lokale Ordner, externe Quellen, virtuelle Fluggesellschaft, Luftfahrtdaten und Luftfahrzeugtypen.
Zum Öffnen: Seitenleiste › „Einstellungen“, dann der Reiter „Installation“. Dieser Reiter erscheint ab der Nutzungsstufe Planung (2); eine direkte Adresse zu einem seiner Abschnitte öffnet ihn auf jeder Stufe.
Das Seitenmenü hat eine einzige Gruppe, „Ordner und Quellen“: „Quellen und Ordner“ (von Anfang an geöffnet), „Schlüssel und externe Dienste“, „Luftfahrtdaten“ und „Luftfahrzeugtypen“.
Der Erststart hat einen eigenen Reiter, „Erststart“, beschrieben im [Benutzerhandbuch](MANUEL_UTILISATEUR.md#erststart); „Bereinigen und neu beginnen…“ steht unten auf jener Seite. Siehe auch [Installation](../INSTALL.md), § 1.
Diese Rubriken werden der Seite durch `config/repository_tree` zugeordnet (Schlüssel `settings.sections`: `sources` und `keys` → installation; `sia` und `types` → installation,maintenance, also auf beiden Seiten: Einrichtung hier, Aktualisierung unter Wartung, dieselben Blöcke). Alle anderen Wartungsrubriken öffnen sich auf der Seite Wartung.

Im GitHub-Modus (App ohne Starter: Website, iOS-App; Datenzugang unter Mein Profil › Datenzugang eingestellt) zeigt Installation nur die Karte „Datenzugang“: Daten-Repository (Link `https://github.com/<Repository>`) und Zweig, Zugangsstatus (Token-Prüfung), letzte erfolgreiche Lesung, im Postausgang des Browsers wartende Schreibvorgänge (Schaltfläche „Synchronisieren“ zum Senden), die aus dem Repository gelesene Luftfahrzeugtypen-Datenbank, ein Link zur Website der virtuellen Fluggesellschaft und ein Link zu Mein Profil › Datenzugang. Lokale Ordner, IVAO-Schlüssel und SIA-Import werden an einem Rechner mit Starter eingestellt: Die Karten „Quellen und Ordner“, „Schlüssel und externe Dienste“, „Luftfahrtdaten“ und „Luftfahrzeugtypen“ sowie der Reiter „Erststart“ werden nicht angeboten. Der Modus hängt nur von der Datenzugangs-Einstellung ab, nicht vom Gerät: Die Karte ist in einem Desktop-Browser dieselbe. Auf der Seite Wartung bietet dieser Modus nur, was ohne Starter und Ordner funktioniert: Versionen, Luftfahrtdaten (die von einem Arbeitsplatz mit Starter im Datenrepository veröffentlichte Datenbank: Zonen, Zyklus, „Veröffentlichte Basis neu lesen“), Caches und Speicher des Browsers, Sicherung des Browsers (heruntergeladenes Archiv, kein Sicherungsordner) und Protokoll; Aktualisierungen, Referenzen und Abhängigkeiten sowie Luftfahrzeugtypen werden nicht angeboten. Ordner, die dieser Browser von einer früheren Nutzung mit Starter gemerkt hat, werden ignoriert: Die Daten kommen aus dem GitHub-Repository. Wird die Seite vom Starter bereitgestellt (GitHub-Modus in demselben Browser eingestellt), zeigt Wartung alle Karten mit ihren Knöpfen, auf „Luftfahrtdaten“ und „Luftfahrzeugtypen“ mit dem Satz „GitHub-Modus in diesem Browser aktiv: Die gelesenen Daten kommen aus dem Repository, Veröffentlichungen erfolgen an diesem Arbeitsplatz (Starter).“

### Quellen und Ordner

Diese Rubrik ist der einzige Ort, an dem die lokalen Ordner und die Adressen der externen Quellen eingestellt werden.
- **Erststart** (Ankunft aus dem Starter): Ein Kasten bittet darum, die erste Zeile zu wählen, „Repository-Ordner“. Die anderen Ordner werden daraus abgeleitet.
- **Lokale Ordner**: Jede Zeile hat ihre Auswahlschaltfläche und einen Zustand („nicht gewählt“, „erlaubt“, „erneut erlauben“). Eine Prüfung meldet einen Ordner, der nicht der richtige zu sein scheint (Markierungsdatei fehlt). Der Browser speichert die Erlaubnis, kann aber nach einem Neustart eine Bestätigung verlangen.
- **Ordnerhinweis**: Kann die Suite nicht prüfen, ob der freigegebene Datenordner zur ausgelieferten Suite gehört, weist ein einmaliger Hinweis darauf hin (Lesen und Schreiben erfolgen dann in diesem Ordner); bleibt eine Speicherung im Browser, weil sie nicht geschrieben werden kann, nennt der Hinweis den tatsächlichen Grund.

| Ordner | Erwarteter Inhalt |
|---|---|
| Repository-Ordner | Stammverzeichnis der Anwendung (enthält `lancer.cmd`, `config/repository_tree`) |
| Datenordner | `data/` (enthält `data_tree.js`) |
| „Abgeleitete Ordner (3)“, zugeklappt: Register, Missionen, SIA | `data/cr`, `data/missions`, `data/sia`, mit dem Datenordner eingestellt |
| Ordner der ODV-Arbeitsmappe | synchronisierter Ordner (OneDrive…), in dem die Staffel die `.xlsx` ablegt |
| X-Plane (zweite Zeile: „Landeprotokolle: anderer Ordner…“), Ordner Leistungsdaten, Ordner der lokalen Sicherung | Installationsordner von X-Plane (Navigationsdaten `earth_*.dat`, Custom Data; CSV-Landeprotokolle, sofern kein anderer Ordner gewählt ist), Profile `.lnmperf` / `.json` (von Kraftstoff, Block „Leistungsprofile“, neu gelesen, sobald sich der Ordner ändert), `defa_local_store.yaml`; optional, als „optional, nicht gewählt“ (Information) angezeigt, solange nicht gewählt |

- **Externe Quellen**: Die Standardadresse wird grau angezeigt. Ein eingegebener Wert gilt nur für diesen Browser; „↺“ kehrt zum Standardwert zurück, und „Öffnen ↗“ öffnet die Adresse.
- **API-Schlüssel (externe Dienste)**: Verweis auf die Rubrik „Schlüssel und externe Dienste“, den einzigen Ort der Schlüssel der Suite.
- **Websites, die die Suite kontaktieren darf**: feste Liste (Karten, Netzwerke, Wetter, SimBrief) und Adressen der Konfiguration, dazu die auf diesem Rechner erlaubten Websites („Entfernen“); eine Website wird über „Diese Website erlauben…“ in der Sperrmeldung hinzugefügt und im Fenster des Starters bestätigt (in secrets/sites.json gespeichert).
- **Schreibgeschützte Ordner**: Anwendungsordner, X-Plane-Ordner, ODV-Arbeitsmappe und zur Sicherung hinzugefügte Ordner sind zum Lesen erlaubt („erlaubt (lesen)“); Schreiben wird erst bei einer Aktion verlangt, die es braucht (Wiederherstellung, „Im Repository speichern“ für AircraftDB). Die Daten (`data/` und Unterordner) sind zum Schreiben erlaubt.
- **Öffnen von einer anderen Website oder Erweiterung**: standardmäßig abgelehnt (eine Seite der Suite, die über einen Link einer anderen Website oder eine Erweiterung wie Claude in Chrome geöffnet wird, zeigt „Suite page opened from another website: refused“). „Bis zum Schließen des Starters erlauben…“ erlaubt es nach Bestätigung im Fenster des Starters; ein roter Knopf „⚠ Schutz verringert — wiederherstellen“ bleibt dann in der Kopfzeile jeder Seite. Daten, Skripte und Einstellungen des Starters bleiben für andere Websites gesperrt.
- **Virtuelle Fluggesellschaft**: „Name“, „Vollständiger Name“, „Kürzel“, „Zentrum (Kürzel)“, „Zentrum (voller Name)“, und die Seiten der Website („Startseite“, „Flugbuch“, „Flotte“, „Flugzeugseite“). Ein leeres Feld behält den Standardwert. „Zurück zu SO Group Virtual“ löscht alle diese Einstellungen.
- **Erststart**: „Ersten Start erneut öffnen“. Um bei null anzufangen, steht „Bereinigen und neu beginnen…“ unten auf der Seite des Erststarts (Abschnitt „Neu beginnen“).

### Schlüssel und externe Dienste

Ein Ort für die Schlüssel der Suite, für alle ihre Benutzer: eine Karte pro Dienst. Anderswo (Erststart, Berichte,
Einsatztafel, ODV-Planung) zeigt die Suite nur den Status des Schlüssels und verweist hierher.
- **IVAO**: API-Schlüssel der Suite (developers.ivao.aero). Er wird vom Starter gehalten (`secrets/ivao.json` im
  Anwendungsordner, von Git ausgeschlossen, außerhalb der Daten und Sicherungen); die Seite sieht nur seinen Status:
  „gespeichert am … UTC (…abcd)“, „fehlt“ oder „Umgebungsvariable IVAO_API_KEY“ (vorrangig, hier nicht änderbar).
  „Speichern“ ersetzt den Schlüssel und testet ihn; „Testen“ macht einen Kontrollaufruf („OK: Schlüssel von IVAO
  akzeptiert, N Tracker-Sitzungen der letzten Stunde gelesen“ oder „Schlüssel abgelehnt“); „Entfernen“ löscht ihn
  nach Bestätigung. „Dient für“: Bericht › Aus meinem letzten Flug vorausfüllen, Einsatztafel (IVAO-Aktivierungen und
  ATC-Sitzungen), ODV-Planung (IVAO-ATC-Sitzungen).
- **VATSIM**, **SimBrief**: kein Schlüssel (öffentliche APIs); die Karte nennt die Verwendung und verweist für CID
  und SimBrief-Kennung auf Mein Profil.
- **Website der Fluggesellschaft**: kein Schlüssel und kein Passwort (der Starter liest die öffentlichen Seiten);
  Adresse unter Quellen und Ordner, Kennung unter Mein Profil.
- **Webservice für den Berichtsversand**: sein Schlüssel bleibt in diesem Browser, eingestellt unter Einstellungen ›
  Zentrum › Berichtsversand (Link); die Karte zeigt, ob er gespeichert ist.

Ein fehlender oder von IVAO abgelehnter Schlüssel (401 / 403) wird dort gemeldet, wo er gebraucht wird
(„IVAO-Schlüssel von IVAO abgelehnt: unter Einstellungen › Installation › Schlüssel und externe Dienste ersetzen“),
mit dem Link „Schlüssel öffnen ↗“.

## Einstellungen › Wartung
<!-- page: apps/settings/maintenance.html -->

Diese Seite dient der Pflege der Suite: Updates, Versionen, SIA-Daten, Caches, Sicherungen und Referenzdatenbanken.
Zum Öffnen: Seitenleiste › „Einstellungen“, dann der Reiter „Wartung“. Die Seite öffnet sich auf „Updates“. Dieser Reiter erscheint nur auf der Nutzungsstufe Experte (4); eine direkte Adresse zu einem seiner Abschnitte öffnet ihn auf jeder Stufe.
Das Seitenmenü hat drei Teile:
- die Gruppe „Wartung“: Updates, Versionen, Referenzen und Abhängigkeiten, Luftfahrtdaten, Luftfahrzeugtypen;
- die Gruppe „Speicher und Sicherung“: Caches, Speicherplatz, Vollständige Sicherung, Protokoll;
- die Datenbanken, geordnet in den Gruppen „Dateien des Repositorys“, „Referenz und Flugbuch“, „Missionen“ und „Browserdaten“. Diese Gruppen erscheinen nur auf der Stufe Experte.

### Aktualisierungen der Suite

Dieser Block legt fest, woher die Code-Updates kommen und wann die Suite nach ihnen sucht.
- **Kanal**: `master` (stabil, veröffentlichte Versionen) oder `develop` (Early Bird, neueste Entwicklungen vor der Veröffentlichung).
- **Modus**: „Manuell“ (Schaltfläche „Jetzt prüfen“); „Automatisch, regelmäßig“, bei jedem Öffnen, täglich, wöchentlich, bei jedem AIRAC-Zyklus oder monatlich; „Deaktiviert“ (keine Prüfung, kein Hinweis).
- Die Prüfung fragt framagit ab. Gibt es eine Neuerung, erscheint ein Hinweis „Update“ im Kopf aller Seiten.
- **Update anwenden**: Eine Webseite kann das Repository nicht umschreiben. Kopieren Sie die Befehle (Schaltfläche „Kopieren“) und führen Sie sie in einem Terminal im Stammverzeichnis aus: `python tools/update_suite.py channel <canal>`, dann `python tools/update_suite.py update`. Für eine Diagnose: `python tools/update_suite.py doctor`.
- `update` verweigert die Ausführung, wenn verfolgte Dateien geändert sind, geht nur per Fast-Forward vor und protokolliert jeden Vorgang.
- **Lokales Git-Repository**: Wählen Sie den „Repository-Ordner“, dann „Git-Status lesen“. Die Tabelle zeigt Branch, HEAD, origin, Tracking, master / develop, den letzten Fetch und den von Git gespeicherten Kanal. Eine Abweichung vom gewählten Kanal wird gemeldet.
- Eine Installation per ZIP-Archiv hat kein `.git`: Sie wird mit einem neuen Archiv aktualisiert.

### Versionen und Synchronisation

Diese Tabelle nennt Version und Aktualisierungsdatum jedes Elements, mit einem Zustand (✓, ⚠, ✗) und der Quelle oder dem Werkzeug zur Aktualisierung.
- Code: Suite (`repository_tree`), Cache-Version der Skripte, Git, entfernter Kanal.
- SIA / AIRAC: gültiger und nächster Zyklus, Datenbank des Kartenstudios, Ordner SIA XML, `mora.csv`, AAR-Achsen (ENR 5.7).
- Referenzdatenbanken: ICAO-Muster, APD-Leistungsdaten, Flotte, Referenz, Rufzeichen.
- Benutzerdaten: SimBrief-Flugpläne, Profile des Planers, Berichtsregister, Register der erzeugten Missionen, Landeprotokolle, lokale Daten, letzte vollständige Sicherung.
- „Aktualisieren“ liest den Git-Status und den SIA-Ordner neu.
- Eine Warnung erscheint, wenn die lokalen Daten seit mehr als 7 Tagen nicht gesichert wurden oder es seit mehr als 30 Tagen keine vollständige Sicherung gab.

### Referenzen und Abhängigkeiten

Dieser Block beschreibt jede Referenz der Suite:

| Spalte | Inhalt |
|---|---|
| Referenz, Datei | die Referenz und ihre Datei |
| Nachverfolgung | wie die Version nachverfolgt wird |
| Aktualisierung | Aktualisierungsverfahren |
| Abhängige | Daten, die davon abhängen |
| Prüfung | geprüfte Konsistenz |

Verfolgte Referenzen: SIA-XML, analysierte Datenbank des Studios, MORA-Raster, AAR-Achsen, APD-Leistungsdaten, Flotte, Profile des Planers und Missions-Prompt.
Beispiele für Prüfungen: gemischte Zyklen in der SIA-Datenbank, MORA-Hindernisse eines anderen Zyklus, Flottenmuster, die in der ICAO-Datenbank fehlen, neu zu erzeugender Prompt (`python tools/build_mission_prompt.py`).
Die Schaltfläche „Prüfen“ startet die Prüfungen erneut.

### Luftfahrtdaten: Zonen der Welt, Quellen und AIRAC-Zyklen

**Zonenkarte**: eine Zone pro Land (Frankreich umfasst Mutterland und Überseegebiete, Abdeckung des SIA), dazu eine ozeanische Zone, „Nordatlantik (ozeanisch, NAT)“, deren Quellen X-Plane (ozeanische Punkte und Strecken, außerhalb jedes Landes) und die NAT-Tracks des Tages sind. Beim Überfahren erscheinen ihre Quellen im rechten Feld. **Ein Klick fügt das Land der Auswahl hinzu, ein weiterer entfernt es** (gewählte Länder blau, dunkel umrandet); die Leiste unter der Karte führt sie auf (zu aktivieren, zu deaktivieren, „Abbrechen“). **„Aktivieren“** übernimmt die Auswahl und erledigt dann von selbst, für alle gewählten noch unvollständigen Länder, alles, was die Suite allein kann: Downloads ihrer Quellen, neueste ZIPs aus „Downloads“ (SIA, NATS…), ein einziger Neuaufbau der Datenbank, dann die MORA jedes Landes ohne MORA — nur wenn die Datenbank neu aufgebaut wurde (doppelte Anzeige: Schritt und Detail; eine fehlgeschlagene Quelle hält die anderen nicht auf; Zusammenfassung als Benachrichtigung). Das Feld eines Landes behält „Zone aktivieren“ / „Zone deaktivieren“ und, für eine aktive Zone, „Alles abrufen und neu berechnen“. Was von Hand bleibt (Bestellung auf der SIA-Website, zu importierendes PDF, X-Plane-Ordner, abzulegende Dateien…), steht unter der Karte, „Zu erledigen“: eine Zeile pro Quelle, mit Link und Schaltfläche; Downloads und MORA, die „Aktivieren“ erledigt, stehen dort in einer einzigen Zeile „automatisch“.
- Farben: nur Umriss = inaktiv, ohne Daten; grau = inaktiv, mit Daten; orange = aktiv, Daten unvollständig; grün = aktiv, alle Daten der angehakten Quellen; hellblau = überfahrene Zone; blau mit dunkelblauem Rand = gewähltes Land („Aktivieren“ zum Übernehmen).
- Jede Quelle wird für ihre Zone angehakt oder nicht; nur die angehakten Quellen der aktiven Zonen gehen in die Datenbank. Eine „Link“-Quelle (PDF oder Informationsseite) wird von der Suite nicht gelesen. **Die Einrichtung macht nur, was fehlt**: Eine aktuelle Quelle wird nicht erneut heruntergeladen („Alles abrufen und neu berechnen“ prüft sie erneut, ohne etwas neu zu schreiben, wenn der Server nichts Neues hat), eine identische Datei wird nicht neu geschrieben, und die Datenbank wird nur neu gelesen, wenn sich eine Datei, eine Zone oder eine Quelle geändert hat; ohne Neues erneut gestartet, lädt, schreibt und berechnet sie nichts. **„Zone leeren…“** (Zone mit Daten) löscht nach Bestätigung ihre Dateien aus dem SIA-Ordner (für Frankreich: die SIA-XML und die ENR-5.7-Strecken) und ihre Felder aus `mora.csv` (alte Datei in `_archives/`), deaktiviert sie und liest die Datenbank neu; der X-Plane-Ordner wird nicht berührt. Eine neue Aktivierung installiert alles neu.
- Je nach Quelle bietet das Feld:
  - einen direkten Download über den Starter (`tools/aero_fetch.py`): openAIP (jedes Land), ENAIRE (Spanien), FAA (USA: Militärgebiete und -routen, Luftraumklassen), britisches Militär-AIP (ENR 5.2, offizielles PDF, vom Starter gelesen: Tieffluggebiete, VATA, Ausweichgebiet TVAA, Betankungsstrecken AARA zusätzlich zu denen der DIRCAM), NAV CANADA (Designated Airspace Handbook, gültige Ausgabe vom Starter gelesen: Gefahren-, Beschränkungs- und Advisory-Gebiete Kanadas, alle 56 Tage neu herunterzuladen), NAT-Tracks des Tages (Zone Nordatlantik: von der FAA veröffentlichte Meldung von Shanwick und Gander, vor jedem Transatlantikflug neu herunterzuladen, da sich die Tracks zweimal täglich ändern; „alt“ nach 12 Stunden; benannte Punkte nach der X-Plane-Quelle der Zone platziert);
  - eine Bestellung oder Registrierung, mit Link und Anleitung: SIA Frankreich (Bestellung zu 0 €, bei jedem Zyklus erneut), NATS (Vereinigtes Königreich, Datei in `data/sia/zones/gb/` abgelegt);
  - ein PDF, mit Link und Anleitung: DIRCAM / MILAIP ENR 5.7 (Betankungsstrecken);
    DIRCAM: „MILAIP-PDF importieren…“ liest das PDF des Abschnitts ENR 5.7 (pdf.js, Netz beim ersten Import), zeigt die Zahl der Strecken und die gefundenen Auffälligkeiten, dann legt „miam-enr-5-7-tracks.xml schreiben“ die Datei im SIA-Ordner ab (alte in `_archives/`) und aktualisiert die Datenbank („Abbrechen“ während des Lesens: nichts wird behalten oder geschrieben);
  - einen Ordner des Rechners: X-Plane (Funkfeuer, Punkte, Luftstraßen, MORA-Gitter, zugeschnitten auf die aktiven Zonen, die es angehakt haben);
  - eine Berechnung: die MORA der Zone. Eine sehr große Zone (mehr als 1500 Ein-Grad-Felder: Vereinigte Staaten, Kanada…) nimmt standardmäßig die MORA von X-Plane; „Vollständige Berechnung…“ berechnet sie in 10°-Blöcken nach einer Bestätigung, die den Umfang nennt (offene AWS-Reliefkacheln, um 100 m erhöht, ohne OpenStreetMap-Abfrage): Jeder Block wird sofort in `mora.csv` geschrieben, „Anhalten“ zwischen zwei Blöcken, später „Vollständige Berechnung fortsetzen…“.
- SIA Frankreich (Zone Frankreich): „Heruntergeladenes ZIP holen“ (der Starter nimmt es aus dem Download-Ordner), „SIA-Export-ZIP…“, „… entpacken“, wenn es schon im Ordner liegt, „Alte Zyklen archivieren“ (`_archives/`); „Inhalt des SIA-Ordners“ listet die Dateien des Zyklus.
- Der SIA hat Vorrang: in den französischen FIR zählen nur seine Lufträume; anderswo wird ein bereits gelesener Luftraum, Flugplatz oder Funkfeuer nicht doppelt aufgenommen. Außerhalb Frankreichs erscheinen von einer Mission geschnittene R-, D-, TRA-, TSA-, MOA-, W-, A-Gebiete und MTR-Routen in ihren zu aktivierenden Lufträumen.
- Die Website-Adressen (SIA, DIRCAM, NATS, britisches Militär-AIP, NAV CANADA) werden unter Einstellungen › Installation › Quellen und Ordner › Externe Quellen eingestellt; die SIA- und X-Plane-Ordner dort sind dieselben wie hier.

**Luftfahrtdatenbank: Quellen, Zyklen und Neuaufbau**: gültiger Zyklus, nächster Zyklus und Zyklus der Datenbank, dann eine Tabelle aller angehakten Quellen der aktiven Zonen (Zone, Quelle, Dateien, Zyklus oder Datum, Alter, Größe, Status). Ein Klick auf eine Zeile heftet ihre Zone an und aktualisiert die Quelle (Download, SIA-ZIP, MILAIP-PDF-Import, X-Plane-Ordner, MORA der Zone). Oben in der Tabelle: die Zahl der Prüfungen ohne Befund, dann die Probleme (fehlende Quellen) und die Warnungen (alte); „Probleme anzeigen“ behält nur diese. Die Tabelle ist nach Status sortiert (Probleme zuerst) und nach Spalten sortierbar.
„Alles neu berechnen“ baut die Datenbank mit allen aktiven Zonen neu auf (einige Sekunden; der Browser kann nach der Erlaubnis für den Ordner fragen); „Cache leeren“ leert sie. Derselbe Block wie im Kartenstudio.
Status der Tabelle:
- SIA: Zyklus aus den Dateinamen, „alt“, wenn er vor dem gültigen Zyklus liegt;
- X-Plane: Zyklus von „Custom Data“;
- heruntergeladene Dateien: „alt“ nach 28 Tagen (ein AIRAC-Zyklus) seit dem Herunterladen oder der letzten Prüfung ohne Änderung.

**Im Datenrepository veröffentlichte Datenbank**: Bei jedem Neuaufbau wird die Datenbank auch Zone für Zone in den Datenordner geschrieben, `data/sia/base/<zone>/<zyklus>.json` (eine Zone, JSON im Klartext: einige hundert KB bis etwa 5 MB für Frankreich), und die Städte in `data/sia/base/cities.json`. Eine Datei wird nur neu geschrieben, wenn sich ihr Inhalt ändert; ältere Zyklen der Zone werden entfernt. Der Bericht des Neuaufbaus sagt, was veröffentlicht wurde; „Synchronisieren“ sendet es. Der Datenordner muss freigegeben sein (Installation › Quellen und Ordner), sonst sagt der Bericht, warum die Datenbank nicht veröffentlicht wurde. Telefone und die Website (GitHub-Modus) lesen diese Dateien: Sie haben weder SIA-Ordner noch Neuaufbau, aber dieselbe Datenbank wie der Arbeitsplatz, der sie veröffentlicht hat. Dieselbe Veröffentlichung schreibt auch die nach Art aufgeteilte Datenbank, die die V3 liest: `data/sia/base/<zone>/<zyklus>/` (eine Datei pro Art: Lufträume, Flugplätze, Funkfeuer, Punkte, VRP, Luftstraßen, Hindernisse, MORA, Städte der Zone…), die großen Städte der Welt (`data/sia/base/cities_major.json`, über 100 000 Einwohner) und die Übersicht der veröffentlichten Zonen (`data/sia/base/index.json`); eine Seite liest nur, was sie anfragt (die Flugplätze Frankreichs: etwa 400 KB statt 5,5 MB). Beide Formate werden während des Übergangs geschrieben.

**MORA**: mehrere Quellen.
- Das berechnete Gitter (`data/sia/mora.csv`) hat Vorrang. „Einfache Neuberechnung“ übernimmt die Hindernisse des neuen Zyklus (offline); „Vollständige Berechnung“ berechnet Gelände und Gipfel neu (Netz, etwa eine Minute) für Einsatzräume und Missionen; „MORA der Zone berechnen“ (Feld) tut es über die Ausdehnung einer Zone, die übrigen Zellen bleiben.
- Wenn sich Zellen ändern: „mora.csv schreiben (alte archiviert)“, dann das Daten-Repository committen.
- Anderswo ergänzt das MORA-Gitter von X-Plane, wenn die Quelle X-Plane angehakt ist.

Methode des berechneten Gitters: für jedes Feld von 1° × 1° der höchste Punkt aus Gelände (AWS-Terrarium-Höhenkacheln), OpenStreetMap-Gipfeln und Hindernissen der AIXM des SIA, plus 1000 ft (2000 ft oberhalb von 5000 ft), auf das nächste volle Hundert aufgerundet; ohne die OSM-Gipfel wird das Gelände um 100 m erhöht. Abgedeckte Einsatzräume: métropole, Corse und Übersee, dazu die Ausdehnung der anderswo gelegenen Missionen des Registers (nur Gelände und Gipfel). Auf den Karten steht der Wert in der Mitte des Felds in ICAO-Schreibweise (3⁵ = 3500 ft); beim Herauszoomen werden die Felder zu 2 × 2, dann 4 × 4 zusammengefasst (höchster Wert). Die Karte ENR 6.1 des SIA dient nicht als Quelle (unregelmäßige Zonen).

**Konsistenz**: „Prüfen“ kontrolliert Lufträume, Luftfahrzeuge, Flotte, Leistungen und Flugplätze der Missionen.
Die AIRAC-XML-Dateien (etwa 80 MB pro Zyklus) bleiben außerhalb des Repositorys, wie die Dateien der anderen Quellen. Die MORA-Werte sind berechnet, nicht zertifiziert.

**VFR-Meldepunkte der VAC-Karten.** Die Karte kann für jeden Flugplatz seine Meldepunkte, die Sequenzen und die Hinweise seiner VAC-Karten zeigen, die `tools/report-vfr/refresh_vfr.py` aus den PDF entnimmt (auf diesem Rechner, mit dem optionalen Python-Modul `pypdf`: `python -m pip install -r tools/report-vfr/requirements-vfr.txt`). Bei jedem neuen VAC-Zyklus: `sourceDirectory` in `tools/report-vfr/config.json` auf den Ordner der neuen VAC setzen und `python tools/report-vfr/refresh_vfr.py --config tools/report-vfr/config.json` ausführen (Anleitung in `tools/report-vfr/`), dann in diesem Abschnitt „VFR-Zusammenstellung (VAC) importieren…“ (Stufe Experte) und die erzeugte `vfr-compiled.json` wählen. Die Seite prüft sie (beim kleinsten Fehler wird nichts geschrieben, die Fehlerliste wird gezeigt), gleicht ihre Punkte mit den VRP der Datenbank ab, zeigt die Zusammenfassung (Flugplätze, Punkte, nicht abgeglichene Punkte, Sequenzen, Seiten mit Hinweisen, geänderte Dateien) und fragt nach Zustimmung; dann schreibt sie je Flugplatz eine Datei in `sia/vfr/` des Datenrepositorys und synchronisiert. Diese Daten bleiben Kandidaten: die Karte kennzeichnet sie als „aus den VAC entnommen, zu prüfen“ und zeigt sie nie als veröffentlichte Routen.

### Caches

Dieser Block leert die Daten, die die Suite wieder aufbauen kann. Keine Benutzerdaten werden berührt (Register, Entwürfe, Profile, OFP, Sicherungen).

| Cache | Nach „Leeren“ |
|---|---|
| Datenindex (IndexedDB `defaIndex`) | gelöscht, dann beim nächsten Laden der Seiten aus den Dateien neu aufgebaut |
| Verwendete Flugplätze | bei der nächsten Verwendung aus der weltweiten Datenbank neu gelesen |
| Weltweite Flugplatzdatenbank (jsDelivr) | Leerung des CDN angefordert, dann Datei neu geladen |
| Analysierte SIA-Datenbank | aus dem SIA-Ordner neu einzulesen (eine Bestätigung wird verlangt) |
| Update-Prüfung | bei der nächsten Prüfung neu gelesen |
| Dateien der Anwendung (HTTP-Cache) | „Ohne Cache neu laden“: Dateien neu geladen, dann Seite neu geladen |

Leeren Sie den „Datenindex“, wenn eine Seite nach einer außerhalb der Suite, ohne den Starter, vorgenommenen Dateiänderung veraltete Daten anzeigt.
„Alles leeren und neu laden“ führt nach Bestätigung alle Leerungen nacheinander aus.

### Speicherplatz

Dieser Block erscheint nur, wenn das Zentrum aktiviert ist.
- „Belegten Platz berechnen“ misst den Missionsordner (`data/missions`): pro Mission, pro Dateityp und insgesamt. Er zeigt auch den vom Browser belegten Platz.
- „Luftfahrtdaten, nach Zone“: Platz des SIA-Ordners nach Zone (Quellen und Zahl der Dateien; mora.csv zählt für alle Zonen). Eine deaktivierte Zone behält ihre Dateien: zum Freigeben von Hand löschen.
- „Überzählige Karten löschen“ entfernt die Karten, die nicht mehr in der Liste ihrer Mission stehen.
- „Alle erzeugten Karten leeren“ und „PDFs löschen“ schaffen Platz; diese Dateien lassen sich aus dem YAML neu erzeugen.
- Jedes Löschen verlangt eine Bestätigung.
- Frühere Versionen und empfangene Texte bilden den Verlauf: Sie werden hier nie geleert.
- Der Missionsordner muss unter Quellen und Ordner erlaubt sein.

### Vollständige Sicherung

Dieser Block erstellt ein ZIP-Archiv aller lokalen Daten, mit einem Manifest (`manifest.json`, SHA-256-Prüfsummen).
- **Inhalt**:
  - der Browser, immer enthalten;
  - „Datenrepository (data/ …)“;
  - die Landeprotokolle (Ordner X-Plane);
  - die Leistungsprofile;
  - die mit „Ordner hinzufügen…“ hinzugefügten Ordner (ein Name und ein Dateifilter).
- Jede Quelle lässt sich an- oder abhaken. Die Option „schwere Dateien einschließen“ fügt die PNG-Karten, ZIP und PDF sowie die AIRAC-XML hinzu.
- „Vollständige Sicherung erstellen“ schreibt das Archiv in `sauvegardes/` des Ordners der lokalen Sicherung; ist dieser Ordner nicht erlaubt, wird das Archiv heruntergeladen.
- „Änderungen seitdem“ vergleicht die Ordner mit der letzten vollständigen Sicherung.
- **Vollständige Sicherung wieder einlesen**: „Archiv wählen…“. Jede Datei erhält einen Zustand: identisch, fehlt auf der Festplatte, älter oder neuer auf der Festplatte. Haken Sie die gewünschten Dateien an, dann „Auswahl wiederherstellen“.
- Vor dem Ersetzen werden die Dateien in `_avant_restauration/` ihres Ordners kopiert. Die Browserdaten werden zusammengeführt: Der neueste Wert gewinnt.
- Bewusst nicht gesichert: Schlüssel des Webdienstes, laufende Netzwerkverfolgung, analysierte SIA-Datenbank, Ordnerberechtigungen, Flugprotokoll (von der Website neu geladen), Zugangsdaten der Website der Gesellschaft.

### Protokoll der Sicherungen und Wiederherstellungen

Diese Tabelle protokolliert jeden Vorgang an den Daten, mit Datum, Vorgang (und Seite), Herkunft und Ergebnis. Die Details der hinzugefügten (+) oder geänderten (~) Schlüssel lassen sich aufklappen.
Protokollierte Vorgänge:
- Wiedereinlesen der lokalen Daten (☰ › Lokale Daten › Wiederherstellen);
- vollständige Sicherung und Wiederherstellung einer vollständigen Sicherung;
- Entpacken des SIA-Exports und Archivierung der alten Zyklen;
- MORA-Neuberechnung.
Solange keiner dieser Vorgänge stattgefunden hat, ist das Protokoll leer.

### Flotte (bekannte Flugzeuge)

Diese Datenbank (`data/references/aircraft_fleet.js`) listet die in den Berichten angebotenen Flugzeuge: „Betreiber“, „ICAO-Muster“, „Variante“, „Kennzeichen“, „Code“, „Nummer“, „Rufzeichen“ (durch Kommas getrennt), „Heimatflugplatz“, „Einsatzbereit“. „ICAO-Muster“ schlägt die Typbasis vor (Auswahlliste mit Suche, nach Code oder Modellname); freie Eingabe bleibt möglich.
- **„Flottenseite der Website einfügen…“**:
  1. Öffnen Sie die Seite „Virtuelle Flotte“ der Website der Gesellschaft (Link im Fenster);
  2. drücken Sie Strg+A und dann Strg+C, und fügen Sie in das Feld ein (Strg+V); Sie können auch „Zwischenablage lesen“ oder „oder gespeicherte Seite…“ verwenden;
  3. klicken Sie auf „Lesen“.
- Ein Flugzeug der Seite ersetzt das der Datei (gleiches Kennzeichen), behält aber seine zusätzlichen Rufzeichen. Flugzeuge, die auf der Seite fehlen, bleiben erhalten.
- Die Statuszeile nennt die Anzahl der aktualisierten, hinzugefügten und beibehaltenen Flugzeuge. Prüfen Sie, dann „Im Repository speichern“.
- **Gemeinsame Schaltflächen der Repository-Datenbanken**: „Im Repository speichern“ hervorgehoben (schreibt die Datei in den Repository-Ordner, zu committen); unter „Mehr…“ „In diesem Browser anwenden“ (lokale Änderungen haben Vorrang), „Herunterladen“, „Änderungen verwerfen“, „Zurück zur Repository-Datei“. Die Statuszeile sagt, woher der Inhalt kommt: „Stand: Repository-Datei, ohne Änderung in diesem Browser“ oder die lokalen Änderungen mit Datum.
- **Automatisch**: Der Starter liest die öffentlichen Seiten Flotte und Flugbuch der Website selbst (ohne Anmeldung), einmal am Tag beim Öffnen einer Seite, nach denselben Regeln wie beim Einfügen; er schreibt `data/references/aircraft_fleet.js` und `defa_reference.js`, die mit „Synchronisieren“ zu senden sind. Einstellung und „Jetzt aktualisieren“: unter der Liste der Luftfahrzeuge im Reporting (unten). Einfügen und Skript (`python AircraftDB/update_fleet.py Flotte.html`) bleiben möglich.
- **Wo**: Einstellungen › Zentrum › „Flotte (bekannte Luftfahrzeuge)“, gesperrt, solange das Zentrum gesperrt ist (vorher unter Wartung).
- **Flottenkarte**: eigene Seite, für alle (Bericht › Flotte, siehe Benutzerhandbuch); die Schaltfläche „Flottenkarte“ über der Tabelle führt dorthin. Sie zeigt jedes Luftfahrzeug auf seinem aktuellen Flugplatz, mit Filtern, Überfahren (letzter Flug) und Auswahl; bei aktiviertem Zentrum führt ihre Schaltfläche „Flotte bearbeiten“ hierher zurück.
- **Luftfahrzeuge im Reporting**: unter der Flotte alle Luftfahrzeuge, die im Missionsjournal fliegen (Typ, Rufzeichen, Betreiber, Flüge, letzter Flug). Kästchen „Privat“, standardmäßig angehakt: einzelnes Luftfahrzeug, außerhalb der SOG-Flotte; Abhaken nimmt es in die Flotte auf (es wird zuweisbar), erneutes Anhaken nimmt es wieder heraus. Dann „Im Repository speichern“: Die Flotte und der Index der einzelnen Luftfahrzeuge (`data/references/aircraft_personal.js`) werden zusammen geschrieben. Ein Luftfahrzeug der Flotte-Seite der Website kommt bei der nächsten Aktualisierung in die Flotte zurück.
- **Typen und Leistungen**: „Typen und Leistungen aktualisieren“ ergänzt die in der Datenbank unbekannten Typen (Flotte und Reporting); die tägliche Aktualisierung von der Website tut es ebenfalls, im Hintergrund, für die Flotte, das Flugbuch und die einzelnen Luftfahrzeuge.
- **Flugplatz (Basis) eines Luftfahrzeugs**: Er ändert sich nur durch die Aktualisierung von der Website oder durch einen Bericht aus einem Missionsbefehl mit einem tatsächlichen Landeflugplatz; ein Bericht ohne Missionsbefehl oder ein Landing-Report verschiebt das Luftfahrzeug nicht. Ein aus dem Reporting hinzugefügtes Luftfahrzeug kommt ohne Flugplatz. Der aktuelle Flugplatz ist die Spalte „Standort“ der Flotte-Seite der Website (mit dem Datum ihrer letzten Änderung gespeichert), außer wenn ein neuerer Bericht aus einem Missionsbefehl einen tatsächlichen Landeflugplatz angibt (`missions/aircraft_positions.json`); von dort starten die Überführungen (Zuweisung, ODV-Planung, Einsatztafel, Luftfahrzeugblatt).

### Luftfahrzeugmuster (ICAO-Datenbank)

Diese Datenbank (`AircraftDB/aircraft_db.js`) enthält zwei Tabellen:
- „Muster“: „Kennung“, „Modell“, „ICAO-Beschreibung“, „WTC“, „Flügel“, „Quelle“;
- „Aliasse (Gebrauchsname → Kennung)“.
Die Änderungen werden auch in `aircraft_overrides.json` übertragen. Die Schaltflächen sind die der Repository-Datenbanken.
Das „Vorgehen“ nennt die Befehle des Aktualisierungsskripts, die in `AircraftDB` auszuführen sind: `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. Die Datenbank wird nicht mit der Suite veröffentlicht (Daten von ICAO und EUROCONTROL): Die Rubrik „Luftfahrzeugtypen“ unter Einstellungen › Wartung ergänzt sie auf diesem Rechner Typ für Typ, nie alles auf einmal. Sie liest sich in drei Schritten: „Worum es geht“ (der ICAO-Eintrag, der Symbol und Klasse 2P, 2T, 4T… liefert, und die EUROCONTROL-Leistungen); die Tabelle der Typen von Flotte, Missionen und Berichten (Silhouette, Code und Modell, ICAO-Klasse, Eintrag ✓ oder fehlend, Schlüsselleistungen — Gipfelhöhe, Reiseflug, V2, Vat — mit den Einzelheiten als Tooltip und dem EUROCONTROL-Link, Verwendung); dann „Automatisch ergänzen (n)“, das Fehlendes herunterlädt. Ein freier Code wird unter „Weitere Typen herunterladen…“ (zugeklappt) eingegeben; „Datenbank von Hand bearbeiten…“ (Stufe Experte) öffnet diese Datenbank. Eine Gruppe pro Luftfahrzeug: Die Bezeichnungen aus Missionen und Berichten („A332 A330 MRTT Phénix“, „A330 MRTT PHÉNIX“) werden auf den ICAO-Code zurückgeführt (Flotte, Aliasse, gebräuchliche Namen; Aliaskette verfolgt, zum Beispiel A4M → A400, ein Hauscode auf den ICAO-Bezeichner zurückgeführt); ein im Klartext in einen Bericht geschriebener Typ wird erkannt, statt einen lokalen Typ anzulegen. Ein Typ ohne EUROCONTROL-Leistungen wird geschätzt: „≈ 2 000 kg/h, 480 kt (bekannter Typ)“ oder „(ICAO-Klasse L2J)“, derselbe Ersatz wie im Kraftstoffplaner (`shared/fuel_reference.js`). Dafür sind der Starter und das Netz nötig; am Ende des Durchlaufs lädt die Seite von selbst neu und zeigt die Bilanz. Die geschriebenen Dateien (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) erfordern nichts: Die Seiten lesen sie; nicht versioniert, werden sie auf jedem Rechner ergänzt oder kopiert. Derselbe Durchlauf liest auch die öffentliche SimBrief-Liste (eine Anfrage, eine Woche gespeichert; `--simbrief` auf der Kommandozeile): Reiseverbrauch (kg/h), Massen (leer, ohne Kraftstoff, Landung, maximaler Kraftstoff), Gipfelhöhe und Geschwindigkeit von 224 Typen, in `aircraft_perf.js` neben den EUROCONTROL-Einträgen abgelegt; ein Wert, dessen Genauigkeit SimBrief nicht garantiert, ist eine Schätzung. Schließlich ergänzt Airframe DB (`--airframedb`, höchstens 40 Einträge pro Durchlauf, 30 Tage Cache) Aliasse (gebräuchliche Namen wie H125 → AS50 und Simulatornamen → ICAO-Code, ohne je einen bestehenden Alias zu ersetzen oder einen offiziellen Code umzuleiten) und die veröffentlichten Kenndaten (Geschwindigkeiten, Gipfelhöhe, Steigrate, Massen, Reichweite) der Typen ohne EUROCONTROL- oder SimBrief-Eintrag, einschließlich Militärflugzeugen und Hubschraubern. Als letzter Ausweg wird eine Kennung, die weder ICAO noch EUROCONTROL kennen (ausgemusterter Typ wie die Caravelle S210), bei Aviation Fanatic gesucht: eine Seite pro Typ, Name, ICAO-Beschreibung (L2J…) und Wirbelschleppenkategorie, auf diesem Rechner gespeichert (Quelle „Aviation Fanatic“).

Für Telefone und die Website (GitHub-Modus), die keinen Starter haben, kopiert „Luftfahrzeug-Datenbank im Datenrepository veröffentlichen“ (Stufe Experte, unter der Tabelle) `aircraft_db.js` und `aircraft_perf.js` nach `AircraftDB/` des Datenrepositorys, mit ihrer JSON-Kopie (`aircraft_db.json`, `aircraft_perf.json`, von der V3 gelesen, die nie ein Skript aus dem Repository ausführt), entfernt alles andere aus diesem Ordner (Caches, Skripte, `__pycache__`) und synchronisiert dann. Bevor etwas geschieht, zeigt die Seite die Liste dessen, was kopiert (+) und entfernt (−) wird, und fragt nach Zustimmung. Beide Dateien müssen reine Werte sein (Prüfung durch `tools/data_guard.py`, wie die anderen Datendateien). Die Datenbank wird nie auf der öffentlichen Website veröffentlicht.
Grenze: Ein hier gelöschtes Muster kann bei der nächsten Aktualisierung zurückkehren, wenn es zur Grundliste des Skripts gehört.

### Rufzeichen-Zuordnung

Diese Datenbank (`data/references/callsigns.js`) verknüpft das vollständige Rufzeichen (in den Berichten gespeichert) mit seiner Flugplanform (Feld 7) und dem ICAO-Betreiber (OPR/, Feld 18).
- Tabelle „Rufzeichen“: „Vollständiges Rufzeichen“, „Flugplan“, „Andere Formen“, „Organisation“, „OPR/“, „Muster“, „Rolle“, „Allgemein“, „Sprechfunk“, „Notiz“.
- Tabelle „Organisationen → ICAO-Kennung (OPR/)“.
- Es gibt kein Skript: Diese Seite (oder die von Hand bearbeitete Datei) ist die Quelle.
- Zum Befüllen: Die in den Berichten korrigierten Formen landen in „Gelernte Rufzeichen“, und die im Journal gesehenen Serien kommen über „Hinzufügen“ oder „Ergänzen“.

### Flotte und Piloten der Gesellschaft (anonymisierte Referenz)

Diese Datenbank (`data/references/defa_reference.js`) erfasst die Piloten (Kürzel) und die Flugzeuge der, ohne Flüge und Missionen. Sie dient als Eingabehilfe und ist nicht vollständig.
- Tabelle „Flugzeuge“: Kennzeichen, Muster, Variante, Status, Zuordnung (änderbar), letzter bekannter Flugplatz, Indienststellung, verwendete Rufzeichen, erster und letzter Flug, Flüge, Flottenblatt, Notiz.
- Tabelle „Piloten“: Kürzel, erster und letzter Flug, Flüge, Muster, Notiz.
- Aktualisierung:
  1. Laden Sie das Flugbuch (nächste Rubrik);
  2. klicken Sie auf „Aus dem Flugbuch aktualisieren“ (hier) oder „Referenz aktualisieren (anonymisiert)“ (im Flugbuch): Nichts wird gelöscht, und manuelle Eingaben bleiben erhalten;
  3. „Im Repository speichern“, dann committen.
- Alternative per Skript: `tools/defa_reference.py`.

### Flugbuch (geflogene Flüge)

Diese Datenbank ist vom Missionsregister getrennt. Sie wird nur in diesem Browser gehalten: außerhalb des Repositorys und der lokalen Sicherung, da sie Kürzel enthält.
- „Flugbuch laden / aktualisieren…“ akzeptiert die kopierte oder gespeicherte Seite „Log des vols“ oder einen CSV- / JSON-Export. Die Flüge werden ohne Duplikate zusammengeführt.
- „Rufzeichenserien“: „Zur Zuordnung hinzufügen“ legt die Zeile in der Rufzeichen-Zuordnung an (Benachrichtigung mit „Zuordnung öffnen“, auf die Zeile gefiltert); die Serie wird „In der Zuordnung ✓“; „Ergänzen“ fügt dort die seither gesehenen Formen und Muster hinzu.
- „Flüge“: Volltextfilter, höchstens 300 angezeigte Zeilen.
- Aktionen:
  - „Referenz aktualisieren (anonymisiert)“;
  - „CSV exportieren“;
  - „JSON exportieren (neu ladbar)“;
  - „Datenbank aus diesem Browser löschen“.

### Zusammenführungen und Umbenennungen (Piloten, Flugzeuge)

Diese Tabelle listet die Entsprechungen, die über „Zusammenführen mit… / umbenennen“ aus den Datenblättern angelegt wurden. Spalten: „Typ“ (Pilot oder Flugzeug), „Alt“, „Wird zu“, „Ergebnis“.
Diese Entsprechungen gelten für das neu geladene Journal, die Referenz und den Katalog.
„Löschen“ entfernt eine Entsprechung nach Bestätigung.
Eine Schleife (A → B und B → A) ist hervorgehoben: Sie vertauscht die beiden Namen. Löschen Sie den fehlerhaften Eintrag und führen Sie die Zusammenführung erneut aus dem Datenblatt aus.

### Missionsregister (Einsatzdatenbank)

Das einzige Register `data/cr/missions.yaml` umfasst alle Familien. Es ist die maßgebliche Quelle der Auswertungen.
- Eine Zeile pro Familie, mit der Anzahl der Missionen und den Schaltflächen „Bearbeiten (YAML)“, „YAML“, „CSV“, „Auswertung“.
- „Vollständiges Register bearbeiten (YAML)“ öffnet den Editor; „Prüfen und speichern“ prüft das YAML vor dem Schreiben. Im vollständigen Register muss jede Mission ihre Familie haben.
- „Registerordner…“ wählt den Ordner, in den geschrieben wird. Ohne diesen Ordner bleibt die Speicherung im Browser.
- „Register herunterladen (YAML)“, „CSV exportieren (Tabellenkalkulation)“.
- Um eine einzelne Mission zu korrigieren, gehen Sie besser über ihren Bericht (Klick auf die Zeile der Auswertung).

### Flugzeuge aus erfassten Missionen

Diese Datenbank wird vom Browser gehalten (`missionAircraftRegistry:v1`). Die Flugzeuge werden bei jedem Speichern einer Mission dort gespeichert; die neueste Angabe hat Vorrang vor der Flotte.
Spalten: Kennzeichen, Muster, Variante, Kategorie, Rufzeichen, Code, Betreiber, Datum.
Schaltflächen: „Speichern“ (im Browser) und „Änderungen verwerfen“.

### Lokal hinzugefügte Muster

Diese Datenbank listet die in Missionen eingegebenen unbekannten Muster: Kennung, Modell, Kategorie, Datum des Hinzufügens.
„In die Repository-Datenbank übernehmen“ kopiert diese Muster in „Luftfahrzeugmuster (ICAO-Datenbank)“ und öffnet diese Datenbank. Danach ist sie noch anzuwenden oder im Repository zu speichern.

### Gelernte Rufzeichen (korrigierte Flugplanformen)

Diese Datenbank listet die in den Berichten von Hand korrigierten Flugplanformen: vollständiges Rufzeichen, Flugplan, Datum.
„In die Repository-Datenbank übernehmen“ fügt sie der „Rufzeichen-Zuordnung“ hinzu und öffnet diese Datenbank. Prüfen Sie, dann anwenden oder speichern.

### Verwendete Flugplätze (Cache)

Diese Datenbank speichert die Koordinaten und Zeitzonen der bereits verwendeten Flugplätze, für Sonnenauf- und -untergang und das Wetter: ICAO, Name, Land, Breite, Länge, Höhe (ft), Zeitzone.
Sie lässt sich von Hand korrigieren („Speichern“). Sie wird auch unter „Caches“ geleert: Sie baut sich dann aus der weltweiten Datenbank neu auf.

## Daten synchronisieren

Die gemeinsamen Daten (Verfügbarkeiten, Benutzer, Konfiguration, Missionen und Zuweisungen, Berichte, ATC-Sitzungen) liegen in `data/`. Dieser Ordner ist ein vom Code getrenntes Git-Repository. Die Schaltfläche „Synchronisieren“ im Kopf tauscht ihn mit den anderen Rechnern aus.

### Die Schaltfläche „Synchronisieren (n)“

- Die Schaltfläche erscheint nur, wenn die Suite vom Starter bereitgestellt wird und `data/` ein Git-Repository ist.
- (n) addiert die zu sendenden Änderungen dieses Rechners und die zu empfangenden Commits. Das entfernte Repository wird in der unter Einstellungen › Wartung › Versionen und Synchronisation eingestellten Häufigkeit neu gelesen (standardmäßig alle 30 Minuten; auf jeder Seite, 3-mal am Tag, einmal am Tag); zwischen zwei Prüfungen zeigt die Schaltfläche den letzten bekannten, im Browser gehaltenen Zustand, und der Starter antwortet mit seiner letzten Erhebung. Der Tooltip nennt den Branch und das Datum der letzten Synchronisierung.
- Die Synchronisierung wird von Hand gestartet, mit einem Klick:
  1. Die im Browser gehaltenen Dateien werden zuerst in den Ordner geschrieben;
  2. der Starter committet im Namen des angemeldeten Kürzels (einschließlich übernommenem Benutzer);
  3. er holt und führt die Änderungen der anderen Rechner zusammen und sendet dann.
- Ohne Kürzel wird die Synchronisierung abgelehnt: Stellen Sie es unter Einstellungen › Mein Profil ein.
- Am Ende nennt eine Benachrichtigung die Anzahl der gesendeten und empfangenen Dateien, und die Seiten lesen die geänderten Dateien neu.
- **Abstand zur Sicherung**: Die Schaltfläche wird orange (Änderung seit über 48 h nicht gesendet, 20 oder mehr zu sendende Dateien, 10 zu empfangende Commits, nicht gesendeter Commit, außerhalb der synchronisierten Daten geänderte Datei) oder rot (`data/` ohne Git-Repository oder ohne entferntes Repository, laufende Zusammenführung, hohe Schwellen: 100 Dateien, 7 Tage, 50 Commits); Gründe im Tooltip, Warnung als Benachrichtigung einmal pro Sitzung. Ohne Git-Repository (außer Testdaten) meldet es eine Schaltfläche „⚠ Sicherung“. Schwellen einstellbar: `data/config/suite.json`, Schlüssel `sync`.

### Erste Synchronisierung

Der erste Klick sendet alles, was in `data/` nie committet wurde. Existiert der entfernte Branch nicht, legt er ihn an.
Meldung „Nur lokaler Commit: kein entferntes Repository“: `data/` hat kein entferntes Repository, also wird nichts geteilt.
Die Git-Zugangsdaten sind die des Systems (SSH-Schlüssel, Anmeldeinformationsverwaltung); die Suite speichert keine.

### Mehrere Benutzer, bis der zentrale Server kommt

- Jeder Rechner **empfängt** bei jedem Start (der Starter aktualisiert `data/` aus dem Repository, ohne etwas zu senden) und **sendet** mit der Schaltfläche
  „Synchronisieren“ (Commit, Zusammenführung mit den anderen, Senden).
- Jeder sendende Rechner braucht: Git, die vom Starter geöffnete Suite, ein **Schreibrecht auf das Datenrepository**
  (ein Konto pro Person beim Git-Hoster oder ein gemeinsames Konto) und einen SSH-Schlüssel oder in Git gespeicherte
  HTTPS-Zugangsdaten.
- Die Adresse des Repositorys wird beim Erststart angegeben und geprüft (Schritt 1, Karte „Git-Repository zur
  Datensynchronisierung“): nie blockierend, ein nicht antwortendes Repository wird nur gemeldet.
- Ein Rechner ohne Git oder Schreibrecht kann in einen **gemeinsamen Ordner** (Synology, OneDrive…) schreiben, den ein
  ausgestatteter Rechner synchronisiert. Der zentrale Server wird diese Voraussetzungen beseitigen: Ein Konto wird genügen
  ([Roadmap](../technique/ROADMAP.md), Schritt 2).

### Konflikte und Ordner `_conflits/`

Der Starter löst Konflikte Datenblatt für Datenblatt, ohne je etwas zu verlieren:
- **auf zwei Rechnern geändertes Datenblatt**: Das neueste gewinnt. Die andere Version wird in `<dossier>/_conflits/` aufbewahrt und durch eine Benachrichtigung gemeldet;
- **Zuweisungen**: Zuweisung für Zuweisung zusammengeführt;
- **Zuweisungsprotokoll**: Beide Seiten werden vereint;
- **auf einer Seite gelöschte und auf der anderen geänderte Datei**: Die geänderte Version wird behalten.
Nach einer Konfliktbenachrichtigung:
1. Öffnen Sie die angegebene Kopie in `_conflits/`;
2. übertragen Sie von Hand, was in der behaltenen Datei fehlt;
3. synchronisieren Sie erneut und löschen Sie dann die Kopie.
Das Berichtsregister (`cr/missions.yaml`) wird von Hand zusammengeführt.
Meldung „In data/ läuft ein Merge oder ein Rebase“: Schließen Sie den Git-Vorgang ab oder brechen Sie ihn ab (`git -C data merge --abort`), dann beginnen Sie erneut.
Details, Schemata und risikolose Tests: [Architektur der Synchronisierung](../technique/SYNCHRONISATION.md).

## Starter, Daten und Sicherungen

Die Suite wird von einem kleinen lokalen Server bereitgestellt, der mitgeliefert wird. Die Daten liegen an drei Orten: im Ordner `data/`, im Browser und in der Datei der lokalen Sicherung.

### Suite starten

- **Windows**: Doppelklicken Sie auf `lancer.cmd`. **macOS / Linux**: `sh lancer.sh`. Beide rufen `tools/launch.py` auf, das drei Schritte durchläuft:
  1. **Python**: wird gesucht und bei Bedarf installiert (mindestens Version 3.8).
  2. **Daten**: Ist `data/` vorhanden, wird es ohne `git pull` aktualisiert: Die auf diesem Rechner geänderten Dateien des Pools werden zuerst committet („Modifications du poste <TRI>“), dann wird der entfernte Zweig wie beim Knopf „Synchronisieren“ Datensatz für Datensatz zusammengeführt, ohne etwas zu senden. Eine lokal geänderte Datei außerhalb des Pools (zum Beispiel `sia/mora.csv`) bleibt unverändert; würde die Aktualisierung sie überschreiben, wird sie verschoben und die Konsole nennt sie. Die Konsole sagt, was getan wurde (committete und empfangene Dateien, verschobener Empfang und warum); nie blockierend. Andernfalls wird ein neben dem Starter abgelegtes `.zip`-Archiv entpackt; fehlt auch dieses, wird das Datenrepository geklont.
  3. **Server und Browser**: Der Server startet auf `http://127.0.0.1`, am ersten freien Port ab 8000, dann öffnet sich der Browser. Läuft die Suite bereits, öffnet sich nur der Browser.
- Lassen Sie das Fenster des Starters während der Nutzung offen; schließen Sie es (oder Strg+C), um die Suite zu beenden.
- Optionen: `--port 8010`, `--page apps/…`, `--no-browser`, `--no-data`, und `--data <dossier>`, um eine andere Kopie der Daten unter `/data/` bereitzustellen, ohne Klon oder Aktualisierung. Die Option `--data` dient Tests, zum Beispiel der Synchronisierung.
- Empfohlener Browser: Chrome oder Edge. Für Brave siehe [Installation](../INSTALL.md).

### Der Ordner `data/`

- Anwendung und Daten sind getrennt. `data/` ist ein eigenes, privates Git-Repository im Ordner der Anwendung; das Code-Repository ignoriert es.
- Ohne Zugang zum Datenrepository startet die Suite mit den Beispielen aus `examples/`. Sie können auch ein Datenarchiv per E-Mail anfordern.
- Ein synchronisierter Ordner (Synology Drive, OneDrive…) eignet sich, sofern die **Ordner `.git` von der Synchronisierung ausgeschlossen** sind.
- Die Dateien in `data/` sind maßgeblich: Der Index des Browsers baut sich aus ihnen neu auf (Wartung › Caches › „Datenindex“).

### Sicherungen

- **Browserdaten**: über ☰ › Lokale Daten.
  - „Sicherungsordner…“ wird einmal gewählt, idealerweise in einem synchronisierten Ordner.
  - Die Datei `defa_local_store.yaml` wird danach automatisch geschrieben.
  - „Wiederherstellen / abgleichen“ führt diese Datei mit dem Browser zusammen: Die neueste Angabe gewinnt.
- **Vollständige Sicherung** (Browser und Dateien der erlaubten Ordner): Einstellungen › Wartung › Vollständige Sicherung (siehe oben).
- Versionieren Sie `defa_local_store.yaml` nicht: Die Datei enthält personenbezogene Daten.
- Code-Update: Wartung › Updates, oder `python tools/update_suite.py update`. Ein Code-Update berührt die Daten nicht.
Weiterführend: [Betriebshandbuch](../MANUEL_EXPLOITATION.md), § 2 und § 3; [Installation](../INSTALL.md).
