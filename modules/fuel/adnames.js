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
} from './suggest.js';
import {
  zoneAt
} from './zone_gap.js'; // la zone d'une position (cadres des zones d'aerodb) : un terrain est bien du pays nommé // la liste de propositions, commune avec le champ de route (refonte § 10.33 R-F5)
const TX = {
  unknown: ['inconnu', 'unknown', 'unbekannt', 'desconocido'],
  listLabel: ['Terrains proposés', 'Suggested aerodromes', 'Vorgeschlagene Flugplätze', 'Aeródromos propuestos']
};
/** Nombre de propositions au plus (décision du concepteur : sept). */
const MAX_SUGGESTIONS = 7;
/** Rayon autour d'une ville où ses terrains sont proposés (NM ; SOG-0158). */
const CITY_NM = 40;
/** Un texte replié pour comparer des noms : minuscules, sans accents (« Suède » → « suede »). */
const fold = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
/** Les noms usuels, sigles et noms dans la langue du pays qui désignent une zone d'aerodb (SOG-0158 : « usa », « uk », « sverige ») ; les
 *  noms des zones en français, anglais, allemand et espagnol sont cherchés en plus. Repliés (minuscules, sans accents, tirets en espaces). */
const COUNTRY_ALIASES = {
  us: ['usa', 'us', 'etats unis', 'etats unis d amerique', 'united states', 'america', 'amerique'],
  gb: ['uk', 'gb', 'royaume uni', 'grande bretagne', 'great britain', 'britain', 'angleterre', 'england', 'ecosse', 'scotland',
    'pays de galles', 'wales'
  ],
  se: ['sverige'],
  dk: ['danmark'],
  no: ['norge'],
  fi: ['suomi'],
  es: ['espana'],
  de: ['deutschland'],
  it: ['italia'],
  ch: ['schweiz', 'suisse', 'svizzera'],
  nl: ['nederland', 'holland', 'hollande', 'pays bas'],
  be: ['belgie', 'belgique'],
  at: ['osterreich', 'oesterreich'],
  pl: ['polska'],
  ie: ['eire', 'ireland', 'irlande'],
  gr: ['hellas', 'ellada']
};
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

  /** Les terrains d'une liste d'aerodb, les principaux d'abord : les aérodromes civils, puis les militaires (type MIL), puis les
   *  hélistations (HP) ; dans chaque groupe la plus longue piste en dur (hardLen ; une base sans cette donnée, NATS, garde son ordre),
   *  puis les plus proches de `c` s'il est donné. */
  const KIND_RANK = {
    MIL: 1,
    HP: 2
  };
  const bySize = (list, c = null) => {
    const d = x => c ? Math.hypot(+x.lat - c.lat, (+x.lon - c.lon) * Math.cos(c.lat * Math.PI / 180)) : 0,
      kr = x => KIND_RANK[String(x.type || '').toUpperCase()] || 0;
    return (Array.isArray(list) ? list : []).filter(x => x && x.public !== false && Number.isFinite(+x.lat))
      .sort((a, b) => kr(a) - kr(b) || (+b.hardLen || 0) - (+a.hardLen || 0) || d(a) - d(b));
  };
  /** Les terrains d'une zone parmi ceux de son cadre : ceux que les cadres de la zone portent (zoneAt), et parmi eux les préfixes OACI
   *  qui y sont nombreux (au moins 15 % du plus fréquent) — un cadre rectangulaire déborde sur ses voisins (la Norvège dans celui de la
   *  Suède : ENEV, ENBO). */
  const ofZone = (all, zones, z) => {
    const inZone = (Array.isArray(all) ? all : []).filter(x => zoneAt(zones, x)?.id === z.id),
      n = new Map();
    for (const x of inZone) {
      const k = String(x.icao || x.id || '').slice(0, 2).toUpperCase();
      n.set(k, (n.get(k) || 0) + 1);
    }
    const top = Math.max(0, ...n.values());
    return inZone.filter(x => (n.get(String(x.icao || x.id || '').slice(0, 2).toUpperCase()) || 0) >= top * 0.15);
  };
  /** La zone d'un nom de pays (SOG-0158) : un alias de la table (sigles, noms usuels, noms dans la langue du pays) tapé en entier ou par
   *  son début (trois lettres au moins), sinon un des quatre noms de la zone par son début ; seulement une zone publiée. */
  function countryOf(zones, q) {
    const fq = fold(q).replace(/[-'’.]/g, ' ').replace(/\s+/g, ' ');
    if (fq.length < 2 || !Array.isArray(zones)) return null;
    const hit = a => a === fq || (fq.length >= 3 && a.startsWith(fq)),
      alias = Object.entries(COUNTRY_ALIASES).find(([, list]) => list.some(hit))?.[0],
      z = alias ? zones.find(x => x.id === alias) : fq.length >= 3 ? zones.find(x => (x.names || []).some(n => fold(n).replace(/[-'’.]/g,
        ' ').startsWith(fq))) : null;
    return z?.published ? z : null;
  }

  /** Propose les terrains qui répondent au texte tapé dans le champ `k` (au moins deux caractères), sept au plus, dans cet ordre (SOG-0158,
   *  refus de recette du 10 nov. : « SWE… fonctionne. STOC… ne fonctionne pas. USA non plus. ») :
   *  1. les codes qui commencent par le texte (« LFP ») ; 2. un pays (« usa », « suède », « sverige ») : ses terrains, les plus grands
   *  d'abord, le pays dans la ligne ; 3. les terrains dont un mot du nom commence par le texte (« orly », « stockholm/bromma ») ; 4. les
   *  terrains à CITY_NM d'une ville que le texte nomme (deux villes au plus), les plus grands d'abord, la ville dans la ligne ; 5. le reste
   *  de ce que find rend (le texte au milieu d'un nom). Les étapes 2 à 4 cherchent dans toutes les zones installées (aerodromes ouvre la
   *  zone), find seulement dans les zones ouvertes. */
  async function suggest(k, text) {
    const q = String(text || '').trim(),
      Q = q.toUpperCase(),
      fq = fold(q),
      seq = list.ticket();
    if (q.length < MIN_CHARS || !ctx.aerodb?.find) return list.close();
    const A = ctx.aerodb,
      [found, zones] = await Promise.all([Promise.resolve().then(() => A.find(q, 40)).catch(() => []), Promise.resolve().then(() => A
          .zones?.())
        .catch(() => null)
      ]);
    if (!list.live(seq)) return; // une demande plus récente, ou l'écran n'est plus là
    const seen = new Set(),
      hits = [],
      lang = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(ctx.lang?.() || 'fr')),
      full = () => hits.length >= MAX_SUGGESTIONS,
      push = (x, tail = '') => {
        const code = String(x.icao || x.code || x.id || '').trim().toUpperCase();
        if (full() || !CODE.test(code) || seen.has(code)) return;
        seen.add(code);
        const name = String(x.name || '').trim();
        hits.push({
          value: code,
          label: [name && name !== code ? name : '', tail ? `(${tail})` : ''].filter(Boolean).join(' ')
        });
      },
      ads = (found || []).filter(p => p.kind === 'aerodrome'),
      wordStart = n => fold(n).split(/[\s/\-'’().,]+/).some(w => w.startsWith(fq));
    // 1. les codes qui commencent par le texte
    for (const p of ads)
      if (String(p.code || '').toUpperCase().startsWith(Q)) push(p);
    // 2. un pays
    const country = countryOf(zones, q);
    if (country && !full() && A.aerodromes) {
      const frame = [...(country.frames || [])].sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]))[0],
        all = frame ? await Promise.resolve().then(() => A.aerodromes({
          bbox: frame
        })).catch(() => []) : [];
      if (!list.live(seq)) return;
      for (const x of bySize(ofZone(all, zones, country))) push(x, country.names?.[lang] || country.id);
    }
    // 3. un mot du nom qui commence par le texte, les plus grands d'abord (leur fiche lue par leur code, dans les zones ouvertes)
    const named = ads.filter(p => !seen.has(String(p.code || '').toUpperCase()) && wordStart(p.name)).slice(0, 15);
    if (named.length && !full()) {
      const recs = A.aerodromes ? await Promise.all(named.map(p => Promise.resolve().then(() => A.aerodromes({
        icao: p.code
      })).then(r => (r || [])[0] || p).catch(() => p))) : named;
      if (!list.live(seq)) return;
      for (const x of bySize(recs.map((r, n) => ({
          ...named[n],
          ...r,
          code: named[n].code
        })))) push(x);
    }
    // 4. les terrains autour d'une ville que le texte nomme
    const cities = (found || []).filter(p => p.kind === 'city' && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) && wordStart(p.name))
      .slice(0, 2);
    for (const c of cities) {
      if (full() || !A.aerodromes) break;
      const near = await Promise.resolve().then(() => A.aerodromes({
        lat: +c.lat,
        lon: +c.lon,
        radiusNm: CITY_NM
      })).catch(() => []);
      if (!list.live(seq)) return;
      for (const x of bySize(near, c)) push(x, String(c.name || '').trim());
    }
    // 5. le reste : le texte au milieu d'un nom
    for (const p of ads) push(p);
    // le code complet déjà tapé et seul de sa liste : rien à proposer, le champ est juste
    if (hits.length === 1 && hits[0].value === Q) return list.close();
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
