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
    radar: ['Radar de veille', 'Surveillance radar', 'Überwachungsradar', 'Radar de vigilancia'],
    saveNow: ['Sauvegarder maintenant dans le dossier de sauvegarde', 'Save now to the backup folder', 'Jetzt im Sicherungsordner sichern', 'Guardar ahora en la carpeta de copia']
  };
  const tr = k => T[k][li()] || T[k][0];
  // décors par design : pied de page, entre les blocs (tour à tour), marges (gauche / droite, tour à tour)
  const SETS = {
    cabinet: {
      foot: img => `<img class="repo-deco-strip" src="${img('footer')}" alt="">`,
      // objets des années 1930 (planches « objets 1930 » et objets de face) : entre les blocs, trombone, règle parallèle,
      // punaises, crayon, enveloppe cachetée, porte-mine (décentré, incliné), étiquette « Top secret » ; appareil de page :
      // livre de bord et poste radio ; en marge, compas marin, cartes,
      // sextant, valise, enveloppe « Confidentiel », rapporteur, livre de bord, pointes sèches, pavillon
      // appareil de page : [image, hauteur px, inclinaison °] ; livre de bord posé à côté du poste, calés à droite
      device: [['notebook', 170, -7], ['radio', 225]],
      between: [['clip', 150], ['pen', 150, { x: -190, rot: 30 }], ['parallel-rule', 170, { x: 220, y: -38, rot: 18 }], ['tack', 22, 'pair'], ['pencil', 150], ['envelope-seal', 130], ['tag-secret', 140]],
      sides: [['ship-compass', 110], ['chart-coast', 170], ['sextant', 140], ['map', 200], ['suitcase', 150], ['envelope-confidential', 150], ['protractor', 140], ['dividers', 60], ['flag', 120]]
    },
    flightlog: {
      foot: img => `<img class="repo-deco-strip" src="${img('footer')}" alt="">`,
      between: [['clip', 130], ['gauge-attitude', 84], ['gauge-speed', 84], ['gauge-alt', 84]],
      sides: [['gauge-speed', 120], ['chart', 230], ['gauge-attitude', 120], ['clip', 150], ['gauge-alt', 120]]
    },
    field: {
      foot: img => `<div class="repo-deco-plate-img"><img src="${img('plate-defa')}" alt=""></div>
        <div class="repo-deco-radar" title="${tr('radar')}"><div class="repo-deco-radar-stage"><img src="${img('radar')}" alt=""><span class="repo-deco-sweep"></span><i style="left:30.7%;top:33.5%;--c:#7dff8a"></i><i style="left:65.6%;top:59.6%;--c:#7dff8a"></i><i style="left:72%;top:79.5%;--c:#7dff8a"></i><i style="left:30.96%;top:82.6%;--c:#7dff8a"></i><i style="left:82.95%;top:46.44%;--c:#ff4d3d"></i></div></div>
        <button type="button" class="repo-deco-status repo-plain"><img src="${img('plane-plate')}" alt="" onerror="this.remove()"><span class="repo-deco-leds"><i class="led-save"></i><i class="led-on"></i><i></i></span><span class="repo-deco-state"></span></button>`,
      // objets du pupitre (grille d'aération, lampe grillagée, plaque vierge, blindage riveté, interrupteur à capot,
      // câble et connecteurs, cadran) intercalés entre les plaques et pochoirs d'origine
      between: [['plate-attention', 210], ['louvre', 150], ['handle-h', 120], ['cable', 170], ['plate-wings', 170], ['plate-blank', 180], ['plate-defa', 200], ['armor', 140]],
      sides: [['stencil-mission', 150], ['lamp', 100], ['dial', 110], ['stencil-defa', 130], ['toggle', 80], ['cable', 170], ['stencil-ops', 160], ['armor', 140], ['louvre', 130]]
    }
  };
  // Fonds illustrés des blocs (designs à matières, décor complet ou sobre) : un bloc marqué data-deco-bg="<clé>"
  // (reporting : aerodromes, capabilities, outcomes, aircraft, families, series, daynight, network, context ; studio
  // cartographique : maps ; éditeur de missions : import, identification ; planificateur : result) reçoit shared/deco/<design>/bg-<clé>.webp, sous son
  // contenu, fondu vers le bas et la droite. Seules les images déclarées ici sont chargées (pas de requête inutile).
  // Mode « anchor » : taille d'origine, calée en haut à gauche, s'étend vers la droite et le bas (coupée au bord du
  // bloc) ; « cover » : redimensionnée pour couvrir le bloc ; « side » (blocs larges) : à la hauteur du bloc, calée à
  // droite, fondue vers la gauche (le texte, à gauche, reste sur la matière unie). Exemple : aqua: { aerodromes: 'anchor' }.
  // Entrée : mode, ou [mode, cadrage (background-position), image « <design>/<nom> » (défaut : <design>/bg-<clé>),
  // opacité (défaut : celle du design, designs_skeuo.css)].
  // Carnet de vol : fonds propres (cuir, tracés or) ; Aqua : eau et verre, cadrés différemment sur chaque bloc.
  const BG = {
    // Cabinet et Durci : plus de fonds illustrés propres, les panneaux par thème (PANELS) habillent tous les blocs
    // Carnet de vol : jeu propre (cuir marine, tracés or) : hélicoptères et montagnes, rose des vents sur mappemonde,
    // biplan et globe, globes et routes, montage aviation, piste de nuit (jour / nuit), piste au pied des montagnes
    // (terrains de départ) ; cuir et mappemonde aux avions en réserve
    flightlog: { aerodromes: ['cover', 'center', null, .5], daynight: ['cover', 'center bottom'], capabilities: ['cover', 'center'], outcomes: ['cover', 'center'], aircraft: ['cover', 'center'], series: ['cover', 'center'], families: ['cover', 'center'] },
    aqua: { aerodromes: ['cover', 'center bottom', 'aqua/bg-water'], capabilities: ['cover', 'left center', 'aqua/bg-water'], outcomes: ['cover', 'center top', 'aqua/bg-water'], aircraft: ['cover', 'right center', 'aqua/bg-water'] }
  };
  // panneaux d'habillage : thème choisi d'après le bloc (titre, puis icône et identifiant, puis sous-titre), dans l'ordre
  // du tableau ; fichiers shared/deco/<design>/<dossier>/panel-<thème>-<w|t> (w paysage, t portrait)
  const THEMES = [
    ['aircraft', /aircraft|appareil|avion|a[ée]ronef|plane|helico|h[ée]lico|flotte|fleet|perf|masse|\bmass|mtow|centrage/],
    ['airfield', /a[ée]rodrome|airfield|airport|terrain|piste|runway|landing|atterriss|d[ée]collage|takeoff|\bsia\b|oaci|icao/],
    ['time', /day|night|jour|nuit|clock|heure|horaire|horodat|time|calendar|date|dur[ée]e|p[ée]riode|period|activit|planning|odv|m[ée]t[ée]o|weather/],
    ['radio', /network|r[ée]seau|radio|comm|fr[ée]quen|link|send|sync|source|mise à jour|update|maintenance|database|base|sauvegarde|backup|import|export/],
    ['nav', /map|carte|route|navig|profil|trajet|flight|\bvol\b|fuel|carbur|vent|wind|target|cible|layers/],
    ['gear', /[ée]quipement|mat[ée]riel|gear|\bbox\b|cargo|m[ée]dic|patient|hems|medevac|capabilit|capacit|charge|load|emport/],
    ['awards', /outcome|r[ée]sultat|result|succ[eè]s|valid|award|m[ée]daille|summary|synth[eè]se|bilan|chart|statist|breakdown|r[ée]partition|calcul/],
    ['families', /famil|s[ée]rie|series|type|mission|cat[ée]gor/],
    ['ops', /./]
  ];
  // par design : dossier des panneaux (Cabinet : jeu « années 1930 » ; un jeu « 1800 » attend dans cabinet/1800 : changer
  // ici dir: '1930' en dir: '1800' une fois ses panneaux convertis) et orientations disponibles quand il en manque une
  // clair : jeu propre au ton clair (dir, et alias : thème → panneau du jeu quand il a moins de thèmes)
  const PANELS = {
    field: { dir: '', only: { awards: 't', families: 't' } },
    cabinet: {
      dir: '1930', only: {},
      // ton clair : fonds ivoire (cartes côtières, paquebot, hydravions, instruments) ; même remplacement 1930 → 1800
      clair: { dir: '1930/clair', only: { instruments: 'w' /* portrait à venir */ }, alias: { airfield: 'nav', ops: 'ships', families: 'ships', awards: 'ships', gear: 'instruments', radio: 'instruments', time: 'instruments' } }
    }
  };
  // objets posés dans un bloc (coin bas droit, sous le contenu) : premier motif reconnu dans le titre, l'icône ou
  // l'identifiant ; [motif, image du design, largeur px]
  const PROPS = {
    cabinet: [
      [/ordre|order|t[âa]che|task|briefing/, 'order', 130],
      [/secret|confiden|classif|diffusion|privacy|personnel/, 'tag-secret', 170],
      [/ledger|registre|registry|journal|rapport|report|remarque|compte rendu|documents?\b/, 'dossier', 150]
    ]
  };
  // feuille de registre (Cabinet, ton clair) : blocs de tableau des registres et journaux ; dessin : designs_skeuo.css
  const SHEETS = { cabinet: /registre|registry|ledger|journal|missions?\s*\(|choisir une mission|choose a mission/ };
  function sheets(d) {
    const re = SHEETS[d], doc = document.documentElement;
    if (!re || doc.dataset.decor !== 'full' || doc.dataset.tone === 'dark') return;
    document.querySelectorAll('.repo-block').forEach(b => {
      // largeur mini : en-tête entier (780 px à l'échelle 1, --k = .7) et un peu de papier
      if (b.hidden || b.offsetWidth < 640 || b.parentElement.closest('.repo-block') || !b.querySelector('table')) return;
      if (!re.test([b.querySelector('h2,h3')?.textContent, b.dataset.icon, b.dataset.blockId].join(' ').toLowerCase())) return;
      const el = document.createElement('div');
      el.className = 'repo-deco-sheet';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<i class="sh-paper"></i><i class="sh-frame"></i>';
      b.classList.add('repo-has-sheet', 'repo-has-bg');
      b.prepend(el);
    });
  }
  function props(d) {
    const list = PROPS[d];
    if (!list || document.documentElement.dataset.decor !== 'full') return;
    document.querySelectorAll('.repo-block').forEach(b => {
      if (b.hidden || b.offsetHeight < 200 || b.offsetWidth < 480 || b.parentElement.closest('.repo-block')) return;
      const txt = [b.querySelector('h2,h3')?.textContent, b.dataset.icon, b.dataset.blockId].join(' ').toLowerCase(),
        hit = list.find(([re]) => re.test(txt));
      if (!hit) return;
      const el = document.createElement('img');
      el.className = 'repo-deco-prop';
      el.alt = '';
      el.setAttribute('aria-hidden', 'true');
      el.src = DECO(d)(hit[1]);
      el.style.width = `${hit[2]}px`;
      b.classList.add('repo-has-prop');
      b.append(el);
    });
  }
  /** Panneau du bloc : thème reconnu ; même panneau que le bloc précédent → l'autre orientation, puis le thème suivant. */
  function panelOf(b, set, prev) {
    const o = b.offsetWidth >= b.offsetHeight ? 'w' : 't', hit = s => THEMES.filter(([, re]) => re.test(String(s || '').toLowerCase())),
      themes = [b.querySelector('h2,h3')?.textContent, `${b.dataset.icon || ''} ${b.dataset.blockId || ''}`, b.dataset.subtitle]
        .map(hit).find(h => h.length > 1) || hit('-'),
      files = [...new Set(themes.map(([n]) => set.alias?.[n] || n))].flatMap(n => { const or = set.only[n] || 'wt'; return [or.includes(o) ? o : or, ...or.replace(o, '')].map(x => `${set.dir ? set.dir + '/' : ''}panel-${n}-${x}`); });
    return files.find(f => f !== prev) || files[0];
  }
  function backgrounds(d) {
    document.querySelectorAll('.repo-deco-bgimg,.repo-deco-prop,.repo-deco-sheet').forEach(n => n.remove());
    document.querySelectorAll('.repo-has-prop,.repo-has-sheet').forEach(b => b.classList.remove('repo-has-prop', 'repo-has-sheet'));
    document.querySelectorAll('.repo-has-bg').forEach(b => b.classList.remove('repo-has-bg'));
    const list = BG[d] || {};   // pas de return : les panneaux (plus bas) habillent aussi les designs sans fonds illustrés
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
    sheets(d);
    // panneaux d'habillage (Durci, Cabinet) : les blocs sans fond illustré reçoivent un panneau riveté en rapport avec leur
    // contenu (panelOf) ; blocs imbriqués : un seul fond, sur le grand (les blocs intérieurs restent nus)
    const pool = PANELS[d] && (document.documentElement.dataset.tone !== 'dark' && PANELS[d].clair || PANELS[d]);
    if (!pool || document.documentElement.dataset.decor !== 'full') return;   // décor complet seulement
    let prev = '';
    document.querySelectorAll('.repo-block').forEach(b => {
      if (b.hidden || !b.offsetHeight || b.parentElement.closest('.repo-block.repo-has-bg') || b.classList.contains('repo-has-bg')) return;
      const f = prev = panelOf(b, pool, prev), el = document.createElement('div');
      el.className = 'repo-deco-bgimg repo-deco-bg-cover repo-deco-panel';
      el.setAttribute('aria-hidden', 'true');
      el.style.backgroundImage = `url("${DECO(d)(f)}")`;
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
    props(d);
    if (!set || document.documentElement.dataset.decor !== 'full') return;
    const img = DECO(d);
    // 1. pied de page
    const foot = document.createElement('div');
    foot.className = 'repo-deco no-print';
    foot.dataset.for = d;
    foot.innerHTML = set.foot(img);
    // radar : chaque plot s'allume au passage du front (rotation horaire de 5 s partant du haut, centre du réticule
    // 49,86 % / 46,44 % d'un écran 1402 × 478) → délai d'animation = angle du plot (depuis le haut, sens horaire) / 360 × période
    foot.querySelectorAll('.repo-deco-radar i').forEach(b => {
      const dx = (parseFloat(b.style.left) - 49.86) * 1402 / 478, dy = parseFloat(b.style.top) - 46.44, a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      b.style.animationDelay = `${(a / 360 * 5).toFixed(2)}s`;
    });
    const footer = document.querySelector('body>footer.repo-footer');
    if (footer) footer.before(foot); else document.body.append(foot);
    nodes.push(foot);
    state();
    // 2. entre les blocs : un intervalle sur deux, dans chaque conteneur de blocs ; le premier intervalle de la page reçoit
    // l'appareil du design (device : objet large dans un vrai emplacement du flux, hauteur fixe ; Cabinet : poste radio ;
    // aucun dans les autres designs pour l'instant)
    let k = 0, device = !!set.device;
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
        if (device) {
          device = false;
          const dv = document.createElement('div');
          dv.className = 'repo-deco-device';
          dv.setAttribute('aria-hidden', 'true');
          dv.innerHTML = set.device.map(([n, h, rot]) => `<img src="${img(n)}" alt="" style="height:${h}px${rot ? `;transform:rotate(${rot}deg)` : ''}">`).join('');
          b.before(dv);
          nodes.push(dv);
          return;
        }
        const [name, w, pair] = set.between[k++ % set.between.length], sep = document.createElement('div');
        sep.className = 'repo-deco-sep';
        sep.setAttribute('aria-hidden', 'true');
        // troisième élément : 'pair' (deux exemplaires) ou { x, y, rot } (décalage en px, inclinaison en degrés)
        sep.innerHTML = pair === 'pair' ? `<img src="${img(name)}" alt="" style="width:${w}px;margin-left:-60px"><img src="${img(name)}" alt="" style="width:${w}px;margin-left:60px">`
          : `<img src="${img(name)}" alt="" style="width:${w}px${pair ? `;transform:translate(${pair.x || 0}px,${pair.y || 0}px) rotate(${pair.rot || 0}deg)` : ''}">`;
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
    const b = document.querySelector('.repo-deco .repo-deco-status');
    // voyant actif : sauvegarde comme le bouton de l'en-tête (browser_store.js : dossier, sinon choix, sinon téléchargement)
    if (b && !b.onclick) { b.title = tr('saveNow'); b.onclick = () => document.querySelector('.repo-backup-button')?.click(); }
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
