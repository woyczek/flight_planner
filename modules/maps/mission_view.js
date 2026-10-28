// V3 maps — cartes de mission (modules/maps/SPEC.md § 15) : #maps?mission=<ID>&map=<fichier> redessine une carte d'après le
// YAML de la mission (mission.js) : son profil d'affichage, son emprise, ses points et zones, son cheminement ; le choix du vol
// ou de la mission et de sa carte est dans le contenu Couches.

import {
  S,
  esc,
  tt
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
  const q = S.ctx.query || {},
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
  S.fit = viewOf() || m?.extent || MapsRender.bboxOf(unwrapLons([...pts, ...(M?.points || [])]), 10) || {
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
  const cur = q.mission ? `m:${q.mission}` : 'flight',
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
  location.hash = mission ? `#maps?mission=${encodeURIComponent(mission)}${map ? `&map=${encodeURIComponent(map)}` : ''}` : '#maps';
}
/** Gestes du choix de la carte (contenu Couches) : un vol ou une mission, puis une carte de la mission ; et la mission montrée
 *  relue quand son YAML change. Rend la fonction d'arrêt de l'écoute. */
export function missionEvents() {
  S.pickEl.addEventListener('change', () => {
    const v = S.pickEl.value;
    go(v.startsWith('m:') ? v.slice(2) : '', '');
  });
  S.mapPickEl.addEventListener('change', () => go(S.ctx.query?.mission, S.mapPickEl.value));
  if (!S.ctx.query?.mission) return () => {};
  return S.ctx.data.watch('missions/', paths => {
    if (S && (paths || []).some(p => MISSION_YAML.exec(p)?.[1] === S.ctx.query.mission)) applyMission();
  });
}
