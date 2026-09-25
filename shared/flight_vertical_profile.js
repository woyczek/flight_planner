// Planificateur de performances : bloc « Profil vertical ». Coupe le long d'une route (saisie, ou reprise
// de l'OFP SimBrief importé par le bouton d'en-tête) avec le module du studio SIA
// (SIA XML/vertical_profile.js) : relief, espaces et obstacles selon un profil d'affichage du studio (par
// défaut celui choisi dans le studio pour le profil vertical), base SIA mémorisée par le studio (même
// navigateur), trajectoire prévue aux taux de montée / descente du profil avion actif (TOC, TOD).
(() => {
  const $ = id => document.getElementById(id);
  if (!$('vpDraw') || !window.SiaProfile) return;
  const KEY = 'flightPerfVerticalProfile', esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ALL_ZONES = { id: 'vprof', name: 'Profil vertical (toutes les zones)', zones: ['R', 'D', 'P', 'CTR', 'TMA', 'CTA', 'SIV', 'TRA', 'RMZ', 'TMZ', 'PJE'], elements: {} };
  let studio = null, terrain = null;
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify({ route: $('vpRoute').value, floor: +$('vpFloor').value || 0, ceiling: +$('vpCeil').value || 0 })); } catch { /* préférence seulement */ } };
  $('vpRoute').value = saved.route || ''; $('vpFloor').value = saved.floor || 0; $('vpCeil').value = saved.ceiling || 0;
  const status = (text, err) => { $('vpStatus').innerHTML = err ? `<span style="color:#ff8a80">${esc(text)}</span>` : esc(text); };

  // Base SIA et profils du studio ; profil proposé = dernière sélection du studio pour le profil vertical.
  async function loadData() {
    studio = await SiaProfile.loadStudio();
    studio.list = studio.profiles.length ? studio.profiles : [ALL_ZONES];
    const sel = $('vpProfile'), keep = sel.value;
    sel.innerHTML = studio.list.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    const want = keep || studio.profileId; sel.value = studio.list.some(p => p.id === want) ? want : studio.list[0].id;
    const b = studio.base;
    status(b ? `Base SIA du studio : ${b.airspaces?.length || 0} espaces, ${b.aero?.aerodromes?.length || 0} aérodromes, ${b.aero?.navaids?.length || 0} balises, ${b.aero?.points?.length || 0} points RNAV.`
      : 'Base SIA absente : ouvrir le studio cartographique (Missions SIA) dans ce navigateur et y charger le dossier SIA une fois. Sans elle, route en coordonnées ou SimBrief, sans espaces aériens.');
  }

  // Route d'un OFP SimBrief : départ, groupe vitesse / niveau initial (TAS de croisière, niveau initial),
  // points du navlog en coordonnées (TOC / TOD recalculés ici, donc écartés), paliers de croisière
  // (changement d'altitude en phase CRZ → nouveau groupe au point), arrivée.
  function routeFromOfp(raw) {
    const fixes = findNavlog(raw) || [], num = v => parseFloat(v), items = [], gen = raw.general || {};
    const tas = Math.round(num(gen.cruise_tas) || num(active?.cruise?.tasKt) || 0), group = ft => tas > 0 && ft > 0 ? `N${String(tas).padStart(4, '0')}F${String(Math.round(ft / 100)).padStart(3, '0')}` : '';
    let level = num(gen.initial_altitude) || 0, lastId = '';
    const point = (id, lat, lon) => { lat = num(lat); lon = num(lon); id = String(id || 'WPT').replace(/[\s,;/]+/g, '') || 'WPT'; if (!Number.isFinite(lat) || !Number.isFinite(lon) || id === lastId) return false; lastId = id; items.push(`${id} ${lat.toFixed(4)} ${lon.toFixed(4)}`); return true; };
    const org = raw.origin, dst = raw.destination;
    if (org && point(org.icao_code, org.pos_lat, org.pos_long) && group(level)) items.push(group(level));
    for (const f of fixes) {
      if (!f || typeof f !== 'object' || /^(TOC|TOD)$/i.test(f.ident || '')) continue;
      if (!point(f.ident || f.name, f.pos_lat, f.pos_long)) continue;
      const alt = num(f.altitude_feet);
      if (/CRZ/i.test(f.stage || '') && level && alt && Math.abs(alt - level) >= 500) { level = alt; items[items.length - 1] += '/' + group(level); }
    }
    if (dst) point(dst.icao_code, dst.pos_lat, dst.pos_long);
    if (items.filter(x => !/^N\d{4}F/.test(x)).length < 2) throw Error('OFP sans points de navigation exploitables.');
    return items.join(',\n');
  }

  // Taux recommandés du profil avion actif (sinon valeurs par défaut du module).
  const rates = () => { const a = typeof active !== 'undefined' ? active : null; return { climb: { fpm: +a?.climb?.rateFpm, kt: +a?.climb?.tasKt }, descent: { fpm: Math.abs(+a?.descent?.rateFpm), kt: +a?.descent?.tasKt } }; };

  async function draw() {
    if (!studio) await loadData();
    const base = studio.base || {}, aero = base.aero || {}, profile = studio.list.find(p => p.id === $('vpProfile').value) || studio.list[0];
    const { points, unknown } = SiaProfile.parseRoute($('vpRoute').value, SiaProfile.resolver({ aero }));
    if (unknown.length) throw Error('Point(s) inconnu(s) : ' + unknown.join(', ') + (studio.base ? '' : ' (base SIA absente : seuls les points en coordonnées sont reconnus)'));
    terrain ??= SiaProfile.terrainSampler();
    status('Calcul du profil (relief, espaces, obstacles, trajectoire)…');
    const obstacles = SiaProfile.opt(profile, 'obstacles', false) ? (aero.obstacles || []).filter(o => (o.hgt || 0) >= (+SiaProfile.opt(profile, 'obstacleMin', 300) || 0)) : [];
    const r = rates(), data = await SiaProfile.build({ points, elevation: terrain, ...r, airspaces: SiaProfile.selectAirspaces(profile, base.airspaces || [], { aliases: studio.aliases, limitFt: SiaAero.limitFt }), obstacles });
    const W = 1600, H = 576, c = document.createElement('canvas'); c.width = W; c.height = H;
    SiaProfile.draw(c.getContext('2d'), data, { W, H, scale: W / 1200, ceiling: +$('vpCeil').value || 0, floor: +$('vpFloor').value || 0, limitFt: SiaAero.limitFt, abbrev: !!SiaProfile.opt(profile, 'zoneAbbrev', false),
      title: `Profil vertical — ${points[0].name} → ${points[points.length - 1].name} (${(data.total / 1852).toFixed(0)} NM)` });
    $('vpImg').src = c.toDataURL('image/png'); $('vpImg').hidden = false;
    const p = data.plan, nm = m => (m / 1852).toFixed(0);
    status(`${(data.total / 1852).toFixed(1)} NM, ${data.crossed.length} traversée(s) d’espace, ${data.obstacles.length} obstacle(s) — profil « ${profile.name} »`
      + (p ? ` ; montée ${p.climb.fpm} ft/min à ${p.climb.kt} kt, descente ${p.descent.fpm} ft/min à ${p.descent.kt} kt${r.climb.fpm > 0 ? '' : ' (valeurs par défaut : profil avion sans taux)'} ; TOC ${nm(p.toc.s)} NM, TOD ${nm(p.tod.s)} NM.` : ' ; pas de niveau indiqué (VFR) : trajectoire non tracée.'));
  }

  // L'OFP importé par le bouton d'en-tête (« Récupérer dernier FPL SimBrief ») ou le fichier OFP donne la
  // route : storeOFP (enregistrement de l'OFP par la page) est complété pour la reprendre et tracer.
  if (typeof storeOFP === 'function') {
    const original = storeOFP;
    storeOFP = async function (raw, ...rest) { const out = await original.call(this, raw, ...rest); try { $('vpRoute').value = routeFromOfp(raw); store(); await draw(); } catch (e) { status(e.message, true); } return out; };
  }
  $('vpDraw').onclick = () => { store(); draw().catch(e => status(e.message, true)); };
  for (const id of ['vpRoute', 'vpFloor', 'vpCeil']) $(id).addEventListener('change', store);
  loadData().then(async () => { if ($('vpRoute').value.trim()) return; const o = await loadOFP(); if (o) { $('vpRoute').value = routeFromOfp(o.raw || o); store(); } }).catch(e => status(e.message, true));
})();
