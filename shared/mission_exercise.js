(() => {
  'use strict';
  // Composant « MissionExercise » : exercice d'une opération — heure H commune, participants (les missions A, B, C…),
  // chiffons (pistes jouées ou simulées) et chronologie des événements (messages radio, plis scellés), avec leurs
  // destinataires. Utilisé par le générateur de brief (édition, PDF par destinataire), le studio (cartes par
  // destinataire) et le registre (résumé de l'opération).
  //
  // Stockage : la mission d'ORGANISATION de l'opération, identifiant <lettre>-<nnn>Z (I-001Z, M-001Z…), porte le bloc
  //   exercise:
  //     h_hour: "H"                          heure de référence commune (libellé ; heure réelle facultative : « 14:00Z »)
  //     participants:                        les équipages de l'opération
  //       - { callsign: CYRANO01, mission: I-001A, takeoff: "H+0", role: "…" }     décollage par rapport à H
  //     tracks:                              chiffons : pistes d'exercice à reconnaître, intercepter, escorter…
  //       - { id: TRACK-401, name, nature, played: true|false, callsign, start: "H+60", points: [{ name, lat, lon }…],
  //           level, speed_kt, task (ce que les équipages doivent établir), conduct (consignes du chiffon joué) }
  //     events:                              chronologie de l'exercice
  //       - { id: EV-1, at: "H+60" | <id de point>, by: <participant qui passe le point>, delay_min,
  //           kind: radio | pli, from: CYRANO01, to: [RAFALE31] | [ALL], title, text, reveals: [TRACK-401…] }
  //         radio : message passé par l'organisation (ou l'émetteur) au moment indiqué ;
  //         pli   : pli scellé remis avant le vol, ouvert par le destinataire au moment indiqué.
  // Les missions A, B, C… gardent chacune leur vol ; l'exercice les retrouve par operation.id.
  // Anciennes missions : tracks / injects / phases dans la mission elle-même → lus comme un exercice à un participant.
  //
  // API : of(yaml, docs) · isOrganisation(yaml) · organisationId(opId) · audiences(ex) · timeline(ex, docs) ·
  //       eventsFor(tl, audience) · revealedFor(ex, tl, audience, upTo) · editor(host, yaml, { docs, onChange }) ·
  //       crewPanel(host, yaml, docs) · fromLegacy(yaml) · compatibilité : schedule(y) · revealed(y, id) · injectsOf(y)
  //       · whenText(x) · pointsText(pts) · parseTracksTable(md).
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  const arr = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
  const up = v => String(v ?? '').trim().toUpperCase();
  const yamlOf = d => d?.yaml || d || {};
  const hm = m => m == null ? '?' : window.MissionEstimate?.hm?.(Math.abs(m)) || `${Math.abs(m)} min`;
  /** « H+60 », « H-15 », « H » → minutes par rapport à H ; null si ce n'est pas une heure H. */
  const parseH = s => {
    const m = /^\s*H\s*(?:([+\-−])\s*(\d+))?\s*(?:min)?\s*$/i.exec(String(s ?? ''));
    return m ? (m[1] ? (m[1] === '+' ? 1 : -1) * +m[2] : 0) : null;
  };
  /** Minutes → « H+60 » / « H−15 » / « H ». */
  const hText = m => m == null ? 'H+?' : m === 0 ? 'H' : `H${m > 0 ? '+' : '−'}${Math.abs(Math.round(m))}`;

  // ---- identité de la mission d'organisation
  /** Mission d'organisation : identifiant en Z (I-001Z) ou mission.role « organisation », ou bloc exercise. */
  const isOrganisation = y => /Z$/i.test(String(y?.mission?.id || '')) || /organi/i.test(String(y?.mission?.role || '')) || !!y?.exercise;
  /** Identifiant de la mission d'organisation d'une opération : I-001 → I-001Z. */
  const organisationId = op => `${String(op || '').replace(/[A-Z]$/i, '').replace(/Z$/i, '')}Z`;

  // ---- lecture
  function normalize(ex, owner) {
    const e = {
      h_hour: ex.h_hour || 'H',
      legacy: !!ex.legacy,
      owner: String(owner?.mission?.id || ''),
      operation: String(owner?.operation?.id || '')
    };
    e.participants = arr(ex.participants).filter(Boolean).map(p => ({
      callsign: up(p.callsign || p.name || p.mission),
      mission: up(p.mission),
      takeoff: p.takeoff ?? 'H',
      role: p.role || ''
    }));
    e.tracks = arr(ex.tracks).filter(Boolean).map((t, i) => ({
      ...t,
      id: up(t.id || t.name || `TRACK-${i + 1}`),
      name: t.name || t.id || `TRACK ${i + 1}`,
      played: !!t.played,
      points: arr(t.points)
    }));
    e.events = arr(ex.events).filter(Boolean).map((x, i) => ({
      ...x,
      id: up(x.id || `EV-${i + 1}`),
      kind: /pli|seal/i.test(x.kind || '') ? 'pli' : 'radio',
      to: arr(x.to).map(up).filter(Boolean),
      reveals: arr(x.reveals ?? x.tracks).map(up).filter(Boolean),
      by: up(x.by),
      at: String(x.at ?? ''),
      delay_min: +x.delay_min || 0
    }));
    return e;
  }
  /** Ancienne mission (pistes, injects, phases dans la mission) → exercice à un seul participant. */
  function fromLegacy(y) {
    const cs = up(arr(y.aircraft)[0]?.callsign || arr(y.teams)[0]?.name || y.mission?.id || 'EQUIPAGE');
    const events = arr(y.injects).map((x, i) => ({
      id: x.id || `INJ-${i + 1}`,
      at: x.at,
      by: cs,
      delay_min: x.delay_min,
      kind: /pli/i.test(x.kind || '') ? 'pli' : 'radio',
      from: x.from || '',
      to: [cs],
      title: x.title || '',
      text: x.text || '',
      reveals: x.tracks
    }));
    for (const p of arr(y.phases)) events.push({
      id: `PART-${p.id}`,
      at: p.trigger_point || 'ORIGIN',
      by: cs,
      delay_min: +p.trigger_delay_min || 0,
      kind: 'pli',
      from: '',
      to: [cs],
      title: `Partie ${p.id}${p.title ? ' — ' + p.title : ''}`,
      text: [p.message ? `Message : ${p.message}` : '', p.brief || ''].filter(Boolean).join('\n\n'),
      trigger: p.trigger || '',
      phase: p.id
    });
    return normalize({
      legacy: true,
      h_hour: 'H',
      participants: [{
        callsign: cs,
        mission: y.mission?.id,
        takeoff: 'H'
      }],
      tracks: y.tracks,
      events
    }, y);
  }
  /** Exercice d'une mission : le sien (organisation), celui de l'organisation de son opération (docs : lot, registre),
   *  sinon l'ancien format ; null si la mission n'appartient à aucun exercice. */
  function of(y, docs = []) {
    y = yamlOf(y);
    if (y.exercise) return normalize(y.exercise, y);
    const op = String(y.operation?.id || ''),
      z = op && arr(docs).map(yamlOf).find(d => d?.exercise && String(d.operation?.id || '') === op);
    if (z) return normalize(z.exercise, z);
    if (arr(y.tracks).length || arr(y.injects).length || arr(y.phases).length) return fromLegacy(y);
    return null;
  }

  // ---- destinataires
  /** Organisation, puis un par participant (équipage), puis un par chiffon JOUÉ. */
  function audiences(ex) {
    if (!ex) return [];
    return [{
        id: 'ORG',
        kind: 'org',
        label: 'Organisation'
      },
      ...ex.participants.map(p => ({
        id: p.callsign,
        kind: 'crew',
        mission: p.mission,
        label: p.callsign
      })),
      ...ex.tracks.filter(t => t.played).map(t => ({
        id: t.id,
        kind: 'chiffon',
        label: t.callsign ? `${t.callsign} (${t.name})` : t.name
      }))
    ];
  }
  /** Participant d'une mission (par son identifiant). */
  const participantOf = (ex, missionId) => ex?.participants.find(p => p.mission === up(missionId)) || null;

  // ---- chronologie : minutes par rapport à H
  /** Passage d'un point par la route probable d'une mission (MissionEstimate) : minutes après son décollage. */
  function passage(y, pointId) {
    let e = null;
    try {
      e = window.MissionEstimate?.estimate?.(y);
    } catch {
      e = null;
    }
    if (!e?.ok) return null;
    const id = up(pointId);
    if (id === 'ORIGIN' || id === 'DEPART') return 0;
    let t = 0;
    for (const l of e.legs) {
      t += l.min;
      if (up(l.to.id) === id) return t;
      t += l.task;
    }
    return null;
  }
  /** Moment d'un événement en clair : « H+60 », « RDV-2 (RAFALE31) + 5 min ». */
  const whenOf = x => {
    const h = parseH(x.at);
    if (h != null) return hText(h);
    return x.trigger || `${x.at || '?'}${x.by ? ` (${x.by})` : ''}${+x.delay_min ? ` + ${x.delay_min} min` : ''}`;
  };
  /** Événements triés, avec t (minutes par rapport à H, null si inconnu). docs : missions de l'opération (lot, registre). */
  function timeline(ex, docs = []) {
    if (!ex) return [];
    const ys = arr(docs).map(yamlOf),
      missionYaml = id => ys.find(d => up(d.mission?.id) === up(id));
    const offset = p => parseH(p?.takeoff) ?? 0;
    const hasPoint = (y, id) => [...arr(y?.turning_points), ...arr(y?.rendezvous), ...arr(y?.zones), y?.target].some(q => q && up(q.id) === up(id));
    return ex.events.map(x => {
      const h = parseH(x.at);
      let t = null;
      if (h != null) t = h;
      else {
        const p = ex.participants.find(q => q.callsign === x.by) || ex.participants.find(q => hasPoint(missionYaml(q.mission), x.at)) || (ex.legacy ? ex.participants[0] : null);
        const y = p && missionYaml(p.mission),
          s = y && passage(y, x.at);
        if (s != null) t = offset(p) + s + (+x.delay_min || 0);
      }
      return {
        ...x,
        t: t == null ? null : Math.round(t),
        when: whenOf(x)
      };
    }).sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9));
  }
  /** Événements d'un destinataire : organisation → tous ; sinon ceux qui lui sont adressés (ou à tous). */
  const eventsFor = (tl, audience) => audience === 'ORG' ? tl : tl.filter(x => x.to.includes(up(audience)) || x.to.includes('ALL') || x.to.includes('TOUS'));
  /** Pistes connues d'un destinataire après l'événement upTo ('all' : toutes celles qui lui sont révélées ; 'ORG' voit tout). */
  function revealedFor(ex, tl, audience, upTo = 'all') {
    if (!ex) return [];
    if (audience === 'ORG' && upTo === 'all') return ex.tracks.map(t => t.id);
    const out = new Set();
    for (const x of eventsFor(tl, audience)) {
      x.reveals.forEach(r => out.add(r));
      if (x.id === up(upTo)) break;
    }
    return ex.tracks.map(t => t.id).filter(id => out.has(id));
  }

  // ---- compatibilité (anciens appels : une mission, pistes et injects dans la mission)
  const injectsOf = y => {
    const ex = of(y);
    return ex ? ex.events.map(x => ({
      ...x,
      tracks: x.reveals
    })) : [];
  };
  const whenText = x => whenOf(x);

  function schedule(y, docs) {
    const ex = of(y, docs),
      tl = timeline(ex, [yamlOf(y), ...arr(docs)]);
    return tl.map(x => ({
      inject: {
        ...x,
        tracks: x.reveals
      },
      when: x.when,
      at: x.t
    }));
  }

  function revealed(y, upTo, docs) {
    const ex = of(y, docs);
    if (!ex) return [];
    const tl = timeline(ex, [yamlOf(y), ...arr(docs)]),
      me = participantOf(ex, yamlOf(y).mission?.id);
    return upTo === 'all' || !upTo ? (isOrganisation(yamlOf(y)) || !me ? ex.tracks.map(t => t.id) : revealedFor(ex, tl, me.callsign)) : revealedFor(ex, tl, me && !isOrganisation(yamlOf(y)) ? me.callsign : 'ORG', upTo);
  }

  // ---- saisie
  /** Tableau Markdown des pistes → tracks. Colonnes reconnues : piste, nature, route / points (« Nom `lat, lon` → … »),
   *  niveau / vitesse (« 3 500–5 000 ft, ~120 kt »), ce qu'il faut établir. */
  function parseTracksTable(md) {
    const rows = String(md || '').split('\n').filter(l => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    if (rows.length < 2) return [];
    const head = rows[0].map(h => h.toLowerCase()),
      col = re => head.findIndex(h => re.test(h));
    const cId = Math.max(0, col(/piste|track|id/)),
      cNat = col(/nature|type/),
      cRoute = col(/route|point|passage/),
      cLvl = col(/niveau|vitesse|level|speed/),
      cTask = col(/établir|etablir|task|tâche|attendu/);
    return rows.slice(1).map(r => {
      const name = r[cId].replace(/[*`]/g, ''),
        route = cRoute >= 0 ? r[cRoute] : '';
      const points = route.split(/→|->|>/).map(seg => {
        const m = /`?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*`?/.exec(seg);
        return {
          name: seg.replace(/`[^`]*`/g, '').replace(/-?\d+\.\d+\s*,\s*-?\d+\.\d+/g, '').trim(),
          ...(m ? {
            lat: +m[1],
            lon: +m[2]
          } : {})
        };
      }).filter(p => p.name || Number.isFinite(p.lat));
      const lvl = cLvl >= 0 ? r[cLvl] : '',
        kt = /~?\s*(\d{2,3})(?:\s*[–-]\s*(\d{2,3}))?\s*kt/i.exec(lvl);
      return {
        id: name.replace(/\s+/g, '-').toUpperCase(),
        name,
        nature: cNat >= 0 ? r[cNat] : '',
        played: false,
        start: '',
        points,
        level: lvl.replace(/,?\s*~?\s*\d{2,3}(\s*[–-]\s*\d{2,3})?\s*kt/i, '').trim(),
        speed_kt: kt ? (kt[2] ? Math.round((+kt[1] + +kt[2]) / 2) : +kt[1]) : null,
        task: cTask >= 0 ? r[cTask] : ''
      };
    });
  }
  /** Points d'une piste en texte : « Rosnay 46.701667, 1.215278 ; Mézières-en-Brenne 46.821667, 1.211389 ». */
  const pointsText = pts => arr(pts).map(p => [p.name, Number.isFinite(+p.lat) && p.lat !== undefined ? `${p.lat}, ${p.lon}` : ''].filter(Boolean).join(' ')).join(' ; ');
  const parsePoints = txt => String(txt || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s);
    return m ? {
      name: s.slice(0, m.index).trim(),
      lat: +m[1],
      lon: +m[2]
    } : {
      name: s
    };
  });

  const CSS = `.mx{--mx-line:rgba(127,127,127,.3)}.mx h3{margin:14px 0 4px}.mx .mx-help{font-size:12px;opacity:.8;margin:2px 0 8px}
.mx table{border-collapse:collapse;width:100%;font-size:13px}.mx td,.mx th{border-bottom:1px solid var(--mx-line);padding:3px 4px;vertical-align:top;text-align:left}
.mx input,.mx select,.mx textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px}.mx input[type=checkbox]{width:auto}.mx textarea{min-height:4.5em}
.mx .mx-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}.mx .mx-row button{width:auto}
.mx .mx-ev{border:1px solid var(--mx-line);border-left:4px solid #1565c0;border-radius:8px;padding:8px 10px;margin:8px 0}.mx .mx-ev.pli{border-left-color:#8e24aa}
.mx .mx-ev-head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-weight:650;margin-bottom:6px}.mx .mx-t{font-variant-numeric:tabular-nums;min-width:5.5em}
.mx .mx-kind{font-size:11px;letter-spacing:.06em;border-radius:999px;padding:1px 8px;background:#1565c0;color:#fff}.mx .pli .mx-kind{background:#8e24aa}
.mx .mx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 10px;align-items:end}.mx .mx-grid label,.mx label.mx-full{display:grid;gap:2px;font-size:12px}
.mx .mx-chips{display:flex;gap:6px;flex-wrap:wrap}.mx .mx-chip{display:inline-flex;gap:4px;align-items:center;border:1px solid var(--mx-line);border-radius:999px;padding:2px 9px;font-size:12px;cursor:pointer}
.mx .mx-chip:has(input:checked){border-color:#1565c0;background:rgba(21,101,192,.12)}.mx .mx-del{width:auto;padding:2px 8px}
.mx .mx-aud{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}.mx .mx-aud div{border:1px solid var(--mx-line);border-radius:8px;padding:6px 9px;font-size:13px}
.mx .mx-warn{color:#b45309;font-size:12px}`;

  function css() {
    if (document.getElementById('missionExerciseCss')) return;
    const s = document.createElement('style');
    s.id = 'missionExerciseCss';
    s.textContent = CSS;
    document.head.append(s);
  }
  const chip = (name, value, on, label) => `<label class="mx-chip"><input type="checkbox" data-${name}="${esc(value)}"${on ? ' checked' : ''}><span>${esc(label)}</span></label>`;

  /** Éditeur de l'exercice dans la mission d'organisation y (bloc exercise créé au besoin). docs : missions de l'opération
   *  (pour les participants, les points et les heures) ; onChange : après chaque modification. */
  function editor(host, y, {
    docs = [],
    onChange
  } = {}) {
    if (!host || !y) return;
    css();
    const X = y.exercise = y.exercise && typeof y.exercise === 'object' ? y.exercise : {};
    X.h_hour = X.h_hour || 'H';
    X.participants = arr(X.participants);
    X.tracks = arr(X.tracks);
    X.events = arr(X.events);
    const ys = arr(docs).map(yamlOf).filter(d => d?.mission?.id && !isOrganisation(d));
    const ex = normalize(X, y),
      tl = timeline(ex, ys),
      tOf = id => tl.find(e => e.id === up(id))?.t;
    const aud = audiences(ex).filter(a => a.kind !== 'org');
    // points proposés comme déclencheurs : ceux des missions des participants (id → participants qui le passent)
    const points = new Map();
    for (const p of ex.participants) {
      const m = ys.find(d => up(d.mission.id) === p.mission);
      for (const q of [...arr(m?.turning_points), ...arr(m?.rendezvous), ...arr(m?.zones), m?.target].filter(Boolean))
        if (q.id) points.set(up(q.id), [...(points.get(up(q.id)) || []), p.callsign]);
    }
    const missingMissions = arr(y.operation?.missions).map(up).filter(id => !ys.some(d => up(d.mission.id) === id));
    host.classList.add('mx');
    host.innerHTML = `
      <h3>Heure H et participants</h3>
      <p class="mx-help">Heure de référence commune à toute l’opération ; chaque participant décolle à H plus ou moins un délai. Les événements se placent à H+… ou au passage d’un point par un participant.</p>
      <div class="mx-grid" style="max-width:420px"><label>Heure H (libellé ou heure réelle)<input data-h value="${esc(X.h_hour)}" placeholder="H, 14:00Z…"></label></div>
      <table><thead><tr><th>Indicatif</th><th>Mission</th><th>Décollage (H±min)</th><th>Rôle</th><th></th></tr></thead><tbody>${X.participants.map((p, i) => `<tr data-p="${i}"><td><input data-k="callsign" value="${esc(p.callsign)}"></td><td><input data-k="mission" value="${esc(p.mission)}"></td><td><input data-k="takeoff" value="${esc(p.takeoff ?? 'H')}" placeholder="H, H+10, H-15"></td><td><input data-k="role" value="${esc(p.role)}"></td><td><button type="button" class="secondary mx-del" data-del-p="${i}" title="Retirer">×</button></td></tr>`).join('')}</tbody></table>
      <div class="mx-row"><button type="button" class="secondary" data-add-p>+ Participant</button>${ys.length ? `<button type="button" class="secondary" data-fill-p>Reprendre les missions de l’opération</button>` : ''}${missingMissions.length ? `<span class="mx-warn">Missions de l’opération non chargées : ${esc(missingMissions.join(', '))} (heures des passages de points inconnues).</span>` : ''}</div>

      <h3>Chiffons</h3>
      <p class="mx-help">Pistes d’exercice que les équipages doivent reconnaître, intercepter ou escorter. Un chiffon « joué » est piloté par un joueur : il reçoit sa carte, son heure de départ et ses consignes ; un chiffon simulé n’est que dessiné.</p>
      <table><thead><tr><th>Nom</th><th>Joué</th><th>Indicatif</th><th>Départ (H+min)</th><th>Nature</th><th>Points (« Nom lat, lon ; … »)</th><th>Niveau</th><th>Vitesse (kt)</th><th>À établir par les équipages</th><th>Consignes du chiffon</th><th></th></tr></thead><tbody>${X.tracks.map((t, i) => `<tr data-t="${i}"><td><input data-k="name" value="${esc(t.name || t.id)}"></td><td><input type="checkbox" data-k="played"${t.played ? ' checked' : ''}></td><td><input data-k="callsign" value="${esc(t.callsign)}"></td><td><input data-k="start" value="${esc(t.start)}" placeholder="H+60"></td><td><input data-k="nature" value="${esc(t.nature)}"></td><td><input data-k="points" value="${esc(pointsText(t.points))}"></td><td><input data-k="level" value="${esc(t.level)}"></td><td><input data-k="speed_kt" type="number" value="${esc(t.speed_kt ?? '')}"></td><td><input data-k="task" value="${esc(t.task)}"></td><td><input data-k="conduct" value="${esc(t.conduct)}"></td><td><button type="button" class="secondary mx-del" data-del-t="${i}" title="Retirer">×</button></td></tr>`).join('')}</tbody></table>
      <div class="mx-row"><button type="button" class="secondary" data-add-t>+ Chiffon</button><details><summary class="mx-help">Importer un tableau Markdown de pistes</summary><textarea data-md placeholder="| Piste | Nature simulée | Route / points de passage | Niveau / vitesse | Ce que … doit établir |"></textarea><button type="button" class="secondary" data-import>Importer (remplace les pistes de même nom)</button></details></div>

      <h3>Chronologie</h3>
      <p class="mx-help">Ce qui arrive au fil de l’exercice, dans l’ordre des heures estimées. Message radio : passé par l’émetteur au moment indiqué. Pli scellé : remis avant le vol, ouvert par le destinataire au moment indiqué.</p>
      ${tl.map(e => { const i = X.events.findIndex(x => up(x.id || '') === e.id), x = X.events[i] || {}, isH = parseH(x.at) != null || !x.at; return `<div class="mx-ev${e.kind === 'pli' ? ' pli' : ''}" data-e="${i}">
        <div class="mx-ev-head"><span class="mx-t">${esc(e.t == null ? 'H+?' : hText(e.t))}</span><span class="mx-kind">${e.kind === 'pli' ? 'PLI SCELLÉ' : 'RADIO'}</span><span>${esc(e.from || '—')} → ${esc(e.to.join(', ') || '—')}</span><span>${esc(e.title || '')}</span></div>
        <div class="mx-grid">
          <label>Déclencheur<select data-k="trigger"><option value="h"${isH ? ' selected' : ''}>Heure (H+…)</option><option value="pt"${!isH ? ' selected' : ''}>Passage d’un point</option></select></label>
          ${isH ? `<label>Heure<input data-k="at" value="${esc(x.at || 'H+0')}" placeholder="H+60"></label>` : `<label>Point<select data-k="at">${[...points.keys()].concat(points.has(up(x.at)) ? [] : [up(x.at)]).map(id => `<option${id === up(x.at) ? ' selected' : ''}>${esc(id)}</option>`).join('')}</select></label><label>Par<select data-k="by"><option value="">(le premier qui y passe)</option>${ex.participants.map(p => `<option${p.callsign === up(x.by) ? ' selected' : ''}>${esc(p.callsign)}</option>`).join('')}</select></label><label>+ min<input data-k="delay_min" type="number" value="${esc(x.delay_min ?? 0)}"></label>`}
          <label>Forme<select data-k="kind"><option value="radio"${e.kind === 'radio' ? ' selected' : ''}>message radio</option><option value="pli"${e.kind === 'pli' ? ' selected' : ''}>pli scellé</option></select></label>
          <label>Émetteur<input data-k="from" value="${esc(x.from || '')}" placeholder="CYRANO01, directeur d’exercice…"></label>
          <label>Titre<input data-k="title" value="${esc(x.title || '')}"></label>
        </div>
        <div class="mx-row"><b style="font-size:12px">Destinataires</b><span class="mx-chips">${chip('to', 'ALL', e.to.includes('ALL'), 'Tous')}${aud.map(a => chip('to', a.id, e.to.includes(a.id), a.label)).join('')}</span></div>
        ${ex.tracks.length ? `<div class="mx-row"><b style="font-size:12px">Pistes révélées</b><span class="mx-chips">${ex.tracks.map(t => chip('rev', t.id, e.reveals.includes(t.id), t.name)).join('')}</span></div>` : ''}
        <label class="mx-full">Texte (${e.kind === 'pli' ? 'contenu du pli' : 'message transmis'})<textarea data-k="text">${esc(x.text || '')}</textarea></label>
        <div class="mx-row"><button type="button" class="secondary mx-del" data-del-e="${i}">Retirer cet événement</button></div></div>`; }).join('')}
      <div class="mx-row"><button type="button" class="secondary" data-add-e="radio">+ Message radio</button><button type="button" class="secondary" data-add-e="pli">+ Pli scellé</button></div>

      <h3>Ce que reçoit chacun</h3>
      <div class="mx-aud">${audiences(ex).map(a => { const list = eventsFor(tl, a.id), plis = list.filter(x => x.kind === 'pli').length, radio = list.length - plis; return `<div><b>${esc(a.label)}</b><br><span class="mx-help">${a.kind === 'org' ? `brief général, chronologie complète (${list.length}), tous les chiffons` : a.kind === 'chiffon' ? 'sa route, son heure de départ, ses consignes, sa carte' : `son brief, ${plis} pli(s) scellé(s) à ouvrir, ${radio} message(s) radio reçus en vol, ${revealedFor(ex, tl, a.id).length} piste(s) révélée(s)`}</span></div>`; }).join('')}</div>`;
    const changed = redraw => {
      onChange?.();
      if (redraw) editor(host, y, {
        docs,
        onChange
      });
    };
    host.querySelector('[data-h]').onchange = e => {
      X.h_hour = e.target.value || 'H';
      changed(false);
    };
    host.querySelectorAll('[data-p] [data-k]').forEach(el => el.onchange = () => {
      const p = X.participants[+el.closest('[data-p]').dataset.p];
      p[el.dataset.k] = el.dataset.k === 'callsign' || el.dataset.k === 'mission' ? up(el.value) : el.value;
      changed(true);
    });
    host.querySelectorAll('[data-t] [data-k]').forEach(el => el.onchange = () => {
      const t = X.tracks[+el.closest('[data-t]').dataset.t],
        k = el.dataset.k;
      if (k === 'points') t.points = parsePoints(el.value);
      else if (k === 'played') t.played = el.checked;
      else if (k === 'speed_kt') t.speed_kt = el.value === '' ? null : +el.value;
      else if (k === 'name') {
        t.name = el.value;
        t.id = el.value.trim().replace(/\s+/g, '-').toUpperCase();
      } else t[k] = el.value;
      changed(k === 'played' || k === 'name' || k === 'start');
    });
    host.querySelectorAll('[data-e]').forEach(card => {
      const x = X.events[+card.dataset.e];
      if (!x) return;
      card.querySelectorAll('[data-k]').forEach(el => el.onchange = () => {
        const k = el.dataset.k;
        if (k === 'trigger') {
          if (el.value === 'h') {
            x.at = 'H+0';
            delete x.by;
            x.delay_min = 0;
          } else {
            x.at = [...points.keys()][0] || 'ORIGIN';
          }
        } else if (k === 'delay_min') x.delay_min = el.value === '' ? 0 : +el.value;
        else if (k === 'by') {
          if (el.value) x.by = el.value;
          else delete x.by;
        } else x[k] = el.value;
        changed(['trigger', 'at', 'by', 'delay_min', 'kind', 'from', 'title'].includes(k));
      });
      card.querySelectorAll('[data-to]').forEach(el => el.onchange = () => {
        x.to = [...card.querySelectorAll('[data-to]:checked')].map(c => c.dataset.to);
        changed(true);
      });
      card.querySelectorAll('[data-rev]').forEach(el => el.onchange = () => {
        x.reveals = [...card.querySelectorAll('[data-rev]:checked')].map(c => c.dataset.rev);
        delete x.tracks;
        changed(true);
      });
    });
    host.querySelectorAll('[data-del-p]').forEach(b => b.onclick = () => {
      X.participants.splice(+b.dataset.delP, 1);
      changed(true);
    });
    host.querySelectorAll('[data-del-t]').forEach(b => b.onclick = () => {
      X.tracks.splice(+b.dataset.delT, 1);
      changed(true);
    });
    host.querySelectorAll('[data-del-e]').forEach(b => b.onclick = () => {
      X.events.splice(+b.dataset.delE, 1);
      changed(true);
    });
    host.querySelector('[data-add-p]').onclick = () => {
      X.participants.push({
        callsign: '',
        mission: '',
        takeoff: 'H',
        role: ''
      });
      changed(true);
    };
    const fill = host.querySelector('[data-fill-p]');
    if (fill) fill.onclick = () => {
      for (const d of ys) {
        const id = up(d.mission.id),
          cs = up(arr(d.aircraft)[0]?.callsign || id);
        if (!X.participants.some(p => up(p.mission) === id)) X.participants.push({
          callsign: cs,
          mission: id,
          takeoff: 'H',
          role: arr(d.aircraft)[0]?.role || ''
        });
      }
      changed(true);
    };
    host.querySelector('[data-add-t]').onclick = () => {
      X.tracks.push({
        id: `TRACK-${X.tracks.length + 1}`,
        name: `TRACK ${X.tracks.length + 1}`,
        played: false,
        callsign: '',
        start: '',
        nature: '',
        points: [],
        level: '',
        speed_kt: null,
        task: '',
        conduct: ''
      });
      changed(true);
    };
    host.querySelectorAll('[data-add-e]').forEach(b => b.onclick = () => {
      X.events.push({
        id: `EV-${X.events.length + 1}`,
        at: 'H+0',
        delay_min: 0,
        kind: b.dataset.addE,
        from: '',
        to: [],
        title: '',
        text: '',
        reveals: []
      });
      changed(true);
    });
    host.querySelector('[data-import]').onclick = () => {
      for (const t of parseTracksTable(host.querySelector('[data-md]').value)) {
        const i = X.tracks.findIndex(x => up(x.id) === t.id);
        i >= 0 ? X.tracks[i] = {
          ...X.tracks[i],
          ...t,
          played: X.tracks[i].played
        } : X.tracks.push(t);
      }
      changed(true);
    };
  }

  /** Vue en lecture d'une mission d'équipage : ce qu'elle reçoit de l'exercice (plis, messages radio, pistes révélées). */
  function crewPanel(host, y, docs = []) {
    if (!host) return;
    css();
    y = yamlOf(y);
    const ex = of(y, docs);
    host.classList.add('mx');
    if (!ex) {
      host.innerHTML = `<p class="mx-help">Cette mission ne fait partie d’aucun exercice. Pour en créer un, ouvrir ou créer la mission d’organisation de son opération (${esc(organisationId(y.operation?.id || y.mission?.id))}).</p>`;
      return;
    }
    const tl = timeline(ex, [y, ...arr(docs)]),
      me = participantOf(ex, y.mission?.id),
      list = me ? eventsFor(tl, me.callsign) : [];
    host.innerHTML = `<p class="mx-help">${ex.legacy ? 'Exercice décrit dans cette mission (ancien format) : pour plusieurs acteurs, le reprendre dans la mission d’organisation.' : `Exercice de l’opération, tenu dans la mission d’organisation ${esc(ex.owner)} : à modifier là-bas.`} ${me ? `Participant : ${esc(me.callsign)}, décollage ${esc(hText(parseH(me.takeoff) ?? 0))}.` : '<span class="mx-warn">Cette mission n’est pas encore déclarée parmi les participants.</span>'}</p>
      ${list.length ? list.map(e => `<div class="mx-ev${e.kind === 'pli' ? ' pli' : ''}"><div class="mx-ev-head"><span class="mx-t">${esc(e.t == null ? 'H+?' : hText(e.t))}</span><span class="mx-kind">${e.kind === 'pli' ? 'PLI SCELLÉ' : 'RADIO'}</span><span>${esc(e.from || '—')}</span><span>${esc(e.title || '')}</span></div><div class="mx-help">${esc(e.when)}${e.reveals.length ? ` · pistes : ${esc(e.reveals.join(', '))}` : ''}</div></div>`).join('') : '<p class="mx-help">Aucun message ni pli adressé à cet équipage.</p>'}`;
  }

  // ---- traductions des libellés fixes (fr / en / de / es) : couche commune (content_i18n.js), chargée après ce module
  const ROWS = ([
    ['Heure H et participants', 'H-hour and participants', 'Stunde H und Teilnehmer', 'Hora H y participantes'],
    ['Heure de référence commune à toute l’opération ; chaque participant décolle à H plus ou moins un délai. Les événements se placent à H+… ou au passage d’un point par un participant.', 'Reference time common to the whole operation; each participant takes off at H plus or minus a delay. Events are placed at H+… or when a participant passes a point.', 'Gemeinsame Bezugszeit der ganzen Operation; jeder Teilnehmer startet bei H plus oder minus einer Verzögerung. Ereignisse liegen bei H+… oder beim Überflug eines Punktes durch einen Teilnehmer.', 'Hora de referencia común a toda la operación; cada participante despega a H más o menos un retraso. Los eventos se sitúan en H+… o al paso de un participante por un punto.'],
    ['Heure H (libellé ou heure réelle)', 'H-hour (label or real time)', 'Stunde H (Bezeichnung oder Uhrzeit)', 'Hora H (etiqueta u hora real)'],
    ['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'],
    ['Mission', 'Mission', 'Mission', 'Misión'],
    ['Décollage (H±min)', 'Take-off (H±min)', 'Start (H±min)', 'Despegue (H±min)'],
    ['Rôle', 'Role', 'Rolle', 'Función'],
    ['+ Participant', '+ Participant', '+ Teilnehmer', '+ Participante'],
    ['Reprendre les missions de l’opération', 'Take the operation’s missions', 'Missionen der Operation übernehmen', 'Tomar las misiones de la operación'],
    ['Chiffons', 'Exercise targets', 'Übungsziele', 'Blancos de ejercicio'],
    ['Pistes d’exercice que les équipages doivent reconnaître, intercepter ou escorter. Un chiffon « joué » est piloté par un joueur : il reçoit sa carte, son heure de départ et ses consignes ; un chiffon simulé n’est que dessiné.', 'Exercise tracks the crews must identify, intercept or escort. A “played” target is flown by a player: it gets its map, departure time and instructions; a simulated target is only drawn.', 'Übungsspuren, die die Besatzungen aufklären, abfangen oder begleiten sollen. Ein „gespieltes“ Ziel wird von einem Spieler geflogen: Es erhält Karte, Startzeit und Anweisungen; ein simuliertes Ziel wird nur gezeichnet.', 'Pistas de ejercicio que las tripulaciones deben reconocer, interceptar o escoltar. Un blanco «jugado» lo pilota un jugador: recibe su mapa, su hora de salida y sus consignas; un blanco simulado solo se dibuja.'],
    ['Nom', 'Name', 'Name', 'Nombre'],
    ['Joué', 'Played', 'Gespielt', 'Jugado'],
    ['Départ (H+min)', 'Departure (H+min)', 'Abflug (H+min)', 'Salida (H+min)'],
    ['Nature', 'Nature', 'Art', 'Naturaleza'],
    ['Points (« Nom lat, lon ; … »)', 'Points (“Name lat, lon; …”)', 'Punkte („Name lat, lon; …“)', 'Puntos («Nombre lat, lon; …»)'],
    ['Niveau', 'Level', 'Höhe', 'Nivel'],
    ['Vitesse (kt)', 'Speed (kt)', 'Geschwindigkeit (kt)', 'Velocidad (kt)'],
    ['À établir par les équipages', 'To establish by the crews', 'Von den Besatzungen festzustellen', 'A establecer por las tripulaciones'],
    ['Consignes du chiffon', 'Target instructions', 'Anweisungen des Ziels', 'Consignas del blanco'],
    ['+ Chiffon', '+ Target', '+ Ziel', '+ Blanco'],
    ['Importer un tableau Markdown de pistes', 'Import a Markdown table of tracks', 'Markdown-Tabelle der Spuren importieren', 'Importar una tabla Markdown de pistas'],
    ['Importer (remplace les pistes de même nom)', 'Import (replaces tracks of the same name)', 'Importieren (ersetzt gleichnamige Spuren)', 'Importar (sustituye las pistas del mismo nombre)'],
    ['Chronologie', 'Timeline', 'Zeitablauf', 'Cronología'],
    ['Ce qui arrive au fil de l’exercice, dans l’ordre des heures estimées. Message radio : passé par l’émetteur au moment indiqué. Pli scellé : remis avant le vol, ouvert par le destinataire au moment indiqué.', 'What happens during the exercise, in order of estimated time. Radio message: passed by the sender at the given moment. Sealed envelope: handed out before the flight, opened by the recipient at the given moment.', 'Was im Laufe der Übung geschieht, nach geschätzter Zeit geordnet. Funkspruch: vom Absender zum angegebenen Zeitpunkt übermittelt. Versiegelter Umschlag: vor dem Flug übergeben, vom Empfänger zum angegebenen Zeitpunkt geöffnet.', 'Lo que ocurre durante el ejercicio, por orden de hora estimada. Mensaje de radio: transmitido por el emisor en el momento indicado. Sobre sellado: entregado antes del vuelo, abierto por el destinatario en el momento indicado.'],
    ['Déclencheur', 'Trigger', 'Auslöser', 'Disparador'],
    ['Heure (H+…)', 'Time (H+…)', 'Zeit (H+…)', 'Hora (H+…)'],
    ['Passage d’un point', 'Passing a point', 'Überflug eines Punktes', 'Paso por un punto'],
    ['Heure', 'Time', 'Zeit', 'Hora'],
    ['Point', 'Point', 'Punkt', 'Punto'],
    ['Par', 'By', 'Durch', 'Por'],
    ['(le premier qui y passe)', '(the first to pass it)', '(der erste, der ihn überfliegt)', '(el primero que pase)'],
    ['Forme', 'Form', 'Form', 'Forma'],
    ['message radio', 'radio message', 'Funkspruch', 'mensaje de radio'],
    ['pli scellé', 'sealed envelope', 'versiegelter Umschlag', 'sobre sellado'],
    ['Émetteur', 'Sender', 'Absender', 'Emisor'],
    ['Titre', 'Title', 'Titel', 'Título'],
    ['Destinataires', 'Recipients', 'Empfänger', 'Destinatarios'],
    ['Tous', 'All', 'Alle', 'Todos'],
    ['Pistes révélées', 'Tracks revealed', 'Aufgedeckte Spuren', 'Pistas reveladas'],
    ['Organisation', 'Organisation', 'Organisation', 'Organización'],
    ['Texte (contenu du pli)', 'Text (envelope contents)', 'Text (Inhalt des Umschlags)', 'Texto (contenido del sobre)'],
    ['Texte (message transmis)', 'Text (message passed)', 'Text (übermittelte Nachricht)', 'Texto (mensaje transmitido)'],
    ['Retirer cet événement', 'Remove this event', 'Dieses Ereignis entfernen', 'Quitar este evento'],
    ['+ Message radio', '+ Radio message', '+ Funkspruch', '+ Mensaje de radio'],
    ['+ Pli scellé', '+ Sealed envelope', '+ Versiegelter Umschlag', '+ Sobre sellado'],
    ['PLI SCELLÉ', 'SEALED ENVELOPE', 'VERSIEGELT', 'SOBRE SELLADO'],
    ['RADIO', 'RADIO', 'FUNK', 'RADIO'],
    ['Ce que reçoit chacun', 'What each one receives', 'Was jeder erhält', 'Lo que recibe cada uno'],
    ['sa route, son heure de départ, ses consignes, sa carte', 'its route, departure time, instructions and map', 'seine Route, Startzeit, Anweisungen und Karte', 'su ruta, su hora de salida, sus consignas y su mapa'],
    ['Aucun message ni pli adressé à cet équipage.', 'No message or envelope addressed to this crew.', 'Keine Nachricht und kein Umschlag an diese Besatzung.', 'Ningún mensaje ni sobre dirigido a esta tripulación.'],
    ['Cette mission n’est pas encore déclarée parmi les participants.', 'This mission is not yet declared among the participants.', 'Diese Mission ist noch nicht unter den Teilnehmern eingetragen.', 'Esta misión aún no figura entre los participantes.']
  ]);
  const register = () => {
    if (!window.RepositoryContentI18n) return false;
    window.RepositoryContentI18n(ROWS);
    return true;
  };
  if (!register()) window.addEventListener('DOMContentLoaded', () => {
    if (!register()) window.addEventListener('load', register, {
      once: true
    });
  }, {
    once: true
  });

  window.MissionExercise = {
    of,
    isOrganisation,
    organisationId,
    audiences,
    participantOf,
    timeline,
    eventsFor,
    revealedFor,
    parseH,
    hText,
    fromLegacy,
    editor,
    crewPanel,
    parseTracksTable,
    pointsText,
    injectsOf,
    schedule,
    revealed,
    whenText
  };
})();
