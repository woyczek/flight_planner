// Styles de l'écran Météo (SPEC.md § 2) : jetons du cadre (--sog-*), classes préfixées « at- » sous
// [data-module="atmosphere"] ; vue fixe sur le gabarit de la Carte (la carte sous tout le module, la feuille par-dessus),
// la puce d'altitude dans la couche des boutons du cadre (.f-overlay). Posés une fois par le montage, dans un <style>.

export const STYLE = `
[data-module="atmosphere"]{--at-computed:var(--sog-chart-1);--at-planned:var(--sog-chart-4);--at-requested:var(--sog-chart-3);--at-inv:var(--sog-chart-2);--at-ice:var(--sog-chart-5);--at-terrain:color-mix(in srgb,var(--sog-chart-6) 55%,var(--sog-chart-bg))}
[data-module="atmosphere"] .at-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
[data-module="atmosphere"] .at-box{position:relative;flex:1 1 0;min-height:0;overflow:hidden;background:var(--sog-chart-grid);isolation:isolate}
[data-module="atmosphere"]~.f-overlay .at-lvl{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:44px;height:44px;box-sizing:border-box;padding:0 12px 0 14px;border:1px solid var(--sog-border);border-radius:min(22px,calc(var(--sog-radius) * 22));background:color-mix(in srgb,var(--sog-surface) 92%,transparent);color:var(--sog-fg);box-shadow:0 2px 8px #0000002e;font-weight:600;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:auto;touch-action:manipulation;cursor:pointer}
[data-module="atmosphere"]~.f-overlay .at-lvl[hidden]{display:none}
[data-module="atmosphere"]~.f-overlay .at-lvl>span[aria-hidden]{font-size:10px;color:var(--sog-muted)}
[data-module="atmosphere"]~.f-overlay .at-lvl select{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;cursor:pointer;margin:0}
[data-module="atmosphere"]~.f-overlay .at-lvl:focus-within{outline:2px solid var(--sog-accent);outline-offset:2px}
[data-module="atmosphere"]~.f-overlay button.f-ov-btn.at-load{color:var(--sog-accent)}
[data-module="atmosphere"] .f-sheet-grip .f-badge{flex:none;margin-right:6px}
/* la carte et sa surcouche ont la taille du module entier, sous la feuille : un mouvement de la feuille découvre de la carte déjà
   dessinée, sans redimensionner MapLibre (plus de clignotement ni de zone grise au glisser) ; --at-hide-b / -r : la part cachée
   par la feuille (en bas en portrait, à droite en paysage), où les contrôles de MapLibre ne vont pas */
[data-module="atmosphere"] .at-map{position:absolute;left:0;top:0;width:var(--at-full-w,100%);height:var(--at-full-h,100%);touch-action:none}
[data-module="atmosphere"] .at-map .maplibregl-ctrl-bottom-right{right:var(--at-hide-r,0px)}
[data-module="atmosphere"] :is(button,select,input,label){touch-action:manipulation}
[data-module="atmosphere"] canvas.at-over{position:absolute;left:0;top:0;width:var(--at-full-w,100%);height:var(--at-full-h,100%);z-index:2;pointer-events:none}
[data-module="atmosphere"] .at-box.at-flat canvas.at-over{pointer-events:auto}
/* volet des couches posé sur la carte, sous son bouton (jamais sur la feuille : la coupe reste visible pendant qu'on coche) */
[data-module="atmosphere"] .at-layerpop{position:absolute;z-index:5;width:min(440px,calc(100% - 64px));max-height:calc(100% - 12px - var(--at-pop-top,0px));overflow:auto;box-sizing:border-box;padding:6px 10px 8px;background:var(--sog-surface);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);box-shadow:var(--sog-shadow);overscroll-behavior:contain}
[data-module="atmosphere"] .at-layerpop[hidden]{display:none}
[data-module="atmosphere"] .at-layerpop-head{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-6px;margin:-6px -10px 2px;padding:4px 4px 4px 10px;background:var(--sog-surface);border-bottom:1px solid var(--sog-border)}
[data-module="atmosphere"] .at-layerpop-x{flex:none;width:36px;height:36px;border:0;border-radius:var(--sog-radius-s,6px);background:none;color:var(--sog-muted);font-size:16px;cursor:pointer}
[data-module="atmosphere"] .at-layerpop-x:hover{color:var(--sog-fg);background:var(--sog-chart-grid)}
[data-module="atmosphere"] .at-layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 16px;font-size:.92em}
[data-module="atmosphere"] .at-layers>div{display:flex;flex-direction:column;min-width:0}
[data-module="atmosphere"] .at-layers b{margin:2px 0}
[data-module="atmosphere"] .at-layers label{display:flex;gap:8px;align-items:center;min-height:36px}
[data-module="atmosphere"] .at-layers .at-key{width:22px;flex:none;display:inline-block;height:0;border-top:2px solid currentColor}
[data-module="atmosphere"] .at-layers .at-ramp{width:22px;height:9px;border-radius:2px;flex:none;display:inline-block}
[data-module="atmosphere"] .at-layers>p{grid-column:1/-1;margin:6px 0 0;font-size:.9em;color:var(--sog-muted)}
[data-module="atmosphere"] .at-layers>p.at-mapnote{margin:0 0 4px;color:var(--sog-fg)}
[data-module="atmosphere"] .at-layers p.at-zone{display:flex;gap:8px;align-items:center;margin:4px 0 0;font-size:.9em;color:var(--sog-muted)}
[data-module="atmosphere"] .at-layers p.at-zone .at-key{box-sizing:border-box}
[data-module="atmosphere"] .at-maptip{position:absolute;z-index:6;pointer-events:none;background:var(--sog-chart-bg);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:5px 7px;font-size:12px;line-height:1.35;box-shadow:var(--sog-shadow);white-space:nowrap;display:none;font-variant-numeric:tabular-nums}
[data-module="atmosphere"] .f-sheet-panel{container-type:inline-size}
[data-module="atmosphere"] .f-sheet-head>button:not(.f-sheet-grip):not(.f-sheet-close){flex:none;min-height:0;height:100%;min-width:var(--sog-touch,44px);padding:0 8px;border:0;border-radius:0;background:none}
[data-module="atmosphere"] .f-sheet-body.at-dbody{position:relative}
/* puces du dessin, ◀ ▶ des tranches et « i » (§ 7.1.13, 4e affinement, et 14) : toujours dans la ligne de la poignée, à droite,
   avant ✕ ; nue, la primitive du cadre leur donne 28 px et une zone de toucher de 44 ; leur nombre ne change pas (une puce sans
   objet est désactivée, pas retirée) */
[data-module="atmosphere"] .at-chips{flex:none;display:flex;align-items:center;gap:4px;height:100%}
[data-module="atmosphere"] .at-chips[hidden]{display:none}
[data-module="atmosphere"] .f-sheet-head:not(.f-sheet-head-bare)>.at-chips{gap:0}
[data-module="atmosphere"] .f-sheet-head:not(.f-sheet-head-bare)>.at-chips>button{width:var(--sog-touch,44px);height:100%;min-height:0;margin:0;padding:0;border:0;border-radius:0;background:none;color:inherit;box-shadow:none}
[data-module="atmosphere"] .at-chips>button:disabled{opacity:.35;cursor:default}
[data-module="atmosphere"] .f-sheet-head>.at-whole{flex:none;box-sizing:border-box;min-height:0;height:100%;min-width:44px;margin:0;padding:0 8px;border:0;border-radius:var(--sog-radius);background:none;color:var(--sog-accent);font:600 var(--sog-size-xs,12px)/1 inherit;font-family:inherit;white-space:nowrap;cursor:pointer;touch-action:manipulation}
[data-module="atmosphere"] .f-sheet-head>.at-whole[hidden]{display:none}
/* la coupe : deux doigts sont la fenêtre (pincement, glisser), un doigt le toucher ; pas de défilement de page sous le dessin */
[data-module="atmosphere"] .f-sheet-body.at-dbody.at-plot{touch-action:none}
[data-module="atmosphere"] .at-chip-i{font:italic 600 16px/1 Georgia,serif}
[data-module="atmosphere"] .at-chips>button[aria-pressed=true]{color:var(--sog-accent)}
/* légende du dessin (règle 14) : panneau translucide sur le dessin, en haut à gauche */
[data-module="atmosphere"] .at-legend{position:absolute;z-index:3;left:4px;top:4px;max-width:calc(100% - 8px);max-height:calc(100% - 8px);overflow:auto;box-sizing:border-box;display:grid;gap:3px;padding:6px 8px;font-size:12px;line-height:1.3;background:color-mix(in srgb,var(--sog-surface) 90%,transparent);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);box-shadow:var(--sog-shadow);cursor:pointer}
[data-module="atmosphere"] .at-legend>div{display:flex;gap:8px;align-items:center}
[data-module="atmosphere"] .at-legend svg{flex:none}
[data-module="atmosphere"] .at-when{flex:none;display:flex;align-items:center;gap:10px;height:30px;padding:0 12px;font-size:12px}
[data-module="atmosphere"] .at-when input{flex:1 1 auto;min-width:0;margin:0;accent-color:var(--sog-accent);touch-action:manipulation}
/* la ligne d'heure a une largeur fixe : un texte plus long (le jour ajouté, l'alerte) ne raccourcit jamais le curseur, dont le
   bouton glisserait sous le doigt et changerait l'heure en boucle */
[data-module="atmosphere"] .at-when .at-track{position:relative;flex:1 1 auto;min-width:0;display:flex;align-items:center;height:100%}
[data-module="atmosphere"] .at-when output{flex:none;box-sizing:border-box;width:17em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;color:var(--sog-muted)}
@container (max-width:560px){[data-module="atmosphere"] .at-when output{width:13em}}
/* heures du curseur couvertes par la prévision lue (montrée seulement quand une partie ne l'est pas) */
[data-module="atmosphere"] .at-cover{position:absolute;bottom:7px;height:3px;border-radius:2px;background:var(--sog-accent);opacity:.45;pointer-events:none;left:calc(8px + (100% - 16px) * var(--a,0));width:calc((100% - 16px) * (var(--b,1) - var(--a,0)))}
[data-module="atmosphere"] .at-cover[hidden]{display:none}
[data-module="atmosphere"] .at-when output.at-out{color:var(--sog-warn,#b26a00)}
[data-module="atmosphere"] .f-sheet-body.at-dbody.at-plot{overflow-x:hidden;overflow-y:auto}
[data-module="atmosphere"] .at-tip{position:absolute;pointer-events:none;background:var(--sog-chart-bg);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:6px 8px;font-size:12px;line-height:1.4;box-shadow:var(--sog-shadow);white-space:nowrap;z-index:5;display:none;font-variant-numeric:tabular-nums}
[data-module="atmosphere"] .at-tip .m,[data-module="atmosphere"] .at-maptip .m{color:var(--sog-muted)}
[data-module="atmosphere"] .at-sd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:8px;height:100%}
[data-module="atmosphere"] .at-sd .at-plotbox{position:relative;min-width:0;min-height:0}
[data-module="atmosphere"] .at-slice-info{font-size:12.5px;display:grid;gap:2px;align-content:start;overflow:auto;padding:4px 8px 8px 0}
[data-module="atmosphere"] .at-slice-info .m{color:var(--sog-muted)}
@container (max-width:560px){[data-module="atmosphere"] .at-sd{grid-template-columns:1fr}[data-module="atmosphere"] .at-slice-info{display:none}}
[data-module="atmosphere"] .at-pad{padding:8px}
[data-module="atmosphere"] .at-go{display:flex;flex-wrap:wrap;gap:8px;padding-top:0}
[data-module="atmosphere"] .at-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:0 20px;margin:0}
[data-module="atmosphere"] .at-kv>div{display:grid;grid-template-columns:8.5em auto minmax(0,1fr);align-items:baseline;gap:8px;padding:4px 0;border-bottom:1px solid var(--sog-border);font-size:13px}
[data-module="atmosphere"] .at-kv dt{color:var(--sog-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="atmosphere"] .at-kv dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
[data-module="atmosphere"] .at-kv dd+dd{font-weight:400;color:var(--sog-muted);font-size:12px;overflow:hidden;text-overflow:ellipsis}
[data-module="atmosphere"] .at-pad h3{margin:14px 0 6px}
[data-module="atmosphere"] .f-table tr.wp td{font-weight:600}
[data-module="atmosphere"] .f-table tr.sel td{background:color-mix(in srgb,var(--sog-accent) 14%,transparent)}
[data-module="atmosphere"] .f-table tbody tr{cursor:pointer}
[data-module="atmosphere"] .at-flag{display:inline-block;font-size:11px;padding:0 6px;border-radius:4px;border:1px solid var(--sog-border)}
[data-module="atmosphere"] .at-flag.ice2{border-color:var(--at-ice);color:var(--at-ice)}
[data-module="atmosphere"] .at-flag.ice1{border-color:var(--sog-warn)}
[data-module="atmosphere"] .at-flag.inv{border-color:var(--at-inv);color:var(--at-inv)}
[data-module="atmosphere"] .at-wx{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:8px}
[data-module="atmosphere"] .at-st{border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:8px 10px}
[data-module="atmosphere"] .at-st .id{font-weight:600}
[data-module="atmosphere"] .at-cat{font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;color:#fff}
[data-module="atmosphere"] .at-cat.VFR{background:#0ca30c}
[data-module="atmosphere"] .at-cat.MVFR{background:#2a78d6}
[data-module="atmosphere"] .at-cat.IFR{background:#d03b3b}
[data-module="atmosphere"] .at-cat.LIFR{background:#a0329a}
[data-module="atmosphere"] .at-raw{font:12px/1.4 ui-monospace,monospace;color:var(--sog-muted);white-space:pre-wrap;margin-top:4px}
[data-module="atmosphere"] .at-form textarea{font:13px/1.4 ui-monospace,monospace;min-height:80px}
[data-module="atmosphere"] .at-foot{font-size:12px;color:var(--sog-muted);margin:10px 0 0}
[data-module="atmosphere"] .at-hidden{display:none!important}
`;
