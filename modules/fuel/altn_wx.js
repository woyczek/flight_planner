// V3 fuel — la météo d'un dégagement, ses lignes (SOG-0559, SOG-0660) : sous la ligne du dégagement, la cause d'une météo non jugée et
// l'observation du METAR. Sorti de module.js (règle « on extrait ce qu'on touche », SOG-0660), sans changer le comportement. Ce fichier ne
// lit ni n'écrit rien.
//
// API : wxLine(c, id, h) → le HTML de la ligne, ou « » ; c : le critère météo (altn_check.js weatherOf) ; h = { busy (une lecture en
//   cours ou en échec : le repli le dit), metar (le METAR du terrain, ou null), station(metar) (weather.js station), tt, TX (les textes de
//   module.js : altnWxObs, altnWxNoTime, altnWxOutside, altnWxNoCat, altnWxNoTaf, altnWxNone), esc }.
//   tafFold(taf, esc) → SOG-0660 : le texte du TAF d'un terrain proposé, replié sous sa ligne (« TAF », aucune phrase), ou « » sans texte
//   lu ; CSS : son style, posé par module.js.
//   signSay(sign, why, p, h) → SOG-0690 : les mots du signe d'une ligne proposée (« Possible. », « Possible avec réserve(s) : … »,
//   « Non jugé : … », SOG-0702 « Impossible : … ») ; why : ses codes de réserve (altn_check.js proposalOf, plus « wx-lifr » pour
//   « ✕ ») ; p : son état (crits, wxv, miss) ;
//   h = { tt, TX (les textes de module.js : altnPropWhy, altnWhy.wxUnreachable) } ; TX : ses textes, français seul (SOG-0680).

export const TX = {
  // SOG-0690 (l'ergonome, 27/11) : chaque signe a ses mots, juste après le code du terrain, une seule fois ; le pluriel en clair
  sayOk: ['Possible.'],
  sayWarn: ['Possible avec réserve : {r}.'],
  sayWarns: ['Possible avec réserves : {r}.'],
  sayGrey: ['Non jugé : {r}.'],
  sayGrey0: ['Non jugé.'],
  // SOG-0702 (l'ergonome, 28/11) : « ✕ » par la même règle — sa cause seule, jamais une réserve d'un terrain possible
  sayErr: ['Impossible : {r}.'],
  sayErr0: ['Impossible.'],
  // les causes de SOG-0559 (la ligne du dégagement choisi), sans le code du terrain
  cNoTaf: ['pas de TAF'],
  cNoTime: ['la durée du vol est inconnue'],
  cOutside: ['l’arrivée ({at}) est hors de la validité du TAF'],
  cNoCat: ['le TAF ne donne pas de catégorie à l’heure d’arrivée'],
  cNoKey: ['TAF indisponible sur cet appareil']
};

/** SOG-0559 (l'ergonome, choix a) : la ligne d'une météo de dégagement non jugée — sa cause (pas de TAF ; sans date de vol ; arrivée
 *  hors de la validité du TAF ; pas de catégorie à l'heure d'arrivée), puis, quand un METAR existe, son observation « METAR de 14:20Z :
 *  VFR. » (la catégorie de l'observation, jamais celle du jugement : la pastille reste « ? ») ; sans METAR non plus : « ni TAF ni METAR ».
 *  '' pour une lecture en cours ou en échec (le repli le dit, SOG-0527 (2)) et pour une cause hors de ces cas. */
export function wxLine(c, id, h) {
  if (h.busy) return '';
  const m = h.metar,
    st = m ? h.station(m) : null,
    t = +m?.obsTime > 0 ? `${new Date(+m.obsTime * 1000).toISOString().slice(11, 16)}Z` : '',
    obs = st?.cat && t ? h.tt(h.TX.altnWxObs, {
      t,
      c: st.cat
    }) : '',
    row = {
      wxNoTime: h.TX.altnWxNoTime,
      wxOutside: h.TX.altnWxOutside,
      wxNoCat: h.TX.altnWxNoCat,
      wxNoTaf: obs ? h.TX.altnWxNoTaf : h.TX.altnWxNone,
      wxNoKey: obs ? h.TX.altnWxNoTaf : h.TX.altnWxNone
    } [c.code];
  if (!row) return '';
  const text = h.tt(row, {
    ad: id,
    at: c.v?.at || ''
  }) + (row === h.TX.altnWxNone || !obs ? '' : ` ${obs}`);
  return `<p class="f-muted fu-altnwx" data-altnwx>${h.esc(text)}</p>`;
}

