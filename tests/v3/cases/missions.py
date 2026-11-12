"""Area N — Missions (modules/missions/SPEC.md): the V2 missions read as they are (frame/lib/mission.js), the list of the airline's missions,
choose or draw, and the flight handed to Fuel.  Cases: N1–N5.  Invented missions only (names, positions, callsigns, the aerodromes XTST
and XTSU): no AIP content and no real mission of the user's data."""
import re
import time

from lib import Fail, case, norm, tx

M = '[data-module="missions"]'
MS = 'modules/missions/module.js'
FU = 'modules/fuel/module.js'

# the registry: four flights in two families and one organisation (…Z, never listed); X-003B is flown by ABC, X-003C by another pilot
REGISTRY = """missions:
  - id: X-001A
    family: TESTALPHA
    title: Premier essai
    aircraftTypes: [C30J]
    origin: Base Test (XTST)
    destination: Base Test Sud (XTSU)
    estimate: { block: 95 }
    folder: X_TEST/X-001A
    files: [missionX-001A.yaml]
  - id: X-001Z
    family: TESTALPHA
    title: Organisation de l'essai
    folder: X_TEST/X-001Z
    files: [missionX-001Z.yaml]
  - id: X-002A
    family: TESTALPHA
    title: Second essai
    aircraftTypes: [C30J]
    origin: Base Test (XTST)
    destination: Base Test Sud (XTSU)
    estimate: { block: 120 }
    folder: X_TEST/X-002A
    files: [missionX-002A.yaml]
  - id: X-003B
    family: TESTBRAVO
    title: Troisième essai
    aircraftTypes: [H135]
    origin: Base Test (XTST)
    destination: Base Test (XTST)
    folder: Y_TEST/X-003B
    files: [missionX-003B.yaml]
  - id: X-003C
    family: TESTBRAVO
    title: Quatrième essai
    type: MEDEVAC
    callsigns: [SAMU99]
    teams: [{ name: SAMU99, type: H135, service: SAMU }]
    aircraftTypes: [H135]
    origin: Base Test (XTST)
    destination: Base Test (XTST)
    folder: Y_TEST/X-003C
    files: [missionX-003C.yaml]
"""

# the complete shape: origin, destination, aircraft, turning points, a rendezvous, a zone by its centre, the order of the file
MISSION_2 = """mission: { id: X-002A, type: TRANSPORT }
title: Second essai
summary: Un transport inventé entre deux bases d'essai.
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
aircraft: [{ type: C30J Hercules, cruise_level: FL240, cruise_speed_kt: 300 }]
turning_points:
  - { id: PT1, lat: 44.75, lon: 1.25 }
  - { id: PT2, lat: 44.5, lon: 1.5 }
rendezvous: { id: RDV-1, lat: 44.25, lon: 1.75 }
route_order: [ORIGIN, PT1, PT2, RDV-1, DESTINATION]
notes: [Note inventée pour l'essai.]
"""


def mission_doc(mid):
    """A minimal mission file (the shape of M-001: only mission.id and mission.type, a title)."""
    return f"mission: {{ id: {mid}, type: TEST }}\ntitle: Mission {mid}\n"


def report(i, mission, by):
    """A report of the flight log that names a mission (cr/reports/, metadata.missionId)."""
    return [f'cr/reports/2026-10-2{i}_{by}_{i}.json', {'schema': 1, 'by': by, 'metadata': {'date': f'2026-10-2{i}', 'missionId': mission,
                                                                                               'reportedBy': by}}, 'document']


# the YAML files are texts of the repository: kept by the frame's layer as { path, text } (policy reference), the way D33 seeds its mission
TEXTS = [['missions/mission_registry.yaml', REGISTRY],
         ['missions/X_TEST/X-001A/missionX-001A.yaml', mission_doc('X-001A')],
         ['missions/X_TEST/X-002A/missionX-002A.yaml', MISSION_2],
         ['missions/Y_TEST/X-003B/missionX-003B.yaml', mission_doc('X-003B')],
         ['missions/Y_TEST/X-003C/missionX-003C.yaml', mission_doc('X-003C')]]
_TEXTS_JS = """async (texts) => { const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame');
  r.onupgradeneeded = () => { const d = r.result; for (const [n, o] of [['docs', { keyPath: 'path' }], ['pending', { keyPath: 'path' }], ['meta', { keyPath: 'key' }],
    ['conflicts', { keyPath: 'id', autoIncrement: true }]]) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, o) };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  await new Promise((res, rej) => { const tx = db.transaction('docs', 'readwrite');
    for (const [path, text] of texts) tx.objectStore('docs').put({ path, text, base: text, rev: '', at: Date.now(), policy: 'reference' });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error) }); db.close(); return texts.length }"""


def seed_texts(c):
    """The registry and the mission files, as texts of the repository (before c.open, which seeds the JSON documents)."""
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, TEXTS)


def docs(flown=True):
    """The JSON documents: my report of X-003B, another pilot's report of X-003C."""
    return [report(1, 'X-003B', 'ABC'), report(2, 'X-003C', 'XYZ')] if flown else []


def row(c, key, module=MS):
    return tx(module, key, c.lang)


def open_missions(c, flight=False, started=False):
    seed_texts(c)
    c.open('missions', docs=docs(), flight=flight, started=started, wait=False, app='company')  # Missions: the Company application
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions is drawn')
    # the « volée » badge comes after the reports are read
    c.until(f"!!document.querySelector('{M} [data-id=\"X-003B\"] [data-flown]')", timeout=10000, what='my flown mission is marked')
    c.settle()


def ids(c):
    return c.js(f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id)")


@case('N2', 'Missions: the list of the airline\'s missions by family, searched and filtered, my flown missions marked', 'N', tags=('missions',),
      designs=('standard',), screens=False, langs4=True,
      rule='modules/missions SPEC 2-3: the registry read, an organisation (…Z) never listed, newest series first and grouped by family, '
      'a search (id, title, aerodrome, type), a filter by family, « volée le … » from my reports only')
def n2(c):
    open_missions(c)
    c.eq(ids(c), ['X-003C', 'X-003B', 'X-002A', 'X-001A'], 'the four flights, newest first; the organisation X-001Z is not listed', what='rows')
    fams = c.js(f"[...document.querySelectorAll('{M} [data-family]')].map(h => h.dataset.family)")
    c.eq(fams, ['TESTBRAVO', 'TESTALPHA'], 'grouped by family, read from the registry', what='families')
    flown = norm(c.text(f'{M} [data-id="X-003B"] [data-flown]') or '')
    c.eq(flown, norm(row(c, 'flown').replace('{d}', '21/10/2026')), 'my report of X-003B marks it « volée le 21/10/2026 »', what='flown')
    c.eq(c.count(f'{M} [data-id="X-003C"] [data-flown]'), 0, 'a mission flown by another pilot is not marked', what='flown by XYZ')
    c.page.fill(f'{M} [data-k="q"]', 'xtsu')
    c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 2", what='the search by aerodrome keeps two rows')
    c.eq(ids(c), ['X-002A', 'X-001A'], 'the missions bound to XTSU', what='search')
    c.page.fill(f'{M} [data-k="q"]', '')
    c.page.select_option(f'{M} [data-k="family"]', 'TESTBRAVO')
    c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 2", what='the family filter keeps two rows')
    c.eq(ids(c), ['X-003C', 'X-003B'], 'the TESTBRAVO missions', what='family')


@case('N3', 'Missions: choose one (a flat summary), draw one among those I have not flown, never a silent start', 'N', tags=('missions',),
      designs=('standard',), screens=False, langs4=True,
      rule='modules/missions SPEC 3: « Choisir » opens the mission with « Préparer ce vol »; « Tirer au sort » draws uniformly among the '
      'filtered missions not flown by this pilot and offers « Tirer encore »; all flown: said, nothing drawn')
def n3(c):
    open_missions(c)
    c.tap(f'{M} [data-list] [data-id="X-002A"]')
    c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"X-002A\"]')", what='the chosen mission opens')
    c.ok('Un transport inventé' in (c.text(f'{M} [data-summary]') or ''), c.text(f'{M} [data-summary]'), 'its summary is shown')
    c.ok('C30J' in (c.text(f'{M} [data-pane=mission] .f-dl') or ''), c.text(f'{M} [data-pane=mission] .f-dl'), 'its aircraft type is shown')
    c.eq(c.js(f"document.querySelector('{M} [data-do=prepare]').getAttribute('href')"), '#fuel?mission=X-002A', 'Préparer ce vol goes through Fuel\'s door',
         what='prepare')
    c.eq(c.count(f'{M} [data-drawn]'), 0, 'a chosen mission is not said drawn', what='not drawn')
    c.tap(f'{M} [data-do="back"]')
    c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back to the list')
    # TESTBRAVO: X-003B is mine (flown), X-003C was flown by another pilot: every draw gives X-003C
    c.page.select_option(f'{M} [data-k="family"]', 'TESTBRAVO')
    c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 2", what='the family filter keeps two rows')
    c.tap(f'{M} [data-do="draw"]')
    for n in range(3):
        c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id] [data-drawn]')", what=f'draw {n + 1} shows a mission, said drawn')
        got = c.js(f"document.querySelector('{M} [data-pane=mission]').dataset.id")
        c.eq(got, 'X-003C', f'draw {n + 1}: the one mission of the filter I have not flown', what='drawn')
        c.eq(c.hash(), '#missions', 'a draw never starts a flight', what='no auto-start')
        if n < 2:
            c.page.evaluate(f"document.querySelector('{M} [data-pane=mission]').dataset.id = ''")
            c.tap(f'{M} [data-do="draw"]')
            c.until(f"document.querySelector('{M} [data-pane=mission]')?.dataset.id === 'X-003C'", what='« Tirer encore » draws again')
    c.tap(f'{M} [data-do="back"]')
    c.page.fill(f'{M} [data-k="q"]', 'x-003b')
    c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 1", what='only my flown mission left')
    c.tap(f'{M} [data-do="draw"]')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", norm(row(c, 'allFlown')),
            what='every mission of the filter flown: said')
    c.ok(bool(c.count(f'{M} [data-pane=list]')), 'nothing drawn', 'the list stays')


@case('N4', 'Missions: « Préparer ce vol » gives Fuel the flight of the mission; a route in progress asked first; a started flight refused',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False,
      rule='modules/missions SPEC 4: Fuel\'s door #fuel?mission=<id> writes dep and arr (ICAO of origin / destination), the points in the order '
      'of the file as ICAO coordinates, the level, the aircraft type and flight.mission; a flight with a route is replaced only after the '
      'question; a started flight is never replaced')
