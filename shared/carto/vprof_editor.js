// Édition du profil vertical à la souris (studio cartographique, Cartes de vol) : calque SVG posé sur l'image de la
// coupe (shared/carto/vertical_profile.js, géométrie data.geo), cheminement en texte (liste séparée par des virgules).
//   · clic dans la coupe : nouveau point à cette distance et cette altitude (« 43.6123 1.3821/1500 ») — aimanté sur un
//     point existant proche (sa seule altitude change : « R589B/1500 ») ;
//   · glisser un point : altitude (pas de 50 ft) ; les points ajoutés (coordonnées) glissent aussi le long de la route,
//     lâchés sur un autre point ils fusionnent avec lui ; double-clic sur un point ajouté : suppression ;
//   · survol d'un point, d'une étiquette du cheminement ou curseur dans le champ : le tronçon est illuminé des deux côtés.
// Altitude affichée pendant le déplacement : AMSL, hauteur au-dessus du relief (AGL) et relief.
// Expose window.SiaProfileEditor = { attach({ img, textarea, chips, onChange }) → { update(data), destroy() } }.
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const LEVEL = /^(DCT|VFR|IFR|FL\s*\d{1,3}|\d{3,5}\s*FT|[NKM]\d{3,4}[FASM]\d{3,4})$/i;
  const COORD = /^(?:(\S*[A-Za-z]\S*)\s+)?(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/;
  const el = (name, attrs = {}) => { const e = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  /** Jetons du cheminement : liste à virgules, sinon case 15 (espaces). */
  const tokensOf = text => {
    const src = String(text || '').trim();
    return (/[,;\n]/.test(src) || !/\s/.test(src) ? src.split(/[,;\n]+/) : src.split(/\s+/)).map(t => t.trim()).filter(Boolean);
  };
  /** Jeton de point ? (ni niveau, ni DCT, ni voie aérienne de case 15 sans point). */
  const isPoint = t => !LEVEL.test(t.split('/')[0].trim());
  const altText = ft => ft >= 6000 ? `FL${Math.round(ft / 100)}` : String(Math.round(ft));

  function attach({ img, textarea, chips = null, onChange = () => {} }) {
    const wrap = document.createElement('div');
    wrap.className = 'vprof-edit-wrap';
    wrap.style.cssText = 'position:relative;display:block';
    img.parentNode.insertBefore(wrap, img);
    wrap.append(img);
    const svg = el('svg', { class: 'vprof-edit', preserveAspectRatio: 'none' });
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;touch-action:none';
    wrap.append(svg);
    const band = el('rect', { fill: 'rgba(255,196,0,.22)', stroke: 'rgba(214,150,0,.8)', 'stroke-dasharray': '4 3', visibility: 'hidden' }),
      guide = el('line', { stroke: '#d0021b', 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' }),
      tip = el('text', { 'font-size': 13, 'font-family': 'Arial, sans-serif', 'font-weight': 700, fill: '#17202a', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', visibility: 'hidden' }),
      handles = el('g');
    svg.append(band, guide, handles, tip);
    let data = null, geo = null, marks = [], hover = -1;

    // ---- géométrie : distance (m) ↔ x, altitude (ft) ↔ y, échantillon le plus proche
    const X = s => geo.padL + (geo.W - geo.padL - geo.padR) * s / geo.total;
    const S = x => Math.max(0, Math.min(geo.total, (x - geo.padL) / (geo.W - geo.padL - geo.padR) * geo.total));
    const Y = ft => geo.padT + (geo.H - geo.padT - geo.padB) * (1 - (ft - geo.bottom) / (geo.top - geo.bottom));
    const F = y => geo.bottom + (1 - (y - geo.padT) / (geo.H - geo.padT - geo.padB)) * (geo.top - geo.bottom);
    const sampleAt = s => { const a = data.samples; let lo = 0, hi = a.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].s < s) lo = m; else hi = m; } return Math.abs(a[lo].s - s) <= Math.abs(a[hi].s - s) ? lo : hi; };
    const pointAt = s => { const a = data.samples, i = sampleAt(s), j = a[i].s <= s ? Math.min(i + 1, a.length - 1) : Math.max(i - 1, 0), t = a[j].s === a[i].s ? 0 : (s - a[i].s) / (a[j].s - a[i].s); return { lat: a[i].lat + (a[j].lat - a[i].lat) * t, lon: a[i].lon + (a[j].lon - a[i].lon) * t }; };
    const terrainAt = s => data.samples[sampleAt(s)].terrain || 0;
    const planAt = s => data.plan?.alt?.[sampleAt(s)];
    /** Position souris → coordonnées du dessin (viewBox). */
    const toSvg = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * geo.W, y: (e.clientY - r.top) / r.height * geo.H }; };
    /** Point existant (autre que k) à moins de 12 px d'écran de la distance s ; -1 sinon. */
    const snapAt = (s, k) => { const tol = 12 * geo.W / (svg.getBoundingClientRect().width || geo.W); let best = -1, d = tol; marks.forEach((m, j) => { const e = Math.abs(X(m.s) - X(s)); if (j !== k && e < d) { d = e; best = j; } }); return best; };

    // ---- cheminement : jetons et correspondance point du profil (k) → jeton (index)
    const tokens = () => tokensOf(textarea.value);
    const pointTokens = toks => toks.map((t, i) => isPoint(t) ? i : -1).filter(i => i >= 0);
    function write(toks) {
      textarea.value = toks.join(', ');
      renderChips();
      onChange(textarea.value);
    }
    const coordToken = (p, ft) => `${p.lat.toFixed(4)} ${p.lon.toFixed(4)}/${altText(ft)}`;
    const withAlt = (t, ft) => `${t.split('/')[0].trim()}/${altText(ft)}`;
    const movable = t => COORD.test(t.split('/')[0].trim());

    // ---- étiquettes du cheminement (sous le champ) : survol ↔ tronçon illuminé
    function renderChips() {
      if (!chips) return;
      const toks = tokens(), pt = pointTokens(toks);
      chips.innerHTML = toks.map((t, i) => { const k = pt.indexOf(i); return `<span class="vprof-chip${k >= 0 ? '' : ' lvl'}" data-k="${k}">${t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</span>`; }).join('');
    }
    if (chips) {
      chips.addEventListener('mouseover', e => { const c = e.target.closest('[data-k]'); if (c && +c.dataset.k >= 0) light(+c.dataset.k); });
      chips.addEventListener('mouseout', () => light(-1));
    }
    // curseur dans le champ : point du jeton sous le curseur
    const caretLight = () => {
      if (document.activeElement !== textarea) return;
      const before = textarea.value.slice(0, textarea.selectionStart), toks = tokensOf(before), pt = pointTokens(tokens());
      const idx = Math.max(0, toks.length - (/[,;\n]\s*$/.test(before) ? 0 : 1));
      light(pt.indexOf(idx) >= 0 ? pt.indexOf(idx) : pt.findIndex(i => i >= idx));
    };
    ['keyup', 'click', 'select'].forEach(ev => textarea.addEventListener(ev, caretLight));
    textarea.addEventListener('blur', () => light(-1));
    textarea.addEventListener('input', renderChips);

    /** Illumine le point k (tronçon précédent et suivant), l'étiquette et le jeton ; -1 : rien. */
    function light(k) {
      hover = k;
      handles.querySelectorAll('circle').forEach((c, i) => { c.setAttribute('r', i === k ? 9 : 6); c.setAttribute('stroke-width', i === k ? 3 : 2); });
      chips?.querySelectorAll('[data-k]').forEach(c => c.classList.toggle('on', +c.dataset.k === k && k >= 0));
      if (k < 0 || !marks[k]) { band.setAttribute('visibility', 'hidden'); return; }
      const s0 = marks[Math.max(0, k - 1)].s, s1 = marks[Math.min(marks.length - 1, k + 1)].s;
      band.setAttribute('x', X(s0)); band.setAttribute('width', Math.max(4, X(s1) - X(s0)));
      band.setAttribute('y', geo.padT); band.setAttribute('height', geo.H - geo.padT - geo.padB);
      band.setAttribute('visibility', 'visible');
    }
    const showTip = (x, y, ft, s) => {
      const agl = Math.round(ft - terrainAt(s));
      tip.textContent = `${Math.round(ft)} ft · ${agl >= 0 ? agl : 0} ft AGL · relief ${Math.round(terrainAt(s))} ft`;
      tip.setAttribute('x', Math.min(x + 12, geo.W - 330)); tip.setAttribute('y', Math.max(y - 12, geo.padT + 14));
      tip.setAttribute('visibility', 'visible');
    };

    // ---- poignées
    const altOf = (m) => Number.isFinite(m.alt) ? m.alt : planAt(m.s) ?? m.lvl?.ft ?? terrainAt(m.s);
    function drawHandles() {
      handles.textContent = '';
      marks.forEach((m, k) => {
        const c = el('circle', { cx: X(m.s), cy: Y(altOf(m)), r: 6, fill: Number.isFinite(m.alt) ? '#d0021b' : '#fff', stroke: '#d0021b', 'stroke-width': 2, 'data-k': k });
        c.style.cursor = 'grab';
        const t = el('title');
        t.textContent = `${m.name || ''} — ${Math.round(altOf(m))} ft${Number.isFinite(m.alt) ? ' (imposée)' : ''}`;
        c.append(t);
        handles.append(c);
      });
    }

    // ---- interactions
    let drag = null;
    svg.addEventListener('pointerdown', e => {
      if (!geo) return;
      const p = toSvg(e), c = e.target.closest('circle');
      const k = c ? +c.dataset.k : -1, ft = Math.max(0, Math.round(F(p.y) / 50) * 50);
      drag = { k, x0: p.x, y0: p.y, moved: false, s: S(p.x), ft, snap: k < 0 ? snapAt(S(p.x), -1) : -1 };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svg.addEventListener('pointermove', e => {
      if (!geo) return;
      const p = toSvg(e);
      if (!drag) {
        const c = e.target.closest('circle');
        light(c ? +c.dataset.k : -1);
        if (!c) { const s = S(p.x); showTip(p.x, p.y, F(p.y), s); } else tip.setAttribute('visibility', 'hidden');
        return;
      }
      if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > 3) drag.moved = true;
      const toks = tokens(), pt = pointTokens(toks), k = drag.k;
      const canSlide = k > 0 && k < marks.length - 1 && movable(toks[pt[k]] || '');
      let s = k >= 0 && !canSlide ? marks[k].s : S(p.x), ft = Math.max(0, Math.round(F(p.y) / 50) * 50);
      // aimant : point existant à moins de 10 px
      drag.snap = snapAt(s, k);
      if (drag.snap >= 0 && (k < 0 || canSlide)) s = marks[drag.snap].s;
      drag.s = s; drag.ft = ft;
      guide.setAttribute('x1', X(s)); guide.setAttribute('x2', X(s)); guide.setAttribute('y1', geo.padT); guide.setAttribute('y2', geo.H - geo.padB);
      guide.setAttribute('visibility', 'visible');
      if (k >= 0) { const c = handles.children[k]; c.setAttribute('cx', X(s)); c.setAttribute('cy', Y(ft)); }
      showTip(X(s), Y(ft), ft, s);
    });
    svg.addEventListener('pointerup', () => {
      if (!drag || !geo) return;
      const d = drag;
      drag = null;
      guide.setAttribute('visibility', 'hidden');
      tip.setAttribute('visibility', 'hidden');
      const toks = tokens(), pt = pointTokens(toks);
      if (d.k >= 0) {
        if (!d.moved) return;
        const i = pt[d.k];
        if (d.snap >= 0 && d.snap !== d.k && movable(toks[i]) && d.k > 0 && d.k < marks.length - 1) {
          // fusion : le point ajouté disparaît, son altitude passe au point sur lequel il est lâché
          toks[pt[d.snap]] = withAlt(toks[pt[d.snap]], d.ft);
          toks.splice(i, 1);
        } else if (movable(toks[i]) && d.k > 0 && d.k < marks.length - 1) toks[i] = coordToken(pointAt(d.s), d.ft);
        else toks[i] = withAlt(toks[i], d.ft);
        write(toks);
        return;
      }
      // clic dans la coupe : aimant sur un point existant, sinon nouveau point inséré entre ses voisins
      if (d.snap >= 0) { toks[pt[d.snap]] = withAlt(toks[pt[d.snap]], d.ft); write(toks); return; }
      const next = marks.findIndex(m => m.s > d.s);
      if (next <= 0) return;
      toks.splice(pt[next], 0, coordToken(pointAt(d.s), d.ft));
      write(toks);
    });
    svg.addEventListener('dblclick', e => {
      const c = e.target.closest('circle');
      if (!c) return;
      const k = +c.dataset.k, toks = tokens(), pt = pointTokens(toks);
      if (k > 0 && k < marks.length - 1 && movable(toks[pt[k]])) { toks.splice(pt[k], 1); write(toks); }
    });
    svg.addEventListener('pointerleave', () => { if (!drag) { light(-1); tip.setAttribute('visibility', 'hidden'); } });

    renderChips();
    return {
      /** Nouvelle coupe dessinée (données de SiaProfile.build, géométrie posée par SiaProfile.draw). */
      update(d) {
        data = d; geo = d?.geo || null; marks = d?.marks || [];
        if (!geo) { handles.textContent = ''; return; }
        svg.setAttribute('viewBox', `0 0 ${geo.W} ${geo.H}`);
        drawHandles();
        renderChips();
        light(hover);
      },
      destroy() { wrap.replaceWith(img); }
    };
  }

  window.SiaProfileEditor = { attach, tokensOf };
})();
