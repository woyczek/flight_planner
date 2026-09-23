(() => {
  'use strict';
  const key = 'missionReportingConfig:v1';
  const defaults = { ledgerName: 'hems_mission_ledger.csv', gaarLedgerName: 'mission_ledger.csv' };
  const read = () => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...defaults }; } };
  const write = patch => localStorage.setItem(key, JSON.stringify({ ...read(), ...patch }));
  window.MissionReportingConfig = { read, write };
  window.addEventListener('DOMContentLoaded', () => {
    const config = read();
    const ledger = document.getElementById('ledgerName');
    if (ledger) {
      if (config.ledgerName) ledger.value = config.ledgerName;
      ledger.addEventListener('input', () => { if (ledger.value) write({ ledgerName: ledger.value }); });
      ledger.addEventListener('change', () => { if (ledger.value) write({ ledgerName: ledger.value }); });
    }
    document.querySelectorAll('[data-mission-config]').forEach(input => {
      const name = input.dataset.missionConfig;
      if (!input.value && config[name]) input.value = config[name];
      input.addEventListener('input', () => { if (input.value) write({ [name]: input.value }); });
      input.addEventListener('change', () => { if (input.value) write({ [name]: input.value }); });
    });
    document.querySelectorAll('[data-mission-config]').forEach(async input => {
      const name = input.value;
      if (!name) return;
      try {
        const response = await fetch(new URL(name, location.href), { cache: 'no-store' });
        if (!response.ok) return;
        window.dispatchEvent(new CustomEvent('mission-ledger-autoload', { detail: { key: input.dataset.missionConfig, name, text: await response.text() } }));
      } catch { /* Local file isolation can forbid fetch; the page exposes reload/select controls. */ }
    });
  });
})();
