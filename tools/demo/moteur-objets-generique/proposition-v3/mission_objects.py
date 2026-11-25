"""Generic mission-object control plane, served by the existing local launcher.

Data only: no mission code, simulator paths, subprocess, extra server or network listener.
The browser renews a short lease; the installed Lua agent reads complete snapshots and
reconciles its own instances. An expired/stopped flight yields an empty snapshot.
"""
import datetime
import hashlib
import json
import math
import re
import secrets
import threading
import time
import os
import safe_json

ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,63}\Z', re.A)
TRI = re.compile(r'[A-Z]{3}\Z', re.A)
LEASE = 18
KINDS = {'person', 'animal', 'vehicle', 'wreck', 'raft', 'ship', 'aircraft', 'container'}
# Logical mappings, installed once. Never a path received from a mission.
ASSETS = {
    'car-red': ('vehicle', 'Resources/default scenery/1000 roads/objects/cars/static/sedan_2_red.obj'),
    'sailboat': ('ship', 'Resources/default scenery/sim objects/dynamic/SailBoat.obj'),
    'cessna-visual': ('aircraft', 'Resources/default scenery/sim objects/vr/holodeck/C172_static.obj'),
}
DEFAULTS = {'vehicle': 'car-red', 'ship': 'sailboat', 'aircraft': 'cessna-visual'}


def number(v, lo, hi):
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not lo <= v <= hi:
        raise ValueError('number')
    return v


def identifier(v):
    if not isinstance(v, str) or not ID.fullmatch(v):
        raise ValueError('id')
    return v


def position(v):
    if not isinstance(v, dict):
        raise ValueError('position')
    return {'lat': number(v.get('lat'), -90, 90), 'lon': number(v.get('lon'), -180, 180)}


def distance(a, b):
    r = math.pi / 180
    h = math.sin((b['lat'] - a['lat']) * r / 2) ** 2 + math.cos(a['lat'] * r) * math.cos(b['lat'] * r) * math.sin((b['lon'] - a['lon']) * r / 2) ** 2
    return 3440.065 * 2 * math.asin(min(1, math.sqrt(h)))


def bearing(a, b):
    r = math.pi / 180
    x, y, d = a['lat'] * r, b['lat'] * r, (b['lon'] - a['lon']) * r
    return math.degrees(math.atan2(math.sin(d) * math.cos(y), math.cos(x) * math.sin(y) - math.sin(x) * math.cos(y) * math.cos(d))) % 360


def destination(p, heading, nm):
    a, b, h, d = math.radians(p['lat']), math.radians(p['lon']), math.radians(heading), nm / 3440.065
    lat = math.asin(math.sin(a) * math.cos(d) + math.cos(a) * math.sin(d) * math.cos(h))
    lon = b + math.atan2(math.sin(h) * math.sin(d) * math.cos(a), math.cos(d) - math.sin(a) * math.sin(lat))
    return {'lat': math.degrees(lat), 'lon': (math.degrees(lon) + 540) % 360 - 180}


def vertical(o, kind):
    mode = o.get('altitude_mode', 'water' if kind == 'ship' else 'msl' if kind == 'aircraft' else 'terrain')
    if mode not in {'terrain', 'water', 'msl', 'agl'} or kind == 'ship' and mode != 'water' or kind == 'aircraft' and mode not in {'msl', 'agl'}:
        raise ValueError('altitude_mode')
    if mode == 'agl' and o.get('altitude_ft') is not None or mode == 'msl' and o.get('height_agl_ft') is not None:
        raise ValueError('mixed_altitude')
    return mode, number(o.get('altitude_ft'), -1500, 60000) if mode == 'msl' else number(o.get('height_agl_ft'), 0, 30000) if mode == 'agl' else 0


