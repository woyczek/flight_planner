// V3 frame/lib (propriétaire : frame ; tout module s'en sert) — aides au rendu des modules dans la page : un rendu ne
// change jamais le défilement ni ce que l'on tape (frame/INTEGRATION.md § 6). Ni stockage ni réseau.
//
// API :
//   keepScroll(box, draw, { focus = true }) → ce que rend draw() :
//     · la position de chaque conteneur qui défile au-dessus de box (la page comprise) est gardée, et la hauteur de box
//       tenue pendant le rendu ; les positions sont remises après le rendu, puis à l'image suivante et à celle d'après
//       (un contenu recréé qui rétrécit un instant ne ramène plus la page en haut) ;
//     · focus : le champ en cours de frappe dans box (repéré par data-k, et data-i s'il en a un, sinon par son id) est
//       retrouvé après le rendu : sa valeur, son focus (sans défiler) et sa sélection ; une case à cocher ou une liste
//       garde la valeur que le rendu lui donne.
//     Un changement d'écran voulu (pas suivant d'un formulaire) remonte en haut lui-même, hors de keepScroll.

/** Champ en cours de frappe dans box : de quoi le retrouver après le rendu ; null s'il n'y en a pas. */
function activeField(box) {
  const el = document.activeElement;
  if (!box || !el || el === box || !box.contains(el)) return null;
  const k = el.dataset?.k,
    sel = k ? `[data-k="${CSS.escape(k)}"]${el.dataset.i != null ? `[data-i="${CSS.escape(el.dataset.i)}"]` : ''}` : el.id ? `#${CSS
      .escape(el.id)}` : '';
  if (!sel) return null;
  let a = null,
    b = null;
  try {
    a = el.selectionStart;
    b = el.selectionEnd;
  } catch {
    /* champ sans sélection */
  }
  return {
    sel,
    typed: 'value' in el && el.type !== 'checkbox' && el.type !== 'radio' && el.tagName !== 'SELECT',
    v: el.value,
    a,
    b
  };
}

/** Rend draw() sans bouger le défilement ni perdre le champ en cours de frappe (voir l'en-tête). */
export function keepScroll(box, draw, {
  focus = true
} = {}) {
  const sc = [];
  for (let e = box?.parentElement; e; e = e.parentElement)
    if (e.scrollHeight > e.clientHeight) sc.push([e, e.scrollTop]);
  const doc = document.scrollingElement;
  if (doc && !sc.some(([e]) => e === doc)) sc.push([doc, doc.scrollTop]);
  const field = focus ? activeField(box) : null;
  if (box) box.style.minHeight = `${box.offsetHeight}px`;
  try {
    return draw();
  } finally {
    const el = field && box.querySelector(field.sel);
    if (el && el !== document.activeElement) {
      if (field.typed && el.value !== field.v) el.value = field.v;
      el.focus({
        preventScroll: true
      });
      if (field.a != null) try {
        el.setSelectionRange(field.a, field.b);
      } catch {
        /* champ sans sélection (date, nombre) */
      }
    }
    const put = () => {
      for (const [e, t] of sc)
        if (e.scrollTop !== t) e.scrollTop = t;
    };
    put();
    requestAnimationFrame(() => {
      put();
      if (box) box.style.minHeight = '';
      requestAnimationFrame(put);
    });
  }
}