def n4(c):
    # a flight with a route (the seeded LFRS → LFML): the question first, « Annuler » keeps it
    open_missions(c, flight=True)
    c.tap(f'{M} [data-list] [data-id="X-002A"]')
    c.until(f"!!document.querySelector('{M} [data-do=prepare]')", what='the mission opens')
    c.tap(f'{M} [data-do="prepare"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=15000, what='Fuel asks before replacing the flight in preparation')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the question is closed')
    c.settle()
    f = c.doc('pilot/ABC/current_flight.json')
    c.eq((f or {}).get('route', {}).get('dep'), 'LFRS', '« Annuler » keeps the flight', what='kept')
    # again, « OK »: the flight of the mission
    c.go('missions')
    c.until(f"!!document.querySelector('{M} [data-list] [data-id]')", what='the list again')
    c.tap(f'{M} [data-list] [data-id="X-002A"]')
    c.until(f"!!document.querySelector('{M} [data-do=prepare]')", what='the mission opens')
    c.tap(f'{M} [data-do="prepare"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=15000, what='asked again')
    c.tap('.f-modal [data-ok]')
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-002A', 'the flight of the mission is written', timeout=8000)
    r = f.get('route', {})
    c.eq([r.get('dep'), r.get('arr')], ['XTST', 'XTSU'], 'departure and arrival from the origin and destination', what='dep arr')
    c.eq([w for w in r.get('text', '').split() if w != 'DCT'], ['XTST', '4445N00115E', '4430N00130E', '4415N00145E', 'XTSU'],
         'the points in the order of the file, as ICAO coordinates (ORIGIN / DESTINATION are the aerodromes)', what='text')
    c.eq((f.get('level') or {}).get('ft'), 24000, 'the cruise level of the mission', what='level')
    c.eq((f.get('aircraft') or {}).get('type'), 'C30J', 'the aircraft type of the mission', what='type')
    c.eq(c.hash().split('?')[0], '#fuel', 'Fuel shows the flight', what='screen')
    # a started flight: refused, said, unchanged
    seed_texts(c)
    c.open('missions', docs=docs(), flight=True, started=True, wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-list] [data-id]')", timeout=15000, what='the list of missions is drawn')
    c.go('fuel?mission=X-001A')
    want = norm(row(c, 'missionStarted', FU).replace('{id}', 'X-001A'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, what='a started flight: said')
    f = c.doc('pilot/ABC/current_flight.json')
    c.eq([(f or {}).get('route', {}).get('dep'), (f or {}).get('mission')], ['LFRS', None], 'the started flight is unchanged', what='started')


# three registry rows whose file does not give a mission: absent from the repository, invalid YAML, a YAML without mission.id / type
BROKEN_REGISTRY = REGISTRY + """  - id: X-006A
    family: TESTCHARLIE
    title: Sans fichier
    folder: Z_TEST/X-006A
    files: [missionX-006A.yaml]
  - id: X-007A
    family: TESTCHARLIE
    title: YAML cassé
    folder: Z_TEST/X-007A
    files: [missionX-007A.yaml]
  - id: X-008A
    family: TESTCHARLIE
    title: Sans type
    folder: Z_TEST/X-008A
    files: [missionX-008A.yaml]
"""


@case('N6', 'Missions: the search reads the activity, the callsigns and the teams, not only the title', 'N', tags=('missions',),
      designs=('standard',), screens=False, langs4=True,
      rule='SOG-0009: in Company › Missions the search finds a mission by its activity (type MEDEVAC, a team service SAMU), its callsign '
      '(SAMU99) and its aerodromes\' ICAO codes, words absent from its title; what is searched is written under the field')
def n6(c):
    open_missions(c)
    c.eq(norm(c.text(f'{M} [data-searchhint]') or ''), norm(tx(MS, 'searchHint', c.lang)), 'what the search reads, under the field', what='hint')
    for q in ('medevac', 'samu', 'samu99'):
        c.page.fill(f'{M} [data-k="q"]', q)
        c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 1", what=f'« {q} » keeps one row')
        c.eq(ids(c), ['X-003C'], f'« {q} » finds X-003C (not in its title)', what=q)


@case('N7', 'Missions: 50 mission files arrived without the registry are listed at the next display, without a button; other files ignored',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0036 (« une arrivée de missions massive dans DEFA/data ; le registre n’est probablement pas à jour ») : the registry is a '
      'view derived from the files: a missions/<family>/<ID>/mission<ID>.yaml no row names is read and listed; a copy in versions/, a file '
      'whose id is not its folder, an organisation (…Z) are not; names and paths bounded (audit 157)')
def n7(c):
    extra = [[f'missions/W_TEST/X-1{i:02d}A/missionX-1{i:02d}A.yaml', mission_doc(f'X-1{i:02d}A')] for i in range(50)]
    extra += [['missions/W_TEST/X-100A/versions/missionX-100A_2026-11-05T20-49-42.yaml', mission_doc('X-100A')],   # a copy: never a row
              ['missions/W_TEST/X-201A/missionX-201A.yaml', mission_doc('X-999A')],   # not the mission of its folder
              ['missions/W_TEST/X-200Z/missionX-200Z.yaml', mission_doc('X-200Z')]]   # an organisation
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, TEXTS + extra)
    c.open('missions', docs=docs(), wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions is drawn')
    c.page.fill(f'{M} [data-k="q"]', 'X-1')
    want = norm(row(c, 'count').replace('{n}', '50'))
    c.until("(w) => (document.querySelector('[data-module=missions] [data-count]')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w",
            want, timeout=20000, what='the 50 files absent from the registry are listed')
    c.eq(ids(c)[:2], ['X-149A', 'X-148A'], 'newest first, with the registry rows', what='first rows')
    for q in ('X-999', 'X-201', 'X-200Z'):
        c.page.fill(f'{M} [data-k="q"]', q)
        c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 0", what=f'« {q} »: not listed')
    c.page.fill(f'{M} [data-k="q"]', 'X-100A')
    c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 1", what='X-100A once (its copy in versions/ is not a row)')
    c.tap(f'{M} [data-list] [data-id="X-100A"]')
    c.until(f"(document.querySelector('{M}')?.textContent || '').includes('Mission X-100A')", what='the mission opens from its file')


@case('N5', 'Missions: a mission whose file does not come says why — absent from the repository, unreadable YAML, no id or type', 'N',
      tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='Simplification 1 Nov (the user: « beaucoup de missions sans fichiers », 57 of 59 files present): files are read waiting for the '
      'network (data.get gave null for a file not yet on the device); « introuvable » only when the repository has not the file, with its '
      'path; an invalid YAML or one without mission.id / mission.type says « illisible » and why; the registry alone is shown. The late '
      'line (« pas encore sur l\'appareil ») has no case: in the suite the store answers at once')
def n5(c):
    texts = [t for t in TEXTS if t[0] != 'missions/mission_registry.yaml'] + [
        ['missions/mission_registry.yaml', BROKEN_REGISTRY],
        ['missions/Z_TEST/X-007A/missionX-007A.yaml', 'mission: { id: X-007A, type: [\n  : : :\n'],
        ['missions/Z_TEST/X-008A/missionX-008A.yaml', 'title: Sans type\n']]
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, texts)
    c.open('missions', docs=docs(), wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions is drawn')
    c.page.select_option(f'{M} [data-k="family"]', 'TESTCHARLIE')
    c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 3", what='the three rows of TESTCHARLIE')

    def opened(mid):
        c.tap(f'{M} [data-list] [data-id="{mid}"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"{mid}\"] [data-why]')", timeout=12000, what=f'{mid} opens and says why')
        got = (c.js(f"document.querySelector('{M} [data-why]').dataset.why"), norm(c.text(f'{M} [data-why]') or ''))
        c.tap(f'{M} [data-do="back"]')
        c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back to the list')
        return got

    why, text = opened('X-006A')
    c.eq(why, 'missing', 'a file the repository has not: « introuvable »', what='X-006A')
    c.eq(text, norm(tx(MS, 'missing', c.lang).replace('{p}', 'missions/Z_TEST/X-006A/missionX-006A.yaml')), 'with its path', what='X-006A text')
    why, text = opened('X-007A')
    c.eq(why, 'unreadable', 'an invalid YAML: « illisible »', what='X-007A')
    head = norm(tx(MS, 'unreadable', c.lang).split('{e}')[0])
    c.ok(text.startswith(head) and len(text) > len(norm(tx(MS, 'unreadable', c.lang).replace('{e}', ''))), text, 'with the reason of the YAML reader')
    why, text = opened('X-008A')
    c.eq(why, 'unreadable', 'a YAML without mission.id / mission.type: « illisible »', what='X-008A')
    c.eq(text, norm(tx(MS, 'unreadable', c.lang).replace('{e}', tx(MS, 'noIdType', c.lang))), 'saying what is missing', what='X-008A text')
    # a mission whose file is there opens without any of these lines
    c.page.select_option(f'{M} [data-k="family"]', 'TESTALPHA')
    c.tap(f'{M} [data-list] [data-id="X-002A"]')
    c.until(f"!!document.querySelector('{M} [data-summary]')", what='X-002A opens on its summary')
    c.eq(c.count(f'{M} [data-why]'), 0, 'a mission read whole says nothing more', what='X-002A')


@case('N1', 'Missions bench: the three shapes of a V2 mission file, the registry, the flight a mission gives', 'N', tags=('missions',),
      designs=('standard',), screens=False,
      rule='modules/missions SPEC 2 and 4: frame/lib/mission.js reads the minimal, the complete and the organisation shapes, the registry, '
      'and missionFlight gives the route (origin / destination ICAO, route_order), the aircraft, the level and speed, the mission id')
def n1(c):
    c.page.goto(f'{c.base}/frame/lib/test/mission.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'frame/lib/test/mission.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}",
         'every check of the bench passes')

# § 10.38 step 1: two invented airlines of one repository (aaa: an EC25, bbb: a C-130J), the index the migration writes
def airline_docs(index=True):
    """The documents of two airlines (never the user's): index, settings and fleet of aaa and bbb; index=False: the airline of today only."""
    if not index:
        return []
    return [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': [{'registration': 'F-AAAA', 'type': 'EC25'}]}, 'document'],
            ['airline/bbb/settings.json', {'schema': 1, 'name': 'Bravo Air'}, 'document'],
            ['airline/bbb/fleet.json', {'schema': 1, 'aircraft': [{'registration': 'F-BBBB', 'type': 'C30J'}]}, 'document']]


def set_airline(c, code):
    """Chooses the current airline as Réglages › Compagnie does (FrameData.setAirline: the event frame-data-airline)."""
    c.eq(c.js("(code) => window.FrameData.setAirline(code)", code), True, f'the airline {code} is chosen', what='setAirline')


_CO_REGISTRY = """missions:
  - { id: X-101A, family: TESTCO, title: Mission Alpha, airline: aaa, folder: X_CO/X-101A, files: [missionX-101A.yaml] }
  - { id: X-102A, family: TESTCO, title: Mission sans compagnie, folder: X_CO/X-102A, files: [missionX-102A.yaml] }
  - { id: X-103A, family: TESTCO, title: Mission Bravo, airline: bbb, folder: X_CO/X-103A, files: [missionX-103A.yaml] }
"""


@case('N8', 'Missions: the list follows the current airline (a mission\'s airline field; none = personal, under « Personnel »); without an index, all',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.38 step 1: airline: <code> in the mission, read again on frame-data-airline; absent = personal (user, 10 Nov 15 h 50, N17)')
def n8(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _CO_REGISTRY]] + [[f'missions/X_CO/{i}/mission{i}.yaml', mission_doc(i)] for i in ('X-101A', 'X-102A', 'X-103A')])
    c.open('missions', docs=airline_docs(), wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions')
    c.eq(ids(c), ['X-101A'], 'Alpha Air (first of the index): its mission only', what='aaa')
    set_airline(c, 'bbb')
    c.until(f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join() === 'X-103A'", what='Bravo Air: its mission only')
    set_airline(c, 'perso')
    c.until(f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join() === 'X-102A'", what='« personnel »: the mission without airline')
    # without an index every mission is listed, as before: N2 and N7, which seed no index


_CAT_REGISTRY = """missions:
  - { id: X-201A, family: TESTCO, airline: aaa, title: Mission fret, category: fret, folder: X_CO/X-201A, files: [missionX-201A.yaml] }
  - { id: X-202A, family: TESTCO, airline: aaa, title: Mission passagers, category: passagers, folder: X_CO/X-202A, files: [missionX-202A.yaml] }
  - { id: X-203A, family: TESTCO, airline: aaa, title: Mission inconnue, category: zzz-inconnue, folder: X_CO/X-203A, files: [missionX-203A.yaml] }
  - { id: X-204A, family: TESTCO, airline: aaa, title: Mission sans catégorie, folder: X_CO/X-204A, files: [missionX-204A.yaml] }
"""


@case('N11', 'Missions: the filter by category lists the categories of the airline its missions carry; an unknown category is ignored; the mission says its category',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.38 / SOG-0041: a mission says its category; the airline\'s categories.json (absent: the common base) through forAirline; '
      'commercial active for an airline of kind « va »; a category the airline does not know is not offered')
def n11(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _CAT_REGISTRY]] + [[f'missions/X_CO/{i}/mission{i}.yaml', mission_doc(i)] for i in ('X-201A', 'X-202A', 'X-203A', 'X-204A')])
    docs = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document']]
    c.open('missions', docs=docs, wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions')
    c.until(f"!!document.querySelector('{M} select[data-k=category]')", timeout=8000, what='the filter by category')
    opts = c.js(f"[...document.querySelectorAll('{M} select[data-k=category] option')].map(o => o.value)")
    c.eq(opts, ['', 'fret', 'passagers'], 'all, then the known categories the missions carry (the unknown one is not offered)', what='options')
    c.page.select_option(f'{M} select[data-k=category]', 'fret')
    c.until(f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join() === 'X-201A'", what='the filter keeps the freight mission')
    c.tap(f'{M} [data-list] [data-id="X-201A"]')
    c.until(f"!!document.querySelector('{M} [data-pane=mission]')", what='the mission opens')
    names = {'fr': 'Fret', 'en': 'Cargo', 'de': 'Fracht', 'es': 'Carga'}
    c.ok(names[c.lang] in c.text(f'{M} [data-pane=mission] [data-cat]'), c.text(f'{M} [data-pane=mission] [data-cat]'), 'the mission says its category')
    # « Préparer ce vol »: Fuel writes the mission's category with the flight (the report reads it there)
    c.tap(f'{M} [data-do="prepare"]')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-201A' and d.get('missionCategory') == 'fret',
                'the flight of the mission carries its category', timeout=10000)


# § 10.45 (SOG-0051): invented missions of the sheet in two levels — positions, names and texts made up, no AIP content, no user mission
_SHEET_REGISTRY = """missions:
  - { id: X-301A, family: TESTSHEET, title: Mission complète, folder: X_SH/X-301A, files: [missionX-301A.yaml] }
  - { id: X-302A, family: TESTSHEET, title: Mission sans risque, folder: X_SH/X-302A, files: [missionX-302A.yaml] }
  - { id: X-303A, family: TESTSHEET, title: Mission ancienne, folder: X_SH/X-303A, files: [missionX-303A.yaml] }
  - { id: X-304A, family: TESTSHEET, title: Mission sans résumé, folder: X_SH/X-304A, files: [missionX-304A.yaml] }
"""
_SHEET_FULL = """mission: { id: X-301A, type: SAR, subtype: RECHERCHE }
title: Mission complète
summary: Une recherche inventée au-dessus d'un terrain d'essai, longue à dessein pour tenir plus de deux lignes sur un téléphone, avec une fin qui ne doit jamais se lire sur la première page de la fiche.
detailed_description: |-
  Premier paragraphe inventé.

  Second paragraphe inventé.
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
target: { id: TARGET, name: Cible d'essai, lat: 44.6, lon: 1.4 }
turning_points:
  - { id: PT1, name: Point un, role: entrée, lat: 44.8, lon: 1.2 }
  - { id: PT2, name: Point deux, role: sortie, lat: 44.4, lon: 1.6 }
rendezvous:
  - { id: RDV-1, name: Rendez-vous d'essai, lat: 44.5, lon: 1.5, participants: [ALPHA1, BRAVO2], role: ralliement }
zones:
  - { id: ZONE-1, name: Secteur nord, kind: search, centre: { lat: 44.7, lon: 1.3 }, radius_km: 12, role: recherche, time_on_task_min: 30 }
  - { id: ZONE-2, name: Secteur sud, kind: exclusion, points: [{ lat: 44.2, lon: 1.6 }, { lat: 44.2, lon: 1.8 }, { lat: 44.1, lon: 1.7 }] }
teams:
  - { name: ALPHA1, service: Service d'essai, type: H135, role: recherche }
  - { name: BRAVO2, service: Service d'essai, type: H145, role: relais }
  - { name: CHARLIE3, service: Service d'essai, type: EC25, role: hélitreuillage }
aircraft: [{ type: H135 }]
objectives: { primary: Trouver la cible inventée., secondary: [Rester en contact., Rentrer avant la nuit.] }
payload: { description: Un treuil inventé., mass_kg: 120, passengers: 2 }
risks:
  - { hazard: Danger un, mitigation: Parade un }
  - { hazard: Danger deux, mitigation: Parade deux }
  - { hazard: Danger trois, mitigation: Parade trois }
  - { hazard: Danger quatre, mitigation: Parade quatre }
  - { hazard: Danger cinq, mitigation: Parade cinq }
maps:
  - { id: general, filename: generalX-301A.png, type: general, description: Vue générale inventée. }
  - { id: zone_1, filename: zoneX-301A.png, type: zone, description: Le secteur nord., centre_ref: ZONE-1, range_km: 30 }
  - { id: bad, filename: ../../secret.png, type: detail, description: Un chemin refusé. }
"""
_SHEET_NORISK = """mission: { id: X-302A, type: TRANSPORT }
title: Mission sans risque
summary: Un transport inventé sans risque déclaré.
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
"""
_SHEET_NOSUMMARY = """mission: { id: X-304A, type: TRANSPORT }
title: Mission sans résumé
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
risks:
  - { hazard: Danger seul, mitigation: Parade seule }
"""
_SHEET_LEGACY = """mission: { id: X-303A, type: TRANSPORT }
title: Mission ancienne
summary: Une mission inventée sans aucune coordonnée.
maps:
  - { filename: legacyX-303A.png, type: general, description: La carte d'origine. }
"""
# a 1 × 1 PNG (invented): the image of the legacy mission, kept where readBytes reads it on a device without launcher (meta « bytes:<path> »)
_PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1F, 0x15,
        0xC4, 0x89, 0, 0, 0, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0xF8, 0xCF, 0xC0, 0xF0, 0x1F, 0, 0x05, 0, 0x01, 0xFF, 0x89, 0x99,
        0x3D, 0x1D, 0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]
_BYTES_JS = """async ([path, bytes]) => { const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  await new Promise((res, rej) => { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put({ key: 'bytes:' + path, buf: new Uint8Array(bytes).buffer });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error) }); db.close(); return true }"""


def open_sheet(c, mid):
    """The three invented missions, the list, then the mission `mid` opened."""
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _SHEET_REGISTRY], ['missions/X_SH/X-301A/missionX-301A.yaml', _SHEET_FULL],
                     ['missions/X_SH/X-302A/missionX-302A.yaml', _SHEET_NORISK], ['missions/X_SH/X-303A/missionX-303A.yaml', _SHEET_LEGACY],
                     ['missions/X_SH/X-304A/missionX-304A.yaml', _SHEET_NOSUMMARY]])
    c.js(_BYTES_JS, ['missions/X_SH/X-303A/legacyX-303A.png', _PNG])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id=\"{mid}\"]')", timeout=15000, what='the list of missions')
    c.tap(f'{M} [data-list] [data-id="{mid}"]')
    c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"{mid}\"] [data-first]')", timeout=10000, what=f'{mid} opens')
    c.settle()


