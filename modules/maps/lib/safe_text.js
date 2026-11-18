// V3 maps — les deux petits gardes des textes et des nombres que la Carte lit dans ce qui vient d'ailleurs (un document de Carburant, le nom d'un lieu de la base, un état gardé
// sur l'appareil), bâtis sur ceux du cadre (frame/lib/untrusted.js, SOG-0468 : UNE définition) : ils ne redéfinissent ni le nettoyage des caractères invisibles ni le nombre fini.
//   import { text, inRange } from './lib/safe_text.js';
import {
  clean,
  bounded
} from '../../../frame/lib/untrusted.js';

/** Un texte d'entrée externe, prêt à être écrit (puis échappé) : une chaîne seulement (rien d'autre n'est converti), sans signes de contrôle ni < >, sans marques de format
 *  invisibles (U+202E, U+2066… : un nom ne se lit pas à l'envers), les blancs repliés et rognés, borné à `n` signes ; '' sinon. */
export const text = (v, n) => typeof v === 'string' ? clean(v.replace(/[\u0000-\u001f<>\p{Cf}]/gu, ' ')).slice(0, n) : '';
/** Un NOMBRE dans ses bornes (comprises) : jamais une conversion (null, '' et true feraient 0 ou 1) ; vrai ou faux. */
export const inRange = (v, lo, hi) => bounded(v, lo, hi) !== null;
