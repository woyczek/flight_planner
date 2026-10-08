// Planificateur de performances (flight_performance_planner.html) : habillage commun — blocs repliables
// et déplaçables, barre d'état « profil modifié » (enregistrer / recharger / supprimer), confirmation avant
// de quitter un profil non enregistré, tri de la table RPM, rendu du profil moteur.
(() => {
  // Copie profonde (profils). rawSetActive / rawListAircraft : fonctions d'origine de la page, avant leur surcharge plus bas.
  const clone = o => structuredClone(o);
  const rawSetActive = setActive,
    rawListAircraft = listAircraft;
  const css = document.createElement("style");
  css.textContent = `
    body.has-status-bar{padding-bottom:52px}.status-bar{position:fixed;z-index:900;left:0;right:0;bottom:0;display:flex;align-items:center;gap:8px;padding:7px 14px;background:#0c1015ee;border-top:1px solid var(--b);backdrop-filter:blur(8px)}.status-bar .status-text{flex:1;color:var(--mut);font-size:12px}.status-bar.dirty .status-text{color:#f2c879}
    .block-heading{display:flex;align-items:center;gap:8px;margin-bottom:10px;cursor:grab}.block-heading h2{flex:1;margin:0}.block-tools{display:flex;gap:5px}.block-tools button{padding:4px 7px;font-size:11px}.collapsible.collapsed>:not(.block-heading){display:none!important}.dragging{opacity:.45}.drop-before{box-shadow:0 -3px 0 var(--a)}
    .phase-table{table-layout:auto}.phase-table th:first-child,.phase-table td:first-child{text-align:left;width:100%}.phase-table th:not(:first-child),.phase-table td:not(:first-child){text-align:right;white-space:nowrap;width:1%}.carto-value{color:#75c8ff}.profile-value{color:#f0b86e}.phase-table td div+div{margin-top:3px}.carto-split{display:block;margin-top:4px;padding-top:4px;border-top:1px solid var(--b)}.source-note{display:block;color:var(--mut);font-size:10px}.engine-performance-group{margin-top:16px;padding:12px;border:1px solid var(--b);border-radius:8px;overflow:auto}.engine-performance-group h3{font-size:13px;margin:0 0 8px}#engineCurveTable{min-width:0;table-layout:fixed}#engineCurveTable th:last-child,#engineCurveTable td:last-child{width:30%;white-space:normal;overflow-wrap:anywhere;text-align:left}svg.engine-chart{min-width:0;height:255px;margin:10px 0}.opt-chart .band-fill{fill:var(--fc-prof,#75c8ff);fill-opacity:.13;stroke:none}
    #unsavedDialog{max-width:520px}#unsavedDialog .dialog-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px}
    @media(max-width:800px){.status-bar{flex-wrap:wrap}.status-bar .status-text{flex-basis:100%;order:2}.phase-table{min-width:680px}}
  `;
  document.head.appendChild(css);

  // Préférences d'affichage des blocs : repliés (blockPrefs, par id) et ordre (blockOrder) ; l'éditeur de profil est toujours affiché au chargement.
  state.blockPrefs = state.blockPrefs || {
    calibration: true,
    json: true
  };
  state.blockOrder = state.blockOrder || [];
  state.profileEditorHidden = false;

  // Regroupement : la table RPM rejoint la fiche « Performances moteur » avec sa courbe (SVG #engineCurveChart, colonnes triables).
  const engineCard = [...document.querySelectorAll(".card")].find(c => c.querySelector("h2")?.textContent.includes(
    "Fiche performance moteur"));
  const curveCard = [...document.querySelectorAll(".card")].find(c => c.querySelector("h2")?.textContent.includes("Table RPM"));
  if (engineCard && curveCard) {
    engineCard.querySelector("h2").textContent = "Performances moteur — RPM / puissance / consommation";
    engineCard.classList.remove("span12");
    engineCard.classList.add("span6");
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "engineCurveChart";
    svg.classList.add("opt-chart", "engine-chart"); // même habillage que les autres graphiques de la page (et des designs)
    svg.setAttribute("viewBox", "0 0 760 255");
    let table = curveCard.querySelector("table"),
      group = document.createElement("section"),
      heading = document.createElement("h3");
    heading.textContent = "Courbe RPM / puissance → consommation";
    group.className = "engine-performance-group";
    table.id = "engineCurveTable";
    table.querySelector("thead").innerHTML =
      '<tr><th data-sort="rpm">RPM / N1 ↕</th><th data-sort="fuelFlowMin">Min. ↕</th><th data-sort="fuelFlowPerHour">Nominal ↕</th><th data-sort="fuelFlowMax">Max. ↕</th><th data-sort="phaseLabel">Régime de vol ↕</th><th>Commentaire</th></tr>';
    group.append(heading, svg);
    engineCard.append(group);
    curveCard.dataset.blockId = "rpm-table";
    curveCard.classList.remove("span12");
    curveCard.classList.add("span6");
    engineCard.after(curveCard)
  }

  // Bloc « Profil actif » renommé « Régimes de vol — profil ↔ cartographie ».
  const profileCard = $("profile")?.closest(".card");
  if (profileCard) profileCard.querySelector("h2").textContent = "Régimes de vol — profil ↔ cartographie";
  // Régimes de vol : groupe repliable du bloc Résultat, sous la fiche du curseur (⌖ / 📌). Le bloc Résultat est un
  // cadre semi-mobile du framework (StickyFrame.follow, posé par shared/flight_perf_view.js). Niveau Expert seulement
  // (profil, airframe SimBrief : édition du profil).
  const resultCard = document.querySelector('[data-block-id="result"]');
  if (profileCard && resultCard) {
    const group = document.createElement("details"),
      title = document.createElement("summary");
    group.className = "result-group";
    group.dataset.group = "flight-regimes";
    group.dataset.minLevel = "4";
    title.textContent = profileCard.querySelector("h2").textContent;
    group.append(title, ...[...profileCard.children].filter(x => x.tagName !== "H2"));
    resultCard.append(group);
    profileCard.remove()
  }
  // La traçabilité de calibration rejoint le bloc « Calibration SimBrief » (un seul bloc pleine largeur).
  const calibrationCard = [...document.querySelectorAll(".card")].find(c => c.querySelector("h2")?.textContent.includes(
    "Calibration SimBrief"));
  const traceCard = [...document.querySelectorAll(".card")].find(c => c.querySelector("h2")?.textContent.includes("Traçabilité"));
  if (calibrationCard && traceCard) {
    let h = document.createElement("h3");
    h.textContent = "Traçabilité de calibration";
    h.style.marginTop = "16px";
    calibrationCard.append(h, $("calibrationMeta"));
    traceCard.remove();
    calibrationCard.classList.remove("span6");
    calibrationCard.classList.add("span12")
  }

  // Identifiant de bloc tiré de son titre (sans accents, minuscules, tirets) ; grid : grille des blocs de la page.
  const idFor = txt => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g,
    "");
  const grid = document.querySelector(".wrap>.grid");
  // Blocs repliables et déplaçables (si le framework AppFramework n'est pas chargé) : en-tête avec poignée ↕ et « Masquer », glisser-déposer entre blocs, ordre et état repliés mémorisés (state.blockOrder, state.blockPrefs), ordre enregistré réappliqué.
  function prepareBlocks() {
    [...grid.children].filter(x => x.classList.contains("card")).forEach(card => {
      let title = card.querySelector("h2");
      if (!title) return;
      let id = card.dataset.blockId || idFor(title.textContent);
      card.dataset.blockId = id;
      card.classList.add("collapsible");
      if (state.blockPrefs[id] === undefined && (id.includes("calibration-simbrief") || id.includes("json-importe"))) state
        .blockPrefs[id] = true;
      let head = title.parentElement?.classList.contains("row") && title.parentElement.firstElementChild === title ? title
        .parentElement : null;
      if (!head) {
        head = document.createElement("div");
        head.className = "block-heading";
        title.before(head);
        head.append(title)
      } else head.classList.add("block-heading");
      if (!head.querySelector(".block-tools")) {
        let tools = document.createElement("span");
        tools.className = "block-tools";
        tools.innerHTML =
          '<button type="button" class="drag-handle" title="Déplacer">↕</button><button type="button" class="block-toggle">Masquer</button>';
        head.append(tools);
        tools.querySelector(".block-toggle").onclick = () => {
          state.blockPrefs[id] = !card.classList.contains("collapsed");
          applyBlockState(card);
          save()
        };
        tools.querySelector(".drag-handle").onpointerdown = () => card.draggable = true
      }
      applyBlockState(card);
      card.ondragstart = e => {
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move"
      };
      card.ondragend = () => {
        card.draggable = false;
        card.classList.remove("dragging");
        document.querySelectorAll(".drop-before").forEach(x => x.classList.remove("drop-before"));
        state.blockOrder = [...grid.querySelectorAll(":scope>.card")].map(x => x.dataset.blockId);
        save()
      };
      card.ondragover = e => {
        e.preventDefault();
        card.classList.add("drop-before")
      };
      card.ondragleave = () => card.classList.remove("drop-before");
      card.ondrop = e => {
        e.preventDefault();
        let moving = grid.querySelector(".dragging");
        if (moving && moving !== card) grid.insertBefore(moving, card);
        card.classList.remove("drop-before")
      }
    });
    const map = new Map([...grid.querySelectorAll(":scope>.card")].map(c => [c.dataset.blockId, c]));
    state.blockOrder.forEach(id => {
      let c = map.get(id);
      if (c) grid.append(c)
    });
  }
  // Replie ou déplie un bloc selon state.blockPrefs et met à jour le libellé de son bouton.
  function applyBlockState(card) {
    let hidden = !!state.blockPrefs[card.dataset.blockId];
    card.classList.toggle("collapsed", hidden);
    let b = card.querySelector(".block-toggle");
    if (b) b.textContent = hidden ? "Afficher" : "Masquer"
  }
  if (!window.AppFramework) prepareBlocks();

  // Les anciens boutons (enregistrer, importer, exporter, dossier…) sont masqués : leurs actions passent par la barre d'état et le menu ☰ (addMenuActions).
  const oldControls = $("saveProfileBtn")?.parentElement;
  if (oldControls) oldControls.style.display = "none";
  $("toggleProfileEditor").style.display = "none";
  document.querySelector(".prefs-popup").style.display = "none";
  ["importBtn", "exportLnmBtn", "exportBtn", "exportDbBtn", "sbAirframeBtn"].forEach(id => {
    if ($(id)) $(id).style.display = "none"
  });
  if ($("dirBtn")) $("dirBtn").style.display = "none";
  // Barre d'état fixe en bas de page : état du profil (enregistré / modifié), recharger la base locale, enregistrer, supprimer.
  // Niveau Expert seulement (édition des profils) : aux niveaux 1 à 3, ni barre ni marge réservée en bas de page.
  if ((window.RepositoryNav?.levels?.get?.() ?? 4) >= 4) document.body.classList.add("has-status-bar");
  const status = document.createElement("div");
  status.className = "status-bar";
  status.dataset.minLevel = "4";
  status.innerHTML =
    '<span id="persistentStatus" class="status-text">Base locale prête.</span><button id="statusReload">Recharger la base locale</button><button id="statusSave" class="primary">Enregistrer le profil</button><button id="statusDelete">Supprimer cet avion</button>';
  document.body.append(status);
  // Texte et couleur de la barre d'état selon le profil actif et profileDirty ; appelée par la page après chaque modification.
  window.updateProfileStatus = () => {
    status.classList.toggle("dirty", profileDirty);
    $("persistentStatus").textContent = !active ? "Aucun profil actif." : profileDirty ? `Modifications non enregistrées — ${active.name||active.id}` : `Profil enregistré — ${active.name||active.id}`
  };
  // Profil d'appareil : enregistrement, rechargement, changement avec confirmation.
  // Enregistre le profil actif : saisies de l'éditeur reportées, copie rangée dans state.profiles, instantané « enregistré » mis à jour, stockage écrit.
  function saveCurrent() {
    try {
      commitProfileEditor(false);
      state.profiles[active.id] = clone(active);
      activeSavedSnapshot = JSON.stringify(active);
      profileDirty = false;
      save();
      $("profileEditStatus").textContent = "Profil enregistré dans la base locale.";
      updateProfileStatus()
    } catch (e) {
      $("profileEditStatus").textContent = e.message
    }
  }
  $("statusSave").onclick = saveCurrent;
  $("saveProfileBtn").onclick = saveCurrent;
  $("statusDelete").onclick = () => $("deleteProfileBtn").click();
  // Recharge la base locale depuis le stockage (abandonne les modifications en mémoire) et réactive le dernier avion.
  $("statusReload").onclick = () => {
    let restored = JSON.parse(localStorage.getItem("flightPerfState") || "null");
    if (!restored?.profiles) return window.AppFramework.notify("Aucune base locale enregistrée.", 'warn');
    state = restored;
    let id = state.lastAircraft;
    if (id && state.profiles[id]) rawSetActive(state.profiles[id], "base locale rechargée");
    else clearActive("Base locale rechargée");
    updateProfileStatus()
  };

  // Boîte de confirmation quand on change d'avion avec des modifications non enregistrées.
  const dialog = document.createElement("dialog");
  dialog.id = "unsavedDialog";
  dialog.innerHTML =
    '<h2>Modifications non enregistrées</h2><p>Le profil courant a été modifié. Que veux-tu faire avant de changer d’avion ?</p><div class="dialog-actions"><button data-choice="stay">Rester</button><button data-choice="discard">Abandonner et changer</button><button class="primary" data-choice="save">Enregistrer et changer</button></div>';
  document.body.append(dialog);
  // Change d'avion (profil p) : direct si rien n'est modifié ; sinon demande rester / abandonner / enregistrer puis changer.
  function requestSwitch(p) {
    if (!profileDirty) {
      rawSetActive(p, "base locale");
      closeHeaderMenus();
      return
    }
    dialog.showModal();
    dialog.querySelectorAll("button").forEach(b => b.onclick = () => {
      let choice = b.dataset.choice;
      dialog.close();
      if (choice === "stay") return;
      if (choice === "save") saveCurrent();
      rawSetActive(p, choice === "save" ? "profil enregistré puis changé" : "modifications abandonnées");
      closeHeaderMenus()
    })
  }
  // Surcharge de la liste des appareils : le choix passe par requestSwitch (confirmation des modifications).
  listAircraft = function() {
    rawListAircraft();
    document.querySelectorAll(".aircraft-item").forEach(x => x.onclick = () => {
      const p = x.dataset.landing ? newProfileFromLanding(x.dataset.id) : state.profiles[x.dataset.id];
      if (p) requestSwitch(p)
    })
  };
  // Avertissement du navigateur si l'on quitte la page avec un profil modifié.
  addEventListener("beforeunload", e => {
    if (profileDirty) {
      e.preventDefault();
      e.returnValue = ""
    }
  });

  // Table RPM : tri par colonne via le composant partagé du framework (shared/app_framework.js),
  // repris ensuite par les reportings HEMS/GAAR/général et par le Landing Performance Dashboard.
  // Tri de la table RPM : colonne et sens (curveSort), composant partagé AppFramework.sortableTable ou tri local.
  let curveSort = {
    key: "rpm",
    dir: 1
  };
  if (window.AppFramework?.sortableTable) {
    window.AppFramework.sortableTable($("engineCurveTable")?.querySelector("thead"), curveSort, () => renderProfile());
  } else $("engineCurveTable")?.querySelector("thead").addEventListener("click", e => {
    let key = e.target.dataset.sort;
    if (!key) return;
    curveSort.key === key ? curveSort.dir *= -1 : curveSort = {
      key,
      dir: 1
    };
    renderProfile()
  });
  // Profil moteur : régimes par phase (montée, croisière…) déduits de la courbe RPM / consommation.
  // Surcharge du rendu du profil : table des régimes de vol par phase (Badin, vario, régime moteur, débit du profil et débit interpolé dans la cartographie RPM), table RPM triée, courbe moteur, éditeur, barre d'état.
  renderProfile = function() {
    if (!active) return;
    const names = {
        climb: "Montée",
        cruise: "Croisière",
        descent: "Descente",
        taxi: "Taxi",
        alternate: "Alternat"
      },
      labelOf = {
        climb: "climb",
        cruise: "cruise",
        descent: "descent",
        taxi: "taxi"
      },
      num = v => finiteProfileNumber(v) ? Number(v) : null;
    const pts = (active.rpmFuelCurve || []).filter(p => num(p.rpm) > 0).map(p => {
      let lo = num(p.fuelFlowMin),
        hi = num(p.fuelFlowMax),
        nom = num(p.fuelFlowPerHour) ?? (lo !== null && hi !== null ? (lo + hi) / 2 : lo ?? hi);
      return {
        rpm: num(p.rpm),
        min: lo ?? nom,
        nom,
        max: hi ?? nom,
        label: p.phaseLabel || ""
      }
    }).filter(p => p.nom !== null).sort((a, b) => a.rpm - b.rpm);
    // Régime (RPM) donnant le débit ff dans une liste de points : point exact (±0,2 %) ou interpolation entre deux points ; null hors plage.
    const inverse = (list, ff) => {
      let tol = Math.max(1, Math.abs(ff) * .002),
        hit = list.find(p => Math.abs(p.nom - ff) <= tol);
      if (hit) return {
        rpm: hit.rpm,
        note: "point exact"
      };
      for (let i = 1; i < list.length; i++) {
        let a = list[i - 1],
          b = list[i],
          lo = Math.min(a.nom, b.nom),
          hi = Math.max(a.nom, b.nom);
        if (hi > lo && ff >= lo && ff <= hi) return {
          rpm: a.rpm + (ff - a.nom) / (b.nom - a.nom) * (b.rpm - a.rpm),
          note: "interpolé"
        }
      }
      return null
    };
    // Régime d'une phase lu dans la cartographie : ligne étiquetée de la phase (unique, ou interpolée sur le débit), sinon régime inverse du débit ; null sans correspondance.
    const cartoRpm = (key, ff) => {
      let rows = pts.filter(p => p.label && p.label === labelOf[key]);
      if (rows.length === 1) return {
        rpm: rows[0].rpm,
        note: `ligne « ${labelOf[key]} »`
      };
      if (rows.length > 1) {
        let r = ff !== null ? inverse(rows, ff) : null;
        return r ? {
          ...r,
          note: `${r.note} · « ${labelOf[key]} »`
        } : {
          rpm: null,
          text: `${fmt(rows[0].rpm,1)}–${fmt(rows.at(-1).rpm,1)}`,
          note: `plage « ${labelOf[key]} »`
        }
      }
      return ff !== null ? inverse(pts, ff) : null
    };
    const rows = Object.keys(names).map(key => {
      let p = active[key] || {},
        rpm = num(p.rpmNominal) > 0 ? num(p.rpmNominal) : null,
        ff = num(p.fuelFlowPerHour),
        cr = cartoRpm(key, ff),
        eff = rpm ?? cr?.rpm ?? null,
        map = eff !== null ? interpRange(active.rpmFuelCurve || [], eff) : null,
        kind = !map ? "" : pts.some(x => Math.abs(x.rpm - eff) < .5) ? "point exact" : (pts.length && (eff < pts[0].rpm || eff > pts
          .at(-1).rpm) ? "hors plage (borne)" : "interpolé"),
        badin = finiteProfileNumber(p.iasKt) ? fmt(Number(p.iasKt), 2) : finiteProfileNumber(p.tasKt) ? fmt(Number(p.tasKt), 2) :
        "—",
        vario = finiteProfileNumber(p.rateFpm) ? `${key==="descent"&&Number(p.rateFpm)>0?"−":""}${fmt(Math.abs(Number(p.rateFpm)),0)}` : "—",
        rpmCell = [rpm !== null ? `<div class="profile-value">${fmt(rpm,1)}</div>` : "", cr ? `<div class="carto-value">${cr.text||fmt(cr.rpm,1)}<span class="source-note">carto · ${cr.note}</span></div>` : ""].join("") || "—";
      return `<tr><td>${names[key]}</td><td class="profile-value">${badin}</td><td class="profile-value">${vario}</td><td>${rpmCell}</td><td class="profile-value">${ff!==null?showFuel(p.fuelFlowPerHour):"—"}</td><td class="carto-value">${map?`${showFuel(map.nominal,1)}<span class="source-note">${showFuel(map.min,1)} – ${showFuel(map.max,1)} · ${kind}${rpm===null?" · via RPM carto":""}</span>`:"—"}</td></tr>`
    }).join("");
    $("profile").className = "";
    $("profile").innerHTML = `<div class="mut" style="margin-bottom:8px">${escXml(active.name)} · ${escXml(active.icao||active.type||active.id)} · <span class="profile-value">● profil</span> · <span class="carto-value">● cartographie (calculé / interpolé)</span></div><div style="overflow:auto"><table class="phase-table"><thead><tr><th>Nom</th><th>Badin (kt)</th><th>Vario indicatif (ft/min)</th><th>Régime moteur</th><th>Fuel flow (${fuelUnit()}/h)</th><th>Calcul carto</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    let phaseTable = $("profile").querySelector(".phase-table");
    phaseTable.querySelectorAll("tbody tr").forEach(r => {
      let profile = r.cells[4],
        carto = r.cells[5];
      if (carto) {
        profile.insertAdjacentHTML("beforeend", `<div class="carto-split">${carto.innerHTML}</div>`);
        carto.remove()
      }
    });
    phaseTable.tHead.rows[0].cells[5].remove();
    const sorted = [...(active.rpmFuelCurve || [])].sort((a, b) => {
      let A = a[curveSort.key] ?? "",
        B = b[curveSort.key] ?? "";
      if (typeof A === "number" && typeof B === "number") return curveSort.dir * (A - B);
      return curveSort.dir * String(A).localeCompare(String(B), "fr", {
        numeric: true
      })
    });
    $("curve").innerHTML = sorted.map(x => `<tr><td>${x.rpm??"—"}</td><td>${showFuel(x.fuelFlowMin??x.fuelFlowPerHour,1)}</td><td>${showFuel(x.fuelFlowPerHour,1)}</td><td>${showFuel(x.fuelFlowMax??x.fuelFlowPerHour,1)}</td><td>${escXml(x.phaseLabel||"—")}</td><td>${escXml(x.comment||"")}</td></tr>`).join("") || '<tr><td colspan="6">Pas de courbe RPM dans ce profil.</td></tr>';
    renderEngineChart();
    renderProfileEditor();
    updateProfileStatus();
  };
  // Courbe moteur (SVG) : débit min / nominal / max selon le régime, étiquettes des phases, point interpolé de la fiche moteur ; jauge au survol (régime et débits interpolés), plages de la table au repos.
  function renderEngineChart() {
    let svg = $("engineCurveChart");
    if (!svg || !active) return;
    let pts = (active.rpmFuelCurve || []).filter(p => Number.isFinite(p.rpm) && [p.fuelFlowMin, p.fuelFlowPerHour, p.fuelFlowMax].some(
      Number.isFinite)).sort((a, b) => a.rpm - b.rpm);
    if (!pts.length) {
      svg.innerHTML = '<text x="380" y="115" text-anchor="middle">Aucune cartographie chiffrée</text>';
      return
    }
    let vals = pts.flatMap(p => [p.fuelFlowMin, p.fuelFlowPerHour, p.fuelFlowMax].filter(Number.isFinite).map(v => convertFuel(v, active
        .unit, fuelUnit()))),
      xmin = Math.min(...pts.map(p => p.rpm)),
      xmax = Math.max(...pts.map(p => p.rpm)),
      ymin = Math.min(...vals),
      ymax = Math.max(...vals);
    if (xmin === xmax) {
      xmin -= 1;
      xmax += 1
    }
    if (ymin === ymax) {
      ymin -= 1;
      ymax += 1
    }
    let X = x => 55 + (x - xmin) / (xmax - xmin) * 675,
      Y = y => 190 - (y - ymin) / (ymax - ymin) * 150,
      // débit d'une ligne : colonne demandée, sinon repli (f), sinon toute autre colonne chiffrée de la ligne (évite NaN)
      val = (p, k, f) => convertFuel([p[k], p[f], p.fuelFlowPerHour, p.fuelFlowMin, p.fuelFlowMax].find(Number.isFinite), active.unit,
        fuelUnit()),
      line = k => pts.map((p, i) => `${i?"L":"M"}${X(p.rpm).toFixed(1)},${Y(val(p,k,"fuelFlowPerHour")).toFixed(1)}`).join(" "),
      upper = [...pts].reverse().map(p => `${X(p.rpm).toFixed(1)},${Y(val(p,"fuelFlowMax","fuelFlowPerHour")).toFixed(1)}`).join(" "),
      lower = pts.map(p => `${X(p.rpm).toFixed(1)},${Y(val(p,"fuelFlowMin","fuelFlowPerHour")).toFixed(1)}`).join(" "),
      marks = [...new Map(pts.filter(p => p.phaseLabel).map(p => [p.phaseLabel, pts.filter(x => x.phaseLabel === p.phaseLabel)]))
        .entries()
      ].map(([label, list], i) => {
        let a = X(list[0].rpm),
          b = X(list.at(-1).rpm),
          mid = (a + b) / 2,
          y = 206 + (i % 2) * 13;
        return a === b ? `<line class="axis" x1="${a}" y1="190" x2="${a}" y2="198"/><text x="${Math.min(722,a+(a>650?-5:5))}" y="${y}" text-anchor="${a>650?"end":"start"}">${escXml(label)}</text>` : `<path class="axis" d="M${a},198v4H${b}v-4"/><text x="${mid}" y="${y}" text-anchor="middle">${escXml(label)}</text>`
      }).join(""),
      hit = window.engineInterpolation && Number.isFinite(window.engineInterpolation.rpm) ? `<circle cx="${X(window.engineInterpolation.rpm)}" cy="${Y(convertFuel(window.engineInterpolation.range.nominal,active.unit,fuelUnit()))}" r="5" fill="#f2c879" stroke="#10151b" stroke-width="2"/>` : "";
    // classes communes des graphiques (.opt-chart) : grille, axes, courbe nominale (.curve), bornes min. / max. (.band,
    // pointillés), plage remplie (.band-fill), curseur (.cursor)
    const grid = [1, 2, 3].map(i => `<line class="grid-line" x1="55" x2="730" y1="${40 + i * 37.5}" y2="${40 + i * 37.5}"/>`).join("");
    svg.innerHTML = `${grid}<line class="axis" x1="55" y1="190" x2="730" y2="190"/><line class="axis" x1="55" y1="40" x2="55" y2="190"/><polygon class="band-fill" points="${lower} ${upper}"/><path class="band" d="${line("fuelFlowMin")}"/><path class="curve" d="${line("fuelFlowPerHour")}"/><path class="band" d="${line("fuelFlowMax")}"/>${hit}${marks}<text x="55" y="238">${fmt(xmin,0)} RPM</text><text x="730" y="238" text-anchor="end">${fmt(xmax,0)} RPM</text><text x="48" y="44" text-anchor="end">${fmt(ymax,1)}</text><text x="48" y="190" text-anchor="end">${fmt(ymin,1)}</text><text x="392" y="252" text-anchor="middle">Régime moteur · consommation ${fuelUnit()}/h</text><line id="engineCursor" class="cursor" x1="0" x2="0" y1="40" y2="190" visibility="hidden"/><circle id="engineCursorDot" r="4" fill="#75c8ff" visibility="hidden"/><rect id="engineHit" x="55" y="30" width="675" height="170" fill="transparent"/>`;
    // Jauge : régime sous le pointeur et consommations min / nominale / max interpolées ; au repos, plages de la table.
    let read = $("engineChartReadout");
    if (!read) {
      read = document.createElement("div");
      read.id = "engineChartReadout";
      read.className = "mut";
      svg.after(read)
    }
    const u = fuelUnit(),
      rest = `Plage : ${fmt(xmin,0)}–${fmt(xmax,0)} RPM · consommation ${fmt(ymin,1)} (min.) à ${fmt(ymax,1)} (max.) ${u}/h`;
    read.textContent = rest;
    const cur = $("engineCursor"),
      dot = $("engineCursorDot"),
      show = e => {
        const b = svg.getBoundingClientRect(),
          vb = svg.viewBox.baseVal,
          x = (e.clientX - b.left) / b.width * (vb?.width || 760),
          rpm = Math.min(xmax, Math.max(xmin, xmin + (x - 55) / 675 * (xmax - xmin))),
          r = interpRange(active.rpmFuelCurve || [], rpm);
        if (!r) return;
        const nom = convertFuel(r.nominal, active.unit, u),
          phase = pts.filter(p => p.phaseLabel).reduce((a, p) => !a || Math.abs(p.rpm - rpm) < Math.abs(a.rpm - rpm) ? p : a, null);
        cur.setAttribute("x1", X(rpm));
        cur.setAttribute("x2", X(rpm));
        cur.setAttribute("visibility", "visible");
        dot.setAttribute("cx", X(rpm));
        dot.setAttribute("cy", Y(nom));
        dot.setAttribute("visibility", "visible");
        read.textContent = `${fmt(rpm,0)} RPM · min. ${fmt(convertFuel(r.min,active.unit,u),1)} · nominal ${fmt(nom,1)} · max. ${fmt(convertFuel(r.max,active.unit,u),1)} ${u}/h${phase?` · ${phase.phaseLabel}`:""}`
      };
    const hitRect = $("engineHit");
    hitRect.onpointermove = show;
    hitRect.onpointerdown = show;
    hitRect.onpointerleave = () => {
      cur.setAttribute("visibility", "hidden");
      dot.setAttribute("visibility", "hidden");
      read.textContent = rest
    }
  }

  // Actions du menu ☰ (imports, exports, dossier, sauvegarde, préférences) et sélecteur d'unités kg / lbs dans l'en-tête commun.
  // Actions sur les profils et la base locale (expertAction) : niveau Expert seulement, attribut posé sur le bouton créé.
  function addMenuActions() {
    if (!window.RepositoryNav) return;
    let n = RepositoryNav;
    const expertAction = (label, handler) => {
      n.addAction(label, handler).dataset.minLevel = "4"
    };
    expertAction(["Importer profils / CSV / JSON", "Import profiles / CSV / JSON", "Profile / CSV / JSON importieren",
      "Importar perfiles / CSV / JSON"
    ], () => $("importBtn").click());
    expertAction(["Importer un airframe SimBrief", "Import a SimBrief airframe", "SimBrief-Airframe importieren",
      "Importar un airframe de SimBrief"
    ], () => $("sbAirframeBtn").click());
    expertAction(["Choisir le dossier performances", "Choose the performance folder", "Leistungsordner wählen",
      "Elegir la carpeta de rendimiento"
    ], () => $("dirBtn").click());
    expertAction(["Exporter le profil .lnmperf", "Export .lnmperf profile", ".lnmperf-Profil exportieren", "Exportar perfil .lnmperf"],
      () => $("exportLnmBtn").click());
    expertAction(["Exporter le profil JSON", "Export JSON profile", "JSON-Profil exportieren", "Exportar perfil JSON"], () => $(
      "exportBtn").click());
    expertAction(["Enregistrer / exporter la BDD locale", "Save / export the local database", "Lokale Datenbank speichern / exportieren",
      "Guardar / exportar la base local"
    ], () => $("exportDbBtn").click());
    expertAction(["Restaurer la sauvegarde locale précédente", "Restore the previous local backup",
      "Vorherige lokale Sicherung wiederherstellen", "Restaurar la copia local anterior"
    ], restoreBackup);
    let units = document.createElement("div");
    units.className = "repo-unit-control";
    units.innerHTML =
      '<span>Unités :</span><label><input type="radio" name="fuel-unit" value="kg"> kg</label><label><input type="radio" name="fuel-unit" value="lb"> lbs</label>';
    (document.querySelector(".repo-header .header-row:nth-of-type(2)") || document.querySelector(".repo-header")).append(
      units); /* unité de carburant affichée (kg / lb) : préférence, recalcul, enregistrement */
    function setUnits(u) {
      state.displayFuelUnit = u;
      updateFuelUnitButton();
      if (active) {
        renderProfile();
        calculate()
      }
      save();
      units.querySelector(`[value="${u}"]`).checked = true
    }
    units.querySelector(`[value="${fuelUnit()}"]`).checked = true;
    units.onchange = e => {
      if (e.target.name === "fuel-unit") setUnits(e.target.value)
    };
    n.addAction(["Exporter les préférences", "Export preferences", "Einstellungen exportieren", "Exportar preferencias"], exportPrefs);
    n.addAction(["Importer les préférences", "Import preferences", "Einstellungen importieren", "Importar preferencias"], importPrefs)
  }
  // Restaure la sauvegarde locale précédente (flightPerfState.backup) après confirmation, puis recharge la page.
  async function restoreBackup() {
    try {
      let backup = JSON.parse(localStorage.getItem("flightPerfState.backup") || "null");
      if (!backup?.profiles) throw Error("Aucune sauvegarde précédente disponible.");
      if (!await window.AppFramework.ask("Restaurer la sauvegarde locale précédente ?")) return;
      state = backup;
      localStorage.setItem("flightPerfState", JSON.stringify(state));
      location.reload()
    } catch (e) {
      window.AppFramework.notify(e.message, 'err')
    }
  }
  // Exporte les préférences (réglages, unité, langue, blocs) en JSON.
  function exportPrefs() {
    downloadText("flight-performance-preferences.json", JSON.stringify({
      schema: "flight-performance-preferences/v1",
      settings: state.settings,
      displayFuelUnit: state.displayFuelUnit,
      uiLanguage: state.uiLanguage,
      blockPrefs: state.blockPrefs,
      blockOrder: state.blockOrder
    }, null, 2), "application/json")
  }
  // Importe un fichier de préférences (schema flight-performance-preferences/v1) puis recharge la page.
  function importPrefs() {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      try {
        let p = JSON.parse(await input.files[0].text());
        if (p.schema !== "flight-performance-preferences/v1") throw Error("Fichier de préférences non reconnu.");
        Object.assign(state, {
          settings: p.settings || state.settings,
          displayFuelUnit: p.displayFuelUnit || state.displayFuelUnit,
          uiLanguage: p.uiLanguage || state.uiLanguage,
          blockPrefs: p.blockPrefs || {},
          blockOrder: p.blockOrder || []
        });
        save();
        location.reload()
      } catch (e) {
        window.AppFramework.notify(e.message, 'err')
      }
    };
    input.click()
  }
  // Langue de l'en-tête commun reportée dans l'état de la page (fr / en pour les anciens libellés), à chaque changement.
  const syncLanguage = e => {
    state.uiLanguage = (e.detail?.language || RepositoryNav.getLanguage()) === "fr" ? "fr" : "en";
    applyHeaderPreferences();
    save()
  };
  window.addEventListener("repository-language-change", syncLanguage);
  syncLanguage({
    detail: {
      language: RepositoryNav.getLanguage()
    }
  });
  addMenuActions();
  // Au chargement : profil actif renormalisé et considéré comme enregistré, puis rendu ; blocs du framework rafraîchis.
  if (active) {
    active = normalize(clone(active));
    activeSavedSnapshot = JSON.stringify(active);
    profileDirty = false;
    renderProfile()
  }
  window.AppFramework?.refresh();
  updateProfileStatus();
})();
