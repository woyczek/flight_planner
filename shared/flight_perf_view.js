/* =====================================================================================================
   Flight Performance Planner — vue des courbes de performances
   -----------------------------------------------------------------------------------------------------
   Dessine, à partir du modèle calibré (shared/flight_performance_model.js, FlightPerfModel) :
     1. l'altitude optimale : carburant du trajet entier selon le niveau de croisière ;
     2. la montée : vario et carburant par 1000 ft selon l'altitude ;
     3. les vitesses de montée : Badin à tenir selon l'altitude, pour chaque objectif ;
     4. la comparaison des lois de montée, la table par altitude et les régimes RPM / N1.

   Mise en page (flight_performance_planner.html) : colonne gauche = saisie, courbes et tables ;
   colonne droite (#perfSide) = bloc Résultat puis un panneau d'explications par courbe. Ces cadres
   « semi-mobiles » sont gérés par le framework (shared/sticky_frame.js, StickyFrame.follow) : chaque
   panneau arrive avec sa courbe, reste sous le bloc Résultat tant qu'elle est à l'écran, repart avec elle.

   Loi de montée réglable (violet) : deux curseurs verticaux autour de chaque courbe — vario visé à
   gauche, Badin à droite — partagés par les trois courbes. Les gaz sont réduits pour tenir le vario,
   plein gaz au-delà (FlightPerfModel : manualLaw / manualPoint).

   Jauges : les trois courbes ont l'altitude en abscisse ; survoler l'une place la jauge sur les trois,
   un clic épingle le niveau (trait blanc) ; la fiche ⌖ / 📌 du bloc Résultat résume ce niveau.

   Couleurs : une par série (COL), portée par le trait de la courbe et par le LIBELLÉ seulement — les
   valeurs restent en texte normal. Définitions (Vy, Vx, Badin…) au survol des termes soulignés.

   Dépendances : globales de la page — $(id), tl(fr, en, de, es), typo(html), fmt(x, décimales),
   f3(x), flTxt(ft), hmTxt(minutes), fuelUnit(), convertFuel(v, de, vers), showFuel(v), escXml(s),
   active (profil courant), perfModel() ; FlightPerfModel ; StickyFrame.

   Point d'entrée : renderAltitudeOptimum(c), appelé par calculate() avec
     c = { D : distance (NM), FL : niveau du plan (centaines de ft), windKnown : vent saisi,
           wc : composante de vent sur la route (kt, + = arrière), low / high : fourchette si vent inconnu,
           climbFF / cruiseFF / descentFF : débits du profil (unité du profil) }.
   Sortie : SVG des trois courbes, tables, panneaux #panelOpt… et window.altitudeOptimum (fiche curseur).
   ===================================================================================================== */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------------------------------
  // Constantes et petits utilitaires d'affichage
  // ---------------------------------------------------------------------------------------------------

  /** Couleur de chaque série (trait de courbe et libellé), accordée à la palette des graphiques (Apparence ›
   *  Graphiques : laiton en Cabinet et Carnet de vol, kaki en Durci…) ; les courbes lisent les mêmes couleurs dans les
   *  variables --fc-<série> (feuille de style de la page). */
  const COL0 = {
    prof: "#75c8ff",
    eco: "#7ed69b",
    fast: "#f0b86e",
    man: "#c792ea",
    ref: "#9ba8b5"
  };
  /** Couleur accordée au design courant (RepositoryNav.chartColor), sinon telle quelle. */
  const tint = c => window.RepositoryNav?.chartColor?.(c) ?? c;
  const COL = new Proxy(COL0, {
    /** Couleur de la série k, accordée au design à chaque lecture. */
    get: (o, k) => tint(o[k])
  });
  /** Publie les couleurs des séries en variables CSS (--fc-<série>) pour les libellés et les feuilles de style. */
  const setChartVars = () => {
    for (const k of Object.keys(COL0)) document.documentElement.style.setProperty(`--fc-${k}`, COL[k]);
  };
  setChartVars();
  window.addEventListener("load", setChartVars);
  // changement de design, de palette ou de style : couleurs et graphiques refaits
  window.addEventListener("repository-design-change", () => {
    setChartVars();
    window.FlightPerfView?.renderAll();
  });
  const SVGNS = "http://www.w3.org/2000/svg";

  /** Libellé coloré d'une série : seul le titre porte la couleur, la valeur qui suit reste neutre. */
  const lab = (text, col) => `<span class="k" style="color:${col}">${text}</span>`;
  /** Trait de légende (couleur de la série ; dash : pointillés). */
  const sw = (col, dash) => `<i class="sw${dash ? " dash" : ""}" style="border-color:${col}"></i>`;
  /** Conversion d'une quantité de carburant (unité du profil) vers l'unité affichée. */
  const cv = v => convertFuel(v, active.unit, fuelUnit());

  /** Définitions affichées au survol : terme → [fr, en, de, es]. */
  const DEFS = {
    Vy: ["vitesse du meilleur taux de montée : le plus d’altitude par minute", "best rate-of-climb speed: most altitude per minute",
      "Geschwindigkeit des besten Steigens: größter Höhengewinn pro Minute",
      "velocidad de mejor régimen de ascenso: más altitud por minuto"
    ],
    Vx: ["vitesse du meilleur angle de montée : le plus d’altitude par distance parcourue",
      "best angle-of-climb speed: most altitude per distance flown",
      "Geschwindigkeit des steilsten Steigens: größter Höhengewinn je Strecke",
      "velocidad de mejor ángulo: más altitud por distancia recorrida"
    ],
    Badin: ["vitesse indiquée (IAS), celle de l’anémomètre", "indicated airspeed (IAS), read on the airspeed indicator",
      "angezeigte Fluggeschwindigkeit (IAS)", "velocidad indicada (IAS), la del anemómetro"
    ],
    TAS: ["vitesse vraie : augmente avec l’altitude à Badin constant", "true airspeed: increases with altitude at constant IAS",
      "wahre Fluggeschwindigkeit: steigt mit der Höhe bei konstanter IAS",
      "velocidad verdadera: aumenta con la altitud a IAS constante"
    ],
    prof: [
      "croisière du profil : Mach (réacteur) ou puissance (hélice) de croisière enregistrés dans le profil — votre croisière habituelle",
      "profile cruise: cruise Mach (jet) or power (propeller) stored in the profile — your usual cruise",
      "Profil-Reiseflug: im Profil gespeicherte Reise-Mach (Strahl) oder -Leistung (Propeller)",
      "crucero del perfil: Mach (reactor) o potencia (hélice) de crucero guardados en el perfil"
    ],
    eco: ["croisière économique : vitesse de distance maximale (jamais plus rapide que la croisière du profil)",
      "economy cruise: maximum-range speed (never faster than the profile cruise)",
      "Spar-Reiseflug: Geschwindigkeit größter Reichweite (nie schneller als der Profil-Reiseflug)",
      "crucero económico: velocidad de alcance máximo (nunca más rápida que el crucero del perfil)"
    ],
    climbSpd: ["Badin de montée enregistré dans le profil (champ Montée › Badin) ; réacteur : puis Mach de croisière en altitude",
      "climb IAS stored in the profile (Climb › IAS field); jet: then cruise Mach at altitude",
      "im Profil gespeicherte Steig-IAS (Feld Steigflug › IAS); Strahl: darüber Reise-Mach",
      "IAS de ascenso guardada en el perfil (campo Ascenso › IAS); reactor: luego Mach de crucero"
    ],
  };
  /** Terme souligné avec sa définition au survol ; label : texte affiché (défaut : la clé). */
  const def = (key, label = key) => `<abbr title="${escXml(tl(...DEFS[key]))}">${label}</abbr>`;

  /** Libellés récurrents (4 langues). */
  const L = {
    prof: () => tl("croisière du profil", "profile cruise", "Profil-Reiseflug", "crucero del perfil"),
    eco: () => tl("croisière économique", "economy cruise", "Spar-Reiseflug", "crucero económico"),
    fast: () => tl("rapide", "fast", "schnell", "rápida"),
    fuelLaw: () => tl("économique", "economy", "sparsam", "económica"),
    man: () => tl("loi réglée", "set law", "eingestelltes Gesetz", "ley ajustada"),
    climbSpd: () => tl("vitesse de montée du profil", "profile climb speed", "Profil-Steiggeschwindigkeit",
      "velocidad de ascenso del perfil"),
    full: () => tl("plein gaz", "full throttle", "Vollgas", "gases a fondo"),
    per1000: () => `${fuelUnit()} / 1000 ft`,
    read: () => tl("Lecture", "Reading", "Lesen", "Lectura"),
  };

  // ---------------------------------------------------------------------------------------------------
  // État de la vue
  // ---------------------------------------------------------------------------------------------------

  /** m : modèle du dernier calcul ; c : paramètres du trajet ; cache : calculs lourds (lois optimales) pour
   *  que les curseurs ne recalculent que le violet ; manual : loi réglable. */
  const S = {
    m: null,
    c: null,
    cache: null,
    manual: null
  };

  // ---------------------------------------------------------------------------------------------------
  // Jauges synchronisées et niveau épinglé
  // ---------------------------------------------------------------------------------------------------

  const sync = {
    charts: [],
    pinned: null,
    /** Oublie les courbes enregistrées (nouveau calcul). */
    reset() {
      this.charts = [];
    },
    /** Altitude (ft) sous le pointeur e pour la courbe c (géométrie du viewBox : W, L, R, xmax). */
    hOf(c, e) {
      const b = c.svg.getBoundingClientRect();
      return Math.min(c.xmax, Math.max(0, ((e.clientX - b.left) / (b.width || 1) * c.W - c.L) / (c.W - c.L - c.R) * c.xmax));
    },
    /** Enregistre (ou remplace) une courbe : c = { svg, hit, W, L, R, T, bottom, xmax, show(h), leave() }.
     *  show(h) place la jauge de la courbe à l'altitude h et remplit son relevé ; leave() les masque. */
    add(c) {
      this.charts = this.charts.filter(x => x.svg !== c.svg);
      this.charts.push(c);
      c.hit.onpointermove = e => this.at(this.hOf(c, e));
      c.hit.onpointerdown = e => this.at(this.hOf(c, e));
      c.hit.onpointerleave = () => this.at(null);
      c.hit.onclick = e => this.pin(this.hOf(c, e));
      c.hit.style.cursor = "crosshair";
      if (this.pinned != null) this.drawPin(c, this.pinned);
    },
    /** Jauges de toutes les courbes à l'altitude h ; h nul : retour au niveau épinglé (ou jauges masquées). */
    at(h) {
      const lvl = h ?? this.pinned;
      renderPinned(h);
      for (const c of this.charts)(lvl == null || lvl > c.xmax + 1) ? c.leave() : c.show(lvl);
    },
    /** Épingle l'altitude h (arrondie à 100 ft) : trait blanc sur toutes les courbes. */
    pin(h) {
      this.pinned = Math.round(h / 100) * 100;
      this.charts.forEach(c => this.drawPin(c, this.pinned));
      renderPinned();
      window.planQuote?.();
    },
    /** Retire l'épingle. */
    unpin() {
      this.pinned = null;
      this.charts.forEach(c => c.svg.querySelector(".pin")?.setAttribute("visibility", "hidden"));
      this.at(null);
      window.planQuote?.();
    },
    /** Trait d'épingle de la courbe c à l'altitude h (créé au besoin, sous la zone de survol). */
    drawPin(c, h) {
      let l = c.svg.querySelector(".pin");
      if (!l) {
        l = document.createElementNS(SVGNS, "line");
        l.setAttribute("class", "pin");
        c.svg.insertBefore(l, c.hit);
      }
      const x = c.L + Math.min(h, c.xmax) / c.xmax * (c.W - c.L - c.R);
      for (const [k, v] of [
          ["x1", x],
          ["x2", x],
          ["y1", c.T],
          ["y2", c.bottom]
        ]) l.setAttribute(k, v);
      l.setAttribute("visibility", h > c.xmax + 1 ? "hidden" : "visible");
    },
  };
  /** Largeur logique (viewBox) d'une courbe de hauteur logique H : la hauteur affichée reste bornée (≈ 36 % de la
   *  fenêtre, 200 à 330 px pour la plus haute) — sur une colonne large, la courbe s'élargit au lieu de grandir ;
   *  même échelle (taille de texte) pour toutes les courbes. Met à jour le viewBox du SVG. */
  function chartW(svg, H) {
    const wrapW = Math.max(300, (svg.parentElement?.clientWidth || 540) - 90), // moins les deux curseurs verticaux
      px = Math.min(330, Math.max(200, innerHeight * .36)) / 270, // pixels par unité, commun aux courbes
      W = Math.max(540, Math.round(wrapW / px));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    return W;
  }
  /** Prolonge une série au-delà du plafond ceil : un point non calculable (ok faux) y est remplacé par l'extrapolation
   *  linéaire des deux derniers points valides (valeurs keys, bornées à 0 ; extrap: true). Sous le plafond : inchangée. */
  function extendSeries(list, ceil, keys) {
    const out = [],
      valid = [];
    for (const r of list) {
      if (r?.ok || !r || r.h <= ceil || valid.length < 2) {
        out.push(r);
        if (r?.ok) valid.push(r);
        continue;
      }
      const a = valid[valid.length - 2],
        b = valid[valid.length - 1],
        t = (r.h - b.h) / ((b.h - a.h) || 1),
        o = {
          ...b,
          h: r.h,
          ok: true,
          extrap: true
        };
      for (const k of keys)
        if (Number.isFinite(a[k]) && Number.isFinite(b[k])) o[k] = Math.max(0, b[k] + (b[k] - a[k]) * t);
      out.push(o);
      valid.push(o);
    }
    return out;
  }
  const TRIP_KEYS = ["fuel", "minutes", "tas", "ias", "mach", "gs", "ff"];
  /** Explications des zones d'un graphique, sous le graphique (id de la liste ; items : [libellé, texte]). */
  const zoneNotes = (id, items) => {
    const ul = $(id);
    if (!ul) return;
    ul.hidden = !items.length;
    ul.innerHTML = typo(items.map(([k, v]) => `<li><b>${escXml(k)}</b> : ${escXml(v)}</li>`).join(""));
  };
  /** Zone au-delà du plafond : libellé et cause (plafond du profil, ou calculé : vario résiduel du modèle). */
  const ceilingNote = m => [tl("Zone grisée « inaccessible »", "Grey “unreachable” zone", "Graue Zone „unerreichbar“",
      "Zona gris «inaccesible»"),
    m.ceilingGiven && m.ceilingGiven < m.modelCeiling ?
    tl(`au-dessus du plafond ${flTxt(m.ceiling)}, fixé par le profil (champ « Plafond max ») ou le type ; le modèle monterait jusqu’à ${flTxt(m.modelCeiling)}. Courbes prolongées à titre indicatif.`, `above the ${flTxt(m.ceiling)} ceiling, set by the profile (“Maximum ceiling” field) or the type; the model would climb to ${flTxt(m.modelCeiling)}. Curves extended for reference only.`, `über der Gipfelhöhe ${flTxt(m.ceiling)}, vom Profil („Maximale Gipfelhöhe“) oder vom Typ festgelegt; das Modell stiege bis ${flTxt(m.modelCeiling)}. Kurven nur zur Orientierung verlängert.`, `por encima del techo ${flTxt(m.ceiling)}, fijado por el perfil (campo «Techo máximo») o el tipo; el modelo subiría hasta ${flTxt(m.modelCeiling)}. Curvas prolongadas solo como referencia.`) :
    tl(`au-dessus du plafond ${flTxt(m.ceiling)} calculé par le modèle : l’avion n’y monte plus qu’à ${m.kind === "piston" ? 100 : 300} ft/min (puissance disponible en baisse avec l’altitude). Courbes prolongées à titre indicatif.`, `above the ${flTxt(m.ceiling)} ceiling computed by the model: the aircraft only climbs at ${m.kind === "piston" ? 100 : 300} ft/min there (available power drops with altitude). Curves extended for reference only.`, `über der vom Modell berechneten Gipfelhöhe ${flTxt(m.ceiling)}: das Flugzeug steigt dort nur noch mit ${m.kind === "piston" ? 100 : 300} ft/min (verfügbare Leistung nimmt mit der Höhe ab). Kurven nur zur Orientierung verlängert.`, `por encima del techo ${flTxt(m.ceiling)} calculado por el modelo: el avión solo sube a ${m.kind === "piston" ? 100 : 300} ft/min (la potencia disponible baja con la altitud). Curvas prolongadas solo como referencia.`)
  ];
  /** Altitude maximale sans oxygène d'un avion non pressurisé (ft) : Paramétrage › Planificateur (fpOxygenAltFt:v1), 10 000 par défaut. */
  const oxygenAltFt = () => {
    try {
      const v = +JSON.parse(localStorage.getItem("fpOxygenAltFt:v1") || "null");
      return v > 0 ? v : 10000;
    } catch {
      return 10000;
    }
  };
  /** Zone grisée « inaccessible » d'une courbe, du plafond (ceil) au bout de l'axe (xmax) ; X : abscisse d'une altitude. */
  const beyondZone = (X, T, bottom, ceil, xmax) => ceil < xmax - 1 ?
    `<rect class="beyond" x="${X(ceil).toFixed(1)}" y="${T}" width="${(X(xmax) - X(ceil)).toFixed(1)}" height="${bottom - T}"/><line class="beyond-edge" x1="${X(ceil).toFixed(1)}" x2="${X(ceil).toFixed(1)}" y1="${T}" y2="${bottom}"/>` +
    `<text class="beyond-label" x="${((X(ceil) + X(xmax)) / 2).toFixed(1)}" y="${T + 11}" text-anchor="middle">${tl("inaccessible", "unreachable", "unerreichbar", "inaccesible")}</text>` : "";
  /** Place la ligne de jauge (élément SVG id) à l'abscisse x et l'affiche. */
  const cursorAt = (id, x) => {
    const l = $(id);
    l.setAttribute("x1", x);
    l.setAttribute("x2", x);
    l.setAttribute("visibility", "visible");
  };

  // ---------------------------------------------------------------------------------------------------
  // Loi de montée réglable : état et curseurs verticaux
  // ---------------------------------------------------------------------------------------------------

  /** Initialise la loi réglable pour le profil actif et le modèle m, ou garde les réglages s'il s'agit du même
   *  profil. Bornes : Badin 0,8 – 2,6 × Ve_md (réacteur ≤ 360 kt) ; vario 100 ft/min – vario max au sol
   *  (curseur au maximum : plein gaz). Départ : Badin et vario de montée du profil. */
  function ensureManual(m) {
    const p0 = m.climbPoint(0),
      iMin = Math.round(.8 * m.veMd / 5) * 5,
      iMax = Math.round(Math.min(2.6 * m.veMd, m.kind === "jet" ? 360 : 2.6 * m.veMd) / 5) * 5,
      vMax = Math.max(200, Math.ceil(p0.roc / 100) * 100),
      pid = `${active.id}|${iMin}|${iMax}|${vMax}`;
    if (S.manual?.pid === pid) return S.manual;
    const ias = +active.climb?.iasKt || Math.round(p0.vyIas),
      vs = Math.abs(+active.climb?.rateFpm || 0);
    return S.manual = {
      pid,
      iMin,
      iMax,
      vMax,
      ias: Math.min(iMax, Math.max(iMin, Math.round(ias))),
      vs: vs ? Math.min(vMax, vs) : vMax,
      full: !vs || vs >= vMax
    };
  }
  /** Loi h → { ve, frac } des curseurs, à passer à m.trip / m.climbTo / m.manualPoint (null sans modèle). */
  const manualLaw = m => S.manual && m ? m.manualLaw(S.manual.ias, S.manual.full ? 0 : S.manual.vs) : null;
  /** Libellé court de la loi réglée : « 300 kt, 1 800 ft/min » ou « 300 kt, plein gaz ». */
  const manualTxt = () => `${S.manual.ias} kt, ${S.manual.full ? L.full() : `${fmt(S.manual.vs, 0)} ft/min`}`;

  /** Crée une fois, dans un cadre de courbe (.chart-wrap), les deux curseurs verticaux : vario à gauche, Badin à droite. */
  function mountSliders(wrap) {
    if (wrap.querySelector(".vslider")) return;
    /** Curseur vertical (vario visé à gauche, Badin à droite) relié à la loi réglable (setManual). */
    const mk = (side, key) => {
      const d = document.createElement("div");
      d.className = `vslider ${side}`;
      d.innerHTML = `<output></output><input type="range" class="vr" data-key="${key}"><span class="vs-unit">${key === "vs" ? "ft/min" : "kt"}</span>`;
      d.querySelector("input").addEventListener("input", e => setManual(key, +e.target.value));
      return d;
    };
    wrap.prepend(mk("left", "vs"));
    wrap.append(mk("right", "ias"));
  }
  /** Bornes, valeurs, bulles et hauteur de tous les curseurs (alignés sur la zone tracée de leur courbe). */
  function syncSliders() {
    const q = S.manual;
    document.querySelectorAll("#optBlock .chart-wrap").forEach(wrap => {
      mountSliders(wrap);
      const svg = wrap.querySelector("svg");
      wrap.classList.toggle("no-sliders", !q || svg.hidden);
      if (!q || svg.hidden) return;
      for (const d of wrap.querySelectorAll(".vslider")) {
        const inp = d.querySelector("input"),
          vs = inp.dataset.key === "vs";
        Object.assign(inp, vs ? {
          min: 100,
          max: q.vMax,
          step: 50
        } : {
          min: q.iMin,
          max: q.iMax,
          step: 5
        });
        inp.value = vs ? (q.full ? q.vMax : q.vs) : q.ias;
        d.querySelector("output").textContent = vs ? (q.full ? "max" : fmt(q.vs, 0)) : q.ias;
        d.title = vs ?
          tl("Loi réglée — vario visé (en haut : plein gaz)", "Set law — target rate (top: full throttle)",
            "Eingestelltes Gesetz — Ziel-Steigrate (oben: Vollgas)", "Ley ajustada — régimen objetivo (arriba: gases a fondo)") :
          tl("Loi réglée — Badin de montée", "Set law — climb IAS", "Eingestelltes Gesetz — Steig-IAS",
            "Ley ajustada — IAS de ascenso");
      }
    });
    alignSliders();
    feedInstruments();
  }
  /** Instruments du bandeau (shared/flight_instruments.js) : loi réglée à l'altitude survolée (hover), sinon
   *  épinglée, sinon niveau du plan ; masqués sans modèle. Badin et vario réglés sur l'instrument → setManual. */
  function feedInstruments(hover) {
    const FI = window.FlightInstruments,
      m = S.m,
      q = S.manual;
    if (!FI) return;
    FI.onSet ||= (k, v) => setManual(k, v);
    FI.onRefresh ||= () => feedInstruments(); // changement de lecture de la jauge carburant
    if (!m || !q) return FI.update(null);
    try {
      const h = hover ?? sync.pinned ?? (S.c?.FL > 0 ? S.c.FL * 100 : 0),
        above = h > m.ceiling,
        hh = Math.min(h, m.ceiling),
        p = m.manualPoint(hh, manualLaw(m)),
        a = FlightPerfModel.isa(hh).a;
      const tasMax = Math.max(p.tas, m.manualPoint(m.ceiling, manualLaw(m)).tas || 0, m.cruise(Math.min((S.c?.FL || 0) * 100, m.ceiling),
        "normal")?.tas || 0);
      // carburant du trajet entier volé à ce niveau (montée à la loi réglée) ; échelle : trajet le plus coûteux des courbes
      // lecture choisie sur la jauge (une seule calculée : les lois optimisées sont coûteuses) — une par courbe :
      // loi réglée, profil, croisière économique, montée rapide, Vy, montée économique
      const D = S.c?.D,
        wc = S.c?.wc || 0,
        tr = r => r?.ok ? {
          fuel: cv(r.fuel),
          minutes: r.minutes
        } : null,
        mode = FI.fuelMode?.() || "man";
      const tripFor = {
        man: () => m.trip(hh, D, wc, "normal", manualLaw(m)),
        prof: () => m.trip(hh, D, wc, "normal", "profile"),
        eco: () => m.trip(hh, D, wc, "eco"),
        fast: () => m.trip(hh, D, wc, "normal", "time"),
        vy: () => m.trip(hh, D, wc, "normal", "vy"),
        fuel: () => m.trip(hh, D, wc, "normal", "fuel")
      };
      const fuelBy = D > 0 ? {
          [mode]: tr((tripFor[mode] || tripFor.man)())
        } : null,
        fuelMax = Math.max(...[...(S.cache?.norm || []), ...(S.cache?.eco || [])].filter(r => r?.ok).map(r => cv(r.fuel)), ...Object
          .values(fuelBy || {}).filter(Boolean).map(x => x.fuel), 0);
      FI.update({
        h,
        ias: p.ias,
        iasSet: q.ias,
        iasMin: q.iMin,
        iasMax: q.iMax,
        tas: p.tas,
        tasMax,
        mach: p.tas / a,
        fuelBy,
        fuelMax,
        fuelUnit: fuelUnit(),
        fuelColors: {
          man: COL.man,
          prof: COL.prof,
          eco: COL.eco,
          fast: COL.fast,
          vy: COL.prof,
          fuel: COL.eco
        },
        roc: above ? 0 : p.roc,
        vsSet: q.vs,
        vsMax: q.vMax,
        full: q.full,
        above
      });
    } catch (e) {
      console.error("Instruments :", e);
      FI.update(null);
    }
  }
  /** Hauteur des curseurs = hauteur de la zone tracée (marges T / B du viewBox, en data-t / data-b du SVG). */
  function alignSliders() {
    document.querySelectorAll("#optBlock .chart-wrap").forEach(wrap => {
      const svg = wrap.querySelector("svg");
      if (svg.hidden) return;
      const r = svg.getBoundingClientRect(),
        k = r.height / (svg.viewBox.baseVal.height || 1),
        t = (+svg.dataset.t || 0) * k,
        b = (+svg.dataset.b || 0) * k;
      wrap.querySelectorAll(".vslider").forEach(d => {
        d.style.paddingTop = Math.max(0, t - 18) + "px";
        d.querySelector("input").style.height = Math.max(60, r.height - t - b) + "px";
      });
    });
  }
  /** Nouvelle valeur d'un curseur (key 'vs' ou 'ias') : état, curseurs jumeaux, puis redessin différé. */
  function setManual(key, v) {
    const q = S.manual;
    if (!q) return;
    if (key === "vs") {
      q.vs = v;
      q.full = v >= q.vMax;
    } else q.ias = v;
    syncSliders();
    clearTimeout(setManual.t);
    setManual.t = setTimeout(() => {
      if (S.m) renderAll(S.m, S.c);
      window.planQuote?.();
    }, 40);
  }

  // ---------------------------------------------------------------------------------------------------
  // Limites du calcul et causes d'un « inatteignable »
  // ---------------------------------------------------------------------------------------------------

  // Mentions de champs : liens qui amènent au champ (FlightProfileHelp.link ; texte seul si le module manque).
  const fieldLink = (target, text) => window.FlightProfileHelp?.link ? FlightProfileHelp.link(target, text) : text;
  /** Mentions des champs plafond du profil, niveau et distance (liens vers le champ), dans la langue de la page. */
  const F_CEIL = () => fieldLink("cruise.ceilingFt", tl("champ « Plafond max (ft) » du profil (Croisière)",
      "profile field “Maximum ceiling (ft)” (Cruise)", "Profilfeld „Maximale Gipfelhöhe (ft)“ (Reiseflug)",
      "campo «Techo máximo (ft)» del perfil (Crucero)")),
    F_FL = () => fieldLink("#fl", tl("champ « Niveau (FL) »", "“Level (FL)” field", "Feld „Flugfläche (FL)“", "campo «Nivel (FL)»")),
    F_DIST = () => fieldLink("#dist", tl("champ « Distance (NM) »", "“Distance (NM)” field", "Feld „Distanz (NM)“",
      "campo «Distancia (NM)»"));

  /** Distance minimale (NM) pour monter à h avec la loi law ('profile' | 'vy' | 'time' | 'fuel' | fonction) puis
   *  redescendre ; null si le niveau n'est pas tenable. */
  function minDistance(m, h, law = "profile") {
    const k = m.cruise(h, "normal");
    if (!k.ok) return null;
    const sp = law === "time" || law === "fuel" ? m.climbLaw(law, k) : law,
      cl = h > 0 ? m.climbTo(h, {
        speed: sp
      }) : {
        nm: 0
      };
    return cl ? cl.nm + m.desc.tas * h / m.desc.rate / 60 : null;
  }
  /** HTML des limites : plafond retenu et sa source, niveau demandé, niveau le plus haut possible sur la distance,
   *  croisière tenable (réacteur), avertissements avec le champ à modifier. hs : niveaux étudiés (ft). */
  function limitsHtml(m, c, hs) {
    const req = c.FL * 100,
      ceil = Math.floor(m.ceiling / 100) * 100;
    const src = m.ceilingGiven && m.ceilingGiven <= m.modelCeiling ?
      `${tl("donné par le", "from the", "aus dem", "del")} ${F_CEIL()}` :
      `${tl("calculé par le modèle (vario résiduel", "computed by the model (residual rate", "vom Modell berechnet (Reststeigrate", "calculado por el modelo (régimen residual")} ${m.kind === "piston" ? 100 : 300} ft/min${m.ceilingGiven ? `, ${tl("le profil indique", "the profile says", "Profil nennt", "el perfil indica")} ${fmt(m.ceilingGiven, 0)} ft` : ""})`;
    const reach = hs.map(h => m.trip(h, c.D, c.wc, "normal")).filter(r => r.ok).pop(),
      need = req <= m.ceiling ? minDistance(m, req) : null;
    const rows = [
      [tl("Plafond", "Ceiling", "Gipfelhöhe", "Techo"), `${flTxt(ceil)} — ${src}`],
      [tl("Niveau demandé", "Requested level", "Angeforderte Höhe", "Nivel pedido"), flTxt(req)],
      [`${tl("Plus haut possible sur", "Highest possible over", "Höchstmöglich auf", "Más alto posible en")} ${fmt(c.D, 0)} NM`, reach ? flTxt(reach.h) : "—"],
    ];
    const cr = hs.map(h => m.cruise(h, "normal")),
      held = cr.filter(k => k.ok && !k.limited).pop(),
      lim = cr.find(k => k.ok && k.limited),
      top = cr.filter(k => k.ok).pop();
    if (m.kind === "jet" && lim) rows.push([tl(`Mach ${m.mRef.toFixed(2)} tenable jusqu’à`, `Mach ${m.mRef.toFixed(2)} held up to`, `Mach ${m.mRef.toFixed(2)} haltbar bis`, `Mach ${m.mRef.toFixed(2)} mantenible hasta`), `${flTxt(held?.h ?? 0)} ${tl(`(au-dessus : poussée max., jusqu’à ${flTxt(top?.h ?? 0)})`, `(above: max. thrust, up to ${flTxt(top?.h ?? 0)})`, `(darüber: max. Schub, bis ${flTxt(top?.h ?? 0)})`, `(por encima: empuje máx., hasta ${flTxt(top?.h ?? 0)})`)}`]);
    const warn = [];
    if (req > m.ceiling) warn.push(`${tl("Niveau demandé au-dessus du plafond : montées calculées jusqu’à", "Requested level above the ceiling: climbs computed up to", "Angeforderte Höhe über der Gipfelhöhe: Steigflüge bis", "Nivel pedido por encima del techo: ascensos calculados hasta")} ${flTxt(Math.floor(m.ceiling / 500) * 500)}. ${tl(`Baisser le ${F_FL()} ou corriger le ${F_CEIL()}.`, `Lower the ${F_FL()} or correct the ${F_CEIL()}.`, `${F_FL()} senken oder ${F_CEIL()} korrigieren.`, `Baje el ${F_FL()} o corrija el ${F_CEIL()}.`)}`);
    else if (need != null && need > c.D) warn.push(`${tl("Distance trop courte pour", "Distance too short for", "Entfernung zu kurz für", "Distancia demasiado corta para")} ${flTxt(req)} : ${tl("monter puis redescendre demande", "climbing then descending takes", "Steig- und Sinkflug brauchen", "subir y bajar requiere")} ${fmt(need, 0)} NM. ${tl(`Baisser le ${F_FL()}`, `Lower the ${F_FL()}`, `${F_FL()} senken`, `Baje el ${F_FL()}`)}${reach ? ` (≤ ${flTxt(reach.h)})` : ""} ${tl(`ou allonger la ${F_DIST()}.`, `or increase the ${F_DIST()}.`, `oder ${F_DIST()} erhöhen.`, `o aumente el ${F_DIST()}.`)}`);
    return `<dl class="kvp">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>${warn.map(w => `<p class="perf-warn">⚠ ${w}</p>`).join("")}`;
  }
  /** Cause d'un « inatteignable » de la table comparative (r : résultat de m.trip ; law : loi de montée). */
  function whyNot(m, c, r, h, law) {
    const lower = tl(`baisser le ${F_FL()}`, `lower the ${F_FL()}`, `${F_FL()} senken`, `bajar el ${F_FL()}`);
    if (r.reason === "short") {
      const d = minDistance(m, h, law);
      return `${tl("trajet trop court", "trip too short", "Strecke zu kurz", "trayecto demasiado corto")}${d ? ` (${fmt(d, 0)} NM > ${fmt(c.D, 0)} NM)` : ""} → ${lower} ${tl(`ou allonger la ${F_DIST()}`, `or increase the ${F_DIST()}`, `oder ${F_DIST()} erhöhen`, `o aumentar el ${F_DIST()}`)}`;
    }
    if (r.reason === "ceiling") return `${tl(`vario nul avant ${flTxt(h)} à cette vitesse`, `climb rate reaches zero before ${flTxt(h)} at this speed`, `Steigrate vor ${flTxt(h)} bei dieser Geschwindigkeit null`, `régimen nulo antes de ${flTxt(h)} a esta velocidad`)} → ${lower}`;
    return `${tl("poussée / puissance insuffisante en croisière à", "not enough thrust / power to cruise at", "Schub / Leistung reicht für Reiseflug nicht auf", "empuje / potencia insuficiente para crucero a")} ${flTxt(h)} → ${lower}`;
  }

  // ---------------------------------------------------------------------------------------------------
  // Fiche du curseur (bloc Résultat)
  // ---------------------------------------------------------------------------------------------------

  /** Fiche ⌖ / 📌 du bloc Résultat : trajet, montée et vitesses à l'altitude survolée (hover) ou épinglée.
   *  hover : altitude (ft) sous le pointeur, ou rien pour afficher le niveau épinglé. */
  function renderPinned(hover) {
    feedInstruments(hover);
    const box = $("perfPinned"),
      pinned = sync.pinned,
      o = window.altitudeOptimum,
      h = hover ?? pinned;
    if (!box) return;
    if (h == null || !o) {
      box.innerHTML = "";
      StickyFrame.refresh();
      return;
    }
    const m = o.model,
      c = o.c,
      unit = fuelUnit(),
      k = Math.min(o.eco.length - 1, Math.round(h / 500)),
      kc = m.cruise(Math.min(c.FL * 100, m.ceiling), "normal"),
      cp = h <= m.ceiling ? m.climbPoint(h) : null,
      law = t => h <= m.ceiling ? m.climbOpt(h, t, kc) : null,
      man = manualLaw(m);
    /** Trajet en texte : carburant · durée, « poussée max. » si limité ; « — » sinon. */
    const trip = r => r && r.ok ? `${fmt(cv(r.fuel), 0)} ${unit} · ${hmTxt(r.minutes)}${r.limited ? ` (${tl("poussée max.", "max. thrust", "max. Schub", "empuje máx.")})` : ""}` : "—";
    /** Vitesse et vario d'un point de montée en texte, « — » si absent. */
    const spd = x => x ? `${fmt(x.ias, 0)} kt · ${fmt(x.roc, 0)} ft/min` : "—";
    const isPin = pinned != null && Math.abs(h - pinned) < 1;
    box.innerHTML = typo(`<div class="pinned">
      <div class="pin-head"><b>${isPin ? "📌" : "⌖"} ${flTxt(h)}</b>${pinned != null ? `<button type="button" id="perfUnpin" class="mini">${tl("désépingler", "unpin", "lösen", "soltar")}</button>` : `<span class="mut">${tl("clic sur une courbe : épingler", "click a curve: pin", "Kurve anklicken: anheften", "clic en una curva: fijar")}</span>`}</div>
      <dl class="kvp">
        <dt>${lab(L.prof(), COL.prof)}</dt><dd>${trip(o.norm[k])}</dd>
        <dt>${lab(L.eco(), COL.eco)}</dt><dd>${trip(o.eco[k])}</dd>
        <dt>${tl("Vario max", "Max. rate", "Max. Steigrate", "Régimen máx.")} (${def("Vy")})</dt><dd>${cp ? `${fmt(cp.roc, 0)} ft/min · ${fmt(cp.vyIas, 0)} kt` : tl("au-dessus du plafond", "above the ceiling", "über der Gipfelhöhe", "por encima del techo")}</dd>
        ${cp ? `<dt>${tl("Pente max", "Max. angle", "Max. Steigwinkel", "Ángulo máx.")} (${def("Vx")})</dt><dd>${fmt(cp.vxIas, 0)} kt</dd>` : ""}
        <dt>${lab(L.fast(), COL.fast)}</dt><dd>${spd(law("time"))}</dd>
        <dt>${lab(L.fuelLaw(), COL.eco)}</dt><dd>${spd(law("fuel"))}</dd>
        ${man && h <= m.ceiling ? `<dt>${lab(L.man(), COL.man)}</dt><dd>${spd(m.manualPoint(h, man))}</dd>` : ""}
      </dl></div>`);
    if ($("perfUnpin")) $("perfUnpin").onclick = () => sync.unpin();
    StickyFrame.refresh();
  }

  // ---------------------------------------------------------------------------------------------------
  // Panneaux d'explications (colonne droite)
  // ---------------------------------------------------------------------------------------------------

  /** Bouton « épingler déplié » du bloc Résultat : collé sous l'en-tête, le bloc se compacte (détail masqué) ; épinglé,
   *  il reste déplié. Choix mémorisé dans ce navigateur (fpResultExpanded). */
  function resultPin(res) {
    const KEY = "fpResultExpanded",
      get = () => {
        try {
          return localStorage.getItem(KEY) === "1";
        } catch {
          return false;
        }
      };
    /** Applique l'état mémorisé : bloc déplié ou non, info-bulle et aspect du bouton, cadres recalés. */
    const apply = () => {
      const on = get(),
        b = res.querySelector(".fp-result-pin");
      res.classList.toggle("fp-expanded", on);
      if (!b) return;
      const t = on ? tl("Détacher : le bloc se replie quand il suit la page", "Unpin: the block folds up while it follows the page",
          "Lösen: der Block klappt beim Mitlaufen zusammen", "Soltar: el bloque se pliega al seguir la página") :
        tl("Épingler déplié : le bloc reste entier quand il suit la page",
          "Pin expanded: the block stays whole while it follows the page",
          "Aufgeklappt anheften: der Block bleibt beim Mitlaufen vollständig",
          "Fijar desplegado: el bloque se mantiene entero al seguir la página");
      b.title = t;
      b.setAttribute("aria-label", t);
      b.setAttribute("aria-pressed", String(on));
      b.lastChild.textContent = on ? tl(" Épinglé", " Pinned", " Angeheftet", " Fijado") : tl(" Épingler", " Pin", " Anheften",
        " Fijar");
      StickyFrame.refresh();
    };
    /** Pose le bouton dans les outils du bloc (attend que le cadre les ait posés), puis applique l'état. */
    const place = () => {
      if (res.querySelector(".fp-result-pin")) return apply();
      const tools = res.querySelector(".repo-block-tools");
      if (!tools) return setTimeout(place, 300); // outils posés par le framework au chargement
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fp-result-pin";
      b.innerHTML = (window.RepositoryIcons?.svg("pin", {
        size: 13
      }) || "📌") + "<span></span>";
      b.onclick = () => {
        try {
          localStorage.setItem(KEY, get() ? "0" : "1");
        } catch {}
        apply();
      };
      tools.prepend(b);
      apply();
    };
    place();
    window.addEventListener("repository-language-change", () => setTimeout(apply));
  }
  let framesReady = false;
  /** Enregistre une fois les cadres semi-mobiles : bloc Résultat (ancre : carte des courbes, « stack »), puis un
   *  panneau par rangée de courbe (attribut data-row = id de la rangée). */
  function setupFrames() {
    if (framesReady || !window.StickyFrame) return;
    const side = $("perfSide"),
      res = side?.querySelector('[data-block-id="result"]');
    if (!side || !res) return;
    framesReady = true;
    StickyFrame.follow(res, {
      anchor: document.querySelector('[data-block-id="fuel-plan"]') || side,
      stack: true
    });
    resultPin(res);
    side.querySelectorAll(".side-panel").forEach(p => StickyFrame.follow(p, {
      anchor: $(p.dataset.row),
      grow: true
    }));
  }
  /** Contenu d'un panneau : titre, puis blocs HTML (les vides sont omis). */
  const panel = (id, title, ...parts) => {
    const p = $(id);
    if (p) p.innerHTML = typo(`<h4>${title}</h4>${parts.filter(Boolean).join("")}`);
  };
  /** Légende : lignes [trait, libellé coloré, explication]. */
  const legend = rows => `<ul class="legend">${rows.map(([s, l, t]) => `<li>${s}${l}${t ? ` — ${t}` : ""}</li>`).join("")}</ul>`;
  /** Paragraphe « Lecture » (texte explicatif neutre). */
  const reading = t => `<p class="reading"><b>${L.read()}.</b> ${t}</p>`;

  // ---------------------------------------------------------------------------------------------------
  // Point d'entrée et rendu d'ensemble
  // ---------------------------------------------------------------------------------------------------

  /** Point d'entrée (calculate) : modèle du profil actif, puis toute la vue. c : voir l'en-tête du fichier. */
  function renderAltitudeOptimum(c) {
    setupFrames();
    /** Arrêt du calcul : courbes masquées, message (champs manquants en liens vers le profil), panneaux vidés. */
    const stop = (msg, fields = []) => {
      S.m = null;
      $("optChart").hidden = true;
      $("climbBlock").hidden = true;
      $("optEmpty").hidden = false;
      // champs manquants : liens vers l'éditeur de profil
      $("optEmpty").innerHTML = typo(escXml(msg) + (fields.length ? ` — ${tl("à renseigner", "to fill in", "auszufüllen", "por rellenar")} : ${fields.map(f => fieldLink(f)).join(", ")}` : ""));
      ["panelOpt", "panelClimb", "panelSpeed", "panelTas", "panelCompare", "panelTable"].forEach(id => {
        if ($(id)) $(id).innerHTML = "";
      });
      window.altitudeOptimum = null;
      renderPinned();
      syncSliders();
      StickyFrame.refresh();
    };
    if (!(c.D > 0)) return stop(tl("Distance nulle : renseigne une distance pour tracer les courbes.",
      "Zero distance: enter a distance to draw the curves.",
      "Entfernung null: eine Entfernung eingeben, um die Kurven zu zeichnen.",
      "Distancia nula: introduzca una distancia para trazar las curvas."));
    let m;
    try {
      m = perfModel();
    } catch (e) {
      return stop(e.message, e.fields || []);
    }
    S.m = m;
    S.c = c;
    S.cache = null;
    sync.reset();
    ensureManual(m);
    renderAll(m, c, stop);
    window.StickyFrame?.resetGrow?.(); // nouveau calcul : rangées remises à la hauteur de leurs panneaux
  }

  /** Redessine tout avec le modèle m (sans le reconstruire) : appelé par renderAltitudeOptimum et par les curseurs.
   *  stop(msg) : affichage d'un message à la place des courbes (niveau introuvable). */
  function renderAll(m, c, stop = () => {}) {
    setChartVars(); // palette du design (le cadre commun peut se charger après ce script)
    let K;
    try {
      K = S.cache ||= buildCache(m, c);
    } catch (e) {
      console.error("Vue des courbes — calcul :", e);
      return stop(`${failTxt()} : ${e.message}`);
    }
    const man = manualLaw(m),
      altOk = !!K.bestFuel;
    // altitude optimale : absente si aucun niveau n'est tenable ; les courbes de montée restent affichées
    $("optEmpty").hidden = altOk;
    window.altitudeOptimum = altOk ? {
      model: m,
      c,
      bestFuel: K.bestFuel,
      bestProf: K.bestProf,
      bestEco: K.bestEco,
      fastest: K.fastest,
      plan: K.plan,
      eco: K.eco,
      norm: K.norm
    } : null;
    if (altOk) guard("panelOpt", "optChart", tl("Altitude optimale", "Optimum altitude", "Optimale Flughöhe", "Altitud óptima"), () => {
      K.manTrips = K.cut(extendSeries(K.hs.map(h => h > m.ceiling ? m.unbounded(() => m.trip(h, c.D, c.wc, "normal", man)) : m.trip(h,
        c.D, c.wc, "normal", man)), m.ceiling, TRIP_KEYS)); // même coupe que les autres courbes
      drawAltitude(m, c, K);
    });
    else {
      $("optChart").hidden = true;
      $("optEmpty").innerHTML = typo(noLevelTxt(m, c));
      guard("panelOpt", "optChart", tl("Altitude optimale", "Optimum altitude", "Optimale Flughöhe", "Altitud óptima"), () =>
        panel("panelOpt", tl("Altitude optimale", "Optimum altitude", "Optimale Flughöhe", "Altitud óptima"), `<p class="perf-warn">⚠ ${noLevelTxt(m, c)}</p>`, `<details class="limits" open><summary>${tl("Limites", "Limits", "Grenzen", "Límites")}</summary>${limitsHtml(m, c, K.hs)}</details>`));
    }
    if (K.top > 0) guard("panelClimb", "climbChart", tl("Montée", "Climb", "Steigflug", "Ascenso"), () => drawClimb(m, c, K));
    else $("climbBlock").hidden = true;
    if (K.top > 0) guard("panelTas", "tasChart", tl("TAS selon le niveau", "TAS by level", "TAS nach Flughöhe", "TAS según el nivel"),
      () => drawTas(m, c, K));
    syncSliders();
    if (sync.pinned != null) sync.charts.forEach(ch => sync.drawPin(ch, sync.pinned));
    renderPinned();
    StickyFrame.refresh();
  }

  // --- TAS selon le niveau ---------------------------------------------------------------------------------
  /** Courbe TAS (vitesse vraie) selon le niveau : croisière du profil, croisière économique, montée à la loi réglée ;
   *  si un écart ISA est saisi, croisière du profil en atmosphère standard en pointillés (effet de la température).
   *  Jauge synchronisée avec les autres courbes ; relevé : TAS, Badin et Mach de chaque série. */
  function drawTas(m, c, K) {
    const svg = $("tasChart"),
      H = 220,
      W = chartW(svg, H),
      Lm = 52,
      R = 12,
      T = 12,
      B = 30,
      xmax = Math.max(K.topX, 1000),
      man = manualLaw(m);
    let m0 = null;
    if (m.dIsa) try {
      m0 = perfModel(0);
    } catch {
      m0 = null;
    }
    const step = xmax > 20000 ? 1000 : 500,
      rows = [];
    for (let h = 0; h <= xmax + 1; h += step) {
      /** Calcul au niveau h, sans le refus de croisière au-delà du plafond (prolongement dans la zone grisée). */
      const un = f => h > m.ceiling ? m.unbounded(f) : f(),
        cr = un(() => m.cruise(h, "normal")),
        ec = un(() => m.cruise(h, "eco")),
        mp = m.manualPoint(h, man),
        c0 = m0 && (h > m0.ceiling ? m0.unbounded(() => m0.cruise(h, "normal")) : m0.cruise(h, "normal"));
      const a = m.atm(h).a,
        a0 = FlightPerfModel.isa(h).a,
        pt = (x, sa) => ({
          tas: x.tas,
          ias: x.ias,
          mach: x.tas / sa
        });
      rows.push({
        h,
        prof: cr?.ok ? pt(cr, a) : null,
        eco: ec?.ok ? pt(ec, a) : null,
        man: mp && mp.roc > 0 ? pt(mp, a) : null,
        isa: c0?.ok ? pt(c0, a0) : null
      });
    }
    // prolongement dans la zone grisée (série par série)
    for (const k of ["prof", "eco", "man", "isa"]) {
      const e = extendSeries(rows.map(r => r[k] ? {
        ...r[k],
        h: r.h,
        ok: true
      } : {
        h: r.h,
        ok: false
      }), k === "isa" && m0 ? m0.ceiling : m.ceiling, ["tas", "ias", "mach"]);
      e.forEach((x, i) => {
        rows[i][k] = x?.ok ? x : null;
      });
      // série interrompue sous le plafond (croisière impossible plus haut) : pas de prolongement au-delà du plafond
      const ceilK = k === "isa" && m0 ? m0.ceiling : m.ceiling,
        top = rows.reduce((a, r) => r[k] && !r[k].extrap && r.h <= ceilK && r.h > a ? r.h : a, -1);
      if (top >= 0 && top < ceilK - step) rows.forEach(r => {
        if (r.h > top) r[k] = null;
      });
    }
    // plus haut niveau où la croisière du profil est tenable : zone « inaccessible — puissance insuffisante » au-dessus
    let profTop = rows.reduce((a, r) => r.prof && r.h <= m.ceiling && r.h > a ? r.h : a, -1);
    if (!(profTop >= 0 && profTop < m.ceiling - 2 * step && m.cruise(profTop + step, "normal")?.reason === "thrust")) profTop = -
      1; // vrai refus (puissance), pas l'arrondi du dernier pas
    const all = rows.flatMap(r => [r.prof, r.eco, r.man, r.isa].filter(Boolean).map(x => x.tas));
    if (!all.length) throw Error(tl("aucune vitesse calculable", "no computable speed", "keine berechenbare Geschwindigkeit",
      "ninguna velocidad calculable"));
    const vmin = Math.min(...all) * .94,
      vmax = Math.max(...all) * 1.04,
      X = h => Lm + h / xmax * (W - Lm - R),
      Y = v => T + (1 - (v - vmin) / (vmax - vmin || 1)) * (H - T - B);
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = vmin + (vmax - vmin) * i / 4;
      g += `<line class="grid-line" x1="${Lm}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 5}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`;
    }
    const tk = xmax > 30000 ? 10000 : xmax > 12000 ? 5000 : 2000;
    for (let h = 0; h <= xmax; h += tk) g += `<line class="grid-line" x1="${X(h)}" x2="${X(h)}" y1="${T}" y2="${H - B}"/><text x="${X(h)}" y="${H - B + 14}" text-anchor="middle">${flTxt(h)}</text>`;
    /** Tracé SVG de la série k (TAS), interrompu là où la série manque. */
    const pth = (k, cls) => {
      let d = "",
        pen = false;
      for (const r of rows) {
        if (!r[k]) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${X(r.h).toFixed(1)},${Y(r[k].tas).toFixed(1)}`;
        pen = true;
      }
      return d ? `<path class="${cls}" d="${d}"/>` : "";
    };
    g += `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${Lm}" x2="${Lm}" y1="${T}" y2="${H - B}"/>${pth("isa", "band")}${pth("eco", "curve-eco")}${pth("prof", "curve")}${pth("man", "curve-man")}` +
      (profTop >= 0 ? `<rect class="short-zone" x="${X(profTop).toFixed(1)}" y="${T}" width="${(X(m.ceiling) - X(profTop)).toFixed(1)}" height="${H - B - T}"/>` : "") +
      beyondZone(X, T, H - B, m.ceiling, xmax) +
      `<text x="${(Lm + W - R) / 2}" y="${H - 3}" text-anchor="middle">${tl("Niveau", "Level", "Flughöhe", "Nivel")}</text><text x="11" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 11 ${(T + H - B) / 2})">TAS (kt)</text>` +
      `<line id="tasCursor" class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><rect id="tasHit" x="${Lm}" y="${T}" width="${W - Lm - R}" height="${H - T - B}" fill="transparent"/>` +
      (profTop >= 0 ? `<text class="beyond-label zone-tip" x="${((X(profTop) + X(m.ceiling)) / 2).toFixed(1)}" y="${T + 11}" text-anchor="middle"><title>${escXml(tl(`Niveaux au-dessus de ${flTxt(profTop)} : la puissance disponible ne suffit plus pour tenir la vitesse de croisière du profil.`, `Levels above ${flTxt(profTop)}: the available power no longer holds the profile cruise speed.`, `Flughöhen über ${flTxt(profTop)}: die verfügbare Leistung reicht nicht mehr für die Reisegeschwindigkeit des Profils.`, `Niveles por encima de ${flTxt(profTop)}: la potencia disponible ya no mantiene la velocidad de crucero del perfil.`))}</title>${tl("inaccessible — puissance insuffisante", "unreachable — not enough power", "unerreichbar — zu wenig Leistung", "inaccesible — potencia insuficiente")}</text>` : "");
    svg.innerHTML = typo(g);
    svg.hidden = false;
    svg.dataset.t = T;
    svg.dataset.b = B;
    zoneNotes("tasZones", [...(profTop >= 0 ? [
      [tl("inaccessible — puissance insuffisante", "unreachable — not enough power", "unerreichbar — zu wenig Leistung",
        "inaccesible — potencia insuficiente"), tl(`au-dessus de ${flTxt(profTop)}, la puissance disponible ne suffit plus pour tenir la vitesse de croisière du profil.`, `above ${flTxt(profTop)}, the available power no longer holds the profile cruise speed.`, `über ${flTxt(profTop)} reicht die verfügbare Leistung nicht mehr für die Reisegeschwindigkeit des Profils.`, `por encima de ${flTxt(profTop)}, la potencia disponible ya no mantiene la velocidad de crucero del perfil.`)]
    ] : []), ...(m.ceiling < xmax - 1 ? [ceilingNote(m)] : [])]);
    /** Ligne de la lecture : TAS, Badin et Mach (au-delà de 0,3) d'un point, ou « — ». */
    const one = (x, col, name) => `<dt>${lab(name, col)}</dt><dd>${x ? `TAS ${fmt(x.tas, 0)} kt · ${tl("Badin", "IAS", "IAS", "IAS")} ${fmt(x.ias, 0)} kt${x.mach >= .3 ? ` · M${x.mach.toFixed(2)}` : ""}` : "—"}</dd>`;
    const isaName = tl("croisière en ISA", "cruise at ISA", "Reiseflug bei ISA", "crucero en ISA"),
      climbName = `${L.man()} (${tl("montée", "climb", "Steigflug", "ascenso")})`;
    sync.add({
      svg,
      hit: $("tasHit"),
      W,
      L: Lm,
      R,
      T,
      bottom: H - B,
      xmax,
      /** Jauge et lecture au niveau calculé le plus proche de h. */
      show: h => {
        const r = rows.reduce((a, x) => Math.abs(x.h - h) < Math.abs(a.h - h) ? x : a, rows[0]);
        cursorAt("tasCursor", X(r.h));
        $("tasReadout").innerHTML = typo(`<b>⌖ ${flTxt(r.h)}</b><dl class="kvp">${one(r.prof, COL.prof, L.prof())}${one(r.eco, COL.eco, L.eco())}${one(r.man, COL.man, climbName)}${m0 ? one(r.isa, COL.ref, isaName) : ""}</dl>`);
      },
      /** Jauge masquée et lecture vidée. */
      leave: () => {
        $("tasCursor").setAttribute("visibility", "hidden");
        $("tasReadout").textContent = "";
      }
    });
    const plan = rows.reduce((a, x) => Math.abs(x.h - c.FL * 100) < Math.abs(a.h - c.FL * 100) ? x : a, rows[0]);
    panel("panelTas", tl("TAS selon le niveau", "TAS by level", "TAS nach Flughöhe", "TAS según el nivel"),
      legend([
        [sw(COL.prof), lab(L.prof(), COL.prof), ""],
        [sw(COL.eco), lab(L.eco(), COL.eco), ""],
        [sw(COL.man), lab(climbName, COL.man), tl("TAS de montée à la loi des curseurs", "climb TAS at the slider law",
          "Steig-TAS nach dem Reglergesetz", "TAS de ascenso con la ley de los cursores")],
        ...(m0 ? [
          [sw(COL.ref, true), lab(isaName, COL.ref), tl("même croisière en atmosphère standard",
            "same cruise in the standard atmosphere", "gleicher Reiseflug in der Standardatmosphäre",
            "mismo crucero en atmósfera estándar")]
        ] : [])
      ]),
      `<p>${tl("Au niveau du plan", "At the plan level", "Auf der Planhöhe", "Al nivel del plan")} (${flTxt(plan.h)}) :</p><dl class="kvp">${one(plan.prof, COL.prof, L.prof())}${m0 ? one(plan.isa, COL.ref, isaName) : ""}</dl>`,
      `<div id="tasReadout" class="readout"></div>`,
      reading(tl(
        "la TAS (vitesse vraie) croît avec le niveau à Badin égal (air moins dense, environ 2 % par 1000 ft) ; un réacteur tenu au Mach voit sa TAS baisser avec la température au-dessus de l’altitude de conjonction. Air plus chaud que l’ISA : TAS plus grande à Badin égal (≈ 1 % pour 5 °C), mais poussée et plafond plus faibles.",
        "TAS (true airspeed) increases with level at a given IAS (thinner air, about 2 % per 1000 ft); a jet flown at constant Mach sees its TAS fall with temperature above the crossover altitude. Air warmer than ISA: higher TAS at a given IAS (≈ 1 % per 5 °C), but less thrust and a lower ceiling.",
        "Die TAS (wahre Fluggeschwindigkeit) steigt bei gleicher IAS mit der Flughöhe (dünnere Luft, etwa 2 % je 1000 ft); ein mit konstanter Machzahl geflogener Jet verliert über der Übergangshöhe TAS mit der Temperatur. Wärmer als ISA: höhere TAS bei gleicher IAS (≈ 1 % je 5 °C), aber weniger Schub und niedrigere Gipfelhöhe.",
        "la TAS (velocidad verdadera) crece con el nivel a IAS igual (aire menos denso, cerca del 2 % por 1000 ft); un reactor a Mach constante pierde TAS con la temperatura por encima de la altitud de cruce. Aire más cálido que la ISA: TAS mayor a IAS igual (≈ 1 % por 5 °C), pero menos empuje y techo más bajo."
      )));
  }

  /** Libellé « courbe indisponible » (4 langues). */
  const failTxt = () => tl("Courbe indisponible", "Curve unavailable", "Kurve nicht verfügbar", "Curva no disponible");
  /** Exécute le dessin d'une courbe sans laisser une erreur arrêter les autres : en cas d'échec, la courbe (svgId)
   *  est masquée et son panneau (panelId) affiche la cause ; l'erreur complète part dans la console. */
  function guard(panelId, svgId, title, fn) {
    try {
      fn();
    } catch (e) {
      console.error(`Vue des courbes — ${title} :`, e);
      if ($(svgId)) $(svgId).hidden = true;
      panel(panelId, title, `<p class="perf-warn">⚠ ${failTxt()} : ${escXml(e.message || String(e))}</p>`);
    }
  }
  /** Cause d'une courbe d'altitude vide : plafond sous le plancher de calcul (1000 ft) ou trajet trop court. */
  function noLevelTxt(m, c) {
    if (m.ceiling < 1000) return tl(`Plafond ${fmt(m.ceiling, 0)} ft : sous le plancher de calcul (1000 ft). Vérifier le ${F_CEIL()} ou les données de montée (vario, Badin, débit).`, `Ceiling ${fmt(m.ceiling, 0)} ft: below the 1000 ft computation floor. Check the ${F_CEIL()} or the climb data (rate, IAS, fuel flow).`, `Gipfelhöhe ${fmt(m.ceiling, 0)} ft: unter der Rechenuntergrenze (1000 ft). ${F_CEIL()} oder Steigflugdaten (Steigrate, IAS, Verbrauch) prüfen.`, `Techo ${fmt(m.ceiling, 0)} ft: por debajo del suelo de cálculo (1000 ft). Revise el ${F_CEIL()} o los datos de ascenso (régimen, IAS, flujo).`);
    return tl(`Aucun niveau atteignable sur ${fmt(c.D, 0)} NM : même à 1000 ft, monter puis redescendre est plus long que le trajet, ou la croisière n’est tenable nulle part. Allonger la ${F_DIST()} ou vérifier le profil.`, `No level reachable over ${fmt(c.D, 0)} NM: even at 1000 ft, climbing then descending is longer than the trip, or cruise cannot be held anywhere. Increase the ${F_DIST()} or check the profile.`, `Auf ${fmt(c.D, 0)} NM ist keine Flughöhe erreichbar: selbst auf 1000 ft sind Steig- und Sinkflug länger als die Strecke, oder der Reiseflug ist nirgends haltbar. ${F_DIST()} erhöhen oder Profil prüfen.`, `Ningún nivel alcanzable en ${fmt(c.D, 0)} NM: incluso a 1000 ft, subir y bajar es más largo que el trayecto, o el crucero no se mantiene en ningún nivel. Aumente la ${F_DIST()} o revise el perfil.`);
  }

  /** Calculs lourds, faits une fois par calcul (réutilisés quand on bouge les curseurs) :
   *  niveaux étudiés hs (pas de 500 ft), trajets croisière du profil / économique / fourchette de vent,
   *  optimums, rendement de croisière seule, trajet au niveau du plan. */
  function buildCache(m, c) {
    // axe prolongé à 110 % du plafond (zone grisée « inaccessible ») : courbes calculées au-delà quand la physique le permet
    const step = 500,
      top = Math.floor(m.ceiling / step) * step,
      topX = Math.max(top, Math.ceil(m.ceiling * 1.1 / step) * step),
      hs = [];
    for (let h = 0; h <= topX; h += step) hs.push(h);
    /** ok : résultat utilisable ; trips : trajet entier pour chaque niveau (mode de croisière, vent w). */
    const ok = r => r && r.ok,
      trips = (mode, w) => hs.map(h => h > m.ceiling ? m.unbounded(() => m.trip(h, c.D, w, mode)) : m.trip(h, c.D, w, mode));
    /** Série prolongée au-delà du plafond (zone grisée). */
    const ext = l => extendSeries(l, m.ceiling, TRIP_KEYS); // prolongement dans la zone grisée
    // niveaux non tenables sous le plafond (trajet trop court pour y monter, ou croisière impossible faute de puissance) :
    // la courbe s'arrête au dernier niveau tenable et n'est pas prolongée au-delà du plafond (elle y réapparaissait
    // après un trou inexpliqué)
    const lastOk = l => l.reduce((a, r) => r?.ok && r.h <= m.ceiling && r.h > a ? r.h : a, -1);
    /** Série coupée au-dessus du dernier niveau tenable s'il est nettement sous le plafond. */
    const cut = l => {
      const top = lastOk(l);
      return top >= 0 && top < m.ceiling - step ? l.map(r => r && r.h > top ? null : r) : l;
    };
    const normRaw = ext(trips("normal", c.wc));
    const eco = cut(ext(trips("eco", c.wc))),
      norm = cut(normRaw),
      bands = !c.windKnown && (c.low || c.high) ? [cut(ext(trips("normal", c.low))), cut(ext(trips("normal", c.high)))] : [];
    const reachTop = Math.max(lastOk(eco), lastOk(norm)); // plus haut niveau tenable sur le trajet
    // cause (modèle : 'short' trajet trop court, 'thrust' puissance insuffisante pour la croisière, 'ceiling')
    const stopReason = normRaw.find(r => r && !r.ok && r.h > reachTop && r.h <= m.ceiling)?.reason || "";
    /** Niveau retenu pour les optimums : utilisable, entre 1000 ft et le plafond. */
    const usable = r => ok(r) && r.h >= 1000 && r.h <= m.ceiling; // plancher pratique : 1000 ft ; sous le plafond
    /** Point de la série l qui minimise la grandeur k parmi les niveaux retenus. */
    const minBy = (l, k) => l.filter(usable).reduce((a, b) => !a || b[k] < a[k] ? b : a, null);
    const bestProf = minBy(norm, "fuel"),
      bestEco = minBy(eco, "fuel"),
      fastest = minBy(norm, "minutes");
    /** Croisières tenables (mode donné) de 1000 ft au plafond. */
    const cr = mode => hs.filter(h => h <= m.ceiling).map(h => m.cruise(h, mode)).filter(ok).filter(r => r.h >= 1000);
    return {
      step,
      top,
      topX,
      hs,
      ok,
      eco,
      norm,
      bands,
      reachTop,
      stopReason,
      cut,
      bestProf,
      bestEco,
      fastest,
      bestFuel: bestProf || bestEco,
      crN: cr("normal"),
      crE: cr("eco"),
      plan: m.trip(c.FL * 100, c.D, c.wc, "normal")
    };
  }

  // ---------------------------------------------------------------------------------------------------
  // 1. Altitude optimale
  // ---------------------------------------------------------------------------------------------------

  /** Courbe d'altitude optimale (NM par unité de carburant sur le trajet entier, selon le niveau) et son panneau. */
  function drawAltitude(m, c, K) {
    const {
      hs,
      ok,
      eco,
      norm,
      bands,
      bestProf,
      bestEco,
      fastest,
      plan,
      step
    } = K, unit = fuelUnit(), man = K.manTrips;
    const svg = $("optChart"),
      H = 270,
      W = chartW(svg, H),
      Lm = 52,
      R = 12,
      T = 16,
      B = 30,
      xmax = Math.max(K.topX, 1000);
    /** Distance parcourue par unité de carburant (NM par unité affichée). */
    const eff = r => c.D / cv(r.fuel);
    const vals = [eco, norm, man, ...bands].flat().filter(ok).map(eff),
      ymax = Math.max(...vals) * 1.05,
      ymin = Math.max(0, Math.min(...vals) * .92);
    /** Coordonnées du graphique : X (altitude), Y (rendement). */
    const X = h => Lm + h / xmax * (W - Lm - R),
      Y = v => T + (1 - (v - ymin) / (ymax - ymin || 1)) * (H - T - B);
    const tick = xmax > 30000 ? 10000 : xmax > 12000 ? 5000 : 2000;
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = ymin + (ymax - ymin) * i / 4;
      g += `<line class="grid-line" x1="${Lm}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 5}" y="${Y(v) + 4}" text-anchor="end">${f3(v)}</text>`;
    }
    for (let h = 0; h <= xmax; h += tick) g += `<line class="grid-line" x1="${X(h)}" x2="${X(h)}" y1="${T}" y2="${H - B}"/><text x="${X(h)}" y="${H - B + 14}" text-anchor="middle">${flTxt(h)}</text>`;
    /** Tracé SVG du rendement d'une série, interrompu sur les niveaux non utilisables. */
    const path = rs => {
      let d = "",
        pen = false;
      for (const r of rs) {
        if (!ok(r)) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${X(r.h).toFixed(1)},${Y(eff(r)).toFixed(1)}`;
        pen = true;
      }
      return d;
    };
    bands.forEach(b => g += `<path class="band" d="${path(b)}"/>`);
    g += `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${Lm}" x2="${Lm}" y1="${T}" y2="${H - B}"/>` +
      `<path class="curve-eco" d="${path(eco)}"/><path class="curve" d="${path(norm)}"/><path class="curve-man" d="${path(man)}"/>`;
    // optimums : pastilles de la couleur de leur courbe, étiquette neutre
    // explication au survol de chaque pastille (<title> : infobulle native, lue aussi par les lecteurs d'écran)
    // pastilles et libellés de zones : posés APRÈS la zone de survol du graphique (optHit), sinon leurs infobulles ne
    // s'afficheraient jamais
    let ov = "";
    const zn = []; // explications des zones, sous le graphique
    /** Point remarquable (optimum, niveau du plan) avec étiquette et info-bulle, ajouté à la surcouche. */
    const dot = (r, col, label, dy, tip) => {
      if (!ok(r)) return;
      const x = X(r.h),
        y = Y(eff(r)),
        t = `<title>${escXml(tip)}</title>`;
      ov += `<g class="opt-dot" style="cursor:help"><circle cx="${x}" cy="${y}" r="9" fill="transparent"/><circle cx="${x}" cy="${y}" r="4.5" style="fill:${col}"/>${t}</g><text x="${Math.min(Math.max(x, Lm + 30), W - R - 30)}" y="${y + dy}" text-anchor="middle" style="cursor:help">${t}${label}</text>`;
    };
    /** Niveau, carburant et durée d'un trajet en texte (fin de l'info-bulle). */
    const at = r => ok(r) ? ` ${flTxt(r.h)} : ${fmt(cv(r.fuel), 0)} ${unit}, ${hmTxt(r.minutes)}.` : "";
    if (ok(plan)) dot(plan, COL.ref, `${flTxt(plan.h)} ${tl("plan", "plan", "Plan", "plan")}`, 16,
      tl(`Niveau du plan de vol, à la vitesse du profil.${at(plan)}`, `Flight plan level, at the profile speed.${at(plan)}`, `Flugplanhöhe, mit der Profilgeschwindigkeit.${at(plan)}`, `Nivel del plan de vuelo, a la velocidad del perfil.${at(plan)}`));
    dot(fastest, COL.fast, flTxt(fastest?.h), -9,
      tl(`Le plus rapide : niveau où le trajet entier (montée, croisière, descente) dure le moins, à la vitesse du profil.${at(fastest)}`, `Fastest: level where the whole trip (climb, cruise, descent) takes the least time, at the profile speed.${at(fastest)}`, `Am schnellsten: Flughöhe, auf der die ganze Strecke (Steig-, Reise-, Sinkflug) am kürzesten dauert, mit Profilgeschwindigkeit.${at(fastest)}`, `El más rápido: nivel en que el trayecto completo (ascenso, crucero, descenso) dura menos, a la velocidad del perfil.${at(fastest)}`));
    dot(bestProf, COL.prof, flTxt(bestProf?.h), -9,
      tl(`Carburant minimal à la vitesse du profil : niveau où le trajet entier consomme le moins en volant à la vitesse de croisière du profil.${at(bestProf)}`, `Minimum fuel at the profile speed: level where the whole trip burns the least when flown at the profile cruise speed.${at(bestProf)}`, `Minimaler Kraftstoff bei Profilgeschwindigkeit: Flughöhe mit dem geringsten Verbrauch der ganzen Strecke bei Reisegeschwindigkeit des Profils.${at(bestProf)}`, `Combustible mínimo a la velocidad del perfil: nivel en que el trayecto completo consume menos a la velocidad de crucero del perfil.${at(bestProf)}`));
    dot(bestEco, COL.eco, flTxt(bestEco?.h), 16,
      tl(`Carburant minimal en croisière économique (vitesse réduite, régime éco) : le moins de carburant possible, au prix d'un vol plus long.${at(bestEco)}`, `Minimum fuel in economy cruise (reduced speed, eco setting): the least fuel possible, at the cost of a longer flight.${at(bestEco)}`, `Minimaler Kraftstoff im Sparreiseflug (reduzierte Geschwindigkeit): geringstmöglicher Verbrauch, dafür längerer Flug.${at(bestEco)}`, `Combustible mínimo en crucero económico (velocidad reducida): el menor consumo posible, a cambio de un vuelo más largo.${at(bestEco)}`));
    // niveaux sous le plafond mais pas tenables : zone teintée, libellé et explication selon la cause
    // (seulement pour un vrai niveau refusé sous le plafond, sur au moins deux pas : pas pour l'arrondi du dernier pas)
    if (K.stopReason && K.reachTop >= 0 && K.reachTop < m.ceiling - 2 * step) {
      const x0 = X(K.reachTop),
        x1 = X(m.ceiling),
        above = flTxt(K.reachTop);
      const why = K.stopReason === "short" ? [tl("inaccessible — trajet trop court", "unreachable — trip too short",
            "unerreichbar — Strecke zu kurz", "inaccesible — trayecto corto"),
          tl(`Niveaux au-dessus de ${above} : le trajet (${fmt(c.D, 0)} NM) est trop court pour y monter puis redescendre.`, `Levels above ${above}: the trip (${fmt(c.D, 0)} NM) is too short to climb there and descend again.`, `Flughöhen über ${above}: die Strecke (${fmt(c.D, 0)} NM) ist zu kurz, um dorthin zu steigen und wieder zu sinken.`, `Niveles por encima de ${above}: el trayecto (${fmt(c.D, 0)} NM) es demasiado corto para subir y volver a bajar.`)
        ] :
        K.stopReason === "thrust" ? [tl("inaccessible — puissance insuffisante", "unreachable — not enough power",
            "unerreichbar — zu wenig Leistung", "inaccesible — potencia insuficiente"),
          tl(`Niveaux au-dessus de ${above} : la puissance disponible ne suffit plus pour tenir la vitesse de croisière du profil (moteurs, air moins dense).`, `Levels above ${above}: the available power no longer holds the profile cruise speed (engines, thinner air).`, `Flughöhen über ${above}: die verfügbare Leistung reicht nicht mehr für die Reisegeschwindigkeit des Profils (Triebwerke, dünnere Luft).`, `Niveles por encima de ${above}: la potencia disponible ya no mantiene la velocidad de crucero del perfil (motores, aire menos denso).`)
        ] : [tl("inaccessible", "unreachable", "unerreichbar", "inaccesible"),
          tl(`Niveaux au-dessus de ${above} : le modèle ne trouve pas de vol possible (voir Limites).`, `Levels above ${above}: the model finds no feasible flight (see Limits).`, `Flughöhen über ${above}: das Modell findet keinen möglichen Flug (siehe Grenzen).`, `Niveles por encima de ${above}: el modelo no encuentra vuelo posible (ver Límites).`)
        ];
      zn.push(why);
      g += `<rect class="short-zone" x="${x0.toFixed(1)}" y="${T}" width="${(x1 - x0).toFixed(1)}" height="${H - B - T}"/>`;
      ov += `<text class="beyond-label zone-tip" x="${((x0 + x1) / 2).toFixed(1)}" y="${T + 11}" text-anchor="middle"><title>${escXml(why[1])}</title>${why[0]}</text>`;
    }
    // avion non pressurisé : au-dessus de l'altitude sans oxygène (Paramétrage › Planificateur, 10 000 ft par défaut),
    // zone « oxygène requis » (information : le calcul n'est pas limité)
    const oxy = oxygenAltFt();
    if (!m.pressurized && oxy < xmax) {
      const x0 = X(oxy),
        x1 = X(xmax);
      const oxyTxt = (tl(`Cabine non pressurisée : au-dessus de ${flTxt(oxy)}, oxygène requis pour l'équipage et les passagers (seuil réglable dans Paramétrage › Planificateur). Information : le calcul n'est pas limité.`, `Unpressurised cabin: above ${flTxt(oxy)}, oxygen required for crew and passengers (threshold set in Settings › Planner). Information: the computation is not limited.`, `Keine Druckkabine: oberhalb ${flTxt(oxy)} Sauerstoff für Besatzung und Passagiere erforderlich (Schwelle in Einstellungen › Planer). Hinweis: die Berechnung wird nicht begrenzt.`, `Cabina sin presurizar: por encima de ${flTxt(oxy)}, oxígeno necesario para tripulación y pasajeros (umbral en Ajustes › Planificador). Información: el cálculo no se limita.`)),
        oxyTip = escXml(oxyTxt);
      zn.push([tl("oxygène requis", "oxygen required", "Sauerstoff erforderlich", "oxígeno necesario"), oxyTxt]);
      g += `<rect class="oxygen-zone" x="${x0.toFixed(1)}" y="${T}" width="${(x1 - x0).toFixed(1)}" height="${H - B - T}"/><line class="oxygen-edge" x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="${T}" y2="${H - B}"/>`;
      ov += `<text class="oxygen-label zone-tip" x="${(x0 + 4).toFixed(1)}" y="${H - B - 5}"><title>${oxyTip}</title>${tl("oxygène requis", "oxygen required", "Sauerstoff erforderlich", "oxígeno necesario")}</text>`;
    }
    g += beyondZone(X, T, H - B, m.ceiling, xmax);
    g += `<text x="${(Lm + W - R) / 2}" y="${H - 3}" text-anchor="middle">${tl("Niveau de croisière", "Cruise level", "Reiseflughöhe", "Nivel de crucero")}</text><text x="11" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 11 ${(T + H - B) / 2})">NM / ${unit}</text>` +
      `<line id="optCursor" class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><rect id="optHit" x="${Lm}" y="${T}" width="${W - Lm - R}" height="${H - T - B}" fill="transparent"/>` + ov;
    svg.innerHTML = typo(g);
    svg.hidden = false;
    svg.dataset.t = T;
    svg.dataset.b = B;
    if (m.ceiling < xmax - 1) zn.push(ceilingNote(m));
    zoneNotes("optZones", zn);

    // relevé de la jauge (panneau) : trajet entier au niveau survolé, pour chaque série
    const line = (r, col, name) => `<dt>${lab(name, col)}</dt><dd>${ok(r) ? `${fmt(cv(r.fuel), 0)} ${unit} · ${hmTxt(r.minutes)} · TAS ${fmt(r.tas, 0)} kt` : "—"}</dd>`;
    sync.add({
      svg,
      hit: $("optHit"),
      W,
      L: Lm,
      R,
      T,
      bottom: H - B,
      xmax,
      /** Jauge et lecture au niveau calculé le plus proche de h. */
      show: h => {
        const k = Math.min(hs.length - 1, Math.round(h / step));
        cursorAt("optCursor", X(hs[k]));
        $("optReadout").innerHTML = typo(`<b>⌖ ${flTxt(hs[k])}</b><dl class="kvp">${line(norm[k], COL.prof, L.prof())}${line(eco[k], COL.eco, L.eco())}${line(man[k], COL.man, L.man())}</dl>`);
      },
      /** Jauge masquée et lecture vidée. */
      leave: () => {
        $("optCursor").setAttribute("visibility", "hidden");
        $("optReadout").textContent = "";
      }
    });

    // panneau : optimums (libellé coloré, valeur neutre), niveau du plan, limites, lecture, hypothèses
    const spd = r => m.kind === "jet" && r.mach > .5 ? `M${r.mach.toFixed(2)}` : `${fmt(r.ias, 0)} kt`;
    /** Ligne d'un optimum dans le panneau : niveau · carburant · durée · vitesse. */
    const best = (r, col, name) => r ? `<dt>${lab(name, col)}</dt><dd>${flTxt(r.h)} · ${fmt(cv(r.fuel), 0)} ${unit} · ${hmTxt(r.minutes)} · ${spd(r)}</dd>` : "";
    const manBest = man.filter(r => ok(r) && r.h >= 1000 && r.h <= m.ceiling).reduce((a, b) => !a || b.fuel < a.fuel ? b : a, null);
    const planTxt = ok(plan) ?
      `${fmt(cv(plan.fuel), 0)} ${unit} · ${hmTxt(plan.minutes)}${plan.fuel > K.bestFuel.fuel * 1.005 ? ` (+${fmt(cv(plan.fuel - K.bestFuel.fuel), 0)} ${unit} ${tl("sur l’optimum", "over the optimum", "über dem Optimum", "sobre el óptimo")})` : ` (${tl("proche de l’optimum", "close to the optimum", "nahe am Optimum", "cerca del óptimo")})`}` :
      tl("non utilisable (voir Limites)", "not usable (see Limits)", "nicht nutzbar (siehe Grenzen)", "no utilizable (ver Límites)");
    panel("panelOpt", tl("Altitude optimale", "Optimum altitude", "Optimale Flughöhe", "Altitud óptima"),
      `<dl class="kvp">${best(bestProf, COL.prof, `${tl("Carburant", "Fuel", "Kraftstoff", "Combustible")} — ${def("prof", L.prof())}`)}${best(bestEco, COL.eco, `${tl("Carburant", "Fuel", "Kraftstoff", "Combustible")} — ${def("eco", L.eco())}`)}${best(fastest, COL.fast, tl("Vitesse", "Speed", "Geschwindigkeit", "Velocidad"))}${best(manBest, COL.man, `${L.man()} (${manualTxt()})`)}<dt>${tl("Niveau du plan", "Plan level", "Planhöhe", "Nivel del plan")} ${flTxt(c.FL * 100)}</dt><dd>${planTxt}</dd></dl>`,
      `<div id="optReadout" class="readout"></div>`,
      `<details class="limits"${limitsWarn(m, c) ? " open" : ""}><summary>${tl("Limites", "Limits", "Grenzen", "Límites")}</summary>${limitsHtml(m, c, hs)}</details>`,
      reading(tl(
        "chaque point est le trajet entier (montée, croisière, descente) volé à ce niveau : plus la courbe est haute, moins on consomme par mille. Pointillés : fourchette de vent inconnu. Clic : épingler un niveau, reporté sur les courbes de montée.",
        "each point is the whole trip (climb, cruise, descent) flown at that level: the higher the curve, the less fuel per mile. Dashed: unknown-wind range. Click: pin a level, carried over to the climb curves.",
        "jeder Punkt ist die gesamte Strecke (Steig-, Reise-, Sinkflug) auf dieser Höhe: je höher die Kurve, desto weniger Kraftstoff pro Meile. Gestrichelt: Bereich bei unbekanntem Wind. Klick: Höhe anheften, auf die Steigkurven übertragen.",
        "cada punto es el trayecto completo (ascenso, crucero, descenso) a ese nivel: cuanto más alta la curva, menos combustible por milla. Punteado: horquilla de viento desconocido. Clic: fijar un nivel, trasladado a las curvas de ascenso."
      )),
      (m.estimatedRef || m.notes.length) ? `<p class="mut">${[m.estimatedRef ? `${tl("Point de croisière", "Cruise reference", "Reiseflug-Bezug", "Referencia de crucero")} : ${escXml(m.refSrc)} (${fieldLink("cruise.refAltFt")}, ${fieldLink("cruise.ceilingFt")})` : "", ...m.notes.map(escXml)].filter(Boolean).join(" · ")}</p>` : "",
      `<details><summary>${tl("Hypothèses du modèle", "Model assumptions", "Modellannahmen", "Hipótesis del modelo")}</summary><p class="mut">${assumptions(m, c)}</p></details>`);
  }
  /** Vrai si les limites contiennent un avertissement (le bloc Limites s'ouvre alors de lui-même). */
  const limitsWarn = (m, c) => c.FL * 100 > m.ceiling || (minDistance(m, c.FL * 100) ?? 0) > c.D;

  /** Texte des hypothèses du modèle (4 langues). */
  function assumptions(m, c) {
    const jet = m.kind === "jet",
      pist = m.kind === "piston";
    return tl(
      `Modèle ${m.label} : atmosphère ISA ; polaire parabolique (finesse max ${fmt(m.ld, 1)}, traînée mini à ${fmt(m.veMd, 0)} kt Badin) ; ${jet ? "consommation ∝ poussée × √θ × (1 + 0,8 M), poussée ∝ σ^0,75 puis ∝ σ au-dessus de la tropopause" : "consommation ∝ puissance, puissance ∝ " + (pist ? "(1,132 σ − 0,132)" : "σ^0,7")} ; point de croisière à ${fmt(m.hRef, 0)} ft (${escXml(m.refSrc)}) ; poussée / puissance calée sur le vario moyen de montée du profil ; plafond ${fmt(m.ceiling, 0)} ft. Montée : Badin du profil${jet ? " puis Mach de croisière" : ""} ; descente au vario du profil ; vent constant${c.windKnown ? "" : " (inconnu : 0 kt, pointillés = fourchette)"}. Masse non modélisée.`,
      `${m.label} model: ISA atmosphere; parabolic drag polar (max L/D ${fmt(m.ld, 1)}, minimum drag at ${fmt(m.veMd, 0)} KIAS); ${jet ? "fuel flow ∝ thrust × √θ × (1 + 0.8 M), thrust ∝ σ^0.75 then ∝ σ above the tropopause" : "fuel flow ∝ power, power ∝ " + (pist ? "(1.132 σ − 0.132)" : "σ^0.7")}; cruise reference at ${fmt(m.hRef, 0)} ft (${escXml(m.refSrc)}); thrust / power set from the profile’s average climb rate; ceiling ${fmt(m.ceiling, 0)} ft. Climb: profile IAS${jet ? " then cruise Mach" : ""}; descent at the profile rate; constant wind${c.windKnown ? "" : " (unknown: 0 kt, dashed = range)"}. Mass not modelled.`,
      `Modell ${m.label}: ISA-Atmosphäre; parabolische Polare (max. Gleitzahl ${fmt(m.ld, 1)}, Mindestwiderstand bei ${fmt(m.veMd, 0)} kt IAS); ${jet ? "Verbrauch ∝ Schub × √θ × (1 + 0,8 M), Schub ∝ σ^0,75, oberhalb der Tropopause ∝ σ" : "Verbrauch ∝ Leistung, Leistung ∝ " + (pist ? "(1,132 σ − 0,132)" : "σ^0,7")}; Reiseflugbezug auf ${fmt(m.hRef, 0)} ft (${escXml(m.refSrc)}); Schub / Leistung aus der mittleren Steigrate des Profils; Gipfelhöhe ${fmt(m.ceiling, 0)} ft. Steigflug: Profil-IAS${jet ? ", dann Reise-Mach" : ""}; Sinkflug mit Profil-Sinkrate; konstanter Wind${c.windKnown ? "" : " (unbekannt: 0 kt, gestrichelt = Bereich)"}. Masse nicht modelliert.`,
      `Modelo ${m.label}: atmósfera ISA; polar parabólica (fineza máx. ${fmt(m.ld, 1)}, resistencia mínima a ${fmt(m.veMd, 0)} kt IAS); ${jet ? "consumo ∝ empuje × √θ × (1 + 0,8 M), empuje ∝ σ^0,75 y ∝ σ por encima de la tropopausa" : "consumo ∝ potencia, potencia ∝ " + (pist ? "(1,132 σ − 0,132)" : "σ^0,7")}; referencia de crucero a ${fmt(m.hRef, 0)} ft (${escXml(m.refSrc)}); empuje / potencia ajustados al régimen medio de ascenso del perfil; techo ${fmt(m.ceiling, 0)} ft. Ascenso: IAS del perfil${jet ? " y luego Mach de crucero" : ""}; descenso al régimen del perfil; viento constante${c.windKnown ? "" : " (desconocido: 0 kt, punteado = horquilla)"}. Masa no modelizada.`);
  }

  // ---------------------------------------------------------------------------------------------------
  // 2 à 4. Montée : vario, vitesses, comparaison, tables
  // ---------------------------------------------------------------------------------------------------

  /** Courbes de montée (vario, Badin), table comparative des lois, table par altitude et régimes RPM, et leurs panneaux. */
  function drawClimb(m, c, K) {
    $("climbBlock").hidden = false;
    const unit = fuelUnit(),
      PER = L.per1000(),
      top = K.top,
      step = top > 20000 ? 1000 : 500,
      man = manualLaw(m);
    const pts = K.pts ||= (() => {
      const a = [];
      for (let h = 0; h <= K.topX; h += step) {
        try {
          const p = m.climbPoint(h);
          if (p && Number.isFinite(p.roc)) a.push(p);
        } catch {
          break;
        }
      }
      return a;
    })();
    const mpts = pts.map(p => m.manualPoint(p.h, man)),
      p0 = pts[0];
    const hTarget = Math.min(c.FL * 100, top),
      kC = m.cruise(hTarget, "normal");

    // --- 2. vario selon l'altitude ------------------------------------------------------------------
    guard("panelClimb", "climbChart", tl("Montée — vario", "Climb — rate", "Steigflug — Steigrate", "Ascenso — régimen"), () => {
      const svg = $("climbChart"),
        H = 230,
        W = chartW(svg, H),
        Lm = 52,
        R = 44,
        T = 14,
        B = 30,
        xmax = Math.max(K.topX, 1000);
      const rmax = Math.max(...pts.map((p, i) => Math.max(p.roc, p.profileRoc, mpts[i].roc))) * 1.08;
      const fmax = Math.max(...pts.filter(p => Number.isFinite(p.fuelPer1000) && p.roc > 100).map(p => cv(p.fuelPer1000))) * 1.08 ||
        1;
      /** Coordonnées du graphique : X (altitude), Y (vario), Yf (carburant par 1000 ft). */
      const X = h => Lm + h / xmax * (W - Lm - R),
        Y = v => T + (1 - v / rmax) * (H - T - B),
        Yf = v => T + (1 - v / fmax) * (H - T - B);
      let g = "";
      for (let i = 0; i <= 4; i++) {
        const v = rmax * i / 4;
        g += `<line class="grid-line" x1="${Lm}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 5}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text><text x="${W - R + 5}" y="${Yf(fmax * i / 4) + 4}">${fmt(fmax * i / 4, 1)}</text>`;
      }
      const tick = xmax > 30000 ? 10000 : xmax > 12000 ? 5000 : 2000;
      for (let h = 0; h <= xmax; h += tick) g += `<text x="${X(h)}" y="${H - B + 14}" text-anchor="middle">${flTxt(h)}</text>`;
      /** Tracé SVG d'une grandeur f(point, index) sur les points retenus par sel. */
      const pl = (f, sel = () => true) => pts.map((p, i) => [p, i]).filter(([p]) => sel(p)).map(([p, i], j) => `${j ? "L" : "M"}${X(p.h).toFixed(1)},${f(p, i).toFixed(1)}`).join("");
      g += `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>` +
        `<path class="band" d="${pl(p => Y(Math.max(0, p.profileRoc)))}"/><path class="curve" d="${pl(p => Y(Math.max(0, p.roc)))}"/>` +
        `<path class="curve-fuel" d="${pl(p => Yf(cv(p.fuelPer1000)), p => p.roc > 100)}"/><path class="curve-man" d="${pl((p, i) => Y(Math.max(0, mpts[i].roc)))}"/>`;
      if (!S.manual.full && S.manual.vs < rmax) g += `<line class="target" x1="${Lm}" x2="${W - R}" y1="${Y(S.manual.vs)}" y2="${Y(S.manual.vs)}"/>`; // vario visé
      g += beyondZone(X, T, H - B, m.ceiling, xmax);
      g += `<text x="${(Lm + W - R) / 2}" y="${H - 3}" text-anchor="middle">${tl("Altitude", "Altitude", "Höhe", "Altitud")}</text><text x="11" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 11 ${(T + H - B) / 2})">ft/min</text>` +
        `<text x="${W - 8}" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(90 ${W - 8} ${(T + H - B) / 2})">${PER}</text>` +
        `<line id="climbCursor" class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><rect id="climbHit" x="${Lm}" y="${T}" width="${W - Lm - R}" height="${H - T - B}" fill="transparent"/>`;
      svg.innerHTML = typo(g);
      svg.hidden = false;
      svg.dataset.t = T;
      svg.dataset.b = B;
      sync.add({
        svg,
        hit: $("climbHit"),
        W,
        L: Lm,
        R,
        T,
        bottom: H - B,
        xmax,
        /** Jauge et lecture au point de montée le plus proche de h. */
        show: h => {
          const i = Math.min(pts.length - 1, Math.round(h / step)),
            p = pts[i],
            mp = mpts[i];
          cursorAt("climbCursor", X(p.h));
          $("climbReadout").innerHTML = typo(`<b>⌖ ${flTxt(p.h)}</b><dl class="kvp"><dt>${lab(tl("Vario max", "Max. rate", "Max. Steigrate", "Régimen máx."), COL.prof)}</dt><dd>${fmt(p.roc, 0)} ft/min · ${def("Vy")} ${fmt(p.vyIas, 0)} kt (${def("TAS")} ${fmt(p.vyTas, 0)})</dd><dt>${lab(L.climbSpd(), COL.ref)}</dt><dd>${fmt(Math.max(0, p.profileRoc), 0)} ft/min</dd><dt>${lab(tl("Carburant", "Fuel", "Kraftstoff", "Combustible"), COL.fast)}</dt><dd>${fmt(cv(p.fuelPer1000), 1)} ${PER} · ${showFuel(p.ff)} ${unit}/h</dd><dt>${lab(L.man(), COL.man)}</dt><dd>${fmt(Math.max(0, mp.roc), 0)} ft/min · ${fmt(mp.ias, 0)} kt · ${tl("gaz", "throttle", "Leistung", "gases")} ${fmt(mp.frac * 100, 0)} %</dd><dt>${def("Vx")}</dt><dd>${fmt(p.vxIas, 0)} kt</dd></dl>`);
        },
        /** Jauge masquée et lecture vidée. */
        leave: () => {
          $("climbCursor").setAttribute("visibility", "hidden");
          $("climbReadout").textContent = "";
        }
      });
      panel("panelClimb", tl("Montée — vario", "Climb — rate", "Steigflug — Steigrate", "Ascenso — régimen"),
        `<p>${tl("Au sol", "At sea level", "Am Boden", "Al nivel del mar")} : ${def("Vy")} ${fmt(p0.vyIas, 0)} kt, ${fmt(p0.roc, 0)} ft/min · ${def("Vx")} ${fmt(p0.vxIas, 0)} kt</p>`,
        legend([
          [sw(COL.prof), lab(tl("Vario max", "Max. rate", "Max. Steigrate", "Régimen máx."), COL.prof), tl(`obtenu à ${def("Vy")}`, `flown at ${def("Vy")}`,
            `bei ${def("Vy")}`, `a ${def("Vy")}`)],
          [sw(COL.ref, true), lab(def("climbSpd", L.climbSpd()), COL.ref), tl("vario à cette vitesse", "rate at this speed",
            "Steigrate bei dieser Geschwindigkeit", "régimen a esta velocidad")],
          [sw(COL.fast), lab(tl("Carburant", "Fuel", "Kraftstoff", "Combustible"), COL.fast), `${PER} ${tl("(échelle de droite)", "(right scale)", "(rechte Skala)", "(escala derecha)")}`],
          [sw(COL.man), lab(L.man(), COL.man), `${manualTxt()} — ${tl("curseurs verticaux : vario à gauche, Badin à droite", "vertical sliders: rate on the left, IAS on the right", "senkrechte Regler: Steigrate links, IAS rechts", "cursores verticales: régimen a la izquierda, IAS a la derecha")}`]
        ]),
        `<div id="climbReadout" class="readout"></div>`,
        reading(tl(
          "au trait blanc (niveau épinglé), le vario encore disponible : il baisse jusqu’au plafond. Violet sous le bleu : la loi réglée monte moins vite que Vy, en réduisant les gaz.",
          "at the white line (pinned level), the rate still available: it drops towards the ceiling. Violet below blue: the set law climbs slower than Vy, with reduced throttle.",
          "an der weißen Linie (angeheftete Höhe) die noch verfügbare Steigrate: sie sinkt bis zur Gipfelhöhe. Violett unter Blau: das eingestellte Gesetz steigt langsamer als Vy, mit reduzierter Leistung.",
          "en la línea blanca (nivel fijado), el régimen aún disponible: baja hasta el techo. Violeta bajo el azul: la ley ajustada sube más despacio que Vy, con gases reducidos."
        )));
    });

    // --- 3. Badin des lois de montée selon l'altitude ----------------------------------------------------
    const hMidC = Math.round(hTarget / 2 / 500) * 500;
    let mv = null,
      mt = null,
      mf = null;
    try {
      [mv, mt, mf] = K.mid ||= ["vy", "time", "fuel"].map(o => m.climbOpt(hMidC, o, kC));
    } catch (e) {
      console.error("Vue des courbes — lois optimales :", e);
    }
    guard("panelSpeed", "climbSpeedChart", tl("Vitesses de montée", "Climb speeds", "Steiggeschwindigkeiten", "Velocidades de ascenso"),
      () => {
        const sv = $("climbSpeedChart"),
          H = 200,
          W = chartW(sv, H),
          Lm = 52,
          R = 12,
          T = 12,
          B = 30;
        const sch = (K.sch ||= pts.filter(p => p.h <= hTarget || hTarget < step).map(p => ({
            h: p.h,
            vy: m.climbOpt(p.h, "vy", kC),
            t: m.climbOpt(p.h, "time", kC),
            f: m.climbOpt(p.h, "fuel", kC),
            vx: p.vxIas,
            pr: active.climb?.iasKt ? +active.climb.iasKt : null
          })))
          .map(r => ({
            ...r,
            mn: m.manualPoint(r.h, man)
          }));
        // Badin (traits pleins) et TAS (pointillés, même couleur) de chaque loi
        const xm = Math.max(hTarget, step),
          all = sch.flatMap(r => [r.vy?.ias, r.t?.ias, r.f?.ias, r.pr, r.mn.ias, r.vx, r.vy?.tas, r.t?.tas, r.f?.tas, r.mn.tas]).filter(
            Number.isFinite);
        const vmin = Math.min(...all) * .92,
          vmax = Math.max(...all) * 1.06,
          X = h => Lm + h / xm * (W - Lm - R),
          Y = v => T + (1 - (v - vmin) / (vmax - vmin || 1)) * (H - T - B);
        let g = "";
        for (let i = 0; i <= 4; i++) {
          const v = vmin + (vmax - vmin) * i / 4;
          g += `<line class="grid-line" x1="${Lm}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 5}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`;
        }
        const tk = xm > 30000 ? 10000 : xm > 12000 ? 5000 : 2000;
        for (let h = 0; h <= xm; h += tk) g += `<text x="${X(h)}" y="${H - B + 14}" text-anchor="middle">${flTxt(h)}</text>`;
        /** Tracé SVG d'une grandeur de la table des vitesses (trait coloré si col). */
        const pth = (f, cls, col) => {
          const d = sch.map(r => [r.h, f(r)]).filter(x => Number.isFinite(x[1])).map((x, i) => `${i ? "L" : "M"}${X(x[0]).toFixed(1)},${Y(x[1]).toFixed(1)}`).join("");
          return d ? `<path class="${cls}" d="${d}"${col ? ` style="stroke:${col}"` : ""}/>` : "";
        };
        g += `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>${pth(r => r.pr, "band")}${pth(r => r.vx, "curve-vx")}${pth(r => r.vy?.ias, "curve")}${pth(r => r.t?.ias, "curve-fuel")}${pth(r => r.f?.ias, "curve-eco")}${pth(r => r.mn.ias, "curve-man")}` +
          `${pth(r => r.vy?.tas, "tas-line", COL.prof)}${pth(r => r.t?.tas, "tas-line", COL.fast)}${pth(r => r.f?.tas, "tas-line", COL.eco)}${pth(r => r.mn.tas, "tas-line", COL.man)}` +
          `<text x="${(Lm + W - R) / 2}" y="${H - 3}" text-anchor="middle">${tl("Altitude", "Altitude", "Höhe", "Altitud")}</text><text x="11" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 11 ${(T + H - B) / 2})">kt</text>` +
          `<line id="climbSpeedCursor" class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><rect id="climbSpeedHit" x="${Lm}" y="${T}" width="${W - Lm - R}" height="${H - T - B}" fill="transparent"/>`;
        sv.innerHTML = typo(g);
        sv.hidden = false;
        sv.dataset.t = T;
        sv.dataset.b = B;
        /** Ligne de la lecture : Badin (TAS) · vario · débit carburant d'une loi, ou « — ». */
        const one = (x, col, name) => `<dt>${lab(name, col)}</dt><dd>${x ? `${fmt(x.ias, 0)} kt (TAS ${fmt(x.tas, 0)}) · ${fmt(x.roc, 0)} ft/min · ${showFuel(x.ff)} ${unit}/h${m.kind !== "jet" ? ` · ${fmt(x.frac * 100, 0)} %` : ""}` : "—"}</dd>`;
        sync.add({
          svg: sv,
          hit: $("climbSpeedHit"),
          W,
          L: Lm,
          R,
          T,
          bottom: H - B,
          xmax: xm,
          /** Jauge et lecture au niveau de la table le plus proche de h. */
          show: h => {
            const r = sch.reduce((a, x) => Math.abs(x.h - h) < Math.abs(a.h - h) ? x : a, sch[0]);
            if (!r) return;
            cursorAt("climbSpeedCursor", X(r.h));
            $("climbSpeedReadout").innerHTML = typo(`<b>⌖ ${flTxt(r.h)}</b><dl class="kvp">${one(r.vy, COL.prof, "Vy")}${one(r.t, COL.fast, L.fast())}${one(r.f, COL.eco, L.fuelLaw())}${one(r.mn, COL.man, L.man())}<dt>${def("Vx")}</dt><dd>${fmt(r.vx, 0)} kt</dd></dl>`);
          },
          /** Jauge masquée et lecture vidée. */
          leave: () => {
            $("climbSpeedCursor").setAttribute("visibility", "hidden");
            $("climbSpeedReadout").textContent = "";
          }
        });
        /** Ligne du panneau : Badin · vario (et gaz hors réacteur) d'une loi à mi-montée. */
        const law = (x, col, name) => `<dt>${lab(name, col)}</dt><dd>${x ? `${fmt(x.ias, 0)} kt · ${fmt(x.roc, 0)} ft/min${m.kind !== "jet" ? ` · ${tl("gaz", "throttle", "Leistung", "gases")} ${fmt(x.frac * 100, 0)} %` : ""}` : "—"}</dd>`;
        panel("panelSpeed", tl("Vitesses de montée", "Climb speeds", "Steiggeschwindigkeiten", "Velocidades de ascenso"),
          `<p>${tl("Badin à tenir, à mi-montée", "IAS to fly, at mid-climb", "Zu fliegende IAS, halber Steigflug", "IAS a mantener, a media subida")} (${flTxt(hMidC)}) :</p><dl class="kvp">${law(mv, COL.prof, def("Vy"))}${law(mt, COL.fast, L.fast())}${law(mf, COL.eco, L.fuelLaw())}${law(m.manualPoint(hMidC, man), COL.man, L.man())}<dt>${def("Vx")} (${tl("pente max", "max. angle", "max. Steigwinkel", "ángulo máx.")})</dt><dd>${fmt(m.climbPoint(hMidC).vxIas, 0)} kt</dd></dl>`,
          `<div id="climbSpeedReadout" class="readout"></div>`,
          reading(tl(`trois objectifs incompatibles : ${def("Vy")} gagne l’altitude au plus vite ; la loi rapide arrive au plus tôt (plus vite, moins de vario) ; la loi économique dépense le moins. Pointillés : ${def("climbSpd", L.climbSpd())} ; pointillés fins bleus : ${def("Vx")} (obstacle à franchir) ; tirets de la couleur de chaque loi : sa TAS (vitesse vraie), qui s’écarte du Badin en montant. Les curseurs violets (vario à gauche, Badin à droite) règlent votre propre loi.`, `three incompatible goals: ${def("Vy")} gains altitude fastest; the fast law arrives soonest (faster, less rate); the economy law burns least. Dashed: ${def("climbSpd", L.climbSpd())}; thin blue dots: ${def("Vx")} (obstacle clearance). The violet sliders (rate left, IAS right) set your own law.`, `drei unvereinbare Ziele: ${def("Vy")} gewinnt am schnellsten Höhe; das schnelle Gesetz kommt am frühesten an (schneller, weniger Steigrate); das sparsame verbraucht am wenigsten. Gestrichelt: ${def("climbSpd", L.climbSpd())}; feine blaue Punkte: ${def("Vx")} (Hindernisfreiheit). Die violetten Regler (Steigrate links, IAS rechts) stellen Ihr eigenes Gesetz ein.`, `tres objetivos incompatibles: ${def("Vy")} gana altitud lo antes posible; la ley rápida llega antes (más rápida, menos régimen); la económica gasta lo mínimo. Punteado: ${def("climbSpd", L.climbSpd())}; puntos azules finos: ${def("Vx")} (franqueo de obstáculos). Los cursores violetas (régimen a la izquierda, IAS a la derecha) ajustan su propia ley.`)));
      });

    // --- comparaison des lois : montée au niveau du plan et trajet entier ----------------------------------
    guard("panelCompare", "climbCompare", tl("Comparaison des lois", "Law comparison", "Vergleich der Gesetze", "Comparación de leyes"),
      () => {
        const laws = [
          ["profile", L.climbSpd(), COL.ref],
          ["vy", "Vy", COL.prof],
          ["time", L.fast(), COL.fast],
          ["fuel", L.fuelLaw(), COL.eco]
        ];
        const res = [...(K.res ||= laws.map(([id, label, col]) => ({
          id,
          label,
          col,
          t: m.trip(hTarget, c.D, c.wc, "normal", id)
        }))), {
          id: man,
          label: `${L.man()} (${manualTxt()})`,
          col: COL.man,
          t: m.trip(hTarget, c.D, c.wc, "normal", man)
        }];
        const okR = res.filter(r => r.t.ok),
          min = k => okR.reduce((a, b) => !a || k(b) < k(a) ? b : a, null);
        const bT = min(r => r.t.minutes),
          bF = min(r => r.t.fuel),
          bV = min(r => r.t.climb.minutes);
        /** Cellule du tableau, marquée ★ si la loi est la meilleure de la colonne. */
        const cell = (r, best, txt) => `<td${r === best ? ' class="best"' : ""}>${txt}${r === best ? " ★" : ""}</td>`;
        $("climbCompare").innerHTML = typo(`<table><thead><tr><th>${tl("Loi — montée au", "Law — climb to", "Gesetz — Steigflug auf", "Ley — ascenso a")} ${flTxt(hTarget)}</th><th>${tl("Durée", "Time", "Dauer", "Duración")}</th><th>NM</th><th>${unit}</th><th>${tl("Trajet", "Trip", "Strecke", "Trayecto")}</th><th>${unit}</th></tr></thead><tbody>${res.map(r => r.t.ok
        ? `<tr><td>${lab(r.label, r.col)}</td>${cell(r, bV, hmTxt(r.t.climb.minutes))}<td>${fmt(r.t.climb.nm, 0)}</td><td>${fmt(cv(r.t.climb.fuel), 0)}</td>${cell(r, bT, hmTxt(r.t.minutes))}${cell(r, bF, fmt(cv(r.t.fuel), 0))}</tr>`
        : `<tr><td>${lab(r.label, r.col)}</td><td colspan="5" class="unreach">${tl("inatteignable", "unreachable", "nicht erreichbar", "inalcanzable")} — ${whyNot(m, c, r.t, hTarget, r.id)}</td></tr>`).join("")}</tbody></table>`);
        panel("panelCompare", tl("Comparaison des lois", "Law comparison", "Vergleich der Gesetze", "Comparación de leyes"),
          reading(tl(`montée jusqu’au niveau du plan (${flTxt(hTarget)}) puis trajet entier de ${fmt(c.D, 0)} NM, pour chaque loi. ★ : meilleur de la colonne. Lois rapide et économique : la distance parcourue en montée est retranchée de la croisière ; vario ≥ 50 % du vario max ; réacteur limité à 250 kt sous FL100.`, `climb to the plan level (${flTxt(hTarget)}) then the whole ${fmt(c.D, 0)} NM trip, for each law. ★: best in the column. Fast and economy laws: the distance covered while climbing is deducted from the cruise; rate ≥ 50 % of the maximum; jets limited to 250 kt below FL100.`, `Steigflug auf die Planhöhe (${flTxt(hTarget)}) und gesamte Strecke von ${fmt(c.D, 0)} NM, je Gesetz. ★: bester Wert der Spalte. Schnelles und sparsames Gesetz: die Steigstrecke wird vom Reiseflug abgezogen; Steigrate ≥ 50 % des Maximums; Strahlflugzeuge unter FL100 auf 250 kt begrenzt.`, `ascenso al nivel del plan (${flTxt(hTarget)}) y trayecto completo de ${fmt(c.D, 0)} NM, para cada ley. ★: mejor de la columna. Leyes rápida y económica: la distancia en ascenso se descuenta del crucero; régimen ≥ 50 % del máximo; reactores limitados a 250 kt bajo FL100.`)));
      });

    // --- table par altitude (cumuls à Vy) et régimes de la table RPM / N1 -----------------------------------
    guard("panelTable", "climbTable", tl("Montée par altitude", "Climb by altitude", "Steigflug nach Höhe", "Ascenso por altitud"),
      () => {
        const every = Math.max(step, Math.round(top / 6 / 1000) * 1000 || step);
        const rows = pts.filter(p => p.h <= top && (p.h % every === 0 || p.h === top)).map(p => {
          const k = p.h ? m.climbTo(p.h, {
            speed: "vy"
          }) : {
            minutes: 0,
            nm: 0,
            fuel: 0
          };
          return `<tr><td>${flTxt(p.h)}</td><td>${fmt(p.vyIas, 0)} / ${fmt(p.vyTas, 0)}</td><td>${fmt(p.roc, 0)}</td><td>${fmt(p.vxIas, 0)}</td><td>${showFuel(p.ff)}</td><td>${fmt(cv(p.fuelPer1000), 1)}</td><td>${k ? `${hmTxt(k.minutes)} · ${fmt(k.nm, 0)} NM · ${fmt(cv(k.fuel), 0)}` : "—"}</td></tr>`;
        }).join("");
        const hMid = hMidC,
          ffOf = r => r.fuelFlowPerHour ?? r.fuelFlowMax;
        const rpm = (active.rpmFuelCurve || []).filter(r => Number.isFinite(r.rpm) && Number.isFinite(ffOf(r)))
          .map(r => ({
            r,
            ff: ffOf(r),
            at: m.settingAt(ffOf(r), hMid),
            sl: m.settingAt(ffOf(r), 0)
          })).filter(x => x.at.roc > 100);
        const bestRpm = rpm.reduce((a, b) => !a || b.at.fuelPer1000 < a.at.fuelPer1000 ? b : a, null),
          RATE = tl("Vario", "Rate", "Steigrate", "Régimen");
        $("climbTable").innerHTML = typo(`<table><thead><tr><th>${tl("Altitude", "Altitude", "Höhe", "Altitud")}</th><th>Vy ${tl("Badin", "IAS", "IAS", "IAS")} / TAS (kt)</th><th>${tl("Vario max", "Max. rate", "Max. Steigrate", "Régimen máx.")} (ft/min)</th><th>Vx (kt)</th><th>${tl("Débit", "Fuel flow", "Verbrauch", "Flujo")} (${unit}/h)</th><th>${PER}</th><th>${tl("Cumul depuis le sol à Vy", "Cumulative from ground at Vy", "Kumuliert ab Boden mit Vy", "Acumulado desde el suelo a Vy")}</th></tr></thead><tbody>${rows}</tbody></table>` +
          (rpm.length ? `<h4>${tl("Régimes de montée (table RPM / N1)", "Climb settings (RPM / N1 table)", "Steigflugeinstellungen (RPM-/N1-Tabelle)", "Regímenes de ascenso (tabla RPM / N1)")} — ${flTxt(hMid)}</h4><table><thead><tr><th>RPM / N1</th><th>${tl("Débit", "Fuel flow", "Verbrauch", "Flujo")}</th><th>${tl("Gaz", "Throttle", "Leistungshebel", "Gases")}</th><th>${RATE} ${tl("sol", "SL", "Boden", "nivel del mar")}</th><th>${RATE} ${flTxt(hMid)}</th><th>${PER}</th></tr></thead><tbody>${rpm.sort((a, b) => a.r.rpm - b.r.rpm).map(x => `<tr><td${x === bestRpm ? ' class="best"' : ""}>${fmt(x.r.rpm, 0)}${x === bestRpm ? " ★" : ""}</td><td>${showFuel(x.ff)}</td><td>${fmt(x.at.frac * 100, 0)} %</td><td>${fmt(x.sl.roc, 0)}</td><td>${fmt(x.at.roc, 0)}</td><td>${fmt(cv(x.at.fuelPer1000), 1)}</td></tr>`).join("")}</tbody></table>` : ""));
        panel("panelTable", tl("Montée par altitude", "Climb by altitude", "Steigflug nach Höhe", "Ascenso por altitud"),
          reading(tl(`montée à ${def("Vy")} : vario, débit et carburant par 1000 ft à chaque altitude, cumuls depuis le sol.`, `climb at ${def("Vy")}: rate, fuel flow and fuel per 1000 ft at each altitude, totals from the ground.`, `Steigflug mit ${def("Vy")}: Steigrate, Verbrauch und Kraftstoff je 1000 ft auf jeder Höhe, Summen ab Boden.`, `ascenso a ${def("Vy")}: régimen, flujo y combustible por 1000 ft a cada altitud, acumulados desde el suelo.`)),
          rpm.length ? `<p>${tl(`Table RPM / N1 : vario et carburant par pied gagné à ${flTxt(hMid)} pour chaque régime de la table (au-delà de la puissance disponible : plein gaz). ★ : le plus économique.`, `RPM / N1 table: rate and fuel per foot gained at ${flTxt(hMid)} for each setting of the table (beyond the power available: full throttle). ★: most economical.`, `RPM-/N1-Tabelle: Steigrate und Kraftstoff je gewonnenem Fuß auf ${flTxt(hMid)} für jede Einstellung (über der verfügbaren Leistung: Vollgas). ★: am sparsamsten.`, `Tabla RPM / N1: régimen y combustible por pie ganado a ${flTxt(hMid)} para cada régimen de la tabla (por encima de la potencia disponible: gases a fondo). ★: el más económico.`)}${mf && m.kind !== "jet" ? ` ${tl(`Loi économique : gaz ${fmt(mf.frac * 100, 0)} %, ${showFuel(mf.ff)} ${unit}/h.`, `Economy law: throttle ${fmt(mf.frac * 100, 0)} %, ${showFuel(mf.ff)} ${unit}/h.`, `Sparsames Gesetz: Leistung ${fmt(mf.frac * 100, 0)} %, ${showFuel(mf.ff)} ${unit}/h.`, `Ley económica: gases ${fmt(mf.frac * 100, 0)} %, ${showFuel(mf.ff)} ${unit}/h.`)}` : ""}</p>` : "");
      });
  }

  addEventListener("resize", () => alignSliders());
  // largeur de colonne ou hauteur de fenêtre changée : courbes redessinées à la nouvelle taille (sans recalcul du cache)
  {
    let last = "",
      t = 0;
    addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const w = document.querySelector("#optBlock .chart-wrap")?.clientWidth || 0,
          key = `${Math.round(w / 20)}|${Math.round(innerHeight / 20)}`;
        if (key !== last && S.m) {
          last = key;
          renderAll(S.m, S.c);
          window.StickyFrame?.resetGrow?.();
        }
      }, 250);
    });
  }
  window.renderAltitudeOptimum = renderAltitudeOptimum;
  window.FlightPerfView = {
    sync,
    /** Redessine toutes les courbes avec le dernier calcul (ex. couleurs refaites au changement de design). */
    renderAll: () => S.m && renderAll(S.m, S.c),
    state: S,
    /** Loi réglée par les curseurs pour le profil actif : { ias, vs, full } ; null avant le premier calcul. */
    manual: () => S.manual && S.manual.pid.startsWith(`${active?.id}|`) ? {
      ias: S.manual.ias,
      vs: S.manual.vs,
      full: S.manual.full
    } : null
  };
})();
