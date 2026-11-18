// V3 missions — « Ajouter des missions », le texte collé (SOG-0460, « 2. Coller la réponse ») : la réponse d'un assistant arrive avec
// une phrase, un ou plusieurs blocs de code (« ```yaml … ``` »), puis un mot de fin ; add.js ne lit que du YAML. Ce calcul pur en tire
// les blocs AVANT add.read : tous les blocs « ```yaml » (ou « ```yml »), sinon tous les blocs nus « ``` », chacun comme une source ; le
// texte hors des blocs est ignoré (et dit par l'écran) ; sans bloc, le texte entier, comme avant. Le texte collé est une entrée non
// fiable (§ 10.36) : un texte trop gros n'est pas découpé (add.js le refuse à sa taille), le nombre de blocs pris est borné.
//
// API :
//   LIMITS : bytes (au-delà, aucune découpe), blocks (au-delà, on s'arrête : add.js refuse « trop à la fois »).
//   blocksOf(text) → { blocks: [{ text, line }], fenced, outside } — line : la ligne (1…) du texte collé où le bloc commence ; fenced :
//     des blocs ont été pris ; outside : du texte (autre que des blancs) est resté hors des blocs pris.
//   tabsLine(text) → la première ligne (1…) dont l'indentation porte une tabulation (le YAML s'indente avec des espaces), 0 sinon.

export const LIMITS = Object.freeze({
  bytes: 1000000,
  blocks: 21 // un de plus que les vingt sources d'add.js : la vingt et unième suffit à le faire refuser
});
// une clôture : jusqu'à trois espaces, trois accents graves ou tildes au moins, puis la langue du bloc (ou rien)
const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([A-Za-z0-9_+-]*)[ \t]*$/;

/** Les blocs de code du texte collé (voir l'en-tête). */
export function blocksOf(text) {
  const t = typeof text === 'string' ? text : '';
  if (!t || t.length > LIMITS.bytes) return {
    blocks: t ? [{
      text: t,
      line: 1
    }] : [],
    fenced: false,
    outside: false
  };
  const lines = t.replace(/\r\n?/g, '\n').split('\n'),
    found = []; // { lang, text, line, from, to } : from / to, les lignes (0…) de la clôture ouvrante et fermante
  for (let i = 0; i < lines.length && found.length < LIMITS.blocks * 2; i++) {
    const m = FENCE.exec(lines[i]);
    if (!m) continue;
    const mark = m[1],
      lang = m[2].toLowerCase();
    let j = i + 1;
    // la clôture fermante : le même signe, au moins aussi long, rien d'autre ; un bloc jamais fermé va jusqu'à la fin du texte
    while (j < lines.length && !new RegExp(`^ {0,3}${mark[0] === '`' ? '`' : '~'}{${mark.length},}[ \\t]*$`).test(lines[j])) j++;
    found.push({
      lang,
      text: lines.slice(i + 1, j).join('\n'),
      line: i + 2,
      from: i,
      to: Math.min(j, lines.length - 1)
    });
    i = j;
  }
  const yaml = found.filter(b => b.lang === 'yaml' || b.lang === 'yml'),
    bare = found.filter(b => b.lang === ''),
    pick = (yaml.length ? yaml : bare).slice(0, LIMITS.blocks);
  if (!pick.length) return {
    blocks: [{
      text: t,
      line: 1
    }],
    fenced: false,
    outside: false
  };
  const kept = new Set();
  for (const b of pick)
    for (let k = b.from; k <= b.to; k++) kept.add(k);
  return {
    blocks: pick.map(b => ({
      text: b.text,
      line: b.line
    })),
    fenced: true,
    outside: lines.some((x, k) => !kept.has(k) && x.trim() !== '')
  };
}

/** La première ligne indentée par une tabulation (voir l'en-tête). */
export function tabsLine(text) {
  const lines = (typeof text === 'string' ? text : '').split(/\r\n?|\n/);
  for (let i = 0; i < lines.length; i++)
    if (/^[ \t]*\t/.test(lines[i]) && lines[i].trim() !== '') return i + 1;
  return 0;
}
