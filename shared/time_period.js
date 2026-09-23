(() => {
  'use strict';
  // Composant partagé "TimePeriod" : sélection d'une période (préréglages + personnalisé),
  // persistée dans localStorage et synchronisée entre toutes les pages de reporting
  // (général / HEMS / GAAR) et, à terme, le Landing Performance Dashboard.
  const STORAGE_KEY = 'missionReportingPeriod:v1';
  const EVENT = 'mission-period-change';

  const PRESETS = [
    { id: 'all', label: 'Toutes les dates' },
    { id: 'today', label: "Aujourd'hui" },
    { id: '7d', label: '7 derniers jours' },
    { id: '30d', label: '30 derniers jours' },
    { id: 'month', label: 'Mois en cours' },
    { id: 'year', label: 'Année en cours' },
    { id: 'custom', label: 'Période personnalisée' }
  ];

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function read() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && stored.preset) return stored;
    } catch { /* valeur par défaut ci-dessous */ }
    return { preset: 'all', start: '', end: '' };
  }

  function write(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
  }

  function range(state) {
    state = state || read();
    const now = new Date();
    let start = null, end = null;
    switch (state.preset) {
      case 'today': start = end = iso(now); break;
      case '7d': { const d = new Date(now); d.setDate(d.getDate() - 6); start = iso(d); end = iso(now); break; }
      case '30d': { const d = new Date(now); d.setDate(d.getDate() - 29); start = iso(d); end = iso(now); break; }
      case 'month': start = iso(new Date(now.getFullYear(), now.getMonth(), 1)); end = iso(now); break;
      case 'year': start = iso(new Date(now.getFullYear(), 0, 1)); end = iso(now); break;
      case 'custom': start = state.start || null; end = state.end || null; break;
      default: start = null; end = null;
    }
    return { start, end };
  }

  function filterRows(rows, dateField) {
    dateField = dateField || 'date';
    const { start, end } = range();
    if (!start && !end) return rows;
    return rows.filter(row => {
      const value = String(row[dateField] || '').slice(0, 10);
      if (!value) return false;
      if (start && value < start) return false;
      if (end && value > end) return false;
      return true;
    });
  }

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return; styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `.tp-picker{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.tp-picker label{display:grid;gap:4px;font-size:12px;color:var(--muted,#6b7280)}
.tp-picker select,.tp-picker input{font:inherit}
.tp-custom{display:flex;gap:6px;align-items:center}
.tp-summary{font-size:12px;color:var(--muted,#6b7280)}`;
    document.head.appendChild(style);
  }

  function mount(el, opts) {
    opts = opts || {};
    injectStyle();
    const state = read();
    el.innerHTML = `<div class="tp-picker">
      <label>Période
        <select class="tp-preset">${PRESETS.map(p => `<option value="${p.id}"${p.id === state.preset ? ' selected' : ''}>${p.label}</option>`).join('')}</select>
      </label>
      <span class="tp-custom" style="${state.preset === 'custom' ? '' : 'display:none'}">
        <input type="date" class="tp-start" value="${state.start || ''}">
        <span>→</span>
        <input type="date" class="tp-end" value="${state.end || ''}">
      </span>
      <span class="tp-summary"></span>
    </div>`;
    const presetSel = el.querySelector('.tp-preset');
    const customWrap = el.querySelector('.tp-custom');
    const startInput = el.querySelector('.tp-start');
    const endInput = el.querySelector('.tp-end');
    const summary = el.querySelector('.tp-summary');

    function refreshSummary() {
      const { start, end } = range();
      summary.textContent = (start || end) ? `${start || '…'} → ${end || '…'}` : 'Toutes les dates';
    }
    function emit() {
      refreshSummary();
      if (typeof opts.onChange === 'function') opts.onChange(read());
    }
    presetSel.addEventListener('change', () => {
      customWrap.style.display = presetSel.value === 'custom' ? '' : 'none';
      write({ ...read(), preset: presetSel.value });
      emit();
    });
    startInput.addEventListener('change', () => { write({ ...read(), start: startInput.value }); emit(); });
    endInput.addEventListener('change', () => { write({ ...read(), end: endInput.value }); emit(); });
    refreshSummary();
    if (typeof opts.onChange === 'function') opts.onChange(read());

    // Synchronise cette instance si la période change depuis une autre page/section.
    window.addEventListener(EVENT, event => {
      const detail = event.detail; if (!detail) return;
      presetSel.value = detail.preset;
      customWrap.style.display = detail.preset === 'custom' ? '' : 'none';
      startInput.value = detail.start || '';
      endInput.value = detail.end || '';
      refreshSummary();
    });
  }

  window.TimePeriod = { mount, read, write, range, filterRows, PRESETS, EVENT };
})();
