(() => {
  'use strict';
  // Appareils du reporting, sous la flotte connue (Paramètres › Centre › Flotte, shared/data_admin.js) : tous les
  // appareils qui volent dans le journal des missions (shared/mission_core/ledger.js, data/cr/missions.yaml : aircraft[]
  // de chaque CR), regroupés par immatriculation (type, variante, indicatifs, exploitant, vols, dernier vol).
  //   · case « personnel » : cochée = appareil individuel, hors de la flotte du SOG ; décochée = dans la flotte. La
  //     décocher ajoute l'appareil à la flotte (copie de travail de la page : « Enregistrer dans le dépôt » ensuite) ; la
  //     cocher l'en retire, il revient dans la liste des appareils individuels. Un appareil de la page Flotte du site y
  //     revient à la mise à jour quotidienne (le site l'emporte).
  //   · deux index tenus à jour : la flotte (data/references/aircraft_fleet.js) et les appareils individuels
  //     (data/references/aircraft_personal.js : appareils du reporting hors de la flotte, recalculés à chaque
  //     enregistrement de la flotte ; lus par le lanceur pour compléter les types d'aéronefs).
  //   · terrain (base) d'un appareil ajouté : laissé vide ; il ne change que par la mise à jour depuis le site ou un CR
  //     issu d'un ordre de mission avec un vrai terrain d'atterrissage.
  //   · « Rafraîchir types et performances » : types inconnus de la base (flotte et reporting) complétés par le lanceur
  //     (POST /__setup/aircraft-db, OACI Doc 8643 et EUROCONTROL, type par type) ; mise à jour de la flotte et du
  //     journal depuis le site (shared/defa_site.js).
  // Mon profil (rubrique « Mes appareils (reporting) ») : la même liste réduite aux CR où le trigramme connecté figure
  // dans l'équipage (l'appareil de son poste quand le CR le précise), en lecture seule : coche grisée « Flotte DEFA »
  // (cochée : appareil de la flotte ; décochée : appareil hors flotte, indicatif compris).
  // API (window.FleetReporting) : aircraft({ pilot }) → [{ key, registration, type, variant, callsigns, operator,
  //   flights, first, last }], mount(hôte, { rows: lignes de travail de la flotte, onChange }), mountMine(hôte),
  //   personalFile(render, lignes) → [chemin, texte].
  if (window.FleetReporting) return;
  const K = window.RepositoryKit,
    esc = K?.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)),
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const notify = (m, k) => window.AppFramework?.notify?.(m, k);
  /** Clé d'une immatriculation (sans tiret ni espace) ; forme affichée normalisée par le modèle des CR. */
  const keyOf = r => String(r || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const regOf = r => window.MissionModel?.formatRegistration?.(r) || String(r || '').toUpperCase().trim();
  const PERSONAL = 'data/references/aircraft_personal.js';
  const PERSONAL_COMMENT = ['Appareils individuels : appareils qui volent dans le reporting (journal des missions) et ne font pas partie',
    'de la flotte du SOG. Index recalculé par Paramètres › Centre › Flotte à chaque enregistrement de la flotte ;',
    'lu par le lanceur pour compléter la base des types d\'aéronefs. Colonnes : immatriculation, type OACI, variante,',
    'indicatifs, exploitant, vols, premier et dernier vol.'
  ];

  /** Le trigramme figure-t-il dans un nom d'équipage (« BRV », « BRV — Jean B. ») ? */
  const isTri = (name, tri) => new RegExp(`^${tri}(?![A-Z0-9])`).test(String(name || '').toUpperCase().trim());
  /** Appareils du journal des missions, regroupés par immatriculation (les sans immatriculation : par indicatif) ;
   *  pilot : seulement les CR où ce trigramme est dans l'équipage (l'appareil de son poste quand il est précisé). */
  async function aircraft({
    pilot = ''
  } = {}) {
    const tri = String(pilot || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const L = window.MissionLedger;
    if (!L) return [];
    try {
      await L.load();
    } catch {}
    const by = new Map();
    for (const m of L.store?.missions || []) {
      const date = String(m?.metadata?.date || '').slice(0, 10);
      let mine = null; // index des appareils du pilote (null : tous)
      if (tri) {
        const seats = (m?.crew || []).filter(c => isTri(c.name, tri));
        if (!seats.length) continue;
        mine = seats.some(c => !+c.aircraft) ? null : new Set(seats.map(c => +c.aircraft - 1));
      }
      (m?.aircraft || []).forEach((a, i) => {
        if (mine && !mine.has(i)) return;
        const reg = keyOf(a.registration),
          cs = String(a.callsign || '').toUpperCase().trim();
        if (!reg && !cs && !a.type) return;
        const key = reg || `?${cs || a.type}`;
        const x = by.get(key) || by.set(key, {
          key,
          registration: reg ? regOf(a.registration) : '',
          type: '',
          variant: '',
          callsigns: [],
          operator: '',
          flights: 0,
          first: '',
          last: ''
        }).get(key);
        x.flights++;
        // le plus récent l'emporte pour le type, la variante et l'exploitant
        if (!x.last || date >= x.last) {
          x.type = String(a.type || x.type || '').toUpperCase().trim();
          x.variant = a.variant || x.variant;
          x.operator = (i === 0 && m.organisation?.organisation) || a.operatorCode || x.operator;
        }
        if (cs && !x.callsigns.includes(cs)) x.callsigns.push(cs);
        if (date && (!x.first || date < x.first)) x.first = date;
        if (date && date > x.last) x.last = date;
      });
    }
    return [...by.values()].sort((a, b) => (b.last || '').localeCompare(a.last || '') || a.key.localeCompare(b.key));
  }
  /** Fichier des appareils individuels (reporting hors flotte), au format des fichiers de données. */
  async function personalFile(render, rows) {
    const fleet = new Set((rows || []).map(r => keyOf(r.registration)).filter(Boolean));
    const list = (await aircraft()).filter(a => !a.registration || !fleet.has(keyOf(a.registration))).map(({
      key,
      ...a
    }) => a);
    return [PERSONAL, render(PERSONAL_COMMENT, {
      rows: list
    }, 'dataOverride:personalAircraft:v1', 'window.DEFA_PERSONAL_AIRCRAFT = data.rows; window.DEFA_PERSONAL_AIRCRAFT_META = META;')];
  }

  // ---- types d'aéronefs : base OACI (AircraftDB/aircraft_db.js) et alias (H145 → EC45…)
  const alias = code => {
    const k = String(code || '').toUpperCase().trim();
    return window.AIRCRAFT_DB?.__aliases?.[k] || k;
  };
  const known = code => {
    const db = window.AIRCRAFT_DB || {};
    return !!(db[alias(code)] || db[String(code || '').toUpperCase().trim()]);
  };
  const acApi = (body = null) => fetch('/__setup/aircraft-db', {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-SOG-Setup': '1',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  }).then(r => r.ok ? r.json() : null).catch(() => null);

  function style() {
    if (document.getElementById('fleetReportingCss')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="fleetReportingCss">@layer app{.fr-rep{margin-top:18px}.fr-rep table{border-collapse:collapse;width:100%;font-size:12px}.fr-rep th,.fr-rep td{padding:3px 7px;text-align:left;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}.fr-rep td.num{text-align:right}.fr-rep tr.fr-fleet td{opacity:.75}.fr-rep .fr-scroll{max-width:100%;overflow-x:auto}.fr-rep .fr-unknown{color:#b45309;font-weight:650}.fr-rep .fr-note{font-size:12px;opacity:.8;margin:4px 0}}</style>`);
  }

  /** Bloc sous la flotte : appareils du reporting, case « personnel », types et mise à jour depuis le site. */
  function mount(host, {
    rows,
    onChange = () => {}
  }) {
    style();
    host.classList.add('fr-rep');
    let list = [],
      acTimer = 0;
    const inFleet = a => !!a.registration && rows.some(r => keyOf(r.registration) === keyOf(a.registration));
    const when = at => at ? new Date(at).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    }) : '';

    async function siteLine() {
      const el = host.querySelector('[data-fr-site]');
      if (!el) return;
      for (let i = 0; i < 20 && !window.DefaSite; i++) await new Promise(r => setTimeout(r, 100));
      const D = window.DefaSite,
        s = D ? await D.status() : null;
      if (!s) {
        el.innerHTML = esc(t(['Mise à jour depuis le site : lanceur absent — « Coller la page Flotte du site… » ci-dessus.', 'Update from the website: no launcher — “Paste the website Fleet page…” above.', 'Aktualisierung von der Website: kein Starter — „Flotte-Seite der Website einfügen…“ oben.', 'Actualización desde el sitio: sin lanzador — «Pegar la página Flota del sitio…» arriba.']));
        return;
      }
      const page = (p, def) => {
        const r = s.pages?.[p];
        return `${esc(t(def.name))} : ${r ? `${r.ok ? '✓' : '✗'} ${esc(when(r.at))} — ${esc(String(r.message || '').trim().split('\n')[0])}` : esc(t(['jamais', 'never', 'nie', 'nunca']))}`;
      };
      el.innerHTML = `${esc(t(['Depuis le site (pages publiques Flotte et Log des vols)', 'From the website (public Fleet and Flight log pages)', 'Von der Website (öffentliche Seiten Flotte und Flugbuch)', 'Desde el sitio (páginas públicas Flota y Diario de vuelos)']))} — ${Object.entries(D.PAGES).map(([p, def]) => page(p, def)).join(' · ')}
        <label><input type="checkbox" data-fr-auto${s.auto ? ' checked' : ''}> ${esc(t(['automatique, une fois par jour', 'automatic, once a day', 'automatisch, einmal am Tag', 'automático, una vez al día']))}</label>
        <button type="button" class="secondary" data-fr-now data-icon="download">${esc(t(['Mettre à jour maintenant', 'Update now', 'Jetzt aktualisieren', 'Actualizar ahora']))}</button>`;
      el.querySelector('[data-fr-auto]').onchange = async e => {
        await D.setAuto(e.target.checked);
        siteLine();
      };
      el.querySelector('[data-fr-now]').onclick = async e => {
        e.currentTarget.disabled = true;
        const r = await D.refresh({
          force: true
        });
        if (r?.busy) notify(t(['Une mise à jour depuis le site est déjà en cours.', 'An update from the website is already running.', 'Eine Aktualisierung von der Website läuft bereits.', 'Ya hay una actualización desde el sitio en curso.']), 'info');
        else if (r?.error) notify(r.error, 'error');
        siteLine();
      };
    }

    async function typesLine() {
      const el = host.querySelector('[data-fr-types]');
      if (!el?.isConnected) return;
      clearTimeout(acTimer);
      const codes = [...new Set([...rows.map(r => r.type), ...list.map(a => a.type)].map(c => String(c || '').toUpperCase().trim()).filter(c => /^[A-Z0-9]{2,4}$/.test(c)))],
        unknown = codes.filter(c => !known(c));
      const s = await acApi();
      const running = s?.state === 'running',
        fresh = s?.state === 'done' && s.ended && s.ended * 1000 > performance.timeOrigin;
      el.innerHTML = `${esc(tf(['Types d’aéronefs : {n} connus sur {m}', 'Aircraft types: {n} known out of {m}', 'Luftfahrzeugtypen: {n} von {m} bekannt', 'Tipos de aeronave: {n} conocidos de {m}'], { n: codes.length - unknown.length, m: codes.length }))}${unknown.length ? ` — <span class="fr-unknown">${esc(tf(['inconnus : {l}', 'unknown: {l}', 'unbekannt: {l}', 'desconocidos: {l}'], { l: unknown.join(' ') }))}</span>` : ''}
        ${!s ? ` — ${esc(t(['lanceur absent', 'no launcher', 'kein Starter', 'sin lanzador']))}` : running ? ` — ${esc(tf(['passe en cours : {s}', 'pass running: {s}', 'Durchlauf läuft: {s}', 'pasada en curso: {s}'], { s: s.step || '' }))}` : `<button type="button" class="secondary" data-fr-types-go data-icon="refresh"${unknown.length ? '' : ' title="' + esc(t(['tous les types sont connus : leurs fiches sont relues', 'all types are known: their records are re-read', 'alle Typen bekannt: ihre Einträge werden neu gelesen', 'todos los tipos son conocidos: se releen sus fichas'])) + '"'}>${esc(tf(['Rafraîchir types et performances ({n})', 'Refresh types and performance ({n})', 'Typen und Leistungen aktualisieren ({n})', 'Actualizar tipos y rendimientos ({n})'], { n: (unknown.length ? unknown : codes).length }))}</button>`}
        ${fresh ? ` <button type="button" class="secondary" data-fr-reload data-icon="refresh">${esc(t(['Recharger la page pour lire la base', 'Reload the page to read the database', 'Seite neu laden, um die Datenbank zu lesen', 'Recargar la página para leer la base']))}</button>` : ''}`;
      el.querySelector('[data-fr-types-go]')?.addEventListener('click', async () => {
        await acApi({
          codes: (unknown.length ? unknown : codes).slice(0, 200)
        });
        typesLine();
      });
      el.querySelector('[data-fr-reload]')?.addEventListener('click', () => location.reload());
      if (running) acTimer = setTimeout(typesLine, 5000);
    }

    function draw() {
      const personal = list.filter(a => !inFleet(a)),
        fleet = list.filter(a => inFleet(a));
      const row = a => {
        const f = inFleet(a);
        return `<tr class="${f ? 'fr-fleet' : ''}" data-k="${esc(a.key)}"><td><input type="checkbox" data-fr-personal${f ? '' : ' checked'}${a.registration ? '' : ' disabled'} title="${esc(a.registration ? t(['Coché : appareil individuel, hors de la flotte du SOG ; décoché : dans la flotte', 'Ticked: individual aircraft, outside the SOG fleet; unticked: in the fleet', 'Angehakt: einzelnes Luftfahrzeug, außerhalb der SOG-Flotte; nicht angehakt: in der Flotte', 'Marcado: aeronave individual, fuera de la flota del SOG; desmarcado: en la flota']) : t(['immatriculation inconnue : ne peut pas entrer dans la flotte', 'registration unknown: cannot enter the fleet', 'Kennzeichen unbekannt: kann nicht in die Flotte', 'matrícula desconocida: no puede entrar en la flota']))}"></td>
          <td><b>${esc(a.registration || '—')}</b></td><td${a.type && !known(a.type) ? ' class="fr-unknown" title="' + esc(t(['type inconnu de la base', 'type unknown in the database', 'Typ in der Datenbank unbekannt', 'tipo desconocido en la base'])) + '"' : ''}>${esc(a.type || '?')}</td><td>${esc(a.variant || '')}</td><td>${esc(a.callsigns.join(', '))}</td><td>${esc(a.operator || '')}</td><td class="num">${a.flights}</td><td>${esc(a.last || '')}</td></tr>`;
      };
      const head = `<thead><tr><th>${esc(t(['Personnel', 'Personal', 'Privat', 'Personal']))}</th><th>${esc(t(['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula']))}</th><th>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}</th><th>${esc(t(['Variante', 'Variant', 'Variante', 'Variante']))}</th><th>${esc(t(['Indicatifs', 'Callsigns', 'Rufzeichen', 'Indicativos']))}</th><th>${esc(t(['Exploitant', 'Operator', 'Betreiber', 'Operador']))}</th><th>${esc(t(['Vols', 'Flights', 'Flüge', 'Vuelos']))}</th><th>${esc(t(['Dernier vol', 'Last flight', 'Letzter Flug', 'Último vuelo']))}</th></tr></thead>`;
      host.innerHTML = `<h3>${esc(t(['Appareils du reporting', 'Aircraft in the reporting', 'Luftfahrzeuge im Reporting', 'Aeronaves del reporting']))}</h3>
        <p class="fr-note">${esc(tf(['{p} appareil(s) individuel(s) (hors flotte) et {f} de la flotte ont volé dans le journal des missions. « Personnel » décoché : l’appareil entre dans la flotte ci-dessus ; coché : il en sort. Puis « Enregistrer dans le dépôt » (la liste des appareils individuels est enregistrée avec la flotte).', '{p} individual aircraft (outside the fleet) and {f} from the fleet flew in the mission log. “Personal” unticked: the aircraft joins the fleet above; ticked: it leaves it. Then “Save to repository” (the individual aircraft list is saved with the fleet).', '{p} einzelne Luftfahrzeug(e) (außerhalb der Flotte) und {f} der Flotte sind im Missionsjournal geflogen. „Privat“ nicht angehakt: das Luftfahrzeug kommt in die Flotte oben; angehakt: es verlässt sie. Dann „Im Repository speichern“ (die Liste der einzelnen Luftfahrzeuge wird mit der Flotte gespeichert).', '{p} aeronave(s) individual(es) (fuera de la flota) y {f} de la flota volaron en el diario de misiones. «Personal» desmarcado: la aeronave entra en la flota de arriba; marcado: sale de ella. Luego «Guardar en el repositorio» (la lista de aeronaves individuales se guarda con la flota).'], { p: personal.length, f: fleet.length }))}</p>
        <p class="fr-note row" data-fr-types></p>
        <p class="fr-note row" data-fr-site></p>
        ${list.length ? `<div class="fr-scroll"><table>${head}<tbody>${[...personal, ...fleet].map(row).join('')}</tbody></table></div>` : `<p class="fr-note">${esc(window.MissionLedger ? t(['Aucun appareil dans le journal des missions.', 'No aircraft in the mission log.', 'Kein Luftfahrzeug im Missionsjournal.', 'Ninguna aeronave en el diario de misiones.']) : t(['Journal des missions indisponible sur cette page.', 'Mission log unavailable on this page.', 'Missionsjournal auf dieser Seite nicht verfügbar.', 'Diario de misiones no disponible en esta página.']))}</p>`}`;
      host.querySelectorAll('[data-fr-personal]').forEach(box => box.onchange = () => {
        const a = list.find(x => x.key === box.closest('tr').dataset.k);
        if (!a?.registration) return;
        const i = rows.findIndex(r => keyOf(r.registration) === keyOf(a.registration));
        if (!box.checked && i < 0) rows.push({
          operator: a.operator || '',
          type: a.type || '',
          variant: a.variant || '',
          registration: a.registration,
          tacticalNumber: '',
          number: '',
          callsigns: [...a.callsigns],
          base: '', // terrain : mise à jour depuis le site ou CR issu d'un ordre de mission
          operational: true
        });
        else if (box.checked && i >= 0) rows.splice(i, 1);
        onChange();
      });
      typesLine();
      siteLine();
      window.AppFramework?.refresh?.(host);
    }
    host.innerHTML = `<p class="fr-note">${esc(t(['Lecture du journal des missions…', 'Reading the mission log…', 'Missionsjournal wird gelesen…', 'Leyendo el diario de misiones…']))}</p>`;
    aircraft().then(l => {
      list = l;
      if (host.isConnected) draw();
    });
    return {
      redraw: () => list && draw()
    };
  }

  /** Mon profil : appareils pilotés ou reportés par le trigramme connecté, coche grisée « Flotte DEFA ». */
  async function mountMine(host) {
    style();
    host.classList.add('fr-rep');
    const tri = window.SuiteUsers?.effective?.() || window.MissionAssignments?.trigram?.() || '';
    if (!tri) {
      host.innerHTML = `<p class="fr-note">${esc(t(['Trigramme non réglé (Identité, ci-dessus) : la liste des appareils ne peut pas être établie.', 'Trigram not set (Identity, above): the aircraft list cannot be built.', 'Kürzel nicht eingestellt (Identität, oben): Die Liste der Luftfahrzeuge kann nicht erstellt werden.', 'Trigrama no definido (Identidad, arriba): no se puede establecer la lista de aeronaves.']))}</p>`;
      return;
    }
    host.innerHTML = `<p class="fr-note">${esc(t(['Lecture du journal des missions…', 'Reading the mission log…', 'Missionsjournal wird gelesen…', 'Leyendo el diario de misiones…']))}</p>`;
    const list = await aircraft({
      pilot: tri
    });
    const fleet = new Set((window.DEFA_FLEET || []).map(r => keyOf(r.registration)).filter(Boolean));
    const isFleet = a => !!a.registration && fleet.has(keyOf(a.registration));
    const head = `<thead><tr><th>${esc(t(['Flotte DEFA', 'DEFA fleet', 'DEFA-Flotte', 'Flota DEFA']))}</th><th>${esc(t(['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula']))}</th><th>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}</th><th>${esc(t(['Variante', 'Variant', 'Variante', 'Variante']))}</th><th>${esc(t(['Indicatifs', 'Callsigns', 'Rufzeichen', 'Indicativos']))}</th><th>${esc(t(['Exploitant', 'Operator', 'Betreiber', 'Operador']))}</th><th>${esc(t(['Vols', 'Flights', 'Flüge', 'Vuelos']))}</th><th>${esc(t(['Dernier vol', 'Last flight', 'Letzter Flug', 'Último vuelo']))}</th></tr></thead>`;
    const row = a => `<tr><td><input type="checkbox" disabled${isFleet(a) ? ' checked' : ''} title="${esc(isFleet(a) ? t(['appareil de la flotte DEFA', 'DEFA fleet aircraft', 'Luftfahrzeug der DEFA-Flotte', 'aeronave de la flota DEFA']) : t(['appareil hors flotte DEFA', 'aircraft outside the DEFA fleet', 'Luftfahrzeug außerhalb der DEFA-Flotte', 'aeronave fuera de la flota DEFA']))}"></td><td><b>${esc(a.registration || '—')}</b></td><td>${esc(a.type || '?')}</td><td>${esc(a.variant || '')}</td><td>${esc(a.callsigns.join(', '))}</td><td>${esc(a.operator || '')}</td><td class="num">${a.flights}</td><td>${esc(a.last || '')}</td></tr>`;
    const n = list.filter(isFleet).length;
    host.innerHTML = `<p class="fr-note">${esc(tf(['{t} : {a} appareil(s) dans vos CR — {f} de la flotte DEFA, {o} hors flotte. La liste complète et la case « personnel » : Paramètres › Centre › Flotte.', '{t}: {a} aircraft in your reports — {f} from the DEFA fleet, {o} outside it. Full list and “personal” box: Settings › Centre › Fleet.', '{t}: {a} Luftfahrzeug(e) in Ihren Berichten — {f} aus der DEFA-Flotte, {o} außerhalb. Vollständige Liste und Kästchen „Privat“: Einstellungen › Zentrum › Flotte.', '{t}: {a} aeronave(s) en sus informes — {f} de la flota DEFA, {o} fuera de ella. Lista completa y casilla «personal»: Ajustes › Centro › Flota.'], { t: tri, a: list.length, f: n, o: list.length - n }))}</p>
      ${list.length ? `<div class="fr-scroll"><table>${head}<tbody>${list.map(row).join('')}</tbody></table></div>` : `<p class="fr-note">${esc(t(['Aucun CR avec votre trigramme dans l’équipage.', 'No report with your trigram in the crew.', 'Kein Bericht mit Ihrem Kürzel in der Besatzung.', 'Ningún informe con su trigrama en la tripulación.']))}</p>`}`;
    window.AppFramework?.refresh?.(host);
  }

  window.FleetReporting = {
    aircraft,
    mount,
    mountMine,
    personalFile
  };
  // rubrique de Mon profil (page chargée avec shared/settings_panels.js)
  window.SettingsPanels?.add({
    id: 'myAircraft',
    group: window.SettingsPanels.L('Mon profil', 'My profile', 'Mein Profil', 'Mi perfil'),
    title: window.SettingsPanels.L('Mes appareils (reporting)', 'My aircraft (reporting)', 'Meine Luftfahrzeuge (Reporting)', 'Mis aeronaves (reporting)'),
    intro: window.SettingsPanels.L('Appareils que vous avez pilotés ou reportés (CR où votre trigramme figure dans l’équipage) ; coche grisée : appareil de la flotte DEFA ou non.', 'Aircraft you flew or reported (reports with your trigram in the crew); greyed box: DEFA fleet aircraft or not.', 'Luftfahrzeuge, die Sie geflogen oder berichtet haben (Berichte mit Ihrem Kürzel in der Besatzung); grau: Luftfahrzeug der DEFA-Flotte oder nicht.', 'Aeronaves que ha pilotado o reportado (informes con su trigrama en la tripulación); casilla gris: aeronave de la flota DEFA o no.'),
    render(body) {
      mountMine(body);
    }
  });
})();
