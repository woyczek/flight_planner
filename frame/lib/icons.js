// V3 frame/lib (propriétaire : design) — icônes au trait de la suite, reprises de la V2 (shared/icons/repository_icons.js :
// dessins dans le style de Lucide, licence ISC) : grille 24 × 24, trait 2, extrémités arrondies, couleur = currentColor
// (elles prennent la couleur du texte, donc du design et du jour / de la nuit). Code pur : rend une chaîne SVG, aucune
// page, aucun stockage ; le cadre s'en sert pour le menu et l'en-tête, un module l'importe s'il veut une icône
// (import { svg } from '../../frame/lib/icons.js').
//
// Variantes pleines (barre d'onglets du téléphone : l'onglet choisi change de forme, pas seulement de couleur) : fuel,
// map, edit, list, settings, mêmes dessins et même grille, formes remplies (currentColor) avec les détails en creux.
//
// API : svg(nom, { size, title, filled }) → chaîne SVG (vide si le nom est inconnu, ou si filled est demandé sans variante
// pleine ; décorative sauf si title est donné ; filled : la variante pleine, marquée data-filled) ; has(nom) ;
// hasFilled(nom) ; names().
const P = {
  // navigation / applications
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  wrench: '<path d="M14.5 3.2a5 5 0 0 0-4.4 6.7L3.4 16.6a2 2 0 0 0 2.8 2.8l6.7-6.7a5 5 0 0 0 6.7-4.4l-3 3-2.9-.6-.6-2.9z"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h3"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  'trending-up': '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  // fichiers et données
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
  'file-text': '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h1"/>',
  upload: '<path d="M12 13v8M8 17l4-4 4 4"/><path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-.8-.5-1.3-.5-2s.6-1.5 1.5-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  // actions
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  maximize: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  minimize: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  wand: '<path d="m3 21 12-12M14 6l4 4"/><path d="M19 2v4M17 4h4M8 3v2M7 4h2M20 12v2M19 13h2"/>',
  'wand-sparkles': '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/>',
  sparkles: '<path d="m12 3 1.8 4.9L19 9.5l-5.2 1.7L12 16l-1.8-4.8L5 9.5l5.2-1.6z"/><path d="M19 15v4M17 17h4M5 17v3M3.5 18.5h3"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  move: '<path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3"/>',
  // champs
  box: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 14h3v6H5.5A1.5 1.5 0 0 1 4 18.5zM20 14h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5z"/><path d="M17 20c0 1-1.5 2-4 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.6 3.1-6 7-6s7 2.4 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.6 4 6"/>',
  hash: '<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="2" fill="currentColor"/>',
  pin: '<path d="M12 22s7-6.4 7-12a7 7 0 0 0-14 0c0 5.6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  // états
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  // cadre V3
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
// variantes pleines : racine remplie et cernée de currentColor (trait 1, jointures rondes) ; ce qui doit rester un trait
// (tuyau, socle, rayons) le dit (fill="none", trait 2)
const F = {
  fuel: '<path fill-rule="evenodd" d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16zM6.5 6h5v4h-5z"/><path fill="none" stroke-width="2" d="M3 21h12M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  map: '<path d="M3 6 8 4.33v14L3 20z"/><path d="M10 4.33 14 5.67v14l-4-1.34z"/><path d="M16 5.67 21 4v14l-5 1.67z"/>',
  edit: '<path d="M12 8 16 12 8 20H4v-4z"/><path d="m15 5 4 4-1.5 1.5-4-4z"/>',
  list: '<path fill="none" stroke-width="3" d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1.8"/><circle cx="4" cy="12" r="1.8"/><circle cx="4" cy="18" r="1.8"/>',
  settings: '<path fill-rule="evenodd" d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 4.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z"/><path fill="none" stroke-width="2" d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** SVG d'une icône (chaîne) ; décorative (aria-hidden) sauf si title est donné ; nom inconnu : chaîne vide. filled : la
 *  variante pleine (data-filled), vide si l'icône n'en a pas. */
export function svg(name, {
  size = 20,
  title = '',
  filled = false
} = {}) {
  const body = filled ? F[name] : P[name];
  if (!body) return '';
  const a11y = title ? `role="img" aria-label="${esc(title)}"` : 'aria-hidden="true" focusable="false"',
    paint = filled ? 'fill="currentColor" stroke="currentColor" stroke-width="1"' : 'fill="none" stroke="currentColor" stroke-width="2"';
  return `<svg class="f-icon" data-i="${esc(name)}"${filled ? ' data-filled' : ''} viewBox="0 0 24 24" width="${size}" height="${size}" ${paint} stroke-linecap="round" stroke-linejoin="round" ${a11y}>${title ? `<title>${esc(title)}</title>` : ''}${body}</svg>`;
}
/** Vrai si l'icône existe. */
export const has = name => Object.prototype.hasOwnProperty.call(P, name);
/** Vrai si l'icône a une variante pleine. */
export const hasFilled = name => Object.prototype.hasOwnProperty.call(F, name);
/** Noms de toutes les icônes. */
export const names = () => Object.keys(P);