def compile_objects(doc, assets=None, defaults=None):
    assets = ASSETS if assets is None else assets
    defaults = DEFAULTS if defaults is None else defaults
    if not isinstance(doc, dict) or not isinstance(doc.get('objects', []), list) or len(doc.get('objects', [])) > 32:
        raise ValueError('objects')
    points = {}
    raw_points = doc.get('points', [])
    if not isinstance(raw_points, list) or len(raw_points) > 300:
        raise ValueError('points')
    for p in raw_points:
        points[identifier(p.get('id'))] = position(p)
    objects, issues, seen = [], [], set()
    for raw in doc.get('objects', []):
        if not isinstance(raw, dict):
            raise ValueError('object')
        oid = identifier(raw.get('id'))
        if oid in seen:
            raise ValueError('duplicate')
        seen.add(oid)
        kind = raw.get('kind')
        if kind not in KINDS:
            issues.append({'id': oid, 'code': 'kind_required'})
            continue
        if raw.get('control') == 'user':
            issues.append({'id': oid, 'code': 'network_target_not_duplicated'})
            continue
        visual = raw.get('visual', {})
        if not isinstance(visual, dict):
            raise ValueError('visual')
        asset = visual.get('asset', defaults.get(kind))
        if asset not in assets or assets[asset][0] != kind:
            issues.append({'id': oid, 'code': 'asset_required'})
            continue
        motion = raw.get('motion', 'axis' if raw.get('speed_kt', 0) else 'static')
        if motion not in {'static', 'axis', 'route', 'racetrack'} or motion != 'static' and kind not in {'ship', 'aircraft'}:
            raise ValueError('motion')
        mode, altitude = vertical(raw, kind)
        o = dict(id=oid, kind=kind, asset=asset, motion=motion, altitude_mode=mode, altitude=altitude,
                 delay=number(raw.get('start_delay_min', 0), 0, 1440) * 60,
                 lifetime=number(raw.get('lifetime_min', 1440), 1, 1440) * 60,
                 offset=number(visual.get('offset_m', 0), -20, 100),
                 speed=number(raw.get('speed_kt', 0), 0, 80 if kind == 'ship' else 1000),
                 heading=number(raw.get('course_deg', 0), 0, 359.999),
                 range_nm=number(raw.get('detection_range_nm', 1), .001, 100),
                 height_ft=number(raw.get('detection_height_ft', 3000), 1, 60000))
        constraints = raw.get('constraints', {})
        if not isinstance(constraints, dict):
            raise ValueError('constraints')
        o['clearance_ft'] = number(constraints.get('min_clearance_ft', 50), 0, 10000)
        if motion == 'static' and o['speed']:
            raise ValueError('static_speed')
        if motion in {'axis', 'racetrack'} and kind == 'aircraft' and o['speed'] <= 0:
            raise ValueError('aircraft_speed')
        if motion == 'route':
            route = raw.get('route', {})
            route_points = route.get('points') if isinstance(route, dict) else None
            if not isinstance(route_points, list) or not 2 <= len(route_points) <= 100:
                raise ValueError('route')
            nodes = []
            for q in route_points:
                if not isinstance(q, dict) or q.get('point') not in points:
                    raise ValueError('route_point')
                vm, va = vertical({**raw, **q}, kind)
                if vm != mode:
                    raise ValueError('route_altitude_transition')
                nodes.append({**points[q['point']], 'speed': number(q.get('speed_kt'), .1, 80 if kind == 'ship' else 1000), 'altitude': va})
            repeat = route.get('repeat', 'once')
            if repeat not in {'once', 'loop', 'pingpong'}:
                raise ValueError('repeat')
            if repeat == 'loop' and distance(nodes[-1], nodes[0]) >= .001:
                nodes.append(nodes[0])
            if repeat == 'pingpong':
                nodes += list(reversed(nodes[:-1]))
            legs, total = [], 0
            for a, b in zip(nodes, nodes[1:]):
                nm = distance(a, b)
                if nm < .001:
                    raise ValueError('short_leg')
                seconds = nm * 7200 / (a['speed'] + b['speed'])
                legs.append(dict(a=a, b=b, nm=nm, heading=bearing(a, b), seconds=seconds, start=total))
                total += seconds
            o.update(legs=legs, duration=total, repeat=repeat, **position(nodes[0]))
        else:
            o.update(position(raw))
        if motion == 'racetrack':
            r = raw.get('racetrack', {})
            if not isinstance(r, dict) or r.get('turn') not in {'left', 'right'}:
                raise ValueError('racetrack')
            o['racetrack'] = dict(axis=number(r.get('axis_deg'), 0, 359.999), leg=number(r.get('leg_nm'), .1, 100), radius=number(r.get('turn_radius_nm'), .05, 20), sign=1 if r['turn'] == 'right' else -1)
        objects.append(o)
    return objects, issues


