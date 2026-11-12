"""Area K - the raw sources of a zone, on the workstation: the jobs `base/fetch` and `base/purge` (tools/regen/base_sources.py; frame/aerodb/INTEGRATION.md).

Rules covered
  * K52 the Python mirror of shared/aero_zones.js (the launcher has no browser here): the same sources (kind, personal, link, labels x4, provider), the same
    sources for every zone, the same `fileSource` on a list of sample paths; the folders aero_fetch writes in are the ones `file_source` reads.
  * K53 arguments (400), registration, minimal gap; aero_fetch's messages sorted into codes.
  * K54 base/fetch against a fake network (aero_fetch.get and the provider functions replaced; no real download anywhere): downloaded, 304, identical content, an
    HTTP error, a network error, personal skipped, manual with its address and names, a failed source stops no other, files tracked by git counted, cancel.
  * K55 base/purge on a temporary data tree in a temporary git repository: the zone's sources and caches removed, tracked files kept (kept-tracked), sia/base,
    proc/ and other zones never touched, dry run, shared-fr, a path that escapes refused, git failing.
  * K56 the data repository template ignores the raw sources (git check-ignore on a temporary repository).
  * K60 an openAIP export a country does not have (404) is absent, never a failure: one line for the pass, nothing in the launcher's
    console, the zone done, remembered for the AIRAC cycle outside data/ and not asked again; a 5xx stays a failure per file.
  * K57 what aero_fetch takes from a server page or response: ENAIRE file names (strict pattern, resolved under sia/aixm5), the NAV CANADA address (https on its
    own host only), the size of a response (200 MB at most, stopped cleanly).
"""
import datetime
import importlib
import json
import os
import re
import subprocess
import sys
import tempfile
import types
import urllib.error
from pathlib import Path

from lib import ROOT, Fail, case


def _mods():
    """(regen_jobs, le module tools/regen/base_sources.py tel que le lanceur le charge, aero_fetch, data_sync). Les verbes des jeux sont chargés une fois, comme le lanceur."""
    tools = str(ROOT / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    RJ = importlib.import_module('regen_jobs')
    if ('base', 'fetch') not in RJ.REGISTRY:
        failed = RJ.load_verbs()
        if failed:
            raise Fail(f'load_verbs: {failed}', 'every tools/regen/*.py loads', 'frame/INTEGRATION 15.1')
    fn, check = RJ.REGISTRY[('base', 'fetch')]
    return RJ, types.SimpleNamespace(**fn.__globals__), importlib.import_module('aero_fetch'), importlib.import_module('data_sync')


def _git(DS, data, *a):
    return subprocess.run(DS.git_cmd('-C', str(data), *a), capture_output=True, text=True, encoding='utf-8', errors='replace', env=DS.git_env())


def _repo(DS, td, tracked=()):
    """data/ d'essai : un dépôt git (hors de tout autre dépôt) avec ces fichiers suivis ({ chemin: texte })."""
    data = Path(td) / 'data'
    data.mkdir()
    _git(DS, data, 'init', '-q')
    for rel, text in dict(tracked).items():
        (data / rel).parent.mkdir(parents=True, exist_ok=True)
        (data / rel).write_text(text, encoding='utf-8')
        _git(DS, data, 'add', '--', rel)
    if tracked:
        _git(DS, data, '-c', 'user.name=T', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'initial')
    return data


def _sub(td, name):
    p = Path(td) / name
    p.mkdir()
    return p


def _ctx(DS, data):
    return {'data': str(data), 'secrets': str(Path(data).parent / 'secrets'), 'git_cmd': DS.git_cmd, 'git_env': DS.git_env, 'cache': str(Path(data).parent / 'cache')}


def _run(RJ, BS, verb, args, ctx, cancel=False):
    """Le verbe appelé comme le lanceur le fait (après son contrôle d'arguments) sur un vrai Job : (vue du travail, résultat)."""
    fn, check = RJ.REGISTRY[('base', verb)]
    a = check(args)
    if a is None:
        raise Fail(f'{verb} {args} refused', 'arguments accepted', 'check')
    job = RJ.Job('base', verb, a)
    if cancel:
        job._cancel.set()
    res = fn(job, a, ctx)
    return job.view(), res


class _Net:
    """Le réseau d'essai : remplace aero_fetch.get. routes : { morceau d'adresse: octets | None (304) | ('http', code) | ('os', texte) | fonction(url, since) }. Garde les appels."""

    def __init__(self, AF, routes, on_call=None):
        self.AF, self.routes, self.calls, self.on_call, self.saved = AF, routes, [], on_call, None

    def __call__(self, url, since=None, absent_ok=False, copy=None):
        self.calls.append((url, since))
        if self.on_call:
            self.on_call(url)
        for part, v in self.routes.items():
            if part in url:
                if callable(v):
                    v = v(url, since)
                if isinstance(v, tuple) and v[0] == 'http':
                    raise urllib.error.HTTPError(url, v[1], 'x', {}, None)
                if isinstance(v, tuple) and v[0] == 'os':
                    raise OSError(v[1])
                return v
        raise urllib.error.HTTPError(url, 404, 'not found', {}, None)

    def __enter__(self):
        self.saved = self.AF.get
        self.AF.get = self
        return self

    def __exit__(self, *a):
        self.AF.get = self.saved


# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K52', 'Raw sources: the launcher\'s Python mirror of shared/aero_zones.js (sources, zones, fileSource)', 'K', tags=('aerodb',), phone=False,
      rule='frame/aerodb/INTEGRATION (fetch and purge): the launcher decides from a mirror of the catalogue; the same ids, kinds, personal flags, links, labels x4, zone lists and file attribution as the page')
def k52(c):
    RJ, BS, AF, DS = _mods()
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.add_script_tag(url=f'{c.base}/shared/carto/aero_zones_geo.js')
    c.page.add_script_tag(url=f'{c.base}/shared/aero_zones.js')
    samples = ['XML_SIA_2026-10-01.xml', 'AIXM4.5_all_FR_OM_2026-10-01.xml', 'sia-airspaces-2026-10-01.xml', 'xml_sia_2026-10-01.xml', 'XML_SIA_2026-10-01.xml.part', 'miam-enr-5-7-tracks.xml',
               'miam-other.xml', 'mora.csv', 'other.xml', 'openaip/gb_asp.geojson', 'openaip/GB_apt.geojson', 'openaip/nat_asp.geojson', 'openaip/xyz.geojson', 'openaip/gb_asp.geojson.part',
               'openaip\\de_nav.geojson', 'aixm5/LE_x_AIP_DS_FULL_Airspace.xml', 'aixm5/le_x.xml', 'aixm5/EG_x.xml', 'geojson/faa_class.geojson', 'geojson/faa_sua.geojson',
               'geojson/faa_mtr.geojson', 'geojson/other.geojson', 'zones/gb/ukmil_enr52.geojson', 'zones/gb/ukmil_ENR-5-2.pdf', 'zones/gb/ukmil_aara-tracks.xml', 'zones/gb/EG_AIP_DS_X_XML.zip',
               'zones/gb/nats-x.xml', 'zones/nat/nat_tracks.json', 'zones/ca/navcan_dah.pdf', 'zones/ca/readme.txt', 'zones/xx/foo.json', 'zones/fr/sia_x.xml', 'zones/fr/other.xml',
               'zones/de/openaip-foo.json', 'zones/gb/xplane_x.txt', 'zones/gb', 'zones/', 'zones', 'base/fr/index.json', 'sia/base/fr/x.json', 'local/eaip/x.pdf', '']
    js = c.js("""(samples) => {
      const A = window.AeroZones, S = {};
      for (const [id, v] of Object.entries(A.SOURCES)) S[id] = { kind: v.kind, personal: v.personal || '', link: v.link || '', provider: v.provider || '', args: v.args || [], label: v.label };
      return { sources: S, zones: A.zones().map(z => [z.id, z.sources]), fileSource: samples.map(p => A.fileSource(p)), geo: Object.keys(window.AERO_ZONES_GEO) };
    }""", samples)
    py = {k: {'kind': v['kind'], 'personal': v['personal'], 'link': v['link'], 'provider': v['provider'], 'args': list(v['args']), 'label': list(v['label'])} for k, v in BS.SOURCES.items()}
    c.eq(sorted(py), sorted(js['sources']), 'the mirror holds exactly the sources of aero_zones.js', what='source ids')
    for sid, want in js['sources'].items():
        c.eq(py[sid], want, f'source {sid}: kind, personal flag, link, provider, args and the four labels are the page\'s', what=f'source {sid}')
    c.eq(sorted(BS.zone_ids()), sorted(js['geo']), 'the launcher reads the same zone ids as the page', what='zone ids')
    c.ok(len(js['geo']) > 200 and {'fr', 'gb', 'es', 'us', 'ca', 'nat'} <= set(js['geo']), str(len(js['geo'])), 'the zone list is the world: fr, gb, es, us, ca and nat among them')
    bad = [(z, BS.sources_of(z), s) for z, s in js['zones'] if list(BS.sources_of(z)) != s]
    c.eq(bad, [], 'the sources of every zone (COMMON, OWN, EXTRA) are the page\'s, in the same order', what='zone sources')
    got = [BS.file_source(p) for p in samples]
    c.eq([(p, g) for p, g in zip(samples, got)], [(p, w) for p, w in zip(samples, js['fileSource'])], 'file_source gives AeroZones.fileSource on every sample path (zone and source, null for an unknown file)', what='fileSource')
    # the folders aero_fetch writes in are read back by the same rule: one source per provider, with the names it writes
    written = {'openaip': ('gb_asp.geojson', 'gb', 'openaip'), 'faa': ('faa_sua.geojson', 'us', 'faa'), 'enaire': ('LE_x_AIP_DS_FULL_Airspace.xml', 'es', 'enaire'),
               'ukmil': ('ukmil_enr52.geojson', 'gb', 'ukmil'), 'navcan': ('navcan_dah.geojson', 'ca', 'navcan'), 'nat': ('nat_tracks.json', 'nat', 'nat')}
    for prov, (name, zone, src) in written.items():
        rel = BS.FOLDERS[prov].split('/', 1)[1] + '/' + name
        c.eq(BS.file_source(rel), {'zone': zone, 'source': src}, f'what {prov} writes ({rel}) is attributed to {zone}/{src}', what=f'folder of {prov}')
    c.eq(BS.file_source('geojson/faa_class.geojson'), {'zone': 'us', 'source': 'faaclass'}, 'the FAA class layer belongs to faaclass', what='faaclass')
    # every download source of the mirror names an aero_fetch function (or the layers faa takes)
    for sid, v in BS.SOURCES.items():
        if v['kind'] == 'download':
            c.ok(callable(getattr(AF, v['provider'], None)) and v['provider'] in BS.FOLDERS, f'{sid}: {v["provider"]}', f'{sid}: a provider function of aero_fetch with a folder')


# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K53', 'Raw sources: arguments checked (400), the verbs registered, the minimal gap, aero_fetch\'s messages sorted into codes', 'K', static=True,
      rule='frame/INTEGRATION 15.1: nothing from the page is a path, an address or a command; unknown key or zone or source refused; base/fetch 30 s between two starts')
def k53(c):
    RJ, BS, AF, DS = _mods()
    ids = BS.zone_ids()
    cf, cp = RJ.REGISTRY[('base', 'fetch')][1], RJ.REGISTRY[('base', 'purge')][1]
    c.eq(cf({'zones': ['fr', ' GB']}), {'zones': ['fr', 'gb'], 'personal': []}, 'fetch: zones trimmed and lower-cased, no personal source by default', what='fetch default')
    c.eq(cf({'zones': ['es'], 'personal': ['enaire', 'enaire', 'nats']}), {'zones': ['es'], 'personal': ['enaire', 'nats']}, 'fetch: personal is a sorted set of source ids of the catalogue', what='fetch personal')
    bad = [None, 'fr', {}, {'zones': []}, {'zones': 'fr'}, {'zones': ['zz']}, {'zones': ['fr', 'fr']}, {'zones': ['fr'], 'x': 1}, {'zones': ['fr'], 'what': ['sources']}, {'zones': ['fr'], 'dry': True},
           {'zones': ['fr/../x']}, {'zones': [7]}, {'zones': ids[:61]}, {'zones': ['fr'], 'personal': 'enaire'}, {'zones': ['fr'], 'personal': ['zz']}, {'zones': ['fr'], 'personal': [['a']]},
           {'zones': ['fr'], 'personal': ['xplane'] * 11}, {'zones': ['fr'], 'personal': ['../x']}, {'zone': 'fr'}]
    c.eq([a for a in bad if cf(a) is not None], [], 'fetch: an unknown zone, source or key, a duplicate, a path, too many are refused', what='fetch refused')
    c.eq(cp({'zones': ['fr']}), {'zones': ['fr'], 'what': ['sources', 'caches'], 'dry': False}, 'purge: both kinds and no dry run by default', what='purge default')
    c.eq(cp({'zones': ['fr', 'gb'], 'what': ['caches', 'sources'], 'dry': True}), {'zones': ['fr', 'gb'], 'what': ['sources', 'caches'], 'dry': True}, 'purge: what in its fixed order, dry kept', what='purge what')
    c.eq(cp({'zones': ['fr'], 'what': ['caches']}), {'zones': ['fr'], 'what': ['caches'], 'dry': False}, 'purge: one kind', what='purge caches')
    bad = [None, 'fr', {}, {'zones': []}, {'zones': ['zz']}, {'zones': ['fr', 'fr']}, {'zones': ['fr'], 'x': 1}, {'zones': ['fr'], 'personal': ['enaire']}, {'zones': ['fr'], 'what': []},
           {'zones': ['fr'], 'what': 'sources'}, {'zones': ['fr'], 'what': ['base']}, {'zones': ['fr'], 'what': ['sources', 'sources']}, {'zones': ['fr'], 'what': ['sources', 'caches', 'x']},
           {'zones': ['fr'], 'dry': 'yes'}, {'zones': ['fr'], 'dry': 1}, {'zones': ids[:61]}, {'zones': ['..']}, {'zones': ['*']}]
    c.eq([a for a in bad if cp(a) is not None], [], 'purge: an unknown zone, kind or key, a non-boolean dry, a duplicate, too many are refused', what='purge refused')
    J = RJ.Jobs(RJ.REGISTRY)
    c.eq(J.start('base', 'fetch', {'zones': ['zz']}).get('status'), 400, 'the launcher answers 400 to an unknown zone (fetch)', what='start fetch')
    c.eq(J.start('base', 'purge', {'zones': ['fr'], 'x': 1}).get('status'), 400, 'the launcher answers 400 to an extra key (purge)', what='start purge')
    c.ok(('base', 'fetch') in RJ.REGISTRY and ('base', 'purge') in RJ.REGISTRY and ('base', 'build') in RJ.REGISTRY, str(sorted(k for k in RJ.REGISTRY if k[0] == 'base')), 'base/fetch, base/purge and base/build are all registered by load_verbs')
    c.eq((RJ.MIN_GAP.get(('base', 'fetch')), RJ.MIN_GAP.get(('base', 'purge'))), (30, None), 'a minimal gap of 30 s between two starts of fetch, none for purge', what='MIN_GAP')
    # the messages of aero_fetch, as codes
    err = [('gb_asp : HTTP 500', ('http', 500)), ('HTTP Error 502: Bad Gateway', ('http', 502)), ('faa_sua : HTTP Error 504: Gateway Time-out', ('http', 504)),
           ('ENAIRE : <urlopen error [Errno 11001] getaddrinfo failed>', ('network', None)), ('gb_apt : timed out', ('network', None)), ('NAV CANADA : ', ('network', None)),
           ('UK Mil AIP : PDF illisible (x)', ('parse', None)), ('NAV CANADA : aucune zone lue dans le DAH (mise en page changée ?)', ('parse', None)),
           ('ENAIRE : jeu Airspace introuvable sur la page', ('parse', None)), ('NAT (FAA) : Expecting value: line 1 column 1 (char 0)', ('parse', None)),
           ('faa_class : service FAA : 400 Bad request', ('parse', None)), ('code pays invalide : zzz', ('parse', None)), (ValueError('x'), ('parse', None)),
           (OSError('boom'), ('network', None)), (urllib.error.HTTPError('u', 503, 'x', {}, None), ('http', 503))]
    got = []
    for item, want in err:
        k = BS.classify(item)
        got.append((str(item)[:40], (k['error'], k.get('status'))))
    c.eq(got, [(str(i)[:40], w) for i, w in err], 'aero_fetch\'s messages and exceptions: HTTP n -> http + status, an unexpected form -> parse, the rest -> network', what='classify')


# ---------------------------------------------------------------------------------------------------------------------------------------------
def _page_enaire():
    return ('<a href="contenido_Datasets/LE_2026_10_AIP_DS_FULL_Airspace.xml">a</a><a href="contenido_Datasets/LE_2026_10_AIP_DS_FULL_EnRoute.xml">b</a>').encode()


def _nasr_zips():
    """Three small NASR zips (FIX, AWY, NAV) in the real layout: two fixes and a VOR, three segments (one with a gap, one with a point nobody knows)."""
    import csv
    import io
    import zipfile

    def zip_of(name, header, rows):
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(header)
        w.writerows(rows)
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as z:
            z.writestr(name, '﻿' + buf.getvalue())
        return out.getvalue()
    fix = zip_of('FIX_BASE.csv', ['EFF_DATE', 'FIX_ID', 'LAT_DECIMAL', 'LONG_DECIMAL'], [['2026/10/29', 'MONPI', '40.5', '-70.5'], ['2026/10/29', 'OATSS', '41.0', '-71.0'], ['2026/10/29', 'AAALL', '42.12', '-71.14']])
    nav = zip_of('NAV_BASE.csv', ['EFF_DATE', 'NAV_ID', 'NAV_TYPE', 'LAT_DECIMAL', 'LONG_DECIMAL'], [['2026/10/29', 'OAL', 'VOR/DME', '38.0', '-117.0'], ['2026/10/29', 'ILC', 'VORTAC', '38.4', '-113.0']])
    head = ['AWY_ID', 'FROM_POINT', 'FROM_PT_TYPE', 'TO_POINT', 'MIN_ENROUTE_ALT', 'MAX_AUTH_ALT', 'AWY_SEG_GAP_FLAG']
    awy = zip_of('AWY_SEG_ALT.csv', head, [['V12', 'MONPI', 'WP   ', 'OATSS', '4000', '', 'N'], ['J80', 'OAL', 'VOR/DME', 'ILC', '18000', '45000', 'N'], ['Q5', 'OATSS', 'WP   ', 'NOWHERE', '18000', '', 'N'], ['V9', 'MONPI', 'WP   ', 'OATSS', '', '', 'Y']])
    return fix, awy, nav


@case('K54', 'Raw sources: base/fetch against a fake network (downloaded, 304, identical, http, network, personal, manual, tracked files, cancel)', 'K', static=True,
      rule='frame/aerodb/INTEGRATION (fetch): aero_fetch writes where it wrote; a failed source stops no other; no commit; files tracked by git that the job modified are counted; cancel between files')
def k54(c):
    RJ, BS, AF, DS = _mods()
    saved = (AF.ukmil, AF.navcan)
    try:
        # --- 1. a mixed run: gb (openAIP: 2 layers, 2 absent; UK Mil from a fake provider), es (no openAIP export; ENAIRE not declared), ca (a 500 on a layer; NAV CANADA times out)
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            data = _repo(DS, td, {'sia/openaip/gb_apt.geojson': '{"old":1}'})
            ctx = _ctx(DS, data)
            head_before = _git(DS, data, 'rev-parse', 'HEAD').stdout

            def fake_ukmil(d):
                return [{'name': 'ukmil_enr52.geojson', 'bytes': 2048, 'features': 3, 'unchanged': True}], []

            def fake_navcan(d):
                raise OSError('timed out')
            AF.ukmil, AF.navcan = fake_ukmil, fake_navcan
            asp = json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature'}]}).encode()
            apt = json.dumps({'type': 'FeatureCollection', 'features': []}).encode()
            net = _Net(AF, {'gb_asp': asp, 'gb_apt': apt, 'gb_nav': ('http', 404), 'gb_rpp': ('http', 403), 'es_': ('http', 404), 'ca_asp': ('http', 500), 'ca_apt': apt, 'ca_nav': ('http', 404), 'ca_rpp': ('http', 404)})
            with net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['gb', 'es', 'ca']}, ctx)
            z = view['zones']
            c.eq(view['unit'], 'zones', 'the head counts zones', what='unit')
            c.eq((view['done'], view['total'], view['step']), (3, 3, '3 zones sur 3'), 'done / total / step in zones', what='head')
            c.eq(z['gb']['sources']['openaip'], {'state': 'downloaded', 'files': 2, 'bytes': len(asp) + len(apt)}, 'gb openAIP: the two present layers written, the 403 and 404 passed over', what='gb openaip')
            c.eq(z['gb']['sources']['ukmil'], {'state': 'unchanged', 'files': 1, 'bytes': 2048}, 'gb UK Mil: the provider says nothing changed', what='gb ukmil')
            c.eq(z['gb']['sources']['nats'], {'state': 'manual', 'error': 'manual'}, 'gb NATS: never downloaded, a manual source', what='gb nats')
            c.eq((z['gb']['state'], z['gb']['done'], z['gb']['total']), ('done', 2, 2), 'gb: done, 2 of 2 downloadable sources', what='gb zone')
            c.eq(z['es']['sources']['openaip'], {'state': 'skipped', 'error': 'absent'}, 'es: no openAIP export (the four layers absent) is absent, not a failure', what='es openaip')
            c.eq(z['es']['sources']['enaire'], {'state': 'skipped', 'error': 'personal'}, 'es: ENAIRE is a personal licence, not declared: skipped, never fetched', what='es enaire')
            c.eq((z['es']['state'], z['es']['done'], z['es']['total'], z['es'].get('error')), ('done', 1, 1, None), 'es: done (nothing to download is not a failure); the skipped source is not counted', what='es zone')
            c.eq(z['ca']['sources']['openaip'], {'state': 'failed', 'error': 'http', 'status': 500, 'files': 1, 'bytes': len(apt)}, 'ca openAIP: one layer 500, another written: failed, the file still counted', what='ca openaip')
            c.eq(z['ca']['sources']['navcan'], {'state': 'failed', 'error': 'network'}, 'ca NAV CANADA: a time-out is a network failure', what='ca navcan')
            c.ok(not any(u for u, s in net.calls if 'enaire' in u.lower()), str(net.calls), 'ENAIRE was not asked for anything')
            c.eq(sorted(k for k in z['gb']['sources']), ['nats', 'openaip', 'ukmil'], 'the view carries downloadable, manual and skipped sources; xplane (local) and mora (computed) are left out', what='sources in the view')
            c.eq(res['fetched'], ['gb', 'ca'], 'fetched: the zones where something changed (ca wrote a layer although another failed)', what='fetched')
            c.eq(res['unchanged'], ['es'], 'unchanged: es (nothing there, nothing changed)', what='unchanged')
            c.eq(res['absent'], ['ca_nav', 'ca_rpp', 'es_apt', 'es_asp', 'es_nav', 'es_rpp', 'gb_nav', 'gb_rpp'], 'absent: the layers openAIP does not have (403, 404)', what='absent')
            c.eq(res['failed'], [{'zone': 'ca', 'source': 'navcan', 'error': 'network'},
                                 {'zone': 'ca', 'source': 'openaip', 'error': 'http', 'status': 500}], 'failed: zone, source, code (+ status), in the order they ran', what='failed')
            c.eq((res['ok'], res['reason']), (False, 'partial'), 'not ok, partial: others succeeded', what='verdict')
            nats = next(m for m in res['manual'] if m['source'] == 'nats')
            c.eq(nats, {'zone': 'gb', 'source': 'nats', 'url': 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/', 'name': list(BS.SOURCES['nats']['label']),
                        'pickup': True, 'expected': 'EG_*_DS_*_XML.zip'},
                 'manual: the address (https, from the mirror), the four names, and the file base/pickup takes from Downloads (I24)', what='manual nats')
            c.eq([(m['zone'], m['source']) for m in res['manual']], [('gb', 'nats')], 'manual: only the manual / pdf sources of the requested zones (gb: NATS; es and ca have none)', what='manual list')
            c.eq((res['outside_sync'], res['warnings']), (1, [{'code': 'outside-sync', 'count': 1}]), 'one file tracked by git was modified (gb_apt.geojson): outside-sync 1; the new files are not tracked', what='outside sync')
            c.eq((data / 'sia' / 'openaip' / 'gb_apt.geojson').read_bytes(), apt, 'the file is written where aero_fetch writes it (data/sia/openaip/)', what='written')
            c.ok((data / 'sia' / 'openaip' / 'gb_asp.geojson').read_bytes() == asp and not (data / 'sia' / 'openaip' / 'gb_nav.geojson').exists(), 'files', 'only the layers served')
            c.eq(_git(DS, data, 'rev-parse', 'HEAD').stdout, head_before, 'no commit', what='no commit')
            c.ok('gb_apt' in _git(DS, data, 'status', '--short').stdout, _git(DS, data, 'status', '--short').stdout, 'the tracked file shows as modified in the data repository (that is what outside-sync warns about)')
            c.ok(any('échec' in x and 'ca:' in x for x in view['log']) and not any('échec' in x and 'es:' in x for x in view['log']), str(view['log'][:8]),
                 'the journal says the failures (ca), never an absent export (es)')
            c.eq([x for x in view['log'] if x.startswith('openAIP')], ["openAIP : pas d'export pour ca (nav, rpp), es (apt, asp, nav, rpp), gb (nav, rpp)"], 'the absent exports in one line', what='absent line')

            # --- 2. the same run again: a 304 for the files present (If-Modified-Since given), nothing rewritten
            m0 = {n: (data / 'sia' / 'openaip' / n).stat().st_mtime_ns for n in ('gb_asp.geojson', 'gb_apt.geojson')}
            _git(DS, data, '-c', 'user.name=T', '-c', 'user.email=t@t', 'commit', '-q', '-a', '-m', 'sync')
            net = _Net(AF, {'gb_asp': lambda u, s: None if s else asp, 'gb_apt': lambda u, s: None if s else apt, 'gb_nav': ('http', 404), 'gb_rpp': ('http', 403)})
            with net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['gb']}, ctx)
            c.eq(view['zones']['gb']['sources']['openaip'], {'state': 'unchanged', 'files': 2, 'bytes': len(asp) + len(apt)}, '304 on both files: unchanged', what='304')
            c.ok(all(s for u, s in net.calls if 'gb_asp' in u or 'gb_apt' in u), str(net.calls), 'each present file is asked for with If-Modified-Since')
            c.eq({n: (data / 'sia' / 'openaip' / n).stat().st_mtime_ns for n in m0}, m0, 'a 304 rewrites nothing', what='mtimes')
            c.eq((res['ok'], res['fetched'], res['unchanged'], res['outside_sync'], res['warnings'], 'reason' in res), (True, [], ['gb'], 0, [], False), 'ok, the zone is unchanged, no warning, no reason', what='result 304')
            # --- 3. identical content answered with a 200: never rewritten
            net = _Net(AF, {'gb_asp': asp, 'gb_apt': apt, 'gb_nav': ('http', 404), 'gb_rpp': ('http', 403)})
            with net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['gb']}, ctx)
            c.eq(view['zones']['gb']['sources']['openaip']['state'], 'unchanged', 'a 200 with the same bytes: unchanged', what='identical')
            c.eq({n: (data / 'sia' / 'openaip' / n).stat().st_mtime_ns for n in m0}, m0, 'identical content is never rewritten (date kept)', what='mtimes identical')
            c.eq(res['unchanged'], ['gb'], 'the zone is unchanged', what='unchanged identical')

        # --- 4. ENAIRE declared (personal) and the previous amendment, tracked, removed: counted outside the sync; NAT; the FAA layers
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            data = _repo(DS, td, {'sia/aixm5/LE_2026_09_AIP_DS_FULL_Airspace.xml': '<old/>'})
            ctx = _ctx(DS, data)
            nat_json = json.dumps([{'icao_id': 'EGGX', 'transaction_type': 'NAT_TRACK', 'notam_number_formatted': 'N1', 'part_no': 1, 'start_datetime': 'a', 'end_datetime': 'b',
                                    'condition_message': 'A ALPHA BRAVO 50/20\nEAST LVLS 350 360\nWEST LVLS NIL\nNAR NIL\n'}]).encode()
            fc = json.dumps({'type': 'FeatureCollection', 'features': []}).encode()
            nfix, nawy, nnav = _nasr_zips()
            net = _Net(AF, {'DatosDigitales-en.html': _page_enaire(), 'AIP_DS_FULL_Airspace': b'<a/>', 'AIP_DS_FULL_EnRoute': b'<e/>', 'nat.json': nat_json, 'FeatureServer': fc,
                            'NASR_Subscription': b'<p>Current Subscription effective October 29, 2026</p>', '_FIX_CSV.zip': nfix, '_AWY_CSV.zip': nawy, '_NAV_CSV.zip': nnav,
                            'es_': ('http', 404), 'us_': ('http', 404)})
            with net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['es', 'nat', 'us'], 'personal': ['enaire']}, ctx)
            z = view['zones']
            c.eq((z['es']['sources']['enaire']['state'], z['es']['sources']['enaire']['files']), ('downloaded', 2), 'ENAIRE declared: both datasets downloaded', what='enaire')
            c.ok(sorted(os.listdir(data / 'sia' / 'aixm5')) == ['LE_2026_10_AIP_DS_FULL_Airspace.xml', 'LE_2026_10_AIP_DS_FULL_EnRoute.xml'], str(os.listdir(data / 'sia' / 'aixm5')), 'the previous amendment is removed by aero_fetch')
            c.eq((z['nat']['sources']['nat']['state'], (data / 'sia' / 'zones' / 'nat' / 'nat_tracks.json').is_file()), ('downloaded', True), 'NAT: the tracks file written under zones/nat/', what='nat')
            c.eq({k: v['state'] for k, v in z['us']['sources'].items()}, {'faa': 'downloaded', 'faaclass': 'downloaded', 'openaip': 'skipped'}, 'US: the two FAA sources (sua + mtr + nasr, class) downloaded, no openAIP export (absent)', what='us')
            c.ok(all((data / 'sia' / 'geojson' / f'faa_{l}.geojson').is_file() for l in ('sua', 'mtr', 'class', 'nasr')), str(os.listdir(data / 'sia' / 'geojson')), 'faa_sua, faa_mtr, faa_class and faa_nasr (the fixes and airways of the NASR, SOG-0153 d) written under geojson/')
            c.eq((res['outside_sync'], res['warnings']), (1, [{'code': 'outside-sync', 'count': 1}]), 'the removed amendment was tracked: it counts as modified outside the sync', what='outside enaire')
            c.eq([m['source'] for m in res['manual'] if m['zone'] == 'es'], [], 'es has no manual source; nat none', what='manual es')

        # --- 5. cancel between files: the first request raises the flag; nothing else is requested; the zones not reached say so
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            data = _repo(DS, td)
            ctx = _ctx(DS, data)
            fn, check = RJ.REGISTRY[('base', 'fetch')]
            job = RJ.Job('base', 'fetch', check({'zones': ['gb', 'fr', 'de']}))
            net = _Net(AF, {'_asp': b'{"features":[]}', '_apt': b'{"features":[]}', '_nav': b'{"features":[]}', '_rpp': b'{"features":[]}'}, on_call=lambda u: job._cancel.set())
            with net:
                res = fn(job, job.data['args'], ctx)
            c.eq(len(net.calls), 1, 'the flag is looked at between two layers: one request only', what='requests')
            c.eq({k: v['state'] for k, v in job.view()['zones'].items()}, {'gb': 'cancelled', 'fr': 'cancelled', 'de': 'cancelled'}, 'the zone in progress and the others are cancelled', what='zone states')
            c.eq((res['ok'], res['reason'], res['fetched']), (False, 'cancelled', ['gb']), 'cancelled, with what was done kept (the file written)', what='result cancelled')
            c.eq((data / 'sia' / 'openaip' / 'gb_asp.geojson').is_file(), True, 'the layer that came is written', what='written before cancel')
            # and a job cancelled before it starts asks for nothing
            net = _Net(AF, {})
            with net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['gb']}, ctx, cancel=True)
            c.eq((len(net.calls), res['reason']), (0, 'cancelled'), 'cancelled at once: no request', what='cancelled before')

        # --- 6. nothing to fetch: every downloadable source skipped (or none), and the whole-failure verdict
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            data = _repo(DS, td)
            ctx = _ctx(DS, data)
            g = BS.fetch.__globals__
            old = g['sources_of']
            g['sources_of'] = lambda z: ('sia', 'enaire', 'mora', 'xplane')
            try:
                with _Net(AF, {}) as net:
                    view, res = _run(RJ, BS, 'fetch', {'zones': ['fr']}, ctx)
            finally:
                g['sources_of'] = old
            c.eq((res['ok'], res['reason'], res['fetched'], res['unchanged'], res['failed'], net.calls), (False, 'nothing-to-fetch', [], [], [], []), 'only a manual source and a personal one not declared: nothing to fetch, no request', what='nothing')
            c.eq([(m['zone'], m['source'], 'url' in m) for m in res['manual']], [('fr', 'sia', False)], 'the manual source is still reported (SIA has no address)', what='manual sia')
            with _Net(AF, {'': ('os', 'unreachable')}) as net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['de', 'it']}, ctx)
            c.eq((res['ok'], res['reason'], [f['error'] for f in res['failed']]), (False, 'failed', ['network'] * 3), 'every source failed (NATS, ENAIRE, DFS): reason failed', what='all failed')
            c.eq({k: v['state'] for k, v in view['zones'].items()}, {'de': 'failed', 'it': 'failed'}, 'both zones failed', what='zones failed')
            with _Net(AF, {'': ('http', 404)}) as net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['cyn']}, ctx)
            c.eq((view['zones']['cyn']['sources']['openaip'], view['zones']['cyn']['state'], len(net.calls)), ({'state': 'skipped', 'error': 'absent'}, 'done', 0),
                 'a zone without a two-letter code has no openAIP export: absent, the zone done, no request', what='cyn')
    finally:
        AF.ukmil, AF.navcan = saved


