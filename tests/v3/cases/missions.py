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


@case('N9', 'Mission sheet, first page: title, category, the summary in full (SOG-0291), three risks « danger → parade » and « N autres », teams, zones count, one primary action; no risk said',
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
    c.ok(f['sumLines'] >= 1 and not f['sumCut'], f, 'the summary in full, never clamped (SOG-0291 replaces the two lines of SOG-0051)')
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


@case('N12', 'Missions: a family is said by its acronym first — in bold, then its long name — in the list headings, « lettre · SIGLE · Nom long » in the filter (SOG-0292); an unknown code keeps its acronym alone',
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
        # SOG-0292: the letter first when the family has one (« S · SAR · … »), then the acronym, then the long name
        c.ok(all(re.sub(r'^[A-Z] · ', '', t).startswith(v) for v, t in opts) and dict(opts).get('SAR', '').startswith('S · SAR · '), opts,
             f'{w} px: the filter « lettre · SIGLE · Nom long », the acronym after the letter')
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



# Time on area (CONCEPTION 11/11 § 1 bis / ter): an invented mission of the shape of the user's (time_on_task_min on points), a range on
# a turning point, a duration key the rule does not take (time_window_min)
_HOLD_REGISTRY = """missions:
  - { id: X-701A, family: TESTHOLD, title: Mission sur zone, folder: X_HOLD/X-701A, files: [missionX-701A.yaml] }
"""
_HOLD_MISSION = """mission: { id: X-701A, type: FIRE }
title: Mission sur zone
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
aircraft: [{ type: C30J Hercules, cruise_level: FL240, cruise_speed_kt: 300 }]
turning_points:
  - { id: PT1, name: Lac inventé, lat: 44.8, lon: 1.2, role: recherche, time_on_task_min: "5-40" }
  - { id: PT2, name: Transit inventé, lat: 44.6, lon: 1.4, role: transit, time_window_min: 15 }
target: { id: TARGET, name: Cible inventée, lat: 44.2, lon: 1.8, time_on_task_min: 25 }
route_order: [ORIGIN, PT1, PT2, TARGET, DESTINATION]
"""


@case('N40', 'Time on area per point: read from the mission (a range counted at its maximum), said in the quote one line per point, changed by the pilot in the list of points; an unread duration key said',
      'N', tags=('missions', 'fuel'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0193 L4, CONCEPTION 11/11 § 1 bis / ter (user: « (fourchette. entre 5 et 40 mn, par ex.) »; « comme le reste, les champs ne sont pas '
      'canoniques »): keys containing on_task / on_station / on_zone / hold / loiter / orbit; the maximum of a range counted and said; the sum in the '
      'trip (before the contingency); an invented mission; captures 390')
def n40(c):
    fuel = '[data-module=fuel]'
    path = 'pilot/ABC/current_flight.json'
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _HOLD_REGISTRY], ['missions/X_HOLD/X-701A/missionX-701A.yaml', _HOLD_MISSION]])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id]')", timeout=15000, what='the list of missions')
    c.go('fuel?mission=X-701A')
    c.until("() => !!document.querySelector('.f-modal [data-ok]') || !!document.querySelector('[data-module=fuel] .fu-mchip')", timeout=15000,
            what='the question, or the flight of the mission')
    if c.js("!!document.querySelector('.f-modal [data-ok]')"):
        c.tap('.f-modal [data-ok]')
    d = c.until_doc(path, lambda d: d and d.get('mission') == 'X-701A' and len(((d.get('route') or {}).get('holds') or {})) == 2, 'the holds of the mission',
                    timeout=12000)
    holds = d['route']['holds']
    c.eq(sorted((h['min'], h['max'], h['count']) for h in holds.values()), [(5, 40, 40), (25, 25, 25)], 'PT1 « 5-40 » counted at 40, TARGET 25', what='holds')
    c.until("(w) => (window.__notes || []).some(n => n.includes(w))", 'time_window_min', timeout=5000, what='the unread duration key said (« time_window_min · PT2 »)')
    # the quote: one line per point, the range said
    c.until_doc(path, lambda d: d and ((d.get('quote') or {}).get('trip') or 0) > 0, 'the quote', timeout=12000)
    c.js(f"(() => {{ const d = document.querySelector('{fuel} details[data-fold=details]'); if (d) d.open = true; d && d.dispatchEvent(new Event('toggle')) }})()")
    c.js(f"document.querySelector('{fuel} .fu-steps [data-step=\"3\"]')?.click()")
    c.until(f"document.querySelectorAll('{fuel} [data-holdrow]').length === 2", timeout=10000, what='two lines « Sur zone » in the detail of the quote')
    rows = [norm(x) for x in c.js(f"[...document.querySelectorAll('{fuel} [data-holdrow]')].map(r => r.textContent)")]
    c.ok(any('PT1' in r and '5 à 40 min, 40 comptées' in r for r in rows) and any('TARGET' in r and '25 min' in r for r in rows), rows,
         'each point by its name in the mission, its range and what is counted')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{fuel} [data-holdrow]').scrollIntoView({{block: 'center'}})")
    c.shot(f'N40_quote_{c.design}_390_{c.lang}_delivered.png')
    trip0 = c.doc(path)['quote']['trip']
    # the pilot counts 10 min at PT1: the trip goes down
    c.js(f"document.querySelector('{fuel} .fu-steps [data-step=\"1\"]')?.click()")
    c.js(f"(() => {{ const d = document.querySelector('{fuel} details[data-fold=pts]'); if (d) d.open = true }})()")
    c.until(f"document.querySelectorAll('{fuel} [data-pts] [data-holdline]').length === 2", timeout=8000, what='a line « Sur zone » on the two points with a time')
    # the retouche (ergonomist, 12/11): one line in one piece, said in words; a point without time only « ⏱ + », which opens its line
    line = norm(c.js(f"[...document.querySelectorAll('{fuel} [data-pts] [data-holdline]')].map(l => l.textContent).join(' | ')"))
    c.ok('⏱ Sur zone' in line and 'min · mission : 5 à 40' in line, line, '« ⏱ Sur zone [40] min · mission : 5 à 40 »')
    c.ok(c.js(f"[...document.querySelectorAll('{fuel} [data-pts] [data-holdline]')].every(l => l.getBoundingClientRect().height < 48)"), 'wrapped',
         'each line in one piece (one row high)')
    c.eq(c.count(f'{fuel} [data-pts] [data-do="holdopen"]'), 1, 'the point without time carries only « ⏱ + »', what='holdopen')
    c.ok(c.js("document.documentElement.scrollWidth <= innerWidth + 1"), c.js('[document.documentElement.scrollWidth, innerWidth]'), 'the list fits the width')
    c.tap(f'{fuel} [data-pts] [data-do="holdopen"]')
    c.until(f"document.querySelectorAll('{fuel} [data-pts] [data-holdline]').length === 3", timeout=5000, what='« ⏱ + » opens the line of that point')
    sel = f"{fuel} [data-pts] input[data-k=pthold][value='40']"
    c.page.fill(sel, '10')
    c.js(f"(() => {{ const i = [...document.querySelectorAll('{fuel} [data-pts] input[data-k=pthold]')].find(x => x.value === '10'); i.dispatchEvent(new Event('change', {{ bubbles: true }})) }})()")
    d = c.until_doc(path, lambda d: d and any((h or {}).get('count') == 10 for h in ((d.get('route') or {}).get('holds') or {}).values()), 'PT1 counted at 10', timeout=8000)
    c.ok([h for h in d['route']['holds'].values() if h['count'] == 10][0]['max'] == 40, d['route']['holds'], 'the range of the mission kept')
    c.until_doc(path, lambda d: d and 0 < ((d.get('quote') or {}).get('trip') or 0) < trip0, 'the trip goes down with 30 minutes less on area', timeout=10000)
    c.js(f"document.querySelector('{fuel} [data-pts] input[data-k=pthold]').scrollIntoView({{block: 'center'}})")
    c.shot(f'N40_points_{c.design}_390_{c.lang}_delivered.png')

# ---------------------------------------------------------------- Registre des missions (SOG-0021 / Q-0021, CONCEPTION § 2 bis)
# invented registry: X-701A fine; X-702A its file absent; X-703A its file invalid; « 704 » an old identifier of the folder X-704A;
# X-705A twice; X-706A a path that is refused (never taken as written) and a title that carries HTML; the repository also holds
# X-710A and X-711A that the registry does not know
_REG_REGISTRY = """schema: mission-registry
version: 1
missions:
  - { id: X-701A, series: 7, number: 1, family: TESTREG, title: Registre un, operation: { id: X-701, name: OPERATION UN, missions: 2 }, folder: X_REG/X-701A, files: [missionX-701A.yaml], flownAt: '2026-01-01', keep: gardé }
  - { id: X-702A, family: TESTREG, title: Registre deux, folder: X_REG/X-702A, files: [missionX-702A.yaml] }
  - { id: X-703A, family: TESTREG, title: Registre trois, folder: X_REG/X-703A, files: [missionX-703A.yaml] }
  - { id: '704', family: TESTREG, title: Registre quatre, folder: X_REG/X-704A, files: [missionX-704A.yaml] }
  - { id: X-705A, family: TESTREG, title: Registre cinq, folder: X_REG/X-705A, files: [missionX-705A.yaml] }
  - { id: X-705A, family: TESTREG, title: Registre cinq bis, folder: X_REG/X-705A, files: [missionX-705A.yaml] }
  - { id: X-706A, family: TESTREG, title: '<img src=x onerror=window.__pwn=1>Six', folder: ../evil/X-706A, files: [missionX-706A.yaml] }
"""
_REG_TEXTS = [['missions/mission_registry.yaml', _REG_REGISTRY],
              ['missions/X_REG/X-701A/missionX-701A.yaml', mission_doc('X-701A')],
              ['missions/X_REG/X-703A/missionX-703A.yaml', 'mission: { id: X-703A, type: [\n  : : :\n'],
              ['missions/X_REG/X-704A/missionX-704A.yaml', mission_doc('X-704A')],
              ['missions/X_REG/X-705A/missionX-705A.yaml', mission_doc('X-705A')],
              ['missions/X_REG/X-710A/missionX-710A.yaml', 'mission: { id: X-710A, type: TESTREG }\ntitle: Du dépôt dix\noperation: { id: X-710, name: OP DIX }\n'],
              ['missions/X_REG/X-711A/missionX-711A.yaml', mission_doc('X-711A')]]
