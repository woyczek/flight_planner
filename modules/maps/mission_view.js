// V3 maps — cartes de mission (modules/maps/SPEC.md § 15) : #maps?mission=<ID>&map=<fichier> redessine une carte d'après le
// YAML de la mission (mission.js) : son profil d'affichage, son emprise, ses points et zones, son cheminement ; le choix du vol
// ou de la mission et de sa carte est dans le contenu Couches.

import {
  S,
  esc,
  tt,
  flightPath,
  setData
} from './state.js';
import {
  unwrapLons
} from '../../frame/lib/geo.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  viewOf
} from './data.js';
import {
  header,
  status,
  showBox
} from './screen.js';
import {
  buildProfile
} from './profile_view.js';

/** Chemin du YAML d'une mission : missions/<l>_<FAMILLE>/<ID>/mission<ID>.yaml (l'identifiant capturé). */
const MISSION_YAML = /^missions\/[^/]+\/([^/]+)\/mission[^/]*\.ya?ml$/i;
/** Missions du dépôt (chemins du YAML de chaque dossier ; liste de l'arbre, rien n'est lu) : [{ id, path }]. */
async function missionList() {
  const paths = await S.ctx.data.list('missions/').catch(() => null) || [];
  return paths.map(path => ({
    id: MISSION_YAML.exec(path)?.[1],
    path
  })).filter(x => x.id).sort((a, b) => a.id.localeCompare(b.id));
}
/** Le rôle d'un point de mission, dit dans la langue (départ, arrivée, cible, dégagement, rendez-vous) ; '' sans rôle connu. */
export const roleText = p => {
  const k = TX.mRoles[p.role] ? p.role : /^RDV|^RENDEZ/i.test(p.id || '') ? 'RDV' : '';
  return k ? tt(TX.mRoles[k]) : '';
};
/** Sans mission dans l'adresse : la Carte lit celle du vol courant (flight.mission, écrit par « Préparer ce vol ») et se montre comme
 *  pour #maps?mission=<ID> ; #maps?flight=1 (le bandeau retiré, ou le vol choisi dans Couches) garde le vol et ses couches. Une
 *  mission que le dépôt n'a pas (ou un mode « choisir sur la carte », un réglage) laisse le vol. Pose S.missionId. */
export async function deriveMission() {
  const q = S.ctx.query || {};
  if (S.missionId || q.flight || q.tune || q.choose) return;
  const f = await S.ctx.data.get(flightPath()).catch(() => null);
  if (!S) return;
  const id = typeof f?.mission === 'string' ? f.mission.trim() : '';
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,40}$/.test(id) || f?.started?.at) return; // un vol démarré se regarde en vol
  const list = await missionList();
  if (!S) return;
  if (list.some(x => x.id === id)) S.missionId = id;
}
/** Points du cheminement de la mission : route_points écrits par le studio, sinon le texte (vertical_profile.route,
 *  sinon départ, points tournants, destination) résolu par les points de la mission, puis par aerodb. */