# ---------------------------------------------------------------------------------------------------------------------------------------------
def _snapshot(data):
    out = {}
    for d, dirs, files in os.walk(data):
        dirs[:] = [x for x in dirs if x != '.git']
        for f in files:
            p = os.path.join(d, f)
            out[os.path.relpath(p, data).replace(os.sep, '/')] = os.path.getsize(p)
    return out


def _tree(data):
    """Un arbre data/ d'essai : les sources de plusieurs zones, des caches, la base construite, proc/ ; deux fichiers de gb et fr SUIVIS par git."""
    files = {
        'sia/openaip/gb_asp.geojson': 'a' * 100, 'sia/openaip/gb_apt.geojson': 'b' * 50, 'sia/openaip/de_asp.geojson': 'c' * 10,
        'sia/aixm5/LE_x_AIP_DS_FULL_Airspace.xml': 'd' * 20, 'sia/geojson/faa_sua.geojson': 'e' * 30, 'sia/geojson/faa_class.geojson': 'e' * 5,
        'sia/zones/gb/ukmil_enr52.geojson': 'f' * 40, 'sia/zones/gb/ukmil_ENR-5-2.pdf': 'g' * 60, 'sia/zones/gb/sub/y.json': 'h' * 7, 'sia/zones/nat/nat_tracks.json': 'i' * 9,
        'sia/XML_SIA_2026-10-01.xml': 'j' * 200, 'sia/AIXM4.5_all_FR_OM_2026-10-01.xml': 'k' * 300, 'sia/sia-airspaces-2026-10-01.xml': 'l' * 11, 'sia/miam-enr-5-7-tracks.xml': 'm' * 12,
        'sia/miam-other.xml': 'n' * 13, 'sia/mora.csv': 'o' * 14, 'sia/base/fr/2026-10-01/airspaces.json': 'p' * 15, 'sia/base/index.json': 'q' * 16, 'proc/manual/LFPO.json': 'r' * 17,
        'local/eaip/2026-10-01/a.pdf': 's' * 400, 'local/eaip/2026-10-01/b.txt': 't' * 8, 'local/other/z.bin': 'u' * 6, 'AircraftDB/aircraft_db.js': 'v' * 5}
    for rel, text in files.items():
        p = data / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding='utf-8')
    return files


@case('K55', 'Raw sources: base/purge on a temporary data tree (sources and caches removed, tracked files kept, base and proc untouched, dry run, escapes refused)', 'K', static=True,
      rule='frame/aerodb/INTEGRATION (purge): a zone\'s raw sources and caches go; never sia/base, never proc/, never a file tracked by git, never a link or a path out of data/sia and data/local')
def k55(c):
    RJ, BS, AF, DS = _mods()
    TRACKED = ('sia/openaip/gb_apt.geojson', 'sia/AIXM4.5_all_FR_OM_2026-10-01.xml')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td)
        files = _tree(data)
        _git(DS, data, 'add', '--', *TRACKED)
        _git(DS, data, '-c', 'user.name=T', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'initial')
        ctx = _ctx(DS, data)
        before = _snapshot(data)
        gb_files = ['sia/openaip/gb_asp.geojson', 'sia/zones/gb/ukmil_enr52.geojson', 'sia/zones/gb/ukmil_ENR-5-2.pdf', 'sia/zones/gb/sub/y.json']
        fr_files = ['sia/XML_SIA_2026-10-01.xml', 'sia/sia-airspaces-2026-10-01.xml', 'sia/miam-enr-5-7-tracks.xml', 'sia/miam-other.xml']
        fr_cache = ['local/eaip/2026-10-01/a.pdf', 'local/eaip/2026-10-01/b.txt']
        want_gb = {'files': len(gb_files), 'bytes': sum(len(files[f]) for f in gb_files)}
        want_fr = {'files': len(fr_files) + len(fr_cache), 'bytes': sum(len(files[f]) for f in fr_files + fr_cache)}
        # --- dry run: the same view and result, nothing removed
        view, res = _run(RJ, BS, 'purge', {'zones': ['gb', 'fr'], 'dry': True}, ctx)
        c.eq(_snapshot(data), before, 'a dry run removes nothing', what='dry tree')
        c.eq(res['removed'], {'gb': want_gb, 'fr': want_fr}, 'the dry run counts what would go: gb (its openaip, its zones/gb tree) and fr (AIXM, XML_SIA, sia-airspaces, miam files, the eAIP cache); the tracked files are not counted', what='dry counts')
        c.eq(res['warnings'], [{'code': 'kept-tracked', 'count': 2}, {'code': 'shared-fr'}], 'two tracked files kept (counted); France is shared', what='dry warnings')
        c.eq((res['ok'], 'reason' in res), (True, False), 'ok', what='dry verdict')
        dry_view = {k: dict(v) for k, v in view['zones'].items()}
        # --- the real purge
        view, res = _run(RJ, BS, 'purge', {'zones': ['gb', 'fr']}, ctx)
        c.eq({k: dict(v) for k, v in view['zones'].items()}, dry_view, 'the same view as the dry run (state done, files, bytes)', what='view')
        c.eq(dry_view, {'gb': {'state': 'done', **want_gb}, 'fr': {'state': 'done', **want_fr}}, 'the view: state, files, bytes by zone', what='view shape')
        c.eq((view['unit'], view['done'], view['total'], view['step']), ('zones', 2, 2, '2 zones sur 2'), 'the head in zones', what='head')
        c.eq(res['removed'], {'gb': want_gb, 'fr': want_fr}, 'the same result as the dry run', what='removed')
        after = _snapshot(data)
        c.eq(sorted(set(before) - set(after)), sorted(gb_files + fr_files + fr_cache), 'exactly the zone\'s sources and caches are gone', what='gone')
        for rel in TRACKED:
            c.ok(rel in after, rel, 'a tracked file is kept')
        c.ok(all(rel in after for rel in ('sia/openaip/de_asp.geojson', 'sia/aixm5/LE_x_AIP_DS_FULL_Airspace.xml', 'sia/geojson/faa_sua.geojson', 'sia/zones/nat/nat_tracks.json', 'sia/mora.csv', 'AircraftDB/aircraft_db.js', 'local/other/z.bin')),
             str(sorted(after)), 'other zones, mora.csv, AircraftDB and other caches untouched')
        c.ok(all(rel in after for rel in ('sia/base/fr/2026-10-01/airspaces.json', 'sia/base/index.json', 'proc/manual/LFPO.json')), str(sorted(after)), 'sia/base and proc/ are never touched, even purging fr')
        c.ok(not (data / 'sia' / 'zones' / 'gb').exists() and not (data / 'local' / 'eaip').exists(), 'folders left', 'the folders the purge emptied are removed (zones/gb, local/eaip)')
        c.ok((data / 'sia' / 'zones' / 'nat').is_dir() and (data / 'sia' / 'openaip').is_dir(), 'folders', 'other folders stay')
        c.eq(res['warnings'], [{'code': 'kept-tracked', 'count': 2}, {'code': 'shared-fr'}], 'warnings: two tracked files kept; France is shared', what='warnings')
        c.eq(_git(DS, data, 'status', '--short').stdout.strip().count('D '), 0, 'nothing tracked was deleted in the data repository', what='git status')

        # --- what: caches only / sources only; a zone with nothing
        data2 = _repo(DS, _sub(td, 'b'))
        _tree(data2)
        ctx2 = _ctx(DS, data2)
        view, res = _run(RJ, BS, 'purge', {'zones': ['fr', 'es'], 'what': ['caches']}, ctx2)
        c.eq(res['removed'], {'fr': {'files': 2, 'bytes': 408}, 'es': {'files': 0, 'bytes': 0}}, 'caches only: fr\'s eAIP cache goes, es has none', what='caches only')
        c.eq(res['warnings'], [], 'no shared-fr when no source is purged', what='caches warnings')
        c.ok((data2 / 'sia' / 'XML_SIA_2026-10-01.xml').is_file() and not (data2 / 'local' / 'eaip').exists(), 'files', 'the SIA files stay, the cache is gone')
        view, res = _run(RJ, BS, 'purge', {'zones': ['es', 'us', 'nat'], 'what': ['sources']}, ctx2)
        c.eq(res['removed'], {'es': {'files': 1, 'bytes': 20}, 'us': {'files': 2, 'bytes': 35}, 'nat': {'files': 1, 'bytes': 9}}, 'sources only: ENAIRE\'s file, the FAA files (sua and class), the NAT tracks', what='sources only')
        c.ok((data2 / 'sia' / 'openaip' / 'gb_asp.geojson').is_file(), 'files', 'gb untouched')
        # --- no repository: everything goes, nothing to keep
        data3 = Path(td) / 'c'
        data3.mkdir()
        _tree(data3)
        view, res = _run(RJ, BS, 'purge', {'zones': ['gb']}, {'data': str(data3), 'secrets': str(Path(td) / 's')})
        c.eq((res['removed']['gb'], res['warnings']), ({'files': want_gb['files'] + 1, 'bytes': want_gb['bytes'] + len(files['sia/openaip/gb_apt.geojson'])}, []),
             'without a data repository nothing is tracked: all of gb goes (its tracked file of the other tree too), no warning', what='no repo')

        # --- an escape: a link inside a zone folder is not followed; the path guard refuses '..' and links
        data4 = _repo(DS, _sub(td, 'd'))
        _tree(data4)
        outside = Path(td) / 'outside'
        outside.mkdir()
        (outside / 'precious.txt').write_text('keep', encoding='utf-8')
        linked = False
        for kind, link, target in (('dir', data4 / 'sia' / 'zones' / 'gb' / 'out', outside), ('file', data4 / 'sia' / 'openaip' / 'gb_link.geojson', outside / 'precious.txt')):
            try:
                os.symlink(target, link, target_is_directory=(kind == 'dir'))
                linked = True
            except (OSError, NotImplementedError):
                if kind == 'dir' and os.name == 'nt':  # no privilege for a symbolic link: a junction, which os.walk follows
                    r = subprocess.run(['cmd', '/c', 'mklink', '/J', str(link), str(target)], capture_output=True)
                    linked = linked or r.returncode == 0
        ctx4 = _ctx(DS, data4)
        view, res = _run(RJ, BS, 'purge', {'zones': ['gb']}, ctx4)
        c.ok((outside / 'precious.txt').read_text(encoding='utf-8') == 'keep', 'the file outside was removed', 'a link or junction in a zone folder is never followed: the file outside data/ is still there')
        c.ok(not (data4 / 'sia' / 'openaip' / 'gb_asp.geojson').exists(), 'gb_asp left', 'the zone\'s own files are removed all the same')
        if linked:
            c.ok(any(w['code'] == 'unsafe-path' for w in res['warnings']), str(res['warnings']), 'a refused path is counted in the warnings (unsafe-path)')
        sia = os.path.realpath(data4 / 'sia')
        c.eq([BS._inside(p, sia) for p in (str(data4 / 'sia' / 'openaip' / '..' / '..' / 'proc' / 'manual' / 'LFPO.json'), str(data4 / 'sia' / '..' / 'local' / 'other' / 'z.bin'), str(outside / 'precious.txt'),
                                           str(data4 / 'sia' / 'mora.csv'), str(data4 / 'sia' / 'openaip' / 'de_asp.geojson'))], [False, False, False, True, True],
             'the guard: ".." out of data/sia, another folder and a file outside are refused; files inside accepted', what='guard')

        # --- git failing: nothing is guessed, nothing is removed, the zone says so
        data5 = _repo(DS, _sub(td, 'e'))
        _tree(data5)
        ctx5 = dict(_ctx(DS, data5), git_cmd=lambda *a: [sys.executable, '-c', 'import sys; sys.exit(3)'])
        b5 = _snapshot(data5)
        view, res = _run(RJ, BS, 'purge', {'zones': ['gb', 'de']}, ctx5)
        c.eq(({k: (v['state'], v.get('error')) for k, v in view['zones'].items()}, _snapshot(data5) == b5, res['ok'], res['reason']),
             ({'gb': ('failed', 'git'), 'de': ('failed', 'git')}, True, False, 'failed'), 'git cannot say what is tracked: both zones fail (git), nothing is removed', what='git failing')
        # --- cancelled before the first zone
        view, res = _run(RJ, BS, 'purge', {'zones': ['gb', 'de']}, ctx5, cancel=True)
        c.eq((res['ok'], res['reason'], res['removed'], {k: v['state'] for k, v in view['zones'].items()}), (False, 'cancelled', {}, {'gb': 'waiting', 'de': 'waiting'}), 'cancelled: nothing done, the zones not reached stay waiting', what='cancelled')


# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K56', 'Raw sources: the data repository template ignores them (sia/openaip, zones, aixm5, geojson, miam, the aircraft HTTP cache, __pycache__)', 'K', static=True,
      rule='DECISIONS 30 Oct 2026: the raw sources leave the data repository; the built base (sia/base), proc/ and AircraftDB/aircraft_db.js stay tracked')
def k56(c):
    RJ, BS, AF, DS = _mods()
    tpl = ROOT / 'tools' / 'data_template' / '.gitignore'
    text = tpl.read_text(encoding='utf-8')
    for line in ('sia/AIXM*.xml', 'sia/XML_SIA_*.xml', 'sia/sia-airspaces-*.xml', 'sia/_archives/', 'sia/openaip/', 'sia/zones/', 'sia/aixm5/', 'sia/geojson/', 'sia/miam-*.xml',
                 'AircraftDB/aircraft_http_cache.json', '**/__pycache__/'):
        c.ok(line in text.splitlines(), line, f'the template has the line {line}')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        data.mkdir()
        _git(DS, data, 'init', '-q')
        (data / '.gitignore').write_text(text, encoding='utf-8')

        def ignored(rel):
            return _git(DS, data, 'check-ignore', '-q', '--', rel).returncode == 0
        ign = ['sia/openaip/gb_asp.geojson', 'sia/zones/gb/ukmil_enr52.geojson', 'sia/zones/nat/nat_tracks.json', 'sia/aixm5/LE_x.xml', 'sia/geojson/faa_sua.geojson', 'sia/miam-enr-5-7-tracks.xml',
               'sia/XML_SIA_2026-10-01.xml', 'AircraftDB/aircraft_http_cache.json', 'tools/__pycache__/x.pyc', 'a/b/__pycache__/y.pyc']
        keep = ['sia/base/fr/2026-10-01/airspaces.json', 'sia/base/index.json', 'sia/mora.csv', 'sia/vfr/x.json', 'proc/manual/LFPO.json', 'AircraftDB/aircraft_db.js', 'AircraftDB/aircraft_perf.js']
        c.eq([p for p in ign if not ignored(p)], [], 'the raw sources, the aircraft HTTP cache and the Python caches are ignored', what='not ignored')
        c.eq([p for p in keep if ignored(p)], [], 'the built base, mora.csv, proc/ and the aircraft database stay tracked', what='ignored by mistake')


# ---------------------------------------------------------------------------------------------------------------------------------------------
class _Resp:
    """Une réponse HTTP d'essai pour urlopen : Content-Length annoncé (ou absent) et un corps lu par morceaux."""

    def __init__(self, body, length=None):
        self.body, self.pos, self.headers = body, 0, {'Content-Length': str(length)} if length is not None else {}

    def read(self, n=-1):
        part = self.body[self.pos:] if n < 0 else self.body[self.pos:self.pos + n]
        self.pos += len(part)
        return part

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass


@case('K57', 'Raw sources: what aero_fetch takes from a server (ENAIRE names under sia/aixm5, NAV CANADA on its own host in https, 200 MB per response)', 'K', static=True,
      rule='Security review of 30 Oct 2026 (aero_fetch): a name read from a page writes a file only after proc_pdf.safe_path; an address read from a page is requested only on the host of BASE in https; get() stops at MAX_BYTES')
def k57(c):
    RJ, BS, AF, DS = _mods()
    import navcan_dah as NC
    # --- ENAIRE: a name with a backslash, a dot-dot or a sub-folder is never written; a good one is, and the previous amendment goes
    bad = [r'LE_x\..\..\evil_AIP_DS_FULL_Airspace.xml', 'LE_../../evil_AIP_DS_FULL_Airspace.xml', 'LE_a/b_AIP_DS_FULL_Airspace.xml']
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'sia' / 'aixm5').mkdir(parents=True)
        page = ''.join(f'<a href="contenido_Datasets/{n}">x</a>' for n in bad).encode()
        with _Net(AF, {'DatosDigitales-en.html': page, 'AIP_DS_FULL': b'<evil/>'}) as net:
            out, err = AF.enaire(str(data))
        c.eq((out, [u for u, _ in net.calls if 'contenido_Datasets' in u]), ([], []), 'ENAIRE: a name with a backslash, a dot-dot or a slash is not taken from the page; nothing is requested', what='bad names')
        c.eq(sorted(p.relative_to(Path(td)).as_posix() for p in Path(td).rglob('*') if p.is_file()), [], 'nothing is written anywhere in the temporary folder', what='written')
        c.eq(len(err), 2, 'both datasets say they are not found on the page (parse)', what='errors')
        old = data / 'sia' / 'aixm5' / 'LE_2026_09_AIP_DS_FULL_Airspace.xml'
        old.write_bytes(b'<old/>')
        (data / 'sia' / 'aixm5' / 'notes.xml').write_bytes(b'<keep/>')
        with _Net(AF, {'DatosDigitales-en.html': _page_enaire(), 'AIP_DS_FULL_Airspace': b'<a/>', 'AIP_DS_FULL_EnRoute': b'<e/>'}) as net:
            out, err = AF.enaire(str(data))
        c.eq((sorted(os.listdir(data / 'sia' / 'aixm5')), err), (['LE_2026_10_AIP_DS_FULL_Airspace.xml', 'LE_2026_10_AIP_DS_FULL_EnRoute.xml', 'notes.xml'], []),
             'a good name is written under sia/aixm5, the previous amendment of the same dataset removed, another file kept', what='good name')
        c.ok(all(u.startswith(AF.ENAIRE + 'contenido_Datasets/LE_2026_10_') for u, _ in net.calls[1:]), str(net.calls), 'the datasets are requested on the ENAIRE address only')
    # --- NAV CANADA: only https on www.navcanada.ca
    page = ('<a href="http://www.navcanada.ca/dah20260901.pdf"> <a href="https://evil.example/dah20261001.pdf"> <a href="https://www.navcanada.ca.evil.example/dah20261002.pdf">'
            '<a href="//evil.example/dah20261003.pdf"> <a href="/en/dah20260801.pdf">')
    c.eq(NC.current_url(page, '20261029'), 'https://www.navcanada.ca/en/dah20260801.pdf', 'NAV CANADA: http://, another host or a look-alike host are set aside; the relative link is resolved on BASE', what='navcan')
    c.eq(NC.current_url('<a href="https://evil.example/dah20261001.pdf">', '20261029'), None, 'NAV CANADA: no link on its own host -> none (the page says the guide is not found)', what='navcan none')
    c.eq(NC.current_url('<a href="https://www.navcanada.ca/a/dah20260101.pdf"><a href="https://www.navcanada.ca/a/dah20270101.pdf">', '20261029'),
         'https://www.navcanada.ca/a/dah20260101.pdf', 'NAV CANADA: the latest edition already in force', what='navcan in force')
    # --- get(): 200 MB at most, stopped cleanly (an OSError: the source fails as network, the present file is kept)
    saved = (AF._open, AF.MAX_BYTES)
    try:
        AF.MAX_BYTES = 1000
        for body, length, ok in ((b'x' * 999, 999, True), (b'x' * 1000, None, True), (b'x' * 1001, None, False), (b'x' * 10, 5000, False), (b'x' * 3000, 10, False)):
            AF._open = lambda req, timeout, quiet, b=body, n=length: _Resp(b, n)
            try:
                got = AF.get('https://example.invalid/x')
                res = ('ok', len(got))
            except AF.TooLarge as e:
                res = ('too-large', BS.classify(e)['error'])
            c.eq(res, ('ok', len(body)) if ok else ('too-large', 'network'), f'get: {len(body)} bytes, Content-Length {length} -> {"read" if ok else "stopped (network)"}', what=f'get {len(body)}/{length}')
    finally:
        AF._open, AF.MAX_BYTES = saved
    c.eq(AF.MAX_BYTES, 200 * 1024 * 1024, 'the cap is 200 MB per response', what='MAX_BYTES')


# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K60', 'Raw sources: an openAIP export a country does not have (404) is absent, not a failure; remembered for the cycle; a 5xx stays a failure', 'K', static=True,
      rule='frame/aerodb/INTEGRATION (fetch): a 404 on an optional per-country export is absent (one line per pass, the zone done), remembered per AIRAC cycle outside data/ and not asked again; only a 5xx, a time-out or an unreadable answer is a failure, said per file; the launcher\'s console carries only what needs an action')
def k60(c):
    RJ, BS, AF, DS = _mods()
    lay = json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature'}]}).encode()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td)
        ctx = _ctx(DS, data)
        routes = {'kh_apt': lay, 'kh_asp': ('http', 404), 'kh_nav': ('http', 404), 'kh_rpp': ('http', 404), 'iq_': ('http', 404)}
        g = BS.fetch.__globals__
        old = g['sources_of']
        g['sources_of'] = lambda z: ('openaip',)
        try:
            with _Net(AF, dict(routes)) as net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['kh', 'iq']}, ctx)
            z = view['zones']
            c.eq((z['kh']['state'], z['kh']['sources']['openaip']), ('done', {'state': 'downloaded', 'files': 1, 'bytes': len(lay)}),
                 'kh: the layer it has written, the three it has not are passed over: the zone done', what='kh')
            c.eq((z['iq']['state'], z['iq']['sources']['openaip']), ('done', {'state': 'skipped', 'error': 'absent'}), 'iq: no export at all is absent, the zone done', what='iq')
            c.eq((res['ok'], res['failed'], res['absent']), (True, [], ['iq_apt', 'iq_asp', 'iq_nav', 'iq_rpp', 'kh_asp', 'kh_nav', 'kh_rpp']), 'ok, nothing failed, the absent layers listed', what='result')
            lines = [x for x in view['log'] if 'openAIP' in x or 'échec' in x]
            c.eq(lines, ["openAIP : pas d'export pour iq (apt, asp, nav, rpp), kh (asp, nav, rpp)"], 'one line for the pass, never an « échec » line', what='log')
            saved = json.loads((Path(td) / 'cache' / BS.ABSENT_FILE).read_text(encoding='utf-8'))
            c.eq(saved, {'cycle': BS.airac_start(), 'absent': res['absent']}, 'remembered for the AIRAC cycle, in the cache folder outside data/', what='cache')
            c.ok(not any(p.name == BS.ABSENT_FILE for p in Path(data).rglob('*')), 'data/', 'nothing written in data/ for it')
            # the next pass of the same cycle asks only for what exists
            with _Net(AF, dict(routes)) as net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['kh', 'iq']}, ctx)
            c.eq(sorted(u.rsplit('/', 1)[-1] for u, _ in net.calls), ['kh_apt.geojson'], 'same cycle: the absent layers are not asked again', what='second pass')
            c.eq((res['absent'], view['zones']['iq']['sources']['openaip']), (['iq_apt', 'iq_asp', 'iq_nav', 'iq_rpp', 'kh_asp', 'kh_nav', 'kh_rpp'], {'state': 'skipped', 'error': 'absent'}),
                 'still said absent', what='second result')
            # another cycle: asked again; a 5xx stays a failure, said per file
            (Path(td) / 'cache' / BS.ABSENT_FILE).write_text(json.dumps({'cycle': '2000-01-01', 'absent': ['kh_asp', 'kh_nav', 'kh_rpp']}), encoding='utf-8')
            with _Net(AF, {**routes, 'kh_asp': ('http', 503)}) as net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['kh']}, ctx)
            c.eq(sorted(u.rsplit('/', 1)[-1] for u, _ in net.calls), ['kh_apt.geojson', 'kh_asp.geojson', 'kh_nav.geojson', 'kh_rpp.geojson'], 'another cycle: asked again', what='new cycle')
            c.eq((res['failed'], view['zones']['kh']['state'], res['absent']), ([{'zone': 'kh', 'source': 'openaip', 'error': 'http', 'status': 503}], 'failed', ['kh_nav', 'kh_rpp']),
                 'a 503 is a failure (http 503); the 404s still absent', what='5xx')
            c.ok(any('kh: openaip échec (http 503)' in x for x in view['log']), str(view['log']), 'the failure is said in the job log, per file')
        finally:
            g['sources_of'] = old
    # aero_fetch asks the launcher's opener not to write an expected absence in its console (outbound absent_ok), and does write the rest
    seen = []

    def fake(req, timeout, quiet):
        seen.append((req.full_url.rsplit('/', 1)[-1], 404 in quiet))
        raise urllib.error.HTTPError(req.full_url, 404, 'not found', {}, None)
    saved = AF._open
    AF._open = fake
    try:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            gone = []
            out, err = AF.openaip(td, ['kh'], layers=('rpp',), absent=gone)
    finally:
        AF._open = saved
    c.eq((seen, out, err, gone), ([('kh_rpp.geojson', True)], [], [], ['kh_rpp']), 'openaip(): asked with absent_ok, the 404 absent, no error', what='absent_ok')
    import contextlib
    import io
    import outbound

    class Answer(urllib.request.BaseHandler):  # le serveur d'essai : répond le code demandé, sans réseau (avant le gestionnaire https)
        handler_order = 100

        def __init__(self, code):
            self.code = code

        def https_open(self, req):
            raise urllib.error.HTTPError(req.full_url, self.code, 'x', {}, None)
    lines = []
    for code, quiet in ((404, (404, 410)), (503, (404, 410)), (404, ())):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            try:
                outbound.opener(Answer(code), quiet=quiet).open(urllib.request.Request('https://s3.openaip.net/x/kh_rpp.geojson'), timeout=5)
            except urllib.error.HTTPError:
                pass
        lines.append(buf.getvalue().count('[sortant] échec'))
    c.eq(lines, [0, 1, 1], "the launcher's console: an expected absence (404, quiet) not written; a 503, or a 404 not declared expected, written", what='console')



# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K61', 'Raw sources: a 304 Not Modified is « unchanged » (the copy kept, nothing in the launcher\'s console); a 304 without a copy asks again without condition', 'K', static=True,
      rule='frame/aerodb/INTEGRATION (fetch): a conditional request answered 304 keeps the local copy and is a success; only a 5xx, a time-out or an unreadable answer is a failure; a 304 with no copy behind it is asked again without condition')
def k61(c):
    import contextlib
    import email.message
    import io
    import urllib.response
    RJ, BS, AF, DS = _mods()
    import outbound  # tools/ est dans le chemin une fois _mods() passé
    lay = json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature'}]}).encode()

    class Server(urllib.request.BaseHandler):  # le serveur d'essai, sans réseau : 304 à une requête conditionnelle (ou toujours), sinon le fichier
        handler_order = 100

        def __init__(self, always_304=False):
            self.always, self.seen = always_304, []

        def https_open(self, req):
            cond, fresh = req.has_header('If-modified-since'), req.has_header('Cache-control')
            self.seen.append(('cond' if cond else 'fresh' if fresh else 'plain', req.full_url.rsplit('/', 1)[-1]))
            if cond or (self.always and not fresh):
                raise urllib.error.HTTPError(req.full_url, 304, 'Not Modified', email.message.Message(), None)
            h = email.message.Message()
            h['Content-Length'] = str(len(lay))
            r = urllib.response.addinfourl(io.BytesIO(lay), h, req.full_url, 200)
            r.msg = 'OK'
            return r

    saved = dict(AF._OPENERS)
    try:
        for always, label in ((False, 'copy present'), (True, 'no copy')):
            srv = Server(always)
            AF._OPENERS.clear()
            for quiet in ((304, 404, 410), (404, 410), (304, ), ()):
                AF._OPENERS[quiet] = outbound.opener(srv, quiet=quiet)
            with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
                path = Path(td) / 'sia' / 'openaip' / 'de_asp.geojson'
                if not always:
                    path.parent.mkdir(parents=True)
                    path.write_bytes(b'{"old": 1}')
                    m0 = path.stat().st_mtime_ns
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    out, err = AF.openaip(td, ['de'], layers=('asp', ))
                if not always:
                    c.eq((out, err, path.read_bytes(), path.stat().st_mtime_ns, srv.seen), ([{'name': 'de_asp.geojson', 'bytes': 10, 'unchanged': True}], [], b'{"old": 1}', m0,
                                                                                         [('cond', 'de_asp.geojson')]),
                         '304: unchanged, the copy kept as it was (bytes and date), one conditional request', what='304 copy')
                else:
                    c.eq((err, path.read_bytes(), srv.seen), ([], lay, [('plain', 'de_asp.geojson'), ('fresh', 'de_asp.geojson')]),
                         '304 with no copy behind it (no condition sent): asked again without condition, the file written, no failure', what='304 no copy')
                c.eq(buf.getvalue().count('[sortant]'), 0, f'{label}: nothing in the launcher\'s console', what=f'console {label}')
        # a 304 again on the fresh request is an error (the server is wrong), said
        srv = Server(True)
        srv.https_open = lambda req: (_ for _ in ()).throw(urllib.error.HTTPError(req.full_url, 304, 'Not Modified', email.message.Message(), None))
        AF._OPENERS.clear()
        for quiet in ((304, ), ()):
            AF._OPENERS[quiet] = outbound.opener(srv, quiet=quiet)
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            try:
                AF.get('https://s3.openaip.net/x/de_asp.geojson')
                got = 'returned'
            except urllib.error.HTTPError as e:
                got = e.code
        c.eq((got, buf.getvalue().count('[sortant] échec')), (304, 1), 'a 304 to the request without condition is an error, said once', what='304 twice')
    finally:
        AF._OPENERS.clear()
        AF._OPENERS.update(saved)


# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K64', 'Raw sources: the cycle the workstation holds per dated source (SIA, NATS, ENAIRE), in the plan and the end of base/fetch', 'K', static=True,
      rule='Simplification 1 Nov 2026: base/fetch (plan and end) and base/build give sources: { <dated source>: { cycle | null, current, stale } }, read from the dates the files carry; a source without AIRAC has none')
