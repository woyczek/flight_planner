// Paramétrage › Apparence : design graphique, jeu d'icônes, barre latérale et couleurs des thèmes.
// Bloc ajouté à la page Paramétrage (CR DEFA/parametrage.html, ancre #appearance ; le menu ☰ y mène). Les réglages
// sont mémorisés dans le navigateur et appliqués par repository_nav.js sur toutes les pages
// (RepositoryNav.appearance) ; ils ne comptent pas comme modifications à sauvegarder (browser_store.js).
// Couleurs : pour chaque thème de repository_tree, une FAMILLE (teinte et saturation, REPOSITORY_TREE.colorFamilies)
// et un TON (clarté) plutôt que des valeurs absolues ; bandeau, texte et accent en sont calculés, et les rapports de
// contraste WCAG sont affichés (texte ≥ 4,5:1, éléments graphiques ≥ 3:1).
(() => {
  'use strict';
  const L = ['fr', 'en', 'de', 'es'];
  const T = {
    title: ['Apparence', 'Appearance', 'Darstellung', 'Apariencia'],
    subtitle: ['Design, icônes, barre latérale et couleurs des thèmes, pour toutes les pages de la suite (ce navigateur).', 'Design, icons, side bar and theme colours, for every page of the suite (this browser).', 'Design, Symbole, Seitenleiste und Themenfarben für alle Seiten der Suite (dieser Browser).', 'Diseño, iconos, barra lateral y colores de los temas, para todas las páginas (este navegador).'],
    design: ['Design', 'Design', 'Design', 'Diseño'],
    icons: ['Icônes', 'Icons', 'Symbole', 'Iconos'],
    iconSet: { line: ['Trait normal', 'Normal stroke', 'Normale Linie', 'Trazo normal'], fine: ['Trait fin', 'Thin stroke', 'Dünne Linie', 'Trazo fino'], bold: ['Trait épais', 'Bold stroke', 'Dicke Linie', 'Trazo grueso'], off: ['Aucune icône', 'No icons', 'Keine Symbole', 'Sin iconos'] },
    sidenav: ['Barre latérale', 'Side bar', 'Seitenleiste', 'Barra lateral'],
    sideSet: { auto: ['Selon le design (Console)', 'Depending on the design (Console)', 'Je nach Design (Konsole)', 'Según el diseño (Consola)'], on: ['Toujours', 'Always', 'Immer', 'Siempre'], off: ['Jamais', 'Never', 'Nie', 'Nunca'] },
    colors: ['Couleurs des thèmes', 'Theme colours', 'Themenfarben', 'Colores de los temas'],
    colorsHelp: ['Pour chaque thème : une famille de couleurs et un ton (clair ↔ sombre) ; bandeau, texte et accent en sont calculés. Contrastes WCAG : texte ≥ 4,5:1, éléments graphiques (icônes) ≥ 3:1.', 'For each theme: a colour family and a tone (light ↔ dark); header bar, text and accent are derived from them. WCAG contrast: text ≥ 4.5:1, graphics (icons) ≥ 3:1.', 'Je Thema: eine Farbfamilie und ein Ton (hell ↔ dunkel); Kopfleiste, Text und Akzent werden daraus berechnet. WCAG-Kontrast: Text ≥ 4,5:1, Grafiken (Symbole) ≥ 3:1.', 'Para cada tema: una familia de colores y un tono (claro ↔ oscuro); barra, texto y acento se calculan a partir de ellos. Contraste WCAG: texto ≥ 4,5:1, gráficos (iconos) ≥ 3:1.'],
    theme: ['Thème', 'Theme', 'Thema', 'Tema'],
    family: ['Famille', 'Family', 'Familie', 'Familia'],
    tone: ['Ton', 'Tone', 'Ton', 'Tono'],
    preview: ['Aperçu', 'Preview', 'Vorschau', 'Vista previa'],
    wcag: ['Contrastes WCAG', 'WCAG contrast', 'WCAG-Kontrast', 'Contraste WCAG'],
    origin: ['Couleurs d’origine', 'Original colours', 'Ursprüngliche Farben', 'Colores originales'],
    barText: ['texte / bandeau', 'text / bar', 'Text / Leiste', 'texto / barra'],
    accPage: ['accent / page', 'accent / page', 'Akzent / Seite', 'acento / página'],
    accCard: ['accent / carte', 'accent / card', 'Akzent / Karte', 'acento / tarjeta'],
    reset: ['Tout réinitialiser', 'Reset all', 'Alles zurücksetzen', 'Restablecer todo'],
    demo: ['Page de démonstration (aperçu complet du design, des icônes et des contrastes) →', 'Demonstration page (full preview of design, icons and contrast) →', 'Demoseite (vollständige Vorschau von Design, Symbolen und Kontrasten) →', 'Página de demostración (vista completa del diseño, iconos y contrastes) →'],
    current: ['thème de cette page', 'this page’s theme', 'Thema dieser Seite', 'tema de esta página']
  };
  const nav = () => window.RepositoryNav, ap = () => nav()?.appearance;
  const lang = () => Math.max(0, L.indexOf(nav()?.getLanguage?.() || 'fr'));
  const typo = s => window.RepositoryContentI18n?.typography?.(s, L[lang()]) ?? s;
  const t = row => typo(row[lang()] || row[0]);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  /** Clarté (0–100) d'une couleur « #rrggbb ». */
  const lightness = h => { const x = String(h || '').replace('#', ''), v = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255); return (Math.max(...v) + Math.min(...v)) / 2 * 100; };
  /** Pages qui utilisent un thème (libellés courts), pour situer chaque thème. */
  const usedBy = name => {
    const cfg = window.REPOSITORY_TREE, dirs = Object.entries(cfg.folders || {}).filter(([, f]) => f.theme === name).map(([k]) => k.split('/').pop() || 'racine');
    const pages = cfg.pages.filter(p => p.theme === name).map(p => nav()?.trLabel?.(p.label) || p.label);
    return [...new Set([...dirs, ...pages])].slice(0, 3).join(', ');
  };

  let host = null;
  /** Construit (ou reconstruit) le bloc Apparence. */
  function render() {
    const a = ap();
    if (!a || !host) return;
    const cur = a.current(), i = lang();
    const designOpts = Object.entries(a.designs).map(([id, d]) => `<label class="ap-choice"><input type="radio" name="apDesign" value="${esc(id)}"${id === cur.design ? ' checked' : ''}><b>${esc(d.label?.[i] || d.label?.[0] || id)}</b><span>${esc(typo(d.title?.[i] || d.title?.[0] || ''))}</span></label>`).join('');
    const iconOpts = Object.entries(T.iconSet).map(([id, row]) => `<option value="${id}"${id === cur.icons ? ' selected' : ''}>${esc(t(row))}</option>`).join('');
    const sideCur = cur.sidenav || 'auto', sideOpts = Object.entries(T.sideSet).map(([id, row]) => `<option value="${id}"${id === sideCur ? ' selected' : ''}>${esc(t(row))}</option>`).join('');
    const fams = Object.entries(a.families);
    const rows = Object.keys(a.themes).map(name => {
      const o = cur.colors[name] || null, famOpts = `<option value="">${esc(t(T.origin))}</option>` + fams.map(([id, f]) => `<option value="${esc(id)}"${o?.family === id ? ' selected' : ''}>${esc(f.label?.[i] || f.label?.[0] || id)}</option>`).join('');
      const tone = o ? o.tone : Math.round(Math.max(0, Math.min(100, (lightness(a.themes[name].bar) - 12) / .42)));
      return `<tr data-theme="${esc(name)}"><th scope="row">${esc(name)}${name === cur.theme ? ` <small>(${esc(t(T.current))})</small>` : ''}<br><small class="ap-muted">${esc(usedBy(name))}</small></th>
        <td><select class="ap-family" aria-label="${esc(t(T.family))} ${esc(name)}">${famOpts}</select></td>
        <td><input class="ap-tone" type="range" min="0" max="100" step="1" value="${tone}" aria-label="${esc(t(T.tone))} ${esc(name)}"${o ? '' : ' disabled'}></td>
        <td class="ap-preview"></td><td class="ap-wcag"></td></tr>`;
    }).join('');
    host.innerHTML = `<h2>${esc(t(T.title))}</h2><p class="repo-block-subtitle">${esc(t(T.subtitle))}</p>
      <div class="ap-grid">
        <fieldset class="ap-set"><legend>${esc(t(T.design))}</legend>${designOpts}</fieldset>
        <fieldset class="ap-set"><legend>${esc(t(T.icons))}</legend><select id="apIcons">${iconOpts}</select><div class="ap-icons" aria-hidden="true"></div>
          <legend class="ap-sub">${esc(t(T.sidenav))}</legend><select id="apSidenav">${sideOpts}</select>
          <p><a class="ap-demo" href="${esc(new URL('docs/demo_design_icones.html', nav().root).href)}">${esc(t(T.demo))}</a></p></fieldset>
      </div>
      <h3>${esc(t(T.colors))}</h3><p class="ap-muted">${esc(t(T.colorsHelp))}</p>
      <div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>${esc(t(T.theme))}</th><th>${esc(t(T.family))}</th><th>${esc(t(T.tone))}</th><th>${esc(t(T.preview))}</th><th>${esc(t(T.wcag))}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p><button type="button" id="apReset">${esc(t(T.reset))}</button></p>`;
    host.querySelectorAll('tr[data-theme]').forEach(paintRow);
    paintIcons();
  }
  /** Aperçu et contrastes d'une ligne de thème (couleurs effectives, ou calculées depuis la famille et le ton affichés). */
  function paintRow(tr) {
    const a = ap(), name = tr.dataset.theme, fam = tr.querySelector('.ap-family').value, tone = +tr.querySelector('.ap-tone').value, base = a.themes[name];
    const c = fam ? { ...base, ...a.familyColors(a.families[fam], tone, base.page) } : a.themeColors(name);
    const r1 = a.contrast(c.barText, c.bar), r2 = a.contrast(c.accent, c.page), r3 = a.contrast(c.accent, '#ffffff');
    const badge = (v, min, label) => `<span class="ap-badge ${v >= min ? 'ok' : 'ko'}" title="${esc(label)} — ${v >= min ? '≥' : '<'} ${min}:1">${v >= min ? '✓' : '✗'} ${v.toFixed(1)} <small>${esc(label)}</small></span>`;
    tr.querySelector('.ap-preview').innerHTML = `<span class="ap-swatch" style="background:${c.bar};color:${c.barText}">Aa Titre</span><span class="ap-swatch" style="background:${c.page};color:${c.accent};border:1px solid #0002">● Accent</span>`;
    tr.querySelector('.ap-wcag').innerHTML = badge(r1, 4.5, t(T.barText)) + badge(r2, 4.5, t(T.accPage)) + badge(r3, 3, t(T.accCard));
  }
  /** Aperçu du jeu d'icônes (quelques icônes du registre, au trait choisi). */
  function paintIcons() {
    const box = host?.querySelector('.ap-icons'), I = window.RepositoryIcons;
    if (!box) return;
    if (!I) { setTimeout(paintIcons, 200); return; }
    box.innerHTML = ['target', 'map', 'upload', 'settings', 'fuel', 'plane', 'clipboard', 'chart'].filter(n => I.has?.(n) ?? true).map(n => `<span class="repo-icon">${I.svg(n, { size: 26 }) || ''}</span>`).join('');
  }

  function mount() {
    const main = document.getElementById('dataAdmin') || document.querySelector('main');
    if (!main || !ap()) return false;
    host = document.createElement('section');
    host.id = 'appearance';
    host.dataset.blockId = 'appearance';
    host.dataset.icon = 'settings';
    host.dataset.noI18n = '';            // textes traduits ici (4 langues)
    main.append(host);                  // en fin de page (la page sert d'abord aux bases de données) ; le menu ☰ y mène (#appearance)
    const css = document.createElement('style');
    css.textContent = `#appearance{grid-column:1/-1}/* pleine largeur : la grille navigation | contenu de la page reste en dessous */
#appearance .ap-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin:10px 0}
#appearance .ap-set{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:8px;padding:10px 12px;display:grid;gap:6px;align-content:start}
#appearance .ap-set legend{font-weight:700;padding:0 4px}#appearance .ap-set .ap-sub{margin-top:8px}
#appearance .ap-choice{display:grid;grid-template-columns:auto 1fr;gap:0 8px;align-items:baseline;cursor:pointer;padding:3px 0}#appearance .ap-choice span{grid-column:2;font-size:12px;opacity:.85}
#appearance .ap-icons{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0;color:var(--repo-accent)}
#appearance .ap-muted{opacity:.85;font-size:12.5px;margin:2px 0}
#appearance .ap-table-wrap{overflow:auto}#appearance .ap-table{border-collapse:collapse;width:100%;font-size:13px}
#appearance .ap-table th,#appearance .ap-table td{padding:6px 8px;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent);text-align:left;vertical-align:middle}
#appearance .ap-tone{width:130px}#appearance .ap-swatch{display:inline-block;padding:4px 9px;border-radius:5px;margin:2px 4px 2px 0;font-weight:700;font-size:12px;white-space:nowrap}
#appearance .ap-badge{display:inline-block;margin:2px 6px 2px 0;padding:2px 7px;border-radius:10px;font-size:12px;font-weight:700;white-space:nowrap}
#appearance .ap-badge.ok{background:#e3f4e8;color:#14532d}#appearance .ap-badge.ko{background:#fde2e1;color:#8a1c14}#appearance .ap-badge small{font-weight:500}`;
    document.head.append(css);
    render();
    host.addEventListener('change', e => {
      const a = ap(), el = e.target;
      if (el.name === 'apDesign') a.setDesign(el.value);
      else if (el.id === 'apIcons') a.setIcons(el.value);
      else if (el.id === 'apSidenav') a.setSidenav(el.value === 'auto' ? null : el.value === 'on');
      else if (el.classList.contains('ap-family')) {
        const tr = el.closest('tr'), tone = tr.querySelector('.ap-tone');
        tone.disabled = !el.value;
        a.setColor(tr.dataset.theme, el.value ? { family: el.value, tone: +tone.value } : null);
        paintRow(tr);
      } else if (el.classList.contains('ap-tone')) {
        const tr = el.closest('tr');
        a.setColor(tr.dataset.theme, { family: tr.querySelector('.ap-family').value, tone: +el.value });
      }
    });
    // ton : aperçu et contrastes en direct pendant le glissement
    host.addEventListener('input', e => { if (e.target.classList.contains('ap-tone')) paintRow(e.target.closest('tr')); });
    host.addEventListener('click', e => {
      if (e.target.id !== 'apReset') return;
      const a = ap();
      Object.keys(a.current().colors).forEach(n => a.setColor(n, null));
      a.setIcons('line'); a.setSidenav(null); a.setDesign(window.REPOSITORY_TREE.designs?.default || 'standard');
      render();
    });
    window.addEventListener('repository-language-change', render);
    if (location.hash === '#appearance') setTimeout(() => host.scrollIntoView({ block: 'start' }), 300);
    return true;
  }
  if (!mount()) window.addEventListener('repository-nav-ready', mount, { once: true });
})();
