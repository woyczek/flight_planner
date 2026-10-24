// COPIE DE MAPS, À REMPLACER PAR modules/maps/lib/map_base.js (décision du relais, 24 oct 2026 : le socle de carte sort
// dans maps/lib, propriété du module Carte, et Atmosphère l'importe comme render.js). Recopié de modules/maps/module.js
// (loadMapLibre, STYLE_URL, STYLE_NIGHT) ; ne pas le faire évoluer ici : le jour où map_base.js existe, ce fichier est
// supprimé et ses imports pointent là-bas.

/** Fonds de la Carte : positron le jour, dark la nuit. */
export const STYLE_DAY = 'https://tiles.openfreemap.org/styles/positron',
  STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark';

/** MapLibre du module Carte (script UMD et sa feuille, dans modules/maps/lib/), chargé une fois ; null s'il ne charge pas. */
let mlP = null;
export function loadMapLibre() {
  return mlP ||= new Promise(ok => {
    if (window.maplibregl) return ok(window.maplibregl);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('../maps/lib/maplibre-gl.css?v=0', import.meta.url).href;
    document.head.append(css);
    const sc = document.createElement('script');
    sc.src = new URL('../maps/lib/maplibre-gl.js?v=0', import.meta.url).href;
    sc.onload = () => ok(window.maplibregl || null);
    sc.onerror = () => {
      mlP = null;
      ok(null);
    };
    document.head.append(sc);
  });
}
