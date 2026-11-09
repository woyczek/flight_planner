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
//   api = { paint, onInput, onKey, onFocusOut, onPointerDown, onClick, stop } ; la liste est celle de suggest.js
//
// Le nom vient de aerodb.coords (la même source que le titre de la carte des procédures : « Départ LFPO Paris-Orly »), gardé par code
// jusqu'au prochain changement de la base. Le marquage de l'écran : une ligne [data-adline=dep|arr|altn] par champ (étape Vol, hauteur
// réservée) et des [data-adtext][data-code] ailleurs (le nom seul). La liste est un seul élément [data-adsug] du conteneur des champs.
import {
  adLabel,
  adLine
} from '../../frame/lib/adnames.js'; // la règle de texte du nom, partagée avec la Carte (§ 10.27)
import {
  createSuggestList
} from './suggest.js'; // la liste de propositions, commune avec le champ de route (refonte § 10.33 R-F5)
const TX = {
  unknown: ['inconnu', 'unknown', 'unbekannt', 'desconocido'],
  listLabel: ['Terrains proposés', 'Suggested aerodromes', 'Vorgeschlagene Flugplätze', 'Aeródromos propuestos']
};
/** Nombre de propositions au plus (décision du concepteur : sept). */
const MAX_SUGGESTIONS = 7;
/** Rayon autour d'une ville où ses terrains sont proposés (NM ; SOG-0158). */
const CITY_NM = 40;
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
    asked = new Map(); // code → promesse en cours (une seule demande par code)
  /** Corps de l'écran, ou null s'il est démonté. */
  const body = () => host.gone() ? null : host.body(),
    // la liste sous les trois champs (suggest.js) : le choix écrit le code dans le champ
    list = createSuggestList({
      body,
      box: '[data-adsug]',
      attr: 'code',
      idPrefix: 'fu-sug',
      fields: () => KEYS.map(k => body()?.querySelector(`[data-k="${k}"]`)),
      owns: el => KEYS.includes(el?.dataset?.k),
      write: (input, code) => {
        input.value = code;
        return true;
      }
    });

  /** Nom d'un code déjà connu (chaîne, '' ou null) ; undefined et demande lancée sinon (la ligne se redessine à la réponse). */
  function nameOf(code) {
    if (names.has(code)) return names.get(code);
    if (!asked.has(code) && ctx.aerodb?.coords) {
      const p = Promise.resolve().then(() => ctx.aerodb.coords(code)).then(place => place ? adLabel({
          ...place,
          icao: code
        }) : null)
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
      const text = !code ? '' : n === null ? tt(TX.unknown) : adLine({
        name: n
      }, code);
      if (el.textContent !== text) el.textContent = text;
      if (el.title !== text) el.title = text;
      el.dataset.state = !code ? 'empty' : n === null ? 'unknown' : 'found';
    }
    for (const el of b.querySelectorAll('[data-adtext]')) {
      const n = nameOf(String(el.dataset.code || '').toUpperCase()) || '';
      if (el.textContent !== n) el.textContent = n;
    }
  }

  /** Propose les terrains qui répondent au texte tapé dans le champ `k` (au moins deux caractères). aerodb.find classe les lieux (code
   *  exact, nom qui commence, ville…) : on garde les aérodromes à code de quatre caractères, sans doublon ; puis, pour une ville trouvée
   *  (deux au plus : « stockholm », SOG-0158), les terrains à CITY_NM d'elle, du plus proche au plus loin, la ville dans la ligne
   *  (« ESSA Arlanda (Stockholm) ») ; sept au plus en tout. */
  async function suggest(k, text) {
    const q = String(text || '').trim(),
      seq = list.ticket();
    if (q.length < MIN_CHARS || !ctx.aerodb?.find) return list.close();
    const found = await Promise.resolve().then(() => ctx.aerodb.find(q, 40)).catch(() => []);
    if (!list.live(seq)) return; // une demande plus récente, ou l'écran n'est plus là
    const seen = new Set(),
      hits = [];
    for (const p of found || []) {
      const code = String(p.code || '').trim().toUpperCase();
      if (p.kind !== 'aerodrome' || !CODE.test(code) || seen.has(code)) continue;
      seen.add(code);
      hits.push({
        value: code,
        label: String(p.name || '').trim() === code ? '' : String(p.name || '').trim()
      });
      if (hits.length >= MAX_SUGGESTIONS) break;
    }
    // SOG-0158 : les terrains autour des villes que le texte nomme (aerodb.aerodromes ouvre leur zone ; find ne cherche les terrains que
    // dans les zones déjà ouvertes)
    const cities = (found || []).filter(p => p.kind === 'city' && Number.isFinite(+p.lat) && Number.isFinite(+p.lon)).slice(0, 2);
    for (const c of cities) {
      if (hits.length >= MAX_SUGGESTIONS || !ctx.aerodb?.aerodromes) break;
      const near = await Promise.resolve().then(() => ctx.aerodb.aerodromes({
        lat: +c.lat,
        lon: +c.lon,
        radiusNm: CITY_NM
      })).catch(() => []);
      if (!list.live(seq)) return;
      const d = x => Math.hypot(+x.lat - c.lat, (+x.lon - c.lon) * Math.cos(c.lat * Math.PI / 180));
      for (const x of (Array.isArray(near) ? near : []).filter(x => Number.isFinite(+x?.lat)).sort((x, y) => d(x) - d(y))) {
        const code = String(x.icao || x.id || '').trim().toUpperCase();
        if (!CODE.test(code) || seen.has(code)) continue;
        seen.add(code);
        const name = String(x.name || '').trim(),
          city = String(c.name || '').trim();
        hits.push({
          value: code,
          label: [name && name !== code ? name : '', city ? `(${city})` : ''].filter(Boolean).join(' ')
        });
        if (hits.length >= MAX_SUGGESTIONS) break;
      }
    }
    // le code complet déjà tapé et seul de sa liste : rien à proposer, le champ est juste
    if (hits.length === 1 && hits[0].value === q.toUpperCase()) return list.close();
    list.show(body()?.querySelector(`[data-k="${k}"]`), hits);
  }

  /** Frappe dans un des trois champs : la ligne de nom se redessine (module.js a déjà écrit le code dans le vol) et la liste suit. */
  function onInput(e) {
    const k = e.target?.dataset?.k;
    if (!KEYS.includes(k)) return;
    paint();
    if (e.type === 'input' && !list.picking()) suggest(k, e.target.value); // un choix dans la liste est fermé par elle
  }

  // la base change (zone chargée, fichier publié) : les noms gardés sont refaits
  const off = ctx.aerodb?.on?.('change', () => {
    names.clear();
    paint();
  });
  return {
    paint,
    onInput,
    onKey: list.onKey,
    onFocusOut: list.onFocusOut,
    onPointerDown: list.onPointerDown,
    onClick: list.onClick,
    texts: TX,
    /** Vrai pendant qu'un choix de la liste est rendu au champ (son code est connu d'aerodb : écrit sans autre contrôle). */
    isPicking: list.picking,
    /** Le code est-il un terrain qu'aerodb connaît ? Promesse de vrai ou faux (le nom demandé une fois, gardé comme pour la ligne). */
    known: code => {
      const n = nameOf(code);
      if (n !== undefined) return Promise.resolve(n !== null);
      return (asked.get(code) || Promise.resolve(null)).then(x => x !== null && x !== undefined);
    },
    /** Nombre de terrains proposés pour le champ k au dernier texte tapé (0 si la liste est fermée ou pour un autre champ). */
    hitsFor: k => list.input()?.dataset?.k === k ? list.hits().length : 0,
    /** Le nom gardé d'un code : chaîne ('' sans nom), null (inconnu d'aerodb), undefined (pas encore demandé ou en cours). */
    nameKnown: code => names.get(code),
    /** Arrête l'abonnement à la base. */
    stop: () => {
      if (typeof off === 'function') off();
    }
  };
}