def k64(c):
    import datetime
    RJ, BS, AF, DS = _mods()
    import aero_cycles as C
    d = datetime.date
    c.eq([C.airac_start(d(2026, 1, 21)), C.airac_start(d(2026, 1, 22)), C.airac_start(d(2026, 10, 28)), C.airac_start(d(2026, 10, 29))],
         ['2025-12-25', '2026-01-22', '2026-10-01', '2026-10-29'], 'the AIRAC calendar (2601 on 22 Jan, 2610 on 1 Oct, 2611 on 29 Oct)', what='calendar')
    names = ['XML_SIA_2026-10-01.xml', 'AIXM4.5_all_FR_OM_2026-10-29.xml', 'sia-airspaces-2026-10-01.xml', 'zones/gb/EG_AIP_DS_FULL_20261001.xml',
             'zones/gb/EG_OBS_DS_AREA1_FULL_20261030.xml', 'aixm5/LE_Amdt_A_2026_10_AIP_DS_FULL_EnRoute.xml', 'aixm5/LE_Amdt_2026_411_AIP_DS_FULL_Airspace.xml',
             'openaip/de_asp.geojson', 'zones/gb/ukmil_enr52.geojson', 'XML_SIA_2026-13-40.xml', 'miam-enr-5-7-tracks.xml']
    c.eq([C.cycled(n) for n in names], [('sia', '2026-10-01'), ('sia', '2026-10-29'), ('sia', '2026-10-01'), ('nats', '2026-10-01'), None, None,
                                        None, None, None, None, None],
         'the cycle in the names: SIA dates, the NATS AIP date only (SOG-0077: the OBS and UAS sets of another date do not date the zone); ENAIRE\'s names say none (« A_2026_10 » is its 10th amendment, not cycle 2610), openAIP, UK Mil, an impossible date: none', what='names')
    # ENAIRE: the cycle is read in the file, the latest validTime start up to today (the EnRoute « A_2026_10 » valid from 29 Oct 2026 is cycle 2611, SOG-0025)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td0:
        sia = Path(td0) / 'sia'
        (sia / 'aixm5').mkdir(parents=True)
        vt = lambda *ds: '<m>' + ''.join(f'<gml:validTime><gml:TimePeriod gml:id="t{i}"><gml:beginPosition>{x}T00:00:00Z</gml:beginPosition></gml:TimePeriod></gml:validTime>' for i, x in enumerate(ds)) + '</m>'
        (sia / 'aixm5' / 'LE_Amdt_A_2026_10_AIP_DS_FULL_EnRoute.xml').write_text(vt('2013-07-01', '2026-10-29', '2026-10-01', '2026-12-17'), encoding='utf-8')   # 2026-12-17: later than today, ignored
        (sia / 'aixm5' / 'LE_Amdt_2026_411_AIP_DS_FULL_Airspace.xml').write_text(vt('2025-10-02', '2026-10-01'), encoding='utf-8')
        (sia / 'aixm5' / 'LE_Amdt_2026_412_AIP_DS_FULL_Obstacles_LEBL.xml').write_text(vt('2026-10-29'), encoding='utf-8')        # not an Airspace / EnRoute set: not read for the cycle
        (sia / 'aixm5' / 'LE_bad_AIP_DS_FULL_EnRoute.xml').write_bytes(b'\xff\xfe not xml')
        today = d(2026, 11, 5)
        c.eq([C.cycled(f'aixm5/{n}', str(sia), today) for n in ('LE_Amdt_A_2026_10_AIP_DS_FULL_EnRoute.xml', 'LE_Amdt_2026_411_AIP_DS_FULL_Airspace.xml', 'LE_Amdt_2026_412_AIP_DS_FULL_Obstacles_LEBL.xml', 'LE_bad_AIP_DS_FULL_EnRoute.xml')],
             [('enaire', '2026-10-29'), ('enaire', '2026-10-01'), None, None], 'ENAIRE: the cycle of the file is its latest validTime start up to today; a later date, another set, an unreadable file: not counted', what='enaire files')
        c.eq(C.report(['aixm5/LE_Amdt_A_2026_10_AIP_DS_FULL_EnRoute.xml', 'aixm5/LE_Amdt_2026_411_AIP_DS_FULL_Airspace.xml'], today, str(sia))['enaire'],
             {'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False}, 'the source holds the newest of its files: current, not stale (the Airspace set of AMDT 411 does not make it old)', what='enaire report')
    # one rule with the source table (shared/aero_zones.js, mirrored in base_sources): the same source for each dated file, the same zone per source
    c.eq([BS.file_source(n)['source'] for n in names if C.cycled(n)], [C.cycled(n)[0] for n in names if C.cycled(n)], 'each dated file belongs to the source the table says', what='mirror files')
    c.ok(all(s in BS.sources_of(z) for s, z in C.CYCLED.items()), str(C.CYCLED), 'each dated source is a source of its zone in the table')
    c.ok(not any(s in C.CYCLED for z in ('de', 'it', 'us', 'ca', 'nat') for s in BS.sources_of(z)), 'others', 'zones fed only by sources without AIRAC have no dated source')
    rep = C.report(names, d(2026, 11, 1))
    c.eq(rep, {'sia': {'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False}, 'nats': {'cycle': '2026-10-01', 'current': '2026-10-29', 'stale': True},
               'enaire': {'cycle': None, 'current': '2026-10-29', 'stale': False}, 'airnav': {'cycle': None, 'current': '2026-10-29', 'stale': False}, 'lfv': {'cycle': None, 'current': '2026-10-29', 'stale': False}, 'navpt': {'cycle': None, 'current': '2026-10-29', 'stale': False}},
         'report: the newest cycle of each source (NATS: the AIP alone dates it, SOG-0077; ENAIRE: none without its folder), stale when older than the cycle in force', what='report')
    c.eq(C.report([], d(2026, 11, 1))['sia'], {'cycle': None, 'current': '2026-10-29', 'stale': False}, 'no file: no cycle, not stale', what='no file')
    # base/fetch: the plan (in the view from the start) and the end carry it
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td)
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        (data / 'sia' / 'XML_SIA_2026-10-01.xml').write_text('<x/>', encoding='utf-8')
        (data / 'sia' / 'zones' / 'gb' / 'EG_AIP_DS_FULL_20261001.xml').write_text('<x/>', encoding='utf-8')
        ctx = _ctx(DS, data)
        with _Net(AF, {'': ('http', 404)}):
            view, res = _run(RJ, BS, 'fetch', {'zones': ['de']}, ctx)
        cur = C.airac_start()
        want = {'sia': {'cycle': '2026-10-01', 'current': cur, 'stale': '2026-10-01' < cur}, 'nats': {'cycle': '2026-10-01', 'current': cur, 'stale': '2026-10-01' < cur},
                'enaire': {'cycle': None, 'current': cur, 'stale': False}, 'airnav': {'cycle': None, 'current': cur, 'stale': False}, 'lfv': {'cycle': None, 'current': cur, 'stale': False}, 'navpt': {'cycle': None, 'current': cur, 'stale': False}}
        c.eq((view['sources'], res['sources']), (want, want), 'the plan and the end of base/fetch give the cycle held per dated source', what='fetch sources')


@case('K67', 'Data inventory: the seven places of « data », their size and tracking, read only, never a file path or a content', 'K', static=True,
      rule='SOG-0010 lot E2 (frame/settings/DATA_MAP.md § 5.1): tools/data_inventory.py gives seven rows (data/, data/local/, the raw SIA sources, the device cache, the suite\u2019s working folders, Downloads, the backups left at the root), each with its size, tracked / local / outside, and its writer; nothing is written, no path or content leaves')
def k67(c):
    RJ, BS, AF, DS = _mods()
    import data_inventory as DI
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td) / 'suite'
        (root / 'AircraftDB').mkdir(parents=True)
        (root / 'AircraftDB' / 'aircraft_db.js').write_text('x' * 1000, encoding='utf-8')
        (root / 'data_avant_2026-10-23_100032').mkdir()
        (root / 'data_avant_2026-10-23_100032' / 'old.json').write_text('y' * 500, encoding='utf-8')
        dl = Path(td) / 'Downloads'
        dl.mkdir()
        (dl / 'export_xml_bd_SIA_2026-10-29-v1.zip').write_bytes(b'z' * 2000)
        data = _repo(DS, td, {'airline/settings.json': '{"name":"X"}', 'proc/2026-10-29/LFPG.json': '{}', '.gitignore': 'local/\nsia/*.xml\nsia/*.zip\n'})
        (data / 'local' / 'cifp').mkdir(parents=True)
        (data / 'local' / 'cifp' / 'big.txt').write_text('l' * 3000, encoding='utf-8')
        (data / 'sia').mkdir()
        (data / 'sia' / 'XML_SIA_2026-10-01.xml').write_text('<x/>' * 100, encoding='utf-8')
        (data / 'sia' / 'AIXM4.5_all_FR_OM_2026-10-01.xml').write_text('<y/>' * 50, encoding='utf-8')
        before = sorted(str(p.relative_to(td)) for p in Path(td).rglob('*') if '.git' not in p.parts)
        rows = DI.inventory(str(data), str(root), str(dl), DS.git)
        after = sorted(str(p.relative_to(td)) for p in Path(td).rglob('*') if '.git' not in p.parts)
        c.eq([r['id'] for r in rows], list(DI.PLACES), 'seven rows, in the order of the table', what='ids')
        by = {r['id']: r for r in rows}
        c.eq([by[k]['present'] for k in DI.PLACES], [True, True, True, False, True, True, True], 'what exists on this workstation is present; the device cache is in the browser: absent here', what='present')
        c.eq([by[k]['state'] for k in DI.PLACES], ['tracked', 'local', 'local', 'outside', 'outside', 'outside', 'outside'],
             'tracking from git: the repository tracked, data/local/ ignored (local), the raw sources local, the rest outside the repository', what='states')
        c.eq((by['local']['bytes'], by['raw']['bytes'], by['raw']['files'], by['suite']['bytes'], by['downloads']['bytes'], by['backup']['bytes'], by['backup']['count']),
             (3000, 400 + 200, 2, 1000, 2000, 500, 1), 'sizes: local 3000, the two raw SIA files 600, the suite folders 1000, Downloads 2000, the backup 500 (one)', what='sizes')
        c.eq([by[k]['writer'] for k in DI.PLACES], ['launcher+pilots', 'launcher', 'user', 'app', 'suite', 'user', 'restoration'], 'one writer per place', what='writers')
        c.eq(before, after, 'read only: not a file created, changed or moved', what='read only')
        # a closed list of fields: nothing else (a path, a name, a content) can leave, whatever the folders hold
        allowed = {'id', 'present', 'bytes', 'files', 'truncated', 'state', 'writer', 'count'}
        c.eq(sorted({k for r in rows for k in r} - allowed), [], 'only the closed list of fields leaves: no path, no name, no content', what='fields')
        blob = json.dumps(rows)
        c.ok('XML_SIA' not in blob and 'LFPG' not in blob and 'big.txt' not in blob and 'suite' not in blob.replace('"suite"', ''), blob[:160], 'no file name, no path, no content in the answer')
        # without git: the repository state stays « unknown », never invented; the sizes are still read
        rows2 = {r['id']: r for r in DI.inventory(str(data), str(root), str(dl), None)}
        c.eq([rows2['repo']['state'], rows2['local']['state'], rows2['repo']['bytes'] > 0], ['unknown', 'unknown', True], 'without git the tracking is unknown, not guessed', what='no git')
        # an absent place does not fail
        gone = {r['id']: r for r in DI.inventory(str(Path(td) / 'nope'), str(Path(td) / 'nope2'), '', None)}
        c.eq([gone['repo']['present'], gone['downloads']['present'], gone['backup']['present']], [False, False, False], 'absent places are said absent, no exception', what='absent')
# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K68', 'base/pickup takes the openAIP exports of Downloads: GeoJSON as it is, the JSON array converted, the XML (openAIP 1.1) said, never a wrong country or a path', 'K', static=True,
      rule='SOG-0027 (5 Nov 2026): « Prendre le fichier téléchargé » accepts an openAIP export dropped in Downloads, at the place of the others (data/sia/openaip/), and says what it does with each file; openAIP stays the fallback behind the official sources')
def k68(c):
    RJ, BS, AF, DS = _mods()
    sq = [[[1, 40], [1.1, 40], [1.1, 40.1], [1, 40.1], [1, 40]]]
    gj = lambda cc: json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Polygon', 'coordinates': sq},
                                                                           'properties': {'_id': 'a1', 'name': 'X', 'country': cc, 'upperLimit': {'value': 1}}}]})
    arr = lambda cc, n=2: json.dumps([{'_id': f'p{i}', 'name': f'P{i}', 'country': cc, 'compulsory': True, 'geometry': {'type': 'Point', 'coordinates': [-5.3, 6.8]}} for i in range(n)])
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = Path(td) / 'Downloads', Path(td) / 'data'
        dl.mkdir()
        data.mkdir()
        (dl / 'kh_asp.geojson').write_text(gj('KH'), encoding='utf-8')               # GeoJSON: as it is
        (dl / 'kh_rpp.json').write_text(arr('KH'), encoding='utf-8')                 # JSON array: converted
        (dl / 'kh_apt.xml').write_text('<?xml version="1.0"?><OPENAIP DATAFORMAT="1.1"/>', encoding='utf-8')   # openAIP 1.1 XML: said, not read
        (dl / 'kh_hot.xml').write_text('<x/>', encoding='utf-8')                      # hotspots: not used
        (dl / 'iq_nav.json').write_text(arr('FR'), encoding='utf-8')                  # objects of another country than the name: refused
        (dl / 'iq_asp.json').write_text('not json', encoding='utf-8')                 # unreadable: refused
        (dl / 'ie_asp.geojson').write_text(gj('IE'), encoding='utf-8')
        (dl / 'ie_asp (1).geojson').write_text(gj('IE'), encoding='utf-8')            # a duplicate: the latest of the name only
        os.utime(dl / 'ie_asp.geojson', (1_700_000_000, 1_700_000_000))
        (dl / '..evil.geojson').write_text(gj('KH'), encoding='utf-8')
        (dl / 'de_asp.geojson').write_text(gj('DE'), encoding='utf-8')                # a zone not asked for
        ctx = {'data': str(data), 'downloads': lambda: [str(dl)]}
        zones = ['kh', 'iq', 'ie']
        r = BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': zones, 'dry': True}), ctx)
        by = {t['zone']: t for t in r['taken']}
        c.eq(sorted(by), ['ie', 'kh'], 'the zones asked for that have a usable export are taken; iq (a wrong country, unreadable) is not; de was not asked for', what='zones')
        c.eq((by['kh']['files'], by['kh']['from'], by['kh']['converted']), (['kh_asp.geojson', 'kh_rpp.geojson'], ['kh_asp.geojson', 'kh_rpp.json'], ['kh_rpp.json']),
             'kh: the GeoJSON as it is, the JSON converted, both written as <country>_<layer>.geojson', what='kh')
        c.eq(by['ie']['from'], ['ie_asp (1).geojson'], 'a duplicate: only one file taken per country and layer, the latest', what='ie')
        c.eq(sorted((x['name'], x['why']) for x in r['skipped']), [('kh_apt.xml', 'format'), ('kh_hot.xml', 'layer')], 'said, not taken: the XML (openAIP 1.1, another format), the hotspots layer', what='skipped')
        c.eq(sorted((f['zone'], f['name'], f['error']) for f in r['failed']), [('iq', 'iq_asp.json', 'unreadable'), ('iq', 'iq_nav.json', 'wrong-country')], 'refused, with the reason', what='failed')
        c.ok(r['dry'] and not (data / 'sia').exists(), json.dumps(r)[:200], 'dry: nothing written')
        # the plan shows the total, the real run takes the same files and writes them where aero_fetch writes
        shown = r['shown']
        c.eq(sorted(shown['openaip']), ['name', 'size'], 'the plan gives what to send back (zips.openaip): the total of the files it would take', what='shown')
        r2 = BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': zones, 'dry': False, 'zips': shown}), ctx)
        got = sorted(os.listdir(data / 'sia' / 'openaip'))
        c.eq(got, ['ie_asp.geojson', 'kh_asp.geojson', 'kh_rpp.geojson'], 'written under data/sia/openaip/, by their final names only (no « (1) », no path from the file)', what='written')
        conv = json.loads((data / 'sia' / 'openaip' / 'kh_rpp.geojson').read_text(encoding='utf-8'))
        c.eq((conv['type'], len(conv['features']), conv['features'][0]['geometry']['type'], conv['features'][0]['properties']['compulsory'], 'geometry' in conv['features'][0]['properties']),
             ('FeatureCollection', 2, 'Point', True, False), 'the JSON array became a FeatureCollection: the geometry on the Feature, the rest as properties', what='converted')
        c.eq((data / 'sia' / 'openaip' / 'kh_asp.geojson').read_bytes(), gj('KH').encode(), 'a GeoJSON export is written byte for byte', what='as is')
        # the second pass: the same files are said unchanged
        r3 = BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': zones, 'dry': False}), ctx)
        c.eq(sorted(f for t in r3['taken'] for f in t['unchanged']), ['ie_asp.geojson', 'kh_asp.geojson', 'kh_rpp.geojson'], 'a second pass writes nothing: unchanged', what='unchanged')
        # another file arrives between the plan and the take: refused
        (dl / 'kh_nav.geojson').write_text(gj('KH'), encoding='utf-8')
        r4 = BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': zones, 'dry': False, 'zips': shown}), ctx)
        c.eq([(f['source'], f['error']) for f in r4['failed']], [('openaip', 'changed')], 'the plan showed other files: nothing taken, the plan is to be made again', what='changed')
        # nothing in Downloads for a zone: nothing said (openAIP is a fallback), and the other sources are untouched by a pickup
        r5 = BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': ['us'], 'dry': True}), ctx)
        c.eq((r5['skipped'], [m['source'] for m in r5['missing']], [t['source'] for t in r5['taken']]), ([], [], []), 'no openAIP export for the zone: no line, never « missing »', what='nothing')


@case('K107', 'base/pickup takes the latest zip of EACH NATS set (AIP, OBS, UAS), says what it took, what is missing per set and the cycle that results; a set that arrives after is named and taken by the next pass', 'K', static=True,
      rule='SOG-0126 (10 Nov 2026): gb stayed at the 1 Oct cycle because the pickup took ONE zip (the latest of EG_*_DS_*_XML.zip) and said nothing of the missing set; the AIP of 29 Oct, arrived a minute later, was left in Downloads. The pickup now takes the latest zip per set, names the sets missing or waiting, and gives the cycle of the zone that results')
def k107(c):
    RJ, BS, AF, DS = _mods()
    import zipfile

    def put(dl, zip_name, xml_name, when):
        with zipfile.ZipFile(dl / zip_name, 'w') as z:
            z.writestr(xml_name, '<x/>')
        os.utime(dl / zip_name, (when, when))
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = Path(td) / 'Downloads', Path(td) / 'data'
        dl.mkdir()
        data.mkdir()
        ctx = {'data': str(data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 12, 10)}   # le cycle en vigueur du banc : 26 nov.
        run = lambda dry, **kw: BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': ['gb'], 'dry': dry, **kw}), ctx)
        put(dl, 'EG_AIP_DS_20261001_XML.zip', 'EG_AIP_DS_FULL_20261001.xml', 1_700_000_000)
        put(dl, 'EG_UAS_FR_DS_AREA1_FULL_20261029_XML.zip', 'EG_UAS_FR_DS_AREA1_FULL_20261029.xml', 1_700_000_100)
        r = run(True)
        nats = [t for t in r['taken'] if t['source'] == 'nats']
        c.eq([(x['set'], x['cycle']) for x in nats[0]['sets']], [('AIP', '2026-10-01'), ('UAS', None)], 'the plan takes one zip per set that is there, in ONE entry of the source: the AIP (dating the cycle) and the UAS, not only the latest of them', what='plan taken')
        c.eq((len(nats), nats[0]['zip'], nats[0]['cycle']), (1, 'EG_AIP_DS_20261001_XML.zip+EG_UAS_FR_DS_AREA1_FULL_20261029_XML.zip', '2026-10-01'), 'the entry keeps the form the page reads (zip, size): the names put end to end, the sizes added', what='entry')
        c.eq([(m['set'], m['expected'], m['have']) for m in r['missing'] if m['source'] == 'nats'], [('OBS', 'EG_OBS_DS_*_XML.zip', None)], 'the set that is not in Downloads is named: OBS, with the name expected and nothing in place', what='plan missing')
        c.eq((r['zones']['gb']['cycle'], r['zones']['gb']['before']), ('2026-10-01', None), 'the cycle that results is given (the AIP of 1 Oct), and the one in place before (none)', what='cycle plan')
        c.ok(not (data / 'sia').exists(), '', 'dry: nothing written')
        r = run(False)
        c.eq(sorted(os.listdir(data / 'sia' / 'zones' / 'gb')), ['EG_AIP_DS_FULL_20261001.xml', 'EG_UAS_FR_DS_AREA1_FULL_20261029.xml'], 'the two sets taken are written under data/sia/zones/gb/', what='written')
        # the AIP of 29 Oct and the OBS arrive AFTER the pickup: said waiting, then taken by the next pass; the old AIP stays (nothing purged)
        put(dl, 'EG_AIP_DS_20261029_XML.zip', 'EG_AIP_DS_FULL_20261029.xml', 1_700_000_200)
        put(dl, 'EG_OBS_DS_AREA1_FULL_20261029_XML.zip', 'EG_OBS_DS_AREA1_FULL_20261029.xml', 1_700_000_300)
        r = run(True)
        z = r['zones']['gb']
        c.eq((z['before'], z['cycle']), ('2026-10-01', '2026-10-29'), 'the plan says the zone is at 1 Oct and would be at 29 Oct', what='cycle before after')
        c.eq([(s['set'], s['state'], s.get('have'), s.get('cycle')) for s in z['sets']], [('AIP', 'waiting', '2026-10-01', '2026-10-29'), ('OBS', 'waiting', None, None), ('UAS', 'in-place', None, None)],
             'per set: the AIP of 29 Oct is waiting in Downloads (1 Oct in place), the OBS is waiting, the UAS is in place and not newer', what='sets')
        r = run(False)
        c.eq((r['zones']['gb']['cycle'], sorted(os.listdir(data / 'sia' / 'zones' / 'gb'))),
             ('2026-10-29', ['EG_AIP_DS_FULL_20261001.xml', 'EG_AIP_DS_FULL_20261029.xml', 'EG_OBS_DS_AREA1_FULL_20261029.xml', 'EG_UAS_FR_DS_AREA1_FULL_20261029.xml']),
             'the second pass takes them: the zone is at 29 Oct; the old AIP file is kept', what='second pass')
        c.eq(r['missing'], [], 'nothing missing any more', what='none missing')
        # the plan shown is the plan taken: a newer zip of a set that arrives between the two is refused
        put(dl, 'EG_AIP_DS_20261126_XML.zip', 'EG_AIP_DS_FULL_20261126.xml', 1_700_000_400)
        put(dl, 'EG_OBS_DS_AREA1_FULL_20261126_XML.zip', 'EG_OBS_DS_AREA1_FULL_20261126.xml', 1_700_000_410)
        shown = {t['source']: {'name': t['zip'], 'size': t['size']} for t in run(True)['taken']}
        put(dl, 'EG_OBS_DS_AREA1_FULL_20261203_XML.zip', 'EG_OBS_DS_AREA1_FULL_20261203.xml', 1_700_000_500)
        r = run(False, zips=shown)
        c.eq(([(f['source'], f['error']) for f in r['failed']], r['taken']), ([('nats', 'changed')], []), 'a newer zip of the OBS set arrived after the plan: the source is refused (changed), nothing taken, the plan is to be made again', what='changed')
        r = run(False, zips={'nats': {'name': 'x.zip', 'size': 1}})
        c.eq([(f['source'], f['error']) for f in r['failed']], [('nats', 'changed')], 'a zips that is not the plan: refused', what='other')
        r = run(False, zips={})
        c.eq([(f['source'], f['error']) for f in r['failed']], [('nats', 'not-shown')], 'zips given without the source, while sets are waiting: not shown, nothing taken', what='not shown')
    # a cycle published in advance does not pass in front of the cycle in force: it is said (later), not taken, unless nothing else is there
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = Path(td) / 'Downloads', Path(td) / 'data'
        dl.mkdir()
        data.mkdir()
        ctx = {'data': str(data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 11, 9)}   # the cycle in force: 29 Oct
        run = lambda dry: BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': ['gb'], 'dry': dry}), ctx)
        put(dl, 'EG_AIP_DS_20261126_XML.zip', 'EG_AIP_DS_FULL_20261126.xml', 1_700_000_900)
        r = run(True)
        c.eq((r['zones']['gb']['cycle'], [(x['set'], x['state'], x['cycle']) for x in r['zones']['gb']['sets'] if x['state'] != 'missing']), ('2026-11-26', [('AIP', 'waiting', '2026-11-26')]), 'only the AIP of 26 Nov (not in force yet) is there: it is taken, nothing else being available', what='future alone')
        put(dl, 'EG_AIP_DS_20261029_XML.zip', 'EG_AIP_DS_FULL_20261029.xml', 1_700_000_100)   # older file, older cycle, in force
        r = run(True)
        x = next(x for x in r['zones']['gb']['sets'] if x['set'] == 'AIP')
        c.eq((r['zones']['gb']['cycle'], x['cycle'], x['zip'], x.get('later')), ('2026-10-29', '2026-10-29', 'EG_AIP_DS_20261029_XML.zip', '2026-11-26'), 'both there: the cycle in force (29 Oct) is taken, the one published in advance is said (later: 26 Nov), not taken', what='future later')


@case('K109', 'base/status says per zone up-to-date / stale (with the reasons) / never-built / failed, and base/update builds only what the state says, nothing when nothing moved (SOG-0071)', 'K', static=True,
      rule='SOG-0071 / V3 § 10.44 (9-10 Nov 2026): « un télécharger ou construire télécharge ou construit tout » -- the launcher gives the state of each zone in ONE call with the reason (never built; failed; a dated source newer than the build; the inputs changed; an old parser; files missing; the dated source older than the cycle in force; a file waiting in Downloads), and « Mettre à jour » builds only the zones that are not up to date and for which a build changes something, idempotent')
