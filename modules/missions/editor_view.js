// V3 missions — l'écran de l'éditeur de missions (SOG-0287 ; sorti de module.js le 17 nov. 2026, sans changement de comportement, pour
// devenir l'atelier : SOG-0444, modules/missions/EDITOR.md). Propriétaire : la session « Création de missions ». Le calcul pur est dans
// editor.js, les textes de cette session dans editor_texts.js ; ceux des six étapes (TX) et les règles de style restent dans module.js.
//
// API :
//   init(tools) : une fois, au chargement de module.js — ce que l'écran emploie du module et qui y reste (partagé avec la liste, la
//     fiche et le registre) : REGISTRY, TX, allRows, coSelect, cut, draw, esc, famChoices, famHtml, famLetter, mapHref, regLoad,
//     subChoices, yamlFile ; et state() → l'état du module en cours (réaffecté à chaque montage).
//   edClick, edHtml, edInput : l'écran (s.ed), une saisie, un clic « ed… » — appelés par l'aiguillage de module.js.
//   edAfter(s | null) : après chaque dessin, et au démontage — la carte du socle (voir « La carte »).
//
// La carte (SOG-0444, lot P2, première brique) : la mission dessinée sur le socle de carte de la suite (editor_map.js) dans un cadre de
// taille fixe, le croquis dessous tant qu'elle n'est pas là (et sans carte) ; module.js appelle edAfter(s) après chaque dessin (la
// carte, qui vit dans un hôte à elle, est reposée) et edAfter(null) au démontage (elle est retirée).
//
// L'écran (SOG-0444, lot P1 ; modules/missions/EDITOR.md « Porting the workshop ») : la carte de la mission (lot P1 : le croquis des
// lieux, sans outil) et le déroulé (« Au départ », puis les tiroirs du fichier, lus tels quels) ; la fiche du départ — les six étapes
// en six groupes repliables, un seul déplié (s.ed.step ; '' : tous repliés) ; le pied : « Enregistrer », « À compléter (n) » qui ouvre
// la liste nommée, « Annuler ». Rien de ce qu'on peut presser n'est redessiné pendant la frappe (SOG-0449 : edRefresh).
//
// Les tiroirs (SOG-0445) : une carte du déroulé se touche (s.ed.sel : 'start', ou la lettre du tiroir) et la fiche du tiroir prend la
// place de celle du départ — la clé, les textes, la suite de route ; « ＋ Tiroir » ; « Retirer ce tiroir ». Les lignes des tiroirs
// (s.ed.drawers, editor_drawers.js) ne sont créées qu'à la première retouche et s'écrivent dans edDoc avant que les références
// suivent les lieux ; ils comptent dans « À compléter ».
//
// L'essai des clés (SOG-0444, lot P4) : « Essayer les clés », dans l'en-tête du déroulé, met le volet de l'essai à la place de la
// fiche (s.ed.trial : { on, min, max, speed, alt, declares, hands }) ; le calcul est celui de editor_trial.js sur le document de la
// séance ; la carte se déplie d'elle-même et montre l'avion et sa trace ; chaque carte du déroulé dit « ouvert à H + 6 min » ou
// « fermé » ; rien n'est écrit dans la mission.
import * as ADD from './add.js';
import * as DR from './editor_drawers.js';
import * as ED from './editor.js';
import * as EM from './editor_map.js';
import {
  describe as pilotSays
} from './drawers_view.js';
import * as MS from '../../frame/lib/mission.js';
import * as MT from '../../frame/lib/mission_themes.js';
import * as RG from './registry.js';
import * as TR from './editor_trial.js';
import {
  EDTX,
  citedText,
  removedText,
  todoText
} from './editor_texts.js';

let REGISTRY, TX, allRows, coSelect, cut, draw, esc, famChoices, famHtml, famLetter, mapHref, regLoad, subChoices, yamlFile, state;

/** Reçoit de module.js ce que l'écran en emploie (voir l'en-tête). */
export function init(tools) {
  ({
    REGISTRY,
    TX,
    allRows,
    coSelect,
    cut,
    draw,
    esc,
    famChoices,
    famHtml,
    famLetter,
    mapHref,
    regLoad,
    subChoices,
    yamlFile,
    state
  } = tools);
}

// ---------------------------------------------------------------- l'éditeur de missions (SOG-0287), dans la forme de l'atelier (SOG-0444)
// Les règles de l'atelier (SOG-0444, lot P1) : la carte, le déroulé, la fiche du départ en six groupes, le pied. Dans la fiche (une colonne
// étroite, même sur un grand écran), les lignes d'équipe et d'événement gardent leur forme étroite. Les règles des champs
// de chaque étape (ms-edteam, ms-pl…) restent dans module.js. Module large : la carte et le déroulé à gauche, la fiche à droite.
const AT_STYLE = `[data-module="missions"] .ms-at{display:flex;flex-direction:column;min-height:calc(100dvh - 160px)}
[data-module="missions"] .ms-atmap{margin:0 0 12px}
[data-module="missions"] .ms-atmapbtn{min-height:44px}
[data-module="missions"] .ms-atmapbody{display:none;margin-top:8px}
[data-module="missions"] .ms-atmap[data-open="1"] .ms-atmapbody{display:block}
[data-module="missions"] .ms-atmapframe{position:relative;height:300px;overflow:hidden}
[data-module="missions"] .ms-atmapslot,[data-module="missions"] .ms-atsketch{position:absolute;inset:0}
[data-module="missions"] .ms-atmaphost{width:100%;height:100%}
[data-module="missions"] .ms-atsketch{display:flex;align-items:center;justify-content:center;background:var(--sog-bg,#fff)}
[data-module="missions"] .ms-atsketch[hidden],[data-module="missions"] .ms-atmaptools[hidden]{display:none}
[data-module="missions"] .ms-atsketch .ms-thumb{margin-top:0;width:100%;height:100%;border:0}
[data-module="missions"] .ms-atmaptools{position:absolute;bottom:8px;left:8px;z-index:2}
[data-module="missions"] .ms-atflowrow{display:flex;gap:8px;overflow-x:auto;padding:2px 0 6px;scroll-snap-type:x proximity}
[data-module="missions"] .ms-atpart{flex:0 0 172px;scroll-snap-align:start;border:1px solid var(--sog-line,#ddd);border-top:4px solid var(--sog-muted,#888);padding:8px 10px;min-height:84px;background:var(--sog-bg,#fff)}
[data-module="missions"] .ms-atpart[data-kind=start]{border-top-color:var(--ok,#1e7e34)}
[data-module="missions"] .ms-atpart[aria-current]{outline:2px solid var(--accent,#1a73e8)}
[data-module="missions"] .ms-atpart>span{display:block}
[data-module="missions"] .ms-atpart .ms-attag{font-size:.75em;letter-spacing:.05em;text-transform:uppercase}
[data-module="missions"] button.ms-atpart{display:block;font:inherit;color:inherit;text-align:left;border-radius:0;cursor:pointer}
[data-module="missions"] .ms-atpart>*{pointer-events:none}
[data-module="missions"] .ms-atpart .ms-stepmark{display:inline-block;font-size:.9em}
[data-module="missions"] button.ms-atadd{display:flex;align-items:center;justify-content:center;border-style:dashed;font-weight:600}
[data-module="missions"] .ms-dgrp{border-top:1px solid var(--sog-line,#ddd);padding:8px 0 4px}
[data-module="missions"] .ms-dgrp>h4{margin:4px 0 8px}
[data-module="missions"] .ms-dgrp .f-row{align-items:flex-start}
[data-module="missions"] .ms-dgrp .f-row>.f-field{flex:1 1 10em;min-width:0}
[data-module="missions"] .ms-dgrp textarea,[data-module="missions"] .ms-dgrp select,[data-module="missions"] .ms-dgrp input:not([type=checkbox]){width:100%;box-sizing:border-box;font:inherit}
[data-module="missions"] .ms-dgrp textarea{resize:vertical}
[data-module="missions"] .ms-dgrp[data-open=""]>.ms-dbody{display:none}
[data-module="missions"] .ms-dsum{grid-template-columns:auto minmax(0,1fr)}
[data-module="missions"] .ms-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
[data-module="missions"] .ms-pilot{border:1px solid var(--sog-line,#ddd);padding:8px 10px;margin:0 0 8px;background:var(--sog-bg,#fff)}
[data-module="missions"] .ms-pilot p{margin:.3em 0}
[data-module="missions"] .ms-pilot p:empty{display:none}
[data-module="missions"] .ms-pilot .ms-pre{white-space:pre-wrap;overflow-wrap:anywhere}
[data-module="missions"] .ms-pilot .ms-attag{font-size:.75em;letter-spacing:.05em;text-transform:uppercase}
[data-module="missions"] .ms-chip{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--sog-line,#ddd);padding:0 0 0 10px;min-height:44px}
[data-module="missions"] .ms-chip>button{min-width:44px;min-height:44px;border:0;background:none;font:inherit;color:inherit}
[data-module="missions"] .ms-atflowhead{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
[data-module="missions"] .ms-atflowhead>h3{margin:0}
[data-module="missions"] .ms-trstate{display:block;font-size:.85em;font-weight:600;color:var(--sog-muted,#666)}
[data-module="missions"] .ms-trstate:empty{display:none}
[data-module="missions"] .ms-trstate[data-open="1"]{color:var(--ok,#1e7e34)}
[data-module="missions"] .ms-trrange{width:100%;min-height:44px}
[data-module="missions"] [data-trial] .f-row{align-items:flex-start}
[data-module="missions"] [data-trial] .f-row>.f-field{flex:1 1 8em;min-width:0}
[data-module="missions"] [data-trial] .f-field input:not([type=checkbox]):not([type=range]){width:100%;box-sizing:border-box}
[data-module="missions"] .ms-trlog{max-height:40dvh;overflow:auto}
[data-module="missions"] .ms-atgrp{border-top:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-atgrp:last-child{border-bottom:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-atsum{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:8px;align-items:center;width:100%;min-height:48px;text-align:left;border:0;background:none;padding:4px 0;font:inherit;color:inherit}
[data-module="missions"] .ms-atsum>b{white-space:nowrap}
[data-module="missions"] .ms-atline{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.9em}
[data-module="missions"] .ms-atgrp[data-open="1"]>.ms-atsum{font-size:1.05em}
[data-module="missions"] .ms-atbody{padding:2px 0 10px;min-width:0}
[data-module="missions"] .ms-atbody>h3{display:none}
[data-module="missions"] .ms-atbody .f-row{align-items:flex-start}
[data-module="missions"] .ms-atbody .f-row>.f-field{flex:1 1 10em;min-width:0}
[data-module="missions"] .ms-atbody textarea{width:100%;box-sizing:border-box;resize:vertical;font:inherit}
[data-module="missions"] .ms-plcheck{display:flex;gap:8px;align-items:center;min-height:44px;margin:4px 0}
[data-module="missions"] .ms-atbody .ms-plbody>.f-muted{white-space:normal;overflow:visible} /* le détail d'un lieu n'est jamais coupé */
[data-module="missions"] .ms-plcheck>input{flex:0 0 auto;width:20px;height:20px}
[data-module="missions"] .ms-plfold{margin:4px 0 8px}
[data-module="missions"] .ms-plfold>summary{min-height:44px;display:flex;align-items:center;cursor:pointer}
[data-module="missions"] .ms-atbody .ms-edteam{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}
[data-module="missions"] .ms-atbody .ms-edteam>.ms-edtdel{grid-column:3;grid-row:1 / span 2}
[data-module="missions"] .ms-atbody .ms-edthead{display:none}
[data-module="missions"] .ms-atbody .ms-tlabel{display:block}
[data-module="missions"] .ms-atbody .ms-evrow{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}
[data-module="missions"] .ms-atbody .ms-evrow>.ms-evtext{grid-column:1 / span 2}
[data-module="missions"] .ms-atfoot{position:sticky;bottom:var(--f-tab-space,0px);margin-top:auto;background:var(--sog-bg,#fff);border-top:1px solid var(--sog-line,#ddd);z-index:2}
[data-module="missions"] .ms-atbar{display:flex;gap:8px;align-items:center;padding:8px 0}
[data-module="missions"] .ms-atbar>.ms-edcancel{margin-left:auto}
[data-module="missions"] .ms-attodobtn .ms-attodofirst{display:none}
[data-module="missions"] .ms-attodobtn>*,[data-module="missions"] .ms-atsum>*{pointer-events:none}
[data-module="missions"] .ms-attodo{margin:8px 0 0;max-height:40dvh;overflow:auto}
[data-module="missions"] .ms-attodo[hidden]{display:none}
@container (min-width: 850px){
  [data-module="missions"] .ms-atgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(22em,26em);gap:16px;align-items:start}
  [data-module="missions"] .ms-atmapbtn{display:none}
  [data-module="missions"] .ms-atmapbody{display:block;margin-top:0}
  [data-module="missions"] .ms-atmapframe{height:min(46dvh,440px)}
  /* la carte et le déroulé restent en vue pendant que la fiche défile (l'ergonome, 18 nov.) */
  [data-module="missions"] .ms-atmain{position:sticky;top:var(--f-pane-top,70px);align-self:start}
  [data-module="missions"] .ms-atpart{flex-basis:220px}
  [data-module="missions"] .ms-attodobtn .ms-attodofirst{display:inline}
  /* la fiche d'un tiroir sur un module large : ses trois groupes dépliés, leurs titres ne se touchent pas */
  [data-module="missions"] .ms-dgrp[data-open=""]>.ms-dbody{display:block}
  [data-module="missions"] .ms-dsum{pointer-events:none;min-height:0;padding:4px 0 8px}
  [data-module="missions"] .ms-dsum>.ms-atline{display:none}
}`;

/** La lettre d'une famille pour l'éditeur (famLetter, les identifiants des lignes de la famille). */
const edLetter = (s, fam) => famLetter(fam, allRows(s).filter(r => r.family === fam).map(r => r.id));
/** Les familles de l'éditeur : celles des thèmes et celles des lignes, « T · AIRLIFT · … » (SOG-0292). La famille commerciale attend la
 *  décision de l'ergonome sur son Cadre réduit (SOG-0287, ajout du 13 nov.). */
