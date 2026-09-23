(() => {
  'use strict';
  const moduleUrl = document.currentScript.src;
  const defaultsReady = new Promise(resolve => {
    if (window.MissionLedgerDefaultsB64) return resolve();
    const script = document.createElement('script'); script.src = new URL('mission_ledger_defaults.js', moduleUrl).href;
    script.onload = script.onerror = resolve; document.head.append(script);
  });
  const key = 'missionReportingConfig:v1';
  const baseDefaults = { ledgerName: 'hems_mission_ledger.csv', gaarLedgerName: 'mission_ledger.csv' };
  const defaults = () => ({ ...baseDefaults, ...(window.RepositoryNav?.settings?.config || {}) });
  const read = () => { try { return { ...defaults(), ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return defaults(); } };
  const write = patch => localStorage.setItem(key, JSON.stringify({ ...read(), ...patch }));
  const cacheKey = name => `missionReportingData:v1:${name}`;
  const cacheText = (name, filename, text) => {
    if (!name || !text) return;
    try { localStorage.setItem(cacheKey(name), JSON.stringify({ filename, text, updatedAt: new Date().toISOString() })); } catch { /* A large ledger can still be loaded from its file input. */ }
  };
  const cached = name => { try { return JSON.parse(localStorage.getItem(cacheKey(name)) || 'null'); } catch { return null; } };
  const candidates = (name, configKey) => {
    const leaf = String(name || '').replace(/^.*[\\/]/, ''), configured = window.RepositoryNav?.settings?.files?.[configKey];
    return [...new Set([configured, name, (configKey === 'gaarLedgerName' ? 'GAAR/' : 'HEMS/') + leaf].filter(Boolean))];
  };
  const publish = (configKey, filename, text, source) => {
    cacheText(configKey, filename, text);
    window.dispatchEvent(new CustomEvent('mission-ledger-autoload', { detail: { key: configKey, name: filename, text, source } }));
    const mission = document.querySelector('[name="missionId"]');
    // En mode modification (mission_edit.js), le n° de la mission éditée est conservé.
    if (mission && !window.MissionEditMode && (!mission.value || /-001$/.test(mission.value))) {
      const prefix = configKey === 'gaarLedgerName' ? 'GAAR' : 'HEMS';
      const numbers = [...String(text).matchAll(new RegExp('(?:^|[\\r\\n])"?' + prefix + '-(\\d+)', 'g'))].map(match => Number(match[1]));
      if (numbers.length) {
        mission.value = prefix + '-' + String(Math.max(...numbers) + 1).padStart(3, '0');
        mission.dispatchEvent(new Event('input',{bubbles:true}));
        mission.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    // Refresh generated reports even when the form restored an existing mission id.
    setTimeout(() => document.getElementById('renderBtn')?.click(), 0);
  };
  const load = async configKey => {
    const config = read(), name = config[configKey], stored = cached(configKey);
    if (stored?.text && (!name || stored.filename === name || stored.filename?.endsWith('/' + String(name).replace(/^.*[\\/]/, '')))) {
      publish(configKey, stored.filename || name, stored.text, 'cache');
      return true;
    }
    for (const candidate of candidates(name, configKey)) try {
      const response = await fetch(new URL(candidate, location.href), { cache: 'no-store' });
      if (!response.ok) continue;
      publish(configKey, candidate, await response.text(), 'file');
      return true;
    } catch { /* file:// isolation: cached/manual data is the supported fallback. */ }
    await defaultsReady;
    const encoded = window.MissionLedgerDefaultsB64?.[configKey];
    if (encoded) {
      const binary = atob(encoded), bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      publish(configKey, name, new TextDecoder().decode(bytes), 'default');
      return true;
    }
    return false;
  };
  const rememberFile = (configKey, file, text) => { write({ [configKey]: file.name }); publish(configKey, file.name, text, 'selection'); };
  window.MissionReportingConfig = { read, write, load, cached, cacheText, rememberFile, candidates };
  window.addEventListener('DOMContentLoaded', () => {
    const config = read();
    const ledger = document.getElementById('ledgerName');
    if (ledger) {
      if (!ledger.dataset.missionConfig) ledger.dataset.missionConfig = location.pathname.includes('/GAAR/') ? 'gaarLedgerName' : 'ledgerName';
      const ledgerKey = ledger.dataset.missionConfig;
      if (config[ledgerKey]) ledger.value = config[ledgerKey];
      ledger.addEventListener('input', () => { if (ledger.value) write({ [ledgerKey]: ledger.value }); });
      ledger.addEventListener('change', () => { if (ledger.value) write({ [ledgerKey]: ledger.value }); });
    }
    document.querySelectorAll('[data-mission-config]').forEach(input => {
      const name = input.dataset.missionConfig;
      // A remembered filename deliberately overrides the HTML placeholder.
      if (config[name]) input.value = config[name];
      input.addEventListener('input', () => { if (input.value) write({ [name]: input.value }); });
      input.addEventListener('change', () => { if (input.value) write({ [name]: input.value }); });
    });
    const keys = [...new Set([...document.querySelectorAll('[data-mission-config]')].map(input => input.dataset.missionConfig))];
    keys.forEach(load);
  });
})();
