// Planificateur de performances : bloc « Profil vertical ». Coupe le long d'une route (saisie, ou
// importée du dernier OFP SimBrief) avec le module du studio SIA (SIA XML/vertical_profile.js) : relief,
// espaces et obstacles selon un profil d'affichage du studio (par défaut celui choisi dans le studio
// pour le profil vertical), base SIA mémorisée par le studio (même navigateur).
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

  // Route du dernier OFP SimBrief : départ, points du navlog (coordonnées et altitude prévue), arrivée.
  async function simbriefRoute() {
    let o = await loadOFP();
    if (!o && $('simBtn')) { $('simBtn').click(); for (let i = 0; i < 40 && !(o = await loadOFP()); i++) await new Promise(r => setTimeout(r, 500)); }
    if (!o) throw Error('Aucun OFP SimBrief : « Récupérer dernier FPL SimBrief » ou import du JSON OFP.');
    const raw = o.raw || o, fixes = findNavlog(raw) || [], num = v => parseFloat(v), out = [];
    const add = (id, lat, lon, alt) => { lat = num(lat); lon = num(lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) return; id = String(id || 'WPT').replace(/[\s,;/]+/g, '') || 'WPT'; if (out.length && out[out.length - 1].id === id) return; out.push({ id, text: `${id} ${lat.toFixed(4)} ${lon.toFixed(4)}${Number.isFinite(alt) && alt > 0 ? '/' + Math.round(alt) : ''}` }); };
    const org = raw.origin, dst = raw.destination;
    if (org) add(org.icao_code, org.pos_lat, org.pos_long, num(org.elevation));
    for (const f of fixes) if (f && typeof f === 'object') add(f.ident || f.name, f.pos_lat, f.pos_long, num(f.altitude_feet));
    if (dst) add(dst.icao_code, dst.pos_lat, dst.pos_long, num(dst.elevation));
    if (out.length < 2) throw Error('OFP sans points de navigation exploitables.');
    return out.map(x => x.text).join(',\n');
  }

  async function draw() {
    if (!studio) await loadData();
    const base = studio.base || {}, aero = base.aero || {}, profile = studio.list.find(p => p.id === $('vpProfile').value) || studio.list[0];
    const { points, unknown } = SiaProfile.parseRoute($('vpRoute').value, SiaProfile.resolver({ aero }));
    if (unknown.length) throw Error('Point(s) inconnu(s) : ' + unknown.join(', ') + (studio.base ? '' : ' (base SIA absente : seuls les points en coordonnées sont reconnus)'));
    terrain ??= SiaProfile.terrainSampler();
    status('Calcul du profil (relief, espaces, obstacles)…');
    const obstacles = SiaProfile.opt(profile, 'obstacles', false) ? (aero.obstacles || []).filter(o => (o.hgt || 0) >= (+SiaProfile.opt(profile, 'obstacleMin', 300) || 0)) : [];
    const data = await SiaProfile.build({ points, elevation: terrain, airspaces: SiaProfile.selectAirspaces(profile, base.airspaces || [], { aliases: studio.aliases, limitFt: SiaAero.limitFt }), obstacles });
    const W = 1600, H = 576, c = document.createElement('canvas'); c.width = W; c.height = H;
    SiaProfile.draw(c.getContext('2d'), data, { W, H, scale: W / 1200, ceiling: +$('vpCeil').value || 0, floor: +$('vpFloor').value || 0, limitFt: SiaAero.limitFt, abbrev: !!SiaProfile.opt(profile, 'zoneAbbrev', false),
      title: `Profil vertical — ${points[0].name} → ${points[points.length - 1].name} (${(data.total / 1852).toFixed(0)} NM)` });
    $('vpImg').src = c.toDataURL('image/png'); $('vpImg').hidden = false; $('vpSave').disabled = false;
    status(`${(data.total / 1852).toFixed(1)} NM, ${data.crossed.length} traversée(s) d’espace, ${data.obstacles.length} obstacle(s) à moins de 1 NM — profil « ${profile.name} ».`);
  }

  $('vpDraw').onclick = () => { store(); draw().catch(e => status(e.message, true)); };
  $('vpSimbrief').onclick = async () => { try { $('vpRoute').value = await simbriefRoute(); store(); await draw(); } catch (e) { status(e.message, true); } };
  $('vpSave').onclick = () => { const a = document.createElement('a'); a.href = $('vpImg').src; a.download = 'profil_vertical.png'; a.click(); };
  for (const id of ['vpRoute', 'vpFloor', 'vpCeil']) $(id).addEventListener('change', store);
  loadData().catch(e => status(e.message, true));
})();
