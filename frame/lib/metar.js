// V3 frame/lib (propriétaire : fuel ; carte et compte rendu peuvent s'en servir) — lecture des messages météo hors du
// lanceur, vers la forme JSON d'aviationweather.gov que lit modules/fuel/weather.js : METAR brut (metar.vatsim.net,
// texte, plusieurs terrains par appel) et METAR / TAF décodés d'avwx.rest. Code pur : ni page, ni stockage, ni réseau.
//
// API :
//   decodeMetar(raw, now) → { icaoId, obsTime (s), wdir (° | 'VRB'), wspd, wgst (kt), visib (SM, « 6+ » au-delà de 6),
//     clouds [{ cover, base (ft), type }], vertVis (ft), wxString, temp, dewp (°C), altim (hPa), fltCat, rawOb } ;
//     null si ce n'est pas un METAR. now (ms, défaut Date.now()) date le jour et l'heure du message.
//   decodeMetars(text, now) → [METAR décodés] : une ligne par message (réponse de metar.vatsim.net).
//   fromAvwxMetar(json) → même forme ; fromAvwxTaf(json) → { icaoId, validTimeFrom, validTimeTo, rawTAF,
//     fcsts [{ timeFrom, timeTo, fcstChange, probability, wdir, wspd, wgst, visib, clouds, vertVis, wxString }] }.
//   category(ceilFt, visSm, plus) → 'LIFR' | 'IFR' | 'MVFR' | 'VFR' | '' (règles de la FAA, comme weather.js).

const KT_PER_MPS = 1.943844,
  KT_PER_KMH = 0.539957,
  M_PER_SM = 1609.344,
  HPA_PER_INHG = 33.8639;
/** Groupes de temps présent (intensité, descripteur, phénomènes). */
const WX =
  /^(\+|-|VC)?(MI|PR|BC|DR|BL|SH|TS|FZ)?((DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+)$|^(\+|-|VC)?(TS|SH)$/;

/** Catégorie de vol : LIFR (plafond < 500 ft ou visibilité < 1 SM), IFR (< 1 000 ft ou < 3 SM), MVFR (≤ 3 000 ft ou
 *  ≤ 5 SM), sinon VFR ; '' sans aucune donnée. */
export function category(ceilFt, visSm, plus = false) {
  if (ceilFt == null && visSm == null) return '';
  if ((ceilFt != null && ceilFt < 500) || (visSm != null && visSm < 1)) return 'LIFR';
  if ((ceilFt != null && ceilFt < 1000) || (visSm != null && visSm < 3)) return 'IFR';
  if ((ceilFt != null && ceilFt <= 3000) || (visSm != null && visSm <= 5 && !plus)) return 'MVFR';
  return 'VFR';
}
/** Plafond (ft) : la plus basse couche BKN ou OVC, sinon la visibilité verticale ; null sans plafond. */
const ceilingOf = (clouds, vv) => {
  const c = clouds.filter(x => /^(BKN|OVC)$/.test(x.cover) && x.base != null).map(x => x.base);
  return c.length ? Math.min(...c) : vv ?? null;
};
/** Visibilité en SM pour la forme JSON : « 6+ » à 6 SM et plus (9999 m compris), sinon arrondie au centième. */
const visOut = sm => sm == null ? null : sm >= 6 ? '6+' : Math.round(sm * 100) / 100;
/** Heure du message (s) : jour et heure UTC du groupe JJHHMMZ, dans le mois de now ou le précédent s'il est à venir. */
function obsTime(dd, hh, mm, now) {
  const n = new Date(now);
  let t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), dd, hh, mm);
  if (t > now + 36e5) t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, dd, hh, mm);
  return Math.round(t / 1000);
}
/** Vitesse en kt d'une unité de METAR. */
const toKt = (v, unit) => v == null ? null : Math.round(unit === 'MPS' ? v * KT_PER_MPS : unit === 'KMH' ? v * KT_PER_KMH : v);

/** METAR brut → forme JSON d'aviationweather ; null si le texte n'en est pas un. S'arrête aux tendances (TEMPO, BECMG,
 *  NOSIG) et aux remarques (RMK). */
