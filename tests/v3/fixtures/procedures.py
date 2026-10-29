"""Procedure fixtures of the fuel cases (V3 spec 10.20, 10.23, 10.26; aerodb SPEC 5 quinquies): the `proc/` documents the cases seed so that
aerodb serves invented procedures, never an AIP's.

  * LFRS: two SIDs (one per runway) and a SID transition; LFML: two STARs (one per runway), a STAR transition, an approach, a hand-read
    STAR of an old cycle (outdated), an X-Plane local STAR, and the index of the hand-read files (read on 29 Oct 16:53Z);
  * LFVA: approaches only, two runways, one with a transition, no SID, no STAR, no runway record; LFVB: a STAR that names no runway;
  * LFVC: the conflicts (ILS27 with a transition, ILS09, ARR1A, ARR2B); LFVD: ORD1A, ORD2B, ILS07, ILS25 and the two records never listed
    (a STAR without a name, one of status doubt); LFQQ has nothing.

Everything here is invented: nothing is copied from the user's data/ (it is read-only and never enters a test).
"""
PROC_CYCLE = '2026-10-01'


def pt(seq, id_, lat, lon, alt=None, **kw):
    """A point of a procedure (aerodb schema: seq, id, position, alt constraint { type, ft, ft2 }, phase main | trans | missed, kt...)."""
    return {'seq': seq, 'id': id_, 'lat': lat, 'lon': lon, 'alt': alt, 'phase': kw.pop('phase', 'main'), **kw}


def rec(icao, kind, name, rws, points, transition=None, status='official', kind_src='eaip', src_cycle=PROC_CYCLE):
    """A procedure record of the common schema; its id is `ICAO.KIND.NAME.RW<runway>.<transition>` (RWALL when it serves every runway)."""
    rw = rws[0] if len(rws) == 1 else 'ALL'
    return {'id': f'{icao}.{kind}.{name}.RW{rw}.{transition or "NONE"}', 'icao': icao, 'kind': kind, 'name': name, 'runways': rws,
            'transition': transition, 'points': points, 'status': status,
            'source': {'kind': kind_src, 'ref': 'test', 'cycle': src_cycle, 'at': '2026-10-01'}}


def file(icao, procs, runways=None, cy=PROC_CYCLE):
    """The file of one aerodrome (`proc/<cycle>/<ICAO>.json`, schema 1) holding `procs` and, when given, its runway records."""
    return {'schema': 1, 'icao': icao, 'cycle': cy, 'updated_at': '2026-10-01T00:00:00Z', 'procedures': procs,
            **({'runways': runways} if runways else {})}


