"""Area K - aerodb procedures (frame/aerodb/SPEC.md section 5 quinquies; frame/aerodb/test/procedures.html).

Rules covered
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

Cases: K1, K5, K8, K9 (and K2 K3 K4 K6 below).  The OFP of the bench is built from SimBrief's documented fields (no real OFP in the repository yet).
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
    for f in ('frame/aerodb/sources.js', 'frame/aerodb/sources_data.js'):
        t = re.sub(r'(?m)^\s*//.*$|/\*.*?\*/', '', (ROOT / f).read_text(encoding='utf-8'), flags=re.S)      # the code, without its comments
        c.ok(not re.search(r'\bfetch\s*\(|XMLHttpRequest|importScripts|new\s+Worker', t), f, f'{f} fetches nothing (links only)')
        c.ok(not re.search(r'ghp_[A-Za-z0-9]{20,}|github_pat_|woyczek|@gmail\.|C:\\Users', t), f, f'{f}: no token, no personal address')
    gone = [p for p in ('frame/aerodb/lab.js', 'frame/aerodb/lab_measure.js', 'frame/aerodb/lab_sources.js', 'frame/aerodb/test/lab.html') if (ROOT / p).exists()]
    c.eq(gone, [], 'the data laboratory is removed (user, 28 Oct 2026)', what='laboratory files left')


# ------------------------------------------------------------------------------------------------ eAIP tables (static)
# tools/proc_eaip.py on lines of text read once from the SIA's PDF pages (AIRAC 2026-10-01) and kept in
# frame/aerodb/test/fixtures/eaip/: no pypdf, no network.
def _eaip(c):
    import importlib
    import sys
    tools = str(c.root / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    mod = importlib.import_module('proc_eaip')
    fx = c.root / 'frame/aerodb/test/fixtures/eaip'

    def rows(name):
        return (fx / f'{name}.rows.txt').read_text(encoding='utf-8').splitlines()
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
    names = [f.name.replace('.rows.txt', '.pdf') for f in fx.glob('*.rows.txt')]
    files = [n for n in names if '_LFBD_' in n] + ['AD_2_LFBD_SID_RWY23_RNAV.pdf', 'AD_2_LFBD_IAC_RWY23_FNA_ILS_LOC.pdf']
    known = {'ROYAN': (45.6, -1.0), 'CNA': (45.0, 1.0)}
    doc = P.build_aerodrome('LFBD', files, lambda n: rows(n.replace('.pdf', '')), 'https://example.org/AIRAC-2026-10-01', '2026-10-01', known.get)
    ids = [p['id'] for p in doc['procedures']]
    for want in ('LFBD.SID.ROYAN6P.RW23', 'LFBD.STAR.LMG2L.RWALL', 'LFBD.APP.RNPRWY23.RW23.ETPAR'):
        c.ok(want in ids, f'{ids}', f'{want} among the procedures')
    c.eq(len(ids), len(set(ids)), 'unique ids', what='procedure ids')
    p = next(p for p in doc['procedures'] if p['id'] == 'LFBD.SID.ROYAN6P.RW23')
    c.eq((p['status'], p['source']['kind'], p['source']['cycle'], p['kind'], p['runways']), ('check', 'eaip', '2026-10-01', 'SID', ['23']), 'status, source, cycle', what='ROYAN 6P')
    c.eq([q['id'] for q in p['points']], ['BD230', 'BD923', 'BD927', 'ROYAN'], 'ordered points', what='ROYAN 6P')
    c.ok(p['points'][0]['lat'] is not None and p['points'][3]['lat'] == 45.6, f"{p['points']}", 'BD230 from the DATA page, ROYAN from the base resolver')
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
    c.eq([p['id'] for p in sid['points']], ['OTLIE', 'RENBE', 'RICHR', 'TOMRE', 'BANGR'], 'runway transition then common route; the VA leg (no fix) left out', what='BANGR9 16C')
    c.ok(all(p['lat'] is not None for p in sid['points']), f"{sid['points']}", 'every fix placed from the terminal waypoint records')
    c.eq((sid['points'][0]['leg'], sid['points'][1]['alt'], sid['status'], sid['source']['kind']), ('DF', {'type': 'min', 'ft': 3000}, 'official', 'cifp'),
         'DF then TF, at or above 3000 ft', what='BANGR9 16C legs')
    c.eq(procs['KSEA.STAR.HAWKZ8.RW16B']['runways'], ['16L', '16R'], 'runway "B" (both) is the two parallel runways', what='HAWKZ8')
    app = procs['KSEA.APP.I16C.RW16C']
    c.eq((app['type'], app['runways']), ('ILS', ['16C']), 'ILS approach to 16C', what='I16C')
    rw = next(p for p in app['points'] if p['id'] == 'RW16C')
    c.eq((rw['alt'], rw['vpa'], rw['lat'] is not None), ({'type': 'at', 'ft': 484}, -3.0, True), 'threshold at 484 ft, -3 degrees, placed', what='RW16C')
    after = app['points'][[p['id'] for p in app['points']].index('RW16C') + 1:]
    c.ok(after and all(p.get('phase') == 'missed' for p in after) and not any(p.get('phase') for p in app['points'][:app['points'].index(rw) + 1]),
         f"{[(p['id'], p.get('phase')) for p in app['points']]}", 'the legs after the missed-approach point are "missed", none before')
    tr = procs['KSEA.APP.I16C.RW16C.GRIFY']
    c.eq(([p['id'] for p in tr['points']][:3], tr['points'][0].get('kt'), [p['id'] for p in tr['points']].count('MGNUM')), (['GRIFY', 'MGNUM', 'ANVIL'], 210, 1),
         'transition joined to the final approach, the shared fix once, speed 210 kt at the IAF', what='GRIFY transition')
    c.ok(any('sans point' in w for w in docs['KSEA']['warnings']), f"{docs['KSEA']['warnings']}", 'legs without a fix are counted, not silently dropped')
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / 'proc'
        (out / '2026-10-01').mkdir(parents=True)
        (out / '2026-10-01' / 'index.json').write_text(json.dumps({'schema': 1, 'cycle': '2026-10-01', 'aerodromes': {'LFBD': {'SID': 1}}}))
        C.main([str(fx), '--out', str(out)])
        doc = json.loads((out / '2026-10-01' / 'KSEA.json').read_text(encoding='utf-8'))
        idx = json.loads((out / '2026-10-01' / 'index.json').read_text(encoding='utf-8'))
        c.ok(doc['cycle'] == '2026-10-01' and 'tel quel' in doc['notice'], f"{doc.get('notice')}", 'the file carries the FAA warranty notice')
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
                E.probe('bob', 'secret!pw', 'United Kingdom', 'EGLL', td, name='EG_AD_2_EGLL')
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
                E.probe('bob', 'secret!pw', 'United Kingdom', 'EGLL', td, name='EG_AD_2_EGLL', download=True)
            rep = (Path(td) / 'report.txt').read_text(encoding='utf-8')
            pdfs = list((Path(td) / 'cache').glob('*.pdf'))
            c.ok('| PDF' in rep and len(pdfs) == 1 and pdfs[0].read_bytes().startswith(b'%PDF-'), rep, 'with --download, exactly one PDF, in cache/')
        with tempfile.TemporaryDirectory() as td:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                E.probe('bob', 'secret!pw', 'United Kingdom', 'EGLL', td, name='EG_AD_2_EGLL_6-1_en.pdf', docs=['EG_AD_2_EGLL_6-1_en.pdf', 'EG_AD_2_EGLL_7-1_en.pdf'])
            names = sorted(p.name for p in (Path(td) / 'cache').glob('*.pdf'))
            c.eq(names, ['EG_AD_2_EGLL_6-1_en.pdf', 'EG_AD_2_EGLL_7-1_en.pdf'], 'with --docs, one PDF per exact name asked, named after it (no doubled extension)', what='docs')
    finally:
        srv.shutdown()
        os.environ.clear()
        os.environ.update(env)
        importlib.reload(E)


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
    P = importlib.import_module('proc_eaip')
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
        c.ok(d['formats'][0]['ok'] is False and d['procedures'] == [] and any('NON lue' in w for w in d['warnings']), f"{d['formats']}",
             'a folder build reports the unreadable file and goes on')
    pts = [('TESTA', 51.4762, -0.7516), ('TESTB', 51.4767, -0.6711), ('RW09L', 51.4775, -0.4850)]      # points fictifs (essai du parseur, pas des données d'AIP)
    rows = _uk_page(P, pts)
    c.eq(P.detect_layout(rows), 'uk-app', 'layout recognised from its header words', what='detect_layout')
    parsed = P.parse_uk_app(rows)
    t = parsed['tables'][0]
    c.eq((t['name'], t['runways'], t['transition'], [lg['id'] for lg in t['legs']]), ('RNP RWY 09L', ['09L'], 'TESTA', ['TESTA', 'TESTB', 'RW09L']), 'title, runway, "via" transition, legs in order', what='parse_uk_app')
    c.ok(abs(t['legs'][1]['lat'] - 51.4767) < 1e-4 and abs(t['legs'][1]['lon'] + 0.6711) < 1e-4, f"{t['legs'][1]}", 'latitude read above the leg line, longitude below it')
    c.eq((t['legs'][0]['alt'], t['legs'][2]['over']), ({'type': 'at', 'ft': 3000}, True), 'level constraint and fly-over', what='cells')
    c.eq(P.check_geometry(t['legs']), [], 'a coherent table has no geometry gap', what='check_geometry')
    recs, w = P.records_uk_app('EGXX', parsed, 'x.pdf', '2026-10-01', '2026-01-01')
    c.eq((recs[0]['id'], recs[0]['status'], recs[0]['source']['kind'], recs[0]['points'][2]['id']), ('EGXX.APP.RNPRWY09L.RW09L.TESTA', 'check', 'ead-basic', 'RW09L'), 'common schema, status check, source ead-basic', what='records_uk_app')
    bad = _uk_page(P, pts, corrupt=True)
    pb = P.parse_uk_app(bad)
    gap = P.check_geometry(pb['tables'][0]['legs'])
    c.ok(gap and 'cap calculé' in gap[0], f'{gap}', 'a printed true course 5 degrees off the coordinates is caught')
    recs2, w2 = P.records_uk_app('EGXX', pb, 'x.pdf', '2026-10-01')
    c.ok(recs2 == [] and any('NON retenue' in x for x in w2), f'{recs2} {w2}', 'an incoherent table is not kept: nothing is written from it')
    doc = P.build_pdf_dir('EGXX', ['a_8-13.pdf', 'b_7-13.pdf'], lambda n: rows if n.startswith('a') else ['UNITED KINGDOM AIP AD 2.EGXX-7-13', '25 Dec 2025', 'CIVIL AVIATION AUTHORITY'], '2026-10-01')
    byf = {f['file']: f for f in doc['formats']}
    c.ok(byf['a_8-13.pdf']['ok'] and not byf['b_7-13.pdf']['ok'] and any('vecteurs' in p for p in byf['b_7-13.pdf']['problems']) and len(doc['procedures']) == 1, f"{doc['formats']}",
         'a page with almost no text is reported as probably drawn in vectors, never guessed; the readable one is read')