def k109(c):
    RJ, BS, AF, DS = _mods()
    import zipfile
    BA = types.SimpleNamespace(**RJ.REGISTRY[('base', 'build')][0].__globals__)
    ST = types.SimpleNamespace(**RJ.REGISTRY[('base', 'status')][0].__globals__)
    status, check_s = RJ.REGISTRY[('base', 'status')]
    update, check_u = RJ.REGISTRY[('base', 'update')]
    c.eq((check_s({}), check_s({'zones': ['de', 'it']}), check_s({'zones': ['xx']}), check_s({'zones': []}), check_s({'path': 1}), check_u({'zones': ['de']}), check_u({}), check_u({'zones': ['de'], 'fetch': 'x'})),
         ({'personal': []}, {'zones': ['de', 'it'], 'personal': []}, None, None, None, {'zones': ['de'], 'personal': [], 'fetch': True}, None, None), 'the closed arguments: zones (known ids), personal; update needs its zones, fetch is a boolean', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, dl = Path(td) / 'data', Path(td) / 'Downloads'
        data.mkdir()
        dl.mkdir()
        parser = ST.parser_version()

        def built(zone, cycle='2026-10-29', version=None, missing=()):
            d = data / 'sia' / 'base' / zone / cycle
            d.mkdir(parents=True, exist_ok=True)
            (d / 'meta.json').write_text(json.dumps({'schema': 2, 'zone': zone, 'cycle': cycle, 'kind': 'meta', 'parserVersion': version or parser, 'data': {}}), encoding='utf-8')
            for k in BA.KINDS:
                if k != 'meta' and k not in missing:
                    (d / f'{k}.json').write_text('{}', encoding='utf-8')

        def feed(zone, name='x', text='a'):
            (data / 'sia' / 'openaip').mkdir(parents=True, exist_ok=True)
            (data / 'sia' / 'openaip' / f'{zone}_asp.geojson').write_text(text, encoding='utf-8')

        def record(zone, personal=()):
            ST.write_record(data, zone, cycle='2026-10-29', builtAt='2026-10-30T10:00:00Z', parserVersion=parser, personal=list(personal), inputs=ST.signature(ST.inputs_of(str(data), zone, set(personal))))
        for z in ('de', 'dk', 'no', 'nl'):
            feed(z)
            built(z, cycle='2026-10-01')
            record(z)
        feed('se')
        built('dk', cycle='2026-10-01', version=parser - 1)                      # an old parser
        record('dk')
        feed('no', text='changed after the build')                                # the inputs changed
        built('se', cycle='2026-10-01', missing=('airways', 'vrp'))              # two files missing
        record('se')
        ST.mark_failed(str(data), 'nl', 'page-error', '2026-10-31T10:00:00Z', 'AIXM4.5_all_FR_OM_2026-10-01.xml : HTTP 404')   # the last build failed, with the text the page gave
        (data / 'sia' / 'XML_SIA_2026-10-29.xml').write_text('<x/>', encoding='utf-8')                  # fr: the SIA of 29 Oct, built at 1 Oct
        built('fr', cycle='2026-10-01')
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        (data / 'sia' / 'zones' / 'gb' / 'EG_AIP_DS_FULL_20261001.xml').write_text('<x/>', encoding='utf-8')   # gb: NATS of 1 Oct only (read: « personnel »), built at 1 Oct
        built('gb', cycle='2026-10-01')
        ctx = {'data': str(data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 11, 9)}
        run = lambda **a: status(RJ.Job('base', 'status', {}), check_s(a), ctx)
        r = run(zones=['de', 'it', 'dk', 'no', 'se', 'nl', 'fr', 'gb'], personal=['nats'])
        z = r['zones']
        c.eq({k: (v['state'], v['reason']['code'] if v['reason'] else None, v['buildable']) for k, v in z.items()},
             {'de': ('up-to-date', None, False), 'it': ('never-built', 'never-built', True), 'dk': ('stale', 'parser-old', True), 'no': ('stale', 'inputs-changed', True), 'se': ('stale', 'files-missing', True),
              'nl': ('failed', 'failed', True), 'fr': ('stale', 'source-newer', True), 'gb': ('stale', 'source-old', False)},
             'one state per zone: de (not dated: a cycle changing makes it nothing) up to date; it never built; dk old parser; no inputs changed; se files missing; nl failed; fr source newer than the build; gb dated source older than the cycle in force (nothing to build)', what='states')
        c.eq((z['dk']['reason'], z['no']['reason'], z['se']['reason'], z['fr']['reason'], z['gb']['reason'], z['nl']['reason']),
             ({'code': 'parser-old', 'built': parser - 1, 'current': parser}, {'code': 'inputs-changed', 'count': 1, 'names': ['openaip/no_asp.geojson']}, {'code': 'files-missing', 'count': 2},
              {'code': 'source-newer', 'source': 'sia', 'cycle': '2026-10-29', 'built': '2026-10-01'}, {'code': 'source-old', 'source': 'nats', 'cycle': '2026-10-01', 'current': '2026-10-29'}, {'code': 'failed', 'error': 'page-error', 'message': 'AIXM4.5_all_FR_OM_2026-10-01.xml : HTTP 404'}),
             'the reasons are codes with their parameters (the page says them in four languages)', what='reasons')
        c.eq((r['counts'], r['current'], r['parserVersion']), ({'up-to-date': 1, 'never-built': 1, 'stale': 5, 'failed': 1}, '2026-10-29', parser), 'the counts, the cycle in force and the parser version', what='counts')
        # a file waiting in Downloads and not taken: the first reason of gb, not buildable until it is taken
        with zipfile.ZipFile(dl / 'EG_AIP_DS_20261029_XML.zip', 'w') as zf:
            zf.writestr('EG_AIP_DS_FULL_20261029.xml', '<x/>')
        z = run(zones=['gb'], personal=['nats'])['zones']['gb']
        c.eq(([r['code'] for r in z['reasons']], z['reason'], z['buildable'], z['state']), (['pickup-waiting', 'source-old'], {'code': 'pickup-waiting', 'source': 'nats', 'set': 'AIP', 'cycle': '2026-10-29', 'zip': 'EG_AIP_DS_20261029_XML.zip'}, False, 'stale'),
             'gb: « AIP 29 OCT in Downloads, not taken » comes first, and nothing is buildable before it is taken', what='waiting')
        # base/update: builds the zones the state says (buildable), not the others; nothing the second time
        said = []

        def fake_build(job, a, cx):
            for zn in a['zones']:
                built(zn, cycle='2026-10-29')
                record(zn)
                said.append(zn)
            return {'ok': True, 'built': list(a['zones']), 'failed': [], 'cycle': '2026-10-29', 'seconds': 0}
        ctx['build'] = fake_build
        up = lambda **a: update(RJ.Job('base', 'update', {}), check_u(a), ctx)
        res = up(zones=['de', 'it', 'dk', 'no', 'se', 'nl', 'fr', 'gb'], personal=['nats'], fetch=False)
        c.eq((sorted(said), sorted(res['built']), res['upToDate'], res['notBuildable'], [w['zone'] for w in res['waiting']], res['nothing']),
             (['dk', 'fr', 'it', 'nl', 'no', 'se'], ['dk', 'fr', 'it', 'nl', 'no', 'se'], ['de'], ['gb'], ['gb'], False), 'update builds the six zones the state says (never built, failed, source newer, inputs changed, old parser, files missing), not de (up to date) nor gb (waits for a file)', what='update')
        said.clear()
        res = up(zones=['de', 'it', 'dk', 'no', 'se', 'nl', 'fr', 'gb'], personal=['nats'], fetch=False)
        c.eq((said, res['nothing'], sorted(res['upToDate']), res['after']['gb']['state']), ([], True, ['de', 'dk', 'fr', 'it', 'nl', 'no', 'se'], 'stale'), 'the second time nothing is built (idempotent): seven zones up to date, gb still waits for its file', what='idempotent')
        c.eq(sorted(os.listdir(data / 'local' / 'build')), ['de.json', 'dk.json', 'fr.json', 'it.json', 'nl.json', 'no.json', 'se.json'], 'what each build read is kept apart, under data/local/ (never published)', what='records')


@case('K114', 'base/status names two more states (SOG-0143): the index declares a cycle whose files are absent, and a zone built without points or airways (source file missing, or a source that carries none); the build never writes an index that points at an absent file', 'K', static=True,
      rule='SOG-0143 (10 Nov 2026): Spain, Sweden and Denmark are in the countries but the app says no base installed / unknown points (NOSLI, MOKNI, ADVOP): the index declares 2026-10-29 for es, se, dk while the 29 Oct build had no ENAIRE file (es: no points, no airways) and openAIP carries neither points nor airways (se, dk); base/status says it in codes (index-orphan, source-missing, and the notice no-points) and the build checks that every file of the folder is on the disk before it writes the index')
def k114(c):
    RJ, BS, AF, DS = _mods()
    BA = types.SimpleNamespace(**RJ.REGISTRY[('base', 'build')][0].__globals__)
    ST = types.SimpleNamespace(**RJ.REGISTRY[('base', 'status')][0].__globals__)
    status, check_s = RJ.REGISTRY[('base', 'status')]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        data.mkdir()
        parser = ST.parser_version()

        def built(zone, cycle='2026-10-29', empty=True, skip_files=False):
            d = data / 'sia' / 'base' / zone / cycle
            d.mkdir(parents=True, exist_ok=True)
            if skip_files:
                return
            (d / 'meta.json').write_text(json.dumps({'schema': 2, 'zone': zone, 'cycle': cycle, 'kind': 'meta', 'parserVersion': parser, 'data': {}}), encoding='utf-8')
            for k in BA.KINDS:
                if k != 'meta':
                    (d / f'{k}.json').write_text(json.dumps({'schema': 2, 'zone': zone, 'cycle': cycle, 'kind': k, 'data': [] if empty and k in ('points', 'airways') else [{'id': 'X'}]}), encoding='utf-8')

        def index(**zones):
            (data / 'sia' / 'base').mkdir(parents=True, exist_ok=True)
            (data / 'sia' / 'base' / 'index.json').write_text(json.dumps({'schema': 2, 'kind': 'index', 'zones': {z: {'cycle': cy, 'prefixes': [], 'kb': {}, 'cells': {}} for z, cy in zones.items()}}), encoding='utf-8')
        built('es')              # built without the ENAIRE file read: no points, no airways, the zone has a source that carries them
        built('ie')              # the same, and no file of its source (AirNav) on the workstation
        (data / 'sia' / 'aixm5').mkdir(parents=True)
        (data / 'sia' / 'aixm5' / 'LE_Amdt_A_2026_10_AIP_DS_FULL_EnRoute.xml').write_text('<x/>', encoding='utf-8')     # the ENAIRE file IS on the workstation (as on the user's)
        built('no')              # openAIP only: a source that carries neither
        built('dk', skip_files=True)   # the index declares the cycle, the folder is empty
        built('fr', empty=False)
        index(es='2026-10-29', se='2026-10-29', dk='2026-10-29', fr='2026-10-29', ie='2026-10-29')
        ctx = {'data': str(data), 'downloads': lambda: [], 'today': datetime.date(2026, 11, 9)}
        z = status(RJ.Job('base', 'status', {}), check_s({'zones': ['es', 'no', 'dk', 'fr', 'ie']}), ctx)['zones']
        c.eq({k: (v['state'], v['reason']['code'] if v['reason'] else None, v['buildable'], [n['code'] for n in v['notices']]) for k, v in z.items() if k in ('es', 'no', 'dk', 'ie')},
             {'es': ('stale', 'source-unread', False, []), 'no': ('up-to-date', None, False, ['no-points']), 'dk': ('stale', 'index-orphan', True, []), 'ie': ('stale', 'source-missing', False, [])},
             'es: built without points or airways although ENAIRE carries them and its file is there: not read, the « personnel » box does not declare it (not buildable as it is); ie: the file of the source is not on the workstation; se: openAIP carries neither, said as a notice, the zone is not stale for it; dk: the index declares a cycle whose files are absent: rebuild', what='states')
        z2 = status(RJ.Job('base', 'status', {}), check_s({'zones': ['es'], 'personal': ['enaire']}), ctx)['zones']['es']
        c.eq((z2['reason'], z2['buildable']), ({'code': 'source-unbuilt', 'source': 'enaire'}, True), 'with the box declared the file is readable and the zone was built before it: rebuild', what='declared')
        c.eq((z['es']['reason'], z['no']['notices'][0], z['dk']['reason']), ({'code': 'source-unread', 'source': 'enaire', 'why': 'personal'}, {'code': 'no-points', 'source': 'openaip'}, {'code': 'index-orphan', 'cycle': '2026-10-29', 'count': 13}),
             'the codes with their parameters: the source that is missing, the source that carries nothing, the cycle the index declares and the number of files absent', what='params')
        c.eq((z['fr']['state'], z['fr']['notices']), ('up-to-date', []), 'a zone with its points and airways is up to date, no notice', what='fr')
        # the build never writes an index that points at an absent file (counter-test)
        index(fr='2026-10-29')
        before = (data / 'sia' / 'base' / 'index.json').read_text(encoding='utf-8')
        texts = {f'{k}.json': json.dumps({'schema': 2, 'zone': 'nl', 'cycle': '2026-10-29', 'kind': k, 'parserVersion': parser, 'data': []}) for k in BA.KINDS}
        entry = {'cycle': '2026-10-29', 'prefixes': [], 'kb': {}, 'cells': {}}
        g = RJ.REGISTRY[('base', 'build')][0].__globals__
        real = g['write_if_changed']
        g['write_if_changed'] = lambda path, text, parsed=None: False if path.endswith('points.json') else real(path, text, parsed)      # a file lost between the writing and the index
        try:
            try:
                BA.install(str(data), 'nl', '2026-10-29', texts, entry)
                lost = None
            except ValueError as e:
                lost = str(e)
        finally:
            g['write_if_changed'] = real
        c.eq((bool(lost) and 'points.json absent' in lost, (data / 'sia' / 'base' / 'index.json').read_text(encoding='utf-8') == before), (True, True), 'a file of the folder is absent when the index is to be written: the zone is not published, the index is untouched', what='no orphan index')
        paths, written = BA.install(str(data), 'nl', '2026-10-29', texts, entry)
        c.eq(('sia/base/index.json' in paths, json.loads((data / 'sia' / 'base' / 'index.json').read_text(encoding='utf-8'))['zones']['nl']['cycle']), (True, '2026-10-29'), 'a complete folder: the index is written', what='index written')


@case('K116', 'A refused request (400) names its reason in words and codes; a read-only job does not overwrite the last job that wrote (SOG-0144)', 'K', static=True,
      rule='SOG-0144 (10 Nov 2026): « Sélection : 78 zones » and « Le lanceur a refusé la demande (arguments invalides) »: base/build takes 60 zones at most and said nothing of it; every refusal of the jeu base says which rule (too-many-zones with max and count, unknown-zone, bad-source, unknown-field…) in English words with a code and its parameters for the page to translate; and base/status no longer replaces, in tools/.regen_last.json, the last job that wrote (the build whose failure text was lost)')
def k116(c):
    import json
    import os
    import tempfile
    import time
    RJ, BS, AF, DS = _mods()
    jobs = RJ.Jobs(RJ.REGISTRY, {})
    zones = ['fr', 'de', 'es']
    many = (['fr', 'de', 'es', 'it', 'gb', 'ie', 'us', 'ca', 'se', 'no'] * 8)[:78]
    many = sorted({*many}) if False else [f'{a}{b}' for a in 'abcdefghij' for b in 'abcdefgh'][:78]
    got = {k: jobs.start('base', 'build', a) for k, a in {
        'many': {'zones': many}, 'unknown': {'zones': ['fr', 'xx']}, 'twice': {'zones': ['fr', 'fr']}, 'none': {'zones': []}, 'missing': {}, 'text': {'zones': [3]}, 'field': {'zones': zones, 'path': '/'},
        'source': {'zones': zones, 'personal': ['A B']}, 'source2': {'zones': zones, 'personal': ['x' * 50]}}.items()}
    c.eq({k: (v['status'], v.get('reason')) for k, v in got.items()},
         {'many': (400, 'too-many-zones'), 'unknown': (400, 'unknown-zone'), 'twice': (400, 'duplicate-zone'), 'none': (400, 'no-zone'), 'missing': (400, 'zones-missing'), 'text': (400, 'bad-zone'), 'field': (400, 'unknown-field'), 'source': (400, 'bad-source'), 'source2': (400, 'bad-source')},
         'each refusal of base/build gives its reason as a code', what='codes')
    c.eq((got['many']['max'], got['many']['count'], got['many']['message'], got['unknown']['zone'], got['unknown']['message'], got['source']['source'], got['source']['message'], got['field']['message']),
         (60, 78, '60 zones at most per request, 78 given', 'xx', 'unknown zone: xx', 'A B', 'source not admitted: A B', 'unknown field: path'),
         'and in words, with its parameters: 60 zones at most per request, 78 given; unknown zone: xx; source not admitted: A B; unknown field: path', what='words')
    ok = jobs.start('base', 'status', {'zones': ['fr'], 'personal': ['nats']})
    c.eq(ok.get('ok'), True, 'a valid request still starts', what='valid')
    for _ in range(100):
        if jobs.cur.data['state'] != 'running':
            break
        time.sleep(0.1)
    other = {v: RJ.Jobs(RJ.REGISTRY, {}).start('base', v, a) for v, a in (('update', {'zones': ['fr'], 'fetch': 'x'}), ('status', {'zones': 'fr'}), ('fetch', {'zones': ['fr'], 'personal': ['nope']}), ('purge', {'zones': ['fr'], 'what': ['all']}), ('pickup', {'zones': ['fr'], 'dry': 1}))}
    c.eq({k: v.get('reason') for k, v in other.items()}, {'update': 'bad-field', 'status': 'zones-missing', 'fetch': 'bad-source', 'purge': 'bad-field', 'pickup': 'bad-field'}, 'the other verbs of the set say theirs: fetch not a boolean, zones not a list, a source of the catalogue that does not exist, what not sources or caches, dry not a boolean', what='other verbs')
    c.eq(jobs.start('nope', 'nope', {}).get('message'), 'unknown operation nope/nope', 'an unknown operation keeps its own message', what='unknown op')
    # the last job that wrote is kept next to a read-only one
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        store = os.path.join(td, '.regen_last.json')
        reg = {('t', 'build'): (lambda job, a, ctx: {'ok': False, 'reason': 'failed', 'message': 'HTTP 404'}, lambda a: {}), ('base', 'status'): (lambda job, a, ctx: {'ok': True}, lambda a: {})}
        j = RJ.Jobs(reg, {}, min_gap={}, store=store)
        for key in (('t', 'build'), ('base', 'status')):
            j.start(*key, {})
            for _ in range(100):
                if j.cur.data['state'] != 'running':
                    break
                time.sleep(0.05)
            time.sleep(0.1)
        saved = json.load(open(store, encoding='utf-8'))
        c.eq((saved['job']['verb'], saved['work']['verb'], saved['work']['result']['message']), ('status', 'build', 'HTTP 404'), 'tools/.regen_last.json: `job` is the last job (the status), `work` the last job that wrote (the build, with its result): a status no longer erases the text of a failure', what='work kept')
        again = RJ.Jobs(reg, {}, min_gap={}, store=store)
        c.eq((again.work or {}).get('verb'), 'build', 'and it is read back at the next start of the launcher', what='work reloaded')


@case('K119', 'base/pickup says what is already in place and what is there but not read (SOG-0150): « Rien à prendre » no longer hides three NATS sets that the « personnel » box does not declare', 'K', static=True,
      rule='SOG-0150 (10 Nov 2026): « Mettre à jour » worked for every zone but gb; the pickup of gb answered only the openAIP lines (« gb_apt.xml n\'est pas lu ») although the three NATS zips were in Downloads: they were already in place, so `taken` was empty and nothing said that they were there and that NATS, a personal-use source, was not read because the box does not declare it; the pickup now says inPlace and, when the page gives the box (personal), unread; declared, nothing is unread')
def k119(c):
    RJ, BS, AF, DS = _mods()
    import zipfile

    def put(dl, zip_name, xml_name):
        with zipfile.ZipFile(dl / zip_name, 'w') as z:
            z.writestr(xml_name, '<x/>')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = Path(td) / 'Downloads', Path(td) / 'data'
        dl.mkdir()
        data.mkdir()
        put(dl, 'EG_AIP_DS_20261029_XML.zip', 'EG_AIP_DS_FULL_20261029.xml')
        put(dl, 'EG_OBS_DS_AREA1_FULL_20261029_XML.zip', 'EG_OBS_DS_AREA1_FULL_20261029.xml')
        put(dl, 'EG_UAS_FR_DS_AREA1_FULL_20261029_XML.zip', 'EG_UAS_FR_DS_AREA1_FULL_20261029.xml')
        (dl / 'gb_apt.xml').write_text('<OPENAIP DATAFORMAT="1.1"/>', encoding='utf-8')
        ctx = {'data': str(data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 11, 9)}
        run = lambda dry, **kw: BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': ['gb'], 'dry': dry, **kw}), ctx)
        c.eq((BS.check_pickup({'zones': ['gb'], 'personal': ['nats']}), BS.check_pickup({'zones': ['gb'], 'personal': 'nats'}), BS.check_pickup({'zones': ['gb'], 'personal': ['N A']})),
             ({'zones': ['gb'], 'dry': True, 'personal': ['nats']}, None, None), 'the pickup takes the « personnel » box as `personal` (a list of source identifiers), nothing else new', what='check')
        r = run(False)
        c.eq((len(r['taken']), 'unread' in r, [s['name'] for s in r['skipped']]), (1, False, ['gb_apt.xml']), 'the first pass takes the three NATS sets; without the box given, nothing is said unread (the page did not say what it declares)', what='first')
        r = run(True, personal=[])
        c.eq((r['taken'], r['inPlace'], r['unread'], [s['name'] for s in r['skipped']]),
             ([], [{'zone': 'gb', 'source': 'nats', 'sets': ['AIP', 'OBS', 'UAS']}], [{'zone': 'gb', 'source': 'nats', 'why': 'personal', 'cycle': '2026-10-29', 'sets': ['AIP', 'OBS', 'UAS']}], ['gb_apt.xml']),
             'the next pass has nothing to take, but says the three sets are IN PLACE and, the box not declaring NATS, that they are there and NOT READ (the same as for ENAIRE: source-unread), next to the openAIP line', what='unread')
        r = run(True, personal=['nats'])
        c.eq((r['taken'], len(r['inPlace']), 'unread' in r), ([], 1, False), 'the box declares NATS: in place, nothing unread: the next build reads them', what='declared')
        r = run(True)
        c.eq((len(r['inPlace']), 'unread' in r), (1, False), 'without `personal` the pickup says what is in place and does not guess what the box declares', what='unknown box')
        ST = types.SimpleNamespace(**RJ.REGISTRY[('base', 'status')][0].__globals__)
        status, check_s = RJ.REGISTRY[('base', 'status')]
        (data / 'sia' / 'base' / 'gb' / '2026-10-29').mkdir(parents=True)
        for k in types.SimpleNamespace(**RJ.REGISTRY[('base', 'build')][0].__globals__).KINDS:
            (data / 'sia' / 'base' / 'gb' / '2026-10-29' / f'{k}.json').write_text(json.dumps({'data': [] if k in ('points', 'airways') else [{'id': 'x'}]}), encoding='utf-8')
        (data / 'sia' / 'base' / 'gb' / '2026-10-29' / 'meta.json').write_text(json.dumps({'parserVersion': ST.parser_version(), 'data': {}}), encoding='utf-8')
        z = status(RJ.Job('base', 'status', {}), check_s({'zones': ['gb'], 'personal': []}), ctx)['zones']['gb']
        z2 = status(RJ.Job('base', 'status', {}), check_s({'zones': ['gb'], 'personal': ['nats']}), ctx)['zones']['gb']
        c.eq((z['reason'], z['buildable'], z2['reason'], z2['buildable']), ({'code': 'source-unread', 'source': 'nats', 'why': 'personal'}, False, {'code': 'source-unbuilt', 'source': 'nats'}, True),
             'and the line of gb says it: built without points or airways, the NATS files are there but the box does not declare them (source-unread); declared, they are read by the next build (source-unbuilt)', what='status')


# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K70', 'Ireland (AirNav eAIP): the current issue read from the AIM page, ENR 4.4 points and ENR 3.3 routes read from invented pages in the real markup, written by the launcher under its AIRAC date', 'K', static=True,
      rule='Lot C2 (5 Nov 2026): the zone ie gets its points and airways from the official eAIP (HTML tables, DMS coordinates); the address of the issue is read from the page and checked; the file carries the issue date (its cycle); no licence found: personal-licence source; fixtures are INVENTED in the real markup (the code repository is public, frame/aerodb/test/fixtures/SOURCES.md)')
def k70(c):
    RJ, BS, AF, DS = _mods()
    import airnav_eaip as A
    import aero_cycles as C
    fx = ROOT / 'frame' / 'aerodb' / 'test' / 'fixtures' / 'airnav'
    aim, p44, p33 = [(fx / n).read_text(encoding='utf-8') for n in ('aim-extract.html', 'EI-ENR-4.4-extract.html', 'EI-ENR-3.3-Z999.html')]
    # 1. the address of the issue is read on the page and checked
    c.eq(A.current_issue(aim), ('https://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/index.html', '2026-10-29'), 'the current issue: its address and its date (« 29 OCT 2026 ») after « Currently Effective Issue »', what='issue')
    bad = lambda href, label='eAIP (Electronic AIP) Ireland 29 OCT 2026': A.current_issue(f'<b>Currently Effective Issue:</b><ul><li><a href="{href}">{label}</a></li></ul>')
    c.eq([bad('http://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/index.html'), bad('https://evil.example/AIRAC/2026-10-29-AIRAC/html/index.html'), bad('https://www.airnav.ie/../x/html/index.html'),
          bad('https://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/index.html?x=1'), bad('https://www.airnav.ie/a/b/c/html/index.html'), bad('https://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/index.html', 'no date here'),
          bad('https://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/index.html', 'eAIP Ireland 31 FEB 2026'), A.current_issue('<p>nothing</p>')], [None] * 8,
         'refused: http, another host, a « .. », a query, a path off the pattern, a label without a date, an impossible date, no section', what='refusals')
    c.eq((A.page_url('https://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/index.html', 'EI-ENR-4.4-en-IE.html'), A.out_name('2026-10-29')),
         ('https://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/eAIP/EI-ENR-4.4-en-IE.html', 'airnav_ie_enr_20261029.geojson'), 'the page address is built from the issue address, the file name carries the date', what='names')
    # 2. coordinates, points, route
    c.eq([A.dms('511020N'), A.dms('0083040W'), A.dms('512345.6N'), A.dms('0071530.2W'), A.dms('1230000N'), A.dms('5260N'), A.dms('0900000N'), A.dms('x')], [51.172222, -8.511111, 51.396, -7.258389, None, None, None, None],
         'DMS: DDMMSS[.s] N/S, DDDMMSS[.s] E/W; a degree out of range or a wrong length is none', what='dms')
    pts = A.parse_enr44(p44)
    c.eq([(p['id'], p['lat'], p['lon']) for p in pts], [('TSTAA', 51.172222, -8.511111), ('TSTAB', 51.333472, -9.000069)], 'ENR 4.4: the two points, names and positions', what='enr44')
    segs = A.parse_enr33(p33)
    c.eq(segs, [{'route': 'Z999', 'a': {'id': 'TSD', 'lat': 51.396, 'lon': -7.258389}, 'b': {'id': 'TSTAC', 'lat': 52.5, 'lon': -7.0}, 'lower': 7500, 'upper': 24500, 'nm': 33.0, 'trk': 18}],
         'ENR 3.3: the route Z999, one segment between its two points (a navaid is named by the code in brackets), FL075 to FL 245 in feet, distance and track', what='enr33')
    c.eq([A.level_ft(x) for x in ('FL245', 'FL 245', '3000 ft', 'GND', 'UNL', '', 'x')], [24500, 24500, 3000, 0, float('inf'), None, None], 'levels', what='levels')
    g, n, m = A.convert(p44, p33, '2026-10-29')
    c.eq((n, m, g['issue'], [f['properties']['sog'] for f in g['features']]), (2, 1, '2026-10-29', ['point', 'point', 'airway']), 'the GeoJSON: two points and one airway, the edition named', what='geojson')
    json.dumps(g, allow_nan=False)  # no infinity or NaN in the file: an unlimited level is written « UNL »
    for page, what in (('<p>nothing</p>', 'ENR 4.4'),):
        try:
            A.convert(page, p33, '2026-10-29')
            got = 'read'
        except ValueError as e:
            got = str(e)
        c.ok('ENR 4.4' in got, got, 'a page that gives no point is refused, said (a layout changed), never an empty file')
    # 3. the launcher: the page AIM, the two pages, the file written under its date, the previous edition removed, the same edition not read again
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        folder = data / 'sia' / 'zones' / 'ie'
        folder.mkdir(parents=True)
        (folder / 'airnav_ie_enr_20260903.geojson').write_text('{}', encoding='utf-8')
        (folder / 'airnav_notes.txt').write_text('keep', encoding='utf-8')
        net = _Net(AF, {'aeronautical-information-management': aim.encode(), 'EI-ENR-4.4-en-IE.html': p44.encode(), 'EI-ENR-3.3-en-IE.html': p33.encode()})
        with net:
            out, err = AF.airnav(str(data))
        c.eq((err, [(f['name'], f['features'], f['edition'], f['unchanged']) for f in out]), ([], [('airnav_ie_enr_20261029.geojson', 3, '2026-10-29', False)]), 'written: three features, the edition', what='airnav')
        c.eq(sorted(os.listdir(folder)), ['airnav_ie_enr_20261029.geojson', 'airnav_notes.txt'], 'the previous edition is removed, another file kept', what='folder')
        c.ok(all(u.startswith('https://www.airnav.ie/') for u, _ in net.calls), str(net.calls), 'only airnav.ie is asked')
        with _Net(AF, {'aeronautical-information-management': aim.encode()}) as net2:
            out2, err2 = AF.airnav(str(data))
        c.eq((err2, [f['unchanged'] for f in out2], len(net2.calls)), ([], [True], 1), 'the same edition again: unchanged, only the AIM page is read', what='unchanged')
        with _Net(AF, {'aeronautical-information-management': ('http', 503)}) as net3:
            out3, err3 = AF.airnav(str(data / 'x'))
        c.eq((out3, [BS.classify(e)['error'] for e in err3]), ([], ['http']), 'a 503 on the AIM page: a failure, said as http', what='503')
    # 4. the cycle and the source table
    c.eq((C.cycled('zones/ie/airnav_ie_enr_20261029.geojson'), C.cycled('zones/ie/airnav_ie_enr_20261028.geojson'), C.cycled('zones/ie/other_20261029.geojson'), C.CYCLED['airnav']),
         (('airnav', '2026-10-29'), ('airnav', '2026-10-01'), None, 'ie'), 'the date of the file is the cycle of the zone ie (28 Oct belongs to cycle 2610)', what='cycle')
    c.eq(BS.file_source('zones/ie/airnav_ie_enr_20261029.geojson'), {'zone': 'ie', 'source': 'airnav'}, 'the file belongs to the source airnav of the zone ie', what='file_source')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td)
        ctx = _ctx(DS, data)
        net = _Net(AF, {'aeronautical-information-management': aim.encode(), 'EI-ENR-4.4-en-IE.html': p44.encode(), 'EI-ENR-3.3-en-IE.html': p33.encode(), 'ie_': ('http', 404)})
        with net:
            view, res = _run(RJ, BS, 'fetch', {'zones': ['ie'], 'personal': []}, ctx)
        c.eq(view['zones']['ie']['sources']['airnav'], {'state': 'skipped', 'error': 'personal'}, 'no licence found: the source is personal, not fetched without the owner\'s declaration', what='personal')
        with net:
            view, res = _run(RJ, BS, 'fetch', {'zones': ['ie'], 'personal': ['airnav']}, ctx)
        c.eq((view['zones']['ie']['sources']['airnav']['state'], res['sources']['airnav']), ('downloaded', {'cycle': '2026-10-29', 'current': C.airac_start(), 'stale': '2026-10-29' < C.airac_start()}),
             'declared: downloaded, and the cycle the workstation holds for airnav is the edition\'s', what='declared')


@case('K71', 'Ireland: the build reads the points and the airways of the eAIP file (sog: point, sog: airway) like those of the other sources', 'K', tags=('aerodb',), phone=False,
      rule='Lot C2: AeroSources.geojson reads the GeoJSON of tools/airnav_eaip.py into aero.points and aero.airways, in the shapes of the AIXM and X-Plane readers')
def k71(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.wait_for_function('!!window.AeroSources', timeout=30000)
    got = c.js("""() => {
      const f = (props, geometry) => ({ type: 'Feature', properties: props, geometry });
      const fc = { type: 'FeatureCollection', features: [
        f({ sog: 'point', id: 'TSTAA', remarks: 'x' }, { type: 'Point', coordinates: [-8.511111, 51.172222] }),
        f({ sog: 'point' }, { type: 'Point', coordinates: [-8, 51] }),
        f({ sog: 'airway', route: 'Z999', a: 'TSD', b: 'TSTAC', lower: 7500, upper: 24500, nm: 33.0, trk: 18 }, { type: 'LineString', coordinates: [[-7.258389, 51.396], [-7.0, 52.5]] }),
        f({ sog: 'airway', route: 'Z998', a: 'A', b: 'B', lower: 'UNL', upper: null }, { type: 'LineString', coordinates: [[-7, 51], [-7, 52]] }),
        f({ sog: 'airway', route: 'Z997', a: 'A', b: 'B' }, { type: 'LineString', coordinates: [[-7, 51]] })
      ] };
      const r = AeroSources.geojson(fc, 'airnav_ie_enr_20261029.geojson');
      return { points: r.aero.points, airways: r.aero.airways, airspaces: r.airspaces.length };
    }""")
    c.eq(got['points'], [{'id': 'TSTAA', 'type': 'ICAO', 'lat': 51.172222, 'lon': -8.511111}], 'a point: id, type ICAO, lat, lon; one without an id is not read', what='points')
    c.eq([(w['route'], w['a'], w['b'], w['lower'], w['upper'], w['nm']) for w in got['airways']],
         [('Z999', {'id': 'TSD', 'lat': 51.396, 'lon': -7.258389}, {'id': 'TSTAC', 'lat': 52.5, 'lon': -7.0}, 7500, 24500, 33.0), ('Z998', {'id': 'A', 'lat': 51, 'lon': -7}, {'id': 'B', 'lat': 52, 'lon': -7}, float('inf'), None, 60.0)],
         'an airway: its two ends with their positions, limits in feet (UNL is infinity, absent is none), the distance given or computed; a one-position line is not read', what='airways')
    c.eq(got['airspaces'], 0, 'no airspace from these features', what='airspaces')


# ---------------------------------------------------------------------------------------------------------------------------------------------
@case('K73', 'Raw SIA sources: read from data/local/sources/sia/<cycle>/ with a fall-back on the root of data/sia/, moved by base/move-sources with a manifest and an undo, never purged', 'K', static=True,
      rule='DATA_MAP § 4 and § 6.2, lot C2 (5 Nov 2026): the raw SIA XML leave the root of data/sia/ (the mix of the previous cycle\'s sources and the current base is what « toujours périmé » was); the build reads the new place then the old; the move copies, checks (size and SHA-256), then removes the old one except a tracked file; a manifest old → new undoes it; nothing is purged, nothing overwritten')
def k73(c):
    import importlib
    RJ, BS, AF, DS = _mods()
    B = importlib.import_module('regen.base')
    C = importlib.import_module('aero_cycles')
    # 1. the build reads the old place first (data/sia/: the page reads it without the route of the job), then the new; a name at both places is read at data/sia/ (SOG-0144)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        sia, new = data / 'sia', data / 'local' / 'sources' / 'sia'
        (new / '2026-10-29').mkdir(parents=True)
        (new / '2026-10-01').mkdir(parents=True)
        sia.mkdir(parents=True)
        (sia / 'XML_SIA_2026-10-01.xml').write_text('legacy-1001', encoding='utf-8')            # only at the old place
        (sia / 'AIXM4.5_all_FR_OM_2026-10-29.xml').write_text('legacy-1029', encoding='utf-8')  # at both: this one wins (SOG-0144)
        (new / '2026-10-29' / 'AIXM4.5_all_FR_OM_2026-10-29.xml').write_text('new-1029', encoding='utf-8')
        (new / '2026-10-29' / 'XML_SIA_2026-10-29.xml').write_text('new-xml-1029', encoding='utf-8')
        (new / '2026-10-01' / 'sia-airspaces-2026-10-01.xml').write_text('new-air', encoding='utf-8')
        (new / '2026-10-29' / 'notes.txt').write_text('x', encoding='utf-8')                   # not a raw SIA name
        (new / 'not-a-date').mkdir()
        (new / 'not-a-date' / 'XML_SIA_2026-10-01.xml').write_text('x', encoding='utf-8')       # a folder that is not a cycle date
        inputs = B.list_inputs(str(data))
        read = lambda rel: Path(inputs[rel]).read_text(encoding='utf-8')
        c.eq({k: read(k) for k in sorted(inputs)}, {'AIXM4.5_all_FR_OM_2026-10-29.xml': 'legacy-1029', 'XML_SIA_2026-10-01.xml': 'legacy-1001', 'XML_SIA_2026-10-29.xml': 'new-xml-1029', 'sia-airspaces-2026-10-01.xml': 'new-air'},
             'data/sia/ is read first, the new place for what is not there; a name at both: data/sia/ (the copy the page reads without the route of the job); a non-SIA name and a folder that is not a cycle date: not read', what='precedence')
        legacy, moved = B.split_inputs(str(data), inputs)
        c.eq((legacy, [(m['source'], m['cycle'], m['name']) for m in moved]), (['AIXM4.5_all_FR_OM_2026-10-29.xml', 'XML_SIA_2026-10-01.xml'], [('sia', '2026-10-29', 'XML_SIA_2026-10-29.xml'),
                                                                                  ('sia', '2026-10-01', 'sia-airspaces-2026-10-01.xml')]),
             'what the page is offered: the entries of data/sia/ apart, and { source, cycle, name } for the new place (it reads /data/local/sources/sia/<cycle>/<name>)', what='split')
        c.eq(B.cycle_of(inputs), '2026-10-29', 'the cycle of the build is the newest date of the SIA names, wherever the files are', what='cycle')
        c.eq(C.report(BS.sia_rels(str(data)), root=str(sia))['sia']['cycle'], '2026-10-29', 'the cycle the workstation holds for the SIA counts the new place', what='held cycle')
    # 2. base/move-sources: plan, move, the same again, a tracked file, a conflict, a manifest, the undo
    for bad in (None, 'x', {'dry': 'no'}, {'undo': 1}, {'path': 'C:/x'}, {'dry': True, 'what': 'all'}):
        c.ok(BS.check_move(bad) is None, repr(bad), f'check_move refuses {bad!r}')
    c.eq((BS.check_move({}), BS.check_move({'dry': False, 'undo': True})), ({'dry': True, 'undo': False}, {'dry': False, 'undo': True}), 'dry by default, no undo by default', what='args')
    c.ok(('base', 'move-sources') in RJ.REGISTRY or ('base', 'move-sources') in BS.VERBS, 'verbs', 'the verb is registered with the base set')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td, {'sia/XML_SIA_2026-10-01.xml': 'tracked-old'})
        ctx = _ctx(DS, data)
        sia = data / 'sia'
        for n, t in (('XML_SIA_2026-10-29.xml', 'xml-1029'), ('AIXM4.5_all_FR_OM_2026-10-29.xml', 'aixm-1029'), ('mora.csv', 'm'), ('Lisez_moi.txt', 'r')):
            (sia / n).write_text(t, encoding='utf-8')
        run = lambda **a: BS.move_sources(RJ.Job('base', 'move-sources', {}), BS.check_move(a), ctx)
        r = run()
        c.eq((r['dry'], sorted(m['name'] for m in r['moved']), r['ok']), (True, ['AIXM4.5_all_FR_OM_2026-10-29.xml', 'XML_SIA_2026-10-01.xml', 'XML_SIA_2026-10-29.xml'], True),
             'the plan: the three raw SIA files of the root, not mora.csv nor the readme', what='plan')
        c.ok(not (data / 'local').exists() and (sia / 'XML_SIA_2026-10-29.xml').is_file(), str(os.listdir(data)), 'dry: nothing written, nothing moved')
        r = run(dry=False)
        new = data / 'local' / 'sources' / 'sia'
        c.eq((sorted(str(p.relative_to(new)).replace('\\', '/') for p in new.rglob('*') if p.is_file()), r['ok']),
             (['2026-10-01/XML_SIA_2026-10-01.xml', '2026-10-29/AIXM4.5_all_FR_OM_2026-10-29.xml', '2026-10-29/XML_SIA_2026-10-29.xml', '_manifest.json'], True),
             'copied under their cycle (the date of the file), with the manifest', what='moved')
        c.eq((sorted(os.listdir(sia)), r['kept']), (['Lisez_moi.txt', 'XML_SIA_2026-10-01.xml', 'mora.csv'], [{'name': 'XML_SIA_2026-10-01.xml', 'why': 'tracked'}]),
             'the old copies are removed, except the one git tracks (kept, said): removing it would delete it for every workstation', what='old copies')
        c.eq((new / '2026-10-29' / 'XML_SIA_2026-10-29.xml').read_text(), 'xml-1029', 'the content is the file\'s, checked by its SHA-256', what='content')
        man = json.loads((new / '_manifest.json').read_text(encoding='utf-8'))
        c.eq(sorted((m['from'], m['to']) for m in man['moves'])[0], ('sia/AIXM4.5_all_FR_OM_2026-10-29.xml', 'local/sources/sia/2026-10-29/AIXM4.5_all_FR_OM_2026-10-29.xml'), 'the manifest says old → new', what='manifest')
        c.ok(all(len(m['sha256']) == 64 and m['size'] > 0 for m in man['moves']), str(man)[:200], 'with the size and the SHA-256 of each')
        r = run(dry=False)
        c.eq((r['moved'], sorted(r['already']), r['ok']), ([], ['XML_SIA_2026-10-01.xml'], True), 'the same again: nothing to move (the tracked one is at both places, identical)', what='again')
        # a different file at the new place: neither is touched
        (sia / 'XML_SIA_2026-11-26.xml').write_text('old-1126', encoding='utf-8')
        (new / '2026-11-26').mkdir()
        (new / '2026-11-26' / 'XML_SIA_2026-11-26.xml').write_text('other', encoding='utf-8')
        r = run(dry=False)
        c.eq((r['conflicts'], r['moved'], (sia / 'XML_SIA_2026-11-26.xml').read_text(), (new / '2026-11-26' / 'XML_SIA_2026-11-26.xml').read_text()), ([{'name': 'XML_SIA_2026-11-26.xml', 'why': 'different'}], [], 'old-1126', 'other'),
             'a different file of the same name at the new place: a conflict, said, neither touched, never overwritten', what='conflict')
        # the undo reads the manifest backwards, never over a file that came back
        (sia / 'XML_SIA_2026-10-29.xml').write_text('came back by hand', encoding='utf-8')
        r = run(undo=True)
        c.eq(sorted((x['name'], x['why']) for x in r['conflicts']), [('XML_SIA_2026-10-01.xml', 'present'), ('XML_SIA_2026-10-29.xml', 'present')],
             'undo, plan: the return path of two files is taken (one came back by hand, the tracked one never left): said', what='undo plan')
        r = run(undo=True, dry=False)
        c.eq((sorted(m['name'] for m in r['moved']), (sia / 'XML_SIA_2026-10-29.xml').read_text(), (sia / 'AIXM4.5_all_FR_OM_2026-10-29.xml').read_text()),
             (['AIXM4.5_all_FR_OM_2026-10-29.xml'], 'came back by hand', 'aixm-1029'), 'undo: the free path gets its file back, verified; a file that came back by hand is never overwritten', what='undo')
        left = json.loads((new / '_manifest.json').read_text(encoding='utf-8'))['moves']
        c.eq([os.path.basename(m['to']) for m in left], ['XML_SIA_2026-10-01.xml', 'XML_SIA_2026-10-29.xml'], 'the manifest keeps what could not be undone', what='manifest left')
    # 3. « Purger » of France reaches the new place; nothing else under local/sources
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td)
        ctx = _ctx(DS, data)
        for rel in ('local/sources/sia/2026-10-29/XML_SIA_2026-10-29.xml', 'local/sources/nats/2026-10-29/EG_x.xml', 'local/eaip/2026-10-29/a.pdf'):
            (data / rel).parent.mkdir(parents=True, exist_ok=True)
            (data / rel).write_text('x', encoding='utf-8')
        view, res = _run(RJ, BS, 'purge', {'zones': ['fr'], 'dry': True}, ctx)
        c.eq(res['removed']['fr']['files'], 2, 'purge of fr (dry): the raw SIA file of the new place and the eAIP cache; the other sources are not France\'s', what='purge')


