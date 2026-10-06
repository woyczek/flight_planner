(() => {
  'use strict';
  // Saisie des activations de zones par réseau (RTBA, R, D, TRA…), pour les ordres de vols : une ligne par zone, réseau
  // et plage (UTC) d'un jour de la semaine, avec son état (active, demandée, refusée). Lecture et écriture par
  // OdvAirspace (shared/odv_airspace.js : data/atc/activations/<AAAA>-W<nn>.json, pool synchronisé). Chaque retouche
  // est enregistrée (600 ms après la dernière) ; avertissements en notifications flottantes (AppFramework.notify).
  // Zones proposées : espaces activables de la base aéronautique (OdvAirspace.zones) ; une zone inconnue de la base reste
  // saisissable (nom libre).
  // API (window.OdvActivationsEditor) : mount(hôte, { semaine, readOnly = false, onChange(liste) }) →
  //   { set({ semaine, readOnly }), refresh(), list() }.
  if (window.OdvActivationsEditor) return;
  const K = window.RepositoryKit,
    esc = K?.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)),
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const O = () => window.OdvAirspace;
  const T = {
    jour: ['Jour', 'Day', 'Tag', 'Día'],
    zone: ['Zone', 'Area', 'Zone', 'Zona'],
    reseau: ['Réseau', 'Network', 'Netz', 'Red'],
    tous: ['les deux', 'both', 'beide', 'ambas'],
    etat: ['État', 'State', 'Status', 'Estado'],
    de: ['De (UTC)', 'From (UTC)', 'Von (UTC)', 'Desde (UTC)'],
    a: ['À (UTC)', 'To (UTC)', 'Bis (UTC)', 'Hasta (UTC)'],
    texte: ['Remarque', 'Remark', 'Bemerkung', 'Observación'],
    ajouter: ['Ajouter une activation', 'Add an activation', 'Aktivierung hinzufügen', 'Añadir una activación'],
    retirer: ['Retirer', 'Remove', 'Entfernen', 'Quitar'],
    vide: ['Aucune activation saisie pour cette semaine.', 'No activation entered for this week.', 'Keine Aktivierung für diese Woche erfasst.', 'Ninguna activación introducida para esta semana.'],
    absent: ['Saisie des activations indisponible : shared/odv_airspace.js n’est pas chargé.', 'Activation entry unavailable: shared/odv_airspace.js is not loaded.', 'Erfassung der Aktivierungen nicht verfügbar: shared/odv_airspace.js nicht geladen.', 'Introducción de activaciones no disponible: shared/odv_airspace.js no está cargado.'],
    base: ['Base aéronautique absente ou zone France inactive : zones à saisir par leur nom.', 'Aeronautical database missing or France zone inactive: enter zones by name.', 'Luftfahrtdatenbank fehlt oder Zone Frankreich inaktiv: Zonen mit Namen eingeben.', 'Base aeronáutica ausente o zona Francia inactiva: introducir las zonas por su nombre.'],
    local: ['Activations gardées dans ce navigateur : le dossier des données n’est pas autorisé.', 'Activations kept in this browser: the data folder is not authorised.', 'Aktivierungen in diesem Browser gespeichert: Datenordner nicht erlaubt.', 'Activaciones guardadas en este navegador: carpeta de datos no autorizada.'],
    erreur: ['Activations non enregistrées : {e}', 'Activations not saved: {e}', 'Aktivierungen nicht gespeichert: {e}', 'Activaciones no guardadas: {e}']
  };
  const ETAT = {
    active: ['active', 'active', 'aktiv', 'activa'],
    demandee: ['demandée', 'requested', 'beantragt', 'solicitada'],
    refusee: ['refusée', 'refused', 'abgelehnt', 'rechazada']
  };
  const loc = () => ['fr-FR', 'en-GB', 'de-DE', 'es-ES'][K?.langIndex?.() ?? 0] || 'fr-FR';
  const pad = n => String(n).padStart(2, '0');
  /** Lundi (ms, UTC) d'une semaine ISO « AAAA-Www ». */
  function monday(week) {
    if (window.SuiteDispos?.weekMonday) return window.SuiteDispos.weekMonday(week);
    const m = /^(\d{4})-W(\d{2})$/.exec(String(week || ''));
    if (!m) return NaN;
    const jan4 = Date.UTC(+m[1], 0, 4),
      d = new Date(jan4);
    return jan4 - ((d.getUTCDay() + 6) % 7) * 864e5 + (+m[2] - 1) * 6048e5;
  }
  const daysOf = week => {
    const m0 = monday(week);
    return isNaN(m0) ? [] : Array.from({
      length: 7
    }, (_, i) => new Date(m0 + i * 864e5).toISOString().slice(0, 10));
  };
  const dayLabel = d => new Date(`${d}T12:00:00Z`).toLocaleDateString(loc(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  });
  let css = false;

  function style() {
    if (css) return;
    css = true;
    const s = document.createElement('style');
    s.textContent = `@layer app{.odv-act table{border-collapse:collapse;width:100%}.odv-act th,.odv-act td{padding:3px 5px;text-align:left;vertical-align:middle}.odv-act th{font-size:12px;font-weight:650}.odv-act input[type=text]{width:100%;min-width:7em}.odv-act input[type=time]{width:6.5em}.odv-act .odv-act-scroll{max-width:100%;overflow-x:auto}.odv-act tr[data-etat=active] td:first-child{box-shadow:inset 3px 0 #2e9d4f}.odv-act tr[data-etat=demandee] td:first-child{box-shadow:inset 3px 0 #e39b1b}.odv-act tr[data-etat=refusee] td:first-child{box-shadow:inset 3px 0 #b91c1c}.odv-act .odv-act-note{font-size:12px;opacity:.8;margin:4px 0}}`;
    document.head.append(s);
  }

  function mount(host, {
    semaine = '',
    readOnly = false,
    onChange = null
  } = {}) {
    style();
    let week = semaine,
      ro = !!readOnly,
      rows = [],
      zones = [],
      zonesNote = '',
      timer = 0,
      seq = 0;
    host.classList.add('odv-act');
    const listId = `odvActZones${Math.random().toString(36).slice(2, 8)}`;
    const notify = (m, k = 'warn') => window.AppFramework?.notify?.(m, k);

    async function load() {
      const me = ++seq;
      if (!O()) {
        host.innerHTML = `<p class="odv-act-note">${esc(t(T.absent))}</p>`;
        return;
      }
      const [list, z] = await Promise.all([O().activations(week), O().zones('').catch(() => null)]);
      if (me !== seq) return; // semaine changée entre-temps
      rows = list.map(x => ({
        ...x
      }));
      zones = Array.isArray(z) ? z : [];
      zonesNote = Array.isArray(z) ? '' : t(T.base);
      render();
    }
    const zoneName = id => zones.find(z => z.id === id)?.nom || id;
    /** Id de base d'une saisie (nom ou id), sinon le texte saisi. */
    const zoneId = v => {
      const s = String(v || '').trim();
      const z = zones.find(x => x.id === s || x.nom === s) || zones.find(x => x.nom.toUpperCase() === s.toUpperCase());
      return z ? z.id : s;
    };

    function render() {
      const days = daysOf(week);
      const sel = (name, value, opts) => `<select data-k="${name}"${ro ? ' disabled' : ''}>${opts.map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      const line = (r, i) => `<tr data-i="${i}" data-etat="${esc(r.etat)}">
        <td>${sel('date', r.date, days.map(d => [d, dayLabel(d)]))}</td>
        <td><input type="text" data-k="zone" list="${listId}" value="${esc(zoneName(r.zone))}" spellcheck="false"${ro ? ' disabled' : ''}></td>
        <td>${sel('reseau', r.reseau || '', [['', t(T.tous)], ...O().NETWORKS.map(n => [n, n])])}</td>
        <td>${sel('etat', r.etat, O().ETATS.map(e => [e, t(ETAT[e])]))}</td>
        <td><input type="time" step="900" data-k="debut" value="${esc(r.debut)}"${ro ? ' disabled' : ''}></td>
        <td><input type="time" step="900" data-k="fin" value="${esc(r.fin === '24:00' ? '23:59' : r.fin)}"${ro ? ' disabled' : ''}></td>
        <td><input type="text" data-k="texte" value="${esc(r.texte || '')}"${ro ? ' disabled' : ''}></td>
        <td>${ro ? '' : `<button type="button" class="secondary" data-del title="${esc(t(T.retirer))}" aria-label="${esc(t(T.retirer))}">×</button>`}</td></tr>`;
      host.innerHTML = `${zonesNote ? `<p class="odv-act-note">${esc(zonesNote)}</p>` : ''}
        <datalist id="${listId}">${zones.map(z => `<option value="${esc(z.nom)}">${esc(`${z.type} · ${z.plancher || '?'} – ${z.plafond || '?'}`)}</option>`).join('')}</datalist>
        ${rows.length ? `<div class="odv-act-scroll"><table><thead><tr><th>${esc(t(T.jour))}</th><th>${esc(t(T.zone))}</th><th>${esc(t(T.reseau))}</th><th>${esc(t(T.etat))}</th><th>${esc(t(T.de))}</th><th>${esc(t(T.a))}</th><th>${esc(t(T.texte))}</th><th></th></tr></thead><tbody>${rows.map(line).join('')}</tbody></table></div>` : `<p class="odv-act-note">${esc(t(T.vide))}</p>`}
        ${ro ? '' : `<p class="row"><button type="button" class="secondary" data-add data-icon="plus">${esc(t(T.ajouter))}</button></p>`}`;
      window.AppFramework?.refresh?.(host);
    }

    function changed() {
      onChange?.(rows.map(r => ({
        ...r
      })));
      clearTimeout(timer);
      timer = setTimeout(save, 600);
    }
    async function save() {
      timer = 0;
      const r = await O().saveActivations(week, rows.filter(x => x.zone));
      if (r?.error) notify(tf(T.erreur, {
        e: r.error
      }), 'error');
      else if (r?.where === 'local') notify(t(T.local));
    }

    host.addEventListener('change', e => {
      const el = e.target,
        tr = el.closest('tr[data-i]');
      if (ro || !tr || !el.dataset.k) return;
      const r = rows[+tr.dataset.i],
        k = el.dataset.k;
      if (k === 'zone') {
        r.zone = zoneId(el.value);
        r.nom = zoneName(r.zone);
      } else if (k === 'fin') r.fin = el.value === '23:59' ? '24:00' : el.value;
      else if (k === 'reseau') r.reseau = el.value || null;
      else r[k] = el.value;
      if (k === 'etat') tr.dataset.etat = r.etat;
      changed();
    });
    host.addEventListener('click', e => {
      if (ro) return;
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-add')) {
        const last = rows[rows.length - 1],
          days = daysOf(week);
        rows.push({
          zone: '',
          nom: '',
          reseau: last?.reseau ?? null,
          etat: 'demandee',
          date: last?.date || days[0] || '',
          debut: last?.debut || '08:00',
          fin: last?.fin || '12:00',
          texte: ''
        });
        render();
        host.querySelector('tr[data-i]:last-child input[data-k=zone]')?.focus();
      } else if (b.hasAttribute('data-del')) {
        rows.splice(+b.closest('tr[data-i]').dataset.i, 1);
        render();
        changed();
      }
    });
    window.addEventListener('repository-language-change', () => host.isConnected && render());
    load();
    return {
      set({
        semaine: s,
        readOnly: r
      } = {}) {
        if (r !== undefined) ro = !!r;
        if (s && s !== week) {
          // retouche en attente : enregistrée dans sa semaine avant de changer
          const pending = timer;
          clearTimeout(timer);
          (pending ? save() : Promise.resolve()).then(() => {
            week = s;
            load();
          });
        } else render();
      },
      refresh: load,
      list: () => rows.map(r => ({
        ...r
      }))
    };
  }

  window.OdvActivationsEditor = {
    mount
  };
})();
