(() => {
  'use strict';
  // Mission Report Core — graphiques SVG autonomes (sans bibliothèque, fonctionnent hors ligne
  // et à l'impression). Utilisés par le reporting général.
  //   MissionCharts.buckets(dates, { start, end, unit, lang }) → périodes (jour, semaine, mois…)
  //   MissionCharts.stackedBars({ buckets, series, value, format, height }) → SVG
  //   MissionCharts.donut(items, { format, center }) → HTML (SVG + légende)
  //   MissionCharts.hbars(items, { format, max }) → HTML
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const parse = s => new Date(`${String(s).slice(0, 10)}T00:00:00Z`);
  const DAY = 86400000;
  // Styles de base, injectés une fois (thème de la page par ses variables --muted, --soft,
  // --panel, --mcg-grid, --mcg-base).
  (() => { if (document.getElementById('mcg-style')) return; const style = document.createElement('style'); style.id = 'mcg-style';
    style.textContent = '.mcg-chart{width:100%;height:auto;display:block}.mcg-chart .mcg-gridline{stroke:var(--mcg-grid,#e5e7eb);stroke-width:1}.mcg-chart .mcg-base{stroke:var(--mcg-base,#9ca3af);stroke-width:1.2}.mcg-chart .mcg-axis{fill:var(--muted,#6b7280);font-size:13px}.mcg-chart .mcg-hover{fill:transparent}.mcg-chart g:hover .mcg-hover{fill:rgba(103,182,255,.08)}.mcg-series-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--muted,#6b7280)}.mcg-series-legend i,.mcg-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}.mcg-donut{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center}.mcg-donut svg{width:150px;height:150px}.mcg-donut path,.mcg-donut circle{stroke:var(--panel,var(--card,#fff));stroke-width:1.5}.mcg-donut .mcg-total{fill:var(--text,var(--ink,#111827));font-size:19px;font-weight:700}.mcg-legend{list-style:none;margin:0;padding:0;font-size:12px;display:grid;gap:5px}.mcg-legend li{display:grid;grid-template-columns:auto 1fr auto 42px;gap:6px;align-items:center}.mcg-legend em{font-style:normal;color:var(--muted,#6b7280);text-align:right}.mcg-hbars{display:grid;gap:7px}.mcg-hrow{display:grid;grid-template-columns:minmax(90px,1.1fr) 2fr 58px;gap:8px;align-items:center;font-size:12px}.mcg-hlabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mcg-htrack{height:11px;background:var(--soft,#eef2f7);border-radius:9px;overflow:hidden}.mcg-htrack i{display:block;height:100%;border-radius:9px}.mcg-hrow b{text-align:right}.mcg-more,.mcg-empty{color:var(--muted,#6b7280);font-size:12px;margin:6px 0 0}@media(max-width:760px){.mcg-donut{grid-template-columns:120px 1fr}.mcg-donut svg{width:120px;height:120px}}'; document.head.append(style); })();

  // ---- périodes
  // Unité automatique selon l'étendue : jour (≤ 45 j), semaine (≤ 200 j), mois (≤ 3 ans), année.
  function autoUnit(start, end) {
    const days = (parse(end) - parse(start)) / DAY + 1;
    return days <= 45 ? 'day' : days <= 200 ? 'week' : days <= 1100 ? 'month' : 'year';
  }
  function keyOf(date, unit) {
    const d = parse(date);
    if (unit === 'day') return iso(d);
    if (unit === 'week') { const monday = new Date(d - ((d.getUTCDay() + 6) % 7) * DAY); return iso(monday); }
    if (unit === 'month') return iso(d).slice(0, 7);
    if (unit === 'quarter') return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    return String(d.getUTCFullYear());
  }
  function next(key, unit) {
    if (unit === 'day') return iso(new Date(parse(key).getTime() + DAY));
    if (unit === 'week') return iso(new Date(parse(key).getTime() + 7 * DAY));
    if (unit === 'month') { const [y, m] = key.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; }
    if (unit === 'quarter') { const [y, q] = key.split('-Q').map(Number); return q === 4 ? `${y + 1}-Q1` : `${y}-Q${q + 1}`; }
    return String(Number(key) + 1);
  }
  const QUARTER = { fr: 'T', en: 'Q', de: 'Q', es: 'T' }, WEEK = { fr: 'S', en: 'W', de: 'KW', es: 'S' };
  function label(key, unit, lang = 'fr') {
    const locale = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', es: 'es-ES' }[lang] || 'fr-FR';
    if (unit === 'day') return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(parse(key));
    if (unit === 'week') {
      // Numéro de semaine ISO (jeudi de la semaine).
      const thursday = new Date(parse(key).getTime() + 3 * DAY), first = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
      const week = 1 + Math.round(((thursday - first) / DAY - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
      return `${WEEK[lang] || 'S'}${week} ${String(thursday.getUTCFullYear()).slice(2)}`;
    }
    if (unit === 'month') return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(parse(`${key}-01`));
    if (unit === 'quarter') return key.replace(/^(\d+)-Q(\d)$/, (_, y, q) => `${QUARTER[lang] || 'T'}${q} ${y.slice(2)}`);
    return key;
  }
  // Périodes continues (trous compris) de start à end ; unité 'auto' selon l'étendue.
  function buckets(dates, { start = '', end = '', unit = 'auto', lang = 'fr' } = {}) {
    const valid = dates.filter(d => /^\d{4}-\d{2}-\d{2}/.test(d || '')).map(d => d.slice(0, 10)).sort();
    const from = start || valid[0], to = end || valid[valid.length - 1];
    if (!from || !to) return { unit: unit === 'auto' ? 'month' : unit, list: [], keyOf: () => '' };
    let u = unit === 'auto' ? autoUnit(from, to) : unit;
    // Jamais plus de 400 barres : unité supérieure si nécessaire.
    const order = ['day', 'week', 'month', 'quarter', 'year'];
    const count = x => { let n = 0, k = keyOf(from, x); const last = keyOf(to, x); while (k <= last && n < 401) { n++; k = next(k, x); } return n; };
    while (u !== 'year' && count(u) > 400) u = order[order.indexOf(u) + 1];
    const list = []; let k = keyOf(from, u); const last = keyOf(to, u);
    while (k <= last) { list.push({ key: k, label: label(k, u, lang) }); k = next(k, u); }
    return { unit: u, list, keyOf: d => keyOf(d, u) };
  }

  // Échelle « ronde » : 1, 2, 2,5, 5 × 10^n.
  function niceMax(v) {
    if (!(v > 0)) return 1;
    const p = 10 ** Math.floor(Math.log10(v)), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  // ---- barres empilées par période
  // buckets: [{ key, label }] ; series: [{ id, label, color }] ;
  // value(bucketKey, seriesId) → nombre ; format(v) → texte (axes, info-bulles).
  function stackedBars({ buckets: list, series, value, format = v => String(Math.round(v)), height = 260, empty = '—' }) {
    if (!list.length) return `<p class="mcg-empty">${esc(empty)}</p>`;
    const W = 1000, H = height, m = { l: 54, r: 12, t: 12, b: 42 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const totals = list.map(b => series.reduce((a, s) => a + (value(b.key, s.id) || 0), 0));
    const max = niceMax(Math.max(...totals)), step = iw / list.length, bw = Math.max(2, Math.min(56, step * 0.72));
    const y = v => m.t + ih - (v / max) * ih;
    let svg = `<svg class="mcg-chart" viewBox="0 0 ${W} ${H}" role="img">`;
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, yy = y(v);
      svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}" class="mcg-gridline"/><text x="${m.l - 8}" y="${yy + 4}" text-anchor="end" class="mcg-axis">${esc(format(v))}</text>`;
    }
    const every = Math.max(1, Math.ceil(list.length / 16));
    list.forEach((b, i) => {
      const x = m.l + i * step + (step - bw) / 2; let acc = 0;
      const tip = [`${b.label} — ${format(totals[i])}`].concat(series.map(s => [s, value(b.key, s.id) || 0]).filter(([, v]) => v).map(([s, v]) => `${s.label} : ${format(v)}`)).join('\n');
      svg += `<g><title>${esc(tip)}</title><rect x="${m.l + i * step}" y="${m.t}" width="${step}" height="${ih}" class="mcg-hover"/>`;
      series.forEach(s => {
        const v = value(b.key, s.id) || 0; if (!v) return;
        const top = y(acc + v), h = y(acc) - top; acc += v;
        svg += `<rect x="${x}" y="${top}" width="${bw}" height="${Math.max(0.5, h)}" fill="${s.color}" rx="2"/>`;
      });
      svg += '</g>';
      if (i % every === 0) svg += `<text x="${x + bw / 2}" y="${H - m.b + 16}" text-anchor="middle" class="mcg-axis">${esc(b.label)}</text>`;
    });
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}" class="mcg-base"/></svg>`;
    return svg;
  }

  // ---- anneau
  function donut(items, { format = v => String(Math.round(v)), center = '', empty = '—' } = {}) {
    items = items.filter(i => i.value > 0);
    const total = items.reduce((a, i) => a + i.value, 0);
    if (!total) return `<p class="mcg-empty">${esc(empty)}</p>`;
    const R = 80, r = 50, C = 100; let angle = -Math.PI / 2, paths = '';
    const point = (rad, a) => `${(C + rad * Math.cos(a)).toFixed(2)} ${(C + rad * Math.sin(a)).toFixed(2)}`;
    items.forEach(i => {
      const share = i.value / total, a2 = angle + share * 2 * Math.PI, large = share > 0.5 ? 1 : 0;
      const tip = `<title>${esc(`${i.label} : ${format(i.value)} (${Math.round(share * 100)} %)`)}</title>`;
      paths += share >= 0.9999
        ? `<g>${tip}<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="${i.color}" stroke-width="${R - r}"/></g>`
        : `<path d="M ${point(R, angle)} A ${R} ${R} 0 ${large} 1 ${point(R, a2)} L ${point(r, a2)} A ${r} ${r} 0 ${large} 0 ${point(r, angle)} Z" fill="${i.color}">${tip}</path>`;
      angle = a2;
    });
    const legend = items.map(i => `<li><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b>${esc(format(i.value))}</b><em>${Math.round(i.value * 100 / total)} %</em></li>`).join('');
    return `<div class="mcg-donut"><svg viewBox="0 0 200 200" role="img">${paths}<text x="100" y="98" text-anchor="middle" class="mcg-total">${esc(center || format(total))}</text></svg><ul class="mcg-legend">${legend}</ul></div>`;
  }

  // ---- barres horizontales (classement)
  function hbars(items, { format = v => String(Math.round(v)), empty = '—', limit = 10 } = {}) {
    items = items.filter(i => i.value > 0).sort((a, b) => b.value - a.value);
    if (!items.length) return `<p class="mcg-empty">${esc(empty)}</p>`;
    const shown = items.slice(0, limit), max = Math.max(...shown.map(i => i.value)), rest = items.length - shown.length;
    return `<div class="mcg-hbars">${shown.map(i => `<div class="mcg-hrow" title="${esc(`${i.label} : ${format(i.value)}`)}"><span class="mcg-hlabel">${esc(i.label)}</span><span class="mcg-htrack"><i style="width:${(i.value * 100 / max).toFixed(1)}%;background:${i.color || 'var(--accent)'}"></i></span><b>${esc(format(i.value))}</b></div>`).join('')}${rest > 0 ? `<p class="mcg-more">+ ${rest}</p>` : ''}</div>`;
  }

  window.MissionCharts = { buckets, stackedBars, donut, hbars, niceMax, label };
})();
