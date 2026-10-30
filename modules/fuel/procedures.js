// V3 fuel — le bloc « Procédures » de la préparation (V3_SPECIFICATION § 10.20, § 10.23, § 10.29 d et e) : la carte des deux côtés
// (piste, SID, STAR, approche), la ligne « lu le … · Relire », le choix du pilote, la lecture à la demande des procédures d'un
// terrain et ce que « Charger mon OFP » y met. Sorti de module.js : l'écran garde le déroulé des pas, le devis, la progression et
// l'écriture du vol ; ici seulement les procédures choisies et leur affichage.
//
// Interface étroite (createProcedures(host) → api) :
//   host = {
//     ctx,                 contexte du montage (t, notify, aerodb)
//     flight(),            le vol courant (objet remplacé à chaque écriture : toujours relu, jamais gardé)
//     route(),             sa route, créée si le vol n'en a pas encore
//     body(), plan(),      le corps de l'écran (null une fois démonté), vrai si c'est l'écran Devis
//     started(),           le vol est-il démarré
//     key(),               clé des choix et des terrains (procsKey de module.js) : changée, la carte est relue
//     gone(),              le montage a-t-il été démonté ou remplacé
//     pending(),           l'écran attend-il encore le registre des aéronefs et les fiches (le focus ne se pose pas avant)
//     save(),              écrit le vol (saveFlight)
//     settled(),           fin d'une série de choix (400 ms sans nouveau choix) : un seul devis, une seule écriture
//     drop(),              les procédures lues du vol sont périmées (le chemin du devis est à relire)
//     refresh()            redessine l'écran (devis compris)
//   }
//   api = { sync, render, reset, choose, read, onChange, focus, applyFocus, textModel, snapshot, applyOfp, stop }
//
// État : un seul objet par terrain (ads : fiches montrées au dernier dessin, comptes de la dernière lecture). La carte se met à
// jour sur place : quand seules les listes changent, les options des listes existantes sont remplacées, le focus n'est jamais
// déplacé ; la structure n'est refaite que si le terrain, le départ du vol ou la présence d'une liste de transition change.
import * as CF from '../../frame/lib/current_flight.js';
import * as PR from '../../frame/lib/procedures.js';
import * as RT from '../../frame/lib/route_text.js';
import {
  adLabel
} from '../../frame/lib/adnames.js';
import {
  components as windComponents,
  runwayAxis,
  label as windLabel,
  severity as windSeverity,
  LIMITS as WIND_LIMITS
} from '../../frame/lib/wind.js';
import {
  fmtDayZ
} from '../../frame/lib/time.js';
import {
  TX
} from './procedures_texts.js';

/** Champs de chaque côté de route.procedures. */
export const PROC_FIELDS = {
  dep: ['rwy', 'sid', 'trans'],
  arr: ['rwy', 'star', 'trans', 'app', 'appTrans']
};
/** Vrai si un côté de la vue des procédures porte un choix (une piste, une procédure, ou « aucune »). */
export const sideChosen = o => !!o && Object.values(o).some(v => v === null || typeof v === 'string' && v !== '');
/** Un côté sans champ vide : { rwy: '23', sid: null } ; undefined retiré. */
export const cleanSide = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== ''));

/** Marque d'une procédure lue sous un cycle passé (fin de libellé, listes et notifications) : un symbole court plutôt qu'un mot. */
const PROC_OLD = ' ⌛';
/** Marque d'une procédure en conflit avec la piste choisie, après ⌛ : orange, jamais un mot. */
const PROC_CONFLICT = ' ⚠';
/** Délai (ms) sans nouveau choix avant d'écrire le vol et de refaire le devis : des choix faits à la suite sont écrits une fois. */
const SETTLE_MS = 400;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Côté d'une valeur de route.procedures laissée telle quelle : un « aucune » posé sur tout le côté (null) n'est pas changé. */
const keep = x => x === null ? null : cleanSide(x);

/** Lecture de procédures à la demande en cours, hors de l'instance : elle survit au démontage (le travail du poste continue, sa
 *  fin est dite quand même) ; { icao, text (texte du bouton, avancement compris) }. */
let reading = null;
/** L'instance du montage vivant : la fin d'une lecture lui est rendue même si elle a commencé sous un autre montage. */
let live = null;

/** Feuille de style de la carte (ajoutée à celle de module.js) : une grille fixe, la même des deux côtés (sous-grille de la boîte),
 *  piste · procédure · transition, dès 480 px de conteneur (la vue double à 1280 en a environ 515) ; une seule colonne en dessous, ou
 *  quand la grille déborderait (fu-one, posé par fitGrid : « jamais coupé » prime). Une liste est au moins aussi large que son libellé
 *  le plus long (colonnes minmax(max-content, 1fr)) : aucun libellé n'est coupé. */
export const PROC_STYLE = `
[data-module="fuel"] .fu-procbox{display:grid;grid-template-columns:minmax(0,1fr);column-gap:8px;row-gap:4px}
[data-module="fuel"] .fu-proc{display:grid;grid-column:1/-1;grid-template-columns:subgrid;row-gap:2px;align-items:end;margin-top:10px}
[data-module="fuel"] .fu-proc>.fu-proctitle,[data-module="fuel"] .fu-proc>.fu-procmeta{grid-column:1/-1}
/* replié : ni vu ni atteignable au clavier, sans hauteur, mais gardé dans la grille (les colonnes restent celles des deux côtés) */
[data-module="fuel"] .fu-proc.fu-folded>.fu-procmeta,[data-module="fuel"] .fu-proc.fu-folded>.fu-pf{visibility:hidden;height:0;min-height:0;overflow:hidden;margin:0;padding:0}
[data-module="fuel"] .fu-proctitle{cursor:pointer}
/* le nom du terrain reste dans la ligne de résumé, coupé d'une ellipse quand la place manque (téléphone) */
[data-module="fuel"] .fu-proctitle{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:.35em}
[data-module="fuel"] .fu-proctitle>.fu-procsum{flex-basis:100%}
[data-module="fuel"] .fu-procname{min-width:0;max-width:min(40vw,18em);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="fuel"] .fu-procfold{min-width:44px;min-height:44px;padding:0;margin:-12px 0 -12px -12px;border:0;background:none;color:inherit;font:inherit;cursor:pointer;vertical-align:middle}
[data-module="fuel"] .fu-proctitle{font-size:1.05em}
[data-module="fuel"] .fu-procsum{display:block;font-size:.92em;margin-top:2px}
[data-module="fuel"] .fu-procsum>span{display:inline-block;margin-right:1em;white-space:nowrap}
[data-module="fuel"] .fu-procicao{font-weight:600}
[data-module="fuel"] .fu-procmeta{display:flex;flex-wrap:wrap;align-items:center;column-gap:.45em;font-size:.85em}
[data-module="fuel"] .fu-procmeta .fu-linkbtn{margin:-10px 0;padding:0 2px}
[data-module="fuel"] .fu-proc .f-field{margin:6px 0 0;min-width:0}
[data-module="fuel"] .fu-proc select{width:100%;min-width:0}
[data-module="fuel"] .fu-proc option.outdated{color:var(--sog-muted)}
[data-module="fuel"] .fu-proc option.conflict{color:var(--sog-warn,#c2410c)}
[data-module="fuel"] .fu-proc .wind-ok{color:var(--sog-ok)}
[data-module="fuel"] .fu-proc .wind-warn{color:var(--sog-warn)}
[data-module="fuel"] .fu-proc .wind-alert{color:var(--sog-err)}
@container (min-width: 480px){
  [data-module="fuel"] .fu-procbox:not(.fu-one){grid-template-columns:6em minmax(max-content,1fr) minmax(max-content,1fr)}
  [data-module="fuel"] .fu-procbox:not(.fu-one) .fu-pf-rwy{grid-column:1;grid-row:3}
  [data-module="fuel"] .fu-procbox:not(.fu-one) .fu-pf-main{grid-column:2;grid-row:3}
  [data-module="fuel"] .fu-procbox:not(.fu-one) .fu-pf-trans{grid-column:3;grid-row:3}
  [data-module="fuel"] .fu-procbox:not(.fu-one) .fu-pf-app{grid-column:2;grid-row:4}
  [data-module="fuel"] .fu-procbox:not(.fu-one) .fu-pf-apptrans{grid-column:3;grid-row:4}
}
`;

