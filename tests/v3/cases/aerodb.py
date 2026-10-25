"""Area K - aerodb procedures (frame/aerodb/SPEC.md section 5 quinquies; frame/aerodb/test/procedures.html).

Rules covered
  * K1 the bench of the procedures API passes: SID and STAR read from an OFP at the common schema (id, ordered points,
    status `ofp`, planned altitude, no constraint), nothing written by a read, one file per aerodrome by `rememberOfp`,
    the same OFP again writes nothing, published and seen procedures merged with the best status winning, filters, a
    reader that does not write.

Cases: K1.  The OFP of the bench is built from SimBrief's documented fields (no real OFP in the repository yet).
"""
from lib import Fail, case


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