# the writes of a case (queue and cache) are cleared before and after: the next case must not read a registry this one wrote
_REG_CLEAR = """async () => { if (!(await indexedDB.databases()).some(d => d.name === 'sogFrame')) return false; const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  for (const st of ['pending', 'docs']) { if (!db.objectStoreNames.contains(st)) continue;
    const keys = await new Promise(res => { const q = db.transaction(st).objectStore(st).getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]) });
    const t = db.transaction(st, 'readwrite'); for (const k of keys) if (/^missions\\/(mission_registry\\.yaml|X_REG\\/)/.test(String(k))) t.objectStore(st).delete(k);
    await new Promise(res => { t.oncomplete = res; t.onerror = res }) }
  db.close(); return true }"""
R = f'{M} [data-pane=registry]'
_REG_READ = f"!!document.querySelector('{R} [data-regcount]') && !document.querySelector('{R} [data-rstate=checking]') && !document.querySelector('{R} [data-regcount]').textContent.includes('…')"


def reg_open(c, texts=None, target='missions', button=True):
    """Seeds the invented registry, opens Missions, then the Registry screen (the button, or the address) and waits for every file to be read."""
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, texts or _REG_TEXTS)
    c.open(target, wait=False, app='company')
    if button:
        c.until(f"!!document.querySelector('{M} [data-do=regopen]')", timeout=15000, what='the Registry button')
        c.tap(f'{M} [data-do="regopen"]')
    c.until(_REG_READ, timeout=20000, what='the registry read, every file read')


def reg_states(c):
    """The rows of the Registry screen (every row shown): { id (a # added to a double): state }."""
    return c.js(f"""(() => {{ const o = {{}}; for (const r of document.querySelectorAll('{R} [data-reglist] [data-rowid]')) {{
      let k = r.dataset.rowid; while (k in o) k += '#'; o[k] = r.querySelector('[data-rstate]')?.dataset.rstate + (r.querySelector('[data-rdup]') ? '+dup' : '') + (r.querySelector('[data-rformer]') ? '+former' : '') }} return o }})()""")


def rowp(c, key, n):
    """A text of the module with its number agreed the way the frame does (frame/lib/plural.js: « (s) » marks resolved by {n})."""
    one = n < 2 if c.lang == 'fr' else n == 1
    return re.sub(r'\((s|x|es|en|n|e)\)', lambda m: '' if one else m.group(1), row(c, key).replace('{n}', str(n)))


def reg_text(c):
    """The text of the registry as the frame holds it (the write queue first)."""
    return c.js(_TEXT_OF, 'missions/mission_registry.yaml') or ''


def reg_wait_text(c, test):
    """Waits (10 s) until the registry text satisfies `test`."""
    for _ in range(40):
        if test(reg_text(c)):
            return
        c.wait(250)


@case('N27', 'Missions › Registre: one line per mission as the registry writes it, with the state of its file (there, missing, unreadable, path refused), the repository missions the registry does not know, doubles and old identifiers',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0021 / CONCEPTION § 2 bis: the registry managed alone — one line per mission, the only state that counts alone is « file there, '
      'missing, or unreadable », and the repository missions the registry does not know; the registry is written by any pilot: a path is '
      'never taken as written, a title is text (invented X-7xx missions); captures 390 and 1 280')
def n27(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        reg_open(c)  # nine lines: all shown (one line per mission, SOG-0286)
        got = reg_states(c)
        c.eq(got, {'X-711A': 'notyet', 'X-710A': 'notyet', 'X-702A': 'missing', 'X-703A': 'unreadable', 'X-704A': 'ok+former', 'X-705A': 'ok+dup',
                   'X-706A': 'refused', 'X-701A': 'ok', 'X-705A#': 'ok'}, f'{w} px: the state of each line', what='states')
        c.eq(norm(c.text(f'{R} [data-regcount]')), norm(rowp(c, 'regCount', 7) + ' · ' + rowp(c, 'regUnlisted', 2)), f'{w} px: 7 lines, 2 not known', what='count')
        c.eq(c.count(f'{R} img'), 0, 'a title with HTML is text', what='html')
        c.ok(c.js('window.__pwn') is None, '', 'nothing of the title ran')
        c.page.fill(f'{R} [data-k=rq]', 'cinq')
        c.until(f"document.querySelectorAll('{R} [data-reglist] [data-rowid]').length === 2", what='the search keeps the two X-705A lines')
        c.page.fill(f'{R} [data-k=rq]', '')
        c.js(f"document.querySelector('{R}').scrollIntoView({{block: 'start'}})")
        c.shot(f'N27_{c.design}_{w}_{c.lang}_delivered.png')
        c.tap(f'{R} [data-do="regback"]')
        c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back to the list')
    c.js(_REG_CLEAR)


@case('N28', 'Missions › Registre: « Mettre à jour le registre » says first what it would do (to add, lines without a file, doubles, old identifiers), writes nothing before « Écrire », then adds the repository missions, keeps one line per identifier and keeps everything else of the registry',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='CONCEPTION § 2 bis: « il montre d\'abord ce qu\'il ferait (n missions à ajouter, n lignes sans fichier, n numéros en double), puis écrit le '
      'registre »; a line without a readable file is kept (the file may not have arrived), never removed by the update; the other fields of a line are kept; captures 390 and 1 280')
def n28(c):
    import yaml
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        reg_open(c)
        before = reg_text(c)
        c.tap(f'{R} [data-do="regplan"]')
        c.until(f"!!document.querySelector('{R} [data-regplan]')", what='the plan is shown')
        got = {k: norm(c.text(f'{R} [data-plan={k}]') or '') for k in ('Add', 'Dup', 'Former', 'NoFile')}
        want = {'Add': rowp(c, 'regPlanAdd', 2), 'Dup': rowp(c, 'regPlanDup', 1), 'Former': rowp(c, 'regPlanFormer', 1), 'NoFile': rowp(c, 'regPlanNoFile', 3)}
        c.eq(got, {k: norm(v) for k, v in want.items()}, f'{w} px: what the update would do', what='plan')
        c.eq(reg_text(c), before, 'nothing written before « Écrire »', what='written')
        c.js(f"document.querySelector('{R} [data-regplan]').scrollIntoView({{block: 'start'}})")
        c.shot(f'N28_{c.design}_{w}_{c.lang}_delivered.png')
        c.tap(f'{R} [data-do="regwrite"]')
        reg_wait_text(c, lambda t: 'X-710A' in t)
        c.until(_REG_READ + f" && !document.querySelector('{R} [data-regplan]')", timeout=20000, what='written, read again')
        d = yaml.safe_load(reg_text(c))
        ids = [m['id'] for m in d['missions']]
        c.eq(ids, ['X-701A', 'X-702A', 'X-703A', 'X-704A', 'X-705A', 'X-706A', 'X-710A', 'X-711A'], f'{w} px: one line per identifier, the new ones at the end', what='ids')
        by = {m['id']: m for m in d['missions']}
        c.eq(by['X-704A'].get('formerId'), '704', 'the old identifier is kept as formerId', what='formerId')
        c.eq([by['X-701A'].get('keep'), str(by['X-701A'].get('flownAt')), (by['X-701A'].get('operation') or {}).get('missions')], ['gardé', '2026-01-01', 2], 'the other fields of a line are kept', what='kept')
        c.eq([by['X-710A']['folder'], by['X-710A']['files'], (by['X-710A'].get('operation') or {}).get('name')], ['X_REG/X-710A', ['missionX-710A.yaml'], 'OP DIX'], 'an added line is read from its file', what='added')
        c.eq(d.get('schema'), 'mission-registry', 'the registry keeps its schema', what='schema')
        c.eq(c.count(f'{R} [data-rstate=notyet]'), 0, 'no more mission unknown to the registry', what='notyet')
        c.tap(f'{R} [data-do="regplan"]')
        c.until(f"!!document.querySelector('{R} [data-plan=nothing]')", what='a second update has nothing to do')
        c.eq(c.js(f"document.querySelector('{R} [data-do=regwrite]').disabled"), True, '« Écrire » is off', what='write')
    c.js(_REG_CLEAR)


@case('N29', 'Missions › Registre: a line is corrected by hand (title, series, number, operation) or removed from the registry — its file stays; a number that is not a number is refused; nothing else of the registry changes',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='CONCEPTION § 2 bis: « à la main, sur une ligne : corriger le titre, la série, le numéro, l\'opération ; retirer la mission du registre (le fichier reste, dit) »')
def n29(c):
    import yaml
    reg_open(c)
    c.page.fill(f'{R} [data-k=rq]', 'X-701A')
    c.until(f"document.querySelectorAll('{R} [data-reglist] [data-rowid]').length === 1", what='X-701A found')
    c.tap(f'{R} [data-reglist] [data-rowid="X-701A"] summary')  # the line unfolded (SOG-0286)
    c.tap(f'{R} [data-reglist] [data-rowid="X-701A"] [data-do="regedit"]')
    c.until(f"!!document.querySelector('{R} [data-redit]')", what='the form of the line')
    c.page.fill(f'{R} [data-redit] [data-k=rtitle]', 'Titre corrigé')
    c.page.fill(f'{R} [data-redit] [data-k=rseries]', 'abc')
    c.tap(f'{R} [data-redit] [data-do="regsave"]')
    c.until("(document.querySelector('#fNotes')?.textContent || '').trim().length > 0", what='a bad series is refused, said')
    c.ok('Titre corrigé' not in reg_text(c), '', 'nothing written for a bad series')
    c.page.fill(f'{R} [data-redit] [data-k=rseries]', '9')
    c.page.fill(f'{R} [data-redit] [data-k=rnumber]', '12')
    c.page.fill(f'{R} [data-redit] [data-k=rop]', 'OPERATION CORRIGÉE')
    c.js(f"document.querySelector('{R}').scrollIntoView({{block: 'start'}})")
    c.shot(f'N29_{c.design}_{c.width}_{c.lang}_delivered.png')
    c.tap(f'{R} [data-redit] [data-do="regsave"]')
    reg_wait_text(c, lambda t: 'Titre corrigé' in t)
    d = yaml.safe_load(reg_text(c))
    by = {m['id']: m for m in d['missions']}
    c.eq([by['X-701A']['title'], by['X-701A']['series'], by['X-701A']['number'], by['X-701A']['operation']['name'], by['X-701A']['operation']['missions']],
         ['Titre corrigé', 9, 12, 'OPERATION CORRIGÉE', 2], 'the four fields are corrected, the rest of the operation kept', what='edit')
    c.eq(by['X-702A']['title'], 'Registre deux', 'the other lines are not touched', what='others')
    # removed: the file of X-704A stays
    c.until(_REG_READ, timeout=20000, what='read again')
    c.page.fill(f'{R} [data-k=rq]', 'quatre')
    c.until(f"document.querySelectorAll('{R} [data-reglist] [data-rowid]').length === 1", what='X-704A found')
    c.tap(f'{R} [data-reglist] [data-rowid="X-704A"] summary')
    c.tap(f'{R} [data-reglist] [data-rowid="X-704A"] [data-do="regremove"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='asks before removing')
    c.ok(norm(row(c, 'regRemoveAsk').replace('{id}', 'X-704A')) in norm(c.text('.f-modal') or ''), '', 'the question says the file stays')
    c.tap('.f-modal [data-ok]')
    reg_wait_text(c, lambda t: 'Registre quatre' not in t)
    d = yaml.safe_load(reg_text(c))
    c.ok('X-704A' not in [m['id'] for m in d['missions']] and '704' not in [str(m['id']) for m in d['missions']], '', 'the line is gone from the registry')
    c.ok('X-704A' in (c.js(_TEXT_OF, 'missions/X_REG/X-704A/missionX-704A.yaml') or ''), '', 'its file stays in the repository')
    c.js(_REG_CLEAR)


@case('N30', 'Missions › Registre: the address #missions?view=registry opens it; a registry that cannot be read says so and is never rewritten; an absent registry is created from the files',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='CONCEPTION § 2 bis; the registry is written by any pilot: an unreadable one is not overwritten (the update is off); an absent one is built from the repository files')
def n30(c):
    import yaml
    texts = [t for t in _REG_TEXTS if t[0] != 'missions/mission_registry.yaml'] + [['missions/mission_registry.yaml', 'missions: [\n  : : :\n']]
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, texts)
    c.open('missions?view=registry', wait=False, app='company')
    c.until(f"!!document.querySelector('{R} [data-why=unreadable]')", timeout=15000, what='the registry screen by the address, saying the registry is unreadable')
    c.eq(c.js(f"document.querySelector('{R} [data-do=regplan]').disabled"), True, 'no update on an unreadable registry', what='plan')
    c.eq(c.count(f'{R} [data-do=regedit]'), 0, 'no line to correct', what='edit')
    # absent: the registry is created from the files
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, [t for t in _REG_TEXTS if t[0] != 'missions/mission_registry.yaml'])
    c.open('missions?view=registry', wait=False, app='company')
    c.until(_REG_READ, timeout=20000, what='read')
    c.tap(f'{R} [data-do="regplan"]')
    c.until(f"!!document.querySelector('{R} [data-regplan] [data-plan=Add]')", what='the plan adds the files')
    c.tap(f'{R} [data-do="regwrite"]')
    reg_wait_text(c, lambda t: 'X-710A' in t)
    d = yaml.safe_load(reg_text(c))
    c.eq(sorted(m['id'] for m in d['missions']), ['X-701A', 'X-704A', 'X-705A', 'X-710A', 'X-711A'], 'the registry is built from the repository missions', what='ids')
    c.js(_REG_CLEAR)


