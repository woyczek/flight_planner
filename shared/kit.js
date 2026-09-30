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
(() => {
  'use strict';
  if (window.RepositoryKit) return;

  const LANGS = ['fr', 'en', 'de', 'es'];

  /** Échappe un texte pour HTML (& < > " '). */
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ------------------------------------------------------------------ langue
  /** Langue courante de la suite (fr par défaut, avant que RepositoryNav soit prêt). */
  const lang = () => window.RepositoryNav?.getLanguage?.() || document.documentElement.lang || 'fr';
  /** Rang de la langue courante dans LANGS (0 si inconnue). */
  const langIndex = () => Math.max(0, LANGS.indexOf(lang()));
  /**
   * Ligne de traduction [fr, en, de, es] dans la langue courante (repli : français) ; typographie de la langue appliquée
   * (espaces fines insécables du français : content_i18n.js) sauf { typo: false }.
   */
  const t = (row, { typo = true } = {}) => {
    const s = Array.isArray(row) ? row[langIndex()] ?? row[0] ?? '' : String(row ?? '');
    const f = typo && window.RepositoryContentI18n?.typography;
    return f ? f(s, lang()) : s;
  };

  // ------------------------------------------------------------------ stockage local (navigation privée, stockage bloqué : sans erreur)
  const store = {
    /** Valeur texte de la clé, sinon défaut. */
    get(key, fallback = null) {
      try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    },
    /** Écrit la valeur ; false si le stockage est indisponible. */
    set(key, value) {
      try { localStorage.setItem(key, value); return true; } catch { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); return true; } catch { return false; }
    },
    /** Valeur JSON de la clé, sinon défaut (clé absente ou illisible). */
    json(key, fallback = null) {
      try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
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
    const [r, g, b] = v.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  /** Rapport de contraste WCAG entre deux couleurs (1 à 21) ; 0 si l'une est illisible. */
  const contrast = (a, b) => {
    if (!rgb(a) || !rgb(b)) return 0;
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  };
  /** Couleur HSL (teinte en degrés, saturation et clarté en %) → « #rrggbb ». */
  const hsl = (h, s, l) => {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
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
    return { h, s, l };
  };
  /** Couleur → [teinte (degrés), saturation (%)] arrondies ; gris ou illisible : [214, 0]. */
  const hueSat = c => {
    const x = toHsl(c);
    return x && x.s ? [Math.round(x.h), Math.round(x.s * 100)] : [214, 0];
  };
  /** Clarté HSL d'une couleur, en % (0 si illisible). */
  const lightness = c => (toHsl(c)?.l || 0) * 100;

  window.RepositoryKit = {
    LANGS, esc, lang, langIndex, t, store,
    color: { rgb, hex, luminance, contrast, hsl, toHsl, hueSat, lightness }
  };
})();
