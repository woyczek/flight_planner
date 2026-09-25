(() => {
  'use strict';
  // Paramétrage › Bases de données : édition des bases du site (fichiers de données JS du
  // dépôt et données gardées par le navigateur), sans passer par les scripts Python.
  //
  // Fichiers du dépôt (flotte, types OACI, indicatifs) :
  // - « Appliquer dans ce navigateur » : modification locale (dataOverride:<id>:v1), prise en
  //   compte immédiatement par toutes les pages de ce navigateur tant qu'elle est plus récente
  //   que le fichier (voir AircraftDB/datafile.py) ;
  // - « Enregistrer dans le dépôt » : réécrit le fichier dans le dossier du dépôt (autorisé une
  //   fois, File System Access API : Chrome / Edge) — à committer ensuite ;
  // - « Télécharger » : le fichier, à déposer à la main dans le dépôt.
  // Données du navigateur (appareils des missions, types ajoutés, indicatifs appris,
  // aérodromes) : enregistrées directement (et sauvegardées par ☰ › Données locales).
  // Registres des missions (« base des opérations ») : édition YAML par famille.
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const now = () => new Date().toISOString();
  const dumps = v => JSON.stringify(v);
  const rows = [];
  // allemand et espagnol : table DataAdminI18n (shared/data_admin_i18n.js), repérée par le texte français ; sinon anglais
  const T = (fr, en) => { const x = window.DataAdminI18n?.[fr]; rows.push([fr, en, x?.[0] || en, x?.[1] || en]); return fr; };

  // ---- format commun des fichiers de données (identique à AircraftDB/datafile.py)
  function render(commentLines, data, overrideKey, exportJs, updatedAt) {
    const parts = Object.entries(data).map(([key, value]) => Array.isArray(value)
      ? (value.length ? `  ${dumps(key)}: [\n${value.map(item => '    ' + dumps(item)).join(',\n')}\n  ]` : `  ${dumps(key)}: []`)
      : `  ${dumps(key)}: ${dumps(value)}`);
    return `(() => {
  'use strict';
${commentLines.map(line => `  // ${line}`).join('\n')}
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = ${dumps({ updatedAt })};
  let data = {\n${parts.join(',\n')}\n};
  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try { const o = JSON.parse(localStorage.getItem('${overrideKey}') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; } catch { /* stockage indisponible */ }
  ${exportJs}
})();
`;
  }

  // ---- dossier du dépôt (IndexedDB partagée avec les registres du Core)
  const idb = () => new Promise((resolve, reject) => { const r = indexedDB.open('missionCore', 1); r.onupgradeneeded = () => r.result.createObjectStore('handles'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const idbGet = async key => { try { const db = await idb(); return await new Promise(r => { const q = db.transaction('handles').objectStore('handles').get(key); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); } catch { return null; } };
  const idbSet = async (key, value) => { const db = await idb(); await new Promise(r => { const tx = db.transaction('handles', 'readwrite'); tx.objectStore('handles').put(value, key); tx.oncomplete = r; tx.onerror = r; }); };
  async function repo(request = true) {
    let handle = await idbGet('folder:__repo');
    if (handle) {
      let permission = await handle.queryPermission?.({ mode: 'readwrite' });
      if (permission !== 'granted' && request) permission = await handle.requestPermission?.({ mode: 'readwrite' });
      if (permission === 'granted') return handle;
      if (!request) return null;
    }
    if (!request) return null;
    if (window.FileAccess) return window.FileAccess.pickFolder('__repo');
    if (!window.showDirectoryPicker) throw new Error(T('Écriture directe impossible dans ce navigateur (Chrome / Edge requis) : utilisez « Télécharger ».', 'Direct writing unavailable in this browser (Chrome / Edge required): use “Download”.'));
    handle = await window.showDirectoryPicker({ id: 'defa-repository', mode: 'readwrite' });
    try { await handle.getFileHandle('repository_tree'); } catch {
      if (!confirm(T('Ce dossier ne contient pas « repository_tree » : est-ce bien la racine du dépôt ?', 'This folder has no “repository_tree”: is it really the repository root?'))) throw new Error(T('Dossier refusé', 'Folder rejected'));
    }
    await idbSet('folder:__repo', handle); return handle;
  }
  async function writeRepoFile(path, text) {
    let dir = await repo(true); const parts = path.split('/'), name = parts.pop();
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
    const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await writable.write(text); await writable.close();
  }
  const download = (name, text, type = 'text/javascript') => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ---- éditeur de tableau
  // colonnes : { key, label, type: text|number|bool|list|select, options?, width? }
  function grid(host, { columns, data, onChange }) {
    let filter = '', sort = { key: columns[0].key, dir: 1 };
    const cell = (col, row, index) => {
      const v = row[col.key], attrs = `data-row="${index}" data-key="${esc(col.key)}"`;
      if (col.type === 'bool') return `<input type="checkbox" ${attrs}${v ? ' checked' : ''}>`;
      if (col.type === 'select') return `<select ${attrs}>${['', ...col.options()].map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}${v && !col.options().includes(v) ? `<option selected>${esc(v)}</option>` : ''}</select>`;
      const value = col.type === 'list' ? (v || []).join(', ') : v ?? '';
      return `<input ${col.type === 'number' ? 'type="number" step="any" ' : ''}${attrs} value="${esc(value)}"${col.width ? ` style="min-width:${col.width}"` : ''}>`;
    };
    function paint() {
      const text = filter.toLowerCase();
      const order = data.map((row, index) => ({ row, index }))
        .filter(({ row }) => !text || columns.some(c => String(c.type === 'list' ? (row[c.key] || []).join(' ') : row[c.key] ?? '').toLowerCase().includes(text)))
        .sort((a, b) => String(a.row[sort.key] ?? '').localeCompare(String(b.row[sort.key] ?? ''), undefined, { numeric: true }) * sort.dir);
      host.innerHTML = `<div class="da-grid-tools"><input type="search" class="da-filter" placeholder="${esc(T('Filtrer…', 'Filter…'))}" value="${esc(filter)}"><span class="small">${order.length} / ${data.length}</span><button type="button" class="secondary da-add">${esc(T('+ Ajouter une ligne', '+ Add row'))}</button></div>
        <div class="da-scroll"><table class="da-table"><thead><tr>${columns.map(c => `<th data-sort="${esc(c.key)}">${esc(c.label)} ${sort.key === c.key ? (sort.dir > 0 ? '▲' : '▼') : '↕'}</th>`).join('')}<th></th></tr></thead>
        <tbody>${order.map(({ row, index }) => `<tr>${columns.map(c => `<td>${cell(c, row, index)}</td>`).join('')}<td><button type="button" class="da-del" data-del="${index}" title="${esc(T('Supprimer la ligne', 'Delete row'))}">×</button></td></tr>`).join('')}</tbody></table></div>`;
      const box = host.querySelector('.da-filter');
      box.oninput = () => { filter = box.value; const pos = box.selectionStart; paint(); const b = host.querySelector('.da-filter'); b.focus(); b.setSelectionRange(pos, pos); };
      host.querySelector('.da-add').onclick = () => { data.unshift(Object.fromEntries(columns.map(c => [c.key, c.type === 'list' ? [] : c.type === 'bool' ? false : '']))); filter = ''; onChange(); paint(); };
      host.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => { sort = { key: th.dataset.sort, dir: sort.key === th.dataset.sort ? -sort.dir : 1 }; paint(); });
      host.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { data.splice(Number(b.dataset.del), 1); onChange(); paint(); });
    }
    host.addEventListener('change', event => {
      const el = event.target, index = el.dataset?.row; if (index == null) return;
      const col = columns.find(c => c.key === el.dataset.key), row = data[Number(index)];
      row[col.key] = col.type === 'bool' ? el.checked : col.type === 'number' ? (el.value === '' ? null : Number(el.value)) : col.type === 'list' ? el.value.split(',').map(s => s.trim()).filter(Boolean) : col.upper ? el.value.trim().toUpperCase() : el.value;
      if (col.upper && el.value !== row[col.key]) el.value = row[col.key];
      onChange();
    });
    paint();
    return { paint };
  }

  // ---- bases éditables
  const effective = (fileData, overrideKey, fileStamp) => { const o = read(overrideKey); return o?.data && o.updatedAt > fileStamp ? { data: structuredClone(o.data), local: o.updatedAt } : { data: structuredClone(fileData), local: '' }; };
  const operatorNames = () => Object.keys(work.callsigns.operators || {}).concat(['SAMU']).filter((v, i, a) => a.indexOf(v) === i);
  const FLEET_COMMENT = ['Flotte DEFA Virtual : base commune des appareils connus (CR HEMS / FIRE, Mission Report Core).',
    'Source : page « Flotte virtuelle » de flotte.defa-virtual.fr (python AircraftDB/update_fleet.py Flotte.html),',
    'complétée à la main ou par la page Paramétrage. Colonnes : opérateur, type OACI, variante,',
    'immatriculation, code (numéro tactique), numéro, indicatifs, base, opérationnel.'];
  const CALLSIGN_COMMENT = ['Indicatifs : forme complète (parlée, conservée dans les CR) ↔ forme plan de vol (OACI Doc 4444,',
    'app. 2, case 7 : 7 caractères, ex. PCAN31) ↔ désignateur OACI de l\'exploitant (OPR/, case 18).',
    'table : prefix (indicatif complet), fpl (forme plan de vol), operator, designator, types (types OACI',
    'de la série), role (indicatif de fonction : pas de choix automatique), generic (désignateur générique),',
    'telephony, note. operators : organisme → désignateur OACI (OPR/).'];
  const FLEET_COLS = ['operator', 'type', 'variant', 'registration', 'tacticalNumber', 'number', 'callsigns', 'base', 'operational'];
  const work = {};
  function loadWork() {
    const fleetFile = { rows: (window.DEFA_FLEET_FILE || window.DEFA_FLEET || []).map(r => Object.fromEntries(FLEET_COLS.map(k => [k, r[k] ?? (k === 'callsigns' ? [] : '')]))) };
    work.fleet = effective(fleetFile, 'dataOverride:fleet:v1', window.DEFA_FLEET_META?.updatedAt || '');
    const cs = window.MISSION_CALLSIGNS || {}, csFile = cs.file || cs;
    work.callsigns = effective({ table: csFile.table || [], operators: csFile.operators || {} }, 'dataOverride:callsigns:v1', cs.META?.updatedAt || '');
    work.callsigns.operatorRows = Object.entries(work.callsigns.data.operators).map(([name, designator]) => ({ name, designator }));
    const dbFile = window.AIRCRAFT_DB || {};
    work.aircraftDb = effective(dbFile, 'dataOverride:aircraftDb:v1', String(dbFile.__meta?.admin_saved || ''));
    work.aircraftDb.original = dbFile;
    const d = work.aircraftDb.data;
    work.aircraftDb.records = Object.entries(d).filter(([k]) => !k.startsWith('__')).map(([k, v]) => ({ tdesig: k, model: v.model || '', description: v.description || '', wtc: v.wtc || '', wing_position: v.wing_position || '', source: v.source || '', _extra: v }));
    work.aircraftDb.aliases = Object.entries(d.__aliases || {}).map(([alias, tdesig]) => ({ alias, tdesig }));
    const ref = window.DEFA_REFERENCE || {}, refFile = ref.file || ref;
    work.defaReference = effective({ pilots: refFile.pilots || [], aircraft: refFile.aircraft || [] }, 'dataOverride:defaReference:v1', ref.META?.updatedAt || '');
  }

  // Reconstitution des données à enregistrer.
  const fleetData = () => ({ rows: work.fleet.data.rows.filter(r => r.registration).map(r => ({ ...r, registration: String(r.registration).toUpperCase() })) });
  const callsignData = () => ({ table: work.callsigns.data.table.filter(r => r.prefix), operators: Object.fromEntries(work.callsigns.operatorRows.filter(r => r.name).map(r => [r.name, r.designator])) });
  function aircraftDbData(stamp) {
    const base = work.aircraftDb.data, out = { __meta: { ...(base.__meta || {}), admin_saved: stamp }, __aliases: Object.fromEntries(work.aircraftDb.aliases.filter(r => r.alias && r.tdesig).map(r => [r.alias.toUpperCase(), r.tdesig.toUpperCase()])) };
    Object.keys(base).filter(k => k.startsWith('__') && !out[k]).forEach(k => { out[k] = base[k]; });
    work.aircraftDb.records.filter(r => r.tdesig).forEach(r => {
      const key = r.tdesig.toUpperCase(); const { _extra, ...fields } = r;
      out[key] = { ...(_extra || {}), ...fields, tdesig: key };
      Object.keys(out[key]).forEach(k => { if (out[key][k] === '' && !(_extra && k in _extra)) delete out[key][k]; });
    });
    return out;
  }
  // Types modifiés / ajoutés par rapport au fichier : reportés dans aircraft_overrides.json pour
  // que le script de rafraîchissement ne les écrase pas.
  async function overridesText(db) {
    let overrides = { __meta: { schema: 1, note: 'Manual overrides merged after Wikidata/Wikipedia lookup.' }, __aliases: {}, __records: {} };
    try { const r = await fetch(new URL('AircraftDB/aircraft_overrides.json', window.RepositoryNav?.root || new URL('../', location.href)), { cache: 'no-store' }); if (r.ok) overrides = await r.json(); } catch { /* fichier absent */ }
    const original = work.aircraftDb.original;
    Object.entries(db).filter(([k]) => !k.startsWith('__')).forEach(([k, v]) => {
      if (JSON.stringify(original[k]) === JSON.stringify(v)) return;
      overrides.__records = overrides.__records || {}; overrides.__records[k] = { ...v, source: v.source && v.source !== original[k]?.source ? v.source : 'manual/parametrage' };
    });
    Object.entries(db.__aliases).forEach(([a, t]) => { if (original.__aliases?.[a] !== t) { overrides.__aliases = overrides.__aliases || {}; overrides.__aliases[a] = t; } });
    return JSON.stringify(overrides, null, 2) + '\n';
  }

  const DATASETS = [
    {
      id: 'fleet', group: T('Fichiers du dépôt', 'Repository files'), title: T('Flotte DEFA (appareils connus)', 'DEFA fleet (known aircraft)'), file: 'shared/aircraft_fleet.js', overrideKey: 'dataOverride:fleet:v1',
      intro: T('Appareils proposés dans les CR : immatriculation, type, indicatifs, base, opérateur. Plusieurs indicatifs : séparés par des virgules.', 'Aircraft offered in reports: registration, type, callsigns, base, operator. Several callsigns: comma-separated.'),
      tables: () => [{ columns: [
        { key: 'operator', label: T('Opérateur', 'Operator'), type: 'select', options: operatorNames }, { key: 'type', label: T('Type OACI', 'ICAO type'), upper: true },
        { key: 'variant', label: T('Variante', 'Variant') }, { key: 'registration', label: T('Immatriculation', 'Registration'), upper: true },
        { key: 'tacticalNumber', label: T('Code', 'Code') }, { key: 'number', label: T('Numéro', 'Number') },
        { key: 'callsigns', label: T('Indicatifs', 'Callsigns'), type: 'list', width: '12em' }, { key: 'base', label: T('Base', 'Base'), upper: true },
        { key: 'operational', label: T('Opérationnel', 'Operational'), type: 'bool' }], data: work.fleet.data.rows }],
      files: stamp => [['shared/aircraft_fleet.js', render(FLEET_COMMENT, fleetData(), 'dataOverride:fleet:v1', "window.DEFA_FLEET = data.rows.map(row => ({ ...row, callsign: (row.callsigns || [])[0] || '' })); window.DEFA_FLEET_META = META; window.DEFA_FLEET_FILE = fileData.rows;", stamp)]],
      overlay: () => fleetData(),
      howto: `<p>${T('Mise à jour complète depuis le site de la flotte :', 'Full update from the fleet website:')}</p>
        <ol><li>${T('Ouvrir', 'Open')} <a href="https://flotte.defa-virtual.fr/flotte.php" target="_blank" rel="noopener">flotte.defa-virtual.fr › Flotte virtuelle</a>, ${T('puis Fichier › Enregistrer sous… (« Flotte.html »).', 'then File › Save as… (“Flotte.html”).')}</li>
        <li>${T('À la racine du dépôt :', 'At the repository root:')} <code>python AircraftDB/update_fleet.py Flotte.html</code></li>
        <li>${T('Les appareils de la page remplacent ceux du fichier ; les indicatifs supplémentaires et les appareils ajoutés ici sont conservés.', 'Aircraft from the page replace those of the file; extra callsigns and aircraft added here are kept.')}</li>
        <li>${T('Recharger cette page ; supprimer les modifications locales si elles ont été intégrées.', 'Reload this page; delete local changes once integrated.')}</li></ol>`
    },
    {
      id: 'aircraftDb', group: T('Fichiers du dépôt', 'Repository files'), title: T('Types d’aéronefs (base OACI)', 'Aircraft types (ICAO base)'), file: 'AircraftDB/aircraft_db.js', overrideKey: 'dataOverride:aircraftDb:v1',
      intro: T('Désignateur OACI (Doc 8643), modèle, description (L2J, H1T…), catégorie de turbulence, position de l’aile. Les modifications sont aussi reportées dans aircraft_overrides.json.', 'ICAO designator (Doc 8643), model, description (L2J, H1T…), wake category, wing position. Changes are also written to aircraft_overrides.json.'),
      tables: () => [
        { title: T('Types', 'Types'), columns: [{ key: 'tdesig', label: T('Désignateur', 'Designator'), upper: true }, { key: 'model', label: T('Modèle', 'Model'), width: '16em' }, { key: 'description', label: T('Description OACI', 'ICAO description'), upper: true },
          { key: 'wtc', label: 'WTC', upper: true }, { key: 'wing_position', label: T('Aile', 'Wing'), type: 'select', options: () => ['low', 'mid', 'high', 'none'] }, { key: 'source', label: T('Source', 'Source') }], data: work.aircraftDb.records },
        { title: T('Alias (nom courant → désignateur)', 'Aliases (common name → designator)'), columns: [{ key: 'alias', label: T('Alias', 'Alias'), upper: true }, { key: 'tdesig', label: T('Désignateur', 'Designator'), upper: true }], data: work.aircraftDb.aliases }],
      files: async stamp => { const db = aircraftDbData(stamp); return [['AircraftDB/aircraft_db.js', `window.AIRCRAFT_DB = ${dumps(db)};\n`], ['AircraftDB/aircraft_overrides.json', await overridesText(db)]]; },
      overlay: stamp => aircraftDbData(stamp), stampKey: true,
      howto: `<p>${T('Rafraîchissement par le script (sources : OACI Doc 8643, EUROCONTROL, Wikidata ; modifications manuelles d’aircraft_overrides.json prioritaires) — depuis le dossier AircraftDB :', 'Refresh with the script (sources: ICAO Doc 8643, EUROCONTROL, Wikidata; manual changes from aircraft_overrides.json take priority) — from the AircraftDB folder:')}</p>
        <ul><li><code>python update_aircraft_db.py --no-network</code> — ${T('reconstruit la base avec les caches locaux', 'rebuilds the base from local caches')}</li>
        <li><code>python update_aircraft_db.py --add RFAL MIR2</code> — ${T('ajoute des types (recherche en ligne)', 'adds types (online lookup)')}</li>
        <li><code>python update_aircraft_db.py "../CR DEFA/HEMS/hems_mission_ledger.csv"</code> — ${T('types de la colonne Aircraft d’un CSV', 'types from a CSV Aircraft column')}</li>
        <li><code>--refresh-icao</code> ${T('(force le téléchargement des PDF OACI),', '(forces the ICAO PDF download),')} <code>--delay 2</code> ${T('(pause entre requêtes)', '(pause between requests)')}</li></ul>
        <p class="small">${T('Un type supprimé ici peut revenir au prochain rafraîchissement s’il fait partie de la liste de base du script.', 'A type deleted here may come back at the next refresh if it is in the script base list.')}</p>`
    },
    {
      id: 'callsigns', group: T('Fichiers du dépôt', 'Repository files'), title: T('Correspondance des indicatifs', 'Callsign correspondence'), file: 'shared/mission_core/data/callsigns.js', overrideKey: 'dataOverride:callsigns:v1',
      intro: T('Indicatif complet (conservé dans les CR) ↔ forme plan de vol (case 7, 7 caractères avec le numéro) ↔ exploitant OACI (OPR/, case 18). Types : types OACI de la série, séparés par des virgules.', 'Full callsign (kept in reports) ↔ flight plan form (item 7, 7 characters with the number) ↔ ICAO operator (OPR/, item 18). Types: ICAO types of the series, comma-separated.'),
      tables: () => [
        { title: T('Indicatifs', 'Callsigns'), columns: [{ key: 'prefix', label: T('Indicatif complet', 'Full callsign'), upper: true }, { key: 'fpl', label: T('Plan de vol', 'Flight plan'), upper: true },
          { key: 'aliases', label: T('Autres formes', 'Other forms'), type: 'list', width: '10em' },
          { key: 'operator', label: T('Organisme', 'Organisation'), type: 'select', options: operatorNames }, { key: 'designator', label: 'OPR/', upper: true }, { key: 'types', label: T('Types', 'Types'), type: 'list' },
          { key: 'role', label: T('Fonction', 'Role'), type: 'bool' }, { key: 'generic', label: T('Générique', 'Generic'), type: 'bool' }, { key: 'telephony', label: T('Radiotéléphonie', 'Telephony'), upper: true }, { key: 'note', label: T('Note', 'Note'), width: '14em' }], data: work.callsigns.data.table },
        { title: T('Organismes → désignateur OACI (OPR/)', 'Organisations → ICAO designator (OPR/)'), columns: [{ key: 'name', label: T('Organisme', 'Organisation'), width: '16em' }, { key: 'designator', label: 'OPR/', upper: true }], data: work.callsigns.operatorRows }],
      files: stamp => [['shared/mission_core/data/callsigns.js', render(CALLSIGN_COMMENT, callsignData(), 'dataOverride:callsigns:v1', 'window.MISSION_CALLSIGNS = { META, table: data.table, operators: data.operators, file: fileData };', stamp)]],
      overlay: () => callsignData(),
      howto: `<p>${T('Pas de script : cette page (ou le fichier, à la main) est la source. Les formes corrigées dans les CR apparaissent dans « Indicatifs appris » ci-dessous, à intégrer ici.', 'No script: this page (or the file, by hand) is the source. Forms corrected in reports appear in “Learned callsigns” below, to integrate here.')}</p>`
    },
    // ---- données du navigateur
    { id: 'registry', group: T('Données du navigateur', 'Browser data'), title: T('Appareils des missions enregistrées', 'Aircraft from recorded missions'), key: 'missionAircraftRegistry:v1', byKey: r => String(r.registration || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      intro: T('Mémorisés à chaque enregistrement d’une mission (la donnée la plus récente l’emporte sur la flotte).', 'Remembered each time a mission is saved (latest data wins over the fleet).'),
      columns: [{ key: 'registration', label: T('Immatriculation', 'Registration'), upper: true }, { key: 'type', label: T('Type', 'Type'), upper: true }, { key: 'variant', label: T('Variante', 'Variant') }, { key: 'category', label: T('Catégorie', 'Category'), type: 'select', options: () => ['fixed', 'rotary', 'amphibious'] }, { key: 'callsign', label: T('Indicatif', 'Callsign'), upper: true }, { key: 'tacticalNumber', label: T('Code', 'Code') }, { key: 'operator', label: T('Opérateur', 'Operator') }, { key: 'date', label: T('Date', 'Date') }] },
    { id: 'localTypes', group: T('Données du navigateur', 'Browser data'), title: T('Types ajoutés localement', 'Locally added types'), key: 'missionAircraftTypes:v1', byKey: r => String(r.tdesig || '').toUpperCase(),
      intro: T('Types inconnus saisis dans des missions. « Intégrer » les copie dans la base OACI (à enregistrer ensuite).', 'Unknown types entered in missions. “Integrate” copies them into the ICAO base (save it afterwards).'),
      columns: [{ key: 'tdesig', label: T('Désignateur', 'Designator'), upper: true }, { key: 'model', label: T('Modèle', 'Model') }, { key: 'category', label: T('Catégorie', 'Category'), type: 'select', options: () => ['fixed', 'rotary', 'amphibious'] }, { key: 'addedAt', label: T('Ajouté le', 'Added') }],
      integrate: list => { list.forEach(r => { if (r.tdesig && !work.aircraftDb.records.some(x => x.tdesig === r.tdesig)) work.aircraftDb.records.unshift({ tdesig: r.tdesig, model: r.model || r.tdesig, description: { rotary: 'H1T', amphibious: 'A1P', fixed: 'L1P' }[r.category] || '', wtc: '', wing_position: '', source: 'manual/parametrage' }); }); return 'aircraftDb'; } },
    { id: 'learned', group: T('Données du navigateur', 'Browser data'), title: T('Indicatifs appris (formes plan de vol corrigées)', 'Learned callsigns (corrected flight plan forms)'), key: 'missionCallsignTable:v1', array: true,
      intro: T('Formes plan de vol corrigées à la main dans les CR. « Intégrer » les ajoute à la table de correspondance (à enregistrer ensuite).', 'Flight plan forms corrected by hand in reports. “Integrate” adds them to the correspondence table (save it afterwards).'),
      columns: [{ key: 'prefix', label: T('Indicatif complet', 'Full callsign'), upper: true }, { key: 'fpl', label: T('Plan de vol', 'Flight plan'), upper: true }, { key: 'updatedAt', label: T('Date', 'Date') }],
      integrate: list => { list.forEach(r => { const row = work.callsigns.data.table.find(x => x.prefix === r.prefix); if (row) row.fpl = r.fpl; else if (r.prefix) work.callsigns.data.table.unshift({ prefix: r.prefix, fpl: r.fpl, operator: '', designator: '', types: [] }); }); return 'callsigns'; } },
    { id: 'airports', group: T('Données du navigateur', 'Browser data'), title: T('Aérodromes utilisés (cache)', 'Aerodromes used (cache)'), key: 'missionAirports:v1', byKey: r => String(r.icao || '').toUpperCase(),
      intro: T('Coordonnées et fuseaux des terrains utilisés (lever / coucher du soleil, météo).', 'Coordinates and time zones of aerodromes used (sunrise / sunset, weather).'),
      columns: [{ key: 'icao', label: 'OACI', upper: true }, { key: 'name', label: T('Nom', 'Name'), width: '14em' }, { key: 'country', label: T('Pays', 'Country') }, { key: 'lat', label: 'Lat', type: 'number' }, { key: 'lon', label: 'Lon', type: 'number' }, { key: 'elevation', label: T('Altitude (ft)', 'Elevation (ft)'), type: 'number' }, { key: 'tz', label: T('Fuseau', 'Time zone') }] },
    { id: 'defaReference', group: T('Base DEFA', 'DEFA base'), title: T('Référence DEFA (anonymisée, dans le dépôt)', 'DEFA reference (anonymised, in the repository)'), file: 'shared/defa_reference.js', overrideKey: 'dataOverride:defaReference:v1',
      intro: T('Pilotes (trigrammes) et appareils de la DEFA — immatriculation, type, indicatifs utilisés, terrain de rattachement (modifiable), dernier terrain connu, statut — sans les vols ni les missions. Utilisée par les trois applications (CR, Landing Dashboard, Flight Planner). Base « lâche » : aide à la saisie, non exhaustive. Mise à jour : « Base DEFA » › « Mettre à jour la référence », ou tools/defa_reference.py.', 'DEFA pilots (trigrams) and aircraft — registration, type, callsigns used, home aerodrome (editable), last known aerodrome, status — without flights or missions. Used by the three applications. Loose base: input aid, not exhaustive.'),
      tables: () => [
        { title: T('Appareils', 'Aircraft'), columns: [{ key: 'registration', label: T('Immatriculation', 'Registration'), upper: true }, { key: 'type', label: 'Type', upper: true }, { key: 'variant', label: T('Variante', 'Variant'), upper: true },
          { key: 'status', label: T('Statut', 'Status'), type: 'select', options: () => ['DISPONIBLE', 'INDISPONIBLE', 'MAINTENANCE', 'RETIRÉ'] }, { key: 'homeAd', label: T('Rattachement', 'Home AD'), upper: true }, { key: 'lastAd', label: T('Dernier AD connu', 'Last known AD'), upper: true },
          { key: 'commissioned', label: T('Mise en service', 'Commissioned') }, { key: 'callsigns', label: T('Indicatifs utilisés', 'Callsigns used'), type: 'list', width: '14em' }, { key: 'first', label: T('Premier vol', 'First flight') }, { key: 'last', label: T('Dernier vol', 'Last flight') },
          { key: 'flights', label: T('Vols', 'Flights'), type: 'number' }, { key: 'fleetId', label: T('Fiche flotte', 'Fleet sheet') }, { key: 'note', label: T('Note', 'Note'), width: '12em' }], data: work.defaReference.data.aircraft },
        { title: T('Pilotes', 'Pilots'), columns: [{ key: 'trigram', label: T('Trigramme', 'Trigram'), upper: true }, { key: 'first', label: T('Premier vol', 'First flight') }, { key: 'last', label: T('Dernier vol', 'Last flight') }, { key: 'flights', label: T('Vols', 'Flights'), type: 'number' }, { key: 'types', label: 'Types', type: 'list', width: '14em' }, { key: 'note', label: T('Note', 'Note'), width: '12em' }], data: work.defaReference.data.pilots }],
      files: stamp => [['shared/defa_reference.js', render(['Référence DEFA anonymisée : pilotes (trigrammes), appareils (immatriculation, type, indicatifs', 'utilisés, dernier terrain connu, terrain de rattachement), sans les vols ni les missions.', 'Générée par tools/defa_reference.py ou Paramétrage › Base DEFA ; complétée à la main.', 'Base « lâche » : aide à la saisie, non exhaustive.'], { pilots: work.defaReference.data.pilots.filter(p => p.trigram), aircraft: work.defaReference.data.aircraft.filter(a => a.registration) }, 'dataOverride:defaReference:v1', 'window.DEFA_REFERENCE = { META, pilots: data.pilots, aircraft: data.aircraft, file: fileData };', stamp)]],
      overlay: () => ({ pilots: work.defaReference.data.pilots.filter(p => p.trigram), aircraft: work.defaReference.data.aircraft.filter(a => a.registration) }),
      howto: `<ol><li>${T('Charger le journal des vols (Base DEFA › Journal des vols DEFA).', 'Load the flight log (DEFA base › DEFA flight log).')}</li><li>${T('« Mettre à jour la référence DEFA » : pilotes et appareils ajoutés ou complétés (rien n’est supprimé ; terrain de rattachement, statut, mise en service et notes saisis ici sont conservés).', '“Update the DEFA reference”: pilots and aircraft added or completed (nothing removed; home AD, status, commissioning and notes kept).')}</li><li>${T('« Enregistrer dans le dépôt », puis committer shared/defa_reference.js.', '“Save to repository”, then commit shared/defa_reference.js.')}</li></ol><p>${T('Ou, à la racine du dépôt :', 'Or, at the repository root:')} <code>python tools/defa_reference.py "Log des vols.html"</code></p>`
    },
    { id: 'defaLog', group: T('Base DEFA', 'DEFA base'), title: T('Journal des vols DEFA (vols réalisés)', 'DEFA flight log (flights flown)'), custom: true,
      intro: T('Base distincte du registre des missions : page « Log des vols » de la DEFA enregistrée (Ctrl+S, page web complète ou HTML seul), ou export CSV / JSON de cette base. Chargée à la demande, gardée dans ce navigateur seulement (hors dépôt et hors sauvegarde locale : trigrammes des pilotes). Les CR s’en servent pour les appareils connus (immatriculation → type, indicatifs utilisés), les trigrammes d’équipage et les terrains ; l’analyse des indicatifs alimente la table de correspondance.', 'Separate from the mission ledger: DEFA “Log des vols” page saved (Ctrl+S), or CSV / JSON export of this base. Loaded on demand, kept in this browser only (not in the repository nor the local backup: pilot trigrams). Reports use it for known aircraft, crew trigrams and aerodromes; the callsign analysis feeds the correspondence table.') },
    { id: 'merges', group: T('Base DEFA', 'DEFA base'), title: T('Fusions et renommages (pilotes, appareils)', 'Merges and renames (pilots, aircraft)'), custom: true,
      intro: T('Équivalences mémorisées par « Fusionner avec… / renommer » des fiches : appliquées au journal DEFA rechargé, à la référence et au catalogue. Une boucle (A → B et B → A) échange les deux noms : supprime l’entrée fautive, puis refais la fusion depuis la fiche.', 'Equivalences stored by the sheets’ “Merge with… / rename”: applied to the reloaded DEFA log, the reference and the catalogue. A loop (A → B and B → A) swaps both names: delete the wrong entry, then redo the merge from the sheet.') },
    { id: 'send', group: T('Missions', 'Missions'), title: T('Envoi des comptes rendus (webservice)', 'Report sending (web service)'), custom: true,
      intro: T('Bouton « Envoyer le CR » des pages de saisie : POST JSON (mission, CR HTML et texte, calculs) vers l’adresse ci-dessous. La clef reste dans ce navigateur (missionSendKey:v1), hors sauvegarde locale. Le service doit accepter les appels de cette origine (CORS).', '“Send report” button of the entry pages: JSON POST (mission, report HTML and text, calculations) to the address below. The key stays in this browser (missionSendKey:v1), outside the local backup. The service must accept calls from this origin (CORS).') },
    { id: 'ledgers', group: T('Missions', 'Missions'), title: T('Registres des missions (base des opérations)', 'Mission ledgers (operations base)'), custom: true,
      intro: T('Registre unique CR DEFA/missions.yaml (toutes familles, source de vérité des reportings). Édition directe du YAML, complète ou par famille, avec contrôle avant enregistrement ; pour une mission, préférer le CR (clic sur la ligne du reporting).', 'Single ledger CR DEFA/missions.yaml (all families, source of truth of the reportings). Direct YAML editing, full or per family, checked before saving; for a single mission, prefer the report (click its reporting row).') }
  ];

  // ---- page
  function mount(root) {
    loadWork();
    const status = text => { root.querySelector('.da-status').textContent = text; };
    const current = { id: new URLSearchParams(location.search).get('base') || 'fleet' };
    const groups = [...new Set(DATASETS.map(d => d.group))];
    root.innerHTML = `<aside class="da-nav">${groups.map(g => `<h3>${esc(g)}</h3>${DATASETS.filter(d => d.group === g).map(d => `<button type="button" data-set="${d.id}">${esc(d.title)}</button>`).join('')}`).join('')}
      <h3>${esc(T('Dossiers paramétrés', 'Configured folders'))}</h3><p class="small">${esc(T('Survol : dossier attendu ; clic : changer (le sélecteur s’ouvre sur le dossier actuel).', 'Hover: expected folder; click: change (the picker opens on the current folder).'))}</p>
      <div class="da-folders">${['__repo', '__ledger', '__store', '__perf'].map(k => `<button type="button" class="secondary da-folder" data-folder="${k}"></button>`).join('')}</div></aside>
      <section class="da-main"><h2></h2><p class="small da-intro"></p><div class="row da-actions"></div><p class="small da-status"></p><div class="da-body"></div><details class="da-howto"><summary>${esc(T('Mode opératoire', 'Procedure'))}</summary><div></div></details></section>`;
    // Dossiers : nom actuel ✓ (autorisé) / ⚠ (à ré-autoriser), dossier attendu en infobulle.
    const paintFolders = () => root.querySelectorAll('.da-folder').forEach(b => window.FileAccess?.decorate(b, b.dataset.folder));
    root.querySelectorAll('.da-folder').forEach(b => b.onclick = async () => { try { const h = await window.FileAccess.pickFolder(b.dataset.folder); status(`${b.textContent.split(' : ')[0]} : ${h.name}`); } catch (e) { if (e.name !== 'AbortError') status(e.message); } });
    paintFolders(); window.addEventListener('load', paintFolders);
    root.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { if (dirty && !confirm(T('Modifications non enregistrées : changer de base quand même ?', 'Unsaved changes: switch anyway?'))) return; dirty = false; current.id = b.dataset.set; history.replaceState(null, '', `?base=${current.id}`); show(); });
    let dirty = false;
    const changed = () => { dirty = true; status(T('Modifié — non enregistré', 'Modified — not saved')); };
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

    function actions(buttons) {
      const host = root.querySelector('.da-actions'); host.innerHTML = '';
      buttons.forEach(([label, fn, cls = 'secondary']) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.onclick = async () => { try { await fn(); } catch (e) { status(`${T('Échec', 'Failed')} : ${e.message}`); } }; host.append(b); });
    }
    function show() {
      const set = DATASETS.find(d => d.id === current.id) || DATASETS[0];
      root.querySelectorAll('[data-set]').forEach(b => b.classList.toggle('active', b.dataset.set === set.id));
      root.querySelector('.da-main h2').textContent = set.title + (set.file ? ` — ${set.file}` : set.key ? ` — ${set.key}` : '');
      root.querySelector('.da-intro').textContent = set.intro || '';
      const howto = root.querySelector('.da-howto'); howto.hidden = !set.howto; howto.querySelector('div').innerHTML = set.howto || '';
      const body = root.querySelector('.da-body'); body.innerHTML = '';
      if (set.custom) return set.id === 'send' ? sendSettings(body) : set.id === 'defaLog' ? defaLog(body) : set.id === 'merges' ? merges(body) : ledgers(body);
      if (set.file) {
        const w = work[set.id];
        status(w.local ? `${T('Modifications locales du', 'Local changes from')} ${new Date(w.local).toLocaleString()} (${T('prioritaires dans ce navigateur, pas encore dans le dépôt', 'active in this browser, not yet in the repository')})` : T('Contenu du fichier du dépôt', 'Repository file content'));
        set.tables().forEach(table => { if (table.title) body.insertAdjacentHTML('beforeend', `<h3>${esc(table.title)}</h3>`); const host = document.createElement('div'); body.append(host); grid(host, { columns: table.columns, data: table.data, onChange: changed }); });
        actions([
          [T('Appliquer dans ce navigateur', 'Apply in this browser'), async () => { const stamp = now(); write(set.overrideKey, { updatedAt: stamp, data: await set.overlay(stamp) }); w.local = stamp; dirty = false; status(`${T('Appliqué dans ce navigateur', 'Applied in this browser')} (${new Date(stamp).toLocaleString()}) — ${T('pensez à l’enregistrer dans le dépôt', 'remember to save it to the repository')}`); }, 'primary'],
          [T('Enregistrer dans le dépôt', 'Save to repository'), async () => {
            const stamp = now(), files = await set.files(stamp);
            for (const [path, text] of files) await writeRepoFile(path, text);
            // Même date que le fichier : ignorée dès que le nouveau fichier est chargé.
            write(set.overrideKey, { updatedAt: stamp, data: await set.overlay(stamp) }); w.local = ''; dirty = false;
            status(`${T('Enregistré dans le dépôt', 'Saved to repository')} : ${files.map(f => f[0]).join(', ')} — ${T('à committer', 'to be committed')}`);
          }],
          [T('Télécharger', 'Download'), async () => { const files = await set.files(now()); files.forEach(([path, text]) => download(path.split('/').pop(), text, path.endsWith('.json') ? 'application/json' : 'text/javascript')); }],
          [T('Annuler les modifications', 'Discard changes'), () => { loadWork(); dirty = false; show(); }],
          [T('Revenir au fichier du dépôt', 'Back to repository file'), () => { if (!confirm(T('Supprimer les modifications locales de cette base ?', 'Delete local changes of this base?'))) return; localStorage.removeItem(set.overrideKey); loadWork(); dirty = false; show(); }]
        ]);
        return;
      }
      // Données du navigateur : objet par clé ou tableau.
      const raw = read(set.key) || (set.array ? [] : {}), list = set.array ? raw.map(r => ({ ...r })) : Object.values(raw).map(r => ({ ...r }));
      status(`${list.length} ${T('entrées', 'entries')}`);
      grid(body, { columns: set.columns, data: list, onChange: changed });
      const buttons = [[T('Enregistrer', 'Save'), () => {
        const value = set.array ? list.filter(r => Object.values(r).some(Boolean)) : Object.fromEntries(list.filter(r => set.byKey(r)).map(r => [set.byKey(r), { ...(raw[set.byKey(r)] || {}), ...r }]));
        write(set.key, value); dirty = false; status(`${T('Enregistré dans le navigateur', 'Saved in the browser')} (${set.key})`);
      }, 'primary'], [T('Annuler les modifications', 'Discard changes'), () => { dirty = false; show(); }]];
      if (set.integrate) buttons.push([T('Intégrer à la base du dépôt', 'Integrate into repository base'), () => { const target = set.integrate(list); dirty = false; current.id = target; history.replaceState(null, '', `?base=${target}`); show(); changed(); }]);
      actions(buttons);
    }

    // Base DEFA : import du journal des vols, analyse des séries d'indicatifs (ajout / complément
    // de la table de correspondance), consultation filtrée, export, effacement.
    function defaLog(body) {
      const D = window.DefaFlightLog, data = D.load(), list = data.records || [];
      const up = v => String(v ?? '').trim().toUpperCase(), clean = v => up(v).replace(/[^A-Z0-9]/g, '');
      const hours = m => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`;
      body.innerHTML = `<div class="row da-defa-import"><button type="button" class="primary" data-defa-load>${esc(T('Charger / mettre à jour le journal (page « Log des vols » copiée ou enregistrée)…', 'Load / update the log (copied or saved “Log des vols” page)…'))}</button></div>
        <p class="small da-defa-stats"></p>
        <h3>${esc(T('Séries d’indicatifs', 'Callsign series'))}</h3><p class="small">${esc(T('Formes vues ramenées à une série (fautes, suffixes de patrouille : lettre, couleur, alphabet OTAN). « Ajouter » crée la ligne dans la correspondance des indicatifs (à vérifier : indicatif complet, organisme), « Compléter » y ajoute les formes et types vus.', 'Seen forms grouped into series (typos, patrol suffixes). “Add” creates the row in the callsign correspondence (check the full callsign and organisation), “Complete” adds the seen forms and types.'))}</p>
        <div class="da-defa-series"></div>
        <h3>${esc(T('Vols', 'Flights'))}</h3><div class="row"><input type="search" class="da-defa-filter" placeholder="${esc(T('Filtrer (indicatif, immatriculation, pilote, terrain, mission…)', 'Filter (callsign, registration, pilot, aerodrome, mission…)'))}"></div><div class="da-defa-flights"></div>`;
      // Chargement / mise à jour : même fenêtre que les reportings (copier-coller ou page enregistrée ;
      // fusion sans doublon par défaut, l'historique s'accumule).
      body.querySelector('[data-defa-load]').onclick = () => D.loaderDialog({ onLoaded: data => { status(`${data.records.length} ${T('vols dans le journal', 'flights in the log')} (+${data.added})`); defaLog(body); } });
      if (!list.length) { body.querySelector('.da-defa-stats').textContent = T('Aucun journal chargé dans ce navigateur.', 'No log loaded in this browser.'); actions([]); return; }
      const dates = list.map(r => r.date).sort(), minutes = list.reduce((a, r) => a + (r.durationMin || 0), 0);
      const count = key => new Set(list.map(r => r[key]).filter(Boolean)).size;
      body.querySelector('.da-defa-stats').textContent = `${data.source || '—'} · ${T('chargé le', 'loaded on')} ${new Date(data.importedAt).toLocaleString()} · ${list.length} ${T('vols', 'flights')} · ${dates[0]} → ${dates[dates.length - 1]} · ${hours(minutes)} · ${count('trigram')} ${T('pilotes', 'pilots')} · ${count('registration')} ${T('appareils', 'aircraft')} · ${count('type')} types`;
      // Séries : état dans la table de correspondance (indicatif, forme plan de vol ou autre forme).
      const table = () => work.callsigns.data.table;
      const entryOf = s => table().find(e => [e.prefix, e.fpl, ...(e.aliases || [])].map(clean).some(f => f === s.prefix || s.forms.has(f)));
      const series = D.series(list);
      // Types réellement employés par la série : au moins 2 vols ou 20 % des vols.
      const topTypes = s => { const per = new Map(); s.types.forEach((n, t) => { const k = t.split(' ')[0]; per.set(k, (per.get(k) || 0) + n); }); return [...per].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 2 || n >= 0.2 * s.count).map(([t]) => t).slice(0, 4); };
      const rows = series.map(s => {
        const e = entryOf(s), forms = [...s.forms].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} (${n})`).join(', ');
        const numbers = [...s.numbers].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
        const types = [...s.types].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`).join(', ');
        // Désignateurs génériques et indicatifs de fonction (FAF, COTAM…) : pas de types de série.
        const missing = e ? { forms: [...s.forms.keys()].filter(f => ![e.prefix, e.fpl, ...(e.aliases || [])].map(clean).includes(f)), types: e.generic || e.role ? [] : topTypes(s).filter(t => !(e.types || []).map(up).includes(t)) } : null;
        const state = !e ? `<button type="button" class="primary" data-defa-add="${esc(s.prefix)}">${esc(T('Ajouter', 'Add'))}</button>`
          : missing.forms.length || missing.types.length ? `<button type="button" data-defa-fill="${esc(s.prefix)}" title="${esc([...missing.forms, ...missing.types].join(', '))}">${esc(T('Compléter', 'Complete'))} (${esc(e.prefix)})</button>` : `✓ ${esc(e.prefix)}`;
        return `<tr><td><b>${esc(s.prefix)}</b></td><td>${esc(forms)}</td><td class="num">${s.count}</td><td title="${esc(numbers.join(' '))}">${numbers.length ? `${numbers.length} : ${esc(numbers.slice(0, 8).join(' '))}${numbers.length > 8 ? '…' : ''}` : '—'}</td><td>${esc([...s.suffixes].join(' ') || '—')}</td><td>${esc(types)}</td><td>${esc(s.first)} → ${esc(s.last)}</td><td>${state}</td></tr>`;
      }).join('');
      body.querySelector('.da-defa-series').innerHTML = `<table class="da-table"><thead><tr><th>${esc(T('Série', 'Series'))}</th><th>${esc(T('Formes vues (vols)', 'Seen forms (flights)'))}</th><th>${esc(T('Vols', 'Flights'))}</th><th>${esc(T('Numéros', 'Numbers'))}</th><th>${esc(T('Suffixes', 'Suffixes'))}</th><th>Types</th><th>${esc(T('Période', 'Period'))}</th><th>${esc(T('Correspondance', 'Correspondence'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
      const toCallsigns = () => { current.id = 'callsigns'; history.replaceState(null, '', '?base=callsigns'); show(); changed(); status(T('Correspondance des indicatifs modifiée : vérifier, puis « Appliquer dans ce navigateur » ou « Enregistrer dans le dépôt ».', 'Callsign correspondence changed: check, then apply or save.')); };
      body.querySelectorAll('[data-defa-add]').forEach(b => b.onclick = () => {
        const s = series.find(x => x.prefix === b.dataset.defaAdd), forms = [...s.forms].sort((a, c) => c[1] - a[1]).map(([f]) => f);
        const fpl = forms.filter(f => f.length <= 7).sort((a, c) => (s.forms.get(c) - s.forms.get(a)))[0] || s.prefix.slice(0, 7);
        table().push({ prefix: s.prefix, fpl, aliases: forms.filter(f => f !== s.prefix && f !== fpl), operator: '', designator: '', types: topTypes(s), note: `${T('journal DEFA', 'DEFA log')} ${s.first} → ${s.last} : ${s.count} ${T('vols', 'flights')}${s.suffixes.size ? ` · ${T('suffixes', 'suffixes')} ${[...s.suffixes].join(' ')}` : ''}` });
        toCallsigns();
      });
      body.querySelectorAll('[data-defa-fill]').forEach(b => b.onclick = () => {
        const s = series.find(x => x.prefix === b.dataset.defaFill), e = entryOf(s);
        e.aliases = [...new Set([...(e.aliases || []), ...[...s.forms.keys()].filter(f => ![e.prefix, e.fpl].map(clean).includes(f))])];
        e.types = [...new Set([...(e.types || []).map(up), ...topTypes(s)])];
        toCallsigns();
      });
      // Vols : filtre plein texte, 300 lignes affichées.
      const flights = body.querySelector('.da-defa-flights'), filter = body.querySelector('.da-defa-filter');
      const paint = () => {
        const q = up(filter.value), shown = (q ? list.filter(r => up(Object.values(r).join(' ')).includes(q)) : list);
        flights.innerHTML = `<p class="small">${shown.length} ${T('vols', 'flights')}${shown.length > 300 ? ` — ${T('300 premiers affichés', 'first 300 shown')}` : ''}</p><table class="da-table"><thead><tr>${['Date', T('Durée', 'Duration'), T('Pilote', 'Pilot'), T('Indicatif', 'Callsign'), T('Immat.', 'Reg.'), 'Type', T('Départ', 'Dep.'), T('Arrivée', 'Arr.'), 'Mission'].map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${shown.slice(0, 300).map(r => `<tr><td>${esc(r.date)} ${esc(r.time)}</td><td>${r.durationMin == null ? '—' : hours(r.durationMin)}</td><td>${esc(r.trigram)}</td><td>${esc(r.callsign)}</td><td>${r.fleetId ? `<a href="https://flotte.defa-virtual.fr/appareil.php?id=${esc(r.fleetId)}" target="_blank" rel="noopener">${esc(r.registration)}</a>` : esc(r.registration)}</td><td>${esc([r.type, r.variant].filter(Boolean).join(' '))}</td><td>${esc(r.dep)}</td><td>${esc(r.arr)}</td><td>${esc(r.mission)}</td></tr>`).join('')}</tbody></table>`;
      };
      filter.oninput = paint; paint();
      actions([
        [T('Mettre à jour la référence DEFA (anonymisée)', 'Update the DEFA reference (anonymised)'), () => {
          work.defaReference.data = D.reference(list, work.defaReference.data);
          current.id = 'defaReference'; history.replaceState(null, '', '?base=defaReference'); show(); changed();
          status(T('Référence DEFA complétée depuis le journal : vérifier, puis « Enregistrer dans le dépôt » (shared/defa_reference.js).', 'DEFA reference completed from the log: check, then save to repository.'));
        }, 'primary'],
        [T('Exporter en CSV', 'Export CSV'), () => download('defa_log_des_vols.csv', D.toCsv(list), 'text/csv')],
        [T('Exporter en JSON (rechargeable)', 'Export JSON (reloadable)'), () => download('defa_log_des_vols.json', JSON.stringify({ source: data.source, importedAt: data.importedAt, records: list }, null, 1), 'application/json')],
        [T('Effacer la base DEFA de ce navigateur', 'Clear the DEFA base from this browser'), () => { if (!confirm(T('Effacer le journal des vols DEFA de ce navigateur ? (rechargeable depuis le fichier)', 'Clear the DEFA flight log from this browser? (reloadable from the file)'))) return; D.clear(); status(T('Base DEFA effacée', 'DEFA base cleared')); defaLog(body); }]
      ]);
    }

    // Envoi des CR : adresse, en-tête, schéma et clef du webservice (encore à définir).
    function sendSettings(body) {
      const config = { header: 'Authorization', scheme: 'Bearer', ...(read('missionSendConfig:v1') || {}) };
      const fields = [['url', T('Adresse du webservice (https://…)', 'Web service address (https://…)'), 'url'], ['header', T('En-tête de la clef', 'Key header'), 'text'], ['scheme', T('Préfixe (Bearer, vide pour la clef seule)', 'Prefix (Bearer, empty for the bare key)'), 'text'], ['key', T('Clef', 'Key'), 'password']];
      body.innerHTML = `<div class="da-form">${fields.map(([k, label, type]) => `<label>${esc(label)}<input type="${type}" data-send="${k}" autocomplete="off" spellcheck="false"></label>`).join('')}</div>
        <p class="small">${esc(T('Exemples d’en-tête : Authorization (Bearer <clef>), X-API-Key (clef seule).', 'Header examples: Authorization (Bearer <key>), X-API-Key (bare key).'))}</p>`;
      const input = k => body.querySelector(`[data-send="${k}"]`);
      ['url', 'header', 'scheme'].forEach(k => { input(k).value = config[k] || ''; });
      input('key').value = localStorage.getItem('missionSendKey:v1') || '';
      body.querySelectorAll('input').forEach(i => i.oninput = changed);
      const log = read('missionSendLog:v1') || {};
      status(`${Object.keys(log).length} ${T('CR envoyés depuis ce navigateur', 'reports sent from this browser')}`);
      actions([
        [T('Enregistrer', 'Save'), () => {
          const url = input('url').value.trim();
          if (url && !/^https?:\/\//i.test(url)) { status(T('Adresse invalide (http:// ou https://)', 'Invalid address (http:// or https://)')); return; }
          write('missionSendConfig:v1', { url, header: input('header').value.trim() || 'Authorization', scheme: input('scheme').value.trim() });
          const key = input('key').value.trim(); if (key) localStorage.setItem('missionSendKey:v1', key); else localStorage.removeItem('missionSendKey:v1');
          dirty = false; status(T('Enregistré dans ce navigateur', 'Saved in this browser'));
        }, 'primary'],
        [T('Oublier la clef', 'Forget the key'), () => { localStorage.removeItem('missionSendKey:v1'); input('key').value = ''; status(T('Clef supprimée de ce navigateur', 'Key removed from this browser')); }]
      ]);
    }

    // Fusions / renommages : équivalences A → B, boucles signalées, suppression.
    function merges(body) {
      const G = window.MissionGridEdit; if (!G) { body.textContent = T('Module de fusion absent de cette page.', 'Merge module missing on this page.'); return; }
      const draw = () => {
        const map = G.mergeMap(), rows = ['crew', 'aircraft'].flatMap(kind => { const m = map[kind] || {}, bad = new Set(G.loops(m)); return Object.entries(m).map(([from, to]) => ({ kind, from, to, end: G.resolve(m, from), loop: bad.has(from) })); });
        body.innerHTML = rows.length ? `<table class="da-table"><thead><tr><th>${esc(T('Type', 'Type'))}</th><th>${esc(T('Ancien', 'Old'))}</th><th>${esc(T('Devient', 'Becomes'))}</th><th>${esc(T('Résultat', 'Result'))}</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr${r.loop ? ' style="background:#fee2e2"' : ''}><td>${esc(r.kind === 'crew' ? T('Pilote', 'Pilot') : T('Appareil', 'Aircraft'))}</td><td><b>${esc(r.from)}</b></td><td>${esc(r.to)}</td><td>${r.loop ? `⚠ ${esc(T('boucle', 'loop'))}` : esc(r.end)}</td><td><button type="button" class="secondary" data-unmerge="${i}">${esc(T('Supprimer', 'Delete'))}</button></td></tr>`).join('')}</tbody></table>` : `<p class="small">${esc(T('Aucune fusion mémorisée.', 'No stored merge.'))}</p>`;
        body.querySelectorAll('[data-unmerge]').forEach(b => b.onclick = () => { const r = rows[+b.dataset.unmerge]; if (!confirm(`${T('Supprimer l’équivalence', 'Delete the equivalence')} ${r.from} → ${r.to} ?`)) return; G.unmerge(r.kind, r.from); status(`${r.from} → ${r.to} : ${T('supprimée', 'deleted')}`); draw(); });
        const n = rows.filter(r => r.loop).length; status(n ? `${n} ${T('entrée(s) en boucle : les noms concernés sont échangés. Supprime l’une des deux, puis refais la fusion depuis la fiche.', 'looping entr(ies): the names are swapped. Delete one, then redo the merge from the sheet.')}` : `${rows.length} ${T('équivalence(s)', 'equivalence(s)')}`);
      };
      draw();
    }

    // Registres des missions : YAML par famille.
    async function ledgers(body) {
      const M = window.MissionModel, families = window.MissionVocab.families, L = window.MissionLedger;
      await L.load(true);
      const store = L.store;
      body.innerHTML = `<p class="small"></p><table class="da-table"><thead><tr><th>${esc(T('Famille', 'Family'))}</th><th>${esc(T('Missions', 'Missions'))}</th><th></th></tr></thead><tbody></tbody></table><div class="da-yaml" hidden><h3></h3><textarea spellcheck="false"></textarea><div class="row"><button type="button" class="primary" data-yaml="save"></button><button type="button" class="secondary" data-yaml="close"></button></div></div>`;
      const info = () => { body.querySelector('p.small').textContent = `${L.FILE} (CR DEFA) · ${store.missions.length} ${T('missions', 'missions')} · ${T('source', 'source')} : ${store.source}${store.folder ? ` (${store.folder})` : ''} · ${T('mis à jour', 'updated')} ${store.updatedAt ? new Date(store.updatedAt).toLocaleString() : '—'}${Object.keys(store.legacyImported || {}).length ? ` · ${T('anciens registres repris', 'legacy ledgers merged')} : ${Object.keys(store.legacyImported).join(', ')}` : ''}`; };
      info();
      const tbody = body.querySelector('tbody'), editor = body.querySelector('.da-yaml'), area = editor.querySelector('textarea');
      editor.querySelector('[data-yaml="save"]').textContent = T('Contrôler et enregistrer', 'Check and save');
      editor.querySelector('[data-yaml="close"]').onclick = () => { editor.hidden = true; dirty = false; };
      editor.querySelector('[data-yaml="close"]').textContent = T('Fermer', 'Close');
      const result = r => `${r.written ? `${T('fichier', 'file')} ${store.folder}/${L.FILE}` : T('navigateur (dossier « CR DEFA » non autorisé : « Dossier du registre… »)', 'browser (“CR DEFA” folder not authorised: “Ledger folder…”)')}`;
      // Éditeur YAML : registre complet (family absent) ou missions d'une famille.
      function edit(familyId) {
        const view = familyId ? L.open({ id: familyId }) : null;
        editor.hidden = false; editor.querySelector('h3').textContent = familyId ? `${familyId} — ${L.FILE}` : `${T('Registre complet', 'Full ledger')} — ${L.FILE}`;
        area.value = M.toYaml({ schemaVersion: M.SCHEMA_VERSION, updatedAt: store.updatedAt, missions: view ? view.missions : store.missions }, familyId ? `Missions ${familyId}` : 'Registre des missions — toutes familles');
        area.oninput = changed;
        editor.querySelector('[data-yaml="save"]').onclick = async () => {
          let data;
          try { data = window.jsyaml.load(area.value, { schema: window.jsyaml.CORE_SCHEMA }); } catch (e) { status(`${T('YAML invalide', 'Invalid YAML')} : ${e.message}`); return; }
          const missions = Array.isArray(data) ? data : data?.missions;
          if (!Array.isArray(missions)) { status(T('YAML sans liste « missions ».', 'YAML without a “missions” list.')); return; }
          if (!familyId && missions.some(m => !m?.family)) { status(T('Registre complet : chaque mission doit avoir sa famille (family).', 'Full ledger: each mission needs its family.')); return; }
          const parsed = missions.map(m => M.migrate(m, m.family || familyId));
          if (view) view.setMissions(parsed); else L.setAll(parsed);
          const r = await L.save(); dirty = false; status(`${parsed.length} ${T('missions enregistrées', 'missions saved')} — ${result(r)}`); paint(); info();
        };
        editor.scrollIntoView({ behavior: 'smooth' });
      }
      function paint() {
        tbody.innerHTML = '';
        families.forEach(f => {
          const view = L.open({ id: f.id }), tr = document.createElement('tr');
          tr.innerHTML = `<td><b>${esc(f.id)}</b> <span class="small">${esc(f.label)}</span></td><td>${view.missions.length}</td>
            <td class="row"><button type="button" class="secondary" data-act="edit">${esc(T('Éditer (YAML)', 'Edit (YAML)'))}</button><button type="button" class="secondary" data-act="yaml">YAML</button><button type="button" class="secondary" data-act="csv">CSV</button><a class="secondary mc-button" href="${esc(f.reporting)}">${esc(T('Reporting', 'Reporting'))}</a></td>`;
          tr.querySelector('[data-act="yaml"]').onclick = () => view.downloadYaml();
          tr.querySelector('[data-act="csv"]').onclick = () => view.downloadCsv();
          tr.querySelector('[data-act="edit"]').onclick = () => edit(f.id);
          tbody.append(tr);
        });
      }
      paint();
      actions([
        [T('Éditer le registre complet (YAML)', 'Edit the full ledger (YAML)'), () => edit(null), 'primary'],
        [T('Dossier du registre…', 'Ledger folder…'), async () => { await L.chooseFolder(); await L.load(true); const r = await L.save(); status(result(r)); info(); paint(); }],
        [T('Télécharger le registre (YAML)', 'Download the ledger (YAML)'), () => L.downloadAll()],
        [T('Exporter en CSV (tableur)', 'Export CSV (spreadsheet)'), () => L.downloadAllCsv()]
      ]);
      status(T('Registre unique : dossier autorisé, sinon copie du navigateur, sinon fichier du dépôt ; anciens registres par famille repris automatiquement.', 'Single ledger: authorised folder, else browser copy, else repository file; legacy per-family ledgers merged automatically.'));
    }

    show();
    window.RepositoryContentI18n?.(rows);
  }

  window.DataAdmin = { mount, render, DATASETS };
})();