@case('N31', 'Missions › Registre, the pure part: a plan is applied to a copy; a line that is no longer the one shown is refused (stale); a mission file gives a bounded entry, a copy in versions/ none',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='modules/missions/registry.js: the registry is written by any pilot, the document read is never modified in place')
def n31(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    got = c.js("""async () => { const R = await import('/modules/missions/registry.js'); const doc = { missions: [{ id: 'X-1A', title: 'a', folder: 'X_Q/X-1A', files: ['missionX-1A.yaml'] }, { id: 'X-1A', title: 'b' }] };
      const before = JSON.stringify(doc); const plan = R.planOf(doc, new Map(), []);
      const out = R.applyPlan(doc, plan, 'T'); const stale = R.editEntry(doc, 1, 'X-9Z', { title: 'x' }); const bad = R.editEntry(doc, 0, 'X-1A', { title: 'x', series: '1e3' });
      const ok = R.editEntry(doc, 0, 'X-1A', { title: '  Nouveau   titre ', series: '', number: '4' });
      const ent = R.entryOfMission({ mission: { id: 'X-2A', type: 'T' }, title: 'x'.repeat(500) }, 'missions/X_Q/X-2A/missionX-2A.yaml');
      const copy = R.entryOfMission({ mission: { id: 'X-2A', type: 'T' } }, 'missions/X_Q/X-2A/versions/missionX-2A_1.yaml');
      return { same: JSON.stringify(doc) === before, plan: plan.dup, n: out.missions.length, at: out.updatedAt, stale: stale.error, bad: bad.error, title: ok.doc.missions[0].title, number: ok.doc.missions[0].number,
        long: ent.title.length, folder: ent.folder, copy } }""")
    c.eq(got, {'same': True, 'plan': [1], 'n': 1, 'at': 'T', 'stale': 'stale', 'bad': 'series', 'title': 'Nouveau titre', 'number': 4, 'long': 200, 'folder': 'X_Q/X-2A', 'copy': None},
         'plan applied to a copy, stale refused, entries bounded', what='pure')



@case('N41', 'Registry: the buttons of a line do not touch each other and the text keeps the inner margin of the suite\'s cards',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='the ergonomist on N28 at 390 (12 Nov): « Corriger » and « Retirer du registre » stuck together, the text of the lines at the edge of the card')
def n41(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, TEXTS)
    c.open('missions', docs=docs(), wait=False, app='company')
    c.go('missions?view=registry')
    c.until(f"document.querySelectorAll('{M} .ms-rrow button').length >= 2", timeout=15000, what='a line of the registry with its buttons')
    c.js(f"[...document.querySelectorAll('{M} .ms-rrow')].find(r => r.querySelectorAll('button').length >= 2).open = true")  # unfolded (SOG-0286)
    m = c.js(f"""(() => {{ const row = [...document.querySelectorAll('{M} .ms-rrow')].find(r => r.querySelectorAll('button').length >= 2);
      const [a, b] = row.querySelectorAll('button'), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), rr = row.getBoundingClientRect(),
        t = row.querySelector('b').getBoundingClientRect();
      return {{ gap: rb.left - ra.right, inner: t.left - rr.left }} }})()""")
    c.ok(m['gap'] >= 6 and m['inner'] >= 8, m, 'a space between the two buttons, the text off the edge of the card')



@case('N42', 'The commercial path end to end: a mission « fret » of a commercial company → Fuel fills Famille COMMERCIAL / Série Fret → the '
      'report takes them on « Vol en cours » with the freight in kg → a series changed in the report is the one saved (the report has the last word)',
      'N', tags=('missions', 'fuel', 'report'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0041 refused on 10 Nov (« À quel moment, je décide de faire une mission fret, passagers… ? à quel moment le cr match ce choix ? '
      'que faire si j\'ai oublié de choisir au départ du vol ? »): the ergonomist, 12 Nov: the path held by a case, not by a reading of the code; '
      'invented missions and companies')
def n42(c):
    co = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
          ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document'], ['cache/report/draft.json', {}, 'cache']]
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _THEME_REGISTRY], ['missions/X_CO/X-601A/missionX-601A.yaml', _THEME_FRET]])
    c.open('missions', docs=co, wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-results] [data-count]')", timeout=15000, what='the list is drawn')
    set_airline(c, 'aaa')
    # (1) the mission « fret » prepared: Fuel's step Flight says Famille COMMERCIAL / Série Fret
    c.go('fuel?mission=X-601A')
    for _ in range(40):
        if c.js("!!document.querySelector('.f-modal [data-ok]')"):
            c.tap('.f-modal [data-ok]')
        if c.js("(document.querySelector('[data-module=fuel] select[data-k=series]') || {}).value") == 'CARGO':
            break
        c.wait(250)
    c.eq(c.js("['theme', 'series'].map(k => (document.querySelector(`[data-module=fuel] select[data-k=${k}]`) || {}).value)"), ['COMMERCIAL', 'CARGO'],
         'Fuel: Famille COMMERCIAL, Série Fret, filled by the mission', what='fuel')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: (d or {}).get('theme') == 'COMMERCIAL' and (d or {}).get('airline') == 'aaa',
                'the flight written with its family and its company')
    # (2) the report: « Vol en cours » takes the family and the series, the freight asked in kg
    c.go('report')
    c.until("!!document.querySelector('[data-module=report] [data-do=current]')", timeout=15000, what='the current-flight card')
    c.tap('[data-module="report"] [data-do="current"]')
    c.until("(document.querySelector('[data-module=report] select[data-family]') || {}).value === 'COMMERCIAL' && "
            "(document.querySelector('[data-module=report] [data-path=series]') || {}).value === 'CARGO'", timeout=8000,
            what='the report: COMMERCIAL / Fret taken from the flight')
    c.until("!!document.querySelector('[data-module=report] [data-loadcard=freight] input[data-load=freightKg]')", timeout=6000, what='the freight asked, in kg')
    c.shot(f'N42_{c.design}_{c.width}_{c.lang}_delivered.png')
    # (3) forgotten at the departure or changed after: the report has the last word
    c.js("""(() => { const s = document.querySelector('[data-module=report] [data-path=series]'); s.value = 'PASSENGERS';
      s.dispatchEvent(new Event('change', { bubbles: true })) })()""")
    c.until("!!document.querySelector('[data-module=report] [data-loadcard=passengers]')", timeout=6000, what='Passagers: the passengers asked')
    before = set(c.doc_paths('cr/reports/'))
    c.tap('[data-module="report"] [data-do="save"]')
    path = None
    for _ in range(40):
        got = [p for p in c.doc_paths('cr/reports/') if p not in before]
        if got:
            path = got[0]
            break
        c.wait(200)
    d = c.doc(path) if path else {}
    c.eq([d.get('family'), d.get('series'), d.get('airline')], ['COMMERCIAL', 'PASSENGERS', 'aaa'], 'saved as the report says, for Alpha Air',
         what='record')



