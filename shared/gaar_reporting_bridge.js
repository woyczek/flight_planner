(() => {
  'use strict';
  const file = document.getElementById('file'), row = file?.closest('.row');
  if (!file || !row) return;
  const name = document.createElement('input');
  name.id = 'gaarLedgerName'; name.value = 'mission_ledger.csv'; name.dataset.missionConfig = 'gaarLedgerName'; name.setAttribute('aria-label', 'Registre GAAR');
  const reload = document.createElement('button');
  reload.type = 'button'; reload.className = 'secondary'; reload.textContent = 'Recharger le fichier';
  row.prepend(name, reload);
  file.addEventListener('change', event => {
    const selected = event.target.files?.[0]; if (!selected) return;
    name.value = selected.name;
    const reader = new FileReader();
    reader.onload = () => window.MissionReportingConfig?.rememberFile('gaarLedgerName', selected, reader.result);
    reader.readAsText(selected);
  });
  reload.addEventListener('click', async () => { if (!await window.MissionReportingConfig?.load('gaarLedgerName')) file.click(); });
  window.addEventListener('mission-ledger-autoload', event => { if (event.detail.key === 'gaarLedgerName') window.loadCSV?.(event.detail.text); });
})();
