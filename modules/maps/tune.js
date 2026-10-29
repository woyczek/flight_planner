// V3 maps — la page de réglage des seuils (modules/maps/SPEC.md § 14), #maps?tune=1, chargée à la demande (meta.lazy) : une
// ligne par élément dessiné, un double curseur « visible de … à … » en zoom MapLibre (et en NM par cm d'écran), par mode
// (onglets) ; la carte suit en direct (S.tuneZoom) ; « Tout remettre » revient aux valeurs de départ du mode ; enregistrés
// pour la compagnie (airline/map_profiles.json, profiles[mode].elements.zoom et layers) ou gardés sur cet appareil
// (cache/maps/ui.json, layers[mode].zoom). Lecture seule sur un téléphone.

import {
  S,
  esc,
  tt
} from './state.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  saveUi
} from './data.js';
import {
  MODES,
  modeTitle,
  ZOOM_KEYS,
  LAYER_OF,
  zoomDefaults,
  layerDefaults,
  builtinProfile,
  baseLayers,
  layersNow,
  repoZoom,
  effectiveProfile,
  setLayer,
  setPreset
} from './layers.js';

/** Niveau d'usage Complet du cadre (3), celui de la carte Administration : seul il enregistre pour la compagnie. */
const LEVEL_FULL = 3;
const Z_MAX = 18;
/** NM par cm d'écran au zoom z, à la latitude lat (tuiles de 512 px, 96 px par pouce). */
const nmPerCm = (z, lat) => 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * 2 ** z) * 96 / 2.54 / 1852;
const fmtNm = v => v >= 10 ? String(Math.round(v)) : v.toFixed(1);
/** Seuils du mode courant tels qu'ils s'appliquent. */
const zoomNow = () => S.profile?.elements?.zoom || zoomDefaults(S.preset);
/** Page de réglage : construite une fois, remplie par mode. */
export function tuneSetup(box) {
  S.tuneEl = box;
  S.tuneZoom = {};
  S.tuneRO = matchMedia('(max-width: 599px)').matches;
  box.addEventListener('input', e => {
    const r = e.target.closest('input[data-z]');
    if (!r || S.tuneRO) return;
    const k = r.dataset.z,
      row = r.closest('[data-row]'),
      [lo, hi] = [...row.querySelectorAll('input[data-z]')].map(x => +x.value),
      cur = [Math.min(lo, hi), Math.max(lo, hi) >= Z_MAX ? 24 : Math.max(lo, hi)];
    (S.tuneZoom[S.preset] ||= {})[k] = cur;
    S.profile = effectiveProfile();
    tuneRow(row, k, cur);
    schedule();
  });
  box.addEventListener('change', e => {
    const c = e.target.closest('input[data-vis]');
    if (c && !S.tuneRO) setLayer(c.dataset.vis, c.checked);
  });
  box.addEventListener('click', async e => {
    const tab = e.target.closest('[data-tune-mode]')?.dataset.tuneMode;
    if (tab && tab !== S.preset) {
      await setPreset(tab);
      return fillTune();
    }
    const act = e.target.closest('[data-tune]')?.dataset.tune;
    if (!act || S.tuneRO) return;
    if (act === 'resetVis') {
      // cases des lignes remises aux valeurs intégrées du mode (comme les curseurs), le reste des couches gardé
      const own = (S.layers ||= {})[S.preset] ||= {},
        B = layerDefaults(builtinProfile()),
        base = baseLayers();
      for (const k of new Set(Object.values(LAYER_OF)))
        if (B[k] === base[k]) delete own[k];
        else own[k] = B[k];
      return setLayer(null, null, true);
    }
    if (act === 'reset') {
      S.tuneZoom[S.preset] = zoomDefaults(S.preset);
      S.profile = effectiveProfile();
      fillTune();
      return schedule();
    }
    const z = structuredClone(zoomNow()),
      name = tt(TX.presets[S.preset]);
    if (act === 'dev') {
      ((S.layers ||= {})[S.preset] ||= {}).zoom = z;
      saveUi();
      return S.ctx.notify?.(tt(TX.tuneSavedDev, {
        m: name
      }), 'info');
    }
    // les seuils de la compagnie valent pour tous les pilotes : réservés au niveau Complet (celui de la carte Administration qui
    // mène à cette page), refusés ici et non seulement masqués (SPEC § 14, § 19) ; « Garder sur cet appareil » reste ouvert
    if (!(S.ctx.level >= LEVEL_FULL)) return S.ctx.notify?.(tt(TX.tuneCoLevel), 'warn');
    const path = 'airline/map_profiles.json',
      cur = (await S.ctx.data.get(path).catch(() => null)) || {},
      profiles = {
        ...(cur.profiles || {})
      };
    const L = layersNow();
    profiles[S.preset] = {
      ...(profiles[S.preset] || {}),
      layers: Object.fromEntries([...new Set(Object.values(LAYER_OF))].map(k => [k, !!L[k]])),
      elements: {
        ...(profiles[S.preset]?.elements || {}),
        zoom: z
      }
    };
    await S.ctx.data.put(path, {
      schema: 1,
      ...cur,
      profiles,
      by: 'maps',
      updated_at: new Date().toISOString()
    });
    S.ctx.notify?.(tt(TX.tuneSavedCo, {
      m: name
    }), 'info');
  });
  fillTune();
}
/** Libellé d'un seuil : « z 6,5 (12 NM/cm) », ou « sans limite ». */
const zLabel = (z, lat) => z >= Z_MAX ? tt(TX.tuneNoLimit) : `z ${(+z).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')} (${fmtNm(nmPerCm(z, lat))} NM/cm)`;
/** Ligne d'un élément mise à jour (valeurs, libellé) ; écritures seulement si elles changent. */
function tuneRow(row, k, [lo, hi]) {
  const [a, b] = row.querySelectorAll('input[data-z]'),
    lat = S.tuneLat ?? 46,
    va = String(lo),
    vb = String(Math.min(Z_MAX, hi));
  if (a.value !== va) a.value = va;
  if (b.value !== vb) b.value = vb;
  const t = hi >= Z_MAX ? tt(TX.tuneFrom, {
      a: zLabel(lo, lat)
    }) : tt(TX.tuneRange, {
      a: zLabel(lo, lat),
      b: zLabel(hi, lat)
    }),
    out = row.querySelector('[data-range]');
  if (out.textContent !== t) out.textContent = t;
}
/** Page de réglage remplie pour le mode courant. */
export function fillTune() {
  const box = S.tuneEl,
    z = zoomNow(),
    ro = S.tuneRO ? ' disabled' : '';
  box.innerHTML = `<h2>${esc(tt(TX.tuneTitle))}</h2><p class="f-muted">${esc(tt(TX.tuneHint))}</p>${S.tuneRO ? `<p class="f-muted"><b>${esc(tt(TX.tuneRO))}</b></p>` : ''}
<p class="mp-tune-now" data-now></p>
<p class="f-muted" data-src></p>
<div class="mp-tune-tabs" role="group">${MODES.map(([k, icon, cls]) => `<button type="button" class="mp-choice${cls}" data-tune-mode="${k}" aria-pressed="${k === S.preset}" title="${esc(modeTitle(S.ctx, k))}" aria-label="${esc(modeTitle(S.ctx, k))}">${icon}</button>`).join('')}</div>
<div class="mp-tune-rows">${ZOOM_KEYS.map(k => `<div class="mp-tune-row" data-row="${k}">${LAYER_OF[k] ? `<label class="mp-tune-name" title="${esc(tt(TX.tuneVis, { e: tt(TX.zoomNames[k]), l: tt(TX.layerNames[LAYER_OF[k]]) }))}"><input type="checkbox" data-vis="${LAYER_OF[k]}"${ro}> ${esc(tt(TX.zoomNames[k]))}</label>` : `<span class="mp-tune-name">${esc(tt(TX.zoomNames[k]))}</span>`}<div class="mp-tune-dual"><span class="mp-tune-mark" aria-hidden="true"></span><input type="range" min="0" max="${Z_MAX}" step="0.25" data-z="${k}" aria-label="${esc(tt(TX.tuneMin, { e: tt(TX.zoomNames[k]) }))}"${ro}><input type="range" min="0" max="${Z_MAX}" step="0.25" data-z="${k}" aria-label="${esc(tt(TX.tuneMax, { e: tt(TX.zoomNames[k]) }))}"${ro}></div><div class="mp-tune-range f-muted" data-range></div></div>`).join('')}</div>
<div class="f-row"><button type="button" data-tune="resetVis"${ro}>${esc(tt(TX.tuneResetVis))}</button><button type="button" data-tune="reset"${ro}>${esc(tt(TX.tuneResetZoom))}</button><button type="button" data-tune="dev"${ro}>${esc(tt(TX.tuneSaveDev))}</button><button type="button" class="primary" data-tune="co"${ro}>${esc(tt(TX.tuneSaveCo))}</button></div>`;
  for (const k of ZOOM_KEYS) tuneRow(box.querySelector(`[data-row="${k}"]`), k, z[k] || [0, 24]);
  tuneVis();
  tuneSrc();
  S.tuneMarked = null;
  schedule();
}
/** Ligne « d'où viennent les seuils » du mode montré ; écrite seulement si elle change. */
export function tuneSrc() {
  const r = repoZoom(S.preset),
    m = tt(TX.presets[S.preset]),
    t = !r ? tt(TX.tuneSrc.none, {
      m
    }) : r.from === S.preset ? tt(TX.tuneSrc.own, {
      m
    }) : tt(TX.tuneSrc.from, {
      m,
      f: tt(TX.presets[r.from])
    }),
    out = S.tuneEl.querySelector('[data-src]');
  if (out && out.textContent !== t) out.textContent = t;
}
/** Cases « visible » de la page de réglage selon les couches du mode (lignes décochées grisées) ; écrit seulement ce qui
 *  change. */
