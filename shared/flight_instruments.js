/* =====================================================================================================
   Flight Performance Planner — instruments fictifs du bandeau (Badin, vario, altimètre)
   -----------------------------------------------------------------------------------------------------
   Trois cadrans ronds (SVG) dans la colonne de droite de la page (#fpInstrCol, collée sous l'en-tête ; à défaut
   dans l'en-tête), donc visibles pendant le défilement des courbes.
   Ils montrent la loi de montée réglée par les curseurs verticaux (shared/flight_perf_view.js) à l'altitude
   courante (survolée sur une courbe, sinon épinglée, sinon niveau du plan) :
     - Badin : aiguille = Badin tenu à cette altitude (réacteur : limité par le Mach de croisière en altitude),
       repère violet = consigne du curseur ; aiguille bleue semi-transparente = TAS ; arc violet = plage du curseur ;
     - vario : aiguille = vario obtenu à cette altitude (zéro à 9 h, montée vers le haut), repère = vario visé
       (« PG » : plein gaz) ;
     - altimètre : grande aiguille = centaines de pieds, petite = milliers ; fenêtre numérique (ft, FL) ;
     - carburant : carburant du trajet entier volé à cette altitude (unité d'affichage kg / lbs) et sa durée ;
       un clic (bouton ou cadran) change la lecture, une par courbe et dans sa couleur : loi réglée (violet) → profil
       (bleu) → croisière économique (vert) → montée rapide (jaune) → Vy (bleu) → montée économique (vert) ;
     - horloge : temps de vol du même trajet (même lecture, même couleur ; un clic sur l'un change les deux).
   Badin et vario se règlent aussi sur l'instrument : glisser verticalement ou molette (mêmes pas que les
   curseurs : 5 kt, 50 ft/min) — FlightInstruments.onSet(clé, valeur) renvoie la valeur à la vue.

   Interface : window.FlightInstruments = { update(état | null), onSet } ;
     état = { h, ias, iasSet, iasMin, iasMax, tas, tasMax, mach, roc, vsSet, vsMax, full, above } (tasMax : TAS
     la plus grande de la loi, pour l'échelle du Badin).
   Designs à matières (Cabinet, Carnet de vol, Durci, Aqua) : cadrans « réels » (boîtier, lunette métallique de la
   matière du design, cadran noir bombé, ombre intérieure, aiguilles ombrées, moyeu, reflet du verre) ; mêmes
   graduations et aiguilles (lecture inchangée), redessinés au changement de design.
   ===================================================================================================== */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const tl = (...r) => r[Math.max(0, ["fr", "en", "de", "es"].indexOf(window.RepositoryNav?.getLanguage?.() || "fr"))] || r[0];
  const nf = (v, d = 0) => Number.isFinite(v) ? v.toLocaleString(window.RepositoryNav?.getLanguage?.() || "fr", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—";
  const PURPLE = "#c792ea";

  // ---- cadrans réalistes (designs à matières) : lunette selon la matière du design
  const RIMS = {
    cabinet: ["#fff1c2", "#c9a24a", "#6b4d15", "#e9cf85"], flightlog: ["#f4ecd6", "#b9ac8a", "#4a4436", "#d8cfb6"],
    field: ["#f2f4f0", "#9aa095", "#3a3f36", "#c9cdc4"], aqua: ["#ffffff", "#c9d2dc", "#6c7a88", "#eef3f8"]
  };
  const skeuo = () => RIMS[document.documentElement.dataset.design];
  // boîtiers découpés dans les planches de cadrans (tools/gauges_from_sheets.html → shared/deco/<design>/gauge-case.webp :
  // carré, ouverture du cadran transparente, centrée, de rayon OPEN × demi-côté) ; sans boîtier : lunette dessinée
  const CASES = { cabinet: "cabinet", flightlog: "flightlog", field: "field", aqua: "aqua" }, OPEN = .898;
  const SRC = document.currentScript?.src || location.href, VER = new URL(SRC).search, url = f => new URL(f + VER, SRC).href;
  const CREAM = "#efe6cf";
  /** Définitions (dégradés, ombre des aiguilles) d'un cadran réaliste. */
  const defs = rim => `<defs><linearGradient id="fpRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${rim[0]}"/><stop offset=".35" stop-color="${rim[1]}"/><stop offset=".7" stop-color="${rim[2]}"/><stop offset="1" stop-color="${rim[3]}"/></linearGradient><linearGradient id="fpRim2" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${rim[0]}"/><stop offset=".4" stop-color="${rim[1]}"/><stop offset="1" stop-color="${rim[2]}"/></linearGradient>
    <radialGradient id="fpCase" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#3c3b38"/><stop offset="1" stop-color="#0c0c0b"/></radialGradient>
    <radialGradient id="fpFace" cx=".45" cy=".4" r=".62"><stop offset="0" stop-color="${rim === RIMS.aqua ? "#27374d" : "#26282b"}"/><stop offset=".75" stop-color="${rim === RIMS.aqua ? "#142032" : "#101113"}"/><stop offset="1" stop-color="${rim === RIMS.aqua ? "#0a111c" : "#050506"}"/></radialGradient>
    <radialGradient id="fpShade" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
    <linearGradient id="fpGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="fpHub" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5a5a58"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient>
    <linearGradient id="fpBevel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
    <filter id="fpSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx=".7" dy="1.3" stdDeviation=".7" flood-opacity=".7"/></filter></defs>`;
  /** Habille le contenu g (graduations, chiffres, aiguilles) : cadran noir bombé, ombre intérieure, reflet du verre,
   *  puis boîtier de la planche par-dessus (lunette, vis, bouton de calage) ; Aqua : lunette chromée dessinée. */
  const frame = g => {
    const rim = skeuo();
    if (!rim) return g;
    const cs = CASES[document.documentElement.dataset.design];
    if (!cs) return defs(rim) + `<circle cx="50" cy="50" r="49.8" fill="url(#fpCase)"/>
      <circle cx="50" cy="50" r="48.4" fill="none" stroke="url(#fpRim)" stroke-width="2.6"/><circle cx="50" cy="50" r="48.4" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2.6" stroke-dasharray=".45 .75"/>
      <circle cx="50" cy="50" r="46.6" fill="none" stroke="url(#fpRim2)" stroke-width="1.5"/><circle cx="50" cy="50" r="45.9" fill="none" stroke="#000" stroke-width=".8" opacity=".85"/><circle cx="50" cy="50" r="45.5" fill="url(#fpFace)"/>
      <g transform="translate(50 50) scale(.9) translate(-50 -50)">${g}</g><circle cx="50" cy="50" r="45.5" fill="url(#fpShade)" pointer-events="none"/>
      <path d="M13 38A38 38 0 0 1 80 20C62 14 34 16 13 38z" fill="url(#fpGlass)" pointer-events="none"/>`;
    const R = 50 * OPEN, k = R / 49;   // cadran : rayon de l'ouverture ; contenu (graduations jusqu'à 46) ramené dedans
    return defs(rim) + `<circle cx="50" cy="50" r="${R + .6}" fill="url(#fpFace)"/>
      <g transform="translate(50 50) scale(${k.toFixed(3)}) translate(-50 -50)">${g}</g>
      <circle cx="50" cy="50" r="${R + .6}" fill="url(#fpShade)" pointer-events="none"/>
      <path d="M${50 - R * .8} ${50 - R * .25}A${R * .85} ${R * .85} 0 0 1 ${50 + R * .66} ${50 - R * .66}C${50 + R * .25} ${50 - R * .8} ${50 - R * .35} ${50 - R * .75} ${50 - R * .8} ${50 - R * .25}z" fill="url(#fpGlass)" pointer-events="none"/>
      <image href="${url(`deco/${cs}/gauge-case.webp`)}" x="0" y="0" width="100" height="100" pointer-events="none"/>`;
  };

  /** Point du cadran (centre 50, 50) à l'angle a (degrés, 0 = en haut, sens horaire) et au rayon r. */
  const P = (a, r) => { const t = (a - 90) * Math.PI / 180; return [50 + r * Math.cos(t), 50 + r * Math.sin(t)]; };
  /** Arc SVG de a0 à a1 (degrés) au rayon r. */
  const arc = (a0, a1, r) => { const [x0, y0] = P(a0, r), [x1, y1] = P(a1, r); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  /** Graduation : trait radial de r0 à r1 à l'angle a. */
  const tick = (a, r0, r1, w = 1) => { const [x0, y0] = P(a, r0), [x1, y1] = P(a, r1); return `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="${skeuo() ? CREAM : "#e8edf2"}" stroke-width="${w}"/>`; };
  /** Chiffre de graduation à l'angle a. */
  const num = (a, r, t, s = 8) => { const [x, y] = P(a, r); return `<text x="${x.toFixed(1)}" y="${(y + s * .35).toFixed(1)}" font-size="${s}" text-anchor="middle" fill="${skeuo() ? CREAM : "#e8edf2"}"${skeuo() ? ' font-weight="700" font-family="B612,Bahnschrift,\'Arial Narrow\',sans-serif"' : ""}>${t}</text>`; };
  /** Pas « rond » (1, 2, 5 × 10ⁿ) pour environ n graduations sur la plage span. */
  const niceStep = (span, n) => { const raw = span / n, p = 10 ** Math.floor(Math.log10(raw)), k = raw / p; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * p; };

  let host = null, faces = {}, state = null, scale = {};
  // lecture de la jauge carburant (mémorisée dans le navigateur) : loi réglée, croisière économique, profil
  const FUEL_MODES = ["man", "prof", "eco", "fast", "vy", "fuel"];
  let fuelMode = (() => { try { const v = localStorage.getItem("flightPerfFuelGauge"); return FUEL_MODES.includes(v) ? v : "man"; } catch { return "man"; } })();

  /** Crée une fois le bandeau d'instruments dans l'en-tête (avant la langue et le menu ☰). */
  function mount() {
    if (host) return true;
    // colonne dédiée de la page (#fpInstrCol) si elle existe, sinon l'en-tête
    const col = document.querySelector("#fpInstrCol .fp-instr-sticky") || document.getElementById("fpInstrCol"),
      line = col ? null : document.querySelector("body>header .repo-header-line1, body>header .header-row");
    if (!col && !line) return false;
    host = document.createElement("div");
    host.className = "fp-instruments";
    host.hidden = true;
    host.innerHTML = ["ias", "vs", "alt", "fuel", "time"].map(k => `<figure class="fp-gauge" data-k="${k}"><svg viewBox="0 0 100 100" aria-hidden="true"></svg><figcaption></figcaption>${k === "fuel" || k === "time" ? '<button type="button" class="fp-fuel-mode repo-plain"></button>' : ""}</figure>`).join("");
    if (col) col.append(host);
    else {
      const tools = line.querySelector(".repo-header-tools");
      tools ? line.insertBefore(host, tools) : line.append(host);
    }
    host.querySelectorAll(".fp-gauge").forEach(f => { faces[f.dataset.k] = f; if (f.dataset.k === "ias" || f.dataset.k === "vs") drag(f); });
    // bouton à trois états de la jauge carburant : loi réglée → économique → profil (couleur de la série)
    // (clic sur le bouton ou sur le cadran lui-même)
    const cycleFuel = () => {
      fuelMode = FUEL_MODES[(FUEL_MODES.indexOf(fuelMode) + 1) % FUEL_MODES.length];
      try { localStorage.setItem("flightPerfFuelGauge", fuelMode); } catch {}
      api.onRefresh ? api.onRefresh() : state && (drawFuel(state), drawTime(state)); // la vue recalcule la lecture choisie
    };
    // carburant et horloge partagent la lecture : un clic sur l'un change les deux
    for (const k of ["fuel", "time"]) { faces[k].querySelector(".fp-fuel-mode").onclick = cycleFuel; faces[k].querySelector("svg").addEventListener("click", cycleFuel); }
    const css = document.createElement("style");
    css.textContent = `.fp-instruments{display:flex;gap:6px;align-items:center;margin:2px 6px}.fp-instruments[hidden]{display:none}
.fp-gauge{margin:0;display:flex;flex-direction:column;align-items:center;gap:1px}.fp-gauge svg{width:62px;height:62px;display:block;border-radius:50%;box-shadow:0 0 0 2px #2b3440,0 2px 6px #0008;background:#0b0e12}
.fp-gauge[data-k="ias"] svg,.fp-gauge[data-k="vs"] svg{cursor:ns-resize;touch-action:none}.fp-gauge[data-k="fuel"] svg,.fp-gauge[data-k="time"] svg{cursor:pointer}
.fp-fuel-mode{margin-top:3px;padding:2px 10px;border-radius:999px;border:1px solid currentColor;background:transparent;font:600 10.5px/1.3 Inter,system-ui,Segoe UI,Arial,sans-serif;cursor:pointer}
.fp-gauge figcaption{font:10px/1.15 Inter,system-ui,Segoe UI,Arial,sans-serif;text-align:center;white-space:nowrap;opacity:.95;font-variant-numeric:tabular-nums}
@media (max-width:720px){.fp-gauge svg{width:46px;height:46px}.fp-gauge figcaption{font-size:9px}}`;
    document.head.append(css);
    return true;
  }

  /** Réglage à la souris d'un cadran (Badin ou vario) : glisser verticalement (1 pas tous les 4 px) ou molette. */
  function drag(fig) {
    const svg = fig.querySelector("svg"), key = fig.dataset.k;
    const step = () => key === "ias" ? 5 : 50;
    const current = () => key === "ias" ? state.iasSet : (state.full ? state.vsMax : state.vsSet);
    const set = v => {
      const lo = key === "ias" ? state.iasMin : 100, hi = key === "ias" ? state.iasMax : state.vsMax;
      v = Math.min(hi, Math.max(lo, Math.round(v / step()) * step()));
      if (v !== current()) api.onSet?.(key === "ias" ? "ias" : "vs", v);
    };
    let y0 = null, v0 = 0;
    svg.addEventListener("pointerdown", e => { if (!state) return; y0 = e.clientY; v0 = current(); svg.setPointerCapture(e.pointerId); e.preventDefault(); });
    svg.addEventListener("pointermove", e => { if (y0 == null || !state) return; set(v0 + Math.round((y0 - e.clientY) / 4) * step()); });
    const end = () => { y0 = null; };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
    svg.addEventListener("wheel", e => { if (!state) return; e.preventDefault(); set(current() + (e.deltaY < 0 ? 1 : -1) * step()); }, { passive: false });
  }

  /** Aiguille (polygone effilé) à l'angle a, longueur r, largeur w, couleur col. */
  const needle = (a, r, w, col) => {
    if (skeuo() && (col === "#fff" || col === "#e8edf2")) col = "#f1e8d0";
    const [x, y] = P(a, r), [xl, yl] = P(a - 90, w), [xr, yr] = P(a + 90, w), [xb, yb] = P(a + 180, 8);
    return `<polygon points="${x.toFixed(2)},${y.toFixed(2)} ${xl.toFixed(2)},${yl.toFixed(2)} ${xb.toFixed(2)},${yb.toFixed(2)} ${xr.toFixed(2)},${yr.toFixed(2)}" fill="${col}"${skeuo() ? ' filter="url(#fpSh)" stroke="#000" stroke-opacity=".35" stroke-width=".3"' : ""}/>`;
  };
  /** Repère de consigne (triangle violet sur le bord) à l'angle a. */
  const bug = a => { const [x, y] = P(a, 47), [xl, yl] = P(a - 5, 40), [xr, yr] = P(a + 5, 40); return `<polygon points="${x.toFixed(2)},${y.toFixed(2)} ${xl.toFixed(2)},${yl.toFixed(2)} ${xr.toFixed(2)},${yr.toFixed(2)}" fill="${PURPLE}"/>`; };
  let hub = "";
  const setHub = () => { hub = skeuo() ? `<circle cx="50" cy="50" r="4.6" fill="url(#fpHub)" stroke="url(#fpRim)" stroke-width="1.2" filter="url(#fpSh)"/><circle cx="48.8" cy="48.8" r="1.1" fill="#fff" opacity=".35"/>` : `<circle cx="50" cy="50" r="3.2" fill="#9ba8b5"/>`; };
  setHub();

  /** Badin : 0 → max sur 320° (0 en haut, sens horaire). */
  function drawIas(s) {
    const max = scale.ias, A = v => -160 + 320 * Math.min(1, Math.max(0, v / max)), st = niceStep(max, 8);
    let g = `<path d="${arc(A(s.iasMin), A(s.iasMax), 44)}" stroke="${PURPLE}" stroke-width="3" fill="none" opacity=".55"/>`;
    for (let v = 0; v <= max + 1e-6; v += st / 2) g += tick(A(v), v % st ? 42 : 39, 46, v % st ? .7 : 1.2);
    for (let v = 0; v <= max + 1e-6; v += st) g += num(A(v), 31, nf(v));
    g += `<text x="50" y="66" font-size="7" text-anchor="middle" fill="#9ba8b5">KT</text>`;
    // aiguille TAS semi-transparente (même échelle) : écart Badin / vitesse vraie selon l'altitude et la température
    g += bug(A(s.iasSet)) + `<g opacity=".45">${needle(A(s.tas), 44, 2.6, "#75c8ff")}</g>` + needle(A(s.ias), 42, 2.2, "#fff") + hub;
    g += `<text x="50" y="76" font-size="6" text-anchor="middle" fill="#75c8ff" opacity=".8">TAS</text>`;
    faces.ias.querySelector("svg").innerHTML = frame(g);
    faces.ias.querySelector("figcaption").textContent = `${tl("Badin", "IAS", "IAS", "IAS")} ${nf(s.ias)} kt · TAS ${nf(s.tas)}${s.mach >= .3 ? ` · M${nf(s.mach, 2)}` : ""}`;
  }
  /** Vario : zéro à 9 h, ± échelle sur 170° de part et d'autre (montée vers le haut). */
  function drawVs(s) {
    const max = scale.vs, A = v => -90 + 170 * Math.max(-1, Math.min(1, v / max)), st = niceStep(max, 4);
    let g = "";
    for (let v = -max; v <= max + 1e-6; v += st / 2) g += tick(A(v), Math.abs(v) % st ? 42 : 39, 46, Math.abs(v) % st ? .7 : 1.2);
    for (let v = -max; v <= max + 1e-6; v += st) g += num(A(v), 31, nf(Math.abs(v) / (max >= 2000 ? 1000 : 100)));
    g += `<text x="60" y="38" font-size="5.5" text-anchor="middle" fill="#9ba8b5">UP</text><text x="60" y="66" font-size="5.5" text-anchor="middle" fill="#9ba8b5">DN</text>`;
    g += `<text x="62" y="53" font-size="5" text-anchor="middle" fill="#9ba8b5">${max >= 2000 ? "×1000" : "×100"}</text>`;
    if (!s.full) g += bug(A(s.vsSet));
    else g += `<text x="50" y="30" font-size="7.5" text-anchor="middle" fill="${PURPLE}" font-weight="700">${tl("PG", "FT", "VG", "GF")}</text>`;
    g += needle(A(s.roc), 42, 2.2, "#fff") + hub;
    faces.vs.querySelector("svg").innerHTML = frame(g);
    faces.vs.querySelector("figcaption").textContent = `${tl("Vario", "V/S", "Variometer", "Variómetro")} ${s.above ? tl("plafond", "ceiling", "Gipfelhöhe", "techo") : `${nf(s.roc)} ft/min`}`;
  }
  /** Altimètre : grande aiguille = centaines (1 tour / 1000 ft), petite = milliers (1 tour / 10 000 ft). */
  function drawAlt(s) {
    let g = "";
    for (let i = 0; i < 50; i++) g += tick(i * 7.2, i % 5 ? 43 : 39, 46, i % 5 ? .6 : 1.2);
    for (let i = 0; i < 10; i++) g += num(i * 36, 32, i, 9);
    const h = Math.max(0, s.h);
    g += `<rect x="31" y="56" width="38" height="11" rx="1.5" fill="#000" stroke="#2b3440"/><text x="50" y="64.5" font-size="8" text-anchor="middle" fill="#e8edf2" font-family="ui-monospace,Consolas,monospace">${nf(Math.round(h / 10) * 10)}</text>`;
    g += needle((h % 10000) / 10000 * 360, 25, 3, "#e8edf2") + needle((h % 1000) / 1000 * 360, 42, 1.8, "#fff") + hub;
    faces.alt.querySelector("svg").innerHTML = frame(g);
    faces.alt.querySelector("figcaption").textContent = `${tl("Altimètre", "Altimeter", "Höhenmesser", "Altímetro")} FL${String(Math.round(h / 100)).padStart(3, "0")}`;
  }

  /** Carburant : carburant du trajet entier volé à l'altitude courante (montée à la loi réglée, croisière,
   *  descente), dans l'unité d'affichage ; échelle 0 → trajet le plus coûteux des courbes. */
  function drawFuel(s) {
    const fig = faces.fuel, x = s.fuelBy?.[fuelMode], col = s.fuelColors?.[fuelMode] || "#f0b86e",
      name = { man: tl("loi réglée", "set law", "eingestelltes Gesetz", "ley ajustada"), prof: tl("profil", "profile", "Profil", "perfil"), eco: tl("croisière éco", "eco cruise", "Sparflug", "crucero eco"),
        fast: tl("rapide", "fast", "schnell", "rápida"), vy: "Vy", fuel: tl("montée éco", "eco climb", "Spar-Steigflug", "ascenso eco") }[fuelMode];
    const btn = fig.querySelector(".fp-fuel-mode");
    btn.textContent = name; btn.style.color = col;
    btn.title = tl("Lecture (clic pour changer) : loi réglée → profil → croisière économique → montée rapide → Vy → montée économique ; couleur de la courbe correspondante", "Reading (click to change): set law → profile → economy cruise → fast climb → Vy → economy climb; colour of the matching curve", "Anzeige (Klick zum Wechseln): eingestelltes Gesetz → Profil → Sparflug → schneller Steigflug → Vy → sparsamer Steigflug; Farbe der Kurve", "Lectura (clic para cambiar): ley ajustada → perfil → crucero económico → ascenso rápido → Vy → ascenso económico; color de la curva");
    if (!x) { fig.querySelector("svg").innerHTML = frame(hub); fig.querySelector("figcaption").textContent = `${tl("Carburant trajet", "Trip fuel", "Streckenkraftstoff", "Combustible del trayecto")} —`; fig.hidden = !s.fuelBy; return; }
    fig.hidden = false;
    s = { ...s, fuel: x.fuel, fuelMin: x.minutes };
    const max = Math.max(1, s.fuelMax || s.fuel) * 1.1, st = niceStep(max, 5), top = Math.ceil(max / st) * st, A = v => -120 + 240 * Math.min(1, Math.max(0, v / top));
    let g = `<path d="${arc(A(0), A(top), 44)}" stroke="#2b3440" stroke-width="3" fill="none"/><path d="${arc(A(0), A(s.fuel), 44)}" stroke="${col}" stroke-width="3" fill="none" opacity=".85"/>`;
    for (let v = 0; v <= top + 1e-6; v += st / 2) g += tick(A(v), (v / st) % 1 ? 42 : 39, 46, (v / st) % 1 ? .7 : 1.2);
    const k = top >= 10000 ? 1000 : 1;
    for (let v = 0; v <= top + 1e-6; v += st) g += num(A(v), 31, nf(v / k, k > 1 && st < 1000 ? 1 : 0), 7.5);
    g += `<text x="50" y="62" font-size="6" text-anchor="middle" fill="#9ba8b5">${k > 1 ? "×1000 " : ""}${String(s.fuelUnit || "").toUpperCase()}</text>`;
    g += `<rect x="29" y="68" width="42" height="11" rx="1.5" fill="#000" stroke="#2b3440"/><text x="50" y="76.5" font-size="7.5" text-anchor="middle" fill="${col}" font-family="ui-monospace,Consolas,monospace">${nf(s.fuel)}</text>`;
    g += needle(A(s.fuel), 40, 2.2, "#fff") + hub;
    fig.querySelector("svg").innerHTML = frame(g);
    const h = Number.isFinite(s.fuelMin) ? ` · ${Math.floor(s.fuelMin / 60)} h ${String(Math.round(s.fuelMin % 60)).padStart(2, "0")}` : "";
    fig.querySelector("figcaption").textContent = `${tl("Carburant trajet", "Trip fuel", "Streckenkraftstoff", "Combustible del trayecto")} ${nf(s.fuel)} ${s.fuelUnit || ""}${h}`;
  }

  /** Horloge : temps de vol du trajet entier à l'altitude courante, même lecture que la jauge carburant (courbe
   *  choisie, dans sa couleur) ; petite aiguille = heures (tour de 12 h), grande = minutes. */
  function drawTime(s) {
    const fig = faces.time, x = s.fuelBy?.[fuelMode], col = s.fuelColors?.[fuelMode] || "#f0b86e", btn = fig.querySelector(".fp-fuel-mode"), src = faces.fuel.querySelector(".fp-fuel-mode");
    btn.textContent = src.textContent; btn.style.color = src.style.color; btn.title = src.title;
    fig.hidden = !s.fuelBy;
    if (!x || !Number.isFinite(x.minutes)) { fig.querySelector("svg").innerHTML = frame(hub); fig.querySelector("figcaption").textContent = `${tl("Temps de vol", "Flight time", "Flugzeit", "Tiempo de vuelo")} —`; return; }
    const min = x.minutes, hh = Math.floor(min / 60), mm = Math.round(min % 60), txt = `${hh} h ${String(mm).padStart(2, "0")}`;
    let g = "";
    for (let i = 0; i < 60; i++) g += tick(i * 6, i % 5 ? 43 : 39, 46, i % 5 ? .6 : 1.3);
    for (let i = 1; i <= 12; i++) g += num(i * 30, 32, i, 9);
    // arc de la durée (couleur de la courbe) sur le tour des minutes
    g += `<path d="${arc(0.001, Math.max(.5, Math.min(359.5, (min % 60) / 60 * 360)), 47.5)}" stroke="${col}" stroke-width="2" fill="none" opacity=".75"/>`;
    g += `<rect x="31" y="60" width="38" height="11" rx="1.5" fill="#000" stroke="#2b3440"/><text x="50" y="68.5" font-size="7.5" text-anchor="middle" fill="${col}" font-family="ui-monospace,Consolas,monospace">${txt}</text>`;
    g += needle((min / 60) % 12 * 30, 24, 3, "#e8edf2") + needle((min % 60) * 6, 40, 1.8, col) + hub;
    fig.querySelector("svg").innerHTML = frame(g);
    fig.querySelector("figcaption").textContent = `${tl("Temps de vol", "Flight time", "Flugzeit", "Tiempo de vuelo")} ${txt}`;
  }

  const api = {
    /** Rappel de réglage depuis un cadran : (clé 'ias' | 'vs', valeur) ; défini par la vue. */
    onSet: null,
    /** Rappel pour recalculer les instruments (changement de lecture de la jauge carburant) ; défini par la vue. */
    onRefresh: null,
    /** Lecture choisie de la jauge carburant : 'man' | 'prof' | 'eco' | 'fast' | 'vy' | 'fuel'. */
    fuelMode: () => fuelMode,
    /** Met à jour les cadrans (s : voir l'en-tête) ; null masque le bandeau. */
    update(s) {
      if (!mount()) return;
      state = s;
      host.hidden = !s;
      if (!s) return;
      // échelles fixes pour une plage de curseurs donnée (pas de « saut » d'échelle en survolant les courbes)
      scale.ias = Math.ceil(Math.max(s.iasMax * 1.15, (s.tasMax || 0) * 1.05) / 50) * 50;
      scale.vs = [500, 1000, 2000, 3000, 4000, 6000, 8000].find(v => v >= s.vsMax * 1.05) || Math.ceil(s.vsMax / 2000) * 2000;
      setHub();
      drawIas(s); drawVs(s); drawAlt(s); drawFuel(s); drawTime(s);
      host.title = tl("Instruments de la loi réglée à l’altitude courante (survolée, épinglée, sinon niveau du plan). Badin et vario : glisser ou molette pour régler.",
        "Instruments of the set law at the current altitude (hovered, pinned, otherwise plan level). IAS and V/S: drag or scroll to adjust.",
        "Instrumente des eingestellten Gesetzes auf der aktuellen Höhe (überfahren, angeheftet, sonst Planhöhe). IAS und Steigrate: ziehen oder Mausrad zum Einstellen.",
        "Instrumentos de la ley ajustada a la altitud actual (sobrevolada, fijada o nivel del plan). IAS y régimen: arrastrar o rueda para ajustar.");
    }
  };
  window.FlightInstruments = api;
  // changement de design : cadrans réalistes ou plats
  window.addEventListener("repository-design-change", () => { if (state) api.update(state); });
})();
