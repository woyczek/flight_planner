(() => {
  'use strict';
  // Composant « Airac » : cycles AIRAC et état des données SIA, pour Paramètres › Maintenance et le contrôle de
  // mise à jour (suite_update.js).
  //   · Airac.cycle(date) / next(date) / fromDate('2026-10-01') → { date, ident: '2610', label: '10/26', start, end } :
  //     cycles de 28 jours (référence 25 janvier 2024 = AIRAC 2401) ;
  //   · Airac.inspectFolder(fichiers) : rôle et cycle des fichiers d'un dossier SIA XML (AIXM 4.5, XML-SIA,
  //     ancien sia-airspaces, ZIP d'export du SIA…), cycles présents, complets ou non, anciens cycles ;
  //   · Airac.baseSummary() : résumé de la base analysée par le studio (IndexedDB « sia-map-parser », lecture
  //     seule) ; Airac.info() / remember() : résumé léger gardé dans localStorage (siaBaseInfo:v1) ;
  //   · Airac.moraFromObstacles(csv, obstacleMax, cycle) : recalcul simple de la grille MORA (relief du mora.csv
  //     existant + obstacles de l'AIXM du nouveau cycle), sans réseau.
  const DAY = 864e5, CYCLE = 28 * DAY, REF = Date.UTC(2024, 0, 25);   // AIRAC 2401
  const INFO = 'siaBaseInfo:v1';
  const iso = t => new Date(t).toISOString().slice(0, 10);
  /** Instant UTC (minuit) d'une date « AAAA-MM-JJ », d'un Date ou d'un nombre ; aujourd'hui par défaut. */
  function dayOf(d) {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
    const x = d == null ? new Date() : new Date(d);
    return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  }
  /** Cycle commençant à l'instant start (UTC). */
  function describe(start) {
    const y = new Date(start).getUTCFullYear(),
      first = REF + Math.ceil((Date.UTC(y, 0, 1) - REF) / CYCLE) * CYCLE,
      num = Math.round((start - first) / CYCLE) + 1,
      yy = String(y).slice(2);
    return {
      date: iso(start),
      start,
      end: start + CYCLE,
      until: iso(start + CYCLE - DAY),
      ident: yy + String(num).padStart(2, '0'),
      label: `${String(num).padStart(2, '0')}/${yy}`,
      // page du SIA de ce cycle (« Données aéronautiques XML AIRAC 10/26 »)
      url: (window.RepositoryNav?.source?.('siaCycle') || 'https://www.sia.aviation-civile.gouv.fr/donnees-aeronautiques-xml-airac-{nn}-{yy}.html').replace('{nn}', String(num).padStart(2, '0')).replace('{yy}', yy)
    };
  }
  /** Cycle en vigueur à la date d (défaut : aujourd'hui). */
  const cycle = d => describe(REF + Math.floor((dayOf(d) - REF) / CYCLE) * CYCLE);
  /** Cycle suivant celui en vigueur à la date d. */
  const next = d => describe(cycle(d).start + CYCLE);
  /** Cycle qui commence à la date donnée (« 2026-10-01 ») ; null si ce n'est pas une date de cycle. */
  function fromDate(date) {
    if (!date) return null;
    const t = dayOf(date);
    return (t - REF) % CYCLE === 0 ? describe(t) : null;
  }
  /** Cycle d'un nom de fichier (date AAAA-MM-JJ qu'il contient) ; null sinon. */
  const cycleOfName = name => fromDate(/(\d{4}-\d{2}-\d{2})/.exec(String(name || ''))?.[1]);

  // ---- fichiers du dossier SIA XML
  const ROLES = [
    { id: 'aixm', re: /^AIXM4\.5_all_FR_OM_(\d{4}-\d{2}-\d{2})\.xml$/i, need: true, label: ['AIXM 4.5 complet (espaces, aérodromes, balises, obstacles)', 'Full AIXM 4.5 (airspace, aerodromes, navaids, obstacles)'] },
    { id: 'xmlsia', re: /^XML_SIA_(\d{4}-\d{2}-\d{2})\.xml$/i, need: true, label: ['Export XML-SIA (inventaire)', 'XML-SIA export (inventory)'] },
    { id: 'airspaces', re: /^sia-airspaces-(\d{4}-\d{2}-\d{2})\.xml$/i, need: false, label: ['Contours dérivés (ancien format, facultatif : les contours sont lus dans XML-SIA)', 'Derived outlines (legacy, optional: outlines are read from XML-SIA)'] },
    { id: 'zip', re: /^export_xml_bd_SIA_(\d{4}-\d{2}-\d{2})(?:-v(\d+))?\.zip$/i, need: false, label: ['ZIP d’export du SIA (à extraire)', 'SIA export ZIP (to extract)'] }
  ];
  const FIXED = [
    { id: 'mora', name: 'mora.csv', label: ['Grille MORA calculée', 'Computed MORA grid'] },
    { id: 'tracks', name: 'miam-enr-5-7-tracks.xml', label: ['Axes AAR nommés (ENR 5.7)', 'Named AAR tracks (ENR 5.7)'] },
    { id: 'coords', name: 'miam-enr-5-7-coordinates.xml', label: ['Coordonnées ENR 5.7 d’origine', 'Original ENR 5.7 coordinates'] },
    { id: 'readme', name: 'Lisez_moi.txt', label: ['Lisez-moi du SIA (nouveautés du BMJ)', 'SIA read-me (BMJ changes)'] }
  ];
  /** Inventaire d'un dossier SIA XML (fichiers [{ name, size, lastModified }]) : { files, cycles, latest, complete, old, fixed, zips }. */
  function inspectFolder(files) {
    const list = [...(files || [])].map(f => ({ name: f.name, size: f.size || 0, lastModified: f.lastModified || 0, file: f }));
    const byCycle = new Map(), zips = [];
    for (const f of list) {
      const role = ROLES.find(r => r.re.test(f.name));
      if (!role) continue;
      const m = role.re.exec(f.name), c = fromDate(m[1]);
      const entry = { ...f, role: role.id, cycle: c?.date || m[1], version: m[2] ? +m[2] : null, valid: !!c };
      if (role.id === 'zip') { zips.push(entry); continue; }
      if (!byCycle.has(entry.cycle)) byCycle.set(entry.cycle, []);
      byCycle.get(entry.cycle).push(entry);
    }
    const cycles = [...byCycle.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
      const roles = new Set(items.map(i => i.role));
      return { date, cycle: fromDate(date), items, missing: ROLES.filter(r => r.need && !roles.has(r.id)).map(r => r.id), complete: ROLES.filter(r => r.need).every(r => roles.has(r.id)) };
    });
    const fixed = FIXED.map(x => ({ ...x, file: list.find(f => f.name.toLowerCase() === x.name.toLowerCase()) || null }));
    return { files: list, cycles, latest: cycles[0] || null, old: cycles.slice(1), complete: !!cycles[0]?.complete, fixed, zips: zips.sort((a, b) => b.cycle.localeCompare(a.cycle) || (b.version || 0) - (a.version || 0)) };
  }
  /** Fichiers (File) d'un dossier autorisé, sans descendre dans les sous-dossiers ; [] sans accès. */
  async function filesOf(handle) {
    const out = [];
    if (!handle) return out;
    for await (const [name, h] of handle.entries()) if (h.kind === 'file') try { out.push(await h.getFile()); } catch { /* verrouillé */ }
    return out;
  }

  // ---- base du studio (IndexedDB « sia-map-parser », magasin cache, clé base) — lecture seule
  /** Base analysée par le studio cartographique ; null si absente (la base n'est jamais créée ici). */
  async function base() {
    try {
      if (indexedDB.databases && !(await indexedDB.databases()).some(d => d.name === 'sia-map-parser')) return null;
    } catch { /* API absente : on tente l'ouverture */ }
    return new Promise(resolve => {
      const r = indexedDB.open('sia-map-parser');
      r.onupgradeneeded = () => { r.transaction.abort(); resolve(null); };   // n'existait pas : ne rien créer
      r.onerror = () => resolve(null);
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('cache')) { db.close(); return resolve(null); }
        const q = db.transaction('cache').objectStore('cache').get('base');
        q.onsuccess = () => { db.close(); resolve(q.result || null); };
        q.onerror = () => { db.close(); resolve(null); };
      };
    });
  }
  /** Purge la base mémorisée du studio (magasin vidé, pas de suppression de la base : jamais bloquée par un onglet ouvert)
   *  et le résumé siaBaseInfo:v1. Résout true si quelque chose a été purgé. */
  async function purgeBase() {
    const had = !!(await base());
    await new Promise(resolve => {
      const r = indexedDB.open('sia-map-parser');
      r.onupgradeneeded = () => { r.transaction.abort(); resolve(); };
      r.onerror = () => resolve();
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('cache')) { db.close(); return resolve(); }
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').clear();
        tx.oncomplete = tx.onerror = () => { db.close(); resolve(); };
      };
    });
    try { localStorage.removeItem('siaBaseInfo:v1'); } catch { /* stockage indisponible */ }
    return had;
  }
  /** Met à jour des champs de la base du studio (ex. moraCells après un recalcul) ; faux si la base est absente. */
  async function patchBase(fields) {
    const b = await base();
    if (!b) return false;
    Object.assign(b, fields);
    return new Promise(resolve => {
      const r = indexedDB.open('sia-map-parser');
      r.onerror = () => resolve(false);
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').put(b, 'base');
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
      };
    });
  }
  /** Cycle d'une base du studio : champ airac, sinon date des noms de fichiers analysés (le plus récent). */
  function baseCycle(b) {
    if (!b) return null;
    if (b.airac) return fromDate(b.airac);
    const dates = (b.xmlInventoryData || []).map(x => /(\d{4}-\d{2}-\d{2})/.exec(x.name)?.[1]).filter(Boolean).sort();
    const cycles = [...new Set(dates)];
    return cycles.length ? Object.assign(fromDate(cycles[cycles.length - 1]) || { date: cycles[cycles.length - 1] }, { mixed: cycles.length > 1, all: cycles }) : null;
  }
  /** Résumé d'une base : cycle, date, nombres (espaces par type, aérodromes, balises, villes, cellules MORA, cellules d'obstacles), noms d'espaces. */
  function summarize(b) {
    if (!b) return null;
    const types = {};
    for (const a of b.airspaces || []) types[a.type || '?'] = (types[a.type || '?'] || 0) + 1;
    const aero = b.aero || {};
    const count = v => Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0;
    const c = baseCycle(b);
    return {
      parserVersion: b.parserVersion,
      folderName: b.folderName || '',
      cachedAt: b.cachedAt || 0,
      airac: c?.date || '',
      mixed: !!c?.mixed,
      cycles: c?.all || (c ? [c.date] : []),
      files: (b.xmlInventoryData || []).map(x => ({ name: x.name, role: x.role, mb: x.mb })),
      counts: {
        airspaces: (b.airspaces || []).length,
        byType: types,
        aerodromes: count(aero.aerodromes),
        navaids: count(aero.navaids || aero.navaid),
        cities: (b.cities || []).length,
        mora: (b.moraCells || []).length,
        obstacleCells: Object.keys(b.obstacleMax || {}).length
      },
      names: (b.airspaces || []).map(a => `${a.type || '?'}|${a.name || a.key || ''}`)
    };
  }
  /** Résumé de la base actuelle du studio (et mémorisation du résumé léger siaBaseInfo:v1). */
  async function baseSummary() {
    const s = summarize(await base());
    if (s) remember(s);
    return s;
  }
  /** Résumé léger mémorisé (siaBaseInfo:v1) : { airac, cachedAt, folderName, counts, checkedAt } ; lu par toutes les pages. */
  const info = () => { try { return JSON.parse(localStorage.getItem(INFO) || 'null'); } catch { return null; } };
  function remember(s) {
    if (!s) return;
    try {
      localStorage.setItem(INFO, JSON.stringify({ airac: s.airac, mixed: s.mixed, cachedAt: s.cachedAt, folderName: s.folderName, counts: { ...s.counts, byType: undefined }, checkedAt: new Date().toISOString() }));
    } catch { /* quota */ }
  }

  // ---- grille MORA : recalcul simple (obstacles d'un nouveau cycle, relief inchangé)
  const sup = s => String(s).replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
  /** Notation MORA « 3⁵ » (3500 ft), comme le studio. */
  const moraLabel = ft => { const h = Math.round(ft / 100); return Math.floor(h / 10) + sup(h % 10); };
  /** MORA (ft) d'une cellule : point le plus haut + 1000 ft (2000 ft au-delà de 5000 ft), à la centaine supérieure. */
  const moraOf = top => Math.ceil((top + (top > 5000 ? 2000 : 1000)) / 100) * 100;
  /** Lignes CSV (séparateur virgule, guillemets doubles). */
  function csvRows(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    const s = String(text).replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    return rows.filter(r => r.some(c => c !== ''));
  }
  const field = v => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  /** Recalcul du mora.csv avec les obstacles obstacleMax ({ 'lat|lon' : ft }, cellules 1°) d'un nouveau cycle ; le relief
   *  (terrain_ft) du fichier existant est conservé. Sortie : { csv, cells, changes: [{ lat, lon, before, after, obstacleBefore, obstacleAfter }], skipped }. */
  function moraFromObstacles(text, obstacleMax, cycleDate) {
    const rows = csvRows(text), head = (rows.shift() || []).map(h => h.trim().toLowerCase()), ix = n => head.indexOf(n);
    if (['lat', 'lon', 'mora_ft', 'terrain_ft'].some(n => ix(n) < 0)) throw new Error('mora.csv : colonnes lat, lon, mora_ft, terrain_ft requises (fichier produit par le studio).');
    if (ix('obstacle_ft') < 0) head.push('obstacle_ft');
    if (ix('source') < 0) head.push('source');
    const changes = [], cells = [];
    let skipped = 0;
    const tag = cycleDate ? ` — obstacles AIRAC ${cycleDate} (recalcul simple)` : '';
    const out = rows.map(r => {
      const lat = +r[ix('lat')], lon = +r[ix('lon')], terrain = +r[ix('terrain_ft')];
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(terrain)) { skipped++; return r; }
      const key = Math.floor(lat) + '|' + Math.floor(lon),
        obstBefore = +(r[ix('obstacle_ft')] || 0) || 0,
        obst = Math.round(obstacleMax?.[key] || 0),
        before = +r[ix('mora_ft')],
        after = moraOf(Math.max(terrain, obst));
      if (after !== before || obst !== Math.round(obstBefore)) changes.push({ lat, lon, before, after, obstacleBefore: Math.round(obstBefore), obstacleAfter: obst });
      const line = head.map((h, i) => r[i] ?? '');
      line[head.indexOf('mora')] = moraLabel(after);
      line[head.indexOf('mora_ft')] = after;
      line[head.indexOf('obstacle_ft')] = obst;
      const src = String(line[head.indexOf('source')] || '').replace(/ — obstacles AIRAC [\d-]+ \(recalcul simple\)$/, '');
      line[head.indexOf('source')] = src + tag;
      cells.push({ lat, lon, mora: moraLabel(after), moraFt: after, latStep: +r[ix('lat_step')] || 1, lonStep: +r[ix('lon_step')] || 1 });
      return line;
    });
    const csv = '﻿' + [head.join(','), ...out.map(r => r.map(field).join(','))].join('\r\n') + '\r\n';
    return { csv, cells, changes, skipped };
  }
  /** Cycle des obstacles d'un mora.csv (mention « obstacles AIRAC … » de la colonne source) ; '' si inconnu. */
  const moraCycle = text => /obstacles AIRAC (\d{4}-\d{2}-\d{2})/.exec(String(text || ''))?.[1] || '';

  window.Airac = { cycle, next, fromDate, cycleOfName, describe, ROLES, FIXED, inspectFolder, filesOf, base, patchBase, purgeBase, baseCycle, summarize, baseSummary, info, remember, moraFromObstacles, moraCycle, moraLabel, moraOf, csvRows };
})();
