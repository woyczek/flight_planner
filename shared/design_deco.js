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
    flightlog: {
      foot: img => `<img class="repo-deco-strip" src="${img('footer')}" alt="">`,
      between: [['clip', 130], ['gauge-attitude', 84], ['gauge-speed', 84], ['gauge-alt', 84]],
      sides: [['gauge-speed', 120], ['chart', 230], ['gauge-attitude', 120], ['clip', 150], ['gauge-alt', 120]]
    },
    field: {
      foot: img => `<div class="repo-deco-plate-img"><img src="${img('plate-defa')}" alt=""></div>
        <div class="repo-deco-radar" title="${tr('radar')}"><img src="${img('radar')}" alt=""><span class="repo-deco-sweep"></span><i style="left:30%;top:36%;--c:#7dff8a"></i><i style="left:44%;top:66%;--c:#7dff8a"></i></div>
        <div class="repo-deco-status"><img src="${img('plane-plate')}" alt="" onerror="this.remove()"><span class="repo-deco-leds"><i class="led-save"></i><i class="led-on"></i><i></i></span><span class="repo-deco-state"></span></div>`,
      between: [['plate-attention', 210], ['handle-h', 120], ['plate-wings', 170], ['plate-defa', 200]],
      sides: [['stencil-mission', 150], ['grille', 80], ['stencil-defa', 130], ['plate-small', 90], ['stencil-ops', 160], ['nut', 40]]
    }
  };
  // Fonds illustrés des blocs (designs à matières, décor complet ou sobre) : un bloc marqué data-deco-bg="<clé>"
  // (reporting : aerodromes, capabilities, outcomes, aircraft) reçoit shared/deco/<design>/bg-<clé>.webp, sous son
  // contenu, fondu vers le bas et la droite. Seules les images déclarées ici sont chargées (pas de requête inutile).
  // Mode « anchor » : taille d'origine, calée en haut à gauche, s'étend vers la droite et le bas (coupée au bord du
  // bloc) ; « cover » : redimensionnée pour couvrir le bloc. Exemple : field: { aerodromes: 'anchor' }.
  // Entrée : mode, ou [mode, cadrage (background-position), image « <design>/<nom> » (défaut : <design>/bg-<clé>),
  // opacité (défaut : celle du design, designs_skeuo.css)].
  // Cabinet (bleu marine et or) : piste au pied des montagnes, relief et réticule, mappemonde et rose des vents, globe ;
  // Carnet de vol : ceux de Cabinet, résultats sur cuir et mappemonde aux avions ; Durci : panneaux olive rivetés
  // (courbes de niveau à gauche, plans d'avions à droite) et métal bronze aux tracés de navigation ; Aqua : eau et
  // verre, cadrés différemment sur chaque bloc.
  const BG = {
    // Cabinet : série marine (cuir marine, tracés or) : archipel et porte-avions (terrains de départ), barre à roue
    // (familles), ancre aux lauriers (résultats), flotte et phare (séries), frégate et hélicoptère (types d'appareil),
    // radar, grue et dôme (capacités), soleil et lune (jour / nuit), satellites et proue (réseau), chenal balisé
    // (contexte) ; pas de fond derrière le graphique d'activité (barres et légende)
    cabinet: { aerodromes: 'cover', families: 'cover', outcomes: 'cover', series: 'cover', aircraft: 'cover', capabilities: 'cover', daynight: 'cover', network: 'cover', context: 'cover' },
    // Carnet de vol : jeu propre (cuir marine, tracés or) : hélicoptères et montagnes, rose des vents sur mappemonde,
    // biplan et globe, globes et routes, montage aviation, piste de nuit (jour / nuit), piste au pied des montagnes
    // (terrains de départ) ; cuir et mappemonde aux avions en réserve
    flightlog: { aerodromes: ['cover', 'center', null, .5], daynight: ['cover', 'center bottom'], capabilities: ['cover', 'center'], outcomes: ['cover', 'center'], aircraft: ['cover', 'center'], series: ['cover', 'center'], families: ['cover', 'center'] },
    field: { aerodromes: ['cover', 'left center', 'field/bg-panels'], capabilities: ['cover', 'left top', 'field/bg-chart'], outcomes: ['cover', 'right center', 'field/bg-chart'], aircraft: ['cover', 'right center', 'field/bg-panels'] },
    aqua: { aerodromes: ['cover', 'center bottom', 'aqua/bg-water'], capabilities: ['cover', 'left center', 'aqua/bg-water'], outcomes: ['cover', 'center top', 'aqua/bg-water'], aircraft: ['cover', 'right center', 'aqua/bg-water'] }
  };
  function backgrounds(d) {
    document.querySelectorAll('.repo-deco-bgimg').forEach(n => n.remove());
    document.querySelectorAll('.repo-has-bg').forEach(b => b.classList.remove('repo-has-bg'));
    const list = BG[d];
    if (!list) return;
    document.querySelectorAll('[data-deco-bg]').forEach(b => {
      const e = list[b.dataset.decoBg];
      if (!e) return;
      const [mode, pos, file, alpha] = Array.isArray(e) ? e : [e], [fd, fn] = (file || `${d}/bg-${b.dataset.decoBg}`).split('/');
      const el = document.createElement('div');
      el.className = `repo-deco-bgimg repo-deco-bg-${mode}`;
      el.setAttribute('aria-hidden', 'true');
      el.style.backgroundImage = `url("${DECO(fd)(fn)}")`;
      if (pos) el.style.backgroundPosition = pos;
      if (alpha != null) el.style.opacity = alpha;
      b.classList.add('repo-has-bg');
      b.prepend(el);
    });
  }
  let nodes = [];
  const clear = () => { nodes.forEach(n => n.remove()); nodes = []; };
  function render() {
    clear();
    const d = document.documentElement.dataset.design, set = SETS[d];
    backgrounds(d);
    if (!set || document.documentElement.dataset.decor !== 'full') return;
    const img = n => d === 'field' && n === 'plane-plate' ? new URL(`icons/skeuo/field/plane-plate.webp${V}`, script.src).href : DECO(d)(n);
    // 1. pied de page
    const foot = document.createElement('div');
    foot.className = 'repo-deco no-print';
    foot.dataset.for = d;
    foot.innerHTML = set.foot(img);
    // radar : chaque plot s'allume au passage du front (rotation horaire de 5 s partant du haut, centre 37,9 % / 49,3 %
    // d'un écran 3:1) → délai d'animation = angle du plot (depuis le haut, sens horaire) / 360 × période
    foot.querySelectorAll('.repo-deco-radar i').forEach(b => {
      const dx = (parseFloat(b.style.left) - 37.9) * 3, dy = parseFloat(b.style.top) - 49.3, a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      b.style.animationDelay = `${(a / 360 * 5).toFixed(2)}s`;
    });
    const footer = document.querySelector('body>footer.repo-footer');
    if (footer) footer.before(foot); else document.body.append(foot);
    nodes.push(foot);
    state();
    // 2. entre les blocs : un intervalle sur deux, dans chaque conteneur de blocs
    let k = 0;
    const parents = new Set([...document.querySelectorAll('.repo-block')].map(b => b.parentElement));
    parents.forEach(p => {
      // conteneur en grille ou en rangée flex : un élément inséré y deviendrait une cellule (décor sur un titre,
      // grille décalée) → pas de décor entre ces blocs
      const pd = getComputedStyle(p);
      if (/grid/.test(pd.display) || (/flex/.test(pd.display) && !/column/.test(pd.flexDirection))) return;
      const blocks = [...p.children].filter(x => x.classList.contains('repo-block') && !x.hidden && x.offsetHeight);
      // blocs empilés verticalement seulement (pas de grille à colonnes : l'élément tomberait au milieu d'une rangée)
      blocks.slice(1).forEach((b, i) => {
        // voisin immédiat seulement (un autre élément entre les deux, grille de graphiques… : l'écart mesuré
        // traverserait cet élément), blocs l'un sous l'autre, même colonne, écart raisonnable
        const pr = blocks[i].getBoundingClientRect(), nr = b.getBoundingClientRect(), gap0 = nr.top - pr.bottom;
        if (i % 2 || b.previousElementSibling !== blocks[i] || Math.abs(nr.left - pr.left) > 4 || gap0 < 0 || gap0 > 80) return;
        const [name, w, pair] = set.between[k++ % set.between.length], sep = document.createElement('div');
        sep.className = 'repo-deco-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.innerHTML = pair ? `<img src="${img(name)}" alt="" style="width:${w}px;margin-left:-60px"><img src="${img(name)}" alt="" style="width:${w}px;margin-left:60px">` : `<img src="${img(name)}" alt="" style="width:${w}px">`;
        sep.style.top = `${-gap0 / 2}px`;
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
      const x = (col.left - body.left - w) / 2, top = y + (n % 3) * 40;   // centré dans la marge
      // jamais au-delà du bas de la page (sinon la page s'allonge, la barre de défilement apparaît, la marge rétrécit,
      // le décor disparaît… et ainsi de suite : barres qui clignotent)
      if (top + w * 1.4 > H - 30) break;
      el.style.cssText = `width:${w}px;top:${top}px;${left ? `left:${x}px` : `right:${x}px`};transform:rotate(${[-8, 5, -3, 7][n % 4]}deg)`;
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
  // mise en page qui change après coup (contenu chargé, blocs passés en grille par la page…) : décors recalculés
  // (les décors eux-mêmes ne changent pas la taille de la page : hauteur nulle, position absolue)
  let lastH = 0;
  new ResizeObserver(() => { const h = Math.round(document.body.scrollHeight / 40); if (h !== lastH) { lastH = h; later(); } }).observe(document.body);
  new MutationObserver(state).observe(document.documentElement, { attributes: true, attributeFilter: ['data-dirty'] });
  // blocs et pied de page posés au chargement complet (app_framework.js) ; les pages rendues plus tard (CR) se
  // stabilisent ensuite : nouvelle passe après une seconde
  if (document.readyState === 'complete') render(); else window.addEventListener('load', () => { render(); setTimeout(render, 1200); });
  window.RepositoryDeco = { render };
})();
