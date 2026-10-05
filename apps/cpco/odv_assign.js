(() => {
  'use strict';
  // Planning ODV ↔ affectations des missions (docs/AFFECTATION_MISSIONS.md) : déclarations des pilotes (disponibilités
  // d'une heure ramenées aux créneaux matin / après-midi / soir, appareils) et affectations de la semaine, pour la
  // grille (seconde ligne par pilote : sa déclaration ; non affecté et disponible : encadré rouge ; affecté : n° de la
  // mission) et pour affecter depuis un créneau (dialogue « Affecter… », pilotes et heure préremplis).
  // Outils communs : shared/assignments.js (MissionAssignments) ; dialogue : shared/assign_dialog.js (AssignDialog).
  // API (window.OdvAssign) : load(données ODV, réglages), declaration(TRI), range(j, k), declared(TRI, j, k), assigned(TRI, j, k),
  //   free(TRI, j, k), slotAt(ms), freePilots(j, k), freeOver(TRI, début, fin), slotsOver(début, fin), pilots(), inSlot(j, k), week(),
  //   line(TRI, j, k, cellule), assign(entrée, [TRI…], début, note), write(entrée, lignes, décollage)
  const M = () => window.MissionAssignments;
  const esc = s => window.RepositoryKit.esc(s);
  const L = (row, vals) => window.RepositoryKit.tf(row, vals); // phrase traduite, valeurs {clé} insérées (shared/kit.js)
  let D = null, // données ODV (dates, pilotes)
    S = null, // réglages (heures des créneaux)
    decl = {}, // TRI → déclaration (grille, appareils)
    prefs = {}, // TRI → préférences de thèmes (fiche utilisateur)
    list = [], // affectations (index)
    journal = []; // journal des affectations (récentes d'abord)
  const hooks = []; // à rappeler après une affectation (grille redessinée)

  /** Charge déclarations (data/disponibilites/<TRI>.json, ou celles de ce navigateur) et affectations. */
  async function load(data, settings) {
    D = data;
    S = settings;
    decl = {};
    if (!data || !M()) return;
    list = (await M().index({
      fresh: true
    })).assignments;
    journal = await M().readLog().catch(() => []);
    prefs = {};
    await Promise.all(data.pilotes.map(async p => {
      decl[p.trigramme] = await M().availability(p.trigramme);
      // préférences de thèmes (fiche utilisateur) : aussi pour les pilotes sans déclaration (codes du classeur)
      prefs[p.trigramme] = decl[p.trigramme]?.prefs ?? await window.SuiteUsers?.themePrefs?.(p.trigramme).catch(() => null) ?? null;
    }));
  }
  /** Plage d'un créneau (jour j, créneau k) : [début, fin] en ms ; null sans date. */
  const range = (j, k) => D?.dates?.[j] && S?.hours?.[k] ? M().slotRange(D.dates[j], S.hours[k][0], S.hours[k][1]) : null;
  /** Déclaration du pilote sur le créneau : { code, label, dispo } ; null si non renseignée. */
  const declared = (tri, j, k) => {
    const r = range(j, k);
    return r ? M().declaredOver(decl[tri], r[0], r[1]) : null;
  };
  /** Affectations du pilote (ou convoyages) qui recouvrent le créneau. */
  const assigned = (tri, j, k) => {
    const r = range(j, k);
    return r ? M().assignedOver(list, tri, r[0], r[1]) : [];
  };
  /** Disponible (déclaration, sinon classeur) et non affecté sur le créneau. */
  const free = (tri, j, k, xlRecord) => {
    const d = declared(tri, j, k);
    const dispo = d ? d.dispo : xlRecord?.categorie === 'dispo';
    return dispo && !assigned(tri, j, k).length;
  };
  /** Pilotes libres d'un créneau : disponibles (déclaration, sinon classeur) et non affectés. */
  const freePilots = (j, k) => (D?.pilotes || []).map(p => p.trigramme).filter(tr => free(tr, j, k, (D.records || []).find(r => r.pilote === tr && r.jourIndex === j && r.creneauIndex === k)));
  /** Créneau (jour, créneau) qui contient l'heure ms ; null hors de la semaine ou entre deux créneaux. */
  const slotAt = ms => {
    for (const [j] of(D?.dates || []).entries())
      for (const [k] of(S?.hours || []).entries()) {
        const r = range(j, k);
        if (r && ms >= r[0] && ms < r[1]) return [j, k];
      }
    return null;
  };
  /** Libre sur toute une plage (mission sur plusieurs créneaux, convoyage sur un créneau antérieur) : chaque heure
   *  disponible (déclaration du pilote, sinon ligne du classeur pour le créneau de cette heure) et aucune affectation
   *  qui la recouvre. */
  const freeOver = (tri, from, to) => {
    if (!(to > from) || M().assignedOver(list, tri, from, to).length) return false;
    for (let h = Math.floor(from / 36e5) * 36e5; h < to; h += 36e5) {
      const a = M().availabilityAt(decl[tri], Math.max(h, from));
      if (a) {
        if (a.category !== 'dispo') return false;
        continue;
      }
      const s = slotAt(Math.max(h, from)),
        rec = s && (D.records || []).find(r => r.pilote === tri && r.jourIndex === s[0] && r.creneauIndex === s[1]);
      if (rec?.categorie !== 'dispo') return false;
    }
    return true;
  };
  /** Créneaux recouverts par une plage : [[j, k]…], dans l'ordre. */
  const slotsOver = (from, to) => {
    const out = [];
    for (const [j] of(D?.dates || []).entries())
      for (const [k] of(S?.hours || []).entries()) {
        const r = range(j, k);
        if (r && r[0] < to && r[1] > from) out.push([j, k]);
      }
    return out;
  };
  /** Convoyages à affecter (ligne « convoyage » sans pilote) qui recouvrent le créneau. */
  const openFerries = (j, k) => {
    const r = range(j, k);
    return r ? list.filter(a => a.role === 'convoyage' && !a.pilot && a.status !== 'annulée' && (([f, l]) => f < r[1] && l > r[0])(M().busyRange(a))) : [];
  };
  /** Confie un convoyage à affecter (ligne de l'index) au pilote tri : participants de la mission réécrits, convoyeur posé. */
  async function assignFerry(line, tri) {
    const keys = ['pilot', 'callsign', 'aircraft', 'departure', 'takeoff', 'ferry', 'block_min', 'status'];
    const lines = list.filter(a => a.mission === line.mission && a.role !== 'convoyage');
    const parts = lines.map(a => Object.fromEntries(keys.filter(k => k in a).map(k => [k, a[k]])));
    const p = parts.find(x => x.pilot === line.for_pilot && x.aircraft?.registration === line.aircraft?.registration && x.ferry?.open);
    if (!p) throw new Error(L(['convoyage de {m} introuvable dans ses affectations', 'ferry of {m} not found in its assignments', 'Überführung von {m} in ihren Zuweisungen nicht gefunden', 'traslado de {m} no encontrado en sus asignaciones'], { m: line.mission }));
    p.ferry = {
      ...p.ferry,
      pilot: tri,
      open: false
    };
    const f = await M().writeAssignment({
      id: line.mission,
      title: line.title,
      type: line.type,
      folder: line.folder,
      files: [line.files?.yaml, line.files?.md].filter(Boolean),
      maps: line.files?.maps || []
    }, parts, {
      h_hour: lines[0]?.h_hour || null,
      alert: lines[0]?.alert || null
    });
    await load(D, S);
    hooks.forEach(h => h());
    return f;
  }
  /** Missions déjà affectées (affectation non annulée) qui commencent avant until (ms) : semaine affichée et passé. */
  const missionsAssigned = until => new Set(list.filter(a => a.status !== 'annulée' && M().busyRange(a)[0] < until).map(a => a.mission));
  /** Affectations qui recouvrent un créneau (tous pilotes). */
  const inSlot = (j, k) => {
    const r = range(j, k);
    return r ? list.filter(a => a.status !== 'annulée' && (([f, l]) => f < r[1] && l > r[0])(M().busyRange(a))) : [];
  };
  /** Affectations de la semaine affichée, par heure. */
  const week = () => {
    if (!D?.dates) return [];
    const from = Date.parse(`${D.dates[0]}T00:00:00Z`),
      to = from + 7 * 864e5;
    return list.filter(a => a.status !== 'annulée' && (([f]) => f >= from && f < to)(M().busyRange(a))).sort((x, y) => M().busyRange(x)[0] - M().busyRange(y)[0]);
  };
  /** Seconde ligne de la case (déclaration du pilote) : code coloré par codeCell (même rendu que la ligne du classeur),
   *  encadré rouge si disponible et non affecté, n° de mission si affecté ; cliquable : affecter sur ce créneau. */
  function line(tri, j, k, xlRecord, codeCell) {
    const d = declared(tri, j, k),
      a = assigned(tri, j, k),
      isFree = free(tri, j, k, xlRecord),
      decl = d?.groupe && window.SuiteDispos ? catCell(d) : d ? codeCell({
        code: d.code,
        sens: d.label,
        categorie: M().LEGEND[d.code]?.[1] || d.category,
        source: L(['déclaration du pilote (Mes missions)', 'pilot declaration (My missions)', 'Angabe des Piloten (Meine Missionen)', 'declaración del piloto (Mis misiones)'])
      }) : `<span class="odv-code c-inconnu" title="${esc(L(['Pas de déclaration du pilote', 'No pilot declaration', 'Keine Angabe des Piloten', 'Sin declaración del piloto']))}">·</span>`;
    const ferry = L(['convoyage', 'ferry', 'Überführung', 'traslado']);
    const title = a.length ? L(['Affecté : {m}', 'Assigned: {m}', 'Zugewiesen: {m}', 'Asignado: {m}'], {
      m: a.map(x => `${x.mission}${x.role === 'convoyage' ? ` (${ferry})` : ''}`).join(', ')
    }) : isFree ? L(['Disponible, non affecté : cliquer pour affecter une mission sur ce créneau', 'Available, not assigned: click to assign a mission on this slot', 'Verfügbar, nicht zugewiesen: klicken, um diesem Zeitfenster eine Mission zuzuweisen', 'Disponible, sin asignar: haga clic para asignar una misión en esta franja']) : L(['Cliquer pour affecter une mission sur ce créneau', 'Click to assign a mission on this slot', 'Klicken, um diesem Zeitfenster eine Mission zuzuweisen', 'Haga clic para asignar una misión en esta franja']);
    return `<span class="odv-decl${isFree ? ' odv-free' : ''}" data-odv-slot="${j}${k}" data-tri="${esc(tri)}" title="${esc(title)}">${decl}${a.length ? `<b class="odv-asg">${esc(a[0].mission)}${a.length > 1 ? '+' : ''}</b>` : ''}</span>`;
  }
  /** Déclaration par catégories, même rendu que la grille de Mes missions (shared/dispos_editor.js) : lettre de chaque
   *  catégorie du créneau (O, SC, D+, SC-…) sur sa couleur (plusieurs : bandes) ; groupe, catégories et thèmes ouverts
   *  dans l'infobulle. Ancienne grille sans catégorie : lettre du groupe (groupCell). */
  function catCell(d) {
    const SD = window.SuiteDispos,
      K = window.RepositoryKit;
    const cs = [...new Set((d.details || [d]).map(x => x.categorie).filter(Boolean))].map(id => SD.category(id)).filter(Boolean);
    if (!cs.length || !SD.code) return groupCell(d);
    const cols = cs.map(SD.color),
      bg = cols.length === 1 ? cols[0] : `linear-gradient(135deg,${cols.map((c, n) => `${c} ${n * 100 / cols.length}% ${(n + 1) * 100 / cols.length}%`).join(',')})`,
      ink = (K.color.luminance(cols[0]) ?? 1) < .4 ? '#fff' : '#1b1b1b';
    const tip = [SD.label(SD.group(d.groupe)?.label || d.groupe), ...cs.map(c => `· ${SD.code(c)} ${SD.label(c.label)}`), K.t(['déclaration du pilote (Mes missions)', 'pilot declaration (My missions)', 'Pilotenangabe (Meine Missionen)', 'declaración del piloto (Mis misiones)'])].join('\n');
    return `<span class="odv-code c-${esc(d.category || 'inconnu')}" style="background:${esc(bg)};color:${ink}" title="${esc(tip)}">${esc(cs.map(SD.code).filter(Boolean).join('/'))}</span>`;
  }
  /** Pastille d'une catégorie pour la légende (lettre sur sa couleur, libellé court), comme la palette de Mes missions. */
  function catChip(c) {
    const SD = window.SuiteDispos,
      K = window.RepositoryKit,
      col = SD.color(c),
      ink = (K.color.luminance(col) ?? 1) < .4 ? '#fff' : '#1b1b1b';
    return `<span><span class="odv-code" style="background:${esc(col)};color:${ink}" title="${esc(`${SD.code(c)} — ${SD.label(c.label)}`)}">${esc(SD.code(c))}</span> ${esc(SD.shortLabel(c))}</span>`;
  }
  /** Déclaration regroupée (docs/DISPOS_ET_REORGANISATION.md § 1.2) : lettre (court : D, E, O, I) et couleur du groupe
   *  (Disponible, Exercice DEFA, Occupé, Indisponible) ; catégories et thèmes ouverts dans l'infobulle. */
  function groupCell(d) {
    const SD = window.SuiteDispos,
      K = window.RepositoryKit,
      g = SD.group(d.groupe) || {},
      name = SD.label(g.label || d.groupe),
      col = window.RepositoryNav?.chartColor?.(g.couleur || '#BFBFBF') || g.couleur || '#BFBFBF',
      ink = (K.color.luminance(col) ?? 1) < .35 ? '#fff' : '#1b1b1b';
    const tip = [name, ...(d.details || [d]).map(x => `· ${x.label}`), K.t(['déclaration du pilote (Mes missions)', 'pilot declaration (My missions)', 'Pilotenangabe (Meine Missionen)', 'declaración del piloto (Mis misiones)'])].join('\n');
    return `<span class="odv-code c-${esc(d.category || 'inconnu')}" style="background:${esc(col)};color:${ink}" title="${esc(tip)}">${esc(g.court || name.slice(0, 1).toUpperCase())}</span>`;
  }
  /** Yaml d'une mission du registre (fetch) ; {} si illisible. */
  async function yamlOf(m) {
    // dossier des missions autorisé d'abord (même hors de la copie servie), sinon copie servie
    // le yaml de la mission, pas affectations.yaml (posé dans le même dossier à la première affectation)
    const file = (m.files || []).find(f => /\.ya?ml$/i.test(f) && !/^affectations/i.test(f)),
      found = await M().missionFirst(m.folder, [file, `mission${m.id}.yaml`, `mission${String(m.id).replace('-', '')}.yaml`]);
    try {
      return found ? window.jsyaml.load(found.value.replace(/^#.*\n/, '')) || {} : {};
    } catch {
      return {}; // mission illisible : entrée du registre seule
    }
  }
  /** Ouvre le dialogue d'affectation pour une mission du registre, pilotes et heure préremplis (sans pilotes : son
   *  affectation enregistrée, à modifier) ; rend la fenêtre, qui émet « reloaded » une fois les affectations relues. */
  async function assign(m, pilots, takeoff, note = '') {
    if (!window.AssignDialog) throw new Error(L(['Dialogue d’affectation absent', 'Assignment dialog missing', 'Zuweisungsdialog fehlt', 'Falta el diálogo de asignación']));
    const y = await yamlOf(m);
    const dlg = await window.AssignDialog.open(m, y, {
      maps: m.images || [],
      pilots,
      takeoff,
      note
    });
    dlg?.addEventListener('assigned', async () => {
      await load(D, S);
      hooks.forEach(f => f());
      dlg.dispatchEvent(new CustomEvent('reloaded'));
    }, {
      once: true
    });
    return dlg;
  }

  /** Affecte directement (matrice du créneau) : rows [{ pilot, registration, callsign, ferryPilot }] ; takeoff :
   *  décollage de la mission (début du créneau, ou décalé pour le convoyage) ; dep : départ (departureOf) ; puis relit
   *  et prévient. */
  async function write(m, rows, takeoff, dep = null) {
    const M = window.MissionAssignments,
      y = await yamlOf(m);
    const parts = await M.buildParticipants(y, rows, takeoff, dep);
    const f = await M.writeAssignment({
      ...m,
      maps: m.images || []
    }, parts, {});
    await load(D, S);
    hooks.forEach(h => h());
    return f;
  }

  window.OdvAssign = {
    load,
    groupCell,
    catCell,
    catChip,
    declaration: tri => decl[tri] || null,
    /** Préférences de thèmes d'un pilote (missions probables : thèmes ouverts des codes du classeur). */
    prefsOf: tri => prefs[tri] || null,
    range,
    slotAt,
    declared,
    assigned,
    free,
    line,
    assign,
    write,
    yamlOf,
    freePilots,
    freeOver,
    slotsOver,
    missionsAssigned,
    openFerries,
    assignFerry,
    pilots: () => (D?.pilotes || []).map(p => p.trigramme),
    inSlot,
    week,
    journal: () => journal,
    onChange: f => hooks.push(f)
  };
})();
