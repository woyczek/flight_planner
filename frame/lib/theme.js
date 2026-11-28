// V3 frame/lib — le THÈME du cadre, lu en UN seul endroit (SOG-0720, décision de l'ergonome ; le fait : BUGS). Le cadre pose `<html data-design>` et `<html data-tone="day|night">` (frame/app.js applyDesign) et
// retire `data-tone` en « auto » (le ton suit alors l'appareil : prefers-color-scheme). Aucune fonction ne disait « sombre » : `tone === 'night' || (tone !== 'day' && matchMedia(…).matches)` était recopié
// (signaler.js, cards.js, atmosphere) et la Carte lisait la clarté de --sog-chart-bg. Ici le résultat visuel, résolu : design, ton, auto → sombre ou clair, et un événement quand il change.
//
// API (aucun état : tout est lu sur <html>) :
//   resolveTone(tone, prefersDark?) → 'night' | 'day' : un ton RÉGLÉ ('day', 'night', 'auto' ou rien) résolu ; `prefersDark` (défaut : le réglage de l'appareil) ne sert qu'à « auto ».
//   themeOf(root?, prefersDark?) → { design, tone: 'night' | 'day', dark: bool, auto: bool } : le thème POSÉ sur la page (root : <html> par défaut) ; `design` est celui qui s'applique (data-design).
//   onTheme(fn, signal?) → fn(theme) à chaque changement du design ou du ton RÉSOLU (un réglage du cadre, ou le réglage de l'appareil quand le ton est « auto ») ; rend la fonction qui l'arrête ;
//     `signal` (AbortSignal) l'arrête aussi (le démontage d'un écran). L'événement de window `frame-theme` { detail: theme } dit la même chose à qui préfère l'écouter.
//   Le cadre le donne aux écrans classiques en synchrone : window.SogFrame.theme (themeOf, resolveTone, onTheme).
// Un seul observateur pour toute la page (sur <html>, data-design et data-tone) et un seul écouteur du réglage de l'appareil, posés au premier import ; ils ne réécrivent rien.

const DARK_QUERY = '(prefers-color-scheme: dark)';
const prefersDarkNow = () => {
  try {
    return matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
};

export const resolveTone = (tone, prefersDark = prefersDarkNow()) => tone === 'night' || tone !== 'day' && prefersDark ? 'night' : 'day';

export function themeOf(root = document.documentElement, prefersDark = prefersDarkNow()) {
  const set = root.dataset.tone === 'day' || root.dataset.tone === 'night' ? root.dataset.tone : '',
    tone = resolveTone(set, prefersDark);
  return {
    design: root.dataset.design || 'standard',
    tone,
    dark: tone === 'night',
    auto: !set
  };
}

// L'état est UN pour la page, pas un par copie du module : le même fichier importé sous deux adresses (« theme.js?v=0 » par le cadre, « theme.js » par un module) est deux copies, donc deux observateurs et deux
// événements par changement — le cas A409 l'a vu au train 12. Les copies se partagent donc cet objet, posé une fois sur la page.
const shared = globalThis[Symbol.for('sog.frame.theme')] ||= {
  subscribers: new Set(),
  last: null,
  started: false
};
const {
  subscribers
} = shared;
const key = t => `${t.design}|${t.tone}`;

function changed() {
  const now = themeOf();
  if (shared.last && key(shared.last) === key(now)) return;
  shared.last = now;
  for (const fn of [...subscribers]) try {
    fn(now);
  } catch (e) {
    console.error(e);
  }
  window.dispatchEvent(new CustomEvent('frame-theme', {
    detail: now
  }));
}

function start() {
  if (shared.started || typeof document === 'undefined') return;
  shared.started = true;
  shared.last = themeOf();
  new MutationObserver(changed).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-design', 'data-tone']
  });
  try {
    matchMedia(DARK_QUERY).addEventListener('change', changed);
  } catch {
    /* un navigateur sans écouteur de média : le ton « auto » ne suit pas l'appareil en cours de page */
  }
}

export function onTheme(fn, signal) {
  if (typeof fn !== 'function') return () => {};
  start();
  subscribers.add(fn);
  const stop = () => subscribers.delete(fn);
  signal?.addEventListener('abort', stop, {
    once: true
  });
  return stop;
}
start();
