// V3 frame/lib (propriétaire : fuel ; la carte s'en sert) — le texte d'une route, en calcul pur : lecture en jetons (forme
// libre façon item 15 « LFBO N0450F350 DCT TOU UN460 NTS/F280 LFRN » ou liste d'OFP « ID lat lon[/N0450F370] »), texte
// normalisé « DEP PT1 UN460 PT2/F280 … ARR », et texte refait depuis des points modifiés en gardant les voies
// aériennes des tronçons restés intacts. Aucune résolution des noms (la base aéronautique est l'affaire de l'appelant),
// ni page, ni stockage, ni réseau.
//
// API :
//   tokenize(text) → [{ kind: 'coord', id, lat, lon, alt_ft } | { kind: 'name', id, alt_ft, airway } |
//     { kind: 'group', alt_ft } | { kind: 'word', id }] — 'name' : identifiant à chercher (airway : sa forme est celle
//     d'une voie ou d'une procédure, à garder tel quel s'il n'est pas un point connu) ; DCT écarté.
//   textFromTokens(tokens, { dct }) : texte normalisé de jetons { pt: point } | { keep: mot } (une ligne) ; avec dct, en forme OACI :
//     « DCT » entre deux points de route qui se suivent sans voie ni procédure (jamais contre le départ ni l'arrivée) (§ 10.31).
//   withProcedures(text, o), proceduresOfText(text, o) : les noms de SID et de STAR dans le texte, posés depuis le choix et relus
//     quand le pilote l'édite (§ 10.31 : le texte est une vue du modèle).
//   textFromPoints(points, previousText, previousPoints) : texte refait depuis les points ; entre deux points
//     consécutifs inchangés qui se suivaient déjà dans previousText, les mots qui les séparaient (voie, procédure) sont
//     gardés ; ailleurs, rien (direct). Inchangé : même identifiant, et même position à 0,5 NM près si previousPoints
//     est donné. Niveaux en /Fnnn d'après alt_ft ; coordonnées OACI pour un point sans nom utilisable.
//   icaoCoord(lat, lon) : « 4530N00030E » (degrés et minutes).
//   provenance(words, prev) : pour chaque mot du texte, vrai s'il vient du dernier « Auto » (voie ou nœud qu'il a écrit), faux
//     s'il est posé (tapé par le pilote, départ, arrivée) ; prev : [{ w, g }] gardé avec la route (route.auto.seq) (§ 10.31).
//   formatLevel(ft, transitionFt = 5000) : une seule notation des niveaux dans la suite — « FL060 » à partir de
//     l'altitude de transition, « 3 500 ft » en dessous (centaines, espace fine insécable entre les milliers).

const COORD = /^([A-Z0-9]{2,7})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\/(?:[NKM]\d{3,4})?F(\d{3}))?/i,
  ICAO_LL = /^(\d{2})(\d{2})?([NS])(\d{3})(\d{2})?([EW])$/,
  NUM = /^-?\d+(?:\.\d+)?$/,
  GROUP = /^[NKM]\d{3,4}([FASM]\d{3,4})?$/,
  AIRWAY = /^[A-Z]{1,2}\d{1,4}[A-Z]?$/,
  PROC = /\d[A-Z]$/,
  NAME = /^[A-Z0-9]{2,7}$/;

/** La provenance des mots d'un texte de route face au dernier texte écrit par « Auto » (V3 § 10.31 : les voies et les nœuds d'un
 *  Auto précédent ne sont jamais des contraintes) : pour chaque mot de words, vrai quand il vient de cet Auto, faux quand il est posé
 *  (tapé par le pilote, ou gardé par l'Auto comme point posé). prev : [{ w, g }] (le mot, généré ou non), gardé avec la route.
 *  L'alignement est la plus longue sous-suite commune : un mot que le pilote ajoute ou retire ne décale rien, un mot nouveau est
 *  posé. Sans prev, rien n'est généré. Majuscules indifférentes. */