_FIRST_JS = f"""(() => {{ const f = document.querySelector('{M} [data-first]'), vis = e => !!e && e.getBoundingClientRect().height > 0;
  return {{ blocks: [...f.children].filter(vis).length, risks: [...f.querySelectorAll('[data-risks] > ul [data-risk]')].map(e => e.textContent.trim()),
    more: f.querySelector('[data-riskmore] summary')?.textContent.trim() || '', teams: f.querySelectorAll('[data-team]').length,
    zones: f.querySelector('[data-zones]')?.textContent || '', primary: f.querySelectorAll('.primary').length, prepare: !!f.querySelector('[data-do=prepare].primary'),
    detail: vis(f.querySelector('[data-do=detail]')), cat: f.querySelector('[data-cat]')?.textContent || '', detailShown: vis(document.querySelector('{M} [data-detailpane]')),
    order: [...f.children].filter(vis).map(e => e.matches('h2') ? 'title' : e.matches('[data-cat]') ? 'cat' : e.matches('[data-summary]') ? 'summary' :
      e.matches('[data-risks]') ? 'risks' : e.matches('[data-teams]') ? 'teams' : e.matches('[data-zones]') ? 'zones' : e.matches('.ms-actions') ? 'actions' : e.tagName),
    sumLines: (() => {{ const p = f.querySelector('[data-summary]'); if (!p) return 0; const lh = parseFloat(getComputedStyle(p).lineHeight) || 1.4 * parseFloat(getComputedStyle(p).fontSize);
      return Math.round(p.getBoundingClientRect().height / lh) }})(),
    sumCut: (() => {{ const p = f.querySelector('[data-summary]'); return !!p && p.scrollHeight > p.clientHeight + 1 }})(),
    empty: [...f.children].filter(e => !e.textContent.trim() && !e.querySelector('img')).length,
    sw: document.documentElement.scrollWidth, iw: innerWidth }} }})()"""


