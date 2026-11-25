// Local mission-object lifecycle. Uses the frame data and launcher clients; no page-specific export.
import * as MS from './mission.js';

const TX = {
  // French only by explicit user decision, 2026-11-24. Translation debt: MO-I18N-01.
  mapping: ['Objets de mission : {n} élément(s) demandent un genre ou un modèle compatible.'],
  waiting: ['Objets de mission : le script X-Plane ne répond pas encore.'],
  local: ['Objets actifs sur ce poste ; leur diffusion JoinFS en direct n’est pas raccordée.'],
  found: ['Objet trouvé : {id}. Le contact a été reçu dans le vol courant.']
};
const objectKeys = ['id', 'kind', 'control', 'visual', 'motion', 'lat', 'lon', 'altitude_mode', 'altitude_ft', 'height_agl_ft',
  'course_deg', 'speed_kt', 'start_delay_min', 'lifetime_min', 'route', 'racetrack', 'constraints', 'detection_range_nm',
  'detection_height_ft'
];

export function declarations(doc) {
  const objects = Array.isArray(doc?.objects) ? doc.objects : [];
  if (objects.length > 32) throw Error('objects_limit');
  const points = [];
  for (const [id, p] of [
      ['ORIGIN', doc?.origin],
      ['DESTINATION', doc?.destination],
      ['TARGET', doc?.target]
    ])
    if (Number.isFinite(p?.lat) && Number.isFinite(p?.lon)) points.push({
      id,
      lat: p.lat,
      lon: p.lon
    });
  for (const p of [...(doc?.turning_points || []), ...(doc?.rendezvous || [])])
    if (Number.isFinite(p?.lat) && Number.isFinite(p?.lon)) points.push({
      id: p.id,
      lat: p.lat,
      lon: p.lon
    });
  return {
    objects: objects.map(o => Object.fromEntries(objectKeys.filter(k => Object.hasOwn(o, k)).map(k => [k, o[k]]))),
    points
  };
}

export function create({
  data,
  request,
  local,
  onFound = () => {},
  notify = () => {},
  t = x => x[0],
  parse,
  interval = 5000
}) {
  let latest = null,
    timer = null,
    busy = false,
    again = false,
    source = null,
    manifest = null,
    notice = '',
    epoch = 0;
  let eventSession = '',
    cursor = 0;
  const warn = (key, values = {}) => {
    const signature = key + JSON.stringify(values);
    if (signature !== notice) {
      notice = signature;
      notify(t(TX[key], values), 'warn');
    }
  };
  async function yaml(path) {
    const read = await data.read(path, {
      wait: true
    });
    const text = read?.value ?? read?.text;
    if (typeof text !== 'string') throw Error('mission_unavailable');
    if (!parse && !globalThis.jsyaml) await import('./js-yaml.min.js');
    return parse ? parse(text) : globalThis.jsyaml.load(text, {
      schema: globalThis.jsyaml.CORE_SCHEMA
    });
  }
  async function pass() {
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    const mine = epoch;
    try {
      const current = latest;
      if (!current || !local()) return;
      const {
        flight,
        pilot
      } = current;
      let payload = {
        pilot,
        flight: null
      };
      if (flight?.started?.at && flight?.mission) {
        const key = flight.mission;
        // Cache only the raw declaration; the active flight identity and lease are refreshed each pass.
        if (source !== key || !manifest) {
          const row = MS.readRegistry(await yaml('missions/mission_registry.yaml')).find(r => r.id === key);
          if (!row?.folder || !row?.file) throw Error('mission_not_indexed');
          manifest = declarations(await yaml(`missions/${row.folder}/${row.file}`));
          source = key;
        }
        payload = {
          pilot,
          flight: {
            mission: key,
            started_at: flight.started.at
          },
          ...manifest
        };
      } else {
        source = null;
        manifest = null;
      }
      if (mine !== epoch) {
        again = true;
        return;
      }
      const result = await request('mission-objects/session', {
        method: 'POST',
        json: payload
      });
      if (mine !== epoch) return;
      const state = result?.status === 200 ? result.body : null;
      if (state?.issues?.length) warn('mapping', {
        n: state.issues.length
      });
      else if (state?.objects && !state.agent_connected) warn('waiting');
      else if (state?.objects && state.agent_connected) warn('local');
      if (state?.active) {
        if (eventSession !== state.session) {
          eventSession = state.session;
          cursor = 0;
        }
        const response = await request(`mission-objects/events?after=${cursor}`);
        if (mine !== epoch || response?.body?.session !== state.session) return;
        for (const event of response.body.events || []) {
          if (event.type === 'object_found') {
            if (await onFound(event) !== false) notify(t(TX.found, {
              id: event.object
            }), 'ok');
          }
          cursor = Math.max(cursor, event.cursor);
        }
      }
    } catch {
      /* A missing declaration is not kept alive: the server lease expires and removes the old objects. */
    } finally {
      busy = false;
      if (again) {
        again = false;
        Promise.resolve().then(pass);
      }
    }
  }
  return {
    update(flight, pilot) {
      if (!local() || !/^[A-Z]{3}$/.test(pilot || '')) return;
      latest = {
        flight,
        pilot
      };
      epoch++;
      clearTimeout(timer);
      pass();

      function beat() {
        pass();
        timer = setTimeout(beat, interval);
      }
      if (flight?.started?.at && flight?.mission) timer = setTimeout(beat, interval);
    },
    invalidate() {
      source = null;
      manifest = null;
      epoch++;
      pass();
    },
    stop() {
      clearTimeout(timer);
      timer = null;
      latest = null;
      epoch++;
    }
  };
}
