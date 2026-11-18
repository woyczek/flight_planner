// V3 cadre — un champ d'indicatif (SOG-0488, l'ergonome : « un champ d'indicatif commun, comme le champ de terrain de SOG-0465, qui
// propose les indicatifs et les types de la flotte connue et remplit le type avec l'indicatif ; réutilisé dans l'atelier et dans le
// formulaire d'affectation ») : dès deux caractères, sept propositions au plus « INDICATIF — TYPE · IMMATRICULATION », venues du registre
// des aéronefs (aerodb.aircraft().search : fiches, flotte de la compagnie, référence) ; le choix écrit l'indicatif dans le champ et le
// type dans le champ que l'écran désigne. La liste est celle de suggest_list.js. Ni réseau ni stockage à lui : aerodb vient du contexte
// que l'écran lui passe (ctx.aerodb), jamais d'une globale. Mes appareils garde son propre champ (rien n'y change).
//
// Interface étroite (createCallsignField(host) → api) :
//   host = {
//     ctx,          contexte du montage (t, lang, aerodb)
//     body(),       le corps de l'écran (null une fois démonté) ; il porte UN élément [data-cssug] (la liste), dans le conteneur
//                   positionné des champs, et chaque champ est dans un <label> (la liste se pose sous lui)
//     gone(),       le montage a-t-il été démonté ou remplacé
//     owns(el),     el est-il un champ d'indicatif de l'écran (l'atelier : plusieurs lignes d'équipe)
//     typeOf(el),   facultatif : le champ du type qui va avec ce champ d'indicatif (rempli au choix ; null : aucun)
//     idPrefix      facultatif : le préfixe des identifiants des propositions ('cs-sug')
//   }
//   api = { onInput, onKey, onFocusOut, onPointerDown, onClick, texts, isPicking, stop }
//
// Règle du type rempli : un indicatif proposé par plusieurs appareils de types différents ne remplit pas le type (on ne devine pas) ;
// un seul type connu pour cet indicatif : il est écrit, avec l'évènement `input` d'une frappe pour que l'écran l'enregistre — et rien
// n'est écrit si le champ porte déjà ce type.
import {
  createSuggestList
} from './suggest_list.js'; // la liste de propositions, commune à tous les champs qui proposent

