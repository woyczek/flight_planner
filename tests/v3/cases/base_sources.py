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
  * K57 what aero_fetch takes from a server page or response: ENAIRE file names (strict pattern, resolved under sia/aixm5), the NAV CANADA address (https on its
    own host only), the size of a response (200 MB at most, stopped cleanly).
"""
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
    return {'data': str(data), 'secrets': str(Path(data).parent / 'secrets'), 'git_cmd': DS.git_cmd, 'git_env': DS.git_env}


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

    def __call__(self, url, since=None):
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
            c.eq(z['es']['sources']['openaip'], {'state': 'failed', 'error': 'http', 'status': 404}, 'es: no openAIP export (the four layers absent) is an http 404', what='es openaip')
            c.eq(z['es']['sources']['enaire'], {'state': 'skipped', 'error': 'personal'}, 'es: ENAIRE is a personal licence, not declared: skipped, never fetched', what='es enaire')
            c.eq((z['es']['state'], z['es']['done'], z['es']['total'], z['es']['error']), ('failed', 1, 1, 'http'), 'es: failed with the first code; the skipped source is not counted', what='es zone')
            c.eq(z['ca']['sources']['openaip'], {'state': 'failed', 'error': 'http', 'status': 500, 'files': 1, 'bytes': len(apt)}, 'ca openAIP: one layer 500, another written: failed, the file still counted', what='ca openaip')
            c.eq(z['ca']['sources']['navcan'], {'state': 'failed', 'error': 'network'}, 'ca NAV CANADA: a time-out is a network failure', what='ca navcan')
            c.ok(not any(u for u, s in net.calls if 'enaire' in u.lower()), str(net.calls), 'ENAIRE was not asked for anything')
            c.eq(sorted(k for k in z['gb']['sources']), ['nats', 'openaip', 'ukmil'], 'the view carries downloadable, manual and skipped sources; xplane (local) and mora (computed) are left out', what='sources in the view')
            c.eq(res['fetched'], ['gb', 'ca'], 'fetched: the zones where something changed (ca wrote a layer although another failed)', what='fetched')
            c.eq(res['unchanged'], [], 'unchanged: none', what='unchanged')
            c.eq(res['failed'], [{'zone': 'es', 'source': 'openaip', 'error': 'http', 'status': 404}, {'zone': 'ca', 'source': 'navcan', 'error': 'network'},
                                 {'zone': 'ca', 'source': 'openaip', 'error': 'http', 'status': 500}], 'failed: zone, source, code (+ status), in the order they ran', what='failed')
            c.eq((res['ok'], res['reason']), (False, 'partial'), 'not ok, partial: others succeeded', what='verdict')
            nats = next(m for m in res['manual'] if m['source'] == 'nats')
            c.eq(nats, {'zone': 'gb', 'source': 'nats', 'url': 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/', 'name': list(BS.SOURCES['nats']['label'])},
                 'manual: the address (https, from the mirror) and the four names', what='manual nats')
            c.eq([(m['zone'], m['source']) for m in res['manual']], [('gb', 'nats')], 'manual: only the manual / pdf sources of the requested zones (gb: NATS; es and ca have none)', what='manual list')
            c.eq((res['outside_sync'], res['warnings']), (1, [{'code': 'outside-sync', 'count': 1}]), 'one file tracked by git was modified (gb_apt.geojson): outside-sync 1; the new files are not tracked', what='outside sync')
            c.eq((data / 'sia' / 'openaip' / 'gb_apt.geojson').read_bytes(), apt, 'the file is written where aero_fetch writes it (data/sia/openaip/)', what='written')
            c.ok((data / 'sia' / 'openaip' / 'gb_asp.geojson').read_bytes() == asp and not (data / 'sia' / 'openaip' / 'gb_nav.geojson').exists(), 'files', 'only the layers served')
            c.eq(_git(DS, data, 'rev-parse', 'HEAD').stdout, head_before, 'no commit', what='no commit')
            c.ok('gb_apt' in _git(DS, data, 'status', '--short').stdout, _git(DS, data, 'status', '--short').stdout, 'the tracked file shows as modified in the data repository (that is what outside-sync warns about)')
            c.ok(any('échec' in x and 'es:' in x for x in view['log']), str(view['log'][:6]), 'the journal says the failures')

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
            net = _Net(AF, {'DatosDigitales-en.html': _page_enaire(), 'AIP_DS_FULL_Airspace': b'<a/>', 'AIP_DS_FULL_EnRoute': b'<e/>', 'nat.json': nat_json, 'FeatureServer': fc,
                            'es_': ('http', 404), 'us_': ('http', 404)})
            with net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['es', 'nat', 'us'], 'personal': ['enaire']}, ctx)
            z = view['zones']
            c.eq((z['es']['sources']['enaire']['state'], z['es']['sources']['enaire']['files']), ('downloaded', 2), 'ENAIRE declared: both datasets downloaded', what='enaire')
            c.ok(sorted(os.listdir(data / 'sia' / 'aixm5')) == ['LE_2026_10_AIP_DS_FULL_Airspace.xml', 'LE_2026_10_AIP_DS_FULL_EnRoute.xml'], str(os.listdir(data / 'sia' / 'aixm5')), 'the previous amendment is removed by aero_fetch')
            c.eq((z['nat']['sources']['nat']['state'], (data / 'sia' / 'zones' / 'nat' / 'nat_tracks.json').is_file()), ('downloaded', True), 'NAT: the tracks file written under zones/nat/', what='nat')
            c.eq({k: v['state'] for k, v in z['us']['sources'].items()}, {'faa': 'downloaded', 'faaclass': 'downloaded', 'openaip': 'failed'}, 'US: the two FAA sources (sua + mtr, class) downloaded, no openAIP export', what='us')
            c.ok(all((data / 'sia' / 'geojson' / f'faa_{l}.geojson').is_file() for l in ('sua', 'mtr', 'class')), str(os.listdir(data / 'sia' / 'geojson')), 'faa_sua, faa_mtr and faa_class written under geojson/')
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
            c.eq((res['ok'], res['reason'], [f['error'] for f in res['failed']]), (False, 'failed', ['network'] * 2), 'every source failed: reason failed', what='all failed')
            c.eq({k: v['state'] for k, v in view['zones'].items()}, {'de': 'failed', 'it': 'failed'}, 'both zones failed', what='zones failed')
            with _Net(AF, {'': ('http', 404)}) as net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['cyn']}, ctx)
            c.eq((view['zones']['cyn']['sources']['openaip'], len(net.calls)), ({'state': 'failed', 'error': 'http', 'status': 404}, 0), 'a zone without a two-letter code has no openAIP export: failed http 404, no request', what='cyn')
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
    saved = (AF.outbound.urlopen, AF.MAX_BYTES)
    try:
        AF.MAX_BYTES = 1000
        for body, length, ok in ((b'x' * 999, 999, True), (b'x' * 1000, None, True), (b'x' * 1001, None, False), (b'x' * 10, 5000, False), (b'x' * 3000, 10, False)):
            AF.outbound.urlopen = lambda req, timeout=None, b=body, n=length: _Resp(b, n)
            try:
                got = AF.get('https://example.invalid/x')
                res = ('ok', len(got))
            except AF.TooLarge as e:
                res = ('too-large', BS.classify(e)['error'])
            c.eq(res, ('ok', len(body)) if ok else ('too-large', 'network'), f'get: {len(body)} bytes, Content-Length {length} -> {"read" if ok else "stopped (network)"}', what=f'get {len(body)}/{length}')
    finally:
        AF.outbound.urlopen, AF.MAX_BYTES = saved
    c.eq(AF.MAX_BYTES, 200 * 1024 * 1024, 'the cap is 200 MB per response', what='MAX_BYTES')
