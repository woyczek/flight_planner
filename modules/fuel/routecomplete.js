// V3 fuel — la complétion au curseur du champ de route (V3_SPECIFICATION § 10.31, partie 4) : dès deux caractères du mot sous le
// curseur, sept propositions au plus — les noms des SID du départ et des STAR de l'arrivée, les voies proches du point qui précède,
// les points et balises de la base — ; choisir écrit le mot au curseur. Le même composant que les champs de terrain (§ 10.27,
// modules/fuel/adnames.js) : liste posée par-dessus la page, ↑ ↓ Entrée Échap, toucher, fermée quand le champ perd le focus.
//
// Interface étroite (createRouteComplete(host) → api) :
//   host = {
//     ctx,          contexte du montage (t, aerodb)
//     body(),       le corps de l'écran (null une fois démonté)
//     names(),      { sid: [noms], star: [noms] } des deux terrains (la carte des procédures), ou rien
//     around(words) le point { lat, lon } le plus proche avant le curseur (les mots qui le précèdent), ou null
//     gone()        le montage a-t-il été démonté ou remplacé
//   }
//   api = { onInput, onKey, onFocusOut, onPointerDown, onClick, texts }
const TX = {
  listLabel: ['Éléments de route proposés', 'Suggested route items', 'Vorgeschlagene Routenelemente', 'Elementos de ruta propuestos'],
  airway: ['Voie {w}', 'Airway {w}', 'Luftstraße {w}', 'Aerovía {w}']
};
/** Nombre de propositions au plus (la règle des champs de terrain, § 10.27). */
const MAX = 7;
/** Longueur minimale du mot sous le curseur pour proposer. */
const MIN_CHARS = 2;

