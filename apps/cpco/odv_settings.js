(() => {
  'use strict';
  // Réglages du planning ODV propres à la compagnie : heures des créneaux, dates de la semaine (n° de semaine ISO du fichier
  // ou date de la frise), case vide, types FLOTTE retenus, missions montrées, préférence à score égal, codes restreints,
  // lignes de groupe récurrentes, pays préféré (périmètre des sessions ATC : shared/atc_sessions.js, chargé avant). Gardés dans ce navigateur (localStorage odvPlanning:v1, aucun trigramme), lus par la
  // page ODV (apps/cpco/odv_planning.js) ; saisis dans Paramètres › Centre, rubrique « Planning ODV ».
  // Valeurs par défaut et familles : apps/cpco/odv_core.js (OdvCore.DEFAULTS, OdvCore.FAMILIES).
  // API (window.OdvSettings) : KEY, load(), save(réglages), render(hôte, { onChange }) ; événement « odv-settings-change ».
  const KEY = 'odvPlanning:v1';
  const K = window.RepositoryKit,
    esc = s => K.esc(s),
    L = (row, vals) => K.tf(row, vals);
  const C = () => window.OdvCore;
  const clone = o => JSON.parse(JSON.stringify(o));
  const notify = (m, k) => window.AppFramework?.notify?.(m, k);

  /** Réglages mémorisés, complétés par les valeurs par défaut (heures invalides : celles par défaut). */
  function load() {
    let s = {};
    try {
      s = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch {
      s = {};
    }
    const d = clone(C()?.DEFAULTS || {}),
      out = {
        ...d,
        ...s
      };
    if (!Array.isArray(out.hours) || out.hours.length !== 3 || out.hours.some(h => !Array.isArray(h) || h.length !== 2)) out.hours = d.hours;
    if (!Array.isArray(out.preference)) out.preference = d.preference;
    return out;
  }
  /** Mémorise ; la page ODV ouverte dans un autre onglet suit (événement storage), celle-ci aussi (odv-settings-change). */
  function save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* stockage indisponible */
    }
    window.dispatchEvent(new CustomEvent('odv-settings-change', {
      detail: s
    }));
  }

  const SLOTS = [
    ['Matin', 'Morning', 'Morgen', 'Mañana'],
    ['Après-midi', 'Afternoon', 'Nachmittag', 'Tarde'],
    ['Soir', 'Evening', 'Abend', 'Noche']
  ];
  /** Bloc de saisie des réglages dans host ; onChange(réglages) après chaque modification enregistrée. */
  function render(host, {
    onChange = () => {}
  } = {}) {
    let s = load();
    if (!document.getElementById('odvSettingsCss')) document.head.insertAdjacentHTML('beforeend', `<style id="odvSettingsCss">
      .odv-settings{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px 16px}
      .odv-settings label{display:grid;gap:4px;font-size:12px;color:var(--muted);font-weight:600}
      .odv-settings label.odv-check{display:flex;align-items:center;gap:7px}
      .odv-hours{display:grid;grid-template-columns:auto 4.2em auto 4.2em;gap:4px 6px;align-items:center;font-size:12px;color:var(--muted)}
      .odv-hours input{width:4.2em}</style>`);
    const o = (v, cur, row) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(L(row))}</option>`;
    host.innerHTML = `<div class="odv-settings">
      <div><div class="mut" style="font-weight:600;margin-bottom:4px">${esc(L(['Créneaux (heures z)', 'Slots (z hours)', 'Zeitfenster (z-Stunden)', 'Franjas (horas z)']))}</div>
        <div class="odv-hours" data-hours>${SLOTS.map((row, k) => `<span>${esc(L(row))}</span><input type="number" min="0" max="24" step="0.5" data-h="${k}0" value="${s.hours[k][0]}"><span>${esc(L(['à', 'to', 'bis', 'a']))}</span><input type="number" min="0" max="24" step="0.5" data-h="${k}1" value="${s.hours[k][1]}">`).join('')}</div></div>
      ${window.SuiteAtc?.countries ? `<label title="${esc(L(['Sessions ATC des réseaux (trainings, examens, réservations) importées et montrées pour ce pays : Planning ODV et Ordres de vols.', 'Network ATC sessions (trainings, exams, bookings) imported and shown for this country: ODV planning and flight orders.', 'ATC-Sitzungen der Netzwerke (Trainings, Prüfungen, Buchungen) für dieses Land importiert und gezeigt: ODV-Planung und Flugbefehle.', 'Sesiones ATC de las redes (entrenamientos, exámenes, reservas) importadas y mostradas para este país: planificación ODV y órdenes de vuelo.']))}">${esc(L(['Pays préféré (périmètre ATC)', 'Preferred country (ATC perimeter)', 'Bevorzugtes Land (ATC-Bereich)', 'País preferido (perímetro ATC)']))}<select data-k="pays">${window.SuiteAtc.countries().map(c => `<option value="${esc(c.id)}"${c.id === (s.pays || 'fr') ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
      <label>${esc(L(['Dates de la semaine', 'Dates of the week', 'Daten der Woche', 'Fechas de la semana']))}<select data-k="dateSource">${o('iso', s.dateSource, ['Semaine ISO (n° de semaine du fichier)', 'ISO week (week number of the file)', 'ISO-Woche (Wochennummer der Datei)', 'Semana ISO (n.º de semana del archivo)'])}${o('frise', s.dateSource, ['Date saisie sur la frise', 'Date entered on the timeline', 'Auf der Zeitleiste eingetragenes Datum', 'Fecha introducida en la cronología'])}</select></label>
      <label>${esc(L(['Case vide', 'Empty cell', 'Leere Zelle', 'Celda vacía']))}<select data-k="emptyAs">${o('inconnu', s.emptyAs, ['Non renseignée', 'Not filled in', 'Nicht ausgefüllt', 'Sin rellenar'])}${o('indispo', s.emptyAs, ['Indisponible', 'Unavailable', 'Nicht verfügbar', 'No disponible'])}</select></label>
      <label>${esc(L(['Types FLOTTE retenus pour les rôles', 'FLOTTE types used for roles', 'FLOTTE-Typen für die Rollen', 'Tipos FLOTTE usados para los roles']))}<select data-k="flotteLevel">${o('noRed', s.flotteLevel, ['Tous sauf les rouges (non maîtrisés)', 'All but red (not mastered)', 'Alle außer rot (nicht beherrscht)', 'Todos salvo los rojos (no dominados)'])}${o('green', s.flotteLevel, ['Verts seuls (maîtrisés)', 'Green only (mastered)', 'Nur grün (beherrscht)', 'Solo verdes (dominados)'])}${o('all', s.flotteLevel, ['Tous', 'All', 'Alle', 'Todos'])}</select></label>
      <label>${esc(L(['Missions montrées par créneau', 'Missions shown per slot', 'Gezeigte Missionen pro Zeitfenster', 'Misiones mostradas por franja']))}<input type="number" data-k="top" min="1" max="10" step="1" value="${esc(s.top)}"></label>
      <label>${esc(L(['Ordre de préférence à score égal', 'Preference order when scores are equal', 'Reihenfolge bei gleicher Punktzahl', 'Orden de preferencia con igual puntuación']))}<input type="text" data-k="preference" spellcheck="false" value="${esc(s.preference.join(', '))}"></label>
      <label class="odv-check"><input type="checkbox" data-k="strictCodes"${s.strictCodes ? ' checked' : ''}> ${esc(L(['Code restreint (SC, C, T, N) : rôles de son domaine seulement', 'Restricted code (SC, C, T, N): roles of its domain only', 'Eingeschränkter Code (SC, C, T, N): nur Rollen seines Bereichs', 'Código restringido (SC, C, T, N): solo los roles de su dominio']))}</label>
      <label class="odv-check"><input type="checkbox" data-k="ignoreRecurring"${s.ignoreRecurring ? ' checked' : ''}> ${esc(L(['Ignorer une ligne de groupe colorée les 7 jours sur un créneau (habillage)', 'Ignore a group row coloured all 7 days in a slot (decoration)', 'Eine an allen 7 Tagen gefärbte Gruppenzeile ignorieren (Gestaltung)', 'Ignorar una fila de grupo coloreada los 7 días en una franja (decoración)']))}</label>
    </div>
    <p class="row" style="margin:10px 0 0"><button type="button" data-reset data-icon="refresh">${esc(L(['Réglages par défaut', 'Default settings', 'Standardeinstellungen', 'Ajustes por defecto']))}</button></p>`;
    const commit = () => {
      save(s);
      onChange(s);
    };
    host.querySelectorAll('[data-hours] input').forEach(i => i.onchange = () => {
      const h = clone(s.hours);
      host.querySelectorAll('[data-hours] input').forEach(x => {
        const [k, e] = x.dataset.h.split('').map(Number);
        h[k][e] = Math.max(0, Math.min(24, +x.value || 0));
      });
      if (h.some(([a, b]) => b <= a)) {
        notify(L(['Créneau invalide : l’heure de fin doit suivre l’heure de début.', 'Invalid slot: the end time must follow the start time.', 'Ungültiges Zeitfenster: Die Endzeit muss nach der Startzeit liegen.', 'Franja no válida: la hora de fin debe seguir a la de inicio.']), 'warn');
        render(host, {
          onChange
        });
        return;
      }
      s.hours = h;
      commit();
    });
    host.querySelectorAll('[data-k]').forEach(el => el.onchange = () => {
      const k = el.dataset.k;
      if (el.type === 'checkbox') s[k] = el.checked;
      else if (k === 'top') {
        s.top = Math.max(1, Math.min(10, Math.round(+el.value) || 3));
        el.value = s.top;
      } else if (k === 'preference') {
        const fam = C()?.FAMILIES || {},
          list = el.value.toUpperCase().split(/[\s,;]+/).filter(Boolean),
          bad = list.filter(f => !fam[f]);
        if (bad.length) notify(L(['Familles inconnues ignorées : {b} (connues : {k}).', 'Unknown families ignored: {b} (known: {k}).', 'Unbekannte Familien ignoriert: {b} (bekannt: {k}).', 'Familias desconocidas ignoradas: {b} (conocidas: {k}).'], {
          b: bad.join(', '),
          k: Object.keys(fam).join(', ')
        }), 'warn');
        s.preference = list.filter(f => fam[f]);
        if (!s.preference.length) s.preference = clone(C()?.DEFAULTS?.preference || []);
        el.value = s.preference.join(', ');
      } else s[k] = el.value;
      commit();
    });
    host.querySelector('[data-reset]').onclick = () => {
      s = clone(C()?.DEFAULTS || {});
      commit();
      render(host, {
        onChange
      });
      notify(L(['Réglages par défaut rétablis.', 'Default settings restored.', 'Standardeinstellungen wiederhergestellt.', 'Ajustes por defecto restablecidos.']), 'info');
    };
  }

  window.OdvSettings = {
    KEY,
    load,
    save,
    render
  };
  // rubrique de Paramètres › Centre (page chargée avec shared/settings_panels.js)
  window.SettingsPanels?.add({
    id: 'odv',
    group: window.SettingsPanels.L('Centre (CPCO)', 'Centre (CPCO)', 'Zentrum (CPCO)', 'Centro (CPCO)'),
    title: window.SettingsPanels.L('Planning ODV', 'ODV planning', 'ODV-Planung', 'Planificación ODV'),
    intro: window.SettingsPanels.L('Réglages de la page Planning ODV : heures des créneaux matin, après-midi et soir, pays préféré (périmètre des sessions ATC, aussi pour les Ordres de vols), lecture du classeur (dates de la semaine, case vide, types FLOTTE), missions probables. Gardés dans ce navigateur.', 'Settings of the ODV planning page: morning, afternoon and evening slot hours, preferred country (ATC session perimeter, also for the flight orders), workbook reading (dates of the week, empty cell, FLOTTE types), likely missions. Kept in this browser.', 'Einstellungen für die ODV-Planung: Stunden der Zeitfenster Morgen, Nachmittag und Abend, bevorzugtes Land (Bereich der ATC-Sitzungen, auch für die Flugbefehle), Lesen der Arbeitsmappe (Daten der Woche, leere Zelle, FLOTTE-Typen), wahrscheinliche Missionen. In diesem Browser gespeichert.', 'Ajustes de la página de planificación ODV: horas de las franjas de mañana, tarde y noche, país preferido (perímetro de las sesiones ATC, también para las órdenes de vuelo), lectura del libro (fechas de la semana, celda vacía, tipos FLOTTE), misiones probables. Guardados en este navegador.'),
    render(body) {
      render(body);
    }
  });
})();
