(() => {
  'use strict';
  // Composant « MissionExercise » : déroulé d'un exercice — pistes (tracks) et injects — pour le générateur de brief,
  // le studio (cartes d'exercice) et l'estimation (heure de chaque inject).
  //
  // YAML (helo-xp-mission) :
  //   tracks:   pistes d'exercice (plots, trafics simulés)
  //     - { id: TRACK-401, name: "TRACK 401", nature, points: [{ name, lat, lon }…], level, speed_kt, task }
  //   injects:  déroulé (directeur d'exercice, plastron, contrôleur) — un moment, une forme, un texte
  //     - { id: INJ-1, at: RDV-2 | "H+10", delay_min, kind: info | pli, from, title, text, tracks: [TRACK-401…] }
  //       info : information donnée à l'équipage au moment indiqué (radio, liaison de données) ;
  //       pli  : pli scellé, ouvert par l'équipage au moment indiqué.
  //   phases (briefs successifs B, C…, avec suite de route) sont lues comme des plis.
  //
  // API : MissionExercise.editor(host, yaml, onChange) · parseTracksTable(markdown) · injectsOf(yaml) ·
  //       schedule(yaml) → [{ inject, at (min après décollage) }] · revealed(yaml, injectId) → ids des pistes connues.
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arr = v => Array.isArray(v) ? v : [];

  /** Injects de la mission (phases B, C… comprises, comme plis). */
  function injectsOf(y) {
    const list = arr(y?.injects).map((x, i) => ({ id: x.id || `INJ-${i + 1}`, ...x }));
    for (const p of arr(y?.phases)) list.push({ id: `PART-${p.id}`, at: p.trigger_point || '', delay_min: +p.trigger_delay_min || 0, kind: 'pli', from: '', title: `Partie ${p.id}${p.title ? ' — ' + p.title : ''}`, text: [p.message ? `Message : ${p.message}` : '', p.brief || ''].filter(Boolean).join('\n\n'), trigger: p.trigger || '', phase: p.id });
    return list;
  }
  /** Moment d'un inject en clair : « à RDV-2 », « à RDV-2 + 10 min », « H+10 ». */
  const whenText = x => { const h = /^H\s*\+\s*(\d+)/i.exec(String(x.at || '')); return x.trigger || (h ? `H+${h[1]} min` : x.at ? `à ${x.at}${+x.delay_min ? ` + ${x.delay_min} min` : ''}` : '—'); };
  /** Heure estimée de chaque inject (minutes après le décollage) : route probable (MissionEstimate), passage au point + délai. */
  function schedule(y) {
    let e = null;
    try { e = window.MissionEstimate?.estimate?.(y); } catch { e = null; }
    const at = id => { if (!e?.ok) return null; if (id === 'ORIGIN') return 0; let t = 0; for (const l of e.legs) { t += l.min; if (l.to.id === String(id).toUpperCase()) return t; t += l.task; } return null; };
    return injectsOf(y).map(x => { const h = /^H\s*\+\s*(\d+)/i.exec(String(x.at || '')), t0 = h ? +h[1] : at(x.at); return { inject: x, when: whenText(x), at: t0 == null ? null : Math.round(t0 + (h ? 0 : +x.delay_min || 0)) }; });
  }
  /** Pistes connues après un inject (cumul des injects jusqu'à celui-ci, dans l'ordre chronologique) ; 'all' : toutes. */
  function revealed(y, upTo) {
    const all = arr(y?.tracks).map(t => t.id);
    if (!upTo || upTo === 'all') return all;
    const sch = schedule(y).sort((a, b) => (a.at ?? 1e9) - (b.at ?? 1e9)), out = new Set();
    for (const s of sch) { arr(s.inject.tracks).forEach(t => out.add(String(t))); if (s.inject.id === upTo) break; }
    return all.filter(id => out.has(id));
  }

  /** Tableau Markdown des pistes → tracks. Colonnes reconnues : piste, nature, route / points (« Nom `lat, lon` → … »),
   *  niveau / vitesse (« 3 500–5 000 ft, ~120 kt »), ce qu'il faut établir. */
  function parseTracksTable(md) {
    const rows = String(md || '').split('\n').filter(l => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    if (rows.length < 2) return [];
    const head = rows[0].map(h => h.toLowerCase()), col = re => head.findIndex(h => re.test(h));
    const cId = Math.max(0, col(/piste|track|id/)), cNat = col(/nature|type/), cRoute = col(/route|point|passage/), cLvl = col(/niveau|vitesse|level|speed/), cTask = col(/établir|etablir|task|tâche|attendu/);
    return rows.slice(1).map(r => {
      const name = r[cId].replace(/[*`]/g, ''), route = cRoute >= 0 ? r[cRoute] : '';
      const points = route.split(/→|->|>/).map(seg => { const m = /`?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*`?/.exec(seg); return { name: seg.replace(/`[^`]*`/g, '').replace(/-?\d+\.\d+\s*,\s*-?\d+\.\d+/g, '').trim(), ...(m ? { lat: +m[1], lon: +m[2] } : {}) }; }).filter(p => p.name || Number.isFinite(p.lat));
      const lvl = cLvl >= 0 ? r[cLvl] : '', kt = /~?\s*(\d{2,3})(?:\s*[–-]\s*(\d{2,3}))?\s*kt/i.exec(lvl);
      return { id: name.replace(/\s+/g, '-').toUpperCase(), name, nature: cNat >= 0 ? r[cNat] : '', points, level: lvl.replace(/,?\s*~?\s*\d{2,3}(\s*[–-]\s*\d{2,3})?\s*kt/i, '').trim(), speed_kt: kt ? (kt[2] ? Math.round((+kt[1] + +kt[2]) / 2) : +kt[1]) : null, speed: kt ? kt[0].replace(/^~\s*/, '~') : '', task: cTask >= 0 ? r[cTask] : '' };
    });
  }
  /** Points d'une piste en texte : « Rosnay 46.701667, 1.215278 ; Mézières-en-Brenne 46.821667, 1.211389 ». */
  const pointsText = pts => arr(pts).map(p => [p.name, Number.isFinite(+p.lat) && p.lat !== undefined ? `${p.lat}, ${p.lon}` : ''].filter(Boolean).join(' ')).join(' ; ');
  const parsePoints = txt => String(txt || '').split(';').map(s => s.trim()).filter(Boolean).map(s => { const m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s); return m ? { name: s.slice(0, m.index).trim(), lat: +m[1], lon: +m[2] } : { name: s }; });

  // ---- éditeur (générateur de brief)
  function editor(host, y, onChange) {
    if (!host || !y) return;
    if (!document.getElementById('missionExerciseCss')) {
      const css = document.createElement('style'); css.id = 'missionExerciseCss';
      css.textContent = '.mx table{border-collapse:collapse;width:100%;font-size:13px}.mx td,.mx th{border-bottom:1px solid rgba(127,127,127,.25);padding:3px 4px;vertical-align:top;text-align:left}.mx input,.mx select,.mx textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px}.mx textarea{min-height:4.5em}.mx .mx-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}.mx .mx-row button{width:auto}.mx .mx-small{font-size:12px;opacity:.8}.mx .mx-inj{border:1px solid rgba(127,127,127,.3);border-radius:8px;padding:8px;margin:6px 0}.mx .mx-grid{display:grid;grid-template-columns:110px 120px 80px 110px 1fr 40px;gap:6px;align-items:end}.mx .mx-grid label{display:grid;gap:2px;font-size:12px}@media(max-width:800px){.mx .mx-grid{grid-template-columns:1fr 1fr}}';
      document.head.append(css);
    }
    y.tracks = arr(y.tracks); y.injects = arr(y.injects);
    const pts = [...arr(y.rendezvous), ...arr(y.turning_points), ...arr(y.zones)].map(p => p.id).filter(Boolean);
    const sch = schedule(y), tOf = id => sch.find(s => s.inject.id === id)?.at;
    const hm = m => m == null ? '?' : window.MissionEstimate?.hm?.(m) || `${m} min`;
    host.classList.add('mx');
    host.innerHTML = `<p class="mx-small">Pistes d'exercice (plots, trafics simulés) et déroulé : informations données au moment prévu (« à RDV-2, CYRANO01 transmet… ») ou plis scellés à ouvrir. Les pistes révélées par chaque inject donnent les cartes d'exercice du studio ; le brief PDF place chaque inject sur sa page.</p>
      <h3>Pistes (${y.tracks.length})</h3>
      <table><thead><tr><th>Piste</th><th>Nature</th><th>Points (« Nom lat, lon ; … »)</th><th>Niveau</th><th>Vitesse (kt)</th><th>À établir</th><th></th></tr></thead><tbody>${y.tracks.map((t, i) => `<tr data-t="${i}"><td><input data-k="name" value="${esc(t.name || t.id)}"></td><td><input data-k="nature" value="${esc(t.nature)}"></td><td><input data-k="points" value="${esc(pointsText(t.points))}"></td><td><input data-k="level" value="${esc(t.level)}"></td><td><input data-k="speed_kt" type="number" value="${esc(t.speed_kt ?? '')}"></td><td><input data-k="task" value="${esc(t.task)}"></td><td><button type="button" data-del-t="${i}" title="Retirer">×</button></td></tr>`).join('')}</tbody></table>
      <div class="mx-row"><button type="button" class="secondary" data-add-t>+ Piste</button><details><summary class="mx-small">Importer un tableau Markdown de pistes</summary><textarea data-md placeholder="| Piste | Nature simulée | Route / points de passage | Niveau / vitesse | Ce que … doit établir |"></textarea><button type="button" class="secondary" data-import>Importer (remplace les pistes de même nom)</button></details></div>
      <h3>Déroulé (${y.injects.length})</h3>
      ${y.injects.map((x, i) => `<div class="mx-inj" data-i="${i}"><div class="mx-grid">
        <label>Id<input data-k="id" value="${esc(x.id || `INJ-${i + 1}`)}"></label>
        <label>Moment<input data-k="at" list="mxPoints" value="${esc(x.at || '')}" placeholder="RDV-2 ou H+10"></label>
        <label>+ min<input data-k="delay_min" type="number" value="${esc(x.delay_min ?? '')}"></label>
        <label>Forme<select data-k="kind"><option value="info"${x.kind !== 'pli' ? ' selected' : ''}>information</option><option value="pli"${x.kind === 'pli' ? ' selected' : ''}>pli scellé</option></select></label>
        <label>Titre<input data-k="title" value="${esc(x.title || '')}"></label>
        <button type="button" data-del-i="${i}" title="Retirer">×</button></div>
        <div class="mx-grid" style="grid-template-columns:160px 1fr"><label>Émetteur<input data-k="from" value="${esc(x.from || '')}" placeholder="CYRANO01, directeur…"></label><label>Pistes révélées<input data-k="tracks" value="${esc(arr(x.tracks).join(', '))}" placeholder="${esc(y.tracks.map(t => t.id).join(', '))}"></label></div>
        <label class="mx-small">Texte (${x.kind === 'pli' ? 'contenu du pli' : 'information transmise'}) — heure estimée : T + ${hm(tOf(x.id || `INJ-${i + 1}`))}<textarea data-k="text">${esc(x.text || '')}</textarea></label></div>`).join('')}
      <datalist id="mxPoints">${pts.map(p => `<option value="${esc(p)}">`).join('')}<option value="ORIGIN"><option value="H+10"></datalist>
      <div class="mx-row"><button type="button" class="secondary" data-add-i>+ Inject</button>${arr(y.phases).length ? `<span class="mx-small">${arr(y.phases).length} partie(s) successive(s) (phases) comptées comme plis.</span>` : ''}</div>`;
    const changed = redraw => { onChange?.(); if (redraw) editor(host, y, onChange); };
    host.querySelectorAll('[data-t] [data-k]').forEach(el => el.onchange = () => {
      const t = y.tracks[+el.closest('[data-t]').dataset.t], k = el.dataset.k;
      if (k === 'points') t.points = parsePoints(el.value);
      else if (k === 'speed_kt') t.speed_kt = el.value === '' ? null : +el.value;
      else if (k === 'name') { t.name = el.value; t.id = el.value.trim().replace(/\s+/g, '-').toUpperCase(); }
      else t[k] = el.value;
      changed(false);
    });
    host.querySelectorAll('[data-i] [data-k]').forEach(el => el.onchange = () => {
      const x = y.injects[+el.closest('[data-i]').dataset.i], k = el.dataset.k;
      if (k === 'tracks') x.tracks = el.value.split(/[,;\s]+/).filter(Boolean).map(s => s.toUpperCase());
      else if (k === 'delay_min') x.delay_min = el.value === '' ? 0 : +el.value;
      else x[k] = el.value;
      changed(k === 'kind' || k === 'at' || k === 'delay_min');
    });
    host.querySelectorAll('[data-del-t]').forEach(b => b.onclick = () => { y.tracks.splice(+b.dataset.delT, 1); changed(true); });
    host.querySelectorAll('[data-del-i]').forEach(b => b.onclick = () => { y.injects.splice(+b.dataset.delI, 1); changed(true); });
    host.querySelector('[data-add-t]').onclick = () => { y.tracks.push({ id: `TRACK-${y.tracks.length + 1}`, name: `TRACK ${y.tracks.length + 1}`, nature: '', points: [], level: '', speed_kt: null, task: '' }); changed(true); };
    host.querySelector('[data-add-i]').onclick = () => { y.injects.push({ id: `INJ-${y.injects.length + 1}`, at: '', delay_min: 0, kind: 'info', from: '', title: '', text: '', tracks: [] }); changed(true); };
    host.querySelector('[data-import]').onclick = () => {
      const list = parseTracksTable(host.querySelector('[data-md]').value);
      for (const t of list) { const i = y.tracks.findIndex(x => x.id === t.id); i >= 0 ? y.tracks[i] = { ...y.tracks[i], ...t } : y.tracks.push(t); }
      changed(true);
    };
  }

  window.MissionExercise = { editor, parseTracksTable, injectsOf, schedule, revealed, whenText, pointsText };
})();
