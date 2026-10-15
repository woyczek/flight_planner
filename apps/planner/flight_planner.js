// Planificateur de performances : script commun au Carburant (flight_performance_planner.html, devis) et aux Fiches
// de performances (performance_sheets.html, gestion des fiches) ; rôle de la page : <body data-perf-page>.
// Planificateur de performances : profils d'appareils (SimBrief, Little Navmap, CSV, calibration par
// OFP), devis carburant par phase, niveau optimal. Habillage (blocs, barre d'état) : shared/flight_ui.js.
//
// CARTE DU SCRIPT
//   État partagé      state (localStorage « flightPerfState » : profils, réglages, préférences), active (profil
//                     courant, copie normalisée), dirHandle (dossier performances), profileDirty (modifs non
//                     enregistrées), activeSavedSnapshot (profil tel qu'enregistré, pour détecter les modifs).
//   Unités            le profil stocke son carburant dans sa propre unité (active.unit) ; l'affichage suit
//                     fuelUnit() ; convertFuel / fuelInput / showFuel font le passage.
//   Flux principaux   setActive(profil) → renderProfile() (fiche + éditeur) → calculate() (devis) →
//                     renderAltitudeOptimum() (courbes, shared/flight_perf_view.js) ;
//                     imports (fichiers, dossier, SimBrief, OFP) → storeProfile() → setActive() ;
//                     éditeur → commitProfileEditor() → « Enregistrer » ; OFP → extractOfpCalibration() →
//                     applyCalibration().
//   Modules liés      flight_performance_model.js (mécanique du vol), flight_perf_view.js (courbes),
//                     flight_profile_help.js (aide des champs), flight_ui.js (habillage), aircraft_perf.js (APD).
//   Sections          en-tête · unités · état mémorisé · éditeur de profil (+ APD) · devis carburant ·
//                     modèle de performances · imports CSV / JSON · OFP SimBrief · Little Navmap ·
//                     airframes SimBrief · cache IndexedDB · calibration OFP · appareils du Landing / DEFA.
/** Élément d'identifiant id ; absent de la page (Carburant et Fiches de performances partagent ce script, chacune
 *  avec ses blocs) : un élément vide détaché, gardé par identifiant, qui reçoit lectures et écritures sans effet. */
/** Rôle de la page : « sheets » (Fiches de performances : gestion des fiches), « fuel » (Carburant : devis). */
const PERF_PAGE = document.body?.dataset.perfPage === "sheets" ? "sheets" : "fuel";
const $ = (() => {
  const ghosts = new Map();
  return id => document.getElementById(id) || ghosts.get(id) || ghosts.set(id, Object.assign(document.createElement("input"), {
    id
  })).get(id);
})();
const DEFAULT = {
  lastAircraft: null,
  profiles: {},
  settings: {
    dist: 500,
    fl: 280,
    trk: 270,
    taxi: 15,
    reserve: 45,
    cont: 5
  },
  displayFuelUnit: "kg"
};
let state = JSON.parse(localStorage.getItem("flightPerfState") || "null") || DEFAULT;
let active = null,
  dirHandle = null,
  simAirframes = [],
  activeSavedSnapshot = "",
  profileDirty = false;
/** Nombre au format français, d décimales au plus ; « — » s'il n'est pas fini. */
const fmt = (x, d = 0) => Number.isFinite(x) ? x.toLocaleString("fr-FR", {
  maximumFractionDigits: d
}) : "—";
const FLAG = {
  fr: '<svg viewBox="0 0 60 36"><rect width="20" height="36" fill="#0055A4"/><rect x="20" width="20" height="36" fill="#fff"/><rect x="40" width="20" height="36" fill="#EF4135"/></svg>',
  en: '<svg viewBox="0 0 60 36"><rect width="60" height="36" fill="#012169"/><path d="M0 0L60 36M60 0L0 36" stroke="#fff" stroke-width="8"/><path d="M30 0V36M0 18H60" stroke="#C8102E" stroke-width="7"/></svg>'
};
// ===== En-tête : appareil courant (icône, liste), langue, préférences =====
/** Groupe d'affichage d'un profil (liste des avions). Entrée : profil. Sortie : [groupe, visuel d'icône, libellé de catégorie] (AircraftDBIcons ; « Autres » à défaut). */
function profileVisual(p) {
  let [group, label] = window.AircraftDBIcons?.group(p) || ["Autres", "Autre"];
  return [group, window.AircraftDBIcons?.visual(p) || "other", label]
}
/** Icône SVG (HTML) d'un profil pour la liste et l'en-tête ; ✈ à défaut. */
function aircraftIcon(p) {
  return window.AircraftDBIcons?.icon(p) || '<span class="ac-icon">✈</span>'
}
/** Met à jour le bouton d'appareil de l'en-tête (icône, nom, info-bulle) d'après le profil actif. */
function syncAircraftPicker() {
  if (PERF_PAGE === "sheets") renderSheetPick();
  let p = active;
  $('aircraftCurrentIcon').innerHTML = p ? aircraftIcon(p) : '<span class="ac-icon">✈</span>';
  $('aircraftCurrentText').textContent = p ? (p.name || p.id) : 'Aucun avion';
  $('aircraftCurrent').title = p ? `${p.type||p.icao||p.id} · ${p.name||p.id}` : 'Choisir l’avion'
}
/** Fiches de performances : sélecteur « Appareil » de l'en-tête, la fiche modifiée et l'appareil du panneau ChatGPT.
 *  Fiches enregistrées et types de la flotte sans fiche, découpés comme le menu « Avion » du Carburant (« Mes appareils »
 *  en tête, puis par catégorie). Choix : changement de fiche (confirmation si elle est modifiée, shared/flight_ui.js) ;
 *  type sans fiche : fiche vide à compléter. Refait seulement si la liste ou le choix ont changé. */
function renderSheetPick() {
  const sel = document.getElementById("sheetPick");
  if (!sel) return;
  const esc = KIT.esc,
    entries = gptEntries(),
    byP = new Map(entries.map(x => [x.p, x])),
    cur = active ? (state.profiles?.[active.id] ? "P:" : "L:") + active.id : "",
    option = x => `<option value="${esc((x.landing ? "L:" : "P:") + x.id)}">${esc(x.landing ? ktf(["{p} — aucune fiche", "{p} — no sheet", "{p} — kein Blatt", "{p} — sin ficha"], { p: x.p.name || x.id }) : `${x.p.name || x.id} (${x.p.type || x.p.icao || x.id})`)}</option>`,
    html = (cur ? "" : `<option value="">${esc(kt(["— choisir un appareil —", "— choose an aircraft —", "— Luftfahrzeug wählen —", "— elegir una aeronave —"]))}</option>`) + [...aircraftGroups(entries.map(x => x.p), true)].map(([label, items]) =>
      `<optgroup label="${esc(label)}">${items.map(([p]) => option(byP.get(p))).join("")}</optgroup>`).join("");
  $("sheetPickLbl").textContent = kt(["Appareil", "Aircraft", "Luftfahrzeug", "Aeronave"]);
  if (sel.dataset.html !== html) {
    sel.innerHTML = html;
    sel.dataset.html = html
  }
  // fiche active pas encore enregistrée (créée hors de la liste) : ajoutée en tête pour que le sélecteur la montre
  if (cur && ![...sel.options].some(o => o.value === cur)) {
    sel.insertAdjacentHTML("afterbegin", `<option value="${esc(cur)}">${esc(active.name || active.id)}</option>`);
    sel.dataset.html = ""
  }
  sel.value = cur;
  sel.onchange = () => {
    const v = sel.value,
      id = v.slice(2),
      p = v.startsWith("L:") ? newProfileFromLanding(id) : state.profiles?.[id];
    if (!p) return renderSheetPick();
    if (window.requestAircraftSwitch) window.requestAircraftSwitch(p);
    else setActive(p, kt(["base de performances", "performance database", "Leistungsdatenbank", "base de rendimiento"]))
  }
}
/** Ferme les menus déroulants de l'en-tête (langue, préférences, appareils). */
function closeHeaderMenus() {
  ['languageMenu', 'prefsMenu', 'aircraftMenu'].forEach(id => $(id).hidden = true);
  ['languageCurrent', 'prefsCurrent', 'aircraftCurrent'].forEach(id => $(id).setAttribute('aria-expanded', 'false'))
}
/** Reflète les préférences dans l'en-tête : drapeau de langue, bouton « champs du profil », unité de carburant. */
function applyHeaderPreferences() {
  let lang = state.uiLanguage || 'fr';
  $('languageCurrentIcon').innerHTML = FLAG[lang] || FLAG.fr;
  document.querySelectorAll('.lang-item').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  $('prefsEditorBtn').textContent = state.profileEditorHidden ? 'Afficher les champs du profil' : 'Masquer les champs du profil';
  updateFuelUnitButton()
}
const KG_PER_LB = 0.45359237;
// ===== Unité de carburant affichée (kg / lb) et conversions =====
/** Unité de carburant affichée : préférence d'affichage, sinon unité du profil actif, sinon kg. */
function fuelUnit() {
  return state.displayFuelUnit || active?.unit || "kg"
}
/** Convertit une quantité de carburant entre kg et lb (from → to). Valeur inchangée si l'unité est identique, absente ou si la valeur n'est pas un nombre. */
function convertFuel(value, from, to) {
  if (!Number.isFinite(value) || !from || !to || from === to) return value;
  return from === "kg" ? value / KG_PER_LB : value * KG_PER_LB
}
/** Valeur d'un champ de saisie : quantité (unité from, défaut : celle du profil) convertie dans l'unité affichée, arrondie au dixième ; chaîne vide si non numérique. */
function fuelInput(value, from = active?.unit || fuelUnit()) {
  let n = convertFuel(value, from, fuelUnit());
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : ""
}
/** Texte d'une quantité de carburant du profil, convertie dans l'unité affichée (d décimales). */
function showFuel(value, d = 0) {
  return fmt(convertFuel(value, active?.unit || fuelUnit(), fuelUnit()), d)
}
/** Libellé du bouton de préférence « Affichage carburant : kg / lb ». */
function updateFuelUnitButton() {
  $("fuelUnitBtn").textContent = `Affichage carburant : ${fuelUnit()}`
}
// ===== État mémorisé (localStorage flightPerfState) : profils d'appareils, réglages, préférences =====
/** Enregistre l'état : réglages du devis (champs du formulaire), dernier avion, puis localStorage « flightPerfState » ; l'état précédent est gardé en « flightPerfState.backup » s'il a changé. */
function save() {
  // réglages du devis : seulement les champs présents sur la page (les Fiches de performances n'ont pas le devis)
  ["dist", "fl", "trk", "taxi", "reserve", "cont", "tow", "wdir", "wspd", "isaDev", "tGround", "elevFt", "tLevel"].forEach(k => {
    const el = document.getElementById(k);
    if (el) state.settings[k] = el.value
  });
  // dernier appareil de chaque page : le devis (lastAircraft) et la fiche en cours d'édition (lastSheet)
  state[PERF_PAGE === "sheets" ? "lastSheet" : "lastAircraft"] = active?.id || null;
  let next = JSON.stringify(state),
    previous = localStorage.getItem("flightPerfState");
  if (previous && previous !== next) localStorage.setItem("flightPerfState.backup", previous);
  localStorage.setItem("flightPerfState", next)
}
// Carburant et Fiches de performances ouverts ensemble : une page qui enregistre la base (flightPerfState) la fait relire
// à l'autre — fiches, fiches retirées et dossier repris ; la fiche ouverte est reprise si elle n'a pas de modification en
// cours ; rien n'est réenregistré ici (pas d'aller-retour entre les onglets), le Carburant refait son devis.
window.addEventListener("storage", e => {
  if (e.key !== "flightPerfState" || !e.newValue) return;
  let other;
  try {
    other = JSON.parse(e.newValue)
  } catch {
    return
  }
  state.profiles = other.profiles || {};
  if (other.removedProfiles) state.removedProfiles = other.removedProfiles;
  if (active && !profileDirty) {
    const p = state.profiles[active.id];
    if (p && JSON.stringify(normalize(structuredClone(p))) !== activeSavedSnapshot) {
      active = normalize(structuredClone(p));
      activeSavedSnapshot = JSON.stringify(active);
      renderProfile()
    }
  }
  syncAircraftPicker();
  renderPerfProfilesSoon();
  if (PERF_PAGE === "fuel" && active) try {
    calculate({
      quoteOnly: true
    })
  } catch {}
});
/** Recopie les réglages mémorisés (state.settings) dans les champs du devis. */
function restore() {
  for (const [k, v] of Object.entries(state.settings || {}))
    if ($(k) && v !== undefined) $(k).value = v;
  if (typeof syncWeather === "function") syncWeather("isaDev")
}
/** Complète un profil sur place (id, nom, unité, phases, TOD, identifiants de lignes RPM). Entrée : profil, nom de fichier (id par défaut). Sortie : le même objet. */
function normalize(p, name = "profil") {
  p.id = p.id || p.icao || name.replace(/\.[^.]+$/, "");
  p.name = p.name || p.aircraft || p.id;
  p.unit = p.unit || "kg";
  p.cruise = p.cruise || {};
  p.climb = p.climb || {};
  p.descent = p.descent || {};
  p.taxi = p.taxi || {};
  p.tod = p.tod || {
    gradientFtPerNm: 300,
    bufferNm: 5
  };
  p.rpmFuelCurve = (p.rpmFuelCurve || []).map(x => ({
    ...x,
    _rowId: x._rowId || crypto.randomUUID()
  }));
  return p;
}
const PROFILE_FIELDS = [
  ["Identité et format", "Nom", "name", "text"],
  ["Identité et format", "Type / ICAO", "icao", "text"],
  ["Identité et format", "Description", "description", "textarea"],
  ["Identité et format", "Carburant en volume", "fuelAsVolume", "bool"],
  ["Identité et format", "Carburant Jet", "jetFuel", "bool"],
  ["Carburant et opération", "Carburant utilisable", "usableFuel", "number"],
  ["Carburant et opération", "Taxi", "taxiFuel", "number"],
  ["Carburant et opération", "Taxi · régime nominal (RPM / N1)", "taxi.rpmNominal", "number", false],
  ["Carburant et opération", "Taxi · fuel flow", "taxi.fuelFlowPerHour", "number", false],
  ["Carburant et opération", "Réserve", "reserveFuel", "number"],
  ["Carburant et opération", "Contingence (%)", "contingencyPercent", "number"],
  ["Carburant et opération", "Carburant extra", "extraFuel", "number"],
  ["Piste et alternat", "Longueur piste mini (ft)", "minRunwayLengthFt", "number"],
  ["Piste et alternat", "Type de piste", "runwayType", "select:HARD,SOFT,WATER"],
  ["Piste et alternat", "Alternat · fuel flow", "alternate.fuelFlowPerHour", "number"],
  ["Piste et alternat", "Alternat · TAS (kt)", "alternate.tasKt", "number"],
  ["Montée", "Badin / IAS (kt)", "climb.iasKt", "number", false],
  ["Montée", "Régime nominal (RPM / N1)", "climb.rpmNominal", "number", false],
  ["Montée", "Fuel flow", "climb.fuelFlowPerHour", "number"],
  ["Montée", "TAS (kt)", "climb.tasKt", "number"],
  ["Montée", "Vario (ft/min)", "climb.rateFpm", "number"],
  ["Croisière", "Badin / IAS (kt)", "cruise.iasKt", "number", false],
  ["Croisière", "Régime nominal (RPM / N1)", "cruise.rpmNominal", "number", false],
  ["Croisière", "Fuel flow", "cruise.fuelFlowPerHour", "number"],
  ["Croisière", "TAS (kt)", "cruise.tasKt", "number"],
  ["Croisière", "Plafond max (ft)", "cruise.ceilingFt", "number", false],
  ["Croisière", "Altitude de référence (ft)", "cruise.refAltFt", "number", false],
  ["Croisière", "Motorisation (auto : base OACI)", "engineType", "select:auto,jet,turboprop,piston", false],
  ["Croisière", "Altitude de rétablissement (ft)", "engineCriticalAltFt", "number", false],
  ["Croisière", "Cabine pressurisée", "pressurized", "bool", false],
  ["Descente", "Badin / IAS (kt)", "descent.iasKt", "number", false],
  ["Descente", "Régime nominal (RPM / N1)", "descent.rpmNominal", "number", false],
  ["Descente", "Fuel flow", "descent.fuelFlowPerHour", "number"],
  ["Descente", "TAS (kt)", "descent.tasKt", "number"],
  ["Descente", "Vario (ft/min)", "descent.rateFpm", "number"],
  ["Régime et consommation", "Référence RPM / puissance", "rpmPowerReference", "textarea", false],
  ["Régime et consommation", "Données RPM / fuel flow", "rpmFuelRaw", "textarea", false],
  ["Régime et consommation", "Base / provenance", "rpmFuelBasis", "textarea", false]
];
// ===== EUROCONTROL APD (AircraftDB/aircraft_perf.js, rempli par update_aircraft_db.py --apd) =====
// Valeurs proposées pour les champs du profil, déduites de la fiche APD du type. Rien n'est écrit sans clic : chaque
// champ affiche une étiquette (vert = identique à ±3 %, orange = différent, bleu = vide localement) ; un clic reprend
// la valeur APD. L'APD ne donne ni débit carburant ni table RPM : ces champs restent purement locaux.
/** Valeurs EUROCONTROL APD proposées pour les champs du profil p. Sortie : { code, data (fiche APD), fields : chemin → { v : valeur, how : explication } } ou null si le type n'a pas de fiche. Vario moyen de montée / descente calculé par tranches APD jusqu'à l'altitude de référence. */
function apdFor(p) {
  const perf = window.AIRCRAFT_PERF || {},
    code = String(p?.icao || p?.type || p?.id || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
    key = perf[code] ? code : window.AIRCRAFT_DB?.__aliases?.[code];
  const a = key && perf[key];
  if (!a) return null;
  const out = {},
    set = (path, v, how) => {
      if (Number.isFinite(v) && v > 0) out[path] = {
        v: Math.round(v),
        how
      }
    },
    c = a.cruise || {},
    ceil = c.ceilingFL ? c.ceilingFL * 100 : null;
  // altitude de référence : celle où TAS / Mach de l'APD donnent la même vitesse du son (sous la tropopause), sinon près du plafond
  let ref = null;
  if (c.tasKt && c.mach) {
    const T = (c.tasKt / c.mach / 38.9679) ** 2;
    ref = T > 216.65 ? (288.15 - T) / .0019812 : Math.min((ceil || 41000) - 2000, 39000)
  } else if (ceil) ref = .8 * ceil;
  if (ref) ref = Math.round(ref / 1000) * 1000;
  const top = +p?.cruise?.refAltFt || ref || (ceil ? .8 * ceil : null);
  // vario moyen jusqu'à l'altitude de référence, par tranches APD (0–5000, 5000–FL150, FL150–FL240, au-dessus : montée en Mach)
  const segs = [
    [0, 5000, a.climbInitial?.rocFpm],
    [5000, 15000, a.climb150?.rocFpm],
    [15000, 24000, a.climb240?.rocFpm],
    [24000, 1e9, a.machClimb?.rocFpm]
  ];
  let last = null,
    t = 0;
  if (top) {
    for (const [lo, hi, r0] of segs) {
      const r = r0 || last;
      if (r) last = r;
      const dh = Math.max(0, Math.min(hi, top) - lo);
      if (dh && r) t += dh / r
    }
  }
  // vario moyen de descente depuis l'altitude de référence (descente initiale en Mach, puis FL240–FL100, puis approche)
  const dsegs = [
    [24000, 1e9, a.descentInitial?.rodFpm],
    [10000, 24000, a.descent?.rodFpm],
    [0, 10000, a.approach?.rodFpm || a.descent?.rodFpm]
  ];
  let dt = 0,
    dl = null;
  if (top) {
    for (const [lo, hi, r0] of dsegs) {
      const r = r0 || dl;
      if (r) dl = r;
      const dh = Math.max(0, Math.min(hi, top) - lo);
      if (dh && r) dt += dh / r
    }
  }
  /** Libellé [fr, en, de, es] dans la langue de la page. */
  const T = v => tl(...v);
  set("cruise.tasKt", c.tasKt, T(["TAS de croisière", "cruise TAS", "Reiseflug-TAS", "TAS de crucero"]));
  set("cruise.ceilingFt", ceil, T(["plafond", "ceiling", "Gipfelhöhe", "techo"]));
  set("cruise.refAltFt", ref, T([`déduite de TAS ${c.tasKt} kt / Mach ${c.mach}`, `derived from TAS ${c.tasKt} kt / Mach ${c.mach}`, `abgeleitet aus TAS ${c.tasKt} kt / Mach ${c.mach}`, `deducida de TAS ${c.tasKt} kt / Mach ${c.mach}`]));
  set("climb.iasKt", a.climb150?.iasKt ?? a.climb240?.iasKt ?? a.climbInitial?.iasKt, T(["Badin de montée (jusqu’au FL150)",
    "climb IAS (to FL150)", "Steig-IAS (bis FL150)", "IAS de ascenso (hasta FL150)"
  ]));
  if (t) set("climb.rateFpm", top / t, T([`vario moyen jusqu’à ${flTxt(top)} (tranches APD)`, `average rate to ${flTxt(top)} (APD segments)`, `mittlere Steigrate bis ${flTxt(top)} (APD-Abschnitte)`, `régimen medio hasta ${flTxt(top)} (tramos APD)`]));
  set("descent.iasKt", a.descent?.iasKt, T(["Badin de descente (FL240–FL100)", "descent IAS (FL240–FL100)", "Sink-IAS (FL240–FL100)",
    "IAS de descenso (FL240–FL100)"
  ]));
  if (dt) set("descent.rateFpm", top / dt, T([`vario moyen de descente depuis ${flTxt(top)}`, `average descent rate from ${flTxt(top)}`, `mittlere Sinkrate ab ${flTxt(top)}`, `régimen medio de descenso desde ${flTxt(top)}`]));
  if (a.takeoff?.distanceM) set("minRunwayLengthFt", a.takeoff.distanceM * 3.28084, T([`distance de décollage ${a.takeoff.distanceM} m`, `take-off distance ${a.takeoff.distanceM} m`, `Startstrecke ${a.takeoff.distanceM} m`, `distancia de despegue ${a.takeoff.distanceM} m`]));
  return {
    code: key,
    data: a,
    fields: out
  };
}
/** Pose, dans l'éditeur (box), une étiquette APD à côté de chaque champ comparable (identique / différent / vide) et le bandeau de synthèse #apdBar ; un clic reprend la valeur APD (rien n'est écrit sans clic). */
function decorateApd(box) {
  const bar = $("apdBar");
  if (!bar) return;
  const x = active && apdFor(active);
  if (!x) {
    bar.innerHTML = active ? `<span class="mut">${tl("Aucune donnée EUROCONTROL APD pour ce type (champ Type / ICAO).","No EUROCONTROL APD data for this type (Type / ICAO field).","Keine EUROCONTROL-APD-Daten für diesen Typ (Feld Typ / ICAO).","Sin datos EUROCONTROL APD para este tipo (campo Tipo / ICAO).")}</span>` : "";
    return
  }
  const tags = [];
  box.querySelectorAll("[data-profile-path]").forEach(el => {
    const f = x.fields[el.dataset.profilePath];
    if (!f) return;
    const loc = el.value.trim() === "" ? null : +el.value,
      kind = loc == null ? "empty" : Math.abs(loc - f.v) <= .03 * Math.max(1, f.v) ? "same" : "diff";
    const t = document.createElement("button");
    t.type = "button";
    t.className = `apd-tag apd-${kind}`;
    t.textContent = `APD ${fmt(f.v,0)}`;
    t.title = typo(`EUROCONTROL APD — ${f.how}. ${kind==="same"?tl("Identique à la valeur locale.","Same as the local value.","Wie der lokale Wert.","Igual que el valor local."):tl("Cliquer pour reprendre cette valeur (la valeur locale est remplacée à l’enregistrement).","Click to use this value (replaces the local value on save).","Klicken, um diesen Wert zu übernehmen (ersetzt den lokalen Wert beim Speichern).","Clic para usar este valor (sustituye el valor local al guardar).")}`);
    t.onclick = () => {
      el.value = f.v;
      el.dispatchEvent(new Event("input", {
        bubbles: true
      }));
      t.className = "apd-tag apd-same"
    };
    (el.closest(".field") || el.parentElement).appendChild(t);
    tags.push({
      el,
      f,
      t,
      kind
    })
  });
  /** Nombre de champs de la fiche APD dans l'état k : empty (champ vide), same (identique), diff (différent). */
  const n = k => tags.filter(g => g.kind === k).length;
  bar.innerHTML = typo(`<b>EUROCONTROL APD — ${x.code}</b> <span class="mut">${tl("fiche de performances publique, lue par le scrapper de la base","public performance sheet, read by the database scraper","öffentliches Leistungsblatt, vom Datenbank-Scraper gelesen","ficha pública de prestaciones, leída por el scraper de la base")} (${x.data.fetched||"?"})</span> · <span class="apd-same">${n("same")} ${tl("identique(s)","same","gleich","igual(es)")}</span> · <span class="apd-diff">${n("diff")} ${tl("différent(s)","different","abweichend","diferente(s)")}</span> · <span class="apd-empty">${n("empty")} ${tl("vide(s) localement","empty locally","lokal leer","vacío(s) localmente")}</span> <button type="button" id="apdFillEmpty" class="mini">${tl("remplir les champs vides","fill empty fields","leere Felder füllen","rellenar campos vacíos")}</button> <a href="${escXml(x.data.url||"#")}" target="_blank" rel="noopener">${tl("fiche","sheet","Blatt","ficha")} ↗</a><div class="mut">${tl("L’APD ne donne ni débits carburant ni table RPM / N1 : ces valeurs, et la table ci-dessous, sont locales (profil, SimBrief, saisie).","The APD gives neither fuel flows nor an RPM / N1 table: these values, and the table below, are local (profile, SimBrief, manual entry).","Die APD liefert weder Verbrauch noch RPM-/N1-Tabelle: diese Werte und die Tabelle unten sind lokal (Profil, SimBrief, Eingabe).","La APD no da ni flujos de combustible ni tabla RPM / N1: esos valores, y la tabla de abajo, son locales (perfil, SimBrief, introducción manual).")}</div>`);
  $("apdFillEmpty").onclick = () => tags.filter(g => g.kind === "empty").forEach(g => g.t.click());
}
// ===== Éditeur de profil d'appareil : champs par chemin, courbe RPM / consommation, profil actif =====
/** Valeur d'un chemin pointé (« cruise.tasKt ») dans un objet ; undefined si absent. */
function pathGet(o, path) {
  return path.split(".").reduce((v, k) => v?.[k], o)
}
/** Écrit une valeur à un chemin pointé, en créant les objets intermédiaires. */
function pathSet(o, path, value) {
  let a = path.split("."),
    k = a.pop(),
    t = o;
  for (const x of a) t = t[x] ??= {};
  t[k] = value
}
const FUEL_PATHS = new Set(["usableFuel", "taxiFuel", "reserveFuel", "extraFuel", "taxi.fuelFlowPerHour", "alternate.fuelFlowPerHour",
  "climb.fuelFlowPerHour", "cruise.fuelFlowPerHour", "descent.fuelFlowPerHour"
]);
const FLIGHT_PHASES = ["idle", "parking", "taxi", "takeoff", "climb", "cruise", "descent", "approach"];
/** Vrai si v est un nombre fini non vide (chaîne numérique acceptée). */
function finiteProfileNumber(v) {
  return v !== null && v !== undefined && String(v).trim() !== "" && Number.isFinite(Number(v))
}
/** Phase de vol (taxi, climb, cruise…) reconnue dans un texte libre (commentaire de ligne RPM) ; « » sinon. */
function inferredCurvePhase(text) {
  let x = String(text || "").toLowerCase();
  return FLIGHT_PHASES.find(p => new RegExp(`\\b${p}\\b`, `i`).test(x)) || ""
}
/** Dessine l'éditeur du profil actif : champs par groupe (PROFILE_FIELDS, carburant dans l'unité affichée), table RPM / consommation éditable, étiquettes APD, aide au survol. Branche les boutons de ligne et le marquage « modifié ». */
function renderProfileEditor() {
  const box = $("profileEditor"),
    curveBox = $("curveEditor");
  if (!active) {
    box.innerHTML = '<div class="mut">Choisis ou importe un profil.</div>';
    curveBox.innerHTML = '<div class="mut">Choisis ou importe un profil.</div>';
    box.style.display = "grid";
    box.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
    return
  }
  const groups = [...new Set(PROFILE_FIELDS.map(x => x[0]))],
    field = ([group, label, path, type]) => {
      let v = pathGet(active, path),
        isFuel = FUEL_PATHS.has(path);
      if (isFuel && type === "number") v = fuelInput(v);
      let unit = isFuel ? ` (${fuelUnit()}${path.includes("fuelFlow")?"/h":""})` : "";
      if (type === "bool") return `<div class="field"><label>${label}</label><select data-profile-path="${path}" data-profile-type="bool"><option value="" ${v===null||v===undefined?"selected":""}>non renseigné</option><option value="1" ${v===true?"selected":""}>oui</option><option value="0" ${v===false?"selected":""}>non</option></select></div>`;
      if (type.startsWith("select:")) {
        let opts = type.slice(7).split(",").map(x => `<option ${v===x?"selected":""}>${x}</option>`).join("");
        return `<div class="field"><label>${label}</label><select data-profile-path="${path}" data-profile-type="text">${opts}</select></div>`
      }
      let tag = type === "textarea" ? "textarea" : "input",
        attrs = type === "number" ? 'type="number" step="any"' : 'type="text"',
        wide = type === "textarea" ? " wide" : "";
      return `<div class="field${wide}"><label>${label}<span>${unit}</span></label><${tag} ${attrs} data-profile-path="${path}" data-profile-type="${type}" data-profile-fuel="${isFuel?1:0}" value="${tag==="input"?escXml(v??""):""}">${tag==="textarea"?escXml(v??""):""}</${tag}></div>`
    };
  const curveRows = (active.rpmFuelCurve || []).map(p => `<tr><td><input type="number" step="any" data-curve-id="${p._rowId}" data-curve-key="rpm" value="${p.rpm??""}"></td><td><input type="number" step="any" data-curve-id="${p._rowId}" data-curve-key="altFt" value="${p.altFt??""}" placeholder="—"></td><td><input type="number" step="any" data-curve-id="${p._rowId}" data-curve-key="fuelFlowMin" value="${fuelInput(p.fuelFlowMin??p.fuelFlowPerHour)}"></td><td><input type="number" step="any" data-curve-id="${p._rowId}" data-curve-key="fuelFlowPerHour" value="${fuelInput(p.fuelFlowPerHour)}"></td><td><input type="number" step="any" data-curve-id="${p._rowId}" data-curve-key="fuelFlowMax" value="${fuelInput(p.fuelFlowMax??p.fuelFlowPerHour)}"></td><td><select data-curve-id="${p._rowId}" data-curve-key="phaseLabel"><option value=""></option>${FLIGHT_PHASES.map(x=>`<option value="${x}" ${p.phaseLabel===x?"selected":""}>${x}</option>`).join("")}</select></td><td><textarea rows="2" data-curve-id="${p._rowId}" data-curve-key="comment">${escXml(p.comment??"")}</textarea></td><td><button type="button" class="removeCurve" data-curve-id="${p._rowId}">×</button></td></tr>`).join("");
  box.innerHTML = groups.map(g => `<section class="editorGroup${g==="Régime et consommation"?" editorGroupSingle":""}" style="display:block"><h3>${g}</h3><div class="fields">${PROFILE_FIELDS.filter(x=>x[0]===g).map(field).join("")}</div></section>`).join("");
  curveBox.innerHTML = `<div class="mut">Une plage écrite dans le commentaire, par ex. « 1 000–1 300 kg/h total », remplit automatiquement min., nominal et max. à l’enregistrement.</div><table><thead><tr><th>RPM / N1</th><th data-no-i18n title="${escXml(kt(["Facultative : altitude (ft) à laquelle la consommation est publiée. Avec deux altitudes ou plus, le calcul interpole entre les lignes d’une même altitude ; une ligne sans altitude vaut pour toutes.", "Optional: altitude (ft) at which the fuel flow is published. With two altitudes or more, the calculation interpolates between rows of the same altitude; a row without altitude applies to all.", "Optional: Höhe (ft), für die der Verbrauch angegeben ist. Ab zwei Höhen interpoliert die Berechnung zwischen den Zeilen derselben Höhe; eine Zeile ohne Höhe gilt für alle.", "Opcional: altitud (ft) a la que se publica el consumo. Con dos altitudes o más, el cálculo interpola entre las filas de una misma altitud; una fila sin altitud vale para todas."]))}">${escXml(kt(["Altitude (ft)", "Altitude (ft)", "Höhe (ft)", "Altitud (ft)"]))}</th><th>Min.</th><th>Nominal</th><th>Max.</th><th>Régime de vol</th><th>Commentaire</th><th></th></tr></thead><tbody id="curveEditRows">${curveRows}</tbody></table><button type="button" id="addCurvePoint" style="margin-top:8px">Ajouter un point</button>`;
  curveBox.querySelectorAll(".removeCurve").forEach(b => b.onclick = () => {
    try {
      commitProfileEditor(false);
      let i = active.rpmFuelCurve.findIndex(p => p._rowId === b.dataset.curveId);
      if (i >= 0) active.rpmFuelCurve.splice(i, 1);
      profileDirty = true;
      renderProfileEditor()
    } catch (e) {
      $("profileEditStatus").textContent = e.message
    }
  });
  curveBox.querySelector("#addCurvePoint").onclick = () => {
    try {
      commitProfileEditor(false);
      active.rpmFuelCurve.push({
        _rowId: crypto.randomUUID(),
        rpm: null,
        altFt: null,
        fuelFlowMin: null,
        fuelFlowPerHour: null,
        fuelFlowMax: null,
        phaseLabel: "",
        comment: ""
      });
      profileDirty = true;
      renderProfileEditor()
    } catch (e) {
      $("profileEditStatus").textContent = e.message
    }
  };
  curveBox.querySelectorAll('[data-curve-key="comment"]').forEach(comment => comment.addEventListener("change", () => {
    let inferred = parseFuelRange(comment.value, fuelUnit()),
      i = comment.dataset.curveId,
      phase = curveBox.querySelector(`[data-curve-id="${i}"][data-curve-key="phaseLabel"]`),
      detected = inferredCurvePhase(comment.value);
    if (phase && !phase.value && detected) phase.value = detected;
    if (!inferred) return;
    /** Débit arrondi au dixième, en texte. */
    let plain = v => String(Math.round(v * 10) / 10);
    [
      ["fuelFlowMin", inferred.min],
      ["fuelFlowPerHour", inferred.nominal],
      ["fuelFlowMax", inferred.max]
    ].forEach(([key, value]) => {
      let input = curveBox.querySelector(`[data-curve-id="${i}"][data-curve-key="${key}"]`);
      if (input && !input.value.trim()) input.value = plain(value)
    });
    $("profileEditStatus").textContent = `Plage détectée : min. ${plain(inferred.min)}, nominal ${plain(inferred.nominal)}, max. ${plain(inferred.max)} ${fuelUnit()}/h.`
  }));
  box.oninput = curveBox.oninput = () => {
    profileDirty = true;
    window.updateProfileStatus?.()
  };
  box.onchange = box.oninput;
  curveBox.onchange = curveBox.oninput;
  decorateApd(box);
  FlightProfileHelp?.annotate(box, window.RepositoryNav?.getLanguage?.() ||
    "fr"); // aide au survol de chaque champ (shared/flight_profile_help.js)
  box.style.display = state.profileEditorHidden ? "none" : "grid";
  box.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
  $("toggleProfileEditor").textContent = state.profileEditorHidden ? "Afficher les champs" : "Masquer les champs";
}
/** Reporte les saisies de l'éditeur dans le profil actif (champs modifiés seulement, carburant reconverti dans l'unité du profil ; table RPM complétée par les plages écrites en commentaire), puis rafraîchit la fiche. announce : message d'état. Lève une erreur sans profil actif. N'écrit pas dans le stockage : c'est « Enregistrer ». */
function commitProfileEditor(announce = true) {
  if (!active) throw Error("Aucun profil actif.");
  document.querySelectorAll("[data-profile-path]").forEach(el => {
    if (isPristineInput(el)) return;
    let type = el.dataset.profileType,
      v = el.value;
    if (type === "number") {
      v = v.trim() === "" ? null : Number(v);
      if (el.dataset.profileFuel === "1") v = convertFuel(v, fuelUnit(), active.unit)
    } else if (type === "bool") v = v === "" ? null : v === "1";
    else v = v.trim();
    // valeur estimée (réponse ChatGPT) changée à la main : elle n'est plus estimée
    if (active.estimatedFields?.includes(el.dataset.profilePath) && JSON.stringify(pathGet(active, el.dataset.profilePath) ?? null) !==
      JSON.stringify(v)) active.estimatedFields = active.estimatedFields.filter(k => k !== el.dataset.profilePath);
    pathSet(active, el.dataset.profilePath, v)
  });
  if (active.estimatedFields && !active.estimatedFields.length) delete active.estimatedFields;
  let rows = {},
    edited = new Set(); // lignes de cartographie dont une valeur (hors commentaire) a été changée à la main
  document.querySelectorAll("[data-curve-id]").forEach(el => {
    let i = el.dataset.curveId,
      k = el.dataset.curveKey;
    rows[i] ??= {
      _rowId: i
    };
    if (k && k !== "comment" && !isPristineInput(el)) edited.add(i); // (le bouton × de la ligne porte aussi data-curve-id)
    rows[i][k] = k === "comment" || k === "phaseLabel" ? el.value.trim() : (el.value.trim() === "" ? null : Number(el.value))
  });
  let curve = Object.values(rows).map(p => {
    let inferred = (p.fuelFlowMin === null && p.fuelFlowPerHour === null && p.fuelFlowMax === null) ? parseFuelRange(p.comment,
      fuelUnit()) : null;
    let min = p.fuelFlowMin ?? inferred?.min ?? p.fuelFlowPerHour,
      max = p.fuelFlowMax ?? inferred?.max ?? p.fuelFlowPerHour,
      nom = p.fuelFlowPerHour ?? inferred?.nominal ?? (Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : null);
    return {
      _rowId: p._rowId,
      rpm: p.rpm,
      altFt: Number.isFinite(p.altFt) ? p.altFt : null,
      fuelFlowMin: convertFuel(min, fuelUnit(), active.unit),
      fuelFlowPerHour: convertFuel(nom, fuelUnit(), active.unit),
      fuelFlowMax: convertFuel(max, fuelUnit(), active.unit),
      phaseLabel: p.phaseLabel || inferredCurvePhase(p.comment),
      // ligne changée à la main : la mention « estimé (ChatGPT) » de son commentaire tombe
      comment: edited.has(p._rowId) ? String(p.comment || "").replace(ESTIMATED_MARK, "").trim() : p.comment || ""
    }
  });
  active.rpmFuelCurve = curve;
  normalize(active);
  profileDirty = JSON.stringify(active) !== activeSavedSnapshot;
  renderProfile();
  renderPerfProfilesSoon();
  if (announce) $("profileEditStatus").textContent = `Modifications en attente. ${curve.length} ligne(s) de cartographie conservée(s), y compris les lignes vides.`;
  window.updateProfileStatus?.()
}
/** Mention « estimé (ChatGPT) » (4 langues) ajoutée au commentaire d'une ligne de cartographie estimée. */
const ESTIMATED_MARK = /\s*(—\s*)?(estimé|estimated|geschätzt|estimado) \(ChatGPT\)/i;
const FUEL_KEYS = new Set(["fuelFlowPerHour", "fuelFlowMin", "fuelFlowMax", "usableFuel", "taxiFuel", "reserveFuel", "extraFuel"]);
const SKIP_MERGE_KEYS = new Set(["_rowId", "id", "unit", "source", "mergedProfileIds", "lnmSource", "estimatedFields", "gptSources"]);
/** Vrai pour null, undefined, chaîne vide ou tableau vide (valeur « à compléter »). */
function isBlankValue(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && !v.length)
}
/** Copie profonde d'un objet dont les champs de carburant (FUEL_KEYS) sont convertis from → to ; ok faux : ces champs sont vidés (conversion impossible, ex. gallons). */
function fuelConvertedCopy(o, from, to, ok) {
  if (Array.isArray(o)) return o.map(x => fuelConvertedCopy(x, from, to, ok));
  if (o && typeof o === "object") {
    let r = {};
    for (const [k, v] of Object.entries(o)) r[k] = FUEL_KEYS.has(k) && typeof v === "number" ? (ok ? convertFuel(v, from, to) : null) : (
      k === "simbriefSnapshot" || k === "calibration" ? structuredClone(v) : fuelConvertedCopy(v, from, to, ok));
    return r
  }
  return o
}
/** Fusionne deux tables RPM (t prioritaire) : lignes de s ajoutées si leur RPM (à la même altitude) est absent de t ; phase et commentaire complétés sinon. */
function mergeCurves(t, s) {
  t = Array.isArray(t) ? t : [];
  s = Array.isArray(s) ? s : [];
  /** Clé de rapprochement d'une ligne de table RPM : régime au millième et altitude (colonne facultative), null sans régime. */
  const key = r => r && r.rpm !== null && r.rpm !== undefined && Number.isFinite(Number(r.rpm)) ?
    `${Math.round(Number(r.rpm) * 1000)}@${r.altFt !== null && r.altFt !== undefined && r.altFt !== "" && Number.isFinite(+r.altFt) ? +r.altFt : ""}` : null;
  const out = [...t];
  for (const r of s) {
    const k = key(r);
    if (k === null) continue;
    const cur = out.find(x => key(x) === k);
    if (cur) {
      if (isBlankValue(cur.phaseLabel) && !isBlankValue(r.phaseLabel)) cur.phaseLabel = r.phaseLabel;
      if (isBlankValue(cur.comment) && !isBlankValue(r.comment)) cur.comment = r.comment;
      continue
    }
    out.push(r)
  }
  return out
}
/** Complète les champs vides de target avec ceux de source (unités converties), sans écraser une valeur existante ; tables RPM fusionnées. Sortie : target. */
function fillProfileGaps(target, source) {
  if (!target || !source || target === source) return target;
  let src = structuredClone(source);
  if (src.unit && target.unit && src.unit !== target.unit) src = fuelConvertedCopy(src, src.unit, target.unit, ["kg", "lb"].includes(src
    .unit) && ["kg", "lb"].includes(target.unit));
  /** Fusion récursive : champs vides de t remplis par s (clés exclues ignorées, tables RPM fusionnées). */
  const merge = (t, s) => {
    for (const [k, v] of Object.entries(s)) {
      if (SKIP_MERGE_KEYS.has(k)) continue;
      if (k === "rpmFuelCurve") {
        t[k] = mergeCurves(t[k], v);
        continue
      }
      if (isBlankValue(t[k])) {
        if (!isBlankValue(v)) t[k] = v;
        continue
      }
      if (v && typeof v === "object" && !Array.isArray(v) && typeof t[k] === "object" && !Array.isArray(t[k])) merge(t[k], v)
    }
  };
  merge(target, src);
  return target
}
/** Range un profil dans state.profiles (complété par l'ancienne version du même id). N'enregistre pas le stockage. */
function storeProfile(p) {
  // import explicite (fichier, OFP, SimBrief) d'un profil supprimé auparavant : il revient (la relecture du dossier, elle,
  // saute les profils supprimés avant d'arriver ici)
  if (state.removedProfiles?.[p.id]) delete state.removedProfiles[p.id];
  let old = state.profiles[p.id];
  if (old && old !== p) fillProfileGaps(p, old);
  state.profiles[p.id] = p
}
/** Vrai si un champ de l'éditeur n'a pas été modifié depuis son rendu (sélection ou valeur par défaut). */
function isPristineInput(el) {
  if (el.tagName === "SELECT") {
    let d = [...el.options].findIndex(o => o.defaultSelected);
    return el.selectedIndex === (d >= 0 ? d : 0)
  }
  return el.value === el.defaultValue
}
/** Rend un profil actif : copie normalisée, complétée par la version stockée ; mise à jour de l'en-tête, de la fiche, de l'état « modifié », enregistrement et recalcul du devis. source : texte d'origine affiché. */
function setActive(p, source = "local") {
  if (PERF_PAGE === "fuel") noSheetLine("");
  active = normalize(structuredClone(p));
  // Carburant : la fiche consultée se modifie dans les Fiches de performances
  const edit = document.getElementById("editSheetLink");
  if (edit) {
    edit.href = `performance_sheets.html?aircraft=${encodeURIComponent(active.id)}`;
    edit.textContent = kt(["Modifier cette fiche dans les Fiches de performances ↗", "Edit this sheet in Performance sheets ↗",
      "Dieses Blatt in den Leistungsblättern bearbeiten ↗", "Modificar esta ficha en las Fichas de rendimiento ↗"
    ])
  }
  let stored = state.profiles[active.id];
  if (stored && stored !== p && p !== active) fillProfileGaps(active, stored);
  if (!stored) {
    state.profiles[active.id] = structuredClone(active);
    stored = state.profiles[active.id]
  }
  activeSavedSnapshot = JSON.stringify(normalize(structuredClone(stored)));
  profileDirty = JSON.stringify(active) !== activeSavedSnapshot;
  $("airBtn").textContent = `Avion : ${active.id}`;
  $("source").textContent = source;
  syncAircraftPicker();
  updateFuelUnitButton();
  renderProfile();
  renderPerfProfilesSoon();
  save();
  window.updateProfileStatus?.();
  gptFollow({
    id: active.id,
    landing: !state.profiles?.[active.id]
  }); // panneau ChatGPT ouvert : il suit l'appareil choisi
  if (!ppSelected.has(active.id) || ppSelected.size !== 1) ppSelectionFollowActive();
  try {
    calculate()
  } catch (e) {
    console.warn("calcul auto :", e)
  }
}
/** Plus de profil actif (après suppression) : fiche et éditeur vidés, message affiché, état enregistré. */
function clearActive(message = "Aucun profil actif") {
  active = null;
  activeSavedSnapshot = "";
  profileDirty = false;
  state[PERF_PAGE === "sheets" ? "lastSheet" : "lastAircraft"] = null;
  $("airBtn").textContent = "Avion : aucun";
  $("source").textContent = message;
  syncAircraftPicker();
  $("profile").innerHTML = '<div>État</div><div>Aucun profil chargé</div>';
  $("curve").innerHTML = '<tr><td colspan="7">Aucun profil.</td></tr>';
  renderProfileEditor();
  renderPerfProfilesSoon();
  save();
  window.updateProfileStatus?.()
}
/** Texte du débit d'une phase (climb / cruise / descent) : lu dans la table RPM si la phase a un régime nominal, sinon débit du profil. */
function phaseFuelDisplay(phaseName) {
  let phase = active[phaseName] || {},
    rpm = finiteProfileNumber(phase.rpmNominal) ? Number(phase.rpmNominal) : null,
    map = rpm !== null ? interpRange(active.rpmFuelCurve || [], rpm) : null,
    ff = map?.nominal ?? phase.fuelFlowPerHour,
    text = `${showFuel(ff)} ${fuelUnit()}/h`;
  return rpm !== null ? `${rpm} RPM · ${text}${map?" (cartographie)":""}` : text
}
/** Fiche du profil actif (nom, type, unités, vitesses, débits par phase, TOD), table RPM en lecture, fiches du type, puis l'éditeur. */
function renderProfile() {
  if (!active) return;
  renderDefaSheets();
  const vals = [
    ["Nom", active.name],
    ["Type / ICAO", active.type || active.icao || active.id],
    ["Indicatif", active.callsign || "—"],
    ["Immatriculation", active.registration || "—"],
    ["Airframe SimBrief", active.simbriefAirframeId || "—"],
    ["Unité stockée / affichée", `${active.unit} / ${fuelUnit()}`],
    ["TAS croisière", `${active.cruise.tasKt||"—"} kt`],
    ["Croisière", phaseFuelDisplay("cruise")],
    ["Montée", `${active.climb.rateFpm||"—"} ft/min · ${phaseFuelDisplay("climb")}`],
    ["Descente", `${active.descent.rateFpm||"—"} ft/min · ${phaseFuelDisplay("descent")}`],
    ["TOD", `${active.tod.gradientFtPerNm||300} ft/NM + ${active.tod.bufferNm||0} NM`]
  ];
  $("profile").innerHTML = vals.map(x => `<div>${x[0]}</div><div>${window.RepositoryKit.esc(x[1])}</div>`).join("");
  /** Altitude d'une ligne de cartographie (−1 sans altitude : en tête du tri). */
  const altOf = x => x.altFt !== null && x.altFt !== undefined && x.altFt !== "" && Number.isFinite(+x.altFt) ? +x.altFt : -1;
  setText("curveAltTh", kt(["Altitude (ft)", "Altitude (ft)", "Höhe (ft)", "Altitud (ft)"]));
  $("curve").innerHTML = (active.rpmFuelCurve || []).sort((a, b) => (altOf(a) - altOf(b)) || a.rpm - b.rpm).map(x => `<tr><td>${x.rpm}</td><td>${altOf(x) >= 0 ? fmt(altOf(x), 0) : "—"}</td><td>${showFuel(x.fuelFlowMin??x.fuelFlowPerHour)}</td><td>${showFuel(x.fuelFlowPerHour)}</td><td>${showFuel(x.fuelFlowMax??x.fuelFlowPerHour)}</td><td>${fuelUnit()}/h</td><td class="tbl-clip" title="${window.RepositoryKit.esc(x.comment||"")}">${window.RepositoryKit.esc(x.comment||"")}</td></tr>`).join("") ||
    '<tr><td colspan="7">Pas de courbe RPM dans ce profil.</td></tr>';
  renderProfileEditor();
  renderPerfProfilesSoon();
}
// ===== Consommation de croisière : saisie du vol, profil, Poll-Schumann, SimBrief, estimation =====
// Sources, dans l'ordre : saisie du vol (champ « Consommation de croisière », state.quickFF[id] en kg/h, qui
// remplace le profil pour ce vol), profil enregistré (table RPM au régime de croisière, sinon débit de croisière),
// Poll-Schumann (shared/fuel_poll_schumann.js, avions de ligne à réaction), SimBrief (AIRCRAFT_PERF[type].simbrief), estimation
// par type ou classe OACI (shared/fuel_reference.js) ; une valeur approchée est marquée « ≈ ». Textes en quatre
// langues (K.t / K.tf).
const KIT = window.RepositoryKit,
  kt = row => KIT.t(row),
  ktf = (row, vals) => KIT.tf(row, vals);
/** Écrit un texte dans un élément seulement s'il change (rien ne clignote, les observateurs restent au repos). */
function setText(id, text) {
  const el = $(id);
  if (el && el.textContent !== text) el.textContent = text
}
const writtenHtml = new Map();
/** Écrit du HTML dans un élément seulement s'il diffère du dernier HTML écrit par cette fonction. */
function setHtml(id, html) {
  const el = $(id);
  if (!el || writtenHtml.get(id) === html) return;
  writtenHtml.set(id, html);
  el.innerHTML = html
}
/** Fiche EUROCONTROL APD d'un profil : code OACI, type ou identifiant, directement ou par les alias de la base des types
 *  (A4M ↔ A400) ; null si absente (base non installée). */
function apdOf(p) {
  const P = window.AIRCRAFT_PERF || {},
    al = window.AIRCRAFT_DB?.__aliases || {};
  for (const v of [p?.icao, p?.type, p?.id]) {
    const k = aKey(v);
    if (!k) continue;
    if (P[k]) return P[k];
    if (al[k] && P[al[k]]) return P[al[k]];
    const back = Object.keys(al).find(a => al[a] === k && P[a]);
    if (back) return P[back]
  }
  return null
}
/** Données SimBrief du type (AIRCRAFT_PERF[type].simbrief, remplies par « Compléter automatiquement » du lanceur) ;
 *  null si absentes ou sans consommation de croisière utilisable. */
function simbriefOf(p) {
  const sb = apdOf(p)?.simbrief;
  return sb && typeof sb === "object" ? sb : null
}
/** Codes OACI candidats d'un profil (OACI, type, identifiant, et leurs alias de la base des types), sans doublon. */
function icaoCodes(p) {
  const al = window.AIRCRAFT_DB?.__aliases || {},
    out = [];
  for (const v of [p?.icao, p?.type, p?.id]) {
    const k = aKey(v);
    if (!k) continue;
    out.push(k);
    if (al[k]) out.push(aKey(al[k]));
    for (const a of Object.keys(al))
      if (aKey(al[a]) === k) out.push(a)
  }
  return [...new Set(out)]
}
/** Consommation Poll-Schumann (shared/fuel_poll_schumann.js) du type code au niveau alt (ft), Mach mach (null : Mach
 *  de conception du module) : masse à mi-croisière = masse au décollage saisie dans le devis moins la moitié du
 *  carburant de l'étape (premier calcul à la masse au décollage), sinon masse moyenne du module ((MZFW + MTOW) / 2).
 *  Sortie : { kg (kg/h), massKg, how ("mid" | "mean"), mach (Mach retenu, borné au MMO) } ou null (hors du modèle). */
function pollSchumann(code, alt, mach, tasKt) {
  const ps = window.FuelPollSchumann,
    par = (() => {
      try {
        return ps.params?.(code) || null
      } catch {
        return null
      }
    })(),
    m = mach > 0 ? Math.min(mach, +par?.mmo || mach) : (+par?.mDes || null);
  /** Débit du module à la masse kg (null : défaut du module) ; NaN s'il refuse. */
  const ff = kg => {
    try {
      const o = {
        altitudeFt: alt
      };
      if (kg > 0) o.massKg = kg;
      if (m > 0) o.mach = m;
      return +ps.fuelFlowKgh(code, o)
    } catch {
      return NaN /* hors du domaine du modèle */
    }
  };
  const tow = convertFuel(+$("tow")?.value || 0, fuelUnit(), "kg"),
    D = +$("dist")?.value || 0;
  if (tow > 0) {
    const ff0 = ff(tow),
      half = ff0 > 0 && tasKt > 0 && D > 0 ? ff0 * D / tasKt / 2 : 0,
      mid = Math.max(tow - half, +par?.oewKg || 0),
      kg = ff(mid);
    return kg > 0 ? {
      kg,
      massKg: mid,
      how: "mid",
      mach: m
    } : null
  }
  const kg = ff(null),
    mean = par?.mzfwKg > 0 && par?.mtowKg > 0 ? (par.mzfwKg + par.mtowKg) / 2 : null;
  return kg > 0 ? {
    kg,
    massKg: mean,
    how: "mean",
    mach: m
  } : null
}
/** Consommation de croisière retenue pour un profil (pr : le profil actif par défaut ; la base de performances la
 *  demande pour chaque type) et son origine. Table RPM lue à l'altitude du plan (colonne Altitude facultative). Ordre : saisie du vol (state.quickFF, qui
 *  remplace le profil pour ce vol), profil enregistré (table RPM au régime de croisière, sinon débit de croisière), puis
 *  source automatique (auto) : Poll-Schumann si le type est couvert (shared/fuel_poll_schumann.js),
 *  SimBrief (≈ si sa précision n'est pas « high »), estimation par type ou classe OACI (≈, shared/fuel_reference.js).
 *  TAS : profil, EUROCONTROL, SimBrief (vitesse, sinon Mach au niveau du plan), estimation, 300 kt.
 *  Sortie : { ff (unité du profil, null si aucune), kind ("entry" | "profile" | "map" | "ps" | "simbrief" | "estimate"
 *  | null), approx, profileFF, auto ({ ff, kind, approx, kg, mass, mach } ou null), est, tas, tasKind }. */
function cruiseSource(pr = active) {
  if (!pr) return {
    ff: null,
    kind: null,
    approx: false,
    profileFF: null,
    auto: null,
    est: null,
    tas: null,
    tasKind: null
  };
  const u = pr.unit || "kg",
    cr = pr.cruise || {},
    rpm = finiteProfileNumber(cr.rpmNominal) ? Number(cr.rpmNominal) : null,
    map = rpm !== null ? interpRange(pr.rpmFuelCurve || [], rpm, Math.max(0, (+$("fl")?.value || 0) * 100)) : null,
    own = +cr.fuelFlowPerHour > 0 ? +cr.fuelFlowPerHour : null,
    profileFF = map?.nominal > 0 ? map.nominal : own,
    entryKg = +(state.quickFF || {})[pr.id] || 0,
    apd = apdOf(pr),
    sb = simbriefOf(pr),
    est = window.FuelReference?.estimate({
      codes: [pr.type, pr.icao, pr.id],
      db: window.AIRCRAFT_DB,
      apd
    }) || null,
    alt = Math.max(0, (+$("fl")?.value || 0) * 100);
  // TAS de croisière et son origine
  const sbTas = +sb?.speedKt > 0 ? +sb.speedKt : +sb?.mach > 0 ? +sb.mach * FlightPerfModel.isa(alt).a : 0;
  const [tas, tasKind] = +cr.tasKt > 0 ? [+cr.tasKt, "profile"] : +apd?.cruise?.tasKt > 0 ? [+apd.cruise.tasKt, "apd"] : sbTas > 0 ? [
    sbTas, "simbrief"
  ] : est?.tasKt > 0 ? [est.tasKt, "estimate"] : [300, "default"];
  // Source automatique : Poll-Schumann, SimBrief, estimation
  let auto = null;
  const ps = window.FuelPollSchumann,
    code = ps?.covers ? icaoCodes(pr).find(c => {
      try {
        return ps.covers(c)
      } catch {
        return false
      }
    }) : null;
  if (code && alt > 0) {
    // Mach tiré de la TAS connue (profil, EUROCONTROL, SimBrief), sinon Mach de conception du module
    const known = ["profile", "apd", "simbrief"].includes(tasKind),
      r = pollSchumann(code, alt, known ? tas / FlightPerfModel.isa(alt).a : null, known ? tas : null);
    if (r) auto = {
      kg: r.kg,
      kind: "ps",
      approx: false,
      ps: {
        ...r,
        alt
      }
    }
  }
  if (!auto && +sb?.fuelflowKgh > 0) auto = {
    kg: +sb.fuelflowKgh,
    kind: "simbrief",
    approx: sb.accuracy !== "high"
  };
  if (!auto && est?.kgPerHour > 0) auto = {
    kg: est.kgPerHour,
    kind: "estimate",
    approx: true
  };
  if (auto) auto.ff = convertFuel(auto.kg, "kg", u);
  const [ff, kind, approx] = entryKg > 0 ? [convertFuel(entryKg, "kg", u), "entry", false] : profileFF ? [profileFF, map?.nominal > 0 ?
    "map" : "profile", false
  ] : auto ? [auto.ff, auto.kind, auto.approx] : [null, null, false];
  return {
    ff,
    kind,
    approx,
    profileFF,
    auto,
    est,
    tas,
    tasKind
  }
}
/** Profil passé au modèle de performances : le profil actif, croisière complétée (TAS, débit) par cruiseSource quand
 *  il lui en manque ou qu'une saisie du vol le remplace ; montée (Badin, vario) et descente (vario, Badin) complétées
 *  par la fiche EUROCONTROL du type quand le profil ne les donne pas (sans elles, le modèle prend un vario type de la
 *  classe et sous-estime souvent le plafond). Copie superficielle : le profil n'est pas modifié. */
function modelProfile() {
  if (!active) return active;
  const s = cruiseSource(),
    cr = active.cruise || {},
    cl = active.climb || {},
    de = active.descent || {},
    apd = apdOf(active),
    aCl = apd?.climb150 || apd?.climbInitial || null,
    aDe = apd?.descent || null,
    ownFF = +cr.fuelFlowPerHour > 0,
    ownTas = +cr.tasKt > 0,
    fillCl = !!aCl && (!(+cl.iasKt > 0) || !(Math.abs(+cl.rateFpm) > 0)),
    fillDe = !!aDe && !(Math.abs(+de.rateFpm) > 0);
  if (s.kind !== "entry" && ownFF && ownTas && !fillCl && !fillDe) return active;
  return {
    ...active,
    cruise: {
      ...cr,
      tasKt: ownTas ? +cr.tasKt : s.tas,
      fuelFlowPerHour: s.kind === "entry" || !ownFF ? s.ff : +cr.fuelFlowPerHour
    },
    climb: fillCl ? {
      ...cl,
      iasKt: +cl.iasKt > 0 ? +cl.iasKt : +aCl.iasKt || cl.iasKt,
      rateFpm: Math.abs(+cl.rateFpm) > 0 ? +cl.rateFpm : +aCl.rocFpm || cl.rateFpm
    } : cl,
    descent: fillDe ? {
      ...de,
      rateFpm: -Math.abs(+aDe.rodFpm || 0) || de.rateFpm,
      iasKt: +de.iasKt > 0 ? +de.iasKt : +aDe.iasKt || de.iasKt
    } : de
  }
}
/** Origine d'une consommation (kind, auto pour les sources automatiques), en clair : « profil enregistré », « saisie
 *  pour ce vol », « Poll-Schumann, 112 800 kg (MTOW − 20 %), Mach 0,62 », « SimBrief », « estimation classe L4T / H »… */
function ffSourceText(s, kind = s.kind) {
  if (kind === "entry") return kt(["saisie pour ce vol", "entered for this flight", "für diesen Flug eingegeben",
    "introducido para este vuelo"
  ]);
  if (kind === "map") return kt(["table RPM du profil", "profile RPM table", "Drehzahltabelle des Profils", "tabla RPM del perfil"]);
  if (kind === "profile") return kt(["profil enregistré", "saved profile", "gespeichertes Profil", "perfil guardado"]);
  if (kind === "ps" && s.auto?.ps) {
    const p = s.auto.ps,
      mass = p.massKg > 0 ? `${fmt(p.massKg / 1000, 0)} t ${p.how === "mid" ? kt(["à mi-croisière", "at mid-cruise", "in Reiseflugmitte",
        "a mitad del crucero"
      ]) : kt(["(masse moyenne)", "(mean mass)", "(mittlere Masse)", "(masa media)"])}, ` : "";
    return `Poll-Schumann, ${mass}${flTxt(p.alt)}${p.mach > 0 ? `, M${fmt(p.mach, 2)}` : ""}`
  }
  if (kind === "simbrief") return "SimBrief";
  if (kind === "estimate") return estimateText(s.est);
  return ""
}
/** Nature d'une estimation : « estimation type A400 » ou « estimation classe L4T / H ». */
function estimateText(est) {
  if (!est) return "";
  return est.basis === "type" ? ktf(["estimation type {code}", "estimate for type {code}", "Schätzung Typ {code}",
    "estimación tipo {code}"
  ], {
    code: est.code
  }) : ktf(["estimation classe {cls}", "estimate for class {cls}", "Schätzung Klasse {cls}", "estimación clase {cls}"], {
    cls: `${est.cls}${est.wtc?` / ${est.wtc}`:""}`
  })
}
/** Champ « Consommation de croisière » du devis : libellé (unité affichée), valeur (saisie ou profil), estimation en
 *  indication, origine, boutons « Utiliser cette estimation » et « Mémoriser pour ce type ». Écrit seulement ce qui change. */
function renderFuelSource() {
  const u = fuelUnit(),
    s = cruiseSource(),
    input = $("cruiseFF"),
    esc = window.RepositoryKit.esc;
  setText("cruiseFFLabel", ktf(["Consommation de croisière ({u}/h)", "Cruise fuel flow ({u}/h)", "Reiseverbrauch ({u}/h)",
    "Consumo de crucero ({u}/h)"
  ], {
    u
  }));
  const auto = s.auto,
    shown = s.kind === "entry" || s.kind === "profile" || s.kind === "map" ? fuelInput(s.ff) : "",
    hint = auto ? `${auto.approx?"≈ ":""}${fuelInput(auto.ff)}` : "";
  if (document.activeElement !== input && input.value !== shown) input.value = shown;
  if (input.placeholder !== hint) input.placeholder = hint;
  if (input.disabled !== !active) input.disabled = !active;
  const autoTxt = auto ? `<span${auto.approx?' class="calc-est"':""}>${auto.approx?"≈ ":""}${esc(showFuel(auto.ff))} ${u}/h, ${esc(ffSourceText(s, auto.kind))}</span>` : "";
  let html;
  if (!active) html = esc(kt(["Choisir d’abord l’avion en haut de page.", "Choose the aircraft at the top of the page first.",
    "Zuerst oben auf der Seite das Flugzeug wählen.", "Elegir primero el avión en la parte superior de la página."
  ]));
  else if (s.kind === "entry") html = esc(s.profileFF ? ktf(["Saisie pour ce vol (profil : {v} {u}/h).",
    "Entered for this flight (profile: {v} {u}/h).", "Für diesen Flug eingegeben (Profil: {v} {u}/h).",
    "Introducido para este vuelo (perfil: {v} {u}/h)."
  ], {
    v: showFuel(s.profileFF),
    u
  }) : kt(["Saisie pour ce vol ; le profil n’a pas de consommation de croisière.",
    "Entered for this flight; the profile has no cruise fuel flow.",
    "Für diesen Flug eingegeben; das Profil hat keinen Reiseverbrauch.",
    "Introducido para este vuelo; el perfil no tiene consumo de crucero."
  ]));
  else if (s.kind === "map" || s.kind === "profile") html = esc(ktf(["Valeur du profil ({src}).", "Profile value ({src}).",
    "Profilwert ({src}).", "Valor del perfil ({src})."
  ], {
    src: ffSourceText(s)
  }));
  else if (auto && s.kind === auto.kind) html = esc(kt(["Aucune consommation dans le profil : le calcul utilise",
    "No fuel flow in the profile: the calculation uses",
    "Kein Verbrauch im Profil: die Berechnung verwendet", "Sin consumo en el perfil: el cálculo usa"
  ])) + " " + autoTxt + ".";
  else html = esc(kt(["Aucune consommation connue pour ce type : saisir la valeur de croisière (manuel de vol, OFP).",
    "No fuel flow known for this type: enter the cruise value (flight manual, OFP).",
    "Kein Verbrauch für diesen Typ bekannt: Reisewert eingeben (Flughandbuch, OFP).",
    "Ningún consumo conocido para este tipo: introducir el valor de crucero (manual de vuelo, OFP)."
  ]));
  setHtml("ffSource", html);
  const useBtn = $("ffUseEstimate"),
    memBtn = $("ffRemember"),
    showUse = !!active && !!auto && s.kind === auto.kind,
    showMem = !!active && s.kind === "entry" && !(finiteProfileNumber(active.cruise?.rpmNominal) && s.profileFF);
  if (useBtn.hidden !== !showUse) useBtn.hidden = !showUse;
  if (memBtn.hidden !== !showMem) memBtn.hidden = !showMem;
  setText("ffUseEstimate", kt(["Utiliser cette valeur", "Use this value", "Diesen Wert verwenden", "Usar este valor"]));
  const useTip = kt(["Recopie cette consommation dans le champ, pour la corriger ou la mémoriser pour ce type.",
    "Copies this fuel flow into the field, to correct it or remember it for this type.",
    "Übernimmt diesen Verbrauch ins Feld, um ihn zu korrigieren oder für diesen Typ zu speichern.",
    "Copia este consumo en el campo, para corregirlo o guardarlo para este tipo."
  ]);
  if (useBtn.title !== useTip) useBtn.title = useTip;
  setText("ffRemember", kt(["Mémoriser pour ce type", "Remember for this type", "Für diesen Typ speichern", "Guardar para este tipo"]));
  const tip = kt(["Écrit cette consommation de croisière dans le profil de l’appareil (comme « Enregistrer le profil »).",
    "Writes this cruise fuel flow into the aircraft profile (like “Save profile”).",
    "Schreibt diesen Reiseverbrauch ins Flugzeugprofil (wie „Profil speichern“).",
    "Escribe este consumo de crucero en el perfil del avión (como «Guardar perfil»)."
  ]);
  if (memBtn.title !== tip) memBtn.title = tip
}
/** Saisie du champ « Consommation de croisière » (unité affichée) : rangée en kg/h pour ce vol et cet appareil ; vide,
 *  nulle ou égale au profil : la saisie est retirée (le profil, sinon l'estimation, reprend la main). Puis recalcul. */
function commitCruiseEntry() {
  if (!active) return;
  const raw = $("cruiseFF").value.trim(),
    v = raw === "" ? 0 : +raw,
    kg = Number.isFinite(v) && v > 0 ? convertFuel(v, fuelUnit(), "kg") : 0,
    s = cruiseSource(),
    profKg = s.profileFF ? convertFuel(s.profileFF, active.unit || "kg", "kg") : null,
    q = state.quickFF ||= {},
    before = q[active.id];
  if (!(kg > 0) || (profKg && Math.abs(profKg - kg) < 0.5)) delete q[active.id];
  else q[active.id] = Math.round(kg * 10) / 10;
  if (q[active.id] === before) return renderFuelSource();
  calculate()
}
$("cruiseFF").addEventListener("change", commitCruiseEntry);
// « Utiliser cette valeur » : la source automatique (Poll-Schumann, SimBrief, estimation) devient la saisie du vol
// (modifiable, mémorisable).
$("ffUseEstimate").onclick = () => {
  const s = cruiseSource();
  if (!active || !s.auto) return;
  (state.quickFF ||= {})[active.id] = Math.round(s.auto.kg * 10) / 10;
  calculate();
  $("cruiseFF").focus()
};
/** « Mémoriser pour ce type » : la saisie du vol devient la consommation de croisière du profil enregistré (même
 *  écriture que « Enregistrer le profil », limitée à ce champ : les autres modifications en cours restent à enregistrer). */
function rememberCruiseFF() {
  const kg = +(state.quickFF || {})[active?.id] || 0;
  if (!active || !(kg > 0)) return;
  try {
    commitProfileEditor(false)
  } catch {}
  const stored = state.profiles[active.id] ||= structuredClone(active),
    r1 = v => Math.round(v * 10) / 10;
  (stored.cruise ||= {}).fuelFlowPerHour = r1(convertFuel(kg, "kg", stored.unit || "kg"));
  (active.cruise ||= {}).fuelFlowPerHour = r1(convertFuel(kg, "kg", active.unit || "kg"));
  delete state.quickFF[active.id];
  activeSavedSnapshot = JSON.stringify(normalize(structuredClone(stored)));
  profileDirty = JSON.stringify(active) !== activeSavedSnapshot;
  save();
  renderProfile();
  renderPerfProfilesSoon();
  window.updateProfileStatus?.();
  window.AppFramework.notify(ktf(["Consommation de croisière mémorisée pour {ac} : {v} {u}/h.",
    "Cruise fuel flow remembered for {ac}: {v} {u}/h.", "Reiseverbrauch für {ac} gespeichert: {v} {u}/h.",
    "Consumo de crucero guardado para {ac}: {v} {u}/h."
  ], {
    ac: active.name || active.id,
    v: fmt(convertFuel(kg, "kg", fuelUnit()), 0),
    u: fuelUnit()
  }), "ok");
  calculate()
}
$("ffRemember").onclick = rememberCruiseFF;

/** Libellés des trois valeurs principales du Résultat (carburant bloc, temps de vol, début de descente), dans la
 *  langue de la page ; écrits seulement s'ils changent. */
function resultLabels() {
  setText("lblBlock", kt(["Carburant bloc", "Block fuel", "Blockkraftstoff", "Combustible de bloque"]));
  setText("lblTime", kt(["Temps de vol", "Flight time", "Flugzeit", "Tiempo de vuelo"]));
  setText("lblTod", kt(["Début de descente (TOD)", "Top of descent (TOD)", "Sinkflugbeginn (TOD)", "Inicio del descenso (TOD)"]));
  const tip = kt(["Distance avant l’arrivée où commencer la descente, selon la pente du profil.",
    "Distance before arrival at which to start the descent, from the profile gradient.",
    "Entfernung vor der Ankunft, ab der der Sinkflug beginnt (Sinkgradient des Profils).",
    "Distancia antes de la llegada a la que iniciar el descenso, según la pendiente del perfil."
  ]);
  if ($("lblTod").title !== tip) $("lblTod").title = tip
}
resultLabels();
window.addEventListener("repository-language-change", () => setTimeout(resultLabels));
// ===== Vue simple / détaillée (bouton du Résultat) et ligne d'état du calcul =====
/** Vue détaillée (courbes de niveau et de consommation, panneaux, instruments) : choix mémorisé dans ce navigateur
 *  (state.detailView, flightPerfState), sinon selon le niveau d'utilisation (Expert : détaillée). */
const detailOn = () => typeof state.detailView === "boolean" ? state.detailView : (window.RepositoryNav?.levels?.get?.() ?? 4) >= 4;
let curvesStale = true, // courbes à retracer (calcul fait en vue simple, ou jamais tracées)
  curvesKey = "", // données des dernières courbes tracées (un devis seul qui les change les retrace)
  lastCalc = null; // dernier calcul, pour la ligne d'état (redite au changement de langue ou de vue)
/** Applique la vue (classe fp-detail du corps de page) et le libellé du bouton ; écrit seulement ce qui change. */
function applyDetailView() {
  const on = detailOn(),
    b = $("viewToggle");
  if (document.body.classList.contains("fp-detail") !== on) {
    document.body.classList.toggle("fp-detail", on);
    window.StickyFrame?.refresh?.()
  }
  setText("viewToggle", on ? kt(["Vue simple", "Simple view", "Einfache Ansicht", "Vista simple"]) : kt(["Vue détaillée", "Detailed view",
    "Detailansicht", "Vista detallada"
  ]));
  const tip = on ? kt(["Masquer les courbes de niveau et de consommation et les instruments.",
    "Hide the level and fuel curves and the instruments.", "Höhen- und Verbrauchskurven sowie Instrumente ausblenden.",
    "Ocultar las curvas de nivel y de consumo y los instrumentos."
  ]) : kt(["Afficher les courbes de niveau et de consommation et les instruments.",
    "Show the level and fuel curves and the instruments.", "Höhen- und Verbrauchskurven sowie Instrumente anzeigen.",
    "Mostrar las curvas de nivel y de consumo y los instrumentos."
  ]);
  if (b.title !== tip) b.title = tip;
  if (b.getAttribute("aria-pressed") !== String(on)) b.setAttribute("aria-pressed", String(on))
}
// Bascule simple ↔ détaillée : choix mémorisé ; courbes tracées seulement si elles manquent ou ne sont plus à jour.
$("viewToggle").onclick = () => {
  state.detailView = !detailOn();
  save();
  applyDetailView();
  window.FlightPerfView?.syncClimb?.(); // « Régler par le régime » : vue détaillée seulement
  if (state.detailView && active && curvesStale) calculate();
  else {
    renderCalcStatus();
    // courbes déjà calculées : redessinées à la largeur de la nouvelle mise en page (sans recalcul)
    if (state.detailView) requestAnimationFrame(() => window.FlightPerfView?.renderAll?.())
  }
};
/** Ligne d'état du Résultat : ce qui a été calculé, pour quel appareil, avec quelle consommation (et son origine) ;
 *  sans consommation, pourquoi et quoi faire ; en vue simple, où trouver les courbes. Écrite seulement si elle change. */
function renderCalcStatus() {
  const c = lastCalc,
    esc = window.RepositoryKit.esc,
    lang = window.RepositoryNav?.getLanguage?.() || "fr",
    parts = [];
  if (!c || c.none) parts.push(`<span class="calc-warn">${esc(kt(["Aucun avion choisi : choisir l’appareil en haut de page (bouton « Aucun avion »), puis « Calculer ».",
    "No aircraft chosen: pick the aircraft at the top of the page (“No aircraft” button), then “Calculate”.",
    "Kein Flugzeug gewählt: oben auf der Seite das Flugzeug wählen (Schaltfläche „Kein Flugzeug“), dann „Berechnen“.",
    "Ningún avión elegido: elegir el avión en la parte superior de la página (botón «Ningún avión») y luego «Calcular»."
  ]))}</span>`);
  else {
    const s = c.src,
      u = fuelUnit();
    parts.push(esc(ktf(["Calculé pour {ac} à {time} : {dist} NM au {fl}, temps de vol {t}, TOD {tod} NM.",
      "Calculated for {ac} at {time}: {dist} NM at {fl}, flight time {t}, TOD {tod} NM.",
      "Berechnet für {ac} um {time}: {dist} NM auf {fl}, Flugzeit {t}, TOD {tod} NM.",
      "Calculado para {ac} a las {time}: {dist} NM a {fl}, tiempo de vuelo {t}, TOD {tod} NM."
    ], {
      ac: c.ac,
      time: c.at.toLocaleTimeString(lang, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      dist: fmt(c.D, 0),
      fl: flTxt(c.alt),
      t: hmTxt(c.minutes),
      tod: fmt(c.tod, 0)
    })));
    // niveau du plan au-dessus du plafond calculé : le dire (montée et croisière comptées au plafond)
    if (c.ceiling > 0 && c.alt > c.ceiling + 50) parts.push(`<span class="calc-warn">${esc(ktf(["{fl} est au-dessus du plafond calculé pour cet appareil ({ceil}) : montée et croisière comptées à {ceil}. Baisser le niveau, ou compléter la montée du profil (vitesse indiquée, vario).",
      "{fl} is above the computed ceiling for this aircraft ({ceil}): climb and cruise counted at {ceil}. Lower the level, or complete the profile climb (indicated airspeed, vario).",
      "{fl} liegt über der berechneten Gipfelhöhe dieses Flugzeugs ({ceil}): Steig- und Reiseflug auf {ceil} gerechnet. Flughöhe senken oder Steigflug des Profils ergänzen (angezeigte Geschwindigkeit, Vario).",
      "{fl} está por encima del techo calculado para este avión ({ceil}): ascenso y crucero calculados a {ceil}. Bajar el nivel o completar el ascenso del perfil (velocidad indicada, vario)."
    ], {
      fl: flTxt(c.alt),
      ceil: flTxt(c.ceiling)
    }))}</span>`);
    if (s.ff > 0) {
      const txt = ktf(["Consommation de croisière : {v} {u}/h ({src}).", "Cruise fuel flow: {v} {u}/h ({src}).",
        "Reiseverbrauch: {v} {u}/h ({src}).", "Consumo de crucero: {v} {u}/h ({src})."
      ], {
        v: (s.approx ? "≈ " : "") + showFuel(s.ff),
        u,
        src: ffSourceText(s)
      });
      parts.push(s.approx ? `<span class="calc-est">${esc(txt)} ${esc(kt(["Carburant estimé, à confirmer : saisir la consommation réelle dans « Devis carburant ».",
        "Estimated fuel, to be confirmed: enter the actual fuel flow in “Fuel plan”.",
        "Geschätzter Kraftstoff, zu bestätigen: tatsächlichen Verbrauch unter „Kraftstoffplanung“ eingeben.",
        "Combustible estimado, por confirmar: introducir el consumo real en «Plan de combustible»."
      ]))}</span>` : esc(txt))
    } else parts.push(`<span class="calc-warn">${esc(kt(["Carburant non calculé : aucune consommation connue pour ce type. Saisir la consommation de croisière dans « Devis carburant ».",
      "Fuel not calculated: no fuel flow known for this type. Enter the cruise fuel flow in “Fuel plan”.",
      "Kraftstoff nicht berechnet: kein Verbrauch für diesen Typ bekannt. Reiseverbrauch unter „Kraftstoffplanung“ eingeben.",
      "Combustible no calculado: ningún consumo conocido para este tipo. Introducir el consumo de crucero en «Plan de combustible»."
    ]))}</span>`);
    if (s.tasKind !== "profile") parts.push(esc(ktf(["TAS de croisière {tas} kt ({src}).", "Cruise TAS {tas} kt ({src}).",
      "Reise-TAS {tas} kt ({src}).", "TAS de crucero {tas} kt ({src})."
    ], {
      tas: fmt(s.tas, 0),
      src: s.tasKind === "apd" ? "EUROCONTROL" : s.tasKind === "simbrief" ? "SimBrief" : s.tasKind === "estimate" ? estimateText(s
        .est) : kt(["valeur par défaut",
        "default value", "Standardwert", "valor por defecto"
      ])
    })));
    if (!detailOn()) parts.push(esc(kt(["Courbes de niveau et de consommation, instruments : bouton « Vue détaillée ».",
      "Level and fuel curves, instruments: “Detailed view” button.",
      "Höhen- und Verbrauchskurven, Instrumente: Schaltfläche „Detailansicht“.",
      "Curvas de nivel y de consumo, instrumentos: botón «Vista detallada»."
    ])))
  }
  setHtml("calcStatus", parts.join(" "))
}
/** « Calculer » : sans avion ou sans distance, le dit (notification, champ à remplir mis en avant) ; sinon devis
 *  complet et courbes — la ligne d'état du Résultat change à chaque calcul (heure, valeurs, origine). */
function calculateFromButton() {
  if (!active) {
    lastCalc = {
      none: true
    };
    renderCalcStatus();
    $("aircraftCurrent").focus();
    return window.AppFramework.notify(kt([
      "Rien à calculer : aucun avion choisi. Choisir l’appareil en haut de page (bouton « Aucun avion »).",
      "Nothing to calculate: no aircraft chosen. Pick the aircraft at the top of the page (“No aircraft” button).",
      "Nichts zu berechnen: kein Flugzeug gewählt. Oben auf der Seite das Flugzeug wählen (Schaltfläche „Kein Flugzeug“).",
      "Nada que calcular: ningún avión elegido. Elegir el avión en la parte superior de la página (botón «Ningún avión»)."
    ]), "warn")
  }
  if (!(+$("dist").value > 0)) {
    const route = $("vpRoute").value.trim() !== "";
    if (route) {
      $("flightParams").open = true;
      $("dist").focus()
    } else $("vpRoute").focus();
    return window.AppFramework.notify(route ? kt([
      "Rien à calculer : distance nulle — le plan de vol n’a pas pu être mesuré (points inconnus ?). Saisir la distance dans « Paramètres du vol » › Distance (NM).",
      "Nothing to calculate: zero distance — the flight plan could not be measured (unknown points?). Enter the distance in “Flight parameters” › Distance (NM).",
      "Nichts zu berechnen: Entfernung null — der Flugplan konnte nicht vermessen werden (unbekannte Punkte?). Entfernung unter „Flugparameter“ › Distanz (NM) eingeben.",
      "Nada que calcular: distancia nula — no se pudo medir el plan de vuelo (¿puntos desconocidos?). Introducir la distancia en «Parámetros del vuelo» › Distancia (NM)."
    ]) : kt(["Rien à calculer : ni plan de vol ni distance. Saisir le plan de vol (case 15) ou la distance dans « Paramètres du vol ».",
      "Nothing to calculate: no flight plan and no distance. Enter the flight plan (item 15) or the distance in “Flight parameters”.",
      "Nichts zu berechnen: weder Flugplan noch Entfernung. Flugplan (Feld 15) oder Entfernung unter „Flugparameter“ eingeben.",
      "Nada que calcular: ni plan de vuelo ni distancia. Introducir el plan de vuelo (casilla 15) o la distancia en «Parámetros del vuelo»."
    ]), "warn")
  }
  calculate()
}
window.addEventListener("repository-language-change", () => setTimeout(() => {
  renderFuelSource();
  applyDetailView();
  renderCalcStatus();
  window.FlightPerfView?.syncClimb?.();
  syncCopyJsonBtn();
  renderPerfProfilesSoon()
}));
window.addEventListener("suite-level-change", () => {
  const was = document.body.classList.contains("fp-detail");
  applyDetailView();
  if (!was && detailOn() && active && curvesStale) calculate();
  else renderCalcStatus()
});
// ===== Devis carburant : composante de vent, temps et consommation par phase =====
/** Composante de vent sur la route (kt ; positive = arrière). Entrées : route vraie, direction d'où vient le vent, vitesse (°, °, kt). */
function windComponent(track, from, speed) {
  return speed * Math.cos((from - track) * Math.PI / 180) * -1
} // + tailwind
/** Devis carburant du plan saisi : vent (connu ou fourchette), montée et croisière par le modèle calibré (sinon valeurs du profil), descente, roulage, contingence, réserve ; bloc et TOD affichés dans Résultat, ligne d'état ; puis courbes de performances (renderAltitudeOptimum, vue détaillée) et enregistrement de l'état. */
// Devis (bloc Résultat). Niveau : niveau épinglé sur une courbe s'il y en a un, sinon celui du plan ; montée : loi
// réglée par les curseurs verticaux (au départ, Badin et vario du profil). opts.quoteOnly : devis seul, sans
// redessiner les courbes (appelé par les curseurs et l'épingle, via planQuote) — sauf si les données des courbes ont
// changé (plan de vol relu : distance, niveau). Consommation de croisière : cruiseSource (saisie, profil, estimation).
// Les valeurs affichées ne sont écrites que si elles changent (setText / setHtml).
function calculate(opts) {
  if (!active) {
    lastCalc = {
      none: true
    };
    renderCalcStatus();
    renderFuelSource();
    return
  }
  let quoteOnly = opts?.quoteOnly === true;
  const pinned = window.FlightPerfView?.sync?.pinned ?? null,
    mq = window.FlightPerfView?.manual?.() || null,
    src = cruiseSource(),
    hasFuel = src.ff > 0,
    approx = src.approx ? "≈ " : "";
  const D = +$("dist").value,
    FL = +$("fl").value,
    alt = pinned != null ? pinned : FL * 100,
    tas = src.tas;
  let windKnown = $("wdir").value !== "" && $("wspd").value !== "",
    wc = 0,
    low = 0,
    high = 0;
  if (windKnown) {
    wc = windComponent(+$("trk").value, +$("wdir").value, +$("wspd").value);
    low = high = wc;
    setText("windInfo", kt(wc >= 0 ? tl(`Composante arrière ${fmt(wc,0)} kt`, `Tailwind component ${fmt(wc,0)} kt`, `Rückenwindkomponente ${fmt(wc,0)} kt`, `Componente de cola ${fmt(wc,0)} kt`) : tl(`Composante face ${fmt(-wc,0)} kt`, `Headwind component ${fmt(-wc,0)} kt`, `Gegenwindkomponente ${fmt(-wc,0)} kt`, `Componente de cara ${fmt(-wc,0)} kt`)));
  } else {
    let supplied = $('wspd').value.trim(),
      band = supplied === "" ? (active.typicalWindKt ?? 25) : Math.abs(+$('wspd').value);
    low = -band;
    high = band;
    setText("windInfo", kt(supplied === "" ? tl(`Vent inconnu : fourchette ±${band} kt sur la composante route`, `Unknown wind: ±${band} kt range on the track component`, `Wind unbekannt: Bereich ±${band} kt auf der Streckenkomponente`, `Viento desconocido: horquilla ±${band} kt en la componente de ruta`) : tl(`Direction inconnue : fourchette −${band} à +${band} kt sur la composante route`, `Unknown direction: −${band} to +${band} kt range on the track component`, `Richtung unbekannt: Bereich −${band} bis +${band} kt auf der Streckenkomponente`,
      `Dirección desconocida: horquilla −${band} a +${band} kt en la componente de ruta`)));
  }
  /** Régime nominal d'une phase du profil et débit lu dans la table RPM ({ rpm, map, ff }), sinon débit de la phase. */
  const mappedPhase = phaseName => {
    let phase = active[phaseName] || {},
      rpm = finiteProfileNumber(phase.rpmNominal) ? Number(phase.rpmNominal) : null,
      map = rpm !== null ? interpRange(active.rpmFuelCurve || [], rpm, phaseName === "cruise" ? alt : alt / 2) : null;
    return {
      rpm,
      map,
      ff: map?.nominal ?? (+phase.fuelFlowPerHour > 0 ? +phase.fuelFlowPerHour : null)
    }
  };
  const climbPhase = mappedPhase("climb"),
    cruisePhase = mappedPhase("cruise"),
    descentPhase = mappedPhase("descent");
  // Montée et croisière au niveau du plan : modèle de performances calibré (sinon valeurs constantes du profil).
  const perf = (() => {
      try {
        return perfModel()
      } catch {
        return null
      }
    })(),
    law0 = perf && mq ? (mq.law ? mq.law(perf) : perf.manualLaw(mq.ias, mq.full ? 0 : mq.vs)) : null,
    lawClimb = law0 && alt > 0 ? perf.climbTo(Math.min(alt, perf.ceiling), {
      speed: law0
    }) : null,
    law = lawClimb ? law0 : null,
    /* loi réglée qui n'atteint pas le niveau : montée modélisée du profil */
    pClimb = lawClimb || (perf && alt > 0 ? perf.climbTo(Math.min(alt, perf.ceiling)) : null),
    pCruise = perf ? perf.cruise(alt, "normal") : null;
  // montée et descente sans modèle : valeurs du profil complétées par la fiche EUROCONTROL (modelProfile)
  const mpf = modelProfile(),
    climbMin = pClimb ? pClimb.minutes : alt / (Math.abs(+mpf.climb?.rateFpm) || 1200),
    descentMin = alt / (Math.abs(+mpf.descent?.rateFpm) || 1500);
  const climbDist = pClimb ? pClimb.nm : (+mpf.climb?.tasKt || 220) * climbMin / 60,
    descentDist = (+mpf.descent?.tasKt || 250) * descentMin / 60;
  const cruiseDist = Math.max(0, D - climbDist - descentDist);
  /** Carburant d'une phase : durée (min) × débit horaire. */
  const phaseFuel = (mins, ff) => mins / 60 * (ff || 0);
  // Débits : croisière retenue (saisie du vol, profil, estimation) ; montée et descente du profil, sinon déduits.
  const cruiseFF = hasFuel ? src.ff : 0,
    climbFF = climbPhase.ff ?? cruiseFF,
    descentFF = descentPhase.ff ?? (cruiseFF * .45);
  const climbFuel = pClimb && Number.isFinite(pClimb.fuel) ? pClimb.fuel : phaseFuel(climbMin, climbFF);
  const descentFuel = phaseFuel(descentMin, descentFF);
  const taxiFuel = phaseFuel(+$("taxi").value, active.taxi.fuelFlowPerHour || cruiseFF * .25);
  const tasAlt = pCruise?.ok ? pCruise.tas : tas,
    ffAlt = pCruise?.ok ? pCruise.ff : cruiseFF;

  /** Carburant de croisière avec une composante de vent w (vitesse sol de 80 kt au moins). */
  function cruiseFuelFor(w) {
    let gs = Math.max(80, tasAlt + w);
    return cruiseDist / gs * ffAlt
  }
  const cNom = cruiseFuelFor(windKnown ? wc : 0),
    cLo = cruiseFuelFor(low),
    cHi = cruiseFuelFor(high);
  const reserve = phaseFuel(+$("reserve").value, active.reserveFuelFlowPerHour || cruiseFF * .65);
  const trip = climbFuel + cNom + descentFuel,
    contingency = trip * (+$("cont").value / 100),
    block = taxiFuel + trip + contingency + reserve;
  const bLo = taxiFuel + climbFuel + cLo + descentFuel + (climbFuel + cLo + descentFuel) * (+$("cont").value / 100) + reserve;
  const bHi = taxiFuel + climbFuel + cHi + descentFuel + (climbFuel + cHi + descentFuel) * (+$("cont").value / 100) + reserve;
  // Sans consommation connue : pas de chiffre trompeur (« 0 kg ») ; la ligne d'état dit pourquoi et quoi faire.
  // vent inconnu : fourchette, ramenée à une valeur quand ses bornes s'affichent pareil (étape sans croisière)
  const bMin = showFuel(Math.min(bLo, bHi)),
    bMax = showFuel(Math.max(bLo, bHi));
  setText("block", !hasFuel ? "—" : windKnown || bMin === bMax ? `${approx}${windKnown?showFuel(block):bMin} ${fuelUnit()}` : `${approx}${bMin}–${bMax} ${fuelUnit()}`);
  const tod = alt / (active.tod.gradientFtPerNm || 300) + (active.tod.bufferNm || 0);
  setText("tod", `${fmt(tod,1)} NM`);
  const cruiseMin = cruiseDist / Math.max(80, tasAlt + (windKnown ? wc : 0)) * 60;
  setText("tripTime", hmTxt(climbMin + cruiseMin + descentMin));
  let wx = "";
  try {
    wx = hasFuel ? weatherImpact(perf, D, alt, windKnown ? wc : 0) : ""
  } catch {
    wx = "" /* effet météo indisponible : le devis reste valable */
  }
  setHtml("wxImpact", wx);
  /** Mention du régime et du débit lus dans la table RPM pour une phase (vide sans table). */
  const mapNote = phase => phase.map ? `<span class="mapval">${phase.rpm} RPM → ${showFuel(phase.map.nominal)} ${fuelUnit()}/h <small>(${showFuel(phase.map.min)}–${showFuel(phase.map.max)})</small></span>` : "";
  // Vue simple : roulage, délestage, contingence, réserve (leur somme = bloc) ; vue détaillée : montée, croisière et
  // descente sous le délestage (lignes data-fp-detail).
  const rows = hasFuel ? [
    [tl("Roulage", "Taxi", "Rollen", "Rodaje"), taxiFuel],
    [tl("Délestage (étape)", "Trip fuel", "Streckenkraftstoff (Trip)", "Combustible de trayecto"), trip, "trip"],
    [tl("Montée", "Climb", "Steigflug", "Ascenso") + mapNote(climbPhase), climbFuel, "sub"],
    [tl("Croisière (vent nul)", "Cruise (no wind)", "Reiseflug (ohne Wind)", "Crucero (sin viento)") + mapNote(cruisePhase), cNom, "sub"],
    [tl("Descente", "Descent", "Sinkflug", "Descenso") + mapNote(descentPhase), descentFuel, "sub"],
    [tl("Contingence", "Contingency", "Unvorhergesehenes", "Contingencia"), contingency],
    [tl("Réserve", "Reserve", "Reserve", "Reserva"), reserve]
  ] : [];
  let breakdown = rows.map(([label, v, kind]) => {
    const attr = kind === "sub" ? ' class="kv-sub" data-fp-detail' : kind === "trip" ? ' class="kv-trip"' : "";
    return `<div${attr}>${label}</div><div${attr}>${approx}${showFuel(v)} ${fuelUnit()}</div>`
  }).join("");
  // Masses : décollage prévu (unité d'affichage du carburant), MTOW de l'appareil (fiche APD), atterrissage estimé.
  {
    const u = fuelUnit(),
      tow = +$("tow").value,
      mtowKg = +(apdOf(active)?.takeoff?.mtowKg || simbriefOf(active)?.mtowKg || active?.mtowKg || 0),
      mtow = mtowKg ? (u === "kg" ? mtowKg : mtowKg / KG_PER_LB) : 0,
      ph = mtow ? `MTOW ${fmt(mtow,0)}` : "";
    setText("towUnit", u);
    if ($("tow").placeholder !== ph) $("tow").placeholder = ph;
    if (tow > 0) {
      const land = tow - convertFuel(trip, active?.unit || u, u),
        over = mtow && tow > mtow;
      breakdown += `<div>${tl("Masse au décollage prévue","Planned take-off mass","Geplante Startmasse","Masa de despegue prevista")}</div><div${over?' class="kv-over"':""}>${fmt(tow,0)} ${u}${mtow?` / MTOW ${fmt(mtow,0)}`:""}${over?` — ${tl("dépasse la MTOW de","exceeds MTOW by","überschreitet MTOW um","excede la MTOW en")} ${fmt(tow-mtow,0)} ${u}`:""}</div>` + (hasFuel ? `<div>${tl("Masse à l’atterrissage estimée","Estimated landing mass","Geschätzte Landemasse","Masa de aterrizaje estimada")}</div><div>${approx}${fmt(land,0)} ${u}</div>` : "");
      if (over && !quoteOnly) window.AppFramework?.notify?.(tl(`Masse au décollage prévue supérieure à la MTOW (${fmt(tow,0)} > ${fmt(mtow,0)} ${u}).`, `Planned take-off mass above MTOW (${fmt(tow,0)} > ${fmt(mtow,0)} ${u}).`, `Geplante Startmasse über MTOW (${fmt(tow,0)} > ${fmt(mtow,0)} ${u}).`, `Masa de despegue prevista superior a la MTOW (${fmt(tow,0)} > ${fmt(mtow,0)} ${u}).`), "warn")
    }
  }
  setHtml("breakdown", breakdown);
  setHtml("quoteBasis", typo(`${tl("Niveau","Level","Flughöhe","Nivel")} ${flTxt(alt)}${pinned!=null?` 📌 (${tl("plan","plan","Plan","plan")} ${flTxt(FL*100)})`:""} · ${law?`${tl("montée choisie","chosen climb","gewählter Steigflug","ascenso elegido")} (${tl("curseurs","sliders","Regler","cursores")})`:tl("montée du profil","profile climb","Steigflug des Profils","ascenso del perfil")}${law0&&!law?` — ⚠ ${tl("la montée choisie n’atteint pas ce niveau : montée du profil retenue","the chosen climb does not reach this level: profile climb used","der gewählte Steigflug erreicht diese Höhe nicht: Steigflug des Profils verwendet","el ascenso elegido no alcanza este nivel: se usa el ascenso del perfil")}`:""}${pClimb?"":` (${tl("valeurs du profil","profile values","Profilwerte","valores del perfil")})`}`));
  {
    // précision de la montée choisie (badin, vario ou « plein gaz ») en infobulle : la ligne de base garde sa longueur
    // (« plein gaz » s'affiche sous le curseur de vario)
    const tip = law && mq?.text ? typo(`${tl("Montée choisie","Chosen climb","Gewählter Steigflug","Ascenso elegido")} : ${mq.text}`) : "";
    if ($("quoteBasis").title !== tip) $("quoteBasis").title = tip
  }
  // Ligne d'état et champ de consommation : ce qui a été calculé, avec quoi.
  lastCalc = {
    at: new Date(),
    ac: active.name || active.id,
    D,
    alt,
    minutes: climbMin + cruiseMin + descentMin,
    tod,
    src,
    ceiling: perf?.ceiling ?? null
  };
  renderCalcStatus();
  renderFuelSource();
  // Courbes : un devis seul les laisse en place, sauf si leurs données ont changé (plan de vol relu).
  const c = {
      D,
      FL,
      windKnown,
      wc: windKnown ? wc : 0,
      low,
      high,
      climbFF,
      cruiseFF,
      descentFF
    },
    key = JSON.stringify([active.id, c, isaDev(), src.ff, src.tas]);
  if (!detailOn()) {
    // Vue simple : courbes masquées (tracées au passage en vue détaillée) ; la montée choisie du devis suit le modèle.
    window.FlightPerfView?.prepare?.(perf, c);
    curvesStale = true;
    if (!quoteOnly) save();
    if (!mq && window.FlightPerfView?.manual?.()) calculate({
      quoteOnly: true
    });
    return
  }
  if (quoteOnly && key !== curvesKey) quoteOnly = false;
  if (quoteOnly) return;
  curvesKey = key;
  curvesStale = false;
  try {
    renderAltitudeOptimum(c)
  } catch (e) {
    $("optEmpty").hidden = false;
    $("optEmpty").textContent = tl("Courbe indisponible : ", "Curve unavailable: ", "Kurve nicht verfügbar: ", "Curva no disponible: ") + e
      .message
  }
  if (!mq && window.FlightPerfView?.manual?.()) calculate({
    quoteOnly: true
  });
  save()
}

/* ===== Altitude et montée optimales : modèle de performances calibré sur le profil =====
   Mécanique du vol (polaire, poussée / puissance disponibles, consommation) dans shared/flight_performance_model.js ;
   indépendant du niveau saisi dans le plan : seules les données du profil (et des OFP qui l'ont calibré) comptent. */
// Météo : écart ISA (°C) du devis, passé au modèle (dIsa ; 0 = atmosphère standard du profil).
const isaDev = () => {
  const v = +$("isaDev").value;
  return Number.isFinite(v) ? Math.max(-60, Math.min(60, v)) : 0
};
/** Modèle de performances du profil actif ; fiche EUROCONTROL APD du type (plafond, Mach) en référence. */
// Profil du modèle : celui de l'appareil, croisière complétée par la consommation et la TAS retenues (cruiseSource).
const perfModel = (dIsa = isaDev()) => FlightPerfModel.create(modelProfile(), {
  db: window.AIRCRAFT_DB,
  dIsa,
  apd: apdOf(active)
});
/** Température ISA (°C) à l'altitude pression ft. */
const isaTemp = ft => ft <= 36089 ? 15 - 1.98 * ft / 1000 : -56.5;
/** Champs météo liés : l'écart ISA, la température au sol (avec l'altitude du terrain) et la température au niveau
 *  se déduisent l'un de l'autre ; src : champ modifié par l'utilisateur. */
function syncWeather(src) {
  /** Arrondi au dixième. */
  const r1 = v => Math.round(v * 10) / 10,
    elev = +$("elevFt").value || 0,
    lvl = (+$("fl").value || 0) * 100;
  let d = isaDev();
  if (src === "tGround" && $("tGround").value !== "") d = +$("tGround").value - isaTemp(elev);
  else if (src === "tLevel" && $("tLevel").value !== "") d = +$("tLevel").value - isaTemp(lvl);
  d = r1(Math.max(-60, Math.min(60, d)));
  if (src !== "isaDev") $("isaDev").value = d;
  if (src !== "tGround") $("tGround").value = r1(isaTemp(elev) + d);
  if (src !== "tLevel") $("tLevel").value = r1(isaTemp(lvl) + d)
}
["isaDev", "tGround", "elevFt", "tLevel"].forEach(id => $(id).addEventListener("input", () => syncWeather(id === "elevFt" ? "isaDev" :
  id)));
$("fl").addEventListener("input", () => syncWeather("isaDev"));
/** Effet de la météo (écart ISA non nul) sur le trajet : niveau du plan et niveau optimal, comparés à l'atmosphère
 *  standard du profil — temps, carburant, plafond. HTML (vide en atmosphère standard ou sans modèle). */
function weatherImpact(perf, D, alt, wc) {
  const d = perf?.dIsa || 0;
  if (!d) return "";
  let p0;
  try {
    p0 = perfModel(0)
  } catch {
    return ""
  }
  /** Niveau le plus économe du trajet (pas de 500 ft, de 1000 ft au plafond) pour un modèle ; null si aucun. */
  const best = m => {
      let b = null;
      for (let h = 1000; h <= m.ceiling; h += 500) {
        const r = m.trip(h, D, wc, "normal");
        if (r?.ok && (!b || r.fuel < b.fuel)) b = {
          ...r,
          h
        }
      }
      return b
    },
    lv = Math.min(alt, perf.ceiling, p0.ceiling),
    a = p0.trip(lv, D, wc, "normal"),
    b = perf.trip(lv, D, wc, "normal"),
    o0 = best(p0),
    o1 = best(perf),
    dMin = x => `${x>=0?"+":"−"}${fmt(Math.abs(x),0)} min`,
    dF = x => `${x>=0?"+":"−"}${showFuel(Math.abs(x))} ${fuelUnit()}`,
    isa = `ISA${d>0?"+":"−"}${fmt(Math.abs(d),0)} °C`;
  const rows = [];
  if (alt > perf.ceiling) rows.push(`<dt>⚠</dt><dd>${flTxt(alt)} ${tl("au-dessus du plafond du jour","above today’s ceiling","über der heutigen Gipfelhöhe","por encima del techo del día")} (${flTxt(perf.ceiling)}) : ${tl("trajet calculé au plafond","trip computed at the ceiling","Strecke auf Gipfelhöhe berechnet","trayecto calculado en el techo")}</dd>`);
  if (a?.ok && b?.ok) rows.push(`<dt>${tl("Trajet au",`Trip at`,"Strecke auf","Trayecto a")} ${flTxt(lv)}</dt><dd>${hmTxt(b.minutes)} (${dMin(b.minutes-a.minutes)}) · ${showFuel(b.fuel)} ${fuelUnit()} (${dF(b.fuel-a.fuel)}) · TAS ${fmt(b.tas,0)} kt (${b.tas>=a.tas?"+":"−"}${fmt(Math.abs(b.tas-a.tas),0)})</dd>`);
  if (o0 && o1) rows.push(`<dt>${tl("Niveau optimal","Optimum level","Optimale Flughöhe","Nivel óptimo")}</dt><dd>${flTxt(o1.h)}${o1.h!==o0.h?` (ISA : ${flTxt(o0.h)})`:` (${tl("inchangé","unchanged","unverändert","sin cambio")})`} · ${showFuel(o1.fuel)} ${fuelUnit()} · ${hmTxt(o1.minutes)}</dd>`);
  rows.push(`<dt>${tl("Plafond","Ceiling","Gipfelhöhe","Techo")}</dt><dd>${flTxt(perf.ceiling)} (ISA : ${flTxt(p0.ceiling)})</dd>`);
  return typo(`<h4>${tl("Météo","Weather","Wetter","Meteorología")} ${isa} — ${tl("écart à l’atmosphère standard","difference from the standard atmosphere","Abweichung von der Standardatmosphäre","diferencia con la atmósfera estándar")}</h4><dl class="kvp">${rows.join("")}</dl>`)
}
// Textes générés (résultats, courbes) dans la langue de la page : tl(fr, en, de, es) ; redessinés au changement de langue.
const tl = (...r) => r[Math.max(0, ["fr", "en", "de", "es"].indexOf(window.RepositoryNav?.getLanguage?.() || "fr"))] || r[0];
// Typographie : espace avant « : » et « ; » en français seulement.
// Vue des courbes (jauges, loi réglable, limites, panneaux) : shared/flight_perf_view.js
const typo = t => (window.RepositoryNav?.getLanguage?.() || "fr") === "fr" ? t : String(t).replace(/ ([:;])/g, "$1");
window.addEventListener("repository-language-change", () => setTimeout(() => FlightProfileHelp?.annotate($("profileEditor"), window
  .RepositoryNav?.getLanguage?.() || "fr")));
window.addEventListener("repository-language-change", () => setTimeout(() => {
  if (active && window.altitudeOptimum) try {
    calculate()
  } catch {}
}));
/** Titre de la page (en-tête et onglet) et libellé du repli « Paramètres du vol » dans la langue de la page ; écrits
 *  seulement s'ils changent (h1 et repli en data-no-i18n : la couche de traduction n'y touche pas). */
function pageLabels() {
  const title = PERF_PAGE === "sheets" ? tl("Fiches de performances", "Performance sheets", "Leistungsblätter",
      "Fichas de rendimiento") : tl("Carburant", "Fuel", "Kraftstoff", "Combustible"),
    params = tl("Paramètres du vol", "Flight parameters", "Flugparameter", "Parámetros del vuelo");
  if ($("pageTitle").textContent !== title) $("pageTitle").textContent = title;
  if (document.title !== title) document.title = title;
  if ($("flightParamsTitle").textContent !== params) $("flightParamsTitle").textContent = params
}
pageLabels();
window.addEventListener("repository-language-change", pageLabels);
// Niveau Expert : les treize paramètres du vol dépliés d'emblée, comme avant ; niveaux 1 à 3 : repliés (valeurs par défaut).
$("flightParams").open = (window.RepositoryNav?.levels?.get?.() ?? 4) >= 4;
/** Mise en forme : niveau « FL085 », durée « 1 h 05 », nombre à 3 décimales (« — » s'il n'est pas fini). */
const flTxt = h => "FL" + String(Math.round(h / 100)).padStart(3, "0"),
  hmTxt = x => `${Math.floor(x/60)} h ${String(Math.round(x%60)).padStart(2,"0")}`,
  f3 = v => Number.isFinite(v) ? v.toLocaleString("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }) : "—";
// ===== Imports : CSV de performances, courbe RPM / consommation, JSON de profils =====
/** Débit interpolé linéairement dans une table RPM pour un régime rpm (bornes : première / dernière ligne) ; NaN si la table est vide. */
function interp(curve, rpm) {
  curve = [...curve].filter(p => Number.isFinite(p.rpm) && Number.isFinite(p.fuelFlowPerHour)).sort((a, b) => a.rpm - b.rpm);
  if (!curve.length) return NaN;
  if (rpm <= curve[0].rpm) return curve[0].fuelFlowPerHour;
  if (rpm >= curve.at(-1).rpm) return curve.at(-1).fuelFlowPerHour;
  for (let i = 1; i < curve.length; i++)
    if (rpm <= curve[i].rpm) {
      let a = curve[i - 1],
        b = curve[i],
        t = (rpm - a.rpm) / (b.rpm - a.rpm);
      return a.fuelFlowPerHour + t * (b.fuelFlowPerHour - a.fuelFlowPerHour)
    }
}
/** Nombre écrit à la française ou à l'anglaise (espaces, espace fine, virgule décimale) → Number. */
function numberText(value) {
  return Number(String(value).replace(/[\s\u202f]/g, "").replace(",", "."))
}
/** Plage de débit lue dans un texte (« 1 000–1 300 kg/h », « 950 lb/h ») convertie dans targetUnit. Sortie : { min, nominal, max, sourceUnit } ou null. */
function parseFuelRange(text, targetUnit = "kg") {
  const n = "(\\d{1,3}(?:[\\s\\u202f]\\d{3})*|\\d+)(?:[.,](\\d+))?",
    s = String(text || ""),
    range = new RegExp(`${n}\\s*(?:kg|kgs|lb|lbs)?\\s*\\/?\\s*h?\\s*(?:-|–|à|to|/)\\s*${n}\\s*(kg|kgs|lb|lbs)\\s*\\/?\\s*h\\b`, "i"),
    single = new RegExp(`${n}\\s*(kg|kgs|lb|lbs)\\s*\\/?\\s*h\\b`, "i");
  let m = s.match(range),
    a, b, unit;
  if (m) {
    a = numberText(`${m[1]}${m[2]?","+m[2]:""}`);
    b = numberText(`${m[3]}${m[4]?","+m[4]:""}`);
    unit = m[5]
  } else {
    m = s.match(single);
    if (!m) return null;
    a = b = numberText(`${m[1]}${m[2]?","+m[2]:""}`);
    unit = m[3]
  }
  const from = /^kg/i.test(unit) ? "kg" : "lb";
  a = convertFuel(a, from, targetUnit);
  b = convertFuel(b, from, targetUnit);
  return {
    min: Math.min(a, b),
    nominal: (a + b) / 2,
    max: Math.max(a, b),
    sourceUnit: from
  };
}
/** Table RPM / débit extraite d'un texte libre (une entrée par ligne ou par « ; », formats « 2400 rpm = 45 », « 45 lb/h @ 2400 »…), triée par régime. */
function parseRpmFuelCurve(raw, targetUnit = "kg") {
  let out = [],
    seen = new Set(),
    add = (rpm, range, comment) => {
      rpm = numberText(rpm);
      if (!range || !Number.isFinite(rpm) || rpm <= 0 || seen.has(rpm)) return;
      seen.add(rpm);
      out.push({
        rpm,
        fuelFlowMin: range.min,
        fuelFlowPerHour: range.nominal,
        fuelFlowMax: range.max,
        comment
      })
    };
  for (const part of String(raw || "").split(/;|\n/)) {
    let rpm = part.match(/(\d{2,5}(?:[.,]\d+)?)\s*(?:rpm|n1|%\s*n1|%\s*power)\b/i)?.[1],
      range = parseFuelRange(part, targetUnit);
    if (rpm && range) {
      add(rpm, range, part.trim());
      continue
    }
    let m = part.match(
      /(\d{2,5}(?:[.,]\d+)?)\s*(?:rpm|n1|%\s*n1|%\s*power)?\s*(?:=|:|→|->|@)\s*~?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*~?(\d+(?:[.,]\d+)?))?/i
    );
    if (m) {
      let a = numberText(m[2]),
        b = m[3] ? numberText(m[3]) : a;
      add(m[1], {
        min: a,
        nominal: (a + b) / 2,
        max: b
      }, part.trim())
    } else {
      m = part.match(
        /~?(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*~?(\d+(?:[.,]\d+)?))?\s*(?:lb\/?h|kg\/?h|gph)?\s*(?:@|at)\s*(\d{2,5}(?:[.,]\d+)?)/i);
      if (m) {
        let a = numberText(m[1]),
          b = m[2] ? numberText(m[2]) : a;
        add(m[3], {
          min: a,
          nominal: (a + b) / 2,
          max: b
        }, part.trim())
      }
    }
  }
  return out.sort((a, b) => a.rpm - b.rpm)
}
/** Plage de débit { min, nominal, max } interpolée dans une table RPM pour un régime ; null sans table ou sans régime.
 *  h (ft, facultatif) : table ramenée à cette altitude d'abord (colonne Altitude : FlightPerfModel.mapAt ; sans altitudes
 *  dans la table, inchangée). */
function interpRange(curve, rpm, h) {
  if (Number.isFinite(h) && window.FlightPerfModel?.mapAt) curve = FlightPerfModel.mapAt(curve, h);
  let c = [...curve].filter(p => Number.isFinite(p.rpm) && [p.fuelFlowMin, p.fuelFlowPerHour, p.fuelFlowMax].some(Number.isFinite)).sort((a,
      b) => a.rpm - b.rpm),
    value = (p, k, fallback) => Number.isFinite(p[k]) ? p[k] : p[fallback];
  if (!c.length || !Number.isFinite(rpm)) return null;
  /** Plage de débit { min, nominal, max } de la ligne k (valeurs manquantes complétées par les voisines). */
  let at = k => ({
    min: value(c[k], "fuelFlowMin", "fuelFlowPerHour"),
    nominal: value(c[k], "fuelFlowPerHour", "fuelFlowMin"),
    max: value(c[k], "fuelFlowMax", "fuelFlowPerHour")
  });
  if (rpm <= c[0].rpm) return at(0);
  if (rpm >= c.at(-1).rpm) return at(c.length - 1);
  for (let i = 1; i < c.length; i++)
    if (rpm <= c[i].rpm) {
      let a = c[i - 1],
        b = c[i],
        t = (rpm - a.rpm) / (b.rpm - a.rpm),
        va = at(i - 1),
        vb = at(i);
      return {
        min: va.min + t * (vb.min - va.min),
        nominal: va.nominal + t * (vb.nominal - va.nominal),
        max: va.max + t * (vb.max - va.max)
      }
    }
}
// Fiche performance moteur : débit interpolé dans la table RPM pour le régime saisi.
$("rpmCalc").onclick = () => {
  if (!active) return;
  let rpm = +$("rpm").value,
    v = interpRange(active.rpmFuelCurve || [], rpm, +$("alt").value);
  window.engineInterpolation = v ? {
    rpm,
    range: v
  } : null;
  $("ff").textContent = v ? `${showFuel(v.nominal)} ${fuelUnit()}/h` : "—";
  $("ffnote").textContent = v ? `${showFuel(v.min)}–${showFuel(v.max)} ${fuelUnit()}/h · interpolation linéaire` : "Courbe RPM absente du profil.";
  renderProfile()
};
// Préférence : bascule l'unité de carburant affichée (kg ↔ lb), recalcule et enregistre.
$("fuelUnitBtn").onclick = () => {
  state.displayFuelUnit = fuelUnit() === "kg" ? "lb" : "kg";
  updateFuelUnitButton();
  renderPerfProfilesSoon();
  if (active) {
    renderProfile();
    calculate()
  }
  save()
};
// Bouton « Calculer » : devis carburant et courbes.
$("calc").onclick = calculateFromButton;
/** Devis refait (sans redessiner les courbes) après un réglage des curseurs ou une épingle — appelé par la vue. */
window.planQuote = () => {
  clearTimeout(window.planQuote.t);
  window.planQuote.t = setTimeout(() => {
    if (active) try {
      calculate({
        quoteOnly: true
      })
    } catch (e) {
      console.warn("Devis :", e)
    }
  }, 60)
};
/** Lecteur CSV (séparateur sep, guillemets doublés, fins de ligne CR / LF). Sortie : tableau de lignes (tableaux de cellules), lignes vides omises. */
function parseDelimited(text, sep = ";") {
  let rows = [],
    row = [],
    cell = "",
    quote = false;
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        cell += '"';
        i++
      } else quote = !quote
    } else if (c === sep && !quote) {
      row.push(cell);
      cell = ""
    } else if ((c === '\n' || c === '\r') && !quote) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(x => x !== "")) rows.push(row);
      row = [];
      cell = ""
    } else cell += c
  }
  row.push(cell);
  if (row.some(x => x !== "")) rows.push(row);
  return rows
}
/** Profils d'un CSV « PERFORMANCES_INTERPOLEES » (colonnes Aircraft, ICAO…, carburant en lb). Lève une erreur si les colonnes requises manquent. */
function parsePerformanceCsv(text, name) {
  let rows = parseDelimited(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw Error("CSV sans données");
  let headers = rows.shift().map(x => x.trim()),
    ix = h => headers.indexOf(h),
    get = (r, h) => r[ix(h)]?.trim() ?? "",
    num = (r, h) => {
      let v = get(r, h);
      return v === "" ? null : Number(v.replace(",", "."))
    };
  if (ix("Aircraft") < 0 || ix("ICAO") < 0) throw Error("Colonnes Aircraft et ICAO requises");
  return rows.map(r => {
    let reg = get(r, "Registration"),
      icao = get(r, "ICAO").toUpperCase(),
      aircraft = get(r, "Aircraft");
    return normalize({
      id: `DB_${icao}_${(reg||aircraft).replace(/[^A-Za-z0-9_-]/g,"_")}`,
      name: aircraft || icao,
      icao,
      type: icao,
      registration: reg,
      callsign: reg,
      unit: "lb",
      fuelAsVolume: false,
      jetFuel: null,
      confidence: get(r, "Confidence"),
      basis: get(r, "Basis"),
      description: get(r, "Basis"),
      usableFuel: num(r, "Usable fuel lb"),
      taxiFuel: num(r, "Taxi lb"),
      reserveFuel: num(r, "Reserve lb"),
      contingencyPercent: null,
      extraFuel: null,
      minRunwayLengthFt: null,
      runwayType: "",
      alternate: {
        fuelFlowPerHour: null,
        tasKt: null
      },
      climb: {
        fuelFlowPerHour: num(r, "Climb FF lb/h"),
        tasKt: num(r, "Climb TAS kt"),
        rateFpm: num(r, "Climb VS fpm")
      },
      cruise: {
        fuelFlowPerHour: num(r, "Cruise FF lb/h"),
        tasKt: num(r, "Cruise TAS kt")
      },
      descent: {
        fuelFlowPerHour: num(r, "Descent FF lb/h"),
        tasKt: num(r, "Descent TAS kt"),
        rateFpm: num(r, "Descent VS fpm")
      },
      source: {
        format: "PERFORMANCES_INTERPOLEES CSV",
        file: name,
        importedAt: new Date().toISOString()
      }
    }, name)
  })
}
/** Profils d'un JSON : base exportée (schema flight-performance-db/v1) ou profil unique. */
function profilesFromJson(obj, name) {
  if (obj?.schema === "flight-performance-db/v1" && Array.isArray(obj.profiles)) return obj.profiles.map(p => normalize(p, name));
  if (obj && typeof obj === "object" && !obj.source && !obj.lnmSource && !obj.simbrief && !obj.simbriefSnapshot) obj.source = {
    format: "JSON",
    file: name,
    importedAt: new Date().toISOString()
  };
  return [normalize(obj, name)]
}
/** Nature d'un JSON importé (base de profils, OFP SimBrief, profil, générique), pour l'affichage. */
function jsonKind(obj) {
  if (obj?.schema === "flight-performance-db/v1" && Array.isArray(obj.profiles)) return "Base de profils";
  if (isSimbriefOfp(obj)) return "OFP SimBrief";
  if (obj && typeof obj === "object" && (obj.cruise || obj.climb || obj.descent || obj.icao || obj.aircraft))
    return "Profil performance JSON";
  return "JSON générique";
}
/** Affiche un JSON importé dans le bloc « JSON importé » (texte et résumé des clés) et le garde pour la copie. */
function showJson(obj, name = "JSON", kind = null) {
  try {
    window.__lastImportedJson = obj;
    const txt = JSON.stringify(obj, null, 2);
    $("jsonViewer").textContent = txt;
    const keys = obj && typeof obj === "object" && !Array.isArray(obj) ? Object.keys(obj) : [];
    $("jsonMeta").textContent = `${name} · ${kind||jsonKind(obj)} · ${txt.length.toLocaleString("fr-FR")} caractères · clés racine : ${keys.join(", ")||"—"}`
  } catch (e) {
    $("jsonViewer").textContent = String(obj);
    $("jsonMeta").textContent = `${name} · affichage JSON impossible : ${e.message}`
  }
  syncCopyJsonBtn()
}
/** Bouton « Copier JSON » : grisé (infobulle explicative) tant qu'aucun JSON n'est chargé ; écrit seulement ce qui change. */
function syncCopyJsonBtn() {
  const b = $("copyJsonBtn"),
    has = !!window.__lastImportedJson,
    tip = has ? kt(["Copier le JSON affiché dans le presse-papiers.", "Copy the displayed JSON to the clipboard.",
      "Angezeigtes JSON in die Zwischenablage kopieren.", "Copiar el JSON mostrado al portapapeles."
    ]) : kt(["Rien à copier : importer d’abord un JSON ou un OFP SimBrief (bloc « Profil actif » ou bouton SimBrief de l’en-tête).",
      "Nothing to copy: first import a JSON or a SimBrief OFP (“Active profile” block or SimBrief button in the header).",
      "Nichts zu kopieren: zuerst ein JSON oder ein SimBrief-OFP importieren (Block „Aktives Profil“ oder SimBrief-Schaltfläche der Kopfzeile).",
      "Nada que copiar: importar primero un JSON o un OFP de SimBrief (bloque «Perfil activo» o botón SimBrief de la cabecera)."
    ]);
  if (b.disabled !== !has) b.disabled = !has;
  if (b.title !== tip) b.title = tip
}
/** Copie un texte dans le presse-papiers : API du navigateur en contexte sécurisé (https, localhost), sinon repli par
 *  sélection d'une zone de texte invisible et execCommand("copy"). Sortie : vrai si la copie a eu lieu. */
async function copyText(txt) {
  if (navigator.clipboard && window.isSecureContext) try {
    await navigator.clipboard.writeText(txt);
    return true
  } catch {
    /* refus du navigateur : repli ci-dessous */
  }
  const ta = document.createElement("textarea");
  ta.value = txt;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.append(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  ta.remove();
  return ok
}
// ===== OFP SimBrief : reconnaissance et remplissage du plan =====
/** Vrai si un objet a la structure d'un OFP SimBrief (navlog + général / avion, ou api_params). */
function isSimbriefOfp(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const k = new Set(Object.keys(o).map(x => x.toLowerCase()));
  if (k.has("navlog") && (k.has("general") || k.has("aircraft") || k.has("origin") || k.has("destination"))) return true;
  if (k.has("general") && k.has("aircraft") && (k.has("fuel") || k.has("times") || k.has("params"))) return true;
  return !!(o.api_params && o.general && o.aircraft);
}
/** Valeurs simples trouvées, à toute profondeur (≤ 8), sous l'une des clés aliases (minuscules). */
function deepValuesByKey(o, aliases, out = [], depth = 0) {
  if (!o || typeof o !== "object" || depth > 8) return out;
  for (const [k, v] of Object.entries(o)) {
    if (aliases.includes(k.toLowerCase()) && v !== null && v !== undefined && typeof v !== "object") out.push(v);
    if (v && typeof v === "object") deepValuesByKey(v, aliases, out, depth + 1)
  }
  return out;
}
/** Premier nombre trouvé en profondeur sous l'une des clés aliases ; null sinon. */
function deepFirstNum(o, aliases) {
  for (const v of deepValuesByKey(o, aliases)) {
    const x = n(v);
    if (x !== null) return x
  }
  return null
}
/** Premier texte non vide trouvé en profondeur sous l'une des clés aliases ; « » sinon. */
function deepFirstText(o, aliases) {
  for (const v of deepValuesByKey(o, aliases)) {
    if (String(v).trim()) return String(v).trim()
  }
  return ""
}
/** Remplit le devis depuis un OFP : distance, niveau, vent moyen, roulage, contingence, réserve ; enregistre l'état. */
function populatePlanFromOFP(ofp) {
  const general = ofp?.general || {},
    fuel = ofp?.fuel || {},
    params = ofp?.params || {},
    times = ofp?.times || {};
  const dist = firstNum(general, ["route_distance", "distance", "air_distance", "total_distance", "route_dist"]) ?? deepFirstNum(ofp, [
    "route_distance", "route_dist", "total_distance"
  ]);
  if (dist !== null && dist > 0) $("dist").value = Math.round(dist * 10) / 10;
  let alt = firstNum(general, ["initial_altitude", "cruise_altitude", "cruise_altitude_feet", "flight_level"]) ?? deepFirstNum(ofp, [
    "initial_altitude", "cruise_altitude", "flight_level"
  ]);
  if (alt !== null && alt > 0) $("fl").value = alt > 1000 ? Math.round(alt / 100) : Math.round(alt);
  const wd = firstNum(general, ["avg_wind_dir", "average_wind_dir", "wind_dir"]) ?? deepFirstNum(general, ["avg_wind_dir",
    "average_wind_dir"
  ]);
  const ws = firstNum(general, ["avg_wind_spd", "avg_wind_speed", "average_wind_speed", "wind_speed"]) ?? deepFirstNum(general, [
    "avg_wind_spd", "avg_wind_speed", "average_wind_speed"
  ]);
  if (wd !== null) $("wdir").value = Math.round(wd);
  if (ws !== null) $("wspd").value = Math.round(ws);
  const taxiMin = firstNum(times, ["taxi_out", "taxi", "taxi_time"]);
  if (taxiMin !== null) {
    let t = taxiMin > 300 ? taxiMin / 60 : taxiMin;
    if (t > 0 && t < 180) $("taxi").value = Math.round(t)
  }
  const cont = firstNum(params, ["contpct", "cont_percent", "contingency_percent"]) ?? deepFirstNum(params, ["contpct", "cont_percent",
    "contingency_percent"
  ]);
  if (cont !== null && cont >= 0 && cont <= 100) $("cont").value = cont;
  const reserveMin = firstNum(params, ["resvrule", "reserve_minutes", "reserve_mins"]);
  if (reserveMin !== null && reserveMin > 0 && reserveMin < 300) $("reserve").value = Math.round(reserveMin);
  save();
}
// Copie le dernier JSON importé dans le presse-papiers.
$("copyJsonBtn").onclick = async () => {
  if (!window.__lastImportedJson) return syncCopyJsonBtn();
  if (await copyText(JSON.stringify(window.__lastImportedJson, null, 2))) $("jsonMeta").textContent += " · " + kt(["copié", "copied",
    "kopiert", "copiado"
  ]);
  else window.AppFramework.notify(kt([
    "Copie impossible : le navigateur refuse l’accès au presse-papiers. Sélectionner le texte du JSON et le copier à la main (Ctrl+C).",
    "Copy failed: the browser denies access to the clipboard. Select the JSON text and copy it by hand (Ctrl+C).",
    "Kopieren nicht möglich: der Browser verweigert den Zugriff auf die Zwischenablage. JSON-Text markieren und von Hand kopieren (Strg+C).",
    "Copia imposible: el navegador deniega el acceso al portapapeles. Seleccionar el texto del JSON y copiarlo a mano (Ctrl+C)."
  ]), 'err')
};
// Vide l'affichage du JSON importé.
$("clearJsonBtn").onclick = () => {
  window.__lastImportedJson = null;
  $("jsonViewer").textContent = "—";
  $("jsonMeta").textContent = "Aucun JSON chargé.";
  syncCopyJsonBtn()
};
/** Profils d'un CSV enrichi (piste mini, table RPM texte, contingence…) ; lignes sans avion ou OACI ignorées. Lève une erreur si aucune ligne n'est valide. */
function parsePerformanceCsvEnriched(text, name, sep = ";") { // sep : séparateur (« ; » pour les CSV de la suite)
  let rows = parseDelimited(text.replace(/^\uFEFF/, ""), sep);
  if (rows.length < 2) throw Error("CSV sans données");
  let h = rows.shift().map(x => x.trim()),
    ix = k => h.indexOf(k),
    get = (r, k) => r[ix(k)]?.trim() ?? "",
    num = (r, k) => {
      let x = get(r, k);
      return x === "" ? null : Number(x.replace(",", "."))
    };
  if (ix("Aircraft") < 0 || ix("ICAO") < 0) throw Error("Colonnes Aircraft et ICAO requises");
  let out = rows.map(r => {
    let reg = get(r, "Registration"),
      icao = get(r, "ICAO").toUpperCase(),
      aircraft = get(r, "Aircraft");
    if (!aircraft || !icao) return null;
    let runway = num(r, "LNM Min Runway ft") ?? num(r, "Min Runway Required ft (max TO/LDG)"),
      rpmRaw = get(r, "Fuel Flow vs RPM / Power");
    return normalize({
      id: `DB_${icao}_${(reg||aircraft).replace(/[^A-Za-z0-9_-]/g,"_")}`,
      name: aircraft,
      icao,
      type: icao,
      registration: reg,
      callsign: reg,
      unit: "lb",
      fuelAsVolume: false,
      jetFuel: null,
      confidence: get(r, "Confidence"),
      basis: get(r, "Basis"),
      description: get(r, "Basis"),
      usableFuel: num(r, "Usable fuel lb"),
      taxiFuel: num(r, "Taxi lb"),
      reserveFuel: num(r, "Reserve lb"),
      contingencyPercent: num(r, "Contingency %"),
      extraFuel: num(r, "Extra Fuel lb"),
      minRunwayLengthFt: runway,
      runwayBasis: get(r, "Runway Basis"),
      rpmPowerReference: get(r, "Typical RPM / Power Reference"),
      rpmFuelBasis: get(r, "RPM/Fuel Basis"),
      rpmFuelRaw: rpmRaw,
      rpmFuelCurve: parseRpmFuelCurve(rpmRaw, "lb"),
      alternate: {
        fuelFlowPerHour: null,
        tasKt: null
      },
      climb: {
        fuelFlowPerHour: num(r, "Climb FF lb/h"),
        tasKt: num(r, "Climb TAS kt"),
        rateFpm: num(r, "Climb VS fpm")
      },
      cruise: {
        fuelFlowPerHour: num(r, "Cruise FF lb/h"),
        tasKt: num(r, "Cruise TAS kt")
      },
      descent: {
        fuelFlowPerHour: num(r, "Descent FF lb/h"),
        tasKt: num(r, "Descent TAS kt"),
        rateFpm: num(r, "Descent VS fpm")
      },
      source: {
        format: "PERFORMANCES_INTERPOLEES enriched CSV",
        file: name,
        importedAt: new Date().toISOString()
      }
    }, name)
  }).filter(Boolean);
  if (!out.length) throw Error("CSV sans lignes appareil valides : vérifie les guillemets et les séparateurs.");
  return out
}
// Bouton d'import : ouvre le sélecteur de fichiers.
$("importBtn").onclick = () => $("fileInput").click();
// Import de fichiers (.lnmperf, .csv, .json ; OFP SimBrief reconnu) : profils rangés, dernier rendu actif, erreurs listées.
$("fileInput").onchange = async e => {
  let ok = 0,
    last = null,
    ofpCount = 0,
    errors = [];
  for (const f of e.target.files) {
    try {
      const txt = await f.text(),
        lower = f.name.toLowerCase();
      if (lower.endsWith(".lnmperf")) {
        const p = parseLnmperf(txt, f.name);
        storeProfile(p);
        last = p;
        ok++;
        continue
      }
      if (lower.endsWith(".csv")) {
        const profiles = parsePerformanceCsvEnriched(txt, f.name);
        for (const p of profiles) {
          storeProfile(p);
          last = p;
          ok++
        }
        continue
      }
      const obj = JSON.parse(txt);
      showJson(obj, f.name);
      if (isSimbriefOfp(obj)) {
        populatePlanFromOFP(obj);
        await importOFPProfile(obj, f.name, "OFP JSON importé");
        last = active;
        ofpCount++;
        ok++;
      } else {
        const profiles = profilesFromJson(obj, f.name);
        for (const p of profiles) {
          storeProfile(p);
          last = p;
          ok++
        }
      }
    } catch (x) {
      console.warn(f.name, x);
      errors.push(`${f.name}: ${x.message}`)
    }
  }
  if (last && !ofpCount) setActive(last, `${ok} profil(s) importé(s)`);
  if (!last && !ofpCount) window.AppFramework.notify("Aucun profil reconnu." + (errors.length ? "\n\n" + errors.join("\n") : ""),
    'warn');
  else if (errors.length) $("profileEditStatus").textContent = `Import partiel : ${errors.join(" | ")}`;
  e.target.value = "";
};
// « Enregistrer le profil » : reporte les saisies de l'éditeur.
$("saveProfileBtn").onclick = () => {
  try {
    commitProfileEditor()
  } catch (e) {
    $("profileEditStatus").textContent = e.message
  }
};
// Affiche / masque les champs de l'éditeur (préférence enregistrée).
$("toggleProfileEditor").onclick = () => {
  state.profileEditorHidden = !state.profileEditorHidden;
  let box = $("profileEditor");
  box.style.display = state.profileEditorHidden ? "none" : "grid";
  box.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
  $("toggleProfileEditor").textContent = state.profileEditorHidden ? "Afficher les champs" : "Masquer les champs";
  save()
};
// Supprime le profil actif de la base locale (confirmation, puis « Annuler » pendant 10 s : deleteProfileAsk).
$("deleteProfileBtn").onclick = () => active && deleteProfileAsk(active.id);
// Exporte le profil actif en JSON.
$("exportBtn").onclick = () => {
  try {
    commitProfileEditor(false);
    let a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(active, null, 2)], {
      type: "application/json"
    }));
    a.download = `${active.id}.performance.json`;
    a.click();
    URL.revokeObjectURL(a.href)
  } catch (e) {
    $("profileEditStatus").textContent = e.message
  }
};
// Exporte tous les profils (base locale) : dans le dossier performances s'il est accordé, sinon téléchargement.
$("exportDbBtn").onclick = async () => {
  save();
  let text = JSON.stringify({
    schema: "flight-performance-db/v1",
    exportedAt: new Date().toISOString(),
    profiles: Object.values(state.profiles)
  }, null, 2);
  try {
    if (dirHandle && ((await dirHandle.queryPermission?.({
        mode: "readwrite"
      })) === "granted" || (await dirHandle.requestPermission?.({
        mode: "readwrite"
      })) === "granted")) {
      let h = await dirHandle.getFileHandle("flight_performance_database.fpdb.json", {
          create: true
        }),
        w = await h.createWritable();
      await w.write(text);
      await w.close();
      $("profileEditStatus").textContent = "BDD locale écrite dans le dossier sélectionné : flight_performance_database.fpdb.json"
    } else downloadText("flight_performance_database.fpdb.json", text, "application/json")
  } catch (e) {
    $("profileEditStatus").textContent = "Écriture dans le dossier impossible : " + e.message
  }
}
/* Dossier performances mémorisé (composant FileAccess) : repris au chargement, affiché sur le bouton. */
window.addEventListener("load", async () => {
  if (!window.FileAccess) return;
  window.FileAccess.decorate($("dirBtn"), "__perf");
  if (typeof dirHandle !== "undefined" && !dirHandle) {
    try {
      dirHandle = await window.FileAccess.get("__perf")
    } catch {}
  }
});
let perfBusy = false, // lecture du dossier performances en cours (choix par le bouton)
  lastPerfRead = 0; // heure de la dernière lecture (un changement signalé juste après est le nôtre)
/** Lit les profils (.json, .lnmperf, .csv) du dossier performances handle et les range dans la base locale (fichiers
 *  illisibles ignorés), puis enregistre l'état. Sortie : nombre de profils lus. */
async function readPerfFolder(handle) {
  let count = 0;
  for await (const [name, h] of handle.entries()) {
    const low = name.toLowerCase();
    if (h.kind !== "file" || !(low.endsWith(".json") || low.endsWith(".lnmperf") || low.endsWith(".csv"))) continue;
    try {
      const txt = await (await h.getFile()).text(),
        profiles = low.endsWith(".lnmperf") ? [parseLnmperf(txt, name)] : low.endsWith(".csv") ? parsePerformanceCsvEnriched(txt,
          name) : profilesFromJson(JSON.parse(txt), name);
      for (const p of profiles) {
        // profil supprimé ou absorbé par une fusion dans cette page : pas ramené par la relecture du dossier
        if (state.removedProfiles?.[p.id]) continue;
        storeProfile(p);
        count++
      }
    } catch {
      /* fichier illisible ou d'un autre format : ignoré */
    }
  }
  save();
  lastPerfRead = Date.now();
  return count
}
/** Après une lecture du dossier : profil actif repris du dossier s'il n'a pas de modification en cours, état « n profils
 *  lus », base de performances redessinée. */
function perfFolderDone(count) {
  const stored = active && state.profiles[active.id];
  if (stored && !profileDirty && JSON.stringify(normalize(structuredClone(stored))) !== activeSavedSnapshot) setActive(stored, kt([
    "dossier performances relu", "performance folder reread", "Leistungsordner neu gelesen", "carpeta de rendimiento releída"
  ]));
  setText("ppStatus", ktf(["{n} profil(s) lu(s) dans le dossier « {dir} » à {t}.", "{n} profile(s) read from the “{dir}” folder at {t}.",
    "{n} Profil(e) aus dem Ordner „{dir}“ um {t} gelesen.", "{n} perfil(es) leído(s) en la carpeta «{dir}» a las {t}."
  ], {
    n: count,
    dir: dirHandle?.name || "",
    t: new Date().toLocaleTimeString(window.RepositoryNav?.getLanguage?.() || "fr", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }));
  renderPerfProfilesSoon()
}
// Choix du dossier performances : lit les profils (.json, .lnmperf, .csv) qu'il contient.
$("dirBtn").onclick = async () => {
  if (!window.showDirectoryPicker) return window.AppFramework.notify(
    "Ce navigateur ne permet pas l’accès direct à un dossier. Utilise Chrome/Edge ou importe les fichiers.", 'warn');
  perfBusy = true;
  try {
    dirHandle = window.FileAccess ? await window.FileAccess.pickFolder("__perf") : await showDirectoryPicker({
      mode: "readwrite"
    }); /* dossier mémorisé, sélecteur ouvert sur le dossier actuel */
    state.removedProfiles = {}; // choisir le dossier = reprendre tout ce qu'il contient
    const count = await readPerfFolder(dirHandle);
    perfFolderDone(count);
    window.AppFramework.notify(`${count} profil(s) chargé(s). La BDD locale sera écrite ici via « Exporter BDD locale ».`, 'ok')
  } catch (e) {
    if (e.name !== "AbortError") window.AppFramework.notify(e.message, 'err')
  } finally {
    perfBusy = false
  }
};
/** « Relire » (ask vrai) ou dossier changé ailleurs (ask faux) : relit le dossier performances déjà choisi. ask : demande
 *  la permission au besoin et dit pourquoi rien n'est relu ; sans ask, rien ne s'affiche si le dossier n'est pas accessible. */
async function reloadPerfFolder(ask) {
  let h = dirHandle;
  if (!h && window.FileAccess) try {
    h = await window.FileAccess.get("__perf")
  } catch {
    h = null
  }
  if (!h) {
    if (ask) window.AppFramework.notify(kt(["Aucun dossier performances choisi : bouton « Dossier… » d’abord.",
      "No performance folder chosen: use the “Folder…” button first.",
      "Kein Leistungsordner gewählt: zuerst die Schaltfläche „Ordner…“.",
      "Ninguna carpeta de rendimiento elegida: primero el botón «Carpeta…»."
    ]), "warn");
    return
  }
  let perm = "prompt";
  try {
    perm = await h.queryPermission({
      mode: "readwrite"
    })
  } catch {
    perm = "prompt"
  }
  if (perm !== "granted" && ask) try {
    perm = await h.requestPermission({
      mode: "readwrite"
    })
  } catch {
    perm = "denied"
  }
  if (perm !== "granted") {
    if (ask) window.AppFramework.notify(kt([
      "Accès au dossier performances refusé : l’autoriser, ou le choisir de nouveau (bouton « Dossier… »).",
      "Access to the performance folder denied: allow it, or choose it again (“Folder…” button).",
      "Zugriff auf den Leistungsordner verweigert: erlauben oder neu wählen (Schaltfläche „Ordner…“).",
      "Acceso a la carpeta de rendimiento denegado: autorizarlo o elegirla de nuevo (botón «Carpeta…»)."
    ]), "warn");
    return
  }
  dirHandle = h;
  if (ask) state.removedProfiles = {}; // « Relire » = reprendre tout ce que le dossier contient
  perfBusy = true;
  try {
    perfFolderDone(await readPerfFolder(h))
  } catch (e) {
    if (ask) window.AppFramework.notify(e.message, "err")
  } finally {
    perfBusy = false
  }
}
// Dossier performances changé ailleurs (autre page, autre onglet, Paramètres) : profils relus sans question.
window.addEventListener("file-access-change", e => {
  if (e.detail?.key && e.detail.key !== "__perf") return;
  setTimeout(() => {
    if (!perfBusy && Date.now() - lastPerfRead > 3000) reloadPerfFolder(false)
  }, 300)
});

// ===== Little Navmap : lecture et export des profils .lnmperf =====
/** Nombre du premier élément tag sous root (def si absent ou non numérique). */
function xmlNum(root, tag, def = 0) {
  let n = root.querySelector(tag);
  return n ? Number(n.textContent) || def : def
}
/** Texte du premier élément tag sous root (def si absent). */
function xmlText(root, tag, def = "") {
  let n = root.querySelector(tag);
  return n ? n.textContent.trim() : def
}
/** Profil lu dans un fichier Little Navmap .lnmperf (options, carburants, phases). Lève une erreur si le XML ou la structure est invalide. */
function parseLnmperf(txt, name = "profil.lnmperf") {
  const x = new DOMParser().parseFromString(txt, "application/xml");
  if (x.querySelector("parsererror")) throw Error("XML .lnmperf invalide");
  const ap = x.querySelector("AircraftPerf"),
    opt = ap?.querySelector("Options"),
    perf = ap?.querySelector("Perf");
  if (!ap || !perf) throw Error("Structure Little Navmap non reconnue");
  const fuelAsVolume = xmlNum(opt, "FuelAsVolume", 0),
    unit = fuelAsVolume ? "gal" : "lb";
  /** Phase d'un profil Little Navmap : débit et TAS (et vario pour la montée ou la descente). */
  const phase = (tag, vert = false) => {
    let q = perf.querySelector(tag);
    if (!q) return {};
    let z = {
      fuelFlowPerHour: xmlNum(q, "FuelFlowLbsGalPerHour"),
      tasKt: xmlNum(q, "SpeedKtsTAS")
    };
    if (vert) z.rateFpm = Math.abs(xmlNum(q, "VertSpeedFtPerMin"));
    return z
  };
  return normalize({
    id: xmlText(opt, "AircraftType", name.replace(/\.lnmperf$/i, "")),
    icao: xmlText(opt, "AircraftType", ""),
    name: xmlText(opt, "Name", name.replace(/\.lnmperf$/i, "")),
    description: xmlText(opt, "Description", ""),
    unit,
    jetFuel: !!xmlNum(opt, "JetFuel", 1),
    fuelAsVolume: !!fuelAsVolume,
    contingencyPercent: xmlNum(perf, "ContingencyFuelPercent", 0),
    extraFuel: xmlNum(perf, "ExtraFuelLbsGal", 0),
    reserveFuel: xmlNum(perf, "ReserveFuelLbsGal", 0),
    taxiFuel: xmlNum(perf, "TaxiFuelLbsGal", 0),
    usableFuel: xmlNum(perf, "UsableFuelLbsGal", 0),
    minRunwayLengthFt: xmlNum(perf, "MinRunwayLengthFt", 0),
    runwayType: xmlText(perf, "RunwayType", "HARD"),
    alternate: phase("Alternate"),
    climb: phase("Climb", true),
    cruise: phase("Cruise"),
    descent: phase("Descent", true),
    lnmSource: true
  }, name);
}
/** Échappe un texte pour HTML / XML (& < > " '). */
function escXml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  } [c]))
}
/** Bloc XML d'une phase .lnmperf (débit, TAS, vario si vertical). */
function lnmPhase(tag, p, vertical = false) {
  p = p || {};
  return `      <${tag}>\n        <FuelFlowLbsGalPerHour>${Number(p.fuelFlowPerHour||0).toFixed(3)}</FuelFlowLbsGalPerHour>\n        <SpeedKtsTAS>${Number(p.tasKt||0).toFixed(3)}</SpeedKtsTAS>${vertical?`\n        <VertSpeedFtPerMin>${Number(Math.abs(p.rateFpm||0)).toFixed(3)}</VertSpeedFtPerMin>`:""}\n      </${tag}>`;
}
/** Libellés des champs requis par l'export .lnmperf encore vides dans le profil p. */
function missingLnmperfFields(p) {
  return PROFILE_FIELDS.filter(([, label, path, type, lnm = true]) => lnm !== false && type !== "textarea" && (pathGet(p, path) === null ||
    pathGet(p, path) === undefined || pathGet(p, path) === "")).map(x => x[1])
}
/** Texte .lnmperf d'un profil (Little Navmap). Lève une erreur si des champs requis manquent. */
function toLnmperf(p) {
  const missing = missingLnmperfFields(p);
  if (missing.length) throw Error("Export `.lnmperf` bloqué : champs non renseignés : " + missing.join(" ; "));
  p = {
    ...p,
    simbriefAirframeId: ""
  }; // les métadonnées SimBrief restent JSON-only ; Description reste strictement identique
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<LittleNavmap xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://www.littlenavmap.org/schema/lnmperf.xsd">\n  <AircraftPerf>\n    <Header>\n      <CreationDate>${now}</CreationDate>\n      <FileVersion>1.0</FileVersion>\n      <ProgramName>Flight Performance &amp; Fuel Planner</ProgramName>\n      <ProgramVersion>0.2</ProgramVersion>\n      <Documentation>https://www.littlenavmap.org/lnmperf.html</Documentation>\n    </Header>\n    <Options>\n      <Name>${escXml(p.name||p.id)}</Name>\n      <AircraftType>${escXml(p.icao||p.id)}</AircraftType>\n      <Description>${escXml((p.description||"")+(p.simbriefAirframeId?` | SimBrief airframe ${p.simbriefAirframeId}`:""))}</Description>\n      <FuelAsVolume>${p.fuelAsVolume?1:0}</FuelAsVolume>\n      <JetFuel>${p.jetFuel===false?0:1}</JetFuel>\n    </Options>\n    <Perf>\n      <ContingencyFuelPercent>${Number(p.contingencyPercent||0).toFixed(1)}</ContingencyFuelPercent>\n      <ExtraFuelLbsGal>${Number(p.extraFuel||0).toFixed(3)}</ExtraFuelLbsGal>\n      <MinRunwayLengthFt>${Number(p.minRunwayLengthFt||0).toFixed(3)}</MinRunwayLengthFt>\n      <ReserveFuelLbsGal>${Number(p.reserveFuel||0).toFixed(3)}</ReserveFuelLbsGal>\n      <RunwayType>${escXml(p.runwayType||"HARD")}</RunwayType>\n      <TaxiFuelLbsGal>${Number(p.taxiFuel||0).toFixed(3)}</TaxiFuelLbsGal>\n      <UsableFuelLbsGal>${Number(p.usableFuel||0).toFixed(3)}</UsableFuelLbsGal>\n${lnmPhase("Alternate",p.alternate)}\n${lnmPhase("Climb",p.climb,true)}\n${lnmPhase("Cruise",p.cruise)}\n${lnmPhase("Descent",p.descent,true)}\n    </Perf>\n  </AircraftPerf>\n</LittleNavmap>\n`;
}
/** Fait télécharger un texte sous le nom donné (type MIME type). */
function downloadText(name, text, type = "application/octet-stream") {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {
    type
  }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
// ===== Airframes SimBrief → profil d'appareil ; calibration par un OFP =====
/** Objets « airframe » (clé airframe_internal_id / internal_id) trouvés à toute profondeur. */
function walkAirframes(obj, out = []) {
  if (!obj || typeof obj !== "object") return out;
  if (obj.airframe_internal_id || obj.internal_id) out.push(obj);
  for (const v of Object.values(obj))
    if (v && typeof v === "object") walkAirframes(v, out);
  return out;
}
/** Première valeur non vide de o parmi les clés données. */
function pick(o, ...keys) {
  for (const k of keys)
    if (o?.[k] !== undefined && o[k] !== null && o[k] !== "") return o[k]
}
/** Profil construit depuis un airframe SimBrief (métadonnées, capacité) ; les performances de phase viennent du profil local du même type s'il existe. */
function simbriefToProfile(a, id) {
  const icao = String(pick(a, "airframe_list_type", "icao", "type", "aircraft_type") || "SIMBRIEF").toUpperCase();
  // SimBrief's public airframe list is metadata. Preserve it all; phase performance is merged from a local LNM profile when available.
  const base = Object.values(state.profiles || {}).find(p => String(p.icao || p.id).toUpperCase() === icao);
  let p = base ? structuredClone(base) : normalize({
    id: icao,
    icao,
    name: pick(a, "airframe_name", "name", "airframe_comments") || icao,
    unit: "lb"
  }, icao);
  p.id = `SB_${id}`;
  p.icao = icao;
  p.name = pick(a, "airframe_name", "name", "airframe_comments") || p.name || icao;
  p.type = icao;
  p.callsign = pick(a, "callsign", "atc_callsign", "airframe_callsign") || p.callsign || "";
  p.registration = pick(a, "registration", "reg", "tail_number") || p.registration || "";
  p.description = pick(a, "airframe_comments", "comments", "description") || p.description || "";
  p.simbrief = true;
  p.simbriefAirframeId = id;
  p.simbriefAirframe = structuredClone(a);
  const maxfuel = Number(pick(a, "maxfuel", "airframe_maxfuel", "max_fuel"));
  if (Number.isFinite(maxfuel) && maxfuel > 0 && !p.usableFuel) p.usableFuel = maxfuel < 1000 ? maxfuel * 1000 : maxfuel;
  return p;
}
/** Profil construit depuis un OFP SimBrief (type, nom, indicatif, immatriculation, carburants), sur la base du profil local du même type ; instantané de l'OFP conservé. */
function profileFromOFP(ofp) {
  const ac = ofp?.aircraft || {},
    atc = ofp?.atc || {},
    general = ofp?.general || {},
    params = ofp?.params || {};
  const icao = String(pick(ac, "icaocode", "icao", "type", "aircraft_type") || pick(general, "aircraft_type", "type") || "SIMBRIEF")
    .toUpperCase();
  const name = pick(ac, "name", "aircraft_name", "airframe_name", "fullname") || pick(general, "aircraft_name", "aircraft") || icao;
  const callsign = pick(atc, "callsign", "flight_number", "flightnum") || pick(ac, "callsign", "atc_callsign") || pick(params,
    "callsign") || "";
  const registration = pick(ac, "reg", "registration", "tailnumber", "tail_number") || "";
  const airframeId = active?.simbriefAirframeId || pick(ac, "airframe_internal_id", "internal_id") || "";
  const local = Object.values(state.profiles || {}).find(p => String(p.icao || p.type || p.id).toUpperCase() === icao);
  const key = `SB_${icao}_${(registration||callsign||airframeId||"latest").replace(/[^A-Za-z0-9_-]/g,"_")}`;
  let p = local ? structuredClone(local) : normalize({
    id: key,
    icao,
    type: icao,
    name,
    unit: (String(pick(params, "units") || "").toLowerCase().includes("lb") ? "lb" : "kg"),
    simbrief: true
  }, key);
  p.id = key;
  p.icao = icao;
  p.type = icao;
  p.name = name;
  p.callsign = callsign;
  p.registration = registration;
  p.simbrief = true;
  p.simbriefAirframeId = airframeId || p.simbriefAirframeId || "";
  const fuel = ofp?.fuel || {};
  const usable = firstNum(ac, ["max_fuel", "maxfuel", "fuel_capacity", "fuelcapacity"]);
  if (usable !== null) p.usableFuel = usable;
  const taxi = firstNum(fuel, ["taxi", "taxi_fuel", "taxiout"]);
  if (taxi !== null) p.taxiFuel = taxi;
  const reserve = firstNum(fuel, ["reserve", "reserve_fuel", "final_reserve"]);
  if (reserve !== null) p.reserveFuel = reserve;
  const extra = firstNum(fuel, ["extra", "extra_fuel"]);
  if (extra !== null) p.extraFuel = extra;
  const cont = firstNum(params, ["contpct", "cont_percent", "contingency_percent"]);
  if (cont !== null) p.contingencyPercent = cont;
  p.simbriefSnapshot = {
    fetchedAt: new Date().toISOString(),
    aircraft: ac,
    atc,
    params,
    times: ofp?.times || {},
    fuel
  };
  return normalize(p, key);
}
/** Écrit dans le profil les valeurs mesurées sur l'OFP (débit, TAS, vario, Badin par phase ; altitude de croisière = altitude de référence) ; garde la calibration. Sortie : le profil. */
function applyCalibration(p, c) {
  for (const k of ["climb", "cruise", "descent"]) {
    let q = c.phases[k],
      target = p[k] || {};
    if (q.fuelFlowPerHour !== null) target.fuelFlowPerHour = q.fuelFlowPerHour;
    if (q.tasKt !== null) target.tasKt = q.tasKt;
    if (q.rateFpm !== null && k !== "cruise") target.rateFpm = q.rateFpm;
    if (q.iasKt > 0) target.iasKt = Math.round(q.iasKt);
    if (k === "cruise" && c.cruiseAltFt > 0) target.refAltFt = Math.round(c.cruiseAltFt);
    p[k] = target
  }
  p.calibration = c;
  p.description = (p.description || "") + ` | OFP calibration ${c.createdAt}`;
  return p
}
/** Import complet d'un OFP : affichage, devis, profil, calibration (si le navlog le permet), cache ; message d'état. Sortie : la calibration ou null. */
async function importOFPProfile(raw, fileName, source) {
  showJson(raw, fileName, "OFP SimBrief");
  populatePlanFromOFP(raw);
  const p = profileFromOFP(raw);
  setActive(p, source);
  try {
    const c = extractOfpCalibration(raw);
    applyCalibration(p, c);
    setActive(p, c.partial ? "FPL SimBrief — calibration partielle" : "FPL SimBrief — calibration complète");
    await storeOFP(raw, c, fileName);
    renderCalibration(c);
    $("ofpStatus").textContent = c.partial ? `Profil ${p.name} créé. Calibration partielle : ${c.availablePhases.join(", ")||"aucune phase mesurable"}.` : `Profil ${p.name} créé et calibré depuis le FPL.`;
    return c
  } catch (err) {
    await storeOFP(raw, null, fileName);
    $("ofpStatus").textContent = `Profil ${p.name} créé avec les métadonnées du FPL ; calibration impossible : ${err.message}`;
    return null
  }
}
/** Premier JSON obtenu parmi une liste d'URL (dans l'ordre). Sortie : { data, url } ; lève une erreur listant les échecs. */
async function fetchJsonFirst(urls) {
  let errors = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        cache: "no-store",
        credentials: "omit"
      });
      if (!r.ok) {
        errors.push(`${r.status} ${url}`);
        continue
      }
      const ct = r.headers.get("content-type") || "",
        txt = await r.text();
      try {
        return {
          data: JSON.parse(txt),
          url
        }
      } catch {
        errors.push(`réponse non JSON ${url}`)
      }
    } catch (e) {
      errors.push(`${e.message} ${url}`)
    }
  }
  throw Error(errors.join(" ; "));
}
/** Objet airframe d'identifiant id cherché à toute profondeur ; null sinon. */
function findAirframeObject(obj, id) {
  if (!obj || typeof obj !== "object") return null;
  if (String(obj.airframe_internal_id || obj.internal_id || obj.id || "") === id) return obj;
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const f = findAirframeObject(v, id);
      if (f) return f
    }
  }
  return null;
}
/** Airframe SimBrief d'un Internal ID : liste publique, puis lien de partage, sinon identifiant seul (partial). Sortie : { airframe, source, partial? }. */
async function resolveSimbriefAirframe(id) {
  // 1) La liste publique reste le chemin le plus léger pour les profils qui y figurent.
  try {
    const r = await fetch("https://www.simbrief.com/api/inputs.airframes.json", {
      cache: "no-store"
    });
    if (r.ok) {
      const data = await r.json(),
        a = findAirframeObject(data, id);
      if (a) return {
        airframe: a,
        source: "inputs.airframes.json"
      }
    }
  } catch {}
  // 2) Un Internal ID personnalisé est officiellement un identifiant de TYPE pour Dispatch.
  // Il n'existe pas, dans la doc publique, d'endpoint de lecture d'airframe personnel par ID seul.
  // On tente les représentations JSON usuelles du lien de partage, sans prétendre qu'elles sont garanties.
  const share = `https://dispatch.simbrief.com/airframes/share/${encodeURIComponent(id)}`;
  try {
    const got = await fetchJsonFirst([
      `${share}?format=json`, `${share}.json`,
      `https://dispatch.simbrief.com/api/airframes/share/${encodeURIComponent(id)}`
    ]);
    const a = findAirframeObject(got.data, id) || got.data;
    return {
      airframe: a,
      source: got.url
    };
  } catch {}
  // 3) On conserve néanmoins l'Internal ID comme profil valide SimBrief.
  // La génération Dispatch officielle pourra l'utiliser comme "type".
  return {
    airframe: {
      airframe_internal_id: id,
      name: `SimBrief ${id}`
    },
    source: "internal-id-only",
    partial: true
  };
}
// Import d'un airframe SimBrief par Internal ID ou lien de partage.
$("sbAirframeBtn").onclick = async () => {
  const raw = $("sbAirframeId").value.trim();
  if (!raw) return;
  const m = raw.match(/(\d+_\d+)/),
    id = m ? m[1] : raw;
  $("sbAirframeId").value = id;
  $("sbStatus").textContent = "Résolution de l’airframe SimBrief…";
  try {
    const res = await resolveSimbriefAirframe(id),
      p = simbriefToProfile(res.airframe, id);
    setActive(p, res.partial ? "SimBrief Internal ID" : "SimBrief airframe");
    await cachePut(`airframe:${id}`, {
      fetchedAt: new Date().toISOString(),
      source: res.source,
      airframe: res.airframe
    });
    const hasPerf = p.cruise?.fuelFlowPerHour && p.climb?.fuelFlowPerHour && p.descent?.fuelFlowPerHour;
    if (res.partial) {
      $("sbStatus").innerHTML = `Internal ID accepté : <b>${window.RepositoryKit.esc(id)}</b>. Il est utilisable comme <code>type</code> par l’API Dispatch SimBrief. SimBrief ne documente toutefois pas d’endpoint public permettant de lire les données complètes d’un airframe personnel à partir de cet ID seul. ${hasPerf?"Les performances LNM locales correspondantes ont été conservées.":"Charge un .lnmperf correspondant pour les performances LNM."}`;
    } else {
      $("sbStatus").textContent = `Airframe importé (${res.source}). ${hasPerf?"Performances LNM disponibles.":"Charge un .lnmperf correspondant pour compléter TAS, vario et débits."}`;
    }
  } catch (e) {
    $("sbStatus").textContent = "Échec : " + e.message
  }
};
// Exporte le profil actif en .lnmperf (Little Navmap).
$("exportLnmBtn").onclick = () => {
  try {
    commitProfileEditor(false);
    downloadText(`${(active.icao||active.id).replace(/[^\w.-]+/g,"_")}_${active.simbriefAirframeId||"profile"}.lnmperf`, toLnmperf(active), "application/xml")
  } catch (e) {
    $("profileEditStatus").textContent = e.message
  }
};

// ===== Cache IndexedDB FlightPerfCache (OFP, airframes) =====
/** Écrit un objet dans le cache IndexedDB « FlightPerfCache » (clé key). */
async function cachePut(key, obj) {
  return new Promise((res, rej) => {
    let q = indexedDB.open("FlightPerfCache", 1);
    q.onupgradeneeded = () => q.result.createObjectStore("cache");
    q.onsuccess = () => {
      let tx = q.result.transaction("cache", "readwrite");
      tx.objectStore("cache").put(obj, key);
      tx.oncomplete = res;
      tx.onerror = rej
    }
  })
}
/** Lit un objet du cache IndexedDB « FlightPerfCache ». */
async function cacheGet(key) {
  return new Promise((res, rej) => {
    let q = indexedDB.open("FlightPerfCache", 1);
    q.onupgradeneeded = () => q.result.createObjectStore("cache");
    q.onsuccess = () => {
      let tx = q.result.transaction("cache", "readonly");
      let r = tx.objectStore("cache").get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = rej
    }
  })
}
/** Garde le dernier OFP (brut, calibration, nom) dans le cache et son résumé dans l'état. */
async function storeOFP(raw, calibration, fileName) {
  const saved = {
    raw,
    calibration,
    fileName,
    fetchedAt: new Date().toISOString()
  };
  await cachePut("lastOFP", saved);
  state.lastOFP = {
    fileName,
    fetchedAt: saved.fetchedAt,
    calibration
  };
  return saved
}
/** Dernier OFP gardé dans le cache. */
async function loadOFP() {
  return await cacheGet("lastOFP")
}
/** Nombre lu dans un texte (séparateurs de milliers « , » retirés) ; null s'il n'est pas lisible. */
const n = v => {
  let x = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(x) ? x : null
};
/** Premier nombre lisible parmi les clés données (valeur directe ou nœud texte d'un OFP converti en JSON). */
const firstNum = (o, keys) => {
  for (const k of keys) {
    let v = o?.[k];
    if (v && typeof v === "object") v = v["#text"] ?? v.text ?? v.value;
    let x = n(v);
    if (x !== null) return x
  }
  return null
};
/** Premier texte non vide parmi les clés données (valeur directe ou nœud texte). */
const firstText = (o, keys) => {
  for (const k of keys) {
    let v = o?.[k];
    if (v && typeof v === "object") v = v["#text"] ?? v.text ?? v.value;
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim()
  }
  return ""
};
// ===== Calibration sur les OFP réels : navlog, montée / croisière / descente mesurées =====
/** Tableau des points du navlog trouvé dans un OFP (clés navlog / waypoints / fix…) ; null sinon. */
function findNavlog(o) {
  if (!o || typeof o !== "object") return null;
  if (Array.isArray(o) && o.length > 1 && o.some(x => typeof x === "object" && firstNum(x, ["altitude_feet", "altitude", "time_total",
      "fuel_total"
    ]) !== null)) return o;
  for (const [k, v] of Object.entries(o)) {
    if (/navlog|waypoints?|fixes|fix/i.test(k)) {
      if (Array.isArray(v)) return v;
      if (Array.isArray(v?.fix)) return v.fix;
      if (Array.isArray(v?.waypoint)) return v.waypoint
    }
    if (v && typeof v === "object") {
      let r = findNavlog(v);
      if (r) return r
    }
  }
  return null
}
/** Durée en minutes depuis « h:mm(:ss) », « hhmm » ou un nombre (secondes si > 10 000). */
function normalizeTime(v) {
  let s = String(v ?? "").trim(),
    m = s.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (m) return +m[1] * 60 + +m[2] + +(m[3] || 0) / 60;
  if (/^\d{3,4}$/.test(s)) {
    let h = +s.slice(0, -2),
      min = +s.slice(-2);
    if (min < 60) return h * 60 + min
  }
  let x = n(s);
  return x !== null ? (x > 10000 ? x / 60 : x) : null
}
/** Mesures par phase (montée, croisière, descente) sur le navlog d'un OFP : durée, carburant, distance air ou sol, débit, TAS (distance air seulement), vario, Badin moyen. Phases repérées par l'altitude (croisière ≥ 98 % du max). Lève une erreur sans navlog ou sans altitudes. */
function extractOfpCalibration(ofp) {
  const nav = findNavlog(ofp);
  if (!nav || nav.length < 2) throw Error("Navlog/waypoints exploitable absent : aucune calibration par phase possible.");
  const pts = nav.map((x, i) => ({
    raw: x,
    i,
    alt: firstNum(x, ["altitude_feet", "altitude", "altitude_ft", "altitudefeet"]),
    time: normalizeTime(firstText(x, ["time_total", "time_enroute", "time", "time_remain"])),
    fuel: firstNum(x, ["fuel_total", "fuel_enroute", "fuel", "fuel_remain"]),
    dist: firstNum(x, ["distance_total", "distance", "dist_total", "distance_nm"]),
    airDist: firstNum(x, ["air_distance", "air_distance_nm", "airdist"]),
    ias: firstNum(x, ["ind_airspeed", "ias", "indicated_airspeed"])
  }));
  const maxAlt = Math.max(...pts.map(p => p.alt ?? -Infinity));
  if (!Number.isFinite(maxAlt)) throw Error("Altitudes du navlog absentes : phases non identifiables sans les inventer.");
  const cruiseFloor = maxAlt * .98;
  /** Phase du point i du navlog : croisière près de l'altitude max, sinon montée ou descente selon la variation. */
  let phaseOf = i => {
    let p = pts[i],
      q = pts[Math.max(0, i - 1)];
    if (i === 0) return "climb";
    if ((p.alt ?? 0) >= cruiseFloor) return "cruise";
    if ((p.alt ?? 0) > (q.alt ?? 0) + 100) return "climb";
    if ((p.alt ?? 0) < (q.alt ?? 0) - 100) return "descent";
    return i < pts.findIndex(z => (z.alt ?? 0) >= cruiseFloor) ? "climb" : "descent"
  };
  const groups = {
    climb: [],
    cruise: [],
    descent: []
  };
  for (let i = 1; i < pts.length; i++) groups[phaseOf(i)].push([pts[i - 1], pts[i]]);
  /** Mesures d'une phase sur ses segments : durée, carburant, distances, débit, TAS (distance air) et vario moyens. */
  const phase = (name, segs) => {
    let time = 0,
      fuel = 0,
      dist = 0,
      air = 0,
      altDelta = 0,
      hasAir = false,
      source = [],
      iasSum = 0,
      iasN = 0;
    for (const [a, b] of segs) {
      let dt = a.time !== null && b.time !== null ? Math.abs(b.time - a.time) : null;
      if (b.ias > 0) {
        iasSum += b.ias;
        iasN++
      }
      let df = a.fuel !== null && b.fuel !== null ? Math.abs(b.fuel - a.fuel) : null;
      let dd = a.dist !== null && b.dist !== null ? Math.abs(b.dist - a.dist) : null;
      let da = a.airDist !== null && b.airDist !== null ? Math.abs(b.airDist - a.airDist) : null;
      if (dt !== null && dt > 0) {
        time += dt;
        if (df !== null) fuel += df;
        if (dd !== null) dist += dd;
        if (da !== null) {
          air += da;
          hasAir = true
        }
        if (a.alt !== null && b.alt !== null) altDelta += b.alt - a.alt
      }
      source.push(`${a.i}→${b.i}`)
    }
    let ff = time && fuel ? fuel / (time / 60) : null,
      speed = time ? (hasAir ? air : dist) / (time / 60) : null,
      vr = time && altDelta ? Math.abs(altDelta) / time : null;
    return {
      name,
      source: source.join(", "),
      timeMin: time || null,
      fuel: fuel || null,
      distanceNm: dist || null,
      airDistanceNm: hasAir ? air : null,
      fuelFlowPerHour: ff,
      tasKt: hasAir ? speed : null,
      groundSpeedKt: !hasAir ? speed : null,
      rateFpm: vr,
      estimated: !hasAir && speed !== null,
      altitudeDeltaFt: altDelta || null,
      iasKt: iasN ? iasSum / iasN : null
    };
  };
  const r = {
    climb: phase("climb", groups.climb),
    cruise: phase("cruise", groups.cruise),
    descent: phase("descent", groups.descent)
  };
  const available = Object.values(r).filter(p => p.timeMin && p.fuelFlowPerHour !== null).map(p => p.name);
  return {
    schema: "flight-perf/ofp-calibration-v1",
    cruiseAltFt: maxAlt,
    createdAt: new Date().toISOString(),
    ofpTimestamp: firstText(ofp?.params || ofp, ["time_generated", "generated", "created_at"]) || null,
    airframeId: active?.simbriefAirframeId || null,
    aircraft: {
      icao: firstText(ofp?.aircraft || {}, ["icaocode", "type"]),
      name: firstText(ofp?.aircraft || {}, ["name", "reg"])
    },
    phases: r,
    availablePhases: available,
    partial: available.length < 3,
    notes: ["Distance air uniquement quand le navlog l’expose.",
      "Une vitesse issue de distance sol est affichée comme GS et n’est pas écrite en TAS dans le profil.", available.length === 3 ?
      "Trois phases mesurées." : `Calibration partielle : ${available.join(", ")||"aucune phase mesurable"}. Les autres valeurs sont laissées intactes.`
    ]
  };
}
/** Tableau d'audit de la calibration OFP (mesures par phase) et sa provenance. */
function renderCalibration(c) {
  const u = fuelUnit(),
    rows = Object.values(c.phases).map(p => `<tr><td>${window.RepositoryKit.esc(p.name)}</td><td>${window.RepositoryKit.esc(p.source)}</td><td>${fmt(p.timeMin,1)} min</td><td>${fmt(p.airDistanceNm??p.distanceNm,1)} NM${p.airDistanceNm===null?" sol":" air"}</td><td>${showFuel(p.fuel)} ${u}</td><td>${showFuel(p.fuelFlowPerHour)} ${u}/h</td><td>${p.tasKt?fmt(p.tasKt)+" TAS":p.groundSpeedKt?fmt(p.groundSpeedKt)+" GS (estimé)":"—"}</td><td>${fmt(p.rateFpm)} ft/min</td></tr>`).join("");
  $("ofpAudit").innerHTML = rows;
  $("calibrationMeta").innerHTML = [
    ["OFP analysé", c.createdAt],
    ["Airframe SimBrief", c.airframeId || "non associé"],
    ["Provenance", c.ofpTimestamp || "timestamp absent"],
    ["TAS", Object.values(c.phases).some(p => p.tasKt) ? "distance air navlog" : "non disponible — aucune TAS écrite"]
  ].map(x => `<div>${x[0]}</div><div>${window.RepositoryKit.esc(x[1])}</div>`).join("");
}
// Ouvre le sélecteur d'OFP JSON.
$("ofpFileBtn").onclick = () => $("ofpFile").click();
// Import d'un OFP JSON : profil et calibration.
$("ofpFile").onchange = async e => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    const raw = JSON.parse(await f.text());
    showJson(raw, f.name);
    if (!isSimbriefOfp(raw)) $("ofpStatus").textContent =
      "JSON chargé, mais structure SimBrief non reconnue automatiquement ; tentative d’analyse…";
    await importOFPProfile(raw, f.name, "OFP JSON importé");
    save()
  } catch (err) {
    $("ofpStatus").textContent = "OFP refusé : " + err.message
  } finally {
    e.target.value = ""
  }
};
// Applique au profil actif la calibration du dernier OFP.
$("calibrateBtn").onclick = async () => {
  try {
    if (!active) throw Error("Récupère d’abord un FPL SimBrief ou choisis un profil.");
    let saved = await loadOFP();
    if (!saved?.calibration) throw Error("Récupère d’abord le dernier FPL ou importe un OFP JSON exploitable.");
    const c = saved.calibration;
    applyCalibration(active, c);
    setActive(active, "calibration OFP SimBrief");
    await cachePut(`calibration:${active.simbriefAirframeId||active.id}`, c);
    renderCalibration(c);
    $("ofpStatus").textContent = c.partial ? `Calibration partielle appliquée : ${c.availablePhases.join(", ")||"aucune phase"}. Les autres valeurs restent vides.` : "Calibration complète appliquée."
  } catch (err) {
    $("ofpStatus").textContent = "Calibration non appliquée : " + err.message
  }
};
// Exporte l'audit du dernier OFP (JSON).
$("exportAuditBtn").onclick = async () => {
  let saved = await loadOFP();
  if (!saved?.calibration) return window.AppFramework.notify("Aucun audit OFP à exporter.", 'warn');
  downloadText(`simbrief_ofp_audit_${saved.calibration.createdAt.replace(/[:.]/g,"-")}.json`, JSON.stringify(saved, null, 2), "application/json")
};
// Récupère le dernier FPL SimBrief de l'utilisateur (profil pilote commun) et l'importe comme OFP.
$("simBtn").onclick = async () => {
  try {
    $("simBtn").disabled = true;
    $("source").textContent = "SimBrief : récupération du dernier FPL…";
    /** Identifiant SimBrief du profil pilote commun (missionReportingConfig:v1), '' s'il manque. */
    const u = (() => {
      try {
        return JSON.parse(localStorage.getItem("missionReportingConfig:v1") || "{}").simbriefUser
      } catch {
        return ""
      }
    })(); /* profil pilote commun (☰ › Profil pilote) */
    if (!u) throw Object.assign(Error("identifiant SimBrief à saisir dans ☰ › Profil pilote"), {
      simbrief: "SimBrief : identifiant manquant"
    });
    // SimBrief répond 400 avec un JSON ({ fetch: { status: "Error: …" } }) quand il n'a pas de plan de vol pour ce compte :
    // c'est sa réponse qui est affichée, pas « indisponible » (le réseau marche)
    let r;
    try {
      r = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?${/^\d+$/.test(u)?"userid":"username"}=${encodeURIComponent(u)}&json=v2`, {
        cache: "no-store"
      });
    } catch {
      throw Object.assign(Error("SimBrief injoignable (réseau, bloqueur de contenu ?)"), {
        simbrief: "SimBrief injoignable"
      });
    }
    const ofp = await r.json().catch(() => null);
    const said = String(ofp?.fetch?.status || "");
    if (!r.ok || /^error/i.test(said)) throw Object.assign(Error(/no flight plan/i.test(said) ? `aucun plan de vol sur SimBrief pour « ${u} » (en générer un sur simbrief.com)` : said.replace(/^error:\s*/i,
      "") || "SimBrief HTTP " + r.status), {
      simbrief: "SimBrief : pas de FPL"
    });
    await importOFPProfile(ofp, "SimBrief dernier FPL — " + u, "SimBrief : dernier FPL");
    $("source").textContent = `SimBrief : dernier FPL ${active?.name||active?.icao||""} chargé`;
  } catch (e) {
    $("source").textContent = e.simbrief || "SimBrief : FPL illisible";
    $("ofpStatus").textContent = "Récupération directe impossible : " + e.message +
      ". Sinon, importe le JSON OFP téléchargé depuis SimBrief.";
    // aussi en notification flottante : le bloc Calibration (où s'affiche ce détail) n'existe qu'au niveau Expert
    window.AppFramework?.notify?.("SimBrief — " + e.message, "warn")
  } finally {
    $("simBtn").disabled = false
  }
};
/* ===== Avions connus du Landing Performance (cache IndexedDB écrit par la page landing) ===== */
const LANDING_DB = "LandingPerformanceDashboardCache",
  LANDING_STORE = "datasets",
  LANDING_KEY = "lastDataset";
let landingAircraft = [],
  landingStamp = "";
// ===== Appareils du tableau de bord des atterrissages (cache IndexedDB partagé) et liste des appareils =====
/** Clé de comparaison d'un nom d'appareil : majuscules, sans accents ni séparateurs. */
function aKey(s) {
  return String(s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "")
}
/** Dernier jeu de données du Landing Performance (IndexedDB partagé, même schéma que la page landing) ; null si absent. */
function readLandingCache() {
  return new Promise(resolve => {
    try {
      if (!("indexedDB" in window)) return resolve(null);
      const req = indexedDB.open(LANDING_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(LANDING_STORE)) req.result.createObjectStore(LANDING_STORE)
      }; /* même schéma que la page landing : ne jamais créer une base incompatible */
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const g = db.transaction(LANDING_STORE, "readonly").objectStore(LANDING_STORE).get(LANDING_KEY);
          g.onsuccess = () => {
            db.close();
            resolve(g.result || null)
          };
          g.onerror = () => {
            db.close();
            resolve(null)
          }
        } catch {
          db.close();
          resolve(null)
        }
      }
    } catch {
      resolve(null)
    }
  })
}
/** Lecteur CSV des fichiers d'atterrissages (virgule, guillemets doublés). */
function landingCsvRows(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++
        } else quoted = false
      } else field += c
    } else {
      if (c === '"') quoted = true;
      else if (c === ",") {
        row.push(field);
        field = ""
      } else if (c === "\n") {
        row.push(field);
        field = "";
        if (row.some(v => v.trim() !== "")) rows.push(row);
        row = []
      } else if (c !== "\r") field += c
    }
  }
  row.push(field);
  if (row.some(v => v.trim() !== "")) rows.push(row);
  return rows
}
/* mêmes règles que la page landing : format riche (colonnes nommées) ou historique (avion en colonne 2) */
/** Codes des appareils présents dans un CSV d'atterrissages (format riche à colonnes nommées ou historique). */
function landingAircraftFromCsv(text) {
  const rows = landingCsvRows(text);
  if (!rows.length) return [];
  const first = rows[0].map(x => x.trim().replace(/^\uFEFF/, "")),
    hasHeader = first.includes("Timestamp") && first.includes("Aircraft"),
    rich = hasHeader && ["Score", "TouchdownFPM", "PeakG"].every(k => first.includes(k)),
    col = k => first.indexOf(k),
    out = new Set();
  for (const r of rows.slice(hasHeader ? 1 : 0)) {
    if (!String(r[rich ? col("Timestamp") : 0] ?? "").trim()) continue;
    const name = String(rich ? (r[col("PLANE_ICAO")] || r[col("ICAO")] || r[col("Aircraft")] || "") : (r[1] ?? "")).trim().toUpperCase();
    if (name) out.add(name)
  }
  return [...out]
}
/** Relit la liste des appareils du Landing Performance si le cache a changé. Sortie : vrai si la liste a changé. */
async function refreshLandingAircraft() {
  const rec = await readLandingCache(),
    stamp = rec ? `${rec.savedAt}|${rec.size}|${rec.name}` : "";
  if (stamp === landingStamp) return false;
  landingStamp = stamp;
  landingAircraft = rec && typeof rec.text === "string" ? landingAircraftFromCsv(rec.text) : [];
  return true
}
/** Nom affiché d'un appareil connu seulement du Landing / de la compagnie : modèle de la base des types (référence et surnom
 *  d'abord, constructeur ensuite : AircraftCatalog.displayName ; hors libellés de navigation mal lus) et code. */
function landingName(code, rec) {
  const m = String(rec?.model || "").trim();
  return m && !/^(Aircraft Performance Database|Skip to aircraft details)$/i.test(m) ? `${window.AircraftCatalog?.displayName(m) || m} (${code})` : code
}
/** Appareils du Landing Performance et types qui n'ont pas encore de profil (proposés dans la liste, profil vide créé au choix). */
function landingOnlyAircraft(profiles) {
  const db = window.AIRCRAFT_DB || {},
    resolve = n => {
      const k = aKey(n);
      return db[k] || db[db.__aliases?.[k]] || null
    },
    known = new Set();
  for (const p of profiles)
    for (const v of [p.id, p.icao, p.type, p.name]) {
      const k = aKey(v);
      if (!k) continue;
      known.add(k);
      const r = resolve(v);
      if (r?.tdesig) known.add(aKey(r.tdesig))
    }
  /* Types employés par la compagnie (catalogue commun : flotte, référence, missions) : proposés même sans profil. */
  const defa = new Set((window.AircraftCatalog?.defaTypes() || []).map(t => t.type));
  return [...new Set([...landingAircraft, ...defa])].filter(n => {
    const r = resolve(n);
    return !known.has(aKey(n)) && !(r?.tdesig && known.has(aKey(r.tdesig)))
  }).map(n => {
    const r = resolve(n);
    return normalize({
      id: n,
      icao: r?.tdesig || n,
      type: r?.tdesig || n,
      name: landingName(n, r),
      _landingOnly: true,
      _defa: defa.has(n),
      _landing: landingAircraft.includes(n)
    })
  })
}
/** Profil vide pour un appareil connu seulement du Landing / de la compagnie (performances à renseigner) ; null si inconnu. */
function newProfileFromLanding(id) {
  const s = landingOnlyAircraft(Object.values(state.profiles || {}).filter(p => p && typeof p === "object").map(p => normalize(p))).find(
    p => p.id === id);
  return s ? normalize({
    id: s.id,
    icao: s.icao,
    type: s.type,
    name: s.name,
    description: s._landing ? "Créé depuis le Landing Performance : perfs à renseigner." :
      "Type utilisé par la compagnie : perfs à renseigner."
  }) : null
}
/** Liste des appareils de l'en-tête : une rangée par appareil (icône, nom, type, source du profil, état), groupées par
 *  catégorie ; profils enregistrés et appareils sans profil (Landing Performance, flotte). Choix au clic ou au clavier
 *  (flèches, Entrée ou Espace, Échap) : le profil devient actif (ou est créé vide). */
/** Appareils rangés par section : « Mes appareils » en tête (si mineFirst), puis par catégorie (« Autres » en dernier),
 *  par nom dans chaque section. Rend Map(libellé → [[profil, profileVisual(profil)], …]) ; liste déjà triée en sortie. */
function aircraftGroups(list, mineFirst) {
  const all = [...list].sort((a, b) => {
      let x = profileVisual(a),
        y = profileVisual(b),
        group = ((x[0] === "Autres") - (y[0] === "Autres")) || String(x[0] || "").localeCompare(String(y[0] || ""), "fr");
      return group || String(a.name || a.id || "").localeCompare(String(b.name || b.id || ""), "fr", {
        numeric: true
      })
    }),
    groups = new Map(),
    mineKeys = new Set((myList || []).map(a => aircraftTypeKey(a.code))),
    mineNames = new Set((myList || []).map(a => aKey(a.name))),
    MINE = kt(["Mes appareils", "My aircraft", "Meine Luftfahrzeuge", "Mis aeronaves"]);
  if (mineFirst && mineKeys.size) groups.set(MINE, []);
  for (const p of all) {
    let g = profileVisual(p);
    const mine = mineFirst && ([p.id, p.icao, p.type].some(v => v && mineKeys.has(aircraftTypeKey(v))) || mineNames.has(aKey(p.name)));
    const key = mine ? MINE : g[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push([p, g])
  }
  if (groups.get(MINE)?.length === 0) groups.delete(MINE);
  return groups
}

function listAircraft() {
  const esc = KIT.esc,
    menu = $("aircraftMenu"),
    profiles = Object.values(state.profiles || {}).filter(p => p && typeof p === "object" && String(p.id || p.icao || p.type || p
      .name || "").trim()).map(p => normalize(p));
  // Carburant : les fiches existantes seulement (pas de type sans fiche), « Mes appareils » en tête ; Fiches de
  // performances : fiches et types de la flotte sans fiche
  const all = [...profiles, ...(PERF_PAGE === "sheets" ? landingOnlyAircraft(profiles) : [])],
    groups = aircraftGroups(all, PERF_PAGE === "fuel");
  /** Rangée d'un appareil : état « actif », « sans profil », « à compléter (n) » (manques en infobulle) ou « complet ». */
  const row = (p, g) => {
    const i = profileInfo(p),
      on = active?.id === p.id,
      todo = i.missing.length ? ktf(["à compléter ({n})", "to complete ({n})", "zu ergänzen ({n})", "por completar ({n})"], {
        n: i.missing.length
      }) : "",
      [st, cls, tip] = p._landingOnly ? [kt(["sans profil", "no profile", "kein Profil", "sin perfil"]), "none", kt(p._landing ? [
        "Connu du Landing Performance, pas encore de profil : un profil vide sera créé.",
        "Known from Landing Performance, no profile yet: an empty profile will be created.",
        "Aus Landing Performance bekannt, noch kein Profil: ein leeres Profil wird angelegt.",
        "Conocido por Landing Performance, aún sin perfil: se creará un perfil vacío."
      ] : ["Utilisé par la compagnie, pas encore de profil : un profil vide sera créé.",
        "Used by the company, no profile yet: an empty profile will be created.",
        "Von der Gesellschaft genutzt, noch kein Profil: ein leeres Profil wird angelegt.",
        "Usado por la compañía, aún sin perfil: se creará un perfil vacío."
      ])] : [on ? [kt(["actif", "active", "aktiv", "activo"]), todo].filter(Boolean).join(" · ") : todo || kt(["complet", "complete",
        "vollständig", "completo"
      ]), todo ? "warn" : "", i.missing.join(", ")];
    return `<div class="aircraft-row aircraft-item${on ? " active" : ""}" role="option" tabindex="-1" aria-selected="${on}" data-id="${esc(p.id)}"${p._landingOnly ? ' data-landing="1"' : ""} title="${esc([p.name || p.id, g[2], tip].filter(Boolean).join(" · "))}"><span>${aircraftIcon(p)}</span><span class="ac-name">${esc(p.name || p.id)}</span><span class="ac-type">${esc(p.type || p.icao || p.id)}</span><span class="ac-src">${esc(profileSourceText(p, i))}</span><span class="ac-state ${cls}">${esc(st)}</span></div>`
  };
  const head = `<div class="aircraft-row aircraft-row-head" role="presentation"><span></span><span>${esc(kt(["Appareil", "Aircraft", "Luftfahrzeug", "Aeronave"]))}</span><span>${esc(kt(["Type", "Type", "Muster", "Tipo"]))}</span><span>${esc(kt(["Profil", "Profile", "Profil", "Perfil"]))}</span><span>${esc(kt(["État", "Status", "Status", "Estado"]))}</span></div>`;
  // lien vers la page qui gère les fiches (Carburant : la liste ne crée ni ne modifie rien)
  const manage = PERF_PAGE === "fuel" ? `<a class="aircraft-manage" href="performance_sheets.html">${esc(kt(["Gérer les fiches de performances ↗", "Manage performance sheets ↗", "Leistungsblätter verwalten ↗", "Gestionar las fichas de rendimiento ↗"]))}</a>` : "";
  menu.innerHTML = all.length ? head + [...groups].map(([label, items]) => `<div class="aircraft-group" role="presentation">${esc(label)}</div>` + items.map(([p, g]) => row(p, g)).join("")).join(
      "") + manage : PERF_PAGE === "fuel" ? `<div class="mut" style="padding:8px">${esc(kt(["Aucune fiche de performances.", "No performance sheet.", "Kein Leistungsblatt.", "Ninguna ficha de rendimiento."]))}</div>${manage}` :
    `<div class="mut" style="padding:8px">${esc(kt(["Aucun avion. Importe un profil, choisis le dossier performances ou charge des atterrissages dans le Landing Performance.",
      "No aircraft. Import a profile, choose the performance folder or load landings in Landing Performance.",
      "Kein Flugzeug. Profil importieren, Leistungsordner wählen oder Landungen in Landing Performance laden.",
      "Ningún avión. Importa un perfil, elige la carpeta de rendimiento o carga aterrizajes en Landing Performance."
    ]))}</div>`;
  menu.setAttribute("aria-label", kt(["Choisir l’avion", "Choose the aircraft", "Flugzeug wählen", "Elegir el avión"]));
  /** Rend actif l'appareil d'une rangée (profil vide créé pour un appareil sans profil) et ferme la liste. Clic remplacé
   *  par shared/flight_ui.js (classe aircraft-item : confirmation si le profil courant est modifié). */
  const choose = x => {
    const p = x.dataset.landing ? newProfileFromLanding(x.dataset.id) : state.profiles?.[x.dataset.id];
    if (p) setActive(p, x.dataset.landing ? "avion du Landing Performance" : "cache local");
    closeHeaderMenus();
    $("aircraftCurrent").focus()
  };
  menu.querySelectorAll('[role="option"]').forEach(x => x.onclick = () => choose(x));
  menu.onkeydown = e => {
    const opts = [...menu.querySelectorAll('[role="option"]')],
      i = opts.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      opts[Math.min(opts.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus()
    } else if ((e.key === "Enter" || e.key === " ") && i >= 0) {
      e.preventDefault();
      opts[i].click() // même chemin que le clic (confirmation des modifications non enregistrées)
    } else if (e.key === "Escape") {
      closeHeaderMenus();
      $("aircraftCurrent").focus()
    }
  }
}
// Ouvre le menu des appareils (liste rafraîchie avec le Landing Performance).
$("aircraftCurrent").onclick = e => {
  e.stopPropagation();
  let open = $("aircraftMenu").hidden;
  closeHeaderMenus();
  if (open) {
    listAircraft();
    $("aircraftMenu").hidden = false;
    $("aircraftCurrent").setAttribute("aria-expanded", "true");
    ($("aircraftMenu").querySelector('.aircraft-row.active[role="option"]') || $("aircraftMenu").querySelector('[role="option"]'))
    ?.focus();
    refreshLandingAircraft().then(changed => {
      if (changed && !$("aircraftMenu").hidden) listAircraft()
    })
  }
};
// Ouvre le menu de langue de l'ancien en-tête.
$("languageCurrent").onclick = e => {
  e.stopPropagation();
  let open = $("languageMenu").hidden;
  closeHeaderMenus();
  if (open) {
    $("languageMenu").hidden = false;
    $("languageCurrent").setAttribute("aria-expanded", "true")
  }
};
// Ouvre le menu des préférences.
$("prefsCurrent").onclick = e => {
  e.stopPropagation();
  let open = $("prefsMenu").hidden;
  closeHeaderMenus();
  if (open) {
    $("prefsMenu").hidden = false;
    $("prefsCurrent").setAttribute("aria-expanded", "true")
  }
};
document.querySelectorAll(".lang-item").forEach(b => b.onclick = () => {
  state.uiLanguage = b.dataset.lang;
  applyHeaderPreferences();
  closeHeaderMenus();
  save()
});
// Préférence : affiche / masque les champs du profil.
$("prefsEditorBtn").onclick = () => {
  $("toggleProfileEditor").click();
  applyHeaderPreferences();
  closeHeaderMenus()
};
document.addEventListener("click", e => {
  if (!e.target.closest(".lang-popup,.prefs-popup,.aircraft-popup")) closeHeaderMenus()
});
// ===== Base de performances : un état par type (bloc « Profils de performances », liste d'appareils de l'en-tête) =====
/** Origine d'un profil en clair : OFP SimBrief calibré, SimBrief, Little Navmap, CSV, JSON, saisie ; « aucun profil »
 *  pour un type de la flotte ou du Landing sans profil, suivi de l'estimation de consommation s'il y en a une.
 *  info : profileInfo(p) déjà calculé (facultatif). */
function profileSourceText(p, info) {
  if (p._landingOnly) {
    const i = info || profileInfo(p);
    return i.s.auto ? ktf(["aucun profil — {src}", "no profile — {src}", "kein Profil — {src}", "sin perfil — {src}"], {
      src: ffSourceText(i.s, i.s.auto.kind)
    }) : kt(["aucun profil", "no profile", "kein Profil", "sin perfil"])
  }
  if (p.calibration) return kt(["OFP SimBrief (calibré)", "SimBrief OFP (calibrated)", "SimBrief-OFP (kalibriert)",
    "OFP SimBrief (calibrado)"
  ]);
  if (p.simbriefSnapshot || p.simbrief) return "SimBrief";
  if (p.lnmSource) return "Little Navmap (.lnmperf)";
  const f = String(p.source?.format || "");
  if (/chatgpt/i.test(f)) return "ChatGPT";
  if (/class/i.test(f)) return kt(["estimé par la classe", "estimated from the class", "aus der Klasse geschätzt",
    "estimado por la clase"
  ]);
  if (/csv/i.test(f)) return "CSV";
  if (/json/i.test(f)) return "JSON";
  return kt(["saisie", "manual entry", "manuelle Eingabe", "entrada manual"])
}
/** État d'un profil pour la base de performances et la liste d'appareils. Sortie : { s (cruiseSource), map (lignes de
 *  cartographie), alts (altitudes distinctes de la cartographie), ceil (ft, profil sinon EUROCONTROL), ceilSrc
 *  ("profile" | "apd" | null), missing (données manquantes du profil, nommées dans la langue de la page) }. */
function profileInfo(p) {
  const s = cruiseSource(p),
    apd = apdOf(p),
    ok = v => v !== null && v !== undefined && v !== "" && Number.isFinite(+v),
    map = (p.rpmFuelCurve || []).filter(r => ok(r.rpm) && [r.fuelFlowMin, r.fuelFlowPerHour, r.fuelFlowMax].some(ok)),
    alts = new Set(map.filter(r => ok(r.altFt)).map(r => +r.altFt)),
    [ceil, ceilSrc] = +p.cruise?.ceilingFt > 0 ? [+p.cruise.ceilingFt, "profile"] : +apd?.cruise?.ceilingFL > 0 ? [apd.cruise
      .ceilingFL * 100, "apd"
    ] : [null, null];
  const need = [
    [+p.cruise?.tasKt > 0, ["TAS de croisière", "cruise TAS", "Reise-TAS", "TAS de crucero"]],
    [s.kind === "map" || +p.cruise?.fuelFlowPerHour > 0, ["consommation de croisière", "cruise fuel flow", "Reiseverbrauch",
      "consumo de crucero"
    ]],
    [+p.climb?.iasKt > 0, ["Badin de montée", "climb IAS", "Steig-IAS", "IAS de ascenso"]],
    [Math.abs(+p.climb?.rateFpm) > 0, ["vario de montée", "climb rate", "Steigrate", "régimen de ascenso"]],
    [Math.abs(+p.descent?.rateFpm) > 0, ["vario de descente", "descent rate", "Sinkrate", "régimen de descenso"]],
    [ceil > 0, ["plafond", "ceiling", "Gipfelhöhe", "techo"]]
  ];
  return {
    s,
    map: map.length,
    alts: alts.size,
    ceil,
    ceilSrc,
    missing: p._landingOnly ? [] : need.filter(x => !x[0]).map(x => kt(x[1])),
    // valeurs marquées estimées (réponse ChatGPT) : champs, et lignes de cartographie notées « (ChatGPT) »
    estimated: [...(p.estimatedFields || []).map(profileFieldLabel), ...((p.rpmFuelCurve || []).some(r => /\(ChatGPT\)/.test(r
      .comment || "")) ? [kt(["cartographie moteur", "engine map", "Motorkennfeld", "mapa motor"])] : [])]
  }
}
/** Libellés du bloc « Profils de performances » (titre, présentation, boutons et infobulles) ; écrits s'ils changent. */
function perfProfilesLabels() {
  setText("ppTitle", kt(["Profils de performances", "Performance profiles", "Leistungsprofile", "Perfiles de rendimiento"]));
  setText("ppIntro", kt([
    "La face performances de « Mes appareils » : mêmes appareils, même ordre, même nom ; pour chacun, d’où vient le profil, s’il a une cartographie moteur, ce qui lui manque. Le dossier performances est relu quand il change ailleurs (autre page, autre onglet).",
    "The performance side of “My aircraft”: same aircraft, same order, same name; for each, where the profile comes from, whether it has an engine map, what it lacks. The performance folder is reread when it changes elsewhere (another page or tab).",
    "Die Leistungsseite von „Meine Luftfahrzeuge“: dieselben Luftfahrzeuge, dieselbe Reihenfolge, derselbe Name; für jedes die Herkunft des Profils, ob es ein Motorkennfeld hat, was fehlt. Der Leistungsordner wird neu gelesen, wenn er anderswo geändert wird (andere Seite, anderer Tab).",
    "La cara de rendimiento de «Mis aeronaves»: mismas aeronaves, mismo orden, mismo nombre; para cada una, de dónde viene el perfil, si tiene mapa motor, qué le falta. La carpeta de rendimiento se relee cuando cambia en otro lugar (otra página u otra pestaña)."
  ]));
  const mineHtml = `${KIT.esc(kt(["Appareils", "Aircraft", "Luftfahrzeuge", "Aeronaves"]))} : <a href="../settings/profil.html?base=equipment">${KIT.esc(kt(["Mes appareils", "My aircraft", "Meine Luftfahrzeuge", "Mis aeronaves"]))} ↗</a> — ${KIT.esc(kt(["Paramètres › Mon profil › Appareils et simulateurs (ajouter, retirer, possédé, maîtrisé)", "Settings › My profile › Aircraft and simulators (add, remove, owned, mastered)", "Einstellungen › Mein Profil › Luftfahrzeuge und Simulatoren (hinzufügen, entfernen, besessen, beherrscht)", "Ajustes › Mi perfil › Aeronaves y simuladores (añadir, quitar, poseída, dominada)"]))}`;
  if ($("ppMine") && $("ppMine").innerHTML !== mineHtml) $("ppMine").innerHTML = mineHtml;
  setText("ppAddLbl", kt(["Ajouter un appareil", "Add an aircraft", "Luftfahrzeug hinzufügen", "Añadir una aeronave"]));
  setText("ppSortLbl", kt(["Trier par", "Sort by", "Sortieren nach", "Ordenar por"]));
  const ph = kt(["Chercher un appareil (nom, variante, désignateur, classe, source)",
    "Search an aircraft (name, variant, designator, class, source)",
    "Luftfahrzeug suchen (Name, Variante, Kennung, Klasse, Quelle)", "Buscar una aeronave (nombre, variante, designador, clase, origen)"
  ]);
  if ($("ppSearch") && $("ppSearch").placeholder !== ph) {
    $("ppSearch").placeholder = ph;
    $("ppSearch").setAttribute("aria-label", ph)
  }
  const so = $("ppSort")?.options;
  if (so)[
    ["catégorie", "category", "Kategorie", "categoría"],
    ["nom", "name", "Name", "nombre"],
    ["source", "source", "Quelle", "origen"]
  ].forEach((l, i) => {
    if (so[i].textContent !== kt(l)) so[i].textContent = kt(l)
  });
  setText("ppImportLbl", kt(["Importer…", "Import…", "Importieren…", "Importar…"]));
  setText("ppFolderLbl", kt(["Dossier…", "Folder…", "Ordner…", "Carpeta…"]));
  setText("ppReloadLbl", kt(["Relire", "Reread", "Neu lesen", "Releer"]));
  setText("ppGptLbl", kt(["Demander à ChatGPT", "Ask ChatGPT", "ChatGPT fragen", "Preguntar a ChatGPT"]));
  const tips = {
    ppImport: kt([
      "Fichiers .lnmperf (Little Navmap), JSON (profil ou base exportée), CSV de performances ; un OFP SimBrief JSON est aussi reconnu.",
      "Files: .lnmperf (Little Navmap), JSON (profile or exported database), performance CSV; a SimBrief OFP JSON is recognised too.",
      "Dateien: .lnmperf (Little Navmap), JSON (Profil oder exportierte Datenbank), Leistungs-CSV; ein SimBrief-OFP-JSON wird ebenfalls erkannt.",
      "Archivos .lnmperf (Little Navmap), JSON (perfil o base exportada), CSV de rendimiento; también se reconoce un OFP JSON de SimBrief."
    ]),
    ppFolder: kt(["Choisir le dossier performances et lire ses profils (.json, .lnmperf, .csv).",
      "Choose the performance folder and read its profiles (.json, .lnmperf, .csv).",
      "Leistungsordner wählen und seine Profile lesen (.json, .lnmperf, .csv).",
      "Elegir la carpeta de rendimiento y leer sus perfiles (.json, .lnmperf, .csv)."
    ]),
    ppReload: kt(["Relire les profils du dossier performances déjà choisi.",
      "Reread the profiles of the performance folder already chosen.",
      "Profile des bereits gewählten Leistungsordners neu lesen.", "Releer los perfiles de la carpeta de rendimiento ya elegida."
    ])
  };
  for (const [id, t] of Object.entries(tips))
    if ($(id).title !== t) $(id).title = t
}
let ppTimer = 0;
/** Base de performances redessinée un peu plus tard (plusieurs changements de suite : un seul rendu). */
function renderPerfProfilesSoon() {
  clearTimeout(ppTimer);
  ppTimer = setTimeout(renderPerfProfiles, 50)
}
// « Mes appareils » (Paramètres › Mon profil › Appareils et simulateurs, shared/equipment_editor.js) : la liste du pilote,
// flotte comprise ; ce bloc en est la face performances (mêmes lignes, même ordre, même nom).
let myList = null; // appareils du pilote ; null : pas encore lus
/** Relit « Mes appareils » (chargement, ajout, changement dans un autre onglet), puis redessine le bloc. */
async function refreshMyAircraft() {
  try {
    myList = await window.EquipmentEditor?.myAircraft?.() || [];
  } catch {
    myList = []
  }
  renderPerfProfilesSoon()
}
/** Tri du bloc mémorisé dans ce navigateur (fpPpSort) : « cat » (groupes par catégorie), « name », « source ». */
const ppSortGet = () => {
  const v = localStorage.getItem("fpPpSort");
  return ["cat", "name", "source"].includes(v) ? v : "cat"
};
/** Groupes repliés (catégories), mémorisés dans ce navigateur (fpPpCollapsed). */
const ppCollapsed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem("fpPpCollapsed") || "[]"))
  } catch {
    return new Set()
  }
};
/** Clé d'un type suivie à travers les alias de la base (CL415 → CL2T). */
function aircraftTypeKey(v) {
  const al = window.AIRCRAFT_DB?.__aliases || {};
  let x = aKey(v || "");
  for (let i = 0; i < 5 && al[x] && al[x] !== x; i++) x = aKey(al[x]);
  return x
}
/** Bloc « Profils de performances » : les appareils de « Mes appareils » dans leur ordre (catégorie, puis nom), groupés
 *  par catégorie (en-têtes repliables) ou triés par nom ou par source, puis les profils enregistrés hors de « Mes
 *  appareils » ; sans « Mes appareils » (trigramme non réglé, rien de déclaré) : profils et types de la flotte. Colonnes :
 *  appareil (silhouette, nom, type et classe), performances (source, ou « aucune » et ses trois façons d'en créer),
 *  cartographie moteur, consommation de croisière, plafond, données manquantes, Choisir. Écrit seulement s'il change. */
function renderPerfProfiles() {
  perfProfilesLabels();
  if (PERF_PAGE === "sheets") renderSheetPick();
  syncSbTypeButton();
  const box = $("perfProfiles"),
    E = window.EquipmentEditor;
  if (!box) return;
  E?.css?.();
  if (myList === null && E) {
    myList = [];
    refreshMyAircraft()
  }
  const esc = KIT.esc,
    u = fuelUnit(),
    profiles = Object.values(state.profiles || {}).filter(p => p && typeof p === "object" && String(p.id || p.icao || p.type || p
      .name || "").trim()).map(p => normalize(p)),
    cat = code => E?.categoryOf?.(code) || "other",
    used = new Set(),
    rows = [];
  const db = window.AIRCRAFT_DB || {},
    /** Clé de type d'un profil : le premier de ses codes (OACI, type, identifiant) connu de la base, alias compris ;
     *  sinon le type lu dans son nom (« Ecureuil AS350 B3 » → AS50) ; sinon son premier code. */
    pkey = x => {
      const codes = [x.icao, x.type, x.id].filter(Boolean).map(aircraftTypeKey);
      return codes.find(c => db[c]) || aircraftTypeKey(window.AircraftCatalog?.codeOf?.(x.name) || "") || codes[0] || ""
    },
    myKeys = new Set((myList || []).map(a => aircraftTypeKey(a.code)));
  // appareils du pilote, avec leurs profils (même type, alias compris, ou type lu dans le nom ; nom pour un appareil sans
  // désignateur) : une ligne par profil, ou une ligne « aucune ». Un désignateur déclaré sous plusieurs variantes
  // (CL2T : CL-215T, CL-415) n'a qu'une ligne, celle du type : les performances sont celles du type, pas de notion de
  // variante ici (une seule coche, un seul jeu de boutons)
  const byCode = new Map();
  for (const a of myList || [])(byCode.get(a.code) || byCode.set(a.code, []).get(a.code)).push(a);
  for (const [code, entries] of byCode) {
    const a = entries[0],
      vs = entries.map(e => e.variant).filter(Boolean),
      k = aircraftTypeKey(code),
      match = profiles.filter(x => pkey(x) === k || entries.some(e => aKey(x.name) === aKey(e.name))),
      base = {
        code,
        name: vs.length > 1 ? E?.fullName?.(code) || a.name : a.name, // une variante : son nom ; plusieurs : le type
        category: a.category || cat(code),
        mine: true
      };
    if (!match.length) rows.push({
      ...base,
      p: null
    });
    for (const p of match) {
      used.add(p.id);
      rows.push({
        ...base,
        p,
        note: match.length > 1 ? p.name || p.id : "" // plusieurs profils du même appareil : chacun sous son nom
      })
    }
  }
  // autres profils enregistrés : d'un type de « Mes appareils » (variante restante) ou hors de « Mes appareils » ; sans
  // « Mes appareils » : types de la flotte sans profil aussi
  for (const p of profiles)
    if (!used.has(p.id)) rows.push({
      code: p.icao || p.type || p.id,
      name: p.name || p.id,
      category: cat(p.icao || p.type || p.id),
      p,
      mine: myKeys.has(pkey(p))
    });
  if (!(myList || []).length)
    for (const p of landingOnlyAircraft(profiles).filter(p => p._defa)) rows.push({
      code: p.type || p.icao || p.id,
      name: p.name || p.id,
      category: cat(p.type || p.icao || p.id),
      p: null,
      mine: false,
      fleet: true
    });
  if (!box.dataset.ready) {
    box.dataset.ready = "1";
    box.addEventListener("click", e => {
      const g = e.target.closest("[data-pp-group]");
      if (g) {
        const c = ppCollapsed();
        c.has(g.dataset.ppGroup) ? c.delete(g.dataset.ppGroup) : c.add(g.dataset.ppGroup);
        localStorage.setItem("fpPpCollapsed", JSON.stringify([...c]));
        return renderPerfProfiles()
      }
      const cr = e.target.closest("[data-pp-create]");
      if (cr) return perfCreate(cr.dataset.code, cr.dataset.name, cr.dataset.ppCreate);
      // clic sur une ligne (hors case, lien, bouton) : cet appareil seul coché, donc choisi ; Ctrl / Maj + clic : la
      // coche ou la décoche en gardant les autres (plusieurs cochées : aucun appareil choisi)
      const tr = e.target.closest("tr.pp-row");
      if (!tr || e.target.closest("input, a, button, select, textarea, label")) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) ppSelected.has(tr.dataset.id) ? ppSelected.delete(tr.dataset.id) : ppSelected.add(tr
        .dataset.id);
      else ppSelected = new Set([tr.dataset.id]);
      ppApplySelection()
    });
    // cases de fusion : sélection gardée d'un rendu à l'autre (ppSelected), bouton « Fusionner » mis à jour
    box.addEventListener("change", e => {
      const a = e.target.closest(".pp-sel-all");
      if (a) { // tout cocher / décocher (lignes affichées)
        box.querySelectorAll(".pp-sel").forEach(b => {
          b.checked = a.checked;
          a.checked ? ppSelected.add(b.dataset.id) : ppSelected.delete(b.dataset.id)
        });
        a.indeterminate = false;
        return ppApplySelection()
      }
      const c = e.target.closest(".pp-sel");
      if (!c) return;
      c.checked ? ppSelected.add(c.dataset.id) : ppSelected.delete(c.dataset.id);
      ppApplySelection()
    });
  }
  for (const id of [...ppSelected])
    if (!state.profiles?.[id]) ppSelected.delete(id);
  syncMergeButton();
  if (!rows.length) return setHtml("perfProfiles", `<p class="mut">${esc(kt(["Aucun appareil ni profil : « Ajouter un appareil », importer un profil ou choisir le dossier performances.",
    "No aircraft and no profile: “Add an aircraft”, import a profile or choose the performance folder.",
    "Weder Luftfahrzeug noch Profil: „Luftfahrzeug hinzufügen“, ein Profil importieren oder den Leistungsordner wählen.",
    "Ninguna aeronave ni perfil: «Añadir una aeronave», importar un perfil o elegir la carpeta de rendimiento."
  ]))}</p>`);
  const sortBy = ppSortGet(),
    src = r => r.p ? profileSourceText(r.p) : "",
    Q = aKey($("ppSearch")?.value || ""),
    /** La ligne répond-elle à la recherche (nom, variante, désignateur, classe OACI, source du profil) ? */
    hit = r => !Q || [r.name, r.code, window.AIRCRAFT_DB?.[aKey(r.code)]?.description, src(r) || kt(["aucune", "none", "keine",
      "ninguno"
    ])].some(v => aKey(v || "").includes(Q));
  const allCats = new Set(rows.map(r => r.category)); // groupes présents avant la recherche
  if (Q) {
    const kept = rows.filter(hit);
    rows.length = 0;
    rows.push(...kept)
  }
  setText("ppFound", Q ? ktf(["{n} appareil(s)", "{n} aircraft", "{n} Luftfahrzeug(e)", "{n} aeronave(s)"], {
    n: rows.length
  }) : "");
  byName = (a, b) => String(a.name).localeCompare(String(b.name), "fr", {
      numeric: true
    }),
    CATS = E?.CATEGORIES || ["helico", "turboprop", "jet", "piston", "other"];
  // ordre : « Mes appareils » d'abord (son ordre), puis le reste par catégorie et nom ; tri par nom ou par source : liste à plat
  const ordered = sortBy === "name" ? [...rows].sort(byName) : sortBy === "source" ? [...rows].sort((a, b) => (!a.p - !b.p) || src(a)
    .localeCompare(src(b), "fr") || byName(a, b)) : [...rows].sort((a, b) => CATS.indexOf(a.category) - CATS.indexOf(b.category) || (
    b.mine - a.mine) || byName(a, b));
  const selAll = `<input type="checkbox" class="pp-sel-all" title="${esc(kt(["Tout cocher ou décocher — les profils cochés se fusionnent, s'exportent, s'enregistrent ou se suppriment ensemble",
      "Tick or untick all — ticked profiles are merged, exported, saved or deleted together",
      "Alle an- oder abwählen — angekreuzte Profile werden zusammen zusammengeführt, exportiert, gespeichert oder gelöscht",
      "Marcar o desmarcar todo — los perfiles marcados se fusionan, exportan, guardan o eliminan juntos"
    ]))}" aria-label="${esc(kt(["Tout cocher", "Tick all", "Alle anwählen", "Marcar todo"]))}">`;
  const head = [selAll, kt(["Appareil", "Aircraft", "Luftfahrzeug", "Aeronave"]), kt(["Performances", "Performance", "Leistungen",
    "Rendimiento"
  ]), kt(["Carto.", "Map", "Kennfeld", "Mapa"]), kt(["Conso. croisière", "Cruise flow", "Reiseverbrauch", "Consumo crucero"]), kt([
    "Plafond", "Ceiling", "Gipfelhöhe", "Techo"
  ]), kt(["Manques", "Missing", "Fehlt", "Falta"])];
  /** Cellule « Performances » d'un appareil sans profil : « aucune » et les trois façons d'en créer un. */
  const noneCell = r => {
    const at = how => `data-pp-create="${how}" data-code="${esc(r.code)}" data-name="${esc(r.name)}"`;
    return `<div class="pp-none">${esc(kt(["aucune", "none", "keine", "ninguno"]))}<div class="pp-acts">${simbriefRecordFor(r.code) ? `<button type="button" class="secondary" ${at("simbrief")}>${esc(kt(["Créer depuis SimBrief", "Create from SimBrief", "Aus SimBrief anlegen", "Crear desde SimBrief"]))}</button>` : ""}<button type="button" class="secondary" ${at("gpt")}>${esc(kt(["Demander à ChatGPT", "Ask ChatGPT", "ChatGPT fragen", "Preguntar a ChatGPT"]))}</button><button type="button" class="secondary" ${at("estimate")}>${esc(kt(["Estimer par la classe", "Estimate from the class", "Aus der Klasse schätzen", "Estimar por la clase"]))}</button></div></div>`
  };
  /** Ligne d'un appareil. */
  const row = r => {
    const p = r.p,
      nm = E?.nameCell?.({
        code: r.code,
        name: r.name,
        common: r.common,
        note: r.note || (r.mine || r.fleet ? "" : kt(["pas dans « Mes appareils »", "not in “My aircraft”",
          "nicht in „Meine Luftfahrzeuge“",
          "no está en «Mis aeronaves»"
        ]))
      }) || `<b>${esc(r.name)}</b>`;
    if (!p) return `<tr><td></td><td>${nm}</td><td>${noneCell(r)}</td><td>—</td><td>—</td><td>—</td><td><span class="pp-missing">${esc(kt(["tout le profil", "the whole profile", "das ganze Profil", "todo el perfil"]))}</span></td></tr>`;
    const i = profileInfo(p),
      s = i.s,
      on = active?.id === p.id,
      map = i.map ? `${esc(ktf(["oui ({n})", "yes ({n})", "ja ({n})", "sí ({n})"], {
        n: i.map
      }))}${i.alts > 1 ? `<br><small class="mut">${esc(ktf(["{n} alt.", "{n} alt.", "{n} Höhen", "{n} alt."], {
        n: i.alts
      }))}</small>` : ""}` : esc(kt(["non", "no", "nein", "no"])),
      ff = s.ff > 0 ? `${s.approx ? "≈ " : ""}${fmt(convertFuel(s.ff, p.unit || "kg", u), 0)} ${u}/h<br><small class="mut">${esc(ffSourceText(s))}</small>` : "—",
      ceil = i.ceil ? `${flTxt(i.ceil)}${i.ceilSrc === "apd" ? ` <small class="mut">(EUROCONTROL)</small>` : ""}` : "—",
      estTxt = i.estimated?.length ? ktf(["estimé : {list}", "estimated: {list}", "geschätzt: {list}", "estimado: {list}"], {
        list: i.estimated.join(", ")
      }) : "",
      miss = (i.missing.length ? `<div class="pp-clip pp-missing" title="${esc(i.missing.join(", "))}">${esc(i.missing.join(", "))}</div>` : `<div class="pp-clip pp-ok">${esc(kt(["rien", "nothing", "nichts", "nada"]))}</div>`) +
      (estTxt ? `<div class="pp-clip mut" title="${esc(estTxt)}"><small>${esc(estTxt)}</small></div>` : ""),
      sel = `<input type="checkbox" class="pp-sel" data-id="${esc(p.id)}" title="${esc(kt([
        "Sélection : fusionner, exporter, enregistrer ou supprimer plusieurs profils",
        "Selection: merge, export, save or delete several profiles",
        "Auswahl: mehrere Profile zusammenführen, exportieren, speichern oder löschen",
        "Selección: fusionar, exportar, guardar o eliminar varios perfiles"
      ]))}"${ppSelected.has(p.id) ? " checked" : ""}>`;
    return `<tr class="pp-row${on ? " is-active" : ""}" data-id="${esc(p.id)}"><td>${sel}</td><td>${nm}</td><td>${esc(profileSourceText(p, i))}</td><td>${map}</td><td>${ff}</td><td>${ceil}</td><td>${miss}</td></tr>`
  };
  let body = "";
  if (sortBy === "cat") {
    const shut = ppCollapsed();
    for (const c of CATS) {
      const g = ordered.filter(r => r.category === c);
      if (!g.length && !(Q && allCats.has(c))) continue;
      const closed = Q ? !g.length : shut.has(c); // recherche : groupes avec correspondance dépliés, autres repliés
      body += `<tbody><tr class="pp-group"><th colspan="${head.length}"><button type="button" data-pp-group="${c}" aria-expanded="${!closed}">${closed ? "▸" : "▾"} ${esc(E?.categoryLabel?.(c) || c)} (${g.length})</button></th></tr>${closed ? "" : g.map(row).join("")}</tbody>`
    }
  } else body = `<tbody>${ordered.map(row).join("")}</tbody>`;
  setHtml("perfProfiles", typo(`<table><thead><tr>${head.map((h, i) => `<th>${i ? esc(h) : h}</th>`).join("")}</tr></thead>${body}</table>`));
  // case d'en-tête : cochée si tout l'est, indéterminée si une partie ; colonnes réglables (framework table_resize.js)
  const boxes = [...box.querySelectorAll(".pp-sel")],
    all = box.querySelector(".pp-sel-all");
  if (all) {
    all.checked = boxes.length > 0 && boxes.every(b => b.checked);
    all.indeterminate = !all.checked && boxes.some(b => b.checked);
    all.disabled = !boxes.length
  }
  window.TableResize?.attach(box.querySelector("table"), {
    key: "flightPerfProfilesCols",
    title: kt(["Glisser : largeur de la colonne — double-clic : largeurs par défaut",
      "Drag: column width — double-click: default widths",
      "Ziehen: Spaltenbreite — Doppelklick: Standardbreiten", "Arrastrar: ancho de la columna — doble clic: anchos por defecto"
    ])
  })
}
/** Carburant : ligne « pas de fiche pour cet appareil — ouvrir les Fiches de performances ↗ » (lien ?aircraft=code) en
 *  tête du devis ; vide : ligne masquée. */
function noSheetLine(code) {
  const el = document.getElementById("noSheet");
  if (!el) return;
  el.hidden = !code;
  if (!code) return;
  const name = window.EquipmentEditor?.myName?.(code) || code;
  el.innerHTML = `${KIT.esc(ktf(["Pas de fiche de performances pour {n}", "No performance sheet for {n}", "Kein Leistungsblatt für {n}",
    "Ninguna ficha de rendimiento para {n}"
  ], {
    n: name
  }))} — <a href="performance_sheets.html?aircraft=${encodeURIComponent(code)}">${KIT.esc(kt(["ouvrir les Fiches de performances ↗",
    "open Performance sheets ↗", "Leistungsblätter öffnen ↗", "abrir las Fichas de rendimiento ↗"
  ]))}</a>`
}
/** Crée le profil de performances d'un appareil qui n'en a pas (code : désignateur ou nom ; name : nom affiché), puis
 *  l'ouvre : how = « simbrief » (fiche SimBrief du type), « gpt » (profil vide et panneau « Demander à ChatGPT »),
 *  « estimate » (profil minimal estimé par la classe : consommation, TAS, plafond — shared/fuel_reference.js, champs
 *  marqués estimés). Le profil est rattaché à l'appareil par son type (ou son nom pour un appareil sans désignateur). */
function perfCreate(code, name, how) {
  const db = window.AIRCRAFT_DB || {},
    k = aKey(code || ""),
    rec = db[k] || db[db.__aliases?.[k]],
    icao = rec?.tdesig || (/^[A-Z][A-Z0-9]{1,3}$/.test(k) ? k : ""),
    notify = (m, kind = "warn") => window.AppFramework?.notify?.(m, kind),
    /** Profil vide de l'appareil (identifiant : désignateur, sinon nom). */
    blank = () => normalize({
      id: icao || String(name || code).trim(),
      ...(icao ? {
        icao,
        type: icao
      } : {
        type: String(name || code).trim()
      }),
      name: name || code,
      unit: "kg"
    }),
    /** Profil enregistré, base locale et vues remises à jour, puis profil ouvert. */
    keep = (p, why) => {
      state.profiles[p.id] = p;
      profilesChanged();
      setActive(p, why)
    };
  if (how === "simbrief") {
    const sb = simbriefRecordFor(icao || code);
    if (!sb) return notify(kt(["SimBrief ne connaît pas ce type : « Demander à ChatGPT » ou « Estimer par la classe ».",
      "SimBrief does not know this type: “Ask ChatGPT” or “Estimate from the class”.",
      "SimBrief kennt diesen Typ nicht: „ChatGPT fragen“ oder „Aus der Klasse schätzen“.",
      "SimBrief no conoce este tipo: «Preguntar a ChatGPT» o «Estimar por la clase»."
    ]));
    return keep(profileFromSimbriefType(icao || code, sb), "SimBrief")
  }
  if (how === "gpt") {
    const p = state.profiles?.[blank().id] ? normalize(structuredClone(state.profiles[blank().id])) : blank();
    keep(p, kt(["Mes appareils", "My aircraft", "Meine Luftfahrzeuge", "Mis aeronaves"]));
    openGptPanel({
      id: p.id,
      landing: false
    });
    return $("ppGptPanel")?.scrollIntoView({
      block: "nearest"
    })
  }
  if (how === "estimate") {
    const est = window.FuelReference?.estimate({
      codes: [icao, code, name].filter(Boolean),
      db,
      apd: icao ? window.AIRCRAFT_PERF?.[icao] : null
    });
    if (!est) return notify(icao ? kt(["Classe OACI inconnue pour ce type : « Demander à ChatGPT », ou saisir le profil.",
      "ICAO class unknown for this type: “Ask ChatGPT”, or enter the profile.",
      "ICAO-Klasse für diesen Typ unbekannt: „ChatGPT fragen“ oder das Profil eingeben.",
      "Clase OACI desconocida para este tipo: «Preguntar a ChatGPT» o introducir el perfil."
    ]) : kt([
      "Sans type OACI, pas de classe : rattacher l’appareil à son type (Mes appareils › « Chercher le type »), ou « Demander à ChatGPT ».",
      "Without an ICAO type, no class: link the aircraft to its type (My aircraft › “Find the type”), or “Ask ChatGPT”.",
      "Ohne ICAO-Typ keine Klasse: das Luftfahrzeug seinem Typ zuordnen (Meine Luftfahrzeuge › „Typ suchen“) oder „ChatGPT fragen“.",
      "Sin tipo OACI, no hay clase: vincular la aeronave a su tipo (Mis aeronaves › «Buscar el tipo») o «Preguntar a ChatGPT»."
    ]));
    const p = blank();
    p.cruise = {
      ...p.cruise,
      tasKt: est.tasKt,
      fuelFlowPerHour: est.kgPerHour,
      ...(est.ceilingFt > 0 ? {
        ceilingFt: est.ceilingFt
      } : {})
    };
    p.estimatedFields = ["cruise.tasKt", "cruise.fuelFlowPerHour", ...(est.ceilingFt > 0 ? ["cruise.ceilingFt"] : [])];
    p.source = {
      format: "class-estimate"
    };
    p.description = `${kt(["Estimé par la classe", "Estimated from the class", "Aus der Klasse geschätzt", "Estimado por la clase"])} (${est.basis === "type" ? est.code : est.cls || "?"}${est.wtc ? `, ${est.wtc}` : ""}) — ${est.src || ""}`.trim();
    keep(p, kt(["estimé par la classe", "estimated from the class", "aus der Klasse geschätzt", "estimado por la clase"]));
    return notify(kt([
      "Profil minimal estimé par la classe : consommation, TAS et plafond, marqués « estimé ». À compléter (montée, descente) ou à remplacer par SimBrief, ChatGPT ou un import.",
      "Minimal profile estimated from the class: fuel flow, TAS and ceiling, marked “estimated”. To complete (climb, descent) or replace with SimBrief, ChatGPT or an import.",
      "Minimales Profil aus der Klasse geschätzt: Verbrauch, TAS und Gipfelhöhe, als „geschätzt“ markiert. Zu ergänzen (Steig-, Sinkflug) oder durch SimBrief, ChatGPT oder einen Import zu ersetzen.",
      "Perfil mínimo estimado por la clase: consumo, TAS y techo, marcados como «estimado». Por completar (ascenso, descenso) o sustituir por SimBrief, ChatGPT o una importación."
    ]), "info")
  }
}
// « Ajouter un appareil » : la fenêtre d'ajout de Paramètres (composant commun) ; l'appareil ajouté arrive dans le bloc
// avec « Performances : aucune » et ses trois façons d'en créer
$("ppAdd").onclick = () => window.EquipmentEditor?.addDialog?.(null, a => {
  refreshMyAircraft();
  window.AppFramework?.notify?.(ktf([
    "{n} ajouté à « Mes appareils » : créez ses performances dans sa ligne (SimBrief, ChatGPT ou estimation par la classe).",
    "{n} added to “My aircraft”: create its performance in its row (SimBrief, ChatGPT or estimate from the class).",
    "{n} zu „Meine Luftfahrzeuge“ hinzugefügt: Leistungen in seiner Zeile anlegen (SimBrief, ChatGPT oder Schätzung aus der Klasse).",
    "{n} añadida a «Mis aeronaves»: cree su rendimiento en su fila (SimBrief, ChatGPT o estimación por la clase)."
  ], {
    n: a.name
  }), "ok")
});
$("ppSort").value = ppSortGet();
$("ppSearch").oninput = () => renderPerfProfiles(); // recherche à la frappe
$("ppSort").onchange = () => {
  localStorage.setItem("fpPpSort", $("ppSort").value);
  renderPerfProfiles()
};
// « Mes appareils » changé dans un autre onglet (Paramètres) : bloc relu
window.addEventListener("storage", e => {
  if (/availability/i.test(e.key || "")) refreshMyAircraft()
});
// ===== Base de performances : supprimer, fusionner, profil SimBrief =====
// Supprimer et fusionner retirent des profils de la base locale ; un profil retiré est noté (state.removedProfiles) pour
// que la relecture du dossier performances ne le ramène pas (le fichier du dossier n'est jamais effacé ; un import
// explicite du fichier le ramène). Chaque retrait propose « Annuler » pendant 10 s.
let ppSelected = new Set(); // profils cochés (identifiants) : un seul = l'appareil choisi ; plusieurs = fusion, export…
/** Fiches de performances : une seule ligne cochée = cet appareil choisi (fiche modifiée, panneau ChatGPT) ; aucune ou
 *  plusieurs = aucun appareil choisi. Changement confirmé si la fiche ouverte est modifiée (shared/flight_ui.js). */
function ppApplySelection() {
  const ids = [...ppSelected].filter(id => state.profiles?.[id]),
    p = ids.length === 1 ? state.profiles[ids[0]] : null;
  syncMergeButton();
  if (p ? active?.id === p.id : !active) return renderPerfProfilesSoon();
  if (window.requestAircraftSwitch) window.requestAircraftSwitch(p);
  else if (p) setActive(p, kt(["base de performances", "performance database", "Leistungsdatenbank", "base de rendimiento"]));
  else clearActive(kt(["Aucun appareil choisi", "No aircraft chosen", "Kein Luftfahrzeug gewählt", "Ninguna aeronave elegida"]))
}
/** Fiches de performances : coches remises sur l'appareil choisi (choix par l'en-tête, « Rester » après une
 *  confirmation, fiche créée ou importée). */
function ppSelectionFollowActive() {
  if (PERF_PAGE !== "sheets") return;
  ppSelected.clear();
  if (active && state.profiles?.[active.id]) ppSelected.add(active.id);
  renderPerfProfilesSoon()
}
/** Clé de type d'un profil (code OACI, alias suivis) : deux profils ne se fusionnent que s'ils ont la même. */
function profileTypeKey(p) {
  const k = aKey(p?.icao || p?.type || p?.id || ""),
    al = window.AIRCRAFT_DB?.__aliases || {};
  let x = k;
  for (let i = 0; i < 5 && al[x] && al[x] !== x; i++) x = aKey(al[x]);
  return x
}
/** Boutons de la barre du bloc selon les profils cochés : « Exporter (n) », « Enregistrer dans le dossier (n) » et
 *  « Supprimer (n) » dès un profil, « Fusionner (n) » à partir de deux profils du même type. */
function syncMergeButton() {
  syncRemovedLine();
  const nSel = [...ppSelected].filter(id => state.profiles?.[id]).length;
  for (const [id, lbl, row, rowN] of [
      ["ppExport", "ppExportLbl", ["Exporter", "Export", "Exportieren", "Exportar"],
        ["Exporter ({n})", "Export ({n})", "Exportieren ({n})",
          "Exportar ({n})"
        ]
      ],
      ["ppSaveDir", "ppSaveDirLbl", ["Enregistrer dans le dossier", "Save to the folder", "Im Ordner speichern", "Guardar en la carpeta"],
        [
          "Enregistrer dans le dossier ({n})", "Save to the folder ({n})", "Im Ordner speichern ({n})", "Guardar en la carpeta ({n})"
        ]
      ],
      ["ppDelete", "ppDeleteLbl", ["Supprimer", "Delete", "Löschen", "Eliminar"],
        ["Supprimer ({n})", "Delete ({n})", "Löschen ({n})",
          "Eliminar ({n})"
        ]
      ]
    ]) {
    setText(lbl, nSel ? ktf(rowN, {
      n: nSel
    }) : kt(row));
    const b = $(id);
    if (b && b.disabled !== !nSel) b.disabled = !nSel
  }
  const b = $("ppMerge");
  if (!b) return;
  const list = [...ppSelected].map(id => state.profiles?.[id]).filter(Boolean),
    oneType = list.length > 0 && new Set(list.map(profileTypeKey)).size === 1,
    same = oneType && (list.length > 1 || !!simbriefRecordFor(list[0].type || list[0].icao || list[0].id)),
    label = list.length ? ktf(["Fusionner ({n})", "Merge ({n})", "Zusammenführen ({n})", "Fusionar ({n})"], {
      n: list.length
    }) : kt(["Fusionner", "Merge", "Zusammenführen", "Fusionar"]),
    tip = list.length > 1 && !same ? kt(["Les profils cochés ne sont pas du même type : rien à fusionner.",
      "The ticked profiles are not of the same type: nothing to merge.",
      "Die angekreuzten Profile sind nicht vom selben Typ: nichts zusammenzuführen.",
      "Los perfiles marcados no son del mismo tipo: nada que fusionar."
    ]) : kt([
      "Cocher au moins deux profils du même type (case devant le nom), ou un seul si SimBrief connaît le type (fusion avec sa fiche), puis Fusionner.",
      "Tick at least two profiles of the same type (box before the name), or a single one if SimBrief knows the type (merge with its record), then Merge.",
      "Mindestens zwei Profile desselben Typs ankreuzen (Kästchen vor dem Namen), oder nur eines, wenn SimBrief den Typ kennt (Zusammenführen mit seinem Eintrag), dann Zusammenführen.",
      "Marcar al menos dos perfiles del mismo tipo (casilla delante del nombre), o uno solo si SimBrief conoce el tipo (fusión con su ficha), y después Fusionar."
    ]);
  setText("ppMergeLbl", label);
  if (b.disabled !== !same) b.disabled = !same;
  if (b.title !== tip) b.title = tip
}
/** Notification avec un bouton « Annuler » actif 10 s ; undo() remet les choses en l'état. */
function notifyUndo(message, undo) {
  const item = window.AppFramework?.notify?.(message, "ok", {
    timeout: 10000
  });
  if (!item) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "secondary";
  b.textContent = kt(["Annuler", "Undo", "Rückgängig", "Deshacer"]);
  b.onclick = () => {
    item.remove();
    undo()
  };
  item.insertBefore(b, item.lastElementChild)
}
/** Base locale enregistrée et vues redessinées après un changement de profils (actif repris s'il existe encore). */
function profilesChanged() {
  save();
  syncAircraftPicker();
  renderPerfProfilesSoon();
  syncSbTypeButton();
  completeProfileTypes()
}
/** Types des profils sans fiche sur ce poste (profil ChatGPT, SimBrief, fichier ou estimé d'un type que la base ne
 *  connaît pas encore, EPIC par exemple) : fiche complétée par le lanceur (passe courte), tableau redessiné ensuite. */
function completeProfileTypes() {
  window.EquipmentEditor?.completeTypes?.(Object.values(state.profiles || {}).map(p => p?.icao || p?.type), () =>
    renderPerfProfilesSoon())
}
/** Retire les profils ids de la base locale, puis du dossier performances (removeFromPerfFolder) ; actif retiré : plus
 *  d'actif. Un profil resté dans un fichier du dossier (écriture impossible, CSV à plusieurs profils) est noté
 *  (state.removedProfiles) jusqu'à la prochaine relecture choisie (« Dossier… », « Relire », « Restaurer »). Un seul
 *  message ; « Annuler » (10 s) remet les profils, les fichiers du dossier, l'actif et ce que fait extraUndo. */
async function removeProfiles(ids, message, extraUndo) {
  const kept = ids.map(id => [id, state.profiles?.[id]]).filter(([, p]) => p),
    wasActive = active && ids.includes(active.id) ? active.id : null;
  state.removedProfiles ||= {};
  for (const [id] of kept) {
    delete state.profiles[id];
    state.removedProfiles[id] = new Date().toISOString();
    ppSelected.delete(id)
  }
  if (wasActive) clearActive(message);
  profilesChanged();
  let folder = null;
  try {
    folder = await removeFromPerfFolder(kept.map(([id]) => id))
  } catch {
    folder = {
      unwritable: true
    }
  }
  // marque gardée seulement pour un profil resté dans un fichier du dossier
  for (const [id] of kept)
    if (!folder?.unwritable && !folder?.kept?.includes(id)) delete state.removedProfiles[id];
  save();
  syncRemovedLine();
  const files = folder?.done ? [...new Set(folder.done.values())] : [],
    extra = [files.length ? ktf(["Retiré aussi du dossier « {d} » : {list}.", "Also removed from the “{d}” folder: {list}.",
      "Auch aus dem Ordner „{d}“ entfernt: {list}.", "Retirado también de la carpeta «{d}»: {list}."
    ], {
      d: folder.dir,
      list: files.join(", ")
    }) : "", folder?.kept?.length ? ktf([
      "Encore dans un fichier du dossier (CSV à plusieurs profils) : {list} — ils reviendront à la prochaine relecture.",
      "Still in a folder file (CSV with several profiles): {list} — they will come back at the next reread.",
      "Noch in einer Datei des Ordners (CSV mit mehreren Profilen): {list} — sie kommen beim nächsten Neulesen zurück.",
      "Aún en un archivo de la carpeta (CSV con varios perfiles): {list} — volverán en la próxima relectura."
    ], {
      list: folder.kept.join(", ")
    }) : "", folder?.unwritable ? kt([
      "Dossier performances non accessible en écriture : le(s) profil(s) qui y sont reviendront à la prochaine relecture.",
      "Performance folder not writable: the profile(s) in it will come back at the next reread.",
      "Leistungsordner nicht beschreibbar: die Profile darin kommen beim nächsten Neulesen zurück.",
      "Carpeta de rendimiento no escribible: los perfiles que contiene volverán en la próxima relectura."
    ]) : ""].filter(Boolean);
  notifyUndo([message, ...extra].join("\n"), async () => {
    if (folder?.ops?.length) await restorePerfFolder(folder);
    for (const [id, p] of kept) {
      state.profiles[id] = p;
      delete state.removedProfiles[id]
    }
    extraUndo?.();
    if (wasActive && state.profiles[wasActive]) setActive(state.profiles[wasActive], kt(["suppression annulée", "deletion undone",
      "Löschen rückgängig gemacht", "eliminación deshecha"
    ]));
    profilesChanged();
    syncRemovedLine()
  })
}
/** Dossier performances accessible en écriture (autorisation demandée si ask) ; { h } ; { unwritable } si un dossier est
 *  choisi sans écriture permise ; null sans dossier. */
async function perfDirWritable(ask = true) {
  let h = dirHandle;
  if (!h && window.FileAccess) try {
    h = await window.FileAccess.get("__perf")
  } catch {
    h = null
  }
  if (!h) return null;
  try {
    if ((await h.queryPermission?.({
        mode: "readwrite"
      })) === "granted" || ask && (await h.requestPermission?.({
        mode: "readwrite"
      })) === "granted") return {
      h
    }
  } catch {
    /* autorisation refusée */
  }
  return {
    unwritable: true
  }
}
/** Fichiers de profils du dossier h : [{ name, text, kind ("db" : base exportée, "csv", "single"), ids }] (fichiers
 *  illisibles ignorés ; identifiants calculés comme à la lecture du dossier). */
async function perfFolderIndex(h) {
  const out = [];
  for await (const [name, fh] of h.entries()) {
    const low = name.toLowerCase();
    if (fh.kind !== "file" || !/\.(json|lnmperf|csv)$/.test(low)) continue;
    try {
      const text = await (await fh.getFile()).text();
      let kind = "single",
        ids;
      if (low.endsWith(".lnmperf")) ids = [parseLnmperf(text, name).id];
      else if (low.endsWith(".csv")) {
        kind = "csv";
        ids = parsePerformanceCsvEnriched(text, name).map(p => p.id)
      } else {
        const obj = JSON.parse(text);
        if (obj?.schema === "flight-performance-db/v1" && Array.isArray(obj.profiles)) kind = "db";
        ids = profilesFromJson(obj, name).map(p => p.id)
      }
      out.push({
        name,
        text,
        kind,
        ids
      })
    } catch {
      /* fichier illisible ou d'un autre format : ignoré */
    }
  }
  return out
}
/** Écrit text dans le fichier name du dossier h (créé au besoin). */
async function writePerfFile(h, name, text) {
  const w = await (await h.getFileHandle(name, {
    create: true
  })).createWritable();
  await w.write(text);
  await w.close()
}
/** Nom libre dans le dossier h à partir de name (name, puis name.2, name.3…). */
async function freePerfName(h, name) {
  for (let i = 1;; i++) {
    const n = i === 1 ? name : `${name}.${i}`;
    try {
      await h.getFileHandle(n)
    } catch {
      return n
    }
  }
}
/** Retire du dossier performances les profils ids : base exportée (.fpdb.json…) réécrite sans eux ; fichier d'un seul
 *  profil, ou CSV dont tous les profils partent, renommé .bak (contenu gardé, plus relu) ; CSV dont d'autres profils
 *  restent : laissé tel quel (ids dans kept). Retour : { ops (pour restorePerfFolder), done (id → fichier), kept, dir },
 *  { unwritable } si le dossier n'est pas accessible en écriture, null sans dossier. */
async function removeFromPerfFolder(ids) {
  if (!ids.length) return null;
  const d = await perfDirWritable(true);
  if (!d?.h) return d;
  const h = d.h,
    want = new Set(ids),
    ops = [],
    done = new Map(),
    kept = [];
  for (const f of await perfFolderIndex(h)) {
    const hit = f.ids.filter(id => want.has(id));
    if (!hit.length) continue;
    try {
      let label = f.name;
      if (f.kind === "db") {
        const obj = JSON.parse(f.text);
        obj.profiles = obj.profiles.filter(p => !want.has(normalize(structuredClone(p), f.name).id));
        await writePerfFile(h, f.name, JSON.stringify(obj, null, 2));
        ops.push({
          kind: "write",
          name: f.name,
          text: f.text
        })
      } else if (f.ids.every(id => want.has(id))) {
        const bak = await freePerfName(h, f.name + ".bak");
        await writePerfFile(h, bak, f.text);
        await h.removeEntry(f.name);
        ops.push({
          kind: "bak",
          name: f.name,
          bak,
          text: f.text
        });
        label = `${f.name} → ${bak}`
      } else {
        kept.push(...hit);
        continue
      }
      for (const id of hit) done.set(id, label)
    } catch {
      kept.push(...hit)
    }
  }
  lastPerfRead = Date.now(); // ces changements du dossier sont les nôtres : pas de relecture
  return {
    ops,
    done,
    kept,
    dir: h.name,
    h
  }
}
/** « Annuler » d'un retrait : fichiers du dossier remis comme avant (base réécrite, .bak renommé). */
async function restorePerfFolder(folder) {
  try {
    for (const op of [...folder.ops].reverse()) {
      await writePerfFile(folder.h, op.name, op.text);
      if (op.kind === "bak") await folder.h.removeEntry(op.bak)
    }
    lastPerfRead = Date.now()
  } catch (e) {
    window.AppFramework?.notify?.(window.AppFramework?.explain?.(e, kt(["Restauration du dossier performances",
      "Restoring the performance folder", "Wiederherstellen des Leistungsordners", "Restauración de la carpeta de rendimiento"
    ])) || e.message, "err")
  }
}
/** Phrase de la confirmation de suppression : fichiers du dossier d'où les profils ids seront aussi retirés (dossier lu
 *  sans demander d'autorisation), sinon la règle en une phrase. */
async function perfWhereText(ids) {
  let h = dirHandle;
  if (!h && window.FileAccess) try {
    h = await window.FileAccess.get("__perf")
  } catch {
    h = null
  }
  if (!h) return "";
  let files = [];
  try {
    if ((await h.queryPermission?.({
        mode: "read"
      })) === "granted") files = (await perfFolderIndex(h)).filter(f => f.ids.some(id => ids.includes(id))).map(f => f.kind === "db" ?
      ktf(["{f} (profil retiré du fichier)", "{f} (profile removed from the file)", "{f} (Profil aus der Datei entfernt)",
        "{f} (perfil retirado del archivo)"
      ], {
        f: f.name
      }) : f.kind === "csv" && !f.ids.every(id => ids.includes(id)) ? ktf(["{f} (CSV à plusieurs profils : laissé tel quel)",
        "{f} (CSV with several profiles: left as is)", "{f} (CSV mit mehreren Profilen: unverändert)",
        "{f} (CSV con varios perfiles: sin cambios)"
      ], {
        f: f.name
      }) : ktf(["{f} (renommé {f}.bak)", "{f} (renamed {f}.bak)", "{f} (umbenannt in {f}.bak)", "{f} (renombrado {f}.bak)"], {
        f: f.name
      }));
    else return "\n" + kt([
      "S’ils sont dans le dossier performances, ils en seront aussi retirés (base réécrite sans eux, ou fichier renommé .bak).",
      "If they are in the performance folder, they will be removed from it too (database rewritten without them, or file renamed .bak).",
      "Wenn sie im Leistungsordner liegen, werden sie auch dort entfernt (Datenbank ohne sie neu geschrieben oder Datei in .bak umbenannt).",
      "Si están en la carpeta de rendimiento, también se retirarán de ella (base reescrita sin ellos, o archivo renombrado .bak)."
    ])
  } catch {
    return ""
  }
  return files.length ? "\n" + ktf(["Ils seront aussi retirés du dossier « {d} » : {list}.",
    "They will also be removed from the “{d}” folder: {list}.",
    "Sie werden auch aus dem Ordner „{d}“ entfernt: {list}.", "También se retirarán de la carpeta «{d}»: {list}."
  ], {
    d: h.name,
    list: files.join(", ")
  }) : ""
}
/** Ligne d'état « n profil(s) retiré(s) encore dans le dossier — Restaurer » (marques state.removedProfiles) ;
 *  « Restaurer » efface les marques et relit le dossier. */
function syncRemovedLine() {
  const el = $("ppRemoved");
  if (!el) return;
  const n = Object.keys(state.removedProfiles || {}).length;
  if (el.hidden === !n && el.dataset.n === String(n)) return;
  el.dataset.n = String(n);
  el.hidden = !n;
  if (!n) return el.replaceChildren();
  const b = Object.assign(document.createElement("button"), {
    type: "button",
    className: "ghost",
    textContent: kt(["Restaurer", "Restore", "Wiederherstellen", "Restaurar"])
  });
  b.onclick = () => {
    state.removedProfiles = {};
    save();
    syncRemovedLine();
    reloadPerfFolder(true)
  };
  el.replaceChildren(ktf(["{n} profil(s) retiré(s) encore dans le dossier — ", "{n} removed profile(s) still in the folder — ",
    "{n} entfernte(s) Profil(e) noch im Ordner — ", "{n} perfil(es) retirado(s) aún en la carpeta — "
  ], {
    n
  }), b)
}
/** « Supprimer (n) » de la barre : profils cochés, une confirmation et un seul message pour le lot (« Annuler » 10 s). */
async function deleteSelectedAsk() {
  const list = [...ppSelected].map(id => state.profiles?.[id]).filter(Boolean);
  if (list.length < 2) return list.length && deleteProfileAsk(list[0].id);
  const names = list.map(p => p.name || p.id).join(", ");
  if (!await window.AppFramework.ask(ktf(["Supprimer {n} profils ({list}) ?", "Delete {n} profiles ({list})?",
      "{n} Profile löschen ({list})?",
      "¿Eliminar {n} perfiles ({list})?"
    ], {
      n: list.length,
      list: names
    }) + await perfWhereText(list.map(p => p.id)), {
      danger: true,
      ok: kt(["Supprimer", "Delete", "Löschen", "Eliminar"])
    })) return;
  removeProfiles(list.map(p => p.id), ktf(["{n} profils supprimés.", "{n} profiles deleted.", "{n} Profile gelöscht.",
    "{n} perfiles eliminados."
  ], {
    n: list.length
  }))
}
/** « Supprimer cet avion » (fiche du profil actif) ou un seul profil coché : confirmation, puis retrait avec « Annuler »
 *  10 s. */
async function deleteProfileAsk(id) {
  const p = state.profiles?.[id];
  if (!p) return;
  const label = p.name || p.id;
  if (!await window.AppFramework.ask(ktf(["Supprimer le profil « {p} » ?", "Delete the profile “{p}”?", "Profil „{p}“ löschen?",
      "¿Eliminar el perfil «{p}»?"
    ], {
      p: label
    }) + await perfWhereText([id]), {
      danger: true,
      ok: kt(["Supprimer", "Delete", "Löschen", "Eliminar"])
    })) return;
  removeProfiles([id], ktf(["Profil supprimé : {p}.", "Profile deleted: {p}.", "Profil gelöscht: {p}.", "Perfil eliminado: {p}."], {
    p: label
  }))
}
/** Date la plus récente connue d'un profil (modification, import, OFP SimBrief, calibration) en ms ; 0 si aucune. */
function profileWhen(p) {
  const d = v => Date.parse(v || "") || 0;
  return Math.max(d(p?.updatedAt), d(p?.source?.importedAt), d(p?.simbriefSnapshot?.fetchedAt), d(p?.calibration?.at), d(p?.calibration
    ?.appliedAt))
}
/** Valeurs renseignées d'un profil à plat : { « cruise.tasKt » : valeur… } (identifiants, unité, sources et table RPM à
 *  part). */
function profileLeaves(p, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(p || {})) {
    if (SKIP_MERGE_KEYS.has(k) || k === "rpmFuelCurve" || k.startsWith("_")) continue;
    const path = prefix + k;
    if (v && typeof v === "object" && !Array.isArray(v)) profileLeaves(v, path + ".", out);
    else if (!isBlankValue(v)) out[path] = JSON.stringify(v)
  }
  return out
}
/** Libellé d'un champ de profil (PROFILE_FIELDS : « Croisière · TAS (kt) »), sinon son chemin. */
function profileFieldLabel(path) {
  const f = PROFILE_FIELDS.find(x => x[2] === path);
  return f ? `${f[0]} · ${f[1]}` : path
}
/** Fenêtre de choix dans la page : message, champ de texte facultatif (input : valeur initiale), case facultative (check :
 *  libellé, cochée d'avance), zone facultative extra(checked, value, ui) → nœud, redessinée quand la case change
 *  (aperçu ; ui.setOk(libellé, grisé) règle le bouton principal), fenêtre large (wide), un bouton par choix [clé, libellé] et « Annuler ». Promesse :
 *  { key, value, checked } ou null (Échap, Annuler, clic à côté). */
function choose(message, choices, {
  input,
  check,
  extra,
  wide
} = {}) {
  return new Promise(resolve => {
    const d = document.createElement("dialog"),
      p = document.createElement("p"),
      foot = document.createElement("footer"),
      field = input !== undefined ? Object.assign(document.createElement("input"), {
        type: "text",
        value: input
      }) : null,
      box = check ? Object.assign(document.createElement("input"), {
        type: "checkbox",
        checked: true
      }) : null,
      boxLabel = box ? document.createElement("label") : null,
      area = extra ? document.createElement("div") : null,
      ui = {
        // libellé et état du bouton principal (aperçu : nombre de données reprises)
        setOk: (label, disabled) => {
          const b = foot.querySelector(".primary");
          if (!b) return;
          b.textContent = label;
          b.disabled = !!disabled
        }
      },
      paint = () => area?.replaceChildren(extra(!!box?.checked, field ? field.value.trim() : "", ui)),
      done = r => {
        d.close();
        d.remove();
        resolve(r)
      };
    window.AppFramework?.dialogCss?.(); // fenêtre habillée par le socle (fond et encre du design)
    d.className = "repo-ask pp-choice" + (wide ? " pp-wide" : "");
    d.setAttribute("data-no-i18n", "");
    p.textContent = message;
    for (const [key, label, primary] of [...choices, ["", kt(["Annuler", "Cancel", "Abbrechen", "Cancelar"])]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = key ? primary ? "primary" : "secondary" : "ghost";
      b.textContent = label;
      b.onclick = () => done(key ? {
        key,
        value: field ? field.value.trim() : "",
        checked: !!box?.checked
      } : null);
      foot.append(b)
    }
    if (boxLabel) boxLabel.append(box, check);
    if (box) box.onchange = paint;
    paint();
    d.append(p, ...(field ? [field] : []), ...(boxLabel ? [boxLabel] : []), ...(area ? [area] : []), foot);
    d.addEventListener("cancel", e => {
      e.preventDefault();
      done(null)
    });
    d.addEventListener("click", e => {
      if (e.target === d) done(null)
    });
    document.body.append(d);
    d.showModal();
    (field || foot.querySelector(".primary") || foot.firstChild)?.focus()
  })
}
/** Fiche SimBrief du type comme source de fusion : profil virtuel « <type> — SimBrief », daté de sa récupération
 *  (simbrief.fetched, sinon date de la passe des bases), carburant converti dans l'unité unit ; null si SimBrief ne
 *  connaît pas le type. */
function simbriefMergeSource(code, unit) {
  const sb = simbriefRecordFor(code);
  if (!sb) return null;
  let p = profileFromSimbriefType(code, sb);
  const when = sb.fetched || window.AIRCRAFT_PERF?.__meta?.generated || "";
  p.updatedAt = when;
  p.source = {
    ...p.source,
    importedAt: when
  };
  if (unit && unit !== p.unit) p = Object.assign(fuelConvertedCopy(p, p.unit, unit, ["kg", "lb"].includes(unit)), {
    unit
  });
  delete p.simbrief; // marque et fiche brute d'un profil SimBrief : pas des valeurs à fusionner
  delete p.simbriefType;
  p._simbriefSource = true;
  return p
}
/** Libellé d'une source de fusion : « nom » (source), avec la date de la fiche SimBrief. */
function mergeSourceName(p) {
  if (p._gptSource) return ktf(["« ChatGPT » (réponse du {d})", "“ChatGPT” (answer of {d})", "„ChatGPT“ (Antwort vom {d})",
    "«ChatGPT» (respuesta del {d})"
  ], {
    d: new Date(p.updatedAt || Date.now()).toLocaleDateString()
  });
  return p._simbriefSource ? ktf(["« {p} » (fiche SimBrief du {d})", "“{p}” (SimBrief record of {d})", "„{p}“ (SimBrief-Eintrag vom {d})",
    "«{p}» (ficha SimBrief del {d})"
  ], {
    p: p.name,
    d: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"
  }) : `« ${p.name || p.id} » (${profileSourceText(normalize(structuredClone(p)))})`
}
/** Réunit des sources (profils, fiche SimBrief virtuelle) dans le profil keeper : champ par champ, la valeur du plus
 *  récent qui l'a (le plus récent sert de base, les autres comblent ses manques dans l'ordre de leur date), table RPM
 *  réunie ; keeper garde son identifiant, son nom (ou name), son unité, sa source et sa description, complétée de la
 *  liste des sources. Rien n'est enregistré (aperçu d'abord) ; retour { target, before, base, took, names, origin }
 *  (origin : chemin du champ → source retenue). */
function mergeProfileSources(keeper, sources, name) {
  const recent = [...sources].sort((a, b) => profileWhen(b) - profileWhen(a)),
    before = structuredClone(keeper),
    names = recent.map(mergeSourceName).join(", "),
    target = normalize(structuredClone(recent[0])),
    took = [];
  if (recent[0] !== keeper) {
    // base plus récente que le profil gardé : son identité reprend le dessus, ses valeurs comblent les manques ensuite
    for (const k of ["simbrief", "simbriefType", "_simbriefSource", "_gptSource", "lnmSource", "mergedProfileIds"]) delete target[k];
    Object.assign(target, {
      id: keeper.id,
      name: keeper.name,
      unit: keeper.unit || target.unit,
      source: structuredClone(keeper.source),
      description: keeper.description || ""
    });
    for (const k of ["simbrief", "simbriefType", "lnmSource"])
      if (keeper[k] !== undefined) target[k] = structuredClone(keeper[k])
  }
  const origin = {},
    kl = profileLeaves(keeper);
  for (const [k, v] of Object.entries(profileLeaves(target))) origin[k] = mergeSourceShort(kl[k] === v ? keeper : recent[0]);
  if (recent[0] !== keeper) {
    // base plus récente : ce qu'elle change dans le profil gardé est « repris » d'elle
    const fromBase = Object.keys(origin).filter(k => k !== "updatedAt" && origin[k] === mergeSourceShort(recent[0]) && origin[k] !==
      mergeSourceShort(
        keeper));
    if (fromBase.length) took.push(`${recent[0].name || recent[0].id} : ${fromBase.map(profileFieldLabel).join(", ")}`)
  }
  for (const p of recent.slice(1)) {
    const was = profileLeaves(target),
      rows = (target.rpmFuelCurve || []).length;
    fillProfileGaps(target, p);
    const now = profileLeaves(target),
      fresh = Object.keys(now).filter(k => !(k in was)),
      fields = fresh.map(profileFieldLabel),
      added = (target.rpmFuelCurve || []).length - rows;
    for (const k of fresh) origin[k] = mergeSourceShort(p);
    if (fields.length || added) took.push(`${p.name || p.id} : ${[...fields, ...(added ? [ktf(["cartographie +{n} ligne(s)",
      "engine map +{n} row(s)", "Motorkennfeld +{n} Zeile(n)", "mapa motor +{n} fila(s)"
    ], {
      n: added
    })] : [])].join(", ")}`)
  }
  // champs estimés : ceux qui viennent d'une source qui les disait estimés ; références (ChatGPT) de toutes les sources
  const est = recent.flatMap(x => (x.estimatedFields || []).filter(k => origin[k] === mergeSourceShort(x))),
    refs = recent.flatMap(x => x.gptSources || []);
  if (est.length) target.estimatedFields = [...new Set(est)];
  else delete target.estimatedFields;
  if (refs.length) target.gptSources = refs.filter((x, i) => refs.findIndex(y => JSON.stringify(y) === JSON.stringify(x)) === i);
  target.name = name || keeper.name || target.name;
  target.updatedAt = new Date().toISOString();
  target.mergedProfileIds = [...new Set([...(target.mergedProfileIds || []), ...recent.filter(p => p.id !== keeper.id && !p
    ._simbriefSource).map(p => p.id)])];
  return {
    target,
    before,
    base: recent[0],
    took,
    names,
    origin,
    // notes et sources d'une réponse ChatGPT, gardées dans la description (finishMerge)
    notes: recent.filter(x => x._gptSource && x.description && x !== keeper).map(x => `ChatGPT — ${x.description}`)
  }
}
/** Profil after où les données décochées de l'aperçu (sel.skip : chemins de champs, sel.skipCurve : clés de lignes de
 *  cartographie) reprennent leur valeur de before ; champs estimés recalculés en conséquence. */
function pickChanges(before, after, diff, sel) {
  const out = structuredClone(after),
    b = normalize(structuredClone(before || {}));
  for (const path of sel.skip) {
    const v = pathGet(b, path);
    pathSet(out, path, v === undefined ? null : structuredClone(v))
  }
  if (sel.skipCurve.size) {
    const old = new Map((b.rpmFuelCurve || []).map(r => [curveKey(r), r]));
    out.rpmFuelCurve = (out.rpmFuelCurve || []).flatMap(r => {
      const k = curveKey(r);
      if (!sel.skipCurve.has(k)) return [r];
      return old.has(k) ? [structuredClone(old.get(k))] : [] // remplacée : l'ancienne revient ; ajoutée : retirée
    })
  }
  const est = [...(after.estimatedFields || []).filter(k => !sel.skip.has(k)), ...(b.estimatedFields || []).filter(k => sel.skip.has(k))];
  if (est.length) out.estimatedFields = [...new Set(est)];
  else delete out.estimatedFields;
  return out
}
/** Ce qui a été repris (champs cochés par source, lignes de cartographie cochées), pour la note et la notification. */
function takenList(diff, sel) {
  const by = new Map();
  for (const r of diff.rows)
    if (r.changed && !sel.skip.has(r.path)) by.set(r.src || "—", [...(by.get(r.src || "—") || []), r.label]);
  const out = [...by].map(([src, labels]) => `${src} : ${labels.join(", ")}`),
    add = diff.curve.filter(c => c.kind === "added" && !sel.skipCurve.has(c.key)).length,
    rep = diff.curve.filter(c => c.kind === "replaced" && !sel.skipCurve.has(c.key)).length;
  if (add || rep) out.push(ktf(["cartographie moteur : {a} ligne(s) ajoutée(s), {r} remplacée(s)",
    "engine map: {a} row(s) added, {r} replaced", "Motorkennfeld: {a} Zeile(n) hinzugefügt, {r} ersetzt",
    "mapa motor: {a} fila(s) añadida(s), {r} sustituida(s)"
  ], {
    a: add,
    r: rep
  }));
  return out
}
/** Termine une fusion après le choix des données : profil retenu (pickChanges), note de fusion qui liste seulement ce qui
 *  a été repris, notes de ChatGPT ; res.target et res.took mis à jour. Retour : res. */
function finishMerge(res, diff, sel) {
  const t = pickChanges(res.before, res.target, diff, sel),
    took = takenList(diff, sel);
  t.description = [t.description, took.length ? ktf(["Fusion du {d} — repris : {list}.", "Merged on {d} — taken: {list}.",
    "Zusammengeführt am {d} — übernommen: {list}.", "Fusionado el {d} — tomado: {list}."
  ], {
    d: new Date().toLocaleDateString(),
    list: took.join(" ; ")
  }) : "", ...(res.notes || [])].filter(Boolean).join("\n");
  res.target = t;
  res.took = took;
  return res
}
/** Clé de rapprochement d'une ligne de cartographie (régime au millième, altitude) ; null sans régime. */
function curveKey(r) {
  return r && r.rpm !== null && r.rpm !== "" && Number.isFinite(Number(r.rpm)) ? `${Math.round(Number(r.rpm) * 1000)}@${r.altFt ?? ""}` :
    null
}
/** Nom court d'une source de fusion (colonne « Source » de l'aperçu). */
function mergeSourceShort(p) {
  return p._simbriefSource ? "SimBrief" : p._gptSource ? "ChatGPT" : p.name || p.id
}
/** Écart entre deux profils pour l'aperçu : champs { path, label, old, now, src, changed } (date de modification et
 *  fiche SimBrief brute à part ; src : origin[chemin], sinon defaultSrc pour un champ qui change), lignes de cartographie
 *  ajoutées ou remplacées { key, kind, label, old, now }, nombre de changements. */
function profileDiff(before, after, origin = {}, defaultSrc = "") {
  const skip = k => k === "updatedAt" || k === "simbrief" || k.startsWith("simbriefType."),
    a = profileLeaves(before ? normalize(structuredClone(before)) : {}),
    b = profileLeaves(after),
    rows = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !skip(k)).map(k => ({
      path: k,
      label: profileFieldLabel(k),
      old: a[k],
      now: b[k],
      changed: a[k] !== b[k],
      src: origin[k] || (a[k] !== b[k] ? defaultSrc : "")
    })),
    plain = r => JSON.stringify(r, (k, v) => k.startsWith("_") ? undefined : v),
    was = new Map((before?.rpmFuelCurve || []).map(r => [curveKey(r), r])),
    ff = r => r ? `${Math.round(Number(r.fuelFlowPerHour) * 10) / 10}` : "—",
    curve = [];
  for (const r of after?.rpmFuelCurve || []) {
    const k = curveKey(r);
    if (k === null) continue;
    const o = was.get(k);
    if (o && plain(o) === plain(r)) continue;
    curve.push({
      key: k,
      kind: o ? "replaced" : "added",
      label: `${r.rpm}${r.altFt !== null && r.altFt !== undefined && r.altFt !== "" ? ` @ ${r.altFt} ft` : ""}${r.phaseLabel ? ` (${r.phaseLabel})` : ""}`,
      old: o ? ff(o) : "—",
      now: ff(r)
    })
  }
  const added = curve.filter(c => c.kind === "added").length;
  return {
    rows,
    curve,
    added,
    replaced: curve.length - added,
    changed: rows.filter(r => r.changed).length + curve.length
  }
}
/** Libellé du bouton de validation selon les données cochées : « Fusionner (7 champs, 2 lignes) » ; none : rien de coché. */
function takeLabel(base, diff, sel, removed = 0) {
  const f = diff.rows.filter(r => r.changed && !sel.skip.has(r.path)).length,
    c = diff.curve.filter(x => !sel.skipCurve.has(x.key)).length,
    parts = [f ? ktf(["{n} champ(s)", "{n} field(s)", "{n} Feld(er)", "{n} campo(s)"], {
      n: f
    }) : "", c ? ktf(["{n} ligne(s) de cartographie", "{n} engine map row(s)", "{n} Kennfeldzeile(n)", "{n} fila(s) del mapa motor"], {
      n: c
    }) : "", removed ? ktf(["{n} profil(s) retiré(s)", "{n} profile(s) removed", "{n} Profil(e) entfernt",
      "{n} perfil(es) retirado(s)"
    ], {
      n: removed
    }) : ""].filter(Boolean);
  return {
    label: `${base} (${parts.join(", ") || kt(["rien", "nothing", "nichts", "nada"])})`,
    none: !parts.length
  }
}
/* (removed : profils retirés par la fusion — le bouton reste actif même sans champ repris : le plus récent est gardé tel
 *  quel, les autres disparaissent) */
/** Aperçu d'un écart (profileDiff) : champs qui changent (actuel → retenu, source), lignes de cartographie ajoutées ou
 *  remplacées, champs inchangés repliés et grisés, note facultative. Avec sel ({ skip, skipCurve, onChange }) : une case
 *  par donnée qui change (décochée : la valeur actuelle est gardée), « Tout reprendre » / « Ne rien reprendre ». */
function diffNode(diff, note = "", sel = null) {
  const esc = KIT.esc,
    val = v => {
      if (v === undefined) return "—";
      const x = JSON.parse(v),
        t = Array.isArray(x) ? x.join(", ") : typeof x === "number" ? String(Math.round(x * 10) / 10) : String(x);
      return t.length > 90 ? t.slice(0, 88) + "…" : t
    },
    keep = `<span class="pp-keep">${esc(kt(["gardé", "kept", "beibehalten", "conservado"]))}</span>`,
    box = (attr, on) => sel ? `<td><input type="checkbox" class="pp-take" ${attr}${on ? " checked" : ""}></td>` : "",
    th = sel ? "<th></th>" : "",
    head = `<tr>${th}<th>${esc(kt(["Champ", "Field", "Feld", "Campo"]))}</th><th>${esc(kt(["Actuel", "Current", "Aktuell", "Actual"]))}</th><th>${esc(kt(["Retenu", "Kept", "Übernommen", "Retenido"]))}</th><th>${esc(kt(["Source", "Source", "Quelle", "Origen"]))}</th></tr>`,
    line = r => {
      const off = sel && r.changed && sel.skip.has(r.path);
      return `<tr${r.changed ? off ? ' class="pp-off"' : "" : ' class="pp-same"'}>${r.changed ? box(`data-k="${esc(r.path)}"`, !off) : th ? "<td></td>" : ""}<td>${esc(r.label)}</td><td>${esc(val(r.old))}</td><td>${r.changed ? `<b class="pp-new">${esc(val(r.now))}</b>${keep}` : esc(val(r.now))}</td><td>${esc(r.src)}</td></tr>`
    },
    cline = c => {
      const off = sel && sel.skipCurve.has(c.key);
      return `<tr${off ? ' class="pp-off"' : ""}>${box(`data-c="${esc(c.key)}"`, !off)}<td>${esc(c.label)}</td><td>${esc(c.old)}</td><td><b class="pp-new">${esc(c.now)}</b>${keep}</td><td>${esc(c.kind === "added" ? kt(["ajoutée", "added", "hinzugefügt", "añadida"]) : kt(["remplacée", "replaced", "ersetzt", "sustituida"]))}</td></tr>`
    },
    ch = diff.rows.filter(r => r.changed),
    same = diff.rows.filter(r => !r.changed),
    chead = `<tr>${th}<th>${esc(kt(["Régime", "Setting", "Einstellung", "Régimen"]))}</th><th>${esc(kt(["Actuel", "Current", "Aktuell", "Actual"]))}</th><th>${esc(kt(["Retenu", "Kept", "Übernommen", "Retenido"]))}</th><th></th></tr>`,
    el = document.createElement("div");
  el.className = "pp-diff";
  el.innerHTML = (sel && diff.changed ? `<p class="pp-take-all"><button type="button" class="ghost" data-all="1">${esc(kt(["Tout reprendre", "Take everything", "Alles übernehmen", "Tomar todo"]))}</button> · <button type="button" class="ghost" data-all="0">${esc(kt(["Ne rien reprendre", "Take nothing", "Nichts übernehmen", "No tomar nada"]))}</button></p>` : "") +
    (ch.length ? `<table>${head}${ch.map(line).join("")}</table>` : `<p>${esc(kt(["Aucun champ ne change.", "No field changes.",
      "Kein Feld ändert sich.", "Ningún campo cambia."
    ]))}</p>`) + (diff.curve.length ? `<h4>${esc(kt(["Cartographie moteur (consommation moyenne)", "Engine map (average fuel flow)",
      "Motorkennfeld (mittlerer Verbrauch)", "Mapa motor (consumo medio)"
    ]))}</h4><table>${chead}${diff.curve.map(cline).join("")}</table>` : `<p>${esc(kt(["Cartographie moteur inchangée.",
      "Engine map unchanged.", "Motorkennfeld unverändert.", "Mapa motor sin cambios."
    ]))}</p>`) + (same.length ? `<details><summary>${esc(ktf(["{n} champ(s) inchangé(s)", "{n} unchanged field(s)",
      "{n} unveränderte(s) Feld(er)", "{n} campo(s) sin cambios"
    ], {
      n: same.length
    }))}</summary><table>${same.map(line).join("")}</table></details>` : "") + (note ?
      `<p>${esc(note)}</p>` : "");
  if (sel) {
    /** Reporte une case dans la sélection et grise sa ligne. */
    const apply = c => {
      const set = c.dataset.k !== undefined ? sel.skip : sel.skipCurve,
        k = c.dataset.k ?? c.dataset.c;
      if (c.checked) set.delete(k);
      else set.add(k);
      c.closest("tr").classList.toggle("pp-off", !c.checked)
    };
    el.addEventListener("change", e => {
      const c = e.target.closest(".pp-take");
      if (!c) return;
      apply(c);
      sel.onChange?.()
    });
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-all]");
      if (!b) return;
      for (const c of el.querySelectorAll(".pp-take")) {
        c.checked = b.dataset.all === "1";
        apply(c)
      }
      sel.onChange?.()
    })
  }
  return el
}
/** Aperçu avant de valider une mise à jour, données à cocher : after tel quel si rien ne change ; sinon fenêtre
 *  « Changements » (bouton ok avec le nombre de données reprises, grisé si rien n'est coché). Retour : profil retenu
 *  (pickChanges ; fusion res : note et liste des reprises via finishMerge), ou null si abandon. */
async function confirmChanges(before, after, origin, ok, defaultSrc, res = null) {
  const diff = profileDiff(before, after, origin, defaultSrc),
    sel = {
      skip: new Set(),
      skipCurve: new Set()
    },
    done = () => res ? finishMerge(res, diff, sel).target : pickChanges(before, after, diff, sel);
  if (!diff.changed) return done();
  const r = await choose(ktf(["Changements de « {p} » avant de valider :", "Changes to “{p}” before confirming:",
    "Änderungen an „{p}“ vor der Bestätigung:", "Cambios de «{p}» antes de validar:"
  ], {
    p: after.name || after.id
  }), [
    ["ok", ok, true]
  ], {
    wide: true,
    extra: (_c, _v, ui) => {
      sel.onChange = () => {
        const t = takeLabel(ok, diff, sel);
        ui.setOk(t.label, t.none)
      };
      sel.onChange();
      return diffNode(diff, "", sel)
    }
  });
  return r ? done() : null
}
/** Message d'une fusion : profil obtenu, base (le plus récent), ce qui a été repris des autres sources. */
function mergeMessage({
  target,
  base,
  took
}) {
  return ktf(["Profils fusionnés dans « {p} » (base : le plus récent, {b}). {took}",
    "Profiles merged into “{p}” (base: the most recent, {b}). {took}",
    "Profile zusammengeführt in „{p}“ (Basis: das neueste, {b}). {took}",
    "Perfiles fusionados en «{p}» (base: el más reciente, {b}). {took}"
  ], {
    p: target.name,
    b: base.name || base.id,
    took: took.length ? kt(["Repris des sources :", "Taken from the sources:", "Aus den Quellen übernommen:",
        "Tomado de las fuentes:"
      ]) + " " +
      took.join(" ; ") : kt(["Rien à reprendre des autres.", "Nothing to take from the others.",
        "Nichts von den anderen zu übernehmen.",
        "Nada que tomar de los demás."
      ])
  })
}
/** « Fusionner (n) » : profils cochés du même type réunis en un seul (mergeProfileSources) — nom choisi (celui du plus
 *  complet par défaut) ; case « Inclure la fiche SimBrief du type » (cochée d'avance) quand SimBrief connaît le type, un
 *  seul profil coché suffit alors ; les autres profils sont retirés (« Annuler » 10 s). */
async function mergeSelected() {
  const list = [...ppSelected].map(id => state.profiles?.[id]).filter(Boolean);
  if (!list.length || new Set(list.map(profileTypeKey)).size !== 1) return syncMergeButton();
  const recent = [...list].sort((a, b) => profileWhen(b) - profileWhen(a)),
    keeper = recent[0],
    sbSrc = simbriefMergeSource(keeper.type || keeper.icao || keeper.id, keeper.unit);
  if (list.length < 2 && !sbSrc) return syncMergeButton();
  if (active && list.some(p => p.id === active.id)) commitProfileEditor(false); // modifications en cours comprises
  const complete = [...list].sort((a, b) => profileInfo(normalize(structuredClone(a))).missing.length - profileInfo(normalize(
      structuredClone(b))).missing.length || (b.rpmFuelCurve?.length || 0) - (a.rpmFuelCurve?.length || 0))[0],
    names = recent.map(mergeSourceName).join(", ");
  let view = null; // aperçu affiché : { res, diff, sel }
  const removed = list.filter(p => p.id !== keeper.id),
    plan = withSb => {
      const sources = [...list, ...(sbSrc && withSb ? [sbSrc] : [])];
      return sources.length < 2 ? null : mergeProfileSources(keeper, sources)
    },
    nothing = kt(["Un seul profil, sans la fiche SimBrief : rien à fusionner.",
      "A single profile, without the SimBrief record: nothing to merge.",
      "Ein einziges Profil ohne SimBrief-Eintrag: nichts zusammenzuführen.",
      "Un solo perfil, sin la ficha SimBrief: nada que fusionar."
    ]);
  const r = await choose(ktf([
    "Fusionner {n} profil(s) : {list}.\nLe plus récent gagne champ par champ, les vides sont comblés.\nNom du profil fusionné :",
    "Merge {n} profile(s): {list}.\nThe most recent wins field by field, empty fields are filled.\nName of the merged profile:",
    "{n} Profil(e) zusammenführen: {list}.\nDas Neueste gewinnt Feld für Feld, leere Felder werden ergänzt.\nName des zusammengeführten Profils:",
    "Fusionar {n} perfil(es): {list}.\nEl más reciente gana campo por campo, los vacíos se completan.\nNombre del perfil fusionado:"
  ], {
    n: list.length,
    list: names
  }), [
    ["merge", kt(["Fusionner", "Merge", "Zusammenführen", "Fusionar"]), true]
  ], {
    input: complete.name || complete.id,
    check: sbSrc ? ktf(["Inclure la fiche SimBrief du type (du {d})", "Include the type’s SimBrief record (of {d})",
      "SimBrief-Eintrag des Typs einbeziehen (vom {d})", "Incluir la ficha SimBrief del tipo (del {d})"
    ], {
      d: sbSrc.updatedAt ? new Date(sbSrc.updatedAt).toLocaleDateString() : "—"
    }) : undefined,
    wide: true,
    // aperçu : changements du profil gardé (le plus récent coché), données à cocher, profils retirés ensuite
    extra: (withSb, _name, ui) => {
      const res = plan(withSb);
      view = null;
      if (!res) {
        ui.setOk(kt(["Fusionner", "Merge", "Zusammenführen", "Fusionar"]), true);
        return Object.assign(document.createElement("p"), {
          className: "pp-diff",
          textContent: nothing
        })
      }
      const diff = profileDiff(keeper, res.target, res.origin),
        sel = {
          skip: new Set(),
          skipCurve: new Set()
        };
      view = {
        res,
        diff,
        sel
      };
      sel.onChange = () => {
        const t = takeLabel(kt(["Fusionner", "Merge", "Zusammenführen", "Fusionar"]), diff, sel, removed.length);
        ui.setOk(t.label, t.none)
      };
      sel.onChange();
      return diffNode(diff, removed.length ? ktf(["Retirés après la fusion : {list}.", "Removed after the merge: {list}.",
        "Nach dem Zusammenführen entfernt: {list}.", "Retirados tras la fusión: {list}."
      ], {
        list: removed.map(p => p.name || p.id).join(", ")
      }) : "", sel)
    }
  });
  if (!r) return;
  if (!view) return window.AppFramework?.notify?.(nothing, "warn");
  const res = finishMerge(view.res, view.diff, view.sel),
    target = res.target,
    before = res.before;
  target.name = r.value || keeper.name || target.name;
  state.profiles[target.id] = target;
  const wasActive = active && list.some(p => p.id === active.id);
  removeProfiles(removed.map(p => p.id), mergeMessage(res), () => {
    state.profiles[before.id] = before
  });
  ppSelected.clear();
  if (wasActive) setActive(target, kt(["profils fusionnés", "merged profiles", "zusammengeführte Profile", "perfiles fusionados"]));
  profilesChanged()
}
/** Nom de fichier tiré du nom d'un profil (repli : identifiant), extension ext, rendu unique parmi used (Set). */
function profileFileName(p, ext, used) {
  const base = String(p.name || p.id || "profil").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "_").replace(
    /^_+|_+$/g, "") || "profil";
  let name = `${base}.${ext}`;
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base}_${i}.${ext}`;
  used.add(name.toLowerCase());
  return name
}
/** Profils cochés (copies normalisées, profil actif avec ses modifications en cours). */
function selectedProfiles() {
  if (active && ppSelected.has(active.id)) commitProfileEditor(false);
  return [...ppSelected].map(id => state.profiles?.[id]).filter(Boolean).map(p => normalize(structuredClone(p)))
}
/** « Exporter (n) » : un fichier par profil coché, téléchargé — .lnmperf (Little Navmap) quand le profil est complet,
 *  sinon JSON de la suite ; jamais un fichier qui les regroupe. */
async function exportSelected() {
  const list = selectedProfiles(),
    used = new Set(),
    out = [];
  for (const p of list) {
    let name, text, type;
    try {
      text = toLnmperf(p);
      name = profileFileName(p, "lnmperf", used);
      type = "application/xml"
    } catch {
      text = JSON.stringify(p, null, 2);
      name = profileFileName(p, "performance.json", used);
      type = "application/json"
    }
    downloadText(name, text, type);
    out.push(name);
    await new Promise(r => setTimeout(r, 350)) // téléchargements espacés : les navigateurs en bloquent les rafales
  }
  if (out.length) window.AppFramework?.notify?.(ktf(["{n} fichier(s) exporté(s), un par profil : {list}.",
    "{n} file(s) exported, one per profile: {list}.", "{n} Datei(en) exportiert, eine pro Profil: {list}.",
    "{n} archivo(s) exportado(s), uno por perfil: {list}."
  ], {
    n: out.length,
    list: out.join(", ")
  }), "ok")
}
/** « Enregistrer dans le dossier (n) » : un fichier JSON par profil coché dans le dossier performances (autorisation
 *  demandée au besoin), nommé d'après le profil ; relu ensuite comme les autres profils du dossier. */
async function saveSelectedToFolder() {
  const list = selectedProfiles();
  let h = dirHandle;
  if (!h && window.FileAccess) try {
    h = await window.FileAccess.get("__perf")
  } catch {
    h = null
  }
  let ok = false;
  try {
    ok = !!h && ((await h.queryPermission?.({
      mode: "readwrite"
    })) === "granted" || (await h.requestPermission?.({
      mode: "readwrite"
    })) === "granted")
  } catch {
    ok = false
  }
  if (!ok) return window.AppFramework?.notify?.(kt(["Aucun dossier performances autorisé : bouton « Dossier… » d’abord, ou « Exporter ».",
    "No performance folder allowed: use the “Folder…” button first, or “Export”.",
    "Kein Leistungsordner freigegeben: zuerst „Ordner…“, oder „Exportieren“.",
    "Ninguna carpeta de rendimiento autorizada: primero «Carpeta…», o «Exportar»."
  ]), "warn");
  dirHandle = h;
  const used = new Set(),
    out = [];
  try {
    for (const p of list) {
      const name = profileFileName(p, "json", used),
        w = await (await h.getFileHandle(name, {
          create: true
        })).createWritable();
      await w.write(JSON.stringify(p, null, 2));
      await w.close();
      out.push(name)
    }
    lastPerfRead = Date.now(); // ce changement du dossier est le nôtre : pas de relecture
    window.AppFramework?.notify?.(ktf(["{n} profil(s) enregistré(s) dans le dossier {d}, un fichier chacun : {list}.",
      "{n} profile(s) saved in the folder {d}, one file each: {list}.",
      "{n} Profil(e) im Ordner {d} gespeichert, je eine Datei: {list}.",
      "{n} perfil(es) guardado(s) en la carpeta {d}, un archivo cada uno: {list}."
    ], {
      n: out.length,
      d: h.name,
      list: out.join(", ")
    }), "ok")
  } catch (e) {
    window.AppFramework?.notify?.(window.AppFramework?.explain?.(e, kt(["Enregistrement des profils", "Saving the profiles",
      "Speichern der Profile", "Guardado de los perfiles"
    ])) || e.message, "err")
  }
}
/** Fiche SimBrief du type (AIRCRAFT_PERF[code].simbrief, posée par le lanceur ; alias suivis) ; null si SimBrief ne le
 *  connaît pas. */
function simbriefRecordFor(code) {
  const perf = window.AIRCRAFT_PERF || {},
    k = aKey(code || ""),
    al = window.AIRCRAFT_DB?.__aliases || {};
  let x = k;
  for (let i = 0; i < 6 && x; i++) {
    if (perf[x]?.simbrief?.fuelflowKgh > 0) return perf[x].simbrief;
    if (!al[x] || al[x] === x) break;
    x = aKey(al[x])
  }
  return null
}
/** TAS (kt) en atmosphère standard au niveau ft : depuis un Mach, ou depuis une vitesse indiquée (ias). */
function isaTas(ft, {
  mach,
  ias
}) {
  const h = Math.min(ft, 36089) * 0.3048,
    t = 288.15 - 0.0065 * h;
  if (mach > 0) return Math.round(mach * 38.967854 * Math.sqrt(ft > 36089 ? 216.65 : t));
  const sigma = Math.pow(t / 288.15, 4.2559) * (ft > 36089 ? Math.exp(-(ft - 36089) * 0.3048 / 6341.6) : 1);
  return ias > 0 ? Math.round(ias / Math.sqrt(sigma)) : null
}
/** Profil construit depuis la fiche SimBrief du type : consommation de croisière, plafond, vitesse (Mach ou vitesse
 *  indiquée, TAS au niveau de référence), Badin de montée et de descente des profils SimBrief, carburant utilisable,
 *  piste, masses et moteurs en description ; identifiant « SB_TYPE_<code> », unité kg. */
function profileFromSimbriefType(code, sb) {
  const c = aKey(code),
    ceil = +sb.ceilingFt || null,
    ref = sb.mach ? Math.min(ceil || 35000, 35000) : Math.round((ceil || 10000) * 0.6 / 1000) * 1000,
    climbIas = +String(sb.climb?.[0] || "").split("/")[1] || +String(sb.climb?.[0] || "").split("/")[0] || null,
    descIas = +String(sb.descent?.[0] || "").split("/")[1] || null,
    kg = v => v > 0 ? `${fmt(v, 0)} kg` : null,
    masses = [
      ["MTOW", kg(sb.mtowKg)],
      ["OEW", kg(sb.oewKg)],
      ["MZFW", kg(sb.mzfwKg)],
      ["MLW", kg(sb.mlwKg)]
    ].filter(x => x[1]).map(x => x.join(" ")).join(", ");
  return normalize({
    id: `SB_TYPE_${c}`,
    icao: c,
    type: c,
    name: `${sb.name || c} — SimBrief`,
    unit: "kg",
    simbrief: true,
    simbriefType: structuredClone(sb),
    usableFuel: sb.maxFuelKg || undefined,
    minRunwayLengthFt: sb.takeoffM ? Math.round(sb.takeoffM * 3.28084) : undefined,
    cruise: {
      fuelFlowPerHour: sb.fuelflowKgh,
      tasKt: isaTas(ref, {
        mach: sb.mach,
        ias: sb.speedKt
      }) || undefined,
      iasKt: sb.speedKt || undefined,
      ceilingFt: ceil || undefined,
      refAltFt: ref
    },
    climb: climbIas ? {
      iasKt: climbIas
    } : {},
    descent: descIas ? {
      iasKt: descIas
    } : {},
    description: [`SimBrief : ${sb.name || c}${sb.engines ? `, ${sb.engines}` : ""}${masses ? ` ; ${masses}` : ""}${sb.accuracy === "high" ? "" : " ; " + kt(["précision non garantie par SimBrief", "accuracy not guaranteed by SimBrief", "Genauigkeit von SimBrief nicht garantiert", "precisión no garantizada por SimBrief"])}`].join(""),
    source: {
      format: "SimBrief (liste publique des types)",
      importedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }, c)
}
/** « Profil SimBrief » d'une ligne (id : profil, ou type de flotte sans profil si landing) ou de la fiche du profil actif :
 *  crée ou remet à jour le profil SimBrief du type ; face à un profil perso, propose « Mettre à jour les champs vides »,
 *  « Remplacer » ou « Nouveau profil ». « Annuler » 10 s. */
async function simbriefProfileFor(id, landing = false) {
  const src = landing ? landingOnlyAircraft(Object.values(state.profiles || {}).filter(p => p && typeof p === "object").map(p =>
      normalize(p))).find(p => p.id === id) : state.profiles?.[id],
    code = src && (src.type || src.icao || src.id),
    sb = simbriefRecordFor(code);
  if (!sb) return window.AppFramework?.notify?.(kt([
    "SimBrief ne connaît pas ce type (liste publique, lue par « Compléter automatiquement »).",
    "SimBrief does not know this type (public list, read by “Complete automatically”).",
    "SimBrief kennt diesen Typ nicht (öffentliche Liste, gelesen von „Automatisch ergänzen“).",
    "SimBrief no conoce este tipo (lista pública, leída por «Completar automáticamente»)."
  ]), "warn");
  const fresh = profileFromSimbriefType(code, sb),
    own = !landing && src && !String(src.id).startsWith("SB_TYPE_") ? src : null,
    sbId = own ? fresh.id : (landing ? fresh.id : src.id),
    prevSb = state.profiles?.[sbId] ? structuredClone(state.profiles[sbId]) : null;
  let target, message, undo;
  if (own) {
    const r = await choose(ktf([
      "« {p} » est un profil perso. Que faire des valeurs SimBrief ({ff} kg/h, plafond {c}, fiche du {d}) ?\n« Fusionner » : le plus récent gagne champ par champ, les vides sont comblés.",
      "“{p}” is a personal profile. What to do with the SimBrief values ({ff} kg/h, ceiling {c}, record of {d})?\n“Merge”: the most recent wins field by field, empty fields are filled.",
      "„{p}“ ist ein persönliches Profil. Was tun mit den SimBrief-Werten ({ff} kg/h, Gipfelhöhe {c}, Eintrag vom {d})?\n„Zusammenführen“: Das Neueste gewinnt Feld für Feld, leere Felder werden ergänzt.",
      "«{p}» es un perfil personal. ¿Qué hacer con los valores de SimBrief ({ff} kg/h, techo {c}, ficha del {d})?\n«Fusionar»: el más reciente gana campo por campo, los vacíos se completan."
    ], {
      p: own.name || own.id,
      ff: fmt(sb.fuelflowKgh, 0),
      c: sb.ceilingFt ? `${fmt(sb.ceilingFt, 0)} ft` : "—",
      d: (sb.fetched || window.AIRCRAFT_PERF?.__meta?.generated) ? new Date(sb.fetched || window.AIRCRAFT_PERF.__meta.generated)
        .toLocaleDateString() : "—"
    }), [
      ["fill", kt(["Mettre à jour les champs vides", "Fill the empty fields", "Leere Felder ergänzen",
        "Completar los campos vacíos"
      ]), true],
      ["merge", kt(["Fusionner", "Merge", "Zusammenführen", "Fusionar"])],
      ["replace", kt(["Remplacer", "Replace", "Ersetzen", "Sustituir"])],
      ["new", kt(["Nouveau profil", "New profile", "Neues Profil", "Perfil nuevo"])]
    ]);
    if (!r) return;
    const before = structuredClone(own);
    if (r.key === "merge") {
      // Fusionner : la fiche SimBrief comme une source datée de sa récupération (mergeProfileSources), aperçu d'abord
      if (active?.id === own.id) commitProfileEditor(false);
      const cur = state.profiles[own.id],
        res = mergeProfileSources(cur, [cur, simbriefMergeSource(code, own.unit)]);
      if (!await confirmChanges(cur, res.target, res.origin, kt(["Fusionner", "Merge", "Zusammenführen", "Fusionar"]), "", res))
        return;
      state.profiles[own.id] = res.target;
      setActive(res.target, "SimBrief");
      profilesChanged();
      return notifyUndo(mergeMessage(res), () => {
        state.profiles[before.id] = before;
        if (active?.id === before.id) setActive(before, kt(["fusion annulée", "merge undone", "Zusammenführen rückgängig",
          "fusión deshecha"
        ]));
        profilesChanged()
      })
    }
    if (r.key === "new") {
      target = fresh;
      if (prevSb) fillProfileGaps(target, prevSb);
      if (prevSb && !(target = await confirmChanges(prevSb, target, {}, kt(["Appliquer", "Apply", "Übernehmen", "Aplicar"]),
          "SimBrief"))) return;
      state.profiles[target.id] = target;
      undo = () => prevSb ? (state.profiles[prevSb.id] = prevSb) : delete state.profiles[target.id]
    } else {
      target = normalize(structuredClone(own));
      if (r.key === "fill") fillProfileGaps(target, fresh);
      else {
        // Remplacer : valeurs SimBrief à la place, ce que SimBrief ne donne pas (table RPM, champs perso) gardé
        const keep = structuredClone(own);
        Object.assign(target, structuredClone(fresh), {
          id: own.id,
          name: own.name
        });
        fillProfileGaps(target, keep)
      }
      target.updatedAt = new Date().toISOString();
      if (!(target = await confirmChanges(own, target, {}, kt(["Appliquer", "Apply", "Übernehmen", "Aplicar"]), "SimBrief"))) return;
      state.profiles[own.id] = target;
      undo = () => state.profiles[before.id] = before
    }
  } else {
    // profil SimBrief du type : créé, ou remis à jour (ce qui a été ajouté à la main et que SimBrief ne donne pas est gardé)
    target = fresh;
    if (prevSb) fillProfileGaps(target, prevSb);
    if (prevSb && !(target = await confirmChanges(prevSb, target, {}, kt(["Appliquer", "Apply", "Übernehmen", "Aplicar"]),
        "SimBrief"))) return;
    state.profiles[target.id] = target;
    undo = () => prevSb ? (state.profiles[prevSb.id] = prevSb) : delete state.profiles[target.id]
  }
  if (state.removedProfiles) delete state.removedProfiles[target.id];
  message = ktf(["Profil SimBrief : « {p} » — {ff} kg/h{c}.", "SimBrief profile: “{p}” — {ff} kg/h{c}.",
    "SimBrief-Profil: „{p}“ — {ff} kg/h{c}.",
    "Perfil SimBrief: «{p}» — {ff} kg/h{c}."
  ], {
    p: target.name || target.id,
    ff: fmt(sb.fuelflowKgh, 0),
    c: sb.ceilingFt ? `, ${flTxt(sb.ceilingFt)}` : ""
  });
  const wasActive = active?.id;
  setActive(target, "SimBrief");
  profilesChanged();
  notifyUndo(message, () => {
    undo();
    const back = wasActive && state.profiles[wasActive];
    if (back) setActive(back, kt(["profil SimBrief annulé", "SimBrief profile undone", "SimBrief-Profil rückgängig",
      "perfil SimBrief deshecho"
    ]));
    else if (active?.id === target.id && !state.profiles[target.id]) clearActive();
    profilesChanged()
  })
}
/** Bouton « Profil SimBrief » de la fiche du profil actif : visible si SimBrief connaît son type. */
function syncSbTypeButton() {
  const b = $("sbTypeBtn");
  if (!b) return;
  const on = !!(active && simbriefRecordFor(active.type || active.icao || active.id));
  setText("sbTypeBtn", kt(["Mettre à jour depuis SimBrief", "Update from SimBrief", "Aus SimBrief aktualisieren",
    "Actualizar desde SimBrief"
  ]));
  setText("sbTypeHelp", kt([
    "Reprend la fiche SimBrief du type : consommation de croisière, masses, plafond, vitesse ; vos saisies sont gardées.",
    "Takes the type’s SimBrief record: cruise fuel flow, weights, ceiling, speed; your entries are kept.",
    "Übernimmt den SimBrief-Eintrag des Typs: Reiseverbrauch, Massen, Gipfelhöhe, Geschwindigkeit; Ihre Eingaben bleiben erhalten.",
    "Toma la ficha SimBrief del tipo: consumo de crucero, masas, techo, velocidad; sus entradas se conservan."
  ]));
  if (b.hidden === on) b.hidden = !on;
  if ($("sbTypeHelp").hidden === on) $("sbTypeHelp").hidden = !on;
  const g = $("gptSheetBtn");
  setText("gptSheetBtn", kt(["Demander à ChatGPT", "Ask ChatGPT", "ChatGPT fragen", "Preguntar a ChatGPT"]));
  if (g.hidden === !!active) g.hidden = !active;
  const tip = kt([
    "Créer ou mettre à jour le profil de ce type d’après la liste publique de SimBrief (consommation de croisière, plafond, vitesse, masses).",
    "Create or update this type’s profile from SimBrief’s public list (cruise fuel flow, ceiling, speed, weights).",
    "Profil dieses Typs aus der öffentlichen SimBrief-Liste anlegen oder aktualisieren (Reiseverbrauch, Gipfelhöhe, Geschwindigkeit, Massen).",
    "Crear o actualizar el perfil de este tipo según la lista pública de SimBrief (consumo de crucero, techo, velocidad, masas)."
  ]);
  if (b.title !== tip) b.title = tip
}
// ===== Demander le profil à ChatGPT =====
// Prompt (apps/planner/perf_prompt.js, généré depuis docs/technique/PROMPT_PROFIL_PERFORMANCES.md) rempli pour le type :
// modèle, variante de la flotte, motorisation, ce que la suite sait déjà ; copié, ChatGPT ouvert. La réponse collée (JSON
// du schéma, ou CSV de performances) est vérifiée puis importée comme nouveau profil ou fusionnée (aperçu d'abord).
let gptFor = null; // appareil du panneau : { id, landing } (landing : type de la flotte sans profil)
/** Appareils proposés au panneau : profils enregistrés (par nom), puis types de la flotte sans profil. */
function gptEntries() {
  const saved = Object.values(state.profiles || {}).filter(p => p && typeof p === "object" && p.id).map(p => normalize(structuredClone(p)));
  return [...saved.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), "fr", {
    numeric: true
  })).map(p => ({
    id: p.id,
    landing: false,
    p
  })), ...landingOnlyAircraft(saved).map(p => ({
    id: p.id,
    landing: true,
    p
  }))]
}
/** Profil (copie) ou type sans profil de l'entrée { id, landing } ; profil actif non enregistré en repli. */
function gptProfileOf(e) {
  if (!e) return null;
  if (!e.landing && state.profiles?.[e.id]) return normalize(structuredClone(state.profiles[e.id]));
  return gptEntries().find(x => x.landing && x.id === e.id)?.p || (active?.id === e.id ? normalize(structuredClone(active)) : null)
}
/** Code OACI de l'entrée du panneau. */
function gptCode(e = gptFor) {
  const p = gptProfileOf(e);
  return aKey(p?.icao || p?.type || p?.id || e?.id || "")
}
/** Motorisation connue en clair : description OACI (nombre et nature des moteurs), moteurs SimBrief, motorisation du
 *  profil. */
function gptEngines(p, code) {
  const d = String((window.AIRCRAFT_DB || {})[code]?.description || ""),
    kind = {
      J: ["réacteur(s)", "jet engine(s)", "Strahltriebwerk(e)", "reactor(es)"],
      T: ["turbine(s) (turbopropulseur ou turbomoteur)", "turbine(s) (turboprop or turboshaft)",
        "Turbine(n) (Turboprop oder Wellenturbine)",
        "turbina(s) (turbohélice o turboeje)"
      ],
      P: ["moteur(s) à pistons", "piston engine(s)", "Kolbenmotor(en)", "motor(es) de pistón"],
      E: ["moteur(s) électrique(s)", "electric motor(s)", "Elektromotor(en)", "motor(es) eléctrico(s)"]
    } [d[2]],
    sb = simbriefRecordFor(code),
    out = [];
  if (kind) out.push(`${+d[1] || "?"} ${kt(kind)}${d[0] === "H" ? kt([", hélicoptère", ", helicopter", ", Hubschrauber", ", helicóptero"]) : ""}`);
  if (sb?.engines) out.push(`SimBrief — ${sb.engines}`);
  if (p?.engineType && p.engineType !== "auto") out.push(`engineType = ${p.engineType}`);
  return out.join(" ; ") || kt(["inconnue", "unknown", "unbekannt", "desconocida"])
}
/** Ce que la suite sait déjà du type, une ligne par source (EUROCONTROL APD, SimBrief, Airframe DB, profil actuel) ;
 *  valeurs nommées par leur chemin dans le schéma. */
function gptKnown(p, code, landing) {
  const lines = [],
    colon = kt([" :", ":", ":", ":"]), // typographie de la langue du prompt
    apd = apdFor({
      icao: code
    }),
    sb = simbriefRecordFor(code),
    af = (window.AIRCRAFT_PERF || {})[code]?.airframedb;
  if (apd?.fields && Object.keys(apd.fields).length) lines.push(`- EUROCONTROL Aircraft Performance Database${colon} ${Object.entries(apd.fields).map(([k, x]) => `${k} = ${x.v} (${x.how})`).join(" ; ")}`);
  if (sb) lines.push(`- SimBrief (${kt(["liste publique des types", "public type list", "öffentliche Typenliste", "lista pública de tipos"])})${colon} ${[
      ["fuelflowKgh", "kg/h"], ["ceilingFt", "ft"], ["mach", ""], ["speedKt", "kt"], ["maxFuelKg", "kg"], ["mtowKg", "kg"], ["oewKg", "kg"],
      ["mzfwKg", "kg"], ["mlwKg", "kg"], ["takeoffM", "m"], ["landingM", "m"]
    ].filter(([k]) => sb[k]).map(([k, u]) => `${k} = ${sb[k]}${u ? " " + u : ""}`).concat(sb.climb?.length ? [`climb = ${sb.climb.join(" / ")}`] : [],
      sb.descent?.length ? [`descent = ${sb.descent.join(" / ")}`] : []).join(" ; ")}`);
  if (af) lines.push(`- Airframe DB (${af.url || "airframedb.com"})${colon} ${Object.entries(af).filter(([k, v]) => !["url", "fetched", "name"].includes(k) && v !== null && v !== "" && typeof v !== "object").map(([k, v]) => `${k} = ${v}`).join(" ; ")}`);
  if (p && !landing) {
    const leaves = profileLeaves(p),
      keys = Object.keys(leaves).filter(k => !["name", "icao", "type", "description", "updatedAt", "simbrief"].includes(k) && !
        /^(simbriefType|simbriefSnapshot|calibration|tod|source)\b/.test(k)),
      map = (p.rpmFuelCurve || []).filter(r => r.rpm !== null && r.rpm !== "" && Number.isFinite(+r.rpm));
    lines.push(`- ${ktf(["Profil actuel « {p} » (unité {u})", "Current profile “{p}” (unit {u})", "Aktuelles Profil „{p}“ (Einheit {u})",
      "Perfil actual «{p}» (unidad {u})"
    ], {
      p: p.name || p.id,
      u: p.unit || "kg"
    })}${colon} ${keys.map(k => `${k} = ${[].concat(JSON.parse(leaves[k])).join(", ")}`).join(" ; ") || "—"}${map.length ? ` ; rpmFuelCurve = ${map.map(r => `${r.rpm}${Number.isFinite(+r.altFt) && r.altFt !== null && r.altFt !== "" ? ` @ ${r.altFt} ft` : ""} → ${r.fuelFlowPerHour ?? "?"}`).join(", ")}` : ""}`)
  }
  return lines.join("\n") || kt(["- rien", "- nothing", "- nichts", "- nada"])
}
/** Prompt rempli pour l'entrée e (langue de la page) ; chaîne vide si perf_prompt.js n'est pas chargé. */
function gptPrompt(e = gptFor) {
  const base = window.PERF_PROMPT?.[KIT.lang()] || window.PERF_PROMPT?.fr;
  if (!base || !e) return "";
  const p = gptProfileOf(e),
    code = gptCode(e),
    model = (window.AIRCRAFT_DB || {})[code]?.model || p?.name || code,
    fleet = (window.AircraftCatalog?.defaTypes() || []).find(t => aKey(t.type) === code),
    variant = (p?.name && p.name !== model && !e.landing ? ktf([", variante « {v} »", ", variant “{v}”", ", Variante „{v}“",
      ", variante «{v}»"
    ], {
      v: p.name
    }) : "") + (fleet ? ktf([" ; flotte : {m}, {n} appareil(s)", "; fleet: {m}, {n} aircraft", "; Flotte: {m}, {n} Luftfahrzeug(e)",
      "; flota: {m}, {n} aeronave(s)"
    ], {
      m: fleet.model || code,
      n: (fleet.registrations || []).length
    }) : "");
  let out = base;
  for (const [k, v] of [
      ["TYPE", code],
      ["MODELE", model],
      ["VARIANTE", variant],
      ["MOTORISATION", gptEngines(p, code)],
      ["CONNU", gptKnown(p, code, e.landing)]
    ]) out = out.split(`{{${k}}}`).join(String(v));
  return out
}
/** Copie un texte par l'ancienne commande du navigateur (repli quand l'API presse-papiers est absente ou refusée). */
function execCopy(txt) {
  const t = Object.assign(document.createElement("textarea"), {
    value: txt
  });
  t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(t);
  t.select();
  let ok = false;
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  t.remove();
  return ok
}
/** « Copier le prompt et ouvrir ChatGPT » : copie lancée dans le geste de l'utilisateur, ChatGPT ouvert (prompt prérempli
 *  s'il est assez court), état affiché ; le prompt reste lisible dans « Voir le prompt ». */
async function gptCopyAndOpen() {
  const txt = gptPrompt();
  if (!txt) return setText("ppGptStatus", kt(["Prompt absent (perf_prompt.js non chargé).", "Prompt missing (perf_prompt.js not loaded).",
    "Prompt fehlt (perf_prompt.js nicht geladen).", "Falta el prompt (perf_prompt.js no cargado)."
  ]));
  let copied = !navigator.clipboard && execCopy(txt);
  const copy = navigator.clipboard?.writeText(txt);
  // un seul onglet ChatGPT, réutilisé d'un clic à l'autre ; pas de préremplissage (?q=) : le prompt n'est collé qu'une fois
  window.open("https://chatgpt.com/", "chatgpt");
  if (copy) try {
    await copy;
    copied = true
  } catch {
    copied = execCopy(txt)
  }
  setText("ppGptStatus", copied ? ktf([
    "Prompt copié ({n} caractères) et ChatGPT ouvert : y coller le prompt (Ctrl+V), l'envoyer, puis coller la réponse ci-dessous.",
    "Prompt copied ({n} characters) and ChatGPT opened: paste the prompt there (Ctrl+V), send it, then paste the answer below.",
    "Prompt kopiert ({n} Zeichen) und ChatGPT geöffnet: dort den Prompt einfügen (Strg+V), senden, dann die Antwort unten einfügen.",
    "Prompt copiado ({n} caracteres) y ChatGPT abierto: pegar allí el prompt (Ctrl+V), enviarlo y pegar la respuesta abajo."
  ], {
    n: txt.length.toLocaleString()
  }) : kt([
    "Copie refusée par le navigateur : ouvrir « Voir le prompt », tout sélectionner et copier (Ctrl+A, Ctrl+C).",
    "Copy denied by the browser: open “Show the prompt”, select all and copy (Ctrl+A, Ctrl+C).",
    "Kopieren vom Browser verweigert: „Prompt anzeigen“ öffnen, alles markieren und kopieren (Strg+A, Strg+C).",
    "Copia rechazada por el navegador: abrir «Ver el prompt», seleccionar todo y copiar (Ctrl+A, Ctrl+C)."
  ]))
}
/** Lit la réponse collée : JSON du schéma (bloc de code accepté), sinon CSV de performances. Clés inconnues ignorées,
 *  valeurs illisibles ou hors plage écartées, unités vérifiées (kg ou lb ; varios positifs), cartographie relue comme
 *  dans l'éditeur (bornes absentes : valeur moyenne ; moyenne absente : milieu des bornes ; phase admise, sinon déduite du
 *  commentaire). Type : celui de la réponse, code (sélecteur) en repli. Sortie : { profile (daté de maintenant,
 *  _gptSource), warnings, code (type donné par la réponse, ou null) } ; erreur si rien n'est lisible. */
function parseGptReply(text, code) {
  const S = window.PERF_PROMPT_SCHEMA || {},
    warnings = [],
    now = new Date().toISOString();
  let t = String(text || "").trim(),
    obj = null,
    err = null;
  const fence = t.match(/```[a-z]*\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const a = t.indexOf("{"),
    b = t.lastIndexOf("}");
  if (a >= 0 && b > a) try {
    obj = JSON.parse(t.slice(a, b + 1))
  } catch (x) {
    err = x
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    const head = t.split(/\r?\n/)[0] || "";
    if (/aircraft/i.test(head) && /icao/i.test(head)) {
      // séparateur de l'en-tête : ChatGPT rend souvent des virgules, les CSV de la suite des points-virgules
      const count = c => head.split(c).length - 1,
        list = parsePerformanceCsvEnriched(t, "ChatGPT.csv", [";", ",", "\t"].sort((a, b) => count(b) - count(a))[0]);
      if (list.length > 1) warnings.push(ktf(["{n} lignes CSV : seule la première est reprise.",
        "{n} CSV rows: only the first one is used.",
        "{n} CSV-Zeilen: nur die erste wird übernommen.", "{n} filas CSV: solo se toma la primera."
      ], {
        n: list.length
      }));
      return {
        code: aKey(list[0].icao || list[0].type || "") || null,
        profile: Object.assign(list[0], {
          source: {
            format: "ChatGPT (CSV)",
            importedAt: now
          },
          updatedAt: now,
          _gptSource: true
        }),
        warnings
      }
    }
    throw Error(kt(["Réponse illisible : ni JSON ni CSV de performances (colonnes Aircraft et ICAO).",
      "Unreadable answer: neither JSON nor a performance CSV (Aircraft and ICAO columns).",
      "Antwort unlesbar: weder JSON noch Leistungs-CSV (Spalten Aircraft und ICAO).",
      "Respuesta ilegible: ni JSON ni CSV de rendimiento (columnas Aircraft e ICAO)."
    ]) + (err ? ` (${err.message})` : ""))
  }
  const unknown = [],
    dropped = [],
    unitIn = String(obj.unit || "kg").trim().toLowerCase(),
    unit = ["kg", "lb"].includes(unitIn) ? unitIn : "kg",
    kg = v => unit === "lb" ? v * KG_PER_LB : v,
    field = path => PROFILE_FIELDS.find(f => f[2] === path),
    // plages plausibles (carburant ramené en kg) : au-delà, la valeur est écartée et signalée
    range = path => /fuelFlow/.test(path) ? [0.5, 40000, true] : /Fuel$/.test(path) ? [0, 400000, true] : /Kt$/.test(path) ? [20, 700] :
    /rateFpm$/.test(path) ? [50, 12000] : /Ft$/.test(path) ? [0, 70000] : /rpm/i.test(path) ? [0.1, 100000] : null,
    value = (path, v) => {
      if (v === null || v === undefined || v === "") return undefined;
      const type = field(path)?.[3] || "number";
      if (type === "bool") {
        if (typeof v === "boolean") return v;
        if (/^(true|oui|yes|ja|sí|si|1)$/i.test(String(v).trim())) return true;
        if (/^(false|non|no|nein|0)$/i.test(String(v).trim())) return false;
        dropped.push(`${path} (${v})`);
        return undefined
      }
      if (type.startsWith("select:")) {
        const x = type.slice(7).split(",").find(o => o.toLowerCase() === String(v).trim().toLowerCase());
        if (!x) dropped.push(`${path} (${v})`);
        return x
      }
      if (type === "text" || type === "textarea") return String(v).trim() || undefined;
      let n = typeof v === "number" ? v : Number(String(v).replace(",", ".").replace(/\s*[a-z/%°]+$/i, "").trim());
      if (!Number.isFinite(n)) {
        dropped.push(`${path} (${v})`);
        return undefined
      }
      if (/rateFpm$/.test(path) && n < 0) n = -n;
      const r = range(path),
        c = r?.[2] ? kg(n) : n;
      if (r && (c < r[0] || c > r[1])) {
        dropped.push(`${path} = ${v}`);
        return undefined
      }
      return n
    },
    out = {};
  if (!["kg", "lb"].includes(unitIn)) warnings.push(ktf(["Unité « {u} » non reconnue : kg retenu.", "Unit “{u}” not recognised: kg used.",
    "Einheit „{u}“ nicht erkannt: kg verwendet.", "Unidad «{u}» no reconocida: se usa kg."
  ], {
    u: obj.unit
  }));
  for (const [k, v] of Object.entries(obj)) {
    if (!(k in S)) {
      unknown.push(k);
      continue
    }
    if (["estimated", "sources", "notes", "rpmFuelCurve", "unit"].includes(k)) continue;
    if (S[k] && typeof S[k] === "object" && !Array.isArray(S[k])) {
      if (!v || typeof v !== "object") continue;
      out[k] = {};
      for (const [sk, sv] of Object.entries(v)) {
        if (!(sk in S[k])) {
          unknown.push(`${k}.${sk}`);
          continue
        }
        const x = value(`${k}.${sk}`, sv);
        if (x !== undefined) out[k][sk] = x
      }
      continue
    }
    const x = value(k, v);
    if (x !== undefined) out[k] = x
  }
  // type de la réponse (icao, sinon type) : il prime sur l'appareil choisi (repli seulement si la réponse n'en donne pas)
  const replyCode = aKey(out.icao || obj.type || "") || null;
  // cartographie moteur, lue comme l'éditeur ; lignes estimées notées dans leur commentaire
  const est = (Array.isArray(obj.estimated) ? obj.estimated : []).map(String),
    estRows = new Set(est.map(x => x.match(/^rpmFuelCurve\[(\d+)\]/)?.[1]).filter(Boolean).map(Number)),
    rowKeys = Object.keys(S.rpmFuelCurve?.[0] || {}),
    curve = [];
  (Array.isArray(obj.rpmFuelCurve) ? obj.rpmFuelCurve : []).forEach((r, i) => {
    if (!r || typeof r !== "object") return;
    for (const k of Object.keys(r))
      if (!rowKeys.includes(k)) unknown.push(`rpmFuelCurve[${i}].${k}`);
    const num = k => value(`rpmFuelCurve.${k}`, r[k]),
      rpm = num("rpm");
    let min = num("fuelFlowMin"),
      nom = num("fuelFlowPerHour"),
      max = num("fuelFlowMax");
    min ??= nom;
    max ??= nom;
    nom ??= Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : undefined;
    if (rpm === undefined || nom === undefined) return dropped.push(`rpmFuelCurve[${i}]`);
    const ph = String(r.phaseLabel || "").trim().toLowerCase(),
      comment = String(r.comment || "").trim();
    if (ph && !FLIGHT_PHASES.includes(ph)) dropped.push(`rpmFuelCurve[${i}].phaseLabel (${r.phaseLabel})`);
    curve.push({
      rpm,
      altFt: num("altFt") ?? null,
      fuelFlowMin: min,
      fuelFlowPerHour: nom,
      fuelFlowMax: max,
      phaseLabel: FLIGHT_PHASES.includes(ph) ? ph : inferredCurvePhase(comment),
      comment: estRows.has(i) ? [comment, kt(["estimé (ChatGPT)", "estimated (ChatGPT)", "geschätzt (ChatGPT)",
          "estimado (ChatGPT)"
        ])]
        .filter(Boolean).join(" — ") : comment
    })
  });
  const has = path => path.split(".").reduce((o, k) => o?.[k], out) !== undefined,
    sources = (Array.isArray(obj.sources) ? obj.sources : []).map(x => typeof x === "string" ? {
      title: x
    } : x && typeof x === "object" ? {
      title: String(x.title || ""),
      publisher: String(x.publisher || ""),
      url: String(x.url || "")
    } : null).filter(x => x && (x.title || x.url));
  if (unknown.length) warnings.push(ktf(["Clés inconnues ignorées : {list}.", "Unknown keys ignored: {list}.",
    "Unbekannte Schlüssel ignoriert: {list}.",
    "Claves desconocidas ignoradas: {list}."
  ], {
    list: unknown.join(", ")
  }));
  if (dropped.length) warnings.push(ktf(["Valeurs écartées (illisibles ou hors plage) : {list}.",
    "Values discarded (unreadable or out of range): {list}.",
    "Verworfene Werte (unlesbar oder außerhalb des Bereichs): {list}.", "Valores descartados (ilegibles o fuera de rango): {list}."
  ], {
    list: dropped.join(", ")
  }));
  const p = normalize({
    ...out,
    icao: replyCode || code,
    type: replyCode || code,
    unit,
    rpmFuelCurve: curve,
    description: [obj.notes ? String(obj.notes).trim() : "", sources.length ? kt(["Sources : ", "Sources: ", "Quellen: ",
        "Fuentes: "
      ]) +
      sources.map(x => [x.title, x.publisher, x.url].filter(Boolean).join(", ")).join(" ; ") : ""
    ].filter(Boolean).join("\n"),
    source: {
      format: "ChatGPT",
      importedAt: now
    },
    updatedAt: now,
    _gptSource: true
  }, code);
  const fields = est.filter(x => !/^rpmFuelCurve/.test(x) && has(x));
  if (fields.length) p.estimatedFields = fields;
  if (sources.length) p.gptSources = sources;
  return {
    code: replyCode,
    profile: p,
    warnings
  }
}
/** Compte rendu de la lecture de la réponse sous le panneau (avertissements, ou erreur), aussi en notification. */
function gptReport(lines, kind = "warn") {
  const txt = [].concat(lines || []).filter(Boolean).join("\n");
  setText("ppGptReport", txt);
  if (txt) window.AppFramework?.notify?.(txt, kind)
}
/** Deux codes désignent-ils le même type (alias de la base OACI suivis) ? */
function sameType(a, b) {
  return profileTypeKey({
    icao: a
  }) === profileTypeKey({
    icao: b
  })
}
/** Type à retenir pour une réponse r : celui de la réponse, sinon celui de l'appareil choisi ; s'ils diffèrent,
 *  confirmation — import : « Importer comme <réponse> » / « Importer comme <choisi> » ; fusion : « Importer comme nouveau
 *  profil <réponse> » / « Fusionner quand même ». Retour : { code, key } (key : "reply" | "sel" | "new"), ou null. */
async function gptPickType(r, mode) {
  const sel = gptCode(),
    rc = r.code;
  if (!rc || !sel || sameType(rc, sel)) return {
    code: sel || rc, // même type (alias compris) : le code de l’appareil choisi, celui de la flotte
    key: rc ? "reply" : "sel"
  };
  const target = gptFor && !gptFor.landing ? state.profiles?.[gptFor.id] : null,
    c = await choose(ktf(["La réponse décrit {r}, l'appareil choisi est {s}.", "The answer describes {r}, the chosen aircraft is {s}.",
      "Die Antwort beschreibt {r}, das gewählte Luftfahrzeug ist {s}.", "La respuesta describe {r}, la aeronave elegida es {s}."
    ], {
      r: rc,
      s: sel
    }), mode === "merge" ? [
      ["new", ktf(["Importer comme nouveau profil {r}", "Import as a new {r} profile", "Als neues {r}-Profil importieren",
        "Importar como perfil nuevo {r}"
      ], {
        r: rc
      }), true],
      ["sel", ktf(["Fusionner quand même avec « {p} »", "Merge with “{p}” anyway", "Trotzdem mit „{p}“ zusammenführen",
        "Fusionar de todos modos con «{p}»"
      ], {
        p: target?.name || sel
      })]
    ] : [
      ["reply", ktf(["Importer comme {c}", "Import as {c}", "Als {c} importieren", "Importar como {c}"], {
        c: rc
      }), true],
      ["sel", ktf(["Importer comme {c}", "Import as {c}", "Als {c} importieren", "Importar como {c}"], {
        c: sel
      })]
    ]);
  return c ? {
    code: c.key === "sel" ? sel : rc,
    key: c.key
  } : null
}
/** Range la réponse r comme nouveau profil du type code : identifiant GPT_<code> (numéroté s'il existe déjà), nom
 *  « <nom> — ChatGPT » — nom de la réponse si elle décrit ce type, sinon modèle du type (jamais le nom d'un type avec le
 *  code d'un autre) ; rendu actif, « Annuler » 10 s. */
function gptStoreNew(r, code) {
  const p = r.profile,
    model = (window.AIRCRAFT_DB || {})[code]?.model || code,
    own = !r.code || sameType(r.code, code);
  p.icao = p.type = code;
  let id = `GPT_${code}`;
  for (let i = 2; state.profiles[id]; i++) id = `GPT_${code}_${i}`;
  p.id = id;
  const name = own ? String(p.name || "").replace(/\s*—\s*ChatGPT$/i, "") || model : model;
  p.name = `${name} — ChatGPT`;
  delete p._gptSource;
  storeProfile(p);
  setActive(p, "ChatGPT");
  profilesChanged();
  openGptPanel({
    id,
    landing: false
  });
  gptReport(r.warnings);
  notifyUndo(ktf(["Profil importé depuis ChatGPT : « {p} »{e}.", "Profile imported from ChatGPT: “{p}”{e}.",
    "Profil aus ChatGPT importiert: „{p}“{e}.", "Perfil importado desde ChatGPT: «{p}»{e}."
  ], {
    p: p.name,
    e: p.estimatedFields?.length ? ktf([" ({n} valeur(s) estimée(s))", " ({n} estimated value(s))", " ({n} geschätzte(r) Wert(e))",
      " ({n} valor(es) estimado(s))"
    ], {
      n: p.estimatedFields.length
    }) : ""
  }), () => {
    delete state.profiles[id];
    if (active?.id === id) clearActive();
    profilesChanged()
  })
}
/** « Importer comme nouveau profil » : réponse lue, type retenu (gptPickType), profil rangé (gptStoreNew). */
async function gptImportNew() {
  let r;
  try {
    r = parseGptReply($("ppGptReply").value, gptCode())
  } catch (e) {
    return gptReport(e.message, "err")
  }
  const t = await gptPickType(r, "import");
  if (t) gptStoreNew(r, t.code)
}
/** « Fusionner avec le profil … » : la réponse, datée de maintenant, comme source de fusion (mergeProfileSources :
 *  le plus récent gagne champ par champ, les vides sont comblés) ; aperçu avant de valider, « Annuler » 10 s. */
async function gptMerge() {
  const e = gptFor;
  if (!e || e.landing || !state.profiles?.[e.id]) return;
  let r;
  try {
    r = parseGptReply($("ppGptReply").value, gptCode())
  } catch (x) {
    return gptReport(x.message, "err")
  }
  // réponse d'un autre type : confirmation (nouveau profil de ce type, ou fusion quand même dans le profil choisi)
  const t = await gptPickType(r, "merge");
  if (!t) return;
  if (t.key === "new") return gptStoreNew(r, t.code);
  r.profile.icao = r.profile.type = state.profiles[e.id].icao || state.profiles[e.id].type || t.code;
  if (active?.id === e.id) commitProfileEditor(false);
  const cur = state.profiles[e.id],
    u = cur.unit || "kg",
    src = r.profile.unit === u ? r.profile : Object.assign(fuelConvertedCopy(r.profile, r.profile.unit, u, true), {
      unit: u
    }),
    res = mergeProfileSources(cur, [cur, src]);
  gptReport(r.warnings);
  if (!await confirmChanges(cur, res.target, res.origin, kt(["Fusionner", "Merge", "Zusammenführen", "Fusionar"]), "", res)) return;
  const before = res.before;
  state.profiles[e.id] = res.target;
  if (active?.id === e.id) setActive(res.target, "ChatGPT");
  profilesChanged();
  $("ppGptReply").value = "";
  gptRefresh(false);
  notifyUndo(mergeMessage(res), () => {
    state.profiles[before.id] = before;
    if (active?.id === before.id) setActive(before, kt(["fusion annulée", "merge undone", "Zusammenführen rückgängig",
      "fusión deshecha"
    ]));
    profilesChanged()
  })
}
/** Met à jour le panneau : prompt (si prompt), boutons « Importer » / « Fusionner avec « … » » selon la réponse collée et
 *  l'appareil (pas de fusion pour un type sans profil). */
function gptRefresh(prompt = true) {
  if (prompt) $("ppGptPrompt").value = gptPrompt();
  const has = !!$("ppGptReply").value.trim(),
    target = gptFor && !gptFor.landing ? state.profiles?.[gptFor.id] : null,
    m = $("ppGptMerge");
  $("ppGptImport").disabled = !has;
  m.textContent = target ? ktf(["Fusionner avec « {p} »", "Merge with “{p}”", "Mit „{p}“ zusammenführen", "Fusionar con «{p}»"], {
    p: target.name || target.id
  }) : kt(["Fusionner (aucun profil pour ce type)", "Merge (no profile for this type)", "Zusammenführen (kein Profil für diesen Typ)",
    "Fusionar (ningún perfil para este tipo)"
  ]);
  m.disabled = !has || !target
}
/** Panneau ChatGPT ouvert : passe à l'appareil e { id, landing } (sélecteur et prompt), sans toucher à la réponse
 *  collée ; panneau refait si l'appareil n'est pas encore dans le sélecteur (profil tout juste créé). */
function gptFollow(e) {
  // (getElementById : le Carburant n'a pas ce panneau, $ y rendrait un élément fantôme)
  const box = document.getElementById("ppGptPanel");
  if (!box || box.hidden || !e?.id || (gptFor?.id === e.id && gptFor.landing === !!e.landing)) return;
  gptFor = {
    id: e.id,
    landing: !!e.landing
  };
  gptForLabel();
  gptRefresh()
}
/** Nom de l'appareil du panneau ChatGPT (celui de l'en-tête). */
function gptForLabel() {
  const el = document.getElementById("ppGptFor"),
    p = gptProfileOf(gptFor);
  if (el) el.textContent = p ? `${p.name || p.id} (${p.type || p.icao || p.id})` : "—"
}
/** Ouvre le panneau « Demander à ChatGPT » pour pick { id, landing } (sinon : l'appareil choisi dans l'en-tête) : copie
 *  du prompt et ouverture de ChatGPT, prompt replié, réponse à coller. Sans appareil choisi : le sélecteur de l'en-tête. */
function openGptPanel(pick) {
  const box = $("ppGptPanel"),
    esc = KIT.esc,
    // l'appareil choisi dans l'en-tête (ou par « Modifier » dans le tableau)
    picked = active ? {
      id: active.id,
      landing: !state.profiles?.[active.id]
    } : null;
  pick ||= picked;
  if (!pick) {
    notify(kt(["Choisis d’abord l’appareil dans l’en-tête.", "First choose the aircraft in the header.",
      "Zuerst das Luftfahrzeug in der Kopfzeile wählen.", "Elige primero la aeronave en la cabecera."
    ]));
    return document.getElementById("sheetPick")?.focus()
  }
  gptFor = pick ? {
    id: pick.id,
    landing: !!pick.landing
  } : null;
  box.innerHTML = `<div class="pp-gpt-row"><span>${esc(kt(["Appareil", "Aircraft", "Luftfahrzeug", "Aeronave"]))} : <strong id="ppGptFor"></strong></span><button type="button" id="ppGptCopy" class="primary">${esc(kt(["Copier le prompt et ouvrir ChatGPT", "Copy the prompt and open ChatGPT", "Prompt kopieren und ChatGPT öffnen", "Copiar el prompt y abrir ChatGPT"]))}</button><a href="https://chatgpt.com/" target="_blank" rel="noopener">chatgpt.com</a><button type="button" id="ppGptClose" class="ghost" title="${esc(kt(["Fermer", "Close", "Schließen", "Cerrar"]))}">×</button></div><p id="ppGptStatus" class="mut">${esc(kt(["Le prompt demande à ChatGPT de compiler toutes les sources (manuels, constructeur, Wikipédia, forums de simulation), en unités imposées, valeurs estimées marquées, cartographie moteur comprise ; il donne aussi ce que la suite sait déjà.", "The prompt asks ChatGPT to compile every source (manuals, manufacturer, Wikipedia, simulation forums), in required units, estimated values marked, engine map included; it also gives what the suite already knows.", "Der Prompt bittet ChatGPT, alle Quellen zusammenzutragen (Handbücher, Hersteller, Wikipedia, Simulationsforen), in vorgeschriebenen Einheiten, geschätzte Werte markiert, Motorkennfeld inklusive; er nennt auch, was die Suite schon weiß.", "El prompt pide a ChatGPT reunir todas las fuentes (manuales, fabricante, Wikipedia, foros de simulación), en unidades impuestas, valores estimados marcados, mapa motor incluido; también da lo que la suite ya sabe."]))}</p><details><summary>${esc(kt(["Voir le prompt", "Show the prompt", "Prompt anzeigen", "Ver el prompt"]))}</summary><textarea id="ppGptPrompt" rows="12" readonly></textarea></details><label class="pp-gpt-paste">${esc(kt(["Coller ici la réponse de ChatGPT (le JSON, ou un CSV de performances)", "Paste ChatGPT’s answer here (the JSON, or a performance CSV)", "ChatGPTs Antwort hier einfügen (das JSON oder ein Leistungs-CSV)", "Pegar aquí la respuesta de ChatGPT (el JSON, o un CSV de rendimiento)"]))}<textarea id="ppGptReply" rows="6" spellcheck="false"></textarea></label><div class="pp-gpt-row"><button type="button" id="ppGptImport" class="secondary">${esc(kt(["Importer comme nouveau profil", "Import as a new profile", "Als neues Profil importieren", "Importar como perfil nuevo"]))}</button><button type="button" id="ppGptMerge" class="secondary"></button></div><p id="ppGptReport" class="mut"></p>`;
  box.hidden = false;
  gptForLabel();
  $("ppGptCopy").onclick = () => gptCopyAndOpen();
  $("ppGptClose").onclick = () => box.hidden = true;
  $("ppGptReply").oninput = () => gptRefresh(false);
  $("ppGptImport").onclick = () => gptImportNew();
  $("ppGptMerge").onclick = () => gptMerge();
  gptRefresh()
}
$("sbTypeBtn").onclick = () => active && simbriefProfileFor(active.id);
$("ppGpt").onclick = () => $("ppGptPanel").hidden ? openGptPanel() : ($("ppGptPanel").hidden = true);
// « Demander à ChatGPT » de la fiche : panneau du bloc ouvert sur le profil actif
$("gptSheetBtn").onclick = () => {
  if (!active) return;
  openGptPanel({
    id: active.id,
    landing: !state.profiles?.[active.id]
  });
  $("ppGptPanel").scrollIntoView({
    behavior: "smooth",
    block: "center"
  })
};
$("ppMerge").onclick = () => mergeSelected();
$("ppExport").onclick = () => exportSelected();
$("ppSaveDir").onclick = () => saveSelectedToFolder();
$("ppDelete").onclick = () => deleteSelectedAsk();
$("ppImport").onclick = () => $("fileInput").click();
$("ppFolder").onclick = () => $("dirBtn").click();
$("ppReload").onclick = () => reloadPerfFolder(true);
/* Fiches appareils du type actif (apps/cr/appareil.html) : même catalogue commun que les CR et le reporting. */
// Fiches des appareils de ce type (flotte virtuelle).
/** Liens vers les fiches des appareils du type actif (apps/cr/appareil.html). */
function renderDefaSheets() {
  const box = $("defaSheets");
  if (!box) return;
  const t = aKey(active?.type || active?.icao || active?.id),
    db = window.AIRCRAFT_DB || {},
    r = t && (db.__aliases?.[t] || t);
  const list = (window.AircraftCatalog?.defaAircraft() || []).filter(a => {
    const k = aKey(a.type);
    return k && (k === t || k === r || aKey(db.__aliases?.[k]) === r)
  });
  box.innerHTML = list.length ? `Appareils de ce type (fiche : statut, terrain, activité) : ${list.map(a=>`<a href="../cr/appareil.html?reg=${encodeURIComponent(a.registration)}">${escXml(a.registration)}</a>`).join(" · ")}` : ""
}
/* ?aircraft=<type ou profil> : ouverture depuis une fiche appareil (profil existant, sinon créé depuis le type) ;
   transfert d'une mission (?handoff=1, plannerHandoff:v1 : Mes missions, studio, Cartes de vol) : son appareil, si
   l'adresse n'en donne pas. */
refreshLandingAircraft();
restore();
applyHeaderPreferences();
applyDetailView(); // vue simple / détaillée avant le premier calcul
syncCopyJsonBtn();
renderPerfProfilesSoon();
{
  const params = new URLSearchParams(location.search),
    handoff = (() => {
      if (!params.has("handoff")) return null;
      try {
        const h = JSON.parse(localStorage.getItem("plannerHandoff:v1") || "null");
        return h && Date.now() - (h.at || 0) < 36e5 ? h : null
      } catch {
        return null
      }
    })(),
    wanted = params.get("aircraft") || handoff?.aircraft,
    why = params.get("aircraft") ? "fiche appareil" : "mission transmise",
    k = aKey(wanted || ""),
    db = window.AIRCRAFT_DB || {},
    res = aKey(db.__aliases?.[k] || k),
    same = v => {
      const x = aKey(v);
      return x && (x === k || x === res || aKey(db.__aliases?.[x]) === res)
    },
    found = k && Object.values(state.profiles || {}).find(p => [p.id, p.icao, p.type].some(same)),
    cand = k && !found && landingOnlyAircraft(Object.values(state.profiles || {}).filter(p => p && typeof p === "object").map(p =>
      normalize(p))).find(p => [p.id, p.icao, p.type].some(same)),
    create = params.get("create"),
    created = PERF_PAGE === "sheets" && !create && cand && newProfileFromLanding(cand.id);
  // Carburant : la création d'une fiche se fait sur la page des Fiches de performances
  if (PERF_PAGE === "fuel" && create) location.replace(`performance_sheets.html${location.search}`);
  if (found) setActive(found, why);
  else if (PERF_PAGE === "sheets" && create && wanted) perfCreate(wanted, window.EquipmentEditor?.typeName?.(wanted) || wanted, create);
  else if (created) setActive(created, `${why} (type)`);
  else if (PERF_PAGE === "fuel" && wanted) noSheetLine(wanted);
  else if (PERF_PAGE === "sheets" && state.lastSheet && state.profiles[state.lastSheet]) setActive(state.profiles[state.lastSheet],
    "état restauré");
  else if (state.lastAircraft && state.profiles[state.lastAircraft]) setActive(state.profiles[state.lastAircraft], "état restauré");
  else syncAircraftPicker();
}
if (!active) calculate(); // sans avion : ligne d'état et champ de consommation disent quoi faire
completeProfileTypes();