const edFamilies = (s, lang) => famChoices([...MT.THEMES.map(t => ({
  id: '',
  family: t.id
})), ...allRows(s)], lang);
/** Les sous-types de l'éditeur : la liste de la famille (les séries du thème, comme la V2), puis ceux des lignes. */
function edSubtypes(s, fam, lang) {
  const li = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(lang)),
    theme = (MT.themeOf(fam)?.series || []).map(x => ({
      code: x.value,
      label: x.labels[li] || x.value
    }));
  const all = [...theme, ...subChoices(allRows(s), fam, lang).filter(x => !theme.some(t => t.code === x.code))],
    cur = s.ed?.cadre.subtype;
  // le sous-type du fichier, même hors de la liste de la famille, reste montré et choisi (jamais effacé en silence)
  return cur && !all.some(x => x.code === cur) ? [...all, {
    code: cur,
    label: cur.slice(0, 60)
  }] : all;
}

/** Lit le fichier d'une mission pour l'éditeur : le texte en schéma CORE (les dates restent des textes) ; { doc, pending } ou { err }. */
async function edRead(s, path) {
  if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
  const r = await Promise.resolve().then(() => s.ctx.data.read(path, {
      wait: true
    })).catch(e => ({
      err: e
    })),
    v = r?.value ?? r?.text ?? null;
  if (r?.err || v === null) return {
    err: String(r?.err?.message || r?.err || s.tt(TX.regUnread)).slice(0, 120)
  };
  if (typeof v === 'string' && v.length > ADD.LIMITS.bytes) return {
    err: 'size'
  };
  try {
    const doc = typeof v === 'string' ? globalThis.jsyaml.load(v, {
      schema: globalThis.jsyaml.CORE_SCHEMA
    }) : structuredClone(v);
    const shape = doc && typeof doc === 'object' ? ED.shapeOf(doc) : '';
    if (shape) return {
      err: s.tt(shape === 'alias' ? TX.edAlias : TX.edHuge)
    };
    return doc && typeof doc === 'object' && !Array.isArray(doc) ? {
      doc,
      pending: !!r.pending
    } : {
      err: s.tt(TX.regUnread)
    };
  } catch (e) {
    return {
      err: String(e?.message || e).split('\n')[0].slice(0, 120)
    };
  }
}

/** Ouvre l'éditeur : « new » (Créer), « edit » (Modifier) ou « dup » (Dupliquer) une ligne du registre. */
async function edOpen(s, mode, line = null) {
  if (mode === 'new') {
    s.ed = {
      mode,
      step: 'cadre',
      base: ED.blank(),
      cadre: ED.cadreOf(ED.blank()),
      path: '',
      regIdx: -1,
      regId: '',
      origId: '',
      pending: false
    };
    return draw(s);
  }
  const path = RG.pathOf(line?.row);
  if (!path) return s.ctx.notify(s.tt(TX.edUnreadable, {
    e: s.tt(TX.regRefused)
  }), 'warn');
  const got = await edRead(s, path);
  if (state() !== s) return;
  if (got.err) return s.ctx.notify(s.tt(TX.edUnreadable, {
    e: got.err
  }), 'warn');
  const base = mode === 'dup' ? ED.duplicate(got.doc) : got.doc,
    cadre = ED.cadreOf(base);
  // audit 182 : rien n'est prérempli d'ailleurs que du fichier (sinon « Enregistrer » sans rien toucher l'écrirait) ; la série du
  // registre, quand le fichier n'en porte pas, n'est montrée qu'en indication dans le champ ; la famille de la ligne sert à la copie seule
  const regSeries = /^\d{1,5}$/.test(String(line.raw?.series ?? '')) ? String(line.raw.series) : '';
  if (mode === 'dup' && !cadre.family) cadre.family = line.row.family;
  if (mode === 'dup') cadre.id = ED.numbering(allRows(s), cadre.family, edLetter(s, cadre.family)).id;
  s.ed = {
    mode,
    // une mission qu'on modifie sur un téléphone : tous les groupes repliés, chacun dit son contenu en une ligne ; une copie s'ouvre
    // sur son Cadre, comme une mission neuve (son identifiant et son titre sont à donner)
    step: mode === 'dup' || edWide(s) ? 'cadre' : '',
    base,
    cadre,
    path: mode === 'edit' ? path : '',
    regIdx: mode === 'edit' ? line.idx : -1,
    regId: mode === 'edit' ? cut(line.raw?.id, 40) : '',
    origId: mode === 'edit' ? line.row.id : '',
    pending: mode === 'edit' && got.pending,
    regSeries
  };
  draw(s);
}

