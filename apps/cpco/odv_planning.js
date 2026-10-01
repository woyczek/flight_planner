(() => {
  'use strict';
  // Planning ODV — interface de apps/cpco/odv_planning.html (lecture et règles : odv_core.js).
  // Le classeur n'est gardé qu'en mémoire (variable book) : rien dans le stockage du navigateur hormis les réglages
  // (odvPlanning:v1) ; « Effacer les données » le libère. Avertissements de lecture : notifications flottantes
  // (AppFramework.notify) et liste du rapport de lecture. Tableaux : SortedTable (shared/mission_table.js).
  const C = window.OdvCore;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  } [c]));
  const notify = (msg, kind) => window.AppFramework?.notify ? window.AppFramework.notify(msg, kind) : console.warn(msg);
  const KEY = 'odvPlanning:v1';
  const SHORT = ['M', 'A', 'S'];

  // ------------------------------------------------------------------ réglages (seules données mémorisées)
  const clone = o => JSON.parse(JSON.stringify(o));

  function loadSettings() {
    let s = {};
    try {
      s = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch {
      s = {};
    }
    const d = clone(C.DEFAULTS),
      out = {
        ...d,
        ...s
      };
    if (!Array.isArray(out.hours) || out.hours.length !== 3 || out.hours.some(h => !Array.isArray(h) || h.length !== 2)) out.hours = d.hours;
    if (!Array.isArray(out.preference)) out.preference = d.preference;
    return out;
  }
  const saveSettings = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* stockage indisponible */ }
  };
  let settings = loadSettings();

  // état de la page (mémoire seulement)
  let book = null,
    fileName = '',
    data = null,
    slots = [],
    basis = null, // données du calcul : classeur, sinon déclarations (declWeek)
    flights = [],
    selected = null;
  const view = {
    hideEmpty: false,
    color: '',
    role: '',
    sim: ''
  };
  const tables = {};

  // ------------------------------------------------------------------ semaine sans classeur
  // Sans classeur, la grille reste affichée : pilotes de la référence DEFA, semaine en cours, ligne du classeur vide
  // (« non renseigné »), déclarations des pilotes et affectations ; légende par défaut (OdvCore.LEGEND).
  let virtual = null;
  function emptyWeek() {
    if (virtual) return virtual;
    const now = new Date(),
      mon = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (now.getUTCDay() + 6) % 7);
    const dates = Array.from({
      length: 7
    }, (_, j) => new Date(mon + j * 864e5).toISOString().slice(0, 10));
    const tris = [...new Set((window.DEFA_REFERENCE?.pilots || []).map(x => String(x.trigram || '').toUpperCase()).filter(Boolean))].sort();
    const pilotes = tris.map((tr, i) => ({
      trigramme: tr,
      ligne: i + 1,
      couleur: null,
      rempli: false,
      profil: null
    }));
    const records = pilotes.flatMap(x => Array.from({
      length: 21
    }, (_, n) => ({
      pilote: x.trigramme,
      jourIndex: Math.floor(n / 3),
      creneauIndex: n % 3,
      categorie: 'inconnu',
      code: null,
      source: 'pas de classeur'
    })));
    const legende = Object.fromEntries(Object.entries(C.LEGEND).map(([k, v]) => [k, {
      code: k,
      sens: v[0],
      categorie: v[1],
      role: v[2],
      couleur: v[3],
      source: 'défaut'
    }]));
    return virtual = {
      virtuel: true,
      dates,
      pilotes,
      records,
      legende,
      flotte: {}
    };
  }
  /** Données du calcul (créneaux communs, missions probables, vols) : le classeur lu, sinon la semaine sans classeur
   *  remplie par les déclarations des pilotes (codes ODV, appareils → rôles, simulateurs) et les affectations (vols). */
  function declWeek() {
    const w = emptyWeek(),
      O = window.OdvAssign,
      M = window.MissionAssignments;
    const models = Object.fromEntries((M?.fleetTypes?.() || []).map(x => [x.type, x.model]));
    const flotte = {};
    for (const p of w.pilotes) {
      const d = O?.declaration?.(p.trigramme),
        types = [...new Set([...(d?.aircraft?.owned || []), ...(d?.aircraft?.mastered || [])])];
      p.profil = flotte[p.trigramme] = {
        trigramme: p.trigramme,
        ligne: p.ligne,
        types: types.map(type => ({
          type,
          niveau: null,
          retenu: true
        })),
        roles: [...C.rolesOfTypes(types.map(x => `${x} ${models[x] || ''}`).join(' / '))].sort(),
        sims: d?.sims || [],
        simNotes: [],
        vide: !types.length
      };
    }
    const records = w.records.map(r => {
      const d = O?.declared(r.pilote, r.jourIndex, r.creneauIndex);
      return d ? {
        ...r,
        code: d.code,
        sens: d.label,
        categorie: C.LEGEND[d.code]?.[1] || M?.LEGEND?.[d.code]?.[1] || 'inconnu',
        role_impose: C.LEGEND[d.code]?.[2] || null,
        source: 'déclaration du pilote'
      } : r;
    });
    for (const p of w.pilotes) p.rempli = records.some(r => r.pilote === p.trigramme && r.code);
    // vols : missions affectées de la semaine (un vol par mission et heure de décollage, convoyages à part)
    const vols = [];
    for (const a of O?.week() || []) {
      if (a.role === 'convoyage') continue;
      const at = new Date(a.takeoff),
        j = w.dates.indexOf(at.toISOString().slice(0, 10));
      if (j < 0) continue;
      const h0 = at.getUTCHours() + at.getUTCMinutes() / 60,
        h1 = Math.min(24, h0 + (+a.block_min || 120) / 60);
      const v = vols.find(x => x.mission === a.mission && x.jourIndex === j && x.h_debut === h0);
      if (v) {
        if (!v.equipage.includes(a.pilot)) v.equipage.push(a.pilot);
        continue;
      }
      vols.push({
        mission: a.mission,
        jourIndex: j,
        jour: C.DAYS[j],
        date: w.dates[j],
        h_debut: h0,
        h_fin: h1,
        debut: C.hhmm(h0),
        fin: C.hhmm(h1),
        dep: a.departure || '',
        arr: a.destination || a.departure || '',
        appareil: [a.aircraft?.type, a.aircraft?.registration].filter(Boolean).join(' '),
        objet: [a.mission, a.title].filter(Boolean).join(' '),
        indicatif: a.callsign || '',
        equipage: [a.pilot],
        roles_type: [...C.rolesOfTypes(`${a.aircraft?.type || ''} ${models[a.aircraft?.type] || ''}`)],
        texte: '',
        couloir: 'affectation'
      });
    }
    return {
      ...w,
      records,
      flotte,
      vols,
      evenements: [],
      frise: [],
      zones: [],
      theme: '',
      anomalies: []
    };
  }
  /** Données de la grille : le classeur lu, sinon la semaine sans classeur. */
  const gridData = () => data || emptyWeek();
  const pad2 = n => String(n).padStart(2, '0');
  /** Créneau (jour j, créneau k) : celui du plan, sinon un créneau vide (sans classeur) pour affecter quand même. */
  const slotOf = (j, k) => slots.find(x => x.jourIndex === j && x.creneauIndex === k) || {
    jourIndex: j,
    jour: C.DAYS[j],
    date: gridData().dates[j],
    creneauIndex: k,
    creneau: (C.SLOTS || ['matin', 'après-midi', 'soir'])[k],
    heures: `${pad2(settings.hours[k][0])}-${pad2(settings.hours[k][1])}z`,
    n: 0,
    pilotes: [],
    atc: [],
    eviter: [],
    missions: [],
    toutesMissions: []
  };

  // ------------------------------------------------------------------ outils d'affichage
  /** Nom complet d'un pilote s'il est connu localement (référence DEFA, champ nom facultatif), sinon ''. */
  function fullName(t) {
    const p = (window.DEFA_REFERENCE?.pilots || []).find(x => String(x.trigram || x.trigramme || '').toUpperCase() === t);
    if (!p) return '';
    return p.name || p.fullName || p.nom || [p.firstName || p.prenom, p.lastName].filter(Boolean).join(' ') || '';
  }
  /** Texte lisible (noir ou blanc) sur un fond hexadécimal. */
  function inkOn(hex) {
    if (!/^[0-9A-F]{6}$/i.test(hex || '')) return 'inherit';
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b > .35 ? '#111' : '#fff';
  }
  /** Étiquette d'un trigramme (couleur de sa forme dans l'ODV) et nom complet éventuel. */
  function tri(t, color, withName = true) {
    const c = color || data?.pilotes.find(p => p.trigramme === t)?.couleur || null,
      n = withName ? fullName(t) : '';
    return `<span class="odv-tri" style="--c:${c ? '#' + c : '#556'};--t:${inkOn(c)}">${esc(t)}</span>${n ? `<span class="odv-name">${esc(n)}</span>` : ''}`;
  }
  const dateFr = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
  const slotTitle = s => `${s.jour} ${dateFr(s.date)} — ${s.creneau} (${s.heures})`;
  /** Case de la grille : code en couleur de la légende, commentaire au survol. */
  function codeCell(r) {
    const e = r.code ? gridData().legende[r.code] : null,
      col = e?.couleur || null;
    const title = [r.code ? `${r.code}${r.marque ? ' + ' + r.marque : ''} : ${r.sens || C.CATEGORIES[r.categorie]}` : C.CATEGORIES[r.categorie], r.commentaire ? `« ${r.commentaire} »` : '', r.source].filter(Boolean).join('\n');
    const style = col ? ` style="background:#${col};color:${inkOn(col)}"` : '';
    const label = r.code ? r.code + (r.marque || '') : r.categorie === 'hors_legende' ? String(r.code_brut).trim() : '·';
    return `<span class="odv-code c-${r.categorie}${r.commentaire ? ' has-note' : ''}"${style} title="${esc(title)}">${esc(label)}</span>`;
  }
  /** Téléchargement local d'un texte (Blob). */
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], {
      type
    }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: name
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const baseName = () => (fileName || 'ODV').replace(/\.xlsx$/i, '');
  /** Tableau triable (créé une fois, puis lignes remplacées). */
  function table(id, opts, rows) {
    if (!tables[id]) tables[id] = window.SortedTable.render($(id), {
      ...opts,
      rows
    });
    else tables[id].setRows(rows);
  }

  function resetTable(id, html) {
    delete tables[id];
    $(id).innerHTML = html;
  }

  // ------------------------------------------------------------------ chargement
  async function loadFile(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) notify(`« ${file.name} » n’a pas l’extension .xlsx : lecture tentée quand même.`, 'warn');
    try {
      book = await C.openWorkbook(file);
      fileName = file.name;
      selected = null;
      await rebuild();
      announce();
    } catch (e) {
      console.error(e);
      notify(`Lecture impossible : ${e.message}`, 'err');
    }
  }
  /** Relit le classeur selon les réglages, recalcule créneaux et contrôles, redessine tout. */
  async function rebuild() {
    if (!book) return render();
    try {
      data = await C.extract(book, settings, fileName);
      compute();
      await window.OdvAssign?.load(data, settings).catch(e => console.warn(e)); // déclarations des pilotes, affectations
    } catch (e) {
      console.error(e);
      notify(`Analyse impossible : ${e.message}`, 'err');
      data = null;
    }
    render();
  }

  function compute() {
    basis = data || declWeek();
    if (data) window.MissionAssignments?.simulators?.(Object.values(data.flotte).flatMap(p => p.sims)); // liste des préférences pilote
    slots = C.plan(basis, settings);
    flights = C.checkFlights(basis, settings);
  }
  /** Sans classeur : calcul sur les déclarations et affectations, puis tout redessiner. */
  function refreshNoBook() {
    if (data) return;
    compute();
    render();
  }
  /** Notifications après chargement : résumé, décalage de date, avertissements, vols à vérifier. */
  function announce() {
    if (!data) return;
    const filled = data.pilotes.filter(p => p.rempli).length;
    notify(`${fileName} lu : S${data.semaine ?? '?'}, ${data.pilotes.length} pilotes (${filled} grille${filled > 1 ? 's' : ''} remplie${filled > 1 ? 's' : ''}), ${data.vols.length} vol${data.vols.length > 1 ? 's' : ''} sur la frise.`, 'ok');
    const shift = data.anomalies.find(a => a.decalage);
    if (shift) notify(shift.texte, 'warn');
    const warns = data.anomalies.filter(a => a.niveau === 'warn' && !a.decalage);
    if (warns.length === 1) notify(warns[0].texte, 'warn');
    else if (warns.length > 1) notify(`${warns.length} avertissements de lecture : voir le rapport du bloc « Classeur ODV ».`, 'warn');
    const bad = flights.filter(f => f.alertes.length);
    if (bad.length) notify(`${bad.length} vol${bad.length > 1 ? 's' : ''} de la frise à vérifier (équipier codé indisponible ou hors de son code) : voir « Vols de la frise horaire ».`, 'warn');
  }

  function clearAll() {
    book = null;
    data = null;
    basis = null;
    slots = [];
    flights = [];
    fileName = '';
    selected = null;
    $('odvFile').value = '';
    $('odvFile').dispatchEvent(new Event('change'));
    $('odvRecapText').value = '';
    render();
    window.OdvAssign?.load(emptyWeek(), settings).then(refreshNoBook).catch(() => {});
    notify('Données effacées de la page.', 'info');
  }

  // ------------------------------------------------------------------ rendu
  function render() {
    const has = !!data;
    ['odvClear', 'odvCsv', 'odvJson', 'odvRecap', 'odvTxt'].forEach(id => {
      $(id).disabled = !has;
    });
    $('odvCopy').disabled = !has || !$('odvRecapText').value;
    renderReport();
    renderGrid();
    renderSlots();
    renderMissions();
    renderFlights();
  }

  function renderReport() {
    const host = $('odvReport');
    if (!data) {
      host.innerHTML = '';
      return;
    }
    const d = data,
      filled = d.pilotes.filter(p => p.rempli).length,
      flotteN = Object.keys(d.flotte).length;
    const week = d.semaine == null ? '<span class="odv-bad">introuvable</span>' :
      `S${d.semaine} ${d.annee || ''} — du lundi ${esc(dateFr(d.dates[0]))} au dimanche ${esc(dateFr(d.dates[6]))}/${esc((d.dates[6] || '').slice(0, 4))} (${d.dateSource === 'frise' && d.friseLundi ? 'dates de la frise' : 'semaine ISO'})`;
    const shift = d.decalageJours ? ` <span class="odv-bad">— frise : lundi au ${esc(d.friseLundi.split('-').reverse().join('/'))} (écart ${d.decalageJours > 0 ? '+' : ''}${d.decalageJours} j)</span>` : '';
    const warns = d.anomalies.filter(a => a.niveau === 'warn').length,
      infos = d.anomalies.length - warns;
    host.innerHTML = `<dl class="odv-kv">
      <dt>Fichier</dt><dd>${esc(d.fichier)} <span class="mut">(feuilles ${esc(d.lecture.feuilleOdv)}${d.lecture.feuilleFlotte ? ' et ' + esc(d.lecture.feuilleFlotte) : ''} ; jours en ligne ${d.lecture.ligneJours}, grille ${esc(d.lecture.grille)})</span></dd>
      <dt>Semaine</dt><dd>${week}${shift}</dd>
      <dt>Officier de permanence</dt><dd>${d.duty ? tri(d.duty) : '<span class="mut">non trouvé</span>'}</dd>
      ${d.theme ? `<dt>Thème de la semaine</dt><dd>${esc(d.theme)}</dd>` : ''}
      <dt>Pilotes</dt><dd>${d.pilotes.length} trouvés — ${filled} grille${filled > 1 ? 's' : ''} remplie${filled > 1 ? 's' : ''}, ${d.pilotes.length - filled} vide${d.pilotes.length - filled > 1 ? 's' : ''} (case vide : ${settings.emptyAs === 'indispo' ? 'indisponible' : 'non renseignée'})</dd>
      <dt>FLOTTE</dt><dd>${flotteN ? `${flotteN} profils (rôles et simulateurs indicatifs)` : '<span class="mut">absente</span>'}</dd>
      <dt>Frise horaire</dt><dd>${d.vols.length} vols, ${d.frise.length} contrôles ou divers, ${d.zones.length} zones à activer${d.lecture.frise ? ` <span class="mut">(début ${esc(d.lecture.frise.debut)}, ${d.lecture.frise.largeurJour} colonnes par jour, ${d.lecture.frise.colonnesParHeure} par heure)</span>` : ''}</dd>
      <dt>Lecture</dt><dd>${warns} avertissement${warns > 1 ? 's' : ''}, ${infos} remarque${infos > 1 ? 's' : ''}</dd>
    </dl>
    ${d.anomalies.length ? `<details${warns ? ' open' : ''}><summary class="mut">Rapport de lecture (${d.anomalies.length})</summary><ul class="odv-notes">${d.anomalies.map(a => `<li class="${a.niveau}">${a.niveau === 'warn' ? '⚠ ' : ''}${esc(a.texte)}</li>`).join('')}</ul></details>` : ''}`;
  }

  // --- grille

  function renderGridFilters() {
    const host = $('odvGridFilters'),
      data = basis;
    if (!data) {
      host.innerHTML = '';
      return;
    }
    const colors = [...new Set(data.pilotes.map(p => p.couleur).filter(Boolean))];
    const roles = [...new Set(Object.values(data.flotte).flatMap(p => p.roles))].sort();
    const sims = [...new Set(Object.values(data.flotte).flatMap(p => p.sims))].sort();
    const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
    host.innerHTML = `<label><input type="checkbox" id="odvHideEmpty"${view.hideEmpty ? ' checked' : ''}> Masquer les grilles vides</label>
      ${colors.length ? `<label>Couleur du trigramme <select id="odvColor">${opt('', 'toutes', view.color)}${colors.map(c => opt(c, `#${c} (${data.pilotes.filter(p => p.couleur === c).length})`, view.color)).join('')}</select></label>` : ''}
      <label>Rôle (${data.virtuel ? 'appareils déclarés' : 'FLOTTE'}) <select id="odvRole">${opt('', 'tous', view.role)}${roles.map(r => opt(r, C.ROLES[r] || r, view.role)).join('')}</select></label>
      <label>Simulateur <select id="odvSimF">${opt('', 'tous', view.sim)}${sims.map(s => opt(s, s, view.sim)).join('')}</select></label>`;
    $('odvHideEmpty').onchange = e => {
      view.hideEmpty = e.target.checked;
      renderGrid();
    };
    if ($('odvColor')) $('odvColor').onchange = e => {
      view.color = e.target.value;
      renderGrid();
    };
    $('odvRole').onchange = e => {
      view.role = e.target.value;
      renderGrid();
    };
    $('odvSimF').onchange = e => {
      view.sim = e.target.value;
      renderGrid();
    };
  }

  function renderGrid() {
    renderGridFilters();
    const data = gridData(); // classeur lu, sinon semaine sans classeur (ligne du classeur vide)
    // légende : codes de la légende et nombre de cases
    const counts = {};
    for (const r of data.records)
      if (r.code) counts[r.code] = (counts[r.code] || 0) + 1;
    $('odvLegend').innerHTML = (data.virtuel ? `<span class="odv-noxl">Pas de classeur : semaine du ${esc(dateFr(data.dates[0]))} au ${esc(dateFr(data.dates[6]))}, ligne du classeur vide ; déclarations des pilotes et affectations.</span>` : '') + Object.values(data.legende).map(e => `<span>${codeCell({ code: e.code, sens: e.sens, categorie: e.categorie, source: '' })} ${esc(e.sens)}${counts[e.code] ? ` <b>${counts[e.code]}</b>` : ''}</span>`).join('') +
      `<span>${codeCell({ categorie: 'inconnu', source: '' })} ${esc(C.CATEGORIES.inconnu)}</span>`;
    const byPilot = new Map(data.pilotes.map(p => [p.trigramme, []]));
    for (const r of data.records) byPilot.get(r.pilote)?.push(r);
    const rows = data.pilotes.filter(p => (!view.hideEmpty || p.rempli) && (!view.color || p.couleur === view.color) &&
        (!view.role || (p.profil?.roles || []).includes(view.role)) && (!view.sim || (p.profil?.sims || []).includes(view.sim)))
      .map(p => {
        const recs = byPilot.get(p.trigramme),
          row = {
            ligne: p.ligne,
            pilote: p.trigramme,
            couleur: p.couleur,
            recs,
            dispo: recs.filter(r => r.categorie === 'dispo').length,
            atc: recs.filter(r => r.categorie === 'atc').length,
            roles: (p.profil?.roles || []).map(r => C.ROLES[r] || r).join(', '),
            sims: (p.profil?.sims || []).join(', ')
          };
        recs.forEach(r => {
          row[`s${r.jourIndex}${r.creneauIndex}`] = r;
        });
        return row;
      });
    // grille dense (pas de tableau du framework : ni tri, ni largeurs variables) : en-tête sur deux lignes (jours, puis
    // M / A / S), colonnes étroites et fixes ; par pilote, deux lignes dans chaque case : code du classeur (ODV), puis
    // déclaration du pilote (Mes missions) — encadré rouge : disponible et non affecté ; n° de mission : affecté ; clic
    // sur la déclaration : affecter sur ce créneau. Rôles et simulateurs (feuille FLOTTE) : infobulle du pilote.
    const withDecl = !!window.OdvAssign;
    const head = `<thead><tr><th rowspan="2" class="odv-d-pil">Pilote</th><th rowspan="2" class="odv-d-n" title="Créneaux disponibles (+ contrôle)">Dispo</th>${C.DAYS.map((d, j) => `<th colspan="3" class="odv-d-day">${esc(d.slice(0, 3))} ${esc(dateFr(data.dates[j]))}</th>`).join('')}</tr>
      <tr>${C.DAYS.map(() => SHORT.map((s, k) => `<th class="odv-d-slot" title="${esc((C.SLOTS || [])[k] || s)} (${esc(`${String(settings.hours[k][0]).padStart(2, '0')}-${String(settings.hours[k][1]).padStart(2, '0')}z`)})">${s}</th>`).join('')).join('')}</tr></thead>`;
    const body = rows.map(r => {
      const tip = [r.roles && `Rôles : ${r.roles}`, r.sims && `Simulateurs : ${r.sims}`, `Ligne ${r.ligne} du classeur`].filter(Boolean).join('\n');
      return `<tr><th class="odv-d-pil" title="${esc(tip)}">${tri(r.pilote, r.couleur, false)}</th><td class="odv-d-n">${r.dispo}${r.atc ? `<small>+${r.atc}</small>` : ''}</td>${C.DAYS.map((_, j) => [0, 1, 2].map(k => {
        const v = r[`s${j}${k}`];
        return `<td class="odv-d-cell${k === 2 ? ' odv-d-end' : ''}">${codeCell(v)}${withDecl ? window.OdvAssign.line(r.pilote, j, k, v, codeCell) : ''}</td>`;
      }).join('')).join('')}</tr>`;
    }).join('');
    delete tables.odvGrid;
    const week = window.OdvAssign?.week() || [];
    const weekHtml = week.length ? `<h4 class="odv-week-h">Missions affectées cette semaine (${new Set(week.map(a => a.mission)).size})</h4><table class="odv-week"><thead><tr><th>Décollage</th><th>Mission</th><th>Pilote</th><th>Appareil</th><th>Terrain</th><th>Rôle</th></tr></thead><tbody>${week.map(a => `<tr><td>${esc(dateFr(String(a.takeoff).slice(0, 10)))} ${esc(String(a.takeoff).slice(11, 16))}Z</td><td><b>${esc(a.mission)}</b> ${esc(a.title || '')}</td><td>${tri(a.pilot, null, false)}</td><td>${esc([a.aircraft?.type, a.aircraft?.registration].filter(Boolean).join(' '))}</td><td>${esc(a.departure || '')}</td><td>${a.role === 'convoyage' ? `convoyage pour ${esc(a.for_pilot || '')}` : 'mission'}</td></tr>`).join('')}</tbody></table>` : '<p class="mut odv-d-note">Aucune mission affectée cette semaine.</p>';
    $('odvGrid').innerHTML = rows.length ? `<div class="odv-dense-wrap"><table class="odv-dense">${head}<tbody>${body}</tbody></table></div><p class="mut odv-d-note">${withDecl ? 'Par pilote : code du classeur, puis sa déclaration (encadré rouge : disponible et non affecté ; clic : affecter). ' : ''}Rôles et simulateurs au survol du trigramme.</p>${weekHtml}` : '<p class="odv-empty">Aucun pilote ne correspond aux filtres.</p>';
  }

  // --- créneaux communs
  function renderSlotFilters() {
    const host = $('odvSlotFilters'),
      data = basis;
    if (!data) {
      host.innerHTML = '';
      return;
    }
    const sims = [...new Set(Object.values(data.flotte).flatMap(p => p.sims))].sort();
    host.innerHTML = `<label>Au moins <input type="number" id="odvMin" min="1" max="20" value="${settings.minPilots}" style="width:4em"> pilote(s)</label>
      <label>Simulateur commun <select id="odvSim"><option value="">indifférent</option>${sims.map(s => `<option${s === settings.sim ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <span class="mut">Pilotes : codes O, SC, C, T, N, S ; contrôleurs : AT, AM ; case vide = non comptée.</span>`;
    $('odvMin').onchange = e => {
      settings.minPilots = Math.max(1, Math.min(20, +e.target.value || 1));
      saveSettings();
      renderSlots();
      renderMissions();
    };
    $('odvSim').onchange = e => {
      settings.sim = e.target.value;
      saveSettings();
      compute();
      renderSlots();
      renderMissions();
    };
  }

  function renderSlots() {
    renderSlotFilters();
    const data = basis;
    if (!data) {
      $('odvHeat').innerHTML = '';
      $('odvSlotDetail').innerHTML = '';
      resetTable('odvSlots', '<p class="odv-empty">Chargez un classeur ODV.</p>');
      return;
    }
    const max = Math.max(1, ...slots.map(s => s.n));
    let html = '<div class="odv-heat"><span></span>' + C.SLOT_LABELS.map((l, k) => `<span class="h">${esc(l)}<br><span class="mut">${esc(slots[k].heures)}</span></span>`).join('');
    for (let j = 0; j < 7; j++) {
      html += `<span class="d">${esc(C.DAYS[j])} ${esc(dateFr(data.dates[j]))}</span>`;
      for (let k = 0; k < 3; k++) {
        const s = slots[j * 3 + k],
          key = `${j}${k}`;
        const bits = [s.atc.length ? `+${s.atc.length} ctrl` : '', s.vols.length ? `✈ ${s.vols.length}` : '', s.evenements.length ? '★' : ''].filter(Boolean).join(' · ');
        html += `<button type="button" data-slot="${key}" class="repo-plain${selected === key ? ' sel' : ''}${s.n < settings.minPilots ? ' low' : ''}" style="--pct:${Math.round(s.n / max * 70)}%" title="${esc(slotTitle(s))} : ${s.n} pilote(s), ${s.atc.length} contrôleur(s)"><b>${s.n}</b><small>${esc(bits || ' ')}</small></button>`;
      }
    }
    $('odvHeat').innerHTML = html + '</div>';
    $('odvHeat').querySelectorAll('button[data-slot]').forEach(b => {
      b.onclick = () => select(b.dataset.slot);
    });
    const rows = slots.filter(s => s.n >= settings.minPilots);
    table('odvSlots', {
      columns: [{
        key: 'jour',
        label: 'Créneau',
        sortValue: s => s.jourIndex * 3 + s.creneauIndex,
        format: (v, s) => `${s.jour} ${dateFr(s.date)} ${s.creneau}`
      }, {
        key: 'heures',
        label: 'Heures'
      }, {
        key: 'n',
        label: 'Pilotes',
        type: 'number'
      }, {
        key: 'pilotes',
        label: 'Disponibles',
        sortValue: s => s.pilotes.map(p => p.trigramme).join(' '),
        html: v => v.map(p => `${tri(p.trigramme, null, false)}${p.code !== 'O' ? `<small class="mut"> ${esc(p.code)}</small>` : ''}`).join(' ')
      }, {
        key: 'atc',
        label: 'Contrôleurs',
        sortValue: s => s.atc.length,
        html: v => v.length ? v.map(p => `${tri(p.trigramme, null, false)}<small class="mut"> ${esc(p.code)}</small>`).join(' ') : '—'
      }, {
        key: 'roles',
        label: 'Rôles possibles',
        html: v => {
          const t = v.map(r => C.ROLES[r] || r).join(', ');
          return `<span class="odv-cut" title="${esc(t)}">${esc(t || '—')}</span>`;
        }
      }, {
        key: 'simsCommuns',
        label: 'Simulateurs communs',
        html: v => `<span class="odv-wrap">${esc(v.join(', ') || '—')}</span>`
      }, {
        key: 'mission',
        label: 'Mission probable',
        sortValue: s => s.missions[0]?.famille || '',
        html: (v, s) => s.missions[0] ? `<span class="odv-fam">${esc(s.missions[0].famille)}</span>` : '—'
      }, {
        key: 'registre',
        label: 'Registre',
        sortValue: s => s.n,
        html: (v, s) => pickButton(s) || '—'
      }, {
        key: 'contexte',
        label: 'Contexte',
        html: (v, s) => `<span class="odv-wrap">${esc([s.evenements.length ? '★ ' + s.evenements.map(e => e.groupe).join(', ') : '', s.vols.length ? `✈ ${s.vols.length} vol(s) posé(s)` : '', s.pilotes.some(p => p.commentaire) ? '✎ horaires en commentaire' : ''].filter(Boolean).join(' · ') || '—')}</span>`
      }],
      defaultSortKey: 'n',
      defaultDir: -1,
      onRowClick: s => select(`${s.jourIndex}${s.creneauIndex}`),
      rowTitle: 'Cliquer pour le détail du créneau',
      emptyText: `Aucun créneau avec au moins ${settings.minPilots} pilote(s).`,
      storageKey: 'sortedTableWidths:odvPlanning#slots'
    }, rows);
    renderDetail();
  }

  function select(key) {
    selected = selected === key ? null : key;
    $('odvHeat').querySelectorAll('button[data-slot]').forEach(b => b.classList.toggle('sel', b.dataset.slot === selected));
    renderDetail();
    if (selected) $('odvSlotDetail').scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  function renderDetail() {
    const host = $('odvSlotDetail');
    const data = basis,
      s = data && selected ? slots.find(x => `${x.jourIndex}${x.creneauIndex}` === selected) : null;
    if (!s) {
      host.innerHTML = data ? '<p class="mut">Cliquez un créneau (carte ou tableau) pour son détail.</p>' : '';
      return;
    }
    const li = arr => arr.length ? `<ul>${arr.join('')}</ul>` : '<p class="mut">—</p>';
    host.innerHTML = `<div class="odv-detail"><h3 style="margin-top:0">${esc(slotTitle(s))}</h3>
      <b>Pilotes disponibles (${s.n})</b>${li(s.pilotes.map(p => `<li>${tri(p.trigramme)} <b>${esc(p.code)}</b> — ${esc(p.roles.map(r => C.ROLES[r] || r).join(', ') || 'rôles inconnus')}${p.commentaire ? ` — <i>« ${esc(p.commentaire)} »</i>` : ''}</li>`))}
      ${s.horsSim.length ? `<p class="mut">Disponibles sans le simulateur ${esc(settings.sim)} : ${esc(s.horsSim.join(', '))}</p>` : ''}
      <b>Contrôleurs (${s.atc.length})</b>${li(s.atc.map(p => `<li>${tri(p.trigramme)} <b>${esc(p.code)}</b>${p.commentaire ? ` — <i>« ${esc(p.commentaire)} »</i>` : ''}</li>`))}
      <b>Événements de groupe</b>${li(s.evenements.map(e => `<li>${esc(e.groupe)}${e.commentaire ? ` — ${esc(e.commentaire)}` : ''}${e.recurrent ? ' <span class="mut">(tous les jours : habillage probable)</span>' : ''}</li>`))}
      <b>Vols déjà posés sur la frise</b>${li(s.vols.map(v => `<li>${esc(v.debut)}–${esc(v.fin)}z ${esc(v.dep)}-${esc(v.arr)} · ${esc(v.appareil)} · ${esc(v.objet)} — ${v.equipage.map(t => tri(t, null, false)).join(' ') || '?'}</li>`).concat(s.autres.map(v => `<li class="mut">${esc(v.debut)}z ${esc(v.couloir)} : ${esc(v.texte)} ${v.equipage.map(t => tri(t, null, false)).join(' ')}</li>`)))}
      <b>Missions probables</b>${li(s.toutesMissions.map((m, i) => `<li>${i < settings.top ? '' : '<span class="mut">'}<span class="odv-fam">${esc(m.famille)}</span> ${m.affectation.map(a => `${tri(a.pilote, null, false)} <small class="mut">${esc(a.role === '*' ? 'autre pilote' : C.ROLES[a.role] || a.role)}</small>`).join(' + ')}${m.renforts.length ? ` (+ ${esc(m.renforts.join(', '))})` : ''} — ${esc(m.calcul)} ; règle : ${esc(m.regle)}${i < settings.top ? '' : '</span>'}</li>`))}
      ${s.n >= 2 ? `<p>${pickButton(s)}</p>` : ''}
      ${s.eviter.length ? `<b>Espaces à éviter</b>${li(s.eviter.map(e => `<li><b>${esc(e.type)} ${esc(e.position)}</b> : pas de mission dans la CTR de ${esc(e.icao)}, et si possible hors de ses TMA — <i>« ${esc(e.texte)} »</i></li>`))}` : ''}
      ${s.contexte.length ? `<b>Contexte</b>${li(s.contexte.map(c => `<li>${esc(c)}</li>`))}` : ''}
    </div>`;
  }

  // --- choix d'une mission du registre (Centre) pour un créneau à plusieurs pilotes
  // Missions du registre du navigateur (missionRegistry:v1, rempli par le registre du Centre) avec rendez-vous ou à
  // plusieurs équipes, famille du créneau, pas plus d'équipes en l'air que de pilotes disponibles ; route estimée
  // (points du registre, tronçons échantillonnés) confrontée aux sessions ATC du créneau : CTR du terrain en examen ou
  // en training → écartée, TMA contenant le terrain → signalée. Ouverture dans le registre (?mission=…).
  const centreOn = () => !!window.RepositoryNav?.cpco?.enabled?.();
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const regMissions = () => {
    try {
      return JSON.parse(localStorage.getItem('missionRegistry:v1') || 'null')?.missions || [];
    } catch {
      return [];
    }
  };
  /** Espaces à éviter d'un créneau : CTR et TMA contenant chaque terrain en examen / training (base SIA du navigateur). */
  async function zonesToAvoid(list) {
    if (!list?.length) return [];
    let base = null;
    try {
      base = await window.SiaBase?.get?.({
        any: true
      });
    } catch {
      base = null;
    }
    if (!base) return list.map(e => ({
      ...e,
      ctr: [],
      tma: [],
      note: 'base SIA absente de ce navigateur : CTR non vérifiée'
    }));
    const inR = window.SiaBase.inRing;
    return list.map(e => {
      const ad = (base.aero?.aerodromes || []).find(a => String(a.icao || '').toUpperCase() === e.icao);
      if (!ad) return {
        ...e,
        ctr: [],
        tma: [],
        note: `terrain ${e.icao} inconnu de la base SIA`
      };
      const hit = t => (base.airspaces || []).filter(a => a.type === t && (a.rings || []).some(r => inR(r, ad.lat, ad.lon)));
      return {
        ...e,
        ctr: hit('CTR'),
        tma: hit('TMA')
      };
    });
  }
  /** Points de la route estimée d'une mission du registre, tronçons échantillonnés (8 par tronçon). */
  function samplesOf(m) {
    const pts = (m.estimate?.points || []).filter(p => Number.isFinite(+p.lat) && Number.isFinite(+p.lon)).map(p => ({
        lat: +p.lat,
        lon: +p.lon
      })),
      out = [...pts];
    for (let i = 1; i < pts.length; i++)
      for (let k = 1; k < 8; k++) out.push({
        lat: pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * k / 8,
        lon: pts[i - 1].lon + (pts[i].lon - pts[i - 1].lon) * k / 8
      });
    return out;
  }
  /** Conflits d'une mission avec les espaces à éviter : [{ grave, texte }] (grave : CTR). */
  function conflictsOf(m, zones) {
    if (!zones.length) return [];
    const S = samplesOf(m),
      inR = window.SiaBase?.inRing;
    if (!inR || !S.length) return S.length ? [] : [{
      grave: false,
      texte: 'route inconnue (registre à relire)'
    }];
    const first = list => list.find(a => S.some(p => (a.rings || []).some(r => inR(r, p.lat, p.lon))));
    const out = [];
    for (const z of zones) {
      const c = first(z.ctr);
      if (c) {
        out.push({
          grave: true,
          texte: `traverse la CTR ${c.name} (${z.type} ${z.position})`
        });
        continue;
      }
      const t = first(z.tma);
      if (t) out.push({
        grave: false,
        texte: `traverse la TMA ${t.name} (${z.type} ${z.position})`
      });
    }
    return out;
  }
  const hmOf = min => Number.isFinite(+min) && +min > 0 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}` : '—';
  /** Fenêtre de choix : missions du registre pour le créneau s (famille fam, sinon familles probables du créneau). */
  async function pickMission(s, fam = '', {
    focus = ''
  } = {}) {
    // Vue de synthèse d'un créneau : pilotes libres (disponibles et non affectés : déclaration, sinon classeur) et
    // leurs appareils ; proposition « pour tout le monde » (missions complètes et complémentaires, sans pilote commun,
    // MissionAssignments.planSlot) ; autres missions compatibles ; missions déjà affectées sur le créneau. Chaque
    // mission : « Affecter » (dialogue prérempli : ses pilotes, heure de début du créneau). focus : case cliquée.
    // Fenêtre au gabarit du dialogue d'affectation (AssignDialog.frame).
    const O = window.OdvAssign,
      M = window.MissionAssignments,
      AD = window.AssignDialog,
      range = O?.range(s.jourIndex, s.creneauIndex);
    if (!centreOn()) {
      notify('Registre des missions : Centre verrouillé — l’activer dans Paramètres › Centre (CPCO).', 'warn');
      return;
    }
    const all = regMissions();
    if (!all.length) {
      notify('Registre des missions vide dans ce navigateur : ouvrir le registre du Centre et relire le dossier des missions.', 'warn');
      return;
    }
    if (!O || !M || !AD?.frame) return notify('Affectations : modules absents (assignments.js, odv_assign.js, assign_dialog.js).', 'err');
    const zones = await zonesToAvoid(s.eviter);
    const fams = [...new Set([...s.toutesMissions.map(m => m.famille), ...all.map(m => fold(m.family || m.type)).filter(Boolean)])].sort();
    const chip = AD.chip;
    const render = async famSel => {
      const free = O.freePilots(s.jourIndex, s.creneauIndex),
        decls = await M.declarations(free),
        assigned = O.inSlot(s.jourIndex, s.creneauIndex);
      const entries = all.filter(m => !famSel || fold(m.family || m.type).startsWith(famSel));
      const plan = M.planSlot(free, entries, decls, {
        focus
      });
      const byId = id => all.find(x => x.id === id);
      const conf = m => conflictsOf(m, zones);
      const types = tr => {
        const ac = decls[tr]?.aircraft;
        if (!ac) return '<small>appareils non déclarés</small>';
        const ms = new Set(ac.mastered || []);
        return [...new Set([...(ac.owned || []), ...ms])].map(ty => ms.has(ty) ? `<b>${esc(ty)}</b>` : esc(ty)).join(' ') || '<small>aucun</small>';
      };
      const optionRow = o => `<tr class="${o.missions.some(m => conf(m).some(c => c.grave)) ? 'bad' : o.missions.some(m => conf(m).length) ? 'warn' : ''}">
        <td>${o.missions.map(m => `<b>${esc(m.id)}</b> ${esc(m.title || '')}<br><small>${esc(m.type || '')} · ${esc((m.aircraftTypes || []).join(', ') || 'type libre')} · ${hmOf(m.estimate?.block ?? m.estimate?.flight)}</small>`).join('<hr>')}</td>
        <td>${o.pairs.map(p => `${esc(p.mission)} → ${tri(p.tri, null, false)}`).join('<br>')}</td>
        <td>${chip(`${o.covered}/${o.need}`, o.full ? 'ok' : 'warn')}</td>
        <td>${o.missions.flatMap(m => conf(m)).map(c => chip(esc(c.texte), c.grave ? 'err' : 'warn')).join('') || chip('ok', 'ok')}</td>
        <td class="ad-act">${o.missions.map(m => `<button type="button" class="primary" data-assign="${esc(m.id)}" data-pilots="${esc(o.pairs.filter(p => p.mission === m.id).map(p => p.tri).join(','))}">Affecter ${esc(m.id)}</button>`).join(' ')}</td></tr>`;
      const head = '<thead><tr><th>Mission(s)</th><th>Pilotes proposés</th><th>Postes</th><th>Espaces</th><th></th></tr></thead>';
      const others = plan.options.filter(o => !plan.proposal.includes(o)).slice(0, 25);
      const d = AD.frame('odvPick', {
        wide: true,
        title: `${esc(slotTitle(s))} — affecter les pilotes libres`,
        subtitle: `${free.length} pilote(s) libre(s), ${assigned.length} affectation(s) sur le créneau`,
        body: `<p class="ad-facts">${free.length ? free.map(tr => chip(`${tri(tr, null, false)} ${types(tr)}`, tr === focus ? 'focus' : '')).join('') : chip('aucun pilote libre (tous affectés ou indisponibles)', 'warn')}</p>
        <p><label class="ad-inline">Famille <select data-fam><option value="">toutes</option>${fams.map(f => `<option value="${esc(f)}"${f === famSel ? ' selected' : ''}>${esc(f)}${s.missions[0]?.famille === f ? ' (proposée)' : ''}</option>`).join('')}</select></label></p>
        ${zones.length ? `<p class="ad-note">À éviter : ${zones.map(z => `<b>${esc(z.type)} ${esc(z.position)}</b> — CTR ${esc(z.ctr.map(a => a.name).join(', ') || '?')}${z.tma.length ? `, TMA ${esc(z.tma.map(a => a.name).join(', '))} (si possible)` : ''}`).join(' · ')}</p>` : ''}
        <section class="ad-card"><h4>Proposition pour tout le monde${plan.proposal.length ? ` — ${free.length - plan.left.length}/${free.length} pilote(s)` : ''}</h4>
        ${plan.proposal.length ? `<table class="ad-table">${head}<tbody>${plan.proposal.map(optionRow).join('')}</tbody></table>${plan.left.length ? `<p class="ad-help">Sans mission complète : ${plan.left.map(tr => tri(tr, null, false)).join(' ')} — voir les missions partielles ci-dessous.</p>` : ''}` : '<p class="ad-help">Aucune mission complète avec les appareils déclarés des pilotes libres.</p>'}</section>
        <section class="ad-card"><h4>Autres missions compatibles</h4>
        ${others.length ? `<table class="ad-table">${head}<tbody>${others.map(optionRow).join('')}</tbody></table>` : '<p class="ad-help">Aucune autre.</p>'}</section>
        <section class="ad-card"><h4>Déjà affectées sur ce créneau</h4>
        ${assigned.length ? `<ul class="ad-list">${assigned.map(a => `<li><b>${esc(a.mission)}</b>${a.role === 'convoyage' ? ' (convoyage)' : ''} — ${tri(a.pilot, null, false)} ${esc(a.aircraft?.registration || '')} · décollage ${esc(String(a.takeoff || '').slice(11, 16))}Z</li>`).join('')}</ul>` : '<p class="ad-help">Aucune.</p>'}</section>`,
        foot: '<p class="ad-msg ad-help">Pilotes proposés : possèdent l’appareil de la mission (« Mes appareils »), maîtrise et pilote de la case cliquée d’abord ; une opération (missions A, B, C…) est proposée d’un seul tenant.</p><button type="button" class="ghost" data-close>Fermer</button>'
      });
      d.querySelector('[data-fam]').onchange = e => render(e.target.value);
      d.querySelectorAll('[data-assign]').forEach(b => b.onclick = () => {
        const m = byId(b.dataset.assign),
          crew = b.dataset.pilots.split(',').filter(Boolean);
        d.close();
        O.assign(m, crew, range?.[0], `Créneau ${slotTitle(s)}`).catch(e => notify(e.message, 'err'));
      });
    };
    await render(fam || '');
  }
  /** Bouton « Missions du registre… » d'un créneau à plusieurs pilotes (famille facultative). */
  const pickButton = (s, fam = '') => s.n >= 2 ? `<button type="button" class="odv-pick-btn" data-pick="${s.jourIndex}${s.creneauIndex}" data-fam="${esc(fam)}"${centreOn() ? '' : ' disabled title="Centre verrouillé : l’activer dans Paramètres › Centre (CPCO)"'}>Missions du registre…</button>` : '';
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-odv-slot]');
    if (!c) return;
    const s = slotOf(+c.dataset.odvSlot[0], +c.dataset.odvSlot[1]);
    if (s) pickMission(s, '', {
      focus: c.dataset.tri
    });
  });
  window.OdvAssign?.onChange(() => data ? renderGrid() : refreshNoBook());
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    e.stopPropagation();
    const s = slots.find(x => `${x.jourIndex}${x.creneauIndex}` === b.dataset.pick);
    if (s) pickMission(s, b.dataset.fam || '');
  }, true);

  // --- missions probables
  function renderMissions() {
    const rules = $('odvRules');
    rules.innerHTML = `<summary>Règles des familles et du score</summary><ul>${Object.entries(C.FAMILIES).map(([f, d]) => `<li><span class="odv-fam">${esc(f)}</span> ${esc(d.rule)}</li>`).join('')}</ul>
      <p class="mut">Rôles d'un pilote : le code impose le rôle (SC → sécu civile + hélico / avion sécu d'après FLOTTE, C → chasse, T → transport + ravitailleur / largage, N → FNY / maritime, S → exercice + rôles FLOTTE) ; O → tous les rôles que FLOTTE lui attribue. Score = participants + 2 par pilote à code restreint employé dans son domaine (SC : SAR, FIRE, HEMS ; N : MARITIME ; C : AAR, ISR, SPECIAL ; T : AIRLIFT, AIRBORNE, AAR) + 1 par contrôleur en ligne (2 au plus) pour TRAINING. À score égal : ordre de préférence des réglages (${esc(settings.preference.join(', '))}). Les rôles FLOTTE restent indicatifs : le planificateur valide.</p>`;
    if (!basis) {
      resetTable('odvMissions', '<p class="odv-empty">Chargez un classeur ODV.</p>');
      return;
    }
    const rows = [];
    for (const s of slots)
      if (s.n >= settings.minPilots) s.missions.forEach((m, i) => rows.push({
        ...m,
        slot: s,
        rang: i + 1,
        ordre: (s.jourIndex * 3 + s.creneauIndex) * 10 + i
      }));
    table('odvMissions', {
      columns: [{
        key: 'ordre',
        label: 'Créneau',
        type: 'number',
        format: (v, r) => `${r.slot.jour} ${dateFr(r.slot.date)} ${r.slot.creneau}`
      }, {
        key: 'rang',
        label: 'Rang',
        type: 'number'
      }, {
        key: 'famille',
        label: 'Famille',
        html: v => `<span class="odv-fam">${esc(v)}</span>`
      }, {
        key: 'affectation',
        label: 'Affectation proposée',
        sortValue: r => r.affectation.map(a => a.pilote).join(' '),
        html: v => v.map(a => `${tri(a.pilote, null, false)} <small class="mut">${esc(a.role === '*' ? 'autre pilote' : C.ROLES[a.role] || a.role)}</small>`).join(' + ')
      }, {
        key: 'renforts',
        label: 'Peuvent rejoindre',
        sortValue: r => r.renforts.length,
        html: v => v.length ? v.map(t => tri(t, null, false)).join(' ') : '—'
      }, {
        key: 'score',
        label: 'Score',
        type: 'number'
      }, {
        key: 'registre',
        label: 'Registre',
        sortValue: r => r.slot.n,
        html: (v, r) => pickButton(r.slot, r.famille) || '—'
      }, {
        key: 'calcul',
        label: 'Justification',
        html: (v, r) => `<span class="odv-why">${esc(v)}<br>Règle : ${esc(r.regle)}${r.rang === 1 && r.slot.contexte.length ? `<br>Contexte : ${esc(r.slot.contexte.join(' ; '))}` : ''}</span>`
      }],
      defaultSortKey: 'ordre',
      onRowClick: r => select(`${r.slot.jourIndex}${r.slot.creneauIndex}`),
      rowTitle: 'Cliquer pour le détail du créneau',
      emptyText: `Aucun créneau avec au moins ${settings.minPilots} pilote(s).`,
      storageKey: 'sortedTableWidths:odvPlanning#missions'
    }, rows);
  }

  // --- frise
  function renderFlights() {
    const data = basis;
    if (!data) {
      $('odvZones').innerHTML = '';
      resetTable('odvFlights', '<p class="odv-empty">Chargez un classeur ODV.</p>');
      resetTable('odvOthers', '<p class="odv-empty">—</p>');
      return;
    }
    const zones = C.DAYS.map((d, j) => ({
      d,
      j,
      list: data.zones.filter(z => z.jourIndex === j)
    })).filter(x => x.list.length);
    $('odvZones').innerHTML = zones.length ? `<p class="mut" style="margin:0 0 4px">Zones à activer (frise) :</p><ul class="odv-notes" style="margin-bottom:10px">${zones.map(x => `<li><b>${esc(x.d)} ${esc(dateFr(data.dates[x.j]))}</b> : ${x.list.map(z => `${esc(z.heure)}z ${esc(z.texte)}`).join(' ; ')}</li>`).join('')}</ul>` : '';
    const when = {
      key: 'ordre',
      label: 'Jour',
      type: 'number',
      format: (v, r) => `${r.jour} ${dateFr(r.date)}`
    };
    table('odvFlights', {
      columns: [
        when, {
          key: 'debut',
          label: 'Heures z',
          format: (v, r) => `${r.debut}–${r.fin}`
        }, {
          key: 'creneau',
          label: 'Créneau'
        }, {
          key: 'trajet',
          label: 'Trajet'
        }, {
          key: 'appareil',
          label: 'Appareil'
        }, {
          key: 'objet',
          label: 'Objet',
          html: v => `<span class="odv-wrap">${esc(v)}</span>`
        }, {
          key: 'indicatif',
          label: 'Indicatif'
        }, {
          key: 'equipage',
          label: 'Équipage',
          sortValue: r => r.equipage.join(' '),
          html: v => v.length ? v.map(t => tri(t)).join(' ') : '<span class="odv-alert">?</span>'
        }, {
          key: 'alertes',
          label: 'Disponibilités',
          sortValue: r => r.alertes.length,
          html: v => v.length ? `<span class="odv-wrap odv-alert">⚠ ${v.map(esc).join('<br>⚠ ')}</span>` : '<span class="odv-ok">✓</span>'
        }
      ],
      defaultSortKey: 'ordre',
      emptyText: data.virtuel ? 'Pas de classeur : aucune mission affectée cette semaine.' : 'Aucun vol sur la frise.',
      storageKey: 'sortedTableWidths:odvPlanning#flights'
    }, flights.map(f => ({
      ...f,
      ordre: f.jourIndex * 100 + f.h_debut,
      trajet: `${f.dep}-${f.arr}`
    })));
    table('odvOthers', {
      columns: [
        when, {
          key: 'debut',
          label: 'Heures z',
          format: (v, r) => `${r.debut}–${r.fin}`
        }, {
          key: 'couloir',
          label: 'Couloir'
        }, {
          key: 'texte',
          label: 'Élément',
          html: v => `<span class="odv-wrap">${esc(v)}</span>`
        }, {
          key: 'equipage',
          label: 'Trigrammes',
          sortValue: r => r.equipage.join(' '),
          html: v => v.map(t => tri(t, null, false)).join(' ') || '—'
        }
      ],
      defaultSortKey: 'ordre',
      emptyText: 'Aucun élément.',
      storageKey: 'sortedTableWidths:odvPlanning#others'
    }, data.frise.map(f => ({
      ...f,
      ordre: f.jourIndex * 100 + f.h_debut
    })));
  }

  // ------------------------------------------------------------------ réglages : formulaire
  function fillSettings() {
    $('odvHours').innerHTML = C.SLOT_LABELS.map((l, k) => `<span>${esc(l)}</span><input type="number" min="0" max="24" step="0.5" data-h="${k}0" value="${settings.hours[k][0]}"><span>à</span><input type="number" min="0" max="24" step="0.5" data-h="${k}1" value="${settings.hours[k][1]}"><span>z</span>`).join('');
    $('odvDateSource').value = settings.dateSource;
    $('odvEmptyAs').value = settings.emptyAs;
    $('odvFlotteLevel').value = settings.flotteLevel;
    $('odvTop').value = settings.top;
    $('odvPref').value = settings.preference.join(', ');
    $('odvStrict').checked = !!settings.strictCodes;
    $('odvRecurring').checked = !!settings.ignoreRecurring;
    $('odvHours').querySelectorAll('input').forEach(i => {
      i.onchange = onHours;
    });
  }

  function onHours() {
    const h = clone(settings.hours);
    $('odvHours').querySelectorAll('input').forEach(i => {
      const [k, e] = i.dataset.h.split('').map(Number);
      h[k][e] = Math.max(0, Math.min(24, +i.value || 0));
    });
    if (h.some(([a, b]) => b <= a)) {
      notify('Créneau invalide : l’heure de fin doit suivre l’heure de début.', 'warn');
      fillSettings();
      return;
    }
    settings.hours = h;
    changed();
  }
  /** Un réglage a changé : mémorisé, puis relecture (les réglages de lecture changent les données extraites). */
  function changed() {
    saveSettings();
    rebuild();
  }

  function bindSettings() {
    $('odvDateSource').onchange = e => {
      settings.dateSource = e.target.value;
      changed();
    };
    $('odvEmptyAs').onchange = e => {
      settings.emptyAs = e.target.value;
      changed();
    };
    $('odvFlotteLevel').onchange = e => {
      settings.flotteLevel = e.target.value;
      changed();
    };
    $('odvTop').onchange = e => {
      settings.top = Math.max(1, Math.min(10, Math.round(+e.target.value) || 3));
      e.target.value = settings.top;
      changed();
    };
    $('odvStrict').onchange = e => {
      settings.strictCodes = e.target.checked;
      changed();
    };
    $('odvRecurring').onchange = e => {
      settings.ignoreRecurring = e.target.checked;
      changed();
    };
    $('odvPref').onchange = e => {
      const list = e.target.value.toUpperCase().split(/[\s,;]+/).filter(Boolean),
        bad = list.filter(f => !C.FAMILIES[f]);
      if (bad.length) notify(`Familles inconnues ignorées : ${bad.join(', ')} (connues : ${Object.keys(C.FAMILIES).join(', ')}).`, 'warn');
      settings.preference = list.filter(f => C.FAMILIES[f]);
      if (!settings.preference.length) settings.preference = clone(C.DEFAULTS.preference);
      e.target.value = settings.preference.join(', ');
      changed();
    };
    $('odvReset').onclick = () => {
      settings = clone(C.DEFAULTS);
      saveSettings();
      fillSettings();
      rebuild();
      notify('Réglages par défaut rétablis.', 'info');
    };
  }

  // ------------------------------------------------------------------ exports
  function exportJson() {
    const out = {
      avertissement: 'Données nominatives (trigrammes, disponibilités) : export local, ne pas publier.',
      genere: new Date().toISOString(),
      reglages: settings,
      meta: {
        fichier: data.fichier,
        semaine: data.semaine,
        annee: data.annee,
        lundi: data.lundi,
        lundi_iso: data.lundiIso,
        frise_lundi: data.friseLundi,
        decalage_jours: data.decalageJours,
        dates: data.dates,
        duty: data.duty,
        theme: data.theme,
        zones: data.zones
      },
      legende: data.legende,
      pilotes: data.pilotes,
      records: data.records,
      evenements: data.evenements,
      vols: flights,
      frise: data.frise,
      creneaux: slots.map(s => ({
        date: s.date,
        jour: s.jour,
        creneau: s.creneau,
        heures: s.heures,
        n: s.n,
        pilotes: s.pilotes,
        atc: s.atc,
        roles: s.roles,
        sims_communs: s.simsCommuns,
        evenements: s.evenements.map(e => e.groupe),
        missions: s.missions.map(m => ({
          famille: m.famille,
          affectation: m.affectation,
          renforts: m.renforts,
          score: m.score,
          calcul: m.calcul,
          regle: m.regle
        }))
      })),
      anomalies: data.anomalies
    };
    download(`${baseName()}_planning.json`, JSON.stringify(out, null, 1), 'application/json');
  }

  function bindExports() {
    $('odvCsv').onclick = () => data && download(`${baseName()}_grille.csv`, C.toCsv(data), 'text/csv;charset=utf-8');
    $('odvJson').onclick = () => data && exportJson();
    $('odvRecap').onclick = () => {
      if (!data) return;
      $('odvRecapText').value = C.recap(data, slots);
      $('odvCopy').disabled = false;
    };
    $('odvTxt').onclick = () => data && download(`${baseName()}_dispo.txt`, C.recap(data, slots), 'text/plain;charset=utf-8');
    $('odvCopy').onclick = async () => {
      const t = $('odvRecapText').value;
      if (!t) return;
      try {
        await navigator.clipboard.writeText(t);
        notify('Récapitulatif copié dans le presse-papiers.', 'ok');
      } catch {
        $('odvRecapText').select();
        notify('Copie automatique refusée par le navigateur : texte sélectionné, Ctrl+C pour copier.', 'warn');
      }
    };
  }

  // ------------------------------------------------------------------ démarrage
  function start() {
    if (!C || !window.SortedTable) {
      notify('Planning ODV : composants manquants (odv_core.js, mission_table.js).', 'err');
      return;
    }
    fillSettings();
    bindSettings();
    bindExports();
    window.OdvAssign?.load(emptyWeek(), settings).then(refreshNoBook).catch(() => {}); // sans classeur : déclarations
    $('odvFile').addEventListener('change', e => {
      const f = e.target.files?.[0];
      if (f) loadFile(f);
    });
    $('odvClear').onclick = clearAll;
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  // accès pour les tests (données en mémoire uniquement)
  window.OdvPlanning = {
    loadFile,
    get data() {
      return data;
    },
    get slots() {
      return slots;
    },
    get flights() {
      return flights;
    },
    settings: () => settings
  };
})();
