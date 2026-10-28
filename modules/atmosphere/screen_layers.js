// Les couches de l'écran Météo (SPEC.md § 2.5, bouton « Couches » à gauche de la carte), chargées à leur première
// ouverture : en tête ce que montre la carte (heure, altitude, lignes) ; les couches de la carte météo (la légende de la
// bibliothèque, la même que celle de la Carte) et de la coupe côte à côte, chacune avec sa clé ; les deux zones de la carte
// (le modèle et la maille de la zone du vol, ceux du synoptique) quand la limite est tracée.

import {
  esc
} from './fmt.js';

/** Dessine (ou redessine) les couches dans le corps de la feuille : app = l'écran (S, F, dbody, wm, dark, cloudRgb,
 *  mapNote, saveUi, syncWeather, schedule, drawData). La boîte est gardée d'un dessin à l'autre (les cases gardent le focus). */
export function drawLayers(app) {
  const {
    S,
    F,
    dbody,
    wm
  } = app, {
    T
  } = F;
  const box = app.layersBox ||= makeBox(app);
  const mid = app.dark() ? '#383835' : '#f0efec',
    ramp = `linear-gradient(90deg,#0d366b,#6da7ec,${mid},#ec8a85,#9e2a2a)`,
    key = (style, ramped) => ramped ? `<span class="at-ramp" style="background:${style}"></span>` : `<span class="at-key" style="${style}"></span>`,
    row = (group, k, label, k2) => `<label><input type="checkbox" data-g="${group}" data-k="${k}"${S[group][k] ? ' checked' : ''}> ${k2 || ''} ${esc(T(label))}</label>`,
    cloud = `rgba(${app.cloudRgb()},.7)`,
    barbKey = '<span class="at-key" style="border:0;height:auto;text-align:center">⟋</span>',
    note = app.mapNote();
  const html = (note ? `<p class="at-mapnote">${esc(T('mapTitle'))} · ${esc(note)}</p>` : '') + `<div><b>${esc(T('mapTitle'))}</b>` +
    wm.legend().map(ly => `<label><input type="checkbox" data-g="mapLayers" data-k="${ly.key}"${ly.on ? ' checked' : ''}> ${ly.swatch
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
  if (box.innerHTML !== html) box.innerHTML = html;
  if (box.parentNode !== dbody) dbody.replaceChildren(box);
}

/** La boîte des couches et sa réponse aux cases : la carte redessinée, ou la coupe à son retour ; un seul fond à la fois
 *  dans la coupe (température, humidité, altitude-densité). */
function makeBox(app) {
  const {
    S,
    F
  } = app;
  const box = document.createElement('div');
  box.className = 'at-layers at-pad';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', F.T('layers'));
  box.onchange = ev => {
    const c = ev.target.closest('input[data-g]');
    if (!c) return;
    const g = S[c.dataset.g];
    g[c.dataset.k] = c.checked;
    if (c.dataset.g === 'xsLayers' && c.checked && ['temp', 'rh', 'da'].includes(c.dataset.k))
      for (const x of ['temp', 'rh', 'da'])
        if (x !== c.dataset.k) g[x] = false;
    drawLayers(app);
    app.saveUi();
    if (c.dataset.g === 'mapLayers') {
      app.syncWeather();
      app.schedule();
    }
  };
  return box;
}