@case('K90', 'base/move-sources under the synchronisation of data/ (SOG-0030): refused while the launcher\'s synchronisation lock is held, the plan still answers, the lock is taken for the move and given back', 'K', static=True,
      rule='SOG-0030 (last item): a real move writes in data/ while a synchronisation (git) may be rewriting it; the job takes the launcher\'s synchronisation lock without waiting, refuses with « syncing » when it is held, and holds it during the move so that no synchronisation starts in the middle')
def k90(c):
    import threading
    RJ, BS, AF, DS = _mods()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td, {})
        sia = data / 'sia'
        sia.mkdir()
        (sia / 'XML_SIA_2026-10-29.xml').write_text('xml-1029', encoding='utf-8')
        lock = threading.Lock()
        ctx = {**_ctx(DS, data), 'sync_lock': lock}
        run = lambda **a: BS.move_sources(RJ.Job('base', 'move-sources', {}), BS.check_move(a), ctx)
        new = data / 'local' / 'sources' / 'sia' / '2026-10-29' / 'XML_SIA_2026-10-29.xml'
        with lock:                                                      # a synchronisation is running
            held, plan = run(dry=False), run()
            undo = run(dry=False, undo=True)
        c.eq((held['ok'], held['reason'], held['moved'], new.exists(), (sia / 'XML_SIA_2026-10-29.xml').is_file()), (False, 'syncing', [], False, True), 'a real move under the synchronisation: refused, nothing moved', what='refused')
        c.eq((undo['ok'], undo['reason']), (False, 'syncing'), 'the undo too', what='undo')
        c.eq((plan['ok'], plan['dry'], [m['name'] for m in plan['moved']]), (True, True, ['XML_SIA_2026-10-29.xml']), 'the plan (dry) still answers: it writes nothing', what='plan')
        seen = []
        glob = BS.move_sources.__globals__                              # the module the launcher loaded (BS may be a copy of its names)
        orig = glob['_move_sources']

        def spy(job, args, cx):
            seen.append(lock.locked())                                  # the lock is held while the move runs
            return orig(job, args, cx)
        glob['_move_sources'] = spy
        try:
            r = run(dry=False)
        finally:
            glob['_move_sources'] = orig
        c.eq((r['ok'], new.read_text(encoding='utf-8'), seen, lock.locked()), (True, 'xml-1029', [True], False), 'the lock is free: the file moves, the lock was held during the move and is given back', what='moved')
        c.eq(BS.move_sources(RJ.Job('base', 'move-sources', {}), BS.check_move({'dry': False}), {k: v for k, v in ctx.items() if k != 'sync_lock'})['ok'], True, 'a launcher without the lock in its context (a test, an older one) moves as before', what='no lock')


@case('K95', 'airline/migrate: today\'s single airline copied into data/airline/<code>/ (the plan first, an empty fleet said, the index, nothing deleted or overwritten, hostile arguments refused)', 'K',
      static=True, rule='V3_SPECIFICATION 10.38 step 1 (SOG-0039): a one-shot migration in the launcher, dry by default, data/airline/settings.json kept as a copy, a code ^[a-z0-9]{2,8}$ proposed from the name and confirmed, every file of data/airline/ untrusted (10.36)')
def k95(c):
    import json
    RJ, BS, AF, DS = _mods()
    fn, check = RJ.REGISTRY[('airline', 'migrate')]
    for bad in (None, 'x', {'dry': 'no'}, {'code': '../x'}, {'code': 'A'}, {'code': 'ABC'}, {'code': 'abcdefghi'}, {'code': 5}, {'dry': True, 'path': 'C:/x'}):
        c.ok(check(bad) is None, repr(bad), f'airline/migrate refuses {bad!r}')
    c.eq((check({}), check({'dry': False, 'code': 'dfa'})), ({'dry': True, 'code': None}, {'dry': False, 'code': 'dfa'}), 'dry by default, no code by default', what='args')
    mod = types.SimpleNamespace(**fn.__globals__)
    c.eq([mod.propose(x) for x in ('DEFA Virtual', 'Air Inter VA', 'Éole-Air', '!!', '', 'A', 'Supercalifragilistic Air')], ['defa', 'air', 'eole', '', '', '', 'supercal'],
         'the proposed code: the first word, without accents, lower case, letters and digits, two to eight characters', what='propose')
    settings = {'name': 'DEFA Virtual', 'site': 'https://flotte.defa-virtual.fr', 'schema': 1, 'updated_at': '2026-11-01T12:15:54.619Z', 'by': 'ALF'}
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'airline').mkdir(parents=True)
        ctx = {'data': str(data)}
        run = lambda **a: fn(RJ.Job('airline', 'migrate', {}), check(a), ctx)
        r = run()
        c.eq((r['ok'], r['reason'] if 'reason' in r else None), (False, 'no-source'), 'no settings.json: nothing to migrate, said', what='no source')
        (data / 'airline' / 'settings.json').write_text(json.dumps(settings), encoding='utf-8')
        (data / 'airline' / 'map_profiles.json').write_text('{"schema": 1, "profiles": []}', encoding='utf-8')
        # the plan: names and sizes, nothing written
        r = run()
        c.eq((r['ok'], r['dry'], r['proposed'], r['code'], r['name'], sorted(f['name'] for f in r['files']), r['fleet'], r['index']),
             (True, True, 'defa', 'defa', 'DEFA Virtual', ['fleet.json', 'map_profiles.json', 'settings.json'], 'empty', 'created'), 'the plan: code proposed from the name, three files, the fleet empty (said), an index to create', what='plan')
        c.ok(not (data / 'airline' / 'defa').exists() and not (data / 'airline' / 'index.json').exists() and all(set(f) == {'name', 'bytes'} for f in r['files']), str(os.listdir(data / 'airline')),
             'dry: nothing written; the plan gives names and sizes, no path')
        # the run with the code the user confirmed
        r = run(dry=False, code='dfa')
        folder = data / 'airline' / 'dfa'
        c.eq((r['ok'], r['code'], sorted(os.listdir(folder)), json.loads((folder / 'fleet.json').read_text(encoding='utf-8')), json.loads((folder / 'settings.json').read_text(encoding='utf-8')) == settings),
             (True, 'dfa', ['fleet.json', 'map_profiles.json', 'settings.json'], {'schema': 1, 'aircraft': []}, True), 'the run: the settings and the map profiles copied, an empty fleet', what='run')
        c.eq(json.loads((data / 'airline' / 'index.json').read_text(encoding='utf-8')), {'schema': 1, 'airlines': [{'code': 'dfa', 'name': 'DEFA Virtual'}]}, 'the index lists the airline', what='index')
        c.eq(json.loads((data / 'airline' / 'settings.json').read_text(encoding='utf-8')), settings, 'nothing deleted: the old settings.json stays as a copy', what='old copy')
        c.ok(not list(folder.glob('*.tmp')), str(os.listdir(folder)), 'no temporary file left')
        # again: refused, nothing changed (never overwritten)
        before = {p.name: p.read_bytes() for p in folder.iterdir()}
        r = run(dry=False, code='dfa')
        c.eq((r['ok'], r.get('reason'), r['conflicts'], {p.name: p.read_bytes() for p in folder.iterdir()} == before), (False, 'exists', [{'name': 'settings.json', 'why': 'exists'}], True),
             'a second run: refused (the folder has its settings), nothing overwritten', what='again')
        # a second airline: the index grows; an existing fleet.json of the destination is kept and said
        (data / 'airline' / 'aiv').mkdir()
        (data / 'airline' / 'aiv' / 'fleet.json').write_text('{"schema": 1, "aircraft": [{"registration": "F-ABCD", "sheet": "A320"}]}', encoding='utf-8')
        (data / 'airline' / 'settings.json').write_text(json.dumps({'name': 'Air Inter VA'}), encoding='utf-8')
        r = run(dry=False, code='aiv')
        c.eq((r['conflicts'], json.loads((data / 'airline' / 'aiv' / 'fleet.json').read_text(encoding='utf-8'))['aircraft'][0]['registration'], [a['code'] for a in json.loads((data / 'airline' / 'index.json').read_text(encoding='utf-8'))['airlines']]),
             ([{'name': 'fleet.json', 'why': 'exists'}], 'F-ABCD', ['dfa', 'aiv']), 'an existing fleet is kept and said; the index lists both', what='kept fleet')
        # hostile: a name that is no code proposes nothing; the code is always checked
        (data / 'airline' / 'settings.json').write_text(json.dumps({'name': '../../x <img src=x>'}), encoding='utf-8')
        r = run()
        c.eq((r['ok'], r.get('reason'), r['code']), (False, 'bad-code', ''), 'a name with no usable word: no code proposed, said', what='bad name')
        (data / 'airline' / 'settings.json').write_text('{not json', encoding='utf-8')
        c.eq(run().get('reason'), 'no-source', 'an unreadable settings.json is « no source », never half read', what='unreadable')


@case('K96', 'roadmap/priorities: organisation/PRIORITES.json read and replaced by the launcher (no organisation folder said, bad entries refused in a block, a hostile file filtered, atomic write)', 'K',
      static=True, rule='SOG-0066: the user priorities are written by the launcher, 500 entries at most, ids SOG-nnnn, milestones of frame/help/roadmap.json, integer ranks; a file read is untrusted (10.36)')
