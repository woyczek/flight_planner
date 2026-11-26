// V3 fuel — le texte de route qui suit le choix des procédures (V3 § 10.31) : la SID et sa sortie après le départ, l'entrée et la STAR
// avant l'arrivée, et la relecture d'un texte édité par le pilote qui pose ou retire la SID, la STAR et les pistes. Sorti de module.js
// (règle « on extrait ce qu'on touche », SOG-0655), sans changer le comportement.
//
// API : sameRoute(a, b) (pur) ; create(host) → { chosenProcNames, procsToText(say), textToProcs } avec
//   host = { state() (l'état du montage, S de module.js), tt, TX (les textes de module.js), resolveRoute(normalize), withRwys(text) }.
import * as CF from '../../frame/lib/current_flight.js';
import * as PR from '../../frame/lib/procedures.js';
import * as RT from '../../frame/lib/route_text.js';

/** Même texte de route, aux « DCT » et à la casse près. */
export const sameRoute = (a, b) => [a, b].map(t => String(t || '').toUpperCase().split(/\s+/).filter(w => w && w !== 'DCT').join(' '))
  .reduce((x,
      y) =>
    x === y);
/** Le texte de route suit le choix des procédures (RT.withProcedures) : le nom de la SID et sa sortie après le départ, l'entrée et le
 *  nom de la STAR avant l'arrivée ; jamais l'approche (elle n'est pas un élément du plan de vol). La sortie (l'entrée) n'est écrite
 *  que si aucun point de la procédure n'est déjà dans la route ; quand elle l'est et que say est vrai, une ligne dit la jonction par
 *  un direct (« NTS1A sort à NT102 : NT102 DCT LUGEN »). Rien tant que les fiches ne sont pas lues, ni pendant la frappe dans le
 *  champ, ni quand le texte est déjà le bon. */

