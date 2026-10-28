// Les couches de l'écran Météo (SPEC.md § 2.1 et § 2.5, bouton « Couches » à gauche de la carte), chargées à leur première
// ouverture : un volet posé sur la carte sous son bouton, jamais un contenu de la feuille — la coupe reste visible pendant
// qu'on coche et suit chaque case (utilisateur, 29 octobre : « choisir les éléments météo masque le profil vertical »). En
// tête ce que montre la carte (heure, altitude, lignes) ; les couches de la carte météo (la légende de la bibliothèque, la
// même que celle de la Carte) et de la coupe côte à côte, chacune avec sa clé ; les deux zones de la carte (le modèle et la
// maille de la zone du vol, ceux du synoptique) quand la limite est tracée.

import {
  esc
} from './fmt.js';

/** Ce que porte le volet, sans l'état des cases : le volet n'est réécrit que si cela change. */
const written = new WeakMap();

/** Remplit (ou met à jour) le volet des couches : app = l'écran (S, F, layersBox, wm, dark, cloudRgb, mapNote, saveUi,
 *  syncWeather, schedule, drawData). Le volet n'est réécrit que si ses lignes changent (une note, une couche de plus), jamais
 *  à chaque case ni à chaque statut — une réécriture entre l'appui et le relâché perdait le toucher (« certaines coches
 *  doivent être cliquées deux fois ») ; l'état des cases est posé en place, et seulement s'il change. */
export function drawLayers(app) {
  const {
    S,
    F,
    wm
  } = app, {
    T
  } = F;
  const box = app.layersBox;
  if (!box.onchange) box.onchange = onBox(app);
  const mid = app.dark() ? '#383835' : '#f0efec',
    ramp = `linear-gradient(90deg,#0d366b,#6da7ec,${mid},#ec8a85,#9e2a2a)`,
    key = (style, ramped) => ramped ? `<span class="at-ramp" style="background:${style}"></span>` : `<span class="at-key" style="${style}"></span>`,
    row = (group, k, label, k2) => `<label><input type="checkbox" data-g="${group}" data-k="${k}"> ${k2 || ''} ${esc(T(label))}</label>`,
    cloud = `rgba(${app.cloudRgb()},.7)`,
    barbKey = '<span class="at-key" style="border:0;height:auto;text-align:center">⟋</span>',
    note = app.mapNote(),
    legend = wm.legend(),
    on = Object.fromEntries(legend.map(ly => [ly.key, !!ly.on]));
  const html = (note ? `<p class="at-mapnote">${esc(T('mapTitle'))} · ${esc(note)}</p>` : '') + `<div><b>${esc(T('mapTitle'))}</b>` +
    legend.map(ly => `<label><input type="checkbox" data-g="mapLayers" data-k="${ly.key}"> ${ly.swatch
      .barb ? barbKey : key(ly.swatch.css, ly.swatch.ramp)} ${esc(ly.label)}</label>`).join('') +
    // les deux côtés de la limite tracée : le modèle et la maille de la zone du vol, ceux du synoptique autour
    (wm.edge ? wm.info().zones.map(z => `<p class="at-zone">${key(z.key === 'flight' ? 'border:1px solid var(--sog-fg);height:8px' :
      'border:1px dashed var(--sog-muted);height:8px')} ${esc(z.label)}</p>`).join('') : '') +
    `</div><div><b>${esc(T('profileTitle'))}</b>` +
    row('xsLayers', 'cloud', 'lyCloud', key(`linear-gradient(90deg,transparent,${cloud})`, true)) +
    row('xsLayers', 'iso', 'lyIso', key('color:#1c5cab')) +
    row('xsLayers', 'inv', 'lyInv', key('repeating-linear-gradient(45deg,var(--at-inv) 0 1.5px,transparent 1.5px 5px)', true)) +
    row('xsLayers', 'ice', 'lyIce', key('repeating-linear-gradient(-45deg,var(--at-ice) 0 1.5px,transparent 1.5px 4px)', true)) +
    row('xsLayers', 'wind', 'lyWind', barbKey) +
    row('xsLayers', 'cu', 'lyCu', key('color:var(--sog-muted);border-top-style:dotted')) +
    row('xsLayers', 'temp', 'lyTemp', key(ramp, true)) +
    row('xsLayers', 'rh', 'lyRh', key('linear-gradient(90deg,transparent,rgba(42,120,214,.6))', true)) +
    row('xsLayers', 'da', 'lyDa', key(ramp, true)) +
    `</div><p>${esc(T('lgPaths'))}</p>`;
  if (written.get(box) !== html) {
    written.set(box, html);
    box.innerHTML = html;
  }
  for (const c of box.querySelectorAll('input[data-g]')) {
    const v = !!(c.dataset.g === 'mapLayers' ? on[c.dataset.k] : S[c.dataset.g]?.[c.dataset.k]);
    if (c.checked !== v) c.checked = v;
  }
}

/** Réponse aux cases : la carte redessinée, la coupe (visible sous le volet) redessinée aussitôt ; un seul fond à la fois
 *  dans la coupe (température, humidité, altitude-densité). */
function onBox(app) {
  const {
    S
  } = app;
  return ev => {
    const c = ev.target.closest('input[data-g]');
    if (!c) return;
    const g = S[c.dataset.g];
    g[c.dataset.k] = c.checked;
    if (c.dataset.g === 'xsLayers' && c.checked && ['temp', 'rh', 'da'].includes(c.dataset.k))
      for (const x of ['temp', 'rh', 'da'])
        if (x !== c.dataset.k) g[x] = false;
    app.saveUi();
    if (c.dataset.g === 'mapLayers') {
      app.syncWeather();
      app.schedule();
    } else if (S.view === 'profile' || S.view === 'slice') app.drawData();
    drawLayers(app);
  };
}
