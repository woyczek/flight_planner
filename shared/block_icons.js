// Framework — icônes, numéros et sous-titres des blocs, sous-cartes, zones de dépôt de fichiers.
// Voir docs/PROPOSITION_DESIGN_ICONES.md. Chargé sur toutes les pages par repository_nav.js (avec
// shared/icons/repository_icons.js et side_nav.js) ; charge block_icons.css.
//
// Déclaration dans le HTML (rien à écrire en JavaScript) :
//   <section data-step="1" data-icon="upload" data-subtitle="Choisissez vos fichiers…"><h2>Importer une mission</h2>
//     → pastille « 1 », icône, sous-titre sous le titre (dans l'en-tête du bloc, visible même bloc masqué).
//     Sous-titre aussi possible en élément : <p class="repo-block-subtitle">…</p> juste après le <h2>.
//   <div class="repo-card" data-icon="file" data-subtitle="…"><h3>YAML et/ou Markdown</h3>…</div>
//     → sous-carte : en-tête icône + titre + sous-titre ; .repo-card-tools (boutons) rangé à droite du titre.
//   <button data-icon="plus">Nouvelle mission</button>, <button data-icon-end="arrow-right">ChatGPT</button>,
//   <label data-icon="globe">Théâtre<select>…</label>, <h1 data-icon="target" data-subtitle="…">, <p class="repo-notice" data-icon="info">
//     → icône insérée avant (ou après) le texte : le nœud texte n'est pas touché, content_i18n le traduit toujours.
//   <input type="file" data-dropzone> → zone de dépôt (clic = sélecteur de file_access.js, glisser-déposer,
//     noms des fichiers choisis) ; l'<input> reste dans le DOM : l'événement « change » de la page ne change pas.
//
// Textes (sous-titres, libellés) : écrits en français dans la page, traduits par content_i18n (lignes [fr, en, de, es]
// de la page) ; les textes propres au composant (zone de dépôt) sont traduits ici, comme les boutons de bloc.
(() => {
  'use strict';
  const script = document.currentScript;
  {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('block_icons.css?v=3d23e4d4', script.src).href; // version : empreinte de la feuille (tools/bump_versions.py)
    document.head.append(css);
  }
  const K = window.RepositoryKit; // utilitaires communs (shared/kit.js)
  const T = {
    pick: ['Choisir des fichiers', 'Choose files', 'Dateien auswählen', 'Elegir archivos'],
    pickOne: ['Choisir un fichier', 'Choose a file', 'Datei auswählen', 'Elegir un archivo'],
    drop: ['ou glisser-déposer ici', 'or drag and drop here', 'oder hierher ziehen', 'o arrastrar y soltar aquí'],
    none: ['Aucun fichier choisi', 'No file chosen', 'Keine Datei ausgewählt', 'Ningún archivo elegido'],
    refused: ['Type de fichier non accepté : ', 'File type not accepted: ', 'Dateityp nicht zulässig: ', 'Tipo de archivo no aceptado: ']
  };
  const tr = row => K.t(row);

  /** <span class="repo-icon"> contenant l'icône (décorative), ou null si l'icône est inconnue. */
  function icon(name, cls = '') {
    const svg = window.RepositoryIcons?.svg(name);
    if (!svg) return null;
    const span = document.createElement('span');
    span.className = `repo-icon ${cls}`.trim();
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = svg;
    return span;
  }

  /** Sous-titre : élément existant (.repo-block-subtitle / .repo-card-subtitle) ou créé depuis data-subtitle. */
  function subtitle(host, cls) {
    let p = host.querySelector(`:scope>.${cls}`);
    if (!p && host.dataset.subtitle) {
      p = document.createElement('p');
      p.className = cls;
      p.textContent = host.dataset.subtitle; // texte source (fr) : content_i18n le traduit comme les autres
    }
    return p;
  }

  /** En-tête d'un bloc (.repo-block posé par app_framework.js) : pastille, icône, titre + sous-titre. */
  function decorateBlock(el) {
    if (el.dataset.blockDecor) return;
    // icône « en ligne » posée par erreur avant que l'élément ne devienne un bloc (passe précoce) : retirée
    el.querySelectorAll(':scope>.repo-icon-start,:scope>.repo-icon-end').forEach(x => x.remove());
    el.classList.remove('repo-has-icon');
    const head = el.querySelector(':scope>.repo-block-heading'),
      h = head?.querySelector(':scope>h2');
    if (!h) return;
    const step = el.dataset.step,
      name = el.dataset.icon,
      sub = subtitle(el, 'repo-block-subtitle');
    if (!step && !name && !sub) return;
    el.dataset.blockDecor = '1';
    head.classList.add('repo-block-heading-rich');
    const lead = document.createElement('span');
    lead.className = 'repo-block-lead';
    if (step) {
      const b = document.createElement('span');
      b.className = 'repo-block-step';
      b.textContent = step;
      b.setAttribute('aria-hidden', 'true'); // le numéro est visuel ; le titre reste lisible seul
      lead.append(b);
    }
    const ic = name && icon(name, 'repo-block-icon');
    if (ic) lead.append(ic);
    const titles = document.createElement('div');
    titles.className = 'repo-block-titles';
    h.before(lead);
    lead.after(titles);
    titles.append(h);
    if (sub) titles.append(sub);
    if (!lead.children.length) lead.remove();
  }

  /** Sous-carte .repo-card : en-tête icône + (titre, sous-titre) + outils. */
  function decorateCard(card) {
    if (card.dataset.cardDecor) return;
    const h = card.querySelector(':scope>h3,:scope>h4,:scope>strong');
    if (!h) return;
    card.dataset.cardDecor = '1';
    const head = document.createElement('div');
    head.className = 'repo-card-head';
    const ic = card.dataset.icon && icon(card.dataset.icon, 'repo-card-icon');
    const titles = document.createElement('div');
    titles.className = 'repo-card-titles';
    h.before(head);
    if (ic) head.append(ic);
    head.append(titles);
    titles.append(h);
    const sub = subtitle(card, 'repo-card-subtitle');
    if (sub) titles.append(sub);
    const tools = card.querySelector(':scope>.repo-card-tools');
    if (tools) head.append(tools);
  }

  /** Icône d'un élément quelconque (bouton, libellé, titre, bandeau) : avant le texte, ou après (data-icon-end). */
  function decorateInline(el) {
    // blocs (et futurs blocs : panneaux, éléments à data-block-id — app_framework.js peut passer après) : icône de bloc, pas en ligne
    if (el.dataset.iconDone || el.matches('section,.repo-block,.repo-card,.panel,[data-block-id],.format-note,.analysis-dock,.trend-card,input,select,textarea')) return;
    el.dataset.iconDone = '1';
    // bouton sans texte (icône seule, libellé en title / aria-label) : l'icône reste affichée même en jeu « aucune icône »
    if (el.matches('button') && !el.textContent.trim()) el.classList.add('repo-icon-only');
    const start = el.dataset.icon && icon(el.dataset.icon, 'repo-icon-start'),
      end = el.dataset.iconEnd && icon(el.dataset.iconEnd, 'repo-icon-end');
    if (start && el.matches('label')) {
      // Libellé de champ (souvent en grille : texte au-dessus du champ) : l'icône et le premier texte sont regroupés
      // sur une ligne ; le nœud texte est déplacé, pas modifié (sa traduction reste suivie par content_i18n).
      const text = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
      const line = document.createElement('span');
      line.className = 'repo-label-line';
      line.append(start);
      if (text) {
        text.before(line);
        line.append(text);
      } else el.prepend(line);
    } else if (start) el.prepend(start);
    if (end) el.append(end);
    if (start || end) el.classList.add('repo-has-icon');
    if (el.matches('h1') && el.dataset.subtitle && !el.nextElementSibling?.classList.contains('repo-header-subtitle')) {
      // Titre de page : sous-titre sous le <h1>, regroupés (le bandeau de repository_nav garde sa ligne).
      const wrap = document.createElement('div');
      wrap.className = 'repo-header-titles';
      el.before(wrap);
      wrap.append(el);
      const p = document.createElement('span');
      p.className = 'repo-header-subtitle';
      p.textContent = el.dataset.subtitle;
      wrap.append(p);
    }
  }

  // ---- zones de dépôt de fichiers
  /** Le fichier correspond-il à l'attribut accept (extensions, types MIME, type/*) ? */
  function accepted(file, accept) {
    if (!accept) return true;
    const name = file.name.toLowerCase(),
      type = (file.type || '').toLowerCase();
    return accept.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(a =>
      a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? type.startsWith(a.slice(0, -1)) : type === a);
  }

  /** Enveloppe un <input type=file> dans une zone de dépôt (idempotent). Retourne la zone. */
  function dropzone(input) {
    if (input.closest('.repo-dropzone')) return input.closest('.repo-dropzone');
    const zone = document.createElement('div');
    zone.className = 'repo-dropzone';
    zone.innerHTML = '<span class="repo-dropzone-badge"></span><span class="repo-dropzone-text"><span class="repo-dropzone-line"><span class="repo-dropzone-pick"></span> <span class="repo-dropzone-or"></span></span><span class="repo-dropzone-state" aria-live="polite"></span></span>';
    zone.setAttribute('data-no-i18n', ''); // textes composés ici dans la langue courante
    const ic = icon('upload');
    if (ic) zone.querySelector('.repo-dropzone-badge').append(ic);
    input.before(zone);
    zone.append(input);
    input.classList.add('repo-dropzone-input');
    const state = zone.querySelector('.repo-dropzone-state');
    let message = '';
    const render = () => {
      zone.querySelector('.repo-dropzone-pick').textContent = tr(input.multiple ? T.pick : T.pickOne);
      zone.querySelector('.repo-dropzone-or').textContent = tr(T.drop);
      const files = [...(input.files || [])];
      state.textContent = message || (files.length ? files.map(f => f.name).join(', ') : tr(T.none));
      zone.classList.toggle('has-files', !!files.length);
      zone.classList.toggle('is-refused', !!message);
    };
    zone._render = render;
    render();
    // Clic n'importe où dans la zone = clic sur l'<input> : file_access.js ouvre alors son sélecteur dans le
    // dossier paramétré. preventDefault : pas de second clic si la zone est dans un <label>.
    zone.addEventListener('click', e => {
      if (e.target === input) return;
      e.preventDefault();
      input.click();
    });
    input.addEventListener('change', () => {
      message = '';
      render();
    });
    const over = on => zone.classList.toggle('is-over', on);
    zone.addEventListener('dragenter', e => {
      e.preventDefault();
      over(true);
    });
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      over(true);
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) over(false);
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      over(false);
      let files = [...(e.dataTransfer?.files || [])];
      const refused = files.filter(f => !accepted(f, input.accept));
      files = files.filter(f => accepted(f, input.accept));
      if (!input.multiple) files = files.slice(0, 1);
      message = refused.length && !files.length ? tr(T.refused) + refused.map(f => f.name).join(', ') : '';
      if (files.length) {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', {
          bubbles: true
        })); // même événement que file_access.js
      } else render();
    });
    return zone;
  }

  // ---- couleur des icônes : contraste contrôlé sur la surface réelle du bloc
  // lecture d'une couleur et contraste WCAG : shared/kit.js (0 si l'une des couleurs est illisible ou transparente)
  const parse = K.color.rgb,
    contrast = K.color.contrast;
  /** Couleur de fond effective d'un élément (premier ancêtre non transparent). */
  function surface(el) {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c) return `rgb(${c.join(',')})`;
    }
    return 'rgb(255,255,255)';
  }
  /** Pose --repo-icon sur le bloc : accent du thème s'il atteint 3:1 (WCAG 1.4.11, éléments graphiques) sur la
   * surface du bloc, sinon couleur du bandeau, sinon texte du bandeau, sinon couleur du texte du bloc. */
  function tuneIcons(el) {
    const root = getComputedStyle(document.documentElement),
      bg = surface(el),
      options = ['--repo-accent', '--repo-bar', '--repo-bar-text'].map(v => root.getPropertyValue(v).trim()).filter(Boolean);
    const text = getComputedStyle(el).color;
    el.style.setProperty('--repo-icon', options.find(c => contrast(c, bg) >= 3) || text);
    // --repo-ink : même choix pour un TEXTE coloré (lien « Choisir des fichiers », numéro en design Brief) : 4,5:1.
    el.style.setProperty('--repo-ink', options.find(c => contrast(c, bg) >= 4.5) || text);
  }

  /** Passe complète (idempotente) : blocs, sous-cartes, icônes en ligne, zones de dépôt, couleurs d'icônes. */
  function decorate() {
    document.querySelectorAll('.repo-block').forEach(decorateBlock);
    document.querySelectorAll('.repo-card').forEach(decorateCard);
    document.querySelectorAll('[data-icon],[data-icon-end]').forEach(decorateInline);
    document.querySelectorAll('input[type=file][data-dropzone]').forEach(dropzone);
    document.querySelectorAll('.repo-block,.repo-card,.repo-header').forEach(tuneIcons);
  }
  if (window.__perf) { // audit de performance : durée et nombre de passes (tools/perf_audit.html)
    const raw = decorate;
    decorate = (...a) => window.__perf.time('icons', () => raw(...a));
  }

  // Après app_framework.js (son init est sur « load », enregistré avant le nôtre) ; puis après chaque
  // AppFramework.refresh(), et pour les éléments ajoutés plus tard par la page (observateur, un passage par image).
  function hookRefresh() {
    const f = window.AppFramework;
    if (!f || f.__blockIcons) return;
    const r = f.refresh;
    f.refresh = (...a) => {
      const x = r(...a);
      decorate();
      return x;
    };
    f.__blockIcons = true;
  }
  /** Passe limitée aux éléments ajoutés (et à ce qu'ils contiennent) : la passe complète recalculait aussi les couleurs
   *  (styles calculés) de tous les blocs de la page à chaque modification. */
  function decorateIn(root) {
    const all = sel => [...(root.matches(sel) ? [root] : []), ...root.querySelectorAll(sel)];
    all('.repo-block').forEach(decorateBlock);
    all('.repo-card').forEach(decorateCard);
    all('[data-icon],[data-icon-end]').forEach(decorateInline);
    all('input[type=file][data-dropzone]').forEach(dropzone);
    all('.repo-block,.repo-card,.repo-header').forEach(tuneIcons);
  }
  let pending = false;
  const added = new Set();
  const observer = new MutationObserver(list => {
    for (const m of list)
      for (const n of m.addedNodes)
        if (n.nodeType === 1) added.add(n);
    if (pending || !added.size) return;
    pending = true;
    const go = () => {
      if (!pending) return;
      pending = false;
      const roots = [...added].filter(n => n.isConnected);
      added.clear();
      const t0 = performance.now();
      roots.forEach(decorateIn);
      window.__perf?.add?.('icons.ms', performance.now() - t0); // audit de performance
    };
    requestAnimationFrame(go);
    setTimeout(go, 150); // onglet en arrière-plan : pas d'image
  });
  // Dès que le DOM est prêt (ce script, chargé à la volée, arrive souvent après) : les icônes paraissent sans attendre
  // images, polices et cartes ; nouvelle passe au chargement complet (decorate est ré-exécutable).
  const start = () => {
    hookRefresh();
    decorate();
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.addEventListener('load', () => {
    hookRefresh();
    decorate();
  });
  window.addEventListener('repository-language-change', () => document.querySelectorAll('.repo-dropzone').forEach(z => z._render?.()));
  window.addEventListener('repository-design-change', () => requestAnimationFrame(decorate));

  window.BlockIcons = {
    refresh: decorate,
    icon,
    dropzone,
    contrast,
    surface,
    retune: () => document.querySelectorAll('.repo-block,.repo-card,.repo-header').forEach(tuneIcons)
  };
})();
