(() => {
  'use strict';
  // Centre : affecter une mission à un ou plusieurs pilotes (docs/AFFECTATION_MISSIONS.md). Ouvert par « Affecter… » du
  // registre des missions et par le planning ODV (créneau cliqué : pilotes et heure préremplis). Outils communs (convoyage,
  // qualification, créneaux, conflits, écriture) : shared/assignments.js.
  //   · heure : décollage (UTC), ou heure H d'un exercice (décollage du participant = H + son décalage) ; astreinte ;
  //   · participants (patrouille : + équipier, indicatif suivi) : pilote (qualification sur le type déclarée ou connue,
  //     disponibilité à l'heure), appareil du type demandé (basé au terrain de départ d'abord ; ailleurs : convoyage,
  //     confiable à un autre pilote), conflits ;
  //   · enregistrement : MissionAssignments.writeAssignment (affectations.yaml de la mission + index).
  // API : AssignDialog.open(entrée du registre, yaml de la mission, { maps, pilots: [TRI…], takeoff: ms, note }) ;
  //   { rows, apply } : lignes préremplies, résultat rendu à apply(lignes) au lieu d'être écrit (matrice d'un créneau) ;
  //   frame(id, { title, subtitle, body, foot, wide, beforeClose }) : fenêtre au même gabarit ; chip(texte, ok|warn|err|focus).
  const K = window.RepositoryKit,
    esc = K.esc,
    A = () => window.MissionAssignments;
  const hhmm = ms => new Date(ms).toISOString().slice(11, 16) + 'Z';
  /** « H-20mn » → -20, « H+1h » → 60 (minutes) ; « H » → 0 (lecture commune, shared/kit.js). */
  const offsetOf = s => K.hOffset(s) ?? 0;
  /** Indicatif suivant d'une patrouille : MERCURE31 → MERCURE32. */
  const nextCallsign = (cs, n) => String(cs || '').replace(/(\d+)(?!.*\d)/, d => String(+d + n).padStart(d.length, '0'));
  const chip = (text, kind = '') => `<span class="ad-chip ${kind}">${text}</span>`;
  /** Phrase [fr, en, de, es] dans la langue de la page, valeurs {clé} insérées (déjà échappées par l'appelant). */
  const L = (row, vals = {}) => K.t(row).replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '');

  const css = () => {
    if (!document.getElementById('adCss')) document.head.insertAdjacentHTML('beforeend', `<style id="adCss">
.ad-dialog{width:min(920px,96vw);max-height:92vh;padding:0;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:calc(10px * var(--repo-round, 1));box-shadow:0 18px 50px rgba(0,0,0,.45);overflow:hidden}
.ad-dialog::backdrop{background:rgba(10,14,20,.55)}
/* fenêtre en colonne : en-tête et pied fixes, seul le corps défile (dialog.repo-ap-dialog, plus précis, imposait
   overflow:auto à la fenêtre : double défilement, en-tête et barre d'état à moitié visibles, coins droits coupés) */
dialog.ad-dialog{overflow:hidden;max-height:92vh}dialog.ad-dialog[open]{display:flex;flex-direction:column}
.ad-form{display:flex;flex-direction:column;flex:1;min-height:0;max-height:92vh}.ad-head,.ad-foot{flex:none}.ad-body{flex:1;min-height:0}
.ad-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}
.ad-head h3{margin:0;font-size:17px}.ad-head p{margin:2px 0 0;font-size:12.5px;opacity:.8}.ad-x{font-size:22px;line-height:1;cursor:pointer;background:none;border:0;color:inherit;opacity:.7}.ad-x:hover{opacity:1}
.ad-body{padding:12px 16px;overflow:auto}
.ad-facts{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.ad-chip{display:inline-block;padding:2px 8px;border-radius:calc(999px * var(--repo-round, 1));font-size:11.5px;line-height:1.6;background:color-mix(in srgb,currentColor 9%,transparent);margin:0 4px 4px 0}
.ad-chip.ok{background:color-mix(in srgb,#2e9d5b 22%,transparent)}.ad-chip.warn{background:color-mix(in srgb,#e0a400 26%,transparent)}.ad-chip.err{background:color-mix(in srgb,#e5484d 26%,transparent)}
.ad-note{padding:6px 10px;border-left:3px solid #e0a400;background:color-mix(in srgb,#e0a400 10%,transparent);font-size:12.5px}
.ad-when{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px 14px;align-items:end;margin:0 0 12px;padding:8px 12px 10px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:calc(8px * var(--repo-round, 1))}
.ad-when legend{font-weight:700;font-size:12px;padding:0 4px}
.ad-dialog label{display:grid;gap:3px;font-size:12px;font-weight:600}.ad-dialog label small{font-weight:400;opacity:.75}
.ad-check-l{display:flex!important;align-items:center;gap:6px!important}
.ad-card{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:calc(8px * var(--repo-round, 1));padding:8px 12px;margin:0 0 8px}
.ad-line{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:end}.ad-line input{width:7em}.ad-pilot select{min-width:250px}.ad-ferry select{max-width:320px;margin-left:4px}.ad-line .ad-grow{flex:1;min-width:240px}.ad-line select{width:100%}
.ad-del{margin-left:auto;font-size:15px;cursor:pointer;background:none;border:0;color:inherit;opacity:.6}.ad-del:hover{opacity:1}
.ad-ferry{margin:6px 0 0;font-size:12.5px}.ad-ferry input{width:5em;margin-left:4px}.ad-checks{margin:6px 0 0}
.ad-foot{display:flex;gap:8px;align-items:center;padding:10px 16px;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent)}.ad-msg{flex:1;margin:0;font-size:12.5px}
.ad-wide{width:min(1180px,96vw)}
.ad-post{margin:0 0 6px;font-size:12.5px}.ad-link{background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer;font-size:12px}
.ad-matrix tbody.ad-op{box-shadow:inset 4px 0 0 #2f7de1}.ad-matrix .ad-op-head td{padding:4px 8px;font-size:12px;background:color-mix(in srgb,#2f7de1 10%,transparent)}.ad-matrix option:disabled{color:#999}
.ad-matrix select{max-width:220px}.ad-matrix tbody{border-top:2px solid color-mix(in srgb,currentColor 22%,transparent)}.ad-matrix tbody:not(.on){opacity:.7}
.ad-matrix tr.ad-set td{background:color-mix(in srgb,#2e9d5b 12%,transparent)}.ad-matrix input[data-f]{width:8em}
.ad-chip.focus{outline:2px solid #e5484d;outline-offset:1px}
.ad-card h4{margin:0 0 6px;font-size:13px}.ad-help{margin:4px 0 0;font-size:12px;opacity:.8}.ad-list{margin:0;padding-left:18px;font-size:12.5px}
.ad-inline{display:inline-flex!important;align-items:center;gap:6px!important}
.ad-table{width:100%;border-collapse:collapse;font-size:12.5px}.ad-table th,.ad-table td{padding:4px 6px;text-align:left;vertical-align:top;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent)}.ad-table th{font-size:11.5px;opacity:.8}
.ad-table tr.bad td{opacity:.55;background:color-mix(in srgb,#e5484d 8%,transparent)}.ad-table hr{border:0;border-top:1px dashed color-mix(in srgb,currentColor 25%,transparent);margin:3px 0}.ad-table .ad-act{white-space:nowrap}.ad-table .ad-chip{margin:0 4px 2px 0}
</style>`);
  };
  /** Fenêtre au gabarit du dialogue (en-tête : titre, sous-titre, ×, corps défilant, pied facultatif) ; titre, sous-titre,
   *  corps et pied en HTML (échappés par l'appelant) ; beforeClose : false refuse la fermeture. Réutilisée par le
   *  planning ODV (matrice d'un créneau). */
  function frame(id, {
    title,
    subtitle = '',
    body = '',
    foot = '',
    wide = false,
    beforeClose = null
  }) {
    css();
    let d = document.getElementById(id);
    if (!d) {
      d = document.createElement('dialog');
      d.id = id;
      document.body.append(d);
      // fermeture (×, Fermer, fond, Échap) : beforeClose() === false la refuse (modifications en attente)
      d.addEventListener('click', e => {
        if ((e.target === d || e.target.closest('[data-close]')) && d._beforeClose?.() !== false) d.close();
      });
      d.addEventListener('cancel', e => {
        if (d._beforeClose?.() === false) e.preventDefault();
      });
    }
    d._beforeClose = beforeClose;
    d.className = `repo-ap-dialog ad-dialog${wide ? ' ad-wide' : ''}`;
    d.innerHTML = `<div class="ad-form"><header class="ad-head"><div><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button type="button" class="repo-plain ad-x" data-close aria-label="${L(['Fermer', 'Close', 'Schließen', 'Cerrar'])}">×</button></header><div class="ad-body">${body}</div>${foot ? `<footer class="ad-foot">${foot}</footer>` : ''}</div>`;
    if (!d.open) d.showModal();
    return d;
  }

  let dlg = null;
  async function open(m, y, {
    maps = [],
    pilots: preset = [],
    takeoff: presetTakeoff = 0,
    note = '',
    rows: presetRows = null,
    apply = null
  } = {}) {
    const M = A(),
      fleet = window.DEFA_FLEET || [],
      ref = window.DEFA_REFERENCE?.pilots || [];
    const idx = await M.index({
      fresh: true
    });
    const existing = idx.assignments.filter(a => a.mission === m.id && a.role !== 'convoyage');
    const posts = M.postsOf(m, y), // un poste par équipage aérien (type, ou catégorie et service : schéma hélico)
      postOfType = ty => posts.find(p => M.fits(p, ty)) || M.postsOf({ aircraftTypes: [ty] })[0],
      departure = M.geo.icaoOf(y.origin) || existing[0]?.departure || '',
      callsign = posts[0]?.callsign || '',
      blockMin = +y.timing?.estimated_block_min || +y.timing?.estimated_flight_min || 120,
      ex = y.exercise,
      myOffset = offsetOf(ex?.participants?.find(p => p.mission === m.id)?.takeoff);
    M.rememberAirport(departure, y.origin);
    const t0 = presetTakeoff || Date.parse(existing[0]?.takeoff || '') || (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(10, 0, 0, 0);
      return +d;
    })();
    const postRow = (post, pilot = '', i = 0) => ({
      pilot,
      registration: '',
      callsign: post?.callsign || nextCallsign(callsign, i),
      ferryPilot: '',
      post
    });
    const rows = presetRows ? presetRows.map((r, i) => ({
      pilot: r.pilot || '',
      registration: r.registration || '',
      callsign: r.callsign || posts[i]?.callsign || '',
      ferryPilot: r.ferryPilot || '',
      post: r.post || posts[i] || posts[0]
    })) : existing.length && !preset.length ? existing.map(a => ({
      pilot: a.pilot,
      registration: a.aircraft?.registration || '',
      callsign: a.callsign || '',
      ferryPilot: a.ferry?.pilot && a.ferry.pilot !== a.pilot ? a.ferry.pilot : '',
      post: posts.find(p => p.callsign && p.callsign === a.callsign) || postOfType(a.aircraft?.type)
    })) : Array.from({
      length: Math.max(posts.length, preset.length)
    }, (_, i) => postRow(posts[i] || posts[posts.length - 1], preset[i] || '', i));
    const typeLabel = post => M.specLabel(post) || '?';
    const alert0 = existing[0]?.alert || null;
    const decl = {}; // déclarations des pilotes (disponibilités, appareils)
    const declOf = async tri => tri ? (decl[tri] ??= await M.availability(tri)) : null;
    const planesOf = post => M.planesFor(post, departure); // du type ou de la catégorie du poste, service puis terrain d'abord
    const pilotList = [...new Set([...ref.map(p => p.trigram), ...preset, ...rows.map(r => r.pilot)])].filter(Boolean).sort();
    const decls = await M.declarations(pilotList);
    /** Options d'un choix de pilote : vivier (disponibles et possédant le type, à l'heure donnée), puis les autres. */
    const poolOpts = (sel, at, {
      exclude = [],
      none = '',
      spec = ''
    } = {}) => {
      const list = M.pool(pilotList, decls, {
        type: spec,
        at,
        family: m.type,
        exclude
      });
      const opt = c => `<option value="${esc(c.tri)}" ${c.tri === sel ? 'selected' : ''}>${esc(M.poolLabel(c))}</option>`;
      const ok = list.filter(c => c.ok),
        other = list.filter(c => !c.ok);
      return `<option value="">${esc(none || L(['— pilote —', '— pilot —', '— Pilot —', '— piloto —']))}</option>${ok.length ? `<optgroup label="${L(['Disponibles, possèdent : {t} ({n})', 'Available, owning: {t} ({n})', 'Verfügbar, besitzen: {t} ({n})', 'Disponibles, poseen: {t} ({n})'], { t: esc(typeLabel(spec)), n: ok.length })}">${ok.map(opt).join('')}</optgroup>` : ''}<optgroup label="${L(['Autres (non déclarés, indisponibles ou sans l’appareil)', 'Others (not declared, unavailable or without the aircraft)', 'Andere (nicht angegeben, nicht verfügbar oder ohne das Luftfahrzeug)', 'Otros (no declarados, no disponibles o sin la aeronave)'])}">${other.map(opt).join('')}</optgroup>`;
    };

    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'repo-ap-dialog ad-dialog';
      document.body.append(dlg);
      dlg.addEventListener('click', e => {
        if (e.target === dlg) dlg.close();
      });
    }
    const toInput = ms => new Date(ms).toISOString().slice(0, 16);
    dlg.innerHTML = `<form method="dialog" class="ad-form">
      <header class="ad-head"><div><h3>${L(['Affecter {m}', 'Assign {m}', '{m} zuweisen', 'Asignar {m}'], { m: esc(m.id) })}</h3><p>${esc(m.title || y.title || '')}</p></div><button type="button" class="repo-plain ad-x" data-close aria-label="${L(['Fermer', 'Close', 'Schließen', 'Cerrar'])}">×</button></header>
      <div class="ad-body">
        <p class="ad-facts">${posts.map(p => chip(`${esc(p.callsign || L(['poste', 'post', 'Posten', 'puesto']))} <b>${esc(p.type || p.label || '?')}</b>${p.service ? ` · ${esc(p.service)}` : ''}`)).join('')}${chip(`${L(['Départ', 'Departure', 'Abflug', 'Salida'])} <b>${esc(departure || '?')}</b>`)}${chip(`${L(['Bloc', 'Block', 'Block', 'Bloque'])} <b>${esc(blockMin)} min</b>`)}${ex ? chip(L(['Exercice : décollage {h}', 'Exercise: take-off {h}', 'Übung: Start {h}', 'Ejercicio: despegue {h}'], { h: esc(K.hText(myOffset)) })) : ''}${chip(L(['heures UTC', 'UTC times', 'UTC-Zeiten', 'horas UTC']))}</p>
        ${note ? `<p class="ad-note">${esc(note)}</p>` : ''}
        <fieldset class="ad-when"><legend>${L(['Horaire', 'Timing', 'Zeitplan', 'Horario'])}</legend>
          <label>${ex ? L(['Heure H', 'H-hour', 'Stunde H', 'Hora H']) : L(['Décollage', 'Take-off', 'Start', 'Despegue'])}<input type="datetime-local" data-k="t" value="${esc(toInput(ex && !presetTakeoff && existing[0] ? t0 - myOffset * 6e4 : t0))}"></label>
          <label class="ad-check-l"><input type="checkbox" data-k="alert" ${alert0 || y.alert ? 'checked' : ''}> ${L(['Astreinte', 'Standby', 'Bereitschaft', 'Guardia'])} <small>${L(['prêt à l’heure, décollage sur ordre', 'ready at the time, take-off on order', 'zur Zeit bereit, Start auf Befehl', 'listo a la hora, despegue por orden'])}</small></label>
          <label>${L(['Préavis (min)', 'Notice (min)', 'Vorlauf (min)', 'Preaviso (min)'])}<input type="number" min="0" data-k="notice" value="${esc(alert0?.notice_min ?? y.alert?.notice_min ?? 15)}"></label>
          <label>${L(['Fin d’astreinte (h après)', 'End of standby (h after)', 'Ende der Bereitschaft (h danach)', 'Fin de la guardia (h después)'])}<input type="number" min="0" step="0.5" data-k="window" value="${esc(alert0?.window_end_utc ? (Date.parse(alert0.window_end_utc) - Date.parse(alert0.ready_at_utc)) / 36e5 : 2)}"></label>
        </fieldset>
        <div class="ad-rows"></div>
        <p><button type="button" class="secondary" data-add>${L(['+ Équipier (patrouille)', '+ Wingman (patrol)', '+ Flügelmann (Rotte)', '+ Punto (patrulla)'])}</button></p>
        <datalist id="adPilots">${pilotList.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      </div>
      <footer class="ad-foot"><p class="ad-msg" data-status></p><button type="button" class="primary" data-save data-icon="save">${apply ? L(['Reporter dans le créneau', 'Carry over to the slot', 'In das Zeitfenster übernehmen', 'Llevar a la franja']) : L(['Enregistrer l’affectation', 'Save the assignment', 'Zuweisung speichern', 'Guardar la asignación'])}</button><button type="button" class="ghost" data-close>${L(['Fermer', 'Close', 'Schließen', 'Cerrar'])}</button></footer>
    </form>`;
    const $ = s => dlg.querySelector(s);
    const box = $('.ad-rows');
    const takeoffOf = () => {
      const v = Date.parse($('[data-k="t"]').value + ':00Z');
      return ex ? v + myOffset * 6e4 : v;
    };
    const planeOpts = (sel, post) => `<option value="">${L(['— appareil —', '— aircraft —', '— Luftfahrzeug —', '— aeronave —'])}</option>${planesOf(post).map(p => `<option value="${esc(p.registration)}" ${p.registration === sel ? 'selected' : ''}>${esc(p.registration)} · ${esc(p.variant || p.type)} · ${esc(p.base || '?')}${post?.service && p.operator ? ` · ${esc(p.operator)}` : ''}${p.base && p.base !== departure ? L([' (convoyage)', ' (ferry)', ' (Überführung)', ' (traslado)']) : ''}${p.operational === false ? L([' — indisponible', ' — unavailable', ' — nicht verfügbar', ' — no disponible']) : ''}</option>`).join('')}<option value="__other">${L(['autre (saisie)…', 'other (type in)…', 'andere (Eingabe)…', 'otra (introducir)…'])}</option>`;
    const draw = () => {
      box.innerHTML = rows.map((r, i) => `<section class="ad-card" data-i="${i}"><h4 class="ad-post">${esc(r.callsign || L(['Équipage {n}', 'Crew {n}', 'Besatzung {n}', 'Tripulación {n}'], { n: i + 1 }))} — ${esc(r.post?.type || r.post?.label || L(['type libre', 'any type', 'beliebiger Typ', 'tipo libre']))}${r.post?.service ? ` · ${esc(r.post.service)}` : ''}</h4>
        <div class="ad-line"><label class="ad-pilot">${L(['Pilote', 'Pilot', 'Pilot', 'Piloto'])}<select data-r="pilot">${poolOpts(r.pilot, takeoffOf() + i * 6e4, { exclude: rows.filter((x, j) => j !== i).map(x => x.pilot), spec: r.post })}</select></label>
        <label class="ad-grow">${L(['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'])}<select data-r="registration">${planeOpts(r.registration, r.post)}</select></label>
        <label>${L(['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'])}<input data-r="callsign" value="${esc(r.callsign)}"></label>
        ${i ? `<button type="button" class="repo-plain ad-del" data-del="${i}" title="${L(['Retirer cet équipier', 'Remove this wingman', 'Diesen Flügelmann entfernen', 'Quitar este punto'])}">✕</button>` : ''}</div>
        <div class="ad-ferry" hidden></div><div class="ad-checks"></div></section>`).join('');
      check();
    };
    let last = [];
    /** Évalue chaque participant (convoyage, qualification, disponibilité, conflits) ; affiche ses contrôles. */
    async function check() {
      const t = takeoffOf();
      last = [];
      for (const [i, r] of rows.entries()) {
        const card = box.querySelector(`.ad-card[data-i="${i}"]`),
          plane = fleet.find(f => f.registration === r.registration),
          tk = t + i * 6e4,
          notes = [];
        const type = plane?.type || r.post?.type || '';
        const ferry = plane ? await M.ferryOf({
          base: plane.base,
          departure,
          type,
          takeoff: tk,
          pilot: r.ferryPilot || r.pilot
        }) : null;
        const fz = card?.querySelector('.ad-ferry');
        if (fz) {
          fz.hidden = !ferry;
          if (ferry) fz.innerHTML = `${ferry.minutes ? L(['Convoyage {r} ≈ {m} min, décollage {t}', 'Ferry {r} ≈ {m} min, take-off {t}', 'Überführung {r} ≈ {m} min, Start {t}', 'Traslado {r} ≈ {m} min, despegue {t}'], { r: `<b>${esc(ferry.from)} → ${esc(departure)}</b>`, m: ferry.minutes, t: `<b>${hhmm(Date.parse(ferry.takeoff))}</b>` }) : L(['Convoyage depuis {f} : distance inconnue', 'Ferry from {f}: distance unknown', 'Überführung ab {f}: Entfernung unbekannt', 'Traslado desde {f}: distancia desconocida'], { f: `<b>${esc(ferry.from)}</b>` })} — ${L(['par', 'by', 'durch', 'por'])} <select data-r="ferryPilot">${poolOpts(r.ferryPilot, ferry.takeoff ? Date.parse(ferry.takeoff) : tk, { spec: type, none: L(['{p} (le pilote de la mission)', '{p} (the mission pilot)', '{p} (der Missionspilot)', '{p} (el piloto de la misión)'], { p: r.pilot || L(['le pilote', 'the pilot', 'der Pilot', 'el piloto']) }), exclude: [r.pilot] })}</select>`;
        }
        if (plane?.operational === false) notes.push(chip(L(['appareil non opérationnel', 'aircraft not operational', 'Luftfahrzeug nicht einsatzbereit', 'aeronave no operativa']), 'err'));
        if (r.pilot) {
          const d = await declOf(r.pilot),
            q = M.qualification(d, r.pilot, plane ? plane.type : r.post);
          notes.push(chip(esc(q.text), q.level === 'mastered' ? 'ok' : q.level === 'owned' || q.level === 'flown' ? 'warn' : 'err'));
          const s = M.availabilityAt(d, ferry?.takeoff && (r.ferryPilot || r.pilot) === r.pilot ? Date.parse(ferry.takeoff) : tk, m.type);
          notes.push(!s ? chip(L(['disponibilité non renseignée', 'availability not filled in', 'Verfügbarkeit nicht angegeben', 'disponibilidad no indicada'])) : chip(`${esc(s.code)} — ${esc(s.label)}`, s.ok ? 'ok' : s.category === 'dispo' ? 'warn' : 'err'));
          if (!ref.some(p => p.trigram === r.pilot)) notes.push(chip(L(['trigramme inconnu de la référence', 'trigram unknown in the reference', 'Kürzel in der Referenz unbekannt', 'trigrama desconocido en la referencia']), 'warn'));
        }
        if (ferry?.takeoff && r.ferryPilot && r.ferryPilot !== r.pilot) {
          const s = M.availabilityAt(await declOf(r.ferryPilot), Date.parse(ferry.takeoff), '');
          notes.push(chip(L(['convoyeur {p} : {s}', 'ferry pilot {p}: {s}', 'Überführungspilot {p}: {s}', 'piloto de traslado {p}: {s}'], { p: esc(r.ferryPilot), s: s ? esc(s.code + ' — ' + s.label) : L(['disponibilité non renseignée', 'availability not filled in', 'Verfügbarkeit nicht angegeben', 'disponibilidad no indicada']) }), s ? (s.category === 'dispo' ? 'ok' : 'err') : ''));
        }
        const from = ferry?.takeoff ? Date.parse(ferry.takeoff) : tk;
        for (const c of M.conflicts(idx.assignments, {
            mission: m.id,
            pilot: r.pilot,
            registration: r.registration,
            ferryPilot: r.ferryPilot,
            from,
            to: tk + (blockMin + M.TURN_MIN) * 6e4
          })) notes.push(chip(esc(c), 'err'));
        if (rows.some((x, j) => j !== i && x.pilot && x.pilot === r.pilot)) notes.push(chip(L(['pilote en double', 'pilot twice', 'Pilot doppelt', 'piloto duplicado']), 'err'));
        if (rows.some((x, j) => j !== i && x.registration && x.registration === r.registration)) notes.push(chip(L(['appareil en double', 'aircraft twice', 'Luftfahrzeug doppelt', 'aeronave duplicada']), 'err'));
        if (card) card.querySelector('.ad-checks').innerHTML = notes.join('') || chip('—');
        last.push({
          pilot: r.pilot,
          callsign: r.callsign,
          aircraft: plane ? {
            registration: plane.registration,
            type: plane.type,
            variant: plane.variant || '',
            base: plane.base || ''
          } : r.registration ? {
            registration: r.registration,
            type
          } : null,
          departure,
          takeoff: new Date(tk).toISOString(),
          ferry: ferry?.minutes ? ferry : null,
          block_min: blockMin,
          status: 'affectée'
        });
      }
    }
    box.addEventListener('change', e => {
      const card = e.target.closest('.ad-card'),
        k = e.target.dataset.r;
      if (!card || !k) return;
      const i = +card.dataset.i;
      let v = e.target.value.trim();
      if (k === 'pilot' || k === 'ferryPilot') v = v.toUpperCase();
      if (k === 'registration' && v === '__other') v = (prompt(L(['Immatriculation de l’appareil', 'Aircraft registration', 'Kennzeichen des Luftfahrzeugs', 'Matrícula de la aeronave'])) || '').trim().toUpperCase();
      rows[i][k] = v;
      if (k === 'pilot') draw();
      else check();
    });
    box.addEventListener('click', e => {
      const d = e.target.closest('[data-del]');
      if (!d) return;
      rows.splice(+d.dataset.del, 1);
      draw();
    });
    $('[data-add]').onclick = () => {
      const lastPost = rows[rows.length - 1]?.post || posts[0];
      rows.push({
        pilot: '',
        registration: '',
        callsign: nextCallsign(rows[rows.length - 1]?.callsign || callsign, 1),
        ferryPilot: '',
        post: lastPost
      });
      draw();
    };
    dlg.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', () => el.dataset.k === 't' ? draw() : check())); // heure : vivier recalculé
    dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
    $('[data-save]').onclick = async () => {
      const msg = $('.ad-msg');
      if (apply) { // ouvert depuis la matrice d'un créneau : le résultat y revient, en attente (rien n'est écrit ici)
        apply(rows.map(r => ({
          ...r
        })));
        dlg.close();
        return;
      }
      await check();
      if (!rows.every(r => r.pilot && r.registration)) {
        msg.innerHTML = `<span class="err">${L(['Chaque participant a besoin d’un pilote et d’un appareil.', 'Each participant needs a pilot and an aircraft.', 'Jeder Teilnehmer braucht einen Piloten und ein Luftfahrzeug.', 'Cada participante necesita un piloto y una aeronave.'])}</span>`;
        return;
      }
      const t = takeoffOf(),
        alert = $('[data-k="alert"]').checked ? {
          ready_at_utc: new Date(t).toISOString(),
          aerodrome: departure,
          notice_min: +$('[data-k="notice"]').value || 0,
          window_end_utc: new Date(t + (+$('[data-k="window"]').value || 2) * 36e5).toISOString()
        } : null;
      try {
        const f = await M.writeAssignment({
          ...m,
          maps
        }, last, {
          h_hour: ex ? new Date(t - myOffset * 6e4).toISOString() : null,
          alert
        });
        msg.innerHTML = `<span class="ok">${L(['Enregistrée : {f}', 'Saved: {f}', 'Gespeichert: {f}', 'Guardada: {f}'], { f: `data/missions/${esc(f)}` })}</span>`;
        window.AppFramework?.notify?.(L(['{m} affectée à {p}.', '{m} assigned to {p}.', '{m} zugewiesen an {p}.', '{m} asignada a {p}.'], { m: m.id, p: rows.map(r => r.pilot).join(', ') }), 'ok');
        dlg.dispatchEvent(new CustomEvent('assigned', {
          detail: {
            mission: m.id
          }
        }));
      } catch (e) {
        msg.innerHTML = `<span class="err">${L(['Non enregistrée : {e}', 'Not saved: {e}', 'Nicht gespeichert: {e}', 'No guardada: {e}'], { e: esc(e.message) })}</span>`;
      }
    };
    draw();
    css();
    if (!dlg.open) dlg.showModal();
    return dlg;
  }

  window.AssignDialog = {
    open,
    frame,
    chip
  };
})();
