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
  let currentTheme = themeName;
  /** Pose les variables CSS du thème name (couleurs effectives). */
  function applyTheme(name) {
    const t = themeColors(name);
    currentTheme = name;
    for (const [k, v] of Object.entries({
        "--repo-bar": t.bar || "#101319",
        "--repo-bar-text": t.barText || "#fff",
        "--repo-page": t.page || "#fff",
        "--repo-accent": t.accent || "#69a7ff",
        "--accent": t.accent || "#69a7ff"
      })) doc.style.setProperty(k, v);
    if (document.body) document.body.style.backgroundColor = t.page || "";
  }
  applyTheme(themeName);
  // jeu d'icônes (line : trait normal, fine, bold, off) et barre latérale (on / off), posés dès le chargement
  doc.dataset.icons = readPref("repositoryIcons", "line");
  { const sn = readPref("repositorySidenav", null); if (sn) doc.dataset.sidenav = sn; }
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
  {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("designs.css?v=20260926zzc", script.src).href;
    css.id = "repoDesignsCss";
    document.head.append(css)
  }
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
      menu.append(details);
      host = details
    }
    for (const p of pages) {
      const a = document.createElement("a");
      a.href = new URL(p.path, root).href;
      a.className = `repo-link ${p.path===page?.path?"active":""} ${group!=="Pages"?"repo-sub":""}`;
      a.dataset.label = p.navLabel;
      a.textContent = trLabel(p.navLabel);
      host.append(a)
    }
  }
  // Apparence : page CR DEFA/apparence.html (design, icônes, barre latérale, couleurs) ; le menu ☰ et Paramétrage y mènent.
  menu.insertAdjacentHTML("beforeend", '<div class="repo-page-actions"></div><div class="repo-sep"></div><a class="repo-link repo-appearance-link" data-label="Apparence…"></a>');
  menu.querySelector(".repo-appearance-link").href = new URL("CR DEFA/apparence.html", root).href;
  /** Enregistre et applique le design id (événement « repository-design-change »). */
  const setDesign = id => {
    if (!designs[id]) return;
    design = id;
    doc.dataset.design = id;
    try { localStorage.setItem("repositoryDesign", id); } catch {}
    window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { design: id } }));
  };
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
  // API publique.
  window.RepositoryNav = {
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
    /** Apparence (Paramétrage › Apparence) : lecture et réglage du design, des icônes, de la barre latérale et des
     *  couleurs des thèmes ; outils de couleur (contraste WCAG, familles). Chaque réglage est mémorisé et appliqué. */
    appearance: {
      designs,
      families: cfg.colorFamilies || {},
      themes: cfg.themes,
      current: () => ({ design, icons: doc.dataset.icons || "line", sidenav: doc.dataset.sidenav || "", colors: readJson("repositoryColors") || {}, theme: currentTheme }),
      setDesign,
      /** Jeu d'icônes : "line" (défaut), "fine", "bold", "off". */
      setIcons(v) { doc.dataset.icons = v; try { localStorage.setItem("repositoryIcons", v); } catch {} window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { icons: v } })); },
      /** Barre latérale : true, false, ou null (selon le design). */
      setSidenav(on) { if (on == null) { delete doc.dataset.sidenav; try { localStorage.removeItem("repositorySidenav"); } catch {} } else { doc.dataset.sidenav = on ? "on" : "off"; try { localStorage.setItem("repositorySidenav", on ? "on" : "off"); } catch {} } },
      /** Couleurs du thème name : { family, tone } (famille de REPOSITORY_TREE.colorFamilies), ou null pour revenir à repository_tree. */
      setColor(name, v) { const all = readJson("repositoryColors") || {}; v ? all[name] = { family: v.family, tone: +v.tone } : delete all[name]; try { Object.keys(all).length ? localStorage.setItem("repositoryColors", JSON.stringify(all)) : localStorage.removeItem("repositoryColors"); } catch {} if (name === currentTheme) applyTheme(name); window.dispatchEvent(new CustomEvent("repository-design-change", { detail: { colors: name } })); },
      themeColors,
      familyColors,
      contrast,
      luminance
    },
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
      { icon: "target", path: "SIA XML/mission_editor.html", label: ["Missions", "Missions", "Missionen", "Misiones"] },
      { icon: "map", path: "SIA XML/map_parser.html", label: ["Cartes", "Maps", "Karten", "Mapas"] },
      { icon: "clipboard", path: "CR DEFA/mission_cr.html", match: "CR DEFA/", label: ["CR DEFA", "DEFA report", "DEFA-Bericht", "Informe DEFA"] },
      { icon: "chart", path: "CR DEFA/mission_operations_reporting.html", match: "_reporting.html", label: ["Reporting", "Reporting", "Berichte", "Informes"] },
      { icon: "fuel", path: "flight_performance_planner.html", label: ["Carburant", "Fuel", "Kraftstoff", "Combustible"] },
      { icon: "plane", path: "LandingPerformanceDashboard/LandingPerformance_Dashboard_MultiCSV_i18n.html", label: ["Atterrissages", "Landings", "Landungen", "Aterrizajes"] },
      { sep: true },
      { icon: "settings", path: "CR DEFA/parametrage.html", label: ["Paramètres", "Settings", "Einstellungen", "Ajustes"] },
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
    side.innerHTML = '<div class="repo-sidenav-brand" aria-hidden="true"><span class="repo-sidenav-ic" data-sidenav-icon="map" data-size="30"></span></div><ul></ul>';
    const ul = side.querySelector("ul");
    items.forEach((it, i) => {
      const li = document.createElement("li");
      if (it.sep) { li.className = "repo-sidenav-sep"; ul.append(li); return; }
      if (it.path && !known.has(it.path)) return;
      const a = document.createElement(it.menu ? "button" : "a");
      a.className = "repo-sidenav-item";
      if (it.menu) { a.type = "button"; a.onclick = e => { e.stopPropagation(); document.querySelector(".repo-menu-button")?.click(); }; }
      else a.href = new URL(it.path, root).href;
      if (i === active) a.setAttribute("aria-current", "page");
      a.innerHTML = `<span class="repo-sidenav-ic" data-sidenav-icon="${esc(it.icon)}"></span><span class="repo-sidenav-label"></span>`;
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
    window.RepositorySideNav = { element: side, set: on => window.RepositoryNav.appearance.setSidenav(on) };
  }
  {
    /* Profil pilote (ID IVAO / VATSIM) commun à toutes les pages */
    const profile = document.createElement("script");
    profile.src = new URL("pilot_profile.js?v=20260926zzc", script.src).href;
    document.head.append(profile); /* Dossiers autorisés et ouverture des fichiers dans le dossier paramétré */
    const files = document.createElement("script");
    files.src = new URL("file_access.js?v=20260926zzc", script.src).href;
    document.head.append(files); /* Données locales du navigateur ⇄ fichier de sauvegarde */
    /* Icônes, sous-titres de blocs, sous-cartes, zones de dépôt, icônes de la barre latérale (ordre conservé) */
    for (const f of ["icons/repository_icons.js?v=20260926zzc", "block_icons.js?v=20260926zzc", "side_nav.js?v=20260926zzc"]) {
      const sc = document.createElement("script");
      sc.src = new URL(f, script.src).href;
      sc.async = false;
      document.head.append(sc);
    }
    const store = document.createElement("script");
    store.src = new URL("browser_store.js?v=20260926zzc", script.src).href;
    document.head.append(store)
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
