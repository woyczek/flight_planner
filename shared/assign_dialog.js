(() => {
  'use strict';
  // Centre : affecter une mission à un ou plusieurs pilotes (docs/AFFECTATION_MISSIONS.md, § 2 et § 5). Ouvert par le bouton
  // « Affecter… » du détail d'une mission (registre des missions).
  //   · heure : décollage (UTC), ou heure H d'un exercice (décollage de chaque participant = H + son décalage,
  //     exercise.participants[].takeoff « H-20 ») ; mission d'astreinte : prêt à, préavis, fin d'astreinte ;
  //   · participants (patrouille : + équipier) : pilote (référence DEFA ; disponibilité de sa semaine type à l'heure du
  //     décollage, qualification sur le type), appareil du type demandé (flotte : basé au terrain de départ d'abord ;
  //     ailleurs → convoyage : distance / vitesse de croisière + 20 min, décollage du convoyage), indicatif (suivi : 31, 32…) ;
  //   · conflits : même pilote ou même appareil déjà affecté sur le créneau (bloc estimé + 30 min de remise en œuvre) ;
  //   · enregistrement : MissionAssignments.writeAssignment (affectations.yaml de la mission + index affectations.json).
  // API : AssignDialog.open(entrée du registre, yaml de la mission, { maps })
  const K = window.RepositoryKit,
    esc = K.esc,
    A = () => window.MissionAssignments;
  const TURN_MIN = 30,
    FERRY_SETUP_MIN = 20;
  const typeOf = s => String(s || '').trim().split(/\s+/)[0].toUpperCase();
  const icaoOf = p => /\(([A-Z]{4})\)/.exec(p?.name || '')?.[1] || '';
  const hhmm = ms => new Date(ms).toISOString().slice(11, 16) + 'Z';
  const nm = (a, b) => {
    const R = 3440.065,
      r = x => x * Math.PI / 180,
      dl = r(b.lat - a.lat),
      dg = r(b.lon - a.lon);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dg / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  /** « H-20 » → -20 (minutes) ; « H » → 0 ; heure réelle ignorée (0). */
  const offsetOf = s => {
    const m = /^H\s*([+-])\s*(\d+)/i.exec(String(s || '').trim());
    return m ? (m[1] === '-' ? -1 : 1) * +m[2] : 0;
  };
  /** Indicatif suivant d'une patrouille : MERCURE31 → MERCURE32 (dernier nombre + n). */
  const nextCallsign = (cs, n) => String(cs || '').replace(/(\d+)(?!.*\d)/, d => String(+d + n).padStart(d.length, '0'));

  // ---- terrains : coordonnées (base SIA du navigateur, puis aérodromes des missions du registre)
  let airports = null;
  async function airportsMap() {
    if (airports) return airports;
    airports = {};
    try {
      const base = await window.SiaBase?.get?.({
        any: true
      });
      for (const ad of base?.aero?.aerodromes || []) {
        const code = ad.icao || ad.code || ad.id;
        if (code && Number.isFinite(+ad.lat)) airports[code] = {
          lat: +ad.lat,
          lon: +ad.lon
        };
      }
    } catch {
      /* base SIA absente */ }
    try {
      const reg = JSON.parse(localStorage.getItem('missionRegistry:v1') || '{}');
      for (const m of reg.missions || [])
        for (const p of [m.origin, m.destination])
          if (p && typeof p === 'object' && icaoOf(p) && Number.isFinite(+p.lat)) airports[icaoOf(p)] = airports[icaoOf(p)] || {
            lat: +p.lat,
            lon: +p.lon
          };
    } catch {
      /* registre illisible */ }
    return airports;
  }
  // dernier recours : cache des terrains de la suite (missionAirports:v1), puis base mondiale des aérodromes (source
  // « airports » de repository_tree, réglable dans Paramètres › Maintenance › Sources), chargée une fois à la demande
  const AP_KEY = 'missionAirports:v1';
  let worldLoad = null;
  async function coordsOf(code, ap) {
    if (!code) return null;
    if (ap[code]) return ap[code];
    let cache = {};
    try {
      cache = JSON.parse(localStorage.getItem(AP_KEY) || '{}') || {};
    } catch {
      /* cache illisible */ }
    if (Number.isFinite(+cache[code]?.lat)) return ap[code] = {
      lat: +cache[code].lat,
      lon: +cache[code].lon
    };
    const url = window.RepositoryNav?.source?.('airports') || 'https://cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json';
    const world = await (worldLoad ||= fetch(url).then(r => r.ok ? r.json() : null).catch(() => null));
    const w = world?.[code];
    if (!w || !Number.isFinite(+w.lat)) return null;
    cache[code] = {
      ...(cache[code] || {}),
      icao: code,
      name: w.name,
      country: w.country,
      lat: +w.lat,
      lon: +w.lon,
      elevation: w.elevation,
      tz: w.tz
    };
    try {
      localStorage.setItem(AP_KEY, JSON.stringify(cache));
    } catch {
      /* stockage plein */ }
    return ap[code] = {
      lat: +w.lat,
      lon: +w.lon
    };
  }
  const cruiseKt = type => +window.AIRCRAFT_PERF?.[type]?.cruise?.tasKt || ({
    RFAL: 480,
    MIR2: 450,
    A332: 460,
    A400: 340,
    C30J: 300,
    PC21: 300
  })[type] || 250;

  let dlg = null;
  async function open(m, y, {
    maps = []
  } = {}) {
    const fleet = window.DEFA_FLEET || [],
      pilots = window.DEFA_REFERENCE?.pilots || [];
    const idx = await A().index({
      fresh: true
    });
    const existing = idx.assignments.filter(a => a.mission === m.id);
    const type = typeOf(y.aircraft?.[0]?.type || existing[0]?.aircraft?.type),
      departure = icaoOf(y.origin) || existing[0]?.departure || '',
      origin = y.origin && Number.isFinite(+y.origin.lat) ? {
        lat: +y.origin.lat,
        lon: +y.origin.lon
      } : null,
      callsign = y.aircraft?.[0]?.callsign || '',
      blockMin = +y.timing?.estimated_block_min || +y.timing?.estimated_flight_min || 120,
      ex = y.exercise,
      myOffset = offsetOf(ex?.participants?.find(p => p.mission === m.id)?.takeoff);
    const ap = await airportsMap();
    if (origin && departure) ap[departure] = ap[departure] || origin;
    // heure par défaut : affectation existante, sinon demain 10:00Z
    const t0 = Date.parse(existing[0]?.takeoff || '') || (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(10, 0, 0, 0);
      return +d;
    })();
    const toInput = ms => new Date(ms).toISOString().slice(0, 16);
    const rows = existing.length ? existing.map(a => ({
      pilot: a.pilot,
      registration: a.aircraft?.registration || '',
      callsign: a.callsign || ''
    })) : [{
      pilot: '',
      registration: '',
      callsign
    }];
    const alert0 = existing[0]?.alert || null;

    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'repo-ap-dialog ad-dialog';
      document.body.append(dlg);
    }
    const planes = fleet.filter(f => typeOf(f.type) === type || typeOf(f.variant) === type);
    const pilotList = pilots.map(p => p.trigram).filter(Boolean).sort();
    dlg.innerHTML = `<form method="dialog" class="ad-form">
      <h3>Affecter ${esc(m.id)} — ${esc(m.title || y.title || '')}</h3>
      <p class="small">Type demandé : <b>${esc(type || '?')}</b> · terrain de départ : <b>${esc(departure || '?')}</b> · bloc estimé ${esc(blockMin)} min${ex ? ` · exercice : décollage H${myOffset >= 0 ? '+' : ''}${myOffset} min` : ''}. Heures en UTC.</p>
      <div class="ad-grid">
        <label>${ex ? 'Heure H (UTC)' : 'Décollage (UTC)'}<input type="datetime-local" data-k="t" value="${esc(toInput(existing[0] && ex ? t0 - myOffset * 6e4 : t0))}"></label>
        <label><span><input type="checkbox" data-k="alert" ${alert0 || y.alert ? 'checked' : ''}> Mission d'astreinte</span><small>prêt à l'heure ci-dessus, décollage sur ordre</small></label>
        <label>Préavis (min)<input type="number" min="0" data-k="notice" value="${esc(alert0?.notice_min ?? y.alert?.notice_min ?? 15)}"></label>
        <label>Fin d'astreinte (h après)<input type="number" min="0" step="0.5" data-k="window" value="${esc(alert0?.window_end_utc ? (Date.parse(alert0.window_end_utc) - Date.parse(alert0.ready_at_utc)) / 36e5 : 2)}"></label>
      </div>
      <table class="ad-rows"><thead><tr><th>Pilote</th><th>Appareil</th><th>Indicatif</th><th>Contrôles</th><th></th></tr></thead><tbody></tbody></table>
      <p><button type="button" class="secondary" data-add>+ Équipier (patrouille)</button></p>
      <datalist id="adPilots">${pilotList.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <p class="ad-msg small" data-status></p>
      <p class="ad-actions"><button type="button" class="primary" data-save data-icon="save">Enregistrer l'affectation</button><button type="button" class="ghost" data-close>Fermer</button></p>
    </form>`;
    const $ = s => dlg.querySelector(s);
    const tbody = $('.ad-rows tbody');
    const takeoffOf = () => {
      const v = Date.parse($('[data-k="t"]').value + ':00Z');
      return ex ? v + myOffset * 6e4 : v;
    };
    const planeOpts = sel => `<option value="">— appareil —</option>${planes.map(p => {
      const away = departure && p.base && p.base !== departure;
      return `<option value="${esc(p.registration)}" ${p.registration === sel ? 'selected' : ''}>${esc(p.registration)} · ${esc(p.variant || p.type)} · ${esc(p.base || '?')}${away ? ' (convoyage)' : ''}${p.operational === false ? ' — indisponible' : ''}</option>`;
    }).join('')}<option value="__other">autre (saisie)…</option>`;
    const drawRows = () => {
      tbody.innerHTML = rows.map((r, i) => `<tr data-i="${i}"><td><input list="adPilots" data-r="pilot" value="${esc(r.pilot)}" maxlength="4" style="width:5em;text-transform:uppercase"></td>
        <td><select data-r="registration">${planeOpts(r.registration)}</select></td>
        <td><input data-r="callsign" value="${esc(r.callsign)}" style="width:9em;text-transform:uppercase"></td>
        <td class="ad-check small"></td><td>${i ? `<button type="button" class="ghost" data-del="${i}">✕</button>` : ''}</td></tr>`).join('');
      check();
    };
    /** Contrôles d'une ligne : disponibilité, qualification, conflits, convoyage ; retourne le participant. */
    const evaluate = async (r, i, t) => {
      const notes = [],
        plane = fleet.find(f => f.registration === r.registration);
      let ferry = null;
      if (plane && departure && plane.base && plane.base !== departure) {
        const a = await coordsOf(plane.base, ap),
          b = await coordsOf(departure, ap);
        const minutes = a && b ? Math.round(nm(a, b) / cruiseKt(type) * 60 + FERRY_SETUP_MIN) : null;
        ferry = {
          from: plane.base,
          minutes,
          takeoff: minutes ? new Date(t - (minutes + TURN_MIN) * 6e4).toISOString() : null
        };
        notes.push(minutes ? `convoyage ${plane.base} → ${departure} ≈ ${minutes} min (décollage ${hhmm(t - (minutes + TURN_MIN) * 6e4)})` : `convoyage depuis ${plane.base} : distance inconnue (terrain sans coordonnées connues)`);
      }
      if (plane?.operational === false) notes.push('<span class="err">appareil non opérationnel</span>');
      const p = pilots.find(x => x.trigram === r.pilot);
      if (r.pilot && !p) notes.push('<span class="warn">trigramme inconnu de la référence</span>');
      if (p && type && !(p.types || []).some(x => typeOf(x) === type)) notes.push(`<span class="warn">pas de vol connu sur ${esc(type)}</span>`);
      if (r.pilot) {
        // disponibilité à l'heure (codes de l'ODV) : dispo couvrant la famille → ok ; dispo d'un autre rôle → avertissement
        const av = await A().availability(r.pilot),
          start = ferry?.takeoff ? Date.parse(ferry.takeoff) : t,
          s = A().availabilityAt(av, start, m.type);
        notes.push(!s ? 'disponibilité non renseignée' : s.ok ? `<span class="ok">${esc(s.code)} — ${esc(s.label)}</span>` : s.category === 'dispo' ? `<span class="warn">${esc(s.code)} — ${esc(s.label)} (autre rôle que ${esc(m.type || '?')})</span>` : `<span class="err">${esc(s.code)} — ${esc(s.label)}</span>`);
      }
      // conflits avec les autres affectations
      const from = (ferry?.takeoff ? Date.parse(ferry.takeoff) : t),
        to = t + (blockMin + TURN_MIN) * 6e4;
      for (const o of idx.assignments.filter(o => o.mission !== m.id)) {
        const os = Date.parse(o.ferry?.takeoff || o.takeoff || ''),
          oe = Date.parse(o.takeoff || '') + ((+o.block_min || 120) + TURN_MIN) * 6e4;
        if (!os || os >= to || oe <= from) continue;
        if (r.pilot && o.pilot === r.pilot) notes.push(`<span class="err">${esc(r.pilot)} déjà affecté : ${esc(o.mission)} ${hhmm(os)}</span>`);
        if (r.registration && o.aircraft?.registration === r.registration) notes.push(`<span class="err">${esc(r.registration)} déjà pris : ${esc(o.mission)}</span>`);
      }
      if (rows.some((x, j) => j !== i && x.pilot && x.pilot === r.pilot)) notes.push('<span class="err">pilote en double</span>');
      if (rows.some((x, j) => j !== i && x.registration && x.registration === r.registration)) notes.push('<span class="err">appareil en double</span>');
      return {
        notes,
        participant: {
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
          takeoff: new Date(t + i * 6e4).toISOString(), // équipiers : une minute d'écart
          ferry: ferry?.minutes ? ferry : null,
          block_min: blockMin,
          status: 'affectée'
        }
      };
    };
    let last = [];
    async function check() {
      const t = takeoffOf();
      last = [];
      for (const [i, r] of rows.entries()) {
        const e = await evaluate(r, i, t);
        last.push(e);
        const cell = tbody.querySelector(`tr[data-i="${i}"] .ad-check`);
        if (cell) cell.innerHTML = e.notes.join(' · ') || '—';
      }
    }
    tbody.addEventListener('change', e => {
      const tr = e.target.closest('tr[data-i]'),
        i = +tr.dataset.i,
        k = e.target.dataset.r;
      let v = e.target.value.trim();
      if (k === 'pilot') v = v.toUpperCase();
      if (k === 'registration' && v === '__other') v = (prompt('Immatriculation de l’appareil') || '').trim().toUpperCase();
      rows[i][k] = v;
      if (k === 'registration' && v === '') e.target.value = '';
      check();
    });
    tbody.addEventListener('click', e => {
      const d = e.target.closest('[data-del]');
      if (!d) return;
      rows.splice(+d.dataset.del, 1);
      drawRows();
    });
    $('[data-add]').onclick = () => {
      rows.push({
        pilot: '',
        registration: '',
        callsign: nextCallsign(rows[0]?.callsign || callsign, rows.length)
      });
      drawRows();
    };
    dlg.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', check));
    $('[data-close]').onclick = () => dlg.close();
    $('[data-save]').onclick = async () => {
      const msg = $('.ad-msg');
      await check();
      if (!rows.every(r => r.pilot && r.registration)) {
        msg.innerHTML = '<span class="err">Chaque participant a besoin d’un pilote et d’un appareil.</span>';
        return;
      }
      const t = takeoffOf(),
        isAlert = $('[data-k="alert"]').checked;
      const alert = isAlert ? {
        ready_at_utc: new Date(t).toISOString(),
        aerodrome: departure,
        notice_min: +$('[data-k="notice"]').value || 0,
        window_end_utc: new Date(t + (+$('[data-k="window"]').value || 2) * 36e5).toISOString()
      } : null;
      try {
        const f = await A().writeAssignment({
          ...m,
          maps
        }, last.map(e => e.participant), {
          h_hour: ex ? new Date(t - myOffset * 6e4).toISOString() : null,
          alert
        });
        msg.innerHTML = `<span class="ok">Affectation enregistrée : data/missions/${esc(f)} (et l’index affectations.json).</span>`;
        window.AppFramework?.notify?.(`${m.id} affectée à ${rows.map(r => r.pilot).join(', ')}.`, 'ok');
      } catch (e) {
        msg.innerHTML = `<span class="err">Affectation non enregistrée : ${esc(e.message)}</span>`;
      }
    };
    drawRows();
    if (!document.getElementById('adCss')) document.head.insertAdjacentHTML('beforeend', `<style id="adCss">.ad-dialog{max-width:min(980px,96vw);width:100%}.ad-form h3{margin:0 0 4px}
.ad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px 14px;margin:8px 0}.ad-grid label{display:grid;gap:3px;font-size:12px;font-weight:600}
.ad-grid small{font-weight:400;opacity:.75}.ad-rows{width:100%;border-collapse:collapse;margin:6px 0}.ad-rows th,.ad-rows td{padding:4px 6px;text-align:left;vertical-align:top;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}
.ad-rows select{max-width:300px}.ad-check{min-width:220px}.ad-actions{display:flex;gap:8px}</style>`);
    dlg.showModal();
  }

  window.AssignDialog = {
    open
  };
})();
