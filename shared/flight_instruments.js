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
     - altimètre : grande aiguille = centaines de pieds, petite = milliers ; fenêtre numérique (ft, FL).
   Badin et vario se règlent aussi sur l'instrument : glisser verticalement ou molette (mêmes pas que les
   curseurs : 5 kt, 50 ft/min) — FlightInstruments.onSet(clé, valeur) renvoie la valeur à la vue.

   Interface : window.FlightInstruments = { update(état | null), onSet } ;
     état = { h, ias, iasSet, iasMin, iasMax, tas, tasMax, mach, roc, vsSet, vsMax, full, above } (tasMax : TAS
     la plus grande de la loi, pour l'échelle du Badin).
   ===================================================================================================== */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const tl = (...r) => r[Math.max(0, ["fr", "en", "de", "es"].indexOf(window.RepositoryNav?.getLanguage?.() || "fr"))] || r[0];
  const nf = (v, d = 0) => Number.isFinite(v) ? v.toLocaleString(window.RepositoryNav?.getLanguage?.() || "fr", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—";
  const PURPLE = "#c792ea";

  /** Point du cadran (centre 50, 50) à l'angle a (degrés, 0 = en haut, sens horaire) et au rayon r. */
  const P = (a, r) => { const t = (a - 90) * Math.PI / 180; return [50 + r * Math.cos(t), 50 + r * Math.sin(t)]; };
  /** Arc SVG de a0 à a1 (degrés) au rayon r. */
  const arc = (a0, a1, r) => { const [x0, y0] = P(a0, r), [x1, y1] = P(a1, r); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  /** Graduation : trait radial de r0 à r1 à l'angle a. */
  const tick = (a, r0, r1, w = 1) => { const [x0, y0] = P(a, r0), [x1, y1] = P(a, r1); return `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="#e8edf2" stroke-width="${w}"/>`; };
  /** Chiffre de graduation à l'angle a. */
  const num = (a, r, t, s = 8) => { const [x, y] = P(a, r); return `<text x="${x.toFixed(1)}" y="${(y + s * .35).toFixed(1)}" font-size="${s}" text-anchor="middle" fill="#e8edf2">${t}</text>`; };
  /** Pas « rond » (1, 2, 5 × 10ⁿ) pour environ n graduations sur la plage span. */
  const niceStep = (span, n) => { const raw = span / n, p = 10 ** Math.floor(Math.log10(raw)), k = raw / p; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * p; };

  let host = null, faces = {}, state = null, scale = {};

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
    host.innerHTML = ["ias", "vs", "alt"].map(k => `<figure class="fp-gauge" data-k="${k}"><svg viewBox="0 0 100 100" aria-hidden="true"></svg><figcaption></figcaption></figure>`).join("");
    if (col) col.append(host);
    else {
      const tools = line.querySelector(".repo-header-tools");
      tools ? line.insertBefore(host, tools) : line.append(host);
    }
    host.querySelectorAll(".fp-gauge").forEach(f => { faces[f.dataset.k] = f; if (f.dataset.k !== "alt") drag(f); });
    const css = document.createElement("style");
    css.textContent = `.fp-instruments{display:flex;gap:6px;align-items:center;margin:2px 6px}.fp-instruments[hidden]{display:none}
.fp-gauge{margin:0;display:flex;flex-direction:column;align-items:center;gap:1px}.fp-gauge svg{width:62px;height:62px;display:block;border-radius:50%;box-shadow:0 0 0 2px #2b3440,0 2px 6px #0008;background:#0b0e12}
.fp-gauge[data-k="ias"] svg,.fp-gauge[data-k="vs"] svg{cursor:ns-resize;touch-action:none}
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
    const [x, y] = P(a, r), [xl, yl] = P(a - 90, w), [xr, yr] = P(a + 90, w), [xb, yb] = P(a + 180, 8);
    return `<polygon points="${x.toFixed(2)},${y.toFixed(2)} ${xl.toFixed(2)},${yl.toFixed(2)} ${xb.toFixed(2)},${yb.toFixed(2)} ${xr.toFixed(2)},${yr.toFixed(2)}" fill="${col}"/>`;
  };
  /** Repère de consigne (triangle violet sur le bord) à l'angle a. */
  const bug = a => { const [x, y] = P(a, 47), [xl, yl] = P(a - 5, 40), [xr, yr] = P(a + 5, 40); return `<polygon points="${x.toFixed(2)},${y.toFixed(2)} ${xl.toFixed(2)},${yl.toFixed(2)} ${xr.toFixed(2)},${yr.toFixed(2)}" fill="${PURPLE}"/>`; };
  const hub = `<circle cx="50" cy="50" r="3.2" fill="#9ba8b5"/>`;

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
    faces.ias.querySelector("svg").innerHTML = g;
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
    faces.vs.querySelector("svg").innerHTML = g;
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
    faces.alt.querySelector("svg").innerHTML = g;
    faces.alt.querySelector("figcaption").textContent = `${tl("Altimètre", "Altimeter", "Höhenmesser", "Altímetro")} FL${String(Math.round(h / 100)).padStart(3, "0")}`;
  }

  const api = {
    /** Rappel de réglage depuis un cadran : (clé 'ias' | 'vs', valeur) ; défini par la vue. */
    onSet: null,
    /** Met à jour les cadrans (s : voir l'en-tête) ; null masque le bandeau. */
    update(s) {
      if (!mount()) return;
      state = s;
      host.hidden = !s;
      if (!s) return;
      // échelles fixes pour une plage de curseurs donnée (pas de « saut » d'échelle en survolant les courbes)
      scale.ias = Math.ceil(Math.max(s.iasMax * 1.15, (s.tasMax || 0) * 1.05) / 50) * 50;
      scale.vs = [500, 1000, 2000, 3000, 4000, 6000, 8000].find(v => v >= s.vsMax * 1.05) || Math.ceil(s.vsMax / 2000) * 2000;
      drawIas(s); drawVs(s); drawAlt(s);
      host.title = tl("Instruments de la loi réglée à l’altitude courante (survolée, épinglée, sinon niveau du plan). Badin et vario : glisser ou molette pour régler.",
        "Instruments of the set law at the current altitude (hovered, pinned, otherwise plan level). IAS and V/S: drag or scroll to adjust.",
        "Instrumente des eingestellten Gesetzes auf der aktuellen Höhe (überfahren, angeheftet, sonst Planhöhe). IAS und Steigrate: ziehen oder Mausrad zum Einstellen.",
        "Instrumentos de la ley ajustada a la altitud actual (sobrevolada, fijada o nivel del plan). IAS y régimen: arrastrar o rueda para ajustar.");
    }
  };
  window.FlightInstruments = api;
})();