def proc_docs(cycle=PROC_CYCLE):
    """The `proc/` documents of the aerodromes LFRS and LFML (published file, hand-read file, X-Plane local file)."""
    lfrs = [
        rec('LFRS', 'SID', 'NTS1A', ['03'], [pt(1, 'RW03', 47.138, -1.62), pt(2, 'NT101', 47.0, -1.5, {'type': 'min', 'ft': 3000}),
                                             pt(3, 'NT102', 46.8, -1.35, {'type': 'at', 'ft': 5000}, kt=250)]),
        rec('LFRS', 'SID', 'NTS2B', ['21'], [pt(1, 'RW21', 47.17, -1.595), pt(2, 'NT201', 47.3, -1.4, {'type': 'max', 'ft': 4000}),
                                             pt(3, 'NT202', 47.0, -1.1, {'type': 'between', 'ft': 6000, 'ft2': 9000})]),
        rec('LFRS', 'SID', 'NTS1A', [], [pt(1, 'NT102', 46.8, -1.35, phase='trans'), pt(2, 'LUGEN', 46.5833, -1.2, phase='trans')],
            transition='LUGEN'),
    ]
    lfml = [
        rec('LFML', 'STAR', 'MEN1A', ['13R'], [pt(1, 'MEN01', 44.2, 3.6, {'type': 'between', 'ft': 8000, 'ft2': 10000}),
                                               pt(2, 'MEN02', 43.8, 4.5, {'type': 'max', 'ft': 5000}, kt=220),
                                               pt(3, 'MEN03', 43.55, 4.95, {'type': 'at', 'ft': 3000})]),
        rec('LFML', 'STAR', 'MEN2B', ['31L'], [pt(1, 'MEN11', 44.0, 3.9, {'type': 'min', 'ft': 7000}),
                                               pt(2, 'MEN12', 43.6, 5.6, {'type': 'at', 'ft': 4000})]),
        rec('LFML', 'STAR', 'MEN1A', [], [pt(1, 'NEPIX', 44.9, 2.4, phase='trans'), pt(2, 'MEN01', 44.2, 3.6, phase='trans')], transition='NEPIX'),
        rec('LFML', 'APP', 'I13R', ['13R'], [pt(1, 'FAF13', 43.5, 5.0, {'type': 'at', 'ft': 2500}, kt=180), pt(2, 'RW13R', 43.445, 5.19),
                                             pt(3, 'MAP13', 43.38, 5.3, phase='missed')]),
    ]
    # LFVA (invented): approaches only, on two runways, one with a transition; no SID, no STAR, no runway record
    lfva = [
        rec('LFVA', 'APP', 'ILS09', ['09'], [pt(1, 'VA101', 45.0, 3.0, {'type': 'at', 'ft': 3000}), pt(2, 'VA102', 45.02, 3.2, {'type': 'at', 'ft': 2000}),
                                             pt(3, 'RW09', 45.03, 3.4)]),
        rec('LFVA', 'APP', 'ILS09', ['09'], [pt(1, 'VA201', 44.8, 2.7, {'type': 'min', 'ft': 4000}), pt(2, 'VA101', 45.0, 3.0)], transition='VA201'),
        rec('LFVA', 'APP', 'VOR09', ['09'], [pt(1, 'VA111', 45.0, 3.0, {'type': 'at', 'ft': 3000}), pt(2, 'RW09', 45.03, 3.4)]),
        rec('LFVA', 'APP', 'VOR27', ['27'], [pt(1, 'VA127', 45.05, 3.8, {'type': 'at', 'ft': 3000}), pt(2, 'RW27', 45.03, 3.45)]),
        # RNP27: no main record, one per entry; VB301 leads to VB127, which is the approach (VB301 -> VB127 -> threshold)
        rec('LFVA', 'APP', 'RNP27', ['27'], [pt(1, 'VB127', 45.06, 3.9, {'type': 'at', 'ft': 3000}), pt(2, 'RW27', 45.03, 3.45)], transition='VB127'),
        rec('LFVA', 'APP', 'RNP27', ['27'], [pt(1, 'VB301', 45.2, 4.3, {'type': 'at', 'ft': 5000}), pt(2, 'VB127', 45.06, 3.9)], transition='VB301'),
    ]
    # LFVB (invented): one STAR that names no runway (it serves them all), no runway record; the base knows its runway axis
    lfvb = [rec('LFVB', 'STAR', 'BET1A', [], [pt(1, 'VB101', 45.8, 3.1, {'type': 'max', 'ft': 9000}), pt(2, 'VB102', 45.6, 3.4, {'type': 'at', 'ft': 4000})])]
    # LFVC (invented): the conflicts. ILS27 (runway 27) with a transition IC301 that starts at IC301 and joins IC127; ILS09; ARR1A (27) ends at
    # IC301 (joins the transition), ARR2B (09) ends at ID999 (joins nothing)
    lfvc = [
        rec('LFVC', 'APP', 'ILS27', ['27'], [pt(1, 'IC127', 45.1, 3.8, {'type': 'at', 'ft': 3000}), pt(2, 'RW27', 45.03, 3.45)]),
        rec('LFVC', 'APP', 'ILS27', ['27'], [pt(1, 'IC301', 45.3, 4.3, {'type': 'at', 'ft': 5000}), pt(2, 'IC127', 45.1, 3.8)], transition='IC301'),
        rec('LFVC', 'APP', 'ILS09', ['09'], [pt(1, 'IC109', 45.0, 3.0, {'type': 'at', 'ft': 3000}), pt(2, 'RW09', 45.03, 3.4)]),
        rec('LFVC', 'STAR', 'ARR1A', ['27'], [pt(1, 'IC201', 45.6, 4.7, {'type': 'max', 'ft': 9000}), pt(2, 'IC301', 45.3, 4.3)]),
        rec('LFVC', 'STAR', 'ARR2B', ['09'], [pt(1, 'IC210', 45.7, 4.8, {'type': 'max', 'ft': 9000}), pt(2, 'ID999', 45.5, 4.9)]),
    ]
    # LFVD (invented): ORD1A (07), ORD2B (25), ILS07, ILS25, and two records never to be listed: a STAR without a name (runway 14) and one
    # marked status 'doubt' (§ 10.26)
    nameless = rec('LFVD', 'STAR', 'X', ['14'], [pt(1, 'ID901', 45.9, 3.9), pt(2, 'ID902', 45.8, 3.8)])
    nameless.update(id='LFVD.STAR.NONAME.RW14.NONE', name=None)
    lfvd = [
        rec('LFVD', 'STAR', 'ORD1A', ['07'], [pt(1, 'ID101', 45.9, 3.1, {'type': 'max', 'ft': 9000}), pt(2, 'ID102', 45.7, 3.3)]),
        rec('LFVD', 'STAR', 'ORD2B', ['25'], [pt(1, 'ID201', 45.9, 3.9, {'type': 'max', 'ft': 9000}), pt(2, 'ID202', 45.7, 3.7)]),
        rec('LFVD', 'APP', 'ILS07', ['07'], [pt(1, 'ID107', 45.6, 3.4, {'type': 'at', 'ft': 3000}), pt(2, 'RW07', 45.5, 3.5)]),
        rec('LFVD', 'APP', 'ILS25', ['25'], [pt(1, 'ID125', 45.6, 3.6, {'type': 'at', 'ft': 3000}), pt(2, 'RW25', 45.5, 3.5)]),
        nameless,
        rec('LFVD', 'STAR', 'GHOST1', ['07'], [pt(1, 'ID301', 45.9, 3.2), pt(2, 'ID302', 45.8, 3.3)], status='doubt'),
    ]
    rw_lfrs = [{'id': '03', 'lat': 47.138, 'lon': -1.62, 'elev': 90, 'qfu': 30}, {'id': '21', 'lat': 47.17, 'lon': -1.595, 'elev': 60, 'qfu': 210}]
    # the coded page of MEN1A and the public base of the charts (an invented path under the SIA's host, the only one aerodb links to: 97bf5577f): aerodb sets its source.url (§ 10.25)
    lfml[0]['source']['ref'] = 'AD_2_LFML_STAR_TEST.pdf'
    rw_lfml = [{'id': '13R', 'lat': 43.445, 'lon': 5.19, 'elev': 30, 'qfu': 130}, {'id': '31L', 'lat': 43.41, 'lon': 5.24, 'elev': 20, 'qfu': 310}]
    old = rec('LFML', 'STAR', 'MAN1A', ['13R'], [pt(1, 'MAN01', 44.0, 3.8)], status='check', kind_src='manual', src_cycle='2025-01-01')
    xpl = rec('LFML', 'STAR', 'XPL1A', ['13R'], [pt(1, 'XPL01', 44.0, 3.7)], status='official', kind_src='cifp')
    return [[f'proc/{cycle}/LFRS.json', file('LFRS', lfrs, rw_lfrs), 'reference'], [f'proc/{cycle}/LFML.json', {**file('LFML', lfml, rw_lfml), 'charts': {'base': 'https://www.sia.aviation-civile.gouv.fr/test/eAIP/', 'items': []}}, 'reference'],
            [f'proc/{cycle}/LFVA.json', file('LFVA', lfva), 'reference'], [f'proc/{cycle}/LFVB.json', file('LFVB', lfvb), 'reference'],
            [f'proc/{cycle}/LFVC.json', file('LFVC', lfvc), 'reference'], [f'proc/{cycle}/LFVD.json', file('LFVD', lfvd), 'reference'],
            ['proc/manual/LFML.json', file('LFML', [old], cy='2025-01-01'), 'reference'], ['proc/local/LFML.json', file('LFML', [xpl]), 'reference'],
            # the index of the hand-read files: LFML was read on 29 Oct 16:53Z under an earlier cycle (coverage('LFML').read_at, outdated)
            ['proc/manual/index.json', {'schema': 1, 'aerodromes': {'LFML': {'STAR': 1, 'cycle': '2025-01-01', 'updated_at': '2026-10-29T16:53:00Z'}}}, 'reference']]
