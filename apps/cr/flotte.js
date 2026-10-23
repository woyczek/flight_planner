(() => {
  'use strict';
  // Compte rendu › Flotte (apps/cr/flotte.html) : la flotte connue pour tous, en lecture seule — carte des appareils à
  // leur terrain actuel (shared/fleet_map.js : survol, sélection, filtres de l'en-tête) et tableau des appareils retenus
  // par les filtres :
  //   · survol d'une rangée : position de l'appareil surlignée sur la carte ; clic : appareil sélectionné et carte
  //     centrée sur son terrain (Ctrl / Maj / ⌘ + clic : ajoute ou retire) ; sélection de la carte : rangées surlignées ;
  //   · tri par colonne (clic sur l'en-tête) ; immatriculation : lien vers la fiche appareil ;
  //   · mode mobile (shared/mobile.css) : une carte par appareil (table.m-cards, libellés data-label), appui : sélection,
  //     carte de la flotte centrée et remontée à l'écran ;
  //   · Centre activé dans ce navigateur : lien « Modifier la flotte » (Paramètres › Centre › Flotte, tableau éditable).
  // Textes composés ici dans la langue courante (K.t / K.tf), refaits au changement de langue.
  // API (window.FleetPage) : mount(élément main).
  if (window.FleetPage) return;
  const K = window.RepositoryKit,
    esc = K.esc,
    t = K.t,
    tf = K.tf;
  const TX = {
    title: ['Flotte', 'Fleet', 'Flotte', 'Flota'],
    subtitle: ['{SOG_NOM} — où sont les appareils de la flotte : carte, filtres, dernier vol',
      '{SOG_NOM} — where the fleet aircraft are: map, filters, last flight',
      '{SOG_NOM} — wo die Luftfahrzeuge der Flotte stehen: Karte, Filter, letzter Flug',
      '{SOG_NOM} — dónde están las aeronaves de la flota: mapa, filtros, último vuelo'
    ],
    table: ['Appareils de la flotte', 'Fleet aircraft', 'Luftfahrzeuge der Flotte', 'Aeronaves de la flota'],
    count: ['{n} appareils (filtres de la carte)', '{n} aircraft (map filters)', '{n} Luftfahrzeuge (Kartenfilter)',
      '{n} aeronaves (filtros del mapa)'
    ],
    countOne: ['1 appareil (filtres de la carte)', '1 aircraft (map filters)', '1 Luftfahrzeug (Kartenfilter)',
      '1 aeronave (filtros del mapa)'
    ],
    empty: ['Aucun appareil : flotte vide, ou filtres trop restrictifs.', 'No aircraft: empty fleet, or filters too narrow.',
      'Kein Luftfahrzeug: Flotte leer oder Filter zu eng.', 'Ninguna aeronave: flota vacía o filtros demasiado estrictos.'
    ],
    rowTip: ['Survol : position sur la carte · clic : sélectionner et centrer la carte · Ctrl / Maj + clic : ajouter ou retirer',
      'Hover: position on the map · click: select and centre the map · Ctrl / Shift + click: add or remove',
      'Überfahren: Position auf der Karte · Klick: auswählen und Karte zentrieren · Strg / Umschalt + Klick: hinzufügen oder entfernen',
      'Pasar el ratón: posición en el mapa · clic: seleccionar y centrar el mapa · Ctrl / Mayús + clic: añadir o quitar'
    ],
    edit: ['Modifier la flotte', 'Edit the fleet', 'Flotte bearbeiten', 'Modificar la flota'],
    editTip: ['Paramètres › Centre › Flotte : tableau éditable de la flotte (Centre)',
      'Settings › Centre › Fleet: editable fleet table (Centre)',
      'Einstellungen › Zentrum › Flotte: bearbeitbare Flottentabelle (Zentrum)',
      'Ajustes › Centro › Flota: tabla editable de la flota (Centro)'
    ],
    sheet: ['Fiche appareil', 'Aircraft sheet', 'Luftfahrzeugblatt', 'Ficha de la aeronave'],
    registration: ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
    type: ['Type', 'Type', 'Typ', 'Tipo'],
    variant: ['Variante', 'Variant', 'Variante', 'Variante'],
    callsigns: ['Indicatifs', 'Callsigns', 'Rufzeichen', 'Indicativos'],
    operator: ['Opérateur', 'Operator', 'Betreiber', 'Operador'],
    ad: ['Terrain actuel', 'Current aerodrome', 'Aktueller Flugplatz', 'Aeródromo actual'],
    base: ['Terrain de base', 'Home base', 'Heimatbasis', 'Base'],
    last: ['Dernier vol', 'Last flight', 'Letzter Flug', 'Último vuelo'],
    status: ['Statut', 'Status', 'Status', 'Estado'],
    operational: ['opérationnel', 'operational', 'einsatzbereit', 'operativo'],
    notOperational: ['non opérationnel', 'not operational', 'nicht einsatzbereit', 'no operativo'],
    srcSite: ['site', 'website', 'Website', 'sitio'],
    srcOm: ['ordre de mission', 'mission order', 'Einsatzbefehl', 'orden de misión'],
    srcBase: ['base', 'base', 'Basis', 'base'],
    srcTip: ['Origine de la position', 'Origin of the position', 'Herkunft der Position', 'Origen de la posición']
  };
  const COLS = ['registration', 'type', 'variant', 'callsigns', 'operator', 'ad', 'base', 'last', 'status'];

  /** Construit la page dans root : en-tête, lien du Centre, carte, tableau des appareils retenus par les filtres. */
  function mount(root) {
    const F = window.FleetMap;
    root.innerHTML = `<p class="fp-centre" data-fp="centre" hidden><a class="secondary mc-button" data-icon="edit"></a></p>
      <div data-fp="map"></div>
      <section class="fp-block" data-block-id="fleetTable" data-icon="list"><h2 data-fp="ttitle"></h2><p class="small" data-fp="count"></p>
        <div class="fp-scroll"><table class="fp-table m-cards"><thead></thead><tbody></tbody></table></div></section>`;
    const $ = k => root.querySelector(`[data-fp="${k}"]`),
      thead = root.querySelector('.fp-table thead'),
      tbody = root.querySelector('.fp-table tbody');
    let planes = [],
      over = ''; // rangée survolée (clé d'immatriculation)
    const sort = {
      key: 'registration',
      dir: 1
    };
    /** Écrit un texte (ou un attribut) seulement s'il change. */
    const set = (el, v, attr) => {
      if (!el) return;
      if (attr ? el.getAttribute(attr) !== v : el.textContent !== v) attr ? el.setAttribute(attr, v) : el.textContent = v;
    };

    /** En-tête de la page, titre du tableau, lien du Centre : textes dans la langue courante. */
    function texts() {
      set(document.querySelector('body>header h1'), t(TX.title));
      set(document.querySelector('body>header p'), t(TX.subtitle));
      if (document.title !== t(TX.title)) document.title = t(TX.title);
      set($('ttitle'), t(TX.table));
      const centre = $('centre'),
        a = centre.querySelector('a');
      centre.hidden = !window.RepositoryNav?.cpco?.enabled?.();
      set(a, t(TX.edit));
      set(a, t(TX.editTip), 'title');
      set(a, window.RepositoryNav?.settingsUrl?.('fleet') || '../settings/centre.html?base=fleet', 'href');
      thead.innerHTML = `<tr>${COLS.map(c => `<th data-sort="${c}">${esc(t(TX[c]))} ${sort.key === c ? (sort.dir > 0 ? '▲' : '▼') : '↕'}</th>`).join('')}</tr>`;
    }
    /** Valeur de tri d'un appareil pour une colonne. */
    const sortValue = (p, c) => {
      if (c === 'callsigns') return p.callsigns.join(' ');
      if (c === 'last') {
        const f = map.lastFlight(p.key);
        return f ? `${f.date} ${f.time}` : '';
      }
      if (c === 'status') return p.operational === false ? '1' : '0';
      return String(p[c] ?? '');
    };
    /** Rangées du tableau : appareils retenus par les filtres de la carte, triés sur la colonne choisie. */
    function draw() {
      const list = planes.slice().sort((a, b) => sortValue(a, sort.key).localeCompare(sortValue(b, sort.key), undefined, {
        numeric: true
      }) * sort.dir);
      set($('count'), list.length === 1 ? t(TX.countOne) : tf(TX.count, {
        n: list.length
      }));
      const L = Object.fromEntries(COLS.map(c => [c, esc(t(TX[c]))])),
        src = p => p.source === 'om' ? t(TX.srcOm) : p.source === 'site' ? t(TX.srcSite) : t(TX.srcBase),
        tip = t(TX.rowTip);
      tbody.innerHTML = list.length ? list.map(p => {
        const f = map.lastFlight(p.key);
        // data-label : libellé de la colonne, montré devant la valeur quand le tableau passe en cartes (mode mobile)
        return `<tr data-key="${esc(p.key)}" title="${esc(tip)}"><td class="m-card-head"><a href="appareil.html?reg=${encodeURIComponent(p.registration)}" title="${esc(t(TX.sheet))}">${esc(p.registration)}</a></td>
          <td data-label="${L.type}">${esc(p.type)}</td><td data-label="${L.variant}">${esc(p.variant)}</td><td data-label="${L.callsigns}">${esc(p.callsigns.join(', '))}</td><td data-label="${L.operator}">${esc(p.operator)}</td>
          <td data-label="${L.ad}"><span><b>${esc(p.ad || '—')}</b> <span class="small" title="${esc(t(TX.srcTip))}">${esc(src(p))}</span></span></td><td data-label="${L.base}">${esc(p.base)}</td>
          <td data-label="${L.last}">${f ? `${esc(F.dateText(f.date))}${f.time ? ` ${esc(f.time)}` : ''}` : '—'}</td>
          <td data-label="${L.status}">${esc(p.operational === false ? t(TX.notOperational) : t(TX.operational))}</td></tr>`;
      }).join('') : `<tr><td colspan="${COLS.length}" class="small">${esc(t(TX.empty))}</td></tr>`;
      // rangées refaites sous le pointeur : plus de rangée survolée (le prochain mouvement la retrouve)
      if (over) map.highlight(over = '');
      paintSel();
    }
    /** Rangées des appareils sélectionnés sur la carte : surlignées. */
    function paintSel() {
      const s = map.selected();
      tbody.querySelectorAll('tr[data-key]').forEach(tr => tr.classList.toggle('fp-sel', s.has(tr.dataset.key)));
    }

    const map = F.mount($('map'), {
      rows: window.DEFA_FLEET || [],
      onSelect: keys => {
        paintSel();
        // grand écran : rangée sélectionnée montrée ; mobile : la page reste sur la carte (le tableau est en dessous)
        if (keys.size && !window.RepositoryNav?.mobile?.on?.()) tbody.querySelector('tr.fp-sel')?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      },
      onFilter: list => {
        planes = list;
        draw();
      }
    });
    // tri par colonne : clic sur un en-tête (même règle que AppFramework.sortableTable, chargé après cette page)
    thead.addEventListener('click', e => {
      const k = e.target.closest('[data-sort]')?.dataset.sort;
      if (!k) return;
      if (sort.key === k) sort.dir *= -1;
      else Object.assign(sort, {
        key: k,
        dir: 1
      });
      texts();
      draw();
    });
    // survol d'une rangée : position surlignée sur la carte ; clic : sélection et carte centrée
    tbody.addEventListener('mouseover', e => {
      const k = e.target.closest('tr[data-key]')?.dataset.key || '';
      if (k !== over) map.highlight(over = k);
    });
    tbody.addEventListener('mouseleave', () => map.highlight(over = ''));
    tbody.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-key]');
      if (!tr || e.target.closest('a')) return;
      const multi = e.ctrlKey || e.metaKey || e.shiftKey;
      map.select([tr.dataset.key], {
        toggle: multi
      });
      if (!multi) map.focus(tr.dataset.key);
      if (window.RepositoryNav?.mobile?.on?.()) $('map').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
    const relang = () => {
      texts();
      draw();
    };
    window.addEventListener('repository-language-change', relang);
    window.addEventListener('cpco-access-change', texts);
    texts();
    draw();
  }

  window.FleetPage = {
    mount
  };
})();
