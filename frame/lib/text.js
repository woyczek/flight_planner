// V3 frame/lib (propriétaire : le cadre) — le PLIAGE d'un texte pour le comparer ou le chercher (SOG-0468 (2)) : sans accents, en capitales ou en minuscules, sans les caractères
// qui ne comptent pas. Une quinzaine de fichiers en recopiaient chacun sa version (cinq variantes d'une même idée : retirer les marques de combinaison, puis une casse, puis un filtre) :
// ici, UNE primitive (stripMarks) et les cinq formes que les copies donnaient, chacune au résultat identique à celle qu'elle remplace (le banc frame/lib/test/text.html le prouve sur un
// corpus). Pur : ni page, ni état, ni réseau ; jamais d'exception sur un texte, un nombre ou une valeur absente (nulle ou absente = le texte vide).
//
// API :
//   stripMarks(v)        → le texte sans ses marques de combinaison (« Île-de-Ré » → « Ile-de-Re ») ; NFD, puis U+0300 à U+036F retirés. Ne change ni la casse ni les blancs.
//   foldUpper(v)         → stripMarks, capitales, blancs de bord retirés (le pliage des codes et des noms d'AeroDB, du registre, des pays).
//   foldLower(v)         → stripMarks, minuscules, blancs de bord retirés (la recherche d'un champ de terrain).
//   foldAlnum(v)         → stripMarks, capitales, TOUT ce qui n'est pas A-Z ou 0-9 retiré (la clé d'un type d'aéronef : « EC 135 T2+ » → « EC135T2 »).
//   wordsOf(v)           → stripMarks, minuscules, chaque suite de signes qui n'est pas a-z ou 0-9 devient une espace, blancs de bord retirés (les mots d'une recherche).
//   slug(v, max = 40)    → stripMarks, minuscules, chaque suite de signes qui n'est pas a-z ou 0-9 devient un tiret, tirets de bord retirés, coupé à `max` signes (puis tirets de fin retirés) : un identifiant lisible.
// Ce que ce fichier ne fait PAS : le pliage propre à un module (report/model.js retire aussi les points et replie les blancs ; fuel/fpl.js garde les espaces) reste chez lui, construit sur stripMarks.

/** Le texte sans ses marques de combinaison. */
export const stripMarks = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Sans marques, en capitales, sans blancs de bord. */
export const foldUpper = v => stripMarks(v).toUpperCase().trim();
/** Sans marques, en minuscules, sans blancs de bord. */
export const foldLower = v => stripMarks(v).toLowerCase().trim();
/** Sans marques, en capitales, que A-Z et 0-9. */
export const foldAlnum = v => stripMarks(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
/** Sans marques, en minuscules, les autres signes en espaces simples. */
export const wordsOf = v => stripMarks(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Un identifiant lisible : minuscules, tirets, au plus `max` signes. */
export const slug = (v, max = 40) => stripMarks(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(
  /-+$/g, '');