@case('N9', 'Mission sheet, first page: title, category, the summary in two lines at most, three risks « danger → parade » and « N autres », teams, zones count, one primary action; no risk said',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.45 / SOG-0051 (user: « les risques sur la première page »; refused 10 Nov: « oui, mais la description courte, avant les '
      'risques ») : title, category (with the state « Volée le … »), summary (two lines at most, « … »), risks, teams, zones, actions — seven '
      'at most (rule 13), « Préparer ce vol » the one primary action, « Détail » the secondary; no empty line without a summary')
def n9(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    open_sheet(c, 'X-301A')
    f = c.js(_FIRST_JS)
    c.le(f['blocks'], 7, 'seven elements at most on the first page', what='elements')
    c.eq(f['order'], ['title', 'cat', 'summary', 'risks', 'teams', 'zones', 'actions'], 'the summary always comes after the category, before the risks', what='order')
    c.ok(1 <= f['sumLines'] <= 2 and f['sumCut'], f, 'the summary in two lines at most, cut with « … »')
    c.eq(f['risks'], ['Danger un → Parade un', 'Danger deux → Parade deux', 'Danger trois → Parade trois'], 'three risks « danger → parade »', what='risks')
    c.eq(norm(f['more']), norm(row(c, 'more').replace('{n}', '2')), 'the two others folded', what='others')
    c.eq(f['teams'], 3, 'the teams engaged', what='teams')
    c.ok('ZONE-1' in f['zones'] and 'ZONE-2' in f['zones'] and '2' in f['zones'], f['zones'], 'the zones as a count with their names')
    c.ok('SAR' in f['cat'] and 'RECHERCHE' in f['cat'], f['cat'], 'the category line: activity and subtype')
    c.ok(f['primary'] == 1 and f['prepare'] and f['detail'], f, 'one primary action, « Préparer ce vol », and « Détail »')
    c.ok(not f['detailShown'], f, 'on a phone the detail is a second screen')
    c.le(f['sw'], f['iw'], 'no horizontal scroll at 390 px', what='scrollWidth')
    c.shot(f'N9_{c.design}_{c.width}_{c.lang}.png')
    # a mission without risks says so, and keeps its summary on the first page
    c.tap(f'{M} [data-do="back"]')
    c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back to the list')
    c.tap(f'{M} [data-list] [data-id="X-302A"]')
    c.until(f"!!document.querySelector('{M} [data-first] [data-norisk]')", timeout=10000, what='« Aucun risque déclaré »')
    c.eq(norm(c.text(f'{M} [data-first] [data-norisk]')), norm(row(c, 'noRisk')), 'the sentence', what='no risk')
    c.ok('sans risque déclaré' in (c.text(f'{M} [data-first] [data-summary]') or ''), 'no summary', 'the summary stays on the first page')
    c.eq(c.js(_FIRST_JS)['order'], ['title', 'cat', 'summary', 'risks', 'actions'], 'before the risk line', what='order')
    # a mission without a summary has no empty line
    c.tap(f'{M} [data-do="back"]')
    c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back to the list')
    c.tap(f'{M} [data-list] [data-id="X-304A"]')
    c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"X-304A\"] [data-first] [data-risk]')", timeout=10000, what='X-304A opens')
    g = c.js(_FIRST_JS)
    c.eq([g['order'], g['empty']], [['title', 'cat', 'risks', 'actions'], 0], 'no summary line, no empty line', what='[order, empty blocks]')


@case('N10', 'Mission sheet, detail: each zone and each map provided opens the Map (no PNG with coordinates); a legacy mission without coordinates shows its PNG',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.45 / SOG-0051 (user: « affichage des cartes incluses »): the coordinates are the truth — a Map link, never the studio\'s PNG; '
      'a PNG only for a mission without coordinates, its file name checked (audit 157); the browser\'s back returns from the detail')
def n10(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    open_sheet(c, 'X-301A')
    c.tap(f'{M} [data-do="detail"]')
    c.until(f"(() => {{ const d = document.querySelector('{M} [data-detailpane]'); return !!d && d.getBoundingClientRect().height > 0 }})()", what='the detail screen')
    c.ok(not c.js(f"document.querySelector('{M} [data-first]').getBoundingClientRect().height > 0"), 'both shown', 'the detail replaces the first page on a phone')
    secs = c.js(f"[...document.querySelectorAll('{M} [data-detailpane] [data-sec]')].map(e => e.dataset.sec)")
    c.eq(secs, ['desc', 'obj', 'zones', 'rdv', 'route', 'maps', 'payload'], 'the sections in the order of the design', what='sections')
    for sec in secs:
        c.js(f"document.querySelector('{M} [data-sec={sec}]').open = true")
    zl = c.js(f"[...document.querySelectorAll('{M} [data-zone]')].map(e => [e.dataset.zone, e.querySelector('a[data-zonemap]')?.getAttribute('href') || ''])")
    c.eq([z[0] for z in zl], ['ZONE-1', 'ZONE-2'], 'one line per zone', what='zones')
    c.eq(zl[0][1], '?app=pilot#maps?mission=X-301A&map=zoneX-301A.png&zone=ZONE-1', 'a zone with a map of its own: the Map at that map, centred on it', what='zone 1')
    c.eq(zl[1][1], '?app=pilot#maps?mission=X-301A&zone=ZONE-2', 'a polygon zone: the Map centred on it', what='zone 2')
    c.ok(c.js(f"(document.querySelector('{M} [data-zone=\"ZONE-2\"]')?.textContent || '').includes({repr(row(c, 'polygon'))})"), 'no polygon', 'a polygon zone says « polygone »')
    maps = c.js(f"[...document.querySelectorAll('{M} [data-sec=maps] [data-map]')].map(e => e.querySelector('a[data-maplink]')?.getAttribute('href') || '')")
    c.eq(maps, ['?app=pilot#maps?mission=X-301A&map=generalX-301A.png', '?app=pilot#maps?mission=X-301A&map=zoneX-301A.png', ''],
         'each map provided is a Map link; a refused file name (« ../../secret.png ») has none', what='maps')
    c.eq(c.count(f'{M} img'), 0, 'no PNG when the mission has coordinates', what='no image')
    c.ok(c.js(f"document.querySelectorAll('{M} [data-routetable] tr').length === 2 && !!document.querySelector('{M} [data-routenm]')"), 'no table', 'the route provided: its points and the distance')
    c.shot(f'N10_{c.design}_{c.width}_{c.lang}.png')
    # the browser's back returns to the first page, then to the list
    c.page.go_back()
    c.until(f"(() => {{ const f = document.querySelector('{M} [data-first]'); return !!f && f.getBoundingClientRect().height > 0 }})()", what='back: the first page')
    c.page.go_back()
    c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back again: the list')
    # a legacy mission without coordinates: its PNG, from the mission folder
    c.tap(f'{M} [data-list] [data-id="X-303A"]')
    c.until(f"!!document.querySelector('{M} [data-first]')", timeout=10000, what='the legacy mission opens')
    c.tap(f'{M} [data-do="detail"]')
    c.js(f"document.querySelector('{M} [data-sec=maps]').open = true")
    c.until(f"(() => {{ const i = document.querySelector('{M} img[data-png]'); return !!i && !i.hidden && i.complete && i.naturalWidth > 0 }})()", timeout=8000,
            what='the PNG of the legacy mission is shown')
    c.eq(c.count(f'{M} a[data-maplink]'), 0, 'no Map link without coordinates', what='no link')



# SOG-0179: invented missions of three families — a known one (SAR), the registry's MEDEVAC (the report's HEMS), an unknown code
_FAM_REGISTRY = """missions:
  - { id: X-401A, family: SAR, title: Mission de famille connue, folder: S_SAR/X-401A, files: [missionX-401A.yaml] }
  - { id: X-402A, family: MEDEVAC, title: Mission sanitaire, folder: M_MEDEVAC/X-402A, files: [missionX-402A.yaml] }
  - { id: X-403A, family: TESTFAM, title: Mission de famille inconnue, folder: X_FAM/X-403A, files: [missionX-403A.yaml] }
"""


@case('N12', 'Missions: a family is said by its acronym first — in bold, then its long name — in the list headings, « SIGLE · Nom long » in the filter; an unknown code keeps its acronym alone',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0179 (user, 10 Nov: « le nom abrégé a disparu »): the acronym first then the long name, bold where the rendering is ours, plain '
      'text in a native list, the acronym alone when there is no long name, never the long name alone; one source with the report (modules/report/vocab.js)')
def n12(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _FAM_REGISTRY]])
        c.open('missions', wait=False, app='company')
        c.until(f"document.querySelectorAll('{M} [data-pane=list] [data-family]').length === 3", timeout=15000, what='the three family headings')
        heads = c.js(f"""[...document.querySelectorAll('{M} [data-list] [data-family]')].map(h => [h.dataset.family, h.querySelector('b[data-famshort]')?.textContent || '',
            (h.querySelector('[data-famlong]')?.textContent || '').trim(), getComputedStyle(h.querySelector('b[data-famshort]') || h).fontWeight, getComputedStyle(h.querySelector('[data-famlong]') || h).fontWeight])""")
        got = {h[0]: h for h in heads}
        c.ok(got['SAR'][1] == 'SAR' and got['SAR'][2] and int(got['SAR'][3]) >= 600 and int(got['SAR'][4]) < 600, heads, f'{w} px: « SAR » in bold, then its long name in plain weight')
        c.ok(got['MEDEVAC'][1] == 'MEDEVAC' and 'HEMS' in got['MEDEVAC'][2], heads, f'{w} px: MEDEVAC, the registry\'s code of the HEMS family, with its long name')
        c.ok(got['TESTFAM'][1] == 'TESTFAM' and not got['TESTFAM'][2], heads, f'{w} px: an unknown code keeps its acronym alone')
        opts = c.js(f"[...document.querySelectorAll('{M} select[data-k=family] option')].filter(o => o.value).map(o => [o.value, o.textContent.trim()])")
        c.ok(all(t.startswith(v) for v, t in opts) and dict(opts).get('SAR', '').startswith('SAR · '), opts, f'{w} px: the filter « SIGLE · Nom long », the acronym first')
        c.shot(f'N12_{c.design}_{w}_{c.lang}.png')



@case('N13', 'Preparing a mission: the quote has a distance as soon as the flight of the mission has a route — never « distance inconnue » with a plan',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0193 (user: « « distance inconnue » alors qu\'on a un plan de vol. dur d\'établir un devis carbu si la distance n\'est pas '
      'calculée »): the distance comes from the plan of the mission — its points, and its origin and destination by their coordinates when '
      'the aerodromes are not in the base (XTST / XTSU, invented)')
def n13(c):
    seed_texts(c)
    c.open('missions', docs=docs(), wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions is drawn')
    c.go('fuel?mission=X-002A')
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-002A', 'the flight of the mission is written', timeout=10000)
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and (d.get('route') or {}).get('distanceNm', 0) > 0, 'the route of the mission has a distance', timeout=10000)
    nm = f['route']['distanceNm']
    c.ok(60 <= nm <= 90, nm, 'the distance of the plan: origin → PT1 → PT2 → RDV-1 → destination, four legs of about 18 NM (the points alone: 37 NM)')
    unknown = norm(tx('modules/fuel/module.js', 'noDistance', c.lang))
    c.wait(1500)
    txt = norm(c.js("document.querySelector('[data-module=fuel]')?.textContent || ''"))
    c.ok(unknown not in txt, unknown, 'never « distance inconnue » with a route')
    # a mission from its origin to its destination only (no turning point), both bases unknown to the base: the plan still has its
    # distance (before: no point at all, « distance inconnue »)
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _DIRECT_REGISTRY], ['missions/X_DIR/X-501A/missionX-501A.yaml', _DIRECT_MISSION]])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id=\"X-501A\"]')", timeout=15000, what='the direct mission is listed')
    c.go('fuel?mission=X-501A')
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=15000, what='Fuel asks before replacing the flight of X-002A')
    c.tap('.f-modal [data-ok]')
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-501A' and (d.get('route') or {}).get('distanceNm', 0) > 0,
                    'the direct mission has a distance', timeout=10000)
    c.ok(60 <= f['route']['distanceNm'] <= 80, f['route']['distanceNm'], 'origin → destination, about 73 NM')
    c.wait(1500)
    c.ok(unknown not in norm(c.js("document.querySelector('[data-module=fuel]')?.textContent || ''")), unknown, 'and no « distance inconnue »')


# SOG-0193: an invented mission from its origin to its destination, no turning point, both bases unknown to the published base
_DIRECT_REGISTRY = """missions:
  - { id: X-501A, family: TESTDIR, title: Mission directe, folder: X_DIR/X-501A, files: [missionX-501A.yaml] }
"""
_DIRECT_MISSION = """mission: { id: X-501A, type: TRANSPORT }
title: Mission directe
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
aircraft: [{ type: C30J Hercules, cruise_level: FL240, cruise_speed_kt: 300 }]
"""



_NEW_STATE_JS = """() => { const q = s => document.querySelector('[data-module=fuel] ' + s);
  return { dep: q('input[data-k=dep]')?.value || '', arr: q('input[data-k=arr]')?.value || '', rtext: q('[data-k=rtext]')?.value || '',
    step: [...document.querySelectorAll('[data-module=fuel] .fu-steps [data-step]')].findIndex(b => b.getAttribute('aria-current') === 'step'),
    tiles: !!q('.fu-result .f-tiles b'), done: [...document.querySelectorAll('[data-module=fuel] .fu-steps [data-step]')].filter(b => b.textContent.includes('✓')).length } }"""


