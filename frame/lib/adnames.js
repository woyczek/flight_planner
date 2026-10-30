// V3 cadre — le nom d'un terrain à côté de son code, une seule règle de texte pour Carburant et la Carte (V3_SPECIFICATION § 10.27,
// § 10.30 quatrième lecture : « LFPO Paris-Orly » au pin). Calcul pur : ni page, ni état, ni réseau ; l'enregistrement vient d'aerodb
// (coords, aerodromes, find : { icao | code | id, name, city? }).
//
// API :
//   adLabel(rec) → « Paris-Orly » : le nom publié, nettoyé ; la ville entre parenthèses quand l'enregistrement en porte une que le nom
//     ne contient pas ; '' sans nom, ou quand le nom n'est que le code.
//   adTitle(rec, code) → « LFPO Paris-Orly » : le code puis le libellé ; le code seul sans libellé ; '' sans code.
//   adLine(rec, code) → « LFPO — Paris-Orly » : la ligne fixe sous un champ de Carburant ; le code seul sans libellé.

/** Le code d'un terrain : celui donné, sinon celui de l'enregistrement (icao, code, id), en majuscules. */
const codeOf = (rec, code) => String(code || rec?.icao || rec?.code || rec?.id || '').trim().toUpperCase();
/** Un texte sans blancs en trop. */
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Le libellé d'un terrain (voir l'en-tête). */
export function adLabel(rec) {
  const name = clean(rec?.name),
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
