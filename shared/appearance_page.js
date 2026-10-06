// Page Apparence (apps/settings/apparence.html) : design, jeu d'icônes, barre latérale et couleurs des thèmes de la suite.
// Réglages mémorisés dans ce navigateur et appliqués à toutes les pages par repository_nav.js
// (RepositoryNav.appearance) ; ils ne comptent pas comme modifications à sauvegarder (browser_store.js).
// La page elle-même montre le résultat : design et icônes s'y appliquent aussitôt, et « Voir sur cette page »
// prête à la page les couleurs d'un thème.
// Couleurs : pour chaque thème de repository_tree, une FAMILLE (teinte et saturation : REPOSITORY_TREE.colorFamilies)
// et un TON (clarté), au lieu de valeurs absolues ; bandeau, texte du bandeau et accent en sont calculés, avec les
// rapports de contraste WCAG affichés (texte ≥ 4,5:1, éléments graphiques ≥ 3:1).
(() => {
  'use strict';
  const VER = new URL(document.currentScript?.src || location.href).search; // version des images (celle de ce script)
  const K = window.RepositoryKit; // utilitaires communs (shared/kit.js)
  const T = {
    sub: ['SO Group Virtual — design, icônes, barre latérale et couleurs, pour toutes les pages de la suite', 'SO Group Virtual — design, icons, side bar and colours, for every page of the suite', 'SO Group Virtual — Design, Symbole, Seitenleiste und Farben für alle Seiten der Suite', 'SO Group Virtual — diseño, iconos, barra lateral y colores, para todas las páginas'],
    design: ['Design', 'Design', 'Design', 'Diseño'],
    designSub: ['La forme des pages : arrondis, densité, titres, barre latérale. Cabinet, Durci et Aqua ajoutent leurs matières (cuir, bois, laiton, acier, verre) ; les couleurs d’information restent celles du thème.', 'The shape of the pages: corners, density, titles, side bar. Cabinet, Rugged and Aqua add their materials (leather, wood, brass, steel, glass); information colours stay those of the theme.', 'Die Form der Seiten: Ecken, Dichte, Titel, Seitenleiste. Kabinett, Robust und Aqua bringen eigene Materialien (Leder, Holz, Messing, Stahl, Glas); Informationsfarben bleiben die des Themas.', 'La forma de las páginas: esquinas, densidad, títulos, barra lateral. Gabinete, Robusto y Aqua añaden sus materiales (cuero, madera, latón, acero, vidrio); los colores de información siguen siendo los del tema.'],
    charts: ['Graphiques', 'Charts', 'Diagramme', 'Gráficos'],
    chartsSub: ['Palette de couleurs et style des graphiques (reportings, indicateurs) ; « Automatique » suit le design.', 'Colour palette and style of the charts (reports, indicators); “Automatic” follows the design.', 'Farbpalette und Stil der Diagramme (Berichte, Kennzahlen); „Automatisch“ folgt dem Design.', 'Paleta de colores y estilo de los gráficos (informes, indicadores); «Automático» sigue el diseño.'],
    chartStyle: ['Style', 'Style', 'Stil', 'Estilo'],
    chartStyleSet: {
      auto: ['Automatique', 'Automatic', 'Automatisch', 'Automático'],
      flat: ['Aplats', 'Flat', 'Flach', 'Plano'],
      relief: ['Relief', 'Relief', 'Relief', 'Relieve']
    },
    chartPalette: {
      auto: ['Automatique', 'Automatic', 'Automatisch', 'Automático'],
      vivid: ['Vives (couleurs des pages)', 'Vivid (page colours)', 'Kräftig (Seitenfarben)', 'Vivos (colores de las páginas)'],
      slate: ['Ardoise', 'Slate', 'Schiefer', 'Pizarra'],
      brass: ['Laiton et cuir', 'Brass and leather', 'Messing und Leder', 'Latón y cuero'],
      khaki: ['Kaki et olive', 'Khaki and olive', 'Khaki und Oliv', 'Caqui y oliva']
    },
    icons: ['Icônes', 'Icons', 'Symbole', 'Iconos'],
    iconsSub: ['Épaisseur du trait des icônes, ou pas d’icônes du tout.', 'Stroke width of the icons, or no icons at all.', 'Strichstärke der Symbole oder gar keine Symbole.', 'Grosor del trazo de los iconos, o ningún icono.'],
    iconSet: {
      auto: ['Selon le design', 'Depending on design', 'Je nach Design', 'Según el diseño'],
      fine: ['Trait fin', 'Thin stroke', 'Dünne Linie', 'Trazo fino'],
      line: ['Trait normal', 'Normal stroke', 'Normale Linie', 'Trazo normal'],
      bold: ['Trait épais', 'Bold stroke', 'Dicke Linie', 'Trazo grueso'],
      brass: ['Laiton (médaillons)', 'Brass (medallions)', 'Messing (Medaillons)', 'Latón (medallones)'],
      steel: ['Acier (plaques)', 'Steel (plates)', 'Stahl (Platten)', 'Acero (placas)'],
      gel: ['Gel (bulles)', 'Gel (bubbles)', 'Gel (Blasen)', 'Gel (burbujas)'],
      avio: ['Avionique (cadrans)', 'Avionics (dials)', 'Avionik (Instrumente)', 'Aviónica (instrumentos)'],
      off: ['Aucune icône', 'No icons', 'Keine Symbole', 'Sin iconos']
    },
    side: ['Barre latérale', 'Side bar', 'Seitenleiste', 'Barra lateral'],
    aqua: ['Couleur Aqua', 'Aqua colour', 'Aqua-Farbe', 'Color Aqua'],
    aquaSet: {
      blue: ['Bleu', 'Blue', 'Blau', 'Azul'],
      teal: ['Turquoise', 'Teal', 'Türkis', 'Turquesa'],
      green: ['Vert', 'Green', 'Grün', 'Verde'],
      graphite: ['Graphite', 'Graphite', 'Graphit', 'Grafito'],
      purple: ['Violet', 'Purple', 'Violett', 'Violeta'],
      orange: ['Orange', 'Orange', 'Orange', 'Naranja'],
      red: ['Rouge', 'Red', 'Rot', 'Rojo'],
      pink: ['Rose', 'Pink', 'Rosa', 'Rosa'],
      app: ['Couleur de chaque application', 'Colour of each application', 'Farbe jeder Anwendung', 'Color de cada aplicación']
    },
    aquaHelp: ['Boutons et icônes du design Aqua (icônes d’état : couleurs d’origine).', 'Buttons and icons of the Aqua design (status icons keep their colours).', 'Schaltflächen und Symbole des Aqua-Designs (Statussymbole behalten ihre Farben).', 'Botones e iconos del diseño Aqua (los iconos de estado conservan sus colores).'],
    decor: ['Décor (designs à matières)', 'Decoration (material designs)', 'Dekor (Material-Designs)', 'Decoración (diseños con materiales)'],
    decorSet: {
      full: ['Complet', 'Full', 'Vollständig', 'Completo'],
      sober: ['Sobre', 'Plain', 'Schlicht', 'Sobrio']
    },
    decorHelp: ['Complet (par défaut) : panneaux illustrés des blocs, feuilles de registre, vis, poignées, radar. Sobre : matières et plaques seulement, sur toutes les pages.', 'Full (default): illustrated block panels, register sheets, screws, handles, radar. Plain: materials and plates only, on every page.', 'Vollständig (Standard): illustrierte Blockfelder, Registerblätter, Schrauben, Griffe, Radar. Schlicht: nur Materialien und Schilder, auf allen Seiten.', 'Completo (por defecto): paneles ilustrados, hojas de registro, tornillos, asas, radar. Sobrio: solo materiales y placas, en todas las páginas.'],
    sideSet: {
      auto: ['Selon le design', 'Depending on design', 'Je nach Design', 'Según el diseño'],
      on: ['Toujours', 'Always', 'Immer', 'Siempre'],
      off: ['Jamais', 'Never', 'Nie', 'Nunca']
    },
    sideSize: ['Taille des icônes', 'Icon size', 'Symbolgröße', 'Tamaño de los iconos'],
    sideSizeSet: {
      s: ['Petite', 'Small', 'Klein', 'Pequeño'],
      m: ['Moyenne', 'Medium', 'Mittel', 'Mediano'],
      l: ['Grande', 'Large', 'Groß', 'Grande']
    },
    sideShow: ['Affichage', 'Display', 'Anzeige', 'Visualización'],
    sideShowSet: {
      both: ['Icône et libellé', 'Icon and label', 'Symbol und Beschriftung', 'Icono y etiqueta'],
      icon: ['Icône seule', 'Icon only', 'Nur Symbol', 'Solo icono'],
      label: ['Libellé seul', 'Label only', 'Nur Beschriftung', 'Solo etiqueta']
    },
    colors: ['Couleurs des thèmes', 'Theme colours', 'Themenfarben', 'Colores de los temas'],
    colorsSub: ['Pour chaque thème : une famille de couleurs et un ton. Bandeau, texte et accent en sont calculés ; les contrastes WCAG sont vérifiés en direct.', 'For each theme: a colour family and a tone. Bar, text and accent are derived from them; WCAG contrast is checked live.', 'Je Thema: eine Farbfamilie und ein Ton. Leiste, Text und Akzent werden daraus berechnet; der WCAG-Kontrast wird live geprüft.', 'Para cada tema: una familia de colores y un tono. Barra, texto y acento se calculan a partir de ellos; el contraste WCAG se comprueba en directo.'],
    groupPages: ['Applications', 'Applications', 'Anwendungen', 'Aplicaciones'],
    groupCr: ['Familles de comptes rendus', 'Report families', 'Berichtsfamilien', 'Familias de informes'],
    origin: ['Couleurs d’origine', 'Original colours', 'Ursprungsfarben', 'Colores originales'],
    tone: ['Ton', 'Tone', 'Ton', 'Tono'],
    dark: ['sombre', 'dark', 'dunkel', 'oscuro'],
    light: ['clair', 'light', 'hell', 'claro'],
    barText: ['texte / bandeau', 'text / bar', 'Text / Leiste', 'texto / barra'],
    accPage: ['accent / page', 'accent / page', 'Akzent / Seite', 'acento / página'],
    accCard: ['accent / carte', 'accent / card', 'Akzent / Karte', 'acento / tarjeta'],
    preview: ['Voir sur cette page', 'Show on this page', 'Auf dieser Seite zeigen', 'Ver en esta página'],
    previewOn: ['Affiché sur cette page', 'Shown on this page', 'Auf dieser Seite angezeigt', 'Mostrado en esta página'],
    button: ['Bouton', 'Button', 'Schaltfläche', 'Botón'],
    title: ['Titre', 'Title', 'Titel', 'Título'],
    link: ['Lien, icône', 'Link, icon', 'Link, Symbol', 'Enlace, icono'],
    demoBtn: ['Démonstration complète', 'Full demonstration', 'Vollständige Demo', 'Demostración completa'],
    reset: ['Tout réinitialiser', 'Reset everything', 'Alles zurücksetzen', 'Restablecer todo'],
    demo: ['Démonstration complète (maquette du générateur, catalogue d’icônes, contrastes de tous les thèmes)', 'Full demonstration (generator mock-up, icon catalogue, contrast of every theme)', 'Vollständige Demo (Generator-Entwurf, Symbolkatalog, Kontraste aller Themen)', 'Demostración completa (maqueta del generador, catálogo de iconos, contrastes de todos los temas)'],
    thumbBlock: ['Importer une mission', 'Import a mission', 'Mission importieren', 'Importar una misión']
  };
  // Libellé court de chaque thème de repository_tree (sinon le nom du thème)
  const NAMES = {
    flight: ['Carburant (planificateur)', 'Fuel (planner)', 'Kraftstoff (Planer)', 'Combustible (planificador)'],
    landing: ['Atterrissages', 'Landings', 'Landungen', 'Aterrizajes'],
    sia: ['Missions SIA (générateur, studio)', 'SIA missions (generator, studio)', 'SIA-Missionen (Generator, Studio)', 'Misiones SIA (generador, estudio)'],
    cpco: ['Centre (CPCO : générateur, studio, registre)', 'Centre (CPCO: generator, studio, registry)', 'Zentrum (CPCO: Generator, Studio, Register)', 'Centro (CPCO: generador, estudio, registro)'],
    core: ['CR (pages communes)', 'Reports (common pages)', 'Berichte (gemeinsame Seiten)', 'Informes (páginas comunes)']
  };
  const APPS = ['flight', 'landing', 'cpco', 'core'];
  const nav = () => window.RepositoryNav,
    AP = () => nav().appearance;
  const li = K.langIndex;
  const typo = s => window.RepositoryContentI18n?.typography?.(s, K.lang()) ?? s;
  const t = row => K.t(row);
  const esc = K.esc;
  const icon = (n, size) => window.RepositoryIcons?.svg(n, size ? {
    size
  } : undefined) || '';
  const lightness = K.color.lightness;
  const toneOf = hex => Math.round(Math.max(0, Math.min(100, (lightness(hex) - 12) / .42)));
  let host = null,
    previewTheme = null;

  /** Section-bloc du framework (icône, sous-titre) ; html : contenu. */
  const block = (id, ic, title, sub, html) => `<section data-block-id="${id}" data-icon="${ic}" data-no-i18n><h2>${esc(title)}</h2><p class="repo-block-subtitle">${esc(sub)}</p>${html}</section>`;

  function render() {
    const a = AP(),
      cur = a.current(),
      i = li(),
      fam = Object.entries(a.families);
    // --- design : vignettes dessinées dans chaque design
    const thumbs = Object.entries(a.designs).map(([id, d]) => `<button type="button" class="ap-thumb repo-plain" data-design="${esc(id)}" aria-pressed="${id === cur.design}">
      <span class="ap-mini" data-d="${esc(id)}" aria-hidden="true"><span class="ap-mini-side"></span><span class="ap-mini-body"><span class="ap-mini-bar"></span><span class="ap-mini-block"><span class="ap-mini-ic"></span><span class="ap-mini-title">${esc(t(T.thumbBlock))}</span><span class="ap-mini-line"></span><span class="ap-mini-line s"></span><span class="ap-mini-btn"></span></span></span></span>
      <b>${esc(d.label?.[i] || d.label?.[0] || id)}</b><small>${esc(typo(d.title?.[i] || d.title?.[0] || ''))}</small></button>`).join('');
    // --- icônes : une rangée d'aperçu par variante
    const sample = ['target', 'map', 'upload', 'fuel', 'plane', 'clipboard', 'chart', 'settings'];
    const ICO = new URL('shared/icons/skeuo/', nav().root).href;
    const stroke = n => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${window.RepositoryIcons?.paths(n) || ''}</svg>`;
    // jeu composé (fond vierge + glyphe, REPOSITORY_TREE.iconComposed écrit par tools/build_skeuo_icons_css.py) : même rendu que les pages
    const COMP = window.REPOSITORY_TREE?.iconComposed || {};
    const composedIc = (c, n) => {
      const img = `url('${ICO}${c.normal}${VER}') center/contain no-repeat`,
        bg = c.disc ? `${img},${c.disc} center/contain no-repeat` : img;
      return `<span class="ap-ic" style="display:inline-grid;place-items:center;width:34px;height:34px;background:${bg};background-blend-mode:${c.disc ? 'overlay,normal' : 'normal'};-webkit-mask:${img};mask:${img};color:${c.glyph}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(.5px 1px .6px rgba(0,0,0,.55))">${window.RepositoryIcons?.paths(n) || ''}</svg></span>`;
    };
    const sampleOf = id => id === 'off' ? '' : id === 'auto' ? sampleOf(a.designs[cur.design]?.icons || 'line') : COMP[id] ? sample.map(n => composedIc(COMP[id], n)).join('') : a.iconFolder(id) ? sample.map(n => `<img class="ap-ic" src="${ICO}${a.iconFolder(id)}/${n}.webp${VER}" alt="" width="34" height="34">`).join('') : sample.map(n => `<span class="ap-ic">${stroke(n)}</span>`).join('');
    const iconSel = cur.iconsSaved && cur.iconsSaved !== 'matter' ? cur.iconsSaved : 'auto';
    const iconRows = Object.entries(T.iconSet).map(([id, row]) => `<button type="button" class="ap-iconrow repo-plain" data-icons="${id}" aria-pressed="${id === iconSel}"><b>${esc(t(row))}</b><span class="ap-iconset" data-set="${id}">${sampleOf(id)}</span></button>`).join('');
    const decor = cur.decorSaved || 'full',
      decorBtns = Object.entries(T.decorSet).map(([id, row]) => `<button type="button" class="ap-seg repo-seg repo-plain" data-decor="${id}" aria-pressed="${id === decor}">${esc(t(row))}</button>`).join('');
    const aq = a.aquaColor?.() || 'blue',
      aquaDots = (a.aquaColors || []).concat('app').map(id => `<button type="button" class="repo-plain ap-dot${id === 'app' ? ' ap-origin' : ''}" data-aqua="${id}" title="${esc(t(T.aquaSet[id]))}" aria-label="${esc(t(T.aquaSet[id]))}" aria-pressed="${id === aq}" style="background:${id === 'app' ? 'conic-gradient(#d33,#e90,#3a5,#2ab,#36d,#a4d,#d33)' : a.aquaSample(id)}"></button>`).join('');
    // --- graphiques : style (segments) et palettes (rangées avec échantillon de couleurs)
    const ch = a.chart?.(),
      chStyle = a.chartStyles ? a.chartStyles.map(id => `<button type="button" class="ap-seg repo-seg repo-plain" data-chart-style="${id}" aria-pressed="${id === ch.style}">${esc(t(T.chartStyleSet[id]))}</button>`).join('') : '';
    const chRows = a.chartPalettes ? a.chartPalettes.map(id => {
      const eff = id === 'auto' ? ch.effective.palette : id;
      return `<button type="button" class="ap-iconrow repo-plain" data-chart-palette="${id}" aria-pressed="${id === ch.palette}"><b>${esc(t(T.chartPalette[id]))}</b><span class="ap-swatches">${a.chartSample(eff).map(c => `<i style="background:${c}"></i>`).join('')}</span></button>`;
    }).join('') : '';
    const side = cur.sidenav || 'auto',
      sideBtns = Object.entries(T.sideSet).map(([id, row]) => `<button type="button" class="ap-seg repo-seg repo-plain" data-side="${id}" aria-pressed="${id === side}">${esc(t(row))}</button>`).join(''),
      sizeBtns = Object.entries(T.sideSizeSet).map(([id, row]) => `<button type="button" class="ap-seg repo-seg repo-plain" data-side-size="${id}" aria-pressed="${id === (cur.sidenavSize || 'm')}">${esc(t(row))}</button>`).join(''),
      showBtns = Object.entries(T.sideShowSet).map(([id, row]) => `<button type="button" class="ap-seg repo-seg repo-plain" data-side-show="${id}" aria-pressed="${id === (cur.sidenavShow || 'both')}">${esc(t(row))}</button>`).join('');
    // --- couleurs : une carte par thème, groupées (applications, familles de CR)
    const card = name => {
      const o = cur.colors[name] || null,
        base = a.themes[name],
        tone = o ? o.tone : toneOf(base.bar);
      const dots = `<button type="button" class="repo-plain ap-dot ap-origin" data-fam="" title="${esc(t(T.origin))}" aria-pressed="${!o}" style="background:${esc(base.bar)}">↺</button>` + fam.map(([id, f]) => `<button type="button" class="repo-plain ap-dot" data-fam="${esc(id)}" title="${esc(f.label?.[i] || f.label?.[0] || id)}" aria-pressed="${o?.family === id}" style="background:${a.familyColors(f, 45, '#ffffff').bar}"></button>`).join('');
      const label = NAMES[name] ? t(NAMES[name]) : name;
      return `<article class="ap-card" data-theme="${esc(name)}"><header><b>${esc(label)}</b><small>${esc(name)}</small></header>
        <div class="ap-sample"></div>
        <div class="repo-plain ap-dots" role="group" aria-label="${esc(label)}">${dots}</div>
        <label class="ap-tone"><span>${esc(t(T.tone))}</span><small>${esc(t(T.dark))}</small><input type="range" min="0" max="100" value="${tone}"${o ? '' : ' disabled'}><small>${esc(t(T.light))}</small></label>
        <div class="ap-wcag"></div>
        <button type="button" class="ap-show repo-plain" aria-pressed="${previewTheme === name}">${esc(t(previewTheme === name ? T.previewOn : T.preview))}</button></article>`;
    };
    const names = Object.keys(a.themes),
      crs = names.filter(n => !APPS.includes(n));
    host.innerHTML =
      block('ap-design', 'layers', t(T.design), t(T.designSub), `<div class="ap-thumbs">${thumbs}</div><div class="ap-sidebar"><b>${esc(t(T.decor))}</b><span class="ap-segs repo-segs" role="group">${decorBtns}</span><small class="ap-help">${esc(t(T.decorHelp))}</small></div>${a.aquaColors ? `<div class="ap-sidebar"><b>${esc(t(T.aqua))}</b><span class="repo-plain ap-dots" role="group" aria-label="${esc(t(T.aqua))}">${aquaDots}</span><small class="ap-help">${esc(t(T.aquaHelp))}</small></div>` : ''}`) +
      (ch ? block('ap-charts', 'chart', t(T.charts), t(T.chartsSub), `<div class="ap-iconrows">${chRows}</div><div class="ap-sidebar"><b>${esc(t(T.chartStyle))}</b><span class="ap-segs repo-segs" role="group">${chStyle}</span></div>`) : '') +
      block('ap-icons', 'box', t(T.icons), t(T.iconsSub), `<div class="ap-iconrows">${iconRows}</div><div class="ap-sidebar"><b>${esc(t(T.side))}</b><span class="ap-segs repo-segs" role="group">${sideBtns}</span></div><div class="ap-sidebar"><b>${esc(t(T.sideSize))}</b><span class="ap-segs repo-segs" role="group">${sizeBtns}</span></div><div class="ap-sidebar"><b>${esc(t(T.sideShow))}</b><span class="ap-segs repo-segs" role="group">${showBtns}</span></div>`) +
      block('ap-colors', 'eye', t(T.colors), t(T.colorsSub), `<h3>${esc(t(T.groupPages))}</h3><div class="ap-cards">${APPS.filter(n => a.themes[n]).map(card).join('')}</div><h3>${esc(t(T.groupCr))}</h3><div class="ap-cards">${crs.map(card).join('')}</div>`) +
      `<p class="ap-foot"><button type="button" id="apDemo" class="repo-plain" data-icon="eye" title="${esc(t(T.demo))}">${esc(t(T.demoBtn))}</button><button type="button" id="apReset" class="repo-plain" data-icon="refresh">${esc(t(T.reset))}</button></p>`;
    host.querySelectorAll('.ap-card').forEach(paint);
    window.AppFramework?.refresh?.(host); // blocs du framework dans l'hôte (page Apparence ou fenêtre modale)
  }

  /** Aperçu et contrastes d'une carte de thème (famille et ton affichés, ou couleurs d'origine). */
  function paint(cardEl) {
    const a = AP(),
      name = cardEl.dataset.theme,
      base = a.themes[name],
      famId = cardEl.querySelector('.ap-dot[aria-pressed="true"]')?.dataset.fam || '',
      tone = +cardEl.querySelector('input[type=range]').value;
    const c = famId ? {
      ...base,
      ...a.familyColors(a.families[famId], tone, base.page)
    } : {
      ...base
    };
    const r1 = a.contrast(c.barText, c.bar),
      r2 = a.contrast(c.accent, c.page),
      r3 = a.contrast(c.accent, '#ffffff');
    cardEl.querySelector('.ap-sample').innerHTML = `<span class="ap-s-bar" style="background:${c.bar};color:${c.barText}">${esc(t(T.title))}</span><span class="ap-s-page" style="background:${c.page}"><span class="ap-s-btn" style="background:${c.accent};color:${a.contrast('#ffffff', c.accent) >= a.contrast('#0b0f14', c.accent) ? '#fff' : '#0b0f14'}">${esc(t(T.button))}</span><span style="color:${c.accent}">${icon('map', 16)} ${esc(t(T.link))}</span></span>`;
    const pill = (v, min, lab) => `<span class="ap-pill ${v >= min ? 'ok' : 'ko'}" title="${esc(lab)} : ${v.toFixed(2)} (${v >= min ? '≥' : '<'} ${min}:1)">${v >= min ? '✓' : '✗'} ${v.toFixed(1)}<small>${esc(lab)}</small></span>`;
    cardEl.querySelector('.ap-wcag').innerHTML = pill(r1, 4.5, t(T.barText)) + pill(r2, 4.5, t(T.accPage)) + pill(r3, 3, t(T.accCard));
  }

  /** Enregistre la famille / le ton d'une carte (famille vide : couleurs d'origine) et rafraîchit l'aperçu de la page. */
  function saveCard(cardEl) {
    const a = AP(),
      name = cardEl.dataset.theme,
      famId = cardEl.querySelector('.ap-dot[aria-pressed="true"]')?.dataset.fam || '';
    a.setColor(name, famId ? {
      family: famId,
      tone: +cardEl.querySelector('input[type=range]').value
    } : null);
    if (previewTheme === name) nav().setTheme(name);
  }

  let styled = false;
  /** Construit l'interface dans el (page Apparence : #appearancePage ; modale : élément fourni par repository_nav.js). */
  function mount(el) {
    host = el || document.getElementById('appearancePage');
    if (!host || !AP()) return;
    previewTheme = null;
    if (!el) window.RepositoryContentI18n?.([T.sub, ['Apparence', 'Appearance', 'Darstellung', 'Apariencia']]);
    if (styled) {
      render();
      listen();
      return;
    }
    styled = true;
    const TX = new URL('shared/textures/', nav().root).href,
      TV = new URL(document.querySelector('script[src*="appearance_page.js"]')?.src || location.href).search; // textures des vignettes : version de ce script (son empreinte couvre les textures, tools/bump_versions.py)
    const css = document.createElement('style');
    css.textContent = `
.ap-page>section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:0 0 16px}.ap-page h2{font-size:17px;margin:0 0 4px}
main.ap-page{--ink:#17242b;--muted:#5b6673;--line:#cfd9e1;--card:#fff}
main.ap-page :is(.ap-thumb,.ap-iconrow,.ap-card,.ap-show,[id=apReset]){color:var(--ink)!important/*garder*/}main.ap-page :is(.repo-plain,.ap-card) :is(b,strong,small,label,span,header):not([style]):not(.ap-pill):not(.ap-pill *){color:inherit!important/*garder*/}main.ap-page .ap-seg[aria-pressed="true"]{color:#fff!important/*garder*/}main.ap-page .ap-help{color:inherit;opacity:.85}
.ap-thumbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:12px}
.ap-thumb{display:grid;gap:6px;text-align:left;padding:10px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);cursor:pointer;font:inherit}
.ap-thumb[aria-pressed="true"]{border-color:var(--repo-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--repo-accent) 25%,transparent)}
.ap-thumb small{color:var(--muted);font-size:12px;line-height:1.35}
.ap-mini{display:flex;height:112px;border-radius:8px;overflow:hidden;background:color-mix(in srgb,var(--repo-page) 92%,#fff);border:1px solid var(--line)}
.ap-mini-side{width:0;background:color-mix(in srgb,var(--repo-bar) 86%,#000)}
.ap-mini-body{flex:1;display:flex;flex-direction:column}
.ap-mini-bar{height:22px;background:var(--repo-bar)}
.ap-mini-block{margin:10px;padding:8px 10px;background:#fff;border:1px solid #d3dfe5;border-radius:8px;display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center}
.ap-mini-ic{display:none;width:14px;height:14px;border-radius:4px;background:color-mix(in srgb,var(--repo-accent) 30%,transparent)}
.ap-mini-title{grid-column:1/-1;font-size:11px;font-weight:700;color:#17242b}
.ap-mini-line{grid-column:1/-1;height:5px;border-radius:3px;background:#dfe7ec}.ap-mini-line.s{width:60%}
.ap-mini-btn{grid-column:1/-1;width:52px;height:12px;border-radius:5px;background:var(--repo-accent)}
/* Aqua : vignettes et rangées en verre bombé, état choisi teinté de la couleur Aqua */
html[data-design="aqua"] main.ap-page :is(.ap-thumb,.ap-iconrow,.ap-show,[id=apReset]){background-image:linear-gradient(#ffffff,#f1f4f8 50%,#e6ebf1 51%,#f6f8fb)!important}
html[data-design="aqua"] main.ap-page :is(.ap-thumb,.ap-iconrow,.ap-show)[aria-pressed="true"]{background-image:linear-gradient(color-mix(in srgb,var(--aq-gel) 10%,#fff),color-mix(in srgb,var(--aq-gel) 20%,#fff))!important;border-color:var(--aq-gel)!important}
/* Tactique : vignettes et rangées en verre fumé, choix en cyan */
html[data-design="tactique"] main.ap-page{--ink:#e6eef8;--muted:#8ea7c2;--line:#293850;--card:rgba(22,31,46,.82)}html[data-design="tactique"] main.ap-page :is(.ap-thumb,.ap-iconrow,.ap-show,[id=apReset]){background:rgba(22,31,46,.82)!important;border-color:#293850!important}
html[data-design="tactique"] main.ap-page :is(.ap-thumb,.ap-iconrow,.ap-show)[aria-pressed="true"]{background:linear-gradient(rgba(56,189,248,.18),rgba(56,189,248,.08))!important;border-color:#38bdf8!important;box-shadow:0 0 0 1px rgba(56,189,248,.35),0 4px 18px rgba(56,189,248,.18)!important}
html[data-design="tactique"] main.ap-page .ap-mini:not([data-d="tactique"]) .ap-mini-title{-webkit-text-fill-color:#17242b}
.ap-mini[data-d="aero"] .ap-mini-bar{background:linear-gradient(115deg,var(--repo-bar),color-mix(in srgb,var(--repo-bar) 70%,#000))}
.ap-mini[data-d="aero"] .ap-mini-block{border-radius:10px;box-shadow:0 6px 16px color-mix(in srgb,var(--repo-accent) 22%,transparent)}.ap-mini[data-d="aero"] .ap-mini-btn{border-radius:6px}
.ap-mini[data-d="ops"] .ap-mini-block{border-radius:2px;border-left:4px solid var(--repo-accent);padding:5px 8px;margin:6px}.ap-mini[data-d="ops"] .ap-mini-title{text-transform:uppercase;font-size:9.5px;letter-spacing:.06em}.ap-mini[data-d="ops"] .ap-mini-btn{border-radius:2px}
.ap-help{flex-basis:100%;color:var(--muted);font-size:12px}
.ap-mini[data-d="cabinet"]{background:url(${TX}leather-brown.webp${TV}) center/128px;padding:5px}.ap-mini[data-d="cabinet"] .ap-mini-body{border-radius:6px;overflow:hidden;background:url(${TX}wood.webp${TV}) center/256px;padding:4px}
.ap-mini[data-d="cabinet"] .ap-mini-bar{height:20px;border-radius:4px;background:url(${TX}leather-navy.webp${TV}) center/128px;box-shadow:inset 0 0 0 1px #c9a24a}
.ap-mini[data-d="cabinet"] .ap-mini-block{margin:6px 0 0;border:4px solid #5a3218;border-radius:6px;background:url(${TX}parchment.webp${TV}) center/256px}
.ap-mini[data-d="cabinet"] .ap-mini-title{justify-self:start;padding:1px 8px;border-radius:2px;background:url(${TX}brass.webp${TV}) center/128px;color:#2a1d08;font-family:Georgia,serif;text-transform:uppercase;font-size:9px;letter-spacing:.08em}
.ap-mini[data-d="cabinet"] .ap-mini-btn{background:#1d3557;box-shadow:0 0 0 1.5px #c9a24a}.ap-mini[data-d="cabinet"] .ap-mini-line{background:rgba(90,60,20,.18)}
.ap-mini[data-d="flightlog"]{background:url(${TX}leather-brown.webp${TV}) center/128px;padding:5px}.ap-mini[data-d="flightlog"] .ap-mini-body{border-radius:6px;overflow:hidden;background:url(${TX}wood.webp${TV}) center/256px;padding:4px}
.ap-mini[data-d="flightlog"] .ap-mini-bar{height:20px;border-radius:4px;background:url(${TX}leather-navy.webp${TV}) center/128px;box-shadow:inset 0 0 0 1px #c9a24a}
.ap-mini[data-d="flightlog"] .ap-mini-block{margin:6px 0 0;border:5px solid #8d908c;border-radius:3px;box-shadow:inset 0 0 0 1px #5a5d5a;background:url(${TX}parchment.webp${TV}) center/256px}
.ap-mini[data-d="flightlog"] .ap-mini-title{justify-self:start;padding:1px 8px;border-radius:2px;background:url(${TX}brushed-light.webp${TV}) center/128px;color:#1d2733;font-family:Georgia,serif;text-transform:uppercase;font-size:9px;letter-spacing:.08em}
.ap-mini[data-d="flightlog"] .ap-mini-btn{background:#1d3557;box-shadow:0 0 0 1.5px #c9a24a}
.ap-mini[data-d="field"]{background:url(${TX}topo.webp${TV}) center/256px;padding:5px}.ap-mini[data-d="field"] .ap-mini-body{border-radius:6px;overflow:hidden;background:url(${TX}olive.webp${TV}) center/256px;padding:4px}
.ap-mini[data-d="field"] .ap-mini-bar{height:20px;border-radius:4px;background:url(${TX}steel-dark.webp${TV}) center/256px}
.ap-mini[data-d="field"] .ap-mini-block{margin:6px 0 0;border:2px solid #2a2e22;border-left:5px solid var(--repo-accent);border-radius:6px;background:linear-gradient(rgba(40,46,32,.5),rgba(40,46,32,.5)),url(${TX}steel.webp${TV}) center/256px}
.ap-mini[data-d="field"] .ap-mini-title{justify-self:start;padding:1px 8px;border-radius:2px;background:url(${TX}khaki.webp${TV}) center/128px;color:#1b1d14;font-family:Bahnschrift,"Arial Narrow",sans-serif;text-transform:uppercase;font-size:9.5px}
.ap-mini[data-d="field"] .ap-mini-btn{background:linear-gradient(#3fa83f,#146b1c);box-shadow:0 0 6px rgba(80,255,90,.5)}.ap-mini[data-d="field"] .ap-mini-line{background:#121410}
.ap-mini[data-d="aqua"]{background:linear-gradient(#e9eff5,#d9e3ec)}.ap-mini[data-d="aqua"] .ap-mini-bar{margin:5px 5px 0;height:18px;border-radius:5px;border:1px solid #9aa6b2;background:url(${TX}brushed-light.webp${TV}) center/128px}
.ap-mini[data-d="aqua"] .ap-mini-block{border-radius:10px;border:1px solid #fff;box-shadow:0 6px 14px rgba(40,70,110,.15)}.ap-mini[data-d="aqua"] .ap-mini-btn{border-radius:6px;background:linear-gradient(color-mix(in srgb,var(--repo-accent) 55%,#fff),var(--repo-accent) 50%,color-mix(in srgb,var(--repo-accent) 85%,#000) 51%,color-mix(in srgb,var(--repo-accent) 70%,#fff))}
.ap-mini[data-d="tactique"]{background:radial-gradient(120px 60px at 15% 0,rgba(56,189,248,.18),transparent 70%),linear-gradient(#0d131d,#090d14)}.ap-mini[data-d="tactique"] .ap-mini-bar{margin:0;height:18px;background:linear-gradient(rgba(17,25,38,.95),rgba(11,16,24,.9));border-bottom:1px solid rgba(120,160,210,.2)}.ap-mini[data-d="tactique"] .ap-mini-block{border-radius:9px;border:1px solid rgba(120,160,210,.2);background:linear-gradient(rgba(24,34,50,.9),rgba(18,26,39,.9));box-shadow:inset 0 2px 0 var(--repo-accent),0 6px 14px rgba(0,0,0,.5)}.ap-mini[data-d="tactique"] .ap-mini-title{color:#e6eef8;font-family:Orbitron,Inter,sans-serif;text-transform:uppercase;font-size:9px;letter-spacing:.08em}.ap-mini[data-d="tactique"] .ap-mini-line{background:rgba(142,167,194,.35)}.ap-mini[data-d="tactique"] .ap-mini-btn{border-radius:6px;background:rgba(56,189,248,.25);box-shadow:inset 0 0 0 1px rgba(56,189,248,.6),0 0 8px rgba(56,189,248,.35)}
.ap-mini[data-d="console"] .ap-mini-side{width:22px}.ap-mini[data-d="console"] .ap-mini-ic{display:inline-block}.ap-mini[data-d="console"] .ap-mini-title{grid-column:auto;text-transform:uppercase;font-weight:800}.ap-mini[data-d="console"] .ap-mini-block{border-radius:8px;padding:10px 12px}.ap-mini[data-d="console"] .ap-mini-btn{height:14px;border-radius:5px}
.ap-iconrows{display:grid;gap:8px;margin-top:12px}
.ap-swatches{display:flex;gap:5px;flex-wrap:wrap}.ap-swatches i{width:26px;height:14px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.ap-iconrow{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;padding:8px 12px;border:2px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);cursor:pointer;font:inherit;text-align:left}
.ap-iconrow[aria-pressed="true"]{border-color:var(--repo-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--repo-accent) 25%,transparent)}
.ap-iconset{display:flex;gap:14px;color:var(--repo-accent);min-height:22px}
.ap-iconset[data-set="fine"] svg{stroke-width:1.5}.ap-iconset[data-set="line"] svg{stroke-width:2}.ap-iconset[data-set="bold"] svg{stroke-width:2.6}.ap-iconset img.ap-ic{width:34px;height:34px;object-fit:contain}
.ap-iconset .ap-ic{display:inline-flex}.ap-iconset .ap-ic svg{width:22px!important;height:22px!important;flex:none}   /* taille imposée : le CSS de la page hôte (modale) ne doit pas les agrandir */.ap-iconset .repo-svg{display:block!important}
.ap-sidebar{display:flex;align-items:center;gap:14px;margin-top:14px;flex-wrap:wrap}
main.ap-page h3{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:16px 0 8px}
.ap-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.ap-card{display:grid;gap:9px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
main.ap-page .ap-card>header{display:flex;align-items:baseline;justify-content:space-between;gap:8px;position:static;padding:0;margin:0;border:0;background:none;backdrop-filter:none;box-shadow:none;z-index:auto}.ap-card header small{color:var(--muted);font-family:ui-monospace,Consolas,monospace;font-size:11px}
.ap-sample{border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.ap-s-bar{display:block;padding:7px 10px;font-weight:800;font-size:13px}
.ap-s-page{display:flex;align-items:center;gap:12px;padding:9px 10px;font-size:12.5px;font-weight:650}
.ap-s-page .repo-svg{display:inline-block!important;vertical-align:-3px}
.ap-s-btn{padding:4px 10px;border-radius:6px;font-weight:700}
.ap-dots{display:flex;flex-wrap:wrap;gap:5px}
.ap-dot{width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0;color:#fff;font-size:12px;line-height:1}
.ap-dot[aria-pressed="true"]{box-shadow:0 0 0 2px var(--ink);transform:scale(1.12)}
.ap-tone{display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;gap:6px;font-size:12.5px}.ap-tone small{color:var(--muted)}.ap-tone input{width:100%}
.ap-wcag{display:flex;flex-wrap:wrap;gap:5px}
.ap-pill{display:inline-flex;align-items:baseline;gap:4px;padding:2px 8px;border-radius:99px;font-size:12px;font-weight:800}.ap-pill small{font-weight:500}
main.ap-page .ap-pill.ok{background:#e3f4e8!important/*garder*/;color:#14532d!important/*garder*/;border:0!important/*garder*/}main.ap-page .ap-pill.ko{background:#fde2e1!important/*garder*/;color:#8a1c14!important/*garder*/;border:0!important/*garder*/}   /* pastilles : jamais repeintes par les encadrés .ok de la page hôte */
.ap-show{justify-self:start;border:1px solid var(--line);border-radius:8px;padding:5px 10px;background:transparent;color:var(--ink);cursor:pointer;font:inherit;font-size:12.5px}
.ap-show[aria-pressed="true"]{background:var(--repo-bar);color:var(--repo-bar-text);border-color:var(--repo-bar)}
.ap-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
#apReset,#apDemo{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:8px;padding:8px 14px;background:var(--card);color:var(--ink);cursor:pointer;font:inherit;font-weight:600}
#apDemo{background:var(--repo-accent);border-color:var(--repo-accent);color:#fff!important/*garder*/}#apReset{background:#fff!important/*garder*/;color:#17242b!important/*garder*/;border-color:#9aa6b2!important/*garder*/}`;
    document.head.append(css);
    render();
    listen();
    window.addEventListener('repository-language-change', () => host?.isConnected && render());
  }
  /** Écoute des réglages sur l'hôte courant. */
  function listen() {
    if (host.dataset.apListen) return;
    host.dataset.apListen = '1';
    host.addEventListener('click', e => {
      const a = AP(),
        b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.design) {
        a.setDesign(b.dataset.design);
        render();
      } else if (b.dataset.icons) {
        a.setIcons(b.dataset.icons === 'auto' ? null : b.dataset.icons);
        render();
      } else if (b.dataset.chartStyle) {
        a.setChart('style', b.dataset.chartStyle);
        render();
      } else if (b.dataset.chartPalette) {
        a.setChart('palette', b.dataset.chartPalette);
        render();
      } else if (b.dataset.aqua) {
        a.setAqua(b.dataset.aqua);
        render();
      } else if (b.dataset.decor) {
        a.setDecor(b.dataset.decor === 'full' ? null : b.dataset.decor);
        render();
      } else if (b.dataset.side) {
        a.setSidenav(b.dataset.side === 'auto' ? null : b.dataset.side === 'on');
        render();
      } else if (b.dataset.sideSize) {
        a.setSidenavSize?.(b.dataset.sideSize);
        render();
      } else if (b.dataset.sideShow) {
        a.setSidenavShow?.(b.dataset.sideShow);
        render();
      } else if (b.classList.contains('ap-dot')) {
        const cardEl = b.closest('.ap-card');
        cardEl.querySelectorAll('.ap-dot').forEach(d => d.setAttribute('aria-pressed', String(d === b)));
        const range = cardEl.querySelector('input[type=range]');
        range.disabled = !b.dataset.fam;
        paint(cardEl);
        saveCard(cardEl);
      } else if (b.classList.contains('ap-show')) {
        const name = b.closest('.ap-card').dataset.theme;
        previewTheme = previewTheme === name ? null : name;
        nav().setTheme(previewTheme || nav().settings.theme);
        render();
      } else if (b.id === 'apDemo') {
        location.href = new URL('docs/technique/demo_design_icones.html', nav().root).href;
      } else if (b.id === 'apReset') {
        Object.keys(a.current().colors).forEach(n => a.setColor(n, null));
        a.setIcons(null);
        a.setSidenav('default');
        a.setSidenavSize?.(null);
        a.setSidenavShow?.(null);
        a.setDecor(null);
        a.setAqua?.(null);
        a.setChart?.('style', null);
        a.setChart?.('palette', null);
        a.setDesign(window.REPOSITORY_TREE.designs?.default || 'standard');
        previewTheme = null;
        nav().setTheme(nav().settings.theme);
        render();
      }
    });
    host.addEventListener('input', e => {
      if (e.target.type === 'range') paint(e.target.closest('.ap-card'));
    });
    host.addEventListener('change', e => {
      if (e.target.type === 'range') saveCard(e.target.closest('.ap-card'));
    });
  }
  window.RepositoryAppearance = {
    mount,
    /** Fermeture de la modale : l'aperçu d'un thème (« Voir sur cette page ») est annulé. */
    close() {
      if (previewTheme) {
        previewTheme = null;
        nav().setTheme(nav().settings.theme);
      }
    }
  };
  // page Apparence : construction au chargement complet (les icônes arrivent après ce script)
  if (document.getElementById('appearancePage')) {
    if (document.readyState === 'complete') mount();
    else window.addEventListener('load', () => mount());
  }
})();
