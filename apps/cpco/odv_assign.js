(() => {
  'use strict';
  // Planning ODV ↔ affectations des missions (docs/AFFECTATION_MISSIONS.md) : déclarations des pilotes (disponibilités
  // d'une heure ramenées aux créneaux matin / après-midi / soir, appareils) et affectations de la semaine, pour la
  // grille (seconde ligne par pilote : sa déclaration ; non affecté et disponible : encadré rouge ; affecté : n° de la
  // mission) et pour affecter depuis un créneau (dialogue « Affecter… », pilotes et heure préremplis).
  // Outils communs : shared/assignments.js (MissionAssignments) ; dialogue : shared/assign_dialog.js (AssignDialog).
  // API (window.OdvAssign) : load(données ODV, réglages), declaration(TRI), range(j, k), declared(TRI, j, k), assigned(TRI, j, k),
  //   free(TRI, j, k), freePilots(j, k), inSlot(j, k), week(), line(TRI, j, k, cellule), assign(entrée, [TRI…], début, note)
  const M = () => window.MissionAssignments;
  const esc = s => window.RepositoryKit.esc(s);
  let D = null, // données ODV (dates, pilotes)
    S = null, // réglages (heures des créneaux)
    decl = {}, // TRI → déclaration (grille, appareils)
    list = []; // affectations (index)
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
    await Promise.all(data.pilotes.map(async p => {
      decl[p.trigramme] = await M().availability(p.trigramme);
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
      decl = d ? codeCell({
        code: d.code,
        sens: d.label,
        categorie: M().LEGEND[d.code][1],
        source: 'déclaration du pilote (Mes missions)'
      }) : '<span class="odv-code c-inconnu" title="Pas de déclaration du pilote">·</span>';
    const title = a.length ? `Affecté : ${a.map(x => `${x.mission}${x.role === 'convoyage' ? ' (convoyage)' : ''}`).join(', ')}` : isFree ? 'Disponible, non affecté : cliquer pour affecter une mission sur ce créneau' : 'Cliquer pour affecter une mission sur ce créneau';
    return `<span class="odv-decl${isFree ? ' odv-free' : ''}" data-odv-slot="${j}${k}" data-tri="${esc(tri)}" title="${esc(title)}">${decl}${a.length ? `<b class="odv-asg">${esc(a[0].mission)}${a.length > 1 ? '+' : ''}</b>` : ''}</span>`;
  }
  /** Ouvre le dialogue d'affectation pour une mission du registre, pilotes et heure préremplis (yaml lu par fetch). */
  async function assign(m, pilots, takeoff, note = '') {
    if (!window.AssignDialog) throw new Error('Dialogue d’affectation absent');
    const root = window.RepositoryNav?.root || new URL('../../', location.href).href,
      file = (m.files || []).find(f => /\.ya?ml$/i.test(f)) || `mission${m.id}.yaml`;
    let y = {};
    try {
      const r = await fetch(new URL(`data/missions/${m.folder}/${file}`, root).href, {
        cache: 'no-store'
      });
      if (r.ok) y = window.jsyaml.load((await r.text()).replace(/^#.*\n/, '')) || {};
    } catch {
      /* mission illisible : dialogue sur l'entrée du registre */ }
    const dlg = await window.AssignDialog.open(m, y, {
      maps: m.images || [],
      pilots,
      takeoff,
      note
    });
    dlg?.addEventListener('assigned', async () => {
      await load(D, S);
      hooks.forEach(f => f());
    }, {
      once: true
    });
  }

  window.OdvAssign = {
    load,
    declaration: tri => decl[tri] || null,
    range,
    declared,
    assigned,
    free,
    line,
    assign,
    freePilots,
    inSlot,
    week,
    onChange: f => hooks.push(f)
  };
})();
