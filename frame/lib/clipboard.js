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
//   copyAndTell(ctx, text, { ok, manual, box, near }) → Promise<'clipboard' | 'exec' | 'shown'> (SOG-0468) : copyText,
//     puis le dit : copié ('clipboard', 'exec') → ctx.notify(ok, 'ok') ; montré ('shown') → ctx.notify(manual, 'warn')
//     (« copiez-le à la main »). Le texte notifié est TOUJOURS celui de l'appelant (ok, manual), JAMAIS le texte copié
//     (il peut venir de data/ ou du presse-papiers : non fiable). Sans ctx.notify : rien n'est dit. Ne lève jamais.
//   readClipboard() → Promise<{ html, text, reason }> (SOG-0468) : navigator.clipboard.read() (éléments text/html et
//     text/plain), sinon readText() ; les chaînes BRUTES, chacune bornée à 1 048 576 caractères (au-delà : '' et reason
//     'too-big') ; refus ou API absente : { html: '', text: '', reason: 'denied' | 'unavailable' } ; reason '' sinon.
//     Elle ne lit, n'analyse ni n'insère rien d'autre : html et text sont NON FIABLES, à l'appelant de les assainir.

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

/** Copie text (copyText) et le dit par ctx.notify : ok si copié, manual (alerte) si le texte est montré ; jamais le
 *  texte copié dans la notification (voir l'en-tête). Ne lève jamais. */
export async function copyAndTell(ctx, text, {
  ok = '',
  manual = '',
  box = null,
  near = null
} = {}) {
  let how = 'shown';
  try {
    how = await copyText(text, {
      box,
      near
    });
  } catch {
    how = 'shown';
  }
  const say = how === 'shown' ? [manual, 'warn'] : [ok, 'ok'];
  try {
    if (typeof ctx?.notify === 'function' && typeof say[0] === 'string' && say[0]) ctx.notify(say[0], say[1]);
  } catch {
    /* une notification qui lève ne casse pas la copie */
  }
  return how;
}

/** Plafond d'une chaîne lue du presse-papiers (caractères). */
const CLIP_MAX = 1048576;

/** Texte d'un Blob du presse-papiers, borné : [texte, trop grand ?] (un Blob de plus de 4 octets par caractère au-delà
 *  du plafond n'est pas lu). */
async function blobText(blob) {
  if (!blob || typeof blob.text !== 'function' || (typeof blob.size === 'number' && blob.size > CLIP_MAX * 4)) return ['', !!blob];
  const s = await blob.text();
  return typeof s !== 'string' ? ['', false] : s.length > CLIP_MAX ? ['', true] : [s, false];
}

/** Lit le presse-papiers (voir l'en-tête) : { html, text, reason } ; les chaînes sont brutes et non fiables. */
export async function readClipboard() {
  const cb = navigator.clipboard;
  if (!cb || (typeof cb.read !== 'function' && typeof cb.readText !== 'function')) return {
    html: '',
    text: '',
    reason: 'unavailable'
  };
  let html = '',
    text = '',
    big = false,
    got = false;
  if (typeof cb.read === 'function') {
    try {
      for (const item of (await cb.read()) || []) {
        const types = Array.isArray(item?.types) ? item.types : [...(item?.types || [])];
        if (!html && types.includes('text/html')) {
          const [s, b] = await blobText(await item.getType('text/html'));
          html = s;
          big ||= b;
        }
        if (!text && types.includes('text/plain')) {
          const [s, b] = await blobText(await item.getType('text/plain'));
          text = s;
          big ||= b;
        }
      }
      got = true;
    } catch {
      [html, text, big, got] = ['', '', false, false]; // une lecture interrompue ne rend rien d'elle
    }
  }
  if (!got && typeof cb.readText === 'function') {
    try {
      const s = await cb.readText();
      if (typeof s === 'string' && s.length > CLIP_MAX) big = true;
      else text = typeof s === 'string' ? s : '';
      got = true;
    } catch {
      got = false;
    }
  }
  if (!got) return {
    html: '',
    text: '',
    reason: 'denied'
  };
  return {
    html,
    text,
    reason: big ? 'too-big' : ''
  };
}