const TX = {
  listLabel: ['Indicatifs proposés', 'Suggested callsigns', 'Vorgeschlagene Rufzeichen', 'Indicativos propuestos']
};
/** Nombre de propositions au plus (la règle du champ de terrain : sept). */
const MAX_SUGGESTIONS = 7;
/** Longueur minimale du texte pour proposer. */
const MIN_CHARS = 2;
/** Un indicatif lisible : la forme que le registre des aéronefs garde (lettres, chiffres, espace, tiret ; douze signes au plus). */
const CALLSIGN = /^[A-Z0-9][A-Z0-9 -]{0,11}$/;
/** Un type OACI ou un code de fiche (deux à huit signes). */
const TYPE = /^[A-Z0-9]{2,8}$/;
/** Une immatriculation à montrer (lettres, chiffres, tiret ; dix signes au plus) ; autre chose n'est pas montré. */
const REG = /^[A-Z0-9-]{2,10}$/;
/** Un texte replié pour comparer : majuscules, sans séparateurs (« ctm 12 » trouve « CTM12 »). */
const bare = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Crée le champ d'indicatif d'un montage (voir l'en-tête). */
export function createCallsignField(host) {
  const {
    ctx,
    body,
    gone
  } = host,
  owns = el => !!el && typeof host.owns === 'function' && !!host.owns(el),
    typeOf = el => typeof host.typeOf === 'function' ? host.typeOf(el) || null : null,
    // les types connus de chaque indicatif à la dernière recherche : { INDICATIF: Set(types) }
    types = new Map(),
    list = createSuggestList({
      body,
      box: '[data-cssug]',
      attr: 'callsign',
      idPrefix: host.idPrefix || 'cs-sug',
      fields: () => [...(body()?.querySelectorAll('input') || [])].filter(owns),
      owns,
      write: (input, v) => {
        const cs = String(v || '').toUpperCase();
        if (!CALLSIGN.test(cs)) return false;
        if (input.value !== cs) input.value = cs;
        fillType(input, cs);
        return true;
      }
    });
  let stopped = false;

  /** Écrit le type de l'indicatif choisi dans le champ du type, s'il est seul connu pour lui et différent de ce que porte le champ. */
  function fillType(input, cs) {
    const t = types.get(cs),
      el = typeOf(input);
    if (!el || !t || t.size !== 1) return;
    const type = [...t][0];
    if (el.value === type) return;
    el.value = type;
    el.dispatchEvent(new Event('input', {
      bubbles: true
    }));
  }

  /** Les propositions pour le texte tapé : les lignes du registre qui portent un indicatif dont le texte est un morceau, les
   *  indicatifs qui COMMENCENT par le texte d'abord ; une ligne par couple indicatif et type. */
  async function suggest(input, text) {
    const q = bare(text),
      seq = list.ticket();
    const reg = ctx.aerodb?.aircraft;
    if (q.length < MIN_CHARS || typeof reg !== 'function') return list.close();
    const r = await Promise.resolve().then(() => reg()).catch(() => null),
      rows = r && typeof r.search === 'function' ? await Promise.resolve().then(() => r.search(text, 60)).catch(() => []) : [];
    if (!list.live(seq) || stopped || gone()) return;
    const seen = new Set(),
      found = [];
    types.clear();
    for (const x of Array.isArray(rows) ? rows : []) {
      const cs = String(x?.callsign || '').trim().toUpperCase(),
        type = String(x?.type || '').trim().toUpperCase(),
        regn = String(x?.registration || '').trim().toUpperCase();
      if (!CALLSIGN.test(cs) || !bare(cs).includes(q)) continue;
      if (TYPE.test(type)) types.set(cs, (types.get(cs) || new Set()).add(type));
      const key = `${cs}|${TYPE.test(type) ? type : ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({
        cs,
        type: TYPE.test(type) ? type : '',
        regn: REG.test(regn) ? regn : '',
        first: bare(cs).startsWith(q)
      });
    }
    // la valeur d'une proposition est l'indicatif : un indicatif une fois dans la liste, ses types et immatriculations dans sa ligne
    const byCs = new Map();
    for (const f of found.sort((a, b) => (b.first - a.first) || a.cs.localeCompare(b.cs))) {
      const e = byCs.get(f.cs) || byCs.set(f.cs, {
        types: [],
        regs: []
      }).get(f.cs);
      if (f.type && !e.types.includes(f.type)) e.types.push(f.type);
      if (f.regn && !e.regs.includes(f.regn)) e.regs.push(f.regn);
    }
    const hits = [...byCs].slice(0, MAX_SUGGESTIONS).map(([cs, e]) => {
      const tail = [e.types.join(' / '), e.regs.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
      return {
        value: cs,
        label: tail ? `— ${tail}` : ''
      };
    });
    // l'indicatif complet déjà tapé et seul de sa liste : rien à proposer
    if (hits.length === 1 && hits[0].value === String(text || '').trim().toUpperCase()) return list.close();
    list.show(input, hits);
  }

  /** Frappe dans un champ d'indicatif : la liste suit (un choix de la liste ne la rouvre pas). */
  function onInput(e) {
    if (!owns(e?.target) || stopped) return;
    if (e.type === 'input' && !list.picking()) suggest(e.target, e.target.value);
  }

  return {
    onInput,
    onKey: list.onKey,
    onFocusOut: list.onFocusOut,
    onPointerDown: list.onPointerDown,
    onClick: list.onClick,
    texts: TX,
    /** Vrai pendant qu'un choix de la liste est rendu au champ. */
    isPicking: list.picking,
    /** Le montage s'en va : plus aucune liste dessinée. */
    stop: () => {
      stopped = true;
      list.close();
    }
  };
}
