(() => {
  'use strict';
  // Modification des missions depuis les tableaux des reportings, et fusion / renommage
  // d'appareils et de membres d'équipage.
  //
  // Cohérence : une seule source (registre unique missions.yaml). Le reporting général et les
  // reportings de famille lisent les mêmes objets mission ; une modification en grille change
  // l'unique exemplaire, avec les mêmes traitements que la page de CR (majuscules, indicatif
  // découpé, immatriculation « F-ZBMM », contrôles) et une trace (mission.history).
  //
  // Durées (vol, bloc) modifiées sans les heures :
  //   1. heures de début et de fin connues : la fin est déplacée (atterrissage = décollage + durée),
  //      les événements de la chronologie suivent ;
  //   2. seul le début (ou la fin) est connu : l'autre heure est créée ;
  //   3. aucune heure : durée « déclarée » (timeline.declared), comptée dans les statistiques,
  //      affichée « ≈ », signalée par le contrôle des données, remplacée dès que les heures
  //      sont saisies dans le CR.
  const M = window.MissionModel;
  const up = v => String(v ?? '').trim().toUpperCase();
  const key = v => up(v).replace(/[^A-Z0-9]/g, '');
  const minutes = t => M.minutes(t);
  const hhmm = n => { n = ((Math.round(n) % 1440) + 1440) % 1440; return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };
  // « 1h30 », « 1:30 », « 90 » (minutes), « 1,5h » → minutes.
  function parseDuration(text) {
    const s = String(text ?? '').trim().toLowerCase().replace(',', '.'); if (!s) return null;
    let m = /^(\d+)\s*[h:]\s*(\d{1,2})?\s*(min)?$/.exec(s); if (m) return Number(m[1]) * 60 + Number(m[2] || 0);
    m = /^(\d+(?:\.\d+)?)\s*h$/.exec(s); if (m) return Math.round(Number(m[1]) * 60);
    m = /^(\d+)\s*(min)?$/.exec(s); if (m) return Number(m[1]);
    return NaN;
  }
  // Déplace l'événement de chronologie associé (heure locale, et UTC du même écart).
  function moveEvent(mission, field, value) {
    const e = (mission.events || []).find(x => x.source === `timeline.${field}`); if (!e) return;
    const before = minutes(e.timeLocal), after = minutes(value);
    e.timeLocal = value;
    if (before != null && after != null && minutes(e.timeUtc) != null) e.timeUtc = hhmm(minutes(e.timeUtc) + after - before);
  }
  function setDuration(mission, pairs, declaredKey, total) {
    const t = mission.timeline || (mission.timeline = {});
    const [start, end] = pairs.find(([a, b]) => t[a] || t[b]) || pairs[0];
    if (t[start]) { const v = hhmm(minutes(t[start]) + total); t[end] = v; moveEvent(mission, end, v); }
    else if (t[end]) { const v = hhmm(minutes(t[end]) - total); t[start] = v; moveEvent(mission, start, v); }
    else { t.declared = { ...(t.declared || {}), [declaredKey]: total }; return 'declared'; }
    if (t.declared) { delete t.declared[declaredKey]; if (!Object.keys(t.declared).length) delete t.declared; }
    return 'times';
  }
  // Indicatif complet d'après la table de correspondance (forme plan de vol, autres formes).
  const canonical = prefix => {
    if (window.MissionAircraft?.canonicalPrefix) return window.MissionAircraft.canonicalPrefix(prefix);
    const entry = (window.MissionVocab?.callsignTable || []).find(e => [e.prefix, e.fpl, ...(e.aliases || [])].map(key).includes(key(prefix)));
    return entry ? entry.prefix : up(prefix);
  };
  const EDITABLE = ['date', 'missionId', 'series', 'registration', 'callsign', 'outcome', 'dep', 'arr', 'flight', 'block'];
  // Valeur actuelle d'un champ éditable (affichage des cellules).
  function valueOf(mission, field) {
    const a = mission.aircraft?.[0] || {}, s = M.computeStatistics(mission);
    return { date: mission.metadata?.date, missionId: mission.metadata?.missionId, series: mission.series, registration: a.registration, callsign: a.callsign, outcome: mission.results?.outcome,
      dep: mission.navigation?.dep || a.baseDeparture, arr: mission.navigation?.arr, flight: s.flightMinutes, block: s.blockMinutes }[field] ?? '';
  }
  function apply(mission, field, raw) {
    if (mission.__readOnly) return { error: 'readOnly' };
    const before = valueOf(mission, field); let value = String(raw ?? '').trim(), note = '';
    const a = mission.aircraft?.[0] || (mission.aircraft = [M.emptyAircraft()])[0];
    switch (field) {
      case 'date': if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: 'date' }; mission.metadata.date = value; break;
      case 'missionId': mission.metadata.missionId = up(value); break;
      case 'series': mission.series = value; break;
      case 'registration': a.registration = M.formatRegistration(value); break;
      case 'callsign': {
        // Comme dans le CR : forme plan de vol ou variante ramenée à l'indicatif complet (DRAGO74 → DRAGON74).
        const p = M.splitCallsign(value), prefix = canonical(p.prefix), fpl = key(value);
        a.callsignPrefix = prefix; a.callsignNumber = p.number; a.callsign = M.joinCallsign(prefix, p.number);
        if (fpl && fpl.length <= 7 && fpl !== key(a.callsign)) a.callsignFpl = fpl;
        break;
      }
      case 'outcome': mission.results = { ...(mission.results || {}), outcome: value }; break;
      case 'dep': mission.navigation = { ...(mission.navigation || {}), dep: up(value) }; break;
      case 'arr': mission.navigation = { ...(mission.navigation || {}), arr: up(value) }; break;
      case 'flight': case 'block': {
        const total = parseDuration(value); if (total == null || !Number.isFinite(total) || total < 0) return { error: 'duration' };
        note = field === 'flight' ? setDuration(mission, [['takeoff', 'landing']], 'flightMinutes', total) : setDuration(mission, [['offBlock', 'onBlock'], ['engineStart', 'shutdown']], 'blockMinutes', total);
        break;
      }
      default: return { error: 'field' };
    }
    M.upperText(mission);
    const after = valueOf(mission, field);
    if (String(before) === String(after)) return { changed: false };
    (mission.history ||= []).push({ at: new Date().toISOString(), field, from: before, to: after, via: 'reporting', ...(note ? { note } : {}) });
    mission.statistics = M.computeStatistics(mission);
    return { changed: true, note };
  }

  // ---- fusion / renommage (appareil : immatriculation ; équipage : nom / trigramme)
  const MAP_KEY = 'missionMergeMap:v1';
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const mergeMap = () => ({ aircraft: {}, crew: {}, ...(read(MAP_KEY) || {}) });
  // Équivalences mémorisées (journal DEFA rechargé, référence, catalogue) : A → B.
  // Chaîne A → B → C suivie jusqu'au bout ; une boucle (A → B puis B → A) est arrêtée au premier
  // retour : elle ne fait plus « échanger » deux noms (bug GRR / RBR).
  const resolve = (m, k) => { const seen = new Set([k]); let r = k; while (m[r] && !seen.has(m[r])) { r = m[r]; seen.add(r); } return r; };
  const loops = m => Object.keys(m).filter(k => { const seen = new Set([k]); let r = k; while (m[r]) { r = m[r]; if (seen.has(r)) return true; seen.add(r); } return false; });
  const mapAircraft = reg => { const m = mergeMap().aircraft; return m[key(reg)] ? resolve(m, key(reg)) : reg; };
  const mapCrew = name => resolve(mergeMap().crew, up(name));
  function affected(kind, from) {
    const missions = window.MissionLedger?.store?.missions || [];
    return missions.filter(m => kind === 'aircraft' ? (m.aircraft || []).some(a => key(a.registration) === key(from)) : (m.crew || []).some(c => up(c.name) === up(from)));
  }
  async function rename(kind, from, to) {
    const target = kind === 'aircraft' ? M.formatRegistration(to) : up(to);
    if (!key(from) || !key(target) || key(from) === key(target)) return { count: 0 };
    const list = affected(kind, from), at = new Date().toISOString();
    list.forEach(m => {
      if (kind === 'aircraft') (m.aircraft || []).forEach(a => { if (key(a.registration) === key(from)) a.registration = target; });
      else (m.crew || []).forEach(c => { if (up(c.name) === up(from)) c.name = target; });
      (m.history ||= []).push({ at, field: kind === 'aircraft' ? 'registration' : 'crew', from: kind === 'aircraft' ? M.formatRegistration(from) : up(from), to: target, via: 'merge' });
    });
    // Équivalence mémorisée (données rechargées plus tard : journal DEFA, référence).
    // Équivalence : les entrées contraires (cible → … → source) sont retirées, tout ce qui menait à la
    // source mène désormais à la cible — renommer GRR en RBR après une fusion RBR → GRR fonctionne.
    const map = mergeMap(), m = map[kind], mFrom = kind === 'aircraft' ? key(from) : up(from), mTo = kind === 'aircraft' ? key(target) : target;
    for (let r = mTo, guard = 0; m[r] && guard < 50; guard++) { const next = m[r]; if (next === mFrom || resolve(m, next) === mFrom) { delete m[r]; break; } r = next; }
    if (m[mTo] === mFrom) delete m[mTo];
    for (const k of Object.keys(m)) if (m[k] === mFrom) m[k] = mTo;
    m[mFrom] = mTo; localStorage.setItem(MAP_KEY, JSON.stringify(map));
    // Fiches : celle de la source complète celle de la cible (événements concaténés).
    const sheetKey = kind === 'aircraft' ? 'missionAircraftSheets:v1' : 'missionCrewSheets:v1', sheets = read(sheetKey) || {};
    const sk = kind === 'aircraft' ? key(from) : up(from), tk = kind === 'aircraft' ? key(target) : target;
    if (sheets[sk]) {
      const src = sheets[sk], dst = sheets[tk] || {};
      Object.entries(src).forEach(([k, v]) => { if (k === 'events') dst.events = [...(dst.events || []), ...(v || [])]; else if (v && !dst[k]) dst[k] = v; });
      if (kind === 'aircraft') dst.registration = target; sheets[tk] = dst; delete sheets[sk]; localStorage.setItem(sheetKey, JSON.stringify(sheets));
    }
    // Appareils des missions (registre local) : clé déplacée.
    if (kind === 'aircraft') { const reg = read('missionAircraftRegistry:v1') || {}; if (reg[key(from)]) { reg[key(target)] = { ...reg[key(from)], ...(reg[key(target)] || {}), registration: target }; delete reg[key(from)]; localStorage.setItem('missionAircraftRegistry:v1', JSON.stringify(reg)); } }
    if (list.length) await window.MissionLedger.save();
    return { count: list.length, target };
  }

  // Suppression d'une équivalence (Paramétrage › Fusions et renommages).
  function unmerge(kind, from) { const map = mergeMap(); delete map[kind][kind === 'aircraft' ? key(from) : up(from)]; localStorage.setItem(MAP_KEY, JSON.stringify(map)); }

  // Cellule éditable (mode « modifier dans le tableau ») : champ lié à la ligne (data-uid).
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dur = v => v == null || v === '' ? '' : `${Math.floor(v / 60)}h${String(Math.round(v % 60)).padStart(2, '0')}`;
  function input(field, mission, uid, { series = [], outcomes = [], label = o => o.label?.[0] || o.value } = {}) {
    if (mission.__readOnly) return null; // journal DEFA : lecture seule
    const v = valueOf(mission, field), at = `data-edit="${field}" data-uid="${uid}"`;
    if (field === 'series' || field === 'outcome') {
      const list = field === 'series' ? series : outcomes;
      return `<select class="ge-input" ${at}><option value="">—</option>${list.map(o => `<option value="${esc(o.value)}"${o.value === v ? ' selected' : ''}>${esc(label(o))}</option>`).join('')}${v && !list.some(o => o.value === v) ? `<option selected>${esc(v)}</option>` : ''}</select>`;
    }
    if (field === 'date') return `<input class="ge-input" type="date" ${at} value="${esc(v)}">`;
    if (field === 'flight' || field === 'block') { const declared = mission.timeline?.declared?.[field === 'flight' ? 'flightMinutes' : 'blockMinutes'] != null; return `<input class="ge-input ge-dur${declared ? ' ge-declared' : ''}" ${at} value="${esc(dur(v))}" placeholder="1h30" size="5" title="${declared ? '≈ durée déclarée (sans heures)' : '1h30, 1:30 ou 90'}">`; }
    return `<input class="ge-input" ${at} value="${esc(v)}" size="${field === 'missionId' ? 12 : 8}">`;
  }
  // Style commun des cellules éditables (injecté une fois).
  if (!document.getElementById('ge-style')) document.head.insertAdjacentHTML('beforeend', '<style id="ge-style">.ge-input{font:inherit;font-size:12px;padding:3px 5px;border:1px solid #f59e0b;border-radius:6px;background:#fffbeb;color:#111827;max-width:150px}.ge-input.ge-dur{width:62px}.ge-declared{border-style:dashed;font-style:italic}.ge-toggle{margin-left:10px;font-size:12px;padding:3px 10px;border-radius:7px;border:1px solid #f59e0b;background:transparent;color:inherit;cursor:pointer}.ge-toggle.on{background:#f59e0b;color:#111827}.ge-route{display:inline-flex;gap:3px;align-items:center}</style>');

  window.MissionGridEdit = { input, EDITABLE, apply, valueOf, parseDuration, rename, unmerge, affected, mergeMap, mapAircraft, mapCrew, resolve, loops };
})();
