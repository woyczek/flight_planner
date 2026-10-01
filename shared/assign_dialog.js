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
  // API : AssignDialog.open(entrée du registre, yaml de la mission, { maps, pilots: [TRI…], takeoff: ms, note })
  const K = window.RepositoryKit,
    esc = K.esc,
    A = () => window.MissionAssignments;
  const hhmm = ms => new Date(ms).toISOString().slice(11, 16) + 'Z';
  /** « H-20 » → -20 (minutes) ; « H » → 0. */
  const offsetOf = s => {
    const m = /^H\s*([+-])\s*(\d+)/i.exec(String(s || '').trim());
    return m ? (m[1] === '-' ? -1 : 1) * +m[2] : 0;
  };
  /** Indicatif suivant d'une patrouille : MERCURE31 → MERCURE32. */
  const nextCallsign = (cs, n) => String(cs || '').replace(/(\d+)(?!.*\d)/, d => String(+d + n).padStart(d.length, '0'));
  const chip = (text, kind = '') => `<span class="ad-chip ${kind}">${text}</span>`;

  let dlg = null;
  async function open(m, y, {
    maps = [],
    pilots: preset = [],
    takeoff: presetTakeoff = 0,
    note = ''
  } = {}) {
    const M = A(),
      fleet = window.DEFA_FLEET || [],
      ref = window.DEFA_REFERENCE?.pilots || [];
    const idx = await M.index({
      fresh: true
    });
    const existing = idx.assignments.filter(a => a.mission === m.id && a.role !== 'convoyage');
    const type = M.typeOf(y.aircraft?.[0]?.type || existing[0]?.aircraft?.type),
      departure = M.geo.icaoOf(y.origin) || existing[0]?.departure || '',
      callsign = y.aircraft?.[0]?.callsign || '',
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
    const rows = preset.length ? preset.map((p, i) => ({
      pilot: p,
      registration: '',
      callsign: nextCallsign(callsign, i),
      ferryPilot: ''
    })) : existing.length ? existing.map(a => ({
      pilot: a.pilot,
      registration: a.aircraft?.registration || '',
      callsign: a.callsign || '',
      ferryPilot: a.ferry?.pilot && a.ferry.pilot !== a.pilot ? a.ferry.pilot : ''
    })) : [{
      pilot: '',
      registration: '',
      callsign,
      ferryPilot: ''
    }];
    const alert0 = existing[0]?.alert || null;
    const decl = {}; // déclarations des pilotes (disponibilités, appareils)
    const declOf = async tri => tri ? (decl[tri] ??= await M.availability(tri)) : null;
    const planes = fleet.filter(f => M.typeOf(f.type) === type || M.typeOf(f.variant) === type)
      .sort((a, b) => (b.base === departure) - (a.base === departure) || (b.operational !== false) - (a.operational !== false) || String(a.base).localeCompare(String(b.base)));
    const pilotList = [...new Set([...ref.map(p => p.trigram), ...preset, ...rows.map(r => r.pilot)])].filter(Boolean).sort();
    const decls = await M.declarations(pilotList);
    /** Options d'un choix de pilote : vivier (disponibles et possédant le type, à l'heure donnée), puis les autres. */
    const poolOpts = (sel, at, {
      exclude = [],
      none = ''
    } = {}) => {
      const list = M.pool(pilotList, decls, {
        type,
        at,
        family: m.type,
        exclude
      });
      const opt = c => `<option value="${esc(c.tri)}" ${c.tri === sel ? 'selected' : ''}>${esc(M.poolLabel(c))}</option>`;
      const ok = list.filter(c => c.ok),
        other = list.filter(c => !c.ok);
      return `<option value="">${esc(none || '— pilote —')}</option>${ok.length ? `<optgroup label="Disponibles, possèdent le ${esc(type)} (${ok.length})">${ok.map(opt).join('')}</optgroup>` : ''}<optgroup label="Autres (non déclarés, indisponibles ou sans l’appareil)">${other.map(opt).join('')}</optgroup>`;
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
      <header class="ad-head"><div><h3>Affecter ${esc(m.id)}</h3><p>${esc(m.title || y.title || '')}</p></div><button type="button" class="repo-plain ad-x" data-close aria-label="Fermer">×</button></header>
      <div class="ad-body">
        <p class="ad-facts">${chip(`Type <b>${esc(type || '?')}</b>`)}${chip(`Départ <b>${esc(departure || '?')}</b>`)}${chip(`Bloc <b>${esc(blockMin)} min</b>`)}${ex ? chip(`Exercice : décollage H${myOffset >= 0 ? '+' : ''}${myOffset} min`) : ''}${chip('heures UTC')}</p>
        ${note ? `<p class="ad-note">${esc(note)}</p>` : ''}
        <fieldset class="ad-when"><legend>Horaire</legend>
          <label>${ex ? 'Heure H' : 'Décollage'}<input type="datetime-local" data-k="t" value="${esc(toInput(ex && !presetTakeoff && existing[0] ? t0 - myOffset * 6e4 : t0))}"></label>
          <label class="ad-check-l"><input type="checkbox" data-k="alert" ${alert0 || y.alert ? 'checked' : ''}> Astreinte <small>prêt à l'heure, décollage sur ordre</small></label>
          <label>Préavis (min)<input type="number" min="0" data-k="notice" value="${esc(alert0?.notice_min ?? y.alert?.notice_min ?? 15)}"></label>
          <label>Fin d'astreinte (h après)<input type="number" min="0" step="0.5" data-k="window" value="${esc(alert0?.window_end_utc ? (Date.parse(alert0.window_end_utc) - Date.parse(alert0.ready_at_utc)) / 36e5 : 2)}"></label>
        </fieldset>
        <div class="ad-rows"></div>
        <p><button type="button" class="secondary" data-add>+ Équipier (patrouille)</button></p>
        <datalist id="adPilots">${pilotList.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      </div>
      <footer class="ad-foot"><p class="ad-msg" data-status></p><button type="button" class="primary" data-save data-icon="save">Enregistrer l'affectation</button><button type="button" class="ghost" data-close>Fermer</button></footer>
    </form>`;
    const $ = s => dlg.querySelector(s);
    const box = $('.ad-rows');
    const takeoffOf = () => {
      const v = Date.parse($('[data-k="t"]').value + ':00Z');
      return ex ? v + myOffset * 6e4 : v;
    };
    const planeOpts = sel => `<option value="">— appareil —</option>${planes.map(p => `<option value="${esc(p.registration)}" ${p.registration === sel ? 'selected' : ''}>${esc(p.registration)} · ${esc(p.variant || p.type)} · ${esc(p.base || '?')}${p.base && p.base !== departure ? ' (convoyage)' : ''}${p.operational === false ? ' — indisponible' : ''}</option>`).join('')}<option value="__other">autre (saisie)…</option>`;
    const draw = () => {
      box.innerHTML = rows.map((r, i) => `<section class="ad-card" data-i="${i}">
        <div class="ad-line"><label class="ad-pilot">Pilote<select data-r="pilot">${poolOpts(r.pilot, takeoffOf() + i * 6e4, { exclude: rows.filter((x, j) => j !== i).map(x => x.pilot) })}</select></label>
        <label class="ad-grow">Appareil<select data-r="registration">${planeOpts(r.registration)}</select></label>
        <label>Indicatif<input data-r="callsign" value="${esc(r.callsign)}"></label>
        ${i ? `<button type="button" class="repo-plain ad-del" data-del="${i}" title="Retirer cet équipier">✕</button>` : ''}</div>
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
          if (ferry) fz.innerHTML = `${ferry.minutes ? `Convoyage <b>${esc(ferry.from)} → ${esc(departure)}</b> ≈ ${ferry.minutes} min, décollage <b>${hhmm(Date.parse(ferry.takeoff))}</b>` : `Convoyage depuis <b>${esc(ferry.from)}</b> : distance inconnue`} — par <select data-r="ferryPilot">${poolOpts(r.ferryPilot, ferry.takeoff ? Date.parse(ferry.takeoff) : tk, { none: `${r.pilot || 'le pilote'} (le pilote de la mission)`, exclude: [r.pilot] })}</select>`;
        }
        if (plane?.operational === false) notes.push(chip('appareil non opérationnel', 'err'));
        if (r.pilot) {
          const d = await declOf(r.pilot),
            q = M.qualification(d, r.pilot, type);
          notes.push(chip(esc(q.text), q.level === 'mastered' ? 'ok' : q.level === 'owned' || q.level === 'flown' ? 'warn' : 'err'));
          const s = M.availabilityAt(d, ferry?.takeoff && (r.ferryPilot || r.pilot) === r.pilot ? Date.parse(ferry.takeoff) : tk, m.type);
          notes.push(!s ? chip('disponibilité non renseignée') : chip(`${esc(s.code)} — ${esc(s.label)}`, s.ok ? 'ok' : s.category === 'dispo' ? 'warn' : 'err'));
          if (!ref.some(p => p.trigram === r.pilot)) notes.push(chip('trigramme inconnu de la référence', 'warn'));
        }
        if (ferry?.takeoff && r.ferryPilot && r.ferryPilot !== r.pilot) {
          const s = M.availabilityAt(await declOf(r.ferryPilot), Date.parse(ferry.takeoff), '');
          notes.push(chip(`convoyeur ${esc(r.ferryPilot)} : ${s ? esc(s.code + ' — ' + s.label) : 'disponibilité non renseignée'}`, s ? (s.category === 'dispo' ? 'ok' : 'err') : ''));
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
        if (rows.some((x, j) => j !== i && x.pilot && x.pilot === r.pilot)) notes.push(chip('pilote en double', 'err'));
        if (rows.some((x, j) => j !== i && x.registration && x.registration === r.registration)) notes.push(chip('appareil en double', 'err'));
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
      if (k === 'registration' && v === '__other') v = (prompt('Immatriculation de l’appareil') || '').trim().toUpperCase();
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
      rows.push({
        pilot: '',
        registration: '',
        callsign: nextCallsign(rows[0]?.callsign || callsign, rows.length),
        ferryPilot: ''
      });
      draw();
    };
    dlg.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', () => el.dataset.k === 't' ? draw() : check())); // heure : vivier recalculé
    dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
    $('[data-save]').onclick = async () => {
      const msg = $('.ad-msg');
      await check();
      if (!rows.every(r => r.pilot && r.registration)) {
        msg.innerHTML = '<span class="err">Chaque participant a besoin d’un pilote et d’un appareil.</span>';
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
        msg.innerHTML = `<span class="ok">Enregistrée : data/missions/${esc(f)}</span>`;
        window.AppFramework?.notify?.(`${m.id} affectée à ${rows.map(r => r.pilot).join(', ')}.`, 'ok');
        dlg.dispatchEvent(new CustomEvent('assigned', {
          detail: {
            mission: m.id
          }
        }));
      } catch (e) {
        msg.innerHTML = `<span class="err">Non enregistrée : ${esc(e.message)}</span>`;
      }
    };
    draw();
    if (!document.getElementById('adCss')) document.head.insertAdjacentHTML('beforeend', `<style id="adCss">
.ad-dialog{width:min(920px,96vw);max-height:92vh;padding:0;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.45);overflow:hidden}
.ad-dialog::backdrop{background:rgba(10,14,20,.55)}
.ad-form{display:flex;flex-direction:column;max-height:92vh}
.ad-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}
.ad-head h3{margin:0;font-size:17px}.ad-head p{margin:2px 0 0;font-size:12.5px;opacity:.8}.ad-x{font-size:22px;line-height:1;cursor:pointer;background:none;border:0;color:inherit;opacity:.7}.ad-x:hover{opacity:1}
.ad-body{padding:12px 16px;overflow:auto}
.ad-facts{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.ad-chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;line-height:1.6;background:color-mix(in srgb,currentColor 9%,transparent);margin:0 4px 4px 0}
.ad-chip.ok{background:color-mix(in srgb,#2e9d5b 22%,transparent)}.ad-chip.warn{background:color-mix(in srgb,#e0a400 26%,transparent)}.ad-chip.err{background:color-mix(in srgb,#e5484d 26%,transparent)}
.ad-note{padding:6px 10px;border-left:3px solid #e0a400;background:color-mix(in srgb,#e0a400 10%,transparent);font-size:12.5px}
.ad-when{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px 14px;align-items:end;margin:0 0 12px;padding:8px 12px 10px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:8px}
.ad-when legend{font-weight:700;font-size:12px;padding:0 4px}
.ad-dialog label{display:grid;gap:3px;font-size:12px;font-weight:600}.ad-dialog label small{font-weight:400;opacity:.75}
.ad-check-l{display:flex!important;align-items:center;gap:6px!important}
.ad-card{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:8px;padding:8px 12px;margin:0 0 8px}
.ad-line{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:end}.ad-line input{width:7em}.ad-pilot select{min-width:250px}.ad-ferry select{max-width:320px;margin-left:4px}.ad-line .ad-grow{flex:1;min-width:240px}.ad-line select{width:100%}
.ad-del{margin-left:auto;font-size:15px;cursor:pointer;background:none;border:0;color:inherit;opacity:.6}.ad-del:hover{opacity:1}
.ad-ferry{margin:6px 0 0;font-size:12.5px}.ad-ferry input{width:5em;margin-left:4px}.ad-checks{margin:6px 0 0}
.ad-foot{display:flex;gap:8px;align-items:center;padding:10px 16px;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent)}.ad-msg{flex:1;margin:0;font-size:12.5px}
html[data-skeuo] .ad-dialog,html[data-skeuo] .ad-card,html[data-skeuo] .ad-when,html[data-skeuo] .ad-chip{border-radius:0}
</style>`);
    if (!dlg.open) dlg.showModal();
    return dlg;
  }

  window.AssignDialog = {
    open
  };
})();
