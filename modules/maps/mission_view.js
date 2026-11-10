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
  schedule,
  relief
} from './draw.js';
import {
  viewOf,
  saveUi,
  invalidate
} from './data.js';
import {
  themeProfile,
  effectiveProfile
} from './layers.js';
import {
  header,
  status,
  showBox,
  styleFor
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
  if (list.some(x => x.id === id)) {
    S.missionAside =
      id; // SOG-0193 L1 : le vol reste en vue vol, la mission passe en surimpression (zones, points à rôle, fenêtre) ; S.missionId ne vient que de l'adresse
    S.missionWanted = '';
  } else S.missionWanted =
    id; // le vol nomme une mission que la liste ne donne pas (encore) : l'arbre du dépôt peut arriver après le montage (SOG-0196)
}
/** La liste des missions a changé (l'arbre du dépôt est arrivé, une synchronisation a passé) : la mission que le vol nomme est cherchée de nouveau ; trouvée, la Carte
 *  se met sur elle (bandeau compris) sans qu'on la recharge. */
export async function retryMission() {
  if (!S || S.missionId || S.missionAside || !S.missionWanted) return;
  await deriveMission();
  if (S?.missionAside) await loadAside();
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
/** La mission lue (YAML du dépôt, analysé) dans S.mission, ou S.missionError ; commun à la vue mission (applyMission) et à la surimpression (loadAside). */
async function loadMission(id) {
  const q = {
      mission: id
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
}
/** Le vol nomme une mission (SOG-0193 L1) : la Carte reste en vue vol (météo, procédures, Édition, couches, itinéraires) et la mission passe en surimpression : ses zones,
 *  ses points à rôle, sa fenêtre ; la carte de la mission (cartes fournies, vues) est un lien de la fenêtre. */
export async function loadAside() {
  if (!S?.missionAside) return;
  await loadMission(S.missionAside);
  if (!S) return;
  S.missionPts = S.mission ? S.mission.points.map(p => ({
    ...p,
    sub: roleText(p)
  })).filter(p => p.sub) : null; // ceux qui ont un rôle (départ, arrivée, cible, rendez-vous…) : les autres sont ceux du vol
  bannerFill();
  schedule();
}
/** Mission (re)lue et carte choisie : profil, emprise, cheminement tracé si la carte le demande, profil vertical. */
export async function applyMission() {
  const q = {
    ...(S.ctx.query || {}),
    mission: S.missionId
  };
  await loadMission(q.mission);
  if (!S) return;
  const M = S.mission,
    m = M ? M.maps.find(x => x.file === q.map) || M.maps[0] || null : null;
  S.mapDef = m;
  S.mmil = !!familyOf(S.missionId) && !COMMERCIAL.test(familyOf(S
    .missionId)); // une mission opérationnelle (hors commercial) : axes de ravitaillement allumés d'origine
  S.mthemeAuto = themeOf(m, familyOf(S.missionId)); // la vue de l'usage de la carte, ou celle que l'appareil a retenue pour elle
  const kept = S.mthemes?.[themeKey()];
  S.mtheme = kept && (kept !== 'yaml' || S.mthemeAuto === 'yaml') ? kept : S.mthemeAuto;
  S.missionPts = M ? M.points.map(p => ({
    ...p,
    sub: roleText(p)
  })) : null;
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
  const before = S.map ? styleFor() : '';
  S.profile = missionProfile();
  restyle(before);
  // #maps?mission=…&zone=<id> : la vue est cette zone, sauf si l'adresse désigne une carte fournie (&map=, déjà centrée sur elle, à son échelle)
  const zoneFit = q.zone && !(q.map && M?.maps.some(x => x.file === q.map)) ? MapsMission.zoneBox(M, q.zone) : null;
  S.fit = viewOf() || zoneFit || m?.extent || MapsRender.bboxOf(unwrapLons([...pts, ...(M?.points || [])]), 10) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.marksPts = shown;
  S.marks = shown.length > 1 ? MapsRender.marks(shown) : [];
  S.data = null;
  S.cursor = null;
  showBox(!!M);
  header();
  missionUi();
  status();
  schedule();
  buildProfile();
}
/** Les cartes de ces types, dans une mission d'une famille SO, s'ouvrent en VFR topographique (SOG-0171) ; le commercial garde la vue du vol. */
const SO_TYPE = /^(target|cible|detail|zone)/i,
  COMMERCIAL = /^(commercial|commerciale|civil|civile)$/i;
/** Le YAML de la carte porte-t-il un profil d'affichage (sa copie, ou l'id d'un profil intégré) ? Il l'emporte alors. */
const ownProfile = m => !!(m?.profileDef || (m?.profileId && window.MAPS_PROFILES.some(p => p.id === m.profileId)));
/** La vue d'une carte de mission, d'après son usage : son profil (YAML) ; sinon VFR topo pour les cartes cible / détail / rendez-vous / zone
 *  d'une famille SO ; sinon la vue du vol (VFR topo si le vol l'est, IFR sinon). */
export const themeOf = (m, fam) => ownProfile(m) ? 'yaml' : fam && !COMMERCIAL.test(fam) && SO_TYPE.test(m?.type || '') ? 'vfr' : ['vfr',
  'topo'
].includes(S.preset) ? 'vfr' : 'ifr';
/** Clef de la vue retenue : la mission et sa carte. */
const themeKey = () => `${S.missionId}|${S.mapDef?.file || ''}`;
/** Le profil d'affichage de la carte de mission montrée, selon sa vue. */
function missionProfile() {
  const m = S.mapDef;
  if (S.mtheme === 'yaml' && m) {
    const c = MapsMission.profileFor(m, window.MAPS_PROFILES);
    S.profileSource = c.source;
    S.mbase = c.profile;
    S.mbaseName = c.profile?.name || '';
  } else {
    S.profileSource = S.mtheme === S.mthemeAuto ? 'theme' : 'chosen';
    S.mbase = themeProfile(S.mtheme, S.route?.levelFt || 0);
    S.mbaseName = tt(TX.mbThemes[S.mtheme] || TX.mbThemes.ifr);
  }
  return effectiveProfile(); // la vue (le fond), puis les cases de Couches : les objets sont ceux de la mission et des cases, pas de la vue
}
/** Le fond suit la vue (SOG-0171 rouvert : « VFR topo » sur un fond IFR, sans relief) : le style MapLibre change quand celui du profil a changé (carte
 *  d'une autre vue, vue choisie dans le bandeau), le relief ombré est posé ou retiré sinon. Sans carte MapLibre encore, rien : elle naît avec le bon style. */
function restyle(before) {
  if (!S.map) return;
  if (styleFor() !== before) S.map.setStyle(styleFor(), {
    diff: false // un style entier rechargé : « style.load » vient toujours (la différence entre deux styles retirerait notre relief sans rien dire)
  });
  else relief();
}
/** Le choix de la vue (bandeau) : retenu pour cette carte sur l'appareil (seulement s'il diffère de la vue de son usage), la carte redessinée. */
function setTheme(v) {
  if (!TX.mbThemes[v] || (v === 'yaml' && S.mthemeAuto !== 'yaml')) return;
  const all = S.mthemes ||= {},
    key = themeKey();
  if (v === S.mthemeAuto) delete all[key];
  else {
    delete all[key];
    all[key] = v;
    for (const k of Object.keys(all).slice(0, -60)) delete all[k];
  }
  saveUi();
  S.mtheme = v;
  const before = S.map ? styleFor() : '';
  S.profile = missionProfile();
  restyle(before);
  invalidate();
  bannerFill();
  status();
  schedule();
  buildProfile();
}
/** Adresse de la carte choisie (le cadre remonte le module sur sa nouvelle suite d'adresse). */
function go(mission, map) {
  location.hash = mission ? `#maps?mission=${encodeURIComponent(mission)}${map ? `&map=${encodeURIComponent(map)}` : ''}` : '#maps?flight=1';
}
/** Gestes de la fenêtre de la mission (le seul endroit du choix de la mission, de sa carte fournie et de sa vue, SOG-0185 c) ; et la mission montrée
 *  relue quand son YAML change. Rend la fonction d'arrêt de l'écoute. */
export function missionEvents() {
  S.mbarEl.addEventListener('change', e => {
    if (e.target.matches('.mp-mb-sel')) go(S.missionId, e.target.value);
    else if (e.target.matches('.mp-mb-theme')) setTheme(e.target.value);
  });
  S.mbarEl.addEventListener('click', e => {
    if (e.target.closest('[data-mbx]')) go('', ''); // le bandeau retiré : le vol et ses couches
    else if (e.target.closest('[data-mbo]')) go(S.missionAside, ''); // la carte de la mission (vue mission) depuis le vol
  });
  const id = S.missionId || S.missionAside;
  if (!id) return () => {};
  return S.ctx.data.watch('missions/', paths => {
    if (S && (paths || []).some(p => MISSION_YAML.exec(p)?.[1] === id)) S.missionId ? applyMission() : loadAside();
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
    aside = !S.missionId && !!S.missionAside && !!M, // la mission d'un vol, en surimpression de la vue vol (SOG-0193 L1)
    on = (!!S.missionId || aside) && !!M,
    maps = (M?.maps || []).slice(0, 7),
    cur = S.mapDef?.file || '',
    fam = familyOf(S.missionId || S.missionAside),
    html = aside ? `<div class="mp-mb-top"><b class="mp-mb-t">${esc(M.title || M.id || S.missionAside)}</b></div>
<div class="mp-mb-sub"><span class="mp-mb-id">${esc(M.id || S.missionAside)}</span>${fam ? ` · <span class="mp-mb-fam">${esc(fam)}</span>` : ''}</div><button type="button" class="f-btn mp-mb-open" data-mbo>${esc(tt(TX.mbOpen))}</button>` : on ? `<div class="mp-mb-top"><b class="mp-mb-t">${esc(M.title || M.id || S.missionId)}</b><button type="button" class="mp-mb-x" data-mbx title="${esc(tt(TX.mbRemove))}" aria-label="${esc(tt(TX.mbRemove))}">×</button></div>
<div class="mp-mb-sub"><span class="mp-mb-id">${esc(M.id || S.missionId)}</span>${fam ? ` · <span class="mp-mb-fam">${esc(fam)}</span>` : ''}</div>${maps.length > 1 ? `<label class="mp-mb-map"><span>${esc(tt(TX.mbMap))}</span><select class="mp-mb-sel" aria-label="${esc(tt(TX.mbMap))}">${maps.map(m => `<option value="${esc(m.file)}"${m.file === cur ? ' selected' : ''}>${esc(m.description || m.file)}</option>`).join('')}</select></label>` : maps.length === 1 ? `<div class="mp-mb-sub">${esc(maps[0].description || maps[0].file)}</div>` : ''}<label class="mp-mb-th"><span>${esc(tt(TX.mbTheme))}</span><select class="mp-mb-theme" aria-label="${esc(tt(TX.mbTheme))}">${['yaml', 'vfr', 'ifr', 'base'].filter(k => k !== 'yaml' || S.mthemeAuto === 'yaml').map(k => `<option value="${k}"${k === S.mtheme ? ' selected' : ''}>${esc(tt(TX.mbThemes[k]))}</option>`).join('')}</select></label>` : '';
  if (el.hidden === on) el.hidden = !on;
  if (el.innerHTML !== html) el.innerHTML = html;
  setData(el, 'maps', String(maps.length));
}
/** Ce qui change quand la Carte est sur une mission sans l'avoir demandée dans l'adresse : les cases des couches (le choix seul, comme
 *  pour une adresse), le nom du bouton, le bandeau. */
export function missionUi() {
  if (!S) return;
  const on = !!S.missionId,
    corr = S.layersEl?.querySelector(
      '.mp-layer-corr'); // « autour du vol seulement » n'a pas de sens sur une carte de mission ; les autres cases, si (SOG-0185)
  if (corr && corr.hidden !== on) corr.hidden = on;
  const name = tt(TX.layers),
    b = S.layersBtn;
  if (b && b.title !== name) {
    b.title = name;
    b.setAttribute('aria-label', name);
  }
  bannerFill();
}