@case('N14', 'Preparing a mission, « Nouveau vol » on the step Flight empties every step, the linked mission and the quote at the tap, and stays on the step Flight — no navigation needed to see it',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0194 (user: « comment annuler une mission en cours de planif ? carburant -> devis -> vol -> nouveau vol. rien ne disparaît. -> 2 -> 1. '
      'vide »): the exact path — the mission\'s flight in Fuel, the Plan, the step Flight, « Nouveau vol », OK — read at once, at 390 and 1 280')
def n14(c):
    for w, beside in ((390, False), (1280, False), (1280, True)):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        seed_texts(c)
        c.open('missions', docs=docs(), wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions is drawn')
        c.go('fuel?with=maps&mission=X-002A' if beside else 'fuel?mission=X-002A')
        c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-002A', 'the flight of the mission is written', timeout=10000)
        c.until("(document.querySelector('[data-module=fuel] input[data-k=dep]')?.value || '') === 'XTST'", timeout=10000, what='the step Flight shows the mission')
        b = "[data-module=fuel] .fu-steps [data-step='0']"
        if c.js(f"!!document.querySelector(\"{b}\")"):
            c.js(f"document.querySelector(\"{b}\").click()")
        c.settle()
        c.tap('[data-module="fuel"] [data-do="newflight"]')
        c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=8000, what='« Nouveau vol » asks first')
        c.tap('.f-modal [data-ok]')
        c.until("!document.querySelector('.f-modal')", what='the question is closed')
        try:
            c.until(f"(() => {{ const s = ({_NEW_STATE_JS})(); return !s.dep && !s.arr && !s.rtext }})()", timeout=3000, what='-')
        except Fail:
            pass
        after = c.js(_NEW_STATE_JS)
        c.eq([after['dep'], after['arr'], after['rtext']], ['', '', ''], f'{w} px: departure, arrival and route empty at once, on the step Flight itself', what='[dep, arr, route]')
        c.ok(after['step'] in (0, -1) and not after['tiles'], after, f'{w} px: the step Flight, no quote left')
        c.eq(after['done'], 0, f'{w} px: no step keeps its ✓ (the weather read of the old flight is gone too)', what='steps done')
        d = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and not (d.get('route') or {}).get('dep') and not d.get('mission'), 'the flight written empty, mission unlinked')
        r = d.get('route') or {}
        c.eq([r.get('text') or '', len(r.get('points') or []), r.get('distanceNm') or 0, d.get('profile')], ['', 0, 0, None],
             f'{w} px: the record has no route left — no text, no points, no distance, no profile: the Map has nothing to draw', what='[text, points, distance, profile]')
        c.wait(3000)
        c.shot(f'N14_{c.design}_{w}{"_map" if beside else ""}_{c.lang}.png')


@case('N15', 'Missions, draw by family: the drawn mission says its family as the list does — the acronym in bold, then its long name (« SAR · Récupération de personnel »)',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0187 (user: « tirer au sort une famille : il n\'y a plus que le titre court, pas le titre long. On voudrait « ISR - Description de '
      'l\'acronyme », avec ISR en gras. comme pour les CR »): one function, familyParts, in the list, the filter and the drawn sheet; captures 390 and 1 280')
def n15(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _FAM_REGISTRY]])
        c.open('missions', wait=False, app='company')
        c.until(f"document.querySelectorAll('{M} [data-pane=list] [data-family]').length === 3", timeout=15000, what='the list')
        c.page.select_option(f'{M} select[data-k=family]', 'SAR')
        c.until(f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join() === 'X-401A'", what='the filter keeps SAR')
        c.tap(f'{M} [data-do="draw"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"X-401A\"] h2')", timeout=10000, what='the drawn mission')
        fam = c.js(f"""(() => {{ const e = document.querySelector('{M} [data-pane=mission] h2 [data-family-of]'), b = e?.querySelector('b[data-famshort]'), l = e?.querySelector('[data-famlong]');
            return e ? {{ short: b?.textContent || '', long: (l?.textContent || '').trim(), bold: +getComputedStyle(b || e).fontWeight, plain: +getComputedStyle(l || e).fontWeight }} : null }})()""")
        c.ok(fam and fam['short'] == 'SAR' and fam['long'] and fam['bold'] >= 600 and fam['plain'] < 600, fam, f'{w} px: « SAR » in bold, then its long name, in the drawn sheet')
        c.shot(f'N15_{c.design}_{w}_{c.lang}.png')



_PANE_JS = """() => { const p = document.querySelector('[data-module=fuel] [data-mpane]'), r = p?.getBoundingClientRect();
  return { shown: !!p && !p.hidden && r.height > 0, first: p?.querySelector('section')?.hasAttribute('data-mrisks') || false,
    risks: [...(p?.querySelectorAll('[data-mrisk]') || [])].map(e => e.textContent.trim()), zones: p?.querySelectorAll('[data-mzone] a').length || 0,
    step: [...document.querySelectorAll('[data-module=fuel] .fu-steps [data-step]')].findIndex(b => b.getAttribute('aria-current') === 'step'),
    sw: document.documentElement.scrollWidth, iw: innerWidth } }"""


@case('N16', 'Preparing a mission: a chip « Mission <ID> » in the head of Fuel opens the mission sheet in a pane, its risks first, without leaving the step; the pane closes',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0193 L2 (user: « le chemin direct de retour vers la mission est où ? Parce que l\'accès mission -> fuel est direct, mais pas le '
      'retour »; § 10.47 b): the chip in the head, the sheet in a pane over the step (risks first, then summary, objectives, teams, zones on the '
      'Map), the step unchanged; captures 390 and 1 280 written by the case')
def n16(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _SHEET_REGISTRY], ['missions/X_SH/X-301A/missionX-301A.yaml', _SHEET_FULL]])
        c.open('missions', wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions')
        c.go('fuel?mission=X-301A')
        # a flight left by the previous width: Fuel asks before replacing it
        c.until("() => !!document.querySelector('.f-modal [data-ok]') || !!document.querySelector('[data-module=fuel] .fu-mchip')", timeout=15000,
                what='the question, or the flight of the mission')
        if c.js("!!document.querySelector('.f-modal [data-ok]')"):
            c.tap('.f-modal [data-ok]')
        c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-301A', 'the flight of the mission is written', timeout=10000)
        c.until("!!document.querySelector('[data-module=fuel] .fu-mchip')", timeout=8000, what='the chip « Mission X-301A » in the head')
        chip = c.js("document.querySelector('[data-module=fuel] .fu-mchip').textContent.trim()")
        c.ok('X-301A' in chip, chip, f'{w} px: the chip names the mission')
        c.js("document.querySelector(\"[data-module=fuel] .fu-steps [data-step='1']\")?.click()")
        c.settle()
        before = c.js(_PANE_JS)['step']
        c.tap('[data-module="fuel"] .fu-mchip')
        c.until("!!document.querySelector('[data-module=fuel] [data-mpane] [data-mrisks]')", timeout=10000, what='the pane with the mission sheet')
        p = c.js(_PANE_JS)
        c.ok(p['shown'] and p['first'] and len(p['risks']) == 5 and p['risks'][0] == 'Danger un → Parade un', p, f'{w} px: the sheet in a pane, its five risks first')
        c.eq(p['zones'], 2, f'{w} px: each zone on the Map', what='zone links')
        c.eq(p['step'], before, f'{w} px: the step is not left', what='step')
        c.le(p['sw'], p['iw'], f'{w} px: no horizontal scroll', what='scrollWidth')
        c.shot(f'N16_{c.design}_{w}_{c.lang}.png')
        c.tap('[data-module="fuel"] [data-mpane] [data-do="mclose"]')
        c.until("document.querySelector('[data-module=fuel] [data-mpane]').hidden", what='the pane closes')
        c.eq(c.js(_PANE_JS)['step'], before, f'{w} px: still the same step', what='step after closing')



_OWN_REGISTRY = """missions:
  - { id: X-111A, family: TESTCO, title: Mission sans champ, folder: X_CO/X-111A, files: [missionX-111A.yaml] }
  - { id: X-112A, family: TESTCO, title: Mission Delta, airline: ddd, folder: X_CO/X-112A, files: [missionX-112A.yaml] }
"""


@case('N17', 'Missions: a mission that names no airline is personal — under « Personnel », never under the first airline of the index; a mission that names a code is under that code',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='user, 10 Nov 15 h 50: « toutes les missions sont « ITF », alors qu\'en vrai, elles sont perso » (his index has itf first, no mission names an '
      'airline); MS.ownerOf / MS.missionsFor; invented codes iii (first of the index) and ddd; captures 390 and 1 280')
def n17(c):
    docs = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'iii', 'name': 'India Air'}, {'code': 'ddd', 'name': 'Delta Air'}]}, 'document'],
            ['airline/iii/settings.json', {'schema': 1, 'name': 'India Air', 'kind': 'va'}, 'document'],
            ['airline/ddd/settings.json', {'schema': 1, 'name': 'Delta Air', 'kind': 'sog'}, 'document']]
    lst = f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join()"
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _OWN_REGISTRY]] + [[f'missions/X_CO/{i}/mission{i}.yaml', mission_doc(i)] for i in ('X-111A', 'X-112A')])
        c.open('missions', docs=docs, wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-results] [data-count]')", timeout=15000, what='the list is drawn')
        set_airline(c, 'iii')  # a choice of an earlier run may be kept: India Air, the first of the index, chosen
        c.until(f"!!document.querySelector('{M} [data-results] [data-count]')", what='the list of India Air')
        c.wait(300)
        c.eq(c.js(lst), '', f'{w} px: India Air (first of the index): no mission (the one without airline is not its own)', what='iii')
        set_airline(c, 'perso')
        c.until(f"{lst} === 'X-111A'", what=f'{w} px: « Personnel »: the mission that names no airline')
        c.eq(norm(c.text(f'{M} [data-count]')), norm(row(c, 'count1').replace('{n}', '1')), f'{w} px: « 1 mission », singular (« 1 missions » before)', what='count')
        c.shot(f'N17_{c.design}_{w}_{c.lang}.png')
        set_airline(c, 'ddd')
        c.until(f"{lst} === 'X-112A'", what=f'{w} px: Delta Air: the mission that names ddd')



_SUMMARY_REGISTRY = """missions:
  - { id: X-121A, family: TESTCO, title: Mission résumé d abord, folder: X_CO/X-121A, files: [summaryX-121A.md, missionX-121A.yaml] }
  - { id: X-122A, family: TESTCO, title: Mission YAML cassé, folder: X_CO/X-122A, files: [missionX-122A.yaml] }
  - { id: '123', family: TESTCO, title: Mission ancien numéro, folder: X_CO/X-123A, files: [summaryX-123A.md] }
"""


@case('N18', 'Missions: a mission whose registry row lists its summary first (files: [summary….md, mission….yaml]) opens; a broken YAML file says its line, never only « illisible »',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0212 (a) (user: « beaucoup de « fichier illisible » »): 62 of the 153 rows of his registry list the summary first, the reader took '
      'only the first file and refused it; invented missions; captures 390 and 1 280')
def n18(c):
    broken = 'mission: { id: X-122A, type: TEST }\ntitle: Mission X-122A\nnotes: ok\n  bad: indent\n'  # js-yaml: bad indentation, line 4
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _SUMMARY_REGISTRY], ['missions/X_CO/X-121A/missionX-121A.yaml', mission_doc('X-121A')],
                         ['missions/X_CO/X-122A/missionX-122A.yaml', broken], ['missions/X_CO/X-123A/missionX-123A.yaml', mission_doc('X-123A')]])
        c.open('missions', wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-121A\"]')", timeout=15000, what='the list of missions')
        c.tap(f'{M} [data-list] [data-id="X-121A"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission]')", what='the mission opens')
        c.wait(300)
        c.eq(c.count(f'{M} [data-pane=mission] [data-why]'), 0, f'{w} px: the summary-first mission is read (no « illisible »)', what='why')
        c.page.go_back()
        # a summary only and an old numeric id (« 71 », folder F-071): the file named after its folder
        c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-123A\"]')", what='back to the list')
        c.tap(f'{M} [data-list] [data-id="X-123A"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission]')", what='the old-numbered mission opens')
        c.wait(300)
        c.eq(c.count(f'{M} [data-pane=mission] [data-why]'), 0, f'{w} px: a summary only: the file named after its folder is read', what='why (old id)')
        c.page.go_back()
        c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-122A\"]')", what='back to the list')
        c.tap(f'{M} [data-list] [data-id="X-122A"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission] [data-why=unreadable]')", what='the broken mission says why')
        said = norm(c.text(f'{M} [data-pane=mission] [data-why=unreadable]'))
        at = norm(row(c, 'yamlAt').split('{l}')[0])
        c.ok(re.search(re.escape(at) + r'\s*4\b', said) and 'indentation' in said, said, f'{w} px: the reason is said at its line (« {at}4 : bad indentation… »)')
        c.shot(f'N18_{c.design}_{w}_{c.lang}.png')