async function missionRoute(mission) {
  const v = mission.vprof;
  if (v.routePoints.length >= 2) return v.routePoints;
  const text = MapsMission.routeTokens(mission),
    own = new Map(),
    K = MapsMission.keyNorm;
  for (const p of mission.points) {
    if (p.id) own.set(K(p.id), p);
    if (p.name) own.set(K(p.name), p);
  }
  for (const z of mission.zones) own.set(K(z.id), z);
  const ext = new Map();
  if (S.ctx.aerodb)
    for (const tok of new Set(text.split(/[\s,;]+/).map(t => t.split('/')[0].trim()).filter(Boolean)))
      if (!own.has(K(tok)) && /^[A-Z0-9]{2,5}$/i.test(tok)) {
        const c = await S.ctx.aerodb.coords(tok).catch(() => null);
        if (c) ext.set(tok.toUpperCase(), c);
      }
  const resolve = name => {
    const p = own.get(K(name)) || ext.get(String(name).toUpperCase());
    return p ? {
      name: p.id || name,
      lat: p.lat,
      lon: p.lon
    } : null;
  };
  try {
    // niveaux du texte gardés (lvl : niveau de croisière à partir du point ; alt : altitude à atteindre au point)
    return SiaProfile.parseRoute(text, resolve).points.map(p => ({
      id: p.name,
      lat: p.lat,
      lon: p.lon,
      ...(Number.isFinite(p.alt) ? {
        alt: p.alt
      } : {}),
      ...(p.lvl ? {
        lvl: p.lvl
      } : {})
    }));
  } catch {
    return [];
  }
}
/** Mission (re)lue et carte choisie : profil, emprise, cheminement tracé si la carte le demande, profil vertical. */
export async function applyMission() {
  const q = {
      ...(S.ctx.query || {}),
      mission: S.missionId
    },
    list = await missionList(),
    hit = list.find(x => x.id === q.mission);
  if (!S) return;
  S.missions = list;
  S.mission = null;
  S.missionError = '';
  if (!hit) S.missionError = tt(TX.missionMissing, {
    m: q.mission
  });
  else try {
    const r = await S.ctx.data.read(hit.path, {
        policy: 'reference',
        wait: true
      }),
      text = typeof r?.value === 'string' ? r.value : r?.text;
    if (!S) return; // la Carte a été quittée pendant la lecture
    if (!text) throw new Error('empty');
    S.mission = MapsMission.parse(window.jsyaml.load(text));
    S.mission.id ||= hit.id;
    S.missionRev = r.rev || '';
  } catch (e) {
    S.missionError = tt(TX.missionBad, {
      e: e?.message || e
    });
  }
  if (!S) return;
  const M = S.mission,
    m = M ? M.maps.find(x => x.file === q.map) || M.maps[0] || null : null,
    chosen = m ? MapsMission.profileFor(m, window.MAPS_PROFILES) : {
      profile: window.MAPS_PROFILES.find(p => p.id === 'ifr-simple'),
      source: 'builtin-type'
    };
  S.mapDef = m;
  S.missionPts = M ? M.points.map(p => ({
    ...p,
    sub: roleText(p)
  })) : null;
  S.profile = chosen.profile;
  S.profileSource = chosen.source;
  S.vprofProfile = M?.vprof.profileDef || window.MAPS_PROFILES.find(p => p.id === 'vprof') || null;
  const pts = unwrapLons(M ? await missionRoute(M) : []); // cheminement d'un seul tenant au-delà de la ligne de changement de date
  if (!S) return;
  const trace = m?.trace || (M?.vprof.onMap !== false && pts.length > 1 ? 'route' : 'none'),
    shown = trace === 'route' || trace === 'both' ? pts : [];
  S.route = {
    flight: {
      profile: M?.vprof.rates || null
    },
    points: shown,
    profilePoints: pts,
    altn: null,
    levelFt: M?.vprof.cruiseFt || 0,
    updated: `${q.mission}|${m?.file || ''}|${S.missionRev || ''}`
  };
  // #maps?mission=…&zone=<id> : la vue est cette zone, sauf si l'adresse désigne une carte fournie (&map=, déjà centrée sur elle, à son échelle)
  const zoneFit = q.zone && !(q.map && M?.maps.some(x => x.file === q.map)) ? MapsMission.zoneBox(M, q.zone) : null;
  S.fit = viewOf() || zoneFit || m?.extent || MapsRender.bboxOf(unwrapLons([...pts, ...(M?.points || [])]), 10) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.marks = shown.length > 1 ? MapsRender.marks(shown) : [];
  S.data = null;
  S.cursor = null;
  showBox(!!M);
  header();
  fillPick();
  missionUi();
  status();
  schedule();
  buildProfile();
}
/** Choix de la carte : vol prévu, puis chaque mission du dépôt ; pour une mission, ses cartes. */
export async function fillPick() {
  const q = S.ctx.query || {},
    list = S.missions || await missionList();
  if (!S) return;
  S.missions = list;
  const cur = S.missionId ? `m:${S.missionId}` : 'flight',
    html = `<option value="flight">${esc(tt(TX.flight))}</option>${list.length ? `<optgroup label="${esc(tt(TX.missionsGroup))}">${list.map(x => `<option value="m:${esc(x.id)}">${esc(x.id)}</option>`).join('')}</optgroup>` : ''}`;
  if (S.pickEl.innerHTML !== html) S.pickEl.innerHTML = html;
  S.pickEl.value = cur;
  const maps = S.mission?.maps || [],
    mh = maps.map(m => `<option value="${esc(m.file)}">${esc(m.description || m.file)}</option>`).join('');
  S.mapPickEl.hidden = maps.length < 2;
  if (S.mapPickEl.innerHTML !== mh) S.mapPickEl.innerHTML = mh;
  if (S.mapDef) S.mapPickEl.value = S.mapDef.file;
}
/** Adresse de la carte choisie (le cadre remonte le module sur sa nouvelle suite d'adresse). */
function go(mission, map) {
  location.hash = mission ? `#maps?mission=${encodeURIComponent(mission)}${map ? `&map=${encodeURIComponent(map)}` : ''}` : '#maps?flight=1';
}
/** Gestes du choix de la carte (contenu Couches) : un vol ou une mission, puis une carte de la mission ; et la mission montrée
 *  relue quand son YAML change. Rend la fonction d'arrêt de l'écoute. */
