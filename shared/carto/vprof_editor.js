// Édition de la route (studio cartographique, Cartes de vol) : un champ de route (case 15 OACI ou liste à virgules),
// la coupe verticale (image de shared/carto/vertical_profile.js, géométrie data.geo) et la carte interactive (MapLibre),
// liés point par point (rang du jeton ti porté par chaque point de SiaProfile.parseRoute) :
//   · champ : survol d'un jeton ou curseur → point illuminé dans la coupe et sur la carte (calque surligné derrière le
//     texte) ; réciproquement, survol d'un point → jeton surligné ;
//   · coupe : clic → nouveau point à cette distance et cette altitude (aimanté sur un point existant proche : seule son
//     altitude change) ; glisser → altitude (pas de 50 ft), les points ajoutés glissent aussi le long de la route et
//     fusionnent avec le point sur lequel on les lâche ; double-clic → suppression d'un point ajouté ;
//   · carte : points déplaçables latéralement (départ et arrivée fixes), aimantés sur les balises, points de report et
//     terrains de la base SIA à moins de 14 px ; clic sur la route → point inséré ; double-clic sur un point ajouté →
//     suppression. Clic droit sur un point (carte ou coupe) : suppression, point nommé compris (départ et arrivée exceptés).
//     Un point inséré dans une portion de voie aérienne la remplace par des tronçons directs.
// Altitudes écrites « /A035 » (ft / 100) ou « /F065 » (case 15), « /3500 » (liste à virgules).
// Expose window.SiaRouteEdit = { attach({ textarea, img, onChange, aero }) → { update(data), setMapRoute(map, points),
// light(k), destroy() }, tokensOf } (window.SiaProfileEditor : même objet, ancien nom).
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}) => { const e = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const isItem15 = src => !/[,;\n]/.test(src) && /\s/.test(src);
  /** Jetons du cheminement, découpés comme SiaProfile.parseRoute (liste à virgules, sinon case 15 séparée par des espaces). */
  const tokensOf = text => {
    const src = String(text || '').trim();
    return (isItem15(src) ? src.split(/\s+/) : src.split(/[,;\n]+/)).map(t => t.trim()).filter(Boolean);
  };
  const ICAO_COORD = /^\d{2}(\d{2}(\d{2})?)?[NS]\d{3}(\d{2}(\d{2})?)?[EW]$/i, DEC_COORD = /^(?:\S*[A-Za-z]\S*\s+)?-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?$/;
  const movable = t => { const c = String(t || '').split('/')[0].trim(); return ICAO_COORD.test(c) || DEC_COORD.test(c); };
  const pad3 = n => String(Math.round(n)).padStart(3, '0');
  // points ajoutés : degrés, minutes, secondes (le plan de vol OACI strict arrondit à la minute à la copie)
  const icaoLatLon = (lat, lon) => window.SiaProfile?.icaoLatLonSec ? window.SiaProfile.icaoLatLonSec(lat, lon) : `${lat.toFixed(4)} ${lon.toFixed(4)}`;

  function attach({ textarea, img, onChange = () => {}, aero = () => ({}) }) {
    let pts = [], data = null, geo = null, hover = -1, map = null, markers = [];
    const listeners = [];

    // ================================================================ texte : jetons, écriture
    const item15 = () => isItem15(textarea.value.trim()) || !/[,;\n]/.test(textarea.value);
    const tokens = () => tokensOf(textarea.value);
    function write(toks) {
      textarea.value = toks.join(item15() ? ' ' : ', ').replace(/\s+DCT(\s+DCT)+/g, ' DCT');
      paintText();
      onChange(textarea.value);
    }
    const altCode = ft => item15() ? `${ft >= 6000 ? 'F' : 'A'}${pad3(ft / 100)}` : ft >= 6000 ? `FL${Math.round(ft / 100)}` : String(Math.round(ft));
    const coordTok = (p, ft) => (item15() ? icaoLatLon(p.lat, p.lon) : `${p.lat.toFixed(4)} ${p.lon.toFixed(4)}`) + (Number.isFinite(ft) ? '/' + altCode(ft) : '');
    const withAlt = (t, ft) => `${String(t).split('/')[0].trim()}/${altCode(ft)}`;
    const suffixOf = t => { const i = String(t).indexOf('/'); return i < 0 ? '' : String(t).slice(i); };
    /** Point éditable (jeton de point, hors points d'une voie aérienne) d'indice k ? */
    const editable = k => pts[k] && !pts[k].awy && Number.isInteger(pts[k].ti);
    /** Insère un point entre les points éditables kp et kn (voies aériennes entre eux → tronçons directs). */
    function insertBetween(kp, kn, p, ft) {
      const toks = tokens(), a = pts[kp].ti, b = pts[kn].ti;
      const between = toks.slice(a + 1, b).filter(t => !(/^[A-Z]{1,2}\d{1,4}[A-Z]?$/i.test(t) && (aero().airways || []).some(g => g.route === t.toUpperCase())));
      const mid = item15() ? [...between.filter(t => t.toUpperCase() !== 'DCT'), 'DCT', coordTok(p, ft), 'DCT'] : [...between, coordTok(p, ft)];
      toks.splice(a + 1, b - a - 1, ...mid);
      write(toks);
    }
    const isAirway = t => /^[A-Z]{1,2}\d{1,4}[A-Z]?$/i.test(t || '') && (aero().airways || []).some(g => g.route === String(t).toUpperCase());
    /** Supprime le point k (départ et arrivée exceptés) ; any : aussi un point nommé (clic droit), sinon seulement un point
     *  ajouté (coordonnées). Voie aérienne dont il était l'entrée ou la sortie → tronçon direct. */
    function removePoint(k, any = false) {
      if (!editable(k) || k === 0 || k === pts.length - 1 || (!any && !movable(tokens()[pts[k].ti]))) return;
      const toks = tokens();
      let i = pts[k].ti;
      toks.splice(i, 1);
      if (isAirway(toks[i])) toks.splice(i, 1);                        // voie dont il était l'entrée
      if (isAirway(toks[i - 1])) { toks.splice(i - 1, 1); i--; }         // voie dont il était la sortie
      if (item15() && toks[i - 1]?.toUpperCase() === 'DCT' && toks[i]?.toUpperCase() === 'DCT') toks.splice(i, 1);
      // case 15 : deux points devenus voisins → « DCT » entre eux
      const plainPt = t => t && !/^(DCT|VFR|IFR)$/i.test(t) && !isAirway(t) && !window.SiaProfile?.speedLevel?.(t.split('/')[0]);
      if (item15() && i > 0 && plainPt(toks[i - 1]) && plainPt(toks[i])) toks.splice(i, 0, 'DCT');
      write(toks);
    }
    const prevEditable = k => { for (let j = k; j >= 0; j--) if (editable(j)) return j; return -1; };
    const nextEditable = k => { for (let j = k; j < pts.length; j++) if (editable(j)) return j; return -1; };

    // ================================================================ champ : calque surligné derrière le texte
    const box = document.createElement('div');
    box.className = 'route-edit-box';
    box.style.cssText = 'position:relative;display:block';
    textarea.parentNode.insertBefore(box, textarea);
    const mirror = document.createElement('div');
    mirror.className = 'route-edit-mirror';
    mirror.setAttribute('aria-hidden', 'true');
    box.append(mirror, textarea);
    function syncMirror() {
      const cs = getComputedStyle(textarea);
      for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'tabSize']) mirror.style[k] = cs[k];
      if (!textarea.dataset.routeBg) { textarea.dataset.routeBg = cs.backgroundColor; mirror.style.background = cs.background; mirror.style.borderRadius = cs.borderRadius; }
      Object.assign(mirror.style, { position: 'absolute', inset: '0', borderStyle: 'solid', borderColor: 'transparent', color: 'transparent', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', overflow: 'hidden', pointerEvents: 'none' });
      textarea.style.background = 'transparent';
      textarea.style.position = 'relative';
      mirror.scrollTop = textarea.scrollTop;
    }
    const escHtml = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    /** Calque : un <span data-ti> par jeton, séparateurs conservés (même mise en page que le texte). */
    function paintText() {
      const text = textarea.value;
      let ti = 0, html = '';
      if (isItem15(text.trim()) || !/[,;\n]/.test(text)) html = text.replace(/(\S+)|(\s+)/g, (m, tok, sp) => tok ? `<span data-ti="${ti++}">${escHtml(tok)}</span>` : escHtml(sp));
      else html = text.split(/([,;\n]+)/).map(seg => /^[,;\n]+$/.test(seg) ? escHtml(seg) : seg.trim() ? `<span data-ti="${ti++}">${escHtml(seg)}</span>` : escHtml(seg)).join('');
      mirror.innerHTML = html + '​';
      syncMirror();
      markText();
    }
    function markText() {
      const ti = hover >= 0 && pts[hover] ? pts[hover].ti : -1;
      mirror.querySelectorAll('span[data-ti]').forEach(s => s.classList.toggle('on', +s.dataset.ti === ti));
    }
    /** Point (indice dans pts) du jeton de rang ti (jeton de voie aérienne : son premier point). */
    const pointOfToken = ti => pts.findIndex(p => p.ti === ti);
    let raf = 0;
    textarea.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        mirror.scrollTop = textarea.scrollTop;
        const s = [...mirror.querySelectorAll('span[data-ti]')].find(x => [...x.getClientRects()].some(r => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom));
        light(s ? pointOfToken(+s.dataset.ti) : -1);
      });
    });
    textarea.addEventListener('mouseleave', () => { if (document.activeElement !== textarea) light(-1); });
    const caretLight = () => {
      const before = textarea.value.slice(0, textarea.selectionStart);
      const n = tokensOf(before).length - (/[\s,;]$/.test(before) || !before ? 0 : 1);
      light(pointOfToken(Math.max(0, n)));
    };
    ['keyup', 'click'].forEach(ev => textarea.addEventListener(ev, caretLight));
    textarea.addEventListener('input', paintText);
    textarea.addEventListener('scroll', () => { mirror.scrollTop = textarea.scrollTop; });
    new ResizeObserver(syncMirror).observe(textarea);

    /** Illumine le point k partout (champ, coupe, carte) ; -1 : rien. */
    function light(k) {
      hover = k;
      markText();
      markProfile();
      markers.forEach(m => m.getElement().classList.toggle('on', m._k === k));
      if (map?.getLayer?.('route-edit-on')) map.setFilter('route-edit-on', ['==', ['get', 'k'], k]);
      listeners.forEach(f => f(k));
    }

    // ================================================================ coupe verticale : calque SVG sur l'image
    let svg = null, band, guide, tip, handles;
    const X = s => geo.padL + (geo.W - geo.padL - geo.padR) * s / geo.total;
    const S = x => Math.max(0, Math.min(geo.total, (x - geo.padL) / (geo.W - geo.padL - geo.padR) * geo.total));
    const Y = ft => geo.padT + (geo.H - geo.padT - geo.padB) * (1 - (ft - geo.bottom) / (geo.top - geo.bottom));
    const F = y => geo.bottom + (1 - (y - geo.padT) / (geo.H - geo.padT - geo.padB)) * (geo.top - geo.bottom);
    const sampleAt = s => { const a = data.samples; let lo = 0, hi = a.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].s < s) lo = m; else hi = m; } return Math.abs(a[lo].s - s) <= Math.abs(a[hi].s - s) ? lo : hi; };
    const pointAt = s => { const a = data.samples, i = sampleAt(s), j = a[i].s <= s ? Math.min(i + 1, a.length - 1) : Math.max(i - 1, 0), t = a[j].s === a[i].s ? 0 : (s - a[i].s) / (a[j].s - a[i].s); return { lat: a[i].lat + (a[j].lat - a[i].lat) * t, lon: a[i].lon + (a[j].lon - a[i].lon) * t }; };
    const terrainAt = s => data.samples[sampleAt(s)].terrain || 0;
    const altOf = m => Number.isFinite(m.alt) ? m.alt : data.plan?.alt?.[sampleAt(m.s)] ?? m.lvl?.ft ?? terrainAt(m.s);
    const toSvg = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * geo.W, y: (e.clientY - r.top) / r.height * geo.H }; };
    const snapAt = (s, k) => { const tol = 12 * geo.W / (svg.getBoundingClientRect().width || geo.W); let best = -1, d = tol; pts.forEach((m, j) => { const e = Math.abs(X(m.s) - X(s)); if (j !== k && editable(j) && e < d) { d = e; best = j; } }); return best; };
    const showTip = (x, y, ft, s) => {
      const agl = Math.max(0, Math.round(ft - terrainAt(s)));
      tip.textContent = `${Math.round(ft)} ft · ${agl} ft AGL · relief ${Math.round(terrainAt(s))} ft`;
      tip.setAttribute('x', Math.min(x + 12, geo.W - 330)); tip.setAttribute('y', Math.max(y - 12, geo.padT + 14));
      tip.setAttribute('visibility', 'visible');
    };
    function markProfile() {
      if (!svg || !geo) return;
      handles.querySelectorAll('circle').forEach(c => { const on = +c.dataset.k === hover; c.setAttribute('r', (c.dataset.awy ? 3 : 6) + (on ? 3 : 0)); c.setAttribute('stroke-width', on ? 3 : 2); });
      if (hover < 0 || !pts[hover] || !Number.isFinite(pts[hover].s)) { band.setAttribute('visibility', 'hidden'); return; }
      const s0 = pts[Math.max(0, hover - 1)].s, s1 = pts[Math.min(pts.length - 1, hover + 1)].s;
      band.setAttribute('x', X(s0)); band.setAttribute('width', Math.max(4, X(s1) - X(s0)));
      band.setAttribute('y', geo.padT); band.setAttribute('height', geo.H - geo.padT - geo.padB);
      band.setAttribute('visibility', 'visible');
    }
    function buildProfile() {
      if (svg || !img) return;
      const wrap = document.createElement('div');
      wrap.className = 'vprof-edit-wrap';
      wrap.style.cssText = 'position:relative;display:block';
      img.parentNode.insertBefore(wrap, img);
      wrap.append(img);
      svg = el('svg', { class: 'vprof-edit', preserveAspectRatio: 'none' });
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;touch-action:none';
      wrap.append(svg);
      band = el('rect', { fill: 'rgba(255,196,0,.22)', stroke: 'rgba(214,150,0,.8)', 'stroke-dasharray': '4 3', visibility: 'hidden' });
      guide = el('line', { stroke: '#d0021b', 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
      tip = el('text', { 'font-size': 13, 'font-family': 'Arial, sans-serif', 'font-weight': 700, fill: '#17202a', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', visibility: 'hidden' });
      handles = el('g');
      svg.append(band, guide, handles, tip);
      let drag = null;
      svg.addEventListener('pointerdown', e => {
        if (!geo) return;
        const p = toSvg(e), c = e.target.closest('circle[data-k]'), k = c && !c.dataset.awy ? +c.dataset.k : -1;
        drag = { k, x0: p.x, y0: p.y, moved: false, s: S(p.x), ft: Math.max(0, Math.round(F(p.y) / 50) * 50), snap: k < 0 ? snapAt(S(p.x), -1) : -1 };
        svg.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      svg.addEventListener('pointermove', e => {
        if (!geo) return;
        const p = toSvg(e);
        if (!drag) {
          const c = e.target.closest('circle[data-k]');
          light(c ? +c.dataset.k : -1);
          if (!c) showTip(p.x, p.y, F(p.y), S(p.x)); else tip.setAttribute('visibility', 'hidden');
          return;
        }
        if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > 3) drag.moved = true;
        const k = drag.k, canSlide = k > 0 && k < pts.length - 1 && movable(tokens()[pts[k].ti]);
        let s = k >= 0 && !canSlide ? pts[k].s : S(p.x);
        const ft = Math.max(0, Math.round(F(p.y) / 50) * 50);
        drag.snap = snapAt(s, k);
        if (drag.snap >= 0 && (k < 0 || canSlide)) s = pts[drag.snap].s;
        drag.s = s; drag.ft = ft;
        guide.setAttribute('x1', X(s)); guide.setAttribute('x2', X(s)); guide.setAttribute('y1', geo.padT); guide.setAttribute('y2', geo.H - geo.padB);
        guide.setAttribute('visibility', 'visible');
        if (k >= 0) { const c = handles.querySelector(`circle[data-k="${k}"]`); c?.setAttribute('cx', X(s)); c?.setAttribute('cy', Y(ft)); }
        showTip(X(s), Y(ft), ft, s);
      });
      svg.addEventListener('pointerup', () => {
        if (!drag || !geo) return;
        const d = drag;
        drag = null;
        guide.setAttribute('visibility', 'hidden');
        tip.setAttribute('visibility', 'hidden');
        const toks = tokens();
        if (d.k >= 0) {
          if (!d.moved) return;
          const i = pts[d.k].ti, inner = d.k > 0 && d.k < pts.length - 1 && movable(toks[i]);
          if (inner && d.snap >= 0 && d.snap !== d.k) {
            // fusion : le point ajouté disparaît, son altitude passe au point sur lequel il est lâché
            toks[pts[d.snap].ti] = withAlt(toks[pts[d.snap].ti], d.ft);
            toks.splice(i, 1);
          } else if (inner) toks[i] = coordTok(pointAt(d.s), d.ft);
          else toks[i] = withAlt(toks[i], d.ft);
          write(toks);
          return;
        }
        // clic : aimant sur un point existant, sinon nouveau point entre ses voisins éditables
        if (d.snap >= 0) { toks[pts[d.snap].ti] = withAlt(toks[pts[d.snap].ti], d.ft); write(toks); return; }
        const next = nextEditable(pts.findIndex(m => m.s > d.s)), prev = prevEditable(next - 1);
        if (next <= 0 || prev < 0) return;
        insertBetween(prev, next, pointAt(d.s), d.ft);
      });
      svg.addEventListener('dblclick', e => { const c = e.target.closest('circle[data-k]'); if (c) removePoint(+c.dataset.k); });
      // clic droit sur un point : suppression (tout point intermédiaire)
      svg.addEventListener('contextmenu', e => { const c = e.target.closest('circle[data-k]'); if (!c) return; e.preventDefault(); if (!c.dataset.awy) removePoint(+c.dataset.k, true); });
      svg.addEventListener('pointerleave', () => { if (!drag) { light(-1); tip.setAttribute('visibility', 'hidden'); } });
    }
    function drawHandles() {
      handles.textContent = '';
      pts.forEach((m, k) => {
        if (!Number.isFinite(m.s)) return;
        const c = el('circle', { cx: X(m.s), cy: Y(altOf(m)), r: m.awy ? 3 : 6, fill: Number.isFinite(m.alt) ? '#d0021b' : '#fff', stroke: '#d0021b', 'stroke-width': 2, 'data-k': k });
        if (m.awy) c.setAttribute('data-awy', '1'); else c.style.cursor = 'grab';
        const t = el('title');
        t.textContent = `${m.name || ''} — ${Math.round(altOf(m))} ft${Number.isFinite(m.alt) ? ' (imposée)' : ''}${m.awy ? ' (voie aérienne)' : ''}`;
        c.append(t);
        handles.append(c);
      });
    }

    // ================================================================ carte : route, points déplaçables
    /** Point de la base SIA (balise, point de report, terrain) à moins de 14 px de l'écran ; null sinon. */
    function snapOnMap(ll) {
      const a = aero(), p0 = map.project(ll), cand = [...(a.navaids || []).map(n => ({ id: n.id, lat: n.lat, lon: n.lon })), ...(a.points || []).map(n => ({ id: n.id, lat: n.lat, lon: n.lon })), ...(a.aerodromes || []).map(n => ({ id: n.icao, lat: n.lat, lon: n.lon }))];
      let best = null, d = 14;
      for (const c of cand) {
        if (!c.id || Math.abs(c.lat - ll.lat) > .5 || Math.abs(c.lon - ll.lng) > .8) continue;
        const q = map.project([c.lon, c.lat]), e = Math.hypot(q.x - p0.x, q.y - p0.y);
        if (e < d) { d = e; best = c; }
      }
      return best;
    }
    function clearMap() {
      markers.forEach(m => m.remove());
      markers = [];
    }
    /** Route sur la carte interactive map (points de parseRoute, ti) : ligne, points éditables déplaçables. */
    function setMapRoute(m, points) {
      if (m !== map) { clearMap(); map = m; bindMap(); }
      // points lus (parseRoute) tant que la coupe n'est pas tracée ou n'a plus le même nombre de points
      if (points && (!data || points.length !== pts.length)) pts = points.map(p => ({ ...p }));
      if (!map || !window.maplibregl) return;
      const line = { type: 'Feature', geometry: { type: 'LineString', coordinates: pts.map(p => [p.lon, p.lat]) }, properties: {} };
      const segs = { type: 'FeatureCollection', features: pts.slice(1).map((p, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'LineString', coordinates: [[pts[i].lon, pts[i].lat], [p.lon, p.lat]] } })) };
      const dots = { type: 'FeatureCollection', features: pts.map((p, k) => ({ type: 'Feature', properties: { k, awy: p.awy ? 1 : 0 }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })) };
      const put = (id, dataObj) => { const src = map.getSource(id); if (src) src.setData(dataObj); else map.addSource(id, { type: 'geojson', data: dataObj }); };
      const ready = () => {
        put('route-edit-line', line); put('route-edit-segs', segs); put('route-edit-dots', dots);
        if (!map.getLayer('route-edit-line')) {
          map.addLayer({ id: 'route-edit-line', type: 'line', source: 'route-edit-line', paint: { 'line-color': '#d0021b', 'line-width': 3, 'line-opacity': .85 } });
          map.addLayer({ id: 'route-edit-hit', type: 'line', source: 'route-edit-segs', paint: { 'line-color': '#000', 'line-width': 16, 'line-opacity': 0 } });
          map.addLayer({ id: 'route-edit-awy', type: 'circle', source: 'route-edit-dots', filter: ['==', ['get', 'awy'], 1], paint: { 'circle-radius': 3, 'circle-color': '#fff', 'circle-stroke-color': '#d0021b', 'circle-stroke-width': 1.5 } });
          map.addLayer({ id: 'route-edit-on', type: 'circle', source: 'route-edit-dots', filter: ['==', ['get', 'k'], -1], paint: { 'circle-radius': 12, 'circle-color': 'rgba(255,196,0,.45)', 'circle-stroke-color': '#d69600', 'circle-stroke-width': 2 } });
        }
        clearMap();
        pts.forEach((p, k) => {
          if (!editable(k)) return;
          const e = document.createElement('div');
          e.className = 'route-edit-pt';
          e.innerHTML = `<i></i><span>${escHtml(String(p.name || ''))}</span>`;
          const fixed = k === 0 || k === pts.length - 1;
          const mk = new maplibregl.Marker({ element: e, draggable: !fixed, anchor: 'center' }).setLngLat([p.lon, p.lat]).addTo(map);
          mk._k = k;
          e.addEventListener('mouseenter', () => light(k));
          e.addEventListener('mouseleave', () => light(-1));
          e.addEventListener('dblclick', ev => { ev.stopPropagation(); removePoint(k); });
          e.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); removePoint(k, true); });   // clic droit : suppression
          mk.on('dragend', () => {
            const ll = mk.getLngLat(), snap = snapOnMap(ll), toks = tokens(), i = p.ti;
            toks[i] = (snap ? snap.id : coordTok({ lat: ll.lat, lon: ll.lng })) + suffixOf(toks[i]);
            write(toks);
          });
          markers.push(mk);
        });
      };
      // style pas encore prêt (carte en cours de création, fond lent) : dès son chargement
      // (style chargé suffit : isStyleLoaded() attend aussi les tuiles, qui peuvent ne jamais venir)
      const styleOk = m0 => !!(m0.style && (m0.style._loaded || m0.isStyleLoaded()));
      if (styleOk(map)) ready(); else { const m0 = map, go = () => { if (map === m0 && styleOk(m0)) { m0.off('styledata', go); ready(); } }; m0.on('styledata', go); m0.once('load', go); }
    }
    function bindMap() {
      if (!map) return;
      map.on('click', 'route-edit-hit', e => {
        const i = e.features?.[0]?.properties?.i;
        if (!Number.isInteger(i)) return;
        const prev = prevEditable(i), next = nextEditable(i + 1);
        if (prev < 0 || next < 0) return;
        const snap = snapOnMap(e.lngLat);
        if (snap) {
          // point de la base SIA sous le clic : inséré par son nom
          const toks = tokens(), a = pts[prev].ti;
          toks.splice(a + 1, pts[next].ti - a - 1, ...(item15() ? ['DCT', snap.id, 'DCT'] : [snap.id]));
          write(toks);
        } else insertBetween(prev, next, { lat: e.lngLat.lat, lon: e.lngLat.lng }, null);
      });
      map.on('mouseenter', 'route-edit-hit', () => { map.getCanvas().style.cursor = 'copy'; });
      map.on('mouseleave', 'route-edit-hit', () => { map.getCanvas().style.cursor = ''; });
    }

    buildProfile();
    paintText();
    return {
      /** Nouvelle coupe dessinée (données de SiaProfile.build ; marks : points avec ti, awy, s). */
      update(d) {
        data = d; geo = d?.geo || null;
        pts = (d?.marks || []).map(m => ({ ...m }));
        if (!geo) { handles.textContent = ''; return; }
        svg.setAttribute('viewBox', `0 0 ${geo.W} ${geo.H}`);
        drawHandles();
        paintText();
        if (map) setMapRoute(map, null);
        light(hover);
      },
      setMapRoute,
      light,
      /** Appelé à chaque point illuminé (k, -1 : aucun). */
      onLight(f) { listeners.push(f); },
      refreshText: paintText
    };
  }

  window.SiaRouteEdit = window.SiaProfileEditor = { attach, tokensOf };
})();