_ADD_REGISTRY = """missions:
  - { id: X-101A, family: TESTCO, title: Mission déjà là, folder: X_CO/X-101A, files: [missionX-101A.yaml] }
"""
# a pool of invented missions in one file: two new, a bad id, an organisation, a duplicate, the existing X-101A
_POOL = ('mission: { id: X-301A, type: TESTCO, subtype: Patrouille }\ntitle: Pool un\n---\n'
         'mission: { id: X-302A, type: TESTCO, airline: ddd }\ntitle: Pool deux\n---\n'
         'mission: { id: x-9, type: TESTCO }\n---\nmission: { id: X-399Z, type: TESTCO }\n---\n'
         'mission: { id: X-301A, type: TESTCO }\n---\nmission: { id: X-101A, type: TESTCO }\ntitle: Mission remplacée\n')
_TEXT_OF = """async (p) => { const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  const get = st => new Promise(res => { try { const q = db.transaction(st).objectStore(st).get(p); q.onsuccess = () => res(q.result); q.onerror = () => res(null) } catch { res(null) } });
  const row = (await get('pending')) || (await get('docs')); db.close(); return row && typeof row.text === 'string' ? row.text : null }"""
# an earlier run of the same browser may have left its writes: the paths of this case are cleared (queue and cache) before it starts
_CLEAR_ADD = """async () => { if (!(await indexedDB.databases()).some(d => d.name === 'sogFrame')) return false; const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  for (const st of ['pending', 'docs']) { if (!db.objectStoreNames.contains(st)) continue;
    const keys = await new Promise(res => { const q = db.transaction(st).objectStore(st).getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]) });
    const t = db.transaction(st, 'readwrite'); for (const k of keys) if (/^missions\/X_(TESTCO|CO)\//.test(String(k))) t.objectStore(st).delete(k);
    await new Promise(res => { t.oncomplete = res; t.onerror = res }) }
  db.close(); return true }"""


@case('N19', 'Missions: « Ajouter des missions » reads one or more YAML files (a pool) or a pasted YAML, shows what it read and what it refused with the reason BEFORE writing, writes each mission at its place; an existing one only when « remplacer » is ticked',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0212 (b) (user, 10 Nov: « rajouter rapidement la possibilité d\'ajouter une mission (ou un pool de missions) depuis un yaml »): '
      'missions/<letter>_<FAMILY>/<ID>/mission<ID>.yaml, never a path from the file; untrusted input (bounds, id rule); a mission without '
      'airline is personal; invented missions; captures 390 and 1 280')
def n19(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_CLEAR_ADD)
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _ADD_REGISTRY], ['missions/X_CO/X-101A/missionX-101A.yaml', mission_doc('X-101A')]])
        c.open('missions', wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-101A\"]')", timeout=15000, what='the list of missions')
        c.tap(f'{M} [data-do="add"]')
        c.until(f"!!document.querySelector('{M} [data-pane=add] input[type=file]')", what='the add screen')
        c.page.set_input_files(f'{M} [data-pane=add] input[type=file]', files=[{'name': 'pool.yaml', 'mimeType': 'text/yaml', 'buffer': _POOL.encode('utf-8')}])
        c.page.fill(f'{M} [data-pane=add] textarea[data-k=addtext]', 'mission: { id: X-303A, type: TESTCO }\ntitle: Collée\n')
        c.tap(f'{M} [data-do="addread"]')
        c.until(f"!!document.querySelector('{M} [data-addlist]')", what='what was read')
        got = c.js(f"[...document.querySelectorAll('{M} [data-addlist] [data-add]')].map(e => [e.dataset.add, !!e.querySelector('input[data-replace]')])")
        c.eq(got, [['X-301A', False], ['X-302A', False], ['X-101A', True], ['X-303A', False]], f'{w} px: the missions read, the existing one with « remplacer ? »', what='read')
        reasons = c.js(f"[...document.querySelectorAll('{M} [data-refused] li')].map(e => e.dataset.reason)")
        c.eq(reasons, ['badId', 'organisation', 'twice'], f'{w} px: the refused ones, each with its reason', what='refused')
        c.eq(norm(c.text(f'{M} [data-do=addwrite]')), norm(row(c, 'addDo').replace('{n}', '3')), f'{w} px: « Ajouter (3) »: the existing one is not counted until ticked', what='button')
        c.eq(c.doc_paths('missions/X_TESTCO/'), [], 'nothing written before « Ajouter »', what='written before')
        c.js(f"document.querySelector('{M} [data-pane=add]').scrollIntoView({{block: 'start'}})")
        c.shot(f'N19_{c.design}_{w}_{c.lang}.png')
        c.tap(f'{M} [data-do="addwrite"]')
        c.until(f"!document.querySelector('{M} [data-pane=add]')", what='back to the list')
        for mid in ('X-301A', 'X-302A', 'X-303A'):
            t = c.js(_TEXT_OF, f'missions/X_TESTCO/{mid}/mission{mid}.yaml') or ''
            c.ok(f'id: {mid}' in t, t[:80], f'{w} px: {mid} written at missions/X_TESTCO/{mid}/mission{mid}.yaml')
        c.ok('Collée' in (c.js(_TEXT_OF, 'missions/X_TESTCO/X-303A/missionX-303A.yaml') or ''), '', 'a file of one mission is written as it is')
        c.ok('remplacée' not in (c.js(_TEXT_OF, 'missions/X_CO/X-101A/missionX-101A.yaml') or ''), '', f'{w} px: the existing mission is not replaced (not ticked)')
        c.until(f"['X-303A', 'X-302A', 'X-301A', 'X-101A'].every(i => !!document.querySelector('{M} [data-list] [data-id=\"' + i + '\"]'))", what=f'{w} px: the added missions are in the list at once')
        # again, « remplacer » ticked: the existing mission is rewritten at ITS place (the registry's folder), never at a new path
        c.tap(f'{M} [data-do="add"]')
        c.page.fill(f'{M} [data-pane=add] textarea[data-k=addtext]', 'mission: { id: X-101A, type: TESTCO }\ntitle: Mission remplacée\n')
        c.tap(f'{M} [data-do="addread"]')
        c.until(f"!!document.querySelector('{M} [data-addlist] input[data-replace]')", what='« remplacer ? »')
        c.page.check(f'{M} [data-addlist] input[data-replace]')
        c.tap(f'{M} [data-do="addwrite"]')
        c.until(f"!document.querySelector('{M} [data-pane=add]')", what='back to the list')
        c.ok('remplacée' in (c.js(_TEXT_OF, 'missions/X_CO/X-101A/missionX-101A.yaml') or ''), '', f'{w} px: ticked, the existing mission is replaced at its place')
        c.eq(c.js(_TEXT_OF, 'missions/X_TESTCO/X-101A/missionX-101A.yaml'), None, 'never a second copy at another path', what='second copy')



_SCOPE_REGISTRY = """missions:
  - { id: X-131A, family: TESTCO, title: Mission perso, folder: X_CO/X-131A, files: [missionX-131A.yaml] }
  - { id: X-132A, family: TESTCO, title: Mission Delta, airline: ddd, folder: X_CO/X-132A, files: [missionX-132A.yaml] }
  - { id: X-133A, family: TESTCO, title: Mission India, airline: iii, folder: X_CO/X-133A, files: [missionX-133A.yaml] }
"""


@case('N20', 'Missions: the scope « Ma compagnie · Personnel · Toutes les compagnies » — the personal missions or those of another airline are found, each says its airline, and can be prepared',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0212 (c) (user, 10 Nov: « possibilité de rechercher une mission dans une compagnie d\'à côté »); MS.ownerOf; invented airlines iii, ddd; '
      'captures 390 and 1 280')
def n20(c):
    docs = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'iii', 'name': 'India Air'}, {'code': 'ddd', 'name': 'Delta Air'}]}, 'document'],
            ['airline/iii/settings.json', {'schema': 1, 'name': 'India Air', 'kind': 'va'}, 'document'],
            ['airline/ddd/settings.json', {'schema': 1, 'name': 'Delta Air', 'kind': 'sog'}, 'document']]
    lst = f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join()"
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _SCOPE_REGISTRY]] + [[f'missions/X_CO/{i}/mission{i}.yaml', mission_doc(i)] for i in ('X-131A', 'X-132A', 'X-133A')])
        c.open('missions', docs=docs, wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-results] [data-count]')", timeout=15000, what='the list is drawn')
        set_airline(c, 'iii')
        c.until(f"{lst} === 'X-133A'", what=f'{w} px: « Ma compagnie »: India Air\'s mission')
        c.eq(c.js(f"[...document.querySelectorAll('{M} select[data-k=scope] option')].map(o => o.value)"), ['mine', 'perso', 'all'], 'the three scopes', what='scopes')
        c.page.select_option(f'{M} select[data-k=scope]', 'perso')
        c.until(f"{lst} === 'X-131A'", what=f'{w} px: « Personnel »: the mission that names no airline')
        c.page.select_option(f'{M} select[data-k=scope]', 'all')
        c.until(f"{lst} === 'X-133A,X-132A,X-131A'", what=f'{w} px: « Toutes les compagnies »: all three')
        badges = c.js(f"Object.fromEntries([...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => [b.dataset.id, b.querySelector('[data-co]')?.textContent.trim() || '']))")
        c.eq(badges, {'X-133A': '', 'X-132A': 'Delta Air', 'X-131A': norm(row(c, 'personal'))}, f'{w} px: a mission of another airline says its airline; mine says nothing', what='badges')
        c.shot(f'N20_{c.design}_{w}_{c.lang}.png')
        c.tap(f'{M} [data-list] [data-id="X-132A"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission] [data-do=prepare]')", what=f'{w} px: Delta Air\'s mission opens, « Préparer ce vol » there')
        c.eq(c.js(f"document.querySelector('{M} [data-do=prepare]').getAttribute('href')"), '#fuel?mission=X-132A', 'prepared like any other', what='prepare')
        c.page.go_back()
        set_airline(c, 'ddd')
        c.until(f"{lst} === 'X-132A'", what=f'{w} px: another airline chosen: back to « Ma compagnie »')



@case('N21', 'Missions: one id per mission — a registry row that keeps an old number (« 123 ») is listed under the id of its folder and file (« X-123A »); the search finds both',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='Simplification 10 Nov (after SOG-0212 a: 50 rows of the user\'s registry keep « 71 » for F-071): the list shows the id the mission\'s sheet says, '
      'never two ids for one mission; the registry (the V2 CPCO\'s data) is not touched; invented missions')
