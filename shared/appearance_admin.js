// Paramétrage › Apparence : lien vers la page Apparence (CR DEFA/apparence.html, construite par appearance_page.js),
// où se règlent design, jeu d'icônes, barre latérale et couleurs des thèmes. Bloc court, en fin de page Paramétrage.
(() => {
  'use strict';
  const L = ['fr', 'en', 'de', 'es'];
  const T = {
    title: ['Apparence', 'Appearance', 'Darstellung', 'Apariencia'],
    text: ['Design, icônes, barre latérale et couleurs des thèmes (familles, tons, contrastes WCAG), pour toutes les pages de la suite.', 'Design, icons, side bar and theme colours (families, tones, WCAG contrast), for every page of the suite.', 'Design, Symbole, Seitenleiste und Themenfarben (Familien, Töne, WCAG-Kontrast) für alle Seiten der Suite.', 'Diseño, iconos, barra lateral y colores de los temas (familias, tonos, contraste WCAG), para todas las páginas.'],
    open: ['Ouvrir la page Apparence', 'Open the Appearance page', 'Seite „Darstellung“ öffnen', 'Abrir la página Apariencia']
  };
  const nav = () => window.RepositoryNav;
  const t = row => { const l = L.indexOf(nav()?.getLanguage?.() || 'fr'); return window.RepositoryContentI18n?.typography?.(row[l] || row[0], L[Math.max(0, l)]) ?? row[0]; };
  function mount() {
    const main = document.getElementById('dataAdmin') || document.querySelector('main');
    if (!main || !nav()) return false;
    const host = document.createElement('section');
    host.id = 'appearance';
    host.dataset.blockId = 'appearance';
    host.dataset.icon = 'eye';
    host.dataset.noI18n = '';
    host.style.gridColumn = '1/-1';
    main.append(host);
    const render = () => {
      host.innerHTML = `<h2></h2><p class="repo-block-subtitle"></p><p><a class="primary" href="apparence.html"></a></p>`;
      host.querySelector('h2').textContent = t(T.title);
      host.querySelector('.repo-block-subtitle').textContent = t(T.text);
      host.querySelector('a').textContent = t(T.open);
    };
    render();
    window.addEventListener('repository-language-change', render);
    window.AppFramework?.refresh?.();
    return true;
  }
  if (!mount()) window.addEventListener('repository-nav-ready', mount, { once: true });
})();