/** Crée la complétion du champ de route d'un montage de l'écran Carburant. */
export function createRouteComplete(host) {
  const ctx = host.ctx,
    tt = (row, v) => ctx.t(row, v),
    st = {
      seq: 0, // dernière demande : seule elle est dessinée
      hits: [], // propositions affichées [{ token, label }]
      active: -1, // proposition surlignée au clavier
      word: null, // le mot remplacé : { start, end }
      picking: false // un choix est en train d'être écrit (son évènement input ne rouvre pas la liste)
    };
  const body = () => host.gone() ? null : host.body(),
    field = () => body()?.querySelector('[data-k="rtext"]') || null,
    box = () => body()?.querySelector('[data-rtsug]') || null;

  /** Le mot sous le curseur : { start, end, q } (lettres et chiffres, en majuscules) ; q vide hors d'un mot. */
  function wordAt(ta) {
    const v = ta.value,
      at = ta.selectionStart ?? v.length;
    let a = at,
      b = at;
    while (a > 0 && /[A-Za-z0-9]/.test(v[a - 1])) a--;
    while (b < v.length && /[A-Za-z0-9]/.test(v[b])) b++;
    return {
      start: a,
      end: b,
      q: v.slice(a, b).toUpperCase(),
      before: v.slice(0, a).toUpperCase().split(/\s+/).filter(Boolean)
    };
  }

  /** Échappe un texte pour du HTML. */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  } [c]));

  /** Ferme la liste (le champ garde son focus). */
  function close() {
    st.seq++;
    st.hits = [];
    st.active = -1;
    const el = box();
    if (el) {
      el.hidden = true;
      el.innerHTML = '';
    }
    field()?.setAttribute('aria-expanded', 'false');
  }

  /** Surligne la proposition `i` (clavier) et la signale au lecteur d'écran. */
  function activate(i) {
    st.active = i;
    box()?.querySelectorAll('[role="option"]').forEach((o, j) => o.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    const ta = field();
    if (ta) i >= 0 ? ta.setAttribute('aria-activedescendant', `fu-rtsug-${i}`) : ta.removeAttribute('aria-activedescendant');
  }

  /** Dessine la liste sous le champ, par-dessus la suite de l'écran. */
  function show(hits) {
    const el = box(),
      ta = field(),
      label = ta?.closest('label');
    if (!el || !ta || !label) return;
    st.hits = hits;
    el.innerHTML = hits.map((h, i) => `<button type="button" role="option" class="f-item fu-sugitem" id="fu-rtsug-${i}" tabindex="-1" aria-selected="false" data-token="${esc(h.token)}"><span><b>${esc(h.token)}</b> ${esc(h.label)}</span></button>`).join('');
    el.style.top = `${label.offsetTop + label.offsetHeight}px`;
    el.hidden = !hits.length;
    ta.setAttribute('aria-expanded', hits.length ? 'true' : 'false');
    activate(-1);
  }

  /** Les propositions pour le mot sous le curseur : noms de procédure, voies proches, points et balises ; sept au plus, sans doublon. */
  async function suggest(ta) {
    const w = wordAt(ta),
      seq = ++st.seq;
    st.word = w;
    if (w.q.length < MIN_CHARS) return close();
    const out = [],
      seen = new Set(),
      add = (token, label) => {
        if (out.length >= MAX || seen.has(token) || token === w.q && out.length) return;
        seen.add(token);
        out.push({
          token,
          label
        });
      },
      names = host.names?.() || {};
    for (const n of names.sid || [])
      if (n.startsWith(w.q)) add(n, 'SID');
    for (const n of names.star || [])
      if (n.startsWith(w.q)) add(n, 'STAR');
    // les voies autour du point qui précède le curseur (une voie s'écrit entre deux points)
    const p = host.around?.(w.before);
    if (p && ctx.aerodb?.airways) {
      const segs = await Promise.resolve().then(() => ctx.aerodb.airways({
        bbox: [+p.lon - 3, +p.lat - 2, +p.lon + 3, +p.lat + 2]
      })).catch(() => []);
      if (seq !== st.seq || !body()) return;
      for (const r of [...new Set((segs || []).map(s => String(s.route || '').toUpperCase()))].sort())
        if (r.startsWith(w.q)) add(r, tt(TX.airway, {
          w: ''
        }).trim());
    }
    if (ctx.aerodb?.find) {
      const found = await Promise.resolve().then(() => ctx.aerodb.find(w.q, 40)).catch(() => []);
      if (seq !== st.seq || !body()) return;
      for (const x of found || []) {
        const code = String(x.code || '').trim().toUpperCase();
        if (!code || !['navaid', 'point', 'aerodrome'].includes(x.kind) || !code.startsWith(w.q)) continue;
        add(code, String(x.name || '').trim() === code ? '' : String(x.name || '').trim());
      }
    }
    if (seq !== st.seq || !body()) return;
    // le mot déjà complet et seul de sa liste : rien à proposer
    if (out.length === 1 && out[0].token === w.q) return close();
    show(out);
  }

  /** Frappe dans le champ de route : la liste suit le mot sous le curseur. */
  function onInput(e) {
    if (e.target?.dataset?.k !== 'rtext' || st.picking) return;
    suggest(e.target);
  }

  /** Écrit le mot choisi à la place de celui sous le curseur, suivi d'une espace, le curseur après ; le champ reçoit l'évènement `input`
   *  comme une frappe (même chemin : route relue, devis). */
  function pick(token) {
    const ta = field(),
      w = st.word;
    if (!ta || !token || !w) return close();
    const v = ta.value,
      tail = v.slice(w.end),
      sep = /^\s/.test(tail) ? '' : ' ';
    ta.value = v.slice(0, w.start) + token + sep + tail;
    const at = w.start + token.length + sep.length;
    ta.setSelectionRange(at, at);
    close();
    st.picking = true;
    try {
      ta.dispatchEvent(new Event('input', {
        bubbles: true
      }));
    } finally {
      st.picking = false;
    }
  }

  /** Clavier dans le champ : ↓ ↑ déplacent, Entrée choisit la proposition surlignée, Échap ferme. Vrai si la touche est prise. */
  function onKey(e) {
    if (e.target?.dataset?.k !== 'rtext' || !st.hits.length) return false;
    const n = st.hits.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activate(e.key === 'ArrowDown' ? (st.active + 1) % n : (st.active - 1 + n) % n);
      return true;
    }
    if (e.key === 'Enter' && st.active >= 0) {
      e.preventDefault();
      pick(st.hits[st.active].token);
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

  /** Le champ perd le focus : la liste se ferme (sauf si le focus passe dans la liste elle-même). */
  function onFocusOut(e) {
    if (e.target?.dataset?.k !== 'rtext' || box()?.contains(e.relatedTarget)) return;
    close();
  }

  /** Appui sur une proposition : le champ garde le focus ; le choix se fait au clic. */
  function onPointerDown(e) {
    if (e.target.closest?.('[data-rtsug]')) e.preventDefault();
  }

  /** Clic ou toucher sur une proposition : son mot est écrit. Vrai si le clic était pour la liste. */
  function onClick(e) {
    const item = e.target.closest?.('[data-rtsug] [data-token]');
    if (!item) return false;
    pick(item.dataset.token);
    return true;
  }

  return {
    onInput,
    onKey,
    onFocusOut,
    onPointerDown,
    onClick,
    texts: TX
  };
}