def n21(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _SUMMARY_REGISTRY], ['missions/X_CO/X-121A/missionX-121A.yaml', mission_doc('X-121A')],
                     ['missions/X_CO/X-123A/missionX-123A.yaml', mission_doc('X-123A')]])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-121A\"]')", timeout=15000, what='the list of missions')
    c.ok('123' not in ids(c) and 'X-123A' in ids(c), ids(c), 'the old number is not an id of the list; the folder\'s id is')
    c.eq(ids(c).count('X-123A'), 1, 'one row for the mission', what='rows')
    for q in ('123', 'X-123A'):
        c.page.fill(f'{M} [data-k="q"]', q)
        c.until(f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join() === 'X-123A'", what=f'the search « {q} » finds it')



_MOVE_REGISTRY = """missions:
  - { id: X-151A, family: TESTCO, title: Mission une, folder: X_CO/X-151A, files: [missionX-151A.yaml] }
  - { id: X-152A, family: TESTCO, title: Mission deux, folder: X_CO/X-152A, files: [missionX-152A.yaml] }
  - { id: X-153A, family: TESTCO, title: Mission trois, folder: X_CO/X-153A, files: [missionX-153A.yaml] }
  - { id: X-154A, family: TESTCO, title: Mission cassée, folder: X_CO/X-154A, files: [missionX-154A.yaml] }
"""


@case('N22', 'Missions: a mission changes airline — on its sheet (« Compagnie : … · Changer », said before writing), in a batch (what changes and what cannot, before writing) and when adding from YAML; only the airline field of the file changes',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0223 (user, 10 Nov: « il faut pouvoir changer une mission de compagnie. comme pour les appareils »): codes from the index only; '
      'an unreadable file is said and left; invented airlines iii, ddd; captures 390 and 1 280')
def n22(c):
    docs = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'iii', 'name': 'India Air'}, {'code': 'ddd', 'name': 'Delta Air'}]}, 'document'],
            ['airline/iii/settings.json', {'schema': 1, 'name': 'India Air', 'kind': 'va'}, 'document'],
            ['airline/ddd/settings.json', {'schema': 1, 'name': 'Delta Air', 'kind': 'sog'}, 'document']]
    broken = 'mission: { id: X-154A, type: TEST }\ntitle: Mission X-154A\nnotes: ok\n  bad: indent\n'
    lst = f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(b => b.dataset.id).join()"
    path = lambda i: f'missions/X_CO/{i}/mission{i}.yaml'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_CLEAR_ADD)
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _MOVE_REGISTRY], [path('X-154A'), broken]] +
             [[path(i), '# gardé\n' + mission_doc(i)] for i in ('X-151A', 'X-152A', 'X-153A')])
        c.open('missions', docs=docs, wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-results] [data-count]')", timeout=15000, what='the list is drawn')
        set_airline(c, 'iii')
        c.until(f"!!document.querySelector('{M} select[data-k=scope]')", what='the scope')
        c.page.select_option(f'{M} select[data-k=scope]', 'perso')
        c.until(f"{lst} === 'X-154A,X-153A,X-152A,X-151A'", what='the four personal missions')
        # one mission, on its sheet
        c.tap(f'{M} [data-list] [data-id="X-151A"]')
        c.until(f"!!document.querySelector('{M} [data-coline] [data-do=moveone]')", what=f'{w} px: « Compagnie : Personnel · Changer » on the sheet')
        c.ok(norm(row(c, 'personal')) in norm(c.text(f'{M} [data-coline]')), c.text(f'{M} [data-coline]'), 'the sheet says its airline')
        c.tap(f'{M} [data-do="moveone"]')
        c.page.select_option(f'{M} select[data-k=moveone]', 'ddd')
        c.until(f"!!document.querySelector('{M} [data-movesay]')", what='what will be written, said before')
        c.ok('Delta Air' in c.text(f'{M} [data-movesay]'), c.text(f'{M} [data-movesay]'), f'{w} px: « X-151A passe de Personnel à Delta Air »')
        c.ok('airline' not in (c.js(_TEXT_OF, path('X-151A')) or ''), '', 'nothing written before « Écrire »')
        c.shot(f'N22_{c.design}_{w}_{c.lang}_one.png')
        c.tap(f'{M} [data-do="moveonewrite"]')
        c.until(f"(document.querySelector('{M} [data-coline]')?.textContent || '').includes('Delta Air')", what='the sheet says Delta Air')
        c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", norm(row(c, 'moved1').replace('{n}', '1')), what=f'{w} px: « 1 mission changée de compagnie : elle part … », singular')
        t = c.js(_TEXT_OF, path('X-151A')) or ''
        c.ok('airline: ddd' in t and t.startswith('# gardé'), t[:120], f'{w} px: the file has airline: ddd, the rest kept (its comment)')
        c.tap(f'{M} [data-do="back"]')
        # a batch: the personal missions left, one unreadable
        c.until(f"{lst} === 'X-154A,X-153A,X-152A'", what='X-151A is no longer personal')
        c.tap(f'{M} [data-do="moveall"]')
        c.until(f"!!document.querySelector('{M} [data-movecount]')", timeout=10000, what='the files read')
        c.page.select_option(f'{M} select[data-k=moveto]', 'iii')
        c.until(f"(document.querySelector('{M} [data-movecount]')?.textContent || '').includes('India Air')", what='the target said')
        c.ok('X-154A' in c.text(f'{M} [data-moveunread]'), c.text(f'{M} [data-moveunread]'), f'{w} px: the unreadable one is said and left')
        c.ok(c.text(f'{M} [data-movecount]').strip().startswith('2'), c.text(f'{M} [data-movecount]'), f'{w} px: two missions change')
        c.js(f"document.querySelector('{M} [data-pane=move]').scrollIntoView({{block: 'start'}})")
        c.shot(f'N22_{c.design}_{w}_{c.lang}_batch.png')
        c.tap(f'{M} [data-do="movewrite"]')
        c.until(f"!document.querySelector('{M} [data-pane=move]')", what='back to the list')
        c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", norm(row(c, 'moved').replace('{n}', '2')), what=f'{w} px: « 2 missions changées de compagnie : elles partent … », plural')
        for i in ('X-152A', 'X-153A'):
            c.ok('airline: iii' in (c.js(_TEXT_OF, path(i)) or ''), i, f'{w} px: {i} written to India Air')
        c.eq(c.js(_TEXT_OF, path('X-154A')), broken, 'the unreadable file is untouched', what='X-154A')
        c.page.select_option(f'{M} select[data-k=scope]', 'mine')
        c.until(f"{lst} === 'X-153A,X-152A'", what=f'{w} px: India Air now lists them')
        # when adding from YAML: « Ajouter ces missions à »
        c.tap(f'{M} [data-do="add"]')
        c.page.fill(f'{M} [data-pane=add] textarea[data-k=addtext]', 'mission: { id: X-155A, type: TESTCO }\ntitle: Ajoutée\n')
        c.tap(f'{M} [data-do="addread"]')
        c.until(f"!!document.querySelector('{M} select[data-k=addas]')", what='« Ajouter ces missions à »')
        c.page.select_option(f'{M} select[data-k=addas]', 'ddd')
        c.tap(f'{M} [data-do="addwrite"]')
        c.until(f"!document.querySelector('{M} [data-pane=add]')", what='added')
        c.ok('airline: ddd' in (c.js(_TEXT_OF, 'missions/X_TESTCO/X-155A/missionX-155A.yaml') or ''), '', f'{w} px: the added mission is Delta Air\'s')



_THEME_REGISTRY = """missions:
  - { id: X-601A, family: TESTCO, title: Mission fret, category: fret, folder: X_CO/X-601A, files: [missionX-601A.yaml] }
  - { id: X-602A, family: FIRE, title: Mission feu, folder: F_FIRE/X-602A, files: [missionX-602A.yaml] }
"""
_THEME_FIRE = """mission: { id: X-602A, type: FIRE, subtype: GAAR }
title: Mission feu
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
"""
_THEME_FRET = """mission: { id: X-601A, type: TESTCO, category: fret }
title: Mission fret
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
"""


@case('N23', 'Theme and sub-theme of the flight, on the step Flight of Fuel: offered from the airline\'s themes (a commercial airline: COMMERCIAL), filled by the mission (« fret » → COMMERCIAL / CARGO, FIRE « GAAR »), chosen freely, written with the flight',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0202 T2 (user, 10 Nov: « À quel moment, je décide de faire une mission fret, passagers, essais en vol... ? »): at the step Flight, '
      'optional, filled by the mission; the lists offer only the themes of the airline (themes.json, else its kind), the flight\'s kept; invented missions '
      'and airlines; captures 390 and 1 280')
def n23(c):
    co = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}]}, 'document'],
          ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document'],
          ['airline/bbb/settings.json', {'schema': 1, 'name': 'Bravo Air', 'kind': 'sog'}, 'document']]
    flight = "async () => { const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) }); " \
             "const get = st => new Promise(res => { try { const q = db.transaction(st).objectStore(st).get('pilot/ABC/current_flight.json'); q.onsuccess = () => res(q.result); q.onerror = () => res(null) } catch { res(null) } }); " \
             "const row = (await get('pending')) || (await get('docs')); db.close(); try { const f = JSON.parse(row.text); return [f.theme || '', f.series || ''] } catch { return null } }"
    opts = lambda k: c.js(f"[...document.querySelectorAll('[data-module=fuel] select[data-k={k}] option')].map(o => o.value)")

    def flight_is(want, what, timeout=12000):
        # the written flight (queue, then cache), polled here: an async expression in c.until would be a Promise, true at once
        end = time.time() + timeout / 1000
        got = None
        while time.time() < end:
            got = c.js(f'({flight})()')
            if got == want:
                return
            c.wait(200)
        raise Fail(f'{what}: {got}', str(want), 'pilot/ABC/current_flight.json theme / series')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _THEME_REGISTRY], ['missions/X_CO/X-601A/missionX-601A.yaml', _THEME_FRET],
                         ['missions/F_FIRE/X-602A/missionX-602A.yaml', _THEME_FIRE]])
        c.open('missions', docs=co, wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-results] [data-count]')", timeout=15000, what='the list is drawn')
        set_airline(c, 'aaa')
        c.go('fuel?mission=X-601A')
        for _ in range(20):  # the flight of an earlier run has a route: « replace the current flight? » is asked, answered yes
            if c.js("!!document.querySelector('.f-modal [data-ok]')"):
                c.tap('.f-modal [data-ok]')
                break
            if c.js(f'({flight})()') == ['COMMERCIAL', 'CARGO']:
                break
            c.wait(200)
        flight_is(['COMMERCIAL', 'CARGO'], f'{w} px: the mission « fret » fills COMMERCIAL / CARGO')
        c.until("!!document.querySelector('[data-module=fuel] select[data-k=theme]')", timeout=8000, what='the theme list on the step Flight')
        c.until("document.querySelectorAll('[data-module=fuel] select[data-k=theme] option').length === 2", what='the airline\'s themes read')
        c.eq(opts('theme'), ['', 'COMMERCIAL'], f'{w} px: a commercial airline: COMMERCIAL only (and « aucun »)', what='themes')
        # the words of the report on Fuel's lists (the user, 10 Nov: « famille / série »)
        labs = c.js("['theme', 'series'].map(k => document.querySelector(`[data-module=fuel] select[data-k=${k}]`).closest('label').firstChild.textContent.trim())")
        c.eq(labs, {'fr': ['Famille', 'Série'], 'en': ['Family', 'Series'], 'de': ['Familie', 'Serie'], 'es': ['Familia', 'Serie']}[c.lang],
             f'{w} px: « Famille » / « Série », the report\'s words', what='labels')
        c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=series]').value"), 'CARGO', 'the sub-theme filled', what='series')
        c.eq(opts('series'), ['', 'CARGO', 'PASSENGERS', 'EMPTY_LEG', 'VIP', 'TRAINING', 'TRANSIT', 'FLIGHT_TEST'], 'the seven sub-themes of COMMERCIAL', what='series list')
        c.shot(f'N23_{c.design}_{w}_{c.lang}_delivered.png')
        c.page.select_option('[data-module=fuel] select[data-k=series]', 'PASSENGERS')
        flight_is(['COMMERCIAL', 'PASSENGERS'], f'{w} px: the chosen sub-theme written')
        c.page.select_option('[data-module=fuel] select[data-k=theme]', '')
        flight_is(['', ''], 'no theme: none written (optional)')
        c.ok(c.js("document.querySelector('[data-module=fuel] select[data-k=series]').disabled"), '', 'without a theme, no sub-theme')
        # a mission of a military family: its theme and the series of its subtype, kept in the list although not the airline's
        c.go('missions')  # a mission is taken at Fuel's mount: from Missions, « Préparer ce vol », as the pilot does
        c.until(f"!!document.querySelector('{M} select[data-k=scope]')", timeout=15000, what='Missions')
        c.page.select_option(f'{M} select[data-k=scope]', 'all')  # X-602A names no airline: personal, found in « Toutes les compagnies »
        c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-602A\"]')", what='X-602A listed')
        c.tap(f'{M} [data-list] [data-id="X-602A"]')
        c.tap(f'{M} [data-do="prepare"]')
        c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=15000, what='« replace the current flight? » asked (the flight has a route)')
        c.tap('.f-modal [data-ok]')
        flight_is(['FIRE', 'GAAR'], f'{w} px: FIRE « GAAR » from the mission')
        c.wait(1500)
        c.eq(opts('theme'), ['', 'FIRE', 'COMMERCIAL'], 'the flight\'s theme kept in the list, with the airline\'s', what='themes kept')