/** L'étape Cadre (sept éléments au plus : famille et sous-type, série et identifiant, titre, théâtre, départ et arrivée). */
function edCadreHtml(s) {
  const e = s.ed,
    c = e.cadre,
    lang = s.ctx.lang?.() || 'fr',
    letter = edLetter(s, c.family),
    num = ED.numbering(allRows(s), c.family, letter),
    subs = c.family ? edSubtypes(s, c.family, lang) : [],
    theatres = [...new Set([...ED.THEATRES, c.theatre].filter(Boolean))],
    field = (k, label, input, hint = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span>${input}${hint ? `<small class="f-muted" data-hint="${k}">${esc(hint)}</small>` : ''}</label>`,
    text = (k, v, extra = '') => `<input data-k="${k}" value="${esc(v)}" autocomplete="off"${extra}>`,
    sel = (k, list, v, empty = true) => `<select data-k="${k}">${empty ? '<option value=""></option>' : ''}${list.map(x => `<option value="${esc(x.code)}"${x.code === v ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`,
    idHint = e.mode === 'edit' ? c.id.toUpperCase() !== e.origId ? s.tt(TX.edIdKept) : '' : c.id === num.id ? s.tt(TX.edIdNext) : '';
  if (ED.liaison(c.family)) // une liaison (famille commerciale) : le Cadre réduit (décision du 13 nov.), six éléments
    return `<h3>1. ${esc(s.tt(TX.stepCadre))}</h3><p class="f-muted" data-liaison>${esc(s.tt(TX.edLiaisonHint))}</p>
    <div class="f-row">${field('edfam', TX.edFamily, sel('edfam', edFamilies(s, lang), c.family))}${subs.length ? field('edsub', TX.edCharge, sel('edsub', subs, c.subtype)) : ''}</div>
    <div class="f-row">${field('eddep', TX.edDep, text('eddep', c.dep, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}${field('edarr', TX.edArr, text('edarr', c.arr, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}</div>
    <div class="f-row">${field('edco', TX.edAirline, coSelect(s, 'edco', c.airline || MS.PERSONAL))}${field('edac', TX.edAircraft, text('edac', c.aircraft, ' maxlength="12" autocapitalize="characters" placeholder="A320"'))}</div>
    ${field('edtitle', TX.edTitle, text('edtitle', c.title, ' maxlength="200"'), c.title && c.title === ED.liaisonTitle(c.dep, c.arr) ? s.tt(TX.edTitleAuto) : '')}
    <div class="f-row">${field('edid', TX.edId, text('edid', c.id, ' maxlength="5" autocapitalize="characters"'), idHint)}${field('edser', TX.edSeries, text('edser', c.series, ` inputmode="numeric" maxlength="5"${e.regSeries ? ` placeholder="${esc(e.regSeries)}"` : ''}`), s.tt(TX.edNextSeries, { n: num.nextSeries }))}</div>`;
  return `<h3>1. ${esc(s.tt(TX.stepCadre))}</h3><p class="f-muted">${esc(s.tt(TX.edCadreHint))}</p>
    <div class="f-row">${field('edfam', TX.edFamily, sel('edfam', edFamilies(s, lang), c.family))}${subs.length ? field('edsub', TX.edSubtype, sel('edsub', subs, c.subtype)) : ''}</div>
    <div class="f-row">${field('edser', TX.edSeries, text('edser', c.series, ` inputmode="numeric" maxlength="5"${e.regSeries ? ` placeholder="${esc(e.regSeries)}"` : ''}`), s.tt(TX.edNextSeries, { n: num.nextSeries }))}${field('edid', TX.edId, text('edid', c.id, ' maxlength="5" autocapitalize="characters"'), idHint)}</div>
    ${field('edtitle', TX.edTitle, text('edtitle', c.title, ' maxlength="200"'))}
    ${field('edth', TX.edTheatre, sel('edth', theatres.map(t => ({ code: t, label: t })), c.theatre))}
    <div class="f-row">${field('eddep', TX.edDep, text('eddep', c.dep, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}${field('edarr', TX.edArr, text('edarr', c.arr, ` maxlength="160" placeholder="${esc(s.tt(TX.edPlaceHint))}"`))}</div>`;
}

/** Le document en cours d'édition : le fichier lu, puis le cadre, les équipes et les lieux retouchés (une étape jamais ouverte ne
 *  retouche rien ; les lieux après le cadre : le nom du départ vient du Cadre, sa position des Lieux). */
function edDoc(e, cadre = e.cadre) {
  let d = ED.withCadre(e.base, cadre);
  if (e.teams) d = ED.withTeams(d, e.teams);
  if (e.places) d = ED.withPlaces(d, e.places);
  if (e.story) d = ED.withStory(d, e.story);
  if (e.risks) d = ED.withRisks(d, e.risks);
  if (e.events) d = ED.withEvents(d, e.events);
  if (e.mapsAdd?.length) d = ED.withMaps(d, e.mapsAdd);
  if (e.drawers) d = DR.withDrawerRows(d, e.drawers); // SOG-0445 : les tiroirs retouchés (une zone et un objet y sont cités, jamais écrits)
  return ED.withRefs(d, e.base, e.places); // SOG-0439 : après toutes les étapes, les références suivent les lieux renommés ou retirés
}

/** L'étape Équipes : une ligne par équipe (indicatif, service, type OACI, rôle), « Retirer » ; « + Équipe » ajoute une ligne. */
function edTeamsHtml(s) {
  const rows = s.ed.teams || [],
    inp = (i, f, v, label, extra = '') => `<label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(label))}</span><input data-k="edteam" data-i="${i}" data-f="${f}" value="${esc(v)}" placeholder="${esc(s.tt(label))}" autocomplete="off"${extra}></label>`;
  return `<h3>2. ${esc(s.tt(TX.stepTeams))}</h3><p class="f-muted">${esc(s.tt(TX.edTeamsHint))}</p>
    <div class="f-list" data-edteams>${rows.length ? `<div class="ms-edteam ms-edthead f-muted" aria-hidden="true">${[TX.edTeamName, TX.edTeamType, TX.edTeamService, TX.edTeamRole].map(l => `<span>${esc(s.tt(l))}</span>`).join('')}<span></span></div>` : ''}${rows.length ? rows.map((r, i) => `<div class="ms-edteam" data-team="${i}">${inp(i, 'name', r.name, TX.edTeamName, ' maxlength="80"')}${inp(i, 'type', r.type, TX.edTeamType, ' maxlength="60" autocapitalize="characters"')}${inp(i, 'service', r.service, TX.edTeamService, ' maxlength="120"')}${inp(i, 'role', r.role, TX.edTeamRole, ' maxlength="200"')}<button type="button" class="ms-edtdel" data-do="edteamdel" data-i="${i}" title="${esc(s.tt(TX.edTeamDel))}" aria-label="${esc(s.tt(TX.edTeamDel))}">✕</button></div>`).join('') : `<p class="f-muted" data-noteam>${esc(s.tt(TX.edTeamNone))}</p>`}</div>
    ${rows.length < ED.TEAMS_MAX ? `<button type="button" data-do="edteamadd">${esc(s.tt(TX.edTeamAdd))}</button>` : ''}`;
}

/** Une coordonnée en degrés et minutes : « 44°36′N 1°24′E » ; « à placer » sans position. */
function dms(s, lat, lon) {
  // la saisie telle quelle (« 44,9 » : la virgule décimale), hors bornes ou illisible : « à placer », comme à l'écriture (withPlaces)
  const num = (v, max) => {
      const n = Number(String(v ?? '').trim().replace(',', '.'));
      return String(v ?? '').trim() !== '' && Number.isFinite(n) && Math.abs(n) <= max ? n : null;
    },
    la = num(lat, 90),
    lo = num(lon, 180);
  if (la === null || lo === null) return s.tt(TX.plUnplaced);
  lat = la;
  lon = lo;
  const f = (v, p, n) => {
    const a = Math.abs(+v),
      d = Math.floor(a),
      m = Math.round((a - d) * 60);
    return `${m === 60 ? d + 1 : d}°${String(m === 60 ? 0 : m).padStart(2, '0')}′${+v < 0 ? n : p}`;
  };
  return `${f(lat, 'N', 'S')} ${f(lon, 'E', 'W')}`;
}

/** Un nombre écrit dans une phrase (« portée 0,3 NM ») : la virgule décimale, sauf en anglais ; le champ, lui, garde sa saisie. */
const dec = (s, v) => (s.ctx.lang?.() || 'fr') === 'en' ? String(v ?? '') : String(v ?? '').replace('.', ',');

/** L'étape Lieux (la maquette editeur_lieux_*.png) : une ligne par lieu, « Modifier » en ouvre les champs sur place ; « + Zone »,
 *  « + Point tournant », « + Rendez-vous » (et « + Cible » sans cible) ; « Sur la carte » montre la mission dans la Carte. */
function edPlacesHtml(s) {
  const e = s.ed,
    rows = e.places || [],
    badge = {
      dep: TX.plDep,
      arr: TX.plArr,
      target: TX.plTarget,
      zone: TX.plZone,
      pt: TX.plPt,
      rdv: TX.plRdv,
      object: EDTX.plObject
    },
    zk = v => TX[`zk_${v}`] ? s.tt(TX[`zk_${v}`]) : v,
    ok = v => EDTX[`ok_${v}`] ? s.tt(EDTX[`ok_${v}`]) : v,
    doc = edDoc(e),
    // qui emploie une zone ou un objet comme clé : « clé du tiroir 2 » (SOG-0445 : un tiroir CITE une zone ou un objet de la mission)
    usedBy = i => ED.citedBy(doc, rows, i).filter(c => c.where === 'drawerKey' || c.where === 'drawerActor').map(c => s.tt(EDTX.plKeyOf, {
      name: c.name
    })),
    // un objet à trouver : sa sorte, sa portée, « caché au pilote », le tiroir dont il est la clé (ou aucun), sa position
    objectDetail = (r, i) => [ok(r.okind), s.tt(EDTX.plHidden), ...(usedBy(i).length ? usedBy(i) : [s.tt(EDTX.plNoDrawer)]), r.range ? s.tt(
      EDTX.plRangeIs, {
        r: dec(s, r.range)
      }) : '', r.moving ? s.tt(EDTX.plMoving) : '', dms(s, r.lat, r.lon)].filter(Boolean).join(' · '),
    detail = (r, i) => r.kind === 'object' ? objectDetail(r, i) : [r.kind === 'zone' ? zk(r.zkind) : '', r.role, ...(r.kind === 'zone' ?
      usedBy(i) : []), r.kind === 'zone' && r.poly ? s.tt(TX.plPoly, {
      n: r.poly
    }) : r.kind === 'zone' && r.radius ? s.tt(TX.plCircle, {
      r: dec(s, r.radius)
    }) : '', r.kind === 'zone' && r.tot ? s.tt(TX.plTot, {
      n: r.tot
    }) : '', r.kind === 'rdv' ? r.participants : '', r.kind === 'zone' && r.poly ? '' : dms(s, r.lat, r.lon)].filter(Boolean).join(' · '),
    field = (i, f, label, v, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="edplace" data-i="${i}" data-f="${f}" value="${esc(v ?? '')}" autocomplete="off"${extra}></label>`,
    form = (r, i) => {
      const fixed = r.kind === 'dep' || r.kind === 'arr',
        num = ' inputmode="decimal" maxlength="12"';
      // un objet à trouver : son identifiant est donné par l'atelier (jamais saisi) ; sept champs
      if (r.kind === 'object') {
        // la règle des sept : le nom, la sorte, la latitude, la longitude, la portée, « trouvé sur la parole du pilote », et UN repli
        // « Hauteur — facultatif » (la hauteur de détection et l'altitude de l'objet), fermé d'office, qui dit son contenu quand il est rempli
        const heights = [r.height ? s.tt(EDTX.plHeightIs, {
          h: dec(s, r.height)
        }) : '', r.alt ? s.tt(EDTX.plAltIs, {
          a: dec(s, r.alt)
        }) : ''].filter(Boolean).join(' · ');
        return `<div class="ms-plform" data-plform="${i}"><p class="f-muted" data-plid>${esc(r.id)} — ${esc(s.tt(EDTX.plObjectHint))}</p>
        <div class="f-row">${field(i, 'name', TX.plName, r.name, ' maxlength="120"')}<label class="f-field"><span>${esc(s.tt(EDTX.plOKind))}</span><select data-k="edplace" data-i="${i}" data-f="okind"><option value=""></option>${[...new Set([...MS.OBJECT_KINDS, r.okind].filter(Boolean))].map(v => `<option value="${esc(v)}"${v === r.okind ? ' selected' : ''}>${esc(ok(v))}</option>`).join('')}</select></label></div>
        <div class="f-row">${field(i, 'lat', TX.plLat, r.lat, num)}${field(i, 'lon', TX.plLon, r.lon, num)}</div>
        <div class="f-row">${field(i, 'range', EDTX.plRange, r.range, num)}</div>
        <label class="ms-plcheck"><input type="checkbox" data-k="edplace" data-i="${i}" data-f="confirm"${r.confirm ? ' checked' : ''}><span>${esc(s.tt(EDTX.plConfirm))}</span></label>
        <details class="ms-plfold" data-plheights><summary>${esc(heights ? `${s.tt(EDTX.plHeightsOf)} — ${heights}` : s.tt(EDTX.plHeights))}</summary>
          <div class="f-row">${field(i, 'height', EDTX.plHeight, r.height, num)}${field(i, 'alt', EDTX.plAlt, r.alt, num)}</div></details>
        ${r.moving ? `<p class="f-muted" data-plmoving>${esc(s.tt(EDTX.plMoving))}</p>` : ''}
        <div class="f-row"><button type="button" data-do="edplaceok">${esc(s.tt(TX.plDone))}</button><button type="button" data-do="edplacedel" data-i="${i}">${esc(s.tt(e.placeAsk === i ? EDTX.plRemoveAnyway : TX.plRemove))}</button></div></div>`;
      }
      return `<div class="ms-plform" data-plform="${i}">${fixed ? '' : `<div class="f-row">${field(i, 'id', TX.plId, r.id, ' maxlength="40"')}${field(i, 'name', TX.plName, r.name, ' maxlength="120"')}</div>`}
        ${r.kind === 'zone' ? `<div class="f-row"><label class="f-field"><span>${esc(s.tt(TX.plKind))}</span><select data-k="edplace" data-i="${i}" data-f="zkind"><option value=""></option>${[...new Set(['search', 'mission', 'exclusion', r.zkind].filter(Boolean))].map(v => `<option value="${esc(v)}"${v === r.zkind ? ' selected' : ''}>${esc(zk(v))}</option>`).join('')}</select></label>${field(i, 'role', TX.plRole, r.role, ' maxlength="200"')}</div>` : fixed ? '' : field(i, 'role', TX.plRole, r.role, ' maxlength="200"')}
        ${r.kind === 'zone' && r.poly ? `<p class="f-muted">${esc(s.tt(TX.plPolyKept, { n: r.poly }))}</p>` : `<div class="f-row">${field(i, 'lat', TX.plLat, r.lat, num)}${field(i, 'lon', TX.plLon, r.lon, num)}</div>`}
        ${r.kind === 'zone' ? `<div class="f-row">${r.poly ? '' : field(i, 'radius', TX.plRadius, r.radius, num)}${field(i, 'tot', TX.plTotF, r.tot, ' inputmode="numeric" maxlength="5"')}</div>` : ''}
        ${r.kind === 'rdv' ? field(i, 'participants', TX.plParticipants, r.participants, ' maxlength="400"') : ''}
        <div class="f-row"><button type="button" data-do="edplaceok">${esc(s.tt(TX.plDone))}</button>${fixed ? '' : `<button type="button" data-do="edplacedel" data-i="${i}">${esc(s.tt(e.placeAsk === i ? EDTX.plRemoveAnyway : TX.plRemove))}</button>`}</div></div>`;
    },
    id = e.cadre.id.trim().toUpperCase();
  return `<h3>3. ${esc(s.tt(TX.stepPlaces))}</h3><p class="f-muted">${esc(s.tt(TX.edPlacesHint))}</p>
    <div class="f-list" data-edplaces>${rows.map((r, i) => `<div class="ms-plrow" data-place="${i}" data-kind="${r.kind}"><span class="ms-plbadge">${esc(s.tt(badge[r.kind]))}</span><span class="ms-plbody"><b>${esc([r.id, r.name].filter(Boolean).join(' · ') || s.tt(TX.plUnplaced))}</b><span class="f-muted">${esc(detail(r, i))}</span></span><button type="button" class="f-linkbtn" data-do="edplace" data-i="${i}">${esc(s.tt(TX.edModify))}</button>${e.placeEdit === i ? form(r, i) : ''}</div>`).join('')}</div>
    <div class="f-row ms-pladd">${rows.some(r => r.kind === 'target') ? '' : `<button type="button" data-do="edplaceadd" data-kind="target">${esc(s.tt(TX.plAddTarget))}</button>`}<button type="button" data-do="edplaceadd" data-kind="zone">${esc(s.tt(TX.plAddZone))}</button><button type="button" data-do="edplaceadd" data-kind="pt">${esc(s.tt(TX.plAddPt))}</button><button type="button" data-do="edplaceadd" data-kind="rdv">${esc(s.tt(TX.plAddRdv))}</button><button type="button" data-do="edplaceadd" data-kind="object">${esc(s.tt(EDTX.plAddObject))}</button>${e.mode === 'edit' && id ? `<a class="f-linkbtn" data-plmap href="${esc(mapHref({ id }, {}))}">${esc(s.tt(TX.plOnMap))}</a>` : ''}</div>`;
}

/** L'étape Récit (cinq éléments : résumé, description, objectif principal, objectifs secondaires, charge). */
function edStoryHtml(s) {
  const t = s.ed.story || {},
    area = (f, label, v, rows, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><textarea data-k="edstory" data-f="${f}" rows="${rows}"${extra}>${esc(v)}</textarea>${f === 'summary' ? `<small class="f-muted" data-stcount>${esc(s.tt(TX.stCount, { n: String(v).length, m: ED.SUMMARY_MAX }))}</small>` : ''}</label>`,
    inp = (f, label, v, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="edstory" data-f="${f}" value="${esc(v)}" autocomplete="off"${extra}></label>`;
  return `<h3>4. ${esc(s.tt(TX.stepStory))}</h3><p class="f-muted">${esc(s.tt(TX.edStoryHint))}</p>
    ${area('summary', TX.stSummary, t.summary, 4)}
    ${area('description', TX.stDescription, t.description, 8, ` maxlength="${ED.TEXT_MAX}"`)}
    ${area('primary', TX.stPrimary, t.primary, 2, ' maxlength="2000"')}
    ${area('secondary', TX.stSecondary, t.secondary, 3)}
    <div class="f-row ms-stload">${inp('payload', TX.stPayload, t.payload, ' maxlength="2000"')}${inp('mass', TX.stMass, t.mass, ' inputmode="decimal" maxlength="7"')}${inp('pax', TX.stPax, t.pax, ' inputmode="numeric" maxlength="4"')}</div>`;
}

/** L'étape Risques : une ligne « danger → parade » par risque, « Modifier » en ouvre les champs sur place ; « + Risque ». */
function edRisksHtml(s) {
  const e = s.ed,
    rows = e.risks || [],
    field = (i, f, label, v) => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="edrisk" data-i="${i}" data-f="${f}" value="${esc(v ?? '')}" maxlength="300" autocomplete="off"></label>`;
  return `<h3>5. ${esc(s.tt(TX.stepRisks))}</h3><p class="f-muted">${esc(s.tt(TX.edRisksHint))}</p>
    <div class="f-list" data-edrisks>${rows.length ? rows.map((r, i) => `<div class="ms-plrow ms-rkrow" data-risk="${i}"><span class="ms-plbody"><b>${esc(r.hazard || s.tt(TX.rkNoHazard))}${r.mitigation ? ` → ${esc(r.mitigation)}` : ''}</b>${r.consequence ? `<span class="f-muted">${esc(r.consequence)}</span>` : ''}</span><button type="button" class="f-linkbtn" data-do="edrisk" data-i="${i}">${esc(s.tt(TX.edModify))}</button>${e.riskEdit === i ? `<div class="ms-plform" data-rkform="${i}">${field(i, 'hazard', TX.rkHazard, r.hazard)}${field(i, 'consequence', TX.rkConsequence, r.consequence)}${field(i, 'mitigation', TX.rkMitigation, r.mitigation)}<div class="f-row"><button type="button" data-do="edriskok">${esc(s.tt(TX.plDone))}</button><button type="button" data-do="edriskdel" data-i="${i}">${esc(s.tt(TX.plRemove))}</button></div></div>` : ''}</div>`).join('') : `<p class="f-muted" data-norisk>${esc(s.tt(TX.rkNone))}</p>`}</div>
    ${rows.length < ED.RISKS_MAX ? `<div class="f-row ms-pladd"><button type="button" data-do="edriskadd">${esc(s.tt(TX.rkAdd))}</button></div>` : ''}`;
}

/** L'étape Chronologie et cartes : une ligne par événement (heure, lieu, ce qui se passe), « + Événement » ; puis les cartes déclarées
 *  et « Proposer les cartes depuis les lieux » (des entrées : les images se font au studio de la V2). */
function edTimelineHtml(s) {
  const e = s.ed,
    rows = (e.events || []).map(r => ({
      ...r,
      place: ED.refNow(r.place, e.base, e.places).toUpperCase()
    })), // SOG-0439
    doc = edDoc(e),
    places = ED.placesOf(doc).filter(p => p.id && !['dep', 'arr', 'object'].includes(p.kind)), // jamais un objet caché au pilote
    maps = ED.mapsOf(doc),
    missing = ED.proposedMaps(doc),
    opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`,
    row = (r, i) => `<div class="ms-edteam ms-evrow" data-event="${i}"><label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evAt))}</span><input data-k="edevent" data-i="${i}" data-f="at" value="${esc(r.at)}" placeholder="H+30mn" maxlength="20" autocomplete="off"></label><label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evPlace))}</span><select data-k="edevent" data-i="${i}" data-f="place">${opt('', s.tt(TX.evFree), r.place)}${[...places.map(p => [p.id.toUpperCase(), `${p.id}${p.name ? ` — ${p.name}` : ''}`]), ...(r.place && !places.some(p => p.id.toUpperCase() === r.place) ? [[r.place, r.place]] : [])].map(([v, l]) => opt(v, l, r.place)).join('')}</select></label><label class="f-field ms-evtext"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evText))}</span><input data-k="edevent" data-i="${i}" data-f="text" value="${esc(r.text)}" maxlength="500" autocomplete="off"></label><button type="button" class="ms-edtdel" data-do="edeventdel" data-i="${i}" title="${esc(s.tt(TX.evDel))}" aria-label="${esc(s.tt(TX.evDel))}">✕</button></div>`;
  return `<h3>6. ${esc(s.tt(TX.stepTimeline))}</h3><p class="f-muted">${esc(s.tt(TX.edTimelineHint))}</p>
    <div class="f-list" data-edevents>${rows.length ? `<div class="ms-edteam ms-evrow ms-edthead f-muted" aria-hidden="true">${[TX.evAt, TX.evPlace, TX.evText].map(l => `<span>${esc(s.tt(l))}</span>`).join('')}<span></span></div>${rows.map(row).join('')}` : `<p class="f-muted" data-noevent>${esc(s.tt(TX.evNone))}</p>`}</div>
    ${!ED.eventsStorable(doc) ? `<p class="f-muted" data-evnohome>${esc(s.tt(TX.evNoHome))}</p>` : rows.length < ED.EVENTS_MAX ? `<div class="f-row ms-pladd"><button type="button" data-do="edeventadd">${esc(s.tt(TX.evAdd))}</button></div>` : ''}
    <h4>${esc(s.tt(TX.mpTitle))}</h4>
    <div class="f-list" data-edmaps>${maps.length ? maps.map(m => `<div class="ms-plrow ms-rkrow" data-map="${esc(m.id)}"><span class="ms-plbody"><b>${esc(TX[`mt_${m.type}`] ? s.tt(TX[`mt_${m.type}`]) : m.type || m.id)}</b><span class="f-muted">${esc([m.description || m.id, m.unplaced ? s.tt(TX.mpUnplaced) : ''].filter(Boolean).join(' · '))}</span></span></div>`).join('') : `<p class="f-muted" data-nomap>${esc(s.tt(TX.mpNone))}</p>`}</div>
    <div class="f-row ms-pladd">${missing.length ? `<button type="button" data-do="edmapspropose">${esc(s.tt(TX.mpPropose, { n: missing.length }))}</button>` : ''}<span class="f-muted">${esc(s.tt(TX.mpStudio))}</span></div>`;
}

/** Vrai sur un module large (la fiche à côté de la carte) : à l'ouverture, le premier groupe de la fiche est déplié ; sur un module
 *  étroit (un téléphone) tous les groupes sont repliés et disent leur contenu en une ligne (l'ergonome, 17 nov.). */
const edWide = s => (s.el?.clientWidth || 0) >= 850;

/** Les noms des six groupes de la fiche du départ (les six étapes de l'éditeur). */
const edNames = () => ({
  cadre: TX.stepCadre,
  teams: TX.stepTeams,
  places: TX.stepPlaces,
  story: TX.stepStory,
  risks: TX.stepRisks,
  timeline: TX.stepTimeline
});

/** Ce qu'un groupe de la fiche contient, dit en une ligne (un groupe replié ne cache pas ce qu'il porte). */
function edLine(s, doc, k) {
  const c = s.ed.cadre;
  if (k === 'cadre') return [c.family, c.series !== '' ? s.tt(TX.edSeriesN, {
    n: c.series
  }) : '', ED.liaisonTitle(c.dep, c.arr)].filter(Boolean).join(' · ');
  if (k === 'teams') {
    const t = ED.teamsOf(doc);
    return t.length ? `${s.tt(EDTX.atLine_teams, { n: t.length })} · ${t.slice(0, 2).map(x => x.name).filter(Boolean).join(', ')}${t.length > 2 ? '…' : ''}` : s.tt(EDTX.atLine_none);
  }
  if (k === 'places') {
    const n = ED.placesOf(doc).filter(p => !['dep', 'arr'].includes(p.kind)).length;
    return n ? s.tt(EDTX.atLine_places, {
      n
    }) : s.tt(EDTX.atLine_none);
  }
  if (k === 'story') {
    const n = ED.storyOf(doc).summary.length;
    return n ? s.tt(EDTX.atLine_story, {
      n
    }) : s.tt(EDTX.atLine_none);
  }
  if (k === 'risks') {
    const n = ED.risksOf(doc).length;
    return n ? s.tt(EDTX.atLine_risks, {
      n
    }) : s.tt(EDTX.atLine_none);
  }
  const n = ED.eventsOf(doc).length,
    m = ED.mapsOf(doc).length;
  return n || m ? s.tt(EDTX.atLine_timeline, {
    n,
    m
  }) : s.tt(EDTX.atLine_none);
}

/** Le contenu d'un groupe déplié : le formulaire de son étape (inchangé). */
const edGroupBody = (s, k) => k === 'teams' ? edTeamsHtml(s) : k === 'places' ? edPlacesHtml(s) : k === 'story' ? edStoryHtml(s) : k ===
  'risks' ? edRisksHtml(s) : k === 'timeline' ? edTimelineHtml(s) : edCadreHtml(s);

/** La fiche du départ (la partie A du fichier) : les six étapes de l'éditeur en six groupes repliables, un seul déplié à la fois ; chaque
 *  groupe dit son contenu en une ligne et porte sa marque (✓ ou !). */
function edSheetHtml(s, doc) {
  const names = edNames();
  return `<section class="f-card ms-atsheet" data-atsheet><h3>${esc(s.tt(EDTX.atSheet))}</h3><p class="f-muted">${esc(s.tt(EDTX.atSheetHint))}</p>
    <div data-steps>${ED.STEPS.map(k => {
    const ok = ED.stepState(doc, k) === 'ok',
      open = s.ed.step === k;
    return `<div class="ms-atgrp" data-grp="${k}" data-open="${open ? '1' : ''}"><button type="button" class="ms-atsum" data-do="edstep" data-step="${k}" aria-expanded="${open}"${open ? ' aria-current="step"' : ''}><span class="ms-stepmark" data-kind="${ok ? 'ok' : 'warn'}" data-mark="${k}" aria-hidden="true">${ok ? '✓' : '!'}</span><b>${esc(s.tt(names[k]))}</b><span class="ms-atline f-muted" data-line="${k}">${esc(edLine(s, doc, k))}</span></button>${open ? `<div class="ms-atbody" data-edform>${edGroupBody(s, k)}</div>` : ''}</div>`;
  }).join('')}</div></section>`;
}

/** Le déroulé de la mission : « Au départ » (visible), puis les tiroirs dans l'ordre — dits par leur rang, lus par le lecteur
 *  (frame/lib/mission.js) sur le document de la séance — et « ＋ Tiroir » (douze au plus). Une carte se touche : sa fiche s'ouvre
 *  (SOG-0445). Les cartes sont des boutons : rien n'y est remplacé pendant la frappe (edRefresh). */
function edFlowHtml(s, doc, run = null) {
  const e = s.ed,
    drawers = MS.readMission(doc)?.drawers || [],
    c = e.cadre,
    todo = new Set(DR.drawersTodo(doc).map(t => t.name)),
    sel = e.sel || 'start',
    on = id => sel === id ? ' aria-current="true"' : '';
  return `<section class="f-card ms-atflow" data-atflow><div class="ms-atflowhead"><h3>${esc(s.tt(EDTX.atFlow))}</h3><button type="button" data-do="${run ? 'edtrialoff' : 'edtrial'}" data-trbtn aria-pressed="${!!run}">${esc(s.tt(run ? EDTX.trClose : EDTX.trBtn))}</button></div><p class="f-muted">${esc(s.tt(EDTX.atFlowHint))}</p>
    <div class="ms-atflowrow"><button type="button" class="ms-atpart" data-do="edsel" data-sel="start" data-part="start" data-kind="start"${on('start')}><span class="ms-attag f-muted">${esc(s.tt(EDTX.atVisible))}</span><b>${esc(s.tt(EDTX.atStart))}</b><span class="f-muted" data-flowline>${esc(ED.liaisonTitle(c.dep, c.arr))}</span></button>${drawers.map(d => `<button type="button" class="ms-atpart" data-do="edsel" data-sel="${esc(d.id)}" data-part="${d.rank}" data-kind="drawer"${on(d.id)}><span class="ms-attag f-muted"><span class="ms-stepmark" data-kind="${todo.has(String(d.rank)) ? 'warn' : 'ok'}" data-dmark="${d.rank}" aria-hidden="true">${todo.has(String(d.rank)) ? '!' : '✓'}</span> ${esc(s.tt(EDTX.atSealed))}</span><b data-dtitle="${d.rank}">${esc(s.tt(EDTX.atDrawer, { n: d.rank }))}${d.title ? ` · ${esc(d.title)}` : ''}</b><span class="f-muted" data-dkey="${d.rank}">${esc(s.tt(EDTX[`atKey_${d.key.kind}`] || EDTX.atKey_hand))}</span><span class="ms-trstate" data-trstate="${d.rank}" data-open="${run?.ok && run.drawers.find(x => x.id === d.id)?.open ? '1' : ''}">${run?.ok ? esc(trState(s, run.drawers.find(x => x.id === d.id) || {})) : ''}</span></button>`).join('')}${drawers.length < MS.DRAWER_IDS.length ? `<button type="button" class="ms-atpart ms-atadd" data-do="eddradd" data-dradd>${esc(s.tt(EDTX.dwAdd))}</button>` : ''}</div></section>`;
}

/** Ce que la carte dessine de la séance (editor_map.js, pur) : les lignes des Lieux que l'écran montre, les sommets des contours lus
 *  dans le fichier d'origine, la route du départ (celle que suit l'essai), l'essai en cours. */
function edMapFeats(s, doc, run = null) {
  const e = s.ed;
  return EM.mapFeatures(e.places || ED.placesOf(doc), {
    zones: e.base?.zones,
    // « XTST · Base Test » (placeText : le code d'abord) : la position de la base quand le fichier ne la dit pas
    adPos: name => adPosOf(s, (/^[A-Z]{4}(?= ·|$)/.exec(String(name || '')) || [])[0]),
    path: TR.pathOf(MS.readMission(doc)),
    run
  });
}

/** La carte de la mission (SOG-0444, lot P2, première brique) : un cadre de taille fixe — rien ne bouge quand la carte arrive — où la
 *  carte du socle (editor_map.js) prend la place du croquis dès qu'elle est là ; sans carte (hors ligne, pas de WebGL), le croquis
 *  reste. « Recentrer » n'est montré qu'avec elle. Repliée derrière son bouton sur un module étroit, toujours montrée sur un module
 *  large. La carte elle-même est posée après le dessin (edAfter). */
function edMapHtml(s, doc, run = null) {
  const thumb = thumbHtml(s, doc, run),
    live = EM.stateOf(s.ed);
  s.ed.mapFeats = edMapFeats(s, doc, run);
  return `<div class="ms-atmap" data-atmap data-open="${s.ed.mapOpen || run ? '1' : ''}"><button type="button" class="ms-atmapbtn" data-do="edmap" aria-expanded="${!!s.ed.mapOpen}">${esc(s.tt(EDTX.atMap))}</button><div class="ms-atmapbody f-card" data-atmapbody data-edpreview data-map="${live}"><div class="ms-atmapframe"><div class="ms-atmapslot" data-atmapslot></div><div class="ms-atsketch" data-atsketch${live ? ' hidden' : ''}>${thumb || `<p class="f-muted">${esc(s.tt(EDTX.atMapNone))}</p>`}</div><div class="ms-atmaptools" data-atmaptools${live ? '' : ' hidden'}><button type="button" data-do="edmapfit">${esc(s.tt(EDTX.atMapFit))}</button></div></div></div></div>`;
}

/** Une couleur du design telle que MapLibre la lit (il ne lit pas les variables CSS) : la valeur calculée d'un jeton. */
function edToken(s, name) {
  const probe = document.createElement('i');
  probe.style.cssText = `display:none;color:var(${name})`;
  s.el.append(probe);
  const v = getComputedStyle(probe).color;
  probe.remove();
  return v;
}

/** L'allure de la carte, lue du design : sombre ou non (le fond des graphiques, comme le module Données), la couleur de chaque sorte
 *  de lieu (celles du croquis), du trait et des zones, le fond uni. */
function edMapLook(s) {
  const t = n => edToken(s, n),
    bg = t('--sog-chart-bg'),
    [r, g, b] = (bg.match(/[\d.]+/g) || [255, 255, 255]).slice(0, 3).map(Number),
    accent = t('--sog-accent'),
    muted = t('--sog-muted');
  return {
    dark: 0.2126 * r + 0.7152 * g + 0.0722 * b < 110,
    colors: {
      bg,
      tokens: {
        default: muted,
        line: accent,
        fill: t('--sog-ok'),
        dep: accent,
        arr: accent,
        plane: accent,
        target: t('--sog-err'),
        rdv: t('--sog-warn'),
        zone: t('--sog-ok'),
        object: t('--sog-text'),
        pt: muted
      }
    }
  };
}

/** Pose ou met à jour la carte du socle dans l'emplacement du dessin courant, et dit son état à l'écran : avec elle, le croquis se
 *  cache et « Recentrer » se montre (deux attributs : aucun bouton n'est redessiné, SOG-0449). */
function edMapShow(s) {
  const e = s.ed,
    q = sel => s.el.querySelector(sel),
    slot = q('[data-atmapslot]'),
    mark = () => {
      const live = EM.stateOf(e),
        body = q('[data-atmapbody]'),
        sketch = q('[data-atsketch]'),
        tools = q('[data-atmaptools]');
      if (body) body.dataset.map = live;
      if (sketch) sketch.hidden = !!live;
      if (tools) tools.hidden = !live;
    };
  if (!slot || !e.mapFeats) return;
  e.mapLook ||= edMapLook(s);
  EM.show(slot, e.mapFeats, {
    owner: e,
    dark: e.mapLook.dark,
    colors: e.mapLook.colors,
    onTap: f => edMapTap(s, f),
    onState: () => state() === s && s.ed === e && mark(),
    alive: () => state() === s && s.ed === e
  });
  mark();
}

/** Un lieu touché sur la carte mène à sa ligne des Lieux, ouverte : la fiche du départ, le groupe « Lieux », la ligne en vue. Pendant
 *  un essai des clés la carte ne fait que montrer : rien. */
function edMapTap(s, f) {
  const e = s.ed,
    i = /^place:(\d{1,3})$/.exec(String(f?.id || '')) ? +String(f.id).slice(6) : -1;
  if (!e || e.trial?.on || i < 0) return;
  if (!e.places) e.places = ED.placesOf(edDoc(e));
  if (!e.places[i]) return;
  e.sel = 'start';
  e.step = 'places';
  e.placeAsk = -1;
  e.placeEdit = i;
  draw(s);
  s.el.querySelector(`[data-edplaces] [data-place="${i}"]`)?.scrollIntoView?.({
    block: 'nearest'
  });
}

/** Après chaque dessin de la page (module.js l'appelle à la fin de son dessin, et au démontage avec null) : dans l'atelier, la carte
 *  du socle est reposée dans l'emplacement neuf ; hors de l'atelier, elle est retirée avec son contexte WebGL. Les conditions du
 *  propriétaire de module.js (Features SOG, 18 nov. 2026), puisque cet appel est sur le chemin de chaque dessin : il ne lève JAMAIS
 *  (une erreur de la carte ne casse pas le dessin de la page) ; hors de l'atelier il ne fait rien — sans carte en vie, EM.stop() rend
 *  aussitôt, sans toucher la page ni rien charger (MapLibre n'est chargé qu'à l'ouverture de l'atelier) ; appelé deux fois, il est sans
 *  effet la seconde. */
export function edAfter(s) {
  try {
    if (!s?.ed) return EM.stop();
    s.ed.mapLook = null; // le design a pu changer de ton entre deux dessins
    edMapShow(s);
  } catch {
    /* la carte ne casse jamais le dessin : l'écran garde son croquis */
  }
}

/** « À compléter » : les points à compléter, nommés (jamais bloquants) — la liste que le bouton du pied ouvre : ceux du départ, puis
 *  une ligne par tiroir (SOG-0445). */
function edTodoHtml(s, doc) {
  const names = edNames(),
    todo = ED.todo(doc),
    drawers = edDrawerTodo(s, doc),
    lines = [...todo.map(t => `<li data-todo="${t.key}">${esc(s.tt(names[t.step]))} : ${esc(todoText(s.tt, t) || s.tt(TX[`todo_${t.key}`]))}</li>`), ...drawers.map(t => `<li data-dtodo="${esc(t.name)}">${esc(t.text)}</li>`)];
  return lines.length ? `<ul class="ms-lines">${lines.slice(0, 7).join('')}</ul>${lines.length > 7 ? `<p class="f-muted">${esc(s.tt(TX.more, { n: lines.length - 7 }))}</p>` : ''}` : `<p>${esc(s.tt(TX.edNothing))}</p>`;
}

/** Le bouton « À compléter (n) » du pied : son compte (les points du départ et les tiroirs qui en ont), et sur un module large le
 *  premier point. */
function edTodoBtnHtml(s, doc) {
  const names = edNames(),
    todo = ED.todo(doc),
    drawers = edDrawerTodo(s, doc),
    t = todo[0],
    first = t ? `${s.tt(names[t.step])} — ${todoText(s.tt, t) || s.tt(TX[`todo_${t.key}`])}` : drawers[0]?.text || '';
  return `${esc(s.tt(EDTX.atTodo, { n: todo.length + drawers.length }))}${first ? `<span class="ms-attodofirst"> : ${esc(first)}</span>` : ''}`;
}

/** Les tiroirs de la séance en lignes (editor_drawers.js) : celles déjà retouchées, sinon celles du fichier. */
const edDrawers = e => e.drawers || DR.drawerRowsOf(e.base);

/** La ligne du tiroir choisi, prête à être retouchée (les lignes de la séance sont créées à la première retouche : choisir un tiroir
 *  sans rien y changer n'écrit rien). → la ligne, ou null. */
function edDrawerRow(e) {
  if (!e.drawers) e.drawers = DR.drawerRowsOf(e.base).map(r => ({
    ...r,
    stops: [...r.stops],
    route: [...r.route]
  }));
  return e.drawers.find(r => r.id === e.sel) || null;
}

/** La clé d'un tiroir dite en clair (`trigger`, que la V2 imprime sur le pli scellé : le pilote la lit AVANT l'ouverture) — des mots
 *  qui ne nomment ni la zone ni l'objet ; l'heure garde la forme de la V2 (« 10 min après PT1 »). */
function edSaid(s, r) {
  if (r.key === 'time') {
    const p = !r.point || r.point.toUpperCase() === 'ORIGIN' ? s.tt(EDTX.dwAtTakeoff) : r.point,
      n = /^\d+(\.\d+)?$/.test(String(r.delay).trim()) ? +r.delay : 0;
    return n > 0 ? s.tt(EDTX.dwSaid_time, {
      n,
      p
    }) : s.tt(EDTX.dwSaid_time0, {
      p
    });
  }
  return s.tt(EDTX[`dwSaid_${r.key}`] || EDTX.dwSaid_hand);
}

/** Ce que les tiroirs ont « à compléter », une ligne par tiroir : [{ name (le rang), text }]. */
function edDrawerTodo(s, doc) {
  const by = new Map();
  for (const t of DR.drawersTodo(doc)) by.set(t.name, [...(by.get(t.name) || []), s.tt(EDTX[`dwTodo_${t.key}`] || EDTX.dwTodo_keyUnread)]);
  return [...by].map(([name, what]) => ({
    name,
    text: s.tt(EDTX.dwTodoOf, {
      name,
      what: what.join(', ')
    })
  }));
}

/** Ce que « Les textes » et « La suite de route » d'un tiroir contiennent, dit en une ligne (un groupe replié ne cache pas ce qu'il
 *  porte) : { texts, route }. */
function edDrawerLines(s, r, now) {
  const route = r.route.map(now).filter(Boolean);
  return {
    texts: [r.title.trim() || s.tt(EDTX.dwLineNoTitle), r.message.trim() ? s.tt(EDTX.dwLineMsg, {
      n: r.message.trim().length
    }) : s.tt(EDTX.dwTodo_noMessage), r.brief.trim() ? s.tt(EDTX.dwLineBrief, {
      n: r.brief.trim().length
    }) : s.tt(EDTX.dwTodo_noBrief)].join(' · '),
    route: route.length ? route.join(', ') : s.tt(EDTX.dwLineNoRoute),
    pilot: s.tt(EDTX.dwPilotLine)
  };
}

/** Ce que le pilote voit d'un tiroir (SOG-0445) : fermé — son nom, la phrase de sa clé et la note que l'écran du pilote dit lui-même
 *  (describe de drawers_view.js, la session « Affectation » : les mêmes mots), sans position en direct ; ouvert — son message, le début
 *  de son briefing, sa suite de route. Lu du DOCUMENT de la séance par le lecteur (bornes, caractères invisibles retirés), jamais des
 *  lignes en mémoire (Sécurisation, 18 nov.). → { name, key, case, note, msg, brief, route } (des textes). */
function edPilotView(s, doc, id) {
  const d = (MS.readMission(doc)?.drawers || []).find(x => x.id === id);
  if (!d) return {
    name: '',
    key: '',
    case: '',
    note: '',
    msg: '',
    brief: '',
    route: ''
  };
  const says = pilotSays(s.tt, {
    key: d.key,
    dueAt: null
  }, d, {
    live: false,
    notJudged: MS.notJudgedYet
  });
  return {
    name: `${s.tt(EDTX.atDrawer, { n: d.rank })}${d.title ? ` · ${d.title}` : ''}`,
    key: says.key,
    // « Cet appareil… » se lirait comme l'ordinateur de l'auteur : la ligne dit que c'est celui du pilote ; son cas (sans position en
    // direct, passage pas encore suivi), la note le dit elle-même depuis le lot de la zone d'Affectation
    case: says.note ? s.tt(EDTX.dwPilotCase) : '',
    note: says.note,
    msg: d.message || s.tt(EDTX.dwPilotNoMsg),
    brief: d.brief.length > 600 ? `${d.brief.slice(0, 600)}…` : d.brief,
    route: d.route.length ? s.tt(EDTX.dwPilotRoute, {
      r: d.route.map(p => p.name || p.id).join(' → ')
    }) : ''
  };
}

/** La fiche d'un tiroir (SOG-0445 ; la maquette : modules/missions/maquette/tiroirs_*.png) : trois groupes — la clé, les textes, la
 *  suite de route —, « Ce que le pilote voit » (le tiroir fermé, puis ouvert : edPilotView), puis « Retirer ce tiroir ». Sur un module étroit, « La clé » est dépliée, « Les textes » et « La suite de route »
 *  sont repliés et disent leur contenu en une ligne (l'ergonome, 17 nov.) ; sur un module large, tout est déplié. Une zone et un
 *  objet se CHOISISSENT parmi ceux de la mission (ses Lieux) : un tiroir les cite, il ne les porte pas ; sans zone ni objet à
 *  choisir, la fiche le dit et mène aux Lieux. Tout texte du fichier passe par esc(). */
function edDrawerHtml(s, doc) {
  const e = s.ed,
    rows = edDrawers(e),
    at = rows.findIndex(r => r.id === e.sel),
    r = rows[at];
  if (!r) return edSheetHtml(s, doc);
  const places = e.places || ED.placesOf(doc),
    now = id => ED.refNow(id, e.base, e.places), // l'identifiant d'aujourd'hui d'un lieu cité par le fichier
    label = p => [p.id, p.name].filter(Boolean).join(' · '),
    of = kind => places.filter(p => p.id && p.kind === kind).map(p => [p.id, label(p)]),
    points = places.filter(p => p.id && !['dep', 'arr', 'object'].includes(p.kind)).map(p => [p.id, label(p)]),
    field = (f, text, v, extra = '') => `<label class="f-field"><span>${esc(s.tt(text))}</span><input data-k="eddr" data-f="${f}" value="${esc(v ?? '')}" autocomplete="off"${extra}></label>`,
    // une liste : la valeur du fichier y figure toujours, même quand elle ne désigne plus rien (suivie d'un « ? »)
    select = (f, text, v, options) => {
      const cur = now(v),
        all = cur && !options.some(o => o[0].toUpperCase() === cur.toUpperCase()) ? [...options, [cur, `${cur} ?`]] : options;
      return `<label class="f-field"><span>${esc(s.tt(text))}</span><select data-k="eddr" data-f="${f}"><option value="">${esc(s.tt(EDTX.dwChoose))}</option>${all.map(o => `<option value="${esc(o[0])}"${o[0].toUpperCase() === cur.toUpperCase() ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
    },
    check = (f, text, on) => `<label class="ms-plcheck"><input type="checkbox" data-k="eddr" data-f="${f}"${on ? ' checked' : ''}><span>${esc(s.tt(text))}</span></label>`,
    // rien à choisir : la fiche le dit et mène aux Lieux, où la zone ou l'objet se crée
    none = text => `<p class="f-muted" data-dwnone>${esc(s.tt(text))} <button type="button" class="f-linkbtn" data-do="eddrplaces">${esc(s.tt(EDTX.dwToPlaces))}</button></p>`,
    num = ' inputmode="decimal" maxlength="8"',
    fallback = `${field('fallback', EDTX.dwFallback, r.fallback, ' inputmode="numeric" maxlength="4"')}<p class="f-muted">${esc(s.tt(EDTX.dwFallbackHint))}</p>`,
    zones = of('zone'),
    objects = of('object'),
    keys = [...DR.KEYS, ...(r.key === 'kept' ? ['kept'] : [])],
    body = r.key === 'time' ? `<div class="f-row">${select('point', EDTX.dwPoint, r.point || 'ORIGIN', [['ORIGIN', s.tt(EDTX.dwAtTakeoff)], ...points])}${field('delay', EDTX.dwDelay, r.delay, ' inputmode="numeric" maxlength="4"')}</div>` :
    r.key === 'zone' ? `${zones.length || r.zone ? select('zone', EDTX.dwZone, r.zone, zones) : none(EDTX.dwNoZone)}${check('shown', EDTX.dwShown, r.shown !== false)}${fallback}` :
    r.key === 'object' ? `${objects.length || r.object ? select('object', EDTX.dwObject, r.object, objects) : none(EDTX.dwNoObject)}${fallback}` :
    r.key === 'arrival' ? `${select('arrPoint', EDTX.dwArrPoint, r.arrPoint, [['DESTINATION', s.tt(EDTX.dwDest)], ['ORIGIN', s.tt(EDTX.dwDep)], ...points])}
        <div class="f-row">${field('arrRadius', EDTX.dwArrRadius, r.arrRadius, num)}${field('arrSpeed', EDTX.dwArrSpeed, r.arrSpeed, num)}</div>${check('arrGround', EDTX.dwArrGround, r.arrGround === true)}
        <div class="f-field"><span>${esc(s.tt(EDTX.dwStops))}</span><div class="ms-chips" data-dwstops>${r.stops.map((w, n) => now(w) ? `<span class="ms-chip" data-stop="${esc(now(w))}">${esc(now(w))}<button type="button" data-do="eddrstopdel" data-n="${n}" aria-label="${esc(s.tt(EDTX.dwStopDel, { id: now(w) }))}">×</button></span>` : '').join('')}</div></div>
        ${r.stops.length < 20 ? `<label class="f-field"><span class="f-muted">${esc(s.tt(EDTX.dwStopAdd))}</span><select data-k="eddr" data-f="stopadd"><option value=""></option>${points.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>` : ''}${fallback}` :
    r.key === 'kept' ? `<p class="f-muted" data-dwkept>${esc(s.tt(EDTX.dwKept, { why: s.tt(EDTX[`dwWhy_${r.keptWhy}`] || EDTX.dwWhy_condition) }))}</p>${fallback}` :
    `<p class="f-muted">${esc(s.tt(EDTX.dwHandHint))}</p>`,
    route = r.route.map(now).filter(Boolean),
    lines = edDrawerLines(s, r, now),
    pv = edPilotView(s, doc, r.id),
    open = e.dopen || {},
    // un groupe repliable : son titre est un bouton qui dit son contenu en une ligne (replié sur un module étroit seulement)
    group = (k, title, inner) => `<div class="ms-dgrp" data-dgrp="${k}" data-open="${open[k] ? '1' : ''}"><button type="button" class="ms-atsum ms-dsum" data-do="eddrgrp" data-grp="${k}" aria-expanded="${!!open[k]}"><b>${esc(s.tt(title))}</b><span class="ms-atline f-muted" data-dline="${k}">${esc(lines[k])}</span></button><div class="ms-dbody">${inner}</div></div>`;
  return `<section class="f-card ms-atsheet" data-atsheet data-drawer="${esc(r.id)}"><h3 data-dwhead>${esc(s.tt(EDTX.dwSheet, { n: at + 1 }))}</h3>
    <div class="ms-dgrp" data-dgrp="key" data-open="1"><h4>${esc(s.tt(EDTX.dwGrpKey))}</h4>
      <label class="f-field"><span>${esc(s.tt(EDTX.dwKey))}</span><select data-k="eddr" data-f="key">${keys.map(k => `<option value="${k}"${k === r.key ? ' selected' : ''}>${esc(s.tt(EDTX[`dwKey_${k}`]))}</option>`).join('')}</select></label>
      ${body}</div>
    ${group('texts', EDTX.dwGrpTexts, `${field('title', EDTX.dwTitle, r.title, ' maxlength="120"')}<p class="f-muted">${esc(s.tt(EDTX.dwTitleHint))}</p>
      <label class="f-field"><span>${esc(s.tt(EDTX.dwMessage))}</span><textarea data-k="eddr" data-f="message" rows="3" maxlength="2000">${esc(r.message)}</textarea></label>
      <label class="f-field"><span>${esc(s.tt(EDTX.dwBrief))}</span><textarea data-k="eddr" data-f="brief" rows="6" maxlength="20000">${esc(r.brief)}</textarea></label>`)}
    ${group('route', EDTX.dwGrpRoute, `<p class="f-muted">${esc(s.tt(route.length ? EDTX.dwRouteHint : EDTX.dwRouteNone))}</p>
      <div class="ms-chips" data-dwroute>${r.route.map((w, n) => now(w) ? `<span class="ms-chip" data-chip="${esc(now(w))}">${esc(now(w))}<button type="button" data-do="eddrchipdel" data-n="${n}" aria-label="${esc(s.tt(EDTX.dwChipDel, { id: now(w) }))}">×</button></span>` : '').join('')}</div>
      ${route.length < 60 ? `<label class="f-field"><span class="f-muted">${esc(s.tt(EDTX.dwRouteAdd))}</span><select data-k="eddr" data-f="routeadd"><option value=""></option>${[...points, ['DESTINATION', s.tt(EDTX.dwDest)]].map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>` : ''}`)}
    ${group('pilot', EDTX.dwGrpPilot, `<div class="ms-pilot" data-pvbefore><span class="ms-attag f-muted">${esc(s.tt(EDTX.dwPilotBefore))}</span><p><b data-pvname>${esc(pv.name)}</b></p><p data-pvkey>${esc(pv.key)}</p><p class="f-muted ms-attag" data-pvcase>${esc(pv.case)}</p><p class="f-muted" data-pvnote>${esc(pv.note)}</p></div>
      <div class="ms-pilot" data-pvafter><span class="ms-attag f-muted">${esc(s.tt(EDTX.dwPilotAfter))}</span><p class="ms-pre" data-pvmsg>${esc(pv.msg)}</p><p class="ms-pre f-muted" data-pvbrief>${esc(pv.brief)}</p><p class="f-muted" data-pvroute>${esc(pv.route)}</p></div>`)}
    <div class="f-row"><button type="button" data-do="eddrdel">${esc(s.tt(e.drawerAsk === r.id ? EDTX.plRemoveAnyway : EDTX.dwRemove))}</button></div></section>`;
}

/** Une saisie de la fiche d'un tiroir. Une liste (la clé, un lieu, la suite de route) ne joue qu'à son « change » et redessine l'écran ;
 *  un texte, un nombre, une case suivent la frappe sans rien redessiner de pressable (SOG-0449). */
function edDrawerInput(s, ev) {
  const e = s.ed,
    t = ev.target,
    f = t.dataset.f,
    list = t.tagName === 'SELECT';
  if (list && ev.type !== 'change') return;
  const r = edDrawerRow(e);
  if (!r) return;
  const at = e.drawers.indexOf(r),
    put = next => {
      e.drawers[at] = next;
      return next;
    };
  if (f === 'key' && DR.KEYS.includes(t.value)) {
    if (t.value === r.key) return;
    const places = e.places || ED.placesOf(edDoc(e)),
      first = kind => places.find(p => p.id && p.kind === kind)?.id || '',
      k = DR.withKey(r, t.value),
      // la clé neuve prend ce qui se devine : la première zone, le premier objet, l'arrivée au terrain d'arrivée, posé, à l'arrêt
      next = put({
        ...k,
        ...(t.value === 'zone' ? {
          zone: first('zone')
        } : t.value === 'object' ? {
          object: first('object')
        } : t.value === 'arrival' ? {
          arrPoint: 'DESTINATION',
          arrRadius: '1',
          arrSpeed: '30',
          arrGround: true
        } : t.value === 'time' ? {
          point: 'ORIGIN'
        } : {})
      });
    next.said = edSaid(s, next);
    return draw(s);
  }
  if (['point', 'zone', 'object', 'arrPoint'].includes(f) && list) {
    r[f] = String(t.value).slice(0, 40);
    if (f === 'point') r.said = edSaid(s, r);
    return draw(s);
  }
  if (f === 'routeadd' && list) {
    if (t.value) r.route = [...r.route, String(t.value).slice(0, 40)].slice(0, 60);
    return draw(s);
  }
  if (f === 'stopadd' && list) {
    if (t.value) r.stops = [...r.stops, String(t.value).slice(0, 40)].slice(0, 20);
    return draw(s);
  }
  if (['shown', 'arrGround'].includes(f) && t.type === 'checkbox') r[f] = t.checked === true;
  else if (['title', 'message', 'brief', 'delay', 'fallback', 'arrRadius', 'arrSpeed'].includes(f) && !list) {
    r[f] = t.value;
    if (f === 'delay') r.said = edSaid(s, r);
  }
  return edRefresh(s);
}

/** Un nombre saisi dans un champ de l'essai, ou undefined (l'essai prend alors sa valeur par défaut : une altitude inconnue). */
const trNum = v => /^\s*-?\d+(\.\d+)?\s*$/.test(String(v ?? '')) ? +v : undefined;

/** L'essai des clés en cours (SOG-0444, lot P4), calculé par editor_trial.js sur le document de la séance LU par le lecteur ; null
 *  quand l'essai est fermé. Rien n'est écrit dans la mission. */
function edTrialRun(s, doc) {
  const t = s.ed.trial;
  if (!t?.on) return null;
  return TR.trialRun(MS.readMission(doc), {
    untilMin: t.min,
    speedKt: trNum(t.speed),
    altFt: trNum(t.alt),
    declares: t.declares !== false,
    hands: t.hands
  });
}

/** « H + 6 min » : une minute de l'essai. */
const trAt = (s, min) => s.tt(EDTX.trAt, {
  m: Math.floor(min)
});

/** Le journal de l'essai, en phrases (les faits viennent de editor_trial.js : { min, ev, rank, how, why }). */
function edTrialLines(s, run) {
  if (!run.ok) return [s.tt(EDTX.trNoRoute)];
  return run.log.map(l => {
    const row = l.ev === 'start' ? EDTX.trStart : l.ev === 'open' ? EDTX[`trOpen_${l.how}`] || EDTX.trOpen_hand : l.ev === 'unknown' ? EDTX[
      `trUnknown_${l.why}`] || EDTX.trUnknown_data : EDTX[`trEv_${l.ev}`] || EDTX.trUnknown_data;
    return `${trAt(s, l.min)} — ${s.tt(row, { n: l.ev === 'start' ? run.drawers.length : l.rank })}`;
  });
}

/** Ce que l'essai dit d'un tiroir sur sa carte du déroulé : « ouvert à H + 6 min », ou « fermé ». */
const trState = (s, d) => d.open ? s.tt(EDTX.trOpenAt, {
  m: Math.floor(d.min)
}) : s.tt(EDTX.trClosed);

/** Le volet de l'essai des clés : à la place de la fiche, à côté de la carte (jamais une fenêtre par-dessus) — le temps au curseur,
 *  l'altitude et la vitesse de l'avion de l'essai, « le pilote dit Objet en vue », le journal, « Ouvrir à la main », « Recommencer »,
 *  « Fermer l'essai ». Le curseur et les champs ne redessinent rien de pressable (SOG-0449 : edRefresh). */
function edTrialHtml(s, run) {
  const t = s.ed.trial,
    first = run.ok ? run.drawers.find(d => !d.open) : null;
  return `<section class="f-card ms-atsheet" data-atsheet data-trial><h3>${esc(s.tt(EDTX.trTitle))}</h3><p class="f-muted">${esc(s.tt(EDTX.trHint))}</p>
    <label class="f-field"><span>${esc(s.tt(EDTX.trTime))} — <b data-trlabel>${esc(trAt(s, t.min))}</b></span><input type="range" class="ms-trrange" data-k="edtr" data-f="min" min="0" max="${t.max}" step="0.25" value="${t.min}"></label>
    <div class="f-row"><label class="f-field"><span>${esc(s.tt(EDTX.trAlt))}</span><input data-k="edtr" data-f="alt" value="${esc(t.alt)}" inputmode="numeric" maxlength="6" autocomplete="off"></label><label class="f-field"><span>${esc(s.tt(EDTX.trSpeed))}</span><input data-k="edtr" data-f="speed" value="${esc(t.speed)}" inputmode="numeric" maxlength="4" autocomplete="off"></label></div>
    <label class="ms-plcheck"><input type="checkbox" data-k="edtr" data-f="declares"${t.declares !== false ? ' checked' : ''}><span>${esc(s.tt(EDTX.trDeclares))}</span></label>
    <ul class="ms-lines ms-trlog" data-trlog>${edTrialLines(s, run).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="f-row"><button type="button" data-do="edtrhand" data-trhand${first ? '' : ' disabled'}>${esc(first ? s.tt(EDTX.trHandBtn, { n: first.rank }) : s.tt(EDTX.trHandNone))}</button><button type="button" data-do="edtrreset">${esc(s.tt(EDTX.trReset))}</button><button type="button" class="f-linkbtn" data-do="edtrialoff">${esc(s.tt(EDTX.trClose))}</button></div></section>`;
}

/** Une saisie du volet de l'essai : le temps, l'altitude, la vitesse, « Objet en vue » — tout se met à jour sur place. */
function edTrialInput(s, ev) {
  const t = s.ed.trial,
    el = ev.target,
    f = el.dataset.f;
  if (!t?.on) return;
  if (f === 'min') t.min = Math.min(t.max, Math.max(0, Number.isFinite(+el.value) ? +el.value : 0));
  else if (f === 'alt' || f === 'speed') t[f] = String(el.value).slice(0, 6);
  else if (f === 'declares' && el.type === 'checkbox') t.declares = el.checked === true;
  return edRefresh(s);
}

/** L'écran de l'atelier (SOG-0444, lot P1 ; la maquette : modules/missions/maquette/atelier_*.png) : la carte et le déroulé, la fiche du
 *  départ en six groupes, le pied (« Enregistrer », « À compléter (n) », « Annuler »). */
export function edHtml(s) {
  const e = s.ed,
    doc = edDoc(e),
    run = edTrialRun(s, doc); // l'essai des clés en cours, ou null
  return `<style>${AT_STYLE}</style><div class="ms-ed ms-at" data-pane="editor" data-mode="${e.mode}" data-step="${e.step}"><p class="f-muted ms-crumb">${esc(s.tt(EDTX.atCrumb))}</p>
    <h2 data-edhead>${esc([e.cadre.id || s.tt(TX.edNewTitle), e.cadre.title].filter(Boolean).join(' · '))}</h2>
    ${e.pending ? `<span class="f-badge ms-edpend" data-kind="warn" data-edpending>${esc(s.tt(TX.edPending))}</span>` : ''}
    <div class="ms-atgrid"><div class="ms-atmain">${edMapHtml(s, doc, run)}${edFlowHtml(s, doc, run)}</div>${run ? edTrialHtml(s, run) : (e.sel || 'start') === 'start' ? edSheetHtml(s, doc) : edDrawerHtml(s, doc)}</div>
    <div class="ms-atfoot"><div class="f-card ms-attodo" data-edtodo${e.todoOpen ? '' : ' hidden'}>${edTodoHtml(s, doc)}</div>
    <div class="ms-atbar"><button type="button" class="primary" data-do="edsave"${e.busy ? ' disabled' : ''}>${esc(s.tt(TX.edSave))}</button><button type="button" class="ms-attodobtn" data-do="edtodo" data-edtodobtn aria-expanded="${!!e.todoOpen}">${edTodoBtnHtml(s, doc)}</button><button type="button" class="f-linkbtn ms-edcancel" data-do="edcancel">${esc(s.tt(TX.cancel))}</button></div></div></div>`;
}

/** Une saisie de l'éditeur : un texte met à jour l'aperçu, les pastilles et l'en-tête seuls (le champ garde son curseur) ; une liste
 *  redessine l'écran (la famille propose son identifiant suivant et sa série à une mission neuve ou dupliquée). */
export function edInput(s, ev) {
  const out = edInputDo(s, ev);
  edShowSel(s);
  return out;
}

/** La carte choisie du déroulé reste en vue : la rangée défile en largeur seulement (jamais la page), après un geste ou une saisie
 *  qui a redessiné l'écran. */
function edShowSel(s) {
  const row = s.ed && s.el?.querySelector?.('.ms-atflowrow'),
    cur = row?.querySelector('[aria-current]');
  if (!row || !cur) return;
  const a = cur.offsetLeft - row.offsetLeft,
    b = a + cur.offsetWidth;
  if (a < row.scrollLeft) row.scrollLeft = a;
  else if (b > row.scrollLeft + row.clientWidth) row.scrollLeft = b - row.clientWidth;
}

/** Une saisie de l'éditeur (voir edInput). */
function edInputDo(s, ev) {
  const e = s.ed,
    k = ev.target?.dataset?.k;
  if (k === 'eddr') return edDrawerInput(s, ev); // la fiche d'un tiroir
  if (k === 'edtr') return edTrialInput(s, ev); // le volet de l'essai des clés
  if (k === 'edevent') { // un événement : le champ retouché en place (le lieu, une liste, aussi)
    const row = e.events?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (row && ['at', 'place', 'text'].includes(f)) row[f] = f === 'place' ? ev.target.value.toUpperCase() : ev.target.value;
    return edRefresh(s);
  }
  if (k === 'edrisk') { // un risque : le champ retouché en place, la ligne redessinée à « OK »
    const row = e.risks?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (row && ['hazard', 'consequence', 'mitigation'].includes(f)) row[f] = ev.target.value;
    return edRefresh(s);
  }
  if (k === 'edstory') { // le récit : le champ retouché en place ; le compte du résumé suit la frappe
    const f = ev.target.dataset.f;
    if (e.story && ['summary', 'description', 'primary', 'secondary', 'payload', 'mass', 'pax'].includes(f)) e.story[f] = ev.target.value;
    const n = s.el.querySelector('[data-stcount]');
    if (n && f === 'summary') {
      n.textContent = s.tt(TX.stCount, {
        n: ev.target.value.length,
        m: ED.SUMMARY_MAX
      });
      n.dataset.over = ev.target.value.length > ED.SUMMARY_MAX ? '1' : '';
    }
    return edRefresh(s);
  }
  if (k === 'edplace') { // un lieu : le champ retouché en place, la ligne redessinée à « OK »
    const row = e.places?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    // l'identifiant d'un objet est donné par l'atelier : il ne se saisit pas, même par une page forgée (Sécurisation, 18 nov.)
    if (row && ['id', 'name', 'role', 'lat', 'lon', 'zkind', 'radius', 'tot', 'participants'].includes(f) && !(row.kind === 'object' &&
        f ===
        'id')) row[f] = ev.target.value;
    // un objet à trouver : son identifiant ne se saisit pas ; « trouvé sur la parole du pilote » est une case
    else if (row?.kind === 'object' && ['okind', 'range', 'height', 'alt'].includes(f)) row[f] = ev.target.value;
    else if (row?.kind === 'object' && f === 'confirm') row.confirm = ev.target.checked === true;
    return edRefresh(s);
  }
  if (k === 'edteam') { // une équipe : la ligne retouchée en place (le champ garde son curseur)
    const row = e.teams?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (row && ['name', 'service', 'type', 'role'].includes(f)) row[f] = ev.target.value;
    return edRefresh(s);
  }
  const key = {
    edfam: 'family',
    edsub: 'subtype',
    edser: 'series',
    edid: 'id',
    edtitle: 'title',
    edth: 'theatre',
    eddep: 'dep',
    edarr: 'arr',
    edco: 'airline',
    edac: 'aircraft'
  } [k];
  if (!key) return;
  const auto = ED.liaison(e.cadre.family) && (!e.cadre.title || e.cadre.title === ED.liaisonTitle(e.cadre.dep, e.cadre.arr));
  e.cadre[key] = key === 'id' || key === 'aircraft' ? ev.target.value.toUpperCase() : key === 'airline' && ev.target.value === MS.PERSONAL ?
    '' :
    ev.target.value;
  // une liaison : tant que le titre est celui que proposent les deux bouts (ou vide), il les suit (« LFPO → LFRS »)
  if (auto && (key === 'dep' || key === 'arr' || key === 'family')) {
    e.cadre.title = ED.liaisonTitle(e.cadre.dep, e.cadre.arr);
    const t = s.el.querySelector('input[data-k=edtitle]');
    if (t) t.value = e.cadre.title;
  }
  // un départ ou une arrivée retouchés au Cadre : leur ligne des Lieux suit (sa position ne reste que si le code OACI ne change pas)
  if ((key === 'dep' || key === 'arr') && e.places) {
    const fresh = ED.placesOf(ED.withCadre(e.base, e.cadre)).find(r => r.kind === key),
      at = e.places.findIndex(r => r.kind === key);
    if (at >= 0) e.places = fresh ? e.places.map((r, i) => i === at ? fresh : r) : e.places.filter((_, i) => i !== at);
    else if (fresh) e.places = [fresh, ...e.places];
  }
  if (ev.target.tagName === 'SELECT') {
    if (ev.type !== 'change') return;
    if (key === 'family') {
      e.cadre.subtype = '';
      if (e.mode !== 'edit') {
        const n = ED.numbering(allRows(s), e.cadre.family, edLetter(s, e.cadre.family));
        e.cadre.id = n.id;
        e.cadre.series = String(n.series);
      }
    }
    return draw(s);
  }
  if (ev.type !== 'input') return;
  edRefresh(s);
}
/** SOG-0287 (fin) : la position d'un terrain de liaison d'après la base publiée (aerodb.aerodromes), demandée une fois par code ; null
 *  (inconnu), absente tant que la réponse n'est pas venue ; l'aperçu redessiné à la réponse. */
function adPosOf(s, icao) {
  const k = String(icao || '').toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(k)) return null;
  s.adPos = s.adPos || new Map();
  if (!s.adPos.has(k) && typeof s.ctx.aerodb?.aerodromes === 'function') {
    s.adPos.set(k, undefined);
    Promise.resolve().then(() => s.ctx.aerodb.aerodromes({
      icao: k
    })).then(list => {
      const a = list?.[0],
        lat = +a?.lat,
        lon = +a?.lon;
      return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? {
        lat,
        lon
      } : null;
    }).catch(() => null).then(v => {
      s.adPos.set(k, v);
      if (v && state() === s && s.ed) edRefresh(s);
    });
  }
  return s.adPos.get(k) || null;
}
/** SOG-0287 (fin, maquette editeur_lieux_1280.png) : la vignette de carte de l'aperçu — un croquis, pas une carte : départ et arrivée
 *  (bleu ; la position du fichier, sinon celle de la base), la cible (rouge), les zones à cercle (pointillé, leur rayon), une zone sans
 *  rayon (un carré pointillé), les points tournants et le rendez-vous ; projection équirectangulaire autour de la latitude moyenne. Rien
 *  sans au moins un lieu placé. */
function thumbHtml(s, doc, run = null) {
  const pts = [];
  for (const p of ED.placesOf(doc)) {
    let lat = p.lat === '' ? NaN : +p.lat,
      lon = p.lon === '' ? NaN : +p.lon;
    if ((p.kind === 'dep' || p.kind === 'arr') && !(Number.isFinite(lat) && Number.isFinite(lon))) {
      const q = adPosOf(s, (/^[A-Z]{4}(?= ·|$)/.exec(String(p.name || '')) || [])[0]); // « XTST · Base Test » (placeText : le code d'abord)
      if (q)[lat, lon] = [q.lat, q.lon];
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    pts.push({
      k: p.kind,
      lat,
      lon,
      r: p.kind === 'zone' && p.radius !== '' && +p.radius > 0 ? Math.min(+p.radius, 2000) / 111.2 : 0
    });
  }
  if (!pts.length) return '';
  // l'essai des clés : la trace de l'avion de l'essai entre dans le cadre du croquis
  const extra = run?.ok ? run.trail.map(([lat, lon]) => ({
      lat,
      lon,
      r: 0
    })) : [],
    all = [...pts, ...extra];
  const W = 200,
    H = 120,
    P = 12,
    lat0 = pts.reduce((t, p) => t + p.lat, 0) / pts.length,
    kx = Math.max(0.1, Math.cos(lat0 * Math.PI / 180)),
    X = p => p.lon * kx,
    Y = p => -p.lat,
    x0 = Math.min(...all.map(p => X(p) - p.r)),
    x1 = Math.max(...all.map(p => X(p) + p.r)),
    y0 = Math.min(...all.map(p => Y(p) - p.r)),
    y1 = Math.max(...all.map(p => Y(p) + p.r)),
    dx = Math.max(x1 - x0, 0.05),
    dy = Math.max(y1 - y0, 0.05),
    k = Math.min((W - 2 * P) / dx, (H - 2 * P) / dy),
    ox = (W - dx * k) / 2 - (x0 - (dx - (x1 - x0)) / 2) * k,
    oy = (H - dy * k) / 2 - (y0 - (dy - (y1 - y0)) / 2) * k,
    sx = p => (X(p) * k + ox).toFixed(1),
    sy = p => (Y(p) * k + oy).toFixed(1),
    COL = {
      dep: 'var(--sog-accent)',
      arr: 'var(--sog-accent)',
      target: 'var(--sog-err)',
      pt: 'var(--sog-muted)',
      rdv: 'var(--sog-warn)'
    },
    shape = p => p.k === 'zone' ? p.r ? `<circle cx="${sx(p)}" cy="${sy(p)}" r="${Math.max(3, p.r * k).toFixed(1)}" fill="none" stroke="var(--sog-ok)" stroke-width="1.5" stroke-dasharray="4 3"/>` :
    `<rect x="${(sx(p) - 6).toFixed(1)}" y="${(sy(p) - 6).toFixed(1)}" width="12" height="12" fill="none" stroke="var(--sog-ok)" stroke-width="1.5" stroke-dasharray="3 2"/>` :
    p.k === 'object' ? `<path data-thobject d="M${sx(p)} ${(sy(p) - 5).toFixed(1)}l5 5l-5 5l-5 -5z" fill="var(--sog-text, #222)"/>` :
    `<circle cx="${sx(p)}" cy="${sy(p)}" r="${p.k === 'pt' ? 3 : 4}" fill="${COL[p.k] || 'var(--sog-muted)'}"/>`;
  // les zones dessous, les points dessus
  return `<svg class="ms-thumb" data-edthumb viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.tt(TX.edThumb))}">${[...pts.filter(p => p.k === 'zone'), ...pts.filter(p => p.k !== 'zone')].map(shape).join('')}${extra.length ? `<polyline data-trtrail points="${extra.map(p => `${sx(p)},${sy(p)}`).join(' ')}" fill="none" stroke="var(--sog-accent)" stroke-width="1.5"/><circle data-trplane cx="${sx(extra[extra.length - 1])}" cy="${sy(extra[extra.length - 1])}" r="4.5" fill="var(--sog-accent)" stroke="#fff" stroke-width="1.5"/>` : ''}</svg>`;
}
/** Ce qui suit la frappe, mis à jour SUR PLACE (SOG-0449 : on ne redessine pas ce que le doigt est en train de presser — les pastilles
 *  d'étape, remplacées à chaque saisie et à chaque sortie de champ, perdaient le clic qui suivait) : le titre, la ligne et la marque de
 *  chaque groupe, le déroulé, le croquis, « À compléter ». Aucun bouton n'est remplacé ; seuls des textes et des attributs changent. */
function edRefresh(s) {
  const e = s.ed,
    doc = edDoc(e),
    q = sel => s.el.querySelector(sel),
    put = (node, text) => {
      if (node && node.textContent !== text) node.textContent = text;
    };
  put(q('[data-edhead]'), [e.cadre.id || s.tt(TX.edNewTitle), e.cadre.title].filter(Boolean).join(' · '));
  for (const k of ED.STEPS) {
    const ok = ED.stepState(doc, k) === 'ok',
      mark = q(`[data-mark="${k}"]`);
    put(q(`[data-line="${k}"]`), edLine(s, doc, k));
    put(mark, ok ? '✓' : '!');
    if (mark) mark.dataset.kind = ok ? 'ok' : 'warn';
  }
  put(q('[data-flowline]'), ED.liaisonTitle(e.cadre.dep, e.cadre.arr));
  const drow = (e.sel || 'start') === 'start' ? null : edDrawers(e).find(r => r.id === e.sel);
  if (drow) {
    const lines = edDrawerLines(s, drow, id => ED.refNow(id, e.base, e.places));
    put(q('[data-dline="texts"]'), lines.texts);
    put(q('[data-dline="route"]'), lines.route);
    const pv = edPilotView(s, doc, drow.id);
    for (const k of ['name', 'key', 'case', 'note', 'msg', 'brief', 'route']) put(q(`[data-pv${k}]`), pv[k]);
  }
  const dtodo = new Set(DR.drawersTodo(doc).map(t => t.name));
  for (const d of MS.readMission(doc)?.drawers || []) {
    const mark = q(`[data-dmark="${d.rank}"]`),
      bad = dtodo.has(String(d.rank));
    put(q(`[data-dtitle="${d.rank}"]`), `${s.tt(EDTX.atDrawer, { n: d.rank })}${d.title ? ` · ${d.title}` : ''}`);
    put(q(`[data-dkey="${d.rank}"]`), s.tt(EDTX[`atKey_${d.key.kind}`] || EDTX.atKey_hand));
    put(mark, bad ? '!' : '✓');
    if (mark) mark.dataset.kind = bad ? 'warn' : 'ok';
  }
  // le croquis et la liste « À compléter » ne portent aucun bouton : leur contenu se remplace ; la carte du socle suit sur place
  const map = q('[data-atsketch]'),
    todo = q('[data-edtodo]'),
    btn = q('[data-edtodobtn]'),
    run = edTrialRun(s, doc),
    thumb = thumbHtml(s, doc, run) || `<p class="f-muted">${esc(s.tt(EDTX.atMapNone))}</p>`,
    list = edTodoHtml(s, doc),
    label = edTodoBtnHtml(s, doc);
  if (map && e.lastThumb !== thumb) map.innerHTML = e.lastThumb = thumb;
  e.mapFeats = edMapFeats(s, doc, run);
  edMapShow(s);
  if (run) {
    // l'essai : l'heure, le journal (des textes), l'état de chaque carte, le bouton « Ouvrir à la main » (le même élément)
    const log = q('[data-trlog]'),
      lines = edTrialLines(s, run).map(x => `<li>${esc(x)}</li>`).join(''),
      hand = q('[data-trhand]'),
      first = run.ok ? run.drawers.find(d => !d.open) : null;
    put(q('[data-trlabel]'), trAt(s, e.trial.min));
    if (log && e.lastLog !== lines) log.innerHTML = e.lastLog = lines;
    for (const d of run.ok ? run.drawers : []) {
      const st = q(`[data-trstate="${d.rank}"]`);
      put(st, trState(s, d));
      if (st) st.dataset.open = d.open ? '1' : '';
    }
    if (hand) {
      put(hand, first ? s.tt(EDTX.trHandBtn, {
        n: first.rank
      }) : s.tt(EDTX.trHandNone));
      hand.disabled = !first;
    }
  }
  if (todo && e.lastTodo !== list) todo.innerHTML = e.lastTodo = list;
  // le libellé du bouton : ses nœuds de texte seulement (le bouton reste le même élément)
  if (btn && e.lastTodoBtn !== label) btn.innerHTML = e.lastTodoBtn = label;
}

/** Le registre retouché par l'éditeur : relu d'abord (un autre pilote a pu l'écrire), `change(doc)` → { doc } | { error } ; une seule
 *  écriture, sur l'appareil (elle part avec l'envoi groupé, SOG-0279). → '' ou le mot de l'échec. */
async function edRegister(s, change) {
  let got = await yamlFile(s.ctx, REGISTRY);
  if (got.why === 'late') got = await got.later;
  if (got.why && got.why !== 'missing') return got.err || s.tt(TX.regUnread);
  const out = change(got.doc && typeof got.doc === 'object' ? got.doc : {});
  if (out.error) return out.error === 'taken' ? s.tt(TX.edBlock_idTaken) : s.tt(TX.regStale);
  await s.ctx.data.put(REGISTRY, RG.withHeader(out.doc, globalThis.jsyaml), {
    module: 'missions'
  });
  s.rows = MS.readRegistry(out.doc).filter(x => !x.organisation).sort((a, b) => b.id.localeCompare(a.id));
  s.idx = null;
  return '';
}

/** « Enregistrer » : ce qui bloque est dit (famille, identifiant) ; sinon le fichier de la mission puis sa ligne du registre, écrits sur
 *  l'appareil par data.put (bornés aux écritures déclarées du module) ; ils partent avec l'envoi groupé (réponse de l'ergonome, 13 nov.).
 *  Un identifiant changé écrit un nouveau fichier ; l'ancien n'est jamais effacé, la ligne garde l'ancien identifiant (formerId). */
async function edSave(s) {
  const e = s.ed;
  if (!e || e.busy) return;
  const c = {
      ...e.cadre,
      id: e.cadre.id.trim().toUpperCase(),
      family: e.cadre.family.trim().toUpperCase()
    },
    letter = edLetter(s, c.family),
    block = ED.blocking(c, {
      rows: allRows(s),
      letter,
      own: [e.origId, e.regId].filter(Boolean)
    });
  if (block.length) return s.ctx.notify(s.tt(TX[`edBlock_${block[0]}`], {
    l: letter
  }), 'warn');
  // audit 182 : « Enregistrer » sans rien toucher n'écrit rien (le fichier reste identique, octet pour octet)
  if (e.mode === 'edit' && ED.same(edDoc(e, c), e.base)) return s.ctx.notify(s.tt(TX.edSame), 'info');
  const path = e.mode === 'edit' && c.id === e.origId && e.path ? e.path : ED.pathFor(letter, c.family, c.id);
  if (!path) return s.ctx.notify(s.tt(TX.edBlock_idForm), 'warn');
  e.busy = true;
  draw(s);
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    const doc = edDoc(e, c);
    await s.ctx.data.put(path, ED.yamlText(doc, globalThis.jsyaml), {
      module: 'missions'
    });
    s.tree?.add(path); // SOG-0365 : écrit sur cet appareil, il y est jouable
    const regErr = await edRegister(s, reg => {
      if (e.mode !== 'edit' || !e.regId) return ED.regAdd(reg, RG.entryOfMission(doc, path, undefined, RG.seriesRows(RG.entries(
        reg))));
      const list = Array.isArray(reg.missions) ? reg.missions : [],
        idx = cut(list[e.regIdx]?.id, 40) === e.regId ? e.regIdx : list.findIndex(x => cut(x?.id, 40) === e.regId);
      return ED.regEdit(reg, idx, e.regId, c, path);
    }).catch(x => String(x?.message || x).slice(0, 120));
    if (state() !== s || s.ed !== e) return;
    // la mission enregistrée devient celle qu'on modifie (Enregistrer ne ferme pas l'éditeur)
    const line = RG.entries(regErr ? {} : (await yamlFile(s.ctx, REGISTRY)).doc || {}).find(x => x.row.id === c.id);
    Object.assign(e, {
      mode: 'edit',
      base: doc,
      cadre: ED.cadreOf(doc),
      teams: null,
      places: null,
      placeEdit: -1,
      story: null,
      risks: null,
      riskEdit: -1,
      events: null,
      mapsAdd: null,
      drawers: null,
      drawerAsk: '',
      path,
      origId: c.id,
      regIdx: line ? line.idx : e.regIdx,
      regId: line ? cut(line.raw.id, 40) : e.regId,
      pending: true
    });
    s.ctx.notify(regErr ? s.tt(TX.edRegLater, {
      e: regErr
    }) : s.tt(TX.edSaved), regErr ? 'warn' : 'ok');
  } catch (x) {
    s.ctx.notify(s.tt(TX.edFailed, {
      e: String(x?.message || x).slice(0, 120)
    }), 'error');
  } finally {
    e.busy = false;
    if (state() === s && s.ed === e) draw(s);
  }
}

