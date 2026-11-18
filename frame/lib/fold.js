// V3 frame/lib (propriétaire : le cadre) — le PLI « <details> » de la suite (SOG-0468 (3)) : un seul constructeur pour la balise et UN écouteur pour retenir ce que la personne a ouvert ou fermé. Une trentaine de
// constructions « <details class data-x open><summary>…</summary>… » (Données, Réglages, Carburant, Rapport…) et neuf écouteurs « toggle » (un par écran, chacun avec sa chaîne de « if matches(…) ») disent la même chose :
// ici, le pli se DIT (fold) et se RETIENT (wireFolds) une fois. Pur à l'import : ni page, ni état, ni stockage, ni réseau ; ce module ne garde RIEN : l'état ouvert / fermé est celui de l'appelant (une variable de
// l'écran, une clé de ctx.data), qu'il passe à fold() à chaque dessin et reçoit de wireFolds().
//
// API :
//   fold({ cls, attrs, key, open, title, head, sumCls, sumAttrs, body }) → le texte HTML du pli
//     cls      : la classe de <details> (celle que le CSS et les cas de l'écran connaissent déjà : « d-lc », « f-group »…).
//     attrs    : { 'data-pack-theme': id, … } les attributs de plus (valeur échappée ; faux ou absente : l'attribut n'est pas écrit ; true : écrit sans valeur).
//     key      : la clé du pli (data-fold) : celle que wireFolds() rend à l'appelant. Sans clé, le pli n'est pas retenu.
//     open     : ouvert au dessin (attribut « open ») ; l'appelant le lit de son état.
//     title    : le titre, du TEXTE (échappé) ; head : le contenu de <summary> en HTML déjà sûr (titre + pastille + chevron…), il passe avant title.
//     sumCls / sumAttrs : la classe et les attributs de <summary> (data-act, « d-packline »…).
//     body     : le contenu du pli, du HTML déjà sûr (l'appelant échappe ses valeurs).
//   wireFolds(root, set, { get }) → off() : UN écouteur « toggle » (en capture : l'événement ne remonte pas) sur root ; pour chaque <details data-fold> du DOM qui change, set(key, open, el). Avec get(key), set n'est
//     appelé que si la valeur change (un pli dessiné ouvert redonne un « toggle » : aucune écriture pour rien). Un pli sorti du DOM n'est pas retenu. off() retire l'écouteur.
//   foldOf(root, key) → le <details data-fold="key"> de root, ou null ; openFold(root, key) → l'ouvre s'il est fermé et le rend (un lien qui mène à une carte ouvre d'abord son pli).
// Ce que ce fichier ne fait PAS : réagir à l'ouverture (lire un fichier, démarrer une carte : l'appelant le fait dans son set), ni redessiner, ni animer.

/** Échappe pour le texte et pour une valeur d'attribut entre guillemets. */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Les attributs d'un objet : « data-x="v" » ; faux ou absent : rien ; true : le nom seul. */
const attrsOf = o => Object.entries(o && typeof o === 'object' ? o : {}).filter(([k, v]) => /^[a-z][a-z0-9-]*$/.test(k) && v !== false &&
    v != null)
  .map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join('');

/** Le pli : <details> et son <summary>. */
export function fold({
  cls = '',
  attrs,
  key,
  open = false,
  title = '',
  head,
  sumCls = '',
  sumAttrs,
  body = ''
} = {}) {
  const k = key == null || key === '' ? '' : ` data-fold="${esc(key)}"`;
  return `<details${cls ? ` class="${esc(cls)}"` : ''}${attrsOf(attrs)}${k}${open ? ' open' : ''}><summary${sumCls ? ` class="${esc(sumCls)}"` : ''}${attrsOf(sumAttrs)}>${head != null ? head : esc(title)}</summary>${body}</details>`;
}

/** Le pli de root qui porte cette clé. */
export const foldOf = (root, key) => [...(root?.querySelectorAll?.('details[data-fold]') || [])].find(d => d.dataset.fold === String(
  key)) || null;

/** Ouvre le pli de cette clé s'il est fermé ; rend le pli, ou null. */
export function openFold(root, key) {
  const d = foldOf(root, key);
  if (d && !d.open) d.open = true;
  return d;
}

/** Retient les plis de root : set(key, open, el) à chaque ouverture ou fermeture ; rend off(). */
export function wireFolds(root, set, {
  get
} = {}) {
  if (!root?.addEventListener || typeof set !== 'function') return () => {};
  const on = e => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.isConnected || !d.hasAttribute('data-fold')) return;
    const key = d.dataset.fold;
    if (typeof get === 'function' && !!get(key) === d.open) return; // l'état est déjà celui-là : rien à écrire
    set(key, d.open, d);
  };
  root.addEventListener('toggle', on, true);
  return () => root.removeEventListener('toggle', on, true);
}
