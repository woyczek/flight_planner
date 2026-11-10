// V3 frame/lib (propriétaire : Réglages ; Données et l'assistant de la compagnie s'en servent) — l'accord d'un nom avec le nombre qui le précède, pur : ni page, ni contexte, ni stockage, ni réseau.
// Plus aucun « (s) » à l'écran (l'ergonome, 10 nov.) : « 0 ou 1 fichier », « 2 fichiers » en français ; « 1 file », « 0 files », « 2 files » en anglais, allemand, espagnol.
//
// API :
//   plural(lang, n, [singulier, pluriel]) → la forme qui convient à n (fini) : fr : 0 ≤ n < 2 singulier ; en, de, es : n = 1 ; sinon pluriel ; un nombre qui n'est pas fini donne le pluriel.
//   agree(template, vars, lang) → le gabarit de texte où chaque marque d'accord — (s) (x) (es) (en) (n) (e) collée à un mot — est résolue d'après le nombre `{clé}` qui la précède dans le gabarit (vars[clé] fini) : le singulier
//     retire la marque, le pluriel garde ses lettres ; « {n} fichier(s) manquant(s) » → « 1 fichier manquant », « 3 fichiers manquants » ; une marque sans nombre devant elle est au pluriel. Les `{clé}` restent à
//     remplacer par l'appelant (ctx.t). Ce n'est pas de la traduction : les marques sont celles que les textes portent déjà.

/** La forme qui convient à n : [singulier, pluriel] ; fr : 0 ≤ n < 2 singulier, sinon n = 1 seulement. */
export function plural(lang, n, forms) {
  const k = Number(n),
    one = Number.isFinite(k) && (lang === 'fr' ? k >= 0 && k < 2 : k === 1);
  return one ? forms[0] : forms[1];
}
const TOKEN = /\{(\w+)\}|\((s|x|es|en|n|e)\)/g;
/** Le gabarit sans marque d'accord : chaque marque est résolue d'après le dernier nombre `{clé}` rencontré avant elle. */
export function agree(template, vars, lang) {
  let last = NaN;
  return String(template ?? '').replace(TOKEN, (m, key, mark) => {
    if (key !== undefined) {
      const v = vars?.[key];
      last = typeof v === 'number' || typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      return m;
    }
    return plural(lang, last, ['', mark]);
  });
}
