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
    return [...new Set([configured, name, (configKey === 'gaarLedgerName' ? 'FIRE/' : 'HEMS/') + leaf].filter(Boolean))];
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
  const isLedgerKey = name => /ledgerName$/i.test(name);

  // ---- Helpers partagés par les reportings HEMS, GAAR et général ----
  const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ivaoTrackerUrl = id => 'https://tracker.ivao.aero/?userId=' + encodeURIComponent(id);
  // Page de statistiques VATSIM du pilote (stats.vatsim.net).
  const vatsimTrackerUrl = id => 'https://stats.vatsim.net/stats/' + encodeURIComponent(id);
  // Lien HTML vers la trace réseau d'une mission : URL saisie, sinon IVAO / VATSIM à partir
  // des ID de la mission ou, à défaut, des ID du profil pilote.
  const traceLink = row => {
    const link = (href, label) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
    if (/^https?:\/\//i.test(row.trackerUrl || '')) return link(row.trackerUrl, 'Trace');
    const network = String(row.onlineNetwork || '').toUpperCase(), prefs = read();
    if ((network === 'IVAO' || (!network && row.ivaoId)) && (row.ivaoId || prefs.ivaoId)) return link(ivaoTrackerUrl(row.ivaoId || prefs.ivaoId), 'Trace IVAO');
    if ((network === 'VATSIM' || (!network && row.vatsimId)) && (row.vatsimId || prefs.vatsimId)) return link(vatsimTrackerUrl(row.vatsimId || prefs.vatsimId), 'Trace VATSIM');
    return '—';
  };
  // Registre CSV (séparateur ;) à partir d'un en-tête et de lignes objets.
  const serializeLedger = (head, rows) => {
    head = head && head.length ? head : Object.keys(rows[0] || {});
    return [head.join(';')].concat(rows.map(row => head.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n') + '\n';
  };
  // Ouvre le générateur de CR pré-rempli avec une ligne du registre (mode modification).
  // index = position de la ligne dans le registre (le n° de mission peut être dupliqué).
  const openEditor = ({ kind, configKey, filename, index, record }) => {
    localStorage.setItem('missionEditDraft:v1', JSON.stringify({ kind, configKey, filename, index, record, returnUrl: location.href }));
    const page = kind === 'gaar' ? '../FIRE/fire_cr.html' : '../HEMS/hems_medevac_cr.html';
    location.href = new URL(page + '?edit=' + encodeURIComponent(record?.missionId || ''), moduleUrl).href;
  };

  window.MissionReportingConfig = { read, write, load, cached, cacheText, rememberFile, candidates, traceLink, ivaoTrackerUrl, vatsimTrackerUrl, serializeLedger, openEditor };
  window.addEventListener('DOMContentLoaded', () => {
    const config = read();
    const ledger = document.getElementById('ledgerName');
    if (ledger) {
      if (!ledger.dataset.missionConfig) ledger.dataset.missionConfig = location.pathname.includes('/FIRE/') ? 'gaarLedgerName' : 'ledgerName';
      const ledgerKey = ledger.dataset.missionConfig;
      if (config[ledgerKey]) ledger.value = config[ledgerKey];
      ledger.addEventListener('input', () => { if (ledger.value) write({ [ledgerKey]: ledger.value }); });
      ledger.addEventListener('change', () => { if (ledger.value) write({ [ledgerKey]: ledger.value }); });
    }
    document.querySelectorAll('[data-mission-config]').forEach(input => {
      const name = input.dataset.missionConfig;
      // A remembered filename deliberately overrides the HTML placeholder.
      if (config[name]) input.value = config[name];
      // Un nom de registre vide est ignoré ; un ID IVAO / VATSIM peut être effacé.
      const save = () => { if (input.value || !isLedgerKey(name)) write({ [name]: input.value.trim() }); };
      input.addEventListener('input', save);
      input.addEventListener('change', save);
    });
    // Seuls les noms de registre désignent un fichier à charger (pas les ID IVAO / VATSIM).
    const keys = [...new Set([...document.querySelectorAll('[data-mission-config]')].map(input => input.dataset.missionConfig))].filter(isLedgerKey);
    keys.forEach(load);
  });
})();