export function provenance(words, prev) {
  const a = (words || []).map(w => String(w ?? '').toUpperCase()),
    b = (prev || []).filter(x => x && x.w).map(x => ({
      w: String(x.w).toUpperCase(),
      g: !!x.g
    })),
    n = a.length,
    m = b.length,
    L = Array.from({
      length: n + 1
    }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j].w ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = a.map(() => false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j].w) {
      out[i] = b[j].g;
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/** Jetons d'un texte de route (voir l'en-tête). */
export function tokenize(text) {
  const entries = String(text || '').split(/[,\n]+/).map(x => x.trim()).filter(Boolean);
  if (entries.length && entries.every(e => COORD.test(e)))
    return entries.map(e => {
      const m = COORD.exec(e);
      return {
        kind: 'coord',
        id: m[1].toUpperCase(),
        lat: +m[2],
        lon: +m[3],
        alt_ft: m[4] ? +m[4] * 100 : 0
      };
    });
  const words = String(text || '').toUpperCase().split(/[\s,]+/).filter(Boolean),
    out = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i],
      lv = /(?:^|\/)(?:[NKM]\d{3,4})?F(\d{3})$/.exec(word),
      alt = lv ? +lv[1] * 100 : 0,
      tok = word.split('/')[0];
    let m;
    if (GROUP.test(tok)) out.push({
      kind: 'group',
      alt_ft: alt
    });
    else if (tok === 'DCT') continue;
    else if ((m = ICAO_LL.exec(tok))) out.push({
      kind: 'coord',
      id: tok,
      lat: (+m[1] + (+m[2] || 0) / 60) * (m[3] === 'S' ? -1 : 1),
      lon: (+m[4] + (+m[5] || 0) / 60) * (m[6] === 'W' ? -1 : 1),
      alt_ft: alt
    });
    else if (NAME.test(tok) && NUM.test(words[i + 1] || '') && NUM.test(words[i + 2] || '')) {
      out.push({
        kind: 'coord',
        id: tok,
        lat: +words[i + 1],
        lon: +words[i + 2],
        alt_ft: 0
      });
      i += 2;
    } else if (NAME.test(tok)) out.push({
      kind: 'name',
      id: tok,
      alt_ft: alt,
      airway: AIRWAY.test(tok) || PROC.test(tok)
    });
    else out.push({
      kind: 'word',
      id: word
    });
  }
  return out;
}

/** Coordonnées OACI d'un point : « 4530N00030E ». */
export function icaoCoord(lat, lon) {
  const dm = (v, w) => {
    const a = Math.abs(v),
      d = Math.floor(a),
      m = Math.round((a - d) * 60);
    return m === 60 ? [d + 1, 0] : [d, m];
  };
  const [ld, lm] = dm(lat),
    [od, om] = dm(lon);
  return `${String(ld).padStart(2, '0')}${String(lm).padStart(2, '0')}${lat < 0 ? 'S' : 'N'}${String(od).padStart(3, '0')}${String(om).padStart(2, '0')}${lon < 0 ? 'W' : 'E'}`;
}

/** Écriture d'un point dans le texte : son identifiant (coordonnées OACI s'il n'en a pas d'utilisable), « /Fnnn » s'il
 *  porte un niveau. */
const pointWord = p => {
  const id = String(p?.id || '').toUpperCase(),
    name = NAME.test(id) || ICAO_LL.test(id) ? id : Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon) ? icaoCoord(+p.lat, +p.lon) : id;
  return `${name}${p?.alt_ft > 0 ? `/F${String(Math.round(p.alt_ft / 100)).padStart(3, '0')}` : ''}`;
};

/** Texte normalisé de jetons { pt } | { keep } : une ligne, en forme OACI (V3 § 10.31) : « DCT » entre deux points qui se suivent
 *  sans rien entre eux (ni voie, ni procédure), sauf contre le premier et le dernier point (le départ et l'arrivée : « LFBO LACOU7B
 *  LACOU DCT LMG UN859 AMB OKRIX5A LFPO ») quand dct est vrai (le champ de route de Carburant) ; sans dct, aucun n'est ajouté (le
 *  texte d'un trajet de routing.js, « PT1 UN460 PT2 »). Un « DCT » déjà dans les jetons n'est pas doublé. */
export function textFromTokens(tokens, {
  dct = false
} = {}) {
  const list = (tokens || []).filter(t => t && (t.pt || t.keep)),
    pts = list.map((t, i) => t.pt ? i : -1).filter(i => i >= 0),
    first = pts[0],
    last = pts.at(-1),
    out = [];
  list.forEach((t, i) => {
    const prev = list[i - 1];
    if (dct && t.pt && prev?.pt && i - 1 !== first && i !== last) out.push('DCT');
    out.push(t.pt ? pointWord(t.pt) : t.keep);
  });
  return out.filter(Boolean).join(' ');
}

/** Les mots d'un texte de route, en majuscules (DCT gardé : le texte est réécrit tel quel, à ses procédures près). */
const wordsOf = text => String(text || '').toUpperCase().split(/\s+/).filter(Boolean);
/** Le nom d'un point dans un mot (« LMG/F280 » → « LMG »). */
const bareWord = w => w.split('/')[0];

/** Les procédures nommées dans un texte de route (V3 § 10.31, relecture d'un texte édité) : { sid, star }, le nom (en majuscules)
 *  de la première SID du départ et de la dernière STAR de l'arrivée que le texte nomme, null sinon. o : { sidNames, starNames }
 *  (les noms des SID de route.dep et des STAR de route.arr, n'importe quelle casse). */
export function proceduresOfText(text, o = {}) {
  const w = wordsOf(text).map(bareWord),
    sids = new Set([...(o.sidNames || [])].map(x => String(x).toUpperCase())),
    stars = new Set([...(o.starNames || [])].map(x => String(x).toUpperCase()));
  return {
    sid: w.find(x => sids.has(x)) || null,
    star: [...w].reverse().find(x => stars.has(x)) || null
  };
}

