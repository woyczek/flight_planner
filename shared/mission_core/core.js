(() => {
  'use strict';
  // Mission Report Core — registre des familles et montage d'une page de saisie de CR.
  // Une famille se déclare par configuration (MissionCore.registerFamily) :
  //   { id, idPrefix, title, series:[{value,label,subtypes}], capabilities?, crewRoles?,
  //     events?, flags?, defaultCategory?, blocks:[blocs spécifiques (missionData.*)] }
  // Étape 1a : saisie, calculs, brouillon, import/export YAML. Rendu du CR et résumé
  // (1b), registre et reporting (1c) viennent s'appuyer sur la même API.
  const V = window.MissionVocab, M = window.MissionModel, L = V.L;
  const families = new Map();
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const duration = n => n == null ? '—' : n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}` : `${n} min`;
  const UI = {
    kpiTitle: L('Calculs automatiques', 'Automatic calculations', 'Automatische Berechnungen', 'Cálculos automáticos'),
    block: L('Temps bloc', 'Block time', 'Blockzeit', 'Tiempo calzo a calzo'), flight: L('Temps de vol', 'Flight time', 'Flugzeit', 'Tiempo de vuelo'),
    transitOut: L('Transit aller', 'Transit outbound', 'Anflug', 'Tránsito de ida'), onStation: L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona'),
    transitIn: L('Transit retour', 'Transit inbound', 'Rückflug', 'Tránsito de vuelta'), mission: L('Temps mission', 'Mission time', 'Missionszeit', 'Tiempo de misión'),
    fuelUsed: L('Carburant consommé', 'Fuel used', 'Kraftstoffverbrauch', 'Combustible consumido'), fuelOnStation: L('Carburant sur zone', 'Fuel on station', 'Kraftstoff im Einsatzraum', 'Combustible en zona'),
    context: L('Contexte d’affichage', 'Display context', 'Anzeigekontext', 'Contexto de visualización'), capabilities: L('Capacités', 'Capabilities', 'Fähigkeiten', 'Capacidades'),
    categories: L('Types d’appareil', 'Aircraft types', 'Luftfahrzeugarten', 'Tipos de aeronave'), none: L('aucune', 'none', 'keine', 'ninguna'),
    newMission: L('Nouvelle mission', 'New mission', 'Neuer Einsatz', 'Nueva misión'), importFile: L('Importer (YAML / ancien JSON)', 'Import (YAML / legacy JSON)', 'Importieren (YAML / altes JSON)', 'Importar (YAML / JSON antiguo)'),
    exportYaml: L('Exporter la mission (YAML)', 'Export mission (YAML)', 'Einsatz exportieren (YAML)', 'Exportar misión (YAML)'),
    confirmNew: L('Effacer le brouillon en cours et commencer une nouvelle mission ?', 'Discard the current draft and start a new mission?', 'Aktuellen Entwurf verwerfen und neuen Einsatz beginnen?', '¿Descartar el borrador actual y empezar una nueva misión?'),
    otherFamily: L('Ce fichier appartient à une autre famille de missions. L’importer quand même ?', 'This file belongs to another mission family. Import anyway?', 'Diese Datei gehört zu einer anderen Einsatzfamilie. Trotzdem importieren?', 'Este archivo pertenece a otra familia de misiones. ¿Importarlo de todos modos?'),
    draftSaved: L('Brouillon enregistré dans le navigateur', 'Draft saved in the browser', 'Entwurf im Browser gespeichert', 'Borrador guardado en el navegador'),
    imported: L('Mission importée', 'Mission imported', 'Einsatz importiert', 'Misión importada'), exported: L('Mission exportée', 'Mission exported', 'Einsatz exportiert', 'Misión exportada'),
    importError: L('Import impossible', 'Import failed', 'Import fehlgeschlagen', 'Importación imposible')
  };

  function registerFamily(def) {
    if (!def?.id) throw new Error('Famille sans identifiant');
    families.set(def.id, { blocks: [], series: [], ...def });
    return families.get(def.id);
  }

  function mount({ family: familyId, root }) {
    const family = families.get(familyId);
    if (!family) throw new Error(`Famille inconnue : ${familyId}`);
    const draftKey = `missionCoreDraft:v1:${family.id}`;
    const prefs = () => { try { return JSON.parse(localStorage.getItem('missionReportingConfig:v1') || '{}'); } catch { return {}; } };
    const fresh = () => {
      const mission = M.emptyMission(family.id);
      mission.metadata.missionId = `${family.idPrefix || family.id}-001`;
      mission.metadata.date = new Date().toISOString().slice(0, 10);
      mission.series = family.series?.[0]?.value || '';
      if (family.defaultCategory) mission.aircraft[0].category = family.defaultCategory;
      const p = prefs(); mission.network.ivaoId = p.ivaoId || ''; mission.network.vatsimId = p.vatsimId || '';
      return mission;
    };
    let mission;
    try { const draft = localStorage.getItem(draftKey); mission = draft ? M.migrate(JSON.parse(draft), family.id) : fresh(); } catch { mission = fresh(); }

    root.classList.add('mc-page');
    root.innerHTML = `<form id="missionCoreForm" class="mc-form" autocomplete="off"><section class="controls mc-controls"><div class="row">
        <button type="button" class="secondary" data-action="new"></button>
        <button type="button" class="secondary" data-action="import"></button>
        <button type="button" class="primary" data-action="export"></button>
        <input type="file" accept=".yaml,.yml,.json,application/json,text/yaml" hidden></div><p class="small mc-status"></p></section></form>
      <aside class="mc-aside"><div class="panel mc-kpi-panel"><h2></h2><div class="mc-kpi"></div><h3></h3><div class="small mc-context"></div></div></aside>`;
    const form = root.querySelector('form'), status = root.querySelector('.mc-status');
    const ui = new Map();
    const t = key => { const row = UI[key]; ui.set(row[0], row); return row[0]; };
    root.querySelector('[data-action="new"]').textContent = t('newMission');
    root.querySelector('[data-action="import"]').textContent = t('importFile');
    root.querySelector('[data-action="export"]').textContent = t('exportYaml');
    root.querySelector('.mc-kpi-panel h2').textContent = t('kpiTitle');
    root.querySelector('.mc-kpi-panel h3').textContent = t('context');

    let saveTimer = null;
    const view = window.MissionForm.create(form, {
      family, getMission: () => mission,
      onChange: () => { kpi(); clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 400); }
    });
    const blockList = window.MissionBlocks.ORDER.flatMap(block => block === '__family__' ? family.blocks : [block]);

    function saveDraft() {
      try { localStorage.setItem(draftKey, JSON.stringify(mission)); status.textContent = `${t('draftSaved')} · ${new Date().toLocaleTimeString()}`; } catch { /* quota : l'export YAML reste disponible */ }
    }
    function kpi() {
      const s = M.computeStatistics(mission), unit = mission.fuel?.unit || '';
      const cell = (key, value) => `<div><span class="small">${esc(t(key))}</span><b>${esc(value)}</b></div>`;
      root.querySelector('.mc-kpi').innerHTML = cell('block', duration(s.blockMinutes)) + cell('flight', duration(s.flightMinutes))
        + cell('transitOut', duration(s.transitOutMinutes)) + cell('onStation', duration(s.timeOnStationMinutes))
        + cell('transitIn', duration(s.transitInMinutes)) + cell('mission', duration(s.missionMinutes))
        + cell('fuelUsed', s.fuelUsed == null ? '—' : `${s.fuelUsed} ${unit}`) + cell('fuelOnStation', s.fuelOnStation == null ? '—' : `${s.fuelOnStation} ${unit}`);
      const ctx = view.context();
      root.querySelector('.mc-context').innerHTML = `<b>${esc(family.id)}</b> · ${esc(mission.series || '—')}<br>${esc(t('categories'))} : ${esc([...ctx.categories].join(', ') || t('none'))}<br>${esc(t('capabilities'))} : ${esc([...ctx.capabilities].join(', ') || t('none'))}`;
    }
    function redraw() { view.render(blockList); kpi(); registerI18n(); }

    // ---- traduction : lignes [fr,en,de,es] des blocs + de l'interface, système commun
    let i18nDone = new Set();
    function registerI18n() {
      if (!window.RepositoryContentI18n) return;
      const pending = view.i18nRows().concat([...ui.values()], (family.i18n || [])).filter(row => !i18nDone.has(row[0]));
      if (!pending.length) return;
      pending.forEach(row => i18nDone.add(row[0]));
      window.RepositoryContentI18n(pending);
    }

    root.querySelector('[data-action="new"]').onclick = () => { if (!confirm(t('confirmNew'))) return; mission = fresh(); localStorage.removeItem(draftKey); redraw(); };
    const picker = root.querySelector('input[type="file"]');
    root.querySelector('[data-action="import"]').onclick = () => picker.click();
    picker.onchange = () => {
      const file = picker.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = M.parse(reader.result, family.id);
          if (imported.family && imported.family !== family.id && !confirm(t('otherFamily'))) return;
          mission = imported; redraw(); saveDraft(); status.textContent = `${t('imported')} : ${file.name}`;
        } catch (error) { status.textContent = `${t('importError')} : ${error.message}`; }
        picker.value = '';
      };
      reader.readAsText(file);
    };
    root.querySelector('[data-action="export"]').onclick = () => {
      mission.statistics = M.computeStatistics(mission);
      const name = `${mission.metadata.missionId || family.id}_${mission.metadata.date || 'mission'}.yaml`.replace(/[\\/:*?"<>| ]+/g, '_');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([M.toYaml(mission)], { type: 'text/yaml;charset=utf-8' }));
      link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      status.textContent = `${t('exported')} : ${name}`;
    };

    redraw();
    return { family, get mission() { return mission; }, set mission(value) { mission = M.migrate(value, family.id); redraw(); }, redraw, statistics: () => M.computeStatistics(mission), context: () => view.context() };
  }

  window.MissionCore = { registerFamily, families, mount, L };
})();
