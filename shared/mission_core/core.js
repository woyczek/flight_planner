(() => {
  'use strict';
  // Mission Report Core — registre des familles et page de saisie de CR.
  // Une famille se déclare par configuration (MissionCore.registerFamily) :
  //   { id, idPrefix, title, pages:{ cr, reporting }, series:[{value,label,subtypes}],
  //     capabilities?, crewRoles?, events?, flags?, defaultCategory?, blocks:[…] }
  // Page de saisie : brouillon navigateur, appareils connus, registre YAML de la famille
  // (ajout avec contrôle des doublons, modification, suppression), import / export YAML,
  // accès au reporting, avertissement avant de quitter sans enregistrer.
  const V = window.MissionVocab, M = window.MissionModel, L = V.L;
  const families = new Map();
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const duration = n => n == null ? '—' : n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}` : `${n} min`;
  const normId = v => String(v ?? '').trim().toUpperCase();
  // Libellé [fr,en,de,es] dans la langue courante du framework (messages dynamiques).
  const inLanguage = row => row[['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr')] || row[0];
  const UI = {
    kpiTitle: L('Calculs automatiques', 'Automatic calculations', 'Automatische Berechnungen', 'Cálculos automáticos'),
    block: L('Temps bloc', 'Block time', 'Blockzeit', 'Tiempo calzo a calzo'), flight: L('Temps de vol', 'Flight time', 'Flugzeit', 'Tiempo de vuelo'),
    transitOut: L('Transit aller', 'Transit outbound', 'Anflug', 'Tránsito de ida'), onStation: L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona'),
    transitIn: L('Transit retour', 'Transit inbound', 'Rückflug', 'Tránsito de vuelta'), mission: L('Temps mission', 'Mission time', 'Missionszeit', 'Tiempo de misión'),
    fuelUsed: L('Carburant consommé', 'Fuel used', 'Kraftstoffverbrauch', 'Combustible consumido'), fuelOnStation: L('Carburant sur zone', 'Fuel on station', 'Kraftstoff im Einsatzraum', 'Combustible en zona'),
    context: L('Contexte d’affichage', 'Display context', 'Anzeigekontext', 'Contexto de visualización'), capabilities: L('Capacités', 'Capabilities', 'Fähigkeiten', 'Capacidades'),
    categories: L('Types d’appareil', 'Aircraft types', 'Luftfahrzeugarten', 'Tipos de aeronave'), none: L('aucune', 'none', 'keine', 'ninguna'),
    ledgerTitle: L('Registre des missions', 'Mission ledger', 'Einsatzregister', 'Registro de misiones'),
    newMission: L('Nouvelle mission', 'New mission', 'Neuer Einsatz', 'Nueva misión'), importFile: L('Importer (YAML / ancien JSON)', 'Import (YAML / legacy JSON)', 'Importieren (YAML / altes JSON)', 'Importar (YAML / JSON antiguo)'),
    exportYaml: L('Exporter la mission (YAML)', 'Export mission (YAML)', 'Einsatz exportieren (YAML)', 'Exportar misión (YAML)'),
    addToLedger: L('Ajouter au registre', 'Add to ledger', 'Ins Register aufnehmen', 'Añadir al registro'),
    saveChanges: L('Enregistrer les modifications', 'Save changes', 'Änderungen speichern', 'Guardar cambios'),
    deleteMission: L('Supprimer cette mission', 'Delete this mission', 'Diesen Einsatz löschen', 'Eliminar esta misión'),
    viewReporting: L('Voir le reporting', 'View reporting', 'Auswertung anzeigen', 'Ver informe'),
    chooseFolder: L('Dossier du registre…', 'Ledger folder…', 'Registerordner…', 'Carpeta del registro…'),
    downloadLedger: L('Télécharger le registre (YAML)', 'Download ledger (YAML)', 'Register herunterladen (YAML)', 'Descargar registro (YAML)'),
    confirmNew: L('Effacer le brouillon en cours et commencer une nouvelle mission ?', 'Discard the current draft and start a new mission?', 'Aktuellen Entwurf verwerfen und neuen Einsatz beginnen?', '¿Descartar el borrador actual y empezar una nueva misión?'),
    otherFamily: L('Ce fichier appartient à une autre famille de missions. L’importer quand même ?', 'This file belongs to another mission family. Import anyway?', 'Diese Datei gehört zu einer anderen Einsatzfamilie. Trotzdem importieren?', 'Este archivo pertenece a otra familia de misiones. ¿Importarlo de todos modos?'),
    duplicate: L('Ce n° de mission figure déjà dans le registre. L’ajouter quand même (doublon) ? Annuler pour corriger le n° de mission.', 'This mission ID is already in the ledger. Add it anyway (duplicate)? Cancel to correct the mission ID.', 'Diese Einsatz-ID ist bereits im Register. Trotzdem hinzufügen (Duplikat)? Abbrechen, um die ID zu korrigieren.', 'Este ID de misión ya figura en el registro. ¿Añadirlo de todos modos (duplicado)? Cancelar para corregir el ID.'),
    confirmDelete: L('Supprimer définitivement cette mission du registre ?', 'Permanently delete this mission from the ledger?', 'Diesen Einsatz endgültig aus dem Register löschen?', '¿Eliminar definitivamente esta misión del registro?'),
    editBanner: L('Modification d’une mission du registre', 'Editing a ledger mission', 'Bearbeitung eines Registereinsatzes', 'Modificación de una misión del registro'),
    fromSia: L('Mission générée (SIA XML) reprise', 'Generated mission (SIA XML) imported', 'Generierte Mission (SIA XML) übernommen', 'Misión generada (SIA XML) importada'),
    fromSiaReplace: L('Remplacer le brouillon en cours par la mission générée (SIA XML) ?', 'Replace the current draft with the generated mission (SIA XML)?', 'Aktuellen Entwurf durch die generierte Mission (SIA XML) ersetzen?', '¿Reemplazar el borrador actual por la misión generada (SIA XML)?'),
    editGone: L('La mission demandée n’existe plus à cette position du registre (modifié entre-temps) : ouverture d’une nouvelle mission.', 'The requested mission is no longer at this ledger position (changed meanwhile): opening a new mission.', 'Der angeforderte Einsatz ist nicht mehr an dieser Registerposition (zwischenzeitlich geändert): neuer Einsatz wird geöffnet.', 'La misión solicitada ya no está en esta posición del registro (modificado mientras tanto): se abre una nueva misión.'),
    draftSaved: L('Brouillon enregistré dans le navigateur', 'Draft saved in the browser', 'Entwurf im Browser gespeichert', 'Borrador guardado en el navegador'),
    stored: L('Mission enregistrée dans le registre', 'Mission saved to the ledger', 'Einsatz im Register gespeichert', 'Misión guardada en el registro'),
    storedBrowserOnly: L('Enregistrée dans le navigateur — choisissez le dossier du registre pour écrire le fichier, ou téléchargez-le.', 'Saved in the browser — choose the ledger folder to write the file, or download it.', 'Im Browser gespeichert — Registerordner wählen, um die Datei zu schreiben, oder herunterladen.', 'Guardada en el navegador — elija la carpeta del registro para escribir el archivo, o descárguelo.'),
    deleted: L('Mission supprimée du registre', 'Mission deleted from the ledger', 'Einsatz aus dem Register gelöscht', 'Misión eliminada del registro'),
    folder: L('Dossier', 'Folder', 'Ordner', 'Carpeta'), browserOnly: L('navigateur uniquement', 'browser only', 'nur Browser', 'solo navegador'),
    missions: L('missions', 'missions', 'Einsätze', 'misiones'),
    imported: L('Mission importée', 'Mission imported', 'Einsatz importiert', 'Misión importada'), exported: L('Mission exportée', 'Mission exported', 'Einsatz exportiert', 'Misión exportada'),
    importError: L('Import impossible', 'Import failed', 'Import fehlgeschlagen', 'Importación imposible'),
    knownAircraft: L('Appareil connu : type, catégorie, indicatif et équipements repris (dernier enregistrement)', 'Known aircraft: type, category, callsign and equipment filled in (latest record)', 'Bekanntes Luftfahrzeug: Muster, Kategorie, Rufzeichen und Ausrüstung übernommen (letzter Eintrag)', 'Aeronave conocida: tipo, categoría, indicativo y equipamiento completados (último registro)'),
    unknownType: L('Type inconnu : il sera ajouté à la base locale lors de l’enregistrement', 'Unknown type: it will be added to the local base when saved', 'Unbekanntes Muster: wird beim Speichern der lokalen Datenbank hinzugefügt', 'Tipo desconocido: se añadirá a la base local al guardar'),
    publicVersion: L('Version publique (données sensibles masquées : CR, impression, export)', 'Public version (sensitive data hidden: report, print, export)', 'Öffentliche Fassung (sensible Daten ausgeblendet: Bericht, Druck, Export)', 'Versión pública (datos sensibles ocultos: informe, impresión, exportación)'),
    reportTitle: L('Compte rendu', 'Report', 'Bericht', 'Informe'),
    switchFamily: L('Famille de mission', 'Mission family', 'Einsatzfamilie', 'Familia de misión'), switchSeries: L('Sous-type de mission', 'Mission sub-type', 'Einsatz-Untertyp', 'Subtipo de misión'),
    allSeries: L('Tous les sous-types', 'All sub-types', 'Alle Untertypen', 'Todos los subtipos'),
    fplTitle: L('Plan de vol déposé', 'Filed flight plan', 'Aufgegebener Flugplan', 'Plan de vuelo presentado'),
    fplIntro: L('Remplit les champs vides : appareil, équipements OACI, route, points tournants, niveaux, terrains, METAR / TAF (SimBrief), masses et carburant prévus (SimBrief). Identifiants : menu ☰ › Profil pilote.', 'Fills empty fields: aircraft, ICAO equipment, route, waypoints, levels, aerodromes, METAR / TAF (SimBrief), planned masses and fuel (SimBrief). IDs: menu ☰ › Pilot profile.', 'Füllt leere Felder: Luftfahrzeug, ICAO-Ausrüstung, Route, Wegpunkte, Flughöhen, Flugplätze, METAR / TAF (SimBrief), geplante Massen und Kraftstoff (SimBrief). Kennungen: Menü ☰ › Pilotenprofil.', 'Rellena los campos vacíos: aeronave, equipos OACI, ruta, puntos, niveles, aeródromos, METAR / TAF (SimBrief), masas y combustible previstos (SimBrief). Identificadores: menú ☰ › Perfil de piloto.'),
    fplSimbrief: L('Dernier OFP SimBrief', 'Latest SimBrief OFP', 'Letzter SimBrief-OFP', 'Último OFP de SimBrief'), fplIvao: L('Plan de vol IVAO (vol en cours)', 'IVAO flight plan (current flight)', 'IVAO-Flugplan (laufender Flug)', 'Plan de vuelo IVAO (vuelo en curso)'),
    fplVatsim: L('Plan de vol VATSIM (en cours ou déposé)', 'VATSIM flight plan (current or prefiled)', 'VATSIM-Flugplan (laufend oder vorab)', 'Plan de vuelo VATSIM (en curso o presentado)'),
    fplNone: L('Aucun plan de vol trouvé pour cet identifiant (vol terminé ou non déposé).', 'No flight plan found for this ID (flight ended or not filed).', 'Kein Flugplan für diese Kennung gefunden (Flug beendet oder nicht aufgegeben).', 'No se encontró ningún plan de vuelo para este identificador (vuelo terminado o no presentado).'),
    fplNeedId: L('Renseignez votre identifiant dans le menu ☰ › Profil pilote (ou dans le bloc « Trace réseau »).', 'Enter your ID in menu ☰ › Pilot profile (or in the “Network track” block).', 'Kennung im Menü ☰ › Pilotenprofil (oder im Block „Netzwerkspur“) eingeben.', 'Indique su identificador en el menú ☰ › Perfil de piloto (o en el bloque «Traza de red»).'),
    fplLearned: L('Forme plan de vol mémorisée pour cet indicatif', 'Flight plan form remembered for this callsign', 'Flugplanform für dieses Rufzeichen gespeichert', 'Forma de plan de vuelo memorizada para este indicativo'),
    importTitle: L('Analyser / importer…', 'Analyse / import…', 'Auswerten / importieren…', 'Analizar / importar…'),
    importIntro: L('Collez un plan de vol OACI « (FPL-…) », une page du tracker IVAO (détails d’un vol ou liste des connexions : Ctrl+A, Ctrl+C sur la page), la page d’un vol StatSim (VATSIM), l’historique VATSIM (JSON) ou un METAR : les champs vides sont remplis. Heures du tracker converties en heure locale du terrain de départ.', 'Paste an ICAO flight plan “(FPL-…)”, an IVAO tracker page (flight details or connection list: Ctrl+A, Ctrl+C on the page), the VATSIM history (JSON) or a METAR: empty fields are filled. Tracker times converted to local time at the departure aerodrome.', 'Einen ICAO-Flugplan „(FPL-…)“, eine IVAO-Tracker-Seite (Flugdetails oder Verbindungsliste: Strg+A, Strg+C auf der Seite), die VATSIM-Historie (JSON) oder ein METAR einfügen: leere Felder werden ausgefüllt. Tracker-Zeiten in Ortszeit des Startflugplatzes umgerechnet.', 'Pegue un plan de vuelo OACI «(FPL-…)», una página del tracker IVAO (detalle de un vuelo o lista de conexiones: Ctrl+A, Ctrl+C en la página), el historial VATSIM (JSON) o un METAR: se rellenan los campos vacíos. Horas del tracker convertidas a hora local del aeródromo de salida.'),
    importRun: L('Analyser et remplir', 'Analyse and fill', 'Auswerten und ausfüllen', 'Analizar y rellenar'), importClip: L('Coller depuis le presse-papiers', 'Paste from clipboard', 'Aus Zwischenablage einfügen', 'Pegar desde el portapapeles'),
    importBookmarklet: L('← à glisser dans la barre des favoris : un clic sur la page du tracker IVAO la copie ; revenez ici, elle est analysée.', '← drag to the bookmarks bar: one click on the IVAO tracker page copies it; come back here, it is analysed.', '← in die Lesezeichenleiste ziehen: ein Klick auf der IVAO-Tracker-Seite kopiert sie; hierher zurückkehren, sie wird ausgewertet.', '← arrastre a la barra de marcadores: un clic en la página del tracker IVAO la copia; vuelva aquí, se analiza.'),
    ledgerUnavailable: L('registre illisible (serveur ou fichier indisponible) — mission conservée en brouillon, réessayez.', 'ledger unreadable (server or file unavailable) — mission kept as a draft, try again.', 'Register nicht lesbar (Server oder Datei nicht verfügbar) — Einsatz als Entwurf behalten, erneut versuchen.', 'registro ilegible (servidor o archivo no disponible) — misión conservada como borrador, reinténtelo.'),
    menuNetwork: L('Suivi réseau', 'Network tracking', 'Netzwerk-Tracking', 'Seguimiento de red'),
    menuMission: L('Mission', 'Mission', 'Einsatz', 'Misión'),
    sendSettings: L('Paramétrer l’envoi des CR (webservice)…', 'Report sending settings (web service)…', 'Berichtversand einrichten (Webservice)…', 'Configurar el envío de informes (servicio web)…'),
    settingsPage: L('Paramétrage — bases de données…', 'Settings — databases…', 'Einstellungen — Datenbanken…', 'Configuración — bases de datos…'),
    sendSetupNow: L('Le webservice d’envoi des CR n’est pas encore paramétré (adresse, clef). Ouvrir le paramétrage ?', 'The report web service is not set up yet (address, key). Open the settings?', 'Der Webservice für den Berichtversand ist noch nicht eingerichtet (Adresse, Schlüssel). Einstellungen öffnen?', 'El servicio web de envío de informes aún no está configurado (dirección, clave). ¿Abrir la configuración?'),
    sendReport: L('Envoyer le CR', 'Send report', 'Bericht senden', 'Enviar informe'),
    sendNotConfigured: L('Envoi du CR : webservice non configuré (Paramétrage → Envoi des comptes rendus).', 'Report sending: web service not configured (Settings → Report sending).', 'Berichtversand: Webservice nicht konfiguriert (Einstellungen → Berichtversand).', 'Envío del informe: servicio web no configurado (Configuración → Envío de informes).'),
    sendUnsaved: L('Cette mission n’est pas enregistrée dans le registre (ou a des modifications non enregistrées). L’envoyer quand même ?', 'This mission is not saved in the ledger (or has unsaved changes). Send it anyway?', 'Dieser Einsatz ist nicht im Register gespeichert (oder hat ungespeicherte Änderungen). Trotzdem senden?', 'Esta misión no está guardada en el registro (o tiene cambios sin guardar). ¿Enviarla de todos modos?'),
    sendConfirm: L('Envoyer ce compte rendu au webservice', 'Send this report to the web service', 'Diesen Bericht an den Webservice senden', 'Enviar este informe al servicio web'),
    sending: L('Envoi du CR…', 'Sending report…', 'Bericht wird gesendet…', 'Enviando informe…'),
    sent: L('CR envoyé', 'Report sent', 'Bericht gesendet', 'Informe enviado'),
    sendFailed: L('Échec de l’envoi du CR', 'Report sending failed', 'Berichtversand fehlgeschlagen', 'Error al enviar el informe'),
    sendCors: L('service injoignable ou appel refusé par le navigateur (CORS : le service doit autoriser cette origine)', 'service unreachable or call blocked by the browser (CORS: the service must allow this origin)', 'Dienst nicht erreichbar oder vom Browser blockiert (CORS: der Dienst muss diese Herkunft erlauben)', 'servicio inaccesible o llamada bloqueada por el navegador (CORS: el servicio debe permitir este origen)'),
    sentBefore: L('Déjà envoyé le', 'Already sent on', 'Bereits gesendet am', 'Ya enviado el'),
    importBookmarkletHelp: L('Ce lien s’utilise depuis la barre des favoris, sur la page du tracker (glisser-déposer le lien dans la barre).', 'Use this link from the bookmarks bar, on the tracker page (drag and drop the link into the bar).', 'Diesen Link aus der Lesezeichenleiste auf der Tracker-Seite verwenden (Link in die Leiste ziehen).', 'Use este enlace desde la barra de marcadores, en la página del tracker (arrastre el enlace a la barra).'),
    importFpl: L('Plan de vol OACI', 'ICAO flight plan', 'ICAO-Flugplan', 'Plan de vuelo OACI'), importIvaoDetails: L('Tracker IVAO — détails du vol', 'IVAO tracker — flight details', 'IVAO-Tracker — Flugdetails', 'Tracker IVAO — detalle del vuelo'),
    importIvaoList: L('Tracker IVAO — connexions', 'IVAO tracker — connections', 'IVAO-Tracker — Verbindungen', 'Tracker IVAO — conexiones'), importMetar: L('METAR', 'METAR'),
    importVatsim: L('Historique VATSIM analysé (voir le suivi réseau dans l’en-tête).', 'VATSIM history analysed (see network tracking in the header).', 'VATSIM-Historie ausgewertet (siehe Netzwerk-Tracking in der Kopfzeile).', 'Historial VATSIM analizado (ver el seguimiento de red en la cabecera).'),
    importUnknown: L('Texte non reconnu : plan de vol « (FPL-…) », page du tracker IVAO, historique VATSIM (JSON) ou METAR attendus.', 'Text not recognised: flight plan “(FPL-…)”, IVAO tracker page, VATSIM history (JSON) or METAR expected.', 'Text nicht erkannt: Flugplan „(FPL-…)“, IVAO-Tracker-Seite, VATSIM-Historie (JSON) oder METAR erwartet.', 'Texto no reconocido: se espera un plan de vuelo «(FPL-…)», una página del tracker IVAO, el historial VATSIM (JSON) o un METAR.'),
    importClipDenied: L('Lecture du presse-papiers refusée : collez dans la zone (Ctrl+V).', 'Clipboard access denied: paste into the box (Ctrl+V).', 'Zugriff auf die Zwischenablage verweigert: in das Feld einfügen (Strg+V).', 'Acceso al portapapeles denegado: pegue en el cuadro (Ctrl+V).'),
    importPasteHint: L('Collez avec Ctrl+V dans la zone (analyse immédiate). « Coller depuis le presse-papiers » demande l’autorisation une fois ; ensuite, le retour depuis le tracker (favori « → CR DEFA ») est analysé automatiquement.', 'Paste with Ctrl+V in the box (immediate analysis). “Paste from clipboard” asks for permission once; then returning from the tracker (“→ CR DEFA” bookmark) is analysed automatically.', 'Mit Strg+V in das Feld einfügen (sofortige Auswertung). „Aus Zwischenablage einfügen“ fragt einmal nach der Erlaubnis; danach wird die Rückkehr vom Tracker (Lesezeichen „→ CR DEFA“) automatisch ausgewertet.', 'Pegue con Ctrl+V en el cuadro (análisis inmediato). «Pegar desde el portapapeles» pide permiso una vez; después, la vuelta desde el tracker (marcador «→ CR DEFA») se analiza automáticamente.'),
    importStatsim: L('StatSim (VATSIM) — détails du vol', 'StatSim (VATSIM) — flight details', 'StatSim (VATSIM) — Flugdetails', 'StatSim (VATSIM) — detalle del vuelo'),
    importOpenIvao: L('↗ Tracker IVAO (mes connexions)', '↗ IVAO tracker (my connections)', '↗ IVAO-Tracker (meine Verbindungen)', '↗ Tracker IVAO (mis conexiones)'),
    importOpenStatsim: L('↗ Mes vols StatSim (VATSIM)', '↗ My StatSim flights (VATSIM)', '↗ Meine StatSim-Flüge (VATSIM)', '↗ Mis vuelos StatSim (VATSIM)'),
    importTrackerUrl: L('Adresse de la trace IVAO', 'IVAO track address', 'Adresse der IVAO-Spur', 'Dirección de la traza IVAO'),
    importLocal: L('heures locales', 'local times', 'Ortszeiten', 'horas locales'),
    fplFilled: L('champs renseignés depuis', 'fields filled from', 'Felder ausgefüllt aus', 'campos rellenados desde'),
    render: L('Générer / actualiser le CR', 'Generate / refresh report', 'Bericht erzeugen / aktualisieren', 'Generar / actualizar el informe'),
    print: L('PDF / Imprimer', 'PDF / Print', 'PDF / Drucken', 'PDF / Imprimir'),
    leave: L('La mission n’a pas été enregistrée dans le registre. Quitter quand même ?', 'The mission has not been saved to the ledger. Leave anyway?', 'Der Einsatz wurde nicht im Register gespeichert. Trotzdem verlassen?', 'La misión no se ha guardado en el registro. ¿Salir de todos modos?')
  };

  function registerFamily(def) {
    if (!def?.id) throw new Error('Famille sans identifiant');
    families.set(def.id, { blocks: [], series: [], pages: {}, ...def });
    M.registerUpperFields(def.blocks || []); // champs de texte simple de la famille : majuscules
    return families.get(def.id);
  }

  function mount({ family: familyId, root }) {
    const family = families.get(familyId);
    if (!family) throw new Error(`Famille inconnue : ${familyId}`);
    document.body.dataset.family = family.id;
    // Dernière famille utilisée : cible de ☰ › Missions › Nouveau compte rendu (mission_cr.html).
    try { if (family.id !== 'DEMO') localStorage.setItem('missionCoreLastFamily:v1', family.id); } catch { /* stockage indisponible */ }
    const prefix = family.idPrefix || family.id;
    const ledger = window.MissionLedger.open(family);
    const params = new URLSearchParams(location.search);
    const editIndex = params.has('edit') ? Number(params.get('edit')) : null;
    let edit = null; // { index, missionId } en mode modification
    const draftKey = `missionCoreDraft:v1:${family.id}`;
    const prefs = () => { try { return JSON.parse(localStorage.getItem('missionReportingConfig:v1') || '{}'); } catch { return {}; } };
    const fresh = () => {
      const mission = M.emptyMission(family.id);
      mission.metadata.missionId = ledger.nextId(prefix);
      mission.metadata.date = new Date().toISOString().slice(0, 10);
      mission.series = family.series?.[0]?.value || '';
      // Catégorie par défaut de la famille : valeur « automatique », remplacée par celle d'un appareil connu.
      if (family.defaultCategory) { mission.aircraft[0].category = family.defaultCategory; autoFilled.set(mission.aircraft[0], { category: family.defaultCategory }); }
      const p = prefs(); mission.network.ivaoId = p.ivaoId || ''; mission.network.vatsimId = p.vatsimId || '';
      // Techniques employées : reprises de la dernière mission de la même série (à ne
      // renseigner qu'une fois).
      const missions = ledger.missions || [], last = [...missions].reverse().find(m => m.series === mission.series) || missions[missions.length - 1];
      if (last?.capabilities?.length) mission.capabilities = [...last.capabilities];
      return mission;
    };
    let mission = M.emptyMission(family.id), dirty = false;

    root.classList.add('mc-page');
    // Barre d'outils dans l'en-tête (collé en haut de page) : registre des missions et suivi
    // réseau ; colonne de droite : calculs puis aperçu du compte rendu.
    const header = document.querySelector('header.mc-header');
    window.MissionVocab.describeHeader?.(familyId);
    const tools = document.createElement('div'); tools.className = 'mc-header-tools';
    // Sept entrées au plus, par ordre d'importance : contexte (famille · série, ajoutée plus
    // bas), actions principales (enregistrer, envoyer), puis menus (importer, suivi réseau,
    // mission, registre). Les actions gardent leur data-action, quel que soit leur menu.
    tools.innerHTML = `<div class="mc-toolbar">
        <button type="button" class="primary" data-action="store"></button>
        <button type="button" class="mc-send" data-action="send"></button>
        <details class="mc-import mc-menu"><summary></summary><div class="mc-import-pop mc-pop">
          <div class="mc-import-row mc-import-links"><a data-open="ivao" target="_blank" rel="noopener"></a><a data-open="statsim" target="_blank" rel="noopener"></a></div>
          <p class="small mc-import-intro"></p>
          <textarea spellcheck="false" rows="8"></textarea>
          <div class="mc-import-row"><button type="button" class="primary" data-import="run"></button><button type="button" data-import="clip"></button>
          <a class="mc-bookmarklet" draggable="true"></a><span class="small mc-import-hint"></span></div>
          <p class="small mc-import-result"></p>
          <div class="mc-import-row mc-import-file"><button type="button" data-action="import"></button></div></div></details>
        <details class="mc-menu mc-net"><summary data-menu="network"></summary><div class="mc-pop mc-net-pop"><div id="mc-header-tracker"></div></div></details>
        <details class="mc-menu"><summary data-menu="mission"></summary><div class="mc-pop mc-list">
          <button type="button" data-action="new"></button>
          <button type="button" data-action="export"></button>
          <button type="button" class="danger" data-action="delete" hidden></button></div></details>
        <details class="mc-menu"><summary data-menu="ledger"></summary><div class="mc-pop mc-list">
          <p class="small mc-ledger-info"></p>
          <a class="mc-button" data-action="reporting"></a>
          <button type="button" data-action="folder"></button>
          <button type="button" data-action="download" hidden></button>
          <hr><a class="mc-button" data-action="sendSettings"></a>
          <a class="mc-button" data-action="settings"></a></div></details>
        <input type="file" accept=".yaml,.yml,.json,application/json,text/yaml" hidden>
        <span class="mc-status"></span></div>`;
    if (header) header.append(tools);
    root.innerHTML = `<form id="missionCoreForm" class="mc-form" autocomplete="off">
      <section class="mc-edit-banner" hidden><h2></h2><p class="note mc-edit-info"></p></section></form>
      <aside class="mc-aside"><div class="panel mc-kpi-panel"><h2></h2><div class="mc-kpi"></div><ul class="mc-issues" hidden></ul><h3></h3><div class="small mc-context"></div></div>
        <div class="panel mc-report-panel" data-block-id="mc-report"><h2></h2><div class="row mc-report-actions">
        <button type="button" class="primary" data-action="render"></button><button type="button" class="secondary" data-action="print"></button>
        <label class="mc-public" hidden><input type="checkbox" data-action="public"> <span></span></label></div>
        <div class="report" id="mcReport"></div></div></aside>`;
    if (!header) root.querySelector('form').prepend(tools);
    const form = root.querySelector('form'), status = tools.querySelector('.mc-status');
    const $a = action => root.querySelector(`[data-action="${action}"]`) || tools.querySelector(`[data-action="${action}"]`);
    // Hauteur de l'en-tête (collé) : position de la colonne de droite, elle aussi collée.
    const measure = () => document.documentElement.style.setProperty('--mc-top', `${(header?.getBoundingClientRect().height || 0) + 8}px`);
    window.addEventListener('resize', measure); new ResizeObserver(measure).observe(header || document.body);
    const ui = new Map();
    const t = key => { const row = UI[key]; ui.set(row[0], row); return row[0]; };
    const say = (key, extra = '') => { status.textContent = t(key) + (extra ? ` : ${extra}` : ''); };
    [['render', 'render'], ['print', 'print'], ['new', 'newMission'], ['import', 'importFile'], ['export', 'exportYaml'], ['reporting', 'viewReporting'], ['folder', 'chooseFolder'], ['download', 'downloadLedger'], ['delete', 'deleteMission']].forEach(([a, k]) => { $a(a).textContent = t(k); });
    $a('reporting').href = family.pages.reporting || '#';
    // Menus de la barre d'outils : libellés, liens vers le paramétrage, un seul menu ouvert.
    [['network', 'menuNetwork'], ['mission', 'menuMission'], ['ledger', 'ledgerTitle']].forEach(([k, key]) => { tools.querySelector(`[data-menu="${k}"]`).textContent = t(key); });
    const settingsUrl = base => new URL(`parametrage.html${base ? `?base=${base}` : ''}`, window.MissionLedger.APP).href;
    $a('sendSettings').textContent = t('sendSettings'); $a('sendSettings').href = settingsUrl('send');
    $a('settings').textContent = t('settingsPage'); $a('settings').href = settingsUrl('');
    const menus = [...tools.querySelectorAll('details.mc-menu')];
    menus.forEach(menu => menu.addEventListener('toggle', () => { if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; }); }));
    document.addEventListener('click', event => menus.forEach(menu => { if (menu.open && !menu.contains(event.target)) menu.open = false; }));
    // Choix dans un menu (hors import et suivi réseau, qui restent ouverts) : menu refermé.
    tools.querySelectorAll('.mc-list').forEach(list => list.addEventListener('click', event => { if (event.target.closest('button,a')) list.closest('details').open = false; }));
    root.querySelector('.mc-kpi-panel h2').textContent = t('kpiTitle');
    root.querySelector('.mc-report-panel h2').textContent = t('reportTitle');
    // Familles avec champs sensibles (ex. LAW ENFORCEMENT) : version publique du CR.
    const publicBox = root.querySelector('.mc-public'), isPublic = () => publicBox.querySelector('input').checked;
    publicBox.hidden = !M.hasSensitive(family); publicBox.querySelector('span').textContent = t('publicVersion');
    root.querySelector('.mc-kpi-panel h3').textContent = t('context');
    root.querySelector('.mc-edit-banner h2').textContent = t('editBanner');

    let saveTimer = null;
    // Valeurs remplies automatiquement (appareil connu, plan de vol, météo…) : texte simple en
    // majuscules comme la saisie, avant le brouillon et l'aperçu.
    const changed = (path, auto = false) => { if (!auto) dirty = true; kpi(); assist.autoEnvironment(); timelineEvents(); clearTimeout(saveTimer); saveTimer = setTimeout(() => { if (M.upperText(mission)) view.sync(); if (dirty) saveDraft(); renderReport(); }, 400); };
    const view = window.MissionForm.create(form, {
      family, getMission: () => mission,
      onChange: changed,
      // Appareil effacé : l'organisme repris de cet appareil (flotte, série) part avec lui.
      onClear: (path, index) => {
        if (path !== 'aircraft') return;
        if (index === 0 && autoOperator && mission.organisation.organisation === autoOperator) { mission.organisation.organisation = ''; autoOperator = ''; view.sync('organisation.'); }
        form.querySelector(`[data-path="aircraft.${index}.registration"]`)?.focus();
      },
      onCommit: (path, value) => {
        aircraftAssist(path, value); assist.onCommit(path, value); timeAssist(path, value);
        // Opérateur (organisme) modifié : indicatif de série de l'appareil principal réévalué.
        if (path === 'organisation.organisation' && (operatorAssist(0) + autoSeries(0))) { view.sync('aircraft.'); changed(); }
      },
      suggest: (...args) => assist.suggest(...args),
      now: (path, kind) => nowFor(path, kind)
    });
    const blockList = window.MissionBlocks.ORDER.flatMap(block => block === '__family__' ? family.blocks : [block]);
    // Aides à la saisie : valeurs connues, filtrage croisé des appareils, terrains, météo, soleil.
    const assist = window.MissionAssist.create({ family, form, view, getMission: () => mission, ledgerMissions: () => ledger.missions || [], onChange: changed, t: row => { ui.set(row[0], row); return inLanguage(row); } });

    // ---- appareils connus / types OACI
    const A = window.MissionAircraft;
    const autoFilled = new WeakMap(); // appareil → valeurs déduites automatiquement du type
    let autoOperator = ''; // organisme repris de la flotte (remplacé si l'appareil change)
    function applyKnown(index, known) {
      const item = mission.aircraft[index];
      // Type d'abord (modèle OACI, catégorie), puis les valeurs de l'appareil connu, qui
      // l'emportent. Les valeurs reprises sont mémorisées : un autre choix les remplacera.
      if (known.type) { item.type = known.type; typeAssist(index, item.type); }
      const auto = autoFilled.get(item) || {}, take = (k, value) => { item[k] = value; auto[k] = value; };
      ['type', 'variant', 'category'].forEach(k => { if (known[k]) take(k, known[k]); });
      ['tacticalNumber', 'configuration'].forEach(k => { if (known[k] && !item[k]) take(k, known[k]); });
      if (!item.callsign && known.callsign) take('callsign', known.callsign);
      if (!item.registration) take('registration', known.registration);
      // Indicatif complet → indicatif (série) + numéro.
      if (item.callsign) {
        const parts = M.splitCallsign(item.callsign), prefix = A.canonicalPrefix(parts.prefix), fromKnown = item.callsign === auto.callsign;
        const set = fromKnown ? take : (k, v) => { item[k] = v; };
        set('callsignPrefix', prefix); set('callsignNumber', parts.number); set('callsign', M.joinCallsign(prefix, parts.number));
      }
      fplAssist(item, auto);
      // Flotte DEFA : base d'attache et opérateur, si non renseignés.
      if (known.base && (!item.baseDeparture || item.baseDeparture === auto.baseDeparture)) take('baseDeparture', known.base);
      if (known.operator && index === 0 && (!mission.organisation.organisation || mission.organisation.organisation === autoOperator)) mission.organisation.organisation = autoOperator = String(known.operator).toUpperCase();
      autoFilled.set(item, auto); operatorAssist(index, known);
      if (known.equipment?.length) item.equipment = [...new Set([...(item.equipment || []), ...known.equipment])];
      view.rerenderCollectionOf(`aircraft.${index}.registration`); view.sync();
      view.hint(`aircraft.${index}.registration`, t('knownAircraft') + (known.date && known.date > '0000-00-01' ? ` — ${known.date}` : ''));
      kpi(); changed();
    }
    // Variante / catégorie déduites du type : remplacées si elles avaient été déduites
    // automatiquement d'un type précédent, jamais si le pilote les a saisies.
    function typeAssist(index, value) {
      const item = mission.aircraft[index], path = `aircraft.${index}.type`;
      const type = A.lookupType(value), auto = autoFilled.get(item) || {};
      const replace = key => !item[key] || item[key] === auto[key];
      if (type) {
        if (type.category && replace('category')) { item.category = type.category; auto.category = type.category; }
        if (type.model && replace('variant')) { item.variant = type.model; auto.variant = type.model; }
        autoFilled.set(item, auto); view.rerenderCollectionOf(path); view.sync('aircraft.'); view.hint(path, type.model);
      } else {
        ['variant', 'category'].forEach(key => { if (item[key] && item[key] === auto[key]) { item[key] = ''; delete auto[key]; } });
        view.sync('aircraft.'); view.hint(path, value ? t('unknownType') : '');
      }
    }
    // Immatriculation, indicatif, type, variante : filtrage croisé avec les appareils connus.
    // Une seule possibilité → l'appareil connu remplit les champs vides (indicatif compris) ;
    // plusieurs → seules les valeurs communes à toutes sont reprises.
    // Indicatif de la série déduit du type et de l'opérateur (Sécurité civile + H145 → DRAGON),
    // tant que le pilote n'a pas saisi le sien.
    function autoSeries(index) {
      const item = mission.aircraft[index]; if (!item) return false;
      const auto = autoFilled.get(item) || {};
      if (item.callsignPrefix && item.callsignPrefix !== auto.callsignPrefix) return false;
      const prefix = assist.seriesPrefix(index);
      if (!prefix || prefix === item.callsignPrefix) return false;
      item.callsignPrefix = prefix; auto.callsignPrefix = prefix; autoFilled.set(item, auto);
      item.callsign = M.joinCallsign(prefix, item.callsignNumber); fplAssist(item, auto); return true;
    }
    // ---- heures : fuseau du terrain de départ (à défaut Europe/Paris, CET / CEST), à la date
    // de la mission (à défaut, aujourd'hui) — changement d'heure pris en compte.
    const zone = () => assist.cachedAirport?.(mission.navigation?.dep || mission.aircraft?.[0]?.baseDeparture)?.tz || 'Europe/Paris';
    const partsIn = (date, tz) => { const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).forEach(x => { p[x.type] = x.value; }); return p; };
    const offsetMin = (tz, ms) => { const p = partsIn(new Date(ms), tz); return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000) / 60000; };
    const missionDate = () => /^\d{4}-\d{2}-\d{2}$/.test(mission.metadata?.date || '') ? mission.metadata.date : nowFor('metadata.date', 'date');
    function convert(time, toUtc) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(time || ''); if (!m) return '';
      const [y, mo, d] = missionDate().split('-').map(Number), naive = Date.UTC(y, mo - 1, d, +m[1], +m[2]), tz = zone();
      const ms = toUtc ? naive - offsetMin(tz, naive - offsetMin(tz, naive) * 60000) * 60000 : naive;
      const p = partsIn(new Date(ms), toUtc ? 'UTC' : tz); return `${p.hour}:${p.minute}`;
    }
    function nowFor(path, kind) {
      const p = partsIn(new Date(), /utc/i.test(path) ? 'UTC' : zone());
      return kind === 'date' ? `${p.year}-${p.month}-${p.day}` : `${p.hour}:${p.minute}`;
    }
    // Heure locale ⇄ UTC (identification, événements) ; l'heure du briefing devient celle du CR
    // si elle est vide ou déjà reprise automatiquement.
    const autoTime = new Map();
    function timeAssist(path, value) {
      const pair = /^(metadata|events\.\d+)\.time(Local|Utc)$/.exec(path);
      const setAuto = (target, v) => { const cur = M.get(mission, target); if (v && (!cur || cur === autoTime.get(target))) { M.set(mission, target, v); autoTime.set(target, v); return true; } return false; };
      let touched = false;
      if (pair) touched = setAuto(`${pair[1]}.time${pair[2] === 'Local' ? 'Utc' : 'Local'}`, convert(value, pair[2] === 'Local'));
      if (path === 'timeline.briefing' && value && setAuto('metadata.timeLocal', value)) { setAuto('metadata.timeUtc', convert(value, true)); touched = true; }
      if (touched) view.sync();
    }
    // Événements de la chronologie : créés / mis à jour / retirés d'après les heures saisies
    // (ou importées : plan de vol, tracker, suivi réseau). Un événement complété à la main
    // (position, description…) n'est jamais retiré.
    const TIMELINE_EVENT = { briefing: 'BRIEFING', engineStart: 'ENGINE_START', offBlock: 'OFF_BLOCK', takeoff: 'TAKEOFF', zoneEntry: 'ON_TASK', missionStart: 'MISSION_START', missionEnd: 'MISSION_END', zoneExit: 'OFF_TASK', landing: 'LANDING', onBlock: 'ON_BLOCK', shutdown: 'SHUTDOWN' };
    let timelineSig = null;
    function timelineEvents(reset = false) {
      const sig = JSON.stringify(Object.keys(TIMELINE_EVENT).map(k => mission.timeline?.[k] || ''));
      if (reset || timelineSig === null) { timelineSig = sig; return; }
      if (sig === timelineSig) return; timelineSig = sig;
      const list = mission.events || (mission.events = []);
      const touchedByHand = e => ['position', 'description', 'result'].some(k => e[k]) || ['altitude', 'speed', 'heading', 'fuel'].some(k => e[k] != null && e[k] !== '');
      Object.entries(TIMELINE_EVENT).forEach(([key, type]) => {
        const time = mission.timeline?.[key] || '', source = `timeline.${key}`, index = list.findIndex(e => e.source === source);
        if (!time) { if (index >= 0 && !touchedByHand(list[index])) list.splice(index, 1); return; }
        const event = index >= 0 ? list[index] : { timeLocal: '', timeUtc: '', type, position: '', altitude: null, speed: null, heading: null, fuel: null, description: '', result: '', source };
        event.timeLocal = time; event.timeUtc = convert(time, true); if (!event.type) event.type = type;
        if (index < 0) list.push(event);
      });
      // Ordre chronologique depuis la première heure de la chronologie (passage de minuit).
      const first = M.minutes(Object.keys(TIMELINE_EVENT).map(k => mission.timeline?.[k]).find(Boolean)) ?? 0;
      const rank = e => { const t = M.minutes(e.timeLocal); return t == null ? 1e9 : (t - first + 1440) % 1440; };
      list.sort((a, b) => rank(a) - rank(b));
      view.rerenderCollectionOf('events.0'); view.sync('events.');
    }
    // Autorités (demandeuse, de contrôle) : dernière mission du même indicatif (ou du même
    // organisme), sinon d'après le département des séries numérotées par département
    // (DRAGON74, CHOUCAS74 : préfecture, CODIS / CORG / SAMU du département).
    const autoAuthority = {};
    function authorityAssist(entry) {
      const item = mission.aircraft[0], o = mission.organisation; if (!item) return;
      const set = (k, v) => { if (v && (!o[k] || o[k] === autoAuthority[k])) { o[k] = autoAuthority[k] = String(v).toUpperCase(); } };
      const history = (window.MissionLedger?.store?.missions || []).slice().sort((a, b) => String(b.metadata?.date).localeCompare(String(a.metadata?.date)));
      const sameCallsign = history.find(m => m !== mission && item.callsign && String(m.aircraft?.[0]?.callsign || '').toUpperCase() === String(item.callsign).toUpperCase() && (m.organisation?.requestingAuthority || m.organisation?.controllingAuthority));
      const sameOrg = history.find(m => m !== mission && o.organisation && String(m.organisation?.organisation || '').toUpperCase() === String(o.organisation).toUpperCase() && (m.organisation?.requestingAuthority || m.organisation?.controllingAuthority));
      const source = sameCallsign || sameOrg;
      if (source) { set('requestingAuthority', source.organisation.requestingAuthority); set('controllingAuthority', source.organisation.controllingAuthority); return; }
      const number = String(item.callsignNumber || '').toUpperCase(), dept = /d[ée]partement/i.test(entry?.note || '') ? (V.departments[number] ? number : V.departments[number.slice(0, 2)] ? number.slice(0, 2) : '') : '';
      if (!dept) return;
      const name = V.departments[dept], op = String(entry.operator || o.organisation || '').toUpperCase();
      set('requestingAuthority', `PRÉFECTURE ${name} (${dept})`);
      set('controllingAuthority', /GENDARMERIE/.test(op) ? `CORG ${dept}` : /SAMU/.test(op) ? `SAMU ${dept}` : `CODIS ${dept}`);
    }
    // Série de la table de correspondance (COTAM, DRAGON…) : organisme de la mission et type
    // (s'il est unique pour la série), seulement s'ils sont vides ou déjà remplis automatiquement.
    function seriesAssist(index) {
      const item = mission.aircraft[index], entry = item?.callsignPrefix && A.table().find(e => e.prefix === A.canonicalPrefix(item.callsignPrefix));
      if (!entry) return;
      if (index === 0 && entry.operator && (!mission.organisation.organisation || mission.organisation.organisation === autoOperator)) mission.organisation.organisation = autoOperator = String(entry.operator).toUpperCase();
      const auto = autoFilled.get(item) || {};
      if ((entry.types || []).length === 1 && (!item.type || item.type === auto.type)) { item.type = entry.types[0]; auto.type = item.type; autoFilled.set(item, auto); typeAssist(index, item.type); }
      if (index === 0) { authorityAssist(entry); view.sync('organisation.'); }
    }
    // Exploitant OACI (OPR/) : d'après l'organisme de la mission ou l'opérateur de l'appareil connu.
    function operatorAssist(index, known = null) {
      const item = mission.aircraft[index]; if (!item) return false;
      const auto = autoFilled.get(item) || {};
      if (item.operatorCode && item.operatorCode !== auto.operatorCode) return false;
      const series = item.callsignPrefix && A.table().find(e => e.prefix === A.canonicalPrefix(item.callsignPrefix));
      const code = A.designatorOf(index === 0 && mission.organisation.organisation) || A.designatorOf(known?.operator) || series?.designator || '';
      if (code === item.operatorCode) return false;
      item.operatorCode = code; auto.operatorCode = code; autoFilled.set(item, auto); return true;
    }
    // Indicatif plan de vol (7 caractères OACI) : déduit de l'indicatif, sauf saisie du pilote.
    function fplAssist(item, auto) {
      // Forme saisie par le pilote : conservée tant que l'indicatif ne change pas.
      if (item.callsignFpl && item.callsignFpl !== auto.callsignFpl && auto.fplFor === item.callsign) return;
      const fpl = item.callsign ? A.fplCallsign(item.callsignPrefix, item.callsignNumber) : '';
      item.callsignFpl = fpl; auto.callsignFpl = fpl; autoFilled.set(item, auto);
    }
    function aircraftAssist(path, value) {
      const m = /^aircraft\.(\d+)\.(registration|callsign|callsignPrefix|callsignNumber|callsignFpl|type|variant)$/.exec(path); if (!m) return;
      const index = Number(m[1]), item = mission.aircraft[index];
      try { identityAssist(index, m[2], value, item); } finally {
        if (/^callsign/.test(m[2])) seriesAssist(index); // après l'effacement des valeurs de l'appareil précédent
        autoSeries(index); view.sync(); changed();
      }
    }
    function identityAssist(index, field, value, item) {
      // Indicatif complet ⇄ indicatif (série) + numéro.
      const CALLSIGN = ['callsign', 'callsignPrefix', 'callsignNumber'];
      // Immatriculation saisie avec ou sans tiret : affichée et enregistrée « F-ZBMM ».
      if (field === 'registration') {
        const formatted = M.formatRegistration(value);
        if (formatted !== item.registration) { item.registration = formatted; const input = form.querySelector(`[data-path="aircraft.${index}.registration"]`); if (input) input.value = formatted; }
        value = formatted;
      }
      if (field === 'callsignFpl') {
        item.callsignFpl = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, A.FPL_MAX);
        const own = autoFilled.get(item) || {}; own.fplFor = item.callsign; autoFilled.set(item, own); // saisie valable pour cet indicatif
        // Forme plan de vol corrigée (KETOU12 pour KETOUPA12) : table de correspondance enrichie.
        const number = String(item.callsignNumber || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (item.callsignPrefix && number && item.callsignFpl.endsWith(number) && A.learnFpl(item.callsignPrefix, item.callsignFpl.slice(0, -number.length)))
          view.hint(`aircraft.${index}.callsignFpl`, inLanguage(UI.fplLearned));
        view.sync('aircraft.'); return;
      }
      // Indicatif complet ou forme plan de vol saisis (DRAGO76) → DRAGON / 76.
      if (field === 'callsign') { const parts = M.splitCallsign(value); item.callsignPrefix = A.canonicalPrefix(parts.prefix); item.callsignNumber = parts.number; item.callsign = M.joinCallsign(item.callsignPrefix, parts.number); }
      // Indicatif saisi avec son numéro (« ctm58 ») : découpé comme l'indicatif complet.
      if (field === 'callsignPrefix' && /\d/.test(item.callsignPrefix || '')) { const parts = M.splitCallsign(item.callsignPrefix); item.callsignPrefix = parts.prefix; if (parts.number) item.callsignNumber = parts.number; }
      if (field === 'callsignPrefix' || field === 'callsignNumber') { if (field === 'callsignPrefix') item.callsignPrefix = A.canonicalPrefix(item.callsignPrefix); item.callsign = M.joinCallsign(item.callsignPrefix, item.callsignNumber); value = item.callsign; }
      if (CALLSIGN.includes(field)) {
        fplAssist(item, autoFilled.get(item) || {}); operatorAssist(index); view.sync('aircraft.');
        // Champ encore actif (ignoré par sync) : valeur découpée / normalisée affichée.
        const input = form.querySelector(`[data-path="aircraft.${index}.${field}"]`); if (input && input.value !== (item[field] || '')) input.value = item[field] || '';
      }
      // Valeurs reprises d'un appareil précédemment choisi : effacées pour laisser place au nouveau choix.
      const auto = autoFilled.get(item) || {};
      if (field !== 'variant') ['registration', ...CALLSIGN, 'type', 'variant', 'category', 'tacticalNumber', 'configuration', 'baseDeparture'].forEach(k => { if (k !== field && !(CALLSIGN.includes(field) && CALLSIGN.includes(k)) && item[k] && item[k] === auto[k]) { item[k] = ''; delete auto[k]; } });
      if (!item.callsignPrefix && !item.callsignNumber) item.callsign = '';
      if (field === 'type') typeAssist(index, value);
      const regPath = `aircraft.${index}.registration`;
      // Appareil connu choisi par son immatriculation (ou par un indicatif complet qui lui est
      // propre) : son identité l'emporte sur un indicatif / une immatriculation incompatible.
      const picked = field === 'registration' ? A.find(value) : CALLSIGN.includes(field) && item.callsignNumber ? A.findByCallsign(item.callsign) : null;
      if (picked) {
        if (field === 'registration' && item.callsign && !picked.callsigns.includes(String(item.callsign).toUpperCase())) { item.callsign = ''; item.callsignPrefix = ''; item.callsignNumber = ''; }
        if (CALLSIGN.includes(field) && item.registration && A.regKey(item.registration) !== A.regKey(picked.registration)) item.registration = '';
        if (item.type && picked.type && item.type.toUpperCase() !== String(picked.type).toUpperCase()) item.type = '';
        applyKnown(index, picked); return;
      }
      const result = assist.aircraftCommit(index);
      if (!result) { view.hint(regPath, ''); return; }
      if (result.known) { applyKnown(index, result.known); return; }
      if (result.none) { view.hint(regPath, inLanguage(window.MissionAssist.T.noMatch)); return; }
      const common = result.common || {};
      Object.assign(item, common);
      if (common.type) typeAssist(index, common.type);
      if (Object.keys(common).length) { view.rerenderCollectionOf(regPath); view.sync('aircraft.'); changed(); }
      view.hint(regPath, `${result.count} ${inLanguage(window.MissionAssist.T.matches)}`);
    }

    // ---- brouillon, calculs, registre
    const draftSlot = () => edit ? `${draftKey}:edit:${edit.index}:${normId(edit.missionId)}` : draftKey;
    function saveDraft(silent = false) {
      try { localStorage.setItem(draftSlot(), JSON.stringify(mission)); if (!silent) status.textContent = `${t('draftSaved')} · ${new Date().toLocaleTimeString()}`; } catch { /* quota */ }
    }
    function kpi() {
      const s = M.computeStatistics(mission), unit = mission.fuel?.unit || '';
      const cell = (key, value) => `<div><span class="small">${esc(t(key))}</span><b>${esc(value)}</b></div>`;
      root.querySelector('.mc-kpi').innerHTML = cell('block', duration(s.blockMinutes)) + cell('flight', duration(s.flightMinutes))
        + cell('transitOut', duration(s.transitOutMinutes)) + cell('onStation', duration(s.timeOnStationMinutes))
        + cell('transitIn', duration(s.transitInMinutes)) + cell('mission', duration(s.missionMinutes))
        + cell('fuelUsed', s.fuelUsed == null ? '—' : `${s.fuelUsed} ${unit}`) + cell('fuelOnStation', s.fuelOnStation == null ? '—' : `${s.fuelOnStation} ${unit}`);
      checks();
      const ctx = view.context() || {};
      // un morceau traduisible par élément (la couche de traduction remplace des nœuds de texte entiers)
      const listOrNone = set => [...(set || [])].length ? esc([...set].join(', ')) : `<span>${esc(t('none'))}</span>`;
      root.querySelector('.mc-context').innerHTML = `<b>${esc(family.id)}</b> · ${esc(mission.series || '—')}<br><span>${esc(t('categories'))}</span> : ${listOrNone(ctx.categories)}<br><span>${esc(t('capabilities'))}</span> : ${listOrNone(ctx.capabilities)}`;
    }
    // Contrôles de cohérence : liste sous les calculs (clic = champ concerné) et marque sur les
    // champs (heure inversée ou invalide, carburant incohérent).
    function checks() {
      const i = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
      const issues = M.checkMission(mission), list = root.querySelector('.mc-issues');
      list.hidden = !issues.length;
      list.innerHTML = issues.map(issue => `<li><button type="button" data-goto="${esc(issue.path)}">⚠ ${esc(window.MissionBlocks.describeIssue(issue, i))}</button></li>`).join('');
      list.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const el = form.querySelector(`[data-path="${b.dataset.goto}"]`); el?.scrollIntoView({ block: 'center' }); el?.focus(); });
      const flagged = new Set(issues.map(x => x.path));
      form.querySelectorAll('[data-path^="timeline."],[data-path^="fuel."],[data-path="metadata.date"]').forEach(el => el.classList.toggle('mc-invalid', flagged.has(el.dataset.path)));
    }
    function ledgerInfo() {
      window.FileAccess?.decorate($a('folder'), '__ledger');
      tools.querySelector('.mc-ledger-info').innerHTML = `${esc(ledger.filename)} · ${esc(family.id)} : ${ledger.missions.length} <span>${esc(t('missions'))}</span> · <span>${esc(t('folder'))}</span> : ${ledger.state.folder ? esc(ledger.state.folder) : `<span>${esc(t('browserOnly'))}</span>`}`;
    }
    function modeUi() {
      root.querySelector('.mc-edit-banner').hidden = !edit;
      if (edit) root.querySelector('.mc-edit-info').textContent = `${edit.missionId} — ${ledger.filename} #${edit.index + 1}`;
      $a('store').textContent = t(edit ? 'saveChanges' : 'addToLedger');
      $a('delete').hidden = !edit;
    }
    // ---- compte rendu (§21) et résumé (§22), actualisés à la saisie et au changement de langue
    let reportRows = [];
    function renderReport() {
      if (!window.MissionReport) return;
      const shown = isPublic() ? M.redact(mission, family) : mission;
      const { html, rows } = window.MissionReport.render(shown, family, view.context() || view.refresh());
      root.querySelector('#mcReport').innerHTML = html;
      reportRows = rows; registerI18n();
    }
    function redraw() { view.render(blockList); assist.decorate(); assist.autoEnvironment('reset'); timelineEvents(true); sendUi(); fplTools(); kpi(); modeUi(); ledgerInfo(); renderReport(); switcher.sync(); registerI18n(); blockFramework(); }
    // Blocs recréés : afficher / masquer / déplacer du framework réappliqués (état mémorisé).
    const blockFramework = () => { if (document.readyState === "complete") window.AppFramework?.refresh?.(); };

    // ---- plan de vol déposé (SimBrief, IVAO, VATSIM) : barre d'outils du bloc Navigation
    function fplTools() {
      const section = form.querySelector('#mc-navigation'); if (!section || section.querySelector('.mc-fpl')) return;
      const bar = document.createElement('div'); bar.className = 'mc-tools mc-fpl';
      bar.innerHTML = `<p class="small"><b></b> — <span></span></p><div class="row"><button type="button" class="secondary" data-fpl="simbrief"></button><button type="button" class="secondary" data-fpl="ivao"></button><button type="button" class="secondary" data-fpl="vatsim"></button></div><p class="small mc-tools-status"></p>`;
      bar.querySelector('b').textContent = t('fplTitle'); bar.querySelector('span').textContent = t('fplIntro');
      [['simbrief', 'fplSimbrief'], ['ivao', 'fplIvao'], ['vatsim', 'fplVatsim']].forEach(([k, key]) => { bar.querySelector(`[data-fpl="${k}"]`).textContent = t(key); });
      const note = bar.querySelector('.mc-tools-status');
      bar.querySelectorAll('[data-fpl]').forEach(button => button.onclick = async () => {
        const source = button.dataset.fpl, p = prefs(), F = window.MissionFpl;
        const id = source === 'simbrief' ? p.simbriefUser : source === 'ivao' ? (mission.network.ivaoId || p.ivaoId) : (mission.network.vatsimId || p.vatsimId);
        if (!id) { note.textContent = inLanguage(UI.fplNeedId); return; }
        button.disabled = true; note.textContent = '…';
        try {
          const fpl = await (source === 'simbrief' ? F.fromSimbrief(id) : source === 'ivao' ? F.fromIvao(id) : F.fromVatsim(id));
          if (!fpl) { note.textContent = inLanguage(UI.fplNone); return; }
          const done = F.apply(mission, fpl);
          view.render(blockList); assist.decorate(); fplTools(); kpi(); registerI18n(); blockFramework();
          for (const path of ['navigation.dep', 'aircraft.0.baseDeparture']) if (M.get(mission, path)) { await assist.onCommit(path, M.get(mission, path)); break; }
          changed();
          const status = form.querySelector('.mc-fpl .mc-tools-status');
          if (status) status.textContent = `${done.length} ${inLanguage(UI.fplFilled)} ${fpl.source}${fpl.callsign ? ` (${fpl.callsign} ${fpl.dep || ''}→${fpl.arr || ''})` : ''} : ${done.map(p => p.replace(/^\w+\.(\d+\.)?/, '')).join(', ') || '—'}`;
        } catch (error) { note.textContent = `${fplError(error)}`; } finally { button.disabled = false; }
      });
      section.querySelector('h2').after(bar);
    }
    const fplError = error => /-id$/.test(error.message) ? inLanguage(UI.fplNeedId) : error.message;

    // ---- analyse d'un texte collé : plan de vol OACI, tracker IVAO (détails / liste),
    // historique VATSIM (JSON), METAR (shared/mission_core/text_import.js)
    const importBox = tools.querySelector('.mc-import'), importArea = importBox.querySelector('textarea'), importResult = importBox.querySelector('.mc-import-result');
    importBox.querySelector('summary').textContent = t('importTitle');
    importBox.querySelector('.mc-import-intro').textContent = t('importIntro');
    importBox.querySelector('[data-import="run"]').textContent = t('importRun');
    importBox.querySelector('[data-import="clip"]').textContent = t('importClip');
    importBox.querySelector('.mc-import-hint').textContent = t('importBookmarklet');
    const bookmarklet = importBox.querySelector('.mc-bookmarklet');
    bookmarklet.textContent = '→ CR DEFA'; bookmarklet.href = window.MissionTextImport?.BOOKMARKLET || '#';
    bookmarklet.onclick = event => { event.preventDefault(); importResult.textContent = inLanguage(UI.importBookmarkletHelp); };
    const KINDS = { fpl: 'importFpl', 'ivao-details': 'importIvaoDetails', 'ivao-list': 'importIvaoList', metar: 'importMetar', 'tracker-url': 'importTrackerUrl', 'statsim-flight': 'importStatsim' };
    // Liens vers les trackers (en haut de la fenêtre), avec les identifiants de la mission ou du profil pilote.
    const openLink = (kind, key) => { const a = importBox.querySelector(`[data-open="${kind}"]`); a.textContent = t(key); a.onclick = () => {
      const p = prefs(), vid = mission.network.ivaoId || p.ivaoId, cid = mission.network.vatsimId || p.vatsimId;
      a.href = kind === 'ivao' ? (vid ? `https://tracker.ivao.aero/?userId=${encodeURIComponent(vid)}` : 'https://tracker.ivao.aero/') : (cid ? `https://statsim.net/flights/vatsimid/${encodeURIComponent(cid)}` : 'https://statsim.net/');
    }; };
    openLink('ivao', 'importOpenIvao'); openLink('statsim', 'importOpenStatsim');
    async function importText(text, silent = false) {
      const TI = window.MissionTextImport, result = TI.analyse(text);
      if (result.kind === 'vatsim-history') { window.NetworkTracker?.applyVatsimHistory(text); importResult.textContent = inLanguage(UI.importVatsim); importArea.value = ''; importPanel?.done(); return true; }
      if (!KINDS[result.kind]) { if (!silent) importResult.textContent = inLanguage(UI.importUnknown); return false; }
      const dep = result.fpl?.dep || result.dep || result.sessions?.[0]?.dep || mission.navigation.dep || mission.aircraft[0]?.baseDeparture;
      const ad = dep && !/^ZZZZ$/.test(dep) ? await assist.airport(dep) : null;
      const rotary = mission.aircraft[0]?.category === 'rotary' || A.lookupType(result.fpl?.type)?.category === 'rotary';
      const { done, notes } = TI.apply(mission, result, { tz: ad?.tz || '', rotary });
      // Mêmes aides que la saisie : appareil connu, indicatif de série, terrains, METAR, soleil.
      const lead = mission.aircraft[0] || {};
      if (done.includes('aircraft.0.registration') && lead.registration) aircraftAssist('aircraft.0.registration', lead.registration);
      else if (done.includes('aircraft.0.callsign') && lead.callsign) aircraftAssist('aircraft.0.callsign', lead.callsign);
      if (done.includes('environment.metar')) assist.applyMetar(mission.environment.metar);
      view.render(blockList); assist.decorate(); fplTools(); kpi(); registerI18n(); blockFramework();
      for (const path of ['navigation.dep', 'aircraft.0.baseDeparture']) if (M.get(mission, path)) { await assist.onCommit(path, M.get(mission, path)); break; }
      changed(); switcher.sync();
      importResult.textContent = `${inLanguage(UI[KINDS[result.kind]])} — ${done.length} ${inLanguage(UI.fplFilled)} : ${done.map(p => p.replace(/^\w+\.(\d+\.)?/, '')).join(', ') || '—'}${ad?.tz ? ` · ${inLanguage(UI.importLocal)} ${ad.icao} (${ad.tz})` : ''}${notes.length ? ` · ${notes.join(' · ')}` : ''}`;
      importArea.value = '';
      importPanel?.done(); // bouton « Valider » (ferme la fenêtre)
      return true;
    }
    importBox.querySelector('[data-import="run"]').onclick = () => importText(importArea.value);
    // Fenêtre de copier-coller : « × », « Fermer », bouton désactivé si vide, puis « Valider ».
    let importPanel = null;
    const attachImportPanel = () => { importPanel = window.FileAccess?.pastePanel({ root: importBox.querySelector('.mc-import-pop'), area: importArea, run: importBox.querySelector('[data-import="run"]'), close: () => { importBox.open = false; }, runLabel: () => inLanguage(UI.importRun) }) || importPanel; };
    if (window.FileAccess) attachImportPanel(); else window.addEventListener('load', attachImportPanel, { once: true });
    importArea.addEventListener('paste', () => setTimeout(() => importText(importArea.value)));
    // Presse-papiers : une lecture à la fois. La demande d'autorisation de Chrome fait perdre
    // puis reprendre le focus à la page : une lecture automatique au retour ne doit jamais
    // déclencher cette demande (sinon boucle). Ctrl+V dans la zone ne demande rien.
    let clipBusy = false, clipArmed = false, lastClip = '';
    const readClipboard = async silent => {
      if (clipBusy) return false; clipBusy = true;
      try {
        const text = await navigator.clipboard.readText();
        if (!text || (silent && text === lastClip)) return false; // déjà analysé
        const ok = await importText(text, silent); if (ok) lastClip = text; return ok;
      }
      catch { if (!silent) importResult.textContent = inLanguage(UI.importClipDenied); }
      finally { clipBusy = false; }
      return false;
    };
    const clipGranted = async () => { try { return (await navigator.permissions.query({ name: 'clipboard-read' })).state === 'granted'; } catch { return false; } };
    importBox.querySelector('[data-import="clip"]').onclick = () => readClipboard(false);
    importBox.addEventListener('toggle', () => { if (importBox.open) { importArea.focus(); importResult.textContent = inLanguage(UI.importPasteHint); } });
    // Départ vers le tracker, retour sur la page (favori « → CR DEFA ») : une seule lecture, et
    // seulement si l'autorisation est déjà accordée (jamais de demande automatique).
    window.addEventListener('blur', () => { if (importBox.open && !clipBusy) clipArmed = true; });
    window.addEventListener('focus', async () => {
      if (!clipArmed || clipBusy || !importBox.open || importArea.value) return;
      clipArmed = false;
      if (await clipGranted()) readClipboard(true);
    });

    let i18nDone = new Set();
    function registerI18n() {
      if (!window.RepositoryContentI18n) return;
      const pending = view.i18nRows().concat([...ui.values()], (family.i18n || []), reportRows).filter(row => !i18nDone.has(row[0]));
      if (!pending.length) return;
      pending.forEach(row => i18nDone.add(row[0]));
      window.RepositoryContentI18n(pending);
    }

    async function persist(messageKey) {
      const result = await ledger.save();
      ledgerInfo();
      $a('download').hidden = result.written;
      status.textContent = result.written ? `${t(messageKey)} (${ledger.filename})` : `${t(messageKey)} — ${t('storedBrowserOnly')}`;
      return result;
    }
    async function store() {
      // Registre illisible au chargement (erreur réseau) : nouvel essai avant toute écriture.
      if (ledger.state.source === 'unavailable') { await ledger.load(true); ledgerInfo(); if (ledger.state.source === 'unavailable') { status.textContent = `${window.MissionLedger.FILE} : ${inLanguage(UI.ledgerUnavailable)}`; return; } }
      if (M.upperText(mission)) view.sync();
      mission.statistics = M.computeStatistics(mission);
      if (edit) {
        const current = ledger.missions[edit.index];
        if (!current || normId(current.metadata?.missionId) !== normId(edit.missionId)) { say('editGone'); edit = null; modeUi(); return; }
        ledger.replace(edit.index, mission); edit.missionId = mission.metadata.missionId;
      } else {
        if (ledger.count(mission.metadata.missionId) && !confirm(t('duplicate'))) { form.querySelector('[data-path="metadata.missionId"]')?.focus(); return; }
        const index = ledger.add(mission);
        // La mission enregistrée devient la mission ouverte (modifiable) ; le brouillon « nouvelle mission » est libéré.
        localStorage.removeItem(draftKey);
        edit = { index, missionId: mission.metadata.missionId };
        history.replaceState(null, '', `?edit=${index}&id=${encodeURIComponent(mission.metadata.missionId)}`);
      }
      A.recordMission(mission);
      await persist('stored');
      dirty = false; modeUi(); saveDraft(true);
    }

    $a('store').onclick = () => store();
    // ---- envoi du CR à un webservice JSON (adresse et clef : Paramétrage → Envoi des comptes rendus).
    // La clef est conservée à part (missionSendKey:v1), hors sauvegarde locale.
    const SEND_CONFIG = 'missionSendConfig:v1', SEND_KEY = 'missionSendKey:v1', SEND_LOG = 'missionSendLog:v1';
    const readJson = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
    const sendConfig = () => ({ header: 'Authorization', scheme: 'Bearer', ...(readJson(SEND_CONFIG) || {}), key: localStorage.getItem(SEND_KEY) || '' });
    const sendLogKey = () => `${family.id}:${normId(mission.metadata?.missionId)}:${mission.metadata?.date || ''}`;
    function sendUi() {
      const button = $a('send'), config = sendConfig(), last = (readJson(SEND_LOG) || {})[sendLogKey()];
      button.textContent = t('sendReport'); button.classList.toggle('mc-send-off', !config.url);
      button.title = !config.url ? inLanguage(UI.sendNotConfigured) : `${inLanguage(UI.sendConfirm)} : ${config.url}${last ? `\n${inLanguage(UI.sentBefore)} ${new Date(last.at).toLocaleString()} (HTTP ${last.status})` : ''}`;
    }
    $a('send').onclick = async () => {
      const config = sendConfig();
      if (!config.url) { if (confirm(inLanguage(UI.sendSetupNow))) window.open(settingsUrl('send'), '_blank'); else status.textContent = inLanguage(UI.sendNotConfigured); return; }
      if ((!edit || dirty) && !confirm(inLanguage(UI.sendUnsaved))) return;
      M.upperText(mission); renderReport();
      const shown = isPublic() ? M.redact(mission, family) : mission, report = root.querySelector('#mcReport');
      const p = prefs(), body = {
        format: 'defa-mission-report', version: 1, sentAt: new Date().toISOString(),
        family: family.id, series: mission.series || '', missionId: mission.metadata?.missionId || '', date: mission.metadata?.date || '',
        public: isPublic(), mission: shown,
        report: { html: report.innerHTML, text: report.innerText },
        statistics: M.computeStatistics(mission),
        sender: { ivaoId: mission.network?.ivaoId || p.ivaoId || '', vatsimId: mission.network?.vatsimId || p.vatsimId || '', page: location.href }
      };
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (config.key) headers[config.header || 'Authorization'] = config.scheme ? `${config.scheme} ${config.key}` : config.key;
      const button = $a('send'); button.disabled = true; status.textContent = t('sending');
      try {
        const response = await fetch(config.url, { method: 'POST', headers, body: JSON.stringify(body) });
        const text = (await response.text().catch(() => '')).trim();
        let reply = ''; try { const json = JSON.parse(text); reply = json.message || json.id || json.reference || ''; } catch { reply = text.slice(0, 120); }
        if (response.ok) { const log = readJson(SEND_LOG) || {}; log[sendLogKey()] = { at: body.sentAt, status: response.status, url: config.url, reply: String(reply) }; localStorage.setItem(SEND_LOG, JSON.stringify(log)); }
        status.textContent = `${t(response.ok ? 'sent' : 'sendFailed')} — HTTP ${response.status}${reply ? ` : ${reply}` : ''}`;
      } catch (error) { status.textContent = `${t('sendFailed')} — ${inLanguage(UI.sendCors)} (${error.message})`; }
      finally { button.disabled = false; sendUi(); }
    };
    $a('render').onclick = () => renderReport();
    $a('public').onchange = () => renderReport();
    // Impression : seul le compte rendu est imprimé (voir core.css, @media print).
    $a('print').onclick = () => { renderReport(); window.print(); };
    window.addEventListener('repository-language-change', () => setTimeout(renderReport));
    $a('delete').onclick = async () => {
      if (!edit || !confirm(t('confirmDelete'))) return;
      const current = ledger.missions[edit.index];
      if (!current || normId(current.metadata?.missionId) !== normId(edit.missionId)) { say('editGone'); return; }
      ledger.remove(edit.index); localStorage.removeItem(draftSlot());
      await persist('deleted'); dirty = false;
      location.href = family.pages.reporting || location.pathname;
    };
    $a('new').onclick = () => {
      if (dirty && !confirm(t('confirmNew'))) return;
      localStorage.removeItem(draftKey); edit = null; history.replaceState(null, '', location.pathname);
      mission = fresh(); dirty = false; redraw(); assist.autoEnvironment('now');
    };
    $a('folder').onclick = async () => { try { await ledger.chooseFolder(); await ledger.load(); ledgerInfo(); await persist('stored'); } catch (error) { status.textContent = error.message; } };
    $a('download').onclick = () => ledger.downloadYaml();
    const picker = tools.querySelector('input[type="file"]');
    $a('import').onclick = () => picker.click();
    picker.onchange = () => {
      const file = picker.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = M.parse(reader.result, family.id);
          if (imported.family && imported.family !== family.id && !confirm(t('otherFamily'))) return;
          mission = imported; edit = null; history.replaceState(null, '', location.pathname); dirty = true; redraw(); saveDraft(); say('imported', file.name);
        } catch (error) { say('importError', error.message); }
        picker.value = '';
      };
      reader.readAsText(file);
    };
    $a('export').onclick = () => {
      mission.statistics = M.computeStatistics(mission);
      // Version publique cochée : export expurgé des données sensibles (suffixe _public).
      const exported = isPublic() ? M.redact(mission, family) : mission;
      const name = `${mission.metadata.missionId || family.id}_${mission.metadata.date || 'mission'}${isPublic() ? '_public' : ''}.yaml`.replace(/[\\/:*?"<>| ]+/g, '_');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([M.toYaml(exported)], { type: 'text/yaml;charset=utf-8' }));
      link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      say('exported', name);
    };
    // Quitter la page sans avoir enregistré la mission dans le registre : avertissement
    // (le brouillon reste de toute façon conservé dans le navigateur).
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = t('leave'); } });
    // Données locales restaurées (menu ☰ › Données locales) : registre relu.
    window.addEventListener('local-store-restored', () => ledger.load(true).then(() => { ledgerInfo(); if (!edit && !dirty) { mission = fresh(); redraw(); } }));
    window.addEventListener('load', () => window.RepositoryNav?.addAction?.(`${t('viewReporting')} ${family.id}`, () => { location.href = family.pages.reporting; }));

    // ---- en-tête : famille / sous-type (série) de la mission
    const switcher = headerSwitch({
      family, kind: 'cr', t,
      get: () => mission.series,
      set: value => { mission.series = value; view.sync(); view.refresh(); kpi(); changed(); }
    });
    // Famille · série : première entrée de la barre d'outils (contexte de la saisie).
    const switchBox = header?.querySelector('.mc-switch'); if (switchBox) tools.querySelector('.mc-toolbar').prepend(switchBox);

    // ---- initialisation : registre, puis mission à ouvrir (modification, brouillon ou nouvelle)
    redraw();
    const ready = (async () => {
      await ledger.load();
      if (editIndex != null) {
        const target = ledger.missions[editIndex], id = params.get('id');
        if (target && (!id || normId(target.metadata?.missionId) === normId(id))) {
          edit = { index: editIndex, missionId: target.metadata.missionId };
          let draft = null; try { draft = JSON.parse(localStorage.getItem(draftSlot()) || 'null'); } catch { draft = null; }
          mission = M.migrate(draft || target, family.id); dirty = !!draft;
        } else { say('editGone'); history.replaceState(null, '', location.pathname); }
      }
      if (!edit) {
        let draft = null; try { draft = JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch { draft = null; }
        mission = draft ? M.migrate(draft, family.id) : fresh(); dirty = !!draft;
      }
      // Mission générée par le générateur SIA XML (« Créer le CR DEFA ») : nouveau CR pré-rempli.
      let sia = null;
      if (!edit && params.get('from') === 'sia') {
        try { sia = JSON.parse(localStorage.getItem(SIA_KEY) || 'null'); } catch { sia = null; }
        if (sia && dirty && !confirm(t('fromSiaReplace'))) sia = null;
        if (sia) { mission = fresh(); fromSia(mission, sia); dirty = true; localStorage.removeItem(SIA_KEY); }
        history.replaceState(null, '', location.pathname);
      }
      redraw();
      if (sia) {
        const lead = mission.aircraft[0] || {};
        if (lead.callsign) aircraftAssist('aircraft.0.callsign', lead.callsign); else if (lead.type) aircraftAssist('aircraft.0.type', lead.type);
        if (mission.navigation.dep) await assist.onCommit('navigation.dep', mission.navigation.dep);
        changed(); say('fromSia', sia.title || '');
      }
      if (!edit && !dirty) assist.autoEnvironment('now'); // nouvelle mission : météo du terrain de départ par défaut
    })();

    return { family, ledger, ready, get mission() { return mission; }, set mission(value) { mission = M.migrate(value, family.id); redraw(); }, get editing() { return edit; }, redraw, store, statistics: () => M.computeStatistics(mission), context: () => view.context() };
  }

  // ---- mission générée (SIA XML, schéma helo-xp-mission) → champs du CR
  const SIA_KEY = 'siaMissionToCr:v1';
  // « A400M Atlas », « C-130J-30 Super Hercules » → type OACI du catalogue commun (A4M, C130…).
  function siaType(text) {
    const A = window.MissionAircraft; text = String(text || '').trim(); if (!A || !text) return null;
    const first = text.split(/\s+/)[0], key = v => v.normalize('NFD').replace(/[^a-z0-9]/gi, '').toLowerCase();
    for (const c of [text, first, first.replace(/[^a-z0-9]/gi, '')]) for (let n = c.length; n >= 4; n--) { const r = A.lookupType(c.slice(0, n)); if (r) return r; }
    return key(first).length < 3 ? null : (A.listTypes?.() || []).find(t => t.model && key(t.model).includes(key(first))) || null;
  }
  function fromSia(m, y) {
    const M = window.MissionModel, meta = y.mission || {}, icao = p => (/\(([A-Z0-9]{4})\)/.exec(p?.name || '') || [])[1] || '';
    const place = p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) ? `${p.name || p.id} ${(+p.lat).toFixed(5)} ${(+p.lon).toFixed(5)}` : '';
    m.metadata.operationName = y.title || '';
    if (meta.id != null) m.metadata.missionNumber = String(meta.id);
    m.tasking.objective = y.summary || '';
    m.tasking.instructions = y.detailed_description || y.description_detaillee || '';
    m.navigation.dep = icao(y.origin); m.navigation.arr = icao(y.destination) || m.navigation.dep;
    const points = y.turning_points || [];
    m.navigation.waypoints = points.map(p => p.name || p.id).join(' ');
    m.navigation.coordinates = [y.origin, ...points, ...(y.rendezvous || []), y.target, y.destination].map(place).filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join('\n');
    if (y.target?.name) m.navigation.area = y.target.name;
    // Appareils : bloc aircraft, sinon équipes dont le type est un aéronef connu (indicatif = nom de l'équipe).
    let aircraft = (y.aircraft || []).filter(a => a && (a.type || a.callsign));
    if (!aircraft.length) aircraft = (y.teams || []).filter(tm => siaType(tm?.type)).map(tm => ({ type: tm.type, callsign: tm.name, operator: tm.service }));
    if (aircraft.length) m.aircraft = aircraft.map((a, i) => { const known = siaType(a.type); return Object.assign(i ? M.emptyAircraft() : m.aircraft[0] || M.emptyAircraft(), { type: known?.tdesig || a.type || '', variant: known ? a.type : '', ...(known?.category ? { category: known.category } : {}), callsign: String(a.callsign || '').replace(/\s+/g, '') }); });
    m.organisation.organisation = aircraft[0]?.operator || m.organisation.organisation;
    const payload = y.payload ? [y.payload.category, y.payload.description, y.payload.mass_kg ? `${y.payload.mass_kg} kg` : '', y.payload.passengers ? `${y.payload.passengers} PAX` : ''].filter(Boolean).join(' — ') : '';
    m.remarks.observations = [`Mission générée (SIA XML) : ${[meta.type, meta.subtype].filter(Boolean).join(' / ')} — ${y.title || ''}`, payload && `Charge : ${payload}`].filter(Boolean).join('\n');
  }

  // Sélecteur d'en-tête (pages CR et reporting) : changement de famille (même type de page)
  // et sous-type (série) de la famille courante.
  function headerSwitch({ family, kind, t, get, set, all = false }) {
    const header = document.querySelector('header.mc-header');
    if (!header) return { sync() {} };
    // Popup compacte (l'en-tête reste collé en haut de page) : « HEMS · HEMS primaire ▾ ».
    const box = document.createElement('details'); box.className = 'mc-switch';
    const here = (window.MissionVocab.families || []).find(f => f.id === family.id);
    const depth = here ? here[kind].split('/').length - 1 : 1, root = '../'.repeat(depth);
    box.innerHTML = `<summary><b></b> · <span class="mc-switch-series"></span> ▾</summary><div class="mc-switch-pop"><label><span></span><select data-switch="family"></select></label><label><span></span><select data-switch="series"></select></label></div>`;
    box.querySelector('summary b').textContent = family.id;
    const [familyLabel, seriesLabel] = box.querySelectorAll('label span');
    familyLabel.textContent = t('switchFamily'); seriesLabel.textContent = t('switchSeries');
    const familySelect = box.querySelector('[data-switch="family"]'), seriesSelect = box.querySelector('[data-switch="series"]');
    const familyOptions = () => { familySelect.innerHTML = (window.MissionVocab.families || []).map(f => `<option value="${esc(f.id)}"${f.id === family.id ? ' selected' : ''}>${esc(f.id)} — ${esc(inLanguage(f.labels || [f.label]))}</option>`).join(''); };
    familyOptions(); window.addEventListener('repository-language-change', () => setTimeout(familyOptions));
    familySelect.onchange = () => { const target = window.MissionVocab.families.find(f => f.id === familySelect.value); if (target) location.href = root + target[kind]; };
    seriesSelect.innerHTML = (all ? `<option value="">${esc(t('allSeries'))}</option>` : '') + (family.series || []).map(s => `<option value="${esc(s.value)}">${esc(Array.isArray(s.label) ? s.label[0] : s.label || s.value)}</option>`).join('');
    const summary = () => { box.querySelector('.mc-switch-series').textContent = seriesSelect.selectedOptions[0]?.textContent || '—'; };
    seriesSelect.onchange = () => { set(seriesSelect.value); summary(); box.open = false; };
    // Fermeture au clic hors de la popup.
    document.addEventListener('click', event => { if (box.open && !box.contains(event.target)) box.open = false; });
    header.insertBefore(box, header.querySelector('.mc-header-tools')); summary(); // avant la barre d'outils
    return { sync() { const value = get() || ''; if ([...seriesSelect.options].some(o => o.value === value)) seriesSelect.value = value; summary(); } };
  }

  window.MissionCore = { registerFamily, families, mount, headerSwitch, inLanguage, L, UI };
})();
