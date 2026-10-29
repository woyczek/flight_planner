// V3 fuel — le nom du terrain là où son code est, et la complétion progressive des trois champs de l'étape Vol (V3_SPECIFICATION
// § 10.27) : la ligne fixe « LFPO — Paris-Orly » sous le départ, l'arrivée et le dégagement, les noms des terrains au pas Départ, et
// la liste de propositions (sept au plus, aérodromes seulement, par le code ou le nom) posée par-dessus la page.
//
// Interface étroite (createAdNames(host) → api) :
//   host = {
//     ctx,          contexte du montage (t, aerodb)
//     body(),       le corps de l'écran (null une fois démonté)
//     flight(),     le vol courant (sa route : dep, arr, altn)
//     gone()        le montage a-t-il été démonté ou remplacé
//   }
//   api = { paint, onInput, onKey, onFocusOut, onPointerDown, onClick, stop }
//
// Le nom vient de aerodb.coords (la même source que le titre de la carte des procédures : « Départ LFPO Paris-Orly »), gardé par code
// jusqu'au prochain changement de la base. Le marquage de l'écran : une ligne [data-adline=dep|arr|altn] par champ (étape Vol, hauteur
// réservée) et des [data-adtext][data-code] ailleurs (le nom seul). La liste est un seul élément [data-adsug] du conteneur des champs.
const TX = {
  unknown: ['inconnu', 'unknown', 'unbekannt', 'desconocido'],
  listLabel: ['Terrains proposés', 'Suggested aerodromes', 'Vorgeschlagene Flugplätze', 'Aeródromos propuestos']
};
/** Nombre de propositions au plus (décision du concepteur : sept). */
const MAX_SUGGESTIONS = 7;
/** Longueur minimale du texte pour proposer. */
const MIN_CHARS = 2;
/** Un code de terrain complet : quatre caractères. */
const CODE = /^[A-Z0-9]{4}$/;
/** Les trois champs qui portent un terrain. */
const KEYS = ['dep', 'arr', 'altn'];

