// « Vol et réglages » de l'écran Météo (SPEC.md § 2.5, bouton « avion » sur la carte), chargé à sa première ouverture : la
// source du vol (le vol courant, l'exemple, un fichier, un texte de route), le départ (UTC), le niveau demandé, la vitesse
// de croisière, les données (prévision ou démonstration hors ligne), la grille de la carte, « Charger », et la ligne
// d'état. Les valeurs vivent dans l'état de l'écran (S.opts) ; le formulaire les montre et les y écrit.

import {
  esc,
  fmtLvl
} from './fmt.js';

const pad = v => String(v).padStart(2, '0');
/** Instant (s) → valeur d'un champ datetime-local en UTC. */
const depField = sec => {
  const d = new Date(sec * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** Dessine le formulaire dans le corps de la feuille (construit une fois et gardé : le fichier choisi reste) ; app = l'écran
 *  (S, F, dbody, tri, depValue, statusText, saveUi, recompute, show, load). */
export function drawFlight(app) {
  const {
    S,
    dbody
  } = app;
  const form = app.flightForm ||= makeForm(app),
    $f = k => form.querySelector(`[data-at="${k}"]`),
    o = S.opts,
    put = (k, v) => {
      if ($f(k).value !== String(v)) $f(k).value = String(v);
    };
  put('flightSrc', o.src);
  put('routeText', o.text);
  put('dep', depField(app.depValue()));
  levelOptions(form, S.levelFt || o.level);
  put('cruiseKt', S.cruiseKt || o.cruise || '');
  put('dataSrc', o.data);
  put('gridMax', o.grid);
  showSrc(form, o.src);
  refreshFlight(app);
  if (form.parentNode !== dbody) dbody.replaceChildren(form);
}
/** La ligne d'état du formulaire, à jour (écrite seulement si elle change). */
export function refreshFlight(app) {
  const st = app.flightForm?.querySelector('[data-at="status"]'),
    s = app.statusText(),
    go = app.flightForm?.querySelector('button[type="submit"]'),
    l = app.loadText();
  if (st && st.textContent !== s) st.textContent = s;
  // « Charger » avec son coût estimé (écrit seulement s'il change)
  if (go && go.textContent !== l) go.textContent = l;
}

/** Les niveaux offerts : le niveau du vol, puis de 3 000 ft à FL410 (par 500 ft sous 10 000 ft). */
function levelOptions(form, cur) {
  const sel = form.querySelector('[data-at="levelSel"]'),
    vals = new Set([cur]);
  for (let ft = 3000; ft <= 41000; ft += ft < 10000 ? 500 : 1000) vals.add(ft);
  const list = [...vals].filter(Boolean).sort((a, b) => a - b),
    sig = list.join(',');
  if (sel.dataset.sig !== sig) {
    sel.dataset.sig = sig;
    sel.replaceChildren(...list.map(ft => new Option(fmtLvl(ft), ft)));
  }
  if (sel.value !== String(cur)) sel.value = String(cur);
}
/** Le fichier ou le texte de route, selon la source choisie. */
function showSrc(form, v) {
  form.querySelector('[data-at="fileBox"]').classList.toggle('at-hidden', v !== 'file');
  form.querySelector('[data-at="textBox"]').classList.toggle('at-hidden', v !== 'text');
}

/** Le formulaire et ses réponses : la source, le texte et la grille gardés sur l'appareil ; le départ, le niveau et la
 *  vitesse recalculent sans relire la prévision ; « Charger » lit ce qui manque. */
function makeForm(app) {
  const {
    S,
    F
  } = app, {
    T
  } = F;
  const form = document.createElement('form');
  form.className = 'f-grid at-form at-pad';
  form.style.setProperty('--f-min', '160px');
  form.innerHTML = `<label class="f-field">${esc(T('flight'))}<select data-at="flightSrc">
      <option value="current">${esc(T('srcCurrent', { tri: app.tri }))}</option>
      <option value="example">${esc(T('srcExample'))}</option>
      <option value="file">${esc(T('srcFile'))}</option>
      <option value="text">${esc(T('srcText'))}</option></select></label>
    <label class="f-field at-hidden" data-at="fileBox">${esc(T('file'))}<input type="file" data-at="file" accept=".json,application/json"></label>
    <label class="f-field f-full at-hidden" data-at="textBox">${esc(T('routeHint'))}<textarea data-at="routeText" spellcheck="false" rows="3"></textarea></label>
    <label class="f-field">${esc(T('depUtc'))}<input type="datetime-local" data-at="dep"></label>
    <label class="f-field">${esc(T('levelReq'))}<select data-at="levelSel"></select></label>
    <label class="f-field">${esc(T('cruiseKt'))}<input type="number" data-at="cruiseKt" min="60" max="600" step="5"></label>
    <label class="f-field">${esc(T('dataSrc'))}<select data-at="dataSrc">
      <option value="live">${esc(T('dataLive'))}</option><option value="demo">${esc(T('dataDemo'))}</option></select></label>
    <label class="f-field">${esc(T('gridSize'))}<select data-at="gridMax">
      <option value="35">${esc(T('grid35'))}</option><option value="48">${esc(T('grid48'))}</option>
      <option value="96">${esc(T('grid96'))}</option></select></label>
    <button class="primary" type="submit">${esc(T('load'))}</button>
    <p class="at-foot f-full" data-at="status" role="status"></p>`;
  const $f = k => form.querySelector(`[data-at="${k}"]`),
    o = S.opts;
  $f('flightSrc').onchange = () => {
    o.src = $f('flightSrc').value;
    showSrc(form, o.src);
    app.saveUi();
  };
  $f('file').onchange = () => o.file = $f('file').files?.[0] || null;
  $f('routeText').onchange = () => {
    o.text = $f('routeText').value;
    app.saveUi();
  };
  $f('gridMax').onchange = () => {
    o.grid = +$f('gridMax').value || 48;
    app.saveUi();
  };
  $f('dataSrc').onchange = () => o.data = $f('dataSrc').value;
  $f('dep').onchange = () => {
    const v = $f('dep').value;
    o.dep = v ? Date.parse(`${v}:00Z`) / 1000 : null;
    app.recompute();
  };
  $f('levelSel').onchange = () => {
    o.level = +$f('levelSel').value;
    o.levelTouched = true;
    app.recompute();
  };
  $f('cruiseKt').onchange = () => {
    o.cruise = +$f('cruiseKt').value || null;
    app.recompute();
  };
  form.onsubmit = e => {
    e.preventDefault();
    app.show('profile');
    app.load();
  };
  return form;
}