/** Le texte de route avec les procédures du choix (V3 § 10.31, rendu) : les noms de SID et de STAR des deux terrains retirés, puis
 *  le nom de la SID après le départ suivi de sa sortie, l'entrée de la STAR puis son nom avant l'arrivée. La sortie (l'entrée) n'est
 *  écrite que si aucun point de la procédure n'est déjà dans le texte (la jonction se fait alors au premier point commun). o : { dep,
 *  arr, sid, star (noms ou rien), exit, entry (identifiants), sidPoints, starPoints (identifiants des points de la procédure choisie),
 *  sidNames, starNames }. Rend { text, exitAdded, entryAdded, next } : next, le premier point de route après la sortie ajoutée
 *  (« LACOU7B sort à LACOU : LACOU DCT LMG »). Les DCT sont ceux du texte (la normalisation les repose). */
export function withProcedures(text, o = {}) {
  const up = x => String(x ?? '').toUpperCase(),
    names = new Set([...(o.sidNames || []), ...(o.starNames || []), o.sid, o.star].filter(Boolean).map(up)),
    w = wordsOf(text).filter(x => !names.has(bareWord(x))),
    dep = up(o.dep),
    arr = up(o.arr),
    has = (ids, from = 0, to = w.length) => [...(ids || [])].map(up).some(id => w.slice(from, to).some(x => bareWord(x) === id));
  let exitAdded = false,
    entryAdded = false,
    next = null;
  if (o.star) {
    let at = arr && bareWord(w.at(-1) || '') === arr ? w.length - 1 : w.length;
    if (o.entry && !has(o.starPoints?.length ? o.starPoints : [o.entry])) {
      w.splice(at++, 0, up(o.entry));
      entryAdded = true;
    }
    w.splice(at, 0, up(o.star));
  }
  if (o.sid) {
    let at = dep && bareWord(w[0] || '') === dep ? 1 : 0;
    w.splice(at++, 0, up(o.sid));
    if (o.exit && !has(o.sidPoints?.length ? o.sidPoints : [o.exit], at)) {
      w.splice(at++, 0, up(o.exit));
      exitAdded = true;
      const rest = w.slice(at).filter(x => x !== 'DCT');
      next = rest.length && bareWord(rest[0]) !== arr && !names.has(bareWord(rest[0])) ? bareWord(rest[0]) : null;
    }
  }
  return {
    text: w.join(' '),
    exitAdded,
    entryAdded,
    next
  };
}

/** Distance approchée (NM) entre deux points. */
const nm = (a, b) => {
  const k = Math.cos((+a.lat + +b.lat) / 2 * Math.PI / 180);
  return Math.hypot((+a.lat - +b.lat) * 60, (+a.lon - +b.lon) * 60 * k);
};

/** Texte refait depuis des points (voir l'en-tête). */
export function textFromPoints(points, previousText = '', previousPoints = null) {
  const pts = (points || []).filter(Boolean),
    ids = new Set(pts.map(p => String(p.id || '').toUpperCase())),
    prevPos = previousPoints ? new Map(previousPoints.filter(Boolean).map(p => [String(p.id || '').toUpperCase(), p])) : null,
    toks = tokenize(previousText).filter(t => t.kind !== 'group'),
    // dans l'ancien texte : un point est un identifiant ou des coordonnées qui ne sont pas des mots à garder
    isPoint = t => t.kind === 'coord' || (t.kind === 'name' && (!t.airway || ids.has(t.id) || prevPos?.has(t.id))),
    between = new Map();
  let last = null,
    kept = [];
  for (const t of toks) {
    if (isPoint(t)) {
      if (last && kept.length) between.set(`${last}>${t.id}`, kept);
      last = t.id;
      kept = [];
    } else kept.push(t.id);
  }
  const prevIds = new Set(toks.filter(isPoint).map(t => t.id)),
    unchanged = p => {
      const id = String(p.id || '').toUpperCase();
      if (!prevIds.has(id)) return false;
      if (!prevPos) return true;
      const q = prevPos.get(id);
      return !!q && nm(p, q) <= .5;
    };
  const out = [];
  pts.forEach((p, i) => {
    if (i) {
      const a = pts[i - 1],
        key = `${String(a.id || '').toUpperCase()}>${String(p.id || '').toUpperCase()}`;
      if (between.has(key) && unchanged(a) && unchanged(p)) out.push(...between.get(key));
    }
    out.push(pointWord(p));
  });
  return out.join(' ');
}

/** Niveau ou altitude d'un vol (voir l'en-tête) ; chaîne vide sans valeur. */
export function formatLevel(ft, transitionFt = 5000) {
  if (!Number.isFinite(+ft) || ft === null || ft === '') return '';
  const v = Math.round(+ft / 100) * 100;
  if (v >= (+transitionFt || 5000)) return `FL${String(v / 100).padStart(3, '0')}`;
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')} ft`;
}