export function missionEvents() {
  S.pickEl.addEventListener('change', () => {
    const v = S.pickEl.value;
    go(v.startsWith('m:') ? v.slice(2) : '', '');
  });
  S.mapPickEl.addEventListener('change', () => go(S.missionId, S.mapPickEl.value));
  S.mbarEl.addEventListener('change', e => {
    if (e.target.matches('.mp-mb-sel')) go(S.missionId, e.target.value);
  });
  S.mbarEl.addEventListener('click', e => {
    if (e.target.closest('[data-mbx]')) go('', ''); // le bandeau retiré : le vol et ses couches
  });
  if (!S.missionId) return () => {};
  return S.ctx.data.watch('missions/', paths => {
    if (S && (paths || []).some(p => MISSION_YAML.exec(p)?.[1] === S.missionId)) applyMission();
  });
}
/** La famille d'une mission : celle du dossier missions/<n>_<FAMILLE>/<ID>/ (rien n'est lu pour la connaître). */
const familyOf = id => {
  const hit = (S.missions || []).find(x => x.id === id),
    m = /^missions\/[^/]*?_([^/]+)\//.exec(hit?.path || '');
  return m ? m[1] : '';
};
/** Le bandeau de mission (SOG-0137) : titre, identifiant, famille, la carte fournie montrée et le choix des cartes (sept au plus),
 *  et de quoi le retirer — les couches du vol reviennent. Écrit seulement s'il change. */
export function bannerFill() {
  const el = S?.mbarEl;
  if (!el) return;
  const M = S.mission,
    on = !!S.missionId && !!M,
    maps = (M?.maps || []).slice(0, 7),
    cur = S.mapDef?.file || '',
    fam = familyOf(S.missionId),
    html = on ? `<div class="mp-mb-top"><b class="mp-mb-t">${esc(M.title || M.id || S.missionId)}</b><button type="button" class="mp-mb-x" data-mbx title="${esc(tt(TX.mbRemove))}" aria-label="${esc(tt(TX.mbRemove))}">×</button></div>
<div class="mp-mb-sub"><span class="mp-mb-id">${esc(M.id || S.missionId)}</span>${fam ? ` · <span class="mp-mb-fam">${esc(fam)}</span>` : ''}</div>${maps.length > 1 ? `<label class="mp-mb-map"><span>${esc(tt(TX.mbMap))}</span><select class="mp-mb-sel" aria-label="${esc(tt(TX.mbMap))}">${maps.map(m => `<option value="${esc(m.file)}"${m.file === cur ? ' selected' : ''}>${esc(m.description || m.file)}</option>`).join('')}</select></label>` : maps.length === 1 ? `<div class="mp-mb-sub">${esc(maps[0].description || maps[0].file)}</div>` : ''}` : '';
  if (el.hidden === on) el.hidden = !on;
  if (el.innerHTML !== html) el.innerHTML = html;
  setData(el, 'maps', String(maps.length));
}
/** Ce qui change quand la Carte est sur une mission sans l'avoir demandée dans l'adresse : les cases des couches (le choix seul, comme
 *  pour une adresse), le nom du bouton, le bandeau. */
export function missionUi() {
  if (!S) return;
  const on = !!S.missionId,
    set = S.layersEl?.querySelector('.mp-layer-set');
  if (set && set.hidden !== on) set.hidden = on;
  const name = tt(on ? TX.pick : TX.layers),
    b = S.layersBtn;
  if (b && b.title !== name) {
    b.title = name;
    b.setAttribute('aria-label', name);
  }
  bannerFill();
}
