// V3 frame/lib (propriétaire : fuel ; report, website et le cadre s'en servent) — copie vers le presse-papiers qui
// marche aussi hors contexte sûr (l'appli servie en http à une tablette par le lanceur du poste : navigator.clipboard
// y est absent). Ni stockage ni réseau.
//
// API :
//   copyText(text, { box, near }) → Promise<'clipboard' | 'exec' | 'shown'> :
//     1. navigator.clipboard.writeText s'il existe ('clipboard') ;
//     2. sinon (ou refusé) un champ caché sélectionné et document.execCommand('copy') ('exec') ;
//     3. sinon le texte est montré sélectionné pour que l'on le copie soi-même ('shown') : dans box (un champ du
//        module, rendu visible), ou dans un champ en lecture seule posé juste après near (réutilisé d'un appel à
//        l'autre) ; à l'appelant de dire « copiez-le ».
//   canPaste() → vrai si le presse-papiers peut être lu (navigator.clipboard.read ou readText) : sinon, ne proposer
//     que le collage dans un champ.

/** Copie par un champ caché et execCommand (ancien chemin, accepté hors contexte sûr) ; vrai si le navigateur dit oui. */
function execCopy(text) {
  const keep = document.activeElement,
    area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.append(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  keep?.focus?.({
    preventScroll: true
  });
  return ok;
}

/** Montre le texte sélectionné dans box, ou dans un champ en lecture seule posé après near. */
function show(text, box, near) {
  let f = box;
  if (!f && near) {
    f = near.nextElementSibling?.matches?.('input.sog-copybox') ? near.nextElementSibling : null;
    if (!f) {
      f = document.createElement('input');
      f.className = 'sog-copybox';
      f.readOnly = true;
      f.style.cssText = 'display:block;width:100%;box-sizing:border-box;margin-top:6px';
      near.after(f);
    }
  }
  if (!f) return;
  f.value = text;
  f.hidden = false;
  f.focus({
    preventScroll: true
  });
  f.select();
  f.scrollIntoView({
    block: 'nearest'
  });
}

/** Copie text (voir l'en-tête). */
export async function copyText(text, {
  box = null,
  near = null
} = {}) {
  const s = String(text ?? '');
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(s);
      return 'clipboard';
    } catch {
      /* refusé : chemins suivants */
    }
  }
  if (execCopy(s)) return 'exec';
  show(s, box, near);
  return 'shown';
}

/** Le presse-papiers peut-il être lu ici ? */
export const canPaste = () => !!(navigator.clipboard?.read || navigator.clipboard?.readText);