/** Les gestes du texte de route suivi des procédures, liés au montage de Carburant (voir l'en-tête). */
export function create(host) {
  const {
    tt,
    TX
  } = host;
  /** SOG-0372 (c) : les noms (indicatif compact, « PARCH4 ») de la SID et de la STAR choisies dans Procédures, pour que le champ Route
   *  les garde comme procédures ; la fiche lue quand le modèle des procédures l'a, sinon le nom tiré de l'identifiant. [] sans choix. */
  function chosenProcNames() {
    const S = host.state();
    const o = CF.proceduresOf(S?.flight || {}),
      recs = S?.P?.textModel?.()?.recs,
      nm = id => typeof id === 'string' && id ? RT.compactName(PR.nameOf(recs?.get?.(id) || null, id)) : '';
    return [nm(o.dep?.sid), nm(o.arr?.star)].filter(Boolean);
  }

  /** Rend vrai quand le texte a changé et que la route est relue (resolveRoute écrit alors le vol). */
  function procsToText(say) {
    const S = host.state();
    const m = S?.P?.textModel?.(),
      r = S?.flight?.route,
      ta = S?.body?.querySelector('[data-k="rtext"]');
    if (!m || !r || (ta && document.activeElement === ta)) return;
    // SOG-0517 : le texte d'un itinéraire pris porte déjà la SID et la STAR du moteur, à leur place : il n'est pas réécrit (les points que
    // la procédure couvre en disparaissaient, « LUGEN UN10 »)
    if (r.from === 'engine') return;
    const o = CF.proceduresOf(S.flight),
      rec = id => typeof id === 'string' ? m.recs.get(id) || null : null,
      name = (id, x) => typeof id === 'string' ? RT.compactName(PR.nameOf(x, id)) || null : null,
      sid = rec(o.dep?.sid),
      sidT = rec(o.dep?.trans),
      star = rec(o.arr?.star),
      starT = rec(o.arr?.trans),
      sidName = name(o.dep?.sid, sid),
      // la sortie et l'entrée de la règle commune avec « Auto » (PR.endsOf, refonte § 10.33 R-F4b) ; le texte juge seul s'il les écrit
      ends = PR.endsOf({
        sid,
        sidTrans: sidT,
        star,
        starTrans: starT
      }, [], r),
      exit = ends.exit?.id || null,
      // SOG-0655 : la sortie (l'entrée) que la suite a écrite pour une SID (une STAR) d'avant est retirée quand la procédure change — seule
      // celle de la procédure choisie reste ; un point que le pilote a tapé n'est jamais retiré (route.procWords : les mots écrits par la suite)
      pw = r.procWords && typeof r.procWords === 'object' ? r.procWords : {},
      stale = [pw.exit && pw.exit !== exit ? pw.exit : null, pw.entry && pw.entry !== (ends.entry?.id || null) ? pw.entry : null].filter(
        w => typeof w === 'string' && /^[A-Z0-9]{2,7}$/.test(w)),
      base = stale.length ? String(r.text || '').split(/\s+/).filter(w => !stale.includes(w.toUpperCase().split('/')[0])).join(' ') : r
      .text || '',
      res = RT.withProcedures(base, {
        dep: r.dep,
        arr: r.arr,
        sid: sidName,
        star: name(o.arr?.star, star),
        exit,
        entry: ends.entry?.id || null,
        sidPoints: [...PR.pointsOf(sid), ...PR.pointsOf(sidT)],
        starPoints: [...PR.pointsOf(starT), ...PR.pointsOf(star)],
        sidNames: [...m.sid.keys()],
        starNames: [...m.star.keys()]
      });
    const text = host.withRwys(res.text); // SOG-0089 : la piste choisie après le terrain
    // SOG-0655 : les mots que la suite vient d'écrire (gardés pour être retirés si la procédure change), ceux d'avant gardés tant qu'ils tiennent
    const words = {
      exit: res.exitAdded ? exit : pw.exit === exit ? pw.exit : null,
      entry: res.entryAdded ? ends.entry?.id || null : pw.entry === (ends.entry?.id || null) ? pw.entry : null
    };
    if (words.exit || words.entry) r.procWords = Object.fromEntries(Object.entries(words).filter(([, v]) => v));
    else delete r.procWords;
    if (sameRoute(text, r.text)) return;
    r.text = text;
    r.from = 'route';
    if (ta) ta.value = r.text;
    host.resolveRoute(true); // relu et normalisé (forme OACI, « DCT »), écrit, devis refait
    if (say && res.exitAdded && res.next) S.ctx.notify(tt(TX.procExitDct, {
      sid: sidName,
      exit,
      next: res.next
    }), 'ok');
    return true;
  }
  /** Relecture d'un texte de route que le pilote a édité (V3 § 10.31) : le premier nom d'une SID de route.dep pose cette SID (la fiche
   *  qui dessert la piste choisie, sinon la première), le dernier nom d'une STAR de route.arr pose cette STAR ; l'absence du nom d'une
   *  procédure choisie la retire (« Aucune » reste « Aucune ») ; un mot inconnu reste un point nommé (la ligne des points non reconnus le
   *  dit). Le choix passe par le même chemin qu'une liste de la carte des procédures ; sans changement, le texte reprend sa forme. */
  function textToProcs() {
    const S = host.state();
    const m = S.P?.textModel?.(),
      r = S.flight?.route;
    if (!m || !r) return;
    let o = CF.proceduresOf(S.flight);
    // SOG-0089 : « LFPO/07 » (premier mot) et « LFML/31R » (dernier) posent la piste de leur côté, d'abord (la SID suit la piste) ; une
    // piste que le terrain n'a pas est dite, rien n'est choisi ; le terrain écrit sans la piste choisie la retire (une seule
    // règle pour ce que porte le texte ; un texte d'avant ce lot est refait à l'ouverture : rwyTextSync)
    const rw = RT.runwaysOfText(r.text, {
      dep: r.dep,
      arr: r.arr
    });
    let rwChanged = false;
    // un groupe vitesse-niveau collé en tête (« N0450F350 LFPO/07 … ») : ignoré, et dit une fois par texte (jamais perdu sans un mot)
    const g = RT.leadingGroup(r.text);
    if (g && S.groupSaid !== r.text) {
      S.groupSaid = r.text;
      S.ctx.notify(tt(TX.groupIgnored, {
        g
      }), 'info');
    }
    for (const side of ['dep', 'arr']) {
      const want = rw[side];
      // le terrain écrit sans sa piste alors qu'une est choisie : le pilote l'a effacée (le texte la porte depuis l'ouverture) : retirée, dit
      if (want === '' && typeof o[side]?.rwy === 'string') {
        S.P.choose(`p-${side}-rwy`, '');
        rwChanged = true;
        S.ctx.notify(tt(TX.rwyRemoved, {
          side: tt(side === 'dep' ? TX.rwySideDep : TX.rwySideArr),
          ad: String(r[side] || '').toUpperCase()
        }), 'info');
        continue;
      }
      if (!want) continue;
      const ids = (side === 'dep' ? m.depRwys : m.arrRwys) || [],
        id = ids.find(x => PR.rwNum(x) === want);
      if (!id) {
        S.ctx.notify(tt(TX.rwyUnknown, {
          ad: String(r[side] || '').toUpperCase(),
          rwy: want
        }), 'warn');
        continue;
      }
      if (PR.rwNum(o[side]?.rwy) !== want) {
        S.P.choose(`p-${side}-rwy`, id);
        rwChanged = true;
      }
    }
    if (rwChanged) o = CF.proceduresOf(S.flight);
    const found = RT.proceduresOfText(r.text, {
        sidNames: [...m.sid.keys()],
        starNames: [...m.star.keys()]
      }),
      nameOf = id => typeof id === 'string' ? RT.compactName(PR.nameOf(m.recs.get(id), id)) : null;
    let changed = false;
    const set = (side, k, byName, want) => {
      const cur = o[side]?.[k];
      if (want && nameOf(cur) !== want) {
        const list = byName.get(want) || [],
          pick = PR.firstServing(list, o[side]?.rwy) || list[0];
        if (pick) {
          S.P.choose(`p-${side}-${k}`, pick.id);
          changed = true;
        }
      } else if (!want && typeof cur === 'string') {
        S.P.choose(`p-${side}-${k}`, '');
        changed = true;
      }
    };
    set('dep', 'sid', m.sid, found.sid);
    set('arr', 'star', m.star, found.star);
    if (!changed && !rwChanged) procsToText(true);
  }
  return {
    chosenProcNames,
    procsToText,
    textToProcs
  };
}