# SOG-0286: a registry of 24 invented missions over two families, each with its file, an origin and a destination
_BIG_IDS = [f'X-{720 + i}A' for i in range(24)]
_BIG_REGISTRY = 'schema: mission-registry\nversion: 1\nmissions:\n' + ''.join(
    f"  - {{ id: {m}, series: {1 + i % 3}, number: {i + 1}, family: {'TESTREG' if i % 2 else 'TESTAUX'}, title: Mission d'essai numéro {i + 1} "
    f"vers le sud, origin: LFRS, destination: LFML, folder: X_REG/{m}, files: [mission{m}.yaml] }}\n" for i, m in enumerate(_BIG_IDS))
_BIG_TEXTS = [['missions/mission_registry.yaml', _BIG_REGISTRY]] + [[f'missions/X_REG/{m}/mission{m}.yaml', mission_doc(m)] for m in _BIG_IDS]


@case('N43', 'Missions › Registre, the V2 model: one line per mission (state sign, identifier, title, family · series, origin → destination); '
      'the state in words, « Corriger », « Retirer » and the path when the line is unfolded; a family filter at the head; at 1 280 twenty '
      'missions seen without scrolling, at 390 two lines of text at most per mission',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0286 (the user, 12 Nov: « trop de lignes. prendre le modèle de la v2, qui était efficace »): the V2 registry is a table, one '
      'row per mission, the sheet when the row is opened; nothing changes in the data nor in their guards (24 invented X-7xx missions); '
      'captures 390 and 1 280')
def n43(c):
    rows = f'{R} [data-reglist] [data-rowid]'
    for w in (1280, 390):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        reg_open(c, _BIG_TEXTS)
        m = c.js(f"""(() => {{ const rs = [...document.querySelectorAll('{rows}')];
          const head = r => r.querySelector('summary') || r;
          // the lines of text of a folded line: the tops of the boxes of its text (a gap of more than 6 px: a new line)
          const lines = rs.map(r => {{ const g = document.createRange(); g.selectNodeContents(head(r));
            const tops = [...g.getClientRects()].filter(x => x.width > 0 && x.height > 0).map(x => x.top).sort((a, b) => a - b);
            return tops.reduce((n, t, i) => n + (i && t - tops[i - 1] > 6 ? 1 : 0), tops.length ? 1 : 0) }});
          const seen = rs.filter(r => {{ const b = head(r).getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight }}).length;
          const hidden = rs.every(r => !r.querySelector('[data-do=regedit]')?.checkVisibility());
          return {{ n: rs.length, seen, maxLines: Math.max(...lines), hidden }} }})()""")
        c.eq(m['n'], 24, f'{w} px: one line per mission, all listed', what='rows')
        c.eq(c.js(f"[...document.querySelectorAll('{rows}')].slice(0, 3).map(r => r.dataset.rowid)"), ['X-720A', 'X-723A', 'X-726A'],
             f'{w} px: by series, then identifier (the order of the V2 table)', what='order')
        if w == 1280:
            c.ok(m['seen'] >= 20, m, '1 280 px: twenty missions at least seen without scrolling')
        else:
            c.ok(m['maxLines'] <= 2, m, '390 px: two lines of text at most per mission')
        c.ok(m['hidden'], m, f'{w} px: « Corriger » is folded')
        first = c.js(f"(() => {{ const r = document.querySelector('{rows}'); return r.querySelector('summary')?.textContent.replace(/\\s+/g, ' ') || '' }})()")
        c.ok('LFRS' in first and 'LFML' in first and '→' in first, first, f'{w} px: origin → destination on the line')
        c.ok(c.count(f"{R} [data-reglist] [data-rowid] summary [data-rstate]") == 24, '', f'{w} px: the state sign on each line')
        c.js(f"document.querySelector('{R}').scrollIntoView({{block: 'start'}})")
        c.shot(f'N43_{c.design}_{w}_{c.lang}_delivered.png')
        c.tap(f'{rows} summary')
        c.until(f"!!document.querySelector('{rows} [data-do=regedit]')?.checkVisibility()", what='the unfolded line shows « Corriger »')
        c.ok('missions/X_REG/' in c.text(f'{rows}'), '', f'{w} px: the path when unfolded')
        c.until(f"!!document.querySelector('{R} select[data-k=rfam]')", what='the family filter at the head')
        c.page.select_option(f'{R} select[data-k=rfam]', 'TESTREG')
        c.until(f"document.querySelectorAll('{rows}').length === 12", what='the family filter keeps the twelve TESTREG missions')
        c.tap(f'{R} [data-do="regback"]')
        c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back to the list')
    c.js(_REG_CLEAR)



_MANY_IDS = [f'X-{i:03d}A' for i in range(1, 504)]
_MANY_TEXTS = [['missions/mission_registry.yaml', 'schema: mission-registry\nversion: 1\nmissions:\n' + ''.join(
    f'  - {{ id: {m}, family: TESTREG, title: Ligne {m}, folder: X_REG/{m}, files: [mission{m}.yaml] }}\n' for m in _MANY_IDS)]] + [
    [f'missions/X_REG/{m}/mission{m}.yaml', mission_doc(m)] for m in _MANY_IDS]


@case('N44', 'Missions › Registre, read bounded: a title of 4 000 signs is cut at 120, an identifier at 40 (N45), the operation at 120, origin and '
      'destination at 80; beyond the 500 files read, a line says « fichier non lu » and the count « 500 fichiers lus sur 503 » — never « fichier là » '
      'without reading it, never « sans fichier » in the plan', 'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='Sécurisation, audit 174 on db091c505: the texts of a file of data/ are bounded at reading (readRegistry only folded the spaces); '
      'regLoad marked « ok » the lines beyond REG_READ_MAX without reading them (invented X-001A … X-503A)')
