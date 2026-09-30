// Framework — icônes de la barre latérale de navigation (voir docs/PROPOSITION_DESIGN_ICONES.md).
// La barre elle-même (entrées, libellés, entrée active) est construite par repository_nav.js dès son exécution, avec
// ses styles dans repository_nav.css, pour paraître avec l'en-tête ; ce script, chargé par repository_nav.js après
// shared/icons/repository_icons.js, remplit les emplacements réservés (span[data-sidenav-icon], taille fixe).
// Affichage : html[data-sidenav="on"] (page Apparence) ou design « console » ; masquée sous 760 px et à l'impression.
(() => {
  'use strict';
  const el = window.RepositorySideNav?.element,
    I = window.RepositoryIcons;
  window.RepositoryNav?.appearance?.renderEmblem?.(); // emblème d'en-tête des designs à matières (même registre)
  if (!el || !I) return;
  // tracé ajouté DANS l'emplacement (qui garde l'image éventuelle d'un jeu skeuomorphe, posée par repository_nav.js)
  el.querySelectorAll('span[data-sidenav-icon]').forEach(sp => sp.insertAdjacentHTML('beforeend', I.svg(sp.dataset.sidenavIcon, {
    size: +sp.dataset.size || 22
  })));
})();
