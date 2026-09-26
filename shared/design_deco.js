// Décors des designs à matières (décor complet ; images découpées dans les planches de maquette, shared/deco/<design>/,
// tools/icons_from_sheets.html) : frise de pied de page, éléments posés entre les blocs (hauteur nulle : la mise en
// page ne bouge pas) et dans les marges de la page (grands écrans). Chargé par repository_nav.js avec
// designs_skeuo.css ; reconstruit au changement de design, de langue et de taille de fenêtre ; invisible dans les autres
// designs, en décor sobre, sous 760 px et à l'impression. Décoratif (aria-hidden), sauf le voyant de sauvegarde de
// Durci (état réel : html[data-dirty], browser_store.js).
(() => {
  'use strict';
  const nav = window.RepositoryNav;
  if (!nav || window.RepositoryDeco) return;
  const script = document.currentScript, V = new URL(script.src).search, DECO = d => n => new URL(`deco/${d}/${n}.webp${V}`, script.src).href;
  const L = ['fr', 'en', 'de', 'es'], li = () => Math.max(0, L.indexOf(nav.getLanguage?.() || 'fr'));
  const T = {
    saved: ['Données sauvegardées', 'Data saved', 'Daten gesichert', 'Datos guardados'],
    dirty: ['Modifications à sauvegarder', 'Changes to save', 'Änderungen zu sichern', 'Cambios por guardar'],
    radar: ['Radar de veille', 'Surveillance radar', 'Überwachungsradar', 'Radar de vigilancia']
  };
  const tr = k => T[k][li()] || T[k][0];
  // décors par design : pied de page, entre les blocs (tour à tour), marges (gauche / droite, tour à tour)
  const SETS = {
    cabinet: {
      foot: img => `<img class="repo-deco-strip" src="${img('footer')}" alt="">`,
      between: [['clip', 150], ['tack', 22, 'pair']],
      sides: [['compass', 118], ['map', 230], ['clip', 190], ['medal-1', 60]]
    },
    field: {
      foot: img => `<div class="repo-deco-plate-img"><img src="${img('plate-defa')}" alt=""></div>
        <div class="repo-deco-radar" title="${tr('radar')}"><img src="${img('radar')}" alt=""><span class="repo-deco-sweep"></span><i style="left:73%;top:44%"></i><i style="left:30%;top:64%;--c:#7dff8a"></i></div>
        <div class="repo-deco-status"><img src="${img('plane-plate')}" alt="" onerror="this.remove()"><span class="repo-deco-leds"><i class="led-save"></i><i class="led-on"></i><i></i></span><span class="repo-deco-state"></span></div>`,
      between: [['plate-attention', 210], ['handle-h', 120], ['plate-wings', 170], ['plate-defa', 200]],
      sides: [['stencil-mission', 150], ['grille', 80], ['stencil-defa', 130], ['plate-small', 90], ['stencil-ops', 160], ['nut', 40]]
    }
  };
  let nodes = [];
  const clear = () => { nodes.forEach(n => n.remove()); nodes = []; };
  function render() {
    clear();
    const d = document.documentElement.dataset.design, set = SETS[d];
    if (!set || document.documentElement.dataset.decor !== 'full') return;
    const img = n => d === 'field' && n === 'plane-plate' ? new URL(`icons/skeuo/field/plane-plate.webp${V}`, script.src).href : DECO(d)(n);
    // 1. pied de page
    const foot = document.createElement('div');
    foot.className = 'repo-deco no-print';
    foot.dataset.for = d;
    foot.innerHTML = set.foot(img);
    const footer = document.querySelector('body>footer.repo-footer');
    if (footer) footer.before(foot); else document.body.append(foot);
    nodes.push(foot);
    state();
    // 2. entre les blocs : un intervalle sur deux, dans chaque conteneur de blocs
    let k = 0;
    const parents = new Set([...document.querySelectorAll('.repo-block')].map(b => b.parentElement));
    parents.forEach(p => {
      const blocks = [...p.children].filter(x => x.classList.contains('repo-block') && !x.hidden && x.offsetHeight);
      // blocs empilés verticalement seulement (pas de grille à colonnes : l'élément tomberait au milieu d'une rangée)
      blocks.slice(1).forEach((b, i) => {
        if (i % 2 || Math.abs(b.getBoundingClientRect().left - blocks[i].getBoundingClientRect().left) > 4) return;
        const [name, w, pair] = set.between[k++ % set.between.length], sep = document.createElement('div');
        sep.className = 'repo-deco-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.innerHTML = pair ? `<img src="${img(name)}" alt="" style="width:${w}px;margin-left:-60px"><img src="${img(name)}" alt="" style="width:${w}px;margin-left:60px">` : `<img src="${img(name)}" alt="" style="width:${w}px">`;
        const gap = (b.getBoundingClientRect().top - blocks[i].getBoundingClientRect().bottom) / 2;
        sep.style.top = `${-gap}px`;
        b.before(sep);
        nodes.push(sep);
      });
    });
    // 3. marges de la page (grands écrans) : un élément tous les ~650 px, alternativement à gauche et à droite
    // marge = espace libre entre le bord de la page (body, position relative) et la colonne de contenu (main)
    const body = document.body.getBoundingClientRect(), col = (document.querySelector('body>main') || document.body).getBoundingClientRect(),
      gutter = Math.min(col.left - body.left, body.right - col.right) - 10, H = document.body.scrollHeight;
    if (gutter < 90) return;
    let side = 0;
    for (let y = 180, n = 0; y < H - 200; y += 650, n++) {
      const [name, w0] = set.sides[n % set.sides.length], w = Math.min(w0, gutter - 24), left = side++ % 2 === 0;
      if (w < 36) continue;
      const el = document.createElement('img');
      el.className = 'repo-deco-side';
      el.src = img(name);
      el.alt = '';
      el.setAttribute('aria-hidden', 'true');
      const x = (col.left - body.left - w) / 2;   // centré dans la marge
      el.style.cssText = `width:${w}px;top:${y + (n % 3) * 40}px;${left ? `left:${x}px` : `right:${x}px`};transform:rotate(${[-8, 5, -3, 7][n % 4]}deg)`;
      document.body.append(el);
      nodes.push(el);
    }
  }
  /** Libellé du voyant de sauvegarde (Durci). */
  function state() {
    const s = document.querySelector('.repo-deco .repo-deco-state');
    if (s) s.textContent = tr(document.documentElement.dataset.dirty === '1' ? 'dirty' : 'saved');
  }
  let timer = 0;
  const later = () => { clearTimeout(timer); timer = setTimeout(render, 250); };
  window.addEventListener('repository-design-change', later);
  window.addEventListener('repository-language-change', later);
  window.addEventListener('resize', later);
  new MutationObserver(state).observe(document.documentElement, { attributes: true, attributeFilter: ['data-dirty'] });
  // blocs et pied de page posés au chargement complet (app_framework.js) ; les pages rendues plus tard (CR) se
  // stabilisent ensuite : nouvelle passe après une seconde
  if (document.readyState === 'complete') render(); else window.addEventListener('load', () => { render(); setTimeout(render, 1200); });
  window.RepositoryDeco = { render };
})();