/** Les gestes de l'éditeur et ses entrées depuis le Registre. */
export function edClick(s, b) {
  const out = edClickDo(s, b);
  // un geste qui attend (lire un fichier, enregistrer) redessine plus tard : la carte choisie revient en vue alors aussi
  Promise.resolve(out).then(() => edShowSel(s), () => {});
  edShowSel(s);
  return out;
}

/** Les gestes de l'éditeur (voir edClick). */
function edClickDo(s, b) {
  const r = s.reg,
    idx = Number.isInteger(+b.dataset.rid) ? +b.dataset.rid : -1,
    line = r?.lines.find(x => x.idx === idx);
  switch (b.dataset.do) {
    case 'edcreate':
      return edOpen(s, 'new');
    case 'edmodify':
      return line && edOpen(s, 'edit', line);
    case 'eddup':
      return line && edOpen(s, 'dup', line);
    case 'edsave':
      return edSave(s);
    case 'edtrial': { // « Essayer les clés » : le volet de l'essai prend la place de la fiche ; rien n'est écrit dans la mission
      const e = s.ed,
        m = MS.readMission(edDoc(e)),
        full = TR.trialRun(m, {
          untilMin: TR.TRIAL.maxMin
        }),
        // le curseur va jusqu'au posé (ou à la dernière heure de repli), dix minutes de plus
        last = Math.max(full.landedMin ?? 120, ...(m?.drawers || []).map(d => Number.isFinite(d.key?.fallbackMin) ? d.key.fallbackMin : 0));
      e.trial = {
        on: true,
        min: 0,
        max: Math.min(TR.TRIAL.maxMin, Math.ceil(last) + 10),
        speed: m?.cruiseSpeedKt != null ? String(m.cruiseSpeedKt) : '',
        alt: m?.cruiseLevelFt != null ? String(m.cruiseLevelFt) : '',
        declares: true,
        hands: {}
      };
      return draw(s);
    }
    case 'edtrialoff':
      s.ed.trial = null;
      return draw(s);
    case 'edtrreset':
      if (s.ed.trial) Object.assign(s.ed.trial, {
        min: 0,
        hands: {}
      });
      return draw(s);
    case 'edtrhand': { // « Ouvrir à la main » : le premier tiroir encore fermé, à la minute du curseur (le geste du pilote, dans l'essai)
      const e = s.ed,
        run = edTrialRun(s, edDoc(e)),
        d = run?.ok ? run.drawers.find(x => !x.open) : null;
      if (d && MS.DRAWER_IDS.includes(d.id)) e.trial.hands = {
        ...e.trial.hands,
        [d.id]: e.trial.min
      };
      return draw(s);
    }
    case 'edsel': { // une carte du déroulé : la fiche du départ, ou celle d'un tiroir
      const id = String(b.dataset.sel || '');
      s.ed.sel = id !== 'start' && edDrawers(s.ed).some(r => r.id === id) ? id : 'start';
      s.ed.drawerAsk = '';
      s.ed.dopen = {};
      return draw(s);
    }
    case 'eddradd': { // « ＋ Tiroir » : le suivant, au geste du pilote, sa fiche ouverte
      const row = DR.blankDrawer(edDrawers(s.ed), s.ed.base);
      if (!row) return s.ctx.notify(s.tt(EDTX.dwMax), 'info');
      edDrawerRow(s.ed);
      row.said = edSaid(s, row);
      s.ed.drawers = [...s.ed.drawers, row];
      s.ed.sel = row.id;
      s.ed.drawerAsk = '';
      s.ed.dopen = {
        texts: true
      };
      draw(s);
      return s.el.querySelector('[data-drawer] [data-f=title]')?.focus();
    }
    case 'eddrdel': { // « Retirer ce tiroir », en deux temps : le second appui est inerte une seconde (comme pour un lieu cité)
      const e = s.ed,
        r = edDrawerRow(e);
      if (!r) return;
      if (e.drawerAsk !== r.id) {
        e.drawerAsk = r.id;
        e.drawerAskAt = Date.now();
        return draw(s);
      }
      if (Date.now() - e.drawerAskAt < ED.REMOVE_ARM_MS) return;
      e.drawers = e.drawers.filter(x => x !== r);
      e.sel = 'start';
      e.drawerAsk = '';
      s.ctx.notify(s.tt(EDTX.dwRemoved), 'ok');
      return draw(s);
    }
    case 'eddrgrp': { // « Les textes », « La suite de route » : un groupe de la fiche d'un tiroir se déplie et se replie
      const k = ['route', 'pilot'].includes(b.dataset.grp) ? b.dataset.grp : 'texts';
      s.ed.dopen = {
        ...(s.ed.dopen || {}),
        [k]: !s.ed.dopen?.[k]
      };
      return draw(s);
    }
    case 'eddrplaces': { // rien à choisir : la fiche du départ, ses Lieux dépliés (une zone ou un objet s'y crée)
      const e = s.ed;
      e.sel = 'start';
      e.step = 'places';
      if (!e.places) e.places = ED.placesOf(edDoc(e));
      draw(s);
      return s.el.querySelector('[data-steps] [aria-current]')?.scrollIntoView?.({
        inline: 'nearest',
        block: 'nearest'
      });
    }
    case 'eddrstopdel': { // un arrêt retiré de ceux qu'une arrivée demande
      const r = edDrawerRow(s.ed),
        n = +b.dataset.n;
      if (r && Number.isInteger(n) && n >= 0) r.stops = r.stops.filter((_, i) => i !== n);
      return draw(s);
    }
    case 'eddrchipdel': { // un lieu retiré de la suite de route
      const r = edDrawerRow(s.ed),
        n = +b.dataset.n;
      if (r && Number.isInteger(n) && n >= 0) r.route = r.route.filter((_, i) => i !== n);
      return draw(s);
    }
    case 'edtodo':
      s.ed.todoOpen = !s.ed.todoOpen;
      return draw(s);
    case 'edmap':
      s.ed.mapOpen = !s.ed.mapOpen;
      return draw(s);
    case 'edmapfit': // « Recentrer » : la vue revient au cadre de la mission (rien n'est redessiné)
      return EM.fit();
    case 'edstep':
      if (!ED.OPEN.includes(b.dataset.step)) return;
      // un groupe touché se déplie ; déjà déplié, il se replie (un seul à la fois)
      s.ed.step = s.ed.step === b.dataset.step ? '' : b.dataset.step;
      // la première ouverture des Équipes lit celles du fichier ; ensuite, les lignes retouchées sont gardées d'une étape à l'autre
      if (s.ed.step === 'teams' && !s.ed.teams) s.ed.teams = ED.teamsOf(s.ed.base);
      // les lieux lus du document au cadre déjà retouché (le départ et l'arrivée portent le nom saisi au Cadre)
      if (s.ed.step === 'places' && !s.ed.places) s.ed.places = ED.placesOf(edDoc(s.ed));
      if (s.ed.step === 'story' && !s.ed.story) s.ed.story = ED.storyOf(s.ed.base);
      if (s.ed.step === 'risks' && !s.ed.risks) s.ed.risks = ED.risksOf(s.ed.base);
      if (s.ed.step === 'timeline' && !s.ed.events) s.ed.events = ED.eventsOf(s.ed.base);
      draw(s);
      // le groupe déplié vient à l'écran (sans faire sauter la page)
      return s.el.querySelector('[data-steps] [aria-current]')?.scrollIntoView?.({
        inline: 'nearest',
        block: 'nearest'
      });
    case 'edplace':
      s.ed.placeAsk = -1;
      s.ed.placeEdit = s.ed.placeEdit === +b.dataset.i ? -1 : +b.dataset.i;
      return draw(s);
    case 'edeventadd':
      s.ed.events = [...(s.ed.events || ED.eventsOf(s.ed.base)), {
        i: -1,
        at: 'H',
        place: '',
        text: ''
      }].slice(0, ED.EVENTS_MAX);
      draw(s);
      return s.el.querySelector(`[data-event="${s.ed.events.length - 1}"] [data-f=text]`)?.focus();
    case 'edeventdel':
      s.ed.events = (s.ed.events || []).filter((_, i) => i !== +b.dataset.i);
      return draw(s);
    case 'edmapspropose':
      // les cartes attendues d'après les lieux tels qu'ils sont à l'écran (des entrées ; une proposition ne se fait qu'une fois)
      s.ed.mapsAdd = [...(s.ed.mapsAdd || []), ...ED.proposedMaps(edDoc(s.ed))];
      return draw(s);
    case 'edrisk':
      s.ed.riskEdit = s.ed.riskEdit === +b.dataset.i ? -1 : +b.dataset.i;
      return draw(s);
    case 'edriskok':
      s.ed.riskEdit = -1;
      return draw(s);
    case 'edriskdel':
      s.ed.risks = (s.ed.risks || []).filter((_, i) => i !== +b.dataset.i);
      s.ed.riskEdit = -1;
      return draw(s);
    case 'edriskadd':
      s.ed.risks = [...(s.ed.risks || ED.risksOf(s.ed.base)), {
        i: -1,
        hazard: '',
        consequence: '',
        mitigation: ''
      }].slice(0, ED.RISKS_MAX);
      s.ed.riskEdit = s.ed.risks.length - 1;
      draw(s);
      return s.el.querySelector(`[data-rkform="${s.ed.riskEdit}"] input`)?.focus();
    case 'edplaceok':
      s.ed.placeEdit = s.ed.placeAsk = -1;
      return draw(s);
    case 'edplacedel': {
      // SOG-0439 : un lieu encore cité se retire en deux temps (editor.js removePlace) ; le premier appui dit qui le cite
      // (le second, inerte une seconde ; la notification reste jusqu'à sa croix ou au second appui, qui la remplace)
      const i = +b.dataset.i,
        row = s.ed.places?.[i],
        note = {
          key: 'missions-place-cited',
          ms: 3600e3
        },
        r = ED.removePlace(s.ed.places, i, edDoc(s.ed), s.ed.placeAsk ?? -1, Date.now() - (s.ed.placeAskAt || 0));
      if (r.wait) return;
      if (r.ask >= 0) {
        s.ed.placeAskAt = Date.now();
        s.ctx.notify(citedText(s.tt, row, r.cited), 'warn', note);
      } else {
        s.ed.placeEdit = -1;
        if (r.cited.length) s.ctx.notify(removedText(s.tt, row), 'ok', {
          key: note.key
        });
      }
      s.ed.places = r.rows;
      s.ed.placeAsk = r.ask;
      return draw(s);
    }
    case 'edplaceadd': {
      const kind = ['target', 'zone', 'pt', 'rdv', 'object'].includes(b.dataset.kind) ? b.dataset.kind : 'pt',
        list = s.ed.places || [],
        n = list.filter(r => r.kind === kind).length + 1;
      if (n > ED.PLACES_MAX || (kind === 'target' && n > 1)) return;
      const row = {
        kind,
        i: -1,
        id: ED.nextPlaceId(list, kind, s.ed.base), // SOG-0439 : un identifiant libre
        name: '',
        role: '',
        lat: '',
        lon: '',
        ...(kind === 'zone' ? {
          zkind: '',
          radius: '',
          tot: '',
          poly: 0
        } : kind === 'rdv' ? {
          participants: ''
        } : kind === 'object' ? {
          okind: '',
          range: '',
          height: '',
          alt: '',
          confirm: true, // trouvé à portée ET sur la parole du pilote : le défaut du format
          moving: false
        } : {})
      };
      // la nouvelle ligne rejoint les lieux de sa sorte (l'ordre du fichier : cible, zones, points, rendez-vous, objets)
      const order = ['dep', 'arr', 'target', 'zone', 'pt', 'rdv', 'object'],
        at = list.findIndex(r => order.indexOf(r.kind) > order.indexOf(kind));
      s.ed.places = at < 0 ? [...list, row] : [...list.slice(0, at), row, ...list.slice(at)];
      s.ed.placeEdit = at < 0 ? s.ed.places.length - 1 : at;
      draw(s);
      return s.el.querySelector(`[data-plform="${s.ed.placeEdit}"] input`)?.focus();
    }
    case 'edteamadd':
      s.ed.teams = [...(s.ed.teams || ED.teamsOf(s.ed.base)), {
        i: -1,
        name: '',
        service: '',
        type: '',
        role: ''
      }].slice(0, ED.TEAMS_MAX);
      draw(s);
      return s.el.querySelector(`[data-team="${s.ed.teams.length - 1}"] input`)?.focus();
    case 'edteamdel':
      s.ed.teams = (s.ed.teams || []).filter((_, i) => i !== +b.dataset.i);
      return draw(s);
    case 'edcancel':
      s.ed = null;
      draw(s);
      if (s.reg) regLoad(s);
      return;
  }
}
