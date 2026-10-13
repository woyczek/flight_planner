/* =====================================================================================================
   Flight Performance Planner — vue des courbes de performances
   -----------------------------------------------------------------------------------------------------
   Dessine, à partir du modèle calibré (shared/flight_performance_model.js, FlightPerfModel) :
     1. la décision du niveau de vol (toutes vues) : carburant et temps du trajet entier selon le niveau ;
     2. la montée (vue détaillée) : vario, carburant par 1000 ft, Badin et TAS selon l'altitude, pour l'objectif des
        consignes, sur le même axe et avec le même curseur que la décision ;
     3. la comparaison des objectifs de montée (tableau) et les régimes de la cartographie moteur, s'il y en a une.

   Mise en page (flight_performance_planner.html) : colonne gauche = saisie, courbes et tables ;
   colonne droite (#perfSide) = bloc Résultat puis un panneau d'explications par courbe. Ces cadres
   « semi-mobiles » sont gérés par le framework (shared/sticky_frame.js, StickyFrame.follow) : chaque
   panneau arrive avec sa courbe, reste sous le bloc Résultat tant qu'elle est à l'écran, repart avec elle.

   Loi de montée réglable (violet) : trois curseurs « Montée choisie » du devis (#climbCtl, vue détaillée) —
   vitesse indiquée, vario, régime (RPM / N1 de la cartographie moteur, sinon gaz en %) ; deux sont fixés, le
   troisième est calculé (FlightPerfModel : manualLaw / manualPoint ; gaz réduits pour tenir le vario, plein
   gaz au-delà). Consignes de montée (#climbGuide, toutes vues) : objectif, tableau par tranche d'altitude et
   phrase « Régler / Tenir / Attendu ». Graphe de montée : par altitude ou par régime (bascule de la rangée).

   Décision du niveau de vol (#levelDecision, toutes vues, en tête) : carburant et temps du trajet entier selon le
   niveau (montée à l'objectif des consignes), plan / le plus économe / le plus rapide repérés ; curseur (survol, clic,
   réglette) avec sa fiche et les consignes de montée jusqu'à ce niveau ; « Utiliser ce niveau », « Comparer » ;
   tableau des niveaux ronds, triable.

   Curseur : celui de la décision du niveau (survol, clic, réglette, pastilles), repris par le graphe de montée, les
   consignes de montée et les instruments.

   Couleurs : une par série (COL), portée par le trait de la courbe et par le LIBELLÉ seulement — les
   valeurs restent en texte normal. Définitions (Vy, Vx, Badin…) au survol des termes soulignés.

   Dépendances : globales de la page — $(id), tl(fr, en, de, es), typo(html), fmt(x, décimales),
   f3(x), flTxt(ft), hmTxt(minutes), fuelUnit(), convertFuel(v, de, vers), showFuel(v), escXml(s),
   active (profil courant), perfModel() ; FlightPerfModel ; StickyFrame.

   Point d'entrée : renderAltitudeOptimum(c), appelé par calculate() avec
     c = { D : distance (NM), FL : niveau du plan (centaines de ft), windKnown : vent saisi,
           wc : composante de vent sur la route (kt, + = arrière), low / high : fourchette si vent inconnu,
           climbFF / cruiseFF / descentFF : débits du profil (unité du profil) }.
   Sortie : graphe de montée, tableaux, panneaux #panelDecision et #panelClimb, window.altitudeOptimum (repère de recalcul).
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
    fast: () => tl("montée rapide", "fast climb", "schneller Steigflug", "ascenso rápido"),
    fuelLaw: () => tl("montée économique", "economy climb", "sparsamer Steigflug", "ascenso económico"),
    man: () => tl("montée choisie", "chosen climb", "gewählter Steigflug", "ascenso elegido"),
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
    const wrapW = Math.max(300, (svg.parentElement?.clientWidth || 540) - 8),
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
  /** Graduations rondes d'un axe : pas de 1, 2, 2,5 ou 5 × 10^n couvrant [lo, hi] en n intervalles environ ; zero :
   *  l'axe part de 0. Sortie : { lo, hi (bornes arrondies au pas), ticks (valeurs), dec (décimales à afficher) }. */
  const niceAxis = (lo, hi, n = 4, zero = false) => {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return {
      lo: 0,
      hi: 1,
      ticks: [0, 1],
      dec: 0
    };
    if (zero) lo = Math.min(0, lo);
    if (!(hi > lo)) hi = lo + (Math.abs(lo) || 1);
    const raw = (hi - lo) / n,
      p = Math.pow(10, Math.floor(Math.log10(raw))),
      f = raw / p,
      step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p,
      a = Math.floor(lo / step + 1e-9) * step,
      b = Math.ceil(hi / step - 1e-9) * step,
      ticks = [];
    for (let v = a; v <= b + step / 2; v += step) ticks.push(+v.toPrecision(12));
    let dec = 0;
    while (dec < 6 && Math.abs(step * 10 ** dec - Math.round(step * 10 ** dec)) > 1e-6) dec++;
    return {
      lo: a,
      hi: b,
      ticks,
      dec
    };
  };
  /** Repère du niveau du plan de vol sur une courbe à l'altitude en abscisse : trait vertical discret et étiquette
   *  « FL240 plan » (rien si le niveau est hors de l'axe). X : abscisse d'une altitude ; T, bottom : haut et bas. */
  const planMark = (X, T, bottom, h, xmax) => h > 0 && h <= xmax ?
    `<line class="plan-line" x1="${X(h).toFixed(1)}" x2="${X(h).toFixed(1)}" y1="${T}" y2="${bottom}"/><text class="plan-label" x="${(X(h) + 3).toFixed(1)}" y="${bottom - 5}">${flTxt(h)} ${tl("plan", "plan", "Plan", "plan")}</text>` : "";
  /** Place la ligne de jauge (élément SVG id) à l'abscisse x et l'affiche. */
  const cursorAt = (id, x) => {
    const l = $(id);
    l.setAttribute("x1", x);
    l.setAttribute("x2", x);
    l.setAttribute("visibility", "visible");
  };

  // ---------------------------------------------------------------------------------------------------
  // Loi de montée réglable : état (badin, vario, régime — deux fixés, le troisième calculé)
  // ---------------------------------------------------------------------------------------------------

  /** Initialise la loi réglable pour le profil actif et le modèle m, ou garde les réglages s'il s'agit du même
   *  profil. Bornes : Badin 0,8 – 2,6 × Ve_md (réacteur ≤ 360 kt) ; vario 100 ft/min – vario max au sol
   *  (curseur au maximum : plein gaz). Départ : Badin et vario de montée du profil fixés, régime calculé.
   *  calc : grandeur calculée (« ias », « vs » ou « rpm ») ; fixed : les deux autres, la plus anciennement fixée
   *  d'abord ; frac : fraction de gaz fixée (quand le régime est fixé) ; unreach : vario fixé hors d'atteinte. */
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
      full: !vs || vs >= vMax,
      frac: 1,
      calc: "rpm",
      fixed: ["ias", "vs"],
      unreach: false
    };
  }
  /** Loi h → { ve, frac } réglée, à passer à m.trip / m.climbTo / m.manualPoint (null sans modèle). Badin et vario
   *  fixés : gaz réduits pour tenir le vario (FlightPerfModel.manualLaw) ; régime fixé : gaz constants (fraction
   *  q.frac), Badin fixé ou calculé (réacteur : borné au Mach de croisière en altitude). */
  const manualLaw = m => {
    const q = S.manual;
    if (!q || !m) return null;
    if (q.calc === "rpm") return m.manualLaw(q.ias, q.full ? 0 : q.vs);
    const base = m.manualLaw(q.ias, 0),
      fr = Math.min(1, Math.max(.05, q.frac));
    return h => ({
      ve: base(h).ve,
      frac: fr
    });
  };
  /** Libellé court de la loi réglée : « 300 kt, 1 800 ft/min », « 300 kt, plein gaz » ou « 120 kt, gaz 75 % ». */
  const manualTxt = () => {
    const q = S.manual;
    if (q.calc === "rpm") return `${fmt(q.ias, 0)} kt, ${q.full ? L.full() : `${fmt(q.vs, 0)} ft/min`}`;
    return `${fmt(q.ias, 0)} kt, ${q.frac >= .995 ? L.full() : `${tl("gaz", "throttle", "Leistung", "gases")} ${fmt(q.frac * 100, 0)} %`}`;
  };

  /** Loi réglée tenue partout (instruments, devis, courbes et consignes) : à rappeler après chaque changement. */
  function syncManual() {
    feedInstruments();
    syncClimbCtl();
  }
  /** Instruments du bandeau (shared/flight_instruments.js) : loi réglée à l'altitude survolée (hover), sinon
   *  épinglée, sinon niveau du plan ; masqués sans modèle. Temps de montée depuis le sol pour le chronomètre (niveau 4). */
  function feedInstruments(hover) {
    const FI = window.FlightInstruments,
      m = S.m,
      q = S.manual;
    if (!FI) return;
    FI.onRefresh ||= () => feedInstruments(); // changement de lecture de la jauge carburant
    if (!m || !q) return FI.update(null);
    try {
      const h = hover ?? sync.pinned ?? (S.c?.FL > 0 ? S.c.FL * 100 : 0),
        above = h > m.ceiling,
        hh = Math.min(h, m.ceiling),
        law = manualLaw(m),
        p = m.manualPoint(hh, law),
        a = FlightPerfModel.isa(hh).a;
      const tasMax = Math.max(p.tas, m.manualPoint(m.ceiling, law).tas || 0, m.cruise(Math.min((S.c?.FL || 0) * 100, m.ceiling),
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
        man: () => m.trip(hh, D, wc, "normal", law),
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
      // chronomètre : montée depuis le sol jusqu'à ce niveau, à la loi réglée (rien au-dessus du plafond)
      const cl = above ? null : hh > 0 ? m.climbTo(hh, {
        speed: law
      }) : {
        minutes: 0
      };
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
        vsSet: q.calc === "vs" ? null : q.vs,
        vsMax: q.vMax,
        full: q.calc === "rpm" ? q.full : p.frac >= .995,
        above,
        climbMin: cl ? cl.minutes : null
      });
    } catch (e) {
      console.error("Instruments :", e);
      FI.update(null);
    }
  }
  /** Redessin différé après un réglage : courbes (vue détaillée) puis devis. */
  function redrawSoon() {
    clearTimeout(redrawSoon.t);
    redrawSoon.t = setTimeout(() => {
      if (S.m && S.c && curvesShown()) renderAll(S.m, S.c); // vue simple : courbes masquées, devis seul
      window.planQuote?.();
    }, 40);
  }
  /** Nouvelle valeur d'un curseur (key 'ias', 'vs' ou 'rpm' — régime ou gaz) ; la grandeur calculée ne se règle pas. */
  function setManual(key, v) {
    const q = S.manual,
      m = S.m;
    if (!q || !m || !Number.isFinite(v) || key === q.calc) return;
    const h = readAlt(m);
    if (key === "ias") q.ias = clampKey("ias", v);
    else if (key === "vs") {
      q.vs = clampKey("vs", v);
      if (q.calc === "rpm") q.full = q.vs >= q.vMax;
    } else {
      q.frac = fracOfRegime(m, h, v, q.ias);
      q.full = q.frac >= .995;
    }
    if (q.calc === "ias") solveIas(m, h);
    syncManual();
    redrawSoon();
  }
  /** Case « fixé » d'une grandeur : cochée, elle devient fixée et la plus anciennement fixée devient calculée ;
   *  décochée, elle devient calculée et l'ancienne grandeur calculée est fixée. Les valeurs du moment (à mi-montée) sont
   *  gardées : la loi ne saute pas au changement. */
  function setFix(key) {
    const q = S.manual,
      m = S.m;
    if (!q || !m) return;
    const h = readAlt(m),
      p = m.manualPoint(h, manualLaw(m));
    if (key === q.calc) {
      q.calc = q.fixed[0];
      q.fixed = [q.fixed[1], key];
    } else {
      const other = q.fixed.find(k => k !== key);
      q.fixed = [other, q.calc];
      q.calc = key;
    }
    q.frac = Math.min(1, Math.max(.05, p.frac));
    if (q.calc === "rpm") {
      // Badin et vario fixés : plein gaz si les gaz l'étaient, sinon le vario du moment devient la consigne
      q.full = p.frac >= .995;
      if (!q.full) q.vs = clampKey("vs", Math.max(100, p.roc));
    } else {
      q.full = q.frac >= .995;
      if (q.calc === "ias") q.vs = clampKey("vs", Math.max(100, p.roc));
    }
    q.unreach = false;
    if (q.calc === "ias") solveIas(m, h);
    syncManual();
    redrawSoon();
  }
  /** Valeur ronde et bornée d'une entrée (vitesse : pas de 5 kt ; vario : pas de 50 ft/min). */
  function clampKey(key, v) {
    const q = S.manual,
      [lo, hi, st] = key === "ias" ? [q.iMin, q.iMax, 5] : [100, q.vMax, 50];
    return Math.min(hi, Math.max(lo, Math.round(v / st) * st));
  }
  /** Badin qui donne le vario fixé (q.vs) avec les gaz fixés (q.frac) à l'altitude h, du côté rapide de la courbe (au-dessus
   *  du meilleur vario) ; vario hors d'atteinte : Badin du meilleur vario (q.unreach vrai). Résultat dans q.ias. */
  function solveIas(m, h) {
    const q = S.manual,
      fr = Math.min(1, Math.max(.05, q.frac)),
      samples = [];
    let best = q.iMin,
      bestR = -Infinity;
    for (let v = q.iMin; v <= q.iMax; v++) {
      const base = m.manualLaw(v, 0),
        r = m.manualPoint(h, hh => ({
          ve: base(hh).ve,
          frac: fr
        })).roc;
      samples.push([v, r]);
      if (r > bestR) {
        bestR = r;
        best = v;
      }
    }
    q.unreach = bestR < q.vs;
    let pick = best;
    if (!q.unreach)
      for (const [v, r] of samples)
        if (v >= best && r >= q.vs) pick = v;
    q.ias = pick;
  }
  /** Vrai si les courbes sont affichées (vue détaillée de la page : classe fp-detail du corps). */
  const curvesShown = () => document.body.classList.contains("fp-detail");

  // ---------------------------------------------------------------------------------------------------
  // Montée choisie dans le devis (#climbCtl, vue détaillée) : trois curseurs — vitesse indiquée, vario, régime (RPM / N1
  // de la cartographie moteur, sinon gaz en %) — avec une case « fixé » devant chacun : deux fixés, le troisième calculé
  // et grisé. Valeurs lues à mi-montée ; valeur et état (« plein gaz », « calculé ») sous chaque curseur.
  // ---------------------------------------------------------------------------------------------------

  /** Hauteur tenue : l'élément ne rapetisse plus (min-height = plus grande hauteur vue), pour qu'un contenu qui suit le
   *  curseur ne fasse jamais bouger la page ; reset : repart de la hauteur actuelle. */
  const holdHeight = (el, reset = false) => {
    if (!el) return;
    if (reset) {
      el._hh = 0;
      el.style.minHeight = "";
    }
    const h = el.offsetHeight;
    if (h > (el._hh || 0)) {
      el._hh = h;
      el.style.minHeight = `${h}px`;
    }
  };
  /** Écrit une propriété d'un élément seulement si sa valeur change. */
  const put = (el, k, v) => {
    if (el && el[k] !== v) el[k] = v;
  };
  /** Lignes valides de la cartographie moteur du profil actif ramenée à l'altitude h (FlightPerfModel.mapAt : colonne
   *  Altitude facultative ; h absent : table telle quelle), triées par régime ({ rpm, ff } en unité du profil). */
  const rpmRows = h => (h == null || !window.FlightPerfModel?.mapAt ? active?.rpmFuelCurve || [] : FlightPerfModel.mapAt(active
    ?.rpmFuelCurve || [], h)).map(r => ({
    rpm: +r.rpm,
    ff: Number.isFinite(+r.fuelFlowPerHour) && r.fuelFlowPerHour !== null && r.fuelFlowPerHour !== "" ? +r.fuelFlowPerHour : (+r
      .fuelFlowMin + +r.fuelFlowMax) / 2
  })).filter(r => r.rpm > 0 && r.ff > 0).sort((a, b) => a.rpm - b.rpm);
  /** Régime de la table pour un débit ff (interpolation linéaire entre deux lignes) ; null hors de la table. */
  const rpmForFF = (rows, ff) => {
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1],
        b = rows[i];
      if ((ff - a.ff) * (ff - b.ff) <= 0 && a.ff !== b.ff) return a.rpm + (ff - a.ff) / (b.ff - a.ff) * (b.rpm - a.rpm);
    }
    return null;
  };
  /** Débit de la table pour un régime rpm (interpolation linéaire, borné aux lignes extrêmes). */
  const ffForRpm = (rows, rpm) => {
    if (!rows.length) return NaN;
    if (rpm <= rows[0].rpm) return rows[0].ff;
    for (let i = 1; i < rows.length; i++)
      if (rpm <= rows[i].rpm) {
        const a = rows[i - 1],
          b = rows[i];
        return a.ff + (rpm - a.rpm) / ((b.rpm - a.rpm) || 1) * (b.ff - a.ff);
      }
    return rows.at(-1).ff;
  };
  /** Unité du régime : N1 (%) pour un réacteur, tours par minute sinon. */
  const rpmUnit = m => m?.kind === "jet" ? "% N1" : "RPM";
  /** Échelle du curseur « régime » à l'altitude h : cartographie (deux lignes au moins : RPM / N1) ou gaz en %. */
  const regimeScale = (m, h) => {
    const rows = rpmRows(h);
    return rows.length >= 2 ? {
      map: true,
      rows,
      lo: rows[0].rpm,
      hi: rows.at(-1).rpm,
      step: m.kind === "jet" ? .5 : 10,
      unit: rpmUnit(m)
    } : {
      map: false,
      rows,
      lo: 5,
      hi: 100,
      step: 1,
      unit: "%"
    };
  };
  /** Fraction de gaz d'une valeur v du curseur « régime » à l'altitude h et au Badin ias : cartographie — débit de la
   *  table ramené au débit plein gaz à cette vitesse ; sinon v en %. Bornée à 5 – 100 %. */
  function fracOfRegime(m, h, v, ias) {
    const sc = regimeScale(m, h);
    if (!sc.map) return Math.min(1, Math.max(.05, v / 100));
    const full = m.manualPoint(h, m.manualLaw(ias, 0)).ff;
    return Math.min(1, Math.max(.05, ffForRpm(sc.rows, v) / (full || 1)));
  }
  /** Altitude de lecture de la montée : mi-montée vers le niveau du plan (borné au plafond), 1000 ft au moins. */
  const readAlt = m => Math.max(1000, Math.round(Math.min((S.c?.FL || 0) * 100, m.ceiling) / 2 / 500) * 500);
  /** Libellés de la montée choisie (4 langues). */
  const CL = {
    title: () => tl("Montée choisie", "Chosen climb", "Gewählter Steigflug", "Ascenso elegido"),
    ias: () => tl("Vitesse indiquée", "Indicated airspeed", "Angezeigte Geschwindigkeit", "Velocidad indicada"),
    vs: () => tl("Vario", "Vario", "Vario", "Vario"),
    rpm: () => tl("Régime", "Engine setting", "Drehzahl", "Régimen"),
    throttle: () => tl("Gaz (%)", "Throttle (%)", "Leistung (%)", "Gases (%)"),
    fix: () => tl("fixé", "fixed", "fest", "fijo"),
    calc: () => tl("calculé", "computed", "berechnet", "calculado"),
    fixTip: () => tl("Cocher deux grandeurs sur trois : la troisième est calculée par le modèle (grisée).",
      "Tick two quantities out of three: the third one is computed by the model (greyed).",
      "Zwei von drei Größen ankreuzen: die dritte berechnet das Modell (grau).",
      "Marcar dos magnitudes de tres: la tercera la calcula el modelo (en gris).")
  };
  /** Crée une fois le contenu de #climbCtl : titre, trois champs (case « fixé » et libellé au-dessus, curseur, valeur et
   *  état dessous), ligne de lecture. */
  function mountClimbCtl(box) {
    if (box.dataset.ready) return;
    box.dataset.ready = "1";
    const field = key => `<div class="field climb-field" data-key="${key}"><div class="climb-head"><label class="climb-fix"><input type="checkbox" data-key="${key}"><span class="climb-fixlab"></span></label><label class="climb-lab" for="cc-${key}"></label></div><input type="range" id="cc-${key}" data-key="${key}"><div class="climb-state"><output class="climb-val" for="cc-${key}"></output><span class="climb-note"></span></div></div>`;
    box.innerHTML = `<div class="climb-title"></div><div class="climb-fields">${field("ias")}${field("vs")}${field("rpm")}</div><div class="climb-read mut"></div>`;
    for (const inp of box.querySelectorAll('input[type="range"]')) inp.addEventListener("input", () => setManual(inp.dataset.key, +inp
      .value));
    for (const cb of box.querySelectorAll('input[type="checkbox"]')) cb.addEventListener("change", () => setFix(cb.dataset.key));
  }
  /** Montée choisie dans le devis : bornes, valeurs, cases « fixé », états et lecture ; écrit seulement ce qui change.
   *  Masquée tant qu'il n'y a pas de modèle (pas d'avion, ou ni TAS ni consommation). Relance les consignes de montée. */
  function syncClimbCtl() {
    scheduleGuide();
    const box = $("climbCtl");
    if (!box) return;
    const m = S.m,
      q = S.manual;
    put(box, "hidden", !(m && q));
    if (!m || !q) return;
    mountClimbCtl(box);
    const h = readAlt(m),
      p = m.manualPoint(h, manualLaw(m)),
      sc = regimeScale(m, h),
      full = p.frac >= .995,
      jet = m.kind === "jet",
      reg = sc.map ? rpmForFF(sc.rows, p.ff) : p.frac * 100,
      gas = `${tl("gaz", "throttle", "Leistung", "gases")} ${fmt(p.frac * 100, 0)} %`;
    put(box.querySelector(".climb-title"), "textContent", typo(`${CL.title()} — ${tl("à mi-montée", "at mid-climb", "halber Steigflug", "a media subida")} (${flTxt(h)})`));
    put(box.querySelector(".climb-title"), "title", CL.fixTip());
    // vario : « plein gaz » sous le curseur (plus dans la ligne de base du calcul) ; consigne hors d'atteinte signalée
    const vsNote = q.calc === "rpm" && !q.full && full ? `${L.full()} — ${tl("vario visé hors d’atteinte", "target rate out of reach", "Ziel-Steigrate nicht erreichbar", "régimen objetivo inalcanzable")}` : full ? L.full() : "";
    const iasNote = q.calc === "ias" && q.unreach ? tl("vario fixé hors d’atteinte : meilleur vario",
      "fixed rate out of reach: best rate",
      "feste Steigrate nicht erreichbar: bestes Steigen", "régimen fijo inalcanzable: mejor régimen") : jet && p.ias < q.ias - 2 ? tl(
      "limitée au Mach de croisière", "limited to the cruise Mach", "auf Reise-Mach begrenzt", "limitada al Mach de crucero") : "";
    const spec = {
      ias: [CL.ias(), q.iMin, q.iMax, 5, q.ias, `${fmt(q.ias, 0)} kt`, iasNote],
      vs: [CL.vs(), 100, q.vMax, 50, q.calc === "vs" ? Math.min(q.vMax, Math.max(100, p.roc)) : q.calc === "rpm" && q.full ? q.vMax : q
        .vs,
        `${fmt(Math.max(0, q.calc === "ias" ? q.vs : p.roc), 0)} ft/min`, vsNote
      ],
      rpm: [sc.map ? `${CL.rpm()} (${sc.unit})` : CL.throttle(), sc.lo, sc.hi, sc.step, Number.isFinite(reg) ? Math.min(sc.hi, Math.max(sc
          .lo, reg)) : full ? sc.hi : sc.lo, sc.map ? (Number.isFinite(reg) ? `${fmt(reg, jet ? 1 : 0)} ${sc.unit}` : tl(
          "hors de la table", "outside the table", "außerhalb der Tabelle", "fuera de la tabla")) : `${fmt(p.frac * 100, 0)} %`,
        sc.map ? gas : tl("pas de cartographie moteur : gaz en %", "no engine map: throttle in %",
          "kein Motorkennfeld: Leistung in %",
          "sin mapa motor: gases en %")
      ]
    };
    for (const [key, [label, lo, hi, step, val, txt, note]] of Object.entries(spec)) {
      const f = box.querySelector(`.climb-field[data-key="${key}"]`),
        calc = key === q.calc,
        inp = f.querySelector('input[type="range"]'),
        cb = f.querySelector('input[type="checkbox"]');
      put(f.querySelector(".climb-lab"), "textContent", label);
      put(f.querySelector(".climb-fixlab"), "textContent", CL.fix());
      put(cb, "checked", !calc);
      put(cb, "title", CL.fixTip());
      if (f.classList.contains("is-calc") !== calc) f.classList.toggle("is-calc", calc);
      put(inp, "min", String(lo));
      put(inp, "max", String(hi));
      put(inp, "step", String(step));
      put(inp, "disabled", calc);
      if (document.activeElement !== inp || calc) put(inp, "value", String(val));
      put(f.querySelector(".climb-val"), "textContent", txt);
      put(f.querySelector(".climb-note"), "textContent", [calc ? CL.calc() : "", note].filter(Boolean).join(" · "));
    }
    put(box.querySelector(".climb-read"), "textContent", typo(`${tl("Débit", "Fuel flow", "Verbrauch", "Consumo")} ${showFuel(p.ff)} ${fuelUnit()}/h · TAS ${fmt(p.tas, 0)} kt${sc.map ? "" : ` · ${gas}`}`));
  }
  /** Modèle et paramètres du dernier devis, sans tracer les courbes (vue simple) : la montée choisie, les consignes et leur
   *  lecture restent à jour. m : modèle (null : rien) ; c : paramètres du trajet (voir l'en-tête). */
  function prepare(m, c) {
    if (!m) {
      S.m = null;
      return syncClimbCtl();
    }
    if (S.m !== m) S.cache = null;
    S.m = m;
    S.c = c;
    ensureManual(m);
    syncClimbCtl();
  }

  // ---------------------------------------------------------------------------------------------------
  // Consignes de montée (#climbGuide, toutes vues, tous niveaux) : un objectif par segments, un tableau par tranche
  // d'altitude et une phrase « Régler / Tenir / Attendu » produite à la source, dans la langue de la page
  // ---------------------------------------------------------------------------------------------------

  /** Objectifs de montée proposés, dans l'ordre des segments. */
  const GOALS = ["eco", "vy", "fast", "prof", "man"];
  /** Libellé court (segment) et explication (infobulle) de chaque objectif. */
  const GOAL_TXT = {
    eco: () => [tl("Éco", "Eco", "Spar", "Eco"), tl(
      "Montée économique : le moins de carburant jusqu’au niveau du plan (la distance parcourue en montée est retranchée de la croisière).",
      "Economy climb: least fuel to the plan level (the distance covered while climbing is deducted from the cruise).",
      "Sparsamer Steigflug: am wenigsten Kraftstoff bis zur Planhöhe (die Steigstrecke wird vom Reiseflug abgezogen).",
      "Ascenso económico: el menor combustible hasta el nivel del plan (la distancia en ascenso se descuenta del crucero).")],
    vy: () => ["Vy", tl("Meilleur taux de montée : le plus d’altitude par minute, plein gaz.",
      "Best rate of climb: most altitude per minute, full throttle.", "Bestes Steigen: größter Höhengewinn pro Minute, Vollgas.",
      "Mejor régimen de ascenso: más altitud por minuto, gases a fondo.")],
    fast: () => [tl("Rapide", "Fast", "Schnell", "Rápida"), tl(
      "Montée rapide : le trajet entier le plus court en temps (plus vite, moins de vario).",
      "Fast climb: shortest whole trip in time (faster, less climb rate).",
      "Schneller Steigflug: kürzeste Gesamtflugzeit (schneller, weniger Steigrate).",
      "Ascenso rápido: el trayecto completo más corto en tiempo (más rápido, menos régimen).")],
    prof: () => [tl("Profil", "Profile", "Profil", "Perfil"), tl("Badin de montée du profil, plein gaz.",
      "Profile climb IAS, full throttle.", "Steig-IAS des Profils, Vollgas.", "IAS de ascenso del perfil, gases a fondo.")],
    man: () => [tl("Réglée", "Set", "Eingestellt", "Ajustada"), tl(
      "Montée choisie : réglée par les curseurs « Montée choisie » de la vue détaillée (badin, vario, régime).",
      "Chosen climb: set with the “Chosen climb” sliders of the detailed view (IAS, vario, engine setting).",
      "Gewählter Steigflug: mit den Reglern „Gewählter Steigflug“ der Detailansicht eingestellt (IAS, Vario, Drehzahl).",
      "Ascenso elegido: ajustado con los cursores «Ascenso elegido» de la vista detallada (IAS, vario, régimen).")]
  };
  /** Objectif choisi, mémorisé dans ce navigateur (fpClimbGoal) ; « Profil » par défaut. */
  const goalGet = () => {
    try {
      const v = localStorage.getItem("fpClimbGoal");
      return GOALS.includes(v) ? v : "prof";
    } catch {
      return "prof";
    }
  };
  /** Badin de montée du profil passé au modèle (profil complété par la fiche EUROCONTROL : modelProfile de la page), 0
   *  s'il manque. */
  const profileClimbIas = () => {
    try {
      return +(window.modelProfile?.() || active)?.climb?.iasKt || 0;
    } catch {
      return 0;
    }
  };
  /** Loi h → { ve, frac } d'un objectif pour le modèle m, croisière visée kC (null si l'objectif n'est pas disponible). */
  function goalLaw(m, goal, kC) {
    if (goal === "man") return manualLaw(m);
    if (goal === "prof") {
      const ias = profileClimbIas();
      return ias > 0 ? m.manualLaw(ias, 0) : null;
    }
    return m.climbLaw({
      eco: "fuel",
      vy: "vy",
      fast: "time"
    } [goal], kC);
  }
  /** Altitude en clair pour les consignes : « sol », « 2 000 ft » sous 5 000 ft, niveau au-dessus (« FL065 »). */
  const altTxt = h => h <= 0 ? tl("sol", "ground", "Boden", "suelo") : h < 5000 ? `${fmt(h, 0)} ft` : flTxt(h);
  /** Montée d'un objectif jusqu'au niveau du plan (borné au plafond) : intégration par pas (point milieu) et relevé aux
   *  tranches (sol, 2 000, 5 000, 10 000 ft puis tous les 5 000 ft, niveau du plan) : gaz, régime de la cartographie à
   *  cette altitude, Badin, vario, Mach, temps et carburant cumulés. Sortie : { top, rows, reached, minutes, fuel, law }
   *  ou null (pas de niveau, objectif indisponible). */
  function climbGuide(m, c, goal) {
    const top = Math.round(Math.min((c?.FL || 0) * 100, Math.floor(m.ceiling / 100) * 100) / 100) * 100;
    if (!(top > 0)) return null;
    const law = goalLaw(m, goal, m.cruise(top, "normal"));
    if (!law) return null;
    const marks = [0, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000].filter(h => h < top - 250).concat(top),
      dh = Math.max(100, Math.min(500, top / 60));
    /** Relevé de la loi à l'altitude h ; t, f : temps (min) et carburant (unité du profil) cumulés depuis le sol. */
    const row = (h, t, f) => {
      const p = m.manualPoint(h, law),
        rows = rpmRows(h);
      return {
        h,
        frac: p.frac,
        ias: p.ias,
        roc: p.roc,
        ff: p.ff,
        mach: p.tas / m.atm(h).a,
        rpm: rows.length >= 2 ? rpmForFF(rows, p.ff) : null,
        t,
        f
      };
    };
    const rows = [row(0, 0, 0)];
    let h = 0,
      t = 0,
      f = 0,
      k = 1,
      reached = true;
    while (k < marks.length && h < top - 1e-6) {
      const st = Math.min(dh, marks[k] - h),
        p = m.manualPoint(h + st / 2, law);
      if (!(p.roc > 20)) {
        reached = false;
        break;
      }
      const dt = st / p.roc;
      t += dt;
      f += p.ff * dt / 60;
      h += st;
      if (Math.abs(h - marks[k]) < 1e-6) {
        h = marks[k];
        rows.push(row(h, t, f));
        k++;
      }
    }
    return {
      top,
      rows,
      reached,
      minutes: t,
      fuel: f,
      law
    };
  }
  /** Phrase de consigne d'une montée g (objectif goal) : quoi régler (gaz, hélice ou régime), quoi tenir (l'instrument
   *  qui porte la consigne), quoi attendre (l'autre instrument, le niveau atteint, le temps et le carburant). HTML. */
  function guideSay(m, g, goal) {
    const rows = g.rows,
      r0 = rows[0],
      rN = rows.at(-1),
      q = S.manual,
      U = rpmUnit(m),
      jet = m.kind === "jet",
      dec = jet ? 1 : 0,
      full = r => r.frac >= .995,
      allFull = rows.every(full),
      firstFull = rows.find(full),
      pct = r => `${fmt(r.frac * 100, 0)} %`,
      rpms = rows.map(r => r.rpm).filter(Number.isFinite);
    // Régler : gaz (plein, réduits, puis plein), régime de la cartographie ou hélice
    let set;
    if (allFull) set = L.full();
    else if (!firstFull) {
      const a = r0.frac * 100,
        b = rN.frac * 100;
      set = `${tl("gaz", "throttle", "Leistung", "gases")} ${Math.abs(a - b) < 3 ? fmt(a, 0) : `${fmt(a, 0)} → ${fmt(b, 0)}`} %`;
    } else set = tl(`gaz ${pct(r0)} au départ, plein gaz à partir de ${altTxt(firstFull.h)}`,
      `throttle ${pct(r0)} at first, full throttle from ${altTxt(firstFull.h)}`,
      `Leistung ${pct(r0)} zu Beginn, Vollgas ab ${altTxt(firstFull.h)}`,
      `gases ${pct(r0)} al inicio, a fondo desde ${altTxt(firstFull.h)}`);
    if (rpms.length) set += ` (${Math.max(...rpms) - Math.min(...rpms) < (jet ? 1 : 30) ? `≈ ${fmt(rpms[0], dec)}` : `${fmt(rpms[0], dec)} → ${fmt(rpms.at(-1), dec)}`} ${U})`;
    else if (allFull && m.kind === "piston") set += `, ${tl("hélice plein petit pas", "propeller fully fine", "Propeller auf kleinste Steigung", "hélice a paso mínimo")}`;
    else if (allFull && m.kind === "turboprop") set += `, ${tl("hélice au régime maximal", "propeller at maximum RPM", "Propeller auf Höchstdrehzahl", "hélice a RPM máximas")}`;
    // Tenir : le badin (constant, variable, ou Mach au-dessus de l'altitude de conjonction d'un réacteur), et le vario
    // quand les gaz le tiennent (montée réglée, Badin et vario fixés)
    const ias = rows.map(r => r.ias),
      i0 = ias[0],
      holdVs = goal === "man" && q?.calc === "rpm" && !q.full && !full(r0);
    let hx = null;
    if (jet && (goal === "man" || goal === "prof"))
      for (let x = 500; x <= rN.h; x += 500)
        if (m.manualPoint(x, g.law).ias < i0 - 2) {
          hx = x;
          break;
        }
    let hold = hx != null ? tl(`${fmt(i0, 0)} kt au badin, puis Mach ${fmt(m.mRef, 2)} à partir de ${altTxt(hx)}`,
        `${fmt(i0, 0)} kt IAS, then Mach ${fmt(m.mRef, 2)} from ${altTxt(hx)}`, `${fmt(i0, 0)} kt IAS, dann Mach ${fmt(m.mRef, 2)} ab ${altTxt(hx)}`,
        `${fmt(i0, 0)} kt IAS, luego Mach ${fmt(m.mRef, 2)} desde ${altTxt(hx)}`) :
      Math.max(...ias) - Math.min(...ias) <= 4 ? tl(`${fmt(i0, 0)} kt au badin`, `${fmt(i0, 0)} kt on the airspeed indicator`,
        `${fmt(i0, 0)} kt am Fahrtmesser`, `${fmt(i0, 0)} kt en el anemómetro`) :
      tl(`le badin, de ${fmt(i0, 0)} kt au sol à ${fmt(rN.ias, 0)} kt à ${altTxt(rN.h)}`,
        `the airspeed, from ${fmt(i0, 0)} kt at ground level to ${fmt(rN.ias, 0)} kt at ${altTxt(rN.h)}`,
        `die Fahrt, von ${fmt(i0, 0)} kt am Boden bis ${fmt(rN.ias, 0)} kt auf ${altTxt(rN.h)}`,
        `la velocidad, de ${fmt(i0, 0)} kt en el suelo a ${fmt(rN.ias, 0)} kt a ${altTxt(rN.h)}`);
    if (holdVs) hold += tl(` et ${fmt(q.vs, 0)} ft/min au vario (avec les gaz)`, ` and ${fmt(q.vs, 0)} ft/min on the vario (with the throttle)`,
      ` und ${fmt(q.vs, 0)} ft/min am Variometer (mit der Leistung)`, ` y ${fmt(q.vs, 0)} ft/min en el variómetro (con los gases)`);
    // Attendu : le vario (ou sa décroissance une fois plein gaz), puis le niveau, le temps et le carburant
    const v0 = fmt(Math.max(0, r0.roc), 0),
      vN = fmt(Math.max(0, rN.roc), 0);
    let expect = holdVs ? (firstFull ? tl(`vario tenu jusqu’à ${altTxt(firstFull.h)}, puis en baisse jusqu’à ${vN} ft/min à ${altTxt(rN.h)}`,
        `rate held up to ${altTxt(firstFull.h)}, then decreasing to ${vN} ft/min at ${altTxt(rN.h)}`,
        `Steigrate gehalten bis ${altTxt(firstFull.h)}, dann abnehmend bis ${vN} ft/min auf ${altTxt(rN.h)}`,
        `régimen mantenido hasta ${altTxt(firstFull.h)}, luego en descenso hasta ${vN} ft/min a ${altTxt(rN.h)}`) : tl(
        `vario tenu jusqu’à ${altTxt(rN.h)}`, `rate held up to ${altTxt(rN.h)}`, `Steigrate gehalten bis ${altTxt(rN.h)}`,
        `régimen mantenido hasta ${altTxt(rN.h)}`)) :
      tl(`vario de ${v0} ft/min au sol à ${vN} ft/min à ${altTxt(rN.h)}`, `vario from ${v0} ft/min at ground level to ${vN} ft/min at ${altTxt(rN.h)}`,
        `Steigrate von ${v0} ft/min am Boden bis ${vN} ft/min auf ${altTxt(rN.h)}`, `régimen de ${v0} ft/min en el suelo a ${vN} ft/min a ${altTxt(rN.h)}`);
    const fu = `${showFuel(g.fuel)} ${fuelUnit()}`;
    expect += g.reached ? tl(` ; ${altTxt(g.top)} en ${hmTxt(g.minutes)}, ${fu}`, `; ${altTxt(g.top)} in ${hmTxt(g.minutes)}, ${fu}`,
      `; ${altTxt(g.top)} in ${hmTxt(g.minutes)}, ${fu}`, `; ${altTxt(g.top)} en ${hmTxt(g.minutes)}, ${fu}`) : ` — ⚠ ${tl(`vario nul avant ${altTxt(g.top)} : niveau non atteint avec cette consigne`, `climb rate reaches zero before ${altTxt(g.top)}: level not reached with this setting`, `Steigrate vor ${altTxt(g.top)} null: Höhe mit dieser Einstellung nicht erreicht`, `régimen nulo antes de ${altTxt(g.top)}: nivel no alcanzado con esta consigna`)}`;
    return typo(`<b>${tl("Régler", "Set", "Einstellen", "Ajustar")}</b> : ${set}. <b>${tl("Tenir", "Hold", "Halten", "Mantener")}</b> : ${hold}. <b>${tl("Attendu", "Expect", "Erwartet", "Esperado")}</b> : ${expect}.`);
  }
  /** Tableau des consignes par tranche d'altitude : altitude, gaz (« plein » ou %), RPM / N1 (cartographie), Badin à
   *  tenir, vario attendu, temps cumulé. HTML. */
  function guideTable(m, g) {
    const map = g.rows.some(r => Number.isFinite(r.rpm)),
      jet = m.kind === "jet";
    const head = [tl("Altitude", "Altitude", "Höhe", "Altitud"), tl("Gaz", "Throttle", "Leistung", "Gases"), ...(map ? [rpmUnit(m)
      .replace("% ", "") + (jet ? " (%)" : "")
    ] : []), tl("Badin à tenir (kt)", "IAS to fly (kt)", "Zu haltende IAS (kt)",
      "IAS a mantener (kt)"), tl("Vario attendu (ft/min)", "Expected rate (ft/min)", "Erwartete Steigrate (ft/min)",
      "Régimen esperado (ft/min)"), tl("Temps", "Time", "Zeit", "Tiempo")];
    // tranches jusqu'au plafond : lignes vides invisibles en complément (hauteur du tableau fixe quel que soit le niveau)
    const topMax = Math.floor(m.ceiling / 100) * 100,
      nMax = [0, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000].filter(h => h < topMax - 250).length + 1,
      pad = Math.max(0, nMax - g.rows.length);
    const body = g.rows.map(r => `<tr><td>${altTxt(r.h)}</td><td>${r.frac >= .995 ? tl("plein", "full", "voll", "a fondo") : `${fmt(r.frac * 100, 0)} %`}</td>${map ? `<td>${Number.isFinite(r.rpm) ? fmt(r.rpm, jet ? 1 : 0) : "—"}</td>` : ""}<td>${fmt(r.ias, 0)}${jet && r.mach >= .4 ? ` <small>M${fmt(r.mach, 2)}</small>` : ""}</td><td>${fmt(Math.max(0, r.roc), 0)}</td><td>${r.h ? hmTxt(r.t) : "—"}</td></tr>`).join("") + `<tr class="pad" aria-hidden="true"><td colspan="${head.length}">&nbsp;</td></tr>`.repeat(pad);
    return typo(`<table class="climb-guide-table"><thead><tr>${head.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`);
  }
  let guideTimer = 0,
    guideHtml = "";
  /** Consignes redessinées un peu plus tard (plusieurs réglages de suite : un seul calcul). */
  function scheduleGuide() {
    clearTimeout(guideTimer);
    guideTimer = setTimeout(renderGuide, 60);
  }
  /** Montée d'un objectif, mémorisée par modèle et niveau (la montée réglée : par réglage) ; null en cas d'échec. */
  function guideFor(goal, atPlan = false) {
    const m = S.m,
      c = !atPlan && S.guideH != null && S.c ? {
        ...S.c,
        FL: S.guideH / 100
      } : S.c,
      q = S.manual;
    if (S.gModel !== m || S.gPlan !== S.c?.FL) {
      S.gCache = new Map();
      S.gModel = m;
      S.gPlan = S.c?.FL;
    }
    const k = `${c?.FL}|${goal === "man" ? `man|${q ? [q.ias, q.vs, q.full, q.frac, q.calc].join("|") : ""}` : goal}`;
    if (!S.gCache.has(k)) {
      if (goal === "man")
        for (const x of [...S.gCache.keys()])
          if (x.includes("|man|")) S.gCache.delete(x);
      let g = null;
      try {
        g = climbGuide(m, c, goal);
      } catch (e) {
        console.error("Consignes de montée :", e);
      }
      S.gCache.set(k, g);
    }
    return S.gCache.get(k);
  }
  /** Bloc « Consignes de montée » : segments d'objectif (avec temps et carburant de chacun jusqu'au niveau), phrase de
   *  consigne et tableau de l'objectif choisi. Masqué sans modèle ; écrit seulement s'il change. Les montées des autres
   *  objectifs (petites lignes des segments) sont calculées ensuite, sans retarder l'affichage. */
  function renderGuide() {
    renderDecision(); // décision du niveau : recalculée seulement si le devis ou l'objectif ont changé
    const box = $("climbGuide");
    if (!box) return;
    const m = S.m,
      c = S.c;
    if (!m || !c || !active || !S.manual) return put(box, "hidden", true);
    let goal = goalGet();
    if (goal === "prof" && !(profileClimbIas() > 0)) goal = "vy";
    const g = guideFor(goal),
      seg = gl => {
        const [lab, tip] = GOAL_TXT[gl](),
          off = gl === "prof" && !(profileClimbIas() > 0),
          t = off ? tl("Pas de Badin de montée dans le profil (Montée › Badin).", "No climb IAS in the profile (Climb › IAS).",
            "Keine Steig-IAS im Profil (Steigflug › IAS).", "Sin IAS de ascenso en el perfil (Ascenso › IAS).") : tip;
        return `<button type="button" class="repo-seg" data-goal="${gl}" aria-pressed="${gl === goal}"${off ? " disabled" : ""} title="${escXml(t)}">${lab}<small data-goal-sum="${gl}"></small></button>`;
      };
    const html = `<div class="climb-guide-head"><h3>${tl("Consignes de montée", "Climb instructions", "Steigflug-Anweisungen", "Consignas de ascenso")}${S.guideH != null ? ` — ${flTxt(S.guideH)}` : ""}</h3><span class="repo-segs" role="group" aria-label="${escXml(tl("Objectif de la montée", "Climb goal", "Ziel des Steigflugs", "Objetivo del ascenso"))}">${GOALS.map(seg).join("")}</span></div>` +
      (g ? `<p class="climb-say">${guideSay(m, g, goal)}</p><div class="climb-guide-wrap">${guideTable(m, g)}</div>` :
        `<p class="mut">${tl("Pas de montée à calculer : niveau du plan nul ou au sol.", "No climb to compute: plan level is zero or at ground level.", "Kein Steigflug zu berechnen: Planhöhe null oder am Boden.", "Ningún ascenso que calcular: nivel del plan nulo o en el suelo.")}</p>`) +
      `<p class="mut climb-guide-foot">${typo(tl("Selon le modèle de performances du profil (atmosphère du devis, masse non modélisée) ; à confronter au manuel de vol.", "From the profile’s performance model (fuel plan atmosphere, mass not modelled); check against the flight manual.", "Nach dem Leistungsmodell des Profils (Atmosphäre der Planung, Masse nicht modelliert); mit dem Flughandbuch abgleichen.", "Según el modelo de rendimiento del perfil (atmósfera del plan, masa no modelizada); contrastar con el manual de vuelo."))}</p>`;
    put(box, "hidden", false);
    if (html !== guideHtml) {
      guideHtml = html;
      box.innerHTML = html;
    }
    // hauteur tenue tant que le devis ne change pas (la phrase « Attendu » peut changer de longueur avec le curseur)
    holdHeight(box, box._hm !== S.m || box._hp !== S.c?.FL);
    box._hm = S.m;
    box._hp = S.c?.FL;
    if (!box.dataset.ready) {
      box.dataset.ready = "1";
      box.addEventListener("click", e => {
        const b = e.target.closest("button[data-goal]");
        if (!b || b.disabled) return;
        try {
          localStorage.setItem("fpClimbGoal", b.dataset.goal);
        } catch {}
        renderGuide();
      });
    }
    // temps et carburant de chaque objectif jusqu'au niveau (le « sweet point » entre éco et rapide), calculés ensuite
    clearTimeout(renderGuide.sum);
    renderGuide.sum = setTimeout(() => {
      if (S.m !== m) return;
      for (const gl of GOALS) {
        const el = box.querySelector(`[data-goal-sum="${gl}"]`),
          x = el && !el.closest("button").disabled ? guideFor(gl) : null;
        if (el) put(el, "textContent", x?.reached ? `${hmTxt(x.minutes)} · ${showFuel(x.fuel)} ${fuelUnit()}` : "—");
      }
      compareTable(goal);
    }, 30);
  }

  /** Objectifs de montée (#climbCompare, vue détaillée) : un objectif par ligne — temps, carburant, Badin à tenir,
   *  vario, toujours jusqu'au niveau du plan (le tableau ne suit pas le curseur) ; ligne de l'objectif choisi surlignée, ★ meilleur temps et carburant ; clic sur
   *  une ligne : objectif choisi. */
  function compareTable(goal) {
    const box = $("climbCompare");
    if (!box || !S.m) return;
    const rows = GOALS.map(gl => ({
        gl,
        x: gl === "prof" && !(profileClimbIas() > 0) ? null : guideFor(gl, true)
      })),
      okR = rows.filter(r => r.x?.reached),
      bT = okR.reduce((a, b) => !a || b.x.minutes < a.x.minutes ? b : a, null),
      bF = okR.reduce((a, b) => !a || b.x.fuel < a.x.fuel ? b : a, null),
      r100 = v => fmt(Math.round(Math.max(0, v) / 100) * 100, 0),
      top = okR[0]?.x.top ?? rows.find(r => r.x)?.x.top;
    const html = `<table><thead><tr><th>${tl("Objectif", "Goal", "Ziel", "Objetivo")}${top ? ` — ${tl("montée jusqu’au niveau du plan", "climb to the plan level", "Steigflug auf die Planhöhe", "ascenso al nivel del plan")}, ${flTxt(top)}` : ""}</th><th>${tl("Temps", "Time", "Zeit", "Tiempo")}</th><th>${tl("Carburant", "Fuel", "Kraftstoff", "Combustible")} (${fuelUnit()})</th><th>${tl("Badin", "IAS", "IAS", "IAS")} (kt)</th><th>${tl("Vario", "Rate", "Steigrate", "Régimen")} (ft/min)</th></tr></thead><tbody>` +
      rows.map(({
        gl,
        x
      }) => {
        const [name, tip] = GOAL_TXT[gl](),
          a = x?.rows?.[0],
          b = x?.rows?.at(-1);
        return `<tr data-goal="${gl}" class="${gl === goal ? "on" : ""}" title="${escXml(tip)}"><td>${lab(name, goalCol(gl))}</td>` + (x?.reached ?
          `<td${x === bT?.x ? ' class="best"' : ""}>${hmTxt(x.minutes)}${x === bT?.x ? " ★" : ""}</td><td${x === bF?.x ? ' class="best"' : ""}>${showFuel(x.fuel)}${x === bF?.x ? " ★" : ""}</td><td>${Math.abs(a.ias - b.ias) < 4 ? fmt(a.ias, 0) : `${fmt(a.ias, 0)} → ${fmt(b.ias, 0)}`}</td><td>${r100(a.roc)} → ${r100(b.roc)}</td>` :
          `<td colspan="4" class="unreach">${x ? tl("niveau non atteint", "level not reached", "Flughöhe nicht erreicht", "nivel no alcanzado") : tl("pas de Badin de montée dans le profil", "no climb IAS in the profile", "keine Steig-IAS im Profil", "sin IAS de ascenso en el perfil")}</td>`) + "</tr>";
      }).join("") + "</tbody></table>";
    if (box._html !== html) {
      box._html = html;
      box.innerHTML = typo(html);
    }
    if (!box.dataset.ready) {
      box.dataset.ready = "1";
      box.addEventListener("click", e => {
        const tr = e.target.closest("tr[data-goal]");
        if (!tr || tr.querySelector(".unreach")) return;
        try {
          localStorage.setItem("fpClimbGoal", tr.dataset.goal);
        } catch {}
        renderGuide();
      });
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // Décision du niveau de vol (#levelDecision, toutes vues ; docs/technique/V2_FABLE.md § 12) : carburant (panneau du haut)
  // et temps (panneau du bas) du trajet entier selon le niveau, même axe des niveaux et même curseur ; montée à l'objectif
  // des consignes, croisière du profil, descente. Pastilles « Le plus économe » / « Le plus rapide » (clic : curseur
  // dessus) ; un seul repère dessiné, le niveau choisi ; un seul gris pour les niveaux non tenables (cause dans la fiche).
  // Fiche en trois lignes (trajet, montée, descente), « Utiliser ce niveau », « Comparer » ; tableau des niveaux ronds.
  // ---------------------------------------------------------------------------------------------------

  /** Objectif de montée retenu (celui des consignes ; « Profil » sans Badin de montée dans le profil : Vy). */
  const goalNow = () => {
    const g = goalGet();
    return g === "prof" && !(profileClimbIas() > 0) ? "vy" : g;
  };
  /** Loi de montée d'un objectif, au format de m.trip (« fuel », « time », « vy » ou loi h → { ve, frac }). */
  function tripLaw(m, goal) {
    if (goal === "eco") return "fuel";
    if (goal === "fast") return "time";
    if (goal === "vy") return "vy";
    if (goal === "man") return manualLaw(m) || "profile";
    const ias = profileClimbIas();
    return ias > 0 ? m.manualLaw(ias, 0) : "profile";
  }
  /** Couleur d'un objectif de montée (courbes de montée, tableau comparatif). */
  const goalCol = goal => ({
    eco: COL.eco,
    fast: COL.fast,
    vy: COL.prof,
    man: COL.man
  } [goal] || COL.ref);
  /** Série du graphe : trajet entier à chaque niveau (pas de 500 ft, 1000 ft au-delà de 20 000 ft de plafond), prolongée
   *  au-delà du plafond. Sortie : { step, xmax, rows (tracé), real (tenables), all (tous les niveaux ≤ plafond, résultats
   *  de m.trip), gap (zone non tenable sous le plafond : { from, reason }), lo, hi, best, fast } ou null. */
  function decisionSeries(m, c, goal) {
    const step = m.ceiling > 20000 ? 1000 : 500,
      xmax = Math.max(step * 2, Math.ceil(m.ceiling * 1.1 / step) * step),
      law = tripLaw(m, goal),
      raw = [];
    for (let h = step; h <= xmax; h += step) raw.push(h > m.ceiling ? m.unbounded(() => m.trip(h, c.D, c.wc, "normal", law)) : m.trip(h,
      c.D, c.wc, "normal", law));
    const rows = extendSeries(raw, m.ceiling, TRIP_KEYS),
      real = rows.filter(r => r?.ok && !r.extrap && r.h <= m.ceiling && r.h >= 1000);
    if (!real.length) return null;
    // série coupée au-dessus du dernier niveau tenable s'il est nettement sous le plafond (trajet court, poussée) ; ces
    // niveaux restent lisibles au curseur (cause, montée et distance nécessaire)
    const top = real.at(-1).h,
      cutRows = top < m.ceiling - step ? rows.map(r => r && r.h > top ? null : r) : rows,
      all = raw.filter(r => r && r.h >= 1000 && r.h <= m.ceiling),
      gapAt = all.find(r => r.h > top && !r.ok);
    return {
      step,
      xmax,
      law,
      rows: cutRows,
      real,
      all,
      gap: gapAt ? {
        from: top,
        reason: gapAt.reason || "thrust"
      } : null,
      lo: real[0].h,
      hi: all.at(-1).h,
      best: real.reduce((a, b) => b.fuel < a.fuel ? b : a),
      fast: real.reduce((a, b) => b.minutes < a.minutes ? b : a)
    };
  }
  /** Niveau de la série le plus proche de h (ft), tenable ou non (résultat de m.trip ; ok faux : cause dans reason). */
  const decNearest = (D, h) => D.all.reduce((a, r) => Math.abs(r.h - h) < Math.abs(a.h - h) ? r : a, D.all[0]);
  /** Cause courte d'un niveau non tenable (fiche, tableau). */
  const gapTxt = reason => reason === "short" ? tl("trajet trop court", "trip too short", "Strecke zu kurz", "trayecto demasiado corto") :
    reason === "ceiling" ? tl("vario nul avant ce niveau", "climb rate nil before this level", "Steigrate vorher null",
      "régimen nulo antes de este nivel") : tl("poussée insuffisante", "not enough thrust", "Schub reicht nicht", "empuje insuficiente");
  /** Montée de l'objectif jusqu'au niveau h (Badin à tenir et vario attendu, en tête et au sommet), mémorisée. */
  function decClimb(m, h) {
    const D = S.dec;
    if (!D.climb.has(h)) {
      let g = null;
      try {
        g = climbGuide(m, {
          FL: h / 100
        }, D.goal);
      } catch (e) {
        console.error("Décision du niveau — montée :", e);
      }
      D.climb.set(h, g);
    }
    return D.climb.get(h);
  }
  /** Libellés des repères (titre de la fiche, pastilles, tableau) : plan, le plus économe, le plus rapide (4 langues). */
  const DEC_TAG = {
    plan: () => tl("plan", "plan", "Plan", "plan"),
    best: () => tl("le plus économe", "least fuel", "sparsamste", "más económico"),
    fast: () => tl("le plus rapide", "fastest", "schnellste", "más rápido")
  };
  /** Repères d'un niveau h : plan, le plus économe, le plus rapide (liste de clés). */
  const decTags = (D, h) => [
    ...(Math.abs(h - D.plan) < 1 ? ["plan"] : []), ...(h === D.best.h ? ["best"] : []), ...(h === D.fast.h ? ["fast"] : [])
  ];
  /** Bloc « Décision du niveau de vol » : recalculé si l'appareil, le trajet, le niveau du plan, l'objectif de montée ou
   *  la vue changent (sinon gardé tel quel) ; masqué sans modèle ni distance. */
  function renderDecision(m = S.m, c = S.c) {
    const box = $("levelDecision");
    if (!box) return;
    if (!m || !c || !(c.D > 0) || !active) {
      S.dec = null;
      S.guideH = null;
      return put(box, "hidden", true);
    }
    const goal = goalNow(),
      q = S.manual,
      detail = curvesShown(),
      key = JSON.stringify([active.id, c.D, c.wc, c.FL, goal, goal === "man" && q ? [q.ias, q.vs, q.full, q.frac, q.calc] : 0, fuelUnit(),
        window.RepositoryNav?.getLanguage?.() || "fr", detail
      ]);
    if (S.dec && S.dec.key === key && S.dec.m === m) return;
    let D = null;
    try {
      D = decisionSeries(m, c, goal);
    } catch (e) {
      console.error("Décision du niveau :", e);
    }
    put(box, "hidden", false);
    const title = tl("Décision du niveau de vol", "Flight level decision", "Wahl der Flughöhe", "Decisión del nivel de vuelo");
    if (!D) {
      S.dec = null;
      S.guideH = null;
      box.innerHTML = typo(`<div class="fl-dec-head"><h3>${title}</h3></div><p class="perf-warn">⚠ ${noLevelTxt(m, c)}</p>`);
      return;
    }
    const prev = S.dec,
      plan = c.FL * 100;
    // croisière économique (vue détaillée, objectif « Éco » seulement) : niveau du carburant minimal à cette croisière
    let eco = null;
    if (detail && goal === "eco") try {
      eco = D.real.map(r => m.trip(r.h, c.D, c.wc, "eco", D.law)).filter(r => r.ok).reduce((a, b) => !a || b.fuel < a.fuel ? b : a,
        null);
    } catch (e) {
      console.error("Décision du niveau — croisière économique :", e);
    }
    S.dec = Object.assign(D, {
      key,
      m,
      c,
      goal,
      plan,
      eco,
      climb: new Map(),
      // niveau choisi : le niveau du plan (le plus proche) à chaque nouveau devis, sinon gardé
      sel: prev && prev.m === m && prev.plan === plan && prev.sel != null ? decNearest(D, prev.sel).h : decNearest(D, plan).h,
      hover: null,
      sort: prev?.sort || "h",
      dir: prev?.dir || 1
    });
    const goalName = GOAL_TXT[goal]()[0];
    box.innerHTML = typo(`<div class="fl-dec-head"><h3>${title}</h3><span class="mut">${tl(`trajet entier à chaque niveau : montée « ${goalName} », croisière du profil, descente`, `whole trip at each level: “${goalName}” climb, profile cruise, descent`, `ganze Strecke auf jeder Flughöhe: Steigflug „${goalName}“, Profil-Reiseflug, Sinkflug`, `trayecto completo a cada nivel: ascenso «${goalName}», crucero del perfil, descenso`)}</span></div>` +
      `<div id="decPills" class="fl-dec-pills"></div>` +
      `<div class="fl-dec-body"><div class="fl-dec-main"><div class="chart-wrap"><svg id="decChart" class="opt-chart"></svg></div>` +
      `<p class="mut fl-dec-note">${tl("Grisé : niveau non tenable — plafond, trajet trop court ou poussée insuffisante ; la raison est dans la fiche du curseur.", "Grey: level that cannot be held — ceiling, trip too short or not enough thrust; the reason is in the cursor card.", "Grau: nicht haltbare Flughöhe — Gipfelhöhe, Strecke zu kurz oder Schub reicht nicht; der Grund steht in der Karte des Cursors.", "Gris: nivel no mantenible — techo, trayecto demasiado corto o empuje insuficiente; la razón está en la ficha del cursor.")}</p>` +
      `<div class="fl-dec-ctl"><input id="decSlider" type="range" min="${D.lo}" max="${D.hi}" step="${D.step}" value="${D.sel}" aria-label="${escXml(tl("Niveau étudié", "Level studied", "Untersuchte Flughöhe", "Nivel estudiado"))}"><output id="decLvl"></output></div></div>` +
      `<div class="fl-dec-side"><div id="decCard" class="fl-dec-card"></div><div class="fl-dec-actions"><button type="button" id="decUse" class="mini">${tl("Utiliser ce niveau", "Use this level", "Diese Flughöhe verwenden", "Usar este nivel")}</button></div></div></div>` +
      `<h4 class="fl-dec-tabtitle">${tl("Niveaux", "Levels", "Flughöhen", "Niveles")}</h4><div class="fl-dec-tablewrap"><table id="decTable" class="climb-guide-table fl-dec-table"></table></div>`);
    decPills();
    drawDecision();
    const sl = $("decSlider");
    sl.oninput = () => decSelect(+sl.value);
    $("decUse").onclick = () => {
      $("fl").value = Math.round(S.dec.sel / 100);
      $("fl").dispatchEvent(new Event("input", {
        bubbles: true
      }));
      if (typeof calculateFromButton === "function") calculateFromButton();
    };
    $("decPills").onclick = e => {
      const b = e.target.closest("button[data-h]");
      if (b) decSelect(+b.dataset.h);
    };
    $("decTable").onclick = e => {
      const th = e.target.closest("th[data-sort]");
      if (th) {
        const X = S.dec;
        X.dir = X.sort === th.dataset.sort ? -X.dir : 1;
        X.sort = th.dataset.sort;
        return decTable();
      }
      const tr = e.target.closest("tr[data-h]");
      if (tr) decSelect(+tr.dataset.h);
    };
    decPanel();
    decUpdate();
    // vue détaillée : le graphe de montée suit l'objectif et partage l'axe des niveaux
    if (detail && S.cache && $("climbChart")) guard("panelClimb", "climbChart", tl("Montée", "Climb", "Steigflug", "Ascenso"), () =>
      drawClimbChart(m, c, S.cache));
  }
  /** Pastilles au-dessus du graphe : le plus économe, le plus rapide (et la croisière économique en vue détaillée avec
   *  l'objectif « Éco ») ; niveau · carburant · temps ; clic : curseur sur ce niveau. */
  function decPills() {
    const D = S.dec,
      box = $("decPills");
    if (!D || !box) return;
    const pill = (r, name, col) => `<button type="button" class="fl-dec-pill" data-h="${r.h}" aria-pressed="${r.h === D.sel}" style="--pill:${col}">${name} <b>${flTxt(r.h)}</b> · ${showFuel(r.fuel)} ${fuelUnit()} · ${hmTxt(r.minutes)}</button>`;
    const html = pill(D.best, tl("Le plus économe", "Least fuel", "Am sparsamsten", "El más económico"), COL.eco) +
      (D.fast.h !== D.best.h ? pill(D.fast, tl("Le plus rapide", "Fastest", "Am schnellsten", "El más rápido"), COL.fast) : "") +
      (D.eco ? pill(D.eco, def("eco", tl("Croisière économique", "Economy cruise", "Spar-Reiseflug", "Crucero económico")), COL.ref) :
        "");
    if (box._html !== html) {
      box._html = html;
      box.innerHTML = typo(html);
    }
    for (const b of box.querySelectorAll("button[data-h]")) {
      const on = String(+b.dataset.h === D.sel);
      if (b.getAttribute("aria-pressed") !== on) b.setAttribute("aria-pressed", on);
    }
  }
  /** Graphe : carburant du trajet (échelle de gauche, courbe pleine) et temps du trajet (échelle de droite, courbe fine),
   *  chaque échelle dans la couleur de sa courbe ; un seul gris (niveaux non tenables) ; niveau du plan en trait plein,
   *  curseur en pointillés (placé par decUpdate). */
  function drawDecision() {
    const D = S.dec,
      m = D.m,
      svg = $("decChart"),
      W = Math.max(320, Math.round((svg.parentElement?.clientWidth || 540) - 2)), // à l'échelle 1 : texte lisible
      Lm = 54,
      R = 54,
      T = 24,
      B = 32,
      H = 256,
      rows = D.rows.filter(r => r?.ok),
      af = niceAxis(Math.min(...rows.map(r => cv(r.fuel))), Math.max(...rows.map(r => cv(r.fuel))), 4),
      at = niceAxis(Math.min(...rows.map(r => r.minutes)), Math.max(...rows.map(r => r.minutes)), 4),
      X = h => Lm + h / D.xmax * (W - Lm - R),
      Yf = v => T + (1 - (v - af.lo) / (af.hi - af.lo || 1)) * (H - B - T),
      Yt = v => T + (1 - (v - at.lo) / (at.hi - at.lo || 1)) * (H - B - T);
    let g = "";
    const tk = D.xmax > 30000 ? 5000 : D.xmax > 12000 ? 2000 : 1000;
    for (let h = 0; h <= D.xmax; h += tk) g += `<line class="grid-line" x1="${X(h).toFixed(1)}" x2="${X(h).toFixed(1)}" y1="${T}" y2="${H - B}"/><text x="${X(h).toFixed(1)}" y="${H - B + 14}" text-anchor="middle">${flTxt(h)}</text>`;
    // graduations : carburant à gauche (quadrillage), temps à droite, chacune dans la couleur de sa courbe
    for (const v of af.ticks) g += `<line class="grid-line" x1="${Lm}" x2="${W - R}" y1="${Yf(v).toFixed(1)}" y2="${Yf(v).toFixed(1)}"/><text class="ax-fuel" x="${Lm - 5}" y="${(Yf(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v, af.dec)}</text>`;
    for (const v of at.ticks) g += `<text class="ax-time" x="${W - R + 5}" y="${(Yt(v) + 4).toFixed(1)}">${hmTxt(v)}</text>`;
    // un seul gris : niveaux non tenables sous le plafond, puis au-delà du plafond
    const g0 = D.gap ? D.gap.from : m.ceiling;
    if (g0 < D.xmax - 1) g += `<rect class="beyond" x="${X(g0).toFixed(1)}" y="${T}" width="${(X(D.xmax) - X(g0)).toFixed(1)}" height="${H - B - T}"/>`;
    /** Tracé d'une grandeur (val) le long de la série, interrompu là où elle manque ; extrapolé en pointillés. */
    const pth = (val, Y, cls) => {
      let d = "",
        e = "",
        pen = false,
        last = null;
      for (const r of D.rows) {
        if (!r?.ok) {
          pen = false;
          continue;
        }
        const pt = `${X(r.h).toFixed(1)},${Y(val(r)).toFixed(1)}`;
        if (r.extrap) e += `${last ? `M${last}L` : "M"}${pt}`;
        else d += `${pen ? "L" : "M"}${pt}`;
        pen = !r.extrap;
        last = pt;
      }
      return `<path class="${cls}" d="${d}"/>${e ? `<path class="${cls} extrap" d="${e}"/>` : ""}`;
    };
    const xp = X(Math.min(D.plan, D.xmax)),
      pl = xp > W - R - 90;
    g += `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis ax-fuel" x1="${Lm}" x2="${Lm}" y1="${T}" y2="${H - B}"/><line class="axis ax-time" x1="${W - R}" x2="${W - R}" y1="${T}" y2="${H - B}"/>` +
      pth(r => cv(r.fuel), Yf, "curve-eco") + pth(r => r.minutes, Yt, "curve-fuel dec-time") +
      `<text class="ax-fuel ax-title" x="4" y="${T - 10}">${tl("Carburant du trajet", "Trip fuel", "Kraftstoff der Strecke", "Combustible del trayecto")} (${fuelUnit()})</text>` +
      `<text class="ax-time ax-title" x="${W - 4}" y="${T - 10}" text-anchor="end">${tl("Temps du trajet", "Trip time", "Flugzeit", "Tiempo del trayecto")}</text>` +
      `<text x="${(Lm + W - R) / 2}" y="${H - 2}" text-anchor="middle">${tl("Niveau", "Level", "Flughöhe", "Nivel")}</text>` +
      (D.plan > 0 && D.plan <= D.xmax ? `<line class="dec-sel" x1="${xp.toFixed(1)}" x2="${xp.toFixed(1)}" y1="${T}" y2="${H - B}"/><text class="dec-sel-txt" x="${(xp + (pl ? -4 : 4)).toFixed(1)}" y="${T + 11}" text-anchor="${pl ? "end" : "start"}">${flTxt(D.plan)} ${tl("plan", "plan", "Plan", "plan")}</text>` : "") +
      `<line id="decCurLine" class="dec-cur" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><text id="decCurTxt" class="dec-sel-txt" x="0" y="${T + 24}"></text>` +
      `<circle id="decSelF" class="dec-dot" r="4" cx="-9" cy="-9"/><circle id="decSelT" class="dec-dot dec-dot-t" r="3.5" cx="-9" cy="-9"/>` +
      `<rect id="decHit" x="${Lm}" y="${T}" width="${W - Lm - R}" height="${H - B - T}" fill="transparent"/>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = typo(g);
    Object.assign(D, {
      X,
      Yf,
      Yt,
      W,
      R
    });
    const hit = $("decHit"),
      /** Niveau sous le pointeur e. */
      hAt = e => {
        const b = svg.getBoundingClientRect(),
          x = (e.clientX - b.left) / (b.width || 1) * W;
        return decNearest(D, (x - Lm) / (W - Lm - R) * D.xmax).h;
      };
    hit.style.cursor = "crosshair";
    hit.onpointermove = e => decHover(hAt(e));
    hit.onpointerleave = () => decHover(null);
    hit.onclick = e => decSelect(hAt(e));
  }
  /** Niveau survolé (graphe de décision ou graphe de montée) ; null : retour au niveau choisi. */
  function decHover(h) {
    const D = S.dec;
    if (!D) return;
    D.hover = h == null ? null : decNearest(D, h).h;
    decUpdate();
  }
  /** Choisit le niveau h (réglette, pastille, clic sur un graphe ou sur une ligne du tableau). */
  function decSelect(h) {
    const D = S.dec;
    if (!D) return;
    D.sel = decNearest(D, h).h;
    D.hover = null;
    decUpdate();
  }
  /** Fiche d'un niveau : trois lignes HTML (trajet, montée, descente), chiffre clé en gras ; trip : carburant (unité
   *  affichée) et minutes du trajet pour les écarts (null si le niveau n'est pas tenable) ; note : cause et correction. */
  function decFacts(h) {
    const D = S.dec,
      m = D.m,
      r = decNearest(D, h),
      jet = m.kind === "jet",
      g = decClimb(m, r.h),
      r0 = g?.rows?.[0],
      rN = g?.rows?.at(-1),
      r100 = x => Math.round(Math.max(0, x) / 100) * 100,
      rng = (a, b, k = x => x) => Math.abs(k(a) - k(b)) < 1 ? fmt(k(a), 0) : `${fmt(k(a), 0)} → ${fmt(k(b), 0)}`,
      fu = v => `${showFuel(v)} ${fuelUnit()}`;
    // montée : celle du trajet si le niveau est tenable, sinon la montée seule jusqu'au niveau
    let cl = r.ok ? r.climb : null;
    if (!r.ok) try {
      const k = m.cruise(r.h, "normal");
      cl = m.climbTo(r.h, {
        speed: D.law === "time" || D.law === "fuel" ? m.climbLaw(D.law, k.ok ? k : undefined) : D.law
      });
    } catch {
      cl = null;
    }
    // descente : vario et TAS du profil (constants) ; Badin du profil s'il est saisi (Descente › Badin), sinon déduit de la
    // TAS de descente, du TOD au sol
    const de = m.desc,
      td = r.h / de.rate,
      dd = de.tas * td / 60,
      iasProf = (() => {
        try {
          return +(window.modelProfile?.() || active)?.descent?.iasKt || 0;
        } catch {
          return 0;
        }
      })(),
      dIas = iasProf > 0 ? `${fmt(iasProf, 0)} kt` : `${rng(de.tas * Math.sqrt(m.atm(r.h).sigma), de.tas * Math.sqrt(m.atm(0).sigma))} kt`,
      L3 = [tl("Trajet", "Trip", "Strecke", "Trayecto"), tl("Montée", "Climb", "Steigflug", "Ascenso"), tl("Descente", "Descent",
        "Sinkflug", "Descenso")];
    const trip = r.ok ? `<b class="v-fuel">${fu(r.fuel)}</b> · <span class="v-time">${hmTxt(r.minutes)}</span> · ${def("TAS")} ${fmt(r.tas, 0)} kt${jet && r.mach >= .4 ? ` (M${r.mach.toFixed(2)})` : ""}${r.limited ? ` · ${tl("poussée max.", "max. thrust", "max. Schub", "empuje máx.")}` : ""}` : "—",
      climb = cl ? `<b>${hmTxt(cl.minutes)}</b> · ${fu(cl.fuel)} · ${fmt(cl.nm, 0)} NM${r0 && rN ? ` · ${tl("tenir", "fly", "halten", "mantener")} ${rng(r0.ias, rN.ias)} kt · ${tl("vario", "rate", "Steigrate", "régimen")} ${rng(r0.roc, rN.roc, r100)} ft/min` : ""}` : "—",
      tod = r.ok ? Math.max(0, D.c.D - r.climb.nm - r.cruiseNm) : dd,
      desc = `<b>${r.ok ? tl(`TOD à ${fmt(tod, 0)} NM`, `TOD at ${fmt(tod, 0)} NM`, `TOD bei ${fmt(tod, 0)} NM`, `TOD a ${fmt(tod, 0)} NM`) : `${fmt(dd, 0)} NM`}</b> · ${hmTxt(td)} · ${fu(de.ff * td / 60)} · ${dIas} · −${fmt(de.rate, 0)} ft/min`;
    return {
      ok: r.ok,
      lines: [
        [L3[0], trip],
        [L3[1], climb],
        [L3[2], desc]
      ],
      // grandeurs brutes (unité affichée) pour la comparaison avec le plan ; null si absentes
      nums: {
        fuel: r.ok ? cv(r.fuel) : null,
        min: r.ok ? r.minutes : null,
        climb: cl ? cl.minutes : null,
        tod: r.ok ? tod : null
      },
      short: {
        fuel: r.ok ? `<span class="v-fuel">${fu(r.fuel)}</span>` : "—",
        time: r.ok ? `<span class="v-time">${hmTxt(r.minutes)}</span>` : "—",
        climb: cl ? `${hmTxt(cl.minutes)} · ${fu(cl.fuel)}` : "—",
        desc: r.ok ? `${fmt(tod, 0)} NM` : "—"
      },
      note: r.ok ? "" : `${tl("Niveau impossible sur ce trajet", "Level impossible on this trip", "Flughöhe auf dieser Strecke unmöglich", "Nivel imposible en este trayecto")} : ${whyNot(m, D.c, r, r.h, D.law)}.`
    };
  }
  /** Titre d'un niveau avec ses repères : « FL310 · le plus économe », « FL360 · trajet trop court ». */
  const decTitle = h => {
    const D = S.dec,
      r = decNearest(D, h);
    return [flTxt(h), ...(r.ok ? decTags(D, h).map(k => DEC_TAG[k]()) : [gapTxt(r.reason)])].join(" · ");
  };
  /** Curseur (survolé, sinon choisi), fiche, réglette, bouton, pastilles, tableau, graphe de montée, instruments et
   *  consignes de montée. Curseur sur le niveau du plan : une colonne ; ailleurs : plan, curseur et écart. */
  function decUpdate() {
    const D = S.dec;
    if (!D || !$("decCard")) return;
    const h = D.hover ?? D.sel,
      X = D.X,
      rc = decNearest(D, h),
      rp = decNearest(D, D.plan),
      same = rc.h === rp.h,
      xc = X(h),
      left = xc > D.W - D.R - 60,
      ct = $("decCurTxt");
    // curseur en pointillés (rien sur le plan) et points sur les deux courbes
    if (same) {
      $("decCurLine").setAttribute("visibility", "hidden");
      put(ct, "textContent", "");
    } else {
      cursorAt("decCurLine", xc);
      ct.setAttribute("x", (xc + (left ? -4 : 4)).toFixed(1));
      ct.setAttribute("text-anchor", left ? "end" : "start");
      put(ct, "textContent", flTxt(h));
    }
    for (const [id, y] of [
        ["decSelF", rc.ok ? D.Yf(cv(rc.fuel)) : -9],
        ["decSelT", rc.ok ? D.Yt(rc.minutes) : -9]
      ]) {
      $(id).setAttribute("cx", rc.ok ? xc : -9);
      $(id).setAttribute("cy", y);
    }
    put($("decSlider"), "value", String(D.sel));
    put($("decLvl"), "textContent", flTxt(D.sel));
    put($("decUse"), "disabled", decNearest(D, D.sel).h === rp.h || !decNearest(D, D.sel).ok);
    // fiche : le niveau seul, ou plan · curseur · écart (curseur − plan)
    const a = decFacts(h);
    let html;
    if (same) html = `<div class="fl-dec-title">${D.hover != null ? "⌖" : "▸"} ${escXml(decTitle(h))}</div><p class="perf-warn dec-warn">${a.note ? `⚠ ${a.note}` : ""}</p><dl class="kvp">${a.lines.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
    else {
      const p = decFacts(rp.h),
        sg = d => d > 0 ? "+" : d < 0 ? "−" : "±",
        dif = (k, f) => {
          if (a.nums[k] == null || p.nums[k] == null) return "—";
          const d = a.nums[k] - p.nums[k],
            t = f(Math.abs(d));
          return `${/^0(\D|$)/.test(t) ? "±" : sg(d)}${t}`; // écart arrondi à zéro : « ±0 »
        },
        mins = v => v < 60 ? `${fmt(v, 0)} min` : hmTxt(v);
      html = `<table class="fl-dec-cmp"><thead><tr><th></th><th>${tl("Plan", "Plan", "Plan", "Plan")} ${flTxt(rp.h)}</th><th>${D.hover != null ? "⌖" : "▸"} ${escXml(decTitle(h))}</th><th>${tl("Écart", "Difference", "Differenz", "Diferencia")}</th></tr></thead><tbody>` +
        `<tr><th>${tl("Carburant", "Fuel", "Kraftstoff", "Combustible")}</th><td>${p.short.fuel}</td><td>${a.short.fuel}</td><td class="v-fuel"><b>${dif("fuel", v => `${fmt(v, 0)} ${fuelUnit()}`)}</b></td></tr>` +
        `<tr><th>${tl("Temps", "Time", "Zeit", "Tiempo")}</th><td>${p.short.time}</td><td>${a.short.time}</td><td class="v-time"><b>${dif("min", mins)}</b></td></tr>` +
        `<tr><th>${tl("Montée", "Climb", "Steigflug", "Ascenso")}</th><td>${p.short.climb}</td><td>${a.short.climb}</td><td>${dif("climb", mins)}</td></tr>` +
        `<tr><th>TOD</th><td>${p.short.desc}</td><td>${a.short.desc}</td><td>${dif("tod", v => `${fmt(v, 0)} NM`)}</td></tr></tbody></table>` + `<p class="perf-warn dec-warn">${[p.note, a.note].filter(Boolean).map(n => `⚠ ${n}`).join("<br>")}</p>`; // emplacement réservé
    }
    $("decCard").innerHTML = typo(html);
    holdHeight($("decCard"));
    decPills();
    decTable();
    S.climbShow?.(h); // graphe de montée (vue détaillée) : même curseur
    feedInstruments(h);
    // consignes de montée : jusqu'au niveau courant
    const gh = Math.abs(h - D.plan) < 1 ? null : h;
    if (S.guideH !== gh) {
      S.guideH = gh;
      scheduleGuide();
    }
  }
  /** Tableau des niveaux ronds (tous les 1000 ft, 2000 ft au-delà de 20 000 ft de plafond), triable par niveau,
   *  carburant ou temps ; ligne choisie surlignée ; niveaux non tenables : « — » et cause. */
  function decTable() {
    const D = S.dec,
      tb = $("decTable");
    if (!D || !tb) return;
    const st = D.m.ceiling > 20000 ? 2000 : 1000,
      list = D.all.filter(r => r.h % st === 0 || (r.ok && decTags(D, r.h).length)),
      key = {
        h: r => r.h,
        fuel: r => r.ok ? r.fuel : Infinity,
        min: r => r.ok ? r.minutes : Infinity
      } [D.sort] || (r => r.h);
    list.sort((a, b) => !a.ok !== !b.ok ? (a.ok ? -1 : 1) * (D.sort === "h" ? D.dir : 1) : (key(a) - key(b)) * D.dir || 0);
    const th = (k, t) => `<th data-sort="${k}" aria-sort="${D.sort === k ? (D.dir > 0 ? "ascending" : "descending") : "none"}" title="${escXml(tl("Trier", "Sort", "Sortieren", "Ordenar"))}">${t}${D.sort === k ? (D.dir > 0 ? " ▲" : " ▼") : ""}</th>`;
    const html = `<thead><tr>${th("h", tl("Niveau", "Level", "Flughöhe", "Nivel"))}${th("fuel", `${tl("Carburant", "Fuel", "Kraftstoff", "Combustible")} (${fuelUnit()})`)}${th("min", tl("Temps", "Time", "Zeit", "Tiempo"))}<th>TAS (kt)</th><th>${tl("Montée", "Climb", "Steigflug", "Ascenso")}</th><th></th></tr></thead><tbody>` +
      list.map(r => r.ok ? `<tr data-h="${r.h}" class="${r.h === D.sel ? "on" : ""}"><td>${flTxt(r.h)}</td><td>${showFuel(r.fuel)}</td><td>${hmTxt(r.minutes)}</td><td>${fmt(r.tas, 0)}</td><td>${hmTxt(r.climb?.minutes || 0)}</td><td class="mut">${decTags(D, r.h).map(k => DEC_TAG[k]()).join(", ")}</td></tr>` : `<tr data-h="${r.h}" class="off${r.h === D.sel ? " on" : ""}"><td>${flTxt(r.h)}</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="mut">${gapTxt(r.reason)}</td></tr>`).join("") + "</tbody>";
    if (tb._html !== html) {
      tb._html = html;
      tb.innerHTML = typo(html);
    }
  }
  /** Panneau de la décision (colonne droite, vue détaillée) : limites en trois lignes (plafond, niveau demandé, plus haut
   *  possible), avertissements, puis « En savoir plus » (lecture, hypothèses du modèle). */
  function decPanel() {
    const D = S.dec;
    if (!D || !$("panelDecision")) return;
    const m = D.m,
      c = D.c;
    panel("panelDecision", tl("Décision du niveau de vol", "Flight level decision", "Wahl der Flughöhe", "Decisión del nivel de vuelo"),
      limitsHtml(m, c, [0, ...D.all.map(r => r.h)]),
      `<details class="more"><summary>${tl("En savoir plus", "Learn more", "Mehr erfahren", "Saber más")}</summary>` +
      reading(tl(
        "chaque point est le trajet entier (montée, croisière, descente) volé à ce niveau. Plus haut, la croisière consomme moins mais la montée coûte plus : le niveau le plus économe est au creux de la courbe du haut. Sur un trajet court, monter puis redescendre peut ne plus tenir dans la distance : ces niveaux sont grisés.",
        "each point is the whole trip (climb, cruise, descent) flown at that level. Higher, the cruise burns less but the climb costs more: the least-fuel level is at the bottom of the upper curve. On a short trip, climbing then descending may no longer fit in the distance: those levels are greyed.",
        "jeder Punkt ist die ganze Strecke (Steig-, Reise-, Sinkflug) auf dieser Flughöhe. Höher verbraucht der Reiseflug weniger, der Steigflug kostet mehr: die sparsamste Flughöhe liegt im Tiefpunkt der oberen Kurve. Auf einer kurzen Strecke passen Steig- und Sinkflug eventuell nicht mehr in die Entfernung: diese Flughöhen sind grau.",
        "cada punto es el trayecto completo (ascenso, crucero, descenso) a ese nivel. Más alto, el crucero consume menos pero el ascenso cuesta más: el nivel más económico está en el fondo de la curva de arriba. En un trayecto corto, subir y bajar puede no caber en la distancia: esos niveles están en gris."
      )) +
      ((m.estimatedRef || m.notes.length) ? `<p class="mut">${[m.estimatedRef ? `${tl("Point de croisière", "Cruise reference", "Reiseflug-Bezug", "Referencia de crucero")} : ${escXml(m.refSrc)} (${fieldLink("cruise.refAltFt")}, ${fieldLink("cruise.ceilingFt")})` : "", ...m.notes.map(escXml)].filter(Boolean).join(" · ")}</p>` : "") +
      `<p class="mut">${assumptions(m, c)}</p></details>`);
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
    else if (need != null && need > c.D) warn.push(`${tl("Distance trop courte pour", "Distance too short for", "Entfernung zu kurz für", "Distancia demasiado corta para")} ${flTxt(req)} : ${tl("monter puis redescendre demande", "climbing then descending takes", "Steig- und Sinkflug brauchen", "subir y bajar requiere")} ${fmt(need, 0)} NM. ${tl(`Baisser le ${F_FL()}`, `Lower the ${F_FL()}`, `${F_FL()} senken`, `Baje el ${F_FL()}`)}${reach ? ` (≤ ${flTxt(reach.h)})` : ""} ${tl(`ou allonger le ${F_DIST()}.`, `or increase the ${F_DIST()}.`, `oder ${F_DIST()} erhöhen.`, `o aumente el ${F_DIST()}.`)}`);
    return `<dl class="kvp">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>${warn.map(w => `<p class="perf-warn">⚠ ${w}</p>`).join("")}`;
  }
  /** Cause d'un « inatteignable » de la table comparative (r : résultat de m.trip ; law : loi de montée). */
  function whyNot(m, c, r, h, law) {
    const lower = tl(`baisser le ${F_FL()}`, `lower the ${F_FL()}`, `${F_FL()} senken`, `bajar el ${F_FL()}`);
    if (r.reason === "short") {
      const d = minDistance(m, h, law);
      return `${tl("trajet trop court", "trip too short", "Strecke zu kurz", "trayecto demasiado corto")}${d ? ` (${fmt(d, 0)} NM > ${fmt(c.D, 0)} NM)` : ""} → ${lower} ${tl(`ou allonger le ${F_DIST()}`, `or increase the ${F_DIST()}`, `oder ${F_DIST()} erhöhen`, `o aumentar el ${F_DIST()}`)}`;
    }
    if (r.reason === "ceiling") return `${tl(`vario nul avant ${flTxt(h)} à cette vitesse`, `climb rate reaches zero before ${flTxt(h)} at this speed`, `Steigrate vor ${flTxt(h)} bei dieser Geschwindigkeit null`, `régimen nulo antes de ${flTxt(h)} a esta velocidad`)} → ${lower}`;
    return `${tl("poussée / puissance insuffisante en croisière à", "not enough thrust / power to cruise at", "Schub / Leistung reicht für Reiseflug nicht auf", "empuje / potencia insuficiente para crucero a")} ${flTxt(h)} → ${lower}`;
  }

  // ---------------------------------------------------------------------------------------------------
  // Fiche du curseur (bloc Résultat)
  // ---------------------------------------------------------------------------------------------------

  /** Instruments à l'altitude survolée (hover) ou épinglée : la fiche du niveau est celle de la décision du niveau. */
  function renderPinned(hover) {
    feedInstruments(hover);
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
      $("climbBlock").hidden = true;
      $("optEmpty").hidden = false;
      // champs manquants : liens vers l'éditeur de profil
      $("optEmpty").innerHTML = typo(escXml(msg) + (fields.length ? ` — ${tl("à renseigner", "to fill in", "auszufüllen", "por rellenar")} : ${fields.map(f => fieldLink(f)).join(", ")}` : ""));
      ["panelDecision", "panelClimb"].forEach(id => {
        if ($(id)) $(id).innerHTML = "";
      });
      window.altitudeOptimum = null;
      renderPinned();
      syncManual();
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
    const altOk = !!K.bestFuel;
    // aucun niveau tenable : message à la place du graphe de montée (la décision du niveau dit pourquoi)
    $("optEmpty").hidden = altOk;
    if (!altOk) $("optEmpty").innerHTML = typo(noLevelTxt(m, c));
    window.altitudeOptimum = altOk ? {
      model: m,
      c
    } : null; // repère lu par la page (recalcul au changement de langue)
    if (K.top > 0) guard("panelClimb", "climbChart", tl("Montée", "Climb", "Steigflug", "Ascenso"), () => drawClimb(m, c, K));
    else $("climbBlock").hidden = true;
    syncManual();
    renderPinned();
    StickyFrame.refresh();
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
    return tl(`Aucun niveau atteignable sur ${fmt(c.D, 0)} NM : même à 1000 ft, monter puis redescendre est plus long que le trajet, ou la croisière n’est tenable nulle part. Allonger le ${F_DIST()} ou vérifier le profil.`, `No level reachable over ${fmt(c.D, 0)} NM: even at 1000 ft, climbing then descending is longer than the trip, or cruise cannot be held anywhere. Increase the ${F_DIST()} or check the profile.`, `Auf ${fmt(c.D, 0)} NM ist keine Flughöhe erreichbar: selbst auf 1000 ft sind Steig- und Sinkflug länger als die Strecke, oder der Reiseflug ist nirgends haltbar. ${F_DIST()} erhöhen oder Profil prüfen.`, `Ningún nivel alcanzable en ${fmt(c.D, 0)} NM: incluso a 1000 ft, subir y bajar es más largo que el trayecto, o el crucero no se mantiene en ningún nivel. Aumente la ${F_DIST()} o revise el perfil.`);
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
  // Montée : graphe (vario, carburant par 1000 ft, vitesses), régimes de la cartographie moteur
  // ---------------------------------------------------------------------------------------------------

  /** Abscisse du graphe de montée : « alt » (selon l'altitude, défaut) ou « rpm » (selon le régime, à mi-montée) ;
   *  mémorisée dans ce navigateur (fpClimbX). */
  const climbX = () => {
    try {
      return localStorage.getItem("fpClimbX") === "rpm" ? "rpm" : "alt";
    } catch {
      return "alt";
    }
  };
  /** Bascule « par altitude ↔ par régime » de la rangée de montée (#climbX) : boutons créés une fois, libellés et état
   *  écrits seulement s'ils changent ; un clic redessine les courbes (sans recalcul du cache). */
  function mountClimbX() {
    const box = $("climbX");
    if (!box) return;
    if (!box.dataset.ready) {
      box.dataset.ready = "1";
      box.innerHTML =
        '<button type="button" class="repo-seg" data-x="alt"></button><button type="button" class="repo-seg" data-x="rpm"></button>';
      box.addEventListener("click", e => {
        const b = e.target.closest("button[data-x]");
        if (!b) return;
        try {
          localStorage.setItem("fpClimbX", b.dataset.x);
        } catch {}
        if (S.m && S.c && curvesShown() && S.cache) drawClimbChart(S.m, S.c, S.cache);
      });
    }
    put(box, "hidden", !hasEngineMap());
    const x = climbX();
    for (const b of box.querySelectorAll("button")) {
      put(b, "textContent", b.dataset.x === "alt" ? tl("par altitude", "by altitude", "nach Höhe", "por altitud") : tl("par régime",
        "by engine setting", "nach Drehzahl", "por régimen"));
      if (b.getAttribute("aria-pressed") !== String(b.dataset.x === x)) b.setAttribute("aria-pressed", String(b.dataset.x === x));
    }
    put(box, "title", tl("Graphe de montée : selon l’altitude, ou selon le régime à mi-montée (au Badin de la montée choisie)",
      "Climb chart: by altitude, or by engine setting at mid-climb (at the chosen climb IAS)",
      "Steigflugdiagramm: nach Höhe oder nach Drehzahl im halben Steigflug (bei der IAS des gewählten Steigflugs)",
      "Gráfico de ascenso: por altitud, o por régimen a media subida (a la IAS del ascenso elegido)"));
  }
  /** Graphe de montée selon le régime, à mi-montée (readAlt) : vario au Badin de la montée choisie (violet) et à Vy (bleu),
   *  carburant par 1000 ft (échelle de droite), réglage du moment en trait vertical ; abscisse : RPM / N1 de la
   *  cartographie moteur, sinon gaz en %. Lecture au survol (hors des jauges synchronisées, qui suivent l'altitude). */
  function drawClimbRegime(m, c) {
    const svg = $("climbChart"),
      H = 230,
      W = chartW(svg, H),
      Lm = 52,
      R = 44,
      T = 14,
      B = 30,
      q = S.manual,
      h = readAlt(m),
      sc = regimeScale(m, h),
      unit = fuelUnit(),
      PER = L.per1000(),
      jet = m.kind === "jet",
      base = m.manualLaw(q.ias, 0),
      fullVy = m.settingAt(1e12, h).ff,
      n = 40,
      pts = [];
    sync.charts = sync.charts.filter(x => x.svg !== svg); // hors des jauges synchronisées (abscisse : le régime)
    for (let i = 0; i <= n; i++) {
      const x = sc.lo + (sc.hi - sc.lo) * i / n,
        frac = fracOfRegime(m, h, x, q.ias),
        p = m.manualPoint(h, hh => ({
          ve: base(hh).ve,
          frac
        })),
        vy = m.settingAt(sc.map ? ffForRpm(sc.rows, x) : frac * fullVy, h);
      pts.push({
        x,
        frac,
        p,
        vy
      });
    }
    const rAx = niceAxis(0, Math.max(...pts.map(o => Math.max(o.p.roc, o.vy.roc)), 100) * 1.03, 4, true),
      fAx = niceAxis(0, Math.max(...pts.filter(o => o.p.roc > 100 && Number.isFinite(o.p.fuelPer1000)).map(o => cv(o.p.fuelPer1000)),
        1) * 1.03, 4, true),
      xAx = niceAxis(sc.lo, sc.hi, 5),
      X = v => Lm + (v - sc.lo) / ((sc.hi - sc.lo) || 1) * (W - Lm - R),
      Y = v => T + (1 - Math.max(0, v) / rAx.hi) * (H - T - B),
      Yf = v => T + (1 - v / fAx.hi) * (H - T - B),
      xTxt = v => sc.map ? `${fmt(v, jet ? 1 : 0)} ${sc.unit}` : `${fmt(v, 0)} %`;
    let g = "";
    for (const v of rAx.ticks) g += `<line class="grid-line" x1="${Lm}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${Lm - 5}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, rAx.dec)}</text>`;
    for (const v of fAx.ticks) g += `<text x="${W - R + 5}" y="${Yf(v) + 4}">${fmt(v, fAx.dec)}</text>`;
    for (const v of xAx.ticks)
      if (v >= sc.lo - 1e-9 && v <= sc.hi + 1e-9) g += `<text x="${X(v)}" y="${H - B + 14}" text-anchor="middle">${fmt(v, xAx.dec)}</text>`;
    /** Tracé SVG d'une grandeur f(échantillon) sur les échantillons retenus par sel. */
    const pl = (f, sel = () => true) => pts.filter(sel).map((o, j) => `${j ? "L" : "M"}${X(o.x).toFixed(1)},${f(o).toFixed(1)}`).join("");
    const cur = (() => {
      const p = m.manualPoint(h, manualLaw(m));
      return sc.map ? rpmForFF(sc.rows, p.ff) : p.frac * 100;
    })();
    g += `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>` +
      `<path class="curve" d="${pl(o => Y(o.vy.roc))}"/><path class="curve-fuel" d="${pl(o => Yf(cv(o.p.fuelPer1000)), o => o.p.roc > 100)}"/><path class="curve-man" d="${pl(o => Y(o.p.roc))}"/>` +
      (Number.isFinite(cur) ? `<line class="plan-line" x1="${X(cur).toFixed(1)}" x2="${X(cur).toFixed(1)}" y1="${T}" y2="${H - B}"/><text class="plan-label" x="${(X(cur) + 3).toFixed(1)}" y="${T + 10}">${tl("réglage", "setting", "Einstellung", "ajuste")}</text>` : "") +
      `<text x="${(Lm + W - R) / 2}" y="${H - 3}" text-anchor="middle">${sc.map ? `${tl("Régime", "Engine setting", "Drehzahl", "Régimen")} (${sc.unit})` : CL.throttle()} — ${flTxt(h)}</text><text x="11" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 11 ${(T + H - B) / 2})">ft/min</text>` +
      `<text x="${W - 8}" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(90 ${W - 8} ${(T + H - B) / 2})">${PER}</text>` +
      `<line id="climbCursor" class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><rect id="climbHit" x="${Lm}" y="${T}" width="${W - Lm - R}" height="${H - T - B}" fill="transparent"/>`;
    svg.innerHTML = typo(g);
    svg.hidden = false;
    svg.dataset.t = T;
    svg.dataset.b = B;
    panel("panelClimb", tl("Montée — vario selon le régime", "Climb — rate by engine setting", "Steigflug — Steigrate nach Drehzahl",
        "Ascenso — régimen según el ajuste del motor"),
      `<p>${tl("À mi-montée", "At mid-climb", "Halber Steigflug", "A media subida")} (${flTxt(h)}) — ${L.man()} : ${fmt(q.ias, 0)} kt</p>`,
      legend([
        [sw(COL.prof), lab(tl("Vario à Vy", "Rate at Vy", "Steigrate bei Vy", "Régimen a Vy"), COL.prof), tl(
          "meilleur vario pour ce régime",
          "best rate for this setting", "bestes Steigen bei dieser Einstellung", "mejor régimen para este ajuste")],
        [sw(COL.man), lab(L.man(), COL.man), tl("vario au Badin de la montée choisie", "rate at the chosen climb IAS",
          "Steigrate bei der IAS des gewählten Steigflugs", "régimen a la IAS del ascenso elegido")],
        [sw(COL.fast), lab(tl("Carburant", "Fuel", "Kraftstoff", "Combustible"), COL.fast), `${PER} ${tl("(échelle de droite)", "(right scale)", "(rechte Skala)", "(escala derecha)")}`]
      ]),
      `<div id="climbReadout" class="readout"></div>`,
      reading(tl(
        "ce que donne chaque régime à mi-montée : à gauche, peu de gaz, peu de vario ; le trait vertical est le réglage du moment. Le carburant par 1000 ft baisse souvent quand le régime monte : on reste moins longtemps en montée.",
        "what each engine setting gives at mid-climb: on the left, little throttle, little climb rate; the vertical line is the current setting. Fuel per 1000 ft often drops as the setting increases: less time spent climbing.",
        "was jede Einstellung im halben Steigflug ergibt: links wenig Leistung, wenig Steigrate; die senkrechte Linie ist die aktuelle Einstellung. Der Kraftstoff je 1000 ft sinkt oft mit steigender Leistung: kürzere Steigzeit.",
        "lo que da cada régimen a media subida: a la izquierda, pocos gases, poco régimen de ascenso; la línea vertical es el ajuste actual. El combustible por 1000 ft suele bajar al subir el régimen: menos tiempo en ascenso."
      )));
    const hit = $("climbHit");
    hit.style.cursor = "crosshair";
    hit.onpointermove = e => {
      const b = svg.getBoundingClientRect(),
        x = sc.lo + ((e.clientX - b.left) / (b.width || 1) * W - Lm) / (W - Lm - R) * (sc.hi - sc.lo),
        o = pts.reduce((a, s) => Math.abs(s.x - x) < Math.abs(a.x - x) ? s : a, pts[0]);
      cursorAt("climbCursor", X(o.x));
      const ro = $("climbReadout");
      if (ro) ro.innerHTML = typo(`<b>⌖ ${xTxt(o.x)}</b><dl class="kvp"><dt>${lab(tl("Vario à Vy", "Rate at Vy", "Steigrate bei Vy", "Régimen a Vy"), COL.prof)}</dt><dd>${fmt(o.vy.roc, 0)} ft/min · ${fmt(o.vy.ias, 0)} kt</dd><dt>${lab(L.man(), COL.man)}</dt><dd>${fmt(Math.max(0, o.p.roc), 0)} ft/min · ${fmt(o.p.ias, 0)} kt · ${tl("gaz", "throttle", "Leistung", "gases")} ${fmt(o.frac * 100, 0)} %</dd><dt>${lab(tl("Carburant", "Fuel", "Kraftstoff", "Combustible"), COL.fast)}</dt><dd>${Number.isFinite(o.p.fuelPer1000) && o.p.roc > 20 ? `${fmt(cv(o.p.fuelPer1000), 1)} ${PER} · ` : ""}${showFuel(o.p.ff)} ${unit}/h</dd></dl>`);
    };
    hit.onpointerleave = () => {
      $("climbCursor")?.setAttribute("visibility", "hidden");
      if ($("climbReadout")) $("climbReadout").textContent = "";
    };
    hit.onclick = null;
    hit.onpointerdown = null;
  }

  /** Vrai si le profil actif a une cartographie moteur (au moins deux régimes avec débit). */
  const hasEngineMap = () => (active?.rpmFuelCurve || []).filter(r => Number.isFinite(+r.rpm) && Number.isFinite(+(r.fuelFlowPerHour ?? r
    .fuelFlowMax))).length >= 2;

  /** Montée (vue détaillée) : graphe « Montée » (vario, carburant par 1000 ft, Badin et TAS selon l'altitude), tableau des
   *  régimes s'il y a une cartographie moteur. La comparaison des montées est un tableau tenu par les consignes
   *  (renderGuide). */
  function drawClimb(m, c, K) {
    $("climbBlock").hidden = false;
    mountClimbX();
    guard("panelClimb", "climbChart", tl("Montée", "Climb", "Steigflug", "Ascenso"), () => drawClimbChart(m, c, K));
    // --- régimes de la table RPM / N1 à mi-montée (cartographie moteur seulement) ---------------------------------
    const map = hasEngineMap();
    $("rowTable").hidden = !map;
    if (!map) return;
    guard("panelClimb", "climbTable", tl("Régimes de montée", "Climb settings", "Steigflugeinstellungen", "Regímenes de ascenso"),
      () => {
        const unit = fuelUnit(),
          PER = L.per1000(),
          hMid = Math.round(Math.min(c.FL * 100, K.top) / 2 / 500) * 500,
          ffOf = r => +(r.fuelFlowPerHour ?? r.fuelFlowMax),
          rpm = (active.rpmFuelCurve || []).filter(r => Number.isFinite(+r.rpm) && Number.isFinite(ffOf(r))).map(r => ({
            r,
            ff: ffOf(r),
            at: m.settingAt(ffOf(r), hMid),
            sl: m.settingAt(ffOf(r), 0)
          })).filter(x => x.at.roc > 100),
          bestRpm = rpm.reduce((a, b) => !a || b.at.fuelPer1000 < a.at.fuelPer1000 ? b : a, null),
          RATE = tl("Vario", "Rate", "Steigrate", "Régimen");
        $("climbTable").innerHTML = typo(rpm.length ? `<p class="mut">${tl(`Vario et carburant par pied gagné à ${flTxt(hMid)} (mi-montée) pour chaque régime de la cartographie ; ★ : le plus économe.`, `Rate and fuel per foot gained at ${flTxt(hMid)} (mid-climb) for each setting of the engine map; ★: most economical.`, `Steigrate und Kraftstoff je gewonnenem Fuß auf ${flTxt(hMid)} (halber Steigflug) für jede Einstellung des Motorkennfelds; ★: am sparsamsten.`, `Régimen y combustible por pie ganado a ${flTxt(hMid)} (media subida) para cada régimen del mapa motor; ★: el más económico.`)}</p><table><thead><tr><th>RPM / N1</th><th>${tl("Débit", "Fuel flow", "Verbrauch", "Flujo")} (${unit}/h)</th><th>${tl("Gaz", "Throttle", "Leistungshebel", "Gases")}</th><th>${RATE} ${tl("sol", "SL", "Boden", "nivel del mar")}</th><th>${RATE} ${flTxt(hMid)}</th><th>${PER}</th></tr></thead><tbody>${rpm.sort((a, b) => a.r.rpm - b.r.rpm).map(x => `<tr><td${x === bestRpm ? ' class="best"' : ""}>${fmt(+x.r.rpm, 0)}${x === bestRpm ? " ★" : ""}</td><td>${showFuel(x.ff)}</td><td>${fmt(x.at.frac * 100, 0)} %</td><td>${fmt(x.sl.roc, 0)}</td><td>${fmt(x.at.roc, 0)}</td><td>${fmt(cv(x.at.fuelPer1000), 1)}</td></tr>`).join("")}</tbody></table>` : `<p class="mut">${tl("Aucun régime de la cartographie ne permet de monter à mi-montée.", "No setting of the engine map climbs at mid-climb.", "Keine Einstellung des Motorkennfelds steigt im halben Steigflug.", "Ningún régimen del mapa motor permite subir a media subida.")}</p>`);
      });
  }

  /** Graphe « Montée » : trois panneaux empilés sur le même axe des altitudes que la décision du niveau — vario (objectif
   *  des consignes, et vario max à Vy en tirets), carburant par 1000 ft (objectif), Badin (trait plein) et TAS (tirets) de
   *  l'objectif ; un seul gris au-delà du plafond ; même curseur que la décision (survol, clic). Mode « par régime »
   *  (cartographie moteur seulement) : drawClimbRegime. */
  function drawClimbChart(m, c, K) {
    S.climbShow = null;
    if (climbX() === "rpm" && hasEngineMap()) return drawClimbRegime(m, c);
    const svg = $("climbChart"),
      W = Math.max(320, Math.round((svg.parentElement?.clientWidth || 540) - 2)),
      Lm = 58,
      R = 14,
      PV = {
        t: 18,
        b: 108
      },
      PF = {
        t: 126,
        b: 176
      },
      PS = {
        t: 194,
        b: 274
      },
      H = 310,
      xmax = S.dec?.xmax || Math.max(K.topX, 1000),
      step = m.ceiling > 20000 ? 1000 : 500,
      goal = goalNow(),
      col = goalCol(goal),
      top = Math.floor(m.ceiling / step) * step,
      law = goalLaw(m, goal, m.cruise(Math.min(c.FL * 100, top), "normal")),
      PER = L.per1000(),
      unit = fuelUnit();
    if (!law) throw Error(tl("objectif de montée indisponible", "climb goal unavailable", "Steigflugziel nicht verfügbar",
      "objetivo de ascenso no disponible"));
    const pts = [];
    for (let h = 0; h <= top; h += step) {
      const v = m.climbPoint(h),
        g = m.manualPoint(h, law);
      if (!v || !Number.isFinite(v.roc)) break;
      pts.push({
        h,
        v,
        g,
        f1000: g.roc > 50 ? g.ff / g.roc * 1000 / 60 : NaN
      });
    }
    if (!pts.length) throw Error(tl("aucun point de montée", "no climb point", "kein Steigpunkt", "ningún punto de ascenso"));
    const X = h => Lm + h / xmax * (W - Lm - R),
      rAx = niceAxis(0, Math.max(...pts.map(p => Math.max(p.v.roc, p.g.roc))) * 1.03, 3, true),
      fv = pts.map(p => cv(p.f1000)).filter(Number.isFinite),
      fAx = niceAxis(0, (fv.length ? Math.max(...fv) : 1) * 1.03, 2, true),
      sv = pts.flatMap(p => [p.g.ias, p.g.tas]).filter(Number.isFinite),
      sAx = niceAxis(Math.min(...sv) * .96, Math.max(...sv) * 1.03, 3),
      Y = (P, ax) => v => P.t + (1 - (v - ax.lo) / ((ax.hi - ax.lo) || 1)) * (P.b - P.t),
      Yv = Y(PV, rAx),
      Yf = Y(PF, fAx),
      Ys = Y(PS, sAx);
    let g = "";
    const tk = xmax > 30000 ? 5000 : xmax > 12000 ? 2000 : 1000;
    for (let h = 0; h <= xmax; h += tk) g += `<line class="grid-line" x1="${X(h).toFixed(1)}" x2="${X(h).toFixed(1)}" y1="${PV.t}" y2="${PS.b}"/><text x="${X(h).toFixed(1)}" y="${PS.b + 14}" text-anchor="middle">${flTxt(h)}</text>`;
    /** Graduations horizontales d'un panneau (valeurs à gauche). */
    const ticks = (ax, Yp) => ax.ticks.map(v => `<line class="grid-line" x1="${Lm}" x2="${W - R}" y1="${Yp(v).toFixed(1)}" y2="${Yp(v).toFixed(1)}"/><text x="${Lm - 5}" y="${(Yp(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v, ax.dec)}</text>`).join("");
    g += ticks(rAx, Yv) + ticks(fAx, Yf) + ticks(sAx, Ys);
    if (m.ceiling < xmax - 1)
      for (const P of [PV, PF, PS]) g += `<rect class="beyond" x="${X(m.ceiling).toFixed(1)}" y="${P.t}" width="${(X(xmax) - X(m.ceiling)).toFixed(1)}" height="${P.b - P.t}"/>`;
    /** Tracé d'une grandeur f(point) sur les points où elle est finie. */
    const pl = (f, Yp) => pts.filter(p => Number.isFinite(f(p))).map((p, j) => `${j ? "L" : "M"}${X(p.h).toFixed(1)},${Yp(f(p)).toFixed(1)}`).join("");
    for (const P of [PV, PF, PS]) g += `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${P.b}" y2="${P.b}"/><line class="axis" x1="${Lm}" x2="${Lm}" y1="${P.t}" y2="${P.b}"/>`;
    const gName = GOAL_TXT[goal]()[0];
    g += (goal !== "vy" ? `<path class="band" d="${pl(p => Math.max(0, p.v.roc), Yv)}"/>` : "") +
      `<path class="curve-goal" style="stroke:${col}" d="${pl(p => Math.max(0, p.g.roc), Yv)}"/>` +
      `<path class="curve-goal thin" style="stroke:${col}" d="${pl(p => cv(p.f1000), Yf)}"/>` +
      `<path class="curve-goal" style="stroke:${col}" d="${pl(p => p.g.ias, Ys)}"/><path class="tas-line" style="stroke:${col}" d="${pl(p => p.g.tas, Ys)}"/>` +
      `<text class="dec-ptitle" x="${Lm + 4}" y="${PV.t - 5}">${tl("Vario", "Climb rate", "Steigrate", "Régimen")} (ft/min) — « ${gName} »${goal !== "vy" ? tl(", tirets : vario max (Vy)", ", dashed: max. rate (Vy)", ", gestrichelt: max. Steigrate (Vy)", ", trazos: régimen máx. (Vy)") : ""}</text>` +
      `<text class="dec-ptitle" x="${Lm + 4}" y="${PF.t - 5}">${tl("Carburant", "Fuel", "Kraftstoff", "Combustible")} (${PER})</text>` +
      `<text class="dec-ptitle" x="${Lm + 4}" y="${PS.t - 5}">${tl("Badin à tenir (trait) et TAS (tirets), kt", "IAS to fly (line) and TAS (dashed), kt", "Zu haltende IAS (Linie) und TAS (gestrichelt), kt", "IAS a mantener (línea) y TAS (trazos), kt")}</text>` +
      `<text x="${(Lm + W - R) / 2}" y="${H - 2}" text-anchor="middle">${tl("Altitude", "Altitude", "Höhe", "Altitud")}</text>` +
      `<line id="climbCursor" class="cursor" x1="0" x2="0" y1="${PV.t}" y2="${PS.b}" visibility="hidden"/>` +
      `<rect id="climbHit" x="${Lm}" y="${PV.t}" width="${W - Lm - R}" height="${PS.b - PV.t}" fill="transparent"/>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = typo(g);
    svg.hidden = false;
    sync.charts = sync.charts.filter(x => x.svg !== svg); // le curseur est celui de la décision du niveau
    const p0 = pts[0];
    /** Curseur et relevé (panneau) au point de montée le plus proche de h. */
    const show = h => {
      if (h == null) {
        $("climbCursor")?.setAttribute("visibility", "hidden");
        return;
      }
      const p = pts.reduce((a, x) => Math.abs(x.h - h) < Math.abs(a.h - h) ? x : a, pts[0]);
      cursorAt("climbCursor", X(p.h));
      const ro = $("climbReadout");
      if (ro) ro.innerHTML = typo(`<b>⌖ ${altTxt(p.h)}</b> — « ${gName} » : ${fmt(p.g.ias, 0)} kt (TAS ${fmt(p.g.tas, 0)}) · ${fmt(Math.max(0, p.g.roc), 0)} ft/min${Number.isFinite(p.f1000) ? ` · ${fmt(cv(p.f1000), 1)} ${PER}` : ""}${m.kind !== "jet" ? ` · ${tl("gaz", "throttle", "Leistung", "gases")} ${fmt(p.g.frac * 100, 0)} %` : ""} ; Vy ${fmt(p.v.vyIas, 0)} kt, ${fmt(p.v.roc, 0)} ft/min`);
      holdHeight(ro);
    };
    S.climbShow = show;
    const hit = $("climbHit"),
      /** Altitude sous le pointeur e. */
      hAt = e => {
        const b = svg.getBoundingClientRect();
        return Math.max(0, ((e.clientX - b.left) / (b.width || 1) * W - Lm) / (W - Lm - R) * xmax);
      };
    hit.style.cursor = "crosshair";
    hit.onpointermove = e => S.dec ? decHover(hAt(e)) : show(hAt(e));
    hit.onpointerleave = () => S.dec ? decHover(null) : show(null);
    hit.onclick = e => S.dec && decSelect(hAt(e));
    if (S.dec) show(S.dec.hover ?? S.dec.sel);
    panel("panelClimb", tl("Montée", "Climb", "Steigflug", "Ascenso"),
      `<dl class="kvp"><dt>${tl("Objectif", "Goal", "Ziel", "Objetivo")}</dt><dd>${lab(gName, col)} — ${tl("choisi dans les consignes de montée", "chosen in the climb instructions", "in den Steigflug-Anweisungen gewählt", "elegido en las consignas de ascenso")}</dd><dt>${tl("Au sol", "At sea level", "Am Boden", "Al nivel del mar")}</dt><dd>${def("Vy")} ${fmt(p0.v.vyIas, 0)} kt, ${fmt(p0.v.roc, 0)} ft/min · ${def("Vx")} ${fmt(p0.v.vxIas, 0)} kt</dd></dl>`,
      `<div id="climbReadout" class="readout"></div>`,
      `<details class="more"><summary>${tl("En savoir plus", "Learn more", "Mehr erfahren", "Saber más")}</summary>` + reading(tl(
        `le vario baisse en montant jusqu’au plafond ; tirets : le vario max (à ${def("Vy")}) encore disponible. Le carburant par 1000 ft monte quand le vario baisse. Le Badin à tenir reste à peu près constant, la TAS (vitesse vraie) s’en écarte en montant. Changez d’objectif dans « Consignes de montée » ; la comparaison des objectifs est sous le graphe.`,
        `the climb rate drops as you climb towards the ceiling; dashed: the maximum rate (at ${def("Vy")}) still available. Fuel per 1000 ft rises as the rate drops. The IAS to fly stays roughly constant, the TAS (true airspeed) moves away from it as you climb. Change the goal in “Climb instructions”; the comparison of goals is under the chart.`,
        `die Steigrate sinkt beim Steigen bis zur Gipfelhöhe; gestrichelt: die noch verfügbare maximale Steigrate (bei ${def("Vy")}). Der Kraftstoff je 1000 ft steigt, wenn die Steigrate sinkt. Die zu haltende IAS bleibt ungefähr gleich, die TAS (wahre Fluggeschwindigkeit) entfernt sich beim Steigen davon. Ziel unter „Steigflug-Anweisungen“ ändern; der Vergleich der Ziele steht unter dem Diagramm.`,
        `el régimen baja al subir hasta el techo; trazos: el régimen máximo (a ${def("Vy")}) aún disponible. El combustible por 1000 ft sube cuando baja el régimen. La IAS a mantener queda más o menos constante, la TAS (velocidad verdadera) se aleja de ella al subir. Cambie el objetivo en «Consignas de ascenso»; la comparación de objetivos está bajo el gráfico.`)) + `</details>`);
  }

  // largeur de colonne ou hauteur de fenêtre changée : courbes redessinées à la nouvelle taille (sans recalcul du cache)
  {
    let last = "",
      t = 0;
    addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const w = document.querySelector("#levelDecision .chart-wrap")?.clientWidth || 0,
          key = `${Math.round(w / 20)}|${Math.round(innerHeight / 20)}`;
        if (key === last) return;
        last = key;
        if (S.dec && $("decChart")) {
          drawDecision();
          decUpdate();
        }
        if (S.m && S.c && curvesShown()) {
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
    renderAll: () => S.m && S.c && curvesShown() && renderAll(S.m, S.c),
    /** Modèle et trajet du devis sans tracer les courbes (vue simple) : montée choisie du devis à jour. */
    prepare,
    /** Montée choisie du devis et consignes de montée redessinées (changement de vue, de langue, d'unité ou de profil). */
    syncClimb: () => {
      guideHtml = "";
      syncClimbCtl();
      mountClimbX();
    },
    state: S,
    /** Loi réglée par les curseurs pour le profil actif : { ias, vs, full, calc, frac, law(modèle) → loi h → { ve, frac },
     *  text (libellé court : « 120 kt, plein gaz ») } ; null avant le premier calcul. */
    manual: () => S.manual && S.manual.pid.startsWith(`${active?.id}|`) ? {
      ias: S.manual.ias,
      vs: S.manual.vs,
      full: S.manual.full,
      calc: S.manual.calc,
      frac: S.manual.frac,
      law: m => manualLaw(m),
      text: manualTxt()
    } : null
  };
})();
