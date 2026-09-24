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
    importIntro: L('Collez un plan de vol OACI « (FPL-…) », une page du tracker IVAO (détails d’un vol ou liste des connexions : Ctrl+A, Ctrl+C sur la page), l’historique VATSIM (JSON) ou un METAR : les champs vides sont remplis. Heures du tracker converties en heure locale du terrain de départ.', 'Paste an ICAO flight plan “(FPL-…)”, an IVAO tracker page (flight details or connection list: Ctrl+A, Ctrl+C on the page), the VATSIM history (JSON) or a METAR: empty fields are filled. Tracker times converted to local time at the departure aerodrome.', 'Einen ICAO-Flugplan „(FPL-…)“, eine IVAO-Tracker-Seite (Flugdetails oder Verbindungsliste: Strg+A, Strg+C auf der Seite), die VATSIM-Historie (JSON) oder ein METAR einfügen: leere Felder werden ausgefüllt. Tracker-Zeiten in Ortszeit des Startflugplatzes umgerechnet.', 'Pegue un plan de vuelo OACI «(FPL-…)», una página del tracker IVAO (detalle de un vuelo o lista de conexiones: Ctrl+A, Ctrl+C en la página), el historial VATSIM (JSON) o un METAR: se rellenan los campos vacíos. Horas del tracker convertidas a hora local del aeródromo de salida.'),
    importRun: L('Analyser et remplir', 'Analyse and fill', 'Auswerten und ausfüllen', 'Analizar y rellenar'), importClip: L('Coller depuis le presse-papiers', 'Paste from clipboard', 'Aus Zwischenablage einfügen', 'Pegar desde el portapapeles'),
    importBookmarklet: L('← à glisser dans la barre des favoris : un clic sur la page du tracker IVAO la copie ; revenez ici, elle est analysée.', '← drag to the bookmarks bar: one click on the IVAO tracker page copies it; come back here, it is analysed.', '← in die Lesezeichenleiste ziehen: ein Klick auf der IVAO-Tracker-Seite kopiert sie; hierher zurückkehren, sie wird ausgewertet.', '← arrastre a la barra de marcadores: un clic en la página del tracker IVAO la copia; vuelva aquí, se analiza.'),
    importBookmarkletHelp: L('Ce lien s’utilise depuis la barre des favoris, sur la page du tracker (glisser-déposer le lien dans la barre).', 'Use this link from the bookmarks bar, on the tracker page (drag and drop the link into the bar).', 'Diesen Link aus der Lesezeichenleiste auf der Tracker-Seite verwenden (Link in die Leiste ziehen).', 'Use este enlace desde la barra de marcadores, en la página del tracker (arrastre el enlace a la barra).'),
    importFpl: L('Plan de vol OACI', 'ICAO flight plan', 'ICAO-Flugplan', 'Plan de vuelo OACI'), importIvaoDetails: L('Tracker IVAO — détails du vol', 'IVAO tracker — flight details', 'IVAO-Tracker — Flugdetails', 'Tracker IVAO — detalle del vuelo'),
    importIvaoList: L('Tracker IVAO — connexions', 'IVAO tracker — connections', 'IVAO-Tracker — Verbindungen', 'Tracker IVAO — conexiones'), importMetar: L('METAR', 'METAR'),
    importVatsim: L('Historique VATSIM analysé (voir le suivi réseau dans l’en-tête).', 'VATSIM history analysed (see network tracking in the header).', 'VATSIM-Historie ausgewertet (siehe Netzwerk-Tracking in der Kopfzeile).', 'Historial VATSIM analizado (ver el seguimiento de red en la cabecera).'),
    importUnknown: L('Texte non reconnu : plan de vol « (FPL-…) », page du tracker IVAO, historique VATSIM (JSON) ou METAR attendus.', 'Text not recognised: flight plan “(FPL-…)”, IVAO tracker page, VATSIM history (JSON) or METAR expected.', 'Text nicht erkannt: Flugplan „(FPL-…)“, IVAO-Tracker-Seite, VATSIM-Historie (JSON) oder METAR erwartet.', 'Texto no reconocido: se espera un plan de vuelo «(FPL-…)», una página del tracker IVAO, el historial VATSIM (JSON) o un METAR.'),
    importClipDenied: L('Lecture du presse-papiers refusée : collez dans la zone (Ctrl+V).', 'Clipboard access denied: paste into the box (Ctrl+V).', 'Zugriff auf die Zwischenablage verweigert: in das Feld einfügen (Strg+V).', 'Acceso al portapapeles denegado: pegue en el cuadro (Ctrl+V).'),
    importPasteHint: L('Collez avec Ctrl+V dans la zone (analyse immédiate). « Coller depuis le presse-papiers » demande l’autorisation une fois ; ensuite, le retour depuis le tracker (favori « → CR DEFA ») est analysé automatiquement.', 'Paste with Ctrl+V in the box (immediate analysis). “Paste from clipboard” asks for permission once; then returning from the tracker (“→ CR DEFA” bookmark) is analysed automatically.', 'Mit Strg+V in das Feld einfügen (sofortige Auswertung). „Aus Zwischenablage einfügen“ fragt einmal nach der Erlaubnis; danach wird die Rückkehr vom Tracker (Lesezeichen „→ CR DEFA“) automatisch ausgewertet.', 'Pegue con Ctrl+V en el cuadro (análisis inmediato). «Pegar desde el portapapeles» pide permiso una vez; después, la vuelta desde el tracker (marcador «→ CR DEFA») se analiza automáticamente.'),
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
    const tools = document.createElement('div'); tools.className = 'mc-header-tools';
    tools.innerHTML = `<div class="mc-header-ledger"><span class="mc-header-label"></span>
        <button type="button" class="primary" data-action="store"></button>
        <button type="button" class="danger" data-action="delete" hidden></button>
        <button type="button" data-action="new"></button>
        <button type="button" data-action="export"></button>
        <button type="button" data-action="import"></button>
        <details class="mc-import"><summary></summary><div class="mc-import-pop"><p class="small mc-import-intro"></p>
          <textarea spellcheck="false" rows="8"></textarea>
          <div class="mc-import-row"><button type="button" class="primary" data-import="run"></button><button type="button" data-import="clip"></button>
          <a class="mc-bookmarklet" draggable="true"></a><span class="small mc-import-hint"></span></div>
          <p class="small mc-import-result"></p></div></details>
        <a class="mc-button" data-action="reporting"></a>
        <button type="button" data-action="folder"></button>
        <button type="button" data-action="download" hidden></button>
        <input type="file" accept=".yaml,.yml,.json,application/json,text/yaml" hidden>
        <span class="mc-ledger-info"></span><span class="mc-status"></span></div>
      <div id="mc-header-tracker"></div>`;
    if (header) header.append(tools);
    root.innerHTML = `<form id="missionCoreForm" class="mc-form" autocomplete="off">
      <section class="mc-edit-banner" hidden><h2></h2><p class="note mc-edit-info"></p></section></form>
      <aside class="mc-aside"><div class="panel mc-kpi-panel"><h2></h2><div class="mc-kpi"></div><h3></h3><div class="small mc-context"></div></div>
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
    tools.querySelector('.mc-header-label').textContent = t('ledgerTitle');
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
    const changed = () => { dirty = true; kpi(); clearTimeout(saveTimer); saveTimer = setTimeout(() => { if (M.upperText(mission)) view.sync(); saveDraft(); renderReport(); }, 400); };
    const view = window.MissionForm.create(form, {
      family, getMission: () => mission,
      onChange: changed,
      onCommit: (path, value) => {
        aircraftAssist(path, value); assist.onCommit(path, value);
        // Opérateur (organisme) modifié : indicatif de série de l'appareil principal réévalué.
        if (path === 'organisation.organisation' && (operatorAssist(0) + autoSeries(0))) { view.sync('aircraft.'); changed(); }
      },
      suggest: (...args) => assist.suggest(...args)
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
      try { identityAssist(index, m[2], value, item); } finally { if (autoSeries(index)) { view.sync('aircraft.'); changed(); } }
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
      if (field === 'callsignPrefix' || field === 'callsignNumber') { if (field === 'callsignPrefix') item.callsignPrefix = A.canonicalPrefix(item.callsignPrefix); item.callsign = M.joinCallsign(item.callsignPrefix, item.callsignNumber); value = item.callsign; }
      if (CALLSIGN.includes(field)) { fplAssist(item, autoFilled.get(item) || {}); operatorAssist(index); view.sync('aircraft.'); }
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
      const ctx = view.context() || {};
      root.querySelector('.mc-context').innerHTML = `<b>${esc(family.id)}</b> · ${esc(mission.series || '—')}<br>${esc(t('categories'))} : ${esc([...(ctx.categories || [])].join(', ') || t('none'))}<br>${esc(t('capabilities'))} : ${esc([...(ctx.capabilities || [])].join(', ') || t('none'))}`;
    }
    function ledgerInfo() {
      tools.querySelector('.mc-ledger-info').textContent = `${ledger.filename} · ${family.id} : ${ledger.missions.length} ${t('missions')} · ${t('folder')} : ${ledger.state.folder || t('browserOnly')}`;
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
    function redraw() { view.render(blockList); assist.decorate(); fplTools(); kpi(); modeUi(); ledgerInfo(); renderReport(); switcher.sync(); registerI18n(); blockFramework(); }
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
    const KINDS = { fpl: 'importFpl', 'ivao-details': 'importIvaoDetails', 'ivao-list': 'importIvaoList', metar: 'importMetar', 'tracker-url': 'importTrackerUrl' };
    async function importText(text, silent = false) {
      const TI = window.MissionTextImport, result = TI.analyse(text);
      if (result.kind === 'vatsim-history') { window.NetworkTracker?.applyVatsimHistory(text); importResult.textContent = inLanguage(UI.importVatsim); importArea.value = ''; return true; }
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
      return true;
    }
    importBox.querySelector('[data-import="run"]').onclick = () => importText(importArea.value);
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
      mission = fresh(); dirty = false; redraw();
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
    // « Analyser / importer… » sur la ligne de la popup famille / sous-type (au-dessus du registre).
    if (header) header.insertBefore(importBox, tools);

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
      redraw();
    })();

    return { family, ledger, ready, get mission() { return mission; }, set mission(value) { mission = M.migrate(value, family.id); redraw(); }, get editing() { return edit; }, redraw, store, statistics: () => M.computeStatistics(mission), context: () => view.context() };
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
    familySelect.innerHTML = (window.MissionVocab.families || []).map(f => `<option value="${esc(f.id)}"${f.id === family.id ? ' selected' : ''}>${esc(f.id)} — ${esc(f.label)}</option>`).join('');
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