def pose(o, elapsed):
    t = elapsed - o['delay']
    if t < 0 or t > o['lifetime']:
        return None
    p = {**o, 'bank': 0}
    if o['motion'] == 'axis':
        p.update(destination(o, o['heading'], o['speed'] * t / 3600))
    elif o['motion'] == 'route':
        if o['repeat'] == 'once' and t > o['duration']:
            return None
        dt = min(t, o['duration']) if o['repeat'] == 'once' else t % o['duration']
        leg = next((q for q in o['legs'] if dt < q['start'] + q['seconds']), o['legs'][-1])
        seconds = min(leg['seconds'], max(0, dt - leg['start']))
        u = seconds / leg['seconds']
        nm = (leg['a']['speed'] * seconds + (leg['b']['speed'] - leg['a']['speed']) * seconds * seconds / (2 * leg['seconds'])) / 3600
        p.update(destination(leg['a'], leg['heading'], min(nm, leg['nm'])))
        p.update(heading=leg['heading'], speed=leg['a']['speed'] + (leg['b']['speed'] - leg['a']['speed']) * u,
                 altitude=leg['a']['altitude'] + (leg['b']['altitude'] - leg['a']['altitude']) * u)
    elif o['motion'] == 'racetrack':
        r = o['racetrack']
        length, radius = r['leg'], r['radius']
        d = (o['speed'] * t / 3600) % (2 * length + 2 * math.pi * radius)
        angle = 0
        if d < length:
            x, y = d, 0
        elif d < length + math.pi * radius:
            angle = (d - length) / radius
            x, y = length + radius * math.sin(angle), radius * (1 - math.cos(angle))
        elif d < 2 * length + math.pi * radius:
            x, y, angle = length - (d - length - math.pi * radius), 2 * radius, math.pi
        else:
            angle = math.pi + (d - 2 * length - math.pi * radius) / radius
            x, y = radius * math.sin(angle), radius * (1 - math.cos(angle))
        axis = math.radians(r['axis'])
        east, north = x * math.sin(axis) + r['sign'] * y * math.cos(axis), x * math.cos(axis) - r['sign'] * y * math.sin(axis)
        p.update(destination(o, math.degrees(math.atan2(east, north)), math.hypot(east, north)))
        p['heading'] = (r['axis'] + r['sign'] * math.degrees(angle)) % 360
    return p