def n44(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    got = c.js("""async () => { const MS = await import('/frame/lib/mission.js'); const R = await import('/modules/missions/registry.js');
      const long = k => k.repeat(4000);
      const [row] = MS.readRegistry({ missions: [{ id: long('X'), title: long('T'), operation: { name: long('O') }, origin: long('A'), destination: long('B') }] });
      const plan = R.planOf({ missions: [{ id: 'X-001A' }, { id: 'X-002A' }] }, new Map([[0, 'notread'], [1, 'missing']]), []);
      return { id: row.id.length, title: row.title.length, op: row.operation.length, from: row.origin.length, to: row.destination.length, noFile: plan.noFile } }""")
    c.eq(got, {'id': 40, 'title': 120, 'op': 120, 'from': 80, 'to': 80, 'noFile': [1]},
         'the texts are bounded at reading; a line not read is not « sans fichier » in the plan', what='bounds')
    reg_open(c, _MANY_TEXTS)
    c.until(f"!!document.querySelector('{R} [data-do=regmore]')", timeout=10000, what='« N autres »')
    c.tap(f'{R} [data-do="regmore"]')
    n = c.js(f"""(() => {{ const q = k => document.querySelectorAll('{R} [data-reglist] [data-rstate=' + k + ']').length;
      return {{ ok: q('ok'), notread: q('notread') }} }})()""")
    c.eq(n, {'ok': 500, 'notread': 3}, 'five hundred lines read and said there, the three beyond said « non lu »', what='states')
    c.ok(norm(row(c, 'regReadOf').replace('{r}', '500').replace('{n}', '503')) in norm(c.text(f'{R} [data-regcount]')), c.text(f'{R} [data-regcount]'),
         'the count says how many files were read')
    c.js(_REG_CLEAR)



@case('N45', 'Missions › Registre: the display may shorten, the identity never — two lines whose identifiers of 14 signs share their first 12 '
      '(folders that are not of the X-001A form) are neither « ancien identifiant » nor doubles; applying the plan leaves both lines as they are; '
      'the line on screen shortens the identifier only for display', 'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='Sécurisation, audit 176 on 81148257a: readRegistry cut the id at 12 while planOf / applyPlan compare cut(raw.id, 40) — the plan rewrote '
      'the id to 12 signs and removed the second line as a double (a bait any pilot could set); the identifier keeps 40 signs in the reader')
def n45(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    got = c.js("""async () => { const MS = await import('/frame/lib/mission.js'); const R = await import('/modules/missions/registry.js');
      const doc = { missions: [{ id: 'ABCDEFGHIJKL01', title: 'Un', folder: 'X_CO/old1', files: ['missionold1.yaml'] },
        { id: 'ABCDEFGHIJKL02', title: 'Deux', folder: 'X_CO/old2', files: ['missionold2.yaml'] }] };
      const before = JSON.stringify(doc.missions);
      const plan = R.planOf(doc, new Map([[0, 'ok'], [1, 'ok']]), []);
      const out = R.applyPlan(doc, plan, 'T');
      return { ids: MS.readRegistry(doc).map(r => r.id), former: plan.former, dup: plan.dup, kept: JSON.stringify(out.missions) === before,
        long: MS.readRegistry({ missions: [{ id: 'Z'.repeat(4000) }] })[0].id.length } }""")
    c.eq(got, {'ids': ['ABCDEFGHIJKL01', 'ABCDEFGHIJKL02'], 'former': [], 'dup': [], 'kept': True, 'long': 40},
         'the identity keeps 40 signs: no former id, no double, the plan leaves both lines; a 4 000-sign id is cut at 40', what='identity')
    texts = [['missions/mission_registry.yaml', 'schema: mission-registry\nversion: 1\nmissions:\n'
              '  - { id: ABCDEFGHIJKL01, family: TESTREG, title: Un, folder: X_REG/old1, files: [missionold1.yaml] }\n'
              '  - { id: ABCDEFGHIJKL02, family: TESTREG, title: Deux, folder: X_REG/old2, files: [missionold2.yaml] }\n'],
             ['missions/X_REG/old1/missionold1.yaml', mission_doc('ABCDEFGHIJKL01')], ['missions/X_REG/old2/missionold2.yaml', mission_doc('ABCDEFGHIJKL02')]]
    reg_open(c, texts)
    c.eq(reg_states(c), {'ABCDEFGHIJKL01': 'ok', 'ABCDEFGHIJKL02': 'ok'}, 'two lines, each its own identity, neither double nor former', what='screen')
    b = c.js(f"(() => {{ const b = document.querySelector('{R} [data-rowid=ABCDEFGHIJKL01] summary b'); return [b.textContent, b.title] }})()")
    c.eq(b, ['ABCDEFGHIJK…', 'ABCDEFGHIJKL01'], 'the line shortens the identifier for display only, the whole of it in the tooltip', what='display')
    c.tap(f'{R} [data-do="regplan"]')
    c.until(f"!!document.querySelector('{R} [data-regplan]')", what='the plan')
    c.ok(c.count(f'{R} [data-regplan] [data-plan=Dup]') == 0 and c.count(f'{R} [data-regplan] [data-plan=Former]') == 0, c.text(f'{R} [data-regplan]'),
         'the plan proposes neither a double to remove nor an identifier to rewrite')
    c.js(_REG_CLEAR)



# SOG-0291: a summary of 370 signs (four invented sentences) and a description that is not a piece of it; a summary of 700 signs
_SUM_370 = ('Une phrase inventée ouvre le résumé de la mission d\'essai et pose le cadre sans rien dire de réel sur le terrain. '
            'Une deuxième phrase inventée décrit la tâche demandée aux équipages du banc, en restant volontairement assez longue. '
            'Une troisième phrase inventée ajoute une contrainte de météo. Une quatrième phrase inventée clôt le résumé par sa fin.')
_SUM_700 = ' '.join(['Une longue phrase inventée qui remplit le résumé de la seconde mission d\'essai sans rien dire de réel.'] * 7) + ' FINCACHEE'
_SUM_REG = """missions:
  - { id: X-311A, family: TESTSHEET, title: Mission au résumé moyen, folder: X_SU/X-311A, files: [missionX-311A.yaml] }
  - { id: X-312A, family: TESTSHEET, title: Mission au résumé long, folder: X_SU/X-312A, files: [missionX-312A.yaml] }
"""


def _sum_doc(mid, summary):
    return (f"mission: {{ id: {mid}, type: SAR, subtype: RECHERCHE }}\ntitle: Mission {mid}\nsummary: {summary}\n"
            "detailed_description: |-\n  Une description inventée qui commence autrement.\n\n  Son second paragraphe inventé.\n"
            "origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }\nrisks:\n  - { hazard: Danger un, mitigation: Parade un }\n")


_SUM_JS = f"""(() => {{ const f = document.querySelector('{M} [data-first]'), b = f.querySelector('[data-summary]'), p = b?.querySelector('[data-sumtext]') || b,
  d = document.querySelector('{M} [data-sec=desc]'), vis = e => !!e && e.getBoundingClientRect().height > 0;
  return {{ head: b?.querySelector('h3')?.textContent.trim() || '', text: (p?.textContent || '').trim(), cut: !!p && p.scrollHeight > p.clientHeight + 1,
    blocks: [...f.children].filter(vis).length, desc: d?.textContent || '', more: !!b?.querySelector('[data-do=detail]'),
    sumSec: document.querySelector('{M} [data-sec=sum]')?.textContent || '' }} }})()"""


@case('N46', 'Mission sheet, first page: the summary IN FULL under its name « Résumé » (370 signs, never cut at two lines), at 390 and 1 280; the Detail\'s '
      '« Description » carries the detailed description only; beyond 600 signs the summary is cut with « Lire la suite » to the Detail, which then has it whole',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0291 (user, 13 Nov: « j\'ai demandé la description courte dans la synthèse de mission, tu m\'as mis un extrait de la description longue, '
      'non ? ») — the summary was clamped at two lines (.ms-summary), read as an excerpt; the Detail chained summary then description with no title')
def n46(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _SUM_REG], ['missions/X_SU/X-311A/missionX-311A.yaml', _sum_doc('X-311A', _SUM_370)],
                         ['missions/X_SU/X-312A/missionX-312A.yaml', _sum_doc('X-312A', _SUM_700)]])
        c.open('missions', wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id=\"X-311A\"]')", timeout=15000, what='the list of missions')
        c.tap(f'{M} [data-list] [data-id="X-311A"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"X-311A\"] [data-first] [data-summary]')", timeout=10000, what='X-311A opens')
        c.settle()
        g = c.js(_SUM_JS)
        c.eq([norm(g['head']), g['text'], g['cut']], [norm(row(c, 'sumTitle')), _SUM_370, False], f'at {w}: the summary whole, under « Résumé », not cut',
             what='[head, text, cut]')
        c.le(g['blocks'], 7, f'at {w}: seven elements at most on the first page', what='elements')
        c.shot(f'N46_{w}_first.png')
        if w == 390:
            c.tap(f'{M} [data-first] [data-do="detail"]')
            c.until(f"!!document.querySelector('{M} [data-sec=desc]')", what='the Detail')
            g = c.js(_SUM_JS)
        c.ok('commence autrement' in g['desc'] and 'Une phrase inventée' not in g['desc'], g['desc'][:200],
             f'at {w}: « Description » carries the detailed description, not the summary')
        c.shot(f'N46_{w}_detail.png')
        # beyond 600 signs: cut, « Lire la suite » to the Detail, which has the summary whole
        if w == 390:
            c.tap(f'{M} [data-do="first"]')
        c.tap(f'{M} [data-first] [data-do="back"]')
        c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id=\"X-312A\"]')", what='back to the list')
        c.tap(f'{M} [data-list] [data-id="X-312A"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"X-312A\"] [data-first] [data-summary]')", timeout=10000, what='X-312A opens')
        g = c.js(_SUM_JS)
        c.ok(g['more'] and 'FINCACHEE' not in g['text'] and len(g['text']) <= 602 and g['text'].endswith('…'), g,
             f'at {w}: a summary of more than 600 signs is cut, with « Lire la suite »')
        c.tap(f'{M} [data-summary] [data-do="detail"]')
        c.until(f"!!document.querySelector('{M} [data-sec=sum]')", what='the Detail with the summary')
        g = c.js(_SUM_JS)
        c.ok('FINCACHEE' in g['sumSec'] and 'FINCACHEE' not in g['desc'], g['sumSec'][-80:], f'at {w}: the Detail has the summary whole, apart from the description')



# SOG-0292: four invented lines in three families — AIRLIFT (letter T of the themes) with two subtypes, SAR (S) with one, TESTFAM (no
# letter in the table: the letter of its identifiers, X)
_FAM_IDS = [('T-901A', 'AIRLIFT', 'STRATEGIC'), ('T-902A', 'AIRLIFT', 'TACTICAL'), ('S-903A', 'SAR', 'RECHERCHE'), ('X-904A', 'TESTFAM', '')]
_FAM_TEXTS = [['missions/mission_registry.yaml', 'schema: mission-registry\nversion: 1\nmissions:\n' + ''.join(
    f'  - {{ id: {m}, family: {f}, {f"subtype: {st}, " if st else ""}title: Ligne {m}, folder: X_REG/{m}, files: [mission{m}.yaml] }}\n'
    for m, f, st in _FAM_IDS)]] + [[f'missions/X_REG/{m}/mission{m}.yaml', mission_doc(m)] for m, _, _ in _FAM_IDS]
_OPTS = """k => [...document.querySelectorAll('[data-module="missions"] select[data-k=' + k + '] option')].filter(o => o.value).map(o => [o.value, o.textContent.trim()])"""


