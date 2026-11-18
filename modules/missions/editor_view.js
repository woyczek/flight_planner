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
// Les outils (deuxième brique) : au-dessus de la carte, Sélection, Point, Zone, Objet (s.ed.tool ; pris en main SUR PLACE), « Annuler le
// geste » (s.ed.mapUndo : createUndo du socle, les états des lignes des Lieux d'avant chaque geste de la carte) et « Recentrer » ; le
// lieu choisi (s.ed.mapSel, son rang) ; les gestes finis de la carte retouchent les lignes par ED.newPlace, movePlace, placeRadius.
// Le contour (troisième brique) : la forme d'une zone dans sa fiche (« Changer en polygone » / « Changer en cercle » : ED.toContour,
// toRound) ; les sommets du contour choisi sur la carte (ED.moveVertex, insertVertex ; s.ed.mapVertex : le sommet choisi, pour
// « Retirer ce sommet ») ; « Dessiner sur la carte » depuis la fiche d'un tiroir (s.ed.drawFor : sa lettre — ce qui est posé devient sa
// clé) ; une ligne des Lieux ouverte est le lieu choisi sur la carte.
// Tracé (push 3b) : la route du départ en pastilles sous la liste des Lieux (s.ed.route : ses identifiants retouchés, ED.withRoute dans
// edDoc) ; l'outil « Tracé » de la carte ajoute le lieu touché à la route choisie — celle du départ, ou la suite de route du tiroir
// choisi dans le déroulé — et reste en main ; la suite de route du tiroir choisi est dessinée sur la carte.
// Les repères de la base aéronautique : quand la vue s'arrête (au zoom 7 et au-delà), l'écran demande à ctx.aerodb les aérodromes,
// balises, points et points VFR du cadre et les rend à la carte (EM.refData les borne) ; un repère touché en Sélection (s.ed.mapRef)
// dit ce qu'il est dans la ligne et « Ajouter comme point » se montre à côté — le toucher ne crée rien.
// « Chercher un repère » par son nom : un champ sous le cadre (s.ed.refSeek, s.ed.seekRows) ; la vue se centre sur le repère trouvé,
// dit et cerclé comme un repère touché (edRefSeek, edSeekGo) — la base confirme chaque candidat, jamais un lieu à marqueur local.
// « Vue du pilote » (SOG-0448) : le sélecteur « Vue de la carte » sous le cadre (s.ed.mapView : -1 tout, 0 au départ, n après le
// tiroir n) ; en vue du pilote la carte ne dessine que ce que MS.pilotView garde (edPilotRows) et ne fait que montrer.
// Les outils en icônes (SOG-0471, points 1 à 3) : chaque outil, « Annuler le geste », « Rétablir », « Recentrer », « Rapide » et
// « Relief » est un bouton du jeu d'icônes de la suite (frame/lib/icons.js : ED_ICONS, l'icône de « Recentrer » est celle de la Carte),
// avec son nom lu (aria-label) et en infobulle (title) en quatre langues. Tant qu'une icône du jeu manque, les boutons gardent leur nom
// écrit (edIcons : tout ou rien, jamais une rangée mêlée). L'outil « Zone » porte la forme de la zone qu'il pose (s.ed.zoneShape :
// 'round' ou 'contour', ED.toContour) ; un second toucher sur l'outil déjà choisi, ou un appui long (edToolHold), en change.
// « Rétablir » (s.ed.mapRedo, le même createUndo, les mêmes états qu'« Annuler le geste » : edMapSnap) rejoue le dernier geste annulé ;
// tout geste neuf, toute retouche de la fiche le vide (edUndoClear).
// « Placer l'avion ici » : pendant un essai des clés, un bouton à côté de la ligne de l'outil (s.ed.trial.putting) ; le toucher suivant
// de la carte ajoute une pose à s.ed.trial.puts ({ min, lat, lon } à la minute du curseur) ; le moteur de l'essai la joue.
//
// L'écran (SOG-0444, lot P1 ; modules/missions/EDITOR.md « Porting the workshop ») : la carte de la mission (lot P1 : le croquis des
// lieux, sans outil) et le déroulé (« Au départ », puis les tiroirs du fichier, lus tels quels) ; la fiche du départ — les six étapes
// en six groupes repliables, un seul déplié (s.ed.step ; '' : tous repliés) ; le pied : « Enregistrer », « À compléter (n) » qui ouvre
// la liste nommée, « Annuler ». Rien de ce qu'on peut presser n'est redessiné pendant la frappe (SOG-0449 : edRefresh).
//
// Les tiroirs (SOG-0445) : une ligne du déroulé se touche (s.ed.sel : 'start', ou la lettre du tiroir) et la fiche du tiroir prend la
// place de celle du départ — la clé, les textes, la suite de route ; « ＋ Tiroir » ; « Retirer ce tiroir ». Les lignes des tiroirs
// (s.ed.drawers, editor_drawers.js) ne sont créées qu'à la première retouche et s'écrivent dans edDoc avant que les références
// suivent les lieux ; ils comptent dans « À compléter ».
// Le déroulé est une LISTE VERTICALE (SOG-0467 ; l'utilisateur : « je préfère réduire le texte secondaire et étirer en hauteur ») — les
// lignes de liste de la suite (f-list, f-item, celles de la liste des missions) : « Au départ », un tiroir par ligne (sa marque, « Tiroir n
// · son titre », sa clé en une ligne), « ＋ Tiroir » ; aucun défilement en largeur. « ＋ Tiroir » n'ajoute plus rien d'office : il ouvre
// SUR PLACE, sous lui, le choix du TYPE (s.ed.kinds = 'new' ; DR.TYPES) — un type touché crée le tiroir avec cette clé (DR.keyed : ce
// qu'une clé neuve devine) et ouvre sa fiche ; la clé d'un tiroir existant se change par LE MÊME choix, dans sa fiche (s.ed.kinds =
// 'drawer') ; « ＋ Tiroir » retouché, ou « Annuler », le referme sans rien créer.
//
// « Lieux » en tête de la colonne de droite (SOG-0472, décision de l'ergonome) : un cadre (edPlacesCardHtml) où la liste des lieux — les
// lignes d'edPlacesHtml, un bouton par ligne — a une hauteur fixe et défile en elle-même ; la ligne choisie est marquée et les champs du
// lieu choisi sont SOUS la liste, dans le même cadre. Carte et liste sont liées : un lieu touché sur la carte choisit sa ligne et la fait
// venir à l'écran DANS la liste (edPlShow, après chaque dessin : la colonne ne défile pas) ; une ligne touchée choisit le lieu sur la
// carte. Au téléphone, le cadre se met sous la carte (l'ordre des blocs, en CSS). Les cinq autres groupes de la fiche gardent leur pli.
//
// Moins de texte (SOG-0467, l'avis de l'ergonome qui fait règle : on COUPE plutôt que rapetisser) : une phrase d'explication ne reste à
// l'écran que dans un état vide, une alerte ou une question ; les autres sont dans l'aide « Comment s'en servir » (missions-editor). Au
// plus UNE ligne de texte secondaire par groupe (une carte, un groupe de la fiche, la rangée d'outils de la carte), à la taille de
// f-muted, jamais plus petite ; la ligne qui dit le contenu d'un groupe ne se montre que replié. EDITOR.md § 7 octotricies.
//
// L'atelier voilé (SOG-0459 ; l'utilisateur, 18 nov. : « l'existence même des tiroirs est cachée par défaut, à tout le monde, auteur
// compris ; on choisit de dévoiler ») : une mission EXISTANTE ouverte par « Modifier » ou « Dupliquer » s'ouvre voilée (s.ed.veil,
// ED.veiledAt : sauf `state().fullView === true`) ; une mission créée est entière. Voilé, l'atelier ne montre que ce que le pilote voit
// au départ : le déroulé dit « Au départ » seul et porte « Dévoiler la mission complète » (sur TOUTE mission voilée : sa présence ne
// dit rien) ; ni tiroir, ni « Vue de la carte », ni essai ; les Lieux, la carte, le croquis, la route, les listes de lieux et
// « À compléter » ne montrent que les lignes que ED.veilHidden ne cache pas (s.ed.veilHide, pris à l'ouverture). LE VOILE EST UN
// FILTRE D'AFFICHAGE : les lignes cachées restent dans s.ed.places à leur rang, jamais retirées ni retouchées ; les tiroirs ne sont
// pas chargés (s.ed.drawers reste nul : ils ne sont pas réécrits). Pour TOUS les lieux d'une mission existante, la même règle : textes
// et positions se retouchent, retirer un lieu ou changer son identifiant demande de dévoiler (une notification, la même phrase) ; un
// lieu ajouté dans la séance (i = -1) se retire et se renomme librement.
//
// Départ et Arrivée du Cadre (SOG-0465) : LE champ de terrain de la suite, celui de Carburant (frame/lib/ad_field.js, appelé tel quel :
// sa complétion, sa liste, la ligne « XTST — Base Test » sous le champ). Un bloc par montage de l'atelier (edAd : créé au premier
// dessin, arrêté hors de l'atelier et au démontage, edAfter) ; module.js ne rend à l'atelier que input, change et click d'un bouton
// « ed… » : l'atelier pose ses propres écoutes (keydown, focusout, pointerdown, click) sur s.el, une fois par montage, et rend la
// main au bloc d'abord dans edInput. Le champ montre le CODE d'un terrain (ED.fieldText), le texte tel qu'écrit d'un lieu qui n'en est
// pas un ; un texte ne passe en majuscules et n'est un terrain que si la base le connaît (AD.known) ; ce qui est écrit ne change pas de
// forme (ED.withCadre) et rien ne l'est tant que le champ n'est pas touché.
//
// Un point tournant, une cible, un rendez-vous se choisissent aussi parmi les points de la base (SOG-0480) : le champ NOM de leur fiche
// est un SECOND bloc du même champ commun (createAdField, `points: true`, `near()` : la position du lieu, sinon le centre de la carte,
// sinon le départ), comme Départ et Arrivée. Un texte libre y reste tel quel ; le choix rend le CODE (le nom du lieu, comme « Ajouter
// comme point ») et la POSITION de la base (lat, lon du lieu) ; le format du fichier ne change pas (id, name, lat, lon). Écoutes, arrêt :
// celles du bloc des terrains (edAd), la liste cherchée dans la fiche (data-adform).
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
  createUndo
} from '../maps/lib/map_edit.js';
import * as MS from '../../frame/lib/mission.js';
import * as MT from '../../frame/lib/mission_themes.js';
import * as IC from '../../frame/lib/icons.js';
import * as RG from './registry.js';
import * as TR from './editor_trial.js';
import {
  createAdField
} from '../../frame/lib/ad_field.js'; // SOG-0465 : le champ de terrain de la suite (Départ, Arrivée), celui de Carburant
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
[data-module="missions"] .ms-atgrid{display:flex;flex-direction:column}
[data-module="missions"] .ms-atmain,[data-module="missions"] .ms-atside{display:contents} /* au téléphone : la carte, les Lieux, le déroulé, la fiche */
[data-module="missions"] .ms-atmap{order:1}
[data-module="missions"] .ms-atplaces{order:2}
[data-module="missions"] .ms-atflow{order:3}
[data-module="missions"] .ms-atsheet{order:4}
[data-module="missions"] .ms-atplhead{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:8px;align-items:center;margin:0 0 8px}
[data-module="missions"] .ms-atplhead>h3{margin:0}
[data-module="missions"] .ms-pllist{position:relative;max-height:min(36dvh,264px);overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-pllist>.ms-plrow{display:block;padding:0}
[data-module="missions"] .ms-pllist>.ms-plrow:last-child{border-bottom:0}
[data-module="missions"] .ms-plpick{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;align-items:center;width:100%;min-height:48px;margin:0;padding:6px 8px;border:0;border-radius:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}
[data-module="missions"] .ms-plpick>*{pointer-events:none}
[data-module="missions"] .ms-plpick[aria-current]{background:var(--sog-surface-2,#eef);box-shadow:inset 3px 0 0 var(--sog-accent,#1a73e8)}
[data-module="missions"] .ms-atplaces [data-edplaces]>.ms-plform{border-bottom:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-atmap{margin:0 0 12px}
[data-module="missions"] .ms-atmapbtn{min-height:44px}
[data-module="missions"] .ms-atmapbody{display:none;margin-top:8px}
[data-module="missions"] .ms-atmap[data-open="1"] .ms-atmapbody{display:block}
[data-module="missions"] .ms-atmapframe{position:relative;height:300px;overflow:hidden;box-sizing:border-box;border:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-atmapslot,[data-module="missions"] .ms-atsketch{position:absolute;inset:0}
${EM.MAP_CSS}[data-module="missions"] .ms-atsketch{display:flex;align-items:center;justify-content:center;background:var(--sog-bg,#fff)}
[data-module="missions"] .ms-atsketch[hidden]{display:none}
[data-module="missions"] .ms-atsketch .ms-thumb{margin-top:0;width:100%;height:100%;border:0}
[data-module="missions"] .ms-atmaptools{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}
[data-module="missions"] .ms-atmaptools button{min-height:44px;padding-left:10px;padding-right:10px}
[data-module="missions"] .ms-atmaptools button[aria-pressed="true"]{border-color:var(--sog-accent);box-shadow:inset 0 0 0 1px var(--sog-accent)}
[data-module="missions"] .ms-atmaptools .ms-atmapend{margin-left:auto}
[data-module="missions"] .ms-atico{-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
[data-module="missions"] .ms-atico[data-icon]{min-width:44px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center}
[data-module="missions"] .ms-atico>svg{pointer-events:none}
[data-module="missions"] .ms-atseek{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px;margin:8px 0 0}
[data-module="missions"] .ms-atseek>label{flex:1 1 160px;margin:0}
[data-module="missions"] .ms-atseek input{width:100%;min-height:44px}
[data-module="missions"] .ms-atseek>button{flex:0 0 auto;min-height:44px}
[data-module="missions"] .ms-atseekout{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
[data-module="missions"] .ms-atseekout:empty{display:none}
[data-module="missions"] .ms-atseekout>p{flex:1 1 100%;margin:0}
[data-module="missions"] .ms-atseekout>button{min-height:44px}
[data-module="missions"] .ms-atmapview{margin:8px 0 0}
[data-module="missions"] .ms-atmapview select{width:100%;min-height:44px}
[data-module="missions"] .ms-atmaphintrow{display:flex;align-items:center;gap:8px;margin:0 0 6px;min-height:44px}
[data-module="missions"] .ms-atmaphint{margin:0;flex:1 1 auto}
[data-module="missions"] .ms-atmaphintrow>button{flex:0 0 auto;min-height:44px}
[data-module="missions"] .ms-atmaphintrow>button[hidden]{display:none}
[data-module="missions"] .ms-atmaphintrow>button[aria-pressed="true"]{border-color:var(--sog-accent);box-shadow:inset 0 0 0 1px var(--sog-accent)}
[data-module="missions"] .ms-atflowlist{margin:0}
[data-module="missions"] .ms-atpart{font:inherit;cursor:pointer;border-left:4px solid var(--sog-muted,#888)}
[data-module="missions"] .ms-atpart[data-kind=start]{border-left-color:var(--ok,#1e7e34)}
[data-module="missions"] .ms-atpart[aria-current]{outline:2px solid var(--sog-accent,#1a73e8);outline-offset:-2px}
[data-module="missions"] .ms-atpart>*,[data-module="missions"] .ms-kind>*{pointer-events:none;min-width:0}
[data-module="missions"] .ms-atparthead{display:flex;gap:6px;align-items:baseline}
[data-module="missions"] .ms-atparthead>b{overflow-wrap:anywhere}
[data-module="missions"] .ms-atpart>.f-muted,[data-module="missions"] .ms-kind>.f-muted{grid-column:1 / -1}
[data-module="missions"] .ms-atpart .ms-stepmark{display:inline-block;font-size:.9em}
[data-module="missions"] button.ms-atadd{grid-template-columns:minmax(0,1fr);justify-items:center;border-style:dashed;border-left-width:1px;font-weight:600}
[data-module="missions"] .ms-kinds{margin:0 0 0 16px;padding-left:10px;border-left:2px solid var(--sog-accent,#1a73e8)}
[data-module="missions"] .ms-kind{font:inherit;cursor:pointer}
[data-module="missions"] .ms-kind>b{font-weight:600}
[data-module="missions"] .ms-kind>b::first-letter{text-transform:uppercase}
[data-module="missions"] .ms-kind[aria-pressed="true"]{border-color:var(--sog-accent,#1a73e8);box-shadow:inset 0 0 0 1px var(--sog-accent,#1a73e8)}
[data-module="missions"] .ms-kinds>.ms-kindoff{justify-self:start;min-height:44px}
[data-module="missions"] .ms-dgrp{border-top:1px solid var(--sog-line,#ddd);padding:8px 0 4px}
[data-module="missions"] .ms-dgrp>h4{margin:4px 0 8px}
[data-module="missions"] .ms-dgrp .f-row{align-items:flex-start}
[data-module="missions"] .ms-dgrp .f-row>.f-field{flex:1 1 10em;min-width:0}
[data-module="missions"] .ms-dgrp textarea,[data-module="missions"] .ms-dgrp select,[data-module="missions"] .ms-dgrp input:not([type=checkbox]){width:100%;box-sizing:border-box;font:inherit}
[data-module="missions"] .ms-dgrp textarea{resize:vertical}
[data-module="missions"] .ms-dgrp[data-open=""]>.ms-dbody{display:none}
[data-module="missions"] .ms-dsum{grid-template-columns:auto minmax(0,1fr)}
[data-module="missions"] .ms-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
[data-module="missions"] .ms-edsub{margin-top:12px;padding-top:10px;border-top:1px solid var(--sog-line,#ddd)}
[data-module="missions"] .ms-edsub>h4{margin:0 0 4px}
[data-module="missions"] .ms-pilot{border:1px solid var(--sog-line,#ddd);padding:8px 10px;margin:0 0 8px;background:var(--sog-bg,#fff)}
[data-module="missions"] .ms-pilot p{margin:.3em 0}
[data-module="missions"] .ms-pilot p:empty{display:none}
[data-module="missions"] .ms-pilot .ms-pre{white-space:pre-wrap;overflow-wrap:anywhere}
[data-module="missions"] .ms-pilot .ms-attag{font-size:var(--sog-size-s);font-weight:600}
[data-module="missions"] .ms-chip{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--sog-line,#ddd);padding:0 0 0 10px;min-height:44px}
[data-module="missions"] .ms-chip>button{min-width:44px;min-height:44px;border:0;background:none;font:inherit;color:inherit}
[data-module="missions"] .ms-chip:has(>.ms-chipname){padding:0}
[data-module="missions"] .ms-chip>.ms-chipname{padding:0 4px 0 10px;text-align:left}
[data-module="missions"] .ms-chip.ms-chipfixed{padding:0 10px;background:color-mix(in srgb,var(--sog-line,#ddd) 35%,transparent)}
[data-module="missions"] .ms-chip[data-chipsel]{border-color:var(--sog-accent,#1a6fd4);box-shadow:inset 0 0 0 1px var(--sog-accent,#1a6fd4)}
[data-module="missions"] .ms-chip[data-chipsel]>.ms-chipname{font-weight:600}
[data-module="missions"] .ms-chipmove{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px}
[data-module="missions"] .ms-chipmove>p{flex:1 1 100%;margin:0}
[data-module="missions"] .ms-chipmove>p[hidden]{display:none}
[data-module="missions"] .ms-chipmove>button{min-height:44px}
[data-module="missions"] .ms-atflowhead{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
[data-module="missions"] .ms-atflowhead>h3{margin:0}
[data-module="missions"] .ms-trstate{display:block;font-size:var(--sog-size-s);font-weight:600;color:var(--sog-muted,#666)}
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
[data-module="missions"] .ms-atline{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--sog-size-s)}
[data-module="missions"] :is(.ms-atgrp, .ms-dgrp)[data-open="1"]>.ms-atsum>.ms-atline{display:none} /* déplié, le groupe montre son contenu : sa ligne se tait */
[data-module="missions"] .ms-atgrp[data-open="1"]>.ms-atsum{font-size:1.05em}
[data-module="missions"] .ms-atbody{padding:2px 0 10px;min-width:0}
[data-module="missions"] .ms-atbody>h3{display:none}
[data-module="missions"] .ms-atbody .f-row{align-items:flex-start}
[data-module="missions"] .ms-atbody .f-row>.f-field{flex:1 1 10em;min-width:0}
[data-module="missions"] .ms-atbody .f-row.ms-adrow{position:relative} /* SOG-0465 : la liste des terrains proposés s'y pose */
[data-module="missions"] .ms-adrow>.f-field{scroll-margin-top:calc(var(--f-head-h,57px) + 8px)} /* monté en haut de la vue au focus (edAdRoom), sous l'en-tête */
[data-module="missions"] .ms-adname{display:block;height:1.4em;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--sog-size-s);color:var(--sog-muted)} /* hauteur réservée, même vide : rien ne bouge */
[data-module="missions"] .ms-adname[data-state="unknown"]{font-style:italic}
[data-module="missions"] .ms-adsug{position:absolute;left:0;right:0;z-index:30;display:grid;grid-template-columns:minmax(0,1fr);gap:0;margin:0;background:var(--sog-surface,#fff);border:1px solid var(--sog-border,#ccc);box-shadow:var(--sog-shadow)} /* par-dessus la fiche, jamais dans la mise en page */
[data-module="missions"] .ms-adsug[hidden]{display:none}
[data-module="missions"] .ms-adsug .fu-sugitem{display:block;width:100%;min-height:44px;text-align:left;border-width:0 0 1px;border-radius:0;background:transparent}
[data-module="missions"] .ms-adsug .fu-sugitem:last-child{border-bottom-width:0}
[data-module="missions"] .ms-adsug .fu-sugitem[aria-selected="true"]{background:var(--sog-surface-2);box-shadow:inset 3px 0 0 var(--sog-accent)}
[data-module="missions"] .ms-adsug .fu-sugitem span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="missions"] .ms-atbody textarea{width:100%;box-sizing:border-box;resize:vertical;font:inherit}
[data-module="missions"] .ms-plcheck{display:flex;gap:8px;align-items:center;min-height:44px;margin:4px 0}
[data-module="missions"] .ms-atbody .ms-plbody>.f-muted{white-space:normal;overflow:visible} /* le détail d'un lieu n'est jamais coupé */
[data-module="missions"] .ms-plcheck>input{flex:0 0 auto;width:20px;height:20px}
[data-module="missions"] .ms-plfold{margin:4px 0 8px}
[data-module="missions"] .ms-plfold>summary{min-height:44px;display:flex;align-items:center;cursor:pointer}
[data-module="missions"] .ms-atbody .ms-edteam{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}
[data-module="missions"] .ms-atbody .ms-edteam>.ms-edtdel{grid-column:3;grid-row:1 / span 2}
[data-module="missions"] .ms-atbody .ms-edthead{display:none}
[data-module="missions"] .ms-atbody .ms-tlabel{display:block;font-size:var(--sog-size-s)} /* SOG-0467 : jamais plus petit que f-muted */
[data-module="missions"] .ms-atbody .ms-evrow{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}
[data-module="missions"] .ms-atbody .ms-evrow>.ms-evtext{grid-column:1 / span 2}
[data-module="missions"] .ms-atfoot{position:sticky;bottom:var(--f-tab-space,0px);margin-top:auto;background:var(--sog-bg,#fff);border-top:1px solid var(--sog-line,#ddd);z-index:2}
[data-module="missions"] .ms-atbar{display:flex;gap:8px;align-items:center;padding:8px 0}
[data-module="missions"] .ms-atbar>.ms-attodobtn{margin-left:auto} /* « Enregistrer » et « Annuler » collés, « À compléter » au bout (SOG-0454) */
[data-module="missions"] .ms-attodobtn .ms-attodofirst{display:none}
[data-module="missions"] .ms-attodobtn>*,[data-module="missions"] .ms-atsum>*{pointer-events:none}
[data-module="missions"] .ms-attodo{margin:8px 0 0;max-height:40dvh;overflow:auto}
[data-module="missions"] .ms-attodo[hidden]{display:none}
@container (min-width: 850px){
  [data-module="missions"] .ms-atgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(22em,26em);gap:16px;align-items:start}
  [data-module="missions"] .ms-atmain,[data-module="missions"] .ms-atside{display:block}
  [data-module="missions"] .ms-atmapbtn{display:none}
  [data-module="missions"] .ms-atmapbody{display:block;margin-top:0}
  [data-module="missions"] .ms-atmapframe{height:min(46dvh,440px)}
  /* la carte et le déroulé restent en vue pendant que la fiche défile (l'ergonome, 18 nov.) */
  [data-module="missions"] .ms-atmain{position:sticky;top:var(--f-pane-top,70px);align-self:start}
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
    s.ed.start = edDoc(s.ed); // ce qu'« Annuler » compare : rien de saisi, rien à perdre (SOG-0454)
    edDeclare(s);
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
    // le départ et l'arrivée tels que le Cadre les montrait à l'ouverture : ce que la réponse de la base remplace (edRecode), sauf une saisie
    cadreAuto: {
      dep: cadre.dep,
      arr: cadre.arr
    },
    path: mode === 'edit' ? path : '',
    regIdx: mode === 'edit' ? line.idx : -1,
    regId: mode === 'edit' ? cut(line.raw?.id, 40) : '',
    origId: mode === 'edit' ? line.row.id : '',
    pending: mode === 'edit' && got.pending,
    regSeries,
    // SOG-0459 : une mission existante s'ouvre voilée — la règle ne dépend jamais de ce que la mission cache (ED.veiledAt)
    veil: ED.veiledAt(mode, state()?.fullView),
    veilHide: ED.veilHidden(base)
  };
  if (mode === 'dup') s.ed.start = edDoc(s.ed); // une copie pas encore retouchée se quitte sans question (SOG-0454)
  edDeclare(s);
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
    // SOG-0467 : une indication au plus — en modification, « l'ancien est gardé » quand l'identifiant change ; sinon la série suivante
    idHint = e.mode === 'edit' && c.id.toUpperCase() !== e.origId ? s.tt(TX.edIdKept) : '',
    seriesHint = e.mode === 'edit' ? '' : s.tt(TX.edNextSeries, {
      n: num.nextSeries
    }),
    // SOG-0465 : Départ et Arrivée, le champ de terrain de la suite (frame/lib/ad_field.js) — le code d'un terrain dans le champ (son nom
    // dessous, data-adline), le texte d'un lieu qui n'est pas un terrain ; la liste des propositions posée dans la rangée (data-adsug)
    AD = edAd(s),
    ad = (k, label, v) => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="${k}" value="${esc(ED.fieldText(v))}" maxlength="160" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ed-adsug" placeholder="${esc(s.tt(TX.edPlaceHint))}"><small class="ms-adname" data-adline="${k}"></small></label>`,
    ads = `<div class="f-row ms-adrow">${ad('eddep', TX.edDep, c.dep)}${ad('edarr', TX.edArr, c.arr)}<div class="ms-adsug" id="ed-adsug" data-adsug role="listbox" aria-label="${esc(s.tt(AD.texts.listLabel))}" hidden></div></div>`;
  if (ED.liaison(c.family)) // une liaison (famille commerciale) : le Cadre réduit (décision du 13 nov.), six éléments
    return `<h3>1. ${esc(s.tt(TX.stepCadre))}</h3>
    <div class="f-row" data-liaison>${field('edfam', TX.edFamily, sel('edfam', edFamilies(s, lang), c.family))}${subs.length ? field('edsub', TX.edCharge, sel('edsub', subs, c.subtype)) : ''}</div>
    ${ads}
    <div class="f-row">${field('edco', TX.edAirline, coSelect(s, 'edco', c.airline || MS.PERSONAL))}${field('edac', TX.edAircraft, text('edac', c.aircraft, ' maxlength="12" autocapitalize="characters" placeholder="A320"'))}</div>
    ${field('edtitle', TX.edTitle, text('edtitle', c.title, ' maxlength="200"'))}
    <div class="f-row">${field('edid', TX.edId, text('edid', c.id, ' maxlength="5" autocapitalize="characters"'), idHint)}${field('edser', TX.edSeries, text('edser', c.series, ` inputmode="numeric" maxlength="5"${e.regSeries ? ` placeholder="${esc(e.regSeries)}"` : ''}`), idHint ? '' : seriesHint)}</div>`;
  return `<h3>1. ${esc(s.tt(TX.stepCadre))}</h3>
    <div class="f-row">${field('edfam', TX.edFamily, sel('edfam', edFamilies(s, lang), c.family))}${subs.length ? field('edsub', TX.edSubtype, sel('edsub', subs, c.subtype)) : ''}</div>
    <div class="f-row">${field('edser', TX.edSeries, text('edser', c.series, ` inputmode="numeric" maxlength="5"${e.regSeries ? ` placeholder="${esc(e.regSeries)}"` : ''}`), idHint ? '' : seriesHint)}${field('edid', TX.edId, text('edid', c.id, ' maxlength="5" autocapitalize="characters"'), idHint)}</div>
    ${field('edtitle', TX.edTitle, text('edtitle', c.title, ' maxlength="200"'))}
    ${field('edth', TX.edTheatre, sel('edth', theatres.map(t => ({ code: t, label: t })), c.theatre))}
    ${ads}`;
}

/** Le document en cours d'édition : le fichier lu, puis le cadre, les équipes et les lieux retouchés (une étape jamais ouverte ne
 *  retouche rien ; les lieux après le cadre : le nom du départ vient du Cadre, sa position des Lieux). */
function edDoc(e, cadre = e.cadre) {
  let d = ED.withCadre(e.base, cadre);
  if (e.teams) d = ED.withTeams(d, e.teams);
  if (e.places) d = ED.withPlaces(d, e.places);
  if (e.route) d = ED.withRoute(d, e.route); // SOG-0444, Tracé : la route du départ retouchée (avant que les références suivent les lieux)
  if (e.story) d = ED.withStory(d, e.story);
  if (e.risks) d = ED.withRisks(d, e.risks);
  if (e.events) d = ED.withEvents(d, e.events);
  if (e.mapsAdd?.length) d = ED.withMaps(d, e.mapsAdd);
  if (e.mapWant) d = ED.withMapLook(d, e.mapWant); // SOG-0456 : le fond et la couche de la carte, choisis par l'auteur
  if (e.drawers) d = DR.withDrawerRows(d, e.drawers); // SOG-0445 : les tiroirs retouchés (une zone et un objet y sont cités, jamais écrits)
  return ED.withRefs(d, e.base, e.places); // SOG-0439 : après toutes les étapes, les références suivent les lieux renommés ou retirés
}

/** Les lignes des Lieux que l'écran montre (SOG-0459) : toutes, sauf dans l'atelier voilé où une ligne cachée au départ devient null
 *  (ED.veilRows : les rangs ne bougent pas, rien n'est retiré de s.ed.places). */
const edShown = (e, rows) => e?.veil ? ED.veilRows(rows, e.veilHide) : rows;

/** Vrai quand la ligne de rang `i` des Lieux de la séance est cachée par le voile (une page forgée ne la retouche pas). */
function edHid(e, i) {
  if (!e?.veil || !Number.isInteger(i)) return false;
  const rows = e.places || ED.placesOf(edDoc(e));
  return !!rows[i] && edShown(e, rows)[i] === null;
}

/** « À compléter » de la séance : ED.todo, ou dans l'atelier voilé ED.veilTodo (rien du caché, ni tiroir ni lieu caché). */
function edTodos(e, doc) {
  return e?.veil ? ED.veilTodo(doc, edShown(e, e.places || ED.placesOf(doc))) : ED.todo(doc);
}

/** Le document où l'on cherche QUI CITE un lieu avant de le retirer (SOG-0459, retouche de Sécurisation) : celui de la séance ; dans
 *  l'atelier voilé, sans ses `phases` — un lieu neuf à qui l'on donne l'identifiant qu'un tiroir caché cite (« ZONE-1 » se devine)
 *  ne doit pas faire dire « cité par : clé du tiroir 2 » (une sonde). Le document enregistré, lui, garde ses tiroirs intacts : seul
 *  le message change (withRefs ne suit que les lieux du fichier). */
function edCiteDoc(e) {
  const d = edDoc(e);
  if (!e?.veil || !d || typeof d !== 'object') return d;
  const out = {
    ...d
  };
  delete out.phases;
  return out;
}

/** Vrai quand une étape de la fiche n'a rien à compléter (edTodos : la marque ✓ ou !). */
const edStepOk = (e, doc, step) => !edTodos(e, doc).some(t => t.step === step);

/** L'étape Équipes : une ligne par équipe (indicatif, service, type OACI, rôle), « Retirer » ; « + Équipe » ajoute une ligne. */
function edTeamsHtml(s) {
  const rows = s.ed.teams || [],
    inp = (i, f, v, label, extra = '') => `<label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(label))}</span><input data-k="edteam" data-i="${i}" data-f="${f}" value="${esc(v)}" placeholder="${esc(s.tt(label))}" autocomplete="off"${extra}></label>`;
  return `<h3>2. ${esc(s.tt(TX.stepTeams))}</h3>
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

/** Les Lieux (la maquette editeur_lieux_*.png ; SOG-0472) : une ligne par lieu dans une liste de hauteur fixe qui défile — toucher une
 *  ligne la choisit (le lieu aussi sur la carte) et ouvre ses champs SOUS la liste ; « + Zone », « + Point tournant », « + Rendez-vous »
 *  (et « + Cible » sans cible) ; « Sur la carte » montre la mission dans la Carte ; la route du départ. `listOnly` : les lignes seules
 *  (SOG-0478, un geste en cours). Les lignes non encore retouchées sont lues du document (les rangs sont ceux d'edPlaces). */
function edPlacesHtml(s, listOnly = false) {
  const e = s.ed,
    rows = e.places || ED.placesOf(edDoc(e)),
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
    // dans l'atelier voilé, rien ne dit qu'un tiroir cite un lieu (SOG-0459)
    usedBy = i => e.veil ? [] : ED.citedBy(doc, rows, i).filter(c => c.where === 'drawerKey' || c.where === 'drawerActor').map(c => s.tt(
      EDTX.plKeyOf, {
        name: c.name
      })),
    // un objet à trouver : sa sorte, sa portée, « caché au pilote », le tiroir dont il est la clé (ou aucun), sa position
    objectDetail = (r, i) => [ok(r.okind), s.tt(EDTX.plHidden), ...(e.veil ? [] : usedBy(i).length ? usedBy(i) : [s.tt(EDTX.plNoDrawer)]), r
      .range ? s.tt(
        EDTX.plRangeIs, {
          r: dec(s, r.range)
        }) : '', r.moving ? s.tt(EDTX.plMoving) : '', dms(s, r.lat, r.lon)
    ].filter(Boolean).join(' · '),
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
        return `<div class="ms-plform" data-plform="${i}"><p class="f-muted" data-plid>${esc([r.id, r.moving ? s.tt(EDTX.plMoving) : ''].filter(Boolean).join(' · '))}</p>
        <div class="f-row">${field(i, 'name', TX.plName, r.name, ' maxlength="120"')}<label class="f-field"><span>${esc(s.tt(EDTX.plOKind))}</span><select data-k="edplace" data-i="${i}" data-f="okind"><option value=""></option>${[...new Set([...MS.OBJECT_KINDS, r.okind].filter(Boolean))].map(v => `<option value="${esc(v)}"${v === r.okind ? ' selected' : ''}>${esc(ok(v))}</option>`).join('')}</select></label></div>
        <div class="f-row">${field(i, 'lat', TX.plLat, r.lat, num)}${field(i, 'lon', TX.plLon, r.lon, num)}</div>
        <div class="f-row">${field(i, 'range', EDTX.plRange, r.range, num)}</div>
        <label class="ms-plcheck"><input type="checkbox" data-k="edplace" data-i="${i}" data-f="confirm"${r.confirm ? ' checked' : ''}><span>${esc(s.tt(EDTX.plConfirm))}</span></label>
        <details class="ms-plfold" data-plheights><summary>${esc(heights ? `${s.tt(EDTX.plHeightsOf)} — ${heights}` : s.tt(EDTX.plHeights))}</summary>
          <div class="f-row">${field(i, 'height', EDTX.plHeight, r.height, num)}${field(i, 'alt', EDTX.plAlt, r.alt, num)}</div></details>
        <div class="f-row"><button type="button" data-do="edplaceok">${esc(s.tt(TX.plDone))}</button><button type="button" data-do="edplacedel" data-i="${i}">${esc(s.tt(e.placeAsk === i ? EDTX.plRemoveAnyway : TX.plRemove))}</button></div></div>`;
      }
      // SOG-0480 : le Nom d'un point tournant, d'une cible ou d'un rendez-vous est le champ commun de la suite (points de la base compris) ;
      // sa liste est posée dans la rangée (data-adsug) ; les autres champs du lieu gardent data-k="edplace"
      const named = ['pt', 'target', 'rdv'].includes(r.kind),
        nameField = named ? `<label class="f-field"><span>${esc(s.tt(TX.plName))}</span><input data-k="edplname" data-i="${i}" data-f="name" value="${esc(r.name ?? '')}" maxlength="120" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ed-ptsug" placeholder="${esc(s.tt(EDTX.plNameHint))}"></label><div class="ms-adsug" id="ed-ptsug" data-adsug role="listbox" aria-label="${esc(s.tt(EDTX.plNameList))}" hidden></div>` : field(i, 'name', TX.plName, r.name, ' maxlength="120"');
      return `<div class="ms-plform" data-plform="${i}"${named ? ' data-adform' : ''}>${fixed ? '' : `<div class="f-row${named ? ' ms-adrow' : ''}">${field(i, 'id', TX.plId, r.id, ' maxlength="40"')}${nameField}</div>`}
        ${r.kind === 'zone' ? `<div class="f-row"><label class="f-field"><span>${esc(s.tt(TX.plKind))}</span><select data-k="edplace" data-i="${i}" data-f="zkind"><option value=""></option>${[...new Set(['search', 'mission', 'exclusion', r.zkind].filter(Boolean))].map(v => `<option value="${esc(v)}"${v === r.zkind ? ' selected' : ''}>${esc(zk(v))}</option>`).join('')}</select></label>${field(i, 'role', TX.plRole, r.role, ' maxlength="200"')}</div>` : fixed ? '' : field(i, 'role', TX.plRole, r.role, ' maxlength="200"')}
        ${r.kind === 'zone' && r.poly ? `<p class="f-muted" data-plshape="${r.ring ? 'contour' : 'kept'}">${esc(r.ring ? s.tt(EDTX.plContour, { n: r.poly }) : s.tt(TX.plPolyKept, { n: r.poly }))}</p>` : `<div class="f-row">${field(i, 'lat', TX.plLat, r.lat, num)}${field(i, 'lon', TX.plLon, r.lon, num)}</div>`}
        ${r.kind === 'zone' ? `<div class="f-row">${r.poly ? '' : field(i, 'radius', TX.plRadius, r.radius, num)}${field(i, 'tot', TX.plTotF, r.tot, ' inputmode="numeric" maxlength="5"')}</div>` : ''}
        ${r.kind === 'rdv' ? field(i, 'participants', TX.plParticipants, r.participants, ' maxlength="400"') : ''}
        <div class="f-row"><button type="button" data-do="edplaceok">${esc(s.tt(TX.plDone))}</button>${r.kind === 'zone' && (!r.poly || r.ring) ? `<button type="button" data-do="edzoneshape" data-i="${i}">${esc(s.tt(r.poly ? EDTX.plToRound : EDTX.plToContour))}</button>` : ''}${fixed ? '' : `<button type="button" data-do="edplacedel" data-i="${i}">${esc(s.tt(e.placeAsk === i ? EDTX.plRemoveAnyway : TX.plRemove))}</button>`}</div></div>`;
    },
    id = e.cadre.id.trim().toUpperCase(),
    shown = edShown(e, rows); // SOG-0459 : l'atelier voilé ne montre pas les lignes cachées (elles restent à leur rang)
  // « + Cible » : jamais dans l'atelier voilé (une cible cachée ne doit pas se deviner à son absence)
  // SOG-0472 : la ligne entière est le bouton qui choisit le lieu (sur la carte aussi) ; la ligne choisie est marquée
  const on = i => e.placeEdit === i || e.placeEdit < 0 && edMapSel(e) === i,
    list = rows.map((r, i) => !shown[i] ? '' : `<div class="ms-plrow" data-place="${i}" data-kind="${r.kind}"><button type="button" class="ms-plpick" data-do="edplace" data-i="${i}"${on(i) ? ' aria-current="true"' : ''}><span class="ms-plbadge">${esc(s.tt(badge[r.kind]))}</span><span class="ms-plbody"><b>${esc([r.id, r.name].filter(Boolean).join(' · ') || s.tt(TX.plUnplaced))}</b><span class="f-muted">${esc(detail(r, i))}</span></span></button></div>`).join('');
  if (listOnly) return list; // SOG-0478 : un geste en cours ne remplace que les lignes
  const open = e.placeEdit >= 0 && rows[e.placeEdit] && shown[e.placeEdit] ? form(rows[e.placeEdit], e.placeEdit) : '';
  return `<div data-edplaces><div class="ms-pllist" data-pllist>${list}</div>${open}</div>
    <div class="f-row ms-pladd">${e.veil || rows.some(r => r.kind === 'target') ? '' : `<button type="button" data-do="edplaceadd" data-kind="target">${esc(s.tt(TX.plAddTarget))}</button>`}<button type="button" data-do="edplaceadd" data-kind="zone">${esc(s.tt(TX.plAddZone))}</button><button type="button" data-do="edplaceadd" data-kind="pt">${esc(s.tt(TX.plAddPt))}</button><button type="button" data-do="edplaceadd" data-kind="rdv">${esc(s.tt(TX.plAddRdv))}</button><button type="button" data-do="edplaceadd" data-kind="object">${esc(s.tt(EDTX.plAddObject))}</button>${e.mode === 'edit' && id ? `<a class="f-linkbtn" data-plmap href="${esc(mapHref({ id }, {}))}">${esc(s.tt(TX.plOnMap))}</a>` : ''}</div>${edRouteHtml(s, rows)}`;
}

/** La route du départ de la séance : ses identifiants (s.ed.route quand elle a été retouchée, sinon ceux du fichier). */
const edRoute = e => e.route || ED.routeOf(edDoc(e));

/** Les pastilles de la route du départ : [{ n (le rang dans la route), id (le jeton écrit), text (ce qu'il dit : le code du terrain
 *  pour le départ et l'arrivée, sinon l'identifiant), fixed (une pastille ANCRÉE : le départ quand il est premier, l'arrivée quand
 *  elle est dernière — ED.routeFree) }]. */
function edRouteChips(e, rows) {
  const name = r => r.kind === 'dep' || r.kind === 'arr' ? String(r.name || '').split(' · ')[0] : r.id,
    by = new Map(rows.map(r => [ED.routeToken(r), r]).filter(x => x[0])),
    route = edRoute(e),
    {
      lo,
      hi
    } = ED.routeFree(route);
  return route.map((t, n) => ({
    n,
    id: t,
    text: (by.has(t) ? name(by.get(t)) : '') || t,
    fixed: n < lo || n > hi // le départ en tête, l'arrivée en queue : ancrés
  }));
}

/** Les pastilles de la suite de route d'un tiroir : celles que la fiche montre (un lieu cité qui n'existe plus n'en a pas). */
function edDrawerChips(e, r) {
  return r.route.map((w, n) => ({
    n,
    id: ED.refNow(w, e.base, e.places),
    text: ED.refNow(w, e.base, e.places)
  })).filter(c => c.id);
}

/** La pastille choisie d'une route (s.ed.chipSel : { where, n }) — `where` : 'start' pour la route du départ, sinon le tiroir de la
 *  fiche ; -1 quand aucune n'est choisie là. */
const edChipSel = (e, where) => e.chipSel && e.chipSel.where === where && Number.isInteger(e.chipSel.n) ? e.chipSel.n : -1;

/** Les pastilles d'une route : chacune dit son lieu par un bouton qui la CHOISIT (les deux flèches la déplacent alors) et se retire
 *  par sa croix. Une pastille ancrée (le départ et l'arrivée de la route du départ) dit seulement son lieu : ni bouton ni croix. */
function edChipsHtml(s, where, chips) {
  const sel = edChipSel(s.ed, where),
    start = where === 'start';
  return chips.map(c => c.fixed ? `<span class="ms-chip ms-chipfixed" data-chip="${esc(c.id)}" data-chipfixed>${esc(c.text)}</span>` : `<span class="ms-chip" data-chip="${esc(c.id)}"${c.n === sel ? ' data-chipsel' : ''}><button type="button" class="ms-chipname" data-do="edchippick" data-where="${start ? 'start' : 'drawer'}" data-n="${c.n}" aria-pressed="${c.n === sel}">${esc(c.text)}</button><button type="button" data-do="${start ? 'edroutedel' : 'eddrchipdel'}" data-n="${c.n}" aria-label="${esc(s.tt(start ? EDTX.rtChipDel : EDTX.dwChipDel, { id: c.text }))}">×</button></span>`).join('');
}

/** Où en est la pastille choisie parmi celles d'une route : { at (son rang parmi les pastilles montrées, -1 sans choix), first (elle
 *  ne peut pas avancer : aucune choisie, la première, ou la pastille d'avant est ancrée), last (elle ne peut pas reculer) }. */
function edChipEnds(chips, sel) {
  const at = chips.findIndex(c => c.n === sel && !c.fixed);
  return {
    at,
    first: at <= 0 || !!chips[at - 1].fixed,
    last: at < 0 || at >= chips.length - 1 || !!chips[at + 1].fixed
  };
}

/** Les deux flèches d'une route, sous ses pastilles : « ← Plus tôt » et « Plus tard → » déplacent la pastille choisie d'un rang (ni
 *  données avant qu'une pastille soit choisie ; la façon de faire est dans l'aide, SOG-0467). Rien pour une route de moins de deux lieux
 *  LIBRES (les ancres de la route du départ ne comptent pas). */
function edChipMoveHtml(s, where, chips) {
  const ends = edChipEnds(chips, edChipSel(s.ed, where)),
    w = where === 'start' ? 'start' : 'drawer',
    btn = (step, label, off) => `<button type="button" data-do="edchipmove" data-where="${w}" data-step="${step}"${off ? ' disabled' : ''}>${esc(s.tt(label))}</button>`;
  return chips.filter(c => !c.fixed).length < 2 ? '' : `<div class="ms-chipmove" data-chipmove="${w}">${btn(-1, EDTX.rtEarlier, ends.first)}${btn(1, EDTX.rtLater, ends.last)}</div>`;
}

/** Les pastilles et les flèches d'une route, remises SUR PLACE après un choix ou un déplacement (SOG-0449 : la flèche pressée n'est
 *  pas redessinée — on la presse plusieurs fois de suite) : un choix ne change que des attributs ; un déplacement réécrit les
 *  pastilles, pas les flèches. */
function edChipsShow(s, where, moved) {
  const e = s.ed,
    start = where === 'start',
    r = start ? null : edDrawerRow(e),
    chips = start ? edRouteChips(e, edPlaces(e)) : r ? edDrawerChips(e, r) : [],
    sel = edChipSel(e, where),
    ends = edChipEnds(chips, sel),
    box = s.el.querySelector(start ? '[data-rtchips]' : '[data-dwroute]'),
    row = s.el.querySelector(`[data-chipmove="${start ? 'start' : 'drawer'}"]`);
  if (box && moved) box.innerHTML = edChipsHtml(s, where, chips);
  else if (box)
    for (const chip of box.querySelectorAll('.ms-chip:not([data-chipfixed])')) {
      const name = chip.querySelector('.ms-chipname'),
        on = +name?.dataset.n === sel;
      chip.toggleAttribute('data-chipsel', on);
      name?.setAttribute('aria-pressed', String(on));
    }
  if (!row) return;
  const [earlier, later] = row.querySelectorAll('button');
  if (earlier) earlier.disabled = ends.first;
  if (later) later.disabled = ends.last;
}

/** La route du départ en pastilles (SOG-0444, Tracé ; jamais « des identifiants séparés par des virgules »), sous la liste des Lieux :
 *  chaque lieu dit son identifiant (le départ et l'arrivée : le code de leur terrain) et se retire par sa croix ; « Ajouter un
 *  lieu… » en ajoute un à la fin, comme l'outil « Tracé » de la carte. Soixante lieux au plus. */
function edRouteHtml(s, rows) {
  const e = s.ed,
    route = edRoute(e),
    name = r => r.kind === 'dep' || r.kind === 'arr' ? String(r.name || '').split(' · ')[0] : r.id,
    by = new Map(edShown(e, rows).filter(Boolean).map(r => [ED.routeToken(r), r]).filter(x => x[0])),
    options = [...by].map(([t, r]) => [t, [name(r), r.kind === 'dep' || r.kind === 'arr' ? '' : r.name].filter(Boolean).join(' · ')]);
  return `<div class="ms-edroute ms-edsub" data-edroute><h4>${esc(s.tt(EDTX.rtTitle))}</h4>${route.length ? '' : `<p class="f-muted">${esc(s.tt(EDTX.rtNone))}</p>`}
    <div class="ms-chips" data-rtchips>${edChipsHtml(s, 'start', edRouteChips(e, rows))}</div>${edChipMoveHtml(s, 'start', edRouteChips(e, rows))}
    ${route.length < ED.ROUTE_MAX ? `<label class="f-field"><span class="f-muted">${esc(s.tt(EDTX.dwRouteAdd))}</span><select data-k="edroute" data-f="add"><option value=""></option>${options.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>` : ''}</div>`;
}

/** L'étape Récit (cinq éléments : résumé, description, objectif principal, objectifs secondaires, charge). */
function edStoryHtml(s) {
  const t = s.ed.story || {},
    area = (f, label, v, rows, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><textarea data-k="edstory" data-f="${f}" rows="${rows}"${extra}>${esc(v)}</textarea>${f === 'summary' ? `<small class="f-muted" data-stcount>${esc(s.tt(TX.stCount, { n: String(v).length, m: ED.SUMMARY_MAX }))}</small>` : ''}</label>`,
    inp = (f, label, v, extra = '') => `<label class="f-field"><span>${esc(s.tt(label))}</span><input data-k="edstory" data-f="${f}" value="${esc(v)}" autocomplete="off"${extra}></label>`;
  return `<h3>4. ${esc(s.tt(TX.stepStory))}</h3>
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
  return `<h3>5. ${esc(s.tt(TX.stepRisks))}</h3>
    <div class="f-list" data-edrisks>${rows.length ? rows.map((r, i) => `<div class="ms-plrow ms-rkrow" data-risk="${i}"><span class="ms-plbody"><b>${esc(r.hazard || s.tt(TX.rkNoHazard))}${r.mitigation ? ` → ${esc(r.mitigation)}` : ''}</b>${r.consequence ? `<span class="f-muted">${esc(r.consequence)}</span>` : ''}</span><button type="button" class="f-linkbtn" data-do="edrisk" data-i="${i}">${esc(s.tt(TX.edModify))}</button>${e.riskEdit === i ? `<div class="ms-plform" data-rkform="${i}">${field(i, 'hazard', TX.rkHazard, r.hazard)}${field(i, 'consequence', TX.rkConsequence, r.consequence)}${field(i, 'mitigation', TX.rkMitigation, r.mitigation)}<div class="f-row"><button type="button" data-do="edriskok">${esc(s.tt(TX.plDone))}</button><button type="button" data-do="edriskdel" data-i="${i}">${esc(s.tt(TX.plRemove))}</button></div></div>` : ''}</div>`).join('') : `<p class="f-muted" data-norisk>${esc(s.tt(TX.rkNone))}</p>`}</div>
    ${rows.length < ED.RISKS_MAX ? `<div class="f-row ms-pladd"><button type="button" data-do="edriskadd">${esc(s.tt(TX.rkAdd))}</button></div>` : ''}`;
}

/** L'étape Chronologie et cartes : une ligne par événement (heure, lieu, ce qui se passe), « + Événement » ; puis les cartes déclarées
 *  et « Proposer les cartes depuis les lieux » (des entrées : les images se font au studio de la V2). */
function edTimelineHtml(s) {
  const e = s.ed,
    doc = edDoc(e),
    // jamais un objet caché au pilote ; dans l'atelier voilé, les seuls lieux montrés (SOG-0459)
    places = edShown(e, ED.placesOf(doc)).filter(p => p && p.id && !['dep', 'arr', 'object'].includes(p.kind)),
    // SOG-0439 : l'identifiant d'aujourd'hui du lieu cité ; SOG-0459 : dans l'atelier voilé, un lieu qui n'est pas montré se dit comme
    // « aucun lieu » — à l'écran SEULEMENT : la ligne de la séance garde la valeur du fichier tant que l'auteur ne choisit pas un lieu
    rows = (e.events || []).map(r => {
      const place = ED.refNow(r.place, e.base, e.places).toUpperCase();
      return {
        ...r,
        place: e.veil && place && !places.some(p => p.id.toUpperCase() === place) ? '' : place
      };
    }),
    maps = ED.mapsOf(doc),
    // les cartes proposées nomment les zones par leur rang : dans l'atelier voilé, elles ne se proposent pas (un rang dirait le caché)
    missing = e.veil ? [] : ED.proposedMaps(doc),
    opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`,
    row = (r, i) => `<div class="ms-edteam ms-evrow" data-event="${i}"><label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evAt))}</span><input data-k="edevent" data-i="${i}" data-f="at" value="${esc(r.at)}" placeholder="H+30mn" maxlength="20" autocomplete="off"></label><label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evPlace))}</span><select data-k="edevent" data-i="${i}" data-f="place">${opt('', s.tt(TX.evFree), r.place)}${[...places.map(p => [p.id.toUpperCase(), `${p.id}${p.name ? ` — ${p.name}` : ''}`]), ...(r.place && !places.some(p => p.id.toUpperCase() === r.place) ? [[r.place, r.place]] : [])].map(([v, l]) => opt(v, l, r.place)).join('')}</select></label><label class="f-field ms-evtext"><span class="ms-tlabel f-muted">${esc(s.tt(TX.evText))}</span><input data-k="edevent" data-i="${i}" data-f="text" value="${esc(r.text)}" maxlength="500" autocomplete="off"></label><button type="button" class="ms-edtdel" data-do="edeventdel" data-i="${i}" title="${esc(s.tt(TX.evDel))}" aria-label="${esc(s.tt(TX.evDel))}">✕</button></div>`;
  const storable = ED.eventsStorable(doc);
  return `<h3>6. ${esc(s.tt(TX.stepTimeline))}</h3>
    <div class="f-list" data-edevents>${rows.length ? `<div class="ms-edteam ms-evrow ms-edthead f-muted" aria-hidden="true">${[TX.evAt, TX.evPlace, TX.evText].map(l => `<span>${esc(s.tt(l))}</span>`).join('')}<span></span></div>${rows.map(row).join('')}` : storable ? `<p class="f-muted" data-noevent>${esc(s.tt(TX.evNone))}</p>` : ''}</div>
    ${!storable ? `<p class="f-muted" data-evnohome>${esc(s.tt(TX.evNoHome))}</p>` : rows.length < ED.EVENTS_MAX ? `<div class="f-row ms-pladd"><button type="button" data-do="edeventadd">${esc(s.tt(TX.evAdd))}</button></div>` : ''}
    <div class="ms-edsub" data-edmapsgrp><h4>${esc(s.tt(TX.mpTitle))}</h4>
    <div class="f-list" data-edmaps>${maps.length ? maps.map(m => `<div class="ms-plrow ms-rkrow" data-map="${esc(m.id)}"><span class="ms-plbody"><b>${esc(TX[`mt_${m.type}`] ? s.tt(TX[`mt_${m.type}`]) : m.type || m.id)}</b><span class="f-muted">${esc([m.description || m.id, m.unplaced ? s.tt(TX.mpUnplaced) : ''].filter(Boolean).join(' · '))}</span></span></div>`).join('') : `<p class="f-muted" data-nomap>${esc(s.tt(TX.mpNone))}</p>`}</div>
    ${missing.length ? `<div class="f-row ms-pladd"><button type="button" data-do="edmapspropose">${esc(s.tt(TX.mpPropose, { n: missing.length }))}</button></div>` : ''}</div>`;
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
    const n = edShown(s.ed, ED.placesOf(doc)).filter(p => p && !['dep', 'arr'].includes(p.kind)).length; // SOG-0459 : le visible seul
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

/** Le contenu d'un groupe déplié : le formulaire de son étape (inchangé). Les Lieux ont leur cadre (edPlacesCardHtml). */
const edGroupBody = (s, k) => k === 'teams' ? edTeamsHtml(s) : k === 'story' ? edStoryHtml(s) : k === 'risks' ? edRisksHtml(s) : k ===
  'timeline' ? edTimelineHtml(s) : edCadreHtml(s);

/** « Lieux » en tête de la colonne de droite (SOG-0472) : un cadre — sa marque (✓ ou !), son nom, son contenu en une ligne (les mêmes
 *  que ceux d'un groupe : edRefresh les suit), puis les Lieux (edPlacesHtml). */
function edPlacesCardHtml(s, doc) {
  const ok = edStepOk(s.ed, doc, 'places');
  return `<section class="f-card ms-atplaces" data-atplaces data-grp="places"><div class="ms-atplhead"><span class="ms-stepmark" data-kind="${ok ? 'ok' : 'warn'}" data-mark="places" aria-hidden="true">${ok ? '✓' : '!'}</span><h3>${esc(s.tt(TX.stepPlaces))}</h3><span class="ms-atline f-muted" data-line="places">${esc(edLine(s, doc, 'places'))}</span></div><div class="ms-atbody">${edPlacesHtml(s)}</div></section>`;
}

/** La fiche du départ (la partie A du fichier) : les six étapes de l'éditeur en six groupes repliables, un seul déplié à la fois ; chaque
 *  groupe dit son contenu en une ligne et porte sa marque (✓ ou !). */
function edSheetHtml(s, doc) {
  const names = edNames();
  return `<section class="f-card ms-atsheet" data-atsheet><h3>${esc(s.tt(EDTX.atSheet))}</h3>
    <div data-steps>${ED.STEPS.filter(k => k !== 'places').map(k => {
    const ok = edStepOk(s.ed, doc, k),
      open = s.ed.step === k;
    return `<div class="ms-atgrp" data-grp="${k}" data-open="${open ? '1' : ''}"><button type="button" class="ms-atsum" data-do="edstep" data-step="${k}" aria-expanded="${open}"${open ? ' aria-current="step"' : ''}><span class="ms-stepmark" data-kind="${ok ? 'ok' : 'warn'}" data-mark="${k}" aria-hidden="true">${ok ? '✓' : '!'}</span><b>${esc(s.tt(names[k]))}</b><span class="ms-atline f-muted" data-line="${k}">${esc(edLine(s, doc, k))}</span></button>${open ? `<div class="ms-atbody" data-edform>${edGroupBody(s, k)}</div>` : ''}</div>`;
  }).join('')}</div></section>`;
}

/** La ligne « Au départ » du déroulé : son nom et, en une ligne, les deux bouts de la mission. */
function edStartRowHtml(s, on) {
  const c = s.ed.cadre;
  return `<button type="button" class="f-item ms-atpart" data-do="edsel" data-sel="start" data-part="start" data-kind="start"${on ? ' aria-current="true"' : ''}><span class="ms-atparthead"><b>${esc(s.tt(EDTX.atStart))}</b></span><span class="f-muted" data-flowline>${esc(ED.liaisonTitle(c.dep, c.arr))}</span></button>`;
}

/** Le déroulé de la mission (SOG-0467 : une liste verticale, les lignes de liste de la suite) : « Au départ » (visible), puis un tiroir
 *  par ligne dans l'ordre — sa marque, « Tiroir n · son titre », sa clé en une ligne ; lus par le lecteur (frame/lib/mission.js) sur
 *  le document de la séance — et « ＋ Tiroir » (douze au plus), qui ouvre sous lui le choix du type (edKindsHtml). Une ligne se
 *  touche : sa fiche s'ouvre (SOG-0445). Les lignes sont des boutons : rien n'y est remplacé pendant la frappe (edRefresh). */
function edFlowHtml(s, doc, run = null) {
  const e = s.ed;
  // SOG-0459, l'atelier voilé : « Au départ » seul, et « Dévoiler la mission complète » à la place d'« Essayer les clés »
  if (e.veil) return `<section class="f-card ms-atflow" data-atflow><div class="ms-atflowhead"><h3>${esc(s.tt(EDTX.atFlow))}</h3><button type="button" data-do="edunveil" data-unveil>${esc(s.tt(EDTX.veilBtn))}</button></div>
    <div class="f-list ms-atflowlist">${edStartRowHtml(s, true)}</div></section>`;
  const drawers = MS.readMission(doc)?.drawers || [],
    todo = new Set(DR.drawersTodo(doc).map(t => t.name)),
    sel = e.sel || 'start',
    on = id => sel === id ? ' aria-current="true"' : '',
    adding = e.kinds === 'new';
  return `<section class="f-card ms-atflow" data-atflow><div class="ms-atflowhead"><h3>${esc(s.tt(EDTX.atFlow))}</h3><button type="button" data-do="${run ? 'edtrialoff' : 'edtrial'}" data-trbtn aria-pressed="${!!run}">${esc(s.tt(run ? EDTX.trClose : EDTX.trBtn))}</button></div>
    <div class="f-list ms-atflowlist">${edStartRowHtml(s, sel === 'start')}${drawers.map(d => `<button type="button" class="f-item ms-atpart" data-do="edsel" data-sel="${esc(d.id)}" data-part="${d.rank}" data-kind="drawer"${on(d.id)}><span class="ms-atparthead"><span class="ms-stepmark" data-kind="${todo.has(String(d.rank)) ? 'warn' : 'ok'}" data-dmark="${d.rank}" aria-hidden="true">${todo.has(String(d.rank)) ? '!' : '✓'}</span><b data-dtitle="${d.rank}">${esc(s.tt(EDTX.atDrawer, { n: d.rank }))}${d.title ? ` · ${esc(d.title)}` : ''}</b></span><span class="ms-trstate" data-trstate="${d.rank}" data-open="${run?.ok && run.drawers.find(x => x.id === d.id)?.open ? '1' : ''}">${run?.ok ? esc(trState(s, run.drawers.find(x => x.id === d.id) || {})) : ''}</span><span class="f-muted" data-dkey="${d.rank}">${esc(s.tt(EDTX[`atKey_${d.key.kind}`] || EDTX.atKey_hand))}</span></button>`).join('')}${drawers.length < MS.DRAWER_IDS.length ? `<button type="button" class="f-item ms-atpart ms-atadd" data-do="eddradd" data-dradd aria-expanded="${adding}">${esc(s.tt(EDTX.dwAdd))}</button>${adding ? edKindsHtml(s, 'new') : ''}` : ''}</div></section>`;
}

/** Le choix du TYPE d'un tiroir (SOG-0467) — LE MÊME sous « ＋ Tiroir » (`where` : 'new', le tiroir naît avec la clé touchée) et dans
 *  la fiche d'un tiroir ('drawer', sa clé change) : une ligne par sorte de DR.TYPES (une liste à allonger), son nom ; une sorte que le
 *  vol ne juge pas encore le dit en une ligne ; la clé en cours est marquée ; « Annuler » referme sans rien changer. */
function edKindsHtml(s, where, cur = '') {
  return `<div class="f-list ms-kinds" data-kinds="${where}" role="group" aria-label="${esc(s.tt(EDTX.dwKey))}">${DR.TYPES.map(t => `<button type="button" class="f-item ms-kind" data-do="edkind" data-key="${t.key}" aria-pressed="${t.key === cur}"><b>${esc(s.tt(EDTX[`dwKey_${t.key}`]))}</b>${t.judged ? '' : `<span class="f-muted">${esc(s.tt(EDTX.dwNotJudged))}</span>`}</button>`).join('')}<button type="button" class="f-linkbtn ms-kindoff" data-do="edkindoff">${esc(s.tt(TX.cancel))}</button></div>`;
}

/** Les lignes des Lieux que la « Vue du pilote » garde (SOG-0448) : au stade choisi, seulement ce que le lecteur rend au pilote
 *  (MS.pilotView : UNE règle, celle de la fiche, du Détail et de la Carte) — le départ et l'arrivée toujours, la cible si elle est
 *  montrée, un objet seulement quand le tiroir dont il est la clé est ouvert, les autres lieux par leur identifiant. Une ligne non
 *  gardée devient null : les rangs des autres ne bougent pas. En vue de l'auteur, ou pour une mission sans tiroir : toutes. La règle
 *  est dans editor.js (ED.pilotRows) : « À compléter » y lit aussi les lieux que rien ne cite (ED.uncited : le mot s'accorde à la sorte du lieu). */
function edPilotRows(e, doc, rows) {
  const n = edMapStage(e);
  return n < 0 ? rows : ED.pilotRows(doc, rows, n);
}

/** « Chercher un repère » se donne-t-il ? Avec la base aéronautique de la suite, hors d'un essai des clés et hors de la vue du pilote
 *  (la carte ne fait alors que montrer). */
const edSeekOn = (s, e) => !!s.ctx.aerodb && !e.trial?.on && edMapStage(e) < 0;

/** Les candidats d'une recherche de repère (s.ed.seekRows : cinq au plus), un bouton chacun ; rien sans candidat. */
function edSeekRowsHtml(s) {
  const rows = Array.isArray(s.ed.seekRows) ? s.ed.seekRows : [];
  return rows.length ? `<p class="f-muted">${esc(s.tt(EDTX.atSeekMany))}</p>${rows.map((r, i) => `<button type="button" data-do="edrefgo" data-i="${i}">${esc(r.label)}</button>`).join('')}` : '';
}

/** « Chercher un repère » par son nom, sous le cadre de la carte : un champ (un code ou un nom, quarante signes) et son bouton ; les
 *  candidats dessous quand il y en a plusieurs. Inactif tant que la carte n'est pas là (edMapShow le donne sur place). */
function edSeekHtml(s, live) {
  const e = s.ed;
  if (!edSeekOn(s, e)) {
    e.seekRows = null; // une liste de candidats ne survit pas à un essai ni à une vue du pilote
    return '';
  }
  return `<div class="ms-atseek" data-refseek><label class="f-field"><span class="f-muted">${esc(s.tt(EDTX.atSeek))}</span><input type="text" data-k="edrefseek" maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="search" placeholder="${esc(s.tt(EDTX.atSeekPh))}" value="${esc(e.refSeek || '')}"${live ? '' : ' disabled'}></label><button type="button" data-do="edrefseek"${live ? '' : ' disabled'}>${esc(s.tt(EDTX.atSeekGo))}</button><div class="ms-atseekout" data-refseekout>${edSeekRowsHtml(s)}</div></div>`;
}

/** Les candidats de la recherche, écrits sur place (le champ et son bouton ne sont pas redessinés). */
function edSeekShow(s) {
  const out = s.el.querySelector('[data-refseekout]');
  if (out) out.innerHTML = edSeekRowsHtml(s);
}

/** Le repère choisi d'une recherche : la vue se centre sur lui, au zoom des repères ; il est alors dit dans la ligne de l'outil et
 *  cerclé, comme un repère touché en Sélection — l'outil de pose en main est lâché ; « Ajouter comme point » se montre. RIEN N'EST
 *  CRÉÉ. */
function edSeekGo(s, e, r) {
  e.seekRows = null;
  edSeekShow(s);
  if (state() !== s || s.ed !== e || !edSeekOn(s, e) || !EM.centre(r.lat, r.lon)) return;
  e.tool = 'select';
  e.drawFor = '';
  edMapRefPick(s, e, r);
}

/** « Chercher » : le texte du champ (deux à quarante signes) est demandé à la base de la suite — les lieux qui portent ce code, les
 *  plus proches de la vue d'abord (coordsAll, pour un texte en forme de code), et ceux dont le nom y répond (find) ; EM.seekRows les
 *  borne (cinq candidats, jamais un lieu à marqueur local), puis LA BASE CONFIRME chacun dans un petit cadre autour de lui
 *  (EM.seekKeep : il doit être un repère que la carte dessinerait). Un seul : la vue y va ; plusieurs : ils se proposent sous le
 *  champ ; aucun : une notification. Une réponse en retard (une autre recherche, l'atelier quitté) est jetée. */
function edRefSeek(s) {
  const e = s.ed,
    a = s.ctx.aerodb,
    text = String(e.refSeek ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!edSeekOn(s, e) || !EM.stateOf(e)) return;
  if (text.length < 2) return s.ctx.notify?.(s.tt(EDTX.atSeekShort), 'warn');
  const tok = e.seekTok = (e.seekTok || 0) + 1,
    near = EM.centreOf(e),
    call = (f, ...args) => typeof a[f] === 'function' ? Promise.resolve().then(() => a[f](...args)).catch(() => []) : Promise.resolve([]),
    code = /^[A-Za-z0-9]{2,7}$/.test(text);
  Promise.all([code ? call('coordsAll', text, near ? {
    near: [near.lat, near.lon]
  } : {}) : [], call('find', text, 20)]).then(([exact, found]) => Promise.all(EM.seekRows(exact, found).map(r => call(EM.SEEK_LISTS[r
    .kind], {
    bbox: EM.seekBox(r)
  }).then(list => EM.seekKeep(r, {
    [EM.SEEK_LISTS[r.kind]]: list
  }))))).then(rows => {
    if (state() !== s || s.ed !== e || tok !== e.seekTok) return;
    const kept = rows.filter(Boolean);
    if (kept.length === 1) return edSeekGo(s, e, kept[0]);
    e.seekRows = kept.length ? kept : null;
    edSeekShow(s);
    if (!kept.length) s.ctx.notify?.(s.tt(EDTX.atSeekNone, {
      q: text
    }), 'warn');
  }).catch(() => {});
}

/** Le sélecteur « Vue de la carte », sous le cadre : « Tout — la vue de l'auteur », puis la vue du pilote au départ et après chaque
 *  tiroir. Montré seulement quand la mission a des tiroirs, et hors d'un essai des clés (l'essai montre tout) ; inactif tant que la
 *  carte n'est pas là (elle arrive après le dessin : edMapShow le donne sur place). */
function edMapViewHtml(s, live) {
  const e = s.ed,
    n = edDrawers(e).length,
    stage = edMapStage(e),
    opt = (v, text) => `<option value="${v}"${stage === v ? ' selected' : ''}>${esc(text)}</option>`;
  if (!n || e.trial?.on || e.veil) return ''; // SOG-0459 : l'atelier voilé n'a qu'une vue, celle du départ
  return `<label class="f-field ms-atmapview" data-mapview><span class="f-muted">${esc(s.tt(EDTX.atView))}</span><select data-k="edmapview"${live ? '' : ' disabled'}>${opt(-1, s.tt(EDTX.atView_all))}${opt(0, s.tt(EDTX.atView_start))}${Array.from({ length: n }, (_, k) => opt(k + 1, s.tt(EDTX.atView_n, { n: k + 1 }))).join('')}</select></label>`;
}

/** Ce que la carte dessine de la séance (editor_map.js, pur) : les lignes des Lieux que l'écran montre, les sommets des contours lus
 *  dans le fichier d'origine, la route du départ (celle que suit l'essai), l'essai en cours. */
function edMapFeats(s, doc, run = null) {
  const e = s.ed,
    rows = e.places || ED.placesOf(doc);
  // SOG-0469 : les codes que le départ et l'arrivée pourraient porter (écrits ou saisis, quelle que soit la casse) sont demandés à la base ;
  // à sa réponse (adPosOf) le Cadre et la carte les lisent
  for (const t of [e.base?.origin?.name, e.base?.destination?.name, e.cadre?.dep, e.cadre?.arr])
    for (const k of ED.codeCands(t)) adPosOf(s, k);
  return EM.mapFeatures(run ? rows : edPilotRows(e, doc, edShown(e, rows)), { // SOG-0459 : le voile, puis la vue du pilote
    zones: e.base?.zones,
    // « XTST · Base Test » (placeText : le code d'abord) : la position de la base quand le fichier ne la dit pas
    adPos: name => adPosOf(s, ED.adCodeOf(name)), // le code d'un terrain quelle que soit la casse écrite (SOG-0469)
    path: TR.pathOf(MS.readMission(doc)),
    run,
    sel: run ? -1 : edMapSel(e),
    // la suite de route du tiroir choisi, dessinée elle aussi (les identifiants d'aujourd'hui de ses lieux)
    onward: run ? [] : (edSelDrawer(e)?.row.route || []).map(id => ED.refNow(id, e.base, e.places))
  });
}

/** Le rang du lieu choisi sur la carte (s.ed.mapSel), -1 sinon. */
const edMapSel = e => Number.isInteger(e.mapSel) ? e.mapSel : -1;
/** L'outil de la carte : 'select' (la Sélection, à l'ouverture et après chaque pose), 'point', 'zone', 'object' ; 'view' pendant un
 *  essai des clés (la carte ne fait que montrer) ; 'put' pendant un essai, quand « Placer l'avion ici » est en main ; 'route' : Tracé,
 *  qui reste en main jusqu'à ce qu'on le quitte. */
const edMapTool = e => e.trial?.on ? (e.trial.putting ? 'put' : 'view') : edMapStage(e) >= 0 ? 'view' : ['point', 'route', 'zone', 'object']
  .includes(e.tool) ? e.tool : 'select';
/** Le stade de la « Vue du pilote » sur la carte (s.ed.mapView ; SOG-0448) : -1 — tout, la vue de l'auteur (le défaut) ; 0 — le
 *  pilote au départ ; n — le pilote une fois le tiroir n ouvert (les tiroirs 1 à n). Borné au nombre de tiroirs de la séance. */
const edMapStage = e => Number.isInteger(e.mapView) && e.mapView >= 0 ? Math.min(e.mapView, edDrawers(e).length) : -1;
/** Pendant un essai des clés (la carte montre, ou attend qu'on pose l'avion) : les outils d'édition ne se donnent pas. */
const edMapTrial = tool => tool === 'view' || tool === 'put';
/** Le tiroir choisi dans le déroulé (sa ligne et son rang), ou null quand c'est « Au départ ». */
const edSelDrawer = e => {
  const rows = (e.sel || 'start') === 'start' ? [] : edDrawers(e),
    at = rows.findIndex(r => r.id === e.sel);
  return at < 0 ? null : {
    row: rows[at],
    rank: at + 1
  };
};
/** Le nom d'un lieu comme la carte et sa ligne le disent : « PT2 · Point deux ». */
const edPlaceName = r => [r?.id, r?.name].filter(Boolean).join(' · ').slice(0, 60);

/** Le rang du sommet choisi du contour choisi (s.ed.mapVertex), -1 sinon. */
const edMapVertex = e => {
  const r = (e.places || [])[edMapSel(e)];
  return r?.kind === 'zone' && r.ring && Number.isInteger(e.mapVertex) && e.mapVertex >= 0 && e.mapVertex < r.poly ? e.mapVertex : -1;
};
/** Le repère de la base touché sur la carte (s.ed.mapRef : { id, kind, lat, lon }), en Sélection et sans lieu choisi ; null sinon. */
const edMapRef = e => edMapTool(e) === 'select' && edMapSel(e) < 0 && e.mapRef && ['aerodrome', 'navaid', 'fix', 'vrp'].includes(e.mapRef
    .kind) ? e
  .mapRef : null;
/** Le tiroir pour lequel on pose une zone ou un objet sur la carte (« Dessiner sur la carte », s.ed.drawFor : sa lettre) : sa ligne
 *  avec son rang, ou null. */
const edDrawFor = e => {
  const rows = e.drawFor ? edDrawers(e) : [],
    at = rows.findIndex(r => r.id === e.drawFor);
  return at < 0 ? null : {
    row: rows[at],
    rank: at + 1
  };
};

/** Une minute de l'essai comme l'écran la dit (un quart de minute au plus près, la virgule du français restant au cadre). */
const trMin = v => String(Math.round((+v || 0) * 100) / 100);

/** La ligne sous les outils : ce que fait l'outil en main, ou le lieu choisi et ce qu'un geste en fait — sans carte, que les lieux se
 *  placent par leurs champs. Un texte (posé par textContent, jamais redessiné avec un bouton). */
function edMapHint(s) {
  const e = s.ed,
    tool = edMapTool(e),
    r = (e.places || [])[edMapSel(e)];
  if (!EM.stateOf(e)) return s.tt(EDTX.atHint_none);
  if (tool === 'put') return s.tt(EDTX.atHint_put, {
    m: trMin(e.trial.min)
  });
  if (tool === 'view' && !e.trial?.on) return s.tt(EDTX.atHint_pilot);
  if (['zone', 'object'].includes(tool) && edDrawFor(e)) return s.tt(EDTX.atHint_drawFor, {
    n: edDrawFor(e).rank
  });
  if (tool === 'route') return edSelDrawer(e) ? s.tt(EDTX.atHint_routeDrawer, {
    n: edSelDrawer(e).rank
  }) : s.tt(EDTX.atHint_route);
  if (tool === 'zone' && e.zoneShape === 'contour') return s.tt(EDTX.atHint_zoneContour);
  if (tool !== 'select') return s.tt(EDTX[`atHint_${tool}`]);
  if (!r && edMapRef(e)) return s.tt(EDTX[`atRef_${edMapRef(e).kind}`], {
    id: edMapRef(e).id
  });
  if (!r && e.mapFeats?.wide) return s.tt(EDTX.atHint_empty); // aucun lieu situé : l'état vide dit quoi faire (SOG-0469)
  if (!r) return s.tt(EDTX.atHint_select);
  if (r.kind === 'zone' && r.ring) return edMapVertex(e) >= 0 ? s.tt(EDTX.atHint_vertex, {
    k: edMapVertex(e) + 1,
    name: edPlaceName(r)
  }) : s.tt(EDTX.atHint_contour, {
    name: edPlaceName(r)
  });
  return s.tt(!ED.MOVABLE.includes(r.kind) || (r.kind === 'zone' && r.poly) ? EDTX.atHint_fixed : r.kind === 'zone' && r.radius ? EDTX
    .atHint_round : EDTX.atHint_chosen, {
      name: edPlaceName(r)
    });
}

/** La carte de la mission (SOG-0444, lot P2, première brique) : un cadre de taille fixe — rien ne bouge quand la carte arrive — où la
 *  carte du socle (editor_map.js) prend la place du croquis dès qu'elle est là — hors ligne, sur un fond uni (une notification le
 *  dit, une fois par séance) ; sans carte (pas de WebGL, MapLibre jamais chargé), le croquis
 *  reste. « Recentrer » n'est montré qu'avec elle. Repliée derrière son bouton sur un module étroit, toujours montrée sur un module
 *  large. La carte elle-même est posée après le dessin (edAfter). */
/** Les icônes des boutons de la carte (SOG-0471), prises dans le jeu de la suite (frame/lib/icons.js) ; « Recentrer » : celle de la Carte
 *  (modules/maps/screen.js, 'target'). */
const ED_ICONS = Object.freeze({
  select: 'pointer',
  point: 'dot',
  route: 'route',
  zone_round: 'circle',
  zone_contour: 'polygon',
  object: 'person',
  undo: 'undo',
  redo: 'redo',
  fit: 'target',
  fast: 'map',
  relief: 'mountain'
});

/** Vrai quand le jeu de la suite a TOUTES les icônes des boutons de la carte : sinon ils gardent leur nom écrit (jamais une rangée mêlée). */
const edIcons = () => Object.values(ED_ICONS).every(n => IC.has(n));

/** Ce qu'un bouton de la carte montre : son icône (edIcons), sinon son nom écrit. */
const edIconOf = (icon, name) => edIcons() ? IC.svg(icon) : esc(name);

/** Un bouton de la carte (SOG-0471) : son icône ou son nom (edIconOf), son nom lu (aria-label) et en infobulle (title) ; `attrs` : ses
 *  attributs (data-do, aria-pressed, disabled…), `cls` : sa classe en plus. */
function edIconBtn(icon, name, attrs, cls = '') {
  return `<button type="button" class="ms-atico${cls ? ` ${cls}` : ''}"${edIcons() ? ' data-icon' : ''} ${attrs} aria-label="${esc(name)}" title="${esc(name)}">${edIconOf(icon, name)}</button>`;
}

/** L'outil « Zone » (SOG-0471) : { icon, text (ce qu'il montre sans icône), name (son nom lu et son infobulle : la forme en cours et
 *  « Changer en polygone » / « Changer en cercle », les mots de l'utilisateur) }. */
function edZoneTool(s) {
  const contour = s.ed.zoneShape === 'contour',
    text = s.tt(EDTX.atToolZoneIs, {
      shape: s.tt(contour ? EDTX.atZone_contour : EDTX.atZone_round)
    });
  return {
    icon: contour ? ED_ICONS.zone_contour : ED_ICONS.zone_round,
    text,
    name: `${text} — ${s.tt(contour ? EDTX.plToRound : EDTX.plToContour)}`
  };
}

/** Le bouton d'un outil de la carte (Sélection, Point, Tracé, Zone, Objet). */
function edToolBtn(s, t, tool, off) {
  const z = t === 'zone' ? edZoneTool(s) : null,
    attrs = `data-do="edtool" data-tool="${t}"${z ? ` data-shape="${s.ed.zoneShape === 'contour' ? 'contour' : 'round'}"` : ''} aria-pressed="${tool === t}"${off ? ' disabled' : ''}`;
  if (!z) return edIconBtn(ED_ICONS[t], s.tt(EDTX[`atTool_${t}`]), attrs);
  return `<button type="button" class="ms-atico"${edIcons() ? ' data-icon' : ''} ${attrs} aria-label="${esc(z.name)}" title="${esc(z.name)}">${edIconOf(z.icon, z.text)}</button>`;
}

function edMapHtml(s, doc, run = null) {
  const e = s.ed,
    thumb = thumbHtml(s, doc, run),
    live = EM.stateOf(e),
    tool = edMapTool(e),
    off = !live || edMapTrial(tool);
  e.mapFeats = edMapFeats(s, doc, run);
  return `<div class="ms-atmap" data-atmap data-open="${e.mapOpen || run ? '1' : ''}"><button type="button" class="ms-atmapbtn" data-do="edmap" aria-expanded="${!!e.mapOpen}">${esc(s.tt(EDTX.atMap))}</button><div class="ms-atmapbody f-card" data-atmapbody data-edpreview data-map="${live}"><div class="ms-atmaptools" data-atmaptools>${['select', 'point', 'route', 'zone', 'object'].map(t => edToolBtn(s, t, tool, off)).join('')}${edIconBtn(ED_ICONS.undo, s.tt(EDTX.atMapUndo), `data-do="edmapundo"${off || !e.mapUndo?.size() ? ' disabled' : ''}`, 'ms-atmapend')}${edIconBtn(ED_ICONS.redo, s.tt(EDTX.atMapRedo), `data-do="edmapredo"${off || !e.mapRedo?.size() ? ' disabled' : ''}`)}${edIconBtn(ED_ICONS.fit, s.tt(EDTX.atMapFit), `data-do="edmapfit"${live ? '' : ' disabled'}`)}</div><div class="ms-atmaphintrow"><p class="f-muted ms-atmaphint" data-maphint>${esc(edMapHint(s))}</p><button type="button" data-do="edvertexdel" data-vertexdel${edMapVertex(e) >= 0 && tool === 'select' ? '' : ' hidden'}>${esc(s.tt(EDTX.atVertexDel))}</button><button type="button" data-do="edrefadd" data-refadd${edMapRef(e) ? '' : ' hidden'}>${esc(s.tt(EDTX.atRefAdd))}</button><button type="button" data-do="edtrput" data-trput aria-pressed="${tool === 'put'}"${live && e.trial?.on ? '' : ' hidden'}>${esc(s.tt(EDTX.atPut))}</button></div><div class="ms-atmapframe"><div class="ms-atmapslot" data-atmapslot></div><div class="ms-atsketch" data-atsketch${live ? ' hidden' : ''}>${thumb || `<p class="f-muted">${esc(s.tt(EDTX.atMapNone))}</p>`}</div></div>${edLookHtml(s)}${edSeekHtml(s, live)}${edMapViewHtml(s, live)}</div></div>`;
}

/** Le fond et la couche de la carte de la mission en cours (SOG-0456) : le choix de la séance, sinon ce que le fichier dit. */
function edMapWant(e) {
  return e.mapWant || ED.mapLookOf(e.base);
}

/** Ce que la rangée « Fond / Espaces » dit de plus : « Relief » voulu qui n'est pas venu, et pour la couche des espaces ce que la
 *  vue en montre (leur nombre, aucun, la vue trop large, la base qui ne répond pas). */
function edLookSaid(s) {
  const e = s.ed,
    w = edMapWant(e),
    sp = e.spacesSaid,
    out = [];
  if (w.base === 'relief' && EM.reliefMissing(e)) out.push(s.tt(EDTX.atReliefOff));
  if (w.airspaces && sp) out.push(sp === 'far' ? s.tt(EDTX.atSpacesFar) : sp === 'nobase' ? s.tt(EDTX.atSpacesNoBase) : sp.n > 0 ? s.tt(
    EDTX.atSpacesN, {
      n: sp.n
    }) : s.tt(EDTX.atSpacesNone));
  return out.join(' ');
}

/** « Fond » et « Espaces » de la carte de la mission (SOG-0456), sous son cadre : le choix de l'AUTEUR pour sa mission, écrit dans
 *  le fichier (`mission_map`) — le fond « Rapide » (celui de la suite, sinon uni ; il marche hors ligne) ou « Relief » (le fond
 *  topographique du socle), et la couche des espaces aériens (zones R, D, P et RTBA), éteinte d'office et lue à la demande. */
function edLookHtml(s) {
  const w = edMapWant(s.ed),
    btn = b => edIconBtn(ED_ICONS[b], s.tt(EDTX[`atBase_${b}`]), `data-do="edmapbase" data-base="${b}" aria-pressed="${w.base === b}"`);
  return `<div class="ms-atlook" data-maplook><span class="f-muted ms-lbl">${esc(s.tt(EDTX.atBase))}</span>${btn('fast')}${btn('relief')}<label><input type="checkbox" data-k="edmapspaces"${w.airspaces ? ' checked' : ''}><span>${esc(s.tt(EDTX.atSpaces))}</span></label><small class="f-muted ms-atlooksaid" data-maplooksaid>${esc(edLookSaid(s))}</small></div>`;
}

/** Les espaces aériens du cadre de la vue (la couche « Espaces » est allumée, la vue vient de s'arrêter) : demandés à la base de la
 *  suite (ctx.aerodb.airspaces, par l'emprise), bornés et triés par le bloc (EM.setSpaces : zones R, D, P et RTBA), et la rangée dit
 *  combien sont dessinés. Une réponse en retard est jetée ; sans base : dit, sans autre message. */
function edMapSpacesAsk(s, e, v) {
  if (state() !== s || s.ed !== e) return;
  const a = s.ctx.aerodb,
    tok = e.spTok = (e.spTok || 0) + 1,
    say = x => {
      e.spacesSaid = x;
      const el = s.el.querySelector('[data-maplooksaid]'),
        text = edLookSaid(s);
      if (el && el.textContent !== text) el.textContent = text;
    };
  if (v?.far) return say('far');
  if (typeof a?.airspaces !== 'function' || !Array.isArray(v?.bbox) || v.bbox.length !== 4) return say('nobase');
  Promise.resolve().then(() => a.airspaces({
    bbox: v.bbox
  })).catch(() => null).then(list => {
    if (state() !== s || s.ed !== e || e.spTok !== tok) return;
    say(Array.isArray(list) ? {
      n: EM.setSpaces(e, list)
    } : 'nobase');
  });
}

/** Pose ou met à jour la carte du socle dans l'emplacement du dessin courant, et dit son état à l'écran SUR PLACE (des attributs et un
 *  texte : aucun bouton n'est redessiné, SOG-0449) : avec elle, le croquis se cache et les outils se donnent ; l'outil en main est
 *  marqué, « Annuler le geste » n'est donné que s'il y a un geste à annuler, la ligne dit ce que fait l'outil. */
function edMapShow(s) {
  const e = s.ed,
    q = sel => s.el.querySelector(sel),
    slot = q('[data-atmapslot]'),
    mark = () => {
      const live = EM.stateOf(e),
        tool = edMapTool(e),
        off = !live || edMapTrial(tool),
        body = q('[data-atmapbody]'),
        sketch = q('[data-atsketch]'),
        hint = q('[data-maphint]'),
        text = edMapHint(s);
      if (body) body.dataset.map = live;
      if (live === 'plain' && !e.plainSaid) { // le fond uni (hors ligne, ou les tuiles ne sont pas venues) : dit une fois par séance
        e.plainSaid = true;
        s.ctx.notify?.(s.tt(EDTX.atMapPlain), 'info');
      }
      if (sketch) sketch.hidden = !!live;
      for (const b of s.el.querySelectorAll('[data-atmaptools] button')) {
        const t = b.dataset.tool,
          dis = b.dataset.do === 'edmapfit' ? !live : b.dataset.do === 'edmapundo' ? off || !e.mapUndo?.size() : b.dataset.do ===
          'edmapredo' ?
          off || !e.mapRedo?.size() : off;
        if (b.disabled !== dis) b.disabled = dis;
        if (t && b.getAttribute('aria-pressed') !== String(tool === t)) b.setAttribute('aria-pressed', String(tool === t));
        if (t === 'zone') edZoneShow(s, b);
      }
      if (hint && hint.textContent !== text) hint.textContent = text;
      const del = q('[data-vertexdel]'),
        add = q('[data-refadd]');
      if (del) del.hidden = !(edMapVertex(e) >= 0 && tool === 'select');
      if (add) add.hidden = !edMapRef(e);
      const view = q('[data-mapview] select'),
        said = q('[data-maplooksaid]'),
        saidText = edLookSaid(s);
      if (view) view.disabled = !live;
      if (said && said.textContent !== saidText) said.textContent = saidText;
      for (const x of s.el.querySelectorAll('[data-refseek] input, [data-refseek] > button')) x.disabled = !live;
      const put = q('[data-trput]');
      if (put) {
        put.hidden = !(live && e.trial?.on);
        put.setAttribute('aria-pressed', String(tool === 'put'));
      }
    };
  if (!slot || !e.mapFeats) return mark();
  e.mapLook ||= EM.lookOf(s.el);
  EM.show(slot, e.mapFeats, {
    owner: e,
    dark: e.mapLook.dark,
    colors: e.mapLook.colors,
    mode: edMapTool(e),
    edit: true, // la carte de l'atelier (edAfter la retire hors de l'atelier)
    base: edMapWant(e).base,
    spaces: edMapWant(e).airspaces,
    onSpaces: v => edMapSpacesAsk(s, e, v),
    sel: edMapSel(e),
    selLabel: edPlaceName((e.places || [])[edMapSel(e)]),
    ref: edMapRef(e),
    onPick: i => edMapPick(s, e, i),
    onMove: m => edMapGesture(s, e, rows => ED.movePlace(rows, m.i, m), m.i, -1, m.drag),
    onRadius: m => edMapGesture(s, e, rows => ED.placeRadius(rows, m.i, m.km), m.i, -1, m.drag),
    onVertex: m => edMapGesture(s, e, rows => ED.moveVertex(rows, m.i, m.k, m), m.i, m.k, m.drag),
    onDragCancel: () => edMapDragCancel(s, e),
    onInsert: m => edMapGesture(s, e, rows => ED.insertVertex(rows, m.i, m.k, m), m.i, m.k + 1),
    onVertexPick: m => edMapVertexPick(s, e, m),
    onPose: p => edMapPose(s, e, p),
    onRoute: i => edMapRoute(s, e, i),
    onPut: p => edTrialPut(s, e, p),
    onView: v => edMapRefsAsk(s, e, v),
    onRef: r => edMapRefPick(s, e, r),
    onState: () => state() === s && s.ed === e && mark(),
    alive: () => state() === s && s.ed === e
  });
  mark();
}

/** « Placer l'avion ici » : le toucher de la carte pose l'avion de l'essai là, à la minute du curseur (une pose à la même minute
 *  remplace la précédente ; vingt au plus, sinon une notification) ; l'outil est lâché ; l'essai est recalculé (le même moteur :
 *  poser n'est pas voler). Rien n'est écrit dans la mission. */
function edTrialPut(s, e, p) {
  const t = e.trial;
  if (state() !== s || s.ed !== e || !t?.on || !t.putting) return;
  t.putting = false;
  const puts = (t.puts || []).filter(x => x.min !== t.min);
  if (puts.length >= TR.TRIAL.puts) {
    s.ctx.notify?.(s.tt(EDTX.atPutFull), 'warn');
    return edMapShow(s);
  }
  t.puts = [...puts, {
    min: t.min,
    lat: p.lat,
    lon: p.lon
  }];
  draw(s);
}

/** Les repères de la base aéronautique du cadre de la vue (la vue vient de s'arrêter, au zoom des repères) : demandés à la base de la
 *  suite (ctx.aerodb : aérodromes, balises, points, points VFR), bornés (EM.refData), puis rendus à la carte. Une réponse en retard
 *  (la vue a bougé depuis, l'atelier est quitté) est jetée ; sans base, ou si elle ne répond pas : pas de repère, sans message. */
function edMapRefsAsk(s, e, v) {
  const a = s.ctx.aerodb;
  if (!a || state() !== s || s.ed !== e || !Array.isArray(v?.bbox) || v.bbox.length !== 4) return;
  const tok = e.refTok = (e.refTok || 0) + 1,
    ask = (f, extra = {}) => typeof a[f] === 'function' ? Promise.resolve().then(() => a[f]({
      bbox: v.bbox,
      ...extra
    })).catch(() => []) : Promise.resolve([]);
  Promise.all([ask('aerodromes'), ask('navaids'), ask('points'), ask('vrp')]).then(([aerodromes, navaids, points, vrp]) => {
    if (state() !== s || s.ed !== e || tok !== e.refTok) return;
    EM.setRefs(e, EM.refData({
      aerodromes,
      navaids,
      points,
      vrp
    }));
  });
}

/** Un repère de la base touché en Sélection : il dit ce qu'il est dans la ligne de l'outil et « Ajouter comme point » se montre à
 *  côté ; LE TOUCHER NE CRÉE RIEN. Plus aucun lieu n'est choisi. Sur place. */
function edMapRefPick(s, e, r) {
  if (state() !== s || s.ed !== e || e.trial?.on || !r) return;
  e.mapRef = {
    id: String(r.id || '').slice(0, 24),
    kind: r.kind,
    lat: r.lat,
    lon: r.lon
  };
  e.mapVertex = -1;
  if (edMapSel(e) >= 0) {
    e.mapSel = -1;
    return edRefresh(s);
  }
  edMapShow(s);
}

/** Un lieu ajouté à la route du départ — à la fin, ou juste avant l'arrivée quand elle la termine (ED.routeAddStart) — par son
 *  jeton (« ORIGIN », « DESTINATION » ou son identifiant) ; soixante au plus :
 *  au-delà, une notification et rien n'est ajouté. → vrai s'il est ajouté. */
function edRouteAdd(s, e, token) {
  const route = edRoute(e);
  if (route.length >= ED.ROUTE_MAX) {
    s.ctx.notify?.(s.tt(EDTX.rtFull), 'warn');
    return false;
  }
  e.route = ED.routeAddStart(route, token); // avant l'arrivée quand elle termine la route : elle reste dernière
  return true;
}

/** Tracé : un lieu touché sur la carte rejoint la route choisie — la suite de route du tiroir choisi dans le déroulé, sinon la route du
 *  départ. L'outil reste en main (on trace plusieurs lieux de suite). Un lieu sans identifiant, une route pleine : une notification. */
function edMapRoute(s, e, i) {
  if (state() !== s || s.ed !== e || e.trial?.on || edHid(e, i)) return;
  const token = ED.routeToken(edPlaces(e)[i]);
  if (!token) return s.ctx.notify?.(s.tt(EDTX.rtNoId), 'warn');
  // un lieu ajouté par un toucher de la carte est un geste de la carte (l'ergonome, 18 nov.) : « Annuler le geste » le rend
  if (edSelDrawer(e)) {
    const r = edDrawerRow(e);
    if (!r) return;
    if (r.route.length >= ED.ROUTE_MAX) return s.ctx.notify?.(s.tt(EDTX.rtFull), 'warn');
    edMapRemember(e);
    r.route = [...r.route, token];
  } else {
    if (edRoute(e).length >= ED.ROUTE_MAX) return s.ctx.notify?.(s.tt(EDTX.rtFull), 'warn');
    edMapRemember(e);
    edRouteAdd(s, e, token);
  }
  draw(s);
}

/** L'état que « Annuler le geste » garde AVANT un geste de la carte (createUndo du socle le clone) : les lignes des Lieux, la route du
 *  départ, et ce qu'un geste de la carte change d'un tiroir — sa suite de route (Tracé), la zone ou l'objet qu'il cite (« Dessiner sur
 *  la carte »). Vingt états au plus. */
function edMapRemember(e) {
  (e.mapUndo ||= createUndo(20)).push(edMapSnap(e));
  e.mapRedo?.clear(); // SOG-0471 : un geste neuf vide « Rétablir »
}

/** L'état de la séance que gardent « Annuler le geste » et « Rétablir » (SOG-0471 : la même forme, la même pile du socle) : les lignes
 *  des Lieux, la route du départ, la suite de route et la clé des tiroirs. */
function edMapSnap(e) {
  return {
    places: edPlaces(e),
    route: e.route || null,
    drawers: edDrawers(e).map(r => ({
      id: r.id,
      route: [...r.route],
      zone: r.zone,
      object: r.object
    }))
  };
}

/** Rend un état gardé (edMapSnap) à la séance : le lieu choisi le reste quand il existe encore à son rang (le même identifiant, la même
 *  sorte), sinon plus aucun ; puis le dessin. */
function edMapBack(s, e, snap) {
  const was = (e.places || [])[edMapSel(e)],
    now = snap.places[edMapSel(e)],
    same = !!was && !!now && now.kind === was.kind && now.id === was.id;
  e.places = snap.places;
  e.route = Array.isArray(snap.route) ? snap.route : null;
  if (e.drawers)
    for (const d of snap.drawers || []) {
      const r = e.drawers.find(x => x.id === d.id);
      if (r) Object.assign(r, {
        route: [...(d.route || [])],
        zone: d.zone,
        object: d.object
      });
    }
  if (!same) e.mapSel = -1;
  if (!same || e.placeEdit !== e.mapSel) e.placeEdit = -1;
  e.mapVertex = -1;
  e.placeAsk = -1;
  return draw(s);
}

/** Une retouche de la fiche (une saisie, une liste, un lieu ajouté ou retiré) : « Annuler le geste » et « Rétablir » n'ont plus rien à rendre
 *  (ils ne défont jamais une saisie). */
function edUndoClear(e) {
  e.mapUndo?.clear();
  e.mapRedo?.clear();
}

/** L'outil « Zone » dit la forme qu'il pose (SOG-0471), sur place : son icône ou son nom, son nom lu, son infobulle — écrits seulement
 *  s'ils changent. */
function edZoneShow(s, b) {
  const z = edZoneTool(s),
    shape = s.ed.zoneShape === 'contour' ? 'contour' : 'round',
    html = edIconOf(z.icon, z.text);
  if (b.dataset.shape === shape) return;
  b.dataset.shape = shape;
  b.setAttribute('aria-label', z.name);
  b.title = z.name;
  b.innerHTML = html;
}

/** La forme de la zone que pose l'outil « Zone » change (SOG-0471 : rond ↔ polygone), l'outil en main. */
function edZoneFlip(s) {
  const e = s.ed;
  e.zoneShape = e.zoneShape === 'contour' ? 'round' : 'contour';
  e.tool = 'zone';
  e.drawFor = '';
  e.mapRef = null;
  edMapShow(s);
}

/** L'appui long sur l'outil « Zone » (SOG-0471) : au bout d'une demi-seconde, la forme change (comme un second toucher) ; le clic qui
 *  termine l'appui ne fait rien de plus (s.ed.holdDone). Une réaction à pointerdown, posée avec les écoutes de l'atelier (edAd). */
function edToolHold(s, ev) {
  const e = s.ed,
    b = ev.target?.closest?.('[data-do="edtool"][data-tool="zone"]');
  if (!e) return;
  e.holdDone = false;
  clearTimeout(e.holdT);
  if (!b || b.disabled || state() !== s) return;
  const stop = () => {
    clearTimeout(e.holdT);
    for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.removeEventListener(t, stop);
  };
  for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, stop);
  e.holdT = setTimeout(() => {
    stop();
    if (state() !== s || s.ed !== e || b.disabled) return;
    e.holdDone = true;
    edZoneFlip(s);
  }, 500);
}

/** Les lignes des Lieux de la séance, créées à la première retouche (comme l'étape « Lieux »). */
function edPlaces(e) {
  if (!e.places) e.places = ED.placesOf(edDoc(e));
  return e.places;
}

/** Un lieu choisi sur la carte (son rang, -1 : la carte nue) : il dit son nom sur la carte, et sa ligne des Lieux est choisie, ses champs
 *  ouverts sous la liste, la ligne en vue DANS la liste (SOG-0472 : la fiche affichée à côté ne change pas). La carte nue ne choisit plus
 *  rien (sur place). Une carte d'une autre séance : rien. */
function edMapPick(s, e, i) {
  if (state() !== s || s.ed !== e || e.trial?.on) return;
  if (edHid(e, i)) return; // SOG-0459 : une ligne cachée ne se choisit pas (elle n'est pas dessinée)
  const hadRef = !!e.mapRef;
  e.mapRef = null; // un lieu choisi, ou la carte nue : plus de repère touché
  const rows = edPlaces(e);
  e.mapVertex = -1;
  if (!Number.isInteger(i) || !rows[i]) {
    if (edMapSel(e) < 0) return hadRef ? edMapShow(s) : undefined;
    e.mapSel = -1;
    return edRefresh(s);
  }
  e.mapSel = i;
  e.placeAsk = -1;
  e.placeEdit = i;
  draw(s); // edAfter → edPlShow : la ligne vient à l'écran dans la liste, la colonne ne défile pas (SOG-0472)
  edMapFocus(e, i);
}

/** La liste des Lieux après un dessin (SOG-0472) : elle reprend là où elle était (e.plTop, gardé quand on la fait défiler), puis la ligne
 *  choisie vient à l'écran DANS la liste — seule la liste défile, jamais la colonne ni la page. Une réaction au dessin : seul scrollTop
 *  change, et seulement s'il le faut. */
function edPlShow(s) {
  const e = s.ed,
    list = s.el?.querySelector?.('[data-pllist]');
  if (!e || !list) return;
  list.onscroll = () => {
    e.plTop = list.scrollTop;
  };
  if (list.scrollTop !== (e.plTop || 0)) list.scrollTop = e.plTop || 0;
  const i = e.placeEdit >= 0 ? e.placeEdit : edMapSel(e),
    row = i >= 0 ? list.querySelector(`[data-place="${i}"]`) : null;
  if (!row) return;
  const top = row.offsetTop,
    bottom = top + row.offsetHeight,
    to = top < list.scrollTop ? top : bottom > list.scrollTop + list.clientHeight ? bottom - list.clientHeight : list.scrollTop;
  if (to !== list.scrollTop) list.scrollTop = e.plTop = to;
}

/** Une zone à contour choisie est cadrée sur la carte, avec une marge (l'ergonome, 18 nov. : ses poignées s'entassent quand elle est
 *  petite dans une mission étendue) ; « Recentrer » revient à la mission. Un lieu d'une autre sorte, ou un simple déplacement, ne
 *  recadre jamais. À appeler après le dessin (la carte a alors les éléments du jour). */
function edMapFocus(e, i) {
  const r = (e.places || [])[i];
  if (r?.kind === 'zone' && r.ring) EM.focus(i);
}

/** Un sommet touché du contour choisi : il est choisi (sur place : la ligne le dit, « Retirer ce sommet » se montre). */
function edMapVertexPick(s, e, m) {
  if (state() !== s || s.ed !== e || e.trial?.on || edMapSel(e) !== m.i) return;
  e.mapVertex = m.k;
  edMapShow(s);
}

/** Un geste de la carte qui retouche les lignes (déplacer un lieu ou un sommet, régler un rayon, poser un sommet) : `change(lignes)` rend de NOUVELLES lignes, ou les
 *  mêmes quand le geste est refusé (ED.movePlace, ED.placeRadius : alors rien ne change, la carte revient à ce qu'elle montrait).
 *  L'état d'avant est gardé pour « Annuler le geste » ; le lieu reste choisi.
 *  SOG-0478 : LE SEUL chemin de toutes les poignées. `live` (vrai) : le geste n'est pas fini — les lignes prennent la position du doigt
 *  SANS rien garder (l'état d'avant reste dans e.dragBase) et ce qui en dépend est redessiné aussitôt (edLive) ; à la fin du geste,
 *  l'état d'avant est rendu à `change`, qui repart de lui comme avant. */
function edMapGesture(s, e, change, i, vertex = -1, live = false) {
  if (state() !== s || s.ed !== e || e.trial?.on) return;
  if (live) {
    if (!e.dragBase) e.lastLive = ''; // un geste neuf : la liste des Lieux n'a encore rien montré de lui
    e.dragBase ||= edPlaces(e);
    e.places = change(e.dragBase);
    return edLive(s, e);
  }
  const before = e.dragBase || edPlaces(e);
  edLiveStop(e);
  e.places = before;
  const after = change(before);
  if (after === before) return edRefresh(s);
  edMapRemember(e);
  e.places = after;
  e.mapSel = i;
  e.mapVertex = vertex; // le sommet déplacé ou posé reste choisi (« Retirer ce sommet » le concerne)
  e.placeAsk = -1;
  if (e.placeEdit !== i) e.placeEdit = -1; // une autre ligne ouverte se referme : ses champs ne diraient plus ce que la carte montre
  draw(s);
}

/** Un geste en cours : ce qui dépend du lieu que le doigt porte (le rond, le contour, la route, la liste des Lieux, le compte, l'aperçu)
 *  est redessiné, au plus une fois par image — par les mêmes écritures sur place que la frappe d'un champ (edRefresh), la liste des Lieux
 *  remplaçant ses lignes seulement quand elles ont changé. Un geste achevé entre-temps (ou l'atelier quitté) : rien. */
function edLive(s, e) {
  if (e.liveAsk) return;
  e.liveAsk = requestAnimationFrame(() => {
    e.liveAsk = 0;
    if (state() !== s || s.ed !== e || !e.dragBase) return;
    edRefresh(s);
    const list = s.el.querySelector('[data-pllist]'),
      html = list ? edPlacesHtml(s, true) : '';
    if (list && e.lastLive !== html) list.innerHTML = e.lastLive = html;
  });
}

/** La fin d'un geste en cours (fini, ou lâché) : l'image demandée et pas encore dessinée est annulée, et il n'y a plus d'état d'avant à rendre. */
function edLiveStop(e) {
  if (e.liveAsk) cancelAnimationFrame(e.liveAsk);
  e.liveAsk = 0;
  e.dragBase = null;
  e.lastLive = '';
}

/** Un geste lâché sans fin (le doigt est parti, la poignée a disparu) : les lignes reprennent leur état d'avant le geste, tout est
 *  redessiné. */
function edMapDragCancel(s, e) {
  if (state() !== s || s.ed !== e || !e.dragBase) return;
  e.places = e.dragBase;
  edLiveStop(e);
  draw(s);
}

/** Un toucher de la carte nue avec un outil de pose : le lieu neuf (ED.newPlace : identifiant libre, à la place de sa sorte) est posé
 *  là — une zone, ronde, d'un rayon d'un huitième de la largeur de la vue (1 à 100 km) —, PUIS L'OUTIL REVIENT À SÉLECTION (aucune
 *  création par accident) ; le lieu est choisi, sa ligne ouverte pour dire son nom. Une sorte pleine : une notification, rien de créé. */
function edMapPose(s, e, p) {
  if (state() !== s || s.ed !== e || e.trial?.on) return;
  const kind = {
      point: 'pt',
      zone: 'zone',
      object: 'object'
    } [edMapTool(e)],
    before = edPlaces(e);
  if (!kind) return;
  const made = ED.newPlace(before, kind, e.base, {
    lat: p.lat,
    lon: p.lon,
    ...(kind === 'zone' ? {
      radius: Math.min(100, Math.max(1, Math.round((p.spanKm || 40) / 8)))
    } : {})
  });
  e.tool = 'select';
  if (!made) {
    s.ctx.notify?.(s.tt(EDTX.atPoseFull), 'warn');
    return edMapShow(s);
  }
  edMapRemember(e);
  // SOG-0471 : l'outil « Zone » en forme polygone pose une zone en contour (ED.toContour, à son rayon) — un seul geste à annuler
  e.places = kind === 'zone' && e.zoneShape === 'contour' ? ED.toContour(made.rows, made.at) : made.rows;
  const forDrawer = ['zone', 'object'].includes(kind) ? edDrawFor(e) : null;
  e.drawFor = '';
  if (!forDrawer) return edMapPick(s, e, made.at);
  // « Dessiner sur la carte » depuis la fiche d'un tiroir : ce qui vient d'être posé devient sa clé ; on reste sur sa fiche
  e.sel = forDrawer.row.id;
  const r = edDrawerRow(e);
  if (r) r[kind] = made.rows[made.at].id;
  e.mapSel = made.at;
  e.mapVertex = -1;
  draw(s);
}

/** Le champ de terrain de l'atelier en vie : { s, el, ad, pt, off } — un par montage de l'atelier (SOG-0465) ; `pt` : le même champ
 *  commun, avec les points de la base, pour le Nom d'un point tournant, d'une cible ou d'un rendez-vous (SOG-0480). */
let AF = null;

/** Le champ de terrain de la suite pour Départ et Arrivée du Cadre (frame/lib/ad_field.js, appelé tel quel) : créé au premier besoin
 *  pour ce montage (le dessin du Cadre, edAfter, une saisie), avec les écoutes que module.js ne rend pas à l'atelier — keydown (↑ ↓
 *  Entrée Échap), focusout, pointerdown et le toucher d'une proposition (qui n'est pas un bouton « ed… ») — posées UNE fois sur s.el. */
function edAd(s) {
  if (AF && AF.s === s && AF.el === s.el) return AF.ad;
  edAdStop();
  const el = s.el,
    ad = createAdField({
      ctx: s.ctx,
      body: () => state() === s && s.ed ? el : null,
      gone: () => state() !== s || !s.ed,
      keys: ['eddep', 'edarr'],
      idPrefix: 'ed-sug'
    }),
    // SOG-0480 : le Nom d'un point tournant, d'une cible, d'un rendez-vous, le même champ commun avec les points de la base ; sa liste
    // est cherchée dans la fiche du lieu (data-adform), pas dans tout l'atelier : une liste par bloc, jamais celle du Cadre
    pt = createAdField({
      ctx: s.ctx,
      body: () => state() === s && s.ed ? el.querySelector('[data-adform]') : null,
      gone: () => state() !== s || !s.ed,
      keys: ['edplname'],
      idPrefix: 'ed-pt',
      points: true,
      near: () => edPtNear(s)
    }),
    // l'évènement va au bloc dont le champ (ou la liste) est la cible : la fiche d'un lieu à nom commun, sinon le Cadre
    of = ev => ev.target?.closest?.('[data-adform]') ? pt : ad,
    on = [
      ['keydown', ev => of(ev).onKey(ev)],
      ['focusout', ev => of(ev).onFocusOut(ev)],
      ['pointerdown', ev => of(ev).onPointerDown(ev)],
      ['pointerdown', ev => edToolHold(s, ev)], // SOG-0471 : l'appui long sur l'outil « Zone »
      ['click', ev => of(ev).onClick(ev)],
      ['focusin', ev => edAdRoom(el, ev)]
    ];
  for (const [t, f] of on) el.addEventListener(t, f);
  AF = {
    s,
    el,
    ad,
    pt,
    off: () => {
      for (const [t, f] of on) el.removeEventListener(t, f);
      ad.stop();
      pt.stop();
    }
  };
  return ad;
}

/** Le bloc du Nom d'un lieu (points de la base compris, SOG-0480) du montage en vie, créé avec celui des terrains (edAd). */
function edAdPt(s) {
  edAd(s);
  return AF.pt;
}

/** Une position valide d'un lieu des Lieux (champs en texte : un champ vide n'est pas 0) : { lat, lon } ou null. */
function edPos(r) {
  const ok = v => v !== '' && v !== null && v !== undefined && Number.isFinite(+v),
    lat = +r?.lat,
    lon = +r?.lon;
  return r && ok(r.lat) && ok(r.lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? {
    lat,
    lon
  } : null;
}

/** La position de référence du Nom d'un lieu (SOG-0480, near() du champ commun : les homonymes d'un point sont classés par
 *  distance) : celle du lieu ouvert s'il en a une, sinon le centre de la carte de l'atelier, sinon le départ (sa ligne des Lieux, ou
 *  le terrain que la base a donné) ; null sans rien de tout cela. */
function edPtNear(s) {
  const e = s.ed;
  if (!e) return null;
  const rows = e.places || [];
  return edPos(rows[e.placeEdit]) || EM.centreOf(e) || edPos(rows.find(r => r && r.kind === 'dep')) || adPosOf(s, ED.adCodeOf(e.cadre
    ?.dep));
}

/** Un champ de terrain prend le focus : s'il n'y a pas sous lui la place des sept propositions avant le pied de l'atelier (un téléphone,
 *  le Cadre bas dans la fiche), il monte en haut de la vue — la liste n'est jamais coupée par le bord de l'écran. Une réaction au focus,
 *  rien n'est réécrit. */
function edAdRoom(el, ev) {
  const k = ev.target?.dataset?.k,
    label = k === 'eddep' || k === 'edarr' || k === 'edplname' ? ev.target.closest('label') : null;
  if (!label) return;
  const foot = el.querySelector('.ms-atfoot')?.getBoundingClientRect().top ?? innerHeight;
  if (foot - label.getBoundingClientRect().bottom < 7 * 44 + 8) label.scrollIntoView?.({
    block: 'start'
  });
}

/** Arrête le champ de terrain de l'atelier : ses écoutes retirées, son abonnement à la base arrêté ; sans effet s'il n'y en a pas. */
function edAdStop() {
  const f = AF;
  AF = null;
  f?.off();
}

/** La saisie de Départ ou d'Arrivée (SOG-0465), le bloc ayant déjà pris la frappe : le texte que le cadre retient, ou null si rien ne
 *  change. Le terrain du fichier retapé garde son texte (rien n'est écrit) ; un choix de la liste, ou un code tapé que la base connaît
 *  (AD.known), devient le CODE en majuscules, avec le nom de la base dès qu'elle l'a dit ; tout autre texte reste tel que tapé. */
function edAdValue(s, key, ev) {
  const e = s.ed,
    input = ev.target,
    t = String(input.value ?? ''),
    T = t.trim().toUpperCase(),
    ad = edAd(s),
    was = ED.cadreOf(e.base)[key];
  if (t === ED.fieldText(e.cadre[key])) return null; // le champ dit déjà ce que le cadre retient (un « change », le même choix)
  if (T && ED.fieldCode(was) === T) return was; // le terrain du fichier : son texte tel qu'écrit
  const picked = ad.isPicking();
  if (picked) ED.noteAerodrome(T, true); // la liste ne propose que des terrains de la base
  else if (!ad.isCode(T)) return t; // un lieu qui n'est pas un code : tel que tapé (le test du champ : quatre signes ou une hélistation)
  const now = picked ? T : t;
  ad.known(T).then(ok => {
    ED.noteAerodrome(T, ok);
    // la réponse ne vaut que pour ce même texte, dans ce même atelier
    if (!ok || state() !== s || s.ed !== e || e.cadre[key] !== now || input.value.trim().toUpperCase() !== T) return;
    const name = ad.nameKnown(T);
    edCadreSet(s, key, typeof name === 'string' && name ? `${T} · ${name}` : T);
    if (input.value !== T) input.value = T; // connu de la base : en majuscules
    edRefresh(s);
  });
  return now;
}

/** UN point de la base devient un lieu de la mission (le seul chemin de SOG-0480 le champ « Point de la base », SOG-0481 « + Point
 *  tournant » et « + Cible » avec un repère choisi sur la carte, « Ajouter comme point », SOG-0495 un nom tapé qui est un code de la
 *  base) : le lieu prend la POSITION de la base et le CODE comme nom. `at` : le rang d'une ligne qui existe (retouchée), sinon une ligne
 *  neuve de la sorte `kind` (ED.newPlace, « Annuler le geste » la défait) ; `{ code, lat, lon }` : le point de la base. → le rang du
 *  lieu, -1 sans lieu neuf possible (sorte pleine : une notification). */
function edPlaceFromBase(s, e, {
  kind = 'pt',
  at = -1,
  code,
  lat,
  lon
}) {
  const num = v => String(+(+v).toFixed(5));
  let i = at;
  if (i < 0) {
    const made = ED.newPlace(edPlaces(e), kind, e.base, {
      lat,
      lon
    });
    if (!made) {
      s.ctx.notify?.(s.tt(EDTX.atPoseFull), 'warn');
      return -1;
    }
    edMapRemember(e);
    e.places = made.rows;
    i = made.at;
  } else edUndoClear(e); // une retouche de la fiche : « Annuler le geste » n'a plus rien à rendre
  const row = e.places[i];
  if (!row) return -1;
  Object.assign(row, {
    name: String(code),
    lat: num(lat),
    lon: num(lon)
  });
  // les champs de la fiche ouverte disent ce que le lieu retient (un champ n'est réécrit que si sa valeur change)
  for (const f of ['name', 'lat', 'lon']) {
    const input = s.el.querySelector(`[data-plform="${i}"] input[data-f="${f}"]`);
    if (input && input.value !== row[f]) input.value = row[f];
  }
  return i;
}

/** SOG-0495 : le nom d'un point tournant, d'une cible ou d'un rendez-vous venu d'être tapé (un « change ») est-il un point de la base ?
 *  Un lieu SANS position qui porte un mot seul demande la base (aerodb.coordsAll, le plus proche d'abord) ; si elle le connaît, le lieu
 *  prend sa position et son code (edPlaceFromBase). Rien n'est changé si le lieu a déjà une position, si le nom a changé entre-temps ou
 *  si la base ne répond rien. */
function edNameBase(s, e, i) {
  const row = e.places?.[i],
    word = String(row?.name || '').trim().toUpperCase(),
    a = s.ctx.aerodb;
  if (!row || !['pt', 'target', 'rdv'].includes(row.kind) || edPos(row) || !/^\S{2,24}$/.test(word) || typeof a?.coordsAll !== 'function')
    return;
  const near = edPtNear(s);
  Promise.resolve().then(() => a.coordsAll(word, near ? {
    near: [near.lat, near.lon]
  } : {})).catch(() => []).then(all => {
    const hit = (Array.isArray(all) ? all : []).find(x => Number.isFinite(+x?.item?.lat) && Number.isFinite(+x?.item?.lon));
    const now = state() === s && s.ed === e ? e.places?.[i] : null;
    if (!hit || !now || now.id !== row.id || edPos(now) || String(now.name || '').trim().toUpperCase() !== word) return;
    edPlaceFromBase(s, e, {
      at: i,
      code: word,
      lat: +hit.item.lat,
      lon: +hit.item.lon
    });
    edRefresh(s);
  });
}

/** Le Nom d'un lieu qui peut être un point de la base vient d'être retouché (SOG-0480, le champ commun ayant déjà la main) : un CHOIX
 *  de la liste donne au lieu le code (son nom) et la position de la base (positionOf) ; un terrain choisi n'a pas de position dans la
 *  liste, sa position est demandée comme à un code tapé (edNameBase). Un texte libre reste tel quel et rien n'est écrit tant qu'aucun
 *  point n'est choisi ; le « change » qui suit un choix ne refait rien (le lieu a déjà sa position). */
function edPlName(s, e, ev, i) {
  const pt = edAdPt(s),
    row = e.places?.[i];
  pt.onInput(ev);
  if (!pt.isPicking() || !row || !['pt', 'target', 'rdv'].includes(row.kind)) return;
  const at = pt.positionOf('edplname');
  if (!at) return edNameBase(s, e, i);
  edPlaceFromBase(s, e, {
    at: i,
    ...at
  });
}

/** Un champ du Cadre retenu : la valeur (`key` : dep, arr, family…), le titre proposé d'une liaison qui suit les deux bouts, et la ligne
 *  des Lieux d'un départ ou d'une arrivée retouchés. */
function edCadreSet(s, key, value) {
  const e = s.ed,
    auto = ED.liaison(e.cadre.family) && (!e.cadre.title || e.cadre.title === ED.liaisonTitle(e.cadre.dep, e.cadre.arr));
  e.cadre[key] = value;
  // une liaison : tant que le titre est celui que proposent les deux bouts (ou vide), il les suit (« LFPO → LFRS »)
  if (auto && (key === 'dep' || key === 'arr' || key === 'family')) {
    e.cadre.title = ED.liaisonTitle(e.cadre.dep, e.cadre.arr);
    const t = s.el.querySelector('input[data-k=edtitle]');
    if (t && t.value !== e.cadre.title) t.value = e.cadre.title;
  }
  // un départ ou une arrivée retouchés au Cadre : leur ligne des Lieux suit (sa position ne reste que si le code OACI ne change pas)
  if ((key === 'dep' || key === 'arr') && e.places) {
    const fresh = ED.placesOf(ED.withCadre(e.base, e.cadre)).find(r => r.kind === key),
      at = e.places.findIndex(r => r.kind === key);
    if (at >= 0) e.places = fresh ? e.places.map((r, i) => i === at ? fresh : r) : e.places.filter((_, i) => i !== at);
    else if (fresh) e.places = [fresh, ...e.places];
  }
}

/** Après chaque dessin de la page (module.js l'appelle à la fin de son dessin, et au démontage avec null) : dans l'atelier, la carte
 *  du socle est reposée dans l'emplacement neuf ; hors de l'atelier, elle est retirée avec son contexte WebGL. Les conditions du
 *  propriétaire de module.js (Features SOG, 18 nov. 2026), puisque cet appel est sur le chemin de chaque dessin : il ne lève JAMAIS
 *  (une erreur de la carte ne casse pas le dessin de la page) ; hors de l'atelier il ne fait rien — sans carte en vie, EM.stop() rend
 *  aussitôt, sans toucher la page ni rien charger (MapLibre n'est chargé qu'à l'ouverture de l'atelier) ; appelé deux fois, il est sans
 *  effet la seconde. */
export function edAfter(s) {
  try {
    if (!s) { // au démontage : la carte en vie, quelle qu'elle soit, et le champ de terrain (SOG-0465)
      edAdStop();
      return EM.stop();
    }
    // hors de l'atelier : la carte de l'ATELIER seulement — celle d'un bloc en lecture (mission_map.js : le Brief, la liseuse) reste
    if (!s.ed) {
      edAdStop();
      return EM.editing() ? EM.stop() : undefined;
    }
    edAd(s).paint(); // SOG-0465 : les lignes de nom sous Départ et Arrivée
    s.ed.mapLook = null; // le design a pu changer de ton entre deux dessins
    edMapShow(s);
    edPlShow(s); // SOG-0472 : la liste des Lieux reprend sa place, la ligne choisie en vue
  } catch {
    /* la carte ne casse jamais le dessin : l'écran garde son croquis */
  }
}

/** « À compléter » : les points à compléter, nommés (jamais bloquants) — la liste que le bouton du pied ouvre : ceux du départ, puis
 *  une ligne par tiroir (SOG-0445). */
function edTodoHtml(s, doc) {
  const names = edNames(),
    todo = edTodos(s.ed, doc),
    drawers = s.ed.veil ? [] : edDrawerTodo(s, doc), // SOG-0459 : rien d'un tiroir dans l'atelier voilé
    lines = [...todo.map(t => `<li data-todo="${t.key}">${esc(s.tt(names[t.step]))} : ${esc(todoText(s.tt, t) || s.tt(TX[`todo_${t.key}`]))}</li>`), ...drawers.map(t => `<li data-dtodo="${esc(t.name)}">${esc(t.text)}</li>`)];
  return lines.length ? `<ul class="ms-lines">${lines.slice(0, 7).join('')}</ul>${lines.length > 7 ? `<p class="f-muted">${esc(s.tt(TX.more, { n: lines.length - 7 }))}</p>` : ''}` : `<p>${esc(s.tt(TX.edNothing))}</p>`;
}

/** Le bouton « À compléter (n) » du pied : son compte (les points du départ et les tiroirs qui en ont), et sur un module large le
 *  premier point. */
function edTodoBtnHtml(s, doc) {
  const names = edNames(),
    todo = edTodos(s.ed, doc),
    drawers = s.ed.veil ? [] : edDrawerTodo(s, doc),
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

/** Ce que le pilote voit d'un tiroir (SOG-0445 ; SOG-0459) : fermé — RIEN (le pilote ne sait pas que le tiroir existe : ni titre, ni
 *  clé, ni compte ; la fiche le dit en une phrase fixe) ; ouvert — son titre, son message, le début de son briefing, sa suite de route.
 *  Lu du DOCUMENT de la séance par le lecteur (bornes, caractères invisibles retirés), jamais des lignes en mémoire (Sécurisation,
 *  18 nov.). → { name, msg, brief, route } (des textes). */
function edPilotView(s, doc, id) {
  const d = (MS.readMission(doc)?.drawers || []).find(x => x.id === id);
  if (!d) return {
    name: '',
    msg: '',
    brief: '',
    route: ''
  };
  return {
    name: d.title,
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
    // avec la carte : la zone ou l'objet se pose aussi sur elle, et devient la clé de ce tiroir
    onMap = (kind, text) => EM.stateOf(e) ? `<p class="ms-dwdraw"><button type="button" class="f-linkbtn" data-do="eddrdraw" data-kind="${kind}">${esc(s.tt(text))}</button></p>` : '',
    num = ' inputmode="decimal" maxlength="8"',
    fallback = field('fallback', EDTX.dwFallback, r.fallback, ' inputmode="numeric" maxlength="4"'),
    zones = of('zone'),
    objects = of('object'),
    read = (MS.readMission(doc)?.drawers || []).find(x => x.id === r.id),
    body = r.key === 'time' ? `<div class="f-row">${select('point', EDTX.dwPoint, r.point || 'ORIGIN', [['ORIGIN', s.tt(EDTX.dwAtTakeoff)], ...points])}${field('delay', EDTX.dwDelay, r.delay, ' inputmode="numeric" maxlength="4"')}</div>` :
    r.key === 'zone' ? `${zones.length || r.zone ? select('zone', EDTX.dwZone, r.zone, zones) : none(EDTX.dwNoZone)}${onMap('zone', EDTX.dwDraw)}${check('shown', EDTX.dwShown, r.shown === true)}${fallback}` :
    r.key === 'object' ? `${objects.length || r.object ? select('object', EDTX.dwObject, r.object, objects) : none(EDTX.dwNoObject)}${onMap('object', EDTX.dwPose)}${fallback}` :
    r.key === 'arrival' ? `${select('arrPoint', EDTX.dwArrPoint, r.arrPoint, [['DESTINATION', s.tt(EDTX.dwDest)], ['ORIGIN', s.tt(EDTX.dwDep)], ...points])}
        <div class="f-row">${field('arrRadius', EDTX.dwArrRadius, r.arrRadius, num)}${field('arrSpeed', EDTX.dwArrSpeed, r.arrSpeed, num)}</div>${check('arrGround', EDTX.dwArrGround, r.arrGround === true)}
        <div class="f-field"><span>${esc(s.tt(EDTX.dwStops))}</span><div class="ms-chips" data-dwstops>${r.stops.map((w, n) => now(w) ? `<span class="ms-chip" data-stop="${esc(now(w))}">${esc(now(w))}<button type="button" data-do="eddrstopdel" data-n="${n}" aria-label="${esc(s.tt(EDTX.dwStopDel, { id: now(w) }))}">×</button></span>` : '').join('')}</div></div>
        ${r.stops.length < 20 ? `<label class="f-field"><span class="f-muted">${esc(s.tt(EDTX.dwStopAdd))}</span><select data-k="eddr" data-f="stopadd"><option value=""></option>${points.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>` : ''}${fallback}` :
    r.key === 'kept' ? `<p class="f-muted" data-dwkept>${esc(s.tt(EDTX.dwKept, { why: s.tt(EDTX[`dwWhy_${r.keptWhy}`] || EDTX.dwWhy_condition) }))}</p>${fallback}` : '',
    route = r.route.map(now).filter(Boolean),
    lines = edDrawerLines(s, r, now),
    pv = edPilotView(s, doc, r.id),
    open = e.dopen || {},
    // un groupe repliable : son titre est un bouton qui dit son contenu en une ligne (replié sur un module étroit seulement)
    group = (k, title, inner) => `<div class="ms-dgrp" data-dgrp="${k}" data-open="${open[k] ? '1' : ''}"><button type="button" class="ms-atsum ms-dsum" data-do="eddrgrp" data-grp="${k}" aria-expanded="${!!open[k]}"><b>${esc(s.tt(title))}</b><span class="ms-atline f-muted" data-dline="${k}">${esc(lines[k])}</span></button><div class="ms-dbody">${inner}</div></div>`;
  return `<section class="f-card ms-atsheet" data-atsheet data-drawer="${esc(r.id)}"><h3 data-dwhead>${esc(s.tt(EDTX.dwSheet, { n: at + 1 }))}</h3>
    <div class="ms-dgrp" data-dgrp="key" data-open="1"><h4>${esc(s.tt(EDTX.dwGrpKey))}</h4>
      <div class="f-field"><span>${esc(s.tt(EDTX.dwKey))}</span><button type="button" class="f-item ms-kind" data-do="edkindopen" data-kindcur="${esc(r.key)}" aria-expanded="${e.kinds === 'drawer'}"><b>${esc(s.tt(EDTX[`dwKey_${r.key}`] || EDTX.dwKey_kept))}</b><span aria-hidden="true">▾</span>${read && MS.notJudgedYet(read.key) ? `<span class="f-muted">${esc(s.tt(EDTX.dwNotJudged))}</span>` : ''}</button></div>
      ${e.kinds === 'drawer' ? edKindsHtml(s, 'drawer', r.key) : ''}
      ${body}</div>
    ${group('texts', EDTX.dwGrpTexts, `${field('title', EDTX.dwTitle, r.title, ' maxlength="120"')}
      <label class="f-field"><span>${esc(s.tt(EDTX.dwMessage))}</span><textarea data-k="eddr" data-f="message" rows="3" maxlength="2000">${esc(r.message)}</textarea></label>
      <label class="f-field"><span>${esc(s.tt(EDTX.dwBrief))}</span><textarea data-k="eddr" data-f="brief" rows="6" maxlength="20000">${esc(r.brief)}</textarea></label>`)}
    ${group('route', EDTX.dwGrpRoute, `${route.length ? '' : `<p class="f-muted">${esc(s.tt(EDTX.dwRouteNone))}</p>`}
      <div class="ms-chips" data-dwroute>${edChipsHtml(s, r.id, edDrawerChips(e, r))}</div>${edChipMoveHtml(s, r.id, edDrawerChips(e, r))}
      ${route.length < 60 ? `<label class="f-field"><span class="f-muted">${esc(s.tt(EDTX.dwRouteAdd))}</span><select data-k="eddr" data-f="routeadd"><option value=""></option>${[...points, ['DESTINATION', s.tt(EDTX.dwDest)]].map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>` : ''}`)}
    ${group('pilot', EDTX.dwGrpPilot, `<div class="ms-pilot" data-pvbefore><span class="ms-attag f-muted">${esc(s.tt(EDTX.dwPilotBefore))}</span><p data-pvnothing>${esc(s.tt(EDTX.dwPilotNothing))}</p></div>
      <div class="ms-pilot" data-pvafter><span class="ms-attag f-muted">${esc(s.tt(EDTX.dwPilotAfter))}</span><p><b data-pvname>${esc(pv.name)}</b></p><p class="ms-pre" data-pvmsg>${esc(pv.msg)}</p><p class="ms-pre f-muted" data-pvbrief>${esc(pv.brief)}</p><p class="f-muted" data-pvroute>${esc(pv.route)}</p></div>`)}
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
  edUndoClear(e); // une retouche de la fiche d'un tiroir : « Annuler le geste » n'a plus rien à rendre
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
    hands: t.hands,
    puts: t.puts // « Placer l'avion ici » : les poses de l'auteur (le moteur les borne)
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
      `trUnknown_${l.why}`] || EDTX.trUnknown_data : l.ev === 'order' ? EDTX[`trOrder_${l.why}`] || EDTX.trUnknown_data : EDTX[
      `trEv_${l.ev}`] || EDTX.trUnknown_data;
    return `${trAt(s, l.min)} — ${s.tt(row, { n: l.ev === 'start' ? run.drawers.length : l.rank, first: l.first })}`;
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
  return `<section class="f-card ms-atsheet" data-atsheet data-trial><h3>${esc(s.tt(EDTX.trTitle))}</h3>
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
 *  départ en six groupes, le pied (« Enregistrer » et « Annuler » collés, comme dans les autres formulaires de la suite — SOG-0454 —
 *  puis « À compléter (n) »). */
export function edHtml(s) {
  const e = s.ed,
    doc = edDoc(e),
    run = edTrialRun(s, doc); // l'essai des clés en cours, ou null
  return `<style>${AT_STYLE}</style><div class="ms-ed ms-at" data-pane="editor" data-mode="${e.mode}" data-step="${e.step}" data-veil="${e.veil ? '1' : ''}"><p class="f-muted ms-crumb">${esc(s.tt(EDTX.atCrumb))}</p>
    <h2 data-edhead>${esc([e.cadre.id || s.tt(TX.edNewTitle), e.cadre.title].filter(Boolean).join(' · '))}</h2>
    ${e.pending ? `<span class="f-badge ms-edpend" data-kind="warn" data-edpending>${esc(s.tt(TX.edPending))}</span>` : ''}
    <div class="ms-atgrid"><div class="ms-atmain">${edMapHtml(s, doc, run)}${edFlowHtml(s, doc, run)}</div><div class="ms-atside">${run ? edTrialHtml(s, run) : `${edPlacesCardHtml(s, doc)}${e.veil || (e.sel || 'start') === 'start' ? edSheetHtml(s, doc) : edDrawerHtml(s, doc)}`}</div></div>
    <div class="ms-atfoot"><div class="f-card ms-attodo" data-edtodo${e.todoOpen ? '' : ' hidden'}>${edTodoHtml(s, doc)}</div>
    <div class="ms-atbar"><button type="button" class="primary" data-do="edsave"${e.busy ? ' disabled' : ''}>${esc(s.tt(TX.edSave))}</button><button type="button" class="ms-edcancel" data-do="edcancel">${esc(s.tt(TX.cancel))}</button><button type="button" class="ms-attodobtn" data-do="edtodo" data-edtodobtn aria-expanded="${!!e.todoOpen}">${edTodoBtnHtml(s, doc)}</button></div></div></div>`;
}

/** Une saisie de l'éditeur : un texte met à jour l'aperçu, les pastilles et l'en-tête seuls (le champ garde son curseur) ; une liste
 *  redessine l'écran (la famille propose son identifiant suivant et sa série à une mission neuve ou dupliquée). */
export function edInput(s, ev) {
  const e = s.ed,
    k = ev.target?.dataset?.k;
  if (k === 'eddr') return e.veil ? undefined : edDrawerInput(s, ev); // la fiche d'un tiroir (jamais dans l'atelier voilé)
  if (k === 'edrefseek') { // « Chercher un repère » : le texte est gardé ; Entrée (un « change » le champ encore en main) cherche
    e.refSeek = String(ev.target.value ?? '').slice(0, 40);
    if (e.seekRows) { // le texte a changé : les candidats de l'ancien ne se proposent plus
      e.seekRows = null;
      edSeekShow(s);
    }
    if (ev.type === 'change' && document.activeElement === ev.target) edRefSeek(s);
    return;
  }
  if (k === 'edmapspaces') { // « Espaces » : la couche des espaces aériens — le choix de l'auteur, écrit dans le fichier
    if (ev.type !== 'change' || ev.target.type !== 'checkbox') return;
    e.mapWant = {
      ...edMapWant(e),
      airspaces: ev.target.checked === true
    };
    e.spacesSaid = null;
    return edMapShow(s); // sur place : la carte allume ou éteint sa couche, rien n'est redessiné
  }
  if (k === 'edmapview') { // « Vue de la carte » : tout (l'auteur), ou ce que le pilote voit à un stade ; plus de lieu choisi
    if (ev.type !== 'change' || ev.target.tagName !== 'SELECT' || e.veil) return;
    const n = Number(ev.target.value);
    e.mapView = Number.isInteger(n) && n >= 0 && n <= edDrawers(e).length ? n : -1;
    e.mapSel = -1;
    e.mapVertex = -1;
    e.mapRef = null;
    e.drawFor = '';
    return draw(s);
  }
  if (k === 'edroute') { // la route du départ : « Ajouter un lieu… » en ajoute un (avant l'arrivée quand elle termine la route)
    const token = String(ev.target.value || '').slice(0, 40);
    // seulement le jeton d'un lieu de la séance : une page forgée n'écrit pas un identifiant quelconque dans la route
    if (ev.type !== 'change' || ev.target.tagName !== 'SELECT' || !token || !edShown(e, e.places || ED.placesOf(edDoc(e))).some(r => r && ED
        .routeToken(r) ===
        token)) return;
    edUndoClear(e); // une retouche de la fiche : « Annuler le geste » n'a plus rien à rendre (il ne défait jamais une saisie)
    edRouteAdd(s, e, token);
    return draw(s);
  }
  if (k === 'edtr') return edTrialInput(s, ev); // le volet de l'essai des clés
  if (k === 'edevent') { // un événement : le champ retouché en place (le lieu, une liste, aussi)
    const row = e.events?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    // SOG-0459 : dans l'atelier voilé, seul un lieu montré (ou aucun) se choisit — une page forgée ne pose pas un lieu caché
    const shownPlace = v => !v || edShown(e, ED.placesOf(edDoc(e))).some(p => p && p.id && p.id.toUpperCase() === v);
    if (row && ['at', 'place', 'text'].includes(f) && !(f === 'place' && e.veil && !shownPlace(ev.target.value.toUpperCase()))) row[f] =
      f === 'place' ? ev.target.value.toUpperCase() : ev.target.value;
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
  if (k === 'edplace' || k ===
    'edplname') { // un lieu : le champ retouché en place, la ligne redessinée à « OK » (edplname : son Nom, champ commun)
    const row = e.places?.[+ev.target.dataset.i],
      f = ev.target.dataset.f;
    if (edHid(e, +ev.target.dataset.i)) return; // SOG-0459 : une ligne cachée n'est jamais retouchée
    // SOG-0459 : l'identifiant d'un lieu du fichier ne change pas dans l'atelier voilé — la même phrase pour tous
    if (e.veil && row && row.i >= 0 && f === 'id') {
      if (ev.target.value !== row.id) ev.target.value = row.id;
      return s.ctx.notify(s.tt(EDTX.veilLocked), 'warn', {
        key: 'missions-veil'
      });
    }
    edUndoClear(e); // « Annuler le geste » ne défait jamais une saisie : après elle, il n'a plus rien à rendre
    // l'identifiant d'un objet est donné par l'atelier : il ne se saisit pas, même par une page forgée (Sécurisation, 18 nov.)
    if (row && ['id', 'name', 'role', 'lat', 'lon', 'zkind', 'radius', 'tot', 'participants'].includes(f) && !(row.kind === 'object' &&
        f ===
        'id')) row[f] = ev.target.value;
    // un objet à trouver : son identifiant ne se saisit pas ; « trouvé sur la parole du pilote » est une case
    else if (row?.kind === 'object' && ['okind', 'range', 'height', 'alt'].includes(f)) row[f] = ev.target.value;
    else if (row?.kind === 'object' && f === 'confirm') row.confirm = ev.target.checked === true;
    if (k === 'edplname') edPlName(s, e, ev, +ev.target.dataset
      .i); // SOG-0480 : un choix de la liste donne le code et la position de la base
    if (f === 'name' && ev.type === 'change') edNameBase(s, e, +ev.target.dataset
      .i); // SOG-0495 : un code tapé de la base prend sa position
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
  if (key === 'dep' || key === 'arr') { // SOG-0465 : le champ de terrain de la suite prend la frappe d'abord (sa ligne, sa liste)
    edAd(s).onInput(ev);
    const v = edAdValue(s, key, ev);
    if (v === null) return;
    edCadreSet(s, key, v);
    if (ev.type === 'input') edRefresh(s);
    return;
  }
  const v = ev.target.value;
  edCadreSet(s, key, key === 'id' || key === 'aircraft' ? v.toUpperCase() : key === 'airline' && v === MS.PERSONAL ? '' : v);
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
/** SOG-0469 : la base aéronautique vient de dire qu'elle connaît un terrain — le départ et l'arrivée, que le Cadre montrait tels qu'écrits
 *  (« xtst »), se lisent maintenant avec leur code en majuscules (« XTST »). Seuls les textes que l'auteur n'a pas touchés changent : un
 *  champ saisi, ou en cours de saisie, n'est jamais remplacé ; leur ligne des Lieux suit. Le texte du groupe et la carte sont
 *  redessinés SUR PLACE par l'appelant (edRefresh). */
function edRecode(s) {
  const e = s.ed,
    was = e.cadreAuto || {},
    now = ED.cadreOf(e.base);
  for (const [k, field] of [
      ['dep', 'eddep'],
      ['arr', 'edarr']
    ]) {
    if (e.cadre[k] === was[k] && now[k] !== was[k]) {
      e.cadre[k] = now[k];
      const input = s.el.querySelector(`input[data-k=${field}]`);
      // SOG-0465 : le champ montre le code d'un terrain (son nom dessous), le texte d'un autre lieu
      if (input && document.activeElement !== input && input.value !== ED.fieldText(now[k])) input.value = ED.fieldText(now[k]);
      if (e.places) e.places = e.places.map(r => r && r.kind === k && r.name === was[k] ? {
        ...r,
        name: now[k]
      } : r);
    }
  }
  e.cadreAuto = {
    dep: now.dep,
    arr: now.arr
  };
  edAd(s).paint();
}
/** SOG-0287 (fin) : la position d'un terrain de liaison d'après la base publiée (aerodb.aerodromes), demandée une fois par code ; null
 *  (inconnu), absente tant que la réponse n'est pas venue ; l'aperçu redessiné à la réponse. */
function adPosOf(s, icao) {
  const k = String(icao || '').toUpperCase();
  if (!ED.isCode(k)) return null; // le test du champ de terrain de la suite (ED.isCode)
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
      ED.noteAerodrome(k, !!v); // un texte n'est un terrain que si la base le connaît (SOG-0469)
      if (v && state() === s && s.ed) {
        edRecode(s);
        edRefresh(s);
      }
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
  for (const p of edShown(s.ed, ED.placesOf(doc)).filter(Boolean)) { // SOG-0459 : l'atelier voilé ne dessine pas le caché
    let lat = p.lat === '' ? NaN : +p.lat,
      lon = p.lon === '' ? NaN : +p.lon;
    if ((p.kind === 'dep' || p.kind === 'arr') && !(Number.isFinite(lat) && Number.isFinite(lon))) {
      // « XTST · Base Test » (placeText : le code d'abord, en majuscules ; SOG-0469 : quelle que soit la casse)
      const q = adPosOf(s, ED.adCodeOf(p.name));
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
 *  chaque groupe, le déroulé, le croquis, « À compléter », les lignes des Lieux (titre et détail). Aucun bouton n'est remplacé ; seuls des textes et des attributs changent. */
function edRefresh(s) {
  const e = s.ed,
    doc = edDoc(e),
    q = sel => s.el.querySelector(sel),
    put = (node, text) => {
      if (node && node.textContent !== text) node.textContent = text;
    };
  put(q('[data-edhead]'), [e.cadre.id || s.tt(TX.edNewTitle), e.cadre.title].filter(Boolean).join(' · '));
  for (const k of ED.STEPS) {
    const ok = edStepOk(e, doc, k),
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
    for (const k of ['name', 'msg', 'brief', 'route']) put(q(`[data-pv${k}]`), pv[k]);
  }
  const dtodo = new Set(DR.drawersTodo(doc).map(t => t.name));
  for (const d of e.veil ? [] : MS.readMission(doc)?.drawers || []) {
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
  // SOG-0480 : le titre et le détail de chaque ligne des Lieux disent la ligne EN COURS d'édition (un point pris dans la base, une
  // saisie), pas celle de l'ouverture ; sur place, la fiche ouverte n'est pas touchée (pas de second chemin de redessin)
  const places = q('[data-edplaces]');
  if (places) {
    const fresh = document.createElement('template');
    fresh.innerHTML = edPlacesHtml(s, true);
    for (const f of fresh.content.querySelectorAll('[data-place]')) {
      const live = places.querySelector(`[data-place="${f.dataset.place}"]`);
      for (const sel of ['.ms-plbody > b', '.ms-plbody > .f-muted']) put(live?.querySelector(sel), f.querySelector(sel)?.textContent ?? '');
    }
  }
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
      start: null, // « Annuler » compare désormais au fichier enregistré
      cadre: ED.cadreOf(doc),
      teams: null,
      // le groupe « Lieux » resté déplié garde sa liste : ses lignes sont relues du fichier enregistré (sans cela la liste se vidait
      // jusqu'à ce qu'on replie et rouvre le groupe)
      places: e.step === 'places' ? ED.placesOf(doc) : null,
      placeEdit: -1,
      route: null,
      // la carte : plus de lieu choisi, plus de geste à annuler (un état d'avant désignerait les rangs de l'ancien fichier)
      mapWant: null, // le fond et la couche sont désormais ceux du fichier enregistré
      mapSel: -1,
      mapView: -1,
      mapRef: null,
      seekRows: null,
      chipSel: null,
      mapVertex: -1,
      mapUndo: null,
      mapRedo: null,
      tool: 'select',
      drawFor: '',
      story: null,
      risks: null,
      riskEdit: -1,
      events: null,
      mapsAdd: null,
      drawers: null,
      drawerAsk: '',
      kinds: '',
      path,
      origId: c.id,
      regIdx: line ? line.idx : e.regIdx,
      regId: line ? cut(line.raw.id, 40) : e.regId,
      pending: true
    });
    // SOG-0485 : le groupe resté déplié (Récit, Équipes, Risques, Chronologie) relit ses lignes du fichier enregistré — sans cela ses
    // champs se montraient vides (« le brief est vidé ») et ce qu'on y tapait ensuite n'était jamais écrit
    edLoadStep(e);
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

/** Les lignes du groupe déplié de la fiche, lues du fichier à sa première ouverture et après « Enregistrer » (SOG-0485) ; des lignes
 *  déjà dans la séance sont gardées telles quelles (les retouches passent d'une étape à l'autre). Un groupe montré sans ses lignes
 *  dans la séance affichait des champs vides, et ce qu'on y tapait n'était jamais écrit. */
function edLoadStep(e) {
  // la première ouverture des Équipes, du Récit, des Risques et de la Chronologie lit ceux du fichier
  if (e.step === 'teams' && !e.teams) e.teams = ED.teamsOf(e.base);
  // les lieux lus du document au cadre déjà retouché (le départ et l'arrivée portent le nom saisi au Cadre)
  if (e.step === 'places' && !e.places) e.places = ED.placesOf(edDoc(e));
  if (e.step === 'story' && !e.story) e.story = ED.storyOf(e.base);
  if (e.step === 'risks' && !e.risks) e.risks = ED.risksOf(e.base);
  if (e.step === 'timeline' && !e.events) e.events = ED.eventsOf(e.base);
}

/** Les gestes de l'éditeur et ses entrées depuis le Registre. */
export function edClick(s, b) {
  const r = s.reg,
    idx = Number.isInteger(+b.dataset.rid) ? +b.dataset.rid : -1,
    line = r?.lines.find(x => x.idx === idx);
  // SOG-0459 : dans l'atelier voilé, rien d'un tiroir ni de l'essai ne joue — même d'une page forgée
  if (s.ed?.veil && VEILED_OFF.has(b.dataset.do)) return;
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
        hands: {},
        puts: [],
        putting: false
      };
      return draw(s);
    }
    case 'edtrialoff':
      s.ed.trial = null;
      return draw(s);
    case 'edtrreset':
      if (s.ed.trial) Object.assign(s.ed.trial, {
        min: 0,
        hands: {},
        puts: [], // « Recommencer » oublie aussi les poses de l'avion
        putting: false
      });
      return draw(s);
    case 'edtrput': // « Placer l'avion ici » : pris en main sur place (repris, il est lâché) ; le toucher suivant de la carte pose l'avion
      if (!s.ed.trial?.on) return;
      s.ed.trial.putting = !s.ed.trial.putting;
      return edMapShow(s);
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
    case 'edsel': { // une carte du déroulé : la fiche du départ, ou celle d'un tiroir (jamais dans l'atelier voilé)
      const id = String(b.dataset.sel || '');
      s.ed.sel = !s.ed.veil && id !== 'start' && edDrawers(s.ed).some(r => r.id === id) ? id : 'start';
      s.ed.drawerAsk = '';
      s.ed.dopen = {};
      s.ed.kinds = '';
      return draw(s);
    }
    case 'eddradd': // « ＋ Tiroir » (SOG-0467) : ouvre sous lui le choix du type, retouché il le referme — rien n'est créé
      if (!DR.blankDrawer(edDrawers(s.ed), s.ed.base)) return s.ctx.notify(s.tt(EDTX.dwMax), 'info');
      s.ed.kinds = s.ed.kinds === 'new' ? '' : 'new';
      return draw(s);
    case 'edkindopen': // la clé d'un tiroir : le même choix, ouvert ou refermé dans sa fiche
      if (!edDrawerRow(s.ed)) return;
      s.ed.kinds = s.ed.kinds === 'drawer' ? '' : 'drawer';
      return draw(s);
    case 'edkindoff': // « Annuler » : le choix se referme, rien n'est créé ni changé
      s.ed.kinds = '';
      return draw(s);
    case 'edkind':
      return edKind(s, b.dataset.key);
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
      return s.el.querySelector('[data-atplaces]')?.scrollIntoView?.({
        block: 'nearest'
      });
    }
    case 'eddrstopdel': { // un arrêt retiré de ceux qu'une arrivée demande
      const r = edDrawerRow(s.ed),
        n = +b.dataset.n;
      if (r && Number.isInteger(n) && n >= 0) r.stops = r.stops.filter((_, i) => i !== n);
      return draw(s);
    }
    case 'edchippick': { // une pastille de route choisie (reprise : lâchée) — sur place, la pastille pressée n'est pas redessinée
      const e = s.ed;
      if (e.veil && b.dataset.where !== 'start') return; // la suite de route d'un tiroir : jamais dans l'atelier voilé
      const where = b.dataset.where === 'start' ? 'start' : edDrawerRow(e)?.id,
        n = +b.dataset.n;
      if (!where || !Number.isInteger(n) || n < 0) return;
      if (where === 'start' && (n < ED.routeFree(edRoute(e)).lo || n > ED.routeFree(edRoute(e)).hi)) return; // une ancre ne se choisit pas
      e.chipSel = edChipSel(e, where) === n ? null : {
        where,
        n
      };
      return edChipsShow(s, where, false);
    }
    case 'edchipmove': { // « ← Plus tôt » / « Plus tard → » : la pastille choisie avance ou recule d'un rang ; sur place
      const e = s.ed,
        start = b.dataset.where === 'start';
      if (e.veil && !start) return; // la suite de route d'un tiroir : jamais dans l'atelier voilé
      const r = start ? null : edDrawerRow(e),
        where = start ? 'start' : r?.id,
        n = where ? edChipSel(e, where) : -1,
        step = b.dataset.step === '-1' ? -1 : 1;
      if (n < 0) return;
      const list = start ? edRoute(e) : r.route,
        // la route du départ garde son départ premier et son arrivée dernière ; la suite d'un tiroir est libre
        made = start ? ED.routeMoveStart(list, n, step) : ED.routeMove(list, n, step, w => !!ED.refNow(w, e.base, e.places));
      if (made.route === list) return edChipsShow(s, where, false);
      if (start) e.route = made.route;
      else r.route = made.route;
      e.chipSel = {
        where,
        n: made.at
      };
      edUndoClear(e); // une retouche de la fiche : « Annuler le geste » n'a plus rien à rendre
      edChipsShow(s, where, true);
      return edRefresh(s);
    }
    case 'edroutedel': { // un lieu retiré de la route du départ (sa pastille)
      const n = +b.dataset.n,
        route = edRoute(s.ed);
      s.ed.chipSel = null;
      // le départ en tête et l'arrivée en queue ne se retirent pas (une route sans départ n'a pas de sens) : leur croix n'est pas
      // donnée, et une page forgée ne les retire pas non plus
      if (Number.isInteger(n) && n >= ED.routeFree(route).lo && n <= ED.routeFree(route).hi) s.ed.route = route.filter((_, k) => k !== n);
      edUndoClear(s.ed); // une retouche de la fiche : « Annuler le geste » n'a plus rien à rendre
      return draw(s);
    }
    case 'eddrchipdel': { // un lieu retiré de la suite de route
      const r = edDrawerRow(s.ed),
        n = +b.dataset.n;
      s.ed.chipSel = null;
      if (r && Number.isInteger(n) && n >= 0) r.route = r.route.filter((_, i) => i !== n);
      edUndoClear(s.ed); // une retouche de la fiche : « Annuler le geste » n'a plus rien à rendre
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
    case 'edtool': // un outil de la carte pris en main : sur place (le bouton pressé n'est pas redessiné) ; le même outil repris le lâche
      if (s.ed.holdDone) { // le clic qui termine un appui long sur « Zone » : la forme a déjà changé
        s.ed.holdDone = false;
        return;
      }
      if (b.dataset.tool === 'zone' && edMapTool(s.ed) === 'zone' && !s.ed.drawFor) return edZoneFlip(s); // SOG-0471 : la forme change
      s.ed.tool = ['point', 'route', 'zone', 'object'].includes(b.dataset.tool) && s.ed.tool !== b.dataset.tool ? b.dataset.tool : 'select';
      s.ed.drawFor = ''; // un outil pris à la main ne pose plus pour un tiroir
      s.ed.mapRef = null;
      return edMapShow(s);
    case 'edrefseek': // « Chercher » : le repère de ce nom (sur place : le bouton pressé n'est pas redessiné)
      return edRefSeek(s);
    case 'edrefgo': { // un candidat de la recherche choisi : la vue y va
      const e = s.ed,
        i = Number(b.dataset.i),
        r = Number.isInteger(i) && i >= 0 && Array.isArray(e.seekRows) ? e.seekRows[i] : null;
      return r ? edSeekGo(s, e, r) : undefined;
    }
    case 'edrefadd': { // « Ajouter comme point » : le repère touché devient un point tournant de la mission, à sa position, sous son nom
      const e = s.ed,
        r = edMapRef(e);
      if (!r) return edMapShow(s);
      const at = edPlaceFromBase(s, e, { // le chemin commun : un point de la base devient un lieu (SOG-0481)
        kind: 'pt',
        code: r.id,
        lat: r.lat,
        lon: r.lon
      });
      if (at < 0) return edMapShow(s);
      return edMapPick(s, e, at);
    }
    case 'eddrdraw': { // « Dessiner sur la carte » (une zone) ou « Poser sur la carte » (un objet) depuis la fiche d'un tiroir : l'outil
      // en main, la carte dépliée ; ce qui sera posé deviendra la clé de ce tiroir
      const e = s.ed,
        kind = b.dataset.kind === 'object' ? 'object' : 'zone';
      if (!EM.stateOf(e) || !edDrawerRow(e)) return;
      e.tool = kind;
      e.drawFor = e.sel;
      e.mapOpen = true;
      draw(s);
      return s.el.querySelector('[data-atmap]')?.scrollIntoView?.({
        block: 'nearest'
      });
    }
    case 'edvertexdel': { // « Retirer ce sommet » : le sommet choisi du contour choisi (jamais sous trois)
      const e = s.ed,
        before = edPlaces(e),
        after = ED.removeVertex(before, edMapSel(e), edMapVertex(e));
      if (after === before) {
        s.ctx.notify?.(s.tt(EDTX.atVertexMin), 'warn');
        return edMapShow(s);
      }
      edMapRemember(e);
      e.places = after;
      e.mapVertex = -1;
      return draw(s);
    }
    case 'edzoneshape': { // la forme d'une zone, dans sa fiche : ronde → un contour de six sommets à son rayon ; contour → ronde
      const e = s.ed,
        i = +b.dataset.i;
      if (edHid(e, i)) return; // SOG-0459 : une ligne cachée n'est jamais retouchée
      const before = edPlaces(e),
        after = before[i]?.poly ? ED.toRound(before, i) : ED.toContour(before, i);
      if (after === before) return s.ctx.notify?.(s.tt(EDTX.plShapeNeeds), 'warn');
      edMapRemember(e);
      e.places = after;
      e.mapSel = i;
      e.mapVertex = -1;
      draw(s);
      return edMapFocus(e, i); // « Changer en polygone » cadre la vue sur la zone
    }
    case 'edmapundo': { // « Annuler le geste » : l'état d'avant le dernier geste de la carte — les lignes des Lieux, la route du
      // départ, la suite de route et la clé des tiroirs (edMapRemember) ; le lieu choisi le reste quand il existe encore à son rang
      // (le même identifiant, la même sorte), sinon plus aucun
      const e = s.ed,
        snap = e.mapUndo?.undo();
      if (!snap || !Array.isArray(snap.places)) return edMapShow(s);
      (e.mapRedo ||= createUndo(20)).push(edMapSnap(e)); // SOG-0471 : l'état d'après, pour « Rétablir »
      return edMapBack(s, e, snap);
    }
    case 'edmapredo': { // « Rétablir » (SOG-0471) : le dernier geste annulé est rejoué — l'état d'après revient, celui d'avant retourne à
      // « Annuler le geste » (la même pile, sans vider « Rétablir »)
      const e = s.ed,
        snap = e.mapRedo?.undo();
      if (!snap || !Array.isArray(snap.places)) return edMapShow(s);
      (e.mapUndo ||= createUndo(20)).push(edMapSnap(e));
      return edMapBack(s, e, snap);
    }
    case 'edstep':
      if (!ED.OPEN.includes(b.dataset.step)) return;
      // un groupe touché se déplie ; déjà déplié, il se replie (un seul à la fois)
      s.ed.step = s.ed.step === b.dataset.step ? '' : b.dataset.step;
      edLoadStep(s.ed);
      draw(s);
      // le groupe déplié vient à l'écran (sans faire sauter la page)
      return s.el.querySelector('[data-steps] [aria-current]')?.scrollIntoView?.({
        inline: 'nearest',
        block: 'nearest'
      });
    case 'edplace':
      if (edHid(s.ed, +b.dataset.i)) return; // SOG-0459 : une ligne cachée ne s'ouvre pas
      edPlaces(s.ed); // SOG-0472 : la liste est toujours montrée, les lignes de la séance naissent quand on en ouvre une
      s.ed.placeAsk = -1;
      s.ed.placeEdit = s.ed.placeEdit === +b.dataset.i ? -1 : +b.dataset.i;
      // la liste et la carte disent le même lieu : la ligne ouverte est le lieu choisi sur la carte (refermée : plus aucun)
      s.ed.mapSel = s.ed.placeEdit;
      s.ed.mapVertex = -1;
      draw(s);
      return edMapFocus(s.ed, s.ed.placeEdit);
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
        row = edPlaces(s.ed)[i];
      // SOG-0459 : dans l'atelier voilé, un lieu du fichier ne se retire pas sans dévoiler — la même phrase pour TOUS (un refus au cas
      // par cas serait un indice) ; un lieu ajouté dans la séance (i = -1) se retire librement
      if (s.ed.veil && row && row.i >= 0) return s.ctx.notify(s.tt(EDTX.veilLocked), 'warn', {
        key: 'missions-veil'
      });
      const note = {
          key: 'missions-place-cited',
          ms: 3600e3
        },
        r = ED.removePlace(s.ed.places, i, edCiteDoc(s.ed), s.ed.placeAsk ?? -1, Date.now() - (s.ed.placeAskAt || 0));
      if (r.wait) return;
      if (r.ask >= 0) {
        s.ed.placeAskAt = Date.now();
        s.ctx.notify(citedText(s.tt, row, r.cited), 'warn', note);
      } else {
        s.ed.placeEdit = -1;
        edUndoClear(s.ed); // les rangs ont changé : plus de geste à annuler, plus de lieu choisi sur la carte
        s.ed.mapSel = -1;
        if (r.cited.length) s.ctx.notify(removedText(s.tt, row), 'ok', {
          key: note.key
        });
      }
      s.ed.places = r.rows;
      s.ed.placeAsk = r.ask;
      return draw(s);
    }
    case 'edplaceadd': { // une ligne neuve à la place de sa sorte (ED.newPlace : la même que la pose sur la carte), son premier champ en main
      if (s.ed.veil && b.dataset.kind === 'target') return; // « + Cible » n'est pas donné dans l'atelier voilé
      // SOG-0481 : avec un repère de la base choisi sur la carte, « + Point tournant » et « + Cible » ajoutent CE point (le même chemin
      // qu'« Ajouter comme point ») ; sans repère, une ligne neuve à placer
      const ref = ['pt', 'target'].includes(b.dataset.kind) ? edMapRef(s.ed) : null;
      if (ref) {
        const at = edPlaceFromBase(s, s.ed, {
          kind: b.dataset.kind,
          code: ref.id,
          lat: ref.lat,
          lon: ref.lon
        });
        return at < 0 ? edMapShow(s) : edMapPick(s, s.ed, at);
      }
      const made = ED.newPlace(edPlaces(s.ed), b.dataset.kind, s.ed.base);
      if (!made) return;
      edUndoClear(s.ed); // les rangs ont changé : plus de geste à annuler, plus de lieu choisi sur la carte
      s.ed.mapSel = -1;
      s.ed.places = made.rows;
      s.ed.placeEdit = made.at;
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
    case 'edmapbase': { // « Fond » : Rapide ou Relief — le choix de l'auteur, écrit dans le fichier ; la carte est refaite sur place
      const base = EM.baseOf(b.dataset.base);
      s.ed.mapWant = {
        ...edMapWant(s.ed),
        base
      };
      for (const x of s.el.querySelectorAll('[data-maplook] [data-do=edmapbase]')) x.setAttribute('aria-pressed', String(x.dataset
        .base === base));
      return edMapShow(s);
    }
    case 'edunveil': // « Dévoiler la mission complète » (SOG-0459) : la question du cadre, puis l'atelier entier
      return edUnveil(s);
    case 'edcancel':
      return edLeave(s);
  }
}

/** Les gestes qui ne jouent pas dans l'atelier voilé (SOG-0459) : l'essai des clés, les tiroirs, les cartes proposées (elles nomment
 *  les zones par leur rang). */
const VEILED_OFF = new Set(['edtrial', 'edtrhand', 'edtrput', 'edtrreset', 'eddradd', 'eddrdel', 'eddrgrp', 'eddrplaces', 'eddrstopdel',
  'eddrchipdel', 'eddrdraw', 'edmapspropose', 'edkind', 'edkindopen', 'edkindoff'
]);

/** Un type touché dans le choix (SOG-0467) : sous « ＋ Tiroir », le tiroir suivant naît avec cette clé (DR.keyed : ce qu'elle devine)
 *  et sa fiche s'ouvre, son titre en main ; dans la fiche d'un tiroir, sa clé devient celle-ci (la même : rien ne change). Le choix se
 *  referme. Une sorte que DR.TYPES ne propose pas (une page forgée) : rien. */
function edKind(s, key) {
  const e = s.ed;
  if (!DR.TYPES.some(t => t.key === key) || !['new', 'drawer'].includes(e.kinds)) return;
  const places = e.places || ED.placesOf(edDoc(e));
  if (e.kinds === 'new') {
    const blank = DR.blankDrawer(edDrawers(e), e.base);
    e.kinds = '';
    if (!blank) {
      s.ctx.notify(s.tt(EDTX.dwMax), 'info');
      return draw(s);
    }
    edDrawerRow(e);
    const row = DR.keyed(blank, key, places);
    row.said = edSaid(s, row);
    e.drawers = [...e.drawers, row];
    e.sel = row.id;
    e.drawerAsk = '';
    e.dopen = {
      texts: true
    };
    draw(s);
    return s.el.querySelector('[data-drawer] [data-f=title]')?.focus();
  }
  const r = edDrawerRow(e);
  e.kinds = '';
  if (r && r.key !== key) {
    edUndoClear(e); // une retouche de la fiche d'un tiroir : « Annuler le geste » n'a plus rien à rendre
    const next = DR.keyed(r, key, places);
    next.said = edSaid(s, next);
    e.drawers[e.drawers.indexOf(r)] = next;
  }
  return draw(s);
}

/** « Dévoiler la mission complète » (SOG-0459) : la question du cadre (« Dévoiler » / « Garder le secret ») ; sur oui, l'atelier
 *  d'aujourd'hui, entier — les saisies de la séance voilée sont gardées ; une mission qui ne cachait rien (aucun tiroir, aucune ligne
 *  cachée) le dit. Dévoiler n'est pas une saisie : la mission n'en devient pas « changée » (edDirty ne lit que le document). */
async function edUnveil(s) {
  const e = s.ed;
  if (!e?.veil) return;
  if (!(await s.ctx.ask(s.tt(EDTX.veilAsk), {
      ok: s.tt(EDTX.veilOk),
      cancel: s.tt(EDTX.veilKeep)
    }))) return;
  if (state() !== s || s.ed !== e) return; // l'écran a changé pendant la question
  const nothing = !DR.drawerRowsOf(e.base).length && !(e.veilHide || []).length;
  e.veil = false;
  e.sel = 'start';
  draw(s);
  if (nothing) s.ctx.notify(s.tt(EDTX.veilNothing), 'info');
}

/** Vrai quand la mission de l'atelier porte un changement non enregistré : son document n'est plus celui de l'ouverture (une
 *  mission neuve ou une copie : `start`, pris à l'ouverture) ni celui du dernier enregistrement (`base`). */
function edDirty(e) {
  return !ED.same(edDoc(e), e.start || e.base);
}

/** Déclare l'atelier au cadre (SOG-0458, `ctx.unsaved`) : la fonction que le cadre interroge au moment de quitter lit l'état À CE MOMENT-LÀ —
 *  vraie seulement si l'atelier est ouvert ET modifié (après « Enregistrer » l'état est à jour, un atelier fermé dit faux). Idempotente :
 *  la même clé côté cadre, une déclaration ne s'ajoute pas à l'autre. */
function edDeclare(s) {
  s.ctx.unsaved?.(() => !!s.ed && edDirty(s.ed));
}

/** « Annuler » (SOG-0454) : quitte l'atelier et rend le registre ; avec un changement non enregistré, la question du cadre d'abord
 *  (les mots du cadre : « Quitter sans enregistrer » / « Rester ») — rien n'est quitté sans le oui. L'atelier fermé, la déclaration au
 *  cadre est retirée : aucune seconde question. */
async function edLeave(s) {
  const e = s.ed;
  if (!e) return;
  if (edDirty(e) && !(await s.ctx.ask(s.tt(EDTX.leaveAsk), {
      ok: s.tt(EDTX.leaveOk),
      cancel: s.tt(EDTX.leaveStay)
    }))) return;
  if (state() !== s || s.ed !== e) return; // l'écran a changé pendant la question
  s.ed = null;
  s.ctx.unsaved?.(null); // l'atelier n'existe plus : plus rien à garder (le cadre ne pose pas une seconde question)
  draw(s);
  if (s.reg) regLoad(s);
}
