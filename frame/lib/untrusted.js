// V3 cadre — lire ce qui vient d'ailleurs sans lui faire confiance (SOG-0468 (a), classé par l'ergonome ; la liste et les cas sont de Sécurisation) : UNE définition des petits gardes que dix fichiers recopiaient
// (une clé PROPRE d'un objet, un objet simple, un nombre fini, un nombre borné, un texte sans caractères de format invisibles, un identifiant écrit). Pur : ni page, ni état, ni réseau, jamais d'exception.
// Une entrée d'un fichier, d'une réponse du lanceur ou d'un pilote est un objet de JSON.parse : « __proto__ », « constructor » ou « toString » ne rendent jamais ce que le prototype porte.
// Ce que ce fichier ne fait PAS : les lectures tolérantes (un nombre écrit « 5 », '' ou null lus comme absents ou convertis) restent là où elles sont, chez leurs propriétaires, sous un autre nom.
//
// API :
//   own(o, k)         → la valeur de la clé PROPRE k (texte ou nombre) d'un objet simple (ni tableau, ni null), sinon undefined.
//   has(o, k)         → vrai quand k est une clé PROPRE de cet objet simple (mêmes règles que own).
//   plain(v)          → v quand c'est un objet non nul qui n'est pas un tableau, sinon null.
//   finite(v)         → v quand c'est un nombre fini (typeof 'number' : ni '5', ni null, ni true), sinon null.
//   bounded(v, lo, hi)→ v quand c'est un nombre fini dans [lo, hi] (bornes comprises), sinon null.
//   visible(v)        → le texte sans ses caractères de format invisibles ('' pour rien) ; clean(v) : de plus les blancs repliés et rognés ; idWord(v) : un texte ou un nombre, nettoyé et en capitales, '' sinon.

export const own = (o, k) => o !== null && typeof o === 'object' && !Array.isArray(o) && (typeof k === 'string' || typeof k === 'number') &&
  Object.hasOwn(o, k) ? o[k] : undefined;
export const has = (o, k) => o !== null && typeof o === 'object' && !Array.isArray(o) && (typeof k === 'string' || typeof k === 'number') &&
  Object.hasOwn(o, k);
export const plain = v => v && typeof v === 'object' && !Array.isArray(v) ? v : null;
export const finite = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
export const bounded = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
/** Les caractères de format invisibles qui trompent l'œil : la marque arabe (U+061C), l'espace de largeur nulle (U+200B), les marques
 *  et les contrôles de sens d'écriture (U+200E, U+200F, U+202A à U+202E, U+2066 à U+2069), le liant de mots et les opérateurs
 *  invisibles (U+2060 à U+2064), les formats dépréciés (U+206A à U+206F), les annotations interlinéaires (U+FFF9 à U+FFFB), la
 *  marque d'ordre (U+FEFF). Gardés à dessein : le liant et l'anti-liant (U+200C, U+200D : des écritures et des émojis en ont
 *  besoin) et l'espace fine insécable (U+202F, la typographie française). */
const HIDDEN = /[؜​‎‏‪-‮⁠-⁤⁦-⁯￹-￻﻿]/g;
/** Un texte d'un fichier sans ses caractères de format invisibles (un fichier de mission ou de registre est écrit par tout pilote : un titre ne doit pas se lire autrement qu'il est écrit) ; '' pour rien. */
export const visible = v => String(v ?? '').replace(HIDDEN, '');
/** Un texte nettoyé (caractères invisibles retirés, blancs repliés), '' pour rien. */
export const clean = v => visible(v).replace(/\s+/g, ' ').trim();
/** Un identifiant écrit (un texte ou un nombre), comme il se compare : sans blancs autour, en capitales ; '' sinon. */
export const idWord = v => typeof v === 'string' || typeof v === 'number' ? clean(v).toUpperCase() : '';
