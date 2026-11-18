// V3 fuel — la liste de propositions sous un champ est un bloc commun depuis SOG-0465 : frame/lib/suggest_list.js. Ce fichier la
// réexporte pour ses lecteurs d'avant (routecomplete.js, Aéronefs), sans rien changer à leur import.
export {
  createSuggestList
}
from '../../frame/lib/suggest_list.js';