export function decodeMetar(raw, now = Date.now()) {
  const text = String(raw || '').trim().replace(/=$/, '').replace(/\s+/g, ' ');
  const words = text.split(' ').filter(Boolean);
  let i = 0;
  while (/^(METAR|SPECI)$/.test(words[i])) i++;
  if (!/^[A-Z][A-Z0-9]{3}$/.test(words[i] || '')) return null;
  const out = {
    icaoId: words[i++],
    obsTime: null,
    wdir: null,
    wspd: null,
    wgst: null,
    visib: null,
    clouds: [],
    vertVis: null,
    wxString: '',
    temp: null,
    dewp: null,
    altim: null,
    fltCat: '',
    rawOb: text
  };
  const wx = [];
  let visSm = null,
    cavok = false;
  for (; i < words.length; i++) {
    const w = words[i];
    let m;
    if (/^(TEMPO|BECMG|NOSIG|RMK)$/.test(w)) break;
    if (/^(COR|AUTO|NIL)$/.test(w)) continue;
    if ((m = /^(\d{2})(\d{2})(\d{2})Z$/.exec(w))) out.obsTime = obsTime(+m[1], +m[2], +m[3], now);
    else if ((m = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/.exec(w))) {
      out.wdir = m[1] === 'VRB' ? 'VRB' : +m[1];
      out.wspd = toKt(+m[2], m[4]);
      out.wgst = m[3] ? toKt(+m[3], m[4]) : null;
    } else if (/^\d{3}V\d{3}$/.test(w)) continue; // secteur de vent variable
    else if (w === 'CAVOK') {
      cavok = true;
      visSm = 10;
    } else if ((m = /^(\d{4})(NDV|[NSEW]{1,2})?$/.exec(w)) && out.wspd != null && visSm == null) visSm = +m[1] >= 9999 ? 10 : +m[1] /
      M_PER_SM;
    else if ((m = /^(P|M)?(\d+)?(?:(\d)\/(\d))?SM$/.exec(w))) {
      // visibilité US : « 10SM », « 1/2SM », « P6SM », « M1/4SM »
      const whole = m[2] && !m[3] ? +m[2] : 0,
        frac = m[3] ? +m[3] / +m[4] : 0;
      visSm = (m[2] && m[3] ? +m[2] : whole) + frac + (m[1] === 'P' ? 0.01 : 0);
    } else if (/^\d$/.test(w) && /^\d\/\dSM$/.test(words[i + 1] || '')) {
      // « 1 1/2SM » : le nombre entier d'abord
      const f = /^(\d)\/(\d)SM$/.exec(words[++i]);
      visSm = +w + +f[1] / +f[2];
    } else if (/^R\d{2}[LRC]?\//.test(w)) continue; // portée visuelle de piste
    else if ((m = /^(FEW|SCT|BKN|OVC)(\d{3}|\/{3})(CB|TCU|\/{3})?$/.exec(w))) out.clouds.push({
      cover: m[1],
      base: /\d/.test(m[2]) ? +m[2] * 100 : null,
      ...(m[3] && m[3] !== '///' ? {
        type: m[3]
      } : {})
    });
    else if ((m = /^VV(\d{3}|\/{3})$/.exec(w))) out.vertVis = /\d/.test(m[1]) ? +m[1] * 100 : null;
    else if (/^(NSC|NCD|SKC|CLR)$/.test(w)) continue;
    else if ((m = /^(M?\d{2})\/(M?\d{2})?$/.exec(w))) {
      const c = s => s ? (s[0] === 'M' ? -1 : 1) * +s.replace('M', '') : null;
      out.temp = c(m[1]);
      out.dewp = c(m[2]);
    } else if ((m = /^Q(\d{4})$/.exec(w))) out.altim = +m[1];
    else if ((m = /^A(\d{4})$/.exec(w))) out.altim = Math.round(+m[1] / 100 * HPA_PER_INHG * 10) / 10;
    else if (/^RE/.test(w) || /^WS$/.test(w)) continue; // temps récent, cisaillement
    else if (WX.test(w)) wx.push(w);
  }
  out.visib = visOut(visSm);
  out.wxString = cavok ? '' : wx.join(' ');
  out.fltCat = category(ceilingOf(out.clouds, out.vertVis), visSm == null ? null : Math.min(visSm, 10), visSm != null && visSm >= 6);
  return out;
}
/** Réponse texte de metar.vatsim.net (une ligne par terrain) → METAR décodés, lignes illisibles écartées. */
export const decodeMetars = (text, now = Date.now()) => String(text || '').split(/\r?\n/).map(l => decodeMetar(l, now))
  .filter(Boolean);

// ---------------------------------------------------------------- avwx.rest (JSON décodé)
/** Valeur d'un champ avwx ({ value, repr }) ou nombre ; null sinon. */
const val = x => x == null ? null : typeof x === 'object' ? x.value ?? null : x;
/** Heure avwx ({ dt: ISO }) → secondes ; null sinon. */
const secs = x => {
  const t = Date.parse(x?.dt || x || '');
  return Number.isFinite(t) ? Math.round(t / 1000) : null;
};
/** Partie commune d'un METAR ou d'une ligne de TAF avwx, selon ses unités : vent, visibilité, nuages, temps présent. */
function avwxCore(j, units = {}) {
  const vu = String(units.visibility || 'm').toLowerCase(),
    su = String(units.wind_speed || 'kt').toUpperCase(),
    v = val(j.visibility),
    visRepr = String(j.visibility?.repr || ''),
    sm = v == null ? (/CAVOK|P6SM|9999/.test(visRepr) ? 10 : null) : vu === 'sm' ? +v : +v / M_PER_SM,
    dir = j.wind_direction?.repr === 'VRB' ? 'VRB' : val(j.wind_direction),
    clouds = (j.clouds || []).map(c => ({
      cover: c.type,
      base: Number.isFinite(+c.altitude) ? +c.altitude * 100 : null,
      ...(c.modifier ? {
        type: c.modifier
      } : {})
    })).filter(c => /^(FEW|SCT|BKN|OVC)$/.test(c.cover)),
    vv = (j.clouds || []).find(c => c.type === 'VV');
  return {
    wdir: dir,
    wspd: toKt(val(j.wind_speed), su === 'M/S' || su === 'MPS' ? 'MPS' : su === 'KM/H' || su === 'KMH' ? 'KMH' : 'KT'),
    wgst: toKt(val(j.wind_gust), su === 'M/S' || su === 'MPS' ? 'MPS' : su === 'KM/H' || su === 'KMH' ? 'KMH' : 'KT'),
    visSm: sm != null && /^P/.test(visRepr) ? Math.max(sm, 6) : sm,
    clouds,
    vertVis: vv && Number.isFinite(+vv.altitude) ? +vv.altitude * 100 : null,
    wxString: (j.wx_codes || []).map(c => c.repr).filter(Boolean).join(' ')
  };
}
/** METAR décodé par avwx (GET /api/metar/<ICAO>) → forme JSON d'aviationweather. */
export function fromAvwxMetar(j) {
  if (!j || !j.station) return null;
  const c = avwxCore(j, j.units),
    alt = val(j.altimeter),
    au = String(j.units?.altimeter || 'hPa').toLowerCase();
  return {
    icaoId: String(j.station).toUpperCase(),
    obsTime: secs(j.time),
    wdir: c.wdir,
    wspd: c.wspd,
    wgst: c.wgst,
    visib: visOut(c.visSm),
    clouds: c.clouds,
    vertVis: c.vertVis,
    wxString: c.wxString,
    temp: val(j.temperature),
    dewp: val(j.dewpoint),
    altim: alt == null ? null : au === 'inhg' ? Math.round(alt * HPA_PER_INHG * 10) / 10 : +alt,
    fltCat: j.flight_rules || category(ceilingOf(c.clouds, c.vertVis), c.visSm, c.visSm != null && c.visSm >= 6),
    rawOb: j.raw || ''
  };
}
/** TAF décodé par avwx (GET /api/taf/<ICAO>) → forme JSON d'aviationweather : la première ligne est le groupe de base
 *  (sans changement), FROM → FM, BECMG, TEMPO, PROB (probabilité gardée), INTER → TEMPO. */
export function fromAvwxTaf(j) {
  if (!j || !j.station) return null;
  return {
    icaoId: String(j.station).toUpperCase(),
    validTimeFrom: secs(j.start_time),
    validTimeTo: secs(j.end_time),
    rawTAF: j.raw || '',
    fcsts: (j.forecast || []).map((f, i) => {
      const c = avwxCore(f, j.units),
        type = String(f.type || '').toUpperCase();
      return {
        timeFrom: secs(f.start_time),
        timeTo: secs(f.end_time),
        fcstChange: i === 0 ? null : type === 'FROM' ? 'FM' : type === 'INTER' ? 'TEMPO' : type === 'PROB' ? 'PROB' : type || null,
        probability: val(f.probability),
        wdir: c.wdir,
        wspd: c.wspd,
        wgst: c.wgst,
        visib: visOut(c.visSm),
        clouds: c.clouds,
        vertVis: c.vertVis,
        wxString: c.wxString
      };
    })
  };
}
