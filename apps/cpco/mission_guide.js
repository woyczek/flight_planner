(() => {
  'use strict';
  // Saisie guidée « pas à pas » du générateur de mission (docs/technique/V2_FABLE.md § 11) : rail de six étapes (Cadre,
  // Lieux, Récit, Objectifs et risques, Chronologie, Cartes et documents), une étape ouverte à la fois, « Suivant → »,
  // « Tout afficher » pour revenir à la mise en page complète. Mêmes données que les blocs (state.yaml, state.narrative
  // de mission_editor.html), pas de nouveau modèle : chaque étape montre ses champs et, le cas échéant, les blocs
  // existants (Identification à l'étape 1, Cartes du dossier final et Documents à l'étape 6).
  //   · propositions : valeur posée dans le champ, marquée « proposé » jusqu'à confirmation (✓) ou modification ;
  //   · avertissements : une ligne sous le champ, jamais une fenêtre, avec la correction en un clic quand elle existe.
  // Par défaut pour une mission neuve (jamais enregistrée, ou squelette) aux niveaux 1 à 3 ; au choix au niveau 4
  // (bouton « Pas à pas » du bloc Mission). Utilise les fonctions de la page : state, getPath, setPath, shareMission,
  // renderAll, renderCommon, renderNarrative, setStatus, esc ; SiaMission, MissionSkeleton, MissionExercise,
  // MissionEstimate, PlaceSearch.
  // API (window.MissionGuide) : render() (appelé à la fin de renderAll), start(), stop(), on().
  if (window.MissionGuide) return;
  const K = window.RepositoryKit,
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? ''),
    E = s => String(s ?? '').replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    } [c])),
    $ = id => document.getElementById(id),
    arr = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v],
    S = () => window.MissionSkeleton,
    has = p => !!p && p.lat !== null && p.lat !== '' && p.lat !== undefined && p.lon !== null && p.lon !== '' && p.lon !== undefined &&
    Number.isFinite(+p.lat) && Number.isFinite(+p.lon);
  const STEPS = [{
    id: 'frame',
    title: ['Cadre', 'Frame', 'Rahmen', 'Marco'],
    sub: ['famille, théâtre, aéronef, départ', 'family, theatre, aircraft, departure', 'Familie, Einsatzgebiet, Luftfahrzeug, Abflug',
      'familia, teatro, aeronave, salida'
    ],
    blocks: ['mission-identification']
  }, {
    id: 'places',
    title: ['Lieux', 'Places', 'Orte', 'Lugares'],
    sub: ['cible, zone, points, rendez-vous', 'target, zone, points, rendezvous', 'Zielobjekt, Zone, Punkte, Treffpunkte',
      'objetivo, zona, puntos, encuentros'
    ],
    blocks: []
  }, {
    id: 'story',
    title: ['Récit', 'Story', 'Erzählung', 'Relato'],
    sub: ['titre, résumé, description', 'title, summary, description', 'Titel, Zusammenfassung, Beschreibung',
      'título, resumen, descripción'
    ],
    blocks: []
  }, {
    id: 'goals',
    title: ['Objectifs et risques', 'Objectives and risks', 'Ziele und Risiken', 'Objetivos y riesgos'],
    sub: ['un objectif principal, secondaires, risques', 'one main objective, secondaries, risks',
      'ein Hauptziel, Nebenziele, Risiken',
      'un objetivo principal, secundarios, riesgos'
    ],
    blocks: []
  }, {
    id: 'timeline',
    title: ['Chronologie', 'Timeline', 'Zeitablauf', 'Cronología'],
    sub: ['heure H, événements', 'H-hour, events', 'Stunde H, Ereignisse', 'hora H, eventos'],
    blocks: []
  }, {
    id: 'maps',
    title: ['Cartes et documents', 'Maps and documents', 'Karten und Dokumente', 'Mapas y documentos'],
    sub: ['cartes attendues, enregistrement, PDF', 'expected maps, saving, PDF', 'erwartete Karten, Speichern, PDF',
      'mapas previstos, guardado, PDF'
    ],
    blocks: ['mission-maps', 'mission-export']
  }];
  const LEVELS = ['Critique', 'Élevé', 'Modéré', 'Faible'];
  const LEVEL_LABEL = {
    'Critique': ['Critique', 'Critical', 'Kritisch', 'Crítico'],
    'Élevé': ['Élevé', 'High', 'Hoch', 'Alto'],
    'Modéré': ['Modéré', 'Moderate', 'Mittel', 'Moderado'],
    'Faible': ['Faible', 'Low', 'Niedrig', 'Bajo']
  };

  // ---- état du mode (par mission, dans cet onglet) : allumé, étape, valeurs proposées
  const KEY = 'missionGuide:v1';
  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {};
    } catch {
      return {};
    }
  };
  const write = v => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* stockage refusé : le mode vit le temps de la page */
    }
  };
  const mid = () => String(state?.yaml?.mission?.id || '').toUpperCase() || '_';
  /** Réglages du mode pour la mission affichée : { on, step, prop: [chemins proposés] }. */
  function cfg() {
    const all = read(),
      id = mid();
    if (!all[id]) {
      // défaut : mission neuve (jamais enregistrée, ou squelette) aux niveaux 1 à 3
      const lv = +document.documentElement.dataset.level || 4,
        st = window.SiaMission?.savedState?.({
          yaml: state.yaml,
          narrative: state.narrative
        }),
        fresh = st?.kind === 'new' || !!state.yaml?.meta?.skeleton;
      all[id] = {
        on: lv <= 3 && fresh,
        step: 0,
        prop: []
      };
      write(all);
    }
    return all[id];
  }
  /** Modifie les réglages de la mission affichée. */
  function setCfg(patch) {
    const all = read(),
      id = mid();
    all[id] = {
      ...cfg(),
      ...patch
    };
    write(all);
  }
  const isProp = path => cfg().prop.includes(path);
  /** Marque (ou démarque) une valeur proposée. */
  function prop(path, on = true) {
    const p = new Set(cfg().prop);
    on ? p.add(path) : p.delete(path);
    setCfg({
      prop: [...p]
    });
  }

  // ---- outils
  /** Écrit une valeur, republie la mission, redessine ce qui en dépend ailleurs dans la page (sans le guide). */
  function put(path, value, {
    redraw = false
  } = {}) {
    setPath(state.yaml, path.split('.').map(k => /^\d+$/.test(k) ? +k : k), value);
    shareMission();
    if (redraw) render();
  }
  /** Ligne d'avertissement sous un champ (texte, bouton de correction facultatif). */
  const warn = (text, fix = '', fixId = '') => `<p class="mg-warn">${E(text)}${fix ? ` <button type="button" class="secondary" data-mg-fix="${E(fixId)}">${E(fix)}</button>` : ''}</p>`;
  /** Pastille « proposé » d'un champ (✓ confirme). */
  const chip = path => isProp(path) ? ` <button type="button" class="mg-chip" data-mg-ok="${E(path)}" title="${E(t(['Valeur proposée : la modifier, ou la confirmer', 'Proposed value: change it, or confirm it', 'Vorgeschlagener Wert: ändern oder bestätigen', 'Valor propuesto: modificarlo o confirmarlo']))}">${E(t(['proposé', 'proposed', 'vorgeschlagen', 'propuesto']))} ✓</button>` : '';
  /** Champ avec libellé, pastille et avertissements. */
  const field = (label, path, control, warns = '') => `<div class="mg-field${path && isProp(path) ? ' mg-prop' : ''}"><label>${E(label)}${path ? chip(path) : ''}${control}</label>${warns}</div>`;
  const icaoOf = p => S()?.icaoOf?.(p) || '';
  /** Ligne de la flotte pour un type (base, indicatifs). */
  const fleetRow = type => (window.DEFA_FLEET || []).find(r => String(r.type || '').toUpperCase() === String(type || '').split(/\s+/)[0]
    .toUpperCase());
  /** Point à d km (NM) de a vers b (interpolation sur la droite a→b, suffisante à quelques dizaines de NM). */
  function toward(a, b, nm) {
    const d = window.MissionEstimate?.distNm?.(a, b) || 0;
    if (!d) return null;
    const f = Math.min(1, nm / d);
    return {
      lat: +(+a.lat + (b.lat - a.lat) * f).toFixed(6),
      lon: +(+a.lon + (b.lon - a.lon) * f).toFixed(6)
    };
  }

  /** Récit (summary, detailed) écrit dans l'état et dans les champs du bloc Textes : la page les relit avant de publier. */
  function setNarr(k, v) {
    state.narrative[k] = v;
    const el = $(k === 'summary' ? 'summary' : 'detailed');
    if (el) el.value = v;
  }
  // ---- étapes : contenu et état (fait / à faire)
  /** État d'une étape : true si l'essentiel y est. */
  function done(i) {
    const y = state.yaml || {};
    switch (STEPS[i].id) {
      case 'frame':
        return !!(y.mission?.type && y.aircraft?.[0]?.type && y.aircraft?.[0]?.callsign && has(y.origin));
      case 'places':
        return placeRows(y).every(r => r.placed);
      case 'story':
        return !!(y.title && (state.narrative?.summary || y.summary));
      case 'goals':
        return !!(y.objectives?.primary && arr(y.risks).length);
      case 'timeline':
        return arr(y.timeline?.events).length > 0;
      case 'maps':
        return arr(y.maps).length > 0 && unplacedMaps(y).length === 0;
    }
    return false;
  }
  /** Lieux de la mission : [{ path, id, name, placed, kind }] (cible, zones, points tournants, rendez-vous). */
  function placeRows(y) {
    const rows = [];
    if (y.target) rows.push({
      path: 'target',
      id: y.target.id || 'TARGET',
      name: y.target.name || '',
      placed: has(y.target),
      kind: 'target'
    });
    arr(y.zones).forEach((z, i) => rows.push({
      path: `zones.${i}`,
      id: z.id || `ZONE-${i + 1}`,
      name: z.name || '',
      placed: has(z.centre || {}),
      kind: 'zone',
      radius: z.radius_km
    }));
    arr(y.turning_points).forEach((p, i) => rows.push({
      path: `turning_points.${i}`,
      id: p.id || `PT${i + 1}`,
      name: p.name || '',
      placed: has(p),
      kind: 'point'
    }));
    arr(y.rendezvous).forEach((r, i) => rows.push({
      path: `rendezvous.${i}`,
      id: r.id || `RDV-${i + 1}`,
      name: r.name || '',
      placed: has(r),
      kind: 'rdv',
      participants: arr(r.participants)
    }));
    return rows;
  }
  /** Cartes centrées sur un lieu sans coordonnées : [{ map, ref }]. */
  function unplacedMaps(y) {
    const byId = new Map(placeRows(y).map(r => [String(r.id).toUpperCase(), r]));
    return arr(y.maps).filter(m => m && typeof m === 'object' && m.centre_ref && byId.has(String(m.centre_ref).toUpperCase()) && !byId
      .get(
        String(m.centre_ref).toUpperCase()).placed).map(m => ({
      map: m,
      ref: m.centre_ref
    }));
  }

  /** Étape 1 — Cadre : théâtre, durée, aéronef et indicatif, départ et arrivée. */
  function frameHtml() {
    const y = state.yaml,
      ac = y.aircraft?.[0] || {},
      th = String(y.mission?.theatre || ''),
      depIcao = icaoOf(y.origin),
      want = S()?.theatreOf?.(depIcao) || '',
      fams = window.MissionSkeleton?.familyCodes?.(y.mission?.type) || [],
      type = String(ac.type || '').split(/\s+/)[0].toUpperCase(),
      fold = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const theatres = [...new Set([...(S()?.THEATRES || []), th].filter(Boolean))];
    return field(t(['Théâtre', 'Theatre', 'Einsatzgebiet', 'Teatro']), 'mission.theatre', `<select data-mg="mission.theatre"><option value=""></option>${theatres.map(x => `<option${x === th ? ' selected' : ''}>${E(x)}</option>`).join('')}</select>`,
        th && want && fold(th) !== fold(want) ? warn(tf(['Théâtre {t}, mais le départ {i} est en {w}.',
          'Theatre {t}, but the departure {i} is in {w}.', 'Einsatzgebiet {t}, aber der Abflug {i} liegt in {w}.',
          'Teatro {t}, pero la salida {i} está en {w}.'
        ], {
          t: th,
          i: depIcao,
          w: want
        }), tf(['Mettre {w}', 'Set {w}', '{w} setzen', 'Poner {w}'], {
          w: want
        }), 'theatre') : '') +
      field(t(['Durée de vol (min)', 'Flight time (min)', 'Flugzeit (Min.)', 'Tiempo de vuelo (min)']), 'timing.estimated_flight_min',
        `<input type="number" min="10" step="5" data-mg="timing.estimated_flight_min" value="${E(y.timing?.estimated_flight_min ?? '')}">`) +
      field(t(['Aéronef (type OACI)', 'Aircraft (ICAO type)', 'Luftfahrzeug (ICAO-Typ)', 'Aeronave (tipo OACI)']), 'aircraft.0.type',
        `<input data-mg="aircraft.0.type" value="${E(ac.type || '')}" list="mgTypes" autocomplete="off">`,
        type && fams.length && !fams.includes(type) ? warn(tf(['{a} ne fait pas partie des appareils de la famille {f} ({l}).',
          '{a} is not among the aircraft of the {f} family ({l}).', '{a} gehört nicht zu den Luftfahrzeugen der Familie {f} ({l}).',
          '{a} no figura entre las aeronaves de la familia {f} ({l}).'
        ], {
          a: type,
          f: y.mission?.type || '',
          l: fams.slice(0, 8).join(', ')
        })) : '') +
      field(t(['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo']), 'aircraft.0.callsign', `<input data-mg="aircraft.0.callsign" value="${E(ac.callsign || '')}" list="mgCallsigns" autocomplete="off">`,
        !ac.callsign ? warn(t(['Pas d’indicatif : en choisir un (proposés depuis la flotte pour ce type).',
          'No callsign: choose one (suggested from the fleet for this type).',
          'Kein Rufzeichen: eines wählen (aus der Flotte für diesen Typ vorgeschlagen).',
          'Sin indicativo: elegir uno (propuestos desde la flota para este tipo).'
        ])) : '') +
      field(t(['Départ', 'Departure', 'Abflug', 'Salida']), 'origin', `<input data-mg-place="origin" value="${E(y.origin?.name || '')}" list="mgPlaces" autocomplete="off" title="${E(t(['Terrain, balise, point ou ville : un lieu reconnu pose ses coordonnées. Par défaut : la base de l’aéronef.', 'Airfield, beacon, point or town: a recognised place sets its coordinates. By default: the aircraft’s base.', 'Flugplatz, Funkfeuer, Punkt oder Ort: Ein erkannter Ort setzt seine Koordinaten. Standard: die Basis des Luftfahrzeugs.', 'Aeródromo, radiobaliza, punto o ciudad: un lugar reconocido fija sus coordenadas. Por defecto: la base de la aeronave.']))}">`,
        !has(y.origin) ? warn(t(['Départ sans coordonnées.', 'Departure without coordinates.', 'Abflug ohne Koordinaten.',
          'Salida sin coordenadas.'
        ])) : '') +
      field(t(['Arrivée', 'Arrival', 'Ankunft', 'Llegada']), 'destination', `<input data-mg-place="destination" value="${E(y.destination?.name || '')}" list="mgPlaces" autocomplete="off">`);
  }
  /** Étape 2 — Lieux : un lieu par ligne (nom cherché, état, rayon d'une zone, participants d'un rendez-vous). */
  function placesHtml() {
    const y = state.yaml,
      rows = placeRows(y),
      canPropose = has(y.target) && has(y.origin) && arr(y.turning_points).some(p => !has(p));
    return `<table class="mg-table"><thead><tr><th>${E(t(['Lieu', 'Place', 'Ort', 'Lugar']))}</th><th>${E(t(['Nom (terrain, balise, point, ville)', 'Name (airfield, beacon, point, town)', 'Name (Flugplatz, Funkfeuer, Punkt, Ort)', 'Nombre (aeródromo, radiobaliza, punto, ciudad)']))}</th><th>${E(t(['Position', 'Position', 'Position', 'Posición']))}</th><th></th></tr></thead><tbody>${rows.map(r => `<tr${isProp(r.path) ? ' class="mg-prop"' : ''}><td><b>${E(r.id)}</b>${chip(r.path)}</td><td><input data-mg-place="${E(r.path)}" value="${E(r.name)}" list="mgPlaces" autocomplete="off"></td><td class="small">${r.placed ? '✓' : E(t(['sans coordonnées', 'no coordinates', 'ohne Koordinaten', 'sin coordenadas']))}</td><td>${r.kind === 'zone' ? `<input type="number" min="1" step="1" data-mg="${E(r.path)}.radius_km" value="${E(r.radius ?? '')}" style="width:5em"> km` : r.kind === 'rdv' ? `<input data-mg-list="${E(r.path)}.participants" value="${E(r.participants.join(', '))}" placeholder="${E(t(['indicatifs', 'callsigns', 'Rufzeichen', 'indicativos']))}">` : ''}</td></tr>${!r.placed ? `<tr><td></td><td colspan="3">${warn(t(['Lieu sans coordonnées : tapez un nom reconnu, ou placez-le au studio.', 'Place without coordinates: type a recognised name, or place it in the studio.', 'Ort ohne Koordinaten: einen erkannten Namen eingeben oder im Studio setzen.', 'Lugar sin coordenadas: escriba un nombre reconocido o colóquelo en el estudio.']), t(['Placer au studio', 'Place in the studio', 'Im Studio setzen', 'Colocar en el estudio']), 'studio')}</td></tr>` : ''}${r.kind === 'zone' && !(+r.radius > 0) ? `<tr><td></td><td colspan="3">${warn(t(['Zone sans rayon.', 'Zone without radius.', 'Zone ohne Radius.', 'Zona sin radio.']))}</td></tr>` : ''}${r.kind === 'rdv' && !r.participants.length ? `<tr><td></td><td colspan="3">${warn(t(['Rendez-vous sans participants.', 'Rendezvous without participants.', 'Treffpunkt ohne Teilnehmer.', 'Encuentro sin participantes.']))}</td></tr>` : ''}`).join('')}</tbody></table>` +
      `<p class="mg-row">${y.target ? '' : `<button type="button" class="secondary" data-mg-act="add-target">${E(t(['+ Cible', '+ Target', '+ Zielobjekt', '+ Objetivo']))}</button> `}<button type="button" class="secondary" data-mg-act="add-zone">${E(t(['+ Zone de travail', '+ Working zone', '+ Arbeitszone', '+ Zona de trabajo']))}</button> <button type="button" class="secondary" data-mg-act="add-point">${E(t(['+ Point tournant', '+ Turning point', '+ Wendepunkt', '+ Punto de viraje']))}</button> <button type="button" class="secondary" data-mg-act="add-rdv">${E(t(['+ Rendez-vous', '+ Rendezvous', '+ Treffpunkt', '+ Encuentro']))}</button> <button type="button" class="secondary" data-mg-act="paste-points">${E(t(['Coller un tableau de points', 'Paste a table of points', 'Punktetabelle einfügen', 'Pegar una tabla de puntos']))}</button></p><div data-mg-pts></div>` +
      (canPropose ? `<p class="mg-row"><button type="button" class="secondary" data-mg-act="points">${E(t(['Proposer l’entrée et la sortie (15 NM de la cible, sur la route)', 'Propose entry and exit (15 NM from the target, on the route)', 'Ein- und Ausgang vorschlagen (15 NM vom Zielobjekt, auf der Route)', 'Proponer entrada y salida (15 NM del objetivo, en la ruta)']))}</button></p>` : '');
  }
  /** Étape 3 — Récit : titre, résumé, description ; canevas proposé quand tout est vide. */
  function storyHtml() {
    const y = state.yaml,
      n = state.narrative || {},
      sum = n.summary || y.summary || '',
      det = n.detailed || y.detailed_description || '';
    return field(t(['Titre', 'Title', 'Titel', 'Título']), 'title', `<input data-mg="title" value="${E(y.title || '')}">`, !y.title ? warn(t(['Titre vide.', 'Empty title.',
        'Leerer Titel.', 'Título vacío.'
      ])) : '') +
      field(t(['Résumé', 'Summary', 'Zusammenfassung', 'Resumen']), 'narrative.summary', `<textarea data-mg-narr="summary" rows="4">${E(sum)}</textarea>`, sum.length > 600 ? warn(tf([
        'Résumé de {n} caractères : 600 au plus conseillés (le reste va dans la description).',
        'Summary of {n} characters: 600 at most advised (the rest goes in the description).',
        'Zusammenfassung mit {n} Zeichen: höchstens 600 empfohlen (der Rest in die Beschreibung).',
        'Resumen de {n} caracteres: se aconsejan 600 como máximo (el resto va a la descripción).'
      ], {
        n: sum.length
      })) : '') +
      field(t(['Description détaillée', 'Detailed description', 'Ausführliche Beschreibung', 'Descripción detallada']),
        'narrative.detailed', `<textarea data-mg-narr="detailed" rows="8">${E(det)}</textarea>`) +
      (!sum && !det ? `<p class="mg-row"><button type="button" class="secondary" data-mg-act="canvas">${E(t(['Proposer un canevas d’après le cadre et les lieux', 'Propose a canvas from the frame and places', 'Gerüsttext aus Rahmen und Orten vorschlagen', 'Proponer un esbozo a partir del marco y los lugares']))}</button></p>` : '');
  }
  /** Étape 4 — Objectifs et risques : objectif principal, secondaires, risques en tableau (quatre colonnes, niveau). */
  function goalsHtml() {
    const y = state.yaml,
      ob = y.objectives || {},
      numbered = String(ob.primary || '').split(/\r?\n/).filter(l => /^\s*(\d+[.)]|[-*•])\s+/.test(l)).length >= 2,
      risks = arr(y.risks).map(r => typeof r === 'object' && r ? r : window.SiaMission?.parseRiskLine?.(r) || {
        hazard: String(r)
      });
    return field(t(['Objectif principal (une phrase)', 'Main objective (one sentence)', 'Hauptziel (ein Satz)',
        'Objetivo principal (una frase)'
      ]), 'objectives.primary', `<textarea data-mg="objectives.primary" rows="2">${E(ob.primary || '')}</textarea>`, numbered ? warn(t([
          'Plusieurs objectifs numérotés : le premier reste principal, les autres vont en secondaires.',
          'Several numbered objectives: the first stays main, the others become secondary.',
          'Mehrere nummerierte Ziele: Das erste bleibt Hauptziel, die anderen werden Nebenziele.',
          'Varios objetivos numerados: el primero queda como principal, los demás pasan a secundarios.'
        ]), t(['Répartir en secondaires', 'Split into secondary objectives', 'Auf Nebenziele aufteilen', 'Repartir en secundarios']),
        'split') : !ob.primary ? warn(t(['Pas d’objectif principal.', 'No main objective.', 'Kein Hauptziel.',
        'Sin objetivo principal.'
      ])) : '') +
      field(t(['Objectifs secondaires (un par ligne)', 'Secondary objectives (one per line)', 'Nebenziele (eines pro Zeile)',
        'Objetivos secundarios (uno por línea)'
      ]), 'objectives.secondary', `<textarea data-mg-lines="objectives.secondary" rows="4">${E(arr(ob.secondary).join('\n'))}</textarea>`) +
      `<p class="mg-label">${E(t(['Risques', 'Risks', 'Risiken', 'Riesgos']))}</p><table class="mg-table"><thead><tr><th>${E(t(['Danger', 'Hazard', 'Gefahr', 'Peligro']))}</th><th>${E(t(['Niveau', 'Level', 'Stufe', 'Nivel']))}</th><th>${E(t(['Conséquence', 'Consequence', 'Folge', 'Consecuencia']))}</th><th>${E(t(['Mesure', 'Mitigation', 'Maßnahme', 'Medida']))}</th><th></th></tr></thead><tbody>${risks.map((r, i) => `<tr><td><textarea data-mg-risk="${i}.hazard" rows="2">${E(r.hazard || '')}</textarea></td><td><select data-mg-risk="${i}.level"><option value="">—</option>${LEVELS.map(l => `<option value="${E(l)}"${String(r.level || '').replace('*', '') === l ? ' selected' : ''}>${E(t(LEVEL_LABEL[l]))}</option>`).join('')}</select></td><td><textarea data-mg-risk="${i}.consequence" rows="2">${E(r.consequence || '')}</textarea></td><td><textarea data-mg-risk="${i}.mitigation" rows="2">${E(r.mitigation || '')}</textarea>${r.hazard && !r.mitigation ? warn(t(['Risque sans mesure.', 'Risk without mitigation.', 'Risiko ohne Maßnahme.', 'Riesgo sin medida.'])) : ''}</td><td><button type="button" class="secondary" data-mg-risk-del="${i}" title="${E(t(['Retirer', 'Remove', 'Entfernen', 'Quitar']))}">×</button></td></tr>`).join('')}</tbody></table>
      <p class="mg-row"><button type="button" class="secondary" data-mg-act="risk">${E(t(['+ Risque', '+ Risk', '+ Risiko', '+ Riesgo']))}</button></p>
      <details class="mg-paste"><summary>${E(t(['Coller un tableau de risques (colonnes séparées par tabulation, « — » ou « | »)', 'Paste a risk table (columns separated by tab, “—” or “|”)', 'Risikotabelle einfügen (Spalten durch Tabulator, „—“ oder „|“ getrennt)', 'Pegar una tabla de riesgos (columnas separadas por tabulador, «—» o «|»)']))}</summary><textarea data-mg-paste rows="4"></textarea><button type="button" class="secondary" data-mg-act="paste">${E(t(['Ajouter ces risques', 'Add these risks', 'Diese Risiken hinzufügen', 'Añadir estos riesgos']))}</button></details>`;
  }
  /** Étape 5 — Chronologie : éditeur de la mission (MissionExercise), événements proposés depuis la route. */
  function timelineHtml() {
    const y = state.yaml,
      block = +y.timing?.estimated_block_min || 0,
      late = block ? (window.MissionExercise?.missionTimeline?.(y) || []).filter(e => e.t != null && e.t > block) : [];
    return `<p class="small">${E(t(['H = décollage prévu.', 'H = planned take-off.', 'H = geplanter Start.', 'H = despegue previsto.']))}</p><div data-mg-timeline></div>` +
      (late.length ? warn(tf(['{n} événement(s) après la fin du créneau estimé ({b} min).',
        '{n} event(s) after the end of the estimated block ({b} min).',
        '{n} Ereignis(se) nach dem Ende des geschätzten Zeitfensters ({b} Min.).',
        '{n} evento(s) tras el final de la franja estimada ({b} min).'
      ], {
        n: late.length,
        b: block
      })) : '') +
      (has(y.origin) ? `<p class="mg-row"><button type="button" class="secondary" data-mg-act="events">${E(t(['Proposer les événements de la route (entrée, cible, sortie, retour)', 'Propose route events (entry, target, exit, return)', 'Ereignisse der Route vorschlagen (Eingang, Zielobjekt, Ausgang, Rückkehr)', 'Proponer los eventos de la ruta (entrada, objetivo, salida, regreso)']))}</button></p>` : '');
  }
  /** Étape 6 — Cartes et documents : cartes proposées depuis les lieux, cartes à centre non placé, enregistrement. */
  function mapsHtml() {
    const y = state.yaml,
      bad = unplacedMaps(y),
      missing = proposedMaps(y).filter(m => !arr(y.maps).some(x => (x?.id || '') === m.id));
    return (missing.length ? `<p class="mg-row"><button type="button" class="secondary" data-mg-act="maps">${E(tf(['Proposer les cartes depuis les lieux ({n})', 'Propose maps from the places ({n})', 'Karten aus den Orten vorschlagen ({n})', 'Proponer los mapas a partir de los lugares ({n})'], {
        n: missing.length
      }))}</button> <span class="small">${E(missing.map(m => m.id).join(', '))}</span></p>` : '') +
      (bad.length ? warn(tf(['Carte(s) centrée(s) sur un lieu sans coordonnées : {l}.',
        'Map(s) centred on a place without coordinates: {l}.', 'Karte(n) auf einen Ort ohne Koordinaten zentriert: {l}.',
        'Mapa(s) centrado(s) en un lugar sin coordenadas: {l}.'
      ], {
        l: bad.map(b => `${b.map.id || b.map.filename} → ${b.ref}`).join(', ')
      }), t(['Placer au studio', 'Place in the studio', 'Im Studio setzen', 'Colocar en el estudio']), 'studio') : '') +
      `<p class="mg-row"><button type="button" class="primary" data-mg-act="save">${E(t(['Enregistrer dans le dossier', 'Save to the folder', 'Im Ordner speichern', 'Guardar en la carpeta']))}</button> <span class="small">${E(t(['Puis « Cartes du dossier final » (studio) et « Documents » ci-dessous.', 'Then “Maps of the final file” (studio) and “Documents” below.', 'Dann „Karten des Endpakets“ (Studio) und „Dokumente“ unten.', 'Luego «Mapas del dosier final» (estudio) y «Documentos» abajo.']))}</span></p>`;
  }
  /** Cartes attendues d'après les lieux (mêmes noms que le squelette) : générale, cible, détail cible, rendez-vous, zones. */
  function proposedMaps(y) {
    const id = String(y.mission?.id || ''),
      out = [{
        id: 'general',
        filename: `general${id}.png`,
        type: 'general',
        description: 'Vue d’ensemble : départ, points tournants, cible, rendez-vous, zone, arrivée.',
        include: {
          origin: true,
          destination: true,
          turning_points: true,
          target: true,
          rendezvous: true,
          zones: true
        }
      }];
    if (y.target) out.push({
      id: 'cible',
      filename: `cible${id}.png`,
      type: 'target',
      centre_ref: y.target.id || 'TARGET',
      range_km: 50,
      description: 'Abords de la cible (50 km).'
    }, {
      id: 'detail_cible',
      filename: `detail_cible${id}.png`,
      type: 'detail',
      centre_ref: y.target.id || 'TARGET',
      width_km: 8,
      height_km: 5,
      description: 'Détail de la cible (8 × 5 km).'
    });
    arr(y.rendezvous).forEach((r, k) => out.push({
      id: `detail_rdv_${k + 1}`,
      filename: `detail_rdv${id}-${k + 1}.png`,
      type: 'detail_rdv',
      centre_ref: r.id,
      width_km: 8,
      height_km: 5,
      description: `Détail du rendez-vous ${r.id} (8 × 5 km).`
    }));
    arr(y.zones).forEach((z, k) => out.push({
      id: `zone_${k + 1}`,
      filename: `zone${id}${k ? '-' + (k + 1) : ''}.png`,
      type: 'zone',
      centre_ref: z.id || `ZONE-${k + 1}`,
      range_km: 20,
      description: `Zone de travail ${z.id || 'ZONE-' + (k + 1)}.`
    }));
    return out;
  }

  // ---- propositions (posées à l'ouverture d'une étape, si le champ est vide)
  /** Propose ce qui manque à l'étape i : valeurs posées et marquées « proposé ». */
  async function proposeFor(i) {
    const y = state.yaml,
      ac = y.aircraft?.[0];
    let changed = false;
    if (STEPS[i].id !== 'frame' || !ac) return;
    const row = fleetRow(ac.type);
    if (!ac.callsign) {
      const c = S()?.callsignsFor?.(ac.type)?.[0];
      if (c) {
        ac.callsign = c;
        for (const team of arr(y.teams))
          if (team && (!team.name || String(team.name).toUpperCase() === String(y.mission?.id || '').toUpperCase())) team.name = c;
        prop('aircraft.0.callsign');
        changed = true;
      }
    }
    if (!has(y.origin) && row?.base && window.PlaceSearch) {
      const p = await PlaceSearch.lookup(row.base, {
        strict: true
      });
      if (p) {
        y.origin = {
          ...(y.origin || {}),
          name: p.name,
          lat: +p.lat,
          lon: +p.lon
        };
        if (!has(y.destination)) {
          y.destination = {
            ...y.origin
          };
          prop('destination'); // arrivée = départ, tant qu'elle n'est pas choisie
        }
        prop('origin');
        changed = true;
      }
    }
    if (!y.mission?.theatre) {
      const th = S()?.theatreOf?.(icaoOf(y.origin) || row?.base);
      if (th) {
        setPath(y, ['mission', 'theatre'], th);
        prop('mission.theatre');
        changed = true;
      }
    }
    if (changed) {
      shareMission(true);
      renderCommon?.();
    }
  }

  // ---- rendu
  let host = null;
  /** Feuille de style du guide (une fois). */
  function css() {
    if ($('missionGuideCss')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="missionGuideCss">
html.mg-on main>section[data-block-id]:not(.mg-show){display:none!important}
.mg-rail{list-style:none;padding:0;margin:6px 0 10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px}
.mg-rail button{display:grid;grid-template-columns:auto 1fr;gap:1px 8px;align-items:center;width:100%;text-align:left;padding:6px 9px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:8px;background:transparent;color:inherit;font-size:12.5px;line-height:1.3;cursor:pointer}
.mg-rail button.mg-cur{outline:2px solid var(--repo-accent,#2f6fd6);outline-offset:1px}
.mg-rail button>b{grid-row:span 2;display:inline-grid;place-items:center;width:1.5em;height:1.5em;border-radius:50%;color:#fff;background:#b45309;font-size:11px}
.mg-rail button.mg-ok>b{background:#2e7d32}.mg-rail button>small{opacity:.8}
.mg-field{margin:8px 0}.mg-field label{display:block;font-weight:600}.mg-field input,.mg-field select,.mg-field textarea{display:block;width:100%;margin-top:3px;font-weight:400}
.mg-prop input,.mg-prop select,.mg-prop textarea{border-style:dashed}
.mg-chip{margin-left:6px;padding:0 6px;font-size:11px;border-radius:9px;border:1px solid currentColor;background:transparent;color:#b45309;cursor:pointer}
.mg-warn{margin:3px 0 0;font-size:12.5px;color:#b3261e}.mg-warn button{margin-left:6px;font-size:12px;padding:1px 8px}
.mg-table{width:100%;border-collapse:collapse;font-size:12.5px}.mg-table th,.mg-table td{padding:4px 6px;text-align:left;vertical-align:top;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}
.mg-table input,.mg-table select,.mg-table textarea{width:100%}.mg-row{margin:8px 0}.mg-label{font-weight:600;margin:12px 0 4px}
.mg-next{border-top:1px solid color-mix(in srgb,currentColor 18%,transparent);padding-top:10px;margin-top:14px;display:flex;gap:8px;flex-wrap:wrap}
</style>`);
  }
  /** Le mode est-il allumé pour la mission affichée ? */
  const on = () => !!state?.yaml?.mission && !!cfg().on;
  /** Redessine le guide (et l'affichage des blocs) d'après l'état de la page. */
  function render() {
    css();
    const sec = $('missionGuide');
    if (!sec) return;
    const mode = on();
    document.documentElement.classList.toggle('mg-on', mode);
    sec.hidden = !mode;
    const tog = $('guideToggle');
    if (tog) tog.hidden = mode;
    if (!mode) return;
    const c = cfg(),
      i = Math.min(Math.max(0, c.step | 0), STEPS.length - 1),
      st = STEPS[i];
    // blocs visibles : Mission (enregistrement, ligne d'état), le guide, ceux de l'étape
    document.querySelectorAll('main>section[data-block-id]').forEach(s => s.classList.toggle('mg-show', ['mission-import',
      'mission-guide', ...st.blocks
    ].includes(s.dataset.blockId)));
    host = $('missionGuideBody');
    host.innerHTML = `<ol class="mg-rail">${STEPS.map((s, k) => `<li><button type="button" data-mg-step="${k}" class="${k === i ? 'mg-cur ' : ''}${done(k) ? 'mg-ok' : ''}"><b>${k + 1}</b><span>${E(t(s.title))}</span><small>${E(t(s.sub))}</small></button></li>`).join('')}</ol>
      <h3>${E(`${i + 1}. ${t(st.title)}`)}</h3><div data-mg-step-body>${[frameHtml, placesHtml, storyHtml, goalsHtml, timelineHtml, mapsHtml][i]()}</div>
      <div class="mg-next">${i < STEPS.length - 1 ? `<button type="button" class="primary" data-mg-go="${i + 1}">${E(t(['Suivant →', 'Next →', 'Weiter →', 'Siguiente →']))}</button>` : ''}<button type="button" class="secondary" data-mg-act="all">${E(t(['Tout afficher', 'Show everything', 'Alles anzeigen', 'Mostrar todo']))}</button></div>
      <datalist id="mgPlaces"></datalist><datalist id="mgCallsigns">${(S()?.callsignsFor?.(state.yaml.aircraft?.[0]?.type) || []).map(x => `<option value="${E(x)}">`).join('')}</datalist><datalist id="mgTypes">${[...new Set((window.DEFA_FLEET || []).map(r => r.type).filter(Boolean))].sort().map(x => `<option value="${E(x)}">`).join('')}</datalist>`;
    if (st.id === 'timeline') {
      const tl = host.querySelector('[data-mg-timeline]');
      window.MissionExercise?.missionTimelineEditor?.(tl, state.yaml, {
        onChange: () => shareMission()
      });
    }
    host.querySelectorAll('[data-mg-place]').forEach(inp => window.PlaceSearch?.attach(inp, $('mgPlaces'), p => {
      const path = inp.dataset.mgPlace,
        o = getPath(state.yaml, path.split('.').map(k => /^\d+$/.test(k) ? +k : k)) || {};
      const lat = +(+p.lat).toFixed(6),
        lon = +(+p.lon).toFixed(6);
      if (/^zones\./.test(path)) o.centre = {
        ...(o.centre || {}),
        lat,
        lon
      };
      else Object.assign(o, {
        lat,
        lon
      });
      o.name = p.name || inp.value;
      if (path === 'origin' || path === 'destination') state.yaml[path] = o;
      if (path === 'origin' && isProp('destination')) state.yaml.destination = {
        ...o
      }; // arrivée proposée = départ : suit
      prop(path, false);
      shareMission(true);
      renderAll();
    }));
    window.AppFramework?.refresh?.();
  }

  // ---- saisie
  document.addEventListener('input', e => {
    const x = e.target;
    if (!x.closest?.('#missionGuideBody')) return;
    if (x.dataset.mg) {
      const v = x.type === 'number' ? (x.value === '' ? null : +x.value) : x.value;
      put(x.dataset.mg, v);
      prop(x.dataset.mg, false);
      if (x.dataset.mg === 'timing.estimated_flight_min' && v) setPath(state.yaml, ['timing', 'estimated_block_min'], v + 20);
    } else if (x.dataset.mgNarr) {
      setNarr(x.dataset.mgNarr, x.value);
      prop(`narrative.${x.dataset.mgNarr}`, false);
      shareMission();
    } else if (x.dataset.mgLines) {
      put(x.dataset.mgLines, x.value.split(/\r?\n/).map(l => l.replace(/^\s*(\d+[.)]|[-*•])\s+/, '').trim()).filter(Boolean));
    } else if (x.dataset.mgList) {
      put(x.dataset.mgList, x.value.split(/[,;]\s*/).map(v => v.trim().toUpperCase()).filter(Boolean));
    } else if (x.dataset.mgRisk) {
      const [i, k] = x.dataset.mgRisk.split('.');
      const risks = arr(state.yaml.risks).map(r => typeof r === 'object' && r ? r : window.SiaMission?.parseRiskLine?.(r) || {
        hazard: String(r)
      });
      risks[+i] = {
        ...risks[+i],
        [k]: x.value
      };
      if (!risks[+i][k]) delete risks[+i][k];
      state.yaml.risks = risks;
      shareMission();
    }
  });
  document.addEventListener('change', e => {
    const x = e.target;
    if (!x.closest?.('#missionGuideBody')) return;
    // champs dont dépend l'affichage du guide (avertissements, indicatifs du type, théâtre) : guide redessiné
    if (x.dataset.mg === 'aircraft.0.callsign') {
      const now = String(x.value || '').trim().toUpperCase();
      for (const team of arr(state.yaml.teams))
        if (team && team.role && /équipage/.test(team.role) && !/autre/.test(team.role)) team.name = now;
      shareMission(true);
    }
    if (x.dataset.mg || x.dataset.mgRisk || x.dataset.mgNarr || x.dataset.mgList) {
      renderCommon?.();
      render();
    }
  });
  document.addEventListener('click', async e => {
    const x = e.target.closest?.('button');
    if (!x || !x.closest('#missionGuide, #guideToggle')) return;
    if (x.id === 'guideToggle') return start();
    if (x.dataset.mgStep || x.dataset.mgGo) {
      setCfg({
        step: +(x.dataset.mgStep ?? x.dataset.mgGo)
      });
      await proposeFor(+(x.dataset.mgStep ?? x.dataset.mgGo));
      render();
      $('missionGuide')?.scrollIntoView({
        block: 'start'
      });
      return;
    }
    if (x.dataset.mgOk) {
      prop(x.dataset.mgOk, false);
      return render();
    }
    if (x.dataset.mgRiskDel) {
      const risks = arr(state.yaml.risks);
      risks.splice(+x.dataset.mgRiskDel, 1);
      state.yaml.risks = risks;
      shareMission(true);
      return render();
    }
    const fix = x.dataset.mgFix,
      act = x.dataset.mgAct,
      y = state.yaml;
    if (fix === 'theatre') {
      setPath(y, ['mission', 'theatre'], S()?.theatreOf?.(icaoOf(y.origin)));
      prop('mission.theatre', false);
    } else if (fix === 'split') window.SiaMission?.tidyMission?.(y);
    else if (fix === 'studio') {
      shareMission(true);
      location.href = 'map_parser.html';
      return;
    } else if (act === 'all') return stop();
    else if (act === 'paste-points') {
      // tableau collé : aperçu sous les boutons (shared/point_table.js), ajout sur « Ajouter n points »
      window.PointTable?.run(host.querySelector('[data-mg-pts]'), {
        yaml: () => state.yaml,
        onAdded: () => {
          shareMission(true);
          renderAll();
        }
      });
      return;
    } else if (act === 'add-target') y.target = {
      id: 'TARGET',
      name: '',
      lat: null,
      lon: null,
      time_on_task_min: 20
    };
    else if (act === 'add-zone') {
      const n = arr(y.zones).length + 1;
      y.zones = [...arr(y.zones), {
        id: `ZONE-${n}`,
        name: '',
        kind: 'mission',
        centre: {
          lat: null,
          lon: null
        },
        radius_km: 10,
        role: 'zone de travail',
        time_on_task_min: 30
      }];
    } else if (act === 'add-point') {
      const n = arr(y.turning_points).length + 1;
      y.turning_points = [...arr(y.turning_points), {
        id: `PT${n}`,
        name: '',
        lat: null,
        lon: null,
        role: n === 1 ? 'aller' : n === 2 ? 'retour' : '',
        time_on_task_min: 0
      }];
    } else if (act === 'add-rdv') {
      const n = arr(y.rendezvous).length + 1,
        cs = y.aircraft?.[0]?.callsign;
      y.rendezvous = [...arr(y.rendezvous), {
        id: `RDV-${n}`,
        name: '',
        lat: null,
        lon: null,
        participants: cs ? [cs] : [],
        role: 'jonction',
        time_on_task_min: 10
      }];
    } else if (act === 'risk') y.risks = [...arr(y.risks), {
      hazard: '',
      level: '',
      mitigation: ''
    }];
    else if (act === 'paste') {
      const txt = host.querySelector('[data-mg-paste]').value;
      y.risks = [...arr(y.risks), ...txt.split(/\r?\n/).filter(l => l.trim())];
      window.SiaMission?.tidyMission?.(y); // lignes à colonnes → risques, les autres → notes
    } else if (act === 'points') {
      const tp = arr(y.turning_points),
        inPt = tp.find(p => /aller|entr/i.test(p.role || p.name || '') && !has(p)) || tp.find(p => !has(p)),
        outPt = tp.find(p => p !== inPt && /retour|sort/i.test(p.role || p.name || '') && !has(p)) || tp.find(p => p !== inPt && !
          has(p)),
        dest = has(y.destination) ? y.destination : y.origin;
      const a = toward(y.target, y.origin, 15),
        b = toward(y.target, dest, 15);
      tp.forEach((p, k) => {
        if (p === inPt && a) {
          Object.assign(p, a);
          prop(`turning_points.${k}`);
        }
        if (p === outPt && b) {
          Object.assign(p, b);
          prop(`turning_points.${k}`);
        }
      });
    } else if (act === 'canvas') {
      const fam = (window.MissionOrder?.families?.() || []).find(f => f.id === y.mission?.type),
        ac = y.aircraft?.[0] || {},
        dur = +y.timing?.estimated_flight_min || 0;
      setNarr('summary', tf([
        'Mission {f}{s} : {a} {c} au départ de {d}, vers {t}{z}, pour environ {h}. À réécrire : contexte, ce que l’équipage doit accomplir, contraintes.',
        'Mission {f}{s}: {a} {c} departing {d}, towards {t}{z}, for about {h}. To rewrite: context, what the crew must achieve, constraints.',
        'Mission {f}{s}: {a} {c} ab {d}, Richtung {t}{z}, für etwa {h}. Umzuschreiben: Kontext, was die Besatzung erreichen muss, Einschränkungen.',
        'Misión {f}{s}: {a} {c} con salida de {d}, hacia {t}{z}, durante unos {h}. Por reescribir: contexto, lo que la tripulación debe lograr, restricciones.'
      ], {
        f: fam ? t(fam.label || [fam.id]) || fam.id : y.mission?.type || '',
        s: y.mission?.subtype ? ` (${y.mission.subtype})` : '',
        a: ac.type || '',
        c: ac.callsign || '',
        d: y.origin?.name || '?',
        t: y.target?.name || y.target?.id || '?',
        z: arr(y.zones)[0] ? `, ${arr(y.zones)[0].name || arr(y.zones)[0].id}` : '',
        h: dur ? window.MissionEstimate?.hm?.(dur) || `${dur} min` : '?'
      }));
      setNarr('detailed', t([
        'Situation. — Mission. — Exécution : départ, transit, travail sur zone, retour. — Coordination. — Consignes particulières.',
        'Situation. — Mission. — Execution: departure, transit, work on area, return. — Coordination. — Special instructions.',
        'Lage. — Auftrag. — Durchführung: Abflug, Transit, Arbeit im Gebiet, Rückkehr. — Koordinierung. — Besondere Anweisungen.',
        'Situación. — Misión. — Ejecución: salida, tránsito, trabajo en la zona, regreso. — Coordinación. — Consignas particulares.'
      ]));
      prop('narrative.summary');
      prop('narrative.detailed');
    } else if (act === 'events') {
      const est = window.MissionEstimate?.estimate?.(y);
      if (est?.ok) {
        const hText = window.RepositoryKit?.hText || (m => `H+${m}mn`),
          ev = [];
        let acc = 0;
        for (const l of est.legs || []) {
          acc += l.min;
          const to = l.to || {},
            last = l === est.legs[est.legs.length - 1];
          ev.push({
            at: hText(Math.round(acc)),
            place: String(to.id || '').toUpperCase(),
            text: last ? t(['Retour au terrain', 'Back at the airfield', 'Zurück am Flugplatz', 'Regreso al aeródromo']) : tf([
              'Arrivée {p}', 'Arrival {p}', 'Ankunft {p}', 'Llegada {p}'
            ], {
              p: to.name || to.id || ''
            })
          });
          if (l.task) {
            acc += l.task;
            ev.push({
              at: hText(Math.round(acc)),
              place: String(to.id || '').toUpperCase(),
              text: tf(['Fin du travail ({p})', 'End of work ({p})', 'Arbeitsende ({p})', 'Fin del trabajo ({p})'], {
                p: to.name || to.id || ''
              })
            });
          }
        }
        y.timeline = {
          ...(y.timeline || {}),
          events: [...arr(y.timeline?.events), ...ev.filter(e => !arr(y.timeline?.events).some(o => o.at === e.at && o.place === e
            .place))]
        };
        prop('timeline.events');
      } else setStatus?.(t(['Route non calculable : placer d’abord le départ et les lieux.',
        'Route cannot be computed: place the departure and places first.',
        'Route nicht berechenbar: zuerst Abflug und Orte setzen.',
        'Ruta no calculable: colocar primero la salida y los lugares.'
      ]), 'err');
    } else if (act === 'maps') {
      const missing = proposedMaps(y).filter(m => !arr(y.maps).some(x => (x?.id || '') === m.id));
      y.maps = [...arr(y.maps), ...missing];
      prop('maps');
    } else if (act === 'save') {
      $('saveToFolder')?.click();
      return;
    } else return;
    shareMission(true);
    renderAll();
  });

  /** Allume le mode pour la mission affichée (étape gardée), propositions de l'étape posées. */
  async function start() {
    setCfg({
      on: true
    });
    await proposeFor(cfg().step | 0);
    render();
    $('missionGuide')?.scrollIntoView({
      block: 'start'
    });
  }
  /** Éteint le mode (mise en page complète) pour la mission affichée. */
  function stop() {
    setCfg({
      on: false
    });
    document.querySelectorAll('main>section.mg-show').forEach(s => s.classList.remove('mg-show'));
    render();
  }
  window.MissionGuide = {
    render,
    start,
    stop,
    on
  };
})();
