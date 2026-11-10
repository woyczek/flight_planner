// V3 report — famille COMMERCIAL (SOG-0202 T2, V3_SPECIFICATION § 10.48 ; l'utilisateur, 10 nov. : « « commercial » est un grand thème.
// dedans, on « devrait » trouver : cargo, passagers, rapatriement vide, etc. ») : le 17e thème de la table unique, sans bloc propre — ses
// séries (frame/lib/mission_themes.js) disent ce que le vol transporte (fret en kg, passagers), et la carte « Charge » du pas Vol le
// demande ; lettre E des numéros de compte rendu (CRE-001-0), sigle CAT (Commercial Air Transport).
import * as MT from '../../../frame/lib/mission_themes.js';

const T = MT.themeOf('COMMERCIAL');

const FAMILY = {
  id: 'COMMERCIAL',
  idPrefix: 'CAT',
  defaultCategory: 'fixed',
  pages: {},
  title: [...T.labels],
  series: MT.seriesOf('COMMERCIAL'),
  events: [],
  blocks: []
};

export default FAMILY;
