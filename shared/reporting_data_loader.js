(() => {
  'use strict';
  window.ReportingDataLoader = async ({ configKey, fileInput, reloadButton, onText }) => {
    const nameInput = document.querySelector(`[data-mission-config="${configKey}"]`);
    const readName = () => nameInput?.value || window.MissionReportingConfig?.read()?.[configKey] || '';
    const load = async () => {
      const name = readName(); if (!name) return false;
      try { const response = await fetch(new URL(name, location.href), { cache: 'no-store' }); if (!response.ok) throw Error(response.status); onText(await response.text()); return true; } catch { return false; }
    };
    if (fileInput) fileInput.addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; window.MissionReportingConfig?.write({ [configKey]: file.name }); if (nameInput) nameInput.value = file.name; const reader = new FileReader(); reader.onload = () => onText(reader.result); reader.readAsText(file); });
    if (reloadButton) reloadButton.addEventListener('click', async () => { if (!await load()) fileInput?.click(); });
    await load();
  };
})();