@case('N47', 'Missions and Registry: a family is chosen as « lettre · sigle · nom » (« T · AIRLIFT · Transport aérien / logistique »), the families '
      'sorted by letter (the letter of the themes, else the letter of the identifiers); once a family with two subtypes or more is chosen, '
      'a second list « Sous-type » filters them; none for a family of one subtype', 'N', tags=('missions',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0292 (user, 13 Nov: « ajouter au pop down de sélection la lettre (mission / registre) … pas de sous famille ? ») — the '
      'lists said « SIGLE · nom » sorted by code, and offered no subtype')
def n47(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_REG_CLEAR)
        c.js(_TEXTS_JS, _FAM_TEXTS)
        c.open('missions', wait=False, app='company')
        c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id=\"T-901A\"]')", timeout=15000, what='the list of missions')
        o = c.js(_OPTS, 'family')
        c.eq([x[1].split(' · ')[:2] for x in o], [['S', 'SAR'], ['T', 'AIRLIFT'], ['X', 'TESTFAM']], 'letter · short, sorted by letter', what='Missions')
        c.eq(o[1][1], 'T · AIRLIFT · Transport aérien / logistique', 'the user\'s example, with the middle dot', what='AIRLIFT')
        c.ok(not c.count(f'{M} select[data-k=subtype]'), 'a subtype list', 'no subtype list while no family is chosen')
        c.page.select_option(f'{M} select[data-k=family]', 'AIRLIFT')
        c.until(f"!!document.querySelector('{M} select[data-k=subtype]')", what='the subtype list')
        c.eq([x[0] for x in c.js(_OPTS, 'subtype')], ['STRATEGIC', 'TACTICAL'], 'the subtypes of the family', what='subtypes')
        c.page.select_option(f'{M} select[data-k=subtype]', 'TACTICAL')
        c.until(f"!document.querySelector('{M} [data-list] [data-id=\"T-901A\"]')", what='the filter applied')
        c.ok(c.count(f'{M} [data-list] [data-id="T-902A"]') == 1, 'T-902A missing', 'the subtype keeps T-902A only')
        c.shot(f'N47_{w}_missions.png')
        c.page.select_option(f'{M} select[data-k=family]', 'SAR')
        c.until(f"!document.querySelector('{M} select[data-k=subtype]')", what='no subtype list for one subtype')
        # the Registry: the same list, the same second list
        c.page.select_option(f'{M} select[data-k=family]', '')
        c.tap(f'{M} [data-do="regopen"]')
        c.until(_REG_READ, timeout=20000, what='the registry read')
        c.eq([x[1] for x in c.js(_OPTS, 'rfam')], [x[1] for x in o], 'the Registry offers the same families, in the same order', what='Registry')
        c.page.select_option(f'{R} select[data-k=rfam]', 'AIRLIFT')
        c.until(f"!!document.querySelector('{R} select[data-k=rsub]')", what='the subtype list of the Registry')
        c.page.select_option(f'{R} select[data-k=rsub]', 'STRATEGIC')
        c.until(f"!document.querySelector('{R} [data-rowid=\"T-902A\"]')", what='the filter applied')
        c.eq([e for e in c.js(f"[...document.querySelectorAll('{R} [data-reglist] [data-rowid]')].map(e => e.dataset.rowid)")], ['T-901A'],
             'the Registry keeps T-901A only', what='rows')
        c.shot(f'N47_{w}_registry.png')
        c.js(_REG_CLEAR)



# SOG-0288: three invented missions — a word only in a risk (X-501A), a town only in the description (X-502A), a mission whose file is not on
# the device (X-503A, searched on its registry line)
_SRCH_REG = """missions:
  - { id: X-501A, family: TESTREG, title: Première mission, origin: Base Test (XTST), folder: X_REG/X-501A, files: [missionX-501A.yaml] }
  - { id: X-502A, family: TESTREG, title: Deuxième mission, folder: X_REG/X-502A, files: [missionX-502A.yaml] }
  - { id: X-503A, family: TESTREG, title: Troisième mission, origin: Base Nord (XNRD), folder: X_REG/X-503A, files: [missionX-503A.yaml] }
"""
_SRCH_501 = """mission: { id: X-501A, type: SAR }
title: Première mission
summary: Un résumé inventé sans le mot cherché.
risks:
  - { hazard: Averse orageuse inventée, mitigation: Attendre }
"""
_SRCH_502 = """mission: { id: X-502A, type: SAR }
title: Deuxième mission
detailed_description: |-
  Une description inventée qui passe par Clermont-Ferrand, ville citée ici seulement.
"""
_SRCH_TEXTS = [['missions/mission_registry.yaml', _SRCH_REG], ['missions/X_REG/X-501A/missionX-501A.yaml', _SRCH_501],
               ['missions/X_REG/X-502A/missionX-502A.yaml', _SRCH_502]]
_SRCH_LIST = f"""(() => [...document.querySelectorAll('{M} [data-list] [data-id]')].map(e => [e.dataset.id, e.querySelector('[data-where]')?.dataset.where || '',
  (e.querySelector('[data-where]')?.textContent || '').trim()]))()"""


def _type(c, sel, text):
    c.page.fill(sel, '')
    c.page.type(sel, text)


@case('N48', 'Missions › search reads the content: a word only in a risk (« averse ») and a town only in the description (« clermont-ferrand », '
      'any case, accent or hyphen) find their mission, the line says where (« dans : risques »); a mission not on the device is searched on '
      'its registry line and the list says « 1 mission non lue »; the index is in memory, built from the copies on the device — no request; '
      'the Registry search is the same function', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0288 (user, 13 Nov: « recherche : doit pouvoir se faire dans le contenu aussi … « averse » ou « clermont-ferrand » donne T-085 ») '
      '— the search only read the registry line; the ergonomist: no written index, an index in memory, zero outgoing call more')
def n48(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, _SRCH_TEXTS)
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id=\"X-501A\"]')", timeout=15000, what='the list of missions')
    reqs = []
    # the app's own files (the help the frame loads lazily, module files) are not calls of the search: any other request is
    c.page.on('request', lambda r: reqs.append(r.url) if not re.search(r'^https?://[^/]+/(frame|modules|apps)/', r.url) else None)
    q = f'{M} input[data-k=q]'
    _type(c, q, 'averse')
    c.until(f"!!document.querySelector('{M} [data-list] [data-where]')", timeout=10000, what='a line found in the content')
    c.eq([[i, w, norm(t)] for i, w, t in c.js(_SRCH_LIST)], [['X-501A', 'risks', norm(row(c, 'foundIn').replace('{w}', row(c, 'inRisks')))]],
         'a word only in a risk finds its mission, and the line says where', what='averse')
    c.ok(c.js(f"document.querySelector('{M} [data-unread]')?.dataset.unread") == '1', c.text(f'{M} [data-results]'),
         'the list says one mission is not read on this device')
    for text in ('clermont-ferrand', 'CLERMONT FERRAND', 'Clermont Ferrand'):
        _type(c, q, text)
        c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-502A\"]')", timeout=10000, what=text)
        c.eq([x[:2] for x in c.js(_SRCH_LIST)], [['X-502A', 'description']], f'« {text} »: the town of the description, any case, hyphen or space',
             what=text)
    _type(c, q, 'xnrd')
    c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-503A\"]')", timeout=10000, what='the unread mission')
    c.eq([x[:2] for x in c.js(_SRCH_LIST)], [['X-503A', 'line']], 'a mission not on the device is found on its registry line', what='xnrd')
    c.shot('N48_390_list.png')
    c.eq(reqs, [], 'the index is built from the copies on the device: no outgoing request while searching', what='requests')
    # the Registry: the same search
    _type(c, q, '')
    c.tap(f'{M} [data-do="regopen"]')
    c.until(_REG_READ, timeout=20000, what='the registry read')
    _type(c, f'{R} input[data-k=rq]', 'averse')
    c.until(f"!!document.querySelector('{R} [data-reglist] [data-where]')", timeout=10000, what='the Registry finds the content')
    c.eq(c.js(f"[...document.querySelectorAll('{R} [data-reglist] [data-rowid]')].map(e => [e.dataset.rowid, e.querySelector('[data-where]')?.dataset.where || ''])"),
         [['X-501A', 'risks']], 'the Registry: the same function, the same « dans : risques »', what='Registry')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.shot('N48_1280_registry.png')
    c.js(_REG_CLEAR)



# SOG-0288, the measure: a hundred invented missions of about 3 ko each (a risk list, a description), all on the device
_HUNDRED = [f'X-{i:03d}A' for i in range(601, 701)]


def _hundred_doc(mid):
    return (f"mission: {{ id: {mid}, type: SAR }}\ntitle: Mission {mid}\nsummary: {'Un résumé inventé assez long. ' * 8}\n"
            f"detailed_description: |-\n  {'Une description inventée qui remplit le fichier. ' * 30}\n"
            "risks:\n" + ''.join(f"  - {{ hazard: Danger inventé {k}, mitigation: Parade inventée {k} }}\n" for k in range(10)))


@case('N49', 'Missions › search over a hundred missions on the device: the index (in memory) is ready within 3 s of the first keystroke, '
      'and a keystroke redraws the list in less than 100 ms', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0288, the ergonomist\'s measure: « frappe sans latence perçue sur cent missions » (the user\'s registry: 104 missions of 5 ko)')
def n49(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', 'schema: mission-registry\nversion: 1\nmissions:\n' + ''.join(
        f'  - {{ id: {m}, family: TESTREG, title: Ligne {m}, folder: X_REG/{m}, files: [mission{m}.yaml] }}\n' for m in _HUNDRED)]] +
        [[f'missions/X_REG/{m}/mission{m}.yaml', _hundred_doc(m)] for m in _HUNDRED])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list] [data-id=\"X-700A\"]')", timeout=15000, what='the list of a hundred missions')
    t = c.js(f"""async () => {{ const i = document.querySelector('{M} input[data-k=q]'), t0 = performance.now();
      i.value = 'parade inventee 9'; i.dispatchEvent(new Event('input', {{ bubbles: true }}));
      const key = performance.now() - t0;
      while (!document.querySelector('{M} [data-count][data-indexed]') && performance.now() - t0 < 10000) await new Promise(r => setTimeout(r, 20));
      const ready = performance.now() - t0, t1 = performance.now();
      i.value = 'parade inventee 7'; i.dispatchEvent(new Event('input', {{ bubbles: true }}));
      return {{ key: Math.round(key), ready: Math.round(ready), next: Math.round(performance.now() - t1),
        hits: +((document.querySelector('{M} [data-count]')?.textContent || '').match(/\d+/) || [0])[0] }} }}""")
    c.ok(t['ready'] < 3000, t, 'the index of a hundred missions is ready within 3 s of the first keystroke')
    c.ok(t['key'] < 100 and t['next'] < 100, t, 'a keystroke redraws the list in less than 100 ms (before and after the index)')
    c.eq(t['hits'], 100, 'every mission has the risk: a hundred found (the count)', what='hits')
    c.js(_REG_CLEAR)



