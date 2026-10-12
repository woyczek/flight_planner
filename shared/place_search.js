(() => {
  'use strict';
  // Recherche d'un lieu par son nom (générateur de mission : éditeur YAML ; studio cartographique : « Points à placer ») :
  // terrains, balises, points et VRP de la base SIA du navigateur (SiaBase.get().aero), entrées en plus (axes AAR du
  // studio), puis les villes (SiaBase.cities() : noms GeoNames, ~70 000). Les suggestions sont calculées à la frappe
  // (40 au plus, dans cet ordre), jamais toute la liste dans le DOM.
  // API (window.PlaceSearch) : index({ extra }) → Promise<Map libellé → { lat, lon, name, kind }> ; reset() ;
  //   suggest(texte, n) → Promise<[libellé]> ; lookup(texte) → Promise<{ lat, lon, name } | null> (libellé, code seul
  //   « LFQP », nom de ville, ou « lat, lon » ; { strict } : sans rapprochement approchant) ; attach(input, datalist,
  //   onPick) : suggestions à la frappe, onPick(lieu) au choix d'une valeur reconnue exactement.
  if (window.PlaceSearch) return;
  let built = null,
    extraKey = '';
  /** Texte comparable : majuscules sans accents. */
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const ok = p => p && p.lat !== null && p.lat !== '' && p.lon !== null && p.lon !== '' && Number.isFinite(+p.lat) && Number.isFinite(+p
    .lon);
  /** Index des lieux (construit une fois ; extra : [{ label, lat, lon, name }] en plus, après les points de la base). */
  function index({
    extra = []
  } = {}) {
    const key = JSON.stringify(extra.map(e => e.label));
    if (built && key === extraKey) return built;
    extraKey = key;
    return built = (async () => {
      const m = new Map(),
        /** Ajoute le lieu p sous label (premier gardé). */
        put = (label, p, name, kind) => {
          if (ok(p) && label && !m.has(label)) m.set(label, {
            lat: +p.lat,
            lon: +p.lon,
            name: name || label,
            kind,
            key: fold(label)
          });
        };
      const b = await window.SiaBase?.get?.().catch(() => null),
        aero = b?.aero || {};
      for (const a of aero.aerodromes || []) put(`${a.icao || a.id} — ${a.name || ''}`.trim(), a, `${a.name || a.icao} (${a.icao || a.id})`,
        'aerodrome');
      for (const n of aero.navaids || []) put(`${n.id} — ${n.kind || ''} ${n.name || ''}`.trim(), n, `${n.id} ${n.name || ''}`.trim(),
        'navaid');
      for (const p of aero.points || []) put(String(p.id), p, String(p.id), 'point');
      for (const v of aero.vrp || []) put(`${v.id} — ${v.name || ''}`.trim(), v, v.name || v.id, 'vrp');
      for (const e of extra) put(e.label, e, e.name, 'extra');
      const cities = await window.SiaBase?.cities?.().catch(() => []) || [];
      // villes : les plus peuplées d'abord (homonymes : la plus grande gardée)
      for (const c of [...cities].sort((x, y) => (y.population || 0) - (x.population || 0))) put(c.name, c, c.name, 'city');
      return m;
    })();
  }
  /** Oublie l'index (base SIA relue). */
  const reset = () => {
    built = null;
  };
  /** Libellés qui répondent au texte : début de libellé d'abord, puis contenu ; n au plus. */
  async function suggest(text, n = 40) {
    const q = fold(text);
    if (q.length < 2) return [];
    const m = await index(),
      starts = [],
      has = [];
    for (const [label, v] of m) {
      if (v.key.startsWith(q)) starts.push(label);
      else if (has.length < n && v.key.includes(q)) has.push(label);
      if (starts.length >= n) break;
    }
    return [...starts, ...has].slice(0, n);
  }
  /** Position d'un texte : « lat, lon », libellé exact, code seul (« LFQP »), nom de ville ; sauf strict, un libellé qui
   *  contient le texte (champ de recherche). strict : nom d'un point saisi, jamais rapproché d'un lieu approchant. */
  async function lookup(text, {
    strict = false
  } = {}) {
    const q = String(text || '').trim();
    if (!q) return null;
    const c = /^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/.exec(q);
    if (c) return {
      lat: +c[1].replace(',', '.'),
      lon: +c[2].replace(',', '.'),
      name: ''
    };
    const m = await index(),
      f = fold(q);
    if (m.has(q)) return m.get(q);
    for (const v of m.values())
      if (v.key === f || v.key.startsWith(f + ' —')) return v;
    if (strict) return null;
    for (const v of m.values())
      if (v.key.includes(f)) return v;
    return null;
  }
  /** Suggestions à la frappe dans datalist pour input ; onPick(lieu, texte) quand la valeur choisie est reconnue. */
  function attach(input, datalist, onPick) {
    if (!input || !datalist || input.dataset.placeAttached) return;
    input.dataset.placeAttached = '1';
    input.setAttribute('list', datalist.id);
    let seq = 0;
    input.addEventListener('input', async () => {
      const mine = ++seq,
        list = await suggest(input.value);
      if (mine !== seq) return;
      datalist.innerHTML = list.map(l => `<option value="${String(l).replace(/[&<>"]/g, ch => `&#${ch.charCodeAt(0)};`)}"></option>`).join('');
    });
    input.addEventListener('change', async () => {
      const p = await lookup(input.value, {
        strict: true
      });
      if (p) onPick?.(p, input.value);
    });
  }
  window.PlaceSearch = {
    index,
    reset,
    suggest,
    lookup,
    attach
  };
})();
