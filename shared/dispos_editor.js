(() => {
  'use strict';
  // Saisie des disponibilités par plages (docs/DISPOS_ET_REORGANISATION.md § 1.5) : même interface pour tous les pilotes,
  // dans Mes missions › Mes disponibilités et seule (apps/pilot/disponibilites.html).
  //   · semaine affichée (flèches, date, « semaine en cours ») — ou celle de la page hôte (nav: false, set({ week })) ;
  //   · ajout : Groupe → Catégorie (selon le groupe) → jours (lundi … dimanche) → horaires facultatifs (UTC, au quart
  //     d'heure ; vides : journée entière) → « Ajouter » ; catégorie personnalisée : thèmes ouverts rappelés, lien vers
  //     les préférences (Paramètres › Mon profil) ;
  //   · grille heure par heure (comme avant les catégories) : palette des catégories, clic sur une case ou rectangle
  //     tracé pour la colorier, second clic sur une case de la catégorie pour l'effacer ; plages précises (au quart
  //     d'heure) par le formulaire « Plage précise », qui colorient aussi la grille ;
  //   · « ⧉ semaine précédente », « Tout effacer » ;
  //   · chaque retouche est enregistrée (SuiteDispos.saveWeek : dossier des données, sinon ce navigateur).
  // API (window.DisposEditor) : mount(hôte, { nav = true }) → { set({ tri, week }), refresh() } ; legend() : palette.
  const K = window.RepositoryKit,
    esc = K.esc,
    t = K.t,
    tf = K.tf;
  const SD = () => window.SuiteDispos,
    A = () => window.MissionAssignments;
  const need = (name, ms = 6000) => new Promise(res => {
    const t0 = Date.now();
    (function poll() {
      if (window[name]) return res(window[name]);
      if (Date.now() - t0 > ms) return res(null);
      setTimeout(poll, 50);
    })();
  });
  const DAYS = [
    ['Lun', 'Mon', 'Mo', 'Lun'],
    ['Mar', 'Tue', 'Di', 'Mar'],
    ['Mer', 'Wed', 'Mi', 'Mié'],
    ['Jeu', 'Thu', 'Do', 'Jue'],
    ['Ven', 'Fri', 'Fr', 'Vie'],
    ['Sam', 'Sat', 'Sa', 'Sáb'],
    ['Dim', 'Sun', 'So', 'Dom']
  ];
  const loc = () => ['fr-FR', 'en-GB', 'de-DE', 'es-ES'][K.langIndex()] || 'fr-FR';
  const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
  const dayLabel = ms => new Date(ms).toLocaleDateString(loc(), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC'
  }).replace('.', '');
  /** « 07:30 » → minutes ; vide → null. */
  const mins = s => s ? +s.slice(0, 2) * 60 + +s.slice(3, 5) : null;
  const ink = c => (K.color.luminance(c) ?? 1) < .4 ? '#fff' : '#1b1b1b';
  // lettre, couleur et libellé court d'une catégorie : communs avec le Planning ODV (shared/dispos.js)
  const colorOf = c => SD().color(c);
  const shortOf = c => SD().shortLabel(c);
  const codeOf = c => SD().code(c);

  /** Palette des catégories par groupe : pastilles lettre + libellé court sur la couleur de la catégorie ; boutons
   *  (pinceaux de la grille de Mes missions) ou, sans pinceau, pastilles inertes (légende du Planning ODV) : même rendu. */
  function palette(brush = null) {
    const D = SD(),
      cats = D.categories(),
      tag = brush === null ? 'span' : 'button';
    return `<div class="de-pal${brush === null ? ' de-legend' : ''}">${D.groups().map(g => {
      const list = cats.filter(c => c.groupe === g.id);
      return list.length ? `<span class="de-pal-n">${esc(D.label(g.label))}</span><span class="de-pal-r">${list.map(c => `<${tag}${tag === 'button' ? ` type="button" data-brush="${esc(c.id)}"` : ''} class="repo-plain de-brush${c.id === brush ? ' on' : ''}" style="--c:${colorOf(c)};--k:${ink(colorOf(c))}" title="${esc(`${codeOf(c)} — ${D.label(c.label)}`)}">${esc(codeOf(c))} ${esc(shortOf(c))}</${tag}>`).join('')}</span>` : '';
    }).join('')}</div>`;
  }

  function css() {
    if (document.getElementById('disposEditorCss')) return;
    const s = document.createElement('style');
    s.id = 'disposEditorCss';
    s.textContent = `.de-wrap{display:grid;gap:10px}.de-nav,.de-add,.de-actions{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.de-add label{display:inline-flex;gap:5px;align-items:center;font-size:13px}.de-add select,.de-add input[type=time],.de-edit select,.de-edit input[type=time]{padding:4px 6px;font:inherit}
.de-days{display:inline-flex;flex-wrap:wrap;gap:2px 8px}.de-days label{font-size:12.5px}.de-themes{margin:0;font-size:12.5px;opacity:.85}
.de-pal{display:grid;grid-template-columns:max-content 1fr;gap:3px 6px;align-items:center}.de-pal-r{display:flex;flex-wrap:wrap;gap:2px}.de-pal-n{font:400 10.5px/1.2 system-ui,sans-serif;color:inherit;opacity:.85;white-space:nowrap}.de-pal-g{font:400 10px/1 system-ui,sans-serif;opacity:.65;margin-left:6px}.de-brush{padding:0 3px !important;min-height:0 !important;height:auto !important;border:1px solid rgba(0,0,0,.3) !important;background:var(--c) !important;color:var(--k) !important;font:400 9.5px/1.45 system-ui,sans-serif !important;border-radius:0 !important;white-space:nowrap;letter-spacing:0 !important;text-transform:none !important;text-shadow:none !important;box-shadow:none;cursor:pointer}.de-legend .de-brush{cursor:default}.de-brush.on{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--c) !important}.de-gridwrap{overflow-x:auto}.de-grid{border-collapse:collapse;user-select:none;touch-action:none;font:11px/1 system-ui,sans-serif}.de-grid th{padding:2px 4px;font-weight:400;white-space:nowrap}.de-grid thead th{font-weight:500;opacity:.7}.de-grid td{width:22px;min-width:22px;height:22px;padding:0;border:1px solid color-mix(in srgb,currentColor 18%,transparent);cursor:crosshair;text-align:center;font:700 9px/1 system-ui,sans-serif;overflow:hidden;white-space:nowrap;outline:none}.de-grid td.part{opacity:.55}.de-grid tr.today th{color:var(--repo-accent,#69a7ff)}.de-help{margin:0}.de-msg{margin:0}`;
    document.head.append(s);
  }

  function mount(host, {
    nav = true
  } = {}) {
    css();
    let tri = '',
      week = '',
      doc = null, // semaine lue : { dispos }
      extra = {}, // appareils, simulateurs (déclaration du pilote)
      editing = null, // { day, i } : plage en cours de modification
      ready = null;
    host.classList.add('de-wrap');
    host.setAttribute('data-no-i18n', ''); // textes composés dans la langue courante (refaits au changement de langue)
    let last = ['', '']; // dernier message (gardé quand la frise est redessinée)
    const msg = (text, kind = '') => {
      last = [text || '', kind];
      const p = host.querySelector('.de-msg');
      if (p) {
        p.textContent = last[0];
        p.className = `de-msg small ${kind}`;
      }
    };

    // lecture ou enregistrement d'une autre semaine (ou d'un autre pilote) terminé après un changement de semaine : son
    // document ne doit pas remplacer celui qui est affiché (sinon la semaine suivante montrait les plages de la
    // précédente, et la retouche suivante les enregistrait sous son nom, à la place de ses propres plages)
    let loadSeq = 0,
      docKey = ''; // pilote et semaine du document tenu (doc)
    const shownIs = (t, w) => t === tri && w === week;
    /** Document de la semaine affichée chargé : retouches permises (pas pendant la lecture d'une autre semaine). */
    const docReady = () => !!doc && docKey === `${tri}|${week}`;
    async function load() {
      await need('SuiteDispos');
      if (!tri || !week) return render();
      const seq = ++loadSeq,
        t0 = tri,
        w0 = week;
      const weeks = await SD().readPilot(t0, {
        weeks: [w0],
        fresh: true
      });
      if (seq !== loadSeq || !shownIs(t0, w0)) return;
      doc = weeks[w0] || {
        dispos: {}
      };
      docKey = `${t0}|${w0}`;
      const av = await A()?.availability?.(t0);
      if (seq !== loadSeq || !shownIs(t0, w0)) return;
      // semaine sans déclaration au nouveau format mais avec une ancienne grille horaire (fichier <TRI>.json non converti,
      // ou copie gardée dans ce navigateur) : importée telle quelle, mêmes règles que tools/convert_dispos.py, puis
      // enregistrée — plus de semaine vide à côté d'une « ancienne grille » en lecture seule
      const imported = !weeks[w0] && importOld(av, w0);
      if (imported) doc = {
        dispos: imported
      };
      extra = {
        appareils: {
          possedes: av?.aircraft?.owned || [],
          maitrises: av?.aircraft?.mastered || []
        },
        simulateurs: av?.sims || []
      };
      render();
      if (imported) await save(t(['Ancienne grille horaire importée dans la semaine.', 'Former hourly grid imported into the week.', 'Frühere Stundentabelle in die Woche übernommen.', 'Antigua cuadrícula horaria importada en la semana.']));
    }
    /** Ancienne grille horaire de la semaine (ISO « 2026-W41 ») convertie en plages par jour ; null si elle est vide.
     *  Heures consécutives du même code → une plage (fin « 24:00 » : jusqu'à minuit), journée entière → debut / fin
     *  null ; code → catégorie par la configuration (codes ODV des catégories). */
    function importOld(av, w) {
      const D = SD(),
        mon = D.weekMonday(w),
        grid = av && A()?.weekGrid?.(av, isoDay(mon));
      if (!grid?.some(r => r.some(Boolean))) return null;
      const hh = h => `${String(h).padStart(2, '0')}:00`,
        out = {};
      grid.forEach((row, j) => {
        for (let h = 0; h < 24;) {
          const code = row[h];
          if (!code) {
            h++;
            continue;
          }
          let k = h;
          while (k < 24 && row[k] === code) k++;
          const cat = D.codeCategory(code);
          if (cat) (out[isoDay(mon + j * 864e5)] ||= []).push(h === 0 && k === 24 ? {
            debut: null,
            fin: null,
            categorie: cat
          } : {
            debut: hh(h),
            fin: hh(k),
            categorie: cat
          });
          h = k;
        }
      });
      return Object.keys(out).length ? out : null;
    }
    /** Enregistre la semaine (dossier des données, sinon ce navigateur) et redessine. */
    async function save(text) {
      const t0 = tri,
        w0 = week;
      const saved = () => window.dispatchEvent(new CustomEvent('dispos-week-saved', {
        detail: {
          tri: t0,
          week: w0
        }
      }));
      try {
        // appareils et simulateurs relus à chaque enregistrement : modifiés entre-temps dans Mon profil (autre onglet),
        // ceux lus à l'ouverture de la semaine écraseraient les nouveaux
        const av = await Promise.resolve(A()?.availability?.(t0)).catch(() => null);
        if (av) extra = {
          appareils: {
            possedes: av.aircraft?.owned || [],
            maitrises: av.aircraft?.mastered || []
          },
          simulateurs: av.sims || []
        };
        const r = await SD().saveWeek(t0, w0, doc.dispos, extra);
        if (!shownIs(t0, w0)) return saved(); // semaine changée entre-temps : enregistrée, mais plus affichée
        doc = r.doc;
        // gardé dans ce navigateur : raison réelle (non autorisé, autre copie…) ; alerte donnée par writeData
        if (r.where === 'local') msg(tf(['Gardé dans ce navigateur, le Centre ne le voit pas : {e}', 'Kept in this browser, the Centre cannot see it: {e}', 'In diesem Browser behalten, das Zentrum sieht es nicht: {e}', 'Guardado en este navegador, el Centro no lo ve: {e}'], {
          e: r.error?.message || ''
        }), 'warn');
        else msg(text || t(['Enregistré dans le dossier des données.', 'Saved to the data folder.', 'Im Datenordner gespeichert.', 'Guardado en la carpeta de datos.']), 'ok');
      } catch (e) {
        if (!shownIs(t0, w0)) return window.AppFramework?.notify?.(e.message, 'err');
        msg(e.message, 'err');
      }
      render();
      saved();
    }

    function render() {
      const D = SD();
      if (!D) return;
      const mon = D.weekMonday(week || D.weekId(Date.now()));
      const days = Array.from({
        length: 7
      }, (_, j) => isoDay(mon + j * 864e5));
      const groups = D.groups(),
        cats = D.categories();
      const curWeek = D.weekId(Date.now());
      const navHtml = nav ? `<div class="de-nav"><button type="button" class="secondary" data-wk="-1" title="${esc(t(['Semaine précédente', 'Previous week', 'Vorherige Woche', 'Semana anterior']))}">‹</button><input type="date" data-wk-date value="${days[0]}"><button type="button" class="secondary" data-wk="1" title="${esc(t(['Semaine suivante', 'Next week', 'Nächste Woche', 'Semana siguiente']))}">›</button>${week !== curWeek ? `<button type="button" class="secondary" data-wk="0">${esc(t(['Semaine en cours', 'Current week', 'Aktuelle Woche', 'Semana actual']))}</button>` : ''}<b>${esc(tf(['Semaine {w} — du {a} au {b}', 'Week {w} — from {a} to {b}', 'Woche {w} — vom {a} bis {b}', 'Semana {w} — del {a} al {b}'], { w: week.slice(6), a: dayLabel(mon), b: dayLabel(mon + 6 * 864e5) }))}</b></div>` : '';
      if (!tri) {
        host.innerHTML = navHtml + `<p>${esc(t(['Trigramme non réglé : le régler dans Paramètres › Mon profil (ou ☰ › Profil pilote).', 'Trigram not set: set it in Settings › My profile (or ☰ › Pilot profile).', 'Kürzel nicht gesetzt: unter Einstellungen › Mein Profil (oder ☰ › Pilotenprofil) festlegen.', 'Trigrama no definido: definirlo en Ajustes › Mi perfil (o ☰ › Perfil de piloto).']))}</p>`;
        return;
      }
      const sel = host.querySelector('[data-g]')?.value || groups[0]?.id;
      const selCat = host.querySelector('[data-c]')?.value;
      const checked = new Set([...host.querySelectorAll('[data-day]:checked')].map(x => +x.dataset.day));
      const keepFrom = host.querySelector('[data-from]')?.value || '',
        keepTo = host.querySelector('[data-to]')?.value || '';
      const catOpts = g => cats.filter(c => c.groupe === g).map(c => `<option value="${esc(c.id)}"${c.id === selCat ? ' selected' : ''}>${esc(D.label(c.label))}</option>`).join('');
      // grille heure par heure (comme avant le passage aux catégories) : un jour par ligne, 24 cases UTC ; couleur de la
      // catégorie qui couvre l'heure (plusieurs : bandes ; partielle, saisie au quart d'heure : pâlie)
      const brush = brushOf(cats);
      // case : couleur de la catégorie (plusieurs : bandes) et sa lettre de code ODV
      const cellOf = (day, h) => {
        const cs = [...cover(day)[h].keys()].map(c => D.category(c) || {});
        if (!cs.length) return '';
        const cols = cs.map(c => colorOf(c));
        const bg = cols.length === 1 ? cols[0] : `linear-gradient(135deg,${cols.map((c, n) => `${c} ${n * 100 / cols.length}% ${(n + 1) * 100 / cols.length}%`).join(',')})`;
        return ` style="background:${bg} !important;color:${ink(cols[0])} !important">${esc(cs.map(codeOf).filter(Boolean).join('/'))}`;
      };
      const tip = (day, h) => {
        const cs = [...cover(day)[h].entries()].map(([c, m]) => `${D.label(D.category(c)?.label || c)}${m < 60 ? ` (${m} min)` : ''}`);
        return `${dayLabel(Date.parse(`${day}T00:00:00Z`))} ${String(h).padStart(2, '0')}–${String(h + 1).padStart(2, '0')}h UTC${cs.length ? ' — ' + cs.join(', ') : ''}`;
      };
      const gridHtml = `${palette(brush)}
        <div class="de-gridwrap"><table class="de-grid"><thead><tr><th></th>${Array.from({ length: 24 }, (_, h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${days.map((day, j) => {
          const cv = cover(day);
          return `<tr${day === isoDay(Date.now()) ? ' class="today"' : ''}><th>${esc(dayLabel(Date.parse(`${day}T00:00:00Z`)))}</th>${cv.map((m, h) => `<td data-cell="${j}:${h}" class="${m.size && [...m.values()].every(v => v < 60) ? 'part' : ''}" title="${esc(tip(day, h))}"${cellOf(day, h) || '>'}</td>`).join('')}</tr>`;
        }).join('')}</tbody></table></div>
        <p class="small de-help">${esc(t(['Choisir une catégorie, puis cliquer sur une case ou tracer un rectangle (heures UTC) ; un second clic sur une case de cette catégorie l’efface.', 'Choose a category, then click a cell or draw a rectangle (UTC hours); a second click on a cell of that category clears it.', 'Eine Kategorie wählen, dann eine Zelle anklicken oder ein Rechteck ziehen (UTC-Stunden); ein zweiter Klick auf eine Zelle dieser Kategorie löscht sie.', 'Elegir una categoría y luego hacer clic en una celda o trazar un rectángulo (horas UTC); un segundo clic en una celda de esa categoría la borra.']))}</p>`;
      const pending = (A()?.pendingData?.() || []).filter(p => p.startsWith(`disponibilites/${tri}/`)).length;
      host.innerHTML = `${navHtml}${gridHtml}
        <div class="de-add"><span class="de-pal-g">${esc(t(['Plage précise', 'Precise range', 'Genauer Zeitraum', 'Intervalo preciso']))}</span><label>${esc(t(['Groupe', 'Group', 'Gruppe', 'Grupo']))} <select data-g>${groups.map(g => `<option value="${esc(g.id)}"${g.id === sel ? ' selected' : ''}>${esc(D.label(g.label))}</option>`).join('')}</select></label>
          <label>${esc(t(['Catégorie', 'Category', 'Kategorie', 'Categoría']))} <select data-c>${catOpts(sel)}</select></label>
          <span class="de-days">${DAYS.map((d, j) => `<label><input type="checkbox" data-day="${j}"${checked.has(j) ? ' checked' : ''}> ${esc(t(d))}</label>`).join('')}</span>
          <label>${esc(t(['de', 'from', 'von', 'de']))} <input type="time" step="900" data-from value="${esc(keepFrom)}"></label><label>${esc(t(['à', 'to', 'bis', 'a']))} <input type="time" step="900" data-to value="${esc(keepTo)}"></label>
          <span class="small">UTC</span><button type="button" class="primary" data-add>${esc(t(['Ajouter', 'Add', 'Hinzufügen', 'Añadir']))}</button></div>
        <p class="de-themes"></p>
        <div class="de-actions"><button type="button" class="secondary" data-copy title="${esc(t(['Recopier les plages de la semaine précédente (remplace la semaine affichée)', 'Copy the ranges of the previous week (replaces the shown week)', 'Zeiträume der Vorwoche übernehmen (ersetzt die angezeigte Woche)', 'Copiar los intervalos de la semana anterior (reemplaza la semana mostrada)']))}">⧉ ${esc(t(['Semaine précédente', 'Previous week', 'Vorherige Woche', 'Semana anterior']))}</button>
          <button type="button" class="ghost" data-clear>${esc(t(['Tout effacer', 'Clear all', 'Alles löschen', 'Borrar todo']))}</button>
          ${pending ? `<button type="button" class="secondary" data-flush data-icon="save">${esc(tf(['Écrire dans le dossier des données ({n})', 'Write to the data folder ({n})', 'In den Datenordner schreiben ({n})', 'Escribir en la carpeta de datos ({n})'], { n: pending }))}</button>` : ''}</div>
        <p class="de-msg small ${last[1]}" data-status>${esc(last[0])}</p>`;
      themesHint();
    }
    /** Thèmes ouverts par la catégorie choisie (préférences du pilote) ; catégorie personnalisée : lien vers les préférences. */
    async function themesHint() {
      const D = SD(),
        p = host.querySelector('.de-themes'),
        c = D.category(host.querySelector('[data-c]')?.value);
      if (!p || !c) return;
      const prefs = await window.SuiteUsers?.themePrefs?.(tri).catch(() => null);
      const th = [...D.openThemes(c, prefs)];
      const txt = th.includes('*') ? t(['Ouvre tous les thèmes de mission.', 'Opens every mission theme.', 'Öffnet alle Missionsthemen.', 'Abre todos los temas de misión.']) : th.length ? tf(['Thèmes ouverts : {t}', 'Open themes: {t}', 'Offene Themen: {t}', 'Temas abiertos: {t}'], {
        t: th.map(D.themeLabel).join(', ')
      }) : t(['Aucun thème de mission ouvert.', 'No mission theme open.', 'Kein Missionsthema offen.', 'Ningún tema de misión abierto.']);
      const perso = /^prefs:/.test(String(c.ouverts || ''));
      p.innerHTML = `${esc(txt)}${perso ? ` <a href="${esc(window.RepositoryNav?.settingsUrl?.('themes') || '#')}">${esc(t(['Mes types de missions…', 'My mission types…', 'Meine Missionsarten…', 'Mis tipos de misión…']))}</a>` : ''}`;
    }
    /** Plage { debut, fin } d'après deux saisies (vides : journée entière) ; null si incohérente. */
    function span(from, to) {
      if (!from && !to) return {
        debut: null,
        fin: null
      };
      const a = from || '00:00',
        b = to || '24:00';
      if (b !== '24:00' && mins(b) <= mins(a)) return null;
      return {
        debut: a,
        fin: b
      };
    }
    const badSpan = () => msg(t(['Horaires incohérents : la fin doit suivre le début (UTC, au quart d’heure).', 'Inconsistent times: the end must follow the start (UTC, quarter hours).', 'Unstimmige Zeiten: Das Ende muss nach dem Beginn liegen (UTC, Viertelstunden).', 'Horarios incoherentes: el fin debe seguir al inicio (UTC, cuartos de hora).']), 'err');
    const quarter = s => !s || mins(s) % 15 === 0;

    // ---- grille heure par heure : couverture des heures par les plages, peinture d'un rectangle de cases
    const hhmm = m => m >= 1440 ? '24:00' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    /** Par heure (0-23) du jour : Map catégorie → minutes couvertes. */
    function cover(day) {
      const out = Array.from({
        length: 24
      }, () => new Map());
      for (const x of doc?.dispos?.[day] || []) {
        const a = mins(x.debut) ?? 0,
          b = mins(x.fin) ?? 1440;
        for (let h = Math.floor(a / 60); h < Math.ceil(b / 60) && h < 24; h++) {
          const m = Math.min(b, (h + 1) * 60) - Math.max(a, h * 60);
          if (m > 0) out[h].set(x.categorie, (out[h].get(x.categorie) || 0) + m);
        }
      }
      return out;
    }
    /** Heures h1…h2 (incluses) d'un jour : catégorie posée (remplace ce qui s'y trouvait), ou retirée (erase) ; plages
     *  hors de ces heures gardées telles quelles (au quart d'heure) ; plages contiguës d'une même catégorie fusionnées. */
    function paintDay(day, h1, h2, cat, erase) {
      const A0 = h1 * 60,
        B0 = (h2 + 1) * 60,
        out = [];
      for (const x of doc.dispos[day] || []) {
        const a = mins(x.debut) ?? 0,
          b = mins(x.fin) ?? 1440;
        if (!(a < B0 && b > A0) || (erase && x.categorie !== cat)) {
          out.push(x);
          continue;
        }
        if (a < A0) out.push({
          ...x,
          debut: hhmm(a),
          fin: hhmm(A0)
        });
        if (b > B0) out.push({
          ...x,
          debut: hhmm(B0),
          fin: hhmm(b)
        });
      }
      if (!erase) out.push({
        debut: hhmm(A0),
        fin: hhmm(B0),
        categorie: cat
      });
      out.sort((p, q) => String(p.categorie).localeCompare(String(q.categorie)) || (mins(p.debut) ?? 0) - (mins(q.debut) ?? 0));
      const merged = [];
      for (const x of out) {
        const a = mins(x.debut) ?? 0,
          b = mins(x.fin) ?? 1440,
          prev = merged[merged.length - 1];
        if (prev && prev.categorie === x.categorie && (mins(prev.fin) ?? 1440) >= a) prev.fin = hhmm(Math.max(mins(prev.fin) ?? 1440, b));
        else merged.push({
          ...x,
          debut: hhmm(a),
          fin: hhmm(b)
        });
      }
      for (const x of merged)
        if (x.debut === '00:00' && x.fin === '24:00') x.debut = x.fin = null; // journée entière
      if (merged.length) doc.dispos[day] = merged;
      else delete doc.dispos[day];
    }
    // catégorie de la palette (pinceau), gardée dans ce navigateur
    const BRUSH = 'disposBrush:v1';
    const brushOf = cats => {
      let b = '';
      try {
        b = localStorage.getItem(BRUSH) || '';
      } catch {
        /* stockage indisponible */
      }
      return cats.some(c => c.id === b) ? b : cats[0]?.id || '';
    };
    // tracé : appui sur une case, glissé jusqu'à une autre, relâché → rectangle peint (ou effacé si la première case
    // portait déjà la catégorie)
    let drag = null;
    const cellAt = el => el?.closest?.('td[data-cell]')?.dataset.cell.split(':').map(Number) || null;
    const mark = () => host.querySelectorAll('td[data-cell]').forEach(td => {
      const [j, h] = td.dataset.cell.split(':').map(Number),
        inRect = !!drag && j >= Math.min(drag.j0, drag.j1) && j <= Math.max(drag.j0, drag.j1) && h >= Math.min(drag.h0, drag.h1) && h <= Math.max(drag.h0, drag.h1);
      if (!drag.orig.has(td)) drag.orig.set(td, [td.getAttribute('style') || '', td.textContent]);
      const [st, tx] = drag.orig.get(td);
      if (inRect) {
        td.setAttribute('style', drag.erase ? '' : `background:${drag.color} !important;color:${ink(drag.color)} !important`);
        td.textContent = drag.erase ? '' : drag.code;
      } else {
        td.setAttribute('style', st);
        td.textContent = tx;
      }
    });
    host.addEventListener('pointerdown', e => {
      const c = cellAt(e.target);
      if (!c || !tri || !docReady() || e.button) return;
      e.preventDefault();
      const D = SD(),
        cat = brushOf(D.categories()),
        day = isoDay(D.weekMonday(week) + c[0] * 864e5);
      const cc = D.category(cat);
      drag = {
        j0: c[0],
        h0: c[1],
        j1: c[0],
        h1: c[1],
        orig: new Map(),
        color: colorOf(cc),
        code: codeOf(cc),
        cat,
        erase: (cover(day)[c[1]].get(cat) || 0) >= 60
      };
      mark();
    });
    host.addEventListener('pointerover', e => {
      const c = drag && cellAt(e.target);
      if (!c) return;
      [drag.j1, drag.h1] = c;
      mark();
    });
    addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag,
        D = SD(),
        mon = D.weekMonday(week);
      drag = null;
      if (!docReady()) return render(); // semaine changée pendant le tracé
      for (let j = Math.min(d.j0, d.j1); j <= Math.max(d.j0, d.j1); j++) paintDay(isoDay(mon + j * 864e5), Math.min(d.h0, d.h1), Math.max(d.h0, d.h1), d.cat, d.erase);
      render(); // grille redessinée tout de suite, puis enregistrement
      save(d.erase ? t(['Cases effacées.', 'Cells cleared.', 'Zellen gelöscht.', 'Celdas borradas.']) : t(['Disponibilité enregistrée.', 'Availability saved.', 'Verfügbarkeit gespeichert.', 'Disponibilidad guardada.']));
    });
    host.addEventListener('change', e => {
      if (e.target.matches('[data-g]')) {
        const D = SD();
        host.querySelector('[data-c]').innerHTML = D.categories().filter(c => c.groupe === e.target.value).map(c => `<option value="${esc(c.id)}">${esc(D.label(c.label))}</option>`).join('');
        themesHint();
      }
      if (e.target.matches('[data-c]')) themesHint();
      if (e.target.matches('[data-wk-date]') && e.target.value) setWeek(SD().weekId(Date.parse(`${e.target.value}T12:00:00Z`)));
    });
    host.addEventListener('click', async e => {
      const D = SD();
      const br = e.target.closest('[data-brush]');
      if (br) {
        try {
          localStorage.setItem(BRUSH, br.dataset.brush);
        } catch {
          /* stockage indisponible */
        }
        host.querySelectorAll('[data-brush]').forEach(x => x.classList.toggle('on', x === br));
        return;
      }
      const wk = e.target.closest('[data-wk]');
      if (wk) return setWeek(+wk.dataset.wk ? D.addWeek(week, +wk.dataset.wk) : D.weekId(Date.now()));
      // ajout, recopie, effacement : seulement sur le document de la semaine affichée (pas pendant sa lecture)
      if (e.target.closest('[data-add], [data-copy], [data-clear]') && !docReady()) return msg(t(['Semaine en cours de lecture : réessayer dans un instant.', 'Week still loading: try again in a moment.', 'Woche wird noch gelesen: gleich noch einmal versuchen.', 'Semana aún cargando: reintentar en un momento.']), 'warn');
      if (e.target.closest('[data-add]')) {
        const cat = host.querySelector('[data-c]').value,
          days = [...host.querySelectorAll('[data-day]:checked')].map(x => +x.dataset.day);
        if (!cat) return msg(t(['Choisir une catégorie.', 'Choose a category.', 'Eine Kategorie wählen.', 'Elegir una categoría.']), 'err');
        if (!days.length) return msg(t(['Cocher au moins un jour.', 'Tick at least one day.', 'Mindestens einen Tag ankreuzen.', 'Marcar al menos un día.']), 'err');
        const from = host.querySelector('[data-from]').value,
          to = host.querySelector('[data-to]').value,
          s = span(from, to);
        if (!s || !quarter(from) || !quarter(to)) return badSpan();
        const mon = D.weekMonday(week);
        for (const j of days) {
          const day = isoDay(mon + j * 864e5);
          (doc.dispos[day] ||= []).push({
            ...s,
            categorie: cat
          });
        }
        return save(tf(['{n} plage(s) ajoutée(s).', '{n} range(s) added.', '{n} Zeitraum/Zeiträume hinzugefügt.', '{n} intervalo(s) añadido(s).'], {
          n: days.length
        }));
      }
      if (e.target.closest('[data-copy]')) {
        const key = docKey,
          prevId = D.addWeek(week, -1),
          prev = (await D.readPilot(tri, {
            weeks: [prevId],
            fresh: true
          }))[prevId];
        if (docKey !== key || !docReady()) return; // semaine changée pendant la lecture
        if (!prev || !Object.keys(prev.dispos || {}).length) return msg(t(['Semaine précédente vide : rien à recopier.', 'Previous week empty: nothing to copy.', 'Vorwoche leer: nichts zu übernehmen.', 'Semana anterior vacía: nada que copiar.']), 'err');
        if (Object.keys(doc.dispos || {}).length && !await window.AppFramework.ask(t(['Remplacer les plages de la semaine affichée par celles de la semaine précédente ?', 'Replace the ranges of the shown week by those of the previous week?', 'Die Zeiträume der angezeigten Woche durch die der Vorwoche ersetzen?', '¿Reemplazar los intervalos de la semana mostrada por los de la semana anterior?']))) return;
        if (docKey !== key || !docReady()) return;
        doc.dispos = Object.fromEntries(Object.entries(prev.dispos).map(([d, l]) => [isoDay(Date.parse(`${d}T00:00:00Z`) + 7 * 864e5), l.map(x => ({
          ...x
        }))]));
        return save(t(['Semaine précédente recopiée.', 'Previous week copied.', 'Vorwoche übernommen.', 'Semana anterior copiada.']));
      }
      if (e.target.closest('[data-clear]')) {
        if (!Object.keys(doc.dispos || {}).length) return;
        const key = docKey;
        if (!await window.AppFramework.ask(t(['Effacer toutes les plages de la semaine affichée ?', 'Clear every range of the shown week?', 'Alle Zeiträume der angezeigten Woche löschen?', '¿Borrar todos los intervalos de la semana mostrada?']), {
            danger: true
          })) return;
        if (docKey !== key || !docReady()) return; // semaine changée pendant la question
        doc.dispos = {};
        return save(t(['Semaine effacée.', 'Week cleared.', 'Woche gelöscht.', 'Semana borrada.']));
      }
      if (e.target.closest('[data-flush]')) {
        try {
          const done = await A().flushData();
          msg(tf(['{n} fichier(s) écrit(s) dans le dossier des données.', '{n} file(s) written to the data folder.', '{n} Datei(en) in den Datenordner geschrieben.', '{n} archivo(s) escrito(s) en la carpeta de datos.'], {
            n: done.length
          }), 'ok');
          render();
        } catch (err) {
          msg(err.message, 'err');
        }
      }
    });

    function setWeek(w) {
      if (!w || w === week) return;
      week = w;
      editing = null;
      last = ['', ''];
      ready = load();
      host.dispatchEvent(new CustomEvent('dispos-week', {
        detail: {
          week
        }
      }));
    }
    window.addEventListener('repository-language-change', () => render());
    window.addEventListener('suite-dispos-config', () => tri && render());
    return {
      /** Pilote et semaine (ISO « 2026-W41 ») affichés ; relit la semaine. */
      set(o = {}) {
        if ('tri' in o) tri = String(o.tri || '').toUpperCase();
        if (o.week) week = o.week;
        week ||= window.SuiteDispos?.weekId(Date.now()) || '';
        editing = null;
        return ready = load();
      },
      refresh: () => ready = load(),
      /** Appareils et simulateurs changés (Mes missions) : relus et recopiés dans la semaine affichée si elle est déclarée. */
      async touch() {
        await ready;
        if (!tri || !doc || !Object.keys(doc.dispos || {}).length) return;
        const av = await A()?.availability?.(tri);
        extra = {
          appareils: {
            possedes: av?.aircraft?.owned || [],
            maitrises: av?.aircraft?.mastered || []
          },
          simulateurs: av?.sims || []
        };
        await save();
      },
      get week() {
        return week;
      }
    };
  }
  window.DisposEditor = {
    mount,
    /** Légende des catégories (palette de Mes missions, pastilles inertes) : HTML. */
    legend: () => SD() ? (css(), palette()) : ''
  };
})();