# SOG-0287, step 1: the bench's complete mission (X-301A, invented) filed as X-001A of an invented family REG (its letter: X, read from
# its identifiers), in X_REG/ — the folder the noreg clears before and after
_ED_FULL = _SHEET_FULL.replace('X-301A', 'X-001A').replace('type: SAR,', 'type: REG,')  # the family of the file is the registry's
_ED_TEXTS = [['missions/mission_registry.yaml', 'schema: mission-registry\nversion: 1\nmissions:\n'
              '  - { id: X-001A, family: REG, series: 1, title: Mission complète, folder: X_REG/X-001A, files: [missionX-001A.yaml] }\n'],
             ['missions/X_REG/X-001A/missionX-001A.yaml', _ED_FULL]]
E = f'{M} [data-pane=editor]'


def _ed_fill(c, k, v):
    c.page.fill(f'{E} input[data-k={k}]', v)


@case('N50', 'Missions › Registre › the editor, step 1 (Cadre): « Créer une mission » at the head, « Modifier » and « Dupliquer » on the unfolded '
      'line; six steps, the Cadre open; « Enregistrer » writes the mission file and its registry line on the device (pending, sent with the '
      'grouped send) and says so; the identifier\'s form blocks; Modifier keeps every other field of the file; Dupliquer proposes the next '
      'identifier and keeps the content', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0287 (mock-up validated by the user on 13 Nov: « la maquette me va. »): modules/missions/maquette/editeur_cadre_*.png is the '
      'contract; the ergonomist\'s answers: Enregistrer on the device then the grouped send, subtype from the family\'s list, personal by '
      'default, Dupliquer on the unfolded line')
def n50(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _ED_TEXTS)
    c.ok(c.count(f'{R} [data-do=edcreate]') == 1, 'no « Créer une mission »', '« Créer une mission » at the head of the Registry')
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.ok(c.count(f'{R} [data-rowid="X-001A"] [data-do=edmodify]') == 1 and c.count(f'{R} [data-rowid="X-001A"] [data-do=eddup]') == 1,
         'no Modifier / Dupliquer', '« Modifier » and « Dupliquer » on the unfolded line')
    # create
    c.tap(f'{R} [data-do="edcreate"]')
    c.until(f"!!document.querySelector('{E}')", what='the editor')
    steps = c.js(f"[...document.querySelectorAll('{E} [data-steps] button')].map(b => [b.dataset.step, b.disabled])")
    c.eq([x[0] for x in steps], ['cadre', 'teams', 'places', 'story', 'risks', 'timeline'], 'the six steps of the mock-up', what='steps')
    c.ok(steps[0][1] is False and steps[-1][1] is True, steps, 'the Cadre open; a step not delivered yet is disabled (one push each)')
    c.page.select_option(f'{E} select[data-k=edfam]', 'REG')
    c.until(f"document.querySelector('{E} input[data-k=edid]')?.value === 'X-002'", what='the next identifier of the family proposed')
    _ed_fill(c, 'edid', 'X-1')
    c.tap(f'{E} [data-do="edsave"]')
    c.wait(300)
    c.ok(c.js(_TEXT_OF, 'missions/X_REG/X-1/missionX-1.yaml') is None and 'X-1' not in (reg_text(c) or ''), 'written',
         'an identifier without its form blocks: nothing written')
    c.ok(any(norm(row(c, 'edBlock_idForm')) in norm(n) for n in c.note_log()), c.note_log(), 'and the floating notification says why')
    _ed_fill(c, 'edid', 'X-002')
    _ed_fill(c, 'edtitle', 'Mission créée')
    c.page.select_option(f'{E} select[data-k=edth]', 'Corse')
    _ed_fill(c, 'eddep', 'XTST · Base Test')
    _ed_fill(c, 'edarr', 'Base Test Sud (XTSU)')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='« modifiée sur cet appareil — pas encore envoyée »')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-002/missionX-002.yaml') or ''
    c.ok(all(x in t for x in ('id: X-002', 'type: REG', 'theatre: Corse', 'title: Mission créée', 'name: Base Test (XTST)', 'icao: XTSU',
                               'schema: helo-xp-mission')), t, 'the file of the new mission, in the V2 form')
    c.ok('airline' not in t, t, 'no airline: a personal mission by default (N17)')
    reg_wait_text(c, lambda x: 'X-002' in x)
    c.ok('id: X-002' in reg_text(c) and 'X_REG/X-002' in reg_text(c), reg_text(c), 'its registry line, on the device')
    # the noreg's transport is local: data.put writes the cache at once (on a device with a repository, the same put waits for the grouped send)
    # modify X-001A: every other field kept
    c.tap(f'{E} [data-do="edcancel"]')
    c.until(_REG_READ, timeout=20000, what='back to the registry')
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"document.querySelector('{E} input[data-k=edtitle]')?.value === 'Mission complète'", timeout=10000, what='X-001A in the editor')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")  # the captures without the toasts of the steps before
    bar = c.js(f"""(() => {{ const b = document.querySelector('{E} [data-do=edsave]').getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('[data-do=edsave]') ? b.bottom <= innerHeight : false }})()""")
    c.ok(bar, 'covered or off screen', 'at 390, « Enregistrer · Suivante · Annuler » stays on screen above the tab bar')
    c.shot('N50_390_cadre.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N50_1280_cadre.png')
    c.ok(c.js(f"getComputedStyle(document.querySelector('{E} [data-edaside]')).display") != 'none', 'hidden', 'wide: the preview and « À compléter » on the right')
    _ed_fill(c, 'edtitle', 'Mission retouchée')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    c.ok('title: Mission retouchée' in t and all(x in t for x in ('Danger cinq', 'Second paragraphe inventé', 'ZONE-2', 'CHARLIE3', 'lat: 45')), t[:400],
         'Modifier changes the frame and keeps the rest of the file')
    reg_wait_text(c, lambda x: 'Mission retouchée' in x)
    # duplicate X-001A: the next identifier, the content kept, the original untouched
    c.tap(f'{E} [data-do="edcancel"]')
    c.until(_REG_READ, timeout=20000, what='back to the registry')
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="eddup"]')
    c.until(f"document.querySelector('{E} input[data-k=edid]')?.value === 'X-003'", timeout=10000, what='the duplicate proposes X-003')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    d = c.js(_TEXT_OF, 'missions/X_REG/X-003/missionX-003.yaml') or ''
    c.ok('id: X-003' in d and 'Danger cinq' in d, d[:300], 'the copy: a new identifier, the content kept')
    c.ok('id: X-001A' in (c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''), 'changed', 'the original is untouched')
    c.js(_REG_CLEAR)



_TEAMS_JS = f"""[...document.querySelectorAll('{E} [data-edteams] [data-team]')].map(r => ['name', 'type', 'service', 'role'].map(f => r.querySelector('[data-f=' + f + ']').value))"""


@case('N51', 'Missions › editor, step 2 (Équipes): « Suivante » goes from the Cadre to the Équipes; one row per team (callsign, type, service, '
      'role); a row is changed, removed, added; « Enregistrer » writes the teams and keeps their other keys and the rest of the file',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0287 step 2, the mock-up: « Équipes : une ligne par équipe (indicatif, service, type ICAO, rôle) ; + Équipe »')
def n51(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, [[_ED_TEXTS[0][0], _ED_TEXTS[0][1]], ['missions/X_REG/X-001A/missionX-001A.yaml', _ED_FULL.replace(
        '{ name: ALPHA1, service: Service d\'essai, type: H135, role: recherche }',
        '{ name: ALPHA1, service: Service d\'essai, type: H135, role: recherche, base: Base Test }')]])
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-do="ednext"]')
    c.until(f"!!document.querySelector('{E} [data-edteams]')", what='« Suivante » opens the Équipes')
    c.eq(c.js(_TEAMS_JS), [['ALPHA1', 'H135', "Service d'essai", 'recherche'], ['BRAVO2', 'H145', "Service d'essai", 'relais'],
                           ['CHARLIE3', 'EC25', "Service d'essai", 'hélitreuillage']], 'one row per team of the file', what='rows')
    c.page.fill(f'{E} [data-team="1"] [data-f=role]', 'relais radio')
    c.tap(f'{E} [data-team="2"] [data-do="edteamdel"]')
    c.tap(f'{E} [data-do="edteamadd"]')
    c.page.fill(f'{E} [data-team="2"] [data-f=name]', 'DELTA4')
    c.page.fill(f'{E} [data-team="2"] [data-f=type]', 'h160')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N51_390_teams.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N51_1280_teams.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    c.ok('relais radio' in t and 'CHARLIE3' not in t and 'name: DELTA4' in t and 'type: H160' in t, t[t.find('teams:'):][:400],
         'the teams written: one changed, one removed, one added (type in capitals)')
    c.ok('base: Base Test' in t and 'Danger cinq' in t and 'ZONE-2' in t, t[:300], 'a team keeps its other keys; the rest of the file is kept')
    c.js(_REG_CLEAR)



_PLACES_JS = f"""[...document.querySelectorAll('{E} [data-edplaces] [data-place]')].map(r => [r.dataset.kind, r.querySelector('.ms-plbody b').textContent.trim()])"""


