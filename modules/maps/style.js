// V3 maps — règles de style du module Carte (modules/maps/SPEC.md § 4, § 7, § 17), posées dans la racine au montage. Elles ne
// font que placer : les couleurs sont les jetons du cadre (--sog-…) et ses primitives (.f-sheet, .f-overlay, .f-card).
// Le panneau des modes et les icônes des modes sont dans la couche de superposition du cadre (.f-overlay, sœur de la racine) :
// leurs règles la nomment.

export const STYLE = `
/* L'ÉCRAN EST FIXE (meta.fixed) : la racine est une colonne à la hauteur de la vue du cadre, rien n'en dépasse ni ne fait
   défiler la page — en-tête du cadre · carte (prend ce qui reste ; ses boutons sont dans la couche de superposition du cadre,
   frame/INTEGRATION.md § 9.3) · feuille de données de hauteur fixe · barre du cadre ; ce qui est plus grand défile DANS sa zone. La racine est isolée (z-index des boutons de la carte, 3 à 8,
   gardés sous l'en-tête et la barre du bas du cadre, dans le volet de la vue double aussi). Hors vue fixe (volet,
   page d'essai) la hauteur est donnée plus bas. */
[data-module="maps"]{display:flex;flex-direction:column;min-height:0;overflow:hidden;isolation:isolate}
[data-module="maps"] .mp-sr{position:absolute;top:0;left:0;width:1px;height:1px;margin:0;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
[data-module="maps"] .mp-box{position:relative;flex:1 1 0;min-height:0;border:solid var(--sog-border);border-width:1px 0;overflow:hidden;background:var(--mp-base,var(--sog-bg));touch-action:none}
[data-module="maps"] .mp-map{position:absolute;inset:0}
[data-module="maps"] canvas.mp-over{position:absolute;left:0;top:0;pointer-events:none}
[data-module="maps"] .mp-prof{position:relative;flex:1 1 0;min-height:0;max-height:380px;border:1px solid var(--sog-border);border-radius:var(--sog-radius);overflow:hidden;background:var(--sog-chart-bg);touch-action:none;cursor:crosshair}
[data-module="maps"] .mp-prof canvas{position:absolute;inset:0;width:100%;height:100%}
[data-module="maps"] .mp-strip{flex:none;height:34px;overflow-y:auto;font-size:var(--sog-size-xs);line-height:16px;padding:1px 0;font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-box{container-type:inline-size}
:is([data-module="maps"],.f-overlay) .mp-choice{display:grid;place-items:center;width:var(--sog-touch);height:var(--sog-touch);min-height:0;padding:0;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:var(--sog-surface);color:var(--sog-fg);font:inherit;cursor:pointer}
.f-overlay .mp-mode-opts{position:absolute;right:60px;top:8px;z-index:8;pointer-events:auto;display:flex;gap:4px;padding:4px;width:max-content;max-width:calc(100cqw - 16px);flex-wrap:wrap;box-sizing:border-box;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:var(--sog-surface);box-shadow:0 4px 12px #0000001f}
.f-overlay .mp-mode-opts[hidden]{display:none}
:is([data-module="maps"],.f-overlay) .mp-choice{border-color:transparent;border-radius:var(--sog-radius-s)}
:is([data-module="maps"],.f-overlay) .mp-choice:hover{background:color-mix(in srgb,var(--sog-accent) 12%,var(--sog-surface))}
:is([data-module="maps"],.f-overlay) .mp-choice[aria-pressed=true]{color:var(--sog-accent);background:color-mix(in srgb,var(--sog-accent) 16%,var(--sog-surface));box-shadow:inset 0 0 0 1.5px var(--sog-accent),inset 0 2px 3px #0000002e}
:is([data-module="maps"],.f-overlay) .mp-ic{display:grid;place-items:center;width:24px;height:24px}
:is([data-module="maps"],.f-overlay) .mp-ic svg{width:20px;height:20px}
:is([data-module="maps"],.f-overlay) .mp-ifr{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:26px;height:20px;font-size:11px;font-weight:700;letter-spacing:.3px;line-height:1}
:is([data-module="maps"],.f-overlay) .mp-ceil{border-top:2px solid currentColor;padding-top:1px}
:is([data-module="maps"],.f-overlay) .mp-floor{border-bottom:2px solid currentColor;padding-bottom:1px}
:is([data-module="maps"],.f-overlay) .mp-topo{display:block;position:relative;box-sizing:border-box;width:29px;height:29px;overflow:hidden;transform:scale(.72)}
:is([data-module="maps"],.f-overlay) .mp-topo>span{position:absolute;box-sizing:border-box;border:1.6px solid currentColor;border-radius:46% 54% 36% 64% / 36% 62% 38% 64%;transform:rotate(-38deg)}
:is([data-module="maps"],.f-overlay) .mp-topo>span:nth-child(1){width:40px;height:53px;left:-11px;top:-8px}
:is([data-module="maps"],.f-overlay) .mp-topo>span:nth-child(2){width:30px;height:41px;left:-6px;top:0}
:is([data-module="maps"],.f-overlay) .mp-topo>span:nth-child(3){width:20px;height:29px;left:-1px;top:8px}
:is([data-module="maps"],.f-overlay) .mp-topo>span:nth-child(4){width:10px;height:16px;left:4px;top:16px}
:is([data-module="maps"],.f-overlay) .mp-mil{color:var(--sog-err)}
:is([data-module="maps"],.f-overlay) .mp-ic-cam svg{fill:currentColor}
:is([data-module="maps"],.f-overlay) .mp-mil:hover,:is([data-module="maps"],.f-overlay) .mp-choice.mp-mil[aria-pressed=true]{background:color-mix(in srgb,var(--sog-err) 12%,var(--sog-surface));color:var(--sog-err);box-shadow:inset 0 0 0 1.5px var(--sog-err),inset 0 2px 3px #0000002e}
[data-module="maps"] .mp-tip{position:absolute;z-index:4;max-width:min(92%,340px);padding:6px 8px;margin:0;font-size:.88em;line-height:1.35;pointer-events:none;box-shadow:0 2px 8px #0003}
[data-module="maps"] .mp-tip>div+div{margin-top:4px}
[data-module="maps"] .mp-tip.mp-hover{max-width:min(80%,320px);padding:3px 6px;font-size:11.5px;line-height:1.3;background:color-mix(in srgb,var(--sog-chart-bg) 65%,transparent);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);box-shadow:none}
[data-module="maps"] .mp-tip.mp-hover>div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
[data-module="maps"] .mp-tip.mp-hover>.mp-also{color:var(--sog-muted)}
/* les couches : un contenu de la feuille (grille de cases sur deux colonnes d'un téléphone, comme celle d'Atmosphère) */
[data-module="maps"] .mp-layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 16px;font-size:.92em}
[data-module="maps"] .mp-layers .mp-picks{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;padding-top:8px;border-top:1px solid var(--sog-border);min-width:0}
[data-module="maps"] .mp-layers .mp-picks select{min-height:var(--sog-touch);min-width:0;width:100%;flex:1 1 150px;text-overflow:ellipsis}
[data-module="maps"] .mp-layers .mp-picks select[hidden]{display:none}
[data-module="maps"] .mp-layer-set{display:contents}
[data-module="maps"] .mp-layers .mp-layer-set[hidden]{display:none}
[data-module="maps"] .mp-layers [data-layers-reset]{grid-column:1/-1;justify-self:start;margin-top:8px}
[data-module="maps"] .mp-layers label{display:flex;gap:8px;align-items:center;min-height:32px}
[data-module="maps"] .mp-layers .mp-l-main{grid-column:1/-1;border-top:1px solid var(--sog-border);margin-top:4px;padding-top:4px}
/* Complexité : libellé, valeur et curseur sur UNE ligne de 44 px (le bloc faisait 73 px, plus 51 de phrase d'aide) ; l'aide reste
   dans l'infobulle du libellé et pour le lecteur d'écran (.mp-l-help, hors page), sans réserver de hauteur */
[data-module="maps"] .mp-layers .mp-l-detail{grid-column:1/-1;flex-wrap:nowrap;min-height:44px;margin:0 0 4px;padding:0 0 4px;border-bottom:1px solid var(--sog-border);box-sizing:border-box}
[data-module="maps"] .mp-layers .mp-l-detail input{flex:1 1 auto;min-width:90px;margin:0}
[data-module="maps"] .mp-layers .mp-l-help{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
[data-module="maps"] .mp-tune h2{margin:0 0 4px;font-size:1.1em}
[data-module="maps"] .mp-tune-now{font-variant-numeric:tabular-nums;margin:4px 0}
[data-module="maps"] .mp-tune-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0 10px}
[data-module="maps"] .mp-tune-row{display:grid;grid-template-columns:minmax(9em,1fr) minmax(140px,1.4fr);gap:2px 10px;align-items:center;padding:4px 0;border-top:1px solid var(--sog-border)}
[data-module="maps"] .mp-tune-name{font-size:.92em;display:flex;align-items:center;gap:6px;cursor:pointer}
[data-module="maps"] .mp-tune-name input{width:auto;min-height:0;margin:0}
[data-module="maps"] .mp-tune-off .mp-tune-dual,[data-module="maps"] .mp-tune-off .mp-tune-range{opacity:.4}
[data-module="maps"] .mp-tune-range{grid-column:1 / -1;font-size:.82em;font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-tune-dual{position:relative;height:28px}
[data-module="maps"] .mp-tune-dual input{position:absolute;inset:0;width:100%;margin:0;padding:0;border:0;box-shadow:none;background:none;pointer-events:none;-webkit-appearance:none;appearance:none;height:28px;min-height:0}
[data-module="maps"] .mp-tune-dual input::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--sog-accent);border:2px solid var(--sog-surface);box-shadow:0 0 0 1px var(--sog-accent);cursor:pointer}
[data-module="maps"] .mp-tune-dual input::-moz-range-thumb{pointer-events:auto;width:16px;height:16px;border-radius:50%;background:var(--sog-accent);border:2px solid var(--sog-surface);cursor:pointer}
[data-module="maps"] .mp-tune-dual input:disabled::-webkit-slider-thumb{background:var(--sog-muted);box-shadow:none;cursor:default}
[data-module="maps"] .mp-tune-dual::before{content:'';position:absolute;left:0;right:0;top:13px;height:2px;background:var(--sog-border)}
[data-module="maps"] .mp-tune-mark{position:absolute;top:6px;width:2px;height:16px;margin-left:-1px;background:var(--sog-err)}
/* page de réglage (#maps?tune=1) : une page qui défile, mais DANS la racine fixe (la vue du cadre ne défile pas) : blocs en
   hauteur naturelle, la carte retrouve une hauteur d'écran, le panneau de seuils à côté sur grand écran */
[data-module="maps"].mp-tuning{overflow:auto}
[data-module="maps"].mp-tuning>*{flex:none}
[data-module="maps"].mp-tuning .mp-box{height:52vh;min-height:260px}
[data-module="maps"].mp-tuning[data-sheet] .mp-data{height:auto;transition:none}
[data-module="maps"].mp-tuning .mp-dprof{flex:none}
[data-module="maps"].mp-tuning .mp-prof{flex:none;height:240px}
[data-module="maps"].mp-tuning .mp-dbody{flex:none;height:260px}
/* la règle de la vue fixe du cadre (display: flex) est sans poids (:where, frame/INTEGRATION.md § 9.2) : pas de !important */
@media (min-width:1000px){[data-module="maps"].mp-tuning{display:grid;grid-template-columns:minmax(380px,440px) minmax(0,1fr);column-gap:16px;align-items:start;align-content:start}[data-module="maps"].mp-tuning>*{grid-column:2}[data-module="maps"].mp-tuning>.mp-tune{grid-column:1;grid-row:1 / span 40;position:sticky;top:8px;max-height:calc(100dvh - 90px);overflow:auto}}
.f-overlay button.f-ov-btn[data-mp]:disabled{opacity:.5;cursor:default}
.f-overlay button.f-ov-btn[data-mp=mode]{color:var(--sog-accent)}
.f-overlay button.f-ov-btn[data-mp=mode].mp-mil{color:var(--sog-err)}
.f-overlay button.f-ov-btn[data-mp=mode][aria-expanded=true]{box-shadow:0 0 0 1px var(--sog-accent),0 2px 8px #0000002e}
.f-overlay button.f-ov-btn[data-mp=layers][aria-expanded=true]{border-color:var(--sog-accent)}
/* l'état vide (pas de vol, mission sans carte, erreur) : une carte au milieu de la zone de la carte, entre les deux colonnes de boutons */
[data-module="maps"] .mp-empty{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;box-sizing:border-box;width:min(320px,calc(100% - 120px));margin:0;padding:10px 12px;text-align:center}
[data-module="maps"] .mp-empty[hidden]{display:none}
[data-module="maps"] .mp-empty p{margin:0 0 4px}
[data-module="maps"] .mp-empty p:last-child{margin:0}
[data-module="maps"] .mp-empty p:has(button){display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px}
[data-module="maps"] .mp-notes p:has(button){display:flex;flex-wrap:wrap;align-items:center;gap:6px}
[data-module="maps"] .mp-notes b{font-weight:700}
[data-module="maps"] .mp-notes .mp-stale{color:var(--sog-muted)}
[data-module="maps"] .mp-pcard{pointer-events:auto;display:flex;flex-direction:column;gap:4px;min-width:140px}
[data-module="maps"] .mp-pcard[hidden]{display:none}
[data-module="maps"] .mp-vfr-focus{font-weight:700;background:color-mix(in srgb,var(--sog-accent) 12%,transparent)}
[data-module="maps"] .mp-pcard .f-btn{align-self:flex-start;margin-top:4px}
[data-module="maps"] .mp-vfr-warn{margin:0;font-size:.9em;color:#00695c;font-style:italic}
[data-module="maps"] .mp-vfr-seq{margin:2px 0 4px;padding-left:1.2em}
[data-module="maps"] .mp-vfr-pts{margin:2px 0 6px;padding:0;list-style:none;column-width:19em;column-gap:16px}
[data-module="maps"] .mp-vfr-pts li{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;break-inside:avoid}
[data-module="maps"] .mp-vfr-dot{display:inline-block;width:.6em;height:.6em;border-radius:50%;flex:none}
[data-module="maps"] .mp-vfr-note summary{cursor:pointer}
[data-module="maps"] .mp-vfr-note>div{white-space:pre-wrap;font-size:.85em;max-height:14em;overflow:auto;border-left:2px solid var(--sog-border);padding-left:6px}
/* la feuille de données : la primitive du cadre (frame/design/primitives.css : .f-sheet, .f-sheet-panel, .f-sheet-head, .f-sheet-grip,
   hauteurs --f-sheet-*, glisser, positions) ; ici seulement ce qu'elle contient : en-tête de 44 px (la poignée : titre de ce qu'elle
   montre ; la bascule Profil · Météo ; le ✕ d'un contenu à droite), puis le profil vertical (sa bande dessous) ou le contenu ouvert
   à sa place, puis les notes ; le contenu défile dedans */
[data-module="maps"] .mp-dprof{flex:1 1 0;min-height:0;display:flex;flex-direction:column;padding:0 4px}
[data-module="maps"] .mp-notes{flex:none;max-height:5.5em;overflow:auto;padding:0 8px 6px;font-size:var(--sog-size-xs);font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-notes p{margin:0 0 2px}
[data-module="maps"] .mp-notes:empty{display:none}
/* Les puces Profil · Météo · « i » (§ 7.1.13, 4e affinement) : toujours trois, DANS la ligne d'en-tête, à droite (plus de colonne à droite du
   dessin, qui prend toute la largeur et toute la hauteur sous la ligne). Poignée nue (position par défaut) : puces de 28 px (la hauteur et
   la zone de toucher de 44 px sont celles de la primitive du cadre, frame/INTEGRATION.md § 11) ; ligne de titre (agrandie, réduite, colonne
   paysage) : puces de 40 px. Une puce sans contenu est désactivée (atténuée), jamais retirée. Les puces sont posées au-dessus du corps
   (z-index) : la zone de toucher de la primitive mord de 8 px sur lui, que le dessin positionné recouvrirait sinon. */
[data-module="maps"] .mp-chips{position:relative;z-index:2;flex:none;display:flex;flex-direction:row;align-items:center;gap:4px;padding-right:4px}
[data-module="maps"] .mp-chips[hidden],[data-module="maps"] .mp-chips .mp-chip[hidden]{display:none}
[data-module="maps"] .mp-chips .mp-chip{box-sizing:border-box;display:grid;place-items:center;width:40px;height:40px;min-height:0;margin:0;padding:0;border:1px solid var(--sog-border);border-radius:min(50%,calc(var(--sog-radius) * 22));background:none;color:var(--sog-muted);box-shadow:none;cursor:pointer;touch-action:manipulation}
[data-module="maps"] .mp-dhead.f-sheet-head-bare .mp-chips .mp-chip{width:28px}
[data-module="maps"] .mp-chips .mp-chip .f-icon{width:20px;height:20px}
[data-module="maps"] .mp-dhead.f-sheet-head-bare .mp-chips .mp-chip .f-icon{width:18px;height:18px}
[data-module="maps"] .mp-chips .mp-chip:disabled{opacity:.38;cursor:default}
/* « vol entier » : un texte-bouton (pas une puce de plus, règle 13), présent seulement tant que le profil est zoomé ; 44 px de haut dans
   la ligne titrée, 28 px dans la ligne nue avec la zone de toucher de 44 px de la primitive */
[data-module="maps"] .mp-dhead .mp-chips .mp-whole{box-sizing:border-box;min-height:0;height:44px;min-width:44px;margin:0;padding:0 10px;border:0;border-radius:var(--sog-radius);background:none;color:var(--sog-accent);font-family:inherit;font-size:var(--sog-size-xs);font-weight:600;line-height:1;white-space:nowrap;cursor:pointer;touch-action:manipulation}
[data-module="maps"] .mp-dhead.f-sheet-head-bare .mp-chips .mp-whole{height:28px}
[data-module="maps"] .mp-chips .mp-whole[hidden]{display:none}
/* légende : un panneau translucide sur le dessin (sous la ligne d'en-tête et ses puces), fermé par la puce, un toucher ou Échap */
[data-module="maps"] .mp-legend{position:absolute;z-index:1;left:4px;right:4px;bottom:0;top:calc(var(--f-sheet-head) - 1px);box-sizing:border-box;overflow:auto;padding:8px 10px;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:color-mix(in srgb,var(--sog-surface) 86%,transparent);font-size:var(--sog-size-xs);line-height:1.3;touch-action:pan-y}
[data-module="maps"] .mp-legend[hidden]{display:none}
[data-module="maps"] .mp-dhead.f-sheet-head-bare~.mp-legend{top:var(--f-sheet-head-bare)}
[data-module="maps"] .mp-legend ul{margin:0;padding:0;list-style:none}
[data-module="maps"] .mp-legend li{display:flex;align-items:center;gap:8px;min-height:20px}
[data-module="maps"] .mp-lg-sw{flex:none;position:relative;display:block;width:26px;height:12px;--c:#888}
[data-module="maps"] .mp-lg-sym{flex:none;width:26px;text-align:center;font-style:normal;color:var(--sog-muted)}
[data-module="maps"] .mp-lg-svg{width:28px;height:14px}
[data-module="maps"] .mp-lg-svg svg{display:block}
[data-module="maps"] .mp-lg-line::after{content:'';position:absolute;left:0;right:0;top:4px;height:3px;border-radius:2px;background:var(--c)}
[data-module="maps"] .mp-lg-dash::after{content:'';position:absolute;left:0;right:0;top:5px;border-top:2px dashed var(--c)}
[data-module="maps"] .mp-lg-vdash::after{content:'';position:absolute;left:12px;top:-2px;height:16px;border-left:1.5px dashed var(--c)}
[data-module="maps"] .mp-lg-diamond::after{content:'';position:absolute;left:8px;top:1px;width:9px;height:9px;transform:rotate(45deg);background:var(--c)}
[data-module="maps"] .mp-lg-relief{background:linear-gradient(var(--c),color-mix(in srgb,var(--c) 45%,#fff));border-top:1.5px solid #7a5a32}
[data-module="maps"] .mp-lg-band{background:color-mix(in srgb,var(--c) 16%,transparent);border:1.2px solid var(--c);box-sizing:border-box}
[data-module="maps"] .mp-lg-tick::after{content:'';position:absolute;left:12px;top:2px;height:8px;border-left:2px solid var(--c)}
[data-module="maps"] .mp-lg-cons::after{content:'';position:absolute;left:5px;right:5px;top:6px;border-top:2px solid var(--c)}
[data-module="maps"] .mp-lg-cons::before{content:'';position:absolute;left:10px;top:1px;border:3px solid transparent;border-bottom:4px solid var(--c);border-top:0}
[data-module="maps"] .mp-ad-cov{margin:0 0 6px;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 6px}
/* le niveau en gras sans être un titre : les titres de la carte du terrain (b) restent ceux de ses blocs */
[data-module="maps"] .mp-ad-cov .mp-cov-lv{font-weight:700}
[data-module="maps"] .mp-cov-dot{display:inline-block;width:.7em;height:.7em;border-radius:50%;flex:none;background:var(--sog-muted)}
[data-module="maps"] .mp-lg-pin::after{content:'';position:absolute;left:8px;top:1px;width:10px;height:10px;border-radius:50%;background:var(--c)}
[data-module="maps"] .mp-ad-proc{margin:0 0 6px;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 6px}
@media (max-width:767px){[data-module="maps"] .mp-ad-choose{flex:1 1 100%;min-height:var(--sog-touch)}}
[data-module="maps"] .mp-lg-tri::after{content:'';position:absolute;left:8px;top:1px;border:5px solid transparent;border-bottom:9px solid var(--c);border-top:0}
[data-module="maps"] .mp-chips .mp-chip[aria-pressed=true]{color:var(--sog-accent);border-color:var(--sog-accent);background:color-mix(in srgb,var(--sog-accent) 16%,var(--sog-surface))}
[data-module="maps"] .mp-data[hidden],[data-module="maps"] .mp-dclose[hidden],[data-module="maps"] .mp-dprof[hidden],[data-module="maps"] .mp-dbody[hidden]{display:none}
/* la coupe est dessinée à la hauteur exacte du corps, sans bord ni remplissage (§ 7.1.13) : l'axe des distances est toujours visible ;
   le défilement n'est qu'un filet de sécurité si drawSection relevait un jour sa hauteur */
[data-module="maps"] .mp-dbody[data-kind=weather]{overflow-x:hidden;overflow-y:auto;margin:0 4px;padding:0;border:0}
/* position par défaut : le corps de la feuille ne montre que le dessin (profil ou coupe), à toute sa hauteur ; la ligne de texte
   et les notes n'apparaissent qu'agrandie, sous le dessin (spécification § 7.1.9). Repliée, le cadre cache déjà tout sauf la poignée.
   La page de réglage (mp-tuning) garde tout. Le profil est dessiné à la hauteur exacte de son bloc (pas de plancher, § 7.1.13). */
[data-module="maps"].f-sheet:not([data-sheet="expanded"],.mp-tuning) :is(.mp-strip,.mp-notes){display:none}
[data-module="maps"] .mp-dprof{overflow:hidden}
[data-module="maps"] .mp-dbody[data-kind=weather] svg{display:block;cursor:crosshair}
[data-module="maps"] .mp-dbody[data-kind=weather]{touch-action:none}
[data-module="maps"] .mp-wxmsg{margin:0;padding:6px 0}
[data-module="maps"] .mp-wxlink{display:flex;align-items:center;min-height:var(--sog-touch);color:var(--sog-fg);text-decoration:none}
[data-module="maps"] .mp-wxlink span{color:var(--sog-accent);text-decoration:underline}
[data-module="maps"] .mp-dbody{overscroll-behavior:contain;box-sizing:border-box;margin:0 8px 8px;padding:6px 8px;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:var(--sog-surface);font-size:.92em;line-height:1.35}
[data-module="maps"] .mp-dbody p{margin:2px 0}
[data-module="maps"] .mp-lv-body{display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px 12px}
[data-module="maps"] .mp-lv-also{margin:8px 0 0}
[data-module="maps"] .mp-lv-fam{margin:6px 0 0;font-size:12px}
[data-module="maps"] .mp-lv-also>p{margin:0;overflow-wrap:anywhere}
[data-module="maps"] .mp-lv{flex:none;position:sticky;top:0;font:600 9.5px Arial,sans-serif;fill:currentColor;color:var(--sog-fg)}
[data-module="maps"] .mp-lv-list{flex:1 1 calc(2.5em + 9ch);min-width:0;margin:0;padding:0;list-style:none;column-width:19em;column-gap:16px;font-size:.95em;line-height:1.25}
[data-module="maps"] .mp-lv-list li{display:flex;gap:6px;align-items:baseline;break-inside:avoid;margin-bottom:2px;min-width:0;white-space:nowrap}
/* le texte d'une ligne : le nom, puis les niveaux et la classe ; la base du nom (10ch) décide du retour à la ligne, le nom s'étend jusqu'à
   sa longueur (jamais au-delà) et ne se rogne que sur une ligne pleine, donc jamais sous 10ch ; les niveaux, repassés sous le nom, y sont alignés */
[data-module="maps"] .mp-lv-txt{flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;column-gap:10px;align-items:baseline;overflow:hidden}
[data-module="maps"] .mp-lv-name{flex:1 1 10ch;max-width:max-content;min-width:0;overflow:hidden;text-overflow:ellipsis}
[data-module="maps"] .mp-lv-lim{flex:none;position:relative;font-size:.92em}
[data-module="maps"] .mp-lv-n::after{content:" ·";font-weight:400}
/* le point qui sépare le nom des niveaux est posé dans l'écart avant eux : en début de seconde ligne il sort du texte (rogné) */
[data-module="maps"] .mp-lv-lim::before{content:"·";position:absolute;right:100%;width:10px;text-align:center}
[data-module="maps"] .mp-lv-n{font-weight:700;min-width:1.4em;text-align:right}
/* mode « choisir sur la carte » (choose.js) : le fond MapLibre éteint (les couches de la Carte le sont dans le dessin), puis dans la feuille la
   consigne, puis un groupe par famille du côté (piste, SID ou STAR, approche) : « Aucune » d'abord, sept lignes au plus (--mp-ch-row chacune), le reste replié sous « N autres » (la feuille est la seule
   surface qui défile, V3 § 10.30) ; la ligne
   porte la teinte de la procédure (--c), ⌛ en gris, ⚠ en orange, la ligne surlignée (data-hl) comme son tracé */
[data-module="maps"] .mp-choosing .mp-map{opacity:.45}
[data-module="maps"] .mp-dbody[data-kind=choose]{--mp-ch-row:38px}
[data-module="maps"] .mp-ch-hint{margin:0 0 4px}
[data-module="maps"].f-sheet:not([data-sheet="expanded"]) .mp-ch-hint{display:none}
[data-module="maps"] .mp-ch-list{border-top:1px solid var(--sog-border)}
[data-module="maps"] .mp-ch-grp{margin:0 0 10px}
[data-module="maps"] .mp-ch-head{margin:6px 0 2px;font-size:var(--sog-size-s);color:var(--sog-muted);text-transform:uppercase;letter-spacing:.04em}
[data-module="maps"] .mp-ch-row[aria-pressed=true]{background:color-mix(in srgb,var(--c,var(--sog-accent)) 20%,var(--sog-surface));box-shadow:inset 3px 0 0 var(--c,var(--sog-accent))}
[data-module="maps"] .mp-ch-wind{flex:none;font-weight:600;color:var(--sog-fg);font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-ch-wind[data-tail]{color:var(--sog-warn)}
[data-module="maps"] .mp-ch-fix{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:4px 0 0;color:var(--sog-warn)}
[data-module="maps"] .mp-ch-fix .f-btn{margin:0}
[data-module="maps"] .mp-ch-done{display:block;width:100%;min-height:var(--sog-touch);margin:4px 0 8px}
[data-module="maps"] .mp-ch-more{color:var(--sog-accent);font-weight:600}
[data-module="maps"] .mp-ch-row{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:var(--mp-ch-row);margin:0;padding:0 8px;border:0;border-bottom:1px solid var(--sog-border);border-radius:0;background:none;color:var(--c,var(--sog-fg));font:inherit;font-weight:700;text-align:left;cursor:pointer;touch-action:manipulation}
[data-module="maps"] .mp-ch-row[data-hl="1"]{background:color-mix(in srgb,var(--c,var(--sog-accent)) 14%,var(--sog-surface))}
[data-module="maps"] .mp-ch-none{color:var(--sog-fg)}
[data-module="maps"] .mp-ch-sw{flex:none;width:12px;height:12px;background:var(--c)}
[data-module="maps"] .mp-ch-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="maps"] .mp-ch-old{flex:none;color:var(--sog-muted)}
[data-module="maps"] .mp-ch-warn{flex:none;color:var(--sog-warn)}
[data-module="maps"] .mp-ch-empty{margin:6px 0 0}
[data-module="maps"] .mp-lvl{display:flex;align-items:center;gap:8px}
[data-module="maps"] .mp-lvl .f-btn{margin:0;min-width:var(--sog-touch);font-weight:700}
[data-module="maps"].mp-editing .mp-prof{cursor:ns-resize}
/* hors de la vue fixe du cadre, la hauteur de la racine est celle du cadre (frame/INTEGRATION.md § 9.2) : le volet de la vue double et,
   carte à gauche d'un volet, la colonne de la vue ; ici seulement le plancher du module */
.f-pane>[data-module="maps"],.f-view.f-split>[data-module="maps"]{min-height:420px}
`;
