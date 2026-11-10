"""Area K - aerodb procedures (frame/aerodb/SPEC.md section 5 quinquies; frame/aerodb/test/procedures.html).

Rules covered
  * K40 the load time of the procedures: a warm call reads nothing, builds nothing and lists nothing (the memo is trusted until a
    watcher / refresh / fetch invalidation), a cold build looks each identifier up once, and the placed positions are the base's.
  * K1 the bench of the procedures API passes: SID and STAR read from an OFP at the common schema (id, ordered points,
    status `ofp`, planned altitude, no constraint), nothing written by a read, one file per aerodrome by `rememberOfp`,
    the same OFP again writes nothing, published and seen procedures merged with the best status winning, filters, a
    reader that does not write.
  * K5 the base keeps one entry per VFR reporting point: the SIA's (prefixed id, description, 6 decimals), not the bare
    openAIP twin merged on top of it (shared/aero_sources.js `merge`; the SIA parser reads each point once).

  * K8 the XML stream reader (frame/aerodb/xml_stream.js, a brick kept from the data laboratory for the Data module): the same
    results as the page's readers on the same synthetic fixture at every chunk size, and through pump() on a byte stream (golden);
  * K9 the ZIP stream reader (zip_stream.js): central directory from the end of the file, an entry byte for byte, and the streamed
    chain (ZIP → XML reader) giving the counts of the V2 chain; the Sources screen fetches nothing; the laboratory is gone.

Cases: K1, K5, K8, K9, K40 (and K2 K3 K4 K6 below).  The OFP of the bench is built from SimBrief's documented fields (no real OFP in the repository yet).
"""
import re

from lib import ROOT, Fail, case


@case('K1', 'Procedures API bench', 'K', tags=('aerodb',), phone=False, rule='frame/aerodb/SPEC 5 quinquies; DECISIONS 25 Oct 2026')
def k1(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__procBench && window.__procBench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__procBench.done)', 'a finished bench', 'frame/aerodb/test/procedures.html') from None
    r = c.js('({ pass: window.__procBench.pass, fail: window.__procBench.fail, rows: window.__procBench.rows })')
    bad = [x for x in (r['rows'] or []) if x.startswith('FAIL')][:3]
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}", 'every assertion of the bench passes')


@case('K5', 'VFR reporting points of the base: one per point', 'K', tags=('aerodb',), phone=False,
      rule='aerodb DECISIONS 26 Oct 2026 (relay of the cloud): the SIA point wins over the bare openAIP twin')
def k5(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__vrpBench && window.__vrpBench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__vrpBench.done)', 'a finished bench', 'frame/aerodb/test/vrp_sources.html') from None
    r = c.js('({ pass: window.__vrpBench.pass, fail: window.__vrpBench.fail, rows: window.__vrpBench.rows })')
    bad = [x for x in (r['rows'] or []) if x.startswith('FAIL')][:3]
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}", 'every assertion of the bench passes')


def _bench(c, page, var):
    c.page.goto(f'{c.base}/frame/aerodb/test/{page}', wait_until='load')
    try:
        c.page.wait_for_function(f'window.{var} && window.{var}.done', timeout=60000)
    except Exception:
        raise Fail(f'the bench never reported done (window.{var}.done)', 'a finished bench', f'frame/aerodb/test/{page}') from None
    r = c.js(f'({{ pass: window.{var}.pass, fail: window.{var}.fail, rows: window.{var}.rows }})')
    return r, [x for x in (r['rows'] or []) if x.startswith('FAIL')][:3]


@case('K21', 'Cycles, catalogue and the Données module\'s calls (lot D1)', 'K', tags=('aerodb',), phone=False,
      rule='frame/aerodb/SPEC § 4 (cycle names: one airac.js, the Python aligned), § 5 (publication, zones, sources), § 5 sexies (catalogue.js)')
def k21(c):
    r, bad = _bench(c, 'catalogue.html', '__catBench')
    c.ok(r['fail'] == 0 and r['pass'] >= 20, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}",
         'airac.js, the catalogue\'s schema and links, the file-name readers, the EAD outcomes, and publication() / zones() / sources() on a reader in memory')
    # AeroCatalogue.PARSER_VERSION follows shared/sia_base.js VERSION (the format version of the published base): both files are read here
    base = (ROOT / 'shared' / 'sia_base.js').read_text(encoding='utf-8')
    cat = (ROOT / 'frame' / 'aerodb' / 'catalogue.js').read_text(encoding='utf-8')
    m1, m2 = re.search(r'const VERSION =\s*(\d+)', base), re.search(r'const PARSER_VERSION = (\d+)', cat)
    c.eq((m2 and int(m2.group(1))) or None, (m1 and int(m1.group(1))) or 0, 'AeroCatalogue.PARSER_VERSION is the VERSION of shared/sia_base.js (it must follow it)', what='PARSER_VERSION')
    c.eq(c.js('window.__parserVersion'), int(m1.group(1)), 'the catalogue serves that number', what='served PARSER_VERSION')
    # one calculation: the Python tools follow the same 28-day suite from AIRAC 2401 = 2024-01-25 as airac.js
    import datetime
    import importlib
    import sys
    tools = str(ROOT / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    E = importlib.import_module('proc_ead')
    dates = ['2024-01-25', '2025-12-31', '2026-10-26', '2026-10-29', '2026-12-31', '2027-01-21', '2027-06-30']
    js = c.js('(ds) => ds.map(d => AeroAirac.cycleOf(d).date)', dates)
    ref = datetime.date(2024, 1, 25)
    py = [(ref + datetime.timedelta(days=28 * ((datetime.date.fromisoformat(d) - ref).days // 28))).isoformat() for d in dates]
    c.eq(js, py, 'airac.js and the Python calculation give the same cycle for every date', what='cycles by date')
    c.eq(E.lib_cycle('.'), c.js('AeroAirac.cycleOf(Date.now()).date'), 'proc_ead.lib_cycle (the EAD tools) gives the cycle in force of airac.js', what='cycle in force')
    P = importlib.import_module('proc_sia')
    cycles = ['2026-10-01', '2026-10-29', '2027-01-21']
    c.eq([P.eaip_url(d) for d in cycles], c.js('(ds) => ds.map(d => AeroCatalogue.eaipBase(d))', cycles),
         'proc_sia.eaip_url (the launcher job) writes the same eAIP folder address as catalogue.js eaipBase()', what='eAIP folder address')


@case('K40', 'Procedures load time: one read and one analysis per aerodrome, shared by every call', 'K', tags=('aerodb',), phone=False,
      rule='aerodb DECISIONS 29 Oct 2026 (procedures load time): the memo is trusted until an invalidation; a warm call reads and lists nothing')
def k40(c):
    # frame/aerodb/test/perf_procedures.html on a synthetic aerodrome (60 procedures, half of the points without a position, two zones) and
    # a reader that counts its reads / lists and costs what the frame's data layer costs (IndexedDB, JSON parse per read, list() = getAll).
    # The real files of the user are not in the repository: the page measures them when given ?data=<folder> (see its header); here the
    # budgets are generous (ten warm calls under 200 ms, a cold build under 5 s) and the counts are exact.
    r, bad = _bench(c, 'perf_procedures.html', '__perfBench')
    c.ok(r['fail'] == 0 and r['pass'] >= 18, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}",
         'a warm procedures() / runways() / procedure() / coverage() reads no file and lists nothing; ten calls in a row or at once build nothing; '
         'a cold build looks each identifier up once (42 coordsAll calls for 240 points) and reads its proc files once; the placed positions are the '
         "base's (nearest of a duplicated identifier); the watcher drops the entry on a changed revision and not on an echo; a terrain with no file "
         'is read again after 30 s only; a changed published file rebuilds the entries that used the base')


@case('K8', 'XML stream reader: golden test against the V2 readers', 'K', tags=('aerodb',), phone=False,
      rule='frame/aerodb/SPEC 5 sexies (xml_stream.js, a brick kept for the Data module); DECISIONS 28 Oct 2026')
def k6(c):
    r, bad = _bench(c, 'xml_stream.html', '__xmlBench')
    c.ok(r['fail'] == 0 and r['pass'] > 40, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}",
         'the same airspaces, VFR points, aerodromes, navaids, points and obstacles as the V2 readers, at every chunk size (at least 40 checks)')


@case('K9', 'ZIP stream reader: entries, bytes, and the same counts as the V2 chain', 'K', tags=('aerodb',), phone=False,
      rule='frame/aerodb/SPEC 5 sexies (zip_stream.js, a brick kept for the Data module); no fetch in the Sources screen')
def k7(c):
    r, bad = _bench(c, 'zip_stream.html', '__zipBench')
    c.ok(r['fail'] == 0 and r['pass'] >= 7, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}",
         'central directory from the end, an entry byte for byte, the streamed chain gives the counts of the V2 chain')
    import re
    for f in ('frame/aerodb/sources.js', 'frame/aerodb/catalogue.js', 'frame/aerodb/airac.js'):
        t = re.sub(r'(?m)^\s*//.*$|/\*.*?\*/', '', (ROOT / f).read_text(encoding='utf-8'), flags=re.S)      # the code, without its comments
        c.ok(not re.search(r'\bfetch\s*\(|XMLHttpRequest|importScripts|new\s+Worker', t), f, f'{f} fetches nothing (links only)')
        c.ok(not re.search(r'ghp_[A-Za-z0-9]{20,}|github_pat_|woyczek|@gmail\.|C:\\Users', t), f, f'{f}: no token, no personal address')
    gone = [p for p in ('frame/aerodb/lab.js', 'frame/aerodb/lab_measure.js', 'frame/aerodb/lab_sources.js', 'frame/aerodb/test/lab.html') if (ROOT / p).exists()]
    c.eq(gone, [], 'the data laboratory is removed (user, 28 Oct 2026)', what='laboratory files left')


# ------------------------------------------------------------------------------------------------ eAIP tables (static)
# tools/proc_sia.py, proc_layouts.py, proc_records.py on lines of text read once from the SIA's PDF pages (AIRAC 2026-10-01) and kept in
# frame/aerodb/test/fixtures/eaip/: no pypdf, no network.
def _proc():
    """Les lecteurs de procédures de tools/ (proc_geometry, proc_layouts, proc_pdf, proc_records, proc_sia) en UN espace de noms, pour les cas qui lisent des pages inventées : les noms sont ceux
    des modules (V3 § 10.29 (b) a coupé l'ancien proc_eaip.py). Un cas qui REMPLACE un nom (fetch, all_pages_rows…) le fait sur le module qui l'appelle (proc_sia), pas ici."""
    import importlib
    import sys
    import types
    tools = str(ROOT / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    ns = types.SimpleNamespace()
    for name in ('proc_geometry', 'proc_layouts', 'proc_pdf', 'proc_records', 'proc_sia'):
        for k, v in vars(importlib.import_module(name)).items():
            if not k.startswith('__') and not hasattr(ns, k):
                setattr(ns, k, v)
    return ns


def _regen():
    """Le socle des travaux du lanceur (tools/regen_jobs.py) avec les verbes des jeux chargés (tools/regen/*.py : proc.py, la lecture des procédures), comme le lanceur au premier appel."""
    import importlib
    import sys
    tools = str(ROOT / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    RJ = importlib.import_module('regen_jobs')
    if ('proc', 'ead-fetch') not in RJ.REGISTRY:
        failed = RJ.load_verbs()
        if failed:
            raise Fail(f'load_verbs: {failed}')
    return RJ


def _geometry():
    import importlib
    import sys
    tools = str(ROOT / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    return importlib.import_module('proc_geometry')


def _gaps(legs):
    """Écarts de géométrie d'une table de tronçons (proc_geometry.check_legs) : la liste, vide = cohérente."""
    return _geometry().check_legs(legs)['gaps']


def _gaps_of(proc):
    """Écarts de géométrie d'une procédure lue (ses points, proc_geometry.legs_of)."""
    G = _geometry()
    return G.check_legs(G.legs_of(proc['points']))['gaps']


def _eaip_rows(fx, name):
    """Les lignes d'une page d'un jeu de pages d'un terrain (frame/aerodb/test/fixtures/eaip/<OACI>/<nom>.rows.txt, regénérable par tools/make_eaip_fixtures.py) : `name` est celui du PDF, avec ou
    sans .pdf / .rows.txt."""
    stem = name.replace('.rows.txt', '').replace('.pdf', '')
    return (fx / stem.split('_')[2] / f'{stem}.rows.txt').read_text(encoding='utf-8').splitlines()


def _eaip_names(c, icao, pattern='*'):
    """Les noms (sans extension) des pages d'un jeu : tous ceux du manifeste, ou seulement ceux qui répondent au motif."""
    import fnmatch
    d = c.root / 'frame/aerodb/test/fixtures/eaip' / icao
    return sorted(f.name[:-len('.rows.txt')] for f in d.glob('*.rows.txt') if fnmatch.fnmatch(f.name[:-len('.rows.txt')], pattern))


def _eaip(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    mod = _proc()
    fx = c.root / 'frame/aerodb/test/fixtures/eaip'

    def rows(name):                                   # the rows of a page of a set: AD_2_<ICAO>_… lives in eaip/<ICAO>/
        return _eaip_rows(fx, name)
    return mod, fx, rows


@case('K2', 'eAIP coding tables', 'K', static=True, rule='aerodb DECISIONS 25 Oct 2026 (step 2): SID / STAR / RNP tables read as legs')
def k2(c):
    P, fx, rows = _eaip(c)
    sid = P.parse_code_table(rows('AD_2_LFBD_DATA_SID_RWY23_RNAV_CODE_01'))
    c.eq((sid['kind'], sid['runways']), ('SID', ['23']), 'SID RNAV RWY 23', what='LFBD SID title')
    names = [g['label'] for g in sid['groups']]
    c.eq(names, ['ROYAN 6P', 'CNA 6P', 'OBLOC 6P', 'VAVIX 6P'], 'four SID in page order', what='LFBD SID names')
    royan = sid['groups'][0]['legs']
    c.eq([(l['leg'], l['id']) for l in royan], [('CF', 'BD230'), ('DF', 'BD923'), ('TF', 'BD927'), ('TF', 'ROYAN')], 'legs in order', what='ROYAN 6P')
    c.eq((royan[1]['turn'], royan[0]['over'], royan[3]['nm']), ('R', True, 34.1), 'DF turn right, CF fly-over, last leg 34.1 NM', what='ROYAN 6P cells')
    obloc = sid['groups'][2]['legs']
    c.eq((obloc[0]['kt'], obloc[1]['alt']), (220, {'type': 'min', 'ft': 5000}), 'speed 220 kt at BD423, min 5000 ft at BD427', what='OBLOC 6P')
    star = P.parse_code_table(rows('AD_2_LFBD_DATA_STAR_RWY_ALL_RNAV_CODE_01'))
    c.eq((star['kind'], star['runways'], len(star['groups'])), ('STAR', [], 6), 'six STAR for all runways', what='LFBD STAR')
    lmg = next(g for g in star['groups'] if g['label'] == 'LMG 2L')['legs']
    c.eq([l['id'] for l in lmg], ['LMG', 'MARRE', 'CHALA', 'BD001', 'BD002', 'VAGNA'], 'LMG 2L legs', what='STAR')
    c.eq((lmg[1]['alt'], lmg[5]['alt']), ({'type': 'between', 'ft': 20000, 'ft2': 24000}, {'type': 'between', 'ft': 5000, 'ft2': 12000}),
         'FL200-FL240, then 5000 ft-FL120', what='LMG 2L altitudes')
    app = P.parse_code_table(rows('AD_2_LFAV_DATA_RWY29_RNP_CODE'))
    c.eq((app['kind'], app['runways'], [g['label'] for g in app['groups']]), ('APP', ['29'], ['INA EXEKO', 'INA ERLED', 'INA VADEP', 'APCH']),
         'three initial transitions and the final approach', what='LFAV RNP 29')
    final = app['groups'][-1]['legs']
    rw = next(l for l in final if l['id'] == 'RW29')
    c.eq((rw['vpa'], rw['over']), (-3.0, True), '-3.0 degrees at the threshold, fly-over', what='RW29')
    c.ok(any('cap magnétique absent' in w for w in app['warnings']), f"warnings {app['warnings']}", 'the missing magnetic course of TF VADEP is reported, not guessed')
    c.eq(app['groups'][0]['legs'][1]['crs'], None, 'no magnetic course invented', what='TF VADEP')
    bd = P.parse_code_table(rows('AD_2_LFBD_DATA_RWY23_RNP_CODE'))
    c.eq([g['label'] for g in bd['groups']], ['INA ETPAR', 'INA VAGNA', 'INA LIBRU', 'INA DIRAX', 'APCH'], 'four transitions and the final approach', what='LFBD RNP 23')
    c.eq(bd['groups'][-1]['legs'][-1]['leg'], 'HM', 'the page ends with a holding entry', what='LFBD RNP 23')
    d1 = P.parse_data01(rows('AD_2_LFBD_DATA_01'))
    c.ok(abs(d1['BD001'][0] - 45.276694) < 1e-5 and abs(d1['BD001'][1] + 0.022250) < 1e-5, f"BD001 = {d1.get('BD001')}", "45°16'36.1'' N 000°01'20.1'' W")
    c.ok('ETPAR' not in d1, f'{sorted(d1)[:6]}', 'REF ENR fixes carry no coordinates here')
    d2 = P.parse_data01(rows('AD_2_LFAV_DATA_01'))
    c.ok(abs(d2['RW11'][0] - 50.327986) < 1e-5, f"RW11 = {d2.get('RW11')}", "50°19'40.75\" N")


@case('K3', 'eAIP aerodrome file', 'K', static=True, rule='aerodb SPEC 5 quinquies: proc/<cycle>/<ICAO>.json at the common schema, status check')
def k3(c):
    P, fx, rows = _eaip(c)
    names = [n + '.pdf' for n in _eaip_names(c, 'LFBD')]
    files = [n for n in names if '_LFBD_' in n] + ['AD_2_LFBD_SID_RWY23_RNAV.pdf', 'AD_2_LFBD_IAC_RWY23_FNA_ILS_LOC.pdf']
    known = {'ROYAN': (45.665, -1.04), 'CNA': (45.0, 1.0)}      # points fictifs ; ROYAN à 34,1 NM de BD927 comme la page l'imprime (le contrôle de géométrie est fait par le constructeur)
    doc = P.build_aerodrome('LFBD', files, lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-01', '2026-10-01', known.get)
    ids = [p['id'] for p in doc['procedures']]
    for want in ('LFBD.SID.ROYAN6P.RW23', 'LFBD.STAR.LMG2L.RWALL', 'LFBD.APP.RNPRWY23.RW23.ETPAR'):
        c.ok(want in ids, f'{ids}', f'{want} among the procedures')
    c.eq(len(ids), len(set(ids)), 'unique ids', what='procedure ids')
    p = next(p for p in doc['procedures'] if p['id'] == 'LFBD.SID.ROYAN6P.RW23')
    c.eq((p['status'], p['source']['kind'], p['source']['cycle'], p['kind'], p['runways']), ('check', 'eaip', '2026-10-01', 'SID', ['23']), 'status, source, cycle', what='ROYAN 6P')
    c.eq([q['id'] for q in p['points']], ['BD230', 'BD923', 'BD927', 'ROYAN'], 'ordered points', what='ROYAN 6P')
    c.ok(p['points'][0]['lat'] is not None and p['points'][3]['lat'] == 45.665, f"{p['points']}", 'BD230 from the DATA page, ROYAN from the base resolver')
    c.eq(p['points'][1]['turn'], 'R', 'DF turn right kept', what='BD923')
    app = next(q for q in doc['procedures'] if q['id'] == 'LFBD.APP.RNPRWY23.RW23.VAGNA')
    ids_pts = [q['id'] for q in app['points']]
    c.eq(ids_pts.count('IBD23'), 1, 'the shared fix of the initial and the final approach appears once', what='VAGNA transition')
    c.ok(app['points'][ids_pts.index('RW23') + 1].get('phase') == 'missed', f"{app['points']}", 'points after the threshold are the missed approach')
    kinds = {i['path'].rsplit('/', 1)[1]: i['kind'] for i in doc['charts']['items']}
    c.eq((kinds['AD_2_LFBD_SID_RWY23_RNAV.pdf'], kinds['AD_2_LFBD_IAC_RWY23_FNA_ILS_LOC.pdf'], kinds['AD_2_LFBD_DATA_01.pdf']), ('SID', 'IAC', 'DATA'),
         'chart kinds from the file names', what='charts')
    c.eq(doc['charts']['base'], 'https://example.org/AIRAC-2026-10-01/html/eAIP/', 'base of the chart addresses', what='charts.base')
    c.eq(P.vac_url('https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_01_OCT_2026/FRANCE/AIRAC-2026-10-01', 'LFBD'),
         'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_01_OCT_2026/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.LFBD.pdf', 'VAC address of the same disc', what='vac_url')
    c.eq(P.icao_list('<a href="FR-AD-2.LFBD-fr-FR.html#x">a</a> <a href="FR-AD-2.LFAV-fr-FR.html">b</a> <a href="FR-AD-2.LFBD-fr-FR.html">c</a> FR-AD-2.eAIP.html'),
         ['LFAV', 'LFBD'], 'airfields of the eAIP menu, once each, sorted', what='icao_list')
    sc = P.scan_rows([['AIP', 'AD 2 EGLL 1-1 SID', 'EG SID DEPARTURE', 'blah'], ['Procedure Path Terminator Waypoint Fly Over', 'AD 2.EGLL coding table SID RNAV'], ['nothing here']])
    c.eq([(n, ks) for n, _, ks in sc], [(1, ['SID']), (2, ['Path Terminator', 'Fly Over', 'Coding', 'SID', 'RNAV']), (3, [])], 'page scan: keywords per page, no content copied', what='scan_rows')
    cl = P.context_lines([['x'], ['Intro', 'The coding of the SID is by ARINC 424', 'Fly-by turns', 'plain']], [2])
    c.eq(cl, {2: ['The coding of the SID is by ARINC 424', 'Fly-by turns']}, 'context lines: only those with a coding word', what='context_lines')
    c.eq(P.format_rows(['a  b', 'c'], limit=1), ['  1 | a b', '... (1 ligne(s) de plus)'], 'page rows numbered, long pages cut', what='format_rows')
    # vérification du format des pages (user, 28 Oct : « il faudra prévoir une vérification du format des pages par script »)
    for name in ('AD_2_LFBD_DATA_SID_RWY23_RNAV_CODE_01', 'AD_2_LFBD_DATA_STAR_RWY_ALL_RNAV_CODE_01', 'AD_2_LFBD_DATA_RWY23_RNP_CODE', 'AD_2_LFAV_DATA_RWY11_RNP_CODE', 'AD_2_LFAV_DATA_RWY29_RNP_CODE'):
        rws = rows(name)
        ok, pb, fp, lay = P.verify_page(rws, P.parse_code_table(rws))
        c.ok(ok and lay == 'sia-code' and not pb, f'{name}: {ok} {lay} {fp} {pb}', 'every known page: recognised layout, known header fingerprint, all leg rows read')
    base = rows('AD_2_LFAV_DATA_RWY29_RNP_CODE')
    renamed = [r.replace('Terminator', 'Termination') for r in base]
    ok, pb, fp, lay = P.verify_page(renamed, P.parse_code_table(renamed))
    c.ok(ok and any(x.startswith('info: en-tête inconnu') for x in pb), f'{ok} {pb}', 'a reworded header is reported as unknown but does not block the page when the legs are still all read')
    widened = [re.sub(r'^((?:INA \S+ )?(?:IF|TF|DF|CF) \S+) ', r'\1 NEW ', r) for r in base]
    ok, pb, fp, lay = P.verify_page(widened, P.parse_code_table(widened))
    c.ok(not ok and any('moins de 85' in x for x in pb), f'{ok} {pb}', 'a column added to the table: the page is refused (less than 85 % of the leg rows read), nothing is guessed')
    nohead = [r for r in base if not re.search(r'Terminator|Leg sequence|Path|Waypoint', r)]
    c.ok(P.verify_page(nohead)[0] is False and P.detect_layout(nohead) is None, 'a page with no header was accepted', 'a page without its header is refused')
    doc2 = P.build_aerodrome('LFAV', ['AD_2_LFAV_DATA_RWY29_RNP_CODE.pdf', 'AD_2_LFAV_DATA_01.pdf'], lambda n: widened if 'RNP_CODE' in n else rows(n.replace('.pdf', '')),
                             'https://example.org/AIRAC-2026-10-01', '2026-10-01')
    c.ok(doc2['procedures'] == [] and doc2['formats'][0]['ok'] is False and any('NON lue' in w for w in doc2['warnings']), f"{doc2['formats']} {doc2['warnings']}",
         'in the aerodrome file a refused page gives no procedure, a "formats" entry with ok false and a "page NON lue" warning')
    idx = P.index_of({'LFBD': doc}, '2026-10-01')
    c.eq((idx['aerodromes']['LFBD']['SID'], idx['aerodromes']['LFBD']['STAR'], idx['aerodromes']['LFBD']['APP']), (4, 6, 4), 'counts per kind', what='index')


# ------------------------------------------------------------------------------------------------ FAA CIFP (static)
@case('K4', 'FAA CIFP reader', 'K', static=True, rule='aerodb DECISIONS 25 Oct 2026 (step 4): ARINC 424-18 records read as SID / STAR / approaches')
def k4(c):
    import importlib
    import json
    import sys
    import tempfile
    from pathlib import Path
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    C = importlib.import_module('proc_cifp')
    fx = c.root / 'frame/aerodb/test/fixtures/cifp/KSEA_subset.arinc'
    c.eq((C.airac_date('2610').isoformat(), C.airac_date('2601').isoformat()), ('2026-10-01', '2026-01-22'), 'AIRAC cycle to its effective date', what='airac_date')
    lat, lon = C.latlon('N47260734W122183462')
    c.ok(abs(lat - 47.435372) < 1e-5 and abs(lon + 122.309617) < 1e-5, f'{lat}, {lon}', "47°26'07.34\" N 122°18'34.62\" W")
    c.eq((C.altitude('04000'), C.altitude('FL180'), C.altitude('     ')), (4000, 18000, None), 'altitudes', what='altitude')
    docs, cycle = C.parse(l.rstrip('\r\n') for l in open(fx, encoding='latin-1'))
    c.eq(cycle, '2610', 'cycle read from the HDR01 record', what='cycle')
    procs = {p['id']: p for p in docs['KSEA']['procedures']}
    for want in ('KSEA.SID.BANGR9.RW16C', 'KSEA.SID.BANGR9.RWALL.ARRIE', 'KSEA.STAR.HAWKZ8.RW16B', 'KSEA.STAR.HAWKZ8.RWALL.BTG', 'KSEA.APP.I16C.RW16C',
                 'KSEA.APP.I16C.RW16C.GRIFY'):
        c.ok(want in procs, f'{sorted(procs)}', f'{want} among the procedures')
    sid = procs['KSEA.SID.BANGR9.RW16C']
    c.eq([p['id'] for p in sid['points']], [None, 'OTLIE', 'RENBE', 'RICHR', 'TOMRE', 'BANGR'], 'runway transition then common route; the VA leg kept without a fix (§ 10.20)', what='BANGR9 16C')
    va = sid['points'][0]
    c.eq((va['leg'], va['lat'], va['lon'], va.get('crs'), va['alt']), ('VA', None, None, 164.3, {'type': 'min', 'ft': 932}),
         'a leg without a fix has no position, its course and its altitude: the Map draws it along its course, never an invented point', what='VA leg')
    c.ok(all(p['lat'] is not None for p in sid['points'] if p['id']), f"{sid['points']}", 'every fix placed from the terminal waypoint records')
    c.eq((sid['points'][1]['leg'], sid['points'][2]['alt'], sid['status'], sid['source']['kind']), ('DF', {'type': 'min', 'ft': 3000}, 'official', 'cifp'),
         'DF then TF, at or above 3000 ft', what='BANGR9 16C legs')
    c.ok(all(p['phase'] == 'main' for p in sid['points']) and all(p['phase'] == 'trans' for p in procs['KSEA.SID.BANGR9.RWALL.ARRIE']['points']),
         f"{[(p['id'], p['phase']) for p in procs['KSEA.SID.BANGR9.RWALL.ARRIE']['points']]}", 'every leg has its phase: main for the runway and common route, trans for an enroute transition')
    c.eq(procs['KSEA.STAR.HAWKZ8.RW16B']['runways'], ['16L', '16R'], 'runway "B" (both) is the two parallel runways', what='HAWKZ8')
    app = procs['KSEA.APP.I16C.RW16C']
    c.eq((app['type'], app['runways']), ('ILS', ['16C']), 'ILS approach to 16C', what='I16C')
    rw = next(p for p in app['points'] if p['id'] == 'RW16C')
    c.eq((rw['alt'], rw['vpa'], rw['lat'] is not None), ({'type': 'at', 'ft': 484}, -3.0, True), 'threshold at 484 ft, -3 degrees, placed', what='RW16C')
    after = app['points'][[p['id'] for p in app['points']].index('RW16C') + 1:]
    c.ok(after and all(p.get('phase') == 'missed' for p in after) and all(p.get('phase') == 'main' for p in app['points'][:app['points'].index(rw) + 1]),
         f"{[(p['id'], p.get('phase')) for p in app['points']]}", 'the legs after the missed-approach point are "missed", main before')
    tr = procs['KSEA.APP.I16C.RW16C.GRIFY']
    c.eq(([p['id'] for p in tr['points']][:3], tr['points'][0].get('kt'), [p['id'] for p in tr['points']].count('MGNUM')), (['GRIFY', 'MGNUM', 'ANVIL'], 210, 1),
         'transition joined to the final approach, the shared fix once, speed 210 kt at the IAF', what='GRIFY transition')
    c.eq([p['phase'] for p in tr['points']][:3], ['trans', 'trans', 'main'], "an approach's transition legs are trans, then the final approach is main", what='GRIFY phases')
    # runways from the PG records (§ 10.20: runways(icao)) and an RF leg's arc (centre fix and radius, ARINC 5.144 / 5.204)
    c.eq(docs['KSEA']['runways'], [{'id': '16C', 'lat': 47.463811, 'lon': -122.310983, 'elev': 429, 'qfu': 164.0, 'displaced': 0, 'length': 9426, 'width': 150,
                                   'source': 'cifp'}], 'the runway record: threshold, elevation, magnetic bearing, displaced threshold, length and width', what='runways')
    lines = [l.rstrip('\r\n') for l in open(fx, encoding='latin-1')]
    k = next(i for i, l in enumerate(lines) if l[4] == 'P' and l[12] == 'D' and l[13:19].strip() == 'BANGR9' and l[47:49] == 'TF')
    l = lines[k]
    lines[k] = l[:47] + 'RF' + l[49:56] + '002500' + l[62:106] + 'OTLIE' + l[111] + 'K1' + 'PC' + l[116:]
    rf = next(p for p in C.parse(lines)[0]['KSEA']['procedures'] if any(q['leg'] == 'RF' for q in p['points']))
    arc = next(q['arc'] for q in rf['points'] if q['leg'] == 'RF')
    c.ok(arc['centre']['id'] == 'OTLIE' and arc['radius'] == 2.5 and arc['centre']['lat'] is not None, f'{arc}', 'an RF leg carries its arc: centre placed, radius 2.5 NM')
    c.ok(any('sans point' in w for w in docs['KSEA']['warnings']), f"{docs['KSEA']['warnings']}", 'legs without a fix are counted, not silently dropped')
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / 'proc'
        (out / '2026-10-01').mkdir(parents=True)
        (out / '2026-10-01' / 'index.json').write_text(json.dumps({'schema': 1, 'cycle': '2026-10-01', 'aerodromes': {'LFBD': {'SID': 1}}}))
        C.main([str(fx), '--out', str(out)])
        doc = json.loads((out / '2026-10-01' / 'KSEA.json').read_text(encoding='utf-8'))
        idx = json.loads((out / '2026-10-01' / 'index.json').read_text(encoding='utf-8'))
        c.ok(doc['cycle'] == '2026-10-01' and 'tel quel' in doc['notice'], f"{doc.get('notice')}", 'the file carries the FAA warranty notice')
        c.eq([r['id'] for r in doc.get('runways', [])], ['16C'], 'the aerodrome file carries its runways', what='runways written')
        c.eq((sorted(idx['aerodromes']), idx['aerodromes']['KSEA']['SID']), (['KSEA', 'LFBD'], 8), 'the cycle index keeps (BANGR9: six runway records and two enroute transitions) the other sources and adds KSEA', what='index')


# ------------------------------------------------------------------------------------------------ EAD Basic probe (static)
@case('K6', 'EAD Basic probe', 'K', static=True, rule='aerodb DECISIONS 26 Oct 2026: a read-only probe that never keeps nor shows a credential')
def k5(c):
    import importlib
    import http.server
    import os
    import sys
    import tempfile
    import threading
    import urllib.parse
    import contextlib
    import io
    from pathlib import Path
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    html_ = ('<form id="f" action="/lib.faces;jsessionid=ABCDEF123" method="post"><input type="hidden" name="javax.faces.ViewState" value="' + 'A' * 50 + '"/>'
             '<select name="auth"><option value="1">Belgium</option><option value="2">United Kingdom</option></select>'
             '<select name="part"><option value="a">AD</option><option value="e">ENR</option><option value="g">GEN</option></select>'
             '<button id="f:go" name="f:go" type="submit">Search</button></form>')
    # the HTML above is hand-built to test the reading helpers; it says nothing about the real EAD Basic screens
    E = importlib.import_module('proc_ead')
    EP = importlib.import_module('ead_probe')           # the probe (V3 § 10.29 (b)): it reads the site address and the session from proc_ead, reloaded below with EAD_PROBE_HOST
    f = E.parse_forms(html_)[0]
    c.eq((f['id'], sorted(f['selects']), f['buttons'][0]['id'], E.pick(f['selects']['auth'], 'United Kingdom')), ('f', ['auth', 'part'], 'f:go', '2'),
         'form, lists, button and the option picked by label', what='parse_forms')
    clean = E.sanitize('user=bob mail a@b.fr jsessionid=QWE ViewState value="x" ' + 'A' * 45 + ' pw=hunter22', ['bob', 'hunter22'])
    c.ok(all(x not in clean for x in ('bob', 'hunter22', 'a@b.fr', 'QWE', 'A' * 45)), clean, 'no secret, mail, session or token survives sanitize')
    import html as html_mod
    import urllib.parse
    pw = 'p@ss&w<rd"x'
    forms = [urllib.parse.quote(pw), urllib.parse.quote(pw, safe=''), urllib.parse.quote_plus(pw), html_mod.escape(pw), html_mod.escape(pw, quote=False)]
    clean = E.sanitize(' | '.join(['echo'] + forms + [pw]), [pw])
    c.ok(all(x not in clean for x in forms + [pw]), clean, 'the URL-encoded and HTML-escaped forms of a secret are removed too (security review of 28 Oct 2026)')
    c.eq((E.login_result('{"loggedIn":true}')[0], E.login_result('{"loggedIn":false,"errorMessage":"x"}'), E.login_result('x')[0]), (True, (False, 'x'), False),
         'login answers read, never raising', what='login_result')
    # the real login answer met by the owner's probe (28 Oct 2026): a JSON string holding the object (encoded twice)
    import json
    c.eq((E.login_result(json.dumps('{"loggedIn":true}')), E.login_result('[1, 2]')[0], E.login_result('<html>maintenance</html>')),
         ((True, ''), False, (False, 'réponse non JSON: <html>maintenance</html>')),
         'JSON encoded twice is read again; another JSON value is an unexpected answer; a non-JSON answer shows its beginning', what='login_result (encoded twice)')
    # the whole flow against a local fake that follows the shapes read on the public login page (POST /fwf-eadbasic/ajaxlogin/ajax_security_check.jspx
    # answering JSON) and a hand-built library: it checks the probe's own logic, not the real site
    pages = {}
    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass
        def _send(self, body, ctype='text/html'):
            b = body.encode()
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(b)))
            self.end_headers()
            self.wfile.write(b)
        def do_GET(self):
            if self.path.startswith('/cms-eadbasic/opencms/en/login/ead-basic/'):
                self._send('<form id="ajaxLoginForm"><input name="j_username"><input name="j_password" type="password"></form>')
            elif self.path.startswith('/fwf-eadbasic/public/static/home.faces'):
                self._send('<a href="/fwf-eadbasic/secure/aip.faces;jsessionid=ZZZ">AIP Library</a><a href="/x">Other</a> hello bob@example.org')
            elif self.path == '/redir':
                self.send_response(302)
                self.send_header('Location', 'https://example.invalid/steal')
                self.end_headers()
            elif self.path.startswith('/fwf-eadbasic/secure/aip.faces'):
                self._send('<form id="mainForm" action="/fwf-eadbasic/secure/aip.faces" method="post"><input type="hidden" name="javax.faces.ViewState" value="' + 'A' * 50 + '"/>'
                           '<select name="mainForm:auth"><option value="1">Belgium</option><option value="2">United Kingdom</option></select>'
                           '<select name="mainForm:part"><option value="a">AD</option><option value="e">ENR</option><option value="g">GEN</option></select>'
                           '<input type="checkbox" id="mainForm:enableAdvancedSearch_input" name="mainForm:enableAdvancedSearch_input"/>'
                           '<button id="mainForm:search" name="mainForm:search" type="submit">Search</button></form>')
            elif self.path.startswith('/doc/'):
                self._send('%PDF-1.4 hand-built for the test', 'application/pdf')
            else:
                self.send_error(404)
        def do_POST(self):
            n = int(self.headers.get('Content-Length') or 0)
            body = self.rfile.read(n).decode()
            pages['last'] = body
            if self.path.endswith('ajax_security_check.jspx'):
                ok = 'j_password=secret%21pw' in body
                self._send('{"loggedIn": %s, "errorMessage": "bad login"}' % ('true' if ok else 'false'), 'application/json')
            else:
                # écran de bibliothèque BÂTI À LA MAIN d'après la description de l'utilisateur (recherche avancée, nom de document, bouton par ligne) ;
                # les formes JSF ne sont pas celles du vrai site, elles servent à essayer la logique de la sonde
                q = urllib.parse.parse_qs(body)
                name = (q.get('mainForm:docName') or [''])[0]
                if 'mainForm:dl0' in q:
                    self._send('%PDF-1.4 hand-built for the test', 'application/pdf')
                    return
                head = '<?xml version="1.0"?><partial-response><changes>'
                tail = '<update id="j_id1:javax.faces.ViewState:0"><![CDATA[123456789:987654321]]></update></changes></partial-response>'
                if q.get('javax.faces.source') == ['mainForm:enableAdvancedSearch']:
                    self._send(head + '<update id="mainForm:adv"><![CDATA[<label for="mainForm:docDate">Effective Date</label><input id="mainForm:docDate" name="mainForm:docDate" type="text" value=""/>'
                               '<label for="mainForm:docName">Document Name</label><input id="mainForm:docName" name="mainForm:docName" type="text" value=""/>'
                               '<label for="mainForm:docHead">Document Heading</label><input id="mainForm:docHead" name="mainForm:docHead" type="text" value=""/>]]></update>' + tail, 'text/xml')
                    return
                docs = ['EG_AD_2_EGLL_6-1_en.pdf', 'EG_AD_2_EGLL_7-1_en.pdf', 'EG_AD_2_EGKK_6-1_en.pdf']
                pick = [d for d in docs if name in d] if name else docs      # « contient » : ce que le vrai champ fait est précisément ce que la sonde doit apprendre
                if name and q.get('javax.faces.partial.execute') == ['mainForm']:
                    pick = []                                                # un premier type de requête qui ne rend rien : la sonde doit en essayer un autre
                rows = ''.join('<tr data-ri="%d"><td>2026-01-22</td><td>%s</td><td></td><td>NON-AIRAC</td><td>AD 2 chart %d</td><td><button id="mainForm:results:%d:dl" name="mainForm:dl0" type="submit">▶</button></td></tr>' % (i, d, i, i)
                               for i, d in enumerate(pick))
                layout = '<table><tbody><tr><td>Albania (LA)</td></tr><tr><td>Belgium (EB)</td></tr></tbody></table>'      # tableaux de mise en page : ne sont pas des résultats
                self._send(head + '<update id="mainForm:results"><![CDATA[' + layout + '<table><tbody id="mainForm:searchResults_data" class="ui-datatable-data">' + rows + '</tbody></table>'
                           '<div>Number of search results: %d</div><span class="ui-paginator-current">Page 1 of 1</span>]]></update>' % len(pick) + tail, 'text/xml')
    srv = http.server.HTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        env = dict(os.environ)
        os.environ['EAD_PROBE_HOST'] = f'http://127.0.0.1:{srv.server_port}'
        importlib.reload(E)
        with tempfile.TemporaryDirectory() as td:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                EP.probe('bob', 'secret!pw', 'United Kingdom', 'EGLL', td, name='EG_AD_2_EGLL')
            rep = (Path(td) / 'report.txt').read_text(encoding='utf-8')
            allfiles = '\n'.join(p.read_text(encoding='utf-8') for p in Path(td).iterdir())
            c.ok('connexion: OUI' in rep and 'bibliothèque AIP' in rep, rep, 'login and library found')
            c.ok('recherche (État + partie AD): 200' in rep and '3 ligne(s) de résultats | nombre annoncé: 3' in rep and "paginateur: ['Page 1 of 1']" in rep, rep,
                 'the plain search read three result rows (the layout tables are not counted) and the announced number')
            c.ok("champ « Document Name »: mainForm:docName" in rep and 'nom « EG_AD_2_EGLL »' in rep and '2 ligne(s) de résultats' in rep, rep,
                 'the advanced box opened the fields, Document Name found by its label, two rows for the prefix')
            c.ok('variante ciblée, tout le formulaire -> 0 ligne(s)' in rep and 'variante formulaire (execute @form, render @all) -> 2 ligne(s)' in rep, rep,
                 'the first request shape finds nothing, the second one finds the two rows, and the probe keeps it')
            c.ok('« contient »' in rep, rep, 'the probe says whether the name field is "contains" or "starts with"')
            c.ok("{'mainForm:auth': 'État', 'mainForm:part': 'partie'}" in rep, rep, 'the State and the AD part were chosen in the lists')
            c.ok(all(x not in allfiles for x in ('secret!pw', 'bob@example.org', 'ZZZ', 'A' * 45, '123456789:987654321')) and 'bob' not in allfiles.lower().replace('bob@', ''),
                 allfiles[:400], 'no password, mail, session id or state token in any file written')
            c.ok(not list(Path(td).rglob('*.pdf')), 'a pdf was written', 'no PDF without --download')
        with tempfile.TemporaryDirectory() as td:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                EP.probe('bob', 'secret!pw', 'United Kingdom', 'EGLL', td, name='EG_AD_2_EGLL', download=True)
            rep = (Path(td) / 'report.txt').read_text(encoding='utf-8')
            pdfs = list((Path(td) / 'cache').glob('*.pdf'))
            c.ok('| PDF' in rep and len(pdfs) == 1 and pdfs[0].read_bytes().startswith(b'%PDF-'), rep, 'with --download, exactly one PDF, in cache/')
        with tempfile.TemporaryDirectory() as td:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                EP.probe('bob', 'secret!pw', 'United Kingdom', 'EGLL', td, name='EG_AD_2_EGLL_6-1_en.pdf', docs=['EG_AD_2_EGLL_6-1_en.pdf', 'EG_AD_2_EGLL_7-1_en.pdf'])
            names = sorted(p.name for p in (Path(td) / 'cache').glob('*.pdf'))
            c.eq(names, ['EG_AD_2_EGLL_6-1_en.pdf', 'EG_AD_2_EGLL_7-1_en.pdf'], 'with --docs, one PDF per exact name asked, named after it (no doubled extension)', what='docs')
    finally:
        srv.shutdown()
        os.environ.clear()
        os.environ.update(env)
        importlib.reload(E)


# ------------------------------------------------------------------------------------------------ EAD Basic library: survey and per-aerodrome fetch (static)
@case('K12', 'EAD Basic library, survey and fetch', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: per-State survey and on-demand per-aerodrome fetch, never guessing a format')
def k12(c):
    import importlib
    import http.server
    import os
    import sys
    import tempfile
    import threading
    import urllib.parse
    import json
    from pathlib import Path
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    docs = {'EG': ['EG_AD_2_EGLL_7-13_en.pdf', 'EG_AD_2_EGLL_5-1_en.pdf'], 'EB': [], 'LF': ['LF_AD_2_LFPG_STAR_en.pdf']}
    heads = {'CODING': 'Instrument Approach Procedure Coding Tables', 'DEPARTURE': 'Standard Departure Chart', 'ARRIVAL': 'Standard Arrival Chart', 'APPROACH': 'Approach Chart'}

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass
        def _send(self, body, ctype='text/html'):
            b = body if isinstance(body, bytes) else body.encode()
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(b)))
            self.end_headers()
            self.wfile.write(b)
        def do_GET(self):
            if self.path.startswith('/cms-eadbasic/opencms/en/login/ead-basic/'):
                self._send('<form id="ajaxLoginForm"></form>')
            elif self.path.startswith('/fwf-eadbasic/public/static/home.faces'):
                self._send('<a href="/fwf-eadbasic/secure/aip.faces">AIP Library</a>')
            elif self.path.startswith('/fwf-eadbasic/secure/aip.faces'):
                self._send('<form id="mainForm" action="/fwf-eadbasic/secure/aip.faces" method="post"><input type="hidden" name="javax.faces.ViewState" value="' + 'A' * 50 + '"/>'
                           '<select name="mainForm:AuthorityCode"><option value="1">Belgium (EB)</option><option value="2">United Kingdom (EG)</option><option value="3">France (LF)</option><option value="4">Paged State (ZP)</option><option value="5">Failing pager (ZQ)</option></select>'
                           '<select name="mainForm:AipPart"><option value="a">AD</option><option value="e">ENR</option></select>'
                           '<select name="mainForm:AipType"><option value="p">AIP</option><option value="c">Charts</option></select>'
                           '<input type="checkbox" id="mainForm:enableAdvancedSearch_input" name="mainForm:enableAdvancedSearch_input"/>'
                           '<button id="mainForm:search" name="mainForm:search" type="submit">Search</button></form>')
            elif self.path.startswith('/doc/'):
                self._send('%PDF-1.4 hand-built, not a readable document', 'application/pdf')
            else:
                self.send_error(404)
        def do_POST(self):
            q = urllib.parse.parse_qs(self.rfile.read(int(self.headers.get('Content-Length') or 0)).decode())
            if self.path.endswith('ajax_security_check.jspx'):
                self._send('{"loggedIn": true}', 'application/json')
                return
            head = '<?xml version="1.0"?><partial-response><changes>'
            tail = '<update id="j_id1:javax.faces.ViewState:0"><![CDATA[1:2]]></update></changes></partial-response>'
            if q.get('javax.faces.source') == ['mainForm:enableAdvancedSearch']:
                self._send(head + '<update id="mainForm:adv"><![CDATA[<label for="mainForm:docName">Document Name</label><input id="mainForm:docName" name="mainForm:docName" type="text"/>'
                           '<label for="mainForm:docHead">Document Heading</label><input id="mainForm:docHead" name="mainForm:docHead" type="text"/>]]></update>' + tail, 'text/xml')
                return
            if q.get('javax.faces.source') == ['mainForm:AuthorityCode']:
                self._send(head + tail, 'text/xml')
                return
            state = {'2': 'EG', '3': 'LF', '4': 'ZP', '5': 'ZQ'}.get((q.get('mainForm:AuthorityCode') or [''])[0], 'EB')
            if state in ('ZP', 'ZQ'):                      # a result set of 20 documents shown 15 per page (PrimeFaces paging: _pagination, _first, _rows)
                every = ['%s_AD_2_%sAA_%02d_en.pdf' % (state, state, i) for i in range(20)]
                every = [d for d in every if (q.get('mainForm:docName') or [''])[0] in d] if (q.get('mainForm:AipType') == ['c'] and (q.get('mainForm:docHead') or [''])[0] == 'CODING') else []
                paged = q.get('mainForm:searchResults_pagination') == ['true']
                if paged and (q.get('javax.faces.source') != ['mainForm:searchResults'] or q.get('mainForm:searchResults_rows') != ['15'] or q.get('mainForm:searchResults') != ['mainForm:searchResults']):
                    self._send(head + '<error><error-name>bad paging request</error-name></error></partial-response>', 'text/xml')
                    return
                if paged and state == 'ZQ':
                    self._send(head + '<error><error-name>view expired</error-name></error></partial-response>', 'text/xml')
                    return
                first = int((q.get('mainForm:searchResults_first') or ['0'])[0]) if paged else 0
                rows = ''.join('<tr data-ri="%d" data-rk="k%d" class="ui-widget-content ui-datatable-odd" role="row"><td>2026-01-22</td><td><a href="/doc/%s">%s</a></td><td>%s</td></tr>' % (first + i, first + i, d, d, heads['CODING']) for i, d in enumerate(every[first:first + 15]))
                count = '' if paged else '<div>Number of search results: %d</div>' % len(every)
                self._send(head + (('<update id="mainForm:searchResults"><![CDATA[' + rows + ']]></update>') if paged else           # a paging answer: bare rows, no table (PrimeFaces _skipChildren)
                                  ('<update id="mainForm:results"><![CDATA[<table><tbody id="mainForm:searchResults_data">' + rows + '</tbody></table>' + count + ']]></update>')) + tail, 'text/xml')
                return
            name, hd = (q.get('mainForm:docName') or [''])[0], (q.get('mainForm:docHead') or [''])[0]
            pick = docs[state] if (q.get('mainForm:AipType') == ['c']) else []
            pick = [d for d in pick if name in d]
            if state == 'LF':                              # State with French headings: case-insensitive "contains" on the heading
                pick = [d for d in pick if hd.lower() in 'carte d arrivee star rnav']
                rows = ''.join('<tr data-ri="%d"><td>2026-01-22</td><td><a href="/doc/%s">%s</a></td><td>CARTE D ARRIVEE STAR RNAV</td></tr>' % (i, d, d) for i, d in enumerate(pick))
                self._send(head + '<update id="mainForm:results"><![CDATA[<table><tbody id="mainForm:searchResults_data">' + rows + '</tbody></table><div>Number of search results: %d</div>]]></update>' % len(pick) + tail, 'text/xml')
                return
            if hd:
                pick = [d for d in pick if (hd == 'CODING') == ('7-13' in d) and hd in heads and (hd == 'CODING' or 'Chart' in heads[hd] and False)]
            rows = ''.join('<tr data-ri="%d"><td>2026-01-22</td><td><a href="/doc/%s">%s</a></td><td>%s</td></tr>' % (i, d, d, heads['CODING'] if '7-13' in d else 'Other') for i, d in enumerate(pick))
            self._send(head + '<update id="mainForm:results"><![CDATA[<table><tbody id="mainForm:searchResults_data">' + rows + '</tbody></table><div>Number of search results: %d</div>]]></update>' % len(pick) + tail, 'text/xml')

    srv = http.server.HTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    env = dict(os.environ)
    try:
        os.environ['EAD_PROBE_HOST'] = f'http://127.0.0.1:{srv.server_port}'
        E = importlib.import_module('proc_ead')
        importlib.reload(E)
        lines = []
        r_, n_, m_ = E.result_info('<partial-response><changes><update id="a"><![CDATA[<table><tbody id="x:searchResults_data"><tr><td>No data found.</td></tr></tbody></table>]]></update>'
                                   '<update id="b"><![CDATA[<table><tbody id="y:searchResults_data"><tr><td>EB_AD_2_EBBE_1_en.pdf</td></tr></tbody></table><div>Number of search results: 1</div>]]></update></changes></partial-response>')
        c.eq((len(r_), n_), (1, 1), 'the empty-table message row is not a result', what='result_info')
        # security review of 28 Oct 2026: at least one second between two requests, ICAO codes checked before they name a file
        c.eq((E.EadLibrary('bob', 'secret', delay=0).delay, E.EadLibrary('bob', 'secret', delay=3).delay), (1.0, 3.0), 'the delay never goes under 1 s', what='delay floor')
        bad_codes = []
        for code in ('../x', 'EG LL', 'EGLLX', ''):
            try:
                E.icao_code(code)
            except SystemExit:
                bad_codes.append(code)
        c.eq((bad_codes, E.icao_code(' egll ')), (['../x', 'EG LL', 'EGLLX', ''], 'EGLL'), 'an ICAO code is 4 letters or digits, never a path', what='icao_code')
        E.MIN_DELAY = 0.0                                                     # the fake answers at once: no pause in the test (the module's value is 1 s)
        lib = E.EadLibrary('bob', 'secret', lambda *x: lines.append(' '.join(str(i) for i in x)))
        c.ok(lib.open(), '\n'.join(lines), 'the library opens (login, AIP Library link, advanced search, name and heading fields)')
        c.ok(lib.authority('EG') and not lib.authority('ZZ'), 'authority', 'a State is chosen by its ICAO prefix; an unknown one is refused')
        with tempfile.TemporaryDirectory() as td:
            res = E.survey(lib, ['EG', 'EB', 'LF', 'ZZ'], td, lambda *x: None)
            by = {r['state']: r for r in res}
            c.ok(by['EG']['CODING'] == 1 and by['EB']['CODING'] == 0 and 'error' in by['ZZ'], json.dumps(res)[:300], 'survey: counts per State, an absent State reported as such')
            c.ok((Path(td) / 'survey.txt').read_text(encoding='utf-8').count('\n') == 4, 'survey.txt', 'survey.txt has one line per State')
            lf = by['LF']
            c.ok(lf['CODING'] == 0 and lf['SID'] == 0 and lf['alt_keys'].get('STAR') == 1 and lf['alt_keys'].get('ARRIVEE') == 1 and lf['alt_keys'].get('SID') == 0 and lf['sample_alt'],
                 json.dumps(lf)[:300], 'survey: a State with French headings gets the alternative keywords counted')
            c.ok((lf.get('document') or {}).get('name') == 'LF_AD_2_LFPG_STAR_en.pdf' and lf['sample_any'], json.dumps(lf)[:300],
                 'survey: the document is picked from the first non-empty alternative keyword; sample_any lists the State vocabulary')
            c.ok(lf['document'].get('rows_head') == [] and 'alt_keys' not in by['EG'], json.dumps(lf.get('document'))[:200],
                 'survey: rows_head is [] for an unreadable document; no alternative keywords when the English ones answer')
            doc = by['EG'].get('document') or {}
            c.ok(doc.get('name') == 'EG_AD_2_EGLL_7-13_en.pdf' and ('kind' in doc or 'error' in doc), str(doc), 'one coding document is downloaded and classified (or its failure reported)')
        with tempfile.TemporaryDirectory() as td:                             # survey.json / survey.txt are written sanitised, like the report
            real = E.survey_state
            E.survey_state = lambda lib_, st, cache, say: {'state': st, 'document': {'name': 'bob secret', 'kind': 'text'}}
            try:
                E.survey(lib, ['EG'], td, lambda *x: None)
            finally:
                E.survey_state = real
            both = (Path(td) / 'survey.json').read_text(encoding='utf-8') + (Path(td) / 'survey.txt').read_text(encoding='utf-8')
            c.ok('secret' not in both.replace('<secret>', '') and 'bob' not in both, both[:200], 'the survey files carry neither the user name nor the password')
        with tempfile.TemporaryDirectory() as td:
            O = importlib.import_module('proc_ocr')
            real_backend, said = O.backend, []
            O.backend = lambda: None                      # sans moteur d'OCR : le message d'installation, et on continue
            steps = []
            try:
                out = E.fetch_ad(lib, 'EGLL', td, said.append, step=lambda *a: steps.append(a))
            finally:
                O.backend = real_backend
            got = [(x[1:]) for x in steps]
            c.ok(got[:4] == [(0, 4, 'recherches'), (1, 4, 'recherches'), (2, 4, 'recherches'), (3, 4, 'recherches')] and (0, 1, 'documents') in got and sum(x[3] == 'documents' for x in steps) >= 3,
                 str(steps), 'fetch: the steps carry numbers (4 searches, then the documents downloaded, read and analysed, i of n) for the progress bar')
            c.ok(any('OCR absent' in x and 'rapidocr-onnxruntime' in x for x in said) and not (Path(td) / 'EGLL.ocr.json').exists(), '\n'.join(said),
                 'fetch: an unreadable (vector or image) document with no OCR engine prints the install message and goes on; no .ocr.json is written')
            f = json.loads((Path(td) / 'EGLL.json').read_text(encoding='utf-8'))
            c.ok(f['procedures'] == [] and f['formats'] and not f['formats'][0]['ok'] and f['documents'], json.dumps(f)[:300], 'fetch: an unreadable document yields no procedure, a format problem, and the list of documents; nothing is guessed')
            c.ok((Path(td) / 'cache' / 'EGLL' / 'EG_AD_2_EGLL_7-13_en.pdf').is_file(), 'cache', 'the document is kept in the local cache')
            c.ok('NON OPÉRATIONNELLES' in (f.get('notice') or '') and 'EAD Basic' in f['notice'], f.get('notice'), "a file read through EAD Basic says it is not operational (user's decision, 28 Oct 2026)")
        # pagination: 20 results at 15 per page: every page is walked (the second page is a PrimeFaces paging request), the ATTENTION message stays only when the walk stopped early
        with tempfile.TemporaryDirectory() as td:
            said = []
            O = importlib.import_module('proc_ocr')
            real_backend = O.backend
            O.backend = lambda: None
            try:
                out = E.fetch_ad(lib, 'ZPAA', td, said.append)
            finally:
                O.backend = real_backend
            c.ok(len(out['documents']) == 20 and any('CODING: 20 document(s) en 2 pages' in x for x in said) and not any('ATTENTION' in x for x in said), '\n'.join(said)[:600],
                 'fetch: a result set of 20 documents (15 per page) is read in full, over two pages, with no ATTENTION message')
            c.ok(sum('pagination (noms de paramètres non vus' in x for x in lines) == 1 and 'mainForm:searchResults_first' in ''.join(lines) and max(len(x) for x in lines if x.startswith('pagination')) < 500 and 'mises à jour' in ''.join(lines), '\n'.join(lines)[-600:],
                 'the first paging request prints, once, the parameters sent and the anatomy of the answer')
        lib.authority('ZQ')
        lib.choose('part', 'AD')
        lib.choose('type', 'Charts')
        bad_page = lib.search(name='AD_2_ZQAA_', heading='CODING', all_pages=True)
        c.ok(len(bad_page['rows']) == 15 and bad_page['count'] == 20 and '15 ligne(s) lue(s) sur 20' in bad_page['warning'], str(bad_page['warning']),
             'a page that answers with an error stops the walk with a warning naming the rows read (15 of 20); no loop')
        lib.authority('EG')
        refused = ''
        try:
            E.main(['--fetch', 'EGLL,EGKK'])
        except SystemExit as e:
            refused = str(e)
        c.ok('un seul terrain' in refused, refused or 'accepted', '--fetch reads one aerodrome per call, never several')
    finally:
        srv.shutdown()
        os.environ.clear()
        os.environ.update(env)
        importlib.reload(importlib.import_module('proc_ead'))


# ------------------------------------------------------------------------------------------------ German route description page (static)
@case('K15', 'German SID/STAR route description page (no co-ordinates)', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: one layout per State, counts checked, nothing guessed; co-ordinates resolved by aerodb')
def k15(c):
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()

    rows = ['AD 2 EDXX 3-1-2 TESTBUCH', '01 JAN 2026 AIP TESTLAND', 'TESTBURG AIRPORT STANDARD INSTRUMENT ARRIVAL ROUTES', 'RWY 09/27 (STAR)', 'General Remarks',
            '1 NOT TO BE USED DURING TESTS.',
            'Designator IdentificationSignificant Points MagTrack° Distance(NM) Minimum Altitude /Flight Level Procedure Remarks /Procedure Timesheet', '12 3 4 5 6',
            'AAAAA 1T AAAAA ONE TANGO', '/L50773 AAAAA', '101 12 A4000+', '/L50773 Testburg NDB',
            'BBBB 2T BBBB TWO TANGO', '/L50773 BBBB', '202 8.5 FL100-', 'CCC', '305 20 A6000', '/L50773 Testburg NDB',
            'DDD 3T DDD THREE TANGO', 'DDD', '045 15 A3000+', 'EEE', 'AMDT 01/26 © TEST']
    c.eq(P.detect_layout(rows), 'de-route', 'the page is recognised before the generic coding-table layout', what='detect_layout')
    r = P.parse_de_route(rows)
    c.eq(([t['name'] for t in r['tables']], r['kind'], r['tables'][0]['runways'] if r['tables'] else None), (['AAAAA 1T', 'BBBB 2T', 'DDD 3T'], 'STAR', ['09', '27']), 'three routes, kind from the title, runways from « RWY 09/27 »', what='tables')
    t1 = r['tables'][1]
    c.eq(([lg['id'] for lg in t1['legs']], [lg['leg'] for lg in t1['legs']], [lg['crs'] for lg in t1['legs']], [lg['nm'] for lg in t1['legs']]),
         (['BBBB', 'CCC', 'Testburg NDB'], ['IF', 'TF', 'TF'], [None, 202, 305], [None, 8.5, 20.0]), 'fixes (junk token optional, navaid kept as printed), legs, tracks and distances', what='legs')
    c.eq(([lg['alt'] for lg in t1['legs']], t1['legs'][2]['navaid'], t1['legs'][0]['lat']), ([None, {'type': 'max', 'ft': 10000}, {'type': 'at', 'ft': 6000}], 'NDB', None), 'constraints (FL100- maximum, A6000 at), navaid type noted, no co-ordinates', what='constraints')
    c.eq(len(r['warnings']), 0, 'no warning on a consistent page', what='warnings')
    bad = P.parse_de_route([x for x in rows if x != '305 20 A6000'])
    c.eq(([t['name'] for t in bad['tables']], sum('comptes incohérents, table NON retenue' in x for x in bad['warnings'])), (['AAAAA 1T', 'DDD 3T'], 1), 'a block with a missing leg line is rejected and reported, never completed', what='missing leg')
    recs, w = P.records_uk_app('EDXX', r, 'f.pdf', '2026-01-01', None, 'DE')
    c.ok(len(recs) == 3 and all(p['status'] == 'check' for p in recs) and recs[1]['points'][0]['lat'] is None and recs[1]['points'][1]['crs'] == 202 and recs[1]['points'][1]['nm'] == 8.5,
         str(recs[:1]), 'records keep the points without co-ordinates, with course and distance, status check')
    c.eq(sum('coordonnées absentes de la page' in x for x in w), 3, 'one co-ordinates warning per table', what='coords warning')
    d = P.build_pdf_dir('EDXX', ['p.pdf'], lambda f: [rows], '2026-01-01')
    c.ok(d['formats'][0]['ok'] and d['formats'][0]['layout'] == 'de-route' and len(d['procedures']) == 3, str(d['formats'][0]), 'build_pdf_dir reads the page: format ok, three procedures')

    # relatives of the German layout: Moldova (leg values on the departing point's row, role rows), Portugal (designator after its first point, numbers after the remark), Poland
    lu = ['AD 2 LUXX 3-2-2 AIP TESTLAND', 'STANDARD ARRIVAL CHART – TESTBURG (LUXX)', 'INSTRUMENT (STAR) RNAV RWY 07', 'Identification Significant Points Mag Track True Track Dist NM MNM Altitude FT',
          'Designator Remarks', 'AAAAA1B AAAAA ONE BRAVO', '/g85 AAAAA 001° 008.4° 26.9 4000', '/g85 IAF BM301', 'BBBBB1B BBBBB ONE BRAVO', '/g83 /g83 BBBBB 357° 004.3° 37.6 3000',
          '/g85 IF/IAF BM304', '25 DEC 2025 Authority AIRAC AMDT 006/2025']
    c.eq(P.detect_layout(lu), 'de-route', 'a Moldovan-like page is recognised as a route table without co-ordinates', what='LU detect_layout')
    r = P.parse_de_route(lu)
    c.eq(([t['name'] for t in r['tables']], r['kind'], r['tables'][0]['runways'], [lg['id'] for lg in r['tables'][1]['legs']], len(r['warnings'])),
         (['AAAAA 1B', 'BBBBB 1B'], 'STAR', ['07'], ['BBBBB', 'BM304'], 0), 'LU-like: two blocks, glyph tokens and IF/IAF role words ignored, kind from the title', what='LU tables')
    lg = r['tables'][0]['legs'][1]
    c.eq((lg['crs'], lg['true'], lg['nm'], lg['alt'], lg['lat']), (1, 8.4, 26.9, {'type': 'min', 'ft': 4000}, None), 'LU-like leg: mag and true track, distance, minimum altitude (header says minimum)', what='LU leg')
    r = P.parse_de_route([x for x in lu if x != '/g85 IAF BM301'])
    c.eq(([t['name'] for t in r['tables']], sum('NON retenue' in x for x in r['warnings'])), (['BBBBB 1B'], 1), 'LU-like: a block missing its second point is rejected, never completed', what='LU rejected')
    lp = ['LPXX AD 2.24.10 - 2 AIP TESTLAND', 'Testo STANDARD INSTRUMENT ARRIVAL (STAR) RWY 18/36', 'RUNWAY 18/36', 'Identification Significant', 'Designator MAG Track Dist. NM Minimum safe ALT Remarks',
          'Points', '▲ AAAAA', 'AAAAA 3C 245 110 3500FT Note - Clearance Limit: VSM Holding pending RWY in use.', '▲ VSM', '▲ BBBBB',
          'BBBBB 3B 3500FT Note - Clearance Limit: VSM Holding pending RWY in use. 078 126', '▲ VSM', '▲ CCC', '158 25 4500FT', 'Note - Clearance Limit: Holding VSM North or', 'CCC 3B Δ DDDDD',
          'South pending RWY in use.', '159 35 3500FT', '▲ VSM', 'AIRAC 005-21 © TEST']
    c.eq(P.detect_layout(lp), 'de-route', 'a Portuguese-like page is recognised', what='LP detect_layout')
    r = P.parse_de_route(lp)
    c.eq(([t['name'] for t in r['tables']], [[lg['id'] for lg in t['legs']] for t in r['tables']], r['tables'][0]['runways'], len(r['warnings'])),
         (['AAAAA 3C', 'BBBBB 3B', 'CCC 3B'], [['AAAAA', 'VSM'], ['BBBBB', 'VSM'], ['CCC', 'DDDDD', 'VSM']], ['18', '36'], 0),
         'LP-like: the block starts at the arrow point printed before its designator; the remark text is not read as points', what='LP tables')
    c.eq(([(lg['crs'], lg['nm'], lg['alt']) for lg in r['tables'][1]['legs'][1:]], [(lg['crs'], lg['nm']) for lg in r['tables'][2]['legs'][1:]]),
         ([(78, 126.0, {'type': 'min', 'ft': 3500})], [(158, 25.0), (159, 35.0)]), 'LP-like: numbers after the remark, and leg lines apart from the designator row', what='LP legs')
    r = P.parse_de_route(lp[:11] + lp[12:])
    c.eq(([t['name'] for t in r['tables']], sum('NON retenue' in x for x in r['warnings'])), (['AAAAA 3C', 'CCC 3B'], 1), 'LP-like: a block whose end point is missing is rejected', what='LP rejected')
    ep = ['AD 2 EPXX 10-2 AIP TESTLAND', 'STANDARD ARRIVAL CHART Testburg', 'INSTRUMENT (STAR) - ICAO RWY 08/26', 'AAAAA 2S BBBBB 1N', 'IDENTIFICATION', 'MAG TRACK DISTANCE ALTITUDE',
          'DESIGNATOR SIGNIFICANT', '(°) (NM) RESTRICTION REMARKS', 'POINTS', '▲ REP AAAAA -- +FL100', 'Speed limit 250 kt IAS', '∆ REP RECEZ 222 9.82 +6000 ft', 'AAAAA 2S max due to airspace',
          '∆ BY811 222 7.39 +5000 ft', '∆ DVOR/DME BYZ 222 7.70 +2300 ft', '▲ REP BBBBB -- +FL100 Speed limit 250 kt IAS', 'BBBBB 1N max due to airspace', '∆ REP LOZHU 091 6.65 +7000 ft',
          'class D.', '09/26 AIRAC AMDT TEST']
    c.eq(P.detect_layout(ep), 'de-route', 'a Polish-like page is recognised', what='EP detect_layout')
    r = P.parse_de_route(ep)
    t = r['tables'][0]
    c.eq(([x['name'] for x in r['tables']], [lg['id'] for lg in t['legs']], [lg['nm'] for lg in t['legs']], t['legs'][1]['alt'], t['legs'][3]['navaid'], len(r['tables'][1]['legs'])),
         (['AAAAA 2S', 'BBBBB 1N'], ['AAAAA', 'RECEZ', 'BY811', 'BYZ'], [None, 9.82, 7.39, 7.7], {'type': 'min', 'ft': 6000}, 'DVOR/DME', 2),
         'EP-like: designator in the middle of its block, first point without values, navaid type noted', what='EP tables')
    r = P.parse_de_route([x if not x.startswith('∆ BY811') else '∆ BY811' for x in ep])
    c.eq(([x['name'] for x in r['tables']], sum('NON retenue' in x for x in r['warnings'])), (['BBBBB 1N'], 1), 'EP-like: a point row without its values rejects the block', what='EP rejected')
    d = P.build_pdf_dir('LUXX', ['p.pdf'], lambda f: [lu], '2026-01-01')
    c.ok(d['formats'][0]['ok'] and d['formats'][0]['layout'] == 'de-route' and len(d['procedures']) == 2, str(d['formats'][0]), 'build_pdf_dir reads the LU-like page: two procedures')


# ------------------------------------------------------------------------------------------------ coding tables with split cells (static)
@case('K13', 'Coding tables with split cells (one table per procedure)', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: one layout per State, values read by order, counts checked, geometry check')
def k13(c):
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()

    def dms(v, lon=False):
        a = abs(v)
        d, m = int(a), int((a - int(a)) * 60)
        sec = round((a - d - m / 60) * 3600, 1)
        return f"{('E' if v >= 0 else 'W') if lon else ('N' if v >= 0 else 'S')}{d:0{3 if lon else 2}d} {m:02d} {sec:04.1f}"

    A, B, C2 = (40.5, 44.0), (40.9, 44.3), (41.2, 44.9)       # invented points
    b1, n1 = P.bearing_nm(A, B)
    b2, n2 = P.bearing_nm(A, C2)
    head = ['Designator Route Remarks', 'Waypoint Course/ Constraints Navigation', 'Path DIST Turn', 'Fly Coordinates Track', 'Terminator Identifier NM Direction Level IAS Specification Remarks', 'Mag(True)', 'Over']
    rows = ['AIP Republic of Nowhere XXXX AD 2.2-1', 'Standard Arrival Route — Instrument STAR RNAV1 (GNSS) RWY20'] \
        + ['RNAV STAR CODING TABLE OF AAA 1J'] + head[1:] \
        + [dms(*A[:1]) + ' ' + dms(A[1], True), 'IF AAA N', 'FL130+ K210- RNAV1', dms(B[0]) + ' ' + dms(B[1], True), 'TF BBB N A11500+ RNAV1', f'{round(b1) - 7:03d}° (T{b1:05.1f}°) {n1:.1f}'] \
        + ['Designator Route Remarks', 'RNAV STAR CODING TABLE OF CCC 1J'] + head[1:] \
        + [dms(A[0]), 'IF AAA N FL160+ K210- RNAV1', dms(A[1], True), 'IAF DDD ' + dms(C2[0]) + ' ' + dms(C2[1], True) + f' {round(b2) - 7:03d}°(T{b2:05.1f})', f'TF N {n2:.1f} A11500+ RNAV1'] \
        + ['Designator Route Remarks', 'RNAV STAR CODING TABLE OF EEE 1J'] + head[1:] \
        + [dms(A[0]) + ' ' + dms(A[1], True), 'IF AAA N', dms(B[0]) + ' ' + dms(B[1], True), 'TF BBB N', f'{round(b1) - 7:03d}° (T{(b1 + 5) % 360:05.1f}°) {n1:.1f}', '_____']
    c.eq(P.detect_layout(rows), 'am-coding', 'the page is recognised (before the generic coding-table layout)', what='detect_layout')
    r = P.parse_am_coding(rows)
    names = [t['name'] for t in r['tables']]
    c.eq((names, len(r['warnings'])), (['AAA 1J', 'CCC 1J', 'EEE 1J'], 0), 'three tables read by order of values, whatever the cell order', what='tables')
    t0, t1 = r['tables'][0], r['tables'][1]
    c.eq(([lg['id'] for lg in t0['legs']], t0['legs'][0]['alt'], t0['legs'][0]['kt'], t0['legs'][1]['alt']), (['AAA', 'BBB'], {'type': 'min', 'ft': 13000}, 210, {'type': 'min', 'ft': 11500}),
         'fixes, level constraint (FL130+ minimum) and speed (K210- maximum IAS)', what='constraints')
    c.eq(([lg['id'] for lg in t1['legs']], t1['runways']), (['AAA', 'DDD'], ['20']), 'the fix printed before its path terminator (IAF DDD ... TF N) is attached to the right leg; the runway comes from the page title', what='id before terminator')
    recs, w = P.records_uk_app('XXXX', r, 'f.pdf', '2026-10-01', None, 'XX')
    c.eq((len(recs), sum('NON retenue' in x for x in w), sum(x['status'] == 'check' for x in recs), [x['doubt'] for x in recs if x['status'] == 'doubt']), (3, 0, 2, ['geometry']),
         'the geometry check keeps the two consistent tables as they are and the one whose printed course is 5° off as a doubt (code geometry), no table is dropped', what='geometry check')
    c.ok(recs[0]['source']['ref'] == 'ead-basic/XX/f.pdf' and recs[0]['kind'] == 'STAR' and recs[0]['status'] == 'check', str(recs[0]['source']), 'source and status are those of a State read through EAD, to be checked')
    bad = [x for x in rows if 'TF BBB N A11500+' not in x]
    c.ok(any('NON retenue' in x for x in P.parse_am_coding(bad)['warnings']), 'counts', 'a table whose counts disagree (course missing) is rejected and reported, never completed')


# ------------------------------------------------------------------------------------------------ UK coding tables, geometry check (static)
def _uk_page(P, points, corrupt=False):
    """Lignes d'une page « Instrument Approach Procedure Coding Tables » INVENTÉE (points fictifs) à la disposition du Royaume-Uni : latitude et cap magnétique avant la ligne de
    tronçon, longitude et cap vrai après ; les caps sont calculés d'après les coordonnées, sauf `corrupt` qui en falsifie un."""
    def dms(v, lon):
        a = abs(v)
        d = int(a)
        m = int((a - d) * 60)
        sec = round(((a - d) * 60 - m) * 60, 2)
        return f'{d:0{3 if lon else 2}d}{m:02d}{sec:05.2f}' + (('E' if v >= 0 else 'W') if lon else ('N' if v >= 0 else 'S'))
    rows = ['UNITED KINGDOM AIP AD 2.EGXX-8-13', '1 Jan 2026', 'Instrument Approach Procedure Coding Tables', 'London Test RNP RWY 09L - Instrument Approach Procedure via ' + points[0][0],
            'Path Course/', 'Waypoint Fly- Turn Level Speed', 'Designator Sequence Term- Track', 'Number Name over Direction Constraint Constraint Co-ordinates Remarks and Distance to MAPt', 'inator °M (°T)']
    for i, (name, lat, lon) in enumerate(points):
        if i == 0:
            rows += [dms(lat, False), f'R09L 001 IF {name} - - - 3000 - IF / 10NM', dms(lon, True)]
            continue
        brg, _ = P.bearing_nm((points[i - 1][1], points[i - 1][2]), (lat, lon))
        shown = brg + (5 if corrupt and i == 2 else 0)
        rows += [f'{round(brg):03d}° {dms(lat, False)}', f'R09L {i + 1:03d} TF {name} {"Y" if i == len(points) - 1 else "-"} - - - {"MAPt" if i == len(points) - 1 else "-"}', f'({shown:06.2f}°) {dms(lon, True)}']
    rows += ['CHANGE (1/26): TEST.', 'CIVIL AVIATION AUTHORITY AMDT 1/2026']
    return rows


@case('K10', 'UK coding tables: parser and geometry check', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: tables read from text are checked against their own coordinates')
def k10(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    # each PDF is read by pypdf in a separate process under a time limit (security review of 28 Oct 2026): a damaged or trapped
    # file fails cleanly, a reading past the limit is given up, and a folder build reports the file instead of stopping
    import tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory() as td:
        bad = Path(td) / 'bad.pdf'
        bad.write_bytes(b'%PDF-1.7 not really a pdf')
        caught = []
        for kw in ({}, {'timeout': 0}):
            try:
                P.pdf_pages(bad, **kw)
                caught.append('read')
            except P.PdfTimeout as e:
                caught.append(str(e))
            except SystemExit as e:                           # pypdf absent: the clear message of the optional dependency
                caught.append('pypdf: ' + str(e))
        c.ok(all(x != 'read' for x in caught) and ('après 0 s' in caught[1] or caught[1].startswith('pypdf')), f'{caught}',
             'a damaged PDF and a reading past the limit fail cleanly (PdfTimeout), never block the tool')
        d = P.build_pdf_dir('EGXX', ['bad.pdf'], lambda n: P.first_page_rows(bad), '2026-10-01')
        c.ok(d['formats'][0]['ok'] is False and d['procedures'] == [] and any('NON lu' in w for w in d['warnings']), f"{d['formats']}",
             'a folder build reports the unreadable file and goes on')
    pts = [('TESTA', 51.4762, -0.7516), ('TESTB', 51.4767, -0.6711), ('RW09L', 51.4775, -0.4850)]      # points fictifs (essai du parseur, pas des données d'AIP)
    rows = _uk_page(P, pts)
    c.eq(P.detect_layout(rows), 'uk-app', 'layout recognised from its header words', what='detect_layout')
    parsed = P.parse_uk_app(rows)
    t = parsed['tables'][0]
    c.eq((t['name'], t['runways'], t['transition'], [lg['id'] for lg in t['legs']]), ('RNP RWY 09L', ['09L'], 'TESTA', ['TESTA', 'TESTB', 'RW09L']), 'title, runway, "via" transition, legs in order', what='parse_uk_app')
    c.ok(abs(t['legs'][1]['lat'] - 51.4767) < 1e-4 and abs(t['legs'][1]['lon'] + 0.6711) < 1e-4, f"{t['legs'][1]}", 'latitude read above the leg line, longitude below it')
    c.eq((t['legs'][0]['alt'], t['legs'][2]['over']), ({'type': 'at', 'ft': 3000}, True), 'level constraint and fly-over', what='cells')
    c.eq(_gaps(t['legs']), [], 'a coherent table has no geometry gap', what='check_geometry')
    recs, w = P.records_uk_app('EGXX', parsed, 'x.pdf', '2026-10-01', '2026-01-01')
    c.eq((recs[0]['id'], recs[0]['status'], recs[0]['source']['kind'], recs[0]['points'][2]['id']), ('EGXX.APP.RNPRWY09L.RW09L.TESTA', 'check', 'ead-basic', 'RW09L'), 'common schema, status check, source ead-basic', what='records_uk_app')
    bad = _uk_page(P, pts, corrupt=True)
    pb = P.parse_uk_app(bad)
    gap = _gaps(pb['tables'][0]['legs'])
    c.ok(gap and 'cap calculé' in gap[0], f'{gap}', 'a printed true course 5 degrees off the coordinates is caught')
    recs2, w2 = P.records_uk_app('EGXX', pb, 'x.pdf', '2026-10-01')
    c.ok(len(recs2) == 1 and recs2[0]['status'] == 'doubt' and recs2[0]['doubt'] == 'geometry' and any('À VÉRIFIER' in x and 'cap calculé' in x for x in w2) and not any('NON retenue' in x for x in w2), f'{recs2} {w2}',
         'an incoherent table is kept as a doubt (code geometry, the gap said in the warnings), never installed as sure and never dropped')
    doc = P.build_pdf_dir('EGXX', ['a_8-13.pdf', 'b_7-13.pdf'], lambda n: [rows] if n.startswith('a') else [['UNITED KINGDOM AIP AD 2.EGXX-7-13', '25 Dec 2025', 'CIVIL AVIATION AUTHORITY']], '2026-10-01')
    byf = {f['file']: f for f in doc['formats']}
    c.ok(byf['a_8-13.pdf']['ok'] and not byf['b_7-13.pdf']['ok'] and any('vecteurs' in p for p in byf['b_7-13.pdf']['problems']) and len(doc['procedures']) == 1, f"{doc['formats']}",
         'a page with almost no text is reported as probably drawn in vectors, never guessed; the readable one is read')


@case('K11', 'Manual interpretation file: geometry check and install', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: a table read by hand is installed only if its own course and distance agree with its positions')
def k11(c):
    import importlib
    import json
    import sys
    import tempfile
    from pathlib import Path
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    M = importlib.import_module('proc_manual')
    pos = [('TESTA', 51.00, -1.00), ('TESTB', 51.10, -0.50), ('TESTC', 51.20, -0.10)]                 # points fictifs : essai de l'outil, pas des données d'AIP
    pts = []
    for i, (n, la, lo) in enumerate(pos):
        p = {'seq': i + 1, 'id': n, 'lat': la, 'lon': lo, 'alt': None, 'leg': 'IF' if i == 0 else 'TF'}
        if i:
            brg, nm = P.bearing_nm((pos[i - 1][1], pos[i - 1][2]), (la, lo))
            p['trk'], p['nm'] = round(brg, 1), round(nm, 1)
        pts.append(p)
    doc = {'schema': 1, 'icao': 'EGXX', 'cycle': '2026-10-01', 'procedures': [{'id': 'EGXX.STAR.TEST1A.RWALL', 'icao': 'EGXX', 'kind': 'STAR', 'name': 'TEST 1A', 'runways': [], 'transition': None,
                                                                          'points': pts, 'source': {'kind': 'ead-basic'}, 'status': 'check'}]}
    c.eq(M.verify(doc), [], 'a table whose printed course and distance agree with its positions is installable', what='verify')
    bad = json.loads(json.dumps(doc))
    bad['procedures'][0]['points'][2]['nm'] += 1.0
    pb = M.verify(bad)
    c.ok(pb and 'distance calculée' in pb[0], f'{pb}', 'a distance one mile off is refused')
    bad2 = json.loads(json.dumps(doc))
    bad2['procedures'][0]['status'] = 'official'
    c.ok(M.verify(bad2), 'official accepted', 'a manual interpretation can only be status check')
    with tempfile.TemporaryDirectory() as td:
        (Path(td) / 'manual').mkdir()
        (Path(td) / 'manual' / 'index.json').write_text(json.dumps({'schema': 1, 'folder': 'manual', 'aerodromes': {'KSEA': {'SID': 1}}}))
        M.install(doc, td, source_file=str(Path(td) / 'hand' / 'EGXX_reading.json'))
        c.eq(json.loads((Path(td) / 'manual' / 'EGXX.json').read_text())['procedures'][0]['source'].get('file'), 'EGXX_reading.json',
             'a hand reading carries the NAME (no folder) of the file it came from in source.file', what='manual source.file')
        idx = json.loads((Path(td) / 'manual' / 'index.json').read_text())
        # outside the cycle folders (the user's decision of 28 Oct 2026): proc/manual/, the cycle of the page kept on every procedure
        inst = json.loads((Path(td) / 'manual' / 'EGXX.json').read_text())
        c.ok(not (Path(td) / '2026-10-01').exists() and all(p['source'].get('cycle') == '2026-10-01' for p in inst['procedures']) and idx['aerodromes']['EGXX']['cycle'] == '2026-10-01',
             json.dumps(idx)[:200], 'installed under proc/manual/, never in a cycle folder; each procedure keeps the cycle of its page')
        # another source's file of the same aerodrome is never overwritten: refused without --replace; with it, merged by id, the best status kept
        f = Path(td) / 'manual' / 'EGYY.json'
        off = {'schema': 1, 'icao': 'EGYY', 'cycle': '2026-10-01', 'procedures': [{'id': 'EGYY.SID.A', 'kind': 'SID', 'status': 'official', 'source': {'kind': 'eaip'}},
                                                                                  {'id': 'EGYY.STAR.TEST1A.RWALL', 'kind': 'STAR', 'status': 'official', 'source': {'kind': 'eaip'}}]}
        f.write_text(json.dumps(off))
        man = json.loads(json.dumps(doc).replace('EGXX', 'EGYY'))
        man['procedures'].append({**man['procedures'][0], 'id': 'EGYY.STAR.TEST2A.RWALL', 'name': 'TEST 2A'})
        try:
            M.install(man, td)
            refused = ''
        except SystemExit as e:
            refused = str(e)
        c.ok('--replace' in refused and json.loads(f.read_text()) == off, refused or 'written', "another source's file is refused without --replace and left as it was")
        M.install(man, td, replace=True)
        got = {p['id']: p['status'] for p in json.loads(f.read_text())['procedures']}
        idx2 = json.loads((Path(td) / 'manual' / 'index.json').read_text())['aerodromes']['EGYY']
        c.eq((got, {k: v for k, v in idx2.items() if k != 'updated_at'}), ({'EGYY.SID.A': 'official', 'EGYY.STAR.TEST1A.RWALL': 'official', 'EGYY.STAR.TEST2A.RWALL': 'check'}, {'SID': 1, 'STAR': 2, 'APP': 0, 'status': 'official', 'cycle': '2026-10-01', 'pages_unread': 0, 'doubt': 0}),
             'with --replace: merged by id, the official procedure kept over the manual one, the new one added, the index counted on the whole', what='merge')
        # the date of the reading (§ 10.29, j): the index entry carries the file's updated_at, else now in UTC to the second; aerodb serves it as coverage().read_at
        import re
        c.ok(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\+00:00|Z)', idx['aerodromes']['EGXX'].get('updated_at', '')) is not None and 'updated_at' not in idx['aerodromes']['KSEA'],
             json.dumps(idx['aerodromes']), 'install writes updated_at (now, UTC, seconds) into the aerodrome index entry when the file has none; the other entries are left as they were')
        dated = json.loads(json.dumps(doc).replace('EGXX', 'EGWW'))
        dated['updated_at'] = '2026-10-28T10:00:00+00:00'
        M.install(dated, td)
        c.eq(json.loads((Path(td) / 'manual' / 'index.json').read_text())['aerodromes']['EGWW']['updated_at'], '2026-10-28T10:00:00+00:00', 'the index entry updated_at is the own one of the file when it has one', what='updated_at file')
        # the counts of what is not read (§ 10.26): pages not read (formats[].ok false) and records of status doubt; aerodb's coverage() turns orange « partial » from them
        part = json.loads(json.dumps(doc).replace('EGXX', 'EGVV'))
        part['formats'] = [{'file': 'a.pdf', 'ok': True}, {'file': 'b.pdf', 'ok': False, 'reason': 'layout'}, {'file': 'c.pdf', 'ok': False, 'reason': 'low-read'}]
        part['procedures'].append({**part['procedures'][0], 'id': 'EGVV.STAR.DBT1A.RWALL', 'name': 'DBT 1A', 'status': 'doubt', 'doubt': 'zigzag'})
        M.install(part, td)
        e = json.loads((Path(td) / 'manual' / 'index.json').read_text())['aerodromes']
        c.eq((e['EGVV']['pages_unread'], e['EGVV']['doubt'], e['EGVV']['STAR'], e['EGXX']['pages_unread'], e['EGXX']['doubt']), (2, 1, 1, 0, 0),
             'install writes pages_unread (formats with ok false) and doubt (records of status doubt, not counted in STAR) into the aerodrome entry', what='index counts')
        c.eq((sorted(idx['aerodromes']), idx['aerodromes']['EGXX']['STAR'], (Path(td) / 'manual' / 'EGXX.json').exists()), (['EGXX', 'KSEA'], 1, True), 'installed, the index keeps the other aerodromes', what='install')
    # a file without any procedure is refused (never installed as « 0 procédure(s) cohérentes »): its warnings are printed, and the sibling OCR file is pointed at
    import contextlib
    import io
    with tempfile.TemporaryDirectory() as td2:
        empty = {'schema': 1, 'icao': 'EGZZ', 'cycle': '2026-10-01', 'procedures': [], 'formats': [],
                 'warnings': ['EGZZ_a.pdf: page NON lue, disposition non reconnue', 'T1 (table 1): 2 tronçon(s) lu(s), table NON retenue']}
        ef = Path(td2) / 'EGZZ.json'
        ef.write_text(json.dumps(empty), encoding='utf-8')
        outdir = Path(td2) / 'data' / 'proc'

        def run_main():
            err = io.StringIO()
            code = None
            with contextlib.redirect_stderr(err):
                try:
                    M.main([str(ef), '--out', str(outdir)])
                except SystemExit as e:
                    code = e.code
            return code, err.getvalue()
        code, msg = run_main()
        c.ok(code == 1 and 'AUCUNE procédure' in msg and 'disposition non reconnue' in msg and 'table NON retenue' in msg and 'cohérentes' not in msg and 'installé dans' not in msg
             and not outdir.exists() and '.ocr.json' not in msg, f'{code} {msg}', 'an empty file is refused (exit 1), each warning printed, nothing installed, no success line')
        (Path(td2) / 'EGZZ.ocr.json').write_text(json.dumps({**empty, 'procedures': [{'id': 'x'}]}), encoding='utf-8')
        code, msg = run_main()
        c.ok(code == 1 and f'python tools/proc_manual.py {Path(td2) / "EGZZ.ocr.json"} --out {outdir}' in msg and not outdir.exists(), f'{code} {msg}',
             'with EGZZ.ocr.json beside it, the refusal says the OCR procedures are there and gives the exact command')


# ------------------------------------------------------------------------------------------------ ICAO tables without co-ordinates, Irish single-line tables (static)
@case('K18', 'ICAO tabular coding tables without co-ordinates: parser, ambiguity rejection', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: one layout per State, cells read by type and rank, an ambiguous row rejects the block, co-ordinates resolved by aerodb')
def k18(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    A, B, C2 = (60.00, -20.00), (60.10, -19.70), (60.30, -19.60)          # invented points: only used to print consistent courses and distances
    b1, n1 = P.bearing_nm(A, B)
    b2, n2 = P.bearing_nm(B, C2)
    h2 = ['Serial Path Waypoint Fly- Course / Magnetic Distance Turn Altitude Speed Navigation', 'Number Descriptor Identifier over Track °M(°T) Variation (NM) Direction (ft) (kt/h) Specification']
    h3 = ['Route Serial Path Waypoint Fly Course Magnetic Distance Turn Altitude Speed Navigation', 'Designator Number Descriptor Identifier Over °M (°T) Variation (NM) Direction (ft) (kt) Specification', '']
    page = ['AIP Republic of Nowhere BIXX AD 2 5 - 5', 'BIXX RNP STAR RWY 19', 'Recommended Coding Tables',
            'NNNNN 1M'] + h2 + [
        '010 IF NNNNN - +10.4 F100+ RNP 1',
        f'020 TF FIXAA - {round(b1):03d} ({b1:05.1f}) +10.3 {n1:.1f} A7000+ RNP 1',
        f'030 TF FIXBB - {round(b2):03d} ({b2:05.1f}) +10.2 {n2:.1f} -FL110/+FL080 -230 RNP 1',
        'MMMMM 2N RWY 05 DEPARTURE'] + h3 + [
        'MM2N 010 IF MMMMM Y - 6.5E - - +FL100 -250 RNAV 1',
        f'MM2N 020 TF FIXCC - {round(b1):03d}° ({b1:05.1f}°) 6.5E {n1:.1f} L 3000 - RNAV 1',
        f'MM2N 030 TF FIXDD N {round(b2):03d}° ({b2:05.1f}°) 6.5E {n2:.1f} - 5000 K210- RNAV 1',
        'FOR DETAILED FLIGHT PROCEDURES REFER TO AIP BIXX AD 2.22']
    c.eq(P.detect_layout(page), 'icao-tab', 'the page is recognised (a printed ICAO table without co-ordinates)', what='detect_layout')
    r = P.parse_icao_tab(page)
    t0, t1 = r['tables'][0], r['tables'][1]
    c.eq(([t['name'] for t in r['tables']], len(r['warnings'])), (['NNNNN 1M', 'MMMMM 2N'], 0), 'two blocks read, whatever the columns of their headers', what='tables')
    c.eq(([t['kind'] for t in r['tables']], [t['runways'] for t in r['tables']]), (['STAR', 'SID'], [['19'], ['05']]), 'kind and runway from the page title, the block title overriding them', what='kind and runways')
    c.eq([lg['id'] for lg in t0['legs']], ['NNNNN', 'FIXAA', 'FIXBB'], 'one leg per row (serial number 010 020 030)', what='legs')
    c.eq((t0['legs'][0]['alt'], t0['legs'][1]['alt'], t0['legs'][2]['alt'], t0['legs'][2]['kt']), ({'type': 'min', 'ft': 10000}, {'type': 'min', 'ft': 7000}, {'type': 'between', 'ft': 8000, 'ft2': 11000}, 230),
         'level constraints F100+ (FL100 or above), A7000+, -FL110/+FL080 (between), speed -230', what='constraints')
    c.eq((t0['legs'][1]['crs'], t0['legs'][1]['true'], t0['legs'][1]['nm'], t0['legs'][0]['crs'], t0['legs'][0]['nm']), (round(b1), float(f'{b1:.1f}'), float(f'{n1:.1f}'), None, None),
         'magnetic course, true course and distance by position; the IF row has none', what='course')
    c.eq((t1['legs'][0]['over'], t1['legs'][1]['turn'], t1['legs'][1]['alt'], t1['legs'][2]['over'], t1['legs'][2]['kt'], t1['legs'][2]['alt']),
         (True, 'L', {'type': 'at', 'ft': 3000}, None, 210, {'type': 'at', 'ft': 5000}), 'second layout (leading route column, degree signs): fly-over, turn, level, speed K210-', what='second layout')
    c.ok(all(lg['lat'] is None and lg['lon'] is None for t in r['tables'] for lg in t['legs']), 'lat/lon', 'None on every point (resolved later by aerodb)')
    recs, w = P.records_uk_app('BIXX', r, 'f.pdf', '2026-10-01', None, 'XX')
    c.eq((len(recs), [x['kind'] for x in recs], all(p['lat'] is None for x in recs for p in x['points'])), (2, ['STAR', 'SID'], True), 'two procedures at the common schema, points awaiting co-ordinates', what='records')
    # an ambiguous row (an unsigned decimal that may be the variation or the distance) rejects its block and only it
    amb = [x.replace(' +10.3 ', ' ') for x in page]
    r2 = P.parse_icao_tab(amb)
    c.eq(([t['name'] for t in r2['tables']], sum('NON retenue' in x for x in r2['warnings'])), (['MMMMM 2N'], 1), 'a row that splits two ways (variation or distance?) rejects the block, never guessed', what='ambiguity')
    # serial numbers that do not increase, and a block without a procedure type
    r3 = P.parse_icao_tab([x.replace('030 TF FIXBB', '010 TF FIXBB') for x in page])
    c.eq(([t['name'] for t in r3['tables']], sum('NON retenue' in x for x in r3['warnings'])), (['MMMMM 2N'], 1), 'serial numbers out of order: block rejected', what='serials')
    r4 = P.parse_icao_tab([x for x in page if x != 'BIXX RNP STAR RWY 19'])
    c.eq([t['name'] for t in r4['tables']], ['MMMMM 2N'], 'a block whose type is nowhere on the page (neither title) is rejected', what='no type')

    # the procedure type printed on page 1 only: a second page of the same document inherits it through build_pdf_dir
    page1 = page[:page.index('MMMMM 2N RWY 05 DEPARTURE')]
    page2 = ['AIP Republic of Nowhere BIXX AD 2 5 - 6', 'Recommended Coding Tables', 'PPPPP 1M'] + h2 + [
        '010 IF PPPPP - +10.4 F100+ RNP 1',
        f'020 TF FIXAA - {round(b1):03d} ({b1:05.1f}) +10.3 {n1:.1f} A7000+ RNP 1']
    c.eq(([t['name'] for t in P.parse_icao_tab(page2)['tables']], sum('NON retenue' in x for x in P.parse_icao_tab(page2)['warnings'])), ([], 1), 'alone, the second page is rejected (type nowhere on the page)', what='no hint')
    h = P.parse_icao_tab(page2, kind_hint='STAR')
    c.eq(([(t['name'], t['kind']) for t in h['tables']], len(h['warnings'])), ([('PPPPP 1M', 'STAR')], 0), 'with kind_hint the block is read with that type', what='kind_hint')
    d = P.build_pdf_dir('BIXX', ['a.pdf'], lambda f: [page1, page2], '2026-10-01')
    c.eq(([x['ok'] for x in d['formats']], sorted((x['kind'], x['name']) for x in d['procedures'])), ([True, True], [('STAR', 'NNNNN 1M'), ('STAR', 'PPPPP 1M')]),
         'build_pdf_dir carries the type read on page 1 to page 2', what='carry-over')
    d = P.build_pdf_dir('BIXX', ['a.pdf'], lambda f: [page2, page1], '2026-10-01')
    c.eq(([x['ok'] for x in d['formats']], [x['name'] for x in d['procedures']]), ([False, True], ['NNNNN 1M']), 'the type is never carried backwards: a first page without type stays rejected', what='no backward carry')


@case('K19', 'Irish single-line coding tables with co-ordinates: parser and geometry check', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: one layout per State, values read by position, the table is installed only through the geometry check')
def k19(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    pts_all = [('FIXAA', 51.80, -7.80), ('FIXBB', 52.05, -8.40), ('FIXCC', 52.00, -8.60), ('FIXDD', 51.90, -8.50)]          # invented points (west longitudes)

    def dd(v, lon):
        a = abs(v)
        d, m = int(a), int((a - int(a)) * 60)
        s = round((a - d - m / 60) * 3600, 1)
        return f'{d:0{3 if lon else 2}d}{m:02d}{s:04.1f}'

    def block(name, short, bump=0.0, spaced=False, mangle=False, lone=False):
        """Lines of one block: title, short designator, header over 3 lines, then one row per leg; `bump` falsifies a true track, `spaced` splits a co-ordinate, `mangle` splits a name (the same
        co-ordinates carry the whole name in the other blocks: confirmed), `lone` gives the last point positions found nowhere else, with a split name (not confirmed)."""
        pts = pts_all[:3] + [('FIXEE', 51.95, -8.45)] if lone else pts_all
        rows = [f'{name} CAT A/B/C/D STAR RWY16', short, 'Navigation Path Fly - By or Distance True track / Upper limit / Speed Limit', 'Remarks',
                'Performance Terminator WPT Name Latitude (N), Longitude (W) Fly-Over (NM) Magnetic track Lower limit (kts)']
        for i, (n, la, lo) in enumerate(pts):
            lon = dd(lo, True)
            if spaced and i == 0:
                lon = lon[:3] + ' ' + lon[3:]
            if (mangle or lone) and i == 3:
                n = n[:2] + ' ' + n[2:]
            if i == 0:
                rows.append(f'RNAV 1 IF {n} {dd(la, False)} / {lon} - - - - / FL080 - -')
                continue
            brg, nm = P.bearing_nm(pts[i - 1][1:], (la, lo))
            spd = '-' if i != 2 else '220'
            lim = {1: '- / 6000', 2: '-', 3: '3000 / 3000'}[i]
            rows.append(f'RNAV 1 TF {n} {dd(la, False)} / {lon} Fly - By {nm:.1f} {brg + (bump if i == 2 else 0):.1f} / {round(brg + 4):03d} {lim} {spd} -')
        return rows
    page = ['EIXX AD 2.24-14.2 AIP IRELAND', '11 OCT 2018'] + block('ABCDE1R', 'ABCD1R', spaced=True) + block('FGHIJ1R', 'FGHI1R', bump=5.0) + block('KLMNO1R', 'KLMN1R', mangle=True) + block('PQRST1R', 'PQRS1R', lone=True) + ['Hold Identification - EIXX AD 2.24-14']
    c.eq(P.detect_layout(page), 'ei-coding', 'the page is recognised before the generic coding-table layout', what='detect_layout')
    r = P.parse_ei_coding(page)
    c.eq(([t['name'] for t in r['tables']], [t['kind'] for t in r['tables']], [t['runways'] for t in r['tables']]), (['ABCD1R', 'FGHI1R', 'KLMN1R'], ['STAR', 'STAR', 'STAR'], [['16'], ['16'], ['16']]),
         'short designators, kind and runway from the title; a split name is read when the same co-ordinates carry the whole name elsewhere on the page, the block with a split name found nowhere else is rejected', what='tables')
    c.eq(sum('NON retenue' in x for x in r['warnings']), 1, 'the unconfirmed split name is reported', what='rejected block')
    c.eq([lg['id'] for lg in r['tables'][2]['legs']][3], 'FIXDD', 'a split name confirmed by its twin is put back whole', what='confirmed name')
    t0 = r['tables'][0]
    c.eq([lg['id'] for lg in t0['legs']], ['FIXAA', 'FIXBB', 'FIXCC', 'FIXDD'], 'one leg per row', what='legs')
    c.eq((t0['legs'][0]['alt'], t0['legs'][1]['alt'], t0['legs'][2]['alt'], t0['legs'][3]['alt']),
         ({'type': 'min', 'ft': 8000}, {'type': 'min', 'ft': 6000}, None, {'type': 'at', 'ft': 3000}), 'levels: upper = max, lower = min, equal = at, none = nothing', what='constraints')
    c.eq((t0['legs'][2]['kt'], t0['legs'][1]['kt'], t0['legs'][1]['over'], t0['legs'][0]['crs']), (220, None, None, None), 'speed limit; no fly-over; the IF has no course', what='speed')
    c.ok(abs(t0['legs'][0]['lon'] + 7.8) < 0.0002 and abs(t0['legs'][0]['lat'] - 51.8) < 0.0002, (t0['legs'][0]['lat'], t0['legs'][0]['lon']), '(51.8, -7.8)', 'a co-ordinate split in digit groups is joined; west longitude negative')
    c.eq(_gaps(t0['legs']), [], 'courses and distances agree with the printed positions', what='geometry')
    recs, w = P.records_uk_app('EIXX', r, 'f.pdf', '2026-10-01', None, 'EI')
    c.eq((len(recs), sum('NON retenue' in x and 'incoh' in x for x in w), recs[0]['kind'], recs[0]['status'], sorted(x['status'] for x in recs)), (3, 0, 'STAR', 'check', ['check', 'check', 'doubt']),
         'the geometry check keeps the consistent tables and the one whose true track is 5 degrees off as a doubt', what='geometry check')


# ------------------------------------------------------------------------------------------------ OCR of drawn pages (static)
@case('K14', 'OCR of drawn pages: rows from word boxes, geometry check', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: OCR included as an optional workstation dependency; its output is installed only through the geometry check')
def k14(c):
    import importlib
    import random
    import shutil
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    M = importlib.import_module('proc_manual')
    O = importlib.import_module('proc_ocr')
    # security review of 28 Oct 2026: the current directory is never searched for tesseract, the resolution is capped
    import argparse
    import os
    seen, real_which = [], shutil.which
    shutil.which = lambda name, *a, **k: (seen.append(os.environ.get('NoDefaultCurrentDirectoryInExePath')), '/abs/tesseract')[1]
    try:
        found = O.tesseract_path()
    finally:
        shutil.which = real_which
    c.eq((seen, found), (['1'], '/abs/tesseract'), 'which is called with NoDefaultCurrentDirectoryInExePath set to 1 and its absolute answer is what gets run', what='tesseract lookup')
    refused = []
    for bad_dpi in ('601', '5000'):
        try:
            O.dpi_arg(bad_dpi)                                     # the type function of --dpi (argparse turns it into exit 2)
        except argparse.ArgumentTypeError:
            refused.append('arg')
    try:
        O.render_page('x.pdf', 0, 601)
        refused.append('rendered')
    except SystemExit as e:
        refused.append(str(e)[:20])
    c.eq(refused, ['arg', 'arg', 'résolution refusée :'], 'a resolution above 600 dpi is refused by the command line and by render_page', what='dpi cap')

    def dms(v, lon=False):
        a = abs(v)
        d, m = int(a), int((a - int(a)) * 60)
        sec = round((a - d - m / 60) * 3600, 1)
        return f"{('E' if v >= 0 else 'W') if lon else ('N' if v >= 0 else 'S')}{d:0{3 if lon else 2}d} {m:02d} {sec:04.1f}"

    A, B, C2 = (40.5, 44.0), (40.9, 44.3), (41.2, 44.9)       # invented points
    b1, n1 = P.bearing_nm(A, B)
    b2, n2 = P.bearing_nm(A, C2)

    def page(bump=0):
        """Invented am-coding page; `bump` changes one printed true-course digit group in the first table."""
        head = ['Waypoint Course/ Constraints Navigation', 'Path DIST Turn', 'Fly Coordinates Track', 'Terminator Identifier NM Direction Level IAS Specification Remarks', 'Mag(True)', 'Over']
        return ['AIP Republic of Nowhere XXXX AD 2.2-1', 'Standard Arrival Route — Instrument STAR RNAV1 (GNSS) RWY20', 'Designator Route Remarks', 'RNAV STAR CODING TABLE OF AAA 1J'] + head \
            + [dms(A[0]) + ' ' + dms(A[1], True), 'IF AAA N', 'FL130+ K210- RNAV1', dms(B[0]) + ' ' + dms(B[1], True), 'TF BBB N A11500+ RNAV1', f'{round(b1) - 7:03d}° (T{b1 + bump:05.1f}°) {n1:.1f}'] \
            + ['Designator Route Remarks', 'RNAV STAR CODING TABLE OF CCC 1J'] + head \
            + [dms(A[0]) + ' ' + dms(A[1], True), 'IF AAA N FL160+ K210- RNAV1', dms(C2[0]) + ' ' + dms(C2[1], True), 'TF DDD N A11500+ RNAV1', f'{round(b2) - 7:03d}° (T{b2:05.1f}°) {n2:.1f}', '_____']

    def boxes(rows, seed=3):
        """Word boxes (one y line per row, increasing x) in shuffled order, as an OCR engine could return them."""
        ws = [{'x0': 10 + 60 * j, 'y0': 20 * i, 'x1': 60 + 60 * j, 'y1': 20 * i + 10, 'text': t, 'conf': 90.0} for i, r in enumerate(rows) for j, t in enumerate(r.split())]
        random.Random(seed).shuffle(ws)
        return ws
    rows = page()
    c.eq(O.rows_from_words(boxes(rows)), rows, 'rows come back top to bottom with words sorted by x, whatever the order the engine returned them', what='rows_from_words')
    doc = O.document_from_rows('XXXX', 'p.pdf', O.rows_from_words(boxes(rows)), '2026-10-01', 'XX')
    f = doc['formats'][0]
    c.eq((len(doc['procedures']), f['layout'], f['ok'], f['via'], M.verify(doc)), (2, 'am-coding', True, 'ocr', []), 'two tables kept, layout named, flagged as OCR, and proc_manual.verify finds nothing to refuse', what='document_from_rows')
    p0 = doc['procedures'][0]
    c.ok(p0['status'] == 'check' and p0['source']['ref'].startswith('ocr:') and p0['points'][1]['trk'] == round(b1, 1) and p0['points'][1]['nm'] == round(n1, 1), str(p0['points'][1]), 'points carry the printed true course (trk) and distance (nm); status check; source marked OCR')
    bad = O.document_from_rows('XXXX', 'p.pdf', O.rows_from_words(boxes(page(bump=5.0))), '2026-10-01', 'XX')
    c.ok(len(bad['procedures']) == 2 and sorted(x['status'] for x in bad['procedures']) == ['check', 'doubt'] and [x['doubt'] for x in bad['procedures'] if x['status'] == 'doubt'] == ['geometry']
         and any('À VÉRIFIER' in x for x in bad['warnings']) and not any('NON retenue' in x for x in bad['warnings']) and bad['formats'][0]['ok'] and M.verify(bad) == [], f"{bad['formats']}",
         'a misread course (5 degrees off) keeps that table as a doubt (code geometry) with a warning, the other is untouched; the page is read, nothing is dropped, proc_manual finds nothing to refuse')
    unk = O.document_from_rows('XXXX', 'u.pdf', ['Some', 'unrelated text', 'on a page'], '2026-10-01')
    c.ok(unk['procedures'] == [] and unk['formats'][0]['ok'] is False and unk['formats'][0]['layout'] is None, str(unk['formats']), 'a page of unknown layout gives no procedure and nothing is guessed')
    which, mods = shutil.which, dict(sys.modules)
    try:
        shutil.which = lambda *a, **k: None
        sys.modules['rapidocr_onnxruntime'] = None
        sys.modules['rapidocr'] = None
        c.eq(O.backend(), None, 'no engine detected when neither is present', what='backend')
        try:
            O.ocr_words(object())
            msg = ''
        except SystemExit as e:
            msg = str(e)
        c.ok('Tesseract' in msg and 'rapidocr-onnxruntime' in msg, msg, 'without any engine, ocr_words stops with a message naming both options')
    finally:
        shutil.which = which
        if 'rapidocr_onnxruntime' in mods:
            sys.modules['rapidocr_onnxruntime'] = mods['rapidocr_onnxruntime']
        else:
            sys.modules.pop('rapidocr_onnxruntime', None)
        if 'rapidocr' in mods:
            sys.modules['rapidocr'] = mods['rapidocr']
        else:
            sys.modules.pop('rapidocr', None)

    # carte IAC belge (codage ARINC dessiné en vecteurs) : liste de points en degrés et minutes décimales puis tronçons, lue par OCR, points résolus, contrôle de géométrie
    def dm(v, lon):
        a = abs(v)
        d = int(a)
        mi = round((a - d) * 60, 2)
        return f"{d:0{3 if lon else 2}d}°{mi:05.2f}' {('E' if v >= 0 else 'W') if lon else ('N' if v >= 0 else 'S')}"
    pts = [('BE400', 50.77, 4.96), ('BE401', 50.84, 5.04), ('BE402', 50.89, 4.94), ('RW22R', 50.76, 4.78)]       # points fictifs

    def belgian(shift=0.0):
        """Page be-coding INVENTÉE ; `shift` déplace de plusieurs minutes la latitude du 2e point dans la LISTE seulement (le cap imprimé n'en tient pas compte)."""
        rows = ['AIP XXXX AD 2.MIL-EBXX-IAC.20', 'MIPS RNP ARINC CODING', 'EBXX RNP RWY 22R COORDINATES AND CODING (PAGE 1-28):', 'WAYPOINTS COORDINATES:']
        for i, (n, la, lo) in enumerate(pts):
            rows.append(f"{n}: {dm(la + (shift if i == 1 else 0), False)} {dm(lo, True)}" + (' - IAF' if i == 0 else ' - THR 22R / MAPT' if i == 3 else ''))
        rows += ['Path Role of the Turn Altitude Speed Vertical Path', 'Seq Number WP Name Fly-Over Course (T°)', 'Terminator FIX Direction Constraint Constraint Angle']
        for i, (n, la, lo) in enumerate(pts):
            if i == 0:
                rows.append(f'010 IF {n} IAF 4000/3000')
                continue
            brg, nm = P.bearing_nm((pts[i - 1][1], pts[i - 1][2]), (la, lo))
            rows.append(f'{i * 10 + 10:03d} TF {n} {"MAPT" if i == 3 else "Other"} {brg:05.1f} ' + ('+366 -5.24%(3.00°)' if i == 3 else '@ 3000 -2.9%'))
        return rows + ['RNP ARINC CODING', 'C AIM XXXX AIRAC AMDT 010/2026']
    be = belgian()
    c.eq(P.detect_layout(be), 'be-coding', 'the Belgian ARINC coding page is recognised', what='detect_layout')
    c.ok(P.waypoint_coords(be).get('BE401') == P.be_coords(be)['BE401'] and abs(P.be_coords(be)['BE401'][0] - 50.84) < 1e-3, str(P.be_coords(be)), 'degrees and decimal minutes list co-ordinates are read (also by waypoint_coords)')
    d = O.document_from_rows('EBXX', 'be.pdf', be, '2026-10-01')
    f = d['formats'][0]
    c.eq((len(d['procedures']), f['layout'], f['ok'], M.verify(d), d['procedures'][0]['kind'], [p['lat'] is not None for p in d['procedures'][0]['points']]),
         (1, 'be-coding', True, [], 'APP', [True] * 4), 'OCR rows of a Belgian page: table kept, every point resolved from the list, geometry check clean, proc_manual.verify finds nothing', what='document_from_rows')
    c.eq((d['procedures'][0]['source']['file'], d['procedures'][0]['source']['ref']), ('be.pdf', 'ocr:ead-basic/EB/be.pdf'), "OCR: source.file is the document's name, without the ocr: mark of ref", what='OCR source.file')
    d2 = O.document_from_rows('EBXX', 'be.pdf', belgian(shift=0.2), '2026-10-01')
    c.ok([(x['status'], x['doubt']) for x in d2['procedures']] == [('doubt', 'geometry')] and any('À VÉRIFIER' in x for x in d2['warnings']) and not any('NON retenue' in x for x in d2['warnings']) and d2['formats'][0]['ok'],
         str(d2['formats']), 'one corrupted list co-ordinate: the table is kept as a doubt (code geometry) by the geometry check and reported')
    d3 = O.document_from_rows('EBXX', 'be.pdf', [r for r in be if not r.startswith('RW22R:')], '2026-10-01')
    c.ok([(x['status'], x['doubt']) for x in d3['procedures']] == [('doubt', 'unresolved')] and any('À VÉRIFIER' in x and 'RW22R' in x for x in d3['warnings']) and not any('NON retenue' in x for x in d3['warnings'])
         and d3['formats'][0]['ok'] and [q['lat'] for q in d3['procedures'][0]['points']][-1] is None, str(d3['warnings']),
         'a point missing from the list: the table is KEPT, never completed, the procedure is a doubt (code unresolved) and the missing point is named; no « NON retenue »')

    # variante SID : le cap vrai n'est imprimé que pour certains TF (et le CF) ; table gardée avec l'avertissement si tout est résolu et simple, rejetée sinon
    sp = [('BE408', 50.77, 4.78), ('BE409', 50.80, 4.81), ('BE600', 50.69, 4.89), ('BE900', 50.66, 4.95)]       # points fictifs

    def sid(bump=0.0, hold=False, clash=False):
        """Page be-coding SID INVENTÉE, deux tables : cap vrai absent des TF du milieu, présent sur le dernier ; `bump` le falsifie, `hold` met une attente (HM), `clash` donne à BE600 deux
        coordonnées différentes dans les deux listes."""
        rows = ['AIP XXXX AD 2.MIL-EBXX-SID.07', 'MIPS SID (RNAV1) ARINC CODING']
        for t, label in enumerate(('04F', '22F')):
            rows += [f'SID BE {label} (RNAV1) COORDINATES AND CODING (PAGE 1-8):', 'WAYPOINTS COORDINATES:']
            for n, la, lo in sp:
                rows.append(f"{n}: {dm(la + (0.05 if clash and t and n == 'BE600' else 0), False)} {dm(lo, True)}")
            rows += ['Path Role of the Turn Altitude Speed Vertical Path', 'Seq Number WP Name Fly-Over Course (T°)', 'Terminator FIX Direction Constraint Constraint Angle']
            brg, nm = P.bearing_nm((sp[2][1], sp[2][2]), (sp[3][1], sp[3][2]))
            rows += ['010 CF BE408 Other 038.8 MAX 1000', '020 TF BE409 Other', '030 ' + ('HM' if hold else 'TF') + ' BE600 Other @ 3000', f'040 TF BE900 Other {brg + bump:05.1f} 4000/3000']
        return rows + ['CHANGES: TEST']
    sd = O.document_from_rows('EBXX', 'sid.pdf', sid(), '2026-10-01')
    c.eq((P.detect_layout(sid()), len(sd['procedures']), sd['formats'][0]['ok'], M.verify(sd), sd['procedures'][0]['kind'], sd['procedures'][0]['name'], all(p['lat'] is not None for p in sd['procedures'][0]['points'])),
         ('be-coding', 2, True, [], 'SID', 'BE 04F', True), 'SID variant: two tables kept (points resolved, only IF/TF/CF/DF, printed course passes the geometry check), kind SID, name from the title', what='document_from_rows')
    c.ok(sum('cap non imprimé : géométrie non contrôlable' in x for x in sd['warnings']) == 2, str(sd['warnings']), 'each kept SID table carries the warning "cap non imprimé : géométrie non contrôlable"')
    sb = O.document_from_rows('EBXX', 'sid.pdf', sid(bump=5.0), '2026-10-01')
    c.ok(len(sb['procedures']) == 2 and [x['doubt'] for x in sb['procedures'] if x['status'] == 'doubt'] == ['geometry', 'geometry'] and not any('NON retenue' in x for x in sb['warnings']), str(sb['warnings']),
         'SID variant: the one printed course that exists is checked, 5 degrees off keeps the tables that print it as doubts (code geometry)')
    sh = O.document_from_rows('EBXX', 'sid.pdf', sid(hold=True), '2026-10-01')
    c.ok(sh['procedures'] == [] and sh['formats'][0]['reason'] == 'counts' and any('hors de IF' in x for x in sh['warnings']), str(sh['warnings']), 'SID variant: a leg other than IF/TF/CF/DF (a hold) drops the table: a polyline would be wrong')
    sc = O.document_from_rows('EBXX', 'sid.pdf', sid(clash=True), '2026-10-01')
    c.ok(sc['procedures'] == [] and any('deux listes' in x for x in sc['warnings']), str(sc['warnings']), 'the same point with two different co-ordinates in two lists of the page: both tables are dropped (no choice between concurrent readings)')


# ------------------------------------------------------------------------------------------------ UK STAR coding tables read by OCR (static)
def _dms_compact(v, lon, hemi_first):
    """Coordonnée INVENTÉE en degrés-minutes-secondes compacts : « 512834.45N » (Royaume-Uni, hémisphère derrière) ou « N471234.56 » (Autriche, devant)."""
    a = abs(v)
    d = int(a)
    m = int((a - d) * 60)
    sec = round(((a - d) * 60 - m) * 60, 2)
    h = ('E' if v >= 0 else 'W') if lon else ('N' if v >= 0 else 'S')
    body = f'{d:0{3 if lon else 2}d}{m:02d}{sec:05.2f}'
    return h + body if hemi_first else body + h


@case('K16', 'UK STAR coding tables read by OCR: parser, geometry check, rejection', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: OCR included; its output is installed only through the geometry check, a table with disagreeing counts is rejected, never completed')
def k16(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    O = importlib.import_module('proc_ocr')
    M = importlib.import_module('proc_manual')
    pts = [('ALFAB', 51.30, -0.60), ('BRAVO', 51.35, -0.40), ('CHARL', 51.42, -0.25), ('DELTA', 51.50, -0.20)]          # points fictifs

    def page(bump=0.0, drop_lon=False, no_seq=False, letter_o=False):
        """Lignes INVENTÉES d'une page uk-star dans l'ordre vu par l'OCR : latitude [cap magnétique] / tronçon / longitude [(cap vrai)] ; `bump` falsifie un cap vrai,
        `drop_lon` supprime la longitude d'un tronçon, `no_seq` efface un numéro de séquence, `letter_o` met un « O » à la place d'un zéro dans une coordonnée."""
        rows = ['UNITED KINGDOM AIP AD 2.EGXX-7-13', '1 Jan 2026', 'Standard Instrument Arrival Coding Tables', 'LONDON TEST ALFAB 1H', 'Path Course/',
                'Sequence Waypoint Fly- Magnetic| Distance Turn Level Speed Navigation', 'Designator Term- Co-ordinates Track', 'Number Name over Variation (NM) Direction Constraint|Constraint| Performance',
                "inator 'm (°t)"]
        for i, (n, la, lo) in enumerate(pts):
            lat, lon = _dms_compact(la, False, False), _dms_compact(lo, True, False)
            if letter_o and i == 1:
                lat = lat.replace('0', 'O', 1)
            if i == 0:
                rows += [lat, f'ALFAB1H 001 IF {n} FL100 RNAV1', lon]
                continue
            brg, nm = P.bearing_nm((pts[i - 1][1], pts[i - 1][2]), (la, lo))
            seq = '' if no_seq and i == 2 else f'{i + 1:03d} '
            cells = f'0.3 {nm:.1f}' + (' LEFT' if i == 2 else '') + (' +3000 -250' if i == 3 else '')
            rows += [f'{round(brg) - 1:03d}° {lat}', f'ALFAB1H {seq}TF {n} {cells} RNAV1']
            if not (drop_lon and i == 2):
                rows.append(f'{lon} ({brg + (bump if i == 2 else 0):05.1f}°)')
        return rows + ['CHANGE (1/26): TEST.', 'CIVIL AVIATION AUTHORITY AMDT 1/2026']
    rows = page()
    c.eq(P.detect_layout(rows), 'uk-star', 'the arrival coding tables header is recognised, before uk-app', what='detect_layout')
    c.eq(P.detect_layout(_uk_page(P, [('TESTA', 51.4762, -0.7516), ('TESTB', 51.4767, -0.6711), ('RW09L', 51.4775, -0.4850)])), 'uk-app', 'an approach page is still uk-app', what='detect_layout')
    parsed = P.parse_uk_star(rows)
    t = parsed['tables'][0]
    lg = t['legs']
    c.eq((parsed['kind'], len(parsed['tables']), t['name'], t['kind'], t['transition'], [x['id'] for x in lg]), ('STAR', 1, 'ALFAB 1H', 'STAR', None, ['ALFAB', 'BRAVO', 'CHARL', 'DELTA']), 'one STAR, name from its title, legs in order', what='parse_uk_star')
    c.eq((lg[0]['alt'], lg[1]['turn'], lg[2]['turn'], lg[3]['alt'], lg[3]['kt'], lg[1]['over']), ({'type': 'at', 'ft': 10000}, None, 'L', {'type': 'min', 'ft': 3000}, 250, None),
         'FL100 level, turn LEFT read as L, level and speed constraints, fly-over unread (None)', what='cells')
    c.ok(lg[1]['nm'] and abs(lg[1]['lat'] - 51.35) < 1e-4 and abs(lg[1]['lon'] + 0.40) < 1e-4 and lg[1]['crs'] and lg[1]['true'], str(lg[1]),
         'distance, latitude above and longitude below, magnetic and true courses read')
    c.ok(sum('survol non lu (OCR)' in w for w in parsed['warnings']) == 1, str(parsed['warnings']), 'one "fly-over unread" warning per table')
    c.eq(_gaps(lg), [], 'a coherent table has no geometry gap', what='check_geometry')
    recs, w = P.records_uk_app('EGXX', parsed, 'x.pdf', '2026-10-01', '2026-01-01')
    c.eq((len(recs), recs[0]['status'], recs[0]['kind'], recs[0]['id'], recs[0]['points'][2].get('turn')), (1, 'check', 'STAR', 'EGXX.STAR.ALFAB1H.RWALL', 'L'), 'common schema: status check, kind STAR kept', what='records_uk_app')
    doc = O.document_from_rows('EGXX', 'p.pdf', rows, '2026-10-01')
    f = doc['formats'][0]
    c.eq((len(doc['procedures']), f['layout'], f['ok'], M.verify(doc)), (1, 'uk-star', True, []), 'document_from_rows: table kept, ok True, proc_manual.verify finds nothing to refuse', what='document_from_rows')
    fixed = O.document_from_rows('EGXX', 'p.pdf', page(no_seq=True, letter_o=True), '2026-10-01')
    c.ok(len(fixed['procedures']) == 1 and fixed['formats'][0]['ok'], str(fixed['formats']), 'a missing sequence number and a letter O read for a zero in a co-ordinate are repaired by the normaliser')
    cut = P.parse_uk_star(page(drop_lon=True))
    c.ok(cut['tables'] == [] and any('NON retenue' in x for x in cut['warnings']), str(cut['warnings']), 'a leg without its longitude: the table is rejected, never completed')
    badp = P.parse_uk_star(page(bump=5.0))
    c.ok(_gaps(badp['tables'][0]['legs']), 'geometry check', 'a printed true course 5 degrees off is caught by the geometry check')
    r2, w2 = P.records_uk_app('EGXX', badp, 'x.pdf', '2026-10-01')
    c.ok([(x['status'], x['doubt']) for x in r2] == [('doubt', 'geometry')] and not any('NON retenue' in x for x in w2), str(w2), 'and that table is kept as a doubt (code geometry), not dropped')
    bd = O.document_from_rows('EGXX', 'p.pdf', page(bump=5.0), '2026-10-01')
    c.ok([(x['status'], x['doubt']) for x in bd['procedures']] == [('doubt', 'geometry')] and bd['formats'][0]['ok'], str(bd['formats']), 'document_from_rows keeps the table as a doubt (code geometry), the page is read')


# ------------------------------------------------------------------------------------------------ Austrian RNAV transition coding tables read by OCR (static)
@case('K17', 'Austria transition coding tables read by OCR: parser, geometry check, rejection', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: OCR included; its output is installed only through the geometry check, a table with disagreeing counts is rejected, never completed')
def k17(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    O = importlib.import_module('proc_ocr')
    M = importlib.import_module('proc_manual')
    pts = [('ALFAB', 47.30, 14.60), ('WG101', 47.35, 14.80), ('WG102', 47.42, 14.95), ('RONOT', 47.50, 15.10)]          # points fictifs

    def page(bump=0.0, drop_lat=False):
        """Lignes INVENTÉES d'une page at-coding dans l'ordre vu par l'OCR : latitude [cap magnétique] / tronçon / longitude [(cap vrai)] ; `bump` falsifie un cap vrai,
        `drop_lat` supprime la latitude d'un tronçon."""
        rows = ['Instrument Flight Procedure', 'RNAV ARRIVAL TESTVILLE', 'TRANSITION to RWY 16C and RWY 34C RWY 16C/34C', 'Designator Route Remarks', 'ALFAB 1 N', 'Alfab one november transition',
                'RNAV Transition Coding Table of ALFAB 1 N', 'Waypoint Course/ Constraints', 'Path Track DIST Turn Navigation', 'Remarks', 'Terminator Identifier Flyover Coordinates °MAG NM Direction Level Speed Specification', '( True)']
        for i, (n, la, lo) in enumerate(pts):
            lat, lon = _dms_compact(la, False, True), _dms_compact(lo, True, True)
            if i == 0:
                rows += [lat, f'IF {n} no A9000+ RNAV 1', lon]
                continue
            brg, nm = P.bearing_nm((pts[i - 1][1], pts[i - 1][2]), (la, lo))
            cells = f'{nm:.1f}' + (' left' if i == 3 else '') + ' A8000+' + (' K220-' if i == 2 else '')
            if not (drop_lat and i == 2):
                rows.append(f'{lat} {round(brg) - 1:03d}°')
            rows += [f'TF {n} {"yes" if i == 3 else "no"} {cells} RNAV 1', f'{lon} ({brg + (bump if i == 2 else 0):05.1f}°)']
        return rows + ['Designator Route Remarks', 'AIRAC AMDT 1 / 1 JAN 2026 TEST AD 2 MAP']
    rows = page()
    c.eq(P.detect_layout(rows), 'at-coding', 'the transition coding table header is recognised, before am-coding', what='detect_layout')
    parsed = P.parse_at_coding(rows)
    t = parsed['tables'][0]
    lg = t['legs']
    c.eq((parsed['kind'], len(parsed['tables']), t['name'], t['kind'], t['runways'], [x['id'] for x in lg]), ('STAR', 1, 'ALFAB 1 N', 'STAR', ['16C', '34C'], ['ALFAB', 'WG101', 'WG102', 'RONOT']),
         'one transition, name from its title, runways from the page title, legs in order', what='parse_at_coding')
    c.eq((lg[0]['alt'], lg[2]['kt'], lg[3]['turn'], lg[3]['over'], lg[1]['over'], lg[1]['alt']), ({'type': 'min', 'ft': 9000}, 220, 'L', True, None, {'type': 'min', 'ft': 8000}),
         'level and speed constraints, turn left read as L, fly-over yes -> True and no -> None', what='cells')
    c.ok(abs(lg[1]['lat'] - 47.35) < 1e-4 and abs(lg[1]['lon'] - 14.80) < 1e-4 and lg[1]['nm'] and lg[1]['crs'] and lg[1]['true'], str(lg[1]), 'compact co-ordinates, distance, magnetic and true courses read')
    c.eq(_gaps(lg), [], 'a coherent table has no geometry gap', what='check_geometry')
    recs, w = P.records_uk_app('LOXX', parsed, 'x.pdf', '2026-10-01', '2026-01-01', 'LO')
    c.eq((len(recs), recs[0]['status'], recs[0]['kind'], recs[0]['id']), (1, 'check', 'STAR', 'LOXX.STAR.ALFAB1N.RWALL'), 'common schema: status check, kind STAR', what='records_uk_app')
    doc = O.document_from_rows('LOXX', 'p.pdf', rows, '2026-10-01')
    f = doc['formats'][0]
    c.eq((len(doc['procedures']), f['layout'], f['ok'], M.verify(doc)), (1, 'at-coding', True, []), 'document_from_rows: table kept, ok True, proc_manual.verify finds nothing to refuse', what='document_from_rows')
    cut = P.parse_at_coding(page(drop_lat=True))
    c.ok(cut['tables'] == [] and any('NON retenue' in x for x in cut['warnings']), str(cut['warnings']), 'a leg without its latitude: the table is rejected, never completed')
    badp = P.parse_at_coding(page(bump=5.0))
    c.ok(_gaps(badp['tables'][0]['legs']), 'geometry check', 'a printed true course 5 degrees off is caught by the geometry check')
    r2, w2 = P.records_uk_app('LOXX', badp, 'x.pdf', '2026-10-01')
    c.ok([(x['status'], x['doubt']) for x in r2] == [('doubt', 'geometry')] and not any('NON retenue' in x for x in w2), str(w2), 'and that table is kept as a doubt (code geometry), not dropped')
    bd = O.document_from_rows('LOXX', 'p.pdf', page(bump=5.0), '2026-10-01')
    c.ok([(x['status'], x['doubt']) for x in bd['procedures']] == [('doubt', 'geometry')] and bd['formats'][0]['ok'], str(bd['formats']), 'document_from_rows keeps the table as a doubt (code geometry), the page is read')

    # pypdf text-layer order: the lines of a leg are interleaved (course alone before, co-ordinates inline or apart, true course and distance after)
    def text_page(variant, drop_lon=False):
        """Lignes INVENTÉES d'une page at-coding dans l'ordre de la couche de texte : forme « LO » (coordonnées collées N471234.56) ou forme « LZ » (« 48°37'14 , 9 4 "N », virgules, chiffres espacés)."""
        def sym(v, lon, spaced):
            t = round(abs(v) * 360000)
            deg, mn, sec, fr = t // 360000, t // 6000 % 60, t // 100 % 60, t % 100
            fs = f'{fr // 10} {fr % 10}' if spaced else f'{fr:02d}'
            return f'{deg:03d}' if lon else f'{deg:02d}', f"{mn:02d}'{sec:02d} , {fs}\"" + ('E' if lon else 'N')
        rows = ['RNAV ARRIVAL TESTVILLE', 'TRANSITION to RWY 16C and RWY 34C RWY 16C/34C']
        rows += ['Designator Route Remarks', 'ALFAB 1 N', 'RNAV Transition Coding Table of ALFAB 1 N'] if variant == 'LO' else ['RNAV 1 STAR Coding Table: ALFAB 2K']
        rows += ['Course/', 'Waypoint Constraints', 'Path Track DIST Turn Navigation', 'Remarks', 'Terminator ° MAG NM Direction Specification', 'Identifier Flyover Coordinates Level Speed', '(° True)']
        for i, (n, la, lo) in enumerate(pts):
            if variant == 'LO':
                lat, lon = _dms_compact(la, False, True), _dms_compact(lo, True, True)
            else:
                (a, b), (d, e) = sym(la, False, i % 2 == 0), sym(lo, True, i % 2 == 1)
                lat, lon = f'{a}°{b}', f'{d}°{e}'
            if i == 0:
                rows += [f'IF {n} no {lat} {lon} A9000+ RNAV 1'] if variant == 'LO' else [lat, f'IF {n} NO - - - A 10000+ - RNAV 1', lon]
                continue
            brg, nm = P.bearing_nm((pts[i - 1][1], pts[i - 1][2]), (la, lo))
            mag = f'{round(brg) - 1:03d}'
            if variant == 'LO':
                if i == 1:
                    rows += [f'{mag}°', f'TF {n} no {lat} {lon} A8000+ RNAV 1', f'({brg:05.1f}) {nm:.1f}']
                else:
                    rows += [f'{lat} {mag}°', f'TF {n} {"yes" if i == 3 else "no"} A8000+' + (' K220-' if i == 2 else '') + ' RNAV 1',
                             f'{lon} ({brg:05.1f}°) {nm:.1f}' + (' left' if i == 3 else '')]
            else:
                rows += [f'{lat} {mag} °', f'TF {n} NO {nm:.1f} NM '.replace('.', ',') + ('LEFT' if i == 3 else '-') + f' A {8000 + i}+ - RNAV 1']
                if not (drop_lon and i == 2):
                    rows.append(f'{lon} ( {brg:05.1f} °)'.replace('.', ','))
        return rows + ['RNAV Holding', 'AIRAC AMDT 1 / 1 JAN 2026']
    for variant in ('LO', 'LZ'):
        tp = text_page(variant)
        c.eq(P.detect_layout(tp), 'at-coding', f'{variant}-like text-order page is recognised (the Slovak title is tested before sia-code)', what=f'{variant} detect_layout')
        parsed = P.parse_at_coding(tp)
        lg = parsed['tables'][0]['legs'] if parsed['tables'] else []
        c.eq(([t['name'] for t in parsed['tables']], [x['id'] for x in lg], len(parsed['warnings'])), ([('ALFAB 1 N' if variant == 'LO' else 'ALFAB 2K')], ['ALFAB', 'WG101', 'WG102', 'RONOT'], 0),
             f'{variant}-like: one table, four legs, whatever the interleaving of lines', what=f'{variant} tables')
        brg, nm = P.bearing_nm((pts[0][1], pts[0][2]), (pts[1][1], pts[1][2]))
        c.ok(lg and abs(lg[1]['lat'] - 47.35) < 1e-4 and abs(lg[1]['lon'] - 14.80) < 1e-4 and lg[1]['crs'] == round(brg) - 1 and abs(lg[1]['true'] - brg) < 0.06 and lg[1]['nm'] == float(f'{nm:.1f}'),
             str(lg[1:2]), f'{variant}-like: co-ordinates, magnetic course before, true course and distance after')
        c.eq((lg[3]['turn'], lg[3]['over'], lg[0]['lat'] is not None), ('L', True if variant == 'LO' else None, True), f'{variant}-like: turn read from the line after the leg', what=f'{variant} cells')
        c.eq(_gaps(lg), [], f'{variant}-like: the geometry check finds nothing', what=f'{variant} geometry check')
    lz = P.parse_at_coding(text_page('LZ'))['tables'][0]['legs']
    c.eq((lz[1]['alt'], lz[0]['alt']), ({'type': 'min', 'ft': 8001}, {'type': 'min', 'ft': 10000}), 'LZ-like: « A 10000+ » with a space is read as a level', what='LZ level')
    cut = P.parse_at_coding(text_page('LZ', drop_lon=True))
    c.ok(cut['tables'] == [] and any('NON retenue' in x for x in cut['warnings']), str(cut['warnings']), 'LZ-like: a leg without its longitude rejects the table, never completed')


# ------------------------------------------------------------------------------------------------ co-ordinates printed in a list (static)
@case('K20', 'Waypoint co-ordinate lists complete a route page; the geometry check runs after', 'K', static=True, rule='aerodb DECISIONS 28 Oct 2026: co-ordinates read from a list fill the points, then the geometry check judges the completed procedure')
def k20(c):
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()

    pts = {'AAAAA': (47.20, 13.10), 'BBBBB': (47.35, 13.40), 'CCC': (47.50, 13.55), 'DDD': (47.60, 13.00), 'EEE': (47.80, 13.20)}      # points fictifs

    def parts(v, lon):
        tot = round(abs(v) * 3600, 1)
        return int(tot // 3600), int(tot % 3600 // 60), round(tot % 60, 1)

    def fmt_spaced(name, lat, lon):
        (a, b, s), (d, e, f) = parts(lat, False), parts(lon, True)
        return [f'{name} {a:02d} {b:02d} {s:04.1f}N {d:03d} {e:02d} {f:04.1f}E']

    def fmt_signs(name, lat, lon):
        (a, b, s), (d, e, f) = parts(lat, False), parts(lon, True)
        return [name, f'{a:02d}°{b:02d}\'{s:05.2f}"N', f'{d:03d}°{e:02d}\'{f:05.2f}"E']

    def fmt_prefix(name, lat, lon):
        (a, b, s), (d, e, f) = parts(lat, False), parts(lon, True)
        return [f'{name} N{a:02d}{b:02d}{s:05.2f} E{d:03d}{e:02d}{f:05.2f}']

    def route_page():
        def leg(a, b):
            brg, nm = P.bearing_nm(pts[a], pts[b])
            return f'{round(brg):03d} {round(nm, 1)} A4000+'
        return ['AD 2 EDXX 3-1-2 TESTBUCH', '01 JAN 2026 AIP TESTLAND', 'TESTBURG AIRPORT STANDARD INSTRUMENT ARRIVAL ROUTES', 'RWY 09/27 (STAR)', 'General Remarks', '1 NOT TO BE USED DURING TESTS.',
                'Designator IdentificationSignificant Points MagTrack° Distance(NM) Minimum Altitude /Flight Level Procedure Remarks /Procedure Timesheet', '12 3 4 5 6',
                'AAAAA 1T AAAAA ONE TANGO', 'AAAAA', leg('AAAAA', 'BBBBB'), 'BBBBB', leg('BBBBB', 'CCC'), 'CCC',
                'DDD 3T DDD THREE TANGO', 'DDD', leg('DDD', 'EEE'), 'EEE', 'AMDT 01/26 © TEST']

    def list_page(moved=0.0):
        lat_b, lon_b = pts['BBBBB']
        return (['WAYPOINTS', 'Name Coordinates'] + fmt_spaced('AAAAA', *pts['AAAAA']) + fmt_spaced('BBBBB', lat_b + moved, lon_b) + fmt_signs('CCC', *pts['CCC'])
                + fmt_prefix('DDD', *pts['DDD']) + fmt_prefix('EEE', *pts['EEE']))
    got = P.waypoint_coords(list_page())
    c.ok(set(got) == set(pts) and all(abs(got[k][0] - pts[k][0]) < 1e-3 and abs(got[k][1] - pts[k][1]) < 1e-3 for k in pts), str(got), 'three printed forms (spaced, symbols on separate rows, hemisphere prefix) all read')
    c.eq(P.waypoint_coords(['SOUTH 12 34 56N 123 45 67E', 'AAAAA 47 30 00S 013 00 00W'])['AAAAA'], (-47.5, -13.0), 'southern and western hemispheres are negative; minutes or seconds >= 60 are not read', what='hemispheres')
    d = P.build_pdf_dir('EDXX', ['route.pdf', 'list.pdf'], lambda n: [route_page()] if n == 'route.pdf' else [['CHART'], list_page()], '2026-01-01')
    pr = {p['id']: p for p in d['procedures']}
    c.ok(len(d['procedures']) == 2 and all(p['lat'] is not None and p.get('coords_from') == 'liste' for pr_ in d['procedures'] for p in pr_['points']), str(d['formats']),
         'both routes kept, every point filled from the list and marked coords_from liste')
    c.ok(not any('coordonnées absentes' in x for x in d['warnings']), str(d['warnings']), 'no "coordinates missing" warning once resolved')
    c.eq([(f['file'], f.get('page'), f['ok']) for f in d['formats']], [('list.pdf', None, False), ('route.pdf', 1, True)], 'formats: one entry per (file, page) read, one summary entry for the list document whose pages are all unknown', what='formats')
    alone = P.build_pdf_dir('EDXX', ['route.pdf'], lambda n: [route_page()], '2026-01-01')
    c.ok(len(alone['procedures']) == 2 and any('coordonnées absentes' in x for x in alone['warnings']) and alone['procedures'][0]['points'][0]['lat'] is None, str(alone['warnings']),
         'without the list the points stay unresolved and the warning stays')
    bad = P.build_pdf_dir('EDXX', ['route.pdf', 'list.pdf'], lambda n: [route_page()] if n == 'route.pdf' else [list_page(moved=0.2)], '2026-01-01')
    c.ok(len(bad['procedures']) == 2 and [(x['name'][:3], x['doubt']) for x in bad['procedures'] if x['status'] == 'doubt'] == [('AAA', 'geometry')] and [x['name'][:3] for x in bad['procedures'] if x['status'] == 'check'] == ['DDD']
         and not any('NON retenue' in x for x in bad['warnings']) and not bad['formats'][0]['ok'],
         str(bad['warnings']), 'a list that contradicts the printed distances keeps that procedure as a doubt (geometry check after resolution), the other one stays sure')
    first_only = P.build_pdf_dir('EDXX', ['chart.pdf'], lambda n: [['SOME CHART']], '2026-01-01')
    c.ok(first_only['formats'][0]['ok'] is False and first_only['procedures'] == [] and first_only['formats'][0]['pages'] == 1, str(first_only['formats']), 'a document whose pages are all unknown gets one summary entry')


# ------------------------------------------------------------------------------------------------ the launcher's EAD Basic job (static)
@case('K22', 'EAD Basic job of the launcher: proc/ead-fetch (aerodb.fetchProcedures, commit 2)', 'K', static=True,
      rule='aerodb DECISIONS 28 Oct 2026 (commit 2): one aerodrome per gesture, installed in proc/manual/, only those two paths committed, no secret anywhere')
def k22(c):
    import importlib
    import json
    import os
    import subprocess
    import sys
    import tempfile
    import threading
    import time
    from pathlib import Path
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    RJ = _regen()
    EAD = importlib.import_module('proc_ead')
    P = _proc()
    DS = importlib.import_module('data_sync')
    USER, PASS = 'k22-user-zq', 'K22-s3cr3t-pw!'
    # args check: one aerodrome, nothing else
    ck = RJ.REGISTRY[('proc', 'ead-fetch')][1]
    c.eq(ck({'icao': ' egll '}), {'icao': 'EGLL'}, 'the code is upper-cased and trimmed', what='args')
    refused = [{'icao': 'LFBD,LFBO'}, {'icao': 'LFBD', 'all': True}, {}, {'icao': 'LFB'}, {'icao': 'LFBDX'}, {'icao': 12}, {'icao': 'LF*D'}, {'icao': 'LF BD'}, {'icao': ['LFBD']}, None, 'LFBD']
    c.eq([a for a in refused if ck(a) is not None], [], 'a list, a wildcard, an extra key or a bad length is refused (→ 400)', what='args')
    c.eq(RJ.Jobs(RJ.REGISTRY).start('proc', 'ead-fetch', {'icao': 'LFBD,LFBO'}).get('status'), 400, 'the launcher answers 400 to a list', what='start')
    c.eq((ck({'icao': 'LFBD'}), ck({'icao': 'lfpg'}), ck({'icao': 'LIRF'}), RJ.Jobs(RJ.REGISTRY).start('proc', 'ead-fetch', {'icao': 'LFBD'}).get('status')), (None, None, {'icao': 'LIRF'}, 400),
         'France is never read through EAD: ead-fetch refuses a code « LF » (the State rule is the source table of tools/regen/proc.py)', what='LF excluded')

    pos = [('TESTA', 51.00, -1.00), ('TESTB', 51.10, -0.50), ('TESTC', 51.20, -0.10)]               # fictitious points: a tool test, not AIP data
    pts = []
    for i, (n, la, lo) in enumerate(pos):
        p = {'seq': i + 1, 'id': n, 'lat': la, 'lon': lo, 'alt': None, 'leg': 'IF' if i == 0 else 'TF'}
        if i:
            brg, nm = P.bearing_nm((pos[i - 1][1], pos[i - 1][2]), (la, lo))
            p['trk'], p['nm'] = round(brg, 1), round(nm, 1)
        pts.append(p)

    def doc_of(icao='EGXX'):
        return {'schema': 1, 'icao': icao, 'cycle': '2026-10-01', 'warnings': ['page 3 NON retenue'], 'procedures': [
            {'id': f'{icao}.STAR.TEST1A.RWALL', 'icao': icao, 'kind': 'STAR', 'name': 'TEST 1A', 'runways': [], 'transition': None,
             'points': json.loads(json.dumps(pts)), 'source': {'kind': 'ead-basic', 'ref': 'ead-basic/EG/x'}, 'status': 'check'}]}

    def git(cwd, *a):
        r = subprocess.run(DS.git_cmd('-C', str(cwd), *a), capture_output=True, text=True, encoding='utf-8', errors='replace', env=DS.git_env())
        return r.stdout

    def scene(td, creds=True):
        data, secrets = Path(td) / 'data', Path(td) / 'secrets'
        (data / 'proc' / 'manual').mkdir(parents=True)
        secrets.mkdir()
        if creds:
            (secrets / 'ead.json').write_text(json.dumps({'user': USER, 'password': PASS}))
        (data / 'proc' / 'manual' / 'index.json').write_text(json.dumps({'schema': 1, 'folder': 'manual', 'aerodromes': {'KSEA': {'SID': 1}}}))
        (data / 'notes.txt').write_text('first\n')
        (data / '.gitignore').write_text('local/\n')                                          # as the data repository template: the cache is never tracked
        git(data, 'init', '-q')
        git(data, 'add', '-A')
        git(data, '-c', 'user.name=T', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'initial')
        (data / 'notes.txt').write_text('first\nedited by the user, not staged\n')           # unrelated modified file
        (data / 'staged.txt').write_text('new file staged by the user\n')                    # unrelated staged file
        git(data, 'add', 'staged.txt')
        return data, secrets

    def ctx_of(data, secrets):
        return {'data': str(data), 'secrets': str(secrets), 'git_cmd': DS.git_cmd, 'git_env': DS.git_env}

    def run(ctx, icao='EGXX', job=None):
        return RJ.REGISTRY[('proc', 'ead-fetch')][0](job or RJ.Job('proc', 'ead-fetch', {'icao': icao}, author='TST'), {'icao': icao}, ctx)

    saved = (EAD.EadLibrary, EAD.fetch_ad, dict(os.environ))
    for k in ('EAD_USER', 'EAD_PASSWORD'):
        os.environ.pop(k, None)
    seen = {}

    class FakeLib:
        def __init__(self, user, password, say=print, keep=None, delay=0.0):
            seen['user'], self.say, self.ok = user, say, seen.get('open', True)

        def open(self):
            return self.ok

    def fake_fetch(lib, icao, out, say=print, step=None):
        say(f'{icao}: connecté en tant que {USER} avec le mot de passe {PASS}')               # a leak, to see it cleaned
        if step:
            step(f'{icao}: lecture de EI_AD_2_{icao}_24-3.pdf {PASS}', 3, 31, 'documents')       # the numbers of the reading: 3 documents read out of 31
        say(f'GET http://x/?j_username={USER}&j_password=' + EAD.urllib.parse.quote(PASS))
        Path(out).mkdir(parents=True, exist_ok=True)
        d = seen['doc'] if 'doc' in seen else doc_of(icao)
        (Path(out) / f'{icao}.json').write_text(json.dumps(d))
        if seen.get('during'):
            seen['during']()
        return d
    EAD.EadLibrary, EAD.fetch_ad = FakeLib, fake_fetch
    try:
        with tempfile.TemporaryDirectory() as td:
            data, secrets = scene(td, creds=False)
            ctx = ctx_of(data, secrets)
            r = run(ctx)
            c.eq(r, {'ok': False, 'reason': 'no-credentials'}, 'no secrets/ead.json and no variable: no-credentials, nothing run', what='no credentials')
            c.ok(not (data / 'proc' / 'manual' / 'EGXX.json').exists() and 'user' not in seen, str(seen), 'nothing was read or installed without credentials')
            os.environ.update(EAD_USER='envuser-k22', EAD_PASSWORD='env-pass-k22')
            r = run(ctx)
            c.ok(r.get('ok') and seen.get('user') == 'envuser-k22', f'{r} {seen}', 'EAD_USER / EAD_PASSWORD are the fallback of secrets/ead.json')
        for k in ('EAD_USER', 'EAD_PASSWORD'):
            os.environ.pop(k, None)

        # success: installed, committed, and only those two paths
        seen.clear()
        with tempfile.TemporaryDirectory() as td:
            data, secrets = scene(td)
            ctx = ctx_of(data, secrets)
            before = git(data, 'rev-parse', 'HEAD').strip()
            job = RJ.Job('proc', 'ead-fetch', {'icao': 'EGXX'}, author='TST')
            r = run(ctx, job=job)
            c.ok(r.get('ok') is True and r['icao'] == 'EGXX' and r['procedures'] == 1 and r['ocr'] is False and r['warnings'] == ['page 3 NON retenue'], str(r),
                 'success: ok, the aerodrome, one procedure installed, no OCR, the warnings of the reading')
            c.ok(r['stats']['procedures'] == 1 and r['stats']['dropped'] == 0 and set(r['stats']) == {'pages', 'read', 'rejected', 'procedures', 'dropped', 'doubt', 'reasons'} and r['file']['icao'] == 'EGXX'
                 and len(r['file']['procedures']) == 1, str(r)[:300], 'the result carries the same stats keys as the eAIP job and the installed file as written')
            v = job.view()
            c.eq((v['done'], v['total'], v['unit']), (3, 31, 'documents'), 'the job carries the numbers of the fetch steps (3 documents of 31): onProgress shows « 3/31 »', what='progress numbers')

            inst = json.loads((data / 'proc' / 'manual' / 'EGXX.json').read_text())
            idx = json.loads((data / 'proc' / 'manual' / 'index.json').read_text())
            c.ok(len(inst['procedures']) == 1 and sorted(idx['aerodromes']) == ['EGXX', 'KSEA'] and idx['aerodromes']['EGXX']['STAR'] == 1, str(idx),
                 'proc/manual/EGXX.json written, proc/manual/index.json merged (the other aerodromes kept)')
            head = git(data, 'rev-parse', 'HEAD').strip()
            c.ok(r['commit'] == head and head != before and git(data, 'rev-parse', 'HEAD~1').strip() == before, f"{r['commit']} {head}", 'one new commit, returned by the job')
            c.eq(sorted(git(data, 'show', '--name-only', '--format=', 'HEAD').split()), ['proc/manual/EGXX.json', 'proc/manual/index.json'],
                 'the commit holds ONLY the two installed paths', what='commit paths')
            c.ok(git(data, 'log', '-1', '--format=%s').startswith(':card_file_box: Procédures EGXX lues dans EAD Basic'), git(data, 'log', '-1', '--format=%s'),
                 'the commit message says what was read, from where, and that it is not operational')
            st = git(data, 'status', '--porcelain').splitlines()
            c.ok(' M notes.txt' in st and 'A  staged.txt' in st and len(st) == 2, str(st),
                 "the user's unrelated modified file is still modified and the staged one still staged, neither committed")
            c.ok(git(data, 'diff', '--cached', '--name-only').split() == ['staged.txt'], git(data, 'diff', '--cached', '--name-only'), 'the index holds only what the user staged')
            c.ok(not git(data, 'remote').strip(), git(data, 'remote'), 'no push (the repository has no remote and none was asked for)')
            # nothing secret in the job log, the result, the files of the tree, the commit
            blob = json.dumps(job.view()) + json.dumps(r)
            for f in data.rglob('*'):
                if f.is_file() and '.git' not in f.parts:
                    blob += f.read_text(encoding='utf-8', errors='replace')
            blob += git(data, 'log', '--format=%B%an%ae') + git(data, 'show', '--stat', 'HEAD')
            c.ok(USER not in blob and PASS not in blob and EAD.urllib.parse.quote(PASS) not in blob and any('<secret>' in x for x in job.view()['log']),
                 str(job.view()['log'][:3]), 'neither the user name nor the password (nor its encoded form) appears in the log, the result, a written file or the commit')
            # a second run of the same file: nothing changed, no empty commit, a warning
            r2 = run(ctx)
            c.ok(r2['ok'] and r2['commit'] is None and git(data, 'rev-parse', 'HEAD').strip() == head and any('no commit' in w for w in r2['warnings']), str(r2),
                 'the same reading again: installed, no empty commit, a warning instead')

        # git absent keeps ok, with commit None and a warning; a foreign file, a login refusal, a failing geometry, nothing read
        with tempfile.TemporaryDirectory() as td:
            data, secrets = scene(td)
            r = run({'data': str(data), 'secrets': str(secrets)})
            c.ok(r['ok'] and r['commit'] is None and any(w.startswith('git') for w in r['warnings']), str(r), 'without git the files are installed, commit None, a warning')
        with tempfile.TemporaryDirectory() as td:
            data, secrets = scene(td)
            ctx = ctx_of(data, secrets)
            (data / 'proc' / 'manual' / 'EGXX.json').write_text(json.dumps({'schema': 1, 'icao': 'EGXX', 'cycle': '2026-10-01', 'procedures': [
                {'id': 'EGXX.SID.A', 'kind': 'SID', 'status': 'official', 'source': {'kind': 'eaip'}}]}))
            r = run(ctx)
            c.ok(r['ok'] is False and r['reason'] == 'failed' and '--replace' in r['message'] and json.loads((data / 'proc' / 'manual' / 'EGXX.json').read_text())['procedures'][0]['id'] == 'EGXX.SID.A',
                 str(r), "another source's file is never overwritten: failed with the reason")
            seen['open'] = False
            r = run(ctx)
            c.ok(r['ok'] is False and r['reason'] == 'failed' and r['message'] == 'login refused', str(r), 'a refused login is failed, with its message')
            seen['open'] = True
            bad = doc_of()
            bad['procedures'][0]['points'][2]['nm'] += 2.0
            seen['doc'] = bad
            r = run(ctx)
            c.ok(r['ok'] is False and 'geometry check failed' in r['message'], str(r), 'a table that fails the geometry check is not installed')
            # the file written must be the one commit_outputs validates: a document of another aerodrome (or a procedure of another) is refused before anything is installed
            index_before = (data / 'proc' / 'manual' / 'index.json').read_bytes()
            other = doc_of()
            other['icao'] = 'EGYY'
            seen['doc'] = other
            r = run(ctx)
            c.ok(r['ok'] is False and 'is not EGXX' in r['message'] and not (data / 'proc' / 'manual' / 'EGYY.json').exists() and (data / 'proc' / 'manual' / 'index.json').read_bytes() == index_before, str(r)[:300],
                 'a document whose aerodrome is not the requested one is refused, nothing installed')
            other = doc_of()
            other['procedures'][0]['icao'] = 'EGYY'
            seen['doc'] = other
            r = run(ctx)
            c.ok(r['ok'] is False and 'is not EGXX' in r['message'] and (data / 'proc' / 'manual' / 'index.json').read_bytes() == index_before, str(r)[:300], 'and so is a procedure of another aerodrome in the right document')
            seen['doc'] = {**doc_of(), 'procedures': []}
            r = run(ctx)
            c.ok(r['ok'] is False and r['reason'] == 'failed' and 'no procedure' in r['message'], str(r), 'nothing read is failed, not an empty file installed')
            # EIDW, 29 Oct 2026: 31 documents downloaded, none with a known layout: the failure says what was seen, the stats are given, the log has the summary
            unknown = [{'file': f'EI_AD_2_EGXX_24-{i}.pdf', 'pages': 3, 'layout': None, 'fingerprint': None, 'ok': False, 'problems': ['disposition non reconnue']} for i in range(31)]
            seen['doc'] = {**doc_of(), 'procedures': [], 'formats': unknown}
            job = RJ.Job('proc', 'ead-fetch', {'icao': 'EGXX'}, author='TST')
            r = run(ctx, job=job)
            c.eq((r['ok'], r['reason'], r['stats']), (False, 'failed', {'pages': 31, 'read': 0, 'rejected': 31, 'procedures': 0, 'dropped': 0, 'doubt': 0, 'reasons': [['layout', 31]]}),
                 'a failure carries stats: 31 pages seen, none read, the reason counted', what='failure stats')
            c.eq(r['message'], 'no procedure could be read for this aerodrome: 31 document(s), 0 of 31 page(s) read (mise en page non reconnue ×31)',
                 'the message says how many documents and pages were seen, how many were read, and why not', what='failure message')
            c.ok(any('0 procédure(s) installée(s)' in x and '31 non lue(s)' in x for x in job.view()['log']), str(job.view()['log'][-2:]), 'the job log ends with the summary, failure or not')
            bad = doc_of()
            bad['procedures'][0]['points'][2]['nm'] += 2.0
            bad['formats'] = unknown[:2]
            seen['doc'] = bad
            r = run(ctx)
            c.ok(r['ok'] is False and 'geometry check failed' in r['message'] and r['stats']['pages'] == 2 and r['stats']['procedures'] == 0, str(r)[:300], 'a geometry failure carries the stats too')
            seen.pop('doc')

        # an OCR document written by THIS run is installed too (a stale one is ignored)
        with tempfile.TemporaryDirectory() as td:
            data, secrets = scene(td)
            ctx = ctx_of(data, secrets)
            ocr_file = data / 'local' / 'ead' / 'EGXX.ocr.json'
            ocr_file.parent.mkdir(parents=True)
            ocr = doc_of()
            ocr['procedures'][0]['id'] = 'EGXX.STAR.OCRD1A.RWALL'
            ocr_file.write_text(json.dumps(ocr))
            os.utime(ocr_file, (time.time() - 3600, time.time() - 3600))
            seen['doc'] = {**doc_of(), 'procedures': []}
            r = run(ctx)
            c.ok(r['ok'] is False, str(r), 'a stale OCR file of a former reading is not installed')
            seen['during'] = lambda: ocr_file.write_text(json.dumps(ocr))
            r = run(ctx)
            c.ok(r['ok'] and r['ocr'] is True and r['procedures'] == 1, str(r), 'an OCR document written by this run is verified and installed (alone when the main one is empty)')
            seen.pop('during')
            seen.pop('doc')

        # cancellation: raised by the next message, nothing installed, nothing committed; Jobs marks the state
        with tempfile.TemporaryDirectory() as td:
            data, secrets = scene(td)
            ctx = ctx_of(data, secrets)
            head = git(data, 'rev-parse', 'HEAD').strip()
            job = RJ.Job('proc', 'ead-fetch', {'icao': 'EGXX'}, author='TST')
            job._cancel.set()
            r = run(ctx, job=job)
            c.ok(r == {'ok': False, 'reason': 'cancelled'} and not (data / 'proc' / 'manual' / 'EGXX.json').exists() and git(data, 'rev-parse', 'HEAD').strip() == head,
                 str(r), 'a cancelled job answers cancelled, installs nothing and commits nothing')
            # through Jobs: a second start while one runs is 409; the cancel is seen between two messages
            gate = threading.Event()

            def slow_fetch(lib, icao, out, say=print, step=None):
                gate.set()
                for _ in range(300):
                    say('waiting')
                    time.sleep(0.02)
                return doc_of(icao)
            EAD.fetch_ad = slow_fetch
            jobs = RJ.Jobs(RJ.REGISTRY, ctx)
            s1 = jobs.start('proc', 'ead-fetch', {'icao': 'EGXX'})
            gate.wait(5)
            s2 = jobs.start('proc', 'ead-fetch', {'icao': 'EGYY'})
            c.ok(s1.get('ok') and s2.get('ok') is False and s2.get('status') == 409, f'{s1} {s2}', 'a second job while one runs is refused with 409')
            jobs.cancel(s1['job'])
            for _ in range(200):
                if jobs.cur.data['state'] != 'running':
                    break
                time.sleep(0.05)
            v = jobs.cur.view()
            c.ok(v['state'] == 'cancelled' and v['result'] == {'ok': False, 'reason': 'cancelled'} and not (data / 'proc' / 'manual' / 'EGXX.json').exists(), str(v['state']) + str(v['result']),
                 'Jobs marks the cancelled job cancelled, with the reason cancelled in its result')
    finally:
        EAD.EadLibrary, EAD.fetch_ad = saved[0], saved[1]
        os.environ.clear()
        os.environ.update(saved[2])
    # an error escaping a verb is cleaned before the job's log and the page (the security review of 29 Oct 2026)
    with tempfile.TemporaryDirectory() as tmp:
        sec = Path(tmp)
        (sec / 'ead.json').write_text(json.dumps({'user': USER, 'password': PASS}), encoding='utf-8')

        def boom(job, args, ctx):
            raise RuntimeError(f'GET https://{USER}:{PASS}@www.ead.eurocontrol.int/x;jsessionid=AbC123xyz?token=T0K3NVALUE&a=1 refused for {USER}')
        jobs = RJ.Jobs({('t', 'boom'): (boom, lambda a: {})}, {'secrets': str(sec)})
        jobs.start('t', 'boom', {})
        for _ in range(100):
            if jobs.cur.data['state'] != 'running':
                break
            time.sleep(0.02)
        v = json.dumps(jobs.cur.view())
        c.ok(jobs.cur.data['state'] == 'error' and all(x not in v for x in (USER, PASS, 'AbC123xyz', 'T0K3NVALUE')) and 'refused' in v, v[:300],
             "Jobs._run cleans an error: the workstation's EAD credentials, user:password@, jsessionid and token parameters never reach the log or the page")
    # EAD Basic is never read in bulk: 30 s at least between two ead-fetch starts (429 'too-soon' with the seconds left)
    quick = RJ.Jobs({('proc', 'ead-fetch'): (lambda job, a, ctx: {'ok': True}, lambda a: {})})
    s1 = quick.start('proc', 'ead-fetch', {})
    for _ in range(100):
        if quick.cur.data['state'] != 'running':
            break
        time.sleep(0.02)
    s2 = quick.start('proc', 'ead-fetch', {})
    c.ok(s1.get('ok') and s2.get('status') == 429 and s2.get('reason') == 'too-soon' and 25 <= s2.get('wait', 0) <= 30, f'{s1} {s2}',
         'a second ead-fetch within 30 s is refused too-soon, with the seconds left')
    quick.last[('proc', 'ead-fetch')] -= 31
    c.ok(quick.start('proc', 'ead-fetch', {}).get('ok'), quick.last, 'after 30 s a new reading starts')
    c.eq({k: v for k, v in RJ.MIN_GAP.items() if k[0] == 'proc'}, {('proc', 'ead-fetch'): 30, ('proc', 'fetch'): 30},
         'among the procedure readings, EAD Basic (one aerodrome) and the per-State download (whole States, 30 Oct) have a minimal gap; reading one French aerodrome by the eAIP has none (base/fetch has its own, K53)',
         what='MIN_GAP')


# ------------------------------------------------------------------------------------------------ the launcher's eAIP job (static)
@case('K23', 'eAIP job of the launcher: proc/eaip-fetch (aerodb.fetchProcedures for France)', 'K', static=True,
      rule='aerodb DECISIONS 28 Oct 2026 (LF by the SIA eAIP): one aerodrome per gesture, address computed by the tool, installed in proc/manual/, only those two paths committed')
def k23(c):
    import contextlib
    import importlib
    import io
    import json
    import subprocess
    import sys
    import tempfile
    import threading
    import time
    import urllib.error
    from pathlib import Path
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    RJ = _regen()
    P = importlib.import_module('proc_sia')
    EAD = importlib.import_module('proc_ead')
    DS = importlib.import_module('data_sync')
    fx = c.root / 'frame/aerodb/test/fixtures/eaip'

    def raises(fn, *a):
        try:
            fn(*a)
        except Exception:
            return True
        return False

    # args check: one aerodrome of France, nothing else
    ck = RJ.REGISTRY[('proc', 'eaip-fetch')][1]
    c.eq(ck({'icao': ' lfpo '}), {'icao': 'LFPO'}, 'the code is upper-cased and trimmed', what='args')
    refused = [{'icao': 'EGLL'}, {'icao': 'KSEA'}, {'icao': 'LFBD,LFBO'}, {'icao': 'LFBD', 'all': True}, {}, {'icao': 'LFB'}, {'icao': 'LFBDX'}, {'icao': 12},
               {'icao': 'LF*D'}, {'icao': ['LFBD']}, None, 'LFBD']
    c.eq([a for a in refused if ck(a) is not None], [], 'another State, a list, a wildcard, an extra key or a bad length is refused (-> 400)', what='args')
    c.eq(RJ.Jobs(RJ.REGISTRY).start('proc', 'eaip-fetch', {'icao': 'EGLL'}).get('status'), 400, 'the launcher answers 400 to a code outside France', what='start')
    # the address is computed here, with English month names, whatever the locale
    c.eq(P.eaip_url('2026-10-01'), 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_01_OCT_2026/FRANCE/AIRAC-2026-10-01', 'cycle 2026-10-01', what='eaip_url')
    c.eq(P.eaip_url('2026-10-29'), 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026/FRANCE/AIRAC-2026-10-29', 'cycle 2026-10-29', what='eaip_url')
    c.eq(P.eaip_url('2027-01-21').split('/')[5], 'eAIP_21_JAN_2027', 'the month is the English three letters', what='eaip_url')
    c.ok(raises(P.eaip_url, '2026-13-01') and raises(P.eaip_url, 'x') and raises(P.eaip_url, '../etc'), 'bad cycles', 'a cycle that is not a date is refused (nothing is a free address)')

    def pdfs_of(icao='LFBD'):
        return [n + '.pdf' for n in _eaip_names(c, icao)]

    def page_of(names):
        return ''.join(f'<a href="../Cartes/{n[5:9]}/{n}">{n}</a>' for n in names)

    def git(cwd, *a):
        r = subprocess.run(DS.git_cmd('-C', str(cwd), *a), capture_output=True, text=True, encoding='utf-8', errors='replace', env=DS.git_env())
        return r.stdout

    def scene(td):
        data = Path(td) / 'data'
        (data / 'proc' / 'manual').mkdir(parents=True)
        (data / 'proc' / 'manual' / 'index.json').write_text(json.dumps({'schema': 1, 'folder': 'manual', 'aerodromes': {'KSEA': {'SID': 1}}}))
        (data / 'notes.txt').write_text('first\n')
        (data / '.gitignore').write_text('local/\n')
        git(data, 'init', '-q')
        git(data, 'add', '-A')
        git(data, '-c', 'user.name=T', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'initial')
        (data / 'notes.txt').write_text('first\nedited by the user, not staged\n')
        return data

    def ctx_of(data):
        return {'data': str(data), 'secrets': str(Path(data).parent / 'secrets'), 'git_cmd': DS.git_cmd, 'git_env': DS.git_env}

    asked = []                                               # every address the job asks for: nothing else than the SIA's AIRAC folder
    state = {'names': pdfs_of(), 'fail': None}

    def fake_fetch(url, timeout=60):
        asked.append(url)
        if state['fail']:
            raise state['fail']
        if '/html/eAIP/FR-AD-2.' in url:
            return page_of(state['names']).encode()
        return b'%PDF fake ' + url.rsplit('/', 1)[-1].encode()

    def fake_rows(path):
        return [_eaip_rows(fx, Path(path).stem)]                 # one page per PDF (the seam is proc_pdf.all_pages_rows: one list of rows per page)

    def run(ctx, icao='LFBD', job=None):
        return RJ.REGISTRY[('proc', 'eaip-fetch')][0](job or RJ.Job('proc', 'eaip-fetch', {'icao': icao}, author='TST'), {'icao': icao}, ctx)

    saved = (P.fetch, P.all_pages_rows, P.url_exists)
    P.fetch, P.all_pages_rows, P.url_exists = fake_fetch, fake_rows, lambda url, timeout=30: False
    try:
        cycle = EAD.lib_cycle('.')
        folder = P.eaip_url(cycle) + '/html/eAIP/'
        with tempfile.TemporaryDirectory() as td:
            data = scene(td)
            ctx = ctx_of(data)
            # no coding table on the aerodrome page (charts only): no-tables, nothing installed
            state['names'] = ['AD_2_LFXX_ADC.pdf', 'AD_2_LFXX_VAC.pdf']
            r = run(ctx, 'LFXX')
            c.eq(r, {'ok': False, 'reason': 'no-tables'}, 'a page that lists no coding PDF: no-tables', what='no tables')
            c.ok(not (data / 'proc' / 'manual' / 'LFXX.json').exists() and asked and all(u.startswith(folder) for u in asked), str(asked),
                 'nothing installed, and the only address asked is under the AIRAC folder computed by the tool')

            # success: LFBD of the fixtures, read through the real parsers
            state['names'] = pdfs_of()
            asked.clear()
            before = git(data, 'rev-parse', 'HEAD').strip()
            job = RJ.Job('proc', 'eaip-fetch', {'icao': 'LFBD'}, author='TST')
            r = run(ctx, job=job)
            c.ok(r.get('ok') is True and r['icao'] == 'LFBD' and r['procedures'] == 14 and r['source'] == 'eaip' and r['cycle'] == cycle, str(r)[:300],
                 'success: ok, the aerodrome, its 14 procedures, source eaip, the cycle in force')
            c.ok(asked and all(u.startswith(folder) for u in asked), str(asked[:3]), 'every address asked is under the AIRAC folder computed by the tool')
            inst = json.loads((data / 'proc' / 'manual' / 'LFBD.json').read_text())
            idx = json.loads((data / 'proc' / 'manual' / 'index.json').read_text())
            c.ok(len(inst['procedures']) == 14 and all(p['status'] == 'check' and p['source']['kind'] == 'eaip' and p['source']['cycle'] == cycle for p in inst['procedures']),
                 str([(p['status'], p['source']) for p in inst['procedures']][:2]), 'installed records keep status check and source eaip, with the cycle')
            c.ok(sorted(idx['aerodromes']) == ['KSEA', 'LFBD'] and idx['aerodromes']['LFBD']['SID'] == 4 and idx['aerodromes']['LFBD']['STAR'] == 6, str(idx),
                 'proc/manual/index.json merged (the other aerodromes kept)')
            c.ok((data / 'local' / 'eaip' / cycle / 'AD_2_LFBD_DATA_01.pdf').exists(), 'cache', 'the PDF are cached under data/local/eaip/<cycle>/ (never published)')
            head = git(data, 'rev-parse', 'HEAD').strip()
            c.ok(r['commit'] == head and head != before, f"{r['commit']} {head}", 'one new commit, returned by the job')
            c.eq(sorted(git(data, 'show', '--name-only', '--format=', 'HEAD').split()), ['proc/manual/LFBD.json', 'proc/manual/index.json'],
                 'the commit holds ONLY the two installed paths', what='commit paths')
            c.eq(git(data, 'log', '-1', '--format=%s').strip(), ":card_file_box: Procédures LFBD lues dans l'eAIP du SIA (à la demande)",
                 'the commit message says what was read and from where', what='message')
            c.ok(' M notes.txt' in git(data, 'status', '--porcelain'), git(data, 'status', '--porcelain'), "the user's unrelated modified file is still modified, not committed")
            c.ok(not git(data, 'remote').strip(), git(data, 'remote'), 'no push (no remote)')
            c.ok(job.view()['step'] and job.view()['log'] and job.view()['total'] >= 1, str(job.view()['step']), 'the job reports its steps and keeps a log')

            # the report of the reading (counts, not a bare « 0 procedures ») and the installed file as written, for the page
            c.eq(r['stats'], {'pages': 3, 'read': 3, 'rejected': 0, 'procedures': 14, 'dropped': 0, 'doubt': 0, 'reasons': []}, 'stats: coding pages found / read / rejected, procedures, dropped, doubt, reasons', what='stats')
            c.eq(r['file'], json.loads((data / 'proc' / 'manual' / 'LFBD.json').read_text(encoding='utf-8')), 'the result carries the installed file, read back from the disk (the same JSON)', what='file')
            c.ok(any('14 procédure' in x and '3 page' in x for x in job.view()['log']), str(job.view()['log'])[-300:], 'the job log says the same counts')
            # a former reading of the same source under an identifier the reader no longer produces does not stay beside the new one
            stale = json.loads((data / 'proc' / 'manual' / 'LFBD.json').read_text())
            stale['procedures'] += [{'id': 'LFBD.APP.OLDNAME.RW23', 'icao': 'LFBD', 'kind': 'APP', 'status': 'check', 'source': {'kind': 'eaip', 'cycle': '2026-01-01'}, 'points': []}]
            (data / 'proc' / 'manual' / 'LFBD.json').write_text(json.dumps(stale))
            try:
                r1 = run(ctx)
            except Exception as e:
                r1 = {'ok': False, 'message': str(e)}
            kept = [p['id'] for p in json.loads((data / 'proc' / 'manual' / 'LFBD.json').read_text())['procedures']]
            c.ok(r1.get('ok') and 'LFBD.APP.OLDNAME.RW23' not in kept and len(kept) == 14, str(r1)[:200] + str(kept[-3:]),
                 'a new reading replaces the former eaip procedures of the aerodrome: a changed identifier leaves no ghost beside the new ones')
            # the same reading again (a new `updated_at`): merged by id, still 14 procedures, never duplicated
            r2 = run(ctx)
            c.ok(r2['ok'] and r2['procedures'] == 14 and len(json.loads((data / 'proc' / 'manual' / 'LFBD.json').read_text())['procedures']) == 14, str(r2)[:300],
                 'the same reading again: installed over the former one by procedure id, 14 procedures and no duplicate')

            # a base placed with the data resolves the en-route points; a wrong position fails the geometry check: that procedure is not installed
            base = data / 'sia' / 'base' / 'fr' / cycle
            base.mkdir(parents=True)
            (base / 'points.json').write_text(json.dumps({'data': [{'id': 'ROYAN', 'lat': 10.0, 'lon': 10.0}, {'id': 'CNA', 'lat': 45.0, 'lon': 1.0}]}))
            (data / 'proc' / 'manual' / 'LFBD.json').unlink()
            r3 = run(ctx)
            inst3 = json.loads((data / 'proc' / 'manual' / 'LFBD.json').read_text(encoding='utf-8'))['procedures']
            bad3 = [p for p in inst3 if p['status'] == 'doubt']
            c.ok(r3['ok'] and r3['procedures'] == 14 and bad3 and r3['stats']['doubt'] == len(bad3) and r3['stats']['dropped'] == 0
                 and all(p['doubt'] == 'geometry' for p in bad3) and any('À VÉRIFIER' in w for w in r3['warnings']), str(r3)[:300],
                 'a wrong position from the base of the workstation fails the geometry check: that procedure is KEPT with status doubt and its reason, counted in stats.doubt, a warning says which')
            idx3 = json.loads((data / 'proc' / 'manual' / 'index.json').read_text(encoding='utf-8'))['aerodromes']['LFBD']
            c.ok(idx3['SID'] + idx3['STAR'] + idx3['APP'] == 14 - len(bad3), str(idx3), 'the doubt records are not counted in the index of the aerodromes')

        # another source's file is never overwritten; git absent keeps ok with a warning
        with tempfile.TemporaryDirectory() as td:
            data = scene(td)
            (data / 'proc' / 'manual' / 'LFBD.json').write_text(json.dumps({'schema': 1, 'icao': 'LFBD', 'cycle': '2026-10-01', 'procedures': [
                {'id': 'LFBD.SID.A', 'kind': 'SID', 'status': 'check', 'source': {'kind': 'ead-basic'}}]}))
            r = run(ctx_of(data))
            c.ok(r['ok'] is False and r['reason'] == 'failed' and '--replace' in r['message'] and json.loads((data / 'proc' / 'manual' / 'LFBD.json').read_text())['procedures'][0]['id'] == 'LFBD.SID.A',
                 str(r)[:300], "another source's file is never overwritten: failed with the reason")
        with tempfile.TemporaryDirectory() as td:
            data = scene(td)
            r = run({'data': str(data), 'secrets': str(Path(td) / 's')})
            c.ok(r['ok'] and r['commit'] is None and any(w.startswith('git') for w in r['warnings']), str(r)[:300], 'without git the files are installed, commit None, a warning')

        # network failures: a 404 says the cycle folder is not published yet; another error is failed with its message
        with tempfile.TemporaryDirectory() as td:
            data = scene(td)
            ctx = ctx_of(data)
            state['fail'] = urllib.error.HTTPError('https://x/y', 404, 'Not Found', {}, None)
            r = run(ctx)
            c.ok(r['ok'] is False and r['reason'] == 'failed' and '404' in r['message'] and 'not published yet' in r['message'] and cycle in r['message'], str(r),
                 'a 404 is failed, and the message says the AIRAC folder of the cycle is not published yet')
            state['fail'] = urllib.error.URLError('connection refused')
            r = run(ctx)
            c.ok(r['ok'] is False and r['reason'] == 'failed' and 'connection refused' in r['message'], str(r), 'a network error is failed, with its message')
            state['fail'] = None
            c.ok(not (data / 'proc' / 'manual' / 'LFBD.json').exists(), 'nothing', 'nothing was installed by the failures')

        # cancellation: seen at the next message, nothing installed, nothing committed; Jobs marks the state
        with tempfile.TemporaryDirectory() as td:
            data = scene(td)
            ctx = ctx_of(data)
            head = git(data, 'rev-parse', 'HEAD').strip()
            job = RJ.Job('proc', 'eaip-fetch', {'icao': 'LFBD'}, author='TST')
            job._cancel.set()
            r = run(ctx, job=job)
            c.ok(r == {'ok': False, 'reason': 'cancelled'} and not (data / 'proc' / 'manual' / 'LFBD.json').exists() and git(data, 'rev-parse', 'HEAD').strip() == head, str(r),
                 'a cancelled job answers cancelled, installs nothing and commits nothing')
            gate = threading.Event()

            def slow_fetch(url, timeout=60):
                gate.set()
                time.sleep(0.5)
                return fake_fetch(url, timeout)
            P.fetch = slow_fetch
            jobs = RJ.Jobs(RJ.REGISTRY, ctx)
            s1 = jobs.start('proc', 'eaip-fetch', {'icao': 'LFBD'})
            gate.wait(5)
            jobs.cancel(s1['job'])
            for _ in range(200):
                if jobs.cur.data['state'] != 'running':
                    break
                time.sleep(0.05)
            v = jobs.cur.view()
            c.ok(v['state'] == 'cancelled' and v['result'] == {'ok': False, 'reason': 'cancelled'} and not (data / 'proc' / 'manual' / 'LFBD.json').exists(),
                 str(v['state']) + str(v['result'])[:200], 'Jobs marks the cancelled job cancelled, with the reason cancelled in its result')
            P.fetch = fake_fetch

        # the command line of proc_sia works through the same per-aerodrome body (main -> read_aerodrome)
        state['names'] = pdfs_of()
        with tempfile.TemporaryDirectory() as td:
            err = io.StringIO()
            with contextlib.redirect_stderr(err):
                P.main(['LFBD', '--eaip', P.eaip_url('2026-10-01'), '--out', str(Path(td) / 'proc'), '--cache', str(Path(td) / 'cache')])
            out = json.loads((Path(td) / 'proc' / '2026-10-01' / 'LFBD.json').read_text(encoding='utf-8'))
            c.ok(len(out['procedures']) == 14 and 'LFBD: 14 procédure(s)' in err.getvalue(), err.getvalue()[:200], 'proc_sia.main() still writes the cycle folder and reports on stderr')
            state['names'] = ['AD_2_LFXX_ADC.pdf']
            err = io.StringIO()
            with contextlib.redirect_stderr(err):
                P.main(['LFXX', '--eaip', P.eaip_url('2026-10-01'), '--out', str(Path(td) / 'proc2'), '--cache', str(Path(td) / 'cache')])
            c.ok('LFXX: aucune table de codage' in err.getvalue() and not (Path(td) / 'proc2' / '2026-10-01' / 'LFXX.json').exists(), err.getvalue()[:200],
                 'proc_sia.main() still skips an aerodrome with no coding table')
    finally:
        P.fetch, P.all_pages_rows, P.url_exists = saved

    # the launcher's status tells which Little Navmap databases the workstation has (names only), never raising
    import os
    L = importlib.import_module('launch')
    env = {k: os.environ.get(k) for k in ('APPDATA', 'HOME', 'USERPROFILE')}
    try:
        with tempfile.TemporaryDirectory() as td:
            if sys.platform == 'win32':
                os.environ['APPDATA'] = td
                folder = Path(td) / 'ABarthel' / 'little_navmap_db'
            else:
                os.environ['HOME'] = td
                folder = Path(td) / '.config' / 'ABarthel' / 'little_navmap_db'
            c.eq(L.lnm_db_kinds(), [], 'no Little Navmap folder: an empty list', what='lnm absent')
            folder.mkdir(parents=True)
            for n in ('little_navmap_userdata.sqlite', 'little_navmap_navigraph.sqlite', 'little_navmap_navigraph.sqlite-journal', 'notes.txt', 'little_navmap_.sqlite'):
                (folder / n).write_bytes(b'')
            c.eq(L.lnm_db_kinds(), ['navigraph', 'userdata'], 'the kinds of the little_navmap_<kind>.sqlite files, sorted, names only', what='lnm kinds')
    finally:
        for k, v in env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v



# ------------------------------------------------------------------------------------------------ eAIP real layouts of LFBO and LFPO (static)
# Pages of the AIRAC 2026-10-01 that the reader refused or half read before: cells spelled one character at a time, a leg row cut in two, the first legs of each runway
# of a departure, INA / FNA ILS pages. Rows kept in frame/aerodb/test/fixtures/eaip/ (trimmed pages, content unchanged).
@case('K24', 'eAIP real layouts of LFBO and LFPO: spelled cells, per-runway starts, INA and ILS pages', 'K', static=True,
      rule='aerodb DECISIONS 28 Oct 2026 (eAIP layouts of Toulouse and Orly): every page of the cycle read, a row that stays ambiguous is reported and left out, never guessed')
def k24(c):
    P, fx, rows = _eaip(c)
    T = lambda stem: P.parse_code_table(rows(stem))
    legs = lambda g: [(l['leg'], l['id']) for l in g['legs']]
    # 1. every fixture of the two aerodromes: layout recognised, header known, at least 85 % of the leg rows read, each row counted once
    names = sorted(_eaip_names(c, 'LFBO', '*CODE*') + _eaip_names(c, 'LFPO', '*CODE*'))
    bad = []
    for n in names:
        t = T(n)
        ok, pb, fp, lay = P.verify_page(rows(n), t)
        if not (ok and lay == 'sia-code' and not pb and t['read'] == t['rows']):
            bad.append((n, ok, pb, t['read'], t['rows']))
    # the whole sets (V3 § 10.29 (e)): one real row of LFPO STAR RWY07 (page 2, « TF SOTIP 033 034,0 5,2 FL120 250 1,0 », 7 cells instead of 10) cannot be placed and is left out, never guessed:
    # that is the only page of the two aerodromes with a row lost, and its procedure (CAD 9E) is kept as a doubt (unread)
    c.eq([b[0] for b in bad], ['AD_2_LFPO_DATA_STAR_RWY07_RNAV_CODE_02'], 'every LFBO / LFPO page is read, header known, all its leg rows read, but the one known page with a row lost', what=f'{len(names)} pages')
    # 2. spelled characters and glued cells are put back, values untouched
    c.eq(P.norm_tokens('- D F P O 2 0 4 Y e s ---- - - - 1,0'), ['-', 'DF', 'PO204', 'Yes', '----', '-', '-', '-', '1.0'], 'spelled terminator, point, Yes and a decimal comma', what='norm_tokens')
    c.eq(P.norm_tokens('IF VEBEK ----- F L 1 1 0 F L 1 1 0 2 5 0 - -'), ['IF', 'VEBEK', '-----', 'FL110', 'FL110', '250', '-', '-'], 'spelled flight levels and a speed', what='norm_tokens')
    c.eq(P.norm_tokens('F M-- 2 2 4 --- - - -- 1.0'), ['FM', '--', '224', '---', '-', '-', '--', '1.0'], 'FM glued to dashes', what='norm_tokens')
    c.eq(P.norm_tokens('DF MLN - --- L- 4000 -- 1.0')[4:6], ['L', '-'], 'a turn glued to a dash', what='norm_tokens')
    c.eq(P.norm_tokens('TF PB 096 331 332,1 18,1 - - - - 1,0')[:3], ['TF', 'PB096', '331'], 'a point name cut in two (PB 096)', what='norm_tokens')
    c.eq(P.norm_tokens('IF AMB - ---- - F L260 280 1.0')[5:7], ['FL260', '280'], 'a flight level cut after the F', what='norm_tokens')
    # a row that lost an empty cell: rebuilt only when ONE layout fits the type of every column; else not read
    warns = []
    leg = P._leg(['TF', 'PO302', '083', '084.4', '19.4', '-', '-', '-', '-', '1.0'], False, warns.append)
    c.ok(leg and leg['id'] == 'PO302' and leg['over'] is None and leg['crs'] == 83 and leg['nm'] == 19.4, f'{leg} {warns}', 'a missing Fly Over cell is put back (one layout fits)')
    warns = []
    c.ok(P._leg(['TF', 'SOTIP', '033', '034.0', '5.2', 'FL120', '250', '1.0'], False, warns.append) is None and warns, str(warns), 'a row short of three cells stays ambiguous: not read, reported')
    # 3. Toulouse departures: the runway headers give per-runway starts, one procedure per runway
    sid = T('AD_2_LFBO_DATA_SID_RWY14L-14R_RNAV_CODE_01')
    c.eq(sorted((g['label'], g['runway']) for g in sid['groups']), sorted((n, r) for n in ('AMOLO 7A', 'FINOT 7A', 'GAUDE 7A', 'LMB 7A', 'MEN 7A', 'MORIL 7A', 'RIBOU 7A') for r in ('14L', '14R')),
         'the seven departures of the whole page x two runways', what='LFBO SID 14')
    amolo = {g['runway']: g for g in sid['groups'] if g['label'] == 'AMOLO 7A'}
    c.eq(legs(amolo['14R']), [('CA', None), ('DF', 'BO140'), ('CA', None), ('DF', 'BO143'), ('TF', 'BO145'), ('TF', 'MEDAP'), ('TF', 'AMOLO')], 'RWY14R: its CA, then the common route', what='AMOLO 7A')
    c.eq(legs(amolo['14L']), legs(amolo['14R'])[1:], 'RWY14L (the last header): the common route only', what='AMOLO 7A')
    ca = amolo['14R']['legs'][0]
    c.eq((ca['crs'], ca['alt']), (141, {'type': 'min', 'ft': 1000}), 'the CA takes the course of the runway header and its altitude', what='CA 141 / 1000')
    c.eq((amolo['14R']['legs'][1]['over'], amolo['14R']['legs'][3]['turn'], amolo['14R']['legs'][6]['alt']), (True, 'L', {'type': 'min', 'ft': 20000}), 'fly-over, turn and level kept', what='AMOLO 7A cells')
    men = next(g for g in sid['groups'] if g['label'] == 'MEN 7A' and g['runway'] == '14R')
    c.eq((men['legs'][0]['leg'], men['legs'][0]['crs'], men['legs'][0]['alt']), ('CA', 141, {'type': 'min', 'ft': 1000}), 'MEN 7A: the CA row whose cells were scrambled by the extractor is read the same', what='scrambled CA')
    c.ok(any('plusieurs pistes' in w for w in sid['warnings']), str(sid['warnings']), 'the page says how the per-runway starts were read')
    s32 = T('AD_2_LFBO_DATA_SID_RWY32L-32R_RNAV_CODE_01')
    fis = {g['runway']: g for g in s32['groups'] if g['label'] == 'FISTO 7B'}
    c.eq((fis['32L']['legs'][0]['leg'], fis['32R']['legs'][0]['id'], fis['32R']['legs'][0]['over']), ('CA', 'BO320', None), 'FISTO 7B: the CA is on RWY32L this time (the headers come in the other order)', what='32L / 32R')
    gau = {g['runway']: g for g in s32['groups'] if g['label'] == 'GAUDE 7B'}
    c.eq(legs(gau['32R']), [('DF', 'TOU'), ('FA', 'TOU'), ('VI', None), ('CF', 'BO852'), ('TF', 'GAUDE')], 'GAUDE 7B: legs without a fix (VI) kept with a null point', what='GAUDE 7B')
    c.eq((gau['32R']['legs'][2]['crs'], gau['32R']['legs'][2]['turn']), (169, 'L'), 'VI: heading 169, turn left', what='VI')
    s14b = T('AD_2_LFBO_DATA_SID_RWY14L-14R_RNAV_CODE_02')
    c.eq(sorted({g['label'] for g in s14b['groups']}), ['AMOLO 7H', 'FINOT 7H', 'MEN 7H'], 'the second page of the departures', what='LFBO SID 14 / 02')
    c.eq(next(g for g in s14b['groups'] if g['label'] == 'AMOLO 7H' and g['runway'] == '14R')['legs'][0]['alt'], {'type': 'min', 'ft': 1000}, 'a CA row with the accuracy before the altitude is read too', what='CA order')
    # 4. the 85 % rule counts a row once: per-runway copies do not count twice, a table with a new column is still refused
    c.eq((sid['rows'], sid['read']), (sid['rows'], sid['rows']), 'rows seen = rows read', what='LFBO SID 14 counts')
    c.ok(sid['rows'] < sum(len(g['legs']) for g in sid['groups']), f"{sid['rows']} {sum(len(g['legs']) for g in sid['groups'])}", 'the common route is shared by the runway copies: legs of the groups are more than the rows of the page')
    base = rows('AD_2_LFBO_DATA_STAR_RWY14_RNAV_CODE_01')
    widened = [re.sub(r'^(- (?:IF|TF) \S+) ', r'\1 NEW ', r) for r in base]
    ok, pb, fp, lay = P.verify_page(widened, P.parse_code_table(widened))
    c.ok(not ok and any('moins de 85' in x for x in pb), f'{ok} {pb}', 'a column added to a Toulouse STAR page: refused')
    # 5. STAR
    star = T('AD_2_LFBO_DATA_STAR_RWY14_RNAV_CODE_01')
    c.eq([(g['label'], g['legs'][0]['leg'], g['legs'][0]['id']) for g in star['groups']], [(f'{n} 8S', 'IF', n) for n in ('AFRIC', 'ASPET', 'LMB', 'NARAK', 'ORBIL', 'SECHE', 'TOPTU')], 'STAR of Toulouse (the seven of the whole page): spelled « I F L M B » read as IF LMB', what='LFBO STAR 14')
    c.eq(next(g for g in star['groups'] if g['label'] == 'NARAK 8S')['legs'][0]['alt'], {'type': 'max', 'ft': 15000}, 'FL150 in the MAX column', what='NARAK 8S')
    pstar = T('AD_2_LFPO_DATA_STAR_RWY02_RNAV_CODE_01')
    c.eq([g['label'] for g in pstar['groups']], ['MATIX 9E', 'MOPIL 9E', 'RENSA 9E', 'EPL 9E', 'RLP 9E', 'DJL 9E', 'KUTAN 9E', 'TUTAX 9E', 'ARDOL 9E', 'PIBAT 9E', 'MOU 9E'], 'Orly STAR (the whole page): « (FIR) » / « (UIR) » are not part of the name, one procedure each (they were one long procedure)', what='LFPO STAR')
    c.eq(pstar['groups'][0]['legs'][1]['nm'], 43.6, 'decimal comma read', what='GITAN')
    # 6. Orly departures
    s20 = T('AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE_01')
    o2y = next(g for g in s20['groups'] if g['label'] == 'OPALE 2Y')
    c.eq(legs(o2y), [('CA', None), ('CF', 'PO202'), ('DF', 'PO204'), ('DF', 'PO260'), ('TF', 'PO262'), ('TF', 'BOV'), ('TF', 'OPALE')], 'RWY20: the CA without a fix and the spelled DF are read', what='OPALE 2Y')
    c.eq((o2y['legs'][0]['crs'], o2y['legs'][0]['alt'], o2y['legs'][4]['nm']), (197, {'type': 'min', 'ft': 700}, 30.2), 'CA 197 / 700 ft, distance with a decimal comma', what='OPALE 2Y cells')
    o2s = next(g for g in s20['groups'] if g['label'] == 'OPALE 2S')
    c.ok(('TF', 'PB096') in legs(o2s) and next(l for l in o2s['legs'] if l['id'] == 'PB096')['crs'] == 331, str(legs(o2s)), 'PB 096 is the point PB096 (its Fly Over cell was lost: put back)')
    d04 = T('AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE_04')
    c.eq(len(d04['groups']), 6, 'RWY20 page 04: six departures of two legs', what='DORDI/OLZOM/MONOT 2Y / 2S')
    pogo = T('AD_2_LFPO_DATA_SID_RWY06-07_RNAV_POGO_LFPG_CODE_01')
    c.eq([(g['label'], g['runway']) for g in pogo['groups']], [('PG 2E', '07'), ('PG 2F', '06'), ('PG 2G', '07'), ('PG 2H', '06')], 'POGO: the runway is printed before the first leg', what='POGO')
    c.eq(pogo['groups'][0]['legs'][-1]['leg'], 'FM', 'a heading leg closes the POGO departure', what='FM')
    # 7. approaches: INA pages are named, transitions by STAR designator
    ina = T('AD_2_LFBO_DATA_RWY14R_INA_CODE_GNSS')
    c.eq((ina['kind'], ina['runways'], ina['title']), ('APP', ['14R'], 'INA RNAV (GNSS) RWY 14R'), 'INA page title (not the « Linked to FNA RNP RWY 14R » line)', what='LFBO INA 14R')
    c.eq([g['label'] for g in ina['groups']], ['INA ADIMO', 'INA AGN', 'INA FUZAP', 'INA SURAS'], 'four transitions named by their initial fix', what='LFBO INA 14R')
    c.ok(not any('piste' in w for w in ina['warnings']), str(ina['warnings']), 'an INA page has no runway point and does not say so')
    i32 = T('AD_2_LFBO_DATA_RWY32L_INA_CODE_GNSS')
    c.eq((i32['runways'], i32['title']), (['32L'], 'INA RNAV (GNSS) RWY 32L'), '« RNAV(GNSS) RWY 32 L » read as RWY 32L', what='LFBO INA 32L')
    opo = T('AD_2_LFPO_DATA_RWY06_INA_RNAV_CODE_GNSS')
    c.eq([g['label'] for g in opo['groups']], ['INA VEBEK 1E', 'INA VEBEK 1Y', 'INA MOLBA 1E', 'INA ODILO 1E', 'INA ODILO 1A'],
         'Orly INA: two transitions leave VEBEK, two leave ODILO: named by the STAR designators the page prints, in order', what='LFPO INA 06')
    recs, w = P.records('LFPO', opo, {}, 'x', '2026-10-01')
    c.eq(sorted(r['id'] for r in recs), sorted(f'LFPO.APP.INARNAVRWY06.RW06.{t}' for t in ('VEBEK1E', 'VEBEK1Y', 'MOLBA1E', 'ODILO1E', 'ODILO1A')), 'five distinct identifiers', what='INA records')
    c.ok(recs[0]['points'][-1]['leg'] == 'FM' and recs[0]['points'][-1]['id'] is None, str(recs[0]['points'][-1]), 'the closing FM keeps a null point')
    # the same page with the designators removed: two transitions share their initial fix, the page cannot tell them apart: those are not kept, the others are
    blind = [r for r in rows('AD_2_LFPO_DATA_RWY06_INA_RNAV_CODE_GNSS') if not re.match(r'^(?:VEBEK 1E|VEBEK 1Y|MOLBA 1E|ODILO 1E|ODILO 1A)$', r)]
    blind = [re.sub(r'^(?:VEBEK 1Y|MOLBA 1E|ODILO 1A) (TF|FM)', r'\1', r) for r in blind]
    bt = P.parse_code_table(blind)
    c.eq([g['label'] for g in bt['groups'] if not g.get('skip')], ['INA MOLBA'], 'without designators: the transitions of a shared initial fix are skipped, the single one kept', what='blind INA')
    c.ok(sum(1 for w in bt['warnings'] if 'non retenue' in w) == 4, str(bt['warnings']), 'each of the four skipped transitions is reported')
    # 8. ILS pages: the table codes the initial fix, then « See chart »; what follows is the missed approach
    ils = T('AD_2_LFBO_DATA_RWY14L_FNA_ILS_Z_LOC_Z_CODE')
    c.eq((ils['title'], ils['groups'][0]['label']), ('ILS Z or LOC Z RWY 14L', 'APCH'), 'ILS page title and role', what='LFBO ILS 14L')
    rec = P.records('LFBO', ils, {}, 'x', '2026-10-01')[0][0]
    c.eq(rec['id'], 'LFBO.APP.ILSZORLOCZRWY14L.RW14L', 'identifier', what='ILS 14L')
    c.eq([(p['id'], p.get('phase'), p.get('gap')) for p in rec['points']][:3], [('IO14L', None, None), ('BO512', 'missed', True), ('BO513', 'missed', None)],
         'initial fix, then the missed approach; the first missed leg is flagged `gap`', what='ILS 14L points')
    c.ok(any('TF déduit' in w for w in ils['warnings']) and any('See chart' in w for w in ils['warnings']), str(ils['warnings']), 'the lost leg type (TF) is deduced from the printed course and distance and SAID; the gap is said')
    ol = T('AD_2_LFPO_DATA_RWY24_FNA_ILS_CAT123_LOC_CODE')
    c.eq(ol['title'], 'ILS CAT I or CAT II or CAT III RWY 24', 'Orly ILS title', what='LFPO ILS 24')
    c.ok(any('non lue' in w and 'PO431' in w for w in ol['warnings']), str(ol['warnings']), 'a row with no leg type and no distance is NOT read, and reported')
    # gap: the first leg after the gap is not compared with the previous point
    pts = [{'id': 'A', 'leg': 'IF', 'lat': 45.0, 'lon': 1.0, 'crs': None, 'nm': None}, {'id': 'B', 'leg': 'TF', 'lat': 47.0, 'lon': 5.0, 'crs': 10, 'nm': 5.0}]
    c.ok(_gaps_of({'points': pts}) and not _gaps_of({'points': [pts[0], {**pts[1], 'gap': True}]}), 'gap', 'the geometry check skips the leg flagged gap, and still catches the same leg without the flag')
    # 9. the missed approach of the RNP pages: after the threshold point; none before
    r20 = P.records('LFPO', T('AD_2_LFPO_DATA_RWY20_FNA_RNP_CODE'), {}, 'x', '2026-10-01')[0]
    c.eq(len(r20), 1, 'RWY20: one approach (the former reading gave two, without its threshold)', what='LFPO RNP 20')
    pm = [(p['id'], p.get('phase')) for p in r20[0]['points']]
    k = [p[0] for p in pm].index('RW20')
    c.ok(k > 0 and all(ph is None for _, ph in pm[:k + 1]) and [p for p, ph in pm[k + 1:] if ph == 'missed'] == ['PO425', 'MLN', 'MOLBA'] and all(ph == 'missed' for _, ph in pm[k + 1:]), str(pm),
         'RWY20: PO425, MLN and MOLBA (7000 ft) are the missed approach; nothing before the threshold is')
    c.eq(next(p for p in r20[0]['points'] if p['id'] == 'RW20')['vpa'], -3.4, 'the vertical angle with its decimal comma (-3,4°) read at the threshold', what='RW20 vpa')
    r25 = P.records('LFPO', T('AD_2_LFPO_DATA_RWY25_FNA_RNP_CODE'), {}, 'x', '2026-10-01')[0][0]
    c.eq([(p['leg'], p.get('phase')) for p in r25['points'] if p.get('phase')][0], ('CA', 'missed'), 'RWY25: the missed approach starts with a CA (a leg without a fix)', what='RW25')
    # fallback: the threshold point missing from the table, the leg that carries the vertical angle marks the end of the final approach, with a warning
    nort = [r.replace('TF RW20', 'TF XX20') for r in rows('AD_2_LFPO_DATA_RWY20_FNA_RNP_CODE')]
    rn, wn = P.records('LFPO', P.parse_code_table(nort), {}, 'x', '2026-10-01')
    pn = [(p['id'], p.get('phase')) for p in rn[0]['points']]
    c.ok([i for i, (_, ph) in enumerate(pn) if ph][0] == [p[0] for p in pn].index('XX20') + 1 and any('angle vertical' in x for x in wn), str(pn), 'without the RWnn row: missed after the leg that carries the vertical angle, and a warning says so')
    # 10. the aerodrome file: runways only when a threshold has a position
    base = '/AIRAC-2026-10-01'
    f1 = ['AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE_04.pdf']
    d1 = P.build_aerodrome('LFPO', f1, lambda n: rows(n.replace('.pdf', '')), 'https://example.org' + base, '2026-10-01')
    c.ok('runways' not in d1 and len(d1['procedures']) == 6 and d1['formats'][0]['ok'], str(list(d1)), 'thresholds not positioned in the tables: no `runways` in the file (aerodb derives them from the records)')
    d2 = P.build_aerodrome('LFPO', f1 + ['AD_2_LFPO_DATA_01.pdf'], lambda n: ["RW20 48°44'00.0'' N 002°23'00.0'' E XX", 'RW24 REF AD 2 LFPO.12 + THR 24 XX'] if n.endswith('DATA_01.pdf') else rows(n.replace('.pdf', '')),
                           'https://example.org' + base, '2026-10-01')
    c.eq(d2.get('runways'), [{'id': '20', 'lat': 48.733333, 'lon': 2.383333, 'elev': None, 'qfu': 200, 'displaced': None, 'length': None, 'width': None, 'source': 'eaip'}],
         'a positioned threshold gives a runway record in the format of the CIFP ones; a « REF » row gives none', what='runways')
    # 11. AD 2.12 « Runway physical characteristics »: the only page that positions the thresholds (the DATA pages say « REF AD 2 LFPO.12 + THR 02 »)
    page = lambda ic: (fx / ic / f'FR-AD-2.{ic}.AD-2.12.html').read_text(encoding='utf-8')
    w12 = []
    lfpo = P.ad212_runways(page('LFPO'), 'LFPO', w12)
    by = {r['id']: r for r in lfpo}
    c.eq([r['id'] for r in lfpo], ['02', '20', '06', '24', '07', '25'], 'LFPO: six runways, in the page order', what='AD 2.12 LFPO')
    c.eq(by['02'], {'id': '02', 'lat': 48.717542, 'lon': 2.376697, 'elev': 287, 'qfu': 17, 'true': 18.35, 'length': 2400, 'width': 45, 'displaced': 0, 'dthr': None, 'source': 'eaip'},
         'RWY 02: THR 48°43\'03.15"N 002°22\'36.11"E, 287 ft, magnetic 017 (in parentheses), true 018.35, 2400 x 45, no displaced threshold', what='LFPO 02')
    c.eq((by['06']['lat'], by['06']['lon'], by['06']['elev'], by['06']['dthr'], 950 <= by['06']['displaced'] <= 1000), (48.719975, 2.316919, 288, {'lat': 48.721247, 'lon': 2.320514, 'elev': 283}, True),
         'RWY 06: THR, then the DTHR printed in parentheses with its own elevation (DTHR : 283ft)', what='LFPO 06')
    c.eq((by['25']['dthr'], by['25']['qfu'], by['25']['true']), ({'lat': 48.726383, 'lon': 2.396392, 'elev': 288}, 253, 254.4), 'RWY 25: displaced too', what='LFPO 25')
    c.eq([r['id'] for r in lfpo if r['dthr']], ['06', '25'], 'only 06 and 25 have a displaced threshold', what='LFPO displaced')
    c.ok(all(isinstance(r['displaced'], int) for r in lfpo) and [r['id'] for r in lfpo if r['displaced']] == ['06', '25'], [(r['id'], r['displaced']) for r in lfpo],
         '`displaced` is a distance in ft for every source (0 without a displaced threshold), the DTHR position is in `dthr`')
    c.eq(w12, [], 'nothing to report on the real page', what='AD 2.12 warnings')
    lfbo = P.ad212_runways(page('LFBO'))         # the aerodrome is found from the section identifier
    c.eq([(r['id'], r['lat'], r['lon'], r['elev'], r['qfu'], r['length']) for r in lfbo],
         [('14L', 43.637364, 1.357625, 489, 141, 3025), ('32R', 43.615636, 1.380236, 497, 321, 3025), ('14R', 43.644114, 1.345933, 488, 141, 3503), ('32L', 43.618964, 1.372117, 497, 321, 3503)],
         'LFBO: four runways, the aerodrome found from « LFBO-AD-2.12 »', what='AD 2.12 LFBO')
    # the section is found by its identifier, not by a regex on the page: other sections around it change nothing
    other = ('<div id="LFPO-AD-2.11"><table><tr><td>99</td><td>1</td></tr></table></div>' + page('LFPO')
             + '<div id="LFPO-AD-2.13"><table><tr><th>Position</th><th>Bearing</th></tr><tr><td>36</td><td>360</td></tr></table></div>')
    c.eq([r['id'] for r in P.ad212_runways(other, 'LFPO')], ['02', '20', '06', '24', '07', '25'], 'neighbouring sections are not read', what='section by identifier')
    # nothing guessed: a threshold that does not parse leaves its runway out, said; a page with no section gives nothing, said
    wu = []
    cut = P.ad212_runways(page('LFPO').replace('48°43\'03.15"N', '48°43\'??"N'), 'LFPO', wu)
    c.ok([r['id'] for r in cut] == ['20', '06', '24', '07', '25'] and len(wu) == 1 and '02' in wu[0], f'{[r["id"] for r in cut]} {wu}', 'RWY 02 with an unreadable latitude: left out, one warning')
    wn = []
    c.eq((P.ad212_runways('<html><body>nothing</body></html>', 'LFPO', wn), len(wn)), ([], 1), 'no AD 2.12 section: no runway, one warning', what='no section')
    # 12. the landing point: THR or DTHR? The coding tables agree with the DTHR (measure of 29 October 2026: the TF leg to RWnn of the RNP pages)
    f06 = ['AD_2_LFPO_DATA_02.pdf', 'AD_2_LFPO_DATA_RWY06_FNA_RNP_CODE.pdf', 'AD_2_LFPO_DATA_RWY06_FNA_ILS_CAT123_LOC_CODE.pdf']
    rows_pdf = lambda n: rows(n.replace('.pdf', ''))
    d06 = P.build_aerodrome('LFPO', f06, rows_pdf, 'https://example.org' + base, '2026-10-01', None, None, page('LFPO'))
    c.eq([r['id'] for r in d06['runways']], ['02', '20', '06', '24', '07', '25'], 'the file takes the runways of AD 2.12 (priority over the RWnn points of the tables)', what='file runways')
    rnp = next(p for p in d06['procedures'] if 'RNP' in p['name'])
    rw = next(q for q in rnp['points'] if q['id'] == 'RW06')
    c.eq((rw['lat'], rw['lon']), (48.721247, 2.320514), 'the RW06 point of the RNP page is placed, at the DTHR (landing point of a displaced runway)', what='RNP RW06')
    fpo = next(q for q in rnp['points'] if q['id'] == 'FPO06')
    to_dthr = P.bearing_nm((fpo['lat'], fpo['lon']), (48.721247, 2.320514))[1]
    to_thr = P.bearing_nm((fpo['lat'], fpo['lon']), (by['06']['lat'], by['06']['lon']))[1]
    c.ok(abs(to_dthr - rw['nm']) < 0.06 < abs(to_thr - rw['nm']), f'printed {rw["nm"]} NM, to DTHR {to_dthr:.2f}, to THR {to_thr:.2f}',
         'FPO06 to RW06: 11.5 NM printed, the DTHR is 0.03 NM from it (the page rounds to 0.1), the THR 0.20 NM')
    c.eq(_gaps_of(rnp), [], 'the geometry check, now able to compare the leg to RW06, finds nothing', what='gaps RNP 06')
    # 13. the ILS final: IF -> threshold (straight, synthetic) -> missed approach; the leg that « See chart » hides is not coded
    ils = next(p for p in d06['procedures'] if 'ILS' in p['name'])
    c.eq([(q['id'], q['leg'], q.get('phase'), q.get('synthetic'), q.get('gap')) for q in ils['points']],
         [('IPO06', 'IF', None, None, None), ('FAF06', 'CF', None, 'faf', None), ('RW06', 'CF', None, 'threshold', None), ('PO412', 'TF', 'missed', None, True), ('MLN', 'TF', 'missed', None, None), ('MOLBA', 'TF', 'missed', None, None)],
         'LFPO ILS 06: IPO06 (IF), FAF06 (the FAF LOC of the DATA page, synthetic), RW06 (synthetic threshold), then PO412, MLN, MOLBA as the missed approach, `gap` kept on the first missed leg', what='ILS 06 points')
    c.eq(({k: ils['points'][2][k] for k in ('lat', 'lon', 'alt')}, ils['points'][0]['lat']), ({'lat': 48.721247, 'lon': 2.320514, 'alt': None}, 48.602972),
         'the threshold carries its position; the IF its own', what='ILS 06 positions')
    faf = ils['points'][1]
    to_thr, brg = P.bearing_nm((faf['lat'], faf['lon']), (48.721247, 2.320514))[1], P.bearing_nm((faf['lat'], faf['lon']), (48.721247, 2.320514))[0]
    c.ok((faf['lat'], faf['lon'], faf['alt']) == (48.630667, 2.065889, None) and 5 < to_thr < 12 and abs((brg - by['06']['true'] + 180) % 360 - 180) < 1, f'{faf} {to_thr:.1f} NM {brg:.1f}°',
         "the FAF is the position of « FAF LOC RWY 06 » on the DATA page (no altitude printed), 11.5 NM from the threshold, on the runway's bearing")
    c.eq(_gaps_of(ils), [], 'the geometry check does not compare the first missed leg with the threshold', what='gaps ILS 06')
    # source.file (V3 § 10.25): the coding page the record was read from, a bare file name that is a page of the set (what the « Source » link opens: charts.base + Cartes/LFPO/ + file)
    c.eq((ils['source']['file'], ils['source']['ref'], d06['procedures'][0]['source']['file'] in f06, all('/' not in p['source']['file'] and p['source']['file'] == p['source']['ref'] for p in d06['procedures'])),
         ('AD_2_LFPO_DATA_RWY06_FNA_ILS_CAT123_LOC_CODE.pdf', 'AD_2_LFPO_DATA_RWY06_FNA_ILS_CAT123_LOC_CODE.pdf', True, True), 'eAIP: source.file is the page of the record (ref held it already, the two agree)', what='eAIP source.file')
    f25 = ['AD_2_LFPO_DATA_02.pdf', 'AD_2_LFPO_DATA_RWY25_FNA_ILS_CAT123_LOC_CODE.pdf', 'AD_2_LFPO_DATA_RWY07_FNA_ILS_CAT123_LOC_CODE.pdf']
    d25 = P.build_aerodrome('LFPO', f25, rows_pdf, 'https://example.org' + base, '2026-10-01', None, None, page('LFPO'))
    i25 = next(p for p in d25['procedures'] if p['runways'] == ['25'])
    c.eq([(q['id'], q['leg'], q.get('phase')) for q in i25['points']],
         [('VEKUH', 'IF', None), ('RW25', 'CF', None), (None, 'CA', 'missed'), ('PO432', 'DF', 'missed'), ('MLN', 'TF', 'missed'), ('MOLBA', 'TF', 'missed')],
         'LFPO ILS 25: VEKUH, the threshold, then the CA (a leg without a fix) opens the missed approach', what='ILS 25 points')
    c.eq(i25['points'][2].get('gap'), True, 'the CA keeps `gap`', what='ILS 25 gap')
    i07 = next(p for p in d25['procedures'] if p['runways'] == ['07'])
    c.eq([(q['id'], q.get('phase')) for q in i07['points']], [('IF07', None), ('FAF07', None), ('RW07', None), ('PO412', 'missed'), ('MLN', 'missed'), ('MOLBA', 'missed')],
         'LFPO ILS 07: no IF row in the table, but the DATA page prints « IF ILS/LOC RWY 07 » and « FAF LOC RWY 07 »: IF07, FAF07, the threshold, then the missed approach (SOG-0022, K69)', what='ILS 07 points')
    c.ok(any('point initial sans nom lu des pages DATA' in x and 'RWY07' in x for x in d25['warnings']), str(d25['warnings'][-4:]), 'and the initial fix read from the DATA page, not from the table, is said (SOG-0022)')
    # without the AD 2 page: no threshold position, nothing inserted, said (the record is what it was before)
    dn = P.build_aerodrome('LFPO', f06, rows_pdf, 'https://example.org' + base, '2026-10-01')
    inn = next(p for p in dn['procedures'] if 'ILS' in p['name'])
    c.eq([q['id'] for q in inn['points']], ['IPO06', 'PO412', 'MLN', 'MOLBA'], 'no AD 2.12: no threshold inserted', what='ILS 06 without AD 2.12')
    c.ok(any('position du seuil RW06 inconnue' in x for x in dn['warnings']) and 'runways' not in dn, str(dn['warnings'][-3:]), 'a warning says why; no `runways` in the file')
    dl = P.build_aerodrome('LFBO', ['AD_2_LFBO_DATA_RWY14L_FNA_ILS_Z_LOC_Z_CODE.pdf'], rows_pdf, 'https://example.org' + base, '2026-10-01', None, None, page('LFBO'))
    c.eq([(q['id'], q.get('synthetic')) for q in dl['procedures'][0]['points']][:3], [('IO14L', None), ('RW14L', 'threshold'), ('BO512', None)],
         'LFBO ILS 14L without its DATA page: IO14L, RW14L (the THR: no displaced threshold), BO512, no FAF', what='LFBO ILS 14L')
    c.ok(any('FAF LOC RWY 14L absent' in x for x in dl['warnings']), str(dl['warnings'][-2:]), 'and the missing FAF is said')
    df = P.build_aerodrome('LFBO', ['AD_2_LFBO_DATA_03.pdf', 'AD_2_LFBO_DATA_RWY14L_FNA_ILS_Z_LOC_Z_CODE.pdf'], rows_pdf, 'https://example.org' + base, '2026-10-01', None, None, page('LFBO'))
    il = next(p for p in df['procedures'] if p['runways'] == ['14L'])
    ft = next(q for q in il['points'] if q.get('synthetic') == 'faf')
    c.eq(([(q['id'], q.get('synthetic')) for q in il['points']][:4], (ft['lat'], ft['lon'], ft['alt'], ft['leg'])), ([('IO14L', None), ('FAF14L', 'faf'), ('RW14L', 'threshold'), ('BO512', None)], (43.740028, 1.250417, None, 'CF')),
         'LFBO ILS 14L with DATA 03: IO14L, FAF14L (« FAF LOC RWY 14L », no altitude), RW14L, BO512', what='LFBO ILS 14L FAF')
    # the FAF is inserted only when it lies on the final: closer to the threshold than the IF, within 10° of the runway's bearing
    legs0 = [{'id': 'IO14L', 'leg': 'IF', 'alt': None, 'over': None}, {'id': 'BO512', 'leg': 'TF', 'alt': None, 'over': None, 'gap': True}]
    cs = {'RW14L': (43.7, 1.3), 'IO14L': (43.8, 1.1)}
    for pos, why in (((43.85, 1.0), 'farther from the threshold than the IF'), ((43.55, 1.5), 'off the axis of the runway')):
        w = []
        out = P.with_threshold(legs0, ['14L'], cs, w, {'faf': {'14L': pos}, 'true': {'14L': P.bearing_nm((43.8, 1.1), (43.7, 1.3))[0]}})
        c.ok([x['id'] for x in out] == ['IO14L', 'RW14L', 'BO512'] and any('pas sur la finale' in x for x in w), f'{out} {w}', f'a FAF {why} is not inserted, and said')
    # 14. the report of a reading
    st = P.stats_of([{'ok': True, 'problems': []}, {'ok': False, 'problems': ['info: x', '3 tronçon(s) lu(s) sur 9 lignes de tronçon: moins de 85 %']}, {'ok': False, 'problems': ['disposition non reconnue (x)']},
                     {'ok': False, 'problems': ['2 tronçon(s) lu(s) sur 9 lignes de tronçon: moins de 85 %']}], 12, ['name'], ['geometry', 'repeat'])
    c.eq(st, {'pages': 4, 'read': 1, 'rejected': 3, 'procedures': 12, 'dropped': 1, 'doubt': 2, 'reasons': [['low-read', 2], ['geometry', 1], ['layout', 1]]},
         'pages found / read / rejected, procedures, dropped (really removed), doubt (kept, to check), the three most frequent reasons', what='stats_of')
    # 15. Orly STAR RWY20 (the user's page 11/24): five STARs, each with its IF; an arrow glyph leading a row (« → TF DIBES ») is no cell;
    # the HOLDING block is no procedure
    star = T('AD_2_LFPO_DATA_STAR_RWY20_RNAV_CODE_02')
    got = {g['label']: [l['id'] for l in g['legs']] for g in star['groups']}
    c.eq(got, {'NIMER 9W': ['NIMER', 'SOMED', 'DIBES', 'CAD', 'SOTIP', 'ODILO'], 'AMB 9W': ['AMB', 'DIBES', 'CAD', 'SOTIP', 'ODILO'],
               'LUMAN 9W': ['LUMAN', 'CAD', 'SOTIP', 'ODILO'], 'BOBSA 9W': ['BOBSA', 'BENAR', 'CAD', 'SOTIP', 'ODILO'], 'CAD 9W': ['CAD', 'SOTIP', 'ODILO']},
         'NIMER, AMB, LUMAN, BOBSA and CAD 9W, each from its IF; no procedure without a name, the holdings left out', what='LFPO STAR RWY20')
    amb = next(g for g in star['groups'] if g['label'] == 'AMB 9W')['legs']
    c.eq((amb[0]['alt'], amb[0]['kt'], amb[2]['alt']), ({'type': 'max', 'ft': 26000}, 280, {'type': 'at', 'ft': 13000}), 'AMB: FL260 at most and 280 kt at the IF, FL130 at CAD', what='AMB 9W')
    c.eq(P.norm_tokens('→ TF DIBES - 018 019,2 5,0 - - - - 1,0')[:2], ['TF', 'DIBES'], 'a leading arrow is dropped', what='norm_tokens')
    # a block without a title at the head of a page (a procedure begun at the bottom of the previous page) that repeats a named one is removed
    pages = ['AD_2_LFPO_DATA_SID_RWY07_RNAV_CODE_04.pdf', 'AD_2_LFPO_DATA_SID_RWY07_RNAV_CODE_05.pdf']
    d7 = P.build_aerodrome('LFPO', pages, lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-01', '2026-10-01')
    c.ok(not [p['id'] for p in d7['procedures'] if '.NONAME.' in p['id']] and any('bloc sans titre identique' in w for w in d7['warnings']),
         [p['id'] for p in d7['procedures'] if 'MONOT' in p['id'] or 'NONAME' in p['id']], 'the untitled repeat of MONOT 2G is removed and reported')


@case('K25', 'eAIP real layouts of LFPG: point merge, guardrails', 'K', static=True,
      rule='aerodb DECISIONS 29 Oct 2026 (Paris-CDG, cycle 2026-10-29): every page read, STAR titles with parentheses, point merge arcs kept out of the route, a doubtful reading is kept with status doubt and its reason, never installed as sure')
def k25(c):
    P, fx, rows = _eaip(c)
    stem = lambda n: 'AD_2_LFPG_DATA_' + n
    T = lambda n: P.parse_code_table(rows(stem(n)))
    legs = lambda g: [(l['leg'], l['id']) for l in g['legs']]
    ids = lambda g: [l['id'] for l in g['legs']]
    names = sorted(_eaip_names(c, 'LFPG', '*CODE*'))
    c.eq(len(names), 85, 'the 85 coding pages of Paris-CDG (cycle 2026-10-29), whole', what='fixtures')
    # 1. every LFPG page: layout recognised, header known, enough leg rows read
    bad = []
    for n in names:
        t = P.parse_code_table(rows(n))
        ok, pb, fp, lay = P.verify_page(rows(n), t)
        if not (ok and lay == 'sia-code' and not pb):
            bad.append((n, ok, pb))
    c.eq(bad, [], 'every LFPG page is read with a known header (the SID 08 / 09 pages with the « Nav Spec » column and the empty procedure column, the INA pages, the FNA pages)', what='verify_page')
    # 2. the rejected SID page: runway headers « RWY09L - 087 088.4 », a « Nav Spec » column that the extractor moved, a first leg scrambled
    sid = T('SID_RWY09L-09R_RNAV_CODE_01')
    c.eq((sid['rows'], sid['read']), (36, 36), 'SID 09L-09R: every leg row of the whole page read (it read 0 of 35 before; the 36th, the first leg of LANVI 6G on 09L with only six cells left, was not even counted before SOG-0044)', what='SID 09 rows')
    by = {(g['label'], g['runway']): g for g in sid['groups']}
    c.eq(sorted(by), sorted((n, r) for n in ('OPALE 6G', 'ATREX 6G', 'NURMO 6G', 'OPALE 6K', 'ATREX 6K', 'NURMO 6K', 'DIKOL 6G', 'LANVI 6G', 'RANUX 6G') for r in ('09L', '09R')),
         'the nine departures of the whole page x two runways', what='SID 09 groups')
    c.eq((legs(by[('OPALE 6G', '09L')]), legs(by[('OPALE 6G', '09R')])), ([('CF', 'PG091'), ('TF', 'PG092'), ('DF', 'PG099'), ('TF', 'OPALE')], [('TF', 'PG092'), ('DF', 'PG099'), ('TF', 'OPALE')]),
         '09L starts at its CF, 09R at the common route', what='OPALE 6G')
    leg = by[('OPALE 6G', '09L')]['legs']
    c.eq((leg[1]['crs'], leg[1]['nm'], leg[1]['over'], leg[2]['turn'], leg[3]['crs'], leg[3]['nm'], leg[3]['rnp']), (84, 2.1, True, 'L', 323, 50.0, 1.0), 'values, fly-over, turn; « RNAV 1 » read as 1 NM', what='OPALE 6G cells')
    c.eq(ids(by[('LANVI 6G', '09L')])[:2], ['PG091', 'PG092'], 'LANVI 6G on 09L starts at its CF PG091 too (its row kept six cells, it was dropped without a word)', what='LANVI 6G')
    c.eq(ids(by[('NURMO 6G', '09L')]), ['PG091', 'PG092', 'NURMO'], 'the rows whose « RNAV 1 » was scattered by the extractor (CF - RNAV 1 PG091, DF NURMO … 1 RNAV) are read', what='NURMO 6G')
    c.eq(P.norm_tokens('RNAV 1CF PG081 - - - - -'), ['CF', 'PG081', '-', '-', '-', '-', '-', 'RNAV', '1'], 'the Nav Spec word glued to the next terminator goes to the end of the row', what='norm_tokens')
    c.eq(P.norm_tokens('- DF OSTIP - ---- - - - 1 RNAV')[-2:], ['RNAV', '1'], 'a Nav Spec split as « 1 RNAV » too', what='norm_tokens')
    c.eq(P.norm_tokens('-T F FF501 - 061 062.4 8.5 - FL150 FL150 - 1.0')[:3], ['-', 'TF', 'FF501'], 'the empty procedure cell glued to the terminator (-T F)', what='norm_tokens')
    # 3. STAR titles with parentheses (the cause of the glued STARs): every title cuts a group, no point is repeated, the arrows and conditions of use are not part of the name
    star = T('STAR_RWY27L_RNAV_CODE_01')
    c.eq([g['label'] for g in star['groups']], ['ENORI 9W', 'MATIX 9W', 'MOPIL 9W', 'VEDUS 9W', 'ENORI 9J', 'MATIX 9J', 'MOPIL 9J', 'VEDUS 9J'], 'RWY27L STARs: each title « ENORI 9W (UIR FIR) », « VEDUS 9W (UIR FIR FL > 105) », « ENORI 9J (… Sur instruction / On instruction ) » is a group', what='titles')
    c.eq(ids(star['groups'][3]), ['VEDUS', 'XERAM', 'ENORI', 'DEVIM', 'LORNI'], 'VEDUS 9W: its own five points, not glued to the next titles', what='VEDUS 9W')
    s8 = T('STAR_RWY08L_RNAV_CODE_01')
    c.eq([g['label'] for g in s8['groups']], ['ENORI 9E', 'MATIX 9E', 'MOPIL 9E', 'VEDUS 9E', 'MATIX 9H', 'MOPIL 9H'], 'RWY08L: six STARs, VEDUS XERAM ENORI DEVIM LORNI once', what='08L titles')
    c.ok(all(len(set(ids(g))) == len(ids(g)) and g['legs'][0]['leg'] == 'IF' and g['legs'][0]['id'] == g['label'].split()[0] for g in star['groups'] + s8['groups']), 'ids',
         'each STAR starts at its IF, named after it, with no point repeated')
    # 4. point merge: the sequencing arcs BIBA1-5 and LUKI1-5 are not route legs
    pm = T('STAR_RWY27L_RNAV_CODE_05')
    c.eq(pm['point_merge'], [{'name': 'BIBAX', 'merge': 'KOLIV', 'arc': ['BIBA1', 'BIBA2', 'BIBA3', 'BIBA4', 'BIBA5']}, {'name': 'LUKIP', 'merge': 'KOLIV', 'arc': ['LUKI1', 'LUKI2', 'LUKI3', 'LUKI4', 'LUKI5']}],
         'the two arcs are recognised (the entry fix, the merge point and the ordered arc points)', what='point_merge')
    v9 = {g['label']: g for g in pm['groups']}
    c.eq(legs(v9['BIBAX 9V']), [('IF', 'BIBAX'), ('DF', 'KOLIV'), ('TF', 'MOPAR')], 'BIBAX 9V: entry fix, then the merge point (the TF whose course and distance start at BIBA5 becomes a DF), then MOPAR', what='BIBAX 9V')
    c.eq((v9['BIBAX 9V']['legs'][1]['crs'], v9['BIBAX 9V']['legs'][1]['nm']), (None, None), 'no course and distance kept on the merge leg', what='DF KOLIV')
    c.eq((ids(v9['BIBAX 9W']), v9['BIBAX 9W']['legs'][1]['leg'], v9['BIBAX 9W']['legs'][1]['nm']), (ids(v9['BIBAX 9V']), 'TF', 50.5), 'the direct variant (jets only) goes BIBAX KOLIV MOPAR by a real TF of 50.5 NM', what='BIBAX 9W')
    c.ok(not [i for g in pm['groups'] for i in ids(g) if i and (i.startswith('BIBA') and i != 'BIBAX' or i.startswith('LUKI') and i != 'LUKIP')], 'ids', 'no arc point is left in any STAR')
    c.ok(any('point merge' in w for w in pm['warnings']), str(pm['warnings'][:2]), 'the page says what it did with the arcs')
    # 5. the aerodrome file: point_merge per aerodrome (the runways that use it), nothing nameless or repeated installed as sure, the doubt kept
    files = [stem(n) + '.pdf' for n in ('STAR_RWY27L_RNAV_CODE_01', 'STAR_RWY27L_RNAV_CODE_05', 'STAR_RWY08L_RNAV_CODE_01', 'SID_RWY09L-09R_RNAV_CODE_01', 'SID_RWY26L-26R_RNAV_CODE_04', 'SID_RWY27L-27R_RNAV_CODE_02',
                                        'RWY08L_INA_RNAV_CODE_01', 'RWY27R_FNA_RNP_CODE', 'RWY26L_FNA_ILS_CAT123_LOC_CODE', 'RWY26L_FNA_RNP_CODE')]
    doc = P.build_aerodrome('LFPG', files, lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-29', '2026-10-29')
    c.eq((len(doc['formats']), sum(f['ok'] for f in doc['formats'])), (10, 10), 'the ten pages are read (23 of the 85 real pages were rejected)', what='formats')
    pms = {m['name']: m for m in doc['point_merge']}
    c.eq((sorted(pms), pms['BIBAX']['merge'], pms['BIBAX']['arc'][0], pms['BIBAX']['runways'], pms['BIBAX']['source']), (['BIBAX', 'LUKIP'], 'KOLIV', 'BIBA1', ['27L'], {'file': stem('STAR_RWY27L_RNAV_CODE_05') + '.pdf'}),
         'point_merge of the file: name, merge point, arc, the runways that use it, the page', what='doc.point_merge')
    procs = {p['id']: p for p in doc['procedures']}
    c.ok(not [i for i, p in procs.items() if '.NONAME.' in i and p['status'] != 'doubt'] and not [i for i, p in procs.items() if p['status'] != 'doubt' and _geometry().repeated_points(p)], 'ids',
         'no nameless record and no record that repeats a point is installed as sure')
    c.eq(sorted(p['name'] for p in doc['procedures'] if p['kind'] == 'STAR' and p['runways'] == ['27L'] and 'BIBAX' in p['name']), ['BIBAX 9P', 'BIBAX 9V', 'BIBAX 9W', 'BIBAX 9X'], 'RWY27L BIBAX STARs, each named', what='27L names')
    c.ok(procs['LFPG.SID.AGOPA7A.RW27L']['points'][4]['id'] == 'ADADA', str([q['id'] for q in procs['LFPG.SID.AGOPA7A.RW27L']['points']]), 'a point name split by the page (« ADAD A ») is put back (ADADA is in the DATA page)')
    ol = procs['LFPG.SID.OLZOM7B.RW26L']
    c.ok(ol['status'] == 'doubt' and ol['doubt'] == 'unread' and procs['LFPG.SID.DORDI7B.RW26L']['status'] == 'check', f"{ol['status']} {ol.get('doubt')}",
         'OLZOM 7B: one ambiguous leg row (TF PG275, a cell short) is left out and the procedure is KEPT with status doubt and its reason; DORDI 7B, whole, stays check')
    ina = [p for p in doc['procedures'] if p['kind'] == 'APP' and 'INA' in p['id']]
    c.eq(([p['transition'] for p in ina], all(p['points'][0]['leg'] == 'IF' for p in ina)), (['LORNI 1E', 'LORNI 1X', 'OKIPA 1E', 'OKIPA 1X', 'OKIPA 1N', 'OKIPA 1R', 'BANOX 1E', 'MOPAR 1E'], True),
         'INA 08L: the initial fixes whose cells the page scrambled (« --LORNIIF », « IF OKIPA - - 1,0- - - 300 - ») still open their transition: no group glued to the previous one', what='INA 08L')
    c.eq(sum('contraintes' in w for w in doc['warnings']) >= 2, True, 'and the scrambled constraints are said not to be read', what='bare IF warnings')
    r27 = next(p for p in doc['procedures'] if 'RNPRWY27R' in p['id'])
    c.eq([(q['id'], q.get('crs'), q.get('nm')) for q in r27['points']][:4], [('PG650', None, None), ('FG27R', 264, 3.6), ('RW27R', 264, 14.3), (None, 264, None)],
         'FNA RNP 27R: « PG65 0 », « 26 4 265. 7 » and the like put back (PG650, course 264)', what='FNA 27R')
    c.eq(sorted(p['id'] for p in doc['procedures'] if p['kind'] == 'APP' and '26L' in p['id']), ['LFPG.APP.ILSCATIORCATIIANDCATIIIORLOCRWY26L.RW26L', 'LFPG.APP.RNPRWY26L.RW26L'], 'FNA 26L ILS and RNP read', what='FNA 26L')
    c.eq(P.norm_tokens('IF IG26 L - --- - 400 0 - -- 1.0', split=True)[1:3], ['IG26L', '-'], 'an identifier split before its L (IG26 L)', what='unsplit')
    # the ILS of RWY 26L with its FAF (V3 § 10.20): the whole sets of the DATA pages and of AD 2.12 give IF -> FAF -> threshold -> missed
    ds = P.build_aerodrome('LFPG', ['AD_2_LFPG_DATA_05.pdf', 'AD_2_LFPG_DATA_RWY26L_FNA_ILS_CAT123_LOC_CODE.pdf'], lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-29', '2026-10-29',
                           None, None, (fx / 'LFPG' / 'FR-AD-2.LFPG.AD-2.12.html').read_text(encoding='utf-8'))
    il = next(p for p in ds['procedures'] if p['runways'] == ['26L'])
    pts = [(q['id'], q.get('synthetic')) for q in il['points']]
    faf = il['points'][1]
    thr = il['points'][2]
    brg = P.bearing_nm((faf['lat'], faf['lon']), (thr['lat'], thr['lon']))
    true = next(r['true'] for r in ds['runways'] if r['id'] == '26L')
    c.eq((pts[:3], faf['leg'], faf['alt'], il['points'][0]['lat'] is not None), ([('IG26L', None), ('FAF26L', 'faf'), ('RW26L', 'threshold')], 'CF', None, True),
         'LFPG ILS 26L: IG26L (its position read from « IG26L ( IF ILS/LOC RWY 26L ) … » on the DATA page), FAF26L, RW26L', what='LFPG ILS 26L')
    c.ok(10 < brg[1] < 13 and abs((brg[0] - true + 180) % 360 - 180) < 1 and not any('FAF' in x and 'finale seule' not in x for x in ds['warnings']), f'{brg} {true}',
         'the FAF is 11.4 NM from the threshold, on the runway bearing, and nothing is said (but for the final-only ILS of the other runways of this partial list: DATA 05 prints their FAF, the list holds no ILS page for them, SOG-0044)')
    # 6. the guardrails on records: a doubt, never a purge
    mk = lambda i, pts, kind='STAR': {'id': i, 'kind': kind, 'name': None, 'runways': ['27L'], 'points': [{'id': a, 'lat': b, 'lon': d, 'leg': l} for a, b, d, l in pts]}
    nameless = mk('LFPG.STAR.NONAME.RW27L', [('A', 49.0, 1.0, 'IF'), ('B', 49.0, 0.5, 'TF'), ('C', 49.0, 0.0, 'TF')])
    G = _geometry()
    c.eq(G.guardrails(nameless), [('name', 'sans nom')], 'a nameless record', what='name')
    rep = mk('LFPG.STAR.X1A.RW27L', [('BIBAX', 49.0, 1.0, 'IF'), ('KOLIV', 49.0, 0.5, 'TF'), ('MOPAR', 49.0, 0.0, 'TF'), ('KOLIV', 49.0, 0.5, 'TF')])
    c.eq(G.guardrails(rep)[0], ('repeat', 'point répété hors attente: KOLIV'), 'a point seen twice outside a holding', what='repeated')
    hold = mk('LFPG.STAR.X2A.RW27L', [('A', 49.0, 1.0, 'IF'), ('B', 49.0, 0.5, 'TF'), ('B', 49.0, 0.5, 'FM'), ('C', 49.0, 0.0, 'TF'), ('B', 49.0, 0.5, 'HM')])
    c.eq(G.guardrails(hold), [], 'a manual-termination leg on the same fix and a holding are not repeats', what='holding')
    zig = mk('LFPG.STAR.X3A.RW27L', [('A', 49.0, 0.0, 'IF'), ('B', 49.0, 1.0, 'TF'), ('C', 49.0, 0.0, 'TF'), ('D', 49.0, 1.0, 'TF'), ('E', 49.0, 0.2, 'TF')])
    z = G.zigzag_ratio(zig)
    c.ok(z and z > 3 and G.guardrails(zig) == [('zigzag', f'zigzag: {z:.1f} × le trajet direct'.replace('.', ','))], f'{z} {G.guardrails(zig)}', 'a zigzag: the path is more than three times the direct distance')
    straight = mk('LFPG.STAR.X4A.RW27L', [('A', 49.0, 1.0, 'IF'), ('B', 49.0, 0.5, 'TF'), ('C', 49.0, 0.0, 'TF')])
    c.eq((G.zigzag_ratio(straight) < 1.01, G.guardrails(straight), G.zigzag_ratio(mk('x', [('A', 49.0, 1.0, 'IF'), ('B', None, None, 'TF'), ('C', 49.0, 0.0, 'TF')]))), (True, [], None),
         'a straight route is fine; fewer than three positioned points: not measured', what='zigzag')
    # the same through the whole chain: a page whose first block has lost its title, and a page that repeats a point; both kept as doubt, counted
    r08 = rows(stem('STAR_RWY08L_RNAV_CODE_01'))
    notitle = [x for x in r08 if not x.startswith('ENORI 9E')]
    dup = list(r08)
    k = max(i for i, x in enumerate(dup) if x.startswith('- TF LORNI') and i < 40)
    dup.insert(k + 1, '- TF XERAM - 269 270.5 27.9 -- -- 1.0')
    d2 = P.build_aerodrome('LFPG', [stem('STAR_RWY08L_RNAV_CODE_01') + '.pdf'], lambda n: notitle, 'https://example.org/AIRAC-2026-10-29', '2026-10-29')
    nn = [p for p in d2['procedures'] if '.NONAME.' in p['id']]
    c.ok(len(nn) == 1 and nn[0]['status'] == 'doubt' and nn[0]['doubt'] == 'name' and any('À VÉRIFIER' in w and 'NONAME' in w for w in d2['warnings']), str([(p['id'], p['status']) for p in nn]),
         'a nameless record is KEPT, status doubt, code name, and said in the warnings (not installed as sure, not purged)')
    d3 = P.build_aerodrome('LFPG', [stem('STAR_RWY08L_RNAV_CODE_01') + '.pdf'], lambda n: dup, 'https://example.org/AIRAC-2026-10-29', '2026-10-29')
    rp = [p for p in d3['procedures'] if p['status'] == 'doubt']
    c.ok(len(rp) == 1 and rp[0]['name'] == 'MOPIL 9E' and rp[0]['doubt'] == 'repeat' and len(d3['procedures']) == 6 and any('À VÉRIFIER' in w and 'XERAM' in w for w in d3['warnings']), str([(p['id'], p.get('doubt')) for p in rp]),
         'a repeated point: the procedure is kept with status doubt (code repeat) and the point named in the warnings')
    st = P.stats_of(d3['formats'], len(d3['procedures']), [x['reason'] for x in d3.get('dropped', [])], G.doubt_codes(rp))
    c.eq((st['dropped'], st['doubt'], st['reasons']), (0, 1, [['repeat', 1]]), 'stats: nothing removed, one in doubt; the reason is counted', what='stats')
    d7 = P.build_aerodrome('LFPO', ['AD_2_LFPO_DATA_SID_RWY07_RNAV_CODE_04.pdf', 'AD_2_LFPO_DATA_SID_RWY07_RNAV_CODE_05.pdf'], lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-01', '2026-10-01')
    c.ok(len(d7['dropped']) == 1 and d7['dropped'][0]['reason'] == 'name' and not [p for p in d7['procedures'] if '.NONAME.' in p['id']], str(d7.get('dropped')),
         'the untitled repeat of a named procedure is REALLY removed and counted as dropped (the only removal)')
    geo = {'id': 'LFPG.SID.G1A.RW27L', 'kind': 'SID', 'status': 'check', 'points': [{'id': 'A', 'lat': 49.0, 'lon': 1.0, 'leg': 'IF'}, {'id': 'B', 'lat': 49.0, 'lon': 0.0, 'leg': 'TF', 'crs': 90, 'nm': 5.0}]}
    c.ok(any('A → B' in x for x in G.review(geo)) and geo['status'] == 'doubt' and geo['doubt'] == 'geometry', str(geo), 'the geometry check marks a procedure whose printed course and distance contradict the positions: doubt, not removed')

@case('K27', 'OpenAir limits: the unit is a whole word (X-Plane airspaces)', 'K', tags=('aerodb',), phone=False,
      rule='aerodb DECISIONS 29 Oct 2026 (Dublin CTA « 3000 m »): the M of MSL is no metre')
def k27(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.wait_for_function('!!window.AeroSources', timeout=30000)
    txt = chr(10).join(['AC C', 'AN DUBLIN CTA', 'AL 3000MSL', 'AH 24500 MSL', 'DP 53:30:00 N 006:30:00 W', 'DP 53:40:00 N 006:10:00 W', 'DP 53:20:00 N 006:00:00 W',
                     'AC D', 'AN TEST CTR', 'AL GND', 'AH 300 m AGL', 'DP 53:30:00 N 006:30:00 W', 'DP 53:40:00 N 006:10:00 W', 'DP 53:20:00 N 006:00:00 W',
                     'AC D', 'AN TEST TMA', 'AL 1500ft AMSL', 'AH FL95', 'DP 53:30:00 N 006:30:00 W', 'DP 53:40:00 N 006:10:00 W', 'DP 53:20:00 N 006:00:00 W', ''])
    got = c.js('(t) => window.AeroSources.openair(t, "xplane").map(z => [z.name, z.lower, z.upper])', txt)
    c.eq(got, [['DUBLIN CTA', '3000 ft AMSL', '24500 ft AMSL'], ['TEST CTR', 'SFC', '300 m ASFC'], ['TEST TMA', '1500 ft AMSL', 'FL 95']],
         '« 3000MSL » and « 24500 MSL » are feet; « 300 m AGL » stays metres; ft and FL unchanged', what='OpenAir limits')


@case('K41', 'Same-family overlaps with different floors: reported in the zone statistics, flagged on the airspaces, never cut (Dublin CTA 3 to 6)', 'K',
      tags=('aerodb',), phone=False,
      rule='aerodb DECISIONS 29 Oct 2026 (same-family overlaps): the base reproduces the source; the build reports sectors of one family (type, class, name without its sector number, source) that overlap with different floors, and flags them (ovl)')
def k41(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.wait_for_function('!!window.SiaBase', timeout=30000)
    c.page.add_script_tag(url=f'{c.base}/shared/carto/aero_symbols.js')
    c.page.wait_for_function('!!window.SiaAero && !!window.SiaAero.limitRead', timeout=30000)
    got = c.js('''() => {
      // carré de côté 2h centré en (la, lo), en degrés : [lat, lon] comme les anneaux de la base
      const sq = (la, lo, h) => [[la - h, lo - h], [la - h, lo + h], [la + h, lo + h], [la + h, lo - h]];
      const A = (name, lower, upper, rings, o = {}) => ({ type: 'CTA', cls: 'C', src: 'openaip', name, lower, upper, rings: [rings], ...o });
      const run = list => SiaBase.sameFamilyOverlaps(list, SiaAero.limitRead);
      const out = {};
      // Dublin : des disques de plus en plus larges qui contiennent le terrain, planchers 1500 / 2500 / 3000
      const dub = [A('TESTVILLE CTA 1', '1500 ft AMSL', 'FL 245', sq(53.4, -6.3, .1)), A('TESTVILLE CTA 3', '2500 ft AMSL', 'FL 245', sq(53.4, -6.3, .5)),
        A('TESTVILLE CTA 4', '3000 ft AMSL', 'FL 245', sq(53.4, -6.3, .7))];
      const d = run(dub);
      out.dublin = { overlaps: d.overlaps, flags: d.airspaces.map(a => a.ovl), input: dub.some(a => 'ovl' in a) };
      // mêmes planchers (à 20 ft près : 762 m = 2500 ft), famille différente, disjoints, frontière commune, couches l'une sur l'autre, classe, source
      const same = run([A('SAMEVILLE CTA 1', '2500 ft AMSL', 'FL 245', sq(53.4, -6.3, .5)), A('SAMEVILLE CTA 2', '762 m AMSL', 'FL 245', sq(53.4, -6.3, .3))]);
      const other = run([A('ONEVILLE CTA 1', '1500 ft AMSL', 'FL 245', sq(53.4, -6.3, .5)), A('TWOVILLE CTA 1', '3000 ft AMSL', 'FL 245', sq(53.4, -6.3, .3))]);
      const far = run([A('FARVILLE CTA 1', '1500 ft AMSL', 'FL 245', sq(53.4, -6.3, .2)), A('FARVILLE CTA 2', '3000 ft AMSL', 'FL 245', sq(55, -4, .2))]);
      const edge = run([A('EDGEVILLE CTA 1', '1500 ft AMSL', 'FL 245', [[53, -7], [53, -6], [54, -6], [54, -7]]),
        A('EDGEVILLE CTA 2', '3000 ft AMSL', 'FL 245', [[53.0004, -6.0003], [53, -5], [54, -5], [54, -6.0003]])]); // 0,0003° de recouvrement : tracé approché
      const layers = run([A('LAYERVILLE R A', 'SFC', '5000 ft AMSL', sq(53.4, -6.3, .5), { type: 'R' }), A('LAYERVILLE R B', '5000 ft AMSL', 'FL 245', sq(53.4, -6.3, .5), { type: 'R' })]);
      const stack = run([A('STACKVILLE CTA 1', '1500 ft AMSL', 'FL 245', sq(53.4, -6.3, .5)), A('STACKVILLE CTA 2', '3000 ft AMSL', 'FL 245', sq(53.4, -6.3, .5))]);
      const cls = run([A('CLASSVILLE CTA 1', '1500 ft AMSL', 'FL 245', sq(53.4, -6.3, .5)), A('CLASSVILLE CTA 2', '3000 ft AMSL', 'FL 245', sq(53.4, -6.3, .3), { cls: 'D' })]);
      const src = run([A('SRCVILLE CTA 1', '1500 ft AMSL', 'FL 245', sq(53.4, -6.3, .5)), A('SRCVILLE CTA 2', '3000 ft AMSL', 'FL 245', sq(53.4, -6.3, .3), { src: 'xplane' })]);
      // deux bandes qui se croisent en croix : aucun sommet de l'une dans l'autre, deux côtés qui se croisent
      const cross = run([A('CROSSVILLE CTA 1', '1500 ft AMSL', 'FL 245', [[53.3, -6.8], [53.3, -5.8], [53.5, -5.8], [53.5, -6.8]]),
        A('CROSSVILLE CTA 2', '3000 ft AMSL', 'FL 245', [[53.0, -6.4], [53.0, -6.2], [53.8, -6.2], [53.8, -6.4]])]);
      const floors = run([A('NOFLOOR CTA 1', '', 'FL 245', sq(53.4, -6.3, .5)), A('NOFLOOR CTA 2', '3000 ft AMSL', 'FL 245', sq(53.4, -6.3, .3))]);
      Object.assign(out, { same: same.overlaps, other: other.overlaps, far: far.overlaps, edge: edge.overlaps, layers: layers.overlaps, stack: stack.overlaps, cls: cls.overlaps,
        src: src.overlaps, cross: cross.overlaps, floors: floors.overlaps });
      // un drapeau périmé est retiré d'un espace qui n'est plus concerné ; sans lecteur de limites : rien n'est vérifié
      const stale = run([A('FARVILLE CTA 1', '1500 ft AMSL', 'FL 245', sq(53.4, -6.3, .2), { ovl: 'FARVILLE CTA' })]);
      out.stale = 'ovl' in stale.airspaces[0];
      out.noReader = SiaBase.sameFamilyOverlaps(dub, null);
      // les familles détaillées sont limitées à 50, le total est donné ; un plafond UNL va jusqu'en haut
      const many = [];
      for (let i = 0; i < 60; i++) many.push(A('MANYVILLE' + i + ' CTA 1', '1500 ft AMSL', 'FL 245', sq(40 + i / 10, 3, .05)), A('MANYVILLE' + i + ' CTA 2', '3000 ft AMSL', 'UNL', sq(40 + i / 10, 3, .02)));
      const m = run(many);
      out.many = { count: m.overlaps.count, listed: m.overlaps.families.length, airspaces: m.overlaps.airspaces };
      // le chemin de la publication : splitZones range les espaces par zone, pose ovl et la statistique de la zone
      const parts = SiaBase.splitZones({ airspaces: dub, aero: {}, obstacleMax: {}, moraCells: [] }, ['ie'], null, {});
      out.split = { overlaps: parts.ie.overlaps && parts.ie.overlaps.count, flags: parts.ie.airspaces.map(a => a.ovl), version: SiaBase.VERSION };
      return out;
    }''')
    D = got['dublin']
    c.eq([D['overlaps']['count'], D['overlaps']['airspaces']], [1, 3], 'Dublin: one family, three members (the disc 3 contains the sector 1; the disc 4 contains both)', what='dublin')
    fam = D['overlaps']['families'][0]
    c.eq([fam['family'], fam['type'], fam['cls'], fam['src'], fam['members'], fam['floors']],
         ['TESTVILLE CTA', 'CTA', 'C', 'openaip', ['TESTVILLE CTA 1', 'TESTVILLE CTA 3', 'TESTVILLE CTA 4'], ['1500 ft AMSL', '2500 ft AMSL', '3000 ft AMSL']],
         'the family without its sector number; the members and their floors as written, in the same order', what='family')
    c.eq(D['flags'], ['TESTVILLE CTA'] * 3, 'each member carries ovl = the family', what='flags')
    c.ok(not D['input'], 'the input list was modified', 'the airspaces given are copied, never changed')
    for k, why in (('same', 'same floors (762 m is 2500 ft)'), ('other', 'different families'), ('far', 'disjoint outlines'), ('edge', 'a shared boundary drawn 0,0003 deg apart'),
                   ('layers', 'layers one above the other (ceiling = floor)'), ('stack', 'the same outline twice: vertical layers, not a double coverage'), ('cls', 'different classes'),
                   ('src', 'different sources'), ('floors', 'one floor unreadable')):
        c.eq(got[k]['count'], 0, f'not reported: {why}', what=k)
    c.eq([got['cross']['count'], got['cross']['families'][0]['members']], [1, ['CROSSVILLE CTA 1', 'CROSSVILLE CTA 2']], 'two bands crossing (no vertex of one inside the other): reported by their edges', what='cross')
    c.eq(got['stale'], False, 'a stale ovl is removed from an airspace that is not concerned any more', what='stale')
    c.eq(got['noReader'], None, 'without a limit reader nothing is checked (null), the zone keeps its airspaces', what='no reader')
    c.eq(got['many'], {'count': 60, 'listed': 50, 'airspaces': 120}, 'the detail is capped at 50 families, the total (60 families, 120 airspaces) is given', what='cap')
    c.eq([got['split']['overlaps'], got['split']['flags']], [1, ['TESTVILLE CTA'] * 3], 'splitZones (the publication path): the zone has its statistics and the flags', what='splitZones')
    c.ge(got['split']['version'], 19, 'the flag changes the build output: parser version 19 or more', what='SiaBase.VERSION')




# ------------------------------------------------------------------------------------------------ Irish tables, Dublin variants (static)
@case('K26', 'Irish coding tables, Dublin variants: column order B, reversed STAR pages, RNP pages, point-less CA leg', 'K', static=True,
      rule='aerodb DECISIONS 29 Oct 2026 (EIDW): one tolerant row reader that picks the column order from the line itself; a row that stays ambiguous, unconfirmed or contradicting itself rejects its block, never guessed')
def k26(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    P = _proc()
    M = importlib.import_module('proc_manual')
    fx = c.root / 'frame/aerodb/test/fixtures/ead'

    def page(name):
        return (fx / f'EI_SYNTH_{name}.rows.txt').read_text(encoding='utf-8').splitlines()
    sid, star, app = page('SID_dublin_style'), page('STAR_dublin_style_reversed'), page('RNP_dublin_style')
    c.eq([P.detect_layout(x) for x in (sid, star, app)], ['ei-coding'] * 3, 'the three pages (« Mag track », « Term », text in reverse order, RNP / APCH on three lines) are recognised', what='detect_layout')
    c.eq(P.detect_layout([x for x in sid if 'CAT A/B' not in x and 'RNAV1' not in x]), None, 'the header words alone (no co-ordinate row) are not enough', what='no rows')
    # departures: two blocks, the two header layouts, glitches of the text layer
    r = P.parse_ei_coding(sid)
    c.eq(([t['name'] for t in r['tables']], [t['kind'] for t in r['tables']], [t['runways'] for t in r['tables']], r['warnings']), (['RUBE1B', 'MAVI 1B'], ['SID', 'SID'], [['28L'], ['28L']], []),
         'two SID blocks: coded designator (also with a space), kind and runway from the title, nothing reported', what='SID tables')
    a, b = r['tables'][0]['legs'], r['tables'][1]['legs']
    c.eq([(x['id'], x['leg']) for x in a], [(None, 'CA'), ('DX080', 'DF'), ('DX682', 'TF'), ('KELOT', 'TF'), ('DX024', 'TF'), ('RUBEN', 'TF')], 'legs in order; the RWY28 line is a CA leg without a point', what='RUBE1B legs')
    c.eq((a[0]['crs'], a[0]['true'], a[0]['alt'], a[0]['lat']), (278, 275.2, {'type': 'min', 'ft': 750}, None), 'CA: the runway course (magnetic and true), at or above 750 ft (« A750 + »), no position', what='CA')
    c.eq([x['turn'] for x in a], [None, 'L', 'R', 'L', None, 'R'], 'turns from the remarks', what='turns')
    c.eq((a[5]['alt'], a[2]['alt']), ({'type': 'max', 'ft': 4000}, None), '« A 4000 / - » : upper limit = at or below 4000 ft', what='limits')
    c.ok(abs(a[3]['lat'] - 52.9490) < 0.0004 and a[3]['crs'] == 158 and a[4]['true'] == 20.0 and b[2]['nm'] == 11.8, str([a[3]['lat'], a[3]['crs'], a[4]['true'], b[2]['nm']]),
         'digits cut by the text layer are joined: « 52565 6 . 4 », « 15 8 », « 020. 0 », « 1 1.8 »')
    c.eq(([x['id'] for x in b], b[1]['turn'], b[0]['alt']), ([None, 'DX110', 'DX024', 'MAVIS'], 'R', {'type': 'min', 'ft': 750}),
         '« DX0 24 » is put back whole (same position as DX024 above); « Turn R , VOR » is a right turn; « A750+ » joined', what='MAVI 1B')
    c.eq([_gaps(t['legs']) for t in r['tables']], [[], []], 'true tracks and distances agree with the printed positions', what='geometry')
    # arrivals: the text layer gives the page backwards
    s = P.parse_ei_coding(star)
    c.eq(([t['name'] for t in s['tables']], [t['kind'] for t in s['tables']], [t['runways'] for t in s['tables']], s['warnings']),
         (['ZORB4L', 'KIPL4L'], ['STAR', 'STAR'], [['28L', '28R'], ['28L', '28R']], []), 'STAR page in reverse order: both blocks, « RWY 28L/R » gives two runways, the holding lines are not legs', what='STAR tables')
    z, k = s['tables'][0]['legs'], s['tables'][1]['legs']
    c.eq([x['id'] for x in z], ['ZORBA', 'QUILO', 'HEBRO', 'DX814', 'FANTO'], 'legs back in flying order (the IF first)', what='order')
    c.eq(([x['alt'] for x in z][:2], z[4]['alt'], z[1]['kt'], z[1]['turn']), ([{'type': 'max', 'ft': 24000}, {'type': 'at', 'ft': 8000}], {'type': 'min', 'ft': 3000}, 220, 'R'),
         '« - FL240 / - » (sign apart) is at or below FL240; « FL080 / FL080 » at; « - / +A3000 » at or above', what='STAR limits')
    c.eq(k[0]['alt'], {'type': 'between', 'ft': 15000, 'ft2': 17000}, '« -FL170 / +FL150 » is between FL150 and FL170', what='between')
    c.eq([_gaps(t['legs']) for t in s['tables']], [[], []], 'geometry', what='STAR geometry')
    # RNP approaches: the navigation specification cut over three lines, the vertical angle column, the missed approach after the runway point
    p = P.parse_ei_coding(app)
    c.eq(([t['name'] for t in p['tables']], [t['kind'] for t in p['tables']], [t['runways'] for t in p['tables']]), (['RNP RWY 28L via LUMEX'], ['APP'], [['28L']]),
         'RNP block: the aerodrome word of the title is dropped; the missed-approach table alone is not made a procedure', what='APP tables')
    c.ok(sum('MISSED APP' in x and 'non lue' in x for x in p['warnings']) == 1 and not any('NON retenue' in x for x in p['warnings']), str(p['warnings']),
         'the missed approach table alone is said, without failing the page')
    g = p['tables'][0]['legs']
    c.eq((g[0]['nav'], g[4]['id'], g[4].get('vpa'), g[4]['over'], g[5]['alt'], g[7]['alt']), ('RNP APCH', 'RW28L', -3.0, True, {'type': 'max', 'ft': 3000}, {'type': 'at', 'ft': 3000}),
         '« RNP / line / APCH » joined; « 3 / 54 » is a 3 degree descent; fly-over; « -A3000 / - » at or below 3000', what='RNP legs')
    # the whole chain: three documents, every page read, the records and the check of proc_manual
    pages = {'a.pdf': [sid], 'b.pdf': [star], 'c.pdf': [app]}
    d = P.build_pdf_dir('EIXX', sorted(pages), lambda n: pages[n], '2026-10-29')
    kinds = {}
    for x in d['procedures']:
        kinds[x['kind']] = kinds.get(x['kind'], 0) + 1
    c.eq(([f['ok'] for f in d['formats']], kinds, M.verify(d)), ([True, True, True], {'SID': 2, 'STAR': 2, 'APP': 1}, []),
         'build_pdf_dir: 3 pages read, 2 SID + 2 STAR + 1 APP, proc_manual.verify finds nothing', what='chain')
    c.eq([x['id'] for x in d['procedures']], ['EIXX.SID.RUBE1B.RW28L', 'EIXX.SID.MAVI1B.RW28L', 'EIXX.STAR.ZORB4L.RWALL', 'EIXX.STAR.KIPL4L.RWALL', 'EIXX.APP.RNPRWY28LVIALUMEX.RW28L'],
         'identifiers', what='ids')
    ca = d['procedures'][0]['points'][0]
    c.eq((ca['id'], ca['lat'], ca['leg'], ca['crs']), (None, None, 'CA', 278), 'the CA leg is kept as a point-less leg (id null)', what='CA record')
    c.ok(not any('coordonnées absentes' in w for w in d['warnings']), str(d['warnings']), 'a point-less leg is not reported as « co-ordinates to resolve »')
    c.eq([pt.get('phase') for pt in d['procedures'][4]['points']], [None, None, None, None, None, 'missed', 'missed', 'missed'], 'the approach becomes « missed » after the runway point', what='missed phase')

    # rejections: nothing is guessed
    def mutate(rows, old, new):
        out = [x.replace(old, new) for x in rows]
        c.ok(out != rows, old, 'the mutation changed the page')
        return out
    cases = [
        ('a split name found nowhere else', mutate(sid, 'RNAV1 MAVIS ', 'RNAV1 MAV IS '), 'nom coupé non confirmé', ['RUBE1B']),
        ('a sign against its column (« + » on an upper limit)', mutate(sid, ' A 4000 / - - Turn R', ' +A 4000 / - - Turn R'), 'signe + dans la colonne supérieure', ['MAVI 1B']),
        ('a TF leg without distance', mutate(sid, '11.2 - - Turn R', '- - - Turn R'), 'sans distance', ['MAVI 1B']),
        ('a CA leg on another runway than the title\'s', mutate(sid, 'RUBEN1B CAT A/B SID RWY28L', 'RUBEN1B CAT A/B SID RWY10L'), 'piste différente', ['MAVI 1B']),
        ('a limit that is not a usual level (a digit swallowed)', mutate(sid, ' A 4000 / - - Turn R', ' A 4002 / - - Turn R'), 'limite invraisemblable', ['MAVI 1B'])]
    for label, rows, why, left in cases:
        q = P.parse_ei_coding(rows)
        bad = [x for x in q['warnings'] if 'NON retenue' in x]
        c.ok(len(bad) >= 1 and why in ' '.join(bad) and [t['name'] for t in q['tables']] == left, f'{bad} {[t["name"] for t in q["tables"]]}',
             f'{label}: the block is rejected with its reason, the other block is read')
    orphan = P.parse_ei_coding([x for x in sid if not x.startswith('RUBEN1B')])
    c.ok(any('hors d\'un bloc titré' in x and 'NON retenue' in x for x in orphan['warnings']), str(orphan['warnings']), 'leg rows with no title above them are reported, not dropped silently')
    bumped = P.parse_ei_coding(mutate(sid, '200.3 / 203', '205.3 / 203'))
    recs, w = P.records_uk_app('EIXX', bumped, 'f.pdf', '2026-10-29', None, 'EI')
    c.eq(({p['source']['file'] for p in recs}, recs[0]['source']['ref']), ({'f.pdf'}, 'ead-basic/EI/f.pdf'), "EAD layouts: source.file is the downloaded document's name (ref keeps the path-like form)", what='EAD source.file')
    c.eq((len(recs), [x['doubt'] for x in recs if x['status'] == 'doubt'], sum('NON retenue' in x for x in w)), (2, ['geometry'], 0), 'a true track 5 degrees off is caught by the geometry check: that table is kept as a doubt, no table is dropped', what='geometry check')


@case('K28', 'proc_geometry: one check, tolerance by what the source prints, one policy (a doubt marked with a code, nothing refused)', 'K', static=True,
      rule='V3 § 10.26 and § 10.29 (a): the tolerance is chosen by what the source prints, a failing record is kept with status doubt and a code, a hand reading is refused procedure by procedure')
def k28(c):
    import contextlib
    import io
    import json
    import tempfile
    from pathlib import Path
    G = _geometry()
    import importlib
    M = importlib.import_module('proc_manual')
    c.eq(G.TOLERANCES, {'true': (0.25, 0.2), 'magnetic': (30.0, 0.55)}, 'the tolerance table: true course tight, magnetic course broad', what='TOLERANCES')
    a, b = (51.0, -1.0), (51.1, -0.5)
    brg, nm = G.bearing_nm(a, b)

    def leg(**kw):
        return [{'id': 'A', 'leg': 'IF', 'lat': a[0], 'lon': a[1]}, {'id': 'B', 'leg': 'TF', 'lat': b[0], 'lon': b[1], **kw}]
    c.eq((G.basis_of(leg(true=1)[1]), G.basis_of(leg(crs=10)[1]), G.basis_of(leg(nm=5)[1]), G.basis_of(leg()[1]), G.tolerance_of(leg(trk=1)[1]), G.tolerance_of(leg()[1])),
         ('true', 'magnetic', 'magnetic', None, (0.25, 0.2), None), 'the basis is what the leg prints: a true course, a magnetic course or a distance, nothing; the tolerance follows', what='basis')
    c.eq(G.check_legs(leg(true=round(brg + 0.2, 2)))['gaps'], [], 'a true course 0.2° off passes the tight tolerance', what='true ok')
    c.ok(G.check_legs(leg(true=round(brg + 0.4, 2)))['gaps'], 'gap', 'a true course 0.4° off fails it')
    c.eq(G.check_legs(leg(crs=round(brg + 20)))['gaps'], [], 'the same 20° off as a magnetic course passes the broad tolerance', what='magnetic ok')
    c.ok(G.check_legs(leg(crs=round(brg + 40)))['gaps'] and G.check_legs(leg(nm=round(nm + 0.7, 1)))['gaps'], 'gap', 'a magnetic course 40° off and a distance 0.7 NM off fail it')
    un = G.check_legs(leg())
    c.eq((un['gaps'], un['compared'], un['positioned']), ([], 0, 1), 'nothing printed: nothing compared, the leg is counted as positioned (uncheckable)', what='uncheckable counts')
    # the policy: a record that fails is kept with status doubt and a code; uncheckable is a warning, never a doubt; the code is not said twice
    pts = [{'id': 'A', 'lat': a[0], 'lon': a[1], 'leg': 'IF'}, {'id': 'B', 'lat': b[0], 'lon': b[1], 'leg': 'TF', 'trk': round(brg + 5, 1)}]
    rec = {'id': 'EGXX.STAR.T1A.RWALL', 'status': 'check', 'points': pts}
    w = G.review(rec)
    c.eq((rec['status'], rec['doubt'], len(w), G.review(rec), G.codes_of(rec), G.doubt_codes([rec])), ('doubt', 'geometry', 1, [], ['geometry'], ['geometry']), 'a failing record: status doubt, code geometry, one warning, nothing said twice', what='review')
    plain = {'id': 'EGXX.STAR.T2A.RWALL', 'status': 'check', 'points': [{**pts[0]}, {'id': 'B', 'lat': b[0], 'lon': b[1], 'leg': 'TF'}]}
    w2 = G.review(plain)
    c.ok(plain['status'] == 'check' and 'doubt' not in plain and len(w2) == 1 and 'non contrôlable' in w2[0], str((plain, w2)), 'nothing printed: a warning, the record stays sure (uncheckable is never a doubt)')
    first = G.mark(plain, 'unread', '2 ligne(s) de la table non lue(s)')
    c.eq((first.endswith('À VÉRIFIER, 2 ligne(s) de la table non lue(s)'), G.mark(plain, 'unread'), plain['status'], plain['doubt']), (True, None, 'doubt', 'unread'), 'a code already marked is not said again', what='mark twice')
    unr = {'id': 'EGXX.STAR.T3A.RWALL', 'status': 'check', 'points': [{'id': 'A', 'lat': a[0], 'lon': a[1], 'leg': 'IF'}, {'id': 'B', 'lat': None, 'lon': None, 'leg': 'TF', 'crs': 40}]}
    c.eq((G.findings(unr), [x[0] for x in G.findings(unr, G.REQUIRED)]), ([], ['unresolved']), 'a point without position is skipped while aerodb still resolves them, a doubt (code unresolved) when positions are required', what='unresolved')
    c.eq(G.mark(unr, 'unresolved') is not None and unr['doubt'], 'unresolved', 'the code is set on the record', what='unresolved mark')
    # an approach loops on purpose: the same shape is a doubt as a STAR, none as an APP (repeat and zigzag are for SID and STAR; name is for every kind)
    loop = [('A', 49.0, 0.0, 'IF'), ('B', 49.0, 1.0, 'TF'), ('C', 49.0, 0.0, 'TF'), ('D', 49.0, 1.0, 'TF'), ('E', 49.0, 0.2, 'TF'), ('B', 49.0, 1.0, 'TF')]
    mkp = lambda i, kind: {'id': i, 'kind': kind, 'points': [{'id': a_, 'lat': b_, 'lon': d_, 'leg': l_} for a_, b_, d_, l_ in loop]}
    c.eq(([x[0] for x in G.guardrails(mkp('X.STAR.L1A.RWALL', 'STAR'))], [x[0] for x in G.guardrails(mkp('X.SID.L1A.RWALL', 'SID'))], G.guardrails(mkp('X.APP.L1A.RW27', 'APP')),
          [x[0] for x in G.guardrails(mkp('X.APP.NONAME.RW27', 'APP'))]), (['repeat', 'zigzag'], ['repeat', 'zigzag'], [], ['name']),
         'the same looping shape is flagged repeat and zigzag as a STAR or a SID, not as an APP; a nameless APP is still flagged', what='guards by kind')
    # hand readings: refused one procedure at a time, never the whole file unless none remains
    good = {'id': 'EGXX.STAR.G1A.RWALL', 'kind': 'STAR', 'status': 'check', 'points': [{**pts[0]}, {**pts[1], 'trk': round(brg, 1), 'nm': round(nm, 1)}]}
    wrong = {'id': 'EGXX.STAR.W1A.RWALL', 'kind': 'STAR', 'status': 'check', 'points': [{**pts[0]}, {**pts[1], 'trk': round(brg + 5, 1)}]}
    marked = {'id': 'EGXX.STAR.D1A.RWALL', 'kind': 'STAR', 'status': 'doubt', 'doubt': 'geometry', 'points': [{**pts[0]}, {**pts[1], 'trk': round(brg + 5, 1)}]}
    doc = {'schema': 1, 'icao': 'EGXX', 'cycle': '2026-10-01', 'procedures': [good, wrong, marked]}
    kept, refused = M.screen(doc)
    c.eq(([p['id'] for p in kept['procedures']], len(refused), 'cap calculé' in refused[0], len(M.verify(doc))), (['EGXX.STAR.G1A.RWALL', 'EGXX.STAR.D1A.RWALL'], 1, True, 1),
         'screen: the hand reading that fails is refused alone, a record the reader already marked doubt is kept, not rechecked; verify lists the same refusal', what='screen')
    with tempfile.TemporaryDirectory() as td:
        f = Path(td) / 'EGXX.json'
        f.write_text(json.dumps(doc), encoding='utf-8')
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            M.main([str(f), '--out', td])
        inst = json.loads((Path(td) / 'manual' / 'EGXX.json').read_text(encoding='utf-8'))
        c.ok(sorted(p['id'] for p in inst['procedures']) == ['EGXX.STAR.D1A.RWALL', 'EGXX.STAR.G1A.RWALL'] and 'REFUSÉE' in err.getvalue(), err.getvalue()[-300:],
             'main installs the procedures that pass and says which one was refused: the file is not refused')
        f.write_text(json.dumps({**doc, 'procedures': [wrong]}), encoding='utf-8')
        try:
            with contextlib.redirect_stderr(io.StringIO()):
                M.main([str(f), '--out', td])
            code = 0
        except SystemExit as e:
            code = e.code
        c.eq(code, 1, 'a file whose every procedure is refused is refused (exit 1)', what='none left')


@case('K29', 'proc_layouts: the page layouts are one ordered list, the readers derive from it', 'K', static=True,
      rule='V3 § 10.29 (b): detection order matters (uk-star before uk-app, at/be-coding before sia-code, icao-tab before de-route); each layout carries its fingerprints, OCR normaliser, OCR flag and tolerance')
def k29(c):
    import importlib
    G = _geometry()
    L = importlib.import_module('proc_layouts')
    names = [e.name for e in L.LAYOUTS]
    c.ok(isinstance(L.LAYOUTS, list) and len(names) == len(set(names)), str(names), 'LAYOUTS is a list, one entry per layout')
    pos = {n: i for i, n in enumerate(names)}
    c.ok(pos['uk-star'] < pos['uk-app'] and pos['at-coding'] < pos['sia-code'] and pos['be-coding'] < pos['sia-code'] and pos['icao-tab'] < pos['de-route'], str(names), 'the detection order that matters is kept')
    c.ok(all(callable(e.detect) and e.tolerances in G.TOLERANCES and (e.read is None) == (e.name == 'sia-code') for e in L.LAYOUTS), str(names),
         'every entry detects, names a tolerance of proc_geometry, and only sia-code has no parser here (proc_sia reads it)')
    c.eq((sorted(L.PARSERS), sorted(L.OCR_LAYOUTS), sorted(L.NORMALIZERS), sorted(k for k, v in L.KNOWN_FINGERPRINTS.items() if v)),
         (['am-coding', 'at-coding', 'be-coding', 'de-route', 'ei-coding', 'ge-coding', 'icao-tab', 'uk-app', 'uk-star'],
          ['am-coding', 'at-coding', 'be-coding', 'ei-coding', 'ge-coding', 'uk-app', 'uk-star'], ['at-coding', 'be-coding', 'ge-coding', 'uk-app', 'uk-star'], ['sia-code', 'uk-app']),
         'PARSERS, OCR_LAYOUTS, NORMALIZERS and KNOWN_FINGERPRINTS are derived from the list', what='derived tables')
    c.eq(([e.name for e in L.LAYOUTS if e.kind_hint], [e.name for e in L.LAYOUTS if e.known_names], L.BY_NAME['de-route'].tolerances, L.BY_NAME['uk-app'].tolerances),
         (['icao-tab'], ['ei-coding'], 'magnetic', 'true'), 'what a reader takes from the other pages, and the tolerance of what it prints', what='entry fields')
    c.eq((L.detect_layout(['nothing', 'to see']), L.detect_layout(['Path Terminator', 'Waypoint', 'Fly over'])), (None, 'sia-code'), 'a page nobody recognises is None; the SIA header is sia-code', what='detect_layout')


@case('K30', 'Page reasons are codes: formats[].reason, stats.reasons, the console phrase, the catalogue labels', 'K', static=True,
      rule='V3 § 10.29 (c): a page not read carries one reason code (layout, low-read, title, no-legs, counts, vector, timeout); stats.reasons is [code, count]; the text stays in the console; AeroCatalogue.READ_REASONS translates')
def k30(c):
    import re
    P = _proc()
    G = _geometry()
    problems = {'3 tronçon(s) lu(s) sur 9 lignes de tronçon: moins de 85 %': 'low-read', 'disposition non reconnue (x)': 'layout',
                'disposition non reconnue (très peu de texte: tableau dessiné en vecteurs ou image ? 3 ligne(s))': 'vector', 'titre de la page non reconnu (SID / STAR / RNP)': 'title',
                'aucun groupe de tronçons lu': 'no-legs', 'aucune table lue': 'no-legs', 'T (table 1): 2 tronçon(s) lu(s), table NON retenue': 'counts',
                "3 ligne(s) de tronçon hors d'un bloc titré, NON retenue(s)": 'title', 'x.pdf: lecture abandonnée après 60 s': 'timeout'}
    c.eq({k: P.reason_of(k) for k in problems}, problems, 'each French problem of a page maps to its code', what='reason_of')
    c.eq(P.page_reason(['info: en-tête inconnu (empreinte x)', 'aucun groupe de tronçons lu']), 'no-legs', 'an information line is no reason', what='page_reason')
    # the pages of an aerodrome folder: one reason each
    uk_empty = ['Instrument Approach Procedure Coding Tables', 'Designator', 'Sequence', 'Co-ordinates']

    def rows_of(name):
        if name == 'timeout.pdf':
            raise P.PdfTimeout('timeout.pdf: lecture abandonnée après 60 s')
        return {'drawn.pdf': [['AIP', 'chart']], 'text.pdf': [[f'line {i} of a page no reader knows' for i in range(30)]], 'empty.pdf': [uk_empty]}[name]
    d = P.build_pdf_dir('EGXX', ['drawn.pdf', 'empty.pdf', 'text.pdf', 'timeout.pdf'], rows_of, '2026-10-01')
    c.eq({f['file']: (f['ok'], f['reason']) for f in d['formats']},
         {'drawn.pdf': (False, 'vector'), 'empty.pdf': (False, 'no-legs'), 'text.pdf': (False, 'layout'), 'timeout.pdf': (False, 'timeout')},
         'a drawn page, a known layout with no table, an unknown layout and an abandoned reading each carry their code, beside the French problems', what='build_pdf_dir')
    c.ok(all(f['problems'] for f in d['formats']), str(d['formats']), 'the French detail stays in problems')
    st = P.stats_of(d['formats'], 0)
    c.eq((st['reasons'], st['rejected']), ([['layout', 1], ['no-legs', 1], ['timeout', 1]], 4), 'stats.reasons is [code, count], codes only', what='stats_of')
    # a SIA page: the 85 % rule
    rows = _eaip(c)[2]
    widened = [re.sub(r'^((?:INA \S+ )?(?:IF|TF|DF|CF) \S+) ', r'\1 NEW ', r) for r in rows('AD_2_LFAV_DATA_RWY29_RNP_CODE')]
    sia = P.build_aerodrome('LFAV', ['AD_2_LFAV_DATA_RWY29_RNP_CODE.pdf', 'AD_2_LFAV_DATA_01.pdf'], lambda n: widened if 'RNP_CODE' in n else rows(n.replace('.pdf', '')),
                            'https://example.org/AIRAC-2026-10-01', '2026-10-01')
    notread = [f for f in sia['formats'] if not f['ok']]
    c.ok(notread and all(f['reason'] in ('low-read', 'layout') for f in notread), str(sia['formats']), 'a SIA page that is not read carries a reason code too')
    # the console says the phrase, one table for every code; the catalogue translates the same codes
    codes = list(G.PAGE_CODES) + list(G.DOUBT_CODES)
    c.ok(all(k in G.PHRASES for k in codes) and G.phrase('layout') == 'mise en page non reconnue' and G.phrase('geometry') == 'géométrie incohérente', str([G.phrase(k) for k in codes]),
         'every page code and doubt code has a phrase for the console')
    js = (c.root / 'frame/aerodb/catalogue.js').read_text(encoding='utf-8')
    block = js[js.index('const READ_REASONS = {'):]
    block = block[:block.index('};')]
    keys = re.findall(r"^    '?([a-z-]+)'?: \[", block, re.M)
    c.eq(sorted(keys), sorted(codes), 'AeroCatalogue.READ_REASONS has exactly the page codes and the doubt codes of proc_geometry (the test page checks the four languages)', what='READ_REASONS keys')


@case('K31', 'Geometry tolerance falls back to the layout; a point missing from a Belgian list is a doubt, not a refusal', 'K', static=True,
      rule="V3 § 10.29 (c): a leg that prints neither a true nor a magnetic course takes its layout's tolerance; a leg that prints one keeps its own; a layout that requires positions marks unresolved")
def k31(c):
    import importlib
    P = _proc()
    G = _geometry()
    L = importlib.import_module('proc_layouts')
    a, b = (51.0, -1.0), (51.1, -0.5)
    brg, nm = G.bearing_nm(a, b)

    def legs(**kw):
        return [{'id': 'A', 'leg': 'IF', 'lat': a[0], 'lon': a[1]}, {'id': 'B', 'leg': 'TF', 'lat': b[0], 'lon': b[1], **kw}]
    off = round(nm + 0.4, 1)
    c.eq((G.check_legs(legs(nm=off))['gaps'], bool(G.check_legs(legs(nm=off), 'true')['gaps']), G.check_legs(legs(nm=off), 'magnetic')['gaps']), ([], True, []),
         'a distance 0.4 NM off passes the magnetic tolerance and fails the true one: the layout key decides when the leg prints only a distance', what='fallback')
    c.eq(G.check_legs(legs(nm=off, crs=round(brg)), 'true')['gaps'], [], 'a leg that prints a (magnetic) course keeps its own basis, whatever the layout says', what='own basis')
    c.ok(G.check_legs(legs(nm=off, true=round(brg, 1)), 'magnetic')['gaps'], 'gap', 'and one that prints a true course keeps the tight tolerance')
    # through the record builder: the layout's key reaches the check
    tbl = {'title': 'T', 'kind': 'STAR', 'name': 'TEST 1A', 'runways': [], 'transition': None, 'legs': [
        {'id': 'A', 'leg': 'IF', 'lat': a[0], 'lon': a[1], 'alt': None, 'kt': None, 'crs': None, 'true': None, 'nm': None, 'over': None, 'remark': ''},
        {'id': 'B', 'leg': 'TF', 'lat': b[0], 'lon': b[1], 'alt': None, 'kt': None, 'crs': None, 'true': None, 'nm': off, 'over': None, 'remark': ''}]}
    ei = P.records_uk_app('EIXX', {'tables': [tbl], 'warnings': []}, 'f.pdf', '2026-10-29', None, 'EI', 'ei-coding')[0][0]
    de = P.records_uk_app('EDXX', {'tables': [tbl], 'warnings': []}, 'f.pdf', '2026-10-29', None, 'ED', 'de-route')[0][0]
    none = P.records_uk_app('EDXX', {'tables': [tbl], 'warnings': []}, 'f.pdf', '2026-10-29')[0][0]
    c.eq(((ei['status'], ei.get('doubt')), de['status'], none['status']), (('doubt', 'geometry'), 'check', 'check'),
         'records_uk_app: the Irish layout (true) judges a distance-only leg tightly, the German one (magnetic) and no layout as before', what='records_uk_app')
    # unresolved: only the layouts that require positions
    c.eq({e.name: e.positions for e in L.LAYOUTS if e.positions != 'deferred'}, {'be-coding': 'required'}, 'only the Belgian list requires positions', what='positions')
    miss = {'tables': [{**tbl, 'legs': [tbl['legs'][0], {**tbl['legs'][1], 'lat': None, 'lon': None, 'true': 90.0, 'nm': None}]}], 'warnings': []}
    be = P.records_uk_app('EBXX', miss, 'f.pdf', '2026-10-29', None, 'EB', 'be-coding')
    ea = P.records_uk_app('EIXX', miss, 'f.pdf', '2026-10-29', None, 'EI', 'ei-coding')
    c.eq(((be[0][0]['status'], be[0][0].get('doubt')), any('à résoudre par aerodb' in w for w in be[1]), ea[0][0]['status'], any('à résoudre par aerodb' in w for w in ea[1])),
         (('doubt', 'unresolved'), False, 'check', True), 'a missing position is a doubt (unresolved) for the Belgian layout; elsewhere aerodb still resolves it (warning, record sure)', what='unresolved')


@case('K32', 'Security review of the split: names taken from a server are never paths; the ICAO codes of the command line are checked', 'K', static=True,
      rule='V3 § 10.29 (c), relecture de sécurité de la scission: a PDF name from the AD 2 page or from EAD is a plain file name under the cache; ICAO ^[A-Z0-9]{4}$')
def k32(c):
    import contextlib
    import importlib
    import io
    import tempfile
    from pathlib import Path
    P = _proc()
    S = importlib.import_module('proc_sia')
    E = importlib.import_module('proc_ead')
    hostile = ['../../x.pdf', 'a/b.pdf', '..\\x.pdf', '/etc/x.pdf', 'C:\\x.pdf', ' lead.pdf', '..pdf/..', '.pdf/x', 'a:b.pdf']
    with tempfile.TemporaryDirectory() as td:
        cache = Path(td) / 'cache'
        cache.mkdir()
        refused = []
        for n in hostile:
            try:
                P.safe_path(cache, n)
            except ValueError:
                refused.append(n)
        c.eq(refused, hostile, 'safe_path refuses every hostile name', what='safe_path')
        c.ok(P.safe_path(cache, 'AD_2_LFBD_DATA_RWY23_RNP_CODE.pdf').parent == cache and P.safe_path(cache, 'AD_2_LFBO_IAC_RWY14R_FNA_ILS_Y_CAT_ 1_2_3_LOC_Y.pdf').parent == cache and P.safe_path(cache, 'EG_AD_2_EGLL_6-1_en', E.SAFE_NAME).name == 'EG_AD_2_EGLL_6-1_en', 'ok',
             'a plain file name is accepted (a space inside it too, as in the LFBO ILS charts; EAD names may have no extension)')
        # the AD 2 page cites hostile names beside a good one: only the good one is asked for, nothing is written outside the cache
        evil = ('../../x.pdf', 'a/b.pdf', '..\\x.pdf')
        page = '<a href="Cartes/LFXX/AD_2_LFXX_DATA_RWY09_RNAV_CODE.pdf">x</a>' + ''.join(f'<a href="Cartes/LFXX/{n}">y</a>' for n in evil)
        skipped = []
        c.eq((P.pdf_names('LFXX', page, skipped), sorted(skipped)), (['AD_2_LFXX_DATA_RWY09_RNAV_CODE.pdf'], sorted(evil)), 'pdf_names keeps the plain name and lists the refused ones', what='pdf_names')
        asked, said = [], []
        saved = (S.fetch, S.all_pages_rows, S.url_exists)

        def fake_fetch(url, timeout=60):
            asked.append(url)
            return page.encode() if url.endswith('FR-AD-2.LFXX-fr-FR.html') else b'%PDF-1.4'
        S.fetch, S.all_pages_rows, S.url_exists = fake_fetch, lambda p: [[]], lambda *a, **k: False
        try:
            S.read_aerodrome(S.eaip_url('2026-10-01'), 'LFXX', cache, None, lambda *t: said.append(' '.join(map(str, t))))
        finally:
            S.fetch, S.all_pages_rows, S.url_exists = saved
        names = sorted(p.name for p in Path(td).rglob('*'))
        c.ok(len([u for u in asked if u.endswith('.pdf')]) == 1 and sum('nom de PDF refusé' in s for s in said) == 3 and 'x.pdf' not in names
             and sorted(p.name for p in cache.iterdir()) == ['AD_2_LFXX_DATA_RWY09_RNAV_CODE.pdf'], f'{asked} {said} {names}',
             'read_aerodrome asks for the plain name only, says the three refusals, and writes nothing but that file in the cache')
        # a bad ICAO code never reaches an address or a file name
        bad = []
        for code in ('lf/../x', 'LFB', 'LFBDX', 'L F', ''):
            try:
                S.read_aerodrome(S.eaip_url('2026-10-01'), code, cache)
            except ValueError as e:
                bad.append('OACI' in str(e))
        c.eq(bad, [True] * 5, 'read_aerodrome refuses a bad ICAO code', what='icao read_aerodrome')
        eaip = S.eaip_url('2026-10-01')
        for argv in (['..', '--eaip', eaip], ['lf1', '--eaip', eaip], ['LFBD', 'x/y', '--eaip', eaip], ['a/b', '--pdf-dir', td, '--cycle', '2026-10-01']):
            try:
                with contextlib.redirect_stderr(io.StringIO()):
                    S.main(argv + ['--cache', str(cache), '--out', str(Path(td) / 'out')])
                msg = 'no refusal'
            except SystemExit as e:
                msg = str(e)
            c.ok('code OACI refusé' in msg, msg, f'the command line refuses {argv[0]!r}')
        c.ok(not (Path(td) / 'out').exists(), 'out', 'and nothing was written')

        # EAD: a document name from the server never leaves the cache
        class Lib:
            def authority(self, x):
                return True

            def choose(self, *a):
                pass

            def search(self, **kw):
                return {'count': 3, 'pages': 1, 'warning': None, 'rows': [{'cells': [n, 'a title'], 'links': [], 'buttons': []} for n in ('EG_AD_2_../../x.pdf', 'EG_AD_2_a/b.pdf', 'EG_AD_2_..\\x.pdf')]}

            def fetch(self, row):
                raise AssertionError('a refused name must not be downloaded')
        out = Path(td) / 'ead'
        say = []
        E.fetch_ad(Lib(), 'EGLL', out, lambda *t: say.append(' '.join(map(str, t))))
        c.ok(sum('nom refusé' in s for s in say) >= 3 and sorted(p.name for p in (out / 'cache' / 'EGLL').iterdir()) == [] and not (Path(td) / 'x.pdf').exists(), str(say[-4:]),
             'EAD: the hostile names are refused before any download or write')
    c.ok('.proc_cache/' in (c.root / '.gitignore').read_text(encoding='utf-8').split(), '.gitignore', 'the default cache folder of the command line is ignored by Git')
    dc = S.default_cache()
    c.ok(Path(dc) == c.root / 'data' / 'local' / 'eaip' if (c.root / 'data').is_dir() else dc == '.proc_cache', dc, 'without --cache: data/local/eaip when the data folder exists, else .proc_cache')


def _eaip_cache(cycle):
    """Le dossier des PDF d'un cycle sur ce poste (le cache du lanceur, <dépôt>/data/local/eaip/<cycle> ; ou, pour un essai, celui que donne la variable EAIP_FIXTURE_CACHE, qui contient un dossier par cycle) ; None s'il n'y est pas.
    Le cache n'est pas dans le dépôt de code : le cas qui s'en sert est alors sauté, et dit pourquoi."""
    import os
    from pathlib import Path
    for base in (os.environ.get('EAIP_FIXTURE_CACHE'), str(ROOT / 'data' / 'local' / 'eaip')):
        if base and (Path(base) / cycle).is_dir():
            return Path(base) / cycle
    return None


@case('K33', 'eAIP page sets: one set per French aerodrome, with its manifest', 'K', static=True,
      rule='V3 § 10.29 (e): frame/aerodb/test/fixtures/eaip/<ICAO>/ holds the rows of every page used, the AD 2.12 extract and a manifest that matches the files')
def k33(c):
    import json
    import re
    fx = c.root / 'frame/aerodb/test/fixtures/eaip'
    sets = sorted(d.name for d in fx.iterdir() if d.is_dir())
    c.eq(sets, ['LFAV', 'LFBD', 'LFBO', 'LFLL', 'LFPG', 'LFPO'], 'six sets, French aerodromes only (the foreign layouts stay on invented pages)', what='sets')
    stray = [f.name for f in fx.iterdir() if f.is_file()]
    c.eq(stray, [], 'no loose rows file beside the sets', what='loose files')
    sizes = {}
    for icao in sets:
        d = fx / icao
        m = json.loads((d / 'manifest.json').read_text(encoding='utf-8'))
        files = sorted(f.name for f in d.glob('*.rows.txt'))
        c.eq((m['icao'], m['source'], bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', m['cycle']))), (icao, 'SIA eAIP', True), f'{icao}: manifest icao, source and cycle', what=f'{icao} manifest')
        c.eq([e['file'][:-4] + '.rows.txt' for e in m['pages']], files, f'{icao}: the manifest lists exactly the rows files of the set', what=f'{icao} pages')
        c.eq([e['rows'] for e in m['pages']], [len((d / f).read_text(encoding='utf-8').splitlines()) for f in files], f'{icao}: the row counts of the manifest are the files\'', what=f'{icao} rows')
        if m.get('regenerable') is False:
            c.ok(m.get('note') == 'not regenerable: source PDF not cached' and not any('sha256' in e for e in m['pages']), str(m)[:200], f'{icao}: a set whose PDF are not cached says so and carries no hash')
        else:
            c.ok(all(re.fullmatch(r'[0-9a-f]{64}', e['sha256']) and e['pages'] >= 1 for e in m['pages']) and m.get('generated_at'), str(m['pages'][:1]), f'{icao}: every page has the hash of its PDF, its page count, and the set its date')
        if icao in ('LFBO', 'LFLL', 'LFPO', 'LFPG'):
            c.ok((d / f'FR-AD-2.{icao}.AD-2.12.html').is_file() and m.get('ad2_12', {}).get('file') == f'FR-AD-2.{icao}.AD-2.12.html', icao, f'{icao}: the AD 2.12 extract is in the set and in the manifest')
        sizes[icao] = sum(f.stat().st_size for f in d.iterdir())
    c.le(sum(sizes.values()), 1_500_000, 'the whole sets stay small (rows text, no PDF)', what=str(sizes))


@case('K34', 'eAIP page sets: regenerated from the cached PDF, the set is the same (tools/make_eaip_fixtures.py --check)', 'K', static=True,
      rule='V3 § 10.29 (e): a set can be rebuilt by the tool from the PDF of the cache; skipped, with the reason, where the cache is not on the workstation')
def k34(c):
    import importlib
    import json
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    M = importlib.import_module('make_eaip_fixtures')
    d = c.root / 'frame/aerodb/test/fixtures/eaip/LFBO'
    cycle = json.loads((d / 'manifest.json').read_text(encoding='utf-8'))['cycle']
    cache = _eaip_cache(cycle)
    if cache is None:
        c.skip(f'the cached PDF of LFBO ({cycle}) are not on this workstation (data/local/eaip/{cycle}, or EAIP_FIXTURE_CACHE): the set is not compared; the tool\'s --check does it where the cache is')
    c.eq(M.check('LFBO', cache, d), [], 'the LFBO set is exactly what the cached PDF give (same rows, same hash)', what='check')
    # the tool sees a difference: a changed row, a missing page
    import shutil
    import tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory() as td:
        copy = Path(td) / 'LFBO'
        shutil.copytree(d, copy)
        first = sorted(copy.glob('*.rows.txt'))[0]
        first.write_text(first.read_text(encoding='utf-8') + 'an extra row\n', encoding='utf-8')
        (sorted(copy.glob('*.rows.txt'))[-1]).unlink()
        diffs = M.check('LFBO', cache, copy)
        c.ok(len(diffs) == 2 and all('lignes du jeu' in x for x in diffs), str(diffs), 'a changed rows file and a missing one are both reported')


# ---------------------------------------------------------------------------------------------------------------------------------------------
# K42 à K51 — lot D5 : la base aéronautique construite sur le poste, un processus par zone (tools/regen/base.py, frame/aerodb/build/headless.html).
# Jamais de vrai navigateur sauf K49 (facultatif) ; K50 lance le vrai lanceur, K51 la vraie page : tests/v3/fixtures/d5_fake_browser.py joue le navigateur (chemin absolu donné par le crochet ctx['browser']).
class _D5Mod:
    """Le module tools/regen/base.py tel que le lanceur le charge (regen_jobs.load_verbs) : lecture ET écriture des noms du module (les essais remplacent
    une fonction, la mémoire libre ou la recherche du navigateur)."""

    def __init__(self, g):
        object.__setattr__(self, '_g', g)

    def __getattr__(self, k):
        try:
            return self._g[k]
        except KeyError:
            raise AttributeError(k)

    def __setattr__(self, k, v):
        self._g[k] = v


def _d5_modules():
    RJ = _regen()
    fn, check = RJ.REGISTRY[('base', 'build')]
    return RJ, _D5Mod(fn.__globals__), fn, check


def _d5_git(data, *a):
    import importlib
    import subprocess
    DS = importlib.import_module('data_sync')
    return subprocess.run(DS.git_cmd('-C', str(data), *a), capture_output=True, text=True, encoding='utf-8', errors='replace', env=DS.git_env()).stdout


def _d5_scene(td, with_git=True):
    """data/ d'essai : quelques entrées dans sia/ (le faux navigateur ne les lit pas), un dépôt git avec un fichier modifié et un fichier mis en
    attente par l'utilisateur (que les commits du travail ne touchent jamais). Rend (data, dossier du faux navigateur)."""
    from pathlib import Path
    _regen()
    data, fake = Path(td) / 'data', Path(td) / 'fake'
    (data / 'sia' / 'openaip').mkdir(parents=True)
    fake.mkdir()
    (data / 'sia' / 'XML_SIA_2026-10-01.xml').write_text('<x/>', encoding='utf-8')
    (data / 'sia' / 'mora.csv').write_text('a;b\n', encoding='utf-8')
    for z in ('ie', 'be', 'ch', 'gb', 'nl', 'de'):
        (data / 'sia' / 'openaip' / f'{z}_apt.geojson').write_text('{}', encoding='utf-8')
    (data / 'notes.txt').write_text('first\n', encoding='utf-8')
    if with_git:
        _d5_git(data, 'init', '-q')
        _d5_git(data, 'add', '-A')
        _d5_git(data, '-c', 'user.name=T', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'initial')
        (data / 'notes.txt').write_text('first\nedited by the user, not staged\n', encoding='utf-8')
        (data / 'staged.txt').write_text('staged by the user\n', encoding='utf-8')
        _d5_git(data, 'add', 'staged.txt')
    return data, fake


def _d5_ctx(data, fake, **extra):
    import importlib
    import os
    import sys
    DS = importlib.import_module('data_sync')
    os.environ['SOG_FAKE_DIR'] = str(fake)
    # the fake browser reads its folder from its environment: the jobs' reduced environment (regen_jobs.child_env) lets it through
    # in this test process only, never in the launcher's list
    _regen().CHILD_KEEP.add('SOG_FAKE_DIR')
    return {'data': str(data), 'secrets': str(data.parent / 'secrets'), 'git_cmd': DS.git_cmd, 'git_env': DS.git_env,
            'browser': [sys.executable, str(ROOT / 'tests' / 'v3' / 'fixtures' / 'd5_fake_browser.py')], **extra}


def _d5_modes(fake, modes):
    import json
    (fake / 'behaviour.json').write_text(json.dumps(modes), encoding='utf-8')


def _d5_alive(pid):
    import os
    import sys
    if sys.platform.startswith('win'):
        import ctypes
        k = ctypes.windll.kernel32
        k.OpenProcess.restype = ctypes.c_void_p
        h = k.OpenProcess(0x1000, False, pid)
        if not h:
            return False
        code = ctypes.c_ulong()
        k.GetExitCodeProcess(ctypes.c_void_p(h), ctypes.byref(code))
        k.CloseHandle(ctypes.c_void_p(h))
        return code.value == 259
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _d5_lines(fake, name):
    p = fake / name
    return p.read_text(encoding='utf-8').splitlines() if p.exists() else []


@case('K42', 'Build job: the browser is found by absolute path only, started with a closed list of options', 'K', static=True,
      rule="D5 security: no bare name through PATH or the current folder (NoDefaultCurrentDirectoryInExePath), temporary profile, headless, no network beyond the job's one address")
def k42(c):
    import os
    import re
    import tempfile
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    # candidate lists: absolute, in the known places, Edge before Chrome
    win = B.browser_candidates({'ProgramFiles': r'C:\Program Files', 'ProgramFiles(x86)': r'C:\Program Files (x86)', 'LOCALAPPDATA': r'C:\Users\u\AppData\Local'}, 'win32')
    c.ok(win and all(re.match(r'^[A-Za-z]:\\', p) for p in win), str(win), 'every Windows candidate is an absolute path')
    c.ok(win[0].endswith('msedge.exe') and any('Local' in p and p.endswith('chrome.exe') for p in win), str(win), 'Edge first, then Chrome, per-user Chrome included (%LOCALAPPDATA%)')
    c.eq(B.browser_candidates({'ProgramFiles': r'relative\dir', 'LOCALAPPDATA': ''}, 'win32'), [], 'a variable that is not an absolute path gives no candidate (never the current folder)', what='relative variable')
    for plat in ('linux', 'darwin'):
        lst = B.browser_candidates({}, plat)
        c.ok(lst and all(p.startswith('/') for p in lst), str(lst), f'{plat}: absolute paths only')
    # a fake PATH entry and a file in the current folder are never chosen
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        trap = Path(td) / 'trap'
        trap.mkdir()
        for n in ('msedge.exe', 'chrome.exe', 'msedge', 'chrome', 'google-chrome', 'chromium'):
            (trap / n).write_text('not a browser', encoding='utf-8')
        saved, cwd = os.environ.get('PATH', ''), os.getcwd()
        old_cands = B.browser_candidates
        try:
            os.environ['PATH'] = str(trap) + os.pathsep + saved
            os.chdir(trap)
            B.browser_candidates = lambda *a, **k: []              # no known install on this (pretend) machine
            c.eq(B.find_browser({}), None, 'with no known location, a browser named in PATH or sitting in the current folder is NOT found', what='trap')
            B.browser_candidates = old_cands
            got = B.find_browser({})
            c.ok(got is None or (len(got) == 1 and os.path.isabs(got[0]) and not got[0].startswith(str(trap))), str(got), 'whatever is found is an absolute path outside the trap folder')
        finally:
            os.chdir(cwd)
            os.environ['PATH'] = saved
            B.browser_candidates = old_cands
        # the test hook: absolute, existing, a file
        f = Path(td) / 'fake.exe'
        f.write_text('x', encoding='utf-8')
        c.eq(B.find_browser({'browser': str(f)}), [os.path.normpath(str(f))], 'the hook gives the path as asked', what='hook')
        c.eq([B.find_browser({'browser': p}) for p in (str(Path(td)), str(Path(td) / 'missing.exe'), 'fake.exe', 'msedge')], [None] * 4,
             'a folder, a missing file, a relative path and a bare name are all refused', what='hook refusals')
        c.eq(B.find_browser({'browser': [str(f), 'relative.py']}), None, 'every element of the hook must be absolute', what='hook list')
    src = (c.root / 'tools' / 'regen' / 'base.py').read_text(encoding='utf-8')
    c.ok(not re.search(r'shutil\.which|find_executable|shell\s*=\s*True|os\.system|os\.popen', src), 'a path search or a shell appears in base.py', 'no PATH search, no shell (kill by taskkill with an argument list)')
    # the command line
    args = B.browser_args(r'C:\tmp\prof', '127.0.0.1:5555', 'http://127.0.0.1:5555/p#x=1')
    for want in ('--headless=new', r'--user-data-dir=C:\tmp\prof', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
                 '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--metrics-recording-only', '--mute-audio',
                 '--proxy-server=127.0.0.1:9', '--proxy-bypass-list=<-loopback>;127.0.0.1:5555'):
        c.ok(want in args, str(args), f'the option {want} is given')
    c.ok(args[-1] == 'http://127.0.0.1:5555/p#x=1' and '--no-sandbox' not in args and not any('--remote-debugging' in a for a in args), str(args), 'the address is last; no --no-sandbox, no debugging port')


def _d5_offer_shim(RJ):
    """Cette base n'a peut-être pas encore le code du cadre pour le claim (Job.offer, POST regen/job/claim) : l'essai joue alors le contrat — offer(payload) refuse un
    objet qui porte ok, job, token ou status ; claim(job) rend { …payload, ok, job, token } UNE fois, 409 sinon (pas le travail en cours, rien d'offert, déjà
    réclamé). Avec le code du cadre (Job.offer), rien n'est remplacé et c'est le sien qui répond."""
    if not hasattr(RJ.Job, 'offer'):
        def offer(self, payload):
            if not isinstance(payload, dict) or {'ok', 'job', 'token', 'status'} & set(payload):
                raise ValueError('bad payload')
            self._offered, self._claimed = dict(payload), False
        RJ.Job.offer = offer
    if not hasattr(RJ.Jobs, 'claim'):
        def claim(self, id_):
            j = self.cur
            if not j or j.id != str(id_ or '') or j.data['state'] != 'running' or getattr(j, '_offered', None) is None or j._claimed:
                return {'ok': False, 'status': 409, 'message': 'refused'}
            j._claimed = True
            return {**j._offered, 'ok': True, 'job': j.id, 'token': j.token}
        RJ.Jobs.claim = claim


class _D5Launcher:
    """Le gestionnaire des routes du lanceur POST /__setup/regen/job/claim et /__setup/regen/job/put, tel que tools/launch.py les fait (en-tête X-SOG-Setup,
    JSON, puis regen_jobs.Jobs.claim / Jobs.put : le travail, le jeton, la zone, les noms), sur un port de 127.0.0.1 : le faux navigateur y réclame son
    offre et y remet ses zones. Rien d'autre n'est servi (le faux navigateur ne charge aucune page)."""

    def __init__(self, jobs):
        import http.server
        import json
        outer = self
        self.jobs, self.seen = jobs, []

        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                body = self.rfile.read(int(self.headers.get('Content-Length') or 0))
                if self.path not in ('/__setup/regen/job/put', '/__setup/regen/job/claim') or self.headers.get('X-SOG-Setup') != '1':
                    code, out = 403, {'ok': False}
                else:
                    try:
                        a = json.loads(body or b'{}')
                    except ValueError:
                        a = {}
                    a = a if isinstance(a, dict) else {}
                    out = jobs.claim(a.get('job')) if self.path.endswith('/claim') else jobs.put(a.get('job'), a.get('token'), a.get('zone'), a.get('files'))
                    code = out.get('status', 200) if out.get('ok') is False else 200
                outer.seen.append((self.path.rsplit('/', 1)[1], code))
                data = json.dumps(out).encode()
                self.send_response(code)
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
        self.server.daemon_threads = True
        self.server.handle_error = lambda *a: None
        self.origin = f'http://127.0.0.1:{self.server.server_address[1]}'
        import threading
        threading.Thread(target=self.server.serve_forever, kwargs={'poll_interval': 0.1}, daemon=True).start()

    def stop(self):
        self.server.shutdown()
        self.server.server_close()


class _D5Run:
    """Un travail base/build lancé par le VRAI regen_jobs.Jobs (job.token, job.offer, job.put, job.take) avec le faux navigateur et le gestionnaire de routes
    ci-dessus. view(): le travail tel que la page le lit."""

    def __init__(self, RJ, data, fake, args, author='TST', **ctx_extra):
        _d5_offer_shim(RJ)
        self.ctx = _d5_ctx(data, fake, **ctx_extra)
        self.jobs = RJ.Jobs(RJ.REGISTRY, self.ctx)
        self.launcher = _D5Launcher(self.jobs)
        self.ctx.setdefault('origin', self.launcher.origin)
        self.start = self.jobs.start('base', 'build', args, author)

    @property
    def job(self):
        return self.jobs.cur

    def wait(self, timeout=120):
        import time
        end = time.time() + timeout
        while self.job and self.job.data['state'] == 'running' and time.time() < end:
            time.sleep(0.05)
        self.launcher.stop()
        return self.job.view()

    def cancel(self):
        return self.jobs.cancel(self.job.id)


@case('K43', 'Build job: arguments checked against the zone list, the verb loaded by the launcher', 'K', static=True,
      rule='frame/INTEGRATION 15.1: nothing from the page is a path, an address or a command; unknown zone refused (400); the zones are where the route looks (args.zones); no mode of the API but the list of zones and the personal sources')
def k43(c):
    RJ, B, fn, check = _d5_modules()
    ids = B.zone_ids()
    c.ok({'fr', 'gb', 'nat', 'es', 'us'} <= set(ids) and len(ids) > 100, str(len(ids)), 'the zone list is read from shared/carto/aero_zones_geo.js (fr, gb, nat, es, us among them)')
    c.eq(check({'zones': ['fr', 'GB ']}), {'zones': ['fr', 'gb'], 'personal': []}, 'zones are trimmed and lower-cased, personal is a list of source ids (none by default)', what='normalised')
    c.eq(check({'zones': ['ie'], 'personal': ['xplane', 'enaire', 'xplane']}), {'zones': ['ie'], 'personal': ['enaire', 'xplane']}, 'personal-licence sources: sorted, no duplicate', what='personal')
    bad = [{'zones': ['zz']}, {'zones': []}, {'zones': ['fr', 'fr']}, {'zones': 'fr'}, {'zones': ['fr', 'gb'], 'x': 1}, {}, None, 'fr', {'zones': ['fr/../x']}, {'zones': ['fr,gb']},
           {'zones': [7]}, {'zones': ['fr'], 'personal': 'x'}, {'zones': ['fr'], 'personal': ['../x']}, {'zones': ['fr'], 'personal': ['ab'] * 11}, {'zones': ids[:61]}, {'zones': ['*']},
           {'zones': ['fr'], 'parallel': True}, {'zones': ['fr'], 'parallel': False}, {'zone': 'fr'}]
    c.eq([a for a in bad if check(a) is not None], [], 'an unknown zone, a list, a path, a duplicate, an extra key (parallel included: not a mode of the API) or too many are refused', what='refused')
    c.eq(RJ.Jobs(RJ.REGISTRY).start('base', 'build', {'zones': ['zz']}).get('status'), 400, 'the launcher answers 400 to an unknown zone', what='start')
    c.eq(RJ.Jobs(RJ.REGISTRY).start('base', 'build', {'zones': ['fr'], 'parallel': True}).get('status'), 400, 'and to a `parallel` key (any page script could send it)', what='start parallel')
    c.ok(('base', 'build') in RJ.REGISTRY and RJ.MIN_GAP.get(('base', 'build')) is None, str(list(RJ.REGISTRY)), 'the launcher registers base/build, with no minimal gap between two starts')
    src = (c.root / 'tools' / 'regen' / 'base.py').read_text(encoding='utf-8')
    import re
    c.ok(not re.search(r'http\.server|ThreadingHTTPServer|ZoneInbox|class Transport|socket\.|parallel|start\.html', src.split('"""', 2)[2]), 'a server, the shim, a parallel mode or the start file is still in base.py',
         "no second server, no shim, no per-zone mode, no bootstrap file: the frame's route (Job.offer / claim / put / take)")
    # aerodb's declaration: the reading job AND its cancel are routes aerodb may call (the frame's under() covers children only for a prefix ending with « / »)
    decl = (c.root / 'frame' / 'aerodb' / 'aerodb.js').read_text(encoding='utf-8')
    m = re.search(r"launcher:\s*\{\s*routes:\s*\[([^\]]*)\]", decl)
    c.ok(m and "'regen/job'" in m.group(1) and "'regen/job/cancel'" in m.group(1), m.group(1) if m else 'no declaration', "aerodb declares regen/job and regen/job/cancel: cancelling an EAD or eAIP reading reaches the route")


@case('K44', 'Build job: the frame\'s claim and put routes with the real Job, the page\'s address carries the job only', 'K', static=True,
      rule='frame/INTEGRATION 15.1: one claim per job (409 after), 409 / 403 / 400 / 413 for the put; the browser gets `#job=<id>` and nothing else; the verb receives the zone by job.take and writes it')
def k44(c):
    import http.client
    import json
    import tempfile
    import time
    RJ, B, fn, check = _d5_modules()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'be': 'hang'})                                                  # the job stays running while we knock at the routes
        run = _D5Run(RJ, data, fake, {'zones': ['be', 'ie'], 'personal': ['enaire']})
        end = time.time() + 20
        while time.time() < end and not _d5_lines(fake, 'claim.json'):
            time.sleep(0.05)
        job, put, claim = run.job, run.jobs.put, run.jobs.claim
        files = {'mora.json': '{}'}
        c.eq(run.start.get('ok'), True, 'the job starts through the launcher', what='start')
        offer = json.loads(_d5_lines(fake, 'claim.json')[0])
        c.eq((offer['ok'], offer['job'], offer['token'] == job.token, offer['zones'], offer['cycle'], offer['personal']), (True, job.id, True, ['be', 'ie'], '2026-10-01', ['enaire']),
             'the claim gives what the verb offered (job.offer) and the job\'s token', what='claim')
        c.eq(sorted(offer['inputs']), sorted(B.list_inputs(str(data))), 'and the inputs the page may read (the page decides which it wants)', what='inputs')
        c.eq(sorted(set(offer) - {'ok', 'job', 'token'}), ['cycle', 'cycles', 'inputs', 'personal', 'sources', 'zones'], 'nothing else is offered', what='keys')
        c.eq(offer['cycles'], {'be': B.airac_in_force(), 'ie': B.airac_in_force()}, 'the cycle of each zone: none of them has a dated source, so the cycle in force', what='zone cycles')
        c.eq(claim(job.id).get('status'), 409, 'a second claim: 409 (the page claimed once)', what='claim twice')
        c.eq(claim('other').get('status'), 409, 'a claim for another job: 409', what='claim other')
        c.eq(put('other', job.token, 'be', files).get('status'), 409, 'put, not the running job: 409', what='job')
        c.eq([put(job.id, t, 'be', files).get('status') for t in ('', 'x' * len(job.token), job.token[:-1], None)], [403] * 4, 'a missing, wrong or truncated token: 403', what='token')
        c.eq(put(job.id, job.token, 'fr', files).get('status'), 400, "a zone outside the job's args.zones: 400", what='zone')
        c.eq([put(job.id, job.token, 'be', f).get('status') for f in ({'../x.json': '{}'}, {'A.json': '{}'}, {'x.txt': '{}'}, {'x.json': 5}, {})], [400] * 5, 'a bad file name, a value that is not text, no file: 400', what='names')
        old, RJ.PUT_MAX = RJ.PUT_MAX, 100
        try:
            c.eq(put(job.id, job.token, 'be', {'big.json': 'x' * 300}).get('status'), 413, 'more than PUT_MAX: 413', what='size')
        finally:
            RJ.PUT_MAX = old
        c.ok(job.take('be', 0.05) is None, 'a refused put left something', 'a refused put hands nothing to the verb')
        c.eq(job.token in json.dumps(job.view()), False, 'the token is in the view', what='view')
        # through the HTTP routes as the browser calls them: the same answers
        h = http.client.HTTPConnection(run.launcher.origin.split('//')[1], timeout=10)
        h.request('POST', '/__setup/regen/job/put', json.dumps({'job': job.id, 'token': 'nope', 'zone': 'be', 'files': files}), {'X-SOG-Setup': '1'})
        c.eq(h.getresponse().status, 403, 'the put route answers the refusals of Jobs.put', what='route')
        argv = json.loads(_d5_lines(fake, 'argv.txt')[0])
        c.eq(argv[-1], f'{run.launcher.origin}/frame/aerodb/build/headless.html#job={job.id}', "the browser's last argument is the launcher's page with the job id and nothing else", what='address')
        c.ok(job.token not in ' '.join(argv) and 'cycle' not in argv[-1] and 'zones' not in argv[-1], ' '.join(argv)[:300], 'no token, zone, cycle or file in the command line')
        run.cancel()
        view = run.wait()
        c.eq(view['state'], 'cancelled', 'the job ends cancelled', what='state')


@case('K45', 'Build job: one instance; leftovers of an interrupted build purged at load; taskkill found in the system folder', 'K', static=True,
      rule='D5 security: only sog-base-* folders older than a build can last, never a link; the process tree is killed with the system folder\'s taskkill, not %SystemRoot%')
def k45(c):
    import os
    import tempfile
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        view = _D5Run(RJ, data, fake, {'zones': ['ie', 'be', 'ch']}).wait()
        c.eq((view['result']['ok'], view['result']['instances'], sorted(view['result']['built'])), (True, 1, ['be', 'ch', 'ie']), 'one instance builds the three zones', what='one instance')
        c.eq(len(_d5_lines(fake, 'pids.txt')), 2, 'one browser (and its child) was started', what='browsers')
    # leftovers
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        old, young, other, afile = root / 'sog-base-old', root / 'sog-base-young', root / 'keep-me', root / 'sog-base-afile'
        for d in (old, young, other):
            (d / 'sub').mkdir(parents=True)
            (d / 'sub' / 'x.txt').write_text('x', encoding='utf-8')
        afile.write_text('x', encoding='utf-8')
        long_ago = time.time() - 7200
        for d in (old, other, afile):
            os.utime(d, (long_ago, long_ago))
        target = root / 'target-of-the-link'
        target.mkdir()
        (target / 'precious.txt').write_text('x', encoding='utf-8')
        link = root / 'sog-base-link'
        linked = False
        try:
            os.symlink(target, link, target_is_directory=True)
            os.utime(link, (long_ago, long_ago), follow_symlinks=False)
            linked = True
        except (OSError, NotImplementedError):
            pass
        gone = B.purge_stale(str(root))
        c.eq(gone, ['sog-base-old'], 'only the old folder with the prefix is removed', what='purged')
        c.ok(not old.exists() and young.exists() and other.exists() and afile.exists(), str(sorted(p.name for p in root.iterdir())), 'a recent profile (a build may be running), another name and a file are left alone')
        if linked:
            c.ok(link.exists() and (target / 'precious.txt').exists(), str(sorted(p.name for p in root.iterdir())), 'a link is never followed nor removed: its target is intact')
    c.ok(B.STALE >= 2 * B.ZONE_TIMEOUT, f'{B.STALE} {B.ZONE_TIMEOUT}', 'a leftover is older than twice the time limit of a build: never the profile of a running job')
    # taskkill
    if os.name == 'nt':
        sysdir = B.system_directory()
        c.ok(os.path.isfile(os.path.join(sysdir, 'taskkill.exe')) and os.path.isabs(sysdir), sysdir, 'the system folder comes from GetSystemDirectoryW and holds taskkill.exe')
        saved = os.environ.get('SystemRoot')
        try:
            os.environ['SystemRoot'] = r'C:\evil'
            c.eq(B.system_directory(), sysdir, 'and does not follow %SystemRoot%', what='SystemRoot')
        finally:
            if saved is not None:
                os.environ['SystemRoot'] = saved
    src = (c.root / 'tools' / 'regen' / 'base.py').read_text(encoding='utf-8')
    c.ok('SystemRoot' not in src.split('"""', 2)[2], 'SystemRoot appears in base.py', 'base.py does not read %SystemRoot%')
    c.ok('purge_stale()' in src, 'no call at load', 'the purge is run when the launcher loads the verbs')


@case('K46', 'Build job: one commit per zone as it comes out, a failed zone publishes nothing and stops no other', 'K', static=True,
      rule='SPEC 5.4 / invariant 4: the page puts zone after zone, each is written and committed alone; a page error for a zone, an invalid output, the browser gone: the others go on')
def k46(c):
    import json
    import tempfile
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    zones = ['be', 'ch', 'gb', 'ie', 'nl']
    kinds12 = sorted(f'{k}.json' for k in ('airspaces', 'aerodromes', 'navaids', 'points', 'vrp', 'airways', 'obstacles', 'aeroindex', 'mora', 'obstaclemax', 'cities', 'meta'))
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'be': 'error', 'ch': 'invalid', 'gb': 'ok', 'ie': 'badshape', 'nl': 'ok'})
        run = _D5Run(RJ, data, fake, {'zones': zones})
        view = run.wait()
        res, zs = view['result'], view['zones']
        c.eq({z: zs[z]['state'] for z in zones}, {'be': 'failed', 'ch': 'failed', 'gb': 'built', 'ie': 'failed', 'nl': 'built'}, 'only the good zones are built; the others fail, each with its code', what='states')
        c.eq({z: zs[z].get('error') for z in ('be', 'ch', 'ie')}, {'be': 'page-error', 'ch': 'invalid-output', 'ie': 'invalid-output'},
             'codes: the page said an error for that zone, a file of another zone, a file missing', what='codes')
        c.eq(zs['be'].get('message'), 'boom', "the page's message is given", what='message')
        rec = json.loads((data / 'local' / 'build' / 'be.json').read_text(encoding='utf-8'))
        c.eq((rec['failed']['error'], rec['failed']['message']), ('page-error', 'boom'), 'SOG-0144: the text of the failure is kept with the zone (data/local/build/<zone>.json), where it was lost with the last job', what='message kept')
        c.eq((res['ok'], res['reason'], res['built'], res['failed']), (False, 'partial', ['gb', 'nl'], [{'zone': 'be', 'error': 'page-error'}, {'zone': 'ch', 'error': 'invalid-output'}, {'zone': 'ie', 'error': 'invalid-output'}]),
             'the end: not ok, partial, who is built, who failed with its code', what='result')
        c.eq([x['zone'] for x in res['commits']], ['gb', 'nl'], 'the commits, zone by zone', what='commits list')
        c.ok(all(len(x['commit'] or '') == 40 for x in res['commits']), str(res['commits']), 'each with its SHA')
        c.eq(res['instances'], 1, 'one instance built the five zones', what='instances')
        # le cycle des sources lues (XML_SIA_2026-10-01 de la scène), par zone construite, et le cycle en vigueur : construit quand même, dit
        # gb et nl n'ont pas de source datée dans la scène (openAIP seulement) : pas de cycle, écrites sous le cycle en vigueur, jamais « dépassées »
        cur = B.airac_in_force()
        c.eq((res['cycle'], res['cycles'], res['folders'], res['current'], res['stale'], res['blocking']), ('2026-10-01', {'gb': None, 'nl': None}, {'gb': cur, 'nl': cur}, cur,
                                                                                                          False, []),
             'zones without a dated source: no cycle, written under the cycle in force, never blocking; the SIA cycle is not theirs', what='cycles')
        c.eq(res['sources']['sia'], {'cycle': '2026-10-01', 'current': cur, 'stale': '2026-10-01' < cur}, 'the cycle the workstation holds for the SIA, said apart', what='sia source')
        import datetime as _dt
        c.eq((B.airac_in_force(_dt.date(2026, 10, 30)), B.airac_in_force(_dt.date(2026, 10, 28)), B.cycle_of(['openaip/gb_asp.geojson'], _dt.date(2026, 11, 1)),
              B.cycle_of(['XML_SIA_2026-10-01.xml', 'AIXM4.5_all_FR_OM_2026-10-29.xml'])), ('2026-10-29', '2026-10-01', '2026-10-29', '2026-10-29'),
             'the AIRAC calendar (2611 from 29 Oct), no dated file: the cycle in force, else the newest dated file', what='calendar')
        base = data / 'sia' / 'base'
        c.eq(sorted(p.name for p in base.iterdir()), ['cities_major.json', 'gb', 'index.json', 'nl'], 'only the built zones left files (a failed zone publishes nothing)', what='files')
        c.eq(sorted(p.name for p in (base / 'gb' / cur).iterdir()), kinds12, 'the 12 files of the split format, under sia/base/<zone>/<cycle>/', what='zone files')
        idx = json.loads((base / 'index.json').read_text(encoding='utf-8'))
        c.eq((list(idx['zones']), idx['kind'], idx['schema']), (['gb', 'nl'], 'index', 2), 'the manifest holds the built zones only', what='index')
        log = _d5_git(data, 'log', '--format=%an|%s', '-n', '5').strip().splitlines()
        c.eq(len(log), 3, 'one commit per built zone on top of the initial one', what='commit count')
        c.ok(log[0].startswith('TST|') and ' nl ' in log[0] and ' gb ' in log[1], str(log), "each commit is a zone's, authored by the page's trigram")
        c.eq(set(_d5_git(data, 'show', '--name-only', '--format=', 'HEAD~1').split()), {f'sia/base/gb/{cur}/{k}' for k in kinds12} | {'sia/base/index.json', 'sia/base/cities_major.json'},
             "the first zone's commit: its folder, the manifest and the world's large cities: nothing else", what='committed first')
        c.eq(set(_d5_git(data, 'show', '--name-only', '--format=', 'HEAD').split()), {f'sia/base/nl/{cur}/{k}' for k in kinds12} | {'sia/base/index.json'},
             "the next zone's: its folder and the manifest (the large cities did not change)", what='committed next')
        c.ok('staged.txt' in _d5_git(data, 'diff', '--cached', '--name-only') and 'notes.txt' in _d5_git(data, 'diff', '--name-only'),
             _d5_git(data, 'status', '--short'), 'what the user had staged or edited is still where it was, not in the commits')
        # the head of the job as the Données module reads it
        c.eq((view['unit'], view['done'], view['total']), ('zones', 5, 5), 'the head counts the zones done', what='head')
        c.ok(view['step'].startswith('5 zones sur 5'), view['step'], 'the step says « 5 zones sur 5 »')
        c.ok(all('state' in zs[z] and 'done' not in zs[z] and 'total' not in zs[z] for z in zones), str(zs['gb']), 'zones is a dict by zone: its state; no count without a count of its own')
        c.eq(view.get('inputs'), {'done': 1, 'total': 2}, "the build's count of sources, once, in the job's data (not copied on each zone)", what='inputs')
        # the token is in no view, journal, step or result
        tokens = _d5_lines(fake, 'token.txt')
        blob = json.dumps(view)
        c.ok(tokens and all(t and t not in blob for t in tokens), str(len(tokens)), 'the token is in no view, journal, step or result')
        c.ok(not any(_d5_alive(int(p.split()[1])) for p in _d5_lines(fake, 'pids.txt')), 'a browser or its child is alive', 'every browser process and child is gone after the job')
        c.ok(not any(Path(p.split(' ', 1)[1]).exists() for p in _d5_lines(fake, 'profiles.txt')), 'a temporary profile is left', 'every temporary profile is deleted')
        # the same job again, everything good: nothing changed for the two built zones, the three others are built
        _d5_modes(fake, {})
        view2 = _D5Run(RJ, data, fake, {'zones': zones}).wait()
        z2 = view2['zones']
        c.ok(view2['result']['ok'] and z2['gb']['files'] == 0 and z2['gb']['commit'] is None and 'nothing changed' in (z2['gb']['warning'] or ''), str(z2['gb']),
             'a zone rebuilt unchanged writes nothing and commits nothing (updated_at aside)')
        c.eq(len(_d5_git(data, 'log', '--format=%h').split()), 1 + 2 + 3, 'one commit per newly built zone, none for the unchanged ones', what='commits after')
    # the browser leaves in the middle: the zones already put are built, the others say so
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'gb': 'exit'})
        view = _D5Run(RJ, data, fake, {'zones': zones}).wait()
        c.eq({z: (v['state'], v.get('error')) for z, v in view['zones'].items()},
             {'be': ('built', None), 'ch': ('built', None), 'gb': ('failed', 'browser-exited'), 'ie': ('failed', 'browser-exited'), 'nl': ('failed', 'browser-exited')},
             'the browser leaves after two zones: they are built, the three others fail (browser-exited)', what='exit')
    # an error of the whole page: every zone fails with its message
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'be': 'fatal'})
        view = _D5Run(RJ, data, fake, {'zones': zones}).wait()
        c.eq((view['result']['reason'], sorted({v.get('error') for v in view['zones'].values()}), view['zones']['ie'].get('message')), ('failed', ['page-error'], 'boom everywhere'),
             'an error of the whole page: all zones fail (page-error), reason « failed »', what='fatal')
        c.ok(not (data / 'sia' / 'base').exists(), 'sia/base exists', 'nothing was written')
    # no trigram: the files are written, nothing is committed, the reason is said
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        view = _D5Run(RJ, data, fake, {'zones': ['ie']}, author='').wait()
        z = view['zones']['ie']
        c.ok(z['state'] == 'built' and z['commit'] is None and 'no trigram' in (z['warning'] or ''), str(z), "without the page's trigram: written, not committed, the reason said")


@case('K47', 'Build job: cancel, time limit and a page that does not start kill the browser tree and delete the temporary profile', 'K', static=True,
      rule='D5 security: a time limit, the process tree killed (taskkill /T /F by PID, no shell), the cancel kills every instance, the profile deleted even on failure or cancel')
def k47(c):
    import tempfile
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()

    def gone(fake):
        return [int(p.split()[1]) for p in _d5_lines(fake, 'pids.txt')], [p.split(' ', 1)[1] for p in _d5_lines(fake, 'profiles.txt')]
    # cancel while the instance hangs
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        before = _d5_git(data, 'rev-list', '--count', 'HEAD').strip()
        _d5_modes(fake, {'de': 'hang', 'gb': 'hang', 'ie': 'hang', 'nl': 'hang'})
        run = _D5Run(RJ, data, fake, {'zones': ['de', 'gb', 'ie', 'nl']})
        end = time.time() + 30
        while time.time() < end and not (_d5_lines(fake, 'pids.txt') and len(_d5_lines(fake, 'pids.txt')) >= 2):
            time.sleep(0.05)
        time.sleep(0.5)                                                       # the browser has started, its child beats
        pids, profiles = gone(fake)
        c.ok(len(pids) >= 2 and all(Path(p).exists() for p in profiles) and all(_d5_alive(p) for p in pids), f'{pids} {profiles}', 'before the cancel: the browser and its child run, the profile exists')
        run.cancel()
        view = run.wait(60)
        pids, profiles = gone(fake)
        c.eq((view['state'], view['result'].get('reason'), sorted({z['state'] for z in view['zones'].values()})), ('cancelled', 'cancelled', ['cancelled']), 'the job and all its zones are said cancelled', what='states')
        c.ok(not any(_d5_alive(p) for p in pids), f'alive: {[p for p in pids if _d5_alive(p)]}', 'the browser process and its child are killed')
        beat = {p.name: p.read_text() for p in fake.glob('heartbeat_*.txt')}
        time.sleep(0.5)
        c.eq({p.name: p.read_text() for p in fake.glob('heartbeat_*.txt')}, beat, 'the child no longer beats', what='heartbeats')
        c.ok(not any(Path(p).exists() for p in profiles), str([p for p in profiles if Path(p).exists()]), 'the temporary profile is deleted on cancel')
        c.eq(_d5_git(data, 'rev-list', '--count', 'HEAD').strip(), before, 'nothing was committed', what='commits')
        c.ok(not (data / 'sia' / 'base').exists(), 'sia/base exists', 'nothing was written')
    # time limit (one instance for every zone)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'de': 'hang'})
        t0 = time.time()
        view = _D5Run(RJ, data, fake, {'zones': ['de', 'ie']}, zone_timeout=2).wait()
        c.eq({z: v.get('error') for z, v in view['zones'].items()}, {'de': 'timeout', 'ie': 'timeout'}, 'an instance over its time limit: its zones fail (timeout)', what='timeout')
        c.le(time.time() - t0, 30, 'the time limit is kept', what='seconds')
        pids, profiles = gone(fake)
        c.ok(not any(_d5_alive(p) for p in pids) and not any(Path(p).exists() for p in profiles), str(pids), 'after a time limit: processes killed, profiles deleted')
    # a page that never says it started (the launcher refused it, the address is wrong)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'de': 'silent'})
        t0 = time.time()
        view = _D5Run(RJ, data, fake, {'zones': ['de']}, start_timeout=2).wait()
        z = view['zones']['de']
        c.ok(z['state'] == 'failed' and z['error'] == 'browser-failed' and 'did not start' in z['message'], str(z), 'a page that does not start fails the zones at once (browser-failed), not after a quarter of an hour')
        c.le(time.time() - t0, 30, 'the start time limit is kept', what='seconds')
        pids, profiles = gone(fake)
        c.ok(not any(_d5_alive(p) for p in pids) and not any(Path(p).exists() for p in profiles), str(pids), 'processes killed, profile deleted')
    # a browser that cannot start
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        bad = Path(td) / 'not_a_program.exe'
        bad.write_text('this is not an executable', encoding='utf-8')
        view = _D5Run(RJ, data, fake, {'zones': ['ie']}, browser=str(bad)).wait()
        c.eq((view['zones']['ie']['state'], view['zones']['ie'].get('error')), ('failed', 'browser-failed'), 'a file that cannot be started fails the zone with its code', what='cannot start')


@case('K48', 'Build job: refusals, and the token and the parameters nowhere but in the claim answer', 'K', static=True,
      rule="D5 security (route B): the browser gets the launcher's page with `#job=<id>` only; one claim returns the offer and the token; every write goes through the launcher's path rule")
def k48(c):
    import json
    import os
    import sys
    import tempfile
    import threading
    import types
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    a = check({'zones': ['ie']})
    _d5_offer_shim(RJ)
    # refusals: nothing started, nothing written
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        old, threads = B.browser_candidates, threading.active_count()
        try:
            B.browser_candidates = lambda *x, **k: []
            res = fn(RJ.Job('base', 'build', a, author='TST'), a, {'data': str(data), 'secrets': str(Path(td) / 's')})
        finally:
            B.browser_candidates = old
        c.eq((res['ok'], res['reason']), (False, 'no-browser'), "no Edge or Chrome: the reason is 'no-browser' (the page says it)", what='no browser')
        c.eq(threading.active_count(), threads, 'nothing was started', what='threads')
        res = fn(RJ.Job('base', 'build', a, author='TST'), {**a, 'personal': ['xplane']}, _d5_ctx(data, fake, origin='http://127.0.0.1:1'))
        c.eq((res['ok'], res['reason']), (False, 'xplane-in-page'), "'xplane' in personal: the X-Plane folder is a handle held by the page, the build stays in the page", what='xplane')
        empty = Path(td) / 'empty'
        (empty / 'sia').mkdir(parents=True)
        res = fn(RJ.Job('base', 'build', a, author='TST'), a, _d5_ctx(empty, fake, origin='http://127.0.0.1:1'))
        c.eq((res['ok'], res['reason']), (False, 'no-input'), "nothing in data/sia/: the reason is 'no-input'", what='no input')
        res = fn(RJ.Job('base', 'build', a, author='TST'), a, _d5_ctx(data, fake))
        c.eq((res['ok'], res['reason']), (False, 'failed'), "no launcher address: refused, not guessed", what='no origin')
        c.ok(not (data / 'sia' / 'base').exists(), 'sia/base exists', 'nothing was written')
        # the launcher's address: given, or the running launcher's port (tools/launch.py Setup.port), 127.0.0.1 only
        main = sys.modules['__main__']
        had = getattr(main, 'Setup', None)
        try:
            main.Setup = types.SimpleNamespace(port=8123)
            c.eq((B.launcher_origin({}), B.launcher_origin({'origin': 'http://127.0.0.1:9000/'})), ('http://127.0.0.1:8123', 'http://127.0.0.1:9000'), "the running launcher's port, or the given address", what='origin')
            c.eq([B.launcher_origin({'origin': o}) for o in ('http://evil.example:80', 'http://127.0.0.1', 'https://127.0.0.1:8000', 'http://127.0.0.1:8000@evil.example')], [''] * 4,
                 'an address that is not http://127.0.0.1:<port> gives nothing (refused, never guessed)', what='bad origin')
        finally:
            if had is None:
                del main.Setup
            else:
                main.Setup = had
        # a launcher without job.offer (older than the frame's claim): refused, said
        class NoOffer:
            id, author, token = 'x', 'TST', 't'
            data = {}
        res = fn(NoOffer(), a, _d5_ctx(data, fake, origin='http://127.0.0.1:1'))
        c.eq((res['ok'], res['reason'], 'job.offer' in res['message']), (False, 'failed', True), 'a launcher without job.offer is refused, the reason said', what='no offer')
    # the offer: refused keys (the frame's job.offer), the claim, the address
    bad = RJ.Job('base', 'build', a, author='TST')
    refused = 0
    for key in ('ok', 'job', 'token', 'status'):
        try:
            bad.offer({'zones': ['ie'], key: 1})
        except ValueError:
            refused += 1
    c.eq(refused, 4, 'an offer that carries ok, job, token or status is refused (it would overwrite the claim answer)', what='offer keys')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'be': 'twice'})
        run = _D5Run(RJ, data, fake, {'zones': ['ie', 'be'], 'personal': ['enaire']})
        view = run.wait()
        token = _d5_lines(fake, 'token.txt')[0]
        argv = json.loads(_d5_lines(fake, 'argv.txt')[0])
        c.ok(token not in ' '.join(argv) and argv[-1].endswith('/frame/aerodb/build/headless.html#job=' + run.job.id) and '?' not in argv[-1], ' '.join(argv)[:300],
             "the browser command line: the launcher's page and the job id, no token, no zone, no query")
        c.ok(not any(f.name == 'start.html' for f in Path(td).rglob('*')) and 'start.html' not in ' '.join(argv), 'a start file exists', 'no start.html, no bootstrap file')
        c.eq([x for x in run.launcher.seen if x[0] == 'claim'], [('claim', 200), ('claim', 409)], 'the page claimed; a second claim was refused (409)', what='claims')
        c.ok(any('second claim 409' in l for l in _d5_lines(fake, 'events.log')), str(_d5_lines(fake, 'events.log')), 'the browser saw the 409')
        c.eq(sorted(json.loads(_d5_lines(fake, 'claim.json')[0])['zones']), ['be', 'ie'], 'the claim answer holds the offer', what='offer')
        c.ok(token not in json.dumps(view), 'the token is in the view', 'no log line, step, zone entry or result holds the token')
        c.ok(not Path(_d5_lines(fake, 'profiles.txt')[0].split(' ', 1)[1]).exists(), 'the profile exists', 'the profile is deleted at the end')
        args = B.browser_args('C:/p', '127.0.0.1:8000', argv[-1])
        c.ok('--proxy-bypass-list=<-loopback>;127.0.0.1:8000' in args and '--proxy-server=127.0.0.1:9' in args and '--force-webrtc-ip-handling-policy=disable_non_proxied_udp' in args, str(args),
             'proxy flags: dead proxy, only the launcher address bypassed; WebRTC limited to the proxy')
    # every write goes through the launcher's path rule and stays under sia/base/<zone>/
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        refused = []
        for rel, zone in (('sia/base/../x.json', 'ie'), ('sia/base/ie/../../notes.txt', 'ie'), ('sia/base/gb/2026-10-01/mora.json', 'ie'), ('sia/base/ie/2026-10-01/C:/x.json', 'ie'),
                          ('sia/base/ie/2026-10-01/nul.json', 'ie'), ('/etc/x.json', 'ie'), ('sia/base/ie\\x.json', 'ie'), ('notes.txt', 'ie')):
            try:
                B.target_of(str(data), rel, zone)
            except ValueError:
                refused.append(rel)
        c.eq(len(refused), 8, 'a traversal, another zone, a drive, a device name, an absolute or a Windows path, a file outside sia/base: all refused', what='target_of')
        c.ok(B.target_of(str(data), 'sia/base/ie/2026-10-01/mora.json', 'ie').replace('\\', '/').endswith('/sia/base/ie/2026-10-01/mora.json'), '', 'and the normal path is accepted')


def _d5_site(RJ, data, jobs_holder, root, claim_override=None, log=None):
    """Le lanceur, pour les essais avec un vrai navigateur : le code de la page (le dépôt), les entrées de l'essai, et les routes claim / put (le VRAI Jobs si
    jobs_holder en a un). Rend (serveur, origine). claim_override : une fonction qui répond au claim à la place du travail (un claim hostile)."""
    import http.server
    import json
    import threading
    import urllib.parse

    class Site(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, code, body=b'', ctype='application/octet-stream'):
            self.send_response(code)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            rel = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path).lstrip('/')
            if log is not None:
                log.append(rel)
            if rel.startswith('data/sia/'):
                full = data / 'sia' / rel[len('data/sia/'):]
            elif rel.startswith(('frame/aerodb/build/', 'shared/')):
                full = root / rel
            else:
                return self._send(404)
            full = full.resolve()
            if not full.is_file() or not (str(full).startswith(str(data.resolve())) or str(full).startswith(str(root.resolve()))):
                return self._send(404)
            self._send(200, full.read_bytes(), 'text/html; charset=utf-8' if rel.endswith('.html') else 'text/javascript; charset=utf-8' if rel.endswith('.js') else 'application/octet-stream')

        def do_POST(self):
            a = json.loads(self.rfile.read(int(self.headers['Content-Length'])) or b'{}')
            jobs = jobs_holder.get('jobs')
            if self.path.endswith('/claim'):
                out = claim_override(a) if claim_override else jobs.claim(a.get('job'))
            else:
                out = jobs.put(a.get('job'), a.get('token'), a.get('zone'), a.get('files')) if jobs else {'ok': True}
            self._send(out.get('status', 200) if out.get('ok') is False else 200, json.dumps(out).encode(), 'application/json')
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Site)
    srv.daemon_threads = True
    srv.handle_error = lambda *x: None
    threading.Thread(target=srv.serve_forever, kwargs={'poll_interval': 0.1}, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


@case('K49', 'Build job on a real headless browser: one instance, a tiny invented zone, served like the launcher serves it', 'K', static=True,
      rule='D5: the same builders as the page (SiaBase.buildZones = build + splitZones + zoneBodies), run without a window in Edge or Chrome; skipped where no browser is installed')
def k49(c):
    import json
    import os
    import tempfile
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    if not B.find_browser({}):
        c.skip('no Edge or Chrome at a known location on this workstation: the real-browser run is not made (the job answers no-browser there)')
    _d5_offer_shim(RJ)
    apt = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [-8.0, 53.0]},
                                                       'properties': {'_id': 'k49a', 'name': 'TESTFIELD', 'icaoCode': 'EITS', 'type': 2, 'trafficType': [0], 'country': 'IE',
                                                                      'elevation': {'value': 55, 'unit': 0}}}]}
    asp = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Polygon', 'coordinates': [[[-9, 52], [-7, 52], [-7, 54], [-9, 54], [-9, 52]]]},
                                                       'properties': {'_id': 'k49b', 'name': 'TEST CTR', 'type': 4, 'icaoClass': 8, 'upperLimit': {'value': 245, 'unit': 6, 'referenceDatum': 2},
                                                                      'lowerLimit': {'value': 0, 'unit': 1, 'referenceDatum': 0}}}]}
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'sia' / 'openaip').mkdir(parents=True)
        (data / 'sia' / 'openaip' / 'ie_apt.geojson').write_text(json.dumps(apt), encoding='utf-8')
        (data / 'sia' / 'openaip' / 'ie_asp.geojson').write_text(json.dumps(asp), encoding='utf-8')
        ctx = {'data': str(data), 'secrets': str(Path(td) / 's'), 'git_cmd': None, 'git_env': dict, 'zone_timeout': 120}
        jobs = RJ.Jobs(RJ.REGISTRY, ctx)
        srv, ctx['origin'] = _d5_site(RJ, data, {'jobs': jobs}, c.root)
        # the job's own profile, seen when it is made: the temp folder is shared (another pass, a real build, the purge of
        # old leftovers by the job itself), a before / after listing of every sog-base-* raced with them (30 Oct 2026)
        made, mkdtemp = [], tempfile.mkdtemp

        def spy(*a, **k):
            p = mkdtemp(*a, **k)
            if str(k.get('prefix') or (a[1] if len(a) > 1 else '')).startswith('sog-base-'):
                made.append(p)
            return p
        t0 = time.time()
        tempfile.mkdtemp = spy
        try:
            jobs.start('base', 'build', {'zones': ['ie']}, 'TST')
            while jobs.cur.data['state'] == 'running' and time.time() < t0 + 150:
                time.sleep(0.1)
        finally:
            tempfile.mkdtemp = mkdtemp
            srv.shutdown()
            srv.server_close()
        view = jobs.cur.view()
        res, z = view['result'], view['zones']['ie']
        c.ok(res.get('ok') and z['state'] == 'built', json.dumps(view)[:700], 'the invented zone is built by the real browser, with the page of the job')
        folder = data / 'sia' / 'base' / 'ie' / res['folders']['ie']
        read = lambda k: json.loads((folder / f'{k}.json').read_text(encoding='utf-8'))
        aero, asps = read('aerodromes'), read('airspaces')
        c.eq([(x['icao'], x['name']) for x in aero['data']], [('EITS', 'TESTFIELD')], 'the aerodrome of the invented file is in aerodromes.json', what='aerodromes')
        c.eq([(x['type'], x['name'], x['src']) for x in asps['data']], [('CTR', 'TEST CTR', 'openaip')], 'and its airspace in airspaces.json', what='airspaces')
        c.eq((aero['schema'], aero['zone'], aero['cycle'], aero['kind'], aero['parserVersion']), (2, 'ie', res['folders']['ie'], 'aerodromes', read('meta')['parserVersion']), 'the header of the split format', what='header')
        idx = json.loads((data / 'sia' / 'base' / 'index.json').read_text(encoding='utf-8'))
        c.eq((idx['zones']['ie']['prefixes'], idx['zones']['ie']['cycle']), (['EI'], res['folders']['ie']), "the zone's entry of the manifest", what='manifest')
        c.ok(z['commit'] is None and 'not a git repository' in (z['warning'] or ''), str(z), 'without a repository the files are written and the reason is said (no commit)')
        c.ok(len(made) == 1 and not any(os.path.exists(p) for p in made), str(made), 'the temporary profile of the job (one) is deleted')


def _sog_browsers(root):
    """Process ids of the browsers whose command line names a profile folder under `root` (a private temporary folder of the case): the case's own, never another session's.
    Written here on its own (PowerShell / ps), not with the launcher's helper, so that the check does not rest on the code it checks."""
    import subprocess
    import sys
    root = str(root).replace('/', '\\').lower()
    if sys.platform.startswith('win'):
        out = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*sog-base-*' } | ForEach-Object { '{0} {1}' -f $_.ProcessId, $_.CommandLine }"],
                             capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60, stdin=subprocess.DEVNULL).stdout
    else:
        out = subprocess.run(['ps', '-eo', 'pid=,args='], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=30, stdin=subprocess.DEVNULL).stdout
    return [int(l.split(None, 1)[0]) for l in out.splitlines() if l.strip() and l.split(None, 1)[0].isdigit() and root in l.replace('/', '\\').lower() and 'sog-base-' in l]


def _wait_none(fn, secs=20):
    """The list `fn()` gives, once it is empty or after `secs` seconds."""
    import time
    end, got = time.time() + secs, fn()
    while got and time.time() < end:
        time.sleep(0.5)
        got = fn()
    return got


@case('K50', 'The real launcher serves the build page to the browser the job starts, and the claim works', 'K', static=True,
      rule="D5 route B: the browser navigates to the launcher's page itself (Sec-Fetch-Site: none, already accepted); a navigation from another site stays refused; the page claims its offer once")
def k50(c):
    import http.client
    import json
    import socket
    import subprocess
    import sys
    import tempfile
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'sia' / 'openaip').mkdir(parents=True)
        (data / 'data_tree.js').write_text('window.DATA_TREE = {};\n', encoding='utf-8')
        (data / 'sia' / 'openaip' / 'ie_apt.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [-8.0, 53.0]},
                                                                  'properties': {'_id': 'k50a', 'name': 'TESTFIELD', 'icaoCode': 'EITS', 'type': 2, 'trafficType': [0], 'country': 'IE'}}]}), encoding='utf-8')
        s = socket.socket()
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
        s.close()
        log = open(Path(td) / 'launcher.log', 'w')
        import os
        tmp = Path(td) / 'tmp'                     # the temporary folder of THIS launcher: the profile of its browser lands here (SOG-0038: nothing may stay after the case)
        tmp.mkdir()
        p = subprocess.Popen([sys.executable, str(c.root / 'tools' / 'launch.py'), '--port', str(port), '--no-browser', '--data', str(data)], stdout=log, stderr=subprocess.STDOUT,
                             stdin=subprocess.DEVNULL, cwd=td, env={**os.environ, 'TEMP': str(tmp), 'TMP': str(tmp), 'TMPDIR': str(tmp)})
        try:
            def call(method, path, body=None, **headers):
                h = http.client.HTTPConnection('127.0.0.1', port, timeout=30)
                h.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
                r = h.getresponse()
                raw = r.read()
                return r.status, raw
            for _ in range(60):
                try:
                    if call('GET', '/', **{'Sec-Fetch-Site': 'same-origin'})[0] in (200, 302, 404):
                        break
                except OSError:
                    time.sleep(0.5)
            page = '/frame/aerodb/build/headless.html'
            c.eq(call('GET', page, **{'Sec-Fetch-Site': 'none', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document'})[0], 200, 'the build page opened by the browser itself (Sec-Fetch-Site: none): served', what='build page')
            c.eq(call('GET', page, **{'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document'})[0], 403, 'the same navigation from another site: refused (no exception in the launcher)', what='cross-site')
            c.eq(call('GET', '/shared/sia_base.js', **{'Sec-Fetch-Site': 'same-origin'})[0], 200, 'a script of the page, same origin: served', what='script')
            # the job end to end, with the real browser and the real claim, when this launcher has the frame's route
            has_claim = (c.root / 'tools' / 'regen_jobs.py').read_text(encoding='utf-8').find('def offer') >= 0
            if not has_claim:
                print('NOTE K50: this base has no Job.offer / POST regen/job/claim (the frame\'s route): the end-to-end run with the real browser is made once the work is rebased on it')
                return
            if not B.find_browser({}):
                print('NOTE K50: no Edge or Chrome on this workstation: the end-to-end run is not made')
                return
            hdr = {'X-SOG-Setup': '1', 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin'}
            st, raw = call('POST', '/__setup/regen/job', {'set': 'base', 'verb': 'build', 'args': {'zones': ['ie']}, 'author': 'TST'}, **hdr)
            job = json.loads(raw)['job']
            end = time.time() + 150
            while time.time() < end:
                v = json.loads(call('GET', f'/__setup/regen/job?id={job}', **hdr)[1])
                if v.get('state') != 'running':
                    break
                time.sleep(0.5)
            c.eq((v.get('state'), (v.get('result') or {}).get('built')), ('done', ['ie']), 'the real launcher, the real browser and the real claim build the invented zone', what='end to end')
            c.ok((data / 'sia' / 'base' / 'ie').is_dir(), 'no output', 'the zone was written under data/sia/base/ie/')
            c.ok(json.loads(call('POST', '/__setup/regen/job/claim', {'job': job}, **hdr)[1]).get('ok') is not True, 'a claim after the end succeeded', 'a claim after the job is refused')
            # SOG-0038: the job is over, the launcher still runs: its browser is gone and so is its profile
            c.eq(([x.name for x in tmp.glob('sog-base-*')], _wait_none(lambda: _sog_browsers(tmp))), ([], []), 'after the job: no profile folder and no headless browser left', what='nothing left')
        finally:
            p.terminate()
            try:
                p.wait(10)
            except subprocess.TimeoutExpired:
                p.kill()
            log.close()
        c.eq(_wait_none(lambda: _sog_browsers(tmp)), [], 'and none after the launcher is stopped', what='after stop')


@case('K51', 'The build page checks the claim answer before it reads anything', 'K', static=True,
      rule='D5 route B: the job equals the address\'s, the cycle is a date, the zones known, the sources identifiers, the file names relative without .. : else page-error and no read')
def k51(c):
    import json
    import subprocess
    import tempfile
    import threading
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    cmd = B.find_browser({})
    if not cmd:
        c.skip('no Edge or Chrome at a known location on this workstation: the page is not run')
    good = {'ok': True, 'job': 'job123', 'token': 'T' * 43, 'zones': ['ie'], 'cycle': '2026-10-01', 'personal': [], 'inputs': ['openaip/ie_apt.geojson']}
    hostile = {'other job': {**good, 'job': 'other'}, 'cycle': {**good, 'cycle': '2026-10-01/../x'}, 'unknown zone': {**good, 'zones': ['zz']}, 'zone as a path': {**good, 'zones': ['../ie']},
               'source': {**good, 'personal': ['../x']}, 'dotdot': {**good, 'inputs': ['openaip/../../notes.txt']}, 'absolute': {**good, 'inputs': ['/etc/passwd']},
               'backslash': {**good, 'inputs': ['openaip\\ie_apt.geojson']}, 'drive': {**good, 'inputs': ['C:/x.xml']}, 'empty component': {**good, 'inputs': ['openaip//x.json']},
               'token': {**good, 'token': 'short'}, 'no zone': {**good, 'zones': []},
               # the raw SIA files of the new place (lot C2): { source: 'sia', cycle, name } and nothing else, a name of the SIA's rule
               'raw name': {**good, 'sources': [{'source': 'sia', 'cycle': '2026-10-01', 'name': '../x.xml'}]}, 'raw source': {**good, 'sources': [{'source': '../x', 'cycle': '2026-10-01', 'name': 'XML_SIA_2026-10-01.xml'}]},
               'raw cycle': {**good, 'sources': [{'source': 'sia', 'cycle': '2026-10-01/..', 'name': 'XML_SIA_2026-10-01.xml'}]}, 'raw key': {**good, 'sources': [{'source': 'sia', 'cycle': '2026-10-01', 'name': 'XML_SIA_2026-10-01.xml', 'path': 'x'}]},
               'raw type': {**good, 'sources': 'XML_SIA_2026-10-01.xml'}}
    import os
    if os.environ.get('K51_ONLY'):                      # a debugging knob: only these hostile claims (comma-separated names)
        hostile = {k: v for k, v in hostile.items() if k in os.environ['K51_ONLY'].split(',')}
    out, race = {}, {}
    for name, answer in hostile.items():
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            data = Path(td) / 'data'
            (data / 'sia' / 'openaip').mkdir(parents=True)
            (data / 'sia' / 'openaip' / 'ie_apt.geojson').write_text('{}', encoding='utf-8')
            seen = []
            srv, origin = _d5_site(RJ, data, {}, c.root, claim_override=lambda a, ans=answer: ans, log=seen)
            prof = tempfile.mkdtemp(prefix='sog-base-')
            # started like the job starts it (base.build): the reduced environment (regen_jobs.child_env) and no console window: with the whole environment of the test process the browser can hand over and
            # end at once (5 Nov 2026, in a Claude Code session: exit 0 and no line for every hostile claim, the first one included)
            # (B.launch_browser: also bound to this process, so that a runner stopped by force leaves no browser behind: SOG-0038)
            p = B.launch_browser(cmd + B.browser_args(prof, origin.split('//')[1], f'{origin}/frame/aerodb/build/headless.html#job=job123'), stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                                 text=True, encoding='utf-8', errors='replace')
            lines = []
            reader = threading.Thread(target=lambda: [lines.append(B._sogb(l)) for l in p.stderr], daemon=True)
            reader.start()
            # waits for a state, never a delay: the page's first answer (an error or « started »); the ceiling is only for a
            # browser that never starts (its exit is not a state: a launcher may hand over to another process and end at
            # once); under a full pass the last answer (« no zone ») once did not come within the 40 s of the first version
            t0, end = time.time(), time.time() + 120
            while time.time() < end and not any(o and ('error' in o or o.get('started')) for o in lines):
                time.sleep(0.1)
            race[name] = {'secs': round(time.time() - t0, 1), 'exit': p.poll(), 'lines': [o for o in lines if o][:3]}
            B.kill_tree(p)
            B.remove_tree(prof)
            c.ok(not os.path.exists(prof) and not _sog_browsers(prof), prof, f'{name}: the profile folder is removed and its browser is gone')
            srv.shutdown()
            srv.server_close()
            out[name] = ([o['error'] for o in lines if o and 'error' in o][:1], [x for x in seen if x.startswith('data/')], any(o and o.get('started') for o in lines))
    got = {k: (bool(v[0]), v[1], v[2]) for k, v in out.items()}
    # an answer without its error: the race named (seconds waited, the browser's exit code, the lines it wrote)
    c.eq(got, {k: (True, [], False) for k in hostile}, 'every hostile claim answer: an error said, no data file read, never « started »',
         what='hostile' + ''.join(f' — {k}: {race.get(k)}' for k, v in got.items() if not v[0]))


@case('K77', 'A build browser never outlives its launcher: stopped by force in the middle of a build, the launcher leaves no headless browser (SOG-0038)', 'K', static=True,
      rule='SOG-0038 (6 Nov 2026: 108 headless browsers and 54 profile folders left by the builds of a noreg pass): the browser of a job is bound to the launcher (a job object on Windows), '
           'so a launcher stopped by force (no `finally` runs) takes it with it')
def k77(c):
    import http.client
    import json
    import os
    import socket
    import subprocess
    import sys
    import tempfile
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    cmd = B.find_browser({})
    if not cmd:
        c.skip('no Edge or Chrome at a known location on this workstation')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        tmp = Path(td) / 'tmp'
        tmp.mkdir()
        # the real launcher stopped by force in the middle of a build: its browser goes with it
        data = Path(td) / 'data'
        (data / 'sia' / 'openaip').mkdir(parents=True)
        (data / 'data_tree.js').write_text('window.DATA_TREE = {};\n', encoding='utf-8')
        (data / 'sia' / 'openaip' / 'ie_apt.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [-8.0, 53.0]},
                                                                  'properties': {'_id': 'k77a', 'name': 'TESTFIELD', 'icaoCode': 'EITS', 'type': 2, 'trafficType': [0], 'country': 'IE'}}]}), encoding='utf-8')
        s = socket.socket()
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
        s.close()
        log = open(Path(td) / 'launcher.log', 'w')
        p = subprocess.Popen([sys.executable, str(c.root / 'tools' / 'launch.py'), '--port', str(port), '--no-browser', '--data', str(data)], stdout=log, stderr=subprocess.STDOUT,
                             stdin=subprocess.DEVNULL, cwd=td, env={**os.environ, 'TEMP': str(tmp), 'TMP': str(tmp), 'TMPDIR': str(tmp)})
        try:
            def call(method, path, body=None, **headers):
                h = http.client.HTTPConnection('127.0.0.1', port, timeout=30)
                h.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
                r = h.getresponse()
                return r.status, r.read()
            for _ in range(60):
                try:
                    if call('GET', '/', **{'Sec-Fetch-Site': 'same-origin'})[0] in (200, 302, 404):
                        break
                except OSError:
                    time.sleep(0.5)
            hdr = {'X-SOG-Setup': '1', 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin'}
            st, raw = call('POST', '/__setup/regen/job', {'set': 'base', 'verb': 'build', 'args': {'zones': ['ie']}, 'author': 'TST'}, **hdr)
            c.eq(st, 200, 'the build job starts', what='job')
            # the browser has started once its profile holds its first files (read from the disk: listing the processes takes seconds, and the job ends by itself in about ten)
            end = time.time() + 60
            while time.time() < end and not any((d / 'Local State').exists() for d in tmp.glob('sog-base-*')):
                time.sleep(0.05)
            c.ok(any((d / 'Local State').exists() for d in tmp.glob('sog-base-*')), 'no browser profile in 60 s', 'the job started its headless browser (profile under the launcher\'s temporary folder)')
            p.terminate()                       # TerminateProcess on Windows: no `finally` of the launcher runs
            p.wait(10)
            left = _wait_none(lambda: _sog_browsers(tmp), 20)
            c.eq(left, [], 'the launcher was stopped by force in the middle of the build: no browser of its job is left (the profile folder stays, the next start sweeps it)', what='no orphan')
        finally:
            if p.poll() is None:
                p.kill()
            log.close()
            for pid in _sog_browsers(tmp):                   # whatever happens, the case leaves nothing running
                try:
                    subprocess.run(['taskkill', '/PID', str(pid), '/T', '/F'], capture_output=True, timeout=30) if os.name == 'nt' else os.kill(pid, 9)
                except (OSError, subprocess.SubprocessError):
                    pass


@case('K78', 'The launcher sweeps the leftovers of a stopped one at start: sog-base-* profiles older than an hour and the browsers that hold them, never a recent one (SOG-0038)', 'K', static=True,
      rule='SOG-0038: at start the launcher says and removes the sog-base-* profiles older than an hour and stops the headless browsers that still hold them; a profile of a running job (recent) and its browser are never touched')
def k78(c):
    import os
    import subprocess
    import tempfile
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    cmd = B.find_browser({})
    if not cmd:
        c.skip('no Edge or Chrome at a known location on this workstation')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        tmp = Path(td) / 'tmp'
        tmp.mkdir()
        # a stale profile held by a live browser, and a recent one held by another
        stale, young = tmp / 'sog-base-stale001', tmp / 'sog-base-young002'
        procs = {}
        for d in (stale, young):
            d.mkdir()
            procs[d.name] = subprocess.Popen(cmd + B.browser_args(str(d), '127.0.0.1:1', 'about:blank'), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=RJ.child_env())
        try:
            end = time.time() + 30
            while time.time() < end and not (len(_sog_browsers(stale)) and len(_sog_browsers(young))):
                time.sleep(0.5)
            c.ok(_sog_browsers(stale) and _sog_browsers(young), 'browsers did not start', 'two headless browsers hold two profiles')
            long_ago = time.time() - 7200
            os.utime(stale, (long_ago, long_ago))
            said = []
            gone = B.purge_stale(str(tmp), say=said.append)
            c.eq((gone, [x.name for x in tmp.glob('sog-base-*')]), (['sog-base-stale001'], ['sog-base-young002']), 'the profile older than an hour is removed, the recent one stays', what='sweep dirs')
            c.eq((_wait_none(lambda: _sog_browsers(stale), 10), bool(_sog_browsers(young))), ([], True), 'the browser holding the stale profile is stopped, the one holding the recent profile runs on', what='sweep processes')
            c.ok(len(said) == 1 and '1 profil' in said[0] and 'processus' in said[0], str(said), 'and the sweep says what it did (one line)')
            c.eq(B.purge_stale(str(tmp), say=said.append), [], 'a second sweep finds nothing and says nothing', what='second sweep')
            c.eq(len(said), 1, 'no second line', what='quiet')
        finally:
            for pr in procs.values():
                B.kill_tree(pr)
            B.remove_tree(str(young))


@case('K79', 'LFLL approaches (SOG-0044): every RNP and INA RNAV table of the AIP is read, the ILS has its final from the DATA page, nothing is dropped without a word', 'K', static=True,
      rule='SOG-0044 (6 Nov 2026): Lyon-Saint Exupery. The SIA publishes coding tables for the RNP and INA RNAV approaches only (no table for the ILS and VOR); the extractor loses cells of the pages (« y es », « RW17 R y es », « -1 .0 », lines of six cells, dashes); a line that is not '
           'a leg line vanished without being counted. All 4 RNP and 8 INA RNAV approaches are read as « check » with their final point; the ILS 17L, 35L and 35R get FAF -> threshold from the DATA page (no initial fix, no transition: the source has none), said; a lone altitude whose column the page does not tell is not read, said')
def k79(c):
    P, fx, rows = _eaip(c)
    names = _eaip_names(c, 'LFLL')
    page = (fx / 'LFLL' / 'FR-AD-2.LFLL.AD-2.12.html').read_text(encoding='utf-8')
    d = P.build_aerodrome('LFLL', [n + '.pdf' for n in names], lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-29', '2026-10-29', None, None, page)
    app = {p['id']: p for p in d['procedures'] if p['kind'] == 'APP'}
    c.eq(sorted(app), sorted(['LFLL.APP.RNPRWY17L.RW17L', 'LFLL.APP.RNPRWY17R.RW17R', 'LFLL.APP.RNPRWY35L.RW35L', 'LFLL.APP.RNPRWY35R.RW35R']
                             + [f'LFLL.APP.INARNAVRWY{rw}.RW{rw}.{t}' for rw in ('17L', '17R') for t in ('RIPTU', 'TALAR', 'ARBON', 'GOMET')]
                             + [f'LFLL.APP.INARNAVRWY{rw}.RW{rw}.{t}3N' for rw in ('35L', '35R') for t in ('RIPTU', 'TALAR', 'ARBON', 'GOMET')]
                             + [f'LFLL.APP.ILSRWY{rw}.RW{rw}' for rw in ('17L', '35L', '35R')]),
         '4 RNP + 8 INA RNAV (17L, 17R: 4 transitions each; 35L, 35R: the same 4, named by the STAR designator) + the ILS 17L, 35L, 35R; no ILS 17R (the SIA publishes a VOR there)', what='approaches')
    c.eq(sorted({p['status'] for p in app.values()}), ['check'], 'every approach is « check »: none is « doubt » (hidden by default), TALAR and GOMET of 17L / 17R included', what='statuses')
    c.eq([f['file'] for f in d['formats'] if not f['ok']], [], 'no page is refused: the RNP 17L / 17R / 35R pages (4 lines of 5), the INA RNAV 35L / 35R pages (8 of 17) and the SID 35L page 02 (26 of 46) read < 85 % before', what='pages')
    # the final point of the RNP pages: « APCH TF RW17L y es … », « TF RW17 R y es … »
    for rw in ('17L', '17R', '35L', '35R'):
        ids = [q['id'] for q in app[f'LFLL.APP.RNPRWY{rw}.RW{rw}']['points']]
        placed = {q['id'] for q in app[f'LFLL.APP.RNPRWY{rw}.RW{rw}']['points'] if q['lat'] is not None}
        c.ok({f'RW{rw}', f'FL{rw}'} <= placed, f'{ids} {sorted(placed)}', f'RNP {rw}: the runway point and the FAF FL{rw} are there and placed (the DATA page prints « FAP/FAF FL{rw} »; the en-route points are those of the base, resolved by aerodb)')
    c.eq([(q['id'], q['leg']) for q in app['LFLL.APP.INARNAVRWY17L.RW17L.TALAR']['points']][:5], [('TALAR', 'IF'), ('LL714', 'TF'), ('LL712', 'TF'), ('LL710', 'TF'), ('EKMEP', 'TF')],
         'INA RNAV 17L TALAR: its line « TF LL712 - 092 094.7 4.0 - - - - 1.0 » (a dash lost, « 1.0 » read as an accuracy, not as a vertical angle) is read', what='17L TALAR')
    c.eq([(q['id'], q.get('crs'), q.get('nm')) for q in app['LFLL.APP.INARNAVRWY17L.RW17L.GOMET']['points']][:7],
         [('GOMET', None, None), ('LL719', 326, 10.3), ('LL709', 355, 8.6), ('LL707', 355, 6.8), ('LL705', 330, 4.9), ('LL703', 315, 4.0), ('LL701', 315, 4.0)],
         'INA RNAV 17L GOMET: LL703, whose line lost its « TF », is read from its heading and distance and said (it left a hole: LL705 -> LL701 at 7.97 NM for 4.0 printed)', what='17L GOMET')
    # the INA RNAV 35L page: lines of six to eight cells; a lone altitude is not read (mini or maxi ?), the rest is
    t35 = app['LFLL.APP.INARNAVRWY35L.RW35L.ARBON3N']['points']
    c.eq([(q['id'], q.get('crs'), q.get('nm')) for q in t35], [('ARBON', None, None), ('LL514', 40, 6.6), ('LL512', 40, 4.0), ('LL510', 40, 4.0), ('NEGPU', 351, 4.1)],
         'INA RNAV 35L ARBON: the four legs, LL512 and LL514 (six cells left, they were not even counted) included', what='35L ARBON')
    c.eq([(q['id'], q['alt']) for q in t35 if q['id'] in ('LL514', 'LL510', 'NEGPU')], [('LL514', None), ('LL510', None), ('NEGPU', {'type': 'between', 'ft': 3000, 'ft2': 4500})],
         'a lone 5000 / 4000 (mini or maxi: the text layer keeps no empty cell) is NOT read; 3000-4500 (two altitudes) is', what='35L altitudes')
    c.ok(any('contrainte d\'altitude non lue (5000' in w for w in d['warnings']) and any('type de tronçon absent' in w for w in d['warnings']), str(len(d['warnings'])), 'and both said in the warnings')
    # the ILS: the final only, from the DATA page
    ils = app['LFLL.APP.ILSRWY17L.RW17L']
    c.eq(([(q['id'], q['leg'], q.get('synthetic')) for q in ils['points']], ils['name'], ils['runways'], ils['transition']),
         ([('FAF17L', 'IF', 'faf'), ('RW17L', 'CF', 'threshold')], 'ILS RWY 17L', ['17L'], None), 'ILS 17L: FAF -> threshold, named by the runway, no transition (the source has none)', what='ILS 17L')
    c.eq((ils['points'][0]['lat'], ils['points'][0]['lon']), (45.847861, 5.078111), "the FAF is the DATA page's (45°50'52.3'' N 005°04'41.2'' E)", what='ILS 17L FAF')
    c.ok(any('ILSRWY17L' in w and 'aucune table de codage' in w for w in d['warnings']), str([w for w in d['warnings'] if 'ILSRWY17L' in w]), 'and said: no coding table, so no initial fix, no transition, no missed approach')
    # the SID 35L page 02: the fly-over and the turn come BEFORE the terminator
    sid = {p['id']: p for p in d['procedures'] if p['kind'] == 'SID' and p['runways'] == ['35L']}
    asleg = sid['LFLL.SID.ASLEG8N.RW35L']['points']
    c.eq([(q['id'], q['leg'], q.get('over'), q.get('turn')) for q in asleg][:3], [('LL592', 'CF', True, None), (None, 'CA', None, None), ('LL597', 'DF', None, 'R')], 'SID 35L page 02: « - YES - CF LL592 … » and « -- R DF LL597 … » (fly-over and turn before the terminator) are read', what='ASLEG8N')
    # the parts: each repair on its own
    c.eq(P.norm_tokens('APCH TF RW17 R y es 173 175.1 6.9 - - - - -3.0° / 49 0.3')[:5], ['APCH', 'TF', 'RW17R', 'Yes', '173'], 'the runway point and the fly-over cut by the extractor (« RW17 R y es ») are one point and « Yes »', what='y es')
    c.eq(P.norm_tokens('TF ARBON - 203 205.7 20.9 - - 5000 220 -1 .0')[-2:], ['-', '1.0'], 'the empty cell and the accuracy cut as « -1 .0 »', what='-1 .0')
    c.eq(P.norm_tokens('CF PG081 - - - RNAV 1--')[-3:], ['--', 'RNAV', '1'], 'the Nav Spec precision glued to the dashes (« RNAV 1-- ») goes back to the word RNAV', what='RNAV 1--')
    c.eq(P._fit(P._cells(['LL712', '-', '092', '094.7', '4.0', '-', '-', '-', '-', '1.0']), 11, True, 'TF') is not None, True, 'a positive number is never the vertical angle: one arrangement is left', what='vpa column')


@case('K80', 'LFPO SID RWY 20 (SOG-0044): OKASI 2Y and OKASI 2S are in the AIP and in the reading; there is no OKASI 2A, on any runway', 'K', static=True,
      rule='SOG-0044 (6 Nov 2026): the user looked for OKASI2A on runway 20. The AIP in force (eAIP 29 OCT 2026, DATA SID RWY20 CODE_03 and the charts SID RWY20 SOUTH INSTR 01 / 02) names OKASI 2Y and OKASI 2S for runway 20; the reading holds both, all pages read; no SID named OKASI 2A exists in the AIP')
def k80(c):
    P, fx, rows = _eaip(c)
    names = _eaip_names(c, 'LFPO', 'AD_2_LFPO_DATA_SID_RWY*') + _eaip_names(c, 'LFPO', 'AD_2_LFPO_DATA_0*')
    d = P.build_aerodrome('LFPO', [n + '.pdf' for n in names], lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-29', '2026-10-29', None, None, None)
    sids = [p for p in d['procedures'] if p['kind'] == 'SID']
    okasi = sorted((p['name'], tuple(p['runways'])) for p in sids if p['name'] and p['name'].startswith('OKASI'))
    c.eq([x for x in okasi if x[1] == ('20',)], [('OKASI 2S', ('20',)), ('OKASI 2Y', ('20',))], 'runway 20: OKASI 2S and OKASI 2Y, as the AIP names them (CODE_03 and the charts SOUTH INSTR 01 / 02)', what='OKASI 20')
    c.eq(sorted({n for n, _ in okasi}), ['OKASI 2E', 'OKASI 2F', 'OKASI 2G', 'OKASI 2H', 'OKASI 2Q', 'OKASI 2R', 'OKASI 2S', 'OKASI 2W', 'OKASI 2X', 'OKASI 2Y'], 'the ten OKASI departures of the AIP (runways 06, 07, 20, 24, 25 x two letters); none is OKASI 2A', what='OKASI names')
    ok20 = next(p for p in sids if p['name'] == 'OKASI 2Y' and p['runways'] == ['20'])
    c.eq(([q['id'] for q in ok20['points']], ok20['status']), ([None, 'PO202', 'PO300', 'ODEBU', 'OKASI'], 'check'), 'OKASI 2Y: CA, PO202, PO300, ODEBU, OKASI, « check » (visible, not « doubt »)', what='OKASI 2Y')
    c.eq([f['file'] for f in d['formats'] if not f['ok']], [], 'every SID page of the runway 20 is read (the file on the workstation of 6 Nov 2026 had them « NON lue » from an older reading and kept the records of an older one)', what='pages')
    c.eq(len([p for p in sids if p['runways'] == ['20'] and p['status'] == 'check']), 36, 'runway 20: 17 names x 2 letters (2Y, 2S) and the two POGO departures of the shared page, all « check »', what='SID 20 count')


def _pdf_of_pages(pages):
    """Un PDF minimal (texte seul, police Helvetica) dont chaque page est une liste de lignes : une ligne = un seul fragment de texte, à son ordonnée, donc relue telle quelle par le lecteur (proc_pdf.rows_from_pdf)."""
    def esc(r):
        return r.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', None, b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
    kids = []
    for rows in pages:
        body = '\n'.join(f'BT /F1 8 Tf 20 {1980 - 12 * i} Td ({esc(r)}) Tj ET' for i, r in enumerate(rows)).encode('cp1252', 'replace')
        objs.append(b'<< /Length %d >>\nstream\n' % len(body) + body + b'\nendstream')
        stream = len(objs)
        objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 2000 2000] /Contents %d 0 R /Resources << /Font << /F1 3 0 R >> >> >>' % stream)
        kids.append(len(objs))
    objs[1] = b'<< /Type /Pages /Kids [' + b' '.join(b'%d 0 R' % k for k in kids) + b'] /Count %d >>' % len(kids)
    out, offs = b'%PDF-1.4\n', []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b'%d 0 obj\n' % i + o + b'\nendobj\n'
    xref = len(out)
    out += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1) + b''.join(b'%010d 00000 n \n' % o for o in offs)
    return out + b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, xref)


@case('K81', 'A PDF of two pages is read whole (SOG-0049): the table that runs over the second page of a coding-table PDF is not dropped', 'K', static=True,
      rule='SOG-0049 (6 Nov 2026): « OKASI et PILUL sont sur la seconde page de SID RNAV pour la RWY 20 … il peut y avoir plusieurs pages » -- a coding table may run over several pages of one PDF; the reader read the first page only, now it reads them all, each counted on its own')
def k81(c):
    import tempfile
    from pathlib import Path
    P, fx, rows = _eaip(c)
    import proc_sia as S                              # the real module: read_aerodrome calls ITS fetch and all_pages_rows (P is a copy of the names)
    fam = 'AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE'
    # a PDF of several pages, through the real reader: page 2 holds OKASI and PILUL (the user's words), page 1 is the previous table
    one, two = '_01', '_02'
    pages = [rows(fam + '_02'), rows(fam + '_03')]
    html = '<a href="Cartes/LFPO/%s">a</a><a href="Cartes/LFPO/%s">b</a>' % (fam + one + '.pdf', fam + two + '.pdf')
    blobs = {fam + one + '.pdf': _pdf_of_pages([rows(fam + '_01')]), fam + two + '.pdf': _pdf_of_pages(pages)}
    said = []
    saved = S.fetch
    with tempfile.TemporaryDirectory() as td:
        def fake_fetch(url, timeout=60):
            return html.encode() if url.endswith('FR-AD-2.LFPO-fr-FR.html') else blobs[url.rsplit('/', 1)[-1]]
        S.fetch = fake_fetch
        try:
            doc = S.read_aerodrome(S.eaip_url('2026-10-29'), 'LFPO', Path(td), None, lambda *t: said.append(' '.join(map(str, t))), vac_exists=lambda *a, **k: False)
        finally:
            S.fetch = saved
    c.ok(doc is not None, 'no document', 'the reader reads the two PDFs')
    names20 = sorted(p['name'] for p in doc['procedures'] if p['name'] and p['name'].split()[0] in ('OKASI', 'PILUL'))
    c.eq(names20, ['OKASI 2S', 'OKASI 2Y', 'PILUL 2S', 'PILUL 2Y'], 'the second page of the PDF is read: OKASI 2Y/2S and PILUL 2Y/2S (they are on it, none on the first)', what='page 2')
    two_pages = [f for f in doc['formats'] if f['file'] == fam + two + '.pdf']
    c.eq([(f.get('page'), f.get('of'), f['ok']) for f in two_pages], [(1, 2, True), (2, 2, True)], 'each page of a PDF is counted on its own in `formats` (page 1/2, 2/2), both read', what='formats')
    f = (doc.get('families') or [{}])[0]
    c.eq((f.get('listed'), f.get('pdf_pages'), f.get('read'), f.get('unread'), f.get('missing')), (2, 3, 3, 0, []), 'the family says: two files cited, three pages, three read', what='family')
    c.ok(any('3 page(s) lue(s) sur 3' in s for s in said), str(said), 'and the job says it: « 3 page(s) lue(s) sur 3 »')


@case('K82', 'Families of pages (SOG-0049): the reading says, per family of pages, how many pages the AIP cites and how many it read; a gap in the numbering and an unread page are said', 'K', static=True,
      rule='SOG-0049 (6 Nov 2026): a coding table runs over a family of pages (SID RWY20 RNAV CODE_01 … CODE_05); the reader gives per family the pages cited, the pages read, the unread ones and the numbers missing between 01 and the last, and the job says the total in one line')
def k82(c):
    P, fx, rows = _eaip(c)
    fam = 'AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE'
    # 1. the whole real set: the family of runway 20 holds 5 pages of 5, none missing, none unread; every family says what it read
    names = _eaip_names(c, 'LFPO', 'AD_2_LFPO_DATA_*')
    d = P.build_aerodrome('LFPO', [n + '.pdf' for n in names], lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-29', '2026-10-29', None, None, None)
    byname = {f['family']: f for f in d['families']}
    f20 = byname['DATA_SID_RWY20_RNAV_CODE']
    c.eq((f20['kind'], f20['numbers'], f20['listed'], f20['pdf_pages'], f20['read'], f20['unread'], f20['missing']), ('code', ['01', '02', '03', '04', '05'], 5, 5, 5, 0, []), 'LFPO SID RWY 20 RNAV: five pages cited, five read, none missing', what='family 20')
    c.eq((sum(f['read'] for f in d['families'] if f['kind'] == 'code'), len(d['formats']), byname['DATA']['read'], byname['DATA']['pdf_pages']), (56, 56, 4, 4), 'the coding pages read, summed over the families, are the pages of `formats` (nothing counted twice or left out); the four DATA pages are a family too', what='sum')
    line = P.families_line('LFPO', d['families'])
    c.ok('page(s) lue(s) sur' in line and 'À VÉRIFIER' not in line, line, 'the one line the job says: the total read, and nothing to check')
    # 2. a gap in the numbering (the AIP cites pages 01 and 03 of a family, not 02): said, per family, and in the warnings
    gap = [n + '.pdf' for n in names if n.startswith(fam) and not n.endswith('_02')]
    dg = P.build_aerodrome('LFPO', gap, lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-29', '2026-10-29', None, None, None)
    fg = dg['families'][0]
    c.eq((fg['numbers'], fg['missing'], fg['read']), (['01', '03', '04', '05'], ['02'], 4), 'a family cited as 01, 03, 04, 05: page 02 is missing, said', what='gap')
    c.ok(any('numérotation discontinue' in w and '02' in w for w in dg['warnings']) and 'À VÉRIFIER' in P.families_line('LFPO', dg['families']), str(dg['warnings'][:2]), 'and the warning and the job line say it')
    # 3. the second page of a PDF is unreadable: counted unread, with the page number, never silently dropped
    pages_of = {fam + '_01.pdf': [rows(fam + '_01')], fam + '_02.pdf': [rows(fam + '_02'), []]}
    du = P.build_aerodrome('LFPO', sorted(pages_of), lambda n: pages_of[n][0], 'https://example.org/AIRAC-2026-10-29', '2026-10-29', None, None, None, pages_of=lambda n: pages_of[n])
    c.eq([(f['file'][-11:], f['page'], f['ok']) for f in du['formats'] if f.get('of')], [('CODE_02.pdf', 1, True), ('CODE_02.pdf', 2, False)], 'a second page with no text is an unread page 2/2', what='unread')
    c.ok(any('CODE_02.pdf (p. 2/2): page NON lue' in w for w in du['warnings']) and du['families'][0]['unread'] == 1 and 'À VÉRIFIER' in P.families_line('LFPO', du['families']), str(du['warnings'][:3]), 'said in the warnings (« p. 2/2 : page NON lue ») and by the job line')


@case('K83', 'chartUrl(proc) (SOG-0045): the official chart of a procedure from the aerodrome file (approach: its IAC chart; SID / STAR: the chart that names it), else the DATA page; the runway: ADC, else VAC; never guessed', 'K', tags=('aerodb',), phone=False,
      rule='V3 § 10.39 (6 Nov 2026): AeroDb.chartUrl(proc) answers an https address from charts.base + a path the file itself lists (SIA host only), the chart only when ONE matches (the SOUTH_INSTR charts of a runway do not say which SID they carry: DATA page), ENAIRE / AirNav / other sources null')
def k83(c):
    import json
    import types
    shim = types.SimpleNamespace(root=ROOT)                  # the page test has no `root`: the page sets are read from the repository
    P, fx, rows = _eaip(shim)
    names = _eaip_names(shim, 'LFPO', 'AD_2_LFPO_DATA_*')
    charts = ['ADC_01', 'ADC_02', 'IAC_RWY07_FNA_ILS_CAT123_LOC', 'IAC_RWY20_FNA_RNP', 'IAC_RWY_EAST_INA_RNAV_MOLBA', 'IAC_RWY_WEST_INA_RNAV_MOLBA', 'SID_RWY06-07_RNAV_OLZOM_MONOT_DORDI', 'SID_RWY20-24-25_RNAV_OLZOM_MONOT_DORDI',
              'SID_RWY20_RNAV_SOUTH_INSTR_01', 'SID_RWY20_RNAV_SOUTH_INSTR_02', 'SID_RWY06-07_RNAV_SOUTH', 'STAR_RWY20-24-25_RNAV_MATIX_MOPIL_RENSA', 'STAR_RWY02-06-07_RNAV_MATIX_MOPIL_RENSA']
    files = [n + '.pdf' for n in names] + [f'AD_2_LFPO_{n}.pdf' for n in charts]
    vac = 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.LFPO.pdf'
    doc = P.build_aerodrome('LFPO', files, lambda n: rows(n.replace('.pdf', '')), P.eaip_url('2026-10-29'), '2026-10-29', None, vac, None)
    # a second file with two charts that both name the same SID on the same runway: ambiguous, so the DATA page, never the first
    twin = json.loads(json.dumps(doc))
    twin['charts']['items'] += [{'path': 'Cartes/LFPO/AD_2_LFPO_SID_RWY20_RNAV_OKASI_A.pdf', 'kind': 'SID'}, {'path': 'Cartes/LFPO/AD_2_LFPO_SID_RWY20-24_RNAV_OKASI_B.pdf', 'kind': 'SID'}]
    noadc = json.loads(json.dumps(doc))
    noadc['charts']['items'] = [i for i in noadc['charts']['items'] if i['kind'] != 'ADC']
    hostile = json.loads(json.dumps(doc))
    hostile['charts']['base'] = 'https://evil.example.org/x/'
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async ([docs, ofp]) => {
      const day = Date.parse('2026-11-06T12:00:00Z');
      const mk = files => AeroDB.create({ reader: { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} }, lnmperf: false, now: () => day });
      const out = {};
      for (const [tag, doc] of Object.entries(docs)) {
        const db = mk({ 'proc/manual/LFPO.json': doc }), all = await db.procedures('LFPO', { doubt: true });
        const find = (kind, name, rw, tr) => all.find(p => p.kind === kind && p.name === name && p.runways.includes(rw) && (tr === undefined || p.transition === tr));
        const ask = async (kind, name, rw, tr) => { const p = find(kind, name, rw, tr); return p ? await db.chartUrl(p) : 'NO PROCEDURE ' + [kind, name, rw]; };
        out[tag] = {
          rnp20: await ask('APP', 'RNP RWY 20', '20'), ils07: await ask('APP', 'ILS CAT I or CAT II and CAT III or LOC RWY 07', '07'), ina02: await ask('APP', 'INA RNAV RWY 02', '02', 'VEBEK 1E'),
          olzom6: await ask('SID', 'OLZOM 2F', '06'), olzom20: await ask('SID', 'OLZOM 2Y', '20'), okasi20: await ask('SID', 'OKASI 2Y', '20'), okasi2s: await ask('SID', 'OKASI 2S', '20'),
          star20: await ask('STAR', 'MATIX 9W', '20'),
          rwy: await db.chartUrl({ icao: 'LFPO', kind: 'RWY', id: 'LFPO.RWY.20', name: 'RWY 20', runways: ['20'] }),
          lower: await db.chartUrl({ icao: 'lfpo', kind: 'RWY', id: 'LFPO.RWY.20', name: 'RWY 20', runways: ['20'] }),
          other: await db.chartUrl({ icao: 'EIDW', kind: 'SID', id: 'EIDW.SID.X', name: 'X 1A', runways: ['10'] }),
          spain: await db.chartUrl({ icao: 'LEMD', kind: 'SID', id: 'LEMD.SID.X', name: 'X 1A', runways: ['10'] }),
          junk: [await db.chartUrl(null), await db.chartUrl({}), await db.chartUrl('LFPO'), await db.chartUrl({ icao: 'LF', kind: 'RWY' })],
          unknown: await db.chartUrl({ icao: 'LFPO', kind: 'SID', id: 'LFPO.SID.NOPE.RW20', name: 'NOPE 1A', runways: ['20'] }),
          ofp: await db.chartUrl({ ...(find('SID', 'OKASI 2Y', '20')), id: 'LFPO.SID.OFP', source: { kind: 'ofp' } })
        };
      }
      out.words = [AeroDBProcedures.chartWords('AD_2_LFLL_IAC_RWY17L_17R_INA_RNAV.pdf'), AeroDBProcedures.chartWords('AD_2_LFPO_IAC_RWY_EAST_INA_RNAV_MOLBA.pdf')];
      return out;
    }""", [{'good': doc, 'twin': twin, 'noadc': noadc, 'hostile': hostile}, None])
    base = P.eaip_url('2026-10-29') + '/html/eAIP/Cartes/LFPO/'
    g = r['good']
    c.eq((g['rnp20'], g['ils07']), (base + 'AD_2_LFPO_IAC_RWY20_FNA_RNP.pdf', base + 'AD_2_LFPO_IAC_RWY07_FNA_ILS_CAT123_LOC.pdf'), 'approach: the IAC chart of the runway whose name carries the words of its DATA page (RNP, ILS CAT123 LOC)', what='approach')
    c.eq(g['ina02'], base + 'AD_2_LFPO_DATA_RWY02_INA_RNAV_CODE_GNSS.pdf', 'INA RNAV: the charts are « EAST / WEST » (a direction, no runway number): none is guessed, the DATA page of the table', what='INA')
    c.eq((g['olzom6'], g['olzom20']), (base + 'AD_2_LFPO_SID_RWY06-07_RNAV_OLZOM_MONOT_DORDI.pdf', base + 'AD_2_LFPO_SID_RWY20-24-25_RNAV_OLZOM_MONOT_DORDI.pdf'), 'SID: the chart of its runway whose name carries the SID (OLZOM 2F on 06, OLZOM 2Y on 20)', what='SID')
    c.eq((g['okasi20'], g['okasi2s']), (base + 'AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE_03.pdf', base + 'AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE_03.pdf'), 'OKASI 2Y / 2S: the SOUTH_INSTR charts do not say which SID they carry (the name is in the drawing): the DATA page, CODE_03', what='OKASI')
    c.eq(g['star20'], base + 'AD_2_LFPO_STAR_RWY20-24-25_RNAV_MATIX_MOPIL_RENSA.pdf', 'STAR: the chart whose name carries it (MATIX)', what='STAR')
    c.eq((g['rwy'], g['lower']), (base + 'AD_2_LFPO_ADC_01.pdf',) * 2, 'the runway (no record): the aerodrome chart, the first one', what='RWY')
    c.eq((g['other'], g['spain'], g['junk'], g['unknown'], g['ofp']), (None, None, [None] * 4, None, None), 'another State, junk, an unknown procedure, a procedure from an OFP: null (nothing is composed)', what='null')
    t = r['twin']
    c.eq((t['okasi20'], t['olzom20']), (base + 'AD_2_LFPO_DATA_SID_RWY20_RNAV_CODE_03.pdf', base + 'AD_2_LFPO_SID_RWY20-24-25_RNAV_OLZOM_MONOT_DORDI.pdf'), 'two charts name OKASI on runway 20: ambiguous, so the DATA page, never the first (the unambiguous OLZOM stays)', what='twin')
    c.eq(r['noadc']['rwy'], vac, 'the runway of a file with no aerodrome chart: the VAC of the VFR atlas', what='VAC')
    h = r['hostile']
    c.eq((h['rnp20'], h['okasi20'], h['rwy']), (None, None, None), 'a file whose base is not under the SIA host gives no address, whatever it lists', what='hostile')
    c.eq(r['words'], [{'runways': ['17L', '17R'], 'words': ['INA', 'RNAV']}, {'runways': [], 'words': ['EAST', 'INA', 'RNAV', 'MOLBA']}], 'the runways of a chart name (« 17L_17R » too); a direction is not a runway', what='chartWords')


def _ground_job():
    """Le jeu « ground » du lanceur (tools/regen/ground.py), chargé à part pour que l'essai remplace son GET (aucun appel réel à Overpass dans la noreg) ; le socle avec les verbes chargés."""
    import importlib.util
    RJ = _regen()
    spec = importlib.util.spec_from_file_location('ground_test', ROOT / 'tools/regen/ground.py')
    G = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(G)
    return RJ, G


@case('K84', 'Launcher job ground/fetch (SOG-0046): one Overpass request per aerodrome (a recorded answer in the test), a small bounded file in proc/ground/, a dry run that calls nothing', 'K', static=True,
      rule='V3 § 10.40 (6 Nov 2026): the ground layer is read once through the launcher, never from the page: taxiways, stands and holding points of OpenStreetMap, names of 16 signs at most, 5 000 items at most, coordinates to 1e-6, the ODbL attribution in the file; nothing is written without an item; the noreg never calls the public instance')
def k84(c):
    import json
    import os
    import tempfile
    import urllib.parse
    RJ, G = _ground_job()
    answer = (ROOT / 'frame/aerodb/test/fixtures/ground/LFPO.overpass.json').read_bytes()
    c.ok(('ground', 'fetch') in RJ.REGISTRY and RJ.MIN_GAP.get(('ground', 'fetch'), 0) >= 30, str(sorted(k for k in RJ.REGISTRY if k[0] == 'ground')), 'the verb ground/fetch is loaded by the launcher, 30 s between two starts')
    check = RJ.REGISTRY[('ground', 'fetch')][1]
    c.eq([check(a) for a in ({'icao': 'lfpo'}, {'icao': 'LFPO', 'dry': True}, {'icao': 'LFPO', 'dry': 'yes'}, {'icao': 'LFPO,LFPG'}, {'icao': 'LFP'}, {'icao': 'LFPO', 'x': 1}, {}, 'LFPO')],
         [{'icao': 'LFPO', 'dry': False}, {'icao': 'LFPO', 'dry': True}, None, None, None, None, None, None], 'arguments: one aerodrome of four signs, an optional boolean dry, nothing else', what='check')
    calls = []

    def get(url, timeout=120):
        calls.append(url)
        return state['reply']
    state = {'reply': (200, answer)}
    G.GET, G.SLEEP = get, lambda w: None     # the retries of a busy server do not sleep in the noreg (K128)
    with tempfile.TemporaryDirectory() as td:
        ctx = {'data': td, 'secrets': td}
        run = lambda a: G.fetch(RJ.Job('ground', 'fetch', a, author='TST'), a, ctx)
        out = os.path.join(td, 'proc', 'ground', 'LFPO.json')
        # dry run: the plan, no call, nothing written
        r = run({'icao': 'LFPO', 'dry': True})
        c.eq((r['ok'], r['dry'], r['plan']['host'], r['plan']['calls'], len(calls), os.path.exists(out)), (True, True, 'overpass-api.de', 1, 0, False), 'dry run: the plan (host, one call), no call made, nothing written', what='dry')
        # the real run
        r = run({'icao': 'LFPO'})
        c.eq((r['ok'], r['items'], len(calls), r['file']), (True, {'twy': 4, 'park': 3, 'hold': 1}, 1, 'proc/ground/LFPO.json'), 'one request, four taxiways, three stands (a polygon gives its centre), one holding point', what='run')
        u = urllib.parse.urlparse(calls[0])
        q = urllib.parse.parse_qs(u.query)['data'][0]
        c.eq((u.scheme, u.netloc, u.path), ('https', 'overpass-api.de', '/api/interpreter'), 'the address is computed by the job: https, the one Overpass host', what='host')
        c.ok('"icao"="LFPO"' in q and 'taxiway' in q and 'holding_position' in q and 'out geom' in q, q, 'the request names the aerodrome by its ICAO tag and asks taxiways, stands, gates and holding points')
        doc = json.loads(open(out, encoding='utf-8').read())
        c.eq([k for k in doc], ['icao', 'cycle', 'source', 'attribution', 'items'], 'the file: icao, cycle, source, attribution, items', what='keys')
        c.eq((doc['icao'], doc['source'], doc['attribution'], bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', doc['cycle']))), ('LFPO', 'osm', '© OpenStreetMap contributors, ODbL', True), 'source osm, the ODbL attribution, the day as the cycle', what='head')
        by = {i['id']: i for i in doc['items']}
        c.eq(by['w101']['line'], [[2.36, 48.73], [2.361, 48.731], [2.362, 48.7315]], 'a taxiway line: rounded to 1e-6, the repeated point dropped', what='line')
        c.eq((by['w102']['name'], by['w106']['name'], by['w103']['name']), ('Voie très longue', 'B', '<b>X</b>&'), 'names: 16 signs at most, control characters removed (the frame escapes the rest: it is an untrusted file)', what='names')
        c.eq((by['w202']['point'], by['n201']['name'], by['n203']['name'], by['n204']['kind']), ([2.301, 48.701], '12', 'G1', 'hold'), 'a stand drawn as a polygon is its centre; ref first, then name', what='points')
        c.eq(sorted(set(by) & {'w104', 'r105', 'n205', 'wx', 'w105'}), [], 'dropped: the one-point taxiway, the relation, the invalid latitude, the non-numeric id (the duplicate is kept once)', what='dropped')
        c.ok(any('laissé(s) de côté' in w for w in r['warnings']), str(r['warnings']), 'and said')
        idx = json.loads(open(os.path.join(td, 'proc', 'ground', 'index.json'), encoding='utf-8').read())
        c.eq(idx['aerodromes']['LFPO'], {'cycle': doc['cycle'], 'twy': 4, 'park': 3, 'hold': 1, 'bytes': os.path.getsize(out)}, 'the manifest proc/ground/index.json: the cycle, the counts and the size per aerodrome', what='manifest')
        c.eq([i['kind'] for i in doc['items']], ['twy'] * 4 + ['park'] * 3 + ['hold'], 'taxiways first, then stands, then holding points (so a cap drops the least useful)', what='order')
        # an aerodrome OpenStreetMap does not know: nothing is written
        state['reply'] = (200, b'{"elements": []}')
        r = run({'icao': 'LFZZ'})
        c.eq((r['ok'], r['reason'], os.path.exists(os.path.join(td, 'proc', 'ground', 'LFZZ.json'))), (False, 'no-data', False), 'no element: « no-data », no file', what='no-data')
        # a busy public server, a bad answer, a cancelled job
        state['reply'] = (429, b'')
        r = run({'icao': 'LFPG'})
        c.ok(r['ok'] is False and r['reason'] == 'failed' and '429' in r['message'] and 'try again' in r['message'], str(r), 'HTTP 429: failed, said as busy')
        state['reply'] = (200, b'<html>rate limited</html>')
        r = run({'icao': 'LFPG'})
        c.eq((r['ok'], r['reason'], os.path.exists(os.path.join(td, 'proc', 'ground', 'LFPG.json'))), (False, 'failed', False), 'an answer that is not JSON: failed, nothing written', what='not json')
        # the bounds, on the builder
        many = {'elements': [{'type': 'node', 'id': n, 'lat': 48.0, 'lon': 2.0, 'tags': {'aeroway': 'parking_position', 'ref': str(n)}} for n in range(1, 5002)]}
        w = []
        d5 = G.build('LFPO', many, '2026-11-06', w)
        c.eq((len(d5['items']), any('5000' in x for x in w)), (5000, True), 'at most 5 000 items, said', what='cap')
        c.eq(len(json.dumps(G.build('LFPO', json.loads(answer), '2026-11-06'))) < 4000, True, 'the file stays small (a few hundred bytes per element)', what='size')


@case('K85', 'AeroDb.ground(icao) and fetchGround (SOG-0046): the ground file read as an untrusted input (bounded copy, escaped names, invalid items dropped), null without a file, the launcher job through its reasons', 'K', tags=('aerodb',), phone=False,
      rule='V3 § 10.40 (6 Nov 2026): proc/ground/<ICAO>.json may be pushed by any pilot of the group; the frame hands the Map a bounded copy: 5 000 items, 2 000 points a line, names of 16 signs without < > & " or control signs, finite coordinates inside the globe, the file of another aerodrome refused')
def k85(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-06T12:00:00Z');
      const mk = (files, launcher) => AeroDB.create({ reader: { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} }, lnmperf: false, launcher, now: () => day });
      const good = { icao: 'LFPO', cycle: '2026-11-06', source: 'osm', attribution: '© OpenStreetMap contributors, ODbL', items: [
        { id: 'w1', kind: 'twy', name: 'A', line: [[2.36, 48.73], [2.37, 48.74]] },
        { id: 'w2', kind: 'twy', name: '<img src=x onerror=alert(1)>' + 'Z'.repeat(40), line: [[2.36, 48.73], [2.37, 48.74]] },
        { id: 'w3', kind: 'twy', name: 'one point', line: [[2.36, 48.73]] },
        { id: 'w4', kind: 'twy', name: 'nan', line: [[2.36, 48.73], [null, 48.74]] },
        { id: 'w5', kind: 'twy', name: 'far', line: [[2.36, 48.73], [200, 48.74]] },
        { id: 'n6', kind: 'park', name: 'B\\u0007\\u001b12', point: [2.3, 48.7] },
        { id: 'n7', kind: 'hold', name: 'A1', point: [2.3, 95] },
        { id: 'n8', kind: 'hold', name: 'A2', point: [2.31, 48.71], extra: { evil: 1 } },
        { id: 'javascript:1', kind: 'park', name: 'bad id', point: [2.3, 48.7] },
        { id: 'n9', kind: 'stand', name: 'bad kind', point: [2.3, 48.7] },
        { id: 'n10', kind: 'park', name: { toString: 'x' }, point: [2.3, 48.7] },
        null, 'junk', 3
      ] };
      const many = { ...good, icao: 'LFPG', items: Array.from({ length: 6000 }, (_, i) => ({ id: 'n' + (i + 1), kind: 'park', name: String(i), point: [2.5, 49] })) };
      const longLine = { ...good, icao: 'LFBO', items: [{ id: 'w1', kind: 'twy', name: 'L', line: Array.from({ length: 2500 }, (_, i) => [1 + i / 1e5, 43]) }] };
      const db = mk({ 'proc/ground/LFPO.json': good, 'proc/ground/LFPG.json': many, 'proc/ground/LFBO.json': longLine,
        'proc/ground/LFRS.json': { ...good, icao: 'LFPO' }, 'proc/ground/LFLL.json': { ...good, icao: 'LFLL', source: 'apt.dat' }, 'proc/ground/LFMN.json': 'not an object' });
      const out = { po: await db.ground('lfpo'), pg: await db.ground('LFPG'), bo: await db.ground('LFBO'), rs: await db.ground('LFRS'), ll: await db.ground('LFLL'), mn: await db.ground('LFMN'),
        none: await db.ground('LFZZ'), bad: [await db.ground(''), await db.ground(null), await db.ground('LF'), await db.ground('../x')] };
      const calls = [];
      let answer = null;
      const fake = (over = {}) => ({ info: () => ({ data: true, lan: false }), request: async () => null, job: async (route, body, opts) => { calls.push({ route, body }); opts.onProgress?.({ step: 'LFPO: Overpass', done: 0, total: 1 }); return typeof answer === 'function' ? answer() : answer; }, ...over });
      const f = async (launcher, icao = 'LFPO', o) => { try { return await mk({ 'proc/ground/LFPO.json': good }, launcher).fetchGround(icao, o); } catch (e) { return { reason: 'THROWS ' + e }; } };
      const ac = new AbortController(); ac.abort();
      answer = { status: 200, result: { ok: true, icao: 'LFPO', items: { twy: 1, park: 1, hold: 1 }, bytes: 900, truncated: false, warnings: [], commit: 'abc', file: 'proc/ground/LFPO.json' } };
      const progress = [];
      out.fetch = {
        bad: (await f(fake(), 'XX')).reason, aborted: (await f(fake(), 'LFPO', { signal: ac.signal })).reason, none: (await f(undefined)).reason, paired: (await f(fake({ info: () => ({ data: true, lan: true }) }))).reason,
        ok: await f(fake(), 'LFPO', { onProgress: s => progress.push(s) }), calls: calls.map(x => [x.route, x.body]), progress
      };
      answer = { status: 200, result: { ok: true, dry: true, icao: 'LFPO', plan: { host: 'overpass-api.de', calls: 1, file: 'proc/ground/LFPO.json' } } };
      out.fetch.dry = await f(fake(), 'LFPO', { dry: true });
      out.fetch.dryCall = calls[calls.length - 1][1] || calls[calls.length - 1].body;
      answer = { status: 200, result: { ok: false, reason: 'no-data', message: 'nothing in OSM' } };
      out.fetch.nodata = await f(fake());
      answer = { status: 429, result: null, message: 'wait' };
      out.fetch.soon = await f(fake());
      answer = { status: 200, result: { ok: false, reason: 'weird' } };
      out.fetch.weird = (await f(fake())).reason;
      answer = { status: 409, result: null };
      out.fetch.busy = (await f(fake())).reason;
      const slow = fake({ job: async () => { await new Promise(r => setTimeout(r, 60)); return { status: 200, result: { ok: true, icao: 'LFPO', items: {}, bytes: 1, warnings: [], commit: null } }; } });
      const dbs = mk({}, slow), first = dbs.fetchGround('LFPO'), second = await dbs.fetchGround('LFPO');
      out.fetch.twice = [second.reason, (await first).ok];
      return out;
    }""")
    po = r['po']
    c.eq([i['id'] for i in po['items']], ['w1', 'w2', 'n6', 'n8', 'n10'], 'the valid items stay (a one-point line, a NaN or out-of-globe coordinate, a bad id, a bad kind, junk are dropped; a name that is not a string leaves the stand unnamed)', what='items')
    c.eq((po['items'][1]['name'], po['items'][2]['name'], po['items'][3].get('extra'), po['items'][4]['name']), ('img src=x onerro', 'B 12', None, ''), 'names: markup characters and control signs become spaces, 16 signs at most; unknown fields are not copied', what='names')
    c.eq((po['icao'], po['cycle'], po['source'], po['attribution']), ('LFPO', '2026-11-06', 'osm', '© OpenStreetMap contributors, ODbL'), 'the head: icao, cycle, source, attribution', what='head')
    c.eq((len(r['pg']['items']), len(r['bo']['items'][0]['line'])), (5000, 2000), 'bounded: 5 000 items, 2 000 points a line', what='bounds')
    c.eq((r['rs'], r['ll'], r['mn'], r['none'], r['bad']), (None, None, None, None, [None] * 4), 'the file of another aerodrome, a source that is not osm, a file that is not an object, no file, a bad code: null', what='null')
    f = r['fetch']
    c.eq((f['bad'], f['aborted'], f['none'], f['paired'], f['nodata']['reason'], f['soon']['reason'], f['weird'], f['busy'], f['twice']), ('bad-icao', 'cancelled', 'no-launcher', 'paired', 'no-data', 'too-soon', 'failed', 'busy', ['busy', True]),
         'fetchGround: one reason per refusal, never silent, never twice for the same aerodrome at once', what='reasons')
    c.eq((f['ok']['ok'], f['ok']['items'], f['ok']['commit'], len(f['ok']['ground']['items']), f['calls'][0], len(f['progress'])), (True, {'twy': 1, 'park': 1, 'hold': 1}, 'abc', 5, ['regen/job', {'set': 'ground', 'verb': 'fetch', 'args': {'icao': 'LFPO'}}], 1),
         'success: the counts, the commit, the cleaned file read back, the job ground/fetch asked with the one aerodrome, the progress passed on', what='ok')
    c.eq((f['dry']['dry'], f['dryCall']['args']), (True, {'icao': 'LFPO', 'dry': True}), 'dry: the plan only, the job asked with dry', what='dry')


@case('K86', 'China (cn) and Cyprus (cy, Nicosia FIR) are buildable zones (SOG-0064): in the catalogue, with an openAIP source, accepted by the build job and published like any zone', 'K', static=True,
      rule='SOG-0064 (9 Nov 2026): « Chine et Nicosie ne sont pas dans la liste des packages téléchargeables »: the list holds PUBLISHED zones only; both zones are known to the suite (Natural Earth outlines, names in four languages), openAIP exports the country (asp, apt, nav; no rpp), the build job takes them: nobody had built and published them, no code was missing')
def k86(c):
    import json
    import tempfile
    import importlib.util
    RJ, B, fn, check = _d5_modules()
    spec = importlib.util.spec_from_file_location('base_sources_k86', ROOT / 'tools/regen/base_sources.py')
    BS = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(BS)
    ids = BS.zone_ids()
    c.ok('cn' in ids and 'cy' in ids, str(len(ids)), 'both zones are in the catalogue of zones (shared/carto/aero_zones_geo.js)')
    for z, name in (('cn', 'China'), ('cy', 'Cyprus')):
        c.eq((BS.sources_of(z), BS.file_source(f'openaip/{z}_asp.geojson'), BS.file_source(f'openaip/{z}_apt.geojson'), BS.file_source(f'openaip/{z}_nav.geojson')),
             (('openaip', 'mora', 'xplane'),) + ({'zone': z, 'source': 'openaip'},) * 3, f'{z}: the sources are openAIP (airspace, aerodromes, navaids), MORA and X-Plane; the openAIP files are attributed to the zone', what=f'{z} sources')
        c.eq(check({'zones': [z]}), {'zones': [z], 'personal': []}, f'{z}: the build job accepts it', what=f'{z} check')
    geo = (c.root / 'shared/carto/aero_zones_geo.js').read_text(encoding='utf-8')
    c.ok('"cn":{"n":["R' in geo.replace(' ', '') and 'People\'s Republic of China' in geo and '"cy":{"n":["Chypre","Cyprus"' in geo.replace(' ', ''), '', 'the names (fr, en, de, es) are those of the catalogue')
    c.ok('"cyn"' in geo.replace(' ', '') and BS.sources_of('cyn') == ('openaip', 'mora', 'xplane'), '', 'Northern Cyprus (cyn) is a zone of its own: openAIP has no export for it (404 on 6 Nov), so it stays empty')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'cn': 'ok', 'cy': 'ok'})
        run = _D5Run(RJ, data, fake, {'zones': ['cn', 'cy']})
        view = run.wait()
        res = view['result']
        cur = B.airac_in_force()
        c.eq((res.get('ok'), res['folders']), (True, {'cn': cur, 'cy': cur}), 'a build of cn and cy ends well, each written under the cycle in force (no dated source of their own)', what='build')
        idx = json.loads((data / 'sia' / 'base' / 'index.json').read_text(encoding='utf-8'))
        c.eq(sorted(set(idx['zones']) & {'cn', 'cy'}), ['cn', 'cy'], 'and both are in the manifest of published zones: that is what the download list shows', what='manifest')


@case('K87', 'Launcher job stats/output (SOG-0052 step 2): the Output folder of X-Plane set on the workstation, the Fuel Phase Monitor journals listed and read by the launcher, the path never given whole, the samples never kept', 'K', static=True,
      rule='V3 § 10.37 C (9 Nov 2026): the launcher reads X-Plane 12/Output/FuelPhaseMonitor_*.csv itself (setting « dossier Output », local only, never published) and hands the text to modules/stats/phases.js; the full path is never shown, the data and suite folders are refused, a name is a bare journal name, the text is not written in the last-job file')
def k87(c):
    import gzip
    import importlib.util
    import json
    import os
    import tempfile
    import time
    RJ = _regen()
    spec = importlib.util.spec_from_file_location('stats_test', ROOT / 'tools/regen/stats.py')
    S = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(S)
    c.ok(('stats', 'output') in RJ.REGISTRY, str(sorted(k for k in RJ.REGISTRY if k[0] == 'stats')), 'the verb stats/output is loaded by the launcher')
    check = RJ.REGISTRY[('stats', 'output')][1]
    good = [{'action': 'status'}, {'action': 'clear'}, {'action': 'set', 'folder': 'C:\\X-Plane 12\\Output'}, {'action': 'read', 'name': 'FuelPhaseMonitor_20261106.csv'}, {'action': 'read', 'name': 'FuelPhaseMonitor.csv.gz'}]
    bad = [{'action': 'read', 'name': n} for n in ('../x.csv', 'FuelPhaseMonitor_..\\x.csv', 'other.csv', 'FuelPhaseMonitor_a.txt', 'FuelPhaseMonitor/a.csv', '', 'FuelPhaseMonitor' + 'x' * 120 + '.csv')] + [
        {'action': 'read'}, {'action': 'read', 'name': 'FuelPhaseMonitor.csv', 'folder': 'x'}, {'action': 'set'}, {'action': 'set', 'folder': ''}, {'action': 'set', 'folder': 'a\x00b'}, {'action': 'status', 'name': 'x'}, {'action': 'zap'}, {}, None, 'status']
    c.eq(([check(a) is not None for a in good], [a for a in bad if check(a) is not None]), ([True] * 5, []), 'arguments: four actions, a bare journal name only, nothing else', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        td = os.path.realpath(td)
        data, out = os.path.join(td, 'data'), os.path.join(td, 'Sim', 'X-Plane 12', 'Output')
        os.makedirs(data)
        os.makedirs(out)
        csv = 'phase,duration_s,fuel_kgph\nCRUISE,15,310.5\n'
        open(os.path.join(out, 'FuelPhaseMonitor_20261106.csv'), 'wb').write(csv.encode())
        with gzip.open(os.path.join(out, 'FuelPhaseMonitor_old.csv.gz'), 'wb') as f:
            f.write(csv.encode())
        open(os.path.join(out, 'other.csv'), 'w').write('x')
        open(os.path.join(out, 'FuelPhaseMonitor_note.txt'), 'w').write('x')
        os.makedirs(os.path.join(out, 'FuelPhaseMonitor_dir.csv'))
        ctx = {'data': data, 'secrets': td}
        job = RJ.Job('stats', 'output', {}, author='TST')
        run = lambda a: S.output(job, a, ctx)
        c.eq((run({'action': 'status'})['set'], run({'action': 'status'})['files']), (False, []), 'nothing set: nothing listed', what='unset')
        c.eq([run({'action': 'set', 'folder': p})['reason'] for p in (os.path.join(td, 'nope'), os.path.join(out, 'other.csv'), data, os.path.join(data, 'sia'), os.path.dirname(os.path.dirname(S.TOOLS)))], ['no-folder', 'no-folder', 'refused', 'no-folder', 'refused'],
             'refused: a folder that does not exist, a file, the data folder, a parent of the suite', what='refused')
        r = run({'action': 'set', 'folder': out})
        c.eq((r['ok'], r['set'], r['label'], [f['name'] for f in r['files']]), (True, True, 'X-Plane 12/Output', ['FuelPhaseMonitor_20261106.csv', 'FuelPhaseMonitor_old.csv.gz']),
             'set: the label is the last two names, only the two journals are listed (not other.csv, a .txt, a folder)', what='set')
        c.ok(td not in json.dumps(r) and td not in json.dumps(run({'action': 'status'})), str(r), 'the full path is never in an answer')
        c.ok(os.path.isfile(os.path.join(data, 'local', 'xp_output.json')) and not os.path.exists(os.path.join(td, 'Sim', 'x')), '', 'the setting is in data/local/ (never versioned, never published)')
        t = run({'action': 'read', 'name': 'FuelPhaseMonitor_20261106.csv'})
        g = run({'action': 'read', 'name': 'FuelPhaseMonitor_old.csv.gz'})
        c.eq((t['ok'], t['_text'], t['size'], g['ok'], g['_text']), (True, csv, len(csv), True, csv), 'read: the text of a journal, a .gz decompressed', what='read')
        c.eq([run({'action': 'read', 'name': n})['reason'] for n in ('FuelPhaseMonitor_absent.csv', 'FuelPhaseMonitor_dir.csv')], ['no-file', 'no-file'], 'an absent file and a folder are no file', what='absent')
        S.MAX_BYTES = 10
        c.eq((run({'action': 'read', 'name': 'FuelPhaseMonitor_20261106.csv'})['reason'], run({'action': 'read', 'name': 'FuelPhaseMonitor_old.csv.gz'})['reason']), ('too-large', 'too-large'), 'over the bound, a plain file or a decompressed one: refused', what='bound')
        S.MAX_BYTES = 64 * 1024 * 1024
        # a link that leaves the folder is no journal
        try:
            os.symlink(os.path.join(out, 'other.csv'), os.path.join(out, 'FuelPhaseMonitor_link.csv'))
            linked = run({'action': 'read', 'name': 'FuelPhaseMonitor_link.csv'})['reason'] == 'no-file' and 'FuelPhaseMonitor_link.csv' not in [f['name'] for f in run({'action': 'status'})['files']]
        except OSError:
            linked = True                                                                       # no symbolic link without the right to make one (Windows): nothing to prove
        c.ok(linked, '', 'a symbolic link is neither listed nor read')
        # through the launcher: the text reaches the page, not the last-job file
        store = os.path.join(td, 'last.json')
        jobs = RJ.Jobs(RJ.REGISTRY, ctx=ctx, store=store)
        started = jobs.start('stats', 'output', {'action': 'read', 'name': 'FuelPhaseMonitor_20261106.csv'}, 'TST')
        t0 = time.time()
        while time.time() - t0 < 10 and (jobs.view(started['job']).get('state') != 'done'):
            time.sleep(0.05)
        v = jobs.view(started['job'])
        saved = open(store, encoding='utf-8').read()
        c.eq((v['state'], v['result'].get('_text'), 'CRUISE' in saved, json.loads(saved)['job']['result'].get('ok')), ('done', csv, False, True), 'through the launcher the page gets the text; the last-job file keeps the answer without it (the samples are never written)', what='store')
        c.eq(run({'action': 'clear'})['set'], False, 'clear: the setting is gone', what='clear')


SIA_OM = (('PAC-P', 'NTAA', 'NTTB', 'Polynésie', '2026-10-29'), ('PAC-N', 'NWWM', 'NLWW', 'Nouvelle-Calédonie', '2026-10-29'), ('RUN', 'FMEE', 'FMCZ', 'Réunion', '2026-10-01'), ('CAR-SAM-NAM', 'TFFF', 'LFVP', 'Antilles', '2026-10-01'))


@case('K88', 'SIA overseas eAIP (SOG-0054): the region of a terrain, the AIRAC folder of each region read from its home page, the jobs proc/eaip-fetch and proc/regions, one case per region', 'K', static=True,
      rule='SOG-0054 (9 Nov 2026, survey of 6 Nov): the SIA publishes PAC-P, PAC-N, RUN and CAR-SAM-NAM beside FRANCE on the same disc, same layout, same coding tables, each region with its own AIRAC folder (RUN and CAR-SAM-NAM one cycle back on 29 Oct 2026); the suite reads them like France, from the aerodrome page of its region; the zone fr already holds their aerodromes and navaids (AIXM FR_OM)')
def k88(c):
    import json
    import os
    import sys
    import tempfile
    import time
    import urllib.error
    RJ = _regen()
    import proc_sia as S
    check_ead = RJ.REGISTRY[('proc', 'ead-fetch')][1]
    check_eaip = RJ.REGISTRY[('proc', 'eaip-fetch')][1]
    disc = 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026'
    homes = {'FRANCE': "init('FRANCE','2026','10','29','11')", 'PAC-P': "init('PAC P','2026','10','29','11')", 'PAC-N': "init('PAC N','2026','10','29','11')", 'RUN': "init('RUN','2026','10','01','10')",
             'CAR-SAM-NAM': "init('CAR SAM NAM','2026','10','01','10')"}
    asked = []

    def get(url, timeout=60):
        asked.append(url)
        m = re.fullmatch(r'https://www\.sia\.aviation-civile\.gouv\.fr/media/dvd/eAIP_\d\d_[A-Z]{3}_\d{4}/([A-Z-]+)/home\.html', url)
        if not m or m.group(1) not in homes:
            raise urllib.error.HTTPError(url, 404, 'not found', None, None)
        return ('<html><body onLoad="' + homes[m.group(1)] + '"></body></html>').encode()
    for region, ad, ad2, place, date in SIA_OM:
        c.eq((S.region_of(ad), S.region_of(ad2.lower()), S.region_date(homes[region])), (region, region, date), f'{region} ({place}): {ad} and {ad2} belong to it; its home page gives the folder date {date}', what=f'{region} region')
        url = S.region_eaip('2026-10-29', region, get)
        c.eq(url, f'{disc}/{region}/AIRAC-{date}', f'{region}: the folder is the disc of the cycle + the region + the region\'s own date (not the calendar cycle)', what=f'{region} url')
        c.eq((check_eaip({'icao': ad}), check_eaip({'icao': ad2}), check_ead({'icao': ad}), check_ead({'icao': ad2})), ({'icao': ad}, {'icao': ad2}, None, None), f'{region}: proc/eaip-fetch accepts {ad} and {ad2}, proc/ead-fetch refuses them (the SIA is never read through EAD)', what=f'{region} jobs')
    c.eq(S.region_eaip('2026-10-29', 'FRANCE', get), disc + '/FRANCE/AIRAC-2026-10-29', 'FRANCE: no call, the metropolitan address as before', what='france')
    c.eq(sum(1 for u in asked if u.endswith('/FRANCE/home.html')), 0, 'and its home page is not read', what='no france call')
    c.eq([S.region_of(k) for k in ('LFPO', 'LFVP', 'LFVM', 'FMEP', 'FMMI', 'FMCH', 'EGLL', 'LIRF', 'NTAA', 'SOCA', 'NZAA', 'LF', '', None, 'ntaa ')],
         ['FRANCE', 'CAR-SAM-NAM', 'CAR-SAM-NAM', 'RUN', None, None, None, None, 'PAC-P', 'CAR-SAM-NAM', None, None, None, None, 'PAC-P'], 'the exact codes come first (LFVP / LFVM are Saint-Pierre-et-Miquelon, FMMI and FMCH are not the SIA\'s), other States and bad codes: none', what='region_of')
    c.eq([check_eaip({'icao': k}) for k in ('FMMI', 'EGLL', 'NZAA', 'LFPO')], [None, None, None, {'icao': 'LFPO'}], 'proc/eaip-fetch still refuses the other States', what='eaip refuses')
    c.eq(check_ead({'icao': 'LFPO'}), None, 'and proc/ead-fetch still refuses France', what='ead refuses france')
    c.eq((S.region_date('init(\'RUN\',\'2026\',\'13\',\'01\',\'10\')'), S.region_date('<html></html>'), S.region_date(None)), (None, None, None), 'an impossible date or a page without one: none', what='bad home')
    c.eq(S.region_eaip('2026-10-29', 'NOPE', get), None, 'an unknown region: none', what='unknown region')
    c.eq(S.region_eaip('2026-11-26', 'RUN', lambda u, timeout=60: (_ for _ in ()).throw(OSError('down'))), None, 'a region page that cannot be read: none, the job says it', what='down')
    # the job proc/regions: one request a region, the file, never a region that cannot be read
    PR = RJ.REGISTRY[('proc', 'regions')]
    c.eq((PR[1]({}), PR[1]({'x': 1}), PR[1](None)), ({}, None, None), 'proc/regions takes no argument', what='regions check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        saved = (S.fetch, time.sleep)
        S.fetch, time.sleep = get, lambda s: None
        try:
            job = RJ.Job('proc', 'regions', {}, author='TST')
            r = PR[0](job, {}, {'data': td, 'secrets': td})
        finally:
            S.fetch, time.sleep = saved
        cycle = r.get('cycle')
        out = json.load(open(os.path.join(td, 'proc', 'sia-regions.json'), encoding='utf-8'))
        c.eq((r['ok'], r['regions'], r['missing']), (True, ['CAR-SAM-NAM', 'FRANCE', 'PAC-N', 'PAC-P', 'RUN'], []), 'proc/regions: the five regions', what='regions job')
        base = lambda reg, d: f'{S.eaip_url(cycle).rsplit("/FRANCE/", 1)[0]}/{reg}/AIRAC-{d}/html/eAIP/'
        c.eq({k: v['base'] for k, v in out['regions'].items() if k in ('RUN', 'PAC-P')}, {'RUN': base('RUN', '2026-10-01'), 'PAC-P': base('PAC-P', '2026-10-29')},
             'sia-regions.json: each region\'s base under its own date, on the disc of the cycle in force', what='regions file')
        c.eq((out['schema'], sorted(out['regions'])), (1, ['CAR-SAM-NAM', 'FRANCE', 'PAC-N', 'PAC-P', 'RUN']), 'the file: schema 1, the five regions', what='file')
@case('K89', 'SIA overseas eAIP in aerodb (SOG-0054): the region table mirrors the launcher\'s, chartsUrl answers the region\'s page from proc/sia-regions.json, the coverage and the verb of fetchProcedures follow, chartUrl uses the file\'s own base', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0054 (9 Nov 2026): NTAA, NWWM, FMEE, TFFF, LFVP are SIA terrains: eAIP of their region (the folder date is the region\'s, read by the launcher, never computed from the calendar); France unchanged; any other State null; a file or a regions file whose base leaves the SIA host gives nothing')
def k89(c):
    import json
    _regen()
    import proc_sia as S
    regions = {k: {'prefixes': list(v['prefixes']), 'codes': list(v['codes'])} for k, v in S.SIA_REGIONS.items()}
    disc = 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026'
    rfile = {'schema': 1, 'cycle': '2026-10-29', 'regions': {r: {'date': d, 'base': f'{disc}/{r}/AIRAC-{d}/html/eAIP/'} for r, d in (('FRANCE', '2026-10-29'), ('PAC-P', '2026-10-29'), ('PAC-N', '2026-10-29'), ('RUN', '2026-10-01'), ('CAR-SAM-NAM', '2026-10-01'))}}
    hostile = json.loads(json.dumps(rfile))
    hostile['regions']['PAC-P']['base'] = 'https://evil.example.org/PAC-P/html/eAIP/'
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async ([regions, rfile, hostile, disc]) => {
      const day = Date.parse('2026-11-09T12:00:00Z'), meta = (z, cy) => ({ schema: 2, zone: z, cycle: cy, kind: 'meta', parserVersion: 21, data: { builtAt: cy + 'T10:00:00Z' } });
      const rec = { id: 'NTAA.APP.RNPRWY04.RW04', icao: 'NTAA', kind: 'APP', name: 'RNP RWY 04', runways: ['04'], transition: null, status: 'check', source: { kind: 'eaip', ref: 'AD_2_NTAA_DATA_RWY04_RNP_CODE.pdf', file: 'AD_2_NTAA_DATA_RWY04_RNP_CODE.pdf', cycle: '2026-10-29' },
        points: [{ seq: 1, id: 'AAAAA', lat: -17.5, lon: -149.6, leg: 'IF' }, { seq: 2, id: 'RW04', lat: -17.55, lon: -149.6, leg: 'CF' }] };
      const file = base => ({ schema: 1, icao: 'NTAA', cycle: '2026-10-29', updated_at: '2026-11-09T08:00:00Z', procedures: [rec], charts: { base, items: [{ path: 'Cartes/NTAA/AD_2_NTAA_IAC_RWY04_FNA_RNP.pdf', kind: 'IAC' }, { path: 'Cartes/NTAA/AD_2_NTAA_DATA_RWY04_RNP_CODE.pdf', kind: 'DATA' }, { path: 'Cartes/NTAA/AD_2_NTAA_ADC_01.pdf', kind: 'ADC' }], vac: null } });
      const mk = (files, launcher) => AeroDB.create({ reader: { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} }, lnmperf: false, launcher, now: () => day });
      const out = {};
      const db = mk({ 'proc/sia-regions.json': rfile, 'proc/manual/NTAA.json': file(`${disc}/PAC-P/AIRAC-2026-10-29/html/eAIP/`), 'sia/base/fr/2026-10-29/meta.json': meta('fr', '2026-10-29') });
      await db.sources();
      out.mirror = JSON.stringify(Object.fromEntries(Object.entries(AeroCatalogue.SIA_REGIONS).map(([k, v]) => [k, { prefixes: v.prefixes, codes: v.codes }]))) === JSON.stringify(regions);
      const codes = ['NTAA', 'NTTB', 'NWWM', 'NLWW', 'FMEE', 'FMCZ', 'TFFF', 'LFVP', 'LFPO', 'FMMI', 'EGLL', 'NZAA', 'LF', ''];
      out.regionOf = codes.map(k => AeroCatalogue.siaRegionOf(k));
      out.charts = Object.fromEntries(await Promise.all(codes.map(async k => [k, await db.chartsUrl(k)])));
      out.none = [await mk({}).chartsUrl('NTAA'), await mk({}).chartsUrl('FMEE'), await mk({}).chartsUrl('LFPO')];
      out.hostile = await mk({ 'proc/sia-regions.json': hostile }).chartsUrl('NTAA');
      out.cov = Object.fromEntries(await Promise.all(['NTAA', 'FMEE', 'LFPO', 'FMMI'].map(async k => [k, (await db.coverage(k))?.reason])));
      const calls = [];
      const fake = () => ({ info: () => ({ data: true, lan: false }), request: async () => null, job: async (route, body) => { calls.push(body); return { status: 200, result: { ok: false, reason: 'failed', message: 'x' } }; } });
      const dbf = mk({}, fake());
      for (const k of ['NTAA', 'FMEE', 'LFPO', 'FMMI']) await dbf.fetchProcedures(k);
      out.verbs = calls.map(b => [b.args.icao, b.set + '/' + b.verb]);
      const procs = await db.procedures('NTAA', {});
      out.proc = procs.map(p => p.id);
      out.chartUrl = procs.length ? await db.chartUrl(procs[0]) : null;
      out.rwy = await db.chartUrl({ icao: 'NTAA', kind: 'RWY', id: 'NTAA.RWY.04', name: 'RWY 04', runways: ['04'] });
      out.badFile = await mk({ 'proc/manual/NTAA.json': file('https://evil.example.org/x/') }).chartUrl(rec);
      return out;
    }""", [regions, rfile, hostile, disc])
    c.ok(r['mirror'], '', 'the region table of catalogue.js is the launcher\'s (proc_sia.SIA_REGIONS): same regions, prefixes and exact codes')
    codes = ['NTAA', 'NTTB', 'NWWM', 'NLWW', 'FMEE', 'FMCZ', 'TFFF', 'LFVP', 'LFPO', 'FMMI', 'EGLL', 'NZAA', 'LF', '']
    c.eq(r['regionOf'], ['PAC-P', 'PAC-P', 'PAC-N', 'PAC-N', 'RUN', 'RUN', 'CAR-SAM-NAM', 'CAR-SAM-NAM', 'FRANCE', None, None, None, None, None], 'siaRegionOf: one region per overseas terrain (PAC-P, PAC-N, RUN, CAR-SAM-NAM), LFVP with CAR-SAM-NAM, FMMI and the others none', what='regionOf')
    ch = r['charts']
    page = lambda reg, d, k: f'{disc}/{reg}/AIRAC-{d}/html/eAIP/FR-AD-2.{k}-fr-FR.html'
    c.eq([ch[k] for k in ('NTAA', 'NTTB')], [page('PAC-P', '2026-10-29', 'NTAA'), page('PAC-P', '2026-10-29', 'NTTB')], 'PAC-P (NTAA Faa\'a, NTTB Bora-Bora): the aerodrome page of the region', what='PAC-P')
    c.eq([ch[k] for k in ('NWWM', 'NLWW')], [page('PAC-N', '2026-10-29', 'NWWM'), page('PAC-N', '2026-10-29', 'NLWW')], 'PAC-N (NWWM Nouméa-Magenta, NLWW Wallis): the aerodrome page of the region', what='PAC-N')
    c.eq([ch[k] for k in ('FMEE', 'FMCZ')], [page('RUN', '2026-10-01', 'FMEE'), page('RUN', '2026-10-01', 'FMCZ')], 'RUN (FMEE, FMCZ): its own folder date, 2026-10-01 (not the calendar cycle)', what='RUN')
    c.eq([ch[k] for k in ('TFFF', 'LFVP')], [page('CAR-SAM-NAM', '2026-10-01', 'TFFF'), page('CAR-SAM-NAM', '2026-10-01', 'LFVP')], 'CAR-SAM-NAM (TFFF, LFVP of Saint-Pierre-et-Miquelon): its own folder date', what='CSN')
    c.eq((ch['LFPO'], ch['FMMI'], ch['EGLL'], ch['NZAA'], ch['LF'], ch['']), (f'{disc}/FRANCE/AIRAC-2026-10-29/html/eAIP/FR-AD-2.LFPO-fr-FR.html', None, None, None, None, None), 'France unchanged; FMMI (Madagascar), another State, a bad code: null', what='others')
    c.eq((r['none'], r['hostile']), ([None, None, f'{disc}/FRANCE/AIRAC-2026-10-29/html/eAIP/FR-AD-2.LFPO-fr-FR.html'], None), 'no regions file: overseas null (the date is not guessed), France as before; a regions file whose base leaves the SIA host: null', what='no file')
    c.eq((r['cov']['NTAA'], r['cov']['FMEE'], r['cov']['LFPO'], r['cov']['FMMI'] != 'sia'), ('sia', 'sia', 'sia', True), 'coverage: an overseas terrain not yet read is « sia » (readable on demand, orange) like France; FMMI (Madagascar) is not', what='coverage')
    c.eq(r['verbs'], [['NTAA', 'proc/eaip-fetch'], ['FMEE', 'proc/eaip-fetch'], ['LFPO', 'proc/eaip-fetch']], 'fetchProcedures: the SIA verb for the overseas terrains and France; FMMI starts nothing (no EAD reading offered)', what='verbs')
    c.eq((r['chartUrl'], r['rwy']), (f'{disc}/PAC-P/AIRAC-2026-10-29/html/eAIP/Cartes/NTAA/AD_2_NTAA_IAC_RWY04_FNA_RNP.pdf', f'{disc}/PAC-P/AIRAC-2026-10-29/html/eAIP/Cartes/NTAA/AD_2_NTAA_ADC_01.pdf'),
         'chartUrl: the IAC chart of NTAA RNP 04 and its aerodrome chart, under the base of the file (the PAC-P folder)', what='chartUrl')
    c.eq(r['badFile'], None, 'a file whose base is not the SIA\'s gives nothing', what='bad file')


@case('K91', 'Little Navmap export (SOG-0028 (5)): the cruise written in the .lnmperf is the sheet\'s table at the cruise rpm and the closest altitude when two rows frame the rpm, else the sheet\'s cruise as before', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0028 (5) (Features SOG\'s patch, applied by AeroDB): a sheet\'s rpmFuelCurve is the single source of the flow at a rpm (§ 10.35); the export reads it like Fuel does (modules/fuel/model.js tableAt): the curve of the altitude closest to cruise.refAltFt, at cruise.rpmNominal, interpolated between two numbered rows or the row itself; no rpm, no altitude, no framing rows: the sheet\'s cruise; the import creates no table row (a .lnmperf has neither rpm nor altitude)')
def k91(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    c.page.add_script_tag(url=f'{c.base}/frame/aerodb/sheets.js')
    r = c.js("""() => {
      const S = window.AeroDBSheets, fields = S.PROFILE_FIELDS.filter(([, , , type, lnm = true]) => lnm !== false && type !== 'textarea');
      const base = unit => {
        const p = { id: 'T', name: 'Test', icao: 'TEST', unit };
        for (const [, , path, type] of fields) {
          const parts = path.split('.');
          let o = p;
          parts.slice(0, -1).forEach(k => o = o[k] ||= {});
          o[parts.at(-1)] = type === 'number' ? 1 : 'x';
        }
        return p;
      };
      const cruiseOf = xml => { const b = /<Cruise>([\\s\\S]*?)<\\/Cruise>/.exec(xml)[1]; return [+/<FuelFlowLbsGalPerHour>([^<]*)/.exec(b)[1], +/<SpeedKtsTAS>([^<]*)/.exec(b)[1]]; };
      const make = (unit, cruise, curve) => ({ ...base(unit), cruise: { ...base(unit).cruise, fuelFlowPerHour: 999, tasKt: 111, ...cruise }, rpmFuelCurve: curve });
      const row = (altFt, rpm, fuelFlowPerHour, tasKt) => ({ altFt, rpm, fuelFlowPerHour, ...(tasKt ? { tasKt } : {}) });
      const out = { has: typeof S.lnmCruiseFromCurve };
      if (out.has !== 'function') return out;
      const cr = { rpmNominal: 2000, refAltFt: 10000 };
      out.between = cruiseOf(S.toLnmperf(make('lb', cr, [row(10000, 1800, 400, 180), row(10000, 2200, 600, 220), row(5000, 1800, 1, 1), row(5000, 2200, 2, 2)])));
      out.exact = cruiseOf(S.toLnmperf(make('lb', cr, [row(10000, 1800, 400, 180), row(10000, 2000, 555, 205), row(10000, 2200, 600, 220)])));
      out.closest = cruiseOf(S.toLnmperf(make('lb', { ...cr, refAltFt: 12000 }, [row(5000, 1800, 1, 1), row(5000, 2200, 3, 3), row(15000, 1800, 300, 150), row(15000, 2200, 500, 190)])));
      out.outside = cruiseOf(S.toLnmperf(make('lb', { ...cr, rpmNominal: 2500 }, [row(10000, 1800, 400, 180), row(10000, 2200, 600, 220)])));
      out.noRef = cruiseOf(S.toLnmperf(make('lb', { rpmNominal: 2000, refAltFt: null }, [row(10000, 1800, 400, 180), row(10000, 2200, 600, 220)])));
      out.noRpm = cruiseOf(S.toLnmperf(make('lb', { rpmNominal: null, refAltFt: 10000 }, [row(10000, 1800, 400, 180), row(10000, 2200, 600, 220)])));
      out.noCurve = cruiseOf(S.toLnmperf(make('lb', cr, [])));
      out.noTas = cruiseOf(S.toLnmperf(make('lb', cr, [row(10000, 1800, 400), row(10000, 2200, 600)])));
      out.kg = cruiseOf(S.toLnmperf(make('kg', cr, [row(10000, 1800, 400, 180), row(10000, 2200, 600, 220)])));
      out.direct = [S.lnmCruiseFromCurve(null), S.lnmCruiseFromCurve({}), S.lnmCruiseFromCurve({ cruise: { rpmNominal: 2000, refAltFt: 1 }, rpmFuelCurve: [row(1, 1800, 0, 1), row(1, 2200, 600, 1)] }),
        S.lnmCruiseFromCurve({ cruise: { rpmNominal: '2000', refAltFt: '10000' }, rpmFuelCurve: [row('10000', '1800', '400', '180'), row('10000', '2200', '600', '220')] })];
      // the import creates no table row
      const xml = S.toLnmperf(make('lb', cr, [row(10000, 1800, 400, 180), row(10000, 2200, 600, 220)]));
      const back = S.parseLnmperf(xml, 'T.lnmperf');
      out.importRows = Array.isArray(back?.rpmFuelCurve) ? back.rpmFuelCurve.length : 0;
      return out;
    }""")
    c.eq(r['has'], 'function', 'AeroDBSheets exports lnmCruiseFromCurve', what='exported')
    c.eq(r['between'], [500, 200], 'two rows frame the rpm (1800 → 400, 2200 → 600 at 10 000 ft): 500 lb/h and 200 kt at 2000 rpm, not the sheet\'s 999 / 111', what='between')
    c.eq(r['exact'], [555, 205], 'a row at the rpm: that row', what='exact')
    c.eq(r['closest'], [400, 170], 'the altitude closest to the reference (12 000 ft: the 15 000 ft curve, not the 5 000 ft one)', what='closest')
    c.eq((r['outside'], r['noRef'], r['noRpm'], r['noCurve']), ([999, 111], [999, 111], [999, 111], [999, 111]), 'rpm outside the rows, no reference altitude, no cruise rpm, no curve: the sheet\'s cruise, as before', what='fallback')
    c.eq(r['noTas'], [500, 111], 'rows without a TAS: the flow from the table, the TAS stays the sheet\'s', what='no tas')
    c.eq([round(x, 1) for x in r['kg']], [round(500 / 0.45359237, 1), round(200, 1)], 'a sheet in kg: the table is converted with the rest (the export is in pounds)', what='kg')
    c.eq(r['direct'], [{}, {}, {}, {'fuelFlowPerHour': 500, 'tasKt': 200}], 'lnmCruiseFromCurve: nothing without data, a zero flow row is not numbered, strings are read as numbers', what='direct')
    c.eq(r['importRows'], 0, 'the import creates no table row: a .lnmperf has neither rpm nor altitude, a second source would appear', what='import')


@case('K92', 'The aircraft registry follows the current airline (§ 10.38 step 1, rest): the fleet is read in the airline\'s own folder, re-read when the airline changes, bounded as an untrusted input, airline/fleet.json as before without the frame', 'K', tags=('aerodb',), phone=False,
      rule='Features SOG (503068b37): after the migration (airline/<code>/fleet.json) the registry, which read airline/fleet.json only, no longer saw the fleet: search, fleetTypes and aircraftOf must follow FrameData.airline().root (airline/, airline/<code>/, the personal folder), re-read on frame-data-airline, from a path that no entry can invent, the file bounded (registration 2 to 10, type 2 to 4, 200 aircraft)')
def k92(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    c.page.add_script_tag(url=f'{c.base}/frame/aerodb/aircraft.js')                 # the type catalogue the registry takes (the page has not loaded it)
    r = c.js("""async () => {
      const fleet = (tag, regs, type = 'C30J') => ({ schema: 1, updated_at: '2026-11-09T08:00:00Z', aircraft: regs.map(registration => ({ registration, type, callsign: tag })) });
      const files = {
        'airline/fleet.json': fleet('DEF', ['F-AAAA', 'F-AAAB']),
        'airline/co2/fleet.json': fleet('CO2', ['F-BBBB'], 'TBM9'),
        'pilot/ABC/airline/perso/fleet.json': fleet('PER', ['F-PERS'], 'C172'),
        'x/fleet.json': fleet('EVIL', ['F-EVIL'], 'A320'),
        'airline/co3/fleet.json': { schema: 1, aircraft: [
          ...Array.from({ length: 300 }, (_, i) => ({ registration: 'F-' + String(1000 + i), type: 'C30J' })),
          { registration: '<b>', type: 'C30J' }, { registration: 'X', type: 'C30J' }, { registration: 'F-LONGTYPE', type: 'TOOLONGTYPE' }, { registration: 'F-AAAA', type: 'C30J' }, { registration: 'F-CTRL\\u0007', type: 'TBM9', operator: 'A\\u0007B' + 'z'.repeat(80), evil: { x: 1 } }, null, 'junk'] }
      };
      const day = Date.parse('2026-11-09T12:00:00Z');
      const db = AeroDB.create({ reader: { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} }, lnmperf: false, now: () => day });
      const snap = async () => {
        const A = await db.aircraft();
        const types = (await A.fleetTypes()).map(t => [t.type, t.registrations.slice().sort()]);
        const found = async reg => (await A.search(reg, 5)).filter(x => x.source === 'fleet').map(x => x.registration);
        return { types, aaaa: await found('F-AAAA'), bbbb: await found('F-BBBB'), pers: await found('F-PERS'), evil: await found('F-EVIL') };
      };
      const out = {};
      out.noFrame = await snap();                                                  // no FrameData.airline: airline/fleet.json as before
      let root = 'airline/';
      window.FrameData = { airline: async () => ({ code: 'x', root, name: 'X', fleet: null }) };
      const switchTo = async r => { root = r; window.dispatchEvent(new CustomEvent('frame-data-airline', { detail: { code: 'x', name: 'X' } })); return snap(); };
      out.def = await switchTo('airline/');
      out.co2 = await switchTo('airline/co2/');
      out.perso = await switchTo('pilot/ABC/airline/perso/');
      out.back = await switchTo('airline/');
      out.hostile = [];
      for (const bad of ['airline/../x/', 'x/', '/etc/', 'airline/CO2/', 'airline/co2', 'pilot/../../x/airline/perso/', 'airline/' + 'a'.repeat(20) + '/', '', null, 5]) out.hostile.push((await switchTo(bad)).evil.length + (await snap()).types.map(t => t[0]).join());
      const co3 = await switchTo('airline/co3/'), A = await db.aircraft();
      const t3 = await A.fleetTypes();
      out.co3 = { n: t3.reduce((n, t) => n + t.registrations.length, 0), regs: t3.flatMap(t => t.registrations).filter(x => !/^F-1\\d{3}$/.test(x)).sort(), types: t3.map(t => t.type).sort() };
      out.cleaned = window.AeroDBRegistry.cleanFleet(files['airline/co3/fleet.json']).aircraft.find(a => a.registration === 'F-CTRL' + '');
      out.paths = ['airline/', 'airline/co2/', 'pilot/ABC/airline/perso/', 'airline/../x/', '', null].map(x => window.AeroDBRegistry.fleetPathOf(x));
      // the change is announced
      let heard = 0;
      db.on('change', e => { if (e?.aircraft) heard++; });
      await switchTo('airline/co2/');
      out.heard = heard;
      return out;
    }""")
    t = lambda x: x['types']
    c.eq((t(r['noFrame']), r['noFrame']['aaaa']), ([['C30J', ['F-AAAA', 'F-AAAB']]], ['F-AAAA']), 'no FrameData.airline (an older frame, a test): airline/fleet.json as before', what='no frame')
    c.eq((t(r['def']), r['def']['bbbb']), ([['C30J', ['F-AAAA', 'F-AAAB']]], []), 'the default airline (« airline/ »): its fleet', what='default')
    c.eq((t(r['co2']), r['co2']['bbbb'], r['co2']['aaaa']), ([['TBM9', ['F-BBBB']]], ['F-BBBB'], []), 'after the switch to airline/co2/: fleetTypes and the search see ITS fleet, not the default one', what='co2')
    c.eq((t(r['perso']), r['perso']['pers']), ([['C172', ['F-PERS']]], ['F-PERS']), 'the personal airline: the fleet under pilot/<trigram>/airline/perso/', what='perso')
    c.eq(t(r['back']), [['C30J', ['F-AAAA', 'F-AAAB']]], 'and back to the first airline', what='back')
    c.eq(r['hostile'], ['0C30J'] * 10, 'a folder no airline can have (a parent, another folder, an upper-case code, no folder, junk) reads airline/fleet.json: no path is invented, the file x/fleet.json is never read', what='hostile')
    c.eq(r['paths'], ['airline/fleet.json', 'airline/co2/fleet.json', 'pilot/ABC/airline/perso/fleet.json', 'airline/fleet.json', 'airline/fleet.json', 'airline/fleet.json'], 'fleetPathOf: the three shapes of folder, anything else the default', what='paths')
    c.eq(r['co3']['n'], 200, 'a fleet file of 300 and more aircraft: at most 200 are kept', what='bound')
    c.ok('<B>' not in r['co3']['regs'] and 'X' not in r['co3']['regs'] and 'F-LONGTYPE' not in r['co3']['types'], str(r['co3']), 'a registration of one sign or with markup is left; a type of more than four signs is emptied (the aircraft stays)')
    c.eq((r['cleaned'] or {}).get('registration'), None, 'a registration with a control sign is not kept as written (it is not a registration)', what='ctrl')
    c.ok(r['heard'] >= 1, str(r['heard']), 'the change of airline is announced (aircraft: true), the registry is read again at the next question')


@case('K58', 'openAIP aerodromes: runways, bearing, hardLen and magVar derived like the SIA gives them to France', 'K', tags=('aerodb',), phone=False,
      rule='aerodb SPEC 2 (aerodrome fields, parser version 20): bearing, hardLen, water, runways and magVar come from the openAIP runways and magneticDeclination; a terrain without runways carries none of the runway fields')
def k58(c):
    import json
    fx = json.loads((ROOT / 'tests' / 'v3' / 'fixtures' / 'openaip_apt_runways.geojson').read_text(encoding='utf-8'))
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.wait_for_function('!!window.AeroSources', timeout=30000)
    got = c.js('(fx) => Object.fromEntries(window.AeroSources.geojson(fx, "es_apt.geojson").aero.aerodromes.map(a => [a.icao, a]))', fx)
    c.eq(sorted(got), ['LEEL', 'LEMG', 'LENM', 'LENR', 'LESP', 'LETV'], 'the six invented terrains are read', what='terrains')
    pick = lambda a, *ks: {k: a.get(k) for k in ks}
    # main runway flagged (two ends): the axis of the first flagged end, modulo 180; the hard length is the longest hard runway; feet become metres
    tv = got['LETV']
    c.eq(pick(tv, 'bearing', 'hardLen', 'water', 'magVar', 'public'), {'bearing': 92, 'hardLen': 2400, 'water': False, 'magVar': 1.25, 'public': True}, 'LETV: axis of 09, 2400 m hard, declination', what='LETV')
    c.eq([[r['id'], r['trueHdg'], r['lengthM'], r['surface'], r['main']] for r in tv['runways']],
         [['03', 32, 900, 'soft', False], ['09', 92, 2400, 'hard', True], ['14', 140, 914, 'soft', False], ['21', 212, 900, 'soft', False], ['27', 272, 2400, 'hard', True]],
         'one entry per end, in the export order: true heading, length in metres (3000 ft = 914 m), surface class, main flag', what='LETV runways')
    # the flagged runway wins over a longer one; hardLen ignores the flag; an unknown or missing surface code is « unknown »
    mg = got['LEMG']
    c.eq(pick(mg, 'bearing', 'hardLen', 'magVar'), {'bearing': 50, 'hardLen': 1500, 'magVar': -0.5}, 'LEMG: axis of the flagged grass runway, hard length of the longer asphalt one', what='LEMG')
    c.eq([r['surface'] for r in mg['runways']], ['hard', 'soft', 'unknown', 'unknown'], 'surface classes: asphalt, grass, code 22, a code the table does not know', what='LEMG surfaces')
    # no runway flagged: the longest; 250 -> 70; a zero declination is a declination
    nm = got['LENM']
    c.eq(pick(nm, 'bearing', 'hardLen', 'magVar'), {'bearing': 70, 'hardLen': 1800, 'magVar': 0}, 'LENM: no flag, the longest runway (25), heading 250 gives 70', what='LENM')
    # water: no hard length, the water flag, 180 gives 0, no declination given: no magVar
    sp = got['LESP']
    c.eq((pick(sp, 'bearing', 'hardLen', 'water'), 'magVar' in sp, sp['runways'][0]['surface']), ({'bearing': 0, 'hardLen': 0, 'water': True}, False, 'water'), 'LESP: water runway', what='LESP')
    # no runway: the runway fields are absent (not zero), the declination is still carried; an empty list is the same
    c.eq((sorted(set(got['LENR']) & {'bearing', 'hardLen', 'water', 'runways'}), got['LENR'].get('magVar'), got['LENR']['public']), ([], -0.5, False), 'LENR: no runway fields, declination kept', what='LENR')
    c.eq(sorted(set(got['LEEL']) & {'bearing', 'hardLen', 'water', 'runways', 'magVar'}), [], 'LEEL: an empty list of runways and no declination give none of the fields', what='LEEL')


@case('K59', 'A read of the base answers or fails, never pending: a part the repository lacks is empty at once, a held read ends at the bound', 'K',
      tags=('aerodb',), phone=False,
      rule='Simplification 31 Oct (BUGS SOG, D86 / D87: aerodb.mora stayed pending 20 s and more under load, the bench has no « mora » part): a part absent from the repository’s listing is empty at once, without a read, and said in the stats; any read has a bound (readWait, 10 s by default), then gives nothing (read again later), never an endless promise')
def k59(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-10-25T12:00:00Z'), cyc = AeroDB.airacCycles(1, day)[0], base = `sia/base/fr/${cyc}/`;
      // like the frame's data layer: one shared read per path until it ends, or until abandon(path)
      const reader = (files, hold) => ({
        asked: [], shared: new Map(), held: !!hold,
        read(p) {
          if (this.shared.has(p)) return this.shared.get(p);
          this.asked.push(p);
          const job = this.held && hold && p.endsWith(hold) ? new Promise(() => {}) : Promise.resolve(p in files ? { value: files[p], rev: 'r' } : null);
          this.shared.set(p, job);
          job.then(() => this.shared.get(p) === job && this.shared.delete(p));
          return job;
        },
        abandon(p) { this.shared.delete(p) },
        async list(prefix) { return Object.keys(files).filter(p => p.startsWith(prefix)) },
        watch: () => () => {}
      });
      const files = { [base + 'meta.json']: { data: {} }, [base + 'airspaces.json']: { data: [] } };
      // 1. no « mora » part in the repository: empty at once, never read
      const r1 = reader(files), db1 = AeroDB.create({ reader: r1, lnmperf: false, now: () => day });
      let t = performance.now();
      const m1 = await db1.mora(46.5, 2.5), ms1 = performance.now() - t;
      // 2. a listed part whose read never ends: nothing at the bound
      const r2 = reader({ ...files, [base + 'mora.json']: { data: [{ lat: 46, lon: 2, moraFt: 3200 }] } }, 'mora.json'), db2 = AeroDB.create({ reader: r2, lnmperf: false, now: () => day, readWait: 600 });
      t = performance.now();
      const m2 = await Promise.race([db2.mora(46.5, 2.5), new Promise(res => setTimeout(() => res('pending'), 8000))]), ms2 = performance.now() - t;
      const mora2 = r2.asked.filter(p => p.endsWith('mora.json')).length;
      // 3. the read freed: the next question really reads again (the pending read was abandoned at the bound)
      r2.held = false;
      const m3 = await Promise.race([db2.mora(46.5, 2.5), new Promise(res => setTimeout(() => res('pending'), 8000))]);
      return { m1, ms1, mora1: r1.asked.filter(p => p.endsWith('mora.json')).length, m2, ms2, mora2, m3, mora3: r2.asked.filter(p => p.endsWith('mora.json')).length };
    }""")
    c.eq((r['m1'], r['mora1']), (None, 0), 'a part the repository lacks: nothing, and never read', what='absent part')
    c.ok(r['ms1'] < 1000, f"{r['ms1']:.0f} ms", 'answered at once')
    c.eq((r['m2'], r['mora2']), (None, 1), 'a read that never ends: nothing at the bound, not a pending promise', what='held read')
    c.ok(500 <= r['ms2'] < 3000, f"{r['ms2']:.0f} ms", 'ended at the bound (600 ms in this bench)')
    c.eq((r['m3'], r['mora3']), (3200, 2), 'the next question reads again (the pending shared read abandoned at the bound) and gets the data', what='after the bound')


@case('K62', 'aircraft() answers or fails, never pending: a held registry read gives an empty registry at the bound, then is read again once freed', 'K',
      tags=('aerodb',), phone=False,
      rule='Simplification 1 Nov 2026 (a pilot stuck on Fuel › Route: the GitLab API did not answer and ctx.aerodb.aircraft() never resolved): every read of aerodb answers or fails, never pending; aircraft() and the registry reads have the readWait bound, give « nothing » at the bound (empty registry, the types base alone), abandon the shared read, and are asked again')
def k62(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      if (!window.AeroDBAircraft) await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = '../aircraft.js?v=0'; s.onload = ok; s.onerror = ko; document.head.append(s) });
      const files = {
        'AircraftDB/aircraft_db.json': { types: {} },
        'airline/fleet.json': { schema: 1, aircraft: [{ registration: 'F-HOLD', type: 'C172', callsigns: ['HOLD1'] }] }
      };
      // like the frame's data layer: one shared read per path until it ends, or until abandon(path); the held paths never answer (GitLab down)
      const reader = {
        asked: [], shared: new Map(), held: true, abandoned: [],
        read(p) {
          if (this.shared.has(p)) return this.shared.get(p);
          this.asked.push(p);
          const job = this.held && p.startsWith('airline/') ? new Promise(() => {}) : Promise.resolve(p in files ? { value: files[p], rev: 'r' } : null);
          this.shared.set(p, job);
          job.then(() => this.shared.get(p) === job && this.shared.delete(p));
          return job;
        },
        abandon(p) { this.abandoned.push(p); this.shared.delete(p) },
        list(prefix) { return this.held && prefix === 'airline/' ? new Promise(() => {}) : Promise.resolve(Object.keys(files).filter(p => p.startsWith(prefix))) },
        watch: () => () => {}
      };
      const db = AeroDB.create({ reader, lnmperf: false, readWait: 600 }),
        race = p => Promise.race([p, new Promise(res => setTimeout(() => res('pending'), 8000))]);
      let t = performance.now();
      const A1 = await race(db.aircraft()), ms1 = performance.now() - t;
      const hits1 = A1 === 'pending' ? 'pending' : (await A1.search('F-HOLD', 10)).filter(h => h.registration === 'F-HOLD').length;
      const types1 = A1 === 'pending' ? null : typeof A1.estimate === 'function';
      // the network comes back: the next question reads again and gets the fleet
      reader.held = false;
      const A2 = await race(db.aircraft());
      const hits2 = A2 === 'pending' ? 'pending' : (await A2.search('F-HOLD', 10)).filter(h => h.registration === 'F-HOLD').length;
      const A3 = await race(db.aircraft());
      return { ms1, hits1, types1, hits2, again: A2 !== A1, kept: A3 === A2, fleetReads: reader.asked.filter(p => p === 'airline/fleet.json').length,
               abandoned: reader.abandoned.includes('airline/fleet.json') };
    }""")
    c.ok(r['hits1'] != 'pending' and 500 <= r['ms1'] < 4000, f"{r['ms1']:.0f} ms, {r['hits1']}", 'aircraft() answers at the bound (600 ms in this bench), never pending')
    c.eq((r['hits1'], r['types1']), (0, True), 'at the bound: an empty registry, the types base alone (estimate still there)', what='at the bound')
    c.eq((r['hits2'], r['again'], r['kept']), (1, True, True), 'freed: the next aircraft() reads again and gets the fleet; once read without a bound, it is kept', what='read again')
    c.eq((r['fleetReads'], r['abandoned']), (2, True), 'the held shared read was abandoned at the bound, so the next question really read it again', what='abandon')


@case('K63', 'Build job: the cycle of a zone is its own dated source\'s (fr SIA, gb NATS), a zone without one has none; the blocking zone named', 'K', static=True,
      rule='Simplification 1 Nov 2026 (Features SOG on the user\'s workstation: every build wrote 2610 everywhere from the French SIA files): a zone\'s cycle is its own dated source\'s; a source without AIRAC has no cycle (never « out of date »); stale per zone, the blocking zone named')
def k63(c):
    import json
    import tempfile
    RJ, B, fn, check = _d5_modules()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        (data / 'sia' / 'zones' / 'gb' / 'EG_AIP_DS_FULL_20261029.xml').write_text('<x/>', encoding='utf-8')   # NATS : le cycle 2611
        _d5_modes(fake, {'fr': 'ok', 'gb': 'ok', 'de': 'ok'})
        run = _D5Run(RJ, data, fake, {'zones': ['de', 'gb', 'fr'], 'personal': ['nats']})      # NATS is read only when the personal-licence box declares it (SOG-0077)
        view = run.wait()
        res = view['result']
        cur = B.airac_in_force()
        offer = json.loads(_d5_lines(fake, 'claim.json')[0])
        c.eq(offer['cycles'], {'fr': '2026-10-01', 'gb': '2026-10-29', 'de': cur}, 'the page is told each zone\'s cycle: fr its SIA, gb its NATS, de (no dated source) the cycle in force', what='offer')
        c.eq((res['cycles'], res['folders']), ({'fr': '2026-10-01', 'gb': '2026-10-29', 'de': None}, {'fr': '2026-10-01', 'gb': '2026-10-29', 'de': cur}),
             'cycles: each zone\'s own (de none); folders: where each is written', what='cycles')
        c.ok(all((data / 'sia' / 'base' / z / f).is_dir() for z, f in res['folders'].items()), str(res['folders']), 'each zone written under its own cycle')
        stale_fr = '2026-10-01' < cur
        c.eq((res['stale'], res['blocking']), (stale_fr, [{'zone': 'fr', 'source': 'sia', 'cycle': '2026-10-01'}] if stale_fr else []),
             'only fr blocks (its SIA files of 2610): gb holds its NATS cycle, de has no AIRAC', what='blocking')
        c.eq({s: v['cycle'] for s, v in res['sources'].items()}, {'sia': '2026-10-01', 'nats': '2026-10-29', 'enaire': None, 'airnav': None}, 'the cycle the workstation holds per dated source', what='sources')
        c.ok(not stale_fr or any(x.startswith('fr: sources sia du cycle 2026-10-01') for x in view['log']), str(view['log'][-4:]), 'the blocking zone is said in the journal')
        idx = json.loads((data / 'sia' / 'base' / 'index.json').read_text(encoding='utf-8'))
        c.eq({z: idx['zones'][z]['cycle'] for z in ('fr', 'gb', 'de')}, res['folders'], 'the manifest carries each zone\'s cycle', what='manifest')


@case('K93', 'Build job: a zone is dated only by a source it READ (SOG-0077): gb built without the personal-licence NATS has no NATS cycle, says why, and a later UAS file does not date the AIP', 'K', static=True,
      rule='SOG-0077 (9 Nov 2026): the published gb base (folder 2026-11-26) had no airway and no point while the one before it (2026-10-01) had 1 217 and 1 425: it was built without the NATS personal-licence box, yet took the cycle of an UAS file of a LATER cycle (EG_UAS_…_20261126), which hid the good base; the cycle of a zone is its dated source\'s only when that source was read, and only the AIP file dates NATS')
def k93(c):
    import importlib
    import json
    import tempfile
    RJ, B, fn, check = _d5_modules()
    C = importlib.import_module('aero_cycles')
    names = ['zones/gb/EG_AIP_DS_FULL_20261001.xml', 'zones/gb/EG_UAS_FR_DS_AREA1_FULL_20261126.xml', 'zones/gb/EG_OBS_DS_AREA1_FULL_20261001.xml']
    rep = C.report(names)
    c.eq((rep['nats']['cycle'], C.cycled(names[1]), C.cycled(names[2]), C.cycled('zones/gb/EG_AIP_DS_FULL_20261126.xml')), ('2026-10-01', None, None, ('nats', '2026-11-26')),
         'only the AIP file dates NATS: the UAS file of 2026-11-26 and the obstacles file do not (the AIP of 2026-11-26 would)', what='nats dates')
    c.eq((sorted(C.used_sources(rep, [])), sorted(C.used_sources(rep, ['nats'])), sorted(C.used_sources(rep, ['enaire']))), (['sia'], ['nats', 'sia'], ['enaire', 'sia']),
         'used_sources: the SIA always, NATS, ENAIRE and AirNav only when declared', what='used')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        for n in names:
            (data / 'sia' / n).write_text('<x/>', encoding='utf-8')
        _d5_modes(fake, {'gb': 'ok'})
        res = _D5Run(RJ, data, fake, {'zones': ['gb']}).wait()['result']                 # no personal box
        cur = B.airac_in_force()
        c.eq((res['cycles'], res['folders'], res['blocking']), ({'gb': None}, {'gb': cur}, []), 'gb built WITHOUT the NATS box: no NATS cycle, written under the cycle in force (never under a later file\'s date)', what='without')
        c.eq(res['unread'], [{'zone': 'gb', 'source': 'nats', 'cycle': '2026-10-01', 'why': 'personal'}], 'and the result says the NATS files were there and not read', what='unread')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        (data / 'sia' / 'zones' / 'gb').mkdir(parents=True)
        for n in names:
            (data / 'sia' / n).write_text('<x/>', encoding='utf-8')
        _d5_modes(fake, {'gb': 'ok'})
        res = _D5Run(RJ, data, fake, {'zones': ['gb'], 'personal': ['nats']}).wait()['result']
        c.eq((res['cycles'], res['folders'], res['unread']), ({'gb': '2026-10-01'}, {'gb': '2026-10-01'}, []), 'gb built WITH the NATS box: the AIP\'s cycle (2026-10-01), not the UAS file\'s 2026-11-26; nothing unread', what='with')


@case('K94', 'The Canada card (SOG-0068): the DAH is downloaded and read by itself, AIP Canada (ENR, AD, SUP) is not read, said in the four languages', 'K', static=True,
      rule='SOG-0068 (9 Nov 2026): « AIP Canada : très flou » -- the card of NAV CANADA gave only the operational guides page and did not say that the AIP Canada pages are not read, so the user downloaded them all; the text now says what is automatic (the DAH) and what is not read (ENR, AD, SUP)')
def k94(c):
    import re
    src = (c.root / 'shared' / 'aero_zones.js').read_text(encoding='utf-8')
    block = src[src.index('navcan: {'):]
    block = block[:block.index("licence: 'NAV CANADA'")]
    howto = block[block.index('howto: L4('):]
    texts = [ln.strip() for ln in howto.splitlines()[1:] if ln.strip().startswith(chr(39))][:4]
    c.eq(len(texts), 4, 'four texts (fr, en, de, es)', what='four')
    marks = (('DAH', 'AIP Canad', 'ENR', 'SUP', 'NAV CANADA'),) * 4
    for lang, t, ms in zip(('fr', 'en', 'de', 'es'), texts, marks):
        c.ok(all(m in t for m in ms), t[:120], f'{lang}: names the DAH, AIP Canada, ENR and SUP')
    c.ok('PAS lu' in texts[0] and 'NOT read' in texts[1] and 'NICHT gelesen' in texts[2] and 'NO se lee' in texts[3], '', 'each text says that the AIP Canada is not read')
    c.ok('Télécharger' in texts[0] and 'Download' in texts[1] and 'Herunterladen' in texts[2] and 'Descargar' in texts[3], '', 'and that the DAH comes by the Download button (nothing to drop in)')


@case('K101', 'Workbook reader and compiled RAD / FRA books (SOG-0081): the standard-library reader gives the cells openpyxl gave (struck text removed, rows kept), the compiled files merge by cycle and never lose one', 'K', static=True,
      rule='SOG-0081 (9 Nov 2026): the EUROCONTROL RAD and FRA workbooks are compiled into data/route/rad.json.gz and fra.json.gz without openpyxl (the launcher is standard library only); the compiled form is RouteSim 2\'s, identical in content: the six workbooks of E:/DEFA/rad give exactly the books RouteSim 2 had compiled (checked on the workstation, not in the noreg)')
def k101(c):
    import os
    import tempfile
    import zipfile
    _regen()
    import route_fixture as RF
    from route_engine import import_books as I, xlsx
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        rad = os.path.join(td, 'RAD_2611_v1_0.xlsx')
        RF.write_xlsx(rad, RF.rad_sheets(True), strike_style_cells={('Annex 2B', 3, 8)}, rich_strike={('Annex 2B', 3, 12): ('Kept ', 'struck')})
        kind, book = I.read_book(rad)
        c.eq((kind, book['title'], book['start'], book['end_exclusive'], len(book['sha256'])), ('rad', 'RAD 2611 V1.0 (Rolling RAD Document)', '2026-10-29', '2026-11-26', 64), 'a RAD workbook: its title, the « Valid From » of the cover, 28 days, the SHA-256 of the file', what='rad head')
        c.eq(sorted(book['sheets']), ['Annex 1', 'Annex 2A', 'Annex 2B', 'Annex 2C', 'Annex 3A ARR', 'Annex 3A Conditions', 'Annex 3A DEP', 'Annex 3B DCT', 'Annex 3B FRA LIM'], 'the nine annexes, the cover apart', what='sheets')
        row = book['sheets']['Annex 2B'][1]
        c.eq((row['v'][7], row['v'][11], row['strike_removed']), ('', 'Kept', True), 'a struck cell is emptied, the struck run of a rich text is cut, and the row says it (strike_removed)', what='strike')
        c.eq((book['sheets']['Annex 2B'][0]['v'][7], book['sheets']['Annex 2B'][0]['strike_removed'], book['headers']['Annex 2B'][3]), ('ZZZZZ', False, 'ID'), 'the other rows are untouched; the headers are kept apart', what='plain')
        fra = os.path.join(td, 'eurocontrol-airac-2611-fra-points-29-oct-2026.xlsx')
        RF.write_xlsx(fra, RF.fra_sheets())
        kind, fb = I.read_book(fra)
        c.eq((kind, fb['start'], [r['v'][2] for r in fb['rows']], fb['rows'][0]['v'][3]), ('fra', '2026-10-29', ['ABADI', 'ABAKO'], 'N404519'), 'a FRA points workbook: the effective date of the cover, the points, empty cells as empty texts', what='fra')
        bad = os.path.join(td, 'other.xlsx')
        RF.write_xlsx(bad, [('Sheet1', [['a', 'b']])])
        notbook = os.path.join(td, 'x.xlsx')
        open(notbook, 'wb').write(b'PK not a workbook')
        errs = []
        for p in (bad, notbook):
            try:
                I.read_book(p)
            except ValueError as e:
                errs.append(str(e)[:30])
        c.eq(len(errs), 2, 'a workbook that is neither a RAD nor FRA points, and a file that is not a workbook: refused (ValueError)', what='refused')
        # merge by cycle: the same cycle is replaced, the others stay, sorted; written atomically
        out = os.path.join(td, 'route', 'rad.json.gz')
        I.write(out, I.merge([], [{'start': '2026-09-03', 'file': 'old'}]))
        I.write(out, I.merge(I.load(out), [dict(book, file='newer.xlsx')]))
        I.write(out, I.merge(I.load(out), [dict(book, file='again.xlsx')]))
        c.eq([(b['start'], b['file']) for b in I.load(out)], [('2026-09-03', 'old'), ('2026-10-29', 'again.xlsx')], 'merge: the same cycle is replaced, the other cycle stays (a compiled datum is never purged)', what='merge')
        c.eq(I.load(os.path.join(td, 'absent.json.gz')), [], 'a missing or unreadable compiled file is an empty list', what='load')
        # a DOCTYPE (entities) is refused
        evil = os.path.join(td, 'evil.xlsx')
        RF.write_xlsx(evil, [('Cover', [['x']])])
        with zipfile.ZipFile(evil) as z:
            parts = {n: z.read(n) for n in z.namelist()}
        parts['xl/sharedStrings.xml'] = b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>&a;</t></si></sst>'
        with zipfile.ZipFile(evil, 'w') as z:
            for n, blob in parts.items():
                z.writestr(n, blob)
        try:
            xlsx.sheets(evil)
            refused = False
        except (xlsx.XlsxError, ValueError):
            refused = True
        c.ok(refused, '', 'a workbook with a DOCTYPE (entities) is refused')


@case('K102', 'Job route/import-rad (SOG-0081): the plan shows what Downloads holds, the pilot picks, the books are compiled into data/route/, committed once, a changed file is refused', 'K', static=True,
      rule='SOG-0081: like base/pickup the plan (dry, the default) lists the EUROCONTROL workbooks of Downloads (name, size, kind, cycle) and writes nothing; the run takes ONLY the books the plan showed and refuses a file that is no longer the one shown; the compiled rad.json.gz and fra.json.gz keep the other cycles; one commit; nothing outside data/route/')
def k102(c):
    import json
    import os
    import importlib
    import tempfile
    RJ = _regen()
    import route_fixture as RF
    from route_engine import import_books as I
    c.ok(('route', 'import-rad') in RJ.REGISTRY and ('route', 'compute') in RJ.REGISTRY, str(sorted(k for k in RJ.REGISTRY if k[0] == 'route')), 'the verbs route/import-rad and route/compute are loaded by the launcher')
    check = RJ.REGISTRY[('route', 'import-rad')][1]
    book = {'name': 'RAD_2611_v1_0.xlsx', 'size': 5}
    c.eq([check(a) for a in ({}, {'dry': False, 'books': [book]}, {'dry': 'x'}, {'books': 'x'}, {'books': [{'name': '../x.xlsx', 'size': 1}]}, {'books': [{'name': 'other.xlsx', 'size': 1}]}, {'books': [dict(book, size=-1)]},
                             {'books': [{'name': book['name']}]}, {'x': 1}, None, 'dry')],
         [{'dry': True}, {'dry': False, 'books': [book]}, None, None, None, None, None, None, None, None, None], 'arguments: dry (true by default), the books the plan showed (a name of the two patterns, a size), nothing else', what='check')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = os.path.join(td, 'dl'), os.path.join(td, 'data')
        os.makedirs(dl)
        os.makedirs(data)
        RF.write_xlsx(os.path.join(dl, 'RAD_2611_v1_0.xlsx'), RF.rad_sheets())
        RF.write_xlsx(os.path.join(dl, 'eurocontrol-airac-2611-fra-points-29-oct-2026.xlsx'), RF.fra_sheets())
        RF.write_xlsx(os.path.join(dl, 'RAD_2699_v1_0.xlsx'), [('Sheet1', [['not a RAD']])])          # a RAD name, not a RAD workbook
        open(os.path.join(dl, 'notes.xlsx'), 'wb').write(b'x')                                         # not an EUROCONTROL name: not looked at
        ctx = {'data': data, 'secrets': td, 'downloads': lambda: [dl]}
        run = lambda **a: RJ.REGISTRY[('route', 'import-rad')][0](RJ.Job('route', 'import-rad', {}, author='TST'), check(a), ctx)
        plan = run()
        c.eq((plan['ok'], plan['dry'], [(f['name'], f['kind'], f['cycle']) for f in plan['files']], [f['name'] for f in plan['failed']], os.path.exists(os.path.join(data, 'route'))),
             (True, True, [('RAD_2611_v1_0.xlsx', 'rad', '2026-10-29'), ('eurocontrol-airac-2611-fra-points-29-oct-2026.xlsx', 'fra', '2026-10-29')], ['RAD_2699_v1_0.xlsx'], False),
             'the plan: the two workbooks with their kind and cycle, the unreadable one failed with its name, nothing written', what='plan')
        shown = [{'name': f['name'], 'size': f['size']} for f in plan['files']]
        res = run(dry=False)
        c.eq((res['ok'], res['reason'], res['taken']), (False, 'not-shown', []), 'a run without the books the plan showed takes nothing', what='not shown')
        res = run(dry=False, books=[dict(shown[0], size=shown[0]['size'] + 1)])
        c.eq((res['taken'], [f['error'] for f in res['failed'] if f['name'] == shown[0]['name']], os.path.exists(os.path.join(data, 'route', 'rad.json.gz'))), ([], ['changed'], False), 'a file that is no longer the one shown (another size): refused, nothing written', what='changed')
        res = run(dry=False, books=shown)
        c.eq((res['ok'], res['taken'], res['rad'], res['fra']), (True, [s['name'] for s in shown], ['2026-10-29'], ['2026-10-29']), 'the two books chosen are taken', what='taken')
        rad, fra = I.load(os.path.join(data, 'route', 'rad.json.gz')), I.load(os.path.join(data, 'route', 'fra.json.gz'))
        c.eq(([(b['start'], b['title']) for b in rad], [(b['start'], len(b['rows'])) for b in fra]), ([('2026-10-29', 'RAD 2611 V1.0 (Rolling RAD Document)')], [('2026-10-29', 2)]), 'compiled in data/route/rad.json.gz and fra.json.gz', what='compiled')
        c.eq(sorted(os.listdir(data)), ['route'], 'nothing else is written in data/ (the workbooks are not copied: licence)', what='only route')
        ix = json.load(open(os.path.join(data, 'route', 'index.json'), encoding='utf-8'))
        c.eq((ix['rad'], ix['fra'], bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', ix['at']))), (['2026-10-29'], ['2026-10-29'], True), 'data/route/index.json lists the cycles present (the page reads it, not the .gz) and the time of the import', what='index')
        # a second cycle arrives: the first stays
        RF.write_xlsx(os.path.join(dl, 'RAD_2612_v1_0.xlsx'), [(n, rows if n != 'Cover' else [['RAD 2612 V1.0 (Rolling RAD Document)'], ['Valid From 26/11/2026']]) for n, rows in RF.rad_sheets()])
        plan = run()
        pick = [{'name': f['name'], 'size': f['size']} for f in plan['files'] if f['name'] == 'RAD_2612_v1_0.xlsx']
        res = run(dry=False, books=pick)
        c.eq(([b['start'] for b in I.load(os.path.join(data, 'route', 'rad.json.gz'))], res['rad']), (['2026-10-29', '2026-11-26'], ['2026-11-26']), 'a later cycle is added, the first stays (never purged)', what='second cycle')
        c.eq(json.load(open(os.path.join(data, 'route', 'index.json'), encoding='utf-8'))['rad'], ['2026-10-29', '2026-11-26'], 'the index follows: both cycles', what='index 2')
        c.ok(res['commit'] is None, str(res), 'without a data repository there is no commit (and no error)')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        DS = importlib.import_module('data_sync')
        data, fake = _d5_scene(td)
        os.makedirs(os.path.join(td, 'dl'))
        RF.write_xlsx(os.path.join(td, 'dl', 'RAD_2611_v1_0.xlsx'), RF.rad_sheets())
        ctx = {'data': str(data), 'secrets': td, 'git_cmd': DS.git_cmd, 'git_env': DS.git_env, 'downloads': lambda: [os.path.join(td, 'dl')]}
        size = os.path.getsize(os.path.join(td, 'dl', 'RAD_2611_v1_0.xlsx'))
        r = RJ.REGISTRY[('route', 'import-rad')][0](RJ.Job('route', 'import-rad', {}, author='TST'), {'dry': False, 'books': [{'name': 'RAD_2611_v1_0.xlsx', 'size': size}]}, ctx)
        c.eq((r['ok'], bool(re.fullmatch(r'[0-9a-f]{40}', r.get('commit') or ''))), (True, True), 'with a data repository: the books are committed (one commit)', what='commit')
        c.ok('route/rad.json.gz' in _d5_git(data, 'show', '--name-only', '--format=', '-1') and _d5_git(data, 'show', '-s', '--format=%an', '-1').strip() == 'TST', _d5_git(data, 'show', '--name-only', '--format=%an', '-1'), 'it holds route/index.json too, and route/rad.json.gz and is the page\'s author\'s')


@case('K103', 'Job route/compute (SOG-0081): the route of the README example (LFPO SITET KEPAD EIDW) on a small base, the mandatory passages kept, a RAD segment rule that makes the plan impossible, a closed request, a bounded answer', 'K', static=True,
      rule='SOG-0081: RouteSim 2\'s engine (tools/route_engine, copied without change of substance) behind the verb route/compute: a closed request, the plan { primary, alternatives… } on the base of the workstation and the compiled RAD; a mandatory point is never removed (a RAD rule on its segment makes the calculation impossible, said); no RAD imported: said; the answer is bounded')
def k103(c):
    import os
    import tempfile
    RJ = _regen()
    import route_fixture as RF
    from route_engine import import_books as I, plan as PL
    check, fn = RJ.REGISTRY[('route', 'compute')][1], RJ.REGISTRY[('route', 'compute')][0]
    req = {'dep': 'LFPO', 'arr': 'EIDW', 'route': 'LFPO SITET KEPAD EIDW', 'fl': 90, 'date': '2026-11-09T12:00', 'enable_fra': False}
    c.eq((check(req), check(dict(req, speed_kt=300.0, allow_levels=False, alternative_levels=[70, 50])) is not None), (req, True), 'the request is closed: the known fields with their types are accepted', what='accepted')
    bad = [dict(req, root='/etc'), dict(req, fl='90'), dict(req, fl=True), dict(req, mode='x'), dict(req, dep='LF PO'), dict(req, route='X' * 700), dict(req, via=['A'] * 9), dict(req, date='tomorrow'), dict(req, alternative_levels=list(range(13))), dict(req, enable_fra='yes'), None, 'LFPO', []]
    c.eq([i for i, b in enumerate(bad) if check(b) is not None], [], 'an unknown field, a wrong type, a bad code, a long route, too many points or levels, a bad date: refused (400)', what='refused')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = os.path.join(td, 'data')
        os.makedirs(data)
        RF.make_base(data)
        ctx = {'data': data, 'secrets': td}
        run = lambda r: fn(RJ.Job('route', 'compute', {}, author='TST'), r, ctx)
        r = run(req)
        c.eq((r['ok'], r['reason']), (False, 'no-rad'), 'no RAD imported on the workstation: said, with the way out (route/import-rad)', what='no rad')
        rad = os.path.join(td, 'RAD_2611_v1_0.xlsx')
        RF.write_xlsx(rad, RF.rad_sheets())
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
        r = run(req)
        p = r['plan']['primary']
        c.eq((r['ok'], p['ok'], p['route']), (True, True, 'LFPO DCT OLZOM A1 SITET A1 KEPAD A1 BOYNE DCT EIDW'), 'the calculation joins LFPO, SITET, KEPAD, EIDW by the airway and the two DCT, the mandatory points in order', what='route')
        c.eq(([(l['start']['id'], l['via'], l['end']['id']) for l in p['legs']], r['plan']['via'], r['rad']), ([('LFPO', 'DCT', 'OLZOM'), ('OLZOM', 'A1', 'SITET'), ('SITET', 'A1', 'KEPAD'), ('KEPAD', 'A1', 'BOYNE'), ('BOYNE', 'DCT', 'EIDW')], ['SITET', 'KEPAD'], {'title': 'RAD 2611 V1.0 (Rolling RAD Document)', 'start': '2026-10-29'}),
             'the segments with their airway, the mandatory passages, the RAD book the plan was checked against', what='legs')
        c.ok(p['distance_nm'] > 300 and p['legs'][0]['altitude_start_ft'] == 291 and 'issues' in p and isinstance(p['profile'], dict), str({k: p[k] for k in ('distance_nm', 'status')}), 'distance, vertical profile (from the departure\'s 291 ft) and the checks are there')
        # control mode: the entered route as is
        r2 = run(dict(req, mode='validate', route='LFPO DCT OLZOM A1 SITET A1 KEPAD A1 BOYNE DCT EIDW'))
        c.eq((r2['ok'], r2['plan']['primary']['distance_nm'] == p['distance_nm']), (True, True), 'the control of the calculated route gives the same distance', what='validate')
        # a RAD rule on the segment SITET -> KEPAD: the mandatory passage is not removed, the calculation is impossible, said
        RF.write_xlsx(rad, RF.rad_sheets(True))
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
        r3 = run(req)
        pp = r3['plan']['primary']
        c.eq((r3['plan']['coverage_gaps'], r3['plan']['rad_search_attempts'], sorted(k for k in r3['plan'] if k in ('recovery', 'coverage_gaps', 'rad_search_attempts'))), ([], [], ['coverage_gaps', 'rad_search_attempts', 'recovery']),
             'RouteSim of 9 Nov 16 h: the plan carries the gaps of coverage, the RAD retries and the fallback (recovery, null when not needed), bounded', what='plan keys')
        c.eq((r3['ok'], pp['ok'], pp['status'], pp['error'].startswith('Aucune route trouvée')), (True, False, 'CALCUL IMPOSSIBLE', True), 'a RAD rule that forbids A1 between SITET and KEPAD: the calculation is impossible (no route, no DCT invented: the imposed passage is not removed)', what='block')
        c.ok(r3['plan']['automatic_alternatives'] is True and isinstance(r3['plan']['alternative_failures'], list) and len(r3['plan']['alternatives']) <= 3, str(r3['plan']['alternative_message']), 'the alternatives are searched (three at most), their failures listed')
        # an unknown aerodrome and a bad level are said, never an exception
        r4 = run(dict(req, arr='ZZZZ'))
        c.eq((r4['ok'], r4['plan']['primary']['ok']), (True, False), 'an aerodrome that is not in the base: the plan says so (CALCUL IMPOSSIBLE)', what='unknown ad')
        r5 = run(dict(req, fl=5))
        c.eq((r5['ok'], r5['plan']['primary']['ok'], 'FL010' in r5['plan']['primary']['error']), (True, False, True), 'a level out of FL010-FL660: said', what='bad level')
    # the answer is bounded
    big = {'ok': True, 'status': 's', 'route': 'r' * 9000, 'legs': [{'a': i} for i in range(2000)], 'issues': [{'level': 'REVUE', 'text': 't'}] * 1000, 'rad': [{'id': i, 'headers': ['h'] * 5, 'values': ['v']} for i in range(500)], 'report': 'x' * 300000}
    b = PL.bound_result({'primary': big, 'alternatives': [dict(big)] * 5, 'alternative_failures': ['f' * 9000] * 60, 'alternative_attempts': [{'errors': ['e' * 9000] * 20}] * 60})
    pb = b['primary']
    c.eq((len(pb['legs']), len(pb['issues']), len(pb['rad']), pb['rad_count'], len(pb['report']), len(pb['route']), sorted(pb['truncated']), 'headers' in pb['rad'][0], len(b['alternatives'])), (800, 300, 100, 500, 120000, 4000, ['issues', 'legs', 'rad'], False, 3),
         'bounded: 800 segments, 300 checks, 100 RAD mentions (the total said, no repeated headers), the texts, three alternatives', what='bounded')
    c.eq((len(b['alternative_failures']), len(b['alternative_failures'][0]), len(b['alternative_attempts']), len(b['alternative_attempts'][0]['errors'])), (40, 4000, 40, 10), 'and the failures and the attempts', what='failures')


@case('K104', 'Airway direction (SOG-0078): the SIA (Rsu codeDir), AIXM 5.1 (RouteAvailability direction) and X-Plane (earth_awy sens) readers give `dir`, one-way segments are not both ways', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0078 (10 Nov 2026): « il semble que les AWY à sens unique ne soient pas cartographiées dans aerodb ? » -- the sources DO say it (SIA AIXM 4.5: the usages Rsu of a segment, codeDir F or B, a two-way segment having both; NATS / ENAIRE AIXM 5.1: RouteAvailability direction FORWARD, BACKWARD or BOTH; X-Plane: N, F, B) but no reader kept it; `dir` is now F (start to end), B (end to start), FB (both), absent when the source is silent')
def k104(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.wait_for_function('!!window.AeroSources', timeout=30000)
    c.page.add_script_tag(url=f'{c.base}/shared/carto/aero_symbols.js')
    c.page.wait_for_function('!!window.SiaAero && !!window.SiaAero.parseAixm', timeout=30000)
    r = c.js("""() => {
      const rsg = (mid, route, a, b) => `<Rsg><RsgUid mid="${mid}"><RteUid mid="1"><txtDesig>${route}</txtDesig></RteUid><DpnUidSta mid="2"><codeId>${a}</codeId><geoLat>480000.00N</geoLat><geoLong>0030000.00E</geoLong></DpnUidSta>
        <DpnUidEnd mid="3"><codeId>${b}</codeId><geoLat>490000.00N</geoLat><geoLong>0040000.00E</geoLong></DpnUidEnd></RsgUid><codeType>RNAV</codeType><valDistVerUpper>115</valDistVerUpper><uomDistVerUpper>FL</uomDistVerUpper><valDistVerLower>065</valDistVerLower><uomDistVerLower>FL</uomDistVerLower><valLen>33.8</valLen></Rsg>`;
      const rsu = (mid, avbl, dir) => `<Rsu><RsuUid mid="9${mid}"><RsgUid mid="${mid}"><RteUid mid="1"><txtDesig>X</txtDesig></RteUid></RsgUid><codeRteAvbl>${avbl}</codeRteAvbl><noSeq>10</noSeq><codeDir>${dir}</codeDir></RsuUid></Rsu>`;
      const sia = '<AIXM-Snapshot>' + [rsg(101, 'L1', 'AAA', 'BBB'), rsg(102, 'L2', 'CCC', 'DDD'), rsg(103, 'L3', 'EEE', 'FFF'), rsg(104, 'L4', 'GGG', 'HHH'), rsg(105, 'L5', 'III', 'JJJ'), rsg(106, 'L6', 'KKK', 'LLL')].join('')
        + rsu(101, 'NONFUA', 'F') + rsu(102, 'NONFUA', 'B') + rsu(103, 'NONFUA', 'F') + rsu(103, 'NONFUA', 'B') + rsu(104, 'CDR1', 'F') + rsu(106, 'CDR1', 'B') + rsu(106, 'NONFUA', 'F') + '</AIXM-Snapshot>';
      const out = { sia: Object.fromEntries(window.SiaAero.parseAixm(sia).airways.map(w => [w.route, w.dir === undefined ? null : w.dir])) };
      const seg = (id, a, b, av) => `<aixm:RouteSegment><aixm:timeSlice><aixm:RouteSegmentTimeSlice><aixm:routeFormed xlink:href="urn:uuid:R${id}"/>
        <aixm:start><aixm:EnRouteSegmentPoint><aixm:pointChoice_fixDesignatedPoint xlink:href="urn:uuid:${a}"/></aixm:EnRouteSegmentPoint></aixm:start>
        <aixm:end><aixm:EnRouteSegmentPoint><aixm:pointChoice_fixDesignatedPoint xlink:href="urn:uuid:${b}"/></aixm:EnRouteSegmentPoint></aixm:end>
        ${av.map(([d, s]) => `<aixm:availability><aixm:RouteAvailability><aixm:direction>${d}</aixm:direction><aixm:status>${s}</aixm:status></aixm:RouteAvailability></aixm:availability>`).join('')}
        </aixm:RouteSegmentTimeSlice></aixm:timeSlice></aixm:RouteSegment>`;
      const dp = (id, lat, lon) => `<aixm:DesignatedPoint gml:id="uuid.${id}"><gml:identifier>${id}</gml:identifier><aixm:timeSlice><aixm:DesignatedPointTimeSlice><aixm:designator>${id}</aixm:designator><aixm:type>ICAO</aixm:type><aixm:location><aixm:Point><gml:pos>${lat} ${lon}</gml:pos></aixm:Point></aixm:location></aixm:DesignatedPointTimeSlice></aixm:timeSlice></aixm:DesignatedPoint>`;
      const rt = n => `<aixm:Route gml:id="uuid.R${n}"><gml:identifier>R${n}</gml:identifier><aixm:timeSlice><aixm:RouteTimeSlice><aixm:designatorSecondLetter>N</aixm:designatorSecondLetter><aixm:designatorNumber>${n}</aixm:designatorNumber></aixm:RouteTimeSlice></aixm:timeSlice></aixm:Route>`;
      const x5 = '<aixm:AIXMBasicMessage xmlns:aixm="http://www.aixm.aero/schema/5.1" xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:xlink="http://www.w3.org/1999/xlink">'
        + [dp('P1', 50, 1), dp('P2', 51, 2), dp('P3', 52, 3)].join('') + [rt(1), rt(2), rt(3), rt(4), rt(5)].join('')
        + seg(1, 'P1', 'P2', [['FORWARD', 'OPEN']]) + seg(2, 'P1', 'P2', [['BACKWARD', 'OPEN']]) + seg(3, 'P2', 'P3', [['FORWARD', 'OPEN'], ['BACKWARD', 'COND']]) + seg(4, 'P2', 'P3', [['BOTH', 'OPEN']]) + seg(5, 'P1', 'P3', [['FORWARD', 'CLOSED']])
        + '</aixm:AIXMBasicMessage>';
      out.aixm5 = window.AeroSources.aixm5(x5).aero.airways.map(w => [w.route, w.dir === undefined ? null : w.dir]);
      const xp = ['I', '1100 Version', 'ABC LF 11 DEF LF 11 N 2 100 300 L1', 'ABC LF 11 DEF LF 11 F 2 100 300 L2', 'ABC LF 11 DEF LF 11 B 2 100 300 L3'].join('\\n');
      const nav = { aero: { points: [{ id: 'ABC', lat: 48, lon: 2 }, { id: 'DEF', lat: 49, lon: 3 }], navaids: [] } };
      const part = window.AeroSources.xplane('earth_awy.dat', xp);
      out.xplane = part.aero.airways.map(w => [w.route, w.dir === undefined ? null : w.dir]);
      out.resolved = window.AeroSources.resolveAirways(part.aero.airways, nav.aero.points, nav.aero.navaids).map(w => [w.route, w.dir === undefined ? null : w.dir]);
      return out;
    }""")
    c.eq(r['sia'], {'L1': 'F', 'L2': 'B', 'L3': 'FB', 'L4': 'F', 'L5': None, 'L6': 'F'},
         'SIA: a segment with one usage F is one-way forward (L1), one usage B backward (L2), both usages two-way (L3); a conditional (CDR) usage counts only when there is no permanent one (L4: F; L6: the permanent F wins over the conditional B); no usage: unknown (L5)', what='sia')
    c.eq(r['aixm5'], [['N1', 'F'], ['N2', 'B'], ['N3', 'FB'], ['N4', 'FB'], ['N5', None]],
         'AIXM 5.1: FORWARD is F, BACKWARD is B, FORWARD and BACKWARD or BOTH is FB; a closed availability counts for nothing (N5: unknown)', what='aixm5')
    c.eq((r['xplane'], r['resolved']), ([['L1', 'FB'], ['L2', 'F'], ['L3', 'B']], [['L1', 'FB'], ['L2', 'F'], ['L3', 'B']]), 'X-Plane: N is two-way, F start to end, B the other way; kept when the ends are resolved on the points', what='xplane')


@case('K105', 'The route engine honours the direction of the airways (SOG-0078): a one-way segment is not flown against its direction, said; both ways stays when the source says so or is silent', 'K', static=True,
      rule='SOG-0078: the files of airways carry `dir` (F: start to end, B: end to start, FB: both, absent: the source does not say); the engine no longer assumes both ways for a segment that says one way: the calculation does not use it against its direction, the control of a route that does says « Sens interdit »; the leg says its direction (sens unique, double sens, inconnue)')
def k105(c):
    import os
    import tempfile
    _regen()
    import route_fixture as RF
    from route_engine import import_books as I, plan as PL

    def run(direction, **req):
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            data = os.path.join(td, 'data')
            os.makedirs(data)
            RF.make_base(data, direction)
            rad = os.path.join(td, 'RAD_2611_v1_0.xlsx')
            RF.write_xlsx(rad, RF.rad_sheets())
            I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
            return PL.compute(dict({'dep': 'LFPO', 'arr': 'EIDW', 'fl': 90, 'date': '2026-11-09T12:00', 'enable_fra': False}, **req), data, os.path.join(data, 'route', 'rad.json.gz'), None)['primary']
    fwd = 'LFPO DCT OLZOM A1 SITET A1 KEPAD A1 BOYNE DCT EIDW'
    back = 'EIDW DCT BOYNE A1 KEPAD A1 SITET A1 OLZOM DCT LFPO'
    p = run('F', route='LFPO SITET KEPAD EIDW')
    c.eq((p['ok'], p['route'], {l['direction'] for l in p['legs'] if l['via'] == 'A1'}), (True, fwd, {'sens unique'}), 'one-way forward (OLZOM to BOYNE): LFPO to EIDW is flown with it, the legs say « sens unique »', what='forward ok')
    p = run('F', dep='EIDW', arr='LFPO', route='EIDW KEPAD SITET LFPO')
    c.eq((p['ok'], p['status']), (False, 'CALCUL IMPOSSIBLE'), 'EIDW to LFPO through the same one-way airway: no route (the imposed passages are not removed)', what='forward reverse')
    p = run('F', dep='EIDW', arr='LFPO', mode='validate', route=back)
    c.eq((p['ok'], [i['text'] for i in p['issues'] if i['level'] == 'ERREUR'][:1]), (True, ['Sens interdit : A1 est à sens unique et BOYNE → KEPAD le parcourt à contre-sens.']), 'the control of the reversed route says it: « Sens interdit », which segment', what='sens interdit')
    p = run('B', dep='EIDW', arr='LFPO', route='EIDW KEPAD SITET LFPO')
    c.eq((p['ok'], p['route']), (True, back), 'one-way backward (BOYNE to OLZOM): EIDW to LFPO is flown with it', what='backward ok')
    p = run('B', route='LFPO SITET KEPAD EIDW')
    c.eq((p['ok'], p['status']), (False, 'CALCUL IMPOSSIBLE'), 'and LFPO to EIDW is not', what='backward reverse')
    for direction, text in (('FB', 'double sens'), (None, 'inconnue')):
        a, b = run(direction, route='LFPO SITET KEPAD EIDW'), run(direction, dep='EIDW', arr='LFPO', route='EIDW KEPAD SITET LFPO')
        c.eq((a['ok'], b['ok'], {l['direction'] for l in a['legs'] if l['via'] == 'A1'}), (True, True, {text}), f'{direction or "no dir"}: both ways flown, the legs say « {text} »', what=f'both {direction}')


@case('K106', 'Job route/compute in the form of the Fuel screen (SOG-0081): action compute / check, adep / adest / rwyDep / rwyArr, alternatives, segments with their reasons by kind, issues error / review', 'K', static=True,
      rule='Features SOG (10 Nov 2026): the screen of Carburant asks route/compute with { action: compute | check, adep, adest, fl, rwyDep?, rwyArr?, date?, via | route } and reads { ok, alternatives [{ id, name, route, distanceNm, fl, profile, sid, star, faults, segments }], segments [{ from, to, via, state, reasons [{ kind, text, ruleId?, deltaFt? }] }], issues [{ level, text }] }; the engine\'s own form (plan) stays for the other callers')
def k106(c):
    import os
    import tempfile
    RJ = _regen()
    import route_fixture as RF
    from route_engine import import_books as I, view as V
    check, fn = RJ.REGISTRY[('route', 'compute')][1], RJ.REGISTRY[('route', 'compute')][0]
    base = {'action': 'compute', 'adep': 'LFPO', 'adest': 'EIDW', 'fl': 90, 'date': '2026-11-09T12:00', 'via': ['SITET', 'KEPAD'], 'enable_fra': False}
    chk = {'action': 'check', 'adep': 'LFPO', 'adest': 'EIDW', 'fl': 90, 'date': '2026-11-09T12:00', 'route': 'LFPO DCT OLZOM A1 SITET A1 KEPAD A1 BOYNE DCT EIDW', 'enable_fra': False}
    c.eq((check(base) == base, check(chk) == chk, check(dict(base, rwyDep='24', rwyArr='16')) is not None), (True, True, True), 'the screen\'s arguments are accepted as they are', what='accepted')
    bad = [dict(base, action='x'), dict(base, route='LFPO X EIDW'), dict(chk, route=''), dict(chk, route=7), dict(base, adep='LF PO'), dict(base, dep='LFPO'), dict(base, root='/'), dict(base, fl='90'), dict(base, via=['A'] * 9), dict(base, rwyDep='24 24 24')]
    c.eq([i for i, b in enumerate(bad) if check(b) is not None], [], 'an unknown action, compute with a route, check without one, a second vocabulary mixed in, a bad code, too many points: refused (400)', what='refused')
    c.eq(V.to_request(base)['via'], ['SITET', 'KEPAD'], 'compute: the typed points are the imposed passages, in order', what='via')
    nofl = {k: v for k, v in base.items() if k != 'fl'}
    c.eq((check(nofl) == nofl, check(dict(base, fl=None)) is not None, V.to_request(nofl)['fl'], V.to_request(dict(base, fl=None))['fl'], V.to_request(base)['fl']), (True, True, 180, 180, 90), 'fl absent or null: accepted, the default level of the engine (180) is made explicit', what='fl absent')
    r = V.to_request(dict(chk, rwyDep='24', rwyArr='16'))
    c.eq((r['mode'], r['route'], r['dep_runway'], r['arr_runway'], r['use_procedures']), ('validate', chk['route'], '24', '16', True), 'check: the route as typed, the runways, the procedures on', what='check request')
    c.eq([V.reason_of(t)['kind'] for t in ('Interdiction RAD LF9003', 'Profil minimum 8000 ft sous le plancher 9000 ft (écart 1000 ft).', 'Profil maximum 21424 ft au-dessus du plafond 8500 ft (écart 12924 ft).', 'LFPO : altitude prévue 5000 ft sous la contrainte procédure 6000 ft minimum.', 'Liaison FRA sans entrée', 'Sens interdit : A1 est à sens unique', 'Continuité absente dans AeroDB')],
         ['RAD', 'floor', 'ceiling', 'altitude', 'FRA', 'direction', 'continuity'], 'the kind of a reason is read from the engine\'s text (RAD with its rule id, floor and ceiling with their gap in feet, altitude by default)', what='kinds')
    c.eq((V.reason_of('Interdiction RAD LF9003')['ruleId'], V.reason_of('Profil maximum 21424 ft au-dessus du plafond 8500 ft (écart 12924 ft).')['deltaFt']), ('LF9003', 12924), 'the rule id and the gap', what='ids')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = os.path.join(td, 'data')
        os.makedirs(data)
        RF.make_base(data)
        rad = os.path.join(td, 'RAD_2611_v1_0.xlsx')
        RF.write_xlsx(rad, RF.rad_sheets(True))
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
        ctx = {'data': data, 'secrets': td}
        run = lambda a: fn(RJ.Job('route', 'compute', {}, author='TST'), a, ctx)
        r = run(chk)                                    # the typed route runs through SITET to KEPAD, which a RAD rule forbids
        a = r['alternatives'][0]
        c.eq((r['ok'], len(r['alternatives']), a['route'], a['name'], a['fl'], a['sid'], a['star']), (True, 1, chk['route'], 'Via A1', 90, None, None), 'check: ONE alternative, the typed route, short name « Via A1 », no procedure in this base', what='check alt')
        bad_seg = [s for s in r['segments'] if s['state'] == 'error']
        c.eq(([(s['from'], s['to'], s['via']) for s in bad_seg], bad_seg[0]['reasons'][0]['kind'], bad_seg[0]['reasons'][0]['ruleId'], a['faults'], r['segments'] == a['segments']), ([('SITET', 'KEPAD', 'A1')], 'RAD', 'LF9003', 1, True),
             'the segment SITET-KEPAD is the one in error, reason RAD with its rule id; faults = 1; the top-level segments are the alternative\'s', what='segments')
        c.ok(any(i['level'] == 'error' and 'LF9003' in i['text'] for i in r['issues']) and r['rad']['start'] == '2026-10-29', str(r['issues'][:2]), 'issues: level error with the RAD rule; the RAD book is named')
        c.eq([s['state'] for s in r['segments'] if (s['from'], s['to']) != ('SITET', 'KEPAD')], ['ok'] * 4, 'the other segments are ok', what='ok segments')
        rad2 = os.path.join(td, 'RAD_2612_v1_0.xlsx')           # the same book without the forbidden segment: the route can be calculated
        RF.write_xlsx(rad2, RF.rad_sheets())
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad2)[1]]))
        r = run(dict(base, via=['OLZOM']))
        c.eq((r['ok'], len(r['alternatives']), r['alternatives'][0]['route'], r['alternatives'][0]['faults'], r['alternatives'][0]['profile'][0]), (True, 1, 'LFPO DCT OLZOM A1 BOYNE DCT EIDW', 0, {'nm': 0.0, 'ft': 291}), 'compute: the calculated route, no fault, the profile starts at the departure\'s elevation', what='compute')
        r = run(dict(base, raw=True, via=['OLZOM']))
        c.ok('plan' in r and r['plan']['primary']['route'] == 'LFPO DCT OLZOM A1 BOYNE DCT EIDW', '', 'the engine\'s own plan is given only on request (raw: true)')
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
        r = run(base)                                   # SITET to KEPAD forbidden by the RAD: no plan, the imposed passages are not removed
        c.eq((r['ok'], r['alternatives'], [i['level'] for i in r['issues']][:1], r['issues'][0]['text'].startswith('Aucune route trouvée')), (True, [], ['error'], True), 'compute with a RAD rule on an imposed passage: no alternative, one error that says the passage was not removed', what='impossible')
    c.eq(len(V.thin([{'distance_nm': i, 'altitude_ft': i} for i in range(1000)])) <= 201, True, 'the profile is thinned to about 200 points', what='thin')


@case('K108', 'Job pelican/import (SOG-0083): the positions file of Downloads is read with a reduced YAML grammar, checked as an untrusted file, compiled into data/pelicandromes/fr.json; plan then take, a changed file refused', 'K', static=True,
      rule='SOG-0083 (10 Nov 2026): pelicandromes_positions*.yaml (schema pelicandromes v1, WGS84, 32 sites: nom, oaci, categorie, latitude, longitude, statut, source) is imported from Downloads by pattern, never a path, into data/pelicandromes/<country>.json: numbers bounded, texts cleaned (no control character, no < or >), a country field for the next ones, nothing timestamped, one commit; the file is the user file, so untrusted like everything in data/')
def k108(c):
    import json
    import os
    import tempfile
    RJ = _regen()
    from regen import pelican as PE
    fn, check = RJ.REGISTRY[('pelican', 'import')]
    head = 'schema: pelicandromes\nschema_version: 1\ndatum: WGS84\nnote: Position de chargement uniquement si vérifiée.\nsites:\n'
    rec = lambda nom, oaci, cat, lat, lon: f'  - nom: {nom}\n    oaci: {oaci}\n    categorie: {cat}\n    latitude: {lat}\n    longitude: {lon}\n    statut: valide\n    source: Position vérifiée manuellement sur OSM\n'
    good = head + rec('Nîmes-Garons', 'LFTW', 'principal', 43.7497269, 4.4135054) + rec('Le Luc–Le Cannet', 'LFMC', 'principal', 43.3888609, 6.3814935) + rec('Site à confirmer', '', 'à confirmer', 44.1, 5.2)
    c.eq((check({}), check({'dry': False, 'file': {'name': 'pelicandromes_positions.yaml', 'size': 5}}) is not None, check({'path': '/x'}), check({'country': 'FRA'}), check({'file': {'name': '../x.yaml', 'size': 1}}), check({'file': {'name': 'a.yaml'}})),
         ({'dry': True, 'country': 'fr'}, True, None, None, None, None), 'the closed request: dry by default, a 2-letter country, the file shown (name, size), nothing else, no path', what='check')
    doc = PE.parse(good)
    c.eq((doc['schema'], doc['schema_version'], len(doc['sites']), doc['sites'][0]['latitude'], doc['sites'][2]['oaci']), ('pelicandromes', 1, 3, 43.7497269, None), 'the reduced grammar reads the scalars, the numbers and the empty value of a list of flat records', what='parse')
    hostile = {
        'anchor': head + '  - nom: &a X\n', 'flow': head + '  - nom: [1, 2]\n', 'block': head + '  - nom: |\n', 'tag': head + '  - nom: !!str X\n', 'tab': head + '\t- nom: X\n', 'nested': head + '  - nom:\n      sub: 1\n',
        'dup': head + '  - nom: X\n    nom: Y\n', 'orphan': head + '    nom: X\n', 'text-sites': 'schema: pelicandromes\nsites: x\n'}
    refused = {k: None for k in hostile}
    for k, t in hostile.items():
        try:
            PE.parse(t)
        except PE.Refused as e:
            refused[k] = str(e)[:40]
    c.eq([k for k, v in refused.items() if v is None], [], 'anchors, tags, flow collections, block scalars, tabs, nesting, duplicate keys, a record without a dash: refused with the line', what='refused grammar')
    meta = {'name': 'f.yaml', 'size': 1, 'sha256': '0' * 64}
    bad = [('schema: other\n' + good[good.index('schema_version'):], 'schema'), (good.replace('schema_version: 1', 'schema_version: 2'), 'version'), (good.replace('WGS84', 'NAD27'), 'datum'), (head, 'no site'),
           (head + rec('X', 'LF', 'a', 91, 4), 'no site')]
    out = []
    for t, why in bad:
        try:
            PE.compile_file(t, meta, 'fr')
            out.append(why)
        except PE.Refused:
            pass
    c.eq(out, [], 'another schema, another version, another datum, no site, only out-of-range sites: the file is refused', what='refused file')
    d, rej = PE.compile_file(head + rec('Bon', 'LFTW', 'principal', 43.1, 4.1) + rec('<script>alert(1)</script>', 'lftw', 'x', 43.2, 4.2) + rec('Trop haut', 'LFMS', 'principal', 99, 4) + rec('OACI faux', 'L F', 'principal', 43, 4)
                             + '  - nom: Sans latitude\n    longitude: 4\n' + '  - nom: Booléen\n    latitude: true\n    longitude: 4\n' + rec('Rare', 'LFMS', 'principal', 'NaN', 4), meta, 'fr')
    c.eq(([s['name'] for s in d['sites']], d['sites'][1]['icao'], [r['index'] for r in rej]), (['Bon', 'scriptalert(1)/script'], 'LFTW', [2, 3, 4, 5, 6]), 'a site out of range, with a bad code, without or with a non-numeric position is rejected with its index; the markup characters are removed, the code upper-cased', what='sites')
    c.eq((d['country'], d['sites'][0]['country'], d['datum'], d['source']), ('fr', 'fr', 'WGS84', meta), 'the country is carried by the file and by each site (the next countries), the source file by its name, size and hash', what='fields')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        dl, data = os.path.join(td, 'Downloads'), os.path.join(td, 'data')
        os.makedirs(dl)
        os.makedirs(data)
        ctx = {'data': data, 'downloads': lambda: [dl]}
        run = lambda **a: fn(RJ.Job('pelican', 'import', {}, author='TST'), check(a), ctx)
        r = run()
        c.eq((r['ok'], r['reason']), (False, 'no-file'), 'nothing in Downloads: said (no-file), with the pattern', what='no file')
        open(os.path.join(dl, 'pelicandromes_positions.yaml.pdf'), 'w').write('x')
        open(os.path.join(dl, 'pelicandromes_positions.yaml'), 'w', encoding='utf-8', newline='').write(good)
        r = run()
        c.eq((r['ok'], r['dry'], r['sites'], r['categories'], r['written'], os.path.exists(os.path.join(data, 'pelicandromes'))), (True, True, 3, {'principal': 2, 'à confirmer': 1}, False, False), 'the plan: the file by the pattern (not the .pdf), the sites and the categories counted, nothing written', what='plan')
        r2 = run(dry=False)
        c.eq((r2['ok'], r2['reason']), (False, 'not-shown'), 'a take without the file the plan showed: refused', what='not shown')
        f = {'name': r['file']['name'], 'size': r['file']['size']}
        r3 = run(dry=False, file=f)
        out = os.path.join(data, 'pelicandromes', 'fr.json')
        got = json.load(open(out, encoding='utf-8'))
        c.eq((r3['ok'], r3['written'], got['schema'], got['version'], len(got['sites']), got['sites'][1]['name'], 'imported' in got), (True, True, 'pelicandromes', 1, 3, 'Le Luc–Le Cannet', False), 'the take writes data/pelicandromes/fr.json (accents kept, nothing timestamped)', what='take')
        r4 = run(dry=False, file=f)
        c.eq((r4['ok'], r4['written'], r4['commit']), (True, False, None), 'the same file again: nothing written, no commit', what='again')
        open(os.path.join(dl, 'pelicandromes_positions.yaml'), 'w', encoding='utf-8', newline='').write(good + rec('Autre', 'LFMA', 'principal', 43.5, 5.3))
        r5 = run(dry=False, file=f)
        c.eq((r5['ok'], r5['reason']), (False, 'changed'), 'the file is no longer the one the plan showed: refused, the plan is to be made again', what='changed')
        open(os.path.join(dl, 'pelicandromes_positions.yaml'), 'w', encoding='utf-8', newline='').write('x' * 300000)
        r6 = run()
        c.eq((r6['ok'], r6['reason']), (False, 'invalid'), 'a file over the size limit is refused before it is read', what='too large')
        open(os.path.join(dl, 'pelicandromes_positions.yaml'), 'wb').write(b'\xff\xfe\x00 not text')
        r7 = run()
        c.eq((r7['ok'], r7['reason']), (False, 'invalid'), 'not UTF-8: refused', what='binary')


@case('K110', 'fetchProcedures reads the ground layer after the procedures (SOG-0135): one gesture, in the background, only when the file is missing or older than the cycle in force, a failure changes nothing', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0135 (10 Nov 2026): « on ne va pas créer un bouton en plus : si on décolle ou qu\'on se pose, on va devoir rouler » -- when the launcher reads or updates the procedures of an aerodrome (AeroDb.fetchProcedures) the ground is read after them (same OpenStreetMap reading, ~30 s) if its file is missing or older than the cycle in force; without blocking the procedures\' answer, and never changing it')
def k110(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-10T12:00:00Z'), calls = [];
      const mk = (files, launcher) => AeroDB.create({ reader: { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} }, lnmperf: false, launcher, now: () => day });
      const ground = cycle => ({ icao: 'LFPO', cycle, source: 'osm', attribution: 'x', items: [{ id: 'w1', kind: 'twy', name: 'A', line: [[2.36, 48.73], [2.37, 48.74]] }] });
      let release = null, procAnswer = { status: 200, result: { ok: true, warnings: [], commit: 'p1', stats: {} } }, groundAnswer = { status: 200, result: { ok: true, icao: 'LFPO', items: { twy: 1, park: 0, hold: 0 }, bytes: 9, warnings: [], commit: 'g1' } };
      const fake = () => ({ info: () => ({ data: true, lan: false }), request: async () => null, job: async (route, body) => {
        calls.push(body.set + '/' + body.verb);
        if (body.set === 'ground') { await new Promise(r => { release = r; }); return groundAnswer; }
        return procAnswer;
      } });
      const settle = () => new Promise(r => setTimeout(r, 30));
      const out = {};
      // missing file: the procedures answer comes back while the ground read is still going on
      calls.length = 0;
      let db = mk({}, fake()), changes = [];
      db.on('change', e => { if (e.ground) changes.push(e.ground); });
      let res = await db.fetchProcedures('LFPO');
      await settle();
      out.missing = { ok: res.ok, calls: calls.slice(), groundPending: typeof release === 'function' };
      release(); release = null; await settle();
      out.missing.changes = changes.slice();
      // a file of the cycle in force (read on 5 Nov, the cycle starts on 29 Oct): not read again
      calls.length = 0;
      db = mk({ 'proc/ground/LFPO.json': ground('2026-11-05') }, fake());
      await db.fetchProcedures('LFPO'); await settle();
      out.fresh = calls.slice();
      // a file of the cycle before: read again
      calls.length = 0;
      db = mk({ 'proc/ground/LFPO.json': ground('2026-10-01') }, fake());
      await db.fetchProcedures('LFPO'); await settle();
      out.old = calls.slice(); release?.(); release = null; await settle();
      // the procedures failed: no ground; the option ground:false: no ground
      calls.length = 0;
      procAnswer = { status: 200, result: { ok: false, reason: 'failed', message: 'x' } };
      db = mk({}, fake());
      const failed = await db.fetchProcedures('LFPO'); await settle();
      procAnswer = { status: 200, result: { ok: true, warnings: [], commit: 'p2', stats: {} } };
      const off = await mk({}, fake()).fetchProcedures('LFPO', { ground: false }); await settle();
      out.none = { calls: calls.slice(), failed: failed.ok, off: off.ok };
      // the ground read fails (nothing in OpenStreetMap): the procedures answer is the same, no error thrown
      calls.length = 0; groundAnswer = { status: 200, result: { ok: false, reason: 'no-data' } };
      db = mk({}, fake());
      res = await db.fetchProcedures('LFPO'); await settle(); release?.(); release = null; await settle();
      out.nodata = { ok: res.ok, source: res.source, commit: res.commit, calls: calls.slice() };
      return out;
    }""")
    c.eq((r['missing']['ok'], r['missing']['calls'], r['missing']['groundPending'], r['missing']['changes']), (True, ['proc/eaip-fetch', 'ground/fetch'], True, ['LFPO']),
         'no ground file: the ground is read right after the procedures, while its job still runs the procedures answer is already there; the change is announced when it ends', what='missing')
    c.eq((r['fresh'], r['old']), (['proc/eaip-fetch'], ['proc/eaip-fetch', 'ground/fetch']), 'a ground file of the cycle in force is not read again; one of the cycle before is', what='fresh old')
    c.eq((r['none']['calls'], r['none']['failed'], r['none']['off']), (['proc/eaip-fetch', 'proc/eaip-fetch'], False, True), 'the procedures failed: no ground read; the option ground: false: none either', what='none')
    c.eq((r['nodata']['ok'], r['nodata']['source'], r['nodata']['commit'], r['nodata']['calls']), (True, 'eaip', 'p2', ['proc/eaip-fetch', 'ground/fetch']), 'a ground read that finds nothing changes nothing to the procedures answer', what='nodata')


@case('K111', 'Job weather/world (SOG-0138): the world forecast tool is run by the launcher, its output checked, put in place at once in data/local/weather/world/, the old one kept when it fails; status without network', 'K', static=True,
      rule='SOG-0138 (10 Nov 2026): the Atmosphere world map reads pages published by tools/build_world_weather.py but no launcher job ran it, nothing was published on the workstation; the job runs it, checks what it wrote (schema 1 index, known file names, bounded size and count), replaces the publication in one move, never commits it (data/local/), reuses the previous publication (--keep) and says its run, its steps and its size')
def k111(c):
    import json
    import os
    import tempfile
    RJ = _regen()
    fn, check = RJ.REGISTRY[('weather', 'world')]
    c.eq((check({}), check({'action': 'status'}), check({'action': 'x'}), check({'url': 'http://x'}), check(None)), ({'action': 'build'}, {'action': 'status'}, None, None, None), 'the closed request: build (default) or status, nothing else (no address, no path)', what='check')
    fake = (
        'import json, os, sys\n'
        'out = sys.argv[1]\n'
        'here = os.path.dirname(os.path.abspath(__file__))\n'
        'mode = open(os.path.join(here, "mode.txt")).read().strip()\n'
        'keep = sys.argv[sys.argv.index("--keep") + 1] if "--keep" in sys.argv else ""\n'
        'open(os.path.join(here, "args.txt"), "w").write(keep)\n'
        'if mode == "none":\n'
        '    print("aucun synoptique monde \\u00e9crit", file=sys.stderr); sys.exit(0)\n'
        'if mode == "crash":\n'
        '    sys.exit(3)\n'
        'os.makedirs(out)\n'
        't = [1_800_000_000 + 10800 * k for k in range(3)]\n'
        'names = ["2027-01-15T%02d.json" % (8 + 3 * k) for k in range(3)]\n'
        'for n in names + [x.replace(".json", "-alt.json") for x in names]:\n'
        '    open(os.path.join(out, n), "w").write("{}")\n'
        'idx = {"schema": 1, "model": "gfs", "run": 1_799_990_000, "built": 1_700_000_000, "step": 5, "times": t, "files": names, "altFiles": [x.replace(".json", "-alt.json") for x in names]}\n'
        'if mode == "badindex": idx["schema"] = 2\n'
        'json.dump(idx, open(os.path.join(out, "index.json"), "w"))\n'
        'if mode == "stray": open(os.path.join(out, "evil.html"), "w").write("<script>")\n'
        'if mode == "missing": os.remove(os.path.join(out, names[0]))\n'
        'print("synoptique monde : 2376 lieux, 3 \\u00e9ch\\u00e9ances")\n')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = os.path.join(td, 'data')
        os.makedirs(data)
        script = os.path.join(td, 'fake_world.py')
        open(script, 'w', encoding='utf-8').write(fake)
        ctx = {'data': data, 'script': script}
        dest = os.path.join(data, 'local', 'weather', 'world')
        run = lambda mode='ok', **a: (open(os.path.join(td, 'mode.txt'), 'w').write(mode), fn(RJ.Job('weather', 'world', {}), check(a), ctx))[1]
        r = run(action='status')
        c.eq((r['ok'], r['exists']), (True, False), 'status without a publication: it does not exist, no network call', what='status none')
        r = run('none')
        c.eq((r['ok'], r['reason'], os.path.exists(dest)), (False, 'no-run', False), 'the tool wrote nothing (NOAA unreachable, no run): no-run, nothing in place', what='no run')
        r = run('crash')
        c.eq((r['ok'], r['reason']), (False, 'failed'), 'the tool exits with an error: failed', what='crash')
        for mode in ('badindex', 'stray', 'missing'):
            r = run(mode)
            c.eq((r['ok'], r['reason'], os.path.exists(dest)), (False, 'invalid', False), f'{mode}: a folder that is not a valid world forecast is never put in place', what=mode)
        r = run('ok')
        c.eq((r['ok'], r['exists'], r['steps'], r['files'], r['step'], r['run'], r['times'], os.path.exists(os.path.join(dest, 'index.json'))), (True, True, 3, 7, 5, '2027-01-15T05:13:20Z', ['2027-01-15T08:00:00Z', '2027-01-15T14:00:00Z'], True),
             'a valid output is put in place in data/local/weather/world/: the run, the steps, the files and their size said', what='ok')
        c.eq(open(os.path.join(td, 'args.txt')).read(), '', 'the first build has no previous publication: no --keep', what='no keep')
        c.eq(sorted(os.listdir(os.path.join(data, 'local', 'weather'))), ['world'], 'nothing else is left next to the publication (no work folder, no old one)', what='clean')
        r = run('ok')
        keep = open(os.path.join(td, 'args.txt')).read()
        c.eq((r['ok'], keep.startswith('file:///'), keep.endswith('/local/weather/world/')), (True, True, True), 'a second build replaces it and gives the previous publication to the tool (--keep, a file address: the same GFS run is not asked of the NOAA again)', what='keep')
        r = run('none')
        c.eq((r['ok'], r['reason'], os.path.isfile(os.path.join(dest, 'index.json'))), (False, 'no-run', True), 'when the tool finds nothing the previous publication stays', what='old stays')
        r = run('stray')
        c.eq((r['reason'], os.path.isfile(os.path.join(dest, 'index.json'))), ('invalid', True), 'an invalid output does not replace the previous publication either', what='old stays 2')
        r = run(action='status')
        c.eq((r['exists'], r['steps'], r['age'] is not None and r['age'] > 0), (True, 3, True), 'status reads the publication in place: steps and age', what='status')


@case('K112', 'Country packs and thematic filters (SOG-0065, § 10.42): packs.json from Natural Earth and hand lists, a pack is a list of zones (many-to-many), a theme is a filter that adds nothing; AeroDb.packs() gives them cleaned', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0065 (V3 § 10.42, 9 Nov 2026): « regrouper les pays en packages » -- regions from Natural Earth SUBREGION (+ hand lists: Mediterranean, Australia and Indonesia, Arctic, Antarctica empty with its reason), and themes (islands, Himalaya, deserts and steppes, forests and jungles, lakes and rivers, megacities) computed offline by crossing public objects with the zone outlines; a pack is not a zone, a theme shows which zones to add and adds none')
def k112(c):
    import importlib
    import json
    import sys
    sys.path.insert(0, str(ROOT / 'tools'))
    B = importlib.import_module('build_aero_packs')
    sq = lambda x, y, w: [[x, y], [x + w, y], [x + w, y + w], [x, y + w], [x, y]]
    zones = {'aa': {'r': [sq(0, 0, 10)]}, 'bb': {'r': [sq(10, 0, 10)]}, 'cc': {'r': [sq(40, 40, 5)]}, 'dd': {'r': [sq(5, 5, 20)]}}
    c.eq((B.inside([5, 5], sq(0, 0, 10)), B.inside([15, 5], sq(0, 0, 10)), B.touches([[8, 5], [12, 5]], sq(0, 0, 10), False), B.touches([[-5, 5], [30, 5]], sq(10, 0, 10), False), B.touches(sq(20, 20, 2), sq(0, 0, 10)), B.touches(sq(-2, -2, 20), sq(4, 4, 2))),
         (True, False, True, True, False, True), 'the geometry: a point in a ring, a line that enters or crosses a zone, a polygon far away, a polygon that contains a zone', what='geometry')
    obj = lambda pts, closed=False: {'type': 'Polygon' if closed else 'LineString', 'coordinates': [pts] if closed else pts}
    c.eq((sorted(B.zones_touching([{'geometry': obj([[9, 5], [11, 5]])}], zones)), sorted(B.zones_touching([{'geometry': obj(sq(41, 41, 1), True)}], zones)), B.zone_of_point([42, 42], zones), B.zone_of_point([30, 30], zones), B.zone_of_point([10.4, 5], zones, 1.0)),
         (['aa', 'bb', 'dd'], ['cc'], 'cc', None, 'bb'), 'the zones a line or a polygon touches; the zone of a point, the smaller one where outlines overlap, none far from every zone', what='touching')
    ne = {'ne_50m_admin_0_countries': {'features': [{'properties': {'ADM0_A3': 'AAA', 'ISO_A2_EH': 'AA', 'CONTINENT': 'Europe', 'SUBREGION': 'Western Europe'}}, {'properties': {'ADM0_A3': 'BBB', 'ISO_A2_EH': 'BB', 'CONTINENT': 'Europe', 'SUBREGION': 'Western Europe'}},
                                                   {'properties': {'ADM0_A3': 'CCC', 'ISO_A2_EH': 'CC', 'CONTINENT': 'Asia', 'SUBREGION': 'Western Asia'}}, {'properties': {'ADM0_A3': 'DDD', 'ISO_A2_EH': 'DD', 'CONTINENT': 'Seven seas (open ocean)', 'SUBREGION': 'Western Asia'}}]},
          'ne_50m_geography_regions_polys': {'features': [{'properties': {'NAME': 'HIMALAYAS', 'FEATURECLA': 'Range/mtn', 'SCALERANK': 1}, 'geometry': obj(sq(8, 1, 4), True)}]},
          'ne_110m_lakes': {'features': []}, 'ne_110m_rivers_lake_centerlines': {'features': []}}
    out = B.build(zones, ne, [{'name': 'Bigville', 'lat': 42, 'lon': 42, 'population': 6_000_000}, {'name': 'Small', 'lat': 2, 'lon': 2, 'population': 100_000}], '2026-11-09')
    reg = {r['id']: r for r in out['regions']}
    th = {t['id']: t for t in out['themes']}
    c.eq((reg['europe-west']['zones'], reg['middle-east']['zones'], reg['antarctica']['zones'], reg['antarctica'].get('empty'), th['himalaya']['zones'], th['megacities']['zones']),
         (['aa', 'bb'], ['cc'], [], 'no-zone-no-source', ['aa', 'bb', 'dd'], ['cc']), 'build: a pack from SUBREGION (open-ocean entries left out), Antarctica empty with its reason, a theme from the objects touching the zones, the megacities from the cities of the base', what='build')
    c.eq(set(out), {'schema', 'generated', 'source', 'regions', 'themes'}, 'the head of the file', what='head')
    real = json.load(open(ROOT / 'frame' / 'aerodb' / 'packs.json', encoding='utf-8'))
    geo = (ROOT / 'shared' / 'carto' / 'aero_zones_geo.js').read_text(encoding='utf-8')
    known = set(json.loads(geo[geo.index('{', geo.index('AERO_ZONES_GEO')):geo.rindex('}') + 1]))
    allr = real['regions'] + real['themes']
    c.eq((real['schema'], len(real['regions']), [t['id'] for t in real['themes']], all(len(p['names']) == 4 and all(p['names']) for p in allr), all(set(p['zones']) <= known and p['zones'] == sorted(set(p['zones'])) for p in allr), all(p.get('basis') for p in allr)),
         (1, 22, ['islands', 'himalaya', 'deserts-steppes', 'forests-jungles', 'lakes-rivers', 'megacities'], True, True, True), 'the committed file: 22 packs (18 regions from Natural Earth + 3 hand lists + Antarctica), 6 themes, names in four languages, only known zones, each list says its basis', what='file')
    r = {p['id']: p for p in real['regions']}
    covered = set().union(*(set(p['zones']) for p in real['regions']))
    c.eq(('tr' in r['mediterranean']['zones'] and 'tr' in r['middle-east']['zones'], r['antarctica']['zones'], r['antarctica'].get('empty'), r['arctic']['partial'], sorted(set(known) - covered - {'nat'})),
         (True, [], 'no-zone-no-source', ['ca', 'fi', 'no', 'ru', 'se', 'us'], ['aq'] if 'aq' in known else sorted(set(known) - covered - {'nat'})), 'a pack is many-to-many (Turkey in two), Antarctica is empty with its reason, the arctic says which zones are only partly in it; every zone is in a region (except the oceanic one)', what='real')
    t = {p['id']: p for p in real['themes']}
    c.ok({'np', 'bt', 'in', 'cn'} <= set(t['himalaya']['zones']) and {'jp', 'us', 'cd'} <= set(t['megacities']['zones']) and {'br', 'cd'} <= set(t['forests-jungles']['zones']), str({k: v['zones'][:6] for k, v in t.items()}), 'the themes hold what they should: the Himalaya zones, the megacities (Tokyo, New York, Kinshasa in cd), the forests')
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r2 = c.js("""async () => {
      const db = AeroDB.create({ reader: { read: async () => null, list: async () => [], watch: () => () => {} }, lnmperf: false });
      const p = await db.packs();
      const again = await db.packs();
      return { kinds: [p.packs.length, p.packs.filter(x => x.kind === 'region').length, p.packs.filter(x => x.kind === 'theme').length, p.packs[0].date, p.packs[0].source.slice(0, 13), Object.isFrozen(p.packs)], same: p === again, frozen: Object.isFrozen(p) && Object.isFrozen(p.regions[0]) && Object.isFrozen(p.regions[0].zones), regions: p.regions.length, themes: p.themes.map(t => t.id), generated: p.generated,
        tr: p.regions.filter(r => r.zones.includes('tr')).map(r => r.id), antarctica: p.regions.find(r => r.id === 'antarctica'), arctic: p.regions.find(r => r.id === 'arctic').partial, names: p.regions[0].names };
    }""")
    c.eq(r2['kinds'], [28, 22, 6, r2['kinds'][3], 'Natural Earth', True], 'the shape of the contract with Réglages: packs, one list, `kind` region or theme, date and source on each pack (regions and themes kept as well)', what='packs list')
    c.eq((r2['same'], r2['frozen'], r2['regions'], r2['themes'], r2['tr'], r2['antarctica']['zones'], r2['antarctica']['empty'], r2['arctic'], len(r2['names'])),
         (True, True, 22, ['islands', 'himalaya', 'deserts-steppes', 'forests-jungles', 'lakes-rivers', 'megacities'], ['middle-east', 'mediterranean'], [], 'no-zone-no-source', ['ca', 'fi', 'no', 'ru', 'se', 'us'], 4),
         'AeroDb.packs(): read once, frozen, the regions and themes as in the file, Turkey in two packs (the Middle East, the Mediterranean), Antarctica empty with its reason, the partial zones of the arctic', what='packs()')


@case('K113', 'DFS « ED Routes » (Germany, AIXM 5.1, CC BY 4.0): the launcher fetches the amendment in force checked by its SHA-512, the AIXM reader gives the airways although the file carries no points (names from the segments, positions from the curves), the catalogue and the mirror know the source', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0077 (10 Nov 2026, decision of the ergonomics session): DFS « AIP Datasets » (aip.dfs.de/datasets, REST API v1.2: metadata, then <amendment>/<file name>) is the first new source of airways after France, the UK and Spain; the file has Route, RouteSegment and StandardLevelColumn only, no DesignatedPoint: each end is named by the reference (xlink:title) and placed by the end of the segment curve; files are checked by the SHA-512 of the metadata, nothing is written when it does not match, nothing is downloaded when the file in place is the one the metadata names')
def k113(c):
    import hashlib
    import importlib
    import json
    import os
    import tempfile
    import sys
    sys.path.insert(0, str(ROOT / 'tools'))
    AF = importlib.import_module('aero_fetch')
    seg = lambda i, route, a, b, pa, pb, avail: (
        f'<message:hasMember><aixm:RouteSegment gml:id="id.s{i}"><aixm:timeSlice><aixm:RouteSegmentTimeSlice gml:id="id.ts.s{i}"><aixm:upperLimit uom="FL">660</aixm:upperLimit><aixm:lowerLimit uom="FT">4000</aixm:lowerLimit>'
        f'<aixm:start><aixm:EnRouteSegmentPoint><aixm:pointChoice_fixDesignatedPoint xlink:href="urn:uuid:p-{a}" xlink:title="{a}"/></aixm:EnRouteSegmentPoint></aixm:start>'
        f'<aixm:routeFormed xlink:href="urn:uuid:{route}"/>'
        f'<aixm:curveExtent><aixm:Curve gml:id="id.c{i}" srsName="urn:ogc:def:crs:EPSG::4326"><gml:segments><gml:LineStringSegment><gml:posList>{pa[0]} {pa[1]} 53.1 13.4 {pb[0]} {pb[1]}</gml:posList></gml:LineStringSegment></gml:segments></aixm:Curve></aixm:curveExtent>'
        f'<aixm:end><aixm:EnRouteSegmentPoint><aixm:pointChoice_navaidSystem xlink:href="urn:uuid:n-{b}" xlink:title="{b}"/></aixm:EnRouteSegmentPoint></aixm:end>'
        + ''.join(f'<aixm:availability><aixm:RouteAvailability><aixm:direction>{d}</aixm:direction><aixm:status>OPEN</aixm:status></aixm:RouteAvailability></aixm:availability>' for d in avail)
        + '</aixm:RouteSegmentTimeSlice></aixm:timeSlice></aixm:RouteSegment></message:hasMember>')
    route = lambda uid, letter, num: (f'<message:hasMember><aixm:Route gml:id="id.{uid}"><gml:identifier codeSpace="urn:uuid:">{uid}</gml:identifier><aixm:timeSlice><aixm:RouteTimeSlice><aixm:designatorSecondLetter>{letter}</aixm:designatorSecondLetter><aixm:designatorNumber>{num}</aixm:designatorNumber></aixm:RouteTimeSlice></aixm:timeSlice></aixm:Route></message:hasMember>')
    xml = ('<?xml version="1.0"?><message:AIXMBasicMessage xmlns:message="http://www.aixm.aero/schema/5.1.1/message" xmlns:aixm="http://www.aixm.aero/schema/5.1.1" xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:xlink="http://www.w3.org/1999/xlink">'
           + route('r1', 'Z', '717') + route('r2', 'N', '850')
           + seg(1, 'r1', 'GUDOP', 'BEKBA', (53.0, 13.1), (53.2, 13.7), ['FORWARD', 'BACKWARD']) + seg(2, 'r1', 'BEKBA', 'ABC', (53.2, 13.7), (53.5, 14.0), ['FORWARD']) + seg(3, 'r2', 'ABC', 'IRBUP', (51.0, 7.0), (51.4, 7.4), ['BACKWARD'])
           + '</message:AIXMBasicMessage>')
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.wait_for_function('!!window.AeroSources', timeout=30000)
    r = c.js("""(xml) => { const w = window.AeroSources.aixm5(xml).aero.airways; return w.map(x => [x.route, x.dir, x.a.id, x.a.lat, x.a.lon, x.b.id, x.b.lat, x.b.lon, x.lower, x.upper]); }""", xml)
    c.eq(r, [['Z717', 'FB', 'GUDOP', 53.0, 13.1, 'BEKBA', 53.2, 13.7, 4000, 66000], ['Z717', 'F', 'BEKBA', 53.2, 13.7, 'ABC', 53.5, 14.0, 4000, 66000], ['N850', 'B', 'ABC', 51.0, 7.0, 'IRBUP', 51.4, 7.4, 4000, 66000]],
         'the reader gives the airways of a file without points: the designator from the segment, the ends from the curve (lat lon), the direction from the availabilities, the levels', what='reader')
    name = 'ED_Routes_2026-10-01_2026-10-29_revision.xml'
    body = xml.encode('utf-8')
    sha = hashlib.sha512(body).hexdigest()
    meta = lambda **kw: json.dumps({'Amdts': [{'Amdt': 1, 'Metadata': {'datasets': []}}, {'Amdt': 0, 'Metadata': {'datasets': [{'type': 'group', 'name': 'x', 'items': [
        {'type': 'leaf', 'name': 'ED Navaids', 'releases': [{'type': 'AIXM 5.1', 'filename': 'ED_Navaids_a.xml', 'checksum': {'value': '0' * 128}}]},
        {'type': 'leaf', 'name': 'ED Routes', 'releases': [{'type': 'Excel', 'filename': 'x.xlsx'}, {'type': 'AIXM 5.1', 'filename': kw.get('name', name), 'checksum': {'value': kw.get('sha', sha)}}]}]}]}}]}).encode('utf-8')

    class _Net:
        """Le réseau d'essai : remplace aero_fetch.get ; routes : { morceau d'adresse: octets | ('os', texte) }, le premier qui correspond ; garde les appels."""

        def __init__(self, AF, routes):
            self.AF, self.routes, self.calls = AF, routes, []

        def __call__(self, url, since=None, absent_ok=False, copy=None):
            self.calls.append((url, since))
            for part, v in self.routes.items():
                if part in url:
                    if isinstance(v, tuple):
                        raise OSError(v[1])
                    return v
            raise OSError('404')

        def __enter__(self):
            self.saved, self.AF.get = self.AF.get, self
            return self

        def __exit__(self, *a):
            self.AF.get = self.saved
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        path = os.path.join(td, 'sia', 'zones', 'de', 'dfs_ED_Routes.xml')
        net = {'/rest/0/': body, '/rest/': meta()}
        with _Net(AF, net) as n:
            res = AF.fetch(td, 'dfs')
            c.eq((res['ok'], [(f['name'], f['unchanged']) for f in res['files']], open(path, 'rb').read() == body, [u.split('/rest')[1] for u, _ in n.calls]), (True, [('dfs_ED_Routes.xml', False)], True, ['/', '/0/' + name]),
                 'the amendment in force (n° 0): the metadata, then <amendment>/<file name>; written under a stable name in zones/de/', what='fetch')
        with _Net(AF, net) as n:
            res = AF.fetch(td, 'dfs')
            c.eq((res['ok'], [(f['name'], f['unchanged']) for f in res['files']], len(n.calls)), (True, [('dfs_ED_Routes.xml', True)], 1), 'the file in place is the one the metadata names (same SHA-512): nothing downloaded, said unchanged', what='unchanged')
        os.remove(path)
        with _Net(AF, {'/rest/0/': b'<other/>', '/rest/': meta()}):
            res = AF.fetch(td, 'dfs')
            c.eq((res['ok'], os.path.exists(path), 'SHA-512' in res['errors'][0]), (False, False, True), 'a download whose SHA-512 is not the metadata\'s: refused, nothing written', what='checksum')
        for label, m in (('hostile name', meta(name='../../x.xml')), ('bad sum', meta(sha='abc')), ('not json', b'<html/>'), ('no amendment', json.dumps({'Amdts': [{'Amdt': 2}]}).encode())):
            with _Net(AF, {'/rest/': m}):
                res = AF.fetch(td, 'dfs')
                c.eq((res['ok'], os.path.exists(path)), (False, False), f'{label}: refused with a reason, nothing written', what=label)
        with _Net(AF, {'/rest/': ('os', 'unreachable')}):
            res = AF.fetch(td, 'dfs')
            c.eq((res['ok'], res['errors'][0].startswith('DFS :')), (False, True), 'the service unreachable: said, nothing written', what='offline')
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    k = c.js("""async () => { await AeroDB.create({ reader: { read: async () => null, list: async () => [], watch: () => () => {} }, lnmperf: false }).sources().catch(() => null);
      const s = (window.AeroCatalogue.SOURCES || []).find(x => x.id === 'dfs'); return { found: !!s, zones: s && s.zones, provider: s && s.fetch && s.fetch.provider, names: s && s.n.length, lic: s && s.lic[0] }; }""")
    c.eq((k['found'], k['zones'], k['provider'], k['names'], k['lic']), (True, ['de'], 'dfs', 4, 'CC BY 4.0, crédit DFS'),
         'the catalogue knows the source: zone de, provider dfs, names in four languages, the licence (the zone table of the page and the file rule are checked against the mirror of the launcher by K52)', what='catalogue')


@case('K115', 'Homonyms (SOG-0142): coords(ident, { near }) gives the nearest place of that name (PAM near ALS in Europe, not in America), says the homonyms it set aside; whereIs says why a name is unknown (the zone expected is not built, or has no source of points)', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0142 (10 Nov 2026): the route ESSB DCT NOSLI N850 MOKNI DCT ADVOP Z703 ALS N872 PAM L980 … went through PAM in the United States and ALS in Morocco: a name was resolved to the FIRST place found; the resolution takes the homonym nearest to the previous point, says the others, and for the unknown points (NOSLI, MOKNI, ADVOP, IDRID, MONTO: Sweden, Denmark, Spain) says the zone expected by the country of the point when an airway names it, built or not, with or without points')
def k115(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-10T12:00:00Z'), reads = [];
      const nav = (id, lat, lon, name) => ({ id, lat, lon, name, type: 'VOR' });
      const kinds = ['meta', 'aerodromes', 'navaids', 'points', 'vrp', 'airways'];
      const zone = (z, o = {}) => Object.fromEntries(kinds.map(k => [`sia/base/${z}/2026-10-29/${k}.json`, k === 'meta' ? { schema: 2, zone: z, cycle: '2026-10-29', kind: 'meta', parserVersion: 23, data: {} } : { schema: 2, zone: z, cycle: '2026-10-29', kind: k, data: o[k] || [] }]));
      const files = {
        ...zone('fr', { navaids: [nav('ALS', 44.13, 4.07, 'ALES')], aerodromes: [{ id: 'LFLL', icao: 'LFLL', lat: 45.7256, lon: 5.0811, name: 'LYON SAINT EXUPERY' }], points: [{ id: 'LFLL', lat: 45.7256, lon: 5.0811 }, { id: 'ALS', lat: 44.13, lon: 4.07 }] }), ...zone('es', { navaids: [nav('PAM', 42.77, -1.64, 'PAMPLONA')] }), ...zone('us', { navaids: [nav('PAM', 30.2, -85.7, 'PANAMA CITY')] }),
        ...zone('ma', { navaids: [nav('ALS', 33.6, -7.6, 'ALS MAROC')] }), ...zone('se'),
        ...zone('de', { airways: [{ route: 'N850', a: { id: 'NOSLI', lat: 57.9, lon: 12.6 }, b: { id: 'GUDOP', lat: 53.0, lon: 13.1 }, lower: 4000, upper: 66000 }, { route: 'Z703', a: { id: 'ADVOP', lat: 55.7, lon: 9.5 }, b: { id: 'GUDOP', lat: 53.0, lon: 13.1 }, lower: 4000, upper: 66000 }] }),
        'sia/base/index.json': { schema: 2, kind: 'index', zones: { de: { cycle: '2026-10-29', prefixes: ['ED'], kb: { airways: 5, points: 1 } }, se: { cycle: '2026-10-29', prefixes: ['ES'], kb: { airways: 1, points: 1 } } } }
      };
      const reader = { read: async p => { reads.push(p); return p in files ? { value: files[p], rev: 'r' } : null; }, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} };
      const db = AeroDB.create({ reader, lnmperf: false, now: () => day });
      const z = x => x && ({ zone: x.zone, name: x.name, nm: Math.round(x.distanceNm), homonyms: (x.homonyms || []).map(h => h.zone) });
      const out = {};
      out.pamEurope = z(await db.coords('PAM', { near: [44.1, 4.1] }));
      out.usRead = reads.some(p => p.includes('sia/base/us/') && !p.endsWith('meta.json'));
      out.pamEuropeAll = z(await db.coords('PAM', { near: [44.1, 4.1], all: true }));
      out.pamAmerica = z(await db.coords('PAM', { near: [30.5, -86] }));
      out.alsFrance = z(await db.coords('ALS', { near: [43, -1] }));
      out.alsMorocco = z(await db.coords('ALS', { near: [33.5, -7.5] }));
      out.plain = await db.coords('ALS');
      out.none = await db.coords('NOSLI', { near: [58, 12] });
      out.bad = [await db.coords('', { near: [1, 1] }), await db.coords('PAM', { near: ['x', 1] }).then(x => x && x.homonyms === undefined), (await db.coordsAll('PAM', { near: [44, 4] })).map(x => [x.zone, x.distanceNm > 0])];
      out.lfll = await db.coords('LFLL', { near: [45, 5] });
      out.lflAll = (await db.coordsAll('LFLL', { near: [45, 5], all: true })).map(x => [x.kind, x.zone]);
      out.alsAll = z(await db.coords('ALS', { near: [43, -1], all: true }));
      out.known = (await db.whereIs('PAM', { near: [44.1, 4.1] })).found.zone;
      out.nosli = (await db.whereIs('NOSLI', { near: [58, 12] })).unknown;
      out.advop = (await db.whereIs('ADVOP', { near: [56, 10] })).unknown;
      out.nowhere = (await db.whereIs('QQQQQ', { near: [56, 10] })).unknown;
      return out;
    }""")
    c.eq((r['pamEurope'], r['usRead']), ({'zone': 'es', 'name': 'PAMPLONA', 'nm': 263, 'homonyms': []}, False), 'PAM near the south of France is Pamplona (Spain): the nearest; the zone of the United States is not even opened (no zone left can have a nearer place)', what='europe')
    c.eq(r['pamEuropeAll'], {'zone': 'es', 'name': 'PAMPLONA', 'nm': 263, 'homonyms': ['us']}, 'with all: true every published zone is searched and the homonym set aside is said (the United States)', what='all')
    c.eq((r['pamAmerica']['zone'], r['alsFrance']['zone'], r['alsMorocco']['zone']), ('us', 'fr', 'ma'), 'the same name resolves to the place nearest the previous point: PAM near Florida is American, ALS near Spain is French and near Rabat is Moroccan', what='nearest')
    c.eq((r['lfll']['kind'], r['lfll']['zone'], r['lfll']['homonyms'], r['lflAll']), ('aerodrome', 'fr', [], [['aerodrome', 'fr']]),
         'SOG-0154: an aerodrome identifier resolves to the aerodrome, with no homonym: the point of the same identifier at the same position (the SIA publishes the reference point of an aerodrome under its ICAO code) is the same place', what='aerodrome')
    c.eq(r['alsAll'], {'zone': 'fr', 'name': 'ALES', 'nm': 231, 'homonyms': ['ma']}, 'a beacon and a point of the same identifier at the same position are one place: the only homonym of ALS is the Moroccan one, not the French point', what='same place')
    c.eq((r['plain']['kind'], r['plain'].get('homonyms'), r['none']), ('navaid', None, None), 'without a neighbourhood nothing changes (the first place found, no homonym list); an unknown name is null', what='compat')
    c.eq(r['bad'], [None, True, [['es', True]]], 'a bad neighbourhood is ignored (the old way), an empty name is null', what='bad')
    c.eq((r['known'], r['nosli'], r['advop'], r['nowhere']),
         ('es', {'reason': 'no-points', 'zone': 'se', 'via': 'N850', 'position': {'lat': 57.9, 'lon': 12.6}}, {'reason': 'zone-not-built', 'zone': 'dk', 'via': 'Z703', 'position': {'lat': 55.7, 'lon': 9.5}}, {'reason': 'not-found'}),
         'whereIs: a known name is found; an unknown one named by a published airway says where it is, which airway names it, and the zone expected by the country of the point: Sweden is built without points (openAIP carries none), Denmark is not built; a name nowhere is not-found', what='whereIs')


@case('K117', 'Moved SIA sources are read through the route of the job, not through data/local/ (SOG-0144): the real launcher builds with them, data/local/sources/ stays hidden, the route needs the token of the claim and only serves what the job offered', 'K', static=True,
      rule='SOG-0144 (10 Nov 2026, decision of the ergonomics session): « Tout recalculer » failed for every zone (HTTP 404) because the build page read the moved SIA XML at /data/local/sources/…, which the launcher hides (audit of 7 Oct); the page now reads them through GET /__setup/regen/job/input, guarded by the token of its claim, for the files the job offered only, in a stream; data/local/ stays hidden to the rest of the world')
def k117(c):
    import http.client
    import json
    import os
    import socket
    import subprocess
    import sys
    import tempfile
    import time
    from pathlib import Path
    RJ, B, fn, check = _d5_modules()
    # the route's rules, on the real Jobs with a job that offers one moved file
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'local' / 'sources' / 'sia' / '2026-10-29').mkdir(parents=True)
        (data / 'local' / 'sources' / 'sia' / '2026-10-29' / 'XML_SIA_2026-10-29.xml').write_text('<x>ok</x>', encoding='utf-8')
        (data / 'local' / 'build').mkdir(parents=True)
        (data / 'local' / 'build' / 'es.json').write_text('{"secret": 1}', encoding='utf-8')
        stop = {'go': False}

        def verb(job, a, ctx):
            job.offer({'zones': ['ie'], 'sources': [{'source': 'sia', 'cycle': '2026-10-29', 'name': 'XML_SIA_2026-10-29.xml'}]})
            while not stop['go'] and not job.cancelled():
                time.sleep(0.05)
            return {'ok': True}
        jobs = RJ.Jobs({('t', 'build'): (verb, lambda a: {})}, {'data': str(data)}, min_gap={})
        job_id = jobs.start('t', 'build', {})['job']
        tok = jobs.cur.token
        good = ('sia', '2026-10-29', 'XML_SIA_2026-10-29.xml')
        r = jobs.input_file(job_id, tok, *good)
        c.eq((r['ok'], r['size'], Path(r['path']).read_text(encoding='utf-8')), (True, 9, '<x>ok</x>'), 'the token of the claim and an offered file: the file, its size', what='ok')
        refusals = {k: jobs.input_file(*a).get('status') for k, a in {
            'no token': (job_id, '', *good), 'wrong token': (job_id, 'x' * 40, *good), 'other job': ('nope', tok, *good), 'not offered': (job_id, tok, 'sia', '2026-10-29', 'XML_SIA_2026-10-01.xml'),
            'dot dot': (job_id, tok, 'sia', '2026-10-29', '..'), 'traversal': (job_id, tok, 'sia', '2026-10-29', '../../build/es.json'), 'other folder': (job_id, tok, 'sia', '..', 'es.json'), 'not text': (job_id, tok, 'sia', None, 'a')}.items()}
        c.eq(refusals, {'no token': 403, 'wrong token': 403, 'other job': 409, 'not offered': 400, 'dot dot': 400, 'traversal': 400, 'other folder': 400, 'not text': 400},
             'refused: no token or a wrong one (403), another job (409), a file the job did not offer, « .. » or a path (400): nothing of data/local/ but the offered files is ever read through it', what='refusals')
        os.remove(data / 'local' / 'sources' / 'sia' / '2026-10-29' / 'XML_SIA_2026-10-29.xml')
        c.eq(jobs.input_file(job_id, tok, *good).get('status'), 404, 'an offered file that is not there: 404', what='absent')
        stop['go'] = True
        for _ in range(60):
            if jobs.cur.data['state'] != 'running':
                break
            time.sleep(0.05)
        c.eq(jobs.input_file(job_id, tok, *good).get('status'), 409, 'once the job is over the token opens nothing', what='over')
    # the real launcher, the real browser: a build whose SIA XML are in data/local/sources/
    if not B.find_browser({}):
        print('NOTE K117: no Edge or Chrome on this workstation: the end-to-end run is not made')
        return
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'sia' / 'openaip').mkdir(parents=True)
        # the SIA XML arrive as they do on the workstation: by the pickup of Downloads (base/pickup writes them under data/local/sources/sia/<cycle>/)
        import zipfile
        dl = Path(td) / 'Downloads'
        dl.mkdir()
        with zipfile.ZipFile(dl / 'export_xml_bd_SIA_2026-10-29.zip', 'w') as zf:
            zf.writestr('XML_SIA_2026-10-29.xml', '<?xml version="1.0" encoding="ISO-8859-1"?><SiaExport Date="2026-10-29"/>')
        pick, pick_check = RJ.REGISTRY[('base', 'pickup')]
        got = pick(RJ.Job('base', 'pickup', {}), pick_check({'zones': ['fr'], 'dry': False}), {'data': str(data), 'downloads': lambda: [str(dl)]})
        c.eq(((data / 'local' / 'sources' / 'sia' / '2026-10-29' / 'XML_SIA_2026-10-29.xml').is_file(), [t['source'] for t in got['taken']]), (True, ['sia']), 'the pickup of the SIA writes the hidden place, as on the workstation', what='pickup')
        (data / 'data_tree.js').write_text('window.DATA_TREE = {};\n', encoding='utf-8')
        (data / 'sia' / 'openaip' / 'ie_apt.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [-8.0, 53.0]},
                                                                  'properties': {'_id': 'k117a', 'name': 'TESTFIELD', 'icaoCode': 'EITS', 'type': 2, 'trafficType': [0], 'country': 'IE'}}]}), encoding='utf-8')
        s = socket.socket()
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
        s.close()
        tmp = Path(td) / 'tmp'
        tmp.mkdir()
        log = open(Path(td) / 'launcher.log', 'w')
        p = subprocess.Popen([sys.executable, str(c.root / 'tools' / 'launch.py'), '--port', str(port), '--no-browser', '--data', str(data)], stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, cwd=td,
                             env={**os.environ, 'TEMP': str(tmp), 'TMP': str(tmp), 'TMPDIR': str(tmp)})
        try:
            def call(method, path, body=None, **headers):
                h = http.client.HTTPConnection('127.0.0.1', port, timeout=30)
                h.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
                r = h.getresponse()
                return r.status, r.read()
            for _ in range(60):
                try:
                    if call('GET', '/', **{'Sec-Fetch-Site': 'same-origin'})[0] in (200, 302, 404):
                        break
                except OSError:
                    time.sleep(0.5)
            same = {'Sec-Fetch-Site': 'same-origin'}
            c.eq(call('GET', '/data/local/sources/sia/2026-10-29/XML_SIA_2026-10-29.xml', **same)[0], 404, 'data/local/sources/ stays hidden to the rest of the world (the rule of the audit of 7 Oct is untouched)', what='hidden')
            c.eq(call('GET', '/data/local/build/es.json', **same)[0], 404, 'and so does the rest of data/local/', what='hidden build')
            q = '/__setup/regen/job/input?job=x&source=sia&cycle=2026-10-29&name=XML_SIA_2026-10-29.xml'
            c.eq(call('GET', q, **same)[0], 403, 'the route without the X-SOG-Setup header: refused', what='no header')
            c.eq(call('GET', q, **same, **{'X-SOG-Setup': '1'})[0], 409, 'with the header but no running job of that id: refused (409), never a file', what='no job')
            hdr = {'X-SOG-Setup': '1', 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin'}
            st, raw = call('POST', '/__setup/regen/job', {'set': 'base', 'verb': 'build', 'args': {'zones': ['ie']}, 'author': 'TST'}, **hdr)
            job = json.loads(raw)['job']
            end = time.time() + 150
            while time.time() < end:
                v = json.loads(call('GET', f'/__setup/regen/job?id={job}', **hdr)[1])
                if v.get('state') != 'running':
                    break
                time.sleep(0.5)
            z = (v.get('zones') or {}).get('ie') or {}
            c.eq((v.get('state'), (v.get('result') or {}).get('built'), z.get('message')), ('done', ['ie'], None), 'the real launcher and the real browser build a zone while the SIA XML are in data/local/sources/ (HTTP 404 before: every zone failed)', what='end to end')
        finally:
            p.terminate()
            try:
                p.wait(10)
            except subprocess.TimeoutExpired:
                p.kill()
            log.close()


@case('K118', 'A synchronisation says how long each step took, how many git commands it ran and how much it sent (SOG-0149): res.timings in the report and in data/local/sync.json', 'K', static=True,
      rule='SOG-0149 (10 Nov 2026): the first synchronisation of the day is « too long » (more than two minutes) and nothing says where the time goes: data_sync.run gives, in its report (data/local/sync.json), the duration of each step (settle, commit, prepare, receive, untrack, push), the total, the number of git commands and the time they took, and the bytes the push carried; the numbers are those of the pass, never a path or a content')
def k118(c):
    import json
    import subprocess
    import sys
    import tempfile
    from pathlib import Path
    sys.path.insert(0, str(c.root / 'tools'))
    import importlib
    DS = importlib.import_module('data_sync')
    tmp = Path(tempfile.mkdtemp(prefix='sog-sync-'))
    try:
        remote, a = str(tmp / 'remote.git'), str(tmp / 'A')
        sh = lambda *args, cwd=str(tmp): subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True)
        sh('init', '--bare', '-b', 'main', remote)
        sh('clone', '-q', remote, a)
        sh('config', 'user.name', 'essai', cwd=a)
        sh('config', 'user.email', 'essai@example.invalid', cwd=a)
        p = Path(a, 'disponibilites', 'AAA', '2026-W44.json')
        p.parent.mkdir(parents=True)
        p.write_text(json.dumps({'updated_at': '2026-10-29T10:00:00Z', 'dispos': {'lun': 'x' * 3000}}), encoding='utf-8')
        r = DS.run(a, 'AAA')
        t = r['timings']
        c.eq((r['ok'], sorted(t), sorted(t['steps']), t['gitCalls'] > 3, t['totalMs'] >= t['gitMs'] >= 0, t['sentBytes'] > 0, sum(t['steps'].values()) <= t['totalMs'] + 5),
             (True, ['gitCalls', 'gitMs', 'sentBytes', 'steps', 'totalMs'], ['commit', 'prepare', 'push', 'receive', 'settle', 'untrack'], True, True, True, True),
             'a pass that commits and sends: every step has its duration, the git commands are counted and timed, the bytes of the push are given (compressed objects on disk), the steps add up to the total', what='first pass')
        r = DS.run(a, 'AAA')
        t = r['timings']
        c.eq((r['ok'], t['sentBytes'], t['gitCalls'] > 0), (True, 0, True), 'a pass with nothing new sends nothing: 0 bytes', what='nothing to send')
        saved = json.loads(Path(a, 'local', 'sync.json').read_text(encoding='utf-8'))
        c.eq((saved['timings']['sentBytes'], sorted(saved['timings']['steps'])), (0, ['commit', 'prepare', 'push', 'receive', 'settle', 'untrack']), 'the numbers are kept in data/local/sync.json with the report', what='sync.json')
        bad = DS.run(str(tmp / 'nowhere'), 'AAA')
        c.ok('timings' not in bad or bad['ok'] is False, str(bad)[:120], 'a refused pass (not a repository) stays a refusal')
    finally:
        import shutil
        shutil.rmtree(tmp, ignore_errors=True)


@case('K120', 'A failed publication carries its cause (SOG-0155): the code (remote-refused, network, push-rejected, lfs-hook, auth, conflict, busy), the step where it stopped and the text of git, kept in data/local/sync.json', 'K', static=True,
      rule='SOG-0155 (10 Nov 2026): « La publication a échoué : rien n\'est perdu… Corrigez la cause » -- which cause? data_sync.run gives, with `ok: false`, `cause` (a code the page can say), `step` (settle, commit, prepare, receive, untrack, push) and `message` (the text of git, cleaned), and data/local/sync.json keeps them (it kept neither the message nor the failure before); a success has none; the launcher\'s route never answers a bare 500')
def k120(c):
    import json
    import subprocess
    import sys
    import tempfile
    import importlib
    from pathlib import Path
    sys.path.insert(0, str(c.root / 'tools'))
    DS = importlib.import_module('data_sync')
    c.eq([DS.cause_of(t) for t in ('error: failed to push some refs ! [rejected] main -> main (non-fast-forward)', 'remote: GitLab: You are not allowed to push code to protected branches', "fatal: unable to access 'https://x/': Could not resolve host: gitlab.com",
                                   'git@gitlab.com: Permission denied (publickey).', 'error: failed to push: pre-push hook failed: git-lfs', 'CONFLICT (content): Merge conflict in a.json', 'Un rebase est en cours dans data/', 'boom')],
         ['push-rejected', 'remote-refused', 'network', 'auth', 'lfs-hook', 'conflict', 'busy', 'other'], 'the text of git or of the launcher is sorted into a cause code', what='sort')
    tmp = Path(tempfile.mkdtemp(prefix='sog-sync-'))
    try:
        remote, a = str(tmp / 'remote.git'), str(tmp / 'A')
        sh = lambda *args, cwd=str(tmp): subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True)
        sh('init', '--bare', '-b', 'main', remote)
        sh('clone', '-q', remote, a)
        sh('config', 'user.name', 'essai', cwd=a)
        sh('config', 'user.email', 'essai@example.invalid', cwd=a)
        p = Path(a, 'disponibilites', 'AAA', '2026-W44.json')
        p.parent.mkdir(parents=True)
        p.write_text(json.dumps({'updated_at': '2026-10-29T10:00:00Z', 'dispos': {'lun': 1}}), encoding='utf-8')
        ok = DS.run(a, 'AAA')
        c.eq((ok['ok'], 'cause' in ok, 'message' in json.loads(Path(a, 'local', 'sync.json').read_text(encoding='utf-8'))), (True, False, False), 'a success carries no cause and keeps no message', what='success')
        # the remote refuses the push (a hook of the server): the cause, the step, the text
        hook = Path(remote, 'hooks', 'pre-receive')
        hook.write_text('#!/bin/sh\necho "remote: GitLab: You are not allowed to push code to protected branches on this project." >&2\nexit 1\n', encoding='utf-8')
        hook.chmod(0o755)
        p.write_text(json.dumps({'updated_at': '2026-10-29T11:00:00Z', 'dispos': {'lun': 2}}), encoding='utf-8')
        r = DS.run(a, 'AAA')
        saved = json.loads(Path(a, 'local', 'sync.json').read_text(encoding='utf-8'))
        c.eq((r['ok'], r['cause'], r['step'], 'not allowed to push' in r['message'], (saved['ok'], saved['cause'], saved['step'], 'not allowed to push' in saved['message'])),
             (False, 'remote-refused', 'push', True, (False, 'remote-refused', 'push', True)), 'the server refuses the push: remote-refused, stopped at the push, the text of the server is in the message, and all of it is kept in data/local/sync.json', what='refused')
        hook.unlink()
        # the remote is unreachable
        sh('remote', 'set-url', 'origin', str(tmp / 'nowhere.git'), cwd=a)
        r = DS.run(a, 'AAA')
        c.eq((r['ok'], r['cause'], r['step']), (False, 'network', 'receive'), 'the remote cannot be reached: network, stopped when receiving', what='network')
        # back to normal: the next pass succeeds and the failure is gone from the record
        sh('remote', 'set-url', 'origin', remote, cwd=a)
        r = DS.run(a, 'AAA')
        saved = json.loads(Path(a, 'local', 'sync.json').read_text(encoding='utf-8'))
        c.eq((r['ok'], 'cause' in r, 'cause' in saved), (True, False, False), 'the next pass succeeds: no cause, the record is the success', what='recovered')
    finally:
        import shutil
        shutil.rmtree(tmp, ignore_errors=True)


@case('K65', 'Build job: a zone shows a count of sources only when the builder gives one for it; the build\'s count goes once in the job', 'K', static=True,
      rule='Réglages 1 Nov 2026 (the user saw « construction (90 / 90 sources) » on all 26 zones): the builder\'s counts are global; a zone gets done / total only from a count of its own; job.data inputs = { done, total } once')
def k65(c):
    import tempfile
    RJ, B, fn, check = _d5_modules()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)
        _d5_modes(fake, {'gb': 'slow', 'nl': 'slow', 'de': 'slow', 'counts': {'gb': [1, 4], 'nl': [3, 3]}})
        run = _D5Run(RJ, data, fake, {'zones': ['de', 'gb', 'nl']})
        seen = []
        import time
        t = time.time()
        while time.time() - t < 20:
            v = run.job.view() if run.job else None
            if v and v.get('zones'):
                seen.append({z: {k: v['zones'][z].get(k) for k in ('state', 'done', 'total')} for z in v['zones']})
            if v and v.get('result'):
                break
            time.sleep(0.05)
        view = run.wait()
        building = [s for s in seen if s.get('gb', {}).get('total') is not None]
        c.ok(bool(building), str(seen[-1:]), 'a count reached the zones that have one')
        last = building[-1] if building else {}
        c.eq({z: (last[z]['done'], last[z]['total']) for z in ('gb', 'nl', 'de')}, {'gb': (1, 4), 'nl': (3, 3), 'de': (None, None)},
             'two zones with different counts, each its own; a zone without one has no count (never 0 / 0, never the global one)', what='counts')
        c.eq(view.get('inputs'), {'done': 1, 'total': 2}, 'the global count, once, in the job', what='inputs')
        c.ok(not any(s[z].get('total') == 2 for s in seen for z in s), 'global', 'the global count is never copied on a zone')


@case('K66', 'Class E airspaces never rise above the State\'s class A floor: an openAIP E5 at FL 600 in the US is 17 999 ft, said capped', 'K', tags=('aerodb',), phone=False,
      rule='Simplification 1 Nov 2026 (cross-section KSET-KDOV: 3 158 US class E spaces at FL 600, openAIP\'s « unlimited »): a class E space never goes above its State\'s class A floor (US, CA: FL180), capped: \'classA\'; other classes and other States keep the source\'s ceiling')
def k66(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/vrp_sources.html', wait_until='load')
    c.page.wait_for_function('!!window.AeroSources', timeout=30000)
    got = c.js("""() => {
      const sq = [[[-90, 40], [-89.9, 40], [-89.9, 40.1], [-90, 40.1], [-90, 40]]];
      const f = (id, name, icaoClass, upper, country, extra = {}) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: sq },
        properties: { _id: id, name, type: 26, icaoClass, country, upperLimit: upper, lowerLimit: { value: 700, unit: 1, referenceDatum: 0 }, ...extra } });
      const fl = n => ({ value: n, unit: 6, referenceDatum: 2 }), ft = n => ({ value: n, unit: 1, referenceDatum: 1 });
      const fc = { type: 'FeatureCollection', features: [
        f('1', 'HILLSBORO CLASS E5', 4, fl(600), 'US'),
        f('2', 'SMALL CLASS E', 4, ft(2500), 'US'),
        f('3', 'SOME CLASS D', 3, ft(2500), 'US'),
        f('4', 'HIGH CLASS B', 1, fl(600), 'US'),
        f('5', 'CANADA CLASS E', 4, fl(600), 'CA'),
        f('6', 'GERMAN CLASS E', 4, fl(600), 'DE'),
        f('7', 'E AT FL180', 4, fl(180), 'US'),
        f('8', 'E AT FL175', 4, fl(175), 'US')
      ] };
      const faa = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: sq },
        properties: { NAME: 'DOVER CLASS E', CLASS: 'E', LOCAL_TYPE: 'CLASS_E5', UPPER_VAL: 60000, UPPER_UOM: 'FT', UPPER_CODE: 'MSL', LOWER_VAL: 700, LOWER_UOM: 'FT', LOWER_CODE: 'SFC' } }] };
      const pick = a => ({ cls: a.cls, upper: a.upper, capped: a.capped ?? null });
      return { oa: Object.fromEntries(AeroSources.geojson(fc, 'us_asp.geojson').airspaces.map(a => [a.name, pick(a)])),
               faa: AeroSources.geojson(faa, 'faa_class.geojson').airspaces.map(pick) };
    }""")
    oa = got['oa']
    c.eq(oa['HILLSBORO CLASS E5'], {'cls': 'E', 'upper': '17999 ft AMSL', 'capped': 'classA'}, 'a US E5 at FL 600: 17 999 ft AMSL, said capped (a field)', what='E5 FL600')
    c.eq(oa['SMALL CLASS E'], {'cls': 'E', 'upper': '2500 ft AMSL', 'capped': None}, 'a class E at 2 500 ft: unchanged', what='E 2500')
    c.eq((oa['SOME CLASS D'], oa['HIGH CLASS B']), ({'cls': 'D', 'upper': '2500 ft AMSL', 'capped': None}, {'cls': 'B', 'upper': 'FL 600', 'capped': None}),
         'other classes keep the source ceiling', what='other classes')
    c.eq((oa['CANADA CLASS E']['upper'], oa['GERMAN CLASS E']['upper']), ('17999 ft AMSL', 'FL 600'), 'Canada too (FL180); a State without a known class A floor keeps it', what='States')
    c.eq((oa['E AT FL180']['upper'], oa['E AT FL175']['upper']), ('17999 ft AMSL', 'FL 175'), 'at the floor: capped; below it: kept', what='edges')
    c.eq(got['faa'], [{'cls': 'E', 'upper': '17999 ft AMSL', 'capped': 'classA'}], 'the FAA Class Airspace E too', what='FAA')


@case('K76', 'publication(): each zone says the dated source its cycle comes from, or none (no AIRAC: never « dépassée »)', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0026 (5 Nov 2026): the Data module took the oldest published folder cycle among the zones a source feeds, so GeoNames, relief, openAIP, UK Mil… showed « dépassé » as soon as one zone of the world was still at the previous cycle; the cycle is the one of a dated source (SIA, NATS, ENAIRE) only; the folder of any other zone is a build date')
def k67(c):
    import sys
    sys.path.insert(0, str(ROOT / 'tools'))
    import aero_cycles
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-05T12:00:00Z'), meta = (z, cy) => ({ schema: 2, zone: z, cycle: cy, kind: 'meta', parserVersion: 21, data: { builtAt: cy + 'T10:00:00Z' } });
      const files = {};
      for (const [z, cy] of [['fr', '2026-10-29'], ['de', '2026-10-01'], ['gb', '2026-10-01'], ['es', '2026-10-01'], ['us', '2026-10-01']]) files[`sia/base/${z}/${cy}/meta.json`] = meta(z, cy);
      const reader = { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} };
      const db = AeroDB.create({ reader, lnmperf: false, now: () => day }), pub = await db.publication(), none = pub.route;
      files['route/index.json'] = { rad: ['2026-11-26', '2026-10-29', 'x', 5, '2026-10-29'], fra: ['2026-10-29'], at: '2026-11-09T14:00:00Z' };
      const withRoute = (await AeroDB.create({ reader, lnmperf: false, now: () => day }).publication()).route;
      files['route/index.json'] = { rad: 'x', at: 'no' };
      const bad = (await AeroDB.create({ reader, lnmperf: false, now: () => day }).publication()).route;
      return { none, withRoute, bad, src: Object.fromEntries(Object.entries(pub.base).map(([z, v]) => [z, v.cycleSource])), inForce: Object.fromEntries(Object.entries(pub.base).map(([z, v]) => [z, v.inForce])),
               table: AeroDB.CYCLED_ZONES };
    }""")
    c.eq(r['src'], {'fr': 'sia', 'de': None, 'gb': 'nats', 'es': 'enaire', 'us': None}, 'fr, gb and es name their dated source; de and us (openAIP, FAA: no AIRAC) have none', what='cycleSource')
    c.eq((r['none'], r['withRoute'], r['bad']), (None, {'rad': ['2026-10-29', '2026-11-26'], 'fra': ['2026-10-29'], 'at': '2026-11-09T14:00:00Z'}, {'rad': [], 'fra': [], 'at': None}),
         'publication().route (SOG-0125): the cycles of the RAD and of the FRA points present in data/route/index.json (dates only, sorted, no duplicate), the time of the import; null without the file; a damaged file gives empty lists', what='route')
    c.eq(r['table'], {z: s for s, z in aero_cycles.CYCLED.items()}, "the launcher's table (tools/aero_cycles.py CYCLED) and aerodb's are the same", what='mirror')
    c.eq(r['inForce']['de'], '2026-10-01', 'the folder cycle stays as written (a build date for de), the module decides what it says', what='folder')


@case('K69', 'LFPO ILS 07 (SOG-0022): the initial fix and the FAF of the DATA page are in the record, IF -> FAF -> threshold -> missed; named by the runway, never by a chart name', 'K', static=True,
      rule='SOG-0022 (5 Nov 2026): the ILS 07 coding table of Orly has no initial fix (« See chart » first) but the DATA page prints « IF ILS/LOC RWY 07 » and « FAF LOC RWY 07 » with positions; the record carries both (synthetic), on the final, never invented names (C107 / F107 are chart names the source does not give)')
def k69(c):
    P, fx, rows = _eaip(c)
    page = (fx / 'LFPO' / 'FR-AD-2.LFPO.AD-2.12.html').read_text(encoding='utf-8')
    files = ['AD_2_LFPO_DATA_02.pdf', 'AD_2_LFPO_DATA_RWY07_FNA_ILS_CAT123_LOC_CODE.pdf', 'AD_2_LFPO_DATA_RWY06_FNA_ILS_CAT123_LOC_CODE.pdf', 'AD_2_LFPO_DATA_RWY07_FNA_RNP_CODE.pdf']
    d = P.build_aerodrome('LFPO', files, lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-29', '2026-10-29', None, None, page)
    ils = next(p for p in d['procedures'] if p['runways'] == ['07'] and 'ILS' in p['name'])
    pts = ils['points']
    c.eq([(q['id'], q['leg'], q.get('synthetic'), q.get('phase'), q.get('gap')) for q in pts],
         [('IF07', 'IF', 'if', None, None), ('FAF07', 'CF', 'faf', None, None), ('RW07', 'CF', 'threshold', None, None), ('PO412', 'TF', None, 'missed', True), ('MLN', 'TF', None, 'missed', None), ('MOLBA', 'TF', None, 'missed', None)],
         'LFPO ILS 07: IF07 (the DATA page prints « IF ILS/LOC RWY 07 » with a position), FAF07, the threshold, then the missed approach', what='ILS 07 points')
    c.eq(((pts[0]['lat'], pts[0]['lon']), (pts[1]['lat'], pts[1]['lon'])), ((48.668083, 2.082889), (48.681667, 2.1555)),
         "the positions are the DATA page's (48°40'05.1'' N 002°04'58.4'' E and 48°40'54.0'' N 002°09'19.8'' E), no altitude printed", what='ILS 07 positions')
    rnp = next(p for p in d['procedures'] if p['runways'] == ['07'] and p['name'].startswith('RNP'))
    fpo = next(q for q in rnp['points'] if q['id'] == 'FPO07')
    c.eq((fpo['lat'], fpo['lon']), (pts[1]['lat'], pts[1]['lon']), 'the FAF of the ILS is the point FPO07 of the RNP page of the same runway (same place, two names): the data agree', what='FPO07')
    c.ok(any('point initial sans nom lu des pages DATA' in w for w in d['warnings']), str([w for w in d['warnings'] if 'ILS' in w][:3]), 'and said in a warning: the table does not code it')
    ids = {q['id'] for p in d['procedures'] for q in p['points']}
    c.ok('C107' not in ids and 'F107' not in ids, 'chart names', 'the chart names (C107, F107) are not in the source data: never invented')
    # ILS 06 is unchanged: its initial fix is named in the table (IPO06), the DATA page has « REF IPO06 », no second initial fix
    i6 = next(p for p in d['procedures'] if p['runways'] == ['06'] and 'ILS' in p['name'])
    c.eq([q['id'] for q in i6['points']][:3], ['IPO06', 'FAF06', 'RW06'], 'ILS 06 unchanged: the initial fix of the table, then FAF06, the threshold', what='ILS 06')
    # the initial fix is added only when it is on the final: a position 60 degrees off the runway is not added, and said
    legs = [{'id': 'PO412', 'leg': 'TF', 'alt': None, 'over': None, 'gap': True}]
    w = []
    out = P.with_threshold(legs, ['07'], {'RW07': (48.719408, 2.358592)}, w, {'faf': {}, 'if': {'07': (48.9, 2.2)}, 'true': {'07': 73.0}})
    c.ok([x['id'] for x in out] == ['RW07', 'PO412'] and any('pas sur la finale' in x for x in w), f'{out} {w}', 'an initial fix off the final axis is not added, and said')
    # parse_if reads the unnamed initial fixes only: « REF IPO06 » (a named one) is left to the coding table
    c.eq(P.parse_if(rows('AD_2_LFPO_DATA_02')), {'07': (48.668083, 2.082889)}, 'parse_if: only the row that prints a position', what='parse_if')


@case('K72', 'chartsUrl(icao): the page of an aerodrome in its State\'s official AIP (France: SIA eAIP, Spain: ENAIRE, Ireland: AirNav), null elsewhere', 'K', tags=('aerodb',), phone=False,
      rule='Lot C2 (5 Nov 2026, SOG-0024): Features SOG consumes the address; the French page is of the published cycle of the zone fr, the Irish one of the published edition of the zone ie (the folder of an edition changes each cycle: nothing without it), the Spanish one is fixed')
def k72(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-05T12:00:00Z'), meta = (z, cy) => ({ schema: 2, zone: z, cycle: cy, kind: 'meta', parserVersion: 21, data: { builtAt: cy + 'T10:00:00Z' } });
      const mk = files => AeroDB.create({ reader: { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} }, lnmperf: false, now: () => day });
      const both = mk({ 'sia/base/fr/2026-10-29/meta.json': meta('fr', '2026-10-29'), 'sia/base/ie/2026-10-29/meta.json': meta('ie', '2026-10-29') }),
        none = mk({});
      const ask = async (db, codes) => Object.fromEntries(await Promise.all(codes.map(async k => [k, await db.chartsUrl(k)])));
      return { both: await ask(both, ['LFPO', 'lfpo', 'LEAM', 'GCLP', 'EIDW', 'EGLL', 'LF', 'LFPO1', '', null, 'KSET']), none: await ask(none, ['LFPO', 'EIDW', 'LEMD']) };
    }""")
    eaip = 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026/FRANCE/AIRAC-2026-10-29/html/eAIP/FR-AD-2.LFPO-fr-FR.html'
    c.eq((r['both']['LFPO'], r['both']['lfpo']), (eaip, eaip), 'France: the AD 2 page of the eAIP of the published cycle of the zone fr (lower case accepted)', what='France')
    c.eq((r['both']['LEAM'], r['both']['GCLP']), ('https://aip.enaire.es/AIP/contenido_AIP/AD/AD2/LEAM/LE_AD_2_LEAM_en.html', 'https://aip.enaire.es/AIP/contenido_AIP/AD/AD2/GCLP/LE_AD_2_GCLP_en.html'),
         'Spain (LE and GC): the aerodrome page of ENAIRE, which lists the charts', what='Spain')
    c.eq(r['both']['EIDW'], 'https://www.airnav.ie/AIRAC/2026-10-29-AIRAC/html/eAIP/EI-AD-2.EIDW-en-IE.html', 'Ireland: the AD 2 page of the published edition of the zone ie', what='Ireland')
    c.eq([r['both'][k] for k in ('EGLL', 'LF', 'LFPO1', '', 'KSET')] + [r['both'].get('null')], [None] * 6, 'any other State, a code that is not four letters: null', what='others')
    c.eq(r['none'], {'LFPO': 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_29_OCT_2026/FRANCE/AIRAC-2026-10-29/html/eAIP/FR-AD-2.LFPO-fr-FR.html', 'EIDW': None,
                     'LEMD': 'https://aip.enaire.es/AIP/contenido_AIP/AD/AD2/LEMD/LE_AD_2_LEMD_en.html'},
         'nothing published: France falls back on the cycle in force, Ireland gives nothing, Spain does not depend on the base', what='unpublished')


@case('K74', 'Build job: the page is offered the raw SIA files of the new place apart, and the result says what the build was built with (the cycle per source, the previous kept, where the SIA files came from)', 'K', static=True,
      rule='DATA_MAP § 4 freshness rule, lot C2 (5 Nov 2026): the newest cycle of each source wins, a source without an entry for the cycle in force keeps the previous one, said in the result (« construit avec 2610 »), never silently')
def k74(c):
    import json
    import tempfile
    RJ, B, fn, check = _d5_modules()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data, fake = _d5_scene(td)                                   # the scene has sia/XML_SIA_2026-10-01.xml at the old place
        new = data / 'local' / 'sources' / 'sia' / '2026-10-29'
        new.mkdir(parents=True)
        (new / 'XML_SIA_2026-10-29.xml').write_text('<x/>', encoding='utf-8')
        (new / 'AIXM4.5_all_FR_OM_2026-10-29.xml').write_text('<x/>', encoding='utf-8')
        _d5_modes(fake, {'fr': 'ok', 'de': 'ok'})
        run = _D5Run(RJ, data, fake, {'zones': ['fr', 'de']})
        view = run.wait()
        res = view['result']
        offer = json.loads(_d5_lines(fake, 'claim.json')[0])
        c.eq(offer['sources'], [{'source': 'sia', 'cycle': '2026-10-29', 'name': 'AIXM4.5_all_FR_OM_2026-10-29.xml'}, {'source': 'sia', 'cycle': '2026-10-29', 'name': 'XML_SIA_2026-10-29.xml'}],
             'the page is offered the raw SIA files of the new place as { source, cycle, name } (it reads /data/local/sources/sia/<cycle>/<name>)', what='offered sources')
        c.ok('XML_SIA_2026-10-01.xml' in offer['inputs'] and 'XML_SIA_2026-10-29.xml' not in offer['inputs'] and 'AIXM4.5_all_FR_OM_2026-10-29.xml' not in offer['inputs'], str(offer['inputs']),
             'the entries of data/sia/ are offered apart: the old copy stays there (fall-back), the moved ones are not offered twice')
        cur = B.airac_in_force()
        c.eq((res['cycle'], res['builtWith']['sia'], res['siaFrom']), ('2026-10-29', '2026-10-29', {'new': ['AIXM4.5_all_FR_OM_2026-10-29.xml', 'XML_SIA_2026-10-29.xml'], 'legacy': ['XML_SIA_2026-10-01.xml']}),
             'built with the SIA of 2026-10-29, the files read at the new place named, the old copy that is still at the old place named too', what='built with')
        c.eq(res['previous'], [{'source': 'sia', 'cycle': '2026-10-29', 'current': cur}] if '2026-10-29' < cur else [], 'a source whose cycle in force has no file keeps the previous one: said', what='previous')


@case('K75', 'The Little Navmap files are no longer followed by themselves: no pass at load, none on a folder being set; the service stays for an explicit sync, import and export', 'K', tags=('aerodb',), phone=False,
      rule='modules/aircraft § 10.35 (5 Nov 2026, SOG-0023): the sheet JSON is the only source; .lnmperf is an import through the preview or an explicit export, never a silent synchronisation')
def k75(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const mk = opts => AeroDB.create({ reader: { read: async () => null, list: async () => [], watch: () => () => {}, put: async () => ({}) }, launcher: { info: () => ({ launcher: true }) }, ...opts });
      const calls = [];
      const origCreate = null;
      const a = mk({});                                      // default: the production path
      await new Promise(r => setTimeout(r, 2600));         // the old delay was 1.5 s
      const afterDefault = typeof window.AeroDBLnmperf;
      const svc = await a.lnmperf();                         // the service stays, on request
      const hasApi = ['start', 'sync', 'status', 'folder', 'setFolder', 'download', 'card'].every(k => typeof svc[k] === 'function');
      return { afterDefault, hasApi, state: svc.status().state };
    }""")
    c.eq((r['afterDefault'], r['hasApi']), ('undefined', True), 'by default nothing is loaded at start (the old code loaded lnmperf.js 1.5 s after the page and started it); the service stays available on request', what='default')
    c.ok(r['state'] in ('idle', 'off'), r['state'], 'and the service on request has not run a pass')
    src = (ROOT / 'frame' / 'aerodb' / 'aerodb.js').read_text(encoding='utf-8')
    lnm = (ROOT / 'frame' / 'aerodb' / 'lnmperf.js').read_text(encoding='utf-8')
    c.ok(re.search(r'lnmperf: lnmAuto =\s*false', src), 'lnmAuto', 'the option is off by default (true only for an explicit opt-in)')
    c.ok(not re.search(r'if \(r\.folder && !started\) start\(\)', lnm), 'setFolder', 'setting the folder starts no follow either: « Synchroniser maintenant » makes the pass')
    k = src.index('c.start()')
    c.ok('if (lnmAuto &&' in src[max(0, k - 400):k] and src.count('c.start()') == 1, 'start', 'aerodb calls start() once, under the explicit option')


@case('K121', 'EUROCONTROL FRA points as a LOCAL layer (SOG-0153): the job route/fra-points reads the book in force on the workstation, the page answers NOSLI / MOKNI / ADVOP from it when no published zone has them, in memory only, never written; a published place still wins', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0153 (10 Nov 2026, decision of the user: « Points FRA, on prend »): ESSB → LEMO failed on NOSLI, MOKNI, ADVOP, which only the FRA book names (Sweden and Denmark have no point source: openAIP carries none); the book is read on each workstation (EUROCONTROL, the company’s use, private data repository only), served to the page by a read-only job, kept in memory, and never copied into data/sia/base')
def k121(c):
    import gzip
    import importlib
    import json
    import os
    import sys
    import tempfile
    import time
    from pathlib import Path
    RJ = _regen()
    R = importlib.import_module('regen.route')
    row = lambda i, v: {'row': i, 'v': v}
    book = lambda start, rows: {'file': f'fra-{start}.xlsx', 'start': start, 'sha256': '0' * 64, 'rows': rows}
    fir = lambda ident, lat, lon, f: ['', '', ident, lat, lon, 'BOREALIS FRA', 'I', '-', '', '', '-', 'FL285 / FL660', 'H24', f, '']
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'route').mkdir(parents=True)
        books = [book('2026-10-01', [row(2, fir('OLDPT', 'N590000', 'E0170000', 'ESAA'))]),
                 book('2026-10-29', [row(2, fir('NOSLI', 'N590416', 'E0171529', 'ESAA')), row(3, fir('MOKNI', 'N573847', 'E0150405', 'ESAA')), row(4, fir('ADVOP', 'N560714', 'E0120702', 'EKDK')),
                                     row(5, fir('NOSLI', 'N590416', 'E0171529', 'ESAA')), row(6, fir('BAD', 'x', 'y', 'ESAA')), row(7, ['DEL'] + fir('GONE', 'N590000', 'E0170000', 'ESAA')[1:])]),
                 book('2026-11-26', [row(2, fir('FUTUR', 'N590000', 'E0170000', 'ESAA'))])]
        with gzip.open(data / 'route' / 'fra.json.gz', 'wt', encoding='utf-8') as f:
            json.dump(books, f)

        class Job:
            def step(self, *a):
                pass
        ctx = {'data': str(data)}
        res = R.fra_points(Job(), {'date': '2026-11-10'}, ctx)
        ids = sorted(p[0] for p in res['_points'])
        c.eq((res['ok'], res['cycle'], res['count'], ids), (True, '2026-10-29', 3, ['ADVOP', 'MOKNI', 'NOSLI']),
             'the book in force on the date (not the next cycle, not the old one), a duplicate and an unreadable row dropped, a deleted row dropped', what='job')
        nosli = [p for p in res['_points'] if p[0] == 'NOSLI'][0]
        c.ok(abs(nosli[1] - 59.07111) < 1e-4 and abs(nosli[2] - 17.25806) < 1e-4 and nosli[3] == 'ESAA', str(nosli), 'the position is read from the book (degrees, minutes, seconds) with its FIR')
        c.eq((R.check_fra_points({}), R.check_fra_points({'date': '2026-11-10'}), R.check_fra_points({'x': 1}), R.check_fra_points({'date': '10 Nov'})), ({}, {'date': '2026-11-10'}, None, None),
             'arguments: none, or a date; anything else is a 400', what='check')
        c.eq(R.fra_points(Job(), {}, {'data': str(Path(td) / 'nowhere')})['reason'], 'no-fra', 'without the book: no-fra, said', what='no book file')
        # through the real jobs: the points reach the page, never the last-job file, and a read does not replace the last job that wrote
        store = os.path.join(td, '.regen_last.json')
        reg = {('t', 'build'): (lambda job, a, x: {'ok': True}, lambda a: {}), ('route', 'fra-points'): (lambda job, a, x: R.fra_points(job, a, ctx), R.check_fra_points)}
        j = RJ.Jobs(reg, ctx, min_gap={}, store=store)
        for key in (('t', 'build'), ('route', 'fra-points')):
            j.start(*key, {})
            for _ in range(100):
                if j.cur.data['state'] != 'running':
                    break
                time.sleep(0.05)
            time.sleep(0.1)
        saved = open(store, encoding='utf-8').read()
        c.eq(('_points' in saved, 'NOSLI' in saved, json.loads(saved)['work']['verb'], len(j.cur.view()['result']['_points'])), (False, False, 'build', 3),
             'the page gets the points; tools/.regen_last.json never holds them; the read does not replace the last job that wrote', what='store')
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-10T12:00:00Z'), kinds = ['meta', 'aerodromes', 'navaids', 'points', 'vrp', 'airways'];
      const zone = (z, o = {}) => Object.fromEntries(kinds.map(k => [`sia/base/${z}/2026-10-29/${k}.json`, k === 'meta' ? { schema: 2, zone: z, cycle: '2026-10-29', kind: 'meta', parserVersion: 23, data: {} } : { schema: 2, zone: z, cycle: '2026-10-29', kind: k, data: o[k] || [] }]));
      const files = { ...zone('se', { aerodromes: [{ id: 'ESSB', icao: 'ESSB', lat: 59.354, lon: 17.941, name: 'BROMMA' }] }), ...zone('fr', { points: [{ id: 'MOKNI', lat: 45.0, lon: 2.0 }] }),
        'sia/base/index.json': { schema: 2, kind: 'index', zones: { se: { cycle: '2026-10-29', prefixes: ['ES'], kb: { airways: 1, points: 1 } }, fr: { cycle: '2026-10-29', prefixes: ['LF'], kb: { airways: 1, points: 1 } } } } };
      const reader = { read: async p => p in files ? { value: files[p], rev: 'r' } : null, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} };
      const calls = [], points = [['NOSLI', 59.07111, 17.25806, 'ESAA'], ['MOKNI', 57.64639, 15.06806, 'ESAA'], ['ADVOP', 56.12056, 12.11722, 'EKDK'], ['BAD<>', 1, 2, 'X'], ['NOPOS', 'x', 2, 'X']];
      let ok = true;
      const launcher = { info: () => ({}), job: async (route, body) => { calls.push([route, body.set, body.verb]); return ok ? { state: 'done', result: { ok: true, cycle: '2026-10-29', count: points.length, _points: points } } : { state: 'done', result: { ok: false, reason: 'no-fra' } }; } };
      const db = AeroDB.create({ reader, launcher, lnmperf: false, now: () => day });
      const out = {};
      out.nosli = await db.coords('NOSLI');
      out.near = await db.coords('NOSLI', { near: [58, 12] });
      out.advop = (await db.whereIs('ADVOP')).found;
      out.published = await db.coords('MOKNI');
      out.publishedNear = await db.coords('MOKNI', { near: [57.5, 15] });
      out.bad = [await db.coords('BAD'), await db.coords('NOPOS')];
      out.aerodrome = (await db.coords('ESSB')).kind;
      out.calls = calls.slice();
      const none = AeroDB.create({ reader, lnmperf: false, now: () => day });
      out.noLauncher = await none.coords('NOSLI');
      ok = false;
      const before = calls.length, down = AeroDB.create({ reader, launcher, lnmperf: false, now: () => day });
      out.noBook = [await down.coords('NOSLI'), await down.coords('NOSLI')];
      out.noBookCalls = calls.length - before;
      return out;
    }""")
    c.eq((r['nosli']['kind'], r['nosli']['local'], r['nosli']['source'], r['nosli']['fir'], round(r['nosli']['lat'], 3)), ('point', True, 'eurocontrol-fra', 'ESAA', 59.071),
         'NOSLI, in no published zone, is the FRA point of the workstation: a point, flagged local, with its source and its FIR', what='nosli')
    c.eq((r['near']['local'], r['near']['zone'], r['near']['distanceNm'] > 50, r['advop']['source']), (True, 'fra', True, 'eurocontrol-fra'), 'with a neighbourhood too, and whereIs finds it (found, not unknown)', what='near')
    c.eq((r['published'].get('local'), r['publishedNear'].get('local'), r['publishedNear']['zone']), (None, None, 'fr'), 'a place of a published zone wins: the FRA book is read only when nothing is found there', what='published')
    c.eq((r['bad'], r['aerodrome'], r['noLauncher']), ([None, None], 'aerodrome', None), 'an identifier or a position that is not one is dropped; without a launcher there is no FRA layer', what='bad')
    c.eq(r['calls'], [['regen/job', 'route', 'fra-points']], 'one read-only job asks for the points, once (kept in memory)', what='calls')
    c.eq((r['noBook'], r['noBookCalls']), ([None, None], 1), 'without a book on the workstation the answer is null and the job is not asked again within 30 s', what='no book')


@case('K122', 'LFV eAIP reader (SOG-0153 b): the offline AIP of Sweden gives its designated points (ENR 4.4) and RNAV routes (ENR 3.2) as the GeoJSON the build reads, the pages read out of the archive without unpacking it, the edition date from the cover page, a foreign archive refused', 'K', static=True,
      rule='SOG-0153 (10 Nov 2026, decision of the user): « lecteur LFV » — NOSLI, MOKNI and the Swedish airways have no source but the eAIP of LFV (AIP_OFFLINE.zip, 988 MB, mostly PDF charts): the reader opens only ES-ENR 4.4, ES-ENR 3.2 <route> and the cover page of the archive, writes lfv_se_enr_<date>.geojson (same shape as the Irish one); positions of SID/STAR waypoints are on PDF charts only, not read')
def k122(c):
    import importlib
    import json
    import sys
    import tempfile
    import zipfile
    from pathlib import Path
    sys.path.insert(0, str(c.root / 'tools'))
    L = importlib.import_module('lfv_eaip')
    cell = lambda t: f'<td rowspan="1" colspan="1"><span><span>{t}</span></span></td>'
    row = lambda rid, *cells: f'<tr id="{rid}">' + ''.join(cell(x) for x in cells) + '</tr>'
    cover = '<html><body><h1>SWEDEN</h1><p>Effective date : 29 OCT 2026</p><p>Publication date : 24 SEP 2026</p></body></html>'
    enr44 = '<table>' + row('ENR4.4_H1', 'Name-code', 'Coordinates', 'Use') + row('NOSLIENR44', 'NOSLI', '590422N 0171529E', 'N850, T31, ESSA SID') + row('MOKNIENR44', 'MOKNI', '573847N 0150405E', 'N850') \
        + row('BADENR44', 'BAD', 'xx', 'none') + '</table>'

    def route(name, pts):
        out = row('723', f'{name} (RNAV)')
        for pid, label, pos, up, lo in pts:
            out += row(pid, '∆', f'{label} {pos}') + row(pid + '_1', '', '', '-') + row(pid + 'row8', up) + row(pid + 'row9', lo) + row(pid + 'row10', 'Class C')
        return '<table>' + out + '</table>'
    n850 = route('N850', [('MISBI', 'MISBI FIR BDRY', '555355N 0124021E', 'FL 285', 'FL 095'), ('NOSLI', 'NOSLI', '590422N 0171529E', 'FL 660', 'FL 095'),
                          ('OSS', 'ÖSTERSUND DVOR/DME (OSS)', '631158N 0142915E', 'FL 660', 'FL 095')])
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        zp = Path(td) / 'AIP_OFFLINE.zip'
        with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('ES-Cover Page-en-GB.html', cover)
            z.writestr('eAIP/ES-ENR 4.4-en-GB.html', enr44)
            z.writestr('eAIP/ES-ENR 3.2 N850-en-GB.html', n850)
            z.writestr('eAIP/ES-ENR 3.2 N850-sv-SE.html', n850.replace('RNAV', 'XXXX'))      # the Swedish pages are not read
            z.writestr('documents/PDF/ES-ENR 6.1.pdf', b'%PDF-1.4 ' + b'0' * 1000)         # a chart is never opened
        g, issue, n_pts, n_seg, n_routes = L.convert(str(zp))
        props = [f['properties'] for f in g['features']]
        pts = {p['id']: f['geometry']['coordinates'] for p, f in zip(props, g['features']) if p['sog'] == 'point'}
        aw = [p for p in props if p['sog'] == 'airway']
        c.eq((issue, n_pts, n_seg, n_routes, L.out_name(issue)), ('2026-10-29', 4, 2, 1, 'lfv_se_enr_20261029.geojson'),
             'the edition is the effective date of the cover page; the points of ENR 4.4 (a bad position dropped) plus the ones a route names that ENR 4.4 does not list; two segments for three points of one route', what='counts')
        c.ok(abs(pts['NOSLI'][1] - 59.07278) < 1e-4 and abs(pts['NOSLI'][0] - 17.25806) < 1e-4 and 'OSS' in pts and 'MISBI' in pts and 'BAD' not in pts, str(sorted(pts)),
             'NOSLI at its position (degrees, minutes, seconds); a beacon is named by its code (OSS); a point on a FIR boundary by its name (MISBI)')
        c.eq([(a['route'], a['a'], a['b'], a['lower'], a['upper']) for a in aw], [('N850', 'MISBI', 'NOSLI', 9500, 28500), ('N850', 'NOSLI', 'OSS', 9500, 66000)],
             'a segment runs from a point to the next with the limits read after the first one (upper, then lower), and no direction is invented', what='segments')
        c.eq(('dir' in aw[0], g['name'], g['features'][0]['geometry']['type']), (False, 'lfv_se_enr', 'Point'), 'the shape of the Irish file (point and airway features), no `dir`', what='shape')
        json.dumps(g)
        # refusals: a foreign archive, a cover without the date, a layout without any point
        for label, files in (('foreign', {'index.html': '<html/>'}),
                             ('no date', {'ES-Cover Page-en-GB.html': '<h1>SWEDEN</h1>', 'eAIP/ES-ENR 4.4-en-GB.html': enr44}),
                             ('no point', {'ES-Cover Page-en-GB.html': cover, 'eAIP/ES-ENR 4.4-en-GB.html': '<table></table>', 'eAIP/ES-ENR 3.2 N850-en-GB.html': n850}),
                             ('wrong route', {'ES-Cover Page-en-GB.html': cover, 'eAIP/ES-ENR 4.4-en-GB.html': enr44, 'eAIP/ES-ENR 3.2 T31-en-GB.html': n850})):
            bad = Path(td) / f'{label}.zip'
            with zipfile.ZipFile(bad, 'w') as z:
                for k, v in files.items():
                    z.writestr(k, v)
            try:
                L.convert(str(bad))
                got = 'accepted'
            except ValueError:
                got = 'refused'
            c.eq(got, 'refused', f'{label}: refused with a message, nothing written', what=label)


@case('K124', 'Hours and remarks of the airspaces as the AIP publishes them (SOG-0163): the SIA reader gives `hours` (txtRmkWorkHr, Timsh, the code) and `rem` (txtRmk) per space, the AIXM 5.1 reader the notes (the ones on the time interval are the hours); nothing is invented, bounded at 12 lines of 400 signs, absent when the source says nothing; parser version 24', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0163 (10 Nov 2026, BUGS SOG): the sheet of a space R / D / P (modules/maps/lv.js spaceCardHtml) answers « R 61 : actif ? quelles conditions ? » from `hours` and `rem`, which the base did not carry (SIA: 630 R, 129 D, 115 P without any text although the XML has txtRmkWorkHr on 3 961 of its 4 497 airspaces, txtRmk on 3 544 and 142 time sheets)')
def k124(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      // a fresh frame: the page defines its own `AeroSources` (the Sources screen) and the reader file does not replace it
      const fr = document.createElement('iframe'); document.body.appendChild(fr); const w = fr.contentWindow;
      const load = src => new Promise((ok, no) => { const s = w.document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); w.document.head.appendChild(s); });
      await load('/shared/sia_base.js'); await load('/shared/aero_sources.js');
      const ase = (id, type, name, att, rmk = '') => `<Ase><AseUid mid="${id}"><codeType>${type}</codeType><codeId>${name}</codeId></AseUid><txtName>${name}</txtName><codeDistVerUpper>STD</codeDistVerUpper><valDistVerUpper>195</valDistVerUpper><uomDistVerUpper>FL</uomDistVerUpper><codeDistVerLower>HEI</codeDistVerLower><valDistVerLower>0</valDistVerLower><uomDistVerLower>FT</uomDistVerLower>${att ? `<Att>${att}</Att>` : ''}${rmk ? `<txtRmk>${rmk}</txtRmk>` : ''}</Ase>`;
      const abd = id => `<Abd><AbdUid><AseUid mid="${id}"/></AbdUid><Avx><codeType>GRC</codeType><geoLat>450000N</geoLat><geoLong>0010000E</geoLong></Avx><Avx><codeType>GRC</codeType><geoLat>450000N</geoLat><geoLong>0020000E</geoLong></Avx><Avx><codeType>GRC</codeType><geoLat>460000N</geoLat><geoLong>0020000E</geoLong></Avx></Abd>`;
      const many = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('#');
      const xml = `<AIXM-Snapshot>${ase('1', 'R', 'LFR61', '<codeWorkHr>HX</codeWorkHr><txtRmkWorkHr>Possible activation MON-FRI 0800-1700.#(SUM -1HR)</txtRmkWorkHr>', 'Administrator : CCER Bordeaux.#Avoid the area when active.#AZBA charts')}${abd('1')}`
        + `${ase('2', 'D', 'LFD3', '<codeWorkHr>H24</codeWorkHr><txtRmkWorkHr>H24</txtRmkWorkHr>')}${abd('2')}`
        + `${ase('3', 'R', 'LFR5', '<codeWorkHr>H24</codeWorkHr>')}${abd('3')}`
        + `${ase('4', 'D', 'LFD9', '<codeWorkHr>HX</codeWorkHr><Timsh><codeTimeRef>UTC</codeTimeRef><dateValidWef>01-10</dateValidWef><dateValidTil>31-03</dateValidTil><codeDay>MON</codeDay><codeDayTil>FRI</codeDayTil><timeWef>0800</timeWef><timeTil>1700</timeTil></Timsh>', many)}${abd('4')}`
        + `${ase('5', 'P', 'LFP7', '')}${abd('5')}</AIXM-Snapshot>`;
      const out = w.SiaBase.parseAixmAirspaces(new w.DOMParser().parseFromString(xml, 'application/xml'));
      const by = k => out.find(a => a.key === k);
      const aixm5 = `<AIXMBasicMessage xmlns:aixm="http://www.aixm.aero/schema/5.1.1" xmlns:gml="http://www.opengis.net/gml/3.2"><aixm:Airspace gml:id="a1"><aixm:timeSlice><aixm:AirspaceTimeSlice gml:id="t1"><aixm:type>R</aixm:type><aixm:designator>EGR1</aixm:designator><aixm:name>TEST R</aixm:name>`
        + `<aixm:activation><aixm:AirspaceActivation gml:id="x"><aixm:annotation><aixm:Note gml:id="n1"><aixm:propertyName>timeInterval</aixm:propertyName><aixm:translatedNote><aixm:LinguisticNote gml:id="l1"><aixm:note lang="eng">Activated by NOTAM.</aixm:note></aixm:LinguisticNote></aixm:translatedNote></aixm:Note></aixm:annotation></aixm:AirspaceActivation></aixm:activation>`
        + `<aixm:annotation><aixm:Note gml:id="n2"><aixm:propertyName>name</aixm:propertyName><aixm:translatedNote><aixm:LinguisticNote gml:id="l2"><aixm:note lang="eng">Birds of prey.</aixm:note></aixm:LinguisticNote></aixm:translatedNote></aixm:Note></aixm:annotation>`
        + `<aixm:geometryComponent><aixm:AirspaceGeometryComponent><aixm:theAirspaceVolume><aixm:AirspaceVolume><aixm:upperLimit uom="FL">100</aixm:upperLimit><aixm:horizontalProjection><aixm:Surface><gml:patches><gml:PolygonPatch><gml:exterior><gml:Ring><gml:curveMember><gml:Curve gml:id="c1"><gml:segments><gml:GeodesicString><gml:posList>50 0 50 1 51 1 50 0</gml:posList></gml:GeodesicString></gml:segments></gml:Curve></gml:curveMember></gml:Ring></gml:exterior></gml:PolygonPatch></gml:patches></aixm:Surface></aixm:horizontalProjection></aixm:AirspaceVolume></aixm:theAirspaceVolume></aixm:AirspaceGeometryComponent></aixm:geometryComponent>`
        + `</aixm:AirspaceTimeSlice></aixm:timeSlice></aixm:Airspace></AIXMBasicMessage>`;
      let five = null;
      try { five = w.AeroSources.aixm5(aixm5); } catch (e) { five = { error: String(e) }; }
      return { n: out.length, r61: by('LFR61'), d3: by('LFD3'), r5: by('LFR5'), d9: by('LFD9'), p7: by('LFP7'), five: five && five.airspaces && five.airspaces[0] ? five.airspaces[0] : five };
    }""")
    r61, d3, r5, d9, p7 = (r[k] for k in ('r61', 'd3', 'r5', 'd9', 'p7'))
    c.eq((r61['hours'], r61['rem'], r61['azba']), (['Possible activation MON-FRI 0800-1700.', '(SUM -1HR)'], ['Administrator : CCER Bordeaux.', 'Avoid the area when active.', 'AZBA charts'], True),
         'R 61: the hours as published (the « # » of the source separates the lines), the remarks as published, AZBA still detected', what='r61')
    c.eq((d3['hours'], 'rem' in d3), (['H24'], False), 'a D that works H24: its hours; no remark: no `rem` (absent, not empty)', what='d3')
    c.eq((r5['hours'], 'rem' in r5, 'hours' in p7, 'rem' in p7), (['H24'], False, False, False), 'only a code H24 gives « H24 »; a space with nothing published carries neither field', what='codes')
    c.eq((d9['hours'], len(d9['rem']), max(len(x) for x in d9['rem'])), (['MON-FRI 0800-1700 UTC (01-10 → 31-03)'], 12, 7), 'a time sheet is written out; the remarks are bounded at 12 lines', what='d9')
    c.eq(r['n'], 5, 'every space is still read', what='count')
    five = r['five']
    c.eq((five.get('hours'), five.get('rem'), five.get('act')) if isinstance(five, dict) else five, (['Activated by NOTAM.'], ['Birds of prey.'], 'NOTAM'),
         'AIXM 5.1 (NATS, ENAIRE): the note on the time interval is the hours, the other notes the remarks', what='aixm5')
    sv = [m.group(1) for m in [re.search(r'const VERSION =\s*(\d+)', (ROOT / 'shared' / 'sia_base.js').read_text(encoding='utf-8'))]]
    c.ok(int(sv[0]) >= 24, str(sv), 'the parser version is 24 or more: the zones built before have no hours or remarks and are rebuilt (parser-old)')


@case('K125', 'Route engine, the longest route that can be said (SOG-0161): no SID / STAR and no airway at the ends, the departure joins the FRA gate that its climb can reach, every leg is classed (controlled / incomplete / fallback) by layer with the share of the distance controlled', 'K', static=True,
      rule='SOG-0161 (10 Nov 2026, the user): ESSB → LEMO answered « CALCUL IMPOSSIBLE » (« portes FRA proches au plancher minimal FL285, non atteignable… ») because the engine joined an aerodrome only to a point within 40 NM and no SID of Sweden is read; the FRA book names the departure and arrival points of each aerodrome (« D », « A »), the floor of the free-route area (FL285) is reached after the climb distance (~107 NM at 2000 ft/min and 450 kt): the gate is a connector beyond the radius when the climb can reach it, never one that it cannot; the result says, leg by leg and by layer (SID, LOW, HIGH, FRA, STAR), what is controlled, what is a candidate (FRA) and what is a simulation fallback, and the share of the distance controlled')
def k125(c):
    import gzip
    import json
    import os
    import tempfile
    RJ = _regen()
    import route_fixture as RF
    from route_engine import import_books as I
    fn = RJ.REGISTRY[('route', 'compute')][0]
    fir = lambda ident, lat, lon, role, term, arr, dep, floor: ['', '', ident, lat, lon, 'TESTFRA', role, term, arr, dep, '-', f'FL{floor} / FL660', 'H24', 'XXXX', '']
    rows = [fir('GATED', 'N570000', 'E0170000', 'I', 'D', '', 'XSTA', 285), fir('NEARD', 'N583000', 'E0180000', 'I', 'D', '', 'XSTA', 285),
            fir('MIDA1', 'N550000', 'E0150000', 'I', '-', '', '', 285), fir('MIDA2', 'N530000', 'E0130000', 'I', '-', '', '', 285), fir('MIDA3', 'N523000', 'E0113000', 'I', '-', '', '', 285),
            fir('GATEA', 'N520000', 'E0100000', 'I', 'A', 'XEND', '', 285)]
    book = {'file': 'fra-test.xlsx', 'start': '2026-10-29', 'sha256': '0' * 64, 'rows': [{'row': i + 2, 'v': v} for i, v in enumerate(rows)]}
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = os.path.join(td, 'data')
        os.makedirs(data)
        RF.make_base(data)
        d = os.path.join(data, 'sia', 'base', 'xx', '2026-10-29')
        # two aerodromes with no airway near them and no procedure: Sweden's case (the only airways of the base are far away, in France and Ireland)
        with open(os.path.join(d, 'aeroindex.json'), encoding='utf-8') as f:
            ai = json.load(f)
        ai['data']['rows'] += [['XSTA', 'DEPART', 59.0, 18.0, 20, 0, 0], ['XEND', 'ARRIVE', 50.0, 10.0, 300, 0, 0]]
        with open(os.path.join(d, 'aeroindex.json'), 'w', encoding='utf-8') as f:
            json.dump(ai, f)
        rad = os.path.join(td, 'RAD_2611_v1_0.xlsx')
        RF.write_xlsx(rad, RF.rad_sheets())
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
        with gzip.open(os.path.join(data, 'route', 'fra.json.gz'), 'wt', encoding='utf-8') as f:
            json.dump([book], f)
        ctx = {'data': data, 'secrets': td}
        r = fn(RJ.Job('route', 'compute', {}, author='TST'), {'dep': 'XSTA', 'arr': 'XEND', 'fl': 350, 'date': '2026-11-10T12:00', 'enable_fra': True}, ctx)
        p = r['plan']['primary']
        legs = p.get('legs') or []
        c.eq((r['ok'], p['ok']), (True, True), 'the plan exists: the departure joins the FRA book, the arrival leaves it', what='plan')
        ids = [legs[0]['start']['id']] + [l['end']['id'] for l in legs] if legs else []
        c.eq((ids[:2], ids[-2:], 'NEARD' in ids), (['XSTA', 'GATED'], ['GATEA', 'XEND'], False),
             'the departure joins GATED (120 NM, the climb to FL285 needs 107 NM) and NOT NEARD (30 NM: the floor cannot be reached); the arrival leaves by GATEA', what='gates')
        c.eq([(legs[0]['layer'], legs[0]['control']), set((l['layer'], l['control']) for l in legs[1:-1]) == {('FRA', 'incomplete')}, (legs[-1]['layer'], legs[-1]['control'])], [('SID', 'fallback'), True, ('STAR', 'fallback')],
             'each leg is classed by layer: the connectors are fallbacks (no SID, no STAR read), the FRA links are candidates', what='legs')
        ctl = p['control']
        c.eq([(s['layer'], s['control']) for s in ctl['sections']], [('SID', 'fallback'), ('FRA', 'incomplete'), ('STAR', 'fallback')], 'neighbouring legs of the same layer and class form one section', what='sections')
        c.ok(ctl['controlled_pct'] == 0 and 5 < ctl['fallback_pct'] < 40 and abs(ctl['controlled_pct'] + ctl['incomplete_pct'] + ctl['fallback_pct'] + ctl['error_pct'] - 100) < .2, str({k: v for k, v in ctl.items() if k != 'sections'}),
             'the shares of the distance add up to 100 %: nothing here is controlled, the connectors are a small part')
        c.ok(legs[0]['nm'] >= 107 and 'SID' in legs[0]['control_reason'], str(legs[0]['control_reason']), 'the first connector is at least the climb distance and says that no SID was read')
        # the screen's shape carries the classes (Fuel's form)
        from route_engine import view
        v = view.to_view(r['plan'], {'fl': 350, 'mode': 'calculate'})
        a0 = v['alternatives'][0]
        c.eq((a0['control']['controlledPct'], [s['control'] for s in a0['segments']][:2], a0['segments'][0]['layer'], [s['layer'] for s in a0['control']['sections']]), (0, ['fallback', 'incomplete'], 'SID', ['SID', 'FRA', 'STAR']),
             'the screen’s answer gives, by alternative, the share controlled and its sections, and by segment its class and its layer', what='view')


@case('K126', 'Suggestions of aerodromes for an input, across every published zone, from the light index (SOG-0158): a code, the start of a name or of a word of it (the town), a country by its four names, its endonym or its initials, the main aerodromes first; no zone is opened whole', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0158 (10 Nov 2026, refused at the acceptance: « SWE… fonctionne. STOC… ne fonctionne pas. USA non plus »): the input of the aerodrome fields found only the zones the flight had opened; AeroDb.suggest reads the light index of every published zone (aeroindex, a tenth of aerodromes.json, 438 KB for the 71 zones), kept in memory, and answers a code, a name (« stockholm » finds « STOCKHOLM / BROMMA »), a country (« suède », « sverige », « usa ») with its main aerodromes, the longest hard runway first (hardLen, new column of aeroindex, parser version 25); zones() gives the endonyms and initials under `aka`')
def k126(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-10T12:00:00Z'), reads = [];
      const kinds = ['meta', 'aerodromes', 'aeroindex', 'navaids', 'points', 'vrp', 'airways', 'airspaces'];
      const fields = ['icao', 'name', 'lat', 'lon', 'elev', 'bearing', 'magVar', 'hardLen', 'type'];
      const zone = (z, rows) => Object.fromEntries(kinds.map(k => [`sia/base/${z}/2026-10-29/${k}.json`, k === 'meta' ? { schema: 2, zone: z, cycle: '2026-10-29', kind: 'meta', parserVersion: 25, data: {} }
        : k === 'aeroindex' ? { schema: 2, zone: z, cycle: '2026-10-29', kind: k, data: { fields, rows: rows.map(r => r.length === 8 ? [...r, 'AD'] : r) } } : { schema: 2, zone: z, cycle: '2026-10-29', kind: k, data: [] }]));
      const files = {
        ...zone('se', [['ESSA', 'STOCKHOLM / ARLANDA', 59.65, 17.92, 137, 0, 0, 3301], ['ESSB', 'STOCKHOLM / BROMMA', 59.35, 17.94, 47, 0, 0, 1668], ['ESGG', 'GOTEBORG / LANDVETTER', 57.66, 12.28, 506, 0, 0, 3300], ['ESKN', 'SKAVSTA', 58.79, 16.91, 140, 0, 0, null], ['ESMM', 'MILITARY AIR BASE', 56.0, 14.0, 100, 0, 0, 3900, 'MIL'], ['ESHE', 'HELI PAD', 57.0, 15.0, 10, 0, 0, 3500, 'HP']]),
        ...zone('fr', [['LFPG', 'PARIS CHARLES DE GAULLE', 49.01, 2.55, 392, 0, 0, 4200], ['LFPO', 'PARIS ORLY', 48.72, 2.38, 291, 0, 0, 3650], ['LFLL', 'LYON SAINT EXUPERY', 45.73, 5.08, 821, 0, 0, 4000]]),
        ...zone('us', [['KJFK', 'NEW YORK JOHN F KENNEDY INTL', 40.64, -73.78, 13, 0, 0, 4423], ['KLAX', 'LOS ANGELES INTL', 33.94, -118.41, 125, 0, 0, 3685]]),
        'sia/base/index.json': { schema: 2, kind: 'index', zones: Object.fromEntries(['se', 'fr', 'us'].map(z => [z, { cycle: '2026-10-29', prefixes: [z === 'se' ? 'ES' : z === 'fr' ? 'LF' : 'K'], kb: { aeroindex: 3 } }])) }
      };
      const reader = { read: async p => { reads.push(p); return p in files ? { value: files[p], rev: 'r' } : null; }, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} };
      const db = AeroDB.create({ reader, lnmperf: false, now: () => day });
      const codes = async (t, o) => (await db.suggest(t, o)).map(x => x.code + ':' + x.rank);
      const out = {};
      out.stoc = await codes('stoc'); out.stockholm = await codes('Stockholm'); out.bromma = await codes('bromma'); out.essb = await codes('essb'); out.ess = await codes('ess');
      out.suede = await codes('suède', { n: 2 }); out.suedeAll = (await db.suggest('suède', { n: 10 })).map(x => x.code + ':' + x.type); out.sverige = await codes('sverige', { n: 3 }); out.sweden = await codes('SWE', { n: 3 }); out.usa = await codes('usa'); out.uk = await codes('uk'); out.paris = await codes('paris');
      out.short = (await db.suggest('s')).length; out.n = (await db.suggest('e', { n: 1 })).length + (await db.suggest('es', { n: 2 })).length;
      out.first = (await db.suggest('usa'))[0];
      out.country = [(await db.suggest('suède', { lang: 0, n: 1 }))[0].country, (await db.suggest('suède', { lang: 1, n: 1 }))[0].country];
      out.heavy = reads.filter(p => /aerodromes\\.json|airways|airspaces/.test(p)).length;
      out.akaSe = (await db.zones()).find(z => z.id === 'se').aka;
      return out;
    }""")
    c.eq((r['stoc'], r['stockholm']), (['ESSA:3', 'ESSB:3'], ['ESSA:3', 'ESSB:3']), '« stoc » and « Stockholm » find Arlanda and Bromma (the start of the name), the longest runway first', what='town')
    c.eq((r['bromma'], r['essb'], r['ess']), (['ESSB:4'], ['ESSB:0'], ['ESSA:1', 'ESSB:1']), 'a word of the name (« bromma »), the exact code first, the start of a code (the longest runway first)', what='words')
    c.eq((r['suede'], r['sverige'], r['sweden'], r['usa']), (['ESSA:2', 'ESGG:2'], ['ESSA:2', 'ESGG:2', 'ESSB:2'], ['ESSA:2', 'ESGG:2', 'ESSB:2'], ['KJFK:2', 'KLAX:2']),
         'a country by its French name, its endonym, the start of its English name (« SWE ») or its initials (« usa »): its main aerodromes, the longest hard runway first, only those with a four-letter code', what='country')
    c.eq((r['uk'], r['paris'], r['short'], r['n']), ([], ['LFPG:3', 'LFPO:3'], 0, 2), 'a zone that is not published gives nothing (« uk »), « paris » finds both Paris aerodromes, one letter gives nothing, n bounds the list', what='bounds')
    c.eq((r['first']['country'], r['country'], r['heavy']), ('United States of America', ['Suède', 'Sweden'], 0), 'each proposal says its country in the language asked, and no airway, airspace or full aerodrome file was read', what='light')
    c.ok('Sverige' in r['akaSe'], str(r['akaSe']), 'zones() gives the endonym and the initials under `aka`')
    c.ok('hardLen' in (ROOT / 'shared' / 'sia_base.js').read_text(encoding='utf-8'), 'aeroindex', 'the builder writes hardLen in aeroindex (parser version 25)')


    c.eq(r['suedeAll'], ['ESSA:AD', 'ESGG:AD', 'ESSB:AD', 'ESKN:AD', 'ESMM:MIL', 'ESHE:HP'], 'at equal rank the civil aerodromes come before the military base (longest runway of all, 3 900 m) and the heliport: AD, then MIL / HP, each by runway length (SOG-0158: the types come from the light index)', what='types')

@case('K128', 'A failed ground reading is never silent (SOG-0046 / SOG-0135, refused at the acceptance): the job retries a busy Overpass, keeps the last result of each aerodrome (ground/state), and AeroDb.groundStatus says « failed », why and with which text, also after the page is reloaded', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0135 (10 Nov 2026, refused: « rien », data/proc/ground/ never written): after the procedures of LFPO the launcher DID start ground/fetch (its start is in tools/.regen_last.json, 36 s after the procedures job) and it wrote nothing: the failure (a busy Overpass, a refusal while the launcher sent, no data) was swallowed by the background reading and was kept nowhere; K110 saw nothing because its launcher always said yes; the job now retries a busy or unreachable Overpass twice (8 s, 20 s), keeps each aerodrome’s last result in data/local/ground_state.json (read by the read-only job ground/state), and the page keeps and announces the failure (groundStatus; on(‘change’, { ground, groundFailed }))')
def k128(c):
    import json
    import os
    import tempfile
    import urllib.error
    RJ, G = _ground_job()
    answer = (ROOT / 'frame/aerodb/test/fixtures/ground/LFPO.overpass.json').read_bytes()
    calls, slept = [], []
    seq = {'replies': []}

    def get(url, timeout=120):
        calls.append(url)
        r = seq['replies'].pop(0) if len(seq['replies']) > 1 else seq['replies'][0]
        if isinstance(r, Exception):
            raise r
        return r
    G.GET, G.SLEEP = get, slept.append
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        ctx = {'data': td, 'secrets': td}
        run = lambda icao: G.fetch(RJ.Job('ground', 'fetch', {'icao': icao}, author='TST'), {'icao': icao, 'dry': False}, ctx)
        state = lambda: RJ.REGISTRY[('ground', 'state')][0](RJ.Job('ground', 'state', {}), {}, ctx)['aerodromes']
        c.eq(state(), {}, 'ground/state: nothing yet', what='empty')
        # a busy Overpass twice, then the answer: retried (8 s then 20 s), written, the success kept
        seq['replies'] = [(429, b''), (504, b''), (200, answer)]
        r = run('LFPO')
        c.eq((r['ok'], len(calls), slept, os.path.isfile(os.path.join(td, 'proc', 'ground', 'LFPO.json')), state()['LFPO']['ok']), (True, 3, [8, 20], True, True),
             'HTTP 429 then 504 then 200: two retries (8 s, 20 s), the file is written and the success is kept', what='retry')
        # busy for good: failed after three tries, said with its text and kept
        calls.clear(); slept.clear()
        seq['replies'] = [(429, b'')]
        r = run('LFPG')
        st = state()['LFPG']
        c.eq((r['ok'], r['reason'], '429' in r['message'], len(calls), st['ok'], st['reason'], '429' in st['message']), (False, 'failed', True, 3, False, 'failed', True), 'a server busy for the three tries: failed, said (429) and kept for the aerodrome', what='busy')
        # an unreachable server: the exception is retried, then said, kept
        calls.clear(); slept.clear()
        seq['replies'] = [urllib.error.URLError('timed out')]
        r = run('LFMN')
        c.eq((r['ok'], len(calls), state()['LFMN']['ok'], 'timed out' in state()['LFMN']['message']), (False, 3, False, True), 'a server that does not answer: three tries, failed, the cause kept', what='network')
        # no data: kept too (« Sol non lu : OpenStreetMap n’a rien »)
        seq['replies'] = [(200, b'{"elements": []}')]
        run('LFZZ')
        c.eq((state()['LFZZ']['reason'], state()['LFPO']['ok']), ('no-data', True), 'no element: no-data kept for that aerodrome, the others unchanged', what='no-data')
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-10T12:00:00Z'), changes = [];
      const mk = (groundAnswer, stateAnswer) => {
        const calls = [];
        const launcher = { info: () => ({}), job: async (route, body) => {
          calls.push(body.set + '/' + body.verb);
          if (body.set === 'proc') return { state: 'done', result: { ok: true, icao: 'LFPO', procedures: 1, warnings: [], commit: null, source: 'eaip' } };
          if (body.verb === 'state') return { state: 'done', result: stateAnswer };
          return groundAnswer;
        } };
        const reader = { read: async () => null, list: async () => [], watch: () => () => {}, revalidate: async () => null };
        const db = AeroDB.create({ reader, launcher, lnmperf: false, now: () => day });
        db.on('change', e => { if (e && e.ground) changes.push(e); });
        return { db, calls };
      };
      const out = {};
      // the real path: the procedures are read, the ground follows in the background and the launcher answers « busy » (it was sending): not silent
      const a = mk({ status: 409, state: 'error', result: null, message: 'no job starts now (sync)' });
      await a.db.fetchProcedures('LFPO');
      await new Promise(r => setTimeout(r, 300));
      out.afterBusy = await a.db.groundStatus('LFPO');
      out.changeBusy = changes.map(x => [x.ground, x.groundFailed === true]);
      // a failure of the job itself (Overpass busy): its text is kept
      const b = mk({ state: 'done', result: { ok: false, reason: 'failed', message: 'Overpass answered HTTP 429 (busy: try again in a minute)' } });
      out.beforeTry = await b.db.groundStatus('LFPO');
      await b.db.fetchGround('LFPO');
      out.failed = await b.db.groundStatus('LFPO');
      // the launcher remembers: a page reloaded asks ground/state and says it too
      const c2 = mk(null, { ok: true, aerodromes: { LFPO: { at: '2026-11-10T10:00:55Z', ok: false, reason: 'failed', message: 'Overpass answered HTTP 429' }, EGLL: { at: '2026-11-10T10:05:00Z', ok: true } } });
      out.reloaded = [await c2.db.groundStatus('LFPO'), await c2.db.groundStatus('EGLL'), await c2.db.groundStatus('LFMN')];
      out.reloadCalls = c2.calls;
      out.bad = (await c2.db.groundStatus('x')).state;
      return out;
    }""")
    c.eq((r['afterBusy']['state'], r['afterBusy']['reason'], r['changeBusy']), ('failed', 'busy', [['LFPO', True]]), 'after the procedures, the background reading of the ground meets a busy launcher: the status says failed / busy and the change is announced (it was silent)', what='busy')
    c.eq((r['beforeTry']['state'], r['failed']['state'], r['failed']['reason'], '429' in r['failed']['message']), ('none', 'failed', 'failed', True), 'nothing tried: none; a failed job: failed with the launcher’s text', what='failed')
    c.eq(([x['state'] for x in r['reloaded']], r['reloaded'][0].get('message'), r['reloadCalls'], r['bad']), (['failed', 'ok', 'none'], 'Overpass answered HTTP 429', ['ground/state'], 'none'),
         'a reloaded page asks the launcher once (ground/state): the last failure of LFPO is there, EGLL is ok, LFMN none; a bad code is none', what='reloaded')


@case('K129', 'publication() reads the zones’ meta.json six at a time, not one zone after the other (SOG-0164, the Maintenance page took 27 serial requests to open): same answer, same order, at most six reads in flight', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0164 (10 Nov 2026, measured by V3 Frame): AeroDb.publication() awaited each zone’s meta.json in turn; with a reader that takes 25 ms a read, 30 zones took 750 ms and more; read six zones at a time they take about a sixth of it')
def k129(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const day = Date.parse('2026-11-10T12:00:00Z'), ids = Array.from({ length: 30 }, (_, i) => 'z' + String(i).padStart(2, '0'));
      const files = {};
      for (const id of ids) {
        files[`sia/base/${id}/2026-10-29/meta.json`] = { schema: 2, zone: id, cycle: '2026-10-29', kind: 'meta', parserVersion: 25, builtAt: '2026-11-10T08:00:00Z', data: {} };
        files[`sia/base/${id}/2026-10-29/aeroindex.json`] = { schema: 2, zone: id, cycle: '2026-10-29', kind: 'aeroindex', data: { fields: ['icao', 'name', 'lat', 'lon'], rows: [] } };
      }
      files['sia/base/index.json'] = { schema: 2, kind: 'index', zones: Object.fromEntries(ids.map(id => [id, { cycle: '2026-10-29', prefixes: ['XX'], kb: { meta: 1 } }])) };
      let flight = 0, peak = 0, metaReads = 0;
      const reader = { read: async p => {
        const isMeta = p.endsWith('/meta.json');
        if (isMeta) { metaReads++; flight++; peak = Math.max(peak, flight); await new Promise(r => setTimeout(r, 25)); flight--; }
        return p in files ? { value: files[p], rev: 'r' } : null;
      }, list: async prefix => Object.keys(files).filter(p => p.startsWith(prefix)), watch: () => () => {} };
      const db = AeroDB.create({ reader, lnmperf: false, now: () => day });
      await db.publication().catch(() => null); // warms the manifest (the index and the listing are not the subject)
      flight = 0; peak = 0; metaReads = 0;
      const db2 = AeroDB.create({ reader, lnmperf: false, now: () => day });
      await db2.zones().catch(() => null);
      const t = performance.now(), pub = await db2.publication(), ms = Math.round(performance.now() - t);
      return { ms, peak, metaReads, keys: Object.keys(pub.base), first: pub.base.z00 };
    }""")
    c.eq((r['keys'] == sorted(r['keys']), len(r['keys']), r['first']['cycles']['2026-10-29']['parserVersion'], r['first']['cycles']['2026-10-29']['at']), (True, 30, 25, '2026-11-10T08:00:00Z'), 'the answer is the same: the 30 zones in order, each with its cycle, parser version and build date', what='answer')
    c.ok(r['peak'] <= 6 and r['peak'] >= 2, f"peak {r['peak']}, {r['metaReads']} reads", 'at most six reads in flight, and more than one (it is parallel)')
    c.ok(r['ms'] < 400, f"{r['ms']} ms for 30 zones at 25 ms a read", 'it takes a sixth of the serial time (750 ms): under 400 ms')


@case('K130', 'FIR and UIR of the sources that carry them (SOG-0169): the openAIP and AIXM 5.1 readers keep them as airspaces of type FIR / UIR, their rings simplified to 0.01° (thousands of points become a few hundred), the other spaces untouched; parser version 26', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0169 (10 Nov 2026, the user: « Pas d\\u2019affichage de FIR hors France ? »): only France carried FIR / UIR in the base; the openAIP exports of the user carry 126 FIR in 32 countries (type 10) and the reader dropped them in its list of kept types; they are kept now as reference lines of the map (the vertical profile ignores the asFir family), rings simplified to 0.01° because the Map reads and draws them at every wide view')
def k130(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const fr = document.createElement('iframe'); document.body.appendChild(fr); const w = fr.contentWindow;
      await new Promise((ok, no) => { const s = w.document.createElement('script'); s.src = '/shared/aero_sources.js'; s.onload = ok; s.onerror = () => no(new Error('aero_sources.js')); w.document.head.appendChild(s); });
      const circle = (lat, lon, r, n) => Array.from({ length: n + 1 }, (_, i) => [lon + r * Math.sin(2 * Math.PI * i / n) / Math.cos(lat * Math.PI / 180), lat + r * Math.cos(2 * Math.PI * i / n)]);
      const feat = (type, name, ring) => ({ type: 'Feature', properties: { _id: 'id-' + name, country: 'SE', type, name, icaoClass: 0, upperLimit: { value: 660, unit: 6, referenceDatum: 2 }, lowerLimit: { value: 0, unit: 0, referenceDatum: 0 } }, geometry: { type: 'Polygon', coordinates: [ring] } });
      const fc = { type: 'FeatureCollection', features: [feat(10, 'STOCKHOLM FIR', circle(59, 15, 3, 4000)), feat(11, 'NORDIC UIR', circle(62, 15, 4, 2500)), feat(4, 'SMALL CTR', circle(59.6, 17.9, .2, 40)), feat(26, 'BIG CTA', circle(58, 12, 1, 600))] };
      const out = w.AeroSources.geojson(fc, 'se_asp.geojson'), by = n => out.airspaces.find(a => a.name === n);
      const area = ring => Math.abs(ring.reduce((s, p, i) => { const q = ring[(i + 1) % ring.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0)) / 2;
      const fir = by('STOCKHOLM FIR'), ref = circle(59, 15, 3, 4000).map(([lo, la]) => [la, lo]);
      // AIXM 5.1 : a FIR of the NATS / ENAIRE kind
      const aixm = `<AIXMBasicMessage xmlns:aixm="http://www.aixm.aero/schema/5.1.1" xmlns:gml="http://www.opengis.net/gml/3.2"><aixm:Airspace gml:id="a1"><aixm:timeSlice><aixm:AirspaceTimeSlice gml:id="t1"><aixm:type>FIR</aixm:type><aixm:designator>EGTT</aixm:designator><aixm:name>LONDON FIR</aixm:name>`
        + `<aixm:geometryComponent><aixm:AirspaceGeometryComponent><aixm:theAirspaceVolume><aixm:AirspaceVolume><aixm:upperLimit uom="FL">660</aixm:upperLimit><aixm:horizontalProjection><aixm:Surface><gml:patches><gml:PolygonPatch><gml:exterior><gml:Ring><gml:curveMember><gml:Curve gml:id="c1"><gml:segments><gml:GeodesicString><gml:posList>50 0 50 1 51 1 50 0</gml:posList></gml:GeodesicString></gml:segments></gml:Curve></gml:curveMember></gml:Ring></gml:exterior></gml:PolygonPatch></gml:patches></aixm:Surface></aixm:horizontalProjection></aixm:AirspaceVolume></aixm:theAirspaceVolume></aixm:AirspaceGeometryComponent></aixm:geometryComponent>`
        + `</aixm:AirspaceTimeSlice></aixm:timeSlice></aixm:Airspace></AIXMBasicMessage>`;
      const five = w.AeroSources.aixm5(aixm).airspaces;
      return { types: out.airspaces.map(a => [a.name, a.type, a.rings[0].length]), firArea: area(fir.rings[0]) / area(ref), firBox: [Math.min(...fir.rings[0].map(p => p[0])), Math.max(...fir.rings[0].map(p => p[0]))], five: five.map(a => [a.name, a.type, a.rings[0].length]) };
    }""")
    by = {n: (t, k) for n, t, k in r['types']}
    c.eq((by['STOCKHOLM FIR'][0], by['NORDIC UIR'][0], by['SMALL CTR'], by['BIG CTA'][0]), ('FIR', 'UIR', ('CTR', 41), 'CTA'), 'the FIR (openAIP type 10) and the UIR (type 11) are kept as such; a small CTR keeps its 41 points', what='types')
    c.ok(20 < by['STOCKHOLM FIR'][1] < 450 and 20 < by['NORDIC UIR'][1] < 450 and by['BIG CTA'][1] == 601, str(r['types']), 'a FIR of 4 000 points and a UIR of 2 500 come down to a few hundred; a CTA of 600 points is untouched (only the FIR and UIR are simplified)')
    c.ok(.99 < r['firArea'] < 1.01 and abs(r['firBox'][0] - 56) < .02 and abs(r['firBox'][1] - 62) < .02, str((r['firArea'], r['firBox'])), 'the shape holds: area within 1 %, extent within 0.02°')
    c.eq(r['five'], [['LONDON FIR', 'FIR', 4]], 'AIXM 5.1 (NATS, ENAIRE): a FIR is kept too', what='aixm5')
    sb = (ROOT / 'shared' / 'sia_base.js').read_text(encoding='utf-8')
    c.ok(int(re.search(r'const VERSION =\s*(\d+)', sb).group(1)) >= 26, 'sia_base.js', 'parser version 26 or more: the zones built before have no FIR outside France and are rebuilt (parser-old)')


@case('K132', 'The light index of aerodromes carries the kind and the runway of every source (SOG-0158): aeroindex has `type` (AD, AH, HP, MIL) and `hardLen`; the AIXM 5.1 reader (NATS, ENAIRE) gives each aerodrome the nominal length of its longest HARD runway, a grass or gravel one counts for nothing; parser version 27', 'K', tags=('aerodb',), phone=False,
      rule='SOG-0158 (10 Nov 2026, Features SOG, seen on the user’s real base): suggest put a military base or a heliport before an airport as soon as it had the longest runway, and « uk » could not put EGLL first because the NATS aerodromes had no runway length (230 Runway features with nominalLength and composition in the NATS file, none read); aeroindex gets `type`, the AIXM 5.1 reader gets hardLen from the runways of an aerodrome, parser 27')
def k132(c):
    c.page.goto(f'{c.base}/frame/aerodb/test/procedures.html', wait_until='load')
    r = c.js("""async () => {
      const fr = document.createElement('iframe'); document.body.appendChild(fr); const w = fr.contentWindow;
      const load = src => new Promise((ok, no) => { const s = w.document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); w.document.head.appendChild(s); });
      await load('/shared/sia_base.js'); await load('/shared/aero_sources.js');
      const ad = (id, name, icao, type, lat) => `<aixm:AirportHeliport gml:id="${id}"><gml:identifier>${id}</gml:identifier><aixm:timeSlice><aixm:AirportHeliportTimeSlice gml:id="t${id}"><aixm:interpretation>BASELINE</aixm:interpretation><aixm:designator>${icao}</aixm:designator><aixm:name>${name}</aixm:name><aixm:locationIndicatorICAO>${icao}</aixm:locationIndicatorICAO><aixm:type>${type}</aixm:type><aixm:ARP><aixm:ElevatedPoint><gml:pos>${lat} -0.45</gml:pos></aixm:ElevatedPoint></aixm:ARP></aixm:AirportHeliportTimeSlice></aixm:timeSlice></aixm:AirportHeliport>`;
      const rwy = (id, adId, len, comp, uom = 'M') => `<aixm:Runway gml:id="${id}"><gml:identifier>${id}</gml:identifier><aixm:timeSlice><aixm:RunwayTimeSlice gml:id="t${id}"><aixm:interpretation>BASELINE</aixm:interpretation><aixm:designator>09/27</aixm:designator><aixm:type>RWY</aixm:type><aixm:nominalLength uom="${uom}">${len}</aixm:nominalLength><aixm:associatedAirportHeliport xlink:href="urn:uuid:${adId}"/><aixm:surfaceProperties><aixm:SurfaceCharacteristics gml:id="s${id}"><aixm:composition>${comp}</aixm:composition></aixm:SurfaceCharacteristics></aixm:surfaceProperties></aixm:RunwayTimeSlice></aixm:timeSlice></aixm:Runway>`;
      const xml = '<aixm:AIXMBasicMessage xmlns:aixm="http://www.aixm.aero/schema/5.1.1" xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:xlink="http://www.w3.org/1999/xlink">'
        + ad('a1', 'LONDON HEATHROW', 'EGLL', 'AD', 51.47) + ad('a2', 'SMALL FIELD', 'EGXX', 'AD', 52.0) + ad('a3', 'NO RUNWAY', 'EGYY', 'AH', 53.0)
        + rwy('r1', 'a1', 3902, 'ASPH') + rwy('r2', 'a1', 3658, 'CONC') + rwy('r3', 'a2', 1200, 'ASPH') + rwy('r4', 'a2', 1800, 'GRASS') + rwy('r5', 'a2', 3000, 'GRVL', 'FT') + '</aixm:AIXMBasicMessage>';
      const five = w.AeroSources.aixm5(xml).aero.aerodromes;
      const idx = w.SiaBase.aeroIndex([{ icao: 'LFPG', name: 'PARIS CDG', lat: 49, lon: 2, hardLen: 4215, type: 'AD' }, { icao: 'LFYY', name: 'A HELIPORT', lat: 48, lon: 2, type: 'HP' }, { icao: 'LFZZ', name: 'NO TYPE', lat: 47, lon: 2 }, { icao: 'LFMM', name: 'ODD TYPE', lat: 46, lon: 2, type: 'weird' }]);
      return { five: five.map(a => [a.icao, a.type, a.hardLen ?? null]), fields: idx.fields, rows: idx.rows.map(x => [x[0], x[7], x[8]]) };
    }""")
    c.eq(r['five'], [['EGLL', 'AD', 3902], ['EGXX', 'AD', 1200], ['EGYY', 'AH', None]], 'AIXM 5.1: the longest HARD runway of each aerodrome (3 902 m, not 3 658), a grass and a gravel runway (even in feet) count for nothing, an aerodrome with no runway has none', what='hardlen')
    c.eq((r['fields'][-2:], r['rows']), (['hardLen', 'type'], [['LFPG', 4215, 'AD'], ['LFYY', None, 'HP'], ['LFZZ', None, 'AD'], ['LFMM', None, 'AD']]), 'aeroindex carries hardLen and type (a missing or unknown type is AD, a heliport stays HP)', what='aeroindex')
    sb = (ROOT / 'shared' / 'sia_base.js').read_text(encoding='utf-8')
    c.ok(int(re.search(r'const VERSION =\s*(\d+)', sb).group(1)) >= 27, 'sia_base.js', 'parser version 27 or more: the zones built before have no `type` in their index and are rebuilt (parser-old)')


@case('K133', 'Route engine, the published airways are preferred (SOG-0161): by default a link of an airway is not out-bid by a free-route direct, the heuristic of the search stays tight (no « budget reached » on a long continental route), a positive preference still lets the free route win', 'K', static=True,
      rule='SOG-0161 (10 Nov 2026): LFPG → LEMD failed with « Budget de recherche atteint » (32 s) while it took 1.4 s without FRA: the default FRA preference was +10 % (a free-route link cost 90 % of its length), which preferred the direct to the published airways and loosened the A* heuristic (distance × the cheapest cost per NM, 0.9) so that the non-dominated altitude labels exploded; the default is now −10 %: a published airway wins over a direct when its detour is under 10 %, the heuristic is tight (LFPG → LEMD 1.7 s, 89 % controlled, via Y129 and T430; ESSB → LEMO 22 → 65 % controlled)')
def k133(c):
    import gzip
    import json
    import os
    import tempfile
    RJ = _regen()
    import route_fixture as RF
    from route_engine import import_books as I, planning
    c.eq(planning.DEFAULT_FRA_PREFERENCE, -.1, 'the default preference is −10 % (airways preferred), no longer +10 %', what='default')
    fn = RJ.REGISTRY[('route', 'compute')][0]
    import math
    nmd = lambda a, b: 3440.065 * 2 * math.asin(math.sqrt(math.sin(math.radians(b[0] - a[0]) / 2) ** 2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2))
    dms = lambda v, hemi: f"{hemi}{int(abs(v)):02d}{int(round((abs(v) - int(abs(v))) * 60)):02d}00" if hemi == 'N' else f"{hemi}{int(abs(v)):03d}{int(round((abs(v) - int(abs(v))) * 60)):02d}00"
    # the airway WA1 WA2 WA2a WA3 WA4 makes a dogleg of about 8 % between WA2 and WA3; the free route links WA2 and WA3 (entry and exit points of the area) straight
    WA2, WA3 = (55.0, 16.0), (52.8, 13.0)
    L = nmd(WA2, WA3)
    mid = ((WA2[0] + WA3[0]) / 2, (WA2[1] + WA3[1]) / 2)
    dlat, dlon = WA3[0] - WA2[0], WA3[1] - WA2[1]
    k = .205 * L / (math.hypot(dlat * 60, dlon * 60 * math.cos(math.radians(mid[0]))) or 1)
    WA2A = (mid[0] + (-dlon * k * math.cos(math.radians(mid[0]))), mid[1] + dlat * k / math.cos(math.radians(mid[0])))
    fir = lambda ident, pos, role: ['', '', ident, dms(pos[0], 'N'), dms(pos[1], 'E'), 'TESTFRA', role, '-', '', '', '-', 'FL195 / FL660', 'H24', 'XXXX', '']
    rows = [fir('WA2', WA2, 'EX'), fir('WA3', WA3, 'EX')]
    book = {'file': 'fra-test.xlsx', 'start': '2026-10-29', 'sha256': '0' * 64, 'rows': [{'row': i + 2, 'v': v} for i, v in enumerate(rows)]}
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = os.path.join(td, 'data')
        os.makedirs(data)
        RF.make_base(data)
        d = os.path.join(data, 'sia', 'base', 'xx', '2026-10-29')
        with open(os.path.join(d, 'aeroindex.json'), encoding='utf-8') as f:
            ai = json.load(f)
        ai['data']['rows'] += [['XSTA', 'DEPART', 59.0, 18.0, 20, 0, 0], ['XEND', 'ARRIVE', 50.0, 10.0, 20, 0, 0]]
        with open(os.path.join(d, 'aeroindex.json'), 'w', encoding='utf-8') as f:
            json.dump(ai, f)
        # an airway L9 from 30 NM of the departure to 30 NM of the arrival, a few percent longer than the free-route chain F1 F2 F3 F4
        nodes = {'WA1': (58.6, 17.6), 'WA2': WA2, 'WA2A': WA2A, 'WA3': WA3, 'WA4': (50.5, 10.2)}
        for k, fname in (('points', 'points.json'), ('airways', 'airways.json')):
            with open(os.path.join(d, fname), encoding='utf-8') as f:
                doc = json.load(f)
            if k == 'points':
                doc['data'] += [{'id': n, 'type': 'ICAO', 'lat': v[0], 'lon': v[1]} for n, v in nodes.items()]
            else:
                names = list(nodes)
                doc['data'] += [{'route': 'L9', 'a': {'id': a, 'lat': nodes[a][0], 'lon': nodes[a][1]}, 'b': {'id': b, 'lat': nodes[b][0], 'lon': nodes[b][1]}, 'lower': 2000, 'upper': 66000} for a, b in zip(names, names[1:])]
            with open(os.path.join(d, fname), 'w', encoding='utf-8') as f:
                json.dump(doc, f)
        rad = os.path.join(td, 'RAD_2611_v1_0.xlsx')
        RF.write_xlsx(rad, RF.rad_sheets())
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
        with gzip.open(os.path.join(data, 'route', 'fra.json.gz'), 'wt', encoding='utf-8') as f:
            json.dump([book], f)
        ctx = {'data': data, 'secrets': td}
        run = lambda **kw: fn(RJ.Job('route', 'compute', {}, author='TST'), {'dep': 'XSTA', 'arr': 'XEND', 'fl': 350, 'date': '2026-11-10T12:00', 'enable_fra': True, **kw}, ctx)['plan']['primary']
        a = run()
        b = run(fra_preference=.1)
        c.ok(1.05 < (nmd(WA2, WA2A) + nmd(WA2A, WA3)) / L < 1.10, f'{(nmd(WA2, WA2A) + nmd(WA2A, WA3)) / L:.3f}', 'the airway’s dogleg is 5 to 10 % longer than the free-route link')
        ways = lambda p: sorted({l['via'] for l in p.get('legs') or [] if l['via'] != 'DCT'})
        c.eq((a['ok'], ways(a), a['control']['controlled_pct'] > 60), (True, ['L9'], True), 'by default the published airway L9 is flown (the free-route chain is a few percent shorter): most of the distance is controlled', what='airway')
        c.eq((b['ok'], [l['kind'] for l in b['legs'] if l['kind'] == 'FRA'] != [], b['control']['controlled_pct'] < a['control']['controlled_pct'], b['distance_nm'] < a['distance_nm']), (True, True, True, True), 'with a +10 % FRA preference the free-route link between WA2 and WA3 wins: shorter, less controlled: the preference is still available', what='fra')


@case('K134', 'Route engine, a partial route is shown as such (SOG-0161): when no route can be computed, the engine’s fallback proposals reach the screen’s answer as alternatives marked `proposal` and `incomplete`, with their share controlled (nothing: a fallback is never controlled)', 'K', static=True,
      rule='SOG-0161 (10 Nov 2026): the user asks for « la plus grande route possible » and the engine’s fallback (recovery: a direct, pieces joined, a regional FRA fallback) was only a sentence in the message; the proposals are now returned as alternatives of the screen’s form with `proposal: true`, `incomplete: true` and their `control` (a DCT that nothing publishes is a fallback), so that the page can show them as what they are')
def k134(c):
    import os
    import tempfile
    RJ = _regen()
    import route_fixture as RF
    from route_engine import import_books as I, view
    fn = RJ.REGISTRY[('route', 'compute')][0]
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = os.path.join(td, 'data')
        os.makedirs(data)
        RF.make_base(data)
        d = os.path.join(data, 'sia', 'base', 'xx', '2026-10-29')
        import json
        with open(os.path.join(d, 'aeroindex.json'), encoding='utf-8') as f:
            ai = json.load(f)
        ai['data']['rows'] += [['XSTA', 'DEPART', 59.0, 18.0, 20, 0, 0], ['XEND', 'ARRIVE', 50.0, 10.0, 20, 0, 0]]
        with open(os.path.join(d, 'aeroindex.json'), 'w', encoding='utf-8') as f:
            json.dump(ai, f)
        rad = os.path.join(td, 'RAD_2611_v1_0.xlsx')
        RF.write_xlsx(rad, RF.rad_sheets())
        I.write(os.path.join(data, 'route', 'rad.json.gz'), I.merge([], [I.read_book(rad)[1]]))
        plan = fn(RJ.Job('route', 'compute', {}, author='TST'), {'dep': 'XSTA', 'arr': 'XEND', 'fl': 350, 'date': '2026-11-10T12:00', 'enable_fra': False, 'allow_levels': False}, {'data': data, 'secrets': td})['plan']
        c.eq(plan['primary']['ok'], False, 'no airway near either aerodrome and no free route: no route is computed', what='impossible')
        v0 = view.to_view(plan, {'fl': 350, 'mode': 'calculate'})
        c.eq(v0['alternatives'], [], 'by default the contract of before: no route computed, no alternative (the page asks for the proposals with `proposals: true`)', what='default')
        v = view.to_view(plan, {'fl': 350, 'mode': 'calculate', 'proposals': True})
        alts = v['alternatives']
        c.ok(alts and all(a.get('proposal') is True and a.get('incomplete') is True for a in alts), str([(a['name'], a.get('proposal'), a.get('incomplete')) for a in alts]), 'the fallback proposals are the alternatives of the screen, marked proposal and incomplete')
        c.eq((alts[0]['control']['fallbackPct'], alts[0]['control']['controlledPct'], [s['control'] for s in alts[0]['segments']][:1]), (100.0, 0.0, ['fallback']), 'a DCT that nothing publishes is a fallback: no part of it is controlled', what='control')
