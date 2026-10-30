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
//   api = { onInput, onKey, onFocusOut, onPointerDown, onClick, texts } ; la liste est celle de suggest.js (refonte § 10.33 R-F5)
import {
  createSuggestList
} from './suggest.js';
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
    tt = (row, v) => ctx.t(row, v);
  let word = null; // le mot remplacé : { start, end }
  const body = () => host.gone() ? null : host.body(),
    field = () => body()?.querySelector('[data-k="rtext"]') || null,
    // la liste sous le champ (suggest.js) : le choix remplace le mot sous le curseur
    list = createSuggestList({
      body,
      box: '[data-rtsug]',
      attr: 'token',
      idPrefix: 'fu-rtsug',
      fields: () => [field()],
      owns: el => el?.dataset?.k === 'rtext',
      write
    });

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

  /** Les propositions pour le mot sous le curseur : noms de procédure, voies proches, points et balises ; sept au plus, sans doublon. */
  async function suggest(ta) {
    const w = wordAt(ta),
      seq = list.ticket();
    word = w;
    if (w.q.length < MIN_CHARS) return list.close();
    const out = [],
      seen = new Set(),
      add = (token, label) => {
        if (out.length >= MAX || seen.has(token) || token === w.q && out.length) return;
        seen.add(token);
        out.push({
          value: token,
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
      if (!list.live(seq)) return;
      for (const r of [...new Set((segs || []).map(s => String(s.route || '').toUpperCase()))].sort())
        if (r.startsWith(w.q)) add(r, tt(TX.airway, {
          w: ''
        }).trim());
    }
    if (ctx.aerodb?.find) {
      const found = await Promise.resolve().then(() => ctx.aerodb.find(w.q, 40)).catch(() => []);
      if (!list.live(seq)) return;
      for (const x of found || []) {
        const code = String(x.code || '').trim().toUpperCase();
        if (!code || !['navaid', 'point', 'aerodrome'].includes(x.kind) || !code.startsWith(w.q)) continue;
        add(code, String(x.name || '').trim() === code ? '' : String(x.name || '').trim());
      }
    }
    if (!list.live(seq)) return;
    // le mot déjà complet et seul de sa liste : rien à proposer
    if (out.length === 1 && out[0].value === w.q) return list.close();
    list.show(ta, out);
  }

  /** Frappe dans le champ de route : la liste suit le mot sous le curseur. */
  function onInput(e) {
    if (e.target?.dataset?.k !== 'rtext' || list.picking()) return;
    suggest(e.target);
  }

  /** Écrit le mot choisi à la place de celui sous le curseur, suivi d'une espace, le curseur après (la liste rend ensuite au champ
   *  l'évènement `input` d'une frappe : route relue, devis). */
  function write(ta, token) {
    const w = word;
    if (!w) return false;
    const v = ta.value,
      tail = v.slice(w.end),
      sep = /^\s/.test(tail) ? '' : ' ';
    ta.value = v.slice(0, w.start) + token + sep + tail;
    const at = w.start + token.length + sep.length;
    ta.setSelectionRange(at, at);
    return true;
  }

  return {
    onInput,
    onKey: list.onKey,
    onFocusOut: list.onFocusOut,
    onPointerDown: list.onPointerDown,
    onClick: list.onClick,
    texts: TX
  };
}