def k96(c):
    RJ, BS, AF, DS = _mods()
    fn, check = RJ.REGISTRY[('roadmap', 'priorities')]
    mod = types.SimpleNamespace(**fn.__globals__)
    ok_set = {'action': 'set', 'items': {'SOG-0001': {'rank': 1}}}
    for bad in (None, 'x', {}, {'action': 'x'}, {'action': 'get', 'items': {}}, {'action': 'set'}, {'action': 'set', 'items': []}, {'action': 'set', 'items': {'SOG-0001': 5}},
                {'action': 'set', 'items': {'x' * 30: {'rank': 1}}}, {'action': 'set', 'items': {f'SOG-{n:04d}': {'rank': 1} for n in range(501)}}, {'action': 'get', 'path': 'C:/x'}):
        c.ok(check(bad) is None, repr(bad)[:60], f'roadmap/priorities refuses {repr(bad)[:50]}')
    c.eq((check({'action': 'get'}), check(ok_set)), ({'action': 'get'}, ok_set), 'the two good shapes pass', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        (root / 'frame' / 'help').mkdir(parents=True)
        (root / 'frame' / 'help' / 'roadmap.json').write_text(json.dumps({'milestones': [{'id': 'alpha.5'}, {'id': 'beta.1'}]}), encoding='utf-8')
        ctx = {'root': str(root), 'data': str(root / 'data')}
        run = lambda **a: fn(RJ.Job('roadmap', 'priorities', {}), check(a), ctx)
        c.eq((run(action='get').get('reason'), run(action='set', items={}).get('reason'), (root / 'organisation').exists()), ('no-organisation', 'no-organisation', False),
             'no organisation folder: said, nothing created', what='no organisation')
        org = root / 'organisation'
        org.mkdir()
        f = org / 'PRIORITES.json'
        r = run(action='get')
        c.eq((r['ok'], r['items'], r['exists']), (True, {}, False), 'no file yet: nothing, said', what='absent')
        good = {'SOG-0002': {'milestone': 'beta.1', 'rank': 2}, 'SOG-0001': {'milestone': 'alpha.5', 'rank': 1}, 'SOG-0003': {'rank': 3}}
        r = run(action='set', items=good)
        doc = json.loads(f.read_text(encoding='utf-8'))
        c.eq((r['ok'], r['count'], doc['schema'], list(doc['items']), doc['items']['SOG-0001'], bool(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', doc['updated'])), list(org.glob('*.tmp'))),
             (True, 3, 'sog-priorities/1', ['SOG-0001', 'SOG-0002', 'SOG-0003'], {'milestone': 'alpha.5', 'rank': 1}, True, []), 'a set writes the file: the schema, the date, the entries by rank, no temporary file', what='set')
        r = run(action='get')
        c.eq((r['items'], r['dropped'], r['exists'], r['updated'] == doc['updated']), (good, 0, True, True), 'a get gives back what was set', what='get')
        # « no milestone » (the Backlog column of the roadmap, SOG-0256): an empty milestone is a milestone-less entry, written and read back as such
        nomile = {**good, 'SOG-0001': {'milestone': '', 'rank': 1}}
        r = run(action='set', items=nomile)
        c.eq((r['ok'], run(action='get')['items']['SOG-0001']), (True, {'milestone': '', 'rank': 1}), 'an empty milestone means « no milestone »: accepted, kept', what='no milestone')
        run(action='set', items=good)
        before = f.read_bytes()
        for bad in ({'SOG-12': {'rank': 1}}, {'SOG-0001': {'milestone': 'nope'}}, {'SOG-0001': {'rank': 0}}, {'SOG-0001': {'rank': True}}, {'SOG-0001': {'rank': 1.5}}, {'SOG-0001': {}},
                    {'SOG-0001': {'rank': 100000}}, {'SOG-0001': {'rank': 1, 'x': 1}}, {'SOG-0001': {'milestone': 3}}):
            r = run(action='set', items={**good, **bad})
            c.ok(r.get('reason') == 'bad-items' and f.read_bytes() == before, (r.get('reason'), r.get('bad')), f'a bad entry {repr(bad)[:50]} refuses the whole set, nothing written')
        # a hostile file: wrong schema, junk, unknown milestone, too many entries
        f.write_text('{not json', encoding='utf-8')
        c.eq((run(action='get')['items'], run(action='get')['exists']), ({}, True), 'an unreadable file reads as nothing', what='unreadable')
        f.write_text(json.dumps({'schema': 'other/1', 'items': good}), encoding='utf-8')
        c.eq(run(action='get')['items'], {}, 'a file of another schema reads as nothing', what='foreign')
        hostile = {'schema': 'sog-priorities/1', 'updated': 'x' * 100, 'items': {'SOG-0001': {'rank': 1}, 'SOG-0002': {'milestone': 'nope', 'rank': 2}, 'SOG-0003': {'milestone': 'nope'}, '../x': {'rank': 1},
                   'SOG-0004': 'a', 'SOG-0005': {'rank': -1}, 'SOG-0006': {'rank': 3, 'extra': '<img>'}, '__proto__': {'rank': 1}}}
        f.write_text(json.dumps(hostile), encoding='utf-8')
        r = run(action='get')
        c.eq((r['items'], r['dropped'], r['updated']), ({'SOG-0001': {'rank': 1}, 'SOG-0002': {'rank': 2}, 'SOG-0006': {'rank': 3}}, 5, ''),
             'a hostile file is filtered: bad ids, ranks and shapes dropped, an unknown milestone removed (the rank stays), extra keys ignored, a long date ignored', what='hostile')
        f.write_text(json.dumps({'schema': 'sog-priorities/1', 'items': {f'SOG-{n:04d}': {'rank': n + 1} for n in range(900)}}), encoding='utf-8')
        c.eq(len(run(action='get')['items']), 500, 'at most 500 entries are read', what='cap')


@case('K123', 'recette/verdict: organisation/RECETTE.json read and replaced by the launcher (no organisation folder said, bad entries refused in a block, a refusal needs a comment, a hostile file filtered, atomic write)', 'K',
      static=True, rule='SOG-0167: the user\u2019s verdicts on the functional tests are written by the launcher: 1000 entries at most, ids SOG-nnnn, ok or ko, a comment of 600 signs (required for a refusal), an ISO UTC date; a file read is untrusted')
def k123(c):
    RJ, BS, AF, DS = _mods()
    fn, check = RJ.REGISTRY[('recette', 'verdict')]
    ok_set = {'action': 'set', 'items': {'SOG-0001': {'verdict': 'ok'}}}
    for bad in (None, 'x', {}, {'action': 'x'}, {'action': 'get', 'items': {}}, {'action': 'set'}, {'action': 'set', 'items': []}, {'action': 'set', 'items': {'SOG-0001': 5}},
                {'action': 'set', 'items': {'x' * 30: {'verdict': 'ok'}}}, {'action': 'set', 'items': {f'SOG-{n:04d}': {'verdict': 'ok'} for n in range(1001)}}, {'action': 'get', 'path': 'C:/x'}):
        c.ok(check(bad) is None, repr(bad)[:60], f'recette/verdict refuses {repr(bad)[:50]}')
    c.eq((check({'action': 'get'}), check(ok_set)), ({'action': 'get'}, ok_set), 'the two good shapes pass', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        ctx = {'root': str(root)}
        run = lambda **a: fn(RJ.Job('recette', 'verdict', {}), check(a), ctx)
        c.eq((run(action='get').get('reason'), run(action='set', items={}).get('reason'), (root / 'organisation').exists()), ('no-organisation', 'no-organisation', False),
             'no organisation folder: said, nothing created', what='no organisation')
        org = root / 'organisation'
        org.mkdir()
        f = org / 'RECETTE.json'
        r = run(action='set', items={'SOG-٠٠٠١': {'verdict': 'ok'}})   # Arabic-indic digits are digits for \d, not for an identifier (SOG-0241 audit)
        c.eq((r['ok'], r.get('reason'), f.exists()), (False, 'bad-items', False), 'an identifier with non-ASCII digits is refused in a block, nothing written', what='non-ASCII digits')
        r = run(action='get')
        c.eq((r['ok'], r['items'], r['exists']), (True, {}, False), 'no file yet: nothing, said', what='absent')
        good = {'SOG-0002': {'verdict': 'ko', 'comment': 'le bouton reste gris', 'at': '2026-11-10T09:30:00Z'}, 'SOG-0001': {'verdict': 'ok', 'at': '2026-11-10T09:31:00Z'}}
        r = run(action='set', items=good)
        doc = json.loads(f.read_text(encoding='utf-8'))
        c.eq((r['ok'], r['count'], doc['schema'], list(doc['items']), doc['items']['SOG-0002'], bool(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', doc['updated'])), list(org.glob('*.tmp'))),
             (True, 2, 'sog-recette/1', ['SOG-0001', 'SOG-0002'], good['SOG-0002'], True, []), 'a set writes the file: the schema, the date, the entries by identifier, no temporary file', what='set')
        r = run(action='get')
        c.eq((r['items'], r['dropped'], r['exists'], r['updated'] == doc['updated']), (good, 0, True, True), 'a get gives back what was set', what='get')
        # a set MERGES by identifier (11 Nov: 14 answers lost when the screen, which had not read them, sent only its own): what the file holds stays, only `drop` takes an entry out
        r = run(action='set', items={'SOG-0003': {'verdict': 'ok'}})
        c.eq((r['ok'], r['count'], sorted(run(action='get')['items'])), (True, 3, sorted([*good, 'SOG-0003'])), 'a set of ONE entry keeps the others already written', what='merge')
        r = run(action='set', items={}, drop=['SOG-0003', 'SOG-0009'])
        c.eq((r['ok'], r['count'], sorted(run(action='get')['items'])), (True, 2, sorted(good)), 'drop takes entries out (one the file does not hold changes nothing), nothing else', what='drop')
        c.eq(check({'action': 'set', 'items': {}, 'drop': 'SOG-0001'}), None, 'drop must be a list', what='drop shape')
        r = run(action='set', items={'SOG-0003': {'verdict': 'ok'}})
        c.eq(r['ok'], True, 'the file is complete again for what follows', what='refill')
        run(action='set', items={}, drop=['SOG-0003'])
        before = f.read_bytes()
        for bad in ({'SOG-12': {'verdict': 'ok'}}, {'SOG-0003': {'verdict': 'maybe'}}, {'SOG-0003': {}}, {'SOG-0003': {'verdict': 'ko'}}, {'SOG-0003': {'verdict': 'ko', 'comment': '   '}},
                    {'SOG-0003': {'verdict': 'ok', 'comment': 'x' * 601}}, {'SOG-0003': {'verdict': 'ok', 'comment': 'a\x00b'}}, {'SOG-0003': {'verdict': 'ok', 'at': 'yesterday'}},
                    {'SOG-0003': {'verdict': 'ok', 'extra': 1}}, {'SOG-0003': {'verdict': 'ok', 'comment': 3}}):
            r = run(action='set', items={**good, **bad})
            c.ok(r.get('reason') == 'bad-items' and f.read_bytes() == before, (r.get('reason'), r.get('bad')), f'a bad entry {repr(bad)[:50]} refuses the whole set, nothing written (a refusal needs its comment)')
        # a hostile file: wrong schema, junk, a refusal without comment, too many entries
        f.write_text('{not json', encoding='utf-8')
        c.eq((run(action='get')['items'], run(action='get')['exists']), ({}, True), 'an unreadable file reads as nothing', what='unreadable')
        f.write_text(json.dumps({'schema': 'other/1', 'items': good}), encoding='utf-8')
        c.eq(run(action='get')['items'], {}, 'a file of another schema reads as nothing', what='foreign')
        hostile = {'schema': 'sog-recette/1', 'updated': 'x' * 100, 'items': {'SOG-0001': {'verdict': 'ok'}, 'SOG-0002': {'verdict': 'ko'}, '../x': {'verdict': 'ok'}, 'SOG-0004': 'a',
                   'SOG-0005': {'verdict': 'ok', 'comment': '<img src=x onerror=1>', 'at': '2026-11-10T09:30:00Z'}, '__proto__': {'verdict': 'ok'}}}
        f.write_text(json.dumps(hostile), encoding='utf-8')
        r = run(action='get')
        c.eq((list(r['items']), r['dropped'], r['updated']), (['SOG-0001', 'SOG-0005'], 4, ''), 'a hostile file is filtered: bad ids and shapes, a refusal without comment dropped, a long date ignored', what='hostile')
        f.write_text(json.dumps({'schema': 'sog-recette/1', 'items': {f'SOG-{n:04d}': {'verdict': 'ok'} for n in range(1500)}}), encoding='utf-8')
        c.eq(len(run(action='get')['items']), 1000, 'at most 1000 entries are read', what='cap')


@case('K171', 'recette/decision: organisation/DECISIONS_REPONSES.json read and replaced by the launcher (no organisation folder said, bad entries refused in a block, a hostile file filtered, atomic write) (SOG-0241)', 'K',
      static=True, rule='SOG-0241: the user’s answers to the points to decide (the « À trancher » tab of the recette) are written by the launcher: 1000 entries at most, ids Q-nnnn, a choice 0 to 9 or none, a free text of 600 signs, one of the two at least, nothing else written; same guards as recette/verdict')
def k171(c):
    RJ, BS, AF, DS = _mods()
    fn, check = RJ.REGISTRY[('recette', 'decision')]
    good_set = {'action': 'set', 'items': {'Q-0001': {'choice': 0}}}
    for bad in (None, 'x', {}, {'action': 'x'}, {'action': 'get', 'items': {}}, {'action': 'set'}, {'action': 'set', 'items': []}, {'action': 'set', 'items': {'Q-0001': 5}},
                {'action': 'set', 'items': {'x' * 30: {'choice': 1}}}, {'action': 'set', 'items': {f'Q-{n:04d}': {'choice': 0} for n in range(1001)}}, {'action': 'get', 'path': 'C:/x'}):
        c.ok(check(bad) is None, repr(bad)[:60], f'recette/decision refuses {repr(bad)[:50]}')
    c.eq((check({'action': 'get'}), check(good_set)), ({'action': 'get'}, good_set), 'the two good shapes pass', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        ctx = {'root': str(root)}
        run = lambda **a: fn(RJ.Job('recette', 'decision', {}), check(a), ctx)
        c.eq((run(action='get').get('reason'), run(action='set', items={}).get('reason'), (root / 'organisation').exists()), ('no-organisation', 'no-organisation', False),
             'no organisation folder: said, nothing created', what='no organisation')
        org = root / 'organisation'
        org.mkdir()
        f = org / 'DECISIONS_REPONSES.json'
        r = run(action='set', items={'Q-٠٠٠١': {'choice': 0}})   # Arabic-indic digits are digits for \d, not for an identifier (SOG-0241 audit)
        c.eq((r['ok'], r.get('reason'), f.exists()), (False, 'bad-items', False), 'an identifier with non-ASCII digits is refused in a block, nothing written', what='non-ASCII digits')
        r = run(action='get')
        c.eq((r['ok'], r['items'], r['exists']), (True, {}, False), 'no file yet: nothing, said', what='absent')
        good = {'Q-0002': {'choice': None, 'text': 'plutôt la deuxième, mais sans le bouton', 'at': '2026-11-11T09:30:00Z'}, 'Q-0001': {'choice': 1, 'text': '', 'at': '2026-11-11T09:31:00Z'}}
        r = run(action='set', items=good)
        doc = json.loads(f.read_text(encoding='utf-8'))
        c.eq((r['ok'], r['count'], doc['schema'], list(doc['items']), doc['items']['Q-0002'], bool(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', doc['updated'])), list(org.glob('*.tmp'))),
             (True, 2, 'sog-decisions/1', ['Q-0001', 'Q-0002'], good['Q-0002'], True, []), 'a set writes the file: the schema, the date, the entries by identifier, no temporary file', what='set')
        r = run(action='get')
        c.eq((r['items'], r['dropped'], r['exists'], r['updated'] == doc['updated']), (good, 0, True, True), 'a get gives back what was set', what='get')
        # a set MERGES by identifier (11 Nov: 14 answers lost when the screen, which had not read them, sent only its own): what the file holds stays, only `drop` takes an entry out
        r = run(action='set', items={'Q-0003': {'choice': 0}})
        c.eq((r['ok'], r['count'], sorted(run(action='get')['items'])), (True, 3, sorted([*good, 'Q-0003'])), 'a set of ONE entry keeps the others already written', what='merge')
        r = run(action='set', items={}, drop=['Q-0003', 'Q-0009'])
        c.eq((r['ok'], r['count'], sorted(run(action='get')['items'])), (True, 2, sorted(good)), 'drop takes entries out (one the file does not hold changes nothing), nothing else', what='drop')
        c.eq(check({'action': 'set', 'items': {}, 'drop': 'SOG-0001'}), None, 'drop must be a list', what='drop shape')
        r = run(action='set', items={'Q-0003': {'choice': 0}})
        c.eq(r['ok'], True, 'the file is complete again for what follows', what='refill')
        run(action='set', items={}, drop=['Q-0003'])
        before = f.read_bytes()
        for bad in ({'Q-12': {'choice': 0}}, {'SOG-0003': {'choice': 0}}, {'Q-0003': {}}, {'Q-0003': {'choice': None}}, {'Q-0003': {'choice': None, 'text': '   '}}, {'Q-0003': {'choice': 10}},
                    {'Q-0003': {'choice': -1}}, {'Q-0003': {'choice': True}}, {'Q-0003': {'choice': '1'}}, {'Q-0003': {'choice': 0, 'text': 'x' * 601}}, {'Q-0003': {'choice': 0, 'text': 'a\x00b'}},
                    {'Q-0003': {'choice': 0, 'at': 'yesterday'}}, {'Q-0003': {'choice': 0, 'extra': 1}}, {'Q-0003': {'choice': 0, 'text': 3}}):
            r = run(action='set', items={**good, **bad})
            c.ok(r.get('reason') == 'bad-items' and f.read_bytes() == before, (r.get('reason'), r.get('bad')), f'a bad entry {repr(bad)[:50]} refuses the whole set, nothing written')
        # a hostile file: wrong schema, junk, bad ids and shapes, too many entries
        f.write_text('{not json', encoding='utf-8')
        c.eq((run(action='get')['items'], run(action='get')['exists']), ({}, True), 'an unreadable file reads as nothing', what='unreadable')
        f.write_text(json.dumps({'schema': 'other/1', 'items': good}), encoding='utf-8')
        c.eq(run(action='get')['items'], {}, 'a file of another schema reads as nothing', what='foreign')
        hostile = {'schema': 'sog-decisions/1', 'updated': 'x' * 100, 'items': {'Q-0001': {'choice': 0}, 'Q-0002': {'choice': None, 'text': ''}, '../x': {'choice': 0}, 'Q-0004': 'a',
                   'Q-0005': {'choice': None, 'text': '<img src=x onerror=1>', 'at': '2026-11-11T09:30:00Z'}, '__proto__': {'choice': 0}}}
        f.write_text(json.dumps(hostile), encoding='utf-8')
        r = run(action='get')
        c.eq((list(r['items']), r['dropped'], r['updated']), (['Q-0001', 'Q-0005'], 4, ''), 'a hostile file is filtered: bad ids and shapes, an empty answer dropped, a long date ignored', what='hostile')
        f.write_text(json.dumps({'schema': 'sog-decisions/1', 'items': {f'Q-{n:04d}': {'choice': 0} for n in range(1500)}}), encoding='utf-8')
        c.eq(len(run(action='get')['items']), 1000, 'at most 1000 entries are read', what='cap')


@case('K127', 'LFV (Sweden) wired as a source (SOG-0153 b): the pickup converts AIP_OFFLINE.zip of Downloads without unpacking it (plan first, then the file written, a foreign archive refused), the cycle comes from the edition date, the file belongs to zone se and source lfv, the catalogue and the mirror know it with its licence line', 'K', static=True,
      rule='SOG-0153 (b) (10 Nov 2026): the user left AIP_OFFLINE.zip (988 MB) in Downloads; « Mettre à jour » takes it by conversion (tools/lfv_eaip.py) — the archive is opened for its pages ENR 4.4 and ENR 3.2 only and sia/zones/se/lfv_se_enr_<date>.geojson (160 KB) is the only thing written; LFV is a personal-use source (no reuse condition in the archive), declared by the single box of Données (modules/data: PERSONAL lfv); the file is zone se, source lfv, cycle of its edition; K52 and L1 compare the mirrors')
def k127(c):
    import importlib
    import json
    import zipfile
    RJ, BS, AF, DS = _mods()
    AC = importlib.import_module('aero_cycles')
    cell = lambda t: f'<td rowspan="1" colspan="1"><span>{t}</span></td>'
    row = lambda rid, *cells: f'<tr id="{rid}">' + ''.join(cell(x) for x in cells) + '</tr>'
    cover = '<html><body><h1>SWEDEN</h1><p>Effective date : 29 OCT 2026</p></body></html>'
    enr44 = '<table>' + row('NOSLIENR44', 'NOSLI', '590422N 0171529E', 'N850, T31') + row('MOKNIENR44', 'MOKNI', '573847N 0150405E', 'N850') + '</table>'
    n850 = '<table>' + row('723', 'N850 (RNAV)') + ''.join(row(i, '∆', f'{i} {pos}') + row(i + 'row8', 'FL 660') + row(i + 'row9', 'FL 095') for i, pos in (('NOSLI', '590422N 0171529E'), ('MOKNI', '573847N 0150405E'))) + '</table>'
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = Path(td) / 'Downloads', Path(td) / 'data'
        dl.mkdir()
        data.mkdir()
        with zipfile.ZipFile(dl / 'AIP_OFFLINE (1).zip', 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('ES-Cover Page-en-GB.html', cover)
            z.writestr('eAIP/ES-ENR 4.4-en-GB.html', enr44)
            z.writestr('eAIP/ES-ENR 3.2 N850-en-GB.html', n850)
            z.writestr('documents/PDF/ES-ENR 6.1.pdf', b'%PDF' + b'0' * 5000)
        ctx = {'data': str(data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 11, 10)}
        run = lambda dry: BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': ['se'], 'dry': dry}), ctx)
        r = run(True)
        t = r['taken']
        c.eq((len(t), t[0]['source'], t[0]['zone'], t[0]['files'], t[0]['points'], t[0]['segments'], t[0]['cycle'], t[0]['zip']), (1, 'lfv', 'se', ['lfv_se_enr_20261029.geojson'], 2, 1, '2026-10-29', 'AIP_OFFLINE (1).zip'),
             'the plan converts the archive of Downloads (« (1) » of a second download included) and says what it would write: the file, its points and segments, its cycle', what='plan')
        c.ok(not (data / 'sia' / 'zones' / 'se').exists(), 'nothing written by the plan', 'the plan writes nothing')
        r = run(False)
        out = data / 'sia' / 'zones' / 'se' / 'lfv_se_enr_20261029.geojson'
        g = json.loads(out.read_text(encoding='utf-8'))
        c.eq((out.is_file(), sorted(p.name for p in out.parent.iterdir()), len(g['features']), g['issue']), (True, ['lfv_se_enr_20261029.geojson'], 3, '2026-10-29'), 'the run writes the GeoJSON of the edition and nothing else (the archive is not unpacked, no .tmp left)', what='written')
        c.eq((AC.cycled('zones/se/lfv_se_enr_20261029.geojson'), BS.file_source('zones/se/lfv_se_enr_20261029.geojson'), AC.ZONE_SOURCE.get('se'), 'lfv' in AC.PERSONAL_CYCLED),
             (('lfv', '2026-10-29'), {'zone': 'se', 'source': 'lfv'}, 'lfv', True), 'the cycle is the edition’s, the file is zone se and source lfv, a personal-use source read only when the box declares it', what='mirror')
        c.eq((BS.sources_of('se')[0], BS.SOURCES['lfv']['kind'], BS.SOURCES['lfv']['personal'], BS.PICKUP['lfv']['zip']), ('lfv', 'manual', 'licence', 'AIP_OFFLINE*.zip'), 'zone se lists LFV first; the source is manual, personal-use, expected as AIP_OFFLINE*.zip', what='catalog')
        # a foreign archive: refused, said, nothing written
        (dl / 'AIP_OFFLINE (1).zip').unlink()
        with zipfile.ZipFile(dl / 'AIP_OFFLINE.zip', 'w') as z:
            z.writestr('index.html', '<html/>')
        out.unlink()
        r = run(False)
        c.eq((r['taken'], [f['error'][:19] for f in r['failed']], out.exists()), ([], ['ce n’est pas l’eAIP'], False), 'an archive that is not the LFV eAIP: said (« ce n’est pas l’eAIP hors ligne de LFV »), nothing taken, nothing written', what='foreign')
        (dl / 'AIP_OFFLINE.zip').unlink()
        r = run(True)
        c.eq((r['taken'], r['missing']), ([], [{'zone': 'se', 'source': 'lfv', 'expected': 'AIP_OFFLINE*.zip'}]), 'no archive in Downloads: the name expected is said', what='missing')
    cat = (ROOT / 'frame' / 'aerodb' / 'catalogue.js').read_text(encoding='utf-8')
    zj = (ROOT / 'shared' / 'aero_zones.js').read_text(encoding='utf-8')
    c.ok("id: 'lfv'" in cat and "zones: ['se']" in cat and 'ES-GEN 0.1' in cat and "se: ['lfv']" in zj and "personal: 'licence'" in zj[zj.index('lfv: {'):zj.index('lfv: {') + 3500], 'catalogue.js / aero_zones.js',
         'the catalogue entry (with the licence line in four languages) and the JS mirror exist, personal-use')


@case('K131', 'FAA NASR as a source of points and airways for the zone us (SOG-0153 d): the three CSV sets (FIX, AWY, NAV) of the cycle in force are read and written as the GeoJSON the build reads, the addresses computed, the gaps and unknown points dropped, the limits filled by family', 'K', static=True,
      rule='SOG-0153 (d) (10 Nov 2026, the user: « FAA : free of use and redistribute »): the zone us had no point and no airway; the NASR (public domain) gives 10 936 points and 17 624 segments for the cycle of 29 Oct (read on the real files: 0.4 s, 4.9 MB of GeoJSON): V (8 575), T, J, Q, colour airways; the route engine refuses a segment with no limits, so the missing ones are filled by the airway’s family (V, T: 0 to 17 999 ft, J, Q: 18 000 to 60 000 ft)')
def k131(c):
    import importlib
    import sys
    sys.path.insert(0, str(c.root / 'tools'))
    N = importlib.import_module('faa_nasr')
    RJ, BS, AF, DS = _mods()
    fix, awy, nav = _nasr_zips()
    g, n_pts, n_seg = N.convert(fix, awy, nav, '2026-10-29')
    props = [f['properties'] for f in g['features']]
    pts = {p['id']: f['geometry']['coordinates'] for p, f in zip(props, g['features']) if p['sog'] == 'point'}
    aw = [p for p in props if p['sog'] == 'airway']
    c.eq((n_pts, n_seg, sorted(pts)), (4, 2, ['ILC', 'MONPI', 'OAL', 'OATSS']), 'the points that an airway names plus the navaids (4), the two good segments: the gap segment and the one with an unknown point are dropped', what='counts')
    c.eq(pts['MONPI'], [-70.5, 40.5], 'positions in GeoJSON order (lon, lat), from FIX_BASE; a VOR from NAV_BASE', what='position')
    c.eq([(a['route'], a['a'], a['b'], a['lower'], a['upper']) for a in aw], [('V12', 'MONPI', 'OATSS', 4000, 17999), ('J80', 'OAL', 'ILC', 18000, 45000)],
         'the minimum en-route altitude is the lower limit, the maximum authorised altitude the upper; a Victor airway with none stops at 17 999 ft', what='limits')
    c.eq(('dir' in aw[0], g['name'], g['issue']), (False, 'faa_nasr', '2026-10-29'), 'no direction invented; the shape of the Irish and Swedish files', what='shape')
    c.eq((N.url('FIX', '2026-10-29'), N.url('AWY', '2026-11-26'), N.current_cycle('<p>Current Subscription effective  <b>October 29, 2026</b></p>'), N.current_cycle('<p>nothing</p>')),
         ('https://nfdc.faa.gov/webContent/28DaySub/extra/29_Oct_2026_FIX_CSV.zip', 'https://nfdc.faa.gov/webContent/28DaySub/extra/26_Nov_2026_AWY_CSV.zip', '2026-10-29', None),
         'the addresses are computed (host, path and date fixed), the cycle in force is read from the subscription page', what='urls')
    bad = []
    for kind, iso in (('FIX; rm', '2026-10-29'), ('FIX', '10/29/2026'), ('../x', '2026-10-29')):
        try:
            N.url(kind, iso)
            bad.append((kind, iso))
        except ValueError:
            pass
    c.eq(bad, [], 'a bad kind or date is refused', what='refused')
    try:
        N.convert(awy, awy, nav, '2026-10-29')
        got = 'accepted'
    except ValueError as e:
        got = 'FIX_BASE' in str(e)
    c.eq(got, True, 'a zip that is not the one expected: said (FIX_BASE.csv absent), nothing written', what='wrong zip')
    c.eq((BS.file_source('geojson/faa_nasr.geojson'), 'nasr' in BS.SOURCES['faa']['args']), ({'zone': 'us', 'source': 'faa'}, True), 'the file is of zone us, source faa; the source asks for the nasr layer', what='mirror')


@case('K139', 'base/pickup with `build: true` chains the build of the zones whose file it took (SOG-0180: « prendre le fichier lance de lui-même la construction de cette zone »): one gesture, the result carries what was built, a failure of the build is said, a dry run builds nothing', 'K', static=True,
      rule='SOG-0180 (10 Nov 2026, acceptance of SOG-0162: « si on clique sur « mettre à jour », puis « prendre le fichier téléchargé », il se passe quoi ? l’information dit « cliquez sur recalculer ». le bouton n’existe plus »): the verbs side: base/pickup takes `build: true` (with the same `personal` as the box): after the files are taken, base/update (no download) builds those zones only; its answer is `update` in the result (built, failed, excluded, after); a dry run (the plan) never builds')
def k139(c):
    import zipfile
    RJ, BS, AF, DS = _mods()
    built = []

    def put(dl, zip_name, xml_name):
        with zipfile.ZipFile(dl / zip_name, 'w') as z:
            z.writestr(xml_name, '<x/>')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = Path(td) / 'Downloads', Path(td) / 'data'
        dl.mkdir()
        data.mkdir()
        put(dl, 'EG_AIP_DS_20261029_XML.zip', 'EG_AIP_DS_FULL_20261029.xml')
        put(dl, 'EG_OBS_DS_AREA1_FULL_20261029_XML.zip', 'EG_OBS_DS_AREA1_FULL_20261029.xml')
        put(dl, 'EG_UAS_FR_DS_AREA1_FULL_20261029_XML.zip', 'EG_UAS_FR_DS_AREA1_FULL_20261029.xml')

        def fake_build(job, a, cx):
            built.append((a['zones'], a['personal']))
            return {'ok': True, 'built': list(a['zones']), 'failed': [], 'cycle': '2026-10-29', 'cycles': {}, 'folders': {}, 'commits': [], 'seconds': 0, 'excluded': [{'source': 'xplane', 'why': 'local-only', 'message': 'xplane : lu sur ce poste seulement'}]}
        ctx = {'data': str(data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 11, 9), 'build': fake_build}
        run = lambda **kw: BS.pickup(RJ.Job('base', 'pickup', {}), BS.check_pickup({'zones': ['gb'], **kw}), ctx)
        c.eq((BS.check_pickup({'zones': ['gb'], 'build': True}), BS.check_pickup({'zones': ['gb'], 'build': 'yes'})), ({'zones': ['gb'], 'dry': True, 'build': True}, None), 'the argument `build` is a boolean, nothing else new', what='check')
        r = run(dry=True, build=True, personal=['nats'])
        c.eq((built, 'update' in r), ([], False), 'a dry run (the plan) builds nothing', what='dry')
        r = run(dry=False, build=True, personal=['nats', 'xplane'])
        c.eq((built, r['update']['built'], r['update']['excluded'][0]['source'], r['ok']), ([(['gb'], ['nats', 'xplane'])], ['gb'], 'xplane', True), 'the files taken, the zone gb built in the same gesture with the box of the page, its answer in `update`, what was set aside said', what='chained')
        c.ok('after' in r['update'], str(sorted(r['update'])), 'and the state of the zone after (base/status) comes with it')
        built.clear()
        r = run(dry=False, build=False, personal=['nats'])
        c.eq((built, 'update' in r), ([], False), 'without `build` nothing changes: the files are in place, nothing is built', what='no build')

        def failing(job, a, cx):
            return {'ok': False, 'reason': 'failed', 'message': 'the build page did not start', 'built': [], 'failed': [{'zone': z, 'error': 'page-error'} for z in a['zones']]}
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True, exist_ok=True)
        for f in list((data / 'sia' / 'zones' / 'gb').iterdir()):
            f.unlink()
        ctx['build'] = failing
        r = run(dry=False, build=True, personal=['nats'])
        c.eq((r['ok'], r['reason'], r['update']['failed'][0]['error']), (False, 'build-failed', 'page-error'), 'a build that fails is said (build-failed) with its zone and reason: the files stay taken', what='failing')


@case('K153', 'FAA NASR: when the subscription page refuses the launcher (HTTP 403), the cycle is computed from the AIRAC calendar and the data sets are read from nfdc.faa.gov; the launcher never poses as another browser; when nothing answers, the refusal is said with what is kept (SOG-0219)', 'K', static=True,
      rule='SOG-0219 (10 Nov 2026, the launcher\'s console: « [sortant] échec : www.faa.gov/…/NASR_Subscription/ : HTTP 403 » twice): the HTML page of the subscription answers 403 to the launcher, which declares itself as it is (outbound.UA). Not worked around by posing as a browser. The cycle of the NASR follows the 28-day AIRAC calendar: it is computed (the cycle in force, then the previous one) and the three CSV sets are read from their own host, nfdc.faa.gov; if those do not answer either, the message says the page refuses automatic access, which cycles were tried, and that the points and airways already there are kept')
def k153(c):
    import datetime
    import importlib
    import json
    import sys
    import tempfile
    import urllib.error
    from pathlib import Path
    sys.path.insert(0, str(c.root / 'tools'))
    RJ, BS, AF, DS = _mods()
    N = importlib.import_module('faa_nasr')
    AC = importlib.import_module('aero_cycles')
    fix, awy, nav = _nasr_zips()
    cur = AC.airac_start(datetime.date.today())
    prev = AC.airac_start(datetime.date.fromisoformat(cur) - datetime.timedelta(days=1))
    zips = {'FIX': fix, 'AWY': awy, 'NAV': nav}
    kept = AF.get
    asked = []
    refuse = lambda u: (_ for _ in ()).throw(urllib.error.HTTPError(u, 403, 'Forbidden', {}, None))
    try:
        def fake(missing=()):
            def get(url, *a, **k):
                asked.append(url)
                if url == N.PAGE:
                    refuse(url)
                for kind in zips:
                    if url.endswith(f'_{kind}_CSV.zip'):
                        if any(m in url for m in missing):
                            raise urllib.error.HTTPError(url, 404, 'Not Found', {}, None)
                        return zips[kind]
                raise AssertionError(url)
            return get
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            AF.get = fake()
            r = AF.nasr(td)
            urls = [u for u in asked if u != N.PAGE]
            d = datetime.date.fromisoformat(cur)
            c.eq((r['features'] > 0, [u.split('/')[-1] for u in urls], (Path(td) / 'sia' / 'geojson' / 'faa_nasr.geojson').is_file(), json.loads((Path(td) / 'sia' / 'geojson' / 'faa_nasr.geojson').read_text(encoding='utf-8'))['issue']),
                 (True, [f'{d.day:02d}_{N.MONTHS[d.month - 1]}_{d.year}_{k}_CSV.zip' for k in ('FIX', 'AWY', 'NAV')], True, cur),
                 'the page answers 403: the cycle in force is computed from the AIRAC calendar and the three sets are read from nfdc.faa.gov (the file is written, its issue is that cycle)', what='fallback')
            asked.clear()
            d2 = datetime.date.fromisoformat(prev)
            AF.get = fake(missing=(f'{datetime.date.fromisoformat(cur).day:02d}_{N.MONTHS[datetime.date.fromisoformat(cur).month - 1]}_{datetime.date.fromisoformat(cur).year}',))
            r = AF.nasr(td)
            c.eq(json.loads((Path(td) / 'sia' / 'geojson' / 'faa_nasr.geojson').read_text(encoding='utf-8'))['issue'], prev, 'the cycle in force not published yet (404): the previous one is read', what='previous')
            AF.get = lambda url, *a, **k: refuse(url)
            try:
                AF.nasr(td)
                said = ''
            except ValueError as e:
                said = str(e)
            c.ok('refuse l’accès automatique' in said and 'nfdc.faa.gov' in said and cur in said and 'gardés' in said and '403' in said and 'Choisir le fichier' in said, said,
                 'nothing answers: the page refuses automatic access, the host and the cycles tried are named, what is kept is said, and the repli too (the three sets downloaded in a browser, then « Choisir le fichier… »)')
            (Path(td) / 'local' / 'upload').mkdir(parents=True)
            put = lambda k: (Path(td) / 'local' / 'upload' / f'{d.day:02d}_{N.MONTHS[d.month - 1]}_{d.year}_{k}_CSV.zip').write_bytes(zips[k])
            put('FIX')                                           # the user chose the sets by hand, one by one (K146 recognises them and puts them under the FAA's own name)
            try:
                AF.nasr(td)
                said = ''
            except ValueError as e:
                said = str(e)
            c.ok('déjà déposés' in said and 'FIX' in said.split('déjà déposés')[1] and 'il manque AWY, NAV' in said, said[-200:], 'one set deposited: the message says which are there and which are missing (the screen asks for the rest)')
            put('AWY')
            put('NAV')
            r = AF.nasr(td)
            c.eq((r['features'] > 0, json.loads((Path(td) / 'sia' / 'geojson' / 'faa_nasr.geojson').read_text(encoding='utf-8'))['issue']), (True, cur), 'with the three sets deposited by hand the layer is built from them when the FAA refuses', what='deposited')
    finally:
        AF.get = kept
    ob = importlib.import_module('outbound')
    c.ok(ob.UA and 'Mozilla' not in ob.UA and 'Chrome' not in ob.UA, ob.UA, 'the launcher keeps declaring itself as it is: it never poses as a browser to get past a refusal')


@case('K158', 'base/status says per zone whether the sources the launcher can download are already there for the cycle in force: `download { done, cycle, at, sources: { id: { present, at } } }` (SOG-0180), read only', 'K', static=True,
      rule='SOG-0180 (Réglages, 10 Nov 2026): « sources du cycle déjà présentes » had no field: base/status gave state and reasons only, base/fetch dated its sources only for sia, nats and enaire. Per zone: `download` lists the downloadable sources of the zone (not the hand-dropped, not the local-only; ENAIRE only with its personal box; openAIP not counted when it has no export of the country), whether a file is there and when, `done` = each has a file written since the start of the cycle in force, `at` = the oldest of the last file dates, `cycle` = the cycle in force; no network, nothing written')
def k158(c):
    RJ, BS, AF, DS = _mods()
    ST = types.SimpleNamespace(**RJ.REGISTRY[('base', 'status')][0].__globals__)
    status, check_s = RJ.REGISTRY[('base', 'status')]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'sia' / 'openaip').mkdir(parents=True)
        (data / 'sia' / 'geojson').mkdir(parents=True)
        stamp = lambda p, iso: os.utime(p, (datetime.datetime.fromisoformat(iso).timestamp(),) * 2)
        put = lambda rel, iso: ((data / 'sia' / rel).write_text('{}', encoding='utf-8'), stamp(data / 'sia' / rel, iso))
        (data / 'sia' / 'zones' / 'de').mkdir(parents=True)
        put('openaip/de_asp.geojson', '2026-11-01T10:00:00+00:00')              # de: fetched since the cycle began (29 Oct)
        put('zones/de/dfs_ed_procedures.xml', '2026-11-02T10:00:00+00:00')       # de: and the DFS file, a day later
        put('openaip/no_asp.geojson', '2026-10-10T10:00:00+00:00')              # no: fetched, but for the previous cycle
        put('geojson/faa_sua.geojson', '2026-11-05T08:30:00+00:00')              # us: the FAA layers, not the class layer yet
        ctx = {'data': str(data), 'downloads': lambda: [], 'today': datetime.date(2026, 11, 9), 'cache': str(Path(td) / 'cache')}
        run = lambda **a: status(RJ.Job('base', 'status', {}), check_s(a), ctx)
        z = run(zones=['de', 'no', 'it', 'us', 'cyn'])['zones']
        d = {k: v['download'] for k, v in z.items()}
        c.eq((d['de']['done'], d['de']['cycle'], d['de']['at'], sorted(d['de']['sources'])), (True, '2026-10-29', '2026-11-01T10:00:00Z', ['dfs', 'openaip']),
             'de: its two downloadable sources (openAIP, DFS) are there, written since the start of the cycle in force: done; `at` is the OLDEST of their dates', what='done')
        c.eq((d['no']['done'], d['no']['sources']['openaip']['present'], d['no']['at']), (False, True, '2026-10-10T10:00:00Z'), 'no: a file is there but older than the cycle: present, not done', what='old')
        c.eq((d['it']['done'], d['it']['at'], d['it']['sources']['openaip']), (False, None, {'present': False, 'at': None}), 'it: nothing downloaded: not present, no date', what='none')
        c.eq((d['us']['done'], {k: v['present'] for k, v in d['us']['sources'].items()}, d['us']['at']), (False, {'openaip': False, 'faa': True, 'faaclass': False}, '2026-11-05T08:30:00Z'),
             'us: faa is there, faaclass is not: not done; the oldest date is the only one', what='us')
        c.eq((d['cyn']['done'], d['cyn']['sources']), (False, {}), 'a zone without country code has no openAIP export to wait for: nothing downloadable, not done', what='no code')
        BS.absent_save(ctx, '2026-10-29', {f'it_{k}' for k in ('asp', 'apt', 'nav', 'rpp')})
        z2 = run(zones=['it'])['zones']['it']['download']
        c.eq((z2['done'], z2['sources']), (False, {}), 'openAIP has no export of it for this cycle (the launcher knows it): it is not waited for', what='absent')
        c.ok(not [x for x in (data / 'sia').rglob('*') if x.is_file() and x.name not in ('de_asp.geojson', 'no_asp.geojson', 'faa_sua.geojson', 'dfs_ed_procedures.xml')], 'written', 'read only: nothing was written')


@case('K159', 'A refused download never stops the rest: base/update with one source answering 403 (the FAA) downloads the other zones, builds the zones whose sources are there, and says the failed zone with its reason (SOG-0219 / SOG-0180)', 'K', static=True,
      rule='SOG-0219 (10 Nov 2026, the user: « NASR subscriptions : 403 … ça bloque la mise à jour qui s\'arrête dessus »): « Mettre à jour » stopped on the 403 of the FAA and the other zones were neither downloaded nor rebuilt. A download that fails is a failure of ITS zone and source: base/fetch keeps going with the others (`failed: [{ zone, source, error: http, status: 403 }]`, `reason: partial`), base/update then reads the state and builds what it can; the failed zone is said in the result')
def k159(c):
    RJ, BS, AF, DS = _mods()
    update, check_u = RJ.REGISTRY[('base', 'update')]
    geo = json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [10, 51]}, 'properties': {'_id': 'a', 'name': 'X', 'country': 'DE'}}]}).encode()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td, {})
        ctx = _ctx(DS, data)
        asked = []
        ctx['build'] = lambda job, a, cx: (asked.append(list(a['zones'])), {'ok': True, 'built': [z for z in a['zones'] if z != 'us'], 'failed': [{'zone': 'us', 'error': 'no-input'}]})[1]
        net = _Net(AF, {'de_asp': geo, 'de_apt': geo, 'de_': ('http', 404), 'NASR_Subscription': ('http', 403), 'nfdc.faa.gov': ('http', 403), 'FeatureServer': ('http', 403), 'us_': ('http', 404)})
        with net:
            res = update(RJ.Job('base', 'update', {}), check_u({'zones': ['de', 'us'], 'personal': []}), ctx)
        f = res['fetched']
        c.eq((f['ok'], f['fetched'], sorted((x['zone'], x['source'], x['error'], x.get('status')) for x in f['failed'] if x['zone'] == 'us')), (False, ['de'], [('us', 'faa', 'http', 403), ('us', 'faaclass', 'http', 403)]),
             'the FAA answers 403: its zone is a failure with its source and its status; the other zone (de) was downloaded all the same', what='fetch')
        c.eq((len(asked), sorted(asked[0]) if asked else None, res['built'], [x['zone'] for x in res['failed']]), (1, ['de', 'us'], ['de'], ['us']),
             'then the update went on: the state was read and the zones to build were built (de built; us, whose sources are not there, said in `failed`), it did not stop on the 403', what='built')
        c.ok((data / 'sia' / 'openaip' / 'de_asp.geojson').is_file(), 'de_asp', 'and the files of the zone that answered are on the workstation')


@case('K160', 'base/status says `personal-undeclared` { source } for a zone built with a personal-licence source that the box no longer declares, before `inputs-changed`, not buildable; declared again, the zone is up to date (SOG-0226)', 'K', static=True,
      rule='SOG-0226 (Réglages, 10 Nov 2026): zone_states([se], personal=[]) answered « inputs-changed : zones/se/lfv_se_enr_20261029.geojson » for a zone built with lfv when the box no longer declares it; the screen could not tell « personal source » from a file name. A dedicated code `personal-undeclared { source }` (the build carries a source of PERSONAL_CYCLED, `personal` does not declare it), placed before inputs-changed (its own files are no longer counted as changed inputs), NOT buildable (a build without the declaration would drop the source: the user declares it first)')
def k160(c):
    RJ, BS, AF, DS = _mods()
    BA = types.SimpleNamespace(**RJ.REGISTRY[('base', 'build')][0].__globals__)
    ST = types.SimpleNamespace(**RJ.REGISTRY[('base', 'status')][0].__globals__)
    status, check_s = RJ.REGISTRY[('base', 'status')]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        (data / 'sia' / 'zones' / 'gb' / 'EG_AIP_DS_FULL_20261029.xml').write_text('<x/>', encoding='utf-8')
        d = data / 'sia' / 'base' / 'gb' / '2026-10-29'
        d.mkdir(parents=True)
        parser = ST.parser_version()
        (d / 'meta.json').write_text(json.dumps({'schema': 2, 'zone': 'gb', 'cycle': '2026-10-29', 'kind': 'meta', 'parserVersion': parser, 'data': {}}), encoding='utf-8')
        for k in BA.KINDS:
            if k != 'meta':
                (d / f'{k}.json').write_text('{}', encoding='utf-8')
        ST.write_record(data, 'gb', cycle='2026-10-29', builtAt='2026-10-30T10:00:00Z', parserVersion=parser, personal=['nats'], inputs=ST.signature(ST.inputs_of(str(data), 'gb', {'nats'})))
        ctx = {'data': str(data), 'downloads': lambda: [], 'today': datetime.date(2026, 11, 9)}
        run = lambda **a: status(RJ.Job('base', 'status', {}), check_s(a), ctx)['zones']['gb']
        z = run(zones=['gb'], personal=[])
        c.eq(([x['code'] for x in z['reasons']], z['reasons'][0], z['state'], z['buildable']), (['personal-undeclared'], {'code': 'personal-undeclared', 'source': 'nats'}, 'stale', False),
             'built with NATS, the box does not declare it any more: one reason, with the source, no « inputs-changed » for its own file, stale but not buildable', what='undeclared')
        z = run(zones=['gb'], personal=['nats'])
        c.eq((z['state'], z['reasons']), ('up-to-date', []), 'declared again: up to date', what='declared')
        (data / 'sia' / 'zones' / 'gb' / 'EG_OBS_DS_FULL_20261029.xml').write_text('<y/>', encoding='utf-8')
        z = run(zones=['gb'], personal=[])
        c.eq([x['code'] for x in z['reasons']][0], 'personal-undeclared', 'the code comes before the others (inputs-changed): it is the one the screen says first', what='order')


@case('K162', 'UK Mil AIP: when the server cuts the TLS connection of the launcher, the message says so (before any HTTP request: not the agent) and gives the repli; a PDF chosen by hand is taken (SOG-0234)', 'K', static=True,
      rule='SOG-0234 (10 Nov 2026, the console: « [sortant] échec : www.aidu.mod.uk/aip/pdf/enr/ENR-5-2.pdf : URLError (SSLEOFError) » twice): an SSL EOF is the end of the TLS handshake, before any HTTP request: the user agent plays no part, and the rule stands (no browser posed, no certificate check lowered). The layer says so, gives the direct address and the repli: the PDF downloaded in a browser and chosen by hand (« Choisir le fichier… », recognised under its own name `ENR-5-2.pdf`), which the layer then reads')
def k162(c):
    import ssl
    import sys
    import tempfile
    import urllib.error
    from pathlib import Path
    sys.path.insert(0, str(c.root / 'tools'))
    RJ, BS, AF, DS = _mods()
    kept = AF.get
    try:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            def cut(url, *a, **k):
                raise urllib.error.URLError(ssl.SSLEOFError(8, 'EOF occurred in violation of protocol'))
            AF.get = cut
            out, errs = AF.ukmil(td)
            c.ok(out == [] and len(errs) == 1 and 'poignée de main TLS' in errs[0] and 'avant toute requête HTTP' in errs[0] and 'www.aidu.mod.uk' in errs[0] and 'Choisir le fichier' in errs[0], str(errs), 'the cut TLS connection: said as such, with the direct address and the repli')
            (Path(td) / 'local' / 'upload').mkdir(parents=True)
            (Path(td) / 'local' / 'upload' / 'ENR-5-2.pdf').write_bytes(b'%PDF-1.4 not an AIP')
            out, errs = AF.ukmil(td)
            c.ok(any(o['name'] == 'ukmil_ENR-5-2.pdf' for o in out) and (Path(td) / 'sia' / 'zones' / 'gb' / 'ukmil_ENR-5-2.pdf').is_file(), str(out) + str(errs), 'the PDF chosen by hand is taken when the connection fails (kept beside the others; an unreadable layout is said, not hidden)')
    finally:
        AF.get = kept
    ob = importlib.import_module('outbound') if 'importlib' in globals() else __import__('outbound')
    c.ok('Mozilla' not in ob.UA, ob.UA, 'and the launcher still declares itself as it is')


@case('K165', 'aero_fetch: a mute host no longer holds the one job slot — the connection (TCP and TLS) is given 15 s, the time for a request (reading) is unchanged', 'K', static=True,
      rule='Lot of 11 Nov 2026, challenge a of AeroDB (granted by the ergonomics session): every request of aero_fetch had a single time of 120 s for everything, so a host that does not answer the connection (a firewall that drops) held the only job slot for two minutes per request (the NASR path alone about six minutes). The connection now has its own 15 s (CONNECT_TIMEOUT, TCP and TLS handshake); once connected, the socket gets the time of a request (TIMEOUT) again: a slow server that answers is not cut')
def k165(c):
    import socket
    import threading
    import time
    RJ, B, AF, DS = _mods()
    seen = []
    real = socket.create_connection

    def spy(addr, timeout=socket._GLOBAL_DEFAULT_TIMEOUT, *a, **k):
        seen.append(timeout)
        return real(addr, timeout, *a, **k)

    srv = socket.socket()
    srv.bind(('127.0.0.1', 0))
    srv.listen(5)
    port = srv.getsockname()[1]
    held = []

    def serve():
        while True:
            try:
                conn, _ = srv.accept()
            except OSError:
                return
            held.append(conn)                 # accepts, never answers : a server that is connected but mute

    threading.Thread(target=serve, daemon=True).start()
    AF._OPENERS.clear()
    kept = AF.TIMEOUT
    socket.create_connection = spy
    try:
        c.eq(getattr(AF, 'CONNECT_TIMEOUT', None), 15, 'a connection time of 15 s', what='constant')
        AF.TIMEOUT = 2
        t0 = time.time()
        try:
            AF.get(f'http://127.0.0.1:{port}/x')
            err = 'no error'
        except OSError as e:
            err = 'OSError'
        took = time.time() - t0
        c.eq((err, 1.5 <= took < 6), ('OSError', True), f'a server that is connected but never answers is read for the time of a request (TIMEOUT, here 2 s: {took:.1f} s), not cut at the connection time', what='read time')
        c.eq(seen[:1], [min(15, 2)], 'the TCP connection is asked with the smaller of the two times (here TIMEOUT 2 s)', what='tcp timeout small')
        AF.TIMEOUT = 120
        # the connection asked for the connection time, and the socket then gets the time of a request
        import urllib.request

        def one(url):
            seen.clear()
            AF._OPENERS.clear()
            try:
                AF._open(urllib.request.Request(url), AF.TIMEOUT, ())
            except OSError:
                pass
            return seen[:1]
        socket.create_connection = lambda addr, timeout=None, *a, **k: (seen.append(timeout), (_ for _ in ()).throw(OSError('refused')))[1]
        c.eq((one(f'http://127.0.0.1:{port}/'), one('https://127.0.0.1:9/')), ([15], [15]), 'a request of 120 s asks its connection (http and https) for 15 s', what='tcp timeout')
    finally:
        socket.create_connection = real
        AF.TIMEOUT = kept
        AF._OPENERS.clear()
        srv.close()
        for k in held:
            k.close()


@case('K166', 'A file chosen by hand and read for want of network is DATED in the result line (« déposé le … »): a stale deposit is never taken for a reading of the day (NASR, UK Mil AIP)', 'K', static=True,
      rule='Lot of 11 Nov 2026, challenge c of AeroDB (granted for its first half by the ergonomics session; no clean-up of data/local/upload/: the user decided): when the network fails the layer reads the files the user put in data/local/upload/ whatever their age, and said nothing of it: an old NASR could be read as the one of the day. The result of the source now carries `deposited` (the date of the file, AAAA-MM-JJ) and the job log says « fichier déposé à la main le … (le réseau n’a pas répondu) »; a reading that reached the network carries no date')
def k166(c):
    import datetime
    import os
    import ssl
    import sys
    import tempfile
    import urllib.error
    from pathlib import Path
    sys.path.insert(0, str(c.root / 'tools'))
    RJ, BS, AF, DS = _mods()
    import faa_nasr as N
    kept, kept_convert = AF.get, N.convert
    when = datetime.datetime(2026, 10, 2, 12, 0).timestamp()
    try:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            def cut(url, *a, **k):
                raise urllib.error.URLError(ssl.SSLEOFError(8, 'EOF'))
            AF.get = cut
            up = Path(td) / 'local' / 'upload'
            up.mkdir(parents=True)
            (up / 'ENR-5-2.pdf').write_bytes(b'%PDF-1.4 not an AIP')
            os.utime(up / 'ENR-5-2.pdf', (when, when))
            out, errs = AF.ukmil(td)
            c.eq([o.get('deposited') for o in out if o['name'] == 'ukmil_ENR-5-2.pdf'], ['2026-10-02'], 'UK Mil: the PDF read from data/local/upload/ for want of network carries the date of the file', what='ukmil')
            entry, files, errors, mods, cancelled = BS._fetch_source(RJ.Job('base', 'fetch', {}), td, 'gb', 'ukmil', absent=[], known=set())
            c.eq(entry.get('deposited'), '2026-10-02', 'and so does the line of the source in the result of base/fetch (the page says « déposé le … »)', what='entry')
            # the NASR: three sets deposited by hand, the FAA refusing
            iso = '2026-10-29'
            for k in N.KINDS:
                p = up / os.path.basename(N.url(k, iso))
                p.write_bytes(b'PK')
                os.utime(p, (when + 86400, when + 86400))
            N.convert = lambda *a, **k: ({'type': 'FeatureCollection', 'features': []}, 1, 1)
            AF.get = lambda url, *a, **k: (_ for _ in ()).throw(urllib.error.HTTPError(url, 403, 'Forbidden', {}, None))
            r = AF.nasr(td)
            c.eq((r.get('deposited'), r['features']), ('2026-10-03', 2), 'NASR: the layer read from the sets deposited by hand carries their date (the oldest of the three files)', what='nasr')
            # a reading that reached the network carries no date
            AF.get = lambda url, *a, **k: b'%PDF-1.4 not an AIP'
            out, errs = AF.ukmil(td)
            c.ok(all('deposited' not in o for o in out), str(out), 'a reading that reached the network carries no deposit date')
    finally:
        AF.get = kept
        N.convert = kept_convert


@case('K174', 'Portugal (NAV Portugal eAIP, family F1): the edition read in the title of ENR 4.4, the points of ENR 4.4 and the legs of ENR 3.x read from real page extracts, the file written under its date, the previous edition removed, the same edition not read again; wired as a personal-licence source (SOG-0240)', 'K', static=True,
      rule='SOG-0240, step 2 of the F1 family (the ergonomics session, 11 Nov 2026): NAV Portugal publishes its AIP as an Annex 15 eAIP at a fixed address (…/eAIP_Current/…/LP-ENR-4.4-en-PT.html); the pages were opened and extracts kept as fixtures (frame/aerodb/test/fixtures/eaip_pt/, address and date in their header). tools/eaip_annexe15.py reads the Table-row-type tables: ENR 4.4 (name-code, coordinates on two lines, routes, remarks; a row without readable coordinates is not a point), ENR 3.x (route designator row, one row per point, the leg row with track, distance and limits in two stacked lines). The edition is the « valid from » date of the title; the launcher reads ENR 4.4 first and nothing else when the edition is already there; only the profile’s host and base are asked. Same regime as Sweden: personal-licence source (the tick), the zone published in the user’s data repository; the licence line says what NAV Portugal states (reproduction and redistribution by prior agreement, GEN 0.1)')
def k174(c):
    import json
    import os
    import tempfile
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    import aero_cycles as C
    import eaip_annexe15 as E
    fx = ROOT / 'frame' / 'aerodb' / 'test' / 'fixtures' / 'eaip_pt'
    p44 = (fx / 'LP-ENR-4.4-extract.html').read_text(encoding='utf-8')
    p33 = (fx / 'LP-ENR-3.3-extract.html').read_text(encoding='utf-8')
    prof = E.PROFILES['pt']
    c.eq((E.issue_of_title(p44), E.issue_of_title(p33), E.issue_of_title('<title>AIP x valid from 31 FEB 2026</title>'), E.issue_of_title('<p>nothing</p>')), ('2026-10-01', '2026-10-01', None, None),
         'the edition is the « valid from » date of the page title; an impossible date or no title: none', what='issue')
    pts = E.parse_points(p44)
    c.eq([(p['id'], p['lat'], p['lon']) for p in pts], [('ABALO', 32.331111, -18.130278), ('ABLEG', 40.722778, -8.431111), ('ABONU', 38.5975, -28.007222)],
         'ENR 4.4: the three points (coordinates on two lines, three layouts of the same row), the row without readable coordinates is not one', what='points')
    c.ok('FIR BDRY' in pts[0]['remarks'] and pts[2]['remarks'].startswith('NIL'), str([p['remarks'] for p in pts]), 'their remarks are kept')
    segs = E.parse_routes(p33)
    c.eq([(s['route'], s['a']['id'], s['b']['id'], s['lower'], s['upper'], s['nm'], s['trk']) for s in segs], [('A44', 'ROSAL', 'ALAGU', 10500, 19500, 24.7, 281), ('A44', 'ALAGU', 'ODPAK', 10500, 19500, 15.0, 281)],
         'ENR 3.3: the route A44, two legs between its three points, FL 105 to FL 195 in feet, distance and track', what='legs')
    g, n, m = E.convert_tables(prof, p44, [p33], '2026-10-01')
    c.eq((n, m, g['issue'], g['name'], sorted(f['properties']['id'] for f in g['features'] if f['properties']['sog'] == 'point')), (6, 2, '2026-10-01', 'navpt_pt_enr', ['ABALO', 'ABLEG', 'ABONU', 'ALAGU', 'ODPAK', 'ROSAL']),
         'the GeoJSON: the three points of ENR 4.4 and the three the route names and ENR 4.4 does not list, two legs', what='geojson')
    json.dumps(g, allow_nan=False)
    for page, what in (('<p>nothing</p>', 'ENR 4.4'),):
        try:
            E.convert_tables(prof, page, [p33], '2026-10-01')
            got = 'read'
        except ValueError as e:
            got = str(e)
        c.ok('ENR 4.4' in got, got, 'a page that gives no point is refused, said (a layout changed), never an empty file')
    try:
        E.convert_tables(prof, p44, ['<p>nothing</p>'], '2026-10-01')
        got = 'read'
    except ValueError as e:
        got = str(e)
    c.ok('ENR 3' in got, got, 'an ENR 3 that gives no leg is refused too (a NIL section is the business of a State whose profile says so)')
    c.eq([E.page_url(prof, 'LP-ENR-4.4-en-PT.html')[:30]] + [bool(E.out_re(prof).fullmatch(x)) for x in ('navpt_pt_enr_20261001.geojson', 'navpt_pt_enr_2026100.geojson', 'x/navpt_pt_enr_20261001.geojson')], ['https://ais.nav.pt/wp-content/', True, False, False],
         'only the profile’s pages are asked, only its file names are removed', what='names')
    try:
        E.page_url(prof, '../x.html')
        got = 'asked'
    except ValueError:
        got = 'refused'
    c.eq(got, 'refused', 'a page name that the profile does not hold is refused', what='refused page')
    # the launcher: ENR 4.4 first (the edition), the routes, the file under its date, the previous edition removed, the same edition not read again
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        folder = data / 'sia' / 'zones' / 'pt'
        folder.mkdir(parents=True)
        (folder / 'navpt_pt_enr_20260903.geojson').write_text('{}', encoding='utf-8')
        (folder / 'notes.txt').write_text('keep', encoding='utf-8')
        net = _Net(AF, {'LP-ENR-4.4-en-PT.html': p44.encode(), 'LP-ENR-3.1-en-PT.html': b'<title>x valid from 01 OCT 2026</title><p>NIL</p>', 'LP-ENR-3.3-en-PT.html': p33.encode()})
        with net:
            out, err = AF.navpt(str(data))
        c.eq((err, [(f['name'], f['features'], f['edition'], f['unchanged']) for f in out]), ([], [('navpt_pt_enr_20261001.geojson', 8, '2026-10-01', False)]), 'written: eight features, the edition', what='written')
        c.eq(sorted(os.listdir(folder)), ['navpt_pt_enr_20261001.geojson', 'notes.txt'], 'the previous edition is removed, another file kept', what='folder')
        c.ok(all(u.startswith('https://ais.nav.pt/') for u, _ in net.calls) and len(net.calls) == 3, str(net.calls), 'only ais.nav.pt is asked: ENR 4.4, 3.1, 3.3')
        with _Net(AF, {'LP-ENR-4.4-en-PT.html': p44.encode()}) as net2:
            out2, err2 = AF.navpt(str(data))
        c.eq((err2, [f['unchanged'] for f in out2], len(net2.calls)), ([], [True], 1), 'the same edition again: unchanged, only ENR 4.4 is read', what='unchanged')
        with _Net(AF, {'LP-ENR-4.4-en-PT.html': ('http', 403)}) as net3:
            out3, err3 = AF.navpt(str(data))
        c.ok(out3 == [] and err3 and 'NAV Portugal' in err3[0], str(err3), 'a host that refuses: a failure said with its name, nothing written, nothing worked round')
    # the wiring: cycle of the file, personal licence, zone, the same lists everywhere
    c.eq((C.cycled('zones/pt/navpt_pt_enr_20261001.geojson'), C.CYCLED.get('navpt'), 'navpt' in C.PERSONAL_CYCLED), (('navpt', '2026-10-01'), 'pt', True), 'the date of the file is its cycle (AIRAC), the source is personal-licence', what='cycle')
    z = (ROOT / 'shared' / 'aero_zones.js').read_text(encoding='utf-8')
    c.ok("navpt: {" in z and "pt: ['navpt']" in z and "provider: 'navpt'" in z and "personal: 'licence'" in z[z.index('navpt: {'):z.index('navpt: {') + 1800], 'aero_zones.js', 'the catalogue of the page holds the source, its zone and its personal licence (K52 compares the launcher’s mirror)')
    cat = (ROOT / 'frame' / 'aerodb' / 'catalogue.js').read_text(encoding='utf-8')
    c.ok("id: 'navpt'" in cat and 'NAV Portugal' in cat and 'GEN 0.1' in cat, 'catalogue.js', 'Sources and licences: the line of NAV Portugal says what the publisher states')


def _iso_image(tree, label='EAIP_PORTUGAL'):
    """Une image ISO 9660 NIVEAU 1 fabriquée (noms 8.3 en majuscules, un secteur par dossier) pour les essais : tree = { nom: octets | { sous-dossier } }. Jamais un fichier de l'utilisateur."""
    import struct
    SEC = 2048
    dirs, files = [], []

    def collect(t, path):
        dirs.append((path, t))
        for n, v in sorted(t.items()):
            if isinstance(v, dict):
                collect(v, path + (n,))
            else:
                files.append((path + (n,), v))
    collect(tree, ())
    dext = {p: 18 + i for i, (p, _) in enumerate(dirs)}
    nxt, fext = 18 + len(dirs), {}
    for p, v in files:
        fext[p] = nxt
        nxt += max(1, -(-len(v) // SEC))

    def rec(name, ext, size, isdir):
        nb = name if isinstance(name, bytes) else name.encode('ascii')
        n = 33 + len(nb) + (1 if len(nb) % 2 == 0 else 0)
        return (bytes([n, 0]) + struct.pack('<I', ext) + struct.pack('>I', ext) + struct.pack('<I', size) + struct.pack('>I', size) + bytes(7) + bytes([2 if isdir else 0, 0, 0])
                + struct.pack('<H', 1) + struct.pack('>H', 1) + bytes([len(nb)]) + nb + b'\x00' * (n - 33 - len(nb)))
    img = bytearray(nxt * SEC)
    root = rec(b'\x00', dext[()], SEC, True)
    pvd = bytearray(SEC)
    pvd[0:7] = b'\x01CD001\x01'
    pvd[40:72] = label.encode().ljust(32)
    pvd[80:88] = struct.pack('<I', nxt) + struct.pack('>I', nxt)
    pvd[156:156 + len(root)] = root
    img[16 * SEC:17 * SEC] = pvd
    img[17 * SEC:17 * SEC + 7] = b'\xffCD001\x01'
    for p, t in dirs:
        parent = p[:-1] if p else ()
        data = rec(b'\x00', dext[p], SEC, True) + rec(b'\x01', dext[parent], SEC, True)
        for n, v in sorted(t.items()):
            if isinstance(v, dict):
                data += rec(n + '', dext[p + (n,)], SEC, True)
            else:
                data += rec(n + ';1', fext[p + (n,)], len(v), False)
        img[dext[p] * SEC:dext[p] * SEC + len(data)] = data
    for p, v in files:
        img[fext[p] * SEC:fext[p] * SEC + len(v)] = v
    return bytes(img)


@case('K176', 'An eAIP taken by hand is read by its CONTENT: a zip carrying an ISO (any Windows name), the ISO alone, a zip of the folder or the extracted folder; the ISO is read in pure Python (ISO 9660 level 1, 8.3 names, pages found by their title); every refusal says why (SOG-0244)', 'K', static=True,
      rule='SOG-0244 (the user, 11 Nov: « je télécharge l\'AIP (une iso) du portugal… ça ne marche pas, et je ne peux pas savoir ce qui ne va pas, ni passer le fichier que je viens de télécharger… sais-tu lire les ISOs ? »): the file of NAV Portugal is a zip with ONE member, an ISO 9660 level 1 image (names cut to 8.3 : LP_ENR31.HTM) of the site; tools/iso9660.py reads it in pure Python, read-only and bounded; tools/eaip_annexe15.py finds the pages by the title (« AIP for PORTUGAL … (section ENR-4.4) valid from … ») in a zip carrying an ISO, an ISO, a zip carrying the folder, the folder; « Choisir le fichier… » recognises these by content (source navpt, name navpt_eaip.zip / navpt_eaip.iso) and a refusal says why (« ISO illisible : … », « aucune page de « AIP for PORTUGAL » »); « Mettre à jour » takes the file in the launcher\'s folders (the latest edition IN FORCE, else the nearest to come, said) before the site. The ISO here is built by the case, the pages are reduced extracts: never a file of the user')
def k176(c):
    import io
    import json
    import os
    import sys
    import tempfile
    import zipfile
    from pathlib import Path
    sys.path.insert(0, str(c.root / 'tools'))
    import importlib
    ISO = importlib.import_module('iso9660')
    E = importlib.import_module('eaip_annexe15')
    BU = importlib.import_module('base_upload')
    RJ, BS, AF, DS = _mods()
    fx = c.root / 'frame' / 'aerodb' / 'test' / 'fixtures' / 'eaip_pt'
    p44 = (fx / 'LP-ENR-4.4-extract.html').read_text(encoding='utf-8')
    p33 = (fx / 'LP-ENR-3.3-extract.html').read_text(encoding='utf-8')
    edition = lambda t, d: t.replace('valid from 01 OCT 2026', f'valid from {d}')
    p31 = p33.replace('section ENR-3.3', 'section ENR-3.1')
    other = '<html><head><title>AIP for GERMANY (section ENR-4.4)valid from 01 OCT 2026</title></head><body></body></html>'
    pages = lambda d: {'LP_ENR31.HTM': edition(p44, d).encode(), 'LP_ENR22.HTM': edition(p31, d).encode(), 'LP_ENR24.HTM': edition(p33, d).encode(), 'LP_ENR32.HTM': other.encode()}
    tree = lambda d: {'EAIP': {'HTML': {'EAIP': pages(d)}}, 'INDEX.HTM': b'<html/>'}
    # 1. the reader of images
    img = _iso_image(tree('15 JAN 2020'))
    iso = ISO.Iso(io.BytesIO(img))
    walk = iso.walk()
    c.eq((iso.label, iso.joliet, sorted(walk)[:3], len(walk)), ('EAIP_PORTUGAL', False, ['EAIP/HTML/EAIP/LP_ENR22.HTM', 'EAIP/HTML/EAIP/LP_ENR24.HTM', 'EAIP/HTML/EAIP/LP_ENR31.HTM'], 5), 'the image is read in pure Python: its label, level-1 names (the « ;1 » dropped), its five files', what='walk')
    c.eq(iso.read(walk['EAIP/HTML/EAIP/LP_ENR31.HTM'])[:6], b'<!-- E', 'and a file of it', what='read')

    def refused(fn, *a):
        try:
            fn(*a)
            return 'read'
        except ValueError as e:                     # ISO.IsoError is a ValueError
            return str(e)
    c.eq([refused(ISO.Iso, io.BytesIO(b'x' * 70000)), refused(lambda: ISO.Iso(io.BytesIO(img[:20 * 2048])).walk())], ['pas une image ISO 9660 (signature CD001 absente)', 'extent hors de l’image'], 'garbage and a cut image are refused, said', what='refused iso')
    old = ISO.MAX_ENTRIES
    ISO.MAX_ENTRIES = 3
    try:
        c.eq(refused(ISO.Iso(io.BytesIO(img)).walk), 'trop d’entrées dans l’image', 'too many entries: refused (bounded)', what='bounded')
    finally:
        ISO.MAX_ENTRIES = old
    # 2. the four forms, the same pages found by their TITLE (the names are mangled, the decoy page of another AIP is ignored)
    prof = E.PROFILES['pt']
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        td = Path(td)
        (td / 'a.iso').write_bytes(img)
        with zipfile.ZipFile(td / 'AIP ISO (1).zip', 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('EAIP_PORTUGAL.ISO', img)
        with zipfile.ZipFile(td / 'dossier.zip', 'w') as z:
            for n, b in pages('15 JAN 2020').items():
                z.writestr(f'AIP/eAIP/html/eAIP/{n}', b)
        folder = td / 'aip portugal 2611'
        (folder / 'eAIP' / 'html' / 'eAIP').mkdir(parents=True)
        for n, b in pages('15 JAN 2020').items():
            (folder / 'eAIP' / 'html' / 'eAIP' / n.replace('LP_ENR31.HTM', 'LP-ENR-4.4-en-PT.html')).write_bytes(b)
        got = {}
        for what, p in (('iso', td / 'a.iso'), ('zip+iso', td / 'AIP ISO (1).zip'), ('zip+folder', td / 'dossier.zip'), ('folder', folder)):
            a, b, issue = E.read_package(prof, str(p))
            g, n, m = E.convert_tables(prof, a, b, issue)
            got[what] = (issue, n, m)
        c.eq(got, {k: ('2020-01-15', 6, 4) for k in ('iso', 'zip+iso', 'zip+folder', 'folder')}, 'an ISO, a zip carrying an ISO (any name), a zip carrying the folder, the extracted folder: the same edition, six points, four legs (the route of the extract is in both ENR 3 pages)', what='forms')
        # 3. every refusal says why
        (td / 'junk.bin').write_bytes(b'x' * 100)
        with zipfile.ZipFile(td / 'de.zip', 'w') as z:
            z.writestr('X.ISO', _iso_image({'EAIP': {'HTML': {'EAIP': {'LP_ENR31.HTM': other.encode()}}}}))
        with zipfile.ZipFile(td / 'two.zip', 'w') as z:
            z.writestr('A.ISO', img)
            z.writestr('B.ISO', img)
        (td / 'cut.iso').write_bytes(img[:22 * 2048])
        why = {n: refused(E.read_package, prof, str(td / n)) for n in ('junk.bin', 'de.zip', 'two.zip', 'cut.iso')}
        c.ok(why['junk.bin'] == 'ni zip, ni image ISO, ni dossier' and why['two.zip'] == 'plusieurs images ISO dans le zip' and why['cut.iso'].startswith('ISO illisible') and 'AIP for PORTUGAL' in why['de.zip'], str(why),
             'a junk file, a zip with two images, a cut image, the AIP of another State: each refused with its reason in clear')
        # 4. « Choisir le fichier… » recognises them by content
        rec = {n: BU.recognise(str(td / n), n) for n in ('a.iso', 'AIP ISO (1).zip', 'dossier.zip')}
        c.eq({n: (r['source'], r['zone'], r['name'], r['cycle']) for n, r in rec.items()}, {'a.iso': ('navpt', 'pt', 'navpt_eaip.iso', '2020-01-15'), 'AIP ISO (1).zip': ('navpt', 'pt', 'navpt_eaip.zip', '2020-01-15'), 'dossier.zip': ('navpt', 'pt', 'navpt_eaip.zip', '2020-01-15')},
             'the file chosen by hand is recognised by its content, whatever its name: the source navpt, the zone pt, its canonical name, its edition', what='recognise')
        try:
            BU.recognise(str(td / 'de.zip'), 'de.zip')
            got = 'recognised'
        except BU.Refused as e:
            got = (e.reason, 'AIP for PORTUGAL' in e.message)
        c.eq(got, ('unrecognised', True), 'the ISO of another AIP: refused, with the reason (no page of « AIP for PORTUGAL »)', what='refused upload')
        c.ok('navpt' in BU.EXPECTED, str(BU.EXPECTED), 'and the source is in the closed list of the expected ones')
        # 5. « Mettre à jour » takes the file in the launcher's folders before the site: the latest edition in force, else the nearest to come
        data = td / 'data'
        (data / 'sia' / 'zones' / 'pt').mkdir(parents=True)
        dl = td / 'dl'
        dl.mkdir()
        with zipfile.ZipFile(dl / 'AIP ISO.zip', 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('EAIP_PORTUGAL.ISO', _iso_image(tree('15 JAN 2020')))
        with zipfile.ZipFile(dl / 'AIP ISO (1).zip', 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('EAIP_PORTUGAL.ISO', _iso_image(tree('26 NOV 2099')))
        with zipfile.ZipFile(dl / 'EG_AIP_DS_20261001_XML.zip', 'w') as z:
            z.writestr('EG_AIP_DS_20261001.xml', '<x/>')
        (dl / 'broken.iso').write_bytes(b'\x00' * 40000)
        net = _Net(AF, {})
        with net:
            out, err = AF.navpt(str(data), downloads=lambda: [str(dl)])
        c.eq((err, [(f['name'], f['edition'], f['from'], f.get('future'), f['features']) for f in out], net.calls), ([], [('navpt_pt_enr_20200115.geojson', '2020-01-15', 'AIP ISO.zip', None, 10)], []),
             'two zips in Downloads: the edition IN FORCE is taken (not the one of 2099 that is not yet), no call to the site, the other zip (not an eAIP) is not looked at', what='fetch')
        c.eq(out[0].get('older_than_cycle'), True, 'an edition older than the AIRAC cycle in force is taken but SIGNALLED (older_than_cycle): never a silent « up to date »', what='older')
        deep = td / 'deep'
        (deep / 'x' / 'eAIP' / 'html' / 'eAIP').mkdir(parents=True)
        (deep / 'x' / 'eAIP' / 'html' / 'eAIP' / 'LP-ENR-4.4-en-PT.html').write_bytes(edition(p44, '15 JAN 2020').encode())
        c.ok('aucune page' in refused(E.read_package, prof, str(deep)) or 'manque' in refused(E.read_package, prof, str(deep)), refused(E.read_package, prof, str(deep)), 'an extracted folder is read at ONE known relative path, never searched in depth (pages two levels down are not found)')
        c.ok(any('broken.iso' in r for r in out[0].get('refused', [])) and 'ISO illisible' in ' '.join(out[0].get('refused', [])), str(out[0].get('refused')), 'an image that does not read is said in the result, in clear, and the source does not fail for it')
        os.remove(dl / 'AIP ISO.zip')
        os.remove(data / 'sia' / 'zones' / 'pt' / 'navpt_pt_enr_20200115.geojson')
        with net:
            out, err = AF.navpt(str(data), downloads=lambda: [str(dl)])
        c.eq((err, out[0]['edition'], out[0].get('future'), out[0]['from']), ([], '2099-11-26', True, 'AIP ISO (1).zip'), 'only an edition to come: it is taken and said (future)', what='future')
        c.eq(sorted(os.listdir(data / 'sia' / 'zones' / 'pt')), ['navpt_pt_enr_20991126.geojson'], 'one file in the zone, named by its edition', what='folder')
    # 6. a route that the page does not name is said, never guessed (the edition of 26 Nov 2026 of the real site has 73 of them)
    unnamed = p33.replace('A44<br>(RNAV 5)', '')
    st = {}
    c.eq((E.parse_routes(unnamed, st), st), ([], {'unnamed': 1}), 'a route block with an empty designator: its legs are not read, counted', what='unnamed')
    g, n, m = E.convert_tables(prof, p44, [p33, unnamed], '2026-10-01')
    c.eq((m, g.get('skipped')), (2, {'routes_without_name': 1}), 'and the result says it (skipped)', what='skipped')


@case('K177', 'The Portugal chain, launcher side, end to end: « Choisir le fichier… » (the real upload handler) recognises a zip carrying an ISO and says the edition, then the download of the zone takes it (base/fetch through the jobs, the tick of navpt declared) and writes the layer; without the tick nothing is read (SOG-0244)', 'K', static=True,
      rule='SOG-0244, the join between the screen and the launcher (the ergonomics session, 12 Nov): the screen (L84, a fake launcher) and K176 (the readers alone) were not joined. Here the REAL upload handler (base_upload.receive, the body of POST /__setup/base/upload) receives a fabricated zip carrying an ISO named like Windows names it, answers { ok, source: navpt, zone: pt, name: navpt_eaip.zip, cycle: <edition> } and puts it in data/local/upload/; the REAL jobs run base/fetch for zone pt with the personal tick of navpt, which takes the file from the launcher\'s folders (no network) and writes data/sia/zones/pt/navpt_pt_enr_<edition>.geojson; without the tick (a personal-licence source) nothing is read. The ISO is built by the case; the building of the zone is the browser job covered elsewhere (K42 to K51). The page side of the chain is L84')
def k177(c):
    import io
    import json
    import os
    import tempfile
    import time
    import zipfile
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    import base_upload as BU
    fx = ROOT / 'frame' / 'aerodb' / 'test' / 'fixtures' / 'eaip_pt'
    p44 = (fx / 'LP-ENR-4.4-extract.html').read_text(encoding='utf-8').replace('valid from 01 OCT 2026', 'valid from 15 JAN 2020')
    p33 = (fx / 'LP-ENR-3.3-extract.html').read_text(encoding='utf-8').replace('valid from 01 OCT 2026', 'valid from 15 JAN 2020')
    iso = _iso_image({'EAIP': {'HTML': {'EAIP': {'LP_ENR31.HTM': p44.encode(), 'LP_ENR24.HTM': p33.encode()}}}})
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('EAIP_PORTUGAL.ISO', iso)
    blob = buf.getvalue()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td, {})
        # 1. the upload
        code, out = BU.receive(io.BytesIO(blob), len(blob), 'EAIP ISO (1).zip', str(data), busy=None, merge_pending=None)
        c.eq((code, out.get('ok'), out.get('source'), out.get('zone'), out.get('name'), out.get('cycle')), (200, True, 'navpt', 'pt', 'navpt_eaip.zip', '2020-01-15'),
             'the zip carrying an ISO, named « EAIP ISO (1).zip », is recognised by its content: the source, the zone, its canonical name and the EDITION it carries (the screen says it on the line)', what='upload')
        c.ok((data / 'local' / 'upload' / 'navpt_eaip.zip').is_file(), 'not there', 'and it is put where the launcher looks for what the user chose')
        # 2. the download of the zone through the jobs: without the tick nothing is read, with it the file is taken (no network: any request would fail the case)
        ctx = _ctx(DS, data)
        ctx['downloads'] = lambda: [str(data / 'local' / 'upload')]
        jobs = RJ.Jobs(RJ.REGISTRY, ctx, min_gap={})

        def play(personal):
            s = jobs.start('base', 'fetch', {'zones': ['pt'], 'personal': personal})
            end = time.time() + 60
            v = jobs.view(s['job'])
            while v.get('state') == 'running' and time.time() < end:
                time.sleep(0.1)
                v = jobs.view(s['job'])
            return v
        net = _Net(AF, {})
        with net:
            v = play([])
            c.eq((v['state'], (v['result'] or {}).get('fetched'), os.path.exists(data / 'sia' / 'zones' / 'pt')), ('done', [], False), 'without the tick of navpt (a personal-licence source) nothing is read and nothing is written', what='no tick')
            v = play(['navpt'])
        res = v['result'] or {}
        zone = (v.get('zones') or {}).get('pt') or {}
        c.eq((v['state'], res.get('fetched'), res.get('failed'), [u for u, _ in net.calls if 'nav.pt' in u]), ('done', ['pt'], [], []), 'with the tick the download of pt takes the file the user chose: the zone is fetched, nothing failed, the site was not asked', what='fetch')
        layer = data / 'sia' / 'zones' / 'pt' / 'navpt_pt_enr_20200115.geojson'
        g = json.loads(layer.read_text(encoding='utf-8')) if layer.is_file() else {}
        c.eq((g.get('issue'), len(g.get('features') or []), zone.get('sources', {}).get('navpt', {}).get('state')), ('2020-01-15', 8, 'downloaded'), 'the layer is written under its edition (six points, two legs) and the line of the source says downloaded', what='layer')


@case('K178', 'Publication per zone (SOG-0258): base/status says per zone when it was built and whether its build commit is published (an ancestor of the known remote branch, no network); « Publier » first gives the plan — the other zones that leave with it, the NUMBER of the user\'s files, never their names — then the synchronisation, said as it is', 'K', static=True,
      rule='SOG-0258 (the ergonomics session, 12 Nov 2026: A + B): A) base/status carries per zone `builtAt` and `publish { state: published | unpublished | unknown, commit, at }`: published when the last commit that touched sia/base/<zone>/ is an ancestor of the remote branch the last synchronisation saw (four git calls for all the zones, no network), unpublished when that commit is not sent or the zone was changed since; unknown without repository or without a known remote branch. B) the verb base/publish { zone, dry } : the plan (default) lists what leaves with the zone: the other built zones not published (their names), the number of the user\'s files committed and not sent, the number to commit (never a name); the real run is the synchronisation of data/ (a push carries every unsent commit: no isolation of a zone, said), with the author\'s trigram')
def k178(c):
    import json
    import os
    import subprocess
    import tempfile
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    import zone_publish as ZP

    def git(cwd, *a):
        r = subprocess.run(DS.git_cmd('-C', str(cwd), '-c', 'user.name=T', '-c', 'user.email=t@t', *a), capture_output=True, text=True, encoding='utf-8', env=DS.git_env())
        return r.returncode, r.stdout.strip()

    def commit(cwd, rel, text, msg):
        p = Path(cwd) / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding='utf-8')
        git(cwd, 'add', '--', rel)
        git(cwd, 'commit', '-q', '-m', msg)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        td = Path(td)
        remote, data = td / 'remote.git', td / 'data'
        subprocess.run(DS.git_cmd('init', '-q', '--bare', str(remote)), check=True, env=DS.git_env())
        data.mkdir()
        git(data, 'init', '-q')
        git(data, 'checkout', '-q', '-b', 'main')
        git(data, 'remote', 'add', 'origin', str(remote))
        commit(data, 'README.md', 'x', 'initial')
        commit(data, 'sia/base/fr/2026-10-29/meta.json', '{}', 'Base aéronautique fr 2026-10-29 construite sur le poste')
        commit(data, 'sia/base/de/2026-10-29/meta.json', '{}', 'Base aéronautique de 2026-10-29 construite sur le poste')
        git(data, 'push', '-q', '-u', 'origin', 'main')
        # sent: fr, de. Then: gb built and NOT sent, de changed after its commit (not committed), the user's files (one committed not sent, one to commit)
        commit(data, 'sia/base/gb/2026-10-29/meta.json', '{}', 'Base aéronautique gb 2026-10-29 construite sur le poste')
        (data / 'sia' / 'base' / 'de' / '2026-10-29' / 'meta.json').write_text('{"changed": true}', encoding='utf-8')
        commit(data, 'pilot/RBR/current_flight.json', '{}', 'RBR : 1 fichier(s)')
        (data / 'notes').mkdir()
        (data / 'notes' / 'private_name.json').write_text('{}', encoding='utf-8')
        st = ZP.states(str(data), ['fr', 'de', 'gb', 'zz'])
        c.eq({z: v['state'] for z, v in st.items()}, {'fr': 'published', 'de': 'unpublished', 'gb': 'unpublished'}, 'published: its build commit is on the remote; unpublished: not sent (gb) or changed since (de); a zone with no build commit (zz) is absent', what='states')
        c.ok(all(len(v['commit']) == 40 and v['at'].endswith('Z') for v in st.values()), str(st), 'with the commit and its date')
        p = ZP.plan(str(data), 'gb')
        c.eq((p['ok'], p['state'], p['ahead'], p['commits'], p['otherFiles'], p['pending']), (True, 'unpublished', ['de'], 2, 1, 1), 'the plan of gb: the zone de leaves with it, two commits are not sent, ONE file of the user is committed and not sent, one is to commit', what='plan gb')
        c.ok('current_flight' not in json.dumps(p) and 'private_name' not in json.dumps(p), json.dumps(p), 'and the plan never names a file of the user')
        p = ZP.plan(str(data), 'fr')
        c.eq((p['state'], p['ahead'], p['nothing']), ('published', ['de', 'gb'], False), 'the plan of a published zone still says what would leave (the other zones) and that there is something to send', what='plan fr')
        c.eq([ZP.plan(str(data), z).get('reason') for z in ('../x', 'zz')], ['bad-zone', 'not-built'], 'a bad zone and a zone never built are refused with their reason', what='refused')
        nored = td / 'noremote'
        nored.mkdir()
        git(nored, 'init', '-q')
        commit(nored, 'sia/base/fr/2026-10-29/meta.json', '{}', 'Base aéronautique fr')
        c.eq((ZP.states(str(nored), ['fr'])['fr']['state'], ZP.states(str(nored), ['fr'])['fr']['reason'], ZP.plan(str(nored), 'fr')['reason']), ('unknown', 'no-remote', 'no-remote'), 'without a known remote branch nothing is said published: unknown, no-remote', what='no remote')
        plain = td / 'plain'
        plain.mkdir()
        c.eq(ZP.plan(str(plain), 'fr')['reason'], 'no-repo', 'and a folder that is not a repository: no-repo', what='no repo')
        # the verb
        fn, check = RJ.REGISTRY[('base', 'publish')]
        c.eq([check(a) for a in ({'zone': 'gb'}, {'zone': 'gb', 'dry': False}, {'zone': 'GB'}, {'zone': 'gb', 'x': 1}, {'zone': 'gb', 'dry': 'no'}, {}, None)],
             [{'zone': 'gb', 'dry': True}, {'zone': 'gb', 'dry': False}, None, None, None, None, None], 'the verb takes a zone and dry (the plan by default) and nothing else', what='check')
        ran = []
        ctx = {'data': str(data), 'base_publish': lambda author: (ran.append(author), {'ok': True, 'pushed': True, 'committed': 1})[1]}
        job = RJ.Job('base', 'publish', {}, author='RBR')
        r = fn(job, check({'zone': 'gb'}), ctx)
        c.eq((r['ok'], r['ahead'], ran), (True, ['de'], []), 'the plan runs nothing: no synchronisation', what='dry')
        r = fn(job, check({'zone': 'gb', 'dry': False}), ctx)
        c.eq((r['ok'], ran, r['sync']['pushed']), (True, ['RBR'], True), 'the real run is the synchronisation with the trigram of the page', what='run')
        r = fn(RJ.Job('base', 'publish', {}, author=''), check({'zone': 'gb', 'dry': False}), ctx)
        c.eq((r['ok'], r['reason'], ran), (False, 'no-author', ['RBR']), 'without a trigram nothing is synchronised', what='no author')
    # base/status carries the keys (the state of the zones, the same source as the page)
    src = (c.root / 'tools' / 'regen' / 'base_state.py').read_text(encoding='utf-8')
    c.ok("'builtAt': (rec or {}).get('builtAt')" in src and "out[z]['publish'] = pub.get(z)" in src, 'base_state.py', 'base/status gives builtAt and publish per zone')


@case('K179', 'base/cycle: the LIST of the cycle — every source, how it is taken, and its real state in three steps (downloaded · built · published); late is not missing; the next cycle apart; what the suite does not read yet is a line with its reason; names only, nothing opened, nothing written (SOG-0259)', 'K', static=True,
      rule='SOG-0259 (the user: « une liste globale de tous les refreshs à faire, avec une coche de la part de l\'outil quand c\'est fait »; the ergonomics session accepted the contract, 12 Nov 2026): the read-only verb base/cycle gives { cycle: { inForce, next, ids }, items: [ { id, label, regime: auto | hand | local, zones, steps: { download: { state: done | late | missing | waiting | n/a, cycle, at }, build: { zones, upToDate }, publish: { published, unpublished, unknown } }, why, hand: { link, expected, inDownloads } } ], next: { cycle, items: [ { id, state: in-downloads | to-take | will-be-taken, files } ] }, unread: [ { id, files, reason: no-reader | format, note } ] }; `late` = taken but older than the cycle in force (UK Mil of 6 Oct), distinct from `missing`; the NEXT cycle is apart (what Downloads already holds for it, what is still to take); a file the suite does not read (AIP Canada, Naviair, openAIP XML) is a line with its reason, a name that can be of two States (EK_: Denmark OR Faroe) is said as it is; only the NAMES of the first level of the download folders are listed, no file is opened, nothing is written; the ticks are set by the tool from the real state')
def k179(c):
    import datetime
    import os
    import tempfile
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    fn, check = RJ.REGISTRY[('base', 'cycle')]
    c.eq([check(a) for a in ({}, {'personal': ['nats']}, {'personal': 'x'}, {'x': 1}, None)], [{'personal': []}, {'personal': ['nats']}, None, None, None], 'the verb takes personal (a list of source ids) and nothing else', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        td = Path(td)
        data = _repo(DS, td, {})
        (data / 'sia' / 'openaip').mkdir(parents=True)
        old = datetime.datetime(2026, 10, 1).timestamp()
        new = datetime.datetime(2026, 11, 1).timestamp()
        (data / 'sia' / 'XML_SIA_2026-10-01.xml').write_text('<x/>', encoding='utf-8')
        for rel, t in (('openaip/fr_apt.geojson', new), ('geojson/faa_class.geojson', old)):
            p = data / 'sia' / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('{}', encoding='utf-8')
            os.utime(p, (t, t))
        dl = td / 'dl'
        dl.mkdir()
        for n in ('export_xml_bd_SIA_2026-11-26-v02.zip', 'EG_AIP_DS_20261126_XML (1).zip', 'RAD_2612_v1_6.xlsx', 'eurocontrol-airac-2612-fra-points-26-nov-2026.xlsx', 'EK_ENR_3_1_en.pdf', 'EK_ENR_3_1_en (1).pdf', 'BG_ENR_4_4_en.pdf',
                  'enreng29-october-2026.pdf', 'fr_apt.xml', 'notes.txt'):
            (dl / n).write_bytes(b'x')
        before = sorted(str(p.relative_to(td)) for p in td.rglob('*'))
        ctx = {**_ctx(DS, data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 11, 12)}
        r = fn(RJ.Job('base', 'cycle', {}), check({'personal': []}), ctx)
        c.eq((r['ok'], r['cycle']), (True, {'inForce': '2026-10-29', 'next': '2026-11-26', 'ids': {'inForce': '2611', 'next': '2612'}}), 'the cycle in force, the next one, and their EUROCONTROL identifiers (2611 = 29 Oct, 2612 = 26 Nov)', what='cycle')
        by = {i['id']: i for i in r['items']}
        c.eq((by['sia']['regime'], by['sia']['steps']['download']['state'], by['sia']['steps']['download'].get('cycle'), by['sia']['why']), ('hand', 'late', '2026-10-01', 'older-than-cycle'), 'the SIA held is of 1 Oct: taken, but late (not missing), with its cycle', what='late')
        c.eq((by['sia']['hand']['inDownloads'], by['openaip']['regime'], by['openaip']['steps']['download']['state'], by['faaclass']['steps']['download']['state']), (['export_xml_bd_SIA_2026-11-26-v02.zip'], 'auto', 'done', 'late'), 'the file of the next cycle is listed under the SIA, whose held file stays late; a source the launcher takes by itself is `auto`: openAIP of this cycle done, the FAA classes of 1 Oct late', what='auto')
        c.eq((by['lfv']['steps']['download']['state'], by['lfv']['why']), ('missing', 'no-file'), 'a hand source with no file at all is `missing` (and its link is in `hand`)', what='missing')
        c.ok(isinstance(by['sia']['steps']['build']['zones'], int) and set(by['sia']['steps']['publish']) == {'published', 'unpublished', 'unknown'}, str(by['sia']['steps']), 'the three steps of every line: download, build, publish (counts of the zones it feeds)')
        nx = {i['id']: i for i in r['next']['items']}
        c.eq((r['next']['cycle'], nx['sia']['state'], nx['sia']['files'], nx['nats']['state'], nx['eurocontrol_rad']['files'], nx['openaip']['state'], nx['lfv']['state']),
             ('2026-11-26', 'in-downloads', ['export_xml_bd_SIA_2026-11-26-v02.zip'], 'in-downloads', ['RAD_2612_v1_6.xlsx', 'eurocontrol-airac-2612-fra-points-26-nov-2026.xlsx'], 'will-be-taken', 'to-take'),
             'the NEXT cycle apart: what Downloads already holds for 26 Nov (by the names), what the launcher will take when it is in force, what is still to take by hand', what='next')
        un = {u['id']: u for u in r['unread']}
        c.eq((sorted(un), un['naviair']['files'], un['naviair']['reason'], 'Danemark OU les Féroé' in un['naviair']['note'], un['navcan_aip']['files'], un['openaip_xml']['reason']),
             (['navcan_aip', 'naviair', 'openaip_xml'], ['BG_ENR_4_4_en.pdf', 'EK_ENR_3_1_en (1).pdf', 'EK_ENR_3_1_en.pdf'], 'no-reader', True, ['enreng29-october-2026.pdf'], 'format'),
             'what the suite does not read yet is a line with its reason: AIP Canada, Naviair (the note says EK_ is Denmark OR Faroe), the XML of openAIP; a stray file (notes.txt) is not one', what='unread')
        after = sorted(str(p.relative_to(td)) for p in td.rglob('*'))
        c.eq(before, after, 'read only: nothing written, no folder created', what='read only')
    c.ok(('base', 'cycle') in RJ.READ_ONLY, 'not read-only', 'the verb is read-only for the job slot: it does not replace the last work')


@case('K180', 'base/status never says « personal-undeclared » for a source that does not feed the zone, and an edition in force of a State that publishes by editions is not a past cycle (SOG-0260: the screen said « 69 zones attendent un fichier » and « NAV Portugal 2610 : cycle passé » for a base all built at 29 Oct)', 'K', static=True,
      rule='SOG-0260 (the screen of 12 Nov 9:57 against the launcher: 83 zones built and published, « 4 à jour · 2 à reconstruire · 69 attendent un fichier »): (1) the record of a build keeps the personal sources DECLARED at that build (a global list: airnav, enaire, lfv, nats…), and base/status flagged `personal-undeclared` for each of them in EVERY zone, even Afghanistan, which none of them feeds: with a page that does not declare them, all the zones came back `stale`, not buildable (« attendent un fichier »); the code is now given only for a source that feeds the zone (the sources of the catalogue for that zone). (2) NAV Portugal publishes by editions (« valid from 01 OCT 2026 » stays in force until the next one), not at each AIRAC: its file dated 1 Oct was a cycle older than the cycle in force (29 Oct), so the zone was `source-old` (« cycle passé, téléchargez le cycle 2611 »); the cycle of an edition-based source is the cycle in force when its edition is already in force (aero_cycles.EDITION_SOURCES)')
def k180(c):
    import datetime
    import json
    import tempfile
    import types
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    import aero_cycles as C
    BA = types.SimpleNamespace(**RJ.REGISTRY[('base', 'build')][0].__globals__)
    ST = types.SimpleNamespace(**RJ.REGISTRY[('base', 'status')][0].__globals__)
    status, check_s = RJ.REGISTRY[('base', 'status')]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        parser = ST.parser_version()

        def built(zone, cycle, personal, files=()):
            d = data / 'sia' / 'base' / zone / cycle
            d.mkdir(parents=True)
            (d / 'meta.json').write_text(json.dumps({'schema': 2, 'zone': zone, 'cycle': cycle, 'kind': 'meta', 'parserVersion': parser, 'data': {}}), encoding='utf-8')
            for k in BA.KINDS:
                if k != 'meta':
                    (d / f'{k}.json').write_text('{"data": [1]}' if k == 'points' else '{}', encoding='utf-8')
            ST.write_record(data, zone, cycle=cycle, builtAt='2026-10-30T10:00:00Z', parserVersion=parser, personal=personal, inputs=ST.signature(ST.inputs_of(str(data), zone, set(personal))))
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        (data / 'sia' / 'zones' / 'gb' / 'EG_AIP_DS_FULL_20261029.xml').write_text('<x/>', encoding='utf-8')
        (data / 'sia' / 'zones' / 'pt').mkdir(parents=True)
        (data / 'sia' / 'zones' / 'pt' / 'navpt_pt_enr_20261001.geojson').write_text('{}', encoding='utf-8')
        # the records list the sources declared at build time, whatever feeds the zone (af is fed by none of them)
        decl = ['airnav', 'enaire', 'lfv', 'nats', 'navpt']
        built('af', '2026-10-29', decl)
        built('gb', '2026-10-29', decl)
        built('pt', '2026-10-29', decl)
        ctx = {'data': str(data), 'downloads': lambda: [], 'today': datetime.date(2026, 11, 12)}
        run = lambda zones, personal: status(RJ.Job('base', 'status', {}), check_s({'zones': zones, 'personal': personal}), ctx)['zones']
        z = run(['af', 'gb', 'pt'], [])
        c.eq(([x['code'] for x in z['af']['reasons']], z['af']['state']), ([], 'up-to-date'), 'Afghanistan, fed by none of the personal sources, is up to date for a page that declares none of them (it was stale, not buildable: « attend un fichier »)', what='af')
        c.eq(sorted({x['source'] for x in z['gb']['reasons'] if x['code'] == 'personal-undeclared'}), ['nats'], 'the United Kingdom, fed by NATS, still says so for NATS only (not for ENAIRE, AirNav, LFV)', what='gb')
        c.eq(sorted({x['source'] for x in z['pt']['reasons'] if x['code'] == 'personal-undeclared'}), ['navpt'], 'Portugal likewise for NAV Portugal only', what='pt')
        # an edition in force of a State that publishes by editions is not a past cycle
        rep = C.report(['zones/pt/navpt_pt_enr_20261001.geojson', 'zones/gb/EG_AIP_DS_FULL_20261029.xml'], datetime.date(2026, 11, 12))
        c.eq((rep['navpt']['cycle'], rep['navpt']['stale'], rep['nats']['cycle']), ('2026-10-29', False, '2026-10-29'), 'the edition of 1 Oct of NAV Portugal, in force, counts as the cycle in force (29 Oct): not stale', what='edition')
        rep2 = C.report(['zones/pt/navpt_pt_enr_20261126.geojson'], datetime.date(2026, 11, 12))
        c.eq((rep2['navpt']['cycle'], rep2['navpt']['stale']), ('2026-11-26', False), 'an edition to come keeps its own cycle', what='future edition')
        z = run(['pt'], ['navpt'])
        c.eq([x['code'] for x in z['pt']['reasons'] if x['code'] in ('source-old', 'source-newer')], [], 'and base/status no longer says « source-old » (« cycle passé ») for the edition in force', what='no source-old')


@case('K181', 'Portugal, the join with the screen (SOG-0244): the view of base/fetch carries what the screen says (edition, from, future, older_than_cycle, skipped, refused); base/status says `pickup-waiting` for navpt when a package is in Downloads, and base/pickup takes it', 'K', static=True,
      rule='Réglages L86 (12 Nov 2026) found two gaps on the launcher side: (1) _fetch_source built the line of a source from the files rendered by the provider but kept only the counts, so `edition`, `from`, `future`, `older_than_cycle`, `skipped`, `refused` never reached the view of base/fetch (the screen can say them, it did not receive them); (2) base/status emitted `pickup-waiting` only for NATS and the SIA, so the line of Portugal offered « Choisir le fichier… » and never « Prendre le fichier téléchargé » although a recognised package (a zip carrying an ISO, an ISO, a folder) was in Downloads, and base/pickup did not know navpt. Now: the fields are on the line; the status says pickup-waiting { source: navpt, zip } for a package newer than the layer taken (names only: nothing is read); base/pickup takes it (the plan first, then the layer written under its edition), says what it could not take (unrecognised, with the reason) and what is missing')
def k181(c):
    import datetime
    import io
    import json
    import tempfile
    import time
    import zipfile
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    fx = ROOT / 'frame' / 'aerodb' / 'test' / 'fixtures' / 'eaip_pt'
    ed = lambda t: t.replace('valid from 01 OCT 2026', 'valid from 15 JAN 2020')
    p44 = ed((fx / 'LP-ENR-4.4-extract.html').read_text(encoding='utf-8'))
    p33 = ed((fx / 'LP-ENR-3.3-extract.html').read_text(encoding='utf-8'))
    iso = _iso_image({'EAIP': {'HTML': {'EAIP': {'LP_ENR31.HTM': p44.encode(), 'LP_ENR24.HTM': p33.encode()}}}})
    status, check_s = RJ.REGISTRY[('base', 'status')]
    pickup, check_p = RJ.REGISTRY[('base', 'pickup')]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        td = Path(td)
        data = _repo(DS, td, {})
        dl = td / 'dl'
        dl.mkdir()
        with zipfile.ZipFile(dl / 'EAIP ISO (1).zip', 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('EAIP_PORTUGAL.ISO', iso)
        ctx = {**_ctx(DS, data), 'downloads': lambda: [str(dl)], 'today': datetime.date(2026, 11, 12)}
        # 1. the status says that a package waits (names only)
        st = status(RJ.Job('base', 'status', {}), check_s({'zones': ['pt'], 'personal': ['navpt']}), ctx)['zones']['pt']
        wait = [r for r in st['reasons'] if r['code'] == 'pickup-waiting']
        c.eq([(r['source'], r['zip']) for r in wait], [('navpt', 'EAIP ISO (1).zip')], 'a package recognised by its shape in Downloads and newer than the layer taken: pickup-waiting { source: navpt, zip } (the screen offers « Prendre le fichier téléchargé »)', what='waiting')
        # 2. the pickup: the plan, then the layer written
        plan = pickup(RJ.Job('base', 'pickup', {}), check_p({'zones': ['pt']}), ctx)
        t = [x for x in plan['taken'] if x['source'] == 'navpt']
        c.eq([(x['zone'], x['zip'], x['edition']) for x in t], [('pt', 'EAIP ISO (1).zip', '2020-01-15')], 'the plan of base/pickup shows the package and its edition', what='plan')
        c.ok(not (data / 'sia' / 'zones' / 'pt').exists(), 'written', 'and writes nothing')
        real = pickup(RJ.Job('base', 'pickup', {}), check_p({'zones': ['pt'], 'dry': False}), ctx)
        t = [x for x in real['taken'] if x['source'] == 'navpt']
        layer = data / 'sia' / 'zones' / 'pt' / 'navpt_pt_enr_20200115.geojson'
        c.eq(([(x['zone'], x['zip'], x['edition'], x.get('older_than_cycle')) for x in t], layer.is_file()), ([('pt', 'EAIP ISO (1).zip', '2020-01-15', True)], True), 'the pickup takes it: the layer is written under its edition, the edition older than the cycle is said', what='taken')
        time.sleep(0.05)
        st = status(RJ.Job('base', 'status', {}), check_s({'zones': ['pt'], 'personal': ['navpt']}), ctx)['zones']['pt']
        c.eq([r for r in st['reasons'] if r['code'] == 'pickup-waiting'], [], 'taken: nothing waits any more', what='not waiting')
        # a package that is not read: said with its reason
        (dl / 'broken.iso').write_bytes(b'\x00' * 40000)
        (dl / 'EAIP ISO (1).zip').unlink()
        bad = pickup(RJ.Job('base', 'pickup', {}), check_p({'zones': ['pt'], 'dry': False}), ctx)
        c.eq([(f['source'], f['error'], 'ISO illisible' in f.get('message', ''), f['zip']) for f in bad['failed'] if f['source'] == 'navpt'], [('navpt', 'unrecognised', True, 'broken.iso')], 'an image that does not read is a failure said with its reason (and its name), not a silence', what='failed')
        # 3. the line of the source in the view of base/fetch carries the fields
        (data / 'sia' / 'zones' / 'pt' / 'navpt_pt_enr_20200115.geojson').unlink()
        (dl / 'broken.iso').unlink()
        with zipfile.ZipFile(dl / 'EAIP ISO (1).zip', 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('EAIP_PORTUGAL.ISO', iso)
        jobs = RJ.Jobs(RJ.REGISTRY, ctx, min_gap={})
        net = _Net(AF, {})
        with net:
            s = jobs.start('base', 'fetch', {'zones': ['pt'], 'personal': ['navpt']})
            end = time.time() + 60
            v = jobs.view(s['job'])
            while v.get('state') == 'running' and time.time() < end:
                time.sleep(0.1)
                v = jobs.view(s['job'])
        line = ((v.get('zones') or {}).get('pt') or {}).get('sources', {}).get('navpt', {})
        c.eq({k: line.get(k) for k in ('state', 'edition', 'from', 'older_than_cycle')}, {'state': 'downloaded', 'edition': '2020-01-15', 'from': 'EAIP ISO (1).zip', 'older_than_cycle': True},
             'the line of the source in the view of base/fetch carries the edition, the file NAME and the signal « older than the cycle » (the screen says them)', what='view')


@case('K182', 'base/cycle { zone }: the view PER ZONE for the country sheet — all its sources (auto and by hand) with their three steps for THIS zone, and « what adding it will ask » (sources, files by hand, personal use, what is not read yet) (SOG-0262)', 'K', static=True,
      rule='SOG-0262 (the redesign of the Data screen, 12 Nov 2026): the sheet of a country needs what base/cycle did not give: `zoneView` { zone, known, inCoverage, state { state, builtCycle, builtAt, expectedCycle, publish, notices, reasons[codes] }, sources: [the lines of the list, with the three steps counted for this zone alone], addWillAsk { sources, auto, hand: [{ id, expected }], personal, noReader } }; for a country outside the coverage addWillAsk says what adding it will take (the sources, the files to take by hand, the sources under personal use, and what the suite does not read yet: Denmark, Greenland, Faroe, Canada); an unknown zone is `known: false`')
def k182(c):
    import datetime
    import tempfile
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    fn, check = RJ.REGISTRY[('base', 'cycle')]
    c.eq([check({'zone': z}) for z in ('gb', 'GB', '../x', 5)], [{'personal': [], 'zone': 'gb'}, None, None, None], 'the zone argument is a zone identifier and nothing else', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        td = Path(td)
        data = _repo(DS, td, {})
        (data / 'sia').mkdir(parents=True)
        ctx = {**_ctx(DS, data), 'downloads': lambda: [], 'today': datetime.date(2026, 11, 12)}
        view = lambda z, personal=(): fn(RJ.Job('base', 'cycle', {}), check({'zone': z, 'personal': list(personal)}), ctx).get('zoneView')
        v = view('pt', ['navpt'])
        c.eq((v['known'], v['inCoverage'], v['state']['state'], v['state']['reasons']), (True, False, 'never-built', ['never-built']), 'a country outside the coverage: known, not in the coverage, never built', what='pt')
        ask = v['addWillAsk']
        c.eq((ask['personal'], 'navpt' in ask['auto'], ask['hand'], ask['noReader']), (['navpt'], True, [], []), 'what adding Portugal will ask: NAV Portugal (taken by the launcher, personal use), no file by hand, nothing unread', what='ask pt')
        v = view('gb', ['nats'])
        by = {i['id']: i for i in v['sources']}
        c.eq((sorted(by)[:3], by['nats']['regime'], by['nats']['hand']['expected'][:1], v['addWillAsk']['hand'][0]['id'], v['addWillAsk']['personal']), (['mora', 'nats', 'openaip'], 'hand', ['EG_AIP_DS_*_XML.zip'], 'nats', ['nats']),
             'the United Kingdom: its sources, NATS by hand with the file pattern it expects, under personal use', what='gb')
        c.eq([(view('dk')['addWillAsk']['noReader']), (view('ca')['addWillAsk']['noReader']), view('xx')], [['naviair'], ['navcan_aip'], {'zone': 'xx', 'known': False}], 'Denmark and Canada say what the suite does not read yet; an unknown zone is `known: false`', what='noReader')


@case('K185', 'Sources « indisponibles chez l\'éditeur » (DIRCAM, UK Mil; SOG-0273): the catalogue carries `unavailable` and base/cycle shelves them apart — state `unavailable`, never « late » nor « to do », absent from the next cycle\'s to-take list — and the FAA is ONE deliverable (the full subscription) whose page and file addresses follow the cycle', 'K',
      rule='SOG-0273 (12 Nov 2026, the user: the DIRCAM and UK Mil sites « cassés depuis 1 an »): a source whose publisher no longer publishes is not late and is not to be done; base/cycle gives `unavailable: [ids]`, items with `unavailable: { since }`, download state `unavailable` (why `unavailable-at-publisher`) and, for the next cycle, state `unavailable`. The catalogue (AeroCatalogue.stepsOf → unavailable { since, note[4] }) and the launcher (base_cycle.UNAVAILABLE) say the same: compared here (K183 is the page side). The FAA entry of the catalogue is the 28DaySubscription of the cycle: page …/NASR_Subscription/<date>/, file on nfdc.faa.gov.')
def k185(c):
    import datetime
    import tempfile
    from pathlib import Path
    RJ, BS, AF, DS = _mods()
    import importlib
    BC = RJ.REGISTRY[('base', 'cycle')][0].__globals__
    fn, check = RJ.REGISTRY[('base', 'cycle')]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        td = Path(td)
        data = _repo(DS, td, {})
        (data / 'sia').mkdir(parents=True)
        ctx = {**_ctx(DS, data), 'downloads': lambda: [], 'today': datetime.date(2026, 11, 12)}
        r = fn(RJ.Job('base', 'cycle', {}), check({}), ctx)
    by = {i['id']: i for i in r['items']}
    c.eq(r['unavailable'], ['ukmil'], 'the shelved source (UK Mil only: DIRCAM is read from the SIA CD), apart', what='list')
    c.eq([(by[k]['steps']['download']['state'], by[k]['why'], by[k]['unavailable']) for k in ('ukmil',)], [('unavailable', 'unavailable-at-publisher', {'since': '2025-11'})], 'never « late », never « missing »: unavailable, and since when', what='state')
    c.eq(('mora' in by, [x['id'] for x in r['local'] if x['id'] == 'mora'], all(i['regime'] != 'local' for i in r['items'])), (False, ['mora'], True), 'computed or local sources (MORA, X-Plane) are not items to do: under `local`, « quand ça change », with their date', what='local')
    nx = {i['id']: i['state'] for i in r['next']['items']}
    c.eq((nx.get('ukmil'), nx.get('sia')), ('unavailable', 'to-take'), 'the next cycle: nothing to take for them, the others unchanged', what='next')
    c.eq(BC['UNAVAILABLE'], {'ukmil': '2025-11'}, 'the launcher side of the list (K183 and the catalogue say the same)', what='py')
    c.page.goto(f'{c.base}/frame/aerodb/test/catalogue.html', wait_until='load')
    j = c.js("""() => { const C = AeroCatalogue, o = {};
      for (const id of ['dircam', 'ukmil', 'sia']) { const s = C.stepsOf(id, '2612'); o[id] = s && s.unavailable ? { since: s.unavailable.since, n4: s.unavailable.note.length === 4 } : null; }
      const f = C.stepsOf('adds', '2612');
      return { o, page: f.page.url, files: f.files.map(x => [x.name, x.url, x.verified]) }; }""")
    c.eq(j['o'], {'dircam': None, 'ukmil': {'since': '2025-11', 'n4': True}, 'sia': None}, 'the catalogue says the same: unavailable { since, note ×4 } on UK Mil only', what='catalogue')
    c.eq((j['page'], j['files']), ('https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/2026-11-26/',
                                   [['28DaySubscription_Effective_<AAAA-MM-JJ>.zip', 'https://nfdc.faa.gov/webContent/28DaySub/28DaySubscription_Effective_2026-11-26.zip', True]]),
         'the FAA: ONE file, the full subscription of the cycle; its page and its address are those of the cycle', what='faa')


@case('K187', 'NAT routes on demand, launcher side (SOG-0263): base/update { zones: [nat], fetch: true } downloads the NAT message and builds the nat zone — the verb natEnsure() asks for; the tracks keep the validity (from, to) of their message', 'K', static=True,
      rule='SOG-0263 (12 Nov 2026): the page asks the launcher for base/update on the nat zone when the routes it holds are expired (AeroDb.natEnsure, K186). This case checks the launcher side: the arguments are admitted (zones [nat], personal [], fetch), the NAT message is downloaded, nat_tracks.json is written with the validity of the message (from, to per track), the nat zone is handed to the build; nothing else is fetched (no other zone, no cycle file).')
def k187(c):
    RJ, BS, AF, DS = _mods()
    update, check_u = RJ.REGISTRY[('base', 'update')]
    msg = json.dumps([{'transaction_type': 'NAT_TRACK', 'icao_id': 'EGGX', 'notam_number_formatted': 'EGGX1112/26', 'part_no': 1, 'start_datetime': '2026-11-12T11:30:00Z', 'end_datetime': '2026-11-12T19:00:00Z',
                       'condition_message': 'A ALPHA BRAVO 50/20\nEAST LVLS 350 360\nWEST LVLS NIL\nNAR NIL\n'}]).encode()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td, {})
        ctx = _ctx(DS, data)
        asked = []
        ctx['build'] = lambda job, a, cx: (asked.append(list(a['zones'])), {'ok': True, 'built': list(a['zones']), 'failed': []})[1]
        net = _Net(AF, {'datanat/nat.json': msg})
        arg = check_u({'zones': ['nat'], 'personal': [], 'fetch': True})
        c.ok(arg is not None, str(arg), 'the arguments of natEnsure() are admitted by base/update')
        with net:
            res = update(RJ.Job('base', 'update', {}), arg, ctx)
        f = (res.get('fetched') or {})
        doc = json.loads((data / 'sia' / 'zones' / 'nat' / 'nat_tracks.json').read_text(encoding='utf-8'))
        t = doc['tracks'][0]
        c.eq((f.get('ok'), f.get('fetched'), len(doc['tracks']), t['from'], t['to']), (True, ['nat'], 1, '2026-11-12T11:30:00Z', '2026-11-12T19:00:00Z'), 'the NAT message is taken; the track keeps the validity of its message', what='fetch')
        c.eq((asked, res.get('built')), ([['nat']], ['nat']), 'the nat zone, and only it, is handed to the build', what='build')
        c.ok(all('datanat' in u or 'nat' in u.lower() for u, _ in net.calls), str([u for u, _ in net.calls]), 'nothing else was downloaded')


@case('K189', 'A leftover built folder of a LATER cycle (built early, old parser) is not « the built cycle » of a zone: base/status follows the cycle the sources support, not the newest folder (the UK Maintenance rebuild « construite, 0 fichier écrit » stayed « pas à jour »)', 'K', static=True,
      rule='Ergonomist (12 Nov 2026, the user rebuilt the United Kingdom: « toujours pas à jour ») : data/sia/base/gb/ holds 2026-10-29 (built now, parser 28, the record says so) and 2026-11-26 (built on 9 Nov when the UAS file of 26 Nov arrived early, parser 21). base/status took the NEWEST folder as the built one: builtCycle 2026-11-26, parser-old 21 → 28, source-unbuilt, for ever, because a rebuild of the cycle 2026-10-29 never touches the 26 Nov folder. The built cycle is now the newest folder that is not later than the cycle the sources support (or the cycle in force); the later folder is not counted (it is stale only once its own cycle comes).')
def k189(c):
    RJ, BS, AF, DS = _mods()
    BA = types.SimpleNamespace(**RJ.REGISTRY[('base', 'build')][0].__globals__)
    ST = types.SimpleNamespace(**RJ.REGISTRY[('base', 'status')][0].__globals__)
    status, check_s = RJ.REGISTRY[('base', 'status')]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        (data / 'sia' / 'zones' / 'gb' / 'EG_AIP_DS_FULL_20261029.xml').write_text('<x/>', encoding='utf-8')
        parser = ST.parser_version()
        for cyc, ver in (('2026-10-29', parser), ('2026-11-26', max(1, parser - 7))):
            d = data / 'sia' / 'base' / 'gb' / cyc
            d.mkdir(parents=True)
            (d / 'meta.json').write_text(json.dumps({'schema': 2, 'zone': 'gb', 'cycle': cyc, 'kind': 'meta', 'parserVersion': ver, 'data': {}}), encoding='utf-8')
            for k in BA.KINDS:
                if k != 'meta':
                    (d / f'{k}.json').write_text('{}', encoding='utf-8')
        ST.write_record(data, 'gb', cycle='2026-10-29', builtAt='2026-11-12T13:20:47Z', parserVersion=parser, personal=['nats'], inputs=ST.signature(ST.inputs_of(str(data), 'gb', {'nats'})))
        ctx = {'data': str(data), 'downloads': lambda: [], 'today': datetime.date(2026, 11, 12)}
        z = status(RJ.Job('base', 'status', {}), check_s({'zones': ['gb'], 'personal': ['nats']}), ctx)['zones']['gb']
        c.eq((z['state'], [r['code'] for r in z['reasons']], z['builtCycle']), ('up-to-date', [], '2026-10-29'), 'the cycle the sources support is built and current: the leftover 2026-11-26 folder (parser 21) is not the built cycle, the zone is up to date', what='leftover')


@case('K190', 'A source the publisher no longer publishes (UK Mil: the server cuts the TLS connection) is NOT a failure of the operation: base/fetch says it apart (`unavailable`, state `unavailable` on its line), the operation stays ok and the zone « done » (SOG-0273)', 'K', static=True,
      rule='Ergonomist (12 Nov 2026, the user rebuilt the United Kingdom: « des échecs intermédiaires »): the fetch of gb tries openAIP and UK Mil; UK Mil (ENR-5-2.pdf, last taken 6 Oct) answers SSLEOF; that was a `failed` entry, so the chain said « partial » and the zone « failed » for a source that is unavailable at the publisher and that nothing can fix. Now such a source (base_sources.UNAVAILABLE, the same list as base_cycle and the catalogue) is counted apart: the line says `unavailable` with its error and since when, `ok` stays true, the other sources count.')
def k190(c):
    RJ, BS, AF, DS = _mods()
    fetch, check_f = RJ.REGISTRY[('base', 'fetch')]
    c.eq(BS.UNAVAILABLE, RJ.REGISTRY[('base', 'cycle')][0].__globals__['UNAVAILABLE'], 'the launcher says the same in both places (cycle and fetch)', what='same list')
    geo = json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [-1, 51]}, 'properties': {'_id': 'a', 'name': 'X', 'country': 'GB'}}]}).encode()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td, {})
        ctx = _ctx(DS, data)
        net = _Net(AF, {'gb_asp': geo, 'gb_apt': geo, 'gb_': ('http', 404), 'aidu.mod.uk': ('os', '[SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol')})
        job = RJ.Job('base', 'fetch', {})
        with net:
            res = fetch(job, check_f({'zones': ['gb'], 'personal': []}), ctx)
        c.eq((res['ok'], res['failed'], [(u['zone'], u['source'], u['since']) for u in res.get('unavailable', [])]), (True, [], [('gb', 'ukmil', '2025-11')]), 'UK Mil cut by the server: said apart, not a failure; the operation is ok', what='apart')
        line = (job.view().get('zones', {}).get('gb', {}).get('sources', {}) if hasattr(job, 'view') else {}).get('ukmil', {})
        c.ok(not line or line.get('state') == 'unavailable', str(line), 'its line says unavailable')


@case('K191', 'Persistent journal: the LAST result of pickup, fetch, build and update is kept in data/local/last_results.json when the job ends (lists capped, texts cleaned, no path of the workstation), and base/last (read-only) gives it back (SOG-0265)', 'K', static=True,
      rule='Ergonomist (12 Nov 2026): the launcher keeps ONE job in memory; the result of the previous pickup / fetch was lost as soon as another operation ran or the launcher restarted, and the country sheet could not say « le fil de la dernière opération ». Each job of the four verbs now writes its result under its verb in data/local/last_results.json (never committed): state, end, ok, reason, args and the result trimmed (50 items per list, 300 characters per text, secrets cleaned, the data folder path replaced by « data », keys starting with « _ » dropped). `base/last` reads it (no argument, read-only). Nothing is written for the other verbs, and a journal that cannot be written never stops the job.')
def k191(c):
    import time
    RJ, BS, AF, DS = _mods()
    last, check_l = RJ.REGISTRY[('base', 'last')]
    c.eq((check_l({}), check_l({'x': 1}), ('base', 'last') in RJ.READ_ONLY), ({}, None, True), 'no argument; read-only', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = _repo(DS, td, {})
        ctx = _ctx(DS, data)
        c.eq(last(RJ.Job('base', 'last', {}), {}, ctx), {'ok': True, 'results': {}}, 'no journal yet: empty', what='empty')
        jobs = RJ.Jobs(RJ.REGISTRY, ctx, min_gap={})
        geo = json.dumps({'type': 'FeatureCollection', 'features': []}).encode()
        with _Net(AF, {'de_': ('http', 404)}):
            s = jobs.start('base', 'fetch', {'zones': ['de'], 'personal': []})
            end = time.time() + 60
            v = jobs.view(s['job'])
            while v.get('state') == 'running' and time.time() < end:
                time.sleep(0.1)
                v = jobs.view(s['job'])
        time.sleep(0.2)
        doc = json.loads((data / 'local' / 'last_results.json').read_text(encoding='utf-8'))
        c.eq((sorted(doc), doc['base/fetch']['state'], doc['base/fetch']['job'] == s['job'], 'result' in doc['base/fetch']), (['base/fetch'], 'done', True, True), 'the fetch left its result under its verb', what='written')
        # the trim: caps, paths, private keys
        big = {'failed': [{'zone': f'z{i}', 'message': 'texte du lanceur ' * 60 + str(data)} for i in range(80)], '_points': [1, 2, 3], 'ok': False}
        t = jobs._trim(big)
        c.eq((len(t['failed']), t['failed'][-1], len(t['failed'][0]['message']), '_points' in t, str(data) in json.dumps(t)), (51, {'more': 30}, 300, False, False), 'lists capped at 50 (the rest counted), texts at 300, private keys and the data path gone', what='trim')
        got = last(RJ.Job('base', 'last', {}), {}, ctx)
        c.eq(sorted(got['results']), ['base/fetch'], 'base/last gives the journal back', what='read')
        (data / 'local' / 'last_results.json').write_text('{broken', encoding='utf-8')
        c.eq(last(RJ.Job('base', 'last', {}), {}, ctx), {'ok': True, 'results': {}}, 'a broken journal: empty, no error', what='broken')
