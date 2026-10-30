// V3 fuel — la liste de propositions posée sous un champ (refonte § 10.33 R-F5) : un seul composant pour les trois champs de terrain
// (adnames.js, § 10.27) et le champ de route (routecomplete.js, § 10.31) ; chacun garde ses sources et sa façon d'écrire le choix.
// Liste posée par-dessus la suite de l'écran sous le champ, sept propositions au plus (l'appelant les donne), ↑ ↓ Entrée Échap,
// toucher, fermée quand le champ perd le focus (sauf vers la liste) ; un choix rend au champ l'évènement `input` d'une frappe.
//
// Interface étroite (createSuggestList(o) → api) :
//   o = {
//     body(),           le corps de l'écran (null une fois démonté)
//     box,              le sélecteur de la zone de la liste ('[data-adsug]')
//     attr,             l'attribut qui porte la valeur d'une proposition ('code' → data-code)
//     idPrefix,         le préfixe des identifiants des propositions ('fu-sug' → fu-sug-0…)
//     fields(),         les champs que la liste sert (aria-expanded)
//     owns(el),         el est-il un de ces champs
//     write(input, v)   écrit la valeur choisie dans le champ ; faux si rien n'est écrit
//   }
//   api = { ticket, live, show, close, onKey, onFocusOut, onPointerDown, onClick, input, hits, picking }

/** Échappe un texte pour du HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));

/** Crée une liste de propositions pour un ou plusieurs champs d'un écran. */
export function createSuggestList(o) {
  const st = {
      seq: 0, // dernière demande : seule elle est dessinée
      input: null, // le champ qui porte la liste ouverte
      hits: [], // propositions affichées [{ value, label }]
      active: -1, // proposition surlignée au clavier
      picking: false // un choix est en train d'être écrit dans le champ (son évènement input ne rouvre pas la liste)
    },
    box = () => o.body()?.querySelector(o.box) || null,
    expanded = (input, on) => {
      for (const f of o.fields() || []) f?.setAttribute('aria-expanded', on && f === input ? 'true' : 'false');
    };

  /** Ferme la liste et vide son contenu (le champ garde son focus). */
  function close() {
    st.seq++;
    st.input = null;
    st.hits = [];
    st.active = -1;
    const el = box();
    if (el) {
      el.hidden = true;
      el.innerHTML = '';
    }
    expanded(null, false);
  }

  /** Surligne la proposition `i` (clavier) et la signale au lecteur d'écran. */
  function activate(i) {
    st.active = i;
    box()?.querySelectorAll('[role="option"]').forEach((x, j) => x.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    const input = st.input;
    if (input) i >= 0 ? input.setAttribute('aria-activedescendant', `${o.idPrefix}-${i}`) : input.removeAttribute('aria-activedescendant');
  }

  /** Dessine la liste sous le champ input : posée par-dessus la suite de l'écran, sous le libellé du champ. */
  function show(input, hits) {
    const el = box(),
      label = input?.closest('label');
    if (!el || !input || !label) return;
    st.input = input;
    st.hits = hits;
    el.innerHTML = hits.map((h, i) => `<button type="button" role="option" class="f-item fu-sugitem" id="${o.idPrefix}-${i}" tabindex="-1" aria-selected="false" data-${o.attr}="${esc(h.value)}"><span><b>${esc(h.value)}</b> ${esc(h.label)}</span></button>`).join('');
    el.style.top = `${label.offsetTop + label.offsetHeight}px`;
    el.hidden = !hits.length;
    expanded(input, !!hits.length);
    activate(-1);
  }

  /** Choisit une valeur : le champ la reçoit (o.write), la liste se ferme, puis le champ reçoit l'évènement `input` comme une frappe
   *  (même chemin que la saisie) ; le focus reste où il était. */
  function pick(value) {
    const input = st.input;
    if (!input || !value || !o.write(input, value)) return close();
    close();
    st.picking = true;
    try {
      input.dispatchEvent(new Event('input', {
        bubbles: true
      }));
    } finally {
      st.picking = false;
    }
  }

  /** Clavier dans le champ de la liste ouverte : ↓ ↑ déplacent, Entrée choisit la proposition surlignée, Échap ferme. Vrai si la
   *  touche est prise. */
  function onKey(e) {
    if (!o.owns(e.target) || e.target !== st.input || !st.hits.length) return false;
    const n = st.hits.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activate(e.key === 'ArrowDown' ? (st.active + 1) % n : (st.active - 1 + n) % n);
      return true;
    }
    if (e.key === 'Enter' && st.active >= 0) {
      e.preventDefault();
      pick(st.hits[st.active].value);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return true;
    }
    return false;
  }

  /** Un champ perd le focus : la liste se ferme (sauf si le focus passe dans la liste elle-même). */
  function onFocusOut(e) {
    if (!o.owns(e.target) || box()?.contains(e.relatedTarget)) return;
    close();
  }

  /** Appui sur une proposition : le champ garde le focus (pas de flou, donc pas de fermeture avant le clic) ; le choix se fait au clic. */
  function onPointerDown(e) {
    if (e.target.closest?.(o.box)) e.preventDefault();
  }

  /** Clic ou toucher sur une proposition : sa valeur est choisie. Vrai si le clic était pour la liste. */
  function onClick(e) {
    const item = e.target.closest?.(`${o.box} [data-${o.attr}]`);
    if (!item) return false;
    pick(item.getAttribute(`data-${o.attr}`));
    return true;
  }

  return {
    /** Une nouvelle demande de propositions : son numéro (seule la dernière est dessinée). */
    ticket: () => ++st.seq,
    /** La demande t est-elle toujours la dernière, l'écran toujours là. */
    live: t => t === st.seq && !!o.body(),
    show,
    close,
    onKey,
    onFocusOut,
    onPointerDown,
    onClick,
    /** Le champ qui porte la liste ouverte, ou null. */
    input: () => st.input,
    /** Les propositions affichées. */
    hits: () => st.hits,
    /** Vrai pendant qu'un choix est rendu au champ. */
    picking: () => !!st.picking
  };
}
