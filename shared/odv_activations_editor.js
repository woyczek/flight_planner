(() => {
  'use strict';
  // Saisie des activations de zones par réseau (RTBA, R, D, TRA…), pour les ordres de vols : une ligne par zone, réseau
  // et plage (UTC) d'un jour de la semaine, avec son état (active, demandée, refusée). Lecture et écriture par
  // OdvAirspace (shared/odv_airspace.js : data/atc/activations/<AAAA>-W<nn>.json, pool synchronisé). Chaque retouche
  // est enregistrée (600 ms après la dernière) ; avertissements en notifications flottantes (AppFramework.notify).
  // Zones proposées : espaces activables de la base aéronautique (OdvAirspace.zones) ; une zone inconnue de la base reste
  // saisissable (nom libre).
  // Une colonne par réseau (VATSIM, IVAO), côte à côte : saisies à la main du réseau (une activation « les deux » paraît
  // dans les deux colonnes, ses deux copies tenues ensemble), activations importées repliées, boutons du réseau. VATSIM
  // ne publie pas d'activations : saisie à la main seulement ; IVAO : import (OdvAirspace.importIvao, le même pour
  // toutes les pages qui montent cet éditeur).
  // « Importer d'IVAO » reprend aussi les sessions ATC IVAO de la semaine (trainings, examens, réservations :
  // SuiteAtc.importNetwork, shared/atc_sessions.js chargé au besoin).
  // API (window.OdvActivationsEditor) : mount(hôte, { semaine, readOnly = false, onChange(liste), onImport({ activations,
  //   sessions }) }) → { set({ semaine, readOnly }), refresh(), list() }.
  if (window.OdvActivationsEditor) return;
  const K = window.RepositoryKit,
    esc = K?.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)),
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const O = () => window.OdvAirspace;
  const SRC = document.currentScript?.src || '';
  /** SuiteAtc (shared/atc_sessions.js), chargé au besoin à côté de ce fichier. */
  async function suiteAtc() {
    if (window.SuiteAtc || !SRC) return window.SuiteAtc;
    await new Promise(res => {
      const sc = document.createElement('script');
      sc.src = new URL('atc_sessions.js', SRC).href;
      sc.onload = sc.onerror = res;
      document.head.append(sc);
    });
    return window.SuiteAtc;
  }
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
    erreur: ['Activations non enregistrées : {e}', 'Activations not saved: {e}', 'Aktivierungen nicht gespeichert: {e}', 'Activaciones no guardadas: {e}'],
    ivao: ['Importer d’IVAO', 'Import from IVAO', 'Von IVAO importieren', 'Importar de IVAO'],
    ivaoTitre: ['Zones spéciales de France actives cette semaine sur IVAO (horaires publiés, dont le RTBA, et NOTAM) : remplacent l’import précédent ; les saisies à la main restent. Lanceur et clé d’API IVAO requis.', 'French special areas active this week on IVAO (published schedules, RTBA included, and NOTAMs): replace the previous import; manual entries stay. Launcher and IVAO API key required.', 'Auf IVAO diese Woche aktive französische Sondergebiete (veröffentlichte Zeiten, inkl. RTBA, und NOTAM): ersetzen den vorigen Import; manuelle Einträge bleiben. Starter und IVAO-API-Schlüssel nötig.', 'Zonas especiales de Francia activas esta semana en IVAO (horarios publicados, RTBA incluido, y NOTAM): sustituyen la importación anterior; las entradas manuales se conservan. Requiere el lanzador y la clave de API de IVAO.'],
    ivaoOk: ['{n} activation(s) IVAO importée(s).', '{n} IVAO activation(s) imported.', '{n} IVAO-Aktivierung(en) importiert.', '{n} activación(es) IVAO importada(s).'],
    atcOk: ['{n} session(s) ATC IVAO (trainings, examens, réservations) importée(s).', '{n} IVAO ATC session(s) (trainings, exams, bookings) imported.', '{n} IVAO-ATC-Sitzung(en) (Trainings, Prüfungen, Buchungen) importiert.', '{n} sesión(es) ATC IVAO (entrenamientos, exámenes, reservas) importada(s).'],
    atcErr: ['Sessions ATC IVAO non importées : {e}', 'IVAO ATC sessions not imported: {e}', 'IVAO-ATC-Sitzungen nicht importiert: {e}', 'Sesiones ATC IVAO no importadas: {e}'],
    ivaoErr: ['Import IVAO impossible : {e}', 'IVAO import failed: {e}', 'IVAO-Import fehlgeschlagen: {e}', 'Importación IVAO imposible: {e}'],
    ivaoListe: ['{n} activation(s) importée(s) d’IVAO (remplacées au prochain import)', '{n} activation(s) imported from IVAO (replaced at the next import)', '{n} von IVAO importierte Aktivierung(en) (beim nächsten Import ersetzt)', '{n} activación(es) importada(s) de IVAO (sustituidas en la próxima importación)'],
    videNet: ['Aucune activation saisie pour {r} cette semaine.', 'No activation entered for {r} this week.', 'Keine Aktivierung für {r} diese Woche erfasst.', 'Ninguna activación introducida para {r} esta semana.'],
    vatsimNote: ['VATSIM ne publie pas d’activations : saisie à la main.', 'VATSIM does not publish activations: entered by hand.', 'VATSIM veröffentlicht keine Aktivierungen: manuelle Eingabe.', 'VATSIM no publica activaciones: introducción manual.'],
    deux: ['les deux réseaux', 'both networks', 'beide Netze', 'ambas redes']
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
    s.textContent = `@layer app{.odv-act table{border-collapse:collapse;width:100%}.odv-act th,.odv-act td{padding:3px 5px;text-align:left;vertical-align:middle}.odv-act th{font-size:12px;font-weight:650}.odv-act input[type=text]{width:100%;min-width:7em}.odv-act input[type=time]{width:6.5em}.odv-act .odv-act-scroll{max-width:100%;overflow-x:auto}.odv-act tr[data-etat=active] td:first-child{box-shadow:inset 3px 0 #2e9d4f}.odv-act tr[data-etat=demandee] td:first-child{box-shadow:inset 3px 0 #e39b1b}.odv-act tr[data-etat=refusee] td:first-child{box-shadow:inset 3px 0 #b91c1c}.odv-act .odv-act-note{font-size:12px;opacity:.8;margin:4px 0}.odv-act .odv-act-ivao summary{cursor:pointer;font-size:13px;margin:6px 0}.odv-act .odv-act-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,30em),1fr));gap:12px 18px;align-items:start}.odv-act .odv-act-net{min-width:0}.odv-act .odv-act-net>h4{margin:4px 0 6px;font-size:14px;letter-spacing:.04em}.odv-act tr[data-both] td:first-child{background-image:linear-gradient(90deg,color-mix(in srgb,currentColor 8%,transparent),transparent)}}`;
    document.head.append(s);
  }

  function mount(host, {
    semaine = '',
    readOnly = false,
    onChange = null,
    onImport = null
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

    /** Activation importée (fichier d'un réseau, remplacée à chaque import) : pas de retouche à la main. */
    const imported = r => !!r.source && r.source !== 'saisie';
    const byTime = (a, b) => `${a.date} ${a.debut} ${a.nom}`.localeCompare(`${b.date} ${b.debut} ${b.nom}`);

    function render() {
      const days = daysOf(week);
      const head = [T.jour, T.zone, T.etat, T.de, T.a, T.texte, T.reseau].map(x => `<th>${esc(t(x))}</th>`).join('');
      const sel = (name, value, opts) => `<select data-k="${name}"${ro ? ' disabled' : ''}>${opts.map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      const line = (r, i) => `<tr data-i="${i}" data-etat="${esc(r.etat)}"${r.reseau ? '' : ` data-both title="${esc(t(T.deux))}"`}>
        <td>${sel('date', r.date, days.map(d => [d, dayLabel(d)]))}</td>
        <td><input type="text" data-k="zone" list="${listId}" value="${esc(zoneName(r.zone))}" spellcheck="false"${ro ? ' disabled' : ''}></td>
        <td>${sel('etat', r.etat, O().ETATS.map(e => [e, t(ETAT[e])]))}</td>
        <td><input type="time" step="900" data-k="debut" value="${esc(r.debut)}"${ro ? ' disabled' : ''}></td>
        <td><input type="time" step="900" data-k="fin" value="${esc(r.fin === '24:00' ? '23:59' : r.fin)}"${ro ? ' disabled' : ''}></td>
        <td><input type="text" data-k="texte" value="${esc(r.texte || '')}"${ro ? ' disabled' : ''}></td>
        <td>${sel('reseau', r.reseau || '', [...O().NETWORKS.map(n => [n, n]), ['', t(T.tous)]])}</td>
        <td>${ro ? '' : `<button type="button" class="secondary" data-del title="${esc(t(T.retirer))}" aria-label="${esc(t(T.retirer))}">×</button>`}</td></tr>`;
      // une colonne par réseau : saisies du réseau (et « les deux »), importées repliées, boutons du réseau
      const column = net => {
        const mine = rows.map((r, i) => [r, i]).filter(([r]) => !imported(r) && (!r.reseau || r.reseau === net)),
          got = rows.filter(r => imported(r) && r.reseau === net).sort(byTime);
        const ivao = net === 'IVAO';
        return `<section class="odv-act-net" data-net="${esc(net)}"><h4>${esc(net)}</h4>
          ${ivao ? '' : `<p class="odv-act-note">${esc(t(T.vatsimNote))}</p>`}
          ${mine.length ? `<div class="odv-act-scroll"><table><thead><tr>${head}<th></th></tr></thead><tbody>${mine.map(([r, i]) => line(r, i)).join('')}</tbody></table></div>` : `<p class="odv-act-note">${esc(tf(T.videNet, { r: net }))}</p>`}
          ${got.length ? `<details class="odv-act-ivao"><summary>${esc(tf(T.ivaoListe, { n: got.length }))}</summary><div class="odv-act-scroll"><table><thead><tr>${head}</tr></thead><tbody>${got.map(r => `<tr data-etat="${esc(r.etat)}"><td>${esc(dayLabel(r.date))}</td><td>${esc(zoneName(r.zone))}</td><td>${esc(t(ETAT[r.etat] || [r.etat]))}</td><td>${esc(r.debut)}</td><td>${esc(r.fin)}</td><td>${esc(r.texte || '')}</td><td>${esc(r.reseau)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
          ${ro ? '' : `<p class="row"><button type="button" class="secondary" data-add="${esc(net)}" data-icon="plus">${esc(t(T.ajouter))}</button>${ivao ? ` <button type="button" class="secondary" data-ivao data-icon="download" title="${esc(t(T.ivaoTitre))}">${esc(t(T.ivao))}</button>` : ''}</p>`}
        </section>`;
      };
      host.innerHTML = `${zonesNote ? `<p class="odv-act-note">${esc(zonesNote)}</p>` : ''}
        <datalist id="${listId}">${zones.map(z => `<option value="${esc(z.nom)}">${esc(`${z.type} · ${z.plancher || '?'} – ${z.plafond || '?'}`)}</option>`).join('')}</datalist>
        <div class="odv-act-cols">${O().NETWORKS.map(column).join('')}</div>`;
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
      // gardées dans ce navigateur (where « local ») : enregistrées quand même, alerte et raison données par writeData
      if (r?.error && r.where !== 'local') notify(tf(T.erreur, {
        e: r.error?.message || r.error
      }), 'error');
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
      if (k === 'reseau') render(); // la ligne change de colonne
      else host.querySelectorAll(`tr[data-i="${tr.dataset.i}"]`).forEach(x => {
        if (x === tr) return;
        const twin = x.querySelector(`[data-k="${k}"]`);
        if (twin) twin.value = el.value;
        x.dataset.etat = r.etat;
      });
      changed();
    });
    host.addEventListener('click', e => {
      if (ro) return;
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-ivao')) {
        b.disabled = true;
        (async () => {
          // retouche en attente enregistrée avant l'import (qui relit le fichier)
          if (timer) {
            clearTimeout(timer);
            await save();
          }
          // activations (zones) et sessions ATC (trainings, examens, réservations) : les deux imports communs
          const S = await suiteAtc();
          const [r, a] = await Promise.all([O().importIvao(week), S ? S.importNetwork(week, 'IVAO') : Promise.resolve({
            error: 'shared/atc_sessions.js'
          })]);
          if (r.error) notify(tf(T.ivaoErr, {
            e: r.error
          }), 'error');
          else notify(tf(T.ivaoOk, {
            n: r.ajoutees
          }), 'ok');
          if (a.error) notify(tf(T.atcErr, {
            e: a.error
          }), 'error');
          else if (a.where === 'folder') notify(tf(T.atcOk, {
            n: a.n
          }), 'ok');
          b.disabled = false;
          await load();
          onChange?.(rows.map(x => ({
            ...x
          })));
          onImport?.({
            activations: r,
            sessions: a
          });
        })();
      } else if (b.hasAttribute('data-add')) {
        const net = b.dataset.add || null,
          last = [...rows].reverse().find(r => !imported(r) && r.reseau === net),
          days = daysOf(week);
        rows.push({
          zone: '',
          nom: '',
          reseau: net,
          etat: 'demandee',
          date: last?.date || days[0] || '',
          debut: last?.debut || '08:00',
          fin: last?.fin || '12:00',
          texte: ''
        });
        render();
        host.querySelector(`.odv-act-net[data-net="${net}"] tr[data-i="${rows.length - 1}"] input[data-k=zone]`)?.focus();
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
