// Traduction automatique des contenus rédigés en français (brief de mission, plis…) quand la mission n'apporte pas sa
// traduction (bloc i18n du YAML, MissionI18n) : traducteur intégré du navigateur (API Translator de Chrome / Edge),
// sur l'ordinateur — aucun texte n'est envoyé en ligne. Les traductions sont gardées dans ce navigateur
// (machineTranslate:v1, 3 000 textes au plus) : un texte déjà traduit s'affiche aussitôt, sans attente.
//
// Usage synchrone puis redessin : MT.text(s) rend la traduction connue, sinon le texte d'origine (noté) ; après le
// rendu, MT.flush({ onDone, onNeedClick, onUnavailable }) traduit les textes notés puis appelle onDone (redessiner) ;
// le modèle de langue à télécharger demande un clic (onNeedClick(start) : start() à appeler depuis ce clic).
// Sans API (Firefox, Safari, ancien Chrome) : onUnavailable, textes laissés en français.
(() => {
  'use strict';
  if (window.MachineTranslate) return;
  const KEY = 'machineTranslate:v1',
    MAX = 3000;
  /** Langue d'affichage de la page (RepositoryNav, sinon RepositoryKit), « fr » par défaut. */
  const lang = () => window.RepositoryNav?.getLanguage?.() || window.RepositoryKit?.lang?.() || 'fr';
  let cache = null;
  /** Cache des traductions { langue: { empreinte: texte } }, lu une fois dans localStorage (machineTranslate:v1). */
  const load = () => {
    if (cache) return cache;
    try {
      cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch {
      cache = {};
    }
    return cache;
  };
  /** Enregistre le cache en ne gardant que les MAX dernières traductions par langue (les plus anciennes sautent). */
  const save = () => {
    try {
      const c = load();
      for (const l of Object.keys(c)) {
        const k = Object.keys(c[l]);
        if (k.length > MAX)
          for (const x of k.slice(0, k.length - MAX)) delete c[l][x];
      }
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {
      /* stockage plein ou indisponible : traductions de la session seulement */
    }
  };
  /** Empreinte courte d'un texte (djb2 + longueur, base 36) : clé du cache. */
  const hash = s => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36) + s.length.toString(36);
  };
  const queue = new Set();
  let enabled = true;
  /** Traduction connue de s dans la langue de la page, sinon s (noté pour flush). */
  function text(s, to = lang()) {
    if (!enabled || !s || to === 'fr' || typeof s !== 'string' || !/[a-zà-ÿ]{2}/i.test(s)) return s;
    const hit = load()[to]?.[hash(s)];
    if (hit != null) return hit;
    queue.add(s);
    return s;
  }
  /** Promesse p ou « timeout » au bout de ms millisecondes, pour ne pas attendre un traducteur muet. */
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r('timeout'), ms))]);
  /** Vrai si le navigateur offre l'API Translator (Chrome / Edge récents). */
  const supported = () => typeof self.Translator === 'function';
  const translators = {};
  /** Traducteur fr → to, mis en commun par langue ; null si indisponible, « click » si le modèle doit être
   *  téléchargé et que create est faux (le téléchargement exige un geste de l'utilisateur). */
  async function translator(to, create) {
    if (translators[to]) return translators[to];
    if (!supported()) return null;
    const opts = {
      sourceLanguage: 'fr',
      targetLanguage: to
    };
    const avail = await withTimeout(self.Translator.availability(opts).catch(() => 'unavailable'), 4000);
    if (avail === 'unavailable' || avail === 'timeout') return null; // pas de réponse : traducteur inutilisable ici
    if (avail !== 'available' && !create) return 'click';
    translators[to] = self.Translator.create(opts);
    return translators[to];
  }
  /** Traduit la file des textes notés, paragraphe par paragraphe, les range dans le cache puis appelle onDone(n). */
  async function run(to, tr, onDone) {
    const list = [...queue];
    queue.clear();
    const c = load(),
      out = c[to] = c[to] || {};
    let n = 0;
    for (const s of list) {
      try {
        // paragraphes traduits un à un : sauts de ligne et listes conservés
        const parts = await Promise.all(s.split(/(\n+)/).map(p => /\S/.test(p) && !/^\n+$/.test(p) ? tr.translate(p) : p));
        out[hash(s)] = parts.join('');
        n++;
      } catch {
        /* texte refusé par le traducteur : laissé en français */
      }
    }
    save();
    if (n) onDone?.(n);
  }
  let busy = false;
  /** Traduit les textes notés depuis le dernier rendu ; onDone(n) après traduction (redessiner). */
  async function flush({
    onDone,
    onNeedClick,
    onUnavailable
  } = {}) {
    const to = lang();
    if (!queue.size || busy || to === 'fr') return;
    busy = true;
    try {
      const tr = await translator(to, false);
      if (!tr || tr === 'timeout') {
        queue.clear();
        onUnavailable?.();
        return;
      }
      if (tr === 'click') {
        onNeedClick?.(async () => {
          const t2 = await translator(to, true).catch(() => null);
          if (t2 && t2 !== 'click') await run(to, await t2, onDone);
        });
        return;
      }
      await run(to, await tr, onDone);
    } finally {
      busy = false;
    }
  }
  window.MachineTranslate = {
    text,
    flush,
    supported,
    /** Nombre de textes notés en attente de traduction. */
    pending: () => queue.size,
    /** Coupe (false) ou rétablit la traduction automatique (réglage de page). */
    enable: on => {
      enabled = !!on;
    },
    /** Vide le cache des traductions (mémoire et localStorage). */
    clear: () => {
      cache = {};
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* rien */
      }
    }
  };
})();
