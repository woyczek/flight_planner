(() => {
  'use strict';
  // Composant de framework « TimePeriod » : période d'analyse commune aux reportings (général,
  // familles, HEMS / GAAR historiques) et au Landing Performance Dashboard.
  //   · préréglages (toutes les dates, aujourd'hui, 7 / 30 jours, mois, année) ;
  //   · dates de début et de fin toujours visibles (modifiables : période personnalisée) ;
  //   · navigation ◀ / zoom arrière ×2 / ▶ bornée par l'étendue des données ;
  //   · zoom depuis un graphique : TimePeriod.zoomTo(début, fin) (glisser sur le graphique).
  // Deux modes :
  //   · partagé (défaut) : état dans localStorage (missionReportingPeriod:v1), synchronisé entre
  //     les pages et les instances par l'événement « mission-period-change » ;
  //   · piloté (storage:false) : la page garde l'état (ex. période mémorisée par fichier dans le
  //     Landing Dashboard) et le reçoit par onChange ; elle l'affiche avec ctrl.set().
  // État : { preset, start, end } — start / end : 'AAAA-MM-JJ' (jour) ou 'AAAA-MM-JJTHH:MM:SS.mmm'
  // (heure locale, précision d'un zoom sur des événements horodatés).
  const STORAGE_KEY = 'missionReportingPeriod:v1';
  const EVENT = 'mission-period-change';
  const DAY = 86400000;

  const L = (fr, en, de = en, es = en) => [fr, en, de, es];
  const TEXT = {
    period: L('Période', 'Period', 'Zeitraum', 'Periodo'),
    start: L('Début', 'Start', 'Beginn', 'Inicio'), end: L('Fin', 'End', 'Ende', 'Fin'),
    back: L('Reculer la période', 'Move period backward', 'Zeitraum zurück', 'Retroceder el periodo'),
    forward: L('Avancer la période', 'Move period forward', 'Zeitraum vor', 'Avanzar el periodo'),
    zoomOut: L('Zoom arrière ×2 (double-clic sur un graphique : idem)', 'Zoom out ×2 (double-click on a chart: same)', 'Herauszoomen ×2 (Doppelklick auf ein Diagramm: ebenso)', 'Alejar ×2 (doble clic en un gráfico: igual)'),
    all: L('Toutes les dates', 'All dates', 'Alle Daten', 'Todas las fechas'),
    hint: L('Glisser sur un graphique pour zoomer', 'Drag on a chart to zoom', 'Zum Zoomen im Diagramm ziehen', 'Arrastrar en un gráfico para ampliar')
  };
  const PRESETS = [
    { id: 'all', label: 'Toutes les dates', text: TEXT.all },
    { id: 'today', label: "Aujourd'hui", text: L("Aujourd'hui", 'Today', 'Heute', 'Hoy') },
    { id: '7d', label: '7 derniers jours', text: L('7 derniers jours', 'Last 7 days', 'Letzte 7 Tage', 'Últimos 7 días') },
    { id: '30d', label: '30 derniers jours', text: L('30 derniers jours', 'Last 30 days', 'Letzte 30 Tage', 'Últimos 30 días') },
    { id: 'month', label: 'Mois en cours', text: L('Mois en cours', 'Current month', 'Aktueller Monat', 'Mes en curso') },
    { id: 'year', label: 'Année en cours', text: L('Année en cours', 'Current year', 'Aktuelles Jahr', 'Año en curso') },
    { id: 'custom', label: 'Période personnalisée', text: L('Période personnalisée', 'Custom period', 'Eigener Zeitraum', 'Periodo personalizado') }
  ];
  const lang = () => Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || document.documentElement.lang || 'fr'));
  const tr = row => row[lang()] || row[0];

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // Instant (ms) → texte local ; jour entier quand l'instant tombe sur un début / une fin de jour.
  const text = (ms, edge) => {
    const d = new Date(ms);
    const whole = edge === 'start' ? d.getHours() + d.getMinutes() + d.getSeconds() + d.getMilliseconds() === 0 : d.getHours() === 23 && d.getMinutes() === 59 && d.getSeconds() === 59;
    return whole ? iso(d) : `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  };
  // Texte → instant (ms) : un jour seul couvre toute la journée.
  const ms = (value, edge) => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return edge === 'end' ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d).getTime(); }
    const t = new Date(s).getTime(); return Number.isFinite(t) ? t : null;
  };

  // ---- état partagé
  function read() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && stored.preset) return stored;
    } catch { /* valeur par défaut ci-dessous */ }
    return { preset: 'all', start: '', end: '' };
  }
  function write(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* stockage indisponible */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
  }

  // Période effective d'un état : jours (compatibilité) et instants.
  function rangeMs(state) {
    state = state || read();
    const now = new Date(), day = (y, m, d) => new Date(y, m, d).getTime(), today = day(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = today + DAY - 1;
    switch (state.preset) {
      case 'today': return { start: today, end: endOfToday };
      case '7d': return { start: today - 6 * DAY, end: endOfToday };
      case '30d': return { start: today - 29 * DAY, end: endOfToday };
      case 'month': return { start: day(now.getFullYear(), now.getMonth(), 1), end: endOfToday };
      case 'year': return { start: day(now.getFullYear(), 0, 1), end: endOfToday };
      case 'custom': return { start: ms(state.start, 'start'), end: ms(state.end, 'end') };
      default: return { start: null, end: null };
    }
  }
  function range(state) {
    const r = rangeMs(state);
    return { start: r.start == null ? null : iso(new Date(r.start)), end: r.end == null ? null : iso(new Date(r.end)) };
  }
  function filterRows(rows, dateField) {
    dateField = dateField || 'date';
    const { start, end } = rangeMs();
    if (start == null && end == null) return rows;
    return rows.filter(row => {
      const value = String(row[dateField] || ''); if (!value) return false;
      const t = /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)) && value.length <= 10 ? ms(value.slice(0, 10), 'start') : ms(value, 'start');
      if (t == null) return false;
      // Un jour sans heure est retenu s'il chevauche la période.
      const tEnd = value.length <= 10 ? t + DAY - 1 : t;
      return !(start != null && tEnd < start) && !(end != null && t > end);
    });
  }

  // ---- instances (pages, en-têtes) et zoom depuis les graphiques
  const instances = new Set();
  // Zoom sur une période (glisser sur un graphique) : toutes les instances de la page.
  const zoomTo = (a, b) => instances.forEach(ctrl => ctrl.zoomTo(a, b));
  const zoomOut = () => instances.forEach(ctrl => ctrl.zoomOut());
  const zoomIn = () => instances.forEach(ctrl => ctrl.zoomIn());
  const shift = direction => instances.forEach(ctrl => ctrl.shift(direction));
  // Repères de bas de tableau : lignes avant / après la période (◀ reculer, ▶ avancer) et
  // zoom − / + ; masqués pour « toutes les dates ».
  const EDGE = { before: L('avant la période', 'before the period', 'vor dem Zeitraum', 'antes del periodo'), after: L('après la période', 'after the period', 'nach dem Zeitraum', 'después del periodo'),
    zoomIn: L('Zoom avant ×2', 'Zoom in ×2', 'Hineinzoomen ×2', 'Acercar ×2') };
  function edges(host, rows, dateField = 'date') {
    if (!host) return;
    const r = rangeMs(); if (r.start == null && r.end == null) { host.innerHTML = ''; host.hidden = true; return; }
    const t = row => { const v = String(row[dateField] || ''); return v ? ms(v.slice(0, 10), 'start') : null; };
    const before = rows.filter(row => { const x = t(row); return x != null && r.start != null && x + DAY - 1 < r.start; }).length;
    const after = rows.filter(row => { const x = t(row); return x != null && r.end != null && x > r.end; }).length;
    host.hidden = false; host.className = 'tp-edges';
    host.innerHTML = `<button type="button" data-edge="back"${before ? '' : ' disabled'}>◀ ${before} ${tr(EDGE.before)}</button><span class="tp-edge-zoom"><button type="button" data-edge="out" title="${tr(TEXT.zoomOut)}">−</button><button type="button" data-edge="in" title="${tr(EDGE.zoomIn)}">+</button></span><button type="button" data-edge="forward"${after ? '' : ' disabled'}>${after} ${tr(EDGE.after)} ▶</button>`;
    host.querySelector('[data-edge="back"]').onclick = () => shift(-1); host.querySelector('[data-edge="forward"]').onclick = () => shift(1);
    host.querySelector('[data-edge="out"]').onclick = zoomOut; host.querySelector('[data-edge="in"]').onclick = zoomIn;
  }

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return; styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `.tp-picker{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tp-picker label{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--tp-muted,var(--muted,#6b7280))}
.tp-picker select,.tp-picker input{font:inherit;font-size:13px}
.tp-dates{display:inline-flex;gap:6px;align-items:center}
.tp-nav{display:inline-flex;gap:4px;align-items:center}
.tp-btn{min-width:32px;height:32px;padding:4px 7px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.tp-btn svg{width:15px;height:15px}
.tp-btn .tp-fill{fill:currentColor}.tp-btn .tp-line{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
.tp-btn:disabled{opacity:.4;cursor:default}
.tp-summary{font-size:12px;color:var(--tp-muted,var(--muted,#6b7280))}
.tp-edges{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;font-size:12px}
.tp-edges button{padding:4px 10px;border-radius:7px;cursor:pointer;font:inherit}.tp-edges button:disabled{opacity:.4;cursor:default}
.tp-edge-zoom{display:inline-flex;gap:4px}.tp-edge-zoom button{min-width:30px;font-weight:700}`;
    document.head.appendChild(style);
  }
  const ICON = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="tp-fill" d="M15.5 4L7.5 12l8 8 1.6-1.6L10.7 12l6.4-6.4z"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="tp-line" cx="10.5" cy="10.5" r="6.5"/><path class="tp-line" d="M7.2 10.5h6.6M15.3 15.3L21 21"/></svg>',
    forward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="tp-fill" d="M8.5 4l8 8-8 8-1.6-1.6 6.4-6.4-6.4-6.4z"/></svg>'
  };

  // opts : { onChange(state), storage (true | false), bounds: { start, end } (données),
  //          presets (true), summary (true), className }
  function mount(el, opts) {
    opts = opts || {};
    injectStyle();
    const shared = opts.storage !== false;
    let state = shared ? read() : { preset: 'all', start: '', end: '', ...(opts.state || {}) };
    let bounds = { start: ms(opts.bounds?.start, 'start'), end: ms(opts.bounds?.end, 'end') };
    el.innerHTML = `<div class="tp-picker${opts.className ? ` ${opts.className}` : ''}">
      ${opts.presets === false ? '' : `<label><span class="tp-l-period"></span><select class="tp-preset">${PRESETS.map(p => `<option value="${p.id}"></option>`).join('')}</select></label>`}
      <span class="tp-dates"><input type="date" class="tp-start"><span>→</span><input type="date" class="tp-end"></span>
      <span class="tp-nav"><button type="button" class="tp-btn range-btn" data-tp="back">${ICON.back}</button><button type="button" class="tp-btn zoom-button" data-tp="zoom">${ICON.zoom}</button><button type="button" class="tp-btn range-btn" data-tp="forward">${ICON.forward}</button></span>
      ${opts.summary === false ? '' : '<span class="tp-summary"></span>'}</div>`;
    const $ = sel => el.querySelector(sel), presetSel = $('.tp-preset'), startInput = $('.tp-start'), endInput = $('.tp-end'), summary = $('.tp-summary');
    const buttons = { back: $('[data-tp="back"]'), zoom: $('[data-tp="zoom"]'), forward: $('[data-tp="forward"]') };

    function labels() {
      const l = $('.tp-l-period'); if (l) l.textContent = tr(TEXT.period);
      if (presetSel) [...presetSel.options].forEach(o => { o.textContent = tr(PRESETS.find(p => p.id === o.value).text); });
      startInput.title = tr(TEXT.start); endInput.title = tr(TEXT.end);
      buttons.back.title = tr(TEXT.back); buttons.zoom.title = tr(TEXT.zoomOut); buttons.forward.title = tr(TEXT.forward);
      Object.values(buttons).forEach(b => b.setAttribute('aria-label', b.title));
    }
    // Période affichée : celle de l'état, sinon l'étendue des données.
    const effective = () => { const r = rangeMs(state); return { start: r.start ?? bounds.start, end: r.end ?? bounds.end }; };
    function paint() {
      if (presetSel) presetSel.value = state.preset;
      const r = effective();
      startInput.value = r.start == null ? '' : iso(new Date(r.start));
      endInput.value = r.end == null ? '' : iso(new Date(r.end));
      ['start', 'end'].forEach(k => { const input = k === 'start' ? startInput : endInput; input.min = bounds.start == null ? '' : iso(new Date(bounds.start)); input.max = bounds.end == null ? '' : iso(new Date(bounds.end)); });
      const eps = 1000, full = bounds.start == null || bounds.end == null;
      buttons.back.disabled = full || r.start == null || r.start <= bounds.start + eps;
      buttons.forward.disabled = full || r.end == null || r.end >= bounds.end - eps;
      buttons.zoom.disabled = state.preset === 'all' || (!full && r.start != null && r.end != null && r.end - r.start >= bounds.end - bounds.start - eps);
      if (summary) {
        const precise = /T/.test(`${state.start}${state.end}`) && state.preset === 'custom';
        const f = t => new Date(t).toLocaleString(undefined, precise ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
        summary.textContent = state.preset === 'all' ? (full ? tr(TEXT.all) : `${tr(TEXT.all)} · ${f(bounds.start)} → ${f(bounds.end)}`) : `${r.start == null ? '…' : f(r.start)} → ${r.end == null ? '…' : f(r.end)}`;
        summary.title = tr(TEXT.hint);
      }
    }
    function commit(next, silent = false) {
      state = next;
      if (shared) write(state); // événement : les autres instances se mettent à jour
      paint();
      if (!silent && typeof opts.onChange === 'function') opts.onChange(state);
    }
    // Période en jours (préréglages, dates, graphiques par jour / mois…) : navigation et zoom
    // arrondis aux jours entiers ; précision à la milliseconde seulement pour un état horodaté.
    const dayPrecision = () => !/T/.test(`${state.start || ''}${state.end || ''}`);
    const snap = (t, edge) => { const d = new Date(t); return edge === 'start' ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime(); };
    // Période personnalisée bornée aux données.
    const custom = (a, b, days = false) => {
      let s = Math.min(a, b), e = Math.max(a, b);
      if (days) { s = snap(s, 'start'); e = snap(e, 'end'); }
      if (bounds.start != null) s = Math.max(bounds.start, s);
      if (bounds.end != null) e = Math.min(bounds.end, e);
      if (e - s < 1000) return null;
      if (bounds.start != null && bounds.end != null && s <= bounds.start && e >= bounds.end) return { preset: 'all', start: '', end: '' };
      return { preset: 'custom', start: text(s, 'start'), end: text(e, 'end') };
    };
    const ctrl = {
      get state() { return state; }, get bounds() { return { ...bounds }; },
      range: () => effective(),
      // Affiche un état sans prévenir la page (mode piloté).
      set(next) { state = { preset: 'custom', start: '', end: '', ...next }; if (next.start != null && typeof next.start !== 'string') state.start = text(ms(next.start, 'start'), 'start'); if (next.end != null && typeof next.end !== 'string') state.end = text(ms(next.end, 'end'), 'end'); paint(); },
      setBounds(start, end) { bounds = { start: ms(start, 'start'), end: ms(end, 'end') }; paint(); },
      zoomTo(a, b) { const next = custom(ms(a, 'start'), ms(b, 'end')); if (next) commit(next); },
      shift(direction) {
        const r = effective(); if (r.start == null || r.end == null) return;
        const width = r.end - r.start + 1; let s = r.start + direction * width, e = r.end + direction * width;
        if (bounds.start != null && s < bounds.start) { s = bounds.start; e = s + width - 1; }
        if (bounds.end != null && e > bounds.end) { e = bounds.end; s = e - width + 1; }
        const next = custom(s, e, dayPrecision()); if (next) commit(next);
      },
      // Zoom avant ×2 autour du centre (au moins un jour pour une période en jours).
      zoomIn() {
        const r = effective(); if (r.start == null || r.end == null) return;
        const width = r.end - r.start + 1, center = (r.start + r.end) / 2, half = Math.max(dayPrecision() ? DAY / 2 : 500, width / 4);
        const next = custom(center - half, center + half, dayPrecision()); if (next) commit(next);
      },
      zoomOut() {
        const r = effective(); if (r.start == null || r.end == null) return;
        const width = Math.max(DAY, r.end - r.start + 1), center = (r.start + r.end) / 2;
        let s = center - width, e = center + width;
        if (bounds.start != null && s < bounds.start) { e += bounds.start - s; s = bounds.start; }
        if (bounds.end != null && e > bounds.end) { s -= e - bounds.end; e = bounds.end; }
        const next = custom(s, e, dayPrecision()); commit(next || { preset: 'all', start: '', end: '' });
      },
      destroy() { instances.delete(ctrl); }
    };
    presetSel?.addEventListener('change', () => {
      if (presetSel.value === 'custom') { const r = effective(); commit({ preset: 'custom', start: r.start == null ? '' : text(r.start, 'start'), end: r.end == null ? '' : text(r.end, 'end') }); }
      else commit({ preset: presetSel.value, start: '', end: '' });
    });
    const fromInputs = () => { const s = ms(startInput.value, 'start') ?? effective().start, e = ms(endInput.value, 'end') ?? effective().end; if (s != null && e != null) { const next = custom(s, e); if (next) commit(next); else paint(); } };
    startInput.addEventListener('change', fromInputs); endInput.addEventListener('change', fromInputs);
    buttons.back.onclick = () => ctrl.shift(-1); buttons.forward.onclick = () => ctrl.shift(1); buttons.zoom.onclick = () => ctrl.zoomOut();
    if (shared) window.addEventListener(EVENT, event => { if (event.detail && JSON.stringify(event.detail) !== JSON.stringify(state)) { state = event.detail; paint(); if (typeof opts.onChange === 'function') opts.onChange(state); } });
    window.addEventListener('repository-language-change', () => { labels(); paint(); });
    labels(); paint();
    instances.add(ctrl);
    if (shared && typeof opts.onChange === 'function') opts.onChange(state);
    return ctrl;
  }

  window.TimePeriod = { mount, read, write, range, rangeMs, filterRows, zoomTo, zoomOut, zoomIn, shift, edges, toText: text, toMs: ms, PRESETS, EVENT };
})();
