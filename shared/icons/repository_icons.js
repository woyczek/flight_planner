// Jeu d'icônes de la suite (voir docs/PROPOSITION_DESIGN_ICONES.md ; chargé par repository_nav.js).
// Icônes au trait, grille 24 × 24, trait 2, extrémités arrondies, couleur = currentColor : elles prennent la couleur
// du texte ou de la variable --repo-icon posée par block_icons.js (contraste contrôlé sur la surface du bloc).
// Dessins faits pour ce prototype dans le style de Lucide (https://lucide.dev, licence ISC) ; en production, les
// tracés Lucide peuvent être copiés ici (fichier local, jamais de CDN) avec la licence ISC dans shared/icons/LICENSE.
// Registre en JavaScript plutôt qu'un sprite SVG externe : <use href="sprite.svg#x"> est bloqué en file:// et
// demande une requête de plus ; ici, aucun fichier à charger, rendu identique hors ligne et à l'impression.
//
// API : RepositoryIcons.svg(nom, { size, title }) → chaîne SVG ; .has(nom) ; .names() ; .add(nom, tracés) pour
// qu'une page ajoute ses propres icônes (même grille, mêmes règles).
(() => {
  'use strict';
  const P = {
    // navigation / applications
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    wrench: '<path d="M14.5 3.2a5 5 0 0 0-4.4 6.7L3.4 16.6a2 2 0 0 0 2.8 2.8l6.7-6.7a5 5 0 0 0 6.7-4.4l-3 3-2.9-.6-.6-2.9z"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h3"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
    plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
    // fichiers et données
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    'file-text': '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h1"/>',
    upload: '<path d="M12 13v8M8 17l4-4 4 4"/><path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    // actions
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    maximize: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    wand: '<path d="m3 21 12-12M14 6l4 4"/><path d="M19 2v4M17 4h4M8 3v2M7 4h2M20 12v2M19 13h2"/>',
    sparkles: '<path d="m12 3 1.8 4.9L19 9.5l-5.2 1.7L12 16l-1.8-4.8L5 9.5l5.2-1.6z"/><path d="M19 15v4M17 17h4M5 17v3M3.5 18.5h3"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-up': '<path d="m18 15-6-6-6 6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    move: '<path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3"/>',
    // champs
    box: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.6 3.1-6 7-6s7 2.4 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.6 4 6"/>',
    hash: '<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    pin: '<path d="M12 22s7-6.4 7-12a7 7 0 0 0-14 0c0 5.6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    // états
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    check: '<path d="m5 12 5 5L20 7"/>'
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.RepositoryIcons = {
    /** SVG d'une icône (chaîne) ; décorative (aria-hidden) sauf si title est donné. Nom inconnu : chaîne vide. */
    svg(name, { size, title = '' } = {}) {
      const body = P[name];
      if (!body) return '';
      const a11y = title ? `role="img" aria-label="${esc(title)}"` : 'aria-hidden="true" focusable="false"';
      // taille explicite : variable --rs (block_icons.css l'impose, même face à une règle « svg{…} » de la page) ;
      // sinon, taille du contexte (bloc, sous-carte, bouton…)
      const px = size || 20, rs = size ? ` style="--rs:${size}px"` : '';
      return `<svg class="repo-svg" viewBox="0 0 24 24" width="${px}" height="${px}"${rs} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${title ? `<title>${esc(title)}</title>` : ''}${body}</svg>`;
    },
    has: name => name in P,
    names: () => Object.keys(P),
    /** Ajoute (ou remplace) une icône : tracés SVG sur la grille 24 × 24, sans couleur ni épaisseur propres. */
    add(name, paths) { P[name] = paths; },
    /** Tracés bruts (pour composer une image CSS, ex. masque). */
    paths: name => P[name] || ''
  };
})();