class Runtime:
    def __init__(self, clock=time.monotonic, wall=time.time):
        self.clock, self.wall = clock, wall
        self.lock = threading.RLock()
        self.session = None
        self.events = []
        self.token = secrets.token_hex(32)
        self.sequence = 0
        self.seen = set()
        self.agent_at = None
        self.assets, self.defaults = dict(ASSETS), dict(DEFAULTS)

    def configure(self, data_root):
        """Local catalogue only, outside mission files; never a shared/synchronised path."""
        path = os.path.join(data_root, 'local', 'mission_object_assets.json')
        if not os.path.isfile(path):
            return
        doc, why = safe_json.read(path, 65536)
        if why or not isinstance(doc, dict) or len(doc) > 100:
            raise ValueError('asset_catalogue')
        assets, defaults = dict(ASSETS), dict(DEFAULTS)
        for key, entry in doc.items():
            identifier(key)
            if not isinstance(entry, dict) or entry.get('kind') not in KINDS:
                raise ValueError('asset_catalogue')
            p = entry.get('path')
            if not isinstance(p, str) or len(p) > 400 or not p.lower().endswith('.obj') or ':' in p or '\\' in p or p.startswith('/') or any(ord(c) < 32 for c in p) or any(x in ('', '.', '..') for x in p.split('/')):
                raise ValueError('asset_path')
            assets[key] = (entry['kind'], p)
            if entry.get('default_for_kind') is True:
                defaults[entry['kind']] = key
        with self.lock:
            self.assets, self.defaults = assets, defaults

    def _alive(self):
        return self.session and self.clock() < self.session['expires']

    def publish(self, body):
        if not isinstance(body, dict) or not TRI.fullmatch(str(body.get('pilot', ''))):
            raise ValueError('pilot')
        with self.lock:
            old = self.session if self._alive() else None
            if old and old['pilot'] != body['pilot']:
                raise ValueError('other_pilot_active')
            flight = body.get('flight')
            if flight is None:
                self.session = None
                return self.status()
            if not isinstance(flight, dict):
                raise ValueError('flight')
            mission = identifier(flight.get('mission'))
            try:
                started = datetime.datetime.fromisoformat(flight.get('started_at', '').replace('Z', '+00:00'))
                if started.tzinfo is None:
                    raise ValueError('timezone')
                seconds = self.wall() - started.timestamp()
                number(seconds, -60, 86400)
            except (ValueError, TypeError, AttributeError, OverflowError):
                raise ValueError('started_at') from None
            objects, issues = compile_objects(body, self.assets, self.defaults)
            used_assets = {o['asset']: self.assets[o['asset']] for o in objects}
            fingerprint = hashlib.sha256(json.dumps({'objects': objects, 'assets': used_assets}, sort_keys=True).encode()).hexdigest()
            key = (body['pilot'], mission, started.timestamp())
            same = old and old['key'] == key
            if old and old['key'][2] > key[2]:
                raise ValueError('stale_flight')
            if not same:
                self.events, self.seen, self.sequence = [], set(), 0
            self.session = dict(key=key, pilot=body['pilot'], mission=mission,
                                id=old['id'] if same else secrets.token_hex(16),
                                generation=(old['generation'] + (old['hash'] != fingerprint)) if same else 1,
                                hash=fingerprint, objects=objects, issues=issues, assets=used_assets,
                                origin=(old['origin'] if same else self.clock() - max(0, seconds)), expires=self.clock() + LEASE)
            return self.status()

    def status(self):
        with self.lock:
            s = self.session if self._alive() else None
            return {'protocol': 1, 'active': bool(s), 'mission': s['mission'] if s else None,
                    'session': s['id'] if s else None, 'revision': s['generation'] if s else 0,
                    'objects': len(s['objects']) if s else 0, 'issues': s['issues'] if s else [],
                    'agent_connected': self.agent_at is not None and self.clock() - self.agent_at < 5,
                    'joinfs_live': False, 'cursor': self.sequence}

    def snapshot(self):
        with self.lock:
            self.agent_at = self.clock()
            s = self.session if self._alive() else None
            if not s:
                return 'DEFAOBJ\t1\t-\t0\t0\t0\t-\n'
            elapsed = max(0, self.clock() - s['origin'])
            ttl = max(0, s['expires'] - self.clock())
            lines = [f"DEFAOBJ\t1\t{s['id']}\t{s['generation']}\t{ttl:.3f}\t{elapsed:.3f}\t{self.token}"]
            for o in s['objects']:
                p = pose(o, elapsed)
                if p:
                    lines.append('\t'.join(map(str, ['O', p['id'], p['asset'], p['kind'], p['lat'], p['lon'], p['altitude_mode'], p['altitude'], p['heading'], p['speed'], p['offset'], p['clearance_ft'], p['range_nm'], p['height_ft']])))
            for asset in sorted({o['asset'] for o in s['objects']}):
                lines.append(f'M\t{asset}\t{s["assets"][asset][1]}')
            return '\n'.join(lines) + '\n'

    def report(self, body):
        with self.lock:
            s = self.session if self._alive() else None
            if not s or not isinstance(body, dict) or body.get('session') != s['id'] or not secrets.compare_digest(str(body.get('token', '')), self.token):
                raise ValueError('session')
            sequence = number(body.get('seq'), 1, 1e9)
            if not isinstance(sequence, int):
                raise ValueError('sequence')
            run = identifier(body.get('run'))
            oid = identifier(body.get('object'))
            kind = body.get('type')
            if kind not in {'spawned', 'removed', 'spawn_failed', 'object_found', 'candidate_fov'} or not any(o['id'] == oid for o in s['objects']):
                raise ValueError('event')
            event = dict(session=s['id'], mission=s['mission'], object=oid, type=kind, seq=sequence, run=run,
                         started_at=datetime.datetime.fromtimestamp(s['key'][2], datetime.timezone.utc).isoformat().replace('+00:00', 'Z'))
            if kind in {'object_found', 'candidate_fov'}:
                o = next(o for o in s['objects'] if o['id'] == oid)
                actual = pose(o, max(0, self.clock() - s['origin']))
                pilot, target = position(body.get('pilot')), position(body.get('position'))
                pilot['altitude_ft'] = number(body['pilot'].get('altitude_ft'), -1500, 60000)
                target['altitude_ft'] = number(body['position'].get('altitude_ft'), -1500, 60000)
                if not actual or distance(actual, target) > .1 or distance(pilot, target) > o['range_nm'] or abs(pilot['altitude_ft'] - target['altitude_ft']) > o['height_ft']:
                    raise ValueError('out_of_range')
                if o['altitude_mode'] == 'msl' and abs(target['altitude_ft'] - actual['altitude']) > 2:
                    raise ValueError('object_altitude')
                event.update(pilot=pilot, position=target)
            key = (run, sequence)
            if key not in self.seen:
                if len(self.seen) >= 20000:
                    raise ValueError('event_limit')
                self.seen.add(key)
                self.sequence += 1
                self.events.append({**event, 'cursor': self.sequence})
                self.events = self.events[-200:]
            return {'ok': True, 'ack': sequence}


RUNTIME = Runtime()
