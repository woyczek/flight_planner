// Shared live translation binding. Source strings never depend on current DOM language.
window.RepositoryContentI18n = function(rows) {
  const languages = ['fr', 'en', 'de', 'es'],
    index = new Map(),
    records = new WeakMap();
  // clé de comparaison : espaces normalisés, sans espace devant : ; ! ? » ni après « — la typographie de la langue
  // affichée (espace fine du français, aucune en anglais) est posée avant la traduction et ne doit pas l'empêcher
  const norm = s => String(s).trim().replace(/\s+/g, ' ').replace(/ ([:;!?»])/g, '$1').replace(/« /g, '«');
  rows.forEach(row => row.forEach(value => {
    if (value && !index.has(norm(value))) index.set(norm(value), row)
  }));
  // textes connus pouvant commencer un texte plus long (« texte connu suivi d'une fin libre »), du plus long au plus court
  const prefixKeys = [...index.keys()].filter(item => item.length >= 8 || /[.:→]$/.test(item)).sort((a, b) => b.length - a.length);
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
  let observer, pending = false;
  // garde-fou (toutes les couches de traduction de la page) : un même texte réécrit plus de 12 fois en 5 s, c'est que
  // deux couches se le disputent — on cesse d'y toucher (et on le signale une fois dans la console)
  const writes = window.__i18nWrites ||= new WeakMap();
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
      if (!w.warned) console.warn('content_i18n : texte réécrit en boucle, laissé tel quel :', node.nodeValue?.slice(0, 80));
      w.warned = true;
      return true;
    }
    return false;
  };
  // Typographie de la langue affichée, appliquée à l'affichage (nœuds texte et attributs), jamais aux sources où
  // le texte côtoie du code : voir RepositoryContentI18n.typography plus bas.
  const frTypo = (value, lang, el) => !value || el?.closest?.('code,kbd,samp') ? value : window.RepositoryContentI18n.typography(value, lang);

  /** Traduction d'un texte (valeur d'un nœud ou d'un attribut key de owner) dans lang : ligne de traduction trouvée par le texte entier (espaces normalisés) ou par un préfixe connu suivi d'une fin libre ; espaces de tête et de queue conservés. Mémorise la ligne par nœud pour retraduire au changement de langue. Texte inconnu : inchangé. */
  function translate(value, owner, key, lang) {
    let all = records.get(owner);
    if (!all) {
      all = {};
      records.set(owner, all)
    }
    let rec = all[key];
    if (rec?.miss === value) return value; // texte déjà reconnu comme inconnu : pas de nouvelle recherche
    if (!rec || value !== rec.last) {
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
      // « début libre — texte connu » (avant « texte connu suivi d’une fin libre » ; en-têtes « FIRE / GAAR — Compte rendu de mission ») : le texte connu est
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
      if (!row) {
        const source = prefixKeys.find(item => normalized.startsWith(item + ' '));
        const rest = source ? tailAfter(value.replace(/^\s+/, ''), source) : null;
        if (source && rest != null) {
          row = index.get(source);
          tail = rest
        }
      }
      if (!row) {
        all[key] = {
          miss: value
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

  /** Passe complète sur la page : traduit les nœuds texte (hors zones exclues ; outils d'en-tête : typographie seule), puis les attributs title / placeholder / aria-label et les champs en lecture seule ; l'observateur est suspendu pendant la passe pour ne pas se relancer lui-même. */
  function apply() {
    observer?.disconnect();
    const lang = window.RepositoryNav?.getLanguage() || 'en';
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const el = node.parentElement;
        if (el?.closest('script,style,textarea,pre,[contenteditable]')) continue; /* outils d'en-tête / de bloc : typographie seule (traduits par le menu) */
        const next = frTypo(excluded(el) ? node.nodeValue : translate(node.nodeValue, node, 'text', lang), lang, el);
        if (next !== node.nodeValue && !runaway(node)) node.nodeValue = next
      }
      // attributs (infobulles, indications) : traduits aussi dans les zones [data-no-i18n] — contenus calculés dont les
      // libellés d'infobulle restent fixes ; [data-no-i18n="all"] les exclut aussi
      const attrExcluded = el => !!el?.closest('script,style,pre,[contenteditable],[data-no-i18n="all"],.repo-header-tools,.repo-block-tools');
      document.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el => {
        if (attrExcluded(el.tagName === 'TEXTAREA' ? el.parentElement : el)) return; /* attributs d'une zone de texte traduits, son contenu non */
        for (const key of ['title', 'placeholder', 'aria-label']) {
          const value = el.getAttribute(key);
          if (value !== null) {
            const next = frTypo(translate(value, el, key, lang), lang, el);
            if (next !== value && !runaway(el)) el.setAttribute(key, next)
          }
        }
      });
      document.querySelectorAll('input[readonly][value]').forEach(el => {
        if (excluded(el)) return;
        const value = el.value,
          next = translate(value, el, 'value', lang);
        if (next !== value) el.value = next
      });
    } finally {
      observer?.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title', 'placeholder', 'aria-label']
      })
    }
  }
  observer = new MutationObserver(() => {
    if (!pending) {
      pending = true;
      // prochaine image ; onglet en arrière-plan (pas d'image) : au plus tard 150 ms après
      const run = () => {
        if (!pending) return;
        pending = false;
        apply()
      };
      requestAnimationFrame(run);
      setTimeout(run, 150)
    }
  });
  window.addEventListener('repository-language-change', apply);
  apply();
};
// Typographie d'une chaîne selon la langue :
//  - fr : espace fine insécable (U+202F) avant « : ; ! ? » » et après « « », à la place d'une espace simple ou
//    insécable — sans elle, le retour à la ligne peut rejeter la ponctuation en début de ligne ;
//  - en / de / es : pas d'espace avant « : ; ! ? » (textes source français restés tels quels dans une traduction).
window.RepositoryContentI18n.typography = (value, lang) => {
  const v = String(value ?? '');
  return lang === 'fr' ?
    v.replace(/[ \u00A0](?=[:;!?»])/g, '\u202F').replace(/«[ \u00A0]/g, '«\u202F') :
    v.replace(/[ \u00A0\u202F]+(?=[:;!?](?:\s|$))/g, '')
};
window.RepositoryContentI18n.frTypo = value => window.RepositoryContentI18n.typography(value, 'fr');