export function tuneVis() {
  const L = layersNow();
  for (const c of S.tuneEl.querySelectorAll('input[data-vis]')) {
    const v = !!L[c.dataset.vis],
      row = c.closest('[data-row]');
    if (c.checked !== v) c.checked = v;
    if (row.classList.contains('mp-tune-off') === v) row.classList.toggle('mp-tune-off', !v);
  }
}
/** Zoom courant marqué sur chaque curseur, et rappelé en tête (NM par cm) ; écrit seulement s'il change. */
export function markTune(zReal, zEff, lat, W, H) {
  S.tuneLat = lat;
  const key = `${zReal.toFixed(2)}|${zEff.toFixed(2)}|${lat.toFixed(1)}|${W}x${H}`;
  if (S.tuneMarked === key) return;
  S.tuneMarked = key;
  // la marque est le zoom effectif : c'est lui que les seuils des curseurs comparent
  const left = `${Math.max(0, Math.min(100, zEff / Z_MAX * 100)).toFixed(2)}%`;
  for (const m of S.tuneEl.querySelectorAll('.mp-tune-mark'))
    if (m.style.left !== left) m.style.left = left;
  const now = S.tuneEl.querySelector('[data-now]'),
    t = tt(TX.tuneNow, {
      z: zReal.toFixed(2),
      e: zEff.toFixed(2),
      m: Math.round((W + H) / 2),
      s: fmtNm(nmPerCm(zReal, lat))
    });
  if (now && now.textContent !== t) now.textContent = t;
}
