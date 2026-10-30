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
    des modules (V3 § 10.29 (b) a coupé l'ancien proc_eaip.py). Un cas qui REMPLACE un nom (fetch, first_page_rows…) le fait sur le module qui l'appelle (proc_sia), pas ici."""
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
        return _eaip_rows(fx, Path(path).stem)

    def run(ctx, icao='LFBD', job=None):
        return RJ.REGISTRY[('proc', 'eaip-fetch')][0](job or RJ.Job('proc', 'eaip-fetch', {'icao': icao}, author='TST'), {'icao': icao}, ctx)

    saved = (P.fetch, P.first_page_rows, P.url_exists)
    P.fetch, P.first_page_rows, P.url_exists = fake_fetch, fake_rows, lambda url, timeout=30: False
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
        P.fetch, P.first_page_rows, P.url_exists = saved

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
    c.eq([(q['id'], q.get('phase')) for q in i07['points']], [('RW07', None), ('PO412', 'missed'), ('MLN', 'missed'), ('MOLBA', 'missed')], 'LFPO ILS 07: no IF row was read, the threshold comes first', what='ILS 07 points')
    c.ok(any('IF absent' in x for x in d25['warnings']), str(d25['warnings'][-4:]), 'and the missing IF is said')
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
    c.eq((sid['rows'], sid['read']), (35, 35), 'SID 09L-09R: every leg row of the whole page read (it read 0 of 35 before)', what='SID 09 rows')
    by = {(g['label'], g['runway']): g for g in sid['groups']}
    c.eq(sorted(by), sorted((n, r) for n in ('OPALE 6G', 'ATREX 6G', 'NURMO 6G', 'OPALE 6K', 'ATREX 6K', 'NURMO 6K', 'DIKOL 6G', 'LANVI 6G', 'RANUX 6G') for r in ('09L', '09R')),
         'the nine departures of the whole page x two runways', what='SID 09 groups')
    c.eq((legs(by[('OPALE 6G', '09L')]), legs(by[('OPALE 6G', '09R')])), ([('CF', 'PG091'), ('TF', 'PG092'), ('DF', 'PG099'), ('TF', 'OPALE')], [('TF', 'PG092'), ('DF', 'PG099'), ('TF', 'OPALE')]),
         '09L starts at its CF, 09R at the common route', what='OPALE 6G')
    leg = by[('OPALE 6G', '09L')]['legs']
    c.eq((leg[1]['crs'], leg[1]['nm'], leg[1]['over'], leg[2]['turn'], leg[3]['crs'], leg[3]['nm'], leg[3]['rnp']), (84, 2.1, True, 'L', 323, 50.0, 1.0), 'values, fly-over, turn; « RNAV 1 » read as 1 NM', what='OPALE 6G cells')
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
    c.ok(10 < brg[1] < 13 and abs((brg[0] - true + 180) % 360 - 180) < 1 and not any('FAF' in x for x in ds['warnings']), f'{brg} {true}', 'the FAF is 11.4 NM from the threshold, on the runway bearing, and nothing is said')
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
        saved = (S.fetch, S.first_page_rows, S.url_exists)

        def fake_fetch(url, timeout=60):
            asked.append(url)
            return page.encode() if url.endswith('FR-AD-2.LFXX-fr-FR.html') else b'%PDF-1.4'
        S.fetch, S.first_page_rows, S.url_exists = fake_fetch, lambda p: [], lambda *a, **k: False
        try:
            S.read_aerodrome(S.eaip_url('2026-10-01'), 'LFXX', cache, None, lambda *t: said.append(' '.join(map(str, t))))
        finally:
            S.fetch, S.first_page_rows, S.url_exists = saved
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
    c.eq(sets, ['LFAV', 'LFBD', 'LFBO', 'LFPG', 'LFPO'], 'five sets, French aerodromes only (the foreign layouts stay on invented pages)', what='sets')
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
        if icao in ('LFBO', 'LFPO', 'LFPG'):
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
        c.eq(sorted(set(offer) - {'ok', 'job', 'token'}), ['cycle', 'inputs', 'personal', 'zones'], 'nothing else is offered', what='keys')
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
        c.eq((res['ok'], res['reason'], res['built'], res['failed']), (False, 'partial', ['gb', 'nl'], [{'zone': 'be', 'error': 'page-error'}, {'zone': 'ch', 'error': 'invalid-output'}, {'zone': 'ie', 'error': 'invalid-output'}]),
             'the end: not ok, partial, who is built, who failed with its code', what='result')
        c.eq([x['zone'] for x in res['commits']], ['gb', 'nl'], 'the commits, zone by zone', what='commits list')
        c.ok(all(len(x['commit'] or '') == 40 for x in res['commits']), str(res['commits']), 'each with its SHA')
        c.eq(res['instances'], 1, 'one instance built the five zones', what='instances')
        base = data / 'sia' / 'base'
        c.eq(sorted(p.name for p in base.iterdir()), ['cities_major.json', 'gb', 'index.json', 'nl'], 'only the built zones left files (a failed zone publishes nothing)', what='files')
        c.eq(sorted(p.name for p in (base / 'gb' / '2026-10-01').iterdir()), kinds12, 'the 12 files of the split format, under sia/base/<zone>/<cycle>/', what='zone files')
        idx = json.loads((base / 'index.json').read_text(encoding='utf-8'))
        c.eq((list(idx['zones']), idx['kind'], idx['schema']), (['gb', 'nl'], 'index', 2), 'the manifest holds the built zones only', what='index')
        log = _d5_git(data, 'log', '--format=%an|%s', '-n', '5').strip().splitlines()
        c.eq(len(log), 3, 'one commit per built zone on top of the initial one', what='commit count')
        c.ok(log[0].startswith('TST|') and ' nl ' in log[0] and ' gb ' in log[1], str(log), "each commit is a zone's, authored by the page's trigram")
        c.eq(set(_d5_git(data, 'show', '--name-only', '--format=', 'HEAD~1').split()), {f'sia/base/gb/2026-10-01/{k}' for k in kinds12} | {'sia/base/index.json', 'sia/base/cities_major.json'},
             "the first zone's commit: its folder, the manifest and the world's large cities: nothing else", what='committed first')
        c.eq(set(_d5_git(data, 'show', '--name-only', '--format=', 'HEAD').split()), {f'sia/base/nl/2026-10-01/{k}' for k in kinds12} | {'sia/base/index.json'},
             "the next zone's: its folder and the manifest (the large cities did not change)", what='committed next')
        c.ok('staged.txt' in _d5_git(data, 'diff', '--cached', '--name-only') and 'notes.txt' in _d5_git(data, 'diff', '--name-only'),
             _d5_git(data, 'status', '--short'), 'what the user had staged or edited is still where it was, not in the commits')
        # the head of the job as the Données module reads it
        c.eq((view['unit'], view['done'], view['total']), ('zones', 5, 5), 'the head counts the zones done', what='head')
        c.ok(view['step'].startswith('5 zones sur 5'), view['step'], 'the step says « 5 zones sur 5 »')
        c.ok(all(set(zs[z]) >= {'state', 'done', 'total'} for z in zones) and zs['gb']['done'] == 1 and zs['gb']['total'] == 2, str(zs['gb']), 'zones is a dict by zone: state, done and total (sources read / to read)')
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
        folder = data / 'sia' / 'base' / 'ie' / res['cycle']
        read = lambda k: json.loads((folder / f'{k}.json').read_text(encoding='utf-8'))
        aero, asps = read('aerodromes'), read('airspaces')
        c.eq([(x['icao'], x['name']) for x in aero['data']], [('EITS', 'TESTFIELD')], 'the aerodrome of the invented file is in aerodromes.json', what='aerodromes')
        c.eq([(x['type'], x['name'], x['src']) for x in asps['data']], [('CTR', 'TEST CTR', 'openaip')], 'and its airspace in airspaces.json', what='airspaces')
        c.eq((aero['schema'], aero['zone'], aero['cycle'], aero['kind'], aero['parserVersion']), (2, 'ie', res['cycle'], 'aerodromes', read('meta')['parserVersion']), 'the header of the split format', what='header')
        idx = json.loads((data / 'sia' / 'base' / 'index.json').read_text(encoding='utf-8'))
        c.eq((idx['zones']['ie']['prefixes'], idx['zones']['ie']['cycle']), (['EI'], res['cycle']), "the zone's entry of the manifest", what='manifest')
        c.ok(z['commit'] is None and 'not a git repository' in (z['warning'] or ''), str(z), 'without a repository the files are written and the reason is said (no commit)')
        c.ok(len(made) == 1 and not any(os.path.exists(p) for p in made), str(made), 'the temporary profile of the job (one) is deleted')


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
        p = subprocess.Popen([sys.executable, str(c.root / 'tools' / 'launch.py'), '--port', str(port), '--no-browser', '--data', str(data)], stdout=log, stderr=subprocess.STDOUT,
                             stdin=subprocess.DEVNULL, cwd=td)
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
        finally:
            p.terminate()
            try:
                p.wait(10)
            except subprocess.TimeoutExpired:
                p.kill()
            log.close()


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
               'token': {**good, 'token': 'short'}, 'no zone': {**good, 'zones': []}}
    out, race = {}, {}
    for name, answer in hostile.items():
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
            data = Path(td) / 'data'
            (data / 'sia' / 'openaip').mkdir(parents=True)
            (data / 'sia' / 'openaip' / 'ie_apt.geojson').write_text('{}', encoding='utf-8')
            seen = []
            srv, origin = _d5_site(RJ, data, {}, c.root, claim_override=lambda a, ans=answer: ans, log=seen)
            prof = tempfile.mkdtemp(prefix='sog-base-')
            p = subprocess.Popen(cmd + B.browser_args(prof, origin.split('//')[1], f'{origin}/frame/aerodb/build/headless.html#job=job123'), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')
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
            srv.shutdown()
            srv.server_close()
            out[name] = ([o['error'] for o in lines if o and 'error' in o][:1], [x for x in seen if x.startswith('data/')], any(o and o.get('started') for o in lines))
    got = {k: (bool(v[0]), v[1], v[2]) for k, v in out.items()}
    # an answer without its error: the race named (seconds waited, the browser's exit code, the lines it wrote)
    c.eq(got, {k: (True, [], False) for k in hostile}, 'every hostile claim answer: an error said, no data file read, never « started »',
         what='hostile' + ''.join(f' — {k}: {race.get(k)}' for k, v in got.items() if not v[0]))


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
