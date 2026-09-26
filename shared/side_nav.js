// Framework — barre latérale de navigation (voir docs/PROPOSITION_DESIGN_ICONES.md).
// Complète le menu ☰ sans le remplacer : raccourcis vers les applications principales, icône + libellé court.
// Entrées : REPOSITORY_TREE.sidebar si présent (proposition), sinon la liste par défaut ci-dessous ; seules les pages
// déclarées dans REPOSITORY_TREE.pages sont retenues (liens calculés depuis la racine, comme le menu ☰).
// Affichage : html[data-sidenav="on"] (Paramétrage › Apparence) ou design « console » ; masquée sous 760 px et à
// l'impression. Chargé par repository_nav.js après shared/icons/repository_icons.js ; styles dans block_icons.css.
(() => {
  'use strict';
  const cfg = window.REPOSITORY_TREE, nav = window.RepositoryNav;
  if (!cfg || !nav) return;
  const DEFAULT = [
    { icon: 'target', path: 'SIA XML/mission_editor.html', label: ['Missions', 'Missions', 'Missionen', 'Misiones'] },
    { icon: 'map', path: 'SIA XML/map_parser.html', label: ['Cartes', 'Maps', 'Karten', 'Mapas'] },
    { icon: 'clipboard', path: 'CR DEFA/mission_cr.html', match: 'CR DEFA/', label: ['CR DEFA', 'DEFA report', 'DEFA-Bericht', 'Informe DEFA'] },
    { icon: 'chart', path: 'CR DEFA/mission_operations_reporting.html', match: '_reporting.html', label: ['Reporting', 'Reporting', 'Berichte', 'Informes'] },
    { icon: 'fuel', path: 'flight_performance_planner.html', label: ['Carburant', 'Fuel', 'Kraftstoff', 'Combustible'] },
    { icon: 'plane', path: 'LandingPerformanceDashboard/LandingPerformance_Dashboard_MultiCSV_i18n.html', label: ['Atterrissages', 'Landings', 'Landungen', 'Aterrizajes'] },
    { sep: true },
    { icon: 'settings', path: 'CR DEFA/parametrage.html', label: ['Paramètres', 'Settings', 'Einstellungen', 'Ajustes'] },
    { icon: 'help', menu: true, label: ['Menu', 'Menu', 'Menü', 'Menú'], title: ['Toutes les pages, profil, données locales, design', 'All pages, profile, local data, design', 'Alle Seiten, Profil, lokale Daten, Design', 'Todas las páginas, perfil, datos locales, diseño'] }
  ];
  const items = cfg.sidebar || DEFAULT,
    known = new Set(cfg.pages.map(p => p.path)),
    current = nav.page?.path || '',
    L = ['fr', 'en', 'de', 'es'];
  const el = document.createElement('nav');
  el.className = 'repo-sidenav no-print';
  el.setAttribute('aria-label', 'Applications');
  const brand = window.RepositoryIcons?.svg('map', { size: 30 }) || '';
  el.innerHTML = `<div class="repo-sidenav-brand" aria-hidden="true">${brand}</div><ul></ul>`;
  const ul = el.querySelector('ul');
  // Entrée active : la page elle-même, sinon la première entrée dont « match » est contenu dans le chemin courant.
  const activeIndex = (() => {
    const i = items.findIndex(x => x.path === current);
    return i >= 0 ? i : items.findIndex(x => x.match && current.includes(x.match));
  })();
  items.forEach((it, i) => {
    const li = document.createElement('li');
    if (it.sep) { li.className = 'repo-sidenav-sep'; ul.append(li); return; }
    if (it.path && !known.has(it.path)) return;
    const a = document.createElement(it.menu ? 'button' : 'a');
    a.className = 'repo-sidenav-item';
    if (it.menu) { a.type = 'button'; a.onclick = e => { e.stopPropagation(); document.querySelector('.repo-menu-button')?.click(); }; }
    else a.href = new URL(it.path, nav.root).href;
    if (i === activeIndex) a.setAttribute('aria-current', 'page');
    a.innerHTML = `${window.RepositoryIcons?.svg(it.icon, { size: 22 }) || ''}<span class="repo-sidenav-label"></span>`;
    a._it = it;
    li.append(a);
    ul.append(li);
  });
  el.setAttribute('data-no-i18n', '');
  document.body.prepend(el);
  const render = () => {
    const i = Math.max(0, L.indexOf(nav.getLanguage()));
    el.querySelectorAll('.repo-sidenav-item').forEach(a => {
      a.querySelector('.repo-sidenav-label').textContent = a._it.label[i] || a._it.label[0];
      a.title = a._it.title?.[i] || a._it.title?.[0] || a._it.label[i] || a._it.label[0];
    });
  };
  render();
  window.addEventListener('repository-language-change', render);
  // Préférence (localStorage repositorySidenav = "on" | "off") posée sur <html data-sidenav> par repository_nav.js ;
  // réglage : Paramétrage › Apparence (RepositoryNav.appearance.setSidenav).
  window.RepositorySideNav = { element: el, set: on => nav.appearance?.setSidenav(on) };
})();
