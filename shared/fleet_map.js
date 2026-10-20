(() => {
  'use strict';
  // Carte de la flotte (Paramètres › Centre › Flotte, shared/data_admin.js) : tous les appareils de la flotte connue à
  // leur terrain actuel, sur un fond OpenStreetMap (MapLibre, shared/carto/).
  //   · terrain actuel : règle commune de la suite (shared/aircraft_positions.js : emplacement du site ou CR issu d'un
  //     ordre de mission, sinon la base) ; coordonnées du terrain : MissionAssignments.coordsOf (base SIA du navigateur,
  //     terrains des missions, cache des terrains, base mondiale des aérodromes chargée à la demande) ;
  //   · vue d'ensemble (zoom < TARMAC_ZOOM) : une pastille par terrain, nombre d'appareils ; vue « tarmac » (zoom
  //     ≥ TARMAC_ZOOM) : les appareils du terrain rangés sur une aire de stationnement, un par plaquette ;
  //   · survol : d'une pastille de plusieurs appareils, leur nombre par indicatif (série) et type ; d'un appareil (ou
  //     d'une pastille d'un seul), sa fiche courte avec la date et l'heure de son dernier vol (journal des vols DEFA et
  //     journal des missions : le plus récent l'emporte) ;
  //   · sélection : clic (Ctrl / Maj / ⌘ + clic : ajoute ou retire), Maj + glisser : rectangle ; clic sur une pastille :
  //     ses appareils, et zoom sur le terrain ; Échap ou « Effacer la sélection » ; la page est prévenue (onSelect) pour
  //     surligner les lignes du tableau ;
  //   · survol d'une ligne du tableau (highlight) : la position de l'appareil est surlignée sur la carte.
  // Molette : la page défile, zoom de la carte avec Ctrl (ou deux doigts), comme les autres cartes intégrées de la suite.
  // API (window.FleetMap) : mount(hôte, { rows, onSelect }) → { refresh(), highlight(ligne | immatriculation | null),
  //   isSelected(ligne), selected() → Set des clés d'immatriculation, destroy() }.
  if (window.FleetMap) return;
  const K = window.RepositoryKit,
    esc = K?.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)),
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const SHARED = new URL('.', document.currentScript?.src || location.href);
  /** Zoom à partir duquel les appareils sont rangés un par un sur l'aire de stationnement de leur terrain. */
  const TARMAC_ZOOM = 10;
  /** Plaquettes par rangée sur une aire de stationnement. */
  const TARMAC_COLS = 6;
  /** Clé d'une immatriculation (sans tiret ni espace). */
  const keyOf = r => String(r || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const up = v => String(v ?? '').trim().toUpperCase();
  /** Série d'un indicatif (« PELICAN 31 » → PELICAN) : l'indicatif sans son numéro final. */
  const seriesOf = cs => up(cs).replace(/[\s-]*\d+[A-Z]?$/, '').trim();
  /** Heure « HH:MM » d'un texte d'heure (« 14:05 », « 2026-09-23T14:05:00Z ») ; '' sinon. */
  const hhmm = v => /(\d{2}:\d{2})/.exec(String(v || ''))?.[1] || '';
  const lang = () => K?.lang?.() || window.RepositoryNav?.getLanguage?.() || 'fr';

  // ---- textes [fr, en, de, es]
  const TX = {
    title: ['Carte de la flotte', 'Fleet map', 'Flottenkarte', 'Mapa de la flota'],
    loading: ['Positions de la flotte : lecture…', 'Fleet positions: reading…', 'Flottenpositionen: wird gelesen…',
      'Posiciones de la flota: leyendo…'
    ],
    noMap: ['Carte indisponible (MapLibre) : le tableau de la flotte reste utilisable.',
      'Map unavailable (MapLibre): the fleet table remains usable.',
      'Karte nicht verfügbar (MapLibre): die Flottentabelle bleibt nutzbar.',
      'Mapa no disponible (MapLibre): la tabla de la flota sigue disponible.'
    ],
    summary: ['{n} appareils sur {m} terrains', '{n} aircraft at {m} aerodromes', '{n} Luftfahrzeuge auf {m} Flugplätzen',
      '{n} aeronaves en {m} aeródromos'
    ],
    unplaced: ['{n} sans terrain connu', '{n} without a known aerodrome', '{n} ohne bekannten Flugplatz',
      '{n} sin aeródromo conocido'
    ],
    unplacedTip: ['Sans terrain (base, emplacement du site ou CR d’ordre de mission) ou terrain introuvable : {list}',
      'No aerodrome (base, website location or mission-order report) or aerodrome not found: {list}',
      'Kein Flugplatz (Basis, Standort der Website oder Bericht eines Einsatzbefehls) oder Flugplatz nicht gefunden: {list}',
      'Sin aeródromo (base, ubicación del sitio o informe de orden de misión) o aeródromo no encontrado: {list}'
    ],
    hint: ['Survol : détails · clic : sélection (Ctrl / Maj : ajouter) · Maj + glisser : zone · Ctrl + molette : zoom',
      'Hover: details · click: select (Ctrl / Shift: add) · Shift + drag: area · Ctrl + wheel: zoom',
      'Überfahren: Details · Klick: Auswahl (Strg / Umschalt: hinzufügen) · Umschalt + Ziehen: Bereich · Strg + Mausrad: Zoom',
      'Pasar el ratón: detalles · clic: selección (Ctrl / Mayús: añadir) · Mayús + arrastrar: zona · Ctrl + rueda: zoom'
    ],
    fit: ['Toute la flotte', 'Whole fleet', 'Ganze Flotte', 'Toda la flota'],
    fitTip: ['Cadrer la carte sur tous les appareils placés', 'Fit the map to all placed aircraft',
      'Karte auf alle platzierten Luftfahrzeuge ausrichten', 'Encuadrar el mapa en todas las aeronaves situadas'
    ],
    clear: ['Effacer la sélection', 'Clear the selection', 'Auswahl aufheben', 'Borrar la selección'],
    selected: ['{n} appareils sélectionnés', '{n} aircraft selected', '{n} Luftfahrzeuge ausgewählt',
      '{n} aeronaves seleccionadas'
    ],
    selectedOne: ['1 appareil sélectionné', '1 aircraft selected', '1 Luftfahrzeug ausgewählt', '1 aeronave seleccionada'],
    none: ['Aucune sélection : cliquez un terrain ou un appareil, ou Maj + glisser sur la carte.',
      'No selection: click an aerodrome or an aircraft, or Shift + drag on the map.',
      'Keine Auswahl: einen Flugplatz oder ein Luftfahrzeug anklicken, oder Umschalt + Ziehen auf der Karte.',
      'Sin selección: haga clic en un aeródromo o una aeronave, o Mayús + arrastrar en el mapa.'
    ],
    aircraftAt: ['{n} appareils', '{n} aircraft', '{n} Luftfahrzeuge', '{n} aeronaves'],
    byCallsign: ['Par indicatif et type', 'By callsign and type', 'Nach Rufzeichen und Typ', 'Por indicativo y tipo'],
    noCallsign: ['sans indicatif', 'no callsign', 'ohne Rufzeichen', 'sin indicativo'],
    zoomHint: ['Clic : sélectionner ces appareils et zoomer sur le terrain',
      'Click: select these aircraft and zoom to the aerodrome',
      'Klick: diese Luftfahrzeuge auswählen und auf den Flugplatz zoomen',
      'Clic: seleccionar estas aeronaves y acercar al aeródromo'
    ],
    callsigns: ['Indicatifs', 'Callsigns', 'Rufzeichen', 'Indicativos'],
    operator: ['Opérateur', 'Operator', 'Betreiber', 'Operador'],
    position: ['Terrain actuel', 'Current aerodrome', 'Aktueller Flugplatz', 'Aeródromo actual'],
    base: ['Terrain de base', 'Home base', 'Heimatbasis', 'Base'],
    lastFlight: ['Dernier vol', 'Last flight', 'Letzter Flug', 'Último vuelo'],
    noFlight: ['aucun vol connu', 'no known flight', 'kein Flug bekannt', 'ningún vuelo conocido'],
    srcSite: ['emplacement du site', 'website location', 'Standort der Website', 'ubicación del sitio'],
    srcOm: ['CR d’ordre de mission', 'mission-order report', 'Bericht eines Einsatzbefehls', 'informe de orden de misión'],
    srcBase: ['base (pas d’autre position)', 'base (no other position)', 'Basis (keine andere Position)',
      'base (sin otra posición)'
    ],
    since: ['depuis le {d}', 'since {d}', 'seit {d}', 'desde el {d}'],
    fromLog: ['journal des vols', 'flight log', 'Flugbuch', 'diario de vuelos'],
    fromCr: ['CR {id}', 'report {id}', 'Bericht {id}', 'informe {id}'],
    operational: ['opérationnel', 'operational', 'einsatzbereit', 'operativo'],
    notOperational: ['non opérationnel', 'not operational', 'nicht einsatzbereit', 'no operativo'],
    sheet: ['Fiche appareil', 'Aircraft sheet', 'Luftfahrzeugblatt', 'Ficha de la aeronave'],
    clickOne: ['Clic : sélectionner · Ctrl / Maj + clic : ajouter ou retirer',
      'Click: select · Ctrl / Shift + click: add or remove', 'Klick: auswählen · Strg / Umschalt + Klick: hinzufügen oder entfernen',
      'Clic: seleccionar · Ctrl / Mayús + clic: añadir o quitar'
    ],
    // aides de la carte MapLibre (geste coopératif, boutons)
    winHelp: ['Ctrl + molette pour zoomer la carte', 'Use Ctrl + scroll to zoom the map', 'Strg + Mausrad zum Zoomen der Karte',
      'Ctrl + rueda para hacer zoom en el mapa'
    ],
    macHelp: ['⌘ + molette pour zoomer la carte', 'Use ⌘ + scroll to zoom the map', '⌘ + Mausrad zum Zoomen der Karte',
      '⌘ + rueda para hacer zoom en el mapa'
    ],
    mobileHelp: ['Deux doigts pour déplacer la carte', 'Use two fingers to move the map', 'Zwei Finger zum Verschieben der Karte',
      'Dos dedos para mover el mapa'
    ],
    zoomIn: ['Zoom avant', 'Zoom in', 'Vergrößern', 'Acercar'],
    zoomOut: ['Zoom arrière', 'Zoom out', 'Verkleinern', 'Alejar'],
    fullIn: ['Plein écran', 'Full screen', 'Vollbild', 'Pantalla completa'],
    fullOut: ['Quitter le plein écran', 'Exit full screen', 'Vollbild beenden', 'Salir de pantalla completa']
  };

  /** Date courte dans la langue de la page (« 23 sept. 2026 ») d'une date AAAA-MM-JJ ; le texte tel quel sinon. */
  function dateText(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
    if (!m) return String(d || '');
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString(lang(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  /** Ajoute une seule fois à la page la feuille de style de la carte (#fleetMapCss, classes .fm-…). */
  function style() {
    if (document.getElementById('fleetMapCss')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="fleetMapCss">@layer app{
.fm-block{margin:6px 0 14px}
.fm-tools{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:4px 0 8px}
.fm-tools .fm-sum{font-size:13px;font-weight:650}.fm-tools .fm-unplaced{font-size:12px;color:#b45309;cursor:help}
.fm-tools .fm-gap{flex:1}
.fm-hint{display:block;font-size:12px;opacity:.75;margin-top:4px}
.fm-map{position:relative;height:min(460px,60vh);border:1px solid var(--line,#d6dbe1);border-radius:10px;overflow:hidden;background:#dfe7ee}
.fm-map .maplibregl-canvas{outline:none}
.fm-ad{cursor:pointer;font:12px/1.2 system-ui,sans-serif;user-select:none}
.fm-pin{display:flex;flex-direction:column;align-items:center;gap:2px}
.fm-pin b{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;background:var(--accent,#2f6fd6);color:#fff;font-size:12px;box-shadow:0 1px 4px #0006;border:2px solid #fff;transition:transform .15s}
.fm-pin i{font-style:normal;font-weight:650;padding:0 4px;border-radius:4px;background:#ffffffd9;color:#1d2633}
.fm-ad:hover .fm-pin b{transform:scale(1.12)}
.fm-ad.fm-sel .fm-pin b{background:#f59e0b;color:#1d1400}
.fm-ad.fm-part .fm-pin b{box-shadow:0 0 0 3px #f59e0b,0 1px 4px #0006}
.fm-apron{display:grid;gap:4px;padding:6px;border-radius:8px;background:#3a4048d9;border:1px solid #ffffff55;box-shadow:0 2px 10px #0006}
.fm-apron>header{grid-column:1/-1;color:#fff;font-weight:700;letter-spacing:.04em;font-size:11px;display:flex;justify-content:space-between;gap:8px}
.fm-chip{display:flex;align-items:center;gap:4px;min-width:96px;padding:2px 6px;border-radius:5px;background:var(--card,#fff);color:var(--ink,#1d2633);border:1px solid #0003;white-space:nowrap;font-size:11px}
.fm-chip .ac-icon{display:inline-flex;width:22px;height:12px;flex:none}.fm-chip .ac-icon svg{width:100%;height:100%}
.fm-chip:hover{outline:2px solid var(--accent,#2f6fd6)}
.fm-chip.fm-off{opacity:.6;background:repeating-linear-gradient(135deg,var(--card,#fff) 0 6px,#e5e7eb 6px 9px)}
.fm-chip.fm-sel{background:#fde68a;color:#1d1400;border-color:#b45309}
.fm-ad.fm-hot .fm-pin b,.fm-chip.fm-hot{animation:fmHot 1s ease-in-out infinite;outline:3px solid #e5484d;outline-offset:2px}
@keyframes fmHot{50%{outline-color:#e5484d55}}
.fm-tip{position:absolute;z-index:5;max-width:320px;padding:8px 10px;border-radius:8px;background:#1d2733;color:#f2f5f8;font:12px/1.45 system-ui,sans-serif;box-shadow:0 6px 24px #0005;pointer-events:none}
.fm-tip h4{margin:0 0 4px;font-weight:700;font-size:13px;display:flex;gap:6px;align-items:center}.fm-tip h4 .ac-icon{display:inline-flex;width:28px;height:15px}.fm-tip h4 .ac-icon svg{width:100%;height:100%;color:#f2f5f8}
.fm-tip .fm-kv{display:grid;grid-template-columns:auto 1fr;gap:1px 10px}.fm-tip .fm-kv.fm-n{grid-template-columns:auto auto auto;justify-content:start}
.fm-tip .fm-kv>span:nth-child(odd){opacity:.7;white-space:nowrap}.fm-tip .fm-kv.fm-n>span{opacity:1!important}.fm-tip .fm-kv.fm-n>span:nth-child(3n+1){opacity:.85!important}
.fm-tip .fm-kv .num{text-align:right;font-variant-numeric:tabular-nums;font-weight:650}
.fm-tip .fm-dim{opacity:.7}
.fm-tip .fm-foot{margin-top:5px;opacity:.65;font-size:11px}
.fm-box{position:absolute;z-index:4;border:2px dashed #f59e0b;background:#f59e0b22;pointer-events:none}
.fm-selbar{margin-top:8px;font-size:12px}.fm-selbar ul{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 12px}
.fm-selbar li b{font-weight:650}
.da-table tr.da-map-sel td{background:color-mix(in srgb,#f59e0b 22%,transparent)}
.da-table tr.da-map-hot td{background:color-mix(in srgb,var(--accent,#2f6fd6) 12%,transparent)}
}</style>`);
  }

  /** MapLibre (shared/carto/), chargé une fois à la demande ; null s'il manque. */
  let libLoad = null;

  function loadLib() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    return libLoad ||= new Promise(resolve => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = new URL('carto/maplibre-gl.css', SHARED).href;
      document.head.append(css);
      const sc = document.createElement('script');
      sc.src = new URL('carto/maplibre-gl.js', SHARED).href;
      sc.onload = () => resolve(window.maplibregl || null);
      sc.onerror = () => resolve(null);
      document.head.append(sc);
    });
  }

  /** Module de la page chargé par repository_nav.js (MissionAssignments, AircraftPositions) : attendu un instant. */
  async function waitFor(name) {
    for (let i = 0; i < 50 && !window[name]; i++) await new Promise(r => setTimeout(r, 100));
    return window[name] || null;
  }

  /** Dernier vol de chaque appareil (clé d'immatriculation) : journal des vols DEFA (date, heure, départ, arrivée) et
   *  journal des missions (date du CR, atterrissage, décollage ou heure UTC) ; le plus récent l'emporte. */
  async function lastFlights() {
    const by = new Map();
    const put = (reg, f) => {
      const k = keyOf(reg);
      if (!k || !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return;
      const cur = by.get(k);
      if (!cur || `${f.date} ${f.time}` > `${cur.date} ${cur.time}`) by.set(k, f);
    };
    try {
      for (const r of window.DefaFlightLog?.load?.().records || []) put(r.registration, {
        date: String(r.date || '').slice(0, 10),
        time: hhmm(r.time),
        dep: up(r.dep),
        arr: up(r.arr),
        callsign: up(r.callsign),
        source: 'log'
      });
    } catch {
      /* journal absent ou illisible */
    }
    const L = window.MissionLedger;
    if (L) {
      try {
        await L.load();
      } catch {
        /* registre indisponible */
      }
      for (const m of L.store?.missions || []) {
        const md = m?.metadata || {},
          tl = m?.timeline || {},
          date = String(md.date || '').slice(0, 10),
          time = hhmm(tl.landing) || hhmm(tl.takeoff) || hhmm(md.timeUtc);
        for (const a of m?.aircraft || []) put(a.registration, {
          date,
          time,
          dep: up(a.baseDeparture),
          arr: up(a.landingAd || a.baseReturn),
          callsign: up(a.callsign),
          source: 'cr',
          id: md.missionId || ''
        });
      }
    }
    return by;
  }

  /** Construit la carte de la flotte dans host. rows : lignes de travail de la flotte (modifiées en place par la page) ;
   *  onSelect(Set des clés d'immatriculation) : appelé à chaque changement de la sélection. */
  function mount(host, {
    rows,
    onSelect = () => {}
  }) {
    style();
    host.innerHTML = `<section class="fm-block" data-block-id="fleetMap" data-icon="map"><h2 data-fm="title"></h2>
      <div class="fm-tools"><span class="fm-sum" data-fm="sum"></span><span class="fm-unplaced" data-fm="unplaced" hidden></span>
        <span class="fm-gap"></span>
        <button type="button" class="secondary" data-fm="fit" data-icon="target"></button>
        <button type="button" class="secondary" data-fm="clear" data-icon="undo" disabled></button></div>
      <div class="fm-map"></div><span class="fm-hint" data-fm="hint"></span><div class="fm-selbar" data-fm="selbar"></div></section>`;
    const $ = k => host.querySelector(`[data-fm="${k}"]`),
      mapEl = host.querySelector('.fm-map');
    const sel = new Set(); // clés d'immatriculation sélectionnées
    let map = null,
      places = [], // terrains : { ad, lat, lon, planes: [appareil], marker, el }
      unplaced = [], // appareils sans terrain placé
      flights = new Map(),
      hot = '', // clé surlignée depuis le tableau
      tarmac = false,
      gen = 0, // génération des données (refresh concurrents : seul le dernier dessine)
      dead = false;
    const tip = document.createElement('div');
    tip.className = 'fm-tip';
    tip.hidden = true;

    // ---- textes fixes du bloc (posés dans la langue courante ; refaits au changement de langue)
    function texts() {
      const set = (el, v, attr) => {
        if (attr ? el.getAttribute(attr) !== v : el.textContent !== v) attr ? el.setAttribute(attr, v) : el.textContent = v;
      };
      set($('title'), t(TX.title));
      set($('hint'), t(TX.hint));
      set($('fit'), t(TX.fit));
      set($('fit'), t(TX.fitTip), 'title');
      set($('clear'), t(TX.clear));
      const placed = places.reduce((n, p) => n + p.planes.length, 0);
      set($('sum'), places.length || unplaced.length ? tf(TX.summary, {
        n: placed,
        m: places.length
      }) : t(TX.loading));
      const u = $('unplaced');
      u.hidden = !unplaced.length;
      if (unplaced.length) {
        set(u, `· ${tf(TX.unplaced, { n: unplaced.length })}`);
        set(u, tf(TX.unplacedTip, {
          list: unplaced.map(p => p.registration).join(', ')
        }), 'title');
      }
      selbar();
    }

    /** Ligne des appareils sélectionnés (fiche appareil, type, indicatif, terrain, dernier vol). */
    function selbar() {
      const bar = $('selbar'),
        list = places.flatMap(p => p.planes).concat(unplaced).filter(p => sel.has(p.key));
      $('clear').disabled = !sel.size;
      if (!list.length) {
        bar.innerHTML = `<span class="small">${esc(t(TX.none))}</span>`;
        return;
      }
      const sheet = reg => new URL(`apps/cr/appareil.html?reg=${encodeURIComponent(reg)}`, window.RepositoryNav?.root || new URL('../',
        SHARED)).href;
      bar.innerHTML = `<b>${esc(list.length === 1 ? t(TX.selectedOne) : tf(TX.selected, { n: list.length }))}</b>
        <ul>${list.map(p => {
          const f = flights.get(p.key);
          return `<li><a href="${esc(sheet(p.registration))}" title="${esc(t(TX.sheet))}"><b>${esc(p.registration)}</b></a> ${esc([p.type, p.callsigns[0]].filter(Boolean).join(' · '))} — ${esc(p.ad || '?')}${f ? ` · ${esc(dateText(f.date))}${f.time ? ` ${esc(f.time)}` : ''}` : ''}</li>`;
        }).join('')}</ul>`;
    }

    // ---- infobulle de survol
    /** Fiche courte d'un appareil : identité, indicatifs, opérateur, terrain actuel, base, dernier vol, statut. */
    function planeCard(p) {
      const f = flights.get(p.key),
        src = p.source === 'om' ? t(TX.srcOm) : p.source === 'site' ? t(TX.srcSite) : t(TX.srcBase),
        icon = window.AircraftDBIcons?.icon?.({
          icao: p.type
        }) || '';
      const row = (label, value) => value ? `<span>${esc(t(label))}</span><span>${value}</span>` : '';
      const flight = f ? `${esc(dateText(f.date))}${f.time ? ` ${esc(f.time)}` : ''}${f.dep || f.arr ? ` · ${esc(f.dep || '?')} → ${esc(f.arr || '?')}` : ''}<br><span class="fm-dim">${esc(f.source === 'log' ? t(TX.fromLog) : tf(TX.fromCr, { id: f.id || '' }))}${f.callsign ? ` · ${esc(f.callsign)}` : ''}</span>` :
        `<span class="fm-dim">${esc(t(TX.noFlight))}</span>`;
      return `<h4>${icon}${esc(p.registration)} <span class="fm-dim">${esc([p.type, p.variant].filter(Boolean).join(' — '))}</span></h4>
        <div class="fm-kv">${row(TX.callsigns, esc(p.callsigns.join(', ')))}${row(TX.operator, esc(p.operator))}
        ${row(TX.position, `<b>${esc(p.ad)}</b> <span class="fm-dim">(${esc(src)}${p.at ? `, ${esc(tf(TX.since, { d: dateText(p.at) }))}` : ''})</span>`)}
        ${p.base && up(p.base) !== p.ad ? row(TX.base, esc(up(p.base))) : ''}${row(TX.lastFlight, flight)}</div>
        <div class="fm-foot">${esc(p.operational === false ? t(TX.notOperational) : t(TX.operational))} · ${esc(t(TX.clickOne))}</div>`;
    }
    /** Contenu de l'infobulle d'un terrain : un seul appareil → sa fiche ; plusieurs → nombre par indicatif (série) et type. */
    function placeCard(place) {
      if (place.planes.length === 1) return planeCard(place.planes[0]);
      const groups = new Map();
      for (const p of place.planes) {
        const k = `${seriesOf(p.callsigns[0]) || '—'}\u0000${p.type || '?'}`;
        groups.set(k, (groups.get(k) || 0) + 1);
      }
      const lines = [...groups.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => {
        const [series, type] = k.split('\u0000');
        return `<span>${esc(series === '—' ? t(TX.noCallsign) : series)}</span><span>${esc(type)}</span><span class="num">× ${n}</span>`;
      }).join('');
      return `<h4>${esc(place.ad)} <span class="fm-dim">— ${esc(tf(TX.aircraftAt, { n: place.planes.length }))}</span></h4>
        <div class="fm-dim">${esc(t(TX.byCallsign))}</div><div class="fm-kv fm-n">${lines}</div>
        <div class="fm-foot">${esc(t(TX.zoomHint))}</div>`;
    }
    /** Montre l'infobulle html près du pointeur (coordonnées de l'événement, dans le cadre de la carte). */
    function showTip(html, event) {
      if (tip.dataset.html !== html) {
        tip.innerHTML = html;
        tip.dataset.html = html;
      }
      tip.hidden = false;
      const r = mapEl.getBoundingClientRect(),
        x = event.clientX - r.left,
        y = event.clientY - r.top,
        w = tip.offsetWidth,
        h = tip.offsetHeight;
      tip.style.left = `${Math.max(4, Math.min(x + 14, r.width - w - 4))}px`;
      tip.style.top = `${y + 14 + h > r.height ? Math.max(4, y - h - 10) : y + 14}px`;
    }
    const hideTip = () => {
      tip.hidden = true;
    };

    // ---- sélection
    /** Remplace (ou complète, add) la sélection par les clés données ; toggle : une clé déjà prise est retirée. */
    function select(keys, {
      add = false,
      toggle = false
    } = {}) {
      if (!add && !toggle) sel.clear();
      for (const k of keys) toggle && sel.has(k) ? sel.delete(k) : sel.add(k);
      paintSel();
      selbar();
      onSelect(new Set(sel));
    }
    /** État des terrains et des plaquettes : sélectionnés, en partie, surlignés. */
    function paintSel() {
      for (const pl of places) {
        const n = pl.planes.filter(p => sel.has(p.key)).length;
        pl.el.classList.toggle('fm-sel', n > 0 && n === pl.planes.length);
        pl.el.classList.toggle('fm-part', n > 0 && n < pl.planes.length);
        pl.el.classList.toggle('fm-hot', !tarmac && pl.planes.some(p => p.key === hot));
        pl.el.querySelectorAll('.fm-chip').forEach(c => {
          c.classList.toggle('fm-sel', sel.has(c.dataset.key));
          c.classList.toggle('fm-hot', c.dataset.key === hot);
        });
      }
    }

    // ---- marqueurs : une pastille par terrain, ou son aire de stationnement (vue « tarmac »)
    /** Contenu du marqueur d'un terrain selon le zoom : pastille (nombre, code OACI) ou aire de stationnement. */
    function drawPlace(pl) {
      if (!tarmac) {
        pl.el.innerHTML = `<div class="fm-pin"><b>${pl.planes.length}</b><i>${esc(pl.ad)}</i></div>`;
        return;
      }
      const cols = Math.min(TARMAC_COLS, Math.max(1, Math.ceil(Math.sqrt(pl.planes.length * 1.5))));
      pl.el.innerHTML = `<div class="fm-apron" style="grid-template-columns:repeat(${cols},auto)"><header><span>${esc(pl.ad)}</span><span>${pl.planes.length}</span></header>${pl.planes.map(p => `<span class="fm-chip${p.operational === false ? ' fm-off' : ''}" data-key="${esc(p.key)}">${window.AircraftDBIcons?.icon?.({ icao: p.type }) || ''}<span>${esc(p.callsigns[0] || p.registration)}</span></span>`).join('')}</div>`;
      // infobulle native des silhouettes (type, modèle) : remplacée par la fiche de la carte
      pl.el.querySelectorAll('.ac-icon[title]').forEach(i => i.removeAttribute('title'));
    }
    /** Pose les marqueurs des terrains (après chaque relecture des données). */
    function drawMarkers() {
      for (const pl of places) {
        const el = document.createElement('div');
        el.className = 'fm-ad';
        pl.el = el;
        drawPlace(pl);
        el.addEventListener('mousemove', e => {
          const chip = e.target.closest('.fm-chip'),
            p = chip && pl.planes.find(x => x.key === chip.dataset.key);
          showTip(p ? planeCard(p) : placeCard(pl), e);
        });
        el.addEventListener('mouseleave', hideTip);
        el.addEventListener('click', e => {
          e.stopPropagation();
          const chip = e.target.closest('.fm-chip'),
            multi = e.ctrlKey || e.metaKey || e.shiftKey;
          if (chip) return select([chip.dataset.key], {
            toggle: multi
          });
          select(pl.planes.map(p => p.key), {
            add: multi
          });
          if (!multi && !tarmac) map.easeTo({
            center: [pl.lon, pl.lat],
            zoom: Math.max(map.getZoom(), TARMAC_ZOOM + 2)
          });
        });
        pl.marker = new window.maplibregl.Marker({
          element: el,
          anchor: 'center'
        }).setLngLat([pl.lon, pl.lat]).addTo(map);
      }
      paintSel();
    }
    /** Cadre la carte sur tous les terrains placés. */
    function fit(animate = true) {
      if (!map || !places.length) return;
      const lons = places.map(p => p.lon),
        lats = places.map(p => p.lat);
      map.fitBounds([
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)]
      ], {
        padding: 50,
        maxZoom: 8,
        duration: animate ? 600 : 0
      });
    }

    // ---- données : terrain actuel et coordonnées de chaque appareil de la flotte, dernier vol
    /** Relit positions, coordonnées et derniers vols, puis redessine les marqueurs (la vue de la carte est gardée). */
    async function refresh() {
      const my = ++gen;
      const P = await waitFor('AircraftPositions'),
        A = await waitFor('MissionAssignments');
      try {
        await P?.load?.();
      } catch {
        /* positions des ordres de mission indisponibles : site et base seulement */
      }
      const fl = await lastFlights(),
        coords = new Map(),
        byAd = new Map(),
        lost = [];
      for (const r of rows || []) {
        const key = keyOf(r.registration);
        if (!key) continue;
        const w = P?.whereIs?.(r) || {
            ad: up(r.location || r.base),
            source: r.location ? 'site' : 'base',
            at: r.location ? r.locationAt || '' : ''
          },
          ad = up(w.ad);
        const plane = {
          key,
          registration: up(r.registration),
          type: up(r.type),
          variant: r.variant || '',
          callsigns: (r.callsigns || []).map(up).filter(Boolean),
          operator: r.operator || '',
          base: r.base || '',
          operational: r.operational,
          ad,
          source: w.source,
          at: w.at || ''
        };
        if (!coords.has(ad)) coords.set(ad, /^[A-Z0-9]{3,4}$/.test(ad) && A?.coordsOf ? await A.coordsOf(ad).catch(() => null) : null);
        const c = coords.get(ad);
        if (!c || !Number.isFinite(+c.lat) || !Number.isFinite(+c.lon)) {
          lost.push(plane);
          continue;
        }
        if (!byAd.has(ad)) byAd.set(ad, {
          ad,
          lat: +c.lat,
          lon: +c.lon,
          planes: []
        });
        byAd.get(ad).planes.push(plane);
      }
      if (my !== gen || dead) return;
      places.forEach(p => p.marker?.remove());
      const first = !places.length;
      places = [...byAd.values()].sort((a, b) => b.planes.length - a.planes.length);
      places.forEach(pl => pl.planes.sort((a, b) => (a.callsigns[0] || a.registration).localeCompare(b.callsigns[0] || b.registration,
        undefined, {
          numeric: true
        })));
      unplaced = lost;
      flights = fl;
      // sélection : seulement des appareils encore dans la flotte
      const known = new Set(places.flatMap(p => p.planes).concat(unplaced).map(p => p.key));
      for (const k of [...sel])
        if (!known.has(k)) sel.delete(k);
      if (map) {
        drawMarkers();
        if (first) fit(false);
      }
      texts();
    }

    /** Surligne la position d'un appareil (ligne de la flotte ou immatriculation ; null : rien). */
    function highlight(plane) {
      const k = keyOf(typeof plane === 'string' ? plane : plane?.registration);
      if (k === hot) return;
      hot = k;
      paintSel();
    }

    // ---- carte
    /** Crée la carte MapLibre (fond OpenStreetMap), ses commandes et la sélection par rectangle (Maj + glisser). */
    async function createMap() {
      const lib = await loadLib();
      if (dead) return;
      if (!lib) {
        mapEl.textContent = t(TX.noMap);
        return;
      }
      map = new lib.Map({
        container: mapEl,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              maxzoom: 19,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'osm',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-saturation': -0.6,
              'raster-opacity': 0.85
            }
          }]
        },
        center: [2.5, 46.6],
        zoom: 4.6,
        maxZoom: 16,
        dragRotate: false,
        pitchWithRotate: false,
        boxZoom: false, // Maj + glisser : sélection par rectangle (ci-dessous)
        cooperativeGestures: true,
        attributionControl: {
          compact: true
        },
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': t(TX.winHelp),
          'CooperativeGesturesHandler.MacHelpText': t(TX.macHelp),
          'CooperativeGesturesHandler.MobileHelpText': t(TX.mobileHelp),
          'NavigationControl.ZoomIn': t(TX.zoomIn),
          'NavigationControl.ZoomOut': t(TX.zoomOut),
          'FullscreenControl.Enter': t(TX.fullIn),
          'FullscreenControl.Exit': t(TX.fullOut)
        }
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new lib.NavigationControl({
        showCompass: false
      }), 'top-right');
      map.addControl(new lib.FullscreenControl({
        container: mapEl
      }), 'top-right');
      map.addControl(new lib.ScaleControl({
        unit: 'nautical'
      }), 'bottom-left');
      mapEl.append(tip);
      // bloc masqué à l'ouverture, largeur de la fenêtre : taille suivie, sinon la carte reste vide
      if (window.ResizeObserver) new ResizeObserver(() => mapEl.offsetWidth && map?.resize()).observe(mapEl);
      // vue d'ensemble ⇄ aires de stationnement : redessin seulement au passage du seuil
      map.on('zoom', () => {
        const now = map.getZoom() >= TARMAC_ZOOM;
        if (now === tarmac) return;
        tarmac = now;
        hideTip();
        places.forEach(drawPlace);
        paintSel();
      });
      // clic sur le fond : sélection effacée (sauf le clic qui termine un rectangle de sélection)
      let boxEnd = 0;
      map.on('click', () => {
        if (sel.size && Date.now() - boxEnd > 300) select([]);
      });
      map.on('movestart', hideTip);
      // sélection par rectangle (Maj + glisser) : terrains (vue d'ensemble) ou plaquettes (vue « tarmac ») dans le cadre
      const canvas = map.getCanvasContainer();
      canvas.addEventListener('mousedown', e => {
        if (!e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        map.dragPan.disable();
        const r = mapEl.getBoundingClientRect(),
          x0 = e.clientX - r.left,
          y0 = e.clientY - r.top,
          box = document.createElement('div');
        box.className = 'fm-box';
        mapEl.append(box);
        let x1 = x0,
          y1 = y0;
        const move = ev => {
          x1 = Math.max(0, Math.min(ev.clientX - r.left, r.width));
          y1 = Math.max(0, Math.min(ev.clientY - r.top, r.height));
          Object.assign(box.style, {
            left: `${Math.min(x0, x1)}px`,
            top: `${Math.min(y0, y1)}px`,
            width: `${Math.abs(x1 - x0)}px`,
            height: `${Math.abs(y1 - y0)}px`
          });
        };
        const end = ev => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', end);
          box.remove();
          map.dragPan.enable();
          boxEnd = Date.now();
          const [l, rr, tp, b] = [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1)];
          if (rr - l < 4 && b - tp < 4) return;
          const inBox = (x, y) => x >= l && x <= rr && y >= tp && y <= b,
            keys = [];
          for (const pl of places) {
            if (tarmac) pl.el.querySelectorAll('.fm-chip').forEach(c => {
              const q = c.getBoundingClientRect();
              if (inBox(q.left + q.width / 2 - r.left, q.top + q.height / 2 - r.top)) keys.push(c.dataset.key);
            });
            else {
              const pt = map.project([pl.lon, pl.lat]);
              if (inBox(pt.x, pt.y)) keys.push(...pl.planes.map(p => p.key));
            }
          }
          select(keys, {
            add: ev.ctrlKey || ev.metaKey
          });
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
      }, true);
      if (places.length) {
        drawMarkers();
        fit(false);
      }
    }

    // ---- commandes du bloc, langue, Échap
    $('fit').onclick = () => fit();
    $('clear').onclick = () => select([]);
    const onKey = e => {
      if (e.key === 'Escape' && sel.size && host.isConnected) select([]);
    };
    const onLang = () => {
      if (!host.isConnected) return destroy();
      texts();
      if (!tip.hidden) hideTip();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('repository-language-change', onLang);
    /** Libère la carte et les écouteurs (la page redessine son corps). */
    function destroy() {
      dead = true;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('repository-language-change', onLang);
      map?.remove();
      map = null;
    }

    texts();
    window.AppFramework?.refresh?.(host);
    createMap();
    refresh();
    return {
      refresh,
      highlight,
      isSelected: plane => sel.has(keyOf(plane?.registration)),
      selected: () => new Set(sel),
      destroy
    };
  }

  window.FleetMap = {
    mount
  };
})();
