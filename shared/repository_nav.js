// En-tête commun de toutes les pages, piloté par repository_tree (chargé juste avant) : thème et favicon
// du dossier / de la page, langue (fr / en / de / es, « Auto » = navigateur), menu ☰ des pages, pied de page.
// Expose window.RepositoryNav (langue, réglages, addAction) et émet « repository-nav-ready ».
(() => {
  const cfg = window.REPOSITORY_TREE;
  if (!cfg) return;
  // Page courante et réglages hérités : racine du dépôt → dossiers parents → page.
  const script = document.currentScript,
    root = new URL("../", script.src),
    rel = decodeURIComponent(location.href.startsWith(root.href) ? location.href.slice(root.href.length).split(/[?#]/)[0] : "");
  const page = cfg.pages.find(p => p.path === rel) || cfg.pages.find(p => location.pathname.endsWith("/" + p.path)),
    doc = document.documentElement;
  const folderPath = (page?.path || rel).split("/").slice(0, -1),
    folderSettings = {};
  Object.assign(folderSettings, cfg.folders?.[""] || {});
  folderPath.reduce((path, part) => {
    path = path ? path + "/" + part : part;
    Object.assign(folderSettings, cfg.folders?.[path] || {});
    return path
  }, "");
  const themeName = page?.theme || folderSettings.theme || cfg.defaults.theme,
    theme = cfg.themes[themeName] || {};
  const config = {
    ...(cfg.defaults.config || {}),
    ...(folderSettings.config || {}),
    ...(page?.config || {})
  };
  const files = {
    ...(folderSettings.files || {}),
    ...(page?.files || {})
  };
  const favicon = page?.favicon || folderSettings.favicon || theme.favicon || cfg.defaults.favicon;
  // ---- Apparence (Paramétrage › Apparence) : design, jeu d'icônes, barre latérale, couleurs des thèmes -------------
  // Couleurs : un thème peut être rattaché à une famille de couleurs (REPOSITORY_TREE.colorFamilies : teinte,
  // saturation) et à un ton (clarté) ; bandeau, texte du bandeau et accent en sont calculés avec un contraste WCAG
  // d'au moins 4,5:1 (texte du bandeau / bandeau, accent / fond de page). Sans réglage : couleurs de repository_tree.
  const readPref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const readJson = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
  /** « #rrggbb » → [r, g, b] (0–255). */
  const hexRgb = h => { const x = String(h || "").replace("#", ""), v = x.length === 3 ? x.split("").map(ch => ch + ch).join("") : x; return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) || 0); };
  /** Luminance relative WCAG d'une couleur « #rrggbb ». */
  const luminance = h => { const [r, g, b] = hexRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  /** Rapport de contraste WCAG entre deux couleurs (1 à 21). */
  const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  /** Couleur HSL (degrés, %, %) → « #rrggbb ». */
  const hslHex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return "#" + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); };
  /** Couleurs calculées d'une famille (fam : { h, s }) au ton tone (0 = sombre, 100 = clair) pour un fond de page page. */
  function familyColors(fam, tone, page) {
    const L = 12 + Math.max(0, Math.min(100, +tone || 0)) * .42, bar = hslHex(fam.h, fam.s, L),
      barText = contrast("#ffffff", bar) >= contrast("#0b0f14", bar) ? "#ffffff" : "#0b0f14", dark = luminance(page || "#ffffff") < .3;
    let a = dark ? Math.max(60, L + 20) : L, accent = hslHex(fam.h, Math.max(fam.s, dark ? 50 : 0), a);
    for (let i = 0; i < 40 && contrast(accent, page || "#ffffff") < 4.5; i++) { a += dark ? 2 : -2; accent = hslHex(fam.h, Math.max(fam.s, dark ? 50 : 0), Math.max(3, Math.min(97, a))); }
    return { bar, barText, accent };
  }
  /** Couleurs effectives d'un thème : réglage de Paramétrage › Apparence (famille + ton) s'il existe, sinon repository_tree. */
  function themeColors(name) {
    const t = cfg.themes[name] || {}, o = (readJson("repositoryColors") || {})[name], fam = o && cfg.colorFamilies?.[o.family];
    return fam ? { ...t, ...familyColors(fam, o.tone, t.page), family: o.family, tone: +o.tone } : { ...t };
  }
  // ---- Accès au Centre (CPCO : apps/cpco) : activé dans Paramètres › Centre (CPCO) par un mot de passe, gardé dans ce
  // navigateur (cpcoAccess:v1). Verrou d'usage, pas une sécurité : les pages restent des fichiers lisibles. Centre
  // verrouillé : pages du Centre absentes du menu, de la barre latérale et de l'accueil (html[data-cpco="off"]),
  // page du Centre ouverte directement recouverte d'un avis ; réglages du Centre verrouillés dans Paramètres.
  const CPCO_KEY = "cpcoAccess:v1", CPCO_HASH = "1310afbbafc4f1eb714648fb094b876f453356b9c84958057a783fb478474993";
  const cpcoOn = () => readPref(CPCO_KEY, "") === "on", isCpco = p => String(p || "").startsWith("apps/cpco/");
  doc.dataset.cpco = cpcoOn() ? "on" : "off";
  const cpco = {
    enabled: cpcoOn,
    /** Active le Centre si le mot de passe est bon ; true si activé. */
    async unlock(password) {
      const bytes = new TextEncoder().encode(String(password || "").trim().toUpperCase());
      const hex = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(b => b.toString(16).padStart(2, "0")).join("");
      if (hex !== CPCO_HASH) return false;
      try { localStorage.setItem(CPCO_KEY, "on"); } catch { return false; }
      doc.dataset.cpco = "on";
      window.dispatchEvent(new CustomEvent("cpco-access-change", { detail: { enabled: true } }));
      return true;
    },
    lock() {
      try { localStorage.removeItem(CPCO_KEY); } catch { /* stockage indisponible */ }
      doc.dataset.cpco = "off";
      window.dispatchEvent(new CustomEvent("cpco-access-change", { detail: { enabled: false } }));
    }
  };
  if (isCpco(page?.path || rel) && !cpcoOn()) {
    const lockNotice = () => {
      const box = document.createElement("div");
      box.className = "cpco-lock";
      box.setAttribute("role", "alert");
      box.innerHTML = `<div><b>Centre de planification et de conduite des opérations</b><p>Accès réservé. Le Centre s'active dans Paramètres › Centre (CPCO).</p><a href="${new URL("apps/settings/parametrage.html?base=cpco", root).href}">Activer le Centre…</a> · <a href="${new URL("index.html", root).href}">Accueil</a></div>`;
      document.body.append(box);
    };
    if (document.body) lockNotice(); else document.addEventListener("DOMContentLoaded", lockNotice);
  }
  /** Filtres SVG des icônes skeuomorphes du Centre (designs_skeuo.css) : fond sombre teinté (bois → merisier, peinture →
   *  rouge) ou glyphe clair doré (aviation) ou bulle bleu nuit (gel), selon la luminance : le laiton et le glyphe restent intacts. */
  function cpcoIconFilters() {
    if (!document.body) { document.addEventListener("DOMContentLoaded", cpcoIconFilters, { once: true }); return; }
    if (document.getElementById("cpcoIconFilters")) return;
    const tint = (id, matrix, slope, intercept, glyph) => `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="${matrix} 0 0 0 1 0" result="t"/><feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="l"/><feComponentTransfer in="l" result="m"><feFuncA type="linear" slope="${slope}" intercept="${intercept}"/></feComponentTransfer>${glyph ? '<feComposite in="t" in2="m" operator="in" result="g"/><feComposite in="g" in2="SourceGraphic" operator="over"/>' : '<feComposite in="SourceGraphic" in2="m" operator="in" result="k"/><feComposite in="k" in2="t" operator="over"/>'}</filter>`;
    document.body.insertAdjacentHTML("beforeend", `<svg id="cpcoIconFilters" width="0" height="0" style="position:absolute" aria-hidden="true">${
      tint("cpco-ico-cherry", "1.25 .2 0 0 0  0 .42 0 0 0  0 0 .5 0 0 ", 4, -1.2) +
      tint("cpco-ico-red", ".62 .62 .62 0 0  0 .36 0 0 0  0 0 .32 0 0 ", 4, -1.6) +
      tint("cpco-ico-gold", "1 0 0 0 0  0 .84 0 0 0  0 0 .36 0 0 ", 5, -3.5, true) +
      tint("cpco-ico-navy", ".32 0 0 0 0  0 .36 0 0 0  0 0 .62 0 0 ", 12, -10.6)}</svg>`);
  }
  let currentTheme = themeName;
  // Graphiques : palette et style, au choix (Apparence › Graphiques : préférences repositoryChartPalette et
  // repositoryChartStyle) ou automatiques selon le design. Palettes : « vivid » (couleurs d'origine des pages), « brass »
  // (laiton, beige, bleu acier, cuivre, lie-de-vin, sauge, taupe : auto en Cabinet et Carnet de vol), « khaki » (kaki,
  // olive, moutarde, rouille, gris-vert, ardoise : auto en Durci), « slate » (bleus et gris d'ardoise sourds). Toute
  // couleur vive (familles, séries, statuts) est ramenée à la palette : la teinte d'origine choisit l'entrée (10 secteurs
  // de teinte + gris), deux couleurs distinctes le restent ; la clarté d'origine module un peu la clarté.
  // Styles : « flat » (aplats) ou « relief » (barres cylindriques, anneaux ombrés, rainures : auto dans les designs à
  // matières) ; posés sur <html data-chart-style / data-chart-palette>.
  const CHART = {
    slate: { grey: "#9aa4b0", hues: [[20, "#b07c7c"], [45, "#b8987a"], [70, "#c2b27e"], [100, "#9fb08a"], [160, "#7fa597"], [195, "#78a4b4"], [225, "#7d9cc4"], [255, "#8b93c4"], [300, "#9d93b8"], [345, "#b08fa2"], [360, "#b07c7c"]] },
    brass: { grey: "#b8ad98", hues: [[20, "#b0645a"], [45, "#b87d4b"], [70, "#c9a24a"], [100, "#a39f6a"], [160, "#839c78"], [195, "#6f9a95"], [225, "#7f9cc0"], [255, "#8e9cc9"], [300, "#8e8a9e"], [345, "#9c8a78"], [360, "#b0645a"]] },   // violet → gris mauve, rose → taupe (jamais de rose vif)
    field: { grey: "#a3a38f", hues: [[20, "#a8674a"], [45, "#b8894a"], [70, "#c9b060"], [100, "#9aa35a"], [160, "#74995a"], [195, "#7f9a8a"], [225, "#8e9ea8"], [255, "#7c8796"], [300, "#9b9084"], [345, "#9c8a6a"], [360, "#a8674a"]] }
  };
  CHART.khaki = CHART.field;
  delete CHART.field;
  const CHART_AUTO = { cabinet: "brass", flightlog: "brass", field: "khaki" }, RELIEF_AUTO = ["cabinet", "flightlog", "field", "aqua"];
  /** Palette et style effectifs des graphiques (préférences, sinon selon le design) → <html data-chart-*>. */
  function applyChart() {
    const d = doc.dataset.design, p = readPref("repositoryChartPalette", "auto"), st = readPref("repositoryChartStyle", "auto");
    doc.dataset.chartPalette = p !== "auto" && (CHART[p] || p === "vivid") ? p : CHART_AUTO[d] || "vivid";
    doc.dataset.chartStyle = st === "flat" || st === "relief" ? st : RELIEF_AUTO.includes(d) ? "relief" : "flat";
  }
  /** Couleur de graphique (« #rgb », « #rrggbb » ou « rgb(…) ») accordée au design courant. */
  function chartColor(c) {
    const set = CHART[doc.dataset.chartPalette];
    if (!set || typeof c !== "string") return c;
    const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i) || c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
    if (!m) return c;
    const [r, g, b] = (m.length === 2 ? hexRgb("#" + m[1]) : [m[1], m[2], m[3]].map(Number)).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0, h = !d ? 0 : (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
    const base = s < .18 ? set.grey : set.hues.find(([lim]) => h < lim)[1];
    // clarté : ±12 % autour de la couleur de la famille selon la clarté d'origine (repère 0,6)
    const k = Math.max(-.12, Math.min(.12, (l - .6) * .5)), rgb = hexRgb(base).map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
    return "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("");
  }
  /** Pose les variables CSS du thème name (couleurs effectives). */
  function applyTheme(name) {
    const t = themeColors(name);
    currentTheme = name;
    doc.dataset.appTheme = name;   // thème sur <html> : réglages propres à un thème (icônes skeuomorphes du Centre)
    cpcoIconFilters();
    for (const [k, v] of Object.entries({
        "--repo-bar": t.bar || "#101319",
        "--repo-bar-text": t.barText || "#fff",
        "--repo-page": t.page || "#fff",
        "--repo-accent": t.accent || "#69a7ff",
        "--accent": t.accent || "#69a7ff"
      })) doc.style.setProperty(k, v);
    if (document.body) document.body.style.backgroundColor = t.page || "";
    // ton de la page (fond clair ou sombre) : variantes des designs à matières (Cabinet « carte de nuit »)
    doc.dataset.tone = luminance(t.page || "#ffffff") < .3 ? "dark" : "light";
    applyAqua(t.accent);
  }
  // Couleur du design Aqua (gel des boutons, bulles des icônes) : une teinte de base commune à toutes les pages
  // (préférence repositoryAquaColor : bleu par défaut, ou une autre teinte, ou « app » : accent du thème de la page).
  // Les icônes Gel (peintes en bleu, teinte 214°) suivent par rotation de teinte, sauf les icônes d'état.
  const AQUA = { blue: [214, 72], teal: [186, 70], green: [145, 52], graphite: [212, 12], purple: [268, 52], orange: [24, 82], red: [356, 66], pink: [328, 60] };
  /** « #rrggbb » → [teinte (degrés), saturation (%)]. */
  const hueSat = hex => { const [r, g, b] = hexRgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (!d) return [214, 0]; const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [Math.round(h * 60), Math.round(d / (1 - Math.abs(2 * l - 1)) * 100)]; };
  function applyAqua(accent) {
    const v = readPref("repositoryAquaColor", "blue");
    const [h, s] = v === "app" ? hueSat(accent || "#2f7de1") : AQUA[v] || AQUA.blue;
    // clarté abaissée jusqu'à un contraste WCAG de 4,5:1 avec le texte blanc des boutons
    let l = 52, c = hslHex(h, s, l);
    while (contrast("#ffffff", c) < 4.5 && l > 20) c = hslHex(h, s, l -= 2);
    doc.style.setProperty("--aq-gel", c);
    doc.style.setProperty("--aq-shift", `${h - 214}deg`);
    doc.style.setProperty("--aq-sat", Math.min(1.3, s / 72).toFixed(2));
  }
  applyTheme(themeName);
  // barre latérale (on / off), posée dès le chargement ; jeu d'icônes : après le design (défaut propre au design)
  { const sn = readPref("repositorySidenav", null); if (sn === "auto") delete doc.dataset.sidenav; else doc.dataset.sidenav = sn || "on"; }   // barre latérale affichée par défaut ; « auto » : selon le design
  // Design graphique (REPOSITORY_TREE.designs, règles dans designs.css) : choix mémorisé (repositoryDesign),
  // posé dès le chargement sur <html data-design> pour éviter un changement visible.
  const designs = cfg.designs?.list || {
      standard: {
        label: ["Standard"]
      }
    },
    savedDesign = readPref("repositoryDesign", null);
  let design = designs[savedDesign] ? savedDesign : (designs[cfg.designs?.default] ? cfg.designs.default : "standard");
  doc.dataset.design = design;
  applyChart();
  // jeu d'icônes (line : trait normal, fine, bold ; brass, steel, gel : jeux skeuomorphes Laiton, Acier, Gel ; off) :
  // choix mémorisé, sinon celui du design (designs.list[id].icons : brass pour Cabinet, steel pour Durci, gel pour
  // Aqua), sinon trait normal (ancien choix « matter » : remplacé par le jeu du design)
  const iconsFor = id => { const v = readPref("repositoryIcons", null); return (v && v !== "matter" ? v : null) || designs[id]?.icons || "line"; };
  doc.dataset.icons = iconsFor(design);
  {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("designs.css?v=20260929zv", script.src).href;
    css.id = "repoDesignsCss";
    document.head.append(css)
  }
  // Designs à matières (Cabinet, Durci, Aqua : textures, plaques, vis) : feuille propre (designs.list[id].css),
  // chargée seulement quand l'un d'eux est choisi, avec la même version que ce script.
  const designCss = id => {
    const f = designs[id]?.css;
    if (!f || document.querySelector(`link[data-design-css="${f}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.dataset.designCss = f;
    l.href = new URL(f + new URL(script.src).search, script.src).href;
    document.head.append(l);
    // illustrations du décor complet (frise de Cabinet, radar de Durci), même version
    const d = document.createElement("script");
    d.src = new URL("design_deco.js" + new URL(script.src).search, script.src).href;
    document.head.append(d);
  };
  designCss(design);
  // Décor des designs à matières : « full » (vis, filigranes, poignées, radar) ou « sober » (matières et plaques
  // seulement) ; préférence repositoryDecor, sinon réglage de la page / du dossier (decor), sinon complet.
  const decorDefault = page?.decor || folderSettings.decor || "full";
  doc.dataset.decor = readPref("repositoryDecor", null) || decorDefault;
  if (favicon) {
    let f = document.querySelector('link[rel~="icon"]');
    if (!f) {
      f = document.createElement("link");
      f.rel = "icon";
      document.head.append(f)
    }
    f.href = new URL(favicon, root).href
  }
  // Langue : choix mémorisé (repositoryLanguageMode) ou langue du navigateur.
  const supported = ["fr", "en", "de", "es"],
    saved = localStorage.getItem("repositoryLanguageMode"),
    /** Langue du navigateur ramenée aux langues de la suite (fr / en / de / es) ; en par défaut. */
    detected = () => {
      const x = (navigator.languages?.[0] || navigator.language || "en").slice(0, 2).toLowerCase();
      return supported.includes(x) ? x : "en"
    };
  let mode = supported.includes(saved) ? saved : "auto",
    language = mode === "auto" ? detected() : mode;
  // En-tête de la page : première ligne (.header-row) complétée par les outils (langue, ☰).
  const header = document.querySelector("body>header");
  if (!header) return;
  header.classList.add("repo-header");
  let line = header.querySelector(":scope>.header-row");
  if (!line) {
    line = document.createElement("div");
    line.className = "repo-header-line1";
    const title = header.querySelector(":scope>h1");
    if (title) line.append(title);
    header.prepend(line)
  }
  line.classList.add("repo-header-line1");
  // Emblème d'en-tête (designs.list[id].emblem : rose des vents, ailes…) : emplacement posé ici, dessin par
  // renderEmblem() dès que le registre d'icônes est chargé (side_nav.js) et à chaque changement de design.
  const emblem = document.createElement("span");
  emblem.className = "repo-header-emblem";
  emblem.setAttribute("aria-hidden", "true");
  line.prepend(emblem);
  const renderEmblem = () => {
    const name = designs[design]?.emblem;
    emblem.hidden = !name;
    emblem.innerHTML = name ? window.RepositoryIcons?.emblem?.(name) || "" : "";
  };
  renderEmblem();
  ["#languagePopup", "#languageLabel", "#languageCurrent"].forEach(s => {
    const el = header.querySelector(s),
      box = el?.closest(".control");
    if (box) box.hidden = true;
    else if (el) el.hidden = true
  });
  const spacer = document.createElement("span");
  spacer.className = "repo-header-spacer";
  line.append(spacer);
  const tools = document.createElement("div");
  tools.className = "repo-header-tools";
  tools.innerHTML = '<span class="repo-language-label">Language</span><div class="repo-language-popup"><button class="repo-language-button" type="button" aria-haspopup="menu" aria-expanded="false" title="Language"><span class="repo-language-flag"></span><span class="repo-caret">▼</span></button><div class="repo-language-menu" role="menu" hidden></div></div><div class="repo-menu-wrap"><button class="repo-menu-button" type="button" aria-label="Menu" aria-expanded="false">☰</button><div class="repo-menu" hidden></div></div>';
  line.append(tools);
  const names = {
      auto: "Auto",
      en: "English",
      fr: "Français",
      de: "Deutsch",
      es: "Español"
    },
    labels = {
      fr: "Langue",
      en: "Language",
      de: "Sprache",
      es: "Idioma"
    },
    languageButton = tools.querySelector(".repo-language-button"),
    languageMenu = tools.querySelector(".repo-language-menu"),
    menuButton = tools.querySelector(".repo-menu-button"),
    menu = tools.querySelector(".repo-menu");
  /** Drapeau SVG (HTML) d'une langue, pour le sélecteur de langue. */
  const flagSvg = code => ({
    en: '<svg viewBox="0 0 60 36"><rect width="60" height="36" fill="#012169"/><path d="M0 0L60 36M60 0L0 36" stroke="#fff" stroke-width="8"/><path d="M0 0L60 36M60 0L0 36" stroke="#C8102E" stroke-width="4"/><path d="M30 0V36M0 18H60" stroke="#fff" stroke-width="12"/><path d="M30 0V36M0 18H60" stroke="#C8102E" stroke-width="7"/></svg>',
    fr: '<svg viewBox="0 0 60 36"><rect width="20" height="36" fill="#0055A4"/><rect x="20" width="20" height="36" fill="#fff"/><rect x="40" width="20" height="36" fill="#EF4135"/></svg>',
    de: '<svg viewBox="0 0 60 36"><rect width="60" height="12" fill="#000"/><rect y="12" width="60" height="12" fill="#DD0000"/><rect y="24" width="60" height="12" fill="#FFCE00"/></svg>',
    es: '<svg viewBox="0 0 60 36"><rect width="60" height="9" fill="#AA151B"/><rect y="9" width="60" height="18" fill="#F1BF00"/><rect y="27" width="60" height="9" fill="#AA151B"/><rect x="17" y="14" width="4" height="8" rx="1" fill="#AA151B" opacity=".85"/></svg>'
  } [code] || "");
  languageMenu.innerHTML = ["auto", ...supported].map(x => {
    const resolved = x === "auto" ? detected() : x,
      label = x === "auto" ? `Auto → ${names[resolved]}` : names[x];
    return `<button type="button" role="menuitem" data-lang="${x}">${flagSvg(resolved)}<span>${label}</span></button>`
  }).join("");
  // Menu ☰ : pages groupées par dossier, actions propres à la page (.repo-page-actions).
  // Libellés du menu dans la langue courante (table labels de repository_tree), refaits au changement de langue.
  const trLabel = l => {
    const r = cfg.labels?.[l];
    return r ? (r[["fr", "en", "de", "es"].indexOf(language)] || l) : l
  };
  const groups = new Map(); /* menu:false : page déclarée (thème, réglages) mais absente du menu */
  // pages du Centre toujours construites, masquées tant que le Centre est verrouillé (html[data-cpco="off"] .cpco-only) :
  // l'activation dans Paramètres les montre aussitôt, sans recharger
  cfg.pages.filter(p => p.menu !== false).forEach(p => {
    const bits = (p.menu || p.label).split("/"),
      group = bits.length > 1 ? bits.shift() : "Pages",
      label = bits.join("/") || p.label;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({
      ...p,
      navLabel: label
    })
  });
  for (const [group, pages] of groups) {
    let host = menu;
    if (group !== "Pages") {
      const details = document.createElement("details");
      details.className = "repo-tree-group";
      details.open = pages.some(p => p.path === page?.path);
      details.innerHTML = `<summary>${esc(group)}</summary>`;
      if (pages.every(p => isCpco(p.path))) details.classList.add("cpco-only");
      menu.append(details);
      host = details
    }
    for (const p of pages) {
      const a = document.createElement("a");
      a.href = new URL(p.path, root).href;
      a.className = `repo-link ${p.path===page?.path?"active":""} ${group!=="Pages"?"repo-sub":""}${isCpco(p.path)?" cpco-only":""}`;
      a.dataset.label = p.navLabel;
      a.textContent = trLabel(p.navLabel);
      host.append(a)
    }
  }
  // Apparence : page apps/settings/apparence.html (design, icônes, barre latérale, couleurs) ; le menu ☰ et la barre latérale y mènent.
  // Réglages en tête du menu, en boutons : Apparence (design, icônes, couleurs) et Paramètres (bases de données).
  menu.insertAdjacentHTML("afterbegin", '<div class="repo-settings-row"><a class="repo-settings-button repo-appearance-link" data-label="Apparence"></a><a class="repo-settings-button repo-parametrage-link" data-label="Paramètres"></a></div>');
  menu.querySelector(".repo-appearance-link").href = new URL("apps/settings/apparence.html", root).href;
  menu.querySelector(".repo-appearance-link").addEventListener("click", e => { if (openAppearance()) { e.preventDefault(); close(); } });
  menu.querySelector(".repo-parametrage-link").href = new URL("apps/settings/parametrage.html", root).href;
  // Maintenance (mises à jour, sources et dossiers, SIA, sauvegarde) : rubrique de Paramètres (parametrage.html?m=…)
  menu.insertAdjacentHTML("beforeend", '<div class="repo-page-actions"></div>');
  /** Enregistre et applique le design id (événement « repository-design-change »). */
  const setDesign = id => {
    if (!designs[id]) return;
    design = id;
    doc.dataset.design = id;
    doc.dataset.icons = iconsFor(id);
    designCss(id);
    renderEmblem();
    try { localStorage.setItem("repositoryDesign", id); } catch {}
    applyChart();
    window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { design: id } }));
  };
  /** Apparence en fenêtre modale au-dessus de la page courante (réglages appliqués en direct ; fermeture : bouton,
   *  Échap ou clic hors de la fenêtre, on reste sur la page) ; interface de shared/appearance_page.js, chargé à la
   *  demande. Sur la page Apparence elle-même : rien (false, le lien s'ouvre normalement). */
  let apDialog = null;
  function openAppearance() {
    if (document.getElementById("appearancePage")) return false;
    if (!apDialog) {
      apDialog = document.createElement("dialog");
      apDialog.className = "repo-ap-dialog";
      apDialog.setAttribute("data-no-i18n", "");
      // en-tête et blocs du framework (habillés par le design courant comme ceux de la page)
      apDialog.innerHTML = '<div class="repo-ap-head repo-header"><div class="repo-header-line1"><h1></h1><span class="repo-header-spacer"></span><button type="button" class="repo-ap-close repo-plain" aria-label="Fermer">✕</button></div></div><main class="ap-page"></main>';
      document.body.append(apDialog);
      apDialog.querySelector(".repo-ap-close").onclick = () => apDialog.close();
      apDialog.addEventListener("click", e => { if (e.target === apDialog) apDialog.close(); });
      apDialog.addEventListener("close", () => window.RepositoryAppearance?.close());
    }
    apDialog.querySelector(".repo-ap-head h1").textContent = trLabel("Apparence");
    const host = apDialog.querySelector("main");
    const show = () => { window.RepositoryAppearance.mount(host); window.AppFramework?.refresh?.(host); if (!apDialog.open) apDialog.showModal(); };
    if (window.RepositoryAppearance) show();
    else {
      const sc = document.createElement("script");
      sc.src = new URL("appearance_page.js" + new URL(script.src).search, script.src).href;
      sc.onload = show;
      document.head.append(sc);
    }
    return true;
  }
  /** Ferme le menu ☰ et le menu des langues. */
  const close = () => {
    menu.hidden = true;
    languageMenu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    languageButton.setAttribute("aria-expanded", "false")
  };
  menuButton.onclick = e => {
    e.stopPropagation();
    const open = menu.hidden;
    close();
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open))
  };
  languageButton.onclick = e => {
    e.stopPropagation();
    const open = languageMenu.hidden;
    close();
    languageMenu.hidden = !open;
    languageButton.setAttribute("aria-expanded", String(open))
  };
  document.addEventListener("click", e => {
    if (!tools.contains(e.target)) close()
  });

  /** Applique la langue (mode choisi ou navigateur) : attribut lang, libellés du menu et des actions de page (data-label), drapeau ; émet « repository-language-change » (detail : language, mode) pour que les pages se traduisent. */
  function applyLanguage() {
    language = mode === "auto" ? detected() : mode;
    doc.lang = language;
    menu.querySelectorAll("[data-label]").forEach(a => {
      a.textContent = trLabel(a.dataset.label)
    });
    menu.querySelectorAll("[data-i18n-label]").forEach(b => {
      const r = JSON.parse(b.dataset.i18nLabel);
      b.textContent = r[["fr", "en", "de", "es"].indexOf(language)] || r[0]
    });
    tools.querySelector(".repo-language-label").textContent = labels[language];
    tools.querySelector(".repo-language-flag").innerHTML = flagSvg(language);
    languageButton.title = names[language];
    window.dispatchEvent(new CustomEvent("repository-language-change", {
      detail: {
        language,
        mode
      }
    }))
  }
  languageMenu.onclick = e => {
    const value = e.target.closest("button")?.dataset.lang;
    if (!value) return;
    mode = value;
    localStorage.setItem("repositoryLanguageMode", mode);
    applyLanguage();
    close()
  };
  document.body.style.backgroundColor = theme.page || "";
  /** Adresse d'une source externe : réglage local (suiteSources:v1, Paramètres › Maintenance) sinon repository_tree.sources. */
  const source = key => { let o = {}; try { o = JSON.parse(localStorage.getItem("suiteSources:v1") || "{}") || {}; } catch {} return String(o[key] || cfg.sources?.[key]?.url || "").replace(/\/+$/, ""); };
  // API publique.
  window.RepositoryNav = {
    cpco,
    source,
    /** Enregistre (ou efface, valeur vide) la surcharge locale d'une source ; événement « suite-sources-change ». */
    setSource(key, value) { let o = {}; try { o = JSON.parse(localStorage.getItem("suiteSources:v1") || "{}") || {}; } catch {} const v = String(value || "").trim(); v && v !== cfg.sources?.[key]?.url ? o[key] = v : delete o[key]; try { Object.keys(o).length ? localStorage.setItem("suiteSources:v1", JSON.stringify(o)) : localStorage.removeItem("suiteSources:v1"); } catch {} window.dispatchEvent(new CustomEvent("suite-sources-change", { detail: { key } })); },
    trLabel: l => trLabel(l),
    root,
    page,
    menu,
    settings: {
      theme: themeName,
      favicon,
      config,
      files,
      folder: folderPath.join("/")
    },
    getLanguage: () => language,
    getLanguageMode: () => mode,
    /** Design graphique courant (clé de REPOSITORY_TREE.designs.list). */
    getDesign: () => design,
    /** Couleur de graphique accordée au design courant (familles de couleurs des designs à matières). */
    chartColor,
    /** Apparence (Paramétrage › Apparence) : lecture et réglage du design, des icônes, de la barre latérale et des
     *  couleurs des thèmes ; outils de couleur (contraste WCAG, familles). Chaque réglage est mémorisé et appliqué. */
    appearance: {
      designs,
      families: cfg.colorFamilies || {},
      themes: cfg.themes,
      current: () => ({ design, icons: doc.dataset.icons || "line", iconsSaved: readPref("repositoryIcons", null), sidenav: doc.dataset.sidenav || "", decor: doc.dataset.decor, decorSaved: readPref("repositoryDecor", null), colors: readJson("repositoryColors") || {}, theme: currentTheme }),
      /** Couleur du design Aqua : clé de AQUA ("blue" par défaut, "teal", "green", "graphite", "purple", "orange",
       *  "red", "pink") ou "app" (accent du thème de chaque page) ; null : défaut. */
      /** Graphiques : palettes ("auto", "vivid", "brass", "khaki", "slate") et styles ("auto", "flat", "relief"). */
      chartPalettes: ["auto", "vivid", ...Object.keys(CHART)],
      chartStyles: ["auto", "flat", "relief"],
      chart: () => ({ palette: readPref("repositoryChartPalette", "auto"), style: readPref("repositoryChartStyle", "auto"), effective: { palette: doc.dataset.chartPalette, style: doc.dataset.chartStyle } }),
      /** Échantillon de palette : couleurs d'une série type (familles des CR) dans la palette p. */
      chartSample(p) { const keep = doc.dataset.chartPalette; doc.dataset.chartPalette = p; const out = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#94a3b8"].map(chartColor); doc.dataset.chartPalette = keep; return out; },
      setChart(kind, v) { const k = kind === "style" ? "repositoryChartStyle" : "repositoryChartPalette"; try { v && v !== "auto" ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} applyChart(); window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { chart: kind } })); },
      aquaColors: Object.keys(AQUA),
      aquaColor: () => readPref("repositoryAquaColor", "blue"),
      aquaSample: k => { const [h, s] = AQUA[k] || AQUA.blue; return hslHex(h, s, 48); },
      setAqua(v) { try { v && v !== "blue" ? localStorage.setItem("repositoryAquaColor", v) : localStorage.removeItem("repositoryAquaColor"); } catch {} applyAqua(themeColors(currentTheme).accent); window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { aqua: v || "blue" } })); },
      /** Décor des designs à matières : "full", "sober", ou null (réglage de chaque page). */
      setDecor(v) { try { v ? localStorage.setItem("repositoryDecor", v) : localStorage.removeItem("repositoryDecor"); } catch {} doc.dataset.decor = v || decorDefault; window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { decor: doc.dataset.decor } })); },
      renderEmblem,
      setDesign,
      /** Jeu d'icônes : "line" (défaut), "fine", "bold", "brass" (laiton), "steel" (acier), "gel", "avio" (avionique), "off" ; null : jeu du design. */
      setIcons(v) { if (!v) { try { localStorage.removeItem("repositoryIcons"); } catch {} doc.dataset.icons = iconsFor(design); window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { icons: doc.dataset.icons } })); return; } doc.dataset.icons = v; try { localStorage.setItem("repositoryIcons", v); } catch {} window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { icons: v } })); },
      /** Barre latérale : true, false, ou null (selon le design). */
      // barre latérale : true / false (toujours / jamais), null (selon le design, mémorisé « auto »), "default" (réglage par défaut : toujours)
      setSidenav(on) { if (on === "default") { doc.dataset.sidenav = "on"; try { localStorage.removeItem("repositorySidenav"); } catch {} } else if (on == null) { delete doc.dataset.sidenav; try { localStorage.setItem("repositorySidenav", "auto"); } catch {} } else { doc.dataset.sidenav = on ? "on" : "off"; try { localStorage.setItem("repositorySidenav", on ? "on" : "off"); } catch {} } },
      /** Couleurs du thème name : { family, tone } (famille de REPOSITORY_TREE.colorFamilies), ou null pour revenir à repository_tree. */
      setColor(name, v) { const all = readJson("repositoryColors") || {}; v ? all[name] = { family: v.family, tone: +v.tone } : delete all[name]; try { Object.keys(all).length ? localStorage.setItem("repositoryColors", JSON.stringify(all)) : localStorage.removeItem("repositoryColors"); } catch {} if (name === currentTheme) applyTheme(name); window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { colors: name } })); },
      themeColors,
      familyColors,
      contrast,
      luminance
    },
    /** Ouvre l'Apparence en fenêtre modale (false sur la page Apparence elle-même). */
    openAppearance: () => openAppearance(),
    /** Ajoute une action de page au menu ☰ (groupe « Page ») : label = texte ou [fr, en, de, es] (retraduit au changement de langue), handler = fonction appelée au clic. Retourne le bouton. */
    addAction(label, handler) {
      const host = menu.querySelector(".repo-page-actions");
      if (!host.children.length) host.insertAdjacentHTML("beforeend", '<div class="repo-sep"></div><div class="repo-group">Page</div>');
      const b = document.createElement("button");
      b.type = "button";
      b.className = "repo-action";
      if (Array.isArray(label)) b.dataset.i18nLabel = JSON.stringify(label);
      b.textContent = Array.isArray(label) ? label[["fr", "en", "de", "es"].indexOf(language)] || label[0] : label;
      b.onclick = () => {
        close();
        handler(b)
      };
      host.append(b);
      return b
    },
    /** Applique un thème de repository_tree (couleurs de l'en-tête, variables CSS) ; sans effet si le thème est inconnu. */
    setTheme(name) {
      if (!cfg.themes[name]) return;
      applyTheme(name);
    }
  };
  applyLanguage();
  // ---- Barre latérale (design « console » ou préférence repositorySidenav) : construite ici, dès l'exécution, pour
  // paraître avec l'en-tête (styles dans repository_nav.css) ; les icônes, chargées ensuite, sont posées par
  // side_nav.js dans les emplacements réservés (span[data-sidenav-icon], taille fixe : pas de décalage).
  // Entrées : REPOSITORY_TREE.sidebar si présent, sinon la liste ci-dessous ; seules les pages déclarées sont retenues.
  {
    const items = cfg.sidebar || [
      { icon: "target", path: "apps/cpco/mission_editor.html", label: ["Missions", "Missions", "Missionen", "Misiones"] },
      { icon: "list", path: "apps/cpco/mission_registry.html", label: ["Registre", "Registry", "Register", "Registro"], title: ["Registre des missions générées", "Generated mission registry", "Register der erzeugten Missionen", "Registro de misiones generadas"] },
      { icon: "calendar", path: "apps/cpco/odv_planning.html", label: ["ODV", "ODV", "ODV", "ODV"], title: ["Planning ODV (Centre) : créneaux communs, missions probables", "ODV planning (Centre)", "ODV-Planung (Zentrum)", "Planificación ODV (Centro)"] },
      { icon: "map", path: "apps/cpco/map_parser.html", label: ["Studio", "Studio", "Studio", "Estudio"], title: ["Studio cartographique du Centre", "Centre map studio", "Kartenstudio des Zentrums", "Estudio cartográfico del Centro"] },
      { icon: "clipboard", path: "apps/cr/mission_cr.html", match: "apps/cr/", label: ["CR DEFA", "DEFA report", "DEFA-Bericht", "Informe DEFA"] },
      { icon: "chart", path: "apps/cr/mission_operations_reporting.html", match: "_reporting.html", label: ["Reporting", "Reporting", "Berichte", "Informes"] },
      { icon: "fuel", path: "apps/planner/flight_performance_planner.html", label: ["Carburant", "Fuel", "Kraftstoff", "Combustible"] },
      { icon: "map", path: "apps/planner/map_planner.html", label: ["Cartes", "Maps", "Karten", "Mapas"], title: ["Cartes de vol : route, topo, approche, rendez-vous, destination", "Flight maps: route, topo, approach, rendezvous, destination", "Flugkarten", "Mapas de vuelo"] },
      { icon: "plane", path: "apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html", label: ["Atterrissages", "Landings", "Landungen", "Aterrizajes"] },
      { sep: true, bottom: true },   // réglages : groupés en bas de la colonne
      { icon: "palette", path: "apps/settings/apparence.html", label: ["Apparence", "Appearance", "Darstellung", "Apariencia"] },
      { icon: "settings", path: "apps/settings/parametrage.html", label: ["Paramètres", "Settings", "Einstellungen", "Ajustes"] },
      { icon: "help", menu: true, label: ["Menu", "Menu", "Menü", "Menú"], title: ["Toutes les pages, profil, données locales, design", "All pages, profile, local data, design", "Alle Seiten, Profil, lokale Daten, Design", "Todas las páginas, perfil, datos locales, diseño"] }
    ];
    const known = new Set(cfg.pages.map(p => p.path)), current = page?.path || "";
    // entrée active : la page elle-même, sinon la première entrée dont « match » est contenu dans le chemin courant
    let active = items.findIndex(x => x.path === current);
    if (active < 0) active = items.findIndex(x => x.match && current.includes(x.match));
    const side = document.createElement("nav");
    side.className = "repo-sidenav no-print";
    side.setAttribute("aria-label", "Applications");
    side.setAttribute("data-no-i18n", "");
    // jeux d'icônes skeuomorphes (Laiton, Acier, Gel) : images posées tout de suite (<img>, téléchargées avec la
    // page), sans attendre le registre d'icônes ni block_icons.css ; les tracés arrivent ensuite (side_nav.js) et ne
    // servent que dans les jeux au trait
    const SKEUO = { brass: "cabinet", steel: "field", gel: "aqua", avio: "flightlog" }, ver = new URL(script.src).search;
    const skImg = name => { const d = SKEUO[doc.dataset.icons]; return d ? `<img class="repo-sidenav-img" src="${new URL(`icons/skeuo/${d}/${name}.webp${ver}`, script.src).href}" alt="">` : ""; };
    // haut de la barre : logo DEFA décliné selon le design (shared/icons/defa/<variante>.webp), lien vers le site de la
    // flotte DEFA Virtual (nouvel onglet : la page en cours reste ouverte)
    const LOGO = { cabinet: "cabinet", flightlog: "flightlog", field: "field", aqua: "aqua" };
    const logoSrc = () => new URL(`icons/defa/${LOGO[doc.dataset.design] || "flat"}.webp${ver}`, script.src).href;
    side.innerHTML = `<a class="repo-sidenav-brand" href="${source("defa") || "https://flotte.defa-virtual.fr"}/index.php" target="_blank" rel="noopener" title="DEFA Virtual — ${source("defa").replace(/^https?:\/\//, "")}"><img class="repo-sidenav-logo" src="${logoSrc()}" alt="DEFA Virtual"></a><ul></ul>`;
    const ul = side.querySelector("ul");
    items.forEach((it, i) => {
      const li = document.createElement("li");
      if (it.sep) { li.className = "repo-sidenav-sep" + (it.bottom ? " repo-sidenav-bottom" : ""); ul.append(li); return; }
      if (it.path && !known.has(it.path)) return;
      if (isCpco(it.path)) li.classList.add("cpco-only");   // masquée tant que le Centre est verrouillé
      const a = document.createElement(it.menu ? "button" : "a");
      a.className = "repo-sidenav-item" + (isCpco(it.path) ? " repo-sidenav-cpco" : "");
      if (it.menu) { a.type = "button"; a.onclick = e => { e.stopPropagation(); document.querySelector(".repo-menu-button")?.click(); }; }
      else a.href = new URL(it.path, root).href;
      if (it.path === "apps/settings/apparence.html") a.addEventListener("click", e => { if (openAppearance()) e.preventDefault(); });
      if (i === active) a.setAttribute("aria-current", "page");
      a.innerHTML = `<span class="repo-sidenav-ic" data-sidenav-icon="${esc(it.icon)}">${skImg(it.icon)}</span><span class="repo-sidenav-label"></span>`;
      a._it = it;
      li.append(a);
      ul.append(li);
    });
    document.body.prepend(side);
    const label = () => {
      const i = Math.max(0, supported.indexOf(language));
      side.querySelectorAll(".repo-sidenav-item").forEach(a => {
        a.querySelector(".repo-sidenav-label").textContent = a._it.label[i] || a._it.label[0];
        a.title = a._it.title?.[i] || a._it.title?.[0] || a._it.label[i] || a._it.label[0];
      });
    };
    label();
    window.addEventListener("repository-language-change", label);
    // changement de jeu d'icônes ou de design : images de la barre refaites
    window.addEventListener("repository-design-change", () => {
      side.querySelectorAll("[data-sidenav-icon]").forEach(sp => {
        sp.querySelector(".repo-sidenav-img")?.remove();
        sp.insertAdjacentHTML("afterbegin", skImg(sp.dataset.sidenavIcon));
      });
      const logo = side.querySelector(".repo-sidenav-logo");
      if (logo && logo.src !== logoSrc()) logo.src = logoSrc();
    });
    window.RepositorySideNav = { element: side, set: on => window.RepositoryNav.appearance.setSidenav(on) };
  }
  {
    /* Profil pilote (ID IVAO / VATSIM) commun à toutes les pages */
    const profile = document.createElement("script");
    profile.src = new URL("pilot_profile.js?v=20260929zv", script.src).href;
    document.head.append(profile); /* Dossiers autorisés et ouverture des fichiers dans le dossier paramétré */
    const files = document.createElement("script");
    files.src = new URL("file_access.js?v=20260929zv", script.src).href;
    document.head.append(files); /* Données locales du navigateur ⇄ fichier de sauvegarde */
    /* Icônes, sous-titres de blocs, sous-cartes, zones de dépôt, icônes de la barre latérale (ordre conservé) */
    for (const f of ["icons/repository_icons.js?v=20260929zv", "block_icons.js?v=20260929zv", "side_nav.js?v=20260929zv"]) {
      const sc = document.createElement("script");
      sc.src = new URL(f, script.src).href;
      sc.async = false;
      document.head.append(sc);
    }
    const store = document.createElement("script");
    store.src = new URL("browser_store.js?v=20260929zv", script.src).href;
    document.head.append(store); /* Canal et contrôle des mises à jour, pastilles « Mise à jour » / « AIRAC » de l'en-tête */
    const update = document.createElement("script");
    update.src = new URL("suite_update.js?v=20260929zv", script.src).href;
    document.head.append(update)
  }
  window.dispatchEvent(new CustomEvent("repository-nav-ready", {
    detail: window.RepositoryNav
  }));

  /** Échappe un texte pour HTML (& < > " '). */
  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    } [c]))
  }
})();
