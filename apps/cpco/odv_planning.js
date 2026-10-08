(() => {
  'use strict';
  // Planning ODV — interface de apps/cpco/odv_planning.html (lecture et règles : odv_core.js).
  // Le classeur n'est gardé qu'en mémoire (variable book) : rien dans le stockage du navigateur hormis les réglages
  // (odvPlanning:v1) ; « Effacer les données » le libère. Avertissements de lecture : notifications flottantes
  // (AppFramework.notify) et liste du rapport de lecture. Tableaux : SortedTable (shared/mission_table.js).
  // Fenêtre d'un créneau (pickMission) : matrice missions × postes ; une opération à plusieurs missions (exercice) tient
  // sur une ligne, heure H commune et décalage par équipage ; « Modifier » rouvre les missions enregistrées du créneau ;
  // une mission par pilote et par tranche (convoyeurs compris). Textes : RepositoryKit.tf (4 langues).
  const C = window.OdvCore;
  /** Élément de la page par son identifiant. */
  const $ = id => document.getElementById(id);
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  const L = window.RepositoryKit.tf; // phrase traduite, valeurs {clé} insérées (shared/kit.js)
  /** Notification flottante (AppFramework.notify), console à défaut. */
  const notify = (msg, kind) => window.AppFramework?.notify ? window.AppFramework.notify(msg, kind) : console.warn(msg);
  const SHORT = ['M', 'A', 'S'];

  // ------------------------------------------------------------------ réglages (seules données mémorisées)

  // réglages propres à la compagnie (créneaux, lecture du classeur, missions probables) : saisis dans Paramètres › Centre ›
  // Planning ODV, module commun apps/cpco/odv_settings.js ; ici, lus (et les filtres de la page enregistrés)
  const loadSettings = () => window.OdvSettings.load();
  /** Enregistre les réglages, filtres de la page compris (OdvSettings, odvPlanning:v1). */
  const saveSettings = () => window.OdvSettings.save(settings);
  let settings = loadSettings();
  // réglages changés dans un autre onglet (Paramètres) : relus, données recalculées
  window.addEventListener('storage', e => {
    if (e.key !== window.OdvSettings.KEY) return;
    settings = loadSettings();
    rebuild();
  });

  // état de la page (mémoire seulement)
  let book = null,
    fileName = '',
    xl = null, // classeur lu (sa semaine)
    data = null, // données affichées : le classeur si la semaine affichée est la sienne, sinon null (sans classeur)
    weekMon = null, // lundi affiché (ms) ; null : la semaine en cours
    jumpToXl = false, // classeur choisi à la main : afficher sa semaine (rouvert tout seul : semaine en cours)
    slots = [],
    basis = null, // données du calcul : classeur, sinon déclarations (declWeek)
    flights = [],
    selected = null;
  // affichage de la grille (masquer les vides, couleur, rôle, simulateur) : gardé dans ce navigateur (odvPlanningView:v1)
  const VIEW_KEY = 'odvPlanningView:v1';
  const view = {
    hideEmpty: false,
    color: '',
    role: '',
    sim: ''
  };
  try {
    Object.assign(view, JSON.parse(localStorage.getItem(VIEW_KEY) || '{}') || {});
  } catch {
    /* stockage refusé ou illisible : valeurs par défaut */
  }
  /** Mémorise l'affichage de la grille (odvPlanningView:v1) ; stockage refusé : ignoré. */
  const saveView = () => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view));
    } catch {
      /* stockage refusé */
    }
  };
  const tables = {};

  // ------------------------------------------------------------------ semaine sans classeur
  // Sans classeur, la grille reste affichée : pilotes de la référence, semaine en cours, ligne du classeur vide
  // (« non renseigné »), déclarations des pilotes et affectations ; légende par défaut (OdvCore.LEGEND).
  let virtual = null;
  /** Date AAAA-MM-JJ (UTC) d'un instant en ms. */
  const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
  /** Lundi (UTC, ms) de la semaine qui contient ms. */
  const mondayOf = ms => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  };
  /** Lundi (UTC, ms) de la semaine du classeur lu ; null sans classeur. */
  const xlMonday = () => xl ? Date.parse(`${xl.dates[0]}T00:00:00Z`) : null;
  /** Lundi affiché : choisi (◀ ▶, classeur choisi à la main), sinon la semaine en cours. */
  const shownMonday = () => weekMon ?? mondayOf(Date.now());
  /** Numéro de semaine ISO. */
  const isoWeekNo = ms => {
    const d = new Date(mondayOf(ms) + 3 * 864e5),
      y = Date.UTC(d.getUTCFullYear(), 0, 4);
    return 1 + Math.round((d - mondayOf(y)) / 6048e5);
  };

  /** Semaine sans classeur du lundi affiché : pilotes de la référence, 21 cases « inconnu » chacun, légende par
   *  défaut ; gardée dans virtual tant que la semaine affichée ne change pas. */
  function emptyWeek() {
    const mon = shownMonday();
    if (virtual && virtual.dates[0] === isoDay(mon)) return virtual;
    const dates = Array.from({
      length: 7
    }, (_, j) => new Date(mon + j * 864e5).toISOString().slice(0, 10));
    const tris = [...new Set((window.DEFA_REFERENCE?.pilots || []).map(x => String(x.trigram || '').toUpperCase()).filter(Boolean))]
      .sort();
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
      // catégories (shared/dispos.js) : type de la catégorie, thèmes ouverts (catégorie + préférences du pilote) ; plus
      // de rôle imposé par le code — les missions probables lisent les thèmes (odv_core.js, plan)
      return d ? {
        ...r,
        code: d.code,
        sens: d.label,
        categorie: d.category || C.LEGEND[d.code]?.[1] || M?.LEGEND?.[d.code]?.[1] || 'inconnu',
        role_impose: d.themes ? null : C.LEGEND[d.code]?.[2] || null,
        themes: d.themes || null,
        groupe: d.groupe || null,
        source: 'déclaration du pilote'
      } : r;
    });
    for (const p of w.pilotes) p.rempli = records.some(r => r.pilote === p.trigramme && r.code);
    // vols : missions affectées de la semaine (un vol par mission et heure de décollage, convoyages à part)
    const vols = [];
    for (const a of O?.week() || []) {
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
        objet: a.role === 'convoyage' ? L(['Convoyage {m}{s}', 'Ferry {m}{s}', 'Überführung {m}{s}', 'Traslado {m}{s}'], {
          m: a.mission,
          s: a.pilot ? '' : L([' (à affecter)', ' (to assign)', ' (zuzuweisen)', ' (por asignar)'])
        }) : [a.mission, a.title].filter(Boolean).join(' '),
        indicatif: a.callsign || '',
        famille: a.role === 'convoyage' ? '' : a.type || '', // famille de la mission : contrôle des thèmes ouverts (checkFlights)
        equipage: [a.pilot].filter(Boolean),
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
  /** Nombre sur deux chiffres. */
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
  /** Nom complet d'un pilote s'il est connu localement (référence, champ nom facultatif), sinon ''. */
  function fullName(t) {
    const p = (window.DEFA_REFERENCE?.pilots || []).find(x => String(x.trigram || x.trigramme || '').toUpperCase() === t);
    if (!p) return '';
    return p.name || p.fullName || p.nom || [p.firstName || p.prenom, p.lastName].filter(Boolean).join(' ') || '';
  }
  /** Texte lisible (noir ou blanc) sur un fond hexadécimal. */
  function inkOn(hex) {
    if (!/^[0-9A-F]{6}$/i.test(hex || '')) return 'inherit';
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) /
      1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b > .35 ? '#111' : '#fff';
  }
  /** Étiquette d'un trigramme (couleur de sa forme dans l'ODV) et nom complet éventuel. */
  function tri(t, color, withName = true) {
    const c = color || data?.pilotes.find(p => p.trigramme === t)?.couleur || null,
      n = withName ? fullName(t) : '';
    return `<span class="odv-tri" style="--c:${c ? '#' + c : '#556'};--t:${inkOn(c)}">${esc(t)}</span>${n ? `<span class="odv-name">${esc(n)}</span>` : ''}`;
  }
  /** Date JJ/MM d'une date ISO ('' sans date). */
  const dateFr = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
  // jour et créneau du classeur (en français) dans la langue de la page
  const DAY_ROWS = {
    lundi: ['Lundi', 'Monday', 'Montag', 'Lunes'],
    mardi: ['Mardi', 'Tuesday', 'Dienstag', 'Martes'],
    mercredi: ['Mercredi', 'Wednesday', 'Mittwoch', 'Miércoles'],
    jeudi: ['Jeudi', 'Thursday', 'Donnerstag', 'Jueves'],
    vendredi: ['Vendredi', 'Friday', 'Freitag', 'Viernes'],
    samedi: ['Samedi', 'Saturday', 'Samstag', 'Sábado'],
    dimanche: ['Dimanche', 'Sunday', 'Sonntag', 'Domingo'],
    matin: ['matin', 'morning', 'Morgen', 'mañana'],
    'après-midi': ['après-midi', 'afternoon', 'Nachmittag', 'tarde'],
    soir: ['soir', 'evening', 'Abend', 'noche']
  };
  /** Jour ou créneau du classeur (en français) dans la langue de la page ; tel quel s'il est inconnu. */
  const wordL = w => DAY_ROWS[String(w || '').toLowerCase()] ? L(DAY_ROWS[String(w).toLowerCase()]) : w;
  /** Jour ou créneau traduit, initiale en majuscule. */
  const capL = w => (s => s.charAt(0).toUpperCase() + s.slice(1))(String(wordL(w) ?? '')); // « Matin » → « Morning »
  /** Abréviation du jour dans la langue de la page (2 lettres en allemand, 3 sinon). */
  const dayAbbr = d => String(wordL(d) ?? '').slice(0, +L(['3', '3', '2', '3'])); // Lun, Mon, Mo, Lun
  // initiale du créneau (SHORT : M / A / S) dans la langue de la page
  const shortL = k => L([
    ['M', 'M', 'M', 'M'],
    ['A', 'A', 'N', 'T'],
    ['S', 'E', 'A', 'N']
  ][k] || [SHORT[k] || '']);
  // catégories de disponibilité (OdvCore.CATEGORIES, en français), sens des codes et sources des cases, à l'affichage ;
  // phrases produites par odv_core.js (rapport, alertes, calcul, contexte) : C.say
  const catL = c => C.categoryLabel(c);
  /** Sens d'un code de la légende dans la langue de la page. */
  const sensL = s => C.sensLabel(s);
  const SRC_ROWS = {
    'pas de classeur': ['pas de classeur', 'no workbook', 'keine Arbeitsmappe', 'sin libro'],
    'déclaration du pilote': ['déclaration du pilote', 'pilot declaration', 'Angabe des Piloten', 'declaración del piloto']
  };
  /** Source d'une case (pas de classeur, déclaration du pilote) dans la langue de la page. */
  const srcL = s => SRC_ROWS[s] ? L(SRC_ROWS[s]) : s;
  /** « 3 grilles remplies » (pluriel à partir de 2, comme le texte français d'origine). */
  const gridsL = n => L(n > 1 ? ['{n} grilles remplies', '{n} grids filled', '{n} Raster ausgefüllt', '{n} cuadrículas rellenadas'] : [
    '{n} grille remplie', '{n} grid filled', '{n} Raster ausgefüllt', '{n} cuadrícula rellenada'
  ], {
    n
  });
  /** Titre d'un créneau : « Lundi 22/09 — matin (06-12z) ». */
  const slotTitle = s => `${wordL(s.jour)} ${dateFr(s.date)} — ${wordL(s.creneau)} (${s.heures})`;
  /** Case de la grille : code en couleur de la légende, commentaire au survol. */
  function codeCell(r) {
    const e = r.code ? gridData().legende[r.code] : null,
      col = e?.couleur || null;
    const title = [r.code ? L(['{c} : {s}', '{c}: {s}', '{c}: {s}', '{c}: {s}'], {
      c: `${r.code}${r.marque ? ' + ' + r.marque : ''}`,
      s: sensL(r.sens) || catL(r.categorie)
    }) : catL(r.categorie), r.commentaire ? L(['« {c} »', '“{c}”', '„{c}“', '«{c}»'], {
      c: r.commentaire
    }) : '', srcL(r.source)].filter(Boolean).join('\n');
    const style = col ? ` style="background:#${col};color:${inkOn(col)}"` : '';
    const label = r.code ? r.code + (r.marque || '') : r.categorie === 'hors_legende' ? String(r.code_brut).trim() : '·';
    return `<span class="odv-code c-${r.categorie}${r.commentaire ? ' has-note' : ''}"${style} title="${esc(title)}">${esc(label)}</span>`;
  }
  /** Thèmes ouverts d'un pilote du créneau (catégorie + préférences) : « tous thèmes » ou la liste des libellés. */
  const themeText = p => !p.themes ? '' : p.themes.includes('*') ? L(['tous thèmes', 'all themes', 'alle Themen', 'todos los temas']) : L(
    ['thèmes : {t}', 'themes: {t}', 'Themen: {t}', 'temas: {t}'], {
      t: p.themes.map(x => window.SuiteDispos?.themeLabel?.(x) || x).join(', ') || '—'
    });
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
  /** Nom du classeur sans .xlsx (« ODV » sans classeur) : base des noms de fichiers exportés. */
  const baseName = () => (fileName || 'ODV').replace(/\.xlsx$/i, '');
  /** Tableau triable (créé une fois, puis lignes remplacées). */
  function table(id, opts, rows) {
    if (!tables[id]) tables[id] = window.SortedTable.render($(id), {
      ...opts,
      rows
    });
    else tables[id].setRows(rows);
  }

  /** Remplace le contenu d'un conteneur de tableau et oublie son SortedTable (recréé au prochain table()). */
  function resetTable(id, html) {
    delete tables[id];
    $(id).innerHTML = html;
  }

  // ------------------------------------------------------------------ chargement
  async function loadFile(file, {
    keep = true,
    jump = false
  } = {}) {
    jumpToXl = jump;
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) notify(L(['« {f} » n’a pas l’extension .xlsx : lecture tentée quand même.',
      '“{f}” does not have the .xlsx extension: reading attempted anyway.',
      '„{f}“ hat nicht die Endung .xlsx: Lesen wird trotzdem versucht.',
      '«{f}» no tiene la extensión .xlsx: se intenta leer de todos modos.'
    ], {
      f: file.name
    }), 'warn');
    try {
      book = await C.openWorkbook(file);
      fileName = file.name;
      if (keep) window.FileAccess?.set('__odvFile', file).catch(() => {}); // copie gardée : rouverte au prochain passage
      selected = null;
      await rebuild();
      announce();
    } catch (e) {
      console.error(e);
      notify(L(['Lecture impossible : {e}', 'Cannot read the file: {e}', 'Lesen nicht möglich: {e}', 'Lectura imposible: {e}'], {
        e: e.message
      }), 'err');
    }
  }
  /** Relit le classeur selon les réglages, recalcule créneaux et contrôles, redessine tout. */
  async function rebuild() {
    if (!book) return render();
    try {
      xl = await C.extract(book, settings, fileName);
      if (jumpToXl) weekMon = xlMonday();
      jumpToXl = false;
    } catch (e) {
      console.error(e);
      notify(L(['Analyse impossible : {e}', 'Cannot analyse the workbook: {e}', 'Analyse nicht möglich: {e}',
        'Análisis imposible: {e}'
      ], {
        e: e.message
      }), 'err');
      xl = null;
    }
    await showWeek();
    if (xl && data === xl) await importPrefs(xl);
  }
  /** Classeur importé (secondaire) : un pilote sans préférences de thèmes en reçoit par défaut d'après ses codes (C →
   *  chasse…, T → transport…, N → marine et SAR : SuiteDispos.prefsFromCodes), écrites dans sa fiche utilisateur. */
  async function importPrefs(x) {
    if (!canEditActivations()) return;
    const SD = window.SuiteDispos,
      U = window.SuiteUsers,
      O = window.OdvAssign;
    if (!SD || !U || !O) return;
    let n = 0;
    for (const p of x.pilotes) {
      if (O.prefsOf(p.trigramme)) continue;
      const prefs = SD.prefsFromCodes(x.records.filter(r => r.pilote === p.trigramme && r.code).map(r => r.code));
      if (!prefs) continue;
      try {
        await U.setThemePrefs(p.trigramme, prefs);
        n++;
      } catch (e) {
        console.warn(e);
      }
    }
    if (!n) return;
    notify(L(['Types de missions créés d’après le classeur pour {n} pilote(s) qui n’en avaient pas.',
      'Mission types created from the workbook for {n} pilot(s) who had none.',
      'Missionsarten aus der Arbeitsmappe für {n} Pilot(en) ohne Angaben erstellt.',
      'Tipos de misión creados a partir del libro para {n} piloto(s) que no tenían.'
    ], {
      n
    }), 'ok');
    await showWeek(); // thèmes ouverts recalculés avec les nouvelles préférences
  }
  /** Affiche la semaine choisie : le classeur si c'est la sienne, sinon les déclarations des pilotes et les affectations
   *  (comme sans classeur) ; affectations relues, créneaux et missions probables recalculés. */
  async function showWeek() {
    data = xl && xl.dates[0] === isoDay(shownMonday()) ? xl : null;
    await window.OdvAssign?.load(data || emptyWeek(), settings).catch(e => console.warn(e)); // déclarations, affectations
    await loadAtc();
    compute(); // après les affectations : créneaux et missions probables sur les pilotes libres
    render();
  }
  /** Sélecteur de semaine (au-dessus de la grille) : précédente, suivante, en cours, semaine du classeur. */
  function renderWeekNav() {
    const host = $('odvWeekNav');
    if (!host) return;
    const mon = shownMonday(),
      cur = mondayOf(Date.now()),
      xm = xlMonday();
    const src = xm === mon ? L(['classeur {f}', 'workbook {f}', 'Arbeitsmappe {f}', 'libro {f}'], {
      f: fileName
    }) : L(['déclarations des pilotes et affectations (pas de classeur pour cette semaine)',
      'pilot declarations and assignments (no workbook for this week)',
      'Pilotenangaben und Zuweisungen (keine Arbeitsmappe für diese Woche)',
      'declaraciones de los pilotos y asignaciones (sin libro para esta semana)'
    ]);
    host.innerHTML = `<button type="button" class="secondary" data-wk="-1">◀ ${L(['Semaine précédente', 'Previous week', 'Vorherige Woche', 'Semana anterior'])}</button>
      <b>${L(['Semaine {n} — du {a} au {b}', 'Week {n} — from {a} to {b}', 'Woche {n} — vom {a} bis {b}', 'Semana {n} — del {a} al {b}'], { n: isoWeekNo(mon), a: esc(dateFr(isoDay(mon))), b: esc(dateFr(isoDay(mon + 6 * 864e5))) })}</b> <span class="mut">${esc(src)}</span>
      <button type="button" class="secondary" data-wk="1">${L(['Semaine suivante', 'Next week', 'Nächste Woche', 'Semana siguiente'])} ▶</button>${mon !== cur ? `<button type="button" class="ghost" data-wk="now">${L(['Cette semaine', 'This week', 'Diese Woche', 'Esta semana'])}</button>` : ''}${xm != null && xm !== mon ? `<button type="button" class="ghost" data-wk="xl">${L(['Semaine du classeur', 'Workbook week', 'Woche der Arbeitsmappe', 'Semana del libro'])}</button>` : ''}`;
    host.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => {
      const v = b.dataset.wk;
      weekMon = v === 'now' ? null : v === 'xl' ? xm : mon + +v * 6048e5;
      selected = null;
      showWeek();
    });
  }

  // CR par famille (registre des CR de ce navigateur, sinon data/cr/missions.yaml servi) : pondération des missions
  // probables (une famille souvent jouée recule un peu : odv_core.js, playWeight)
  let plays = null;
  /** Compte les CR par famille dans plays : ReportIndex, sinon copie « missionCoreLedger:v2 », sinon
   *  data/cr/missions.yaml servi (js-yaml chargé à la demande). */
  async function loadPlays() {
    // copie indexée du registre des CR (shared/data_index.js) : comptage sans analyse YAML
    const idx = await window.ReportIndex?.load?.();
    if (idx?.missions.length) {
      plays = {};
      for (const m of idx.missions)
        if (m?.family) plays[fold(m.family)] = (plays[fold(m.family)] || 0) + 1;
      return;
    }
    const root = window.RepositoryNav?.root || new URL('../../', location.href).href;
    if (!window.jsyaml) await new Promise(res => {
      const s = document.createElement('script');
      s.src = new URL('shared/mission_core/vendor/js-yaml.min.js', root).href;
      s.onload = s.onerror = res;
      document.head.append(s);
    });
    let list = [];
    try {
      list = window.jsyaml.load(JSON.parse(localStorage.getItem('missionCoreLedger:v2') || 'null')?.text || '')?.missions || [];
    } catch {
      /* registre illisible */
    }
    if (!list.length) try {
      list = window.jsyaml.load(await (await fetch(new URL('data/cr/missions.yaml', root).href, {
        cache: 'no-store'
      })).text())?.missions || [];
    } catch {
      /* pas de registre servi */
    }
    plays = {};
    for (const m of list)
      if (m?.family) plays[fold(m.family)] = (plays[fold(m.family)] || 0) + 1;
  }
  /** Créneaux, missions probables et vols de la frise. Un pilote déjà affecté sur un créneau (mission ou convoyage) n'y
   *  compte plus : effectif, missions probables et score ne portent que sur les pilotes libres. Un créneau garde sa
   *  place (seuil « au moins N pilotes ») d'après son effectif avant affectations (n0), pour proposer encore des
   *  missions aux pilotes restés libres. */
  function compute() {
    const all = withAtc(data || declWeek()),
      O = window.OdvAssign;
    basis = O ? {
      ...all,
      records: all.records.filter(r => !O.assigned(r.pilote, r.jourIndex, r.creneauIndex).length)
    } : all;
    if (data) window.MissionAssignments?.simulators?.(Object.values(data.flotte).flatMap(p => p.sims)); // liste des préférences pilote
    // préférences de thèmes des pilotes (fiches utilisateur, lues avec les déclarations) : thèmes ouverts des codes
    const prefsOf = tri => O?.prefsOf?.(tri) || null;
    slots = C.plan(basis, {
      ...settings,
      plays: plays || {},
      prefsOf
    });
    const full = basis === all ? slots : C.plan(all, {
      ...settings,
      prefsOf
    });
    slots.forEach((s, i) => {
      s.n0 = full[i]?.n ?? s.n;
    });
    flights = C.checkFlights(all, {
      ...settings,
      prefsOf
    });
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
    notify(L(['{f} lu : S{w}, {n} pilotes ({g}), {v}.', '{f} read: week {w}, {n} pilots ({g}), {v}.',
      '{f} gelesen: KW {w}, {n} Piloten ({g}), {v}.', '{f} leído: semana {w}, {n} pilotos ({g}), {v}.'
    ], {
      f: fileName,
      w: data.semaine ?? '?',
      n: data.pilotes.length,
      g: gridsL(filled),
      v: L(data.vols.length > 1 ? ['{n} vols sur la frise', '{n} flights on the timeline', '{n} Flüge auf der Zeitleiste',
        '{n} vuelos en la cronología'
      ] : ['{n} vol sur la frise', '{n} flight on the timeline', '{n} Flug auf der Zeitleiste', '{n} vuelo en la cronología'], {
        n: data.vols.length
      })
    }), 'ok');
    const shift = data.anomalies.find(a => a.decalage);
    if (shift) notify(C.say(shift.texte), 'warn');
    const warns = data.anomalies.filter(a => a.niveau === 'warn' && !a.decalage);
    if (warns.length === 1) notify(C.say(warns[0].texte), 'warn');
    else if (warns.length > 1) notify(L(['{n} avertissements de lecture : voir le rapport du bloc « Classeur ODV ».',
      '{n} reading warnings: see the report in the “ODV workbook” block.',
      '{n} Lesewarnungen: siehe Bericht im Block „ODV-Arbeitsmappe“.',
      '{n} avisos de lectura: vea el informe del bloque «Libro ODV».'
    ], {
      n: warns.length
    }), 'warn');
    const bad = flights.filter(f => f.alertes.length);
    if (bad.length) notify(L(bad.length > 1 ? [
      '{n} vols de la frise à vérifier (équipier codé indisponible ou hors de son code) : voir « Vols de la frise horaire ».',
      '{n} timeline flights to check (crew member coded unavailable or outside their code): see “Timeline flights”.',
      '{n} Flüge der Zeitleiste zu prüfen (Besatzungsmitglied als nicht verfügbar oder außerhalb seines Codes eingetragen): siehe „Flüge der Zeitleiste“.',
      '{n} vuelos de la cronología por verificar (tripulante codificado no disponible o fuera de su código): vea «Vuelos de la cronología».'
    ] : ['{n} vol de la frise à vérifier (équipier codé indisponible ou hors de son code) : voir « Vols de la frise horaire ».',
      '{n} timeline flight to check (crew member coded unavailable or outside their code): see “Timeline flights”.',
      '{n} Flug der Zeitleiste zu prüfen (Besatzungsmitglied als nicht verfügbar oder außerhalb seines Codes eingetragen): siehe „Flüge der Zeitleiste“.',
      '{n} vuelo de la cronología por verificar (tripulante codificado no disponible o fuera de su código): vea «Vuelos de la cronología».'
    ], {
      n: bad.length
    }), 'warn');
  }

  /** « Effacer les données » : classeur et calculs oubliés, retour à la semaine en cours sans classeur. */
  function clearAll() {
    book = null;
    xl = null;
    weekMon = null;
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
    window.OdvAssign?.load(emptyWeek(), settings).then(() => loadAtc()).then(refreshNoBook).catch(() => {});
    notify(L(['Données effacées de la page.', 'Data cleared from the page.', 'Daten von der Seite gelöscht.',
      'Datos borrados de la página.'
    ]), 'info');
  }

  // ------------------------------------------------------------------ rendu
  function render() {
    const has = !!data;
    // page hôte (Planning) : seuls les blocs créneaux et missions probables y sont ; les autres sont ignorés
    ['odvClear', 'odvCsv', 'odvJson', 'odvRecap', 'odvTxt'].forEach(id => {
      if ($(id)) $(id).disabled = !has;
    });
    if ($('odvCopy')) $('odvCopy').disabled = !has || !$('odvRecapText')?.value;
    renderReport();
    renderWeekNav();
    renderGrid();
    renderAtc();
    renderActivations();
    renderSlots();
    renderMissions();
    renderFlights();
  }

  // ------------------------------------------------------------------ sessions ATC des réseaux (shared/atc_sessions.js)
  // trainings, examens, événements et réservations VATSIM / IVAO de la semaine affichée : saisis à la main ou récupérés
  // (VATSIM, IVAO : périmètre du pays préféré, SuiteAtc.perimeter) ; comptés dans les créneaux (★, CTR du terrain à éviter
  // en training ou examen)
  let atc = {
    week: '',
    list: []
  };
  /** Identifiant de la semaine affichée pour les sessions ATC (SuiteAtc.weekId) ; '' sans module. */
  const atcWeek = () => window.SuiteAtc?.weekId(shownMonday()) || '';
  /** Lit les sessions ATC de la semaine affichée (fresh : sans cache), puis lance l'import IVAO automatique. */
  async function loadAtc(fresh = false) {
    const S = window.SuiteAtc,
      w = atcWeek();
    if (!S || !w) return;
    const list = await S.read(w, {
      fresh
    });
    if (w === atcWeek()) atc = {
      week: w,
      list
    };
    autoAtc(w);
  }
  /** Import IVAO automatique de la semaine ouverte (trainings, examens, réservations), au plus une fois par heure :
   *  le même que celui du Tableau (SuiteAtc.autoImport), seulement si la page peut écrire ; sans alerte. */
  function autoAtc(w) {
    if (!window.SuiteAtc?.autoImport || !canEditActivations()) return;
    window.SuiteAtc.autoImport(w, 'IVAO').then(r => {
      if (r.skipped || r.error || w !== atcWeek()) return;
      atc = {
        week: w,
        list: r.sessions
      };
      compute();
      render();
    });
  }
  /** Données du calcul complétées des sessions ATC de leur semaine. */
  function withAtc(d) {
    const S = window.SuiteAtc;
    if (!S || !atc.list.length || atc.week !== S.weekId(Date.parse(`${d.dates[0]}T12:00:00Z`))) return d;
    const p = S.toPlan(atc.list, d.dates, settings.hours);
    return {
      ...d,
      frise: [...d.frise, ...p.frise],
      evenements: [...d.evenements, ...p.evenements]
    };
  }
  /** Enregistre les sessions ATC de la semaine affichée (SuiteAtc.save) ; text : message de réussite, notifié si elles
   *  sont écrites dans le dossier ; recalcule et redessine la page. */
  async function saveAtc(list, text) {
    if (!canEditActivations()) return;
    const w = atcWeek();
    let r;
    try {
      r = await window.SuiteAtc.save(w, list);
    } catch (e) {
      return notify(e.message, 'err');
    }
    if (w !== atcWeek()) return;
    atc = {
      week: w,
      list
    };
    if (r.where === 'folder') notify(text, 'ok'); // gardé dans ce navigateur : alerte (et raison) données par writeData
    compute();
    render();
  }

  /** Bloc des sessions ATC de la semaine : trainings, examens et événements, réservations repliées, ajout et retrait
   *  à la main, import VATSIM / IVAO. */
  function renderAtc() {
    const host = $('odvAtc'),
      S = window.SuiteAtc;
    if (!host) return;
    if (!S) {
      host.innerHTML = '';
      return;
    }
    const dates = gridData().dates,
      per = S.perimeter(),
      list = atc.week === atcWeek() ? atc.list : [];
    const dayOpt = dates.map((d, j) => `<option value="${d}">${esc(wordL(C.DAYS[j]))} ${esc(dateFr(d))}</option>`).join('');
    // trainings, examens et événements en tête ; simples réservations (contexte ★, nombreuses une fois importées) repliées
    const row = (x, i) => `<tr class="odv-atc-${esc(x.type)}"><td>${esc(wordL(C.DAYS[dates.indexOf(x.date)] || ''))} ${esc(dateFr(x.date))}</td><td>${esc(x.debut)}–${esc(x.fin)}z</td><td><b>${esc(x.position)}</b></td><td>${esc(x.reseau)}</td><td>${esc(S.typeLabel(x.type))}</td><td>${esc(x.texte || '')}</td><td class="mut">${x.source === 'vatsim' || x.source === 'ivao' ? L(['récupérée', 'fetched', 'abgerufen', 'recuperada']) : L(['saisie', 'entered', 'eingegeben', 'introducida'])}</td><td><button type="button" class="ghost" data-atc-del="${i}" title="${esc(L(['Retirer cette session', 'Remove this session', 'Diese Sitzung entfernen', 'Quitar esta sesión']))}">×</button></td></tr>`;
    const indexed = list.map((x, i) => [x, i]),
      key = indexed.filter(([x]) => x.type !== 'reservation'),
      resa = indexed.filter(([x]) => x.type === 'reservation');
    const head = `<thead><tr><th>${L(['Jour', 'Day', 'Tag', 'Día'])}</th><th>${L(['Heures (UTC)', 'Hours (UTC)', 'Uhrzeit (UTC)', 'Horas (UTC)'])}</th><th>${L(['Position', 'Position', 'Position', 'Posición'])}</th><th>${L(['Réseau', 'Network', 'Netzwerk', 'Red'])}</th><th>${L(['Type', 'Type', 'Art', 'Tipo'])}</th><th>${L(['Commentaire', 'Comment', 'Kommentar', 'Comentario'])}</th><th>${L(['Source', 'Source', 'Quelle', 'Fuente'])}</th><th></th></tr></thead>`;
    /** Tableau des sessions données ([session, rang dans list]). */
    const table = l => `<table class="odv-week odv-atc">${head}<tbody>${l.map(([x, i]) => row(x, i)).join('')}</tbody></table>`;
    host.innerHTML = `${key.length ? table(key) : `<p class="mut odv-d-note">${list.length ? L(['Aucun training, examen ou événement ATC cette semaine.', 'No ATC training, exam or event this week.', 'Diese Woche kein ATC-Training, keine Prüfung, keine Veranstaltung.', 'Ningún entrenamiento, examen ni evento ATC esta semana.']) : L(['Aucune session ATC enregistrée pour cette semaine.', 'No ATC session recorded for this week.', 'Für diese Woche keine ATC-Sitzung erfasst.', 'Ninguna sesión ATC registrada para esta semana.'])}</p>`}
      ${resa.length ? `<details class="odv-atc-resa"><summary class="mut">${L(['{n} réservation(s) de position (contexte ★ des créneaux)', '{n} position booking(s) (★ slot context)', '{n} Positionsbuchung(en) (★ Kontext der Zeitfenster)', '{n} reserva(s) de posición (contexto ★ de las franjas)'], { n: resa.length })}</summary>${table(resa)}</details>` : ''}
      <form class="row odv-atc-form" data-atc-form>
        <select data-atc="date" aria-label="${esc(L(['Jour', 'Day', 'Tag', 'Día']))}">${dayOpt}</select>
        <input type="time" data-atc="debut" value="18:00" step="900" required aria-label="${esc(L(['Début (UTC)', 'Start (UTC)', 'Beginn (UTC)', 'Inicio (UTC)']))}">
        <input type="time" data-atc="fin" value="20:00" step="900" required aria-label="${esc(L(['Fin (UTC)', 'End (UTC)', 'Ende (UTC)', 'Fin (UTC)']))}">
        <input type="text" data-atc="position" required placeholder="LFBO_APP" size="11" pattern="[A-Za-z]{4}(_[A-Za-z0-9]+)*_([Dd][Ee][Ll]|[Gg][Nn][Dd]|[Tt][Ww][Rr]|[Aa][Pp][Pp]|[Dd][Ee][Pp]|[Cc][Tt][Rr]|[Ff][Ss][Ss]|[Rr][Mm][Pp]|[Aa][Tt][Ii][Ss])" title="${esc(L(['Position ATC : terrain OACI et poste, ex. LFBO_APP, LFMN_TWR, LFFF_CTR', 'ATC position: ICAO airfield and station, e.g. LFBO_APP, LFMN_TWR, LFFF_CTR', 'ATC-Position: ICAO-Flugplatz und Station, z. B. LFBO_APP, LFMN_TWR, LFFF_CTR', 'Posición ATC: aeródromo OACI y puesto, p. ej. LFBO_APP, LFMN_TWR, LFFF_CTR']))}">
        <select data-atc="reseau">${S.NETWORKS.map(n => `<option>${n}</option>`).join('')}</select>
        <select data-atc="type">${Object.keys(S.TYPES).map(k => `<option value="${k}">${esc(S.typeLabel(k))}</option>`).join('')}</select>
        <input type="text" data-atc="texte" placeholder="${esc(L(['Commentaire (facultatif)', 'Comment (optional)', 'Kommentar (optional)', 'Comentario (opcional)']))}">
        <button type="submit" class="secondary" data-icon="plus">${L(['Ajouter', 'Add', 'Hinzufügen', 'Añadir'])}</button>
      </form>
      <div class="row"><button type="button" class="secondary" data-atc-net="VATSIM" data-icon="refresh">${L(['Récupérer VATSIM ({p})', 'Fetch VATSIM ({p})', 'VATSIM abrufen ({p})', 'Recuperar VATSIM ({p})'], { p: esc(per.label) })}</button>
      <button type="button" class="secondary" data-atc-net="IVAO" data-icon="refresh" title="${esc(L(['Trainings, examens et réservations IVAO ({p}) ; clé d’API IVAO de l’installation (Paramètres › Installation). Pays : Paramètres › Centre › Planning ODV.', 'IVAO trainings, exams and bookings ({p}); installation IVAO API key (Settings › Installation). Country: Settings › Centre › ODV planning.', 'IVAO-Trainings, -Prüfungen und -Buchungen ({p}); IVAO-API-Schlüssel der Installation (Einstellungen › Installation). Land: Einstellungen › Zentrum › ODV-Planung.', 'Entrenamientos, exámenes y reservas IVAO ({p}); clave de API IVAO de la instalación (Ajustes › Instalación). País: Ajustes › Centro › Planificación ODV.'], { p: per.label }))}">${L(['Récupérer IVAO ({p})', 'Fetch IVAO ({p})', 'IVAO abrufen ({p})', 'Recuperar IVAO ({p})'], { p: esc(per.label) })}</button></div>`;
    const f = host.querySelector('[data-atc-form]'),
      v = k => f.querySelector(`[data-atc="${k}"]`).value.trim();
    f.onsubmit = e => {
      e.preventDefault();
      if (v('fin') <= v('debut')) return notify(L(['La fin doit suivre le début (même jour, heures UTC).',
        'The end must follow the start (same day, UTC hours).', 'Das Ende muss nach dem Beginn liegen (gleicher Tag, UTC).',
        'El fin debe seguir al inicio (mismo día, horas UTC).'
      ]), 'err');
      const s = {
        id: `manuel-${Date.now().toString(36)}`,
        date: v('date'),
        debut: v('debut'),
        fin: v('fin'),
        position: v('position').toUpperCase(),
        reseau: v('reseau'),
        type: v('type'),
        texte: v('texte'),
        source: 'manuel'
      };
      saveAtc([...list, s], L(['Session {p} ajoutée.', 'Session {p} added.', 'Sitzung {p} hinzugefügt.', 'Sesión {p} añadida.'], {
        p: s.position
      }));
    };
    host.querySelectorAll('[data-atc-del]').forEach(b => b.onclick = () => {
      const x = list[+b.dataset.atcDel];
      saveAtc(list.filter(y => y !== x), L(['Session {p} retirée.', 'Session {p} removed.', 'Sitzung {p} entfernt.',
        'Sesión {p} quitada.'
      ], {
        p: x.position
      }));
    });
    // import d'un réseau : le même que celui du Tableau (SuiteAtc.importNetwork : récupérées remplacées,
    // annulations comprises, saisies gardées)
    // lecture seule : ni ajout, ni retrait, ni import
    // (style posé ici : la mise en page des formulaires et boutons l'emporte sur l'attribut hidden)
    if (!canEditActivations()) host.querySelectorAll('[data-atc-form], [data-atc-del], [data-atc-net]').forEach(b => b.style.display =
      'none');
    host.querySelectorAll('[data-atc-net]').forEach(b => b.onclick = async () => {
      if (!canEditActivations()) return;
      const net = b.dataset.atcNet,
        w = atcWeek();
      b.disabled = true;
      const r = await S.importNetwork(w, net);
      b.disabled = false;
      if (r.error) return notify(r.error, 'err');
      if (w !== atcWeek()) return;
      atc = {
        week: w,
        list: r.sessions
      };
      const mine = r.sessions.filter(x => x.reseau === net && x.source !== 'manuel'),
        tr = mine.filter(x => x.type === 'training').length,
        ex = mine.filter(x => x.type === 'examen').length;
      if (r.where === 'folder') notify(L(['{r} : {t} training(s), {e} examen(s) et {b} autre(s) session(s) cette semaine ({p}).',
        '{r}: {t} training(s), {e} exam(s) and {b} other session(s) this week ({p}).',
        '{r}: {t} Training(s), {e} Prüfung(en) und {b} weitere Sitzung(en) diese Woche ({p}).',
        '{r}: {t} entrenamiento(s), {e} examen(es) y {b} otra(s) sesión(es) esta semana ({p}).'
      ], {
        p: S.perimeter().label,
        r: net,
        t: tr,
        e: ex,
        b: r.n - tr - ex
      }), 'ok');
      compute();
      render();
    });
  }

  // ------------------------------------------------------------------ activations des zones par réseau
  // même éditeur et même fichier que le Tableau (shared/odv_activations_editor.js, OdvAirspace :
  // data/atc/activations/<semaine>.json) ; retouche réservée comme au Tableau (Centre activé, hors production : admin)
  let activations = null;
  /** Retouche des activations permise : Centre activé et, en mode production, admin connecté. */
  /** Écritures permises (activations, sessions ATC, préférences importées) : Centre déverrouillé, et admin_centre en mode
   *  production ou dès qu'un utilisateur est connecté (même règle que canEdit du Tableau). */
  const canEditActivations = () => {
    const U = window.SuiteUsers;
    if (!window.RepositoryNav?.cpco?.enabled?.()) return false;
    if (U?.session?.()?.tri && !U.isAdmin?.()) return false;
    if ((window.RepositoryNav?.levels?.get?.() || 2) < 2) return false; // niveau 1 : consultation seulement
    return U?.mode?.() !== 'production' || !!U?.isAdmin?.();
  };

  /** Bloc des activations des zones (OdvActivationsEditor, monté une fois puis mis à la semaine affichée) ; un import
   *  de sessions depuis l'éditeur recalcule la page. */
  function renderActivations() {
    const host = $('odvActivations'),
      w = atcWeek();
    if (!host || !window.OdvActivationsEditor || !w) return;
    if (activations) return activations.set({
      semaine: w,
      readOnly: !canEditActivations()
    });
    activations = window.OdvActivationsEditor.mount(host, {
      semaine: w,
      readOnly: !canEditActivations(),
      onImport: ({
        sessions
      }) => {
        if (sessions?.error || atcWeek() !== w) return;
        atc = {
          week: w,
          list: sessions.sessions
        };
        compute();
        render();
      }
    });
  }

  /** Bloc « Classeur ODV » : fichier, semaine et source des dates, permanence, thème, pilotes, FLOTTE, frise et rapport
   *  de lecture ; vide sans classeur. */
  function renderReport() {
    const host = $('odvReport');
    if (!host) return;
    if (!data) {
      host.innerHTML = '';
      return;
    }
    const d = data,
      filled = d.pilotes.filter(p => p.rempli).length,
      flotteN = Object.keys(d.flotte).length;
    const week = d.semaine == null ? `<span class="odv-bad">${L(['introuvable', 'not found', 'nicht gefunden', 'no encontrada'])}</span>` :
      L(['S{w} {y} — du lundi {a} au dimanche {b}/{z} ({s})', 'Week {w} {y} — from Monday {a} to Sunday {b}/{z} ({s})',
        'KW {w} {y} — von Montag {a} bis Sonntag {b}/{z} ({s})', 'Semana {w} {y} — del lunes {a} al domingo {b}/{z} ({s})'
      ], {
        w: d.semaine,
        y: d.annee || '',
        a: esc(dateFr(d.dates[0])),
        b: esc(dateFr(d.dates[6])),
        z: esc((d.dates[6] || '').slice(0, 4)),
        s: d.dateSource === 'frise' && d.friseLundi ? L(['dates de la frise', 'timeline dates', 'Daten der Zeitleiste',
          'fechas de la cronología'
        ]) : L(['semaine ISO', 'ISO week', 'ISO-Woche', 'semana ISO'])
      });
    const shift = d.decalageJours ? ` <span class="odv-bad">— ${L(['frise : lundi au {d} (écart {n} j)', 'timeline: Monday on {d} (offset {n} d)', 'Zeitleiste: Montag am {d} (Abweichung {n} T)', 'cronología: lunes el {d} (desfase {n} d)'], { d: esc(d.friseLundi.split('-').reverse().join('/')), n: `${d.decalageJours > 0 ? '+' : ''}${d.decalageJours}` })}</span>` : '';
    const warns = d.anomalies.filter(a => a.niveau === 'warn').length,
      infos = d.anomalies.length - warns;
    host.innerHTML = `<dl class="odv-kv">
      <dt>${L(['Fichier', 'File', 'Datei', 'Archivo'])}</dt><dd>${esc(d.fichier)} <span class="mut">(${L(['feuilles {a}{b} ; jours en ligne {r}, grille {g}', 'sheets {a}{b}; days in row {r}, grid {g}', 'Blätter {a}{b}; Tage in Zeile {r}, Raster {g}', 'hojas {a}{b}; días en la fila {r}, cuadrícula {g}'], { a: esc(d.lecture.feuilleOdv), b: d.lecture.feuilleFlotte ? L([' et {x}', ' and {x}', ' und {x}', ' y {x}'], { x: esc(d.lecture.feuilleFlotte) }) : '', r: d.lecture.ligneJours, g: esc(d.lecture.grille) })})</span></dd>
      <dt>${L(['Semaine', 'Week', 'Woche', 'Semana'])}</dt><dd>${week}${shift}</dd>
      <dt>${L(['Officier de permanence', 'Duty officer', 'Diensthabender Offizier', 'Oficial de guardia'])}</dt><dd>${d.duty ? tri(d.duty) : `<span class="mut">${L(['non trouvé', 'not found', 'nicht gefunden', 'no encontrado'])}</span>`}</dd>
      ${d.theme ? `<dt>${L(['Thème de la semaine', 'Theme of the week', 'Thema der Woche', 'Tema de la semana'])}</dt><dd>${esc(d.theme)}</dd>` : ''}
      <dt>${L(['Pilotes', 'Pilots', 'Piloten', 'Pilotos'])}</dt><dd>${L(['{n} trouvés — {g}, {e} (case vide : {c})', '{n} found — {g}, {e} (empty cell: {c})', '{n} gefunden — {g}, {e} (leere Zelle: {c})', '{n} encontrados — {g}, {e} (casilla vacía: {c})'], { n: d.pilotes.length, g: gridsL(filled), e: L(d.pilotes.length - filled > 1 ? ['{n} vides', '{n} empty', '{n} leer', '{n} vacías'] : ['{n} vide', '{n} empty', '{n} leer', '{n} vacía'], { n: d.pilotes.length - filled }), c: settings.emptyAs === 'indispo' ? L(['indisponible', 'unavailable', 'nicht verfügbar', 'no disponible']) : L(['non renseignée', 'not filled in', 'nicht ausgefüllt', 'sin rellenar']) })}</dd>
      <dt>${L(['FLOTTE', 'FLOTTE sheet', 'Blatt FLOTTE', 'Hoja FLOTTE'])}</dt><dd>${flotteN ? L(['{n} profils (rôles et simulateurs indicatifs)', '{n} profiles (roles and simulators for guidance)', '{n} Profile (Rollen und Simulatoren als Richtwert)', '{n} perfiles (roles y simuladores orientativos)'], { n: flotteN }) : `<span class="mut">${L(['absente', 'missing', 'fehlt', 'ausente'])}</span>`}</dd>
      <dt>${L(['Frise horaire', 'Timeline', 'Zeitleiste', 'Cronología'])}</dt><dd>${L(['{v} vols, {f} contrôles ou divers, {z} zones à activer', '{v} flights, {f} control or miscellaneous items, {z} zones to activate', '{v} Flüge, {f} Lotsendienste oder Sonstiges, {z} zu aktivierende Zonen', '{v} vuelos, {f} controles o varios, {z} zonas por activar'], { v: d.vols.length, f: d.frise.length, z: d.zones.length })}${d.lecture.frise ? ` <span class="mut">(${L(['début {d}, {w} colonnes par jour, {h} par heure', 'start {d}, {w} columns per day, {h} per hour', 'Beginn {d}, {w} Spalten pro Tag, {h} pro Stunde', 'inicio {d}, {w} columnas por día, {h} por hora'], { d: esc(d.lecture.frise.debut), w: d.lecture.frise.largeurJour, h: d.lecture.frise.colonnesParHeure })})</span>` : ''}</dd>
      <dt>${L(['Lecture', 'Reading', 'Lesen', 'Lectura'])}</dt><dd>${L(warns > 1 ? ['{n} avertissements', '{n} warnings', '{n} Warnungen', '{n} avisos'] : ['{n} avertissement', '{n} warning', '{n} Warnung', '{n} aviso'], { n: warns })}, ${L(infos > 1 ? ['{n} remarques', '{n} notes', '{n} Hinweise', '{n} observaciones'] : ['{n} remarque', '{n} note', '{n} Hinweis', '{n} observación'], { n: infos })}</dd>
    </dl>
    ${d.anomalies.length ? `<details${warns ? ' open' : ''}><summary class="mut">${L(['Rapport de lecture ({n})', 'Reading report ({n})', 'Lesebericht ({n})', 'Informe de lectura ({n})'], { n: d.anomalies.length })}</summary><ul class="odv-notes">${d.anomalies.map(a => `<li class="${a.niveau}">${a.niveau === 'warn' ? '⚠ ' : ''}${esc(C.say(a.texte))}</li>`).join('')}</ul></details>` : ''}`;
  }

  // --- grille

  /** Filtres de la grille (grilles vides, couleur, rôle, simulateur) d'après les données du calcul ; filtre devenu sans
   *  objet levé ; choix mémorisés (odvPlanningView:v1). */
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
    // filtre gardé dont la valeur n'existe plus (autre classeur, autres déclarations) : levé
    if (view.color && !colors.includes(view.color)) view.color = '';
    if (view.role && !roles.includes(view.role)) view.role = '';
    if (view.sim && !sims.includes(view.sim)) view.sim = '';
    /** Option d'une liste, sélectionnée si v est la valeur courante. */
    const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
    host.innerHTML = `<label><input type="checkbox" id="odvHideEmpty"${view.hideEmpty ? ' checked' : ''}> ${L(['Masquer les grilles vides', 'Hide empty grids', 'Leere Raster ausblenden', 'Ocultar las cuadrículas vacías'])}</label>
      ${colors.length ? `<label>${L(['Couleur du trigramme', 'Trigram colour', 'Farbe des Kürzels', 'Color del trigrama'])} <select id="odvColor">${opt('', L(['toutes', 'all', 'alle', 'todas']), view.color)}${colors.map(c => opt(c, `#${c} (${data.pilotes.filter(p => p.couleur === c).length})`, view.color)).join('')}</select></label>` : ''}
      <label>${L(['Rôle', 'Role', 'Rolle', 'Función'])} (${data.virtuel ? L(['appareils déclarés', 'declared aircraft', 'angegebene Luftfahrzeuge', 'aeronaves declaradas']) : L(['FLOTTE', 'FLOTTE sheet', 'Blatt FLOTTE', 'hoja FLOTTE'])}) <select id="odvRole">${opt('', L(['tous', 'all', 'alle', 'todos']), view.role)}${roles.map(r => opt(r, C.roleLabel(r), view.role)).join('')}</select></label>
      <label>${L(['Simulateur', 'Simulator', 'Simulator', 'Simulador'])} <select id="odvSimF">${opt('', L(['tous', 'all', 'alle', 'todos']), view.sim)}${sims.map(s => opt(s, s, view.sim)).join('')}</select></label>`;
    $('odvHideEmpty').onchange = e => {
      view.hideEmpty = e.target.checked;
      saveView();
      renderGrid();
    };
    if ($('odvColor')) $('odvColor').onchange = e => {
      view.color = e.target.value;
      saveView();
      renderGrid();
    };
    $('odvRole').onchange = e => {
      view.role = e.target.value;
      saveView();
      renderGrid();
    };
    $('odvSimF').onchange = e => {
      view.sim = e.target.value;
      saveView();
      renderGrid();
    };
  }

  // --- missions affectées de la semaine : tableau (créneau en trois cases, clic : modifier l'affectation) et planning
  // heure par heure (un pilote par ligne, blocs colorés par mission avec l'indicatif ; clic : modifier)
  /** Créneau [j, k] d'une affectation : celui qui contient son décollage, sinon le plus proche du même jour ; null hors
   *  de la semaine. */
  function slotOfAssign(a, dates) {
    const O = window.OdvAssign,
      t = Date.parse(a.takeoff || a.alert?.ready_at_utc || '');
    if (!O || !t) return null;
    const hit = O.slotAt(t);
    if (hit) return hit;
    const j = (dates || []).indexOf(new Date(t).toISOString().slice(0, 10));
    if (j < 0) return null;
    let best = null,
      gap = Infinity;
    for (let k = 0; k < 3; k++) {
      const r = O.range(j, k);
      const d = !r ? Infinity : t < r[0] ? r[0] - t : t >= r[1] ? t - r[1] : 0;
      if (d < gap) {
        gap = d;
        best = [j, k];
      }
    }
    return best;
  }
  /** Trois cases matin / après-midi / soir, celle du créneau en surbrillance. */
  const slotSquares = jk => `<span class="odv-tri3" title="${esc(jk ? slotTitle(slotOf(jk[0], jk[1])) : '')}">${[0, 1, 2].map(k => `<i${jk && jk[1] === k ? ' class="on"' : ''}>${esc(shortL(k))}</i>`).join('')}</span>`;
  /** Affectation enregistrée rouverte dans le dialogue complet (« Modifier ») ; mission absente du registre de ce
   *  navigateur : fenêtre du créneau. */
  async function editAssigned(missionId, takeoff) {
    if (!centreOn()) return notify(L([
      'Réservé au Centre : l’activer dans Paramètres › Centre ({CENTRE}) ; un compte connecté doit avoir le rôle admin_centre.',
      'Reserved for the Centre: enable it in Settings › Centre ({CENTRE}); a signed-in account needs the admin_centre role.',
      'Dem Zentrum vorbehalten: in Einstellungen › Zentrum ({CENTRE}) aktivieren; ein angemeldetes Konto braucht die Rolle admin_centre.',
      'Reservado al Centro: actívelo en Ajustes › Centro ({CENTRE}); una cuenta conectada necesita el rol admin_centre.'
    ]), 'warn');
    const m = regMissions().find(x => x.id === missionId),
      jk = slotOfAssign({
        takeoff
      }, gridData().dates);
    if (!m) {
      if (jk) return pickMission(slotOf(jk[0], jk[1]));
      return notify(L(['{m} absente du registre de ce navigateur : relire le registre du Centre.',
        '{m} missing from this browser’s registry: re-read the Centre registry.',
        '{m} fehlt im Register dieses Browsers: das Register des Zentrums neu lesen.',
        '{m} ausente del registro de este navegador: vuelva a leer el registro del Centro.'
      ], {
        m: missionId
      }), 'warn');
    }
    await window.OdvAssign.assign(m, [], Date.parse(takeoff), L(['Modification de l’affectation de {m}',
      'Editing the assignment of {m}', 'Änderung der Zuweisung von {m}', 'Modificación de la asignación de {m}'
    ], {
      m: m.id
    }));
  }
  // jour affiché dans le planning heure par heure (indice 0-6 de la semaine ; mémoire)
  let planDay = null;
  const PLAN_COLORS = ['#3b6fd8', '#d8763b', '#2f9e6e', '#a64fc4', '#c43f5a', '#2a9bb5', '#b59a2a', '#6a7a8c'];
  /** Couleur stable d'une mission dans le planning (empreinte de son identifiant). */
  const planColor = id => PLAN_COLORS[[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PLAN_COLORS.length];
  /** Planning heure par heure d'un jour de la semaine (onglets : jours ayant des missions). */
  function planningHtml(week, dates) {
    const M = window.MissionAssignments;
    if (!week.length || !M?.busyRange) return '';
    /** Jour (0-6) du début d'occupation d'une affectation ; -1 hors de la semaine. */
    const dayOf = a => dates.indexOf(new Date(M.busyRange(a)[0]).toISOString().slice(0, 10));
    const days = [...new Set(week.map(dayOf).filter(j => j >= 0))].sort((a, b) => a - b);
    if (!days.length) return '';
    const today = dates.indexOf(new Date().toISOString().slice(0, 10));
    if (planDay == null || !days.includes(planDay)) planDay = days.includes(today) ? today : days.find(j => j >= today) ?? days[0];
    const j = planDay,
      d0 = Date.parse(`${dates[j]}T00:00:00Z`),
      d1 = d0 + 864e5,
      items = week.filter(a => (([f, l]) => f < d1 && l > d0)(M.busyRange(a)));
    // heures montrées : celles des créneaux, élargies aux missions du jour
    let h0 = Math.min(...settings.hours.map(h => h[0])),
      h1 = Math.max(...settings.hours.map(h => h[1]));
    for (const a of items) {
      const [f, l] = M.busyRange(a);
      h0 = Math.min(h0, Math.max(0, Math.floor((f - d0) / 36e5)));
      h1 = Math.max(h1, Math.min(24, Math.ceil((l - d0) / 36e5)));
    }
    h0 = Math.floor(h0);
    h1 = Math.ceil(h1);
    const t0 = d0 + h0 * 36e5,
      span = (h1 - h0) * 36e5,
      x = t => Math.max(0, Math.min(100, (t - t0) / span * 100)),
      now = Date.now(),
      hm = t => new Date(t).toISOString().slice(11, 16);
    const hours = Array.from({
      length: h1 - h0 + 1
    }, (_, i) => h0 + i);
    // fond : créneaux matin, après-midi, soir (celui de l'heure présente en surbrillance), heure présente
    const bands = [0, 1, 2].map(k => {
      const r = window.OdvAssign?.range(j, k);
      if (!r) return '';
      return `<i class="odv-plan-band${now >= r[0] && now < r[1] ? ' cur' : ''}" style="left:${x(r[0])}%;width:${x(r[1]) - x(r[0])}%"></i>`;
    }).join('') + (now >= t0 && now < t0 + span ? `<i class="odv-plan-now" style="left:${x(now)}%"></i>` : '');
    const pilots = [...new Set(items.map(a => a.pilot || ''))].sort((a, b) => !a - !b || a.localeCompare(b));
    const rows = pilots.map(p => `<div class="odv-plan-row"><span class="odv-plan-pil">${p ? tri(p, null, false) : `<i>${L(['à affecter', 'to assign', 'zuzuweisen', 'por asignar'])}</i>`}</span><div class="odv-plan-track">${bands}${items.filter(a => (a.pilot || '') === p).map(a => {
      const [f, l] = M.busyRange(a),
        ferry = a.role === 'convoyage';
      // bloc : <span role="button"> (les designs habillent les <button> : fond, relief) ; clavier : Entrée
      return `<span role="button" tabindex="0" class="odv-plan-blk${ferry ? ' ferry' : ''}" data-edit-assign="${esc(a.mission)}" data-t="${esc(a.takeoff || '')}" style="left:${x(f)}%;width:${Math.max(1.5, x(l) - x(f))}%;--c:${planColor(a.mission)}" title="${esc(`${a.mission} ${a.title || ''} — ${hm(f)}–${hm(l)}Z${a.callsign ? ` — ${a.callsign}` : ''}${ferry ? ` — ${L(['convoyage pour {p}', 'ferry for {p}', 'Überführung für {p}', 'traslado para {p}'], { p: a.for_pilot || '' })}` : ''} — ${L(['clic : modifier', 'click: edit', 'Klick: ändern', 'clic: modificar'])}`)}">${esc(ferry ? `⇢ ${a.callsign || a.mission}` : a.callsign || a.mission)}</span>`;
    }).join('')}</div></div>`).join('');
    return `<h4 class="odv-week-h">${L(['Planning heure par heure', 'Hour-by-hour planning', 'Stundenplanung', 'Planificación hora por hora'])}</h4>
      <div class="odv-plan-days">${days.map(jj => `<button type="button" class="${jj === j ? 'primary' : 'secondary'}" data-plan-day="${jj}">${esc(dayAbbr(C.DAYS[jj]))} ${esc(dateFr(dates[jj]))} <small>(${new Set(week.filter(a => dayOf(a) === jj).map(a => a.mission)).size})</small></button>`).join('')}</div>
      <div class="odv-plan"><div class="odv-plan-row odv-plan-head"><span></span><div class="odv-plan-track">${hours.map(h => `<span style="left:${x(d0 + h * 36e5)}%">${String(h).padStart(2, '0')}z</span>`).join('')}</div></div>${rows}</div>`;
  }

  /** Grille dense de la semaine : légende, une ligne par pilote filtré (code du classeur, puis déclaration et
   *  affectation par créneau), missions affectées de la semaine, planning heure par heure, journal des affectations. */
  function renderGrid() {
    if (!$('odvGrid')) return; // bloc absent (Planning)
    renderGridFilters();
    const data = gridData(); // classeur lu, sinon semaine sans classeur (ligne du classeur vide)
    // légende : codes de la légende et nombre de cases
    const counts = {};
    for (const r of data.records)
      if (r.code) counts[r.code] = (counts[r.code] || 0) + 1;
    $('odvLegend').innerHTML = (data.virtuel ? `<span class="odv-noxl">${L(['Pas de classeur : semaine du {a} au {b} ; déclarations des pilotes et affectations.', 'No workbook: week from {a} to {b}; pilot declarations and assignments.', 'Keine Arbeitsmappe: Woche vom {a} bis {b}; Pilotenangaben und Zuweisungen.', 'Sin libro: semana del {a} al {b}; declaraciones de los pilotos y asignaciones.'], { a: esc(dateFr(data.dates[0])), b: esc(dateFr(data.dates[6])) })}</span>` : '') + (data.virtuel ? [] : Object.values(data.legende)).map(e => `<span>${codeCell({ code: e.code, sens: e.sens, categorie: e.categorie, source: '' })} ${esc(sensL(e.sens))}${counts[e.code] ? ` <b>${counts[e.code]}</b>` : ''}</span>`)
      .join('') +
      (data.virtuel ? '' : `<span>${codeCell({ categorie: 'inconnu', source: '' })} ${esc(catL('inconnu'))}</span>`) +
      // déclarations des pilotes : regroupées (Disponible, Exercice SOG, Occupé, Indisponible), détail au survol
      (window.DisposEditor?.legend ? `<div class="odv-legend-decl"><b>${L(['Déclarations des pilotes', 'Pilot declarations', 'Pilotenangaben', 'Declaraciones de los pilotos'])}</b>${window.DisposEditor.legend()}</div>` : ''); // même légende que Mes missions
    const byPilot = new Map(data.pilotes.map(p => [p.trigramme, []]));
    for (const r of data.records) byPilot.get(r.pilote)?.push(r);
    // grille non vide : cases du classeur, ou seconde ligne du pilote (déclaration faite dans la suite — copie de ce
    // navigateur ou data/disponibilites — ou mission affectée sur un créneau de la semaine)
    const O = window.OdvAssign,
      declared = p => !!O && C.DAYS.some((_, j) => [0, 1, 2].some(k => O.declared(p.trigramme, j, k) || O.assigned(p.trigramme, j, k)
        ?.length));
    const rows = data.pilotes.filter(p => (!view.hideEmpty || p.rempli || declared(p)) && (!view.color || p.couleur === view.color) &&
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
            roles: (p.profil?.roles || []).map(r => C.roleLabel(r)).join(', '),
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
    const head = `<thead><tr><th rowspan="2" class="odv-d-pil">${L(['Pilote', 'Pilot', 'Pilot', 'Piloto'])}</th><th rowspan="2" class="odv-d-n" title="${esc(L(['Créneaux disponibles (+ contrôle)', 'Available slots (+ ATC)', 'Verfügbare Zeitfenster (+ Lotse)', 'Franjas disponibles (+ control)']))}">${L(['Dispo', 'Avail.', 'Verf.', 'Disp.'])}</th>${C.DAYS.map((d, j) => `<th colspan="3" class="odv-d-day">${esc(dayAbbr(d))} ${esc(dateFr(data.dates[j]))}</th>`).join('')}</tr>
      <tr>${C.DAYS.map(() => SHORT.map((s, k) => `<th class="odv-d-slot" title="${esc(L([['matin', 'morning', 'Morgen', 'mañana'], ['après-midi', 'afternoon', 'Nachmittag', 'tarde'], ['soir', 'evening', 'Abend', 'noche']][k] || [s, s, s, s]))} (${esc(`${String(settings.hours[k][0]).padStart(2, '0')}-${String(settings.hours[k][1]).padStart(2, '0')}z`)})">${esc(shortL(k))}</th>`).join('')).join('')}</tr></thead>`;
    const body = rows.map(r => {
      const tip = [r.roles && L(['Rôles : {x}', 'Roles: {x}', 'Rollen: {x}', 'Funciones: {x}'], {
        x: r.roles
      }), r.sims && L(['Simulateurs : {x}', 'Simulators: {x}', 'Simulatoren: {x}', 'Simuladores: {x}'], {
        x: r.sims
      }), L(['Ligne {n} du classeur', 'Workbook row {n}', 'Zeile {n} der Arbeitsmappe', 'Fila {n} del libro'], {
        n: r.ligne
      })].filter(Boolean).join('\n');
      return `<tr><th class="odv-d-pil" title="${esc(tip)}">${tri(r.pilote, r.couleur, false)}</th><td class="odv-d-n">${r.dispo}${r.atc ? `<small>+${r.atc}</small>` : ''}</td>${C.DAYS.map((_, j) => [0, 1, 2].map(k => {
        const v = r[`s${j}${k}`];
        return `<td class="odv-d-cell${k === 2 ? ' odv-d-end' : ''}">${data.virtuel && withDecl ? '' : codeCell(v)}${withDecl ? window.OdvAssign.line(r.pilote, j, k, v, codeCell) : ''}</td>`;
      }).join('')).join('')}</tr>`;
    }).join('');
    delete tables.odvGrid;
    const week = window.OdvAssign?.week() || [];
    const journal = window.OdvAssign?.journal?.() || [];
    const journalHtml = journal.length ? `<details class="odv-journal"><summary>${L(['Journal des affectations ({n})', 'Assignment log ({n})', 'Zuweisungsprotokoll ({n})', 'Registro de asignaciones ({n})'], { n: journal.length })}</summary><ul>${journal.slice(0, 30).map(e => `<li>${esc(window.MissionAssignments.logText(e))}</li>`).join('')}</ul></details>` : '';
    const dates = data.dates,
      clickable = centreOn();
    const weekHtml = week.length ? `<h4 class="odv-week-h">${L(['Missions affectées cette semaine ({n})', 'Missions assigned this week ({n})', 'Diese Woche zugewiesene Missionen ({n})', 'Misiones asignadas esta semana ({n})'], { n: new Set(week.map(a => a.mission)).size })}</h4><table class="odv-week"><thead><tr><th>${L(['Décollage', 'Take-off', 'Start', 'Despegue'])}</th><th>${L(['Créneau', 'Slot', 'Zeitfenster', 'Franja'])}</th><th>${L(['Mission', 'Mission', 'Mission', 'Misión'])}</th><th>${L(['Pilote', 'Pilot', 'Pilot', 'Piloto'])}</th><th>${L(['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'])}</th><th>${L(['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'])}</th><th>${L(['Terrain', 'Airfield', 'Flugplatz', 'Aeródromo'])}</th><th>${L(['Rôle', 'Role', 'Rolle', 'Función'])}</th></tr></thead><tbody>${week.map(a => `<tr${clickable ? ` data-edit-assign="${esc(a.mission)}" data-t="${esc(a.takeoff || '')}" title="${esc(L(['Clic : modifier l’affectation de {m}', 'Click: edit the assignment of {m}', 'Klick: Zuweisung von {m} ändern', 'Clic: modificar la asignación de {m}'], { m: a.mission }))}"` : ''}><td>${esc(dateFr(String(a.takeoff).slice(0, 10)))} ${esc(String(a.takeoff).slice(11, 16))}Z</td><td>${slotSquares(slotOfAssign(a, dates))}</td><td><b>${esc(a.mission)}</b> ${esc(a.title || '')}</td><td>${a.pilot ? tri(a.pilot, null, false) : `<i>${L(['à affecter', 'to assign', 'zuzuweisen', 'por asignar'])}</i>`}</td><td>${esc(a.callsign || '')}</td><td>${esc([a.aircraft?.type, a.aircraft?.registration].filter(Boolean).join(' '))}</td><td>${esc(a.departure || '')}</td><td>${a.role === 'convoyage' ? L(['convoyage pour {p}', 'ferry for {p}', 'Überführung für {p}', 'traslado para {p}'], { p: esc(a.for_pilot || '') }) : a.ferry ? L(['mission (convoyage dès {t}Z)', 'mission (ferry from {t}Z)', 'Mission (Überführung ab {t}Z)', 'misión (traslado desde {t}Z)'], { t: esc(String(a.ferry.takeoff || '').slice(11, 16)) }) : L(['mission', 'mission', 'Mission', 'misión'])}</td></tr>`).join('')}</tbody></table>${planningHtml(week, dates)}` : `<p class="mut odv-d-note">${L(['Aucune mission affectée cette semaine.', 'No mission assigned this week.', 'Diese Woche keine Mission zugewiesen.', 'Ninguna misión asignada esta semana.'])}</p>`;
    $('odvGrid').innerHTML = rows.length ? `<div class="odv-dense-wrap"><table class="odv-dense">${head}<tbody>${body}</tbody></table></div><p class="mut odv-d-note">${withDecl && data.virtuel ? L(['Par pilote : sa déclaration, couleur de la catégorie (encadré rouge : disponible et non affecté ; clic : affecter). ', 'Per pilot: their declaration, colour of the category (red frame: available and not assigned; click: assign). ', 'Pro Pilot: seine Angabe, Farbe der Kategorie (roter Rahmen: verfügbar und nicht zugewiesen; Klick: zuweisen). ', 'Por piloto: su declaración, color de la categoría (recuadro rojo: disponible y sin asignar; clic: asignar). ']) : withDecl ? L(['Par pilote : code du classeur, puis sa déclaration (encadré rouge : disponible et non affecté ; clic : affecter). ', 'Per pilot: workbook code, then their declaration (red frame: available and not assigned; click: assign). ', 'Pro Pilot: Code der Arbeitsmappe, dann seine Angabe (roter Rahmen: verfügbar und nicht zugewiesen; Klick: zuweisen). ', 'Por piloto: código del libro y luego su declaración (recuadro rojo: disponible y sin asignar; clic: asignar). ']) : ''}${L(['Rôles et simulateurs au survol du trigramme.', 'Roles and simulators when hovering over the trigram.', 'Rollen und Simulatoren beim Überfahren des Kürzels.', 'Roles y simuladores al pasar el ratón por el trigrama.'])}</p>${weekHtml}${journalHtml}` : `<p class="odv-empty">${L(['Aucun pilote ne correspond aux filtres.', 'No pilot matches the filters.', 'Kein Pilot entspricht den Filtern.', 'Ningún piloto coincide con los filtros.'])}</p>`;
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

  /** Carte de chaleur des 21 créneaux (pilotes libres, contrôleurs, affectations ✎, événements ★) ; clic : fenêtre
   *  d'affectation du créneau (pickMission). */
  function renderSlots() {
    if (!$('odvHeat')) return;
    renderSlotFilters();
    const data = basis;
    if (!data) {
      $('odvHeat').innerHTML = `<p class="odv-empty">${L(['Chargez un classeur ODV.', 'Load an ODV workbook.', 'ODV-Arbeitsmappe laden.', 'Cargue un libro ODV.'])}</p>`;
      return;
    }
    const max = Math.max(1, ...slots.map(s => s.n));
    let html = '<div class="odv-heat"><span></span>' + C.SLOT_LABELS.map((l, k) => `<span class="h">${esc(capL(l))}<br><span class="mut">${esc(slots[k].heures)}</span></span>`).join('');
    for (let j = 0; j < 7; j++) {
      html += `<span class="d">${esc(wordL(C.DAYS[j]))} ${esc(dateFr(data.dates[j]))}</span>`;
      for (let k = 0; k < 3; k++) {
        const s = slots[j * 3 + k],
          key = `${j}${k}`,
          has = (window.OdvAssign?.inSlot(j, k) || []).some(a => a.role !== 'convoyage');
        const bits = [s.atc.length ? L(['+{n} ctrl', '+{n} ATC', '+{n} ATC', '+{n} ctrl'], {
          n: s.atc.length
        }) : '', has ? '✎' : '', s.evenements.length ? '★' : ''].filter(Boolean).join(' · ');
        html += `<button type="button" data-slot="${key}" class="repo-plain${has ? ' has' : ''}${s.n0 < settings.minPilots ? ' low' : ''}" style="--pct:${Math.round(s.n / max * 70)}%" title="${esc(L(s.n0 > s.n ? ['{t} : {n} pilote(s) libre(s) sur {m}, {a} contrôleur(s)', '{t}: {n} free pilot(s) of {m}, {a} controller(s)', '{t}: {n} freie(r) Pilot(en) von {m}, {a} Lotse(n)', '{t}: {n} piloto(s) libre(s) de {m}, {a} controlador(es)'] : ['{t} : {n} pilote(s) libre(s), {a} contrôleur(s)', '{t}: {n} free pilot(s), {a} controller(s)', '{t}: {n} freie(r) Pilot(en), {a} Lotse(n)', '{t}: {n} piloto(s) libre(s), {a} controlador(es)'], { t: slotTitle(s), n: s.n, m: s.n0, a: s.atc.length }) + ' — ' + L(has ? ['clic : modifier les missions affectées ou en planifier d’autres', 'click: edit the assigned missions or plan others', 'Klick: zugewiesene Missionen ändern oder weitere planen', 'clic: modificar las misiones asignadas o planificar otras'] : ['clic : planifier des missions du registre', 'click: plan registry missions', 'Klick: Missionen des Registers planen', 'clic: planificar misiones del registro']))}"><b>${s.n}</b><small>${esc(bits || ' ')}</small></button>`;
      }
    }
    $('odvHeat').innerHTML = html + '</div>';
    // clic : directement « modifier ou planifier » (fenêtre d'affectation du créneau)
    $('odvHeat').querySelectorAll('button[data-slot]').forEach(b => {
      b.onclick = () => pickMission(slots[+b.dataset.slot[0] * 3 + +b.dataset.slot[1]]);
    });
  }

  // --- choix d'une mission du registre (Centre) pour un créneau où des pilotes sont libres
  // Missions du registre du navigateur (missionRegistry:v1, rempli par le registre du Centre) avec rendez-vous ou à
  // plusieurs équipes, famille du créneau, pas plus d'équipes en l'air que de pilotes disponibles ; route estimée
  // (points du registre, tronçons échantillonnés) confrontée aux sessions ATC du créneau : CTR du terrain en examen ou
  // en training → écartée, TMA contenant le terrain → signalée. Ouverture dans le registre (?mission=…).
  // affectations possibles (fenêtre du créneau, choix des pilotes) : mêmes droits que les autres écritures de la page
  // (Centre déverrouillé ; admin_centre en production ou dès qu'un utilisateur est connecté)
  const centreOn = () => canEditActivations();
  /** Texte sans accents, en majuscules (comparaison des familles). */
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  /** Opération d'une mission : tirée de l'identifiant (I-001A → I-001 : missions d'équipage d'une opération), sinon
   *  celle du registre (registres anciens ou incomplets : l'identifiant fait foi) ; '' sinon. */
  const opOf = m => (/^([A-Z]+-\d+)[A-Y]$/i.exec(String(m?.id || '')) || [])[1] || m?.operation?.id || '';
  /** Missions du registre du navigateur (MissionIndex, sinon « missionRegistry:v1 ») ; [] si illisible. */
  const regMissions = () => {
    try {
      // registre des missions : copie en mémoire de l'index (shared/data_index.js)
      return (window.MissionIndex ? window.MissionIndex.all() : (window.RepositoryKit?.store?.jsonCached ? window.RepositoryKit.store
        .jsonCached('missionRegistry:v1', null) : JSON.parse(localStorage.getItem('missionRegistry:v1') || 'null'))?.missions) || [];
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
      texte: L(['route inconnue (registre à relire)', 'unknown route (registry to re-read)',
        'Route unbekannt (Register neu einlesen)', 'ruta desconocida (volver a leer el registro)'
      ])
    }];
    const first = list => list.find(a => S.some(p => (a.rings || []).some(r => inR(r, p.lat, p.lon))));
    const out = [];
    for (const z of zones) {
      const c = first(z.ctr);
      if (c) {
        out.push({
          grave: true,
          texte: L(['traverse la CTR {n} ({z})', 'crosses the {n} CTR ({z})', 'durchquert die CTR {n} ({z})',
            'atraviesa la CTR {n} ({z})'
          ], {
            n: c.name,
            z: `${C.kindLabel(z.type)} ${z.position}`
          })
        });
        continue;
      }
      const t = first(z.tma);
      if (t) out.push({
        grave: false,
        texte: L(['traverse la TMA {n} ({z})', 'crosses the {n} TMA ({z})', 'durchquert die TMA {n} ({z})',
          'atraviesa la TMA {n} ({z})'
        ], {
          n: t.name,
          z: `${C.kindLabel(z.type)} ${z.position}`
        })
      });
    }
    return out;
  }
  /** Durée en minutes → « 1 h 05 » ; « — » si absente ou nulle. */
  const hmOf = min => Number.isFinite(+min) && +min > 0 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}` : '—';
  /** Fenêtre de choix : missions du registre pour le créneau s (famille fam, sinon familles probables du créneau). */
  async function pickMission(s, fam = '', {
    focus = ''
  } = {}) {
    // Matrice d'un créneau (transaction) : missions du registre × postes (un par équipage : indicatif, type ou catégorie
    // et service) ; rien de présélectionné : le planificateur coche une mission, choisit l'appareil (compatible, du plus
    // proche au plus lointain du départ, convoyage indiqué), puis le pilote (libres jusqu'à la fin avec l'appareil
    // d'abord). Missions déjà affectées (semaine affichée ou passé) écartées. Les choix restent en attente, visibles (« RBR → I-01A · appareil ·
    // indicatif ») : « Enregistrer » écrit les missions cochées, « Annuler les modifications » revient à l'ouverture ;
    // la fenêtre se ferme quand tous les pilotes libres sont affectés, ou sur demande (confirmation si modifications en
    // attente). « ✎ Détail » : dialogue d'affectation complet, dont le résultat revient dans la matrice.
    // Durée : une mission plus longue que le créneau mobilise les suivants (son pilote doit être libre jusqu'à la fin).
    // Convoyage (appareil basé ailleurs) : confié à un pilote libre avant le créneau (proposé, ou choisi) ; sinon le
    // pilote de la mission le fait en début de créneau et la mission est décalée d'autant (horaire : timeAll).
    const O = window.OdvAssign,
      M = window.MissionAssignments,
      AD = window.AssignDialog,
      j = s.jourIndex,
      k = s.creneauIndex,
      range = O?.range(j, k);
    if (!centreOn()) {
      notify(L(['Registre des missions : Centre verrouillé — l’activer dans Paramètres › Centre ({CENTRE}).',
        'Mission registry: Centre locked — enable it in Settings › Centre ({CENTRE}).',
        'Missionsregister: Zentrum gesperrt — in Einstellungen › Zentrum ({CENTRE}) aktivieren.',
        'Registro de misiones: Centro bloqueado — actívelo en Ajustes › Centro ({CENTRE}).'
      ]), 'warn');
      return;
    }
    const all = regMissions();
    if (!all.length) {
      notify(L(['Registre des missions vide dans ce navigateur : ouvrir le registre du Centre et relire le dossier des missions.',
        'Mission registry empty in this browser: open the Centre registry and re-read the missions folder.',
        'Missionsregister in diesem Browser leer: das Register des Zentrums öffnen und den Missionsordner neu einlesen.',
        'Registro de misiones vacío en este navegador: abra el registro del Centro y vuelva a leer la carpeta de misiones.'
      ]), 'warn');
      return;
    }
    if (!O?.write || !M?.postsOf || !AD?.frame) return notify(L([
      'Affectations : modules absents (assignments.js, odv_assign.js, assign_dialog.js).',
      'Assignments: modules missing (assignments.js, odv_assign.js, assign_dialog.js).',
      'Zuweisungen: Module fehlen (assignments.js, odv_assign.js, assign_dialog.js).',
      'Asignaciones: faltan módulos (assignments.js, odv_assign.js, assign_dialog.js).'
    ]), 'err');
    const zones = await zonesToAvoid(s.eviter);
    const fams = [...new Set([...s.toutesMissions.map(m => m.famille), ...all.map(m => fold(m.family || m.type)).filter(Boolean)])]
      .sort();
    const chip = AD.chip,
      takeoff = range?.[0],
      title = `${esc(slotTitle(s))} — ${L(['affecter les pilotes libres', 'assign the free pilots', 'freie Piloten zuweisen', 'asignar los pilotos libres'])}`;
    let famSel = fam || '',
      ctx = null, // { free, decls, d: Map(id → { m, on, rows: [{ post, pilot, registration, callsign, ferryPilot }] }) }
      initial = '',
      dlg = null;
    /** Empreinte des choix de la matrice (missions cochées, décollages, postes) : modifications en attente. */
    const snap = () => JSON.stringify([...ctx.d.values()].map(x => [x.m.id, x.on, x.takeoffSet ?? null, x.rows.map(r => [r.pilot, r
      .registration, r.callsign, r.ferryPilot || '', !!r.ferrySelf, !!r.ferryOpen
    ])]));
    const TURN = M.TURN_MIN,
      blockOf = m => +(m.estimate?.block ?? m.estimate?.flight) || 120,
      hm = ms => new Date(ms).toISOString().slice(11, 16) + 'Z',
      slotName = ([jj, kk]) => (sl => `${wordL(sl.jour)} ${wordL(sl.creneau)}`)(slotOf(jj, kk));
    /** Horaire des missions (cochées d'abord) : convoyages (convoyeur choisi s'il reste libre, sinon le meilleur pilote
     *  libre sur tout le convoyage, avec l'appareil ; à défaut le pilote de la mission, qui la décale), décollage, fin,
     *  créneaux mobilisés, pilote libre sur toute la mission. Un convoyeur ne sert qu'une fois. */
    async function timeAll() {
      const inWin = new Set([...ctx.d.values()].flatMap(y => (y.members || [y.m]).map(mm => mm.id))),
        t0 = takeoff,
        taken = new Set([...ctx.d.values()].filter(x => x.on).flatMap(x => x.rows.map(r => r.pilot).filter(Boolean)));
      for (const x of [...ctx.d.values()].sort((a, b) => b.on - a.on)) {
        const dep = x.dep,
          block = blockOf(x.m);
        const legs = await Promise.all(x.rows.map(async r => {
          const pl = planeOf(r.registration),
            dep = r.dep || x.dep; // opération : départ de la mission du poste
          // départ sans terrain (mission en mer, sur un objectif) : l'appareil part de sa base, pas de convoyage
          const at = adOf(pl);
          return pl && dep.code && dep.pos && at && !(await atDeparture(at, dep)) ? await M.ferryOf({
            base: at,
            departure: dep.code,
            to: dep.pos,
            type: pl.type,
            takeoff: t0
          }) : null;
        }));
        // décollage : heure choisie (avancée ou retardée), sinon début du créneau, décalé si un convoyage l'exige
        // décollage d'un poste : tk (heure H d'une opération) + son décalage ; H par défaut : le premier équipage
        // décolle au début du créneau
        const at = r => tk + (r.off || 0) * 6e4,
          auto = t0 - Math.min(0, ...x.rows.map(r => r.off || 0)) * 6e4,
          base0 = x.takeoffSet ?? auto;
        let tk = base0;
        for (let pass = 0; pass < 4; pass++) {
          const used = new Set();
          let need = 0;
          x.rows.forEach((r, i) => {
            const f = legs[i],
              pl = planeOf(r.registration);
            r.ferry = null;
            r.ferryBy = '';
            r.ferryCands = [];
            if (!f?.minutes) return;
            const a = at(r) - (f.minutes + TURN) * 6e4,
              b = at(r) - TURN * 6e4;
            r.ferry = {
              ...f,
              takeoff: a,
              land: b
            };
            /** Type de l'appareil du poste possédé par le pilote (ownsType : true, false ou inconnu). */
            const owns = tr => M.ownsType(ctx.declsAll[tr], pl.type);
            // convoyeur : libre sur tout le convoyage et sans autre mission dans les créneaux qu'il touche (une mission
            // par pilote et par tranche, même si ses disponibilités déclarées sont plus larges)
            const slotFree = tr => O.slotsOver(a, b).every(([jj, kk]) => !O.assigned(tr, jj, kk).some(l => !inWin.has(l
              .mission))); // missions de la fenêtre : en cours de modification
            r.ferryCands = O.pilots().filter(tr => tr !== r.pilot && !(x.on && taken.has(tr)) && !used.has(tr) && owns(tr) !==
                false && O.freeOver(tr, a, b) && slotFree(tr))
              .map(tr => ({
                tri: tr,
                q: M.qualification(ctx.declsAll[tr], tr, pl.type)
              }))
              .sort((p, q) => (q.q.level === 'mastered') - (p.q.level === 'mastered') || (owns(q.tri) === true) - (owns(p.tri) ===
                true) || p.tri.localeCompare(q.tri));
            if (r.ferryOpen) return; // à affecter : mission de convoyage à part, le pilote de la mission n'en dépend pas
            if (!r.ferrySelf) r.ferryBy = r.ferryCands.some(c => c.tri === r.ferryPilot) ? r.ferryPilot : r.ferryCands[0]?.tri ||
              '';
            if (r.ferryBy) {
              used.add(r.ferryBy);
              return;
            }
            // le pilote convoie lui-même : avant le créneau s'il est libre (au quart d'heure le plus tôt possible), sinon
            // dès le début du créneau, la mission décalée d'autant ; heure choisie : pas de décalage (contrôle du pilote)
            if (x.takeoffSet != null) return;
            let s = r.pilot ? a : t0;
            while (r.pilot && s < t0 && !O.freeOver(r.pilot, s, t0)) s += 15 * 6e4;
            need = Math.max(need, Math.max(0, Math.min(s, t0) - a));
          });
          if (base0 + need <= tk) break;
          tk = base0 + need;
        }
        const own = x.rows.filter(r => r.ferry && !r.ferryBy && !r.ferryOpen).map(r => r.ferry.takeoff),
          endOf = r => at(r) + ((r.block || block) + TURN) * 6e4,
          start = Math.min(...x.rows.map(at), ...own),
          end = Math.max(...x.rows.map(endOf));
        for (const r of x.rows) r.takeoff = at(r);
        x.timing = {
          takeoff: tk,
          shift: tk - auto,
          start,
          end,
          slots: O.slotsOver(start, end)
        };
        for (const r of x.rows) {
          r.spanOk = !r.pilot || O.freeOver(r.pilot, r.ferry && !r.ferryBy && !r.ferryOpen ? r.ferry.takeoff : at(r), endOf(r));
          if (x.on && r.ferryBy) taken.add(r.ferryBy);
        }
      }
    }
    /** Choix modifiés depuis l'état de référence de la fenêtre (initial, pris à chaque build). */
    const dirty = () => !!ctx && snap() !== initial;
    /** L'appareil basé à base est-il au départ (même terrain, ou base à moins de 3 NM d'un départ donné par sa position) ? */
    const atDeparture = async (base, dep) => !!base && ((!!dep.code && base === dep.code) || (!!dep.pos && (q => !!q && M.geo.nm(q, dep
      .pos) < 3)(await M.coordsOf(base))));
    /** Terrain actuel d'un appareil (site ou CR issu d'un ordre de mission : shared/aircraft_positions.js), sinon la base. */
    const adOf = f => window.AircraftPositions?.adOf?.(f) || f?.base || '';
    /** Appareils compatibles d'un poste, du plus proche au plus lointain du terrain de départ : { f, nm, min }
     *  (min : convoyage en minutes, 0 sur place, null distance inconnue). */
    async function planeList(post, dep) {
      await window.AircraftPositions?.load?.();
      const out = await Promise.all(M.planesFor(post, dep.code).map(async f => {
        const at = adOf(f),
          from = at ? await M.coordsOf(at) : null,
          here = await atDeparture(at, dep),
          ferry = at && !here ? await M.ferryOf({
            base: at,
            departure: dep.code,
            to: dep.pos,
            type: f.type
          }) : null;
        return {
          f,
          nm: here ? 0 : dep.pos && from ? M.geo.nm(from, dep.pos) : null,
          min: here ? 0 : ferry?.minutes ?? null,
          why: here ? '' : !at ? L(['base non renseignée dans la flotte', 'base not set in the fleet',
            'Basis in der Flotte nicht angegeben', 'base sin indicar en la flota'
          ]) : !dep.pos ? L(['départ sans position', 'departure without position', 'Abflug ohne Position',
            'salida sin posición'
          ]) : !from ? L(['position de {b} inconnue (base SIA à charger)', '{b} position unknown (SIA database to load)',
            'Position von {b} unbekannt (SIA-Datenbank laden)', 'posición de {b} desconocida (cargar la base SIA)'
          ], {
            b: f.base
          }) : ''
        };
      }));
      return out.sort((a, b) => (a.nm ?? 1e9) - (b.nm ?? 1e9) || (b.f.operational !== false) - (a.f.operational !== false) || a.f
        .registration.localeCompare(b.f.registration));
    }
    /** Missions proposées, rien de présélectionné : registre (famille choisie), sans les missions déjà affectées (semaine
     *  affichée ou passé) ; celles que les pilotes libres peuvent armer d'abord (MissionAssignments.planSlot), puis les
     *  autres. Le planificateur coche une mission, choisit l'appareil, puis le pilote. */
    async function build() {
      const free = O.freePilots(j, k),
        decls = await M.declarations(free),
        declsAll = await M.declarations(O.pilots()),
        weekEnd = O.range(6, (settings.hours || []).length - 1)?.[1] || Infinity,
        // missions enregistrées sur ce créneau : en tête de la matrice, cochées et préremplies (modifiables) ; les
        // autres missions déjà affectées (semaine, passé) restent écartées
        here = O.inSlot(j, k).filter(a => a.role !== 'convoyage'),
        hereIds = new Set(here.map(a => a.mission)),
        done = new Set([...O.missionsAssigned(weekEnd)].filter(id => !hereIds.has(id))),
        // mission d'organisation d'un exercice (…Z) : personne ne la vole, elle n'est pas affectée
        entries = all.filter(m => !done.has(m.id) && !/Z$/.test(m.id) && !m.organisation && (!famSel || fold(m.family || m.type)
          .startsWith(famSel))),
        plan = M.planSlot(free, entries, decls, {
          focus
        }),
        first = [...new Set(plan.options.flatMap(o => o.missions))],
        rest = entries.filter(m => !first.includes(m) && m.id && (m.status !== 'ordered' || hereIds.has(m.id)) && !/Z$/.test(m.id) &&
          !m.organisation),
        mine = entries.filter(m => hereIds.has(m.id)),
        d = new Map();
      // opération à plusieurs missions (exercice) : une ligne, une coche, un poste par équipage de chaque mission
      // (r.mid : sa mission) ; « Enregistrer » écrit chaque mission avec ses pilotes, d'un coup
      const units = new Map();
      for (const m of [...new Set([...mine, ...first, ...rest])].slice(0, 40)) {
        const op = opOf(m),
          key = op && all.filter(x => opOf(x) === op && !/Z$/.test(x.id)).length > 1 ? `op:${op}` : m.id;
        if (!units.has(key)) units.set(key, []);
        units.get(key).push(m);
      }
      for (const [key, ms] of units) {
        const rows = [],
          planes = [];
        // exercice : une seule heure H ; chaque équipage décolle à H + son décalage (participants de la …Z : « H-20mn »)
        const z = key.startsWith('op:') ? all.find(x => x.id === `${key.slice(3)}Z`) : null,
          zx = (z ? await O.yamlOf(z).catch(() => null) : null)?.exercise,
          // chiffons joués à mission : affectés comme les équipages, décollage takeoff (sinon start)
          parts = [...zx?.participants || [], ...(zx?.tracks || []).filter(t => t?.played && t.mission).map(t => ({
            callsign: t.callsign,
            mission: t.mission,
            takeoff: t.takeoff ?? t.start
          }))],
          offOf = (cs, mid) => window.RepositoryKit.hOffset((parts.find(p => fold(p?.callsign) === fold(cs)) || parts.find(p => fold(p
            ?.mission) === fold(mid)))?.takeoff) ?? 0;
        for (const m of ms) {
          const dep = await M.departureOf(await O.yamlOf(m).catch(() => ({})), m);
          for (const post of M.postsOf(m)) {
            rows.push({
              post,
              mid: m.id,
              dep,
              off: offOf(post.callsign, m.id),
              block: blockOf(m),
              pilot: '',
              registration: '',
              callsign: post.callsign || '',
              ferryPilot: ''
            });
            planes.push(await planeList(post, dep));
          }
        }
        const m = key.startsWith('op:') ? {
          ...ms[0],
          id: key.slice(3),
          title: ms[0].operation?.name || ms[0].title,
          estimate: {
            block: Math.max(...ms.map(blockOf))
          }
        } : ms[0];
        // enregistrée sur ce créneau : postes remplis avec ses lignes (pilote, appareil, indicatif, convoyage), décollage
        // repris (heure H d'une opération : décollage moins le décalage)
        let takeoffSet = null;
        for (const r of rows) {
          const line = here.find(a => a.mission === r.mid && (!r.callsign || a.callsign === r.callsign) && !rows.some(o => o !== r &&
              o.pilot === a.pilot)) ||
            here.find(a => a.mission === r.mid && !rows.some(o => o !== r && o.pilot === a.pilot));
          if (!line) continue;
          Object.assign(r, {
            pilot: line.pilot || '',
            registration: line.aircraft?.registration || '',
            callsign: line.callsign || r.callsign
          });
          if (line.ferry) Object.assign(r, line.ferry.open ? {
            ferryOpen: true
          } : line.ferry.pilot && line.ferry.pilot !== line.pilot ? {
            ferryPilot: line.ferry.pilot
          } : {
            ferrySelf: true
          });
          if (takeoffSet == null && Date.parse(line.takeoff || '')) takeoffSet = Date.parse(line.takeoff) - (r.off || 0) * 6e4;
        }
        d.set(m.id, {
          m,
          members: key.startsWith('op:') ? ms : null,
          on: ms.some(x => hereIds.has(x.id)),
          saved: ms.some(x => hereIds.has(x.id)),
          takeoffSet,
          armable: ms.some(x => first.includes(x)),
          dep: rows[0].dep,
          planes,
          rows
        });
      }
      ctx = {
        free,
        decls,
        declsAll,
        d,
        hidden: done.size
      };
      await timeAll();
      initial = snap();
    }
    /** Appareil de la flotte (DEFA_FLEET) d'immatriculation donnée. */
    const planeOf = reg => (window.DEFA_FLEET || []).find(f => f.registration === reg);

    /** Redessine la fenêtre du créneau : bande des trois créneaux du jour, matrice missions × postes, convoyages à
     *  affecter, affectations en attente et enregistrées ; défilement et champ en cours de saisie gardés. */
    function render() {
      const {
        free,
        decls,
        d
      } = ctx;
      const assigned = O.inSlot(j, k),
        ferries = O.openFerries(j, k),
        inWin = new Set([...d.values()].flatMap(x => (x.members || [x.m]).map(mm => mm.id))),
        busy = new Set(assigned.filter(a => !inWin.has(a.mission)).map(a => a.aircraft?.registration).filter(Boolean));
      const on = [...d.values()].filter(x => x.on),
        useP = {},
        useA = {};
      for (const x of on)
        for (const r of x.rows) {
          if (r.pilot) useP[r.pilot] = (useP[r.pilot] || 0) + 1;
          if (r.registration) useA[r.registration] = (useA[r.registration] || 0) + 1;
        }
      const pend = on.flatMap(x => x.rows.filter(r => r.pilot && r.registration).map(r => ({
        m: x.m,
        r
      })));
      /** Affectation en attente d'un pilote (mission cochée, appareil choisi), sinon undefined. */
      const pendOf = tr => pend.find(p => p.r.pilot === tr);
      /** Conflits d'un poste : pilote ou appareil en double, appareil déjà engagé sur le créneau. */
      const errs = r => [useP[r.pilot] > 1 && L(['pilote en double', 'pilot twice', 'Pilot doppelt', 'piloto duplicado']), useA[r
        .registration] > 1 && L(['appareil en double', 'aircraft twice', 'Luftfahrzeug doppelt', 'aeronave duplicada']), busy.has(r
        .registration) && L(['appareil déjà engagé sur le créneau', 'aircraft already engaged in the slot',
        'Luftfahrzeug im Zeitfenster bereits eingesetzt', 'aeronave ya asignada en la franja'
      ])].filter(Boolean);
      /** Types d'appareils déclarés par un pilote (maîtrisés en gras). */
      const types = tr => {
        const ac = decls[tr]?.aircraft;
        if (!ac) return `<small>${L(['appareils non déclarés', 'aircraft not declared', 'Luftfahrzeuge nicht angegeben', 'aeronaves no declaradas'])}</small>`;
        const ms = new Set(ac.mastered || []);
        return [...new Set([...(ac.owned || []), ...ms])].map(ty => ms.has(ty) ? `<b>${esc(ty)}</b>` : esc(ty)).join(' ') || `<small>${L(['aucun', 'none', 'keines', 'ninguno'])}</small>`;
      };
      /** Pilotes d'un poste, une fois l'appareil choisi : libres jusqu'à la fin de la mission et possédant le type de
       *  l'appareil d'abord, puis les autres pilotes libres du créneau. */
      const pilotOpts = (x, r) => {
        if (!r.registration) return `<option value="">${L(['— appareil d’abord —', '— aircraft first —', '— zuerst das Luftfahrzeug —', '— primero la aeronave —'])}</option>`;
        const ty = planeOf(r.registration)?.type || r.post,
          from = x.timing?.start ?? takeoff,
          to = x.timing?.end ?? takeoff;
        const best = free.filter(tr => M.ownsType(decls[tr], ty) && O.freeOver(tr, from, to)),
          other = free.filter(tr => !best.includes(tr));
        const o = tr => `<option value="${esc(tr)}"${tr === r.pilot ? ' selected' : ''}>${esc(tr)}${M.qualification(decls[tr], tr, ty).level === 'mastered' ? `${L([' (maîtrisé)', ' (mastered)', ' (beherrscht)', ' (dominado)'])}` : ''}${pendOf(tr) && tr !== r.pilot ? ` (→ ${esc(pendOf(tr).m.id)})` : ''}</option>`;
        return `<option value="">${L(['— pilote —', '— pilot —', '— Pilot —', '— piloto —'])}</option>${best.length ? `<optgroup label="${L(['Libres jusqu’à la fin, avec l’appareil ({n})', 'Free until the end, with the aircraft ({n})', 'Bis zum Ende frei, mit dem Luftfahrzeug ({n})', 'Libres hasta el final, con la aeronave ({n})'], { n: best.length })}">${best.map(o).join('')}</optgroup>` : ''}${other.length ? `<optgroup label="${L(['Libres sur ce créneau seulement, ou sans l’appareil déclaré', 'Free in this slot only, or without the aircraft declared', 'Nur in diesem Zeitfenster frei, oder ohne angegebenes Luftfahrzeug', 'Libres solo en esta franja, o sin la aeronave declarada'])}">${other.map(o).join('')}</optgroup>` : ''}${r.pilot && !free.includes(r.pilot) ? `<option value="${esc(r.pilot)}" selected>${esc(r.pilot)} ${L(['(non libre)', '(not free)', '(nicht frei)', '(no libre)'])}</option>` : ''}`;
      };
      /** Appareils compatibles d'un poste, du plus proche au plus lointain du départ, temps de convoyage affiché. */
      const planeOpts = (x, i) => {
        const r = x.rows[i],
          away = (min, why) => min === 0 ? L(['sur place', 'on site', 'vor Ort', 'en el lugar']) : min == null ? why : x.dep.code ? L(
            ['convoyage {d}', 'ferry {d}', 'Überführung {d}', 'traslado {d}'], {
              d: hmOf(min)
            }) : L(['transit {d}', 'transit {d}', 'Transit {d}', 'tránsito {d}'], {
            d: hmOf(min)
          });
        // appareil déjà pris par un autre poste coché (équipier, autre mission) ou engagé ailleurs : grisé
        const taken = reg => reg !== r.registration && (busy.has(reg) || on.some(y => y.rows.some(o => o !== r && o.registration ===
          reg)));
        return `<option value="">${L(['— appareil —', '— aircraft —', '— Luftfahrzeug —', '— aeronave —'])}</option>${x.planes[i].map(({ f, min, why }) => `<option value="${esc(f.registration)}"${f.registration === r.registration ? ' selected' : ''}${taken(f.registration) ? ' disabled' : ''}>${esc(f.registration)} · ${esc(f.variant || f.type)} · ${esc(adOf(f) || '?')} — ${away(min, why)}${f.operational === false ? L([' — indisponible', ' — unavailable', ' — nicht verfügbar', ' — no disponible']) : ''}${busy.has(f.registration) ? L([' — engagé', ' — engaged', ' — eingesetzt', ' — asignada']) : taken(f.registration) ? L([' — déjà affecté', ' — already assigned', ' — bereits zugewiesen', ' — ya asignada']) : ''}</option>`).join('')}`;
      };
      /** Convoyage d'un poste : trajet, heure, convoyeur (pilotes libres avant le créneau, ou le pilote : mission décalée). */
      const ferryLine = r => {
        if (!r.ferry) return '';
        const f = r.ferry,
          self = !r.ferryBy && !r.ferryOpen,
          opts = `${r.ferryCands.map(c => `<option value="${esc(c.tri)}"${c.tri === r.ferryBy ? ' selected' : ''}>${esc(c.tri)}${c.q.level === 'mastered' ? `${L([' (maîtrisé)', ' (mastered)', ' (beherrscht)', ' (dominado)'])}` : ''}</option>`).join('')}<option value="__self"${self ? ' selected' : ''}>${L(['{p} lui-même', '{p} himself', '{p} selbst', '{p} mismo'], { p: esc(r.pilot || L(['le pilote', 'the pilot', 'der Pilot', 'el piloto'])) })}</option><option value="__open"${r.ferryOpen ? ' selected' : ''}>${L(['à affecter (mission de convoyage)', 'to assign (ferry mission)', 'zuzuweisen (Überführungsmission)', 'por asignar (misión de traslado)'])}</option>`;
        return `<div class="ad-help">${L(['Convoyage', 'Ferry', 'Überführung', 'Traslado'])} <b>${esc(f.from)} → ${esc(f.to)}</b> <b>${hm(f.takeoff)} → ${hm(f.land)}</b> (≈ ${hmOf(f.minutes)})${r.ferryCands.length ? '' : L([' — aucun pilote libre à cette heure', ' — no pilot free at that time', ' — kein Pilot zu dieser Zeit frei', ' — ningún piloto libre a esa hora'])} · ${L(['par', 'by', 'durch', 'por'])} <select data-f="ferry">${opts}</select></div>`;
      };
      /** Contrôles d'un poste en pastilles : pilote libre sur toute la plage, convoyage, qualification, conflits,
       *  affectation prête. */
      const checks = (x, r) => {
        const c = [];
        if (r.pilot && r.spanOk === false) c.push(chip(L(['{p} non déclaré libre sur toute la plage {a} → {b}',
          '{p} not declared free over the whole span {a} → {b}', '{p} nicht über die ganze Spanne {a} → {b} frei gemeldet',
          '{p} no declarado libre en todo el intervalo {a} → {b}'
        ], {
          p: esc(r.pilot),
          a: hm(r.ferry && !r.ferryBy && !r.ferryOpen ? r.ferry.takeoff : x.timing.takeoff),
          b: hm(x.timing.end)
        }), 'warn'));
        if (r.ferryBy) c.push(chip(L(['convoyage : {p}', 'ferry: {p}', 'Überführung: {p}', 'traslado: {p}'], {
          p: esc(r.ferryBy)
        }), 'ok'));
        if (r.ferryOpen) c.push(chip(L(['convoyage à affecter', 'ferry to assign', 'Überführung zuzuweisen', 'traslado por asignar']),
          'warn'));
        if (r.pilot) {
          const q = M.qualification(decls[r.pilot], r.pilot, r.registration ? planeOf(r.registration)?.type || r.post : r.post);
          if (q.text) c.push(chip(esc(q.text), q.level === 'mastered' ? 'ok' : q.level === 'owned' || q.level === 'flown' ? 'warn' :
            'err'));
        }
        for (const e of errs(r)) c.push(chip(e, 'err'));
        if (x.on && r.pilot && r.registration && !errs(r).length) c.push(chip(`${esc(r.pilot)} → ${esc(r.mid || x.m.id)} · ${esc(r.registration)}${r.callsign ? ` · ${esc(r.callsign)}` : ''}`, 'ok'));
        return c.join('') || '<small>—</small>';
      };
      const body = [...d.values()].map(x => {
        const m = x.m,
          conf = conflictsOf(m, zones),
          n = x.rows.length;
        return `<tbody class="ad-mx${x.on ? ' on' : ''}${x.members ? ' ad-op' : ''}" data-m="${esc(m.id)}">${x.members ? `<tr class="ad-op-head"><td colspan="7">⛓ ${L(['Opération', 'Operation', 'Operation', 'Operación'])} <b>${esc(m.id)}</b> ${esc(m.title || '')} — ${L(['{n} missions liées ({ids}) : une seule coche, un pilote par mission, enregistrées ensemble', '{n} linked missions ({ids}): one tick, one pilot per mission, saved together', '{n} verbundene Missionen ({ids}): ein Haken, ein Pilot pro Mission, zusammen gespeichert', '{n} misiones vinculadas ({ids}): una sola marca, un piloto por misión, guardadas juntas'], { n: x.members.length, ids: x.members.map(mm => esc(mm.id)).join(' · ') })}${x.saved ? ` · <i>${L(['enregistrée sur ce créneau', 'saved in this slot', 'in diesem Zeitfenster gespeichert', 'guardada en esta franja'])}</i>` : ''}</td></tr>` : x.saved ? `<tr class="ad-op-head"><td colspan="7"><i>${L(['Enregistrée sur ce créneau — modifiable ici', 'Saved in this slot — editable here', 'In diesem Zeitfenster gespeichert — hier änderbar', 'Guardada en esta franja — editable aquí'])}</i></td></tr>` : ''}${x.rows.map((r, i) => `<tr class="${x.on && r.pilot && r.registration && !errs(r).length ? 'ad-set' : ''}" data-i="${i}">
          ${i ? '' : `<td rowspan="${n}"><input type="checkbox" data-on${x.on ? ' checked' : ''} aria-label="${L(['Affecter {m}', 'Assign {m}', '{m} zuweisen', 'Asignar {m}'], { m: esc(m.id) })}"></td><td rowspan="${n}"><b>${esc(m.id)}</b> ${esc(m.title || '')}${x.armable ? '' : ` <small class="mut">${L(['(aucun pilote libre ne déclare l’appareil)', '(no free pilot declares the aircraft)', '(kein freier Pilot gibt das Luftfahrzeug an)', '(ningún piloto libre declara la aeronave)'])}</small>`}<br><small>${esc(m.family || m.type || '')} · ${hmOf(m.estimate?.block ?? m.estimate?.flight)} · ${L(['départ', 'departure', 'Abflug', 'salida'])} ${esc(x.dep?.name || '?')}</small>${x.timing ? `<br><label class="ad-inline"><small>${x.members ? L(['heure H', 'H-hour', 'Stunde H', 'hora H']) : L(['décollage', 'take-off', 'Start', 'despegue'])}</small><input type="time" data-f="takeoff" value="${hm(x.timing.takeoff).slice(0, 5)}"${x.on ? '' : ' disabled'} title="${L(['Heure UTC ; vide : automatique (début du créneau, décalé si le pilote convoie et n’est pas libre avant)', 'UTC time; empty: automatic (start of the slot, shifted if the pilot ferries and is not free before)', 'UTC-Zeit; leer: automatisch (Beginn des Zeitfensters, verschoben, wenn der Pilot überführt und vorher nicht frei ist)', 'Hora UTC; vacío: automático (inicio de la franja, desplazado si el piloto hace el traslado y no está libre antes)'])}"></label><small>${x.takeoffSet != null ? L([' (choisie)', ' (chosen)', ' (gewählt)', ' (elegida)']) : x.timing.shift ? L([' (décalée de {d} : convoyage)', ' (shifted by {d}: ferry)', ' (um {d} verschoben: Überführung)', ' (desplazada {d}: traslado)'], { d: hmOf(x.timing.shift / 6e4) }) : ''}${x.timing.start < x.timing.takeoff ? L([' · convoyage dès {t}', ' · ferry from {t}', ' · Überführung ab {t}', ' · traslado desde {t}'], { t: `<b>${hm(x.timing.start)}</b>` }) : ''}${L([', fin {t}', ', end {t}', ', Ende {t}', ', fin {t}'], { t: hm(x.timing.end) })}${x.timing.slots.length > 1 ? L([' · mobilise {s}', ' · uses {s}', ' · belegt {s}', ' · ocupa {s}'], { s: x.timing.slots.map(slotName).join(', ') }) : ''}</small>` : ''}${conf.length ? `<br>${conf.map(c => chip(esc(c.texte), c.grave ? 'err' : 'warn')).join('')}` : ''}<br>${x.members ? '' : `<button type="button" class="repo-plain ad-link" data-detail>✎ ${L(['détail', 'detail', 'Details', 'detalle'])}</button> · <button type="button" class="repo-plain ad-link" data-wing${x.on ? '' : ' disabled'} title="${L(['Patrouille : un équipier de plus (même type d’appareil, indicatif suivant)', 'Patrol: one more wingman (same aircraft type, next callsign)', 'Rotte: ein Flügelmann mehr (gleicher Typ, nächstes Rufzeichen)', 'Patrulla: un punto más (mismo tipo, indicativo siguiente)'])}">${L(['+ équipier', '+ wingman', '+ Flügelmann', '+ punto'])}</button>`}</td>`}
          <td><b>${esc(r.callsign || r.post?.callsign || L(['poste {n}', 'post {n}', 'Posten {n}', 'puesto {n}'], { n: i + 1 }))}</b>${x.members ? ` <small>${esc(r.mid)} · ${L(['décollage', 'take-off', 'Start', 'despegue'])} ${r.takeoff ? hm(r.takeoff) : '?'} (${esc(window.RepositoryKit.hText(r.off || 0))})</small>${r.wing ? '' : ` <button type="button" class="repo-plain ad-link" data-wing data-wing-of="${i}"${x.on ? '' : ' disabled'} title="${L(['Patrouille : un équipier de plus pour cet équipage (même mission, indicatif suivant)', 'Patrol: one more wingman for this crew (same mission, next callsign)', 'Rotte: ein Flügelmann mehr für diese Besatzung (gleiche Mission, nächstes Rufzeichen)', 'Patrulla: un punto más para esta tripulación (misma misión, indicativo siguiente)'])}">${L(['+ équipier', '+ wingman', '+ Flügelmann', '+ punto'])}</button>`}` : ''}<br><small>${esc(r.post?.type || r.post?.label || L(['type libre', 'any type', 'beliebiger Typ', 'tipo libre']))}${r.post?.service ? ` · ${esc(r.post.service)}` : ''}</small></td>
          <td><select data-f="registration"${x.on ? '' : ' disabled'}>${planeOpts(x, i)}</select>${ferryLine(r)}</td>
          <td><select data-f="pilot"${x.on && r.registration ? '' : ' disabled'}>${pilotOpts(x, r)}</select></td>
          <td><input data-f="callsign" value="${esc(r.callsign)}" size="9">${r.wing ? ` <button type="button" class="repo-plain ad-del" data-unwing="${i}" title="${L(['Retirer cet équipier', 'Remove this wingman', 'Diesen Flügelmann entfernen', 'Quitar este punto'])}">✕</button>` : ''}</td>
          <td>${checks(x, r)}</td></tr>`).join('')}</tbody>`;
      }).join('');
      const keep = dlg?.querySelector('.ad-body')?.scrollTop || 0,
        // ancre : l'élément en cours de saisie (champ, sinon sa ligne, sinon sa mission) reste à la même hauteur dans la
        // fenêtre après le redessin, même si des lignes apparaissent au-dessus (convoyage, équipier, attente)
        anchor = (() => {
          const body = dlg?.querySelector('.ad-body'),
            el = document.activeElement;
          if (!body || !el || !body.contains(el)) return null;
          const tb = el.closest('tbody[data-m]'),
            tr = el.closest('tr[data-i]');
          return {
            m: tb?.dataset.m,
            i: tr?.dataset.i,
            sel: el.dataset.f ? `[data-f="${el.dataset.f}"]` : el.hasAttribute('data-on') ? '[data-on]' : el.dataset.wingOf != null ? `[data-wing-of="${el.dataset.wingOf}"]` : '',
            y: el.getBoundingClientRect().top - body.getBoundingClientRect().top
          };
        })();
      const status = dlg?.querySelector('[data-status]')?.innerHTML || '';
      // la journée en trois blocs (matin, après-midi, soir) : celui de la fenêtre en surbrillance, celui de l'heure
      // présente marqué ; clic : même fenêtre sur cet autre créneau
      const dayStrip = () => `<div class="odv-daystrip">${[0, 1, 2].map(kk => {
        const sl = slotOf(j, kk),
          r = O.range(j, kk),
          live = r && Date.now() >= r[0] && Date.now() < r[1],
          nAss = new Set(O.inSlot(j, kk).filter(a => a.role !== 'convoyage').map(a => a.mission)).size;
        return `<button type="button" class="repo-plain${kk === k ? ' cur' : ''}${live ? ' live' : ''}" data-goslot="${kk}"${kk === k ? ' aria-current="true"' : ''}><b>${esc(capL(C.SLOT_LABELS[kk]))}</b> <small>${esc(sl.heures || '')}${live ? ` · ${L(['en cours', 'now', 'jetzt', 'en curso'])}` : ''}</small><span>${L(['{f} libre(s) · {a} mission(s)', '{f} free · {a} mission(s)', '{f} frei · {a} Mission(en)', '{f} libre(s) · {a} misión(es)'], { f: O.freePilots(j, kk).length, a: nAss })}</span></button>`;
      }).join('')}</div>`;
      dlg = AD.frame('odvPick', {
        wide: true,
        title,
        subtitle: L(['{f} pilote(s) libre(s) · {p} affectation(s) en attente · {a} enregistrée(s) sur le créneau',
          '{f} free pilot(s) · {p} pending assignment(s) · {a} saved in the slot',
          '{f} freie(r) Pilot(en) · {p} ausstehende Zuweisung(en) · {a} im Zeitfenster gespeichert',
          '{f} piloto(s) libre(s) · {p} asignación(es) pendiente(s) · {a} guardada(s) en la franja'
        ], {
          f: free.length,
          p: pend.length,
          a: assigned.length
        }),
        beforeClose: () => !dirty() || confirm(L(['Abandonner les affectations en attente (non enregistrées) ?',
          'Discard the pending (unsaved) assignments?', 'Ausstehende (nicht gespeicherte) Zuweisungen verwerfen?',
          '¿Descartar las asignaciones pendientes (no guardadas)?'
        ])),
        body: `${dayStrip()}<p class="ad-help">${L(['Cocher la mission, choisir l’appareil (du plus proche au plus lointain du départ, temps de convoyage indiqué), puis le pilote. Missions déjà affectées (cette semaine ou avant) masquées{h}. Une mission plus longue que le créneau mobilise les suivants ; appareil basé ailleurs : convoyage confié à un pilote libre avant le créneau, sinon fait par le pilote de la mission, décalée d’autant.', 'Tick the mission, choose the aircraft (nearest to farthest from the departure, ferry time shown), then the pilot. Missions already assigned (this week or before) hidden{h}. A mission longer than the slot uses the following ones; aircraft based elsewhere: ferry given to a pilot free before the slot, otherwise flown by the mission pilot, the mission shifted accordingly.', 'Mission anhaken, Luftfahrzeug wählen (vom nächsten zum fernsten zum Abflug, Überführungszeit angegeben), dann den Piloten. Bereits zugewiesene Missionen (diese Woche oder früher) ausgeblendet{h}. Eine Mission, die länger als das Zeitfenster ist, belegt die folgenden; anderswo stationiertes Luftfahrzeug: Überführung durch einen vorher freien Piloten, sonst durch den Missionspiloten, Mission entsprechend verschoben.', 'Marque la misión, elija la aeronave (de la más cercana a la más lejana de la salida, tiempo de traslado indicado) y luego el piloto. Misiones ya asignadas (esta semana o antes) ocultas{h}. Una misión más larga que la franja ocupa las siguientes; aeronave basada en otro lugar: traslado confiado a un piloto libre antes de la franja, si no lo hace el piloto de la misión, desplazada en consecuencia.'], { h: ctx.hidden ? `: ${ctx.hidden}` : '' })}</p><p class="ad-facts">${free.length ? free.map(tr => pendOf(tr) ? chip(`${tri(tr, null, false)} → <b>${esc(pendOf(tr).m.id)}</b> · ${esc(pendOf(tr).r.registration)}${pendOf(tr).r.callsign ? ` · ${esc(pendOf(tr).r.callsign)}` : ''}`, 'ok') : chip(`${tri(tr, null, false)} ${types(tr)}`, tr === focus ? 'focus' : '')).join('') : chip(L(['aucun pilote libre (tous affectés ou indisponibles)', 'no free pilot (all assigned or unavailable)', 'kein freier Pilot (alle zugewiesen oder nicht verfügbar)', 'ningún piloto libre (todos asignados o no disponibles)']), 'warn')}</p>
        <p><label class="ad-inline">${L(['Famille', 'Family', 'Familie', 'Familia'])} <select data-fam><option value="">${L(['toutes', 'all', 'alle', 'todas'])}</option>${fams.map(f => `<option value="${esc(f)}"${f === famSel ? ' selected' : ''}>${esc(f)}${s.missions[0]?.famille === f ? L([' (proposée)', ' (suggested)', ' (vorgeschlagen)', ' (propuesta)']) : ''}</option>`).join('')}</select></label></p>
        ${zones.length ? `<p class="ad-note">${L(['À éviter :', 'To avoid:', 'Zu meiden:', 'A evitar:'])} ${zones.map(z => `<b>${esc(C.kindLabel(z.type))} ${esc(z.position)}</b> — CTR ${esc(z.ctr.map(a => a.name).join(', ') || '?')}${z.tma.length ? `, TMA ${esc(z.tma.map(a => a.name).join(', '))} ${L(['(si possible)', '(if possible)', '(wenn möglich)', '(si es posible)'])}` : ''}`).join(' · ')}</p>` : ''}
        ${d.size ? `<table class="ad-table ad-matrix"><thead><tr><th>${L(['Planifier', 'Plan', 'Planen', 'Planificar'])}</th><th>${L(['Mission', 'Mission', 'Mission', 'Misión'])}</th><th>${L(['Poste', 'Post', 'Posten', 'Puesto'])}</th><th>${L(['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'])}</th><th>${L(['Pilote', 'Pilot', 'Pilot', 'Piloto'])}</th><th>${L(['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'])}</th><th>${L(['État', 'Status', 'Status', 'Estado'])}</th></tr></thead>${body}</table>` : `<p class="ad-help">${L(['Aucune mission du registre pour ces pilotes et cette famille.', 'No registry mission for these pilots and this family.', 'Keine Registermission für diese Piloten und diese Familie.', 'Ninguna misión del registro para estos pilotos y esta familia.'])}</p>`}
        ${ferries.length ? `<section class="ad-card"><h4>${L(['Convoyages à affecter ({n})', 'Ferries to assign ({n})', 'Zuzuweisende Überführungen ({n})', 'Traslados por asignar ({n})'], { n: ferries.length })}</h4><table class="ad-table"><thead><tr><th>${L(['Mission', 'Mission', 'Mission', 'Misión'])}</th><th>${L(['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'])}</th><th>${L(['Trajet', 'Route', 'Strecke', 'Trayecto'])}</th><th>${L(['Heures', 'Times', 'Zeiten', 'Horas'])}</th><th>${L(['Convoyeur', 'Ferry pilot', 'Überführungspilot', 'Piloto de traslado'])}</th><th></th></tr></thead><tbody>${ferries.map((a, i) => {
          const from = Date.parse(a.takeoff),
            to = from + (+a.block_min || 60) * 6e4,
            cands = O.pilots().filter(tr => tr !== a.for_pilot && M.ownsType(ctx.declsAll[tr], a.aircraft?.type) !== false && O.freeOver(tr, from, to + TURN * 6e4));
          return `<tr data-fy="${i}"><td><b>${esc(a.mission)}</b> ${L(['pour', 'for', 'für', 'para'])} ${esc(a.for_pilot || '?')}</td><td>${esc([a.aircraft?.type, a.aircraft?.registration].filter(Boolean).join(' '))}</td><td>${esc(a.departure || '')} → ${esc(a.destination || '')}</td><td>${hm(from)} → ${hm(to)}</td><td><select data-fy-pilot><option value="">— ${cands.length ? L(['convoyeur', 'ferry pilot', 'Überführungspilot', 'piloto de traslado']) : L(['aucun pilote libre', 'no free pilot', 'kein freier Pilot', 'ningún piloto libre'])} —</option>${cands.map(tr => `<option value="${esc(tr)}">${esc(tr)}${M.qualification(ctx.declsAll[tr], tr, a.aircraft?.type).level === 'mastered' ? `${L([' (maîtrisé)', ' (mastered)', ' (beherrscht)', ' (dominado)'])}` : ''}</option>`).join('')}</select></td><td><button type="button" class="secondary" data-fy-go>${L(['Confier', 'Assign', 'Übertragen', 'Confiar'])}</button></td></tr>`;
        }).join('')}</tbody></table></section>` : ''}
        <section class="ad-card"><h4>${L(['En attente ({n})', 'Pending ({n})', 'Ausstehend ({n})', 'Pendientes ({n})'], { n: pend.length })}</h4>${pend.length ? `<ul class="ad-list">${pend.map(p => `<li>${tri(p.r.pilot, null, false)} ${L(['sur', 'on', 'auf', 'en'])} <b>${esc(p.m.id)}</b> — ${esc(planeOf(p.r.registration)?.type || '')} ${esc(p.r.registration)}${p.r.callsign ? ` — ${esc(p.r.callsign)}` : ''}</li>`).join('')}</ul>` : `<p class="ad-help">${L(['Aucune : cocher une mission et choisir ses pilotes et appareils.', 'None: tick a mission and choose its pilots and aircraft.', 'Keine: eine Mission anhaken und ihre Piloten und Luftfahrzeuge wählen.', 'Ninguna: marque una misión y elija sus pilotos y aeronaves.'])}</p>`}</section>
        <section class="ad-card"><h4>${L(['Enregistrées sur ce créneau', 'Saved in this slot', 'In diesem Zeitfenster gespeichert', 'Guardadas en esta franja'])}</h4>${assigned.length ? `<ul class="ad-list">${assigned.map((a, i) => `<li>${a.role !== 'convoyage' && assigned.findIndex(b => b.mission === a.mission && b.role !== 'convoyage') === i ? `<button type="button" class="repo-plain ad-link" data-edit="${esc(a.mission)}">${L(['Modifier…', 'Edit…', 'Ändern…', 'Modificar…'])}</button> ` : ''}<b>${esc(a.mission)}</b>${a.role === 'convoyage' ? L([' (convoyage {a} → {b} pour {p})', ' (ferry {a} → {b} for {p})', ' (Überführung {a} → {b} für {p})', ' (traslado {a} → {b} para {p})'], { a: esc(a.departure || ''), b: esc(a.destination || ''), p: esc(a.for_pilot || '') }) : ''} — ${a.pilot ? tri(a.pilot, null, false) : `<i>${L(['à affecter', 'to assign', 'zuzuweisen', 'por asignar'])}</i>`} ${esc(a.aircraft?.registration || '')}${a.callsign ? ` · ${esc(a.callsign)}` : ''} · ${L(['décollage', 'take-off', 'Start', 'despegue'])} ${esc(String(a.takeoff || '').slice(11, 16))}Z${a.ferry ? L([' · convoyage {f} dès {t}Z, {by}', ' · ferry {f} from {t}Z, {by}', ' · Überführung {f} ab {t}Z, {by}', ' · traslado {f} desde {t}Z, {by}'], { f: esc(a.ferry.from), t: esc(String(a.ferry.takeoff || '').slice(11, 16)), by: a.ferry.open ? L(['à affecter', 'to assign', 'zuzuweisen', 'por asignar']) : a.ferry.pilot && a.ferry.pilot !== a.pilot ? L(['par {p}', 'by {p}', 'durch {p}', 'por {p}'], { p: esc(a.ferry.pilot) }) : L(['par le pilote', 'by the pilot', 'durch den Piloten', 'por el piloto']) }) : ''}</li>`).join('')}</ul>` : `<p class="ad-help">${L(['Aucune.', 'None.', 'Keine.', 'Ninguna.'])}</p>`}</section>`,
        foot: `<p class="ad-msg" data-status></p><button type="button" class="ghost" data-undo${dirty() ? '' : ' disabled'}>${L(['Annuler les modifications', 'Undo changes', 'Änderungen verwerfen', 'Deshacer cambios'])}</button><button type="button" class="primary" data-save data-icon="save">${L(['Enregistrer ({n})', 'Save ({n})', 'Speichern ({n})', 'Guardar ({n})'], { n: pend.length })}</button><button type="button" class="ghost" data-close>${L(['Fermer', 'Close', 'Schließen', 'Cerrar'])}</button>`
      });
      const bodyEl = dlg.querySelector('.ad-body');
      bodyEl.scrollTop = keep;
      if (anchor?.m) {
        const tb = bodyEl.querySelector(`tbody[data-m="${CSS.escape(anchor.m)}"]`),
          tr = anchor.i != null ? tb?.querySelector(`tr[data-i="${anchor.i}"]`) : null,
          el = (anchor.sel && (tr || tb)?.querySelector(anchor.sel)) || tr || tb;
        if (el) {
          bodyEl.scrollTop += el.getBoundingClientRect().top - bodyEl.getBoundingClientRect().top - anchor.y;
          if (el.matches('input, select, button')) el.focus({
            preventScroll: true
          });
        }
      }
      dlg.querySelector('[data-status]').innerHTML = status; // compte rendu du dernier enregistrement, gardé au redessin
      dlg.querySelector('[data-fam]').onchange = async e => {
        if (dirty() && !await window.AppFramework.ask(L(['Changer de famille abandonne les affectations en attente. Continuer ?',
            'Changing family discards the pending assignments. Continue?',
            'Ein Familienwechsel verwirft die ausstehenden Zuweisungen. Fortfahren?',
            'Cambiar de familia descarta las asignaciones pendientes. ¿Continuar?'
          ]))) return render();
        famSel = e.target.value;
        await build();
        render();
      };
      bodyEl.addEventListener('change', async e => {
        const tb = e.target.closest('tbody[data-m]');
        if (!tb) return;
        const x = ctx.d.get(tb.dataset.m);
        if (e.target.matches('[data-on]')) x.on = e.target.checked;
        else if (e.target.dataset.f === 'takeoff') {
          const v = e.target.value.trim();
          x.takeoffSet = v ? Date.parse(`${new Date(takeoff).toISOString().slice(0, 10)}T${v}:00Z`) : null;
        } else {
          const r = x.rows[+e.target.closest('tr').dataset.i],
            f = e.target.dataset.f,
            v = e.target.value.trim();
          if (f === 'ferry') {
            r.ferrySelf = v === '__self';
            r.ferryOpen = v === '__open';
            r.ferryPilot = r.ferrySelf || r.ferryOpen ? '' : v;
          } else r[f] = v;
        }
        await timeAll();
        render();
      });
      bodyEl.querySelectorAll('[data-goslot]').forEach(bt => bt.onclick = async () => {
        const kk = +bt.dataset.goslot;
        if (kk === k) return;
        if (dirty() && !await window.AppFramework.ask(L(['Changer de créneau abandonne les affectations en attente. Continuer ?',
            'Changing slot discards the pending assignments. Continue?',
            'Ein Wechsel des Zeitfensters verwirft die ausstehenden Zuweisungen. Fortfahren?',
            'Cambiar de franja descarta las asignaciones pendientes. ¿Continuar?'
          ]))) return;
        // même fenêtre, contenu remplacé (AssignDialog.frame) : la fermer puis la rouvrir faisait clignoter la page
        pickMission(slotOf(j, kk));
      });
      // mission enregistrée : affectation complète rouverte avec ses valeurs ; relue puis fenêtre recalculée
      bodyEl.addEventListener('click', async e => {
        const ed = e.target.closest('[data-edit]');
        if (!ed) return;
        const m = all.find(x => x.id === ed.dataset.edit);
        if (!m) return notify(L(['{m} absente du registre de ce navigateur : relire le registre du Centre.',
          '{m} missing from this browser’s registry: re-read the Centre registry.',
          '{m} fehlt im Register dieses Browsers: das Register des Zentrums neu einlesen.',
          '{m} falta en el registro de este navegador: volver a leer el registro del Centro.'
        ], {
          m: ed.dataset.edit
        }), 'warn');
        const line = O.inSlot(j, k).find(a => a.mission === m.id && a.role !== 'convoyage');
        const d = await O.assign(m, [], Date.parse(line?.takeoff || '') || takeoff, L([
          'Créneau {s} — affectation enregistrée de {m}', 'Slot {s} — saved assignment of {m}',
          'Zeitfenster {s} — gespeicherte Zuweisung von {m}', 'Franja {s} — asignación guardada de {m}'
        ], {
          s: slotTitle(s),
          m: m.id
        }));
        d?.addEventListener('reloaded', async () => {
          await build();
          render();
        }, {
          once: true
        });
      });
      // patrouille : équipier ajouté (poste du dernier équipage, indicatif suivant) ou retiré
      bodyEl.addEventListener('click', async e => {
        const add = e.target.closest('[data-wing]'),
          del = e.target.closest('[data-unwing]');
        if (!add && !del) return;
        const x = ctx.d.get(e.target.closest('tbody[data-m]').dataset.m);
        if (add) {
          // équipier d'un équipage (opération : bouton de chaque équipage ; sinon le dernier) : placé sous lui et ses
          // équipiers, même mission, même poste et décalage, indicatif suivant (RAFALE31 → RAFALE32)
          const i0 = add.dataset.wingOf != null ? +add.dataset.wingOf : x.rows.length - 1,
            base = x.rows[i0];
          let at = i0 + 1;
          while (x.rows[at]?.wing && x.rows[at].mid === base.mid) at++;
          const prev = x.rows[at - 1];
          x.rows.splice(at, 0, {
            post: base.post,
            mid: base.mid,
            dep: base.dep,
            off: base.off,
            block: base.block,
            pilot: '',
            registration: '',
            callsign: String(prev.callsign || base.callsign || '').replace(/(\d+)(?!.*\d)/, d => String(+d + 1).padStart(d
              .length, '0')),
            ferryPilot: '',
            wing: true
          });
          x.planes.splice(at, 0, x.planes[i0]);
        } else {
          const i = +del.dataset.unwing;
          x.rows.splice(i, 1);
          x.planes.splice(i, 1);
        }
        await timeAll();
        render();
      });
      // convoyage à affecter : confié tout de suite (affectations de sa mission réécrites)
      bodyEl.addEventListener('click', async e => {
        const go = e.target.closest('[data-fy-go]');
        if (!go) return;
        const row = go.closest('tr[data-fy]'),
          a = ferries[+row.dataset.fy],
          tr = row.querySelector('[data-fy-pilot]').value,
          msg = dlg.querySelector('[data-status]');
        if (!tr) return notify(L(['Choisir le convoyeur.', 'Choose the ferry pilot.', 'Überführungspiloten wählen.',
          'Elija el piloto de traslado.'
        ]), 'warn');
        try {
          await M.missionsDir();
          await O.assignFerry(a, tr);
          notify(L(['Convoyage de {m} ({r}) confié à {p}.', 'Ferry of {m} ({r}) assigned to {p}.',
            'Überführung von {m} ({r}) an {p} übertragen.', 'Traslado de {m} ({r}) confiado a {p}.'
          ], {
            m: a.mission,
            r: a.aircraft?.registration || '',
            p: tr
          }), 'ok');
          msg.innerHTML = `<span class="ok">${L(['Convoyage de {m} confié à {p}.', 'Ferry of {m} assigned to {p}.', 'Überführung von {m} an {p} übertragen.', 'Traslado de {m} confiado a {p}.'], { m: esc(a.mission), p: esc(tr) })}</span>`;
          await build();
          render();
        } catch (err) {
          msg.innerHTML = `<span class="err">${L(['Convoyage non confié : {e}', 'Ferry not assigned: {e}', 'Überführung nicht übertragen: {e}', 'Traslado no confiado: {e}'], { e: esc(err.message) })}</span>`;
        }
      });
      bodyEl.addEventListener('click', async e => {
        const b = e.target.closest('[data-detail]');
        if (!b) return;
        const x = ctx.d.get(b.closest('tbody[data-m]').dataset.m);
        await AD.open(x.m, await O.yamlOf(x.m), {
          maps: x.m.images || [],
          takeoff: x.timing?.takeoff || takeoff,
          note: L(['Créneau {s} — le résultat revient dans la fenêtre du créneau',
            'Slot {s} — the result comes back to the slot window',
            'Zeitfenster {s} — das Ergebnis kehrt in das Fenster des Zeitfensters zurück',
            'Franja {s} — el resultado vuelve a la ventana de la franja'
          ], {
            s: slotTitle(s)
          }),
          rows: x.rows,
          apply: async rows => {
            x.planes = await Promise.all(rows.map((r, i) => x.rows[i] && x.rows[i].post === r.post ? x.planes[i] :
              planeList(r.post, x.dep)));
            x.rows = rows.map((r, i) => ({
              ...r,
              wing: i >= M.postsOf(x.m).length
            }));
            x.on = true;
            await timeAll();
            render();
          }
        });
      });
      dlg.querySelector('[data-undo]').onclick = async () => {
        const back = JSON.parse(initial);
        for (const [id, isOn, , rs] of back) {
          const x = ctx.d.get(id);
          x.on = isOn;
          x.takeoffSet = back.find(b => b[0] === id)?.[2] ?? null;
          x.rows.length = Math.min(x.rows.length, rs.length); // équipiers ajoutés retirés
          x.planes.length = x.rows.length;
          x.rows.forEach((r, i) => [r.pilot, r.registration, r.callsign, r.ferryPilot, r.ferrySelf, r.ferryOpen] = rs[i] || ['', '',
            r.post?.callsign || '', '', false, false
          ]);
        }
        await timeAll();
        render();
      };
      dlg.querySelector('[data-save]').onclick = async () => {
        const msg = dlg.querySelector('[data-status]');
        const todo = [...ctx.d.values()].filter(x => x.on && x.rows.some(r => r.pilot && r.registration));
        if (!todo.length) {
          msg.innerHTML = `<span class="err">${L(['Rien à enregistrer : cocher une mission et choisir, pour au moins un poste, un pilote et un appareil.', 'Nothing to save: tick a mission and choose, for at least one post, a pilot and an aircraft.', 'Nichts zu speichern: eine Mission anhaken und für mindestens einen Posten Pilot und Luftfahrzeug wählen.', 'Nada que guardar: marque una misión y elija, para al menos un puesto, un piloto y una aeronave.'])}</span>`;
          return;
        }
        const bad = todo.filter(x => x.rows.some(r => errs(r).length));
        if (bad.length) {
          msg.innerHTML = `<span class="err">${L(['À corriger avant d’enregistrer : {l} (doublons ou appareil engagé).', 'To fix before saving: {l} (duplicates or aircraft engaged).', 'Vor dem Speichern zu korrigieren: {l} (Doppelungen oder eingesetztes Luftfahrzeug).', 'A corregir antes de guardar: {l} (duplicados o aeronave asignada).'], { l: bad.map(x => esc(x.m.id)).join(', ') })}</span>`;
          return;
        }
        // accès au dossier des missions demandé d'abord, dans le clic (après d'autres attentes, le navigateur refuse)
        try {
          await M.missionsDir();
        } catch (err) {
          msg.innerHTML = `<span class="err">${L(['{e} — l’autoriser dans Paramètres › Installation › Sources et dossiers.', '{e} — allow it in Settings › Installation › Sources and folders.', '{e} — in Einstellungen › Installation › Quellen und Ordner erlauben.', '{e} — autorícelo en Ajustes › Instalación › Fuentes y carpetas.'], { e: esc(err.message) })}</span>`;
          return;
        }
        const ok = [],
          ko = [];
        msg.textContent = L(['Enregistrement de {n} mission(s)…', 'Saving {n} mission(s)…', '{n} Mission(en) werden gespeichert…',
          'Guardando {n} misión(es)…'
        ], {
          n: todo.length
        });
        for (const x of todo)
          for (const m of x.members || [x.m]) try {
            const rows = x.rows.filter(r => r.pilot && r.registration && (!x.members || r.mid === m.id));
            if (!rows.length) continue;
            await O.write(m, rows.map(r => ({
              ...r,
              ferryPilot: r.ferryOpen ? '__open' : r.ferryBy || ''
            })), rows[0].takeoff || x.timing?.takeoff || takeoff, rows[0].dep || x.dep);
            ok.push(`${m.id} (${rows.map(r => r.pilot).join(', ')})`);
          } catch (err) {
            ko.push(`${m.id} : ${err.message}`);
          }
        if (ok.length) notify(L(['Affectations enregistrées : {l}.', 'Assignments saved: {l}.', 'Zuweisungen gespeichert: {l}.',
          'Asignaciones guardadas: {l}.'
        ], {
          l: ok.join(' ; ')
        }), 'ok');
        for (const e of ko) notify(L(['Non enregistrée — {e}', 'Not saved — {e}', 'Nicht gespeichert — {e}', 'No guardada — {e}'], {
          e
        }), 'err');
        msg.innerHTML = [ok.length ? `<span class="ok">${L(['Enregistrées : {l}.', 'Saved: {l}.', 'Gespeichert: {l}.', 'Guardadas: {l}.'], { l: esc(ok.join(' ; ')) })}</span>` : '', ...ko.map(e => `<span class="err">${L(['Non enregistrée — {e}', 'Not saved — {e}', 'Nicht gespeichert — {e}', 'No guardada — {e}'], { e: esc(e) })}</span>`)].filter(Boolean).join('<br>');
        await build();
        if (!ctx.free.length && !ko.length) {
          dlg.close();
          notify(L(['Tous les pilotes libres du créneau sont affectés.', 'All free pilots of the slot are assigned.',
            'Alle freien Piloten des Zeitfensters sind zugewiesen.', 'Todos los pilotos libres de la franja están asignados.'
          ]), 'ok');
          return;
        }
        render();
      };
    }
    await build();
    render();
  }
  /** Bouton « Missions du registre… » d'un créneau où au moins un pilote est libre (famille facultative) : une mission
   *  à un seul équipage se planifie aussi bien qu'une patrouille. */
  // créneau déjà garni (mission affectée) : « Modifier la mission » — même fenêtre, missions enregistrées modifiables ;
  // le bouton reste quand plus aucun pilote n'est libre
  const pickButton = (s, fam = '', short = false) => {
    const has = (window.OdvAssign?.inSlot(s.jourIndex, s.creneauIndex) || []).some(a => a.role !== 'convoyage');
    if (s.n < 1 && !has) return '';
    const reg = L(['Missions du registre…', 'Registry missions…', 'Missionen des Registers…', 'Misiones del registro…']);
    const label = has ? (short ? L(['Modifier', 'Edit', 'Ändern', 'Modificar']) : L(['Modifier la mission…', 'Edit the mission…',
      'Mission ändern…', 'Modificar la misión…'
    ])) : short ? L(['Planifier', 'Plan', 'Planen', 'Planificar']) : reg;
    return `<button type="button" class="odv-pick-btn" data-pick="${s.jourIndex}${s.creneauIndex}" data-fam="${esc(fam)}"${centreOn() ? ` title="${esc(has ? L(['Modifier les missions affectées sur ce créneau, ou en planifier d’autres', 'Edit the missions assigned in this slot, or plan others', 'Die in diesem Zeitfenster zugewiesenen Missionen ändern oder weitere planen', 'Modificar las misiones asignadas en esta franja o planificar otras']) : reg)}"` : ` disabled title="${esc(L(['Centre verrouillé : l’activer dans Paramètres › Centre ({CENTRE})', 'Centre locked: enable it in Settings › Centre ({CENTRE})', 'Zentrum gesperrt: in Einstellungen › Zentrum ({CENTRE}) aktivieren', 'Centro bloqueado: actívelo en Ajustes › Centro ({CENTRE})']))}"`}>${esc(label)}</button>`;
  };
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-odv-slot]');
    if (!c) return;
    const s = slotOf(+c.dataset.odvSlot[0], +c.dataset.odvSlot[1]);
    if (s) pickMission(s, '', {
      focus: c.dataset.tri
    });
  });
  document.addEventListener('keydown', e => {
    const ed = (e.key === 'Enter' || e.key === ' ') && e.target.closest?.('.odv-plan-blk[data-edit-assign]');
    if (!ed) return;
    e.preventDefault();
    editAssigned(ed.dataset.editAssign, ed.dataset.t);
  });
  // missions affectées : ligne du tableau ou bloc du planning → « Modifier » (dialogue complet) ; jour du planning
  document.addEventListener('click', e => {
    const ed = e.target.closest('[data-edit-assign]');
    if (ed) return void editAssigned(ed.dataset.editAssign, ed.dataset.t);
    const day = e.target.closest('[data-plan-day]');
    if (day) {
      planDay = +day.dataset.planDay;
      renderGrid();
    }
  });
  // après une affectation : créneaux, missions probables et score recalculés sur les pilotes restés libres
  window.OdvAssign?.onChange(() => {
    compute();
    render();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    e.stopPropagation();
    const s = slots.find(x => `${x.jourIndex}${x.creneauIndex}` === b.dataset.pick) || slotOf(+b.dataset.pick[0], +b.dataset.pick[1]);
    if (s) pickMission(s, b.dataset.fam || '');
  }, true);

  // --- missions probables
  /** Résumé d'une mission probable (déplié sous sa ligne) : créneau, équipage proposé et renforts, règle, calcul du
   *  score, contexte (sessions ATC, contrôleurs, événements, thème), simulateurs communs, missions déjà affectées. */
  function probableSummary(r) {
    const s = r.slot,
      O = window.OdvAssign,
      assigned = [...new Set((O?.inSlot(s.jourIndex, s.creneauIndex) || []).filter(a => a.role !== 'convoyage').map(a => `${a.mission}${a.title ? ` ${a.title}` : ''}`))];
    /** Ligne du résumé, omise si v est vide. */
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
    return `<dl class="odv-mp-sum">${[
      row(L(['Créneau', 'Slot', 'Zeitfenster', 'Franja']), `${esc(wordL(s.jour))} ${esc(dateFr(s.date))}, ${esc(wordL(s.creneau))} (${esc(s.heures)}) — ${esc(L(['{n} pilote(s) libre(s)', '{n} free pilot(s)', '{n} freie(r) Pilot(en)', '{n} piloto(s) libre(s)'], { n: s.n }))}`),
      row(L(['Équipage proposé', 'Proposed crew', 'Vorgeschlagene Besatzung', 'Tripulación propuesta']), r.affectation.map(a => `${tri(a.pilote, null, false)} <small class="mut">${esc(a.role === '*' ? L(['autre', 'other', 'andere', 'otro']) : C.roleLabel(a.role))}</small>`).join(' + ')),
      row(L(['Renforts possibles', 'Possible reinforcements', 'Mögliche Verstärkung', 'Refuerzos posibles']), r.renforts.map(t => tri(t, null, false)).join(' ')),
      row(L(['Règle', 'Rule', 'Regel', 'Regla']), esc(C.say(r.regle))),
      row(L(['Score', 'Score', 'Punktzahl', 'Puntuación']), esc(C.say(r.calcul))),
      row(L(['Contexte', 'Context', 'Kontext', 'Contexto']), s.contexte.length ? `<ul>${s.contexte.map(c => `<li>${esc(C.say(c))}</li>`).join('')}</ul>` : ''),
      row(L(['Simulateurs communs', 'Common simulators', 'Gemeinsame Simulatoren', 'Simuladores comunes']), s.simsCommuns.length ? `${window.MissionAssignments?.simChips(s.simsCommuns) || ''}${esc(s.simsCommuns.join(', '))}` : ''),
      row(L(['Déjà affecté sur le créneau', 'Already assigned in the slot', 'Im Zeitfenster bereits zugewiesen', 'Ya asignado en la franja']), esc(assigned.join(' · ')))
    ].join('')}</dl>`;
  }

  /** Bloc des missions probables : règles des familles et du score, tableau des familles proposées par créneau
   *  (créneaux d'au moins minPilots pilotes avant affectations), résumé déplié sous chaque ligne. */
  function renderMissions() {
    const rules = $('odvRules');
    if (!rules || !$('odvMissions')) return;
    rules.innerHTML = `<summary>${L(['Règles des familles et du score', 'Family and score rules', 'Regeln der Familien und der Punktzahl', 'Reglas de las familias y de la puntuación'])}</summary><ul>${Object.entries(C.FAMILIES).map(([f, d]) => `<li><span class="odv-fam">${esc(f)}</span> ${esc(C.familyRule(f) ?? d.rule)}</li>`).join('')}</ul>
      <p class="mut">${L(['Rôles d\'un pilote : le code impose le rôle (SC → sécu civile + hélico / avion sécu d\'après FLOTTE, C → chasse, T → transport + ravitailleur / largage, N → FNY / maritime, S → exercice + rôles FLOTTE) ; O → tous les rôles que FLOTTE lui attribue. Score = participants + 2 par pilote à code restreint employé dans son domaine (SC : SAR, FIRE, HEMS ; N : MARITIME ; C : AAR, ISR, SPECIAL ; T : AIRLIFT, AIRBORNE, AAR) + 1 par contrôleur en ligne (2 au plus) pour TRAINING. Famille déjà jouée : − {wc} × log2(1 + nombre de CR) (1 CR : − 0,5 ; 7 CR : − 1,5), pour varier. À score égal : ordre de préférence des réglages ({p}). Les rôles FLOTTE restent indicatifs : le planificateur valide.', 'Pilot roles: the code sets the role (SC → civil security + helicopter / civil security aircraft according to FLOTTE, C → fighter, T → transport + tanker / airdrop, N → FNY / maritime, S → exercise + FLOTTE roles); O → all the roles FLOTTE gives the pilot. Score = participants + 2 per restricted-code pilot used in their domain (SC: SAR, FIRE, HEMS; N: MARITIME; C: AAR, ISR, SPECIAL; T: AIRLIFT, AIRBORNE, AAR) + 1 per online controller (2 at most) for TRAINING. Family already flown: − {wp} × log2(1 + number of CRs) (1 CR: − 0.5; 7 CRs: − 1.5), for variety. On equal score: preference order from the settings ({p}). FLOTTE roles are only indicative: the planner validates.', 'Rollen eines Piloten: Der Code legt die Rolle fest (SC → Zivilschutz + Hubschrauber / Zivilschutzflugzeug laut FLOTTE, C → Jagd, T → Transport + Tanker / Absetzen, N → FNY / maritim, S → Übung + FLOTTE-Rollen); O → alle Rollen, die FLOTTE ihm zuweist. Punktzahl = Teilnehmer + 2 je Pilot mit eingeschränktem Code, der in seinem Bereich eingesetzt wird (SC: SAR, FIRE, HEMS; N: MARITIME; C: AAR, ISR, SPECIAL; T: AIRLIFT, AIRBORNE, AAR) + 1 je Lotse online (höchstens 2) für TRAINING. Bereits geflogene Familie: − {wc} × log2(1 + Anzahl der CR) (1 CR: − 0,5; 7 CR: − 1,5), zur Abwechslung. Bei gleicher Punktzahl: Rangfolge aus den Einstellungen ({p}). Die FLOTTE-Rollen sind nur Richtwerte: der Planer entscheidet.', 'Roles de un piloto: el código impone el rol (SC → seguridad civil + helicóptero / avión de seguridad civil según FLOTTE, C → caza, T → transporte + cisterna / lanzamiento, N → FNY / marítimo, S → ejercicio + roles FLOTTE); O → todos los roles que FLOTTE le atribuye. Puntuación = participantes + 2 por piloto de código restringido empleado en su ámbito (SC: SAR, FIRE, HEMS; N: MARITIME; C: AAR, ISR, SPECIAL; T: AIRLIFT, AIRBORNE, AAR) + 1 por controlador en línea (2 como máximo) para TRAINING. Familia ya volada: − {wc} × log2(1 + número de CR) (1 CR: − 0,5; 7 CR: − 1,5), para variar. A igual puntuación: orden de preferencia de los ajustes ({p}). Los roles FLOTTE son solo orientativos: el planificador valida.'], { wc: esc(String(settings.playWeight ?? 0.5).replace('.', ',')), wp: esc(String(settings.playWeight ?? 0.5)), p: esc(settings.preference.join(', ')) })}</p>`;
    if (!basis) {
      resetTable('odvMissions', `<p class="odv-empty">${L(['Chargez un classeur ODV.', 'Load an ODV workbook.', 'ODV-Arbeitsmappe laden.', 'Cargue un libro ODV.'])}</p>`);
      return;
    }
    const rows = [];
    for (const s of slots)
      if (s.n0 >= settings.minPilots) s.missions.forEach((m, i) => rows.push({
        ...m,
        slot: s,
        rang: i + 1,
        ordre: (s.jourIndex * 3 + s.creneauIndex) * 10 + i
      }));
    table('odvMissions', {
      columns: [{
        key: 'ordre',
        label: L(['Créneau', 'Slot', 'Zeitfenster', 'Franja']),
        type: 'number',
        html: (v, r) => `${esc(dayAbbr(r.slot.jour))} ${esc(dateFr(r.slot.date))} ${esc(SHORT[r.slot.creneauIndex] ? shortL(r.slot.creneauIndex) : wordL(r.slot.creneau))}<sup class="odv-rank" title="${esc(L(['Rang {n}', 'Rank {n}', 'Rang {n}', 'Puesto {n}'], { n: r.rang }))}">${r.rang}</sup>`
      }, {
        key: 'famille',
        label: L(['Famille', 'Family', 'Familie', 'Familia']),
        html: v => `<span class="odv-fam">${esc(v)}</span>`
      }, {
        key: 'affectation',
        label: L(['Affectation proposée', 'Proposed assignment', 'Vorgeschlagene Zuweisung', 'Asignación propuesta']),
        sortValue: r => r.affectation.map(a => a.pilote).join(' '),
        html: v => v.map(a => `${tri(a.pilote, null, false)}<small class="mut"> ${esc(a.role === '*' ? L(['autre', 'other', 'andere', 'otro']) : String(C.roleLabel(a.role)).replace(/\s*\(.*\)$/, ''))}</small>`).join(' + ')
      }, {
        key: 'renforts',
        label: '+',
        sortValue: r => r.renforts.length,
        html: v => v.length ? v.map(t => tri(t, null, false)).join(' ') : '—'
      }, {
        key: 'sims',
        label: L(['Simulateurs communs', 'Common simulators', 'Gemeinsame Simulatoren', 'Simuladores comunes']),
        icon: 'layers',
        sortValue: r => r.slot.simsCommuns.length,
        html: (v, r) => `<span class="odv-sims">${window.MissionAssignments?.simChips(r.slot.simsCommuns) || '—'}</span>`
      }, {
        key: 'score',
        label: L(['Score', 'Score', 'Punktzahl', 'Puntuación']),
        type: 'number',
        html: (v, r) => `<span title="${esc(C.say(r.calcul))}">${esc(L(['{c}', '{p}', '{c}', '{c}'], { c: String(v).replace('.', ','), p: String(v) }))}</span>`
      }, {
        key: 'registre',
        label: L(['Planifier (missions du registre)', 'Plan (registry missions)', 'Planen (Missionen des Registers)',
          'Planificar (misiones del registro)'
        ]),
        icon: 'clipboard',
        sortValue: r => r.slot.n,
        html: (v, r) => pickButton(r.slot, r.famille, true) || '—'
      }, {
        key: 'calcul',
        label: L(['Règle', 'Rule', 'Regel', 'Regla']),
        html: (v, r) => `<span class="odv-why" title="${esc([C.say(v), L(['Règle : {r}', 'Rule: {r}', 'Regel: {r}', 'Regla: {r}'], { r: C.say(r.regle) }), ...(r.rang === 1 ? r.slot.contexte.map(C.say) : [])].join('\n'))}">${esc(C.say(r.regle))}</span>`
      }],
      defaultSortKey: 'ordre',
      // clic sur la ligne (hors « Planifier » / « Modifier ») : résumé de la mission probable déplié sous elle
      detail: probableSummary,
      detailKey: r => `${r.slot.jourIndex}${r.slot.creneauIndex}-${r.famille}`,
      rowTitle: L(['Cliquer pour déplier le résumé', 'Click to expand the summary', 'Klicken, um die Zusammenfassung aufzuklappen',
        'Haga clic para desplegar el resumen'
      ]),
      emptyText: L(['Aucun créneau avec au moins {n} pilote(s).', 'No slot with at least {n} pilot(s).',
        'Kein Zeitfenster mit mindestens {n} Pilot(en).', 'Ninguna franja con al menos {n} piloto(s).'
      ], {
        n: settings.minPilots
      }),
      storageKey: 'sortedTableWidths:odvPlanning#missions'
    }, rows);
  }

  // --- frise
  function renderFlights() {
    if (!$('odvFlights')) return; // bloc « Vols de la frise horaire » retiré de la page (planning heure par heure : grille)
    const data = basis;
    if (!data) {
      $('odvZones').innerHTML = '';
      resetTable('odvFlights', `<p class="odv-empty">${L(['Chargez un classeur ODV.', 'Load an ODV workbook.', 'ODV-Arbeitsmappe laden.', 'Cargue un libro ODV.'])}</p>`);
      resetTable('odvOthers', '<p class="odv-empty">—</p>');
      return;
    }
    const zones = C.DAYS.map((d, j) => ({
      d,
      j,
      list: data.zones.filter(z => z.jourIndex === j)
    })).filter(x => x.list.length);
    $('odvZones').innerHTML = zones.length ? `<p class="mut" style="margin:0 0 4px">${L(['Zones à activer (frise) :', 'Zones to activate (timeline):', 'Zu aktivierende Zonen (Zeitleiste):', 'Zonas por activar (cronología):'])}</p><ul class="odv-notes" style="margin-bottom:10px">${zones.map(x => `<li>${L(['{d} : {l}', '{d}: {l}', '{d}: {l}', '{d}: {l}'], { d: `<b>${esc(wordL(x.d))} ${esc(dateFr(data.dates[x.j]))}</b>`, l: x.list.map(z => `${esc(z.heure)}z ${esc(z.texte)}`).join(' ; ') })}</li>`).join('')}</ul>` : '';
    const when = {
      key: 'ordre',
      label: L(['Jour', 'Day', 'Tag', 'Día']),
      type: 'number',
      format: (v, r) => `${wordL(r.jour)} ${dateFr(r.date)}`
    };
    table('odvFlights', {
      columns: [
        when, {
          key: 'debut',
          label: L(['Heures z', 'Times z', 'Zeiten z', 'Horas z']),
          format: (v, r) => `${r.debut}–${r.fin}`
        }, {
          key: 'creneau',
          label: L(['Créneau', 'Slot', 'Zeitfenster', 'Franja']),
          format: v => String(v ?? '').split(' / ').map(wordL).join(' / ')
        }, {
          key: 'trajet',
          label: L(['Trajet', 'Route', 'Strecke', 'Trayecto'])
        }, {
          key: 'appareil',
          label: L(['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'])
        }, {
          key: 'objet',
          label: L(['Objet', 'Purpose', 'Zweck', 'Objeto']),
          html: v => `<span class="odv-wrap">${esc(v)}</span>`
        }, {
          key: 'indicatif',
          label: L(['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'])
        }, {
          key: 'equipage',
          label: L(['Équipage', 'Crew', 'Besatzung', 'Tripulación']),
          sortValue: r => r.equipage.join(' '),
          html: v => v.length ? v.map(t => tri(t)).join(' ') : '<span class="odv-alert">?</span>'
        }, {
          key: 'mission',
          label: L(['Mission', 'Mission', 'Mission', 'Misión']),
          sortValue: r => r.slotKey,
          html: (v, r) => r.slotKey ? `<button type="button" class="repo-plain ad-link" data-pick="${r.slotKey}">${(window.OdvAssign?.inSlot(+r.slotKey[0], +r.slotKey[1]) || []).some(a => a.role !== 'convoyage') ? L(['Modifier…', 'Edit…', 'Ändern…', 'Modificar…']) : L(['Planifier…', 'Plan…', 'Planen…', 'Planificar…'])}</button>` : '—'
        }, {
          key: 'alertes',
          label: L(['Disponibilités', 'Availability', 'Verfügbarkeit', 'Disponibilidad']),
          sortValue: r => r.alertes.length,
          html: v => v.length ? `<span class="odv-wrap odv-alert">⚠ ${v.map(x => esc(C.say(x))).join('<br>⚠ ')}</span>` : '<span class="odv-ok">✓</span>'
        }
      ],
      defaultSortKey: 'ordre',
      emptyText: data.virtuel ? L(['Pas de classeur : aucune mission affectée cette semaine.',
        'No workbook: no mission assigned this week.', 'Keine Arbeitsmappe: diese Woche keine Mission zugewiesen.',
        'Sin libro: ninguna misión asignada esta semana.'
      ]) : L(['Aucun vol sur la frise.', 'No flight on the timeline.', 'Kein Flug auf der Zeitleiste.',
        'Ningún vuelo en la cronología.'
      ]),
      storageKey: 'sortedTableWidths:odvPlanning#flights'
    }, flights.map(f => ({
      ...f,
      ordre: f.jourIndex * 100 + f.h_debut,
      trajet: `${f.dep}-${f.arr}`,
      // créneau du vol : celui qui contient son début (sinon le plus proche)
      slotKey: (settings.hours || []).length ? `${f.jourIndex}${(k => k < 0 ? settings.hours.reduce((b, h, i) => Math.abs(h[0] - f.h_debut) < Math.abs(settings.hours[b][0] - f.h_debut) ? i : b, 0) : k)(settings.hours.findIndex(([a, b]) => f.h_debut >= a && f.h_debut < b))}` : ''
    })));
    table('odvOthers', {
      columns: [
        when, {
          key: 'debut',
          label: L(['Heures z', 'Times z', 'Zeiten z', 'Horas z']),
          format: (v, r) => `${r.debut}–${r.fin}`
        }, {
          key: 'couloir',
          label: L(['Couloir', 'Lane', 'Spur', 'Carril'])
        }, {
          key: 'texte',
          label: L(['Élément', 'Item', 'Element', 'Elemento']),
          html: v => `<span class="odv-wrap">${esc(v)}</span>`
        }, {
          key: 'equipage',
          label: L(['Trigrammes', 'Trigrams', 'Kürzel', 'Trigramas']),
          sortValue: r => r.equipage.join(' '),
          html: v => v.map(t => tri(t, null, false)).join(' ') || '—'
        }
      ],
      defaultSortKey: 'ordre',
      emptyText: L(['Aucun élément.', 'No item.', 'Kein Element.', 'Ningún elemento.']),
      storageKey: 'sortedTableWidths:odvPlanning#others'
    }, data.frise.map(f => ({
      ...f,
      ordre: f.jourIndex * 100 + f.h_debut
    })));
  }

  // ------------------------------------------------------------------ réglages : formulaire
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

  /** Branche les exports : CSV de la grille, JSON, récapitulatif texte (affiché, téléchargé ou copié). */
  function bindExports() {
    if (!$('odvCsv')) return; // bloc Export absent (Planning)
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
        notify(L(['Récapitulatif copié dans le presse-papiers.', 'Summary copied to the clipboard.',
          'Zusammenfassung in die Zwischenablage kopiert.', 'Resumen copiado en el portapapeles.'
        ]), 'ok');
      } catch {
        $('odvRecapText').select();
        notify(L(['Copie automatique refusée par le navigateur : texte sélectionné, Ctrl+C pour copier.',
          'Automatic copy refused by the browser: text selected, press Ctrl+C to copy.',
          'Automatisches Kopieren vom Browser verweigert: Text markiert, Strg+C zum Kopieren.',
          'Copia automática rechazada por el navegador: texto seleccionado, Ctrl+C para copiar.'
        ]), 'warn');
      }
    };
  }

  // ------------------------------------------------------------------ démarrage
  let started = false; // démarré (page ODV, ou Planning au niveau Expert) : sinon rien n'est calculé
  function start() {
    if (!C || !window.SortedTable) {
      notify(L(['Planning ODV : composants manquants (odv_core.js, mission_table.js).',
        'ODV planning: missing components (odv_core.js, mission_table.js).',
        'ODV-Planung: fehlende Komponenten (odv_core.js, mission_table.js).',
        'Planificación ODV: faltan componentes (odv_core.js, mission_table.js).'
      ]), 'err');
      return;
    }
    // dans le Planning (pas de grille : page hôte) : seulement au niveau Expert, et la semaine suit celle du Planning
    if (!$('odvGrid') && (window.RepositoryNav?.levels?.get?.() || 4) < 4) return;
    started = true;
    bindExports();
    window.OdvAssign?.load(emptyWeek(), settings).then(() => loadAtc()).then(refreshNoBook).catch(
      () => {}); // sans classeur : déclarations
    loadPlays().then(() => {
      if (basis) {
        compute();
        render();
      }
    });
    $('odvFile')?.addEventListener('change', e => {
      const f = e.target.files?.[0];
      if (f) loadFile(f, {
        jump: true
      }); // choisi à la main : sa semaine affichée
    });
    if ($('odvClear')) $('odvClear').onclick = clearAll;
    // langue changée : zones calculées redessinées dans la nouvelle langue (classeur gardé en mémoire, non relu) ;
    // tableaux recréés (libellés des colonnes posés à leur création)
    window.addEventListener('repository-language-change', () => setTimeout(() => {
      Object.keys(tables).forEach(id => delete tables[id]);
      if (basis) compute();
      render();
    }));
    render();
    autoLoad();
  }
  /** Classeur à l'arrivée : le plus récent du dossier ODV (OneDrive…, Paramètres › Sources et dossiers) s'il est
   *  autorisé, sinon la copie gardée dans le navigateur (dernier classeur ouvert, ou choisi au premier lancement). */
  async function autoLoad() {
    const FA = window.FileAccess;
    if (!FA || book) return;
    try {
      const dir = await FA.get('__odv');
      if (dir && (await dir.queryPermission?.({
          mode: 'read'
        })) === 'granted') {
        let best = null;
        for await (const h of dir.values()) {
          if (h.kind !== 'file' || !/\.xlsx$/i.test(h.name) || /^~\$/.test(h.name)) continue;
          const f = await h.getFile();
          if (!best || f.lastModified > best.lastModified) best = f;
        }
        if (best) return loadFile(best);
      }
      const copy = await FA.get('__odvFile');
      if (copy instanceof Blob) loadFile(copy, {
        keep: false
      });
    } catch (e) {
      console.warn('ODV : classeur non rouvert', e);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  // accès pour les tests (données en mémoire uniquement)
  window.OdvPlanning = {
    loadFile,
    /** Données affichées : le classeur lu si la semaine affichée est la sienne, sinon null. */
    get data() {
      return data;
    },
    /** Créneaux calculés (créneaux communs et missions probables). */
    get slots() {
      return slots;
    },
    /** Vols de la frise et leurs contrôles. */
    get flights() {
      return flights;
    },
    /** Réglages courants. */
    settings: () => settings,
    /** Semaine imposée par la page hôte (Planning) : lundi « AAAA-MM-JJ » ; créneaux et missions recalculés. */
    setMonday(iso) {
      if (!started) return;
      const ms = Date.parse(`${iso}T00:00:00Z`);
      if (!Number.isFinite(ms) || ms === weekMon) return;
      weekMon = ms;
      selected = null;
      return showWeek();
    }
  };
})();