/** Crée le gestionnaire des noms et de la complétion d'un montage de l'écran Carburant. */
export function createAdNames(host) {
  const ctx = host.ctx,
    tt = (row, v) => ctx.t(row, v),
    names = new Map(), // code → nom ('' si connu sans nom) ou null (aucune réponse d'aerodb) ; vidé à chaque changement de la base
    asked = new Map(), // code → promesse en cours (une seule demande par code)
    st = {
      seq: 0, // dernière demande de propositions : seule elle est dessinée
      key: '', // champ qui porte la liste ouverte
      hits: [], // propositions affichées [{ code, name }]
      active: -1, // proposition surlignée au clavier
      picking: false // un choix est en train d'être écrit dans le champ (son évènement input ne rouvre pas la liste)
    };
  /** Corps de l'écran, ou null s'il est démonté. */
  const body = () => host.gone() ? null : host.body();

  /** Nom d'un code déjà connu (chaîne, '' ou null) ; undefined et demande lancée sinon (la ligne se redessine à la réponse). */
  function nameOf(code) {
    if (names.has(code)) return names.get(code);
    if (!asked.has(code) && ctx.aerodb?.coords) {
      const p = Promise.resolve().then(() => ctx.aerodb.coords(code)).then(place => place ? String(place.name || '').trim() : null)
        .catch(() => null);
      asked.set(code, p);
      p.then(n => {
        asked.delete(code);
        if (host.gone()) return;
        names.set(code, n);
        paint();
      });
    }
    return undefined;
  }

  /** Code saisi d'un champ du vol : majuscules, sans blancs ; '' tant que le code n'a pas quatre caractères. */
  const codeOf = k => {
    // le texte du champ quand il est à l'écran (la saisie de recherche n'écrit la route qu'une fois le terrain choisi), sinon la route
    const el = body()?.querySelector(`input[data-k="${k}"]`),
      v = String(el ? el.value : host.flight()?.route?.[k] || '').trim().toUpperCase();
    return CODE.test(v) ? v : '';
  };

  /** Dessine les lignes de nom : « LFPO — Paris-Orly » sous les champs (vide sous quatre caractères, « inconnu » sans réponse), le nom
   *  seul dans chaque [data-adtext][data-code]. Ne touche au DOM que si le texte change. */
  function paint() {
    const b = body();
    if (!b) return;
    for (const el of b.querySelectorAll('[data-adline]')) {
      const code = codeOf(el.dataset.adline),
        n = code ? nameOf(code) : '';
      // réponse attendue : la ligne garde ce qu'elle montrait pour ce même code (elle ne clignote pas), et se vide pour un autre
      if (n === undefined) {
        if (el.dataset.code !== code && el.textContent) el.textContent = '';
        continue;
      }
      el.dataset.code = code;
      const text = !code ? '' : n === null ? tt(TX.unknown) : n && n.toUpperCase() !== code ? `${code} — ${n}` : code;
      if (el.textContent !== text) el.textContent = text;
      if (el.title !== text) el.title = text;
      el.dataset.state = !code ? 'empty' : n === null ? 'unknown' : 'found';
    }
    for (const el of b.querySelectorAll('[data-adtext]')) {
      const n = nameOf(String(el.dataset.code || '').toUpperCase()) || '';
      if (el.textContent !== n) el.textContent = n;
    }
  }

  /** La zone de la liste, ou null. */
  const box = () => body()?.querySelector('[data-adsug]') || null;

  /** Ferme la liste et vide son contenu (le champ garde son focus). */
  function close() {
    st.seq++;
    st.key = '';
    st.hits = [];
    st.active = -1;
    const el = box();
    if (el) {
      el.hidden = true;
      el.innerHTML = '';
    }
    for (const k of KEYS) body()?.querySelector(`[data-k="${k}"]`)?.setAttribute('aria-expanded', 'false');
  }

  /** Surligne la proposition `i` (clavier) et la signale au lecteur d'écran. */
  function activate(i) {
    st.active = i;
    const el = box(),
      input = body()?.querySelector(`[data-k="${st.key}"]`);
    el?.querySelectorAll('[role="option"]').forEach((o, j) => o.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    if (input) i >= 0 ? input.setAttribute('aria-activedescendant', `fu-sug-${i}`) : input.removeAttribute('aria-activedescendant');
  }

  /** Dessine la liste sous le champ `k` : posée par-dessus la suite de l'écran, à la largeur du conteneur des trois champs. */
  function show(k, hits) {
    const el = box(),
      input = body()?.querySelector(`[data-k="${k}"]`),
      label = input?.closest('label');
    if (!el || !input || !label) return;
    st.key = k;
    st.hits = hits;
    el.innerHTML = hits.map((h, i) => `<button type="button" role="option" class="f-item fu-sugitem" id="fu-sug-${i}" tabindex="-1" aria-selected="false" data-code="${esc(h.code)}"><span><b>${esc(h.code)}</b> ${esc(h.name)}</span></button>`).join('');
    el.style.top = `${label.offsetTop + label.offsetHeight}px`;
    el.hidden = !hits.length;
    for (const x of KEYS) body()?.querySelector(`[data-k="${x}"]`)?.setAttribute('aria-expanded', x === k && hits.length ? 'true' : 'false');
    activate(-1);
  }

  /** Échappe un texte pour du HTML. */
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  /** Propose les terrains qui répondent au texte tapé dans le champ `k` (au moins deux caractères). aerodb.find classe les lieux (code
   *  exact, nom qui commence, ville…) : on garde les aérodromes à code de quatre caractères, sans doublon, sept au plus. */
  async function suggest(k, text) {
    const q = String(text || '').trim(),
      seq = ++st.seq;
    if (q.length < MIN_CHARS || !ctx.aerodb?.find) return close();
    const found = await Promise.resolve().then(() => ctx.aerodb.find(q, 40)).catch(() => []);
    if (seq !== st.seq || !body()) return; // une demande plus récente, ou l'écran n'est plus là
    const seen = new Set(),
      hits = [];
    for (const p of found || []) {
      const code = String(p.code || '').trim().toUpperCase();
      if (p.kind !== 'aerodrome' || !CODE.test(code) || seen.has(code)) continue;
      seen.add(code);
      hits.push({
        code,
        name: String(p.name || '').trim() === code ? '' : String(p.name || '').trim()
      });
      if (hits.length >= MAX_SUGGESTIONS) break;
    }
    // le code complet déjà tapé et seul de sa liste : rien à proposer, le champ est juste
    if (hits.length === 1 && hits[0].code === q.toUpperCase()) return close();
    show(k, hits);
  }

  /** Frappe dans un des trois champs : la ligne de nom se redessine (module.js a déjà écrit le code dans le vol) et la liste suit. */
  function onInput(e) {
    const k = e.target?.dataset?.k;
    if (!KEYS.includes(k)) return;
    paint();
    if (e.type === 'input' && !st.picking) suggest(k, e.target.value); // un choix dans la liste est fermé par pick
  }

  /** Choisit un code : le champ prend la valeur et reçoit l'évènement `input` comme une frappe (même chemin : vol écrit, route relue,
   *  météo, devis), la liste se ferme et le focus reste où il était. */
  function pick(code) {
    const input = body()?.querySelector(`[data-k="${st.key}"]`);
    if (!input || !code) return close();
    input.value = code;
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

  /** Clavier dans un champ : ↓ ↑ déplacent, Entrée choisit la proposition surlignée, Échap ferme. Vrai si la touche est prise. */
  function onKey(e) {
    const k = e.target?.dataset?.k;
    if (!KEYS.includes(k) || k !== st.key || !st.hits.length) return false;
    const n = st.hits.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activate(e.key === 'ArrowDown' ? (st.active + 1) % n : (st.active - 1 + n) % n);
      return true;
    }
    if (e.key === 'Enter' && st.active >= 0) {
      e.preventDefault();
      pick(st.hits[st.active].code);
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
    if (!KEYS.includes(e.target?.dataset?.k)) return;
    if (box()?.contains(e.relatedTarget)) return;
    close();
  }

  /** Appui sur une proposition : le champ garde le focus (pas de flou, donc pas de fermeture avant le clic) ; le choix se fait au clic. */
  function onPointerDown(e) {
    if (e.target.closest?.('[data-adsug]')) e.preventDefault();
  }

  /** Clic ou toucher sur une proposition : son code est choisi. Vrai si le clic était pour la liste. */
  function onClick(e) {
    const item = e.target.closest?.('[data-adsug] [data-code]');
    if (!item) return false;
    pick(item.dataset.code);
    return true;
  }

  // la base change (zone chargée, fichier publié) : les noms gardés sont refaits
  const off = ctx.aerodb?.on?.('change', () => {
    names.clear();
    paint();
  });
  return {
    paint,
    onInput,
    onKey,
    onFocusOut,
    onPointerDown,
    onClick,
    texts: TX,
    /** Vrai pendant qu'un choix de la liste est rendu au champ (son code est connu d'aerodb : écrit sans autre contrôle). */
    isPicking: () => !!st.picking,
    /** Le code est-il un terrain qu'aerodb connaît ? Promesse de vrai ou faux (le nom demandé une fois, gardé comme pour la ligne). */
    known: code => {
      const n = nameOf(code);
      if (n !== undefined) return Promise.resolve(n !== null);
      return (asked.get(code) || Promise.resolve(null)).then(x => x !== null && x !== undefined);
    },
    /** Nombre de terrains proposés pour le champ k au dernier texte tapé (0 si la liste est fermée ou pour un autre champ). */
    hitsFor: k => st.key === k ? st.hits.length : 0,
    /** Le nom gardé d'un code : chaîne ('' sans nom), null (inconnu d'aerodb), undefined (pas encore demandé ou en cours). */
    nameKnown: code => names.get(code),
    /** Arrête l'abonnement à la base. */
    stop: () => {
      if (typeof off === 'function') off();
    }
  };
}
