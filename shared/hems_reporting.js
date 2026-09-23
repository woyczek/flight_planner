(() => {
  'use strict';
  const moduleUrl = document.currentScript.src;
  // Le thème commun reste GAAR, mais les pages HEMS portent leur repère médical.
  const favicon = document.querySelector('link[rel~="icon"]') || document.head.appendChild(document.createElement('link'));
  favicon.rel = 'icon'; favicon.type = 'image/svg+xml'; favicon.href = '../assets/favicon-hems.svg';
  document.documentElement.style.setProperty('--accent', 'var(--repo-accent)');

  let rawRows = [], ledgerHead = [], persistKey = null; // persistKey : registre réel (null pour l'exemple)
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
    // padding, un champ manquant décale toutes les colonnes numériques suivantes,
    // ce qui provoquait le "0 patients" constaté dans le reporting général.
    rawRows = data.map(values => {
      if (values.length < head.length) values = values.concat(Array(head.length - values.length).fill(''));
      const record = Object.fromEntries(head.map((name, i) => [name, values[i] || '']));
      // Anciennes valeurs françaises des listes → valeurs de référence anglaises.
      return window.MissionValues ? window.MissionValues.normalizeRecord(record) : record;
    });
    render();
  }

  function groups(key, rows) { const map = {}; rows.forEach(row => { const value = row[key] || '—'; map[value] = (map[value] || 0) + 1; }); return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8); }
  function card(label, value, sub = '') { return `<div class="card"><span class="small">${label}</span><b>${value}</b><span class="small">${sub}</span></div>`; }
  function breakdown(title, key, rows) { const data = groups(key, rows), max = Math.max(1, ...data.map(item => item[1])); return `<div><h3>${title}</h3>${data.map(([name, count]) => `<div class="barrow"><span>${escape(name)}</span><span>${count}</span><span class="track"><span class="bar" style="display:block;width:${count * 100 / max}%"></span></span></div>`).join('')}</div>`; }


  const TABLE_COLUMNS = [
    { key: 'missionId', label: 'N° mission' },
    { key: 'date', label: 'Date' },
    { key: 'service', label: 'Service' },
    { key: 'missionType', label: 'Type' },
    { key: 'aircraft', label: 'Appareil' },
    { key: 'registration', label: 'Immat.' },
    { key: 'callsign', label: 'Indicatif' },
    { key: 'baseDeparture', label: 'Base' },
    { key: 'destination', label: 'Destination' },
    { key: 'outcome', label: 'Statut' },
    { key: 'alertToTakeoffMinutes', label: 'Alerte→décollage', type: 'number', format: minutes },
    { key: 'blockMinutes', label: 'Bloc', type: 'number', format: minutes },
    { key: 'flightMinutes', label: 'Vol', type: 'number', format: minutes },
    { key: 'fuelUsed', label: 'Carburant', type: 'number' },
    { key: 'patients', label: 'Patients', type: 'number' },
    { key: 'trackerUrl', label: 'Trace', html: (_, row) => window.MissionReportingConfig.traceLink(row) }
  ];

  let table = null;
  function renderTable(rows) {
    if (!table) {
      table = window.SortedTable.render($('table'), {
        rows, columns: TABLE_COLUMNS, defaultSortKey: 'date', defaultDir: -1,
        emptyText: 'Aucune mission pour la période sélectionnée.',
        // Clic sur la ligne : ouverture du CR pré-rempli (mode modification).
        onRowClick: row => openInReport(row), rowTitle: 'Cliquer pour modifier la mission',
        deleteMessage: row => `Supprimer la mission ${row.missionId || ''} du ${row.date || ''} ?
La suppression s'applique à la copie locale du registre (navigateur) ; pensez à exporter le registre modifié.`,
        // Suppression par identité d'objet : le n° de mission peut être dupliqué.
        onDelete: row => { rawRows = rawRows.filter(item => item !== row); persist(); renderCardsAndBreakdowns(window.TimePeriod.filterRows(rawRows, 'date')); }
      });
    } else table.setRows(rows);
  }
  function serialize() { return window.MissionReportingConfig.serializeLedger(ledgerHead, rawRows); }
  // Garde la copie locale du registre (partagée avec les autres pages) alignée sur les
  // modifications/suppressions, pour qu'elles survivent à un aller-retour vers le CR.
  function persist() { if (persistKey) window.MissionReportingConfig?.cacheText(persistKey, $('ledgerName').value, serialize()); }
  // Ouvre le générateur de CR pré-rempli avec cette ligne du registre.
  function openInReport(row) {
    persist();
    window.MissionReportingConfig.openEditor({ kind: 'hems', configKey: persistKey, filename: $('ledgerName').value, index: rawRows.indexOf(row), record: row });
  }

  function renderCardsAndBreakdowns(rows) {
    const completed = rows.filter(row => /^(Completed|Patient transported)$|Termin|transport[eé]/i.test(row.outcome || '')).length;
    const fuelUnit = rows.find(row => row.fuelUnit)?.fuelUnit || '—';
    const alerts = rows.map(row => number(row.alertToTakeoffMinutes)).filter(Boolean);
    const target = rows.filter(row => number(row.alertToTakeoffMinutes) && number(row.alertToTakeoffMinutes) <= 15).length;
    $('cards').innerHTML = card('Missions', rows.length)
      + card('Missions terminées', completed, rows.length ? `${Math.round(completed * 100 / rows.length)} %` : '')
      + card('Patients transportés', rows.reduce((s, r) => s + number(r.patients), 0), 'Anonymisé')
      + card('Carburant', Math.round(rows.reduce((s, r) => s + number(r.fuelUsed), 0)), fuelUnit);
    $('durations').innerHTML = card('Temps de vol', minutes(rows.reduce((s, r) => s + number(r.flightMinutes), 0)), `Moyenne ${minutes(rows.length ? rows.reduce((s, r) => s + number(r.flightMinutes), 0) / rows.length : 0)}`)
      + card('Temps bloc', minutes(rows.reduce((s, r) => s + number(r.blockMinutes), 0)), `Moyenne ${minutes(rows.length ? rows.reduce((s, r) => s + number(r.blockMinutes), 0) / rows.length : 0)}`)
      + card('Temps sur zone', minutes(rows.reduce((s, r) => s + number(r.sceneMinutes), 0)), `Moyenne ${minutes(rows.length ? rows.reduce((s, r) => s + number(r.sceneMinutes), 0) / rows.length : 0)}`)
      + card('Alerte → décollage', minutes(alerts.length ? alerts.reduce((a, b) => a + b, 0) / alerts.length : 0), `≤ 15 min : ${rows.length ? Math.round(target * 100 / rows.length) : 0} %`);
    $('breakdowns').innerHTML = breakdown('Par service', 'service', rows) + breakdown('Par type de mission', 'missionType', rows) + breakdown('Par appareil', 'aircraft', rows) + breakdown('Par immatriculation', 'registration', rows) + breakdown('Par statut', 'outcome', rows) + breakdown('Par destination', 'destination', rows) + breakdown('Par base', 'baseDeparture', rows);
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
    reader.onload = () => { window.MissionReportingConfig?.rememberFile('ledgerName', file, reader.result); parse(reader.result, 'ledgerName'); };
    reader.readAsText(file);
  });
  $('demo').addEventListener('click', () => parse('missionId;date;service;missionType;aircraft;callsign;baseDeparture;destination;outcome;alertToTakeoffMinutes;sceneMinutes;blockMinutes;flightMinutes;fuelUsed;fuelUnit;patients\nHEMS-001;2026-09-23;SAMU / SMUR;Primary HEMS;H145;HELISMUR 01;Base HEMS;CHU régional;Patient transported;12;24;68;52;240;kg;1\nHEMS-002;2026-09-23;Civil Security;Rescue;EC145;DRAGON 34;Base Dragon;DZ montagne;Completed;18;46;97;78;310;kg;0'));
  $('export').addEventListener('click', () => {
    const rows = window.TimePeriod.filterRows(rawRows, 'date');
    const content = [['metric', 'value'], ['missions', rows.length], ['patients', rows.reduce((s, r) => s + number(r.patients), 0)], ['flight_minutes', rows.reduce((s, r) => s + number(r.flightMinutes), 0)], ['block_minutes', rows.reduce((s, r) => s + number(r.blockMinutes), 0)], ['fuel_used', rows.reduce((s, r) => s + number(r.fuelUsed), 0)]].map(line => line.join(';')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' })); link.download = 'hems_reporting_summary.csv'; link.click();
  });
  $('exportLedger').addEventListener('click', () => {
    if (!rawRows.length) return;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([serialize()], { type: 'text/csv' })); link.download = $('ledgerName').value || 'hems_mission_ledger.csv'; link.click();
  });

  window.addEventListener('mission-ledger-autoload', event => { if (event.detail.key === 'ledgerName') parse(event.detail.text, 'ledgerName'); });
  // Bouton rapide vers le générateur de compte rendu HEMS (menu du framework).
  window.RepositoryNav?.addAction?.('Nouveau compte rendu HEMS', () => { location.href = 'hems_medevac_cr.html'; });
  window.TimePeriod.mount($('periodPicker'), { onChange: render });
  const reload = document.createElement('button'); reload.className = 'secondary'; reload.textContent = 'Recharger le fichier';
  reload.addEventListener('click', async () => { if (!await window.MissionReportingConfig?.load('ledgerName')) $('file').click(); });
  $('file').before(reload);
  render();
  window.addEventListener('load', () => {
    if (!window.RepositoryContentI18n) return;
    const script = document.createElement('script'); script.src = new URL('hems_i18n.js?v=20260923d', moduleUrl).href; document.head.append(script);
  });
})();
