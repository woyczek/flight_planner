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
            net = _Net(AF, {'DatosDigitales-en.html': _page_enaire(), 'AIP_DS_FULL_Airspace': b'<a/>', 'AIP_DS_FULL_EnRoute': b'<e/>', 'nat.json': nat_json, 'FeatureServer': fc,
                            'es_': ('http', 404), 'us_': ('http', 404)})
            with net:
                view, res = _run(RJ, BS, 'fetch', {'zones': ['es', 'nat', 'us'], 'personal': ['enaire']}, ctx)
            z = view['zones']
            c.eq((z['es']['sources']['enaire']['state'], z['es']['sources']['enaire']['files']), ('downloaded', 2), 'ENAIRE declared: both datasets downloaded', what='enaire')
            c.ok(sorted(os.listdir(data / 'sia' / 'aixm5')) == ['LE_2026_10_AIP_DS_FULL_Airspace.xml', 'LE_2026_10_AIP_DS_FULL_EnRoute.xml'], str(os.listdir(data / 'sia' / 'aixm5')), 'the previous amendment is removed by aero_fetch')
            c.eq((z['nat']['sources']['nat']['state'], (data / 'sia' / 'zones' / 'nat' / 'nat_tracks.json').is_file()), ('downloaded', True), 'NAT: the tracks file written under zones/nat/', what='nat')
            c.eq({k: v['state'] for k, v in z['us']['sources'].items()}, {'faa': 'downloaded', 'faaclass': 'downloaded', 'openaip': 'skipped'}, 'US: the two FAA sources (sua + mtr, class) downloaded, no openAIP export (absent)', what='us')
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
    c.eq([C.cycled(n) for n in names], [('sia', '2026-10-01'), ('sia', '2026-10-29'), ('sia', '2026-10-01'), ('nats', '2026-10-01'), ('nats', '2026-10-29'), None,
                                        None, None, None, None, None],
         'the cycle in the names: SIA dates, NATS dates (inside 2611: 2611); ENAIRE\'s names say none (« A_2026_10 » is its 10th amendment, not cycle 2610), openAIP, UK Mil, an impossible date: none', what='names')
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
    c.eq(rep, {'sia': {'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False}, 'nats': {'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False},
               'enaire': {'cycle': None, 'current': '2026-10-29', 'stale': False}, 'airnav': {'cycle': None, 'current': '2026-10-29', 'stale': False}},
         'report: the newest cycle of each source (ENAIRE: none without its folder), stale when older than the cycle in force', what='report')
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
                'enaire': {'cycle': None, 'current': cur, 'stale': False}, 'airnav': {'cycle': None, 'current': cur, 'stale': False}}
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
    # 1. the build reads the new place first, then the old; a name at both places is read at the new one
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        sia, new = data / 'sia', data / 'local' / 'sources' / 'sia'
        (new / '2026-10-29').mkdir(parents=True)
        (new / '2026-10-01').mkdir(parents=True)
        sia.mkdir(parents=True)
        (sia / 'XML_SIA_2026-10-01.xml').write_text('legacy-1001', encoding='utf-8')            # only at the old place
        (sia / 'AIXM4.5_all_FR_OM_2026-10-29.xml').write_text('legacy-1029', encoding='utf-8')  # at both: the new one wins
        (new / '2026-10-29' / 'AIXM4.5_all_FR_OM_2026-10-29.xml').write_text('new-1029', encoding='utf-8')
        (new / '2026-10-29' / 'XML_SIA_2026-10-29.xml').write_text('new-xml-1029', encoding='utf-8')
        (new / '2026-10-01' / 'sia-airspaces-2026-10-01.xml').write_text('new-air', encoding='utf-8')
        (new / '2026-10-29' / 'notes.txt').write_text('x', encoding='utf-8')                   # not a raw SIA name
        (new / 'not-a-date').mkdir()
        (new / 'not-a-date' / 'XML_SIA_2026-10-01.xml').write_text('x', encoding='utf-8')       # a folder that is not a cycle date
        inputs = B.list_inputs(str(data))
        read = lambda rel: Path(inputs[rel]).read_text(encoding='utf-8')
        c.eq({k: read(k) for k in sorted(inputs)}, {'AIXM4.5_all_FR_OM_2026-10-29.xml': 'new-1029', 'XML_SIA_2026-10-01.xml': 'legacy-1001', 'XML_SIA_2026-10-29.xml': 'new-xml-1029', 'sia-airspaces-2026-10-01.xml': 'new-air'},
             'the new place is read first, the old one as a fall-back; a name at both: the new; a non-SIA name and a folder that is not a cycle date: not read', what='precedence')
        legacy, moved = B.split_inputs(str(data), inputs)
        c.eq((legacy, [(m['source'], m['cycle'], m['name']) for m in moved]), (['XML_SIA_2026-10-01.xml'], [('sia', '2026-10-29', 'AIXM4.5_all_FR_OM_2026-10-29.xml'), ('sia', '2026-10-29', 'XML_SIA_2026-10-29.xml'),
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
