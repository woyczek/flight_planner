(() => {
  'use strict';
  const moduleUrl = document.currentScript.src;
  const favicon = document.querySelector('link[rel~="icon"]') || document.head.appendChild(document.createElement('link'));
  favicon.rel = 'icon'; favicon.type = 'image/svg+xml'; favicon.href = '../assets/favicon-gaar.svg';
  document.documentElement.style.setProperty('--accent', 'var(--repo-accent)');

  let rawRows = []; // toutes les missions chargées depuis le registre
  let ledgerHead = [], persistKey = null; // persistKey : registre réel (null pour l'exemple)
  const $ = id => document.getElementById(id);
  const number = value => Number(String(value ?? '').replace(',', '.')) || 0;
  const minutes = value => { const n = Math.round(value || 0); return n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}` : `${n} min`; };
  const escape = value => String(value ?? '').replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));

  function parse(text, source = null) {
    persistKey = source;
    const data = [], push = row => { if (row.some(value => value !== '') && !String(row[0]).startsWith('#')) data.push(row); };
    let row = [], value = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i], next = text[i + 1];
      if (quoted && char === '"' && next === '"') { value += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (!quoted && char === ';') { row.push(value); value = ''; }
      else if (!quoted && (char === '\n' || char === '\r')) { if (char === '\r' && next === '\n') i++; row.push(value); push(row); row = []; value = ''; }
      else value += char;
    }
    row.push(value); push(row);
    const head = ledgerHead = (data.shift() || []).map(name => String(name).replace(/^\uFEFF/, '').trim());
    // Tolère un CSV dont une ligne a moins (ou plus) de champs que l'entête : sans ce
    // padding, un champ manquant décale toutes les colonnes numériques suivantes
    // (c'est ce qui provoquait le "0 patients HEMS" du reporting général).
    rawRows = data.map(values => {
      if (values.length < head.length) values = values.concat(Array(head.length - values.length).fill(''));
      return Object.fromEntries(head.map((name, i) => [name, values[i] || '']));
    });
    render();
  }

  function groups(key, rows) { const map = {}; rows.forEach(row => { const value = row[key] || '—'; map[value] = (map[value] || 0) + 1; }); return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8); }
  function card(label, value, sub = '') { return `<div class="card"><span class="small">${label}</span><b>${value}</b><span class="small">${sub}</span></div>`; }
  function breakdown(title, key, rows) { const data = groups(key, rows), max = Math.max(1, ...data.map(item => item[1])); return `<div><h3>${title}</h3>${data.map(([name, count]) => `<div class="barrow"><span>${escape(name)}</span><span>${count}</span><span class="track"><span class="bar" style="display:block;width:${count * 100 / max}%"></span></span></div>`).join('')}</div>`; }

  // Construit un lien de trace IVAO/VATSIM à partir des champs de la mission (s'ils sont
  // renseignés dans le registre) ou, à défaut, des identifiants par défaut enregistrés
  // dans les préférences partagées.
  function traceLink(row) {
    if (row.trackerUrl) return `<a href="${escape(row.trackerUrl)}" target="_blank" rel="noopener">Trace</a>`;
    const network = (row.onlineNetwork || '').toUpperCase();
    const prefs = window.MissionReportingConfig?.read?.() || {};
    if ((network === 'IVAO' || (!network && row.ivaoId)) && (row.ivaoId || prefs.ivaoId)) {
      return `<a href="https://tracker.ivao.aero/?userId=${escape(row.ivaoId || prefs.ivaoId)}" target="_blank" rel="noopener">Trace IVAO</a>`;
    }
    if ((network === 'VATSIM' || (!network && row.vatsimId)) && (row.vatsimId || prefs.vatsimId)) {
      return `<a href="https://stats.vatsim.net/stats/${escape(row.vatsimId || prefs.vatsimId)}" target="_blank" rel="noopener">Trace VATSIM</a>`;
    }
    return '—';
  }

  const TABLE_COLUMNS = [
    { key: 'missionId', label: 'N° mission' },
    { key: 'date', label: 'Date' },
    { key: 'aircraft', label: 'Appareil' },
    { key: 'registration', label: 'Immat.' },
    { key: 'callsign', label: 'Indicatif' },
    { key: 'risk', label: 'Risque' },
    { key: 'missionType', label: 'Type' },
    { key: 'sector', label: 'Secteur' },
    { key: 'baseDeparture', label: 'Base' },
    { key: 'flightMinutes', label: 'Vol', type: 'number', format: minutes },
    { key: 'blockMinutes', label: 'Bloc', type: 'number', format: minutes },
    { key: 'fuelUsed', label: 'Carburant', type: 'number' },
    { key: 'drops', label: 'Largages', type: 'number' },
    { key: 'reloads', label: 'Recharges', type: 'number' },
    { key: 'trackerUrl', label: 'Trace', format: (_, row) => traceLink(row) }
  ];

  let table = null;
  function renderTable(rows) {
    if (!table) {
      table = window.MissionTable.render($('table'), {
        rows, columns: TABLE_COLUMNS, idKey: 'missionId', defaultSortKey: 'date',
        onChange: updatedRows => { rawRows = mergeEdits(rawRows, updatedRows); persist(); renderCardsAndBreakdowns(window.TimePeriod.filterRows(rawRows, 'date')); },
        onEdit: row => openInReport(row)
      });
    } else table.setRows(rows);
  }
  // Fusionne les lignes affichées (filtrées par période, potentiellement supprimées)
  // dans le jeu de données complet, pour ne pas perdre les missions hors période.
  // Fusion par identité d'objet : le n° de mission peut être dupliqué dans le registre.
  function mergeEdits(all, visible) {
    const inPeriod = new Set(window.TimePeriod.filterRows(all, 'date'));
    const kept = new Set(visible);
    return all.filter(row => !inPeriod.has(row) || kept.has(row));
  }
  function serialize() {
    const head = ledgerHead.length ? ledgerHead : Object.keys(rawRows[0] || {});
    return [head.join(';')].concat(rawRows.map(row => head.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n') + '\n';
  }
  // Garde la copie locale du registre (partagée avec les autres pages) alignée sur les
  // modifications/suppressions, pour qu'elles survivent à un aller-retour vers le CR.
  function persist() { if (persistKey) window.MissionReportingConfig?.cacheText(persistKey, $('ledgerName').value, serialize()); }
  // « Modifier » : ouvre le générateur de CR pré-rempli avec cette ligne du registre.
  function openInReport(row) {
    persist();
    localStorage.setItem('missionEditDraft:v1', JSON.stringify({ kind: 'gaar', configKey: persistKey, filename: $('ledgerName').value, index: rawRows.indexOf(row), record: row }));
    location.href = 'DEFA-Virtual.cr.gen.securite-civile.html?edit=' + encodeURIComponent(row.missionId || '');
  }

  function renderCardsAndBreakdowns(rows) {
    const completed = rows.filter(row => /Termin|retour|RAS/i.test(row.opsNotes || '') || row.landing).length;
    const fuelUnit = rows.find(row => row.fuelUnit)?.fuelUnit || '—';
    $('cards').innerHTML = card('Missions', rows.length)
      + card('Temps de vol', minutes(rows.reduce((s, r) => s + number(r.flightMinutes), 0)), rows.length ? `Moyenne ${minutes(rows.reduce((s, r) => s + number(r.flightMinutes), 0) / rows.length)}` : '')
      + card('Largages incendie', rows.reduce((s, r) => s + number(r.drops), 0) + rows.reduce((s, r) => s + number(r.eventDrops), 0))
      + card('Recharges / écopages', rows.reduce((s, r) => s + number(r.reloads), 0) + rows.reduce((s, r) => s + number(r.eventReloads), 0))
      + card('Carburant', Math.round(rows.reduce((s, r) => s + number(r.fuelUsed), 0)), fuelUnit);
    $('durations').innerHTML = card('Temps bloc', minutes(rows.reduce((s, r) => s + number(r.blockMinutes), 0)), rows.length ? `Moyenne ${minutes(rows.reduce((s, r) => s + number(r.blockMinutes), 0) / rows.length)}` : '')
      + card('Temps recharge moyen', minutes(rows.length ? rows.reduce((s, r) => s + number(r.reloadTime), 0) / rows.length : 0))
      + card('Missions terminées', completed, rows.length ? `${Math.round(completed * 100 / rows.length)} %` : '');
    $('breakdowns').innerHTML = breakdown('Par risque', 'risk', rows) + breakdown('Par type de mission', 'missionType', rows) + breakdown('Par secteur', 'sector', rows) + breakdown('Par appareil', 'aircraft', rows) + breakdown('Par immatriculation', 'registration', rows) + breakdown('Par base', 'baseDeparture', rows);
  }

  function render() {
    const rows = window.TimePeriod.filterRows(rawRows, 'date');
    renderCardsAndBreakdowns(rows);
    renderTable(rows);
  }

  $('file').addEventListener('change', event => {
    const file = event.target.files[0]; if (!file) return;
    $('ledgerName').value = file.name;
    const reader = new FileReader();
    reader.onload = () => { window.MissionReportingConfig?.rememberFile('gaarLedgerName', file, reader.result); parse(reader.result, 'gaarLedgerName'); };
    reader.readAsText(file);
  });
  $('demo').addEventListener('click', () => parse('missionId;date;aircraft;registration;callsign;risk;missionType;sector;baseDeparture;flightMinutes;blockMinutes;fuelUsed;fuelUnit;drops;reloads\nGAAR-001;2026-07-06;Milan / Dash Q400MR;FZBMM;MILAN80;Vert;GAAR;Cévennes / grands causses;LFTW;99;135;1200;kg;1;0\nGAAR-002;2026-07-07;Canadair CL-415;F-ZBMM;PELICAN 36;Rouge;GAAR avec déroutement;Maures;LFTW;212;221;4550;kg;5;6'));
  $('export').addEventListener('click', () => {
    const rows = window.TimePeriod.filterRows(rawRows, 'date');
    const content = [['metric', 'value'], ['missions', rows.length], ['flight_minutes', rows.reduce((s, r) => s + number(r.flightMinutes), 0)], ['block_minutes', rows.reduce((s, r) => s + number(r.blockMinutes), 0)], ['fuel_used', rows.reduce((s, r) => s + number(r.fuelUsed), 0)], ['drops', rows.reduce((s, r) => s + number(r.drops), 0)]].map(line => line.join(';')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' })); link.download = 'gaar_reporting_summary.csv'; link.click();
  });
  $('exportLedger').addEventListener('click', () => {
    if (!rawRows.length) return;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([serialize()], { type: 'text/csv' })); link.download = $('ledgerName').value || 'mission_ledger.csv'; link.click();
  });

  window.addEventListener('mission-ledger-autoload', event => { if (event.detail.key === 'gaarLedgerName') parse(event.detail.text, 'gaarLedgerName'); });
  window.TimePeriod.mount($('periodPicker'), { onChange: render });
  const reload = document.createElement('button'); reload.className = 'secondary'; reload.textContent = 'Recharger le fichier';
  reload.addEventListener('click', async () => { if (!await window.MissionReportingConfig?.load('gaarLedgerName')) $('file').click(); });
  $('file').before(reload);
  render();
  window.addEventListener('load', () => {
    if (!window.RepositoryContentI18n) return;
    const script = document.createElement('script'); script.src = new URL('gaar_i18n.js?v=20260923', moduleUrl).href; document.head.append(script);
  });
})();
