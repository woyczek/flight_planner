(() => {
  'use strict';
  // Registre des missions générées (SIA XML/mission_registry.html) : inventaire des séries du dossier « Missions »
  // (missionNN.yaml, summaryNN.md, schéma helo-xp-mission) et des missions commandées, avec choix par type, sous-type,
  // rendez-vous, nombre et types d'équipes, ravitaillement, théâtre, statut ; tirage au sort ; ouverture dans le
  // générateur, le studio ou un nouveau CR ; commande d'une nouvelle mission (prompt ChatGPT réglé).
  // Données : localStorage missionRegistry:v1 (sauvegardé avec les données locales) et fichier
  // Missions/mission_registry.yaml (dossier autorisé __missions). Statut « CR fait » repris du registre des CR
  // (missionCoreLedger:v2 : metadata.missionNumber = identifiant de la mission).
  const host = document.getElementById('missionRegistry');
  if (!host) return;
  const KEY = 'missionRegistry:v1', FILE = 'mission_registry.yaml', FILTERS = 'missionRegistryFilters:v1';
  const LANGS = ['fr', 'en', 'de', 'es'];
  const li = () => Math.max(0, LANGS.indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
  const t = (row, vars = {}) => (Array.isArray(row) ? (row[li()] || row[1] || row[0]) : String(row ?? '')).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const readJson = (k, d = null) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };
  const waitFor = (name, ms = 6000) => new Promise(resolve => { const t0 = Date.now(); (function poll() { if (window[name]) return resolve(window[name]); if (Date.now() - t0 > ms) return resolve(null); setTimeout(poll, 60); })(); });
  const fmtDate = v => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString(['fr-FR', 'en-GB', 'de-DE', 'es-ES'][li()]); };

  const STATUS = {
    ordered: ['commandée', 'ordered', 'bestellt', 'encargada'],
    generated: ['générée', 'generated', 'erzeugt', 'generada'],
    planned: ['planifiée', 'planned', 'geplant', 'planificada'],
    flown: ['volée', 'flown', 'geflogen', 'volada'],
    reported: ['CR fait', 'report done', 'Bericht erstellt', 'informe hecho'],
    cancelled: ['abandonnée', 'dropped', 'verworfen', 'abandonada']
  };
  const THEATRES = [
    ['Corse', 41.3, 43.1, 8.5, 9.7], ['métropole', 41, 51.6, -5.8, 10], ['Antilles', 14, 18.6, -63.6, -60.4], ['Guyane', 1.8, 6.2, -55, -51],
    ['Réunion', -21.5, -20.8, 55.1, 55.9], ['Mayotte', -13.1, -12.5, 44.9, 45.4], ['Nouvelle-Calédonie', -23.2, -19, 162.5, 168.6],
    ['Polynésie', -28, -7, -155, -134], ['Saint-Pierre-et-Miquelon', 46.7, 47.2, -56.5, -56]
  ];
  /** Théâtre d'un point (lat, lon) ; '' hors des théâtres connus. */
  const theatreOf = (lat, lon) => (Number.isFinite(+lat) && Number.isFinite(+lon) && THEATRES.find(([, s, n, w, e]) => lat >= s && lat <= n && lon >= w && lon <= e)?.[0]) || '';

  // ---- familles et sous-types : § 2 du prompt de génération (source unique : docs/PROMPT_GENERATEUR_MISSIONS.md)
  function families() {
    const text = String(window.MISSION_PROMPT || ''), out = [];
    const sec = /2\. FAMILLES ET SOUS-TYPES[\s\S]*?\n─+\n([\s\S]*?)\n─+\n3\./.exec(text)?.[1] || '';
    let cur = null;
    for (const line of sec.split('\n')) {
      const m = /^([A-Z]{2,})\s+\(([^)]*(?:\([^)]*\)[^)]*)*)\)\s+(.*)$/.exec(line);
      if (m) { cur = { id: m[1], label: m[2].trim(), rest: m[3].trim() }; out.push(cur); continue; }
      if (cur && /^\s{20,}\S/.test(line)) cur.rest += ' ' + line.trim();
      else if (!line.trim()) cur = null;
    }
    return out.map(f => ({ id: f.id, label: f.label, subtypes: /libre/i.test(f.rest) && !/·/.test(f.rest) ? [] : f.rest.split('·').map(s => s.trim()).filter(Boolean) }));
  }

  // ---- registre
  const empty = () => ({ schema: 'mission-registry', version: 1, updatedAt: '', missions: [] });
  let reg = readJson(KEY, null) || empty();
  const keyOf = m => `${m.folder || ''}|${m.id || m.title || ''}`;
  function persist() {
    reg.updatedAt = new Date().toISOString();
    writeJson(KEY, reg);
    writeFile().catch(() => {});
  }
  /** Écrit Missions/mission_registry.yaml (dossier autorisé, sans demande). */
  async function writeFile(request = false) {
    const dir = await missionsDir(request);
    if (!dir || !window.jsyaml) return false;
    const text = `# Registre des missions générées — XPlane Web Suite (SIA XML/mission_registry.html)\n# ${reg.updatedAt}\n` + window.jsyaml.dump(reg, { lineWidth: -1, noRefs: true });
    const w = await (await dir.getFileHandle(FILE, { create: true })).createWritable();
    await w.write(text);
    await w.close();
    return true;
  }
  async function missionsDir(request = false) {
    const FA = await waitFor('FileAccess');
    if (!FA) return null;
    const st = await FA.status('__missions');
    if (!st.handle) return null;
    if (st.permission === 'granted') return st.handle;
    if (!request) return null;
    try { return (await st.handle.requestPermission({ mode: 'readwrite' })) === 'granted' ? st.handle : null; } catch { return null; }
  }

  // ---- lecture d'une mission (document { yaml, narrative }) → entrée du registre
  function entryOf(doc, { folder = '', files = [], generatedAt = '' } = {}) {
    const y = doc.yaml || {}, meta = y.mission || {};
    const teams = (Array.isArray(y.teams) ? y.teams : []).filter(x => x && typeof x === 'object');
    const aircraft = (Array.isArray(y.aircraft) ? y.aircraft : y.aircraft ? [y.aircraft] : []).filter(Boolean);
    const rdv = Array.isArray(y.rendezvous) ? y.rendezvous : [];
    const flying = teams.filter(tm => /\b(A\d{3}|H\d{3}|EC|AS|NH|E-?3|Rafale|Mirage|Falcon|Atlantique|DH8|CL-?415|Dash|TBM|BE20|King|C-?130|C-?160|A400|Caracal|Puma|Dauphin|Panther|Tigre|Cougar|avion|hélico|drone|patrouille|aéronef|MRTT|Phénix|Hawkeye|Reaper)/i.test(`${tm.type || ''} ${tm.role || ''}`));
    const pt = y.origin || y.target || {};
    const opMissions = Array.isArray(y.operation?.missions) ? y.operation.missions : [];
    return {
      id: String(meta.id ?? meta.number ?? '').trim() || (/(\d+[A-Z]?)/.exec(files[0] || '')?.[1] || ''),
      series: meta.series ?? '',
      number: meta.number ?? '',
      type: String(meta.type || '').toUpperCase(),
      family: window.MissionVocab?.familyForType?.(meta.type) || '',
      subtype: String(meta.subtype || ''),
      title: String(y.title || '').trim(),
      operation: y.operation ? { id: String(y.operation.id || ''), name: String(y.operation.name || ''), missions: opMissions.length } : null,
      teams: teams.map(tm => ({ name: String(tm.name || ''), type: String(tm.type || ''), service: String(tm.service || ''), role: String(tm.role || '') })),
      teamCount: teams.length,
      airTeams: Math.max(aircraft.length, flying.length ? 1 : 0, opMissions.length || 0) || aircraft.length,
      teamTypes: [...new Set(teams.map(tm => String(tm.type || '').trim()).filter(Boolean))],
      aircraftTypes: [...new Set(aircraft.map(a => String(a.type || '').trim()).filter(Boolean))],
      callsigns: [...new Set(aircraft.map(a => String(a.callsign || '').trim()).filter(Boolean))],
      rdv: rdv.length,
      aar: !!(y.air_refueling?.planned || /AAR/i.test(meta.type || '')),
      theatre: theatreOf(+pt.lat, +pt.lon) || theatreOf(+y.destination?.lat, +y.destination?.lon),
      origin: String(y.origin?.name || ''),
      destination: String(y.destination?.name || ''),
      maps: Array.isArray(y.maps) ? y.maps.length : 0,
      folder,
      files,
      generatedAt,
      hasYaml: files.some(f => /\.ya?ml$/i.test(f)),
      hasMd: files.some(f => /\.md$/i.test(f))
    };
  }
  /** Fusion d'une entrée lue avec l'entrée existante (champs de l'utilisateur conservés : statut, dates, notes, commande). */
  function upsert(e, source) {
    const i = reg.missions.findIndex(m => keyOf(m) === keyOf(e));
    // mission commandée : même série et même identifiant (ou même numéro d'opération) → la commande devient la mission
    const j = i < 0 ? reg.missions.findIndex(m => m.status === 'ordered' && m.request && String(m.request.serie) === String(e.series) && (!m.id || String(e.id).startsWith(String(m.id)))) : -1;
    const prev = i >= 0 ? reg.missions[i] : j >= 0 ? reg.missions[j] : null;
    const merged = { ...prev, ...e, source, status: prev && prev.status !== 'ordered' ? prev.status : 'generated', statusAt: prev?.statusAt || new Date().toISOString(), notes: prev?.notes || '', flownAt: prev?.flownAt || '', request: prev?.request || null, addedAt: prev?.addedAt || new Date().toISOString() };
    if (i >= 0) reg.missions[i] = merged; else if (j >= 0) reg.missions[j] = merged; else reg.missions.push(merged);
    return merged;
  }
  /** Parcourt le dossier des missions (sous-dossiers de séries) : YAML et Markdown groupés par mission. */
  async function scan(request = true) {
    const dir = await missionsDir(request);
    if (!dir) throw new Error(t(['Choisir le dossier « Missions » du dépôt (bouton ci-dessus).', 'Choose the repository “Missions” folder (button above).']));
    await waitFor('SiaMission');
    const found = [], problems = [];
    async function walk(h, path, depth) {
      const files = [], subs = [];
      for await (const [name, x] of h.entries()) {
        if (x.kind === 'directory') { if (depth < 3 && !/^(_|\.)/.test(name)) subs.push([name, x]); }
        else if (/\.(ya?ml|md)$/i.test(name) && name !== FILE && !/^(maps_manifest|AAR_TRACKS_REFERENCE|OSM_WORK_PROMPT|README|VALIDATION)/i.test(name)) files.push(x);
      }
      if (files.length) {
        const texts = [];
        let newest = 0;
        for (const fh of files) { const f = await fh.getFile(); newest = Math.max(newest, f.lastModified); texts.push({ name: f.name, text: await f.text() }); }
        try {
          const { docs } = window.SiaMission.fromTextsBatch(texts);
          for (const d of docs) {
            const names = d.sourceNames || [];
            found.push(entryOf(d, { folder: path, files: names, generatedAt: new Date(newest).toISOString() }));
          }
        } catch (e) { problems.push(`${path || '.'} : ${e.message}`); }
      }
      for (const [name, x] of subs) await walk(x, path ? `${path}/${name}` : name, depth + 1);
    }
    await walk(dir, '', 0);
    for (const e of found) upsert(e, 'dossier');
    const seen = new Set(found.map(keyOf));
    reg.missions.forEach(m => { m.missingFile = m.source === 'dossier' && !seen.has(keyOf(m)); });
    linkReports();
    persist();
    return { found: found.length, problems };
  }
  /** Ajoute des fichiers choisis (File) : groupés par dossier (webkitRelativePath) puis par mission. Retourne le nombre de missions. */
  async function addFiles(list) {
    await waitFor('SiaMission');
    const groups = new Map();
    for (const f of list) {
      if (!/\.(ya?ml|md)$/i.test(f.name) || /^(maps_manifest|AAR_TRACKS_REFERENCE|OSM_WORK_PROMPT|README|VALIDATION)/i.test(f.name) || f.name === FILE) continue;
      const folder = (f.webkitRelativePath || '').split('/').slice(0, -1).join('/') || f.folder || '';
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(f);
    }
    let n = 0;
    for (const [folder, files] of groups) {
      const texts = await Promise.all(files.map(async f => ({ name: f.name, text: await f.text() })));
      const newest = Math.max(...files.map(f => f.lastModified || 0));
      const { docs } = window.SiaMission.fromTextsBatch(texts);
      for (const d of docs) { upsert(entryOf(d, { folder, files: d.sourceNames || [], generatedAt: newest ? new Date(newest).toISOString() : '' }), 'import'); n++; }
    }
    linkReports();
    persist();
    return n;
  }
  /** Statut « CR fait » : CR du registre dont metadata.missionNumber est l'identifiant de la mission (et même titre / opération). */
  function linkReports() {
    let crs = [];
    try { const c = readJson('missionCoreLedger:v2', null); crs = window.jsyaml.load(c?.text || '')?.missions || []; } catch { /* registre illisible */ }
    for (const m of reg.missions) {
      const cr = crs.find(r => String(r?.metadata?.missionNumber || '') === String(m.id) && m.id && (!m.title || !r.metadata.operationName || r.metadata.operationName === m.title));
      if (cr) { m.report = { family: cr.family, date: cr.metadata?.date || '', missionId: cr.metadata?.missionId || '' }; if (m.status !== 'cancelled') m.status = 'reported'; }
    }
  }

  // ---- filtres et choix
  const DEFAULT_FILTERS = { type: '', subtype: '', rdv: '', teamsMin: '', teamsMax: '', teamType: '', aar: '', theatre: '', status: '', q: '' };
  let filters = { ...DEFAULT_FILTERS, ...readJson(FILTERS, {}) };
  const matches = m => (!filters.type || m.type === filters.type || m.family === filters.type)
    && (!filters.subtype || m.subtype === filters.subtype)
    && (!filters.rdv || (filters.rdv === 'with' ? m.rdv > 0 : m.rdv === 0))
    && (filters.teamsMin === '' || m.teamCount >= +filters.teamsMin)
    && (filters.teamsMax === '' || m.teamCount <= +filters.teamsMax)
    && (!filters.teamType || [...m.teamTypes, ...m.aircraftTypes].some(x => x.toLowerCase().includes(filters.teamType.toLowerCase())))
    && (!filters.aar || (filters.aar === 'yes') === !!m.aar)
    && (!filters.theatre || m.theatre === filters.theatre)
    && (!filters.status || m.status === filters.status)
    && (!filters.q || JSON.stringify([m.id, m.title, m.origin, m.destination, m.callsigns, m.operation?.name, m.notes]).toLowerCase().includes(filters.q.toLowerCase()));
  const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }));

  // ---- rendu
  let table = null, selected = null, msg = '';
  const pill = (level, text) => `<span class="rg-pill rg-${level}">${esc(text)}</span>`;
  function render() {
    const fam = families(), rows = reg.missions.filter(matches);
    const types = uniq([...reg.missions.map(m => m.type), ...fam.map(f => f.id)]);
    const subtypes = uniq([...reg.missions.filter(m => !filters.type || m.type === filters.type).map(m => m.subtype), ...(fam.find(f => f.id === filters.type)?.subtypes || [])]);
    const teamTypes = uniq(reg.missions.flatMap(m => [...m.teamTypes, ...m.aircraftTypes]));
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
    const counts = Object.keys(STATUS).map(k => [k, reg.missions.filter(m => m.status === k).length]).filter(([, n]) => n);
    host.innerHTML = `
      <section data-block-id="source" data-icon="folder" data-subtitle="${esc(t(['Séries générées du dossier « Missions » et missions commandées', 'Generated series of the “Missions” folder and ordered missions']))}">
        <h2>${esc(t(['Missions du registre', 'Registry missions', 'Missionen des Registers', 'Misiones del registro']))}</h2>
        <p class="row" id="rgFolder"></p>
        <p>${esc(t(['{n} mission(s)', '{n} mission(s)'], { n: reg.missions.length }))} · ${counts.map(([k, n]) => `${pill(k, t(STATUS[k]))} ${n}`).join(' ')} ${reg.updatedAt ? `<span class="rg-small">— ${esc(t(['mis à jour le {d}', 'updated {d}'], { d: fmtDate(reg.updatedAt) }))}</span>` : ''}</p>
        <div id="rgMsg">${msg}</div>
      </section>
      <section data-block-id="choose" data-icon="search" data-subtitle="${esc(t(['Type, sous-type, rendez-vous, équipes, ravitaillement, théâtre, statut — puis tirer au sort ou ouvrir', 'Type, subtype, rendezvous, teams, refuelling, theatre, status — then draw or open']))}">
        <h2>${esc(t(['Choisir une mission', 'Choose a mission', 'Mission wählen', 'Elegir una misión']))}</h2>
        <div class="rg-filters">
          <label>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}<select data-f="type">${opt('', t(['tous', 'all', 'alle', 'todos']), filters.type)}${types.map(x => opt(x, x, filters.type)).join('')}</select></label>
          <label>${esc(t(['Sous-type', 'Subtype', 'Untertyp', 'Subtipo']))}<select data-f="subtype">${opt('', t(['tous', 'all', 'alle', 'todos']), filters.subtype)}${subtypes.map(x => opt(x, x, filters.subtype)).join('')}</select></label>
          <label>${esc(t(['Rendez-vous', 'Rendezvous', 'Treffpunkt', 'Encuentro']))}<select data-f="rdv">${opt('', t(['indifférent', 'any', 'egal', 'indiferente']), filters.rdv)}${opt('with', t(['avec', 'with', 'mit', 'con']), filters.rdv)}${opt('without', t(['sans', 'without', 'ohne', 'sin']), filters.rdv)}</select></label>
          <label>${esc(t(['Équipes engagées', 'Teams engaged', 'Beteiligte Teams', 'Equipos']))}<span class="rg-range"><input type="number" min="0" max="20" data-f="teamsMin" value="${esc(filters.teamsMin)}" placeholder="min"> – <input type="number" min="0" max="20" data-f="teamsMax" value="${esc(filters.teamsMax)}" placeholder="max"></span></label>
          <label>${esc(t(['Type d’équipe / d’aéronef', 'Team / aircraft type', 'Team- / Luftfahrzeugtyp', 'Tipo de equipo / aeronave']))}<input list="rgTeamTypes" data-f="teamType" value="${esc(filters.teamType)}"><datalist id="rgTeamTypes">${teamTypes.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
          <label>${esc(t(['Ravitaillement en vol', 'Air refuelling', 'Luftbetankung', 'Reabastecimiento']))}<select data-f="aar">${opt('', t(['indifférent', 'any']), filters.aar)}${opt('yes', t(['oui', 'yes', 'ja', 'sí']), filters.aar)}${opt('no', t(['non', 'no', 'nein', 'no']), filters.aar)}</select></label>
          <label>${esc(t(['Théâtre', 'Theatre', 'Schauplatz', 'Teatro']))}<select data-f="theatre">${opt('', t(['tous', 'all']), filters.theatre)}${uniq(reg.missions.map(m => m.theatre)).map(x => opt(x, x, filters.theatre)).join('')}</select></label>
          <label>${esc(t(['Statut', 'Status', 'Status', 'Estado']))}<select data-f="status">${opt('', t(['tous', 'all']), filters.status)}${Object.keys(STATUS).map(k => opt(k, t(STATUS[k]), filters.status)).join('')}</select></label>
          <label>${esc(t(['Recherche', 'Search', 'Suche', 'Buscar']))}<input type="search" data-f="q" value="${esc(filters.q)}"></label>
        </div>
        <p class="row"><button type="button" class="primary" id="rgDraw" data-icon="sparkles" ${rows.length ? '' : 'disabled'}>${esc(t(['Tirer au sort ({n})', 'Draw at random ({n})', 'Zufällig wählen ({n})', 'Sortear ({n})'], { n: rows.length }))}</button><button type="button" class="secondary" id="rgReset">${esc(t(['Effacer les filtres', 'Clear filters', 'Filter löschen', 'Borrar filtros']))}</button><button type="button" class="secondary" id="rgCsv" data-icon="download">CSV</button></p>
        <div id="rgTable"></div>
        <div id="rgDetail"></div>
      </section>
      <section data-block-id="order" data-icon="send" data-subtitle="${esc(t(['Nouvelle mission à générer : paramètres choisis, prompt ChatGPT réglé, entrée « commandée » rapprochée ensuite du fichier généré', 'New mission to generate: chosen parameters, tuned ChatGPT prompt, “ordered” entry matched later with the generated file']))}">
        <h2>${esc(t(['Commander une mission', 'Order a mission', 'Mission bestellen', 'Encargar una misión']))}</h2>
        ${orderForm(fam)}
      </section>`;
    // dossier
    const fb = host.querySelector('#rgFolder');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary'; b.dataset.icon = 'folder';
    b.onclick = async () => { try { await window.FileAccess.pickFolder('__missions'); await doScan(); } catch (e) { if (e?.name !== 'AbortError' && e?.message !== 'Dossier refusé') alert(e.message); } };
    waitFor('FileAccess').then(FA => FA?.decorate(b, '__missions'));
    const sb = document.createElement('button'); sb.type = 'button'; sb.className = 'primary'; sb.dataset.icon = 'refresh'; sb.textContent = t(['Relire le dossier', 'Re-read folder', 'Ordner neu lesen', 'Releer la carpeta']);
    sb.onclick = doScan;
    // ajout de fichiers (tout navigateur) : sélection de missionNN.yaml / summaryNN.md, ou d'un dossier de série
    const ab = document.createElement('label'); ab.className = 'rg-file'; ab.textContent = t(['Ajouter des fichiers…', 'Add files…', 'Dateien hinzufügen…', 'Añadir archivos…']);
    ab.innerHTML += '<input type="file" multiple accept=".yaml,.yml,.md" hidden data-picker-folder="__missions">';
    ab.querySelector('input').onchange = async e => { const list = [...e.target.files]; e.target.value = ''; try { const n = await addFiles(list); msg = pill('generated', t(['{n} mission(s) ajoutée(s)', '{n} mission(s) added'], { n })); } catch (err) { msg = pill('cancelled', err.message); } render(); };
    fb.append(ab);
    const wb = document.createElement('button'); wb.type = 'button'; wb.className = 'secondary'; wb.dataset.icon = 'save'; wb.textContent = t(['Écrire mission_registry.yaml', 'Write mission_registry.yaml']);
    wb.onclick = async () => { try { msg = (await writeFile(true)) ? pill('generated', t(['mission_registry.yaml écrit', 'mission_registry.yaml written'])) : pill('ordered', t(['dossier non autorisé', 'folder not authorised'])); } catch (e) { msg = pill('cancelled', e.message); } render(); };
    fb.append(b, sb, wb);
    // filtres
    host.querySelectorAll('[data-f]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      filters[el.dataset.f] = el.value;
      if (el.dataset.f === 'type') filters.subtype = '';
      writeJson(FILTERS, filters);
      if (el.tagName === 'SELECT') render(); else { refreshTable(); }
    }));
    host.querySelector('#rgReset').onclick = () => { filters = { ...DEFAULT_FILTERS }; writeJson(FILTERS, filters); render(); };
    host.querySelector('#rgDraw').onclick = () => { const r = reg.missions.filter(matches); if (r.length) { selected = keyOf(r[Math.floor(Math.random() * r.length)]); renderDetail(); document.getElementById('rgDetail')?.scrollIntoView({ block: 'nearest' }); } };
    host.querySelector('#rgCsv').onclick = exportCsv;
    bindOrder(fam);
    refreshTable();
    renderDetail();
    window.AppFramework?.refresh?.();
  }
  const COLUMNS = () => [
    { key: 'id', label: t(['Mission', 'Mission', 'Mission', 'Misión']), sortValue: m => `${String(m.series).padStart(3, '0')}${String(m.id).padStart(6, '0')}` },
    { key: 'type', label: t(['Type', 'Type', 'Typ', 'Tipo']) },
    { key: 'subtype', label: t(['Sous-type', 'Subtype', 'Untertyp', 'Subtipo']) },
    { key: 'title', label: t(['Titre', 'Title', 'Titel', 'Título']), html: (v, m) => `${esc(String(v || '').slice(0, 70))}${m.missingFile ? ' <span class="rg-pill rg-cancelled">fichier absent</span>' : ''}` },
    { key: 'teamCount', label: t(['Équipes', 'Teams', 'Teams', 'Equipos']), type: 'number' },
    { key: 'teamTypes', label: t(['Types', 'Types', 'Typen', 'Tipos']), format: (v, m) => [...m.aircraftTypes, ...v].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3).join(', '), sortValue: m => m.teamTypes.join(',') },
    { key: 'rdv', label: 'RDV', type: 'number' },
    { key: 'aar', label: 'AAR', format: v => v ? '✓' : '' },
    { key: 'theatre', label: t(['Théâtre', 'Theatre', 'Schauplatz', 'Teatro']) },
    { key: 'status', label: t(['Statut', 'Status', 'Status', 'Estado']), html: v => pill(v, t(STATUS[v] || [v])) },
    { key: 'generatedAt', label: t(['Généré', 'Generated', 'Erzeugt', 'Generada']), format: v => fmtDate(v), sortValue: m => m.generatedAt || m.addedAt || '' }
  ];
  function refreshTable() {
    const rows = reg.missions.filter(matches);
    const box = host.querySelector('#rgTable');
    if (!box) return;
    if (!window.SortedTable) { box.textContent = 'mission_table.js'; return; }
    table = window.SortedTable.render(box, {
      rows, columns: COLUMNS(), defaultSortKey: 'id', defaultDir: 1,
      emptyText: reg.missions.length ? t(['Aucune mission ne correspond aux filtres.', 'No mission matches the filters.']) : t(['Registre vide : choisir le dossier « Missions » puis « Relire le dossier ».', 'Empty registry: choose the “Missions” folder then “Re-read folder”.']),
      onRowClick: m => { selected = keyOf(m); renderDetail(); },
      onDelete: m => { reg.missions = reg.missions.filter(x => keyOf(x) !== keyOf(m)); if (selected === keyOf(m)) selected = null; persist(); render(); return true; },
      deleteMessage: m => t(['Retirer « {m} » du registre ? (les fichiers ne sont pas supprimés)', 'Remove “{m}” from the registry? (files are not deleted)'], { m: `${m.id} ${m.title}` })
    });
    const draw = host.querySelector('#rgDraw');
    if (draw) { draw.disabled = !rows.length; draw.textContent = t(['Tirer au sort ({n})', 'Draw at random ({n})', 'Zufällig wählen ({n})', 'Sortear ({n})'], { n: rows.length }); }
  }
  function renderDetail() {
    const box = host.querySelector('#rgDetail');
    const m = reg.missions.find(x => keyOf(x) === selected);
    if (!box) return;
    if (!m) { box.innerHTML = ''; return; }
    const teams = m.teams.map(tm => `<li><b>${esc(tm.name)}</b> — ${esc(tm.type)}${tm.service ? `, ${esc(tm.service)}` : ''}${tm.role ? ` <span class="rg-small">(${esc(tm.role)})</span>` : ''}</li>`).join('');
    box.innerHTML = `<div class="repo-card rg-detail" data-icon="target" data-subtitle="${esc(`${m.type}${m.subtype ? ' / ' + m.subtype : ''} — ${m.folder || t(['commande', 'order'])}`)}">
      <h3>${esc(m.id)} — ${esc(m.title || t(['(à générer)', '(to generate)']))}</h3>
      <p>${pill(m.status, t(STATUS[m.status] || [m.status]))} ${m.operation?.name ? `${esc(t(['Opération', 'Operation']))} : <b>${esc(m.operation.name)}</b>${m.operation.missions ? ` (${m.operation.missions} ${esc(t(['missions', 'missions']))})` : ''}` : ''} ${m.report ? pill('reported', `CR ${m.report.missionId} ${fmtDate(m.report.date)}`) : ''}</p>
      <p>${esc(m.origin)}${m.destination ? ' → ' + esc(m.destination) : ''} · ${esc(t(['{n} rendez-vous', '{n} rendezvous'], { n: m.rdv }))} · ${m.aar ? 'AAR · ' : ''}${esc(m.theatre || '')} · ${esc(t(['{n} carte(s)', '{n} map(s)'], { n: m.maps || 0 }))}</p>
      ${m.callsigns?.length ? `<p>${esc(t(['Indicatifs', 'Callsigns']))} : ${esc(m.callsigns.join(', '))} · ${esc(m.aircraftTypes.join(', '))}</p>` : ''}
      ${teams ? `<ul class="rg-teams">${teams}</ul>` : ''}
      ${m.request ? `<p class="rg-small">${esc(t(['Commande', 'Order']))} : ${esc(Object.entries(m.request).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k} = ${v}`).join(' · '))}</p>` : ''}
      <div class="rg-edit">
        <label>${esc(t(['Statut', 'Status']))}<select id="rgStatus">${Object.keys(STATUS).map(k => `<option value="${k}" ${m.status === k ? 'selected' : ''}>${esc(t(STATUS[k]))}</option>`).join('')}</select></label>
        <label>${esc(t(['Volée le', 'Flown on', 'Geflogen am', 'Volada el']))}<input type="date" id="rgFlown" value="${esc(m.flownAt || '')}"></label>
        <label class="rg-notes">${esc(t(['Notes', 'Notes', 'Notizen', 'Notas']))}<input id="rgNotes" value="${esc(m.notes || '')}"></label>
      </div>
      <p class="row">${m.files?.length ? `<button type="button" class="primary" data-go="editor" data-icon="edit">${esc(t(['Ouvrir dans le générateur', 'Open in generator', 'Im Generator öffnen', 'Abrir en el generador']))}</button><button type="button" class="secondary" data-go="studio" data-icon="map">${esc(t(['Ouvrir dans le studio', 'Open in map studio', 'Im Kartenstudio öffnen', 'Abrir en el estudio']))}</button><button type="button" class="secondary" data-go="cr" data-icon="clipboard">${esc(t(['Créer le CR', 'Create report', 'Bericht erstellen', 'Crear informe']))}</button>` : ''}${m.status === 'ordered' ? `<button type="button" class="secondary" data-go="prompt" data-icon="send">${esc(t(['Recopier le prompt', 'Copy prompt again']))}</button>` : ''}<span class="rg-small">${esc((m.files || []).join(', '))}</span></p>
      <p class="rg-small" id="rgGoMsg"></p></div>`;
    box.querySelector('#rgStatus').onchange = e => { m.status = e.target.value; m.statusAt = new Date().toISOString(); if (m.status === 'flown' && !m.flownAt) m.flownAt = new Date().toISOString().slice(0, 10); persist(); render(); };
    box.querySelector('#rgFlown').onchange = e => { m.flownAt = e.target.value; if (m.flownAt && ['generated', 'planned', 'ordered'].includes(m.status)) m.status = 'flown'; persist(); render(); };
    box.querySelector('#rgNotes').onchange = e => { m.notes = e.target.value; persist(); };
    box.querySelectorAll('[data-go]').forEach(x => x.onclick = () => go(m, x.dataset.go));
    window.AppFramework?.refresh?.();
  }
  /** Ouvre la mission : générateur / studio (mission partagée), CR (passerelle ?from=sia), prompt de commande. */
  async function go(m, where) {
    const out = document.getElementById('rgGoMsg');
    try {
      if (where === 'prompt') { await sendPrompt(m.request); return; }
      const dir = await missionsDir(true);
      if (!dir) throw new Error(t(['dossier des missions non autorisé', 'missions folder not authorised']));
      let h = dir;
      for (const part of (m.folder || '').split('/').filter(Boolean)) h = await h.getDirectoryHandle(part);
      const files = [];
      for (const name of m.files) { try { const f = await (await h.getFileHandle(name)).getFile(); files.push({ name, text: await f.text() }); } catch { /* absent */ } }
      if (!files.length) throw new Error(t(['fichiers de la mission introuvables', 'mission files not found']));
      if (where === 'cr') {
        const doc = window.SiaMission.fromTexts(files);
        const family = window.MissionVocab.familyForType(doc.yaml?.mission?.type), target = window.MissionVocab.families.find(f => f.id === family);
        localStorage.setItem('siaMissionToCr:v1', JSON.stringify(doc.yaml));
        if (['generated', 'planned', 'flown'].includes(m.status)) { m.status = 'flown'; m.flownAt = m.flownAt || new Date().toISOString().slice(0, 10); persist(); }
        location.href = new URL(`CR DEFA/${target.cr}?from=sia`, window.RepositoryNav.root).href;
        return;
      }
      window.SiaMission.importTexts(files, 'registry');
      if (m.status === 'generated') { m.status = 'planned'; m.statusAt = new Date().toISOString(); persist(); }
      location.href = new URL(where === 'studio' ? 'SIA XML/map_parser.html' : 'SIA XML/mission_editor.html', window.RepositoryNav.root).href;
    } catch (e) { if (out) out.textContent = e.message; }
  }

  // ---- commande d'une mission (prompt de génération réglé)
  const TEAM_PRESETS = ['A400M', 'C-130J', 'CASA CN235', 'A330 MRTT', 'E-3F', 'Rafale', 'Falcon 50M', 'Atlantique 2', 'Dash 8 (Milan)', 'CL-415', 'H225 Caracal', 'NH90', 'EC145 (Dragon)', 'H160', 'AS365 Dauphin', 'Beech 200 / TBM', 'drone', 'équipe au sol'];
  const THEATRE_LIST = ['aléatoire', 'métropole', 'Corse', 'Antilles', 'Guyane', 'Réunion', 'Mayotte', 'Nouvelle-Calédonie', 'Polynésie'];
  let order = { type: 'aléatoire', subtype: 'libre', theatre: 'aléatoire', theatre2: '', serie: '', teams: 2, teamTypes: [], teamTypesFree: '', rdv: 'libre', ground: 'libre', aar: 'libre', note: '', ...readJson('missionRegistryOrder:v1', {}) };
  function orderForm(fam) {
    const f = fam.find(x => x.id === order.type);
    const nextSerie = order.serie || suggestedSerie();
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
    return `<div class="rg-filters">
      <label>${esc(t(['Type', 'Type']))}<select data-o="type">${opt('aléatoire', t(['aléatoire', 'random']), order.type)}${fam.map(x => opt(x.id, `${x.id} — ${x.label}`, order.type)).join('')}</select></label>
      <label>${esc(t(['Sous-type', 'Subtype']))}<select data-o="subtype" ${f ? '' : 'disabled'}>${opt('libre', t(['libre', 'free']), order.subtype)}${(f?.subtypes || []).map(x => opt(x, x, order.subtype)).join('')}</select></label>
      <label>${esc(t(['Théâtre', 'Theatre']))}<select data-o="theatre">${THEATRE_LIST.map(x => opt(x, x, order.theatre)).join('')}</select></label>
      <label>${esc(t(['Second théâtre', 'Second theatre']))}<select data-o="theatre2">${opt('', '—', order.theatre2)}${THEATRE_LIST.slice(1).map(x => opt(x, x, order.theatre2)).join('')}</select></label>
      <label>${esc(t(['Série', 'Series']))}<input type="number" min="1" max="9" data-o="serie" value="${esc(order.serie || nextSerie)}"></label>
      <label>${esc(t(['Équipes DEFA en vol', 'DEFA flying teams']))}<input type="number" min="1" max="5" data-o="teams" value="${esc(order.teams)}"></label>
      <label>${esc(t(['Rendez-vous', 'Rendezvous']))}<select data-o="rdv">${opt('libre', t(['libre', 'free']), order.rdv)}${opt('avec', t(['avec', 'with']), order.rdv)}${opt('sans', t(['sans', 'without']), order.rdv)}</select></label>
      <label>${esc(t(['Équipes au sol', 'Ground teams']))}<select data-o="ground">${opt('libre', t(['libre', 'free']), order.ground)}${[0, 1, 2, 3].map(n => opt(n, n, order.ground)).join('')}</select></label>
      <label>${esc(t(['Ravitaillement en vol', 'Air refuelling']))}<select data-o="aar">${opt('libre', t(['libre', 'free']), order.aar)}${opt('oui', t(['oui', 'yes']), order.aar)}${opt('non', t(['non', 'no']), order.aar)}</select></label>
    </div>
    <p><b>${esc(t(['Types d’équipes / d’aéronefs (dans l’ordre des équipes A, B, C…)', 'Team / aircraft types (in team order A, B, C…)']))}</b></p>
    <div class="rg-chips">${TEAM_PRESETS.map(x => `<label class="rg-chip"><input type="checkbox" data-team="${esc(x)}" ${order.teamTypes.includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</div>
    <p class="row"><label class="rg-grow">${esc(t(['Autres (séparés par « + »)', 'Others (separated by “+”)']))}<input data-o="teamTypesFree" value="${esc(order.teamTypesFree)}"></label></p>
    <p class="row"><button type="button" class="primary" id="rgOrder" data-icon="send">${esc(t(['Commander : copier le prompt et ouvrir ChatGPT', 'Order: copy prompt and open ChatGPT', 'Bestellen: Prompt kopieren und ChatGPT öffnen', 'Encargar: copiar el prompt y abrir ChatGPT']))}</button><span class="rg-small" id="rgOrderMsg"></span></p>
    <p class="rg-small">${esc(t(['La mission apparaît dans le registre avec le statut « commandée » ; enregistrer ensuite missionNN.yaml et summaryNN.md dans le dossier Missions (sous-dossier de la série) et « Relire le dossier » : la commande est rapprochée de la mission générée (même série).', 'The mission appears as “ordered”; then save missionNN.yaml and summaryNN.md into the Missions folder (series sub-folder) and “Re-read folder”: the order is matched with the generated mission (same series).']))}</p>`;
  }
  /** Série proposée : la suivante des séries du registre (1 à 9). */
  const suggestedSerie = () => Math.min(9, Math.max(0, ...reg.missions.map(m => +m.series || 0)) + 1);
  function teamTypesValue() {
    return [...order.teamTypes, ...String(order.teamTypesFree || '').split('+').map(s => s.trim()).filter(Boolean)].join(' + ');
  }
  function bindOrder() {
    host.querySelectorAll('[data-o]').forEach(el => el.addEventListener('change', () => {
      order[el.dataset.o] = el.type === 'number' ? el.value : el.value;
      if (el.dataset.o === 'type') order.subtype = 'libre';
      writeJson('missionRegistryOrder:v1', order);
      if (el.dataset.o === 'type') render();
    }));
    host.querySelectorAll('[data-team]').forEach(el => el.onchange = () => {
      const s = new Set(order.teamTypes);
      el.checked ? s.add(el.dataset.team) : s.delete(el.dataset.team);
      order.teamTypes = TEAM_PRESETS.filter(x => s.has(x));
      writeJson('missionRegistryOrder:v1', order);
    });
    host.querySelector('#rgOrder').onclick = async () => {
      const request = { type: order.type, subtype: order.subtype, theatre: [order.theatre, order.theatre2].filter((v, i, a) => v && a.indexOf(v) === i).join(' + '), serie: +order.serie || suggestedSerie(), teams: Math.max(1, Math.min(5, +order.teams || 1)), teamTypes: teamTypesValue() || 'libre', rdv: order.rdv, ground: order.ground, aar: order.aar };
      reg.missions.push({ id: String(request.serie * 10 + 1), series: request.serie, type: request.type === 'aléatoire' ? '' : request.type, family: '', subtype: request.subtype === 'libre' ? '' : request.subtype, title: '', teams: [], teamCount: 0, teamTypes: request.teamTypes === 'libre' ? [] : request.teamTypes.split(' + '), aircraftTypes: [], callsigns: [], rdv: request.rdv === 'avec' ? 1 : 0, aar: request.aar === 'oui', theatre: order.theatre === 'aléatoire' ? '' : order.theatre, origin: '', destination: '', maps: 0, folder: '', files: [], source: 'commande', status: 'ordered', statusAt: new Date().toISOString(), addedAt: new Date().toISOString(), request, notes: '' });
      persist();
      await sendPrompt(request);
      render();
    };
  }
  /** Prompt de génération réglé (paramètres en tête du bloc de docs/PROMPT_GENERATEUR_MISSIONS.md) copié, puis ChatGPT ouvert. */
  async function sendPrompt(r) {
    const out = document.getElementById('rgOrderMsg') || document.getElementById('rgGoMsg');
    const base = window.MISSION_PROMPT;
    if (!base) { if (out) out.textContent = 'mission_prompt.js'; return; }
    const set = (txt, key, val) => txt.replace(new RegExp(`^(\\s*${key}\\s*=\\s*)\\S+`, 'm'), (_, a) => a + String(val).replace(/\$/g, '$$$$'));
    let p = base;
    p = set(p, 'TYPE', r.type); p = set(p, 'SERIE', r.serie); p = set(p, 'NOMBRE_MISSIONS', 1); p = set(p, 'THÉÂTRE', r.theatre || 'aléatoire'); p = set(p, 'ÉQUIPES_DEFA', r.teams);
    p = set(p, 'SOUS_TYPE', r.subtype || 'libre'); p = set(p, 'RENDEZ_VOUS', r.rdv || 'libre'); p = set(p, 'TYPES_EQUIPES', r.teamTypes || 'libre'); p = set(p, 'ÉQUIPES_SOL', r.ground ?? 'libre'); p = set(p, 'RAVITAILLEMENT', r.aar || 'libre');
    let copied = false;
    try { await navigator.clipboard.writeText(p); copied = true; } catch { /* refus */ }
    window.open(p.length < 7000 ? `https://chatgpt.com/?q=${encodeURIComponent(p)}` : 'https://chatgpt.com/', '_blank', 'noopener');
    if (out) out.textContent = copied ? t(['Prompt copié ({n} caractères) : dans ChatGPT, coller (Ctrl+V) puis envoyer.', 'Prompt copied ({n} characters): paste it in ChatGPT (Ctrl+V) and send.'], { n: p.length.toLocaleString() }) : t(['Copie refusée par le navigateur.', 'Copy refused by the browser.']);
    window.__lastRegistryPrompt = p;   // contrôle (tests)
  }

  function exportCsv() {
    const cols = ['id', 'series', 'type', 'subtype', 'title', 'teamCount', 'teamTypes', 'aircraftTypes', 'callsigns', 'rdv', 'aar', 'theatre', 'origin', 'destination', 'status', 'flownAt', 'folder', 'notes'];
    const cell = v => { const s = Array.isArray(v) ? v.join(' + ') : String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const text = '﻿' + [cols.join(';'), ...reg.missions.filter(matches).map(m => cols.map(c => cell(m[c])).join(';'))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'registre_missions.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function doScan() {
    msg = t(['Lecture du dossier…', 'Reading folder…']);
    const box = host.querySelector('#rgMsg'); if (box) box.textContent = msg;
    try {
      const r = await scan(true);
      msg = pill('generated', t(['{n} mission(s) lue(s)', '{n} mission(s) read'], { n: r.found })) + (r.problems.length ? `<br><span class="rg-small">${esc(r.problems.join(' · '))}</span>` : '');
    } catch (e) { msg = pill('cancelled', e.message); }
    render();
  }

  window.addEventListener('repository-language-change', render);
  window.addEventListener('local-store-restored', () => { reg = readJson(KEY, null) || empty(); render(); });
  window.addEventListener('storage', e => { if (e.key === KEY) { reg = readJson(KEY, null) || empty(); render(); } });
  window.MissionRegistry = { scan, addFiles, entryOf, families, theatreOf, get: () => reg, sendPrompt, matches: m => matches(m), setFilters: f => { filters = { ...DEFAULT_FILTERS, ...f }; render(); } };
  (async () => {
    await waitFor('jsyaml', 3000);
    linkReports();
    render();
    // relecture silencieuse si le dossier est déjà autorisé
    if (await missionsDir(false)) doScan();
  })();
})();
