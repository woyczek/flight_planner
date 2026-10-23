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
//   textFromTokens(tokens) : texte normalisé de jetons { pt: point } | { keep: mot } (une ligne).
//   textFromPoints(points, previousText, previousPoints) : texte refait depuis les points ; entre deux points
//     consécutifs inchangés qui se suivaient déjà dans previousText, les mots qui les séparaient (voie, procédure) sont
//     gardés ; ailleurs, rien (direct). Inchangé : même identifiant, et même position à 0,5 NM près si previousPoints
//     est donné. Niveaux en /Fnnn d'après alt_ft ; coordonnées OACI pour un point sans nom utilisable.
//   icaoCoord(lat, lon) : « 4530N00030E » (degrés et minutes).

const COORD = /^([A-Z0-9]{2,7})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\/(?:[NKM]\d{3,4})?F(\d{3}))?/i,
  ICAO_LL = /^(\d{2})(\d{2})?([NS])(\d{3})(\d{2})?([EW])$/,
  NUM = /^-?\d+(?:\.\d+)?$/,
  GROUP = /^[NKM]\d{3,4}([FASM]\d{3,4})?$/,
  AIRWAY = /^[A-Z]{1,2}\d{1,4}[A-Z]?$/,
  PROC = /\d[A-Z]$/,
  NAME = /^[A-Z0-9]{2,7}$/;

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

/** Texte normalisé de jetons { pt } | { keep } : une ligne. */
export const textFromTokens = tokens => (tokens || []).map(t => t.pt ? pointWord(t.pt) : t.keep).filter(Boolean).join(' ');

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
