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
  /** Échappe un texte pour HTML. */
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  /** Valeur JSON d'une clé du localStorage ; null si absente ou illisible. */
  const read = key => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  /** Écrit une valeur JSON dans le localStorage. */
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  /** Horodatage ISO courant. */
  const now = () => new Date().toISOString();
  /** Sérialisation JSON compacte (contenu des fichiers de données générés). */
  const dumps = v => JSON.stringify(v);
  const rows = [];
  // allemand et espagnol : table DataAdminI18n (shared/data_admin_i18n.js), repérée par le texte français ; sinon anglais
  // lignes déjà données au traducteur commun (une fois chacune) ; celles qui n'apparaissent qu'après le premier affichage
  // (sections ouvertes ensuite : « Enregistrer », « entrées »…) lui sont données par lot, sinon elles restaient en français
  const seen = new Set(),
    pending = [];
  let registered = false;
  /** Libellé source (français) ; sa ligne [fr, en, de, es] est notée une fois pour la traduction (de / es tirés de
   *  DataAdminI18n, sinon l'anglais) et, après le premier affichage, transmise par lot au traducteur commun. */
  const T = (fr, en) => {
    if (seen.has(fr)) return fr;
    seen.add(fr);
    const x = window.DataAdminI18n?.[fr],
      row = [fr, en, x?.[0] || en, x?.[1] || en];
    rows.push(row);
    if (registered && pending.push(row) === 1) queueMicrotask(() => window.RepositoryContentI18n?.(pending.splice(0)));
    return fr;
  };
  // sous-titre de la page Paramètres (« SO Group Virtual — … » : la couche de traduction traduit la partie après le tiret)
  T('bases de données (flotte, types, indicatifs, registres…) et maintenance (mises à jour, sources et dossiers, données SIA, sauvegarde)',
    'databases (fleet, types, callsigns, ledgers…) and maintenance (updates, sources and folders, SIA data, backup)');

  // ---- format commun des fichiers de données (identique à AircraftDB/datafile.py)
  /** Texte d'un fichier de données du dépôt, au format commun (identique à AircraftDB/datafile.py) : commentaire d'en-tête, méta (updatedAt), une ligne JSON par élément, clé de surcharge locale, variable exportée. */
  function render(commentLines, data, overrideKey, exportJs, updatedAt) {
    const parts = Object.entries(data).map(([key, value]) => Array.isArray(value) ?
      (value.length ? `  ${dumps(key)}: [\n${value.map(item => '    ' + dumps(item)).join(',\n')}\n  ]` : `  ${dumps(key)}: []`) :
      `  ${dumps(key)}: ${dumps(value)}`);
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
  /** Base IndexedDB « missionCore » (magasin handles) : dossiers autorisés. */
  // connexion partagée par la page (RepositoryKit.idb) : plus une ouverture par lecture
  const idb = () => window.RepositoryKit.idb('missionCore', 1, db => db.objectStoreNames.contains('handles') || db.createObjectStore(
    'handles'));
  /** Valeur d'une clé du magasin handles ; null si absente. */
  const idbGet = async key => {
    try {
      const db = await idb();
      return await new Promise(r => {
        const q = db.transaction('handles').objectStore('handles').get(key);
        q.onsuccess = () => r(q.result || null);
        q.onerror = () => r(null);
      });
    } catch {
      return null;
    }
  };
  /** Écrit une valeur dans le magasin handles. */
  const idbSet = async (key, value) => {
    const db = await idb();
    await new Promise(r => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(value, key);
      tx.oncomplete = r;
      tx.onerror = r;
    });
  };
  /** Dossier racine du dépôt (handle), autorisé en écriture ; request : le demande ou le fait choisir (contrôle : présence de repository_tree). null sans autorisation. */
  async function repo(request = true) {
    let handle = await idbGet('folder:__repo');
    if (handle) {
      let permission = await handle.queryPermission?.({
        mode: 'readwrite'
      });
      if (permission !== 'granted' && request) permission = await handle.requestPermission?.({
        mode: 'readwrite'
      });
      if (permission === 'granted') return handle;
      if (!request) return null;
    }
    if (!request) return null;
    if (window.FileAccess) return window.FileAccess.pickFolder('__repo');
    if (!window.showDirectoryPicker) throw new Error(T(
      'Écriture directe impossible dans ce navigateur (Chrome / Edge requis) : utilisez « Télécharger ».',
      'Direct writing unavailable in this browser (Chrome / Edge required): use “Download”.'));
    handle = await window.showDirectoryPicker({
      id: 'defa-repository',
      mode: 'readwrite'
    });
    try {
      await (await handle.getDirectoryHandle('config')).getFileHandle('repository_tree');
    } catch {
      if (!await window.AppFramework.ask(T('Ce dossier ne contient pas « config/repository_tree » : est-ce bien la racine du dépôt ?',
          'This folder has no “config/repository_tree”: is it really the repository root?'))) throw new Error(T('Dossier refusé',
        'Folder rejected'));
    }
    await idbSet('folder:__repo', handle);
    return handle;
  }
  /** Écrit un fichier du dépôt (chemin relatif, dossiers créés au besoin). */
  async function writeRepoFile(path, text) {
    let dir = await repo(true);
    const parts = path.split('/'),
      name = parts.pop();
    for (const part of parts) dir = await dir.getDirectoryHandle(part, {
      create: true
    });
    const writable = await (await dir.getFileHandle(name, {
      create: true
    })).createWritable();
    await writable.write(text);
    await writable.close();
  }
  /** Fait télécharger un fichier (à déposer à la main dans le dépôt). */
  const download = (name, text, type = 'text/javascript') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {
      type: `${type};charset=utf-8`
    }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ---- éditeur de tableau
  // colonnes : { key, label, type: text|number|bool|list|select, options?, width? }
  function grid(host, {
    columns,
    data,
    onChange
  }) {
    let filter = '',
      sort = {
        key: columns[0].key,
        dir: 1
      };
    // lignes montrées : PAGE d'abord, « Afficher les suivantes » ou « Tout afficher » ensuite (filtre et tri portent sur
    // toutes) — la flotte entière, champs et listes de choix compris, faisait plus de 5 000 éléments à l'ouverture
    const PAGE = 100;
    let limit = PAGE,
      opts = new Map(); // choix des colonnes « select », calculés une fois par dessin
    const optionsOf = col => opts.get(col) || opts.set(col, col.options()).get(col);
    /** HTML d'une cellule éditable selon le type de colonne (texte, nombre, case, liste, choix). */
    const cell = (col, row, index) => {
      const v = row[col.key],
        attrs = `data-row="${index}" data-key="${esc(col.key)}"`;
      if (col.type === 'bool') return `<input type="checkbox" ${attrs}${v ? ' checked' : ''}>`;
      if (col.type === 'select') return `<select ${attrs}>${['', ...optionsOf(col)].map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}${v && !optionsOf(col).includes(v) ? `<option selected>${esc(v)}</option>` : ''}</select>`;
      const value = col.type === 'list' ? (v || []).join(', ') : v ?? '';
      return `<input ${col.type === 'number' ? 'type="number" step="any" ' : ''}${attrs} value="${esc(value)}"${col.width ? ` style="min-width:${col.width}"` : ''}>`;
    };

    /** Redessine le tableau : lignes filtrées (texte de toutes les colonnes) et triées sur la colonne choisie. */
    function paint() {
      const text = filter.toLowerCase();
      opts = new Map();
      const tr = window.RepositoryKit?.tf || ((row, v) => String(row[0]).replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m));
      const order = data.map((row, index) => ({
          row,
          index
        }))
        .filter(({
          row
        }) => !text || columns.some(c => String(c.type === 'list' ? (row[c.key] || []).join(' ') : row[c.key] ?? '').toLowerCase()
          .includes(text)))
        .sort((a, b) => String(a.row[sort.key] ?? '').localeCompare(String(b.row[sort.key] ?? ''), undefined, {
          numeric: true
        }) * sort.dir);
      host.innerHTML = `<div class="da-grid-tools"><input type="search" class="da-filter" placeholder="${esc(T('Filtrer…', 'Filter…'))}" value="${esc(filter)}"><span class="small">${order.length} / ${data.length}</span><button type="button" class="secondary da-add">${esc(T('+ Ajouter une ligne', '+ Add row'))}</button></div>
        <div class="da-scroll"><table class="da-table"><thead><tr>${columns.map(c => `<th data-sort="${esc(c.key)}">${esc(c.label)} ${sort.key === c.key ? (sort.dir > 0 ? '▲' : '▼') : '↕'}</th>`).join('')}<th></th></tr></thead>
        <tbody>${order.slice(0, limit).map(({ row, index }) => `<tr>${columns.map(c => `<td>${cell(c, row, index)}</td>`).join('')}<td><button type="button" class="da-del" data-del="${index}" title="${esc(T('Supprimer la ligne', 'Delete row'))}">×</button></td></tr>`).join('')}</tbody></table></div>
        ${order.length > limit ? `<p class="row da-more-row"><span class="small">${esc(tr(['{n} lignes sur {t} affichées', '{n} of {t} rows shown', '{n} von {t} Zeilen angezeigt', '{n} de {t} filas mostradas'], { n: limit, t: order.length }))}</span><button type="button" class="secondary" data-more="${PAGE}">${esc(tr(['Afficher les {n} suivantes', 'Show the next {n}', 'Die nächsten {n} anzeigen', 'Mostrar las {n} siguientes'], { n: Math.min(PAGE, order.length - limit) }))}</button><button type="button" class="secondary" data-more="all">${esc(tr(['Tout afficher', 'Show all', 'Alle anzeigen', 'Mostrar todo'], {}))}</button></p>` : ''}`;
      host.querySelectorAll('[data-more]').forEach(b => b.onclick = () => {
        limit = b.dataset.more === 'all' ? Infinity : limit + PAGE;
        paint();
      });
      const box = host.querySelector('.da-filter');
      box.oninput = () => {
        filter = box.value;
        const pos = box.selectionStart;
        paint();
        const b = host.querySelector('.da-filter');
        b.focus();
        b.setSelectionRange(pos, pos);
      };
      host.querySelector('.da-add').onclick = () => {
        data.unshift(Object.fromEntries(columns.map(c => [c.key, c.type === 'list' ? [] : c.type === 'bool' ? false : ''])));
        filter = '';
        onChange();
        paint();
      };
      host.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => {
        sort = {
          key: th.dataset.sort,
          dir: sort.key === th.dataset.sort ? -sort.dir : 1
        };
        paint();
      });
      host.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        data.splice(Number(b.dataset.del), 1);
        onChange();
        paint();
      });
    }
    host.addEventListener('change', event => {
      const el = event.target,
        index = el.dataset?.row;
      if (index == null) return;
      const col = columns.find(c => c.key === el.dataset.key),
        row = data[Number(index)];
      row[col.key] = col.type === 'bool' ? el.checked : col.type === 'number' ? (el.value === '' ? null : Number(el.value)) : col
        .type === 'list' ? el.value.split(',').map(s => s.trim()).filter(Boolean) : col.upper ? el.value.trim().toUpperCase() : el
        .value;
      if (col.upper && el.value !== row[col.key]) el.value = row[col.key];
      onChange();
    });
    paint();
    return {
      paint
    };
  }

  // ---- bases éditables
  /** Données en vigueur d'une base : modification locale (overrideKey) si plus récente que le fichier, sinon le fichier. Sortie : { data, local : date de la modification locale ou '' }. */
  const effective = (fileData, overrideKey, fileStamp) => {
    const o = read(overrideKey);
    return o?.data && o.updatedAt > fileStamp ? {
      data: structuredClone(o.data),
      local: o.updatedAt
    } : {
      data: structuredClone(fileData),
      local: ''
    };
  };
  /** Organismes connus (table des indicatifs + SAMU), pour les listes de choix. */
  // (les organismes sont dans work.callsigns.data.operators et dans le tableau « Organismes » en cours d'édition — l'ancienne
  // lecture de work.callsigns.operators, inexistant, ne proposait que SAMU)
  // ---- page « Flotte virtuelle » du site de la DEFA, copiée-collée (ou enregistrée) : mêmes règles que
  // AircraftDB/update_fleet.py — une section par opérateur, une ligne par appareil (type, immatriculation, code, numéro,
  // indicatif, base, emplacement, heures de vol, opérationnel)
  const FLEET_OPERATORS = {
    "Armee de l'Air et de l'Espace": "Armée de l'Air et de l'Espace",
    'Sécurite Civile': 'Sécurité civile',
    'Marine Nationale': 'Marine nationale',
    'Gendarmerie Nationale': 'Gendarmerie nationale'
  };
  const FLEET_VARIANTS = {
    'A332 MRTT': 'A330 MRTT Phénix',
    'A332 PAX': 'A330-200',
    'A332 VIP': 'A330-200 VIP',
    'MIR2 5': 'Mirage 2000-5',
    'MIR2 B': 'Mirage 2000B',
    'MIR2 D': 'Mirage 2000D',
    'RFAL B': 'Rafale B',
    'RFAL C': 'Rafale C',
    'RFAL M': 'Rafale M',
    'H145 D3': 'H145 D3'
  };
  // en-têtes de colonnes et menu du site : jamais pris pour un nom d'opérateur (copie en texte)
  const FLEET_NOISE =
    /^(appareil|immatriculation|code|numéro|callsign|base|emplacement|heures de vol|op[ée]rationn?el|▲\s*▼|accueil|enregistrer mon vol|log des vols|flotte virtuelle|maintenance|statistiques|connexion)$/i;
  /** Appareils d'une page Flotte collée : HTML (tableaux, titres d'opérateur) ou texte (colonnes séparées par des
   *  tabulations, titre d'opérateur seul sur sa ligne). */
  function parseFleetPage(text) {
    const out = [],
      blank = v => v === '-' ? '' : v,
      reg = v => {
        v = v.trim().toUpperCase();
        return /^[FD][A-Z]{4}$/.test(v) ? `${v[0]}-${v.slice(1)}` : v;
      };
    /** Ajoute à out l'appareil d'une ligne du tableau Flotte (9 colonnes au moins), en-têtes et menus écartés. */
    const row = (operator, cells) => {
      if (cells.length < 9) return;
      const [name, registration, code, number, callsign, base, location, , operational] = cells.map(c => String(c).replace(/\s+/g, ' ')
        .trim());
      if (!name || !registration || FLEET_NOISE.test(name)) return;
      out.push({
        operator: FLEET_OPERATORS[operator] || operator,
        type: name.split(' ')[0].toUpperCase(),
        variant: FLEET_VARIANTS[name] || '',
        registration: reg(registration),
        tacticalNumber: blank(code),
        number: blank(number),
        callsigns: blank(callsign).toUpperCase().split('/').filter(c => c && !c.includes(' ')),
        base: blank(base).toUpperCase(),
        operational: /^oui/i.test(operational),
        location: blank(location).toUpperCase() // emplacement actuel sur le site (terrain actuel : aircraft_positions.js)
      });
    };
    let operator = '';
    if (/<t[dr][\s>]/i.test(text)) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      doc.querySelectorAll('h1, h2, h3, h4, tr').forEach(el => {
        if (el.tagName !== 'TR') {
          const h = el.textContent.replace(/\s+/g, ' ').trim();
          if (h && !FLEET_NOISE.test(h)) operator = h;
        } else row(operator, [...el.querySelectorAll('td')].map(td => td.textContent));
      });
    } else
      for (const line of String(text).split(/\r?\n/)) {
        const cells = line.split('\t');
        if (cells.length >= 9) row(operator, cells);
        else if (cells.length === 1 && line.trim() && !FLEET_NOISE.test(line.trim())) operator = line.trim();
      }
    return out;
  }
  /** Fusion avec la flotte du fichier (update_fleet.py) : un appareil de la page remplace celui du fichier (même
   *  immatriculation) en gardant ses indicatifs supplémentaires ; les appareils absents de la page sont conservés. */
  function mergeFleet(rows, page) {
    const known = new Map(page.map(a => [a.registration, a]));
    let updated = 0,
      kept = 0;
    for (const old of rows) {
      const r = old.registration;
      if (known.has(r)) {
        const a = known.get(r);
        for (const c of [].concat(old.callsigns || []))
          if (c && !a.callsigns.includes(c)) a.callsigns.push(c);
        // même emplacement : sa date est gardée (l'appareil n'a pas bougé sur le site) — toutes les lignes de
        // l'immatriculation (une immatriculation peut figurer deux fois sur la page)
        if (old.locationAt) page.forEach(x => {
          if (x.registration === r && x.location === old.location) x.locationAt = old.locationAt;
        });
        updated++;
      } else if (r) {
        page.push({
          ...old
        });
        known.set(r, old);
        kept++;
      }
    }
    const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    page.forEach(a => {
      if (a.location && !a.locationAt) a.locationAt = stamp;
    });
    return {
      rows: page,
      added: page.length - updated - kept,
      updated,
      kept
    };
  }
  /** Fenêtre « Coller la page Flotte du site » : collage (HTML de préférence), presse-papiers, ou page enregistrée ;
   *  onRows(appareils) avec les appareils lus. */
  function fleetPasteDialog(onRows) {
    const url = window.RepositoryNav?.vaUrl?.('fleet') || ''; // adresse inconnue : invitation à la régler (siteLink)
    const dialog = document.createElement('dialog');
    dialog.className = 'defa-loader';
    dialog.innerHTML = `<form method="dialog"><h3>${esc(T('Flotte — coller la page du site', 'Fleet — paste the website page'))}</h3>
      <p class="small">${esc(T('Ouvrir la page « Flotte virtuelle » du site, tout sélectionner (Ctrl+A), copier (Ctrl+C), puis coller ici (Ctrl+V).', 'Open the “Virtual fleet” page of the website, select all (Ctrl+A), copy (Ctrl+C), then paste here (Ctrl+V).'))}</p>
      <p>${window.RepositoryNav?.siteLink?.('fleet') || esc(url)}</p>
      <textarea rows="7" spellcheck="false" placeholder="Ctrl+V"></textarea>
      <div class="dl-row"><button type="button" data-a="clip">${esc(T('Lire le presse-papiers', 'Read the clipboard'))}</button><label class="dl-file"><span>${esc(T('ou page enregistrée…', 'or saved page…'))}</span><input type="file" accept=".html,.htm,.txt"></label></div>
      <div class="dl-row"><button type="button" data-a="load" class="primary">${esc(T('Lire', 'Read'))}</button></div>
      <p class="small dl-result"></p></form>`;
    const area = dialog.querySelector('textarea'),
      result = dialog.querySelector('.dl-result');
    /** Lit le texte collé ou le fichier : appareils reconnus remis à onRows et dialogue fermé, sinon message. */
    const run = text => {
      const list = parseFleetPage(text || '');
      if (!list.length) {
        result.textContent = T('Aucun appareil reconnu : copier toute la page « Flotte virtuelle » (tableaux compris).',
          'No aircraft recognised: copy the whole “Virtual fleet” page (tables included).');
        return;
      }
      dialog.close();
      onRows(list);
    };
    dialog.querySelector('[data-a="load"]').onclick = () => run(area.value);
    area.addEventListener('paste', e => {
      const html = e.clipboardData?.getData('text/html') || '';
      if (/<tr[\s>]/i.test(html)) {
        e.preventDefault();
        run(html);
        return;
      }
      setTimeout(() => run(area.value));
    });
    dialog.querySelector('[data-a="clip"]').onclick = async () => {
      try {
        let text = '';
        for (const item of await navigator.clipboard.read?.() || []) {
          if (item.types.includes('text/html')) text = await (await item.getType('text/html')).text();
          if (!/<tr[\s>]/i.test(text) && item.types.includes('text/plain')) text = await (await item.getType('text/plain')).text();
        }
        run(text || await navigator.clipboard.readText());
      } catch {
        result.textContent = T('Presse-papiers illisible ici : coller avec Ctrl+V dans la zone.',
          'Clipboard unreadable here: paste with Ctrl+V into the box.');
      }
    };
    const file = dialog.querySelector('input[type=file]');
    file.onchange = async () => {
      if (file.files[0]) run(await file.files[0].text());
      file.value = '';
    };
    dialog.addEventListener('close', () => dialog.remove());
    const panel = window.FileAccess?.pastePanel?.({
      root: dialog.querySelector('form'),
      area,
      run: dialog.querySelector('[data-a="load"]'),
      close: () => dialog.close(),
      runLabel: () => T('Lire', 'Read')
    });
    if (!panel) {
      const close = document.createElement('button');
      close.type = 'submit';
      close.textContent = T('Fermer', 'Close');
      dialog.querySelector('.dl-row:last-of-type').append(close);
    }
    document.body.append(dialog);
    dialog.showModal();
    area.focus();
  }
  /** Noms d'opérateurs proposés (indicatifs, opérateurs, table de correspondance, SAMU), triés, sans doublon. */
  const operatorNames = () => [...(work.callsigns?.operatorRows || []).map(r => r.name), ...Object.keys(work.callsigns?.data?.operators ||
    {}),
    ...(work.callsigns?.data?.table || []).map(r => r.operator), 'SAMU'
  ].filter((v, i, a) => v && a.indexOf(v) === i).sort((a, b) => a.localeCompare(b, 'fr'));
  const FLEET_COMMENT = ['Flotte SO Group Virtual : base commune des appareils connus (CR HEMS / FIRE, Mission Report Core).',
    'Source : page « Flotte virtuelle » de flotte.defa-virtual.fr (python AircraftDB/update_fleet.py Flotte.html),',
    'complétée à la main ou par la page Paramétrage. Colonnes : opérateur, type OACI, variante,',
    'immatriculation, code (numéro tactique), numéro, indicatifs, base, opérationnel.'
  ];
  const CALLSIGN_COMMENT = ['Indicatifs : forme complète (parlée, conservée dans les CR) ↔ forme plan de vol (OACI Doc 4444,',
    'app. 2, case 7 : 7 caractères, ex. PCAN31) ↔ désignateur OACI de l\'exploitant (OPR/, case 18).',
    'table : prefix (indicatif complet), fpl (forme plan de vol), operator, designator, types (types OACI',
    'de la série), role (indicatif de fonction : pas de choix automatique), generic (désignateur générique),',
    'telephony, note. operators : organisme → désignateur OACI (OPR/).'
  ];
  const FLEET_COLS = ['operator', 'type', 'variant', 'registration', 'tacticalNumber', 'number', 'callsigns', 'base', 'operational',
    'location', 'locationAt'
  ];
  const work = {};

  /** Copie de travail de chaque base éditable (flotte, indicatifs, types OACI, référence) : fichier ou modification locale plus récente. */
  function loadWork() {
    const fleetFile = {
      rows: (window.DEFA_FLEET_FILE || window.DEFA_FLEET || []).map(r => Object.fromEntries(FLEET_COLS.map(k => [k, r[k] ?? (k ===
        'callsigns' ? [] : '')])))
    };
    work.fleet = effective(fleetFile, 'dataOverride:fleet:v1', window.DEFA_FLEET_META?.updatedAt || '');
    const cs = window.MISSION_CALLSIGNS || {},
      csFile = cs.file || cs;
    work.callsigns = effective({
      table: csFile.table || [],
      operators: csFile.operators || {}
    }, 'dataOverride:callsigns:v1', cs.META?.updatedAt || '');
    work.callsigns.operatorRows = Object.entries(work.callsigns.data.operators).map(([name, designator]) => ({
      name,
      designator
    }));
    const dbFile = window.AIRCRAFT_DB || {};
    work.aircraftDb = effective(dbFile, 'dataOverride:aircraftDb:v1', String(dbFile.__meta?.admin_saved || ''));
    work.aircraftDb.original = dbFile;
    const d = work.aircraftDb.data;
    work.aircraftDb.records = Object.entries(d).filter(([k]) => !k.startsWith('__')).map(([k, v]) => ({
      tdesig: k,
      model: v.model || '',
      description: v.description || '',
      wtc: v.wtc || '',
      wing_position: v.wing_position || '',
      source: v.source || '',
      _extra: v
    }));
    work.aircraftDb.aliases = Object.entries(d.__aliases || {}).map(([alias, tdesig]) => ({
      alias,
      tdesig
    }));
    const ref = window.DEFA_REFERENCE || {},
      refFile = ref.file || ref;
    work.defaReference = effective({
      pilots: refFile.pilots || [],
      aircraft: refFile.aircraft || []
    }, 'dataOverride:defaReference:v1', ref.META?.updatedAt || '');
  }

  // Reconstitution des données à enregistrer.
  const fleetData = () => ({
    rows: work.fleet.data.rows.filter(r => r.registration).map(r => ({
      ...r,
      registration: String(r.registration).toUpperCase()
    }))
  });
  /** Données de la table des indicatifs à enregistrer (lignes vides retirées). */
  const callsignData = () => ({
    table: work.callsigns.data.table.filter(r => r.prefix),
    operators: Object.fromEntries(work.callsigns.operatorRows.filter(r => r.name).map(r => [r.name, r.designator]))
  });

  /** Base des types OACI à enregistrer (lignes éditées, alias, méta horodatée). */
  function aircraftDbData(stamp) {
    const base = work.aircraftDb.data,
      out = {
        __meta: {
          ...(base.__meta || {}),
          admin_saved: stamp
        },
        __aliases: Object.fromEntries(work.aircraftDb.aliases.filter(r => r.alias && r.tdesig).map(r => [r.alias.toUpperCase(), r.tdesig
          .toUpperCase()
        ]))
      };
    Object.keys(base).filter(k => k.startsWith('__') && !out[k]).forEach(k => {
      out[k] = base[k];
    });
    work.aircraftDb.records.filter(r => r.tdesig).forEach(r => {
      const key = r.tdesig.toUpperCase();
      const {
        _extra,
        ...fields
      } = r;
      out[key] = {
        ...(_extra || {}),
        ...fields,
        tdesig: key
      };
      Object.keys(out[key]).forEach(k => {
        if (out[key][k] === '' && !(_extra && k in _extra)) delete out[key][k];
      });
    });
    return out;
  }
  // Types modifiés / ajoutés par rapport au fichier : reportés dans aircraft_overrides.json pour
  // que le script de rafraîchissement ne les écrase pas.
  async function overridesText(db) {
    let overrides = {
      __meta: {
        schema: 1,
        note: 'Manual overrides merged after Wikidata/Wikipedia lookup.'
      },
      __aliases: {},
      __records: {}
    };
    try {
      const r = await fetch(new URL('data/references/aircraft_overrides.json', window.RepositoryNav?.root || new URL('../', location
        .href)), {
        cache: 'no-store'
      });
      if (r.ok) overrides = await r.json();
    } catch {
      /* fichier absent */
    }
    const original = work.aircraftDb.original;
    Object.entries(db).filter(([k]) => !k.startsWith('__')).forEach(([k, v]) => {
      if (JSON.stringify(original[k]) === JSON.stringify(v)) return;
      overrides.__records = overrides.__records || {};
      overrides.__records[k] = {
        ...v,
        source: v.source && v.source !== original[k]?.source ? v.source : 'manual/parametrage'
      };
    });
    Object.entries(db.__aliases).forEach(([a, t]) => {
      if (original.__aliases?.[a] !== t) {
        overrides.__aliases = overrides.__aliases || {};
        overrides.__aliases[a] = t;
      }
    });
    return JSON.stringify(overrides, null, 2) + '\n';
  }

  const DATASETS = [{
      id: 'fleet',
      group: T('Fichiers du dépôt', 'Repository files'),
      title: T('Flotte (appareils connus)', 'Fleet (known aircraft)'),
      file: 'data/references/aircraft_fleet.js',
      overrideKey: 'dataOverride:fleet:v1',
      intro: T(
        'Flotte du {SOG} : appareils affectables et proposés dans les CR (immatriculation, type, indicatifs, base, opérateur ; plusieurs indicatifs séparés par des virgules). Dessous : les appareils qui volent dans le reporting, avec la case « personnel » (hors flotte).',
        '{SOG} fleet: assignable aircraft offered in reports (registration, type, callsigns, base, operator; several callsigns comma-separated). Below: the aircraft flying in the reporting, with the “personal” box (outside the fleet).'
      ),
      /** Tableaux éditables de la base (colonnes et lignes de travail). */
      tables: () => [{
        columns: [{
          key: 'operator',
          label: T('Opérateur', 'Operator'),
          type: 'select',
          options: operatorNames
        }, {
          key: 'type',
          label: T('Type OACI', 'ICAO type'),
          upper: true
        }, {
          key: 'variant',
          label: T('Variante', 'Variant')
        }, {
          key: 'registration',
          label: T('Immatriculation', 'Registration'),
          upper: true
        }, {
          key: 'tacticalNumber',
          label: T('Code', 'Code')
        }, {
          key: 'number',
          label: T('Numéro', 'Number')
        }, {
          key: 'callsigns',
          label: T('Indicatifs', 'Callsigns'),
          type: 'list',
          width: '12em'
        }, {
          key: 'base',
          label: T('Base', 'Base'),
          upper: true
        }, {
          key: 'operational',
          label: T('Opérationnel', 'Operational'),
          type: 'bool'
        }, {
          key: 'location',
          label: T('Emplacement (site)', 'Location (website)'),
          upper: true
        }],
        data: work.fleet.data.rows
      }],
      /** Fichiers à écrire [chemin, texte] : flotte, plus l'index des appareils personnels du reporting. */
      files: async stamp => [
        // index des appareils individuels (reporting hors flotte), recalculé à chaque enregistrement de la flotte
        ...(window.FleetReporting ? [await window.FleetReporting.personalFile(render, work.fleet.data.rows)] : []),
        ['data/references/aircraft_fleet.js', render(FLEET_COMMENT, fleetData(), 'dataOverride:fleet:v1',
          "window.DEFA_FLEET = data.rows.map(row => ({ ...row, callsign: (row.callsigns || [])[0] || '' })); window.DEFA_FLEET_META = META; window.DEFA_FLEET_FILE = fileData.rows;",
          stamp)]
      ],
      /** Données appliquées dans ce navigateur (dataOverride:fleet:v1). */
      overlay: () => fleetData(),
      howto: `<p>${T('Mise à jour depuis le site : automatique une fois par jour (lanceur, réglage sous la liste des appareils du reporting) ; à la main, « Coller la page Flotte du site… » (copier-coller de la page « Flotte virtuelle »), vérifier, puis « Enregistrer dans le dépôt ». Ou, avec le script :', 'Update from the website: “Paste the website Fleet page…” (copy-paste of the “Virtual fleet” page), check, then “Save to repository”. Or, with the script:')}</p>
        <ol><li>${T('Ouvrir', 'Open')} ${window.RepositoryNav?.siteLink?.('fleet', {}, T('Flotte virtuelle', 'Virtual fleet')) || ''}, <span>${T('puis Fichier › Enregistrer sous… (« Flotte.html »).', 'then File › Save as… (“Flotte.html”).')}</span></li>
        <li>${T('À la racine du dépôt :', 'At the repository root:')} <code>python AircraftDB/update_fleet.py Flotte.html</code></li>
        <li>${T('Les appareils de la page remplacent ceux du fichier ; les indicatifs supplémentaires et les appareils ajoutés ici sont conservés.', 'Aircraft from the page replace those of the file; extra callsigns and aircraft added here are kept.')}</li>
        <li>${T('Recharger cette page ; supprimer les modifications locales si elles ont été intégrées.', 'Reload this page; delete local changes once integrated.')}</li></ol>`
    }, {
      id: 'aircraftDb',
      group: T('Fichiers du dépôt', 'Repository files'),
      title: T('Types d’aéronefs (base OACI)', 'Aircraft types (ICAO base)'),
      file: 'AircraftDB/aircraft_db.js',
      overrideKey: 'dataOverride:aircraftDb:v1',
      intro: T(
        'Désignateur OACI (Doc 8643), modèle, description (L2J, H1T…), catégorie de turbulence, position de l’aile. Les modifications sont aussi reportées dans aircraft_overrides.json.',
        'ICAO designator (Doc 8643), model, description (L2J, H1T…), wake category, wing position. Changes are also written to aircraft_overrides.json.'
      ),
      /** Tableaux éditables de la base : types puis alias. */
      tables: () => [{
        title: T('Types', 'Types'),
        columns: [{
          key: 'tdesig',
          label: T('Désignateur', 'Designator'),
          upper: true
        }, {
          key: 'model',
          label: T('Modèle', 'Model'),
          width: '16em'
        }, {
          key: 'description',
          label: T('Description OACI', 'ICAO description'),
          upper: true
        }, {
          key: 'wtc',
          label: 'WTC',
          upper: true
        }, {
          key: 'wing_position',
          label: T('Aile', 'Wing'),
          type: 'select',
          /** Positions d'aile reconnues par la base OACI (wing_position). */
          options: () => ['low', 'mid', 'high', 'none']
        }, {
          key: 'source',
          label: T('Source', 'Source')
        }],
        data: work.aircraftDb.records
      }, {
        title: T('Alias (nom courant → désignateur)', 'Aliases (common name → designator)'),
        columns: [{
          key: 'alias',
          label: T('Alias', 'Alias'),
          upper: true
        }, {
          key: 'tdesig',
          label: T('Désignateur', 'Designator'),
          upper: true
        }],
        data: work.aircraftDb.aliases
      }],
      /** Fichiers à écrire : base OACI (aircraft_db.js) et modifications manuelles (aircraft_overrides.json). */
      files: async stamp => {
        const db = aircraftDbData(stamp);
        return [
          ['AircraftDB/aircraft_db.js', `window.AIRCRAFT_DB = ${dumps(db)};\n`],
          ['data/references/aircraft_overrides.json', await overridesText(db)]
        ];
      },
      /** Données appliquées dans ce navigateur (dataOverride:aircraftDb:v1). */
      overlay: stamp => aircraftDbData(stamp),
      stampKey: true,
      howto: `<p>${T('Rafraîchissement par le script (sources : OACI Doc 8643, EUROCONTROL, Wikidata ; modifications manuelles d’aircraft_overrides.json prioritaires) — depuis le dossier AircraftDB :', 'Refresh with the script (sources: ICAO Doc 8643, EUROCONTROL, Wikidata; manual changes from aircraft_overrides.json take priority) — from the AircraftDB folder:')}</p>
        <ul><li><code>python update_aircraft_db.py --no-network</code> — ${T('reconstruit la base avec les caches locaux', 'rebuilds the base from local caches')}</li>
        <li><code>python update_aircraft_db.py --add RFAL MIR2</code> — ${T('ajoute des types (recherche en ligne)', 'adds types (online lookup)')}</li>
        <li><code>python update_aircraft_db.py "../data/cr/HEMS/hems_mission_ledger.csv"</code> — ${T('types de la colonne Aircraft d’un CSV', 'types from a CSV Aircraft column')}</li>
        <li><code>--refresh-icao</code> ${T('(relit la liste OACI sans attendre 30 jours),', '(re-reads the ICAO list without waiting 30 days),')} <code>--delay 2</code> ${T('(pause entre requêtes)', '(pause between requests)')}</li></ul>
        <p class="small">${T('Un type supprimé ici peut revenir au prochain rafraîchissement s’il fait partie de la liste de base du script.', 'A type deleted here may come back at the next refresh if it is in the script base list.')}</p>`
    }, {
      id: 'callsigns',
      group: T('Fichiers du dépôt', 'Repository files'),
      title: T('Correspondance des indicatifs', 'Callsign correspondence'),
      file: 'data/references/callsigns.js',
      overrideKey: 'dataOverride:callsigns:v1',
      intro: T(
        'Indicatif complet (conservé dans les CR) ↔ forme plan de vol (case 7, 7 caractères avec le numéro) ↔ exploitant OACI (OPR/, case 18). Types : types OACI de la série, séparés par des virgules.',
        'Full callsign (kept in reports) ↔ flight plan form (item 7, 7 characters with the number) ↔ ICAO operator (OPR/, item 18). Types: ICAO types of the series, comma-separated.'
      ),
      /** Tableaux éditables de la base : indicatifs puis exploitants. */
      tables: () => [{
        title: T('Indicatifs', 'Callsigns'),
        columns: [{
          key: 'prefix',
          label: T('Indicatif complet', 'Full callsign'),
          upper: true
        }, {
          key: 'fpl',
          label: T('Plan de vol', 'Flight plan'),
          upper: true
        }, {
          key: 'aliases',
          label: T('Autres formes', 'Other forms'),
          type: 'list',
          width: '10em'
        }, {
          key: 'operator',
          label: T('Organisme', 'Organisation'),
          type: 'select',
          options: operatorNames
        }, {
          key: 'designator',
          label: 'OPR/',
          upper: true
        }, {
          key: 'types',
          label: T('Types', 'Types'),
          type: 'list'
        }, {
          key: 'role',
          label: T('Fonction', 'Role'),
          type: 'bool'
        }, {
          key: 'generic',
          label: T('Générique', 'Generic'),
          type: 'bool'
        }, {
          key: 'telephony',
          label: T('Radiotéléphonie', 'Telephony'),
          upper: true
        }, {
          key: 'note',
          label: T('Note', 'Note'),
          width: '14em'
        }],
        data: work.callsigns.data.table
      }, {
        title: T('Organismes → désignateur OACI (OPR/)', 'Organisations → ICAO designator (OPR/)'),
        columns: [{
          key: 'name',
          label: T('Organisme', 'Organisation'),
          width: '16em'
        }, {
          key: 'designator',
          label: 'OPR/',
          upper: true
        }],
        data: work.callsigns.operatorRows
      }],
      /** Fichier à écrire : data/references/callsigns.js. */
      files: stamp => [
        ['data/references/callsigns.js', render(CALLSIGN_COMMENT, callsignData(), 'dataOverride:callsigns:v1',
          'window.MISSION_CALLSIGNS = { META, table: data.table, operators: data.operators, file: fileData };', stamp)]
      ],
      /** Données appliquées dans ce navigateur (dataOverride:callsigns:v1). */
      overlay: () => callsignData(),
      howto: `<p>${T('Pas de script : cette page (ou le fichier, à la main) est la source. Les formes corrigées dans les CR apparaissent dans « Indicatifs appris » ci-dessous, à intégrer ici.', 'No script: this page (or the file, by hand) is the source. Forms corrected in reports appear in “Learned callsigns” below, to integrate here.')}</p>`
    },
    // ---- données du navigateur
    {
      id: 'registry',
      group: T('Données du navigateur', 'Browser data'),
      title: T('Appareils des missions enregistrées', 'Aircraft from recorded missions'),
      key: 'missionAircraftRegistry:v1',
      /** Clé d'enregistrement d'une ligne : immatriculation sans séparateurs. */
      byKey: r => String(r.registration || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      intro: T('Mémorisés à chaque enregistrement d’une mission (la donnée la plus récente l’emporte sur la flotte).',
        'Remembered each time a mission is saved (latest data wins over the fleet).'),
      columns: [{
        key: 'registration',
        label: T('Immatriculation', 'Registration'),
        upper: true
      }, {
        key: 'type',
        label: T('Type', 'Type'),
        upper: true
      }, {
        key: 'variant',
        label: T('Variante', 'Variant')
      }, {
        key: 'category',
        label: T('Catégorie', 'Category'),
        type: 'select',
        /** Catégories d'appareil : avion, hélicoptère, amphibie. */
        options: () => ['fixed', 'rotary', 'amphibious']
      }, {
        key: 'callsign',
        label: T('Indicatif', 'Callsign'),
        upper: true
      }, {
        key: 'tacticalNumber',
        label: T('Code', 'Code')
      }, {
        key: 'operator',
        label: T('Opérateur', 'Operator')
      }, {
        key: 'date',
        label: T('Date', 'Date')
      }]
    }, {
      id: 'localTypes',
      group: T('Données du navigateur', 'Browser data'),
      title: T('Types ajoutés localement', 'Locally added types'),
      key: 'missionAircraftTypes:v1',
      /** Clé d'enregistrement d'une ligne : désignateur OACI. */
      byKey: r => String(r.tdesig || '').toUpperCase(),
      intro: T('Types inconnus saisis dans des missions. « Intégrer » les copie dans la base OACI (à enregistrer ensuite).',
        'Unknown types entered in missions. “Integrate” copies them into the ICAO base (save it afterwards).'),
      columns: [{
        key: 'tdesig',
        label: T('Désignateur', 'Designator'),
        upper: true
      }, {
        key: 'model',
        label: T('Modèle', 'Model')
      }, {
        key: 'category',
        label: T('Catégorie', 'Category'),
        type: 'select',
        /** Catégories d'appareil : avion, hélicoptère, amphibie. */
        options: () => ['fixed', 'rotary', 'amphibious']
      }, {
        key: 'addedAt',
        label: T('Ajouté le', 'Added')
      }],
      /** Copie les types absents dans la base OACI de travail ; rend la base à afficher ensuite. */
      integrate: list => {
        list.forEach(r => {
          if (r.tdesig && !work.aircraftDb.records.some(x => x.tdesig === r.tdesig)) work.aircraftDb.records.unshift({
            tdesig: r.tdesig,
            model: r.model || r.tdesig,
            description: {
              rotary: 'H1T',
              amphibious: 'A1P',
              fixed: 'L1P'
            } [r.category] || '',
            wtc: '',
            wing_position: '',
            source: 'manual/parametrage'
          });
        });
        return 'aircraftDb';
      }
    }, {
      id: 'learned',
      group: T('Données du navigateur', 'Browser data'),
      title: T('Indicatifs appris (formes plan de vol corrigées)', 'Learned callsigns (corrected flight plan forms)'),
      key: 'missionCallsignTable:v1',
      array: true,
      intro: T(
        'Formes plan de vol corrigées à la main dans les CR. « Intégrer » les ajoute à la table de correspondance (à enregistrer ensuite).',
        'Flight plan forms corrected by hand in reports. “Integrate” adds them to the correspondence table (save it afterwards).'),
      columns: [{
        key: 'prefix',
        label: T('Indicatif complet', 'Full callsign'),
        upper: true
      }, {
        key: 'fpl',
        label: T('Plan de vol', 'Flight plan'),
        upper: true
      }, {
        key: 'updatedAt',
        label: T('Date', 'Date')
      }],
      /** Reporte les formes plan de vol apprises dans la table des indicatifs ; rend la base à afficher. */
      integrate: list => {
        list.forEach(r => {
          const row = work.callsigns.data.table.find(x => x.prefix === r.prefix);
          if (row) row.fpl = r.fpl;
          else if (r.prefix) work.callsigns.data.table.unshift({
            prefix: r.prefix,
            fpl: r.fpl,
            operator: '',
            designator: '',
            types: []
          });
        });
        return 'callsigns';
      }
    }, {
      id: 'airports',
      group: T('Données du navigateur', 'Browser data'),
      title: T('Aérodromes utilisés (cache)', 'Aerodromes used (cache)'),
      key: 'missionAirports:v1',
      /** Clé d'enregistrement d'une ligne : code OACI. */
      byKey: r => String(r.icao || '').toUpperCase(),
      intro: T('Coordonnées et fuseaux des terrains utilisés (lever / coucher du soleil, météo).',
        'Coordinates and time zones of aerodromes used (sunrise / sunset, weather).'),
      columns: [{
        key: 'icao',
        label: 'OACI',
        upper: true
      }, {
        key: 'name',
        label: T('Nom', 'Name'),
        width: '14em'
      }, {
        key: 'country',
        label: T('Pays', 'Country')
      }, {
        key: 'lat',
        label: 'Lat',
        type: 'number'
      }, {
        key: 'lon',
        label: 'Lon',
        type: 'number'
      }, {
        key: 'elevation',
        label: T('Altitude (ft)', 'Elevation (ft)'),
        type: 'number'
      }, {
        key: 'tz',
        label: T('Fuseau', 'Time zone')
      }]
    }, {
      id: 'defaReference',
      group: T('Base', 'Base'),
      title: T('Référence (anonymisée, dans le dépôt)', 'Reference (anonymised, in the repository)'),
      file: 'data/references/defa_reference.js',
      overrideKey: 'dataOverride:defaReference:v1',
      intro: T(
        'Pilotes (trigrammes) et appareils de la compagnie — immatriculation, type, indicatifs utilisés, terrain de rattachement (modifiable), dernier terrain connu, statut — sans les vols ni les missions. Utilisée par les trois applications (CR, Landing Dashboard, Flight Planner). Base « lâche » : aide à la saisie, non exhaustive. Mise à jour : « Base » › « Mettre à jour la référence », ou tools/defa_reference.py.',
        'Pilots (trigrams) and aircraft — registration, type, callsigns used, home aerodrome (editable), last known aerodrome, status — without flights or missions. Used by the three applications. Loose base: input aid, not exhaustive.'
      ),
      /** Tableaux éditables de la référence : appareils puis pilotes. */
      tables: () => [{
        title: T('Appareils', 'Aircraft'),
        columns: [{
          key: 'registration',
          label: T('Immatriculation', 'Registration'),
          upper: true
        }, {
          key: 'type',
          label: 'Type',
          upper: true
        }, {
          key: 'variant',
          label: T('Variante', 'Variant'),
          upper: true
        }, {
          key: 'status',
          label: T('Statut', 'Status'),
          type: 'select',
          /** Statuts d'un appareil de la référence. */
          options: () => ['DISPONIBLE', 'INDISPONIBLE', 'MAINTENANCE', 'RETIRÉ']
        }, {
          key: 'homeAd',
          label: T('Rattachement', 'Home AD'),
          upper: true
        }, {
          key: 'lastAd',
          label: T('Dernier AD connu', 'Last known AD'),
          upper: true
        }, {
          key: 'commissioned',
          label: T('Mise en service', 'Commissioned')
        }, {
          key: 'callsigns',
          label: T('Indicatifs utilisés', 'Callsigns used'),
          type: 'list',
          width: '14em'
        }, {
          key: 'first',
          label: T('Premier vol', 'First flight')
        }, {
          key: 'last',
          label: T('Dernier vol', 'Last flight')
        }, {
          key: 'flights',
          label: T('Vols', 'Flights'),
          type: 'number'
        }, {
          key: 'fleetId',
          label: T('Fiche flotte', 'Fleet sheet')
        }, {
          key: 'note',
          label: T('Note', 'Note'),
          width: '12em'
        }],
        data: work.defaReference.data.aircraft
      }, {
        title: T('Pilotes', 'Pilots'),
        columns: [{
          key: 'trigram',
          label: T('Trigramme', 'Trigram'),
          upper: true
        }, {
          key: 'first',
          label: T('Premier vol', 'First flight')
        }, {
          key: 'last',
          label: T('Dernier vol', 'Last flight')
        }, {
          key: 'flights',
          label: T('Vols', 'Flights'),
          type: 'number'
        }, {
          key: 'types',
          label: 'Types',
          type: 'list',
          width: '14em'
        }, {
          key: 'note',
          label: T('Note', 'Note'),
          width: '12em'
        }],
        data: work.defaReference.data.pilots
      }],
      /** Fichier à écrire : data/references/defa_reference.js (lignes sans trigramme ni immatriculation écartées). */
      files: stamp => [
        ['data/references/defa_reference.js', render([
            'Référence anonymisée : pilotes (trigrammes), appareils (immatriculation, type, indicatifs',
            'utilisés, dernier terrain connu, terrain de rattachement), sans les vols ni les missions.',
            'Générée par tools/defa_reference.py ou Paramétrage › Base ; complétée à la main.',
            'Base « lâche » : aide à la saisie, non exhaustive.'
          ], {
            pilots: work.defaReference.data.pilots.filter(p => p.trigram),
            aircraft: work.defaReference.data.aircraft.filter(a => a.registration)
          }, 'dataOverride:defaReference:v1',
          'window.DEFA_REFERENCE = { META, pilots: data.pilots, aircraft: data.aircraft, file: fileData };', stamp)]
      ],
      /** Données appliquées dans ce navigateur (dataOverride:defaReference:v1). */
      overlay: () => ({
        pilots: work.defaReference.data.pilots.filter(p => p.trigram),
        aircraft: work.defaReference.data.aircraft.filter(a => a.registration)
      }),
      howto: `<ol><li>${T('Charger le journal des vols (Base › Journal des vols).', 'Load the flight log (Base › Flight log).')}</li><li>${T('« Mettre à jour la référence » : pilotes et appareils ajoutés ou complétés (rien n’est supprimé ; terrain de rattachement, statut, mise en service et notes saisis ici sont conservés).', '“Update the reference”: pilots and aircraft added or completed (nothing removed; home AD, status, commissioning and notes kept).')}</li><li>${T('« Enregistrer dans le dépôt », puis committer data/references/defa_reference.js.', '“Save to repository”, then commit data/references/defa_reference.js.')}</li></ol><p>${T('Ou, à la racine du dépôt :', 'Or, at the repository root:')} <code>python tools/defa_reference.py "Log des vols.html"</code></p>`
    }, {
      id: 'defaLog',
      group: T('Base', 'Base'),
      title: T('Journal des vols (vols réalisés)', 'Flight log (flights flown)'),
      custom: true,
      intro: T(
        'Base distincte du registre des missions : page « Log des vols » du site de la compagnie enregistrée (Ctrl+S, page web complète ou HTML seul), ou export CSV / JSON de cette base. Chargée à la demande, gardée dans ce navigateur seulement (hors dépôt et hors sauvegarde locale : trigrammes des pilotes). Les CR s’en servent pour les appareils connus (immatriculation → type, indicatifs utilisés), les trigrammes d’équipage et les terrains ; l’analyse des indicatifs alimente la table de correspondance.',
        'Separate from the mission ledger: “Log des vols” page saved (Ctrl+S), or CSV / JSON export of this base. Loaded on demand, kept in this browser only (not in the repository nor the local backup: pilot trigrams). Reports use it for known aircraft, crew trigrams and aerodromes; the callsign analysis feeds the correspondence table.'
      )
    }, {
      id: 'merges',
      group: T('Base', 'Base'),
      title: T('Fusions et renommages (pilotes, appareils)', 'Merges and renames (pilots, aircraft)'),
      custom: true,
      intro: T(
        'Équivalences mémorisées par « Fusionner avec… / renommer » des fiches : appliquées au journal rechargé, à la référence et au catalogue. Une boucle (A → B et B → A) échange les deux noms : supprime l’entrée fautive, puis refais la fusion depuis la fiche.',
        'Equivalences stored by the sheets’ “Merge with… / rename”: applied to the reloaded log, the reference and the catalogue. A loop (A → B and B → A) swaps both names: delete the wrong entry, then redo the merge from the sheet.'
      )
    }, {
      id: 'send',
      group: T('Centre ({CENTRE})', 'Centre ({CENTRE})'),
      title: T('Envoi des comptes rendus (webservice)', 'Report sending (web service)'),
      custom: true,
      intro: T(
        'Bouton « Envoyer le CR » des pages de saisie : POST JSON (mission, CR HTML et texte, calculs) vers l’adresse ci-dessous. La clef reste dans ce navigateur (missionSendKey:v1), hors sauvegarde locale. Le service doit accepter les appels de cette origine (CORS).',
        '“Send report” button of the entry pages: JSON POST (mission, report HTML and text, calculations) to the address below. The key stays in this browser (missionSendKey:v1), outside the local backup. The service must accept calls from this origin (CORS).'
      )
    }, {
      id: 'cpco',
      group: T('Centre ({CENTRE})', 'Centre ({CENTRE})'),
      title: T('Accès au Centre et réglages', 'Centre access and settings'),
      custom: true,
      // texte traduit à la source (CLAUDE.md : pas de couche de traduction après coup)
      intro: window.RepositoryKit.t([
        'Le Centre de planification et de conduite des opérations (générateur de mission, studio cartographique, registre des missions) est réservé : il s’active ici avec le mot de passe du {SOG}, partagé avec les données (data/config/centre.json) et affiché à côté du bouton ; seule l’activation est gardée dans ce navigateur. Centre verrouillé : ses pages sont absentes des menus et ses réglages (calcul des routes, espace disque des missions) sont verrouillés.',
        'The planning and operations command centre (mission generator, map studio, mission registry) is restricted: it is enabled here with the {SOG} password, shared with the data (data/config/centre.json) and shown next to the button; only the activation is kept in this browser. Locked centre: its pages are hidden from menus and its settings (route calculation, missions disk space) are locked.',
        'Das Einsatzplanungs- und Führungszentrum (Missionsgenerator, Kartenstudio, Missionsregister) ist reserviert: Es wird hier mit dem Passwort der {SOG} aktiviert, das mit den Daten geteilt (data/config/centre.json) und neben dem Knopf angezeigt wird; nur die Aktivierung bleibt in diesem Browser gespeichert. Gesperrtes Zentrum: Seine Seiten fehlen in den Menüs, und seine Einstellungen (Routenberechnung, Speicherplatz der Missionen) sind gesperrt.',
        'El Centro de planificación y conducción de operaciones (generador de misiones, estudio cartográfico, registro de misiones) está reservado: se activa aquí con la contraseña del {SOG}, compartida con los datos (data/config/centre.json) y mostrada junto al botón; solo la activación se guarda en este navegador. Centro bloqueado: sus páginas no aparecen en los menús y sus ajustes (cálculo de rutas, espacio en disco de las misiones) están bloqueados.'
      ])
    }, {
      id: 'planner',
      group: T('Planificateur carburant', 'Fuel planner'),
      title: T('Altitude sans oxygène (avions non pressurisés)', 'Altitude without oxygen (unpressurised aircraft)'),
      custom: true,
      intro: T(
        'Au-dessus de cette altitude, le graphique d’altitude optimale du planificateur signale « oxygène requis » pour les avions à cabine non pressurisée (champ « Cabine pressurisée » du profil ; non renseigné : piston non pressurisé). Information seulement : le calcul n’est pas limité. Réglage gardé dans ce navigateur.',
        'Above this altitude, the planner’s optimum altitude chart shows “oxygen required” for aircraft with an unpressurised cabin (profile field “Pressurised cabin”; not set: piston unpressurised). Information only: the computation is not limited. Setting kept in this browser.'
      )
    }, {
      id: 'ledgers',
      group: T('Missions', 'Missions'),
      title: T('Registres des missions (base des opérations)', 'Mission ledgers (operations base)'),
      custom: true,
      intro: T(
        'Registre unique data/cr/missions.yaml (toutes familles, source de vérité des reportings). Édition directe du YAML, complète ou par famille, avec contrôle avant enregistrement ; pour une mission, préférer le CR (clic sur la ligne du reporting).',
        'Single ledger data/cr/missions.yaml (all families, source of truth of the reportings). Direct YAML editing, full or per family, checked before saving; for a single mission, prefer the report (click its reporting row).'
      )
    }
  ];

  // ---- page
  /** Construit la page Paramétrage dans root : liste des bases, éditeur de la base choisie, dossiers, actions (appliquer localement, enregistrer dans le dépôt, télécharger), garde des modifications non enregistrées. */
  function mount(root) {
    loadWork();
    /** Message d'état de la page. */
    const status = text => {
      root.querySelector('.da-status').textContent = text;
    };
    // Paramètres en quatre pages (main[data-settings] : profile, centre, installation, maintenance) : rubriques de la
    // page seulement (REPOSITORY_TREE.settings.sections), dans l'ordre de cette table ; rubriques ajoutées par
    // shared/settings_panels.js (window.SettingsPanels : { id, group, title, intro, render(body, api) }). Sans
    // data-settings : toutes les rubriques (ancienne page unique).
    const page = root.dataset.settings || '',
      sections = window.REPOSITORY_TREE?.settings?.sections || {},
      order = Object.keys(sections);
    const SETS = [...DATASETS, ...(window.SettingsPanels?.list || [])].filter(d => !page || sections[d.id] === page)
      .sort((a, b) => page ? order.indexOf(a.id) - order.indexOf(b.id) : 0);
    // page Centre : rubriques réservées tant que le Centre est verrouillé (seul l'accès reste)
    const locked = d => sections[d.id] === 'centre' && d.id !== 'cpco' && !window.RepositoryNav?.cpco?.enabled?.();
    const wanted = new URLSearchParams(location.search).get('base');
    // rubrique d'une autre page (ancien lien, lien interne) : ouverte sur sa page
    if (page && wanted && sections[wanted] && sections[wanted] !== page && window.RepositoryNav?.settingsUrl) {
      location.replace(window.RepositoryNav.settingsUrl(wanted));
      return;
    }
    // v2 : niveau minimal de chaque rubrique (REPOSITORY_TREE.settings.levels ; rubrique d'un outil facultatif,
    // settings.modules : niveau 4 tant que l'outil n'est pas coché) → data-min-level sur l'entrée et sur le titre du groupe
    const N = window.RepositoryNav?.levels,
      lvl = N?.get?.() || 4,
      LV = window.REPOSITORY_TREE?.settings?.levels || {},
      MOD = window.REPOSITORY_TREE?.settings?.modules || {};
    /** Niveau d'utilisation à partir duquel la rubrique d figure dans la colonne (1 à 4). */
    const minLevel = d => MOD[d.id] && !(N?.modules?.() || []).includes(MOD[d.id]) ? 4 : LV[d.id] || 1;
    /** Attribut data-min-level d'un niveau n (rien au niveau 1). */
    const minAttr = n => n > 1 ? ` data-min-level="${n}"` : '';
    // rubrique ouverte : celle de l'adresse, sinon la première visible au niveau courant ; aucune (Installation : blocs de
    // shared/maintenance_page.js seulement) → éditeur masqué, maintenance_page.js ouvre son premier bloc
    const current = {
      id: SETS.some(d => d.id === wanted) ? wanted : SETS.find(d => minLevel(d) <= lvl)?.id || ''
    };
    const groups = [...new Set(SETS.map(d => d.group))];
    root.innerHTML = `<aside class="da-nav">${groups.map(g => {
      const list = SETS.filter(d => d.group === g);
      return `<h3${minAttr(Math.min(...list.map(minLevel)))}>${esc(g)}</h3>${list.map(d => `<button type="button" data-set="${d.id}"${minAttr(minLevel(d))}>${esc(d.title)}</button>`).join('')}`;
    }).join('')}</aside>
      <section class="da-main" data-icon="database"><h2></h2><p class="small da-intro"></p><div class="row da-actions"></div><p class="small da-status"></p><div class="da-body"></div><details class="da-howto"><summary>${esc(T('Mode opératoire', 'Procedure'))}</summary><div></div></details></section>`;
    // Dossiers mémorisés et sources externes : réglés dans Paramètres › Maintenance (bloc « Sources et dossiers »).
    root.querySelectorAll('[data-set]').forEach(b => b.onclick = async () => {
      if (dirty && !await window.AppFramework.ask(T('Modifications non enregistrées : changer de base quand même ?',
          'Unsaved changes: switch anyway?'))) return;
      dirty = false;
      current.id = b.dataset.set;
      history.replaceState(null, '', `?base=${current.id}`);
      show();
    });
    let dirty = false;
    /** Marque la base éditée comme modifiée (garde au départ de la page). */
    const changed = () => {
      dirty = true;
      status(T('Modifié — non enregistré', 'Modified — not saved'));
    };
    window.addEventListener('beforeunload', e => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    /** Barre d'actions de la base affichée : [libellé, fonction, classe] ; les erreurs s'affichent dans le message d'état. */
    function actions(buttons) {
      const host = root.querySelector('.da-actions');
      host.innerHTML = '';
      buttons.forEach(([label, fn, cls = 'secondary']) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls;
        b.textContent = label;
        b.onclick = async () => {
          try {
            await fn();
          } catch (e) {
            status(`${T('Échec', 'Failed')} : ${e.message}`);
          }
        };
        host.append(b);
      });
    }

    /** Rubriques réservées au Centre masquées tant qu'il est verrouillé (titres de groupe vides compris). */
    function lockNav() {
      root.querySelectorAll('.da-nav [data-set]').forEach(b => {
        b.hidden = locked(SETS.find(d => d.id === b.dataset.set) || {});
      });
      // un titre de groupe suivi de boutons de rubrique (data-set) ou de blocs de Maintenance / Installation (data-mt,
      // maintenance_page.js) : ces derniers comptaient pour rien, leur titre disparaissait au premier clic et les deux
      // groupes se collaient
      root.querySelectorAll('.da-nav h3').forEach(h => {
        let n = h.nextElementSibling,
          any = false;
        for (; n && n.matches('[data-set], [data-mt]'); n = n.nextElementSibling) any ||= !n.hidden;
        h.hidden = !any;
      });
    }
    // rubriques de settings_panels.js (textes composés dans la langue courante) : refaites au changement de langue
    window.addEventListener('repository-language-change', () => {
      const set = SETS.find(d => d.id === current.id);
      if (set?.render && !dirty && !root.querySelector('.da-main').hidden) show();
    });
    window.addEventListener('cpco-access-change', () => {
      lockNav();
      if (locked(SETS.find(d => d.id === current.id) || {})) current.id = 'cpco';
      if (!root.querySelector('.da-main').hidden) show();
    });

    /** Affiche la base choisie (rubrique du Centre si elle est verrouillée) : titre, présentation, mode d'emploi,
     *  puis éditeur (tableaux) ou panneau dédié. */
    function show() {
      let set = SETS.find(d => d.id === current.id) || SETS[0];
      if (locked(set)) set = SETS.find(d => d.id === 'cpco') || set;
      current.id = set.id;
      lockNav();
      // rubrique Maintenance (maintenance_page.js) : ses blocs se masquent quand une base est affichée
      root.querySelector('.da-main').hidden = false;
      window.dispatchEvent(new CustomEvent('data-admin-show', {
        detail: {
          id: set.id
        }
      }));
      root.querySelectorAll('[data-set]').forEach(b => b.classList.toggle('active', b.dataset.set === set.id));
      root.querySelector('.da-main h2').textContent = set.title + (set.file ? ` — ${set.file}` : set.key ? ` — ${set.key}` : '');
      root.querySelector('.da-intro').textContent = set.intro || '';
      const howto = root.querySelector('.da-howto');
      howto.hidden = !set.howto;
      howto.querySelector('div').innerHTML = set.howto || '';
      const body = root.querySelector('.da-body');
      body.innerHTML = '';
      // rubrique de shared/settings_panels.js : sa propre interface, avec les outils de la page
      if (set.render) return set.render(body, {
        status,
        actions,
        changed,
        /** Modifications enregistrées par la rubrique : plus de garde au départ de la page. */
        saved: () => {
          dirty = false;
        },
        show,
        /** Ouvre la rubrique id (adresse ?base=id). */
        open: id => {
          current.id = id;
          history.replaceState(null, '', `?base=${id}`);
          show();
        }
      });
      if (set.custom) return set.id === 'cpco' ? cpcoSettings(body) : set.id === 'planner' ? plannerSettings(body) : set.id === 'send' ?
        sendSettings(body) : set.id === 'defaLog' ? defaLog(body) : set.id === 'merges' ? merges(body) : ledgers(body);
      if (set.file) {
        const w = work[set.id];
        status(w.local ? `${T('Modifications locales du', 'Local changes from')} ${new Date(w.local).toLocaleString()} (${T('prioritaires dans ce navigateur, pas encore dans le dépôt', 'active in this browser, not yet in the repository')})` : T('Contenu du fichier du dépôt', 'Repository file content'));
        set.tables().forEach(table => {
          if (table.title) body.insertAdjacentHTML('beforeend', `<h3>${esc(table.title)}</h3>`);
          const host = document.createElement('div');
          body.append(host);
          grid(host, {
            columns: table.columns,
            data: table.data,
            onChange: changed
          });
        });
        // flotte : appareils du reporting (case « personnel »), types et mise à jour depuis le site (fleet_reporting.js)
        if (set.id === 'fleet' && window.FleetReporting) {
          const rep = document.createElement('div');
          body.append(rep);
          window.FleetReporting.mount(rep, {
            rows: w.data.rows,
            onChange: () => {
              changed();
              show();
            }
          });
        }
        actions([
          ...(set.id === 'fleet' ? [
            [T('Coller la page Flotte du site…', 'Paste the website Fleet page…'), () => fleetPasteDialog(page => {
              const r = mergeFleet(w.data.rows, page);
              w.data.rows.splice(0, w.data.rows.length, ...r.rows);
              changed();
              show();
              status(T('Page Flotte lue', 'Fleet page read') + ` : ${r.updated} ${T('appareils mis à jour', 'aircraft updated')}, ${r.added} ${T('ajoutés', 'added')}, ${r.kept} ${T('conservés (absents de la page)', 'kept (not on the page)')} — ${T('vérifier, puis « Enregistrer dans le dépôt »', 'check, then “Save to repository”')}`);
            }), 'primary']
          ] : []),
          [T('Appliquer dans ce navigateur', 'Apply in this browser'), async () => {
            const stamp = now();
            write(set.overrideKey, {
              updatedAt: stamp,
              data: await set.overlay(stamp)
            });
            w.local = stamp;
            dirty = false;
            status(`${T('Appliqué dans ce navigateur', 'Applied in this browser')} (${new Date(stamp).toLocaleString()}) — ${T('pensez à l’enregistrer dans le dépôt', 'remember to save it to the repository')}`);
          }, 'primary'],
          [T('Enregistrer dans le dépôt', 'Save to repository'), async () => {
            const stamp = now(),
              files = await set.files(stamp);
            for (const [path, text] of files) await writeRepoFile(path, text);
            // Même date que le fichier : ignorée dès que le nouveau fichier est chargé.
            write(set.overrideKey, {
              updatedAt: stamp,
              data: await set.overlay(stamp)
            });
            w.local = '';
            dirty = false;
            status(`${T('Enregistré dans le dépôt', 'Saved to repository')} : ${files.map(f => f[0]).join(', ')} — ${T('à committer', 'to be committed')}`);
          }],
          [T('Télécharger', 'Download'), async () => {
            const files = await set.files(now());
            files.forEach(([path, text]) => download(path.split('/').pop(), text, path.endsWith('.json') ? 'application/json' :
              'text/javascript'));
          }],
          [T('Annuler les modifications', 'Discard changes'), () => {
            loadWork();
            dirty = false;
            show();
          }],
          [T('Revenir au fichier du dépôt', 'Back to repository file'), async () => {
            if (!await window.AppFramework.ask(T('Supprimer les modifications locales de cette base ?',
                'Delete local changes of this base?'))) return;
            localStorage.removeItem(set.overrideKey);
            loadWork();
            dirty = false;
            show();
          }]
        ]);
        return;
      }
      // Données du navigateur : objet par clé ou tableau.
      const raw = read(set.key) || (set.array ? [] : {}),
        list = set.array ? raw.map(r => ({
          ...r
        })) : Object.values(raw).map(r => ({
          ...r
        }));
      status(window.RepositoryKit.tf(['{n} entrées', '{n} entries', '{n} Einträge', '{n} entradas'], {
        n: list.length
      }));
      grid(body, {
        columns: set.columns,
        data: list,
        onChange: changed
      });
      const buttons = [
        [T('Enregistrer', 'Save'), () => {
          const value = set.array ? list.filter(r => Object.values(r).some(Boolean)) : Object.fromEntries(list.filter(r => set.byKey(
            r)).map(r => [set.byKey(r), {
            ...(raw[set.byKey(r)] || {}),
            ...r
          }]));
          write(set.key, value);
          dirty = false;
          status(`${T('Enregistré dans le navigateur', 'Saved in the browser')} (${set.key})`);
        }, 'primary'],
        [T('Annuler les modifications', 'Discard changes'), () => {
          dirty = false;
          show();
        }]
      ];
      if (set.integrate) buttons.push([T('Intégrer à la base du dépôt', 'Integrate into repository base'), () => {
        const target = set.integrate(list);
        dirty = false;
        current.id = target;
        history.replaceState(null, '', `?base=${target}`);
        show();
        changed();
      }]);
      actions(buttons);
    }

    // Base : import du journal des vols, analyse des séries d'indicatifs (ajout / complément
    // de la table de correspondance), consultation filtrée, export, effacement.
    function defaLog(body) {
      const D = window.DefaFlightLog,
        data = D.load(),
        list = data.records || [];
      /** Texte en majuscules ; clean : lettres et chiffres seulement (comparaison des indicatifs). */
      const up = v => String(v ?? '').trim().toUpperCase(),
        clean = v => up(v).replace(/[^A-Z0-9]/g, '');
      /** Durée en minutes → « h HH ». */
      const hours = m => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`;
      body.innerHTML = `<div class="row da-defa-import"><button type="button" class="primary" data-defa-load>${esc(T('Charger / mettre à jour le journal (page « Log des vols » copiée ou enregistrée)…', 'Load / update the log (copied or saved “Log des vols” page)…'))}</button></div>
        <p class="small da-defa-stats"></p>
        <h3>${esc(T('Séries d’indicatifs', 'Callsign series'))}</h3><p class="small">${esc(T('Formes vues ramenées à une série (fautes, suffixes de patrouille : lettre, couleur, alphabet OTAN). « Ajouter » crée la ligne dans la correspondance des indicatifs (à vérifier : indicatif complet, organisme), « Compléter » y ajoute les formes et types vus.', 'Seen forms grouped into series (typos, patrol suffixes). “Add” creates the row in the callsign correspondence (check the full callsign and organisation), “Complete” adds the seen forms and types.'))}</p>
        <div class="da-defa-series"></div>
        <h3>${esc(T('Vols', 'Flights'))}</h3><div class="row"><input type="search" class="da-defa-filter" placeholder="${esc(T('Filtrer (indicatif, immatriculation, pilote, terrain, mission…)', 'Filter (callsign, registration, pilot, aerodrome, mission…)'))}"></div><div class="da-defa-flights"></div>`;
      // Chargement / mise à jour : même fenêtre que les reportings (copier-coller ou page enregistrée ;
      // fusion sans doublon par défaut, l'historique s'accumule).
      body.querySelector('[data-defa-load]').onclick = () => D.loaderDialog({
        onLoaded: data => {
          status(`${data.records.length} ${T('vols dans le journal', 'flights in the log')} (+${data.added})`);
          defaLog(body);
        }
      });
      if (!list.length) {
        body.querySelector('.da-defa-stats').textContent = T('Aucun journal chargé dans ce navigateur.',
          'No log loaded in this browser.');
        actions([]);
        return;
      }
      const dates = list.map(r => r.date).sort(),
        minutes = list.reduce((a, r) => a + (r.durationMin || 0), 0);
      /** Nombre de valeurs distinctes d'un champ dans le journal chargé. */
      const count = key => new Set(list.map(r => r[key]).filter(Boolean)).size;
      body.querySelector('.da-defa-stats').textContent = `${data.source || '—'} · ${T('chargé le', 'loaded on')} ${new Date(data.importedAt).toLocaleString()} · ${list.length} ${T('vols', 'flights')} · ${dates[0]} → ${dates[dates.length - 1]} · ${hours(minutes)} · ${count('trigram')} ${T('pilotes', 'pilots')} · ${count('registration')} ${T('appareils', 'aircraft')} · ${count('type')} types`;
      // Séries : état dans la table de correspondance (indicatif, forme plan de vol ou autre forme).
      const table = () => work.callsigns.data.table;
      /** Entrée de la table de correspondance qui couvre une série (indicatif, forme plan de vol ou autre forme). */
      const entryOf = s => table().find(e => [e.prefix, e.fpl, ...(e.aliases || [])].map(clean).some(f => f === s.prefix || s.forms.has(
        f)));
      const series = D.series(list);
      // Types réellement employés par la série : au moins 2 vols ou 20 % des vols.
      const topTypes = s => {
        const per = new Map();
        s.types.forEach((n, t) => {
          const k = t.split(' ')[0];
          per.set(k, (per.get(k) || 0) + n);
        });
        return [...per].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 2 || n >= 0.2 * s.count).map(([t]) => t).slice(0, 4);
      };
      const rows = series.map(s => {
        const e = entryOf(s),
          forms = [...s.forms].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} (${n})`).join(', ');
        const numbers = [...s.numbers].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
        const types = [...s.types].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`).join(', ');
        // Désignateurs génériques et indicatifs de fonction (FAF, COTAM…) : pas de types de série.
        const missing = e ? {
          forms: [...s.forms.keys()].filter(f => ![e.prefix, e.fpl, ...(e.aliases || [])].map(clean).includes(f)),
          types: e.generic || e.role ? [] : topTypes(s).filter(t => !(e.types || []).map(up).includes(t))
        } : null;
        const state = !e ? `<button type="button" class="primary" data-defa-add="${esc(s.prefix)}">${esc(T('Ajouter', 'Add'))}</button>` :
          missing.forms.length || missing.types.length ? `<button type="button" data-defa-fill="${esc(s.prefix)}" title="${esc([...missing.forms, ...missing.types].join(', '))}">${esc(T('Compléter', 'Complete'))} (${esc(e.prefix)})</button>` : `✓ ${esc(e.prefix)}`;
        return `<tr><td><b>${esc(s.prefix)}</b></td><td>${esc(forms)}</td><td class="num">${s.count}</td><td title="${esc(numbers.join(' '))}">${numbers.length ? `${numbers.length} : ${esc(numbers.slice(0, 8).join(' '))}${numbers.length > 8 ? '…' : ''}` : '—'}</td><td>${esc([...s.suffixes].join(' ') || '—')}</td><td>${esc(types)}</td><td>${esc(s.first)} → ${esc(s.last)}</td><td>${state}</td></tr>`;
      }).join('');
      body.querySelector('.da-defa-series').innerHTML = `<table class="da-table"><thead><tr><th>${esc(T('Série', 'Series'))}</th><th>${esc(T('Formes vues (vols)', 'Seen forms (flights)'))}</th><th>${esc(T('Vols', 'Flights'))}</th><th>${esc(T('Numéros', 'Numbers'))}</th><th>${esc(T('Suffixes', 'Suffixes'))}</th><th>Types</th><th>${esc(T('Période', 'Period'))}</th><th>${esc(T('Correspondance', 'Correspondence'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
      /** Passe à la table des indicatifs (depuis le journal), séries manquantes proposées. */
      const toCallsigns = () => {
        current.id = 'callsigns';
        history.replaceState(null, '', '?base=callsigns');
        show();
        changed();
        status(T(
          'Correspondance des indicatifs modifiée : vérifier, puis « Appliquer dans ce navigateur » ou « Enregistrer dans le dépôt ».',
          'Callsign correspondence changed: check, then apply or save.'));
      };
      body.querySelectorAll('[data-defa-add]').forEach(b => b.onclick = () => {
        const s = series.find(x => x.prefix === b.dataset.defaAdd),
          forms = [...s.forms].sort((a, c) => c[1] - a[1]).map(([f]) => f);
        const fpl = forms.filter(f => f.length <= 7).sort((a, c) => (s.forms.get(c) - s.forms.get(a)))[0] || s.prefix.slice(0, 7);
        table().push({
          prefix: s.prefix,
          fpl,
          aliases: forms.filter(f => f !== s.prefix && f !== fpl),
          operator: '',
          designator: '',
          types: topTypes(s),
          note: `${T('journal', 'Log')} ${s.first} → ${s.last} : ${s.count} ${T('vols', 'flights')}${s.suffixes.size ? ` · ${T('suffixes', 'suffixes')} ${[...s.suffixes].join(' ')}` : ''}`
        });
        toCallsigns();
      });
      body.querySelectorAll('[data-defa-fill]').forEach(b => b.onclick = () => {
        const s = series.find(x => x.prefix === b.dataset.defaFill),
          e = entryOf(s);
        e.aliases = [...new Set([...(e.aliases || []), ...[...s.forms.keys()].filter(f => ![e.prefix, e.fpl].map(clean).includes(
          f))])];
        e.types = [...new Set([...(e.types || []).map(up), ...topTypes(s)])];
        toCallsigns();
      });
      // Vols : filtre plein texte, 300 lignes affichées.
      const flights = body.querySelector('.da-defa-flights'),
        filter = body.querySelector('.da-defa-filter');
      /** Tableau des vols filtré (300 premiers affichés). */
      const paint = () => {
        const q = up(filter.value),
          shown = (q ? list.filter(r => up(Object.values(r).join(' ')).includes(q)) : list);
        flights.innerHTML = `<p class="small">${shown.length} ${T('vols', 'flights')}${shown.length > 300 ? ` — ${T('300 premiers affichés', 'first 300 shown')}` : ''}</p><table class="da-table"><thead><tr>${['Date', T('Durée', 'Duration'), T('Pilote', 'Pilot'), T('Indicatif', 'Callsign'), T('Immat.', 'Reg.'), 'Type', T('Départ', 'Dep.'), T('Arrivée', 'Arr.'), 'Mission'].map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${shown.slice(0, 300).map(r => `<tr><td>${esc(r.date)} ${esc(r.time)}</td><td>${r.durationMin == null ? '—' : hours(r.durationMin)}</td><td>${esc(r.trigram)}</td><td>${esc(r.callsign)}</td><td>${r.fleetId && window.RepositoryNav?.vaUrl?.('aircraft', { id: r.fleetId }) ? `<a href="${esc(window.RepositoryNav.vaUrl('aircraft', { id: r.fleetId }))}" target="_blank" rel="noopener">${esc(r.registration)}</a>` : esc(r.registration)}</td><td>${esc([r.type, r.variant].filter(Boolean).join(' '))}</td><td>${esc(r.dep)}</td><td>${esc(r.arr)}</td><td>${esc(r.mission)}</td></tr>`).join('')}</tbody></table>`;
      };
      filter.oninput = paint;
      paint();
      actions([
        [T('Mettre à jour la référence (anonymisée)', 'Update the reference (anonymised)'), () => {
          work.defaReference.data = D.reference(list, work.defaReference.data);
          current.id = 'defaReference';
          history.replaceState(null, '', '?base=defaReference');
          show();
          changed();
          status(T(
            'Référence complétée depuis le journal : vérifier, puis « Enregistrer dans le dépôt » (data/references/defa_reference.js).',
            'Reference completed from the log: check, then save to repository.'));
        }, 'primary'],
        [T('Exporter en CSV', 'Export CSV'), () => download('defa_log_des_vols.csv', D.toCsv(list), 'text/csv')],
        [T('Exporter en JSON (rechargeable)', 'Export JSON (reloadable)'), () => download('defa_log_des_vols.json', JSON.stringify({
          source: data.source,
          importedAt: data.importedAt,
          records: list
        }, null, 1), 'application/json')],
        [T('Effacer la base de ce navigateur', 'Clear the base from this browser'), async () => {
          if (!await window.AppFramework.ask(T('Effacer le journal des vols de ce navigateur ? (rechargeable depuis le fichier)',
              'Clear the flight log from this browser? (reloadable from the file)'))) return;
          D.clear();
          status(T('Base effacée', 'Base cleared'));
          defaLog(body);
        }]
      ]);
    }

    // Planificateur carburant : altitude maximale sans oxygène d'un avion non pressurisé (fpOxygenAltFt:v1).
    function plannerSettings(body) {
      const KEY = 'fpOxygenAltFt:v1',
        cur = +read(KEY) > 0 ? +read(KEY) : 10000;
      body.innerHTML = `<div class="da-form"><label>${esc(T('Altitude maximale sans oxygène (ft)', 'Maximum altitude without oxygen (ft)'))}<input type="number" min="1000" max="30000" step="500" data-oxy value="${cur}"></label></div>
        <p class="small">${esc(T('Repères : 10 000 ft (usage courant, EASA NCO), 12 500 ft (FAA, équipage au-delà de 30 minutes), 14 000 ft (FAA, équipage en permanence).', 'Benchmarks: 10,000 ft (common practice, EASA NCO), 12,500 ft (FAA, crew beyond 30 minutes), 14,000 ft (FAA, crew at all times).'))}</p>`;
      const input = body.querySelector('[data-oxy]');
      input.oninput = changed;
      status(`${T('Valeur actuelle', 'Current value')} : ${cur} ft`);
      actions([
        [T('Enregistrer', 'Save'), () => {
          const v = Math.round(+input.value);
          if (!(v >= 1000 && v <= 30000)) {
            status(T('Valeur entre 1000 et 30 000 ft', 'Value between 1,000 and 30,000 ft'));
            return;
          }
          write(KEY, v);
          dirty = false;
          status(T('Enregistré dans ce navigateur', 'Saved in this browser'));
        }, 'primary'],
        [T('Valeur par défaut (10 000 ft)', 'Default value (10,000 ft)'), () => {
          localStorage.removeItem(KEY);
          input.value = 10000;
          dirty = false;
          status(T('Valeur par défaut rétablie', 'Default value restored'));
        }]
      ]);
    }

    // Centre (CPCO) : activation par mot de passe (RepositoryNav.cpco), puis réglages du Centre (calcul des routes).
    function cpcoSettings(body) {
      const access = window.RepositoryNav?.cpco;
      /** Texte traduit à la source (K.t, quatre langues) : la carte n'ajoute rien à la traduction après coup. */
      const tt = (...row) => window.RepositoryKit.t(row);
      /** Texte d'un élément, écrit seulement s'il change. */
      const setText = (el, v) => {
        if (el && el.textContent !== v) el.textContent = v;
      };
      if (!access) {
        body.textContent = T('Accès au Centre indisponible (menu commun non chargé).',
          'Centre access unavailable (common menu not loaded).');
        return;
      }
      /** Ligne du mode (autonome : mot de passe ; groupe : à venir) et mot de passe affiché, posés dans les éléments
       *  [data-cpco-mode] et [data-cpco-shown] du panneau (textContent : la valeur vient du dépôt partagé). */
      const centreInfo = async () => {
        const c = await access.config?.(true) || {};
        const m = body.querySelector('[data-cpco-mode]'),
          s = body.querySelector('[data-cpco-shown]');
        setText(m, c.mode === 'groupe' ?
          tt('Mode groupe : accès au Centre par le rôle d’administrateur du registre signé.',
            'Group mode: Centre access through the administrator role of the signed registry.',
            'Gruppenmodus: Zugang zum Zentrum über die Administratorrolle des signierten Registers.',
            'Modo grupo: acceso al Centro por el rol de administrador del registro firmado.') :
          tt(
            'Mode autonome : accès au Centre par le mot de passe du {SOG} (verrou d’usage, pas une protection). Mode groupe (registre signé, accès par le rôle) : à venir.',
            'Standalone mode: Centre access through the {SOG} password (a usage lock, not a protection). Group mode (signed registry, access by role): coming.',
            'Eigenständiger Modus: Zugang zum Zentrum mit dem Passwort der {SOG} (eine Nutzungssperre, kein Schutz). Gruppenmodus (signiertes Register, Zugang über die Rolle): folgt.',
            'Modo autónomo: acceso al Centro con la contraseña del {SOG} (un bloqueo de uso, no una protección). Modo grupo (registro firmado, acceso por el rol): próximamente.'
          ));
        setText(s, c.motDePasse || '');
        const i = body.querySelector('[data-cpco-new]');
        if (i && !i.value) i.value = c.motDePasse || '';
      };
      if (!access.enabled()) {
        body.innerHTML = `<p class="small" data-cpco-mode></p><div class="da-form"><label>${esc(tt('Mot de passe du Centre', 'Centre password', 'Passwort des Zentrums', 'Contraseña del Centro'))}<input type="password" autocomplete="off" data-cpco-pwd></label></div><p><button type="button" class="primary" data-cpco-go>${esc(tt('Activer le Centre', 'Enable the Centre', 'Zentrum aktivieren', 'Activar el Centro'))}</button> <span class="small">${esc(tt('Mot de passe :', 'Password:', 'Passwort:', 'Contraseña:'))} <b data-cpco-shown></b></span></p><p class="small">${esc(tt('Partagé avec les données (data/config/centre.json), modifiable une fois le Centre activé.', 'Shared with the data (data/config/centre.json), can be changed once the Centre is enabled.', 'Mit den Daten geteilt (data/config/centre.json), änderbar, sobald das Zentrum aktiviert ist.', 'Compartida con los datos (data/config/centre.json), modificable una vez activado el Centro.'))}</p>`;
        centreInfo();
        const input = body.querySelector('[data-cpco-pwd]');
        /** Déverrouille le Centre avec le mot de passe saisi, sinon message et nouvelle saisie. */
        const go = async () => {
          if (await access.unlock(input.value)) {
            status(tt('Centre activé dans ce navigateur', 'Centre enabled in this browser', 'Zentrum in diesem Browser aktiviert',
              'Centro activado en este navegador'));
            show();
          } else {
            input.value = '';
            status(tt('Mot de passe incorrect', 'Wrong password', 'Falsches Passwort', 'Contraseña incorrecta'));
            input.focus();
          }
        };
        input.onkeydown = e => {
          if (e.key === 'Enter') go();
        };
        body.querySelector('[data-cpco-go]').onclick = go;
        status(tt('Centre verrouillé', 'Centre locked', 'Zentrum gesperrt', 'Centro bloqueado'));
        actions([]); // bouton sous le champ, mot de passe sur sa ligne (pas dans la barre d'actions, au-dessus du champ)
        return;
      }
      const R = window.MissionRouting,
        S = R?.settings?.() || {};
      const FIELDS = [
        ['minNm', T('Tronçon routé à partir de (NM)', 'Routed leg from (NM)')],
        ['ifrMinFt', T('Voies aériennes à partir de (ft)', 'Airways from (ft)')],
        ['lowMaxFt', T('Basse hauteur jusqu’à (ft)', 'Low level up to (ft)')],
        ['reachNm', T('Entrée / sortie des voies (NM)', 'Airway entry / exit (NM)')],
        ['reachRtbaNm', T('Entrée / sortie du RTBA (NM)', 'RTBA entry / exit (NM)')],
        ['detourPct', T('Détour admis, voies (%)', 'Allowed detour, airways (%)')],
        ['detourRtbaPct', T('Détour admis, RTBA (%)', 'Allowed detour, RTBA (%)')]
      ];
      const modeHtml = `<h3>${esc(tt('Mode et accès', 'Mode and access', 'Modus und Zugang', 'Modo y acceso'))}</h3><p class="small" data-cpco-mode></p><div class="da-form"><label>${esc(tt('Mot de passe du Centre (partagé avec les données)', 'Centre password (shared with the data)', 'Passwort des Zentrums (mit den Daten geteilt)', 'Contraseña del Centro (compartida con los datos)'))}<input type="text" autocomplete="off" spellcheck="false" data-cpco-new></label></div><p><button type="button" data-cpco-save>${esc(tt('Enregistrer le mot de passe', 'Save the password', 'Passwort speichern', 'Guardar la contraseña'))}</button></p>`;
      body.innerHTML = modeHtml + (R ? `<h3>${esc(T('Calcul des routes de transit', 'Transit route calculation'))}</h3><div class="da-form">${FIELDS.map(([k, l]) => `<label>${esc(l)}<input type="number" min="0" step="any" data-rs="${k}" value="${esc(S[k] ?? '')}" placeholder="${esc(R.DEFAULTS[k])}"></label>`).join('')}</div>` : `<p class="small">${esc(T('Calcul des routes non chargé.', 'Route calculation not loaded.'))}</p>`);
      body.querySelectorAll('[data-rs]').forEach(i => i.oninput = changed);
      centreInfo();
      body.querySelector('[data-cpco-save]').onclick = async () => {
        const v = body.querySelector('[data-cpco-new]').value.trim();
        if (!v) return status(tt('Mot de passe vide : non enregistré', 'Empty password: not saved',
          'Leeres Passwort: nicht gespeichert',
          'Contraseña vacía: no guardada'));
        const r = await access.setPassword(v);
        status(!r.ok ? tt('Mot de passe non enregistré', 'Password not saved', 'Passwort nicht gespeichert',
            'Contraseña no guardada') :
          r.where === 'data' ?
          tt('Mot de passe enregistré dans les données : il part au prochain « Synchroniser »',
            'Password saved in the data: it goes out at the next “Synchronise”',
            'Passwort in den Daten gespeichert: es geht beim nächsten „Synchronisieren“ hinaus',
            'Contraseña guardada en los datos: sale en la próxima «Sincronizar»') :
          tt('Mot de passe gardé dans ce navigateur : dossier des données à autoriser pour l’écrire',
            'Password kept in this browser: authorise the data folder to write it',
            'Passwort in diesem Browser behalten: den Datenordner freigeben, um es zu schreiben',
            'Contraseña guardada en este navegador: autorice la carpeta de datos para escribirla'));
        centreInfo();
      };
      status(T('Centre activé dans ce navigateur', 'Centre enabled in this browser'));
      actions([
        ...(R ? [
          [T('Enregistrer', 'Save'), () => {
            R.setSettings(Object.fromEntries([...body.querySelectorAll('[data-rs]')].map(i => [i.dataset.rs, i.value])));
            dirty = false;
            status(T('Réglages enregistrés dans ce navigateur', 'Settings saved in this browser'));
          }, 'primary'],
          [T('Valeurs par défaut', 'Default values'), () => {
            R.setSettings(Object.fromEntries(FIELDS.map(([k]) => [k, ''])));
            dirty = false;
            show();
          }]
        ] : []),
        [tt('Verrouiller le Centre', 'Lock the Centre', 'Zentrum sperren', 'Bloquear el Centro'), () => {
          access.lock();
          dirty = false;
          show();
        }]
      ]);
    }

    // Envoi des CR : adresse, en-tête, schéma et clef du webservice (encore à définir).
    function sendSettings(body) {
      const config = {
        header: 'Authorization',
        scheme: 'Bearer',
        ...(read('missionSendConfig:v1') || {})
      };
      const fields = [
        ['url', T('Adresse du webservice (https://…)', 'Web service address (https://…)'), 'url'],
        ['header', T('En-tête de la clef', 'Key header'), 'text'],
        ['scheme', T('Préfixe (Bearer, vide pour la clef seule)', 'Prefix (Bearer, empty for the bare key)'), 'text'],
        ['key', T('Clef', 'Key'), 'password']
      ];
      body.innerHTML = `<div class="da-form">${fields.map(([k, label, type]) => `<label>${esc(label)}<input type="${type}" data-send="${k}" autocomplete="off" spellcheck="false"></label>`).join('')}</div>
        <p class="small">${esc(T('Exemples d’en-tête : Authorization (Bearer <clef>), X-API-Key (clef seule).', 'Header examples: Authorization (Bearer <key>), X-API-Key (bare key).'))}</p>`;
      /** Champ du panneau d'envoi des CR (url, header, scheme, clef). */
      const input = k => body.querySelector(`[data-send="${k}"]`);
      ['url', 'header', 'scheme'].forEach(k => {
        input(k).value = config[k] || '';
      });
      input('key').value = localStorage.getItem('missionSendKey:v1') || '';
      body.querySelectorAll('input').forEach(i => i.oninput = changed);
      const log = read('missionSendLog:v1') || {};
      status(`${Object.keys(log).length} ${T('CR envoyés depuis ce navigateur', 'reports sent from this browser')}`);
      actions([
        [T('Enregistrer', 'Save'), () => {
          const url = input('url').value.trim();
          if (url && !/^https?:\/\//i.test(url)) {
            status(T('Adresse invalide (http:// ou https://)', 'Invalid address (http:// or https://)'));
            return;
          }
          // la clef d'envoi part dans un en-tête : https obligatoire, sauf sur cette machine (essais)
          if (/^http:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(url)) {
            status(T('Adresse en https:// obligatoire (la clef d’envoi passerait en clair).',
              'https:// address required (the sending key would travel in clear).'));
            return;
          }
          write('missionSendConfig:v1', {
            url,
            header: input('header').value.trim() || 'Authorization',
            scheme: input('scheme').value.trim()
          });
          const key = input('key').value.trim();
          if (key) localStorage.setItem('missionSendKey:v1', key);
          else localStorage.removeItem('missionSendKey:v1');
          dirty = false;
          status(T('Enregistré dans ce navigateur', 'Saved in this browser'));
        }, 'primary'],
        [T('Oublier la clef', 'Forget the key'), () => {
          localStorage.removeItem('missionSendKey:v1');
          input('key').value = '';
          status(T('Clef supprimée de ce navigateur', 'Key removed from this browser'));
        }]
      ]);
    }

    // Fusions / renommages : équivalences A → B, boucles signalées, suppression.
    function merges(body) {
      const G = window.MissionGridEdit;
      if (!G) {
        body.textContent = T('Module de fusion absent de cette page.', 'Merge module missing on this page.');
        return;
      }
      /** Liste des fusions / renommages (A → B), boucles signalées. */
      const draw = () => {
        const map = G.mergeMap(),
          rows = ['crew', 'aircraft'].flatMap(kind => {
            const m = map[kind] || {},
              bad = new Set(G.loops(m));
            return Object.entries(m).map(([from, to]) => ({
              kind,
              from,
              to,
              end: G.resolve(m, from),
              loop: bad.has(from)
            }));
          });
        body.innerHTML = rows.length ? `<table class="da-table"><thead><tr><th>${esc(T('Type', 'Type'))}</th><th>${esc(T('Ancien', 'Old'))}</th><th>${esc(T('Devient', 'Becomes'))}</th><th>${esc(T('Résultat', 'Result'))}</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr${r.loop ? ' style="background:#fee2e2"' : ''}><td>${esc(r.kind === 'crew' ? T('Pilote', 'Pilot') : T('Appareil', 'Aircraft'))}</td><td><b>${esc(r.from)}</b></td><td>${esc(r.to)}</td><td>${r.loop ? `⚠ ${esc(T('boucle', 'loop'))}` : esc(r.end)}</td><td><button type="button" class="secondary" data-unmerge="${i}">${esc(T('Supprimer', 'Delete'))}</button></td></tr>`).join('')}</tbody></table>` : `<p class="small">${esc(T('Aucune fusion mémorisée.', 'No stored merge.'))}</p>`;
        body.querySelectorAll('[data-unmerge]').forEach(b => b.onclick = async () => {
          const r = rows[+b.dataset.unmerge];
          if (!await window.AppFramework.ask(`${T('Supprimer l’équivalence', 'Delete the equivalence')} ${r.from} → ${r.to} ?`)) return;
          G.unmerge(r.kind, r.from);
          status(`${r.from} → ${r.to} : ${T('supprimée', 'deleted')}`);
          draw();
        });
        const n = rows.filter(r => r.loop).length;
        status(n ? `${n} ${T('entrée(s) en boucle : les noms concernés sont échangés. Supprime l’une des deux, puis refais la fusion depuis la fiche.', 'looping entr(ies): the names are swapped. Delete one, then redo the merge from the sheet.')}` : `${rows.length} ${T('équivalence(s)', 'equivalence(s)')}`);
      };
      draw();
    }

    // Registres des missions : YAML par famille.
    async function ledgers(body) {
      const M = window.MissionModel,
        families = window.MissionVocab.families,
        L = window.MissionLedger;
      await L.load(true);
      const store = L.store;
      body.innerHTML = `<p class="small"></p><table class="da-table"><thead><tr><th>${esc(T('Famille', 'Family'))}</th><th>${esc(T('Missions', 'Missions'))}</th><th></th></tr></thead><tbody></tbody></table><div class="da-yaml" hidden><h3></h3><textarea spellcheck="false"></textarea><div class="row"><button type="button" class="primary" data-yaml="save"></button><button type="button" class="secondary" data-yaml="close"></button></div></div>`;
      /** Résumé du registre des missions : fichier, nombre de missions, source. */
      const info = () => {
        body.querySelector('p.small').textContent = `${L.FILE} (CR) · ${store.missions.length} ${T('missions', 'missions')} · ${T('source', 'source')} : ${store.source}${store.folder ? ` (${store.folder})` : ''} · ${T('mis à jour', 'updated')} ${store.updatedAt ? new Date(store.updatedAt).toLocaleString() : '—'}${Object.keys(store.legacyImported || {}).length ? ` · ${T('anciens registres repris', 'legacy ledgers merged')} : ${Object.keys(store.legacyImported).join(', ')}` : ''}`;
      };
      info();
      const tbody = body.querySelector('tbody'),
        editor = body.querySelector('.da-yaml'),
        area = editor.querySelector('textarea');
      editor.querySelector('[data-yaml="save"]').textContent = T('Contrôler et enregistrer', 'Check and save');
      editor.querySelector('[data-yaml="close"]').onclick = () => {
        editor.hidden = true;
        dirty = false;
      };
      editor.querySelector('[data-yaml="close"]').textContent = T('Fermer', 'Close');
      /** Texte du résultat d'un enregistrement de registre (fichier écrit ou navigateur seulement). */
      const result = r => `${r.written ? `${T('fichier', 'file')} ${store.folder}/${L.FILE}` : T('navigateur (dossier « CR » non autorisé : « Dossier du registre… »)', 'browser (“CR” folder not authorised: “Ledger folder…”)')}`;
      // Éditeur YAML : registre complet (family absent) ou missions d'une famille.
      function edit(familyId) {
        const view = familyId ? L.open({
          id: familyId
        }) : null;
        editor.hidden = false;
        editor.querySelector('h3').textContent = familyId ? `${familyId} — ${L.FILE}` : `${T('Registre complet', 'Full ledger')} — ${L.FILE}`;
        area.value = M.toYaml({
          schemaVersion: M.SCHEMA_VERSION,
          updatedAt: store.updatedAt,
          missions: view ? view.missions : store.missions
        }, familyId ? `Missions ${familyId}` : 'Registre des missions — toutes familles');
        area.oninput = changed;
        editor.querySelector('[data-yaml="save"]').onclick = async () => {
          let data;
          try {
            data = window.jsyaml.load(area.value, {
              schema: window.jsyaml.CORE_SCHEMA
            });
          } catch (e) {
            status(`${T('YAML invalide', 'Invalid YAML')} : ${e.message}`);
            return;
          }
          const missions = Array.isArray(data) ? data : data?.missions;
          if (!Array.isArray(missions)) {
            status(T('YAML sans liste « missions ».', 'YAML without a “missions” list.'));
            return;
          }
          if (!familyId && missions.some(m => !m?.family)) {
            status(T('Registre complet : chaque mission doit avoir sa famille (family).',
              'Full ledger: each mission needs its family.'));
            return;
          }
          const parsed = missions.map(m => M.migrate(m, m.family || familyId));
          if (view) view.setMissions(parsed);
          else L.setAll(parsed);
          const r = await L.save();
          dirty = false;
          status(`${parsed.length} ${T('missions enregistrées', 'missions saved')} — ${result(r)}`);
          paint();
          info();
        };
        editor.scrollIntoView({
          behavior: 'smooth'
        });
      }

      /** Liste des registres par famille : nombre de missions, boutons d'édition (YAML) et d'export. */
      function paint() {
        tbody.innerHTML = '';
        families.forEach(f => {
          const view = L.open({
              id: f.id
            }),
            tr = document.createElement('tr');
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
        [T('Dossier du registre…', 'Ledger folder…'), async () => {
          await L.chooseFolder();
          await L.load(true);
          const r = await L.save();
          status(result(r));
          info();
          paint();
        }],
        [T('Télécharger le registre (YAML)', 'Download the ledger (YAML)'), () => L.downloadAll()],
        [T('Exporter en CSV (tableur)', 'Export CSV (spreadsheet)'), () => L.downloadAllCsv()]
      ]);
      status(T(
        'Registre unique : dossier autorisé, sinon copie du navigateur, sinon fichier du dépôt ; anciens registres par famille repris automatiquement.',
        'Single ledger: authorised folder, else browser copy, else repository file; legacy per-family ledgers merged automatically.'
      ));
    }

    if (current.id) show();
    else {
      // aucune rubrique à ouvrir à ce niveau : les blocs de maintenance_page.js prennent la place
      root.querySelector('.da-main').hidden = true;
      lockNav();
    }
    window.RepositoryContentI18n?.(rows);
    registered = true;
  }

  window.DataAdmin = {
    mount,
    render,
    DATASETS
  };
})();
