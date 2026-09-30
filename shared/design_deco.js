// Décors des designs à matières (Cabinet, Carnet de vol, Durci, Aqua) — images de shared/deco/<design>/ (découpées dans
// les planches de maquette ou livrées à part, converties en WebP). Chargé par repository_nav.js avec designs_skeuo.css ;
// reconstruit au changement de design, de ton, de langue et de taille de fenêtre. Tout est décoratif (aria-hidden), sauf
// le voyant de sauvegarde de Durci (état réel : html[data-dirty], browser_store.js).
//
// Deux familles :
//  · fonds des blocs (décor complet ou sobre selon le cas) :
//      - BG      : fond illustré d'un bloc marqué data-deco-bg (Carnet de vol, Aqua) ;
//      - SHEETS  : feuille de registre en fond des blocs de tableau des registres (Cabinet, Carnet de vol, Durci ; ton clair) ;
//      - PANELS  : panneau choisi par thème pour tous les autres blocs (Cabinet, Durci ; décor complet) ;
//      - PROPS   : objet posé dans un bloc, coin bas droit (Cabinet ; décor complet) ;
//  · décor de page (SETS, décor complet seulement) : frise de pied de page, objets entre les blocs (hauteur nulle : la
//    mise en page ne bouge pas), appareil de page (vrai emplacement du flux entre les blocs 2 et 3, déplaçable
//    latéralement : Cabinet, Carnet de vol, Durci), objets dans les marges (grands écrans).
// Toute image nommée ici doit exister dans shared/deco/<design>/ ; une image que plus rien ne nomme est retirée.
// Rien n'est affiché dans les autres designs, sous 760 px ni à l'impression (designs_skeuo.css).
(() => {
  'use strict';
  const nav = window.RepositoryNav;
  if (!nav || window.RepositoryDeco) return;

  const script = document.currentScript;
  const V = new URL(script.src).search; // version de cache (?v=…) reprise pour les images
  /** URL d'une image de décor : DECO(design)(nom) → shared/deco/<design>/<nom>.webp */
  const DECO = d => n => new URL(`deco/${d}/${n}.webp${V}`, script.src).href;
  const html = document.documentElement;
  const fullDecor = () => html.dataset.decor === 'full';

  // ------------------------------------------------------------------ libellés (voyant et radar de Durci)
  const T = {
    saved: ['Données sauvegardées', 'Data saved', 'Daten gesichert', 'Datos guardados'],
    dirty: ['Modifications à sauvegarder', 'Changes to save', 'Änderungen zu sichern', 'Cambios por guardar'],
    radar: ['Radar de veille', 'Surveillance radar', 'Überwachungsradar', 'Radar de vigilancia'],
    saveNow: ['Sauvegarder maintenant dans le dossier de sauvegarde', 'Save now to the backup folder',
      'Jetzt im Sicherungsordner sichern', 'Guardar ahora en la carpeta de copia'
    ]
  };
  const tr = k => window.RepositoryKit.t(T[k]); // shared/kit.js

  // ------------------------------------------------------------------ décor de page, par design
  // foot     : frise du pied de page, liste de composants (FOOT) : 'strip' (image « footer » du design), 'plate'
  //            (plaque DEFA), 'radar' (écran de veille animé), 'status' (voyant de sauvegarde, fonction réelle) ;
  // between  : objets entre les blocs, tour à tour : [image, largeur px, option] ; option : 'pair' (deux exemplaires)
  //            ou { x, y, rot } (décalage en px depuis le centre, inclinaison en degrés) ;
  // device   : appareil de page, un objet posé à côté d'un poste (radio, DME), côte à côte calés à droite et
  //            déplaçables latéralement par l'utilisateur : [image, hauteur px, inclinaison °] ; il prend l'intervalle
  //            entre les blocs 2 et 3 (DEVICE_AT ; sinon le premier intervalle possible qui suit) ;
  // sides    : objets des marges, alternativement à gauche et à droite : [image, largeur px maximale].
  // composants de la frise : img(nom) → adresse de l'image du design
  const FOOT = {
    strip: img => `<img class="repo-deco-strip" src="${img('footer')}" alt="">`,
    plate: img => `<div class="repo-deco-plate-img"><img src="${img('plate-defa')}" alt=""></div>`,
    // plots du radar : position dans l'écran (%) et couleur ; délai d'allumage calculé au rendu (passage du balayage)
    radar: img => `<div class="repo-deco-radar" title="${tr('radar')}"><div class="repo-deco-radar-stage">`
      + `<img src="${img('radar')}" alt=""><span class="repo-deco-sweep"></span>`
      + [[30.7, 33.5, '#7dff8a'], [65.6, 59.6, '#7dff8a'], [72, 79.5, '#7dff8a'], [30.96, 82.6, '#7dff8a'], [82.95, 46.44, '#ff4d3d']]
        .map(([x, y, c]) => `<i style="left:${x}%;top:${y}%;--c:${c}"></i>`).join('')
      + '</div></div>',
    // voyant de sauvegarde : état réel (html[data-dirty], browser_store.js) ; clic = sauvegarder maintenant
    status: img => `<button type="button" class="repo-deco-status repo-plain">`
      + `<img src="${img('plane-plate')}" alt="" onerror="this.remove()">`
      + '<span class="repo-deco-leds"><i class="led-save"></i><i class="led-on"></i><i></i></span><span class="repo-deco-state"></span></button>'
  };
  const DEVICE_AT = 2; // appareil de page : entre les blocs 2 et 3 (tous les designs ; une page à 3 blocs l'accueille)
  const SETS = {
    // Cabinet : objets de navigation des années 1930 (planches « objets 1930 » et objets de face)
    cabinet: {
      foot: ['strip'],
      between: [
        ['clip', 150], // trombone de liaison
        ['pen', 150, {
          x: -190,
          rot: 30
        }], // porte-mine, à gauche
        ['parallel-rule', 170, {
          x: 220,
          y: -38,
          rot: 18
        }], // règle parallèle, à droite, remontée
        ['tack', 22, 'pair'], // punaises
        ['pencil', 150],
        ['envelope-seal', 130], // enveloppe cachetée
        ['tag-secret', 140] // étiquette « Top secret »
      ],
      device: [
        ['notebook', 170, -7],
        ['radio', 225]
      ], // livre de bord posé à côté du poste radio
      sides: [
        ['ship-compass', 110],
        ['chart-coast', 170],
        ['sextant', 140],
        ['map', 200],
        ['suitcase', 150],
        ['envelope-confidential', 150],
        ['protractor', 140],
        ['dividers', 60],
        ['flag', 120]
      ]
    },
    // Carnet de vol : trombone et cadrans de bord ; appareil de page : carnet de cuir fermé et DME
    flightlog: {
      foot: ['strip'],
      device: [
        ['notebook-closed', 170, -7],
        ['dme', 190]
      ], // carnet de cuir posé à côté du DME
      between: [
        ['clip', 130],
        ['gauge-attitude', 84],
        ['gauge-speed', 84],
        ['gauge-alt', 84]
      ],
      sides: [
        ['gauge-speed', 120],
        ['chart', 230],
        ['gauge-attitude', 120],
        ['clip', 150],
        ['gauge-alt', 120]
      ]
    },
    // Durci : plaque DEFA, écran radar et voyant de sauvegarde en pied de page ; plaques, pochoirs et objets du pupitre
    // (grille d'aération, lampe grillagée, plaque vierge, blindage riveté, interrupteur à capot, crayon, cadran) ; appareil
    // de page : câble et poste radio
    field: {
      foot: ['plate', 'radar', 'status'],
      device: [
        ['cable', 170],
        ['radio', 360]
      ], // câble lové à côté du poste radio (de face), antenne
      // dépassant sur le contenu au-dessus
      between: [
        ['plate-attention', 210],
        ['louvre', 150],
        ['handle-h', 120],
        ['pencil', 200, {
          x: -150,
          y: -26,
          rot: -12
        }],
        ['plate-wings', 170],
        ['plate-blank', 180],
        ['plate-defa', 200],
        ['armor', 140]
      ],
      sides: [
        ['stencil-mission', 150],
        ['lamp', 100],
        ['dial', 110],
        ['stencil-defa', 130],
        ['toggle', 80],
        ['pencil', 150],
        ['stencil-ops', 160],
        ['armor', 140],
        ['louvre', 130]
      ]
    }
  };

  // ------------------------------------------------------------------ fonds illustrés (data-deco-bg)
  // Un bloc marqué data-deco-bg="<clé>" (reporting : aerodromes, capabilities, outcomes, aircraft, families, series,
  // daynight, network, context ; studio : maps ; éditeur : import, identification ; planificateur : result) reçoit
  // l'image déclarée ici pour le design courant ; seules les images déclarées sont chargées.
  // Entrée : mode, ou [mode, cadrage (background-position), image « <design>/<nom> » (défaut : <design>/bg-<clé>),
  // opacité (défaut : celle du design, designs_skeuo.css)]. Modes : « anchor » (taille d'origine, calée en haut à
  // gauche), « cover » (couvre le bloc), « side » (hauteur du bloc, calée à droite, fondue vers la gauche).
  // Cabinet et Durci n'en ont plus : les panneaux par thème (PANELS) habillent tous leurs blocs.
  const BG = {
    // Carnet de vol : cuir marine et tracés or (hélicoptères et montagnes, rose des vents, biplan et globe, piste de nuit…)
    flightlog: {
      aerodromes: ['cover', 'center', null, .5],
      daynight: ['cover', 'center bottom'],
      capabilities: ['cover', 'center'],
      outcomes: ['cover', 'center'],
      aircraft: ['cover', 'center'],
      series: ['cover', 'center'],
      families: ['cover', 'center']
    },
    // Aqua : eau et verre, cadrés différemment sur chaque bloc
    aqua: {
      aerodromes: ['cover', 'center bottom', 'aqua/bg-water'],
      capabilities: ['cover', 'left center', 'aqua/bg-water'],
      outcomes: ['cover', 'center top', 'aqua/bg-water'],
      aircraft: ['cover', 'right center', 'aqua/bg-water']
    }
  };

  // ------------------------------------------------------------------ panneaux par thème (PANELS)
  // Thème d'un bloc : premier motif reconnu dans son titre, sinon dans son icône et son identifiant, sinon dans son
  // sous-titre (ordre du tableau ; « ops » par défaut). Fichiers : shared/deco/<design>/<dossier>/panel-<thème>-<w|t>
  // (w paysage, t portrait ; orientation choisie d'après la forme du bloc).
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
  // Par design : dir (dossier des panneaux), only (orientations disponibles quand il en manque une), clair (jeu propre au
  // ton clair, avec alias : thème → panneau du jeu quand il a moins de thèmes). Cabinet : jeu « 1930 » ; un jeu « 1800 »
  // attend dans cabinet/1800 : remplacer '1930' par '1800' (dir et clair.dir) une fois ses panneaux convertis.
  const PANELS = {
    field: {
      dir: '',
      only: {
        awards: 't',
        families: 't'
      }
    },
    cabinet: {
      dir: '1930',
      only: {},
      // ton clair : fonds ivoire (cartes côtières, paquebot, hydravions, instruments)
      clair: {
        dir: '1930/clair',
        only: {
          instruments: 'w'
        }, // portrait à venir
        alias: {
          airfield: 'nav',
          ops: 'ships',
          families: 'ships',
          awards: 'ships',
          gear: 'instruments',
          radio: 'instruments',
          time: 'instruments'
        }
      }
    }
  };

  // ------------------------------------------------------------------ objets posés dans un bloc (PROPS)
  // Premier motif reconnu dans le titre, l'icône ou l'identifiant du bloc : [motif, image du design, largeur px].
  const PROPS = {
    cabinet: [
      [/ordre|order|t[âa]che|task|briefing/, 'order', 130],
      [/secret|confiden|classif|diffusion|privacy|personnel/, 'tag-secret', 170],
      [/ledger|registre|registry|journal|rapport|report|remarque|compte rendu|documents?\b/, 'dossier', 150]
    ]
  };

  // ------------------------------------------------------------------ feuille de registre (SHEETS)
  // Blocs de tableau des registres et journaux (motif sur le titre, l'icône ou l'identifiant) ; dessin et mise en page :
  // designs_skeuo.css (.repo-deco-sheet ; morceaux découpés par tools/cut_register_sheet.py). Ton clair seulement
  // (papier clair sous un texte foncé).
  // (même logique pour tous les designs à feuille ; morceaux par design : jetons --sheet-* de designs_skeuo.css)
  const SHEET_BLOCKS = /registre|registry|ledger|journal|missions?\s*\(|choisir une mission|choose a mission/;
  const SHEETS = {
    cabinet: SHEET_BLOCKS,
    flightlog: SHEET_BLOCKS,
    field: SHEET_BLOCKS
  };

  /** Texte d'identification d'un bloc : titre, icône, identifiant (en minuscules). */
  const blockText = b => [b.querySelector('h2,h3')?.textContent, b.dataset.icon, b.dataset.blockId].join(' ').toLowerCase();
  /** Bloc de premier niveau, affiché. */
  const topBlock = b => !b.hidden && b.offsetHeight > 0 && !b.parentElement.closest('.repo-block');

  function sheets(d) {
    const re = SHEETS[d];
    if (!re || !fullDecor() || html.dataset.tone === 'dark') return;
    document.querySelectorAll('.repo-block').forEach(b => {
      // largeur minimale : en-tête imprimé entier (780 px à l'échelle 1, --k = .7) et un peu de papier
      if (!topBlock(b) || b.offsetWidth < 640 || !b.querySelector('table') || !re.test(blockText(b))) return;
      const el = document.createElement('div');
      el.className = 'repo-deco-sheet';
      el.setAttribute('aria-hidden', 'true');
      // papier (dans le cadre), tranches répétées (arrêtées aux coins), coins et en-tête, puis accessoire du bord gauche
      el.innerHTML = '<i class="sh-paper"></i><i class="sh-top"></i><i class="sh-bot"></i><i class="sh-left"></i><i class="sh-right"></i><i class="sh-frame"></i><i class="sh-acc"></i>';
      b.classList.add('repo-has-sheet', 'repo-has-bg');
      b.prepend(el);
    });
  }

  function props(d) {
    const list = PROPS[d];
    if (!list || !fullDecor()) return;
    document.querySelectorAll('.repo-block').forEach(b => {
      // assez grand pour accueillir l'objet ; pas sur une feuille de registre (elle est déjà le dossier)
      if (!topBlock(b) || b.offsetHeight < 200 || b.offsetWidth < 480 || b.classList.contains('repo-has-sheet')) return;
      const hit = list.find(([re]) => re.test(blockText(b)));
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

  /**
   * Panneau d'un bloc (chemin relatif au dossier du design, sans extension). Si c'est le même que celui du bloc
   * précédent, prend l'autre orientation du même thème, puis le thème suivant.
   */
  function panelOf(b, set, prev) {
    const o = b.offsetWidth >= b.offsetHeight ? 'w' : 't';
    const hit = s => THEMES.filter(([, re]) => re.test(String(s || '').toLowerCase()));
    // titre, puis icône et identifiant, puis sous-titre : premier niveau qui reconnaît un thème autre que « ops »
    const themes = [b.querySelector('h2,h3')?.textContent, `${b.dataset.icon || ''} ${b.dataset.blockId || ''}`, b.dataset.subtitle]
      .map(hit).find(h => h.length > 1) || hit('-');
    const names = [...new Set(themes.map(([n]) => set.alias?.[n] || n))];
    const files = names.flatMap(n => {
      const or = set.only[n] || 'wt'; // orientations disponibles
      const order = [or.includes(o) ? o : or, ...or.replace(o, '')];
      return order.map(x => `${set.dir ? set.dir + '/' : ''}panel-${n}-${x}`);
    });
    return files.find(f => f !== prev) || files[0];
  }

  /** Fonds des blocs : fonds illustrés, feuille de registre, panneaux (dans cet ordre : un bloc n'en reçoit qu'un). */
  function backgrounds(d) {
    document.querySelectorAll('.repo-deco-bgimg,.repo-deco-prop,.repo-deco-sheet').forEach(n => n.remove());
    document.querySelectorAll('.repo-has-bg,.repo-has-prop,.repo-has-sheet')
      .forEach(b => b.classList.remove('repo-has-bg', 'repo-has-prop', 'repo-has-sheet'));

    // 1. fonds illustrés déclarés (pas de return si le design n'en a pas : les étapes suivantes s'appliquent)
    const list = BG[d] || {};
    document.querySelectorAll('[data-deco-bg]').forEach(b => {
      const e = list[b.dataset.decoBg];
      if (!e) return;
      const [mode, pos, file, alpha] = Array.isArray(e) ? e : [e];
      const [fd, fn] = (file || `${d}/bg-${b.dataset.decoBg}`).split('/');
      const el = document.createElement('div');
      el.className = `repo-deco-bgimg repo-deco-bg-${mode}`;
      el.setAttribute('aria-hidden', 'true');
      el.style.backgroundImage = `url("${DECO(fd)(fn)}")`;
      if (pos) el.style.backgroundPosition = pos;
      if (alpha != null) el.style.opacity = alpha;
      b.classList.add('repo-has-bg');
      b.prepend(el);
    });

    // 2. feuille de registre
    sheets(d);

    // 3. panneaux par thème (décor complet) : tous les autres blocs ; blocs imbriqués : un seul fond, sur le grand
    const set = PANELS[d] && (html.dataset.tone !== 'dark' && PANELS[d].clair || PANELS[d]);
    if (!set || !fullDecor()) return;
    let prev = '';
    document.querySelectorAll('.repo-block').forEach(b => {
      if (b.hidden || !b.offsetHeight || b.classList.contains('repo-has-bg') || b.parentElement.closest('.repo-block.repo-has-bg')) return;
      const f = prev = panelOf(b, set, prev);
      const el = document.createElement('div');
      el.className = 'repo-deco-bgimg repo-deco-bg-cover repo-deco-panel';
      el.setAttribute('aria-hidden', 'true');
      el.style.backgroundImage = `url("${DECO(d)(f)}")`;
      b.classList.add('repo-has-bg');
      b.prepend(el);
    });
  }

  // ------------------------------------------------------------------ décor de page
  let nodes = [];
  const clear = () => {
    nodes.forEach(n => n.remove());
    nodes = [];
  };
  /** Image d'un objet entre les blocs, avec son option (voir SETS.between). */
  const betweenHtml = (src, w, opt) => {
    if (opt === 'pair') {
      return `<img src="${src}" alt="" style="width:${w}px;margin-left:-60px">` +
        `<img src="${src}" alt="" style="width:${w}px;margin-left:60px">`;
    }
    const move = opt ? `;transform:translate(${opt.x || 0}px,${opt.y || 0}px) rotate(${opt.rot || 0}deg)` : '';
    return `<img src="${src}" alt="" style="width:${w}px${move}">`;
  };

  // Appareil de page déplaçable latéralement (glisser à la souris ou au doigt) : position gardée par design, en fraction
  // de la place libre (0 : calé à droite, 1 : à gauche), valable quelle que soit la largeur de la page.
  const deviceKey = d => `repositoryDeviceX:${d}`;

  function slideDevice(dv, d) {
    const set = dv.firstElementChild,
      K = window.RepositoryKit;
    // plus large que sa colonne : réduit à sa largeur (depuis le coin bas droit)
    const scale = () => Math.min(1, dv.clientWidth / (set.offsetWidth || 1));
    const room = () => Math.max(0, dv.clientWidth - set.offsetWidth * scale());
    let frac = Math.min(1, Math.max(0, +K.store.get(deviceKey(d), 0) || 0));
    const place = () => {
      set.style.transform = `translateX(${-Math.round(frac * room())}px) scale(${scale().toFixed(3)})`;
    };
    requestAnimationFrame(place);
    set.querySelectorAll('img').forEach(i => i.addEventListener('load', place, {
      once: true
    }));
    set.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault();
      set.setPointerCapture(e.pointerId);
      set.classList.add('dragging');
      const x0 = e.clientX,
        f0 = frac,
        r = room() || 1;
      const move = ev => {
        frac = Math.min(1, Math.max(0, f0 - (ev.clientX - x0) / r));
        place();
      };
      const up = () => {
        set.classList.remove('dragging');
        set.removeEventListener('pointermove', move);
        K.store.set(deviceKey(d), frac.toFixed(3));
      };
      set.addEventListener('pointermove', move);
      set.addEventListener('pointerup', up, {
        once: true
      });
      set.addEventListener('pointercancel', up, {
        once: true
      });
    });
  }

  function render() {
    clear();
    const d = html.dataset.design,
      set = SETS[d];
    backgrounds(d);
    props(d);
    if (!set || !fullDecor()) return;
    const img = DECO(d);

    // 1. pied de page
    const foot = document.createElement('div');
    foot.className = 'repo-deco no-print';
    foot.dataset.for = d;
    foot.innerHTML = set.foot.map(k => FOOT[k](img)).join('');
    // radar (Durci) : chaque plot s'allume au passage du front (rotation horaire de 5 s partant du haut, centre du
    // réticule 49,86 % / 46,44 % d'un écran 1402 × 478) → délai d'animation = angle du plot depuis le haut / 360 × période
    foot.querySelectorAll('.repo-deco-radar i').forEach(b => {
      const dx = (parseFloat(b.style.left) - 49.86) * 1402 / 478,
        dy = parseFloat(b.style.top) - 46.44;
      const a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      b.style.animationDelay = `${(a / 360 * 5).toFixed(2)}s`;
    });
    const footer = document.querySelector('body>footer.repo-footer');
    if (footer) footer.before(foot);
    else document.body.append(foot);
    nodes.push(foot);
    state();

    // 2. entre les blocs : un intervalle sur deux, dans chaque conteneur de blocs empilés ; l'appareil de page prend
    //    l'intervalle après le bloc n° DEVICE_AT
    let k = 0,
      device = !!set.device;
    const parents = new Set([...document.querySelectorAll('.repo-block')].map(b => b.parentElement));
    parents.forEach(p => {
      // conteneur en grille ou en rangée flex : un élément inséré y deviendrait une cellule → pas de décor
      const pd = getComputedStyle(p);
      if (/grid/.test(pd.display) || (/flex/.test(pd.display) && !/column/.test(pd.flexDirection))) return;
      const blocks = [...p.children].filter(x => x.classList.contains('repo-block') && !x.hidden && x.offsetHeight);
      blocks.slice(1).forEach((b, i) => {
        // voisins immédiats (rien entre les deux), l'un sous l'autre dans la même colonne, écart raisonnable
        const pr = blocks[i].getBoundingClientRect(),
          nr = b.getBoundingClientRect(),
          gap = nr.top - pr.bottom;
        const ok = b.previousElementSibling === blocks[i] && Math.abs(nr.left - pr.left) <= 4 && gap >= 0 && gap <= 80;
        // appareil de page : vrai emplacement du flux (hauteur fixe, designs_skeuo.css .repo-deco-device)
        if (device && ok && i + 1 >= DEVICE_AT) {
          device = false;
          const dv = document.createElement('div');
          dv.className = 'repo-deco-device';
          dv.setAttribute('aria-hidden', 'true');
          dv.innerHTML = `<span class="repo-deco-device-set">${set.device
            .map(([n, h, rot]) => `<img src="${img(n)}" alt="" draggable="false" style="height:${h}px${rot ? `;transform:rotate(${rot}deg)` : ''}">`)
            .join('')}</span>`;
          b.before(dv);
          slideDevice(dv, d);
          nodes.push(dv);
          return;
        }
        if (i % 2 || !ok) return;
        // objet entre les blocs : hauteur nulle, centré dans l'écart
        const [name, w, opt] = set.between[k++ % set.between.length];
        const sep = document.createElement('div');
        sep.className = 'repo-deco-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.innerHTML = betweenHtml(img(name), w, opt);
        sep.style.top = `${-gap / 2}px`;
        b.before(sep);
        nodes.push(sep);
      });
    });

    // 3. marges de la page (grands écrans) : un objet tous les ~650 px, alternativement à gauche et à droite ;
    //    marge = espace libre entre le bord de la page (body, position relative) et la colonne de contenu (main)
    const body = document.body.getBoundingClientRect();
    const col = (document.querySelector('body>main') || document.body).getBoundingClientRect();
    const gutter = Math.min(col.left - body.left, body.right - col.right) - 10,
      H = document.body.scrollHeight;
    if (gutter < 90) return;
    let side = 0;
    for (let y = 180, n = 0; y < H - 200; y += 650, n++) {
      const [name, w0] = set.sides[n % set.sides.length], w = Math.min(w0, gutter - 24), left = side++ % 2 === 0;
      if (w < 36) continue;
      const x = (col.left - body.left - w) / 2,
        top = y + (n % 3) * 40; // centré dans la marge
      // jamais au-delà du bas de la page (sinon la page s'allonge, la barre de défilement apparaît, la marge rétrécit,
      // le décor disparaît… et ainsi de suite : barres qui clignotent)
      if (top + w * 1.4 > H - 30) break;
      const el = document.createElement('img');
      el.className = 'repo-deco-side';
      el.src = img(name);
      el.alt = '';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `width:${w}px;top:${top}px;${left ? `left:${x}px` : `right:${x}px`};transform:rotate(${[-8, 5, -3, 7][n % 4]}deg)`;
      document.body.append(el);
      nodes.push(el);
    }
  }

  /** Libellé et action du voyant de sauvegarde (Durci). */
  function state() {
    const s = document.querySelector('.repo-deco .repo-deco-state');
    if (s) s.textContent = tr(html.dataset.dirty === '1' ? 'dirty' : 'saved');
    const b = document.querySelector('.repo-deco .repo-deco-status');
    // voyant actif : sauvegarde comme le bouton de l'en-tête (browser_store.js : dossier, sinon choix, sinon téléchargement)
    if (b && !b.onclick) {
      b.title = tr('saveNow');
      b.onclick = () => document.querySelector('.repo-backup-button')?.click();
    }
  }

  // ------------------------------------------------------------------ déclencheurs
  let timer = 0;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 250);
  };
  window.addEventListener('repository-design-change', later);
  window.addEventListener('repository-language-change', later);
  window.addEventListener('resize', later);
  // mise en page qui change après coup (contenu chargé, blocs passés en grille…) : décors recalculés. L'appareil de page
  // occupe de la place, mais il est retiré et remis dans la même passe : la hauteur finale ne change pas, pas de boucle.
  let lastH = 0;
  new ResizeObserver(() => {
    const h = Math.round(document.body.scrollHeight / 40);
    if (h !== lastH) {
      lastH = h;
      later();
    }
  }).observe(document.body);
  new MutationObserver(state).observe(html, {
    attributes: true,
    attributeFilter: ['data-dirty']
  });
  // blocs et pied de page posés au chargement complet (app_framework.js) ; les pages rendues plus tard (CR) se
  // stabilisent ensuite : nouvelle passe après une seconde
  if (document.readyState === 'complete') render();
  else window.addEventListener('load', () => {
    render();
    setTimeout(render, 1200);
  });
  window.RepositoryDeco = {
    render
  };
})();
