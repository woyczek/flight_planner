// Illustrations des designs à matières (décor complet) : frise de bureau de Cabinet (portefeuille de cuir, corde,
// longue-vue en laiton, carte ancienne tamponnée), panneaux de Durci (plaque DEFA au pochoir, écran radar tournant,
// voyants de sauvegarde). Chargé par repository_nav.js avec designs_skeuo.css ; élément .repo-deco posé avant le pied
// de page, reconstruit au changement de design ou de langue, masqué en décor sobre, à l'impression et sous 760 px.
// Décoratif (aria-hidden), sauf le voyant de sauvegarde de Durci (état réel : html[data-dirty], browser_store.js).
(() => {
  'use strict';
  const nav = window.RepositoryNav;
  if (!nav || window.RepositoryDeco) return;
  const script = document.currentScript, TX = new URL('textures/', script.src).href;
  const L = ['fr', 'en', 'de', 'es'], li = () => Math.max(0, L.indexOf(nav.getLanguage?.() || 'fr'));
  const T = {
    ops: ['Opérations cartographiques', 'Mapping operations', 'Kartografische Einsätze', 'Operaciones cartográficas'],
    saved: ['Données sauvegardées', 'Data saved', 'Daten gesichert', 'Datos guardados'],
    dirty: ['Modifications à sauvegarder', 'Changes to save', 'Änderungen zu sichern', 'Cambios por guardar'],
    stamp: ['CONFIDENTIEL', 'CONFIDENTIAL', 'VERTRAULICH', 'CONFIDENCIAL'],
    radar: ['Radar de veille', 'Surveillance radar', 'Überwachungsradar', 'Radar de vigilancia']
  };
  const tr = k => T[k][li()] || T[k][0];
  const pat = (id, img, size) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><image href="${TX}${img}.webp" width="${size}" height="${size}"/></pattern>`;
  const brass = id => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".35" stop-color="#d6ae55"/><stop offset=".7" stop-color="#8a6526"/><stop offset="1" stop-color="#4a3510"/></linearGradient>`;

  /** Frise de bureau (Cabinet) : SVG 1200 × 130 étiré en largeur, matières par motifs de textures. */
  function cabinet() {
    const rope = (() => { let d = ''; for (let r = 30; r >= 10; r -= 6.5) d += `<circle cx="210" cy="70" r="${r}" fill="none" stroke="url(#dRope)" stroke-width="7"/><circle cx="210" cy="70" r="${r}" fill="none" stroke="#5a4020" stroke-width="7" stroke-dasharray="2 5" opacity=".55"/>`; return d; })();
    const rose = `<g transform="translate(640 66)"><circle r="30" fill="none" stroke="#5b4a2e" stroke-width=".8"/><circle r="24" fill="none" stroke="#5b4a2e" stroke-width=".5"/>${[0, 90, 180, 270].map(a => `<path d="M0-28 4-4 0 0-4-4z" fill="#3a2d18" transform="rotate(${a})"/>`).join('')}${[45, 135, 225, 315].map(a => `<path d="M0-18 3-3 0 0-3-3z" fill="#7a6440" transform="rotate(${a})"/>`).join('')}<text y="-32" font-size="9" font-family="Georgia,serif" text-anchor="middle" fill="#3a2d18">N</text></g>`;
    const ship = `<g transform="translate(830 60) scale(.9)" fill="none" stroke="#3a2d18" stroke-width="1.1"><path d="M-30 18h60l-8 10h-44z" fill="#6b5436"/><path d="M-12 18V-28M8 18V-22M24 18V-8"/><path d="M-12-26c10 6 10 20 0 30M-12-12c-12 6-12 16 0 24M8-20c9 6 9 18 0 26M24-8c6 5 6 12 0 16" fill="#e8dcc0"/><path d="M-40 32c10-3 20 3 30 0s20-3 30 0 20 3 30 0" stroke="#5a7a8a"/></g>`;
    return `<svg viewBox="0 0 1200 130" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><defs>${pat('dWood', 'wood', 256)}${pat('dLeather', 'leather-brown', 128)}${pat('dNavy', 'leather-navy', 128)}${pat('dPaper', 'parchment', 256)}${brass('dBrass')}
        <linearGradient id="dRope" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9b27a"/><stop offset="1" stop-color="#8a6534"/></linearGradient>
        <filter id="dShadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="3" dy="5" stdDeviation="4" flood-opacity=".55"/></filter></defs>
      <rect width="1200" height="130" fill="url(#dWood)"/><rect width="1200" height="130" fill="#000" opacity=".15"/>
      <g filter="url(#dShadow)"><path d="M-10 18h130l12 12v110H-10z" fill="url(#dLeather)"/><path d="M-4 26h118l8 8v96" fill="none" stroke="#e0c08a" stroke-width="1.5" stroke-dasharray="5 4" opacity=".7"/><circle cx="100" cy="40" r="6" fill="url(#dBrass)" stroke="#4a3510"/></g>
      <g filter="url(#dShadow)">${rope}</g>
      <g filter="url(#dShadow)" transform="rotate(-4 400 80)"><path d="M280 86l110-8v20l-110-8z" fill="url(#dBrass)" stroke="#4a3510"/><rect x="386" y="72" width="80" height="32" rx="3" fill="url(#dBrass)" stroke="#4a3510"/><rect x="462" y="68" width="26" height="40" rx="3" fill="url(#dBrass)" stroke="#4a3510"/>
        <rect x="330" y="80" width="40" height="16" fill="#3a1e0e" opacity=".75"/><rect x="400" y="72" width="8" height="32" fill="#6b4d15" opacity=".5"/><rect x="440" y="72" width="8" height="32" fill="#6b4d15" opacity=".5"/><ellipse cx="490" cy="88" rx="4" ry="18" fill="#9fc3d8" stroke="#4a3510"/><ellipse cx="280" cy="88" rx="2.5" ry="8" fill="#4a3510"/></g>
      <g filter="url(#dShadow)" transform="rotate(2 740 70)"><path d="M540 12h400l-6 112H546z" fill="url(#dPaper)" stroke="#9c7a44"/><path d="M548 104c40-10 60-40 110-34s70 30 120 22 70-40 140-30" fill="none" stroke="#5a7a8a" stroke-width="1.4"/><path d="M570 40c30 6 40 30 80 20s60-28 90-16" fill="none" stroke="#8a6a45" stroke-width=".9"/>${rose}${ship}
        <g transform="rotate(-12 880 40)"><rect x="826" y="26" width="112" height="26" rx="3" fill="none" stroke="#a3261c" stroke-width="2.4" opacity=".8"/><text x="882" y="45" font-family="Courier New,monospace" font-weight="700" font-size="14" fill="#a3261c" text-anchor="middle" opacity=".85">${tr('stamp')}</text></g></g>
      <g filter="url(#dShadow)"><path d="M1010 22h200v120h-200z" fill="url(#dNavy)"/><path d="M1018 30h190" fill="none" stroke="#e0c08a" stroke-width="1.5" stroke-dasharray="5 4" opacity=".7"/><path d="M1010 22h34l-34 34z" fill="url(#dBrass)" stroke="#4a3510"/><rect x="1004" y="60" width="12" height="40" rx="3" fill="url(#dBrass)" stroke="#4a3510"/></g>
    </svg>`;
  }

  /** Panneaux de Durci : plaque DEFA, écran radar (balayage, cercles, côte, plots), voyants de sauvegarde. */
  function field() {
    return `<div class="repo-deco-plate"><span class="repo-deco-emblem">${window.RepositoryIcons?.emblem?.('wings-globe') || ''}</span><span><b>DEFA</b><small>${tr('ops')}</small></span></div>
      <div class="repo-deco-radar" title="${tr('radar')}"><svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="rgba(120,255,140,.28)"><circle cx="200" cy="60" r="30"/><circle cx="200" cy="60" r="60"/><circle cx="200" cy="60" r="90"/><circle cx="200" cy="60" r="120"/><path d="M200 0v120M0 60h400"/></g>
        <path d="M0 96c40-14 70 4 110-8s50-40 100-36 60 30 110 20 50-30 80-26" fill="none" stroke="rgba(140,255,160,.6)" stroke-width="1.5"/><path d="M40 20c20 10 50 4 70 16" fill="none" stroke="rgba(140,255,160,.35)"/></svg>
        <span class="repo-deco-sweep"></span><i style="left:66%;top:28%"></i><i style="left:30%;top:64%;--c:#7dff8a"></i><i style="left:82%;top:70%;--c:#ffd24d"></i></div>
      <div class="repo-deco-status"><span class="repo-deco-leds"><i class="led-save"></i><i class="led-on"></i><i></i></span><span class="repo-deco-state"></span></div>`;
  }

  let el = null;
  function render() {
    const d = document.documentElement.dataset.design, make = { cabinet, field }[d];
    if (!make) { el?.remove(); el = null; return; }
    if (!el) { el = document.createElement('div'); el.className = 'repo-deco no-print'; el.setAttribute('aria-hidden', d === 'field' ? 'false' : 'true'); }
    el.dataset.for = d;
    el.innerHTML = make();
    const foot = document.querySelector('body>footer.repo-footer');
    if (foot) foot.before(el); else document.body.append(el);
    state();
  }
  /** Libellé du voyant de sauvegarde (Durci). */
  function state() {
    const s = el?.querySelector('.repo-deco-state');
    if (s) s.textContent = tr(document.documentElement.dataset.dirty === '1' ? 'dirty' : 'saved');
  }
  window.addEventListener('repository-design-change', render);
  window.addEventListener('repository-language-change', render);
  new MutationObserver(state).observe(document.documentElement, { attributes: true, attributeFilter: ['data-dirty'] });
  // le pied de page est posé au chargement complet (app_framework.js) : la frise se range devant lui
  if (document.readyState === 'complete') render(); else window.addEventListener('load', render);
  render();
  window.RepositoryDeco = { render };
})();
