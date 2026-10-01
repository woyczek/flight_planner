// Boîte à outils commune de la suite (window.RepositoryKit) : petits utilitaires jusqu'ici recopiés dans chaque module
// (échappement HTML, langue et traductions, stockage local protégé, couleurs et contraste WCAG). Chargé par chaque page
// juste avant repository_nav.js ; sans dépendance. Les fonctions de langue lisent RepositoryNav au moment de l'appel
// (il est posé juste après ce fichier).
//
// Usage : const K = window.RepositoryKit;
//   K.esc(texte)                         texte échappé pour HTML
//   K.lang() / K.langIndex()             langue courante (fr, en, de, es) / son rang dans K.LANGS
//   K.t([fr, en, de, es])                ligne de traduction dans la langue courante (typographie française appliquée)
//   K.store.get(clé, défaut) / .set / .remove / .json(clé, défaut) / .setJson
//   K.color.rgb(c) / .hex(rgb) / .luminance(c) / .contrast(a, b) / .hsl(h, s, l) / .hueSat(c) / .lightness(c)
//   K.noFolderAccess()                   message : choix d'un dossier impossible ici (Brave, Firefox, http hors localhost)
(() => {
  'use strict';
  if (window.RepositoryKit) return;

  // ------------------------------------------------------------------ couches CSS (docs/REFACTORING_TOOLKIT.md, phase 3)
  // Socle, styles des pages et styles posés par les scripts partagent la couche « app » (ordre et spécificité entre eux
  // inchangés) ; les designs restent hors couche, au-dessus, et l'emportent sans !important. Les feuilles du socle et les
  // <style> des pages sont rangés par tools/layer_app.py (data-layer) ; ici, tout autre <style> — posé par un script,
  // avant ce fichier ou après — est placé dans « app ». Ses !important (dans une couche, un !important passerait devant
  // ceux des designs) deviennent des règles renforcées « :not(#imp) » (spécificité + 1-0-0 : devant les autres règles de
  // l'application comme avant, derrière les designs ; tools/strip_page_important.py --bump fait de même pour les
  // feuilles) ; gardent le leur : display: none (masquage), un !important suivi de /* garder */ (règle qui doit
  // l'emporter sur l'habillage des designs) et les blocs @media. Règles des designs (html[data-skeuo|design|tone|decor|
  // icons|app-theme…]) : hors couche, intactes (comme tools/layer_app.py). Déjà en couche ou marqué data-layer : inchangé.
  const cssBlocks = css => {
    const out = [];
    let depth = 0,
      start = 0;
    for (let i = 0; i < css.length; i++)
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && !--depth) {
        out.push(css.slice(start, i + 1));
        start = i + 1;
      }
    if (css.slice(start).trim()) out.push(css.slice(start));
    return out;
  };
  const isDesign = b => /^\s*(\/\*[\s\S]*?\*\/\s*)*html(:is\()?\[data-(skeuo|design|tone|decor|icons|app-theme)/.test(b);
  /** Découpe sur sep hors parenthèses et guillemets. */
  const splitTop = (s, sep) => {
    const out = [];
    let depth = 0,
      q = '',
      cur = '';
    for (const c of s) {
      if (q) q = c === q ? '' : q;
      else if (c === '"' || c === "'") q = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === sep && !depth) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += c;
    }
    out.push(cur);
    return out;
  };
  /** « a .b::before » → « a .b:not(#imp)::before » ; sinon ajouté à la fin de chaque sélecteur. */
  const bumpSel = sel => splitTop(sel, ',').map(x => {
    x = x.trim();
    for (let i = 0, d = 0; i < x.length; i++) {
      if (x[i] === '(') d++;
      else if (x[i] === ')') d--;
      else if (!d && x[i] === ':' && /^(::[\w-]+|:(before|after|first-line|first-letter)\b)/.test(x.slice(i))) return `${x.slice(0, i)}:not(#imp)${x.slice(i)}`;
    }
    return `${x}:not(#imp)`;
  }).join(',');
  /** Règle de l'application : ses !important (hors display: none et « garder ») en règle renforcée à la suite. */
  const bumpBlock = b => {
    if (/^\s*@/.test(b.replace(/\/\*[\s\S]*?\*\//g, '')) || !b.includes('{')) return b;
    const i = b.indexOf('{'),
      head = b.slice(0, i),
      body = b.slice(i + 1, b.lastIndexOf('}'));
    const keep = [],
      imp = [];
    for (const d of splitTop(body, ';').filter(x => x.trim())) {
      const m = /\s*!important\s*$/.exec(d);
      if (m && !/display\s*:\s*none\s*$/i.test(d.slice(0, m.index).trim()) && !/\/\*\s*garder/.test(d)) imp.push(d.slice(0, m.index).trim());
      else keep.push(d.trim());
    }
    if (!imp.length) return b;
    return `${keep.length ? `${head}{${keep.join(';')}}` : ''}${bumpSel(head.replace(/\/\*[\s\S]*?\*\//g, ''))}{${imp.join(';')}}`;
  };
  const toApp = s => {
    if (!s || s.dataset.layer || !s.textContent.trim() || /^\s*@layer\b/.test(s.textContent)) return;
    s.dataset.layer = 'app';
    const all = cssBlocks(s.textContent);
    s.textContent = `@layer app {\n${all.filter(b => !isDesign(b)).map(bumpBlock).join('')}\n}\n${all.filter(isDesign).join('')}`;
  };
  document.querySelectorAll('style').forEach(toApp);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.target.nodeName === 'STYLE') toApp(m.target); // contenu posé après l'insertion
      for (const n of m.addedNodes)
        if (n.nodeName === 'STYLE') toApp(n);
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  const LANGS = ['fr', 'en', 'de', 'es'];

  /** Échappe un texte pour HTML (& < > " '). */
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);

  // ------------------------------------------------------------------ langue
  /** Langue courante de la suite (fr par défaut, avant que RepositoryNav soit prêt). */
  const lang = () => window.RepositoryNav?.getLanguage?.() || document.documentElement.lang || 'fr';
  /** Rang de la langue courante dans LANGS (0 si inconnue). */
  const langIndex = () => Math.max(0, LANGS.indexOf(lang()));
  /**
   * Ligne de traduction [fr, en, de, es] dans la langue courante (repli : français) ; typographie de la langue appliquée
   * (espaces fines insécables du français : content_i18n.js) sauf { typo: false }.
   */
  const t = (row, {
    typo = true
  } = {}) => {
    const s = Array.isArray(row) ? row[langIndex()] ?? row[0] ?? '' : String(row ?? '');
    const f = typo && window.RepositoryContentI18n?.typography;
    return f ? f(s, lang()) : s;
  };

  // ------------------------------------------------------------------ stockage local (navigation privée, stockage bloqué : sans erreur)
  const store = {
    /** Valeur texte de la clé, sinon défaut. */
    get(key, fallback = null) {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    /** Écrit la valeur ; false si le stockage est indisponible. */
    set(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    /** Valeur JSON de la clé, sinon défaut (clé absente ou illisible). */
    json(key, fallback = null) {
      try {
        return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
      } catch {
        return fallback;
      }
    },
    setJson(key, value) {
      return store.set(key, JSON.stringify(value));
    }
  };

  // ------------------------------------------------------------------ couleurs
  /** « #rgb », « #rrggbb » ou « rgb(a)(…) » → [r, g, b] (0–255) ; null si illisible ou totalement transparent. */
  const rgb = c => {
    const s = String(c || '').trim();
    let m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      const h = m[1].length === 3 ? [...m[1]].map(x => x + x).join('') : m[1];
      return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    }
    m = s.match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return v.length > 3 && v[3] === 0 ? null : v.slice(0, 3);
  };
  /** [r, g, b] → « #rrggbb ». */
  const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  /** Luminance relative WCAG (0 à 1) ; couleur illisible : 1 (blanc). */
  const luminance = c => {
    const v = rgb(c);
    if (!v) return 1;
    const [r, g, b] = v.map(x => {
      x /= 255;
      return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  /** Rapport de contraste WCAG entre deux couleurs (1 à 21) ; 0 si l'une est illisible. */
  const contrast = (a, b) => {
    if (!rgb(a) || !rgb(b)) return 0;
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  };
  /** Couleur HSL (teinte en degrés, saturation et clarté en %) → « #rrggbb ». */
  const hsl = (h, s, l) => {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12,
      a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return hex([f(0), f(8), f(4)].map(v => v * 255));
  };
  /** Couleur → { h (degrés), s (0–1), l (0–1) } ; null si illisible. */
  const toHsl = c => {
    const v = rgb(c);
    if (!v) return null;
    const [r, g, b] = v.map(x => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    const h = !d ? 0 : (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
    return {
      h,
      s,
      l
    };
  };
  /** Couleur → [teinte (degrés), saturation (%)] arrondies ; gris ou illisible : [214, 0]. */
  const hueSat = c => {
    const x = toHsl(c);
    return x && x.s ? [Math.round(x.h), Math.round(x.s * 100)] : [214, 0];
  };
  /** Clarté HSL d'une couleur, en % (0 si illisible). */
  const lightness = c => (toHsl(c)?.l || 0) * 100;

  /** Pourquoi ce navigateur ne peut pas choisir de dossier (File System Access API absente) et quoi faire : Brave la
   *  désactive par défaut (réglage à activer) ; page en http hors localhost (contexte non sécurisé) ; Firefox, Safari. */
  const noFolderAccess = () =>
    !window.isSecureContext ? t([`Choix d’un dossier impossible : page servie en http depuis ${location.host}. Ouvrir la suite par http://127.0.0.1 ou http://localhost (ou en https).`, `Cannot choose a folder: page served over http from ${location.host}. Open the suite via http://127.0.0.1 or http://localhost (or https).`, `Ordnerwahl nicht möglich: Seite per http von ${location.host}. Die Suite über http://127.0.0.1 oder http://localhost (oder https) öffnen.`, `No se puede elegir una carpeta: página servida por http desde ${location.host}. Abrir la suite con http://127.0.0.1 o http://localhost (o https).`])
    : navigator.brave ? t(['Brave désactive l’accès aux dossiers locaux. Pour l’activer : ouvrir brave://flags/#file-system-access-api, passer « File System Access API » à Enabled, puis relancer Brave. Ou utiliser Chrome / Edge.', 'Brave disables local folder access. To enable it: open brave://flags/#file-system-access-api, set “File System Access API” to Enabled, then restart Brave. Or use Chrome / Edge.', 'Brave deaktiviert den Zugriff auf lokale Ordner. Aktivieren: brave://flags/#file-system-access-api öffnen, „File System Access API“ auf Enabled setzen, Brave neu starten. Oder Chrome / Edge verwenden.', 'Brave desactiva el acceso a carpetas locales. Para activarlo: abrir brave://flags/#file-system-access-api, poner «File System Access API» en Enabled y reiniciar Brave. O usar Chrome / Edge.'])
    : t(['Ce navigateur ne permet pas de choisir un dossier local (File System Access API) : utiliser Chrome ou Edge.', 'This browser cannot choose a local folder (File System Access API): use Chrome or Edge.', 'Dieser Browser kann keinen lokalen Ordner wählen (File System Access API): Chrome oder Edge verwenden.', 'Este navegador no permite elegir una carpeta local (File System Access API): usar Chrome o Edge.']);

  window.RepositoryKit = {
    LANGS,
    esc,
    lang,
    langIndex,
    t,
    store,
    noFolderAccess,
    color: {
      rgb,
      hex,
      luminance,
      contrast,
      hsl,
      toHsl,
      hueSat,
      lightness
    }
  };
})();
