// V3 maps — taille mémoire des canvas de surcouche (SOG-0067). Le canvas de la surcouche, sa copie du geste et les deux canvas du
// profil ont la taille de la vue × le rapport de pixels de l'écran, chacun en 4 octets par pixel : sur une fenêtre élargie d'un écran
// à fort rapport de pixels, quatre canvas de plusieurs dizaines de Mo (5760 × 3240 à 3 : 75 Mo chacun) épuisent la mémoire de la page.
// MapLibre borne déjà son propre canvas (maxCanvasSize, 4096 × 4096) ; les nôtres le sont ici, à la même place pour tous.

/** Surface maximale d'un canvas de surcouche, en pixels (8 millions : 32 Mo). Une vue de 1920 × 900 à un rapport de 2 (6,9 millions)
 *  n'est pas touchée ; un écran 4K plein cadre à 2 (23 millions) est dessiné à 1,3. */
export const MAX_CANVAS_PX = 8e6;

/** Rapport de pixels d'un canvas de W × H pixels CSS : celui de l'écran (3 au plus), réduit pour que la surface ne passe pas
 *  MAX_CANVAS_PX (jamais sous 0,5). */
export const canvasDpr = (W, H, dpr = window.devicePixelRatio || 1) => Math.max(.5, Math.min(3, dpr, Math.sqrt(MAX_CANVAS_PX / Math.max(1,
  W * H))));
