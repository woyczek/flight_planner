// Shared live translation binding. Source strings never depend on current DOM language.
// Couche de traduction unique de la page : chaque fichier de traductions appelle RepositoryContentI18n(lignes) ; les
// lignes [fr, en, de, es] rejoignent un index commun, un seul observateur suit la page, et seuls les nœuds ajoutés ou
// modifiés sont traités (passe complète au changement de langue et à l'arrivée de nouvelles lignes). Avant : une
// couche par fichier (index, observateur et passe complète de tout le document chacune) — dix passes par action.
(() => {
  'use strict';
  const languages = ['fr', 'en', 'de', 'es'],
    index = new Map(),
    records = new WeakMap();
  let version = 0, // change à chaque arrivée de lignes : les textes notés « inconnus » sont réexaminés
    prefixKeys = new Map(); // premier mot → textes connus pouvant commencer un texte plus long (du plus long au plus court)
  // clé de comparaison : espaces normalisés, sans espace devant : ; ! ? » ni après « — la typographie de la langue
  // affichée (espace fine du français, aucune en anglais) est posée avant la traduction et ne doit pas l'empêcher
  const norm = s => String(s).trim().replace(/\s+/g, ' ').replace(/ ([:;!?»])/g, '$1').replace(/« /g, '«');
  /** Fin du texte d'origine après le texte connu item (repéré dans le texte normalisé) : espaces et typographie
   *  d'origine conservés — reprendre la fin normalisée (sans espace devant « ; : ») faisait se disputer deux couches de
   *  traduction sans fin. null si introuvable. */
  const tailAfter = (value, item) => {
    for (let k = item.length; k <= value.length; k++) {
      const n = norm(value.slice(0, k));
      if (n === item) return value.slice(k).replace(/\s+$/, '');
      if (n.length > item.length) break;
    }
    return null;
  };
  // Zones non traduites : code, saisie, [data-no-i18n] (textes déjà composés dans la langue courante), outils de
  // l'en-tête et des blocs (traduits par le menu). Un conteneur [data-i18n] placé dans ces outils (ex. options de
  // page rangées dans le menu ☰) est de nouveau traduit.
  const excluded = el => {
    const x = el?.closest('script,style,textarea,pre,[contenteditable],[data-no-i18n],.repo-header-tools,.repo-block-tools');
    if (!x) return false;
    const opt = el.closest('[data-i18n]');
    return !(opt && x.contains(opt) && !opt.closest('[data-no-i18n]'))
  };
  // attributs (infobulles, indications) : traduits aussi dans les zones [data-no-i18n] — contenus calculés dont les
  // libellés d'infobulle restent fixes ; [data-no-i18n="all"] les exclut aussi
  const attrExcluded = el => !!el?.closest(
    'script,style,pre,[contenteditable],[data-no-i18n="all"],.repo-header-tools,.repo-block-tools');
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  // garde-fou : un même texte réécrit plus de 12 fois en 5 s, c'est qu'un autre code se le dispute — on cesse d'y
  // toucher (et on le signale une fois dans la console)
  const writes = new WeakMap();
  const runaway = node => {
    const now = Date.now(),
      w = writes.get(node) || {
        n: 0,
        t: now
      };
    if (now - w.t > 5000) {
      w.n = 0;
      w.t = now;
    }
    w.n++;
    writes.set(node, w);
    if (w.n > 12) {
      if (!w.warned) console.warn('content_i18n : texte réécrit en boucle, laissé tel quel :', (node.nodeValue || node.getAttribute?.(
        'title') || '').slice(0, 80));
      w.warned = true;
      return true;
    }
    return false;
  };
  // Typographie de la langue affichée, appliquée à l'affichage (nœuds texte et attributs), jamais aux sources où
  // le texte côtoie du code : voir RepositoryContentI18n.typography plus bas.
  const frTypo = (value, lang, el) => !value || el?.closest?.('code,kbd,samp') ? value : window.RepositoryContentI18n.typography(value,
    lang);

  /** Traduction d'un texte (valeur d'un nœud ou d'un attribut key de owner) dans lang : ligne de traduction trouvée par le texte entier (espaces normalisés) ou par un préfixe connu suivi d'une fin libre ; espaces de tête et de queue conservés. Mémorise la ligne par nœud pour retraduire au changement de langue. Texte inconnu : inchangé. */
  function translate(value, owner, key, lang) {
    let all = records.get(owner);
    if (!all) {
      all = {};
      records.set(owner, all)
    }
    let rec = all[key];
    if (rec?.miss === value && rec.version === version) return value; // inconnu, sans nouvelles lignes depuis : inchangé
    if (!rec || rec.miss !== undefined || value !== rec.last) {
      const normalized = norm(value);
      let row = index.get(normalized),
        tail = '';
      // texte connu suivi de signes seulement (flèche de tri ↕ ▲ ▼, astérisque, deux-points) : quelle que soit sa longueur
      if (!row) {
        const m = /^(.*?)(\s*[↕▲▼↑↓*:]+)$/u.exec(value.trim()); // signes du texte d'origine (espace comprise)
        if (m && index.has(norm(m[1]))) {
          row = index.get(norm(m[1]));
          tail = m[2]
        }
      }
      // « début libre — texte connu » (en-têtes « FIRE / GAAR — Compte rendu de mission ») : le texte connu est
      // traduit, le début aussi s'il est connu
      let head = '',
        headRow = null;
      if (!row) {
        const m = /^(.+?) — (.+)$/.exec(normalized);
        if (m && index.has(m[2]) && m[2].length >= 6) {
          row = index.get(m[2]);
          headRow = index.get(m[1]) || null;
          const v = value.trim(),
            i = v.indexOf(' — ');
          head = (i >= 0 ? v.slice(0, i) : m[1]) + ' — '; // début d'origine (typographie conservée)
        }
      }
      // texte connu suivi d'une fin libre
      if (!row) {
        // candidats du même premier mot seulement (un texte qui commence par « item␣ » a le même premier mot que item)
        const source = (prefixKeys.get(normalized.split(' ', 1)[0]) || []).find(item => normalized.startsWith(item + ' '));
        const rest = source ? tailAfter(value.replace(/^\s+/, ''), source) : null;
        if (source && rest != null) {
          row = index.get(source);
          tail = rest
        }
      }
      if (!row) {
        all[key] = {
          miss: value,
          version
        };
        return value;
      }
      rec = all[key] = {
        row,
        tail,
        head,
        headRow,
        prefix: value.match(/^\s*/)[0],
        suffix: value.match(/\s*$/)[0]
      }
    }
    const pick = r => r[languages.indexOf(lang)] || r[1];
    rec.last = rec.prefix + (rec.headRow ? pick(rec.headRow) + ' — ' : rec.head || '') + pick(rec.row) + rec.tail + rec.suffix;
    return rec.last;
  }

  const lang = () => window.RepositoryNav?.getLanguage() || 'en';
  /** Un nœud texte : traduit (hors zones exclues ; outils d'en-tête : typographie seule). */
  function doText(node, l) {
    const el = node.parentElement;
    if (!el || el.closest('script,style,textarea,pre,[contenteditable]')) return;
    const next = frTypo(excluded(el) ? node.nodeValue : translate(node.nodeValue, node, 'text', l), l, el);
    if (next !== node.nodeValue && !runaway(node)) node.nodeValue = next
  }
  /** Attributs title / placeholder / aria-label et valeur d'un champ en lecture seule d'un élément. */
  function doAttrs(el, l) {
    if (!attrExcluded(el.tagName === 'TEXTAREA' ? el.parentElement : el)) // attributs d'une zone de texte traduits, son contenu non
      for (const key of ATTRS) {
        const value = el.getAttribute(key);
        if (value !== null) {
          const next = frTypo(translate(value, el, key, l), l, el);
          if (next !== value && !runaway(el)) el.setAttribute(key, next)
        }
      }
    if (el.tagName === 'INPUT' && el.readOnly && el.hasAttribute('value') && !excluded(el)) {
      const value = el.value,
        next = translate(value, el, 'value', l);
      if (next !== value) el.value = next
    }
  }
  /** Sous-arbre (nœud ajouté, ou toute la page) : textes puis attributs. */
  function doTree(root, l) {
    if (root.nodeType === 3) return doText(root, l);
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n;
      (n = walker.nextNode());) doText(n, l);
    if (root.nodeType === 1 && (ATTRS.some(a => root.hasAttribute(a)) || root.tagName === 'INPUT')) doAttrs(root, l);
    root.querySelectorAll?.('[title],[placeholder],[aria-label],input[readonly][value]').forEach(el => doAttrs(el, l));
  }

  let observer = null,
    full = false, // passe complète demandée (langue, nouvelles lignes)
    pending = false;
  const dirty = new Set(); // nœuds ajoutés ou modifiés depuis la dernière passe
  /** Passe : complète si demandée, sinon seulement les nœuds ajoutés ou modifiés ; l'observateur est suspendu pendant la
   *  passe pour ne pas se relancer lui-même. */
  function apply() {
    pending = false;
    if (!document.body) return;
    observer?.disconnect();
    const l = lang();
    try {
      if (full) {
        full = false;
        dirty.clear();
        doTree(document.body, l);
        // titre de l'onglet (hors du corps de la page) : même table, texte d'origine gardé comme pour un nœud
        if (document.title) {
          const t = translate(document.title, document.documentElement, 'document-title', l);
          if (t !== document.title) document.title = t;
        }
      } else {
        const list = [...dirty];
        dirty.clear();
        for (const n of list)
          if (n.isConnected) n.nodeType === 2 ? null : doTree(n, l);
      }
    } finally {
      observer?.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRS
      })
    }
  }
  let run = apply;
  if (window.__perf) run = () => window.__perf.time('i18n', apply); // audit de performance (tools/perf_audit.html)
  // prochaine image ; onglet en arrière-plan (pas d'image) : au plus tard 150 ms après
  const schedule = () => {
    if (pending) return;
    pending = true;
    const go = () => pending && run();
    requestAnimationFrame(go);
    setTimeout(go, 150)
  };

  function start() {
    if (observer || !document.body) return;
    observer = new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach(n => dirty.add(n));
        else if (m.type === 'characterData') dirty.add(m.target);
        else if (m.type === 'attributes' && m.target.nodeType === 1) dirty.add(m.target);
      }
      schedule()
    });
    window.addEventListener('repository-language-change', () => {
      full = true;
      run()
    });
  }

  /** Ajoute des lignes [fr, en, de, es] à la traduction de la page (un appel par fichier de traductions) et traduit la
   *  page ; les appels suivants n'ajoutent que leurs lignes. */
  window.RepositoryContentI18n = function(rows) {
    let added = 0;
    for (const row of rows || [])
      for (const value of row || [])
        if (value && !index.has(norm(value))) {
          index.set(norm(value), row);
          added++;
        }
    if (added) {
      version++;
      prefixKeys = new Map();
      for (const item of [...index.keys()].filter(item => item.length >= 8 || /[.:→]$/.test(item)).sort((a, b) => b.length - a
          .length)) {
        const w = item.split(' ', 1)[0];
        prefixKeys.has(w) ? prefixKeys.get(w).push(item) : prefixKeys.set(w, [item]);
      }
    }
    full = true;
    if (!document.body) { // fichier chargé dans l'en-tête : passe quand le corps de la page existe
      document.addEventListener('DOMContentLoaded', () => window.RepositoryContentI18n([]), {
        once: true
      });
      return;
    }
    start();
    // appels groupés (un par fichier de traductions au chargement) : une seule passe complète, avant l'affichage
    if (!queued) {
      queued = true;
      queueMicrotask(() => {
        queued = false;
        run();
      });
    }
  };
  let queued = false;
  window.RepositoryContentI18n.lookup = value => index.get(norm(value)) || null; // ligne d'un texte (outils, audit)
  // Typographie d'une chaîne selon la langue :
  //  - fr : espace fine insécable (U+202F) avant « : ; ! ? » » et après « « », à la place d'une espace simple ou
  //    insécable — sans elle, le retour à la ligne peut rejeter la ponctuation en début de ligne ;
  //  - en / de / es : pas d'espace avant « : ; ! ? » (textes source français restés tels quels dans une traduction).
  window.RepositoryContentI18n.typography = (value, lang) => {
    const v = String(value ?? '');
    return lang === 'fr' ?
      v.replace(/[  ](?=[:;!?»])/g, ' ').replace(/«[  ]/g, '« ') :
      v.replace(/[   ]+(?=[:;!?](?:\s|$))/g, '')
  };
  window.RepositoryContentI18n.frTypo = value => window.RepositoryContentI18n.typography(value, 'fr');
})();
