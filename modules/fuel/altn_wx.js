// V3 fuel — la météo d'un dégagement, ses lignes (SOG-0559, SOG-0660) : sous la ligne du dégagement, la cause d'une météo non jugée et
// l'observation du METAR. Sorti de module.js (règle « on extrait ce qu'on touche », SOG-0660), sans changer le comportement. Ce fichier ne
// lit ni n'écrit rien.
//
// API : wxLine(c, id, h) → le HTML de la ligne, ou « » ; c : le critère météo (altn_check.js weatherOf) ; h = { busy (une lecture en
//   cours ou en échec : le repli le dit), metar (le METAR du terrain, ou null), station(metar) (weather.js station), tt, TX (les textes de
//   module.js : altnWxObs, altnWxNoTime, altnWxOutside, altnWxNoCat, altnWxNoTaf, altnWxNone), esc }.

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