@case('N52', 'Missions › editor, step 3 (Lieux): one row per place (departure, arrival, target, zones, turning points, rendezvous) with its '
      'position in degrees and minutes; « Modifier » opens its fields; a point moved, a turning point added, a rendezvous removed; '
      '« Enregistrer » writes them, a polygon keeps its points, every place its other keys', 'N', tags=('missions',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0287 step 3, the mock-up editeur_lieux_*.png: « Cible, zones, points tournants et rendez-vous. Une ligne par lieu »')
def n52(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _ED_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", what='the Lieux')
    c.eq(c.js(_PLACES_JS), [['dep', 'XTST · Base Test'], ['arr', 'XTSU · Base Test Sud'], ['target', "TARGET · Cible d'essai"],
                            ['zone', 'ZONE-1 · Secteur nord'], ['zone', 'ZONE-2 · Secteur sud'], ['pt', 'PT1 · Point un'], ['pt', 'PT2 · Point deux'],
                            ['rdv', "RDV-1 · Rendez-vous d'essai"]], 'one row per place, in the order of the file', what='rows')
    pt1 = c.js(f"document.querySelector('{E} [data-place=\"5\"] .ms-plbody .f-muted').textContent")
    c.ok('44°48′N 1°12′E' in pt1, pt1, 'the position in degrees and minutes, as the mock-up')
    c.tap(f'{E} [data-place="5"] [data-do="edplace"]')
    c.page.fill(f'{E} [data-plform="5"] [data-f=lat]', '44,9')
    c.tap(f'{E} [data-plform="5"] [data-do="edplaceok"]')
    c.ok('44°54′N' in c.js(f"document.querySelector('{E} [data-place=\"5\"] .ms-plbody .f-muted').textContent"), 'not shown',
         'the decimal comma is read on the row too')
    c.tap(f'{E} [data-do="edplaceadd"][data-kind="pt"]')
    c.until(f"!!document.querySelector('{E} [data-plform] [data-f=name]')", what='the new turning point open')
    c.page.fill(f'{E} [data-plform] [data-f=name]', 'Point trois')
    c.page.fill(f'{E} [data-plform] [data-f=lat]', '44.3')
    c.page.fill(f'{E} [data-plform] [data-f=lon]', '1.7')
    c.tap(f'{E} [data-plform] [data-do="edplaceok"]')
    c.tap(f'{E} [data-place="8"] [data-do="edplace"]')
    c.tap(f'{E} [data-plform="8"] [data-do="edplacedel"]')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N52_390_places.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N52_1280_places.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    c.ok('lat: 44.9' in t and 'name: Point trois' in t and 'id: PT3' in t and 'RDV-1' not in t and 'rendezvous' not in t, t[t.find('turning_points'):][:500],
         'a point moved, one added (PT3), the rendezvous removed')
    c.ok('lat: 44.1' in t and 'radius_km: 12' in t and 'time_on_task_min: 30' in t and 'Danger cinq' in t, t[t.find('zones'):][:500],
         'the polygon keeps its points, the circle its radius and time; the rest of the file is kept')
    c.js(_REG_CLEAR)



_STORY_JS = f"""Object.fromEntries([...document.querySelectorAll('{E} [data-k=edstory]')].map(x => [x.dataset.f, x.value]))"""


@case('N53', 'Missions › editor, step 4 (Récit): the summary (with its count of signs, 600 advised), the description in paragraphs, the main '
      'objective, the secondary ones one per line, the load (description, mass, passengers); « Enregistrer » writes them and keeps the '
      'other keys of objectives and payload, and the rest of the file', 'N', tags=('missions',), designs=('standard',), screens=False,
      langs4=False, rule='SOG-0287 step 4, the mock-up: « Récit (5) : Résumé (600 signes), Description, Objectif principal, Objectifs '
      'secondaires, Charge »')
def n53(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, [[_ED_TEXTS[0][0], _ED_TEXTS[0][1]], ['missions/X_REG/X-001A/missionX-001A.yaml', _ED_FULL.replace(
        'payload: { description: Un treuil inventé., mass_kg: 120, passengers: 2 }',
        'payload: { description: Un treuil inventé., mass_kg: 120, passengers: 2, constraints: [Une contrainte inventée.] }')]])
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="story"]')
    c.until(f"!!document.querySelector('{E} [data-k=edstory]')", what='the Récit')
    st = c.js(_STORY_JS)
    c.eq([st['description'], st['primary'], st['secondary'], st['payload'], st['mass'], st['pax']],
         ['Premier paragraphe inventé.\n\nSecond paragraphe inventé.', 'Trouver la cible inventée.', 'Rester en contact.\nRentrer avant la nuit.',
          'Un treuil inventé.', '120', '2'], 'the story of the file in its fields', what='fields')
    c.ok(st['summary'].startswith('Une recherche inventée'), st['summary'][:60], 'the summary')
    c.page.fill(f'{E} [data-k=edstory][data-f=summary]', 'Un résumé retouché, court.')
    c.ok(c.text(f'{E} [data-stcount]').startswith('26'), c.text(f'{E} [data-stcount]'), 'the count of signs follows the typing')
    c.page.fill(f'{E} [data-k=edstory][data-f=secondary]', 'Rester en contact.\nRentrer avant la nuit.\nPrévenir la base.')
    c.page.fill(f'{E} [data-k=edstory][data-f=pax]', '3')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N53_390_story.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N53_1280_story.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    c.ok('summary: Un résumé retouché, court.' in t and 'Prévenir la base.' in t and 'passengers: 3' in t and 'mass_kg: 120' in t, t[:600],
         'the summary, a third objective, three passengers written; the mass kept')
    c.ok('Une contrainte inventée.' in t and 'Second paragraphe inventé.' in t and 'Danger cinq' in t, t[:300],
         'the other keys of the load, the paragraphs and the rest of the file kept')
    c.js(_REG_CLEAR)



# audit 182: an invented file the editor must never alter by itself — 45 teams (beyond the 40 shown), teams without name nor role, a team
# written as a plain text, texts longer than the editor's bounds, a point without position, objectives as a list, numbers as texts
_MESSY = ('mission: { id: X-001A, type: REG, subtype: ESSAI }\n'
          f"title: {'Un titre inventé très long ' * 12}\n"
          'summary: "Un résumé inventé  avec des espaces doublés.  "\n'
          'origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0, elevation_ft: 300 }\n'
          'destination: { name: Base Test Sud }\n'
          'teams:\n' + ''.join(
              '  - { aircraft: AC' + str(i) + ' }\n' if i % 5 == 0 else '  - Une équipe en texte\n' if i % 7 == 0 else
              f"  - {{ name: EQ{i}, role: {'un rôle inventé très long ' * 12}, extra: {i} }}\n" for i in range(45)) +
          'turning_points:\n  - { id: PT1, name: Point sans position, lat: null, lon: null, time_on_task_min: 5 }\n'
          'objectives: [Premier objectif inventé., Second objectif inventé.]\n'
          'payload: { mass_kg: "120", constraints: [Une contrainte inventée.] }\n')
_ALIAS = 'mission: { id: X-001A, type: REG }\ntitle: Alias\nbase: &b { name: Base Test (XTST), lat: 45.0, lon: 1.0 }\norigin: *b\ndestination: *b\n'


def _ed_open(c, text):
    reg_open(c, [[_ED_TEXTS[0][0], _ED_TEXTS[0][1]], ['missions/X_REG/X-001A/missionX-001A.yaml', text]])
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')


@case('N54', 'Missions › editor, audit 182: opening every delivered step and « Enregistrer » without touching anything leaves the file '
      'identical (45 teams, teams without name, texts beyond the bounds, a point without position); one change touches only its field; '
      'a file with YAML aliases is refused at opening and never rewritten', 'N', tags=('missions', 'security'), designs=('standard',),
      screens=False, langs4=False,
      rule='Sécurisation, audit 182 on 3ace1a58f…6dc8740f5: the Équipes step lost data at saving without any edit (teams beyond 40, entries '
      'without name or role, texts cut), and a mission file with YAML aliases froze the save — « enregistrer sans rien toucher rend le '
      'fichier identique », for every step')
def n54(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    _ed_open(c, _MESSY)
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", timeout=10000, what='the messy file in the editor')
    for step in ('teams', 'places', 'story', 'cadre'):
        c.tap(f'{E} [data-steps] [data-step="{step}"]')
        c.until(f"document.querySelector('{E}')?.dataset.step === '{step}'", what=step)
    c.tap(f'{E} [data-do="edsave"]')
    c.wait(500)
    c.eq(c.js(_TEXT_OF, path), _MESSY, 'every step opened, nothing touched: the file is identical, byte for byte', what='file')
    c.ok(any(norm(row(c, 'edSame')) in norm(n) for n in c.note_log()), c.note_log(), 'and the editor says there is nothing to save')
    # one change: only its field (the toast of the step before cleared: at 390 it covers the bar)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.tap(f'{E} [data-steps] [data-step="teams"]')
    c.page.fill(f'{E} [data-team="1"] [data-f=role]', 'relais')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, path) or ''
    # 45 teams: 9 « aircraft » only (i % 5), 5 plain texts (i % 7), 31 named with a role of 324 signs (the plain scalar loses its last space)
    long_role = ('un rôle inventé très long ' * 12).strip()
    c.ok('role: relais' in t and t.count('extra:') == 31 and 'aircraft: AC40' in t and t.count('Une équipe en texte') == 5
         and t.count(long_role) == 30, [t.count('extra:'), 'aircraft: AC40' in t, t.count('Une équipe en texte'), t.count(long_role), 'role: relais' in t],
         'one role changed: the 44 other teams (those beyond 40 too) kept whole, texts uncut')
    c.ok(('Un titre inventé très long ' * 12).strip() in t and 'elevation_ft: 300' in t and 'Premier objectif inventé.' in t and "mass_kg: '120'" in t,
         t[:400], 'the frame, the places and the story untouched')
    # YAML aliases: refused at opening
    c.tap(f'{E} [data-do="edcancel"]')
    _ed_open(c, _ALIAS)
    c.wait(800)
    c.ok(not c.count(E) and any(norm(row(c, 'edAlias')) in norm(n) for n in c.note_log()), c.note_log(),
         'a file with aliases does not open in the editor, and the notification says why')
    c.eq(c.js(_TEXT_OF, path), _ALIAS, 'never rewritten', what='file')
    c.js(_REG_CLEAR)