# SOG-0193 L3: an invented mission with a transit point (free), a source (by its role), a rendezvous and a target (imposed)
_LOCK_REGISTRY = """missions:
  - { id: X-601A, family: TESTLOCK, title: Mission verrouillée, folder: X_LOCK/X-601A, files: [missionX-601A.yaml] }
"""
_LOCK_MISSION = """mission: { id: X-601A, type: FIRE }
title: Mission verrouillée
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
turning_points:
  - { id: PT1, name: Transit inventé, lat: 44.8, lon: 1.2, role: transit }
  - { id: PT2, name: Lac inventé, lat: 44.6, lon: 1.4, role: écopage simulé }
rendezvous: { id: RDV-1, lat: 44.4, lon: 1.6 }
target: { id: TARGET, name: Cible inventée, lat: 44.2, lon: 1.8 }
route_order: [ORIGIN, PT1, PT2, RDV-1, TARGET, DESTINATION]
"""
_LOCKS = {'4436N00124E': 'PT2', '4424N00136E': 'RDV-1', '4412N00148E': 'TARGET'}


@case('N24', 'Preparing a mission: its rendezvous, source and target are locked points of the route (lock: « mission »), neither moved nor removed in Fuel, put back when the text loses them',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0193 L3 (user: « le pilote a toute liberté pour faire son propre plan de vol, mais les points de rdv, source, cible, restent '
      'imposés sur la carte »; V3 § 10.47 c): route.points carries lock « mission » on them (the Map locks them in its Édition), the transit point '
      'stays the pilot\'s; captures 390 and 1 280 written by the case')
def n24(c):
    fuel = '[data-module=fuel]'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _LOCK_REGISTRY], ['missions/X_LOCK/X-601A/missionX-601A.yaml', _LOCK_MISSION]])
        c.open('missions', wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions')
        c.go('fuel?mission=X-601A')
        c.until("() => !!document.querySelector('.f-modal [data-ok]') || !!document.querySelector('[data-module=fuel] .fu-mchip')", timeout=15000,
                what='the question, or the flight of the mission')
        if c.js("!!document.querySelector('.f-modal [data-ok]')"):
            c.tap('.f-modal [data-ok]')

        def locked(d):
            pts = (d or {}).get('route', {}).get('points') or []
            return {p.get('id'): p.get('mission') for p in pts if p.get('lock') == 'mission'}
        try:
            f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-601A' and len(locked(d)) == 3,
                            f'{w} px: the flight of the mission has its three imposed points locked', timeout=15000)
        except Fail:   # say the route as it was (the generic message stops before it)
            r = (c.doc('pilot/ABC/current_flight.json') or {}).get('route') or {}
            raise Fail(f"{w} px: route text {r.get('text')!r}, locks {r.get('locks')}, points {[(p.get('id'), p.get('lock')) for p in r.get('points') or []]}",
                       'the three imposed points locked')
        c.eq(locked(f), _LOCKS, f'{w} px: source (by its role), rendezvous and target locked, with their mission names', what='locked points')
        ids = [p.get('id') for p in f['route']['points']]
        c.ok('4448N00112E' in ids and '4448N00112E' not in locked(f), ids, f'{w} px: the transit point is in the route and stays the pilot\'s')
        c.js(f"document.querySelector(\"{fuel} .fu-steps [data-step='1']\")?.click()")
        c.until(f"document.querySelectorAll('{fuel} [data-pts] [data-lock]').length === 3", timeout=8000, what=f'{w} px: the three rows say « imposé par la mission »')
        rows = c.js(f"""[...document.querySelectorAll('{fuel} [data-pts] .fu-pt')].filter(r => r.querySelector('[data-lock]')).map(r =>
            [r.querySelector('[data-lock]').textContent.trim(), [...r.querySelectorAll('[data-do=ptup],[data-do=ptdown],[data-do=ptdel]')].every(b => b.disabled)])""")
        word = tx(FU, 'ptLock', c.lang).split('{id}')[-1].strip()
        c.ok(all(r[1] for r in rows) and all(word in r[0] for r in rows) and 'RDV-1' in ' '.join(r[0] for r in rows), rows,
             f'{w} px: each imposed row named, its up / down / remove off')
        c.js(f"(() => {{ const r = [...document.querySelectorAll('{fuel} [data-pts] .fu-pt')].find(r => r.querySelector('[data-lock]'));"
             " let d = r.closest('details'); while (d) { d.open = true; d = d.parentElement?.closest('details') } r.scrollIntoView({block: 'center'}) })()")
        c.ok(c.js('document.documentElement.scrollWidth <= innerWidth + 1'), c.js('[document.documentElement.scrollWidth, innerWidth]'),
             f'{w} px: the imposed rows fit the width (the line « imposé par la mission » wraps, never widens the page)')
        c.shot(f'N24_{c.design}_{w}_{c.lang}_delivered.png')
        # the text loses the rendezvous: put back after the source at the exit of the field, still locked
        rt = f'{fuel} [data-k="rtext"]'
        text = c.js(f"document.querySelector('{rt}').value")
        c.ok('4424N00136E' in text, text, 'the rendezvous is a word of the route text')
        c.page.fill(rt, ' '.join(x for x in text.split() if x != '4424N00136E'))
        c.page.locator(rt).blur()
        c.until(f"document.querySelector('{rt}').value.includes('4424N00136E')", timeout=8000, what=f'{w} px: the rendezvous put back in the text')
        t2 = [x for x in c.js(f"document.querySelector('{rt}').value").split() if x != 'DCT']
        c.ok(t2.index('4424N00136E') == t2.index('4436N00124E') + 1, t2, 'put back after the imposed point that precedes it (the order of the mission)')
        c.until_doc('pilot/ABC/current_flight.json', lambda d: locked(d) == _LOCKS, f'{w} px: still three locked points after the edit', timeout=10000)



@case('N25', 'Preparing a mission, then « Nouveau vol »: the mission is left — no chip, no imposed point, no mission in the flight, and it never comes back (address, another screen and back)',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0251 (user: « si on a démarré la préparation d\'une mission, et qu\'on passe à « nouveau vol », la mission reste active »): '
      'the invented mission X-601A of N24')
def n25(c):
    fuel = '[data-module=fuel]'
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _LOCK_REGISTRY], ['missions/X_LOCK/X-601A/missionX-601A.yaml', _LOCK_MISSION]])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions')
    c.go('fuel?mission=X-601A')
    c.until("() => !!document.querySelector('.f-modal [data-ok]') || !!document.querySelector('[data-module=fuel] .fu-mchip')", timeout=15000,
            what='the question, or the flight of the mission')
    if c.js("!!document.querySelector('.f-modal [data-ok]')"):
        c.tap('.f-modal [data-ok]')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-601A', 'the flight of the mission', timeout=12000)
    c.until(f"!!document.querySelector('{fuel} .fu-mchip')", timeout=8000, what='the chip « Mission X-601A »')
    c.tap(f'{fuel} [data-do="newflight"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=8000, what='« Nouveau vol » asks')
    c.tap('.f-modal [data-ok]')
    d = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and not d.get('mission'), 'the mission left in the flight', timeout=10000)
    c.ok(not (d.get('route') or {}).get('locks') and not any(p.get('lock') for p in (d.get('route') or {}).get('points') or []), d.get('route'),
         'no imposed point left')
    c.eq(c.count(f'{fuel} .fu-mchip'), 0, 'no chip', what='chip')
    c.ok('mission=' not in c.js('location.hash'), c.js('location.hash'), 'the address no longer names the mission')
    # another screen and back: the mission does not come back
    c.go('maps')
    c.wait(1500)
    c.page.go_back()
    c.page.go_back()
    c.wait(2500)
    d = c.doc('pilot/ABC/current_flight.json') or {}
    c.ok(not d.get('mission'), [d.get('mission'), c.js('location.hash')], 'back to Fuel: the mission never comes back')



@case('N26', 'The Map leaves the mission (its cross writes the flight without it): Fuel follows at once — no chip, no imposed point — without changing screen',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0251 (user: « on ferme la croix de la mission (sur la carte), la croix disparait, la mission reste toujours active »): the other side of '
      'the cross — another writer of the flight (the Map) removes mission and locks; the invented mission X-601A of N24')
def n26(c):
    fuel = '[data-module=fuel]'
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _LOCK_REGISTRY], ['missions/X_LOCK/X-601A/missionX-601A.yaml', _LOCK_MISSION]])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions')
    c.go('fuel?mission=X-601A')
    c.until("() => !!document.querySelector('.f-modal [data-ok]') || !!document.querySelector('[data-module=fuel] .fu-mchip')", timeout=15000,
            what='the question, or the flight of the mission')
    if c.js("!!document.querySelector('.f-modal [data-ok]')"):
        c.tap('.f-modal [data-ok]')
    c.until(f"!!document.querySelector('{fuel} .fu-mchip')", timeout=12000, what='the chip « Mission X-601A »')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('mission') == 'X-601A' and (d.get('route') or {}).get('locks'),
                'the flight of the mission, its locks', timeout=12000)
    # the Map's cross: the flight written without its mission (another writer, as the Map is)
    c.js("""async () => { const d = FrameData.adapter({ id: 'maps', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
      const path = 'pilot/ABC/current_flight.json', cur = (await d.get(path)) || {}, r = { ...(cur.route || {}) };
      delete r.locks; r.points = (r.points || []).map(({ lock, mission, ...p }) => p);
      await d.put(path, { ...cur, mission: null, missionCategory: '', route: r, by: 'maps', updated_at: new Date().toISOString() }); return true }""")
    c.until(f"!document.querySelector('{fuel} .fu-mchip')", timeout=8000, what='Fuel drops the chip at once, same screen')
    c.wait(1500)
    d = c.doc('pilot/ABC/current_flight.json') or {}
    c.ok(not d.get('mission') and not (d.get('route') or {}).get('locks'), [d.get('mission'), (d.get('route') or {}).get('locks')],
         'Fuel does not write the mission back (nor its locks)')
