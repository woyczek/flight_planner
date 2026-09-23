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
    reportTitle: L('Compte rendu', 'Report', 'Bericht', 'Informe'),
    render: L('Générer / actualiser le CR', 'Generate / refresh report', 'Bericht erzeugen / aktualisieren', 'Generar / actualizar el informe'),
    print: L('PDF / Imprimer', 'PDF / Print', 'PDF / Drucken', 'PDF / Imprimir'),
    leave: L('La mission n’a pas été enregistrée dans le registre. Quitter quand même ?', 'The mission has not been saved to the ledger. Leave anyway?', 'Der Einsatz wurde nicht im Register gespeichert. Trotzdem verlassen?', 'La misión no se ha guardado en el registro. ¿Salir de todos modos?')
  };

  function registerFamily(def) {
    if (!def?.id) throw new Error('Famille sans identifiant');
    families.set(def.id, { blocks: [], series: [], pages: {}, ...def });
    return families.get(def.id);
  }

  function mount({ family: familyId, root }) {
    const family = families.get(familyId);
    if (!family) throw new Error(`Famille inconnue : ${familyId}`);
    document.body.dataset.family = family.id;
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
      if (family.defaultCategory) mission.aircraft[0].category = family.defaultCategory;
      const p = prefs(); mission.network.ivaoId = p.ivaoId || ''; mission.network.vatsimId = p.vatsimId || '';
      return mission;
    };
    let mission = M.emptyMission(family.id), dirty = false;

    root.classList.add('mc-page');
    root.innerHTML = `<form id="missionCoreForm" class="mc-form" autocomplete="off">
      <section class="mc-edit-banner" hidden><h2></h2><p class="note mc-edit-info"></p></section>
      <section class="controls mc-controls"><h2></h2><div class="row">
        <button type="button" class="primary" data-action="store"></button>
        <button type="button" class="danger" data-action="delete" hidden></button>
        <button type="button" class="secondary" data-action="new"></button>
        <button type="button" class="secondary" data-action="export"></button>
        <button type="button" class="secondary" data-action="import"></button>
        <a class="secondary mc-button" data-action="reporting"></a>
        <button type="button" class="secondary" data-action="folder"></button>
        <button type="button" class="secondary" data-action="download" hidden></button>
        <input type="file" accept=".yaml,.yml,.json,application/json,text/yaml" hidden></div>
        <p class="small mc-ledger-info"></p><p class="small mc-status"></p></section>
      <section class="mc-report-panel" data-block-id="mc-report"><h2></h2><div class="row mc-report-actions">
        <button type="button" class="primary" data-action="render"></button><button type="button" class="secondary" data-action="print"></button></div>
        <div class="report" id="mcReport"></div></section></form>
      <aside class="mc-aside"><div class="panel mc-kpi-panel"><h2></h2><div class="mc-kpi"></div><h3></h3><div class="small mc-context"></div></div></aside>`;
    const form = root.querySelector('form'), status = root.querySelector('.mc-status');
    const $a = action => root.querySelector(`[data-action="${action}"]`);
    const ui = new Map();
    const t = key => { const row = UI[key]; ui.set(row[0], row); return row[0]; };
    const say = (key, extra = '') => { status.textContent = t(key) + (extra ? ` : ${extra}` : ''); };
    [['render', 'render'], ['print', 'print'], ['new', 'newMission'], ['import', 'importFile'], ['export', 'exportYaml'], ['reporting', 'viewReporting'], ['folder', 'chooseFolder'], ['download', 'downloadLedger'], ['delete', 'deleteMission']].forEach(([a, k]) => { $a(a).textContent = t(k); });
    $a('reporting').href = family.pages.reporting || '#';
    root.querySelector('.mc-controls h2').textContent = t('ledgerTitle');
    root.querySelector('.mc-kpi-panel h2').textContent = t('kpiTitle');
    root.querySelector('.mc-report-panel h2').textContent = t('reportTitle');
    root.querySelector('.mc-kpi-panel h3').textContent = t('context');
    root.querySelector('.mc-edit-banner h2').textContent = t('editBanner');

    let saveTimer = null;
    const view = window.MissionForm.create(form, {
      family, getMission: () => mission,
      onChange: () => { dirty = true; kpi(); clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveDraft(); renderReport(); }, 400); },
      onCommit: (path, value) => aircraftAssist(path, value)
    });
    const blockList = window.MissionBlocks.ORDER.flatMap(block => block === '__family__' ? family.blocks : [block]);

    // ---- appareils connus / types OACI
    const A = window.MissionAircraft;
    const autoFilled = new WeakMap(); // appareil → valeurs déduites automatiquement du type
    function fillDatalists() {
      const known = A.known();
      form.querySelector('#mc-known-registrations').innerHTML = known.map(a => `<option value="${esc(a.registration)}">${esc([a.type, a.callsigns.join(' / ')].filter(Boolean).join(' — '))}</option>`).join('');
      form.querySelector('#mc-known-callsigns').innerHTML = [...new Set(known.flatMap(a => a.callsigns))].sort().map(c => `<option value="${esc(c)}">`).join('');
      form.querySelector('#mc-aircraft-types').innerHTML = A.listTypes().map(ty => `<option value="${esc(ty.tdesig)}">${esc(ty.model)}</option>`).join('');
    }
    function applyKnown(index, known) {
      const item = mission.aircraft[index];
      ['type', 'variant', 'category'].forEach(k => { if (known[k]) item[k] = known[k]; });
      ['tacticalNumber', 'configuration'].forEach(k => { if (known[k] && !item[k]) item[k] = known[k]; });
      if (!item.callsign && known.callsign) item.callsign = known.callsign;
      if (!item.registration) item.registration = known.registration;
      if (known.equipment?.length) item.equipment = [...new Set([...(item.equipment || []), ...known.equipment])];
      view.rerenderCollectionOf(`aircraft.${index}.registration`); view.sync('aircraft.');
      if (item.type) aircraftAssist(`aircraft.${index}.type`, item.type); // modèle OACI, catégorie si absente
      view.hint(`aircraft.${index}.registration`, t('knownAircraft') + (known.date && known.date > '0000-00-01' ? ` — ${known.date}` : ''));
      kpi();
    }
    function aircraftAssist(path, value) {
      const m = /^aircraft\.(\d+)\.(registration|callsign|type)$/.exec(path); if (!m) return;
      const index = Number(m[1]), field = m[2], item = mission.aircraft[index];
      if (field === 'registration') { const known = A.find(value); if (known) applyKnown(index, known); else view.hint(path, ''); }
      if (field === 'callsign' && !item.registration) { const known = A.findByCallsign(value); if (known) applyKnown(index, known); }
      if (field === 'type') {
        // Variante / catégorie déduites du type : remplacées si elles avaient été déduites
        // automatiquement d'un type précédent, jamais si le pilote les a saisies.
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
      root.querySelector('.mc-ledger-info').textContent = `${ledger.filename} · ${ledger.missions.length} ${t('missions')} · ${t('folder')} : ${ledger.state.folder || t('browserOnly')}`;
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
      const { html, rows } = window.MissionReport.render(mission, family, view.context() || view.refresh());
      root.querySelector('#mcReport').innerHTML = html;
      reportRows = rows; registerI18n();
    }
    function redraw() { view.render(blockList); fillDatalists(); kpi(); modeUi(); ledgerInfo(); renderReport(); registerI18n(); }

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
      ledgerInfo(); fillDatalists();
      $a('download').hidden = result.written;
      status.textContent = result.written ? `${t(messageKey)} (${ledger.filename})` : `${t(messageKey)} — ${t('storedBrowserOnly')}`;
      return result;
    }
    async function store() {
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
    const picker = root.querySelector('input[type="file"]');
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
      const name = `${mission.metadata.missionId || family.id}_${mission.metadata.date || 'mission'}.yaml`.replace(/[\\/:*?"<>| ]+/g, '_');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([M.toYaml(mission)], { type: 'text/yaml;charset=utf-8' }));
      link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      say('exported', name);
    };
    // Quitter la page sans avoir enregistré la mission dans le registre : avertissement
    // (le brouillon reste de toute façon conservé dans le navigateur).
    window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = t('leave'); } });
    window.addEventListener('load', () => window.RepositoryNav?.addAction?.(`${t('viewReporting')} ${family.id}`, () => { location.href = family.pages.reporting; }));

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

  window.MissionCore = { registerFamily, families, mount, L, UI };
})();