/** Crée le bloc « Procédures » d'un montage de Carburant (voir l'interface en tête de fichier). */
export function createProcedures(host) {
  const ctx = host.ctx,
    /** Texte d'une ligne de TX dans la langue de l'appli. */
    tt = (row, v) => ctx.t(row, v),
    /** État des procédures d'un terrain (un seul objet par OACI) : recs, ses fiches montrées au dernier dessin (par identifiant :
     *  conflits, ordre, ⌛ des notifications) ; stats, les comptes de sa dernière lecture à la demande (fiches douteuses). */
    ads = new Map(),
    /** Ce que chaque élément dessiné montre (région ou liste) : le texte HTML posé, pour ne toucher que ce qui change. */
    painted = new WeakMap();
  let seq = 0, // dernière demande de dessin : seule elle est dessinée
    key = null, // clé de ce que la carte montre (null : à redessiner)
    wantFocus = '', // côté dont la première liste doit prendre le focus dès qu'il est dessiné (« Changer » de la Carte)
    openSide = '', // le côté déplié (§ 10.31 : deux lignes de résumé à l'ouverture, un côté déplié à la fois) ; '' : les deux repliés
    timer = null; // fin de série de choix

  /** État d'un terrain, créé au besoin. */
  function adOf(icao) {
    const k = String(icao || '').trim().toUpperCase();
    if (!ads.has(k)) ads.set(k, {
      icao: k,
      recs: new Map(),
      stats: null
    });
    return ads.get(k);
  }
  /** Les fiches montrées des deux terrains du vol, par identifiant (départ puis arrivée). */
  function recsNow() {
    const r = host.flight()?.route || {};
    return new Map([...(ads.get(String(r.dep || '').toUpperCase())?.recs || []), ...(ads.get(String(r.arr || '').toUpperCase())?.recs ||
    [])]);
  }
  /** Les procédures d'un terrain ont changé (aerodb change { procedures: OACI }, lecture faite) : ses fiches montrées sont oubliées
   *  (les comptes de la lecture restent) ; sans OACI, tous les terrains (données publiées changées). Le dessin suivant relit aerodb.
   *  Vrai si un terrain du vol est touché : ses procédures lues le sont aussi. */
  function dropAd(icao) {
    const r = host.flight()?.route || {},
      k = icao ? String(icao).toUpperCase() : null,
      ours = [r.dep, r.arr].map(x => String(x || '').toUpperCase());
    for (const a of ads.values())
      if (!k || a.icao === k) a.recs = new Map();
    key = null;
    return !k || ours.includes(k);
  }

  // ------------------------------------------------------------ noms et libellés
  /** Nom d'une procédure d'après son identifiant (« LFBD.SID.ROYAN6P.RW23.NONE » → « ROYAN6P ») : PR.displayName, la règle du résumé
   *  (refonte § 10.33 R-F2) ; une finale parmi les lignes d'approche de son terrain. */
  function nameOfId(id, k) {
    const p = String(id || '').split('.'),
      rec = recsNow().get(id),
      finals = rec?.kind === 'APP' ? PR.appChoices([...recsNow().values()].filter(r => r.kind === 'APP' && String(r.id).split('.')[0] ===
        p[0])).list : [];
    // les transitions (k) se nomment par leur fiche quand elle est connue, comme le résumé
    const n = PR.displayName(rec, {
      key: k === 'trans' || k === 'appTrans' ? k : null,
      id,
      finals
    });
    if (n) return n;
    // sans nom dans la source : « STAR sans nom » (la sorte, deuxième champ), pas « NONAME »
    if (p[2] === 'NONAME') return tt(TX.procUnnamed, {
      k: tt({
        SID: TX.procSid,
        STAR: TX.procStar,
        APP: TX.procApp
      } [p[1]] || TX.procStar)
    });
    return p[2] || String(id);
  }
  /** Libellé d'un enregistrement dans une liste : son nom, sa piste seulement quand AUCUNE piste n'est choisie et que la procédure
   *  n'en dessert qu'une que le nom ne dit pas déjà (« MAN1A · 07 » ; « RNP RWY 02 » la porte) — avec une piste choisie, « OPALE 2E »
   *  seul —, « X-Plane, local » pour le repli du poste, puis ⌛ pour une lecture à la main dont le cycle est passé. ⚠ (conflit) est
   *  ajouté par l'appelant, après ⌛. o : le choix courant du côté. */
  function procLabel(rec, o) {
    const name = rec.name || nameOfId(rec.id),
      one = o?.rwy || PR.servesAll(rec) ? [] : [...new Set(rec.runways.map(PR.rwNum))];
    return [name, one.length === 1 && !name.toUpperCase().includes(one[0]) ? one[0] : '', rec.status === 'xplane' || rec.local ? tt(TX
        .procXplane) : '']
      .filter(Boolean).join(' · ') + (rec.outdated ? PROC_OLD : '');
  }
  /** Raisons (textes ×4) pour lesquelles une fiche est en conflit avec le choix courant o du côté ; [] sans conflit. La règle est celle
   *  de PR.conflictsOf (frame/lib/procedures.js, une seule pour Carburant et la Carte, § 10.23) : des données ; ici leurs textes. k :
   *  sid, star, app, trans ou appTrans. */
  function conflictsOf(k, rec, o) {
    return PR.conflictsOf(k, rec, o, recsNow()).map(c => c.kind === 'rwy' ? tt(TX.procConflictRwy, {
      rwy: c.rwy
    }) : tt(TX.procConflictStarApp, {
      app: c.app || nameOfId(c.appId)
    }));
  }
  /** Nom d'une procédure choisie (identifiant) pour une notification, avec ⌛ quand la fiche montrée est périmée et, si le choix o du
   *  côté est donné, ⚠ quand elle est en conflit avec lui. */
  const procNameOf = (id, k, o) => nameOfId(id, k) + (recsNow().get(id)?.outdated ? PROC_OLD : '') + (o && conflictsOf(k, recsNow().get(id),
    o).length ? PROC_CONFLICT : '');
  /** Libellé d'une valeur de route.procedures dans une notification : « — » (pas choisi), « aucune », la piste, ou le nom. */
  const valueText = (v, k, o) => v === undefined ? '—' : v === null ? tt(TX.procNone) : k === 'rwy' ? String(v) : procNameOf(v, k, o);

  // ------------------------------------------------------------ ce que montre un côté
  /** Une question à aerodb, posée à chaque dessin : aerodb est le seul cache (procedures(icao) mémoïsé par révision, V3 § 10.29) ;
   *  [] sans réponse ou en cas d'erreur. */
  const askAero = make => Promise.resolve().then(make).then(v => v || [], () => []);
  /** Pistes à proposer pour un terrain (PR.runwayChoices, règle pure) : l'enregistrement du terrain dans la base (aerodromes({ icao }),
   *  axe de piste) n'est demandé à aerodb que si ni ses pistes ni les noms des fiches n'en donnent. */
  async function runwayChoicesOf(icao, known, all) {
    const first = PR.runwayChoices(known, all, null);
    if (first.length) return first;
    return PR.runwayChoices(known, all, (await askAero(() => ctx.aerodb?.aerodromes?.({
      icao
    })))[0]);
  }
  /** Ce qu'une ligne montre pour un côté : { icao, name, cov, rwys, all, unread, lists: { SID | STAR | APP: [enregistrements] }, nodata } ;
   *  null sans terrain de quatre caractères. Toutes les fiches du terrain sont lues en une fois (all) ; les listes en gardent les sortes
   *  du côté, toutes les fiches, jamais coupées par la piste (une fiche qui ne la dessert pas est marquée ⚠, pas retirée). name : le
   *  nom du terrain d'après aerodb (coords), '' s'il est inconnu. rwys : runwayChoices. nodata : ni fiche (de n'importe quelle sorte)
   *  ni piste d'aerodb. */
  async function sideModel(side) {
    const r = host.flight().route || {},
      icao = String((side === 'dep' ? r.dep : r.arr) || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(icao)) return null;
    const kinds = side === 'dep' ? ['SID'] : ['STAR', 'APP'],
      [known, every, cov, place, cat] = await Promise.all([askAero(() => ctx.aerodb?.runways?.(icao)), askAero(() => ctx.aerodb
          ?.procedures?.(
            icao)),
        Promise.resolve().then(() => ctx.aerodb?.coverage?.(icao)).catch(() => null), Promise.resolve().then(() => ctx.aerodb?.coords?.(
          icao)).catch(() => null),
        Promise.resolve().then(() => ctx.aerodb?.sources?.()).catch(() =>
          null) // le catalogue : COVERAGE.partial, le libellé de « non lues »
      ]),
      all = every.filter(p => !PR.isDoubt(p)); // règle partagée avec la Carte (frame/lib/procedures.js)
    return {
      icao,
      name: adLabel({
        ...(place || {}),
        icao
      }), // la règle du nom partagée avec la Carte (frame/lib/adnames.js)
      cov, // couverture du terrain : read_at (date de la dernière lecture), outdated
      wind: host.wind?.(icao) || null, // le vent du METAR connu (étape Départ) : { dir, kt, magVar }, null sans METAR (§ 10.30)
      rwys: await runwayChoicesOf(icao, known, all),
      all,
      // procédures non lues (§ 10.26) : les fiches douteuses du terrain, jamais dans les listes. aerodb ne rend plus celles de statut
      // doubt (procedures() les écarte, sans `{ doubt: true }` demandé ici) : on compte celles qu'il a dites à la dernière lecture de cette
      // session (stats.doubt), cov.doubt s'il le donne un jour, et les fiches sans nom qui lui échapperaient (ceinture)
      // coverage().partial { pages, doubt } (aerodb : 567b94440) : les pages non lues et les fiches à vérifier du fichier détenu ; jamais
      // coverage().level pour savoir si le terrain détient des procédures (orange peut vouloir dire « lu en partie »), seulement les listes
      unread: (every.length - all.length) + Math.max((+cov?.partial?.pages || 0) + (+cov?.partial?.doubt || 0), +cov?.doubt || 0,
        (+ads.get(icao)?.stats?.doubt || 0) + (+ads.get(icao)?.stats?.rejected || 0)),
      partialLabel: cat?.COVERAGE?.partial ? ctx.t(cat.COVERAGE.partial) :
      '', // « Lu en partie : pages non lues ou procédures à vérifier »
      lists: Object.fromEntries(kinds.map(k => [k, all.filter(p => p.kind === k)])),
      nodata: !known.length && !all.length
    };
  }

  // ------------------------------------------------------------ morceaux de la carte
  /** Options d'une liste PLATE : vide (pas choisi, « — »), « aucune » (null) si none, puis les enregistrements dans l'ordre de
   *  PR.orderProcedures (les compatibles avec le choix d'abord, puis les ⚠ ; dans chaque groupe le repli X-Plane en dernier, puis par
   *  piste, par nom, par transition ; jamais de groupe) ; le choix gardé hors liste (autre piste, OFP) reste proposé. cur : undefined,
   *  null ou un identifiant. Une fiche périmée : ⌛ et classe outdated ; une fiche en conflit avec la piste choisie : ⚠ après ⌛ et
   *  classe conflict (orange) ; les deux se cumulent. Chaque option porte son libellé entier en infobulle (title), suivi de ses raisons.
   *  Une fiche en conflit reste choisissable. */
  function optionsHtml(recs, cur, k, none, o, lab) {
    const sub = k === 'trans' || k === 'appTrans',
      opt = (v, l, on, rec) => {
        const pub = lab && rec ? String(rec.name || '').trim() : '', // le nom publié, quand le libellé est court (« ILS 06 »)
          why = rec ? [pub && !l.startsWith(pub) ? pub : '', rec.outdated ? tt(TX.procOutdatedTitle) : '', ...conflictsOf(k, rec, o)]
          .filter(
            Boolean) : [],
          cls = [rec?.outdated ? 'outdated' : '', rec && conflictsOf(k, rec, o).length ? 'conflict' : ''].filter(Boolean).join(' ');
        return `<option value="${esc(v)}"${on ? ' selected' : ''}${cls ? ` class="${cls}"` : ''} title="${esc([l, ...why].join(' · '))}">${esc(l)}</option>`;
      },
      list = PR.orderProcedures([...new Map(recs.map(r => [r.id, r])).values()], k, o, recsNow()),
      html = [opt('', '—', cur === undefined), none ? opt('__none', tt(TX.procNone), cur === null) : ''],
      mark = r => conflictsOf(k, r, o).length ? PROC_CONFLICT : '';
    if (!lab && !sub) {
      // les fiches de même nom (une par piste : « AMOLO 7A » pour 14L et pour 14R) font UNE ligne avec ses pistes (« AMOLO 7A ·
      // 14L/14R ») : jamais deux libellés identiques ; la valeur est la fiche choisie, sinon celle qui dessert la piste choisie
      const fam = new Map();
      for (const r of list) {
        const n = RT.compactName(PR.nameOf(r) || r.id);
        fam.set(n, [...(fam.get(n) || []), r]);
      }
      for (const g of fam.values()) {
        if (g.length === 1) {
          html.push(opt(g[0].id, procLabel(g[0], o) + mark(g[0]), g[0].id === cur, g[0]));
          continue;
        }
        const pick = g.find(r => r.id === cur) || PR.firstServing(g, o.rwy) || g[0],
          rw = [...new Set(g.flatMap(r => PR.servesAll(r) ? [] : r.runways.map(PR.rwNum)))].sort(PR.rwOrder).join('/');
        html.push(opt(pick.id, `${PR.nameOf(pick) || pick.id}${rw ? ` · ${rw}` : ''}${pick.outdated ? PROC_OLD : ''}${mark(pick)}`, g.some(r =>
          r.id === cur), pick));
      }
    } else
      for (const r of list) html.push(opt(r.id, (lab ? lab(r) : (r.transition || r.name) + (r.outdated ? PROC_OLD : '')) + mark(r), r.id ===
        cur, r));
    if (typeof cur === 'string' && cur && !list.some(r => r.id === cur)) html.push(opt(cur, nameOfId(cur, k), true));
    return html.join('');
  }
  /** Le vent sur une piste d'après le METAR connu du terrain (m.wind, celui de l'étape Départ) : { c, text, level, why } ou null sans
   *  METAR ou sans vent dirigé (VRB : rien d'inventé, § 10.30). Axe vrai : runwayAxis de frame/lib/wind.js, la règle de la Carte
   *  (refonte § 10.33 R-F1). level : severity de frame/lib/wind.js (vert, orange, rouge ; lim : la limite de travers de
   *  la fiche de l'appareil quand elle en a une) ; why : les raisons d'un orange ou d'un rouge, pour l'infobulle. */
  function runwayWind(m, r, lim) {
    const w = m.wind;
    if (!w) return null;
    const axis = runwayAxis(r, {
        list: m.rwys,
        magVar: w.magVar
      }),
      c = axis === null ? null : windComponents(axis, w.dir, w.kt);
    if (!c) return null;
    const L = {
        ...WIND_LIMITS,
        ...(lim > 0 ? {
          cross: lim
        } : {})
      },
      tail = c.head < 0 ? -c.head : 0;
    return {
      c,
      text: windLabel(c),
      level: windSeverity(c, L),
      why: [tail > L.tail ? tt(TX.procWindTail, {
        kt: tail,
        max: L.tail
      }) : tail ? tt(TX.procWindTailSome, {
        kt: tail
      }) : '', c.cross > L.cross ? tt(lim > 0 ? TX.procWindCross : TX.procWindCrossOver, {
        kt: c.cross,
        max: L.cross
      }) : c.cross > L.crossWarn ? tt(TX.procWindCrossOver, {
        kt: c.cross,
        max: L.crossWarn
      }) : ''].filter(Boolean)
    };
  }
  /** Options de la liste des pistes : « — », les pistes de PR.orderProcedures, chacune suivie du vent du METAR connu (« 13R — ↓ 12 kt
   *  · ← 6 kt », en vert, orange ou rouge selon severity, la raison en infobulle), puis la piste choisie si elle n'y est plus. */
  function runwayOptionsHtml(m, o) {
    const rwys = PR.orderProcedures([...new Map(m.rwys.map(r => [r.id, r])).values()], 'rwy', o, recsNow()),
      lim = +host.crossLimit?.() || 0,
      opt = r => {
        const w = runwayWind(m, r, lim),
          l = w ? `${r.id} — ${w.text}` : String(r.id);
        return `<option value="${esc(r.id)}"${PR.rwNum(r.id) === PR.rwNum(o.rwy) ? ' selected' : ''}${w ? ` class="wind-${w.level}"` : ''}${w ? ` title="${esc([l, ...w.why].join(' · '))}"` : ''}>${esc(l)}</option>`;
      };
    return `<option value=""${o.rwy ? '' : ' selected'}>—</option>${rwys.map(opt).join('')}${o.rwy && !rwys.some(r => PR.rwNum(r.id) === PR.rwNum(o.rwy)) ? `<option value="${esc(o.rwy)}" selected>${esc(o.rwy)}</option>` : ''}`;
  }
  /** Les listes d'un côté, dans l'ordre de la grille : [{ k (data-k), cls, label, html }]. Départ : piste · SID · transition ; Arrivée :
   *  piste · STAR · transition, puis approche · transition d'approche (quand l'approche choisie en a). Sans donnée : aucune liste. */
  function fieldsOf(side, m) {
    if (m.nodata) return [];
    const o = {
        ...(CF.proceduresOf(host.flight())[side] || {})
      },
      out = [],
      add = (field, cls, label, html) => out.push({
        k: `p-${side}-${field}`,
        cls,
        label,
        html
      }),
      sel = (field, cls, label, recs, none = true, lab) => add(field, cls, label, optionsHtml(recs, o[field], field, none, o, lab)),
      main = recs => recs.filter(r => !r.transition);
    if (o.appTrans && o.appTrans === o.app) delete o.appTrans; // un ancien choix : la transition n'est pas l'approche elle-même
    add('rwy', 'rwy', TX.procRwy, runwayOptionsHtml(m, o));
    if (side === 'dep') {
      sel('sid', 'main', TX.procSid, main(m.lists.SID));
      const t = PR.transitionsOf(m.lists.SID, o.sid); // les transitions de la SID choisie
      if (t.length) sel('trans', 'trans', TX.procTrans, t, false);
    } else {
      sel('star', 'main', TX.procStar, main(m.lists.STAR));
      const t = PR.transitionsOf(m.lists.STAR, o.star);
      if (t.length) sel('trans', 'trans', TX.procTrans, t, false);
      // l'approche, listée une fois (une approche que l'eAIP donne par point d'entrée n'a que sa fiche finale), et ses transitions
      // (PR.appChoices : règle pure partagée avec la Carte)
      // les segments d'approche initiale du SIA (« INA RNAV RWY 06 ») ne sont jamais des lignes : ce sont les transitions de toutes
      // les finales de leur piste (§ 10.30, quatrième lecture) ; une finale par son libellé court (« ILS 06 »), le nom publié en
      // infobulle ; une transition « via ODILO · ODILO 1A »
      const ac = PR.appChoices(m.lists.APP),
        xp = r => r.status === 'xplane' || r.local ? ` · ${tt(TX.procXplane)}` : '';
      sel('app', 'app', TX.procApp, ac.list, true, r => PR.labelOf(r, ac.list) + xp(r) + (r.outdated ? PROC_OLD : ''));
      const at = ac.transitionsOf(o.app);
      if (at.length) sel('appTrans', 'apptrans', TX.procAppTrans, at, false, r => PR.transitionLabelOf(r) + (r.outdated ? PROC_OLD : ''));
    }
    return out;
  }
  /** Le résumé du choix d'un côté, la même règle que le volet de la Carte (PR.summaryOf, § 10.30) : « 13R · ↑ 12 kt · ← 6 kt »,
   *  « MEN1A via NEPIX », « I13R » ; « Aucune » dit avec sa sorte (« SID aucune ») ; '' sans choix. Le vent est celui de la piste
   *  choisie, du METAR connu (runwayWind), en couleur. */
  function summaryHtml(side, m) {
    const o = CF.proceduresOf(host.flight())[side] || {},
      r = o.rwy ? m.rwys.find(x => PR.rwNum(x.id) === PR.rwNum(o.rwy)) : null,
      w = r ? runwayWind(m, r, +host.crossLimit?.() || 0) : null,
      s = PR.summaryOf(o, {
        byId: adOf(m.icao).recs || new Map(),
        wind: w?.c
      }),
      none = k => `${tt(TX[k])} ${tt(TX.procNone)}`,
      parts = [s.rwy, s.proc === null ? none(side === 'dep' ? 'procSid' : 'procStar') : s.proc, s.app === null ? none('procApp') : s.app]
      .filter(Boolean);
    // la piste porte la couleur de son vent (severity) et ses raisons en infobulle, comme dans la liste
    return parts.length ? `<span class="fu-procsum">${parts.map(p => p === s.rwy && w ? `<span class="wind-${w.level}" title="${esc([p, ...w.why].join(' · '))}">${esc(p)}</span>` : `<span>${esc(p)}</span>`).join('')}</span>` : '';
  }
  /** Ligne de titre d'un côté, la ligne de résumé de la carte repliée (§ 10.31) : un bouton ▸ / ▾ qui déplie le côté (toute la ligne
   *  le fait aussi), « Départ LFPO Paris-Orly » (le code seul pour un terrain inconnu d'aerodb), « Sur la carte », puis le résumé du
   *  choix (summaryHtml). « Relire » et « Source » sont sur la ligne discrète, dépliée avec les listes. */
  const titleHtml = (side, m) => `${m.nodata ? '' : `<button type="button" class="fu-procfold" data-do="procfold" data-side="${side}" aria-expanded="${openSide === side}" aria-label="${esc(tt(TX[side]))}">${openSide === side ? '▾' : '▸'}</button>`}<b class="fu-prochead">${esc(tt(TX[side]))}</b> <span class="fu-procicao">${esc(m.icao)}</span>${m.name ? ` <span class="fu-procname">${esc(m.name)}</span>` : ''}${m.nodata ? '' : ` <button type="button" class="fu-linkbtn fu-onmap" data-do="onmap" data-side="${side}" data-icao="${esc(m.icao)}">${esc(tt(TX.procOnMap))}</button>`}${summaryHtml(side, m)}`;
  /** Un bouton de lecture (même geste « Lire » et « Relire » : data-do procfetch, un seul chemin dans read) ; occupé tant que la lecture
   *  de ce terrain est en cours. */
  const readButton = (icao, text, again) => {
    const busy = reading?.icao === icao;
    return `<button type="button" class="fu-linkbtn" data-do="procfetch"${again ? ' data-again="1"' : ''} data-icao="${esc(icao)}"${busy ? ' disabled aria-busy="true"' : ''}>${esc(busy ? reading.text : text)}</button>`;
  };
  /** Date de la dernière lecture d'un terrain (aerodb coverage(icao).read_at), « lu le 28/10 18:01Z », ⌛ quand ce qu'il détient est une
   *  lecture d'un cycle passé (coverage().outdated) ; '' sans date (read_at null, aerodb plus ancien). */
  function fileHtml(m) {
    const when = fmtDayZ(m.cov?.read_at); // « 29/10 16:53Z » ; '' sans date (read_at null) ou illisible
    if (!when) return '';
    return `<span class="fu-procfile">${esc(tt(TX.procFileAt, { d: when }) + (m.cov?.outdated ? PROC_OLD : ''))}</span>`;
  }
  /** L'unique ligne discrète d'un côté (jamais plus) : « lu le 29/10 16:53Z ⌛ · Relire · 3 non lues » ; sans donnée : « aucune
   *  procédure publiée · Lire les procédures de LFXX ». L'emplacement data-source-slot, à la fin, attend le lien « Source » (§ 10.25). */
  function metaHtml(m, side) {
    const parts = m.nodata ? [`<span class="fu-procnone">${esc(tt(TX.procNoData))}</span>`, readButton(m.icao, tt(TX.procRead, {
      icao: m.icao
    }), false)] : [fileHtml(m), readButton(m.icao, tt(TX.procReread), true)];
    if (m.unread > 0) parts.push(`<span class="fu-procunread" title="${esc([m.partialLabel, tt(m.unread === 1 ? TX.procUnread1 : TX.procUnread, { n: m.unread })].filter(Boolean).join(' · '))}">${esc(tt(m.unread === 1 ? TX.procNotRead1 : TX.procNotRead, { n: m.unread }))}</span>`);
    return parts.filter(Boolean).join('<span class="fu-sep" aria-hidden="true"> · </span>') + ` <span data-source-slot>${sourceHtml(m, side)}</span>`;
  }
  /** « Source » (§ 10.25) : pour chaque procédure choisie du côté (la SID ; la STAR et l'approche), un lien vers la page codée qu'aerodb
   *  donne en source.url (fiche de l'eAIP : adresse publique du SIA, https seulement), dans un nouvel onglet ; avec deux liens, la sorte
   *  suit (« Source STAR · Source APP »). Une fiche d'une autre source (EAD, OCR, à la main) n'a pas de lien : le nom de son document
   *  (source.file) va dans le title de la ligne. */
  function sourceHtml(m, side) {
    const o = CF.proceduresOf(host.flight())[side] || {},
      keys = side === 'dep' ? ['sid'] : ['star', 'app'],
      recs = keys.map(k => [k, typeof o[k] === 'string' ? (m.all || []).find(r => r.id === o[k]) : null]).filter(([, r]) => r),
      linked = recs.filter(([, r]) => /^https:\/\//.test(String(r.source?.url || '')));
    return linked.map(([k, r]) => `<a class="fu-procsrc" href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer" title="${esc(r.source.file || r.source.url)}">${esc(tt(TX.procSource) + (linked.length > 1 ? ` ${tt(TX.procKinds[k])}` : ''))}</a>`)
      .join('<span class="fu-sep" aria-hidden="true"> · </span>');
  }
  /** Les documents sans lien public des procédures choisies d'un côté (autre source que l'eAIP) : pour le title de la ligne. */
  function sourceTitle(m, side) {
    const o = CF.proceduresOf(host.flight())[side] || {};
    return (side === 'dep' ? ['sid'] : ['star', 'app']).map(k => typeof o[k] === 'string' ? (m.all || []).find(r => r.id === o[k]) : null)
      .filter(r => r && !/^https:\/\//.test(String(r.source?.url || '')) && r.source?.file).map(r => r.source.file).join(' · ');
  }

  // ------------------------------------------------------------ dessin sur place
  /** Pointeur grossier (écran tactile) : après un changement, le focus n'est jamais rendu à une liste — le sélecteur natif se
   *  rouvrirait aussitôt (utilisateur, 29/10 : « le choix d'une procédure réaffiche immédiatement le popdown »). */
  const coarse = () => !!window.matchMedia?.('(pointer: coarse)').matches;
  /** Trois colonnes seulement si rien n'y déborde : sinon une seule (fu-one) ; refait quand la largeur de la boîte change. */
  const fitted = new WeakSet();

  function fitGrid(box) {
    box.classList.remove('fu-one');
    if (box.scrollWidth > box.clientWidth + 1) box.classList.add('fu-one');
    if (fitted.has(box) || typeof ResizeObserver !== 'function') return;
    fitted.add(box);
    let w = box.clientWidth;
    const ro = new ResizeObserver(() => {
      if (!box.isConnected) return ro.disconnect();
      if (box.clientWidth !== w) {
        w = box.clientWidth;
        fitGrid(box);
      }
    });
    ro.observe(box);
  }
  /** Pose un texte HTML dans un élément seulement s'il a changé ; le focus qui était dans l'élément (un bouton de la ligne) est rendu à
   *  son équivalent. */
  function setHtml(el, html) {
    if (painted.get(el) === html) return;
    const had = el.contains(document.activeElement) && el !== document.activeElement ? document.activeElement : null,
      sel = had ? (had.dataset?.k ? `[data-k="${had.dataset.k}"]` : had.dataset?.do ? `[data-do="${had.dataset.do}"]` : '') : '';
    el.innerHTML = html;
    painted.set(el, html);
    if (sel && !(coarse() && el.tagName === 'SELECT')) el.querySelector(sel)?.focus();
  }
  /** Squelette d'un côté : titre, ligne discrète et une étiquette avec sa liste par champ (vides : patchSide les remplit). */
  const skeleton = (side, m, fields) => `<div class="fu-proc${openSide === side || m.nodata ? '' : ' fu-folded'}"${m.nodata ? ' data-nodata="1"' : ''} data-proc="${side}" data-icao="${esc(m.icao)}"><div class="fu-proctitle" data-r="title" data-do="procfold" data-side="${side}"></div><div class="fu-procmeta f-muted" data-r="meta"></div>${fields.map(f => `<label class="f-field fu-pf fu-pf-${f.cls}">${esc(tt(f.label))}<select data-k="${f.k}"></select></label>`).join('')}</div>`;
  /** Met un côté à jour sur place : le titre, la ligne discrète et les options de chaque liste, chacun seulement s'il a changé. */
  function patchSide(el, side, m, fields) {
    el.classList.toggle('fu-folded', openSide !== side && !m.nodata); // sans donnée, la ligne de lecture reste visible
    setHtml(el.querySelector('[data-r="title"]'), titleHtml(side, m));
    const meta = el.querySelector('[data-r="meta"]');
    setHtml(meta, metaHtml(m, side));
    const t = sourceTitle(m, side);
    if (t) meta.title = t;
    else meta.removeAttribute('title');
    for (const f of fields) setHtml(el.querySelector(`select[data-k="${f.k}"]`), f.html);
  }
  /** Signature de la structure d'un côté : terrain, avec ou sans donnée, listes présentes. Changée, la boîte est refaite. */
  const structOf = (side, m, fields) => m ? `${side}:${m.icao}:${m.nodata ? 'n' : 'd'}:${fields.map(f => f.k).join(',')}` : `${side}:-`;
  /** Dessine les deux côtés dans la boîte : sur place quand la structure est celle déjà là, sinon la boîte est refaite (le champ au
   *  clavier est retrouvé par son data-k). */
  function paint(box, models) {
    const sides = ['dep', 'arr'].map((side, i) => {
        const m = models[i];
        return m ? {
          side,
          m,
          fields: fieldsOf(side, m)
        } : null;
      }),
      struct = sides.map((s, i) => s ? structOf(s.side, s.m, s.fields) : structOf(['dep', 'arr'][i], null)).join('|');
    if (box.dataset.struct !== struct) {
      const k = box.contains(document.activeElement) ? document.activeElement.dataset?.k : null;
      box.innerHTML = sides.filter(Boolean).map(s => skeleton(s.side, s.m, s.fields)).join('');
      box.dataset.struct = struct;
      for (const s of sides.filter(Boolean)) patchSide(box.querySelector(`[data-proc="${s.side}"]`), s.side, s.m, s.fields);
      if (k && !coarse()) box.querySelector(`[data-k="${k}"]`)?.focus(); // ordinateur : la liste qui l'avait le retrouve
    } else
      for (const s of sides.filter(Boolean)) patchSide(box.querySelector(`[data-proc="${s.side}"]`), s.side, s.m, s.fields);
    fitGrid(box);
  }
  /** Clé de ce que montrent les lignes : choix, terrains, vol démarré ; changée, sync redessine. */
  const rowsKey = () => JSON.stringify([host.key(), !!host.flight().started?.at]);
  /** Dessine la carte : à Route avant le départ, à Départ une fois le vol démarré (rien n'est verrouillé : départ et arrivée restent
   *  modifiables). Asynchrone (aerodb) ; la dernière demande seule est dessinée. */
  async function render() {
    const body = host.body();
    if (!body || !host.plan()) return;
    const mine = ++seq,
      started = !!host.flight().started?.at,
      route = body.querySelector('[data-procbox="route"]'),
      start = body.querySelector('[data-procbox="start"]'),
      box = started ? start : route,
      other = started ? route : start;
    body.querySelector('[data-block="procs"]')?.classList.toggle('fu-hide', !started);
    body.querySelector('[data-block="procrows"]')?.classList.toggle('fu-hide',
      started); // la carte de l'étape Route n'existe qu'avant le départ
    if (other) {
      other.innerHTML = '';
      delete other.dataset.struct;
    }
    key = rowsKey();
    if (!box) return;
    const models = await Promise.all([sideModel('dep'), sideModel('arr')]);
    if (host.gone() || mine !== seq || !host.body()) return;
    // toutes les fiches des deux terrains, retrouvées par leur identifiant quand une piste choisie en retire le choix
    for (const m of models.filter(Boolean)) {
      adOf(m.icao).recs = new Map(m.all.map(r => [r.id, r]));
      adOf(m.icao).rwys = m.rwys.map(r => String(r.id)); // les pistes proposées : seules admises dans une proposition de la Carte
    }
    paint(box, models);
    host.drawn?.(); // les fiches des deux terrains sont connues : le texte de route peut suivre le choix (§ 10.31)
    applyFocus();
    if (proposal)
      applyProposal(); // la proposition de la Carte, une fois les fiches des terrains connues (une piste unique suit son choix)
  }
  /** Redessine la carte si ce qu'elle montre a changé (appelée par chaque refresh de l'écran). */
  function sync() {
    if (key !== rowsKey()) render();
  }
  /** La carte est à refaire au prochain sync (le corps de l'écran est neuf). */
  function reset() {
    key = null;
    seq++;
  }
  /** Demande le focus du premier champ d'un côté (« Changer » de la Carte, #fuel?focus=arr), pris dès que le côté est dessiné. */
  function focus(side) {
    wantFocus = side;
    openSide = side; // le côté demandé est déplié : sa première liste est visible
  }
  /** Déplie un côté (et replie l'autre), ou le replie s'il l'était (une tape sur sa ligne de résumé, § 10.31). */
  function fold(side) {
    openSide = openSide === side ? '' : side;
    const body = host.body();
    for (const el of body?.querySelectorAll('.fu-proc[data-proc]') || []) {
      const on = el.dataset.proc === openSide,
        b = el.querySelector('.fu-procfold');
      el.classList.toggle('fu-folded', !on && !el.dataset.nodata);
      if (b) {
        b.setAttribute('aria-expanded', String(on));
        b.textContent = on ? '▾' : '▸';
      }
    }
    const box = body?.querySelector('.fu-procbox:not(:empty)');
    if (box) fitGrid(box);
  }
  /** Donne le focus à la première liste du côté demandé, dès qu'elle est dessinée et que l'écran n'est plus inerte. */
  function applyFocus() {
    const body = host.body();
    if (!wantFocus || !body || body.inert || host.pending?.()) return; // pas avant l'écran complet : le dessin suivant le refait
    const row = body.querySelector(`[data-proc="${wantFocus}"]`),
      el = row?.querySelector('select') || row?.querySelector('button:not([disabled])'); // la liste d'abord, pas « Relire »
    if (!el) return;
    wantFocus = '';
    el.scrollIntoView?.({
      block: 'center'
    });
    el.focus();
  }

  // ------------------------------------------------------------ le choix du pilote
  /** Choix du pilote dans une liste (k = p-<côté>-<champ>) : route.procedures réécrite (by 'fuel', at), la transition d'une procédure
   *  changée retirée (rien d'autre : un choix en conflit avec un autre est gardé, marqué ⚠ dans les listes, sans notification), une
   *  procédure choisie sans piste qui n'en dessert qu'une posant cette piste. Les listes sont redessinées sur place aussitôt ; le vol
   *  est écrit et le devis refait UNE fois, SETTLE_MS après le dernier choix d'une série. */
  function choose(k, raw, quiet = false) {
    const [, side, field] = k.split('-'),
      f = host.flight(),
      r = host.route(),
      v = CF.proceduresOf(f),
      cur = {
        dep: {
          ...(v.dep || {})
        },
        arr: {
          ...(v.arr || {})
        }
      },
      o = cur[side],
      val = raw === '' ? undefined : raw === '__none' ? null : raw;
    if (!PROC_FIELDS[side]?.includes(field)) return;
    if (val === undefined) delete o[field];
    else o[field] = val;
    // une procédure choisie avant la piste, qui n'en dessert qu'une, pose cette piste
    if (['sid', 'star', 'app'].includes(field) && typeof val === 'string' && !o.rwy) {
      const rec = recsNow().get(val),
        only = rec && !PR.servesAll(rec) ? [...new Set(rec.runways.map(PR.rwNum))] : [];
      if (only.length === 1) o.rwy = only[0];
    }
    if (field === 'sid' || field === 'star') delete o.trans;
    if (field === 'app') delete o.appTrans;
    if (o.appTrans && o.appTrans === o.app) delete o.appTrans; // la transition d'une approche n'est pas l'approche elle-même
    // l'autre côté reste tel quel : un « aucune » posé sur tout le côté (null) n'est pas changé en « pas choisi »
    r.procedures = {
      dep: side === 'dep' ? cleanSide(cur.dep) : keep(v.dep),
      arr: side === 'arr' ? cleanSide(cur.arr) : keep(v.arr),
      by: 'fuel',
      at: new Date().toISOString()
    };
    if (quiet) return; // plusieurs choix d'un coup (la proposition de la Carte) : un dessin et une écriture à la fin
    render();
    settleSoon();
  }
  /** L'écriture différée des choix : une seule après le dernier d'une rafale (SETTLE_MS). */
  function settleSoon() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!host.gone()) host.settled();
    }, SETTLE_MS);
  }

  // ------------------------------------------------------------ lecture à la demande
  /** « Lire les procédures de LFXX » et « Relire » : un seul geste, aerodb.fetchProcedures (un terrain par geste, rien en silence) ;
   *  un refus montre sa raison (reason, wait, message : la forme unique d'un refus du lanceur) dans une notification flottante (sans
   *  lanceur : la lecture se fait sur le poste, l'OFP SimBrief reste la source du vol). Un échec qui a vu des pages dit ses comptes
   *  (stats) après la raison. */
  async function read(icao) {
    const say = (row, v, level) => ctx.notify(ctx.t(row, v), level); // ctx du montage de départ : dit même après le démontage
    if (reading) return say(TX.procReasons.busy, {
      icao: reading.icao
    }, 'warn'); // jamais un appui sans réponse
    reading = {
      icao,
      text: tt(TX.procReading, {
        icao
      })
    };
    // texte du bouton : la source dès qu'aerodb la dit (eAIP du SIA, EAD Basic), sinon le terrain ; « 3/12 » : l'avancement ; le bouton
    // est retrouvé à chaque fois (la carte se redessine pendant la lecture)
    let src = null;
    const label = (n = '') => {
      if (!reading) return;
      reading.text = (TX.procReadingSrc[src] ? ctx.t(TX.procReadingSrc[src]) : ctx.t(TX.procReading, {
        icao
      })) + n;
      const b = !host.gone() && host.body()?.querySelector(`[data-do="procfetch"][data-icao="${CSS.escape(String(icao))}"]`); // code venu du groupe : échappé
      if (b) b.textContent = reading.text;
    };
    say(TX.procStarted, {
      icao
    }, 'info');
    if (!host.gone()) {
      key = null;
      render();
    }
    let res;
    try {
      res = ctx.aerodb?.fetchProcedures ? await ctx.aerodb.fetchProcedures(icao, {
        onProgress: p => {
          if (p?.source) src = p.source;
          label(p && p.total ? ` ${p.done || 0}/${p.total}` : '');
        }
      }) : {
        ok: false,
        reason: 'unavailable'
      };
    } catch (e) {
      res = {
        ok: false,
        reason: 'failed',
        message: e?.message || String(e || '')
      };
    }
    reading = null;
    // libellés des motifs de lecture (codes d'aerodb, AeroCatalogue.READ_REASONS[code] = [fr, en, de, es]) ; un code inconnu tel quel
    const cat = await Promise.resolve().then(() => ctx.aerodb?.sources?.()).catch(() => null),
      why = code => cat?.READ_REASONS?.[code] ? ctx.t(cat.READ_REASONS[code]) : String(code || '?');
    const wn = Array.isArray(res?.warnings) && res.warnings.length ? ctx.t(TX.procWarnings, {
      n: res.warnings.length
    }) : '';
    if (res?.ok) {
      const n = Array.isArray(res.procedures) ? res.procedures.length : +res.procedures || 0,
        st = res.stats;
      say(st && +st.pages > 0 ? TX.procFetchedPages : TX.procFetched, {
        icao,
        n,
        p: +st?.pages || 0,
        rej: +st?.rejected > 0 ? ctx.t(TX.procRejected, {
          r: +st.rejected,
          why: why(st.reasons?.[0]?.[0])
        }) : '',
        drop: +st?.dropped > 0 ? ctx.t(TX.procDropped, {
          d: +st.dropped
        }) : ''
      }, 'ok');
    } else {
      const none = res?.reason === 'failed' && /no procedure could be read/i.test(res.message || ''),
        row = none ? TX.procReasons['none-read'] : TX.procReasons[res?.reason] || TX.procReasons.other,
        st = res?.stats;
      say(row, {
        icao,
        r: res?.reason || '?',
        m: res?.message && !(st && +st.pages > 0) ? ` (${res.message})` : '', // la cause du poste, seulement sans comptes traduits
        c: st && +st.pages > 0 ? ctx.t(+st.read > 1 ? TX.procCountRead : TX
          .procCountRead1, { // les comptes de la lecture, après la raison
            read: +st.read || 0,
            pages: +st.pages
          }) : '',
        wn,
        w: Math.max(1, Math.ceil(+res?.wait || 30)), // too-soon : secondes avant la lecture suivante (EAD Basic, 30 s entre deux)
        l: res?.reason === 'no-tables' && res.lnm ? ctx.t(TX.procLnm) : '' // indice : les bases de Little Navmap du poste (§ 10.21)
      }, 'warn');
    }
    live?.afterRead(icao, res);
  }
  /** Fin d'une lecture, rendue au montage vivant (peut être un autre que celui qui l'a lancée) : sur un succès, les comptes sont gardés
   *  et les fiches du terrain oubliées ; la carte est redessinée dans tous les cas (le bouton n'est plus occupé). */
  function afterRead(icao, res) {
    if (host.gone()) return;
    if (res?.ok) {
      adOf(icao).stats = res.stats || null; // les fiches douteuses de cette lecture (stats.doubt) : comptées sur la ligne discrète
      if (dropAd(icao)) host.drop();
      host.refresh();
    }
    key = null;
    render();
  }
  /** Changement signalé par aerodb ('change') : des procédures ont été écrites ({ procedures: icao }, lecture à la demande) ou les
   *  données publiées ont changé ({ changed }, { refreshed }) : les réponses gardées sont jetées et la carte relue, sans attendre un
   *  autre geste ; pour des procédures d'un terrain du vol, celles lues du vol le sont aussi (leur géométrie a pu changer). Les
   *  autres signaux (fiches d'aéronef, zone ouverte) ne concernent pas la carte. */
  function onChange(e) {
    if (!e || host.gone() || !host.body() || !(e.procedures || e.changed || e.refreshed)) return;
    if (dropAd(e.procedures || null)) {
      host.drop();
      host.refresh(); // un terrain du vol : ses procédures lues aussi, le devis suit
    } else if (host.plan()) render();
  }

  // ------------------------------------------------------------ la proposition de la Carte (mode choix, § 10.23)
  /** Ce que la Carte a choisi (#fuel?focus=arr&rwy=13R&star=ID&app=ID : plusieurs clés d'un aller, consommées par module.js ; une
   *  clé absente laisse sa famille telle quelle, § 10.30) : { side, fields }, appliqué dès que le vol est lu. */
  let proposal = null;
  /** Reçoit la proposition d'un côté ; « none » vaut « Aucune » (null). */
  function propose(side, fields) {
    if (side !== 'dep' && side !== 'arr') return;
    proposal = {
      side,
      fields
    };
    applyProposal();
  }
  /** Applique la proposition comme des choix faits ici (le même chemin que les listes : choose), dans l'ordre du côté (piste,
   *  procédure, transition, approche, transition d'approche), puis un seul dessin, une seule écriture différée et une seule ligne qui
   *  dit ce qui a changé (§ 10.30) ; rien tant que le vol n'est pas lu. */
  function applyProposal() {
    if (!proposal || host.pending?.() || !host.flight() || !ads.get(String((proposal.side === 'dep' ? host.route()?.dep : host.route()
          ?.arr) || '')
        .toUpperCase())?.recs
      ?.size) return; // le vol lu, l'écran complet (une écriture pendant le chargement du registre se perdrait) et les fiches du terrain
    // dessinées : render la rappelle
    const {
      side,
      fields
    } = proposal,
    before = snapshot();
    proposal = null;
    // l'adresse est modifiable par tout lien et ne porte pas l'OACI : n'est admis que « none », une piste proposée pour ce terrain, ou
    // l'identifiant d'une fiche du terrain DU VOL de ce côté, de la bonne sorte et non douteuse ; le reste est ignoré, rien n'est écrit,
    // et jamais la chaîne reçue telle quelle (la valeur écrite est celle de la fiche ou de la piste trouvée)
    const ad = ads.get(String((side === 'dep' ? host.route()?.dep : host.route()?.arr) || '').toUpperCase()),
      KIND = {
        sid: 'SID',
        star: 'STAR',
        app: 'APP',
        trans: side === 'dep' ? 'SID' : 'STAR',
        appTrans: 'APP'
      },
      admit = (k, raw) => {
        const v = String(raw ?? '').trim();
        if (!v) return null;
        if (v === 'none') return k === 'rwy' ? null : '__none';
        if (k === 'rwy') return /^\d{2}[LRC]?$/.test(v) ? (ad.rwys || []).find(r => PR.rwNum(r) === v) ?? null : null;
        const rec = ad.recs.get(v);
        return rec && rec.kind === KIND[k] && !PR.isDoubt(rec) && (k !== 'trans' && k !== 'appTrans' || rec.transition) ? rec.id : null;
      };
    let any = false;
    for (const k of PROC_FIELDS[side]) {
      const v = admit(k, fields[k]);
      if (v) {
        choose(`p-${side}-${k}`, v, true);
        any = true;
      }
    }
    if (!any) return; // rien d'admis : rien d'écrit, rien à dire
    render();
    settleSoon();
    const after = CF.proceduresOf(host.flight());
    for (const line of changeLines(before, after, [side])) ctx.notify(line, 'ok');
  }

  // ------------------------------------------------------------ le texte de route (§ 10.31)
  /** Ce que le texte de route sait des procédures : { recs (fiches par identifiant), sid / star : Map nom → [fiches principales] } ;
   *  null tant que les fiches du départ et de l'arrivée ne sont pas lues (le texte n'est alors ni réécrit ni relu). */
  function textModel() {
    const r = host.route(),
      d = ads.get(String(r.dep || '').toUpperCase())?.recs,
      a = ads.get(String(r.arr || '').toUpperCase())?.recs;
    if (!d || !a) return null;
    const by = (recs, kind) => {
      const m = new Map();
      for (const x of recs.values())
        if (x.kind === kind && !x.transition && PR.nameOf(x)) {
          const n = RT.compactName(PR.nameOf(x)); // l'indicatif OACI, sans espace (« AMOLO 7A » → « AMOLO7A »)
          m.set(n, [...(m.get(n) || []), x]);
        }
      return m;
    };
    return {
      recs: new Map([...d, ...a]),
      sid: by(d, 'SID'),
      star: by(a, 'STAR')
    };
  }

  // ------------------------------------------------------------ l'OFP
  /** La vue des procédures d'avant l'OFP, avec les terrains : { dep, arr, depIcao, arrIcao } (un côté d'un autre terrain n'est pas comparé). */
  function snapshot() {
    const f = host.flight();
    return {
      ...CF.proceduresOf(f),
      depIcao: f.route?.dep,
      arrIcao: f.route?.arr
    };
  }
  /** Ce que « Charger mon OFP » a mis, une ligne par côté rempli : « Arrivée : STAR ABC1A → ABC2B ». before : snapshot() d'avant
   *  l'OFP ; next : la vue écrite ; filled : les côtés remplis. */
  function changeLines(before, next, filled) {
    const r = host.flight().route || {},
      lines = [];
    for (const side of filled) {
      const same = side === 'dep' ? before.depIcao === r.dep : before.arrIcao === r.arr,
        a = same ? before[side] || {} : {},
        b = next[side] || {},
        // « SID → AMOLO 7A » quand rien n'était choisi, « SID AMOLO 7A → LACOU 7B » sinon (parcours de BUGS SOG, 30 octobre)
        parts = PROC_FIELDS[side].filter(k => a[k] !== b[k]).map(k => [tt(TX.procKinds[k]), a[k] === undefined ? '' : valueText(a[k], k, a),
          '→', valueText(b[k], k, b)
        ].filter(Boolean).join(' '));
      if (parts.length) lines.push(tt(TX.procChange, {
        side: tt(TX[side]),
        parts: parts.join(' · ')
      }));
    }
    return lines;
  }
  /** Les SID et STAR de l'OFP (les enregistrements qu'aerodb en a gardés) proposent le choix des SEULS côtés que le pilote n'a pas
   *  encore choisis (absent = pas choisi ; « aucune » est un choix) : identifiants, la piste seulement quand l'enregistrement n'en a
   *  qu'une. Un côté déjà choisi, ou sans procédure dans l'OFP, reste comme il est. Une ligne de notification par côté rempli, rien
   *  d'autre. */
  function applyOfp(pr, before) {
    const mk = (rec, k) => rec && typeof rec.id === 'string' ? {
        ...(Array.isArray(rec.runways) && rec.runways.length === 1 ? {
          rwy: String(rec.runways[0])
        } : {}),
        [k]: rec.id
      } : null,
      cur = CF.proceduresOf(host.flight()),
      offered = {
        dep: mk(pr?.sid, 'sid'),
        arr: mk(pr?.star, 'star')
      },
      next = {
        dep: cur.dep,
        arr: cur.arr
      },
      filled = ['dep', 'arr'].filter(side => offered[side] && cur[side] !== null && !sideChosen(cur[side]));
    if (!filled.length) return; // l'OFP n'apporte rien de nouveau : le choix du pilote reste tel quel
    for (const side of filled) next[side] = offered[side];
    host.route().procedures = {
      dep: keep(next.dep),
      arr: keep(next.arr),
      by: 'fuel',
      at: new Date().toISOString()
    };
    for (const line of changeLines(before, next, filled)) ctx.notify(line, 'ok');
  }

  /** Démontage : une série de choix en attente est écrite tout de suite (le vol courant ne perd rien) ; la lecture en cours continue. */
  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      host.save();
    }
    if (live === api) live = null;
  }

  const api = {
    sync,
    render,
    propose,
    reset,
    choose,
    read,
    onChange,
    focus,
    fold,
    applyFocus,
    textModel,
    snapshot,
    applyOfp,
    afterRead,
    stop
  };
  live = api;
  return api;
}
