// V3 cadre — le nom d'un terrain à côté de son code, une seule règle de texte pour Carburant et la Carte (V3_SPECIFICATION § 10.27,
// § 10.30 quatrième lecture : « LFPO Paris-Orly » au pin). Calcul pur : ni page, ni état, ni réseau ; l'enregistrement vient d'aerodb
// (coords, aerodromes, find : { icao | code | id, name, city? }).
//
// API :
//   adLabel(rec) → « Paris-Orly » : le nom publié, nettoyé, un nom tout en capitales remis en casse de nom ; la ville entre parenthèses quand l'enregistrement en porte une que le nom
//     ne contient pas ; '' sans nom, ou quand le nom n'est que le code.
//   adTitle(rec, code) → « LFPO Paris-Orly » : le code puis le libellé ; le code seul sans libellé ; '' sans code.
//   adLine(rec, code) → « LFPO — Paris-Orly » : la ligne fixe sous un champ de Carburant ; le code seul sans libellé.
//   isCode(v), isIcao(v), isIcaoAlpha(v) → la forme d'un code de terrain (SOG-0468 (2)) ; ad_field.js les réexporte.

/** Un code de terrain complet : quatre caractères, ou le code de liste d'une hélistation du SIA — deux lettres et trois chiffres
 *  (« LF418 » ; le motif d'AeroDB, SOG-0465 : aerodb.suggest, coords et route/compute le prennent), ASCII seulement. */
const CODE = /^(?:[A-Z0-9]{4}|[A-Z]{2}[0-9]{3})$/;
/** Le texte (déjà en majuscules) est-il un code de terrain complet (CODE) ? Fonction pure, ici pour les lecteurs sans écran
 *  (frame/lib/mission.js, l'atelier de Missions) ; le champ de terrain (ad_field.js) la réexporte, son instance donne la même (api.isCode). */
export const isCode = v => CODE.test(String(v || ''));
/** SOG-0468 (2) : un code de terrain écrit en quatre signes (lettres ou chiffres) — la forme de tout code saisi ou lu (« LFPO », « EG74 »).
 *  Fonction pure ; même résultat que /^[A-Z0-9]{4}$/.test(v). */
export const isIcao = v => /^[A-Z0-9]{4}$/.test(v);
/** SOG-0468 (2) : un indicateur OACI réel, quatre LETTRES (« LFPO » ; ni « EG74 » ni « LF418 ») — pour ce qui exige un terrain publié
 *  sous un indicateur (météo, procédures, plan de vol). Fonction pure ; même résultat que /^[A-Z]{4}$/.test(v). */
export const isIcaoAlpha = v => /^[A-Z]{4}$/.test(v);

/** Le code d'un terrain : celui donné, sinon celui de l'enregistrement (icao, code, id), en majuscules. */
const codeOf = (rec, code) => String(code || rec?.icao || rec?.code || rec?.id || '').trim().toUpperCase();
/** Un texte sans blancs en trop. */
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Un nom écrit tout en capitales (la base du SIA : « TOULOUSE BLAGNAC ») s'écrit comme un nom : chaque mot avec sa capitale
 *  (« Toulouse Blagnac », « Paris-Orly ») ; un nom qui porte déjà des minuscules est gardé tel quel. */
const nameCase = s => /[a-zà-ÿ]/.test(s) ? s : s.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

/** Le libellé d'un terrain (voir l'en-tête). */
export function adLabel(rec) {
  const name = nameCase(clean(rec?.name)),
    code = codeOf(rec),
    city = clean(rec?.city);
  if (!name || name.toUpperCase() === code) return '';
  return city && !name.toUpperCase().includes(city.toUpperCase()) ? `${name} (${city})` : name;
}

/** Le code puis le libellé : « LFPO Paris-Orly » (voir l'en-tête). */
export function adTitle(rec, code) {
  const c = codeOf(rec, code),
    l = adLabel({
      ...(rec || {}),
      icao: c
    });
  return c ? l ? `${c} ${l}` : c : '';
}

/** La ligne fixe d'un champ : « LFPO — Paris-Orly » (voir l'en-tête). */
export function adLine(rec, code) {
  const c = codeOf(rec, code),
    l = adLabel({
      ...(rec || {}),
      icao: c
    });
  return c ? l ? `${c} — ${l}` : c : '';
}