const CAUSE = {
  'wx-notaf': 'cNoTaf',
  'wx-notime': 'cNoTime',
  'wx-outside': 'cOutside',
  'wx-nocat': 'cNoCat'
};

/** SOG-0690 : les mots d'une réserve ou d'une cause (un code de proposalOf) — la cause de SOG-0559 pour la météo, sinon le mot court de
 *  module.js (TX.altnPropWhy) ; « météo non lue » suivi de sa raison entre parenthèses. */
function wordOf(w, p, h) {
  if (CAUSE[w]) return h.tt(TX[CAUSE[w]], p.wxv || {});
  const head = h.TX.altnPropWhy?.[w] ? h.tt(h.TX.altnPropWhy[w]) : '';
  if (w !== 'wx-unread' || !head) return head;
  const why = p.miss ? h.tt(h.TX.altnWhy.wxUnreachable) : p.crits?.[2]?.code === 'wxNoKey' ? h.tt(TX.cNoKey) : '';
  return why ? `${head} (${why})` : head;
}

/** SOG-0702 : les codes qui font « ✕ » (un critère en échec : la météo LIFR) — les seuls que « Impossible » dit. */
const ERR_WHY = ['wx-lifr'];

/** SOG-0690 (l'ergonome, 27/11) : les mots du signe d'une ligne proposée (voir l'en-tête) ; SOG-0702 : « ✕ » dit sa cause. */
export function signSay(sign, why, p, h) {
  const list = Array.isArray(why) ? why : [],
    words = l => l.map(w => wordOf(w, p || {}, h)).filter(Boolean),
    r = words(list);
  if (sign === 'ok') return h.tt(TX.sayOk);
  if (sign === 'warn') return r.length ? h.tt(r.length > 1 ? TX.sayWarns : TX.sayWarn, {
    r: r.join(', ')
  }) : h.tt(TX.sayOk);
  if (sign === 'grey') return r.length ? h.tt(TX.sayGrey, {
    r: r.join(', ')
  }) : h.tt(TX.sayGrey0);
  if (sign === 'err') {
    const e = words(list.filter(w => ERR_WHY.includes(w)));
    return e.length ? h.tt(TX.sayErr, {
      r: e.join(', ')
    }) : h.tt(TX.sayErr0);
  }
  return '';
}

/** SOG-0660 : le style du repli du TAF — une ligne entière sous celle du terrain (la ligne est en flex), le texte coupé où il faut. */
export const CSS = `[data-module="fuel"] .fu-altnprop li{flex-wrap:wrap}
[data-module="fuel"] .fu-altnprop li>span:nth-child(2){flex-basis:0}
[data-module="fuel"] .fu-candtaf{flex-basis:100%;box-sizing:border-box;min-width:0;padding-left:22px}
[data-module="fuel"] .fu-candtaf>p{margin:2px 0;overflow-wrap:anywhere;font-family:var(--sog-mono,ui-monospace,monospace)}`;

/** SOG-0660 : le texte brut d'un TAF (rawTAF, une entrée non fiable) — une ligne, sans signe de contrôle, 1 200 signes au plus. */
const rawOf = v => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200) : '';

/** SOG-0660 (le relais, par le précédent de SOG-0559) : sous la ligne d'un terrain proposé, le texte de son TAF, replié (fermé d'abord),
 *  posé par esc ; « » sans texte lu. */
export function tafFold(taf, esc) {
  const raw = rawOf(taf?.rawTAF);
  return raw ? `<details class="fu-faultmore fu-candtaf" data-candtaf><summary class="f-muted">TAF</summary><p class="f-muted" data-tafraw>${esc(raw)}</p></details>` : '';
}
